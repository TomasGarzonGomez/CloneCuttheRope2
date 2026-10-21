const ANCHO_CANVAS = 800;
const ALTO_CANVAS = 600;
const DURACION_ESTELA_MS = 180;
const DT_MAXIMO_MS = 100;

const ESTADOS = {
  MENU: 'MENU',
  SELECTOR: 'SELECTOR',
  AYUDA: 'AYUDA',
  JUGANDO: 'JUGANDO',
  NIVEL_SUPERADO: 'NIVEL_SUPERADO',
  GAME_OVER: 'GAME_OVER',
};

let estadoActual = ESTADOS.MENU;
let nivelActualIndice = 0;
let nivelActualDatos = null;
let bebe = null;
let lienzo = null;

let estrellasNivel = [];
let burbujasNivel = [];
let plataformasNivel = [];
let pinchosNivel = [];
let cojinesNivel = [];
let estrellasRecogidas = 0;

let tiempoVictoria = 0;
let tiempoDerrota = 0;
let mensajeDerrota = '';
let particulas = [];
let animCojines = [];

const trazo = {
  activo: false,
  ultimo: null,
  puntos: [],
};

const PROGRESO_KEY = 'cut_the_rope_progreso_v2';
let progreso = {
  nivelDesbloqueado: 1,
  estrellas: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function cargarProgreso() {
  try {
    const guardado = localStorage.getItem(PROGRESO_KEY);
    if (guardado) {
      progreso = Object.assign(progreso, JSON.parse(guardado));
    }
  } catch (e) {
    console.warn('No se pudo acceder a localStorage:', e);
  }
}

function guardarProgreso() {
  try {
    localStorage.setItem(PROGRESO_KEY, JSON.stringify(progreso));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

function setup() {
  lienzo = createCanvas(ANCHO_CANVAS, ALTO_CANVAS);
  ajustarEscalaCanvas();
  cargarProgreso();
  Fisica.crearMundo();
  Fisica.establecerLimiteInferior(ALTO_CANVAS + 80);

  Fisica.alCortar(() => {
    Sonidos.corte();
  });

  Fisica.alPerderCuerpo(() => {
    if (estadoActual === ESTADOS.JUGANDO && bebe && bebe.estado !== 'comiendo' && bebe.estado !== 'satisfecho') {
      fallarNivel('¡El caramelo cayó al vacío!');
    }
  });

  cambiarEstado(ESTADOS.MENU);
}

function ajustarEscalaCanvas() {
  const s = Math.min((windowWidth - 24) / ANCHO_CANVAS, (windowHeight - 24) / ALTO_CANVAS);
  lienzo.style('width', Math.floor(ANCHO_CANVAS * s) + 'px');
  lienzo.style('height', Math.floor(ALTO_CANVAS * s) + 'px');
}

function windowResized() {
  ajustarEscalaCanvas();
}

function cambiarEstado(nuevoEstado) {
  estadoActual = nuevoEstado;
  trazo.activo = false;
  trazo.ultimo = null;
  trazo.puntos = [];
}

function cargarNivel(indice) {
  if (indice < 0 || indice >= NIVELES.length) return;
  nivelActualIndice = indice;
  nivelActualDatos = NIVELES[indice];
  estrellasRecogidas = 0;
  particulas = [];
  animCojines = [];
  tiempoVictoria = 0;
  tiempoDerrota = 0;
  mensajeDerrota = '';

  Fisica.limpiarMundo();

  Fisica.crearCuerpoPrincipal(nivelActualDatos.biberon.x, nivelActualDatos.biberon.y);

  for (const c of nivelActualDatos.cuerdas) {
    Fisica.crearCuerda(c.anclaje, c.longitud, c.nodos || 12, c.opciones || {});
  }

  bebe = crearBebe(nivelActualDatos.bebe.x, nivelActualDatos.bebe.y);
  bebe.alCambiarEstado = (estado) => {
    if (estado === 'comiendo') {
      Sonidos.bebeCome();
    } else if (estado === 'satisfecho') {
      superarNivel();
    }
  };

  estrellasNivel = nivelActualDatos.estrellas.map((e, idx) => ({
    id: idx + 1,
    x: e.x,
    y: e.y,
    radio: 24,
    recogida: false,
    angulo: Math.random() * TWO_PI,
  }));

  burbujasNivel = (nivelActualDatos.burbujas || []).map((b, idx) => ({
    id: idx + 1,
    x: b.x,
    y: b.y,
    radio: b.radio || 40,
    activa: true,
    atrapada: false,
    tiempo: 0,
  }));

  cojinesNivel = (nivelActualDatos.cojines || []).map((c, idx) => ({
    id: idx + 1,
    x: c.x,
    y: c.y,
    angulo: c.angulo || 0,
    fuerza: c.fuerza || 4.5,
    radio: 32,
    escalaX: 1,
    escalaY: 1,
  }));

  plataformasNivel = [];
  pinchosNivel = [];

  for (const obs of (nivelActualDatos.obstaculos || [])) {
    if (obs.tipo === 'plataforma') {
      Fisica.crearPlataforma(obs.x, obs.y, obs.ancho, obs.alto, {
        angulo: obs.angulo || 0,
        rebote: obs.rebote ?? 0.35,
        friccion: obs.friccion ?? 0.15,
      });
      plataformasNivel.push(obs);
    } else if (obs.tipo === 'pincho') {
      pinchosNivel.push(obs);
    }
  }

  cambiarEstado(ESTADOS.JUGANDO);
}

function superarNivel() {
  tiempoVictoria = millis();
  Sonidos.nivelGanado();

  const idNivel = nivelActualDatos.id;
  progreso.estrellas[idNivel] = Math.max(progreso.estrellas[idNivel] || 0, estrellasRecogidas);
  if (nivelActualIndice + 2 > progreso.nivelDesbloqueado) {
    progreso.nivelDesbloqueado = Math.min(NIVELES.length, nivelActualIndice + 2);
  }
  guardarProgreso();

  for (let i = 0; i < 50; i++) {
    crearParticulaConfeti(bebe.x, bebe.y - 45);
  }

  cambiarEstado(ESTADOS.NIVEL_SUPERADO);
}

function fallarNivel(razon) {
  if (estadoActual !== ESTADOS.JUGANDO) return;
  tiempoDerrota = millis();
  mensajeDerrota = razon || '¡Inténtalo de nuevo!';
  Sonidos.perder();
  cambiarEstado(ESTADOS.GAME_OVER);
}

function draw() {
  dibujarFondoVibrante();

  const dt = Math.min(deltaTime, DT_MAXIMO_MS);

  if (estadoActual === ESTADOS.JUGANDO) {
    actualizarLogicaJuego(dt);
  } else if (estadoActual === ESTADOS.NIVEL_SUPERADO || estadoActual === ESTADOS.GAME_OVER) {
    if (bebe) actualizarBebe(bebe, dt);
  }

  actualizarParticulas(dt);
  actualizarAnimacionesCojines(dt);

  if (estadoActual === ESTADOS.JUGANDO || estadoActual === ESTADOS.NIVEL_SUPERADO || estadoActual === ESTADOS.GAME_OVER) {
    dibujarEscenaJuego();
    dibujarHUD();
  }

  if (estadoActual === ESTADOS.MENU) {
    dibujarPantallaMenu();
  } else if (estadoActual === ESTADOS.SELECTOR) {
    dibujarPantallaSelector();
  } else if (estadoActual === ESTADOS.AYUDA) {
    dibujarPantallaAyuda();
  } else if (estadoActual === ESTADOS.NIVEL_SUPERADO) {
    dibujarModalVictoria();
  } else if (estadoActual === ESTADOS.GAME_OVER) {
    dibujarModalDerrota();
  }

  dibujarEstela();
}

function actualizarLogicaJuego(dt) {
  const biberon = Fisica.obtenerCuerpoPrincipal();

  Fisica.actualizarFisica(deltaTime);
  if (bebe) actualizarBebe(bebe, dt);

  actualizarBurbujas(biberon, dt);

  if (biberon) {
    const bx = biberon.position.x;
    const by = biberon.position.y;

    if (by < -45 || by > height + 80 || bx < -45 || bx > width + 45) {
      fallarNivel('¡El caramelo salió de la pantalla!');
      return;
    }

    const tetina = Fisica.obtenerTetina();

    for (const est of estrellasNivel) {
      if (!est.recogida) {
        est.angulo += dt * 0.002;
        const dCentro = Math.hypot(bx - est.x, by - est.y);
        const dTetina = tetina ? Math.hypot(tetina.x - est.x, tetina.y - est.y) : 999;
        if (dCentro < est.radio + 16 || dTetina < est.radio + 14) {
          est.recogida = true;
          estrellasRecogidas++;
          Sonidos.estrella(estrellasRecogidas);
          crearParticulasEstrella(est.x, est.y);
        }
      }
    }

    for (const pincho of pinchosNivel) {
      const px = pincho.x;
      const py = pincho.y;
      const hw = pincho.ancho / 2;
      const hh = pincho.alto / 2;

      if (bx > px - hw - 8 && bx < px + hw + 8 && by > py - hh - 22 && by < py + hh + 8) {
        Sonidos.golpePeligro();
        crearParticulasImpacto(bx, by);
        Fisica.soltarCuerpoPrincipal();
        fallarNivel('¡El caramelo chocó contra los pinchos!');
        break;
      }
    }
  }
}

function actualizarBurbujas(biberon, dt) {
  for (const b of burbujasNivel) {
    if (!b.activa) continue;
    b.tiempo += dt;

    if (!b.atrapada && biberon) {
      const d = Math.hypot(biberon.position.x - b.x, biberon.position.y - b.y);
      if (d < b.radio + 10) {
        b.atrapada = true;
        Matter.Sleeping.set(biberon, false);
        Matter.Body.setVelocity(biberon, { x: 0, y: -3 });
        Sonidos.burbujaEntrar();
        crearParticulasBurbuja(b.x, b.y, 14);
      }
    }

    if (b.atrapada) {
      if (biberon) {
        b.x = biberon.position.x;
        b.y = biberon.position.y;

        Matter.Sleeping.set(biberon, false);

        // Cancela la gravedad exactamente para que el cuerpo quede en ingravidez,
        // luego fija una velocidad de subida constante y suave.
        const masa = biberon.mass;
        const antigrav = masa * 1 * 0.001;
        Fisica.aplicarFuerza({ x: 0, y: -antigrav });

        const vel = Matter.Body.getVelocity(biberon);
        Matter.Body.setVelocity(biberon, {
          x: vel.x * 0.995,
          y: -1.5,
        });
      } else {
        b.atrapada = false;
        b.activa = false;
      }
    }
  }
}

function accionarCojin(c) {
  c.escalaX = 0.55;
  c.escalaY = 1.35;
  Sonidos.soplido();

  const biberon = Fisica.obtenerCuerpoPrincipal();
  if (biberon) {
    const dx = biberon.position.x - c.x;
    const dy = biberon.position.y - c.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 175) {
      const angObjeto = Math.atan2(dy, dx);
      const difAng = Math.abs(diferenciaAngular(c.angulo, angObjeto));

      if (difAng < 0.85) {
        const atenuacion = Math.max(0.35, 1 - dist / 185);
        Fisica.aplicarImpulso({
          x: Math.cos(c.angulo) * c.fuerza * 1.7 * biberon.mass * atenuacion,
          y: Math.sin(c.angulo) * c.fuerza * 1.7 * biberon.mass * atenuacion - 0.25 * biberon.mass,
        });
      }
    }
  }

  for (let i = 0; i < 15; i++) {
    crearParticulaViento(c.x + Math.cos(c.angulo) * 30, c.y + Math.sin(c.angulo) * 30, c.angulo);
  }
}

function actualizarAnimacionesCojines(dt) {
  for (const c of cojinesNivel) {
    c.escalaX += (1 - c.escalaX) * 0.18;
    c.escalaY += (1 - c.escalaY) * 0.18;
  }
}

function reventarBurbuja(b) {
  if (!b || !b.activa) return;
  b.activa = false;
  b.atrapada = false;
  Sonidos.burbujaPop();
  crearParticulasBurbuja(b.x, b.y, 20);
}

function intentarReventarBurbuja(x, y) {
  for (const b of burbujasNivel) {
    if (b.activa && Math.hypot(x - b.x, y - b.y) <= b.radio + 16) {
      reventarBurbuja(b);
      return true;
    }
  }
  return false;
}

function dibujarFondoVibrante() {
  const c1 = color(108, 62, 44);
  const c2 = color(68, 36, 25);
  for (let y = 0; y < height; y += 4) {
    const inter = map(y, 0, height, 0, 1);
    stroke(lerpColor(c1, c2, inter));
    strokeWeight(4);
    line(0, y, width, y);
  }

  noStroke();
  fill(255, 220, 140, 22);
  circle(width / 2, height / 2 - 40, 720);
  fill(255, 235, 170, 15);
  circle(width / 2, height / 2 - 40, 520);

  stroke(55, 30, 20, 90);
  strokeWeight(2);
  for (let x = 0; x < width; x += 36) {
    line(x, 0, x, height);
  }

  noStroke();
  fill(42, 22, 14);
  rect(0, height - 52, width, 52);

  fill(160, 95, 50);
  rect(0, height - 54, width, 4);

  fill(240, 160, 80, 70);
  rect(0, height - 50, width, 2);

  fill(25, 12, 8);
  for (let x = 40; x < width; x += 120) {
    circle(x, height - 26, 8);
    fill(210, 140, 80, 120);
    circle(x - 1, height - 27, 3);
    fill(25, 12, 8);
  }
}

function dibujarEscenaJuego() {
  for (const plat of plataformasNivel) {
    dibujarPlataforma(plat);
  }

  for (const pincho of pinchosNivel) {
    dibujarPinchos(pincho);
  }

  for (const c of cojinesNivel) {
    dibujarCojinAire(c);
  }

  if (bebe) dibujarBebe(bebe);

  for (const cuerda of Fisica.obtenerCuerdas()) {
    dibujarCuerda(cuerda);
    dibujarAnclaje(cuerda.anclaje);
  }

  for (const est of estrellasNivel) {
    dibujarEstrella(est);
  }

  const biberon = Fisica.obtenerCuerpoPrincipal();
  if (biberon) {
    dibujarBiberon(biberon.position.x, biberon.position.y, biberon.angle);
  }

  if (bebe) {
    const pose = poseBiberonComiendo(bebe);
    if (pose) {
      dibujarBiberon(pose.x, pose.y, pose.angulo, pose.nivel, pose.escala, pose.alfa);
    }
    dibujarManosBebe(bebe, pose);
  }

  for (const b of burbujasNivel) {
    if (b.activa) dibujarBurbuja(b);
  }

  dibujarParticulas();
}

function dibujarPlataforma(p) {
  push();
  translate(p.x, p.y);
  rotate(p.angulo || 0);
  rectMode(CENTER);

  fill(0, 0, 0, 55);
  rect(0, 5, p.ancho, p.alto, 8);

  fill(165, 105, 55);
  rect(0, 0, p.ancho, p.alto, 8);

  fill(210, 145, 85);
  rect(0, -p.alto / 4, p.ancho - 6, p.alto / 2, 4);

  stroke(110, 65, 30);
  strokeWeight(2.5);
  noFill();
  rect(0, 0, p.ancho, p.alto, 8);

  fill(245, 195, 130);
  noStroke();
  circle(-p.ancho / 2 + 12, 0, 5);
  circle(p.ancho / 2 - 12, 0, 5);
  pop();
}

function dibujarPinchos(p) {
  push();
  translate(p.x, p.y);
  rectMode(CENTER);

  fill(45, 45, 55);
  rect(0, p.alto / 2 - 4, p.ancho, 9, 4);

  const numDientes = Math.max(3, Math.floor(p.ancho / 16));
  const anchoDiente = p.ancho / numDientes;
  const baseY = p.alto / 2;
  const puntaY = -p.alto / 2;

  for (let i = 0; i < numDientes; i++) {
    const xIzq = -p.ancho / 2 + i * anchoDiente;
    const xDer = xIzq + anchoDiente;
    const xMedio = (xIzq + xDer) / 2;

    fill(210, 215, 225);
    stroke(120, 125, 135);
    strokeWeight(1.5);
    triangle(xIzq, baseY, xDer, baseY, xMedio, puntaY);

    fill(255, 255, 255);
    noStroke();
    triangle(xIzq + 2, baseY, xMedio, baseY, xMedio, puntaY);
  }

  for (let i = 0; i < p.ancho; i += 16) {
    fill(255, 210, 30);
    quad(-p.ancho / 2 + i, p.alto / 2 - 8, -p.ancho / 2 + i + 8, p.alto / 2 - 8, -p.ancho / 2 + i + 4, p.alto / 2, -p.ancho / 2 + i - 4, p.alto / 2);
  }
  pop();
}

function dibujarCojinAire(c) {
  push();
  translate(c.x, c.y);
  rotate(c.angulo);
  scale(c.escalaX, c.escalaY);

  noStroke();
  fill(0, 0, 0, 45);
  ellipse(2, 4, c.radio * 1.8, c.radio * 1.4);

  fill(185, 55, 45);
  ellipse(0, 0, c.radio * 1.8, c.radio * 1.4);

  fill(225, 85, 75);
  ellipse(-3, -3, c.radio * 1.4, c.radio * 1.0);

  fill(255, 140, 130);
  ellipse(-6, -6, c.radio * 0.7, c.radio * 0.45);

  fill(210, 160, 50);
  stroke(130, 95, 25);
  strokeWeight(2);
  rect(c.radio * 0.7, -7, 16, 14, 3);

  noStroke();
  fill(60, 35, 10);
  circle(c.radio * 0.7 + 16, 0, 8);
  pop();
}

function dibujarBurbuja(b) {
  const oscY = Math.sin(b.tiempo * 0.003) * 3;
  const escala = 1 + Math.sin(b.tiempo * 0.005) * 0.04;

  push();
  translate(b.x, b.y + (b.atrapada ? 0 : oscY));
  scale(escala);

  noStroke();
  fill(100, 220, 255, 75);
  circle(0, 0, b.radio * 2.1);

  fill(180, 240, 255, 110);
  circle(0, 0, b.radio * 1.9);

  stroke(220, 250, 255, 220);
  strokeWeight(3);
  noFill();
  arc(0, 0, b.radio * 1.9, b.radio * 1.9, -PI * 0.8, -PI * 0.2);
  arc(0, 0, b.radio * 1.9, b.radio * 1.9, PI * 0.25, PI * 0.45);

  fill(255, 255, 255, 240);
  noStroke();
  ellipse(-b.radio * 0.45, -b.radio * 0.45, b.radio * 0.32, b.radio * 0.2);
  circle(-b.radio * 0.22, -b.radio * 0.65, b.radio * 0.12);
  pop();
}

function dibujarEstrella(est) {
  const t = millis() * 0.003;
  const flotar = Math.sin(t + est.id) * 3.5;

  push();
  translate(est.x, est.y + flotar);

  if (est.recogida) {
    pop();
    return;
  }

  noStroke();
  fill(255, 215, 0, 50);
  circle(0, 0, est.radio * 2.8);

  fill(255, 235, 120, 90);
  circle(0, 0, est.radio * 2.0);

  push();
  rotate(est.angulo || 0);
  stroke(255, 245, 160, 140);
  strokeWeight(2);
  line(-est.radio * 1.2, 0, est.radio * 1.2, 0);
  line(0, -est.radio * 1.2, 0, est.radio * 1.2);
  pop();

  dibujarFormaEstrella(0, 0, 8, 20, 5, [255, 210, 25], [255, 250, 160]);

  fill(255, 255, 255, 240);
  noStroke();
  circle(-4, -5, 5);
  pop();
}

function dibujarFormaEstrella(x, y, radioInt, radioExt, puntos, colorBase, colorBorde) {
  const anguloPaso = TWO_PI / puntos;
  const medioPaso = anguloPaso / 2;

  push();
  translate(x, y);
  rotate(-HALF_PI);

  fill(...colorBase);
  stroke(...colorBorde);
  strokeWeight(2);
  beginShape();
  for (let a = 0; a < TWO_PI; a += anguloPaso) {
    const sx = Math.cos(a) * radioExt;
    const sy = Math.sin(a) * radioExt;
    vertex(sx, sy);
    const mx = Math.cos(a + medioPaso) * radioInt;
    const my = Math.sin(a + medioPaso) * radioInt;
    vertex(mx, my);
  }
  endShape(CLOSE);
  pop();
}

function dibujarCuerda(cuerda) {
  stroke(185, 135, 75);
  strokeWeight(5);
  strokeCap(ROUND);
  for (const s of Fisica.obtenerSegmentos(cuerda)) {
    line(s.a.x, s.a.y, s.b.x, s.b.y);
  }

  stroke(245, 210, 145);
  strokeWeight(2);
  for (const s of Fisica.obtenerSegmentos(cuerda)) {
    line(s.a.x, s.a.y, s.b.x, s.b.y);
  }
}

function dibujarAnclaje(p) {
  noStroke();
  fill(0, 0, 0, 65);
  circle(p.x, p.y + 2, 20);

  fill(225, 185, 80);
  circle(p.x, p.y, 18);
  fill(255, 235, 150);
  circle(p.x - 2, p.y - 2, 7);
  fill(120, 90, 30);
  circle(p.x, p.y, 6);
}

function dibujarBiberon(x, y, angulo, nivel = 1, escala = 1, alfa = 255) {
  const w = Fisica.config.ANCHO_BIBERON;
  const h = Fisica.config.ALTO_BIBERON;
  const altoTetina = h * 0.22;
  const altoBotella = h - altoTetina;
  const arriba = -h / 2;
  const cuello = arriba + altoBotella;

  push();
  translate(x, y);
  rotate(angulo);
  scale(escala);
  rectMode(CORNER);
  noStroke();

  fill(255, 210, 80, 45 * (alfa / 255));
  circle(0, 0, h * 1.5);

  fill(0, 0, 0, 40 * (alfa / 255));
  rect(-w / 2 + 2, arriba + 3, w, altoBotella, 8);

  fill(215, 245, 255, alfa * 0.92);
  rect(-w / 2, arriba, w, altoBotella, 8);

  const altoLeche = (altoBotella - 6) * constrain(nivel, 0, 1);
  if (altoLeche > 0.5) {
    fill(255, 252, 240, alfa);
    rect(-w / 2 + 3, cuello - 3 - altoLeche, w - 6, altoLeche, 5);
  }

  stroke(140, 195, 230, alfa * 0.8);
  strokeWeight(1.5);
  for (let i = 1; i <= 3; i++) {
    const yy = arriba + (altoBotella * i) / 4;
    line(w / 2 - 9, yy, w / 2 - 3, yy);
  }
  noStroke();

  fill(255, 255, 255, alfa * 0.65);
  rect(-w / 2 + 3, arriba + 3, 3.5, altoBotella - 6, 2);

  fill(255, 110, 130, alfa);
  rect(-w / 2 - 2, cuello - 5, w + 4, 8, 3);

  fill(255, 205, 75, alfa);
  rect(-w * 0.22, cuello + 3, w * 0.44, altoTetina - 2, 3, 3, w * 0.22, w * 0.22);

  fill(185, 190, 205, alfa);
  circle(0, arriba, 9);
  fill(255, 255, 255, alfa);
  circle(-1, arriba - 1, 3.5);
  pop();
}

function dibujarHUD() {
  fill(0, 0, 0, 85);
  noStroke();
  rect(0, 0, width, 58);

  fill(255);
  textAlign(LEFT, CENTER);
  textSize(20);
  textStyle(BOLD);
  text(`NIVEL ${nivelActualDatos.id}: ${nivelActualDatos.nombre.toUpperCase()}`, 18, 29);

  const startX = width / 2 - 42;
  for (let i = 1; i <= 3; i++) {
    const x = startX + (i - 1) * 42;
    const y = 29;
    if (i <= estrellasRecogidas) {
      dibujarFormaEstrella(x, y, 6, 15, 5, [255, 215, 0], [255, 250, 150]);
    } else {
      dibujarFormaEstrella(x, y, 6, 15, 5, [75, 80, 95], [115, 125, 140]);
    }
  }

  dibujarBotonHUD('reiniciar', width - 110, 13, 40, 34, (bx, by, bw, bh) => {
    dibujarIconoReiniciar(bx + bw / 2, by + bh / 2, 18);
  });

  dibujarBotonHUD('menu', width - 60, 13, 40, 34, (bx, by, bw, bh) => {
    dibujarIconoMenu(bx + bw / 2, by + bh / 2, 18);
  });

  dibujarBotonHUD('mute', width - 160, 13, 40, 34, (bx, by, bw, bh) => {
    dibujarIconoSonido(bx + bw / 2, by + bh / 2, 18, Sonidos.estaMutado());
  });
}

function dibujarBotonHUD(id, x, y, w, h, fnDibujarIcono) {
  const hover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  push();
  translate(x, y);
  fill(hover ? [85, 115, 165] : [55, 75, 110]);
  stroke(130, 170, 235);
  strokeWeight(2);
  rect(0, 0, w, h, 8);
  pop();

  if (fnDibujarIcono) {
    fnDibujarIcono(x, y, w, h);
  }
}

function dibujarPantallaMenu() {
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);

  fill(0, 0, 0, 90);
  textSize(54);
  text('CLON DE CUT THE ROPE', width / 2 + 3, 143);

  fill(255, 215, 30);
  textSize(54);
  text('CLON DE CUT THE ROPE', width / 2, 140);

  let totalEstrellas = 0;
  for (let i = 1; i <= 5; i++) totalEstrellas += (progreso.estrellas[i] || 0);

  fill(255, 240, 170);
  textSize(18);
  text(`Estrellas Totales: ${totalEstrellas} / 15`, width / 2, 205);

  dibujarBotonGeneral('btnJugar', 'JUGAR', width / 2 - 145, 255, 290, 56, [50, 195, 95], 'play');
  dibujarBotonGeneral('btnSelector', 'NIVELES', width / 2 - 145, 328, 290, 52, [45, 145, 235], 'menu');
  dibujarBotonGeneral('btnAyuda', 'CÓMO JUGAR', width / 2 - 145, 396, 290, 48, [155, 80, 215], 'ayuda');
  dibujarBotonGeneral('btnMute', Sonidos.estaMutado() ? 'SONIDO: SILENCIADO' : 'SONIDO: ACTIVADO', width / 2 - 145, 460, 290, 46, [85, 95, 125], 'sonido');

  fill(210, 220, 235);
  textSize(13);
  textStyle(NORMAL);
  text('Física con Matter.js y Gráficos con p5.js · Funciona 100% Offline', width / 2, 545);
}

function dibujarPantallaSelector() {
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(255, 220, 50);
  textSize(34);
  text('SELECCIÓN DE NIVEL', width / 2, 80);

  const anchoTarjeta = 124;
  const altoTarjeta = 155;
  const margen = 22;
  const xInicio = (width - (5 * anchoTarjeta + 4 * margen)) / 2;
  const y = 170;

  for (let i = 0; i < NIVELES.length; i++) {
    const niv = NIVELES[i];
    const x = xInicio + i * (anchoTarjeta + margen);
    const desbloqueado = niv.id <= progreso.nivelDesbloqueado;
    const estrellas = progreso.estrellas[niv.id] || 0;
    const hover = mouseX >= x && mouseX <= x + anchoTarjeta && mouseY >= y && mouseY <= y + altoTarjeta;

    push();
    translate(x, y);

    if (desbloqueado) {
      fill(hover ? [65, 105, 175] : [45, 70, 120]);
      stroke(hover ? [255, 225, 100] : [100, 155, 245]);
    } else {
      fill(35, 40, 55);
      stroke(65, 75, 95);
    }
    strokeWeight(2.5);
    rect(0, 0, anchoTarjeta, altoTarjeta, 12);

    noStroke();
    if (desbloqueado) {
      fill(255);
      textSize(32);
      text(niv.id, anchoTarjeta / 2, 45);

      fill(200, 225, 255);
      textSize(12);
      text(niv.nombre, anchoTarjeta / 2, 78);

      for (let s = 1; s <= 3; s++) {
        const sx = anchoTarjeta / 2 - 26 + (s - 1) * 26;
        const sy = 120;
        if (s <= estrellas) {
          dibujarFormaEstrella(sx, sy, 4, 10, 5, [255, 215, 0], [255, 250, 150]);
        } else {
          dibujarFormaEstrella(sx, sy, 4, 10, 5, [75, 85, 105], [105, 115, 135]);
        }
      }
    } else {
      dibujarIconoCandado(anchoTarjeta / 2, 65, 24);
      fill(150, 160, 180);
      textSize(14);
      text(`Nivel ${niv.id}`, anchoTarjeta / 2, 110);
    }
    pop();
  }

  dibujarBotonGeneral('btnVolverMenu', 'VOLVER AL MENÚ', width / 2 - 120, 435, 240, 50, [75, 90, 120], 'volver');
}

function dibujarPantallaAyuda() {
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(255, 215, 40);
  textSize(32);
  text('CÓMO JUGAR', width / 2, 75);

  fill(45, 30, 25);
  stroke(220, 140, 60);
  strokeWeight(2.5);
  rect(width / 2 - 280, 120, 560, 305, 14);

  noStroke();
  fill(255, 245, 235);
  textSize(16);
  textAlign(LEFT, TOP);
  textStyle(NORMAL);

  const tips = [
    '•  Corta las cuerdas arrastrando el mouse con el botón izquierdo.',
    '•  Recolecta las 3 estrellas doradas que hay en cada nivel.',
    '•  Alimenta al bebé dejando caer el caramelo directamente en su boca.',
    '•  Las burbujas hacen flotar el caramelo. Haz clic en ellas para explotarlas.',
    '•  Haz clic en el fuelle cuando el caramelo esté cerca para empujar la burbuja.',
    '•  Evita los pinchos y salirte de la pantalla para no perder.',
    '•  Atajos de teclado: R (Reiniciar), M (Silenciar sonido).',
  ];

  let ty = 140;
  for (const tip of tips) {
    text(tip, width / 2 - 250, ty);
    ty += 38;
  }

  dibujarBotonGeneral('btnVolverAyuda', 'ENTENDIDO', width / 2 - 110, 445, 220, 50, [50, 180, 95], 'volver');
}

function dibujarModalVictoria() {
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  const mw = 460;
  const mh = 330;
  const mx = (width - mw) / 2;
  const my = (height - mh) / 2;

  fill(45, 32, 28);
  stroke(95, 210, 120);
  strokeWeight(3.5);
  rect(mx, my, mw, mh, 18);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(110, 245, 145);
  textSize(30);
  text('¡NIVEL COMPLETADO!', width / 2, my + 45);

  for (let i = 1; i <= 3; i++) {
    const sx = width / 2 - 64 + (i - 1) * 64;
    const sy = my + 115;
    if (i <= estrellasRecogidas) {
      dibujarFormaEstrella(sx, sy, 9, 22, 5, [255, 215, 0], [255, 250, 150]);
    } else {
      dibujarFormaEstrella(sx, sy, 9, 22, 5, [75, 85, 105], [110, 120, 145]);
    }
  }

  fill(255, 240, 210);
  textSize(17);
  textStyle(NORMAL);
  text(`Obtuviste ${estrellasRecogidas} de 3 estrellas`, width / 2, my + 168);

  const tieneSiguiente = nivelActualIndice + 1 < NIVELES.length;

  dibujarBotonGeneral('btnReintentarVic', 'REPETIR', mx + 25, my + 225, 125, 48, [75, 90, 120], 'reiniciar');
  dibujarBotonGeneral('btnNivelesVic', 'NIVELES', mx + 165, my + 225, 125, 48, [50, 135, 225], 'menu');

  if (tieneSiguiente) {
    dibujarBotonGeneral('btnSiguienteVic', 'SIGUIENTE', mx + 305, my + 225, 130, 48, [45, 190, 90], 'play');
  } else {
    dibujarBotonGeneral('btnMenuVic', 'MENÚ', mx + 305, my + 225, 130, 48, [170, 85, 215], 'volver');
  }
}

function dibujarModalDerrota() {
  fill(0, 0, 0, 140);
  rect(0, 0, width, height);

  const mw = 440;
  const mh = 270;
  const mx = (width - mw) / 2;
  const my = (height - mh) / 2;

  fill(45, 28, 30);
  stroke(235, 75, 80);
  strokeWeight(3.5);
  rect(mx, my, mw, mh, 18);

  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  fill(255, 115, 115);
  textSize(30);
  text('¡OH NO!', width / 2, my + 48);

  fill(255, 225, 225);
  textSize(17);
  textStyle(NORMAL);
  text(mensajeDerrota, width / 2, my + 102);

  dibujarBotonGeneral('btnReintentarDer', 'REINTENTAR', mx + 50, my + 168, 160, 50, [215, 75, 75], 'reiniciar');
  dibujarBotonGeneral('btnNivelesDer', 'NIVELES', mx + 230, my + 168, 160, 50, [75, 90, 120], 'menu');
}

function dibujarBotonGeneral(id, texto, x, y, w, h, colorBase, tipoIcono) {
  const hover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  push();
  translate(x, y);

  fill(0, 0, 0, 40);
  rect(0, 4, w, h, 10);

  fill(hover ? colorBase.map((c) => Math.min(255, c + 35)) : colorBase);
  stroke(255, 255, 255, hover ? 220 : 120);
  strokeWeight(hover ? 2.5 : 1.5);
  rect(0, 0, w, h, 10);

  textSize(15);
  textStyle(BOLD);
  const anchoTexto = textWidth(texto);

  if (tipoIcono) {
    const tamIcono = 16;
    const separacion = 12;
    const anchoContenido = tamIcono + separacion + anchoTexto;
    const inicioX = (w - anchoContenido) / 2;

    const textoCentroX = inicioX + tamIcono + separacion + anchoTexto / 2;
    const textoCentroY = h / 2;

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    text(texto, textoCentroX, textoCentroY);
    pop();

    const iconX = x + inicioX + tamIcono / 2;
    const iconY = y + h / 2;
    dibujarIconoPorTipo(tipoIcono, iconX, iconY, tamIcono);
  } else {
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    text(texto, w / 2, h / 2);
    pop();
  }
}

function dibujarIconoPorTipo(tipo, x, y, tam) {
  if (tipo === 'play') dibujarIconoPlay(x, y, tam);
  else if (tipo === 'menu') dibujarIconoMenu(x, y, tam);
  else if (tipo === 'ayuda') dibujarIconoAyuda(x, y, tam);
  else if (tipo === 'sonido') dibujarIconoSonido(x, y, tam, Sonidos.estaMutado());
  else if (tipo === 'volver') dibujarIconoVolver(x, y, tam);
  else if (tipo === 'reiniciar') dibujarIconoReiniciar(x, y, tam);
}

function dibujarIconoReiniciar(x, y, tam) {
  push();
  translate(x, y);
  noFill();
  stroke(255);
  strokeWeight(2.5);
  strokeCap(ROUND);
  arc(0, 0, tam * 1.1, tam * 1.1, -PI * 0.7, PI * 0.85);

  fill(255);
  noStroke();
  const flechaX = Math.cos(-PI * 0.7) * (tam * 0.55);
  const flechaY = Math.sin(-PI * 0.7) * (tam * 0.55);
  triangle(flechaX, flechaY - 5, flechaX + 6, flechaY + 2, flechaX - 4, flechaY + 3);
  pop();
}

function dibujarIconoMenu(x, y, tam) {
  push();
  translate(x, y);
  stroke(255);
  strokeWeight(2.5);
  strokeCap(ROUND);
  const h = tam * 0.35;
  const w = tam * 0.6;
  line(-w, -h, w, -h);
  line(-w, 0, w, 0);
  line(-w, h, w, h);
  pop();
}

function dibujarIconoSonido(x, y, tam, mutado) {
  push();
  translate(x, y);
  fill(255);
  noStroke();

  rect(-tam * 0.5, -tam * 0.2, tam * 0.3, tam * 0.4, 1);
  beginShape();
  vertex(-tam * 0.25, -tam * 0.2);
  vertex(0, -tam * 0.5);
  vertex(0, tam * 0.5);
  vertex(-tam * 0.25, tam * 0.2);
  endShape(CLOSE);

  if (mutado) {
    stroke(255, 80, 80);
    strokeWeight(2.5);
    line(-tam * 0.4, -tam * 0.4, tam * 0.5, tam * 0.4);
  } else {
    noFill();
    stroke(255);
    strokeWeight(2);
    arc(tam * 0.1, 0, tam * 0.5, tam * 0.6, -PI * 0.35, PI * 0.35);
    arc(tam * 0.1, 0, tam * 0.9, tam * 1.0, -PI * 0.35, PI * 0.35);
  }
  pop();
}

function dibujarIconoPlay(x, y, tam) {
  push();
  translate(x, y);
  fill(255);
  noStroke();
  triangle(-tam * 0.35, -tam * 0.5, tam * 0.5, 0, -tam * 0.35, tam * 0.5);
  pop();
}

function dibujarIconoVolver(x, y, tam) {
  push();
  translate(x, y);
  stroke(255);
  strokeWeight(2.5);
  strokeCap(ROUND);
  strokeJoin(ROUND);
  noFill();
  beginShape();
  vertex(tam * 0.25, -tam * 0.45);
  vertex(-tam * 0.25, 0);
  vertex(tam * 0.25, tam * 0.45);
  endShape();
  pop();
}

function dibujarIconoCandado(x, y, tam) {
  push();
  translate(x, y);
  noFill();
  stroke(180, 190, 210);
  strokeWeight(2.5);
  arc(0, -tam * 0.2, tam * 0.5, tam * 0.55, PI, TWO_PI);

  fill(160, 175, 195);
  noStroke();
  rect(-tam * 0.38, -tam * 0.1, tam * 0.76, tam * 0.65, 3);

  fill(35, 40, 55);
  circle(0, tam * 0.15, tam * 0.2);
  rect(-tam * 0.05, tam * 0.15, tam * 0.1, tam * 0.15);
  pop();
}

function dibujarIconoAyuda(x, y, tam) {
  push();
  translate(x, y);
  noFill();
  stroke(255);
  strokeWeight(2);
  circle(0, 0, tam * 1.3);

  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(tam * 0.9);
  textStyle(BOLD);
  text('?', 0, tam * 0.1);
  pop();
}

function dibujarEstela() {
  const ahora = millis();
  trazo.puntos = trazo.puntos.filter((p) => ahora - p.t < DURACION_ESTELA_MS);

  for (let i = 1; i < trazo.puntos.length; i++) {
    const p0 = trazo.puntos[i - 1];
    const p1 = trazo.puntos[i];
    const vida = 1 - (ahora - p1.t) / DURACION_ESTELA_MS;

    stroke(255, 160, 40, 220 * vida);
    strokeWeight(2 + 7 * vida);
    line(p0.x, p0.y, p1.x, p1.y);

    stroke(255, 255, 255, 255 * vida);
    strokeWeight(1 + 3 * vida);
    line(p0.x, p0.y, p1.x, p1.y);
  }
}

function iniciarTrazo(x, y) {
  trazo.activo = true;
  trazo.ultimo = { x, y };
  trazo.puntos = [{ x, y, t: millis() }];
}

function extenderTrazo(x, y) {
  if (!trazo.activo) return;
  const actual = { x, y };
  if (estadoActual === ESTADOS.JUGANDO) {
    Fisica.cortarCuerda({ a: trazo.ultimo, b: actual });
    intentarReventarBurbuja(x, y);
  }
  trazo.ultimo = actual;
  trazo.puntos.push({ x, y, t: millis() });
}

function terminarTrazo() {
  trazo.activo = false;
  trazo.ultimo = null;
}

function mousePressed() {
  if (mouseButton !== LEFT) return;
  if (Sonidos.desbloquear) Sonidos.desbloquear();

  if (estadoActual === ESTADOS.JUGANDO) {
    if (mouseY <= 58) {
      if (mouseX >= width - 60 && mouseX <= width - 20) {
        Sonidos.boton();
        cambiarEstado(ESTADOS.SELECTOR);
        return;
      }
      if (mouseX >= width - 110 && mouseX <= width - 70) {
        Sonidos.boton();
        cargarNivel(nivelActualIndice);
        return;
      }
      if (mouseX >= width - 160 && mouseX <= width - 120) {
        Sonidos.boton();
        Sonidos.alternarMute();
        return;
      }
    }

    for (const c of cojinesNivel) {
      if (Math.hypot(mouseX - c.x, mouseY - c.y) <= c.radio + 8) {
        accionarCojin(c);
        return;
      }
    }

    if (intentarReventarBurbuja(mouseX, mouseY)) {
      return;
    }

    iniciarTrazo(mouseX, mouseY);
    return;
  }

  if (estadoActual === ESTADOS.MENU) {
    if (clickEnRect(width / 2 - 145, 255, 290, 56)) {
      Sonidos.boton();
      cargarNivel(progreso.nivelDesbloqueado - 1);
    } else if (clickEnRect(width / 2 - 145, 328, 290, 52)) {
      Sonidos.boton();
      cambiarEstado(ESTADOS.SELECTOR);
    } else if (clickEnRect(width / 2 - 145, 396, 290, 48)) {
      Sonidos.boton();
      cambiarEstado(ESTADOS.AYUDA);
    } else if (clickEnRect(width / 2 - 145, 460, 290, 46)) {
      Sonidos.boton();
      Sonidos.alternarMute();
    }
    return;
  }

  if (estadoActual === ESTADOS.SELECTOR) {
    const anchoTarjeta = 124;
    const altoTarjeta = 155;
    const margen = 22;
    const xInicio = (width - (5 * anchoTarjeta + 4 * margen)) / 2;
    const y = 170;

    for (let i = 0; i < NIVELES.length; i++) {
      const x = xInicio + i * (anchoTarjeta + margen);
      if (clickEnRect(x, y, anchoTarjeta, altoTarjeta)) {
        if (NIVELES[i].id <= progreso.nivelDesbloqueado) {
          Sonidos.boton();
          cargarNivel(i);
        }
        return;
      }
    }

    if (clickEnRect(width / 2 - 120, 435, 240, 50)) {
      Sonidos.boton();
      cambiarEstado(ESTADOS.MENU);
    }
    return;
  }

  if (estadoActual === ESTADOS.AYUDA) {
    if (clickEnRect(width / 2 - 110, 445, 220, 50)) {
      Sonidos.boton();
      cambiarEstado(ESTADOS.MENU);
    }
    return;
  }

  if (estadoActual === ESTADOS.NIVEL_SUPERADO) {
    const mw = 460;
    const mh = 330;
    const mx = (width - mw) / 2;
    const my = (height - mh) / 2;

    if (clickEnRect(mx + 25, my + 225, 125, 48)) {
      Sonidos.boton();
      cargarNivel(nivelActualIndice);
    } else if (clickEnRect(mx + 165, my + 225, 125, 48)) {
      Sonidos.boton();
      cambiarEstado(ESTADOS.SELECTOR);
    } else if (clickEnRect(mx + 305, my + 225, 130, 48)) {
      Sonidos.boton();
      if (nivelActualIndice + 1 < NIVELES.length) {
        cargarNivel(nivelActualIndice + 1);
      } else {
        cambiarEstado(ESTADOS.MENU);
      }
    }
    return;
  }

  if (estadoActual === ESTADOS.GAME_OVER) {
    const mw = 440;
    const mh = 270;
    const mx = (width - mw) / 2;
    const my = (height - mh) / 2;

    if (clickEnRect(mx + 50, my + 168, 160, 50)) {
      Sonidos.boton();
      cargarNivel(nivelActualIndice);
    } else if (clickEnRect(mx + 230, my + 168, 160, 50)) {
      Sonidos.boton();
      cambiarEstado(ESTADOS.SELECTOR);
    }
    return;
  }
}

function clickEnRect(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}

function mouseDragged() {
  if (estadoActual === ESTADOS.JUGANDO) {
    extenderTrazo(mouseX, mouseY);
  }
  return false;
}

function mouseReleased() {
  terminarTrazo();
}

function keyPressed() {
  if (key === 'r' || key === 'R') {
    if (estadoActual === ESTADOS.JUGANDO || estadoActual === ESTADOS.GAME_OVER || estadoActual === ESTADOS.NIVEL_SUPERADO) {
      cargarNivel(nivelActualIndice);
    }
  }
  if (key === 'm' || key === 'M') {
    Sonidos.alternarMute();
  }
  if (keyCode === ESCAPE) {
    if (estadoActual !== ESTADOS.MENU) {
      cambiarEstado(ESTADOS.MENU);
    }
  }
}

function crearParticulasEstrella(x, y) {
  for (let i = 0; i < 24; i++) {
    const ang = Math.random() * TWO_PI;
    const vel = 2 + Math.random() * 4;
    particulas.push({
      x,
      y,
      vx: Math.cos(ang) * vel,
      vy: Math.sin(ang) * vel,
      vida: 0,
      duracion: 500 + Math.random() * 250,
      color: [255, 215 + Math.random() * 40, 40],
      tamano: 5 + Math.random() * 5,
      tipo: 'estrella',
    });
  }
}

function crearParticulasBurbuja(x, y, cantidad = 14) {
  for (let i = 0; i < cantidad; i++) {
    const ang = Math.random() * TWO_PI;
    const vel = 1.2 + Math.random() * 3.5;
    particulas.push({
      x,
      y,
      vx: Math.cos(ang) * vel,
      vy: Math.sin(ang) * vel,
      vida: 0,
      duracion: 350 + Math.random() * 200,
      color: [170, 235, 255],
      tamano: 4 + Math.random() * 6,
      tipo: 'burbuja',
    });
  }
}

function crearParticulaViento(x, y, angulo) {
  const dispersion = (Math.random() - 0.5) * 0.35;
  const ang = angulo + dispersion;
  const vel = 4 + Math.random() * 3;
  particulas.push({
    x,
    y,
    vx: Math.cos(ang) * vel,
    vy: Math.sin(ang) * vel,
    vida: 0,
    duracion: 260 + Math.random() * 120,
    color: [255, 255, 255],
    tamano: 5 + Math.random() * 5,
    tipo: 'viento',
  });
}

function crearParticulasImpacto(x, y) {
  for (let i = 0; i < 30; i++) {
    const ang = Math.random() * TWO_PI;
    const vel = 2.5 + Math.random() * 5;
    particulas.push({
      x,
      y,
      vx: Math.cos(ang) * vel,
      vy: Math.sin(ang) * vel,
      vida: 0,
      duracion: 550,
      color: [255, 245, 235],
      tamano: 5 + Math.random() * 6,
      tipo: 'leche',
    });
  }
}

function crearParticulaConfeti(x, y) {
  const ang = Math.random() * TWO_PI;
  const vel = 2.5 + Math.random() * 6;
  const paleta = [
    [255, 75, 75],
    [255, 225, 45],
    [55, 205, 255],
    [105, 245, 95],
    [225, 105, 255],
    [255, 145, 45],
  ];
  particulas.push({
    x,
    y,
    vx: Math.cos(ang) * vel,
    vy: Math.sin(ang) * vel - 2.5,
    vida: 0,
    duracion: 900 + Math.random() * 600,
    color: paleta[Math.floor(Math.random() * paleta.length)],
    tamano: 7 + Math.random() * 5,
    tipo: 'confeti',
  });
}

function actualizarParticulas(dt) {
  for (const p of particulas) {
    p.x += p.vx * (dt / 16);
    p.y += p.vy * (dt / 16);
    if (p.tipo === 'confeti' || p.tipo === 'leche') {
      p.vy += 0.14 * (dt / 16);
    }
    p.vida += dt;
  }
  particulas = particulas.filter((p) => p.vida < p.duracion);
}

function dibujarParticulas() {
  noStroke();
  for (const p of particulas) {
    const k = 1 - p.vida / p.duracion;
    fill(p.color[0], p.color[1], p.color[2], 255 * k);
    if (p.tipo === 'confeti') {
      rect(p.x, p.y, p.tamano, p.tamano * 0.65);
    } else {
      circle(p.x, p.y, p.tamano * k);
    }
  }
}
