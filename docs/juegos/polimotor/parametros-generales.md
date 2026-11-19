# Parámetros generales — juegos de Polimotor

Hoja para generar un juego nuevo sin copiar un paquete al azar. Sale de los **26** `config.json` de `public/catalogo_juegos/Polimotor/` y de su fila en `database/ambientes.sql` (noviembre 2026).

No sustituye la plantilla de flujo y archivos: [`docs/juegos-escenas-animadas.md`](../../juegos-escenas-animadas.md). Esa plantilla describe cómo **debería** armarse un juego nuevo (modelo `DondeLoUso`). Este archivo dice qué de eso es real en el catálogo y qué no se puede asumir.

[`docs/catalogo-juegos.md`](../../catalogo-juegos.md) está viejo: dice que Polimotor tiene 11 juegos y un `script.js` monolítico. Hoy hay 26, y 16 ya separan escena, reglas y demo.

## 1. Decisión antes de generar

Hay dos familias. Un juego nuevo pertenece a la segunda, salvo que el pedido sea extender un paquete legado.

| | Familia legado (10) | Familia escena (16) |
|---|---|---|
| Cuándo | septiembre–octubre 2026 | noviembre 2026 en adelante |
| Carpeta | `script.js` + `*-anim.js` (+ a veces `phaser-juego.js`) | `reglas.js` + `escenario-phaser.js` (o equivalente) + `demo.js` + `script.js` |
| Edades en un solo paquete | tres: `3 años`, `4 años`, `5-6 años` | una: `3-4 años` o `5-6 años` |
| Dónde vive la mecánica | claves sueltas (`pares`, `cuerpos`, `rutasFijas`…) y, mal, dentro de `accesibilidad` | `juego` + `rondas` (u otra lista con `id`) |
| Modelo a copiar | no copiar para un juego nuevo | el hermano de la **misma mecánica**, no el más reciente |

`EspejoDeLasPosiciones`, `PuzleDeSiluetasEnAccion`, `LinternaReveladoraPartes` y `ToqueMagicoCosquillas` son de noviembre pero no cumplen el esqueleto de archivos de la plantilla. Copiarlos “porque son nuevos” arrastra un caso especial.

`CoordinacionVisual` y `LaberintosDeCoordinacion` no tienen nota en `docs/juegos/polimotor/`. No uses su ausencia de nota como señal de que no existen.

## 2. Lo que sí es común a los 26

Estos parámetros se rompen si el generador los improvisa.

### Identidad del paquete

- Carpeta: `public/catalogo_juegos/Polimotor/<PascalCase>/` con `index.html` en la raíz. Polimotor no usa categoría/subjuego.
- Slug en `juegos.slug`: kebab-case, único. La carpeta y el slug no tienen por qué coincidir letra a letra (`El Camino del Cohete de Zeus` → carpeta `CaminoCoheteZeus`, slug `camino-cohete-zeus`).
- `juegos.ruta`: `catalogo_juegos/Polimotor/<Carpeta>`, relativa a `public/`. Sin ella el catálogo no abre el paquete ni lee la edad.
- `juegos.imagen`: el archivo que **existe** en la carpeta. No asumir `<juego>.png`. Ya hay `cordinacion.png`, `rompecabeza.png` y `pista-huellas.svg`.
- `juegos.color`: hex libre. El verde del ambiente (`#7ABB2F`) no es el color de los juegos.
- Edad **no** va en la base. Va en `config.json` → `niveles[].edad`. `JuegoCatalogoService::edadesDesdeConfigPaquete()` solo lee esa clave.
- Icono de inicio: 256×256 cuando es PNG de catálogo. El nombre se guarda en `juegos.imagen`.

### Edad (el parser es estricto)

Etiquetas que `PedniaEdad` (`shared/edad-nivel.js`) y el catálogo sí entienden:

| Etiqueta | A quién aplica | Uso real |
|---|---|---|
| `3 años` | edad numérica ≤ 3 | solo familia legado (un nivel de tres) |
| `4 años` | edad numérica 4 | solo familia legado |
| `3-4 años` | 3 y 4 | prejardín, familia escena |
| `5-6 años` | ≥ 5 | transición, familia escena |

