/**
 * ReglasPista — lógica pura de "¡La Pista de Ritmo y Pasos Mágicos!" (window.ReglasPista y module.exports
 * para la prueba de node).
 *
 * No dibuja ni suena: genera las secuencias de baldosas, lleva la máquina de estados y compara las respuestas,
 * siempre por identificador ("pie", "mano", "carita", "rodilla", "hombro", "barriga"), nunca por el texto visible.
 *
 * Seis baldosas en la pista (grid 3 × 2), cada una con su color y su sonido:
 *   pie (azul, ¡BUM!) · mano (roja, ¡TING!) · carita (amarilla, ¡PLIM!)
 *   rodilla (verde, ¡TOC!) · hombro (morada, ¡CHIS!) · barriga (naranja, ¡POP!)
 *
 * Estados de la partida:
 *   INTRO → DEMO → SHOWING_SEQUENCE → WAITING_INPUT → CHECKING_ANSWER → CORRECT_FEEDBACK | INCORRECT_FEEDBACK
 *   CORRECT_FEEDBACK → SHOWING_SEQUENCE (siguiente ítem) | ROUND_TRANSITION (fin de ronda) | VICTORY (fin)
 *   INCORRECT_FEEDBACK → SHOWING_SEQUENCE (la MISMA secuencia otra vez) | WAITING_INPUT (reintento sin repetir)
 *   ROUND_TRANSITION → SHOWING_SEQUENCE
 * Solo en WAITING_INPUT se aceptan toques, y como mucho tantos como baldosas tenga la secuencia (2, 3 o 4).
 */
