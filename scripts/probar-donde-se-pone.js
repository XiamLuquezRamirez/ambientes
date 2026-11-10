/**
 * Pruebas de las reglas puras de "¿Dónde se pone?" (reglas.js) y de su config.json.
 * Uso: node scripts/probar-donde-se-pone.js
 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "DondeSePone");
const Reglas = require(path.join(dir, "reglas.js"));
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

let ok = 0;
function prueba(nombre, fn) {
    fn();
    ok++;
    console.log("  ✓ " + nombre);
}

function semilla(s) {
    return function () {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
    };
}

console.log("¿Dónde se pone? — reglas");

prueba("asociaciones objeto → parte del cuerpo", function () {
    assert.equal(Reglas.zonaDe(config, "gafas"), "ojos");
    assert.equal(Reglas.zonaDe(config, "sombrero"), "cabeza");
    assert.equal(Reglas.zonaDe(config, "zapatos"), "pies");
    assert.equal(Reglas.zonaDe(config, "bufanda"), "cuello");
    assert.equal(Reglas.zonaDe(config, "corbata"), null);
});

prueba("solo es correcto en su zona", function () {
    assert.ok(Reglas.esCorrecta(config, "gafas", "ojos"));
    assert.ok(!Reglas.esCorrecta(config, "zapatos", "cabeza"));
    assert.ok(!Reglas.esCorrecta(config, "sombrero", "ojos"));
    assert.ok(!Reglas.esCorrecta(config, "bufanda", null));
    assert.ok(!Reglas.esCorrecta(config, null, "cuello"));
});

prueba("elegirZona: gana la más cercana dentro de la tolerancia", function () {
    assert.equal(Reglas.elegirZona([{ id: "ojos", d: 0.8 }, { id: "cabeza", d: 0.4 }], 1.25), "cabeza");
    assert.equal(Reglas.elegirZona([{ id: "ojos", d: 1.2 }], 1.25), "ojos");
    assert.equal(Reglas.elegirZona([{ id: "ojos", d: 1.2 }], 1), null);
    assert.equal(Reglas.elegirZona([], 1.25), null);
    assert.equal(Reglas.distanciaNormalizada(10, 0, { x: 0, y: 0, rx: 20, ry: 10 }), 0.5);
});

prueba("la ronda 1 sigue el orden del enunciado y los lugares de config", function () {
    const r = Reglas.armarRondas(config, semilla(3));
    assert.equal(r.length, config.juego.rondas);
    assert.deepEqual(r[0].orden, ["gafas", "sombrero", "zapatos", "bufanda"]);
    assert.deepEqual(r[0].lugares, { gafas: 0, sombrero: 1, zapatos: 2, bufanda: 3 });
});

prueba("las demás rondas cambian el orden y los lugares, con los mismos 4 accesorios", function () {
    for (let s = 1; s < 60; s++) {
        const r = Reglas.armarRondas(config, semilla(s));
        for (let n = 1; n < r.length; n++) {
            assert.deepEqual(r[n].orden.slice().sort(), ["bufanda", "gafas", "sombrero", "zapatos"]);
            assert.notDeepEqual(r[n].orden, r[n - 1].orden);
            assert.notEqual(r[n].orden[0], r[n - 1].orden[3], "no empieza con el último de la anterior");
            assert.deepEqual(Object.values(r[n].lugares).sort(), [0, 1, 2, 3]);
            assert.notDeepEqual(r[n].lugares, r[n - 1].lugares);
        }
    }
});

prueba("siguientePendiente respeta el orden y salta los ya puestos", function () {
    const orden = ["gafas", "sombrero", "zapatos", "bufanda"];
    assert.equal(Reglas.siguientePendiente(orden, []), "gafas");
    assert.equal(Reglas.siguientePendiente(orden, ["gafas", "zapatos"]), "sombrero");
    assert.equal(Reglas.siguientePendiente(orden, ["sombrero", "gafas"]), "zapatos");
    assert.equal(Reglas.siguientePendiente(orden, orden), null);
});

prueba("config: cada accesorio trae todos sus campos y textos", function () {
    const zonas = Object.keys(config.zonas);
    const lugares = config.lugares.length;
    config.accesorios.forEach(function (a) {
        ["id", "nombre", "imagen", "zona", "posicionFinal", "escalaFinal", "encaje", "animacionPersonaje", "sonido"].forEach(function (k) {
            assert.ok(a[k] != null, a.id + " sin " + k);
        });
        assert.ok(zonas.indexOf(a.zona) >= 0, a.id + ": zona desconocida");
        assert.ok(a.posicionInicial >= 0 && a.posicionInicial < lugares);
        assert.ok(Array.isArray(a.textos.instruccion) && a.textos.instruccion.length);
        assert.ok(a.textos.ayuda && a.textos.acierto);
    });
    assert.equal(config.lugaresRetrato.length, lugares);
    assert.deepEqual(config.demo, ["gafas", "sombrero", "zapatos", "bufanda"]);
    assert.equal(config.niveles[0].edad, "3-4 años");
});

prueba("Zeus habla en primera persona; las pistas de Zoe hablan de Zeus", function () {
    config.accesorios.forEach(function (a) {
        assert.ok(/Zeus/.test(a.textos.ayuda), a.id + ": la pista de Zoe debe nombrar a Zeus");
        assert.ok(!/\bZeus\b/.test(a.textos.instruccion.join(" ")), a.id + ": Zeus no habla de sí en tercera persona");
    });
});

console.log("\n" + ok + " pruebas OK");
