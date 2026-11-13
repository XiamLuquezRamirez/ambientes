/**
 * Prueba de "¡Simón Dice Corporal!" (Polimotor, 3-4 años): reglas, generador de secuencias, máquina de estados,
 * config.json, textos pedidos por el enunciado, dibujos de los botones y registro en database/ambientes.sql.
 *
 *   node scripts/probar-simon-dice-corporal.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const raiz = path.join(__dirname, "..");
const carpeta = path.join(raiz, "public", "catalogo_juegos", "Polimotor", "SimonDiceCorporal");
const R = require(path.join(carpeta, "reglas.js"));
const I = require(path.join(carpeta, "iconos.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(carpeta, "config.json"), "utf8"));
const E = R.E;

let pasadas = 0;
function prueba(nombre, fn) {
    try {
        fn();
        pasadas++;
        console.log("  ok  " + nombre);
    } catch (e) {
        console.error("  FALLA  " + nombre + "\n        " + e.message);
        process.exitCode = 1;
    }
}

/** Azar con semilla (mulberry32) para repetir los casos. */
function semilla(n) {
    let a = n >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Lleva una partida hasta WAITING_INPUT del ítem actual. */
function aEsperar(st) {
    if (st.estado === E.INTRO) R.pasar(st, E.SHOWING_SEQUENCE);
    if (st.estado === E.ROUND_TRANSITION) R.siguienteRonda(st, cfg);
    R.pasar(st, E.WAITING_INPUT);
}

console.log("¡Simón Dice Corporal!");

prueba("config.json sin problemas (6 acciones y 3 visibles, 1 ronda de 6 ítems: 2, 2, 2, 3, 3 y 3 movimientos; demo cabeza → aplaudir)", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
    assert.strictEqual(R.rondas(cfg).length, 1);
    assert.strictEqual(R.totalItems(cfg), 6);
    assert.strictEqual(R.itemsDeRonda(cfg, 0), 6);
    assert.deepStrictEqual([0, 1, 2, 3, 4, 5].map(function (k) { return R.largoDeItem(cfg, 0, k); }), [2, 2, 2, 3, 3, 3]);
    // 4 movimientos es demasiado para 3-4 años: el ítem más largo tiene 3
    assert.ok([0, 1, 2, 3, 4, 5].every(function (k) { return R.largoDeItem(cfg, 0, k) <= 3; }), "ningún ítem pasa de 3 movimientos");
    assert.deepStrictEqual(cfg.demo.secuencia, ["cabeza", "aplaudir"]);
    assert.deepStrictEqual(R.ACCIONES, ["cabeza", "aplaudir", "zapatear", "saltar", "tocarPies", "abrirBrazos"]);
    assert.strictEqual(R.visiblesDeConfig(cfg), 3, "solo se ven tres botones a la vez");
    // la demo (cabeza → aplaudir) necesita esos dos botones a la vista
    assert.ok(R.visiblesDemo(cfg).indexOf("cabeza") >= 0 && R.visiblesDemo(cfg).indexOf("aplaudir") >= 0);
    assert.strictEqual(R.visiblesDemo(cfg).length, 3);
});

prueba("edad 3-4 años en niveles y en la cabecera", function () {
    assert.ok(cfg.niveles.some(function (n) { return /3-4/.test(n.edad); }));
    assert.ok(!cfg.niveles.some(function (n) { return /5-6/.test(n.edad); }));
    const html = fs.readFileSync(path.join(carpeta, "index.html"), "utf8");
    assert.ok(/<strong>3-4<\/strong> años/.test(html));
});

prueba("generador: 200 partidas, 6 ítems con 2, 2, 2, 3, 3 y 3 movimientos y reglas cumplidas", function () {
    for (let s = 1; s <= 200; s++) {
        const sec = R.generarSecuencias(cfg, semilla(s));
        assert.strictEqual(sec.length, 1);
        sec.forEach(function (ronda) {

            assert.strictEqual(ronda.length, 6);
            ronda.forEach(function (item, k) {
                assert.strictEqual(item.length, [2, 2, 2, 3, 3, 3][k]);
                item.forEach(function (a) { assert.ok(R.ACCIONES.indexOf(a) >= 0); });
            });
        });
        assert.deepStrictEqual(R.problemasSecuencias(sec, cfg), [], "semilla " + s);
    }
});

