# Nivela la Balanza — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir el subjuego `NivelaLaBalanza` a `CuentaLosObjetos` (Multisaberes): el niño arrastra cristales desde un depósito al platillo derecho de una balanza espacial hasta igualar la cantidad del platillo izquierdo, en 4 rondas de 4/6/8/10 cristales.

**Architecture:** Paquete nuevo autocontenido que sigue el patrón canónico de `ConstruyeElCoheteEstelar/`: `logica.js` (reglas puras, sin DOM ni Phaser), `phaser-juego.js` (escena Phaser 4.2.1 con texturas generadas por código), `script.js` (orquestador del shell: intro3d → nivel → rondas → victoria 3D), más `config.json`, `index.html`, `style.css`, `sfx.js`. Sin backend, sin tablas, sin endpoints.

**Tech Stack:** HTML5 + CSS3 + JavaScript vanilla (IIFE, ES5-compatible) + jQuery 4 + SweetAlert + Phaser 4.2.1 (`/assets/vendor/phaser/phaser.min.js` vía `PedniaPhaserHost`) + Three.js (solo intro3d/final3d compartidos).

**Spec:** `docs/superpowers/specs/2026-11-05-nivela-la-balanza-design.md`

## Global Constraints

- Idioma del código, comentarios y UI: **español**, con acentos correctos.
- Phaser **4.2.1** exclusivamente, cargado desde `/assets/vendor/phaser/phaser.min.js`. Nunca una segunda instancia: crear siempre con `PedniaPhaserHost.crear(cfg)` y destruir con `PedniaPhaserHost.destruirJuego()`.
- Estilo de módulo: IIFE `(function (global) { 'use strict'; … })(typeof window !== 'undefined' ? window : this);` exportando un único global.
- Globals propios, sin colisión con hermanos: `window.NivelaBalanzaLogica`, `window.NivelaBalanzaPhaser`, `window.NivelaBalanzaSfx`.
- Clases CSS propias con prefijo `balanza-`. No redefinir `btn-circular-cohete` ni `tema-espacio`.
- IDs del armazón obligatorios e intactos: `#pantalla-inicio`, `#btn-empecemos`, `#intro3d-root`, `#three-container`, `#phaser-container`, `#btn-omitir-intro3d`, `#intro3d-continuar`, `#btn-continuar-intro3d`, `#fondo_blanco`, `#final`, `#texto_final`, `#final-acciones`, `#principal`, `#phaser-juego`, `#capa-efectos`, `#tutorial-zoe`, `#tutorial-3d`, `#menu-acc`, `#menu-acc-panel`, `#menu-acc-ops`, `#btn-menu-acc`, `#btn-cerrar-acc`, `#menu-vol`, `#menu-vol-panel`, `#btn-menu-vol`, `#btn-cerrar-vol`, `#rango-volumen`, `#vol-val`.
- Lienzo Phaser: `ANCHO = 1280`, `ALTO = 720`, `Phaser.Scale.FIT` + `Phaser.Scale.CENTER_BOTH`.
- Cantidades por ronda: **4, 6, 8, 10** (total 28 cristales al cofre). Único nivel `edad: "5-6 años"`.
- Verde (victoria) **solo** con `izquierda === derecha`; nunca por aproximación.
- Temporizadores de secuencia con `global.setTimeout`, **no** `scene.time.delayedCall` (el reloj de escena puede congelarse conviviendo con intro3d).
- `stub: false` en `config.json`.
- Sin llamadas al backend: el cierre es `window.iniciarSecuenciaVictoria()` de `final.js`, con `#final` visible antes.

## Review Focus

Cinco modos de fallo que el spec implica pero que ninguna tarea ejercitaría por defecto. Cada uno tiene su test añadido en la tarea indicada.

