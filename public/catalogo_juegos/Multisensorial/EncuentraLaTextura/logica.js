/**
 * Reglas puras de "Encuentra la textura" (sin DOM).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const MUESTRAS_POR_EDAD = { "3-4 años": 3, "5-6 años": 5 };
    const RESPUESTAS_34 = ["almohada", "pulir", "coco"];
    const USOS_56 = ["rellenar", "lijar", "estampar"];
    const OBJETOS_56 = ["sillon", "mesa", "libro"];
    const TACTOS = ["hundir", "firme", "raspar", "peinar", "deslizar", "comprimir", "ondular", "mecer"];
    const CIERRES = ["caja", "exposicion"];

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
        return Math.hypot(dx, dy) < (esNumero(umbral) ? umbral : 14) ? "toque" : "arrastre";
    }

    function esCorrecta(reto, id) {
        return !!reto && reto.correcta === id;
    }

    /** Mensaje de error: primero el del material elegido (3-4), si no el del reto (5-6). */
    function lineaError(reto, id) {
        if (!reto || esCorrecta(reto, id)) return null;
        const porMaterial = reto.errores && reto.errores[id];
        if (esLinea(porMaterial)) return porMaterial;
        return esLinea(reto.error) ? reto.error : null;
    }

    /** Gesto de Zoe o Zeus según la sensación del material tocado. */
    function gestoDe(cfg, id, voz) {
        const m = cfg && cfg.materiales && cfg.materiales[id];
        const g = m && cfg.gestos && cfg.gestos[m.sensacion];
        return (g && g[voz]) || null;
    }

    function mezclar(lista, rnd) {
        const r = typeof rnd === "function" ? rnd : Math.random;
        const out = lista.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(r() * (i + 1));
            const t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    function dentro(p, r) {
        return !!r && p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height;
    }

    /** Destino de una muestra soltada fuera de la cinta: "objeto", "bloque" o null. */
    function soltarEn(p, zonas) {
        if (!zonas) return null;
        if (dentro(p, zonas.bloque)) return "bloque";
        if (dentro(p, zonas.objeto)) return "objeto";
        return null;
    }

    /** Marca las celdas de una cuadrícula cols×rows (sobre w×h px) que toca un círculo. Devuelve las nuevas. */
    function marcarCirculo(celdas, x, y, radio, w, h, cols, rows) {
        let nuevas = 0;
        const cw = w / cols;
        const ch = h / rows;
        for (let fila = 0; fila < rows; fila++) {
            for (let col = 0; col < cols; col++) {
                const cx = (col + 0.5) * cw;
                const cy = (fila + 0.5) * ch;
                if (Math.hypot(cx - x, cy - y) > radio) continue;
                const k = fila * cols + col;
                if (!celdas[k]) {
                    celdas[k] = true;
                    nuevas += 1;
                }
            }
        }
        return nuevas;
    }

    /** Igual que marcarCirculo pero a lo largo de un trazo (para que un movimiento rápido no deje huecos). */
    function marcarTrazo(celdas, a, b, radio, w, h, cols, rows) {
        const pasos = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, radio / 2)));
        let nuevas = 0;
        for (let i = 0; i <= pasos; i++) {
            const t = i / pasos;
            nuevas += marcarCirculo(celdas, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radio, w, h, cols, rows);
        }
        return nuevas;
    }

    function cobertura(celdas, cols, rows) {
        let n = 0;
        Object.keys(celdas || {}).forEach(function (k) { if (celdas[k]) n += 1; });
        return n / (cols * rows);
    }

    /** Escala vertical del cojín: arranca desinflado y llega a 1 con la meta de rellenos. */
    function rellenoEscala(pasos, meta) {
        const m = esNumero(meta) && meta > 0 ? meta : 1;
        return 0.3 + 0.7 * Math.max(0, Math.min(1, pasos / m));
    }

    /** El niño ayuda a partir el coco desde la edad indicada; sin edad (vista previa) también ayuda. */
    function debeAyudar(edad, reto) {
        if (!reto || !esNumero(reto.ayudaDesdeEdad)) return false;
        if (edad == null || !esNumero(Number(edad))) return true;
        return Number(edad) >= reto.ayudaDesdeEdad;
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];
        const mats = cfg.materiales || {};

        Object.keys(mats).forEach(function (id) {
            const m = mats[id];
            if (!m.nombre || !m.img) err("material " + id + ": falta nombre o imagen");
            if (TACTOS.indexOf(m.tacto) === -1) err("material " + id + ": tacto desconocido " + m.tacto);
            if (!m.sonido) err("material " + id + ": sin sonido");
            const g = cfg.gestos && cfg.gestos[m.sensacion];
            if (!g || !g.zoe || !g.zeus) err("material " + id + ": sin gesto para la sensación " + m.sensacion);
        });

        const t = cfg.textos || {};
        ["demostracion", "demostracionAcierto", "demostracionFin"].forEach(function (k) {
            if (!t[k]) err("falta textos." + k);
        });
        const demo = cfg.demo && cfg.demo.muestra;
        if (!demo || !mats[demo]) err("la demostración necesita una muestra existente");

        const edades = cfg.niveles.map(function (n) { return n.edad; }).sort();
        if (edades.join("|") !== Object.keys(MUESTRAS_POR_EDAD).sort().join("|")) {
            err("los niveles deben ser exactamente 3-4 años y 5-6 años");
        }

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const es34 = n.edad === "3-4 años";
            const porReto = MUESTRAS_POR_EDAD[n.edad];
            if (n.muestrasPorReto !== porReto) err(tag + ": muestrasPorReto debe ser " + porReto);
            if (!Array.isArray(n.retos) || n.retos.length !== 3) err(tag + ": debe tener 3 retos");
            if (!n.premio || !n.premio.titulo || !n.premio.nombre) err(tag + ": premio incompleto");
            if (!esLinea(n.cierre)) err(tag + ": cierre incompleto");
            if (!n.cierreEscena || CIERRES.indexOf(n.cierreEscena.tipo) === -1 || !n.cierreEscena.titulo) err(tag + ": cierreEscena inválida");

            (n.retos || []).forEach(function (r) {
                const rt = tag + " reto " + r.id;
                const ms = r.muestras || [];
                if (ms.length !== porReto) err(rt + ": debe tener " + porReto + " muestras");
                if (ms.indexOf(r.correcta) === -1) err(rt + ": la correcta no está entre las muestras");
                if (ms.some(function (m, i) { return ms.indexOf(m) !== i; })) err(rt + ": muestras repetidas");
                ms.forEach(function (m) { if (!mats[m]) err(rt + ": material inexistente " + m); });
                if (ms.indexOf(demo) !== -1) err(rt + ": la muestra de la demostración no puede ser un reto real");
                if (!lineas(r.presentacion).length || !lineas(r.presentacion).every(esLinea)) err(rt + ": presentación incompleta");
                if (!esLinea(r.acierto)) err(rt + ": acierto incompleto");
                ms.forEach(function (m) {
                    if (m !== r.correcta && !lineaError(r, m)) err(rt + ": sin mensaje de error para " + m);
                });

                if (es34) {
                    if (RESPUESTAS_34.indexOf(r.respuesta) === -1) err(rt + ": respuesta desconocida " + r.respuesta);
                    const sCorrecta = mats[r.correcta] && mats[r.correcta].sensacion;
                    ms.forEach(function (m) {
                        if (m !== r.correcta && mats[m] && mats[m].sensacion === sCorrecta) err(rt + ": " + m + " se siente igual que la correcta");
                    });
                    if (r.respuesta === "coco" && !esNumero(r.ayudaDesdeEdad)) err(rt + ": falta ayudaDesdeEdad");
                } else {
                    if (USOS_56.indexOf(r.uso) === -1) err(rt + ": uso desconocido " + r.uso);
                    if (OBJETOS_56.indexOf(r.objeto) === -1) err(rt + ": objeto desconocido " + r.objeto);
                    if (!esNumero(r.usoMeta) || r.usoMeta <= 0) err(rt + ": usoMeta inválida");
                    if ((r.uso === "lijar" || r.uso === "estampar") && r.usoMeta > 1) err(rt + ": la meta de frotado es una fracción (0-1)");
                }
            });
        });
        return errores;
    }

    const api = {
        TACTOS: TACTOS,
        lineas: lineas,
        esLinea: esLinea,
        clasificarGesto: clasificarGesto,
        esCorrecta: esCorrecta,
        lineaError: lineaError,
        gestoDe: gestoDe,
        mezclar: mezclar,
        dentro: dentro,
        soltarEn: soltarEn,
        marcarCirculo: marcarCirculo,
        marcarTrazo: marcarTrazo,
        cobertura: cobertura,
        rellenoEscala: rellenoEscala,
        debeAyudar: debeAyudar,
        validarConfig: validarConfig,
    };

    global.EncuentraTexturaLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
