# ¡La canasta de juguetes!

`public/catalogo_juegos/Polimotor/CanastaJuguetesZoeZeus/` · slug `canasta-juguetes-zoe-zeus` · 3-4 años.
Eje 18, temática 35. Arrastrar, soltar y clasificar: el niño toma un juguete y lo lleva hasta su caja.

Fila en la tabla `juegos` (id interno 34, color `#f76707`) ya aplicada en `database/ambientes.sql`.

## Qué se ve

Habitación de juegos en CSS puro (`escena.js` arma el HTML, `style.css` lo pinta). De fondo a frente:

- **Pared** con papel pintado de lunares suaves y zócalo que la separa del suelo.
- **Ventana** con cielo en degradado, sol que late, tres nubes a distinta velocidad, dos colinas,
  dos pájaros que cruzan, marco de cruceta, repisa y visillos rosas que ondean.
- **Dos estantes** con libros de colores inclinados, una planta y una pelota.
- **Guirnalda de banderines** que ondea y dos cuadritos torcidos.
- **Suelo de duelas** con `perspective(520px) rotateX(46deg)`, y **alfombra** de 12 cuadros de colores
  inclinada 13° para que el suelo se lea en profundidad.
- **Luz cálida** que entra por la ventana (`mix-blend-mode: screen`) con 14 motas de polvo flotando dentro.
- **Juguetes sueltos** de fondo cuya opacidad baja a medida que se ordena (`--orden`): la habitación
  se ve más limpia según avanza el nivel.

Arriba a la izquierda: inicio y pastilla «3-4 años». Arriba a la derecha: reiniciar. Abajo a la izquierda:
nivel, cuenta y puntos. Abajo a la derecha: accesibilidad y volumen. Zoe y Zeus (GLB 3D, `guia-3d.js`)
en las esquinas inferiores, con globo de diálogo que sale hacia arriba para no tapar los juguetes.

### Las cajas

Son CSS, no imagen (la foto `img/caja.png` ya no se usa). Cada zona se compone de:

- `.zona-tapa` — dos solapas abiertas en perspectiva, recortadas con `clip-path`.
- `.zona-cuerpo` — el cartón, teñido con `--tinta` por `color-mix`, con cinta de embalaje y brillo.
- `.zona-boca` — el hueco oscuro donde cae el juguete.
- `.zona-marca` — el dibujo de qué va dentro (en el nivel 2 va vacía: el color ya es la pista).

El color de cada caja sale de `tinta` y `sombra` en el config y se ve **puro**: no hay `background-blend-mode`
que lo apague, porque en el nivel 2 el color es la regla del juego.

### Los juguetes

Todos se dibujan en SVG dentro de `juguetes.js`, con un estilo común (volumen por cara clara / cara oscura,
brillo arriba y sombra elíptica en el suelo). No se reutilizan imágenes de otros juegos: antes se tomaban
el oso y el conejo de `Lateralidad` y la pelota y el cubo de `ArrastrarYSoltarObjetos`, y los estilos no
casaban entre sí.

| Tipo | Qué es |
|------|--------|
| `coche`, `camion`, `tren` | vehículos con ruedas de tapacubos, faros y franjas; el tren echa humo |
| `oso`, `conejo`, `muneco` | peluches con ojos con brillo, mofletes, lazo y costuras |
| `pelota` | pelota de playa de seis gajos de colores |
| `madera` | cubo de madera con veta y una letra A |
| `garaje` | marca de la caja de vehículos |

`dibujar(tipo)` acepta un sufijo de color: `cubo:rojo`, `estrella:azul`, `caja:verde`. Las cinco formas
del nivel 2 (`cubo`, `estrella`, `cilindro`, `ladrillo`, `triangulo`) comparten una paleta de cinco colores
(`PALETA`), de modo que la forma varía pero **el color manda**.

## Los tres niveles

Definidos en `config.json` → `nivelesJuego`. Cada uno declara sus `zonas` (con `acepta`) y sus `objetos`
(con `zona`), en porcentajes de la habitación; `reglas.js` comprueba que esa correspondencia sea coherente.

| Nivel | Qué pide | Juguetes | Cajas |
|-------|----------|----------|-------|
| 1 | Guardar cada juguete en su caja | 3: coche, oso, pelota | 3, con la marca de lo que va dentro |
| 2 | Clasificar por color | 5 formas distintas, una por color | 5 de colores vivos, sin marca |
| 3 | Clasificar por categoría | 8 | 3: garaje, peluches, rincón de juego |

