/**
 * Reglas puras de "Descubre el objeto" (sin DOM).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const LUCES = ["textura", "propiedad", "uso"];
    const ESTADOS_LUZ = ["ok", "casi"];
    const ESCENARIOS = {
        "3-4 años": {
            escenario: "cofre",
            opciones: [4, 4, 4],
            tipos: ["cofre", "cofre", "cofre"],
            ambientes: ["tiembla", "hojas", "reflejos"],
            aciertos: ["salto", "hojitas", "cristal"],
            premio: "medalla"
        },
        "5-6 años": {
            escenario: "radar",
            opciones: [4, 5, 3],
            tipos: ["radar", "radar", "limpieza"],
            ambientes: [null, null, null],
            aciertos: ["abrazo", "hojasMagicas", "encaja"],
            premio: null
        }
    };

    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    /** Una línea o una lista de líneas → lista. */
    function lineas(x) {
        if (!x) return [];
        return Array.isArray(x) ? x.filter(Boolean) : [x];
    }

    function clasificarGesto(dx, dy, umbral) {
        return Math.hypot(dx, dy) < (esNumero(umbral) ? umbral : 12) ? "toque" : "arrastre";
    }

    function dentro(p, r, margen) {
        const m = esNumero(margen) ? margen : 0;
        return !!r && p.x >= r.left - m && p.x <= r.left + r.width + m && p.y >= r.top - m && p.y <= r.top + r.height + m;
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

    function esCorrecto(reto, id) {
        return !!reto && reto.correcto === id;
    }

    /** Respuesta del reto para un distractor: la que lo nombra o, si no, la de "otros". */
    function respuestaError(reto, id) {
        if (!reto || esCorrecto(reto, id)) return null;
        const errores = reto.errores || [];
        return errores.find(function (e) { return (e.objetos || []).indexOf(id) !== -1; })
            || errores.find(function (e) { return e.otros === true; })
            || null;
    }

    /** Pista del radar: partes que se leen una a una y encienden su luz. */
    function partesPista(pista) {
        if (!pista) return [];
        if (Array.isArray(pista.partes)) return pista.partes.filter(function (p) { return p && p.texto; });
        return pista.texto ? [{ texto: pista.texto }] : [];
    }

    function textoPista(pista) {
        return partesPista(pista).map(function (p) { return p.texto.trim(); }).join(" ");
    }

    /** Fracción limpia de la capa de polvo a partir de sus alfas (0-255). */
    function fraccionLimpia(alfas, umbral) {
        if (!alfas || !alfas.length) return 0;
        const u = esNumero(umbral) ? umbral : 40;
        let limpios = 0;
        for (let i = 0; i < alfas.length; i++) {
            if (alfas[i] <= u) limpios += 1;
        }
        return limpios / alfas.length;
    }

    /** Objetos descubiertos en el nivel, en orden, para la galería final. */
    function hallazgos(nivel) {
        return ((nivel && nivel.retos) || []).map(function (r) { return r.correcto; }).filter(Boolean);
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];
        const objs = cfg.objetos || {};

        Object.keys(objs).forEach(function (id) {
            const o = objs[id];
            if (!o.img) err("objeto " + id + ": falta imagen");
            if (!o.nombre) err("objeto " + id + ": falta nombre");
            if (!o.sonido) err("objeto " + id + ": sin sonido al tocar");
        });

        const t = cfg.textos || {};
        ["demostracion", "demostracionAcierto", "demostracionFin"].forEach(function (k) {
            if (!t[k]) err("falta textos." + k);
        });
        const demo = cfg.demo || {};
        if (!objs[demo.objeto]) err("la demostración necesita un objeto existente");

        const edades = cfg.niveles.map(function (n) { return n.edad; }).sort();
        if (!edades.length || edades.some(function (e) { return Object.keys(ESCENARIOS).indexOf(e) === -1; })) {
            err("edad de nivel desconocida");
        }

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const reglas = ESCENARIOS[n.edad];
            if (!reglas) return;
            if (n.escenario !== reglas.escenario) err(tag + ": escenario debe ser " + reglas.escenario);
            if (!n.titulo) err(tag + ": sin título");
            if (!esLinea(n.cierre)) err(tag + ": cierre incompleto");
            if (reglas.premio) {
                if (!n.premio || !n.premio.titulo || !n.premio.nombre || n.premio.tipo !== reglas.premio) err(tag + ": premio incompleto");
            } else if (n.premio) {
                err(tag + ": el documento no define premio para este nivel");
            }
            if (n.escenario === "cofre" && (!n.cierreEscena || n.cierreEscena.tipo !== "galeria")) {
                err(tag + ": falta la galería de hallazgos");
            }
            if (n.escenario === "radar") {
                const ids = (n.luces || []).map(function (l) { return l.id; });
                if (ids.join("|") !== LUCES.join("|")) err(tag + ": el radar necesita las luces " + LUCES.join(", "));
                (n.luces || []).forEach(function (l) {
                    if (!l.nombre || !l.icono) err(tag + ": luz " + l.id + " sin nombre o icono");
                });
            }

            const retos = n.retos || [];
            if (!retos.length || retos.length > reglas.opciones.length) err(tag + ": debe tener entre 1 y " + reglas.opciones.length + " retos");
            retos.forEach(function (r, i) {
                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);
                const rt = tag + " reto " + r.id;
                const opciones = r.opciones || [];
                if (!r.titulo) err(rt + ": sin título");
                if ((r.tipo || "") !== reglas.tipos[iLargo]) err(rt + ": tipo debe ser " + reglas.tipos[iLargo]);
                if (opciones.length !== reglas.opciones[iLargo]) err(rt + ": debe mostrar " + reglas.opciones[iLargo] + " opciones");
                if (opciones.some(function (o, k) { return opciones.indexOf(o) !== k; })) err(rt + ": opciones repetidas");
                opciones.forEach(function (o) { if (!objs[o]) err(rt + ": objeto inexistente " + o); });
                if (opciones.indexOf(demo.objeto) !== -1) err(rt + ": el objeto de la demostración no puede ser un reto real");
                if (opciones.indexOf(r.correcto) === -1) err(rt + ": la respuesta no está entre las opciones");
                if ((r.ambiente || null) !== reglas.ambientes[iLargo]) err(rt + ": ambiente debe ser " + reglas.ambientes[iLargo]);
                if (!r.acierto || r.acierto.efecto !== reglas.aciertos[iLargo] || !r.acierto.sonido) err(rt + ": acierto inválido");
                if (r.acierto && r.acierto.texto && !esLinea(r.acierto)) err(rt + ": voz del acierto incompleta");

                if (r.tipo === "limpieza") {
                    if (!esLinea(r.consigna)) err(rt + ": consigna incompleta");
                    if (!esLinea(r.pregunta)) err(rt + ": pregunta incompleta");
                } else {
                    const partes = partesPista(r.pista);
                    if (!partes.length || !esLinea({ voz: r.pista && r.pista.voz, texto: textoPista(r.pista) })) err(rt + ": pista incompleta");
                    if (r.tipo === "radar") {
                        const luces = partes.map(function (p) { return p.luz; }).filter(Boolean);
                        if (luces.join("|") !== LUCES.join("|")) err(rt + ": la pista debe encender las 3 luces en orden");
                        partes.forEach(function (p) { if (p.luz && !p.valor) err(rt + ": la luz " + p.luz + " no muestra su pista"); });
                    }
                }

                (r.errores || []).forEach(function (e) {
                    if (!esLinea(e)) err(rt + ": respuesta de error sin voz o texto");
                    (e.objetos || []).forEach(function (o) {
                        if (o === r.correcto) err(rt + ": la respuesta correcta no puede tener error");
                        if (opciones.indexOf(o) === -1) err(rt + ": error para " + o + " que no está en pantalla");
                    });
                    if (e.radar) {
                        if (!Array.isArray(e.radar) || e.radar.length !== LUCES.length || !e.radar.every(function (s) { return ESTADOS_LUZ.indexOf(s) !== -1; })) {
                            err(rt + ": estado del radar inválido");
                        }
                    }
                });
                opciones.forEach(function (o) {
                    if (o !== r.correcto && !respuestaError(r, o)) err(rt + ": " + o + " no tiene respuesta de error");
                });
            });
        });
        return errores;
    }

    const api = {
        LUCES: LUCES,
        lineas: lineas,
        esLinea: esLinea,
        clasificarGesto: clasificarGesto,
        dentro: dentro,
        mezclar: mezclar,
        esCorrecto: esCorrecto,
        respuestaError: respuestaError,
        partesPista: partesPista,
        textoPista: textoPista,
        fraccionLimpia: fraccionLimpia,
        hallazgos: hallazgos,
        validarConfig: validarConfig
    };

    global.DescubreObjetoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
