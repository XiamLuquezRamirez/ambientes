/**
 * Reglas de "El Memorama de las Partes del Cuerpo" (tres rondas de 4 tarjetas con partes del cuerpo).
 * Uso: node scripts/probar-memorama-partes-cuerpo.js
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "public", "catalogo_juegos", "Polimotor", "MemoramaPartesCuerpo");
const R = require(path.join(dir, "reglas.js"));
const config = JSON.parse(fs.readFileSync(path.join(dir, "config.json"), "utf8"));
const iconosJs = fs.readFileSync(path.join(dir, "iconos.js"), "utf8");
const dibujos = [...iconosJs.matchAll(/SVG\.(\w+) = /g)].map(function (m) { return m[1]; });
const r1 = R.ronda(config, 0);

let ok = 0;
function prueba(nombre, fn) {
    fn();
    ok++;
    console.log("  ok " + nombre);
}

/** Generador repetible para las pruebas. */
function semilla(n) {
    // mulberry32
    let s = (n * 2654435761) >>> 0;
    return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function cuenta(orden) {
    const c = {};
    orden.forEach(function (t) { c[t] = (c[t] || 0) + 1; });
    return c;
}

/** Índices de las dos cartas de un tipo. */
function de(st, tipo) {
    return st.cartas.filter(function (c) { return c.tipo === tipo; }).map(function (c) { return c.indice; });
}

console.log("El Memorama de las Partes del Cuerpo — reglas");

prueba("config.json sin problemas: tres rondas, partes con dibujo y sin repetir", function () {
    assert.deepEqual(R.revisarJuego(config, dibujos), []);
    assert.equal(R.rondas(config).length, 3);
    assert.deepEqual(R.tipos(r1).map(function (t) { return t.id; }), ["mano", "pie"]);
});

prueba("tres rondas, todas de 4 tarjetas (2 parejas) elegidas del grupo de cada ronda", function () {
    assert.deepEqual(R.ronda(config, 1).partes, ["ojos", "nariz", "boca"]);
    assert.deepEqual(R.ronda(config, 2).partes, ["oreja", "cabeza", "brazo", "pierna"]);
    for (let i = 0; i < 3; i++) {
        for (let k = 0; k < 100; k++) {
            const r = R.ronda(config, i, semilla(k * 7 + i));
            assert.equal(r.cartas.length, 2);
            assert.notEqual(r.cartas[0].id, r.cartas[1].id);
            r.cartas.forEach(function (c) { assert.ok(r.partes.includes(c.id)); });
            const st = R.crear(r, semilla(k));
            assert.equal(st.cartas.length, 4);
            assert.equal(st.total, 2);
            Object.values(cuenta(R.orden(st))).forEach(function (c) { assert.equal(c, 2); });
        }
    }
    assert.equal(R.ronda(config, 3), null);
});

prueba("con el tiempo salen todas las partes de cada grupo (más partes del cuerpo)", function () {
    for (let i = 0; i < 3; i++) {
        const vistas = new Set();
        for (let k = 0; k < 200; k++) R.ronda(config, i, semilla(k + 50 * i)).elegidas.forEach(function (p) { vistas.add(p); });
        assert.deepEqual([...vistas].sort(), R.rondas(config)[i].partes.slice().sort());
    }
});

prueba("lista de partes para las voces", function () {
    const r = R.ronda(config, 1);
    assert.equal(R.listaPartes(r.cartas), "los ojos y la nariz");
    assert.equal(R.plantilla(config.rondas[1].instruccion, { lista: R.listaPartes(r.cartas) }),
        "¡Nuevas partes de la cara! Busca los ojos y la nariz.");
});

prueba("las partes nuevas reutilizan dibujos de otro juego Polimotor (Une las Partes del Cuerpo)", function () {
    const une = fs.readFileSync(path.join(dir, "..", "UnePartesCuerpo", "iconos.js"), "utf8");
    ["ojos", "nariz", "boca", "orejas", "cabeza", "brazo", "pierna"].forEach(function (d) {
        assert.ok(une.includes("SVG." + d + " = "), d + " no está en Une");
        assert.ok(dibujos.includes(d), d + " no está copiado");
    });
});

prueba("la última ronda se juega completa hasta completed", function () {
    const r3 = R.ronda(config, 2, semilla(3));
    const st = R.crear(r3, semilla(9));
    R.iniciar(st);
    r3.elegidas.forEach(function (t) {
        const par = de(st, t);
        R.tocar(st, par[0]);
        R.tocar(st, par[1]);
        assert.equal(R.comparar(st).pareja, true);
        R.terminarTurno(st);
    });
    assert.equal(st.estado, "completed");
    assert.deepEqual(R.progreso(st), { hechas: 2, total: 2, completo: true });
});

prueba("siempre hay cuatro tarjetas: exactamente dos manos y dos pies", function () {
    for (let i = 0; i < 300; i++) {
        const st = R.crear(r1, semilla(i));
        assert.equal(st.cartas.length, 4);
        assert.deepEqual(cuenta(R.orden(st)), { mano: 2, pie: 2 });
        assert.equal(st.total, 2);
        assert.equal(st.estado, "preview");
    }
});

prueba("las posiciones se reparten al azar (aparecen las 6 combinaciones posibles)", function () {
    const vistas = new Set();
    for (let i = 0; i < 400; i++) vistas.add(R.orden(R.crear(r1, semilla(i))).join(","));
    assert.equal(vistas.size, 6);
});

prueba("al reiniciar, el orden nuevo es distinto del anterior", function () {
    for (let i = 0; i < 200; i++) {
        const antes = R.orden(R.crear(r1, semilla(i)));
        const despues = R.orden(R.crear(r1, semilla(i), antes));
        assert.notEqual(despues.join(","), antes.join(","));
        assert.deepEqual(cuenta(despues), { mano: 2, pie: 2 });
    }
    // aunque el azar devuelva siempre lo mismo
    const fijo = function () { return 0; };
    const antes = R.orden(R.crear(r1, fijo));
    assert.notEqual(R.orden(R.crear(r1, fijo, antes)).join(","), antes.join(","));
});

prueba("durante la vista previa no se puede tocar nada", function () {
    const st = R.crear(r1, semilla(1));
    assert.deepEqual(R.tocar(st, 0), { ok: false, motivo: "bloqueado" });
    assert.equal(R.iniciar(st), true);
    assert.equal(st.estado, "waiting");
    assert.equal(R.iniciar(st), false);
});

prueba("primera y segunda tarjeta; no se puede tocar dos veces la misma", function () {
    const st = R.crear(r1, semilla(2));
    R.iniciar(st);
    const t1 = R.tocar(st, 0);
    assert.equal(t1.ok, true);
    assert.equal(t1.accion, "primera");
    assert.equal(st.estado, "firstCard");
    assert.deepEqual(R.tocar(st, 0), { ok: false, motivo: "misma" });
    const t2 = R.tocar(st, 1);
    assert.equal(t2.accion, "segunda");
    assert.equal(st.estado, "secondCard");
});

prueba("con dos tarjetas abiertas no se puede voltear una tercera", function () {
    const st = R.crear(r1, semilla(3));
    R.iniciar(st);
    R.tocar(st, 0);
    R.tocar(st, 1);
    assert.deepEqual(R.tocar(st, 2), { ok: false, motivo: "bloqueado" });
    R.comparar(st);
    assert.deepEqual(R.tocar(st, 3), { ok: false, motivo: "bloqueado" });
    assert.equal(st.abiertas.length, 2);
});

prueba("pareja incorrecta: checking, bloquea y al terminar el turno se cierran las dos", function () {
    const st = R.crear(r1, semilla(4));
    R.iniciar(st);
    const m = de(st, "mano")[0];
    const p = de(st, "pie")[0];
    R.tocar(st, m);
    R.tocar(st, p);
    const c = R.comparar(st);
    assert.equal(c.pareja, false);
    assert.equal(st.estado, "checking");
    assert.equal(R.puedeTocar(st, de(st, "mano")[1]), false);
    assert.equal(R.terminarTurno(st), "waiting");
    assert.equal(st.cartas[m].abierta, false);
    assert.equal(st.cartas[p].abierta, false);
    assert.equal(R.progreso(st).hechas, 0);
    assert.equal(st.fallos, 1);
});

prueba("pareja correcta: matched, queda abierta y ya no se puede tocar", function () {
    const st = R.crear(r1, semilla(5));
    R.iniciar(st);
    const [a, b] = de(st, "mano");
    R.tocar(st, a);
    R.tocar(st, b);
    const c = R.comparar(st);
    assert.equal(c.pareja, true);
    assert.equal(c.tipo, "mano");
    assert.equal(st.estado, "matched");
    assert.equal(R.terminarTurno(st), "waiting");
    assert.equal(st.cartas[a].abierta, true);
    assert.equal(st.cartas[b].abierta, true);
    assert.deepEqual(R.tocar(st, a), { ok: false, motivo: "emparejada" });
    assert.deepEqual(R.progreso(st), { hechas: 1, total: 2, completo: false });
    assert.deepEqual(R.cerradas(st).sort(), de(st, "pie").sort());
});

prueba("con las dos parejas la partida termina (completed) y no acepta más toques", function () {
    const st = R.crear(r1, semilla(6));
    R.iniciar(st);
    ["pie", "mano"].forEach(function (t) {
        const [a, b] = de(st, t);
        R.tocar(st, a);
        R.tocar(st, b);
        R.comparar(st);
        R.terminarTurno(st);
    });
    assert.equal(st.estado, "completed");
    assert.deepEqual(R.progreso(st), { hechas: 2, total: 2, completo: true });
    for (let i = 0; i < 4; i++) assert.equal(R.tocar(st, i).ok, false);
    assert.deepEqual(R.cerradas(st), []);
});

prueba("comparar y terminarTurno no hacen nada fuera de su momento", function () {
    const st = R.crear(r1, semilla(7));
    assert.equal(R.comparar(st), null);
    assert.equal(R.terminarTurno(st), "preview");
    R.iniciar(st);
    R.tocar(st, 0);
    assert.equal(R.comparar(st), null);
    assert.equal(R.terminarTurno(st), "firstCard");
    assert.deepEqual(R.tocar(st, 9), { ok: false, motivo: "fuera" });
});

prueba("una partida larga con errores llega al final sin estados raros", function () {
    const rnd = semilla(8);
    for (let n = 0; n < 50; n++) {
        const st = R.crear(r1, rnd);
        R.iniciar(st);
        let pasos = 0;
        while (st.estado !== "completed" && pasos++ < 200) {
            const libres = R.cerradas(st);
            const a = libres[Math.floor(rnd() * libres.length)];
            R.tocar(st, a);
            const resto = R.cerradas(st);
            const b = resto[Math.floor(rnd() * resto.length)];
            R.tocar(st, b);
            R.comparar(st);
            R.terminarTurno(st);
            assert.ok(R.ESTADOS.indexOf(st.estado) >= 0);
            assert.equal(st.abiertas.length, 0);
        }
        assert.equal(st.estado, "completed");
    }
});

prueba("los textos con {parte} se completan", function () {
    const t = R.plantilla(config.textos.recordatorioZeus, { articulo: "la", parte: "mano" });
    assert.equal(t, "¡Recuerda dónde estaba la mano y busca su pareja idéntica!");
});

prueba("textos pedidos en el enunciado", function () {
    const t = config.textos;
    assert.equal(t.bienvenida, "¡Bienvenido al Memorama del Cuerpo! Toca dos tarjetas para voltearlas y buscar las que tienen la misma parte del cuerpo.");
    assert.equal(t.finalTitulo, "¡LO LOGRASTE!");
    assert.equal(t.finalSub, "Encontraste todas las parejas del cuerpo.");
    assert.ok(t.finalZoe.startsWith("¡SÚPER MEMORIA! Encontraste las dos manos y los dos pies"));
    assert.ok(t.finalZoe.includes("{lista}"), "el final nombra las partes que salieron");
    assert.ok(t.finalZeus.includes("superdetective"));
    assert.equal(R.tipo(config, "mano").voz, "¡Mano!");
    assert.equal(R.tipo(config, "pie").voz, "¡Pie!");
    assert.equal(config.juego.previaMs, 3000);
    assert.equal(config.juego.errorVisibleMs, 2000);
    assert.equal(config.niveles[0].edad, "3-4 años");
});

console.log(ok + " pruebas correctas");
