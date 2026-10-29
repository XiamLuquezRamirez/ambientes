/**
 * AsociaSonidoLogica — reglas puras de "Asocia sonido e imagen" (sin DOM).
 *
 * Cada reto: suena un estímulo, termina, aparecen las imágenes y el niño toca la que
 * corresponde (una sola correcta). En 5-6 el reto final espera ~2 s antes de mostrarlas.
 */
(function (global) {
    "use strict";

    /** Cómo responde la imagen correcta al acertar (documento, "Respuesta del sistema"). */
    const ANIMACIONES = ["salta", "vibra", "fotogramas", "despega", "avanza", "limpia"];

    /** Lo que exige el documento por edad. */
    const REGLAS = {
        "3": {
            retos: 5,
            opciones: [3, 3],
            /* Solo el reto 1 define voz de error (Zeus: ¡Escucha otra vez!). */
            errorConVoz: ["que-suena"],
            esperaAntesDeOpciones: {}
        },
        "5": {
            retos: 6,
            opciones: [4, 5],
            errorConVoz: [],
            esperaAntesDeOpciones: { "gran-asociacion": 2000 }
        }
    };

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
     * Opciones barajadas: el documento lista siempre la correcta primero, así que nunca
     * queda en la primera posición ni en la misma que ocupó en el reto anterior.
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

    function evaluar(reto, id) {
        return reto && id === reto.correcto ? "correcto" : "incorrecto";
    }

    function esperaAntesDeOpciones(nivelId, reto) {
        const r = REGLAS[String(nivelId)];
        if (!r || !reto) return 0;
        return r.esperaAntesDeOpciones[reto.id] || 0;
    }

    function esLinea(l) {
        return !!(l && typeof l.texto === "string" && l.texto.trim() && (l.voz === "zoe" || l.voz === "zeus"));
    }

    function validarConfig(cfg, estimulos) {
        const errores = [];
        const elementos = (cfg && cfg.elementos) || {};
        const niveles = (cfg && cfg.niveles) || [];
        const demo = (cfg && cfg.demo) || {};
        const sonidoValido = function (s) { return !estimulos || estimulos.indexOf(s) !== -1; };
        if (!niveles.length) errores.push("Sin niveles");

        Object.keys(elementos).forEach(function (id) {
            const e = elementos[id];
            if (!e.img) errores.push("Elemento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Elemento " + id + ": sin nombre");
            if (e.fotogramas && !Array.isArray(e.fotogramas)) errores.push("Elemento " + id + ": fotogramas no es lista");
        });

        const usados = [];
        niveles.forEach(function (n) {
            (n.retos || []).forEach(function (r) {
                (r.opciones || []).forEach(function (id) { if (usados.indexOf(id) === -1) usados.push(id); });
            });
        });
        const demoOps = demo.opciones || [];
        if (!demo.sonido) errores.push("Demo: sin sonido");
        else if (!sonidoValido(demo.sonido)) errores.push("Demo: sonido inexistente " + demo.sonido);
        if (demoOps.indexOf(demo.correcto) === -1) errores.push("Demo: la correcta no está entre las opciones");
        if (demoOps.length < 2) errores.push("Demo: muy pocas opciones");
        demoOps.forEach(function (id) {
            if (!elementos[id]) errores.push("Demo: elemento inexistente " + id);
            if (usados.indexOf(id) !== -1) errores.push("Demo: " + id + " se usa en un reto");
        });

        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const reglas = REGLAS[String(n.id)];
            if (!reglas) {
                errores.push(tag + ": sin reglas");
                return;
            }
            const retos = n.retos || [];
            if (!retos.length || retos.length > reglas.retos) errores.push(tag + ": debe tener entre 1 y " + reglas.retos + " retos");
            const ids = [];
            retos.forEach(function (r, i) {
                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);
                const rt = tag + " reto " + (i + 1);
                if (!r.id) errores.push(rt + ": sin id");
                else if (ids.indexOf(r.id) !== -1) errores.push(rt + ": id repetido");
                ids.push(r.id);
                if (!r.sonido) errores.push(rt + ": sin sonido");
                else if (!sonidoValido(r.sonido)) errores.push(rt + ": sonido inexistente " + r.sonido);
                const ops = r.opciones || [];
                if (ops.length < reglas.opciones[0] || ops.length > reglas.opciones[1]) {
                    errores.push(rt + ": " + ops.length + " opciones (deben ser " + reglas.opciones.join("-") + ")");
                }
                ops.forEach(function (id, j) {
                    if (!elementos[id]) errores.push(rt + ": elemento inexistente " + id);
                    if (ops.indexOf(id) !== j) errores.push(rt + ": opción repetida " + id);
                });
                if (ops.indexOf(r.correcto) === -1) errores.push(rt + ": la correcta no está entre las opciones");
                const a = r.acierto || {};
                if (ANIMACIONES.indexOf(a.animacion) === -1) errores.push(rt + ": animación de acierto desconocida");
                if (a.animacion === "fotogramas" && !((elementos[r.correcto] || {}).fotogramas || []).length) {
                    errores.push(rt + ": la correcta no tiene fotogramas");
                }
                if (a.repetir && a.repetir !== "completo" && a.repetir !== "breve") errores.push(rt + ": repetir inválido");
                if (a.texto && !esLinea(a)) errores.push(rt + ": acierto sin voz válida");
                const conVoz = reglas.errorConVoz.indexOf(r.id) !== -1;
                if (conVoz && !esLinea(r.error)) errores.push(rt + ": el documento pide voz de error");
                if (!conVoz && r.error) errores.push(rt + ": el documento no define voz de error");
            });
            if (!Array.isArray(n.cierre) || !n.cierre.length || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length !== 2) errores.push(tag + ": bienvenida debe tener 2 líneas");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
        });
        return errores;
    }

    const api = {
        ANIMACIONES: ANIMACIONES,
        REGLAS: REGLAS,
        mezclar: mezclar,
        ordenarOpciones: ordenarOpciones,
        evaluar: evaluar,
        esperaAntesDeOpciones: esperaAntesDeOpciones,
        esLinea: esLinea,
        validarConfig: validarConfig
    };

    global.AsociaSonidoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
