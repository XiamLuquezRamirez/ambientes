/**
 * ReglasSimon — lógica pura de "¡Simón Dice Corporal!" (window.ReglasSimon y module.exports para la prueba de node).
 *
 * No dibuja ni suena: genera las secuencias, lleva la máquina de estados y compara las respuestas, siempre por
 * identificador ("cabeza", "aplaudir", "zapatear", "saltar", "tocarPies", "abrirBrazos"), nunca por el texto visible.
 *
 * Hay SEIS movimientos, pero en la botonera solo se ven TRES a la vez: cada ítem sortea sus tres opciones
 * visibles (st.visibles[ronda][item]) y su secuencia se arma únicamente con esas tres, así que el niño
 * siempre tiene a la vista todo lo que Zeus hizo. Al cambiar de ítem la botonera se renueva con una
 * animación (eso lo hace script.js; aquí solo se decide qué trío va en cada ítem).
 *
 * Estados de la partida:
 *   INTRO → DEMO → SHOWING_SEQUENCE → WAITING_INPUT → CHECKING_ANSWER → CORRECT_FEEDBACK | INCORRECT_FEEDBACK
 *   CORRECT_FEEDBACK → SHOWING_SEQUENCE (siguiente ítem) | ROUND_TRANSITION (fin de ronda) | VICTORY (fin del juego)
 *   INCORRECT_FEEDBACK → SHOWING_SEQUENCE (misma secuencia otra vez) | WAITING_INPUT (reintento sin repetir)
 *   ROUND_TRANSITION → SHOWING_SEQUENCE
 * Solo en WAITING_INPUT se aceptan toques, y como mucho tantos como movimientos tenga la secuencia (2, 3 o 4).
 */
