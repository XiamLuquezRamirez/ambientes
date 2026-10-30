/**
 * Reglas puras de "Memoria musical" — Expresión Artística (sin DOM ni audio).
 *
 * El niño escucha `pasos` y luego los repite. En el espejo, la respuesta es esa
 * misma fila al revés. `evaluarOrden` solo mira el orden, no el tiempo.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["secuencia", "espejo"];
    const REGLAS = {
        "3-4 años": { tema: "bosque", tipos: ["secuencia", "secuencia", "secuencia", "secuencia"], largos: [2, 3, 3, 4] },
        "5-6 años": { tema: "estudio", tipos: ["secuencia", "secuencia", "espejo", "secuencia"], largos: [4, 5, 3, 5] }
    };

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    function lineas(x) {
        if (!x) return [];
        return (Array.isArray(x) ? x : [x]).filter(esLinea);
    }

    function lineasValidas(x) {
        const lista = Array.isArray(x) ? x : [x];
        return lista.length > 0 && lista.every(esLinea);
    }

    /** Lo que el niño debe tocar. El espejo invierte la fila que acaba de sonar. */
    function respuestaDe(reto) {
        const pasos = (reto && reto.pasos) || [];
        if (reto && reto.tipo === "espejo") return pasos.slice().reverse();
        return pasos.slice();
    }

    /** 'bien' avanza, 'completo' cierra la fila, 'mal' rompe el orden. */
    function evaluarOrden(pasos, hechos, id) {
        const esperado = (pasos || [])[hechos];
        if (esperado == null) return { estado: "completo", esperado: null };
        if (id !== esperado) return { estado: "mal", esperado: esperado };
        return { estado: hechos + 1 >= pasos.length ? "completo" : "bien", esperado: esperado };
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
            if (!e.sonido) errores.push("Elemento " + id + ": sin sonido");
        });
        if (!elementos[demo.elemento]) errores.push("Demo: elemento inexistente");

        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const regla = REGLAS[n.edad];
            if (!regla) {
                errores.push(tag + ": edad sin reglas (" + n.edad + ")");
                return;
            }
            if (!n.titulo) errores.push(tag + ": sin título");
            if (n.tema !== regla.tema) errores.push(tag + ": tema debe ser " + regla.tema);
            if (!escenas[n.escena]) errores.push(tag + ": escena inexistente");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            (n.bienvenida || []).forEach(function (l, i) {
                if (!l || !l.texto || (l.personaje !== 0 && l.personaje !== 1)) errores.push(tag + ": bienvenida " + (i + 1) + " inválida");
            });
            if (!lineasValidas(n.cierre) || n.cierre.length < 2) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");

            const retos = n.retos || [];
            if (!retos.length) {
                errores.push(tag + ": sin retos");
            } else if (retos.length > 1 && retos.map(function (r) { return r.tipo; }).join() !== regla.tipos.join()) {
                errores.push(tag + ": retos deben ser " + regla.tipos.join(", "));
            } else if (retos.length === 1 && regla.tipos.indexOf(retos[0].tipo) === -1) {
                errores.push(tag + ": tipo no permitido");
            }
            retos.forEach(function (r, i) {
                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);
                const rt = tag + " reto " + (r.id || i + 1);
                if (!r.titulo) errores.push(rt + ": sin título");
                if (TIPOS.indexOf(r.tipo) === -1) errores.push(rt + ": tipo desconocido");
                if (!lineasValidas(r.consigna)) errores.push(rt + ": consigna inválida");
                if (r.turno && !esLinea(r.turno)) errores.push(rt + ": turno inválido");
                if (!lineasValidas(r.acierto)) errores.push(rt + ": acierto inválido");
                if (!esLinea(r.error)) errores.push(rt + ": error inválido");
                const pasos = r.pasos || [];
                if (pasos.length !== regla.largos[iLargo]) errores.push(rt + ": la secuencia debe tener " + regla.largos[iLargo] + " pasos");
                const botones = r.botones || pasos.filter(function (id, k) { return pasos.indexOf(id) === k; });
                if (r.botones && r.botones.length < 2) errores.push(rt + ": faltan botones");
                pasos.forEach(function (id) {
                    if (!elementos[id]) errores.push(rt + ": elemento inexistente " + id);
                    if (botones.indexOf(id) === -1) errores.push(rt + ": el paso " + id + " no está en los botones");
                });
                botones.forEach(function (id) {
                    if (!elementos[id]) errores.push(rt + ": botón inexistente " + id);
                });
                if (r.acompanante && !elementos[r.acompanante]) errores.push(rt + ": acompañante inexistente");
                if (r.tipo === "espejo") {
                    const respuesta = respuestaDe(r);
                    if (respuesta.join() === pasos.join()) errores.push(rt + ": el espejo no puede ser igual de atrás hacia adelante");
                    if (respuesta.length !== pasos.length) errores.push(rt + ": la respuesta invertida cambió de largo");
                }
            });
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        esLinea: esLinea,
        lineas: lineas,
        respuestaDe: respuestaDe,
        evaluarOrden: evaluarOrden,
        validarConfig: validarConfig
    };

    global.MemoriaMusicalLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
