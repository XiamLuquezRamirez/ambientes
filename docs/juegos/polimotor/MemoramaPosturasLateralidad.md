# Memorama de Posturas Asimétricas y Lateralidad (`public/catalogo_juegos/Polimotor/MemoramaPosturasLateralidad/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

Juego nuevo (2026-11-14), Transición 5-6 años, temática 31 "Juegos de memoria corporal", juego 5 de la serie.
Memorama de lateralidad en **4 rondas de 8 tarjetas** (4 parejas) en 2 filas × 4 columnas. Gimnasio deportivo
infantil (SVG en `index.html`: pared azul-durazno, espaldera de gimnasia, canasta de baloncesto, colchonetas,
banderines que se mecen, fotos deportivas pegadas en la pared y balones que botan) y en el centro un **mural**
(Phaser: marco de madera clara, panel azul con líneas de cancha, calcomanías de balones, medallas y estrellas
fuera de la zona de las tarjetas). Cada tarjeta cuelga de una chinche. Reverso: morado deportivo con estrella
sonriente, balón de baloncesto y borde punteado dorado. Cara: la "fotografía" de una postura, su nombre corto
y un distintivo **D** (verde) o **I** (amarillo) con el lado.

**El punto del juego**: dos tarjetas son pareja **solo** si comparten el mismo `id` de postura. Una postura y
su **reflejo horizontal** (p. ej. "mano derecha en la cabeza" vs. "mano izquierda en la cabeza") tienen ids
distintos y **no** forman pareja, aunque se parezcan. Las dos posturas de cada par espejo están en la misma
ronda: ese es el reto.

**Pedido del usuario (2026-11-14):** "4 rondas de tarjetas, guíate del juego que ya hay de memorama y cambia
el escenario". Por eso el juego es una copia del flujo de `MemoramaPartesCuerpo` (3-4 años, que queda intacto)
con escenario de gimnasio, 4 rondas de 8 tarjetas y posturas en lugar de partes del cuerpo.

**Correcciones del usuario sobre la interfaz (2026-11-14, después de la primera versión):**
- **Los botones de acciones como en el Secuenciador de Baile**: los dos menús redondos (accesibilidad y
  sonido) pasaron de la esquina superior derecha a la **inferior derecha** (`bottom: 14px`), con el panel
  abriéndose hacia arriba (`bottom: 70px`), igual que `SecuenciadorBaileLateralidad`. Se añadió además la
  casilla **Efectos** que a ese juego sí tenía (`chk-efectos` → `efectosOn`, que silencia `sfx()` y cambia
  el icono del altavoz). Para que no taparan la cinta de progreso, `.barra-abajo` reserva 150 px a cada
  lado y `.progreso-box` lleva `max-width: 100%` con `flex-wrap` (en tableta vertical pasa a dos líneas).
- **Inicio y recargar arriba a la derecha**: `.hud-top` usa `justify-content: flex-end`, así que `.hud-nav`
  (Inicio y reiniciar) queda en la esquina superior derecha. En tableta vertical el título baja a su propia
  línea (`order: 2; width: 100%`).
- **Sin la insignia "5-6 años" y título más grande**: se quitó el `<span class="hud-edad">` de la cabecera
  (la edad **sigue** en `config.json` → `niveles[].edad`, que es de donde la lee el catálogo: solo
  desapareció el adorno). El título vuelve a estar centrado respecto a la pantalla
  (`left: 50%; transform: translateX(-50%)`) y creció a `clamp(34px, 4.6vw, 64px)` (44 px máx. por debajo
  de 1100 px, 48 px en vertical). Comprobado que no choca con Inicio: 1366 → 1090 < 1137; 1024 → 754 < 795.

## Posturas: Zoe con el muñeco del Espejo

