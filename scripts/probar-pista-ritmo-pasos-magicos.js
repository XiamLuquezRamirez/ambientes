/**
 * Prueba de "¡La Pista de Ritmo y Pasos Mágicos!" (Polimotor, 3-4 años): reglas, generador de secuencias,
 * máquina de estados, config.json, textos pedidos por el enunciado, dibujos de las baldosas y registro en
 * database/ambientes.sql.
 *
 *   node scripts/probar-pista-ritmo-pasos-magicos.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const raiz = path.join(__dirname, "..");
const carpeta = path.join(raiz, "public", "catalogo_juegos", "Polimotor", "PistaRitmoPasosMagicos");
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

/** Juega un ítem entero acertando. Devuelve lo que dijo avanzar(). */
function acertarItem(st) {
    aEsperar(st);
    const sec = R.secuenciaActual(st).slice();
    sec.forEach(function (a) { R.tocar(st, a); });
    const c = R.comparar(st);
    assert.strictEqual(c.correcto, true, "debería acertar");
    return R.avanzar(st, cfg);
}

console.log("¡La Pista de Ritmo y Pasos Mágicos!");

// ------------------------------------------------------------------ config

prueba("config.json sin problemas (6 baldosas, 2 rondas de 4 ítems con 2 y 3 baldosas; demo pie → mano)", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
    assert.strictEqual(R.rondas(cfg).length, 2);
    assert.strictEqual(R.totalItems(cfg), 8);
    for (let i = 0; i < 2; i++) assert.strictEqual(R.itemsDeRonda(cfg, i), 4);
    assert.deepStrictEqual([0, 1].map(function (i) { return R.largoDeRonda(cfg, i); }), [2, 3]);
    assert.deepStrictEqual(cfg.demo.secuencia, ["pie", "mano"]);
    assert.deepStrictEqual(R.ACCIONES, ["pie", "mano", "carita", "rodilla", "hombro", "barriga"]);
});

