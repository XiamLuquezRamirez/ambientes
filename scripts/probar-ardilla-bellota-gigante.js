/**
 * Prueba de "La Ardilla y la Bellota Gigante" (Polimotor, 3-4 años).
 *   node scripts/probar-ardilla-bellota-gigante.js
 * Revisa el config (edad, textos literales del enunciado), el index (edad visible, indicador de nivel), los dibujos
 * citados y el generador: muchas partidas en varios tamaños (dos rutas que llegan a la misma cesta, una despejada
 * y otra con obstáculos rodeables, cantidades por nivel, largo progresivo, nada encima de la entrada ni de la
 * cesta) y el arrastre (todas las direcciones, holgura, borde, obstáculos que no se atraviesan).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DIR = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "ArdillaBellotaGigante");
const R = require(path.join(DIR, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(DIR, "config.json"), "utf8"));
const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");

let ok = 0, mal = 0;
function prueba(cond, msg) {
    if (cond) ok++;
    else { mal++; console.log("  FALLA:", msg); }
}

// ------------------------------------------------------------------ config e index
console.log("config e index");
prueba(cfg.niveles.length === 1 && cfg.niveles[0].edad === "3-4 años", "edad 3-4 años en niveles");
prueba(!JSON.stringify(cfg).includes("5-6"), "no menciona 5-6 años");
prueba(cfg.audios.tema === "polimotor", "audios.tema polimotor");
prueba(cfg.mostrarFeedBack === true, "mostrarFeedBack en la raíz");
prueba(cfg.recorridos.length === 4, "cuatro recorridos");
const T = cfg.textos;
const literales = [
    [T.introZoe, "¡Hola! La ardillita necesita llevar su bellota hasta la cesta. ¿La ayudamos?"],
    [T.demoZeus, "¡Mira cómo lo hago! Mueve la bellota por el camino y rodea los obstáculos."],
    [T.cierreRecorrido, "¡Muy bien! ¡Llevaste la bellota hasta su cesta!"],
    [T.finalZoe, "¡LO LOGRASTE! Ayudaste a la ardillita a recorrer los cuatro caminos y llevar todas sus bellotas a casa. ¡Eres un campeón de la coordinación y la orientación!"],
    [T.finalZeus, "¡Excelente trabajo! ¡Misión cumplida!"],
    [T.finalTitulo, "¡AVENTURA COMPLETADA!"],
    [T.finalSub, "¡SUPEREXPLORADOR DEL BOSQUE!"],
    [cfg.recorridos[0].instruccion, "¡Ayuda a la ardillita! Lleva la bellota hasta su cesta siguiendo el caminito."],
    [cfg.recorridos[0].vozExtra, "¡Mira! Puedes pasar por cualquiera de los dos caminos."],
    [cfg.recorridos[1].instruccion, "¡Vamos otra vez! Desliza la bellota por el bosque hasta llegar a la cesta."],
    [cfg.recorridos[2].instruccion, "¡Muy bien! Mira los tronquitos y mueve la bellota para pasar alrededor de ellos."],
    [cfg.recorridos[3].instruccion, "¡Última aventura! Lleva la bellota hasta la cesta. ¡Tú puedes!"]
];
literales.forEach(([a, b]) => prueba(a === b, "texto literal: " + b));
prueba(cfg.recorridos[0].voz === "zoe" && cfg.recorridos[0].vozExtraPj === "zeus", "nivel 1: Zoe y luego Zeus");
prueba(cfg.recorridos[2].voz === "zeus", "nivel 3: Zeus");
prueba(cfg.recorridos[1].voz === "zoe" && cfg.recorridos[3].voz === "zoe", "niveles 2 y 4: Zoe");
prueba(/<strong>3-4<\/strong> años/.test(html), "index: edad 3-4 años visible");
prueba(html.includes("NIVEL 1 DE 4"), "index: indicador NIVEL 1 DE 4");
prueba(fs.existsSync(path.join(DIR, "ardilla-bellota.png")), "icono ardilla-bellota.png");
["reglas.js", "iconos.js", "sonidos.js", "escenario-phaser.js", "arrastre.js", "demo.js", "script.js", "guia-3d.js"].forEach(f => {
    prueba(html.includes('src="' + f + "?v="), "index carga " + f);
});

// dibujos citados por la escena existen en iconos.js
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(DIR, "iconos.js"), "utf8"), ctx);
const SVG = ctx.window.IconosArdilla.SVG;
const escena = fs.readFileSync(path.join(DIR, "escenario-phaser.js"), "utf8");
const citados = new Set();
(escena.match(/"ico-([A-Za-z]+)"/g) || []).forEach(m => citados.add(m.slice(5, -1)));
["tronco", "tronquito", "piedra", "rama", "hongos", "flor", "hierba", "arbusto", "copaRoja", "copaNaranja", "copaAmarilla"].forEach(k => citados.add(k));
cfg.recorridos.forEach(d => d.tipos.forEach(t => citados.add(t)));
citados.forEach(k => prueba(typeof SVG[k] === "string" && SVG[k].startsWith("<svg"), "dibujo " + k));
cfg.recorridos.forEach(d => d.tipos.forEach(t => prueba(!!R.TIPOS[t], "tipo de obstáculo conocido: " + t)));

// ------------------------------------------------------------------ generador
console.log("generador");
const tamanos = [{ W: 1600, H: 800 }, { W: 1600, H: 900 }, { W: 1600, H: 960 }, { W: 1600, H: 1000 }];   // PC y tableta en horizontal
const MIN_OBS = [1, 2, 2, 3], MAX_OBS = [1, 2, 3, 3];
let partidas = 0;
tamanos.forEach(dims => {
    const largos = [[], [], [], []];
    for (let i = 0; i < 40; i++) {
        const p = R.generarPartida(cfg, dims, 1000 + i * 7919, { paso: 8, cfg: cfg.juego });
        partidas++;
        p.recorridos.forEach((r, k) => {
            prueba(!!r, `recorrido ${k + 1} generado (${dims.W}x${dims.H})`);
            if (!r) return;
            const w = r.ancho;
            prueba(r.rutas.length === 2, "dos rutas");
            // las dos rutas salen del mismo punto y llegan a la misma cesta
            r.rutas.forEach(ru => {
                const a = ru.pts[0], b = ru.pts[ru.pts.length - 1];
                prueba(Math.hypot(a.x - r.inicio.x, a.y - r.inicio.y) < 1 && Math.hypot(b.x - r.meta.x, b.y - r.meta.y) < 1, "ruta de la entrada a la cesta");
                // continua y suave (sin saltos ni giros bruscos)
                let maxSalto = 0;
                for (let j = 1; j < ru.pts.length; j++) maxSalto = Math.max(maxSalto, Math.hypot(ru.pts[j].x - ru.pts[j - 1].x, ru.pts[j].y - ru.pts[j - 1].y));
                const maxGiro = R.giroMaximo(ru.pts, 6);
                prueba(maxSalto < 9, "ruta continua");
                prueba(maxGiro <= 1.06, `curvas suaves (giro ${maxGiro.toFixed(2)})`);
                ru.pts.forEach(q => { if (q.x < 0 || q.y < 0 || q.x > r.W || q.y > r.H) prueba(false, "ruta dentro del mundo"); });
            });
            // una despejada y otra con obstáculos
            const n = r.obstaculos.length;
            prueba(n >= MIN_OBS[k] && n <= MAX_OBS[k], `nivel ${k + 1}: ${n} obstáculos`);
            if (k === 0) prueba(r.obstaculos[0].tipo === "tronco", "nivel 1: un tronco");
            const limpia = r.rutas[1 - r.conObstaculos];
            r.obstaculos.forEach(o => {
                // ningún obstáculo toca la franja de la ruta despejada
                let dMin = Infinity;
                for (let j = 0; j < limpia.pts.length; j += 2) dMin = Math.min(dMin, R.distObstaculo(o, limpia.pts[j].x, limpia.pts[j].y));
                prueba(dMin > w * 0.5 + w * 0.2, "ruta despejada sin obstáculos");
                prueba(Math.hypot(o.x - r.inicio.x, o.y - r.inicio.y) > w * 1.5, "obstáculo lejos de la entrada");
                prueba(Math.hypot(o.x - r.meta.x, o.y - r.meta.y) > w * 1.7, "obstáculo lejos de la cesta");
            });
            for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
                prueba(Math.hypot(r.obstaculos[a].x - r.obstaculos[b].x, r.obstaculos[a].y - r.obstaculos[b].y) > w * 1.6, "obstáculos separados");
            }
            // las dos rutas son transitables (la simulación del generador, repetida aquí)
            prueba(R.simularRuta(r, 0, cfg.juego) && R.simularRuta(r, 1, cfg.juego), "las dos rutas llegan a la cesta");
            largos[k].push((r.rutas[0].largo + r.rutas[1].largo) / 2);
        });
    }
    const prom = largos.map(l => l.reduce((a, b) => a + b, 0) / l.length);
    prueba(prom[0] < prom[1] && prom[1] < prom[2] && prom[2] < prom[3], `largo progresivo ${dims.W}x${dims.H}: ${prom.map(Math.round).join(" < ")}`);
});

// ------------------------------------------------------------------ arrastre
console.log("arrastre");
const r = R.generarSeguro(cfg.recorridos[3], { W: 1600, H: 900 }, 4242, { paso: 8, cfg: cfg.juego });
const lim = R.limites(r, cfg.juego);
const pil = { x: r.inicio.x, y: r.inicio.y };
// todas las direcciones: desde un punto del camino, moverse a los cuatro lados
const tocaObs = q => r.obstaculos.some(o => R.distObstaculo(o, q.x, q.y) < r.ancho * 0.6);
const muestra = [0.3, 0.5, 0.7].map(u => R.puntoEn(r.rutas[1 - r.conObstaculos], r.rutas[1 - r.conObstaculos].largo * u)).find(q => !tocaObs(q));
[[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7]].forEach(([dx, dy]) => {
    const res = R.mover(r, { x: muestra.x, y: muestra.y }, { x: muestra.x + dx * 15, y: muestra.y + dy * 15 }, 100, cfg.juego);
    prueba(Math.hypot(res.x - muestra.x - dx * 15, res.y - muestra.y - dy * 15) < 1.5, `se mueve hacia ${dx},${dy}`);
});
// desviarse un poquito no es salirse; más lejos es "fuera"; nunca pasa el borde de la holgura
const nrm = { x: -Math.sin(muestra.ang), y: Math.cos(muestra.ang) };
const n2 = { x: -Math.sin(muestra.ang), y: Math.cos(muestra.ang) };
const lado = R.proyectar(r, muestra.x + n2.x * r.ancho * 0.9, muestra.y + n2.y * r.ancho * 0.9).d > R.proyectar(r, muestra.x - n2.x * r.ancho * 0.9, muestra.y - n2.y * r.ancho * 0.9).d ? 1 : -1;
const ir = off => R.mover(r, { x: muestra.x, y: muestra.y }, { x: muestra.x + n2.x * lado * off, y: muestra.y + n2.y * lado * off }, 9999, cfg.juego);
prueba(ir(r.ancho * 0.55).zona === "pista", "desviarse un poco sigue en el camino");
prueba(ir(r.ancho * 0.85).zona === "fuera", "más lejos: fuera (alerta)");
const lejos = ir(r.ancho * 4);
prueba(lejos.zona === "limite" && lejos.proy.d <= lim.fuera + 0.5, "no pasa el borde de la holgura");
// los obstáculos no se atraviesan: apuntar al centro deja la bellota afuera, rozándolo
r.obstaculos.forEach(o => {
    const res = R.mover(r, { x: o.x - nrm.x * r.ancho, y: o.y - nrm.y * r.ancho }, { x: o.x, y: o.y }, 9999, cfg.juego);
    prueba(R.distObstaculo(o, res.x, res.y) >= lim.bellota - 0.5, "no atraviesa el " + o.tipo);
});
// rodear exige intención: derecho por el centro se frena en el obstáculo; apartándose de lado, pasa
let frenadas = 0, pasan = 0, casos = 0;
for (let i = 0; i < 30; i++) {
    const pt = R.generarPartida(cfg, { W: 1600, H: 900 }, 777 + i * 31, { paso: 8, cfg: cfg.juego });
    pt.recorridos.forEach(rr => {
        casos++;
        const ruta = rr.rutas[rr.conObstaculos];
        const q = { x: rr.inicio.x, y: rr.inicio.y };
        const pw = rr.ancho * 0.1;
        let frenada = false;
        for (let s = pw; s <= ruta.largo; s += pw) {
            const o = R.puntoEn(ruta, s);
            for (let n = 0; n < 4; n++) { const m = R.mover(rr, q, o, pw * 1.5, cfg.juego); q.x = m.x; q.y = m.y; }
            if (Math.hypot(q.x - o.x, q.y - o.y) > rr.ancho * 0.9) { frenada = true; break; }
        }
        if (frenada) frenadas++;
        if (R.simularRuta(rr, rr.conObstaculos, cfg.juego)) pasan++;
    });
}
prueba(frenadas === casos, `derecho por el centro se frena (${frenadas}/${casos})`);
prueba(pasan === casos, `rodeando de lado se pasa (${pasan}/${casos})`);

// meta
prueba(R.enMeta(r, r.meta.x, r.meta.y) && !R.enMeta(r, r.inicio.x, r.inicio.y), "meta en la cesta");

console.log(`\n${ok}/${ok + mal} comprobaciones correctas (${partidas} partidas generadas)`);
process.exit(mal ? 1 : 0);
