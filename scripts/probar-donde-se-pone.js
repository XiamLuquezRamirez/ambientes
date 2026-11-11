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
const Accesorios = require(path.join(dir, "accesorios.js"));
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
    assert.equal(Reglas.zonaDe(config, "audifonos"), "orejas");
    assert.equal(Reglas.zonaDe(config, "collar"), "cuello");
    assert.equal(Reglas.zonaDe(config, "chaqueta"), "torso");
    assert.equal(Reglas.zonaDe(config, "pantalones"), "piernas");
    assert.equal(Reglas.zonaDe(config, "guantes"), "manos");
    assert.equal(Reglas.zonaDe(config, "reloj"), "munecas");
    assert.equal(Reglas.zonaDe(config, "manilla"), "munecas");
    assert.equal(Reglas.zonaDe(config, "chanclas"), "pies");
    assert.equal(Reglas.zonaDe(config, "botas"), "pies");
    assert.equal(Reglas.zonaDe(config, "sandalias"), "pies");
    assert.equal(Reglas.zonaDe(config, "gorra"), "cabeza");
    assert.equal(Reglas.zonaDe(config, "gorro_fiesta"), "cabeza");
    assert.equal(Reglas.zonaDe(config, "abrigo"), "torso");
    assert.equal(Reglas.zonaDe(config, "chaleco"), "torso");
    assert.equal(Reglas.zonaDe(config, "jeans"), "piernas");
    assert.equal(Reglas.zonaDe(config, "pantaloneta"), "piernas");
    assert.equal(Reglas.zonaDe(config, "mocasines"), "pies");
    assert.equal(Reglas.zonaDe(config, "pantuflas"), "pies");
    assert.equal(Reglas.zonaDe(config, "visera"), "cabeza");
    assert.equal(Reglas.zonaDe(config, "antifaz"), "ojos");
    assert.equal(Reglas.zonaDe(config, "gafas_redondas"), "ojos");
    assert.equal(Reglas.zonaDe(config, "orejeras"), "orejas");
    assert.equal(Reglas.zonaDe(config, "cascos"), "orejas");
    assert.equal(Reglas.zonaDe(config, "sudadera"), "torso");
    assert.equal(Reglas.zonaDe(config, "guantes_azules"), "manos");
    assert.equal(Reglas.zonaDe(config, "guantes_verdes"), "manos");
    assert.equal(Reglas.zonaDe(config, "pulsera"), "munecas");
    assert.equal(Reglas.zonaDe(config, "bermuda"), "piernas");
    assert.equal(Reglas.zonaDe(config, "botines"), "pies");
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

prueba("cada ronda trae 4 objetos, uno solo por parte del cuerpo", function () {
    for (let s = 1; s <= 80; s++) {
        const r = Reglas.armarRondas(config, semilla(s));
        assert.equal(r.length, config.juego.rondas);
        r.forEach(function (ronda) {
            assert.equal(ronda.orden.length, config.juego.porRonda);
            const zonas = ronda.orden.map(function (id) { return Reglas.zonaDe(config, id); });
            assert.equal(new Set(zonas).size, zonas.length, "zona repetida en la ronda " + ronda.numero);
            assert.ok(!(zonas.includes("manos") && zonas.includes("munecas")), "guante y reloj en la misma ronda");
            assert.deepEqual(Object.values(ronda.lugares).slice().sort(), [0, 1, 2, 3]);
        });
        for (let n = 1; n < r.length; n++) {
            assert.notDeepEqual(r[n].orden.slice().sort(), r[n - 1].orden.slice().sort());
            assert.notEqual(r[n].orden[0], r[n - 1].orden[r[n - 1].orden.length - 1]);
            assert.notDeepEqual(r[n].lugares, r[n - 1].lugares);
        }
    }
});

prueba("en varias partidas salen calzado, cuello y muñeca distintos", function () {
    const vistos = new Set();
    for (let s = 1; s <= 80; s++) {
        Reglas.armarRondas(config, semilla(s)).forEach(function (ronda) {
            ronda.orden.forEach(function (id) { vistos.add(id); });
        });
    }
    ["zapatos", "chanclas", "botas", "sandalias", "mocasines", "pantuflas", "botines", "bufanda", "collar", "reloj", "manilla", "pulsera", "gorra", "visera", "antifaz", "orejeras", "cascos", "sudadera", "guantes", "guantes_azules", "guantes_verdes", "bermuda"].forEach(function (id) {
        assert.ok(vistos.has(id), "nunca salió " + id);
    });
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
        [a.imagen, a.imagenPuesta].filter(Boolean).forEach(function (clave) {
            const svg = Accesorios.SVG[clave];
            assert.ok(svg, a.id + ": falta el dibujo " + clave);
            const vb = /viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number);
            assert.ok(vb[2] > 0 && vb[3] > 0, clave + " viewBox inválido");
        });
    });
    assert.equal(config.lugaresRetrato.length, lugares);
    assert.deepEqual(config.demo, ["gafas", "sombrero", "zapatos", "bufanda"]);
    assert.equal(config.niveles[0].edad, "3-4 años");
});

prueba("Zoe habla de Zeus; nadie se viste en primera persona", function () {
    const primera = /\b(me pongo|mis |mi |ponerme|ayúdame|quedé|vestirme)\b/i;
    config.accesorios.forEach(function (a) {
        const dicho = a.textos.instruccion.join(" ") + " " + a.textos.acierto;
        assert.ok(/Zeus/.test(a.textos.ayuda), a.id + ": la pista debe nombrar a Zeus");
        assert.ok(/Zeus/.test(dicho), a.id + ": Zoe tiene que hablar de Zeus");
        assert.ok(!primera.test(dicho), a.id + ": la frase sigue en boca de quien se viste");
    });
    ["bienvenida", "saludoCorto", "demostracion", "otraVez", "final", "cierre"].forEach(function (k) {
        assert.ok(/Zeus/.test(config.textos[k]), k + " no nombra a Zeus");
        assert.ok(!primera.test(config.textos[k]), k + " sigue en primera persona");
    });
});

console.log("\n" + ok + " pruebas OK");
