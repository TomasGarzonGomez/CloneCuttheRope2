const NIVELES = [
  {
    id: 1,
    nombre: "Primeros Pasos",
    descripcion: "Corta las dos cuerdas para alimentar al bebé.",
    biberon: { x: 400, y: 220 },
    cuerdas: [
      { anclaje: { x: 280, y: 80 }, longitud: 200, nodos: 12 },
      { anclaje: { x: 520, y: 80 }, longitud: 200, nodos: 12 },
    ],
    bebe: { x: 400, y: 515 },
    estrellas: [
      { x: 400, y: 330 },
      { x: 400, y: 395 },
      { x: 400, y: 455 },
    ],
    burbujas: [],
    obstaculos: [],
    cojines: [],
  },

  {
    id: 2,
    nombre: "El Péndulo",
    descripcion: "Corta la cuerda izquierda para iniciar el balanceo y suelta en la cumbre.",
    biberon: { x: 230, y: 240 },
    cuerdas: [
      { anclaje: { x: 430, y: 70 }, longitud: 280, nodos: 14 },
      { anclaje: { x: 140, y: 150 }, longitud: 150, nodos: 10 },
    ],
    bebe: { x: 580, y: 460 },
    estrellas: [
      { x: 320, y: 360 },
      { x: 440, y: 382 },
      { x: 520, y: 370 },
    ],
    burbujas: [],
    obstaculos: [],
    cojines: [],
  },

  {
    id: 3,
    nombre: "Vuelo en Burbuja",
    descripcion: "Entra a la burbuja, acércate al fuelle para impulsarte y revienta la burbuja sobre el bebé.",
    biberon: { x: 200, y: 220 },
    cuerdas: [
      { anclaje: { x: 200, y: 100 }, longitud: 120, nodos: 8 },
    ],
    bebe: { x: 600, y: 480 },
    estrellas: [
      { x: 200, y: 340 },
      { x: 400, y: 220 },
      { x: 590, y: 200 },
    ],
    burbujas: [
      { x: 200, y: 340, radio: 40 },
    ],
    obstaculos: [
      { tipo: 'pincho', x: 200, y: 550, ancho: 140, alto: 30 },
    ],
    cojines: [
      { x: 120, y: 260, angulo: 0, fuerza: 4.6 },
    ],
  },

  {
    id: 4,
    nombre: "Péndulo y Espinas",
    descripcion: "Corta la cuerda izquierda para cruzar sobre los pinchos y suelta la segunda cuerda hacia el bebé.",
    biberon: { x: 320, y: 220 },
    cuerdas: [
      { anclaje: { x: 180, y: 120 }, longitud: 170, nodos: 9 },
      { anclaje: { x: 480, y: 100 }, longitud: 220, nodos: 11 },
    ],
    bebe: { x: 530, y: 470 },
    estrellas: [
      { x: 345, y: 330 },
      { x: 415, y: 345 },
      { x: 480, y: 385 },
    ],
    burbujas: [],
    obstaculos: [
      { tipo: 'pincho', x: 260, y: 550, ancho: 220, alto: 32 },
    ],
    cojines: [],
  },

  {
    id: 5,
    nombre: "El Gran Desafío",
    descripcion: "Usa las cuerdas, flota en la burbuja sobre los pinchos y usa el fuelle de aire.",
    biberon: { x: 240, y: 210 },
    cuerdas: [
      { anclaje: { x: 160, y: 90 }, longitud: 150, nodos: 9 },
      { anclaje: { x: 340, y: 90 }, longitud: 150, nodos: 9 },
    ],
    bebe: { x: 650, y: 490 },
    estrellas: [
      { x: 240, y: 340 },
      { x: 410, y: 210 },
      { x: 560, y: 320 },
    ],
    burbujas: [
      { x: 240, y: 340, radio: 40 },
    ],
    obstaculos: [
      { tipo: 'pincho', x: 400, y: 480, ancho: 180, alto: 30 },
      { tipo: 'plataforma', x: 560, y: 410, ancho: 160, alto: 16, angulo: 0.25, rebote: 0.35 },
    ],
    cojines: [
      { x: 150, y: 280, angulo: 0, fuerza: 4.8 },
    ],
  },
];
