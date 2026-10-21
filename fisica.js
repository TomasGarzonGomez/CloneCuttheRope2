const CONFIG_FISICA = {
  GRAVEDAD_X: 0,
  GRAVEDAD_Y: 1,
  ESCALA_GRAVEDAD: 0.001,
  PASO_MS: 1000 / 60,
  MAX_PASOS_POR_FRAME: 4,
  ITERACIONES_POSICION: 8,
  ITERACIONES_VELOCIDAD: 6,
  ITERACIONES_RESTRICCION: 12,
  LIMITE_INFERIOR: 1000,

  MASA_BIBERON: 3,
  ANCHO_BIBERON: 28,
  ALTO_BIBERON: 58,
  CHAFLAN_BIBERON: 8,
  FRICCION_AIRE_BIBERON: 0.004,
  FRICCION_BIBERON: 0.1,
  REBOTE_BIBERON: 0.3,
  UNION_BIBERON: null,

  NODOS_POR_DEFECTO: 14,
  MASA_NODO: 0.1,
  RADIO_NODO: 3,
  FRICCION_AIRE_NODO: 0.03,
  RIGIDEZ: 1,
  AMORTIGUACION: 0.05,
  SOLO_TENSION: true,
  UMBRAL_HOLGURA: 0.98,
  NODOS_COLISIONAN: false,

  LONGITUD_MINIMA_TRAZO: 0.5,
};