`niveles[].id` **no es la edad**. En `Rompecabezas` el `id` es el número de piezas (`"5"`, `"7"`, `"10"`) y el comentario de `edad-nivel.js` lo dice. El fallback “edad ≥ 5 busca `id === "5"`” choca con un `id` de piezas si el paquete mezcla las dos cosas. En un juego nuevo el `id` identifica el nivel; la edad va solo en `edad`.

Un paquete nuevo lleva **un** nivel, salvo que la mecánica cambie de verdad con la edad (cantidad de piezas, longitud de secuencia). Meter 3, 4 y 5-6 en un solo config es el patrón legado y obliga a ramificar toda la escena.

Si no hay `?edad=` ni perfil de kiosco, `PedniaEdad` cae en **3 años** y avisa por consola. Probar solo sin query deja el nivel más fácil.

`LinternaReveladoraPartes` declara a la vez `3-4 años` y `4 años`. Es un solape: un niño de 4 años puede resolver dos niveles. No repetirlo.

### Currículo (no inventar un eje)

Todos los juegos de este ambiente:

| Campo | Valor |
|---|---|
| `ambiente_id` | `7` (Polimotor, slug `polimotor`) |
| `modulo_id` | `9` (Juegos de aprendizaje) |

El eje y la temática salen de esta tabla. Un juego nuevo entra en una temática que ya existe. Si no cabe en ninguna, falta una decisión de currículo, no un `id` nuevo escrito a mano.

**Eje 11 — Conocimiento y control corporal**

| `tematica_id` | Nombre | Juegos |
|---|---|---|
| 8 | Rompecabezas del cuerpo humano | `Rompecabezas` |
| 29 | Reconocimiento de partes del cuerpo | `ReconocimientoDelCuerpo`, `DondeSePone`, `ToqueMagicoCosquillas`, `LinternaReveladoraPartes`, `UnePartesCuerpo`, `GolpeaTopos`, `DondeLoUso` |
| 30 | Juegos de lateralidad | `Lateralidad`, `EspejoDeLasPosiciones`, `PuzleDeSiluetasEnAccion` |
| 31 | Juegos de memoria corporal | `MemoriaCorporal`, `MemoramaPartesCuerpo`, `SimonDiceCorporal`, `PistaRitmoPasosMagicos`, `PistaPatronesHuellas`, `SecuenciadorBaileLateralidad`, `MemoramaPosturasLateralidad` |

**Eje 17 — Coordinación y orientación**

| `tematica_id` | Nombre | Juegos |
|---|---|---|
| 32 | Laberintos de coordinación | `LaberintosDeCoordinacion`, `CaminoCoheteZeus`, `ViajePezLaberintoBurbujas` |
| 33 | Secuencias de movimiento | `SecuenciaDeMovimiento` |
| 34 | Coordinación visual | `CoordinacionVisual` |

**Eje 18 — Habilidad y precisión**

| `tematica_id` | Nombre | Juegos |
|---|---|---|
| 35 | Arrastrar y soltar objetos | `ArrastrarYSoltarObjetos` |
| 36 | Ensamblajes sencillos | `EnsamblajesSencillos` |
| 37 | Juegos de precisión | `JuegosDePrecision` |

`orden` no es una secuencia limpia: hay duplicados (`7` y `8` repetidos) y saltos (no existen 21 ni 22; el último usado es 24). Antes de insertar, mirar el máximo real de Polimotor en `juegos` y no fiarse de “el siguiente de la temática”.

La descripción de la fila debe llevar edad y mecánica. Varios legados la tienen en `NULL`; un juego nuevo no.

Registro: SQL idempotente solo de ese juego, más la misma fila en `database/ambientes.sql`. El procedimiento está en la plantilla, sección 9. No reinsertar el volcado entero.

### Accesibilidad (el bloque compartido)