prueba("visibles: cada ítem sortea 3 de los 6 y su secuencia usa SOLO esos tres", function () {
    for (let semi = 1; semi <= 200; semi++) {
        const st = R.crear(cfg, semilla(semi));
        assert.strictEqual(st.visibles.length, R.rondas(cfg).length);
        st.visibles.forEach(function (ronda, ir) {
            assert.strictEqual(ronda.length, R.itemsDeRonda(cfg, ir), "semilla " + semi);
            ronda.forEach(function (trio, k) {
                // tres movimientos distintos, todos conocidos
                assert.strictEqual(trio.length, 3, "semilla " + semi + " ítem " + (k + 1));
                assert.strictEqual(new Set(trio).size, 3, "sin repetidos dentro del trío");
                trio.forEach(function (a) { assert.ok(R.ACCIONES.indexOf(a) >= 0, a); });
                // la secuencia de ese ítem no se sale de su trío
                st.secuencias[ir][k].forEach(function (a) {
                    assert.ok(trio.indexOf(a) >= 0, "semilla " + semi + " ítem " + (k + 1) + ": " + a + " no está visible");
                });
            });
        });
        assert.deepStrictEqual(R.problemasSecuencias(st.secuencias, cfg, st.visibles), [], "semilla " + semi);
    }
});

prueba("visibles: el trío cambia en cada ítem (nunca las mismas tres seguidas) y los seis se usan", function () {
    const vistos = {};
    for (let semi = 1; semi <= 200; semi++) {
        const st = R.crear(cfg, semilla(semi));
        st.visibles.forEach(function (ronda, ir) {
            // el primer trío no repite el de la demo; los demás no repiten el del ítem anterior
            let previo = R.conjunto(R.visiblesDemo(cfg));
            ronda.forEach(function (trio, k) {
                const actual = R.conjunto(trio);
                assert.notStrictEqual(actual, previo, "semilla " + semi + " ítem " + (k + 1) + ": el trío no cambió");
                previo = actual;
                trio.forEach(function (a) { vistos[a] = (vistos[a] || 0) + 1; });
            });
        });
    }
    // en 200 partidas los seis movimientos salen (ninguno queda fuera del sorteo)
    R.ACCIONES.forEach(function (a) { assert.ok(vistos[a] > 0, a + " nunca salió"); });
});

prueba("generador: nunca dos secuencias seguidas idénticas ni el primer ítem igual a la demo", function () {
    for (let s = 1; s <= 200; s++) {
        const plano = [].concat.apply([], R.generarSecuencias(cfg, semilla(s)));
        assert.ok(!R.iguales(plano[0], R.DEMO));
        for (let i = 1; i < plano.length; i++) assert.ok(!R.iguales(plano[i], plano[i - 1]), "semilla " + s + " ítem " + i);
    }
});

prueba("generador: sin la misma acción seguida, sin ítems repetidos; el primer ítem de 3 usa sus tres acciones", function () {
    // el primer ítem de 3 movimientos se busca en el config (hoy es el 4.º: 2, 2, 2, 3, 3, 3)
    const primeroDeTres = [0, 1, 2, 3, 4, 5].findIndex(function (k) { return R.largoDeItem(cfg, 0, k) === 3; });
    for (let s = 1; s <= 200; s++) {
        const items = R.generarSecuencias(cfg, semilla(s))[0];
        assert.strictEqual(new Set(items.map(R.clave)).size, 6, "sin ítems repetidos");
        items.forEach(function (x) {
            for (let k = 1; k < x.length; k++) assert.ok(x[k] !== x[k - 1]);
            if (x.length === 4) assert.strictEqual(new Set(x).size, 3);
        });
        assert.strictEqual(new Set(items[primeroDeTres]).size, 3, "el primer ítem de 3 usa las tres acciones");
    }
});

prueba("generador: dos partidas seguidas dan secuencias distintas (volver a jugar)", function () {
    const rnd = semilla(7);
    const a = JSON.stringify(R.generarSecuencias(cfg, rnd));
    const b = JSON.stringify(R.generarSecuencias(cfg, rnd));
    assert.notStrictEqual(a, b);
});

