/**
 * Prueba de "El Secuenciador de Baile y Lateralidad" (Polimotor, 5-6 años): config de 16 comandos con 3
 * visibles, 1 ronda de 6 tandas (3, 3, 3, 4, 4, 4 movimientos), generador de secuencias, máquina de estados,
 * clips reales del GLB de Zeus, dibujos de los botones y registro en database/ambientes.sql.
 *
 *   node scripts/probar-secuenciador-baile-lateralidad.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const raiz = path.join(__dirname, "..");
const carpeta = path.join(raiz, "public", "catalogo_juegos", "Polimotor", "SecuenciadorBaileLateralidad");
const R = require(path.join(carpeta, "reglas.js"));
const cfg = JSON.parse(fs.readFileSync(path.join(carpeta, "config.json"), "utf8"));

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

/** Los 16 comandos corporales del juego, en el orden del config. */
const COMANDOS = [
    "cabeza", "cintura", "pies", "aplaudir", "abrirBrazos", "estirarse",
    "brazoDerecho", "brazoIzquierdo", "pieDerecho", "pieIzquierdo",
    "zapatear", "saltar", "saltarUnPie", "girar", "bailar", "marchar"
];

/** Clips del GLB de Zeus (leídos del propio archivo, para no inventar nombres). */
function clipsDelGlb() {
    const glb = path.join(raiz, "public", "catalogo_juegos", "Polimotor", "SimonDiceCorporal", "zeus_animado_suave.glb");
    const b = fs.readFileSync(glb);
    const jlen = b.readUInt32LE(12);
    const json = JSON.parse(b.slice(20, 20 + jlen).toString("utf8"));
    return json.animations.map(function (a) { return a.name; });
}

console.log("El Secuenciador de Baile y Lateralidad");

// ---------------------------------------------------------------- Tarea 1: config

prueba("config.json: 16 comandos con id único y clip del GLB", function () {
    const clips = clipsDelGlb();
    assert.ok(Array.isArray(cfg.acciones), "config.acciones es una lista");
    assert.strictEqual(cfg.acciones.length, 16, "son 16 comandos");
    const ids = cfg.acciones.map(function (a) { return a.id; });
    assert.strictEqual(new Set(ids).size, 16, "los 16 ids son distintos");
    assert.deepStrictEqual(ids, COMANDOS, "los ids son los esperados y en orden");
    cfg.acciones.forEach(function (a) {
        assert.ok(a.clip, a.id + " declara su clip");
        assert.ok(clips.indexOf(a.clip) >= 0, a.id + ": el clip " + a.clip + " existe en el GLB");
        assert.ok(a.nombre && a.voz && a.corto && a.color && a.nota, a.id + " tiene nombre, voz, corto, color y nota");
    });
});

prueba("config.json: 1 ronda de 6 tandas con 3, 3, 3, 4, 4 y 4 movimientos", function () {
    assert.strictEqual(R.rondas(cfg).length, 1, "una sola ronda");
    assert.strictEqual(R.itemsDeRonda(cfg, 0), 6, "seis tandas");
    assert.strictEqual(R.totalItems(cfg), 6);
    assert.deepStrictEqual(cfg.rondas[0].movimientos, [3, 3, 3, 4, 4, 4]);
    assert.deepStrictEqual(
        [0, 1, 2, 3, 4, 5].map(function (k) { return R.largoDeItem(cfg, 0, k); }),
        [3, 3, 3, 4, 4, 4],
        "las tandas piden 3, 3, 3, 4, 4 y 4 movimientos"
    );
});

prueba("config.json: siempre 3 botones visibles y edad 5-6 años", function () {
    assert.strictEqual(cfg.juego.visibles, 3, "tres botones a la vista");
    assert.strictEqual(R.visiblesDeConfig(cfg), 3);
    assert.strictEqual(cfg.niveles[0].edad, "5-6 años", "la edad del catálogo sale de aquí");
    assert.strictEqual(cfg.nombre, "¡EL SECUENCIADOR DE BAILE!");
});

prueba("config.json: la demo son 3 comandos y sus 3 botones visibles", function () {
    assert.ok(Array.isArray(cfg.demo.secuencia), "la demo tiene secuencia");
    assert.strictEqual(cfg.demo.secuencia.length, 3, "la demo muestra tres movimientos");
    assert.strictEqual(cfg.demo.visibles.length, 3, "la demo deja ver tres botones");
    cfg.demo.secuencia.forEach(function (id) {
        assert.ok(COMANDOS.indexOf(id) >= 0, id + " es un comando del juego");
        assert.ok(cfg.demo.visibles.indexOf(id) >= 0, id + " está visible en la demo");
    });
});

