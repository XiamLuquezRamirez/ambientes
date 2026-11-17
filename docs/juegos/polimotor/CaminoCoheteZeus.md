# ¡El Camino del Cohete de Zeus!

Polimotor · Prejardín (3-4 años) · Eje *Coordinación y orientación* · Temática 32 *Laberintos de coordinación*
Carpeta: `public/catalogo_juegos/Polimotor/CaminoCoheteZeus/`
Slug: `camino-cohete-zeus` (ambiente 7, eje 17, temática 32, módulo 9, orden 23, imagen `camino-cohete.png`, color `#4c6ef5`)

El niño pone el dedo sobre el cohete de Zeus y lo desliza por una pista de luz hasta la estación lunar. Cuatro
recorridos **generados al azar en cada partida**, con dificultad progresiva, caminos falsos cortos y un final
cinematográfico en la base espacial de Zeus.

## Pedidos del usuario (2026-11-17)

- Sin rama nueva en git.
- Los caminos falsos son **parte de la misma pista y se ven igual** que el camino correcto (no son trampas: son
  desvíos cortos; al llegar al fondo, señal amable y el cohete vuelve solo a la bifurcación sin perder avance).
- El fondo reacciona a lo que pasa; el cohete deja **estela de humo**, la **llama se mueve** y, quieto, **flota**.
- El niño puede **salirse un poco** de la pista, pero no del todo: mientras está fuera suena una alerta, la pista se
  pone **roja** y aparece un borde rojo en la pantalla. Más allá de la holgura el cohete queda detenido en el borde.
- El cohete se mueve en **todas las direcciones** (también hacia atrás).
- Intro y demo como en los demás juegos.
- Botones: accesibilidad y volumen abajo a la derecha; Inicio y reiniciar arriba a la derecha; **sin pastilla de
  edad**; indicador de nivel abajo a la izquierda; título centrado arriba y legible.
- No crear otro archivo SQL: solo la fila en `database/ambientes.sql` (la fila ya existía en la BD local).

Segunda ronda (2026-11-17):

- **Zeus no se dibuja** (ni SVG ni 3D ni el GIF): se quitó de la ventana del cohete, de la presentación y del final;
  solo se oye su voz. Zoe 3D sigue. (La intro 3D compartida del catálogo no se tocó.)
