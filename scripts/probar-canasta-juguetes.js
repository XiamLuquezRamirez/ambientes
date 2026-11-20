/**
 * Prueba de "La canasta de juguetes": reglas puras, config y las tres cuentas (3, 5 y 8).
 *   node scripts/probar-canasta-juguetes.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "CanastaJuguetesZoeZeus");
const R = require(path.join(dir, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

let ok = 0;
let total = 0;
function prueba(nombre, fn) {
    total++;
    try {
        fn();
        ok++;
        console.log("✓ " + nombre);
    } catch (e) {
        console.error("✗ " + nombre + "\n   " + e.message);
    }
}

prueba("config válido y frases del enunciado", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
});

prueba("tres niveles: 3, 5 y 8 objetos, sin repetir id", function () {
    assert.strictEqual(R.niveles(cfg).length, 3);
    assert.deepStrictEqual(R.niveles(cfg).map(function (n) { return n.objetos.length; }), [3, 5, 8]);
    R.niveles(cfg).forEach(function (n) {
        const ids = n.objetos.map(function (o) { return o.id; });
        assert.strictEqual(new Set(ids).size, ids.length);
    });
});

prueba("acierto dentro de la caja y atracción un poco fuera", function () {
    const zonas = [
        { id: "bien", distancia: 40 },
        { id: "mal", distancia: 180 }
    ];
    const dentro = R.evaluar({ zonaObjetivo: "bien", zonas: zonas, radio: 80, atraer: 130, guardado: false });
    assert.strictEqual(dentro.acierto, true);
    assert.strictEqual(dentro.atraido, false);
    const cerca = R.evaluar({
        zonaObjetivo: "bien",
        zonas: [{ id: "bien", distancia: 100 }, { id: "mal", distancia: 190 }],
        radio: 80,
        atraer: 130,
        guardado: false
    });
    assert.strictEqual(cerca.acierto, true);
    assert.strictEqual(cerca.atraido, true);
});

prueba("caja equivocada no cuenta y no bloquea; lejos no es error de caja", function () {
    const mal = R.evaluar({
        zonaObjetivo: "bien",
        zonas: [{ id: "bien", distancia: 200 }, { id: "mal", distancia: 30 }],
        radio: 80,
        atraer: 130,
        guardado: false
    });
    assert.strictEqual(mal.acierto, false);
    assert.strictEqual(mal.motivo, "incorrecta");
    const lejos = R.evaluar({
        zonaObjetivo: "bien",
        zonas: [{ id: "bien", distancia: 400 }, { id: "mal", distancia: 380 }],
        radio: 80,
        atraer: 130,
        guardado: false
    });
    assert.strictEqual(lejos.motivo, "lejos");
    const ya = R.evaluar({ guardado: true, zonaObjetivo: "bien", zonas: [], radio: 80, atraer: 130 });
    assert.strictEqual(ya.motivo, "ya");
    assert.strictEqual(ya.acierto, false);
});

prueba("el dedo dentro de la caja correcta también vale", function () {
    const res = R.evaluar({
        zonaObjetivo: "bien",
        zonas: [{ id: "bien", distancia: 160 }, { id: "mal", distancia: 200 }],
        radio: 80,
        atraer: 130,
        punteroEnObjetivo: true,
        guardado: false
    });
    assert.strictEqual(res.acierto, true);
});

prueba("si el juguete está dentro de la caja mala, el dedo no lo salva", function () {
    const res = R.evaluar({
        zonaObjetivo: "bien",
        zonas: [{ id: "bien", distancia: 90 }, { id: "mal", distancia: 20 }],
        radio: 80,
        atraer: 140,
        punteroEnObjetivo: true,
        guardado: false
    });
    assert.strictEqual(res.acierto, false);
    assert.strictEqual(res.motivo, "incorrecta");
});

prueba("los radios no se comen la caja vecina", function () {
    const rad = R.radiosDe([
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 400, y: 0 }
    ], cfg.juego);
    assert.ok(rad.radio < rad.atraer);
    assert.ok(rad.atraer < rad.separacion * 0.7);
});

console.log(ok + "/" + total);
process.exit(ok === total ? 0 : 1);
