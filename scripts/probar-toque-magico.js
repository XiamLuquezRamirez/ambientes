/**
 * Pruebas de las reglas puras de "El Toque Mágico de las Cosquillas" (retos.js) y de su config.json.
 * Uso: node scripts/probar-toque-magico.js
 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "ToqueMagicoCosquillas");
const Retos = require(path.join(dir, "retos.js"));
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

let ok = 0;
function prueba(nombre, fn) {
    fn();
    ok++;
    console.log("  ✓ " + nombre);
}

/** Generador pseudoaleatorio fijo para que las pruebas se repitan igual. */
function semilla(s) {
    return function () {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
    };
}

console.log("Toque Mágico de las Cosquillas — reglas");

prueba("cada zona pertenece a su parte", function () {
    assert.equal(Retos.parteDeZona("ojo_izq"), "ojos");
    assert.equal(Retos.parteDeZona("ojo_der"), "ojos");
    assert.equal(Retos.parteDeZona("nariz"), "nariz");
    assert.equal(Retos.parteDeZona("boca"), "boca");
    assert.equal(Retos.parteDeZona("mano_izq"), "manos");
    assert.equal(Retos.parteDeZona("mano_der"), "manos");
    assert.equal(Retos.parteDeZona("cuerpo"), null);
    assert.equal(Retos.parteDeZona("pie"), null);
    assert.deepEqual(Retos.zonasDeParte("manos").sort(), ["mano_der", "mano_izq"]);
});

prueba("acierto solo con la parte pedida; las dos manos valen", function () {
    assert.ok(Retos.esCorrecta({ parte: "ojos" }, "ojo_izq"));
    assert.ok(Retos.esCorrecta({ parte: "ojos" }, "ojo_der"));
    assert.ok(!Retos.esCorrecta({ parte: "ojos" }, "boca"));
    assert.ok(!Retos.esCorrecta({ parte: "nariz" }, "cuerpo"));
    assert.ok(Retos.esCorrecta({ parte: "manos" }, "mano_izq"));
    assert.ok(Retos.esCorrecta({ parte: "manos" }, "mano_der"));
    assert.ok(!Retos.esCorrecta({ parte: "manos" }, "nariz"));
    assert.ok(!Retos.esCorrecta(null, "nariz"));
});

prueba("si el reto pide una mano, solo vale esa", function () {
    assert.ok(Retos.esCorrecta({ parte: "manos", lado: "der" }, "mano_der"));
    assert.ok(!Retos.esCorrecta({ parte: "manos", lado: "der" }, "mano_izq"));
});

prueba("distancia normalizada de una elipse", function () {
    const z = { x: 10, y: 20, rx: 50, ry: 25 };
    assert.equal(Retos.distanciaNormalizada(10, 20, z), 0);
    assert.equal(Retos.distanciaNormalizada(60, 20, z), 1);
    assert.equal(Retos.distanciaNormalizada(10, 45, z), 1);
    assert.ok(Retos.distanciaNormalizada(70, 20, z) > 1);
});

prueba("entre zonas que se pisan gana la más cercana; 'cuerpo' solo si no hay otra", function () {
    assert.equal(Retos.elegirZona([{ id: "nariz", d: 0.8 }, { id: "boca", d: 0.6 }]), "boca");
    assert.equal(Retos.elegirZona([{ id: "cuerpo", d: 0.1 }, { id: "nariz", d: 0.9 }]), "nariz");
    assert.equal(Retos.elegirZona([{ id: "cuerpo", d: 0.4 }]), "cuerpo");
    assert.equal(Retos.elegirZona([{ id: "boca", d: 1.4 }]), null);
    assert.equal(Retos.elegirZona([]), null);
    // Área táctil agrandada (pantallas chicas): vale aunque d > 1 si cayó dentro.
    assert.equal(Retos.elegirZona([{ id: "nariz", d: 1.3, dentro: true }, { id: "boca", d: 1.5, dentro: true }]), "nariz");
});

prueba("las zonas táctiles de la cara no se confunden en sus centros", function () {
    global.window = global;
    require(path.join(dir, "personaje.js"));
    const Z = global.Personaje.GEOMETRIA.zonas;
    const cara = ["ojo_izq", "ojo_der", "nariz", "boca"];
    cara.forEach(function (id) {
        const candidatos = cara.map(function (otra) {
            return { id: otra, d: Retos.distanciaNormalizada(Z[id].x, Z[id].y, Z[otra]) };
        });
        assert.equal(Retos.elegirZona(candidatos), id, "centro de " + id);
    });
    // Ninguna zona de la cara contiene el centro de otra.
    cara.forEach(function (a) {
        cara.forEach(function (b) {
            if (a !== b) assert.ok(Retos.distanciaNormalizada(Z[a].x, Z[a].y, Z[b]) > 1, a + " dentro de " + b);
        });
    });
    // Zonas amplias para manos pequeñas: al menos 30 unidades de radio (≈ 13 px en un celular, se agrandan a 26 px).
    Object.keys(Z).forEach(function (id) {
        assert.ok(Math.min(Z[id].rx, Z[id].ry) >= 30, id + " muy pequeña");
    });
});

