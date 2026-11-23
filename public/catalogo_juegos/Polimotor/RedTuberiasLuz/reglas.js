/**
 * ReglasTuberia — geometría y decisiones de "¡La Red de Tuberías!" (window.ReglasTuberia).
 * Puro: no toca el DOM ni Phaser, se puede probar con Node.
 *
 * Una red es un tubo que va del generador de luz al reactor. Se define en config.json con puntos del mundo de
 * diseño (1600 × 900) unidos por tramos rectos; cada codo se redondea (curva × ancho) y el eje se remuestrea a
 * pasos iguales. La gema viaja por ese eje: su avance es la distancia s recorrida sobre el eje, nunca la posición
 * suelta en la pantalla.
 *
 * Mecánica (presionar → mantener → conducir → seguir las curvas → llegar → liberar):
 *   - El dedo que toma la gema la conduce. Cada cuadro se busca el punto del eje más cercano al dedo SOLO cerca de
 *     donde está la gema (ventana local): en un zigzag la gema no salta al tramo vecino a través de la pared, y
 *     tocar el reactor no sirve de nada.
 *   - La gema avanza por el eje como mucho velocidadMax por segundo (no se teletransporta) y se corre a los lados
 *     solo hasta la holgura del carril (siempre se ve dentro del tubo).
 *   - Si el dedo se aleja del carril más que la tolerancia, la gema se detiene ("fuera") y espera a que el dedo
 *     vuelva. Si sigue fuera más de fueraMaxMs, la gema vuelve al último checkpoint ("perdida").
 *   - Levantar el dedo antes del reactor detiene la gema y la devuelve al último checkpoint. Nada más se pierde.
 *   - La meta solo cuenta si la gema llegó recorriendo el tubo y pasó todos los checkpoints.
 *
 *   construir(def, cfg)                 → red { ancho, radio, holgura, tolerancia, largo, muestras[], checkpoints[], … }
 *   puntoEn(red, s) · cercano(red, x, y, sRef, ventana) · normal(ang)
 *   nuevoEstado(red) · tocaGema(red, est, x, y, cfg) · tomar(est) · conducir(red, est, x, y, dt, cfg) · soltar(red, est)
 *   validar(red, cfg) · simular(red, cfg, modo)
 */
