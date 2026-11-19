/**
 * Prueba de "El Lanzador de Anillos de Zeus": reglas puras, config válido y textos literales del enunciado.
 *   node scripts/probar-lanzador-anillos-zeus.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "LanzadorAnillosZeus");
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

// geometría típica: anillo izquierdo, centro y derecho de la tarima; cono al fondo
const ALTO = 768;
const geo = {
    rojo: { salida: { x: -1.3, z: 1.55 }, cono: { x: 0, z: -1.15 }, anguloCono: 0.68, alto: ALTO },
    azul: { salida: { x: 0, z: 1.55 }, cono: { x: 0, z: -1.15 }, anguloCono: 0, alto: ALTO },
    amarillo: { salida: { x: 1.3, z: 1.55 }, cono: { x: 0, z: -1.15 }, anguloCono: -0.68, alto: ALTO }
};

function gesto(dx, dy, ms, finFactor) {
    const t = ms / 1000;
    const k = finFactor == null ? 0.4 : finFactor;
    return { dx: dx, dy: dy, ms: ms, dxFin: dx * k, dyFin: dy * k, vel: Math.hypot(dx, dy) * k / 0.12 * Math.min(1, 0.12 / t / k) };
}

prueba("config sin problemas", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
});

prueba("textos literales del enunciado", function () {
    const t = cfg.textos;
    assert.strictEqual(t.instruccionZeus, "¡Juguemos a la puntería! Toma un anillo con tu dedo, deslízalo hacia arriba apuntando a mi cono y suéltalo para ensartarlo.");
    assert.strictEqual(t.instruccionZoe, "¡Apunta al cono y desliza tu dedo hacia arriba!");
    assert.strictEqual(t.casi, "¡Casi lo lograste! ¡Inténtalo otra vez!");
    assert.strictEqual(t.final, "¡QUÉ GRAN PUNTERÍA! Ensartaste todos los anillos de colores en el cono mágico. ¡Tienes una coordinación increíble!");
    assert.strictEqual(t.finalZoe + " " + t.finalZeus, t.final);
    assert.strictEqual(t.conversacion[0].texto, t.instruccionZeus);
    assert.strictEqual(t.conversacion[1].texto, t.instruccionZoe);
    assert.strictEqual(t.conversacion[0].personaje, 0);
    assert.strictEqual(t.conversacion[1].personaje, 1);
});

prueba("anillos rojo, azul y amarillo con dibujo propio", function () {
    assert.deepStrictEqual(cfg.anillos.map(function (a) { return a.id; }), ["rojo", "azul", "amarillo"]);
    const dibujos = cfg.anillos.map(function (a) { return a.dibujo; });
    assert.strictEqual(new Set(dibujos).size, 3);
    assert.strictEqual(cfg.niveles[0].id, "3");
    assert.strictEqual(cfg.niveles[0].edad, "3-4 años");
});

prueba("gesto corto o hacia abajo no lanza", function () {
    assert.strictEqual(R.evaluar(gesto(0, -15, 200), geo.azul, cfg, 0).lanza, false);
    assert.strictEqual(R.evaluar(gesto(0, 120, 200), geo.azul, cfg, 0).lanza, false);
    assert.strictEqual(R.evaluar(gesto(150, 0, 200), geo.azul, cfg, 0).lanza, false);
});

prueba("deslizar hacia el cono acierta desde los tres anillos", function () {
    ["rojo", "azul", "amarillo"].forEach(function (id) {
        const g = geo[id];
        const largo = 240;
        const r = R.evaluar(gesto(Math.sin(g.anguloCono) * largo, -Math.cos(g.anguloCono) * largo, 260), g, cfg, 0);
        assert.ok(r.lanza && r.acierto, id + ": " + JSON.stringify(r));
        assert.deepStrictEqual(r.destino, g.cono);
    });
});

prueba("recto hacia arriba desde un anillo lateral: la ayuda corrige", function () {
    assert.ok(R.evaluar(gesto(0, -240, 280), geo.rojo, cfg, 0).acierto);
    assert.ok(R.evaluar(gesto(0, -240, 280), geo.amarillo, cfg, 0).acierto);
});

prueba("apuntar muy de lado falla (motivo lado)", function () {
    const r = R.evaluar(gesto(260, -120, 240), geo.amarillo, cfg, 0);
    assert.ok(r.lanza && !r.acierto);
    assert.strictEqual(r.motivo, "lado");
    const r2 = R.evaluar(gesto(-300, -140, 240), geo.rojo, cfg, 0);
    assert.ok(!r2.acierto);
});

prueba("un toquecito hacia arriba se queda corto", function () {
    const r = R.evaluar({ dx: 0, dy: -45, ms: 600, dxFin: 0, dyFin: -8, vel: 60 }, geo.azul, cfg, 0);
    assert.ok(r.lanza && !r.acierto, JSON.stringify(r));
    assert.strictEqual(r.motivo, "corto");
    assert.ok(r.natural.z > geo.azul.cono.z);
});

prueba("la meseta de fuerza: deslizamientos lentos, normales y rápidos llegan al cono", function () {
    [[0, -200, 900], [0, -260, 300], [0, -180, 120], [0, -420, 160]].forEach(function (a) {
        const r = R.evaluar(gesto(a[0], a[1], a[2]), geo.azul, cfg, 0);
        assert.ok(r.acierto, JSON.stringify(a) + " → " + JSON.stringify(r));
    });
});

prueba("la zona de recepción crece con los fallos seguidos (con tope)", function () {
    const p = R.parametros(cfg);
    assert.strictEqual(R.radioCaptura(0, cfg), p.radioCaptura);
    assert.ok(R.radioCaptura(2, cfg) > R.radioCaptura(1, cfg));
    assert.strictEqual(R.radioCaptura(50, cfg), p.radioCapturaMax);
    // un lanzamiento que falla con 0 fallos acierta tras varios
    const g = gesto(260, -150, 240);
    assert.ok(!R.evaluar(g, geo.azul, cfg, 0).acierto);
    assert.ok(R.evaluar(g, geo.azul, cfg, 6).acierto);
});

prueba("la caída de un fallo se aparta del cono y de Zeus", function () {
    const obst = [{ x: 0, z: -1.15, r: 1.3 }, { x: 1.6, z: -1.45, r: 0.9 }];
    for (let i = 0; i < 200; i++) {
        const p = { x: -4 + Math.random() * 8, z: -4 + Math.random() * 4.5 };
        const q = R.caidaSegura(p, obst, 0.05);
        // tras empujar fuera de un obstáculo puede quedar cerca del otro: se aplica en orden, basta con el primero
        assert.ok(Math.hypot(q.x - obst[1].x, q.z - obst[1].z) >= obst[1].r + 0.05 - 1e-9 || Math.hypot(q.x - obst[0].x, q.z - obst[0].z) >= obst[0].r);
    }
    const centro = R.caidaSegura({ x: 0, z: -1.15 }, obst, 0.1);
    assert.ok(Math.hypot(centro.x, centro.z + 1.15) >= 1.4 - 1e-9);
});

prueba("los anillos se apilan sin superponerse y caben en el cono", function () {
    const cono = { y0: 0.16, alto: 1.75, radioBase: 0.56, radioPunta: 0.07, radioInterior: 0.245, tubo: 0.095 };
    const y = [0, 1, 2].map(function (k) { return R.alturaApilado(k, cono); });
    assert.ok(y[1] - y[0] >= cono.tubo * 1.8 && y[2] - y[1] >= cono.tubo * 1.8);
    assert.ok(y[2] + cono.tubo < cono.y0 + cono.alto);
    assert.ok(y[0] > cono.y0 + 0.3);
});

prueba("niveles 1 y 2: el segundo con el cono más lejos y la puntería un poco más exigente", function () {
    assert.ok(cfg.rondas.length >= 2);
    const n1 = cfg.rondas[0], n2 = cfg.rondas[1];
    assert.deepStrictEqual(n1.cono, { x: 0, z: -1.15 });                 // = posición inicial de la escena
    assert.ok(n2.cono.z < n1.cono.z - 1, "el nivel 2 debe estar claramente más lejos");
    assert.ok(n2.zeus.z < n1.zeus.z);
    // mismo gesto lateral (≈ 40° fuera del cono): acierta en el nivel 1 y falla en el nivel 2
    const salida = { x: 0, z: 1.55 };
    const g1 = { salida: salida, cono: n1.cono, anguloCono: 0, alto: ALTO };
    const g2 = { salida: salida, cono: n2.cono, anguloCono: 0, alto: ALTO };
    const lado = gesto(Math.sin(0.72) * 240, -Math.cos(0.72) * 240, 260);
    assert.ok(R.evaluar(lado, g1, cfg, 0).acierto, "nivel 1");
    assert.ok(!R.evaluar(lado, g2, cfg, 0).acierto, "nivel 2");
    // apuntando bien acierta en los dos
    assert.ok(R.evaluar(gesto(0, -260, 280), g2, cfg, 0).acierto);
    assert.strictEqual(R.plantilla(cfg.textos.nivelSiguienteTitulo, { n: 2 }), "¡NIVEL 2!");
});

prueba("tercer nivel: el cono aún más lejos, Zeus detrás y todavía se puede acertar", function () {
    assert.strictEqual(cfg.rondas.length, 3);
    const n2 = cfg.rondas[1], n3 = cfg.rondas[2];
    assert.ok(n3.cono.z < n2.cono.z - 1, "el nivel 3 debe estar claramente más lejos que el 2");
    assert.ok(n3.cono.z > -6, "dentro del recorte de caídas (z ≥ -6.6) y antes de los animales");
    assert.ok(n3.zeus.z < n2.zeus.z);
    assert.ok(Math.hypot(n3.zeus.x - n3.cono.x, n3.zeus.z - n3.cono.z) > 1.5, "Zeus no tapa la diana");
    assert.ok(n3.voz && n3.voz.length > 10);
    const salida = { x: 0, z: 1.55 };
    const g3 = { salida: salida, cono: n3.cono, anguloCono: 0, alto: ALTO };
    // apuntando bien acierta desde los tres anillos
    [-1.3, 0, 1.3].forEach(function (x) {
        const g = { salida: { x: x, z: 1.55 }, cono: n3.cono, anguloCono: 0, alto: ALTO };
        assert.ok(R.evaluar(gesto(0, -260, 280), g, cfg, 0).acierto, "anillo en x=" + x);
    });
    // un desvío de ≈ 30° que en el nivel 2 todavía entra, en el 3 falla
    const g2 = { salida: salida, cono: n2.cono, anguloCono: 0, alto: ALTO };
    const lado = gesto(Math.sin(0.52) * 240, -Math.cos(0.52) * 240, 260);
    assert.ok(R.evaluar(lado, g2, cfg, 0).acierto, "nivel 2");
    assert.ok(!R.evaluar(lado, g3, cfg, 0).acierto, "nivel 3");
    // tras varios fallos la zona de recepción crece y ese mismo gesto ya entra
    assert.ok(R.evaluar(lado, g3, cfg, 4).acierto, "nivel 3 con ayuda por fallos");
});

prueba("progreso con tres indicadores", function () {
    assert.deepStrictEqual(R.progreso(0, 3).marcas, [false, false, false]);
    assert.deepStrictEqual(R.progreso(2, 3).marcas, [true, true, false]);
    assert.ok(R.progreso(3, 3).completo);
    assert.strictEqual(R.progreso(9, 3).hechas, 3);
    assert.strictEqual(R.pendiente(cfg.anillos, ["rojo"]), "azul");
    assert.strictEqual(R.pendiente(cfg.anillos, ["rojo", "azul", "amarillo"]), null);
});

prueba("el título no está dentro de la partida y hay controles en su lugar", function () {
    const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
    assert.ok(/id="intro-titulo"/.test(html));
    assert.ok(!/class="hud-titulo"/.test(html));
    ["btn-menu-acc", "btn-menu-vol", "hud-progreso", "hud-nivel", "hud-edad", "btn-comenzar"].forEach(function (id) {
        assert.ok(html.indexOf('id="' + id + '"') >= 0, "falta " + id);
    });
    assert.ok(/location\.reload\(\)/.test(html) && /history\.back\(\)/.test(html));
    assert.ok(fs.existsSync(path.join(dir, "lanzador-anillos.png")), "falta el ícono");
});

console.log((ok === total ? "✓ " : "✗ ") + ok + "/" + total + " pruebas");
process.exit(ok === total ? 0 : 1);
