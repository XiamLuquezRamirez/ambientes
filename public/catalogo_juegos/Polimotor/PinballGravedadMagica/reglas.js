/**
 * reglas.js — El Pinball de Gravedad Mágica
 *
 * Motor de física 2D puro y decisión de la partida. No toca el DOM ni dibuja: recibe el estado,
 * avanza el tiempo y devuelve los eventos que ocurrieron (bumpers, dianas, rebotadores, aro,
 * caída). Se puede cargar en Node para las pruebas (`module.exports`).
 *
 * Coordenadas: la mesa es un plano de `anchoMesa` x `altoMesa` unidades, origen arriba a la
 * izquierda, Y hacia abajo. La gravedad empuja en +Y, como una mesa inclinada. La perspectiva
 * es solo visual (CSS en la página): la física siempre trabaja sobre el plano.
 *
 * Lección de diseño que dejó la primera versión: en un pinball cualquier pasillo estrecho y
 * cerrado se vuelve una trampa donde la bola baja sin que el niño pueda hacer nada. Por eso no
 * hay carril de lanzamiento y los rebotadores se apoyan en la pared, sin dejar huecos detrás.
 */
(function (global) {
    "use strict";

    // ------------------------------------------------------------------ utilidades

    function limitar(n, min, max) { return Math.max(min, Math.min(max, n)); }
    function largo(x, y) { return Math.sqrt(x * x + y * y); }

    function limitarVelocidad(bola, max) {
        var v = largo(bola.vx, bola.vy);
        if (v > max && v > 0) {
            var f = max / v;
            bola.vx *= f;
            bola.vy *= f;
        }
        return bola;
    }

    /** Punto más cercano del segmento AB al punto P. */
    function puntoMasCercanoEnSegmento(px, py, ax, ay, bx, by) {
        var abx = bx - ax, aby = by - ay;
        var l2 = abx * abx + aby * aby;
        if (l2 === 0) return { x: ax, y: ay, t: 0 };
        var t = limitar(((px - ax) * abx + (py - ay) * aby) / l2, 0, 1);
        return { x: ax + abx * t, y: ay + aby * t, t: t };
    }

    // ------------------------------------------------------------------ geometría de la mesa

    /**
     * Geometría derivada del config. Todo lo sólido es un segmento:
     *   - arco superior (la cabecera curva de la máquina),
     *   - paredes laterales,
     *   - hipotenusa de los rebotadores (apoyados en la pared: no dejan hueco detrás),
     *   - tramo final del embudo hasta el pivote de cada palanca.
     */
    function construirGeometria(cfg) {
        var j = cfg.juego || {};
        var a = j.anchoMesa || 1000;
        var m = cfg.mesa || {};
        var x0 = m.paredX || 40;
        var x1 = a - x0;
        var arco = m.arco || { cx: a / 2, cy: 360, rx: a / 2 - x0, ry: 300 };
        var yRebotador = m.yRebotador || 1120;
        var fl = cfg.flippers || {};
        var fi = fl.izquierda || { pivoteX: 330, pivoteY: 1470 };
        var fd = fl.derecha || { pivoteX: a - 330, pivoteY: 1470 };
        var finRebotador = m.finRebotador || { x: 270, y: 1431 };

        var muros = [];
        // Arco superior: media elipse en tramos.
        var tramos = 16;
        var prev = null;
        for (var i = 0; i <= tramos; i++) {
            var ang = Math.PI + (Math.PI * i) / tramos;
            var p = { x: arco.cx + Math.cos(ang) * arco.rx, y: arco.cy + Math.sin(ang) * arco.ry };
            if (prev) muros.push({ x1: prev.x, y1: prev.y, x2: p.x, y2: p.y, tipo: "arco" });
            prev = p;
        }
        // Paredes.
        muros.push({ x1: x0, y1: arco.cy, x2: x0, y2: yRebotador, tipo: "pared" });
        muros.push({ x1: x1, y1: arco.cy, x2: x1, y2: yRebotador, tipo: "pared" });
        // Embudo: desde el pie de cada rebotador hasta el pivote de la palanca.
        muros.push({ x1: finRebotador.x, y1: finRebotador.y, x2: fi.pivoteX, y2: fi.pivoteY, tipo: "embudo" });
        muros.push({ x1: a - finRebotador.x, y1: finRebotador.y, x2: fd.pivoteX, y2: fd.pivoteY, tipo: "embudo" });

        // Rebotadores (slingshots): triángulos apoyados en la pared. Solo la hipotenusa es
        // "viva" (da impulso); las otras caras quedan contra pared y embudo.
        var rebotadores = [
            {
                id: "s-izq", lado: "izquierda", color: m.colorRebotadorIzq || "#3bc9db",
                x1: x0, y1: yRebotador, x2: finRebotador.x, y2: finRebotador.y,
                brillo: 0, enfriamiento: 0
            },
            {
                id: "s-der", lado: "derecha", color: m.colorRebotadorDer || "#ffd43b",
                x1: x1, y1: yRebotador, x2: a - finRebotador.x, y2: finRebotador.y,
                brillo: 0, enfriamiento: 0
            }
        ];
        return { muros: muros, rebotadores: rebotadores, arco: arco, paredX: x0 };
    }

    // ------------------------------------------------------------------ estado

    function crearEstado(cfg) {
        var j = cfg.juego || {};
        var geo = construirGeometria(cfg);
        return {
            ancho: j.anchoMesa || 1000,
            alto: j.altoMesa || 1600,
            radioBola: j.radioBola || 24,
            friccion: j.friccion || 0.998,
            restitucion: j.restitucionMuro || 0.72,
            alcanceFlipper: j.alcanceFlipper || 190,
            impulsoFlipper: j.impulsoFlipper || 1400,
            impulsoRebotador: j.impulsoRebotador || 620,
            antiatascoMs: j.antiatascoMs || 2600,
            antiatascoVelocidad: j.antiatascoVelocidad || 70,

            gravedad: j.gravedadBase || 700,
            velocidadMaxima: j.velocidadMaxima || 1300,
            impulsoBumper: j.impulsoBumper || 600,
            radioBumper: 48,

            muros: geo.muros,
            rebotadores: geo.rebotadores,
            arco: geo.arco,
            paredX: geo.paredX,

            bola: null,
            bumpers: (cfg.bumpers || []).map(function (b) {
                return { id: b.id, x: b.x, y: b.y, nota: b.nota, color: b.color, brillo: 0 };
            }),
            dianas: (cfg.dianas || []).map(function (d) {
                return {
                    id: d.id, x: d.x, y: d.y, ancho: d.ancho, alto: d.alto,
                    angulo: d.angulo || 0, color: d.color, encendida: false, brillo: 0
                };
            }),
            rampas: (cfg.rampas || []).map(function (r) {
                return { id: r.id, x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, color: r.color, brillo: 0 };
            }),
            aro: cfg.aro ? { x: cfg.aro.x, y: cfg.aro.y, radio: cfg.aro.radio, brillo: 0, dentro: false } : null,
            flippers: crearFlippers(cfg.flippers || {}),

            puntos: 0,
            golpes: 0,
            racha: 0,
            mejorRacha: 0,
            caidas: 0,
            bumpersGolpeados: 0,
            dianasGolpeadas: 0,
            arosCruzados: 0,
            msSinMoverse: 0,
            dianasActivas: true
        };
    }

    function crearFlippers(cfgF) {
        function uno(c, lado) {
            c = c || {};
            var izq = lado === "izquierda";
            var reposo = c.anguloReposo !== undefined ? c.anguloReposo : (izq ? 0.45 : Math.PI - 0.45);
            return {
                lado: lado,
                pivoteX: c.pivoteX || (izq ? 330 : 670),
                pivoteY: c.pivoteY || 1470,
                largo: c.largo || 140,
                anguloReposo: reposo,
                anguloGolpe: c.anguloGolpe !== undefined ? c.anguloGolpe : (izq ? -0.5 : Math.PI + 0.5),
                angulo: reposo,
                activo: false,
                msActivo: 0,
                brillo: 0
            };
        }
        return { izquierda: uno(cfgF.izquierda, "izquierda"), derecha: uno(cfgF.derecha, "derecha") };
    }

    function aplicarRonda(estado, ronda) {
        if (!ronda) return estado;
        if (ronda.gravedad) estado.gravedad = ronda.gravedad;
        if (ronda.velocidadMaxima) estado.velocidadMaxima = ronda.velocidadMaxima;
        if (ronda.impulsoBumper) estado.impulsoBumper = ronda.impulsoBumper;
        if (ronda.radioBumper) estado.radioBumper = ronda.radioBumper;
        estado.dianasActivas = ronda.dianas !== false;
        estado.dianas.forEach(function (d) { d.encendida = false; d.brillo = 0; });
        return estado;
    }

    // ------------------------------------------------------------------ tubos laterales

    /**
     * Recorrido del tubo de energía de cada lado (fuera de las paredes, sobre el mueble):
     *   tramo 1: sube recto desde el lanzador del pie de la máquina,
     *   tramo 2: rodea la cabecera curva por fuera,
     *   tramo 3: la boca, que atraviesa el riel y suelta la bola dentro de la mesa.
     * `u` va de 0 (lanzador) a 1 (boca). Lo usan la física y el dibujo, así coinciden.
     */
    var SEPARACION_TUBO = 52;     // distancia del tubo a la pared
    var ANGULO_BOCA = 1.0;        // cuánto rodea la cabecera antes de entrar (radianes)

    function geometriaTubo(estado, lado) {
        var a = estado.arco;
        var der = lado === "derecha";
        var xTubo = der ? estado.ancho - estado.paredX + SEPARACION_TUBO : estado.paredX - SEPARACION_TUBO;
        var yPie = estado.alto - 70;
        var rx = a.rx + SEPARACION_TUBO, ry = a.ry + SEPARACION_TUBO;
        var angBoca = der ? -ANGULO_BOCA : Math.PI + ANGULO_BOCA;
        var exterior = { x: a.cx + Math.cos(angBoca) * rx, y: a.cy + Math.sin(angBoca) * ry };
        var interior = { x: a.cx + Math.cos(angBoca) * (a.rx - 46), y: a.cy + Math.sin(angBoca) * (a.ry - 46) };
        var largoRecto = yPie - a.cy;
        var largoArco = ANGULO_BOCA * (rx + ry) / 2;
        var largoBoca = largo(exterior.x - interior.x, exterior.y - interior.y);
        return {
            der: der, xTubo: xTubo, yPie: yPie, rx: rx, ry: ry, angBoca: angBoca,
            exterior: exterior, interior: interior,
            l1: largoRecto, l2: largoArco, l3: largoBoca, total: largoRecto + largoArco + largoBoca
        };
    }

    function puntoTubo(estado, lado, u) {
        var g = geometriaTubo(estado, lado);
        var a = estado.arco;
        var d = limitar(u, 0, 1) * g.total;
        if (d <= g.l1) return { x: g.xTubo, y: g.yPie - d };
        d -= g.l1;
        if (d <= g.l2) {
            var k = d / g.l2;
            var ang = g.der ? -k * ANGULO_BOCA : Math.PI + k * ANGULO_BOCA;
            return { x: a.cx + Math.cos(ang) * g.rx, y: a.cy + Math.sin(ang) * g.ry };
        }
        d -= g.l2;
        var t = d / g.l3;
        return { x: g.exterior.x + (g.interior.x - g.exterior.x) * t, y: g.exterior.y + (g.interior.y - g.exterior.y) * t };
    }

    /**
     * Lanza la bola. Normalmente entra por el tubo de un lado (alternando con algo de azar):
     * el lanzador la dispara, sube por el tubo y cae a la mesa por la boca de la cabecera.
     * `directo` la deja ya dentro de la mesa (lo usan las pruebas de física).
     */
    function lanzarBola(estado, aleatorio, directo) {
        var rnd = aleatorio || Math.random;
        var lado = rnd() < 0.5 ? "derecha" : "izquierda";
        var p = directo ? null : puntoTubo(estado, lado, 0);
        estado.bola = {
            x: p ? p.x : estado.ancho * (lado === "derecha" ? 0.66 : 0.34),
            y: p ? p.y : estado.arco.cy - estado.arco.ry * 0.55,
            vx: 0, vy: 0, giro: 0, viva: true, estela: [],
            enTubo: directo ? null : { lado: lado, u: 0, ms: 0, dur: 1150, empuje: 0.9 + rnd() * 0.25 }
        };
        if (directo) {
            estado.bola.vx = (lado === "derecha" ? -1 : 1) * (60 + rnd() * 110);
            estado.bola.vy = 120 + rnd() * 80;
        }
        estado.msSinMoverse = 0;
        return estado.bola;
    }

    /** Avanza la bola dentro del tubo: rápida al salir del lanzador, frena al llegar a la boca. */
    function avanzarEnTubo(estado, bola, dtMs, eventos) {
        var tubo = bola.enTubo;
        if (tubo.ms === 0) eventos.push({ tipo: "tubo", lado: tubo.lado });
        tubo.ms += dtMs;
        var k = limitar(tubo.ms / tubo.dur, 0, 1);
        tubo.u = 1 - Math.pow(1 - k, 2.2);
        var p = puntoTubo(estado, tubo.lado, tubo.u);
        bola.giro += 0.4;
        bola.x = p.x;
        bola.y = p.y;
        bola.estela.push({ x: p.x, y: p.y });
        if (bola.estela.length > 16) bola.estela.shift();
        if (k >= 1) {
            // Sale por la boca hacia el centro de la mesa, con algo de caída.
            var g = geometriaTubo(estado, tubo.lado);
            var dx = g.interior.x - g.exterior.x, dy = g.interior.y - g.exterior.y;
            var l = largo(dx, dy);
            var v = 300 * tubo.empuje;
            bola.vx = (dx / l) * v;
            bola.vy = (dy / l) * v + 60;
            bola.enTubo = null;
            bola.anclaX = undefined;
            estado.msSinMoverse = 0;
            eventos.push({ tipo: "salidaTubo", lado: tubo.lado, x: bola.x, y: bola.y });
        }
    }

    // ------------------------------------------------------------------ colisiones

    function rebotarContraSegmento(bola, radio, ax, ay, bx, by, restitucion, grosor) {
        var c = puntoMasCercanoEnSegmento(bola.x, bola.y, ax, ay, bx, by);
        var dx = bola.x - c.x, dy = bola.y - c.y;
        var dist = largo(dx, dy);
        var minimo = radio + (grosor || 0);
        if (dist >= minimo || dist === 0) return 0;
        var nx = dx / dist, ny = dy / dist;
        bola.x = c.x + nx * minimo;
        bola.y = c.y + ny * minimo;
        var vn = bola.vx * nx + bola.vy * ny;
        if (vn >= 0) return 0;
        bola.vx -= (1 + restitucion) * vn * nx;
        bola.vy -= (1 + restitucion) * vn * ny;
        return Math.abs(vn);
    }

    function rebotarContraBumper(bola, radio, bumper, radioBumper, impulso) {
        var dx = bola.x - bumper.x, dy = bola.y - bumper.y;
        var dist = largo(dx, dy);
        var minimo = radio + radioBumper;
        if (dist >= minimo || dist === 0) return false;
        var nx = dx / dist, ny = dy / dist;
        bola.x = bumper.x + nx * minimo;
        bola.y = bumper.y + ny * minimo;
        var nuevo = Math.max(impulso, largo(bola.vx, bola.vy) * 0.9);
        bola.vx = nx * nuevo;
        bola.vy = ny * nuevo;
        return true;
    }

    function golpearDiana(bola, radio, d, restitucion) {
        var mitad = d.ancho / 2;
        var cos = Math.cos(d.angulo), sen = Math.sin(d.angulo);
        return rebotarContraSegmento(bola, radio,
            d.x - cos * mitad, d.y - sen * mitad, d.x + cos * mitad, d.y + sen * mitad,
            restitucion, d.alto / 2) > 0;
    }

    // ------------------------------------------------------------------ palancas

    function puntaFlipper(f) {
        return { x: f.pivoteX + Math.cos(f.angulo) * f.largo, y: f.pivoteY + Math.sin(f.angulo) * f.largo };
    }

    /**
     * Activa una palanca. Siempre se mueve, aunque la bola esté lejos: tocar fuera de tiempo
     * nunca se castiga. Devuelve si alcanzó la bola.
     */
    function activarFlipper(estado, lado) {
        var f = estado.flippers[lado];
        if (!f) return { movio: false, golpeo: false };
        f.activo = true;
        f.msActivo = 0;
        f.brillo = 1;

        var bola = estado.bola;
        if (!bola || !bola.viva || bola.enTubo) return { movio: true, golpeo: false };

        var punta = puntaFlipper(f);
        var c = puntoMasCercanoEnSegmento(bola.x, bola.y, f.pivoteX, f.pivoteY, punta.x, punta.y);
        if (largo(bola.x - c.x, bola.y - c.y) > estado.alcanceFlipper) return { movio: true, golpeo: false };
        // La bola tiene que estar por encima de la palanca (no debajo, ya cayendo al fondo).
        if (bola.y > f.pivoteY + 40) return { movio: true, golpeo: false };

        var impulso = estado.impulsoFlipper;
        var factorPunta = 0.85 + 0.3 * c.t;
        // El punto de impacto abre el tiro: con la base va al centro, con la punta al lado
        // contrario. Así dos golpes seguidos no mandan la bola al mismo sitio.
        var haciaCentro = (estado.ancho / 2 - bola.x) / (estado.ancho / 2);
        var apertura = (lado === "izquierda" ? 1 : -1) * (0.1 + c.t * 0.45);
        bola.vx = (haciaCentro * 0.3 + apertura) * impulso * 0.55;
        bola.vy = -impulso * factorPunta;
        limitarVelocidad(bola, estado.velocidadMaxima);
        estado.msSinMoverse = 0;
        return { movio: true, golpeo: true };
    }

    function avanzarFlippers(estado, dtMs, cfgJuego) {
        var subida = (cfgJuego && cfgJuego.flipperSubidaMs) || 90;
        var bajada = (cfgJuego && cfgJuego.flipperBajadaMs) || 170;
        ["izquierda", "derecha"].forEach(function (lado) {
            var f = estado.flippers[lado];
            if (f.activo) {
                f.msActivo += dtMs;
                var t = limitar(f.msActivo / subida, 0, 1);
                f.angulo = f.anguloReposo + (f.anguloGolpe - f.anguloReposo) * t;
                if (f.msActivo >= subida + 60) f.activo = false;
            } else {
                var dif = f.anguloReposo - f.angulo;
                if (Math.abs(dif) < 0.002) f.angulo = f.anguloReposo;
                else f.angulo += dif * limitar((dtMs / bajada) * 3, 0, 1);
            }
            f.brillo = Math.max(0, f.brillo - dtMs / 320);
        });
    }

    // ------------------------------------------------------------------ paso de simulación

    /**
     * Avanza la física `dtMs` milisegundos y devuelve los eventos:
     * `muro`, `rampa`, `rebotador`, `bumper`, `diana`, `aro`, `caida`, `antiatasco`.
     */
    function avanzar(estado, dtMs, cfg) {
        var eventos = [];
        var cfgJuego = (cfg && cfg.juego) || {};
        avanzarFlippers(estado, dtMs, cfgJuego);
        estado.rebotadores.forEach(function (s) {
            s.enfriamiento = Math.max(0, s.enfriamiento - dtMs);
            s.brillo = Math.max(0, s.brillo - dtMs / 300);
        });

        var bola = estado.bola;
        if (!bola || !bola.viva) return eventos;
        var dt = dtMs / 1000;
        if (dt <= 0) return eventos;
        if (bola.enTubo) { avanzarEnTubo(estado, bola, dtMs, eventos); return eventos; }

        var pasos = Math.max(1, Math.ceil(largo(bola.vx, bola.vy) * dt / (estado.radioBola * 0.5)));
        var sub = dt / pasos;
        var friccion = Math.pow(estado.friccion, sub * 60);

        for (var p = 0; p < pasos && bola.viva; p++) {
            bola.vy += estado.gravedad * sub;
            bola.vx *= friccion;
            bola.vy *= friccion;
            limitarVelocidad(bola, estado.velocidadMaxima);
            bola.x += bola.vx * sub;
            bola.y += bola.vy * sub;
            bola.giro += bola.vx * sub * 0.03;
            colisionarConMesa(estado, bola, eventos);
        }

        vigilarAro(estado, bola, eventos);
        bola.estela.push({ x: bola.x, y: bola.y });
        if (bola.estela.length > 16) bola.estela.shift();
        vigilarAtasco(estado, bola, dtMs, eventos);
        if (bola.y - estado.radioBola > estado.alto) {
            bola.viva = false;
            estado.caidas++;
            estado.racha = 0;
            eventos.push({ tipo: "caida", x: bola.x, y: bola.y });
        }
        return eventos;
    }

    function colisionarConMesa(estado, bola, eventos) {
        var r = estado.radioBola;
        var i;

        for (i = 0; i < estado.muros.length; i++) {
            var m = estado.muros[i];
            var f = rebotarContraSegmento(bola, r, m.x1, m.y1, m.x2, m.y2, estado.restitucion, 0);
            if (f > 90) eventos.push({ tipo: "muro", fuerza: f, x: bola.x, y: bola.y });
        }

        // Rebotadores: además de rebotar, empujan la bola hacia el centro.
        for (i = 0; i < estado.rebotadores.length; i++) {
            var s = estado.rebotadores[i];
            var f2 = rebotarContraSegmento(bola, r, s.x1, s.y1, s.x2, s.y2, estado.restitucion, 4);
            if (f2 > 0 && s.enfriamiento <= 0 && f2 > 60) {
                var dx = s.x2 - s.x1, dy = s.y2 - s.y1;
                var l = largo(dx, dy);
                var nx = dy / l, ny = -dx / l;                       // normal de la hipotenusa
                if (nx * (estado.ancho / 2 - s.x1) < 0) { nx = -nx; ny = -ny; } // hacia el centro
                // Empuje casi horizontal hacia el centro: la bola cruza y cae hacia las
                // palancas. Si el empuje fuera hacia arriba, los dos triángulos se pasarían la
                // bola de uno a otro para siempre sin que el niño pudiera intervenir.
                var kx = nx, ky = ny * 0.25;
                var lk = largo(kx, ky);
                var v = Math.min(estado.impulsoRebotador, largo(bola.vx, bola.vy) * 0.8 + 160);
                bola.vx = (kx / lk) * v;
                bola.vy = (ky / lk) * v;
                s.brillo = 1;
                s.enfriamiento = 260;
                estado.msSinMoverse = 0;
                eventos.push({ tipo: "rebotador", id: s.id, x: bola.x, y: bola.y, color: s.color });
            }
        }

        for (i = 0; i < estado.rampas.length; i++) {
            var ra = estado.rampas[i];
            var f3 = rebotarContraSegmento(bola, r, ra.x1, ra.y1, ra.x2, ra.y2, 0.9, 8);
            if (f3 > 60) {
                ra.brillo = 1;
                eventos.push({ tipo: "rampa", id: ra.id, fuerza: f3, x: bola.x, y: bola.y });
            }
        }

        for (i = 0; i < estado.bumpers.length; i++) {
            var bu = estado.bumpers[i];
            if (rebotarContraBumper(bola, r, bu, estado.radioBumper, estado.impulsoBumper)) {
                bu.brillo = 1;
                estado.bumpersGolpeados++;
                estado.msSinMoverse = 0;
                eventos.push({ tipo: "bumper", id: bu.id, nota: bu.nota, x: bu.x, y: bu.y, color: bu.color });
            }
        }

        if (estado.dianasActivas !== false) {
            for (i = 0; i < estado.dianas.length; i++) {
                var di = estado.dianas[i];
                if (golpearDiana(bola, r, di, estado.restitucion)) {
                    di.brillo = 1;
                    if (!di.encendida) {
                        di.encendida = true;
                        estado.dianasGolpeadas++;
                        eventos.push({ tipo: "diana", id: di.id, x: di.x, y: di.y, color: di.color });
                    }
                }
            }
        }

        ["izquierda", "derecha"].forEach(function (lado) {
            var fl = estado.flippers[lado];
            var punta = puntaFlipper(fl);
            rebotarContraSegmento(bola, r, fl.pivoteX, fl.pivoteY, punta.x, punta.y, 0.4, 14);
        });
    }

    /** El aro de energía no es sólido: cruzarlo por dentro suma y enciende la mesa. */
    function vigilarAro(estado, bola, eventos) {
        var aro = estado.aro;
        if (!aro) return;
        aro.brillo = Math.max(0, aro.brillo - 0.02);
        var dentro = largo(bola.x - aro.x, bola.y - aro.y) < aro.radio * 0.75;
        if (dentro && !aro.dentro) {
            aro.brillo = 1;
            estado.arosCruzados++;
            eventos.push({ tipo: "aro", x: aro.x, y: aro.y });
        }
        aro.dentro = dentro;
    }

    /**
     * Antiatasco: la bola casi parada, o agitándose en un sitio sin desplazarse, recibe un
     * empujón suave hacia el centro-arriba. El niño no lo percibe como castigo.
     */
    function vigilarAtasco(estado, bola, dtMs, eventos) {
        var v = largo(bola.vx, bola.vy);
        if (bola.anclaX === undefined) { bola.anclaX = bola.x; bola.anclaY = bola.y; bola.msAncla = 0; }
        bola.msAncla += dtMs;
        var desplazada = largo(bola.x - bola.anclaX, bola.y - bola.anclaY) > estado.radioBola * 4;
        if (desplazada || bola.msAncla > estado.antiatascoMs) {
            bola.anclaX = bola.x; bola.anclaY = bola.y; bola.msAncla = 0;
            if (desplazada) estado.msSinMoverse = 0;
        }
        var quieta = v < estado.antiatascoVelocidad;
        var sinProgreso = !desplazada && bola.msAncla >= estado.antiatascoMs * 0.9;
        if (quieta || sinProgreso) estado.msSinMoverse += dtMs;
        else estado.msSinMoverse = Math.max(0, estado.msSinMoverse - dtMs * 0.5);

        if (estado.msSinMoverse >= estado.antiatascoMs) {
            estado.msSinMoverse = 0;
            bola.anclaX = bola.x; bola.anclaY = bola.y; bola.msAncla = 0;
            var hc = estado.ancho / 2 - bola.x;
            bola.vx = (hc >= 0 ? 1 : -1) * 190;
            bola.vy = -380;
            eventos.push({ tipo: "antiatasco", x: bola.x, y: bola.y });
        }
    }

    // ------------------------------------------------------------------ puntaje y progreso

    function puntuar(estado, evento, cfg) {
        var p = (cfg && cfg.puntos) || {};
        var suma = 0;
        if (evento.tipo === "bumper") suma = p.bumper || 10;
        else if (evento.tipo === "diana") suma = p.diana || 25;
        else if (evento.tipo === "rebotador") suma = p.rebotador || 5;
        else if (evento.tipo === "aro") suma = p.aro || 20;
        else if (evento.tipo === "flipper") {
            suma = p.flipperAcertado || 15;
            estado.golpes++;
            estado.racha++;
            if (estado.racha > estado.mejorRacha) estado.mejorRacha = estado.racha;
            if (estado.racha >= 3) suma += (p.rachaBonus || 5) * (estado.racha - 2);
        }
        estado.puntos += suma;
        return suma;
    }

    function rondaCompleta(estado, ronda) {
        return !!ronda && estado.golpes >= (ronda.golpesObjetivo || 6);
    }

    function estrellas(estado, totalObjetivo) {
        var ratio = totalObjetivo > 0 ? estado.golpes / totalObjetivo : 1;
        if (ratio >= 1 && estado.caidas <= 2) return 3;
        if (ratio >= 0.8) return 2;
        return 1;
    }

    /** «¡Viene por la izquierda!» ANTES de que la bola llegue a la palanca, nunca después. */
    function ladoDeAviso(estado, cfgJuego) {
        var bola = estado.bola;
        if (!bola || !bola.viva || bola.enTubo || bola.vy <= 0) return null;
        var yPal = estado.flippers.izquierda.pivoteY;
        var umbral = (cfgJuego && cfgJuego.avisoAnticipacionY) || yPal - 520;
        if (bola.y < umbral || bola.y > yPal - 60) return null;
        var t = (yPal - bola.y) / Math.max(bola.vy, 1);
        var xFuturo = bola.x + bola.vx * t * 0.5;
        return xFuturo < estado.ancho / 2 ? "izquierda" : "derecha";
    }

    function reiniciar(estado, cfg) {
        var nuevo = crearEstado(cfg);
        Object.keys(nuevo).forEach(function (k) { estado[k] = nuevo[k]; });
        return estado;
    }

    var API = {
        crearEstado: crearEstado,
        construirGeometria: construirGeometria,
        aplicarRonda: aplicarRonda,
        lanzarBola: lanzarBola,
        avanzar: avanzar,
        activarFlipper: activarFlipper,
        puntaFlipper: puntaFlipper,
        puntoTubo: puntoTubo,
        geometriaTubo: geometriaTubo,
        murosDeLaMesa: function (estado) { return estado.muros; },
        puntuar: puntuar,
        rondaCompleta: rondaCompleta,
        estrellas: estrellas,
        ladoDeAviso: ladoDeAviso,
        reiniciar: reiniciar,
        _puntoMasCercanoEnSegmento: puntoMasCercanoEnSegmento,
        _limitarVelocidad: limitarVelocidad
    };

    global.ReglasPinball = API;
    if (typeof module !== "undefined" && module.exports) module.exports = API;

})(typeof window !== "undefined" ? window : globalThis);
