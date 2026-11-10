# Juegos Polimotor: fondos interactivos, animaciones y escenas finales

Referencia del trabajo hecho en noviembre de 2026 sobre los juegos de `public/catalogo_juegos/Polimotor/`.
Complementa `docs/catalogo-juegos.md` (estructura general) y `docs/juegos-phaser-runtime.md` (host Phaser).

Objetivo de la línea de trabajo: que cada juego "parezca juego real". Eso significa tres cosas:

- Un **fondo vivo** (SVG o Phaser) en lugar del `img/fondo.png` estático.
- Un **fondo que reacciona** a lo que hace el niño: arrastrar, acertar, fallar o señalar una opción.
- Una **escena final propia** antes de la pantalla de victoria compartida (`final/`).

## Cómo trabajamos con el usuario

- Antes de rediseñar un juego: abrirlo en el navegador, describir qué se ve hoy y **proponer 2-4 ideas con
  `AskUserQuestion`**, marcando una como recomendada. El usuario elige o combina ideas, por ejemplo "teatro + cartas".
- La lógica del juego (rondas, aciertos, niveles) **no se reescribe**: se agregan capas visuales que la lógica avisa.
- Cada cambio se verifica en el navegador y se reporta con medidas concretas (px), no con "debería verse bien".
- No se borra `img/fondo.png` aunque quede sin uso. No se hace commit sin que el usuario lo pida.
- Errores pasados que el usuario corrigió:
  - Quitar elementos que él quería, como la tarjeta detrás de las piezas del rompecabezas.
  - Medir la caja contenedora en lugar del dibujo real (en Ensamblajes, la batería tapaba la cabeza y las llamas salían en el tobillo).
  - Animar partes sueltas que debían moverse juntas, como el brazo y la mano del robot.

## Patrón común (capas)

```
body
├── #<fondo>       position:fixed; inset:0; z-index:0; pointer-events:none   ← SVG animado
├── #principal     position:relative; z-index:1                             ← juego (no tocar su lógica)
├── #<capa>        position:fixed; inset:0; z-index:30; pointer-events:none ← efectos sobre el juego
│                  (los elementos que se tocan, como la palanca, llevan pointer-events:auto)
├── #final         z-index:2000                                             ← victoria compartida
└── .pieza-fantasma z-index:5000                                            ← lo que se arrastra
```

- Módulo propio por juego: `<nombre>.js` + `<nombre>.css` que expone `window.<Nombre>` con métodos como
  `fase()`, `progreso()`, `arrastre()`, `acierto()`, `error()` y `final()`, el que devuelve una Promise.
- En `script.js` se agrega un accesor que devuelve `null` si el módulo no cargó, y cada aviso va protegido:

  ```js
  function lab() { return window.Laboratorio || null; }
  if (lab()) lab().acierto(pieza.id);
  ```

- El `body` deja de usar `img/fondo.png`. Su `background` pasa a un color o degradado igual al de la escena,
  para que no se vea el fondo viejo mientras carga.
- SVG de fondo con `viewBox="0 0 1600 900"` y `preserveAspectRatio="... slice"`:
  - `xMidYMid` para fondos centrados.
  - `xMinYMin` cuando el lado derecho queda tapado por la bandeja: así el recorte en pantallas 4:3 cae a la derecha.
- Animaciones en CSS con `--i` para desfasar elementos (`animation-delay: calc(var(--i) * -0.17s)`).
- Siempre un bloque `@media (prefers-reduced-motion: reduce)` que apaga las animaciones largas.
- Subir `?v=AAAAMMDDx` en `index.html` en cada archivo tocado. Algunos `style.css` no tenían versión: agregarla.

### Sonidos disponibles (`shared/pednia-audio.js`, tema `polimotor`)

`sonarEvento(nombre, opts)` solo acepta **eventos**:

- `acierto` (vuelo)
- `enRed`
- `error`
- `regreso`
- `agarrar`
- `soltar`
- `bote`
- `victoria` (redoble + ovación)
- `encaje`
- `tic`
- `correcto` (encaje + aplausos)
- `aparece`

`redoble`, `vuelo`, etc. son nombres del sprite, **no eventos**: no suenan si se llaman como evento.
No agregar archivos de sonido con tonos puros (el proyecto los evita por el "pitido").

