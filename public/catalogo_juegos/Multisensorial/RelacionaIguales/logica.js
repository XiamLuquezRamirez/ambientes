/**
 * Reglas puras de "Relaciona iguales" (sin DOM).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TACTOS = ["suave", "aspero", "liso", "rugoso", "duro", "frio", "poroso"];
    const ESCENARIOS = {
        "3-4 años": {
            escenario: "espejo",
            opciones: [3, 3, 4, 4],
            unir: ["estrellitas", "polvillo", "entrelazar", "brillan"],
            rechazo: ["timbreDesafinado", "vibraDetiene", "rebotaSinDeslizar", "devolver"],
            cierre: "mural",
            premio: "medalla"
        },
        "5-6 años": {
            escenario: "laboratorio",
            opciones: [5, 5, 5, 5, 5],
            unir: ["ondasSuaves", "crestas", "deslizarTelas", "prisma", "compresion"],
            rechazo: ["luzAmarilla", "devolver"],
            cierre: "tabla",
            premio: "diploma"
        }
    };

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    /** Una línea o una lista de líneas → lista. */
    function lineas(x) {
        if (!x) return [];
        return Array.isArray(x) ? x.filter(Boolean) : [x];
    }

    function clasificarGesto(dx, dy, umbral) {
        return Math.hypot(dx, dy) < (typeof umbral === "number" ? umbral : 12) ? "toque" : "arrastre";
    }

    function esCorrecto(reto, matId) {
        return !!reto && reto.correcto === matId;
    }

    /**
     * Respuesta del sistema cuando el objeto no es la pareja: la del documento para ese objeto
     * o, si el documento no la describe, la respuesta general del reto ("al elegir otro").
     */
    function errorPara(reto, matId) {
        if (!reto || esCorrecto(reto, matId)) return null;
        const propio = (reto.errores || []).find(function (e) { return (e.objetos || []).indexOf(matId) !== -1; });
        const base = propio || reto.errorOtro;
        if (!esLinea(base)) return null;
        return {
            voz: base.voz,
            texto: base.texto,
            efecto: base.efecto || "devolver",
            sonido: base.sonido || "devolver"
        };
    }

    /** Nombre que muestra el reto para un material (el documento a veces lo llama distinto). */
    function nombreEn(reto, matId, materiales) {
        const propio = reto && reto.nombres && reto.nombres[matId];
        if (propio) return propio;
        const m = (materiales || {})[matId];
        return (m && m.nombre) || matId;
    }

    function dentro(p, r, margen) {
        const m = typeof margen === "number" ? margen : 0;
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

    /** Parejas del nivel en orden (mural 3-4 / tabla periódica 5-6). */
    function parejas(nivel) {
        return ((nivel && nivel.retos) || []).map(function (r) {
            return { modelo: r.modelo, pareja: r.correcto, categoria: r.categoria || "" };
        });
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];
        const mats = cfg.materiales || {};

        Object.keys(mats).forEach(function (id) {
            const m = mats[id];
            if (!m.img) err("material " + id + ": falta imagen");
            if (!m.nombre) err("material " + id + ": falta nombre");
            if (TACTOS.indexOf(m.tacto) === -1) err("material " + id + ": tacto inválido");
            if (!m.sonido) err("material " + id + ": sin sonido al tocar");
        });

        const t = cfg.textos || {};
        ["demostracion", "demostracionAcierto", "demostracionFin"].forEach(function (k) {
            if (!t[k]) err("falta textos." + k);
        });
        const demo = cfg.demo || {};
        if (!mats[demo.modelo] || !mats[demo.pareja]) err("la demostración necesita modelo y pareja existentes");

        const edades = cfg.niveles.map(function (n) { return n.edad; }).sort();
        if (edades.join("|") !== Object.keys(ESCENARIOS).sort().join("|")) {
            err("los niveles deben ser exactamente 3-4 años y 5-6 años");
        }

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const reglas = ESCENARIOS[n.edad];
            if (!reglas) return;
            if (n.escenario !== reglas.escenario) err(tag + ": escenario debe ser " + reglas.escenario);
            const retos = n.retos || [];
            if (retos.length !== reglas.opciones.length) err(tag + ": debe tener " + reglas.opciones.length + " retos");
            if (!n.premio || !n.premio.titulo || !n.premio.nombre || n.premio.tipo !== reglas.premio) err(tag + ": premio incompleto");
            if (!esLinea(n.cierre)) err(tag + ": cierre incompleto");
            if (!n.cierreEscena || n.cierreEscena.tipo !== reglas.cierre || !n.cierreEscena.titulo) err(tag + ": cierre debe ser " + reglas.cierre);
            if (reglas.escenario === "laboratorio" && !n.microscopio) err(tag + ": falta el microscopio virtual");

            retos.forEach(function (r, i) {
                const rt = tag + " reto " + r.id;
                const opciones = r.opciones || [];
                if (!r.titulo) err(rt + ": sin título");
                if (!mats[r.modelo]) err(rt + ": modelo inexistente " + r.modelo);
                if (opciones.length !== reglas.opciones[i]) err(rt + ": debe mostrar " + reglas.opciones[i] + " opciones");
                if (opciones.some(function (o, k) { return opciones.indexOf(o) !== k; })) err(rt + ": opciones repetidas");
                opciones.forEach(function (m) { if (!mats[m]) err(rt + ": material inexistente " + m); });
                if (opciones.indexOf(r.correcto) === -1) err(rt + ": la pareja correcta no está en pantalla");
                if (opciones.indexOf(r.modelo) !== -1) err(rt + ": el modelo no puede ser opción de sí mismo");
                if (r.modelo === demo.modelo || r.correcto === demo.pareja) err(rt + ": la pareja de la demostración no puede ser un reto real");
                if (reglas.escenario === "laboratorio" && !r.categoria) err(rt + ": falta la categoría de la tabla periódica");
                if (!lineas(r.presentacion).length || !lineas(r.presentacion).every(esLinea)) err(rt + ": presentación incompleta");
                if (!esLinea(r.acierto)) err(rt + ": acierto incompleto");
                if (!r.unir || reglas.unir.indexOf(r.unir.efecto) === -1 || !r.unir.sonido) err(rt + ": respuesta al unir inválida");
                (r.errores || []).forEach(function (e) {
                    if (!esLinea(e)) err(rt + ": error incompleto");
                    if (e.efecto && reglas.rechazo.indexOf(e.efecto) === -1) err(rt + ": rechazo inválido " + e.efecto);
                    (e.objetos || []).forEach(function (m) {
                        if (opciones.indexOf(m) === -1) err(rt + ": error para " + m + " que no está en pantalla");
                        if (m === r.correcto) err(rt + ": error asignado a la pareja correcta");
                    });
                });
                if (r.errorOtro && !esLinea(r.errorOtro)) err(rt + ": errorOtro incompleto");
                opciones.forEach(function (m) {
                    if (m !== r.correcto && !errorPara(r, m)) err(rt + ": " + m + " no tiene respuesta de error");
                });
            });
        });
        return errores;
    }

    const api = {
        TACTOS: TACTOS,
        lineas: lineas,
        esLinea: esLinea,
        clasificarGesto: clasificarGesto,
        esCorrecto: esCorrecto,
        errorPara: errorPara,
        nombreEn: nombreEn,
        dentro: dentro,
        mezclar: mezclar,
        parejas: parejas,
        validarConfig: validarConfig
    };

    global.RelacionaIgualesLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