prueba("cada baldosa tiene color, sonido propio, efecto (¡BUM!…) y nota distinta", function () {
    const sonidos = {};
    const efectos = {};
    const notas = {};
    R.ACCIONES.forEach(function (id) {
        const a = R.accion(cfg, id);
        assert.ok(a, "falta la baldosa " + id);
        assert.ok(/^#[0-9a-f]{6}$/i.test(a.color), id + ": color inválido");
        assert.ok(/^#[0-9a-f]{6}$/i.test(a.colorClaro), id + ": colorClaro inválido");
        assert.ok(!sonidos[a.sonido], "sonido repetido: " + a.sonido);
        assert.ok(!efectos[a.efecto], "efecto repetido: " + a.efecto);
        assert.ok(!notas[a.nota], "nota repetida: " + a.nota);
        sonidos[a.sonido] = efectos[a.efecto] = notas[a.nota] = 1;
    });
    // las tres baldosas del enunciado conservan su color y su efecto
    assert.strictEqual(R.accion(cfg, "pie").efecto, "¡BUM!");
    assert.strictEqual(R.accion(cfg, "mano").efecto, "¡TING!");
    assert.strictEqual(R.accion(cfg, "carita").efecto, "¡PLIM!");
});

prueba("la dificultad sube por ritmo: cada ronda es más rápida y con menos apoyo", function () {
    const r = R.rondas(cfg);
    for (let i = 1; i < r.length; i++) {
        assert.ok(r[i].msBaldosa < r[i - 1].msBaldosa, "la ronda " + (i + 1) + " debería ir más rápido");
        assert.ok(r[i].pausaMs < r[i - 1].pausaMs, "la ronda " + (i + 1) + " debería tener pausas más cortas");
    }
    assert.deepStrictEqual(r.map(function (x) { return x.apoyo; }), ["alto", "medio"]);
});

prueba("los textos del enunciado están en config.textos", function () {
    const t = cfg.textos;
    assert.ok(/encender la pista musical/i.test(t.bienvenida));
    assert.ok(/mismo orden/i.test(t.bienvenida));
    assert.ok(/presta mucha atención/i.test(t.demoInstruccion));
    assert.ok(/primero el pie y luego la mano/i.test(t.demoZoe));
    assert.strictEqual(t.tuTurno, "¡AHORA ES TU TURNO!");
    assert.strictEqual(t.faseRepite, "¡REPITE EL RITMO!");
    assert.ok(/increíble ritmo/i.test(t.aciertoZoe));
    assert.ok(/maestro de la memoria corporal/i.test(t.aciertoZeus));
    assert.ok(/casi lo logras/i.test(t.errorZeus));
    assert.strictEqual(t.finalTitulo, "¡ERES EL MAESTRO DEL RITMO!");
    assert.ok(/sigue el ritmo/i.test(t.ayudaZoe));
});

// ------------------------------------------------------------------ generador de secuencias

prueba("8 ítems: 4 de dos baldosas y 4 de tres, sin repetir reglas", function () {
    for (let s = 1; s <= 200; s++) {
        const sec = R.generarSecuencias(cfg, semilla(s));
        assert.deepStrictEqual(R.problemasSecuencias(sec, cfg), [], "semilla " + s);
        assert.strictEqual(sec.length, 2);
        sec.forEach(function (ronda, i) {
            assert.strictEqual(ronda.length, 4);
            ronda.forEach(function (it) { assert.strictEqual(it.length, [2, 3][i]); });
        });
    }
});

prueba("ninguna secuencia se repite seguida y el primer ítem nunca es la demo", function () {
    for (let s = 1; s <= 300; s++) {
        const plano = [].concat.apply([], R.generarSecuencias(cfg, semilla(s)));
        assert.ok(!R.iguales(plano[0], R.DEMO), "semilla " + s + ": el primer ítem repite la demo");
        for (let i = 1; i < plano.length; i++) {
            assert.ok(!R.iguales(plano[i], plano[i - 1]), "semilla " + s + ": ítems " + i + " y " + (i + 1) + " iguales");
        }
    }
});

prueba("las seis baldosas participan en las ocho actividades, repartidas", function () {
    for (let s = 1; s <= 300; s++) {
        const plano = [].concat.apply([], R.generarSecuencias(cfg, semilla(s)));
        const cuenta = {};
        R.ACCIONES.forEach(function (a) { cuenta[a] = 0; });
        plano.forEach(function (it) { it.forEach(function (a) { cuenta[a]++; }); });
        R.ACCIONES.forEach(function (a) {
            assert.ok(cuenta[a] > 0, "semilla " + s + ": la baldosa " + a + " no sale nunca");
        });
        const total = plano.reduce(function (n, it) { return n + it.length; }, 0);
        assert.strictEqual(total, 4 * 2 + 4 * 3, "semilla " + s + ": total de toques");
        const media = total / 6;
        R.ACCIONES.forEach(function (a) {
            assert.ok(cuenta[a] <= Math.ceil(media * 2), "semilla " + s + ": " + a + " acapara (" + cuenta[a] + ")");
        });
    }
});

prueba("con 3 baldosas no se repite la misma dos veces seguidas y hay al menos 3 distintas", function () {
    for (let s = 1; s <= 200; s++) {
        const sec = R.generarSecuencias(cfg, semilla(s));
        [1].forEach(function (ir) {
            sec[ir].forEach(function (it) {
                assert.ok(new Set(it).size >= 3, "semilla " + s + ": pocas baldosas distintas");
                for (let k = 1; k < it.length; k++) {
                    assert.notStrictEqual(it[k], it[k - 1], "semilla " + s + ": baldosa repetida seguida");
                }
            });
        });
    }
});

prueba("las 30 parejas distintas y las 6 repetidas de seis baldosas", function () {
    const c = R.combinaciones();
    assert.strictEqual(c.distintas.length, 30);
    assert.strictEqual(c.repetidas.length, 6);
});

// ------------------------------------------------------------------ máquina de estados

prueba("solo WAITING_INPUT acepta toques", function () {
    const st = R.crear(cfg, semilla(7));
    assert.strictEqual(st.estado, E.INTRO);
    assert.strictEqual(R.tocar(st, "pie").motivo, "bloqueado");
    R.pasar(st, E.DEMO);
    assert.strictEqual(R.tocar(st, "pie").motivo, "bloqueado");
    R.pasar(st, E.SHOWING_SEQUENCE);
    assert.strictEqual(R.tocar(st, "pie").motivo, "bloqueado");
    R.pasar(st, E.WAITING_INPUT);
    assert.strictEqual(R.tocar(st, "pie").ok, true);
});

prueba("no se aceptan más toques de los que tiene la secuencia", function () {
    const st = R.crear(cfg, semilla(11));
    aEsperar(st);
    const largo = R.secuenciaActual(st).length;
    assert.strictEqual(largo, 2);
    R.tocar(st, "pie");
    R.tocar(st, "mano");
    assert.strictEqual(st.estado, E.CHECKING_ANSWER);
    assert.strictEqual(R.tocar(st, "carita").motivo, "bloqueado");
    assert.strictEqual(st.respuesta.length, 2);
});

prueba("una baldosa desconocida no cuenta", function () {
    const st = R.crear(cfg, semilla(3));
    aEsperar(st);
    assert.strictEqual(R.tocar(st, "codo").motivo, "desconocida");
    assert.strictEqual(st.respuesta.length, 0);
});

prueba("el orden importa: las mismas baldosas al revés es error", function () {
    const st = R.crear(cfg, semilla(21));
    aEsperar(st);
    const sec = R.secuenciaActual(st).slice();
    if (sec[0] === sec[1]) return; // esta secuencia no distingue orden
    R.tocar(st, sec[1]);
    R.tocar(st, sec[0]);
    const c = R.comparar(st);
    assert.strictEqual(c.correcto, false);
    assert.strictEqual(c.primerError, 0);
    assert.strictEqual(st.estado, E.INCORRECT_FEEDBACK);
});

prueba("el error no quita progreso y la secuencia no cambia al reintentar", function () {
    const st = R.crear(cfg, semilla(33));
    aEsperar(st);
    const antes = R.secuenciaActual(st).slice();
    const hechos = st.correctos;
    const malo = R.ACCIONES.find(function (a) { return a !== antes[0]; });
    R.tocar(st, malo);
    R.tocar(st, antes[1] === malo ? antes[0] : antes[1]);
    R.comparar(st);
    assert.strictEqual(st.correctos, hechos, "no debe perder progreso");
    assert.strictEqual(R.reintentar(st, true), true);
    assert.strictEqual(st.estado, E.SHOWING_SEQUENCE);
    assert.deepStrictEqual(R.secuenciaActual(st), antes, "la secuencia no debe cambiar");
    assert.strictEqual(st.respuesta.length, 0);
});

prueba("comparar y avanzar no se pueden ejecutar dos veces (sin avances dobles)", function () {
    const st = R.crear(cfg, semilla(44));
    aEsperar(st);
    R.secuenciaActual(st).forEach(function (a) { R.tocar(st, a); });
    assert.ok(R.comparar(st));
    assert.strictEqual(R.comparar(st), null, "comparar dos veces");
    assert.strictEqual(R.avanzar(st, cfg), "item");
    assert.strictEqual(R.avanzar(st, cfg), null, "avanzar dos veces");
    assert.strictEqual(st.item, 1);
});

prueba("partida completa: 8 ítems, 2 rondas y victoria", function () {
    const st = R.crear(cfg, semilla(99));
    let items = 0;
    let rondas = 0;
    let fin = null;
    for (let i = 0; i < 40 && !fin; i++) {
        const r = acertarItem(st);
        items++;
        if (r === "ronda") {
            rondas++;
            R.siguienteRonda(st, cfg);
        } else if (r === "victoria") {
            fin = r;
        }
    }
    assert.strictEqual(items, 8);
    assert.strictEqual(rondas, 1);
    assert.strictEqual(fin, "victoria");
    assert.strictEqual(st.estado, E.VICTORY);
    assert.strictEqual(st.correctos, 8);
    const p = R.progreso(st, cfg);
    assert.strictEqual(p.hechos, 8);
    assert.strictEqual(p.total, 8);
    assert.strictEqual(p.fraccion, 1);
});

prueba("los errores no suman ni restan ítems del progreso", function () {
    const st = R.crear(cfg, semilla(55));
    aEsperar(st);
    const sec = R.secuenciaActual(st).slice();
    const malo = R.ACCIONES.find(function (a) { return a !== sec[0]; });
    for (let intento = 0; intento < 3; intento++) {
        R.tocar(st, malo);
        R.tocar(st, malo === sec[1] ? sec[0] : sec[1]);
        R.comparar(st);
        R.reintentar(st, true);
        R.pasar(st, E.WAITING_INPUT);
    }
    assert.strictEqual(R.progreso(st, cfg).hechos, 0);
    assert.strictEqual(st.erroresTotales, 3);
    sec.forEach(function (a) { R.tocar(st, a); });
    R.comparar(st);
    assert.strictEqual(R.progreso(st, cfg).hechos, 1);
});

prueba("volver a jugar genera secuencias nuevas y deja la demo fija", function () {
    const a = R.crear(cfg, Math.random);
    const b = R.crear(cfg, Math.random);
    assert.strictEqual(b.correctos, 0);
    assert.strictEqual(b.estado, E.INTRO);
    assert.deepStrictEqual(cfg.demo.secuencia, R.DEMO);
    const ka = JSON.stringify(a.secuencias);
    const kb = JSON.stringify(b.secuencias);
    // con 8 ítems de 2-3 baldosas entre seis, dos partidas idénticas serían un milagro
    assert.notStrictEqual(ka, kb);
});

// ------------------------------------------------------------------ dibujos

prueba("las seis baldosas tienen su dibujo SVG y su data URI", function () {
    R.ACCIONES.forEach(function (id) {
        const svg = I.svg(id);
        assert.ok(svg.indexOf("<svg") === 0, id + ": sin SVG");
        assert.ok(svg.indexOf('viewBox="0 0 200 200"') > 0, id + ": viewBox distinto");
        assert.ok(svg.trim().endsWith("</svg>"), id + ": SVG sin cerrar");
        assert.ok(I.dataUri(id).indexOf("data:image/svg+xml") === 0, id + ": sin data URI");
    });
});

// ------------------------------------------------------------------ archivos del juego y registro

prueba("la carpeta del juego tiene todos sus archivos", function () {
    ["index.html", "config.json", "style.css", "script.js", "reglas.js", "iconos.js",
        "sonidos.js", "escenario-phaser.js", "demo.js", "zoe-3d.js", "pista-ritmo.png"].forEach(function (f) {
        assert.ok(fs.existsSync(path.join(carpeta, f)), "falta " + f);
    });
});

prueba("index.html carga los módulos del juego y la capa de efectos", function () {
    const html = fs.readFileSync(path.join(carpeta, "index.html"), "utf8");
    ["reglas.js", "iconos.js", "sonidos.js", "escenario-phaser.js", "demo.js", "script.js", "zoe-3d.js"]
        .forEach(function (f) { assert.ok(html.indexOf(f) > 0, "index.html no carga " + f); });
    assert.ok(html.indexOf('id="pista"') > 0, "falta el contenedor de la pista");
    assert.ok(html.indexOf('id="efectos-phaser"') > 0, "falta la capa de efectos");
    assert.ok(html.indexOf("phaser.min.js") > 0, "falta Phaser");
});

prueba("script.js arma las baldosas desde las acciones y no deja botones sin función", function () {
    const js = fs.readFileSync(path.join(carpeta, "script.js"), "utf8");
    ["armarBaldosas", "alPulsar", "volverAJugar", "continuar", "victoria", "transicionRonda"]
        .forEach(function (f) { assert.ok(js.indexOf("function " + f) > 0, "falta " + f); });
    assert.ok(js.indexOf("ReglasPista.ACCIONES.forEach") > 0, "las baldosas deben salir de ACCIONES");
});

prueba("el juego está registrado una sola vez en database/ambientes.sql", function () {
    const sql = fs.readFileSync(path.join(raiz, "database", "ambientes.sql"), "utf8");
    const filas = sql.split("\n").filter(function (l) { return l.indexOf("'pista-ritmo-pasos-magicos'") >= 0; });
    assert.strictEqual(filas.length, 1, "debería haber exactamente una fila (hay " + filas.length + ")");
    const fila = filas[0];
    assert.ok(fila.indexOf("catalogo_juegos/Polimotor/PistaRitmoPasosMagicos") > 0, "ruta del juego");
    assert.ok(fila.indexOf("pista-ritmo.png") > 0, "imagen del juego");
    assert.ok(fila.indexOf("Prejardín (3 a 4 años)") > 0, "edad del catálogo");
    assert.ok(cfg.niveles.some(function (n) { return n.edad === "3-4 años"; }), "nivel 3-4");
    assert.ok(!cfg.niveles.some(function (n) { return /5-6/.test(n.edad); }), "no debe quedar como 5-6");
    // mismo tema (memoria corporal) y mismo nivel que el juego 2
    const simon = sql.split("\n").find(function (l) { return l.indexOf("'simon-dice-corporal'") >= 0; });
    assert.ok(simon, "no está el juego 2 para comparar");
    const campos = function (l) { return l.split(",").slice(1, 5).join(","); };
    assert.strictEqual(campos(fila), campos(simon), "ambiente, tema y nivel deberían coincidir con el juego 2");
});

prueba("ambientes.sql conserva los juegos anteriores", function () {
    const sql = fs.readFileSync(path.join(raiz, "database", "ambientes.sql"), "utf8");
    ["'simon-dice-corporal'", "'memorama-partes-cuerpo'", "'golpea-a-los-topos'", "'rompecabezas-del-cuerpo'"]
        .forEach(function (slug) { assert.ok(sql.indexOf(slug) > 0, "falta " + slug); });
});

console.log("\n" + pasadas + " pruebas pasadas" + (process.exitCode ? " (con fallas)" : ""));
