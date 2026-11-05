# Diseño — Nivela la Balanza (CuentaLosObjetos / Multisaberes)

**Fecha:** 2026-11-05
**Autor:** Claude + Fabian Quintero
**Ambiente:** Multisaberes
**Categoría:** CuentaLosObjetos
**Subjuego nuevo:** `NivelaLaBalanza`
**Ruta:** `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/`

---

## 1. Intención y porqué

Un subjuego nuevo dentro del catálogo del kiosco, para la categoría *CuentaLosObjetos* del ambiente Multisaberes. El niño ve una balanza espacial con cristales en el platillo izquierdo y debe arrastrar la misma cantidad de cristales desde un depósito inferior al platillo derecho hasta que la balanza quede nivelada. Trabaja: conteo, comparación de cantidades, concepto de igualdad, correspondencia uno a uno y coordinación motriz.

Se encaja como el 6º subjuego de la categoría, siguiendo el **patrón canónico** de los subjuegos de Multisaberes y reutilizando la referencia de `ConstruyeElCoheteEstelar/` para la integración de Phaser 4.2.1 como motor de la escena jugable.

## 2. Metas, no-metas, anti-metas

### Metas

- Subjuego 100% jugable de punta a punta para la edad 5-6 años.
- Mecánica: arrastrar cristales del depósito al platillo derecho hasta igualar el platillo izquierdo.
- Balanza con **inclinación y aguja animadas en tiempo real** según la diferencia de cristales.
- 4 rondas por partida con cantidades crecientes: **4, 6, 8, 10 cristales**.
- **Cofre en el HUD** que se va llenando con los cristales ganados cada ronda y se abre en la pantalla final.
- Caída animada obligatoria de los cristales del platillo izquierdo al comenzar cada ronda (uno por uno, con rebote).
- Permitir retirar cristales del platillo derecho para corregir sin reiniciar la ronda.
- Integración completa con el shell del subjuego: `pantalla-inicio`, `intro3d`, `tutorial-3d`, menús de accesibilidad y `final.js`.
- Persistencia y progreso con el sistema existente del kiosco.

### No-metas

- NO hay 5 niveles con mapa de selección (ese flujo no existe en este catálogo; 1 subjuego = 1 reto).
- NO hay "40 gemas acumuladas entre niveles" como sistema separado: la recompensa visible es el cofre del HUD durante la partida.
- NO se usa física de motor (Arcade/Matter). La balanza y la aguja se animan con tweens; es física **visual**, no simulada.
- NO se toca la mecánica ni los archivos de los otros 5 subjuegos hermanos.
- NO se crean tablas de BD nuevas ni endpoints nuevos.

### Anti-metas

- Nada de frameworks frontend (React, Vue, etc.). Solo HTML+CSS+JS vanilla + Phaser 4.2.1 + jQuery (lo que el proyecto ya usa).
- No cargar una segunda versión de Phaser.
- No romper intro 3D ni la secuencia de victoria 3D compartida.
- Ningún cristal superpuesto, fuera del platillo o fuera del depósito.
- No conceder victoria por aproximación: solo con `cantidadIzquierda === cantidadDerecha` exacto.

## 3. Restricciones

- **Stack fijo:** PHP/Laravel 10 en backend, HTML5+CSS3+JS vanilla+jQuery+Bootstrap 5 en frontend, Phaser **4.2.1** como motor de la escena jugable.
- **Idioma:** español (código, UI, voz).
- **Patrón del subgénero:** `public/catalogo_juegos/Multisaberes/PATRON.md`. En este catálogo, `logica.js`/`sfx.js`/`style.css`/`script.js` son típicamente copias idénticas entre subjuegos hermanos; este subjuego introduce lógica propia (balanza + arrastre), así que **no** duplicará la `logica.js` compartida: tendrá la suya, con nombre de módulo distinto, para no colisionar.
- **Edad única por ahora:** 5-6 años (el único nivel declarado en `config.json`). Si más adelante se agregan 3-4 o 4, se añaden como entradas adicionales sin cambiar la mecánica.
- **Carga de Phaser:** la del proyecto (`/assets/vendor/phaser/phaser.min.js`), usando `PedniaPhaserHost` para evitar duplicar la instancia cuando la intro 3D también usa Phaser.
- **Sin backend nuevo:** el progreso se guarda con el mismo flujo que los demás subjuegos (sistema de sesión del niño + registro de partida existente). No se añaden tablas, columnas ni endpoints.