Las tarjetas muestran a **Zoe** y **no** llevan ilustraciones nuevas: se reutiliza el muñeco articulado de
`Polimotor/EspejoDeLasPosiciones` (`muneco.js` + `postura.js` + `img/{zeus,zoe}/*.svg`, copiados a esta
carpeta). `posturas-svg.js` (`PosturasSvg`) convierte los ángulos de una postura en un SVG autónomo (con los
estilos del muñeco en línea, porque la imagen se carga como data URI) y es la única puerta entre el juego y
los dibujos: el escenario, la barra de progreso y la felicitación piden la postura por su objeto de
`config.json` y reciben un SVG o un data URI.

Ventaja: las dos tarjetas de una pareja salen del mismo dato, así que son idénticas pixel a pixel, y el
reflejo se obtiene intercambiando izquierda y derecha en los ángulos (nunca con un `scale(-1,1)`).

Ángulos por extremidad `{ a, b }` (los del Espejo): `a` = abducción del hombro/cadera (0 pegado al cuerpo,
90 horizontal, 180 arriba), `b` = flexión del codo/rodilla. El personaje mira al niño, así que **su**
izquierda se ve a la **derecha** de la pantalla; lo resuelve `Postura.aPantalla`. Cada tarjeta lleva además
muñequeras de color por lado (verde la derecha, amarilla la izquierda) y la escena le pinta encima la
insignia **D** / **I** en la esquina de la foto.

**Intento descartado (2026-11-14):** al pedir el usuario "los botones como el de Secuenciador de Baile" se
entendió mal y se rehicieron las 16 posturas como dibujos propios estilo calcomanía (`iconos.js`). El
usuario aclaró que hablaba de los botones de acciones y que las tarjetas **deben seguir siendo las de Zoe**,
así que se revirtió: `iconos.js` se borró y volvieron `muneco.js`, `postura.js` e `img/`.

**Límite anatómico encontrado:** el enunciado pedía posturas tipo "mano derecha sobre rodilla izquierda".
Con este esqueleto es **imposible**: el brazo mide 98 px y la cadera contraria queda a ~110 px del hombro,
así que la mano nunca alcanza la rodilla del otro lado (se verificó por cinemática directa barriendo todos
los ángulos). Se cambiaron por posturas asimétricas que el muñeco sí representa con claridad y que trabajan
lo mismo (identificar el lado): mano a la cabeza, mano a la cintura, brazo arriba, mano cruzada al hombro
contrario, rodilla levantada, codo doblado y combinaciones. Los ángulos salieron de resolver la cinemática
hacia el punto deseado (coronilla ≈ (160, 46), cintura ≈ (110/210, 220), etc.).

Las 16 posturas, en 8 pares espejo:

| Ronda | Parejas (ids) |
|---|---|
| 1 Mano derecha, mano izquierda | `mano-der-cabeza` · `mano-izq-cabeza` · `mano-der-cintura` · `mano-izq-cintura` |
| 2 Memoria y orientación | `brazo-der-arriba-cintura` · `brazo-izq-arriba-cintura` · `mano-der-hombro-izq` · `mano-izq-hombro-der` |
| 3 Rodillas y codos | `rodilla-der-arriba` · `rodilla-izq-arriba` · `codo-der-doblado` · `codo-izq-doblado` |
| 4 El gran reto de lateralidad | `gimnasta-der` · `gimnasta-izq` · `patinadora-der` · `patinadora-izq` |

Cada ronda tiene contenido propio: ninguna postura se repite entre rondas y entre las 4 se usan las 16.

## Flujo

Inicio → intro 3D compartida → `PedniaEdad` → **presentación** (cartel "¡MEMORAMA DE POSTURAS!", Zeus 3D entra
caminando y dice "¡Desafío de memoria y lateralidad!…", las 8 tarjetas caen boca abajo y se iluminan por
turnos) → **demostración automática** (`demo.js`, sin botón de por medio): la mano de PedniaTutorial voltea una
postura, luego **su reflejo** ("¡Ojo con el lado! Busca la foto que tenga la misma mano en la misma rodilla"),
se marcan los dos lados con aros de color, se cierran, y después voltea las dos tarjetas que sí son iguales →
pareja dorada → "¡Ahora es tu turno! ¡Encuentra todas las parejas!" → Zeus se va → "¡COMENZAR!" → **ronda 1**.