Estas siete claves están en la familia escena y el perfil de inclusión las puede pisar (`shared/aplicar-perfil-juego.js` escribe en `accesibilidad`, y también en la raíz del config si la misma clave existe ahí):

| Clave | Valor de partida | Efecto |
|---|---|---|
| `altoContraste` | `false` | estilo de alto contraste |
| `mostrarIntro` | `true` | la demo. Apagarla no quita el botón «¡Comenzar a jugar!» |
| `ayudaAutomatica` | `true` | pista por inactividad |
| `mostrarProgreso` | `true` | barra de avance |
| `letterSpacing` | `2` | tracking del texto |
| `volumenFondo` | `20` | música, escala que ya usa el resto |
| `rate` | `5` | velocidad de la voz |

`mostrarFeedBack` va en la **raíz** del config, no dentro de `accesibilidad`. En la familia escena es `true` (hay voz). `CoordinacionVisual` lo metió dentro de `accesibilidad` y `ReconocimientoDelCuerpo` no lo tiene en la raíz: el generador no debe imitarlos. `docs/catalogo-juegos.md` dice que el defecto de otros ambientes es `false`; en Polimotor nuevo eso apaga las voces.

Lo que es regla de la mecánica (`piezasVisibles`, `modoTap`, `umbralEnceste`, `fallosPista1`, tiempos de “ver de nuevo”) en los legados está dentro de `accesibilidad`. Eso permite que el perfil del niño lo cambie sin que el juego lo sepa. En un juego nuevo esos números van en `juego`. En `accesibilidad` solo entra lo que un docente puede querer forzar por inclusión.

### Audio

- `audios.tema`: `"polimotor"`. Sin eso no entra el sprite de `shared/pednia-audio.js`.
- Respaldo que ya traen los config: `acierto` → `../../sounds/ok.mp3`, `fondo` → `../../sounds/fondo.mp3`. Varios también apuntan `error` a `../../sounds/over.mp3` y `cierre` a `../../sounds/victory.mp3`.
- El cierre **no** debe sonar `victory.mp3`. Ese archivo es la fanfarria de tonos puros. La celebración va por el evento `victoria` del sprite (redoble + ovación).
- `sonarEvento(nombre)` solo acepta eventos del tema, no nombres del sprite. Eventos de Polimotor: `acierto`, `enRed`, `error`, `regreso`, `agarrar`, `soltar`, `bote`, `victoria`, `encaje`, `tic`, `correcto`, `aparece`. Opciones: `tasa`, `vol`, `retraso`.
- No agregar WAV de tonos puros. `scripts/audio/detectar_pitidos.py` es el filtro que ya se usa.
- Voces: `TextoVoz.hablar` contra `/juegos/tts`. En el servidor estático de pruebas esas peticiones responden 404; es el único 404 aceptable.

### Personajes

En la intro, `config.textos.conversacion[].personaje` es un índice del arreglo `INTRO_CONFIG.personajes`:

| Índice | Personaje |
|---|---|
| `0` | Zeus |
| `1` | Zoe |

`DondeLoUso/script.js` lo resuelve así (`indice === 1 ? "zoe" : "zeus"`). `docs/catalogo-juegos.md` dice lo contrario (Zoe 0, Zeus 1). Esa frase es de otros ambientes. En Polimotor, seguir la tabla de arriba.

Durante la partida las voces suenan y los modelos 3D no están en pantalla, salvo que la imagen de referencia los muestre. Zoe 3D entra en la presentación y vuelve en el final. No crear personajes ni GLB nuevos.

### Flujo y conducta con el niño

El flujo de un juego nuevo es el de la plantilla (sección 2): inicio → intro 3D → `PedniaEdad` → presentación → demo automática → «¡Comenzar a jugar!» → partida → final → victoria compartida (`../../final`).

Parámetros de conducta que los juegos nuevos ya cumplen y un generador no debe “mejorar”:

- Sin vidas, sin puntaje negativo, sin mensaje de fallo seco. El error se dice y se puede reintentar el mismo ítem.
- La demo no cuenta, no gasta tiempo y bloquea el input (`body.demo-lock`). No lleva botón propio: arranca sola.
- Un solo botón de arranque: «¡Comenzar a jugar!».
- Ayuda por inactividad: en los juegos de unir/tocar, alrededor de `ayudaMs` 11000 y `ayudaRepetirMs` 13000, y brillo suave tras `erroresParaBrillo` 2. No es una ley de los 26. Los de secuencia usan `debounceMs`, `msRespuesta`, `pausaEntreItemsMs`, `repetirSecuenciaTrasError`, `ayudasMax`. Copiar el bloque `juego` del hermano de la misma mecánica.
- La respuesta correcta vive en datos (`parejas`, `categoria`, `id`), nunca en el nombre visible del dibujo.
- Los `id` no se repiten entre rondas.
- Solo tableta y computador. No hay layout de teléfono. Viewports de prueba: 1366×768, 1024×768, 768×1024.

### Motor

- Phaser **4.2.1** (`public/assets/vendor/phaser/phaser.min.js`). Un solo build en el `index.html`. Una sola instancia de partida (`__pedniaPhaserGame`); la intro es otra (`__introPhaser`) y se destruye antes de montar el juego. Ver [`docs/juegos-phaser-runtime.md`](../../juegos-phaser-runtime.md).
- La escena dibuja. `reglas.js` decide, sin DOM, y exporta para `node`. `script.js` ordena el flujo.
- Cada animación que el flujo espera devuelve una Promise con respaldo por tiempo. Con la pestaña oculta los tweens no corren.
- `Scale.RESIZE`, `touch-action: none` en el contenedor, `scale.updateBounds()` antes de leer un toque.
- Iconos de la familia escena: SVG `viewBox` 120×120, raster a textura. Fondo decorativo: SVG 1600×900. El `body` usa el mismo color de fondo para que no se vea un hueco al cargar.
- Cache-bust `?v=AAAAMMDDx` en los scripts propios. Apache ignora el query (`catalogo_juegos/.htaccess` pone no-cache), la tableta no.
- `Polimotor/comun/` (`inicio-fondo.*`, `interfaz.css`, `partes-cuerpo.js`) lo cargan también otros ambientes. Cambiarlo no es un cambio local de Polimotor.

## 3. Lo que hay que decidir por juego

No hay un `config.json` único. Estas claves de primer nivel aparecen, y casi ninguna está en los 26:

| Clave | En cuántos | Qué es |
|---|---|---|
| `audios`, `textos`, `accesibilidad`, `niveles` | 26 | contrato mínimo |
| `mostrarFeedBack` | 24 | ver sección 2; no omitirla |
| `nombre` | 25 | `Rompecabezas` no la trae; un juego nuevo sí |
| `juego` | 16 | números de la mecánica (familia escena) |
| `demo` | 11 | pasos de la mano de `PedniaTutorial`. Que exista `demo.js` no implica esta clave: `MemoramaPartesCuerpo`, `CaminoCoheteZeus` y `ViajePezLaberintoBurbujas` tienen demo sin el bloque |
| `rondas` | 8 | lista de tandas. Otros guardan el conteo en `juego.rondas` (`DondeSePone`, `ToqueMagicoCosquillas`) |

El resto (`pares`, `objetos`, `cuerpos`, `recorridos`, `acciones`, `posturas`, `partes`, `zonas`, `etapas`, `banco`…) es el contenido de **ese** juego. Va en el config, no quemado en `script.js`.

Textos de voz: se copian literales del enunciado. La prueba `scripts/probar-<slug>.js` debe comprobarlos, más que cada `icono` citado exista en `iconos.js` y que el JSON parsee.

## 4. Esqueleto mínimo de un juego nuevo