1. **Doble conteo por soltar dos veces / drag reentrante** — un cristal ya colocado que vuelve a dispararse `dragend` no debe sumar otra vez. Test en Tarea 3.
2. **Victoria disparada en medio de una corrección** — si el niño pasa por el valor exacto al retirar y sigue arrastrando, no debe cerrarse la ronda. Test en Tarea 5 (debounce + comprobación de arrastre vivo).
3. **Depósito agotado** — si el depósito tiene exactamente el objetivo, el niño no puede equivocarse; `cristalesEnDeposito` debe garantizar margen (`objetivo + 2` mínimo). Test en Tarea 2.
4. **Diferencia mayor que el rango de la aguja** — con 0 colocados de 10, la inclinación debe saturar en el máximo y no salirse ni invertirse. Test en Tarea 2.
5. **`config.json` con un reto malformado** (sin `cantidadObjetivo` o con valor no numérico) no debe romper la partida entera. Test en Tarea 2.

---

## File Structure

Todo bajo `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/`:

| Archivo | Responsabilidad |
|---|---|
| `config.json` | Textos, audios, accesibilidad, demo, el único nivel con 4 retos. |
| `logica.js` | Reglas puras: cantidades, estado de balanza, victoria, plantillas. Sin DOM ni Phaser. |
| `phaser-juego.js` | Escena Phaser: fondo, balanza, aguja, cristales, depósito, drag&drop, cofre HUD, celebraciones. |
| `script.js` | Orquestador: carga config, intro3d, nivel por edad, demo, bucle de rondas, TTS, victoria 3D. |
| `sfx.js` | Efectos de sonido del paquete. |
| `style.css` | Tema propio azul/cian, clases `balanza-*`, layout del shell. |
| `index.html` | Armazón del paquete con IDs estándar y orden de scripts canónico. |
| `img/` | `insignia_balanza.svg`, `balanza_icono.svg`. |
| `instrucciones.md` | Nota breve del paquete, como los hermanos. |

Tests: `tests/js/nivela-balanza/logica.test.js` (ver Tarea 1 para el runner).

---

### Task 1: Runner de pruebas para la lógica pura

El proyecto no tiene suite JS. `logica.js` es ES5/IIFE y debe seguir siéndolo para el navegador, así que el runner carga el archivo y evalúa su IIFE contra un `global` falso — sin `module.exports`, sin build.

**Files:**
- Create: `tests/js/run-tests.js`
- Create: `tests/js/nivela-balanza/logica.test.js`
- Modify: `package.json` (añadir script `test:js`)

**Interfaces:**
- Consumes: nada.
- Produces: `node tests/js/run-tests.js` ejecuta todos los `*.test.js` bajo `tests/js/` y sale con código 1 si algo falla. Cada test file exporta `module.exports = { nombre, casos }` donde `casos` es un array de `{ descripcion, fn }` y `fn` lanza en caso de fallo. Helper global disponible dentro de los tests: `cargarIIFE(rutaRelativaAlRepo, nombreGlobal)` → devuelve el objeto exportado al `global` falso.

- [ ] **Step 1: Escribir el runner mínimo y un test de humo**

`tests/js/run-tests.js` recorre `tests/js/**/*.test.js`, ejecuta cada `caso.fn()` en try/catch, imprime `✓`/`✗` y resume. Expone `global.cargarIIFE` leyendo el archivo con `fs.readFileSync` y evaluándolo con `new Function('global', codigo)` sobre un objeto vacío, devolviendo `objeto[nombreGlobal]`.

`tests/js/nivela-balanza/logica.test.js` arranca con un único caso:

```js
{
  descripcion: 'carga el módulo NivelaBalanzaLogica',
  fn: function () {
    var L = cargarIIFE('public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/logica.js', 'NivelaBalanzaLogica');
    if (!L) throw new Error('no se exportó NivelaBalanzaLogica');
  }
}
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `node tests/js/run-tests.js`
Expected: FAIL — `logica.js` no existe todavía (ENOENT).

- [ ] **Step 3: Añadir el script a `package.json`**

En `scripts`, añadir `"test:js": "node tests/js/run-tests.js"`. No tocar otras entradas.

- [ ] **Step 4: Commit**

```bash
git add tests/js/run-tests.js tests/js/nivela-balanza/logica.test.js package.json
git commit -m "test: runner mínimo de pruebas JS para la lógica de catálogo"
```

---

### Task 2: `logica.js` — reglas puras de la balanza

**Files:**
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/logica.js`
- Test: `tests/js/nivela-balanza/logica.test.js`

