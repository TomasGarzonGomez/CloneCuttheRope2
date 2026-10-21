const CONFIG_BEBE = {
  RADIO_CABEZA: 42,
  DISTANCIA_CAPTURA: 55,
  ANGULO_TOMA: 0.65,
  DURACION_ACOMODO_MS: 280,
  DURACION_TOMA_MS: 1600,
  DURACION_DESAPARECER_MS: 350,
  INTERVALO_LAGRIMA_MS: 130,
  INTERVALO_CORAZON_MS: 600,
};

function crearBebe(x, y) {
  return {
    x,
    y,
    estado: 'llorando',
    tiempo: 0,
    tiempoTotal: 0,
    toma: null,
    tetinaAnterior: null,
    lagrimas: [],
    corazones: [],
    ultimaParticula: 0,
    alCambiarEstado: null,
  };
}

function bocaBebe(bebe) {
  return { x: bebe.x, y: bebe.y + CONFIG_BEBE.RADIO_CABEZA * 0.44 };
}

function actualizarBebe(bebe, dtMs) {
  const B = CONFIG_BEBE;
  bebe.tiempo += dtMs;
  bebe.tiempoTotal += dtMs;

  if (bebe.estado === 'llorando') {
    const tetina = Fisica.obtenerTetina();
    if (tetina) {
      const anterior = bebe.tetinaAnterior;
      const desde = anterior && Math.hypot(tetina.x - anterior.x, tetina.y - anterior.y) < 300
        ? anterior : tetina;
      if (distanciaPuntoSegmento(bebe, desde, tetina) < B.DISTANCIA_CAPTURA) {
        empezarAComer(bebe);
      }
    }
    bebe.tetinaAnterior = tetina;
  } else if (bebe.estado === 'comiendo') {
    const fin = B.DURACION_ACOMODO_MS + B.DURACION_TOMA_MS + B.DURACION_DESAPARECER_MS;
    if (bebe.tiempo >= fin) cambiarEstadoBebe(bebe, 'satisfecho');
  }

  actualizarParticulasBebe(bebe, dtMs);
}

function empezarAComer(bebe) {
  const pose = Fisica.soltarCuerpoPrincipal();
  if (pose) {
    bebe.toma = { x: pose.posicion.x, y: pose.posicion.y, angulo: pose.angulo };
  } else {
    bebe.toma = { x: bebe.x, y: bebe.y - 30, angulo: 0 };
  }
  cambiarEstadoBebe(bebe, 'comiendo');
}

function cambiarEstadoBebe(bebe, estado) {
  bebe.estado = estado;
  bebe.tiempo = 0;
  if (bebe.alCambiarEstado) bebe.alCambiarEstado(estado, bebe);
}

function poseBiberonComiendo(bebe) {
  if (bebe.estado !== 'comiendo' || !bebe.toma) return null;
  const B = CONFIG_BEBE;
  const alto = Fisica.config.ALTO_BIBERON;
  const t = bebe.tiempo;
  const boca = bocaBebe(bebe);

  const ang = B.ANGULO_TOMA;
  const destino = {
    x: boca.x + Math.sin(ang) * alto / 2,
    y: boca.y - Math.cos(ang) * alto / 2,
  };

  if (t < B.DURACION_ACOMODO_MS) {
    const k = suavizar(t / B.DURACION_ACOMODO_MS);
    const desde = bebe.toma;
    return {
      x: desde.x + (destino.x - desde.x) * k,
      y: desde.y + (destino.y - desde.y) * k,
      angulo: desde.angulo + diferenciaAngular(desde.angulo, ang) * k,
      nivel: 1, escala: 1, alfa: 255,
    };
  }

  const tToma = t - B.DURACION_ACOMODO_MS;
  if (tToma < B.DURACION_TOMA_MS) {
    const s = Math.sin(t * 0.03) * 1.5;
    return {
      x: destino.x - Math.sin(ang) * s,
      y: destino.y + Math.cos(ang) * s,
      angulo: ang + Math.sin(t * 0.012) * 0.04,
      nivel: 1 - tToma / B.DURACION_TOMA_MS,
      escala: 1, alfa: 255,
    };
  }

  const k = Math.min(1, (tToma - B.DURACION_TOMA_MS) / B.DURACION_DESAPARECER_MS);
  return { x: destino.x, y: destino.y - 12 * k, angulo: ang, nivel: 0, escala: 1 - 0.5 * k, alfa: 255 * (1 - k) };
}

