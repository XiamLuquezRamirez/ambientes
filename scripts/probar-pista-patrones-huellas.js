/**
 * Pruebas de ReglasHuellas (La Pista de Patrones de Huellas y Ritmo) y de su config.json.
 *
 *   node scripts/probar-pista-patrones-huellas.js
 *
 * Comprueba lo que pide el enunciado: 3 rondas de 3 secuencias con 4 huellas, que se mezclen manos y pies, que
 * desde la ronda 2 cada secuencia combine derecha e izquierda, la comprobación inmediata de cada toque (el
 * error no cuenta ni borra lo acertado), que Zeus recorra los 36 pasos hasta la meta, los bloqueos de la
 * partida y los textos literales pedidos.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const BASE = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "PistaPatronesHuellas");
const R = require(path.join(BASE, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, "config.json"), "utf8"));

let ok = 0;
let fallos = 0;

function comprobar(nombre, condicion, detalle) {
    if (condicion) {
        ok++;
        console.log("  ok  " + nombre);
    } else {
        fallos++;
        console.log("FALLA  " + nombre + (detalle ? "  →  " + detalle : ""));
    }
}

function iniciar() {
    const st = R.crear(cfg);
    R.pasar(st, "DEMO");
    R.pasar(st, "SHOWING_SEQUENCE");
    R.pasar(st, "WAITING_INPUT");
    return st;
}

console.log("\nconfig.json");
comprobar("revisarJuego sin problemas", R.revisarJuego(cfg).length === 0, R.revisarJuego(cfg).join(" | "));
comprobar("cinco huellas con color propio", new Set(cfg.acciones.map((a) => a.color)).size === 5);
const colores = Object.fromEntries(cfg.acciones.map((a) => [a.id, a.color]));
comprobar("mano izquierda naranja, mano derecha roja, pie izquierdo azul, ambos pies verde",
    colores.manoIzquierda === "#f76707" && colores.manoDerecha === "#e03131" &&
    colores.pieIzquierdo === "#228be6" && colores.ambosPies === "#2f9e44");
comprobar("cinco sonidos distintos", new Set(cfg.acciones.map((a) => a.sonido)).size === 5);
comprobar("edad 5-6 años", (cfg.niveles || []).some((n) => n.edad === "5-6 años"));
comprobar("demo: pie izquierdo → mano derecha → ambos pies",
    R.iguales(cfg.demo.secuencia, ["pieIzquierdo", "manoDerecha", "ambosPies"]));
const t = cfg.textos;
comprobar("título ¡LA PISTA DE PATRONES!", t.tituloIntro === "¡LA PISTA DE PATRONES!");
comprobar("bienvenida literal", t.bienvenida === "¡Alerta en la pista de huellas! Mira la secuencia de luz que se enciende en el suelo: manos y pies, izquierda y derecha. ¡Memoriza el camino y ayúdame a cruzar el circuito!");
comprobar("indicación del turno literal", t.tuTurnoVoz === "¡Ahora es tu turno! Recuerda el orden y toca las huellas correctas.");
comprobar("apoyo de Zeus literal", t.demoZeus === "¡Pie izquierdo, mano derecha y sigue el camino de la memoria!");
comprobar("mensaje final literal", t.finalZeus === "¡ESPECTACULAR! Dominaste la memoria corporal, el ritmo y la secuencia de huellas. ¡Completaste el desafío de la lateralidad!");

console.log("\nsecuencias (300 partidas)");
let invalidas = 0;
let sinLados = 0;
let sinMezcla = 0;
for (let i = 0; i < 300; i++) {
    const s = R.generarSecuencias(cfg);
    if (R.problemasSecuencias(s, cfg).length) invalidas++;
    s.forEach((r, ir) => r.forEach((sec) => {
        if (!R.mezclaManosYPies(sec)) sinMezcla++;
        if (ir >= 1 && !R.usaAmbosLados(sec)) sinLados++;
    }));
}
comprobar("todas cumplen las reglas", invalidas === 0, invalidas + " inválidas");
comprobar("todas mezclan manos y pies", sinMezcla === 0, sinMezcla + " sin mezclar");
comprobar("rondas 2 y 3 combinan derecha e izquierda", sinLados === 0, sinLados + " sin lateralidad");
const s = R.generarSecuencias(cfg);
comprobar("3 rondas", s.length === 3);
comprobar("3 secuencias por ronda", s.every((r) => r.length === 3));
comprobar("4 huellas por secuencia", s.every((r) => r.every((sec) => sec.length === 4)));
comprobar("9 actividades en total", R.totalItems(cfg) === 9);

console.log("\npartida completa sin errores");
let st = iniciar();
let pasos = 0;
let avanzaDeUnoEnUno = true;
for (let n = 0; n < 50 && st.estado !== "VICTORY"; n++) {
    R.pasar(st, "WAITING_INPUT");
    R.secuenciaActual(st).forEach((id) => {
        R.tocar(st, id);
        const p = R.pasosRecorridos(st, cfg);
        if (p !== pasos + 1) avanzaDeUnoEnUno = false;
        pasos = p;
    });
    R.comparar(st);
    if (R.avanzar(st, cfg) === "ronda") R.siguienteRonda(st, cfg);
}
comprobar("llega a VICTORY", st.estado === "VICTORY", st.estado);
comprobar("9 ítems acertados", st.correctos === 9);
comprobar("Zeus avanza un paso por acierto", avanzaDeUnoEnUno);
comprobar("Zeus termina en la meta (36 pasos)", R.pasosRecorridos(st, cfg) === 36 && R.pasosTotales(cfg) === 36);

console.log("\ntoque equivocado");
st = iniciar();
const sec = R.secuenciaActual(st).slice();
R.tocar(st, sec[0]);
const malo = R.ACCIONES.find((a) => a !== sec[1]);
const r = R.tocar(st, malo);
comprobar("se marca como equivocado", r.ok && r.correcta === false);
comprobar("no borra lo acertado", st.respuesta.length === 1);
comprobar("sigue el turno del niño", st.estado === "WAITING_INPUT");
comprobar("Zeus no se mueve", R.pasosRecorridos(st, cfg) === 1);
comprobar("no suma progreso", st.correctos === 0);
comprobar("se reintenta el mismo paso", R.tocar(st, sec[1]).correcta === true);
comprobar("volver a mostrar: misma secuencia desde el principio",
    R.volverAMostrar(st) && st.respuesta.length === 0 && R.iguales(R.secuenciaActual(st), sec));

console.log("\nbloqueos");
st = R.crear(cfg);
comprobar("no acepta toques en la intro", !R.tocar(st, "manoIzquierda").ok);
st = iniciar();
comprobar("no acepta huellas desconocidas", !R.tocar(st, "narizDeZeus").ok);
R.secuenciaActual(st).forEach((id) => R.tocar(st, id));
comprobar("no acepta un quinto toque", !R.tocar(st, "manoDerecha").ok);

console.log("\n" + ok + " ok, " + fallos + " fallas");
process.exit(fallos ? 1 : 0);
