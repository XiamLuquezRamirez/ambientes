/**
 * Reglas puras de "¿Qué sonido escuchas?" — Expresión Artística (sin DOM).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TEMAS = ["bosque", "estudio"];
    const CONCIERTOS = ["bosque", "mezcla"];
    const REGLAS = {
        "3-4 años": {
            tema: "bosque",
            retos: 3,
            opciones: [2, 3],
            efectos: ["vaca", "grifo", "ambulancia"],
            concierto: "bosque"
        },
        "5-6 años": {
            tema: "estudio",
            retos: 3,
            opciones: [3, 4],
            efectos: ["tren", "buho", "rayo"],
            concierto: "mezcla"
        }
    };

    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    /** Orden aleatorio (Fisher-Yates) para que la respuesta no quede siempre en el mismo puesto. */
    function mezclar(lista, aleatorio) {
        const rnd = typeof aleatorio === "function" ? aleatorio : Math.random;
        const out = (lista || []).slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            const t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    /**
     * Pistas que suenan en un reto. Sin `capas` se usa el sonido del elemento correcto;
     * cada capa queda como { sonido, principal, retrasoMs }.
     */
    function capasDe(reto, elementos) {
        if (!reto) return [];
        if (Array.isArray(reto.capas) && reto.capas.length) {
            return reto.capas.map(function (c) {
                return {
                    sonido: c && c.sonido,
                    principal: !!(c && c.principal),
                    retrasoMs: c && esNumero(c.retrasoMs) ? Math.max(0, c.retrasoMs) : 0
                };
            });
        }
        const el = (elementos || {})[reto.correcto] || {};
        return el.sonido ? [{ sonido: el.sonido, principal: true, retrasoMs: 0 }] : [];
    }

    /** Si el niño apagó todas las pistas, al volver a escuchar se encienden todas. */
    function normalizarActivas(capas, activas) {
        const n = (capas || []).length;
        const out = [];
        for (let i = 0; i < n; i++) out.push(!activas || activas[i] !== false);
        return out.some(Boolean) ? out : out.map(function () { return true; });
    }

    /** ¿Se oye el sonido que hay que reconocer con las pistas encendidas? */
    function objetivoAudible(capas, activas) {
        return (capas || []).some(function (c, i) {
            return c.principal && (!activas || activas[i] !== false);
        });
    }

    /** Arrastre: el punto donde se suelta la tarjeta cae sobre la bocina (con margen de tolerancia). */
    function soltoSobre(punto, rect, margen) {
        if (!punto || !rect) return false;
        const m = esNumero(margen) ? margen : 0;
        return punto.x >= rect.left - m && punto.x <= rect.right + m
            && punto.y >= rect.top - m && punto.y <= rect.bottom + m;
    }

    /** Los elementos descubiertos (uno por reto, en orden) que suenan en el concierto final. */
    function elementosConcierto(nivel) {
        const out = [];
        ((nivel && nivel.retos) || []).forEach(function (r) {
            if (r.correcto && out.indexOf(r.correcto) === -1) out.push(r.correcto);
        });
        return out;
    }

    /**
     * Agenda rítmica del concierto: en cada compás suena un elemento por tiempo y
     * el último tiempo es de todos juntos (id null). Tiempos en ms desde el inicio.
     */
    function programaConcierto(ids, o) {
        o = o || {};
        const lista = (ids || []).slice();
        const bpm = esNumero(o.bpm) && o.bpm > 0 ? o.bpm : 100;
        const compases = esNumero(o.compases) && o.compases > 0 ? Math.round(o.compases) : 2;
        const tiempos = Math.max(4, lista.length + 1);
        const pulsoMs = Math.round(60000 / bpm);
        const golpes = [];
        for (let c = 0; c < compases; c++) {
            for (let b = 0; b < tiempos; b++) {
                golpes.push({
                    t: (c * tiempos + b) * pulsoMs,
                    compas: c,
                    tiempo: b,
                    id: b < lista.length ? lista[b] : null
                });
            }
        }
        return { pulsoMs: pulsoMs, tiempos: tiempos, duracionMs: compases * tiempos * pulsoMs, golpes: golpes };
    }

    function validarConfig(cfg) {
        const errores = [];
        const elementos = (cfg && cfg.elementos) || {};
        const escenas = (cfg && cfg.escenas) || {};
        const niveles = (cfg && cfg.niveles) || [];
        const demo = (cfg && cfg.demo) || {};
        if (!niveles.length) errores.push("Sin niveles");

        Object.keys(elementos).forEach(function (id) {
            const e = elementos[id];
            if (!e.img) errores.push("Elemento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Elemento " + id + ": sin nombre");
            if (e.fotogramas && !Array.isArray(e.fotogramas)) errores.push("Elemento " + id + ": fotogramas inválidos");
        });

        const demoEl = elementos[demo.elemento];
        if (!demoEl) errores.push("Demo: elemento inexistente");
        else if (!demoEl.sonido) errores.push("Demo: el elemento no tiene sonido");

        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const regla = REGLAS[n.edad];
            if (!regla) {
                errores.push(tag + ": edad sin reglas (" + n.edad + ")");
                return;
            }
            if (!n.titulo) errores.push(tag + ": sin título");
            if (TEMAS.indexOf(n.tema) === -1 || n.tema !== regla.tema) errores.push(tag + ": tema debe ser " + regla.tema);
            if (n.escena && !escenas[n.escena]) errores.push(tag + ": escena inexistente " + n.escena);
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            (n.bienvenida || []).forEach(function (l, i) {
                if (!l || !l.texto || (l.personaje !== 0 && l.personaje !== 1)) errores.push(tag + ": bienvenida " + (i + 1) + " inválida");
            });
            if (!Array.isArray(n.cierre) || n.cierre.length < 1 || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
            const conc = n.concierto || {};
            if (CONCIERTOS.indexOf(conc.tipo) === -1 || conc.tipo !== regla.concierto) errores.push(tag + ": concierto debe ser " + regla.concierto);
            if (!(esNumero(conc.bpm) && conc.bpm > 0) || !(esNumero(conc.compases) && conc.compases > 0)) errores.push(tag + ": concierto sin ritmo");

            const retos = n.retos || [];
            if (retos.length !== regla.retos) errores.push(tag + ": debe tener " + regla.retos + " retos");

            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (r.id || i + 1);
                if (!r.titulo) errores.push(rt + ": sin título");
                if (!r.escena || !escenas[r.escena]) errores.push(rt + ": escena inexistente " + r.escena);
                if (!esLinea(r.consigna)) errores.push(rt + ": consigna inválida");
                if (r.pregunta && !esLinea(r.pregunta)) errores.push(rt + ": pregunta inválida");

                const ops = r.opciones || [];
                if (ops.length < regla.opciones[0] || ops.length > regla.opciones[1]) {
                    errores.push(rt + ": deben ser " + regla.opciones.join(" a ") + " tarjetas");
                }
                if (ops.some(function (id, k) { return ops.indexOf(id) !== k; })) errores.push(rt + ": opciones repetidas");
                ops.forEach(function (id) {
                    if (!elementos[id]) errores.push(rt + ": opción inexistente " + id);
                });
                if (ops.indexOf(r.correcto) === -1) errores.push(rt + ": el correcto no está entre las opciones");
                if (r.correcto === demo.elemento || ops.indexOf(demo.elemento) !== -1) errores.push(rt + ": usa el elemento de la demostración");

                const capas = capasDe(r, elementos);
                if (!capas.length) errores.push(rt + ": sin sonido");
                if (capas.some(function (c) { return !c.sonido; })) errores.push(rt + ": capa sin sonido");
                const principales = capas.filter(function (c) { return c.principal; });
                if (principales.length !== 1) errores.push(rt + ": debe haber una sola capa principal");
                const correcto = elementos[r.correcto] || {};
                if (principales[0] && principales[0].sonido !== correcto.sonido) errores.push(rt + ": la capa principal debe ser el sonido del correcto");

                const a = r.acierto || {};
                if (regla.efectos[i] && a.efecto !== regla.efectos[i]) errores.push(rt + ": efecto de acierto debe ser " + regla.efectos[i]);
                if (!esLinea(a)) errores.push(rt + ": línea de acierto inválida");
                if (!esLinea(r.error)) errores.push(rt + ": falta la voz de error");
            });

            elementosConcierto(n).forEach(function (id) {
                if (!(elementos[id] && elementos[id].sonido)) errores.push(tag + ": " + id + " no puede sonar en el concierto");
            });
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        TEMAS: TEMAS,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        capasDe: capasDe,
        normalizarActivas: normalizarActivas,
        objetivoAudible: objetivoAudible,
        soltoSobre: soltoSobre,
        elementosConcierto: elementosConcierto,
        programaConcierto: programaConcierto,
        validarConfig: validarConfig
    };

    global.QueSonidoArteLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
