/**
 * ReglasVarita — geometría y decisión de "La Varita Mágica y las Estrellas en el Cielo" (window.ReglasVarita).
 *
 * Puro (sin DOM ni Phaser), exportable a Node para las pruebas:
 *   - PLANTILLAS: formas de curva por nivel en coordenadas normalizadas (u a la derecha, v hacia abajo).
 *   - generar(def, juego, rnd, evitar): elige una plantilla del nivel, la ubica al azar (caja, posición, volteos,
 *     pequeñas variaciones), la convierte en una spline Catmull-Rom centrípeta muestreada por longitud de arco y la
 *     valida. Si falla, descarta y prueba otra; tras `intentos` usa el respaldo fijo del nivel (sin bucles infinitos).
 *   - seguir(camino, est, x, y, juego): avanza el progreso solo si el dedo está cerca de la curva y DENTRO de una
 *     ventana corta por delante del progreso actual. Así no se puede saltar el recorrido tocando el final ni tocar
 *     estrellas sueltas: las estrellas se encienden por el progreso real.
 *
 * Nada resta: salir del carril solo marca `fuera`, el progreso nunca baja.
 */
(function (global) {
    "use strict";

    // Zona donde debe quedar el eje de la curva (mundo de diseño 1600 × 900). Deja libres los botones de las
    // esquinas, la pista de arriba, la consola de niveles de abajo y cabe en 4:3 (x visible ≈ 200..1400).
    var ZONA = { x0: 300, x1: 1300, y0: 240, y1: 670 };
    // La luna de arriba a la izquierda: el carril no la pisa.
    var OBSTACULOS = [{ x: 300, y: 128, r: 62 }];

    function lerp(a, b, u) { return a + (b - a) * u; }
    function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

    /** Generador pseudoaleatorio con semilla (para pruebas); sin semilla usa Math.random. */
    function azar(semilla) {
        if (semilla == null) return Math.random;
        var s = (semilla >>> 0) || 1;
        return function () {
            s ^= s << 13; s >>>= 0;
            s ^= s >>> 17;
            s ^= s << 5; s >>>= 0;
            return (s % 1000000) / 1000000;
        };
    }

    function rango(r, rnd) {
        if (!Array.isArray(r)) return Number(r) || 0;
        return lerp(r[0], r[1], rnd());
    }

    // ------------------------------------------------------------------ plantillas (u, v en 0..1)

    /**
     * Puntos de control de una curva paramétrica (t de 0 a 1), reescalados a la caja 0..1. Las formas salen de
     * funciones suaves (senos, elipses) y no de picos sueltos: así el radio de curvatura mínimo es predecible.
     */
    function funcion(fx, fy, n) {
        var pts = [];
        for (var i = 0; i <= n; i++) pts.push([fx(i / n), fy(i / n)]);
        var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
        return pts.map(function (p) {
            return [x1 - x0 > 1e-6 ? (p[0] - x0) / (x1 - x0) : 0.5, y1 - y0 > 1e-6 ? (p[1] - y0) / (y1 - y0) : 0.5];
        });
    }

    /** Onda: `ciclos` vueltas de seno a lo ancho, empezando en la fase dada. */
    function onda(ciclos, fase, n) {
        return funcion(function (t) { return t; }, function (t) { return -Math.sin(Math.PI * 2 * ciclos * t + fase); }, n || Math.ceil(10 * ciclos) + 4);
    }

    /**
     * Camino de ida y vuelta en dos filas (una «S» acostada): va por arriba, da un giro amplio y vuelve por abajo.
     * Dobla el largo sin estrechar el carril ni hacer curvas cerradas. forma: "lisa", "ondas" (filas onduladas) o
     * "arcos" (fila de arriba arqueada hacia arriba y la de abajo hacia abajo). ru = radio del giro en u.
     */
    function serpentina(forma, ru) {
        var r = ru || 0.19;
        var fin = 1 - r;
        var pts = [];
        var desv = function (k, n, abajo) {
            if (forma === "ondas") return (k % 2 ? 1 : -1) * 0.06 * (k > 0 && k < n ? 1 : 0);
            if (forma === "arcos") return (abajo ? 1 : -1) * 0.07 * Math.sin(PI * k / n);
            return 0;
        };
        var n = 4;
        for (var k = 0; k <= n; k++) pts.push([fin * k / n, 0.08 + desv(k, n, false)]);
        [-45, 0, 45].forEach(function (g) {
            var a = g * PI / 180;
            pts.push([fin + r * Math.cos(a), 0.5 + 0.42 * Math.sin(a)]);
        });
        for (var q = n; q >= 1; q--) pts.push([0.06 + (fin - 0.06) * q / n, 0.92 + desv(q, n, true)]);
        pts.push([0.06, 0.92]);
        return pts;
    }

    var PI = Math.PI;
    var PLANTILLAS = {
        // Nivel 1 — La estrella viajera: una sola curva suave, a lo ancho del cielo.
        "ascendente": { puntos: [[0, 1], [0.5, 0.66], [1, 0]], caja: [[760, 880], [220, 290]] },
        "descendente": { puntos: [[0, 0], [0.5, 0.34], [1, 1]], caja: [[760, 880], [220, 290]] },
        "arco": { puntos: funcion(function (t) { return t; }, function (t) { return -Math.sin(PI * t); }, 8), caja: [[760, 880], [170, 230]] },
        "lateral": { puntos: [[0, 0.8], [0.42, 0.05], [1, 0.45]], caja: [[760, 880], [220, 290]] },

        // Nivel 2 — El camino de la luna: una curva más marcada y más larga.
        "arco-amplio": { puntos: [[0, 1], [0.2, 0.22], [0.5, 0], [0.8, 0.22], [1, 1]], caja: [[860, 960], [320, 380]] },
        "curva-c": { puntos: funcion(function (t) { return -Math.sin(PI * t); }, function (t) { return -Math.cos(PI * t); }, 10), caja: [[380, 420], [400, 425]] },
        "ascendente-larga": { puntos: [[0, 1], [0.36, 0.86], [0.66, 0.42], [1, 0]], caja: [[860, 960], [330, 400]] },
        "descendente-larga": { puntos: [[0, 0], [0.36, 0.14], [0.66, 0.58], [1, 1]], caja: [[860, 960], [330, 400]] },
        "semicirculo": { puntos: [[0, 1], [0.146, 0.29], [0.5, 0], [0.854, 0.29], [1, 1]], caja: [[760, 840], [360, 410]] },

        // Nivel 3 — Las nubes mágicas: dos curvas suaves, de lado a lado.
        "s-suave": { puntos: onda(1, 0), caja: [[960, 1000], [330, 390]] },
        "doble-arco": { puntos: onda(1.5, -PI / 2), caja: [[960, 1000], [250, 290]] },
        "ondulada": { puntos: onda(1.25, 0), caja: [[960, 1000], [280, 320]] },
        "ascendente-retorno": { puntos: funcion(function (t) { return t; }, function (t) { return 1 - t - 0.3 * Math.sin(PI * 2 * t); }, 12), caja: [[940, 1000], [380, 420]] },
        "descendente-retorno": { puntos: funcion(function (t) { return t; }, function (t) { return t + 0.3 * Math.sin(PI * 2 * t); }, 12), caja: [[940, 1000], [380, 420]] },

        // Nivel 4 — El gran camino estelar: el más largo, ida y vuelta con giros amplios, sin cruces.
        // Espiral muy abierta: entra por un lado y se enrosca menos de una vuelta, sin rozar su propio tramo.
        "espiral-abierta": {
            puntos: funcion(
                function (t) { return t < 0.4 ? t / 0.4 * 0.55 : 0.55 + 0.45 * (1 - Math.cos((t - 0.4) / 0.6 * PI * 1.0)) * 0.5 * (1 - 0.3 * (t - 0.4)); },
                function (t) { return t < 0.4 ? 0.12 * Math.sin(t / 0.4 * PI) : -Math.sin((t - 0.4) / 0.6 * PI * 1.0) * (1 - 0.35 * (t - 0.4)); },
                16),
            caja: [[900, 1000], [380, 425]]
        },
        "s-amplia": { puntos: serpentina("lisa"), caja: [[900, 1000], [390, 425]] },
        "onda-doble": { puntos: serpentina("ondas"), caja: [[900, 1000], [390, 420]] },
        "arco-dos-curvas": { puntos: serpentina("arcos"), caja: [[900, 1000], [360, 395]] }
    };

    // ------------------------------------------------------------------ spline Catmull-Rom centrípeta

    function catmull(p0, p1, p2, p3, n, salida) {
        var a = 0.5;
        var t0 = 0;
        var t1 = t0 + Math.pow(Math.max(1e-6, dist(p0[0], p0[1], p1[0], p1[1])), a);
        var t2 = t1 + Math.pow(Math.max(1e-6, dist(p1[0], p1[1], p2[0], p2[1])), a);
        var t3 = t2 + Math.pow(Math.max(1e-6, dist(p2[0], p2[1], p3[0], p3[1])), a);
        for (var i = 0; i < n; i++) {
            var t = lerp(t1, t2, i / n);
            var A1x = (t1 - t) / (t1 - t0) * p0[0] + (t - t0) / (t1 - t0) * p1[0];
            var A1y = (t1 - t) / (t1 - t0) * p0[1] + (t - t0) / (t1 - t0) * p1[1];
            var A2x = (t2 - t) / (t2 - t1) * p1[0] + (t - t1) / (t2 - t1) * p2[0];
            var A2y = (t2 - t) / (t2 - t1) * p1[1] + (t - t1) / (t2 - t1) * p2[1];
            var A3x = (t3 - t) / (t3 - t2) * p2[0] + (t - t2) / (t3 - t2) * p3[0];
            var A3y = (t3 - t) / (t3 - t2) * p2[1] + (t - t2) / (t3 - t2) * p3[1];
            var B1x = (t2 - t) / (t2 - t0) * A1x + (t - t0) / (t2 - t0) * A2x;
            var B1y = (t2 - t) / (t2 - t0) * A1y + (t - t0) / (t2 - t0) * A2y;
            var B2x = (t3 - t) / (t3 - t1) * A2x + (t - t1) / (t3 - t1) * A3x;
            var B2y = (t3 - t) / (t3 - t1) * A2y + (t - t1) / (t3 - t1) * A3y;
            salida.push([
                (t2 - t) / (t2 - t1) * B1x + (t - t1) / (t2 - t1) * B2x,
                (t2 - t) / (t2 - t1) * B1y + (t - t1) / (t2 - t1) * B2y
            ]);
        }
    }

    /** Curva suave que pasa por todos los puntos de control, muestreada cada `paso` px de longitud de arco. */
    function muestrear(control, paso) {
        var c = control;
        var ext = [
            [2 * c[0][0] - c[1][0], 2 * c[0][1] - c[1][1]]
        ].concat(c, [[2 * c[c.length - 1][0] - c[c.length - 2][0], 2 * c[c.length - 1][1] - c[c.length - 2][1]]]);
        var densa = [];
        for (var i = 1; i < ext.length - 2; i++) catmull(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], 48, densa);
        densa.push(c[c.length - 1].slice());
        // longitud acumulada de la polilínea densa
        var acum = [0];
        for (var k = 1; k < densa.length; k++) acum.push(acum[k - 1] + dist(densa[k][0], densa[k][1], densa[k - 1][0], densa[k - 1][1]));
        var largo = acum[acum.length - 1];
        var muestras = [];
        var j = 0;
        for (var s = 0; s <= largo + 1e-6; s += paso) {
            while (j < acum.length - 2 && acum[j + 1] < s) j++;
            var seg = acum[j + 1] - acum[j] || 1;
            var u = Math.max(0, Math.min(1, (s - acum[j]) / seg));
            muestras.push({ x: lerp(densa[j][0], densa[j + 1][0], u), y: lerp(densa[j][1], densa[j + 1][1], u), s: s });
        }
        var ult = muestras[muestras.length - 1];
        if (largo - ult.s > paso * 0.25) muestras.push({ x: densa[densa.length - 1][0], y: densa[densa.length - 1][1], s: largo });
        for (var m = 0; m < muestras.length; m++) {
            var a = muestras[Math.max(0, m - 1)], b = muestras[Math.min(muestras.length - 1, m + 1)];
            muestras[m].ang = Math.atan2(b.y - a.y, b.x - a.x);
        }
        return { muestras: muestras, largo: muestras[muestras.length - 1].s };
    }

    function radioEn(m, i, k) {
        var a = m[i - k], b = m[i], c = m[i + k];
        var ab = dist(a.x, a.y, b.x, b.y), bc = dist(b.x, b.y, c.x, c.y), ca = dist(c.x, c.y, a.x, a.y);
        var area2 = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
        if (area2 < 1e-6) return Infinity;
        return ab * bc * ca / (2 * area2);
    }

    // ------------------------------------------------------------------ validación

    /**
     * Devuelve null si la curva sirve, o el motivo por el que se descarta.
     * Comprueba zona (no invade botones ni queda cortada), obstáculos, longitud, curvas no cerradas, sin cruces ni
     * tramos que se rocen, inicio y final bien separados y estrellas repartidas.
     */
    function validar(camino, def, juego) {
        var j = juego || {};
        var m = camino.muestras;
        var z = camino.zona || ZONA;
        var mitad = camino.ancho / 2;
        for (var i = 0; i < m.length; i++) {
            var p = m[i];
            if (p.x < z.x0 || p.x > z.x1 || p.y < z.y0 || p.y > z.y1) return "fuera de la zona";
            for (var o = 0; o < OBSTACULOS.length; o++) {
                var ob = OBSTACULOS[o];
                if (dist(p.x, p.y, ob.x, ob.y) < ob.r + mitad + 8) return "pisa la luna";
            }
        }
        var largo = def.largo || [0, Infinity];
        if (camino.largo < largo[0]) return "muy corta";
        if (camino.largo > largo[1]) return "muy larga";
        // curvas no cerradas ni cambios bruscos: radio de curvatura mínimo en una ventana de ~48 px
        var k = Math.max(2, Math.round(48 / camino.paso));
        var radioMin = Number(def.radioMin) || 90;
        for (var q = k; q < m.length - k; q++) {
            if (radioEn(m, q, k) < radioMin) return "curva cerrada";
        }
        // sin cruces ni tramos que se rocen: puntos lejanos en el recorrido deben estar lejos en la pantalla
        var sepMin = camino.ancho * 1.45 + 20;
        var sepArco = sepMin * 1.7;
        var salto = Math.max(1, Math.round(12 / camino.paso));
        for (var a = 0; a < m.length; a += salto) {
            for (var b = a + 1; b < m.length; b += salto) {
                if (m[b].s - m[a].s < sepArco) continue;
                if (dist(m[a].x, m[a].y, m[b].x, m[b].y) < sepMin) return "tramos muy juntos";
            }
        }
        var ini = m[0], fin = m[m.length - 1];
        if (dist(ini.x, ini.y, fin.x, fin.y) < (Number(j.inicioFinMin) || 240)) return "inicio y final juntos";
        // estrellas repartidas: separadas en el recorrido y en la pantalla
        var est = camino.estrellas;
        var sepEst = Number(j.sepEstrellas) || 120;
        var prev = { x: ini.x, y: ini.y, s: 0 };
        for (var e = 0; e < est.length; e++) {
            if (est[e].s - prev.s < sepEst * 0.9) return "estrellas juntas";
            if (dist(est[e].x, est[e].y, prev.x, prev.y) < sepEst * 0.85) return "estrellas juntas";
            prev = est[e];
        }
        return null;
    }

    // ------------------------------------------------------------------ construcción del camino

    function puntoEn(camino, s) {
        var m = camino.muestras;
        var sc = Math.max(0, Math.min(camino.largo, s));
        var i = Math.min(m.length - 2, Math.floor(sc / camino.paso));
        var a = m[i], b = m[i + 1];
        var seg = (b.s - a.s) || 1;
        var u = Math.max(0, Math.min(1, (sc - a.s) / seg));
        return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), ang: Math.atan2(b.y - a.y, b.x - a.x), s: sc };
    }

    /**
     * Estrellas en lugares al azar del camino: las n-1 primeras se sortean libremente a lo largo de la curva (no a
     * distancias iguales), con una separación mínima entre ellas, con el inicio y con la estrella final, y se corren
     * un poco a un lado u otro dentro del carril. La última siempre marca el final. Si en `intentos` sorteos no
     * caben, quedan repartidas con un pequeño desorden (y validar() decide si el camino sirve).
     * o: { sep (separación mínima), lateral (fracción del ancho), intentos }
     */
    function colocarEstrellas(camino, n, rnd, o) {
        o = o || {};
        var L = camino.largo;
        var sep = Math.min(Number(o.sep) || 120, L / (n + 0.4));
        var lateral = (o.lateral != null ? Number(o.lateral) : 0.16) * camino.ancho;
        var lista = null;
        for (var t = 0; t < (o.intentos || 40) && !lista; t++) {
            var ss = [];
            for (var k = 0; k < n - 1; k++) ss.push(sep + rnd() * (L - 2 * sep));
            ss.sort(function (a, b) { return a - b; });
            ss.push(L);
            var ok = true, prev = { s: 0, x: camino.inicio.x, y: camino.inicio.y };
            var pts = [];
            for (var q = 0; q < ss.length && ok; q++) {
                var p = puntoEn(camino, ss[q]);
                var off = q === ss.length - 1 ? 0 : (rnd() * 2 - 1) * lateral;
                var x = p.x - Math.sin(p.ang) * off, y = p.y + Math.cos(p.ang) * off;
                if (ss[q] - prev.s < sep || dist(x, y, prev.x, prev.y) < sep * 0.9) ok = false;
                prev = { s: ss[q], x: x, y: y };
                pts.push({ s: p.s, x: x, y: y });
            }
            if (ok) lista = pts;
        }
        if (!lista) {
            lista = [];
            var tramo = L / n;
            for (var j = 1; j <= n; j++) {
                var pp = puntoEn(camino, j === n ? L : tramo * j + (rnd() - 0.5) * 0.3 * tramo);
                lista.push({ s: pp.s, x: pp.x, y: pp.y });
            }
        }
        return lista.map(function (p, i) { return { i: i, s: p.s, x: p.x, y: p.y, ultima: i === n - 1 }; });
    }

    /**
     * Arma el camino de una plantilla. o: { plantilla, ancho, paso, caja:[w,h], centro:[cx,cy], volteoX, volteoY,
     * variacion, estrellas, sepEstrellas, lateral } — todo lo que no venga se sortea con rnd dentro de los rangos de la plantilla.
     */
    function construir(o, rnd) {
        var pl = PLANTILLAS[o.plantilla];
        if (!pl) throw new Error("plantilla desconocida: " + o.plantilla);
        var paso = o.paso || 6;
        var z = o.zona || ZONA;
        var bw = o.caja ? o.caja[0] : rango(pl.caja[0], rnd);
        var bh = o.caja ? o.caja[1] : rango(pl.caja[1], rnd);
        var lx = Math.max(0, (z.x1 - z.x0 - bw) / 2), ly = Math.max(0, (z.y1 - z.y0 - bh) / 2);
        var cx = o.centro ? o.centro[0] : (z.x0 + z.x1) / 2 + (rnd() * 2 - 1) * lx;
        var cy = o.centro ? o.centro[1] : (z.y0 + z.y1) / 2 + (rnd() * 2 - 1) * ly;
        var fx = o.volteoX != null ? o.volteoX : rnd() < 0.5;
        var fy = o.volteoY != null ? o.volteoY : rnd() < 0.5;
        var vari = o.variacion != null ? o.variacion : 0.035;
        // variación suave (baja frecuencia, nula en los extremos): cambia la forma sin crear picos ni meneos
        var a1 = (rnd() - 0.5) * 2 * vari, a2 = (rnd() - 0.5) * 2 * vari, a3 = (rnd() - 0.5) * vari;
        var n = pl.puntos.length;
        var control = pl.puntos.map(function (p, i) {
            var t = n > 1 ? i / (n - 1) : 0;
            var u = p[0] + a1 * Math.sin(Math.PI * t);
            var v = p[1] + a2 * Math.sin(Math.PI * t) + a3 * Math.sin(2 * Math.PI * t);
            return [cx + (u - 0.5) * bw * (fx ? -1 : 1), cy + (v - 0.5) * bh * (fy ? -1 : 1)];
        });
        var mu = muestrear(control, paso);
        var camino = {
            plantilla: o.plantilla,
            ancho: o.ancho || 150,
            paso: paso,
            zona: z,
            control: control,
            muestras: mu.muestras,
            largo: mu.largo,
            volteoX: fx,
            volteoY: fy
        };
        camino.inicio = { x: mu.muestras[0].x, y: mu.muestras[0].y };
        camino.fin = { x: mu.muestras[mu.muestras.length - 1].x, y: mu.muestras[mu.muestras.length - 1].y };
        camino.estrellas = colocarEstrellas(camino, o.estrellas || 3, rnd, { sep: o.sepEstrellas, lateral: o.lateral });
        return camino;
    }

    /**
     * Camino al azar del nivel `def` (config.cielos[i]). evitar: plantilla usada en la partida anterior (se evita si
     * hay otra). Devuelve el camino con .intentos y .respaldo para saber cómo salió.
     */
    function generar(def, juego, rnd, evitar) {
        rnd = rnd || Math.random;
        var j = juego || {};
        var lista = (def.plantillas || []).filter(function (p) { return PLANTILLAS[p]; });
        if (lista.length > 1 && evitar) {
            var sin = lista.filter(function (p) { return p !== evitar; });
            if (sin.length) lista = sin;
        }
        var max = Number(j.intentos) || 60;
        var motivos = {};
        for (var t = 0; t < max && lista.length; t++) {
            var pl = lista[Math.floor(rnd() * lista.length)];
            var c = construir({ plantilla: pl, ancho: def.ancho, paso: j.paso, estrellas: def.estrellas, sepEstrellas: j.sepEstrellas, lateral: j.lateralEstrellas }, rnd);
            var motivo = validar(c, def, j);
            if (!motivo) {
                c.intentos = t + 1;
                c.respaldo = false;
                return c;
            }
            motivos[motivo] = (motivos[motivo] || 0) + 1;
        }
        var r = def.respaldo || {};
        var c2 = construir({
            plantilla: r.plantilla || (def.plantillas || ["arco"])[0],
            ancho: def.ancho,
            paso: j.paso,
            estrellas: def.estrellas,
            caja: r.caja,
            centro: r.centro || [800, 450],
            volteoX: false,
            volteoY: false,
            variacion: 0,
            sepEstrellas: j.sepEstrellas,
            lateral: j.lateralEstrellas
        }, rnd);
        c2.intentos = max;
        c2.respaldo = true;
        c2.motivos = motivos;
        return c2;
    }

    /** Los cuatro caminos de una partida (uno por nivel). anteriores: plantillas de la partida anterior. */
    function generarPartida(cielos, juego, rnd, anteriores) {
        var prev = anteriores || [];
        return (cielos || []).map(function (def, i) { return generar(def, juego, rnd, prev[i]); });
    }

    // ------------------------------------------------------------------ trazado

    function nuevoEstado(camino) {
        return {
            s: 0,
            conectado: false,
            empezo: false,
            fuera: false,
            encendidas: 0,
            enMeta: false,
            dedo: null,
            dist: 0,
            x: camino.inicio.x,
            y: camino.inicio.y
        };
    }

    function tolerancia(camino, juego) {
        return camino.ancho / 2 + (Number((juego || {}).holgura) || 50);
    }

    /** ¿El toque cae sobre la varita (al inicio, o donde quedó el progreso)? Zona grande: no exige el centro. */
    function tocaVarita(camino, est, x, y, juego) {
        var r = Number((juego || {}).radioToque) || 120;
        var p = puntoEn(camino, est.s);
        return dist(x, y, p.x, p.y) <= r;
    }

    function tomar(est, x, y) {
        est.conectado = true;
        est.empezo = true;
        est.fuera = false;
        est.dedo = { x: x, y: y };
    }

    function soltar(est) {
        est.conectado = false;
        est.dedo = null;
    }

    /** Punto más cercano de la curva al dedo, buscando solo cerca del progreso (un poco atrás y `ventana` adelante). */
    function cercano(camino, s, x, y, juego) {
        var j = juego || {};
        var m = camino.muestras;
        var i0 = Math.max(0, Math.floor((s - (Number(j.atras) || 60)) / camino.paso));
        var i1 = Math.min(m.length - 1, Math.ceil((s + (Number(j.ventana) || 90)) / camino.paso));
        var mejor = -1, md = Infinity;
        for (var i = i0; i <= i1; i++) {
            var d = dist(x, y, m[i].x, m[i].y);
            if (d < md) { md = d; mejor = i; }
        }
        return { i: mejor, d: md, s: m[mejor].s };
    }

    /**
     * El dedo se movió a (x, y). Recorre el trayecto desde la posición anterior en sub-pasos cortos para que un
     * movimiento rápido no se salte nada. Devuelve los eventos: { avance, nuevas:[índices], salio, volvio, meta }.
     */
    function seguir(camino, est, x, y, juego) {
        var j = juego || {};
        var ev = { avance: 0, nuevas: [], salio: false, volvio: false, meta: false };
        if (!est.conectado || est.enMeta) return ev;
        var tol = tolerancia(camino, j);
        var desde = est.dedo || { x: x, y: y };
        var largoMov = dist(desde.x, desde.y, x, y);
        // un salto (el dedo apareció lejos de golpe) no se rellena: solo cuenta donde cayó, que queda fuera de la
        // ventana y no avanza. Así no se puede ir del inicio al final de un toque.
        if (largoMov > (Number(j.saltoMax) || 150)) desde = { x: x, y: y };
        var sub = Math.max(1, Math.ceil(dist(desde.x, desde.y, x, y) / (Number(j.subpaso) || 16)));
        var s0 = est.s;
        var eraFuera = est.fuera;
        for (var k = 1; k <= sub; k++) {
            var px = lerp(desde.x, x, k / sub), py = lerp(desde.y, y, k / sub);
            var c = cercano(camino, est.s, px, py, j);
            est.dist = c.d;
            if (c.d <= tol) {
                est.fuera = false;
                if (c.s > est.s) est.s = c.s;
            } else {
                est.fuera = true;
            }
        }
        est.dedo = { x: x, y: y };
        var finTol = Number(j.finTol) || 26;
        if (est.s >= camino.largo - finTol) est.s = camino.largo;
        var p = puntoEn(camino, est.s);
        est.x = p.x;
        est.y = p.y;
        ev.avance = est.s - s0;
        var radio = Number(j.radioEstrella) || 34;
        while (est.encendidas < camino.estrellas.length && est.s >= camino.estrellas[est.encendidas].s - radio) {
            ev.nuevas.push(est.encendidas);
            est.encendidas++;
        }
        if (est.s >= camino.largo) {
            est.encendidas = camino.estrellas.length;
            est.enMeta = true;
            est.fuera = false;
            ev.meta = true;
        }
        if (!eraFuera && est.fuera) ev.salio = true;
        if (eraFuera && !est.fuera) ev.volvio = true;
        return ev;
    }

    var API = {
        ZONA: ZONA,
        OBSTACULOS: OBSTACULOS,
        PLANTILLAS: PLANTILLAS,
        azar: azar,
        muestrear: muestrear,
        construir: construir,
        validar: validar,
        generar: generar,
        generarPartida: generarPartida,
        puntoEn: puntoEn,
        nuevoEstado: nuevoEstado,
        tolerancia: tolerancia,
        tocaVarita: tocaVarita,
        tomar: tomar,
        soltar: soltar,
        cercano: cercano,
        seguir: seguir,
        radioEn: radioEn
    };
    global.ReglasVarita = API;
    if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : global);
