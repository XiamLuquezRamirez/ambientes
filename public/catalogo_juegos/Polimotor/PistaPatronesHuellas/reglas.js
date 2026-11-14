/**
 * ReglasHuellas — lógica pura de "¡La Pista de Patrones de Huellas y Ritmo!" (window.ReglasHuellas y
 * module.exports para la prueba de node).
 *
 * No dibuja ni suena: genera las secuencias de huellas, lleva la máquina de estados y compara las respuestas,
 * siempre por identificador ("manoIzquierda", "manoDerecha", "pieIzquierdo", "pieDerecho", "ambosPies"),
 * nunca por el texto visible.
 *
 * Cinco huellas en el circuito, cada una con su color, su lado y su sonido:
 *   manoIzquierda (naranja, ¡PLAF!) · manoDerecha (roja, ¡TING!)
 *   pieIzquierdo (azul, ¡BUM!) · pieDerecho (azul grisáceo, ¡TOC!) · ambosPies (verde, ¡PUM!)
 *
 * Estados de la partida:
 *   INTRO → DEMO → SHOWING_SEQUENCE → WAITING_INPUT → CHECKING_ANSWER → CORRECT_FEEDBACK | INCORRECT_FEEDBACK
 *   CORRECT_FEEDBACK → SHOWING_SEQUENCE (siguiente ítem) | ROUND_TRANSITION (fin de ronda) | VICTORY (fin)
 *   INCORRECT_FEEDBACK → SHOWING_SEQUENCE (la MISMA secuencia otra vez) | WAITING_INPUT (reintento sin repetir)
 *   ROUND_TRANSITION → SHOWING_SEQUENCE
 * Solo en WAITING_INPUT se aceptan toques, y como mucho tantos como huellas tenga la secuencia (4).
 */
