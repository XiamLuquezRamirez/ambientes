/**
 * Reglas puras de "Repite la secuencia" (sin DOM).
 * Escuchar → recordar → repetir tocando → validar cada posición.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const EFECTOS = ["celebra", "repetir", "especial", "final"];

    /** Secuencias y opciones tal como las fija el documento (null = el documento no las precisa). */
    const REGLAS = {
        "3-4 años": {
            secuencias: [
                [["perro", "gato"]],
                [["tambor", "campana"]],
                [["pajaro", "campana", "perro"]],
                [["pelota", "gato"]],
                [["tambor", "pajaro", "campana"]]
            ],
            opciones: [
                ["perro", "gato"],
                ["tambor", "campana", "maracas"],
                ["pajaro", "campana", "perro"],
                ["pelota", "gato", "perro"],
                null
            ],
            efectos: ["celebra", "celebra", "repetir", "celebra", "final"],
            errorConVoz: true,
            maxOpciones: 3
        },
        "5-6 años": {
            secuencias: [
                [["campana", "tambor", "pajaro"]],
                [["carro", "campana", "perro"]],
                [["tambor", "pajaro", "campana", "gato"]],
                [["perro", "campana", "pajaro"], ["perro", "pajaro", "campana"]],
                [["tambor", "pajaro", "campana", "perro", "pelota"]]
            ],
            opciones: [
                ["campana", "tambor", "pajaro", "maracas"],
                null,
                null,
                null,
                null
            ],
            efectos: ["repetir", "celebra", "especial", "celebra", "final"],
            errorConVoz: false,
            maxOpciones: 6
        }
    };

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
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

    /** true si, leyendo de izquierda a derecha, los elementos de la secuencia aparecen en su orden. */
    function revelaOrden(orden, secuencia) {
        let previo = -1;
        for (let i = 0; i < secuencia.length; i++) {
            const pos = orden.indexOf(secuencia[i]);
            if (pos === -1 || pos < previo) return false;
            previo = pos;
        }
        return true;
    }

    /**
     * true si la secuencia se puede leer en pantalla de izquierda a derecha o, desde 3 sonidos,
     * de derecha a izquierda (con 2 sonidos uno de los dos sentidos es inevitable).
     */
    function delataOrden(orden, secuencia) {
        if (revelaOrden(orden, secuencia)) return true;
        return secuencia.length >= 3 && revelaOrden(orden.slice().reverse(), secuencia);
    }

    /** Opciones barajadas sin que su posición en pantalla delate la secuencia. */
    function ordenarOpciones(opciones, secuencia, aleatorio) {
        const seq = secuencia || [];
        let orden = mezclar(opciones, aleatorio);
        for (let i = 0; i < 40 && delataOrden(orden, seq); i++) {
            orden = mezclar(opciones, aleatorio);
        }
        if (revelaOrden(orden, seq) && orden.length > 1) orden = orden.slice().reverse();
        return orden;
    }

    /**
     * Valida un toque contra la posición que toca.
     * "repetido": ya estaba elegido (un doble toque no cuenta como error).
     */
    function evaluar(secuencia, elegidos, id) {
        if (elegidos.indexOf(id) !== -1) return "repetido";
        if (secuencia[elegidos.length] !== id) return "error";
        return elegidos.length + 1 === secuencia.length ? "completo" : "correcto";
    }

    /** Elementos que suenan en el reto (todas sus secuencias). */
    function elementosDe(reto) {
        const out = [];
        ((reto && reto.secuencias) || []).forEach(function (s) {
            (s || []).forEach(function (id) { if (out.indexOf(id) === -1) out.push(id); });
        });
        return out;
    }

    function mismaLista(a, b) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (x, i) { return x === b[i]; });
    }

    function mismoConjunto(a, b) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (x) { return b.indexOf(x) !== -1; });
    }

    function validarConfig(cfg) {
        const errores = [];
        const elementos = (cfg && cfg.elementos) || {};
        const niveles = (cfg && cfg.niveles) || [];
        const demo = (cfg && cfg.demo) || {};
        if (!niveles.length) errores.push("Sin niveles");

        Object.keys(elementos).forEach(function (id) {
            const e = elementos[id];
            if (!e.img) errores.push("Elemento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Elemento " + id + ": sin nombre");
            if (!e.sonido) errores.push("Elemento " + id + ": sin sonido");
        });

        const usados = [];
        niveles.forEach(function (n) {
            (n.retos || []).forEach(function (r) {
                elementosDe(r).concat(r.opciones || []).forEach(function (id) { if (usados.indexOf(id) === -1) usados.push(id); });
            });
        });
        const demoSeq = demo.secuencia || [];
        if (demoSeq.length < 2) errores.push("Demo: la secuencia debe tener al menos 2 sonidos");
        demoSeq.forEach(function (id) {
            if (!elementos[id]) errores.push("Demo: elemento inexistente " + id);
            if (usados.indexOf(id) !== -1) errores.push("Demo: " + id + " se usa en un reto");
        });

        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const regla = REGLAS[n.edad];
            if (!regla) {
                errores.push(tag + ": edad sin reglas (" + n.edad + ")");
                return;
            }
            if (!n.titulo) errores.push(tag + ": sin título");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            (n.bienvenida || []).forEach(function (l, i) {
                if (!l || !l.texto || (l.personaje !== 0 && l.personaje !== 1)) errores.push(tag + ": bienvenida " + (i + 1) + " inválida");
            });
            if (!Array.isArray(n.cierre) || !n.cierre.length || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");

            const retos = n.retos || [];
            if (retos.length !== regla.secuencias.length) errores.push(tag + ": debe tener " + regla.secuencias.length + " retos");

            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (r.id || i + 1);
                const seqs = r.secuencias || [];
                if (!seqs.length) errores.push(rt + ": sin secuencias");
                seqs.forEach(function (s, k) {
                    if (!Array.isArray(s) || s.length < 2) errores.push(rt + ": secuencia " + (k + 1) + " demasiado corta");
                    (s || []).forEach(function (id, j) {
                        if (!elementos[id]) errores.push(rt + ": elemento inexistente " + id);
                        if (s.indexOf(id) !== j) errores.push(rt + ": " + id + " repetido en la secuencia");
                    });
                });
                const esperadas = regla.secuencias[i];
                if (esperadas && (seqs.length !== esperadas.length || !esperadas.every(function (s, k) { return mismaLista(s, seqs[k]); }))) {
                    errores.push(rt + ": las secuencias deben ser " + esperadas.map(function (s) { return s.join("-"); }).join(" / "));
                }

                const ops = r.opciones || [];
                if (ops.length < 2) errores.push(rt + ": muy pocas opciones");
                if (ops.length > regla.maxOpciones) errores.push(rt + ": más de " + regla.maxOpciones + " opciones");
                if (ops.some(function (id, k) { return ops.indexOf(id) !== k; })) errores.push(rt + ": opciones repetidas");
                ops.forEach(function (id) {
                    if (!elementos[id]) errores.push(rt + ": opción inexistente " + id);
                });
                elementosDe(r).forEach(function (id) {
                    if (ops.indexOf(id) === -1) errores.push(rt + ": " + id + " suena pero no está entre las opciones");
                });
                if (regla.opciones[i] && !mismoConjunto(ops, regla.opciones[i])) errores.push(rt + ": opciones deben ser " + regla.opciones[i].join(", "));

                const a = r.acierto || {};
                if (EFECTOS.indexOf(a.efecto) === -1) errores.push(rt + ": efecto de acierto desconocido");
                if (regla.efectos[i] && a.efecto !== regla.efectos[i]) errores.push(rt + ": efecto de acierto debe ser " + regla.efectos[i]);
                if (a.texto && !esLinea(a)) errores.push(rt + ": línea de acierto inválida");

                if (regla.errorConVoz && !esLinea(r.error)) errores.push(rt + ": falta la voz de error");
                if (!regla.errorConVoz && r.error) errores.push(rt + ": el documento no da voz de error en esta edad");
            });
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        EFECTOS: EFECTOS,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        revelaOrden: revelaOrden,
        delataOrden: delataOrden,
        ordenarOpciones: ordenarOpciones,
        evaluar: evaluar,
        elementosDe: elementosDe,
        validarConfig: validarConfig
    };

    global.RepiteSecuenciaLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