(function (global) {
    "use strict";

    var ACCIONES = ["cabeza", "aplaudir", "zapatear", "saltar", "tocarPies", "abrirBrazos"];
    var DEMO = ["cabeza", "aplaudir"];
    var VISIBLES = 3;                       // botones a la vista en cada ítem (config.juego.visibles)
    var VISIBLES_DEMO = ["cabeza", "aplaudir", "zapatear"]; // la demo necesita ver cabeza y aplaudir
    var LARGO = 2; // movimientos por ítem si la ronda no dice otra cosa (config.rondas[i].movimientos: número o lista por ítem, de 2 a 4)

    var E = {
        INTRO: "INTRO",
        DEMO: "DEMO",
        SHOWING_SEQUENCE: "SHOWING_SEQUENCE",
        WAITING_INPUT: "WAITING_INPUT",
        CHECKING_ANSWER: "CHECKING_ANSWER",
        CORRECT_FEEDBACK: "CORRECT_FEEDBACK",
        INCORRECT_FEEDBACK: "INCORRECT_FEEDBACK",
        ROUND_TRANSITION: "ROUND_TRANSITION",
        VICTORY: "VICTORY"
    };

    var TRANSICIONES = {
        INTRO: ["DEMO", "SHOWING_SEQUENCE"],
        DEMO: ["SHOWING_SEQUENCE"],
        SHOWING_SEQUENCE: ["WAITING_INPUT"],
        WAITING_INPUT: ["CHECKING_ANSWER"],
        CHECKING_ANSWER: ["CORRECT_FEEDBACK", "INCORRECT_FEEDBACK"],
        CORRECT_FEEDBACK: ["SHOWING_SEQUENCE", "ROUND_TRANSITION", "VICTORY"],
        INCORRECT_FEEDBACK: ["SHOWING_SEQUENCE", "WAITING_INPUT"],
        ROUND_TRANSITION: ["SHOWING_SEQUENCE"],
        VICTORY: []
    };

    // ------------------------------------------------------------------ utilidades

    function azar(rnd) {
        return typeof rnd === "function" ? rnd : Math.random;
    }

    function barajar(lista, rnd) {
        var r = azar(rnd);
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function clave(sec) {
        return sec.join(">");
    }

    function iguales(a, b) {
        return !!a && !!b && a.length === b.length && a.every(function (x, i) { return x === b[i]; });
    }

    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? String(datos[k]) : m;
        });
    }

    // ------------------------------------------------------------------ configuración

    function rondas(cfg) {
        var r = cfg && Array.isArray(cfg.rondas) ? cfg.rondas : [];
        return r.length ? r : [{ id: 1, items: 4 }, { id: 2, items: 4 }, { id: 3, items: 4 }];
    }

    function ronda(cfg, i) {
        var lista = rondas(cfg);
        return lista[Math.max(0, Math.min(lista.length - 1, i || 0))];
    }

    function itemsDeRonda(cfg, i) {
        var n = Number(ronda(cfg, i).items);
        return isFinite(n) && n > 0 ? Math.floor(n) : 4;
    }

    function totalItems(cfg) {
        var total = 0;
        for (var i = 0; i < rondas(cfg).length; i++) total += itemsDeRonda(cfg, i);
        return total;
    }

    /** Cuántos botones se ven a la vez (config.juego.visibles; por defecto 3, nunca más que las acciones). */
    function visiblesDeConfig(cfg) {
        var n = Number(cfg && cfg.juego && cfg.juego.visibles);
        if (!isFinite(n) || n < 2) n = VISIBLES;
        return Math.min(ACCIONES.length, Math.floor(n));
    }

    /** Los tres botones que se ven durante la demo (incluyen sí o sí los de la secuencia de demo). */
    function visiblesDemo(cfg) {
        var pedidos = (cfg && cfg.demo && cfg.demo.visibles) || VISIBLES_DEMO;
        var n = visiblesDeConfig(cfg);
        var lista = pedidos.filter(function (a) { return ACCIONES.indexOf(a) >= 0; });
        DEMO.forEach(function (a) { if (lista.indexOf(a) < 0) lista.unshift(a); });
        ACCIONES.forEach(function (a) { if (lista.length < n && lista.indexOf(a) < 0) lista.push(a); });
        return lista.slice(0, n);
    }

    function accion(cfg, id) {
        var lista = (cfg && cfg.acciones) || [];
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].id === id) return lista[i];
        }
        return null;
    }

    // ------------------------------------------------------------------ generador de secuencias

    /** Las parejas de dos movimientos distintos y las repetidas, sobre `lista` (por defecto, las seis acciones). */
    function combinaciones(lista) {
        var base = Array.isArray(lista) && lista.length ? lista : ACCIONES;
        var distintas = [];
        var repetidas = [];
        base.forEach(function (a) {
            base.forEach(function (b) {
                if (a === b) repetidas.push([a, b]);
                else distintas.push([a, b]);
            });
        });
        return { distintas: distintas, repetidas: repetidas };
    }

    /**
     * Sortea los movimientos visibles de cada ítem: [[trío del ítem 1, trío del ítem 2, …], …] por ronda.
     * Cada trío son `visibles` acciones distintas de las seis, en orden al azar, y nunca repite el mismo
     * trío (mismas tres acciones, sin importar el orden) que el ítem anterior: así el cambio siempre se nota.
     * El primer ítem tampoco repite el trío de la demo.
     */
    function sortearVisibles(cfg, rnd) {
        var r = azar(rnd);
        var n = visiblesDeConfig(cfg);
        var anterior = conjunto(visiblesDemo(cfg));
        var resultado = [];
        rondas(cfg).forEach(function (rd, i) {
            var items = [];
            for (var q = 0; q < itemsDeRonda(cfg, i); q++) {
                var trio = null;
                for (var t = 0; t < 200; t++) {
                    trio = barajar(ACCIONES, r).slice(0, n);
                    if (conjunto(trio) !== anterior) break;
                }
                anterior = conjunto(trio);
                items.push(trio);
            }
            resultado.push(items);
        });
        return resultado;
    }

    /** Clave de un grupo de acciones sin importar el orden ("aplaudir|cabeza|saltar"). */
    function conjunto(lista) {
        return (lista || []).slice().sort().join("|");
    }

    /**
     * Movimientos del ítem k de la ronda i. config.rondas[i].movimientos puede ser un número (todos los ítems
     * igual) o una lista por ítem, p. ej. [2, 2, 3, 3, 4, 4]. Siempre entre 2 y 4.
     */
    function largoDeItem(cfg, i, k) {
        var m = ronda(cfg, i).movimientos;
        var n = Array.isArray(m) ? Number(m[Math.min(m.length - 1, Math.max(0, k || 0))]) : Number(m);
        return isFinite(n) && n >= 2 ? Math.min(4, Math.floor(n)) : LARGO;
    }

    /**
     * Genera las secuencias de todas las rondas: [[["zapatear","cabeza"], ["cabeza","aplaudir","zapatear"], …]].
     *  - cada ítem tiene exactamente los movimientos que le tocan (2, 3 o 4), guardados en su orden;
     *  - cada ítem usa SOLO sus tres movimientos visibles (visibles[ronda][item]);
     *  - nunca dos secuencias seguidas idénticas ni dos ítems iguales en la misma ronda;
     *  - el primer ítem no repite la secuencia de la demo (cabeza → aplaudir);
     *  - con 2 movimientos: dos acciones distintas;
     *  - con 3 o 4: la misma acción nunca dos veces seguidas (cabeza → cabeza); el primer ítem de 3 usa sus
     *    tres acciones visibles; con 4, cada ítem usa sus tres.
     */
    function generarSecuencias(cfg, rnd, visibles) {
        var vis = visibles || sortearVisibles(cfg, rnd);
        var ultimo = null;
        for (var intento = 0; intento < 80; intento++) {
            ultimo = sortear(cfg, rnd, vis);
            if (!problemasSecuencias(ultimo, cfg, vis).length) return ultimo;
        }
        return ultimo;
    }

    /** Lista de reglas que no cumple un juego de secuencias (vacía = válido). */
    function problemasSecuencias(sec, cfg, visibles) {
        var p = [];
        var plano = [];
        (sec || []).forEach(function (r, ir) {
            var tres = [];
            r.forEach(function (s, k) {
                var largo = cfg ? largoDeItem(cfg, ir, k) : (s || []).length;
                var nombre = "ronda " + (ir + 1) + " ítem " + (k + 1);
                var vis = visibles && visibles[ir] ? visibles[ir][k] : null;
                if (!s || s.length !== largo) {
                    p.push(nombre + ": no tiene " + largo + " movimientos");
                } else if (s.some(function (a) { return ACCIONES.indexOf(a) < 0; })) {
                    p.push(nombre + ": acción desconocida");
                } else {
                    if (vis && s.some(function (a) { return vis.indexOf(a) < 0; })) {
                        p.push(nombre + ": usa un movimiento que no está visible");
                    }
                    for (var m = 1; m < s.length; m++) {
                        if (s[m] === s[m - 1]) p.push(nombre + ": la misma acción dos veces seguidas");
                    }
                    if (largo >= 4 && new Set(s).size < 3) p.push(nombre + ": no usa las tres acciones");
                    if (largo === 3) tres.push(s);
                }
                plano.push(s);
            });
            if (tres.length && new Set(tres[0]).size < 3) p.push("ronda " + (ir + 1) + ": el primer ítem de 3 no usa las tres acciones");
            if (new Set(r.map(clave)).size < r.length) p.push("ronda " + (ir + 1) + ": ítems repetidos");
        });
        plano.forEach(function (s, i) {
            if (i > 0 && iguales(s, plano[i - 1])) p.push("los ítems " + i + " y " + (i + 1) + " son iguales");
        });
        if (plano.length && iguales(plano[0], DEMO)) p.push("el primer ítem repite la demo");
        return p;
    }

    /** Secuencia al azar de `largo` movimientos de `base`, sin la misma acción dos veces seguidas. */
    function sinRepetirSeguidas(largo, r, base) {
        var lista = Array.isArray(base) && base.length ? base : ACCIONES;
        var sec = [];
        for (var k = 0; k < largo; k++) {
            var previa = sec[k - 1];
            var opciones = lista.filter(function (a) { return a !== previa; });
            if (!opciones.length) opciones = lista;
            sec.push(opciones[Math.floor(r() * opciones.length)]);
        }
        return sec;
    }

    function sortear(cfg, rnd, visibles) {
        var r = azar(rnd);
        var vis = visibles || sortearVisibles(cfg, rnd);
        var anterior = DEMO;
        var resultado = [];
        rondas(cfg).forEach(function (rd, i) {
            var n = itemsDeRonda(cfg, i);
            var items = [];
            var usadas = {};
            var primeraDeTres = true;
            for (var q = 0; q < n; q++) {
                var largo = largoDeItem(cfg, i, q);
                var trio = (vis[i] && vis[i][q]) || ACCIONES;
                // cada ítem se sortea hasta que cumple sus reglas, solo con sus movimientos visibles
                var sec = null;
                for (var t = 0; t < 300; t++) {
                    sec = sinRepetirSeguidas(largo, r, trio);
                    var distintas = new Set(sec).size;
                    if (iguales(sec, anterior) || usadas[clave(sec)]) continue;
                    if (largo >= 4 && distintas < 3) continue;
                    if (largo === 3 && primeraDeTres && distintas < 3) continue;
                    break;
                }
                if (largo === 3) primeraDeTres = false;
                usadas[clave(sec)] = 1;
                items.push(sec);
                anterior = sec;
            }
            resultado.push(items);
        });
        return resultado;
    }

    // ------------------------------------------------------------------ partida

    function crear(cfg, rnd) {
        var visibles = sortearVisibles(cfg, rnd);
        return {
            estado: E.INTRO,
            visibles: visibles,    // [ronda][item] = los tres movimientos a la vista en ese ítem
            secuencias: generarSecuencias(cfg, rnd, visibles),
            ronda: 0,
            item: 0,
            respuesta: [],
            correctos: 0,          // ítems completados (máximo totalItems)
            hechos: [],            // [ronda][item] = true al acertar
            errores: 0,            // errores del ítem actual (para dar más apoyo)
            erroresTotales: 0,
            intentos: 0
        };
    }

    function puede(st, siguiente) {
        return !!st && (TRANSICIONES[st.estado] || []).indexOf(siguiente) >= 0;
    }

    /** Cambia de estado solo si la transición es válida. Devuelve true si cambió. */
    function pasar(st, siguiente) {
        if (!puede(st, siguiente)) return false;
        st.estado = siguiente;
        if (siguiente === E.WAITING_INPUT) st.respuesta = [];
        return true;
    }

    function secuenciaActual(st) {
        if (!st) return null;
        var r = st.secuencias[st.ronda];
        return r ? r[st.item] : null;
    }

    /** Los movimientos visibles del ítem actual (los tres botones de la botonera). */
    function visiblesActuales(st) {
        if (!st || !st.visibles) return ACCIONES.slice(0, VISIBLES);
        var r = st.visibles[st.ronda];
        return (r && r[st.item]) || ACCIONES.slice(0, VISIBLES);
    }

    /**
     * El niño toca una acción. Solo vale en WAITING_INPUT, con una acción conocida y hasta tantas como
     * movimientos tenga la secuencia actual. Devuelve { ok, motivo?, accion, n (1…largo), completa, largo }.
     */
    function tocar(st, id) {
        if (!st || st.estado !== E.WAITING_INPUT) return { ok: false, motivo: "bloqueado" };
        if (ACCIONES.indexOf(id) < 0) return { ok: false, motivo: "desconocida" };
        if (visiblesActuales(st).indexOf(id) < 0) return { ok: false, motivo: "no visible" };
        var largo = (secuenciaActual(st) || []).length || LARGO;
        if (st.respuesta.length >= largo) return { ok: false, motivo: "completa" };
        st.respuesta.push(id);
        var completa = st.respuesta.length === largo;
        if (completa) pasar(st, E.CHECKING_ANSWER);
        return { ok: true, accion: id, n: st.respuesta.length, completa: completa, largo: largo };
    }

    /** Compara la respuesta con la secuencia en el mismo orden. Solo en CHECKING_ANSWER. */
    function comparar(st) {
        if (!st || st.estado !== E.CHECKING_ANSWER) return null;
        var sec = secuenciaActual(st);
        var resp = st.respuesta.slice();
        var primerError = -1;
        for (var i = 0; i < sec.length; i++) {
            if (resp[i] !== sec[i]) {
                primerError = i;
                break;
            }
        }
        var correcto = primerError < 0;
        st.intentos++;
        if (correcto) {
            pasar(st, E.CORRECT_FEEDBACK);
            st.correctos++;
            if (!st.hechos[st.ronda]) st.hechos[st.ronda] = [];
            st.hechos[st.ronda][st.item] = true;
        } else {
            pasar(st, E.INCORRECT_FEEDBACK);
            st.errores++;
            st.erroresTotales++;
        }
        return { correcto: correcto, secuencia: sec.slice(), respuesta: resp, primerError: primerError };
    }

    /**
     * Tras un acierto: siguiente ítem, fin de ronda o victoria. Devuelve "item" | "ronda" | "victoria".
     * Solo avanza desde CORRECT_FEEDBACK (un segundo aviso no avanza dos veces).
     */
    function avanzar(st, cfg) {
        if (!st || st.estado !== E.CORRECT_FEEDBACK) return null;
        st.errores = 0;
        st.respuesta = [];
        var n = itemsDeRonda(cfg, st.ronda);
        if (st.item + 1 < n) {
            st.item++;
            pasar(st, E.SHOWING_SEQUENCE);
            return "item";
        }
        if (st.ronda + 1 < rondas(cfg).length) {
            pasar(st, E.ROUND_TRANSITION);
            return "ronda";
        }
        pasar(st, E.VICTORY);
        return "victoria";
    }

    /** Fin de la transición de ronda: primer ítem de la ronda siguiente. */
    function siguienteRonda(st, cfg) {
        if (!st || st.estado !== E.ROUND_TRANSITION) return false;
        if (st.ronda + 1 >= rondas(cfg).length) return false;
        st.ronda++;
        st.item = 0;
        st.errores = 0;
        return pasar(st, E.SHOWING_SEQUENCE);
    }

    /** Reintento tras un error: la misma secuencia (nunca cambia), mostrada otra vez o no. */
    function reintentar(st, mostrarOtraVez) {
        if (!st || st.estado !== E.INCORRECT_FEEDBACK) return false;
        st.respuesta = [];
        return pasar(st, mostrarOtraVez ? E.SHOWING_SEQUENCE : E.WAITING_INPUT);
    }

    function progreso(st, cfg) {
        var total = totalItems(cfg);
        var hechos = st ? st.correctos : 0;
        return {
            ronda: st ? st.ronda + 1 : 1,
            rondas: rondas(cfg).length,
            item: st ? st.item + 1 : 1,
            items: st ? itemsDeRonda(cfg, st.ronda) : itemsDeRonda(cfg, 0),
            hechos: hechos,
            total: total,
            fraccion: total ? hechos / total : 0
        };
    }

    // ------------------------------------------------------------------ revisión del config

    function revisarJuego(cfg) {
        var p = [];
        if (!cfg) return ["sin config"];
        ACCIONES.forEach(function (id) {
            var a = accion(cfg, id);
            if (!a) p.push("falta la acción " + id);
            else if (!a.nombre || !a.voz) p.push("la acción " + id + " no tiene nombre o voz");
        });
        if (rondas(cfg).length < 1) p.push("sin rondas");
        rondas(cfg).forEach(function (r, i) {
            if (itemsDeRonda(cfg, i) < 4) p.push("la ronda " + (i + 1) + " tiene menos de 4 ítems");
            [].concat(r.movimientos == null ? [] : r.movimientos).forEach(function (m) {
                if (Number(m) < 2 || Number(m) > 4) p.push("la ronda " + (i + 1) + " debe tener de 2 a 4 movimientos por ítem");
            });
        });
        if (!iguales((cfg.demo && cfg.demo.secuencia) || DEMO, DEMO)) p.push("la demo debe ser cabeza → aplaudir");
        if (visiblesDeConfig(cfg) !== VISIBLES) p.push("deben verse " + VISIBLES + " movimientos a la vez");
        DEMO.forEach(function (a) {
            if (visiblesDemo(cfg).indexOf(a) < 0) p.push("la demo no muestra el botón " + a);
        });
        return p;
    }

    var ReglasSimon = {
        ACCIONES: ACCIONES,
        DEMO: DEMO,
        LARGO: LARGO,
        VISIBLES: VISIBLES,
        VISIBLES_DEMO: VISIBLES_DEMO,
        E: E,
        TRANSICIONES: TRANSICIONES,
        rondas: rondas,
        ronda: ronda,
        itemsDeRonda: itemsDeRonda,
        largoDeItem: largoDeItem,
        totalItems: totalItems,
        accion: accion,
        combinaciones: combinaciones,
        visiblesDeConfig: visiblesDeConfig,
        visiblesDemo: visiblesDemo,
        sortearVisibles: sortearVisibles,
        conjunto: conjunto,
        generarSecuencias: generarSecuencias,
        problemasSecuencias: problemasSecuencias,
        crear: crear,
        puede: puede,
        pasar: pasar,
        secuenciaActual: secuenciaActual,
        visiblesActuales: visiblesActuales,
        tocar: tocar,
        comparar: comparar,
        avanzar: avanzar,
        siguienteRonda: siguienteRonda,
        reintentar: reintentar,
        progreso: progreso,
        revisarJuego: revisarJuego,
        plantilla: plantilla,
        iguales: iguales,
        clave: clave,
        barajar: barajar
    };

    global.ReglasSimon = ReglasSimon;
    if (typeof module !== "undefined" && module.exports) module.exports = ReglasSimon;
})(typeof window !== "undefined" ? window : globalThis);