**Interfaces:**
- Consumes: runner de Tarea 1 (`cargarIIFE`).
- Produces: `window.NivelaBalanzaLogica` con:
  - `GRADOS_MAX: 16` (número) — inclinación máxima de la barra en grados.
  - `cantidadObjetivo(reto) -> number|null` — `null` si falta o no es entero ≥ 1.
  - `cristalesEnDeposito(reto) -> number` — `max(reto.cristalesEnDeposito || 0, objetivo + 2)`; si el objetivo es `null`, devuelve `0`.
  - `estadoBalanza(izquierda, derecha) -> { diferencia, estado, inclinacionGrados }` — `diferencia = izquierda - derecha`; `estado` ∈ `'verde'|'amarillo'|'rojo'`; `inclinacionGrados` positivo cuando pesa la izquierda.
  - `esVictoria(izquierda, derecha) -> boolean`.
  - `retosValidos(nivel) -> Array` — filtra los retos cuyo `cantidadObjetivo` es `null`.
  - `plantilla(texto, datos) -> string` — sustituye `{cantidad}`, `{faltan}`, `{sobran}`.

- [ ] **Step 1: Escribir los tests que fallan**

Reemplazar el caso de humo por el conjunto completo en `tests/js/nivela-balanza/logica.test.js`:

```js
// cantidadObjetivo
cantidadObjetivo({ cantidadObjetivo: 6 }) === 6
cantidadObjetivo({ cantidadObjetivo: '6' }) === 6
cantidadObjetivo({}) === null
cantidadObjetivo({ cantidadObjetivo: 0 }) === null
cantidadObjetivo({ cantidadObjetivo: 'abc' }) === null   // Review Focus 5

// cristalesEnDeposito  (Review Focus 3)
cristalesEnDeposito({ cantidadObjetivo: 4, cristalesEnDeposito: 8 }) === 8
cristalesEnDeposito({ cantidadObjetivo: 4, cristalesEnDeposito: 4 }) === 6
cristalesEnDeposito({ cantidadObjetivo: 10 }) === 12
cristalesEnDeposito({}) === 0

// estadoBalanza
estadoBalanza(4, 4)  -> { diferencia: 0,  estado: 'verde' },   inclinacionGrados === 0
estadoBalanza(4, 3)  -> { diferencia: 1,  estado: 'amarillo' }, inclinacionGrados > 0
estadoBalanza(3, 4)  -> { diferencia: -1, estado: 'amarillo' }, inclinacionGrados < 0
estadoBalanza(10, 0) -> { diferencia: 10, estado: 'rojo' },     inclinacionGrados === 16   // Review Focus 4
estadoBalanza(0, 10) -> inclinacionGrados === -16                                           // Review Focus 4
estadoBalanza(4, 2)  -> estado === 'rojo'

// esVictoria
esVictoria(4, 4) === true
esVictoria(0, 0) === false
esVictoria(4, 5) === false

// retosValidos  (Review Focus 5)
retosValidos({ retos: [{ cantidadObjetivo: 4 }, {}, { cantidadObjetivo: 6 }] }).length === 2
retosValidos(null).length === 0

// plantilla
plantilla('Hay {cantidad} cristales', { cantidad: 6 }) === 'Hay 6 cristales'
plantilla('Faltan {faltan}', { faltan: 2 }) === 'Faltan 2'
plantilla('sin marcas', {}) === 'sin marcas'
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `node tests/js/run-tests.js`
Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Implementar `logica.js`**

IIFE que exporta `NivelaBalanzaLogica` con las firmas del bloque Interfaces. `inclinacionGrados` satura: `Math.max(-GRADOS_MAX, Math.min(GRADOS_MAX, diferencia * 4))`. Cabecera de comentario en el estilo del paquete hermano (`/** NivelaBalanzaLogica — reglas puras, sin DOM ni Phaser. */`).

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `node tests/js/run-tests.js`
Expected: PASS, todos los casos en verde.

- [ ] **Step 5: Commit**

```bash
git add public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/logica.js tests/js/nivela-balanza/logica.test.js
git commit -m "feat(nivela-balanza): reglas puras de equilibrio y cantidades"
```

---

### Task 3: Estado del depósito y los platillos (lógica de colocación)

Separa del motor gráfico la contabilidad de qué cristal está dónde, para que el doble conteo sea testeable sin Phaser.

**Files:**
- Modify: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/logica.js`
- Test: `tests/js/nivela-balanza/logica.test.js`

