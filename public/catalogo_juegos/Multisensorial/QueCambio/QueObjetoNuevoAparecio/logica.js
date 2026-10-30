/**
 * QueCambioLogica — reglas puras de "¿Qué cambió?" (sin DOM).
 * Mecánicas: color, falta, aparece.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const MECANICAS = ["color", "falta", "aparece"];
    const REGLAS = {
        "3": { retos: 3, mecanicas: ["color", "falta", "aparece"], escena: "estudio" },
        "5": { retos: 3, mecanicas: ["color", "falta", "aparece"], escena: "detective" }
    };

    function esLinea(l) {
        return !!(l && typeof l.texto === "string" && l.texto.trim() && VOCES.indexOf(l.voz) !== -1);
    }

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

    function ordenarOpciones(opciones, correcto, aleatorio) {
        const lista = (opciones || []).slice();
        if (lista.length < 2) return lista;
        let orden = mezclar(lista, aleatorio);
        for (let i = 0; i < 40 && orden[0] === correcto; i++) orden = mezclar(lista, aleatorio);
        return orden;
    }

    function aspectoDe(reto, id) {
        const mapa = (reto && reto.aspecto) || {};
        return mapa[id] || null;
    }

    function preparar(reto, aleatorio) {
        const mostrar = (reto.mostrar || []).slice();
        const ctx = { mecanica: reto.mecanica, mostrar: mostrar };
        if (reto.mecanica === "color") {
            const id = reto.cambio.id;
            ctx.correcto = id;
            ctx.desafio = mostrar.slice();
            ctx.aspecto = {};
            ctx.aspectoNuevo = {};
            mostrar.forEach(function (item) {
                ctx.aspecto[item] = aspectoDe(reto, item);
                ctx.aspectoNuevo[item] = item === id ? reto.cambio.a : aspectoDe(reto, item);
            });
        } else if (reto.mecanica === "falta") {
            const idx = mostrar.indexOf(reto.faltante);
            ctx.correcto = reto.faltante;
            ctx.indice = idx;
            ctx.desafio = mostrar.map(function (item, i) { return i === idx ? null : item; });
            ctx.opciones = ordenarOpciones(reto.opciones || [], reto.faltante, aleatorio);
            ctx.aspecto = {};
            mostrar.forEach(function (item) { ctx.aspecto[item] = aspectoDe(reto, item); });
        } else if (reto.mecanica === "aparece") {
            const desafio = mostrar.slice();
            const idx = typeof reto.indiceIntruso === "number"
                ? reto.indiceIntruso
                : Math.floor(desafio.length / 2);
            desafio.splice(idx, 0, reto.intruso);
            ctx.correcto = reto.intruso;
            ctx.indice = idx;
            ctx.desafio = desafio;
            ctx.aspecto = {};
            mostrar.forEach(function (item) { ctx.aspecto[item] = aspectoDe(reto, item); });
        } else {
            throw new Error("Mecánica desconocida: " + reto.mecanica);
        }
        return ctx;
    }

    function evaluar(reto, ctx, id) {
        if (!reto || !ctx || !id) return "incorrecto";
        return id === ctx.correcto ? "correcto" : "incorrecto";
    }

    function errorPara(reto, id) {
        if (!reto) return null;
        const propio = (reto.errores || []).find(function (e) {
            return (e.objetos || []).indexOf(id) !== -1;
        });
        const base = propio || reto.errorOtro;
        if (!esLinea(base)) return null;
        return { voz: base.voz, texto: base.texto, efecto: base.efecto || "boing" };
    }

    function validarConfig(cfg) {
        const errores = [];
        const elementos = (cfg && cfg.elementos) || {};
        const niveles = (cfg && cfg.niveles) || [];
        if (!niveles.length) errores.push("Sin niveles");
        if (cfg && (cfg.stub || cfg.creado_en)) errores.push("config aún es stub");
        Object.keys(elementos).forEach(function (id) {
            if (!elementos[id].img) errores.push("Elemento " + id + ": sin imagen");
            if (!elementos[id].nombre) errores.push("Elemento " + id + ": sin nombre");
        });
        function existe(id, rt) {
            if (!elementos[id]) errores.push(rt + ": objeto inexistente " + id);
        }
        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const reglas = REGLAS[String(n.id)];
            if (!reglas) {
                errores.push(tag + ": sin reglas");
                return;
            }
            if (n.escena !== reglas.escena) errores.push(tag + ": escena");
            const retos = n.retos || [];
            if (!retos.length || retos.length > reglas.retos) errores.push(tag + ": cantidad de retos");
            retos.forEach(function (r, i) {
                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);
                const rt = tag + " reto " + (i + 1);
                if (r.mecanica !== reglas.mecanicas[iLargo]) errores.push(rt + ": se esperaba " + reglas.mecanicas[iLargo]);
                if (MECANICAS.indexOf(r.mecanica) === -1) errores.push(rt + ": mecánica inválida");
                if (!(r.mostrar || []).length) errores.push(rt + ": sin mostrar");
                (r.mostrar || []).forEach(function (id) { existe(id, rt); });
                if (!esLinea(r.presentacion)) errores.push(rt + ": presentación inválida");
                if (!esLinea(r.pregunta)) errores.push(rt + ": pregunta inválida");
                if (!esLinea(r.acierto)) errores.push(rt + ": acierto inválido");
                if (!esLinea(r.errorOtro) && !(r.errores || []).length) errores.push(rt + ": falta voz de error");
                if (!(r.observacionMs > 0)) errores.push(rt + ": observacionMs");
                if (!(r.ocultamientoMs > 0)) errores.push(rt + ": ocultamientoMs");
                if (r.mecanica === "color") {
                    if (!r.cambio || (r.mostrar || []).indexOf(r.cambio.id) === -1 || !r.cambio.a) {
                        errores.push(rt + ": cambio inválido");
                    }
                }
                if (r.mecanica === "falta") {
                    if ((r.mostrar || []).indexOf(r.faltante) === -1) errores.push(rt + ": faltante inválido");
                    if ((r.opciones || []).indexOf(r.faltante) === -1) errores.push(rt + ": opciones sin el faltante");
                    (r.opciones || []).forEach(function (id) { existe(id, rt); });
                }
                if (r.mecanica === "aparece") {
                    existe(r.intruso, rt);
                    if ((r.mostrar || []).indexOf(r.intruso) !== -1) errores.push(rt + ": el intruso ya estaba");
                }
            });
            if (!Array.isArray(n.cierre) || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        MECANICAS: MECANICAS,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        ordenarOpciones: ordenarOpciones,
        preparar: preparar,
        evaluar: evaluar,
        errorPara: errorPara,
        validarConfig: validarConfig
    };
    global.QueCambioLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
