/**
 * ReglasLaser — geometría y decisiones de "El Circuito Láser de la Central de Energía" (window.ReglasLaser).
 * Puro: no toca el DOM ni Phaser, se puede probar con Node (module.exports).
 *
 * Un circuito es un carril con paredes que va del punto de salida al conector del reactor. Se define en
 * config.json con puntos normalizados (0..1 del mundo) unidos por tramos rectos; cada esquina se redondea con
 * un radio (curva × ancho) y el centro se remuestrea a pasos iguales. Las barreras láser se ubican en un tramo
 * recto (seg, t) y tienen su propio ciclo de encendido y apagado.
 *
 *   construir(def, dims, cfg)            → circuito { W, H, ancho, radio, largo, muestras[], laseres[], inicio, meta }
 *   puntoEn(c, s)                        → { x, y, ang } a la distancia s del centro del carril
 *   cercano(c, x, y, sRef, ventana)      → { s, d, lado, x, y, ang } punto del centro más cercano (cerca de sRef)
 *   relojLaser(L) / avanzarLaser(L, r, dt, enBanda) → estado { on, cuenta, restante, avisoEncender }
 *   mover(c, pil, objetivo, dt, cfg, estados) → { evento: null|"pared"|"laser"|"meta", laser, s }
 *   validar(c) · simular(c, cfg, modo)   comprobaciones del circuito (las usa la prueba de Node)
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.ReglasLaser = api;
})(typeof window !== "undefined" ? window : this, function () {
    "use strict";

    var CUENTA_MS = 3000;     // el contador 3, 2, 1 dura los últimos 3 s del encendido
    var AVISO_ENCENDER_MS = 1200;

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

    // ------------------------------------------------------------------ construcción

    /** Puntos del mundo a partir de los normalizados del config. */
    function puntosMundo(def, W, H) {
        return (def.puntos || []).map(function (p) { return { x: p[0] * W, y: p[1] * H }; });
    }

    /** Polilínea densa con las esquinas redondeadas (Bézier cuadrática con control en la esquina). */
    function polilinea(P, rc) {
        var out = [{ x: P[0].x, y: P[0].y }];
        for (var i = 1; i < P.length; i++) {
            var a = P[i - 1], b = P[i];
            var esquina = i < P.length - 1;
            if (!esquina) {
                agregarRecta(out, b.x, b.y);
                continue;
            }
            var c = P[i + 1];
            var l1 = dist(a.x, a.y, b.x, b.y), l2 = dist(b.x, b.y, c.x, c.y);
            var r = Math.min(rc, l1 * 0.48, l2 * 0.48);
            var e1 = { x: b.x + (a.x - b.x) / l1 * r, y: b.y + (a.y - b.y) / l1 * r };
            var e2 = { x: b.x + (c.x - b.x) / l2 * r, y: b.y + (c.y - b.y) / l2 * r };
            agregarRecta(out, e1.x, e1.y);
            var n = Math.max(8, Math.ceil(r / 3));
            for (var k = 1; k <= n; k++) {
                var u = k / n;
                var x = (1 - u) * (1 - u) * e1.x + 2 * (1 - u) * u * b.x + u * u * e2.x;
                var y = (1 - u) * (1 - u) * e1.y + 2 * (1 - u) * u * b.y + u * u * e2.y;
                out.push({ x: x, y: y });
            }
        }
        return out;
    }

    function agregarRecta(out, x, y) {
        var u = out[out.length - 1];
        var l = dist(u.x, u.y, x, y);
        var n = Math.max(1, Math.ceil(l / 2));
        for (var k = 1; k <= n; k++) out.push({ x: u.x + (x - u.x) * k / n, y: u.y + (y - u.y) * k / n });
    }

    /** Remuestreo a distancias iguales (paso) con ángulo de marcha. */
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
     * Circuito listo para jugar. def: { id, nombre, ancho, radio, curva, puntos[[nx,ny]], laseres[{ seg, t, enc, apag, fase }] }.
     * dims: { W, H } del mundo. cfg: bloque "juego" del config (paso, grosorPared, bandaLaser, tolerancia…).
     */
    function construir(def, dims, cfg) {
        cfg = cfg || {};
        var W = dims.W, H = dims.H;
        var ancho = Number(def.ancho) || 120;
        var radio = Number(def.radio) || ancho * 0.23;
        var P = puntosMundo(def, W, H);
        var rc = (Number(def.curva) || 0.8) * ancho;
        var poli = polilinea(P, rc);
        var rm = remuestrear(poli, Number(cfg.paso) || 4);
        var c = {
            id: def.id,
            nombre: def.nombre || "",
            W: W,
            H: H,
            ancho: ancho,
            radio: radio,
            pared: Number(cfg.grosorPared) || 16,
            banda: (Number(cfg.bandaLaser) || 0.16) * ancho,
            limite: ancho / 2 - radio + (Number(cfg.toleranciaPared) || 0.45) * radio,
            puntos: P,
            muestras: rm.muestras,
            largo: rm.largo,
            paso: rm.paso,
            inicio: { x: P[0].x, y: P[0].y },
            laseres: []
        };
        var fin = rm.muestras[rm.muestras.length - 1];
        c.meta = { x: fin.x, y: fin.y, ang: fin.ang };
        (def.laseres || []).forEach(function (d, i) {
            var a = P[d.seg], b = P[d.seg + 1];
            if (!a || !b) return;
            var t = d.t == null ? 0.5 : d.t;
            var x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
            var cer = cercano(c, x, y, null, null);
            c.laseres.push({
                id: i,
                s: cer.s,
                x: cer.x,
                y: cer.y,
                ang: cer.ang,
                enc: Math.max(CUENTA_MS, Number(d.enc) || 4000),
                apag: Math.max(1500, Number(d.apag) || 3000),
                fase: Number(d.fase) || 0
            });
        });
        return c;
    }

    // ------------------------------------------------------------------ consultas geométricas

    function puntoEn(c, s) {
        var m = c.muestras;
        var f = clamp(s, 0, c.largo) / c.paso;
        var i = Math.floor(f);
        if (i >= m.length - 1) return { x: m[m.length - 1].x, y: m[m.length - 1].y, ang: m[m.length - 1].ang, s: c.largo };
        var u = f - i;
        var a = m[i], b = m[i + 1];
        var da = b.ang - a.ang;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, ang: a.ang + da * u, s: clamp(s, 0, c.largo) };
    }

    /**
     * Punto del centro más cercano a (x, y). Con sRef y ventana busca solo cerca de sRef (para no saltar a un
     * carril vecino a través de la pared en los zigzag). lado: + a la izquierda de la marcha.
     */
    function cercano(c, x, y, sRef, ventana) {
        var m = c.muestras;
        var i0 = 0, i1 = m.length - 1;
        if (sRef != null && ventana != null) {
            i0 = Math.max(0, Math.floor((sRef - ventana) / c.paso));
            i1 = Math.min(m.length - 1, Math.ceil((sRef + ventana) / c.paso));
        }
        var mejor = null;
        for (var i = i0; i < i1; i++) {
            var a = m[i], b = m[i + 1];
            var vx = b.x - a.x, vy = b.y - a.y;
            var l2 = vx * vx + vy * vy || 1;
            var u = clamp(((x - a.x) * vx + (y - a.y) * vy) / l2, 0, 1);
            var px = a.x + vx * u, py = a.y + vy * u;
            var d = dist(x, y, px, py);
            if (!mejor || d < mejor.d) {
                var lado = vx * (y - a.y) - vy * (x - a.x);
                mejor = { s: a.s + (b.s - a.s) * u, d: d, lado: lado < 0 ? 1 : -1, x: px, y: py, ang: Math.atan2(vy, vx) };
            }
        }
        if (!mejor) {
            var p = m[i0];
            mejor = { s: p.s, d: dist(x, y, p.x, p.y), lado: 1, x: p.x, y: p.y, ang: p.ang };
        }
        return mejor;
    }

    // ------------------------------------------------------------------ láseres

    /** Reloj de una barrera: avanza solo; si iba a encenderse con la esfera dentro del rayo, espera (nunca la atrapa). */
    function relojLaser(L) {
        return { t: L.fase % (L.enc + L.apag) };
    }

    function estadoLaser(L, r) {
        var ciclo = L.enc + L.apag;
        var u = ((r.t % ciclo) + ciclo) % ciclo;
        if (u < L.enc) {
            var resta = L.enc - u;
            return { on: true, restante: resta, cuenta: resta <= CUENTA_MS ? Math.ceil(resta / 1000) : 0, avisoEncender: false };
        }
        var resta2 = ciclo - u;
        return { on: false, restante: resta2, cuenta: 0, avisoEncender: resta2 <= AVISO_ENCENDER_MS };
    }

    function avanzarLaser(L, r, dt, enBanda) {
        var antes = estadoLaser(L, r);
        r.t += dt;
        var despues = estadoLaser(L, r);
        if (!antes.on && despues.on && enBanda) {
            // la esfera está cruzando: el láser espera apagado a que termine de pasar
            r.t -= dt;
            return estadoLaser(L, r);
        }
        return despues;
    }

    function enBanda(c, L, s) {
        return Math.abs(s - L.s) < c.radio + c.banda / 2;
    }

    // ------------------------------------------------------------------ movimiento de la esfera

    /**
     * Mueve la esfera hacia el objetivo (dedo) con una inercia pequeña y velocidad máxima. Sub-pasos cortos para no
     * atravesar paredes ni rayos. Al tocar la pared o un rayo encendido se detiene ahí y devuelve el evento; la
     * escena decide el retroceso. pil: { x, y, s }. estados: estado de cada láser (mismo orden que c.laseres).
     */
    function mover(c, pil, objetivo, dt, cfg, estados) {
        cfg = cfg || {};
        var res = { evento: null, laser: -1, s: pil.s, d: 0, lado: 1 };
        if (!objetivo) return res;
        var k = Number(cfg.seguimiento) || 22;            // respuesta por segundo (inercia visual)
        var vmax = Number(cfg.velocidadMax) || 1400;      // unidades del mundo por segundo
        var dx = objetivo.x - pil.x, dy = objetivo.y - pil.y;
        var f = Math.min(1, k * dt / 1000);
        var mx = dx * f, my = dy * f;
        var l = Math.hypot(mx, my);
        var lim = vmax * dt / 1000;
        if (l > lim) { mx *= lim / l; my *= lim / l; l = lim; }
        if (l < 0.01) return res;
        var n = Math.max(1, Math.ceil(l / (c.radio * 0.35)));
        var t0 = c.muestras[0];
        var tx = Math.cos(t0.ang), ty = Math.sin(t0.ang);
        for (var i = 1; i <= n; i++) {
            var qx = pil.x + mx / n, qy = pil.y + my / n;
            // detrás de la salida hay una tapa: la esfera no sale por ahí (sin choque, solo se detiene)
            var atras = (qx - t0.x) * tx + (qy - t0.y) * ty;
            if (atras < 0) { qx -= tx * atras; qy -= ty * atras; }
            var cer = cercano(c, qx, qy, pil.s, c.radio * 3 + l + c.paso * 2);
            if (cer.d > c.limite) {
                res.evento = "pared";
                res.s = pil.s;
                res.d = cer.d;
                res.lado = cer.lado;
                // punto de la pared que tocó (para las chispas): lado + es la izquierda de la marcha
                res.px = cer.x + Math.cos(cer.ang - Math.PI / 2) * cer.lado * (c.ancho / 2);
                res.py = cer.y + Math.sin(cer.ang - Math.PI / 2) * cer.lado * (c.ancho / 2);
                return res;
            }
            for (var j = 0; j < c.laseres.length; j++) {
                var L = c.laseres[j];
                var est = estados && estados[j];
                if (!est || !est.on) continue;
                var antes = pil.s - L.s, despues = cer.s - L.s;
                var cruza = (antes < 0) !== (despues < 0);
                if (enBanda(c, L, cer.s) && !enBanda(c, L, pil.s) || cruza) {
                    res.evento = "laser";
                    res.laser = j;
                    res.s = pil.s;
                    return res;
                }
            }
            pil.x = qx;
            pil.y = qy;
            pil.s = cer.s;
            if (cer.s >= c.largo - c.radio * 0.8) {
                res.evento = "meta";
                res.s = cer.s;
                return res;
            }
        }
        res.s = pil.s;
        return res;
    }

    /** Distancia a la que retrocede la esfera tras un choque (sobre el centro del carril, sin perder lo avanzado). */
    function sRetroceso(c, s, cfg, laser) {
        cfg = cfg || {};
        if (laser != null && c.laseres[laser]) {
            var L = c.laseres[laser];
            var lado = s <= L.s ? -1 : 1;
            return clamp(L.s + lado * (c.radio + c.banda / 2 + c.ancho * (Number(cfg.retrocesoLaser) || 0.55)), 0, c.largo);
        }
        return clamp(s - c.ancho * (Number(cfg.retrocesoPared) || 0.4), 0, c.largo);
    }

    // ------------------------------------------------------------------ validación y simulación

    /** Dentro del mundo, carriles que no se tocan entre sí, láseres en tramos rectos y lejos de la salida y la meta. */
    function validar(c) {
        var errores = [];
        var m = c.muestras;
        var borde = c.ancho / 2 + c.pared;
        m.forEach(function (p) {
            if (p.x < borde - 1 || p.y < borde - 1 || p.x > c.W - borde + 1 || p.y > c.H - borde + 1) errores.push("fuera");
        });
        var sep = c.ancho + c.pared * 2;
        var paso = Math.max(1, Math.round(6 / c.paso));
        for (var i = 0; i < m.length; i += paso) {
            for (var j = i + paso; j < m.length; j += paso) {
                if (m[j].s - m[i].s < c.ancho * 2.6) continue;
                if (dist(m[i].x, m[i].y, m[j].x, m[j].y) < sep - 1) {
                    errores.push("carriles juntos s=" + Math.round(m[i].s) + "/" + Math.round(m[j].s));
                    j = m.length;
                    i += 20;
                }
            }
        }
        c.laseres.forEach(function (L, k) {
            var a = puntoEn(c, L.s - c.ancho * 0.8), b = puntoEn(c, L.s + c.ancho * 0.8);
            var dg = Math.abs(Math.atan2(Math.sin(b.ang - a.ang), Math.cos(b.ang - a.ang)));
            if (dg > 0.05) errores.push("láser " + k + " en curva");
            if (L.s < c.ancho * 2 || L.s > c.largo - c.ancho * 2) errores.push("láser " + k + " muy cerca de la salida o la meta");
            c.laseres.forEach(function (L2, k2) {
                if (k2 > k && Math.abs(L2.s - L.s) < c.ancho * 3) errores.push("láseres " + k + " y " + k2 + " juntos");
            });
        });
        return errores;
    }

    /**
     * Simula la partida con el mismo mover del juego.
     *   "cuidadoso": un dedo que sigue el centro del carril y espera antes de cada rayo encendido → debe llegar sin choques.
     *   "apurado":   el mismo dedo, sin esperar → debe chocar con algún rayo y, aun así, terminar (nunca se traba).
     *   "zigzag":    el dedo se desvía hacia los lados → debe tocar la pared y la esfera no sale del carril.
     */
    function simular(c, cfg, modo) {
        cfg = cfg || {};
        var dt = 16;
        var pil = { x: c.inicio.x, y: c.inicio.y, s: 0 };
        var relojes = c.laseres.map(relojLaser);
        var estados = c.laseres.map(function (L, i) { return estadoLaser(L, relojes[i]); });
        var sObj = 0;
        var vel = (Number(cfg.velocidadSim) || 260) * dt / 1000;
        var r = { llego: false, paredes: 0, laseres: 0, maxFuera: 0, tiempo: 0, retrocesoMax: 0, esperas: 0 };
        var espera = 0;
        for (var t = 0; t < 240000; t += dt) {
            estados = c.laseres.map(function (L, i) { return avanzarLaser(L, relojes[i], dt, enBanda(c, L, pil.s)); });
            if (espera > 0) { espera -= dt; continue; }
            // el dedo avanza por el centro; el cuidadoso se detiene antes de un rayo encendido
            var frenar = false;
            if (modo !== "apurado") {
                c.laseres.forEach(function (L, i) {
                    var ant = L.s - (c.radio + c.banda / 2 + c.ancho * 0.25);
                    if (pil.s < L.s && sObj + vel > ant && (estados[i].on || estados[i].avisoEncender)) frenar = true;
                });
            }
            if (frenar) r.esperas++;
            else sObj = Math.min(c.largo, Math.max(sObj, pil.s - c.ancho * 0.2) + vel);
            var obj = puntoEn(c, sObj);
            if (modo === "zigzag") {
                var off = Math.sin(t / 260) * c.ancho * 0.75;
                obj = { x: obj.x + Math.cos(obj.ang - Math.PI / 2) * off, y: obj.y + Math.sin(obj.ang - Math.PI / 2) * off };
            }
            var res = mover(c, pil, obj, dt, cfg, estados);
            var cer = cercano(c, pil.x, pil.y, pil.s, c.ancho);
            r.maxFuera = Math.max(r.maxFuera, cer.d);
            if (res.evento === "meta") { r.llego = true; r.tiempo = t; break; }
            if (res.evento === "pared" || res.evento === "laser") {
                if (res.evento === "pared") r.paredes++;
                else r.laseres++;
                var s2 = sRetroceso(c, pil.s, cfg, res.evento === "laser" ? res.laser : null);
                r.retrocesoMax = Math.max(r.retrocesoMax, pil.s - s2);
                var p = puntoEn(c, s2);
                pil.x = p.x; pil.y = p.y; pil.s = s2;
                sObj = s2;
                espera = res.evento === "laser" ? 500 : 300;
            }
        }
        return r;
    }

    return {
        CUENTA_MS: CUENTA_MS,
        construir: construir,
        puntoEn: puntoEn,
        cercano: cercano,
        relojLaser: relojLaser,
        estadoLaser: estadoLaser,
        avanzarLaser: avanzarLaser,
        enBanda: enBanda,
        mover: mover,
        sRetroceso: sRetroceso,
        validar: validar,
        simular: simular
    };
});