## Por juego

### Lateralidad (`Polimotor/Lateralidad/`)

- **Un escenario por reto**, en `img/escenas/`:
  - `general.svg` (intro y elegir edad)
  - `castillo.svg` (sendero)
  - `huerto.svg` (atrapa)
  - `parque.svg` (parejas)
  - `cuarto.svg` (estante)
- Capa `#escena-fondo` con una `.escena-capa[data-escena]` por escenario y fundido por `opacity`.
  `ponerEscena(tipo)` en `script.js` se llama en `iniciarRetoActual` y en `confirmarNivel` (con el escenario `general`).
- **Sendero = castillo con 3 torres**: cada `.sendero-ramal` dibuja su torre con `::before` (piedra) y su tejado con
  bandera del color del lado con `::after`. Las medidas se definen en las variables de `.sendero-ramales`:
  `--torre-sobre`, `--torre-techo` y `--torre-lado`. Los caminos son de tierra, de un solo color y más delgados
  (ancho 26–42 px en `sendero.js`).
- El césped empieza en la base de las torres: `medirSuelo()` en `sendero.js` escribe `--suelo-sendero` en `:root`,
  y la capa del castillo dibuja el pasto con un `linear-gradient` desde ese punto. Se vuelve a medir a los 700 ms
  porque la animación de entrada mueve la escena.
- Colores de lado: izquierda `#ffd43b`, centro `#4dabf7`, derecha `#51cf66` (`coloresZona` en `config.json`).
  Coinciden con los botones PNG y **no se cambian**.

### Secuencia de movimiento (`Polimotor/SecuenciaDeMovimiento/`)

- **Tren de tarjetas**: una locomotora de vapor y un vagón por pose; el último vagón trae el "?".
- Funciones en `script.js`: `montarTren`, `llegarTren`, `cargarTren`, `mostrarPregunta`, `repasarTren`, `partirTren`
  y `presentarSecuencia`. Reemplazaron a `reproducirSecuencia` y `renderRielEstatico`.
- Ritmo: cada paso tiene `bote`, rebote del vagón y un número grande `.tren-conteo`.
- Al acertar: repaso rápido, aplausos y el tren sale acelerando hacia la izquierda. Al fallar, el tren se queda y repasa.
- El hueco conserva la clase `.slot-pose.hueco` porque `moverTarjetaAlHueco` lo mide para el vuelo de la tarjeta.

### Memoria corporal (`Polimotor/MemoriaCorporal/`)

- **Teatro + cartas**: `#teatro` (cenefa, foco, piso, dos `.telon`) envuelve `#secuencia`.
  `htmlCarta(id, {mini, abajo})` crea cartas con frente y dorso; `.boca-abajo` las voltea.
- Funciones: `moverTelon/abrirTelon/cerrarTelon`, `volar`, `presentarMemoria` (cada pose en grande bajo el foco
  vuela a su carta), `esconderCartas` (voltear y bajar el telón), `revelarPista(ids, hueco)` y
  `revelarSecuenciaAcierto(btn)`, donde la opción vuela al hueco y la fila salta en ola.
- **Fondo vivo** `fondo-vivo.js/.css` (`window.FondoVivo`). Es una sala de teatro en azul noche y dorado:
  guirnalda de bombillas, dos reflectores, palcos, público en siluetas y destellos.
  - `fase('memoria')`: la sala se oscurece y los reflectores enfocan el escenario.
  - `fase('opciones')`: vuelven las luces.
  - `apuntar(el)`: los reflectores siguen a la opción señalada (`pointerover`/`focusin`) y la opción recibe `.fv-iluminada`.
  - `acierto(el)`: haces dorados, público saltando y confeti SVG.
  - `error(el)`: haces y halo rojos, y el público hace "oh".
  - `celebrar()`: al terminar el juego.
  - Para apuntar se usa `svg.getScreenCTM().inverse()`, que pasa de pantalla a coordenadas SVG.

### Arrastrar y soltar objetos (`Polimotor/ArrastrarYSoltarObjetos/`)

- **La fábrica en Phaser** (`phaser-juego.js`). Se mantuvo el contrato con `script.js`:
  `montar`, `cargarRonda(objetos, destinos, {segundosCinta})`, `setInteractivo`, `cancelarDrag`, `demoLlevar`,
  `rectPantalla`, `cerrarPedido(final)` y `destruir`.
