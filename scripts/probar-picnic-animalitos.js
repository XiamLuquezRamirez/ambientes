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
    assert.strictEqual(t.introZoe, "¡Hola! ¡Los animalitos tienen hambre! Toma la comida de la cesta con tu dedo, arrástrala hasta la boca de su dueño y suéltala para alimentarlo.");
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

console.log((ok === total ? "✓ " : "✗ ") + ok + "/" + total + " pruebas");
process.exit(ok === total ? 0 : 1);
