/**
 * Prueba de node de "¡El Viaje del Pez por el Laberinto de Burbujas!" (Polimotor, 3-4 años, laberintos).
 *   node scripts/probar-viaje-pez-laberinto-burbujas.js
 * Comprueba: config.json, textos literales del enunciado, el generador (muchas partidas y varios altos de
 * pantalla, con callejones y lazos), el nado (seguir el camino llega a la meta; atajar no; un callejón termina
 * sin salida; un lazo vuelve a unirse al camino; salirse tiene un límite) y que los dibujos existan.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "ViajePezLaberintoBurbujas");
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
    introZoe: "¡El pececito quiere regresar a su casa de coral! Ayúdalo a nadar por el camino entre las burbujas deslizando tu dedo.",
    demoZeus: "¡Lleva al pececito por el agua, despacio y siguiendo el camino hasta su hogar!",
    finalZoe: "¡EXCELENTE NAVEGADOR! ¡Ayudaste al pececito a recorrer los cuatro caminos y regresar a su hogar! ¡Eres un campeón de la coordinación y la orientación!"
};
Object.keys(literales).forEach(function (k) { ok(T[k] === literales[k], "texto literal " + k); });
["Primeras burbujas", "Entre las algas", "El arrecife escondido", "El gran viaje al coral"].forEach(function (n, i) {
    ok(cfg.recorridos[i].nombre === n, "nombre del recorrido " + (i + 1));
    ok(!!cfg.recorridos[i].instruccion && !!cfg.recorridos[i].logro, "voz e instrucción del recorrido " + (i + 1));
});

// ------------------------------------------------------------------ generador
const cfgJ = cfg.juego;
const altos = [800, 950, 1200, 1500];
// bifurcaciones (callejones + lazos) por recorrido: 1 / 2 / 2-3 / 3 (2 en pantallas chicas)
const tabla = [[1, 1], [2, 2], [2, 3], [2, 3]];
let partidas = 0, progresivas = 0, conLazo = [0, 0, 0, 0];
const t0 = Date.now();
const N = 160;
const muestras = [];
for (let n = 0; n < N; n++) {
    const H = altos[n % altos.length];
    const dims = n % 3 === 2 ? { W: Math.round(cfgJ.anchoMundo * 0.72), H: Math.max(1100, H) } : { W: cfgJ.anchoMundo, H: H };
    const p = R.generarPartida(cfg, dims, 1000 + n * 7919, { paso: cfgJ.paso });
    partidas++;
    ok(p.recorridos.length === 4 && p.recorridos.every(Boolean), "partida " + n + " con 4 recorridos");
    if (!p.recorridos.every(Boolean)) continue;
    p.recorridos.forEach(function (rec, k) {
        const lz = rec.falsos.filter(function (f) { return f.lazo; }).length;
        if (lz) conLazo[k]++;
        const bif = rec.falsos.length;
        ok(bif >= tabla[k][0] && bif <= tabla[k][1], "partida " + n + " r" + (k + 1) + " bifurcaciones " + bif + " (" + JSON.stringify(dims) + ")");
        const errs = R.revisarRecorrido(rec);
        ok(!errs.length, "partida " + n + " r" + (k + 1) + " válido: " + errs.join(", "));
        if (n < 12) muestras.push(rec);
    });
    const L = p.recorridos.map(function (r) { return r.largo; });
    if (L[1] >= L[0] && L[2] >= L[1] && L[3] >= L[2]) progresivas++;
}
const ms = Date.now() - t0;
ok(progresivas >= N * 0.85, "largo progresivo en " + progresivas + "/" + N);
ok(conLazo[0] === 0, "el recorrido 1 no tiene lazo");
ok(conLazo[1] >= N * 0.7, "el recorrido 2 suele tener un lazo (" + conLazo[1] + "/" + N + ")");

// ------------------------------------------------------------------ nado
function nadar(rec, pts, cfgJ) {
    let st = { x: rec.inicio.x, y: rec.inicio.y, nodo: { rama: -1, i: 0 } };
    let maxI = 0, meta = false;
    for (let i = 0; i < pts.length; i++) {
        const res = R.mover(rec, st, pts[i], 60, cfgJ);
        st = { x: res.x, y: res.y, nodo: res.nodo };
        if (res.nodo.rama < 0 && res.zona !== "limite") maxI = Math.max(maxI, res.nodo.i);
        if (R.enMeta(rec, res.nodo) && res.zona !== "limite") meta = true;
    }
    return { st: st, maxI: maxI, meta: meta };
}
muestras.forEach(function (rec, m) {
    // seguir el camino llega
    const seguir = nadar(rec, rec.principal.filter(function (_, i) { return i % 2 === 0; }).concat([rec.meta]), cfgJ);
    ok(seguir.meta, "muestra " + m + ": seguir el camino llega al coral");
    // atajar en línea recta hacia la meta no llega
    const recta = [];
    for (let k = 1; k <= 60; k++) recta.push({ x: rec.inicio.x + (rec.meta.x - rec.inicio.x) * k / 60, y: rec.inicio.y + (rec.meta.y - rec.inicio.y) * k / 60 });
    const atajo = nadar(rec, recta, cfgJ);
    ok(!atajo.meta || rec.principal.length < 40, "muestra " + m + ": atajar no llega");
    rec.falsos.forEach(function (f, k) {
        const hasta = rec.principal.slice(0, f.raiz + 1).filter(function (_, i) { return i % 2 === 0; });
        const res = nadar(rec, hasta.concat(f.pts.filter(function (_, i) { return i % 2 === 0; })).concat([f.pts[f.pts.length - 1]]), cfgJ);
        if (f.lazo) {
            ok(res.st.nodo.rama < 0 && res.st.nodo.i >= f.union - 3, "muestra " + m + " lazo " + k + ": vuelve al camino en " + res.st.nodo.i + " (unión " + f.union + ")");
            ok(!R.enCallejon(rec, res.st.nodo), "muestra " + m + " lazo " + k + ": no es callejón");
            // y desde la unión se puede seguir hasta el coral
            const sigue = rec.principal.slice(f.union).filter(function (_, i) { return i % 2 === 0; });
            let st = res.st, meta = false;
            sigue.concat([rec.meta]).forEach(function (p) {
                const r2 = R.mover(rec, st, p, 60, cfgJ);
                st = { x: r2.x, y: r2.y, nodo: r2.nodo };
                if (R.enMeta(rec, r2.nodo)) meta = true;
            });
            ok(meta, "muestra " + m + " lazo " + k + ": después del lazo llega al coral");
        } else {
            ok(R.enCallejon(rec, res.st.nodo), "muestra " + m + " callejón " + k + ": termina sin salida");
        }
    });
    // la holgura tiene límite
    const p0 = rec.principal[Math.floor(rec.principal.length / 2)];
    const lejos = R.mover(rec, { x: p0.x, y: p0.y, nodo: { rama: -1, i: Math.floor(rec.principal.length / 2) } }, { x: p0.x, y: p0.y - rec.ancho * 3 }, 400, cfgJ);
    const lim = R.limites(rec, cfgJ);
    ok(lejos.d <= lim.fuera + 1, "muestra " + m + ": no se aleja más de la holgura (" + Math.round(lejos.d) + ")");
});

// ------------------------------------------------------------------ estrellas por burbujas reventadas
const cE = cfg.juego.estrellas;
ok(cE && cE.tresHasta < cE.dosHasta, "config de estrellas (tresHasta < dosHasta)");
ok(R.estrellas(0, 300, cE) === 3, "sin reventar: 3 estrellas");
ok(R.estrellas(Math.floor(300 * cE.tresHasta), 300, cE) === 3, "pocas reventadas: 3 estrellas");
ok(R.estrellas(Math.floor(300 * cE.tresHasta) + 1, 300, cE) === 2, "algunas reventadas: 2 estrellas");
ok(R.estrellas(Math.floor(300 * cE.dosHasta) + 1, 300, cE) === 1, "muchas reventadas: 1 estrella");
ok(R.estrellas(300, 300, cE) === 1, "todas reventadas: nunca menos de 1 estrella");
ok(R.estrellas(0, 0, cE) === 3, "sin burbujas: 3 estrellas");
ok(Array.isArray(T.estrellasVoz) && T.estrellasVoz.length === 3, "voz para 1, 2 y 3 estrellas");
ok(/\{r\}/.test(T.nivelBurbujas) && /\{t\}/.test(T.nivelBurbujas), "texto de burbujas reventadas con {r} y {t}");

// ------------------------------------------------------------------ dibujos
const iconos = fs.existsSync(path.join(dir, "iconos.js")) ? fs.readFileSync(path.join(dir, "iconos.js"), "utf8") : "";
["pez", "cola", "aleta", "coral", "concha", "roca", "alga", "estrellaMar", "pececito", "arrecife", "burbuja", "estrella"].forEach(function (k) {
    ok(new RegExp("\\b" + k + ":").test(iconos), "dibujo " + k + " en iconos.js");
});
ok(fs.existsSync(path.join(dir, "viaje-pez.png")), "icono viaje-pez.png");

console.log("Partidas: " + partidas + " en " + ms + " ms · progresivas " + progresivas + " · con lazo por recorrido " + conLazo.join("/"));
console.log((fallos ? "FALLÓ" : "OK") + ": " + (pruebas - fallos) + "/" + pruebas + " comprobaciones");
process.exit(fallos ? 1 : 0);