- La escena tiene una máquina que fabrica los objetos, una cinta transportadora (tileSprite + rodillos),
  la tolva de reciclaje, engranajes y el piso con franja de seguridad.
- Los objetos avanzan con `s` (distancia recorrida): `s < 0` significa que están dentro de la máquina;
  al pasar el final de la cinta caen a la tolva y vuelven a salir.
- La cinta se detiene mientras el niño arrastra y mientras se resuelve un drop.
- `config.json → niveles[].segundosCinta`: 3 años = 11, 4 años = 9, 5-6 años = 7.
- La cinta queda bajo la nube del enunciado: `bordeEnunciado()` mide `.enunciado-wrap`, y un `ResizeObserver`
  reacomoda la escena si el texto cambia de alto.
- **Cierre**: `cerrarPedido(false)` cierra las cajas (solapas y cinta adhesiva) y las saca por abajo entre rondas.
  `cerrarPedido(true)` hace llegar un camión, las cajas saltan a la carga y el camión se va antes de la victoria.
- Objetos: 38 SVG en `img/objetos/`, con contorno `#1e3a5f` y `viewBox` 0 0 200 200.
  El generador está en el scratchpad de la sesión (`svgs_fabrica.py`); los SVG ya están en el repo.
- Se quitó la regla de `style.css` `@media (max-width:900px) .escena-wrap { padding-top:22vh }`:
  empujaba el lienzo y dejaba una franja vacía arriba.

### Rompecabezas del cuerpo (`Polimotor/Rompecabezas/`)

- Usa la bandeja **HTML** (modo SVG), no `phaser-juego.js`. Tiene la misma base que Ensamblajes:
  `#figura-svg .svg-parte` con capa gris y capa de color, y `translate(%)` en línea.
- Cada pieza tiene **tarjeta** (borde punteado, relleno de 10 px y fondo blanco) y **se conserva**.
- `margenTarjeta(el)` en `script.js` suma relleno + borde (leídos del estilo calculado), y `aplicarTamanoHueco`
  agranda la tarjeta en esa cantidad. Así el **dibujo** mide exactamente lo mismo que su hueco en la silueta.
- **"El cuerpo cobra vida"** en `habitacion.js/.css` (`window.Habitacion`), con dos capas:
  `#hab-fondo` (SVG del cuarto + tapete) y `#hab-capa` (bola de espejos, galería final y confeti).
  - **Fondo SVG**: lámparas que se balancean (sus haces iluminan la figura), repisa con cubos y una pelota,
    un solo cuadro **decorativo** (flor) a la izquierda y un piso. `preserveAspectRatio="xMidYMax slice"`.
    Nada de cuadros a la derecha ni con partes del cuerpo: el usuario dijo que se confundían con las fichas.
  - Nombres de las partes: `nombreBonito(id, nombre)` quita guiones bajos, pone der/izq en palabras y mayúscula
    inicial. `nombrePieza` en `script.js` ya incluye `pie_izq` y `pie_der`.
  - **Tapete con luces** (div en la capa de fondo): `ubicarTapete()` lo centra bajo los pies medidos de la figura.
  - `listo()`: al armar el tablero.
  - `arrastre(on)`: atenúa el cuarto y hace brillar la silueta. Las pistas del hueco siguen siendo las del juego
    ("Resaltar destino").
  - `acierto(id, nombre, hablar)`: destello y tapete verdes, Zoe dice el nombre y la parte hace un gesto **en su
    lugar**:
    - Cabeza: asiente.
    - Brazos y manos: un latido (escala).
    - Piernas y pies: un pasito.
    - Tronco: respira.
  - `error()`: destello y tapete rojos.
  - `final(opts)`, en orden:
    1. Las luces se vuelven de colores y baja la bola de espejos.
    2. La bandeja desaparece y en su lugar entra una **galería** con todas las partes y sus nombres.
    3. La figura baila **entera** (`#lienzo.hab-baila`: rebote y balanceo) mientras Zoe repasa las partes.
    4. Confeti y despedida (`textos.despedida`).
  - Después, `script.js` llama a `mostrarVictoria()`.