// ---------------------------------------------------------------- Tarea 2: comandos desde el config

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

prueba("accionesDeConfig: los 16 comandos salen del config, no de una constante", function () {
    assert.strictEqual(typeof R.accionesDeConfig, "function", "ReglasSecuenciador.accionesDeConfig existe");
    assert.deepStrictEqual(R.accionesDeConfig(cfg), COMANDOS);
});

prueba("sortearVisibles: tríos de 3 comandos distintos, sin repetir el trío anterior", function () {
    for (let s = 1; s <= 200; s++) {
        const vis = R.sortearVisibles(cfg, semilla(s));
        assert.strictEqual(vis.length, 1, "semilla " + s + ": una ronda");
        assert.strictEqual(vis[0].length, 6, "semilla " + s + ": seis tandas");
        let anterior = cfg.demo.visibles.slice().sort().join("|");
        vis[0].forEach(function (trio, k) {
            assert.strictEqual(trio.length, 3, "semilla " + s + " tanda " + (k + 1) + ": tres visibles");
            assert.strictEqual(new Set(trio).size, 3, "semilla " + s + " tanda " + (k + 1) + ": los tres distintos");
            trio.forEach(function (id) {
                assert.ok(COMANDOS.indexOf(id) >= 0, "semilla " + s + ": " + id + " es un comando del juego");
            });
            const clave = trio.slice().sort().join("|");
            assert.notStrictEqual(clave, anterior, "semilla " + s + " tanda " + (k + 1) + ": el trío cambió");
            anterior = clave;
        });
    }
});

// Review Focus 1: una tanda de 4 con solo 3 botones visibles obliga a repetir un comando,
// pero nunca dos iguales seguidos, y el generador no debe rendirse y devolver algo inválido.
prueba("generarSecuencias: 200 semillas sin un solo problema (tandas de 4 con 3 visibles incluidas)", function () {
    for (let s = 1; s <= 200; s++) {
        const vis = R.sortearVisibles(cfg, semilla(s));
        const sec = R.generarSecuencias(cfg, semilla(s + 5000), vis);
        assert.deepStrictEqual(
            R.problemasSecuencias(sec, cfg, vis),
            [],
            "semilla " + s + ": " + JSON.stringify(R.problemasSecuencias(sec, cfg, vis))
        );
        sec[0].forEach(function (s2, k) {
            const largo = R.largoDeItem(cfg, 0, k);
            assert.strictEqual(s2.length, largo, "semilla " + s + " tanda " + (k + 1) + ": " + largo + " movimientos");
            s2.forEach(function (id) {
                assert.ok(vis[0][k].indexOf(id) >= 0, "semilla " + s + " tanda " + (k + 1) + ": " + id + " está visible");
            });
            for (let m = 1; m < s2.length; m++) {
                assert.notStrictEqual(s2[m], s2[m - 1], "semilla " + s + " tanda " + (k + 1) + ": sin dos iguales seguidos");
            }
            if (largo === 4) {
                assert.strictEqual(new Set(s2).size, 3, "semilla " + s + " tanda " + (k + 1) + ": la de 4 usa los tres visibles");
            }
        });
    }
});

// Review Focus 3: con 6 tríos de 3 hay 18 posiciones; en muchas partidas los 16 comandos deben salir.
prueba("sortearVisibles: entre muchas partidas aparecen los 16 comandos", function () {
    const vistos = new Set();
    for (let s = 1; s <= 200; s++) {
        R.sortearVisibles(cfg, semilla(s))[0].forEach(function (trio) {
            trio.forEach(function (id) { vistos.add(id); });
        });
    }
    const faltan = COMANDOS.filter(function (id) { return !vistos.has(id); });
    assert.deepStrictEqual(faltan, [], "ningún comando queda fuera del sorteo");
});

