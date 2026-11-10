/**
 * Pruebas de la lógica pura del juego "El Espejo de las Posiciones y Lateralidad".
 * Uso: node scripts/probar-espejo-posiciones.js
 */
const path = require("path");
const fs = require("fs");
const assert = require("assert");

const base = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "EspejoDeLasPosiciones");
const P = require(path.join(base, "postura.js"));
const config = JSON.parse(fs.readFileSync(path.join(base, "config.json"), "utf8"));

let pruebas = 0;
function prueba(nombre, fn) {
    fn();
    pruebas++;
    console.log("ok -", nombre);
}

prueba("lateralidad anatómica: la izquierda del personaje se ve a la derecha de la pantalla", () => {
    const S = P.ESQUELETO.sockets;
    assert.ok(S.hombro_izq.x > S.hombro_der.x);
    assert.ok(S.cadera_izq.x > S.cadera_der.x);
    // Brazo izquierdo horizontal hacia afuera: la mano queda a la derecha del hombro (en pantalla).
    const izq = P.cinematica("brazo_izq", { a: 90, b: 0 }).punta;
    const der = P.cinematica("brazo_der", { a: 90, b: 0 }).punta;
    assert.ok(izq.x > 90 && Math.abs(izq.y) < 1, JSON.stringify(izq));
    assert.ok(der.x < -90 && Math.abs(der.y) < 1, JSON.stringify(der));
    // Brazo arriba: la mano queda encima del hombro.
    assert.ok(P.cinematica("brazo_izq", { a: 180, b: 0 }).punta.y < -90);
});

prueba("girar en pantalla es un espejo en cada lado", () => {
    // Horario (+) abre el brazo derecho (a sube) y cierra el izquierdo (a baja).
    assert.strictEqual(P.girar("brazo_der", { a: 0, b: 0 }, "p", 30).a, 30);
    assert.strictEqual(P.girar("brazo_izq", { a: 0, b: 0 }, "p", 30).a, -30);
    assert.strictEqual(P.girar("pierna_der", { a: 60, b: 0 }, "d", -90).b, -90);
    assert.strictEqual(P.girar("pierna_izq", { a: 60, b: 0 }, "d", 90).b, -90);
});

prueba("normalización y diferencia angular", () => {
    assert.strictEqual(P.normalizar(210), -150);
    assert.strictEqual(P.normalizar(-180), 180);
    assert.strictEqual(P.diferencia(170, -170), 20);
    assert.strictEqual(P.diferencia(180, -180), 0);
});

prueba("tolerancias: aceptan casi y rechazan lejos", () => {
    const cfg = config.juego;
    assert.ok(P.orientacion("brazo_izq", { a: 165, b: 0 }, { a: 180, b: 0 }, cfg).ok);
    assert.ok(!P.orientacion("brazo_izq", { a: 150, b: 0 }, { a: 180, b: 0 }, cfg).ok);
    assert.ok(P.orientacion("pierna_der", { a: 60, b: -120 }, { a: 60, b: -90 }, cfg).ok);
    assert.ok(!P.orientacion("pierna_der", { a: 60, b: 0 }, { a: 60, b: -90 }, cfg).ok);
    assert.ok(P.orientacion("cabeza", null, null, cfg).ok);
});

prueba("evaluar soltado: encaje, orientación, lado y lugar", () => {
    const cfg = config.juego;
    const obj = { a: 180, b: 0 };
    assert.strictEqual(P.evaluarSoltado("brazo_izq", "hombro_izq", { a: 180, b: 0 }, obj, cfg), "encaje");
    assert.strictEqual(P.evaluarSoltado("brazo_izq", "hombro_izq", { a: 0, b: 0 }, obj, cfg), "orientacion");
    assert.strictEqual(P.evaluarSoltado("brazo_izq", "hombro_der", { a: 180, b: 0 }, obj, cfg), "lado");
    assert.strictEqual(P.evaluarSoltado("brazo_izq", "cadera_izq", { a: 180, b: 0 }, obj, cfg), "lugar");
    assert.strictEqual(P.evaluarSoltado("brazo_izq", null, { a: 180, b: 0 }, obj, cfg), "nada");
    assert.strictEqual(P.evaluarSoltado("cabeza", "cuello", null, null, cfg), "encaje");
    assert.strictEqual(P.evaluarSoltado("cabeza", "pecho", null, null, cfg), "lugar");
});

