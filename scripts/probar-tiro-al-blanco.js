/**
 * Prueba de "El Tiro al Blanco en Movimiento": reglas puras, config válido, patrones seguros,
 * física coherente con la guía, zonas de puntos, dificultad creciente y textos literales del enunciado.
 *   node scripts/probar-tiro-al-blanco.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "TiroBlancoMovimiento");
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

prueba("3 rondas de 4 lanzamientos (12 en total)", function () {
    assert.strictEqual(R.totalRondas(cfg), 3);
    assert.strictEqual(R.lanzamientosPorRonda(cfg), 4);
    assert.strictEqual(R.totalLanzamientos(cfg), 12);
});

prueba("la dificultad aumenta: diana más pequeña, más rápida y menos sombra", function () {
    const [a, b, c] = [0, 1, 2].map(function (i) { return R.ronda(cfg, i); });
    assert.ok(a.radio > b.radio && b.radio > c.radio);
    assert.ok(a.velocidad < b.velocidad && b.velocidad < c.velocidad);
    assert.ok(a.sombra.lanzamientos > b.sombra.lanzamientos && b.sombra.lanzamientos >= c.sombra.lanzamientos);
    assert.ok(c.velocidad <= 260, "la ronda 3 no debe ser frustrante");
});

prueba("ronda 1 solo horizontal; ronda 2 añade diagonal; ronda 3 varía", function () {
    assert.ok(R.ronda(cfg, 0).patrones.every(function (p) { return p.indexOf("horizontal") === 0; }));
    assert.ok(R.ronda(cfg, 1).patrones.some(function (p) { return p.indexOf("diagonal") === 0; }));
    assert.ok(R.ronda(cfg, 2).patrones.length >= 3);
});

prueba("todos los patrones quedan dentro de la caja segura y sin saltos bruscos", function () {
    const z = R.zona(cfg);
    R.PATRONES.forEach(function (p) {
        let previo = null;
        const w = R.omega(p, 260, z);
        for (let t = 0; t < 30; t += 1 / 60) {
            const q = R.posicion(p, w * t, z, { desX: 9999 });
            assert.ok(q.x >= z.x0 - 0.01 && q.x <= z.x1 + 0.01 && q.y >= z.y0 - 0.01 && q.y <= z.y1 + 0.01, p + " sale de la caja");
            if (previo) {
                const v = Math.hypot(q.x - previo.x, q.y - previo.y) * 60;
                assert.ok(v < 340, p + " va demasiado rápido: " + Math.round(v) + " px/s");
            }
            previo = q;
        }
    });
});

prueba("elegirPatron no repite el anterior y solo usa patrones válidos", function () {
    const lista = R.ronda(cfg, 2).patrones;
    let ant = null;
    for (let i = 0; i < 200; i++) {
        const p = R.elegirPatron(lista, ant);
        assert.ok(lista.indexOf(p) >= 0);
        assert.notStrictEqual(p, ant);
        ant = p;
    }
    assert.strictEqual(R.elegirPatron(["inventado"], null), "horizontal-der");
});

const O = { x: 800, y: 686 };
const MUNDO = { x0: 0, y0: 0, x1: 1600, y1: 900 };

/** Simula un tiro como la escena: paso a paso hasta que el disco llega a la distancia de la mira. */
function simular(tiro, diana) {
    const g = R.fisica(cfg).g;
    let prev = { x: O.x, y: O.y };
    for (let t = 1 / 120; t < 3; t += 1 / 120) {
        const p = R.punto(O, tiro, g, t);
        const r0 = Math.hypot(prev.x - O.x, prev.y - O.y), r1 = Math.hypot(p.x - O.x, p.y - O.y);
        if (r1 >= tiro.distancia) {
            const k = r1 > r0 ? (tiro.distancia - r0) / (r1 - r0) : 1;
            const q = { x: prev.x + (p.x - prev.x) * k, y: prev.y + (p.y - prev.y) * k };
            const d = diana(t);
            return { t: t, q: q, dist: Math.hypot(q.x - d.x, q.y - d.y) };
        }
        prev = p;
    }
    return null;
}