function succionBebe(bebe) {
  if (bebe.estado !== 'comiendo') return 0;
  const t = bebe.tiempo - CONFIG_BEBE.DURACION_ACOMODO_MS;
  if (t < 0 || t > CONFIG_BEBE.DURACION_TOMA_MS) return 0;
  return 0.5 + 0.5 * Math.sin(bebe.tiempo * 0.03);
}

function actualizarParticulasBebe(bebe, dtMs) {
  const B = CONFIG_BEBE;
  const R = B.RADIO_CABEZA;
  bebe.ultimaParticula += dtMs;

  if (bebe.estado === 'llorando' && bebe.ultimaParticula > B.INTERVALO_LAGRIMA_MS) {
    bebe.ultimaParticula = 0;
    for (const lado of [-1, 1]) {
      bebe.lagrimas.push({
        x: bebe.x + lado * R * 0.44, y: bebe.y - R * 0.02,
        vx: lado * (0.05 + Math.random() * 0.06), vy: -0.09,
        vida: 0, duracion: 750,
      });
    }
  }
  if (bebe.estado === 'satisfecho' && bebe.ultimaParticula > B.INTERVALO_CORAZON_MS) {
    bebe.ultimaParticula = 0;
    bebe.corazones.push({
      x: bebe.x + (Math.random() - 0.5) * R * 1.2, y: bebe.y - R * 1.2,
      vx: (Math.random() - 0.5) * 0.03, vy: -0.05,
      vida: 0, duracion: 1400,
      tamano: 12 + Math.random() * 6,
    });
  }

  for (const p of bebe.lagrimas) {
    p.vy += 0.0014 * dtMs;
    p.x += p.vx * dtMs;
    p.y += p.vy * dtMs;
    p.vida += dtMs;
  }
  for (const p of bebe.corazones) {
    p.x += p.vx * dtMs + Math.sin((p.vida + p.y) * 0.01) * 0.35;
    p.y += p.vy * dtMs;
    p.vida += dtMs;
  }
  bebe.lagrimas = bebe.lagrimas.filter((p) => p.vida < p.duracion);
  bebe.corazones = bebe.corazones.filter((p) => p.vida < p.duracion);
}