prueba("socket más cercano respeta el radio y la lista permitida", () => {
    const S = P.ESQUELETO.sockets;
    assert.strictEqual(P.socketCercano({ x: S.hombro_izq.x + 10, y: S.hombro_izq.y }, 46, P.socketsDe("brazo")), "hombro_izq");
    assert.strictEqual(P.socketCercano({ x: 10, y: 10 }, 46, P.socketsDe("brazo")), null);
    // Un brazo soltado sobre el cuello no compite con el socket del cuello.
    assert.notStrictEqual(P.socketCercano(S.cuello, 46, P.socketsDe("brazo")), "cuello");
});

prueba("pasos: completa piezas faltantes y no repite", () => {
    const pasos = P.pasos([["cabeza", "tronco"], ["brazo_izq"], ["brazo_izq", "x"]]);
    const todas = pasos.flat();
    assert.strictEqual(new Set(todas).size, 6);
    assert.deepStrictEqual(pasos[0], ["cabeza", "tronco"]);
    assert.strictEqual(P.claveDePaso(["cabeza", "tronco"]), "cabeza_tronco");
});

prueba("textos con {pieza} y mayúscula inicial", () => {
    assert.strictEqual(P.texto("¡Observa otra vez! ¿Dónde está tu {parte}?", "brazo_izq"), "¡Observa otra vez! ¿Dónde está tu brazo izquierdo?");
    assert.strictEqual(P.texto("¡Observa otra vez! {Pieza} va en {articulacion}.", "pierna_der"), "¡Observa otra vez! La pierna derecha va en la cadera derecha.");
    assert.strictEqual(P.texto("{pieza} va en {articulacion}.", "pierna_der"), "La pierna derecha va en la cadera derecha.");
    assert.strictEqual(P.texto("¡{pieza}!", "cabeza"), "¡La cabeza!");
});

prueba("datos: 3 niveles con varias posturas alcanzables con el paso de giro", () => {
    const paso = config.juego.pasoGiro;
    assert.strictEqual(config.etapas.length, 3);
    const todas = [config.demo];
    config.etapas.forEach((e) => {
        assert.ok(e.posturas.length >= 2, "nivel " + e.id + " con varias posturas");
        e.posturas.forEach((p) => todas.push(p));
        if (!e.flexion) {
            e.posturas.forEach((p) => P.EXTREMIDADES.forEach((id) => {
                assert.strictEqual(P.normalizarPostura(p).partes[id].b, 0, p.id + " sin flexión en nivel 1");
            }));
        }
    });
    todas.forEach((p) => {
        const n = P.normalizarPostura(p);
        P.EXTREMIDADES.forEach((id) => {
            const t = n.partes[id];
            // Desde 0° se llega con toques de 'paso' quedando dentro de la tolerancia.
            const resto = (x) => Math.abs(x - Math.round(x / paso) * paso);
            assert.ok(resto(t.a) <= config.juego.toleranciaGrados, p.id + " " + id + " a");
            assert.ok(resto(t.b) <= config.juego.toleranciaFlexion, p.id + " " + id + " b");
        });
    });
});

prueba("datos: en el nivel 2 al menos una pierna doblada por postura", () => {
    config.etapas[1].posturas.forEach((p) => {
        const n = P.normalizarPostura(p);
        assert.ok(Math.abs(n.partes.pierna_der.b) > 0 || Math.abs(n.partes.pierna_izq.b) > 0, p.id);
    });
});

prueba("los textos de paso cubren los órdenes configurados", () => {
    const claves = new Set();
    const ordenes = [config.juego.ordenPasos];
    config.etapas.forEach((e) => e.posturas.forEach((p) => { if (p.orden) ordenes.push(p.orden); }));
    ordenes.forEach((o) => P.pasos(o).forEach((g) => claves.add(P.claveDePaso(g))));
    claves.forEach((c) => {
        assert.ok(config.textos.paso[c], "falta textos.paso." + c);
        assert.ok(config.textos.titulosPaso[c], "falta textos.titulosPaso." + c);
    });
});

prueba("datos: 5 posturas por nivel (15 en total) y sin ids repetidos", () => {
    assert.strictEqual(config.etapas.length, 3);
    const ids = [];
    config.etapas.forEach((e) => {
        assert.strictEqual(e.posturas.length, 5, "nivel " + e.id);
        e.posturas.forEach((p) => ids.push(p.id));
    });
    assert.strictEqual(ids.length, 15);
    assert.strictEqual(new Set(ids).size, 15, "ids repetidos");
    assert.ok(!("posturasPorEtapa" in config.juego), "la partida siempre juega 1 por nivel");
});

console.log("\n" + pruebas + " pruebas OK");
