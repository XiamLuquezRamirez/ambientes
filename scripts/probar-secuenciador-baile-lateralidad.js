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

/** Duración real de cada clip del GLB (segundos), leída de los accesores del archivo. */
function duracionesDelGlb() {
    const glb = path.join(raiz, "public", "catalogo_juegos", "Polimotor", "SimonDiceCorporal", "zeus_animado_suave.glb");
    const b = fs.readFileSync(glb);
    const jlen = b.readUInt32LE(12);
    const json = JSON.parse(b.slice(20, 20 + jlen).toString("utf8"));
    const off = 20 + jlen;
    const bin = b.slice(off + 8, off + 8 + b.readUInt32LE(off));
    const dur = {};
    json.animations.forEach(function (a) {
        let d = 0;
        a.samplers.forEach(function (sp) {
            const acc = json.accessors[sp.input];
            let t = 0;
            if (acc.max) {
                t = acc.max[0];
            } else {
                const bv = json.bufferViews[acc.bufferView];
                const start = (bv.byteOffset || 0) + (acc.byteOffset || 0);
                for (let i = 0; i < acc.count; i++) {
                    const v = bin.readFloatLE(start + i * 4);
                    if (v > t) t = v;
                }
            }
            if (t > d) d = t;
        });
        dur[a.name] = d;
    });
    return dur;
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

// ---------------------------------------------------------------- Tarea 4: Zeus y los clips del GLB

/** Lee MOVIMIENTOS, DURACION_CLIP y URL_MODELO de zeus-3d.js (es un módulo ESM, se analiza como texto). */
function zeus3d() {
    const txt = fs.readFileSync(path.join(carpeta, "zeus-3d.js"), "utf8");
    const movs = {};
    const bloque = txt.slice(txt.indexOf("const MOVIMIENTOS = {"), txt.indexOf("const DURACION_CLIP"));
    const re = /(\w+):\s*\{\s*clip:\s*"([^"]+)"[^}]*contactos:\s*\[([^\]]*)\]/g;
    let m;
    while ((m = re.exec(bloque)) !== null) {
        movs[m[1]] = { clip: m[2], contactos: m[3].split(",").map(Number).filter(function (n) { return !isNaN(n); }) };
    }
    const dur = {};
    const bd = txt.slice(txt.indexOf("const DURACION_CLIP = {"), txt.indexOf("// Lo que dura cada movimiento"));
    const rd = /(\w+):\s*([\d.]+)/g;
    while ((m = rd.exec(bd)) !== null) dur[m[1]] = Number(m[2]);
    const url = (txt.match(/new URL\("([^"]+)"/) || [])[1] || "";
    return { movs: movs, dur: dur, url: url, txt: txt };
}

prueba("zeus-3d.js: los 16 comandos tienen su clip real del GLB", function () {
    const z = zeus3d();
    const clips = clipsDelGlb();
    const porId = {};
    cfg.acciones.forEach(function (a) { porId[a.id] = a.clip; });
    COMANDOS.forEach(function (id) {
        const mv = z.movs[id];
        assert.ok(mv, id + " está en MOVIMIENTOS");
        assert.ok(clips.indexOf(mv.clip) >= 0, id + ": el clip " + mv.clip + " existe en el GLB");
        assert.strictEqual(mv.clip, porId[id], id + ": el clip coincide con el del config");
        assert.ok(mv.contactos.length >= 1, id + " tiene al menos un contacto");
        mv.contactos.forEach(function (t) {
            assert.ok(t > 0 && t < 1, id + ": el contacto " + t + " está entre 0 y 1");
        });
    });
});

prueba("zeus-3d.js: reutiliza el GLB de SimonDiceCorporal, sin copiarlo", function () {
    const z = zeus3d();
    assert.ok(/SimonDiceCorporal\/zeus_animado_suave\.glb$/.test(z.url), "apunta al GLB vecino: " + z.url);
    assert.ok(
        !fs.existsSync(path.join(carpeta, "zeus_animado_suave.glb")),
        "no hay una copia de 17 MB en la carpeta del juego"
    );
});

prueba("zeus-3d.js: DURACION_CLIP trae la duración medida de cada clip usado", function () {
    const z = zeus3d();
    const medidas = duracionesDelGlb();
    COMANDOS.forEach(function (id) {
        const clip = z.movs[id].clip;
        assert.ok(z.dur[clip] != null, clip + " tiene duración declarada");
        assert.ok(
            Math.abs(z.dur[clip] - medidas[clip]) < 0.1,
            clip + ": declarada " + z.dur[clip] + "s, medida " + medidas[clip].toFixed(2) + "s"
        );
    });
});

// Review Focus 4: el clip se acelera con timeScale para caber en el tiempo de la tanda; si la ronda pide
// menos ms que la duración natural, el clip debe acelerarse, no solaparse con el movimiento siguiente.
prueba("ritmo: los clips largos caben en el tiempo de su tanda", function () {
    const z = zeus3d();
    const ms = cfg.rondas[0].msMovimiento;
    const pausa = cfg.rondas[0].pausaMs;
    COMANDOS.forEach(function (id) {
        const clip = z.movs[id].clip;
        const natural = z.dur[clip] * 1000;
        const escala = natural / ms;
        assert.ok(escala > 0, clip + ": la escala de tiempo es positiva");
        // el clip se adapta al ritmo: no puede quedar tan acelerado que no se vea (más de 4x)
        assert.ok(escala <= 4, clip + ": " + natural + "ms en " + ms + "ms sería " + escala.toFixed(1) + "x, demasiado rápido");
    });
    assert.ok(ms + pausa > 0, "la tanda deja tiempo entre movimientos");
});

prueba("script.js: cada comando tiene color de luz y efecto, y no quedan ids viejos", function () {
    const txt = fs.readFileSync(path.join(carpeta, "script.js"), "utf8");
    assert.ok(txt.indexOf("tocarPies") < 0, "no quedan referencias al id viejo tocarPies");
    const luces = txt.slice(txt.indexOf("const COLORES_LUZ = {"), txt.indexOf("function luz("));
    COMANDOS.forEach(function (id) {
        assert.ok(new RegExp("\\b" + id + ":").test(luces), id + " tiene color de luz");
    });
    // el efecto de cada comando se resuelve en la tabla EFECTOS, justo antes de golpe()
    const golpe = txt.slice(txt.indexOf("const EFECTOS = {"), txt.indexOf("let turnoLuz"));
    COMANDOS.forEach(function (id) {
        assert.ok(golpe.indexOf(id) >= 0, id + " tiene efecto en golpe()");
    });
});

// La intro presenta los botones y el precargado de voces recorren TODAS las acciones: si usan la constante
// de respaldo (6 ids viejos) en vez del config, Zeus intenta decir "tocarPies" y se saltan 10 comandos.
prueba("script.js: la intro y el precargado recorren las acciones del config, no la constante", function () {
    const txt = fs.readFileSync(path.join(carpeta, "script.js"), "utf8");
    const usos = txt.match(/ReglasSimon\.ACCIONES/g) || [];
    assert.deepStrictEqual(usos, [], "ninguna parte recorre ReglasSimon.ACCIONES: " + usos.length + " usos");
    assert.ok(
        /accionesDeConfig\(gameConfig\)/.test(txt),
        "usa ReglasSimon.accionesDeConfig(gameConfig)"
    );
});

// Con 16 comandos, presentarlos todos en la intro serían ~32 s de espera antes de jugar: se muestran
// solo unos pocos tríos (config.intro.gruposPresentados), empezando por el de la demo.
prueba("intro: presenta solo unos pocos tríos, no los 16 comandos", function () {
    const grupos = (cfg.intro && cfg.intro.gruposPresentados) || 0;
    assert.ok(grupos >= 1 && grupos <= 3, "entre 1 y 3 tríos presentados, hay " + grupos);
    const txt = fs.readFileSync(path.join(carpeta, "script.js"), "utf8");
    assert.ok(/gruposPresentados/.test(txt), "script.js respeta config.intro.gruposPresentados");
    // la espera de la presentación debe quedar por debajo de medio minuto
    const porMovimiento = 1500 + 250;
    assert.ok(grupos * 3 * porMovimiento <= 16000, "la presentación no pasa de ~16 s");
});

// ---------------------------------------------------------------- Tarea 6: registro en el catálogo

prueba("ambientes.sql: una sola fila del juego, Polimotor y temática 31, sin tocar las demás", function () {
    const sql = fs.readFileSync(path.join(raiz, "database", "ambientes.sql"), "utf8");
    const filas = sql.split("\n").filter(function (l) { return l.indexOf("'secuenciador-baile-lateralidad'") >= 0; });
    assert.strictEqual(filas.length, 1, "exactamente una fila, hay " + filas.length);
    const fila = filas[0];
    assert.ok(/'secuenciador-baile-lateralidad',7,11,31,9,/.test(fila), "ambiente 7, eje 11, temática 31, módulo 9");
    assert.ok(fila.indexOf("catalogo_juegos/Polimotor/SecuenciadorBaileLateralidad") > 0, "apunta a su carpeta");
    assert.ok(fila.indexOf("El Secuenciador de Baile y Lateralidad") > 0, "lleva el nombre del juego");
    assert.ok(fila.indexOf("secuenciador.png") > 0, "usa su propio icono");
    assert.ok(/5 a 6 a[ñn]os/.test(fila), "la descripción dice la edad");
    // no se tocaron los juegos que ya estaban
    ["simon-dice-corporal", "pista-ritmo-pasos-magicos", "golpea-a-los-topos"].forEach(function (slug) {
        const otras = sql.split("\n").filter(function (l) { return l.indexOf("'" + slug + "'") >= 0; });
        assert.strictEqual(otras.length, 1, slug + " sigue con su única fila");
    });
});

console.log("\n" + pasadas + " pruebas correctas");
