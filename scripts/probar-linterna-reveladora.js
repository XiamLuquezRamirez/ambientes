/**
 * Reglas de La Linterna Reveladora de Partes.
 * Uso: node scripts/probar-linterna-reveladora.js
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "LinternaReveladoraPartes");
const Retos = require(path.join(dir, "retos.js"));
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

let ok = 0;
function prueba(nombre, fn) {
    fn();
    ok++;
    console.log("  ok " + nombre);
}

function semilla(s) {
    return function () {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
    };
}

console.log("Linterna reveladora — reglas");

function retoDe(parte) {
    return config.retos.find(function (r) { return r.parte === parte; });
}

prueba("tres rondas de tres partes, barriga primero, Zeus en todas", function () {
    assert.deepEqual(config.retos.map(function (r) { return r.parte; }), [
        "barriga", "manos", "pies", "rodillas", "hombros", "orejas", "ojos", "boca", "cabello"
    ]);
    config.retos.forEach(function (r) {
        assert.equal(r.personaje, "zeus");
        assert.equal(r.aciertoPersonaje, undefined);
        assert.equal(/\b(mi|mis|me)\b/i.test(r.texto + " " + r.acierto), false);
        assert.ok(r.texto && r.ayuda && r.acierto && r.confirma);
        assert.ok(r.visibilidad > 0.5 && r.visibilidad < 1);
        assert.ok(Array.isArray(r.zonas) && r.zonas.length);
        assert.ok(r.ronda >= 1 && r.ronda <= 3);
    });
});

prueba("rodillas, manos, ojos y cabello aceptan cualquiera de sus zonas", function () {
    const rod = retoDe("rodillas");
    const ore = retoDe("orejas");
    assert.equal(Retos.esCorrecta(rod, "rodilla_izq"), true);
    assert.equal(Retos.esCorrecta(rod, "rodilla_der"), true);
    assert.equal(Retos.esCorrecta(rod, "barriga"), false);
    assert.equal(Retos.esCorrecta(ore, "oreja_izq"), true);
    assert.equal(Retos.esCorrecta(ore, "oreja_der"), true);
    assert.equal(Retos.esCorrecta(retoDe("manos"), "mano_der"), true);
    assert.equal(Retos.esCorrecta(retoDe("ojos"), "ojo_izq"), true);
    assert.equal(Retos.esCorrecta(retoDe("cabello"), "coleta_der"), true);
    assert.equal(Retos.esCorrecta(retoDe("cabello"), "boca"), false);
});

prueba("un lado pedido no acepta el otro", function () {
    assert.equal(Retos.esCorrecta({ parte: "orejas", lado: "izq" }, "oreja_izq"), true);
    assert.equal(Retos.esCorrecta({ parte: "orejas", lado: "izq" }, "oreja_der"), false);
});

prueba("el centro dentro del haz cuenta; el de afuera no", function () {
    const luz = { x: 0, y: 0, r: 100 };
    assert.equal(Retos.centroCubierto(luz, { x: 0, y: 0 }, 0.82), true);
    assert.equal(Retos.centroCubierto(luz, { x: 80, y: 0 }, 0.82), true);
    assert.equal(Retos.centroCubierto(luz, { x: 90, y: 0 }, 0.82), false);
});

prueba("la barriga iluminada no cubre las rodillas con el tamaño real de Zoe", function () {
    // Distancias de personaje.js: barriga y=-477, rodilla (55, -188) → 289 unidades.
    // Escala típica 0.6 y radio de luz ~140 px: 289*0.6 = 173 > 140*0.82.
    const escala = 0.6;
    const luz = { x: 400, y: 500 + (-477 * escala), r: 140 };
    const rodilla = { x: 400 + 55 * escala, y: 500 + (-188 * escala) };
    assert.equal(Retos.centroCubierto(luz, { x: luz.x, y: luz.y }, 0.82), true);
    assert.equal(Retos.centroCubierto(luz, rodilla, 0.82), false);
});

prueba("tocar sin luz no es acierto; tocar otra parte iluminada es error", function () {
    const reto = config.retos[0];
    assert.equal(Retos.evaluar(reto, "barriga", false), "oscura");
    assert.equal(Retos.evaluar(reto, "barriga", true), "acierto");
    assert.equal(Retos.evaluar(reto, "rodilla_izq", true), "error");
    assert.equal(Retos.evaluar(reto, "rodilla_izq", false), "nada");
    assert.equal(Retos.evaluar(reto, "cuerpo", true), "cuerpo");
    assert.equal(Retos.evaluar(reto, null, true), "nada");
});

prueba("el toque agranda la zona chica y no se come a la vecina lejana", function () {
    const zonas = [
        { id: "oreja_izq", x: 0, y: 0, rx: 10, ry: 10 },
        { id: "barriga", x: 200, y: 0, rx: 40, ry: 30 },
        { id: "cuerpo", x: 0, y: 40, rx: 240, ry: 200 }
    ];
    assert.equal(Retos.tocar(12, 0, zonas, 36), "oreja_izq");
    assert.equal(Retos.tocar(200, 0, zonas, 36), "barriga");
    assert.equal(Retos.tocar(0, 80, zonas, 36), "cuerpo");
});

prueba("la partida arma 3 rondas de 3 y rota la esquina de la linterna", function () {
    const fijo = function (n) { return function () { return n; }; };
    const a = Retos.armarPartida(config, fijo(0));
    const b = Retos.armarPartida(config, fijo(0.9));
    assert.equal(a.length, 3);
    a.forEach(function (ronda) { assert.equal(ronda.retos.length, 3); });
    assert.deepEqual(a[0].retos.map(function (r) { return r.parte; }), ["barriga", "manos", "pies"]);
    assert.deepEqual(a[1].retos.map(function (r) { return r.parte; }), ["rodillas", "hombros", "orejas"]);
    assert.deepEqual(a[2].retos.map(function (r) { return r.parte; }), ["ojos", "boca", "cabello"]);
    assert.equal(a[1].anuncio, config.textos.rondas["2"]);
    assert.notEqual(a[0].retos[0].inicio, b[0].retos[0].inicio);
    semilla(1);
});

prueba("Zeus habla en tercera persona y el cierre nombra las tres rondas", function () {
    assert.match(config.textos.bienvenida, /Soy Zeus/);
    assert.equal(/\b(mi|mis)\b/i.test(config.textos.bienvenida), false);
    assert.match(config.textos.final, /tres rondas/);
    config.textos.conversacion.forEach(function (linea) {
        assert.equal(linea.personaje, 0);
    });
});

prueba("el volcado registra este juego una sola vez", function () {
    const dump = fs.readFileSync(path.join(__dirname, "..", "database", "ambientes.sql"), "utf8");
    assert.equal((dump.match(/linterna-reveladora-de-partes/g) || []).length, 1);
    const fila = dump.split("\n").find(function (l) { return l.indexOf("'linterna-reveladora-de-partes'") !== -1; });
    assert.match(fila, /catalogo_juegos\/Polimotor\/LinternaReveladoraPartes/);
    assert.match(fila, /,7,11,29,9,/);
    assert.match(fila, /linterna\.png/);
    assert.match(fila, /'#5b4fcf',13,1,/);
});

console.log(ok + " pruebas");
