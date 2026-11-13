# El Secuenciador de Baile y Lateralidad — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nuevo juego de Polimotor para 5-6 años donde Zeus baila rutinas en una pista futurista y el niño las repite en orden, con los 16 clips corporales de su GLB y lateralidad izquierda/derecha.

**Architecture:** Copia del paquete `SimonDiceCorporal` a `SecuenciadorBaileLateralidad`. El motor (`reglas.js`, `script.js`, `demo.js`) se reutiliza tal cual salvo un cambio: la lista de comandos pasa de constante a leerse del `config.json`, para admitir 16 en vez de 6. La escena (SVG del teatro) se sustituye por una pista de baile. Registro en el volcado SQL y en la tabla `juegos` real.

**Tech Stack:** HTML + CSS + JS vanilla, Phaser 4 (capa de efectos), three.js (Zeus 3D desde GLB), Web Audio (sonidos).

**Spec:** `docs/superpowers/specs/2026-11-13-secuenciador-baile-lateralidad-design.md`

## Global Constraints

- Ambiente Polimotor. Claves de catálogo: `ambiente_id 7, eje_id 11, tematica_id 31, modulo_id 9`.
- Slug: `secuenciador-baile-lateralidad`. Carpeta: `public/catalogo_juegos/Polimotor/SecuenciadorBaileLateralidad`.
- Nombre exacto: `El Secuenciador de Baile y Lateralidad`. Título en pantalla: `¡EL SECUENCIADOR DE BAILE!`.
- `config.json` → `niveles[0].edad` debe ser exactamente `"5-6 años"` (de ahí sale la edad del catálogo).
- 1 ronda × 6 tandas, `movimientos: [3,3,3,4,4,4]`. Siempre **3** botones visibles (`juego.visibles: 3`).
- 16 comandos, todos clips reales del GLB. Prohibido inventar animaciones o mover huesos por código
  (excepto el vuelo del salto, que ya existe en la base).
- No crear archivos SQL nuevos; solo añadir a `database/ambientes.sql` sin tocar filas existentes.
- No copiar el GLB: referenciarlo en `../SimonDiceCorporal/zeus_animado_suave.glb`.
- Solo computador y tableta (≥768 px). Sin frameworks nuevos.
- Idioma español con acentos correctos en código, UI y comentarios.

## Review Focus

Casos que la especificación implica pero ningún paso de abajo ejercita por sí solo; cada línea tiene su prueba añadida a la tarea dueña del código:

1. **Tanda de 4 con solo 3 visibles** — debe repetir un comando sin dos iguales seguidos; el generador no debe agotar sus 80 intentos y devolver una secuencia inválida. (Tarea 2)
2. **Comando no visible tocado** — un toque en un comando que no está en el trío de la tanda no debe contar ni romper el progreso. (Tarea 2)
3. **Cobertura de los 16 comandos** — con 6 tríos de 3 hay 18 posiciones; el sorteo debe cubrir los 16 comandos y no dejar ninguno fuera en toda la partida. (Tarea 2)
4. **Clips largos en tandas rápidas** — `Saltar_en_un_pie` (5.6 s) con un `ms` menor acelera el clip; debe terminar dentro del tiempo de la tanda sin solaparse con el siguiente movimiento. (Tarea 4)
5. **Par izquierda/derecha en el mismo trío** — los iconos y nombres de `derecho`/`izquierdo` deben ser distinguibles para no volver ambiguo el acierto. (Tarea 3)

---

### Task 1: Paquete copiado y config de 6 tandas

**Files:**
- Create: `public/catalogo_juegos/Polimotor/SecuenciadorBaileLateralidad/` (copia de `SimonDiceCorporal` sin el `.glb` ni el `.png`)
- Modify: `.../SecuenciadorBaileLateralidad/config.json`
- Test: `scripts/probar-secuenciador-baile-lateralidad.js`

**Interfaces:**
- Produces: `config.json` con `acciones[16]`, `rondas[0].movimientos = [3,3,3,4,4,4]`, `rondas[0].items = 6`,
  `juego.visibles = 3`, `niveles[0].edad = "5-6 años"`, `demo.secuencia` de 3 comandos.