## 4. El cómo — decisiones ya tomadas

### 4.1 Estructura de archivos del subjuego

```
public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/
    index.html
    config.json
    logica.js          — reglas puras (cantidades, validación igualdad). Sin DOM.
    phaser-juego.js    — motor Phaser 4.2.1 de la escena (balanza, cristales, aguja, cofre).
    script.js          — orquestador: shell + flujo (intro3d → bienvenida → rondas → final).
    sfx.js             — efectos de sonido.
    style.css          — tema visual propio (laboratorio espacial).
    img/
        fondo_lab.webp
        zoe_normal.gif          — enlace al compartido si aplica
        zeus_normal.gif
        cofre.png
        cofre_abierto.png
        insignia_balanza.svg
    instrucciones.md
```

El `index.html`, `logica.js`, `phaser-juego.js`, `script.js`, `style.css` son **propios** de este subjuego (no copias de los hermanos). El resto del armazón (intro 3D, tutorial, menú de accesibilidad, victoria 3D) se consume de `catalogo_juegos/shared/`, `catalogo_juegos/intro3d/`, `catalogo_juegos/tutorial/`, `catalogo_juegos/final/` tal y como lo hace `ConstruyeElCoheteEstelar`.

### 4.2 Orden de scripts en `index.html`

Idéntico al de `ConstruyeElCoheteEstelar/index.html`, con cambio solo en los nombres propios:

1. jQuery, SweetAlert, fondo compartido (`Polimotor/comun/inicio-fondo.js`).
2. `texto_voz.js`, `edad-nivel.js`, `tutorial.js`, `final.js`, `aplicar-perfil-juego.js`.
3. `logica.js`, `sfx.js` del propio subjuego.
4. `phaser.min.js` → `pednia-phaser-host.js` → `phaser-juego.js` del propio subjuego.
5. intro3d (config, tema, three-scene, final-scene, tutorial-3d, personajes-juego, intro).
6. `pin-accesibilidad.js`, `menu-accesibilidad.js`.
7. `script.js` del propio subjuego (orquestador, al final).

### 4.2.b Shell del HTML — compartidos y tema propio

**Decisión (2026-11-05):** se reusan los assets compartidos que ya consumen los subjuegos hermanos (`Polimotor/comun/inicio-fondo.css`, `inicio-fondo.js`, tipografías, íconos, menús), pero el **tema visual** se hace propio en `style.css`:

- Paleta: azul profundo + cian (laboratorio espacial / balanza futurista), diferente al naranja/cohete.
- Fondo del `#pantalla-inicio`: imagen o gradiente propio tipo galaxia + nebulosa suave.
- Clases propias con prefijo `balanza-` (p. ej. `.balanza-hud`, `.balanza-btn-ayuda`) para no pisar `btn-circular-cohete` ni `tema-espacio`.
- Se **mantienen** los contenedores y IDs estándar del armazón (`#pantalla-inicio`, `#intro3d-root`, `#three-container`, `#phaser-container`, `#btn-omitir-intro3d`, `#btn-continuar-intro3d`, `#phaser-juego`, `#final`, `#principal`, `#tutorial-zoe`, `#tutorial-3d`, `#menu-acc`, `#menu-vol`) para no romper los JS compartidos.

### 4.3 `config.json`

- `stub: false` desde el inicio (sale ya jugable).
- Un único nivel declarado: `edad: "5-6 años"`. `PedniaEdad.resolverNivel` cae a este para cualquier edad (es el último y único de la lista); en preview del SuperAdmin se muestra vía `elegirManual()` estándar.
- `accesibilidad`: `letterSpacing`, `volumenFondo`, `rate`, `mostrarIntro: true`.
- `audios`: `fondo`, `cierre` (victoria), `acierto`, `efectos.recompensa`, más efectos propios (`colocar`, `retirar`, `impactoCristal`, `agujaVerde`).
- `elementos`: cristal (único sprite), cofre, insignia.
- `demo`: usa 3 cristales (fuera de los retos reales 4/6/8/10) para la demostración guiada de arrastre.
- `niveles`: un único nivel por ahora, `edad: "5-6 años"`, con 4 retos (`ronda-1` … `ronda-4`) cuyas cantidades objetivo son 4, 6, 8, 10 vía nuevo campo `cantidadObjetivo`.