(function (global) {
    "use strict";

    var ACCIONES = ["manoIzquierda", "manoDerecha", "pieIzquierdo", "pieDerecho", "ambosPies"];
    var DEMO = ["pieIzquierdo", "manoDerecha", "ambosPies"];
    var LARGO = 4; // huellas por ítem si la ronda no dice otra cosa (config.rondas[i].baldosas)

    // de qué lado y de qué tipo es cada huella (para las reglas de lateralidad de las rondas)
    var LADO = {
        manoIzquierda: "izquierda",
        manoDerecha: "derecha",
        pieIzquierdo: "izquierda",
        pieDerecho: "derecha",
        ambosPies: "ambos"
    };
    var TIPO = {
        manoIzquierda: "mano",
        manoDerecha: "mano",
        pieIzquierdo: "pie",
        pieDerecho: "pie",
        ambosPies: "salto"
    };

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
        return r.length ? r : [{ id: 1, items: 3 }, { id: 2, items: 3 }, { id: 3, items: 3 }];
    }

    function ronda(cfg, i) {
        var lista = rondas(cfg);
        return lista[Math.max(0, Math.min(lista.length - 1, i || 0))];
    }

    function itemsDeRonda(cfg, i) {
        var n = Number(ronda(cfg, i).items);
        return isFinite(n) && n > 0 ? Math.floor(n) : 3;
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

    /** Huellas por ítem de la ronda i (config.rondas[i].baldosas; 4 si no dice). */
    function largoDeRonda(cfg, i) {
        var n = Number(ronda(cfg, i).baldosas);
        return isFinite(n) && n >= 3 ? Math.min(5, Math.floor(n)) : LARGO;
    }

    // ------------------------------------------------------------------ generador de secuencias

    /** ¿La secuencia mezcla manos y pies? (ambosPies cuenta como pie) */
    function mezclaManosYPies(sec) {
        var manos = sec.some(function (a) { return TIPO[a] === "mano"; });
        var pies = sec.some(function (a) { return TIPO[a] === "pie" || TIPO[a] === "salto"; });
        return manos && pies;
    }

    /** ¿La secuencia usa los dos lados? (ambosPies no cuenta como lado) */
    function usaAmbosLados(sec) {
        var izq = sec.some(function (a) { return LADO[a] === "izquierda"; });
        var der = sec.some(function (a) { return LADO[a] === "derecha"; });
        return izq && der;
    }

    /**
     * Genera las secuencias de todas las rondas: [[[4 huellas] × 3], [[…] × 3], [[…] × 3]].
     *  - cada ítem tiene exactamente las huellas de su ronda (4), guardadas en su orden;
     *  - la misma huella nunca dos veces seguidas y cada ítem usa al menos 3 huellas distintas;
     *  - nunca dos secuencias seguidas idénticas (tampoco entre rondas) ni repetidas dentro de una ronda;
     *  - el primer ítem no repite la secuencia de la demo;
     *  - cada ítem mezcla manos y pies (lo pide el enunciado de la ronda 1);
     *  - de la ronda 2 en adelante, cada ítem alterna al menos una vez izquierda y derecha;
     *  - a lo largo de las nueve actividades participan las cinco huellas (reparto equilibrado).
     */
    function generarSecuencias(cfg, rnd) {
        var ultimo = null;
        for (var intento = 0; intento < 200; intento++) {
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
                if (!s || s.length !== largo) p.push(nombre + ": no tiene " + largo + " huellas");
                else if (s.some(function (a) { return ACCIONES.indexOf(a) < 0; })) p.push(nombre + ": huella desconocida");
                else {
                    for (var m = 1; m < s.length; m++) {
                        if (s[m] === s[m - 1]) p.push(nombre + ": la misma huella dos veces seguidas");
                    }
                    if (new Set(s).size < 3) p.push(nombre + ": usa menos de tres huellas distintas");
                    if (!mezclaManosYPies(s)) p.push(nombre + ": no mezcla manos y pies");
                    if (ir >= 1 && !usaAmbosLados(s)) p.push(nombre + ": no combina derecha e izquierda");
                }
                plano.push(s);
            });
            if (new Set(r.map(clave)).size < r.length) p.push("ronda " + (ir + 1) + ": secuencias repetidas");
        });
        plano.forEach(function (s, i) {
            if (i > 0 && iguales(s, plano[i - 1])) p.push("los ítems " + i + " y " + (i + 1) + " son iguales");
        });
        if (plano.length && iguales(plano[0], DEMO)) p.push("el primer ítem repite la demo");
        // reparto: las cinco huellas tienen que aparecer en las nueve actividades
        var cuenta = {};
        ACCIONES.forEach(function (a) { cuenta[a] = 0; });
        plano.forEach(function (s) { s.forEach(function (a) { if (cuenta[a] != null) cuenta[a]++; }); });
        ACCIONES.forEach(function (a) {
            if (!cuenta[a]) p.push("la huella " + a + " no sale nunca");
        });
        // nadie acapara: ninguna huella más del doble de la media
        var totalToques = plano.reduce(function (n, s) { return n + s.length; }, 0);
        var media = totalToques / ACCIONES.length;
        if (totalToques >= 12) {
            ACCIONES.forEach(function (a) {
                if (cuenta[a] > Math.ceil(media * 2)) p.push("la huella " + a + " sale demasiadas veces");
            });
        }
        return p;
    }

    /** ¿La secuencia cumple todas las reglas de contenido de su ronda? */
    function secuenciaValida(sec, largo, exigeLados) {
        if (!sec || sec.length !== largo) return false;
        for (var m = 1; m < sec.length; m++) {
            if (sec[m] === sec[m - 1]) return false;
        }
        if (new Set(sec).size < 3) return false;
        if (!mezclaManosYPies(sec)) return false;
        if (exigeLados && !usaAmbosLados(sec)) return false;
        return true;
    }

    /**
     * Secuencia al azar de `largo` huellas que cumple las reglas **por construcción**: se sortea el orden de
     * las huellas candidatas y se van completando las que faltan (una mano, un pie y, si la ronda lo pide,
     * los dos lados), sin la misma huella dos veces seguidas. Prefiere las menos usadas (`cuenta`) para que
     * las cinco participen a lo largo del juego.
     */
    function sortearSecuencia(largo, r, cuenta, exigeLados) {
        for (var intento = 0; intento < 60; intento++) {
            // obligatorias: siempre una mano y un pie; con lateralidad, una de cada lado
            var obligatorias = [];
            var manos = ["manoIzquierda", "manoDerecha"];
            var pies = ["pieIzquierdo", "pieDerecho", "ambosPies"];
            obligatorias.push(elegir(manos, cuenta, r));
            obligatorias.push(elegir(pies, cuenta, r));
            if (exigeLados) {
                var tieneIzq = obligatorias.some(function (a) { return LADO[a] === "izquierda"; });
                var tieneDer = obligatorias.some(function (a) { return LADO[a] === "derecha"; });
                if (!tieneIzq) obligatorias.push(elegir(["manoIzquierda", "pieIzquierdo"], cuenta, r));
                if (!tieneDer) obligatorias.push(elegir(["manoDerecha", "pieDerecho"], cuenta, r));
            }
            // el resto hasta `largo`, procurando tres huellas distintas y sin acaparar
            var sec = obligatorias.slice(0, largo);
            while (sec.length < largo) {
                var faltanDistintas = new Set(sec).size < 3;
                var opciones = ACCIONES.filter(function (a) {
                    return !faltanDistintas || sec.indexOf(a) < 0;
                });
                sec.push(elegir(opciones.length ? opciones : ACCIONES, cuenta, r));
            }
            // se baraja el orden hasta que no haya dos huellas iguales seguidas
            for (var k = 0; k < 40; k++) {
                var mezcla = barajar(sec, r);
                if (secuenciaValida(mezcla, largo, exigeLados)) return mezcla;
            }
        }
        return null;
    }

    /** Elige al azar entre las huellas menos usadas hasta ahora (reparto equilibrado). */
    function elegir(opciones, cuenta, r) {
        if (!opciones || !opciones.length) return ACCIONES[Math.floor(r() * ACCIONES.length)];
        if (!cuenta) return opciones[Math.floor(r() * opciones.length)];
        var min = Infinity;
        opciones.forEach(function (a) { min = Math.min(min, cuenta[a] || 0); });
        var pocas = opciones.filter(function (a) { return (cuenta[a] || 0) <= min; });
        return pocas[Math.floor(r() * pocas.length)];
    }

    function sortear(cfg, rnd) {
        var r = azar(rnd);
        var lista = rondas(cfg);
        var cuenta = {};
        ACCIONES.forEach(function (a) { cuenta[a] = 0; });
        var anterior = DEMO;
        var resultado = [];
        lista.forEach(function (rd, i) {
            var n = itemsDeRonda(cfg, i);
            var largo = largoDeRonda(cfg, i);
            var items = [];
            var usadas = {};
            var exigeLados = i >= 1;
            for (var q = 0; q < n; q++) {
                // cada ítem se sortea ya válido; solo se repite si sale igual que otro ya usado
                var sec = null;
                for (var t = 0; t < 60; t++) {
                    var cand = sortearSecuencia(largo, r, cuenta, exigeLados);
                    if (!cand) continue;
                    sec = cand;
                    if (!iguales(cand, anterior) && !usadas[clave(cand)]) break;
                }
                if (!sec) sec = sortearSecuencia(largo, r, null, exigeLados) || ACCIONES.slice(0, largo);
                usadas[clave(sec)] = 1;
                items.push(sec);
                sec.forEach(function (a) { cuenta[a]++; });
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
     * El niño toca una huella. Solo vale en WAITING_INPUT, con una huella conocida y hasta tantas como
     * tenga la secuencia actual. La comprobación es **inmediata**:
     *   - huella correcta → se guarda en la respuesta y Zeus avanza un paso;
     *   - huella equivocada → NO se guarda ni borra lo ya acertado: la plataforma rebota, Zeus espera y el
     *     niño vuelve a intentar el mismo paso (sin vidas). Cuenta como error del ítem.
     * Devuelve { ok, motivo?, accion, correcta, esperada, n (paso 1…largo), completa, largo, errores }.
     */
    function tocar(st, id) {
        if (!st || st.estado !== E.WAITING_INPUT) return { ok: false, motivo: "bloqueado" };
        if (ACCIONES.indexOf(id) < 0) return { ok: false, motivo: "desconocida" };
        var sec = secuenciaActual(st) || [];
        var largo = sec.length || LARGO;
        if (st.respuesta.length >= largo) return { ok: false, motivo: "completa" };
        var esperada = sec[st.respuesta.length];
        var n = st.respuesta.length + 1;
        if (id !== esperada) {
            st.errores++;
            st.erroresTotales++;
            return {
                ok: true, accion: id, correcta: false, esperada: esperada, n: n,
                completa: false, largo: largo, errores: st.errores
            };
        }
        st.respuesta.push(id);
        var completa = st.respuesta.length === largo;
        if (completa) pasar(st, E.CHECKING_ANSWER);
        return {
            ok: true, accion: id, correcta: true, esperada: esperada, n: n,
            completa: completa, largo: largo, errores: st.errores
        };
    }

    /**
     * Tras varios toques equivocados en el mismo ítem, la pista vuelve a mostrar la MISMA secuencia desde el
     * principio (la respuesta parcial se borra, el progreso de ítems no). Solo desde WAITING_INPUT.
     */
    function volverAMostrar(st) {
        if (!st || st.estado !== E.WAITING_INPUT) return false;
        st.respuesta = [];
        st.estado = E.SHOWING_SEQUENCE;
        return true;
    }

    /** Pasos ya recorridos por Zeus en todo el circuito (ítems completos × largo + pasos del ítem actual). */
    function pasosRecorridos(st, cfg) {
        if (!st) return 0;
        var total = 0;
        // cada ítem acertado vale tantos pasos como huellas tiene su ronda
        (st.hechos || []).forEach(function (r, ir) {
            (r || []).forEach(function (hecho) { if (hecho) total += largoDeRonda(cfg, ir); });
        });
        // y los pasos buenos del ítem en curso (todavía sin completar)
        var enCurso = !(st.hechos[st.ronda] && st.hechos[st.ronda][st.item]);
        if (enCurso) total += st.respuesta.length;
        return total;
    }

    /** Pasos totales del circuito (9 ítems × 4 huellas = 36). */
    function pasosTotales(cfg) {
        var total = 0;
        for (var i = 0; i < rondas(cfg).length; i++) total += itemsDeRonda(cfg, i) * largoDeRonda(cfg, i);
        return total;
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
            if (!a) p.push("falta la huella " + id);
            else {
                if (!a.nombre || !a.voz) p.push("la huella " + id + " no tiene nombre o voz");
                if (!a.color) p.push("la huella " + id + " no tiene color");
                if (!a.efecto) p.push("la huella " + id + " no tiene efecto sonoro");
                if (!a.sonido) p.push("la huella " + id + " no dice qué sonido usa");
                if (a.lado !== LADO[id]) p.push("la huella " + id + " no declara su lado (" + LADO[id] + ")");
            }
        });
        if (rondas(cfg).length < 3) p.push("se necesitan al menos tres rondas");
        rondas(cfg).forEach(function (r, i) {
            if (itemsDeRonda(cfg, i) < 3) p.push("la ronda " + (i + 1) + " tiene menos de 3 ítems");
            if (largoDeRonda(cfg, i) < 4) p.push("la ronda " + (i + 1) + " debe tener 4 huellas por secuencia");
        });
        var d = (cfg.demo && cfg.demo.secuencia) || DEMO;
        if (!iguales(d, DEMO)) p.push("la demo debe ser pie izquierdo, mano derecha y ambos pies");
        return p;
    }

    var ReglasHuellas = {
        ACCIONES: ACCIONES,
        DEMO: DEMO,
        LARGO: LARGO,
        LADO: LADO,
        TIPO: TIPO,
        E: E,
        TRANSICIONES: TRANSICIONES,
        rondas: rondas,
        ronda: ronda,
        itemsDeRonda: itemsDeRonda,
        largoDeRonda: largoDeRonda,
        totalItems: totalItems,
        accion: accion,
        generarSecuencias: generarSecuencias,
        problemasSecuencias: problemasSecuencias,
        mezclaManosYPies: mezclaManosYPies,
        usaAmbosLados: usaAmbosLados,
        crear: crear,
        puede: puede,
        pasar: pasar,
        secuenciaActual: secuenciaActual,
        tocar: tocar,
        volverAMostrar: volverAMostrar,
        pasosRecorridos: pasosRecorridos,
        pasosTotales: pasosTotales,
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

    global.ReglasHuellas = ReglasHuellas;
    if (typeof module !== "undefined" && module.exports) module.exports = ReglasHuellas;
})(typeof window !== "undefined" ? window : globalThis);