- [ ] **Step 1: Copiar el paquete** sin el GLB (se referencia) y sin `simon-dice.png`.
- [ ] **Step 2: Escribir la prueba que falla** en `scripts/probar-secuenciador-baile-lateralidad.js`: comprueba
  que `config.acciones` tiene 16 ids únicos, que cada uno trae `clip` existente en la lista de clips del GLB,
  que `rondas[0].movimientos` es `[3,3,3,4,4,4]`, `items` 6, `juego.visibles` 3 y `niveles[0].edad` `"5-6 años"`.
- [ ] **Step 3: Ejecutar y verificar el fallo.** Run: `node scripts/probar-secuenciador-baile-lateralidad.js` → FALLA.
- [ ] **Step 4: Reescribir `config.json`** con los 16 comandos (id, nombre, voz, corto, color, nota, `clip`),
  las 6 tandas, la demo de 3 y los textos del secuenciador.
- [ ] **Step 5: Ejecutar y verificar que pasa.**
- [ ] **Step 6: Commit.**

---

### Task 2: Comandos desde el config (6 → 16)

**Files:**
- Modify: `.../SecuenciadorBaileLateralidad/reglas.js` (constantes `ACCIONES`, `DEMO`, `VISIBLES_DEMO`)
- Test: `scripts/probar-secuenciador-baile-lateralidad.js`

**Interfaces:**
- Consumes: `config.json` de la Tarea 1.
- Produces: `ReglasSecuenciador.accionesDeConfig(cfg) -> string[]`, y `sortearVisibles`, `generarSecuencias`,
  `problemasSecuencias`, `tocar`, `revisarJuego` operando sobre esa lista en vez de la constante.

- [ ] **Step 1: Escribir las pruebas que fallan** — con 200 semillas: toda secuencia usa solo su trío visible;
  ninguna tiene dos comandos iguales seguidos; las tandas de 4 tienen exactamente 4 y usan los 3 visibles;
  `problemasSecuencias` devuelve vacío siempre (Review Focus 1); un toque fuera del trío da
  `motivo: "no visible"` sin avanzar el progreso (Review Focus 2); y en 200 semillas los 16 comandos aparecen
  todos al menos una vez (Review Focus 3).
- [ ] **Step 2: Ejecutar y verificar el fallo** (el sorteo todavía usa los 6 viejos).
- [ ] **Step 3: Añadir `accionesDeConfig(cfg)`** que lee `cfg.acciones[].id` con respaldo a la constante, y
  sustituir los usos de `ACCIONES` por esa lista en `sortearVisibles`, `sortear`, `problemasSecuencias`,
  `tocar` y `revisarJuego`. `DEMO`/`VISIBLES_DEMO` pasan a leerse de `cfg.demo`.
- [ ] **Step 4: Ejecutar y verificar que pasan.**
- [ ] **Step 5: Comprobar que Simón Dice no se rompió.** Run: `node scripts/probar-simon-dice-corporal.js` → PASA.
- [ ] **Step 6: Commit.**

---

### Task 3: Iconos de los 16 comandos

**Files:**
- Modify: `.../SecuenciadorBaileLateralidad/iconos.js`
- Test: `scripts/probar-secuenciador-baile-lateralidad.js`

**Interfaces:**
- Produces: `IconosSecuenciador.dibujo(id) -> string` (SVG 200×200) para los 16 ids.

- [ ] **Step 1: Escribir la prueba que falla** — hay dibujo para los 16 ids, cada uno devuelve un `<svg` no vacío,
  y los cuatro de lateralidad difieren entre su par (el SVG de `brazoDerecho` ≠ el de `brazoIzquierdo`,
  idem pies) para que el acierto no sea ambiguo (Review Focus 5).
- [ ] **Step 2: Ejecutar y verificar el fallo.**
- [ ] **Step 3: Dibujar los 10 iconos nuevos** reusando las ayudas `carita`/`miembro` que ya existen; los de
  lateralidad llevan además una flecha y la inicial del lado.
- [ ] **Step 4: Ejecutar y verificar que pasan.**
- [ ] **Step 5: Commit.**

---

### Task 4: Zeus y los 16 clips

