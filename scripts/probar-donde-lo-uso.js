/**
 * Reglas de "¿Dónde lo uso?" (dos rondas de cinco parejas).
 * Uso: node scripts/probar-donde-lo-uso.js
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "DondeLoUso");
const R = require(path.join(dir, "reglas.js"));
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const iconosJs = fs.readFileSync(path.join(dir, "iconos.js"), "utf8");
const iconos = [...iconosJs.matchAll(/SVG\.(\w+) = /g)].map(function (m) { return m[1]; });
const r1 = R.ronda(config, 0);
const r2 = R.ronda(config, 1);

let ok = 0;
function prueba(nombre, fn) {
    fn();
    ok++;
    console.log("  ok " + nombre);
}

function filasDe(r) {
    const o = {};
    R.partes(r).forEach(function (p) { o[p.id] = p.fila; });
    return o;
}

console.log("¿Dónde lo uso? — reglas");

prueba("config.json sin problemas (dos rondas, ids únicos entre rondas, dibujos, filas, parejas uno a uno)", function () {
    assert.equal(R.rondas(config).length, 2);
    assert.deepEqual(R.revisarJuego(config, iconos), []);
});

prueba("ronda 1: los cinco objetos y partes pedidos", function () {
    assert.deepEqual(r1.parejas, { gafas: "ojos", nariz_payaso: "nariz", calcetines: "pies", guantes: "manos", gorro: "cabeza" });
});

prueba("ronda 2: cinco objetos nuevos", function () {
    assert.deepEqual(r2.parejas, { bufanda: "cuello", audifonos: "orejas", cepillo_dientes: "boca", reloj: "muneca", mochila: "espalda" });
    assert.equal(R.objetos(r2).length, 5);
    assert.equal(R.partes(r2).length, 5);
});

prueba("cada ronda trae su instrucción y un objeto que existe para destacar", function () {
    [r1, r2].forEach(function (r) {
        assert.ok(r.instruccion);
        assert.equal(R.columna(r, r.destacar), "obj");
    });
});

prueba("la validación usa identificadores, no el texto visible", function () {
    const cfg = JSON.parse(JSON.stringify(r1));
    cfg.objetos[0].nombre = "Ojos"; // un nombre engañoso no cambia nada
    assert.equal(R.esCorrecta(cfg, "gafas", "ojos"), true);
    assert.equal(R.esCorrecta(cfg, "gafas", "nariz"), false);
    assert.equal(R.esCorrecta(r2, "reloj", "muneca"), true);
    assert.equal(R.esCorrecta(r2, "reloj", "cuello"), false);
});

prueba("una ronda no acepta tarjetas de la otra", function () {
    assert.equal(R.evaluar(r2, {}, "gafas", "ojos"), "mismoLado");
    assert.equal(R.esCorrecta(r1, "bufanda", "cuello"), false);
});

prueba("la línea vale en los dos sentidos (objeto → parte y parte → objeto)", function () {
    assert.equal(R.evaluar(r1, {}, "calcetines", "pies"), "correcta");
    assert.equal(R.evaluar(r1, {}, "pies", "calcetines"), "correcta");
    assert.equal(R.evaluar(r1, {}, "calcetines", "cabeza"), "error");
    assert.deepEqual(R.normalizar(r1, "pies", "calcetines"), { objeto: "calcetines", parte: "pies" });
});

prueba("soltar lejos, en la misma columna, o con parejas ya hechas", function () {
    const hechas = { gafas: "ojos" };
    assert.equal(R.evaluar(r1, {}, "gafas", null), "nada");
    assert.equal(R.evaluar(r1, {}, "gafas", "gorro"), "mismoLado");
    assert.equal(R.evaluar(r1, {}, "ojos", "pies"), "mismoLado");
    assert.equal(R.evaluar(r1, hechas, "gafas", "nariz"), "repetida");
    assert.equal(R.evaluar(r1, hechas, "ojos", "gorro"), "repetida");
    assert.equal(R.evaluar(r1, hechas, "nariz_payaso", "ojos"), "ocupado");
});

prueba("progreso y fin de ronda con las cinco parejas", function () {
    [r1, r2].forEach(function (r) {
        const c = {};
        assert.deepEqual(R.progreso(r, c), { hechas: 0, total: 5, faltan: 5, completo: false });
        Object.keys(r.parejas).forEach(function (o) { c[o] = r.parejas[o]; });
        assert.equal(R.progreso(r, c).completo, true);
    });
});

prueba("la pista recorre los objetos pendientes sin repetir", function () {
    const c = { gafas: "ojos" };
    assert.equal(R.siguientePendiente(r1, c, null), "nariz_payaso");
    assert.equal(R.siguientePendiente(r1, c, "gorro"), "nariz_payaso");
    assert.equal(R.siguientePendiente(r1, c, "nariz_payaso"), "calcetines");
});

prueba("las dos rondas arrancan desordenadas: ninguna parte en la fila de su objeto", function () {
    assert.equal(R.hayRectas(r1, filasDe(r1)), false);
    assert.equal(R.hayRectas(r2, filasDe(r2)), false);
});

prueba("al empezar cada ronda se desordena otra vez, sin líneas rectas y cambiando al menos 3 tarjetas", function () {
    [r1, r2].forEach(function (r) {
        const actual = filasDe(r);
        let semilla = 11;
        const azar = function () { semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; };
        for (let i = 0; i < 500; i++) {
            const o = R.ordenPartes(r, actual, azar);
            assert.deepEqual(Object.values(o).sort(), [0, 1, 2, 3, 4]);
            assert.equal(R.hayRectas(r, o), false, JSON.stringify(o));
            const cambios = Object.keys(o).filter(function (id) { return o[id] !== actual[id]; }).length;
            assert.ok(cambios >= 3, JSON.stringify(o));
        }
        // respaldo si el azar nunca sirve
        assert.equal(R.hayRectas(r, R.ordenPartes(r, actual, function () { return 0.999; })), false);
    });
});

prueba("la demo usa dos parejas reales de la ronda 1 (calcetines y nariz de payaso)", function () {
    const pasos = config.demo.pasos.map(function (p) { return p.objeto; });
    assert.deepEqual(pasos, ["calcetines", "nariz_payaso"]);
    pasos.forEach(function (o) { assert.ok(R.parejaDe(r1, o)); });
});

prueba("textos de voz pedidos y sin botón Continuar", function () {
    const t = config.textos;
    assert.equal(t.acierto, "¡Muy bien! ¡Encontraste su lugar!");
    assert.ok(t.errorZeus.indexOf("¡Uy! Ese no es su lugar. ¡Inténtalo otra vez!") >= 0);
    assert.ok(t.errorZeus.indexOf("¡Inténtalo otra vez! Busca dónde se utiliza ese objeto.") >= 0);
    assert.equal(t.instruccionZeus, "¡Traza una línea brillante para juntar cada objeto con su lugar correcto!");
    assert.equal(t.finalTitulo, "¡LO LOGRASTE!");
    assert.equal(t.botonContinuar, undefined);
    assert.equal(t.botonComenzar, "¡Comenzar a jugar!");
});

console.log("\n" + ok + " pruebas bien");
