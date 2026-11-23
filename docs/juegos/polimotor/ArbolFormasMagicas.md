# ¡El Árbol de las Formas Mágicas!

`public/catalogo_juegos/Polimotor/ArbolFormasMagicas/` · slug `arbol-formas-magicas` · **3-4 años** · Eje 18 «Habilidad y precisión», temática 35 «Arrastrar y soltar objetos».

Un árbol mágico con cara perdió sus frutos. El niño arrastra cada fruto hasta el molde del tronco que tiene su misma forma: **Manzana Circular** → círculo, **Ciruela Cuadrada** → cuadrado, **Pera Triangular** → triángulo, **Fresa Corazón** → corazón, **Carambola Estrella** → estrella.

## Niveles (2026-11-21, pedido del usuario: «que sean 3 niveles»)

Se encadenan en una sola partida (`config.nivelesJuego`; `config.niveles` sigue siendo solo la edad del catálogo):

| Nivel | Frutos | Moldes en el tronco | Escala | Lugares |
|---|---|---|---|---|
| 1 | manzana, ciruela, pera | triángulo de 3 | 1.1 | 4 (ramas y pasto) |
| 2 | + fresa | 2 × 2 | 1.0 | 6 (+ 2 colgando de la copa) |
| 3 | + carambola | 2 arriba, 3 abajo | 0.92 | 6 |

- Solo el nivel 1 tiene la demostración y el botón «¡Comenzar a jugar!». Los niveles 2 y 3 entran con Zoe presentando el fruto nuevo (`nivelesJuego[].zoe`) y arrancan solos.
- Al terminar los niveles 1 y 2: celebración corta (`celebrar(true)`), cartel `nivelesJuego[].listo`, Zoe y Zeus felicitan, fundido y siguiente nivel. Al terminar el 3: la gran fiesta y la victoria compartida.
- Reiniciar (botón estándar `location.reload()`) vuelve al nivel 1.
- El progreso de arriba muestra «Nivel n» y los frutos del nivel.
- Las disposiciones de moldes están en `escena-arbol.js` (`DISPOSICIONES[3|4|5]`). Fruto y molde usan siempre la misma escala; el radio de acierto sale de la separación real (89 / 76 / 68 px de diseño).

## Pedido (2026-11-21)

- Phaser 4 + JS/HTML/CSS, integrado como los demás Polimotor; imagen de referencia como guía (no copia).
- El enunciado decía «Edad objetivo: 3 a 4 años» y en otros puntos «5 a 6»: se tomó **3-4 años** (el campo explícito).
- Botones estándar sin cambios: reiniciar (`location.reload()`) y salir (`history.back()`) arriba a la derecha; accesibilidad y volumen abajo a la derecha (`comun/interfaz.css`).
- Victoria compartida (`final/final.js`) con el bloque estándar «¿Quieres jugar nuevamente? Sí / No».
- Solo PC y tableta horizontal.

## Fondo por capas y reactivo (2026-11-21, pedido: «el fondo se ve muy plano… que reaccione con el juego»)

El fondo ya no es una sola imagen: `bosque.js` (`FondoBosque`) arma los planos que dibuja `dibujos.js` — cielo, sol, nubes, montañas con bruma, bosque lejano, árboles medios a los lados, pradera con ondulaciones y manchas de sol, hierba alta (detrás de frutos y cintas), helechos en las esquinas y una viñeta que oscurece solo el fondo. La escena le pasa el estado en cada frame.

- **Paralaje**: cada plano se corre según el puntero o el fruto arrastrado (lejos poco, cerca más, los helechos al revés).
- **Enfoque**: al arrastrar, la viñeta sube y el fruto resalta.
- **Magia**: con cada encaje se abren flores en la pradera, del árbol hacia afuera, con chispas; el cielo se aclara.
- **Onda**: cada encaje lanza una onda de luz del color del fruto por el suelo, ilumina la pradera y sacude los árboles medios; a veces sale una bandada de pájaros.
- **Hora por nivel**: mañana (nivel 1), mediodía (nivel 2) y atardecer dorado (nivel 3). Cambian la posición y el color del sol, el velo del cielo y el tinte de montañas, bosque, árboles y pradera; el árbol mágico y los frutos no se tiñen.
- **Celebración**: arcoíris (a medias al pasar de nivel, pleno al final), bandada, nubes rápidas y pradera en flor.

## Zoe y Zeus caminan (2026-11-21, pedido: «deben caminar, no deslizar»)

Entran y salen caminando: `moverGuia()` en `script.js` pone el clip `Caminar` del modelo 3D y lo gira hacia donde va (`mirar("derecha" | "izquierda")`) mientras el CSS lo lleva de un lado a otro; al llegar vuelve a `Quieto` y mira al frente. El tiempo es el mismo en los dos lados: `MARCHA_MS` = 1500 ms y la transición de `#guia .guia-pj` / `.guia-zeus .guia-pj` en `style.css` (1,5 s, sin el rebote de antes, que se veía como deslizar). `zoe()` y `zeus()` devuelven una Promise y el flujo espera a que lleguen antes de hablar o gesticular (un gesto durante la marcha se ignora). Al pasar de nivel se van caminando antes del fundido.

## Flujo

portada → intro 3D (`textos.conversacion`) → PedniaEdad → Zoe dice la instrucción (`introZoe`) → demo: Zeus (`demoZeus`) y la mano de `PedniaTutorial` llevan la manzana al círculo; se deshace al terminar → Zoe: «¡Fíjate en la forma!…» (`ayudaZoe`) → «¡Comenzar a jugar!» → partida → celebración → Zoe y Zeus dicen el cierre (`finalVoz` + `finalVozZeus`) → victoria compartida.

