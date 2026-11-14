# ¡La Pista de Patrones de Huellas y Ritmo!

Polimotor · Transición (5-6 años) · Juegos de memoria corporal · **juego 3**
Carpeta: `public/catalogo_juegos/Polimotor/PistaPatronesHuellas/`
Slug: `pista-patrones-huellas-ritmo` (ambiente 7, eje 11 *Conocimiento y control corporal*, temática 31, módulo 9, orden 22)

Memoria corporal, lateralidad, orientación espacial y coordinación visomotora: la pista enciende una secuencia
de cuatro huellas y el niño la repite tocando las plataformas **en el mismo orden**. Con cada acierto Zeus hace
la huella y avanza por el circuito hasta la meta.

No confundir con `PistaRitmoPasosMagicos` (3-4 años, seis baldosas musicales), que sigue intacto.

## Escenario 3D

Una sola escena three.js (`aula-pista.js`) con una sola cámara, para que la perspectiva cuadre:

- **Aula de Polimotor simulada** con geometría sencilla: piso de duela de madera (antes damero gris, que parecía un PNG transparente), pared del fondo con franja de neón (sin letrero:
  el usuario lo quitó), paredes de escalada con presas (InstancedMesh), espalderas, aros, colchonetas, piscina
  de pelotas, túnel y rampa. **No** se carga `intro3d/models/aulas/polimotor.glb`: el usuario pidió no usarlo
  porque pesa (2026-11-14); solo simularlo.
- **Pista** sobre el piso: colchoneta de 11,6 × 14,2 que va de delante hasta casi la pared del fondo (pedido del
  usuario), plataformas como bloques con la huella y el nombre en la textura de la tapa, carril de Zeus con tramos
  de color por ronda y un hito por ítem, línea de SALIDA, arco de META junto a la pared, conos y dos vallas.
- **Zeus** (GLB compartido `SimonDiceCorporal/zeus_animado_suave.glb`) dentro de la misma escena, caminando por
  el carril. Solo clips del modelo.
- Toques por raycasting sobre las plataformas (ratón y dedo); hay botones ocultos para teclado y, sin WebGL, se
  muestran como respaldo (`body.sin-3d`).
- Cámara con inclinación fija (50°, más desde arriba para dar profundidad a la sala) que se encuadra sola en el hueco bajo la cabecera y la fila de progreso.
- Los efectos Phaser, las flechas de luz, la mano tutorial y la estrella usan `AulaPista.rect(id)` /
  `zeus.punto()` (proyección de la escena a pantalla).

Historia: primero fue un suelo CSS 3D sobre un fondo SVG (la perspectiva no cuadraba), luego el aula GLB de la
intro (descartada por peso) y al final el aula simulada.

## Las cinco huellas

| id | nombre | color | sonido | clip de Zeus | lugar en la pista |
|----|--------|-------|--------|--------------|-------------------|
| `manoIzquierda` | MANO IZQUIERDA | naranja `#f76707` | palmada ¡PLAF! | `Levantar_brazo_izquierdo` | fondo, izquierda |
| `manoDerecha` | MANO DERECHA | rojo `#e03131` | campana ¡TING! | `Levantar_brazo_derecho` | fondo, derecha |
| `pieIzquierdo` | PIE IZQUIERDO | azul `#228be6` | tambor ¡BUM! | `Levantar_pie_izquierdo` | delante, izquierda |
| `pieDerecho` | PIE DERECHO | gris azulado `#5f7d95` | bloque ¡TOC! | `Levantar_pie_derecho` | delante, derecha |
| `ambosPies` | AMBOS PIES | verde `#2f9e44` | salto ¡PUM! | `Saltar` (+ vuelo por código) | delante de la salida, centro |

Los dibujos (`iconos.js`) se hacen una vez por par: la huella izquierda es el **reflejo exacto** de la derecha,
así el lado solo se distingue por la orientación.

**Lateralidad de Zeus**: al hacer una huella Zeus se gira **de espaldas** al niño (mirando a la meta), así su
mano izquierda queda a la izquierda de la pantalla. Para hablar y celebrar se gira de frente.

