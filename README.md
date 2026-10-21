# Clon de Cut the Rope

Juego 2D jugable inspirado en *Cut the Rope*, desarrollado con **Matter.js** (simulación física) y **p5.js** (renderizado y bucle de juego). El jugador maneja un biberón que cuelga de cuerdas, debe cortarlas en el momento justo para recolectar las tres estrellas doradas de cada nivel y alimentar al bebé.

Funciona **100% sin conexión** gracias a las librerías incluidas en `libs/`. El lienzo se adapta automáticamente al tamaño de la pantalla del jugador.

---

## Como Ejecutarlo

No requiere Node.js, compilacion ni conexion a internet. Solo un navegador moderno (Chrome, Edge o Firefox).

1. Abre la carpeta del proyecto en cualquier editor con soporte para servidor local (se recomienda **Visual Studio Code** con la extension **Live Server**).
2. Haz clic derecho en `index.html` y selecciona **Open with Live Server**, o abrelo directamente en el navegador (doble clic sobre `index.html`).
3. El lienzo escala automaticamente para ocupar toda la ventana.

> **Importante:** la carpeta `libs/` debe contener `matter.min.js` y `p5.min.js`. Esta carpeta esta excluida en `.gitignore`, asi que si clonaste el repositorio y no existe, consulta la seccion [Librerias](#librerias).

### Ejecucion en Local

Ejecutar mediante cualquier servidor local:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

Abrir `http://localhost:8000` en el navegador.

---

## Controles

| Accion | Control |
|---|---|
| Cortar cuerdas | Clic izquierdo y arrastrar sobre la cuerda |
| Reventar burbuja | Clic sobre la burbuja o trazar un corte sobre ella |
| Activar fuelle de aire | Clic sobre el cojin de aire |
| Reiniciar nivel | Boton de reinicio en el HUD o tecla R |
| Ir al selector de niveles | Boton de niveles en el HUD |
| Volver al menu principal | Tecla Escape |
| Silenciar / activar sonido | Boton de audio en el HUD o tecla M |

---

## Estructura del Proyecto

```
CloneCuttheRope/
├── index.html      Punto de entrada: configura el lienzo responsive y carga los scripts.
├── libs/
│   ├── matter.min.js   Motor de fisica (Matter.js 0.20.0), incluido para uso offline.
│   └── p5.min.js       Libreria de graficos y bucle de juego (p5.js 1.11.3), offline.
├── fisica.js       Motor fisico: mundo, cuerdas segmentadas, corte y fuerzas.
├── bebe.js         Personaje objetivo: expresiones, mirada reactiva y animacion de toma.
├── sonidos.js      Sintetizador Web Audio API: cortes, estrellas, burbuja, fuelle y UI.
├── niveles.js      Definicion de los 5 niveles: coordenadas, cuerdas, obstaculos y mecanicas.
├── sketch.js       Bucle principal: maquina de estados, renderizado y logica de juego.
├── .gitignore      Excluye libs/, configuracion de VS Code y archivos del sistema.
└── README.md       Este archivo.
```

---

## Motor Fisico

El modulo `fisica.js` encapsula toda la simulacion y expone una API publica al resto del juego. Los parametros clave son:

| Parametro | Valor | Descripcion |
|---|---|---|
| Gravedad | Y = 1, escala = 0.001 | Gravedad estandar de Matter.js |
| Masa del biberon | 3 | Determina inercia y respuesta a fuerzas |
| Friccion de aire | 0.004 | Amortiguacion pasiva del movimiento |
| Rebote | 0.3 | Coeficiente de restitucion en colisiones |
| Paso fisico | 1000 / 60 ms | Simulacion determinista a 60 Hz |
| Max pasos por frame | 4 | Evita espiral de muerte en frames lentos |
| Iteraciones (posicion / velocidad / restriccion) | 8 / 6 / 12 | Precision del solver de Matter.js |
| Rigidez de cuerdas | 1.0 | Restricciones inextensibles |
| Amortiguacion de cuerdas | 0.05 | Reduce vibracion de los nodos |
| Masa por nodo de cuerda | 0.1 | Nodos livianos para que la cuerda no arrastre al biberon |
| Limite inferior | Alto del canvas + 80 px | Por debajo de esta altura el biberon se da por perdido |

### Cuerdas

Cada cuerda es una cadena de nodos rigidos conectados por restricciones de distancia fija. El corte se detecta calculando la interseccion geometrica entre el trazo del mouse y cada segmento de la cadena. Al cortar, la restriccion se desactiva y los nodos quedan libres.

Las cuerdas solo trabajan a **tension**: cuando un segmento queda mas corto que el 98 % de su longitud de reposo, su rigidez se anula temporalmente para que la cuerda se doble como una cuerda real en lugar de comportarse como una varilla.

### Burbujas

Cuando el biberon entra en contacto con una burbuja, la gravedad del cuerpo se contrarresta exactamente aplicando una fuerza igual a `masa x gravedad x escala` en cada paso fisico (via el evento `beforeUpdate` de Matter.js). Adicionalmente se fija una velocidad de ascenso constante de 1.5 px/paso. La velocidad horizontal se preserva con una amortiguacion minima (factor 0.995 por frame) para que el impulso del fuelle se mantenga durante el vuelo.

### Fuelles de Aire

Al activar un fuelle, se aplica un impulso unico al biberon. El impulso solo actua si el biberon esta dentro de un radio de 175 px y dentro de un cono de aprox. ±49 grados (0.85 rad) alrededor de la direccion del fuelle. La magnitud se atenua con la distancia.

---

## Mecanicas de Juego

- **Estrellas:** Hay 3 por nivel. Se recogen al pasar el biberon o su tetina por encima. Cada una emite una nota musical diferente. El progreso de estrellas se guarda por nivel en `localStorage`.
- **Burbujas:** Atrapan el biberon y lo elevan. Se pueden explotar haciendo clic o trazando un corte sobre ellas.
- **Fuelles de Aire:** Empujan el biberon (o la burbuja con el biberon dentro) horizontalmente. Solo funcionan si el biberon esta lo suficientemente cerca y alineado.
- **Pinchos:** Destruyen el biberon al contacto. Terminan el nivel en derrota.
- **Plataformas:** Cuerpos estaticos inclinados con rebote y friccion configurables. Desvian el biberon.
- **Perdida por salida de pantalla:** Si el biberon sale de los limites del canvas (cualquier direccion), el nivel termina en derrota.

---

## El Bebe

El modulo `bebe.js` controla al personaje objetivo. Detecta la captura comprobando si la tetina del biberon paso a menos de 55 px de la cabeza durante el ultimo frame (distancia punto-segmento), de modo que no se "salta" al bebe aunque el biberon caiga muy rapido.

| Estado | Comportamiento |
|---|---|
| Llorando | Estado inicial. Llora, tiembla y suelta lagrimas. |
| Ansioso | Cuando el biberon esta a menos de 220 px: ojos grandes que siguen al biberon y agita las manos. |
| Comiendo | El biberon se acomoda en la boca (280 ms), se vacia (1600 ms) y desaparece (350 ms). |
| Satisfecho | Sonrie y suelta corazones. Dispara la pantalla de nivel completado. |

---

## Estados del Juego

```
MENU  ->  SELECTOR  ->  JUGANDO  ->  NIVEL_SUPERADO  ->  siguiente nivel o MENU
  |                              ->  GAME_OVER       ->  reintentar o SELECTOR
  └──>  AYUDA  ->  MENU
```

La tecla Escape regresa al `MENU` desde cualquier estado.

El progreso (nivel desbloqueado y estrellas por nivel) se persiste en `localStorage` bajo la clave `cut_the_rope_progreso_v2`.

---

## Los 5 Niveles

| Nivel | Nombre | Mecanicas principales |
|---|---|---|
| 1 | Primeros Pasos | Dos cuerdas simetricas. Introduccion al corte basico y caida directa a traves de las estrellas. |
| 2 | El Pendulo | Movimiento pendular. Cortar la cuerda lateral genera un balanceo que recorre las estrellas y lanza el biberon hacia el bebe. |
| 3 | Vuelo en Burbuja | La burbuja eleva el biberon. El jugador usa el fuelle para desplazarlo horizontalmente, recoge las estrellas en vuelo y explota la burbuja sobre el bebe. |
| 4 | Pendulo y Espinas | Dos cuerdas y una barrera de pinchos en el suelo. Hay que cruzar sobre los pinchos usando el balanceo del pendulo. |
| 5 | El Gran Desafio | Combina cuerdas multiples, ascenso en burbuja sobre pinchos, uso del fuelle de aire y una plataforma inclinada de rebote. |

---

## Audio

El sonido se genera en tiempo real con la **Web Audio API**, sin archivos externos. El contexto de audio se desbloquea automaticamente en el primer evento de usuario (clic, toque o tecla). Cada accion tiene un sonido disenado:

| Evento | Tipo de onda | Efecto |
|---|---|---|
| Corte de cuerda | Triangle | Sweep descendente rapido |
| Estrella recolectada | Sine | Nota ascendente segun numero de estrella |
| Burbuja: entrar | Sine | Sweep ascendente suave |
| Burbuja: explotar | Triangle | Pop descendente corto |
| Fuelle de aire | Triangle | Soplido grave corto |
| Bebe come | Sine | Arpegio rapido de 4 notas |
| Nivel completado | Triangle | Arpegio ascendente de 4 notas |
| Derrota | Sawtooth | Descenso grave |
| Pinchos | Square | Impacto bajo |
| Boton UI | Sine | Tick corto agudo |

---

## Librerias

El juego usa dos librerias que se cargan desde `libs/` para funcionar sin conexion. Si la carpeta no existe (por ejemplo, al clonar el repositorio), crea `libs/` y descarga ahi estos archivos con exactamente estos nombres:

| Archivo | Version | Descarga |
|---|---|---|
| `libs/matter.min.js` | 0.20.0 | https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js |
| `libs/p5.min.js` | 1.11.3 | https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js |

---

## Solucion de Problemas

| Problema | Solucion |
|---|---|
| Pantalla en blanco | Abre la consola del navegador (F12). Si aparece `Matter is not defined` o `setup is not defined`, faltan los archivos de `libs/`. |
| No hay sonido | El navegador bloquea el audio hasta la primera interaccion: haz clic en cualquier parte. Verifica tambien que no este silenciado (tecla M). |
| Reiniciar el progreso | En la consola del navegador ejecuta `localStorage.removeItem('cut_the_rope_progreso_v2')` y recarga la pagina. |
