/**
 * Prueba de "¡La Hora de Comer!": reglas puras, config válido, dificultad creciente y textos literales del enunciado.
 *   node scripts/probar-hora-de-comer.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "HoraDeComerOsito");
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

prueba("tres rondas de cuatro frutas (12 en total)", function () {
    assert.strictEqual(R.totalRondas(cfg), 3);
    cfg.rondas.forEach(function (r) { assert.strictEqual(r.frutas.length, 4); });
    assert.strictEqual(R.totalFrutas(cfg), 12);
    assert.strictEqual(R.plantilla(cfg.textos.finalResultado, { n: R.totalFrutas(cfg) }), "¡12 FRUTAS ENTREGADAS!");
});

prueba("la dificultad aumenta: más rápido, más recorrido, boca abierta menos tiempo", function () {
    const [a, b, c] = cfg.rondas;
    assert.ok(a.velocidad < b.velocidad && b.velocidad < c.velocidad);
    assert.ok(a.rango < b.rango && b.rango < c.rango);
    assert.ok(a.abiertaMs > b.abiertaMs && b.abiertaMs > c.abiertaMs);
    assert.ok(a.frenaAlAbrir >= b.frenaAlAbrir && b.frenaAlAbrir >= c.frenaAlAbrir);
});

prueba("textos literales del enunciado", function () {
    const t = cfg.textos;
    assert.strictEqual(t.introZoe, "¡Hola! ¡Nuestro osito tiene mucha hambre! Ayúdalo a comer sus frutas favoritas. Observa cuándo abre su boquita y lleva la fruta hasta ella.");
    assert.strictEqual(t.demoZeus, "¡Mira! Espera a que abra la boca, toma una fruta y llévala hasta él.");
    assert.strictEqual(t.zoeMira, "¡Mira cómo se mueve el osito!");
    assert.strictEqual(t.zoeEspera, "¡Espera a que abra su boquita!");
    assert.strictEqual(t.zoeBien, "¡Muy bien! ¡Ya tiene su fruta!");
    assert.strictEqual(t.zeusDespacito, "¡Acércala despacito!");
    assert.strictEqual(t.zeusFeliz, "¡Eso es! ¡El osito está feliz!");
    assert.strictEqual(t.zoeOtraVez, "¡Inténtalo otra vez!");
    assert.strictEqual(t.rondaLista, "¡Muy bien! ¡El osito está muy contento!");
    assert.strictEqual(t.final, "¡ESPECTACULAR COORDINACIÓN VISUAL! Alimentaste al osito y completaste todos los desafíos. ¡Aprendiste a observar, esperar y coordinar tus movimientos para ayudar a nuestro amigo!");
    assert.strictEqual(t.finalZoe + " " + t.finalZeus, t.final);
});

prueba("edad 3-4 años, un solo nivel", function () {
    assert.strictEqual(cfg.niveles.length, 1);
    assert.strictEqual(cfg.niveles[0].id, "3");
    assert.strictEqual(cfg.niveles[0].edad, "3-4 años");
});

prueba("ciclo de la boca: cerrada → abriendo → abierta → cerrando", function () {
    const p = { cerradaMs: 1000, abreMs: 200, abiertaMs: 2000, cierraMs: 200 };
    assert.strictEqual(R.cicloBoca(500, p).estado, "cerrada");
    assert.strictEqual(R.cicloBoca(500, p).apertura, 0);
    assert.strictEqual(R.cicloBoca(1100, p).estado, "abriendo");
    assert.strictEqual(R.cicloBoca(2000, p).estado, "abierta");
    assert.strictEqual(R.cicloBoca(2000, p).apertura, 1);
    assert.strictEqual(R.cicloBoca(3300, p).estado, "cerrando");
    assert.strictEqual(R.cicloBoca(3400 + 500, p).estado, "cerrada");
    assert.ok(R.bocaLista(R.cicloBoca(2000, p).apertura, 0.6));
    assert.ok(!R.bocaLista(R.cicloBoca(500, p).apertura, 0.6));
});

prueba("entrega: acierta solo en la boca abierta", function () {
    const boca = { x: 800, y: 380 };
    assert.ok(R.evaluarEntrega({ fruta: { x: 820, y: 400 }, boca: boca, apertura: 1, radio: 92, umbral: 0.6 }).acierto);
    const cerrada = R.evaluarEntrega({ fruta: { x: 820, y: 400 }, boca: boca, apertura: 0, radio: 92, umbral: 0.6 });
    assert.ok(!cerrada.acierto);
    assert.strictEqual(cerrada.motivo, "cerrada");
    assert.strictEqual(R.evaluarEntrega({ fruta: { x: 960, y: 420 }, boca: boca, apertura: 1, radio: 92 }).motivo, "cerca");
    assert.strictEqual(R.evaluarEntrega({ fruta: { x: 800, y: 800 }, boca: boca, apertura: 1, radio: 92 }).motivo, "lejos");
});

prueba("una fruta no se entrega dos veces", function () {
    const r = R.evaluarEntrega({ fruta: { x: 800, y: 380 }, boca: { x: 800, y: 380 }, apertura: 1, radio: 92, entregada: true });
    assert.ok(!r.acierto);
    assert.strictEqual(r.motivo, "repetida");
});

prueba("objetos del picnic que no se comen: cuchara, tenedor, cuchillo, salero y taza", function () {
    assert.deepStrictEqual(cfg.objetos.map(function (o) { return o.id; }), ["cuchara", "tenedor", "cuchillo", "salero", "taza"]);
    // cada ronda tiene sus 4 frutas más 1-2 objetos, mezclados; nunca más de 6 piezas
    cfg.rondas.forEach(function (r, i) {
        const piezas = R.piezasRonda(cfg, i, function () { return 0.3; });
        assert.strictEqual(piezas.filter(function (p) { return p.fruta; }).length, 4);
        assert.strictEqual(piezas.filter(function (p) { return !p.fruta; }).length, r.objetos.length);
        assert.ok(piezas.length <= 6);
        piezas.forEach(function (p) { assert.strictEqual(R.esFrutaId(p.id), p.fruta, p.id); });
    });
    assert.ok(cfg.rondas[0].objetos.length >= 1 && cfg.rondas[2].objetos.length >= cfg.rondas[0].objetos.length);
    // el osito no acepta un objeto aunque tenga la boca abierta; la fruta sí
    const boca = { x: 800, y: 380 };
    const obj = R.evaluarEntrega({ fruta: { x: 810, y: 390 }, boca: boca, apertura: 1, radio: 92, esFruta: false });
    assert.ok(!obj.acierto);
    assert.strictEqual(obj.motivo, "noComida");
    assert.ok(R.evaluarEntrega({ fruta: { x: 810, y: 390 }, boca: boca, apertura: 1, radio: 92, esFruta: true }).acierto);
    assert.strictEqual(cfg.textos.noSeCome, "¡Eso no se come! Dale una fruta al osito.");
});

prueba("la zona de la boca crece con los fallos seguidos (con tope)", function () {
    assert.strictEqual(R.radioEntrega(cfg, 0), cfg.juego.radioBoca);
    assert.ok(R.radioEntrega(cfg, 2) > R.radioEntrega(cfg, 1));
    assert.strictEqual(R.radioEntrega(cfg, 99), cfg.juego.radioBocaMax);
});

prueba("vaivén lateral dentro del rango; frena con la boca abierta si la ronda lo pide", function () {
    for (let f = 0; f < 7; f += 0.3) {
        const x = R.posicionLateral(f, 800, 290);
        assert.ok(x >= 510 - 1e-9 && x <= 1090 + 1e-9);
    }
    const r1 = cfg.rondas[0];
    assert.strictEqual(R.velocidadVaiven(r1, "abierta", 1), 0);
    assert.ok(R.velocidadVaiven(r1, "cerrada", 1) > 0);
    assert.ok(R.velocidadVaiven(cfg.rondas[2], "abierta", 1) > 0);
});

prueba("ids únicos por ronda y tipo recuperable", function () {
    const id = R.idFruta(1, 2, "uvas");
    assert.strictEqual(id, "r2-2-uvas");
    assert.strictEqual(R.tipoDe(id), "uvas");
});

prueba("interfaz: controles en su lugar, sin título en la pantalla de juego ni botón de edad", function () {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    ["btn-menu-acc", "btn-menu-vol", "btn-silencio", "contador", "indicador-ronda", "btn-comenzar", "btn-otra-vez", "btn-al-menu"].forEach(function (id) {
        assert.ok(html.indexOf('id="' + id + '"') >= 0, "falta " + id);
    });
    assert.ok(html.indexOf('id="intro-titulo"') < 0, "el título no debe estar en la pantalla de juego");
    // los mismos botones e íconos de los demás juegos (imágenes de comun/interfaz.css)
    assert.ok(/comun\/interfaz\.css/.test(html), "faltan los botones comunes");
    assert.ok(/onclick="location\.reload\(\)" class="btn btn-warning btn-round"[^>]*><i class="fa-solid fa-rotate"><\/i>/.test(html), "reiniciar distinto a los demás juegos");
    assert.ok(/onclick="history\.back\(\)" class="btn btn-danger btn-round"[^>]*><i class="fa-solid fa-arrow-left"><\/i>/.test(html), "volver distinto a los demás juegos");
    assert.ok(/id="btn-menu-acc" class="menu-acc-fab"/.test(html) && /fa-universal-access/.test(html), "accesibilidad distinta");
    assert.ok(/id="btn-menu-vol" class="menu-acc-fab"/.test(html) && /fa-volume-high/.test(html), "volumen distinto");
    assert.ok(!/3-4 años|5-6 años/.test(html), "no debe haber botón de edad");
    assert.ok(fs.existsSync(path.join(dir, "hora-de-comer.png")), "falta el ícono");
});

console.log((ok === total ? "✓ " : "✗ ") + ok + "/" + total + " pruebas");
process.exit(ok === total ? 0 : 1);