## Mecánica

- Frutos en 4 lugares fijos (dos ramas, dos en el pasto); `ReglasArbol.repartir` sortea en cuáles aparecen los 3 en cada partida, para que la posición no resuelva el juego.
- Arrastre real de Phaser (`dragstart`/`drag`/`dragend`, mouse y touch, `activePointers: 2`). Al tomarlo el fruto crece, se eleva un poco sobre el dedo, aparece sombra y aura; sigue al puntero con suavizado exponencial (sin vibrar) y queda limitado al área visible. Si el puntero se pierde (touchcancel) se suelta como un soltado normal.
- Proximidad: solo el molde de **su** forma brilla y late (`ReglasArbol.cercano`, radio 200 de diseño) y suelta chispas; la cara del árbol pone ojos de ilusión y siempre mira el fruto o el puntero.
- Al soltar, la escena manda las distancias a cada molde y `ReglasArbol.evaluar` decide:
  - **correcto** (su molde dentro del radio de acierto, ~89 px de diseño = 45 % de la separación entre moldes, y libre): encaje con arco, rebote, destello, anillo, estrellas, borde dorado, una bola de magia sube a su orbe en la copa, cara feliz, copa que se sacude. El fruto queda fijo y sin input.
  - **otraForma**: el molde tiembla, cara de duda, el fruto vuelve en arco; Zoe: «¡Busca el molde que tenga la misma forma!». Al segundo intento con el mismo fruto la pista nombra su forma (`frutos[].pista`) y se dibuja el camino.
  - **fuera**: vuelve en silencio; a los 2 seguidos Zoe dice `textos.fuera`.
- Sin vidas ni puntos negativos.
- Ayuda automática (`ayudaMs` 11 s, luego cada 14 s): camino de puntos dorados del fruto a su molde, el molde brilla dos veces, el fruto salta; Zoe alterna la guía general y la pista del fruto.
- Progreso arriba al centro: los tres frutos en silueta punteada que se encienden con un «pop» al encajar, más «n / 3». También se encienden los tres orbes de la copa.
- Celebración: explosión de anillos de color, estrellas, confeti y serpentinas (reserva fija de partículas), el árbol brilla (luz ADD), la copa salta dos veces, los frutos laten con su aura; música de fiesta.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | cascarón estándar (portada, intro 3D, escena, progreso, botones, victoria compartida) |
| `config.json` | 5 frutos, `nivelesJuego` (3 niveles), radios, textos, edad 3-4 años |
| `reglas.js` | `ReglasArbol` puro (también en node): evaluar, cercano, radios, repartir, frase, niveles, frutosNivel, completo, validar |
| `dibujos.js` | `DibujosArbol`: SVG propios (planos del bosque, tronco con ramas, copa en dos capas, frutos, moldes, cojines, cintas, decoración, partículas) rasterizados a canvas. Fruto y molde comparten geometría (`FORMAS`) |
| `bosque.js` | `FondoBosque`: planos del fondo, paralaje, hora por nivel, flores, ondas, pájaros y arcoíris |
| `escena-arbol.js` | `EscenarioArbol`: escena Phaser 1600×900 `ENVELOP`, cara dibujada con `Graphics`, arrastre, efectos, `Animador` con respaldo por tiempo |
| `sonidos.js` | `SonidosArbol` (Web Audio, sin archivos; buses fondo/efectos para `comun/volumen.js`) |
| `demo.js` | `ArbolDemo` |
| `guia-3d.js` | Zoe y Zeus 3D (copia de la Canasta) |
| `script.js` | flujo, voces, ayuda, progreso, cierre |
| `style.css` | HUD, globos, botón de arranque, cartel |
| `arbol-formas.png` | ícono 256×256 (captura de la propia escena con `renderer.snapshotArea`) |

Lugares de diseño: (342, 455), (1258, 455), (478, 732), (1122, 732) y, desde el nivel 2, (500, 235), (1100, 235). Todo cabe en 4:3 (x 200–1400) sin tocar los botones. La pista de arriba mide como máximo 400 px para no tapar los frutos de la copa.

## Probar

- `node tests/js/run-tests.js` (23 pruebas en `tests/js/arbol-formas/reglas.test.js`; 62 en total).
- `preview_start juegos-arbol` (puerto 8044) → `/catalogo_juegos/Polimotor/ArbolFormasMagicas/index.html`.
- Arrastre por JS: `mousedown`/`mousemove`… sobre `__escenarioArbol.canvas` en varios pasos (un solo movimiento no alcanza a Phaser). Para touch hace falta un viewport con táctil (sin él Phaser no instala el gestor de toques) y `Touch` con `pageX/pageY`.
- `EscenarioArbol.estado()` da frutos, moldes y radios.

Probado en el navegador: 1366×768, 1024×768, 1920×1080; flujo completo (portada → intro → presentación → demo → botón → partida → celebración → victoria), los tres casos de soltado con mouse, y la partida completa con touch emulado. Con los 3 niveles: los tres jugados de seguido hasta la victoria (1366×768) y el nivel 3 en 1024×768 con un intento en molde equivocado.

## Registro en BD

Fila en la BD local (tinker, `updateOrInsert`) y en `database/ambientes.sql` tras `canasta-juguetes-zoe-zeus`; la descripción menciona los tres niveles. Orden 36, imagen `arbol-formas.png`, color `#40c057`. Aparece en `listarActivosPorAmbiente(7, 3)` y `(7, 4)`, no en `(7, 5)`.

## Pendientes

- Tableta física real y voces del servidor (`/juegos/tts`, requiere Laravel; con el servidor estático las voces dan 404 y el juego sigue por tiempo). Sin commit.