- Gestos: `animarPartes(partes, pivote, clase, vars, ms)` pasa el pivote (en pantalla) a las coordenadas de cada
  parte y anima con `translate(var(--tx), var(--ty)) …`. Los saltos (`--salto`) se convierten de px de pantalla a
  unidades del SVG.
- **No levantar ni girar brazos o manos** (ni al colocarlos ni en el final). Al girar una parte se ve el corte con
  su vecina, y en el nivel de 10 piezas la mano se queda en su sitio si todavía no está puesta. El usuario lo
  rechazó: los gestos van en el lugar de cada parte y el baile mueve la figura completa.
- `#lienzo` tenía `overflow: hidden` y recortaba los brazos levantados; con `body.modo-svg` queda `overflow: visible`.
- El baile se aplica a `#lienzo`, no a `#figura-svg`: el SVG trae `transform: scale(escala)` en línea y la
  animación lo pisaría.
- Para probar un nivel sin pelear con el selector de edad: `index.html?edad=6` (10 piezas), `?edad=4` (7) o `?edad=3` (5).

### Reconocimiento del cuerpo (`Polimotor/ReconocimientoDelCuerpo/`)

- La figura es **una sola imagen PNG** (`#img-completo`) con zonas rectangulares (`.zona-toque`, en % del lienzo).
  No hay partes sueltas que animar: los efectos van sobre la zona y la figura entera rebota. Así no hay cortes.
- **"Consultorio vivo"** en `consultorio.js/.css` (`window.Consultorio`), con dos capas:
  `#con-fondo` (SVG + tapete) y `#con-capa` (escáner, diploma y confeti).
  - **Fondo SVG**: vitrina con frascos que burbujean, monitor de latidos (línea de electro que corre y "♥ 80"),
    negatoscopio y escritorio con lámpara.
  - `listo()`: limpia las curitas y ubica el tapete bajo los pies.
  - `reacomodar()`: se llama en `img.onload` y en el `ResizeObserver` del lienzo.
  - `acierto(id, objetivos, nombre)`:
    - El monitor pasa a ♥ 120 y late rápido.
    - El negatoscopio muestra el hueso de esa parte (`RAYOS`: cráneo, mano, pie, brazo, pierna, hombro, rodilla,
      codo, tobillo o barriga; la radiografía de pecho es la de reposo).
    - Las placas son dibujos anatómicos simplificados hechos con helpers en `consultorio.js`:
      `hueso(x1,y1,x2,y2,ancho,cabeza)` (diáfisis más delgada al centro, epífisis y médula),
      `blando()` (silueta difusa de tejido), `vertebra()`, `costilla()`, `falanges()` y `espejo()`.
      Coordenadas locales de la placa: unos 200 × 240. Estilo en `consultorio.css` (`.rx-*`) con
      degradado `#con-hueso`, brillo `#con-rx` y desenfoque `#con-blur` definidos en el `<defs>` del fondo.
    - Para revisarlas: copiar el `innerHTML` de `.con-rayos` tras cada `Consultorio.acierto(id, [], '')`
      a una cuadrícula de SVG ampliados (hoja de contactos).
    - Un escáner de luz pasa por todas las zonas correctas.
    - Queda una **curita** pegada en la zona tocada, dentro de `#lienzo` y en %, así sigue a la figura al redimensionar.
    - La figura da un saltito.
  - `error()`: el monitor muestra "BIP" en rojo y la figura tiembla.
  - `final(opts)`: **diploma "Doctor del cuerpo"** con una curita y el nombre de cada parte reconocida
    (`nombreDePregunta`: "Toca las manos." → "Manos"), la figura festeja y cae confeti. Después,
    `mostrarVictoria()`. Textos en `config.json → textos.diploma` y `textos.diplomaSub`.
- Error corregido en `reconocimiento-anim.js → destelloFigura`: mataba **todas** las animaciones de la imagen,
  incluido el fundido de entrada, y la figura podía quedar en opacidad 0 si se tocaba antes de 0,6 s.
  Ahora solo detiene el `filter`.
- Para probar: el centro de algunas zonas (por ejemplo, las manos) cae en un píxel transparente y el juego ignora
  el toque (`pixelFiguraOpaco`). En las pruebas automáticas hay que buscar un punto pintado dentro de la zona.