**Interfaces:**
- Consumes: `NivelaBalanzaLogica` de Tarea 2.
- Produces: añadidos al mismo global:
  - `crearEstado(reto) -> { objetivo, deposito, colocados }` — `deposito` y `colocados` son arrays de ids string `'c0'…'cN-1'`; arranca con todos los ids en `deposito`.
  - `colocar(estado, id) -> boolean` — mueve `id` de `deposito` a `colocados`; `false` (sin mutar) si el id no está en el depósito. **Idempotente frente a reentradas.**
  - `retirar(estado, id) -> boolean` — inverso; `false` si no estaba colocado.
  - `conteo(estado) -> { izquierda, derecha }` — `izquierda = estado.objetivo`, `derecha = estado.colocados.length`.

- [ ] **Step 1: Escribir los tests que fallan**

```js
// crearEstado
var e = crearEstado({ cantidadObjetivo: 4, cristalesEnDeposito: 6 });
e.objetivo === 4; e.deposito.length === 6; e.colocados.length === 0;

// colocar / retirar
colocar(e, 'c0') === true;  e.colocados.length === 1; e.deposito.length === 5;
colocar(e, 'c0') === false; e.colocados.length === 1;   // Review Focus 1: no duplica
colocar(e, 'cZZ') === false; e.colocados.length === 1;  // id inexistente
retirar(e, 'c0') === true;  e.colocados.length === 0; e.deposito.length === 6;
retirar(e, 'c0') === false; e.colocados.length === 0;   // Review Focus 1: no resta de más

// conteo
var f = crearEstado({ cantidadObjetivo: 4, cristalesEnDeposito: 6 });
colocar(f, 'c1'); colocar(f, 'c2');
conteo(f).izquierda === 4; conteo(f).derecha === 2;
```

- [ ] **Step 2: Ejecutar para verificar que falla**

Run: `node tests/js/run-tests.js`
Expected: FAIL — `crearEstado` no está definida.

- [ ] **Step 3: Implementar las cuatro funciones en `logica.js`**

Añadirlas al mismo IIFE y al objeto exportado. `colocar`/`retirar` comprueban pertenencia con `indexOf` antes de mutar y devuelven `false` sin efectos si no procede.

- [ ] **Step 4: Ejecutar para verificar que pasa**

Run: `node tests/js/run-tests.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/logica.js tests/js/nivela-balanza/logica.test.js
git commit -m "feat(nivela-balanza): estado de depósito y platillos sin duplicar conteo"
```

---

### Task 4: `config.json`, `sfx.js`, `index.html`, `style.css` e `img/` — el armazón

Shell completo, sin mecánica. Al terminar, abrir el paquete debe mostrar la pantalla de inicio con tema propio, pasar por intro3d y llegar a `#principal` con el contenedor `#phaser-juego` vacío pero presente.

