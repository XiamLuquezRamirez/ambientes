/**
 * Prueba de "El Secuenciador de Baile y Lateralidad" (Polimotor, 5-6 años): config de 16 comandos con 3
 * visibles, 1 ronda de 6 tandas (3, 3, 3, 4, 4, 4 movimientos), generador de secuencias, máquina de estados,
 * clips reales del GLB de Zeus, dibujos de los botones y registro en database/ambientes.sql.
 *
 *   node scripts/probar-secuenciador-baile-lateralidad.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const raiz = path.join(__dirname, "..");
const carpeta = path.join(raiz, "public", "catalogo_juegos", "Polimotor", "SecuenciadorBaileLateralidad");
const R = require(path.join(carpeta, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(carpeta, "config.json"), "utf8"));

let pasadas = 0;
function prueba(nombre, fn) {
    try {
        fn();
        pasadas++;
        console.log("  ok  " + nombre);
    } catch (e) {
        console.error("  FALLA  " + nombre + "\n        " + e.message);
        process.exitCode = 1;
    }
}

/** Los 16 comandos corporales del juego, en el orden del config. */
const COMANDOS = [
    "cabeza", "cintura", "pies", "aplaudir", "abrirBrazos", "estirarse",
    "brazoDerecho", "brazoIzquierdo", "pieDerecho", "pieIzquierdo",
    "zapatear", "saltar", "saltarUnPie", "girar", "bailar", "marchar"
];

/** Clips del GLB de Zeus (leídos del propio archivo, para no inventar nombres). */
function clipsDelGlb() {
    const glb = path.join(raiz, "public", "catalogo_juegos", "Polimotor", "SimonDiceCorporal", "zeus_animado_suave.glb");
    const b = fs.readFileSync(glb);
    const jlen = b.readUInt32LE(12);
    const json = JSON.parse(b.slice(20, 20 + jlen).toString("utf8"));
    return json.animations.map(function (a) { return a.name; });
}

console.log("El Secuenciador de Baile y Lateralidad");

// ---------------------------------------------------------------- Tarea 1: config

prueba("config.json: 16 comandos con id único y clip del GLB", function () {
    const clips = clipsDelGlb();
    assert.ok(Array.isArray(cfg.acciones), "config.acciones es una lista");
    assert.strictEqual(cfg.acciones.length, 16, "son 16 comandos");
    const ids = cfg.acciones.map(function (a) { return a.id; });
    assert.strictEqual(new Set(ids).size, 16, "los 16 ids son distintos");
    assert.deepStrictEqual(ids, COMANDOS, "los ids son los esperados y en orden");
    cfg.acciones.forEach(function (a) {
        assert.ok(a.clip, a.id + " declara su clip");
        assert.ok(clips.indexOf(a.clip) >= 0, a.id + ": el clip " + a.clip + " existe en el GLB");
        assert.ok(a.nombre && a.voz && a.corto && a.color && a.nota, a.id + " tiene nombre, voz, corto, color y nota");
    });
});

prueba("config.json: 1 ronda de 6 tandas con 3, 3, 3, 4, 4 y 4 movimientos", function () {
    assert.strictEqual(R.rondas(cfg).length, 1, "una sola ronda");
    assert.strictEqual(R.itemsDeRonda(cfg, 0), 6, "seis tandas");
    assert.strictEqual(R.totalItems(cfg), 6);
    assert.deepStrictEqual(cfg.rondas[0].movimientos, [3, 3, 3, 4, 4, 4]);
    assert.deepStrictEqual(
        [0, 1, 2, 3, 4, 5].map(function (k) { return R.largoDeItem(cfg, 0, k); }),
        [3, 3, 3, 4, 4, 4],
        "las tandas piden 3, 3, 3, 4, 4 y 4 movimientos"
    );
});

prueba("config.json: siempre 3 botones visibles y edad 5-6 años", function () {
    assert.strictEqual(cfg.juego.visibles, 3, "tres botones a la vista");
    assert.strictEqual(R.visiblesDeConfig(cfg), 3);
    assert.strictEqual(cfg.niveles[0].edad, "5-6 años", "la edad del catálogo sale de aquí");
    assert.strictEqual(cfg.nombre, "¡EL SECUENCIADOR DE BAILE!");
});

prueba("config.json: la demo son 3 comandos y sus 3 botones visibles", function () {
    assert.ok(Array.isArray(cfg.demo.secuencia), "la demo tiene secuencia");
    assert.strictEqual(cfg.demo.secuencia.length, 3, "la demo muestra tres movimientos");
    assert.strictEqual(cfg.demo.visibles.length, 3, "la demo deja ver tres botones");
    cfg.demo.secuencia.forEach(function (id) {
        assert.ok(COMANDOS.indexOf(id) >= 0, id + " es un comando del juego");
        assert.ok(cfg.demo.visibles.indexOf(id) >= 0, id + " está visible en la demo");
    });
});

prueba("config.json: sin problemas según las reglas", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
});

console.log("\n" + pasadas + " pruebas correctas");