prueba("máquina de estados: sin toques fuera de WAITING_INPUT (intro, demo, observando, comprobando)", function () {
    const st = R.crear(cfg, semilla(3));
    const vis = R.visiblesActuales(st);
    assert.strictEqual(st.estado, E.INTRO);
    assert.strictEqual(R.tocar(st, vis[0]).ok, false);
    R.pasar(st, E.DEMO);
    assert.strictEqual(R.tocar(st, vis[0]).ok, false);
    R.pasar(st, E.SHOWING_SEQUENCE);
    assert.strictEqual(R.tocar(st, vis[0]).ok, false);
    assert.strictEqual(R.pasar(st, E.VICTORY), false, "transición inválida");
    R.pasar(st, E.WAITING_INPUT);
    assert.strictEqual(R.tocar(st, "nariz").ok, false);
    assert.ok(R.tocar(st, vis[0]).ok);
    const dos = R.tocar(st, vis[1]);
    assert.ok(dos.ok && dos.completa && dos.n === 2);
    assert.strictEqual(st.estado, E.CHECKING_ANSWER);
    assert.strictEqual(R.tocar(st, vis[2]).ok, false, "no hay tercer toque");
    assert.strictEqual(st.respuesta.length, 2);
});

prueba("solo se puede tocar lo que está visible: los otros tres movimientos no cuentan", function () {
    const st = R.crear(cfg, semilla(7));
    aEsperar(st);
    const vis = R.visiblesActuales(st);
    const ocultos = R.ACCIONES.filter(function (a) { return vis.indexOf(a) < 0; });
    assert.strictEqual(vis.length, 3);
    assert.strictEqual(ocultos.length, 3);
    ocultos.forEach(function (a) {
        const r = R.tocar(st, a);
        assert.strictEqual(r.ok, false, a + " no está visible");
        assert.strictEqual(r.motivo, "no visible");
    });
    assert.strictEqual(st.respuesta.length, 0, "ningún toque oculto entró en la respuesta");
    assert.ok(R.tocar(st, vis[0]).ok, "el visible sí cuenta");
});

prueba("comparación por orden: correcto e incorrecto (A > B ≠ B > A, con los visibles del ítem)", function () {
    const st = R.crear(cfg, semilla(4));
    const v = R.visiblesActuales(st);
    st.secuencias[0][0] = [v[0], v[1]];
    aEsperar(st);
    R.tocar(st, v[0]);
    R.tocar(st, v[1]);
    const ok = R.comparar(st);
    assert.ok(ok.correcto);
    assert.strictEqual(st.estado, E.CORRECT_FEEDBACK);
    assert.strictEqual(st.correctos, 1);
    assert.strictEqual(R.comparar(st), null, "no se compara dos veces");

    const st2 = R.crear(cfg, semilla(4));
    const v2 = R.visiblesActuales(st2);
    st2.secuencias[0][0] = [v2[0], v2[1]];
    aEsperar(st2);
    R.tocar(st2, v2[1]);
    R.tocar(st2, v2[0]);
    const mal = R.comparar(st2);
    assert.strictEqual(mal.correcto, false);
    assert.strictEqual(mal.primerError, 0);
    assert.strictEqual(st2.estado, E.INCORRECT_FEEDBACK);
    assert.strictEqual(st2.correctos, 0);
});

prueba("reintento: la secuencia no cambia, no se pierde progreso ni se agregan ítems", function () {
    const st = R.crear(cfg, semilla(5));
    aEsperar(st);
    const sec = R.secuenciaActual(st).slice();
    const visRe = R.visiblesActuales(st);
    R.tocar(st, sec[1] === sec[0] ? visRe.find(function (a) { return a !== sec[0]; }) : sec[1]);
    R.tocar(st, sec[0]);
    assert.strictEqual(R.comparar(st).correcto, false);
    assert.ok(R.reintentar(st, true));
    assert.strictEqual(st.estado, E.SHOWING_SEQUENCE);
    assert.deepStrictEqual(R.secuenciaActual(st), sec);
    assert.strictEqual(st.item, 0);
    assert.strictEqual(st.errores, 1);
    R.pasar(st, E.WAITING_INPUT);
    R.tocar(st, sec[0]);
    R.tocar(st, sec[1]);
    assert.ok(R.comparar(st).correcto);
    assert.strictEqual(R.progreso(st, cfg).total, 6);
    assert.strictEqual(st.correctos, 1);
});

