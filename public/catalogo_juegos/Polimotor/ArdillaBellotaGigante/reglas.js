/**
 * ReglasArdilla — generador de recorridos y geometría del arrastre de "La Ardilla y la Bellota Gigante"
 * (window.ReglasArdilla; también module.exports para las pruebas con node). Puro: no toca el DOM ni Phaser.
 *
 * Un recorrido tiene DOS rutas completas que salen del mismo punto (la ardilla) y llegan a la misma cesta:
 *
 *   inicio ──── S ╭── ruta de arriba ──╮ J ──── meta (cesta)
 *                 ╰── ruta de abajo  ──╯
 *
 * Las dos rutas son caminos de tierra iguales. Una está despejada; la otra tiene obstáculos (tronco, piedras,
 * ramas…) apoyados hacia un lado del camino, siempre con un paso amplio por el otro lado. Ninguna ruta es un
 * callejón: las dos terminan en la cesta.
 *
 * La bellota se mueve libre (todas las direcciones) dentro de la franja del camino. Puede salirse un poco
 * (zona "fuera": el camino se pone rojo poco a poco); más allá de la holgura se queda en el borde ("limite").
 * Los obstáculos no se atraviesan: la bellota resbala a su alrededor (nunca se queda trabada).
 */
(function (global) {
    "use strict";

    // ------------------------------------------------------------------ azar con semilla

    function azar(semilla) {
        var s = (semilla >>> 0) || 1;
        var f = function () {
            s = (s + 0x6d2b79f5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        f.entre = function (a, b) { return a + (b - a) * f(); };
        f.entero = function (a, b) { return Math.floor(a + (b - a + 1) * f()); };
        f.signo = function () { return f() < 0.5 ? -1 : 1; };
        return f;
    }

    function semillaNueva() {
        return (Math.floor(Math.random() * 4294967295) ^ Date.now()) >>> 0;
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function rango(v, def) {
        if (Array.isArray(v)) return [Number(v[0]), Number(v.length > 1 ? v[1] : v[0])];
        if (typeof v === "number") return [v, v];
        return def;
    }

    // ------------------------------------------------------------------ curvas

    /** Catmull-Rom centrípeta muestreada cada `paso` unidades (aprox.). */
    function catmull(ctrl, paso) {
        var out = [];
        for (var i = 0; i < ctrl.length - 3; i++) {
            var p0 = ctrl[i], p1 = ctrl[i + 1], p2 = ctrl[i + 2], p3 = ctrl[i + 3];
            var largo = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            var n = Math.max(2, Math.ceil(largo / (paso * 0.5)));
            for (var k = 0; k < n; k++) {
                var t = k / n, t2 = t * t, t3 = t2 * t;
                out.push({
                    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
                });
            }
        }
        out.push({ x: ctrl[ctrl.length - 2].x, y: ctrl[ctrl.length - 2].y });
        return remuestrear(out, paso);
    }

    /** Puntos a distancia constante `paso`, con s (distancia acumulada). */
    function remuestrear(pts, paso) {
        var out = [{ x: pts[0].x, y: pts[0].y, s: 0 }];
        var falta = paso;
        var s = 0;
        for (var i = 1; i < pts.length; i++) {
            var a = pts[i - 1], b = pts[i];
            var d = Math.hypot(b.x - a.x, b.y - a.y);
            var u = 0;
            while (d - u >= falta) {
                u += falta;
                s += falta;
                var k = u / d;
                out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: s });
                falta = paso;
            }
            falta -= (d - u);
        }
        var ult = pts[pts.length - 1];
        var p = out[out.length - 1];
        var dd = Math.hypot(ult.x - p.x, ult.y - p.y);
        if (dd > 0.5) out.push({ x: ult.x, y: ult.y, s: p.s + dd });
        return out;
    }

    function recta(a, b, paso) {
        return remuestrear([a, b], paso);
    }

    /** Une tramos (el primer punto de cada tramo siguiente coincide con el último del anterior). */
    function unir(tramos, paso) {
        var todo = [];
        tramos.forEach(function (t, k) {
            (k === 0 ? t : t.slice(1)).forEach(function (p) { todo.push({ x: p.x, y: p.y }); });
        });
        return remuestrear(todo, paso);
    }

    // ------------------------------------------------------------------ geometría

    /** Punto más cercano de una polilínea: { x, y, d, s, i } (s = distancia recorrida en la ruta). */
    function cercano(pts, x, y) {
        var mejor = { d: Infinity, x: pts[0].x, y: pts[0].y, s: 0, i: 0 };
        for (var i = 0; i < pts.length - 1; i++) {
            var a = pts[i], b = pts[i + 1];
            var vx = b.x - a.x, vy = b.y - a.y;
            var l2 = vx * vx + vy * vy || 1;
            var t = clamp(((x - a.x) * vx + (y - a.y) * vy) / l2, 0, 1);
            var px = a.x + vx * t, py = a.y + vy * t;
            var d = Math.hypot(x - px, y - py);
            if (d < mejor.d) mejor = { d: d, x: px, y: py, s: a.s + (b.s - a.s) * t, i: i };
        }
        return mejor;
    }

    /** El más cercano entre todas las rutas: { x, y, d, s, ruta, frac }. */
    function proyectar(rec, x, y) {
        var mejor = null;
        rec.rutas.forEach(function (r, k) {
            var c = cercano(r.pts, x, y);
            if (!mejor || c.d < mejor.d - 0.01) {
                c.ruta = k;
                c.frac = c.s / r.largo;
                mejor = c;
            }
        });
        return mejor;
    }

    /** Punto a distancia s de una ruta (con ángulo de avance). */
    function puntoEn(ruta, s) {
        var pts = ruta.pts;
        s = clamp(s, 0, ruta.largo);
        var lo = 0, hi = pts.length - 1;
        while (hi - lo > 1) {
            var m = (lo + hi) >> 1;
            if (pts[m].s <= s) lo = m; else hi = m;
        }
        var a = pts[lo], b = pts[hi];
        var k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) };
    }

    function limites(rec, cfg) {
        // "pista" incluye una tolerancia leve: desviarse un poquito no cuenta como salirse
        var tol = cfg && cfg.toleranciaPista != null ? Number(cfg.toleranciaPista) : 0.1;
        var h = rec.ancho / 2 + rec.ancho * tol;
        var holg = (cfg && Number(cfg.holguraFuera)) || 0.5;
        return { pista: h, fuera: h + rec.ancho * holg, bellota: rec.ancho * ((cfg && Number(cfg.radioBellota)) || 0.2) };
    }

    /** Punto más cercano del eje de un obstáculo (cápsula: tronco y rama son alargados; los demás, círculos). */
    function ejeCercano(o, x, y) {
        if (!o.semi) return { x: o.x, y: o.y };
        var t = clamp((x - o.x) * o.ux + (y - o.y) * o.uy, -o.semi, o.semi);
        return { x: o.x + o.ux * t, y: o.y + o.uy * t };
    }

    /** Distancia del punto al borde del obstáculo (negativa si está dentro). */
    function distObstaculo(o, x, y) {
        var c = ejeCercano(o, x, y);
        return Math.hypot(x - c.x, y - c.y) - o.r;
    }

    /** ¿El segmento de a a b pasa por dentro del obstáculo (engordado con el radio de la bellota)? */
    function lineaCruza(o, a, b, radioB) {
        var lim = o.r + radioB - 1;
        for (var i = 1; i <= 16; i++) {
            var t = i / 16;
            var x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
            var c = ejeCercano(o, x, y);
            if (Math.hypot(x - c.x, y - c.y) < lim) return true;
        }
        return false;
    }

    /** Saca el punto de dentro de los obstáculos (resbala alrededor). Devuelve el índice del obstáculo tocado. */
    function empujarFuera(rec, p, radioB) {
        var toco = -1;
        for (var vuelta = 0; vuelta < 2; vuelta++) {
            for (var i = 0; i < rec.obstaculos.length; i++) {
                var o = rec.obstaculos[i];
                var c = ejeCercano(o, p.x, p.y);
                var dx = p.x - c.x, dy = p.y - c.y;
                var d = Math.hypot(dx, dy);
                var min = o.r + radioB;
                if (d < min) {
                    if (d < 0.001) { dx = -o.nx; dy = -o.ny; d = 1; }   // justo en el eje: hacia el paso libre
                    p.x = c.x + dx / d * min;
                    p.y = c.y + dy / d * min;
                    toco = i;
                }
            }
        }
        return toco;
    }

    /**
     * Mueve la bellota desde (pil.x, pil.y) hacia `objetivo` (como mucho `maxPaso` unidades), en pasitos para no
     * atravesar obstáculos. Devuelve { x, y, zona, proy, obstaculo, cerca }:
     *   zona: "pista" (dentro del camino) · "fuera" (salida leve permitida) · "limite" (topó el borde de la holgura)
     *   obstaculo: índice del obstáculo que está tocando (o -1) · cerca: índice del obstáculo próximo (o -1)
     */
    function mover(rec, pil, objetivo, maxPaso, cfg) {
        var lim = limites(rec, cfg);
        var dx = objetivo.x - pil.x, dy = objetivo.y - pil.y;
        var dist = Math.hypot(dx, dy);
        if (dist > maxPaso) {
            dx *= maxPaso / dist;
            dy *= maxPaso / dist;
            dist = maxPaso;
        }
        var n = Math.max(1, Math.ceil(dist / (rec.ancho * 0.12)));
        var p = { x: pil.x, y: pil.y };
        var toco = -1, zona = "pista", proy = null;
        for (var k = 0; k < n; k++) {
            var sx = dx / n, sy = dy / n;
            // contra un obstáculo la bellota no lo rodea sola: si la línea hasta el dedo lo atraviesa, se queda
            // apoyada (puede retroceder). Para rodearlo hay que llevar el dedo hacia un costado.
            for (var q = 0; q < rec.obstaculos.length; q++) {
                var ob = rec.obstaculos[q];
                var cx = ejeCercano(ob, p.x + sx, p.y + sy);
                if (Math.hypot(p.x + sx - cx.x, p.y + sy - cx.y) >= ob.r + lim.bellota) continue;
                toco = q;
                var c0 = ejeCercano(ob, p.x, p.y);
                var hacia = sx * (p.x - c0.x) + sy * (p.y - c0.y);
                if (hacia < 0 && lineaCruza(ob, p, objetivo, lim.bellota)) {
                    sx = 0;
                    sy = 0;
                }
            }
            p.x += sx;
            p.y += sy;
            proy = proyectar(rec, p.x, p.y);
            if (proy.d > lim.fuera) {
                var e = lim.fuera / proy.d;
                p.x = proy.x + (p.x - proy.x) * e;
                p.y = proy.y + (p.y - proy.y) * e;
            }
            var t = empujarFuera(rec, p, lim.bellota);
            if (t >= 0) toco = t;
        }
        proy = proyectar(rec, p.x, p.y);
        if (proy.d > lim.fuera + 0.5) zona = "limite";
        else if (proy.d > lim.fuera - 1) zona = "limite";
        else if (proy.d > lim.pista) zona = "fuera";
        var cerca = -1;
        var dCerca = Infinity;
        rec.obstaculos.forEach(function (o, i) {
            var d = distObstaculo(o, p.x, p.y) - lim.bellota;
            if (d < rec.ancho * 0.45 && d < dCerca) { dCerca = d; cerca = i; }
        });
        return { x: p.x, y: p.y, zona: zona, proy: proy, obstaculo: toco, cerca: cerca };
    }

    /** 0 dentro del camino → 1 en el borde de la holgura (para el rojo progresivo). */
    function salida(rec, d, cfg) {
        var lim = limites(rec, cfg);
        return clamp((d - lim.pista) / (lim.fuera - lim.pista), 0, 1);
    }

    function enMeta(rec, x, y) {
        return Math.hypot(x - rec.meta.x, y - rec.meta.y) <= rec.ancho * 0.6;
    }

    // ------------------------------------------------------------------ generador

    // r: radio (grosor) en anchos de camino; semi: medio largo del eje (tronco y rama son alargados y se acuestan
    // a lo largo del camino, dejando un paso libre a un lado)
    var TIPOS = {
        tronco: { r: 0.21, semi: 0.3 },
        tronquito: { r: 0.22, semi: 0 },
        piedra: { r: 0.21, semi: 0 },
        rama: { r: 0.15, semi: 0.26 },
        hongos: { r: 0.2, semi: 0 },
        arbusto: { r: 0.22, semi: 0 }
    };

    /** Mayor cambio de rumbo (radianes) entre los tramos de `v` puntos antes y después de cada punto. */
    function giroMaximo(pts, v) {
        var max = 0;
        for (var j = v; j < pts.length - v; j += 2) {
            var a1 = Math.atan2(pts[j].y - pts[j - v].y, pts[j].x - pts[j - v].x);
            var a2 = Math.atan2(pts[j + v].y - pts[j].y, pts[j + v].x - pts[j].x);
            var d = Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
            if (d > max) max = d;
        }
        return max;
    }

    /** Separación mínima entre los ejes de dos rutas en el tramo medio (sin contar la bifurcación). */
    function separacionMinima(a, b, desde, hasta) {
        var min = Infinity;
        for (var i = 0; i < a.pts.length; i += 2) {
            var p = a.pts[i];
            if (p.s < desde || p.s > a.largo - hasta) continue;
            var c = cercano(b.pts, p.x, p.y);
            if (c.d < min) min = c.d;
        }
        return min;
    }

    /**
     * Simula a un niño que lleva la bellota por el centro de la ruta k (con el mismo arrastre del juego): debe
     * llegar a la cesta, sin salirse del camino y sin quedarse trabada en un obstáculo.
     */
    /**
     * Cuánto apartarse del centro de la ruta k en el punto s para rodear sus obstáculos por el lado libre (en
     * unidades del mundo, positivo = a la izquierda de la marcha). Lo usan la demo y la simulación.
     */
    function desvioRodear(rec, k, s, cfg) {
        var lim = limites(rec, cfg);
        var w = rec.ancho;
        var total = 0;
        rec.obstaculos.forEach(function (o) {
            if (o.ruta !== k) return;
            var pico = o.r + lim.bellota - (o.off || 0) + w * 0.08;
            var meseta = (o.semi || 0) + o.r + lim.bellota;
            var rampa = w * 1.3;
            var d = Math.abs(s - o.s);
            var f = d <= meseta ? 1 : (d >= meseta + rampa ? 0 : 0.5 + 0.5 * Math.cos((d - meseta) / rampa * Math.PI));
            total += o.lado * pico * f;
        });
        return total;
    }

    function simularRuta(rec, k, cfg) {
        var ruta = rec.rutas[k];
        var pil = { x: rec.inicio.x, y: rec.inicio.y };
        var paso = rec.ancho * 0.1;
        for (var s = paso; s <= ruta.largo + paso; s += paso) {
            var c = puntoEn(ruta, Math.min(s, ruta.largo));
            var lat = desvioRodear(rec, k, Math.min(s, ruta.largo), cfg);
            var obj = { x: c.x + Math.sin(c.ang) * lat, y: c.y - Math.cos(c.ang) * lat };
            var res = null;
            for (var n = 0; n < 4; n++) {
                res = mover(rec, pil, obj, paso * 1.5, cfg);
                pil.x = res.x;
                pil.y = res.y;
            }
            if (res.zona !== "pista") return false;
            // trabada: quedó muy atrás del dedo
            if (Math.hypot(pil.x - obj.x, pil.y - obj.y) > rec.ancho * 0.9) return false;
        }
        return enMeta(rec, pil.x, pil.y);
    }

    /**
     * Genera un recorrido. def (de config.recorridos): ancho, tramo (fracción del ancho útil), ondas (curvas
     * extra en el tramo medio), amplitud (en anchos), obstaculos [min, max], tipos [...].
     * dims: { W, H } del mundo. Devuelve null si no logra uno válido con esa semilla.
     */
    function generarRecorrido(def, dims, semilla, opciones) {
        var r = azar(semilla);
        var W = dims.W, H = dims.H;
        var razones = (opciones && opciones.razones) || {};
        var falla = function (k) { razones[k] = (razones[k] || 0) + 1; return null; };
        var paso = (opciones && opciones.paso) || 8;
        var w = Number(def.ancho) || 130;
        var m = Math.max(40, w * 0.35);
        var arriba = m + w * 1.3;             // espacio para "¡Meta!", la cerca y los árboles de arriba (el camino baja)
        var abajo = H - m - w * 0.75;
        var hUtil = abajo - arriba;
        // eje horizontal: la ardilla (izquierda) y la cesta (derecha) dejan su sitio
        var xIni0 = m + w * 1.55;           // lo justo para la ardilla
        var xMeta1 = W - m - w * 1.2;       // lo justo para la cesta
        var frac = clamp(Number(def.tramo) || 1, 0.4, 1);
        if (W < 1400) frac = Math.min(1, frac + 0.3);   // tableta vertical: mundo angosto, el tramo ocupa todo
        var span = (xMeta1 - xIni0) * frac;
        var corrido = r.entre(-0.5, 0.5) * ((xMeta1 - xIni0) - span) * 0.6;
        var xIni = xIni0 + ((xMeta1 - xIni0) - span) / 2 + corrido;
        var xMeta = xIni + span;
        var yIni = clamp((arriba + abajo) / 2 + r.entre(-0.12, 0.12) * hUtil, arriba + hUtil * 0.3, abajo - hUtil * 0.3);
        var yMeta = clamp((arriba + abajo) / 2 + r.entre(-0.12, 0.12) * hUtil, arriba + hUtil * 0.3, abajo - hUtil * 0.3);
        var tronco = w * r.entre(0.7, 0.95);
        var S = { x: xIni + tronco, y: yIni };
        var J = { x: xMeta - tronco, y: yMeta };
        if (J.x - S.x < w * 2.6) return falla("corto");
        var esc = clamp(H / 860, 0.9, 1.5);
        var amp = rango(def.amplitud, [0.2, 0.3]);
        var ondas = rango(def.ondas, [1, 1]);
        var nOnd = r.entero(ondas[0], ondas[1]);
        // avance horizontal entre puntos de control: limita cuánto puede subir o bajar el camino (curvas suaves
        // también en la tableta vertical, donde el mundo es angosto y alto)
        var dxw = (J.x - S.x) / (nOnd + 2);
        var a = Math.min(r.entre(amp[0], amp[1]) * w * esc, dxw * 0.42);
        // carriles: arriba y abajo de la línea media, con espacio suficiente entre ellos
        var sepMin = w * 2.05 + 2 * a;
        var sepMax = Math.min(hUtil - 2 * a, w * 3.4 * esc + 2 * a, 2 * a + dxw * 1.25 + w * 0.9);
        if (sepMax < sepMin) return falla("alto");
        var sep = r.entre(sepMin, sepMax);
        var rutas = [];
        [-1, 1].forEach(function (lado) {
            var ctrl = [{ x: S.x - w, y: S.y }, S];
            var n = nOnd + 1;
            var fase = r() * Math.PI * 2;
            for (var k = 1; k <= n; k++) {
                var u = k / (n + 1);
                var base = S.y + (J.y - S.y) * u + lado * sep / 2;
                // las curvas extra van en direcciones distintas (vaivén), más marcadas en el centro
                var vaiven = Math.sin(fase + k * Math.PI * r.entre(0.75, 1.1)) * a;
                var y = base + vaiven;
                ctrl.push({ x: S.x + (J.x - S.x) * u + r.entre(-0.08, 0.08) * (J.x - S.x) / (n + 1), y: y });
            }
            ctrl.push(J, { x: J.x + w, y: J.y });
            var medio = catmull(ctrl, paso);
            var pts = unir([recta({ x: xIni, y: yIni }, S, paso), medio, recta(J, { x: xMeta, y: yMeta }, paso)], paso);
            rutas.push({ pts: pts, largo: pts[pts.length - 1].s, lado: lado, conObstaculos: false });
        });
        // dentro del área y sin tocarse en el tramo medio
        for (var q = 0; q < rutas.length; q++) {
            for (var i = 0; i < rutas[q].pts.length; i++) {
                var p = rutas[q].pts[i];
                if (p.y < arriba - w * 0.15 || p.y > abajo + w * 0.15 || p.x < m || p.x > W - m) return falla("afuera");
            }
        }
        // curvas suaves: el rumbo no cambia más de ~60° en un tramo de 12 pasos
        for (var q2 = 0; q2 < rutas.length; q2++) {
            if (giroMaximo(rutas[q2].pts, 6) > (Number(def.giroMax) || 1.05)) return falla("curva");
        }
        if (separacionMinima(rutas[0], rutas[1], tronco + w * 2, tronco + w * 2) < w * 1.75) return falla("juntas");
        // obstáculos en una de las dos rutas (al azar)
        var conObs = r() < 0.5 ? 0 : 1;
        var ruta = rutas[conObs];
        var otra = rutas[1 - conObs];
        ruta.conObstaculos = true;
        var cuantos = rango(def.obstaculos, [1, 1]);
        var nObs = r.entero(cuantos[0], cuantos[1]);
        var tipos = (def.tipos && def.tipos.length) ? def.tipos : ["tronco"];
        var obstaculos = [];
        var sMin = tronco + w * 0.9, sMax = ruta.largo - tronco - w * 0.9;
        var libre = sMax - sMin;
        if (libre < w * 1.6 * nObs) return falla("sinSitio");
        for (var o = 0; o < nObs; o++) {
            var colocado = false;
            for (var intento = 0; intento < 40 && !colocado; intento++) {
                // repartidos a lo largo del tramo medio, cada uno en su porción
                var s = sMin + libre * (o + r.entre(0.25, 0.75)) / nObs;
                var pc = puntoEn(ruta, s);
                var nx = -Math.sin(pc.ang), ny = Math.cos(pc.ang);
                var tipo = tipos[(o + r.entero(0, tipos.length - 1)) % tipos.length];
                var defT = TIPOS[tipo] || TIPOS.piedra;
                var rad = defT.r * w;
                var semi = (defT.semi || 0) * w;
                // acostado a lo largo del camino, sin quedar de cabeza (ángulo entre -90° y 90°)
                var rot = Math.atan2(Math.sin(pc.ang), Math.cos(pc.ang));
                if (rot > Math.PI / 2) rot -= Math.PI;
                if (rot < -Math.PI / 2) rot += Math.PI;
                var ladoO = r.signo();
                var off = w * r.entre(0.02, 0.07);   // cerca del centro: hay que rodearlo a propósito
                var ox = pc.x + nx * ladoO * off, oy = pc.y + ny * ladoO * off;
                var valido = true;
                // lejos de la entrada, la salida, la cesta y la otra ruta; separados entre sí
                if (Math.hypot(ox - xIni, oy - yIni) < w * 1.7 || Math.hypot(ox - xMeta, oy - yMeta) < w * 1.9) valido = false;
                if (Math.hypot(ox - S.x, oy - S.y) < w * 1.05 || Math.hypot(ox - J.x, oy - J.y) < w * 1.05) valido = false;
                if (cercano(otra.pts, ox, oy).d < w * 1.15 + rad + semi) valido = false;
                obstaculos.forEach(function (q2) { if (Math.hypot(q2.x - ox, q2.y - oy) < w * 1.7 + semi + (q2.semi || 0)) valido = false; });
                if (!valido) continue;
                obstaculos.push({
                    x: ox, y: oy, r: rad, semi: semi, off: off, ux: Math.cos(rot), uy: Math.sin(rot), rot: rot,
                    tipo: tipo, s: s, lado: ladoO,
                    nx: nx * ladoO, ny: ny * ladoO,       // hacia dónde se apoya (el paso libre es el lado contrario)
                    ang: pc.ang, ruta: conObs
                });
                colocado = true;
            }
            if (!colocado) return falla("obstaculo");
        }
        var rec = {
            id: def.id, semilla: semilla, W: W, H: H, ancho: w, paso: paso,
            inicio: { x: xIni, y: yIni }, meta: { x: xMeta, y: yMeta },
            bifurcacion: S, union: J, tronco: tronco,
            rutas: rutas, obstaculos: obstaculos, conObstaculos: conObs,
            area: { arriba: arriba, abajo: abajo, m: m }
        };
        // nunca imposible: una bellota que sigue el centro de cada ruta debe llegar a la cesta sin salirse
        for (var k = 0; k < rutas.length; k++) {
            if (!simularRuta(rec, k, opciones && opciones.cfg)) return falla("bloqueo");
        }
        return rec;
    }

    /** Intenta varias semillas y, si no alcanza, suaviza (menos curvas, menos amplitud, menos obstáculos). */
    function generarSeguro(def, dims, semilla, opciones) {
        var r = azar(semilla);
        var variantes = [
            def,
            Object.assign({}, def, { amplitud: [rango(def.amplitud, [0.2, 0.3])[0] * 0.7, rango(def.amplitud, [0.2, 0.3])[0]] }),
            Object.assign({}, def, { amplitud: [0.1, 0.2], ondas: [Math.max(0, rango(def.ondas, [1, 1])[0] - 1), rango(def.ondas, [1, 1])[0]] }),
            Object.assign({}, def, { amplitud: [0.05, 0.1], ondas: [0, 1], tramo: Math.min(1, (Number(def.tramo) || 1) + 0.15), obstaculos: [Math.max(1, rango(def.obstaculos, [1, 1])[0] - 1), rango(def.obstaculos, [1, 1])[0]] }),
            Object.assign({}, def, { amplitud: [0, 0.05], ondas: [0, 0], tramo: 1, ancho: (Number(def.ancho) || 130) * 0.9, obstaculos: [1, 1] })
        ];
        for (var v = 0; v < variantes.length; v++) {
            for (var i = 0; i < 60; i++) {
                var rec = generarRecorrido(variantes[v], dims, (r() * 4294967295) >>> 0, opciones);
                if (rec) {
                    rec.variante = v;
                    return rec;
                }
            }
        }
        return null;
    }

    /** Cuatro recorridos de una partida, de config.recorridos. */
    function generarPartida(config, dims, semilla, opciones) {
        var s = semilla == null ? semillaNueva() : semilla;
        var r = azar(s);
        var recorridos = (config.recorridos || []).map(function (def) {
            return generarSeguro(def, dims, (r() * 4294967295) >>> 0, opciones);
        });
        return { semilla: s, recorridos: recorridos };
    }

    var api = {
        azar: azar,
        semillaNueva: semillaNueva,
        generarRecorrido: generarRecorrido,
        generarSeguro: generarSeguro,
        generarPartida: generarPartida,
        cercano: cercano,
        giroMaximo: giroMaximo,
        proyectar: proyectar,
        puntoEn: puntoEn,
        limites: limites,
        mover: mover,
        distObstaculo: distObstaculo,
        simularRuta: simularRuta,
        desvioRodear: desvioRodear,
        salida: salida,
        enMeta: enMeta,
        TIPOS: TIPOS
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (global) global.ReglasArdilla = api;
})(typeof window !== "undefined" ? window : null);