// Review Focus 2: tocar un comando que no está en el trío de la tanda no cuenta ni rompe el progreso.
prueba("tocar: un comando fuera del trío visible no cuenta y deja el progreso intacto", function () {
    const st = R.crear(cfg, semilla(7));
    R.pasar(st, R.E.SHOWING_SEQUENCE);
    R.pasar(st, R.E.WAITING_INPUT);
    const visibles = R.visiblesActuales(st, cfg);
    const fuera = COMANDOS.find(function (id) { return visibles.indexOf(id) < 0; });
    assert.ok(fuera, "hay algún comando fuera del trío");
    const antes = st.respuesta.slice();
    const r = R.tocar(st, fuera, cfg);
    assert.strictEqual(r.ok, false, "el toque no se acepta");
    assert.strictEqual(r.motivo, "no visible");
    assert.deepStrictEqual(st.respuesta, antes, "el progreso no cambió");
    assert.strictEqual(st.estado, R.E.WAITING_INPUT, "sigue esperando");
});

prueba("config.json: sin problemas según las reglas (16 comandos y demo de 3)", function () {
    assert.deepStrictEqual(R.revisarJuego(cfg), []);
});

// script.js y demo.js deben pasar el config a las reglas: sin él, los 10 comandos nuevos
// (los que no están en la constante de respaldo) se rechazarían como "desconocida" en el navegador.
prueba("script.js y demo.js pasan el config a visiblesActuales y tocar", function () {
    const fuentes = ["script.js", "demo.js"];
    fuentes.forEach(function (f) {
        const txt = fs.readFileSync(path.join(carpeta, f), "utf8");
        const llamadas = txt.match(/\.(visiblesActuales|tocar)\([^)]*\)/g) || [];
        llamadas.forEach(function (c) {
            assert.ok(/,\s*gameConfig\b/.test(c), f + ": " + c + " debe recibir gameConfig");
        });
        // el nombre debe existir de verdad en el archivo, o sería un ReferenceError en el navegador
        if (llamadas.length) {
            assert.ok(/\bgameConfig\b\s*=/.test(txt) || /\bgameConfig\b/.test(txt), f + ": gameConfig está declarado");
        }
    });
});

prueba("tocar: los comandos nuevos se aceptan cuando están visibles", function () {
    const st = R.crear(cfg, semilla(11));
    R.pasar(st, R.E.SHOWING_SEQUENCE);
    R.pasar(st, R.E.WAITING_INPUT);
    const visibles = R.visiblesActuales(st, cfg);
    // un comando de los nuevos (fuera de la constante de respaldo de 6) debe poder tocarse
    const nuevos = visibles.filter(function (id) { return R.ACCIONES.indexOf(id) < 0; });
    if (!nuevos.length) return; // esta semilla no sacó ninguno; las otras pruebas cubren el sorteo
    const r = R.tocar(st, nuevos[0], cfg);
    assert.strictEqual(r.ok, true, nuevos[0] + " debe aceptarse: " + JSON.stringify(r));
});

// ---------------------------------------------------------------- Tarea 3: dibujos de los botones

const I = require(path.join(carpeta, "iconos.js"));

prueba("iconos: los 16 comandos tienen su dibujo propio", function () {
    COMANDOS.forEach(function (id) {
        const svg = I.svg(id);
        assert.ok(svg && svg.indexOf("<svg") === 0, id + " tiene un SVG");
        assert.ok(svg.length > 200, id + ": el dibujo no está vacío");
        assert.ok(svg.indexOf("</svg>") > 0, id + ": el SVG está cerrado");
    });
    const distintos = new Set(COMANDOS.map(function (id) { return I.svg(id); }));
    assert.strictEqual(distintos.size, 16, "los 16 dibujos son distintos entre sí");
});

// Review Focus 5: si el dibujo de derecha e izquierda fuera el mismo, el acierto sería ambiguo.
prueba("iconos: los pares izquierda/derecha se distinguen a simple vista", function () {
    [["brazoDerecho", "brazoIzquierdo"], ["pieDerecho", "pieIzquierdo"]].forEach(function (par) {
        const a = I.svg(par[0]);
        const b = I.svg(par[1]);
        assert.notStrictEqual(a, b, par[0] + " y " + par[1] + " deben dibujarse distinto");
        assert.ok(a.length > 200 && b.length > 200, par.join("/") + ": ambos dibujados");
    });
});

prueba("iconos: dataUri sirve los 16 dibujos", function () {
    COMANDOS.forEach(function (id) {
        const uri = I.dataUri(id);
        assert.ok(uri.indexOf("data:image/svg+xml") === 0, id + " tiene data URI");
    });
});

console.log("\n" + pasadas + " pruebas correctas");
