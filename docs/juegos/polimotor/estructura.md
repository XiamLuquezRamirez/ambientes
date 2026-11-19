# Estructura general — un juego de Polimotor

Un juego de Polimotor es un paquete estático con un cascarón fijo y una mecánica intercambiable. El cascarón (pantallas, menús, datos mínimos, bibliotecas) es el mismo en los 26 paquetes de `public/catalogo_juegos/Polimotor/`. Los archivos que dibujan y deciden la partida no lo son: tratarlos como una lista única produce un paquete que no arranca.

Esto no es la plantilla para generar un juego nuevo. Esa está en [`docs/juegos-escenas-animadas.md`](../../juegos-escenas-animadas.md). Currículo, edades y claves que el perfil de inclusión puede pisar están en [`parametros-generales.md`](parametros-generales.md).

## 1. Dónde vive

```
public/catalogo_juegos/Polimotor/<Carpeta>/
  index.html          página del paquete
  config.json         datos
  style.css           estilo de este juego
  script.js           flujo
  <icono>             imagen de inicio y de catálogo (juegos.imagen)
  …mecánica…          hueco: ver § 5
```

- No hay categoría ni subjuego. La carpeta cuelga directo de `Polimotor/`.
- La fila de `juegos` abre el paquete con `ruta` = `catalogo_juegos/Polimotor/<Carpeta>` (relativa a `public/`). Sin esa ruta el catálogo no lee el `config.json`.
- Carpeta, slug y nombre visible no tienen por qué coincidir. El slug es kebab-case y único. La edad no va en la base: va en `config.json`.

Al lado, y fuera del paquete:

| Ruta | Papel |
|---|---|
| `Polimotor/comun/` | Fondo de inicio e `interfaz.css`. Lo cargan los 26. `partes-cuerpo.js` no: solo unos pocos. Tocar `comun/` afecta a otros ambientes. |
| `catalogo_juegos/shared/` | Edad, audio, perfil de inclusión, PIN de accesibilidad, efectos. |
| `catalogo_juegos/intro3d/` | Intro compartida (Zeus / Zoe). |
| `catalogo_juegos/final/` | Victoria compartida. |
| `catalogo_juegos/tutorial/` | Mano de la demo. |

## 2. Cascarón de la página

Estas piezas están en los 26 `index.html`.

```
body.esperando-inicio
├── fondo decorativo          fijo, sin puntero; el body usa el mismo color para que no se vea un hueco
├── #pantalla-inicio          icono, título, #btn-empecemos («¡Empecemos!»), volver
├── #intro3d-root             #three-container, #phaser-container, Omitir, CONTINUAR
├── #principal                cabecera (Inicio, reiniciar, edad, título) + zona de juego
├── #menu-pantalla            pantalla completa
├── #menu-acc                 accesibilidad (el panel lo llena el JS compartido)
└── #menu-vol                 volumen de fondo
```

Casi el mismo cascarón, con dos huecos que no están en todos:

| Pieza | En cuántos | Qué es |
|---|---|---|
| `#final` + `final/final.js` | 24 | Victoria compartida: cierre, trofeo, «¿Quieres jugar nuevamente?». `CaminoCoheteZeus` y `ViajePezLaberintoBurbujas` no lo montan. |
| `#comenzar-wrap` | 15 | El botón único de arranque después de la demo. |
| `#guia` | 10 | Hueco de Zoe 3D (presentación y cierre). Durante la partida las voces suenan sin el modelo, salvo que la escena lo pida. |
| `#escenario-phaser` | 8 | El lienzo con ese id. Phaser está en los 26; el contenedor no se llama igual. |

Orden de capas cuando el juego sigue la plantilla nueva: fondo `z-index: 0`, `#principal` en 1, `#guia` en 20, botones redondos en 1500, `#comenzar-wrap` en 1200, `#final` en 2000.

## 3. Bibliotecas que carga el cascarón

En este orden aproximado, todas relativas al `index.html` del juego:

1. jQuery, SweetAlert, Bootstrap, Font Awesome, `fonts.css` — chrome.
2. `../comun/inicio-fondo.css`, `../comun/interfaz.css`, `../comun/inicio-fondo.js`.
3. `../../intro3d/css/intro.css`, `../../tutorial/tutorial.css`, `../../final/final.css`.
4. `../../texto_voz.js` — voces contra `/juegos/tts`.
5. `../../shared/edad-nivel.js` — elige `niveles[]` según la edad.
6. `phaser.min.js` (4.2.1, un solo build) y GSAP.
7. Intro 3D: `intro3d/js/config.js`, `ambientes-tema.js`, `three-scene.js`, `intro.js`. El aula de Polimotor es `models/aulas/polimotor.glb`.
8. `../../final/final.js` — salvo los dos recorridos del § 2.
9. `../../shared/aplicar-perfil-juego.js` y `pin-accesibilidad.js`.
10. Howler + `../../shared/pednia-audio.js`. El tema entra solo si `audios.tema` es `"polimotor"`.
11. `../../shared/pednia-fx.js`.
12. Scripts del propio juego. Llevan `?v=AAAAMMDDx`. Apache los trata como no-cache; la tableta no.

`tutorial.js` falta en un paquete. No cuentes con él como si fuera el cascarón.

## 4. Flujo de pantallas

