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

console.log((ok === total ? "✓ " : "✗ ") + ok + "/" + total + " pruebas");
process.exit(ok === total ? 0 : 1);
