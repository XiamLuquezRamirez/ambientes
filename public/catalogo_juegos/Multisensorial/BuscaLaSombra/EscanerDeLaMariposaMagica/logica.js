/* Busca la sombra — lógica pura (sin DOM), probada con scripts/probar-busca-sombra.js */
(function (global) {
    "use strict";

    const UMBRAL_LUPA_MS = 500;
    const REACCIONES = ["sacudir", "burbujas", "hojas", "orejas", "temblar", "alerta", "zoom", "holograma"];
    const RECOMPENSAS = ["vuelta", "vuelo", "riel", "libre"];

    function plantilla(tpl, vars) {
        return String(tpl || "").replace(/\{(\w+)\}/g, function (_, k) {
            return vars && vars[k] != null ? String(vars[k]) : "";
        });
    }

    function validarZona(z, donde, errores) {
        if (!z) return;
        ["x", "y", "w", "h"].forEach(function (k) {
            const n = Number(z[k]);
            if (!isFinite(n) || n < 0 || n > 100) errores.push(donde + ": zona." + k + " debe estar entre 0 y 100");
        });
    }

    function validarRecompensa(r, donde, errores) {
        if (!r) return;
        if (RECOMPENSAS.indexOf(r.tipo) < 0) {
            errores.push(donde + ": recompensa.tipo desconocido (" + r.tipo + ")");
            return;
        }
        if (r.tipo === "riel") {
            if (!Array.isArray(r.ruta) || r.ruta.length < 2) errores.push(donde + ": el riel necesita al menos 2 puntos");
            (r.obstaculos || []).forEach(function (o, i) {
                if (!(o.en > 0 && o.en < 1)) errores.push(donde + ": obstáculo " + i + " debe estar entre 0 y 1 del riel");
            });
        }
        if (r.tipo === "libre") {
            if (!Array.isArray(r.inicio) || r.inicio.length !== 2) errores.push(donde + ": falta inicio [x, y]");
            if (!r.meta || !isFinite(r.meta.x) || !isFinite(r.meta.y)) errores.push(donde + ": falta meta {x, y}");
        }
    }

    function validarConfig(config) {
        const errores = [];
        const objetos = (config && config.objetos) || {};
        const niveles = (config && config.niveles) || [];
        if (!niveles.length) errores.push("No hay niveles");
        niveles.forEach(function (nivel) {
            const n = "nivel " + nivel.id;
            if (["teatro", "laboratorio"].indexOf(nivel.tema) < 0) errores.push(n + ": tema debe ser teatro o laboratorio");
            if (["focos", "energia"].indexOf(nivel.progreso) < 0) errores.push(n + ": progreso debe ser focos o energia");
            if (!nivel.pista || !(nivel.pista.errores > 0)) errores.push(n + ": falta pista.errores");
            if (nivel.demo) {
                if (!objetos[nivel.demo.objeto]) errores.push(n + ": demo usa objeto inexistente");
                if ((nivel.demo.sombras || []).indexOf(nivel.demo.objeto) < 0) errores.push(n + ": demo sin su sombra correcta");
                const usados = {};
                (nivel.retos || []).forEach(function (r) {
                    usados[r.objeto] = true;
                    (r.sombras || []).forEach(function (s) { usados[s] = true; });
                });
                if (usados[nivel.demo.objeto]) errores.push(n + ": la demo usa un objeto que aparece en los retos");
            }
            (nivel.retos || []).forEach(function (reto, i) {
                const d = n + " reto " + (i + 1);
                const sombras = reto.sombras || [];
                if (!objetos[reto.objeto]) errores.push(d + ": objeto inexistente " + reto.objeto);
                if (sombras.indexOf(reto.objeto) < 0) errores.push(d + ": falta la sombra correcta");
                if (new Set(sombras).size !== sombras.length) errores.push(d + ": sombras repetidas");
                sombras.forEach(function (s) {
                    if (!objetos[s]) errores.push(d + ": sombra inexistente " + s);
                    if (s === reto.objeto) return;
                    const e = reto.errores && reto.errores[s];
                    if (!e || !e.texto) errores.push(d + ": falta texto de error para " + s);
                    else if (REACCIONES.indexOf(e.reaccion) < 0) errores.push(d + ": reacción desconocida para " + s);
                    if (e && e.reaccion === "holograma") validarZona(e.zona, d + " " + s, errores);
                });
                if (!reto.presentacion || !reto.presentacion.texto) errores.push(d + ": falta presentación");
                if (!reto.acierto || !reto.acierto.texto) errores.push(d + ": falta texto de acierto");
                if (!reto.pista || !reto.pista.texto) errores.push(d + ": falta pista");
                if (nivel.pista && nivel.pista.modo === "detalle" && !(reto.pista && reto.pista.zona)) {
                    errores.push(d + ": la pista de detalle necesita zona");
                }
                if (reto.pista) validarZona(reto.pista.zona, d + " pista", errores);
                validarRecompensa(reto.acierto && reto.acierto.recompensa, d, errores);
            });
        });
        return errores;
    }

    /**
     * Decide si un gesto de puntero es una respuesta.
     * Solo cuenta si el dedo se apoya y se levanta sobre la misma sombra,
     * y (con lupa) si fue un toque corto que no abrió la lupa.
     */
    function clasificarGesto(g) {
        if (!g || g.inicio == null || g.inicio !== g.fin) return "nada";
        if (g.conLupa && (g.lupaMostrada || g.duracionMs >= UMBRAL_LUPA_MS)) return "nada";
        return "responder";
    }

    function debeMostrarPista(estado, reglas) {
        if (!estado || !reglas || estado.pistaActiva) return false;
        if (reglas.errores > 0 && estado.errores >= reglas.errores) return true;
        if (reglas.inactividadMs > 0 && estado.inactivoMs >= reglas.inactividadMs) return true;
        return false;
    }

    function textoError(reto, sombraId, textos) {
        const e = reto && reto.errores && reto.errores[sombraId];
        if (e && e.texto) return { voz: e.voz || "zoe", texto: e.texto, reaccion: e.reaccion || "sacudir", zona: e.zona || null };
        return { voz: "zoe", texto: (textos && textos.errorGenerico) || "¡Inténtalo otra vez!", reaccion: "sacudir", zona: null };
    }

    /* ── Geometría de recorridos (coordenadas en píxeles) ──────── */

    function longitudes(puntos) {
        const tramos = [];
        let total = 0;
        for (let i = 0; i < puntos.length - 1; i++) {
            const dx = puntos[i + 1][0] - puntos[i][0];
            const dy = puntos[i + 1][1] - puntos[i][1];
            const l = Math.sqrt(dx * dx + dy * dy);
            tramos.push(l);
            total += l;
        }
        return { tramos: tramos, total: total };
    }

    function puntoEnRuta(puntos, t) {
        const L = longitudes(puntos);
        if (!L.total) return { x: puntos[0][0], y: puntos[0][1], angulo: 0 };
        let d = Math.max(0, Math.min(1, t)) * L.total;
        for (let i = 0; i < L.tramos.length; i++) {
            const l = L.tramos[i];
            if (d <= l || i === L.tramos.length - 1) {
                const f = l ? Math.min(1, d / l) : 0;
                const a = puntos[i];
                const b = puntos[i + 1];
                return {
                    x: a[0] + (b[0] - a[0]) * f,
                    y: a[1] + (b[1] - a[1]) * f,
                    angulo: Math.atan2(b[1] - a[1], b[0] - a[0])
                };
            }
            d -= l;
        }
        const u = puntos[puntos.length - 1];
        return { x: u[0], y: u[1], angulo: 0 };
    }

    /** Proyecta un punto libre sobre el riel; devuelve t (0..1) del punto más cercano. */
    function proyectarEnRuta(puntos, p) {
        const L = longitudes(puntos);
        if (!L.total) return 0;
        let mejor = { dist: Infinity, t: 0 };
        let acumulado = 0;
        for (let i = 0; i < L.tramos.length; i++) {
            const a = puntos[i];
            const b = puntos[i + 1];
            const l = L.tramos[i];
            let f = 0;
            if (l) {
                f = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (l * l);
                f = Math.max(0, Math.min(1, f));
            }
            const x = a[0] + (b[0] - a[0]) * f;
            const y = a[1] + (b[1] - a[1]) * f;
            const dist = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
            if (dist < mejor.dist) mejor = { dist: dist, t: (acumulado + f * l) / L.total };
            acumulado += l;
        }
        return mejor.t;
    }

    function dentroDeCirculo(p, c, r) {
        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        return dx * dx + dy * dy <= r * r;
    }

    global.BuscaSombraLogica = {
        UMBRAL_LUPA_MS: UMBRAL_LUPA_MS,
        plantilla: plantilla,
        validarConfig: validarConfig,
        clasificarGesto: clasificarGesto,
        debeMostrarPista: debeMostrarPista,
        textoError: textoError,
        puntoEnRuta: puntoEnRuta,
        proyectarEnRuta: proyectarEnRuta,
        dentroDeCirculo: dentroDeCirculo
    };
})(typeof window !== "undefined" ? window : globalThis);