prueba("esfera como joystick: más cerca del borde = más alto; el tope es el borde de la pantalla", function () {
    const f = R.fisica(cfg);
    assert.strictEqual(R.puntoMira(cfg, O, 5, -10, MUNDO).valido, false, "un toque sin mover no da dirección");
    const alturas = [0.25, 0.5, 0.75, 1].map(function (k) {
        const d = f.arrastreMin + k * (f.radioMira - f.arrastreMin);
        return R.puntoMira(cfg, O, 0, -d, MUNDO).y;
    });
    for (let i = 1; i < alturas.length; i++) assert.ok(alturas[i] < alturas[i - 1], "más lejos del centro debe apuntar más alto");
    assert.ok(Math.abs(alturas[3] - f.margen) < 1e-6, "en el borde de la esfera llega arriba de la pantalla");
    const fueraDeLaEsfera = R.puntoMira(cfg, O, 0, -500, MUNDO);
    assert.ok(Math.abs(fueraDeLaEsfera.y - f.margen) < 1e-6, "si el dedo sale de la esfera, queda en el tope");
    const lado = R.puntoMira(cfg, O, f.radioMira, -f.radioMira * 0.6, MUNDO);
    assert.ok(Math.abs(lado.x - (MUNDO.x1 - f.margen)) < 1e-6 || Math.abs(lado.y - f.margen) < 1e-6, "tope por el lado o por arriba");
    const tablet = { x0: 200, y0: 0, x1: 1400, y1: 900 };
    const ladoTablet = R.puntoMira(cfg, O, f.radioMira, -f.radioMira * 0.3, tablet);
    assert.ok(Math.abs(ladoTablet.x - (tablet.x1 - f.margen)) < 1e-6, "en tableta el tope es el borde que se ve");
    const minimo = R.puntoMira(cfg, O, 0, -f.arrastreMin, MUNDO);
    assert.ok(Math.abs(O.y - minimo.y - f.alcanceMin) < 1e-6, "lo mínimo sale un poco del lanzador");
});

prueba("dedoPara es lo inverso de puntoMira (la demo arrastra dentro de la esfera)", function () {
    const z = R.zona(cfg);
    const f = R.fisica(cfg);
    for (let x = z.x0; x <= z.x1; x += 55) {
        for (let y = z.y0; y <= z.y1; y += 40) {
            const dedo = R.dedoPara(cfg, O, { x: x, y: y }, MUNDO);
            assert.ok(Math.hypot(dedo.dx, dedo.dy) <= f.radioMira + 1e-6, "el dedo queda dentro de la esfera");
            const m = R.puntoMira(cfg, O, dedo.dx, dedo.dy, MUNDO);
            assert.ok(Math.hypot(m.x - x, m.y - y) < 1, "no vuelve a " + x + "," + y);
        }
    }
});

prueba("el disco llega justo a la mira (la línea punteada termina donde llega)", function () {
    const z = R.zona(cfg);
    for (let x = z.x0 - 100; x <= z.x1 + 100; x += 50) {
        for (let y = 60; y <= 520; y += 40) {
            const tiro = R.tiroHacia(cfg, O, { x: x, y: y });
            const r = simular(tiro, function () { return { x: x, y: y }; });
            assert.ok(r && r.dist < 2, "no llega a " + x + "," + y + ": " + (r && r.dist));
            assert.ok(Math.abs(r.t - tiro.T) < 0.02, "el tiempo de la guía no coincide");
        }
    }
});

prueba("apuntarHacia anticipa la diana en movimiento; apuntar justo a ella se queda atrás", function () {
    const z = R.zona(cfg);
    ["horizontal-der", "diagonal-sube", "combinado", "ondulatorio", "vertical"].forEach(function (p) {
        const w = R.omega(p, 215, z);
        const pred = function (s) { return R.posicion(p, 1.6 + w * s, z, {}); };
        const sol = R.apuntarHacia(cfg, O, pred);
        const r = simular(R.tiroHacia(cfg, O, sol.P), pred);
        assert.ok(r && r.dist < 4, p + ": se aleja " + (r && r.dist));
        if (p !== "vertical") {
            const directo = simular(R.tiroHacia(cfg, O, pred(0)), pred);
            assert.ok(directo.dist > r.dist + 10, p + ": anticipar debe ayudar");
        }
    });
});

prueba("la puntuación depende de la puntería (no siempre 50)", function () {
    const diana = { x: 800, y: 330 }, radio = 100;
    const puntos = [0, 60, 90, 140].map(function (desvio) {
        const r = simular(R.tiroHacia(cfg, O, { x: diana.x + desvio, y: diana.y }), function () { return diana; });
        const zona = R.zonaImpacto(cfg, r.dist, radio);
        return zona ? zona.puntos : 0;
    });
    assert.deepStrictEqual(puntos, [50, 20, 10, 0]);
});

prueba("vuelo corto y la ronda 3 se puede anticipar (la diana avanza a lo sumo ~1,3 radios)", function () {
    const z = R.zona(cfg);
    let tMax = 0;
    for (let x = z.x0; x <= z.x1; x += 40) {
        for (let y = z.y0; y <= z.y1; y += 23) tMax = Math.max(tMax, R.tiroHacia(cfg, O, { x: x, y: y }).T);
    }
    assert.ok(tMax < 0.6, "vuelo largo: " + tMax);
    const r = R.ronda(cfg, 2);
    assert.ok(r.velocidad * tMax <= r.radio * 1.3, "avanza " + Math.round(r.velocidad * tMax) + " px con radio " + r.radio);
});

