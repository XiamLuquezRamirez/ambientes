# Juegos del catálogo (Polimotor y similares): plantilla general

Plantilla que se usa **de ahora en adelante** para crear o rehacer un juego del kiosco
(`public/catalogo_juegos/<Ambiente>/<Juego>/`). Es general: **ningún juego edita este archivo**. Lo propio de cada
juego (qué dibuja, qué pidió el usuario, qué queda pendiente) va en su propia nota:

```
docs/juegos/<ambiente en minúsculas>/<CarpetaDelJuego>.md      ← p. ej. docs/juegos/polimotor/DondeLoUso.md
```

Complementa `docs/catalogo-juegos.md` (estructura general del catálogo) y `docs/juegos-phaser-runtime.md` (host
Phaser). El modelo de referencia más completo es `Polimotor/DondeLoUso/` (y antes `UnePartesCuerpo/`): ante la duda,
copiar de ahí.

---

## 1. Cómo trabajamos con el usuario

- **La imagen de referencia manda.** Lo que no sale en ella no se agrega por iniciativa propia. En particular:
  **no poner personajes (Zeus, Zoe) durante la partida** si la referencia no los muestra, y **no crear personajes
  nuevos ni modelos 3D** sin preguntar antes.
- Si el usuario pide "crea nuevos objetos, no reutilices", todos los dibujos del juego se hacen desde cero
  (`iconos.js`); los personajes compartidos (Zoe 3D, Zeus 3D, GIF de la victoria) sí se reutilizan.
- Antes de rediseñar un juego existente: abrirlo, describir lo que se ve y **proponer 2-4 ideas con
  `AskUserQuestion`** (una recomendada).
- La lógica de un juego existente no se reescribe: se agregan capas visuales que la lógica avisa.
- Cada cambio se verifica en el navegador y se reporta con datos concretos (px, estados, errores de consola).
- **Solo tableta y computador.** No se diseña ni se prueba para teléfonos.
- **SQL solo del juego nuevo** (ver § 9). Nunca volver a insertar toda la base.
- No se hace commit sin que el usuario lo pida. No se borra `img/fondo.png` aunque quede sin uso.
- Errores que el usuario ya corrigió y no se repiten:
  - medir la caja contenedora en lugar del dibujo real;
  - animar por separado partes que deben moverse juntas;
  - quitar elementos que el usuario quería;
  - poner botones extra en el flujo (p. ej. "¡Continuar!" antes de la demo: la demo arranca sola).

---

## 2. Flujo estándar de un juego

```
pantalla de inicio (¡Empecemos!)
  → intro 3D compartida (diálogo Zeus/Zoe de config.textos.conversacion; Omitir / CONTINUAR)
  → PedniaEdad (elige el nivel; suele ser automático)
  → PRESENTACIÓN  cartel con el título sobre la escena vacía · Zoe 3D entra caminando y saluda ·
                  aparecen los elementos del juego · se muestra brevemente la mecánica
  → DEMO          automática, SIN botón antes: mano de PedniaTutorial que hace 1-2 jugadas de ejemplo
                  (no cuentan, no consumen tiempo, el input está bloqueado con body.demo-lock) · "¡Excelente!…"
  → Zoe se va caminando
  → botón único "¡Comenzar a jugar!"
  → PARTIDA       solo la escena del juego · las voces de Zoe y Zeus se oyen, sin personajes en pantalla
                  (salvo que la referencia los muestre) · rondas opcionales (§ 6)
  → FINAL         la escena celebra (brillos, confeti PedniaFx) · cartel de logro ("¡LO LOGRASTE!") ·
                  Zoe vuelve a entrar y celebra a la vista (gestos "celebra" y "final") · voces de felicitación
  → VICTORIA      compartida (../../final): texto de cierre, trofeo, "¿Quieres jugar nuevamente?" Sí / No
```

- "Mostrar intro (demostración)" en el menú de accesibilidad apaga la demo; el botón "¡Comenzar a jugar!" sigue.
- Todo error del niño es amable: sin vidas, sin puntos negativos, sin mensajes agresivos.
- Ayuda automática: tras unos segundos sin tocar nada, se destaca un elemento pendiente y Zoe da una pista con voz;
  tras varios errores con el mismo elemento, la respuesta brilla suave (sin resolverla).

---

## 3. Estructura de archivos