Partir de `DondeLoUso` si la mecánica es unir o señalar. Si es secuencia, partir de `SimonDiceCorporal` o `PistaRitmoPasosMagicos`. Si es recorrido con el dedo, de `ViajePezLaberintoBurbujas` o `CaminoCoheteZeus`. No mezclar los tres esqueletos en un archivo.

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
  "juego": { "ayudaMs": 11000, "ayudaRepetirMs": 13000, "erroresParaBrillo": 2 },
  "rondas": [{ "id": 1, "titulo": "RONDA 1", "instruccion": "…" }],
  "textos": {
    "tituloIntro": "…",
    "subtituloIntro": "…",
    "botonComenzar": "¡Comenzar a jugar!",
    "finalTitulo": "¡LO LOGRASTE!",
    "cierre": "…",
    "conversacion": [
      { "personaje": 1, "texto": "…" },
      { "personaje": 0, "texto": "…" }
    ]
  },
  "demo": { "pasos": [{ "texto": "…" }] },
  "niveles": [{ "id": "1", "edad": "3-4 años", "titulo": "…" }]
}
```

`personaje` 1 es Zoe y 0 es Zeus. `edad` es una de las cuatro etiquetas de la sección 2. `id` del nivel no repite un número que el fallback de `PedniaEdad` pueda confundir con la edad si el paquete tiene más de un nivel.

## 5. Inventario

Edad y familia para elegir hermano. El eje/temática está en la sección 2.

| Carpeta | Familia | Edad en `niveles` |
|---|---|---|
| `ArrastrarYSoltarObjetos` | legado (`phaser-juego.js`) | 3 / 4 / 5-6 |
| `CoordinacionVisual` | legado | 3 / 4 / 5-6 |
| `EnsamblajesSencillos` | legado | 3 / 4 / 5-6 |
| `JuegosDePrecision` | legado | 3 / 4 / 5-6 |
| `LaberintosDeCoordinacion` | legado | 3 / 4 / 5-6 |
| `Lateralidad` | legado | 3 / 4 / 5-6 |
| `MemoriaCorporal` | legado | 3 / 4 / 5-6 |
| `ReconocimientoDelCuerpo` | legado | 3 / 4 / 5-6 |
| `Rompecabezas` | legado (`phaser-juego.js`) | 3 / 4 / 5-6 |
| `SecuenciaDeMovimiento` | legado | 3 / 4 / 5-6 |
| `DondeSePone` | escena | 3-4 |
| `ToqueMagicoCosquillas` | escena, archivos propios | 3-4 |
| `LinternaReveladoraPartes` | escena, archivos propios | 3-4 y 4 (solape) |
| `MemoramaPartesCuerpo` | escena | 3-4 |
| `SimonDiceCorporal` | escena | 3-4 |
| `PistaRitmoPasosMagicos` | escena | 3-4 |
| `CaminoCoheteZeus` | escena | 3-4 |
| `ViajePezLaberintoBurbujas` | escena | 3-4 |
| `DondeLoUso` | escena, modelo de la plantilla | 5-6 |
| `UnePartesCuerpo` | escena | 5-6 |
| `GolpeaTopos` | escena | 5-6 |
| `EspejoDeLasPosiciones` | escena, muñeco articulado | 5-6 |
| `PuzleDeSiluetasEnAccion` | escena, muñeco articulado | 5-6 |
| `MemoramaPosturasLateralidad` | escena | 5-6 |
| `PistaPatronesHuellas` | escena | 5-6 |
| `SecuenciadorBaileLateralidad` | escena | 5-6 |

## 6. Qué no hacer al generar

- No tratar `docs/catalogo-juegos.md` como fuente de Polimotor. La fuente de archivos nuevos es `docs/juegos-escenas-animadas.md`; la de currículo y edad es este archivo.
- No poner la mecánica dentro de `accesibilidad`.
- No usar `niveles[].id` como edad.
- No cerrar con `victory.mp3`.
- No invertir Zeus/Zoe respecto de la tabla de la sección 2.
- No diseñar para teléfono, no sumar vidas, no agregar un botón entre la demo y «¡Comenzar a jugar!».
- No dar por único el `orden` ni por existente una temática que no esté en la sección 2.
- No editar `Polimotor/comun/` creyendo que solo lo ve este juego.