const Fisica = (function () {
  'use strict';

  const { Engine, Composite, Bodies, Body, Constraint, Events, Vector } = Matter;
  const C = CONFIG_FISICA;

  let motor = null;
  let cuerpoPrincipal = null;
  let cuerdas = [];
  let cuerposEstaticos = [];
  let grupoCuerda = 0;
  let acumulador = 0;
  let siguienteId = 1;
  let fuerzasFrame = [];
  const oyentes = { corte: [], perdido: [] };

  function crearMundo() {
    if (motor) {
      Events.off(motor);
      Composite.clear(motor.world, false, true);
      Engine.clear(motor);
    }
    motor = Engine.create({
      positionIterations: C.ITERACIONES_POSICION,
      velocityIterations: C.ITERACIONES_VELOCIDAD,
      constraintIterations: C.ITERACIONES_RESTRICCION,
      gravity: { x: C.GRAVEDAD_X, y: C.GRAVEDAD_Y, scale: C.ESCALA_GRAVEDAD },
    });
    grupoCuerda = Body.nextGroup(true);
    cuerdas = [];
    cuerposEstaticos = [];
    cuerpoPrincipal = null;
    acumulador = 0;
    Events.on(motor, 'beforeUpdate', antesDelPaso);
    Events.on(motor, 'afterUpdate', retirarFueraDeLimites);
    return motor;
  }

  function limpiarMundo() {
    exigirMundo();
    Composite.clear(motor.world, false, true);
    cuerdas = [];
    cuerposEstaticos = [];
    cuerpoPrincipal = null;
    acumulador = 0;
    fuerzasFrame = [];
  }

  function actualizarFisica(deltaMs) {
    exigirMundo();
    acumulador += Math.min(deltaMs, 250);
    let pasos = 0;
    while (acumulador >= C.PASO_MS && pasos < C.MAX_PASOS_POR_FRAME) {
      Engine.update(motor, C.PASO_MS);
      acumulador -= C.PASO_MS;
      pasos++;
    }
    if (pasos === C.MAX_PASOS_POR_FRAME) acumulador = 0;
    fuerzasFrame = [];
  }

  function antesDelPaso() {
    for (const f of fuerzasFrame) {
      const punto = Vector.add(f.cuerpo.position, f.desplazamiento);
      Body.applyForce(f.cuerpo, punto, f.fuerza);
    }
    ajustarTensionCuerdas();
  }

  function retirarFueraDeLimites() {
    const limite = C.LIMITE_INFERIOR;
    if (limite == null) return;
    if (cuerpoPrincipal && cuerpoPrincipal.position.y > limite) {
      emitir('perdido', soltarCuerpoPrincipal());
    }
    for (const cuerda of cuerdas) {
      if (!cuerda.nodos.some((n) => n.position.y > limite)) continue;
      const fuera = cuerda.nodos.filter((n) => n.position.y > limite);
      for (const nodo of fuera) {
        for (const r of cuerda.uniones) {
          if (!r.datosCuerda.cortada && (r.bodyA === nodo || r.bodyB === nodo)) {
            desactivarUnion(cuerda, r);
          }
        }
        Composite.remove(cuerda.compuesto, nodo);
      }
      cuerda.nodos = cuerda.nodos.filter((n) => !fuera.includes(n));
    }
  }

  function establecerLimiteInferior(y) {
    C.LIMITE_INFERIOR = y;
  }

  function establecerGravedad(x, y) {
    exigirMundo();
    motor.gravity.x = x;
    motor.gravity.y = y;
  }

  function crearCuerpoPrincipal(x, y, opciones = {}) {
    exigirMundo();
    if (cuerpoPrincipal) {
      cuerdas.filter((c) => c.cuerpo === cuerpoPrincipal).forEach(eliminarCuerda);
      Composite.remove(motor.world, cuerpoPrincipal);
    }
    const ancho = opciones.ancho ?? C.ANCHO_BIBERON;
    const alto = opciones.alto ?? C.ALTO_BIBERON;
    const cuerpo = Bodies.rectangle(x, y, ancho, alto, {
      label: 'biberon',
      chamfer: { radius: Math.min(C.CHAFLAN_BIBERON, ancho / 2 - 1) },
      frictionAir: C.FRICCION_AIRE_BIBERON,
      friction: C.FRICCION_BIBERON,
      restitution: C.REBOTE_BIBERON,
      collisionFilter: { group: grupoCuerda },
    });
    cuerpo.dimensiones = { ancho, alto };
    Body.setMass(cuerpo, opciones.masa ?? C.MASA_BIBERON);
    Composite.add(motor.world, cuerpo);
    cuerpoPrincipal = cuerpo;
    return cuerpo;
  }

  function obtenerCuerpoPrincipal() {
    return cuerpoPrincipal;
  }

  function obtenerUnionBiberon(cuerpo = cuerpoPrincipal) {
    if (C.UNION_BIBERON) return { x: C.UNION_BIBERON.x, y: C.UNION_BIBERON.y };
    const alto = cuerpo && cuerpo.dimensiones ? cuerpo.dimensiones.alto : C.ALTO_BIBERON;
    return { x: 0, y: -alto / 2 };
  }

  function puntoLocalAMundo(cuerpo, local) {
    return Vector.add(cuerpo.position, Vector.rotate(local, cuerpo.angle));
  }

  function obtenerTetina(cuerpo = cuerpoPrincipal) {
    if (!cuerpo) return null;
    const alto = cuerpo.dimensiones ? cuerpo.dimensiones.alto : C.ALTO_BIBERON;
    return puntoLocalAMundo(cuerpo, { x: 0, y: alto / 2 });
  }

  function soltarCuerpoPrincipal() {
    exigirMundo();
    const cuerpo = cuerpoPrincipal;
    if (!cuerpo) return null;
    for (const cuerda of cuerdas) {
      if (cuerda.cuerpo !== cuerpo) continue;
      const ultima = cuerda.uniones[cuerda.uniones.length - 1];
      if (!ultima.datosCuerda.cortada) desactivarUnion(cuerda, ultima);
      cuerda.cuerpo = null;
    }
    Composite.remove(motor.world, cuerpo);
    cuerpoPrincipal = null;
    return {
      posicion: { x: cuerpo.position.x, y: cuerpo.position.y },
      angulo: cuerpo.angle,
      velocidad: Body.getVelocity(cuerpo),
    };
  }

  function aplicarFuerza(fuerza, cuerpo = cuerpoPrincipal, punto) {
    if (!cuerpo) return;
    fuerzasFrame.push({
      cuerpo,
      fuerza: { x: fuerza.x, y: fuerza.y },
      desplazamiento: punto ? Vector.sub(punto, cuerpo.position) : { x: 0, y: 0 },
    });
  }

  function aplicarImpulso(impulso, cuerpo = cuerpoPrincipal) {
    if (!cuerpo) return;
    const v = Body.getVelocity(cuerpo);
    Body.setVelocity(cuerpo, {
      x: v.x + impulso.x / cuerpo.mass,
      y: v.y + impulso.y / cuerpo.mass,
    });
  }

  function crearCuerda(anclaje, longitud, nodos = C.NODOS_POR_DEFECTO, opciones = {}) {
    exigirMundo();
    const cuerpo = opciones.cuerpo !== undefined ? opciones.cuerpo : cuerpoPrincipal;
    const rigidez = opciones.rigidez ?? C.RIGIDEZ;
    const amortiguacion = opciones.amortiguacion ?? C.AMORTIGUACION;
    const masaNodo = opciones.masaNodo ?? C.MASA_NODO;
    const n = Math.max(1, Math.floor(nodos));
    const segmentos = cuerpo ? n + 1 : n;
    const largoSegmento = longitud / segmentos;

    let unionRotada = null;
    let fin;
    if (cuerpo) {
      const local = opciones.puntoUnion || obtenerUnionBiberon(cuerpo);
      unionRotada = Vector.rotate(local, cuerpo.angle);
      fin = Vector.add(cuerpo.position, unionRotada);
    } else {
      fin = { x: anclaje.x, y: anclaje.y + longitud };
    }

    const id = siguienteId++;
    const compuesto = Composite.create({ label: 'cuerda-' + id });

    const cuerposNodo = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / segmentos;
      const nodo = Bodies.circle(
        anclaje.x + (fin.x - anclaje.x) * t,
        anclaje.y + (fin.y - anclaje.y) * t,
        C.RADIO_NODO,
        {
          label: 'nodoCuerda',
          frictionAir: C.FRICCION_AIRE_NODO,
          collisionFilter: {
            group: grupoCuerda,
            mask: C.NODOS_COLISIONAN ? 0xffffffff : 0,
          },
        }
      );
      Body.setMass(nodo, masaNodo);
      cuerposNodo.push(nodo);
    }

    const uniones = [];
    const nuevaUnion = (props) => {
      const r = Constraint.create(Object.assign({
        length: largoSegmento,
        stiffness: rigidez,
        damping: amortiguacion,
      }, props));
      r.datosCuerda = {
        cuerdaId: id,
        indice: uniones.length,
        rigidezBase: rigidez,
        amortiguacionBase: amortiguacion,
        cortada: false,
      };
      uniones.push(r);
    };

    nuevaUnion({ pointA: { x: anclaje.x, y: anclaje.y }, bodyB: cuerposNodo[0] });
    for (let i = 0; i < n - 1; i++) {
      nuevaUnion({ bodyA: cuerposNodo[i], bodyB: cuerposNodo[i + 1] });
    }
    if (cuerpo) {
      nuevaUnion({ bodyA: cuerposNodo[n - 1], bodyB: cuerpo, pointB: unionRotada });
    }

    Composite.add(compuesto, cuerposNodo);
    Composite.add(compuesto, uniones);
    Composite.add(motor.world, compuesto);

    const cuerda = {
      id,
      anclaje: { x: anclaje.x, y: anclaje.y },
      longitud,
      nodos: cuerposNodo,
      uniones,
      cuerpo,
      cortada: false,
      cortes: [],
      compuesto,
    };
    cuerdas.push(cuerda);
    return cuerda;
  }

  function eliminarCuerda(cuerda) {
    exigirMundo();
    Composite.remove(motor.world, cuerda.compuesto, true);
    cuerdas = cuerdas.filter((c) => c !== cuerda);
  }

  function obtenerCuerdas() {
    return cuerdas.slice();
  }

  function obtenerSegmentos(cuerda) {
    const lista = [];
    for (const r of cuerda.uniones) {
      if (r.datosCuerda.cortada) continue;
      const e = extremosRestriccion(r);
      lista.push({ a: e.a, b: e.b, indice: r.datosCuerda.indice });
    }
    return lista;
  }

  function cuerdaUnida(cuerda) {
    return !cuerda.cortada;
  }

  function cuerpoLibre() {
    return !cuerdas.some((c) => c.cuerpo === cuerpoPrincipal && !c.cortada);
  }

  function extremosRestriccion(r) {
    const a = r.bodyA ? Vector.add(r.bodyA.position, r.pointA) : { x: r.pointA.x, y: r.pointA.y };
    const b = r.bodyB ? Vector.add(r.bodyB.position, r.pointB) : { x: r.pointB.x, y: r.pointB.y };
    return { a, b };
  }

  function ajustarTensionCuerdas() {
    if (!C.SOLO_TENSION) return;
    for (const cuerda of cuerdas) {
      for (const r of cuerda.uniones) {
        const d = r.datosCuerda;
        if (d.cortada) continue;
        const e = extremosRestriccion(r);
        const largo = Vector.magnitude(Vector.sub(e.b, e.a));
        const floja = largo < r.length * C.UMBRAL_HOLGURA;
        r.stiffness = floja ? 0 : d.rigidezBase;
        r.damping = floja ? 0 : d.amortiguacionBase;
      }
    }
  }

  function intersectarSegmentos(p1, p2, p3, p4) {
    const rx = p2.x - p1.x, ry = p2.y - p1.y;
    const sx = p4.x - p3.x, sy = p4.y - p3.y;
    const denom = rx * sy - ry * sx;
    const escala = Math.hypot(rx, ry) * Math.hypot(sx, sy);
    if (escala === 0 || Math.abs(denom) <= 1e-9 * escala) return null;
    const qx = p3.x - p1.x, qy = p3.y - p1.y;
    const t = (qx * sy - qy * sx) / denom;
    const u = (qx * ry - qy * rx) / denom;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { x: p1.x + t * rx, y: p1.y + t * ry, t, u };
  }

  function cortarCuerda(linea) {
    exigirMundo();
    const { a, b } = normalizarLinea(linea);
    if (Vector.magnitude(Vector.sub(b, a)) < C.LONGITUD_MINIMA_TRAZO) return [];

    const realizados = [];
    for (const cuerda of cuerdas.slice()) {
      let mejor = null;
      for (const r of cuerda.uniones) {
        if (r.datosCuerda.cortada) continue;
        const e = extremosRestriccion(r);
        const hit = intersectarSegmentos(a, b, e.a, e.b);
        if (!hit || hit.t <= 0) continue;
        if (!mejor || hit.t < mejor.hit.t) mejor = { r, hit };
      }
      if (mejor) {
        realizados.push(romperUnion(cuerda, mejor.r, { x: mejor.hit.x, y: mejor.hit.y }));
      }
    }
    return realizados;
  }

  function cortarCuerdaEnIndice(cuerda, indice = cuerda.uniones.length - 1) {
    const r = cuerda.uniones[indice];
    if (!r || r.datosCuerda.cortada) return null;
    const e = extremosRestriccion(r);
    return romperUnion(cuerda, r, { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 });
  }

  function alCortar(fn) {
    return suscribir('corte', fn);
  }

  function alPerderCuerpo(fn) {
    return suscribir('perdido', fn);
  }

  function romperUnion(cuerda, restriccion, punto) {
    desactivarUnion(cuerda, restriccion);
    const info = { cuerda, indice: restriccion.datosCuerda.indice, punto };
    cuerda.cortes.push(info);
    emitir('corte', info);
    return info;
  }

  function desactivarUnion(cuerda, restriccion) {
    Composite.remove(cuerda.compuesto, restriccion);
    restriccion.datosCuerda.cortada = true;
    cuerda.cortada = true;
  }

  function suscribir(tipo, fn) {
    oyentes[tipo].push(fn);
    return () => {
      const i = oyentes[tipo].indexOf(fn);
      if (i >= 0) oyentes[tipo].splice(i, 1);
    };
  }

  function emitir(tipo, info) {
    oyentes[tipo].slice().forEach((fn) => fn(info));
  }

  function normalizarLinea(linea) {
    if (linea.a && linea.b) return { a: linea.a, b: linea.b };
    return { a: { x: linea.x1, y: linea.y1 }, b: { x: linea.x2, y: linea.y2 } };
  }

  function exigirMundo() {
    if (!motor) throw new Error('Fisica: inicializa primero el mundo con Fisica.crearMundo()');
  }

  function crearPlataforma(x, y, ancho, alto, opciones = {}) {
    exigirMundo();
    const angulo = opciones.angulo ?? 0;
    const cuerpo = Bodies.rectangle(x, y, ancho, alto, {
      isStatic: true,
      angle: angulo,
      restitution: opciones.rebote ?? 0.4,
      friction: opciones.friccion ?? 0.2,
      label: opciones.label ?? 'plataforma',
    });
    cuerpo.dimensiones = { ancho, alto };
    Composite.add(motor.world, cuerpo);
    cuerposEstaticos.push(cuerpo);
    return cuerpo;
  }

  function obtenerCuerposEstaticos() {
    return cuerposEstaticos.slice();
  }

  return {
    config: C,
    crearMundo,
    limpiarMundo,
    actualizarFisica,
    establecerGravedad,
    establecerLimiteInferior,
    obtenerMotor: () => motor,
    crearCuerpoPrincipal,
    obtenerCuerpoPrincipal,
    obtenerUnionBiberon,
    obtenerTetina,
    puntoLocalAMundo,
    soltarCuerpoPrincipal,
    aplicarFuerza,
    aplicarImpulso,
    crearCuerda,
    eliminarCuerda,
    obtenerCuerdas,
    obtenerSegmentos,
    cuerdaUnida,
    cuerpoLibre,
    cortarCuerda,
    cortarCuerdaEnIndice,
    alCortar,
    alPerderCuerpo,
    intersectarSegmentos,
    crearPlataforma,
    obtenerCuerposEstaticos,
  };
})();