**Files:**
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/config.json`
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/sfx.js`
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/index.html`
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/style.css`
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/img/insignia_balanza.svg`
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/img/balanza_icono.svg`
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/instrucciones.md`
- Reference: `../ConstruyeElCoheteEstelar/index.html` (armazón a seguir), `../ConstruyeElCoheteEstelar/sfx.js`

**Interfaces:**
- Consumes: nada del plan.
- Produces:
  - `config.json` con `nombre: "Nivela la balanza"`, `stub: false`, bloques `textos` (con `eligeNivel`, `demostracion`, `demostracionFin`, `conversacion`), `accesibilidad` (`letterSpacing: 2`, `volumenFondo: 20`, `rate: 5`, `mostrarIntro: true`), `audios` (`fondo`, `cierre`, `acierto`, `efectos`), `demo` (`cantidadObjetivo: 3`), y `niveles: [ { id: "5-6", edad: "5-6 años", titulo, bienvenida, retos: [4 retos], cierre, insignia } ]`.
  - Cada reto: `id`, `titulo`, `mecanica: "nivelar_balanza"`, `cantidadObjetivo` (4/6/8/10), `cristalesEnDeposito` (objetivo + 4), `presentacion`, `pregunta`, `acierto`, `errorPocos`, `errorMuchos`. Textos de `pregunta` usan `{cantidad}`.
  - `window.NivelaBalanzaSfx.sonar(nombre)` — mismo contrato que `sfx.js` del cohete.
  - `index.html` con todos los IDs de Global Constraints y el orden de scripts canónico, apuntando a `logica.js`, `sfx.js`, `phaser-juego.js`, `script.js` propios.

- [ ] **Step 1: Crear `config.json` con los 4 retos**

Cantidades exactas por ronda: reto 1 → `cantidadObjetivo: 4`, reto 2 → `6`, reto 3 → `8`, reto 4 → `10`. `cristalesEnDeposito` = objetivo + 4. `insignia.nombre: "Ingeniera del Equilibrio"`, `insignia.img: "img/insignia_balanza.svg"`.

- [ ] **Step 2: Verificar que el JSON parsea y las cantidades son las del spec**

Run: `node -e "const c=require('./public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/config.json'); const r=c.niveles[0].retos.map(x=>x.cantidadObjetivo); console.log(r); if(JSON.stringify(r)!=='[4,6,8,10]') process.exit(1); if(c.stub!==false) process.exit(1);"`
Expected: imprime `[ 4, 6, 8, 10 ]` y sale con código 0.

- [ ] **Step 3: Crear `sfx.js`, `index.html`, `style.css`, los dos SVG e `instrucciones.md`**

`index.html`: copiar la estructura de `../ConstruyeElCoheteEstelar/index.html` y adaptar — `<title>Nivela la balanza</title>`, `body class="esperando-inicio tema-balanza"`, icono de inicio `img/balanza_icono.svg`, kicker `Nivela la balanza`, insignia del `#final` a `img/insignia_balanza.svg`, barra superior con botones `balanza-btn` (reiniciar, salir, volumen `#btn-volumen-balanza`, pregunta `#btn-pregunta-balanza`), banner `#titulo-reto-balanza`, progreso `#barra-progreso-rel` + `#contador-cristales`, bocadillos `#bocadillo-zoe-texto` / `#bocadillo-zeus-texto`, subtítulo `Comparación de cantidades y equilibrio`. Sin `#btn-lanzar` (no aplica). Scripts en el orden de Global Constraints, con `?v=20261105a`.

`style.css`: tema azul profundo/cian con clases `balanza-*`; `#phaser-juego` ocupando `#principal`; sin redefinir clases del cohete.

SVG: generados a mano, planos, sin dependencias.

- [ ] **Step 4: Verificar el armazón en el navegador**

Levantar el servidor del proyecto y abrir el paquete. Comprobar: pantalla de inicio con tema propio, `¡Empecemos!` lleva a intro3d, `Omitir` lleva a `#principal`, sin errores en consola, `#phaser-juego` presente y vacío.
Expected: PASS en los cinco puntos.

- [ ] **Step 5: Commit**

```bash
git add public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/
git commit -m "feat(nivela-balanza): armazón del paquete, config de 4 rondas y tema visual"
```

---

### Task 5: `phaser-juego.js` — escena, balanza, cristales y arrastre

