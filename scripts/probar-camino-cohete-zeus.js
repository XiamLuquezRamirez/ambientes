/**
 * Prueba de node de "¡El Camino del Cohete de Zeus!" (Polimotor, 3-4 años, laberintos de coordinación).
 *   node scripts/probar-camino-cohete-zeus.js
 * Comprueba: config.json, textos literales del enunciado, el generador procedural (muchas partidas y varios
 * altos de pantalla), el pilotaje (seguir la pista llega a la meta; atajar no; un ramal falso termina en
 * callejón; salirse tiene un límite) y que los dibujos pedidos existan en iconos.js.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "CaminoCoheteZeus");
const R = require(path.join(dir, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));

let fallos = 0;
let pruebas = 0;
function ok(cond, msg) {
    pruebas++;
    if (!cond) {
        fallos++;
        console.log("  ✗ " + msg);
    }
}

// ------------------------------------------------------------------ config y textos
const T = cfg.textos;
ok(cfg.recorridos.length === 4, "hay 4 recorridos");
ok(cfg.niveles[0].edad === "3-4 años", "edad 3-4 años en niveles");
const literales = {
    bienvenidaZeus: "¡Preparados para el despegue! Ayúdame a llevar mi cohete hasta la base espacial. Sigue los caminos luminosos con tu dedo y completa los cuatro recorridos.",
    demoFin: "¡Mira cómo se hace! Sigue el camino de luces sin salirte de la pista. ¡Ahora es tu turno!",
    callejon: "¡Por aquí no es! Vamos a regresar y buscar las estrellas.",
    pista: "¡Busca el camino que tiene más luces!",
    finalTitulo: "¡MISIÓN ESPACIAL COMPLETADA!",
    finalZoe: "¡Lo lograste! ¡Guiaste el cohete por los cuatro caminos espaciales y llegaste a nuestra base!",
    finalZeus: "¡Eres un súper piloto! ¡Completaste toda la misión con mucha coordinación y precisión!",
    botonOtraVez: "¡JUGAR OTRA VEZ!"
};
Object.keys(literales).forEach(function (k) { ok(T[k] === literales[k], "texto literal " + k); });
const voces = [
    ["zoe", "¡Vamos a despegar! Sigue las luces hasta la estación lunar.", "¡Primer viaje completado!"],
    ["zeus", "¡Muy bien! Ahora tenemos un camino con más curvas. ¡Sigue las estrellas!", "¡Cada vez eres mejor piloto!"],
    ["zoe", "¡Excelente piloto! Mira bien por dónde debes pasar. ¡No pierdas el camino luminoso!", "¡Ya casi llegamos!"],
    ["zeus", "¡Último desafío! Ya casi llegamos a nuestra base espacial. ¡Guía el cohete hasta la meta!", "¡Lo lograste! ¡Vamos a la base!"]
];
cfg.recorridos.forEach(function (r, i) {
    ok(r.voz === voces[i][0], "voz del recorrido " + (i + 1));
    ok(r.instruccion === voces[i][1], "instrucción literal del recorrido " + (i + 1));
    ok(r.logro === voces[i][2], "logro literal del recorrido " + (i + 1));
});
ok(cfg.recorridos[0].falsos[1] === 1 && cfg.recorridos[1].falsos[0] === 2 && cfg.recorridos[3].falsos[1] <= 3, "caminos falsos 1 / 2 / 2-3 / hasta 3");

// ------------------------------------------------------------------ generador
const cfgJ = cfg.juego;
const altos = [800, 950, 1200, 1500];
let partidas = 0, progresivas = 0, distintas = 0;
const t0 = Date.now();
for (let n = 0; n < 160; n++) {
    const H = altos[n % altos.length];
    // cada tercera partida: tableta en vertical (mundo más angosto y alto)
    const dims = n % 3 === 2 ? { W: Math.round(cfgJ.anchoMundo * 0.72), H: Math.max(1100, H) } : { W: cfgJ.anchoMundo, H: H };
    const p = R.generarPartida(cfg, dims, 1000 + n * 7919, { paso: cfgJ.paso });
    partidas++;
    ok(p.recorridos.length === 4 && p.recorridos.every(Boolean), "partida " + n + " con 4 recorridos");
    if (!p.recorridos.every(Boolean)) continue;
    p.recorridos.forEach(function (rec, k) {
        const def = cfg.recorridos[k];
        // tabla del enunciado: 1 / 2 / 2-3 / hasta 3 (el 4 pide 3 y, en pantallas con pocas celdas, acepta 2)
        const tabla = [[1, 1], [2, 2], [2, 3], [2, 3]][k];
        ok(rec.falsos.length >= tabla[0] && rec.falsos.length <= tabla[1], "partida " + n + " r" + (k + 1) + " cantidad de falsos " + rec.falsos.length);
        const errs = R.revisarRecorrido(rec);
        ok(!errs.length, "partida " + n + " r" + (k + 1) + " válido: " + errs.join(", "));
    });
    const L = p.recorridos.map(function (r) { return r.largo; });
    if (L[1] >= L[0] && L[2] >= L[1] && L[3] >= L[2]) progresivas++;
    const firmas = new Set(p.recorridos.map(function (r) { return Math.round(r.principal[10].y) + ":" + Math.round(r.largo); }));
    if (firmas.size === 4) distintas++;
}
const ms = Date.now() - t0;
ok(distintas === partidas, "los 4 recorridos de cada partida son distintos (" + distintas + "/" + partidas + ")");
ok(progresivas >= partidas * 0.9, "el largo crece de un recorrido al siguiente en casi todas las partidas (" + progresivas + "/" + partidas + ")");
ok(ms / partidas < 400, "generar una partida tarda poco (" + Math.round(ms / partidas) + " ms)");

// Partidas con semillas distintas no se repiten
const a = R.generarPartida(cfg, { W: 1600, H: 900 }, 1, { paso: 8 });
const b = R.generarPartida(cfg, { W: 1600, H: 900 }, 2, { paso: 8 });
ok(Math.round(a.recorridos[0].largo) !== Math.round(b.recorridos[0].largo) || a.recorridos[0].principal[20].y !== b.recorridos[0].principal[20].y, "semillas distintas dan partidas distintas");
const a2 = R.generarPartida(cfg, { W: 1600, H: 900 }, 1, { paso: 8 });
ok(a2.recorridos[3].largo === a.recorridos[3].largo, "la misma semilla repite la partida");

// ------------------------------------------------------------------ pilotaje
function piloto(rec) {
    return { x: rec.inicio.x, y: rec.inicio.y, nodo: { rama: -1, i: 0 } };
}

for (let n = 0; n < 40; n++) {
    const p = R.generarPartida(cfg, n % 3 === 2 ? { W: 1152, H: 1250 } : { W: 1600, H: altos[n % 4] }, 500 + n * 31, { paso: 8 });
    p.recorridos.forEach(function (rec, k) {
        // 1) seguir el centro de la pista con el dedo → llega a la meta
        let st = piloto(rec);
        let avance = 0, meta = false;
        for (let i = 0; i < rec.principal.length && !meta; i += 3) {
            const q = rec.principal[i];
            const r = R.mover(rec, st, { x: q.x + 10, y: q.y - 8 }, 60, cfgJ);
            st = r;
            if (r.nodo.rama < 0) avance = Math.max(avance, r.nodo.i);
            if (R.enMeta(rec, r.nodo)) meta = true;
        }
        ok(meta, "partida " + n + " r" + (k + 1) + ": siguiendo la pista se llega a la meta");

        // 2) arrastrar en línea recta del inicio a la meta → no llega
        st = piloto(rec);
        let llego = false;
        for (let u = 0; u <= 1.0001; u += 0.01) {
            const q = { x: rec.inicio.x + (rec.meta.x - rec.inicio.x) * u, y: rec.inicio.y + (rec.meta.y - rec.inicio.y) * u };
            st = R.mover(rec, st, q, 60, cfgJ);
            if (R.enMeta(rec, st.nodo)) llego = true;
        }
        ok(!llego, "partida " + n + " r" + (k + 1) + ": no se puede atajar a la meta");

        // 3) un salto directo del dedo a la meta tampoco (si la recta se sale de la pista)
        const limR = R.limites(rec, cfgJ);
        let recta = true;
        for (let u = 0; u <= 1; u += 0.02) {
            const q = { x: rec.inicio.x + (rec.meta.x - rec.inicio.x) * u, y: rec.inicio.y + (rec.meta.y - rec.inicio.y) * u };
            let md = Infinity;
            rec.principal.forEach(function (p) { md = Math.min(md, Math.hypot(p.x - q.x, p.y - q.y)); });
            if (md > limR.fuera) recta = false;
        }
        if (!recta) {
            st = R.mover(rec, piloto(rec), rec.meta, 100000, cfgJ);
            ok(!R.enMeta(rec, st.nodo), "partida " + n + " r" + (k + 1) + ": saltar a la meta no funciona");
        }

        // 4) entrar a un camino falso termina en callejón
        const f = rec.falsos[0];
        st = piloto(rec);
        for (let i = 0; i <= f.raiz; i += 3) st = R.mover(rec, st, rec.principal[i], 60, cfgJ);
        let callejon = false;
        for (let j = 0; j < f.pts.length && !callejon; j += 2) {
            st = R.mover(rec, st, f.pts[j], 60, cfgJ);
            if (R.enCallejon(rec, st.nodo)) callejon = true;
        }
        ok(callejon, "partida " + n + " r" + (k + 1) + ": el camino falso termina en callejón");

        // 5) salirse: hay franja de alerta y un límite que no se pasa
        st = piloto(rec);
        for (let i = 0; i <= 30; i += 3) st = R.mover(rec, st, rec.principal[i], 60, cfgJ);
        const lim = R.limites(rec, cfgJ);
        const q = rec.principal[30];
        const q2 = rec.principal[32];
        const tl = Math.hypot(q2.x - q.x, q2.y - q.y) || 1;
        const nrm = { x: -(q2.y - q.y) / tl, y: (q2.x - q.x) / tl };
        const zonas = [1, -1].map(function (sg) {
            return R.mover(rec, st, { x: q.x + sg * nrm.x * (lim.pista + 12), y: q.y + sg * nrm.y * (lim.pista + 12) }, 400, cfgJ).zona;
        });
        ok(zonas.some(function (z) { return z === "fuera" || z === "limite"; }), "partida " + n + " r" + (k + 1) + ": fuera de la pista avisa (" + zonas.join("/") + ")");
        const lejos = R.mover(rec, st, { x: q.x + nrm.x * 2000, y: q.y + nrm.y * 2000 }, 4000, cfgJ);
        ok(lejos.zona === "limite" && lejos.d <= lim.fuera + 0.5, "partida " + n + " r" + (k + 1) + ": no puede salirse del todo");
    });
}

// ------------------------------------------------------------------ dibujos
const iconos = fs.readFileSync(path.join(dir, "iconos.js"), "utf8");
["cohete", "llama", "estacion", "luna", "plataforma", "planetaAnillo", "planetaRayas", "planetaLava", "asteroide", "estrella"].forEach(function (k) {
    ok(new RegExp("\\b" + k + "\\s*:").test(iconos), "iconos.js dibuja " + k);
});

console.log((fallos ? "✗ " : "✓ ") + (pruebas - fallos) + "/" + pruebas + " comprobaciones correctas" + (fallos ? " — " + fallos + " fallos" : ""));
process.exit(fallos ? 1 : 0);
