/**
 * Reglas puras de "Completa la melodía" — Expresión Artística (sin DOM ni audio).
 *
 * Una frase suena y se corta. El niño pone el cierre: un toque, la opción
 * conclusiva o las notas que faltan en los huecos.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["toque", "opcion", "arrastre"];
    const REGLAS = {
        "3-4 años": { tema: "estacion", tipos: ["toque", "toque", "toque", "arrastre"] },
        "5-6 años": { tema: "estudio", tipos: ["arrastre", "opcion", "arrastre", "toque"] }
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

    function esEvento(ev) {
        if (!ev) return false;
        const nota = typeof ev.nota === "string" && ev.nota.trim() !== "";
        const golpe = typeof ev.golpe === "string" && ev.golpe.trim() !== "";
        return nota !== golpe;
    }

    /** Un solo botón completa la frase. */
    function evaluarToque(boton, id) {
        if (!boton || id == null) return { estado: "mal", esperado: boton || null };
        return { estado: id === boton ? "completo" : "mal", esperado: boton };
    }

    /** De las opciones, solo una cierra la canción. */
    function evaluarOpcion(opciones, id) {
        const lista = opciones || [];
        const elegida = lista.find(function (o) { return o && o.id === id; });
        if (!elegida) return { estado: "mal", esperado: (lista.find(function (o) { return o && o.correcto; }) || {}).id || null };
        return { estado: elegida.correcto ? "completo" : "mal", esperado: (lista.find(function (o) { return o && o.correcto; }) || {}).id || null };
    }

    /**
     * La pieza `id` cae en el hueco `indice`.
     * `llenos` es la lista de lo ya colocado (null si sigue vacío).
     */
    function evaluarEncaje(solucion, llenos, id, indice) {
        const meta = solucion || [];
        const puestos = (llenos || []).slice();
        while (puestos.length < meta.length) puestos.push(null);
        if (indice < 0 || indice >= meta.length) return { estado: "mal", llenos: puestos, esperado: null };
        if (puestos[indice]) return { estado: "ocupado", llenos: puestos, esperado: meta[indice] };
        if (id !== meta[indice]) return { estado: "mal", llenos: puestos, esperado: meta[indice] };
        puestos[indice] = id;
        const completo = puestos.every(function (p) { return !!p; });
        return { estado: completo ? "completo" : "bien", llenos: puestos, esperado: meta[indice] };
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
                if (r.error && !esLinea(r.error)) errores.push(rt + ": error inválido");
                const intro = r.intro || [];
                if (!intro.length || !intro.every(esEvento)) errores.push(rt + ": la frase cortada no es válida");
                if (r.adorno && !elementos[r.adorno]) errores.push(rt + ": adorno inexistente");
                if (r.tipo === "toque") {
                    if (!elementos[r.boton]) errores.push(rt + ": botón inexistente");
                    if (!esEvento(r.cierre)) errores.push(rt + ": falta el sonido de cierre");
                } else if (r.tipo === "opcion") {
                    const ops = r.opciones || [];
                    const correctas = ops.filter(function (o) { return o && o.correcto; });
                    if (ops.length < 2 || correctas.length !== 1) errores.push(rt + ": debe haber una sola opción correcta");
                    ops.forEach(function (o) {
                        if (!o || !elementos[o.id]) errores.push(rt + ": opción inexistente");
                    });
                    if (!esLinea(r.error)) errores.push(rt + ": falta la voz de error");
                } else if (r.tipo === "arrastre") {
                    const solucion = r.solucion || [];
                    const piezas = r.piezas || [];
                    if (solucion.length < 1) errores.push(rt + ": no hay huecos");
                    solucion.forEach(function (id) {
                        if (!elementos[id]) errores.push(rt + ": falta la pieza " + id);
                        if (piezas.indexOf(id) === -1) errores.push(rt + ": " + id + " no está para arrastrar");
                    });
                    if (!esEvento(r.cierre) && !(Array.isArray(r.completa) && r.completa.length && r.completa.every(esEvento))) {
                        errores.push(rt + ": falta la melodía completa");
                    }
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
        esEvento: esEvento,
        evaluarToque: evaluarToque,
        evaluarOpcion: evaluarOpcion,
        evaluarEncaje: evaluarEncaje,
        validarConfig: validarConfig
    };

    global.CompletaMelodiaLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
