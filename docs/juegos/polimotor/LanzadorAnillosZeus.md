# El Lanzador de Anillos de Zeus

`public/catalogo_juegos/Polimotor/LanzadorAnillosZeus/` · slug `lanzador-anillos-zeus` · 3-4 años.
Eje 17 «Coordinación y orientación», temática 34 «Coordinación visual», juego 2 (puntería, coordinación ojo-mano y
deslizamiento directo).

## Pedido (2026-11-18)

Prompt completo «Juego 2: El Lanzador de Anillos de Zeus». Regla principal: **diseño visual completamente nuevo**, sin
tomar como base escenas, fondos, tarjetas ni efectos de otros juegos de Polimotor; de ellos solo se consultó la
**ubicación de los controles** (edad arriba a la izquierda, progreso arriba al centro, reiniciar y volver arriba a la
derecha, accesibilidad y volumen abajo a la derecha). Zeus con el GLB existente y sus clips; sin personajes SVG.
Probar solo en escritorio y tableta horizontal. Sin rama nueva.

## Qué se ve

Escena three.js propia (`escenario-3d.js`), no Phaser: parque de puntería mágica al atardecer. Cielo con degradado
y sol bajo, nubes que se desplazan, colinas, árboles, casas y mariposas del kit de las experiencias (ver abajo), rueda de la fortuna que gira con
bombillos, banderines y guirnalda de bombillos que titilan, letrero
«¡PUNTERÍA!», flores y motas de luz flotando. En el centro, una **diana gigante** pintada en el pasto con el **Cono
Mágico Mástil** (base octogonal turquesa con ribete dorado, cono de bandas violeta/rosa/naranja/girasol con
estrellitas, mástil dorado y esfera de luz con halo y luz puntual). Zeus (GLB) de pie a la derecha del cono. Abajo,
una tarima de madera con línea de lanzamiento y tres cojines con aro de luz del color de cada anillo.

Los anillos son toros con barniz (MeshPhysical) y un dibujo propio para no depender del color: rojo con **rayas**,
azul con **puntos**, amarillo con **zigzag**. En reposo flotan inclinados hacia la cámara y giran sobre su propio eje.

Interfaz con estilo propio (feria: ciruela, frambuesa, girasol, turquesa, crema; botones redondos con costura
punteada, edad con forma de boleto). No usa `comun/interfaz.css`. Sí usa `comun/inicio-fondo.css/js` (pantalla
«¡Empecemos!» y botón Volver comunes a todos los juegos, con PedniaSalir).

## Modelos de las experiencias (2026-11-19, pedido del usuario)

Árboles, casas y mariposas se mapean con los GLB del kit low-poly de las experiencias (`public/assets/modelos`, el que
arma `assets/js/mapa-mundo.js`), en lugar de los árboles y carpas hechos a mano:

- Árboles (`02_vegetacion`): ceiba, mango, canaguate, palma de coco, platanera y cardón, con un leve vaivén.
  Arbustos: `arbusto.glb` junto a las flores.
- Casas: `07_casas_tematicas/polimotor`, `07_casas_tematicas/multisaberes` y `10_edificios/casa_refugio`, al fondo,
  en menor resolución solo en este juego: `simplificar()` agrupa vértices en celdas del 2 % del alto de la casa
  (`CELDA_CASAS`) al fundirlas (de 7 666 / 5 526 / 7 728 a 3 546 / 4 928 / 4 742 triángulos). Los .glb no se tocan.
- Sin animales ni aves (2026-11-19: el juego iba lento en una tableta de 4 GB de RAM). Solo quedan tres mariposas
  (`05_aves_insectos_peces/mariposa`) sobre las flores, pequeñas: alto 0,01 → ~13 cm de ala a ala.
- Rendimiento medido: 516 → 384 dibujos por cuadro.
- Zeus: desde 2026-11-19 se carga `intro3d/models/nino.glb` (el Zeus de la intro: 2,2 MB, ~242 000 triángulos,
  meshopt) en vez de `SimonDiceCorporal/zeus_animado_suave.glb` (17,7 MB, ~425 000). Mismo esqueleto (`cabeza`) y
  mismos clips que usa el juego (Quieto, Hablar, Caminar, Saludar, Senalar, Celebrar, Aplaudir, Porra_con_pompones,
  Saltar, Decir_si, Bailar); misma altura con la escala 1,6. Triángulos por cuadro: ~525 000 → ~342 000.
- Material facetado (`flatShading`) como en las experiencias. Los modelos quietos se funden por material al
  cargarse (`fundido`): una casa pasa de 90-135 piezas a una por material (~1100 → ~710 dibujos por cuadro).
- Césped (2026-11-19): baldosas de 20 m de `01_relieve/terreno_tile_20m.glb` (césped con color por vértice, matas y
  pétalos), fundidas por material, con el relieve casi aplanado bajo y = 0. Las matas y pétalos se quitan donde
  estorban (diana y cono de todos los niveles, tarima, pies de Zeus: `zonasDespejadas`). Encima, una textura de
  briznas propia (`texturaBriznas`, clara) multiplica el color del césped cada 2,2 m para que se vea pasto.