**Files:**
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/phaser-juego.js`
- Reference: `../ConstruyeElCoheteEstelar/phaser-juego.js` (patrón de texturas, montaje y host)

**Interfaces:**
- Consumes: `NivelaBalanzaLogica` (Tareas 2–3) para `estadoBalanza` y `GRADOS_MAX`; `PedniaPhaserHost.crear/destruirJuego`.
- Produces: `window.NivelaBalanzaPhaser` con:
  - `ANCHO: 1280`, `ALTO: 720`.
  - `montar({ parent, callbacks }) -> Promise<void>` — resuelve cuando la escena está lista. `callbacks`: `puedeInteractuar() -> boolean`, `onColocar(id)`, `onRetirar(id)`, `onSoltarFuera(id)`, `onAgarrar(id)`.
  - `destruir()`.
  - `prepararRonda({ objetivo, idsDeposito }) -> Promise<void>` — limpia la ronda anterior, reparte el depósito en rejilla sin solapes, y hace caer los `objetivo` cristales del platillo izquierdo **uno a uno** con rebote y chispas. Resuelve cuando el último aterriza.
  - `habilitarArrastre(activo)`.
  - `actualizarBalanza(izquierda, derecha)` — recalcula inclinación vía `estadoBalanza`, anima barra/platillos/cadenas con tween y tiñe la aguja (`rojo 0xff6060`, `amarillo 0xffd24d`, `verde 0x59e36b`).
  - `devolverAlDeposito(id)` — anima el regreso de un cristal colocado o soltado fuera.
  - `celebrarRonda(cristalesGanados) -> Promise<void>` — brillo, partículas, vuelo de cristales al cofre e incremento del contador.
  - `totalCofre() -> number`.
  - `celebrarFinal() -> Promise<void>` — apertura del cofre con el total acumulado.

- [ ] **Step 1: Implementar texturas, escena y balanza estática**

Texturas por código con `scene.make.graphics({ add: false })` + `generateTexture`: `cristal` (poliedro azul facetado con brillo), `chispa`, `estrella`, `nebulosa`, `platillo`, `barra`, `soporte`, `aguja`, `cofre`. Escena `EscenaBalanza` con fondo galaxia (gradiente + estrellas con tween de `alpha` + nebulosa), balanza centrada compuesta por `soporte`, `barra` (pivote central), `cadenaIzq`/`cadenaDer`, `platilloIzq`/`platilloDer`, `aguja` sobre el soporte, contadores de cada platillo, y cofre + contador en la esquina superior derecha. `montar` usa `PedniaPhaserHost.crear`.

- [ ] **Step 2: Verificar la escena en el navegador**

Abrir el paquete con una llamada temporal `NivelaBalanzaPhaser.montar({ parent: 'phaser-juego' })` desde la consola.
Expected: balanza completa visible y centrada, sin errores de consola, canvas escalando con la ventana.

- [ ] **Step 3: Implementar `prepararRonda` con la caída animada**

Posiciones de aterrizaje precalculadas dentro del platillo izquierdo (rejilla con jitter acotado, sin solapes). Cada cristal entra desde `y = -80` con tween `Bounce.easeOut`, escalonados ~160 ms con `setTimeout` global. Al impactar: chispas y un descenso breve del platillo. Depósito repartido en filas que se adaptan a la cantidad, todo dentro del área visible.

- [ ] **Step 4: Verificar la caída**

Llamar `prepararRonda({ objetivo: 10, idsDeposito: [...14 ids] })` desde consola.
Expected: 10 cristales caen uno a uno con rebote, ninguno solapado ni fuera del platillo; 14 en el depósito, todos visibles y separados.

- [ ] **Step 5: Implementar arrastre, retirada y `actualizarBalanza`**

`setInteractive({ useHandCursor: true })` + `scene.input.setDraggable`. En `dragstart`: escala ×1.1, `depth` alto, aviso `onAgarrar`. En `drag`: seguir el puntero. En `dragend`: si el puntero cae dentro del área del platillo derecho → `onColocar(id)`; si no → `devolverAlDeposito(id)` + `onSoltarFuera(id)`. Los cristales ya colocados aceptan tap o arrastre de vuelta → `onRetirar(id)`. **Guardas de Review Focus 1:** marcar cada sprite con `sprite.__enPlatillo` y `sprite.__animando`; ignorar `dragend` si el sprite ya está en el estado destino o si tiene una animación de colocación en curso. `habilitarArrastre(false)` desactiva `input` de todos los cristales.

- [ ] **Step 6: Verificar arrastre y equilibrio**

En el navegador, con `callbacks` que sólo hagan `console.log` y llamen `actualizarBalanza`:
Expected: arrastrar al platillo derecho coloca y la barra se inclina; soltar fuera devuelve al depósito; tocar un cristal colocado lo retira; la aguja pasa a amarillo con diferencia 1 y a verde sólo con diferencia 0; soltar dos veces el mismo cristal no duplica el contador.

- [ ] **Step 7: Implementar `celebrarRonda`, `totalCofre` y `celebrarFinal`**

`celebrarRonda`: brillo en todos los cristales, partículas, y vuelo escalonado de los `cristalesGanados` hacia el cofre con incremento progresivo del contador. `celebrarFinal`: cofre al centro, apertura y destello con el total. Ambas devuelven promesa que resuelve al acabar la animación.

- [ ] **Step 8: Verificar las celebraciones**

Llamar `celebrarRonda(4)` y luego `celebrarFinal()` desde consola.
Expected: los cristales vuelan al cofre, el contador sube de 0 a 4, `totalCofre() === 4`, y el final abre el cofre sin errores.

- [ ] **Step 9: Commit**

```bash
git add public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/phaser-juego.js
git commit -m "feat(nivela-balanza): escena Phaser con balanza animada, arrastre y cofre"
```

---

### Task 6: `script.js` — orquestación del flujo completo

**Files:**
- Create: `public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/script.js`
- Reference: `../ConstruyeElCoheteEstelar/script.js:320-540` (contrato exacto de intro3d, edad y victoria)

**Interfaces:**
- Consumes: `NivelaBalanzaLogica` (Tareas 2–3), `NivelaBalanzaPhaser` (Tarea 5), `NivelaBalanzaSfx` (Tarea 4), y los compartidos `TextoVoz`, `PedniaEdad`, `PedniaTutorial`, `PedniaPerfilJuego`, `window.iniciarSecuenciaVictoria`.
- Produces: IIFE sin exports; enlaza `window.cerrar_anuncio` y el listener `victory-continue`.

- [ ] **Step 1: Implementar carga, arranque e intro3d**

Replicar el contrato del hermano: `cargarConfig()` con `readText('config.json')` síncrono + `PedniaPerfilJuego.aplicar`; `TextoVoz.iniciar(gameConfig, introCfg, …)` con `../../../intro.json`; `conectarArranque()` enlazando `#btn-empecemos` → `empecemosJuego`, `#btn-omitir-intro3d`, `#btn-continuar-intro3d`, `window.addEventListener('victory-continue', empezarJuegoTrasIntro)` y `window.cerrar_anuncio = empezarJuegoTrasIntro`; `sincronizarDialogoIntro3d()` desde `textos.conversacion`; guarda `arrancado` para no entrar dos veces.