function distanciaPuntoSegmento(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / largo2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function suavizar(k) {
  return 1 - Math.pow(1 - k, 3);
}

function diferenciaAngular(a, b) {
  const d = (b - a) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
}

const PIEL = [255, 218, 192];
const PIEL_RUBOR = [255, 140, 145];

function dibujarBebe(bebe) {
  const R = CONFIG_BEBE.RADIO_CABEZA;
  const t = bebe.tiempoTotal;
  const estado = bebe.estado;
  const temblor = estado === 'llorando' ? Math.sin(t * 0.07) * 1.8 : 0;
  const respiro = estado === 'satisfecho' ? Math.sin(t * 0.005) * 2.5 : Math.sin(t * 0.003) * 1.2;

  let cerca = false;
  let targetX = 0, targetY = -1;
  const biberon = Fisica.obtenerCuerpoPrincipal();
  if (biberon && estado === 'llorando') {
    const d = Math.hypot(biberon.position.x - bebe.x, biberon.position.y - bebe.y);
    if (d < 220) {
      cerca = true;
    }
    const ang = Math.atan2(biberon.position.y - bebe.y, biberon.position.x - bebe.x);
    targetX = Math.cos(ang) * 4;
    targetY = Math.sin(ang) * 4;
  }

  push();
  translate(bebe.x + temblor, bebe.y + respiro);
  noStroke();

  // Sombra suave proyectada en el suelo
  fill(0, 0, 0, 50);
  ellipse(0, R * 2.1, R * 2.4, R * 0.5);

  // Cuerpo con pijama turquesa brillante
  fill(45, 175, 215);
  ellipse(0, R * 1.3, R * 1.85, R * 1.4);

  // Babero decorativo blanco con borde amarillo
  fill(255, 255, 255, 230);
  arc(0, R * 0.85, R * 1.3, R * 1.1, 0, PI);
  stroke(255, 210, 50);
  strokeWeight(2.5);
  noFill();
  arc(0, R * 0.85, R * 1.3, R * 1.1, 0, PI);
  noStroke();

  // Pies del pijama
  fill(...PIEL);
  ellipse(-R * 0.48, R * 1.95, R * 0.52, R * 0.35);
  ellipse(R * 0.48, R * 1.95, R * 0.52, R * 0.35);

  // Manos a los lados
  if (estado !== 'comiendo') {
    const agita = cerca ? Math.sin(t * 0.035) * R * 0.4 : (estado === 'llorando' ? Math.sin(t * 0.02) * R * 0.22 : 0);
    fill(...PIEL);
    circle(-R * 1.0, R * 0.95 - agita, R * 0.45);
    circle(R * 1.0, R * 0.95 + agita, R * 0.45);
  }

  // Orejas
  fill(...PIEL);
  circle(-R * 0.98, 0, R * 0.45);
  circle(R * 0.98, 0, R * 0.45);
  fill(...PIEL_RUBOR, 120);
  circle(-R * 0.98, 0, R * 0.25);
  circle(R * 0.98, 0, R * 0.25);

  // Cabeza
  fill(...PIEL);
  circle(0, 0, 2 * R);

  // Brillo superior en la cabeza
  fill(255, 255, 255, 70);
  ellipse(0, -R * 0.45, R * 1.2, R * 0.5);

  // Rulo de pelo castaño
  stroke(130, 85, 45);
  strokeWeight(3.5);
  noFill();
  arc(0, -R * 0.95, R * 0.4, R * 0.4, PI * 0.85, PI * 2.3);

  if (cerca && estado === 'llorando') {
    dibujarCaraAnsiosa(R, targetX, targetY);
  } else if (estado === 'llorando') {
    dibujarCaraLlorando(R, t);
  } else if (estado === 'comiendo') {
    dibujarCaraComiendo(R, succionBebe(bebe));
  } else {
    dibujarCaraFeliz(R);
  }
  pop();

  dibujarParticulasBebe(bebe);
}

function dibujarCaraAnsiosa(R, tx, ty) {
  // Ojos gigantes de caricatura con brillo
  noStroke();
  fill(255);
  circle(-R * 0.4, -R * 0.15, R * 0.58);
  circle(R * 0.4, -R * 0.15, R * 0.58);

  fill(30, 85, 145);
  circle(-R * 0.4 + tx, -R * 0.15 + ty, R * 0.36);
  circle(R * 0.4 + tx, -R * 0.15 + ty, R * 0.36);

  fill(20, 25, 35);
  circle(-R * 0.4 + tx, -R * 0.15 + ty, R * 0.24);
  circle(R * 0.4 + tx, -R * 0.15 + ty, R * 0.24);

  fill(255);
  circle(-R * 0.4 + tx - 3, -R * 0.15 + ty - 3, R * 0.12);
  circle(R * 0.4 + tx - 3, -R * 0.15 + ty - 3, R * 0.12);
  circle(-R * 0.4 + tx + 2, -R * 0.15 + ty + 2, R * 0.06);
  circle(R * 0.4 + tx + 2, -R * 0.15 + ty + 2, R * 0.06);

  // Rubor
  fill(...PIEL_RUBOR, 140);
  circle(-R * 0.65, R * 0.22, R * 0.3);
  circle(R * 0.65, R * 0.22, R * 0.3);

  // Boca abierta con lengua feliz
  fill(170, 45, 60);
  ellipse(0, R * 0.45, R * 0.7, R * 0.6);
  fill(255, 140, 160);
  arc(0, R * 0.62, R * 0.5, R * 0.35, PI, TWO_PI);
}

function dibujarCaraLlorando(R, t) {
  stroke(95, 55, 40);
  strokeWeight(3);
  line(-R * 0.6, -R * 0.25, -R * 0.3, -R * 0.1);
  line(-R * 0.6, 0, -R * 0.3, -R * 0.1);
  line(R * 0.6, -R * 0.25, R * 0.3, -R * 0.1);
  line(R * 0.6, 0, R * 0.3, -R * 0.1);

  // Cejas caídas
  line(-R * 0.65, -R * 0.42, -R * 0.35, -R * 0.32);
  line(R * 0.65, -R * 0.42, R * 0.35, -R * 0.32);

  // Boca berreando
  noStroke();
  fill(160, 40, 55);
  const abre = R * (0.45 + 0.1 * Math.sin(t * 0.025));
  ellipse(0, R * 0.45, R * 0.65, abre);
  fill(245, 125, 145);
  ellipse(0, R * 0.45 + abre * 0.25, R * 0.4, abre * 0.35);

  // Rubor
  fill(...PIEL_RUBOR, 120);
  circle(-R * 0.62, R * 0.2, R * 0.28);
  circle(R * 0.62, R * 0.2, R * 0.28);
}

function dibujarCaraComiendo(R, succion) {
  stroke(95, 55, 40);
  strokeWeight(3);
  noFill();
  arc(-R * 0.4, -R * 0.15, R * 0.38, R * 0.25, 0, PI);
  arc(R * 0.4, -R * 0.15, R * 0.38, R * 0.25, 0, PI);

  noStroke();
  fill(...PIEL_RUBOR, 160);
  const m = R * (0.34 + 0.1 * succion);
  circle(-R * 0.58, R * 0.25, m);
  circle(R * 0.58, R * 0.25, m);

  fill(160, 40, 55);
  circle(0, R * 0.42, R * (0.3 - 0.06 * succion));
}

function dibujarCaraFeliz(R) {
  stroke(95, 55, 40);
  strokeWeight(3);
  noFill();
  arc(-R * 0.4, -R * 0.08, R * 0.38, R * 0.32, PI, TWO_PI);
  arc(R * 0.4, -R * 0.08, R * 0.38, R * 0.32, PI, TWO_PI);

  // Gran sonrisa
  arc(0, R * 0.28, R * 0.65, R * 0.5, 0.1 * PI, 0.9 * PI);

  noStroke();
  fill(...PIEL_RUBOR, 170);
  circle(-R * 0.62, R * 0.24, R * 0.34);
  circle(R * 0.62, R * 0.24, R * 0.34);
}

function dibujarManosBebe(bebe, pose) {
  if (!pose || pose.alfa < 128) return;
  const ancho = Fisica.config.ANCHO_BIBERON;
  const R = CONFIG_BEBE.RADIO_CABEZA;
  push();
  translate(pose.x, pose.y);
  rotate(pose.angulo);
  stroke(230, 180, 150);
  strokeWeight(1.5);
  fill(...PIEL);
  circle(-ancho * 0.55, 0, R * 0.44);
  circle(ancho * 0.55, -4, R * 0.44);
  pop();
}

function dibujarParticulasBebe(bebe) {
  noStroke();
  for (const p of bebe.lagrimas) {
    fill(90, 200, 255, 230 * (1 - p.vida / p.duracion));
    ellipse(p.x, p.y, 7, 10);
  }
  for (const p of bebe.corazones) {
    const a = 255 * (1 - p.vida / p.duracion);
    fill(255, 80, 120, a);
    push();
    translate(p.x, p.y);
    const sz = p.tamano || 14;
    circle(-sz * 0.22, 0, sz * 0.5);
    circle(sz * 0.22, 0, sz * 0.5);
    triangle(-sz * 0.45, sz * 0.1, sz * 0.45, sz * 0.1, 0, sz * 0.6);
    pop();
  }
}
