/**
 * ReglasCanon — decisión de "El Cañón Láser y los Meteoritos en Movimiento" (window.ReglasCanon; también se exporta a Node).
 *
 * Sin DOM ni Phaser. Geometría del cañón (pivote fijo, ángulo medido desde la vertical: negativo = izquierda,
 * positivo = derecha, con límites que nunca apuntan hacia abajo ni fuera del campo), la línea de mira (el mismo
 * recorrido rectilíneo que sigue el proyectil real), el movimiento de los meteoritos (pasadas de lado a lado por
 * carriles separados, diagonales suaves y un vaivén pequeño en los niveles altos), la colisión barrida
 * proyectil ↔ meteorito sobre posiciones actualizadas, el consejo amable tras un fallo y el marcador de puntos.
 * Fallar no resta nada.
 */
(function (global) {
    "use strict";

    var W = 1600, H = 900;
    // Lo que se ve siempre, también en 4:3 (ENVELOP recorta los lados): x 230…1370.
    var VISIBLE = { x0: 230, x1: 1370 };
    // Campo útil del proyectil: más allá se apaga.
    var CAMPO = { x0: 90, x1: 1510, y0: 60, y1: 900 };
    var COLORES = ["azul", "naranja", "violeta"];

    /** Generador reproducible (pruebas). */
    function azar(semilla) {
        var s = (Number(semilla) || 1) % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () {
            s = s * 16807 % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
    function entre(rnd, a, b) { return a + rnd() * (b - a); }
    function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function rad(g) { return g * Math.PI / 180; }

    function barajar(lista, rnd) {
        var l = lista.slice();
        for (var i = l.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = l[i]; l[i] = l[j]; l[j] = t;
        }
        return l;
    }

    // ------------------------------------------------------------------ cañón y mira

    /** Geometría fija del cañón (del config.juego). */
    function canon(j) {
        j = j || {};
        return {
            x: num(j.pivoteX, 800),
            y: num(j.pivoteY, 800),
            largo: num(j.largoCanon, 145),
            limite: rad(num(j.limiteGrados, 70))
        };
    }

    function limitarAngulo(a, c) { return limitar(num(a, 0), -c.limite, c.limite); }

    /** Dirección unitaria del ángulo (0 = recto hacia arriba). */
    function direccion(a) { return { x: Math.sin(a), y: -Math.cos(a) }; }

    /** Boca del cañón: de ahí sale el proyectil. */
    function boca(c, a) {
        var d = direccion(a);
        return { x: c.x + d.x * c.largo, y: c.y + d.y * c.largo };
    }

    /** Ángulo que apunta del pivote hacia un punto (sin limitar). */
    function anguloHacia(c, x, y) { return Math.atan2(x - c.x, c.y - y); }

    /**
     * Línea de mira = recorrido real del proyectil: de la boca en línea recta hasta salir del campo útil.
     * Devuelve { x0, y0, x1, y1, largo }.
     */
    function lineaMira(c, a) {
        var b = boca(c, a), d = direccion(a);
        var t = Infinity;
        if (d.y < 0) t = Math.min(t, (CAMPO.y0 - b.y) / d.y);
        if (d.x > 0) t = Math.min(t, (CAMPO.x1 - b.x) / d.x);
        if (d.x < 0) t = Math.min(t, (CAMPO.x0 - b.x) / d.x);
        if (!isFinite(t)) t = 900;
        return { x0: b.x, y0: b.y, x1: b.x + d.x * t, y1: b.y + d.y * t, largo: t };
    }

    /** Proyectil recién disparado. */
    function disparar(c, a, velocidad) {
        var b = boca(c, a), d = direccion(a);
        return { x: b.x, y: b.y, px: b.x, py: b.y, vx: d.x * velocidad, vy: d.y * velocidad, angulo: a, recorrido: 0, vivo: true };
    }

    /** Avanza el proyectil dt ms en línea recta; se apaga al salir del campo útil. */
    function moverProyectil(p, dt) {
        var s = dt / 1000;
        p.px = p.x;
        p.py = p.y;
        p.x += p.vx * s;
        p.y += p.vy * s;
        p.recorrido += Math.sqrt(p.vx * p.vx + p.vy * p.vy) * s;
        if (p.x < CAMPO.x0 || p.x > CAMPO.x1 || p.y < CAMPO.y0) p.vivo = false;   // donde termina la línea de mira
        return p;
    }

    // ------------------------------------------------------------------ meteoritos

    /**
     * Distancia recorrida en la pasada (px) a los t ms. La velocidad cambia con suavidad durante el vuelo:
     * v(t) = vel · (1 + A·sen(2πt/P + F)), con A < 1 (nunca se detiene ni retrocede). Sin A, va a velocidad fija.
     */
    function recorrido(m, t) {
        var A = m.varA || 0;
        if (!A) return t * m.vel / 1000;
        var w = 2 * Math.PI / m.varP;
        return m.vel / 1000 * (t + A / w * (Math.cos(m.varF) - Math.cos(w * t + m.varF)));
    }

    /** Posición en una pasada (t en ms desde que empezó). */
    function posicionPasada(m, t) {
        var u = recorrido(m, t) / m.largo;               // 0..1 a lo largo de la pasada
        var x = m.desdeX + (m.hastaX - m.desdeX) * u;
        var y = m.desdeY + (m.hastaY - m.desdeY) * u;
        if (m.vaiven) y += Math.sin(t / m.vaivenMs * Math.PI * 2 + m.faseV) * m.vaiven;
        return { x: x, y: y, u: u };
    }

    /** Velocidad instantánea (px/s), por diferencias. */
    function velocidadPasada(m, t) {
        var a = posicionPasada(m, t), b = posicionPasada(m, t + 16);
        return { x: (b.x - a.x) / 0.016, y: (b.y - a.y) / 0.016 };
    }

    /**
     * Nueva pasada de un meteorito por su carril: entra por un lado fuera de la vista y sale por el otro.
     * dir: 1 de izquierda a derecha, -1 al revés. La diagonal es suave (inclinación ≤ ronda.diagonal).
     */
    function nuevaPasada(m, dir, ronda, rnd) {
        var carril = m.carril + (num(ronda.alturaVar, 0) ? entre(rnd, -num(ronda.alturaVar, 0), num(ronda.alturaVar, 0)) : 0);
        var diag = num(ronda.diagonal, 0);
        var dy = diag ? entre(rnd, -diag, diag) : 0;
        m.dir = dir;
        m.desdeX = dir > 0 ? 110 : 1490;
        m.hastaX = dir > 0 ? 1490 : 110;
        m.desdeY = carril - dy / 2;
        m.hastaY = carril + dy / 2;
        m.largo = Math.sqrt(Math.pow(m.hastaX - m.desdeX, 2) + Math.pow(m.hastaY - m.desdeY, 2));
        m.vel = entre(rnd, num(ronda.velMin, 70), num(ronda.velMax, 70));
        // cada meteorito acelera y frena a su manera (amplitud, ritmo y fase al azar)
        var va = ronda.variacionVel;
        m.varA = va ? entre(rnd, num(va[0], 0), num(va[1], 0)) : 0;
        m.varP = entre(rnd, 2600, 4600);
        m.varF = entre(rnd, 0, Math.PI * 2);
        m.vaiven = num(ronda.vaiven, 0) ? entre(rnd, num(ronda.vaiven, 0) * 0.5, num(ronda.vaiven, 0)) : 0;
        m.vaivenMs = entre(rnd, 2600, 3600);
        m.faseV = entre(rnd, 0, Math.PI * 2);
        m.t = 0;
        return m;
    }

    /** Tipos de un nivel: dorados primero (los del nivel 1 son todos dorados) y el resto de colores, en orden al azar. */
    function tiposNivel(ronda, rnd) {
        var n = num(ronda.meteoritos, 3);
        var dorados = Math.min(n, num(ronda.dorados, n));
        var lista = [];
        for (var i = 0; i < n; i++) lista.push(i < dorados ? "dorado" : COLORES[(i - dorados + Math.floor(rnd() * 3)) % 3]);
        return barajar(lista, rnd);
    }

    /** Rango de radios del nivel: tamanos = [mínimo, máximo] (una lista más larga también vale: se toman sus extremos). */
    function rangoTamano(ronda) {
        var t = (ronda && ronda.tamanos) || [60];
        return [Math.min.apply(null, t), Math.max.apply(null, t)];
    }

    /**
     * Prepara un nivel: lista de meteoritos (tipo, radio, carril de salida) y la cantidad simultánea.
     * Los carriles quedan separados (ronda.carriles) y por encima de la zona del cañón.
     */
    function prepararNivel(ronda, j, rnd) {
        rnd = rnd || Math.random;
        var c = canon(j);
        var tipos = tiposNivel(ronda, rnd);
        var rango = rangoTamano(ronda);
        var carriles = (ronda.carriles || [260]).slice();
        // cuáles llevan coraza (2 disparos): al azar, pero nunca el primero que sale (primero se aprende el disparo simple)
        var n = tipos.length;
        var conCoraza = Math.min(Math.max(0, n - 1), num(ronda.resistentes, 0));
        var orden = barajar(Array.from({ length: Math.max(0, n - 1) }, function (_, k) { return k + 1; }), rnd).slice(0, conCoraza);
        var meteoritos = tipos.map(function (tipo, i) {
            // tamaño al azar dentro del rango del nivel (el dorado, de la mitad para arriba: siempre se ve bien)
            var r = Math.round(rango[0] + rnd() * (rango[1] - rango[0]));
            if (tipo === "dorado") r = Math.max(r, Math.round((rango[0] + rango[1]) / 2));
            var golpes = orden.indexOf(i) >= 0 ? 2 : 1;
            var base = tipo === "dorado" ? num(j.puntosDorado, 100) : num(j.puntosNormal, 50);
            return { id: "m" + (i + 1), tipo: tipo, radio: r, golpes: golpes, puntos: base + (golpes > 1 ? num(j.puntosExtraCoraza, 50) : 0) };
        });
        return {
            id: ronda.id,
            tema: ronda.tema || "nebulosa",
            simultaneos: Math.max(1, Math.min(carriles.length, num(ronda.simultaneos, 1))),
            carriles: barajar(carriles, rnd),
            meteoritos: meteoritos,
            velProyectil: num(ronda.velProyectil, 1300),
            recargaMs: num(ronda.recargaMs, 700),
            tolerancia: num(ronda.tolerancia, 1.2),
            miraAlfa: num(ronda.miraAlfa, 1),
            ronda: ronda,
            canon: c,
            dirInicial: rnd() < 0.5 ? 1 : -1
        };
    }

    /**
     * Comprueba que un nivel se pueda jugar: carriles dentro del campo, lejos del cañón y separados; en cada pasada
     * posible (a las velocidades extremas, con la diagonal y el vaivén máximos) el meteorito se puede alcanzar con un
     * ángulo permitido durante buena parte de su paso por la zona visible.
     */
    function validarNivel(nv) {
        var avisos = [];
        var r = nv.ronda || {};
        var c = nv.canon;
        var carr = nv.carriles.slice().sort(function (a, b) { return a - b; });
        var rmax = rangoTamano(r)[1];
        nv.meteoritos.forEach(function (m) { rmax = Math.max(rmax, m.radio); });
        carr.forEach(function (y, i) {
            var mueve = num(r.diagonal, 0) / 2 + num(r.vaiven, 0) + num(r.alturaVar, 0);
            if (y - mueve - rmax < 100) avisos.push("carril " + y + " toca el borde de arriba");
            if (y + mueve + rmax > c.y - c.largo - 20) avisos.push("carril " + y + " baja hasta el cañón");
            // dos meteoritos en carriles vecinos nunca se tocan, aunque se inclinen uno hacia el otro
            if (i && nv.simultaneos > 1 && y - carr[i - 1] < 2 * rmax + 4 + 2 * mueve) avisos.push("carriles " + carr[i - 1] + " y " + y + " muy juntos");
        });
        if (nv.meteoritos.length < 1) avisos.push("sin meteoritos");
        // alcanzable: con la velocidad más alta, la intercepción cae dentro de los límites del cañón un buen rato
        var velMax = num(r.velMax, 70), diag = num(r.diagonal, 0), vai = num(r.vaiven, 0);
        carr.forEach(function (y0) {
          [-num(r.alturaVar, 0), num(r.alturaVar, 0)].forEach(function (dv) {
            var y = y0 + dv;
            [-1, 1].forEach(function (dir) {
                [-diag, diag].forEach(function (dy) {
                    var vA = r.variacionVel ? num(r.variacionVel[1], 0) : 0;
                    var m = { carril: y, dir: dir, desdeX: dir > 0 ? 110 : 1490, hastaX: dir > 0 ? 1490 : 110, desdeY: y - dy / 2, hastaY: y + dy / 2, vel: velMax, vaiven: vai, vaivenMs: 2600, faseV: 0, varA: vA, varP: 2600, varF: dir > 0 ? 0 : Math.PI };
                    m.largo = Math.sqrt(Math.pow(m.hastaX - m.desdeX, 2) + Math.pow(dy, 2));
                    if (vA >= 0.95) avisos.push("variación de velocidad demasiado grande");
                    var enVista = 0, alcanzable = 0;
                    for (var t = 0; t < 120000; t += 50) {
                        var p = posicionPasada(m, t);
                        if (p.u >= 1) break;
                        if (p.x < VISIBLE.x0 + 40 || p.x > VISIBLE.x1 - 40) continue;
                        enVista++;
                        var a = anguloIntercepcion(c, nv.velProyectil, p, velocidadPasada(m, t));
                        if (a != null && Math.abs(a) <= c.limite) alcanzable++;
                    }
                    if (!enVista || alcanzable / enVista < 0.8) avisos.push("carril " + y + " poco alcanzable");
                    if (enVista * 50 < 6000) avisos.push("carril " + y + " pasa demasiado rápido");
                });
            });
          });
        });
        return avisos;
    }

    /**
     * Ángulo con el que el proyectil (sale de la boca a velocidad v) alcanza a un meteorito en p que se mueve con vm.
     * Lo usan la demostración y la validación; el juego NUNCA apunta solo por el niño.
     */
    function anguloIntercepcion(c, v, p, vm) {
        // aproximación iterativa: el tiempo de vuelo depende del ángulo (la boca está a "largo" del pivote)
        var a = anguloHacia(c, p.x, p.y);
        for (var k = 0; k < 8; k++) {
            var b = boca(c, a);
            var dx = p.x - b.x, dy = p.y - b.y;
            var tv = Math.sqrt(dx * dx + dy * dy) / v;
            var fx = p.x + vm.x * tv, fy = p.y + vm.y * tv;
            var na = anguloHacia(c, fx, fy);
            if (Math.abs(na - a) < 1e-5) { a = na; break; }
            a = na;
        }
        return isFinite(a) ? a : null;
    }

    // ------------------------------------------------------------------ colisión barrida

    /** Distancia mínima entre el punto q y el segmento a→b. Devuelve { d, u }. */
    function distSegmento(ax, ay, bx, by, qx, qy) {
        var vx = bx - ax, vy = by - ay;
        var l2 = vx * vx + vy * vy;
        var u = l2 ? limitar(((qx - ax) * vx + (qy - ay) * vy) / l2, 0, 1) : 0;
        var cx = ax + vx * u, cy = ay + vy * u;
        return { d: Math.sqrt((qx - cx) * (qx - cx) + (qy - cy) * (qy - cy)), u: u };
    }

    /**
     * ¿El proyectil, en su último tramo (px,py → x,y), tocó a algún meteorito en su posición actual?
     * Radio de impacto = radio visual × tolerancia del nivel + radio del proyectil. Devuelve el más cercano o null.
     * meteoritos: [{ id, x, y, radio, activo }]
     */
    function impacto(p, meteoritos, tolerancia, radioProyectil) {
        var mejor = null;
        (meteoritos || []).forEach(function (m) {
            if (!m.activo) return;
            var r = m.radio * (tolerancia || 1) + (radioProyectil || 12);
            var q = distSegmento(p.px, p.py, p.x, p.y, m.x, m.y);
            if (q.d <= r && (!mejor || q.d < mejor.d)) mejor = { meteorito: m, d: q.d, preciso: q.d <= m.radio * 0.45 };
        });
        return mejor;
    }

    /**
     * Consejo amable tras un fallo, mirando el meteorito más cercano al recorrido del láser.
     *  - "anticipa": el láser pasó por donde el meteorito YA había estado → mira hacia dónde se mueve
     *  - "espera": el láser pasó antes de que llegara                  - "arriba": girar hacia lo alto (más recto)
     *  - "izquierda" / "derecha": girar hacia ese lado                  - "general": ¡inténtalo de nuevo!
     * cercano: { relacion: "detras" | "delante" | "", anguloDisparo, anguloMeteorito }
     */
    function consejo(cercano) {
        if (!cercano) return "general";
        var dif = cercano.anguloMeteorito - cercano.anguloDisparo;
        if (Math.abs(dif) < rad(2)) return "general";
        if (cercano.relacion === "detras") return "anticipa";     // el láser pasó por donde el meteorito ya había estado
        if (cercano.relacion === "delante") return "espera";      // el láser pasó antes de que llegara
        var haciaVertical = Math.abs(cercano.anguloMeteorito) < Math.abs(cercano.anguloDisparo) && cercano.anguloMeteorito * cercano.anguloDisparo >= 0;
        if (haciaVertical) return "arriba";
        return dif < 0 ? "izquierda" : "derecha";
    }

    // ------------------------------------------------------------------ marcador

    function crearMarcador(nv) {
        return { total: nv.meteoritos.length, hechos: 0, puntos: 0, disparos: 0, fallos: 0, fallosSeguidos: 0, completo: false };
    }

    /**
     * Registra un disparo: acierto (con puntos y bonus por precisión) o fallo (sin restar nada). Un meteorito con
     * coraza (golpes 2) pierde la coraza en el primer acierto (resultado.parcial = true) y se desintegra en el segundo.
     */
    function registrar(marcador, resultado, j) {
        marcador.disparos++;
        var ganados = 0;
        if (resultado && resultado.meteorito) {
            var m = resultado.meteorito;
            if (m.vida == null) m.vida = Math.max(1, num(m.golpes, 1));
            m.vida--;
            marcador.fallosSeguidos = 0;
            if (m.vida > 0) {
                // le rompió la coraza: unos puntitos y sigue volando; falta otro disparo
                resultado.parcial = true;
                ganados = num((j || {}).puntosCoraza, 10);
                marcador.puntos += ganados;
            } else {
                resultado.parcial = false;
                ganados = num(m.puntos, 50) + (resultado.preciso ? num((j || {}).bonusPreciso, 20) : 0);
                marcador.hechos = Math.min(marcador.total, marcador.hechos + 1);
                marcador.puntos += ganados;
            }
        } else {
            marcador.fallos++;
            marcador.fallosSeguidos++;
        }
        marcador.completo = marcador.hechos >= marcador.total;
        return ganados;
    }

    /** Asistencia progresiva silenciosa: tras varios fallos seguidos la zona de impacto crece un poco (tope +30 %). */
    function toleranciaConAyuda(base, fallosSeguidos, desde) {
        var extra = Math.max(0, (fallosSeguidos || 0) - (desde || 3) + 1) * 0.1;
        return base * (1 + Math.min(0.3, extra));
    }

    var api = {
        W: W,
        H: H,
        VISIBLE: VISIBLE,
        CAMPO: CAMPO,
        azar: azar,
        canon: canon,
        limitarAngulo: limitarAngulo,
        direccion: direccion,
        boca: boca,
        anguloHacia: anguloHacia,
        lineaMira: lineaMira,
        disparar: disparar,
        moverProyectil: moverProyectil,
        posicionPasada: posicionPasada,
        recorrido: recorrido,
        velocidadPasada: velocidadPasada,
        nuevaPasada: nuevaPasada,
        prepararNivel: prepararNivel,
        validarNivel: validarNivel,
        rangoTamano: rangoTamano,
        anguloIntercepcion: anguloIntercepcion,
        distSegmento: distSegmento,
        impacto: impacto,
        consejo: consejo,
        crearMarcador: crearMarcador,
        registrar: registrar,
        toleranciaConAyuda: toleranciaConAyuda
    };
    global.ReglasCanon = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : global);
