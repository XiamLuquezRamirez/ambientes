# Picnic con los Animalitos Glotones — Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Goal:** Un juego nuevo de Polimotor para 3-4 años donde el niño arrastra cada alimento de la cesta hasta la boca del animal que lo come, con cuatro animales quietos de dietas distintas y el mismo fondo de picnic del juego del oso.

**Architecture:** Copia de la familia escena de `HoraDeComerOsito`: `reglas.js` puro (también ejecutable en node), `dibujos.js` con SVG rasterizados, `animales.js` con los cuatro animales por piezas, `escena-picnic.js` con las escenas Phaser `Picnic` y `Fiesta`, `script.js` orquestando el flujo. La escena dibuja y avisa, las reglas deciden, el script ordena.

**Tech Stack:** Phaser 4 (`assets/vendor/phaser/phaser.min.js`), JS vanilla en IIFE sobre `window`, jQuery 4 para el DOM, Web Audio sintetizado sin archivos, three.js para la guía 3D (módulo ES), Bootstrap 5 + FontAwesome para los botones.

**Spec:** [`docs/superpowers/specs/2026-11-20-picnic-animalitos-glotones-design.md`](../specs/2026-11-20-picnic-animalitos-glotones-design.md)

## Global Constraints

- Carpeta `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/`, slug `picnic-animalitos-glotones`.
- Mundo de diseño **1600 × 900** con `Phaser.Scale.ENVELOP` y `autoCenter: CENTER_BOTH`. Lo importante entre x 220 y 1380.
- Idioma español en código, comentarios, nombres e interfaz. Acentos y signos correctos.
- La edad vive **solo** en `config.json` → `niveles[].edad` = `"3-4 años"`. Un solo nivel. Sin pastilla de edad en el HTML.
- `ambiente_id` 7, `eje_id` 17, `tematica_id` 34, `modulo_id` 9, orden **35**.
- Botones comunes de `../comun/interfaz.css`, **sin cambiar los íconos**: reiniciar `<button onclick="location.reload()" class="btn btn-warning btn-round"><i class="fa-solid fa-rotate"></i></button>`, salir `<button onclick="history.back()" class="btn btn-danger btn-round"><i class="fa-solid fa-arrow-left"></i></button>`, `<button id="btn-menu-acc" class="menu-acc-fab">` con `fa-universal-access`, `<button id="btn-menu-vol" class="menu-acc-fab">` con `fa-volume-high`.
- El módulo de sonidos debe llamarse `window.SonidosPicnic` (el patrón `/^Sonidos[A-Z]/` de `../comun/volumen.js` lo detecta solo) y el panel de volumen debe tener `#menu-vol-panel` con `#rango-volumen`.
- Título solo en la introducción, nunca sobre la escena de juego.
- Solo escritorio y tableta horizontal.
- Total de entregas: **9** (2 + 3 + 4).

## Review Focus

Casos que el spec implica pero que ninguna tarea ejercita de forma natural; cada línea tiene su prueba asignada en la tarea indicada:

1. **Soltar un alimento sobre dos bocas solapadas** — si dos animales quedan cerca, el alimento debe ir al más cercano, no al primero de la lista. (Tarea 2)
2. **Soltar el último alimento de la ronda sobre el animal equivocado** — la ronda no debe darse por terminada ni avanzar. (Tarea 2)
3. **Arrastrar mientras un animal come** — el segundo arrastre debe quedar bloqueado y el alimento volver a la cesta sin contarse. (Tarea 7)
4. **Config con un alimento cuyo animal no está en la ronda** — `revisarJuego` debe reportarlo en vez de dejar un alimento imposible de entregar. (Tarea 2)
5. **Plantilla de pista con alimento plural** — «las semillas **son** para el pajarito», no «es para». (Tarea 2)

---

### Task 1: Carpeta, `config.json` y el script de prueba

**Files:**
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/config.json`
- Create: `scripts/probar-picnic-animalitos.js`

**Interfaces:**
- Consumes: nada.
- Produces: el `config.json` que todas las tareas leen. Claves de primer nivel: `nombre`, `mostrarFeedBack`, `accesibilidad`, `audios`, `juego`, `animales`, `alimentos`, `rondas`, `demo`, `textos`, `niveles`.

Estructura exacta de las claves propias:

```json
"juego": { "radioBoca": 92, "radioBocaPorFallo": 12, "radioBocaMax": 140,
           "ayudaMs": 10000, "ayudaRepetirMs": 14000, "vozPausaMs": 2600,
           "aroPulsoMs": 1200 },