- Globos quitados (2026-11-19, pedido del usuario: «ya hay mucha información»).
- Se cargan sin frenar el arranque (`cargarMundoExperiencias`, sin `await`). La rueda de la fortuna, banderines,
  letrero y flores siguen siendo propios del juego.

## Tres niveles (2026-11-19, pedido del usuario: «el segundo un poco más alejado»)

`config.rondas`: nivel 1 con el cono en z = -1,15 y Zeus en (1,6; -1,45); nivel 2 con el cono en z = -2,7 y Zeus en
(1,8; -3,0); nivel 3 (2026-11-19, «otro nivel un poco más alejado») con el cono en z = -4,2 y Zeus en (2,0; -4,5).
Cada nivel pide los mismos tres anillos.

Al ensartar el tercer anillo del nivel 1 (`finNivel` en `script.js`): música, Zeus celebra, cartel «¡NIVEL 1 LISTO!» y
Zoe lo dice → cartel «¡NIVEL 2! El cono está más lejos» → `EscenarioAnillos.nivel(def)`: los anillos suben del mástil
y vuelven a sus cojines, el cono con su diana se desliza al fondo y Zeus camina de espaldas (clip `Caminar`) hasta su
nuevo lugar y se vuelve a girar → Zeus: «¡Ahora mi cono está más lejos! Apunta bien…» → la flecha de luz recuerda el
camino 4 s → se juega. Lo mismo del 2 al 3 (voz propia del nivel 3). Solo el último nivel lleva al final. El progreso dice «Nivel n de 3» junto a los tres aros.

Dificultad: la zona de recepción no cambia, pero con el cono más lejos el mismo error de puntería se aleja más del
mástil: el margen pasa de ~50° (nivel 1) a ~34° (nivel 2) y ~25° (nivel 3); con fallos seguidos la zona crece (tope 1,5)
y en el 3 vuelve a ~37°. Un deslizamiento hacia el cono acierta en los tres. El cono del 3 queda antes de los
animales (z ≈ -5,9) y de la cuerda de banderines no estorba (está a z = -4,6 pero a 3,75 m de alto).
La cámara no se mueve entre niveles. La flecha de luz (guía) se reinicia en cada nivel (`lanzamientos = 0` en
`finNivel`): acompaña los primeros lanzamientos y se apaga poco a poco, igual que en el nivel 1.

Arrastre: el anillo no pasa de z = 0,35 (`Z_ARRASTRE_MIN`). Si el dedo sube más allá, el anillo se eleva junto al dedo
en ese borde (rayo contra el plano vertical z = 0,35, alto máx. +0,9). Antes seguía el punto del suelo bajo el dedo,
que se va al fondo; por la perspectiva, en los anillos de las esquinas eso lo corría de lado (x 1,3 → 2,2) antes de
volar, y se notaba en los niveles 2 y 3.

## Flujo

inicio → intro 3D compartida (Zeus y Zoe dicen las frases literales) → PedniaEdad → presentación (título y edad
centrados arriba, los anillos aparecen con un pop, Zeus saluda y explica; Zoe completa) → demo automática (la mano
toma el anillo rojo, aparece la trayectoria punteada, lo desliza hacia arriba y lo suelta; el anillo vuela, se
ensarta, el cono destella, Zeus celebra; luego el anillo vuelve a su cojín: no cuenta) → «¡Comenzar a jugar!» →
partida de tres niveles (ver arriba) → final (luz dorada, fuegos artificiales, serpentinas, confeti, Zeus baila y hace porra; sin cartel grande
—pedido del usuario—, solo los globos de Zoe y Zeus con la frase de cierre) → victoria compartida (Sí / No).

Globos de texto solo en presentación, demo y final; en la partida solo voces. El de Zeus sale junto a su cabeza (se
angosta en tableta para no tapar el cono); el de Zoe, a la izquierda con su carita.

## Mecánica (`reglas.js`, puro)

- El dedo o el ratón toma el anillo más cercano (zona táctil 1,45 × el radio dibujado, mínimo 64 px). Mientras se
  arrastra, el anillo sigue al dedo en un plano a 0,72 de alto, limitado a la zona de lanzamiento.
- Al soltar: es lanzamiento si subió ≥ 5 % del alto de la escena. Si no, vuelve al cojín y Zoe recuerda el gesto.
- Fuerza = 55 % recorrido + 45 % rapidez final. Entre `fuerzaMin` 0,4 y `fuerzaMax` 1,8 llega justo al cono
  (meseta amplia); menos, se queda corto; más, se pasa.
- Dirección = mitad la del gesto completo y mitad la de los últimos 120 ms. El error respecto al cono se mide **desde
  el punto donde se tomó el anillo** (no desde donde quedó al soltar) y se reduce con `correccionAngulo` 0,4.
