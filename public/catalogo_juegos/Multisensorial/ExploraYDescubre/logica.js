/**
 * ExploraDescubreLogica — reglas puras (sin DOM).
 * 3-4: lupa y 4 tarjetas. 5-6: radar y 5 tarjetas.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const PISTAS = ["visual", "sonido", "aroma", "gusto"];
    const REGLAS = {
        "3": { retos: 4, mecanica: "lupa", opciones: 4, escena: "caja" },
        "5": { retos: 4, mecanica: "radar", opciones: 5, escena: "radar" }
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

    function preparar(reto, aleatorio) {
        return {
            mecanica: reto.mecanica,
            correcto: reto.correcto,
            opciones: ordenarOpciones(reto.opciones || [], reto.correcto, aleatorio),
            pista: reto.pista || null
        };
    }

    function evaluar(reto, id) {
        if (!reto || !id) return "incorrecto";
        return id === reto.correcto ? "correcto" : "incorrecto";
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
            if (retos.length !== reglas.retos) errores.push(tag + ": cantidad de retos");
            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (i + 1);
                if (r.mecanica !== reglas.mecanica) errores.push(rt + ": mecánica");
                if (PISTAS.indexOf(r.pista) === -1) errores.push(rt + ": pista");
                if (!esLinea(r.presentacion)) errores.push(rt + ": presentación");
                if (!esLinea(r.acierto)) errores.push(rt + ": acierto");
                if (!esLinea(r.errorOtro) && !(r.errores || []).length) errores.push(rt + ": falta voz de error");
                (r.errores || []).forEach(function (e) {
                    if (!esLinea(e)) errores.push(rt + ": error específico inválido");
                });
                const ops = r.opciones || [];
                if (ops.length !== reglas.opciones) errores.push(rt + ": cantidad de opciones");
                if (ops.indexOf(r.correcto) === -1) errores.push(rt + ": el correcto no está en las opciones");
                ops.forEach(function (id) { existe(id, rt); });
                if (reglas.mecanica === "radar") {
                    if (!Array.isArray(r.pistas) || r.pistas.length !== 2) errores.push(rt + ": se esperaban 2 pistas");
                    (r.pistas || []).forEach(function (p) {
                        if (!p || !p.texto || !p.icono) errores.push(rt + ": pista incompleta");
                    });
                }
            });
            if (!Array.isArray(n.cierre) || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        PISTAS: PISTAS,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        ordenarOpciones: ordenarOpciones,
        preparar: preparar,
        evaluar: evaluar,
        errorPara: errorPara,
        validarConfig: validarConfig
    };
    global.ExploraDescubreLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