| Archivo | Global | Qué hace |
|---|---|---|
| `index.html` | — | Fondo (SVG animado), pantalla de inicio, intro 3D, `#principal` (cabecera, escena, progreso), `#guia` (Zoe 3D), botón central, menús, victoria. Scripts con `?v=AAAAMMDDx`. |
| `style.css` | — | Estilos del juego (copiar la base del modelo y cambiar colores/fondo). |
| `config.json` | — | Datos del juego (§ 4). Nada de datos "quemados" en el código. |
| `reglas.js` | `Reglas<Juego>` | **Puro**: valida y decide (por identificadores, nunca por el texto visible). También `module.exports` para la prueba de node. |
| `iconos.js` | `Iconos<Juego>` | Dibujos SVG (viewBox 120 × 120) que la escena rasteriza a textura. |
| `escenario-phaser.js` | `Escenario<Juego>` | Escena Phaser 4: dibuja y anima, no decide. API con Promises y respaldo por tiempo (§ 8). |
| `conexiones.js` / `arrastre.js` | — | Entrada con el input de Phaser (ratón y dedo, solo el primer puntero). Callbacks a `script.js`. |
| `demo.js` | `<Juego>Demo` | Micro-tutorial con la mano de `PedniaTutorial` sobre la escena real; recibe un `api` de `script.js`. |
| `guia-3d.js` | `Guia3D` | Zoe 3D (copiar tal cual del modelo; el host es `#guia .guia-pj`). |
| `script.js` | — | Flujo (§ 2), voces, ayudas, progreso, rondas, final y victoria. |
| `<juego>.png` | — | Icono 256 × 256 de la pantalla de inicio y del catálogo (`juegos.imagen`). |

Prueba de node: `scripts/probar-<slug>.js` (reglas, `config.json` válido, cada `icono` existe en `iconos.js`,
textos pedidos por el enunciado).

---

## 4. `config.json` (esqueleto)

```json
{
  "nombre": "…",
  "mostrarFeedBack": true,
  "accesibilidad": { "altoContraste": false, "mostrarIntro": true, "ayudaAutomatica": true,
                     "mostrarProgreso": true, "letterSpacing": 2, "volumenFondo": 20, "rate": 5 },
  "audios": { "tema": "polimotor", "acierto": "../../sounds/ok.mp3", "cierre": "../../sounds/victory.mp3",
              "fondo": "../../sounds/fondo.mp3" },
  "juego": { "ayudaMs": 11000, "ayudaRepetirMs": 13000, "erroresParaBrillo": 2 },
  "rondas": [
    { "id": 1, "titulo": "RONDA 1", "instruccion": "…", "destacar": "<id>", "…datos de la ronda…": [] }
  ],
  "textos": {
    "tituloIntro": "…", "subtituloIntro": "…", "bienvenida": "…", "saludoCorto": "…",
    "demoFin": "¡Excelente! …", "botonComenzar": "¡Comenzar a jugar!",
    "acierto": "…", "errorZeus": ["…", "…"], "progreso": "…",
    "rondaListaTitulo": "¡RONDA 1 LISTA!", "rondaLista": "…", "rondaSiguienteTitulo": "¡RONDA 2!",
    "finalTitulo": "¡LO LOGRASTE!", "finalSub": "…", "finalZoe": "…", "finalZeus": "…", "cierre": "…",
    "conversacion": [ { "personaje": 1, "texto": "…" }, { "personaje": 0, "texto": "…" } ]
  },
  "demo": { "pasos": [ { "…": "…", "texto": "…" } ] },
  "niveles": [ { "id": "5", "edad": "5-6 años", "titulo": "…" } ]
}
```

- Las categorías y respuestas correctas viven en los datos (p. ej. `parejas`, `categoria`), nunca en el nombre del
  dibujo.
- Los textos de voz del enunciado se copian literalmente y la prueba de node los comprueba.

---

## 5. `script.js`: piezas que se repiten

| Función | Qué hace |
|---|---|
| `hablar(texto, "zoe"\|"zeus", gesto, nube)` | Voz con `TextoVoz.hablar` (Promise). La nube de Zoe solo se ve si Zoe está en escena. |
| `zoeEntra()` / `zoeSale()` | Zoe 3D camina con `setTimeout` (no transición CSS) a su hueco (`zonaZoe()` de la escena) o sale por la izquierda. |
| `gestoGuia(nombre)` | Gestos de Zoe 3D: `saluda`, `senala`, `celebra`, `duda`, `final`. |
| `mostrarCartel(titulo, sub, ms)` / `ocultarCartel()` | Cartel central (título de la presentación, "¡Muy bien!" de la demo, fin de ronda, logro final). |
| `esperarBoton(texto, icono)` | Botón central grande; se usa **solo** para "¡Comenzar a jugar!". |
| `presentar()` → demo → `zoeSale()` → `comenzarRonda()` | Arranque único (`partidaIniciada`), el selector de edad puede avisar dos veces. |
| `programarAyuda()` / `limpiarAyuda()` | Pista con voz y meneo tras `ayudaMs` sin tocar; se cancela con cualquier toque. |
| `pintarProgreso()` | Barra "<RÓTULO>: n/total" (+ cinta "RONDA n/total" si hay rondas). |
| `terminarJuego()` → `mostrarVictoria()` | Final (§ 2) y victoria compartida (`iniciarSecuenciaVictoria`). |
| `apiDemo()` | Lo único que ve `demo.js`: decir, destacar, coordenadas de pantalla, tomar/mover/fijar, felicitar, terminar (borra todo lo de la demo). |