Cada ronda: (desde la 2) cartel "RONDA n" con su instrucción en voz → **vista previa** (estado `preview`): las
8 se voltean, cuenta 3-2-1 (`previaMs`, 4000 en la ronda 1 y 3500 en las demás), aviso "¡MIRA Y RECUERDA!" en
la barra de abajo → se cierran → partida → "¡RONDA n LISTA!" con confeti → las tarjetas se cierran → ronda
siguiente. Abajo, cinta "RONDA n/4" + "PAREJAS ENCONTRADAS: n/4" + cuatro círculos con las posturas de la ronda.

- **Volteo**: tween de `scaleX` 1 → 0 → 1; la textura cambia a mitad (de canto), así la foto nunca queda
  invertida. Suena un soplido y la voz nombra la postura ("¡Mano derecha sobre la cabeza!").
- **Pareja distinta** (`checking`): las dos se ven `errorVisibleMs` (2 s), balanceo pequeño, dos notas graves,
  y **`marcarLados`** dibuja sobre el distintivo D/I de cada tarjeta un aro parpadeante del color de su lado
  (verde derecha, amarillo izquierda) — así el niño VE que la diferencia está en el lado. Luego se cierran y
  Zeus dice "¡Observa bien! ¿Están usando la misma mano y la misma rodilla?". Sin vidas ni puntos.
- **Pareja correcta** (`matched`): halo y marco dorados, estallido de estrellas, acorde alegre, y la
  celebración sigue a la postura: las de pierna dejan huellitas que caminan, las de solo brazos aplauden, el
  resto da saltitos. Se llena su círculo en la barra.
- **Final** (tras la ronda 4): las tarjetas bailan en ola, lluvia de estrellas, confeti, Zoe "¡Memoria espacial
  de nivel maestro!…" y Zeus "¡Reconociste la derecha y la izquierda en todas las posturas!" → tarjeta
  "¡RETO COMPLETADO! / Encontraste todas las parejas de posturas." con las 16 posturas, **Volver a jugar** y
  **Continuar** (victoria compartida `../../final`).
- **Ayuda** sin revelar respuestas: sin tocar nada 8 s → "¡Toca una tarjeta para voltearla!"; con una abierta
  8 s → "¡Ahora toca otra tarjeta! ¿Dónde está la misma postura?"; las tarjetas cerradas se menean.
- **Bloqueos** (reglas.js): solo 2 tarjetas por turno, nada durante la vista previa ni al comparar, ni la misma
  tarjeta dos veces, ni una pareja ya encontrada. Cada partida lleva `partidaId`.

## Archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `reglas.js` | `ReglasMemoPosturas` | Puro (también `module.exports`): estados `preview → waiting → firstCard → secondCard → checking/matched → waiting/completed`; `ronda(cfg, i)` (las 4 posturas fijas de la ronda), `espejoDe` / `reflejar` / `mismosAngulos` (el reflejo de una postura), `repartir` (8 tarjetas, distinto del orden anterior y sin parejas contiguas con `pegadas`), `crear`, `iniciar`, `tocar`, `comparar` (por `id`), `terminarTurno`, `progreso`, `cerradas`, `encontradas`, `revisarJuego`. |
| `posturas-svg.js` | `PosturasSvg` | Convierte una postura (ángulos) en SVG autónomo con el muñeco del Espejo, dibujando a **Zoe**; `extremo(id, ang)` (cinemática del brazo/pierna), muñequeras de color por lado, destellos sobre las partes clave, `svg` / `dataUri`. |
| `muneco.js` / `postura.js` + `img/` | `Muneco`, `Postura` | Copia del Espejo de las Posiciones (no modificar aquí; si cambian allá, copiar otra vez). |
| `sonidos.js` | `SonidosMemoPosturas` | Web Audio sin archivos: `volteo`, `acorde`, `suave`, `aplauso`, `paso`. |
| `escenario-phaser.js` | `EscenarioMemoPosturas` | Mural del gimnasio, 8 tarjetas en 4 × 2 (`reacomodar` ciñe el mural a la rejilla), `voltear`, `cuenta`, `pareja`, `marcarLados`, `aplausos`/`huellas`/`saltitos`, `celebrarFinal`, `reiniciar`, `puntoCarta(i)`. |
| `demo.js` | `MemoPosturasDemo` | Demostración: elige una postura y **su reflejo** de la ronda 1 y enseña por qué no son pareja. |
| `guia-3d.js` | `Guia3D` | Zeus 3D (`nino.glb`) de la presentación y la demo. |
| `script.js` | — | Flujo, Zeus en escena, 4 rondas, voces, progreso, ayudas, final, menús. |
| `memorama-posturas.png` | — | Icono del catálogo (256 × 256: dos tarjetas D/I sobre el mural). |