(function (global) {
    "use strict";

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

    var DEF = {
        paso: 4,
        radioGema: 30,
        margen: 0.5,           // tolerancia del dedo fuera del borde del carril, en anchos
        holgura: 0.55,         // la gema se corre a los lados hasta ancho/2 − holgura·radio
        velocidadMax: 1100,    // unidades del mundo por segundo sobre el eje
        seguimiento: 18,       // respuesta lateral por segundo
        toqueGema: 1.9,        // radio de toque = toqueGema × radio de la gema
        fueraMaxMs: 1800,
        grosorPared: 18
    };

    function num(cfg, k) {
        var v = cfg && cfg[k] != null ? Number(cfg[k]) : NaN;
        return isFinite(v) ? v : DEF[k];
    }

    // ------------------------------------------------------------------ construcción

    function agregarRecta(out, x, y) {
        var u = out[out.length - 1];
        var l = dist(u.x, u.y, x, y);
        var n = Math.max(1, Math.ceil(l / 2));
        for (var k = 1; k <= n; k++) out.push({ x: u.x + (x - u.x) * k / n, y: u.y + (y - u.y) * k / n });
    }

    /** Polilínea densa con los codos redondeados (Bézier cuadrática con control en el codo). */
    function polilinea(P, rc) {
        var out = [{ x: P[0].x, y: P[0].y }];
        for (var i = 1; i < P.length; i++) {
            var a = P[i - 1], b = P[i];
            if (i === P.length - 1) {
                agregarRecta(out, b.x, b.y);
                continue;
            }
            var c = P[i + 1];
            var l1 = dist(a.x, a.y, b.x, b.y), l2 = dist(b.x, b.y, c.x, c.y);
            var r = Math.min(rc, l1 * 0.48, l2 * 0.48);
            var e1 = { x: b.x + (a.x - b.x) / l1 * r, y: b.y + (a.y - b.y) / l1 * r };
            var e2 = { x: b.x + (c.x - b.x) / l2 * r, y: b.y + (c.y - b.y) / l2 * r };
            agregarRecta(out, e1.x, e1.y);
            var n = Math.max(10, Math.ceil(r / 3));
            for (var k = 1; k <= n; k++) {
                var u = k / n;
                out.push({
                    x: (1 - u) * (1 - u) * e1.x + 2 * (1 - u) * u * b.x + u * u * e2.x,
                    y: (1 - u) * (1 - u) * e1.y + 2 * (1 - u) * u * b.y + u * u * e2.y
                });
            }
        }
        return out;
    }

    /** Remuestreo a distancias iguales con el ángulo de marcha. */
    function remuestrear(poli, paso) {
        var acum = [0];
        for (var i = 1; i < poli.length; i++) acum.push(acum[i - 1] + dist(poli[i - 1].x, poli[i - 1].y, poli[i].x, poli[i].y));
        var largo = acum[acum.length - 1];
        var n = Math.max(2, Math.round(largo / paso));
        var paso2 = largo / n;
        var m = [];
        var j = 1;
        for (var k = 0; k <= n; k++) {
            var s = k * paso2;
            while (j < poli.length - 1 && acum[j] < s) j++;
            var s0 = acum[j - 1], s1 = acum[j];
            var u = s1 > s0 ? clamp((s - s0) / (s1 - s0), 0, 1) : 0;
            m.push({ x: poli[j - 1].x + (poli[j].x - poli[j - 1].x) * u, y: poli[j - 1].y + (poli[j].y - poli[j - 1].y) * u, s: s, ang: 0 });
        }
        for (var q = 0; q < m.length; q++) {
            var a = m[Math.max(0, q - 1)], b = m[Math.min(m.length - 1, q + 1)];
            m[q].ang = Math.atan2(b.y - a.y, b.x - a.x);
        }
        return { muestras: m, largo: largo, paso: paso2 };
    }

    /**
     * Red lista para jugar. def: { id, ancho, curva, puntos[[x,y]], checkpoints[fracciones 0..1] }.
     * cfg: bloque "juego" del config.
     */
    function construir(def, cfg) {
        cfg = cfg || {};
        var ancho = Number(def.ancho) || 100;
        var radio = Number(def.radioGema) || num(cfg, "radioGema");
        var P = (def.puntos || []).map(function (p) { return { x: Number(p[0]), y: Number(p[1]) }; });
        var rm = remuestrear(polilinea(P, (Number(def.curva) || 1) * ancho), num(cfg, "paso"));
        var red = {
            id: def.id,
            nombre: def.nombre || "",
            ancho: ancho,
            radio: radio,
            pared: num(cfg, "grosorPared"),
            holgura: Math.max(4, ancho / 2 - num(cfg, "holgura") * radio),
            tolerancia: ancho / 2 + num(cfg, "margen") * ancho,
            puntos: P,
            muestras: rm.muestras,
            largo: rm.largo,
            paso: rm.paso,
            checkpoints: []
        };
        red.sMeta = red.largo - radio * 0.6;
        var ini = rm.muestras[0], fin = rm.muestras[rm.muestras.length - 1];
        red.inicio = { x: ini.x, y: ini.y, ang: ini.ang };
        red.meta = { x: fin.x, y: fin.y, ang: fin.ang };
        (def.checkpoints || []).map(Number).filter(function (f) { return f > 0 && f < 1; })
            .sort(function (a, b) { return a - b; })
            .forEach(function (f, i) {
                var p = puntoEn(red, f * red.largo);
                red.checkpoints.push({ i: i, f: f, s: p.s, x: p.x, y: p.y, ang: p.ang });
            });
        return red;
    }

    // ------------------------------------------------------------------ consultas geométricas

    function puntoEn(red, s) {
        var m = red.muestras;
        var f = clamp(s, 0, red.largo) / red.paso;
        var i = Math.floor(f);
        if (i >= m.length - 1) {
            var z = m[m.length - 1];
            return { x: z.x, y: z.y, ang: z.ang, s: red.largo };
        }
        var u = f - i;
        var a = m[i], b = m[i + 1];
        var da = b.ang - a.ang;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, ang: a.ang + da * u, s: clamp(s, 0, red.largo) };
    }

    /** Normal a la izquierda de la marcha (en pantalla, con y hacia abajo). */
    function normal(ang) {
        return { x: Math.sin(ang), y: -Math.cos(ang) };
    }

    /**
     * Punto del eje más cercano a (x, y). Con sRef y ventana busca solo en [sRef − ventana, sRef + ventana]:
     * así no se salta a otro tramo del zigzag aunque esté cerca en la pantalla. lat: desvío firmado (+ izquierda).
     */
    function cercano(red, x, y, sRef, ventana) {
        var m = red.muestras;
        var i0 = 0, i1 = m.length - 1;
        if (sRef != null && ventana != null) {
            i0 = Math.max(0, Math.floor((sRef - ventana) / red.paso));
            i1 = Math.min(m.length - 1, Math.ceil((sRef + ventana) / red.paso));
        }
        var mejor = null;
        for (var i = i0; i < i1; i++) {
            var a = m[i], b = m[i + 1];
            var vx = b.x - a.x, vy = b.y - a.y;
            var l2 = vx * vx + vy * vy || 1;
            var u = clamp(((x - a.x) * vx + (y - a.y) * vy) / l2, 0, 1);
            var px = a.x + vx * u, py = a.y + vy * u;
            var d = dist(x, y, px, py);
            if (!mejor || d < mejor.d) mejor = { s: a.s + (b.s - a.s) * u, d: d, x: px, y: py, ang: Math.atan2(vy, vx) };
        }
        if (!mejor) {
            var p = m[i0];
            mejor = { s: p.s, d: dist(x, y, p.x, p.y), x: p.x, y: p.y, ang: p.ang };
        }
        var n = normal(mejor.ang);
        mejor.lat = (x - mejor.x) * n.x + (y - mejor.y) * n.y;
        return mejor;
    }

    // ------------------------------------------------------------------ estado de la gema

    function nuevoEstado(red) {
        return {
            s: 0,
            lat: 0,
            x: red.inicio.x,
            y: red.inicio.y,
            maxS: 0,
            cp: -1,               // último checkpoint alcanzado (−1: ninguno, se vuelve al generador)
            conectado: false,
            fuera: false,
            fueraMs: 0,
            enMeta: false
        };
    }

    function sCheckpoint(red, est) {
        return est.cp >= 0 && red.checkpoints[est.cp] ? red.checkpoints[est.cp].s : 0;
    }

    /** Coloca la gema en s (sobre el eje, centrada). */
    function ubicar(red, est, s) {
        var p = puntoEn(red, s);
        est.s = p.s;
        est.lat = 0;
        est.x = p.x;
        est.y = p.y;
    }

    /** ¿El toque (x, y) cae sobre la gema? La zona de toque es más grande que la gema dibujada. */
    function tocaGema(red, est, x, y, cfg) {
        return dist(x, y, est.x, est.y) <= red.radio * num(cfg, "toqueGema");
    }

    function tomar(est) {
        est.conectado = true;
        est.fuera = false;
        est.fueraMs = 0;
    }

    /**
     * Un cuadro de conducción con el dedo en (x, y) durante dt ms.
     * Devuelve { evento: null | "fuera" | "vuelve" | "perdida" | "meta", checkpoints: [i…], d, ds }.
     */
    function conducir(red, est, x, y, dt, cfg) {
        var res = { evento: null, checkpoints: [], d: 0, ds: 0 };
        if (!est.conectado || est.enMeta) return res;
        dt = clamp(Number(dt) || 16, 1, 100);
        var maxDs = num(cfg, "velocidadMax") * dt / 1000;
        var ventana = red.ancho * 1.8 + maxDs;
        var c = cercano(red, x, y, est.s, ventana);
        res.d = c.d;
        if (c.d > red.tolerancia) {
            // el dedo se salió del carril: la gema se detiene donde está y espera
            var nuevo = !est.fuera;
            est.fuera = true;
            est.fueraMs += dt;
            if (est.fueraMs >= num(cfg, "fueraMaxMs")) {
                res.evento = "perdida";
                volverACheckpoint(red, est);
                est.conectado = false;
                return res;
            }
            res.evento = nuevo ? "fuera" : null;
            res.fueraSigue = true;
            return res;
        }
        if (est.fuera) res.evento = "vuelve";
        est.fuera = false;
        est.fueraMs = 0;
        // avance por el eje, limitado por la velocidad (sin saltos)
        var ds = clamp(c.s - est.s, -maxDs, maxDs);
        var s2 = clamp(est.s + ds, 0, red.largo);
        // desvío lateral suave y siempre dentro del carril
        var latObj = clamp(c.lat, -red.holgura, red.holgura);
        var f = Math.min(1, num(cfg, "seguimiento") * dt / 1000);
        var lat2 = clamp(est.lat + (latObj - est.lat) * f, -red.holgura, red.holgura);
        var p = puntoEn(red, s2);
        var n = normal(p.ang);
        res.ds = s2 - est.s;
        est.s = s2;
        est.lat = lat2;
        est.x = p.x + n.x * lat2;
        est.y = p.y + n.y * lat2;
        if (s2 > est.maxS) est.maxS = s2;
        while (est.cp + 1 < red.checkpoints.length && est.maxS >= red.checkpoints[est.cp + 1].s) {
            est.cp += 1;
            res.checkpoints.push(est.cp);
        }
        if (est.s >= red.sMeta && est.cp === red.checkpoints.length - 1) {
            est.enMeta = true;
            est.conectado = false;
            res.evento = "meta";
        }
        return res;
    }

    function volverACheckpoint(red, est) {
        var s = sCheckpoint(red, est);
        est.maxS = s;
        est.fuera = false;
        est.fueraMs = 0;
        ubicar(red, est, s);
        return s;
    }

    /**
     * El dedo se levantó (o se perdió el puntero). Si la gema ya está en la meta no pasa nada. Si no, se detiene y
     * vuelve al último checkpoint: devuelve { desde, hasta } (distancias sobre el eje) para que la escena lo anime.
     */
    function soltar(red, est) {
        var desde = est.s;
        est.conectado = false;
        if (est.enMeta) return { desde: desde, hasta: desde, meta: true };
        var hasta = volverACheckpoint(red, est);
        return { desde: desde, hasta: hasta, meta: false };
    }

    function progreso(red, est) {
        return red.largo > 0 ? clamp(est.maxS / red.largo, 0, 1) : 0;
    }

    // ------------------------------------------------------------------ validación y simulación

    /**
     * La red cabe en la zona visible en 4:3 (x 215..1385) dejando lugar al generador y al reactor, no toca las
     * esquinas de los botones, los tramos no se tocan entre sí y los checkpoints están repartidos.
     */
    function validar(red, cfg) {
        cfg = cfg || {};
        var errores = [];
        var zona = cfg.zona || { x0: 330, x1: 1270, y0: 140, y1: 790 };
        var borde = red.ancho / 2 + red.pared;
        red.muestras.forEach(function (p, k) {
            if (k % 10) return;
            if (p.x < zona.x0 - 1 || p.x > zona.x1 + 1 || p.y < zona.y0 + borde - 1 || p.y > zona.y1 - borde + 1) {
                errores.push("fuera de la zona en s=" + Math.round(p.s));
            }
        });
        var m = red.muestras;
        var sep = red.ancho + red.pared * 2 + 6;
        var paso = Math.max(1, Math.round(6 / red.paso));
        for (var i = 0; i < m.length; i += paso) {
            for (var j = i + paso; j < m.length; j += paso) {
                if (m[j].s - m[i].s < red.ancho * 3) continue;
                if (dist(m[i].x, m[i].y, m[j].x, m[j].y) < sep) {
                    errores.push("tramos juntos s=" + Math.round(m[i].s) + "/" + Math.round(m[j].s));
                    j = m.length;
                    i += 20;
                }
            }
        }
        if (!red.checkpoints.length) errores.push("sin checkpoints");
        var prev = 0;
        red.checkpoints.forEach(function (cp, k) {
            if (cp.s - prev < red.ancho * 2) errores.push("checkpoint " + k + " muy cerca del anterior");
            prev = cp.s;
        });
        if (red.largo - prev < red.ancho * 2) errores.push("último checkpoint muy cerca del reactor");
        return errores;
    }

    /**
     * Simula un dedo con el mismo conducir() del juego.
     *   "centro":    sigue el eje a velocidadSim → llega, pasa todos los checkpoints, nunca sale.
     *   "desviado":  se mueve a los lados dentro de la tolerancia → llega y la gema siempre queda en la holgura.
     *   "salto":     toma la gema y salta al reactor → "fuera", la gema no avanza y vuelve al checkpoint.
     *   "atajo":     toma la gema y va en línea recta del generador al reactor → no llega.
     */
    function simular(red, cfg, modo) {
        cfg = cfg || {};
        var dt = 16;
        var est = nuevoEstado(red);
        tomar(est);
        var vel = (Number(cfg.velocidadSim) || 320) * dt / 1000;
        var r = { llego: false, fueras: 0, perdidas: 0, checkpoints: 0, maxLat: 0, maxSalto: 0, tiempo: 0, maxS: 0 };
        var sObj = 0;
        for (var t = 0; t < 120000; t += dt) {
            var x, y;
            if (modo === "salto") {
                x = red.meta.x; y = red.meta.y;
            } else if (modo === "atajo") {
                var u = Math.min(1, t / 6000);
                x = red.inicio.x + (red.meta.x - red.inicio.x) * u;
                y = red.inicio.y + (red.meta.y - red.inicio.y) * u;
            } else {
                sObj = Math.min(red.largo, Math.max(sObj, est.s) + vel);
                if (sObj > est.s + red.ancho * 0.6) sObj = est.s + red.ancho * 0.6;   // el dedo va con la gema, no se adelanta solo
                var p = puntoEn(red, sObj);
                x = p.x; y = p.y;
                if (modo === "desviado") {
                    var off = Math.sin(t / 240) * (red.tolerancia - 4);
                    var n = normal(p.ang);
                    x += n.x * off; y += n.y * off;
                }
            }
            var antes = { x: est.x, y: est.y };
            var res = conducir(red, est, x, y, dt, cfg);
            r.maxSalto = Math.max(r.maxSalto, dist(antes.x, antes.y, est.x, est.y));
            r.maxLat = Math.max(r.maxLat, Math.abs(est.lat));
            r.maxS = Math.max(r.maxS, est.maxS);
            r.checkpoints += res.checkpoints.length;
            if (res.evento === "fuera") r.fueras++;
            if (res.evento === "perdida") {
                r.perdidas++;
                if (modo === "salto" || modo === "atajo") break;
                tomar(est);
            }
            if (res.evento === "meta") { r.llego = true; r.tiempo = t; break; }
        }
        r.estado = est;
        return r;
    }

    // ------------------------------------------------------------------ redes al azar

    var ZONA = { x0: 350, x1: 1215, y0: 140, y1: 790 };
    var ZONA_VALIDA = { x0: 340, x1: 1225, y0: 140, y1: 790 };

    function fracciones(n) {
        var f = [];
        for (var i = 0; i < n; i++) f.push(Math.round((0.06 + 0.86 * (i + 1) / (n + 1)) * 1000) / 1000);
        return f;
    }

    /**
     * Una red nueva al azar para el nivel. def.aleatoria trae los rangos del nivel (todo en unidades del mundo):
     *   picos [min, max]      cuántas crestas y valles tiene el zigzag (la dificultad sube con el nivel)
     *   diagonal [min, max]   avance en x de cada bajada o subida (más chico = codos más cerrados)
     *   meseta [min, max]     tramo recto arriba o abajo entre codos
     *   entrada, salida       tramo recto al salir del generador y al llegar al reactor
     *   verticales 0..1       probabilidad de que una bajada o subida sea vertical (codo de 90°)
     *   checkpoints           cuántos puntos de control (repartidos a lo largo)
     * El zigzag alterna crestas (arriba) y valles (abajo), se escala en x para llenar la zona de juego y se
     * valida con las mismas reglas del juego (cabe en 4:3, tramos que no se tocan, se puede recorrer). Si tras
     * varios intentos ninguna sirve, queda la red fija del config (def.puntos). azar: función 0..1 (Math.random).
     */
    function generar(def, cfg, azar) {
        var g = def && def.aleatoria;
        if (!g) return def;
        azar = azar || Math.random;
        cfg = cfg || {};
        var ancho = Number(def.ancho) || 100;
        var borde = ancho / 2 + num(cfg, "grosorPared") + 6;
        var yMin = Math.max(ZONA.y0 + borde, 205), yMax = Math.min(ZONA.y1 - borde, 700);
        var banda = (yMax - yMin) * (g.banda || 0.32);
        var rango = function (par, def0) {
            var p = Array.isArray(par) ? par : [def0, def0];
            return p[0] + (p[1] - p[0]) * azar();
        };
        var nCp = Number(g.checkpoints) || (def.checkpoints || []).length || 3;
        for (var intento = 0; intento < 120; intento++) {
            var picos = Math.round(rango(g.picos, 3));
            var y0 = 320 + azar() * 260;
            var arriba = y0 > (yMin + yMax) / 2 ? true : (y0 < (yMin + yMax) / 2 - 40 ? false : azar() < 0.5);
            var P = [[0, y0]];
            var x = rango(g.entrada, 140);
            P.push([x, y0]);
            var y = y0;
            for (var i = 0; i < picos; i++) {
                var yN = arriba ? yMin + azar() * banda : yMax - azar() * banda;
                var vertical = azar() < (Number(g.verticales) || 0);
                x += vertical ? 0 : rango(g.diagonal, 100);
                P.push([x, yN]);
                x += rango(g.meseta, 150);
                P.push([x, yN]);
                y = yN;
                arriba = !arriba;
            }
            // el reactor siempre en la franja central (y 330..590): ni tapa los botones ni se sale abajo
            var yF = 330 + azar() * 260;
            if (Math.abs(yF - y) > 15) {
                x += rango(g.diagonal, 100);
                P.push([x, yF]);
            } else {
                yF = y;
            }
            x += rango(g.salida, 140);
            P.push([x, yF]);
            var k = (ZONA.x1 - ZONA.x0) / x;
            if (k < (Number(g.escalaMin) || 0.7) || k > 1.5) continue;
            var puntos = P.map(function (p) { return [Math.round(ZONA.x0 + p[0] * k), Math.round(p[1])]; });
            // sin puntos repetidos (vertical que cae en la misma x no es problema; misma posición sí)
            var limpio = [puntos[0]];
            for (var q = 1; q < puntos.length; q++) {
                var a = limpio[limpio.length - 1];
                if (Math.hypot(puntos[q][0] - a[0], puntos[q][1] - a[1]) > 8) limpio.push(puntos[q]);
            }
            var cand = {};
            Object.keys(def).forEach(function (kk) { cand[kk] = def[kk]; });
            cand.puntos = limpio;
            cand.checkpoints = fracciones(nCp);
            cand.generada = true;
            var red = construir(cand, cfg);
            if (validar(red, { zona: ZONA_VALIDA }).length) continue;
            if (!simular(red, cfg, "centro").llego) continue;
            return cand;
        }
        return def;
    }

    global.ReglasTuberia = {
        generar: generar,
        ZONA: ZONA_VALIDA,
        DEF: DEF,
        construir: construir,
        puntoEn: puntoEn,
        normal: normal,
        cercano: cercano,
        nuevoEstado: nuevoEstado,
        ubicar: ubicar,
        sCheckpoint: sCheckpoint,
        tocaGema: tocaGema,
        tomar: tomar,
        conducir: conducir,
        soltar: soltar,
        progreso: progreso,
        validar: validar,
        simular: simular
    };
})(typeof window !== "undefined" ? window : global);