prueba("partida completa: 6 aciertos con 2, 2, 2, 3, 3 y 3 toques → VICTORY", function () {
    const st = R.crear(cfg, semilla(9));
    const pasos = [];
    for (let k = 0; k < 6; k++) {
        aEsperar(st);
        const sec = R.secuenciaActual(st);
        assert.strictEqual(sec.length, [2, 2, 2, 3, 3, 3][k]);
        sec.forEach(function (a, n) {
            const r = R.tocar(st, a);
            assert.ok(r.ok);
            assert.strictEqual(r.completa, n === sec.length - 1, "solo el último toque completa");
        });
        assert.strictEqual(R.tocar(st, R.visiblesActuales(st)[0]).ok, false, "no hay toque de más");
        assert.ok(R.comparar(st).correcto);
        assert.strictEqual(R.progreso(st, cfg).hechos, k + 1);
        pasos.push(R.avanzar(st, cfg));
        assert.strictEqual(R.avanzar(st, cfg), null, "segundo aviso ignorado");
    }
    assert.deepStrictEqual(pasos, ["item", "item", "item", "item", "item", "victoria"]);
    assert.strictEqual(st.estado, E.VICTORY);
    assert.strictEqual(R.progreso(st, cfg).fraccion, 1);
});

prueba("en el ítem más largo (3 movimientos) el error en el 3.º se detecta y la secuencia no cambia", function () {
    const st = R.crear(cfg, semilla(11));
    st.item = 5;                       // último ítem: 3 movimientos
    aEsperar(st);
    const sec = R.secuenciaActual(st).slice();
    assert.strictEqual(sec.length, 3, "el ítem más largo tiene 3 movimientos");
    const otra = R.visiblesActuales(st).find(function (a) { return a !== sec[2]; });
    [sec[0], sec[1], otra].forEach(function (a) { R.tocar(st, a); });
    const c = R.comparar(st);
    assert.strictEqual(c.correcto, false);
    assert.strictEqual(c.primerError, 2);
    assert.ok(R.reintentar(st, true));
    assert.deepStrictEqual(R.secuenciaActual(st), sec);
});

prueba("aviso cuando la secuencia se alarga", function () {
    assert.strictEqual(R.plantilla(cfg.textos.cambioLargo, { cuantos: cfg.textos.cuantos["3"] }), "¡Ahora son tres movimientos! ¡Mira con atención!");
});

prueba("textos del enunciado (literales)", function () {
    const t = cfg.textos;
    assert.strictEqual(t.bienvenida, "¡Simón dice... muévete con memoria! Mira bien lo que hago y luego repite los mismos dos movimientos en el mismo orden.");
    assert.strictEqual(t.demoInstruccion, "¡Observa con atención! Primero hago un movimiento y después otro. ¡Recuerda el orden!");
    assert.strictEqual(t.demoZoe, "¡Primero cabeza y después aplauso! Toca los botones en ese orden.");
    assert.strictEqual(t.tuTurno, "¡AHORA ES TU TURNO!");
    assert.strictEqual(t.observa, "¡Observa bien los movimientos y recuerda el orden!");
    assert.strictEqual(t.faseRepite, "¡REPITE LA SECUENCIA!");
    assert.strictEqual(t.aciertoZoe + " " + R.plantilla(t.aciertoZeus, { cuantos: t.cuantos["2"] }), "¡MUY BIEN! Recordaste los dos movimientos en el orden correcto. ¡Sigamos jugando!");
    assert.strictEqual(R.plantilla(t.aciertoZeus, { cuantos: t.cuantos["3"] }), "Recordaste los tres movimientos en el orden correcto. ¡Sigamos jugando!");
    assert.strictEqual(t.finalSub, "Recordaste 6 secuencias de 2 y 3 movimientos.");
    assert.strictEqual(t.errorZeus, "¡Casi! Recuerda los movimientos que hice. ¡Intentémoslo de nuevo!");
    assert.strictEqual(t.ayudaZoe, "¡Recuerda los movimientos que hizo Zeus! ¡Intenta repetirlos en el mismo orden!");
    assert.strictEqual(t.rondaLista, "¡Excelente! Completaste esta ronda. ¡Vamos por la siguiente!");
    assert.strictEqual(t.finalTitulo, "¡ERES UN CAMPEÓN DE LA MEMORIA CORPORAL!");
    assert.strictEqual(t.finalZoe + " " + t.finalZeus, "¡FANTÁSTICO! Completaste Simón Dice Corporal. ¡Tu cuerpo y tu mente trabajan juntos!");
    assert.strictEqual(t.botonOtraVez, "VOLVER A JUGAR");
    assert.strictEqual(t.botonContinuar, "CONTINUAR");
    assert.deepStrictEqual(R.ACCIONES.map(function (a) { return R.accion(cfg, a).voz; }),
        ["¡Cabeza!", "¡Aplaudir!", "¡Zapatear!", "¡Saltar!", "¡Tocar los pies!", "¡Abrir los brazos!"]);
    assert.strictEqual(t.presentaBotones, "Estos son mis seis movimientos:");
    assert.strictEqual(t.cambioOpciones, "¡Mira! Cambiaron los botones. Estos son los de ahora.");
});

