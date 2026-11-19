/**
 * Pruebas de las reglas de "La Pista de Gravedad y Trampolines" (node scripts/probar-pista-gravedad-trampolines.js).
 * Construye las tres pistas y la de la demo, las valida y las recorre con un piloto automático que sigue la ruta:
 * tiene que llegar a la meta sin caer. También prueba agujeros, bordes, muros, rampas y saltos.
 */
const path = require("path");
const fs = require("fs");
const R = require(path.join(__dirname, "../public/catalogo_juegos/Polimotor/PistaGravedadTrampolines/reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/catalogo_juegos/Polimotor/PistaGravedadTrampolines/config.json"), "utf8"));

let ok = 0, mal = 0;
function prueba(nombre, cond, extra) {
    if (cond) ok++;
    else {
        mal++;
        console.log("FALLA:", nombre, extra || "");
    }
}

function simular(P, maxT) {
    const e = R.nuevoEstado(P);
    let t = 0, caidas = 0, saltos = 0, paredes = 0, meta = false, vmax = 0;
    const dt = 1 / 60;
    while (t < (maxT || 120)) {
        const obj = R.puntoAdelante(P, e.x, e.z, 2.2);
        const ev = R.paso(P, e, { modo: "punto", x: obj.x, z: obj.z, factor: 0.8 }, dt);
        vmax = Math.max(vmax, Math.hypot(e.vx, e.vz));
        if (ev.pared) paredes++;
        if (ev.agujero) {
            caidas++;
            const s = P.seguros[e.seguro];
            Object.assign(e, { x: s.x, z: s.z, h: s.h, vx: 0, vz: 0 });
        }
        if (ev.trampolin) {
            const tr = R.trampolin(P, ev.trampolin);
            saltos++;
            Object.assign(e, { x: tr.destino.x, z: tr.destino.z, h: tr.destino.h, vx: 0, vz: 0 });
        }
        if (ev.meta) { meta = true; break; }
        t += dt;
    }
    return { meta, t, caidas, saltos, paredes, vmax, seguro: e.seguro };
}

const todas = cfg.pistas.concat([cfg.demoPista]);
todas.forEach(function (def) {
    const P = R.construir(def, cfg.juego);
    const err = R.validar(P);
    prueba(def.id + ": validación", err.length === 0, err.join(" | "));
    prueba(def.id + ": tiene meta", !!P.meta);
    prueba(def.id + ": ruta larga", P.ruta.length > 5, P.ruta.length);
    const sim = simular(P, 150);
    prueba(def.id + ": el piloto llega a la meta", sim.meta, JSON.stringify(sim));
    prueba(def.id + ": sin caídas del piloto", sim.caidas === 0, sim.caidas);
    prueba(def.id + ": usa todos los trampolines", sim.saltos === P.trampolines.length, sim.saltos + "/" + P.trampolines.length);
    prueba(def.id + ": pasa por todos los puntos seguros", sim.seguro === P.seguros.length - 1, sim.seguro + "/" + (P.seguros.length - 1));
    prueba(def.id + ": velocidad moderada", sim.vmax < 6, sim.vmax);
    console.log(def.id, "piezas", P.piezas.length, "agujeros", P.agujeros.length, "trampolines", P.trampolines.length,
        "seguros", P.seguros.length, "largo", P.largo.toFixed(1), "tiempo piloto", sim.t.toFixed(1) + " s");
});

// contenido pedido: el gran laberinto tiene dos agujeros y dos trampolines
const P3 = R.construir(cfg.pistas[2], cfg.juego);
prueba("pista3: dos agujeros", P3.agujeros.length === 2);
prueba("pista3: dos trampolines", P3.trampolines.length === 2);
prueba("pista3: dos muros", P3.muros.length === 2);
prueba("pista3: hay rampa que baja y rampa que sube", P3.piezas.some(p => p.h1 < p.h0) && P3.piezas.some(p => p.h1 > p.h0));
prueba("pista3: hay puente estrecho", P3.piezas.some(p => p.puente));
prueba("pista3: hay curvas a los dos lados", P3.piezas.some(p => p.tipo === "curva" && p.alfa > 0) && P3.piezas.some(p => p.tipo === "curva" && p.alfa < 0));
prueba("pista3: el segundo trampolín cambia de nivel", P3.trampolines[1].destino.h > P3.trampolines[1].h + 1);
prueba("progresión: la pista crece", cfg.pistas.map(d => R.construir(d, cfg.juego).largo).every((l, i, a) => i === 0 || l > a[i - 1]));

// agujero: rodar directo hacia él hace caer
(function () {
    const P = R.construir(cfg.demoPista, cfg.juego);
    const A = P.agujeros[0];
    const e = R.nuevoEstado(P);
    let cayo = false, aviso = false;
    for (let i = 0; i < 900 && !cayo; i++) {
        const ev = R.paso(P, e, { modo: "punto", x: A.x, z: A.z }, 1 / 60);
        if (ev.cerca) aviso = true;
        if (ev.agujero) cayo = true;
    }
    prueba("agujero: avisa antes de caer", aviso);
    prueba("agujero: detecta la caída", cayo);
})();

// borde: empujar hacia afuera no saca la esfera de la pista
(function () {
    const P = R.construir(cfg.pistas[0], cfg.juego);
    const e = R.nuevoEstado(P);
    let pared = false;
    for (let i = 0; i < 600; i++) {
        const ev = R.paso(P, e, { modo: "punto", x: e.x, z: e.z + 20 }, 1 / 60);
        if (ev.pared) pared = true;
    }
    prueba("borde: choca con la baranda", pared);
    prueba("borde: sigue sobre la pista", !!R.valida(P, e.x, e.z, e.h));
})();