"animales": [
  { "id": "conejo", "nombre": "el conejito", "dieta": "herbivoro", "comer": "mordisquea" },
  { "id": "perro",  "nombre": "el perrito",  "dieta": "carnivoro", "comer": "roe" },
  { "id": "pajaro", "nombre": "el pajarito", "dieta": "granivoro", "comer": "picotea" },
  { "id": "oso",    "nombre": "el osito",    "dieta": "omnivoro",  "comer": "mastica" }
],
"alimentos": [
  { "id": "zanahoria", "nombre": "la zanahoria", "articulo": "la",  "plural": false, "animal": "conejo" },
  { "id": "lechuga",   "nombre": "la lechuga",   "articulo": "la",  "plural": false, "animal": "conejo" },
  { "id": "manzana",   "nombre": "la manzana",   "articulo": "la",  "plural": false, "animal": "conejo" },
  { "id": "huesito",   "nombre": "el huesito",   "articulo": "el",  "plural": false, "animal": "perro"  },
  { "id": "salchicha", "nombre": "la salchicha", "articulo": "la",  "plural": false, "animal": "perro"  },
  { "id": "croqueta",  "nombre": "la croqueta",  "articulo": "la",  "plural": false, "animal": "perro"  },
  { "id": "semillas",  "nombre": "las semillas", "articulo": "las", "plural": true,  "animal": "pajaro" },
  { "id": "maiz",      "nombre": "el maíz",      "articulo": "el",  "plural": false, "animal": "pajaro" },
  { "id": "miel",      "nombre": "la miel",      "articulo": "la",  "plural": false, "animal": "oso"    }
],
"rondas": [
  { "id": 1, "titulo": "RONDA 1", "nombre": "Dos amigos",
    "animales": ["conejo", "perro"], "alimentos": ["zanahoria", "huesito"] },
  { "id": 2, "titulo": "RONDA 2", "nombre": "Llega el pajarito",
    "animales": ["conejo", "perro", "pajaro"], "alimentos": ["lechuga", "salchicha", "semillas"] },
  { "id": 3, "titulo": "RONDA 3", "nombre": "Todos a comer",
    "animales": ["conejo", "perro", "pajaro", "oso"], "alimentos": ["manzana", "croqueta", "maiz", "miel"] }
],
"demo": { "alimento": "zanahoria" },
"niveles": [ { "id": "3", "edad": "3-4 años", "titulo": "Coordinación visual: a cada uno lo suyo" } ]
```

Textos literales que el spec fija (`textos`):

```json
"tituloIntro": "Picnic con los Animalitos Glotones",
"subtituloIntro": "¡Alimenta a cada animalito!",
"introZoe": "¡Hola! ¡Los animalitos tienen hambre! Toma la comida de la cesta con tu dedo, arrástrala hasta la boca de su dueño y suéltala para alimentarlo.",
"demoZeus": "¡Mira! Cada animalito come algo distinto. Lleva la zanahoria al conejito y suéltala en su boquita.",
"zoeEligeBien": "¡Lleva cada comida a su animalito! ¡No la sueltes hasta llegar a su boca!",
"zoeBien": "¡Muy bien! ¡Qué rico le quedó!",
"zoeOtraVez": "¡Inténtalo otra vez!",
"noEsSuyo": "{alimento} {verbo} para {animal}.",
"noEsSuyoVerboSingular": "es",
"noEsSuyoVerboPlural": "son",
"llegaAnimal": "¡Mira! Llegó {animal} y también tiene hambre.",
"rondaLista": "¡Muy bien! ¡Todos quedaron contentos!",
"botonComenzar": "¡Comenzar a jugar!",
"rondaListaTitulo": "¡RONDA {n} LISTA!",
"rondaSiguienteTitulo": "¡RONDA {n}!",
"finalZoe": "¡QUÉ GRAN ALIMENTADOR! Arrastraste la comida a cada animalito con una precisión genial.",
"finalZeus": "¡Aprendiste que cada animalito come algo diferente y llevaste cada comida a su dueño!",
"finalTitulo": "¡QUÉ GRAN ALIMENTADOR!",
"finalResultado": "¡{n} ALIMENTOS ENTREGADOS!",
"botonOtraVez": "Jugar nuevamente",
"botonMenu": "Volver al menú"
```

Además: `eligeNivel`, `ayuda` (array de dos pistas), `instruccionRonda` (array de `{pj, texto}`) y `conversacion` (array de `{personaje, texto}` para la intro 3D), con el tono del juego del oso.

- [ ] **Step 1: Escribir el script de prueba con las aserciones del spec**

En `scripts/probar-picnic-animalitos.js`, copiando la forma de `scripts/probar-hora-de-comer.js` (función `prueba(nombre, fn)`, contador `ok`/`total`, `process.exit`):

```js
const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "PicnicAnimalitosGlotones");
const R = require(path.join(dir, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

prueba("config sin problemas", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
});

prueba("tres rondas de 2, 3 y 4 animales (9 entregas)", function () {
    assert.strictEqual(R.totalRondas(cfg), 3);
    assert.deepStrictEqual(cfg.rondas.map(function (r) { return r.animales.length; }), [2, 3, 4]);
    cfg.rondas.forEach(function (r) { assert.strictEqual(r.alimentos.length, r.animales.length); });
    assert.strictEqual(R.totalAlimentos(cfg), 9);
    assert.strictEqual(R.plantilla(cfg.textos.finalResultado, { n: 9 }), "¡9 ALIMENTOS ENTREGADOS!");
});

prueba("cada ronda da un alimento por animal presente", function () {
    cfg.rondas.forEach(function (r, i) {
        const duenos = r.alimentos.map(function (a) { return R.animalDe(cfg, a); });
        assert.deepStrictEqual(duenos.slice().sort(), r.animales.slice().sort(), "ronda " + (i + 1));
    });
});

prueba("los animales entran y no se van", function () {
    const [a, b, c] = cfg.rondas.map(function (r) { return r.animales; });
    assert.ok(a.every(function (x) { return b.includes(x); }));
    assert.ok(b.every(function (x) { return c.includes(x); }));
});

prueba("textos literales del enunciado", function () {
    const t = cfg.textos;
    assert.strictEqual(t.introZoe, "¡Hola! ¡Los animalitos tienen hambre! Toma la comida de la cesta con tu dedo, arrástrala hasta la boca de su dueño y suéltala para alimentarlo.");
    assert.strictEqual(t.zoeEligeBien, "¡Lleva cada comida a su animalito! ¡No la sueltes hasta llegar a su boca!");
    assert.strictEqual(t.finalZoe, "¡QUÉ GRAN ALIMENTADOR! Arrastraste la comida a cada animalito con una precisión genial.");
    assert.strictEqual(t.finalTitulo, "¡QUÉ GRAN ALIMENTADOR!");
});

prueba("un solo nivel de 3-4 años", function () {
    assert.strictEqual(cfg.niveles.length, 1);
    assert.strictEqual(cfg.niveles[0].edad, "3-4 años");
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla**

Run: `node scripts/probar-picnic-animalitos.js`
Expected: FAIL — `Cannot find module .../reglas.js`

- [ ] **Step 3: Crear la carpeta y escribir `config.json`** con la estructura y los textos de arriba

- [ ] **Step 4: Ejecutar la prueba**

Run: `node scripts/probar-picnic-animalitos.js`
Expected: sigue FALLANDO por `reglas.js` (lo crea la tarea 2), pero ya no por el config. Verificar con `node -e "JSON.parse(require('fs').readFileSync('public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/config.json','utf8')); console.log('json ok')"` → imprime `json ok`.

- [ ] **Step 5: Commit**

```bash
git add public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/config.json scripts/probar-picnic-animalitos.js
git commit -m "feat(polimotor): config y prueba del Picnic con los Animalitos Glotones"
```

---

### Task 2: `reglas.js` — emparejamiento y evaluación

**Files:**
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/reglas.js`
- Test: `scripts/probar-picnic-animalitos.js` (ampliar)

**Interfaces:**
- Consumes: `config.json` de la tarea 1.
- Produces: `window.ReglasPicnic` y `module.exports` con:
  - `rondas(cfg) -> Array`
  - `totalRondas(cfg) -> number`
  - `ronda(cfg, i) -> Object`
  - `totalAlimentos(cfg) -> number`
  - `animalesRonda(cfg, i) -> string[]`
  - `animalDe(cfg, idAlimento) -> string|null`
  - `alimentoDe(cfg, idAnimal, i) -> string|null`
  - `datosAlimento(cfg, id) -> Object|null`
  - `datosAnimal(cfg, id) -> Object|null`
  - `idAlimento(i, k, tipo) -> string` → `"r{i+1}-{k}-{tipo}"`
  - `tipoDe(id) -> string`
  - `piezasRonda(cfg, i, rnd) -> Array<{id, tipo, animal}>` (mezclado Fisher-Yates con `rnd` opcional)
  - `mezclar(arr, rnd) -> Array`
  - `radioEntrega(cfg, fallos) -> number`
  - `animalMasCercano(bocas, punto) -> {id, distancia}|null`
  - `evaluarEntrega(o) -> {acierto, motivo, animal, distancia}` con `o = {alimento:{x,y}, bocas:[{id,x,y}], tipo, animalEsperado, radio, entregada}`; motivos `repetida` | `boca` | `otroAnimal` | `lejos`
  - `textoPista(cfg, idAlimento) -> string` (usa `noEsSuyo` con el verbo según `plural`)
  - `progreso(hechas, total) -> {hechas, total, marcas, completo}`
  - `plantilla(texto, vars) -> string`
  - `revisarJuego(cfg) -> string[]`

- [ ] **Step 1: Escribir las pruebas que faltan**

Añadir a `scripts/probar-picnic-animalitos.js`:

```js
prueba("el alimento va al animal más cercano cuando dos bocas se solapan", function () {
    const bocas = [{ id: "conejo", x: 400, y: 500 }, { id: "perro", x: 460, y: 500 }];
    const res = R.evaluarEntrega({ alimento: { x: 455, y: 500 }, bocas: bocas,
        tipo: "huesito", animalEsperado: "perro", radio: 92, entregada: false });
    assert.strictEqual(res.animal, "perro");
    assert.strictEqual(res.acierto, true);
});

prueba("soltar en el animal equivocado da motivo otroAnimal y no acierta", function () {
    const bocas = [{ id: "conejo", x: 400, y: 500 }, { id: "perro", x: 900, y: 500 }];
    const res = R.evaluarEntrega({ alimento: { x: 405, y: 500 }, bocas: bocas,
        tipo: "huesito", animalEsperado: "perro", radio: 92, entregada: false });
    assert.strictEqual(res.acierto, false);
    assert.strictEqual(res.motivo, "otroAnimal");
    assert.strictEqual(res.animal, "conejo");
});

prueba("soltar lejos de toda boca da motivo lejos", function () {
    const bocas = [{ id: "conejo", x: 400, y: 500 }];
    const res = R.evaluarEntrega({ alimento: { x: 1200, y: 200 }, bocas: bocas,
        tipo: "zanahoria", animalEsperado: "conejo", radio: 92, entregada: false });
    assert.strictEqual(res.motivo, "lejos");
});

prueba("un alimento ya entregado no se vuelve a entregar", function () {
    const bocas = [{ id: "conejo", x: 400, y: 500 }];
    const res = R.evaluarEntrega({ alimento: { x: 400, y: 500 }, bocas: bocas,
        tipo: "zanahoria", animalEsperado: "conejo", radio: 92, entregada: true });
    assert.strictEqual(res.motivo, "repetida");
    assert.strictEqual(res.acierto, false);
});

prueba("la zona de entrega crece con los fallos hasta el máximo", function () {
    assert.strictEqual(R.radioEntrega(cfg, 0), 92);
    assert.strictEqual(R.radioEntrega(cfg, 1), 104);
    assert.strictEqual(R.radioEntrega(cfg, 99), 140);
});

prueba("la pista concuerda el verbo con el plural del alimento", function () {
    assert.strictEqual(R.textoPista(cfg, "semillas"), "las semillas son para el pajarito.");
    assert.strictEqual(R.textoPista(cfg, "maiz"), "el maíz es para el pajarito.");
    assert.strictEqual(R.textoPista(cfg, "zanahoria"), "la zanahoria es para el conejito.");
});

prueba("revisarJuego detecta un alimento cuyo animal no está en la ronda", function () {
    const malo = JSON.parse(JSON.stringify(cfg));
    malo.rondas[0].alimentos = ["zanahoria", "miel"];
    assert.ok(R.revisarJuego(malo).length > 0);
});

prueba("piezasRonda mezcla sin perder ni repetir alimentos", function () {
    const piezas = R.piezasRonda(cfg, 2, function () { return 0.5; });
    assert.strictEqual(piezas.length, 4);
    assert.deepStrictEqual(piezas.map(function (p) { return p.tipo; }).sort(),
        cfg.rondas[2].alimentos.slice().sort());
    piezas.forEach(function (p) { assert.strictEqual(p.animal, R.animalDe(cfg, p.tipo)); });
});

prueba("ids únicos y tipo recuperable", function () {
    assert.strictEqual(R.idAlimento(1, 2, "semillas"), "r2-2-semillas");
    assert.strictEqual(R.tipoDe("r2-2-semillas"), "semillas");
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla**

Run: `node scripts/probar-picnic-animalitos.js`
Expected: FAIL — `Cannot find module .../reglas.js`

- [ ] **Step 3: Implementar `reglas.js`** como IIFE `(function (global) { ... })(this)` sin DOM ni Phaser, exponiendo las funciones del bloque Interfaces en `global.ReglasPicnic` y en `module.exports` si existe `module`

Notas de algoritmo que la firma no determina:
- `evaluarEntrega` resuelve en este orden: `entregada` → `repetida`; si no, busca con `animalMasCercano` la boca más cercana y, si su distancia > `radio`, devuelve `lejos`; si la boca más cercana es `animalEsperado`, `boca` con `acierto: true`; si es otra, `otroAnimal`.
- `textoPista` sustituye en `noEsSuyo` el `{alimento}` por `nombre` del alimento, `{verbo}` por `noEsSuyoVerboPlural` o `noEsSuyoVerboSingular` según `plural`, y `{animal}` por `nombre` del animal.
- `revisarJuego` comprueba: tres rondas; `alimentos.length === animales.length` en cada una; cada alimento de la ronda tiene su `animal` dentro de `ronda.animales`; ids de alimentos y animales únicos y existentes en los catálogos; los animales de cada ronda incluyen a los de la anterior; `niveles` presente con un solo nivel.

- [ ] **Step 4: Ejecutar la prueba**

Run: `node scripts/probar-picnic-animalitos.js`
Expected: PASS en todas

- [ ] **Step 5: Commit**

```bash
git add public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/reglas.js scripts/probar-picnic-animalitos.js
git commit -m "feat(polimotor): reglas de emparejamiento alimento-animal"
```

---

### Task 3: `dibujos.js` — alimentos, animales y escenario

**Files:**
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/dibujos.js`

**Interfaces:**
- Consumes: nada en tiempo de ejecución (usa el DOM para rasterizar).
- Produces: `window.DibujosPicnic` con `preparar() -> Promise`, `lista() -> Array<[clave, svg]>`, `svgAlimento(tipo) -> string` (data URL), `tiposAlimento() -> string[]`, y las piezas por clave: `pieza(clave) -> HTMLCanvasElement`, más `fondoPicnic()`, `fondoFiesta()`, `sombra()`, `chispa()`, `manchaLuz()`, `rayo()`, `cesta()`, `manta()`, `letrero()`, `cerca()`, `arbol(tipo)`, `arbusto()`, `hongos()`, `hierba()`, `hoja()`, `flor(k)`, `corazon()`, `estrella()`, `banderines()`, `confeti(color)`.

Claves de textura que la escena espera:
- Alimentos: `alimento-<id>` para los 9 ids del config.
- Conejo: `conejo-cuerpo`, `conejo-cabeza`, `conejo-oreja`, `conejo-pata`.
- Perro: `perro-cuerpo`, `perro-cabeza`, `perro-oreja`, `perro-pata`, `perro-cola`.
- Pájaro: `pajaro-cuerpo`, `pajaro-cabeza`, `pajaro-ala`, `pajaro-pata`.
- Oso: `oso-cuerpo`, `oso-cabeza`, `oso-brazo`, `oso-pie`, `oso-pierna` (igual que el juego base).
- Escenografía: `cesta`, `manta`, `letrero`, `cerca`, `arbusto`, `hongos`, `hierba`, `hoja`, `corazon`, `corazon-lila`, `estrella`, `banderines`, `arbol-verde`, `arbol-otono`, `arbol-rosa`, `arbol-amarillo`, `flor-0..2`, `petalo-0..2`, `sombra`, `chispa`, `fx-luz`, `fx-rayo`, `fondo-picnic`, `fondo-fiesta`.

- [ ] **Step 1: Copiar `dibujos.js` del juego base y renombrar el global**

```bash
cd public/catalogo_juegos/Polimotor
cp HoraDeComerOsito/dibujos.js PicnicAnimalitosGlotones/dibujos.js
```

Renombrar `DibujosComer` → `DibujosPicnic` dentro del archivo. Se conservan tal cual las ayudas de estilo privadas (`azar`, `svg`, `rg`, `lg`, `racimo`, `follaje`, `peludo`, `elipsePol`, `pelaje`, `oreja`, `garras`, `extremidad`, `rasterizar`, `preparar`) y toda la escenografía del bosque, que es justamente lo que el spec pide conservar.

- [ ] **Step 2: Sustituir el catálogo de frutas y objetos por los 9 alimentos**

Quitar `FRUTAS` (manzana, pera, banano, naranja, fresa, uvas) y `OBJETOS` (cuchara, tenedor, cuchillo, salero, taza). Crear `ALIMENTOS` con los 9 ids y clave de textura `alimento-<id>`, reutilizando `rg`/`lg` para los degradados, `tallo`/`hojaFruta`/`brilloSvg` donde apliquen:

| id | Dibujo |
|---|---|
| `zanahoria` | cono naranja con surcos y penacho verde de tres hojas |
| `lechuga` | cogollo de hojas verdes onduladas con `racimo` |
| `manzana` | la del juego base, reutilizada |
| `huesito` | hueso crema de dos nudos con brillo |
| `salchicha` | salchicha rosada curva con atado en los extremos |
| `croqueta` | galleta marrón en forma de hueso con textura de puntitos |
| `semillas` | montoncito de pipas y granos variados |
| `maiz` | mazorca amarilla con granos en rejilla y hojas verdes |
| `miel` | tarro ámbar con tapa de tela a cuadros y un hilo de miel |

- [ ] **Step 3: Añadir las piezas de los tres animales nuevos**

Con la misma técnica del oso (`peludo` + `elipsePol` para los contornos con mechones, `pelaje` para la textura, luz arriba a la izquierda y sombra abajo a la derecha, contorno oscuro redondeado). **De frente**, no de perfil como el conejo de la fiesta del juego base, porque aquí la boca tiene que mirar al niño:

- Conejo gris claro: cuerpo ovalado con pechera blanca, cabeza redonda, dos orejas largas (pieza aparte para animarlas), patitas delanteras. Ojos y boca los dibuja `animales.js` con `Graphics`.
- Perro beige con manchas marrones: cuerpo sentado, cabeza con hocico marcado, orejas caídas (pieza aparte), cola (pieza aparte).
- Pájaro azul: cuerpo rechoncho con vientre crema, cabeza con pico naranja de dos mitades (la mitad inferior se anima), un ala por lado (pieza aparte), patitas naranjas.

Las piezas del oso se copian sin cambios del juego base.

- [ ] **Step 4: Registrar todas las claves en `lista()` y comprobar que rasterizan**

`preparar()` solo rasteriza lo que esté en `lista()`. Añadir las claves nuevas y quitar las de frutas y objetos viejos.

Verificación: abrir el juego (tarea 8) y en la consola del navegador
`DibujosPicnic.preparar().then(() => console.log(DibujosPicnic.lista().length, "piezas"))`
Expected: imprime el número de piezas sin ningún error de SVG.

- [ ] **Step 5: Commit**

```bash
git add public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/dibujos.js
git commit -m "feat(polimotor): dibujos de los nueve alimentos y los cuatro animales"
```

---

### Task 4: `animales.js` — los cuatro animales por piezas

**Files:**
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/animales.js`

**Interfaces:**
- Consumes: texturas de `DibujosPicnic` (tarea 3), `anim.agregar(ms, fn)` del `Animador` de la escena (tarea 5).
- Produces: `window.AnimalesPicnic` con:
  - `crear(tipo, scene, x, y, anim, escala) -> Animal` (tipo: `conejo` | `perro` | `pajaro` | `oso`)
  - Cada `Animal` expone, con la **misma firma para los cuatro** (así la escena los trata igual):
    - `c` — el container Phaser raíz
    - `puntoBoca() -> {x, y}` en coordenadas de mundo
    - `abrirBoca() -> Promise` / `cerrarBoca() -> Promise`
    - `comer() -> Promise` — la animación propia de cada dieta
    - `negar() -> Promise` — cierra la boca y sacude la cabeza
    - `celebrar() -> Promise`
    - `frotarBarriga(ms) -> Promise`
    - `terminarDeComer() -> Promise` — el gesto de satisfacción propio
    - `saltar(n) -> Promise`
    - `mostrarAro(on) -> void` / `resaltarAro(on) -> void`
    - `update(dt) -> void`
    - `reiniciar() -> void`
    - `ocupado` (bool), `apertura` (0..1), `ojos` (string), `alMasticar` (callback `fn(k)`)

- [ ] **Step 1: Implementar la base común `Animal`**

Un constructor base que arma el container, los `Graphics` de ojos, boca y aro, y resuelve `update`, `dibujarOjos`, `dibujarAro`, `mostrarAro`, `resaltarAro`, `abrirBoca`, `cerrarBoca`, `negar`, `reiniciar` y `puntoBoca` igual para todos. Copiar de `HoraDeComerOsito/oso.js` el patrón de `negar()` (cerrar en 160 ms, luego `giroCabeza = sin(u*PI*4) * 0.2 * (1 - u*0.5)` durante 900 ms) y el de `dibujarBoca` por `Graphics` vectorial con redibujo solo si `|apertura - aperturaDibujada| > 0.01`.

El **aro dorado** es un `Graphics` alrededor de la boca: dos círculos concéntricos en `#ffd43b` con alfa pulsante `0.45 + 0.35 * sin(t / aroPulsoMs * 2π)`, radio igual al radio de entrega vigente. `resaltarAro(true)` lo engrosa cuando el alimento arrastrado está cerca.

- [ ] **Step 2: Implementar las cuatro formas de comer**

Cada subtipo redefine `comer()` y `terminarDeComer()`:

- **Conejo** `mordisquea`: 6 mordiscos rápidos de 110 ms (apertura 0.35 ↔ 0, `alMasticar(k)` en cada uno), con las orejas sacudiéndose (`oreja.rotation = sin(u*PI*6) * 0.18`). `terminarDeComer`: se sacude y da dos saltitos.
- **Perro** `roe`: la cabeza se inclina `giroCabeza = -0.22` y mastica de lado 4 veces de 180 ms, con la lengua fuera (parte del `dibujarBoca` cuando `comiendo`). `terminarDeComer`: mueve la cola 1200 ms y se relame.
- **Pájaro** `picotea`: 5 picotazos (la cabeza baja 26 px en 90 ms y sube en 110 ms, `alMasticar(k)` en cada uno) y luego echa la cabeza atrás `-0.4` durante 300 ms para tragar. `terminarDeComer`: ahueca las plumas (escala 1.06 y vuelta, alas separadas).
- **Oso** `mastica`: el `comer()` del juego base — 3 masticadas lentas, ojos alegres, brazo arriba. `terminarDeComer`: `frotarBarriga(1200)`.

- [ ] **Step 3: Verificar las cuatro animaciones en el navegador**

Con el juego abierto (tarea 8), en la consola:

```js
const a = __escenarioPicnic.scene.getScene("Picnic").animales;
a.forEach(x => console.log(x.tipo, typeof x.comer, typeof x.negar, typeof x.terminarDeComer));
await a[0].comer();
```
Expected: los cuatro imprimen `function function function` y la animación corre sin excepciones en consola.

- [ ] **Step 4: Commit**

```bash
git add public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/animales.js
git commit -m "feat(polimotor): los cuatro animales con su forma propia de comer"
```

---

### Task 5: `escena-picnic.js` — escena Picnic, cesta y arrastre

**Files:**
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/escena-picnic.js`

**Interfaces:**
- Consumes: `DibujosPicnic` (tarea 3), `AnimalesPicnic` (tarea 4), `ReglasPicnic` (tarea 2).
- Produces: `window.EscenarioPicnic` con `montar(contenedor, config) -> Promise<boolean>`, `listo()`, `al(nombre, fn)` (`tomar` | `arrastrar` | `soltar` | `evento`), `cargarRonda(idx, piezas) -> Promise`, `animales() -> Animal[]`, `bocas() -> [{id,x,y}]` (mundo), `entregar(id) -> Promise`, `devolver(id) -> Promise`, `rechazar(id, idAnimal) -> Promise`, `destacar(id)`, `haloAyuda(on)`, `radio(r)`, `arrastre(on)`, `activar(on)`, `vaciar()`, `estado(id)`, `tipoDe(id)`, `puntoDe(id)`, `puntoBocaDe(idAnimal)`, `alimentosEnCesta() -> string[]`, `celebrarRonda() -> Promise`, `tomarDemo(id)`, `moverDemo(id, sx, sy)`, `soltarDemo(id)`, `aPantalla(x,y)`, `aMundo(x,y)`, `zonaZoe()`, `reacomodar()`, `irFiesta() -> Promise<boolean>`, `secuenciaFiesta() -> Promise`, `detenerFiesta()`, `enFiesta()`, `juego()`. Guarda `window.__escenarioPicnic`.

Layout (mundo 1600 × 900):

```
W = 1600, H = 900
CESTA = { x: 800, y: 836 }                  // la cesta reemplaza al plato del juego base
RANURAS_CESTA = [ {x:-150,y:-14}, {x:-50,y:-4}, {x:50,y:-4}, {x:150,y:-14} ]
TAM_ALIMENTO = 112
LUGARES = {                                  // por cantidad de animales en la ronda
  2: [ {x:620,y:600,esc:1.00}, {x:1000,y:600,esc:1.00} ],
  3: [ {x:520,y:592,esc:0.96}, {x:800,y:612,esc:1.04}, {x:1080,y:592,esc:0.96} ],
  4: [ {x:450,y:586,esc:0.92}, {x:700,y:608,esc:1.02}, {x:960,y:608,esc:1.02}, {x:1210,y:586,esc:0.92} ]
}
```

- [ ] **Step 1: Copiar la escena del juego base y renombrar**

```bash
cd public/catalogo_juegos/Polimotor
cp HoraDeComerOsito/escena-picnic.js PicnicAnimalitosGlotones/escena-picnic.js
```

Renombrar `EscenarioComer` → `EscenarioPicnic`, `DibujosComer` → `DibujosPicnic`, `ReglasComer` → `ReglasPicnic`, `__escenarioComer` → `__escenarioPicnic`. Conservar sin cambios `Animador`, `Particulas`, `tex`, `prepararTexturas`, `crearBosque`, `animarBosque`, `lienzoRect`, `aPantalla`, `aMundo` y la llamada a `crearBosque` de la escena Picnic con sus mismos parámetros (`filaY: 340`, `semilla: 2024`, los mismos `lados` y `decor`): el spec exige que el fondo no cambie.

- [ ] **Step 2: Sustituir el oso único por el grupo de animales**

En `create()`: quitar `this.oso` y `this.plato`; añadir `this.manta` (textura `manta` centrada bajo los animales), `this.cesta` en `CESTA` con origen `(0.5, 1)` y profundidad 3, y `this.animales = []`, que `cargarRonda` llena. Cada animal se crea con `AnimalesPicnic.crear(tipo, this, x, y, this.anim, esc)` según `LUGARES[n]`, con `setDepth(5)` y profundidad mayor para los que están más adelante.

Los seis slots de fruta pasan a ser **cuatro** slots de alimento (`this.alimentos`), con el mismo objeto `{k, id, tipo, animal, img, sombra, base, escala, estado}` y los mismos estados. `setInteractive` con `hitArea` circular de 80 px y `draggable: true`, igual que el base.

- [ ] **Step 3: Adaptar el arrastre al aro del animal correcto**

`alEmpezar` emite `tomar` y además enciende el aro del animal dueño: `this.animalPorId(f.animal).mostrarAro(true)`. `alMover` emite `arrastrar` y, si la distancia de `f.img` a `puntoBocaDe(f.animal)` es menor que `this.radio * 1.35`, llama `resaltarAro(true)` en ese animal y `false` en los demás. `alSoltar` apaga todos los aros y emite `soltar` con el id.

`bocas()` devuelve `this.animales.map(a => ({ id: a.tipo, ...a.puntoBoca() }))`, que es justo lo que `ReglasPicnic.evaluarEntrega` consume.

- [ ] **Step 4: Adaptar `cargarRonda`, `entregar` y `rechazar`**

- `cargarRonda(idx, piezas)` recibe `[{id, tipo, animal}]` de `ReglasPicnic.piezasRonda`: crea o conserva los animales de la ronda (los ya presentes se quedan en su lugar; los nuevos entran con un salto de 900 ms desde fuera de la pantalla y emiten `evento("llega", tipo)`), reubica a todos según `LUGARES[n]`, y hace caer los alimentos en la cesta con el mismo escalonado de 130 ms y rebote de 560 ms.
- `entregar(f)` vuela el alimento a `puntoBocaDe(f.animal)` en 300 ms, emite `evento("entra")`, y espera `animalPorId(f.animal).comer()`; luego emite `evento("feliz", f.animal)` y lanza partículas de corazones y estrellas.
- `rechazar(f, idAnimal)` emite `evento("niega", idAnimal)` y espera `Promise.all([animalPorId(idAnimal).negar(), this.devolver(f)])`.
- `devolver(f)` queda igual que el base (560 ms de vuelta + 260 ms de rebote).

- [ ] **Step 5: Verificar en el navegador que se puede arrastrar y entregar**

Con el juego abierto (tarea 8), en la consola, pasada la demo y empezada la ronda 1:

```js
const E = EscenarioPicnic, id = E.alimentosEnCesta()[0];
const a = E.tipoDe(id), p = E.puntoDe(id), b = E.puntoBocaDe(E.estado(id).animal);
E.tomarDemo(id); E.moverDemo(id, b.x, b.y); E.soltarDemo(id);
```
Expected: el alimento llega a la boca, el animal ejecuta su animación y el contador pasa a `1 / 9`.

- [ ] **Step 6: Commit**

```bash
git add public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/escena-picnic.js
git commit -m "feat(polimotor): escena del picnic con cesta, cuatro animales y aro dorado"
```

---

### Task 6: Escena `Fiesta` y `sonidos.js`

**Files:**
- Modify: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/escena-picnic.js` (la clase `EscenaFiesta`)
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/sonidos.js`

**Interfaces:**
- Consumes: `AnimalesPicnic` (tarea 4), `DibujosPicnic` (tarea 3).
- Produces: `window.SonidosPicnic` con `desbloquear()`, `ambiente(on)`, `musica(on)`, `volumen(pct)`, `volumenFondo(pct)`, `volumenEfectos(pct)`, `silenciar(on)`, `silenciado()`, `agachar(on)`, `detenerTodo()`, `sonar(nombre)`, y los efectos como métodos directos: `seleccion`, `arrastre`, `entraBoca`, `masticar`, `satisfaccion`, `acierto`, `error`, `rebote`, `aparece`, `ronda`, `estrellas`, `brinco`, `pio`, `ladrido`, `gruñido`, `ñam`, `niega`.
- La escena `Fiesta` emite: `final-come`, `final-amigos`, `final-levanta`, `final-fiesta`, `final-salto` (índice 0-3), `final-frutas`, `final-saludo`.

- [ ] **Step 1: Copiar `sonidos.js` y añadir los cuatro sonidos nuevos**

```bash
cd public/catalogo_juegos/Polimotor
cp HoraDeComerOsito/sonidos.js PicnicAnimalitosGlotones/sonidos.js
```

Renombrar `SonidosComer` → `SonidosPicnic` y quitar `abreBoca` (ya no hay ciclo de boca). Añadir al objeto `S`, con la misma técnica de `tono`/`soplo` que el archivo ya usa:

| Nombre | Síntesis |
|---|---|
| `ladrido` | dos `tono("sawtooth", 420→180, 0.12)` separados 90 ms, con `soplo` corto encima |
| `gruñido` | `tono("sine", 110→80, 0.5)` con un segundo armónico a 165 Hz y alfa descendente |
| `ñam` | cuatro `tono("triangle", 600→400, 0.05)` cada 70 ms |
| `niega` | dos `tono("sine", 300→240, 0.14)` descendentes separados 150 ms |

El arranque automático de `../comun/volumen.js` detecta `SonidosPicnic` por el patrón `/^Sonidos[A-Z]/`, así que no hace falta llamar a `VolumenPolimotor.iniciar`. **Corregir de paso** lo que el juego base tiene mal: la música de fiesta (`compas`) debe ir al canal `amb`, no a `efectos`, para que `volumenFondo` la controle.

- [ ] **Step 2: Adaptar la escena `Fiesta` a los cuatro animales**

Quitar la clase `Amigo` y las cuatro instancias (ardilla, conejo, pájaro azul, pájaro rojo). En su lugar, crear los **cuatro animales del juego** con `AnimalesPicnic.crear` en los lugares de `LUGARES[4]`, con `escala` ligeramente mayor (1.04) y la cesta y los banderines donde los tenía la fiesta del base.

Reescribir `secuencia()` conservando la estructura de seis pasos del original:
1. `evento("final-come")` y `Promise.all(animales.map(a => a.terminarDeComer()))`.
2. `lluviaOn = true` y `evento("final-amigos")`.
3. `evento("final-levanta")` y `Promise.all(animales.map(a => a.ponerseDePie ? a.ponerseDePie() : a.saltar(1)))`.
4. `evento("final-fiesta")`, que `script.js` usa para arrancar `musica(true)`.
5. Bucle `i = 0..3`: `evento("final-salto", i)` con partículas; en los impares, `evento("final-frutas")` y `Promise.all([saltitos, levantarAlimentos(900)])`, donde cada animal levanta el alimento de su última ronda (conejo `manzana`, perro `croqueta`, pájaro `maiz`, oso `miel`).
6. `evento("final-saludo")` y `saludar()` de 1800 ms.

- [ ] **Step 3: Verificar la fiesta en el navegador**

Con el juego abierto, en la consola:

```js
await EscenarioPicnic.irFiesta();
await EscenarioPicnic.secuenciaFiesta();
```
Expected: los cuatro animales aparecen, bailan y levantan su alimento; no hay errores en consola.

- [ ] **Step 4: Commit**

```bash
git add public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/escena-picnic.js public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/sonidos.js
git commit -m "feat(polimotor): fiesta final con los cuatro animales y sonidos propios"
```

---

### Task 7: `index.html`, `style.css`, `guia-3d.js`, `demo.js` y `script.js`

**Files:**
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/index.html`
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/style.css`
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/guia-3d.js`
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/demo.js`
- Create: `public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/script.js`

**Interfaces:**
- Consumes: todo lo anterior, más `TextoVoz`, `PedniaEdad`, `PedniaTutorial`, `Guia3D`, `INTRO_CONFIG`.
- Produces: `window.PicnicDemo.correr(api)`, `window.confirmarNivel(id)`.

- [ ] **Step 1: Copiar los cinco archivos del juego base y renombrar los globales**

```bash
cd public/catalogo_juegos/Polimotor
for f in index.html style.css guia-3d.js demo.js script.js; do cp HoraDeComerOsito/$f PicnicAnimalitosGlotones/$f; done
```

Renombrar en los cinco: `EscenarioComer` → `EscenarioPicnic`, `SonidosComer` → `SonidosPicnic`, `DibujosComer` → `DibujosPicnic`, `ReglasComer` → `ReglasPicnic`, `ComerDemo` → `PicnicDemo`, `OsoComer` → `AnimalesPicnic`.

En `index.html`: cambiar la lista de `<script>` (`oso.js` → `animales.js`), el `aria-label` del escenario a «Picnic en el bosque: arrastra cada comida hasta la boca de su animalito», el contador a `aria-valuemax="9"` y texto `0 / 9`, y el `<title>`. Mantener intactos los bloques de botones comunes y el `importmap` de three.

- [ ] **Step 2: Escribir la prueba de interfaz y de flujo**

Añadir a `scripts/probar-picnic-animalitos.js`:

```js
prueba("interfaz: controles en su lugar, sin título ni botón de edad en el juego", function () {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    ["btn-menu-acc", "btn-menu-vol", "btn-silencio", "contador", "indicador-ronda",
     "btn-comenzar", "btn-otra-vez", "btn-al-menu", "menu-vol-panel", "rango-volumen"]
        .forEach(function (id) { assert.ok(html.indexOf('id="' + id + '"') >= 0, "falta " + id); });
    assert.ok(html.indexOf('id="intro-titulo"') < 0, "el título no debe estar en la pantalla de juego");
    assert.ok(/comun\/interfaz\.css/.test(html), "faltan los botones comunes");
    assert.ok(/onclick="location\.reload\(\)" class="btn btn-warning btn-round"[^>]*><i class="fa-solid fa-rotate"><\/i>/.test(html), "reiniciar distinto a los demás juegos");
    assert.ok(/onclick="history\.back\(\)" class="btn btn-danger btn-round"[^>]*><i class="fa-solid fa-arrow-left"><\/i>/.test(html), "volver distinto a los demás juegos");
    assert.ok(/id="btn-menu-acc" class="menu-acc-fab"/.test(html) && /fa-universal-access/.test(html), "accesibilidad distinta");
    assert.ok(/id="btn-menu-vol" class="menu-acc-fab"/.test(html) && /fa-volume-high/.test(html), "volumen distinto");
    assert.ok(!/3-4 años|5-6 años/.test(html), "no debe haber botón de edad");
    assert.ok(/aria-valuemax="9"/.test(html), "el contador debe ser de 9");
    assert.ok(fs.existsSync(path.join(dir, "picnic-animalitos.png")), "falta el ícono");
});

prueba("los scripts del juego se cargan en orden", function () {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    const orden = ["reglas.js", "dibujos.js", "sonidos.js", "animales.js", "escena-picnic.js", "demo.js", "script.js"];
    let pos = -1;
    orden.forEach(function (f) {
        const i = html.indexOf('src="' + f);
        assert.ok(i > pos, f + " fuera de orden");
        pos = i;
    });
    assert.ok(html.indexOf("comun/volumen.js") >= 0, "falta el volumen por canales");
    assert.ok(html.indexOf("oso.js") < 0, "no debe quedar oso.js");
});

prueba("el arrastre se bloquea mientras un animal come", function () {
    // ReglasPicnic no conoce el bloqueo (es de la escena), pero sí que una pieza ya
    // entregada no se vuelve a aceptar aunque se suelte sobre la boca correcta.
    const bocas = [{ id: "conejo", x: 400, y: 500 }];
    const res = R.evaluarEntrega({ alimento: { x: 400, y: 500 }, bocas: bocas,
        tipo: "zanahoria", animalEsperado: "conejo", radio: 92, entregada: true });
    assert.strictEqual(res.acierto, false);
});
```

- [ ] **Step 3: Ejecutar la prueba para verificar que falla**

Run: `node scripts/probar-picnic-animalitos.js`
Expected: FAIL en «interfaz» (falta el PNG) y en «orden» si quedó `oso.js`

- [ ] **Step 4: Adaptar `script.js` al emparejamiento**

Cambios sobre la copia:
- `alSoltar(id)`: llamar `R().evaluarEntrega({ alimento, bocas: e.bocas(), tipo, animalEsperado: e.estado(id).animal, radio: radioActual(), entregada: entregadas.has(id) })`. Según `res.motivo`: `boca` → `await e.entregar(id)`, suma al contador y `fallosSeguidos = 0`; `otroAnimal` → `await e.rechazar(id, res.animal)` y `decirRapido(R().textoPista(gameConfig, tipo))`, **sin** tocar `fallosSeguidos`; `lejos` → `fallosSeguidos++`, `e.radio(radioActual())`, `sfx("error")`, `decirRapido(textos().zoeOtraVez)` y `e.devolver(id)`; `repetida` → solo `e.devolver(id)`.
- `comenzarRonda(i)`: `fallosSeguidos = 0` y `e.radio(radioActual())` al empezar, para que la zona agrandada no se arrastre entre rondas.
- `construirHud`/`pintarHud`: tres grupos de 2, 3 y 4 huecos y el texto `n / 9`, usando `R().rondas` y `r.alimentos`.
- `alEventoEscena`: `niega` → `sfx("niega")`; `feliz` con el id del animal → el sonido propio (`ñam`, `ladrido`, `pio`, `gruñido`) seguido de `sfx("estrellas")`; `llega` → `sfx("brinco")` y `decirRapido(plantilla(textos().llegaAnimal, {animal: nombreDe(tipo)}))`.
- `apiDemo()`: quitar `moverOso` y `abrirBoca`; `frutaDemo` pasa a `alimentoDemo` y `boca` recibe el animal dueño.

- [ ] **Step 5: Generar el ícono `picnic-animalitos.png`**

256 × 256, rasterizando con Edge headless los dibujos propios (los cuatro animales y la cesta), como se hizo en el juego del oso.

- [ ] **Step 6: Ejecutar la prueba**

Run: `node scripts/probar-picnic-animalitos.js`
Expected: PASS en todas

- [ ] **Step 7: Commit**

```bash
git add public/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones scripts/probar-picnic-animalitos.js
git commit -m "feat(polimotor): interfaz, demo y flujo del Picnic con los Animalitos Glotones"
```

---

### Task 8: Prueba en el navegador

**Files:**
- Modify: `.claude/launch.json` (añadir el servidor `juegos-picnic` en el puerto 8042)

**Interfaces:**
- Consumes: el juego completo de las tareas 1-7.
- Produces: nada en código; evidencia de que funciona.

- [ ] **Step 1: Añadir la configuración del servidor**

En `.claude/launch.json`, una entrada más:

```json
{ "name": "juegos-picnic", "runtimeExecutable": "python",
  "runtimeArgs": ["-m", "http.server", "8042", "--directory", "public"],
  "port": 8042, "autoPort": false }
```

- [ ] **Step 2: Abrir el juego y recorrer el flujo completo**

`preview_start juegos-picnic` → `/catalogo_juegos/Polimotor/PicnicAnimalitosGlotones/index.html?edad=4`

Recorrer: portada → intro 3D → presentación → demo → ronda 1 → ronda 2 → ronda 3 → fiesta → panel final. Con el panel oculto, mover el reloj a mano:
`setInterval(() => __escenarioPicnic.loop.step(performance.now()), 16)`

- [ ] **Step 3: Comprobar los casos del Review Focus en vivo**

1. Soltar un alimento justo entre dos animales contiguos → va al más cercano.
2. Soltar el último alimento de la ronda en el animal equivocado → la ronda **no** avanza.
3. Intentar arrastrar un segundo alimento mientras un animal come → no se mueve.
4. Soltar lejos varias veces → el aro crece hasta 140 y se reinicia en la ronda siguiente.

- [ ] **Step 4: Revisar consola y red**

`read_console_messages` con `onlyErrors: true` → sin errores. Captura de pantalla de la ronda 3 con los cuatro animales y del panel final.

- [ ] **Step 5: Commit**

```bash
git add .claude/launch.json
git commit -m "chore: servidor estático para probar el Picnic con los Animalitos Glotones"
```

---

### Task 9: Registro en la base de datos y documentación

**Files:**
- Modify: `database/ambientes.sql`
- Create: `docs/juegos/Polimotor/PicnicAnimalitosGlotones.md`

**Interfaces:**
- Consumes: el juego terminado.
- Produces: la fila en `juegos` y la nota del juego.

- [ ] **Step 1: Insertar la fila en la BD local**

Con tinker, de forma idempotente (`updateOrCreate` por `slug`):

```
slug            picnic-animalitos-glotones
ambiente_id     7      eje_id 17      tematica_id 34      modulo_id 9
ruta            catalogo_juegos/Polimotor/PicnicAnimalitosGlotones
nombre          Picnic con los Animalitos Glotones
descripcion     Arrastrar cada comida de la cesta hasta la boca del animalito que la come:
                el conejito herbívoro, el perrito carnívoro, el pajarito granívoro y el osito
                omnívoro. Tres rondas con dos, tres y cuatro animalitos (3-4 años).
imagen          picnic-animalitos.png
color           #51cf66
orden           35      activo 1
```

- [ ] **Step 2: Añadir la misma fila a `database/ambientes.sql`**

En orden alfabético por slug, entre `observa-y-recuerda` y `pista-de-...` según corresponda. **Sin** archivo SQL incremental aparte.

- [ ] **Step 3: Verificar que el catálogo lo muestra en las edades correctas**

```powershell
php artisan tinker --execute="$s=app(App\Services\JuegoCatalogoService::class); foreach([3,4,5] as $e){ $n=collect($s->listarActivosPorAmbiente(7,$e))->pluck('slug')->contains('picnic-animalitos-glotones'); echo $e.': '.($n?'si':'no').PHP_EOL; }"
```
Expected: `3: si`, `4: si`, `5: no`

- [ ] **Step 4: Escribir la nota del juego**

`docs/juegos/Polimotor/PicnicAnimalitosGlotones.md`, con la estructura de `HoraDeComerOsito.md`: pedido, escena, flujo, mecánica, voces, sonidos, tabla de archivos, cómo probar, registro en BD y pendientes.

- [ ] **Step 5: Commit**

```bash
git add database/ambientes.sql docs/juegos/Polimotor/PicnicAnimalitosGlotones.md
git commit -m "feat(polimotor): registrar y documentar el Picnic con los Animalitos Glotones"
```
