/**
 * Reglas de Une las Partes del Cuerpo.
 * Uso: node scripts/probar-une-partes-cuerpo.js
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "UnePartesCuerpo");
const R = require(path.join(dir, "reglas.js"));
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

let ok = 0;
function prueba(nombre, fn) {
    fn();
    ok++;
    console.log("  ok " + nombre);
}

console.log("Une las Partes del Cuerpo — reglas");

const CONTENEDORES = ["zeus", "cabeza", "brazoIzq", "brazoDer", "manoIzq", "manoDer", "pieIzq", "pieDer"];

prueba("diez tarjetas con nombre, dibujo, color, destino, posición, textos y audio", function () {
    const ids = config.tarjetas.map(function (t) { return t.id; });
    assert.deepEqual(ids.slice().sort(), ["boca", "brazo", "cabeza", "cuello", "mano", "nariz", "ojos", "orejas", "pie", "pierna"]);
    const iconos = fs.readFileSync(path.join(dir, "iconos.js"), "utf8");
    config.tarjetas.forEach(function (t) {
        assert.ok(t.nombre && t.zona, t.id);
        assert.match(t.color, /^#[0-9a-f]{6}$/i, t.id);
        assert.ok(iconos.indexOf("SVG." + t.icono + " =") >= 0, "falta el dibujo de " + t.id);
        assert.equal(t.punto, "p-" + t.id);
        assert.ok(CONTENEDORES.indexOf(t.destino.contenedor) >= 0, t.id);
        assert.equal(typeof t.destino.x, "number");
        assert.equal(typeof t.destino.y, "number");
        assert.ok(["izq", "der"].indexOf(t.tarjeta.lado) >= 0);
        assert.ok(t.textos.pista && t.textos.acierto, t.id);
        assert.ok("instruccion" in t.audio && "acierto" in t.audio, t.id);
    });
});

prueba("cinco tarjetas por lado, sin dos en la misma fila", function () {
    ["izq", "der"].forEach(function (lado) {
        const filas = config.tarjetas.filter(function (t) { return t.tarjeta.lado === lado; }).map(function (t) { return t.tarjeta.fila; });
        assert.deepEqual(filas.slice().sort(), [0, 1, 2, 3, 4]);
    });
});

prueba("colores distintos en todas las tarjetas", function () {
    const colores = config.tarjetas.map(function (t) { return t.color.toLowerCase(); });
    assert.equal(new Set(colores).size, colores.length);
    // ni verde ni rojo: esos colores son los de la calificación
    config.tarjetas.forEach(function (t) {
        const n = parseInt(t.color.slice(1), 16);
        const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
        assert.ok(!(g > r + 30 && g > b + 30), t.id + " es verde");
        assert.ok(!(r > 200 && g < 80 && b < 80), t.id + " es rojo");
    });
});

prueba("la conexión se valida por identidad, no por cercanía", function () {
    assert.equal(R.esCorrecta(config, "nariz", "p-nariz"), true);
    assert.equal(R.esCorrecta(config, "mano", "p-brazo"), false);
    assert.equal(R.esCorrecta(config, "mano", null), false);
    assert.equal(R.esCorrecta(config, "inexistente", "p-nariz"), false);
    // la tarjeta MANO soltada junto al brazo elige el punto del brazo, y eso es error
    const puntos = [{ id: "p-brazo", x: 100, y: 100 }, { id: "p-mano", x: 180, y: 160 }];
    const elegido = R.puntoCercano(puntos, 110, 104, 40);
    assert.equal(elegido.id, "p-brazo");
    assert.equal(R.evaluar(config, {}, "mano", elegido.id), "error");
});

prueba("punto más cercano dentro del radio; lejos de todo no elige nada", function () {
    const puntos = [{ id: "a", x: 0, y: 0 }, { id: "b", x: 30, y: 0 }];
    assert.equal(R.puntoCercano(puntos, 12, 0, 40).id, "a");
    assert.equal(R.puntoCercano(puntos, 18, 0, 40).id, "b");
    assert.equal(R.puntoCercano(puntos, 200, 200, 40), null);
    assert.equal(R.puntoCercano(puntos, 2, 0, 40, ["a"]).id, "b");
});

prueba("evaluar: correcta, error, nada, repetida y punto ocupado", function () {
    assert.equal(R.evaluar(config, {}, "boca", "p-boca"), "correcta");
    assert.equal(R.evaluar(config, {}, "boca", "p-nariz"), "error");
    assert.equal(R.evaluar(config, {}, "boca", null), "nada");
    assert.equal(R.evaluar(config, { boca: "p-boca" }, "boca", "p-boca"), "repetida");
    assert.equal(R.evaluar(config, { nariz: "p-nariz" }, "boca", "p-nariz"), "ocupado");
});

prueba("calificación al unir las diez: verde las correctas, rojo las incorrectas", function () {
    const todas = {};
    config.tarjetas.forEach(function (t) { todas[t.id] = t.punto; });
    const bien = R.calificar(config, todas);
    assert.equal(bien.todasBien, true);
    assert.equal(bien.bien, 10);
    // orden de revisión: columna izquierda de arriba a abajo y luego la derecha
    assert.deepEqual(bien.orden.map(function (x) { return x.id; }), ["ojos", "cabeza", "brazo", "orejas", "pierna", "boca", "nariz", "cuello", "mano", "pie"]);
    const cruzadas = Object.assign({}, todas, { mano: "p-pie", pie: "p-mano" });
    const r = R.calificar(config, cruzadas);
    assert.equal(r.todasBien, false);
    assert.equal(r.mal, 2);
    assert.deepEqual(r.orden.filter(function (x) { return !x.ok; }).map(function (x) { return x.id; }), ["mano", "pie"]);
    // segunda revisión: solo se califican las que no estaban ya en verde
    const yaBien = {};
    r.orden.filter(function (x) { return x.ok; }).forEach(function (x) { yaBien[x.id] = true; });
    const r2 = R.calificar(config, todas, yaBien);
    assert.deepEqual(r2.orden.map(function (x) { return x.id; }), ["mano", "pie"]);
    assert.equal(r2.todasBien, true);
});

prueba("progreso y revisión: solo se aprueba con las diez correctas", function () {
    const todas = {};
    config.tarjetas.forEach(function (t) { todas[t.id] = t.punto; });
    const p0 = R.progreso(config, {});
    assert.deepEqual([p0.hechas, p0.total, p0.faltan, p0.completo], [0, 10, 10, false]);
    const casi = Object.assign({}, todas);
    delete casi.pie;
    assert.deepEqual(R.revisarEnvio(config, casi), { ok: false, faltan: 1, malas: [] });
    assert.deepEqual(R.revisarEnvio(config, todas), { ok: true, faltan: 0, malas: [] });
    const cruzadas = Object.assign({}, todas, { mano: "p-brazo", brazo: "p-mano" });
    assert.equal(R.revisarEnvio(config, cruzadas).ok, false);
    assert.deepEqual(R.revisarEnvio(config, cruzadas).malas.sort(), ["brazo", "mano"]);
});

prueba("la pista rota entre las tarjetas pendientes", function () {
    const hechas = { cabeza: "p-cabeza" };
    const a = R.siguientePendiente(config, hechas, null);
    assert.notEqual(a, "cabeza");
    const b = R.siguientePendiente(config, hechas, a);
    assert.notEqual(b, a);
    const todas = {};
    config.tarjetas.forEach(function (t) { todas[t.id] = t.punto; });
    assert.equal(R.siguientePendiente(config, todas, null), null);
});

prueba("la demo conecta la NARIZ con una línea violeta", function () {
    assert.equal(config.demo.tarjeta, "nariz");
    assert.equal(R.tarjeta(config, "nariz").color.toLowerCase(), config.demo.color.toLowerCase());
});

prueba("textos: instrucción, revisión verde/rojo, cierre y título final", function () {
    const t = config.textos;
    assert.match(t.instruccion, /toca el punto y lleva la línea/);
    assert.match(t.revisando, /verde está bien y rojo hay que arreglarlo/);
    assert.match(R.plantilla(t.revisionMal, { bien: 7 }), /¡Tienes 7 en verde!/);
    assert.ok(t.revisionMalUna);
    assert.equal(t.enviar, undefined);
    assert.match(t.final, /^¡LO LOGRASTE!/);
    assert.equal(t.finalTitulo, "¡EXCELENTE TRABAJO!");
    assert.equal(t.finalSub, "¡Conectaste todas las partes del cuerpo!");
    assert.deepEqual(config.niveles.map(function (n) { return n.edad; }), ["5-6 años"]);
});

prueba("el volcado registra este juego una sola vez", function () {
    const dump = fs.readFileSync(path.join(__dirname, "..", "database", "ambientes.sql"), "utf8");
    assert.equal((dump.match(/une-las-partes-del-cuerpo/g) || []).length, 1);
    const fila = dump.split("\n").find(function (l) { return l.indexOf("'une-las-partes-del-cuerpo'") !== -1; });
    assert.match(fila, /catalogo_juegos\/Polimotor\/UnePartesCuerpo/);
    assert.match(fila, /,7,11,29,9,/);
    assert.match(fila, /une\.png/);
    assert.match(fila, /'#7950f2',14,1,/);
});

console.log(ok + " pruebas OK");