prueba("zonas: centro 50, intermedio 20, exterior 10, fuera 0", function () {
    const rd = R.fisica(cfg).radioDisco;   // el disco suma desde que toca el borde
    assert.deepStrictEqual(R.zonaImpacto(cfg, 0, 100), { id: "centro", puntos: 50 });
    assert.deepStrictEqual(R.zonaImpacto(cfg, 34 + rd, 100), { id: "centro", puntos: 50 });
    assert.deepStrictEqual(R.zonaImpacto(cfg, 50 + rd, 100), { id: "medio", puntos: 20 });
    assert.deepStrictEqual(R.zonaImpacto(cfg, 90 + rd, 100), { id: "exterior", puntos: 10 });
    assert.strictEqual(R.zonaImpacto(cfg, 101 + rd, 100), null);
});

prueba("distanciaSegmento detecta un disco rápido que atraviesa la diana", function () {
    const c = R.distanciaSegmento({ x: 0, y: 0 }, { x: -50, y: 10 }, { x: 50, y: 10 });
    assert.ok(Math.abs(c.d - 10) < 1e-9 && Math.abs(c.x) < 1e-9);
});

prueba("resumen y estrellas: sin castigo, siempre al menos una estrella", function () {
    const res = R.resumen(cfg, ["centro", "fallo", "medio", "exterior", "fallo"]);
    assert.deepStrictEqual(res, { lanzamientos: 5, aciertos: 3, centros: 1, puntos: 80 });
    assert.strictEqual(R.estrellas(R.resumen(cfg, ["fallo", "fallo"]), 12), 1);
    assert.strictEqual(R.estrellas(R.resumen(cfg, Array(12).fill("centro")), 12), 3);
});

prueba("textos literales del enunciado", function () {
    const t = cfg.textos;
    assert.strictEqual(t.introZeus, "¡Alerta de puntería, súper atleta! La diana se mueve en el aire. Ajusta tu mira y lanza tu disco de luz para intentar acertar.");
    assert.strictEqual(t.demoZoe, "¡Apunta un poquito adelante de la diana para que el disco la encuentre en el aire!");
    assert.strictEqual(t.zoeMira, "¡Mira dónde se mueve!");
    assert.strictEqual(t.zoeAdelante, "¡Apunta un poquito más adelante!");
    assert.strictEqual(t.zoeLanza, "¡Ahora puedes lanzar!");
    assert.strictEqual(t.zoeSigue, "¡Sigue la diana con tus ojos!");
    assert.strictEqual(t.zeusCarga, "¡Carga tu disco!");
    assert.strictEqual(t.zeusApunta, "¡Apunta y dispara!");
    assert.strictEqual(t.zeusBien, "¡Muy buen lanzamiento!");
    assert.strictEqual(t.zeusSigue, "¡Intenta seguir su camino!");
    assert.strictEqual(t.fallo, "¡Casi! Lánzalo un instante antes para que se encuentren en el camino.");
    assert.strictEqual(t.rondaLista, "¡Muy bien! ¡Tu puntería está mejorando!");
    assert.strictEqual(t.finalTitulo, "¡QUÉ GRAN VISTA Y PRECISIÓN!");
    assert.strictEqual(t.final, "¡Qué gran vista y precisión! Seguiste la diana, calculaste su movimiento y lograste lanzamientos increíbles. ¡Eres un campeón de la puntería espacial!");
    assert.strictEqual(t.finalZoe + " " + t.finalZeus, t.final);
    assert.strictEqual(R.plantilla(t.lanzamientoDe, { n: 2, t: 4 }), "Lanzamiento 2 de 4");
});

prueba("edad 5-6 años en niveles (el catálogo la lee de aquí)", function () {
    assert.strictEqual(cfg.niveles[0].edad, "5-6 años");
});

prueba("botones comunes de Polimotor en index.html, sin cartel de edad", function () {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    assert.ok(html.indexOf('onclick="location.reload()" class="btn btn-warning btn-round"') >= 0);
    assert.ok(html.indexOf('onclick="history.back()" class="btn btn-danger btn-round"') >= 0);
    assert.ok(html.indexOf('id="btn-menu-acc" class="menu-acc-fab"') >= 0);
    assert.ok(html.indexOf('id="btn-menu-vol" class="menu-acc-fab"') >= 0);
    assert.ok(html.indexOf("../comun/interfaz.css") > html.indexOf("style.css"));
    assert.ok(!/5\s*-\s*6 años/.test(html), "no debe haber cartel de edad en la página");
    assert.ok(fs.existsSync(path.join(dir, "tiro-al-blanco.png")));
});

console.log((ok === total ? "✓ " : "✗ ") + ok + "/" + total + " pruebas de El Tiro al Blanco en Movimiento");
process.exit(ok === total ? 0 : 1);
