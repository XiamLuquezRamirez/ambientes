/**
 * Prueba de "El Circuito Láser de la Central de Energía" (Polimotor, 5-6 años).
 *   node scripts/probar-circuito-laser-central.js
 * Revisa el config (edad, textos literales del enunciado, tres circuitos progresivos), el index (edad visible,
 * indicador de nivel, scripts) y la mecánica con ReglasLaser en varios tamaños de mundo: circuitos válidos, una
 * esfera cuidadosa llega sin choques esperando los láseres, una apurada choca con los rayos y aun así llega (no
 * se pierde el progreso), y una que se desvía toca la pared sin salir del carril. También el ciclo de los láseres
 * (contador 3, 2, 1, aviso antes de encender, nunca se encienden con la esfera dentro del rayo) y el movimiento en
 * todas las direcciones.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "CircuitoLaserCentral");
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
prueba(cfg.niveles.length === 1 && cfg.niveles[0].edad === "5-6 años", "edad 5-6 años en niveles");
prueba(cfg.audios.tema === "polimotor", "audios.tema polimotor");
prueba(cfg.mostrarFeedBack === true, "mostrarFeedBack en la raíz");
prueba(cfg.circuitos.length === 3, "tres circuitos");
const T = cfg.textos;
[
    [T.introZoe, "¡Alerta de precisión, súper ingeniero! Conduce la esfera de luz por el circuito eléctrico. Mantén tu pulso dentro del camino estrecho y espera el momento justo para pasar cuando los láseres se apaguen."],
    [T.sincronizacion, "¡Calcula el tiempo! Espera a que el rayo rojo se apague antes de pasar con la esfera."],
    [T.pared, "¡Ajusta tu pulso y continúa, vas muy bien!"],
    [T.guia, "¡Guía la esfera por el camino luminoso!"],
    [T.esperaRayo, "¡Espera a que el rayo rojo se apague!"],
    [T.finalZoe, "¡SÚPER CONTROL! Demostraste un pulso de cirujano y una sincronización perfecta con los láseres."]
].forEach(([a, b]) => prueba(a === b, "texto literal: " + b));
prueba(cfg.circuitos[0].laseres.length === 1, "nivel 1: una barrera de aprendizaje");
prueba(cfg.circuitos[1].laseres.length === 2 && cfg.circuitos[2].laseres.length === 2, "niveles 2 y 3: dos barreras");
prueba(cfg.demoCircuito.laseres.length === 2, "demo con dos barreras");
const ciclos = (d) => d.laseres.map((l) => l.enc + "/" + l.apag).join(",");
prueba(new Set(cfg.circuitos[1].laseres.map((l) => l.enc + "/" + l.apag)).size === 2, "nivel 2: ciclos diferentes " + ciclos(cfg.circuitos[1]));
prueba(new Set(cfg.circuitos[2].laseres.map((l) => l.enc + "/" + l.apag)).size === 2, "nivel 3: ciclos diferentes " + ciclos(cfg.circuitos[2]));
prueba(cfg.circuitos[0].ancho > cfg.circuitos[1].ancho && cfg.circuitos[1].ancho > cfg.circuitos[2].ancho, "carril cada vez más estrecho");
prueba(cfg.circuitos[0].curva > cfg.circuitos[1].curva && cfg.circuitos[1].curva > cfg.circuitos[2].curva, "curvas cada vez más cerradas");
prueba(cfg.circuitos[0].puntos.length < cfg.circuitos[1].puntos.length && cfg.circuitos[1].puntos.length < cfg.circuitos[2].puntos.length, "más tramos en cada nivel");
prueba(!("juego" in cfg.accesibilidad) && cfg.juego && cfg.juego.ayudaMs > 0, "números de la mecánica en juego, no en accesibilidad");
prueba(/<strong>5-6<\/strong> años/.test(html), "index: edad 5-6 años visible");
prueba(html.includes("NIVEL 1 DE 3"), "index: indicador NIVEL 1 DE 3");
prueba(html.includes('id="btn-menu-acc"') && html.includes('id="btn-menu-vol"'), "index: accesibilidad y volumen");
prueba(html.includes("btn-inicio") && html.includes("btn-recargar"), "index: inicio y reiniciar");
prueba(fs.existsSync(path.join(DIR, "circuito-laser.png")), "icono circuito-laser.png");
["reglas.js", "sonidos.js", "escenario-phaser.js", "arrastre.js", "demo.js", "script.js", "guia-3d.js"].forEach((f) => {
    prueba(html.includes('src="' + f + "?v="), "index carga " + f);
    prueba(fs.existsSync(path.join(DIR, f)), "existe " + f);
});
prueba(!html.includes("victory.mp3") && !fs.readFileSync(path.join(DIR, "script.js"), "utf8").includes("victory.mp3"), "no cierra con victory.mp3");

// ------------------------------------------------------------------ láseres
console.log("ciclo de los láseres");
{
    const L = { enc: 4000, apag: 3000, fase: 0 };
    const r = R.relojLaser(L);
    const vistos = [];
    let on = true, cambios = 0, avisos = 0;
    for (let t = 0; t < 14000; t += 50) {
        const e = R.avanzarLaser(L, r, 50, false);
        if (e.cuenta && vistos[vistos.length - 1] !== e.cuenta) vistos.push(e.cuenta);
        if (e.on !== on) { cambios++; on = e.on; }
        if (e.avisoEncender) avisos++;
    }
    prueba(vistos.slice(0, 3).join(",") === "3,2,1", "contador 3, 2, 1 antes de apagarse (" + vistos.join(",") + ")");
    prueba(cambios >= 3, "se enciende y se apaga de forma cíclica");
    prueba(avisos > 0, "aviso ámbar antes de encenderse");
    // con la esfera dentro del rayo, no se enciende
    const r2 = { t: 6900 };
    let e2;
    for (let t = 0; t < 2000; t += 50) e2 = R.avanzarLaser(L, r2, 50, true);
    prueba(e2.on === false, "no se enciende con la esfera dentro del rayo");
}

// ------------------------------------------------------------------ circuitos en varios tamaños
console.log("circuitos");
const tamanos = [{ W: 1600, H: 800 }, { W: 1600, H: 900 }, { W: 1600, H: 956 }, { W: 1600, H: 1100 }];
const largos = [[], [], []];
const choquesApurada = [];
tamanos.forEach((dims) => {
    [...cfg.circuitos, cfg.demoCircuito].forEach((d, k) => {
        const c = R.construir(d, dims, cfg.juego);
        const etiqueta = (d.nombre || "demo") + " " + dims.W + "x" + dims.H;
        const errores = R.validar(c);
        prueba(errores.length === 0, etiqueta + ": válido " + errores.slice(0, 3).join("|"));
        prueba(c.laseres.length === d.laseres.length, etiqueta + ": láseres ubicados");
        const cuid = R.simular(c, cfg.juego, "cuidadoso");
        prueba(cuid.llego && cuid.paredes === 0 && cuid.laseres === 0, etiqueta + ": la esfera cuidadosa llega sin choques");
        prueba(cuid.esperas > 0, etiqueta + ": la esfera tuvo que esperar algún láser");
        const apu = R.simular(c, cfg.juego, "apurado");
        prueba(apu.llego, etiqueta + ": la apurada también llega (nunca se traba)");
        choquesApurada[k] = (choquesApurada[k] || 0) + apu.laseres;
        prueba(apu.retrocesoMax < c.ancho * 1.3, etiqueta + ": el retroceso es pequeño (" + Math.round(apu.retrocesoMax) + ")");
        const zig = R.simular(c, cfg.juego, "zigzag");
        prueba(zig.paredes > 0, etiqueta + ": desviarse toca la pared");
        prueba(zig.maxFuera <= c.limite + 0.01, etiqueta + ": la esfera no sale del carril");
        if (k < 3) largos[k].push(c.largo);
    });
});
choquesApurada.forEach((n, k) => prueba(n > 0, "circuito " + k + ": pasar sin esperar choca con los rayos (" + n + ")"));
const prom = largos.map((l) => l.reduce((a, b) => a + b, 0) / l.length);
prueba(prom[0] < prom[1] && prom[1] < prom[2], "cada circuito es más largo: " + prom.map(Math.round).join(" → "));

// ------------------------------------------------------------------ movimiento en todas las direcciones
console.log("movimiento");
{
    const c = R.construir(cfg.circuitos[2], { W: 1600, H: 900 }, cfg.juego);
    const est = c.laseres.map(() => ({ on: false }));
    const dirs = new Set();
    // recorre el circuito ida y vuelta siguiendo el centro y registra hacia dónde se movió
    const pil = { x: c.inicio.x, y: c.inicio.y, s: 0 };
    const reg = (x0, y0) => {
        const dx = pil.x - x0, dy = pil.y - y0;
        if (Math.hypot(dx, dy) < 0.5) return;
        if (Math.abs(dx) > Math.abs(dy)) dirs.add(dx > 0 ? "derecha" : "izquierda");
        else dirs.add(dy > 0 ? "abajo" : "arriba");
    };
    for (let s = 0; s <= c.largo; s += 6) {
        const x0 = pil.x, y0 = pil.y;
        R.mover(c, pil, R.puntoEn(c, s), 16, cfg.juego, est);
        reg(x0, y0);
    }
    const ida = pil.s;
    for (let s = ida; s >= 0; s -= 6) {
        const x0 = pil.x, y0 = pil.y;
        R.mover(c, pil, R.puntoEn(c, s), 16, cfg.juego, est);
        reg(x0, y0);
    }
    prueba(dirs.size === 4, "se mueve en las cuatro direcciones: " + [...dirs].join(", "));
    prueba(pil.s < c.ancho, "puede volver hacia atrás por el carril");
    // quieta: sin objetivo nueva no se mueve sola
    const antes = { x: pil.x, y: pil.y };
    R.mover(c, pil, { x: pil.x, y: pil.y }, 16, cfg.juego, est);
    prueba(Math.hypot(pil.x - antes.x, pil.y - antes.y) < 0.01, "si el dedo se detiene, la esfera se detiene");
    // un rayo encendido bloquea el paso
    const L = c.laseres[0];
    const p0 = R.puntoEn(c, L.s - c.ancho);
    const pl = { x: p0.x, y: p0.y, s: L.s - c.ancho };
    const encendidos = c.laseres.map(() => ({ on: true }));
    let res = null;
    for (let i = 0; i < 60 && !(res && res.evento); i++) res = R.mover(c, pl, R.puntoEn(c, L.s + c.ancho), 16, cfg.juego, encendidos);
    prueba(res && res.evento === "laser" && pl.s < L.s, "un rayo encendido no se puede atravesar");
    const s2 = R.sRetroceso(c, pl.s, cfg.juego, res.laser);
    prueba(s2 < pl.s && pl.s - s2 < c.ancho * 1.3, "retrocede un poquito antes del rayo");
}

console.log("\n" + ok + "/" + (ok + mal) + " comprobaciones");
process.exit(mal ? 1 : 0);
