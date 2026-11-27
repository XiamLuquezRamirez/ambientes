/**
 * ReglasArquero — decisiones puras de "El Arquero de las Estrellas" (window.ReglasArquero, exportable a Node).
 *
 * No dibuja ni toca el DOM. La escena y las pruebas usan EXACTAMENTE estas funciones para:
 *   - la tensión del arco (proyección del arrastre sobre la dirección contraria al tiro, con tope);
 *   - la fuerza → velocidad inicial de la flecha;
 *   - el vuelo de la flecha (tiro parabólico con gravedad: la línea predictiva y el vuelo real son la misma fórmula);
 *   - el movimiento de la diana (vaivén vertical suave, con variación de velocidad continua);
 *   - el impacto (la flecha cruza el plano de la diana: se compara su altura con la de la diana EN ESE INSTANTE);
 *   - el anillo alcanzado (distancia al centro / radio → 50, 30 o 10 puntos; la rotación no influye);
 *   - la generación y validación de los niveles (la diana siempre visible y alcanzable).
 *
 * Coordenadas del mundo de diseño: 1600 × 900, y crece hacia abajo.
 */
(function (global) {
    "use strict";

    var DEG = Math.PI / 180;

    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
    function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function rango(v, d) { return Array.isArray(v) && v.length >= 2 ? [num(v[0], d[0]), num(v[1], d[1])] : (v != null && isFinite(Number(v)) ? [Number(v), Number(v)] : d); }
    function azar(rnd, r) { return r[0] + (r[1] - r[0]) * rnd(); }
    function barajar(l, rnd) {
        var a = l.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var k = Math.floor(rnd() * (i + 1));
            var t = a[i]; a[i] = a[k]; a[k] = t;
        }
        return a;
    }

    // ------------------------------------------------------------------ el arco

    /**
     * Geometría del arco para un nivel. La orientación sale del nivel (o del juego): si cambia, la dirección de
     * tensión cambia con ella (siempre es la contraria a la del tiro).
     */
    function arco(j, ronda) {
        j = j || {};
        var ang = num(ronda && ronda.angulo, num(j.angulo, 35)) * DEG;
        var dir = { x: Math.cos(ang), y: -Math.sin(ang) };
        var emp = { x: num(j.arcoX, 470), y: num(j.arcoY, 640) };
        var atras = num(j.cuerdaAtras, 30);
        return {
            angulo: ang,
            dir: dir,
            empunadura: emp,
            cuerda: { x: emp.x - dir.x * atras, y: emp.y - dir.y * atras },
            largoFlecha: num(j.largoFlecha, 150),
            tironMax: num(j.tironMax, 170),
            tensionMin: num(j.tensionMin, 0.12),
            zonaToque: num(j.zonaToque, 165),
            vMin: num(j.velMin, 380),
            vMax: num(j.velMax, 1320),
            g: num(j.gravedad, 760),
            suelo: num(j.suelo, 800)
        };
    }

    /**
     * Tensión a partir de un arrastre (desde donde empezó el toque hasta donde está el dedo). Solo cuenta la parte
     * del arrastre que va HACIA ATRÁS (contraria al tiro); hacia adelante o de lado no tensa. Tope en tironMax.
     */
    function tension(A, dx, dy) {
        var atras = -(dx * A.dir.x + dy * A.dir.y);
        var tiron = limitar(atras, 0, A.tironMax);
        return { tiron: tiron, T: tiron / A.tironMax, alTope: atras >= A.tironMax - 0.5 };
    }

    /** Tres zonas visuales de la fuerza. */
    function zona(T) { return T < 0.4 ? "suave" : (T < 0.75 ? "media" : "potente"); }

    /** Velocidad inicial (px/s) según la tensión 0..1. */
    function velocidad(A, T) { return A.vMin + (A.vMax - A.vMin) * limitar(T, 0, 1); }

    /** Punto de la cuerda (donde se apoya la flecha) con un tirón dado. */
    function cuerdaEn(A, tiron) { return { x: A.cuerda.x - A.dir.x * tiron, y: A.cuerda.y - A.dir.y * tiron }; }

    /** Punta de la flecha apoyada en la cuerda. */
    function puntaEn(A, tiron) {
        var c = cuerdaEn(A, tiron);
        return { x: c.x + A.dir.x * A.largoFlecha, y: c.y + A.dir.y * A.largoFlecha };
    }

    /** Condiciones iniciales del disparo: sale de la punta de la flecha tal como está en la cuerda tensada. */
    function lanzamiento(A, T) {
        var p = puntaEn(A, limitar(T, 0, 1) * A.tironMax);
        var v = velocidad(A, T);
        return { x0: p.x, y0: p.y, vx: A.dir.x * v, vy: A.dir.y * v, g: A.g, T: T };
    }

    /** Posición y velocidad de la punta de la flecha a los t segundos de vuelo (tiro parabólico). */
    function posicion(L, t) {
        return { x: L.x0 + L.vx * t, y: L.y0 + L.vy * t + 0.5 * L.g * t * t, vx: L.vx, vy: L.vy + L.g * t };
    }

    /** Dónde (altura) y cuándo cruza la flecha la vertical x. null si nunca llega. */
    function cruce(L, x) {
        if (!(L.vx > 0) || x < L.x0) return null;
        var t = (x - L.x0) / L.vx;
        return { t: t, y: posicion(L, t).y };
    }

    /** Instante en que la flecha toca el suelo (y = suelo, bajando). */
    function tiempoSuelo(L, suelo) {
        var a = 0.5 * L.g, b = L.vy, c = L.y0 - suelo;
        var disc = b * b - 4 * a * c;
        if (disc < 0) return Infinity;
        return (-b + Math.sqrt(disc)) / (2 * a);
    }

    /**
     * Puntos de la trayectoria (los mismos que recorrerá la flecha) cada dt segundos hasta xFin, el suelo o el
     * borde. Devuelve { puntos, llegada } (llegada = cruce con xMeta si ocurre antes de tocar el suelo).
     */
    function trayectoria(L, o) {
        o = o || {};
        var dt = o.dt || 0.03, xFin = o.xFin != null ? o.xFin : 1700, suelo = o.suelo != null ? o.suelo : 800;
        var tSuelo = tiempoSuelo(L, suelo);
        var pts = [];
        for (var t = 0; t <= 6; t += dt) {
            if (t > tSuelo) break;
            var p = posicion(L, t);
            if (p.x > xFin || p.y < -300) break;
            pts.push({ x: p.x, y: p.y, t: t });
        }
        var llegada = null;
        if (o.xMeta != null) {
            var c = cruce(L, o.xMeta);
            if (c && c.t <= tSuelo) llegada = { x: o.xMeta, y: c.y, t: c.t };
        }
        return { puntos: pts, llegada: llegada, tSuelo: tSuelo };
    }

    /** Altura a la que llega la flecha a la vertical x con la tensión T (Infinity si cae antes al suelo). */
    function alturaLlegada(A, T, x) {
        var L = lanzamiento(A, T);
        var c = cruce(L, x);
        if (!c || c.t > tiempoSuelo(L, A.suelo)) return Infinity;
        return c.y;
    }

    /**
     * Tensión necesaria para llegar a la vertical x a la altura y (búsqueda binaria: más tensión → llega más arriba).
     * null si ni con la tensión máxima llega tan arriba.
     */
    function tensionPara(A, x, y) {
        if (alturaLlegada(A, 1, x) > y) return null;
        if (alturaLlegada(A, 0, x) <= y) return 0;
        var a = 0, b = 1;
        for (var i = 0; i < 40; i++) {
            var m = (a + b) / 2;
            if (alturaLlegada(A, m, x) > y) a = m; else b = m;
        }
        return b;
    }

    // ------------------------------------------------------------------ la diana

    /**
     * Fase del vaivén vertical a los t segundos: velocidad angular w·(1 + var·sen(2πt/P)) integrada (sin saltos).
     */
    function fase(s, t) {
        var k = s.variacion ? s.w * s.variacion * s.periodoVar / (2 * Math.PI) : 0;
        return s.fase0 + s.w * t + k * (1 - Math.cos(2 * Math.PI * t / s.periodoVar));
    }

    /** Altura del centro de la diana a los t segundos de la situación. */
    function dianaY(s, t) { return s.centro + s.amp * Math.sin(fase(s, t)); }

    /** Velocidad vertical de la diana (px/s; positiva = baja). */
    function dianaVy(s, t) {
        var w = s.w * (1 + (s.variacion || 0) * Math.sin(2 * Math.PI * t / s.periodoVar));
        return s.amp * Math.cos(fase(s, t)) * w;
    }

    /** Velocidad vertical máxima posible de la situación. */
    function dianaVyMax(s) { return s.amp * s.w * (1 + (s.variacion || 0)); }

    /** Anillo según la distancia al centro (fracciones del radio: centro, medio, exterior). */
    function anillo(d, R, radios) {
        var r = radios || [0.3, 0.64, 1];
        var u = Math.abs(d) / R;
        if (u <= r[0]) return 50;
        if (u <= r[1]) return 30;
        if (u <= r[2]) return 10;
        return 0;
    }

    /**
     * ¿La punta cruzó en este cuadro la vertical de la diana? p0/p1: punta antes y después; yD0/yD1: centro de la
     * diana antes y después (se interpola al instante del cruce, con la diana en movimiento).
     */
    function cruceDiana(p0, p1, x, yD0, yD1, R) {
        if (!(p0.x < x && p1.x >= x)) return null;
        var u = (x - p0.x) / (p1.x - p0.x);
        var y = p0.y + (p1.y - p0.y) * u;
        var yd = yD0 + (yD1 - yD0) * u;
        var dy = y - yd;
        return { u: u, y: y, yDiana: yd, dy: dy, dentro: Math.abs(dy) <= R };
    }

    /**
     * Consejo amable tras un fallo: "mas" (la flecha llegó por debajo de todo el recorrido o cayó antes),
     * "menos" (pasó por encima de todo el recorrido) o "momento" (la fuerza servía: era cuestión de esperar).
     */
    function consejo(llegadaY, s) {
        if (llegadaY == null || !isFinite(llegadaY)) return "mas";
        if (llegadaY > s.centro + s.amp + s.R * 0.4) return "mas";
        if (llegadaY < s.centro - s.amp - s.R * 0.4) return "menos";
        return "momento";
    }

    // ------------------------------------------------------------------ niveles

    /** Límites de lo visible para la diana (con su radio). */
    function campo(j) {
        j = j || {};
        return { arriba: num(j.dianaArriba, 175), abajo: num(j.dianaAbajo, 775) };
    }

    /** Banda de alturas que la flecha puede alcanzar en la vertical x (con tensiones cómodas). */
    function alcance(A, x, j) {
        var tAlta = num(j && j.tensionAlta, 0.94), tBaja = num(j && j.tensionBaja, 0.3);
        return { alto: alturaLlegada(A, tAlta, x), bajo: alturaLlegada(A, tBaja, x) };
    }

    /** Intervalo de centros posibles para una diana de radio R y vaivén amp en la vertical x. */
    function centrosPosibles(A, x, R, amp, j) {
        var c = campo(j), al = alcance(A, x, j);
        var lo = Math.max(c.arriba + R + amp, al.alto + amp);
        var hi = Math.min(c.abajo - R - amp, al.bajo - amp);
        return { lo: lo, hi: hi };
    }

    /**
     * Prepara un nivel: una lista de situaciones (dónde está la diana y cómo se mueve). Cada `cambiaCada` aciertos
     * la diana pasa a la siguiente situación (otra distancia u otra altura).
     */
    function prepararNivel(ronda, j, rnd) {
        rnd = rnd || Math.random;
        j = j || {};
        var A = arco(j, ronda);
        var aciertos = Math.max(1, num(ronda.aciertos, 3));
        var cada = Math.max(1, num(ronda.cambiaCada, aciertos));
        var nSit = Math.ceil(aciertos / cada);
        var distancias = Array.isArray(ronda.distancias) ? barajar(ronda.distancias, rnd) : null;
        var R = num(ronda.radio, 110);
        var alturas = barajar([0, 1, 2], rnd);
        var sits = [];
        for (var i = 0; i < nSit; i++) {
            var dx = distancias ? num(distancias[i % distancias.length], 700) : azar(rnd, rango(ronda.distancia, [650, 700]));
            var x = A.empunadura.x + dx;
            var amp = azar(rnd, rango(ronda.amplitud, [60, 60]));
            var per = azar(rnd, rango(ronda.periodo, [6, 6]));
            var s = {
                indice: i,
                dx: Math.round(dx),
                x: Math.round(x),
                R: R,
                amp: amp,
                w: 2 * Math.PI / per,
                periodo: per,
                variacion: azar(rnd, rango(ronda.variacion, [0, 0])),
                periodoVar: azar(rnd, [5.5, 8.5]),
                fase0: rnd() * Math.PI * 2,
                giro: azar(rnd, rango(ronda.giro, [0.4, 0.4])) * (rnd() < 0.5 ? -1 : 1),
                centro: 450
            };
            // la diana tiene que caber y su vaivén quedar dentro de lo que la flecha alcanza; si no, vaivén menor
            var cp = centrosPosibles(A, x, R, s.amp, j);
            var guard = 0;
            while (cp.hi < cp.lo && guard++ < 20) {
                s.amp *= 0.85;
                cp = centrosPosibles(A, x, R, s.amp, j);
            }
            if (cp.hi < cp.lo) {
                s.centro = (cp.lo + cp.hi) / 2;
            } else if (ronda.alturasDistintas) {
                // en el gran nivel cada situación queda a otra altura (abajo, en medio, arriba… al azar)
                var tercio = alturas[i % 3];
                s.centro = cp.lo + (cp.hi - cp.lo) * (tercio + 0.2 + rnd() * 0.6) / 3;
            } else {
                var med = ronda.alturaCentro != null ? limitar(num(ronda.alturaCentro, 0.5), 0, 1) : 0.25 + rnd() * 0.5;
                s.centro = cp.lo + (cp.hi - cp.lo) * med;
            }
            s.centro = Math.round(s.centro);
            s.obstaculos = prepararObstaculos(ronda, A, s, rnd);
            sits.push(s);
        }
        return {
            id: ronda.id,
            aciertos: aciertos,
            cambiaCada: cada,
            situaciones: sits,
            arco: A,
            radios: Array.isArray(j.radios) ? j.radios : [0.3, 0.64, 1],
            prediccion: limitar(num(ronda.prediccion, 1), 0.2, 1),
            marcaLlegada: ronda.marcaLlegada !== false,
            direccion: ronda.direccion !== false
        };
    }

    /**
     * Revisa que cada situación sea justa: visible, alcanzable en todo su recorrido, con vaivén perceptible, sin
     * velocidades excesivas ni giros bruscos. Devuelve la lista de avisos (vacía = nivel válido).
     */
    function validarNivel(nivel, j) {
        j = j || {};
        var avisos = [];
        if (!nivel || !nivel.situaciones || !nivel.situaciones.length) return ["sin situaciones"];
        var A = nivel.arco, c = campo(j), al;
        var vMax = num(j.velDianaMax, 280), giroMax = num(j.giroMax, 2.6), ampMin = num(j.amplitudMin, 30);
        nivel.situaciones.forEach(function (s, i) {
            var pre = "situación " + (i + 1) + ": ";
            if (s.centro - s.amp - s.R < c.arriba - 1) avisos.push(pre + "se sale por arriba");
            if (s.centro + s.amp + s.R > c.abajo + 1) avisos.push(pre + "se sale por abajo");
            if (s.x + s.R > num(j.dianaDerecha, 1370)) avisos.push(pre + "se sale por la derecha (4:3)");
            if (s.x - s.R < A.empunadura.x + 380) avisos.push(pre + "demasiado cerca del arco");
            al = alcance(A, s.x, j);
            if (al.alto > s.centro - s.amp + 1) avisos.push(pre + "la parte alta del recorrido no se alcanza");
            if (al.bajo < s.centro + s.amp - 1) avisos.push(pre + "la parte baja del recorrido pide demasiado poca fuerza");
            if (s.amp < ampMin) avisos.push(pre + "casi no se mueve");
            if (dianaVyMax(s) > vMax) avisos.push(pre + "se mueve demasiado rápido");
            if (Math.abs(s.giro) > giroMax) avisos.push(pre + "gira demasiado rápido");
            if ((s.variacion || 0) > 0.35) avisos.push(pre + "cambios de velocidad bruscos");
            // oportunidad razonable: en algún momento del ciclo el centro pasa por una altura alcanzable
            var T = tensionPara(A, s.x, s.centro);
            if (T == null || T < 0.05) avisos.push(pre + "el centro no tiene una fuerza razonable");
            // obstáculos móviles: entre el arco y la diana, visibles, sin ir rápido y dejando huecos para pasar
            (s.obstaculos || []).forEach(function (o, k) {
                var po = pre + "obstáculo " + (k + 1) + ": ";
                if (o.x < A.empunadura.x + 220) avisos.push(po + "demasiado cerca del arco");
                if (o.x + o.r > s.x - s.R - 50) avisos.push(po + "pegado a la diana");
                if (o.centro - o.amp - o.r < 130 || o.centro + o.amp + o.r > 790) avisos.push(po + "se sale de la arena");
                if (o.amp * 2 * Math.PI / o.periodo > num(j.velObstaculoMax, 240)) avisos.push(po + "se mueve demasiado rápido");
            });
            if (T != null && s.obstaculos && s.obstaculos.length) {
                var libres = 0, n = 60;
                for (var q = 0; q < n; q++) if (libreDeObstaculos(A, T, s.obstaculos, q * 12 / n, s.x)) libres++;
                if (libres / n < num(j.huecoMin, 0.35)) avisos.push(pre + "los obstáculos casi nunca dejan pasar (" + Math.round(libres / n * 100) + " %)");
                if (libres / n > 0.92) avisos.push(pre + "los obstáculos casi nunca estorban");
            }
        });
        return avisos;
    }

    // ------------------------------------------------------------------ obstáculos móviles (niveles 3 y 4)

    /** Altura del obstáculo a los t segundos (vaivén vertical suave). */
    function obstaculoY(o, t) { return o.centro + o.amp * Math.sin(2 * Math.PI * t / o.periodo + o.fase0); }

    /**
     * ¿La punta (de p0 a p1 en este cuadro) toca el obstáculo, que pasó de yo0 a yo1? Se revisa en sub-pasos para no
     * atravesarlo a alta velocidad. Devuelve el punto del choque o null.
     */
    function choqueObstaculo(p0, p1, o, yo0, yo1) {
        for (var k = 0; k <= 6; k++) {
            var u = k / 6;
            var x = p0.x + (p1.x - p0.x) * u, y = p0.y + (p1.y - p0.y) * u;
            var oy = yo0 + (yo1 - yo0) * u;
            var dx = x - o.x, dy = y - oy;
            if (dx * dx + dy * dy <= o.r * o.r) return { u: u, x: x, y: y, yObs: oy };
        }
        return null;
    }

    /** Simula el tiro (tensión T, soltado cuando el reloj de obstáculos marca t0) hasta la diana: ¿pasa sin chocar? */
    function libreDeObstaculos(A, T, obs, t0, xMeta) {
        var L = lanzamiento(A, T), dt = 0.02;
        var c = cruce(L, xMeta);
        var tFin = c ? Math.min(c.t, tiempoSuelo(L, A.suelo)) : tiempoSuelo(L, A.suelo);
        var prev = posicion(L, 0);
        for (var t = dt; t <= tFin + 1e-9; t += dt) {
            var p = posicion(L, t);
            for (var i = 0; i < obs.length; i++) {
                if (choqueObstaculo(prev, p, obs[i], obstaculoY(obs[i], t0 + t - dt), obstaculoY(obs[i], t0 + t))) return false;
            }
            prev = p;
        }
        return true;
    }

    /**
     * Obstáculos de una situación: se colocan SOBRE el camino del tiro al centro de la diana (para que de verdad haya
     * que esperar el hueco) y suben y bajan por encima y por debajo de ese camino.
     */
    function prepararObstaculos(ronda, A, s, rnd) {
        var defs = Array.isArray(ronda.obstaculos) ? ronda.obstaculos : [];
        if (!defs.length) return [];
        var T = tensionPara(A, s.x, s.centro);
        if (T == null) return [];
        var L = lanzamiento(A, T);
        var xFin = s.x - s.R - 70;
        return defs.map(function (d, i) {
            var frac = azar(rnd, rango(d.x, [0.45, 0.45]));
            var x = L.x0 + (xFin - L.x0) * frac;
            var c = cruce(L, x);
            var r = num(d.radio, 38);
            var o = {
                indice: i,
                x: Math.round(x),
                r: r,
                amp: azar(rnd, rango(d.amplitud, [100, 100])),
                periodo: azar(rnd, rango(d.periodo, [3.6, 3.6])),
                fase0: rnd() * Math.PI * 2,
                centro: Math.round((c ? c.y : 450) + azar(rnd, [-25, 25]))
            };
            // que quepa entera en la arena
            o.centro = limitar(o.centro, 130 + o.amp + r, 790 - o.amp - r);
            return o;
        });
    }

    var api = {
        arco: arco,
        tension: tension,
        zona: zona,
        velocidad: velocidad,
        cuerdaEn: cuerdaEn,
        puntaEn: puntaEn,
        lanzamiento: lanzamiento,
        posicion: posicion,
        cruce: cruce,
        tiempoSuelo: tiempoSuelo,
        trayectoria: trayectoria,
        alturaLlegada: alturaLlegada,
        tensionPara: tensionPara,
        fase: fase,
        dianaY: dianaY,
        dianaVy: dianaVy,
        dianaVyMax: dianaVyMax,
        anillo: anillo,
        cruceDiana: cruceDiana,
        consejo: consejo,
        campo: campo,
        alcance: alcance,
        centrosPosibles: centrosPosibles,
        prepararNivel: prepararNivel,
        validarNivel: validarNivel,
        obstaculoY: obstaculoY,
        choqueObstaculo: choqueObstaculo,
        libreDeObstaculos: libreDeObstaculos,
        prepararObstaculos: prepararObstaculos
    };

    global.ReglasArquero = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