El nivel siguiente solo se abre al completar el actual. En el final hay botón para repetir o saltar al 3.

## Cómo se decide un acierto

`reglas.js` es puro (sin DOM ni audio) y está probado en `tests/js/canasta-juguetes/reglas.test.js`.

`radiosDe(zonas, juego)` calcula dos radios a partir de la **separación real** entre las cajas en pantalla,
de modo que el juego se adapta a cualquier tamaño de ventana:

- `atraer` — como mucho la mitad de la separación, para que dos cajas vecinas no se disputen el mismo juguete.
- `radio` — el 80 % de `atraer`, de modo que siempre queda un margen en el que el juguete «salta» a su caja.

`evaluar(info)` decide con esos radios:

- si el centro del juguete cae dentro de **otra** caja → `incorrecta` (vuelve a su sitio y se da una pista);
- si cae dentro de `atraer` de la suya, o el dedo se soltó encima de ella → acierto (si fue por atracción,
  `atraido: true`);
- si no → `lejos`, que no es un error: el juguete vuelve en silencio.

Soltar sobre un juguete ya guardado devuelve `ya` y no vuelve a contarlo.

## Animaciones

- Juguete en reposo: flota con un balanceo propio por pieza (`flota`, con `--balanceo`).
- Al tomarlo: sube 20 px, crece, se inclina y proyecta una sombra larga; su sombra en el suelo se encoge.
- Al soltarlo bien: cae en la caja (`caeEnCaja`: sube, gira y se hunde a escala 0.42), la caja rebota como
  cartón (`rebote`), se abre una onda blanca en la boca (`.anillo`) y salen siete estrellas (`estrellaSale`).
- Al soltarlo mal: vuelve a su sitio con un bote blando (`vuelveASitio`).
- La caja correcta, cuando el juguete se acerca, late y enciende su halo (`atrae`).
- Al completar el nivel: cartel central con entrada rebotada (`cartelEntra`), confeti y luz más cálida.
- Todo respeta `prefers-reduced-motion`: los efectos se acortan y el confeti y las ondas no se dibujan.

## Un solo mensaje a la vez

Hay tres sitios donde puede salir texto: el globo del personaje, la pista de abajo y el cartel central.
Para que no se repita el mismo texto tres veces, `script.js` lo reparte: cuando el cartel está visible,
ni el globo ni la pista muestran nada; y `decirRapido` no duplica la pista que `hablar` ya pinta.

## Archivos

| Archivo | Qué hace |
|---------|----------|
| `config.json` | niveles, zonas, objetos, textos, radios y accesibilidad |
| `reglas.js` | decisiones puras: radios, acierto, validación del config (`ReglasCanasta`) |
| `juguetes.js` | todos los SVG, con color por sufijo (`JuguetesCanasta`) |
| `escena.js` | habitación, cajas, arrastre con punteros y efectos (`EscenarioCanasta`) |
| `demo.js` | demostración automática con la mano de `PedniaTutorial` (`CanastaDemo`) |
| `sonidos.js` | audio sintetizado, sin archivos; canales de fondo y efectos (`SonidosCanasta`) |
| `guia-3d.js` | Zoe (`nina.glb`) y Zeus (`nino.glb`) en las esquinas |
| `script.js` | flujo: inicio → intro 3D → presentación → demo → partida → final |

## Pruebas

```powershell
node tests/js/run-tests.js
```

39 pruebas, 23 de este juego: evaluación del acierto (incluidos los bordes: caja ajena más cerca,
puntero sobre la caja, juguete ya guardado, sin zonas), relación entre los dos radios, coherencia del
config, colores del nivel 2 y que todo tipo declarado tenga dibujo.

## Comprobado en el navegador

Los tres niveles jugados de principio a fin en `http://localhost:8042/catalogo_juegos/Polimotor/CanastaJuguetesZoeZeus/`
(servidor estático `juegos-canasta` en `.claude/launch.json`): demo, arrastre, acierto, cartel de nivel,
paso de nivel y escena final de victoria. Sin errores de consola propios; los 404 de `/juegos/tts` son
de la ruta de voz de Laravel, que el servidor estático no sirve.

## Pendiente

- No se ha probado en tableta ni con pantalla táctil real (el arrastre usa eventos de puntero, que
  cubren ambos, pero no está verificado en el dispositivo).
- `img/caja.png` queda en la carpeta sin uso; se puede borrar.
