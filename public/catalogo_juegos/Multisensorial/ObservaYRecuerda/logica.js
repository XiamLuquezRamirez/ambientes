/**
 * ObservaRecuerdaLogica — reglas puras de "Observa y recuerda" (sin DOM).
 * Mecánicas: intruso, faltante, intercambio.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const MECANICAS = ["intruso", "faltante", "intercambio"];

    const REGLAS = {
        "3": { retos: 2, mecanicas: ["intruso", "faltante"], escena: "baul" },
        "5": { retos: 3, mecanicas: ["intruso", "faltante", "intercambio"], escena: "museo" }
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

    /**
     * Baraja opciones. Solo evita que la correcta quede SIEMPRE primera
     * (pista involuntaria); sí puede ir al final.
     */
    function ordenarOpciones(opciones, correcto, aleatorio) {
        const lista = (opciones || []).slice();
        if (lista.length < 2) return lista;
        let orden = mezclar(lista, aleatorio);
        for (let i = 0; i < 40 && lista.length > 2 && orden[0] === correcto; i++) {
            orden = mezclar(lista, aleatorio);
        }
        return orden;
    }

    /**
     * Construye el contexto de reto (mostrar / desafío / correctos).
     * `reto` trae el contenido fijo del documento.
     */
    function prepararCtx(reto, aleatorio) {
        const rnd = typeof aleatorio === "function" ? aleatorio : Math.random;
        const ctx = { mecanica: reto.mecanica };
        if (reto.mecanica === "intruso") {
            const base = (reto.mostrar || []).slice();
            const intruso = reto.intruso;
            ctx.mostrar = base;
            if (reto.conservarOrden) {
                ctx.desafio = base.slice();
                const idx = typeof reto.indiceIntruso === "number"
                    ? Math.max(0, Math.min(base.length, reto.indiceIntruso))
                    : Math.floor(rnd() * (base.length + 1));
                ctx.desafio.splice(idx, 0, intruso);
                ctx.indiceIntruso = idx;
            } else {
                ctx.desafio = ordenarOpciones(base.concat([intruso]), intruso, rnd);
            }
            ctx.correctos = [intruso];
        } else if (reto.mecanica === "faltante") {
            const base = (reto.mostrar || []).slice();
            const faltante = reto.faltante;
            const indice = typeof reto.indiceFaltante === "number"
                ? reto.indiceFaltante
                : base.indexOf(faltante);
            ctx.mostrar = base;
            ctx.desafio = base.map(function (id, i) { return i === indice ? null : id; });
            ctx.indice = indice;
            ctx.opciones = ordenarOpciones(reto.opciones || [], faltante, rnd);
            ctx.correctos = [faltante];
        } else if (reto.mecanica === "intercambio") {
            const base = (reto.mostrar || []).slice();
            const a = reto.intercambiar[0];
            const b = reto.intercambiar[1];
            const i = base.indexOf(a);
            const j = base.indexOf(b);
            ctx.mostrar = base;
            ctx.desafio = base.slice();
            ctx.desafio[i] = base[j];
            ctx.desafio[j] = base[i];
            ctx.correctos = [a, b];
        } else {
            throw new Error("Mecánica desconocida: " + reto.mecanica);
        }
        return ctx;
    }

    function esCorrectoUnico(ctx, id) {
        return !!ctx && (ctx.correctos || []).length === 1 && ctx.correctos[0] === id;
    }

    /**
     * @param {string|string[]} seleccion id tocado, o array de ids (intercambio).
     * @returns {"correcto"|"incorrecto"|"parcial"}
     */
    function evaluar(reto, ctx, seleccion) {
        if (!reto || !ctx) return "incorrecto";
        if (reto.mecanica === "intercambio") {
            const ids = Array.isArray(seleccion) ? seleccion.slice() : [seleccion];
            const corr = (ctx.correctos || []).slice().sort();
            const uniq = ids.filter(function (v, i) { return ids.indexOf(v) === i; }).sort();
            if (uniq.length < 2) {
                if (uniq.length === 1 && corr.indexOf(uniq[0]) !== -1) return "parcial";
                return "incorrecto";
            }
            if (uniq.length === 2 && uniq[0] === corr[0] && uniq[1] === corr[1]) return "correcto";
            return "incorrecto";
        }
        const id = Array.isArray(seleccion) ? seleccion[0] : seleccion;
        return esCorrectoUnico(ctx, id) ? "correcto" : "incorrecto";
    }

    function errorPara(reto, id) {
        if (!reto) return null;
        if ((reto.mecanica === "intruso" || reto.mecanica === "faltante") && id === (reto.intruso || reto.faltante)) {
            return null;
        }
        const propio = (reto.errores || []).find(function (e) {
            return (e.objetos || []).indexOf(id) !== -1;
        });
        const base = propio || reto.errorOtro;
        if (!esLinea(base)) return null;
        return { voz: base.voz, texto: base.texto, efecto: base.efecto || "boing" };
    }

    function clasificarGesto(dx, dy, umbral) {
        return Math.hypot(dx, dy) < (typeof umbral === "number" ? umbral : 12) ? "toque" : "arrastre";
    }

    function dentro(p, r, margen) {
        const m = typeof margen === "number" ? margen : 0;
        return !!r && p.x >= r.left - m && p.x <= r.left + r.width + m && p.y >= r.top - m && p.y <= r.top + r.height + m;
    }

    function validarConfig(cfg) {
        const errores = [];
        const elementos = (cfg && cfg.elementos) || {};
        const niveles = (cfg && cfg.niveles) || [];
        const demo = (cfg && cfg.demo) || {};
        if (!niveles.length) errores.push("Sin niveles");
        if (cfg && (cfg.stub || cfg.creado_en)) errores.push("config aún es stub");

        Object.keys(elementos).forEach(function (id) {
            const e = elementos[id];
            if (!e.img) errores.push("Elemento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Elemento " + id + ": sin nombre");
        });

        if (!demo.mecanica || MECANICAS.indexOf(demo.mecanica) === -1) errores.push("Demo: mecánica inválida");
        if (!(demo.mostrar || []).length) errores.push("Demo: sin mostrar");

        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const reglas = REGLAS[String(n.id)];
            if (!reglas) {
                errores.push(tag + ": sin reglas");
                return;
            }
            const retos = n.retos || [];
            if (retos.length !== reglas.retos) errores.push(tag + ": debe tener " + reglas.retos + " retos");
            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (i + 1);
                if (MECANICAS.indexOf(r.mecanica) === -1) errores.push(rt + ": mecánica inválida");
                if (reglas.mecanicas[i] && r.mecanica !== reglas.mecanicas[i]) {
                    errores.push(rt + ": se esperaba " + reglas.mecanicas[i]);
                }
                if (!(r.mostrar || []).length) errores.push(rt + ": sin mostrar");
                (r.mostrar || []).forEach(function (id) {
                    if (!elementos[id]) errores.push(rt + ": objeto inexistente " + id);
                });
                if (!esLinea(r.presentacion)) errores.push(rt + ": presentación inválida");
                if (!esLinea(r.pregunta)) errores.push(rt + ": pregunta inválida");
                if (!esLinea(r.acierto)) errores.push(rt + ": acierto inválido");
                if (!esLinea(r.errorOtro) && !(r.errores || []).length) errores.push(rt + ": falta voz de error");
                if (!(r.observacionMs > 0)) errores.push(rt + ": observacionMs inválido");
                if (r.mecanica === "intruso") {
                    if (!r.intruso || !elementos[r.intruso]) errores.push(rt + ": intruso inválido");
                    if ((r.mostrar || []).indexOf(r.intruso) !== -1) errores.push(rt + ": el intruso no puede estar en mostrar");
                }
                if (r.mecanica === "faltante") {
                    if (!r.faltante || (r.mostrar || []).indexOf(r.faltante) === -1) errores.push(rt + ": faltante inválido");
                    if (!(r.opciones || []).length || (r.opciones || []).indexOf(r.faltante) === -1) {
                        errores.push(rt + ": opciones deben incluir el faltante");
                    }
                }
                if (r.mecanica === "intercambio") {
                    const par = r.intercambiar || [];
                    if (par.length !== 2) errores.push(rt + ": intercambiar debe tener 2 ids");
                    else {
                        par.forEach(function (id) {
                            if ((r.mostrar || []).indexOf(id) === -1) errores.push(rt + ": " + id + " no está en mostrar");
                        });
                    }
                }
            });
            if (!Array.isArray(n.cierre) || !n.cierre.length || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
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
        prepararCtx: prepararCtx,
        evaluar: evaluar,
        errorPara: errorPara,
        clasificarGesto: clasificarGesto,
        dentro: dentro,
        validarConfig: validarConfig
    };

    global.ObservaRecuerdaLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