```
#pantalla-inicio  «¡Empecemos!»
  → intro 3D      diálogo de textos.conversacion; Omitir / CONTINUAR
  → PedniaEdad    elige un nivel de config.niveles; si no hay ?edad= ni perfil, cae en 3 años
  → presentación  cartel, Zoe entra si el juego tiene #guia, se muestra la mecánica
  → demo          automática si accesibilidad.mostrarIntro; no cuenta, no gasta tiempo,
                  bloquea el input (body.demo-lock). Apagarla no quita el botón de arranque
  → un botón      «¡Comenzar a jugar!» (el texto sale de textos.botonComenzar)
  → partida       solo la escena; voces sin personajes en pantalla
  → cierre        la escena celebra
  → #final        victoria compartida; Sí recarga, No hace history.back()
```

Conducta del cascarón, no de una mecánica concreta: sin vidas y sin puntaje negativo. El error se dice y el mismo ítem se puede reintentar. La respuesta correcta vive en datos (`id`, pareja, categoría), no en el nombre visible del dibujo. Solo tableta y computador.

## 5. Cuatro papeles

El cascarón no juega. La partida son cuatro papeles. El primero y el segundo tienen nombre fijo. El tercero y el cuarto son el hueco.

| Papel | Dónde | Qué hace | Qué no hace |
|---|---|---|---|
| Datos | `config.json` | Textos, edad, audio, accesibilidad y el contenido de la mecánica | No tiene lógica |
| Flujo | `script.js` | Enlaza las pantallas del § 4, voces, ayuda, progreso, cierre | No decide si un toque es correcto y no dibuja el tablero |
| Dibujo | escena | Phaser (y a veces DOM/GSAP) anima y devuelve Promises | No valida |
| Decisión | reglas | Dice si el gesto es acierto, error o fin, por identificadores | No toca el DOM |

Cómo se llena el hueco, sin convertir esto en un catálogo:

- Paquete reciente: `reglas.js` (puro, exportable a Node), `escenario-phaser.js` (o un `*-phaser.js`), `demo.js`, y a menudo `iconos.js` (SVG 120×120 rasterizado a textura) más un módulo de entrada (`conexiones.js` o `arrastre.js`). Una instancia de partida (`__pedniaPhaserGame`). La intro es otra (`__introPhaser`) y se destruye antes.
- Paquete anterior: la decisión y el dibujo viven en `script.js` más un `*-anim.js` (GSAP). A veces hay un `phaser-juego.js`. No tienen `reglas.js`.

Un juego nuevo copia el hueco de una mecánica parecida (unir, secuencia o recorrido), no el paquete de al lado por ser más nuevo. Mezclar los dos rellenos en un solo `index.html` rompe el orden de scripts.

Cada animación que el flujo espera resuelve una Promise con respaldo por tiempo: con la pestaña oculta los tweens de Phaser no corren. Antes de leer un toque, `scale.updateBounds()`. El contenedor lleva `touch-action: none`.

## 6. Contrato de `config.json`

Cuatro claves están en los 26. El resto es contenido de la mecánica y no forma parte de la estructura.

```json
{
  "nombre": "…",
  "mostrarFeedBack": true,
  "accesibilidad": {
    "altoContraste": false,
    "mostrarIntro": true,
    "ayudaAutomatica": true,
    "mostrarProgreso": true,
    "letterSpacing": 2,
    "volumenFondo": 20,
    "rate": 5
  },
  "audios": {
    "tema": "polimotor",
    "acierto": "../../sounds/ok.mp3",
    "fondo": "../../sounds/fondo.mp3"
  },
  "textos": {
    "tituloIntro": "…",
    "botonComenzar": "¡Comenzar a jugar!",
    "cierre": "…",
    "conversacion": [
      { "personaje": 1, "texto": "…" },
      { "personaje": 0, "texto": "…" }
    ]
  },
  "niveles": [
    { "id": "1", "edad": "3-4 años", "titulo": "…" }
  ]
}
```

- `accesibilidad`, `audios`, `textos`, `niveles`: los 26.
- `mostrarFeedBack`: en la raíz. Enciende la voz. No va dentro de `accesibilidad`.
- `nombre`: el título del paquete. Unos pocos no la traen; un juego nuevo sí.
- `niveles[].edad` es la única edad que entiende el catálogo (`3 años`, `4 años`, `3-4 años`, `5-6 años`). `niveles[].id` identifica el nivel. No es la edad.
- `audios.tema` tiene que ser `"polimotor"` para entrar al sprite de `pednia-audio.js`. `sonarEvento` solo acepta eventos de ese tema (`acierto`, `enRed`, `error`, `regreso`, `agarrar`, `soltar`, `bote`, `victoria`, `encaje`, `tic`, `correcto`, `aparece`), no nombres internos del sprite.
- En `conversacion`, `personaje` `1` es Zoe y `0` es Zeus.
- `juego`, `rondas`, `demo` y cualquier lista de piezas (`pares`, `objetos`, `posturas`…) son de esa mecánica. Van en el JSON, no en `script.js`. Los números de la regla no van dentro de `accesibilidad`: el perfil de inclusión escribe ahí y los cambiaría sin que el juego lo sepa.

## 7. Qué queda fuera de esta estructura

- El dibujo concreto, los textos de voz y las rondas. Eso es el contenido del hueco.
- `Polimotor/img/`: cromos compartidos del ambiente (accesibilidad, progreso, portada), no del paquete.
- El registro SQL (`ambiente_id` 7, `modulo_id` 9, eje y temática). Ver `parametros-generales.md`.
- Teléfono. No hay layout para eso.