### Ensamblajes sencillos (`Polimotor/EnsamblajesSencillos/`)

- **Laboratorio de robots** en `laboratorio.js/.css` (`window.Laboratorio`), con dos capas:
  `#lab-fondo` (SVG de fondo) y `#lab-capa` (efectos sobre el juego).
  - **Fondo SVG**: pantalla con código que corre y mensaje "¡BIEN!"/"¡UPS!", tablero de luces, engranajes,
    franja de luces en el piso y techo con compuerta (debajo hay un cielo con estrellas).
  - `progreso(n, total)`: **batería** horizontal sobre la cabeza del robot, una celda por pieza.
  - `arrastre(activo, id, resaltar)`: la sala se atenúa y aparece el **escáner láser**. Cubre el robot entero salvo
    que esté activa la opción "Resaltar destino", que viene apagada por defecto; así no delata la respuesta.
  - `acierto(id)`: destello verde y el **brazo robótico** baja y suelda la pieza con chispas.
  - `error()`: destello rojo.
  - `final(opts)`, en orden:
    1. Palanca "¡Enciende tu robot!", que se toca o se baja sola a los 6 s.
    2. Carga de la batería.
    3. El robot pasa de gris a encendido.
    4. Saludo con burbuja.
    5. Se abre el techo y se prenden las llamas bajo los pies; temblor, humo y despegue.
    6. Fuegos artificiales.
  - Después, `script.js` hace sonar `victoria` y llama a `mostrarVictoria`.
- Textos en `config.json → textos.palanca` y `textos.saludoRobot`.
- **Medir el robot real**: las piezas (`#figura-svg .svg-parte`) se salen de `#lienzo` y la caja de cada
  `<svg>` interno es enorme. `rectRobot()` y `rectDe(el)` unen solo las formas pintadas (`path`, `circle`, `rect`…).
  Se usan para la batería, el escáner, la burbuja y las llamas.
- **Saludo**: `saludarConBrazo()` gira `brazo_N` y `mano_N` **juntos** alrededor del mismo hombro.
  - Cada `.svg-parte` tiene su `translate(x%, y%)` en línea, así que el pivote se convierte a las coordenadas de
    cada parte (`hombro - translate`).
  - El giro se hace con `transform-box: view-box` y un keyframe
    `translate(var(--tx), var(--ty)) rotate(calc(var(--giro) * …))`.
  - El nivel de 3 años trae "brazos" en una sola pieza: ahí el robot solo rebota.

### Juegos de precisión (`Polimotor/JuegosDePrecision/`)

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

### El Espejo de las Posiciones y Lateralidad (`Polimotor/EspejoDeLasPosiciones/`)

Juego nuevo (noviembre de 2026), Transición 5-6 años. Zeus hace una postura en un espejo (izquierda); el niño
la arma en la silueta (centro) con 6 piezas articuladas de la bandeja (derecha). No usa `script.js` monolítico:
cada responsabilidad va en su archivo y expone un global.

| Archivo | Global | Qué hace |
|---|---|---|
| `postura.js` | `Postura` | Reglas puras (sin DOM, también `module.exports`): esqueleto, ángulos, validación, pasos, textos. |
| `muneco.js` | `Muneco` | Dibujo SVG de Zeus articulado (modelo, figura, fichas, fantasma, silueta). |
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
- **Posturas en `config.json → etapas[].posturas[]`** (3 niveles, 3 posturas cada uno; `juego.posturasPorEtapa`
  elige cuántas se juegan). Agregar un reto = agregar una postura con sus `partes`; `orden` opcional cambia los pasos
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
- **Pista de lateralidad visible**: pulsera y franja de la media en amarillo (izquierda) y verde (derecha), los
  mismos colores de Lateralidad; el pulgar mira al centro y la punta del zapato hacia afuera.
- Las fichas muestran la extremidad estirada; el giro se ve en el taller. Una ficha girada lleva un punto azul.
- Arranque único: `iniciarJuego()` tiene la guarda `partidaIniciada` (el selector de edad puede avisar dos veces).
- Si la intro 3D se omite, Zeus dice el desafío (`textos.desafio`) tras la presentación del estudio.
- Probar: `node scripts/probar-espejo-posiciones.js` (lógica y datos). En el navegador, con el truco de "Cómo probar
  rápido"; los arrastres se simulan con `PointerEvent` (`pointerdown` en la ficha o en `.t-pieza` del taller,
  `pointermove`/`pointerup` en `window`). `Arrastre.activo().offset` dice dónde soltar para que el pivote caiga en
  `Arrastre.socketPantalla(socket)`.
