/**
 * Prueba de "Picnic con los Animalitos Glotones": config válido, rondas de 2, 3 y 4 animales y textos literales del enunciado.
 *   node scripts/probar-picnic-animalitos.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "PicnicAnimalitosGlotones");
const R = require(path.join(dir, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

let ok = 0;
let total = 0;
function prueba(nombre, fn) {
    total++;
    try {
        fn();
        ok++;
    } catch (e) {
        console.error("✗ " + nombre + "\n   " + e.message);
    }
}

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
    assert.strictEqual(t.introZoe, "¡Hola! ¡Los animalitos tienen hambre! Toma la comida del plato con tu dedo, arrástrala hasta la boca de su dueño y suéltala para alimentarlo.");
    assert.strictEqual(t.zoeEligeBien, "¡Lleva cada comida a su animalito! ¡No la sueltes hasta llegar a su boca!");
    assert.strictEqual(t.finalZoe, "¡QUÉ GRAN ALIMENTADOR! Arrastraste la comida a cada animalito con una precisión genial.");
    assert.strictEqual(t.finalTitulo, "¡QUÉ GRAN ALIMENTADOR!");
});

prueba("un solo nivel de 3-4 años", function () {
    assert.strictEqual(cfg.niveles.length, 1);
    assert.strictEqual(cfg.niveles[0].edad, "3-4 años");
});

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

prueba("revisarJuego detecta los cinco defectos y acepta el config real", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
    const copia = function () { return JSON.parse(JSON.stringify(cfg)); };
    const defectos = {
        "más alimentos que animales": function (c) { c.rondas[0].alimentos.push("miel"); },
        "alimento cuyo dueño no está en la ronda": function (c) { c.rondas[0].alimentos = ["zanahoria", "miel"]; },
        "dos niveles": function (c) { c.niveles.push({ id: "5", edad: "5-6 años", titulo: "otro" }); },
        "ronda que pierde un animal de la anterior": function (c) { c.rondas[2].animales = ["oso", "pajaro", "perro"]; },
        "alimento con animal inexistente": function (c) { c.alimentos[0].animal = "dragon"; }
    };
    Object.keys(defectos).forEach(function (nombre) {
        const c = copia();
        defectos[nombre](c);
        assert.ok(R.revisarJuego(c).length > 0, "no detectó: " + nombre);
    });
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
});

prueba("piezasRonda es determinista y de verdad mezcla", function () {
    const ids = function (rnd) { return R.piezasRonda(cfg, 2, rnd).map(function (p) { return p.id; }); };
    const fijo = function () { return 0.5; };
    assert.deepStrictEqual(ids(fijo), ids(fijo));
    const alto = R.piezasRonda(cfg, 2, function () { return 0.99; });
    const bajo = R.piezasRonda(cfg, 2, function () { return 0.01; });
    assert.notDeepStrictEqual(alto.map(function (p) { return p.id; }), bajo.map(function (p) { return p.id; }));
    [alto, bajo].forEach(function (piezas) {
        assert.deepStrictEqual(piezas.map(function (p) { return p.tipo; }).sort(),
            cfg.rondas[2].alimentos.slice().sort());
    });
});

prueba("evaluarEntrega sin bocas da lejos sin lanzar", function () {
    const res = R.evaluarEntrega({ alimento: { x: 10, y: 10 }, bocas: [],
        tipo: "zanahoria", animalEsperado: "conejo", radio: 92, entregada: false });
    assert.strictEqual(res.motivo, "lejos");
    assert.strictEqual(res.acierto, false);
});

prueba("un alimento entregado y lejos de toda boca sigue siendo repetida", function () {
    const res = R.evaluarEntrega({ alimento: { x: 1200, y: 200 }, bocas: [{ id: "conejo", x: 400, y: 500 }],
        tipo: "zanahoria", animalEsperado: "conejo", radio: 92, entregada: true });
    assert.strictEqual(res.motivo, "repetida");
    assert.strictEqual(res.acierto, false);
});

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

prueba("los globales del juego no chocan con los del juego del oso", function () {
    ["script.js", "escena-picnic.js", "demo.js", "sonidos.js", "animales.js"].forEach(function (f) {
        const src = fs.readFileSync(path.join(dir, f), "utf8");
        assert.ok(!/(Escenario|Sonidos|Dibujos|Reglas)Comer|ComerDemo|OsoComer/.test(src), f + " usa un global del juego del oso");
    });
    const son = fs.readFileSync(path.join(dir, "sonidos.js"), "utf8");
    ["ladrido", "gruñido", "ñam", "niega", "volumenFondo", "volumenEfectos"].forEach(function (k) {
        assert.ok(son.indexOf(k) >= 0, "sonidos.js sin " + k);
    });
});

prueba("los textos que usa el flujo existen en el config", function () {
    const src = fs.readFileSync(path.join(dir, "script.js"), "utf8");
    const usados = {};
    src.replace(/textos\(\)\.(\w+)/g, function (_, k) { usados[k] = true; });
    Object.keys(usados).forEach(function (k) { assert.ok(cfg.textos[k] != null, "falta textos." + k); });
});

console.log((ok === total ? "✓ " : "✗ ") + ok + "/" + total + " pruebas");
process.exit(ok === total ? 0 : 1);