Catálogo de posturas, rondas, textos y tiempos en `config.json` (`posturas`, `rondas`, `juego`, `textos`).
Postura nueva: entrada en `posturas` con sus ángulos + su id en una ronda. `revisarJuego` avisa si dos
posturas tienen los mismos ángulos o si una ronda no tiene 4.

## Probar

- `node scripts/probar-memorama-posturas-lateralidad.js` (69 pruebas: 4 rondas de 8 tarjetas, contenido propio
  de cada ronda, los 8 pares espejo, que un reflejo NO sea pareja y dos idénticas sí, reparto siempre distinto
  y sin parejas contiguas, bloqueos, ronda completa, y los textos literales del enunciado).
- En el navegador: `EscenarioMemoPosturas.puntoCarta(i)` da el centro de la tarjeta; `mousedown` en el canvas y
  `mouseup` en `window`. `st` (estado) y `ReglasMemoPosturas.orden(st)` dicen dónde está cada tarjeta.
- Probado (2026-11-14) a 1366 × 768, 1024 × 768 y tableta vertical 768 × 1024 con el ratón: presentación con
  Zeus 3D, demo automática, vista previa con cuenta, volteo, **pareja incorrecta entre una postura y su
  reflejo** (no empareja, se marcan los lados y se cierran), pareja correcta, las **4 rondas jugadas enteras**
  con sus transiciones, y la felicitación "¡RETO COMPLETADO!" con Volver a jugar y Continuar. Sin errores de
  JavaScript en consola (solo los 404 de `/juegos/tts`, normales con el servidor estático). El táctil no se
  pudo emular (Phaser no activa el táctil sin pantalla táctil): falta probarlo en una tableta real.
- Tras los cambios de interfaz (mismo día) se volvió a comprobar en los tres tamaños: los menús redondos
  abajo a la derecha con sus paneles abriéndose hacia arriba, la casilla Efectos (apaga y enciende `sfx`
  y cambia el icono del altavoz), la cinta de progreso centrada y sin solaparse con los botones
  (1366: centro 683 de 683; 1024: centro 512 de 512; vertical: dos líneas), e Inicio / reiniciar / edad en
  la esquina superior derecha sin chocar con el título (1366: 1046 < 1057; 1024: 694 < 715). Sin errores de
  JavaScript ni recursos faltantes.
- **Con el panel del navegador oculto la partida se queda en `preview`**: sin `requestAnimationFrame` los
  tweens de Phaser no avanzan y la cuenta regresiva no termina. Para probar la partida hay que tener el
  panel a la vista (es la trampa ya documentada en la plantilla general).

## Registro

Fila en `database/ambientes.sql`: slug `memorama-posturas-lateralidad`, ambiente 7, eje 11, temática 31,
módulo 9, orden 21, imagen `memorama-posturas.png`, color `#1c7ed6`. Aplicado también en la base local (la
tabla `juegos`, que es lo que hace que aparezca); el catálogo lo lista para 5-6 años y no para 3-4.

## Pendiente

- Probar el toque en una tableta real.
- Sin commit.
