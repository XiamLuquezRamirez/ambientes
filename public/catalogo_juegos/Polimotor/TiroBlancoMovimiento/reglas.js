/**
 * ReglasTiro — reglas puras de "El Tiro al Blanco en Movimiento" (window.ReglasTiro y module.exports).
 * Decide: rondas, patrones de movimiento de la diana (siempre dentro de una caja segura y con giros suaves),
 * velocidad del disco según el arrastre, física del tiro, zona de impacto y puntos. No dibuja ni suena.
 */
(function (global) {
    "use strict";

    var PATRONES = ["horizontal-der", "horizontal-izq", "diagonal-sube", "diagonal-baja", "vertical", "ondulatorio", "combinado"];

    function num(v, porDefecto) {
        var n = Number(v);
        return isFinite(n) ? n : porDefecto;
    }

    function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? String(datos[k]) : m;
        });
    }

    // ------------------------------------------------------------------ rondas

    function rondas(cfg) { return (cfg && Array.isArray(cfg.rondas)) ? cfg.rondas : []; }
    function totalRondas(cfg) { return rondas(cfg).length; }
    function lanzamientosPorRonda(cfg) { return Math.max(1, Math.round(num(cfg && cfg.juego && cfg.juego.lanzamientosPorRonda, 4))); }
    function totalLanzamientos(cfg) { return totalRondas(cfg) * lanzamientosPorRonda(cfg); }

    function ronda(cfg, i) {
        var r = rondas(cfg)[i] || {};
        var s = r.sombra || {};
        return {
            indice: i,
            id: r.id != null ? r.id : i + 1,
            nombre: r.nombre || "",
            radio: num(r.radio, 110),
            velocidad: num(r.velocidad, 150),
            patrones: (Array.isArray(r.patrones) && r.patrones.length ? r.patrones : ["horizontal-der"]).slice(),
            sombra: {
                lanzamientos: Math.max(0, Math.round(num(s.lanzamientos, 0))),
                ms: num(s.ms, 1500),
                alApuntar: !!s.alApuntar
            }
        };
    }

    function zona(cfg) {
        var z = (cfg && cfg.juego && cfg.juego.zona) || {};
        return { x0: num(z.x0, 360), x1: num(z.x1, 1240), y0: num(z.y0, 215), y1: num(z.y1, 445) };
    }

    // ------------------------------------------------------------------ movimiento de la diana

    /**
     * Posición del centro de la diana para la fase u (radianes). Todas las curvas son senos y cosenos:
     * frenan suave en los extremos (sin giros bruscos) y nunca salen de la caja segura.
     * extra.desX corre el patrón vertical a un lado (elegido al azar y acotado).
     */
    function posicion(patron, u, z, extra) {
        var cx = (z.x0 + z.x1) / 2, cy = (z.y0 + z.y1) / 2;
        var A = (z.x1 - z.x0) / 2, B = (z.y1 - z.y0) / 2;
        var c = Math.cos(u), s = Math.sin(u);
        switch (patron) {
            case "horizontal-izq": return { x: cx + A * c, y: cy + B * 0.15 };
            case "diagonal-sube": return { x: cx - A * c, y: cy + B * c };
            case "diagonal-baja": return { x: cx - A * c, y: cy - B * c };
            case "vertical": {
                var dx = limitar(num(extra && extra.desX, 0), -A * 0.55, A * 0.55);
                return { x: cx + dx, y: cy - B * c };
            }
            case "ondulatorio": return { x: cx - A * c, y: cy + B * 0.75 * Math.sin(2 * u) };
            case "combinado": return { x: cx + A * 0.9 * s, y: cy + B * 0.8 * Math.sin(2 * u) };
            case "horizontal-der":
            default: return { x: cx - A * c, y: cy + B * 0.15 };
        }
    }

    /** Velocidad angular (rad/s) para que la diana vaya, como máximo, a `velocidad` px/s en su eje principal. */
    function omega(patron, velocidad, z) {
        var A = (z.x1 - z.x0) / 2, B = (z.y1 - z.y0) / 2;
        var v = Math.max(20, num(velocidad, 150));
        if (patron === "vertical") return (v * 0.55) / B;
        if (patron === "combinado") return v / (A * 0.9 * 1.25);
        if (patron === "ondulatorio") return v / (A * 1.15);
        return v / A;
    }

    /** Elige un patrón de la lista sin repetir el anterior (si hay más de uno). rnd: función 0..1. */
    function elegirPatron(lista, anterior, rnd) {
        var l = (lista || []).filter(function (p) { return PATRONES.indexOf(p) >= 0; });
        if (!l.length) return "horizontal-der";
        if (l.length === 1) return l[0];
        var r = typeof rnd === "function" ? rnd : Math.random;
        var opciones = l.filter(function (p) { return p !== anterior; });
        return opciones[Math.floor(r() * opciones.length) % opciones.length];
    }

    // ------------------------------------------------------------------ lanzamiento

    function fisica(cfg) {
        var j = (cfg && cfg.juego) || {};
        return {
            g: num(j.gravedad, 300),
            vel: num(j.velDisco, 1300),
            arrastreMin: num(j.arrastreMin, 30),
            anguloMin: num(j.anguloMin, 12),
            anguloMax: num(j.anguloMax, 168),
            radioDisco: num(j.radioDisco, 12),
            radioMira: num(j.radioMira, 140),
            alcanceMin: num(j.alcanceMin, 150),
            margen: num(j.margenMira, 24)
        };
    }

    var MUNDO = { x0: 0, y0: 0, x1: 1600, y1: 900 };

    /** Distancia desde el origen, en la dirección (ux, uy), hasta el borde visible (arriba o a los lados). */
    function hastaBorde(origen, ux, uy, rect, margen) {
        var r = rect || MUNDO, m = margen || 0, l = Infinity;
        if (uy < -1e-6) l = Math.min(l, (r.y0 + m - origen.y) / uy);
        if (ux < -1e-6) l = Math.min(l, (r.x0 + m - origen.x) / ux);
        if (ux > 1e-6) l = Math.min(l, (r.x1 - m - origen.x) / ux);
        return isFinite(l) ? Math.max(0, l) : 0;
    }

    function direccion(f, dx, dy) {
        var ang = Math.atan2(-dy, dx) * 180 / Math.PI;     // 90 = recto hacia arriba
        if (ang < -90) ang += 360;                          // abajo a la izquierda cuenta como izquierda
        ang = limitar(ang, f.anguloMin, f.anguloMax);
        var rad = ang * Math.PI / 180;
        return { angulo: ang, ux: Math.cos(rad), uy: -Math.sin(rad) };
    }

    /**
     * Punto de mira según dónde está el dedo dentro de la esfera de energía (dx, dy desde el disco).
     * La dirección del dedo da hacia dónde; lo lejos del centro da hasta dónde: en el borde de la esfera
     * la mira llega al tope (borde superior o lateral de lo que se ve, `rect`). Devuelve { valido, x, y, k }.
     */
    function puntoMira(cfg, origen, dx, dy, rect) {
        var f = fisica(cfg);
        var d = Math.sqrt(dx * dx + dy * dy);
        var u = direccion(f, dx, dy);
        var k = limitar((d - f.arrastreMin) / Math.max(1, f.radioMira - f.arrastreMin), 0, 1);
        var lmax = hastaBorde(origen, u.ux, u.uy, rect, f.margen);
        var lmin = Math.min(f.alcanceMin, lmax);
        var l = lmin + (lmax - lmin) * k;
        return { valido: d >= f.arrastreMin, x: origen.x + u.ux * l, y: origen.y + u.uy * l, k: k, angulo: u.angulo };
    }

    /** Dedo (dx, dy dentro de la esfera) que pone la mira en el punto P: lo inverso de puntoMira. */
    function dedoPara(cfg, origen, P, rect) {
        var f = fisica(cfg);
        var dx = P.x - origen.x, dy = P.y - origen.y;
        var u = direccion(f, dx, dy);
        var l = Math.sqrt(dx * dx + dy * dy);
        var lmax = hastaBorde(origen, u.ux, u.uy, rect, f.margen);
        var lmin = Math.min(f.alcanceMin, lmax);
        var k = lmax > lmin ? limitar((l - lmin) / (lmax - lmin), 0, 1) : 1;
        var d = f.arrastreMin + k * (f.radioMira - f.arrastreMin);
        return { dx: u.ux * d, dy: u.uy * d };
    }

    /** Punto del tiro en el tiempo t (s). */
    function punto(origen, tiro, g, t) {
        return { x: origen.x + tiro.vx * t, y: origen.y + tiro.vy * t + 0.5 * g * t * t };
    }

    /** Instante en que el tiro está a `distancia` del origen (o null si no llega en 3 s). */
    function cruce(origen, tiro, g, distancia) {
        function r(t) {
            var p = punto(origen, tiro, g, t);
            return Math.sqrt((p.x - origen.x) * (p.x - origen.x) + (p.y - origen.y) * (p.y - origen.y));
        }
        var a = 0, b = 3;
        if (r(b) < distancia) return null;
        for (var i = 0; i < 40; i++) {
            var m = (a + b) / 2;
            if (r(m) < distancia) a = m;
            else b = m;
        }
        return (a + b) / 2;
    }

    /**
     * Tiro que pasa por la mira P (corrige la caída de la curva). El disco "llega" cuando está a la
     * distancia de la mira: ahí se mira si la diana está. Devuelve { vx, vy, vel, angulo, distancia, T, destino }.
     */
    function tiroHacia(cfg, origen, P) {
        var f = fisica(cfg);
        var dist = Math.sqrt((P.x - origen.x) * (P.x - origen.x) + (P.y - origen.y) * (P.y - origen.y));
        var T = dist / f.vel, tiro = null;
        for (var k = 0; k < 10; k++) {
            var ax = P.x - origen.x, ay = P.y - origen.y - 0.5 * f.g * T * T;
            var l = Math.sqrt(ax * ax + ay * ay) || 1;
            tiro = { vx: ax / l * f.vel, vy: ay / l * f.vel, vel: f.vel };
            T = cruce(origen, tiro, f.g, dist) || T;
        }
        tiro.angulo = Math.atan2(-tiro.vy, tiro.vx) * 180 / Math.PI;
        tiro.distancia = dist;
        tiro.T = T;
        tiro.destino = { x: P.x, y: P.y };
        return tiro;
    }

    /** Del dedo dentro de la esfera (dx, dy desde el disco) al tiro completo: mira + curva. rect = lo que se ve. */
    function lanzamiento(cfg, origen, dx, dy, rect) {
        var m = puntoMira(cfg, origen, dx, dy, rect);
        var t = tiroHacia(cfg, origen, m);
        t.valido = m.valido;
        t.k = m.k;
        return t;
    }

    /**
     * Mira que encuentra a la diana en el aire (demostración y pruebas): el punto donde estará la diana
     * cuando el disco llegue. predecir(s) da la posición de la diana dentro de s segundos. Devuelve { P, tiempo }.
     */
    function apuntarHacia(cfg, origen, predecir) {
        var P = predecir(0), T = 0.4;
        for (var k = 0; k < 10; k++) {
            P = predecir(T);
            T = tiroHacia(cfg, origen, P).T;
        }
        return { P: { x: P.x, y: P.y }, tiempo: T };
    }

    // ------------------------------------------------------------------ impacto

    function zonas(cfg) {
        var z = cfg && cfg.juego && cfg.juego.zonas;
        if (Array.isArray(z) && z.length) return z.slice().sort(function (a, b) { return a.hasta - b.hasta; });
        return [{ id: "centro", hasta: 0.34, puntos: 50 }, { id: "medio", hasta: 0.67, puntos: 20 }, { id: "exterior", hasta: 1, puntos: 10 }];
    }

    /**
     * Zona según la distancia al centro dividida por el radio de la diana. null = fuera (0 puntos).
     * Se descuenta el radio del disco: si el disco toca el borde, ya suma.
     */
    function zonaImpacto(cfg, distancia, radio) {
        var k = Math.max(0, distancia - fisica(cfg).radioDisco) / Math.max(1, radio);
        var l = zonas(cfg);
        for (var i = 0; i < l.length; i++) {
            if (k <= l[i].hasta) return { id: l[i].id, puntos: num(l[i].puntos, 0) };
        }
        return null;
    }

    /** Distancia mínima del punto p al segmento a-b, y el punto más cercano del segmento. */
    function distanciaSegmento(p, a, b) {
        var vx = b.x - a.x, vy = b.y - a.y;
        var l2 = vx * vx + vy * vy;
        var t = l2 > 0 ? limitar(((p.x - a.x) * vx + (p.y - a.y) * vy) / l2, 0, 1) : 0;
        var qx = a.x + vx * t, qy = a.y + vy * t;
        return { d: Math.sqrt((p.x - qx) * (p.x - qx) + (p.y - qy) * (p.y - qy)), x: qx, y: qy, t: t };
    }

    /** Resumen final a partir del historial ("centro" | "medio" | "exterior" | "fallo" por lanzamiento). */
    function resumen(cfg, historial) {
        var puntosPor = {};
        zonas(cfg).forEach(function (z) { puntosPor[z.id] = num(z.puntos, 0); });
        var r = { lanzamientos: 0, aciertos: 0, centros: 0, puntos: 0 };
        (historial || []).forEach(function (h) {
            r.lanzamientos++;
            if (h && h !== "fallo") {
                r.aciertos++;
                r.puntos += puntosPor[h] || 0;
                if (h === "centro") r.centros++;
            }
        });
        return r;
    }

    /** Estrellas de reconocimiento: siempre al menos una (todos celebran). */
    function estrellas(res, total) {
        var k = total > 0 ? res.aciertos / total : 0;
        return k >= 0.6 ? 3 : (k >= 0.25 ? 2 : 1);
    }

    // ------------------------------------------------------------------ revisión del config

    function revisarJuego(cfg) {
        var p = [];
        if (totalRondas(cfg) < 3) p.push("se necesitan al menos 3 rondas");
        if (lanzamientosPorRonda(cfg) < 4) p.push("se necesitan al menos 4 lanzamientos por ronda");
        var z = zona(cfg);
        rondas(cfg).forEach(function (r, i) {
            var rr = ronda(cfg, i);
            rr.patrones.forEach(function (pt) {
                if (PATRONES.indexOf(pt) < 0) p.push("ronda " + (i + 1) + ": patrón desconocido " + pt);
            });
            if (rr.radio < 60) p.push("ronda " + (i + 1) + ": diana demasiado pequeña");
            if (z.x0 - rr.radio < 160 || z.x1 + rr.radio > 1440) p.push("ronda " + (i + 1) + ": la diana se sale de la pantalla de tableta");
            if (z.y0 - rr.radio < 70) p.push("ronda " + (i + 1) + ": la diana tapa el marcador");
            if (rr.velocidad > 320) p.push("ronda " + (i + 1) + ": diana demasiado rápida");
        });
        var l = zonas(cfg);
        if (l.length !== 3 || l[l.length - 1].hasta !== 1) p.push("deben ser 3 zonas y la última llega al borde (1)");
        return p;
    }

    var ReglasTiro = {
        PATRONES: PATRONES,
        plantilla: plantilla,
        rondas: rondas,
        totalRondas: totalRondas,
        ronda: ronda,
        lanzamientosPorRonda: lanzamientosPorRonda,
        totalLanzamientos: totalLanzamientos,
        zona: zona,
        posicion: posicion,
        omega: omega,
        elegirPatron: elegirPatron,
        fisica: fisica,
        lanzamiento: lanzamiento,
        puntoMira: puntoMira,
        dedoPara: dedoPara,
        tiroHacia: tiroHacia,
        hastaBorde: hastaBorde,
        punto: punto,
        cruce: cruce,
        apuntarHacia: apuntarHacia,
        zonas: zonas,
        zonaImpacto: zonaImpacto,
        distanciaSegmento: distanciaSegmento,
        resumen: resumen,
        estrellas: estrellas,
        revisarJuego: revisarJuego
    };

    global.ReglasTiro = ReglasTiro;
    if (typeof module !== "undefined" && module.exports) module.exports = ReglasTiro;
})(typeof window !== "undefined" ? window : globalThis);