Accesos a módulos siempre protegidos: `function escenario() { return window.X && window.X.listo() ? window.X : null; }`.

---

## 6. Rondas (cuando el juego tiene más de una)

- `config.rondas` es una lista; `Reglas.ronda(cfg, i)` devuelve la ronda lista para las demás funciones, y
  `script.js` trabaja siempre con `cfgR()` (la ronda actual).
- Los identificadores no se repiten entre rondas (`revisarJuego` lo comprueba).
- Fin de una ronda que no es la última: la escena celebra → cartel "¡RONDA n LISTA!" + voz → los elementos salen
  (`ocultar…`) → `cargarRonda(cfgR())` → cartel "¡RONDA n+1!" → entran los nuevos → `comenzarRonda()` (instrucción
  de voz de la ronda). Solo la última ronda lleva al final.

---

## 7. Capas, diseño y sonido

```
body
├── .<juego>-fondo   position:fixed; inset:0; z-index:0; pointer-events:none   ← SVG animado (viewBox 1600×900, slice)
├── #principal       z-index:1   cabecera (Inicio, reiniciar, edad, título) · escena Phaser · barra de progreso
├── #guia            z-index:20  Zoe 3D (fija; script.js le pone left/top/width/height)
├── botones redondos z-index:1500  arriba a la derecha: pantalla completa, accesibilidad, volumen
├── #comenzar-wrap   z-index:1200  "¡Comenzar a jugar!"
└── #final           z-index:2000  victoria compartida
```

- Fondo vivo con animaciones suaves (`--i` para desfasar) y siempre un bloque `@media (prefers-reduced-motion)`.
  El `body` lleva un color igual al del fondo para que no se vea un hueco mientras carga.
- Escena Phaser con `Scale.RESIZE`, `touch-action: none` en su contenedor y `scale.updateBounds()` antes de cada
  toque. Diseño calculado en `reacomodar()` según el tamaño real; modos para pantalla ancha y tableta vertical.
- Portátiles bajos (`max-height: 720px`) y tabletas (`max-width: 1100px`, `max-aspect-ratio: 1/1`): cabecera y barra
  más compactas. Nada para teléfonos.
- Sonidos: `shared/pednia-audio.js`, tema `polimotor`. `sonarEvento(nombre, opts)` solo acepta **eventos**:
  `acierto`, `enRed`, `error`, `regreso`, `agarrar`, `soltar`, `bote`, `victoria`, `encaje`, `tic`, `correcto`,
  `aparece` (`opts.tasa` cambia el tono, `opts.vol`, `opts.retraso`). Los nombres del sprite (`redoble`, `vuelo`…)
  no son eventos. **No agregar archivos con tonos puros** (el "pitido").
- Voces: `TextoVoz` pide el audio a `/juegos/tts` (Laravel). Con el servidor estático de pruebas esas peticiones dan
  404: es normal.

---

## 8. Escena Phaser: reglas de oro

- La escena **dibuja**; `reglas.js` **decide**; `script.js` **ordena el flujo**.
- Cada animación que el flujo espera devuelve una Promise **con respaldo por tiempo** (`tw()` que resuelve aunque
  Phaser no avance: con la pestaña oculta los tweens no corren).
- Dibujos SVG → textura con `Image` + canvas a resolución 2 (`RES`), escala `1 / RES`.
- Lo que se mueve cada cuadro (líneas, halos) se redibuja en `update`; las posiciones salen de los objetos reales
  (`getWorldTransformMatrix`), nunca de números fijos en pantalla.
- `puntoDe(id)` da coordenadas de pantalla para la mano de la demo y para las pruebas.
- Textos de tarjetas: la palabra más larga cabe a lo ancho; después se parte en líneas sin cortar palabras.

---

## 9. Registro en la base de datos

Archivo nuevo `database/insertar_<slug>.sql` con **solo** el juego nuevo, idempotente y sin tocar nada más:

```sql
INSERT INTO `juegos` (`slug`, `ambiente_id`, `eje_id`, `tematica_id`, `modulo_id`, `ruta`, `nombre`,
                      `descripcion`, `imagen`, `color`, `orden`, `activo`, `created_at`, `updated_at`)
SELECT '<slug>', <ambiente>, <eje>, <tematica>, <modulo>, 'catalogo_juegos/<Ambiente>/<Carpeta>', '<Nombre>',
       '<descripción con edad y mecánica>', '<juego>.png', '#rrggbb', <orden>, 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `juegos` WHERE `slug` = '<slug>')
  AND EXISTS (SELECT 1 FROM `ambientes` WHERE `id` = <ambiente>)
  AND EXISTS (SELECT 1 FROM `ejes` WHERE `id` = <eje>)
  AND EXISTS (SELECT 1 FROM `tematicas` WHERE `id` = <tematica>)
  AND EXISTS (SELECT 1 FROM `modulos` WHERE `id` = <modulo>);
```

- Tomar ambiente, eje, temática y módulo de un juego hermano en `database/ambientes.sql` (tabla `juegos`); el `orden`
  es el siguiente libre de esa temática. La edad no va en la base: está en `config.json` (`niveles`).
- Agregar la misma fila al volcado `database/ambientes.sql` (en orden alfabético del slug), sin tocar otras filas.
- Aplicar solo en la base **local** (no hay `mysql` en el PATH: con PHP/Laravel y `DB::unprepared`) y comprobar que
  ejecutarlo dos veces no duplica. Nunca en producción.

---

## 10. Cómo probar (navegador integrado)

1. `preview_start` con `juegos-estatico` (puerto 8010 sobre `public/`; si está ocupado, `juegos-estatico-2` o abrir
   la URL con `preview_start {url}`): `http://localhost:8010/catalogo_juegos/<Ambiente>/<Juego>/index.html?r=N`.
   Probar a 1366 × 768, 1024 × 768 y tableta vertical (768 × 1024); volver a `desktop` al terminar.
2. Saltar la pantalla de inicio y la intro 3D:

   ```js
   document.getElementById('pantalla-inicio').hidden = true;
   document.body.classList.remove('esperando-inicio');
   cerrar_anuncio();
   ```

   Para ir rápido: `gameConfig.mostrarFeedBack = false` (sin voces) y `gameConfig.accesibilidad.mostrarIntro = false`
   (sin demo). Los botones aparecen más tarde de lo que parece: esperar a que `#comenzar-wrap` deje de estar oculto.
3. Phaser no responde a `PointerEvent` simulados; sí a `MouseEvent`: `mousedown`, `mousemove` y `mouseup` en el
   canvas con las coordenadas de `Escenario.puntoDe(id)`.
4. Comprobar con datos (`getBoundingClientRect`, estado del juego, errores capturados con
   `window.addEventListener('error', …)`) y con capturas. Revisar la consola: solo se aceptan los 404 de `/juegos/tts`.
5. El táctil real solo se puede probar en una tableta (el panel solo emula toques en anchos de teléfono).

Recorrido mínimo antes de entregar: inicio → intro → presentación → demo → "¡Comenzar a jugar!" → aciertos y
errores → cada ronda → final con Zoe celebrando → victoria → reinicio, sin errores de JavaScript.

---

## 11. Trampas conocidas

- **Escala de Phaser**: `setScale(1.08)` es absoluto sobre el tamaño original de la textura. Usar
  `base = tamañoDeseado / sprite.width` y escalar `base * k`.
- **Panel del navegador oculto**: no corren `requestAnimationFrame` ni las transiciones, las medidas salen falsas y
  las capturas llegan tarde. No depender de `requestAnimationFrame` para algo importante (usar `setTimeout`); para
  avanzar Phaser a mano: `setInterval(() => juego.loop.step(performance.now()), 16)`.
- **PedniaEdad elige el nivel solo**: llamar además `confirmarNivel()` en una prueba corre el juego dos veces.
- Las `let` de nivel superior de `script.js` no están en `window` (usarlas por su nombre en las pruebas); las
  funciones declaradas sí son globales.
- Un cartel o letrero de **alto variable** hace "saltar" la escena al cambiar el texto: darle alto fijo.
- GSAP (`*-anim.js`): no usar `stagger`; `clearProps` no se aplica con `keyframes` ni `yoyo` (limpiar en
  `onComplete`); no usar `Math.random` (el juego baraja con él).
- En Git Bash, un heredoc con ciertas comillas puede fallar ("unexpected EOF"): escribir el script a un archivo y
  ejecutarlo.

---

## 12. Nota propia de cada juego

Al crear o cambiar un juego se crea o actualiza **solo** su nota `docs/juegos/<ambiente>/<Carpeta>.md` con:

- tema, edad, temática y escena (qué se ve);
- pedidos y correcciones del usuario para ese juego (con fecha);
- tabla de sus archivos y globales si difieren de la plantilla;
- cómo probarlo (`node scripts/probar-<slug>.js`, funciones útiles en el navegador);
- registro en la base (slug, orden, imagen, color);
- pendientes.

Este archivo (`docs/juegos-escenas-animadas.md`) solo cambia si cambia la plantilla para **todos** los juegos.
