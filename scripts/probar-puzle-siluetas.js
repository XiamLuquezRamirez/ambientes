/**
 * Prueba de lógica y datos de "El Puzle de Siluetas en Acción" (Polimotor).
 * Uso: node scripts/probar-puzle-siluetas.js
 * Revisa cada postura de config.json (y la demo): número de piezas por nivel, articulaciones unidas
 * por cinemática, ángulos alcanzables con el paso de giro y que la validación no acepte piezas
 * equivocadas solo por estar cerca.
 */
"use strict";

const path = require("path");
const fs = require("fs");
const base = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "PuzleDeSiluetasEnAccion");
const P = require(path.join(base, "posturas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(base, "config.json"), "utf8"));

let fallos = 0;
let pruebas = 0;
function ok(cond, msg) {
    pruebas++;
    if (!cond) {
        fallos++;
        console.error("  ✗ " + msg);
    }
}

const juego = cfg.juego;
const paso = juego.pasoGiro;
const RANGO = { 1: [7, 7], 2: [7, 8], 3: [8, 8] };

const todas = [{ cruda: cfg.demo, nivel: 0 }];
cfg.etapas.forEach(function (e) {
    ok(Array.isArray(e.giroInicial) && e.giroInicial.every(function (g) { return g % paso === 0; }),
        "Nivel " + e.id + ": giroInicial debe ser múltiplo de " + paso);
    e.posturas.forEach(function (p) { todas.push({ cruda: p, nivel: e.id, etapa: e }); });
});

todas.forEach(function (t) {
    const c = t.cruda;
    const post = P.normalizarPostura(c);
    const n = post.piezas.length;
    console.log("· " + (c.id || "demo") + " (" + post.personaje + ", nivel " + (t.nivel || "demo") + "): " + n + " piezas");

    if (t.nivel) {
        ok(n >= RANGO[t.nivel][0] && n <= RANGO[t.nivel][1], c.id + ": nivel " + t.nivel + " necesita " + RANGO[t.nivel].join("-") + " piezas y tiene " + n);
        ok(c.nivel === t.nivel, c.id + ": el campo nivel no coincide con la etapa");
        ok(!!c.audio && !!c.pista, c.id + ": falta audio o pista");
    } else {
        ok(n === 8, "la demo debe tener 8 piezas (brazo doblado, brazo estirado, dos piernas y dos tenis)");
        const formas = post.piezas.map(function (p) { return p.tipo + ":" + p.forma; });
        ["brazo:extendido", "brazo:flexionado", "pierna:recta", "pierna:doblada"].forEach(function (f) {
            ok(formas.indexOf(f) !== -1, "la demo debe incluir " + f);
        });
    }
    ok(["zoe", "zeus"].indexOf(post.personaje) !== -1, c.id + ": personaje inválido");

    // Articulaciones unidas: cada tenis cae en el tobillo de su pierna; brazos en el hombro.
    const pose = P.cinematica(post.cuerpo);
    post.piezas.forEach(function (p) {
        ok(P.distancia(p.pivote, pose[p.id]) < 0.01, c.id + ": pivote de " + p.id + " no sale de la cinemática");
        if (p.tipo === "tenis") {
            const pierna = P.pieza(post, "pierna_" + p.lado);
            const tob = P.sumar(pierna.pivote, P.rotar(P.ESQUELETO.tobillo[pierna.forma], pierna.angulo));
            ok(P.distancia(tob, p.pivote) < 0.01, c.id + ": " + p.id + " no está en el tobillo");
            ok(p.une === pierna.id, c.id + ": " + p.id + " debe unirse a " + pierna.id);
        }
    });

    // Pasos: cabeza → tronco → brazos → piernas → tenis, sin repetir piezas.
    const plano = [].concat.apply([], post.pasos);
    ok(plano.length === n && new Set(plano).size === n, c.id + ": los pasos deben cubrir cada pieza una vez");
    ok(post.pasos[0][0] === "cabeza" && post.pasos[1][0] === "tronco", c.id + ": empieza por cabeza y tronco");

    const cfgV = Object.assign({}, juego, t.etapa && t.etapa.toleranciaGrados ? { toleranciaGrados: t.etapa.toleranciaGrados } : {});
    post.piezas.forEach(function (h) {
        // Encaje exacto
        ok(P.evaluarSoltado(post, h, h.centro, h.angulo, colocadasAntes(post, h), cfgV).resultado === "encaje",
            c.id + ": " + h.id + " no encaja en su propio hueco");
        // Girada de más: orientación
        ok(P.evaluarSoltado(post, h, h.centro, h.angulo + 90, colocadasAntes(post, h), cfgV).resultado === "orientacion",
            c.id + ": " + h.id + " girada 90° debería pedir orientación");
        // Desordenada: siempre se puede llegar con el paso de giro
        (t.etapa ? t.etapa.giroInicial : [45, 60, 90]).forEach(function (g) {
            const ini = P.anguloInicial(h.angulo, g);
            ok(P.normalizar(h.angulo - ini) % paso === 0, c.id + ": " + h.id + " no se alcanza girando de " + paso + " en " + paso);
        });
    });

    // Una pieza de otra identidad, bien girada y encima del hueco, no encaja.
    post.piezas.forEach(function (h) {
        post.piezas.forEach(function (otra) {
            if (otra.clave === h.clave) return;
            // (Si su propio hueco está al lado y ya tiene su inclinación, puede encajar allí: eso es correcto.)
            const r = P.evaluarSoltado(post, otra, h.centro, h.angulo, colocadasAntes(post, h), cfgV);
            ok(!(r.resultado === "encaje" && r.hueco.id === h.id), c.id + ": " + otra.id + " no debe encajar en el hueco de " + h.id);
            if (r.resultado === "encaje") ok(r.hueco.clave === otra.clave, c.id + ": encaje con identidad distinta");
        });
    });

    // El tenis antes de su pierna pide la pierna (articulación con la pieza vecina).
    const tenis = post.piezas.find(function (p) { return p.tipo === "tenis"; });
    const sinPierna = colocadasAntes(post, tenis);
    delete sinPierna[tenis.une];
    ok(P.evaluarSoltado(post, tenis, tenis.centro, tenis.angulo, sinPierna, cfgV).resultado === "vecino",
        c.id + ": el tenis sin su pierna debería pedir la pierna");
});

function colocadasAntes(post, h) {
    const res = {};
    const plano = [].concat.apply([], post.pasos);
    for (let i = 0; i < plano.length && plano[i] !== h.id; i++) res[plano[i]] = true;
    return res;
}

// Textos con plantillas
ok(P.texto("¡{Pieza}!", { pieza: "la cabeza" }) === "¡La cabeza!", "plantilla con mayúscula");
ok(Array.isArray(cfg.textos.colocada) && cfg.textos.colocada.length > 1, "frases de encaje");
["demoRodilla", "desafio", "final", "errorFormaPierna", "errorLado"].forEach(function (k) {
    ok(!!cfg.textos[k], "falta textos." + k);
});

console.log((fallos ? "✗ " + fallos + " fallos" : "✓ Todo bien") + " (" + pruebas + " comprobaciones)");
process.exit(fallos ? 1 : 0);
