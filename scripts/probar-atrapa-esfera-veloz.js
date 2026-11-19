/**
 * Prueba de "¡Atrapa la Esfera Veloz!": reglas puras, config válido, trayectorias con rebotes en los espejos que
 * cruzan el anillo,
 * ventana de captura amplia y creciente en dificultad, toques temprano / acierto / tarde, ayuda adaptativa,
 * esferas siempre visibles (nunca detrás del marco del anillo), textos literales del enunciado y botones comunes.
 *   node scripts/probar-atrapa-esfera-veloz.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "AtrapaEsferaVeloz");
const R = require(path.join(dir, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const escena = fs.readFileSync(path.join(dir, "escena-tunel.js"), "utf8");

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

function trayectorias() {
    const lista = [];
    for (let i = 0; i < R.totalRondas(cfg); i++) {
        const r = R.ronda(cfg, i);
        r.esferas.forEach(function (e) {
            lista.push({ ronda: i, e: e, rad: r.radioEsfera, aro: r.radioAnillo, tr: R.trayectoria(cfg, e, { velocidad: r.velocidad, tolerancia: r.tolerancia, radioCaptura: r.radioCaptura }) });
        });
    }
    [["presentacion", cfg.presentacion], ["demo", cfg.demo]].forEach(function (p) {
        const b = p[1];
        lista.push({ ronda: p[0], e: b.esfera, rad: b.radioEsfera, aro: cfg.juego.radioAnillo, tr: R.trayectoria(cfg, b.esfera, { velocidad: b.velocidad, tolerancia: b.tolerancia }) });
    });
    return lista;
}

prueba("config sin problemas", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
});

prueba("3 rondas de 4 esferas (12 capturas en total)", function () {
    assert.strictEqual(R.totalRondas(cfg), 3);
    assert.strictEqual(R.capturasPorRonda(cfg), 4);
    assert.strictEqual(R.totalCapturas(cfg), 12);
    for (let i = 0; i < 3; i++) assert.ok(R.ronda(cfg, i).esferas.length >= 4);
});

prueba("la dificultad sube suave: más velocidad, esferas algo más pequeñas, ventana más corta pero amplia", function () {
    const rs = [0, 1, 2].map(function (i) { return R.ronda(cfg, i); });
    assert.ok(rs[0].velocidad < rs[1].velocidad && rs[1].velocidad < rs[2].velocidad);
    assert.ok(rs[0].radioEsfera >= rs[1].radioEsfera && rs[1].radioEsfera >= rs[2].radioEsfera);
    assert.ok(rs[2].velocidad / rs[0].velocidad < 1.75, "salto de velocidad demasiado grande");
    const v = rs.map(function (r) { return R.trayectoria(cfg, r.esferas[0], { velocidad: r.velocidad, tolerancia: r.tolerancia, radioCaptura: r.radioCaptura }).ventana; });
    assert.ok(v[0] > v[1] && v[1] > v[2]);
    assert.ok(v[2] * 2 >= 0.9, "la ventana total de la ronda 3 debe ser de casi un segundo o más");
    assert.ok(v[0] * 2 >= 1.4, "la ronda 1 debe ser muy generosa");
});

prueba("el aro se achica en cada ronda y la esfera sigue cabiendo con holgura", function () {
    const rs = [0, 1, 2].map(function (i) { return R.ronda(cfg, i); });
    assert.strictEqual(rs[0].radioAnillo, cfg.juego.radioAnillo);
    assert.ok(rs[0].radioAnillo > rs[1].radioAnillo && rs[1].radioAnillo > rs[2].radioAnillo);
    assert.ok(rs[2].radioAnillo / rs[0].radioAnillo >= 0.7, "no achicar más de un 30 %");
    rs.forEach(function (r) {
        assert.ok(Math.abs(r.radioCaptura / r.radioAnillo - cfg.juego.radioCaptura / cfg.juego.radioAnillo) < 1e-9);
        assert.ok(r.radioEsfera * 2 < r.radioAnillo * 0.75);
    });
    assert.ok(/tamanoAnillo\(cfgR\(\)\.radioAnillo\)/.test(fs.readFileSync(path.join(dir, "script.js"), "utf8")));
});

prueba("la guía 3D sale al azar: Zoe o Zeus", function () {
    const sc = fs.readFileSync(path.join(dir, "script.js"), "utf8");
    const g3 = fs.readFileSync(path.join(dir, "guia-3d.js"), "utf8");
    assert.ok(/window\.GUIA_PERSONAJE = Math\.random\(\) < 0\.5 \? "zeus" : "zoe"/.test(sc));
    assert.ok(/nino\.glb/.test(g3) && /nina\.glb/.test(g3) && /GUIA_PERSONAJE/.test(g3));
    assert.ok(!/decir\(textos\(\)\.introZoe, "zoe"/.test(sc), "la instrucción la da la guía elegida");
});

prueba("dos tuberías (una por lado) y dos espejos laterales", function () {
    assert.strictEqual(cfg.tubos.length, 2);
    assert.strictEqual(cfg.espejos.length, 2);
    assert.ok(cfg.tubos[0].boca[0] * cfg.tubos[1].boca[0] < 0);
    assert.ok(cfg.espejos[0].x * cfg.espejos[1].x < 0);
});

prueba("progresión de rebotes: ronda 1 directas y 1 rebote, ronda 2 con 1 rebote, ronda 3 con hasta 2", function () {
    const reb = [0, 1, 2].map(function (i) { return R.ronda(cfg, i).esferas.map(function (e) { return (e.rebotes || []).length; }); });
    assert.deepStrictEqual(reb[0].slice(0, 2), [0, 0]);
    assert.ok(Math.max.apply(null, reb[0]) === 1);
    assert.ok(reb[1].every(function (n) { return n === 1; }));
    assert.ok(Math.max.apply(null, reb[2]) === 2);
});

prueba("rondas 2 y 3: las dos tuberías, alturas alternadas y varios colores", function () {
    [1, 2].forEach(function (i) {
        const es = R.ronda(cfg, i).esferas;
        assert.strictEqual(new Set(es.map(function (e) { return e.tubo; })).size, 2);
        assert.ok(new Set(es.map(function (e) { return e.color; })).size >= 4);
    });
    const alturas = R.ronda(cfg, 2).esferas.map(function (e) { return Math.sign(e.altura); });
    assert.ok(alturas.indexOf(1) >= 0 && alturas.indexOf(-1) >= 0);
});

prueba("cada esfera sale de su tubería, rebota en sus espejos, cruza el centro del anillo y sale de la pantalla", function () {
    trayectorias().forEach(function (x) {
        const tr = x.tr;
        const ini = tr.en(0), boca = R.tubo(cfg, x.e.tubo).boca;
        assert.ok(Math.abs(ini.x - boca[0]) < 1e-6 && Math.abs(ini.y - boca[1]) < 1e-6);
        assert.strictEqual(tr.rebotes.length, (x.e.rebotes || []).length);
        tr.rebotes.forEach(function (rb, i) {
            const p = tr.en(rb.t), es = R.espejo(cfg, rb.espejo);
            assert.strictEqual(rb.espejo, x.e.rebotes[i].espejo);
            assert.ok(Math.abs(p.x - es.x) < 1e-3, "toca el espejo");
        });
        assert.ok(R.distanciaAlEje(tr.en(tr.tc)) < 0.6);
        assert.ok(tr.tFin > tr.tc + tr.ventana + 0.5, "debe seguir después de la ventana (para el toque tardío)");
        assert.ok(Math.abs(tr.en(tr.tFin).x) > 8, "sale por un lado");
    });
});

prueba("rebote real: ángulo de entrada = ángulo de salida en cada espejo", function () {
    trayectorias().forEach(function (x) {
        const tr = x.tr, h = 0.002;
        tr.rebotes.forEach(function (rb) {
            const a = tr.en(rb.t - h), b = tr.en(rb.t), c = tr.en(rb.t + h);
            const vin = [b.x - a.x, b.y - a.y, b.z - a.z], vout = [c.x - b.x, c.y - b.y, c.z - b.z];
            const n = function (v) { const l = Math.hypot(v[0], v[1], v[2]); return v.map(function (k) { return k / l; }); };
            const i = n(vin), o = n(vout);
            assert.ok(Math.sign(i[0]) === -Math.sign(o[0]), "cambia de sentido en X");
            assert.ok(Math.abs(i[0] + o[0]) < 0.05 && Math.abs(i[1] - o[1]) < 0.05 && Math.abs(i[2] - o[2]) < 0.05, "reflexión");
        });
    });
});

prueba("solo se ve dentro del aro en el tramo final, y siempre a la vista antes del anillo", function () {
    const pr = function (p) { const d = 10 - p.z; return [p.x / d, (p.y - 0.6) / d + 0.06]; };
    trayectorias().forEach(function (x) {
        const tr = x.tr, ka = x.aro / cfg.juego.radioAnillo;
        const tUlt = tr.rebotes.length ? tr.rebotes[tr.rebotes.length - 1].t : 0.6;
        for (let k = 0; k <= 400; k++) {
            const t = tr.tFin * k / 400, p = tr.en(t), q = pr(p), rr = Math.hypot(q[0], q[1]), rs = x.rad / (10 - p.z);
            if (t < tUlt) assert.ok(rr - rs >= 0.30 * ka, "se ve dentro del aro antes de tiempo (" + x.ronda + ", " + x.e.tubo + ")");
            if (t <= tr.tc) assert.ok(Math.abs(q[0]) <= 0.8 && Math.abs(q[1]) <= 0.43, "se sale del cuadro");
        }
    });
});

prueba("velocidad constante por tramo: más rápida antes del último espejo, la de la ronda en el tramo final", function () {
    trayectorias().forEach(function (x) {
        const tr = x.tr, dt = 0.01;
        const tUlt = tr.rebotes.length ? tr.rebotes[tr.rebotes.length - 1].t : 0;
        const va = tr.velocidad * (cfg.juego.velocidadAntes || 1);
        for (let t = dt; t < tr.tFin; t += dt) {
            if (Math.abs(t - tUlt) < 0.03 || (tr.rebotes.some(function (r) { return Math.abs(t - r.t) < 0.03; }))) continue;
            const a = tr.en(t - dt), b = tr.en(t);
            const v = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / dt;
            const esperada = t < tUlt ? va : tr.velocidad;
            assert.ok(Math.abs(v / esperada - 1) < 0.08, "velocidad " + v.toFixed(2) + " ≠ " + esperada.toFixed(2));
        }
    });
});

prueba("la ventana coincide con la esfera dentro del anillo", function () {
    trayectorias().forEach(function (x) {
        const rA = x.aro;
        const tr = x.tr;
        const a = tr.en(tr.tc - tr.ventana), b = tr.en(tr.tc + tr.ventana);
        const c = tr.en(tr.tc);
        const da = Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z), db = Math.hypot(b.x - c.x, b.y - c.y, b.z - c.z);
        assert.ok(da < rA + 0.3 && db < rA + 0.3, "la ventana se sale del anillo");
        assert.ok(da > 1 && db > 1, "ventana demasiado estrecha");
    });
});

prueba("evaluarToque: temprano, acierto y tarde", function () {
    const tr = trayectorias()[0].tr;
    assert.strictEqual(R.evaluarToque(0.2, tr), "temprano");
    assert.strictEqual(R.evaluarToque(tr.tc - tr.ventana - 0.01, tr), "temprano");
    assert.strictEqual(R.evaluarToque(tr.tc - tr.ventana + 0.01, tr), "acierto");
    assert.strictEqual(R.evaluarToque(tr.tc, tr), "acierto");
    assert.strictEqual(R.evaluarToque(tr.tc + tr.ventana - 0.01, tr), "acierto");
    assert.strictEqual(R.evaluarToque(tr.tc + tr.ventana + 0.01, tr), "tarde");
    assert.strictEqual(R.evaluarToque(null, null), "temprano");
});

prueba("fases del anillo: espera → preparación → captura → paso, con anticipación gradual", function () {
    const tr = trayectorias()[0].tr, prep = cfg.juego.preparacionS;
    assert.strictEqual(R.faseAnillo(0, tr, prep), "espera");
    assert.strictEqual(R.faseAnillo(tr.tc - tr.ventana - prep / 2, tr, prep), "preparacion");
    assert.strictEqual(R.faseAnillo(tr.tc, tr, prep), "captura");
    assert.strictEqual(R.faseAnillo(tr.tc + tr.ventana + 0.1, tr, prep), "paso");
    const a1 = R.anticipacion(tr.tc - tr.ventana - prep * 0.8, tr, prep);
    const a2 = R.anticipacion(tr.tc - tr.ventana - prep * 0.2, tr, prep);
    assert.ok(a1 < a2 && a2 < 1);
});

prueba("ayuda adaptativa: tras fallos, más lenta y con ventana más amplia (con tope)", function () {
    const a0 = R.ajuste(cfg, 0), a2 = R.ajuste(cfg, 2), a9 = R.ajuste(cfg, 9);
    assert.strictEqual(a0.velocidad, 1);
    assert.strictEqual(a0.ventanaExtra, 0);
    assert.ok(a2.velocidad < 1 && a2.ventanaExtra > 0);
    assert.deepStrictEqual(a9, R.ajuste(cfg, cfg.juego.ayudaPorFallo.maxFallos));
    assert.ok(a9.velocidad >= 0.6);
});

prueba("las esferas nunca quedan ocultas detrás del marco del anillo", function () {
    // cámara en (0, 0.6, 10) mirando al anillo; el marco ocupa en pantalla ~ radio 0.185–0.285 (tan)
    const pr = function (p) { const d = 10 - p.z; return [p.x / d, (p.y - 0.6) / d + 0.06]; };
    trayectorias().forEach(function (x) {
        const tr = x.tr;
        for (let k = 0; k <= 400; k++) {
            const p = tr.en(tr.tFin * k / 400);
            const q = pr(p);
            const rr = Math.hypot(q[0], q[1]), rs = x.rad / (10 - p.z);
            const ka = x.aro / cfg.juego.radioAnillo;
            const enBanda = rr + rs > 0.185 * ka && rr - rs < 0.285 * ka;
            assert.ok(!(enBanda && p.z - x.rad < 0.35), "esfera tapada por el marco (ronda " + x.ronda + ", " + x.e.tubo + ")");
        }
    });
});

prueba("resumen y estrellas (siempre al menos 1, sin castigo)", function () {
    const h = ["acierto", "temprano", "acierto", "paso", "acierto", "acierto", "tarde", "acierto"];
    const r = R.resumen(h);
    assert.strictEqual(r.capturas, 5);
    assert.strictEqual(r.tempranos, 1);
    assert.strictEqual(r.pasaron, 2);
    assert.strictEqual(r.mejorRacha, 2);
    assert.strictEqual(R.estrellas(r), 3);
    assert.strictEqual(R.estrellas(R.resumen(new Array(20).fill("paso"))), 1);
});

prueba("textos literales del enunciado", function () {
    const t = cfg.textos;
    assert.strictEqual(t.introZoe, "¡Prueba de reflejos veloces! Mira las esferas que cruzan el túnel. Toca cuando una pase por el anillo brillante.");
    assert.strictEqual(t.instruccionZoe, "¡Prueba de reflejos veloces! Mantén tus ojos en el centro y toca cuando la esfera pase dentro del anillo brillante.");
    assert.strictEqual(t.demoZeus, "¡Ojos muy abiertos! Toca cuando la esfera llegue al anillo.");
    assert.strictEqual(t.rondaInicio[0].texto, t.instruccionZoe);
    assert.strictEqual(t.final, "¡REFLEJOS DE SÚPER HÉROE! Tu coordinación ojo-mano es tan rápida como la luz.");
    assert.strictEqual(t.finalZoe + " " + t.finalZeus, t.final);
    ["¡Velocidad pura!", "¡Muy bien!", "¡La atrapaste!", "¡Qué reflejos!", "¡Excelente!", "¡Energía capturada!"].forEach(function (f) { assert.ok(t.acierto.indexOf(f) >= 0, f); });
    ["¡Espera a que llegue la esfera!", "¡Espera a que llegue!", "¡Mira el anillo!", "¡Ya casi!"].forEach(function (f) { assert.ok(t.temprano.indexOf(f) >= 0, f); });
    ["¡Casi! Vamos con la siguiente.", "¡Casi! Vamos otra vez.", "¡Sigue la esfera!", "¡La próxima será tuya!"].forEach(function (f) { assert.ok(t.tarde.indexOf(f) >= 0, f); });
});

prueba("botones comunes de los demás juegos y nada de cartel de edad", function () {
    assert.ok(html.indexOf('onclick="location.reload()" class="btn btn-warning btn-round"') >= 0);
    assert.ok(html.indexOf('onclick="history.back()" class="btn btn-danger btn-round"') >= 0);
    assert.ok(html.indexOf('id="btn-menu-acc" class="menu-acc-fab"') >= 0);
    assert.ok(html.indexOf('id="btn-menu-vol" class="menu-acc-fab"') >= 0);
    assert.ok(html.indexOf("../comun/interfaz.css") > html.indexOf("style.css"));
    assert.ok(!/5-6 años/.test(html));
    assert.ok(fs.existsSync(path.join(dir, "atrapa-esfera.png")));
});

prueba("los manómetros de las tuberías no chocan con los espejos", function () {
    const m = escena.match(/reloj\.position\.set\([^,]+,[^,]+,\s*(-?[\d.]+)\)/);
    assert.ok(m, "posición del manómetro");
    const zReloj = Number(m[1]), radio = 0.34;
    cfg.espejos.forEach(function (es) {
        // el marco del espejo ocupa z0 − 0,45 … z1 + 0,45
        assert.ok(zReloj + radio < es.z0 - 0.45 || zReloj - radio > es.z1 + 0.45, "manómetro dentro del espejo " + es.id);
    });
});

prueba("ninguna costilla del túnel atraviesa los espejos", function () {
    assert.ok(/if \(!costillaChocaEspejo\(z\)\) zs\.push\(z\);/.test(escena));
    let quitadas = 0;
    for (let z = 6; z > -60; z -= 5) {
        const choca = cfg.espejos.some(function (es) { return z + 0.3 > es.z0 - 0.45 && z - 0.3 < es.z1 + 0.45; });
        if (choca) quitadas++;
    }
    assert.ok(quitadas >= 1, "la costilla de z = 1 cruza los espejos y debe omitirse");
});

prueba("tableta: lienzo del tamaño de la pantalla, calidad adaptable y sin trabajo oculto", function () {
    const css = fs.readFileSync(path.join(dir, "style.css"), "utf8");
    const guia = fs.readFileSync(path.join(dir, "guia-3d.js"), "utf8");
    assert.ok(/E\.renderer\.setSize\(w, h, true\)/.test(escena), "setSize debe fijar el tamaño CSS (en pantallas 2x se veía al doble)");
    assert.ok(/\.escenario canvas \{[^}]*width: 100% !important; height: 100% !important/.test(css));
    assert.ok(/const NIVELES = \[/.test(escena) && /function medirRendimiento/.test(escena) && /esTableta\(\) \? 1 : 0/.test(escena));
    assert.ok(/Math\.min\(0\.1, dt\)/.test(escena), "con pocos fps la esfera no debe ir en cámara lenta");
    assert.ok(/if \(!document\.body\.classList\.contains\("zoe-grande"\)\) return;/.test(guia), "la guía 3D no se dibuja fuera de escena");
    assert.ok(/MT\.metalOscInst = MT\.metalOsc\.clone\(\)/.test(escena), "materiales propios para las instancias");
});

prueba("escena three.js de verdad, un solo ciclo de render y reservas fijas", function () {
    assert.ok(/import \* as THREE from "three"/.test(escena));
    ["PerspectiveCamera", "WebGLRenderer", "PointLight", "DirectionalLight", "TubeGeometry", "TorusGeometry", "MeshPhysicalMaterial"].forEach(function (k) {
        assert.ok(escena.indexOf(k) >= 0, k);
    });
    assert.strictEqual((escena.match(/setAnimationLoop\(/g) || []).length, 1);
    assert.strictEqual((escena.match(/requestAnimationFrame/g) || []).length, 0);
    assert.ok(/if \(E\.renderer\) return Promise\.resolve\(true\)/.test(escena), "montar debe ser idempotente");
});

console.log(ok + "/" + total + " pruebas correctas");
process.exit(ok === total ? 0 : 1);