- El giro del cohete se veía plano (se aplastaba de arriba abajo): ahora **gira en 3D sobre su eje vertical**.
- Al llegar a la estación en cada nivel **se abren las compuertas y el cohete entra** al hangar (antes se encogía y
  desaparecía).

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasCohete` | Puro (`module.exports`). Generador con semilla y geometría del pilotaje. |
| `iconos.js` | `IconosCohete` | SVG originales: cohete (sin piloto), vista de frente del cohete, vidrio, llama, plataforma, estación con hangar, interior del hangar, persiana, compuerta, luna, base, 4 planetas, asteroide, estrella. |
| `sonidos.js` | `SonidosCohete` | Web Audio: motor que crece con la velocidad, campanitas de las luces, alerta, callejón, regreso, despegue, éxito, fanfarria, fuegos y la **música ambiental** (pad sintetizado que reemplaza `fondo.mp3`; TextoVoz le ajusta el volumen). |
| `escenario-phaser.js` | `EscenarioCohete` | Un lienzo Phaser a pantalla completa: fondo, pista, cohete, transiciones y final. |
| `arrastre.js` | `ArrastreCohete` | Ratón y dedo con el input de Phaser (solo el primer puntero; el cohete conserva el desfase con que se tomó). |
| `demo.js` | `CoheteDemo` | Estrella fugaz por el camino y luego la mano de `PedniaTutorial` lleva el cohete. |
| `guia-3d.js` | `Guia3D` | Zoe 3D (copia de `DondeLoUso`). |
| `script.js` | — | Flujo, voces, ayudas, alerta, callejones, transiciones, final y resumen. |
| `camino-cohete.png` | — | Icono 256 × 256 (inicio y catálogo). |

## Generador (reglas.js)

- El mundo tiene ancho fijo (1600; 1152 en tableta vertical) y alto según la pantalla (800-1500). Se divide en
  **celdas de 2,25 anchos de pista**: dos tramos vecinos nunca se rozan.
- Búsqueda en profundidad al azar de un camino de celdas de la plataforma (columna 0) a la estación (última
  columna, solo la meta), con `extra` celdas sobre el camino recto y `giros` dentro del rango del recorrido.
- La pista pasa por las celdas con **Bézier cuadráticas** (control = centro de la celda con un pequeño
  desplazamiento al azar): recta si sigue derecho, cuarto de curva si gira.
- **Caminos falsos**: celdas libres vecinas del camino (no al inicio ni en las 3 últimas celdas, sin tocarse entre
  sí); el ramal sale en "Y" inclinado hacia donde avanza el cohete y mide ≈ una celda.
- Validación final: dentro de la pantalla, sin cruces (tramos lejanos a ≥ 1,9 anchos), ramales lejos del camino,
  de la meta y del inicio. Si una pantalla tiene pocas celdas, respaldo: camino un poco más corto y, si hace falta,
  un ramal menos (el 4 queda en 2, que cumple "hasta 3").
- Los 4 recorridos usan una semilla por partida y el generador busca que cada uno sea más largo que el anterior.

| Recorrido | ancho | extra | giros | falsos |
|---|---|---|---|---|
| 1 Despegue espacial | 104 | 1-3 | 2-4 | 1 |
| 2 El camino de las estrellas | 98 | 3-5 | 4-6 | 2 |
| 3 El camino de los planetas | 94 | 5-8 | 5-9 | 2-3 |
| 4 El gran viaje a la base | 90 | 7-11 | 7-12 | 3 (2 en pantallas chicas) |

**Pilotaje** (`mover`): el cohete avanza a pasos de 12 unidades y se localiza **solo cerca de donde ya está** (no
puede saltar a otro tramo ni a la meta). Zonas: `pista` (≤ medio ancho), `fuera` (hasta medio ancho más
`holguraFuera`, alerta) y `limite` (queda detenido en el borde y no avanza). Si el dedo se aleja mucho más
(`alejarseParaRegresar` anchos durante `msFueraParaRegresar` ms) o se suelta fuera de la pista, el cohete vibra y
vuelve al último punto válido. El pilotaje corre con `setTimeout` (no depende de que el navegador pinte).

## Escena

- Fondo: degradado, 5 nebulosas, 3 capas de estrellas con paralaje y 4 planetas lejanos. **Reacciona**: las estrellas
  cerca del cohete brillan según el empuje, todo se desplaza un poco con el cohete, las nebulosas laten con cada
  luz y al completar, y se tiñen de rojo mientras el cohete está fuera. Estrellas fugaces de adorno.
- Pista: canvas 2D una vez por recorrido (sombra en el "suelo", costado en 3 tonos, neón, borde, superficie, brillo
  de tubo y guía de puntos). Copia **roja** encima que aparece con la alerta. Rastro dorado del avance.
- Luces cada ≈ 50 unidades en toda la red (iguales en camino y ramales); se encienden al pasar con campanita.
- Decoración en celdas libres (planetas, asteroides y estrellas; más en los recorridos altos). Plataforma de
  despegue al inicio; estación lunar sobre una luna en la meta.
- Cohete (contenedor): cuerpo, ventana con reflejos (sin piloto), llama doble que parpadea y se alarga con la
  velocidad, halo (rojo en la alerta), humo y estela de estrellas. Gira hacia donde se mueve, se "acuesta" en las
  curvas y flota cuando está quieto.
- **Giro 3D** (`actualizarCohete`): el cohete se ve siempre de perfil con la luz arriba. `mira` (0 derecha, 1
  izquierda, con margen `|cos| > 0,5`) fija el lado; `yaw` va de 0 a π: la escala horizontal es `cos(yaw)` (el
  perfil se angosta), cerca de π/2 aparece `ico-coheteFrente` (punta roja al centro) y luego se abre espejado hacia
  el otro lado. Si el cambio de lado ocurre yendo en vertical, la media vuelta de la rotación se hace de golpe justo
  en la vista de frente (`saltoPend`), así nunca se ve girar ni quedar de cabeza.
- **Estación con hangar**: `ico-estacion` tiene el hueco del hangar transparente (140 × 90 unidades, a la altura de
  la pista, empieza 0,1 anchos antes del final); debajo va `ico-hangar` (interior oscuro, profundidad 4) y encima dos
  `ico-persiana` (profundidad 6). La meta se cuenta cuando la punta llega a la persiana (`enMeta`: 0,72 anchos antes
  del final). `entrarEstacion(aviso)`: el cohete se acomoda frente a la compuerta, las persianas suben, el cohete
  baja a profundidad 4,6 (entre el interior y la estación) y entra volando, las persianas bajan. También en la demo.
  La rejilla deja 0,6 anchos extra a la derecha para que la estación quepa.

## Flujo

Inicio → intro 3D → `PedniaEdad` → presentación (título, Zoe entra, el cohete flota en la plataforma y se oye la
bienvenida de Zeus) → demo automática en una pista de muestra → Zoe sale → "¡Comenzar a
jugar!" → por recorrido: hiperespacio, la pista aparece con sus luces en ola, cartel con el nombre, el cohete baja a
la plataforma y se oye la instrucción → al llegar: luces doradas, estrella del indicador, se abren las compuertas y
el cohete entra al hangar, cartel del logro → … → final: la pista se ilumina, el cohete vuela a la base de Zeus con la cámara detrás, aterriza de
punta, se abren las compuertas, Zoe entra, fuegos artificiales y cartel arriba → **resumen**
con la miniatura real de cada camino y "¡JUGAR OTRA VEZ!" (4 recorridos nuevos, sin repetir presentación ni demo).

Ayuda gradual tras `ayudaMs` sin moverse: si no ha tocado el cohete, Zoe explica cómo arrastrarlo; luego
"¡Busca el camino que tiene más luces!" con las próximas luces del camino parpadeando; después una estrella fugaz
avanza un tramo corto. Tocar lejos del cohete lo hace brillar.

## Cómo probar

- `node scripts/probar-camino-cohete-zeus.js`: config, textos literales, 160 partidas en varios tamaños (cantidad
  de falsos según la tabla, sin cruces, ramales cortos, largo creciente), pilotaje (seguir la pista llega, atajar
  no, el ramal termina en callejón, la holgura tiene límite) y dibujos.
- Navegador: servidor `juegos-estatico` (8010). Con el panel oculto Phaser no pinta; avanzar a mano con
  `setInterval(() => __escenarioCohete.loop.step(performance.now()), 16)`. Arrastrar con `MouseEvent` en el canvas
  usando `EscenarioCohete.puntoCohete()` y `EscenarioCohete.aPantalla(x, y)` sobre `recorrido().principal`.

## Pendientes

- El táctil real solo se puede comprobar en una tableta física.
- Las voces dan 404 en `/juegos/tts` con el servidor estático (normal); probar con Laravel para oírlas.