Esquema de un reto:

```jsonc
{
  "id": "nivela-balanza-1",
  "titulo": "Primera carga",
  "mecanica": "nivelar_balanza",
  "cantidadObjetivo": 4,        // cristales en el platillo izquierdo
  "cristalesEnDeposito": 8,     // depósito tiene siempre >= objetivo
  "presentacion": { "voz": "zeus", "texto": "¡Nuestra primera carga espacial!" },
  "pregunta":      { "voz": "zoe",  "texto": "Arrastra 4 cristales al lado derecho para nivelar la balanza." },
  "acierto":       { "voz": "zeus", "texto": "¡Perfecto! Los dos lados son iguales.", "efecto": "recompensa" },
  "errorPocos":    { "voz": "zoe",  "texto": "La balanza está inclinada. Faltan cristales.", "efecto": "boing" },
  "errorMuchos":   { "voz": "zoe",  "texto": "¡Cuidado! Hay demasiados. Retira uno.", "efecto": "boing" }
}
```

El depósito siempre tiene **más** cristales que el objetivo (para que el niño tenga que elegir y no simplemente arrastrarlos todos).

### 4.4 `logica.js` — reglas puras (sin DOM, sin Phaser)

Módulo `window.NivelaBalanzaLogica` con:

- `cantidadObjetivo(reto)` → número objetivo del reto.
- `cristalesEnDeposito(reto, acc)` → cantidad del depósito, con un mínimo de `objetivo + 2`.
- `estadoBalanza(izquierda, derecha)` → `{ diferencia, estado: 'rojo'|'amarillo'|'verde', inclinacionGrados }`.
  - `verde` solo si `diferencia === 0`.
  - `amarillo` si `|diferencia| === 1`.
  - `rojo` en otro caso.
  - `inclinacionGrados` = `clamp(diferencia * k, -maxGrados, +maxGrados)` (valor que consume `phaser-juego.js`).
- `esVictoria(izquierda, derecha)` → `izquierda === derecha && derecha > 0`.
- `plantillaInstruccion(texto, cantidad)` → reemplaza `{cantidad}` en textos del config si está presente.

**Testeable con PHPUnit? No** — es JS puro y el proyecto no tiene suite de JS tests. Lo validaremos manualmente en kiosco preview y en el navegador.

### 4.5 `phaser-juego.js` — motor de la escena (Phaser 4.2.1)

Módulo `window.NivelaBalanzaPhaser` con API pública similar a `ConstructoresEspacioPhaser`:

```
montar(opts) → Promise<void>      // crea game (vía PedniaPhaserHost) y resuelve cuando la escena esté lista
destruir()                         // libera game
prepararRonda({cantidadObjetivo, cristalesEnDeposito}) → Promise<void>
                                   // limpia escena previa, hace caer N cristales en el platillo izquierdo
                                   // uno por uno con rebote; distribuye el depósito sin superposición.
                                   // Resuelve cuando todos aterrizaron.
habilitarArrastre(activar)         // bloquea/desbloquea drag mientras hablan Zoe/Zeus.
onCristalesCambia(fn)              // callback cuando cambia el conteo (fn(derecha))
cantidadActual() → number          // cristales en platillo derecho
celebrarRonda(cristalesGanados) → Promise<void>
                                   // brillos + partículas, cristales vuelan al cofre del HUD,
                                   // cofre incrementa contador, resuelve al terminar la animación.
celebrarFinal(totalCristales) → Promise<void>
                                   // apertura del cofre central, estrellas, sonido final.
                                   // (Puede delegarse al Final3d compartido; ver §4.8)
ANCHO: 1280, ALTO: 720
```

Internamente:

- Escena única `EscenaBalanza`.
- Texturas generadas por código (como hace `ConstruyeElCoheteEstelar`): cristal poliédrico azul con facetas y brillo, platillos, barra, soporte, aguja, chispas, nebulosa, estrellas.
- Fondo: galaxia azul oscuro, estrellas parpadeantes (tween `alpha`), partículas sutiles.
- Balanza: grupo compuesto `{ soporte, barra, cadenaIzq, cadenaDer, platilloIzq, platilloDer, aguja }`. La barra rota con tween en `angle`; los platillos y cadenas suben/bajan con `y` para acompañar la rotación (cálculo trigonométrico sobre el pivote).
- Cristales: sprites con `setInteractive({ useHandCursor: true })` + `scene.input.setDraggable(sprite, true)`. Eventos `dragstart`, `drag`, `dragend` de Phaser.
  - Al tomar: `scale *= 1.1`, `depth` elevado, `alpha` al `cristal.sombra`.
  - Al soltar sobre el área del platillo derecho: tween de aterrizaje con rebote, re-ajuste de posición libre dentro del platillo, se añade al conteo y se llama `onCristalesCambia`.
  - Al soltar fuera: tween de regreso a su slot en el depósito.
- Cristales en el platillo derecho son también interactivos para **retirarlos**: tap (o drag de vuelta al depósito) regresa el cristal al depósito y decrementa el conteo.
- Aguja: hija del soporte central; rota entre `-45°` y `+45°`. Color cambia por `setTint`: rojo `0xff6060` / amarillo `0xffd24d` / verde `0x59e36b`.
- Tras cada cambio (colocar / retirar), se re-evalúa `estadoBalanza` y se lanza un tween `angle` corto con `Back.easeOut` de pequeña amplitud al final (oscilación suave).
- HUD en Phaser (no en DOM): esquina superior derecha, cofre + contador de cristales acumulados. Al ganar una ronda, los N cristales recién ganados vuelan al cofre con tweens individuales escalonados; el contador incrementa.

**Antirrotura con la intro 3D:** se usa `PedniaPhaserHost.crear(cfg)` en `montar()` y `PedniaPhaserHost.destruirJuego()` en `destruir()` (mismo patrón que cohete), y los `setTimeout` globales en lugar de `scene.time.delayedCall` para no depender del reloj de la escena mientras convive con la intro.

### 4.6 `script.js` — orquestador

Sigue el mismo flujo de `AlimentaLosConejos/script.js`, adaptado a la mecánica nueva:

1. `DOMContentLoaded` → cargar `config.json` + `intro3d/config.json` → inicializar `TextoVoz` → audio de fondo opcional.
2. Enlazar `#btn-empecemos`, `#btn-omitir-intro3d`, `#btn-continuar-intro3d`, `window.addEventListener("victory-continue", …)`.
3. Al pasar la intro: `PedniaEdad.iniciarNivel({ niveles: config.niveles, onElegido: iniciarRonda0, elegirManual })`.
4. `iniciarRonda0(nivel)` → si `accesibilidad.mostrarIntro`, correr `PedniaTutorial` con la demostración `demo` (3 cristales, Zoe guía arrastre). Si no, saltar directo a la bienvenida.
5. `bienvenida(nivel)` → TTS con las líneas del config, luego `iterarRetos(nivel.retos)`.
6. Por cada reto:
   1. `NivelaBalanzaPhaser.habilitarArrastre(false)`.
   2. `NivelaBalanzaPhaser.prepararRonda(reto)` → caída animada.
   3. TTS de `presentacion` + `pregunta`.
   4. `habilitarArrastre(true)`.
   5. Suscribirse a `onCristalesCambia(d) => actualizarHUD(objetivo, d); si d === objetivo && noHayArrastreEnCurso, debounce 400ms, verificar de nuevo, y si sigue igual → victoriaRonda(reto)`.
   6. Si `d > objetivo`, TTS `errorMuchos` (con throttle de 2500ms).
   7. En victoria: `celebrarRonda(objetivo)` → TTS `acierto` → `siguienteReto`.
7. Tras el último reto: `iniciarSecuenciaVictoria()` que delega en `Final3d` compartido (insignia + total de cristales en el cofre).
8. Guardado de partida: en `siguienteReto` (tras victoria de ronda) y al final completo, llamar al mismo `registrarAvance` que usan los subjuegos hermanos (verificar la función exacta durante implementación; se reusa, no se duplica).

### 4.7 HUD en DOM vs en Phaser

