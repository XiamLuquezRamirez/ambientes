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

- Usa la bandeja **HTML** (modo SVG), no `phaser-juego.js`.
- Cada pieza tiene **tarjeta** (borde punteado, relleno de 10 px y fondo blanco) y **se conserva**.
- `margenTarjeta(el)` en `script.js` suma relleno + borde (leídos del estilo calculado), y `aplicarTamanoHueco`
  agranda la tarjeta en esa cantidad. Así el **dibujo** mide exactamente lo mismo que su hueco en la silueta.

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
- Rompecabezas: propuestas sin elegir: "El cuerpo cobra vida" (recomendada) o "Vestidor de muñeca".
- Arrastrar y soltar: en pantallas altas queda piso vacío bajo las cajas; se ofreció agrandarlas o bajarlas.
- Memoria corporal: a 600 px de alto, 4 opciones en dos filas no caben (pasaba también antes de los cambios).