- [ ] **Step 2: Implementar selección de nivel, demo y bucle de rondas**

`empezarJuegoTrasIntro` → `PedniaEdad.iniciarNivel({ niveles, onElegido })` → `aplicarPreferencias()` → `montar` de Phaser → si `PedniaTutorial.mostrarIntroActiva(acc())` correr la demo con `config.demo` (3 cristales, fuera de las rondas reales) → bienvenida TTS → `siguienteReto()`.

Por reto: `habilitarArrastre(false)` → `prepararRonda` → TTS `presentacion` + `pregunta` (con `plantilla`, `{cantidad}` = objetivo) → `habilitarArrastre(true)`.

- [ ] **Step 3: Implementar la detección de victoria con guarda de corrección**

**Review Focus 2.** En `onColocar`/`onRetirar`: actualizar estado con `colocar`/`retirar`, llamar `actualizarBalanza` y refrescar el HUD. Si `esVictoria(izq, der)`, arrancar un `setTimeout` de 450 ms guardado en `temporizadorVictoria`; cualquier `onAgarrar`, `onColocar` o `onRetirar` posterior lo cancela con `clearTimeout`. Al disparar, re-comprobar `esVictoria` y que no haya arrastre vivo; sólo entonces cerrar la ronda. Si `der > objetivo`, decir `errorMuchos` con throttle de 2500 ms; si el niño lleva ≥ 8 s sin acertar y faltan cristales, decir `errorPocos` con el mismo throttle.