// muro: sin trampolín no se cruza el vacío
(function () {
    const P = R.construir(cfg.demoPista, cfg.juego);
    const tr = P.trampolines[0];
    const e = R.nuevoEstado(P, { x: tr.x, z: tr.z + 1.4, h: tr.h });
    e.z = tr.z + 1.4;
    const d = tr.destino;
    let llego = false;
    for (let i = 0; i < 900; i++) {
        // apunta al aterrizaje esquivando el trampolín por el costado
        R.paso(P, e, { modo: "punto", x: d.x, z: tr.z + 1.5 }, 1 / 60);
        if (Math.abs(e.h - d.h) < 0.1 && e.x > tr.x + 2.5) llego = true;
    }
    prueba("muro: no se pasa rodando", !llego, JSON.stringify(e));
})();

// rampa: suelta en una rampa, la esfera baja sola; y se puede subir
(function () {
    const P = R.construir(cfg.pistas[0], cfg.juego);
    const rampa = P.piezas[1];
    const d = R.dirDe(rampa.th);
    const e = R.nuevoEstado(P, { x: rampa.ox + d.x * 2.5, z: rampa.oz + d.z * 2.5, h: rampa.h0 + (rampa.h1 - rampa.h0) / 2 });
    const h0 = e.h;
    for (let i = 0; i < 60; i++) R.paso(P, e, null, 1 / 60);
    prueba("rampa: suelta, baja sola", e.h < h0 - 0.05, h0 + " → " + e.h);
    const e2 = R.nuevoEstado(P, { x: rampa.ox + d.x * 4.5, z: rampa.oz + d.z * 4.5, h: rampa.h0 + (rampa.h1 - rampa.h0) * 0.9 });
    const hA = e2.h;
    for (let i = 0; i < 240; i++) R.paso(P, e2, { modo: "punto", x: rampa.ox - d.x * 1, z: rampa.oz }, 1 / 60);
    prueba("rampa: empujando, sube", e2.h > hA + 0.6, hA + " → " + e2.h);
})();

// teclado: se mueve en las cuatro direcciones y en diagonal
(function () {
    const P = R.construir(cfg.pistas[0], cfg.juego);
    [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].forEach(function (dd) {
        const e = R.nuevoEstado(P);
        const x0 = e.x, z0 = e.z;
        for (let i = 0; i < 20; i++) R.paso(P, e, { modo: "dir", dx: dd[0], dz: dd[1] }, 1 / 60);
        const mx = (e.x - x0) * dd[0] >= 0 && (e.z - z0) * dd[1] >= 0 && Math.hypot(e.x - x0, e.z - z0) > 0.1;
        prueba("dirección " + dd.join(","), mx, [e.x - x0, e.z - z0].join(","));
    });
})();

// salto: parábola por encima del muro y aterrizaje exacto
(function () {
    P3.trampolines.forEach(function (tr) {
        const m = P3.muros.filter(x => x.id === tr.muroId)[0];
        const medio = R.puntoSalto(tr, 0.5);
        prueba("salto " + tr.id + ": pasa sobre el muro", medio.h > m.hTop + 0.3, medio.h + " vs " + m.hTop);
        const fin = R.puntoSalto(tr, 1);
        prueba("salto " + tr.id + ": aterriza en el destino", Math.hypot(fin.x - tr.destino.x, fin.z - tr.destino.z) < 1e-6 && Math.abs(fin.h - tr.destino.h) < 1e-6);
    });
})();

// recorridos al azar: 60 partidas con semillas distintas
(function () {
    const firmas = new Set();
    let respaldos = 0;
    for (let s = 1; s <= 60; s++) {
        const ps = R.generarPartida(cfg.pistas, cfg.juego, R.azar(s * 7919));
        ps.forEach(function (P) { if (!P.azar) respaldos++; });
        firmas.add(JSON.stringify(ps.map(p => p.tramosDef)));
        prueba("azar " + s + ": cada recorrido más largo", ps.every((p, i) => i === 0 || p.largo > ps[i - 1].largo), ps.map(p => p.largo.toFixed(1)).join("/"));
        ps.forEach(function (P, i) {
            const A = cfg.pistas[i].aleatorio;
            prueba("azar " + s + " nivel " + (i + 1) + ": validación", R.validar(P).length === 0, R.validar(P).join(" | "));
            prueba("azar " + s + " nivel " + (i + 1) + ": agujeros", P.agujeros.length === A.agujeros, P.agujeros.length);
            prueba("azar " + s + " nivel " + (i + 1) + ": trampolines", P.trampolines.length === A.trampolines + A.cambiosNivel, P.trampolines.length);
            const r = R.recorrer(P, 160);
            prueba("azar " + s + " nivel " + (i + 1) + ": se puede completar", r.meta && !r.caidas && r.saltos === P.trampolines.length, JSON.stringify(r));
        });
        prueba("azar " + s + ": el nivel 3 cambia de altura con un trampolín", ps[2].trampolines.some(t => t.destino.h > t.h + 1));
    }
    prueba("azar: no usa la pista de respaldo", respaldos === 0, respaldos);
    prueba("azar: las partidas son distintas", firmas.size === 60, firmas.size);
    const a = R.generarPartida(cfg.pistas, cfg.juego, R.azar(42)).map(p => p.largo);
    const b = R.generarPartida(cfg.pistas, cfg.juego, R.azar(42)).map(p => p.largo);
    prueba("azar: la misma semilla da la misma partida", JSON.stringify(a) === JSON.stringify(b));
})();

console.log(ok + "/" + (ok + mal) + " pruebas bien");
process.exit(mal ? 1 : 0);