- El punto natural de caída se compara con la **zona de recepción** del mástil (`radioCaptura` 1,0, +0,16 por cada
  fallo seguido, tope 1,5). Dentro: la trayectoria se corrige al mástil y queda ensartado. En la práctica acierta
  cualquier deslizamiento hacia arriba hasta ~50° del cono; uno recto hacia arriba desde los anillos laterales acierta.
- Acierto: vuela girando (0,9 s) hasta encima de la punta, baja por el mástil con gravedad, asienta con bamboleo y se
  apila (`alturaApilado`, sin superponerse). Fallo: sigue su curva, cae en el pasto lejos del cono y de Zeus
  (`caidaSegura`; si la recta pasa cerca, la curva sube por encima), rebota dos veces y vuelve volando a su cojín.
  Sin vidas, sin puntos negativos, sin sonidos negativos; intentos ilimitados.

## Guiado y ayuda

- Flecha punteada de luz (puntos que avanzan) del anillo a la punta del cono y halo en el objetivo: plena al empezar y
  se apaga en los primeros `guiaLanzamientos` (3) lanzamientos.
- Tras dos fallos seguidos vuelve 4,5 s. Sin tocar nada `ayudaMs` (9 s): el anillo pendiente brilla, flecha, Zeus
  señala y Zoe da la pista. Todo se apaga con «Ayuda visual» desactivada en accesibilidad.

## Zeus (clips del GLB de la intro `intro3d/models/nino.glb`)

Quieto / Hablar (mientras habla) · Saludar (presentación) · Senalar (explica, ayuda, demo) · Celebrar, Aplaudir,
Porra_con_pompones, Saltar (aciertos, en turnos) · Decir_si / Aplaudir (ánimo tras fallo) · Bailar (final, en bucle) ·
Porra_con_pompones (cierre). No se duplica el GLB.

## Sonidos (`sonidos.js`, Web Audio, creados para este juego)

seleccion, arrastre (roce, limitado), lanzar, vuelo (aleteo con LFO), encaje (cling metálico + madera), corneta
(Sol-Do-Mi-Sol), destello, rebote (golpe + boing suave), recuperar (escalita), aparece, victoria (melodía con acordes).
Música de fondo `../../sounds/fondo.mp3`; al final, el evento `victoria` de PedniaAudio.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasAnillos` | Gesto → lanzamiento, zona de recepción, caída segura, apilado, progreso, `revisarJuego`. |
| `escenario-3d.js` | `EscenarioAnillos` (módulo) | Escena, Zeus, entrada con Pointer Events, vuelos, partículas, guía, final. Bucle rAF con respaldo `setInterval`. |
| `sonidos.js` | `SonidosAnillos` | Efectos Web Audio. |
| `demo.js` | `AnillosDemo` | Demo con la mano de PedniaTutorial usando el arrastre real (`demoTomar/demoMover/demoSoltar`). |
| `script.js` | — | Flujo, voces y globos, HUD de tres aros, ayuda, final y victoria. |
| `lanzador-anillos.png` | — | Ícono 256×256 (cono con los tres aros), SVG propio rasterizado con Edge headless. |

## Probar

- `node scripts/probar-lanzador-anillos-zeus.js` (16 pruebas, incluidas las de los niveles 1-2 y 3: config, textos literales, aciertos desde los tres
  anillos, fallos laterales, corto, meseta de fuerza, zona que crece, caída segura, apilado, HTML).
- Navegador: `preview_start juegos-lanzador` (puerto 8038) → `/catalogo_juegos/Polimotor/LanzadorAnillosZeus/index.html`.
  Saltar inicio e intro: ocultar `#pantalla-inicio`, quitar `esperando-inicio` y `cerrar_anuncio()` (con el panel
  oculto la intro 3D compartida no avanza). Lanzar: `PointerEvent` (`pointerdown/move/up`) en `.lanzador-canvas` desde
  `EscenarioAnillos.puntoAnillo(id)`; aquí sí sirven eventos simulados (no es Phaser).
- Probado el 2026-11-18 a 1366×768 y 1024×768, con eventos de ratón y táctiles: presentación, demo, aciertos,
  fallos a ambos lados con rebote y regreso, gesto corto, ayuda por inactividad, apilado de los tres, final y
  victoria; sin errores de JavaScript (solo los 404 de `/juegos/tts`).

## Base de datos

Fila en la BD local (`php artisan tinker --execute`, idempotente) y en `database/ambientes.sql` en orden alfabético
(tras `laboratorio-…`). `orden` 30, imagen `lanzador-anillos.png`, color `#e8368f`. Se lista con
`listarActivosPorAmbiente(7, 3)` y `listarActivosPorAmbiente(7, 4)`, y no en 5-6 años. El nivel declara `edad` `3-4 años` e `id` `3` (el `5` es el respaldo de Transición en `PedniaEdad`).

## Pendientes

- Probar el toque real en una tableta física (el panel solo simula eventos).
- Oír las voces con el servidor Laravel (`/juegos/tts`).
- Sin commit.