- [ ] **Step 4: Implementar cierre de ronda y victoria final**

Al cerrar ronda: `habilitarArrastre(false)` → `celebrarRonda(objetivo)` → TTS `acierto` → avanzar índice. Tras el cuarto reto: `celebrarFinal()` → poner `#texto_final` con el texto de `cierre` y el total del cofre → `#final.hidden = false` → `window.iniciarSecuenciaVictoria()`. Sin llamadas al backend.

- [ ] **Step 5: Verificar la partida completa en el navegador**

Jugar de inicio a fin: inicio → intro3d → demo → 4 rondas (4, 6, 8, 10) → victoria 3D.
Expected: las cuatro rondas se juegan y se ganan sólo con igualdad exacta; retirar cristales corrige sin reiniciar; pasar por el valor exacto mientras se sigue arrastrando **no** cierra la ronda; el cofre llega a 28; la victoria 3D se abre; consola limpia.

- [ ] **Step 6: Commit**

```bash
git add public/catalogo_juegos/Multisaberes/CuentaLosObjetos/NivelaLaBalanza/script.js
git commit -m "feat(nivela-balanza): orquestación de rondas, equilibrio y victoria"
```

---

### Task 7: Registro en el catálogo y verificación final

**Files:**
- Modify: el índice/listado donde `CuentaLosObjetos` declara sus subjuegos (localizar con `grep -rn "ConstruyeElCoheteEstelar" --include=*.php --include=*.json --include=*.js` fuera de la carpeta del propio paquete; si el catálogo se descubre por directorio, no hay archivo que tocar y este paso se cierra documentándolo).
- Modify: `docs/catalogo-juegos.md` (añadir el subjuego a la tabla de CuentaLosObjetos).

**Interfaces:**
- Consumes: el paquete completo (Tareas 4–6).
- Produces: el subjuego visible y jugable desde el kiosco y desde el preview del SuperAdmin.

- [ ] **Step 1: Localizar cómo se registran los subjuegos**

Run: `grep -rn "ConstruyeElCoheteEstelar" --include=*.php --include=*.json --include=*.js D:/ambientes/app D:/ambientes/resources D:/ambientes/database D:/ambientes/config D:/ambientes/routes`
Expected: o bien aparece un registro explícito a replicar, o no hay resultados (descubrimiento por directorio).

- [ ] **Step 2: Registrar el subjuego si hace falta**

Si el paso anterior encontró un registro, añadir la entrada equivalente para `NivelaLaBalanza` con el nombre `Nivela la balanza`. Si no, no tocar nada.

- [ ] **Step 3: Verificar en kiosco y en preview**

Abrir el subjuego desde el kiosco con una sesión de niño de 5–6 años y desde el preview del SuperAdmin.
Expected: aparece en el listado de CuentaLosObjetos; en kiosco entra directo al nivel 5-6; en preview muestra el selector manual; partida completa jugable en ambos.

- [ ] **Step 4: Verificar que no se rompió ningún hermano**

Abrir `AlimentaLosConejos` y `ConstruyeElCoheteEstelar` y jugar una ronda de cada uno.
Expected: ambos funcionan igual que antes, sin errores de consola (ningún global pisado).

- [ ] **Step 5: Actualizar `docs/catalogo-juegos.md` y commit**

```bash
git add docs/catalogo-juegos.md
git commit -m "docs: registrar Nivela la balanza en el catálogo de juegos"
```

---

## Notas de verificación global

Al cerrar el plan, estos puntos del spec deben quedar comprobados en navegador (no hay tests automáticos de UI en el proyecto):

- Caída animada obligatoria en las 4 rondas y también al volver a jugar.
- Arrastre con ratón y con pantalla táctil.
- Sin cristales solapados, fuera del platillo o fuera del depósito.
- Aguja en tiempo real, verde sólo con igualdad exacta.
- Retirada de cristales sin reiniciar la ronda.
- Cofre acumulando 4 + 6 + 8 + 10 = 28.
- Responsive en escritorio, tablet y móvil.
- Consola sin errores.