**Files:**
- Modify: `.../SecuenciadorBaileLateralidad/zeus-3d.js` (`MOVIMIENTOS`, `DURACION_CLIP`, `DURACION`, `URL_MODELO`)
- Test: `scripts/probar-secuenciador-baile-lateralidad.js`

**Interfaces:**
- Consumes: `config.acciones[].clip` de la Tarea 1.
- Produces: `Zeus3D.hacer(id, {ms, alGolpe})` para los 16 ids.

- [ ] **Step 1: Escribir la prueba que falla** — cada uno de los 16 ids tiene entrada en `MOVIMIENTOS` con un
  `clip` que existe en el GLB y al menos un contacto en 0..1; `DURACION_CLIP` trae la duración medida de cada
  clip usado; y ningún movimiento de una tanda dura más que el `msMovimiento` de esa tanda (Review Focus 4).
- [ ] **Step 2: Ejecutar y verificar el fallo.**
- [ ] **Step 3: Completar `MOVIMIENTOS`** con los 10 clips nuevos y sus contactos, `DURACION_CLIP` con las
  duraciones medidas, y apuntar `URL_MODELO` a `../SimonDiceCorporal/zeus_animado_suave.glb`.
- [ ] **Step 4: Ejecutar y verificar que pasan.**
- [ ] **Step 5: Commit.**

---

### Task 5: Escena de pista de baile

**Files:**
- Modify: `.../SecuenciadorBaileLateralidad/index.html` (SVG de fondo y cabecera), `style.css`, `escenario-phaser.js`
- Create: `.../SecuenciadorBaileLateralidad/secuenciador.png` (icono 256×256)

**Interfaces:**
- Consumes: `IconosSecuenciador` (Tarea 3), `Zeus3D` (Tarea 4).

- [ ] **Step 1: Sustituir el SVG del teatro** por la pista futurista: baldosas en perspectiva que se encienden,
  torres de altavoces, focos de neón que barren, aro de luz tras Zeus. Fuera telones, cenefa y marquesina de bombillas.
- [ ] **Step 2: Ajustar `style.css`** a la paleta de neón y a la botonera con número de orden e ilustración.
- [ ] **Step 3: Añadir a `escenario-phaser.js`** el efecto de baldosa encendida por movimiento.
- [ ] **Step 4: Verificar en el navegador** a 1366×768 y 1024×768: intro, demo automática, una tanda completa,
  sin errores de consola.
- [ ] **Step 5: Commit.**

---

### Task 6: Registro en el catálogo

**Files:**
- Modify: `database/ambientes.sql` (una fila nueva tras `pista-ritmo-pasos-magicos`)
- Test: `scripts/probar-secuenciador-baile-lateralidad.js`

- [ ] **Step 1: Escribir la prueba que falla** — `ambientes.sql` contiene exactamente una fila con el slug
  `secuenciador-baile-lateralidad`, con `7,11,31,9`, la ruta del paquete y sin alterar el número de filas previas.
- [ ] **Step 2: Ejecutar y verificar el fallo.**
- [ ] **Step 3: Añadir la fila** con nombre, descripción pedagógica (5-6 años, 6 tandas, lateralidad), imagen
  `secuenciador.png`, color y orden siguiente.
- [ ] **Step 4: Ejecutar y verificar que pasa.**
- [ ] **Step 5: Insertar en la BD real** con `php artisan tinker` y comprobar con
  `listarActivosPorAmbiente(7, 5)` que el juego aparece para 5 años y no para 3.
- [ ] **Step 6: Commit.**

---

### Task 7: Recorrido completo y documentación

**Files:**
- Create: `docs/juegos/polimotor/SecuenciadorBaileLateralidad.md`
- Modify: `scripts/probar-secuenciador-baile-lateralidad.js`

- [ ] **Step 1: Partida completa en el navegador:** intro → demo automática → 6 tandas (3,3,3,4,4,4) → victoria,
  incluyendo un error con reintento de la misma secuencia y un toque fuera del trío.
- [ ] **Step 2: Ejecutar la batería completa** y la de Simón Dice.
- [ ] **Step 3: Escribir la nota del juego** siguiendo la plantilla de `docs/juegos-escenas-animadas.md`:
  tabla comando → clip → contactos, las 6 tandas, el flujo y lo probado.
- [ ] **Step 4: Commit.**
