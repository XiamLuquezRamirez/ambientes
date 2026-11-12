# Juegos de precisión (`public/catalogo_juegos/Polimotor/JuegosDePrecision/`)

Notas propias de este juego. Lo común a todos los juegos está en `docs/juegos-escenas-animadas.md`.

- **Espacio vivo**: `espacio.js` / `espacio.css` (`window.Espacio`) reemplazan `Img/FONDO.png`.
  - Vive dentro de `#capa-fondo`, más una capa propia `.esp-estela` (z 1) dentro de `#escena-wrap`.
  - El SVG (1600 × 900, `slice`) tiene un cielo con degradado y 3 nebulosas que respiran. También tiene 3 capas de
    estrellas que titilan, una galaxia que gira, un satélite que cruza, estrellas fugaces, una lluvia de estrellas
    (oculta) y los rayos del hiperespacio (ocultos).
  - Las estrellas salen de un generador con semilla: no se usa `Math.random`.
  - `body.esp-activo #principal` pone un fondo violeta para que no se vea el celeste anterior.
- **Reacciones** (llamadas desde `script.js` por `esp()`, que tolera que el módulo no exista):

  | Llamada | Cuándo | Efecto |
  |---|---|---|
  | `mover(fx, fy)` | al arrastrar | Paralaje: las capas cercanas se mueven más, al revés del cohete. |
  | `estela(fx, fy, ang, cohete)` | al arrastrar | Humo y chispas detrás de la cola, cada ~10 px. |
  | `aro(color)` | al pasar un aro | La nebulosa se tiñe del color del aro y las estrellas destellan. |
  | `error()` | al fallar | Destello rojo y temblor de las estrellas. |
  | `llegada()` | al llegar a la estrella | Lluvia de estrellas fugaces. |
  | `nuevaRuta(i)` | al empezar cada recorrido | Salto corto al hiperespacio (desde el segundo recorrido). |
  | `final(cohete, opts)` | al terminar (Promise, ~9,5 s) | Escena final completa (ver abajo); luego viene la cortina de victoria. |

- **Escena final** (`final()` y `llegadaPlaneta()` en `espacio.js`; `opts`: `estrellas`, `imgVuelo`,
  `imgCohete`, `imgEstrella`, `texto`). **Todo pasa en la misma pantalla: sin hiperespacio, sin destello, y el
  cohete nunca sale de la vista** (el usuario lo pidió así; la versión con hiperespacio se sentía como un cambio
  de pantalla).
  1. En la capa fija `.esp-escena` (z 30), `.esp-nave` toma el lugar exacto del cohete del juego: el mismo
     centro, tamaño y giro. El cohete del juego se oculta con `visibility`.
  2. Vuela por un `offset-path` que empieza en ese punto y con su mismo rumbo. Da un rizo a la izquierda y otro
     a la derecha, y llega desde la derecha a flotar sobre la cima (`rutaVuelo()` devuelve el path y el rumbo
     final). Mientras tanto, `body.esp-final` esconde aros, estrella y planetas, y a los 1,6 s sube el planeta
     de fiesta.
     - `offset-rotate: auto 90deg`, porque el PNG mira hacia arriba.
     - Al aterrizar, `.esp-nave-cuerpo` gira `--enderezar` (lo que compensa el rumbo final) y baja `--baja` px.
  3. Vuela con `imgVuelo` (`COHETE.png`, con la llama pintada). Al tocar el suelo cambia a `imgCohete`
     (`COHETE_2.png`, sin llama), y salen polvo y bandera, y el planeta rebota.
     - Si el navegador no soporta `offset-path`, el cohete solo aparece y baja.
  4. Una estrella por recorrido (`totalRutas`) sale del cohete a un arco sobre el planeta (−142° a −38°,
     radio 1,75 R). Una `polyline` las une dibujándose con `stroke-dashoffset`.
  5. El letrero `textos.mision` ("¡Misión cumplida!") y 5 fuegos artificiales (`PedniaFx.estallido`).
  - Sonidos: regreso (vuelo), aparece (planeta), bote (aterrizaje), tic (cada estrella), correcto (letrero).
  - **Nunca dejar la pantalla vacía**: la escena no se funde, queda quieta debajo de la cortina y se quita
    después.
  - Las capturas del navegador integrado salen atrasadas o mezcladas con capas viejas en esta escena. Para
    comprobarla, medir con `getBoundingClientRect` (por ejemplo, el centro de `.esp-nave` cada 180 ms).
  - Para revisarla en una prueba: llamar `Espacio.final(...)` y, en el momento que se quiera ver,
    `Espacio.limpiar()`, que cancela los temporizadores y deja la escena congelada en pantalla.
- **Giro suave del cohete** (`script.js`):
  - El rumbo se mide cuando el dedo avanzó 16 px (`rumboDesde`), no en cada evento.
  - `apuntarCohete()` lleva `angMeta` por el camino corto (±180°), sin normalizar a 0–360, así nunca da la vuelta
    entera.
  - `pasoGiro()` acerca `angMostrado` a `angMeta` en cada cuadro, con un suavizado independiente de los fps.
  - `colocarCohete(x, y, ang, conservarGiro)`: con `conservarGiro` solo mueve la posición; sin él, fija el ángulo
    de golpe (inicio, regreso tras un error, redimensionar).
- **Paso por el aro** (`script.js`):
  - `dentroDelHueco()` usa el óvalo del hueco real, medido en el PNG: ±13 % de ancho y ±33 % de alto del aro.
    Se usa un óvalo de 0,16 × 0,31, ajustado por la `tolerancia` del nivel. Antes era un círculo central y no
    contaba pasar por la parte baja del hueco.
  - `evaluarTrayecto()` revisa puntos cada 6 px entre dos eventos, para que un cruce rápido no se salte el aro.
  - La regla de "aro fuera de orden" sigue con el círculo central pequeño (`radioHit`), para no castigar roces.
