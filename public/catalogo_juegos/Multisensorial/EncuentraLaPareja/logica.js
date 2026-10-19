/**
 * EncuentraParejaLogica — reglas puras de "Encuentra la pareja" (sin DOM).
 *
 * Cada reto: un estímulo central (campana, flor, helado, sol) y burbujas de órganos
 * sensoriales. El niño toca (o arrastra hasta) el órgano correcto.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const ANIMACIONES = ["vuelaOido", "aspira", "lenguetazo", "gafas", "une"];

    /** Lo que exige el documento por edad. */
    const REGLAS = {
        "3": {
            retos: 4,
            opciones: [4, 4],
            organos: ["oido", "ojo", "nariz", "lengua"]
        },
        "5": {
            retos: 4,
            opciones: [5, 5],
            organos: ["oido", "ojo", "nariz", "lengua", "mano"]
        }
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
     * Opciones barajadas: el documento fija un orden, así que la correcta no queda
     * siempre primera ni en la misma posición que en el reto anterior.
     */
    function ordenarOpciones(opciones, correcto, posicionAnterior, aleatorio) {
        const lista = (opciones || []).slice();
        if (lista.length < 2) return lista;
        let orden = mezclar(lista, aleatorio);
        const valida = function (o) {
            const pos = o.indexOf(correcto);
            return pos !== 0 && (lista.length < 3 || pos !== posicionAnterior);
        };
        for (let i = 0; i < 60 && !valida(orden); i++) orden = mezclar(lista, aleatorio);
        if (!valida(orden)) {
            const resto = lista.filter(function (id) { return id !== correcto; });
            const pos = posicionAnterior === 1 && lista.length > 2 ? 2 : 1;
            resto.splice(pos, 0, correcto);
            orden = resto;
        }
        return orden;
    }

    function esCorrecto(reto, id) {
        return !!reto && reto.correcto === id;
    }

    function evaluar(reto, id) {
        return esCorrecto(reto, id) ? "correcto" : "incorrecto";
    }

    /**
     * Respuesta de error del documento. Si hay errores[] por objeto, se usa el propio;
     * si no, errorOtro (frase única del reto para cualquier distractor).
     */
    function errorPara(reto, id) {
        if (!reto || esCorrecto(reto, id)) return null;
        const propio = (reto.errores || []).find(function (e) {
            return (e.objetos || []).indexOf(id) !== -1;
        });
        const base = propio || reto.errorOtro;
        if (!esLinea(base)) return null;
        return { voz: base.voz, texto: base.texto, efecto: base.efecto || "suave" };
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

        Object.keys(elementos).forEach(function (id) {
            const e = elementos[id];
            if (!e.img) errores.push("Elemento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Elemento " + id + ": sin nombre");
            if (e.tipo !== "estimulo" && e.tipo !== "organo") errores.push("Elemento " + id + ": tipo inválido");
        });

        const usadosEstimulo = [];
        niveles.forEach(function (n) {
            (n.retos || []).forEach(function (r) {
                if (r.estimulo && usadosEstimulo.indexOf(r.estimulo) === -1) usadosEstimulo.push(r.estimulo);
            });
        });

        if (!demo.estimulo) errores.push("Demo: sin estímulo");
        else if (!elementos[demo.estimulo] || elementos[demo.estimulo].tipo !== "estimulo") {
            errores.push("Demo: estímulo inexistente");
        }
        if (usadosEstimulo.indexOf(demo.estimulo) !== -1) errores.push("Demo: " + demo.estimulo + " se usa en un reto");
        const demoOps = demo.opciones || [];
        if (demoOps.indexOf(demo.correcto) === -1) errores.push("Demo: la correcta no está entre las opciones");
        if (demoOps.length < 2) errores.push("Demo: muy pocas opciones");
        demoOps.forEach(function (id) {
            if (!elementos[id] || elementos[id].tipo !== "organo") errores.push("Demo: órgano inexistente " + id);
        });

        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const reglas = REGLAS[String(n.id)];
            if (!reglas) {
                errores.push(tag + ": sin reglas");
                return;
            }
            const retos = n.retos || [];
            if (retos.length !== reglas.retos) errores.push(tag + ": debe tener " + reglas.retos + " retos");
            const ids = [];
            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (i + 1);
                if (!r.id) errores.push(rt + ": sin id");
                else if (ids.indexOf(r.id) !== -1) errores.push(rt + ": id repetido");
                ids.push(r.id);
                if (!r.estimulo || !elementos[r.estimulo] || elementos[r.estimulo].tipo !== "estimulo") {
                    errores.push(rt + ": estímulo inválido");
                }
                const ops = r.opciones || [];
                if (ops.length < reglas.opciones[0] || ops.length > reglas.opciones[1]) {
                    errores.push(rt + ": " + ops.length + " opciones (deben ser " + reglas.opciones.join("-") + ")");
                }
                reglas.organos.forEach(function (org) {
                    if (ops.indexOf(org) === -1) errores.push(rt + ": falta el órgano " + org);
                });
                ops.forEach(function (id, j) {
                    if (!elementos[id] || elementos[id].tipo !== "organo") errores.push(rt + ": órgano inexistente " + id);
                    if (ops.indexOf(id) !== j) errores.push(rt + ": opción repetida " + id);
                });
                if (ops.indexOf(r.correcto) === -1) errores.push(rt + ": la correcta no está entre las opciones");
                if (!esLinea(r.presentacion)) errores.push(rt + ": presentación inválida");
                const a = r.acierto || {};
                if (!esLinea(a)) errores.push(rt + ": acierto sin voz válida");
                if (ANIMACIONES.indexOf(a.animacion) === -1) errores.push(rt + ": animación de acierto desconocida");
                if (!esLinea(r.errorOtro) && !(r.errores || []).length) errores.push(rt + ": falta voz de error");
                (r.errores || []).forEach(function (e, k) {
                    if (!esLinea(e)) errores.push(rt + " error " + (k + 1) + ": inválido");
                });
            });
            if (!Array.isArray(n.cierre) || !n.cierre.length || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida debe tener al menos 2 líneas");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
        });
        return errores;
    }

    const api = {
        ANIMACIONES: ANIMACIONES,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        ordenarOpciones: ordenarOpciones,
        esCorrecto: esCorrecto,
        evaluar: evaluar,
        errorPara: errorPara,
        clasificarGesto: clasificarGesto,
        dentro: dentro,
        validarConfig: validarConfig
    };

    global.EncuentraParejaLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