Otros clips usados: `Caminar` (avanzar), `Celebrar` / `Porra_con_pompones` / `Bailar` (aciertos y meta),
`Saludar`, `Senalar`, `Pensar` (error), `Hablar`, `Quieto`.

## Rondas

Tres rondas de **tres** secuencias de **cuatro huellas** — 9 actividades, 36 pasos de Zeus. (Al principio eran
cuatro secuencias por ronda; el usuario pidió bajar a tres el 2026-11-14.)

| ronda | nombre | msBaldosa | pausaMs | apoyo | nombra | regla extra |
|-------|--------|-----------|---------|-------|--------|-------------|
| 1 | Reconocimiento | 1150 | 820 | alto | sí | mezcla manos y pies |
| 2 | Lateralidad | 980 | 640 | medio | sí | + combina derecha e izquierda |
| 3 | Memoria corporal | 860 | 520 | bajo | no | + combina derecha e izquierda |

Generador (`reglas.js`): la misma huella nunca dos veces seguidas, al menos tres huellas distintas, nunca dos
secuencias seguidas iguales ni repetidas en una ronda, el primer ítem no repite la demo y las cinco huellas se
reparten. Las secuencias se construyen ya válidas (no por sorteo ciego).

## Cabecera e interacción

Una sola fila (pedido del usuario, 2026-11-14): ronda y estrellas a la izquierda, los **cajones del patrón**
centrados arriba e Inicio y reiniciar a la derecha. Sin título, sin barra 0/9, sin botón de fase ni pasos
"observa/repite": la fase se nota por el marco de los cajones (dorado = mira, verde = repite). El `#fase` sigue en
el DOM, oculto, porque `fase()` lo usa. Botones con brillo, rebote al pasar y hundimiento al pulsar.
Apoyos de juego: mientras se muestra la secuencia las plataformas no encendidas se oscurecen (foco); en el turno
las plataformas "respiran" con su color, se elevan al pasar el ratón y sueltan una onda al tocarlas; la ranura
del paso que toca late en dorado (dice cuánto falta, no cuál huella). Al completar un ítem una estrella vuela de
Zeus a su hueco del progreso, y si salió sin errores aparece la medalla "¡PERFECTO!".

## Flujo

Inicio → intro 3D compartida → `PedniaEdad` → **introducción** (título, Zeus en la salida da la bienvenida y
presenta las cinco plataformas haciendo cada huella) → **demo automática sin botón** (`pieIzquierdo →
manoDerecha → ambosPies`; la mano de `PedniaTutorial` toca las plataformas y Zeus avanza; luego vuelve a la
salida) → *¡AHORA ES TU TURNO!* → 3 rondas → **victoria**: Zeus cruza la meta, todas las plataformas se
encienden, confeti, fanfarria, *¡ESPECTACULAR!…* y la tarjeta con VOLVER A JUGAR / MENÚ / CONTINUAR.

Cada ítem: OBSERVAR (plataformas bloqueadas; se encienden con luz, sonido, flecha de luz desde la anterior y Zeus
haciendo la huella) → REPETIR (comprobación **inmediata** por toque) → celebración y siguiente ítem.

- Toque correcto: la plataforma sube y brilla con anillos de energía, suena, su ranura se llena, Zeus hace la
  huella y avanza un paso (cola de acciones para que no se pisen si el niño toca rápido).
- Toque equivocado: la plataforma rebota en gris con un "boing" amable, Zeus piensa y se queda; **no se pierde
  nada** y el niño reintenta el mismo paso. Tras 3 errores en el ítem (`juego.erroresParaRepetir`) la pista
  vuelve a mostrar la misma secuencia con apoyo alto y Zeus regresa al inicio del ítem.
- Ayuda por tiempo: todas las plataformas se menean (no revela cuál toca).
- Cada ítem acertado enciende su hito dorado en el carril; cada ronda aviva su tramo de color.

## Pruebas

`node scripts/probar-pista-patrones-huellas.js` — reglas, config y textos literales del enunciado.
En el servidor estático (`juegos-huellas`, puerto 8025) las voces dan 404 en `/juegos/tts` porque ese servicio
es de Laravel; es normal.
