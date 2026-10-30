/**
 * Reglas puras de "Suave o áspero" (sin DOM).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TACTOS = ["peinar", "raspar", "hundir", "grietas", "mecer"];
    const RECHAZOS = ["rebote", "expulsar", "calibrar"];
    const CIERRES = ["tubo", "matriz"];
    const ESCENARIOS = {
        "3-4 años": { escenario: "clasificador", retos: 3, respuestas: ["camita", "pulir", "almohada"] },
        "5-6 años": { escenario: "laboratorio", retos: 4, respuestas: ["abrazaNube", "pulirBloque", "iluminar", "encajar"] }
    };

    /**
     * Grietas de la corteza (img/corteza.svg, caja 160×160) normalizadas a 0-1:
     * siguen los canales entre las placas para que el dedo "recorra bordes y grietas".
     */
    const GRIETAS = [
        [[66, 24], [66, 54], [60, 58], [60, 88], [68, 90], [68, 118], [64, 136]],
        [[92, 28], [93, 56], [94, 86], [92, 116], [97, 136]]
    ].map(function (linea) {
        return linea.map(function (p) { return { x: p[0] / 160, y: p[1] / 160 }; });
    });

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

    function esCorrecta(reto, opcion) {
        return !!reto && reto.correcta === opcion;
    }

    /** Mensaje de error del reto (el documento no trae uno para todos: entonces null). */
    function lineaError(reto, opcion) {
        if (!reto || esCorrecta(reto, opcion)) return null;
        return esLinea(reto.error) ? reto.error : null;
    }

    function dentro(p, r) {
        return !!r && p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height;
    }

    /** Destino (contenedor o módulo) bajo el punto donde se suelta el objeto. */
    function soltarEn(p, zonas) {
        if (!zonas) return null;
        const ids = Object.keys(zonas);
        for (let i = 0; i < ids.length; i++) {
            if (dentro(p, zonas[ids[i]])) return ids[i];
        }
        return null;
    }

    /**
     * Avance de la exploración (0-1). Hasta llegar a 1 el objeto no se puede clasificar:
     * el documento pide probar la textura antes de clasificar.
     *  - hundir: cuenta presiones; grietas: fracción de grieta recorrida;
     *  - resto (frotar): recorrido del dedo medido en anchos del objeto.
     */
    function progresoExploracion(exploracion, medida) {
        const ex = exploracion || {};
        const m = medida || {};
        const meta = esNumero(ex.meta) && ex.meta > 0 ? ex.meta : 1;
        let valor = 0;
        if (ex.tacto === "hundir") valor = m.toques || 0;
        else if (ex.tacto === "grietas") valor = m.grietas || 0;
        else valor = (m.recorrido || 0) / Math.max(1, m.ancho || 1) + (m.toques || 0) * 0.25;
        return Math.max(0, Math.min(1, valor / meta));
    }

    /** Puntos cada `paso` (0-1) a lo largo de las grietas. */
    function muestrearGrietas(paso) {
        const p = esNumero(paso) && paso > 0 ? paso : 0.03;
        const out = [];
        GRIETAS.forEach(function (linea) {
            for (let i = 0; i < linea.length - 1; i++) {
                const a = linea[i];
                const b = linea[i + 1];
                const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / p));
                for (let k = 0; k < n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
            }
            out.push(linea[linea.length - 1]);
        });
        return out;
    }

    /** Marca los puntos de grieta cercanos al dedo (coordenadas 0-1). Devuelve cuántos son nuevos. */
    function marcarGrietas(visitados, puntos, p, radio) {
        const r = esNumero(radio) ? radio : 0.07;
        let nuevos = 0;
        puntos.forEach(function (q, i) {
            if (visitados[i]) return;
            if (Math.hypot(q.x - p.x, q.y - p.y) <= r) {
                visitados[i] = true;
                nuevos += 1;
            }
        });
        return nuevos;
    }

    function fraccion(visitados, total) {
        let n = 0;
        Object.keys(visitados || {}).forEach(function (k) { if (visitados[k]) n += 1; });
        return total > 0 ? n / total : 0;
    }

    function ruidoFijo(i) {
        const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
        return (s - Math.floor(s)) * 2 - 1;
    }

    /**
     * Curva del escáner de fricción (valores -1..1): suave = onda lenta y baja;
     * áspero = picos irregulares; calibración = onda amarilla amplia para reintentar.
     */
    function curvaFriccion(clase, n, t) {
        const total = Math.max(2, Math.floor(n || 60));
        const fase = esNumero(t) ? t : 0;
        const out = [];
        for (let i = 0; i < total; i++) {
            const x = i / (total - 1);
            let y;
            if (clase === "aspero") {
                y = 0.45 * Math.sin((x * 9 + fase) * Math.PI * 2) + 0.5 * ruidoFijo(i + Math.floor(fase * 40));
            } else if (clase === "calibracion") {
                y = 0.7 * Math.sin((x * 1.5 + fase) * Math.PI * 2);
            } else {
                y = 0.3 * Math.sin((x * 2 + fase) * Math.PI * 2);
            }
            out.push(Math.max(-1, Math.min(1, y)));
        }
        return out;
    }

    /** Promedio del salto entre puntos consecutivos: mide qué tan "rasposa" es una curva. */
    function rugosidad(valores) {
        if (!valores || valores.length < 2) return 0;
        let s = 0;
        for (let i = 1; i < valores.length; i++) s += Math.abs(valores[i] - valores[i - 1]);
        return s / (valores.length - 1);
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];
        const mats = cfg.materiales || {};

        Object.keys(mats).forEach(function (id) {
            const m = mats[id];
            if (!m.img) err("material " + id + ": falta imagen");
            if (m.clase !== "suave" && m.clase !== "aspero") err("material " + id + ": clase debe ser suave o aspero");
        });

        const t = cfg.textos || {};
        ["demostracion", "demostracionAcierto", "demostracionFin"].forEach(function (k) {
            if (!t[k]) err("falta textos." + k);
        });
        const demo = cfg.demo || {};
        if (!demo.material || !mats[demo.material]) err("la demostración necesita un material existente");
        if (!demo.exploracion || TACTOS.indexOf(demo.exploracion.tacto) === -1) err("la demostración necesita exploración");

        const edades = cfg.niveles.map(function (n) { return n.edad; }).sort();
        if (!edades.length || edades.some(function (e) { return Object.keys(ESCENARIOS).indexOf(e) === -1; })) {
            err("edad de nivel desconocida");
        }

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const reglas = ESCENARIOS[n.edad];
            if (!reglas) return;
            if (n.escenario !== reglas.escenario) err(tag + ": escenario debe ser " + reglas.escenario);
            if (!Array.isArray(n.retos) || !n.retos.length || n.retos.length > reglas.retos) err(tag + ": debe tener entre 1 y " + reglas.retos + " retos");
            const opciones = (n.destinos || []).map(function (d) { return d.id; });
            if (opciones.indexOf("suave") === -1 || opciones.indexOf("aspero") === -1) err(tag + ": faltan los destinos suave y aspero");
            if (opciones.some(function (o, i) { return opciones.indexOf(o) !== i; })) err(tag + ": destinos repetidos");
            (n.destinos || []).forEach(function (d) { if (!d.nombre) err(tag + ": destino " + d.id + " sin nombre"); });
            if (n.edad === "3-4 años" && opciones.length !== 2) err(tag + ": el clasificador tiene solo 2 contenedores");
            if (mats[demo.material] && opciones.indexOf(mats[demo.material].clase) === -1) err(tag + ": la demostración no tiene destino");
            if (!n.premio || !n.premio.titulo || !n.premio.nombre) err(tag + ": premio incompleto");
            if (!esLinea(n.cierre)) err(tag + ": cierre incompleto");
            if (!n.cierreEscena || CIERRES.indexOf(n.cierreEscena.tipo) === -1 || !n.cierreEscena.titulo) err(tag + ": cierreEscena inválida");

            (n.retos || []).forEach(function (r) {
                const rt = tag + " reto " + r.id;
                const m = mats[r.material];
                if (!m) err(rt + ": material inexistente " + r.material);
                if (r.material === demo.material) err(rt + ": el material de la demostración no puede ser un reto real");
                if (opciones.indexOf(r.correcta) === -1) err(rt + ": la correcta no es un destino");
                if (m && m.clase !== r.correcta) err(rt + ": la correcta no coincide con la clase del material");
                if (!r.nombre) err(rt + ": sin nombre visible");
                if (!lineas(r.presentacion).length || !lineas(r.presentacion).every(esLinea)) err(rt + ": presentación incompleta");
                if (!esLinea(r.acierto)) err(rt + ": acierto incompleto");
                if (r.error !== null && !esLinea(r.error)) err(rt + ": error incompleto (usar null si el documento no lo trae)");
                if (RECHAZOS.indexOf(r.rechazo) === -1) err(rt + ": rechazo desconocido " + r.rechazo);
                if (reglas.respuestas.indexOf(r.respuesta) === -1) err(rt + ": respuesta desconocida " + r.respuesta);
                const ex = r.exploracion || {};
                if (TACTOS.indexOf(ex.tacto) === -1) err(rt + ": tacto desconocido " + ex.tacto);
                if (!ex.sonido) err(rt + ": exploración sin sonido");
                if (!esNumero(ex.meta) || ex.meta <= 0) err(rt + ": meta de exploración inválida");
                if (ex.tacto === "grietas" && ex.meta > 1) err(rt + ": la meta de grietas es una fracción (0-1)");
            });
        });
        return errores;
    }

    const api = {
        TACTOS: TACTOS,
        GRIETAS: GRIETAS,
        lineas: lineas,
        esLinea: esLinea,
        clasificarGesto: clasificarGesto,
        esCorrecta: esCorrecta,
        lineaError: lineaError,
        dentro: dentro,
        soltarEn: soltarEn,
        progresoExploracion: progresoExploracion,
        muestrearGrietas: muestrearGrietas,
        marcarGrietas: marcarGrietas,
        fraccion: fraccion,
        curvaFriccion: curvaFriccion,
        rugosidad: rugosidad,
        validarConfig: validarConfig
    };

    global.SuaveAsperoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
