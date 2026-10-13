/**
 * Reglas puras de "Busca las diferencias" (sin DOM).
 * Coordenadas en unidades de escena (400 × 300), iguales en la imagen A y la B.
 */
(function (global) {
    "use strict";

    const ESCENA = { w: 400, h: 300 };
    const VOCES = ["zoe", "zeus"];
    const PREVIOS = ["circuloVerificacion", "target", "analisis"];
    const REACCIONES = ["pegatina", "brota", "trompo", "rayo", "giroChispas", "chispasMover", "hojaViento", "frutaCambia"];
    const ANIMACIONES_A = ["brilla", "mece"];
    const RETOS_POR_EDAD = { "3-4 años": 3, "5-6 años": 4 };

    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }

    function esRect(r) {
        return !!r && esNumero(r.x) && esNumero(r.y) && esNumero(r.w) && esNumero(r.h) && r.w > 0 && r.h > 0;
    }

    function dentro(p, r) {
        return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }

    function centro(r) {
        return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    }

    /** Agranda el rectángulo hasta el mínimo táctil, manteniendo el centro. */
    function zonaTactil(r, minimo) {
        const m = esNumero(minimo) ? minimo : 0;
        const w = Math.max(r.w, m);
        const h = Math.max(r.h, m);
        const c = centro(r);
        return { x: c.x - w / 2, y: c.y - h / 2, w: w, h: h };
    }

    function rectObjetivo(escena, objetivo) {
        if (esRect(objetivo)) return { x: objetivo.x, y: objetivo.y, w: objetivo.w, h: objetivo.h };
        const el = escena && escena.elementos && escena.elementos[objetivo.elemento];
        return el ? { x: el.x, y: el.y, w: el.w, h: el.h } : null;
    }

    /**
     * Objetivo pendiente que contiene el punto (el de centro más cercano si hay varios).
     * Vale igual tocar en A o en B porque ambas comparten coordenadas.
     */
    function objetivoEn(p, escena, reto, encontrados, minimo) {
        let mejor = null;
        let mejorDist = Infinity;
        (reto.objetivos || []).forEach(function (o) {
            if (encontrados && encontrados[o.id]) return;
            const r = rectObjetivo(escena, o);
            if (!r) return;
            const zona = zonaTactil(r, esNumero(o.minimo) ? o.minimo : minimo);
            if (!dentro(p, zona)) return;
            const c = centro(r);
            const d = (p.x - c.x) * (p.x - c.x) + (p.y - c.y) * (p.y - c.y);
            if (d < mejorDist) {
                mejorDist = d;
                mejor = o.id;
            }
        });
        return mejor;
    }

    function puntoEscena(clientX, clientY, rect) {
        const x = ((clientX - rect.left) / rect.width) * ESCENA.w;
        const y = ((clientY - rect.top) / rect.height) * ESCENA.h;
        return {
            x: Math.max(0, Math.min(ESCENA.w, x)),
            y: Math.max(0, Math.min(ESCENA.h, y)),
        };
    }

    function clasificarGesto(dx, dy, umbral) {
        return Math.hypot(dx, dy) < (esNumero(umbral) ? umbral : 14) ? "toque" : "arrastre";
    }

    function retoCompleto(reto, encontrados) {
        return (reto.objetivos || []).every(function (o) {
            return !!(encontrados && encontrados[o.id]);
        });
    }

    /** Imagen de cada elemento en un lado: A es el modelo; B aplica cambios no resueltos. */
    function elementosLado(escena, reto, lado, encontrados) {
        const out = {};
        Object.keys(escena.elementos || {}).forEach(function (id) {
            out[id] = escena.elementos[id].img;
        });
        if (lado !== "B" || !reto) return out;
        const restaurados = {};
        (reto.objetivos || []).forEach(function (o) {
            if (encontrados && encontrados[o.id]) restaurados[o.elemento] = true;
        });
        Object.keys(reto.cambiosB || {}).forEach(function (id) {
            if (!restaurados[id]) out[id] = reto.cambiosB[id];
        });
        return out;
    }

    function zoomLupa(p, nivel, reto) {
        const base = (nivel.lupa && nivel.lupa.zoom) || 1.6;
        const extra = reto && reto.lupaZona;
        if (extra && esRect(extra.zona) && dentro(p, extra.zona)) return extra.zoom;
        return base;
    }

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];

        const edades = cfg.niveles.map(function (n) { return n.edad; }).sort();
        if (edades.join("|") !== Object.keys(RETOS_POR_EDAD).sort().join("|")) {
            err("los niveles deben ser exactamente 3-4 años y 5-6 años");
        }

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const escena = cfg.escenas && cfg.escenas[n.escena];
            if (!escena) { err(tag + ": escena inexistente " + n.escena); return; }
            if (!escena.fondo) err(tag + ": escena sin fondo");
            Object.keys(escena.elementos || {}).forEach(function (id) {
                const el = escena.elementos[id];
                if (!esRect(el) || !el.img) err(tag + ": elemento inválido " + id);
                if (el.animacionA && ANIMACIONES_A.indexOf(el.animacionA) === -1) err(tag + ": animación A desconocida " + id);
            });

            const esperados = RETOS_POR_EDAD[n.edad];
            if (!Array.isArray(n.retos) || n.retos.length !== esperados) {
                err(tag + ": debe tener " + esperados + " retos");
            }
            if (n.contador && n.contador !== (n.retos || []).length) err(tag + ": el contador debe tener una ranura por reto");
            if (!n.lupa || !esNumero(n.lupa.diametro) || !esNumero(n.lupa.zoom)) err(tag + ": lupa incompleta");
            if (!esNumero(n.minimo)) err(tag + ": falta tamaño táctil mínimo");
            if (!n.etiquetas || !n.etiquetas.A || !n.etiquetas.B) err(tag + ": faltan etiquetas A/B");
            if (!n.premio || !n.premio.titulo || !n.premio.nombre) err(tag + ": premio incompleto");
            if (!esLinea(n.cierre)) err(tag + ": cierre incompleto");

            (n.retos || []).forEach(function (r) {
                const rt = tag + " reto " + r.id;
                if (!esLinea(r.presentacion)) err(rt + ": presentación incompleta");
                if (!esLinea(r.acierto)) err(rt + ": acierto incompleto");
                if (!esLinea(r.error || n.error)) err(rt + ": sin mensaje de error");
                if (!Array.isArray(r.objetivos) || !r.objetivos.length) { err(rt + ": sin objetivos"); return; }

                const cambios = r.cambiosB || {};
                const cubiertos = {};
                r.objetivos.forEach(function (o) {
                    const el = escena.elementos[o.elemento];
                    if (!el) { err(rt + ": objetivo " + o.id + " sin elemento"); return; }
                    cubiertos[o.elemento] = true;
                    if (!Object.prototype.hasOwnProperty.call(cambios, o.elemento)) err(rt + ": " + o.id + " no cambia en B");
                    else if (cambios[o.elemento] === el.img) err(rt + ": " + o.id + " es igual en A y B");
                    if (REACCIONES.indexOf(o.reaccion) === -1) err(rt + ": reacción desconocida " + o.reaccion);
                    if (o.previo && PREVIOS.indexOf(o.previo) === -1) err(rt + ": previo desconocido " + o.previo);
                });
                Object.keys(cambios).forEach(function (id) {
                    if (!cubiertos[id]) err(rt + ": la diferencia " + id + " no se puede tocar");
                });
                if (r.lupaZona && (!esRect(r.lupaZona.zona) || !esNumero(r.lupaZona.zoom))) err(rt + ": lupaZona inválida");
                if (r.reticula && (!esRect(r.reticula.zona) || !r.reticula.etiqueta)) err(rt + ": retícula inválida");
                if (r.autoLupa && (!r.autoLupa.desde || !r.autoLupa.hasta || !esNumero(r.autoLupa.ms))) err(rt + ": autoLupa inválida");
            });
        });

        validarDemo(cfg, err);
        return errores;
    }

    /** La demostración usa su propia escena y un objeto que no es respuesta de ningún reto. */
    function validarDemo(cfg, err) {
        const t = cfg.textos || {};
        ["demostracion", "demostracionAcierto", "demostracionFin"].forEach(function (k) {
            if (!t[k]) err("demo: falta textos." + k);
        });
        const demo = cfg.demo;
        if (!demo || !demo.reto) { err("demo: falta configuración"); return; }
        const escena = cfg.escenas && cfg.escenas[demo.escena];
        if (!escena) { err("demo: escena inexistente " + demo.escena); return; }
        if (cfg.niveles.some(function (n) { return n.escena === demo.escena; })) err("demo: la escena no puede ser la de un nivel");
        const usados = {};
        cfg.niveles.forEach(function (n) {
            const e = cfg.escenas && cfg.escenas[n.escena];
            if (!e) return;
            Object.keys(e.elementos || {}).forEach(function (id) { usados[e.elementos[id].img] = true; });
            (n.retos || []).forEach(function (r) {
                Object.keys(r.cambiosB || {}).forEach(function (id) { if (r.cambiosB[id]) usados[r.cambiosB[id]] = true; });
            });
        });
        const objetivos = demo.reto.objetivos || [];
        if (objetivos.length !== 1) err("demo: debe tener un solo objetivo");
        objetivos.forEach(function (o) {
            const el = escena.elementos && escena.elementos[o.elemento];
            if (!el || !esRect(el) || !el.img) { err("demo: objetivo " + o.id + " sin elemento"); return; }
            if (usados[el.img]) err("demo: " + o.elemento + " aparece en un reto");
            if (!Object.prototype.hasOwnProperty.call(demo.reto.cambiosB || {}, o.elemento)) err("demo: " + o.id + " no cambia en B");
            if (REACCIONES.indexOf(o.reaccion) === -1) err("demo: reacción desconocida " + o.reaccion);
        });
    }

    const api = {
        ESCENA: ESCENA,
        REACCIONES: REACCIONES,
        PREVIOS: PREVIOS,
        dentro: dentro,
        centro: centro,
        zonaTactil: zonaTactil,
        rectObjetivo: rectObjetivo,
        objetivoEn: objetivoEn,
        puntoEscena: puntoEscena,
        clasificarGesto: clasificarGesto,
        retoCompleto: retoCompleto,
        elementosLado: elementosLado,
        zoomLupa: zoomLupa,
        validarConfig: validarConfig,
    };

    global.BuscaDiferenciasLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
