/**
 * Reglas de Golpea a los Topos.
 * Uso: node scripts/probar-golpea-a-los-topos.js
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "GolpeaTopos");
const R = require(path.join(dir, "reglas.js"));
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const iconosJs = fs.readFileSync(path.join(dir, "iconos.js"), "utf8");
const iconos = [...iconosJs.matchAll(/SVG\.(\w+) = /g)].map(function (m) { return m[1]; });

let ok = 0;
function prueba(nombre, fn) {
    fn();
    ok++;
    console.log("  ok " + nombre);
}

console.log("Golpea a los Topos — reglas");

prueba("config.json sin problemas (categorías, dibujos, agujeros, etapas)", function () {
    assert.deepEqual(R.revisarConfig(config, iconos), []);
});

prueba("las 12 partes del cuerpo pedidas y los distractores están en los datos", function () {
    const partes = ["nariz", "ojos", "boca", "orejas", "mano", "pie", "brazo", "pierna", "cabeza", "corazon", "cerebro", "pulmones"];
    partes.forEach(function (id) { assert.equal(R.categoria(config, id), "parte_cuerpo", id); });
    ["cepillo", "peine", "pelota", "manzana", "banano", "osito", "carro", "cuchara", "taza"].forEach(function (id) {
        assert.equal(R.categoria(config, id), "distractor", id);
    });
});

prueba("la clasificación sale de los datos, no del nombre del dibujo", function () {
    const cfg = JSON.parse(JSON.stringify(config));
    cfg.imagenes.push({ id: "x1", nombre: "algo", icono: "nariz", categoria: "distractor" });
    cfg.imagenes.push({ id: "x2", nombre: "otra", icono: "pelota", categoria: "parte_cuerpo" });
    assert.equal(R.evaluarGolpe(cfg, "x1"), "error");
    assert.equal(R.evaluarGolpe(cfg, "x2"), "acierto");
    assert.equal(R.evaluarGolpe(cfg, "nariz"), "acierto");
    assert.equal(R.evaluarGolpe(cfg, "cepillo"), "error");
    assert.equal(R.evaluarGolpe(cfg, "no-existe"), "nada");
});

prueba("la dificultad sube poco a poco y nunca de golpe", function () {
    let antes = R.etapa(config, 0);
    assert.equal(antes.simultaneos, 1);
    assert.ok(antes.visibleMs >= 4000, "al empezar hay tiempo para mirar");
    assert.ok(antes.partes.length <= 6, "al empezar pocas opciones");
    for (let n = 1; n <= R.objetivo(config); n++) {
        const e = R.etapa(config, n);
        assert.ok(e.visibleMs <= antes.visibleMs, "visibleMs no sube");
        assert.ok(antes.visibleMs - e.visibleMs <= 450, "sin saltos bruscos en visibleMs (" + n + ")");
        assert.ok(e.intervaloMs >= 900, "no salen topos demasiado seguido");
        assert.ok(e.simultaneos <= 3, "máximo tres topos a la vez");
        assert.ok(e.simultaneos - antes.simultaneos <= 1);
        assert.ok(e.visibleMs >= 3000, "un niño de 5-6 años alcanza a ver (" + n + ")");
        antes = e;
    }
    assert.equal(R.etapa(config, 99).partes.length, 12);
});

prueba("nunca más de dos objetos seguidos y nunca solo objetos en pantalla", function () {
    const azar = R.crearAzar(42);
    let seguidos = 0;
    let ultima = null;
    for (let i = 0; i < 600; i++) {
        const aciertos = i % 13;
        const id = R.elegirImagen(config, { aciertos: aciertos, distractoresSeguidos: seguidos, ultima: ultima, enPantalla: [] }, azar);
        assert.ok(id, "siempre hay imagen");
        assert.notEqual(id, ultima, "no repite la última");
        seguidos = R.esParteCuerpo(config, id) ? 0 : seguidos + 1;
        assert.ok(seguidos <= 2, "más de dos distractores seguidos");
        ultima = id;
    }
    const id = R.elegirImagen(config, { aciertos: 5, distractoresSeguidos: 0, enPantalla: ["pelota"] }, R.crearAzar(1));
    assert.ok(R.esParteCuerpo(config, id), "con solo objetos en pantalla sale una parte del cuerpo");
});

prueba("no repite una imagen que ya está en pantalla", function () {
    const azar = R.crearAzar(9);
    for (let i = 0; i < 200; i++) {
        const id = R.elegirImagen(config, { aciertos: 0, enPantalla: ["nariz", "ojos"] }, azar);
        assert.ok(["nariz", "ojos"].indexOf(id) < 0);
    }
});

prueba("los agujeros: solo libres, y no repite el último si hay otro", function () {
    const azar = R.crearAzar(3);
    const todos = config.agujeros.map(function (a) { return a.id; });
    for (let i = 0; i < 200; i++) {
        const ocupados = todos.slice(0, i % 4);
        const h = R.elegirAgujero(config, ocupados, "b4", azar);
        assert.ok(h && ocupados.indexOf(h) < 0 && h !== "b4");
    }
    assert.equal(R.elegirAgujero(config, todos, null, azar), null);
    assert.equal(R.elegirAgujero(config, todos.filter(function (h) { return h !== "a2"; }), "a2", azar), "a2");
});

prueba("progreso, tiempo y textos", function () {
    assert.deepEqual(R.progreso(config, 0), { hechas: 0, total: 12, fraccion: 0, completo: false });
    assert.equal(R.progreso(config, 12).completo, true);
    assert.equal(R.progreso(config, 30).hechas, 12);
    assert.equal(R.formatoTiempo(100), "1:40");
    assert.equal(R.formatoTiempo(9.2), "0:10");
    assert.equal(R.formatoTiempo(-3), "0:00");
    assert.equal(R.plantilla("¡Es {nombre}!", { nombre: "la nariz" }), "¡Es la nariz!");
    assert.equal(R.plantilla("¡{Nombre}!", { nombre: "la nariz" }), "¡La nariz!");
    assert.equal(R.plantilla("Encontraste {n} partes", { n: 7 }), "Encontraste 7 partes");
});

prueba("demo y presentación usan agujeros e imágenes reales (nariz, cepillo, mano)", function () {
    const pasos = config.demo.pasos;
    assert.deepEqual(pasos.map(function (p) { return p.imagen; }), ["nariz", "cepillo", "mano"]);
    assert.deepEqual(pasos.map(function (p) { return R.evaluarGolpe(config, p.imagen); }), ["acierto", "error", "acierto"]);
    const hoyos = config.agujeros.map(function (a) { return a.id; });
    pasos.forEach(function (p) { assert.ok(hoyos.indexOf(p.agujero) >= 0); });
    config.presentacion.agujeros.forEach(function (h) { assert.ok(hoyos.indexOf(h) >= 0); });
    assert.ok(R.esParteCuerpo(config, config.presentacion.destacarParte));
    assert.equal(R.categoria(config, config.presentacion.destacarDistractor), "distractor");
});

prueba("los globos de una fila no tapan los agujeros de la fila de atrás", function () {
    // Medidas de escenario-phaser.js en fracciones de la zona útil: topo entero 0.2, globo ≤ 0.2.
    const filas = [...new Set(config.agujeros.map(function (a) { return a.y; }))].sort();
    for (let i = 1; i < filas.length; i++) {
        const techoGlobo = filas[i] - 0.2 - 0.2 - 0.005;
        const bordeAtras = filas[i - 1] + 0.02;
        assert.ok(techoGlobo > filas[i - 1], "el globo de la fila " + i + " sube hasta el agujero de atrás");
        assert.ok(bordeAtras < filas[i] - 0.2 - 0.2, "fila " + i);
    }
    assert.ok(filas[0] - 0.2 - 0.2 > 0.04, "el globo de atrás cabe debajo del borde de arriba");
});

console.log(ok + " pruebas bien");