prueba("config: banco con las 9 partes y textos completos", function () {
    assert.deepEqual(Object.keys(config.banco).sort(), Retos.PARTES.slice().sort());
    Retos.PARTES.forEach(function (p) {
        assert.ok(config.partes[p], "partes." + p);
        assert.ok(config.banco[p].length >= 1, "banco." + p);
        config.banco[p].forEach(function (x) {
            assert.ok(x.texto && x.ayuda && x.acierto, "textos de " + p);
            assert.ok(["zoe", "zeus"].indexOf(x.personaje) >= 0);
        });
    });
    assert.deepEqual(config.demo.map(function (x) { return x.parte; }), ["ojos", "nariz", "boca", "manos"]);
    assert.equal(config.niveles[0].edad, "3-4 años");
    assert.equal(config.juego.partesPorRonda, 4);
});

prueba("Zeus habla siempre en tercera persona (instrucciones, pistas, errores, demo, cierre)", function () {
    const primeraPersona = /(^|[^\p{L}])(mi|mis|me|conmigo|yo)([^\p{L}]|$)/iu;
    const deZeus = [];
    Retos.PARTES.forEach(function (p) {
        config.banco[p].forEach(function (x) {
            assert.equal(x.personaje, "zeus", "las instrucciones de " + p + " las dice Zeus");
            deZeus.push(x.texto, x.ayuda);
        });
    });
    config.demo.forEach(function (x) { deZeus.push(x.texto); });
    const t = config.textos;
    deZeus.push(t.demostracion, t.demostracionFin, t.rondaCompleta, t.cierre, t.desfileAnuncio);
    (t.error || []).forEach(function (e) { deZeus.push(e); });
    deZeus.forEach(function (txt) {
        assert.ok(!primeraPersona.test(txt), "Zeus en primera persona: " + txt);
    });
});

prueba("cada zona del dibujo tiene parte (y cada parte, zona)", function () {
    const Z = global.Personaje.GEOMETRIA.zonas;
    Object.keys(Z).forEach(function (id) {
        if (id !== "cuerpo") assert.ok(Retos.parteDeZona(id), "zona sin parte: " + id);
    });
    Retos.PARTES.forEach(function (p) { assert.ok(Retos.zonasDeParte(p).length, "parte sin zona: " + p); });
});

prueba("partida al azar: 3 rondas de 4 partes distintas, cubren casi todo y varían", function () {
    const primeras = new Set();
    for (let s = 1; s <= 60; s++) {
        const rondas = Retos.armarPartida(config, semilla(s));
        assert.equal(rondas.length, 3);
        const vistas = new Set();
        rondas.forEach(function (r, i) {
            const partes = r.retos.map(function (x) { return x.parte; });
            assert.equal(partes.length, 4);
            assert.equal(new Set(partes).size, 4, "partes repetidas en una ronda");
            assert.equal(r.numero, i + 1);
            if (i > 0) assert.notEqual(partes[0], rondas[i - 1].retos[3].parte, "empieza con la última de la anterior");
            partes.forEach(function (p) { vistas.add(p); });
            r.retos.forEach(function (x) { assert.ok(x.texto && x.parte); });
        });
        // 12 turnos con 9 partes, prefiriendo las menos usadas: salen las 9.
        assert.equal(vistas.size, 9, "semilla " + s);
        primeras.add(rondas[0].retos.map(function (x) { return x.parte; }).join(","));
    }
    assert.ok(primeras.size > 20, "la primera ronda casi no varía");
});

prueba("partes dobles: cualquier lado vale salvo que el reto pida uno", function () {
    ["oreja", "rodilla", "pie", "ojo", "mano"].forEach(function (z) {
        const parte = Retos.parteDeZona(z + "_izq");
        assert.ok(Retos.esCorrecta({ parte: parte }, z + "_izq"));
        assert.ok(Retos.esCorrecta({ parte: parte }, z + "_der"));
        assert.ok(!Retos.esCorrecta({ parte: parte, lado: "izq" }, z + "_der"));
    });
    assert.ok(Retos.esCorrecta({ parte: "cabello" }, "coleta_der"));
    assert.ok(Retos.esCorrecta({ parte: "cabello" }, "cabello"));
});

prueba("plantilla de textos", function () {
    assert.equal(Retos.plantilla("Ronda {n} de {total}", { n: 1, total: 2 }), "Ronda 1 de 2");
    assert.equal(Retos.plantilla("Hola {x}", {}), "Hola {x}");
});

console.log("\n" + ok + " pruebas correctas.");
