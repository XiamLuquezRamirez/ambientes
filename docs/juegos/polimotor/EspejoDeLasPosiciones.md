# El Espejo de las Posiciones y Lateralidad (`public/catalogo_juegos/Polimotor/EspejoDeLasPosiciones/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (noviembre de 2026), Transición 5-6 años. Zeus hace una postura en un espejo (izquierda); el niño
la arma en la silueta (centro) con 6 piezas articuladas de la bandeja (derecha). No usa `script.js` monolítico:
cada responsabilidad va en su archivo y expone un global.

| Archivo | Global | Qué hace |
|---|---|---|
| `postura.js` | `Postura` | Reglas puras (sin DOM, también `module.exports`): esqueleto, ángulos, validación, pasos, textos. |
| `img/*.svg` | — | Las 6 piezas de Zeus (cabeza, tronco, brazos y piernas). Se generan con `node scripts/generar-svg-espejo-posiciones.js`; no editarlas a mano. |
| `muneco.js` | `Muneco` | Lee `img/*.svg` y arma el dibujo articulado (modelo, figura, fichas, fantasma, silueta). Subir `VERSION_SVG` al regenerar las piezas. |
| `animaciones.js` | `EspejoAnim` | Tweens de ángulos, `realizar` (la figura "hace" la postura) y `rutina` final. |
| `articulaciones.js` | `Articulaciones` | Taller de giro: flechas del hombro/cadera (azul) y codo/rodilla (naranja). |
| `arrastre.js` | `Arrastre` | Arrastre con Pointer Events, encaje y regreso suave. |
| `estudio.js/.css` | `Estudio` | Estudio de danza SVG (espejos dobles, focos, barra, piso acolchado) y reacciones. |
| `estudio-phaser.js` | `EstudioPhaser` | Escena Phaser 4: motas de luz, haces que reaccionan y destellos. |
| `demo.js` | `EspejoDemo` | Demo automática con `PedniaTutorial.correr` y la mano compartida. |
| `script.js` | — | Flujo: intro 3D, edad, rondas, pasos, feedback, final y victoria. |

- **Ángulos anatómicos** `{a, b}`: `a` = abducción del hombro/cadera (0 abajo, 90 horizontal afuera, 180 arriba),
  `b` = flexión del codo/rodilla relativa al segmento de arriba. El personaje mira al niño: su izquierda se ve a la
  derecha, y el giro en pantalla es `lado × ángulo` (der = +1, izq = −1). Así el mismo número es un espejo en cada
  lado y la lateralidad queda en la regla, no en los datos.
- **Posturas en `config.json → etapas[].posturas[]`**: 3 niveles con 5 posturas cada uno (15). Cada partida juega
  siempre 3: **una al azar de cada nivel** (`armarRondas()` en `script.js`), y para cada una sortea el modelo entre
  `juego.personajes` (Zeus o Zoe), salvo que la postura fije `"personaje"`.
  (`textos.paso` y `textos.titulosPaso` necesitan la clave del grupo, p. ej. `brazo_der_pierna_izq`).
  Opciones de nivel: `flexion` (codo/rodilla), `pistaFlexion` (solo muestra la flecha naranja si hace falta),
  `resaltarPieza` (ficha y articulación pedidas brillan) y `etiquetas` (texto en las fichas).
- **Validación** (`Postura.evaluarSoltado`): `encaje`, `orientacion` (articulación correcta, giro distinto),
  `lado` (articulación del otro lado: Zeus pregunta "¿Dónde está tu brazo izquierdo?"), `lugar` y `nada`.
  Tolerancias en `juego.toleranciaGrados` (22°) y `toleranciaFlexion` (32°); el paso de giro es 30°, así que los
  ángulos de las posturas deben ser múltiplos de 30 (lo comprueba la prueba de node).
  Si la pieza ya está orientada el radio de encaje crece (`radioEncajeOrientada`). Tras `fallosPista` intentos
  aparece una sombra punteada con la orientación correcta.
- **Sin cortes en codos y rodillas**: cada extremidad se dibuja en dos pasadas iguales (`.m-contorno` con trazo
  grueso y `.m-relleno` encima). Los dos segmentos comparten el contorno de fondo y la unión no muestra línea.
- **Formato de las piezas** (`img/*.svg`): pivote en (0,0); formas de color con `class="m-piel|m-camiseta|…"` en
  `g.base` (son las que se engrosan como contorno) y adornos en `g.detalle`. Las extremidades traen `g#arriba[data-largo]`
  y `g#abajo`. La manga y la bota del short tienen tapa redonda en el pivote y los hombros de la camiseta terminan
  dentro de esa tapa: así no asoman esquinas al levantar el brazo o abrir la pierna.
- El modelo marca la pieza pedida con el contorno amarillo latiendo (`.m-resalte`), no con un halo borroso.
- Los puntos de las articulaciones (`.c-sockets`) se mueven al final del SVG de construcción, encima de las piezas:
  si quedan debajo, el tronco tapa hombros y caderas y el niño no ve dónde va la siguiente pieza.
- El personaje 3D de la demo (`#tutorial-3d`, compartido en `intro3d/css/intro.css` a la derecha) se sobreescribe
  solo en este juego: abajo a la izquierda, reflejado (`scaleX(-1)`) para que entre y salga por el borde izquierdo, y
  con alto `--tutorial-alto` calculado en `ajustarPersonajeDemo()` para pararse bajo los pies del modelo.
- **Pista de lateralidad visible**: pulsera y franja de la media en amarillo (izquierda) y verde (derecha), los
  mismos colores de Lateralidad; el pulgar mira al centro y la punta del zapato hacia afuera.
- Las fichas muestran la extremidad estirada; el giro se ve en el taller. Una ficha girada lleva un punto azul.
- Arranque único: `iniciarJuego()` tiene la guarda `partidaIniciada` (el selector de edad puede avisar dos veces).
- Si la intro 3D se omite, Zeus dice el desafío (`textos.desafio`) tras la presentación del estudio.
- Probar: `node scripts/probar-espejo-posiciones.js` (lógica y datos). En el navegador, con el truco de "Cómo probar
  rápido"; los arrastres se simulan con `PointerEvent` (`pointerdown` en la ficha o en `.t-pieza` del taller,
  `pointermove`/`pointerup` en `window`). `Arrastre.activo().offset` dice dónde soltar para que el pivote caiga en
  `Arrastre.socketPantalla(socket)`.
- Registro: fila en `database/ambientes.sql`
  (ambiente 7, eje 11, temática 30 "Juegos de lateralidad", módulo 9, orden 9, imagen `espejo.png`).
