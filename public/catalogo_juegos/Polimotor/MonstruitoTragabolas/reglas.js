/**
 * ReglasMonstruo — decisiones puras de "Alimenta al Monstruito Tragabolas" (window.ReglasMonstruo; también para node).
 *
 * No dibuja ni toca el DOM. Decide:
 *   - cómo queda cada nivel (bolas, colores, bandeja, dónde está el monstruito y su boca) — prepararNivel / validarNivel;
 *   - si un gesto es un lanzamiento (hacia arriba y lo bastante largo) o solo un toque — analizarGesto;
 *   - si el lanzamiento entra en la boca, con ayuda para lanzamientos cercanos (asistGrados) — analizarGesto;
 *   - que una bola no se coma dos veces y cuándo termina el nivel — nuevoMarcador / registrarAcierto / completo.
 *
 * Mundo de diseño 1600 × 900 (ENVELOP). Ángulos: 0 = derecho hacia arriba, positivo = hacia la derecha.
 */
(function (global) {
    "use strict";

    var W = 1600, H = 900;
    // Lo que se ve siempre, también en 4:3 (la escena recorta los lados).
    var ZONA = { x0: 230, x1: 1370 };
    // Boca respecto al centro del monstruito (a escala 1).
    var BOCA_LOCAL_Y = 58;
    var BOCA_RX = 96, BOCA_RY = 62;
    // inclinación máxima de un lanzamiento posible (desde la bola hasta la boca)
    var ANG_MAX = 47;

    function azar(semilla) {
        var s = (semilla >>> 0) || 1;
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function barajar(lista, rnd) {
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor((rnd || Math.random)() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function grados(rad) { return rad * 180 / Math.PI; }
    function rad(g) { return g * Math.PI / 180; }

    /** Altura de cada bola en la bandeja según su disposición (u = -1 … 1 de izquierda a derecha). */
    function alturaBandeja(tipo, u, i) {
        switch (tipo) {
            case "arco": return 18 * (1 - u * u);          // sonrisa: el centro un poco más abajo
            case "ola": return i % 2 ? -14 : 12;            // una arriba, una abajo
            case "fiesta": return -12 * (1 - u * u);        // la mesa del festín, centro un poco más alto
            default: return 0;                              // recta
        }
    }

    /**
     * Nivel listo para jugar. ronda = config.rondas[i]; juego = config.juego.
     * Los colores y el orden cambian en cada partida; tamaños, bandeja y boca siempre quedan accesibles.
     */
    function prepararNivel(ronda, juego, rnd, evitarX) {
        rnd = rnd || Math.random;
        var j = juego || {};
        var n = clamp(ronda.bolas | 0, 1, 8);
        var colores = (j.colores && j.colores.length ? j.colores : [{ id: "amarillo", hex: "#ffd43b" }]);
        // n colores distintos mientras alcancen; el orden es al azar
        var elegidos = barajar(colores, rnd).slice(0, Math.min(n, colores.length));
        while (elegidos.length < n) elegidos.push(colores[elegidos.length % colores.length]);
        elegidos = barajar(elegidos, rnd);

        var esc = Number(ronda.escalaMonstruo) || 1;
        // altura de la boca: un número o un rango [arriba, abajo] (cuanto más arriba, más lejos de la bandeja)
        var rangoY = Array.isArray(ronda.bocaY) ? ronda.bocaY : [Number(ronda.bocaY) || 400, Number(ronda.bocaY) || 400];
        var bocaY = Math.round(rangoY[0] + (rangoY[1] - rangoY[0]) * rnd());
        var margen = Number(ronda.margenBoca) || 40;

        var sep = Number(ronda.separacion) || 170;
        var y0 = Number(ronda.bandejaY) || 770;
        var r0 = Number(ronda.radioBola) || 60;
        var vari = Number(ronda.variacionTamano) || 0;
        var bolas = [];
        for (var i = 0; i < n; i++) {
            var u = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
            var r = Math.round(r0 * (1 + (rnd() * 2 - 1) * vari));
            bolas.push({
                id: "n" + ronda.id + "-b" + i,
                color: elegidos[i].id,
                hex: elegidos[i].hex,
                x: Math.round(W / 2 + (i - (n - 1) / 2) * sep),
                y: Math.round(y0 + alturaBandeja(ronda.bandeja, u, i)),
                r: Math.max(48, r)
            });
        }

        // posición al azar del monstruito, pero solo donde TODAS las bolas tienen un lanzamiento posible
        // (ninguna a más de ANG_MAX de inclinación) y lejos de los bordes; evitarX = dónde estuvo en el nivel anterior
        var tanMax = Math.tan(rad(ANG_MAX));
        var rango = ronda.monstruoX || [800, 800];
        var lo = Math.max(rango[0], ZONA.x0 + 120), hi = Math.min(rango[1], ZONA.x1 - 120);
        bolas.forEach(function (b) {
            var alcance = tanMax * (b.y - bocaY);
            lo = Math.max(lo, b.x - alcance);
            hi = Math.min(hi, b.x + alcance);
        });
        if (lo > hi) lo = hi = (lo + hi) / 2;
        var mx = lo + (hi - lo) * rnd();
        if (evitarX != null && hi - lo > 200) {
            for (var k = 0; k < 6 && Math.abs(mx - evitarX) < 110; k++) mx = lo + (hi - lo) * rnd();
        }
        if (ronda.monstruoLado) mx = rnd() < 0.5 ? lo : hi;
        mx = Math.round(clamp(mx, ZONA.x0 + 120, ZONA.x1 - 120));

        return {
            id: ronda.id,
            tema: ronda.tema || "manana",
            bandeja: ronda.bandeja || "recta",
            monstruo: { x: mx, y: bocaY - BOCA_LOCAL_Y * esc, escala: esc },
            boca: { x: mx, y: bocaY, rx: BOCA_RX * esc + margen, ry: BOCA_RY * esc + margen * 0.8 },
            asistGrados: Number(ronda.asistGrados) || 30,
            bolas: bolas
        };
    }

    /** Problemas del nivel (lista vacía = jugable). */
    function validarNivel(p) {
        var m = [];
        if (!p || !p.bolas || !p.bolas.length) return ["sin bolas"];
        if (p.monstruo.x < ZONA.x0 + 100 || p.monstruo.x > ZONA.x1 - 100) m.push("monstruito fuera de la zona visible");
        if (p.boca.y < 250 || p.boca.y > 470) m.push("boca demasiado alta o baja");
        // la cabeza con los cuernos no se sale por arriba
        if (p.monstruo.y - 230 * p.monstruo.escala < 30) m.push("cuernos fuera de la pantalla");
        p.bolas.forEach(function (b, i) {
            if (b.x - b.r < ZONA.x0 || b.x + b.r > ZONA.x1) m.push("bola " + i + " fuera de la zona");
            if (b.r < 48) m.push("bola " + i + " muy pequeña");
            if (b.y - p.boca.y < 260) m.push("bola " + i + " muy cerca de la boca");
            var ang = Math.abs(grados(Math.atan2(p.boca.x - b.x, b.y - p.boca.y)));
            if (ang > 52) m.push("bola " + i + " con un ángulo imposible (" + Math.round(ang) + "°)");
            for (var k = i + 1; k < p.bolas.length; k++) {
                var o = p.bolas[k];
                if (Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r + 12) m.push("bolas " + i + " y " + k + " se tocan");
            }
        });
        return m;
    }

    function enBoca(x, y, boca, extra) {
        var e = extra || 0;
        var dx = (x - boca.x) / (boca.rx + e), dy = (y - boca.y) / (boca.ry + e);
        return dx * dx + dy * dy <= 1;
    }

    /**
     * ¿Es un lanzamiento? muestras = [{x, y, t}] desde que el dedo tocó la bola (coordenadas del mundo).
     *
     * Devuelve { lanza:false, motivo:"toque"|"corto"|"abajo"|"lado" } o
     * { lanza:true, acierto, casi, angulo, anguloBoca, error, destino:{x,y}, lado, vueloMs }.
     *
     * Tolerante: no exige recta ni velocidad; la dirección sale del tramo final del gesto (o del total si el dedo
     * se detuvo antes de soltar). Si el ángulo se acerca a la boca (asistGrados), el lanzamiento se corrige y entra.
     */
    function analizarGesto(muestras, bola, boca, nivel, juego) {
        var j = juego || {};
        if (!muestras || muestras.length < 2) return { lanza: false, motivo: "toque" };
        var a = muestras[0], z = muestras[muestras.length - 1];
        var dx = z.x - a.x, dy = z.y - a.y;
        var dist = Math.hypot(dx, dy);
        if (dist < (Number(j.toqueMax) || 14)) return { lanza: false, motivo: "toque" };
        if (-dy < (Number(j.minSubida) || 38)) return { lanza: false, motivo: dy > 20 && Math.abs(dy) > Math.abs(dx) ? "abajo" : "corto" };

        // dirección: el tramo de los últimos ~170 ms; si el dedo se quedó quieto, el gesto completo
        var ventana = Number(j.ventanaMs) || 170;
        var k = muestras.length - 1;
        while (k > 0 && z.t - muestras[k - 1].t <= ventana) k--;
        var rx = z.x - muestras[k].x, ry = z.y - muestras[k].y;
        if (Math.hypot(rx, ry) < 22 || ry > -8) { rx = dx; ry = dy; }
        var ang = Math.atan2(rx, -ry);
        if (Math.abs(grados(ang)) > (Number(j.anguloMaxGrados) || 78)) return { lanza: false, motivo: "lado" };

        var angBoca = Math.atan2(boca.x - bola.x, bola.y - boca.y);
        var err = grados(ang - angBoca);
        var asist = Number(nivel && nivel.asistGrados) || 30;
        var acierto = Math.abs(err) <= asist;
        var lado = err >= 0 ? 1 : -1;
        var destino;
        if (acierto) {
            // corrección suave: entra cerca del centro, apenas corrida hacia donde apuntó
            destino = { x: boca.x + clamp(err * 1.4, -boca.rx * 0.28, boca.rx * 0.28), y: boca.y + 4 };
        } else {
            // pasa al lado de la cabeza (nunca roza la zona de la boca)
            var yd = boca.y - 40;
            var angC = angBoca + rad(err * 0.75);
            var xd = bola.x + Math.tan(angC) * (bola.y - yd);
            var minLado = boca.rx + (Number(j.falloLateralMin) || 120);
            if (Math.abs(xd - boca.x) < minLado) xd = boca.x + lado * minLado;
            destino = { x: clamp(xd, 90, W - 90), y: yd };
        }
        var dur = Math.max(60, z.t - a.t);
        var vel = dist / dur;
        var vMin = Number(j.vueloMinMs) || 560, vMax = Number(j.vueloMaxMs) || 900;
        return {
            lanza: true,
            acierto: acierto,
            casi: !acierto && Math.abs(err) <= asist + 20,
            angulo: Math.round(grados(ang)),
            anguloBoca: Math.round(grados(angBoca)),
            error: Math.round(err),
            destino: destino,
            lado: lado,
            vueloMs: Math.round(clamp(vMax - (vel - 0.3) * 380, vMin, vMax))
        };
    }

    /** Punto de control de la curva de vuelo: arco suave hacia arriba, inclinado hacia donde apuntó el dedo. */
    function controlVuelo(o, d, arco) {
        var mx = (o.x + d.x) / 2, my = (o.y + d.y) / 2;
        return { x: mx + (d.x - o.x) * 0.08, y: my - (arco == null ? 90 : arco) };
    }

    function bezier(o, c, d, u) {
        var v = 1 - u;
        return { x: v * v * o.x + 2 * v * u * c.x + u * u * d.x, y: v * v * o.y + 2 * v * u * c.y + u * u * d.y };
    }

    // ------------------------------------------------------------------ marcador del nivel

    function nuevoMarcador(nivel) {
        return { total: nivel.bolas.length, comidas: {}, n: 0, intentos: 0, fallos: 0, fallosSeguidos: 0 };
    }

    /** Suma una bola comida. false si ya estaba comida o no es de este nivel (no cuenta dos veces). */
    function registrarAcierto(m, nivel, id) {
        var existe = nivel.bolas.some(function (b) { return b.id === id; });
        if (!existe || m.comidas[id]) return false;
        m.comidas[id] = true;
        m.n++;
        m.intentos++;
        m.fallosSeguidos = 0;
        return true;
    }

    function registrarFallo(m) {
        m.intentos++;
        m.fallos++;
        m.fallosSeguidos++;
    }

    function disponible(m, id) { return !m.comidas[id]; }
    function completo(m) { return m.n >= m.total; }

    var API = {
        W: W,
        H: H,
        ZONA: ZONA,
        BOCA_LOCAL_Y: BOCA_LOCAL_Y,
        azar: azar,
        barajar: barajar,
        prepararNivel: prepararNivel,
        validarNivel: validarNivel,
        enBoca: enBoca,
        analizarGesto: analizarGesto,
        controlVuelo: controlVuelo,
        bezier: bezier,
        nuevoMarcador: nuevoMarcador,
        registrarAcierto: registrarAcierto,
        registrarFallo: registrarFallo,
        disponible: disponible,
        completo: completo
    };

    global.ReglasMonstruo = API;
    if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : global);