- Registro: fila en `database/ambientes.sql` y script idempotente `database/juego_espejo_de_las_posiciones.sql`
  (ambiente 7, eje 11, temática 30 "Juegos de lateralidad", módulo 9, orden 9, imagen `espejo.png`).

## Trampas conocidas

- **Escala de Phaser**: `setScale(1.08)` es absoluto sobre el tamaño de la imagen original (un PNG de 1080 px).
  Hay que usar `base = tamañoDeseado / sprite.width` y escalar `base * k`.
- **Panel del navegador oculto** (`tabs_context` dice "hidden" o `innerWidth` da 0):
  - No corren `requestAnimationFrame` ni las transiciones, y las medidas salen falsas (un SVG sin tamaño mide 300 px).
  - Las capturas llegan con varios segundos de atraso o quedan congeladas.
  - Por eso no hay que depender de `requestAnimationFrame` para mostrar algo importante: usar `setTimeout(…, 30)`.
- **El selector de edad (`PedniaEdad`) elige el nivel solo.** Si además se llama `confirmarNivel()` a mano en una
  prueba, el juego corre dos veces (demo doble). Para forzar un nivel, envolver `window.confirmarNivel` *antes* de
  `cerrar_anuncio()`, o comprobar el estado después.
- Las variables `let` de nivel superior en `script.js` (`piezasEstado`, etc.) **no** están en `window`: en las
  pruebas con `javascript_tool` hay que usarlas por su nombre, no como `window.x`.
- Las funciones declaradas en `script.js` (`destinoEl`, `sonarEvento`, `colocarPieza`…) **sí** son globales, y los
  módulos visuales las usan con `typeof global.fn === 'function'`.
- GSAP (`*-anim.js`):
  - No usar `stagger`.
  - `clearProps` no se aplica con `keyframes` ni con `yoyo`: limpiar en `onComplete`.
  - No usar `Math.random` en esos archivos (el juego baraja con él).

## Cómo probar rápido (navegador integrado)

1. `preview_start` con `juegos-estatico` (Python `http.server` en el puerto 8010 sobre `public/`).
   URL: `http://localhost:8010/catalogo_juegos/Polimotor/<Juego>/index.html?r=N`.
2. Saltar la intro y la demo:

   ```js
   const cbs = [...document.querySelectorAll('#menu-acc-ops input[type=checkbox]')];
   const i = cbs.findIndex(c => /intro/i.test(c.parentElement.textContent));
   cbs[i].checked = false; cbs[i].dispatchEvent(new Event('change'));
   document.getElementById('pantalla-inicio').hidden = true;
   cerrar_anuncio();
   ```

3. Phaser no responde a `PointerEvent` simulados; sí responde a `MouseEvent`: `mousedown` en el canvas y
   `mousemove`/`mouseup` en `window`.
4. Comprobar con medidas (`getBoundingClientRect`) y capturas. Si el panel está oculto, pedir `show_pane` y
   traer la pestaña al frente con `tabs_select`.

## Pendiente o abierto

- Nada de esto tiene commit todavía. Juegos tocados:
  - Lateralidad
  - SecuenciaDeMovimiento
  - MemoriaCorporal
  - ArrastrarYSoltarObjetos
  - Rompecabezas
  - EnsamblajesSencillos
  - ReconocimientoDelCuerpo
  - JuegosDePrecision
  - EspejoDeLasPosiciones (juego nuevo)
- Rompecabezas: hecho "El cuerpo cobra vida". Se probó con la niña en 5 y 10 piezas; falta probar el niño y el
  nivel de 7 piezas.
- Arrastrar y soltar: en pantallas altas queda piso vacío bajo las cajas; se ofreció agrandarlas o bajarlas.
- Memoria corporal: a 600 px de alto, 4 opciones en dos filas no caben (pasaba también antes de los cambios).
- Juegos tocados también: Reconocimiento del cuerpo (consultorio vivo), sin commit.