Decisión del diseñador: **el cofre y contador van dentro del canvas Phaser** (coherente con `ConstruyeElCoheteEstelar` y permite que las animaciones de cristales volando al cofre sean fluidas sin cruzar la frontera canvas↔DOM). El HUD de nivel/ronda y los botones de menú de accesibilidad siguen en DOM, como en los demás subjuegos.

### 4.8 Pantalla final

Se usa la **victoria 3D compartida** (`final/final.js` + `intro3d/js/final-scene.js`) con una insignia específica (`img/insignia_balanza.svg`, tema astrónomo/ingeniero espacial) y el mensaje `"¡Has nivelado todas las balanzas!"` tomado del config. El "cofre lleno con 28 cristales" es coherente con la mecánica (4+6+8+10 = 28) y se muestra brevemente en canvas antes de ceder la escena a la victoria 3D.

### 4.9 Responsive

Phaser `Scale.FIT` + `Scale.CENTER_BOTH` con `ANCHO=1280, ALTO=720`, igual al cohete. Área de arrastre configurada para que los cristales sean grandes (mínimo ~80px de hitArea) y respondan en pantalla táctil. En DOM, el contenedor `#phaser-juego` ocupa todo el `#principal` y se adapta con CSS idéntico al de los subjuegos hermanos.

### 4.10 Accesibilidad

Se aplica `shared/aplicar-perfil-juego.js` (`letterSpacing`, `volumenFondo`, `rate` para TTS). Sin cambios inventados al perfil. El menú de accesibilidad compartido funciona igual.

### 4.11 Persistencia

**Decisión (2026-11-05):** se sigue el patrón actual de los 5 subjuegos hermanos de CuentaLosObjetos: **ningún guardado al backend desde este subjuego**. El revisor del diseño confirmó que ninguno de ellos (`AlimentaLosConejos`, `ConstruyeElCoheteEstelar`, `LosPollitosEnLaGranja`, `RecolectaLasManzanas`, `UneLosPuntosDeLaConstelacion`) persiste avance: solo cargan `config.json` y disparan `final.js` al terminar. Se mantiene esa consistencia. Si en el futuro se decide añadir persistencia, se hace para toda la categoría en una sola intervención, no solo para este subjuego.

En la práctica: el subjuego llama `iniciarSecuenciaVictoria()` (final 3D compartido) al terminar las 4 rondas y nada más. No hay tabla nueva, ni ruta Laravel nueva, ni cambios en controllers.

### 4.12 Audio

- Fondo: `/sounds/fondo.mp3` (compartido).
- Victoria: `/sounds/victory.mp3` (compartido).
- Acierto: `/sounds/ok.mp3` (compartido).
- Efectos propios nuevos (si no existen en `/sounds/`, se agregan WAV/MP3 cortos): `impactoCristal`, `colocar`, `retirar`, `agujaVerde`. Si el usuario prefiere no crear archivos nuevos, se usan los efectos ya disponibles en `/sounds/` que suenen razonables.

## 5. Lo que queda al constructor

- Si hay o no sprites de cristal reutilizables en `img/` compartido; si no, generarlos por código en Phaser (patrón del cohete).
- Si existen los sonidos `impactoCristal`, `colocar`, `retirar`, `agujaVerde` en `/sounds/`; si no, usar `ok.mp3` + un `boing` ya existente, o añadirlos.
- Imagen del cofre (`cofre.png` / `cofre_abierto.png`) e insignia (`insignia_balanza.svg`): si no están, generar en Phaser con `Graphics` o pedir assets.
- Arte de `fondo_lab.webp`: se puede generar con la skill `generar-imagen` si el usuario lo aprueba, o usar un fondo plano con nebulosa generada por Phaser (el cohete lo hace así).
- Confirmación en kiosco real de que el flujo intro3d→bienvenida→retos→victoria3D no se rompe (prueba manual al final).
- Afinar coeficientes visuales: grado máximo de inclinación de la barra, tiempos de los tweens, umbral del "amarillo" (ahora: ±1 → amarillo).

## 6. Tamaño

**Project** — justifica documento de diseño y plan escrito. La implementación toca ~6 archivos nuevos (todo el subjuego), ~3002 líneas de referencia en el subjuego cohete nos dan una cota inferior creíble, probablemente ~2500-3500 líneas para este. Después del documento aprobado, el siguiente paso es el **plan** vía `superpowers:writing-plans`.