(function (global) {
    "use strict";

    var ACCIONES = ["pie", "mano", "carita", "rodilla", "hombro", "barriga"];
    var DEMO = ["pie", "mano"];
    var LARGO = 2; // baldosas por ítem si la ronda no dice otra cosa (config.rondas[i].baldosas: 2, 3 o 4)

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
        return r.length ? r : [{ id: 1, items: 4 }, { id: 2, items: 4 }];
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

    function accion(cfg, id) {
        var lista = (cfg && cfg.acciones) || [];
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].id === id) return lista[i];
        }
        return null;
    }

    /** Baldosas por ítem de la ronda i (config.rondas[i].baldosas; 2 si no dice). */
    function largoDeRonda(cfg, i) {
        var n = Number(ronda(cfg, i).baldosas);
        return isFinite(n) && n >= 2 ? Math.min(4, Math.floor(n)) : LARGO;
    }

    // ------------------------------------------------------------------ generador de secuencias

    /** Las 30 parejas de baldosas distintas y las 6 repetidas (misma baldosa dos veces). */
    function combinaciones() {
        var distintas = [];
        var repetidas = [];
        ACCIONES.forEach(function (a) {
            ACCIONES.forEach(function (b) {
                if (a === b) repetidas.push([a, b]);
                else distintas.push([a, b]);
            });
        });
        return { distintas: distintas, repetidas: repetidas };
    }

    /**
     * Genera las secuencias de todas las rondas: [[["pie","carita"], …4], [[…3 baldosas], …], …].
     *  - cada ítem tiene exactamente las baldosas de su ronda (2, 3 o 4), guardadas en su orden;
     *  - nunca dos secuencias seguidas idénticas (tampoco entre rondas);
     *  - el primer ítem no repite la secuencia de la demo (pie → mano);
     *  - con 3 o 4 baldosas: la misma baldosa nunca dos veces seguidas, y cada ítem usa al menos 3 baldosas
     *    distintas; dentro de una ronda no se repite la misma secuencia;
     *  - a lo largo de las doce actividades participan las seis baldosas (reparto equilibrado).
     */
    function generarSecuencias(cfg, rnd) {
        // se repite el sorteo hasta cumplir todas las reglas (casi siempre a la primera)
        var ultimo = null;
        for (var intento = 0; intento < 120; intento++) {
            ultimo = sortear(cfg, rnd);
            if (!problemasSecuencias(ultimo, cfg).length) return ultimo;
        }
        return ultimo;
    }

    /** Lista de reglas que no cumple un juego de secuencias (vacía = válido). */
    function problemasSecuencias(sec, cfg) {
        var p = [];
        var plano = [];
        (sec || []).forEach(function (r, ir) {
            var largo = cfg ? largoDeRonda(cfg, ir) : (r[0] || []).length;
            r.forEach(function (s, k) {
                var nombre = "ronda " + (ir + 1) + " ítem " + (k + 1);
                if (!s || s.length !== largo) p.push(nombre + ": no tiene " + largo + " baldosas");
                else if (s.some(function (a) { return ACCIONES.indexOf(a) < 0; })) p.push(nombre + ": baldosa desconocida");
                else if (largo > 2) {
                    for (var m = 1; m < s.length; m++) {
                        if (s[m] === s[m - 1]) p.push(nombre + ": la misma baldosa dos veces seguidas");
                    }
                    if (new Set(s).size < 3) p.push(nombre + ": usa menos de tres baldosas distintas");
                }
                plano.push(s);
            });
            if (new Set(r.map(clave)).size < r.length) p.push("ronda " + (ir + 1) + ": secuencias repetidas");
        });
        plano.forEach(function (s, i) {
            if (i > 0 && iguales(s, plano[i - 1])) p.push("los ítems " + i + " y " + (i + 1) + " son iguales");
        });
        if (plano.length && iguales(plano[0], DEMO)) p.push("el primer ítem repite la demo");
        // reparto: las seis baldosas tienen que aparecer en las doce actividades
        var cuenta = {};
        ACCIONES.forEach(function (a) { cuenta[a] = 0; });
        plano.forEach(function (s) { s.forEach(function (a) { if (cuenta[a] != null) cuenta[a]++; }); });
        ACCIONES.forEach(function (a) {
            if (!cuenta[a]) p.push("la baldosa " + a + " no sale nunca");
        });
        // nadie acapara: ninguna baldosa más del doble de la media
        var totalToques = plano.reduce(function (n, s) { return n + s.length; }, 0);
        var media = totalToques / ACCIONES.length;
        if (totalToques >= 12) {
            ACCIONES.forEach(function (a) {
                if (cuenta[a] > Math.ceil(media * 2)) p.push("la baldosa " + a + " sale demasiadas veces");
            });
        }
        var dos = plano.filter(function (s) { return s.length === 2; });
        var rep = dos.filter(function (s) { return s[0] === s[1]; }).length;
        if (rep > Math.ceil(dos.length / 4)) p.push("demasiadas secuencias con la misma baldosa repetida");
        return p;
    }

    /**
     * Secuencia al azar de `largo` baldosas sin la misma dos veces seguidas, prefiriendo las menos usadas
     * (`cuenta`) para que las seis participen a lo largo del juego.
     */
    function sinRepetirSeguidas(largo, r, cuenta) {
        var sec = [];
        for (var k = 0; k < largo; k++) {
            var previa = sec[k - 1];
            var opciones = ACCIONES.filter(function (a) {
                return a !== previa && (largo <= 2 || sec.indexOf(a) < 0 || sec.length >= 3);
            });
            sec.push(menosUsada(opciones, cuenta, r));
        }
        return sec;
    }

    /** Elige al azar entre las baldosas menos usadas hasta ahora (reparto equilibrado). */
    function menosUsada(opciones, cuenta, r) {
        if (!opciones.length) return ACCIONES[Math.floor(r() * ACCIONES.length)];
        if (!cuenta) return opciones[Math.floor(r() * opciones.length)];
        var min = Infinity;
        opciones.forEach(function (a) { min = Math.min(min, cuenta[a] || 0); });
        var pocas = opciones.filter(function (a) { return (cuenta[a] || 0) <= min; });
        return pocas[Math.floor(r() * pocas.length)];
    }

    function sortear(cfg, rnd) {
        var r = azar(rnd);
        var comb = combinaciones();
        var lista = rondas(cfg);
        var cuenta = {};
        ACCIONES.forEach(function (a) { cuenta[a] = 0; });
        var contar = function (sec) { sec.forEach(function (a) { cuenta[a]++; }); };
        // bolsa de parejas distintas: se recorre entera antes de repetir alguna
        var bolsa = [];
        var tomarDistinta = function (prohibida) {
            for (var intento = 0; intento < 2; intento++) {
                if (!bolsa.length) {
                    // la bolsa se ordena dando prioridad a las parejas con baldosas poco usadas
                    bolsa = barajar(comb.distintas, r).sort(function (a, b) {
                        return (cuenta[a[0]] + cuenta[a[1]]) - (cuenta[b[0]] + cuenta[b[1]]);
                    });
                }
                for (var k = 0; k < bolsa.length; k++) {
                    if (!prohibida(bolsa[k])) return bolsa.splice(k, 1)[0].slice();
                }
                bolsa = [];
            }
            return comb.distintas[0].slice();
        };
        var anterior = DEMO;
        var resultado = [];
        lista.forEach(function (rd, i) {
            var n = itemsDeRonda(cfg, i);
            var largo = largoDeRonda(cfg, i);
            var items = [];
            var usadas = {};
            if (largo > 2) {
                for (var q = 0; q < n; q++) {
                    // cada ítem se sortea hasta que cumple: distinto del anterior y de los de su ronda, sin la
                    // misma baldosa dos veces seguidas y con al menos tres baldosas distintas
                    var larga = null;
                    for (var t = 0; t < 300; t++) {
                        larga = sinRepetirSeguidas(largo, r, cuenta);
                        if (iguales(larga, anterior) || usadas[clave(larga)]) continue;
                        if (new Set(larga).size < 3) continue;
                        break;
                    }
                    usadas[clave(larga)] = 1;
                    items.push(larga);
                    contar(larga);
                    anterior = larga;
                }
                resultado.push(items);
                return;
            }
            var rep = Math.max(0, Math.min(n - 1, Number(rd.repetidas) || 0));
            // dónde van las repetidas (nunca en el primer ítem de la ronda)
            var posiciones = barajar(Array.from({ length: n - 1 }, function (_, k) { return k + 1; }), r).slice(0, rep);
            var repetidasRonda = barajar(comb.repetidas, r);
            for (var j = 0; j < n; j++) {
                var sec;
                if (posiciones.indexOf(j) >= 0) {
                    sec = repetidasRonda.shift() || comb.repetidas[0].slice();
                    if (iguales(sec, anterior) || usadas[clave(sec)]) sec = repetidasRonda.shift() || sec;
                    sec = sec.slice();
                } else {
                    var prev = anterior;
                    sec = tomarDistinta(function (c) { return iguales(c, prev) || usadas[clave(c)]; });
                }
                usadas[clave(sec)] = 1;
                items.push(sec);
                contar(sec);
                anterior = sec;
            }
            resultado.push(items);
        });
        return resultado;
    }

    // ------------------------------------------------------------------ partida

    function crear(cfg, rnd) {
        return {
            estado: E.INTRO,
            secuencias: generarSecuencias(cfg, rnd),
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

    /**
     * El niño toca una baldosa. Solo vale en WAITING_INPUT, con una baldosa conocida y hasta tantas como
     * tenga la secuencia actual. Devuelve { ok, motivo?, accion, n (1…largo), completa, largo }.
     */
    function tocar(st, id) {
        if (!st || st.estado !== E.WAITING_INPUT) return { ok: false, motivo: "bloqueado" };
        if (ACCIONES.indexOf(id) < 0) return { ok: false, motivo: "desconocida" };
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
            if (!a) p.push("falta la baldosa " + id);
            else {
                if (!a.nombre || !a.voz) p.push("la baldosa " + id + " no tiene nombre o voz");
                if (!a.color) p.push("la baldosa " + id + " no tiene color");
                if (!a.efecto) p.push("la baldosa " + id + " no tiene efecto sonoro (¡BUM!, ¡TING!…)");
                if (!a.sonido) p.push("la baldosa " + id + " no dice qué sonido usa");
            }
        });
        if (rondas(cfg).length < 2) p.push("se necesitan al menos dos rondas");
        rondas(cfg).forEach(function (r, i) {
            if (itemsDeRonda(cfg, i) < 4) p.push("la ronda " + (i + 1) + " tiene menos de 4 ítems");
            if (r.baldosas != null && (Number(r.baldosas) < 2 || Number(r.baldosas) > 4)) {
                p.push("la ronda " + (i + 1) + " debe tener de 2 a 4 baldosas");
            }
        });
        if (!iguales((cfg.demo && cfg.demo.secuencia) || DEMO, DEMO)) p.push("la demo debe ser pie → mano");
        return p;
    }

    var ReglasPista = {
        ACCIONES: ACCIONES,
        DEMO: DEMO,
        LARGO: LARGO,
        E: E,
        TRANSICIONES: TRANSICIONES,
        rondas: rondas,
        ronda: ronda,
        itemsDeRonda: itemsDeRonda,
        largoDeRonda: largoDeRonda,
        totalItems: totalItems,
        accion: accion,
        combinaciones: combinaciones,
        generarSecuencias: generarSecuencias,
        problemasSecuencias: problemasSecuencias,
        crear: crear,
        puede: puede,
        pasar: pasar,
        secuenciaActual: secuenciaActual,
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

    global.ReglasPista = ReglasPista;
    if (typeof module !== "undefined" && module.exports) module.exports = ReglasPista;
})(typeof window !== "undefined" ? window : globalThis);