prueba("el modelo del juego trae un clip propio para cada uno de los seis movimientos", function () {
    const glb = path.join(carpeta, "zeus_animado_suave.glb");
    assert.ok(fs.existsSync(glb), "falta zeus_animado_suave.glb");
    // leer el JSON del GLB (cabecera de 12 bytes + 8 del trozo JSON)
    const buf = fs.readFileSync(glb);
    assert.strictEqual(buf.toString("utf8", 0, 4), "glTF");
    const largo = buf.readUInt32LE(12);
    const json = JSON.parse(buf.toString("utf8", 20, 20 + largo));
    const clips = (json.animations || []).map(function (a) { return a.name; });
    // zeus-3d.js mapea cada movimiento a uno de estos clips
    const esperados = {
        cabeza: "Tocar_cabeza",
        aplaudir: "Aplaudir",
        zapatear: "Zapatear",
        saltar: "Saltar",
        tocarPies: "Tocar_pies",
        abrirBrazos: "Abrir_brazos"
    };
    const zeus = fs.readFileSync(path.join(carpeta, "zeus-3d.js"), "utf8");
    R.ACCIONES.forEach(function (a) {
        const clip = esperados[a];
        assert.ok(clip, "sin clip previsto para " + a);
        assert.ok(clips.indexOf(clip) >= 0, "el modelo no trae el clip " + clip);
        assert.ok(new RegExp(a + ':\\s*\\{\\s*clip:\\s*"' + clip + '"').test(zeus), a + " no usa el clip " + clip);
    });
    // los clips de reposo y los gestos que usa el juego también están
    ["Quieto", "Hablar", "Celebrar", "Saludar", "Senalar", "Bailar"].forEach(function (c) {
        assert.ok(clips.indexOf(c) >= 0, "falta el clip " + c);
    });
    // ya no quedan poses por código
    assert.ok(!/const POSES/.test(zeus), "zeus-3d.js todavía tiene poses por código");
});

prueba("cada acción tiene su dibujo SVG propio", function () {
    R.ACCIONES.forEach(function (a) {
        const svg = I.svg(a);
        assert.ok(/^<svg[\s\S]*<\/svg>$/.test(svg), a);
        assert.ok(/viewBox="0 0 200 200"/.test(svg));
    });
});

prueba("ambientes.sql: una sola fila del juego, temática 31, Polimotor, sin tocar las demás", function () {
    const sql = fs.readFileSync(path.join(raiz, "database", "ambientes.sql"), "utf8");
    const filas = sql.match(/\('simon-dice-corporal',[^\n]*\)/g) || [];
    assert.strictEqual(filas.length, 1, "debe haber exactamente una fila");
    assert.ok(filas[0].startsWith("('simon-dice-corporal',7,11,31,9,'catalogo_juegos/Polimotor/SimonDiceCorporal','Simón Dice Corporal',"));
    assert.ok(/'simon-dice\.png'/.test(filas[0]));
    assert.ok(fs.existsSync(path.join(carpeta, "simon-dice.png")), "falta el icono");
    assert.strictEqual((sql.match(/\('memorama-partes-cuerpo',/g) || []).length, 1);
});

console.log("\n" + pasadas + " pruebas pasadas" + (process.exitCode ? " (con fallas)" : ""));
