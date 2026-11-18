/**
 * ReglasGravedad — geometría y decisiones de "La Pista de Gravedad y Trampolines" (puro: sin DOM ni three.js;
 * se puede cargar en Node con require para las pruebas).
 *
 * La pista se describe en config.json como una "tortuga" que avanza: recto (con rampa si lleva dh), curva, salto
 * (trampolín + vuelo sobre un muro o un vacío) y meta. construir() la convierte en piezas con altura:
 *   recto  rectángulo orientado; la altura sube o baja de forma lineal a lo largo (rampa)
 *   curva  sector de corona; la altura puede cambiar a lo largo del arco
 *   meta   disco plano
 * Coordenadas del mundo: x a la derecha, z hacia la cámara, h = altura. El rumbo θ=0 mira a +x y θ=90° a -z (hacia el
 * fondo de la pantalla); un ángulo de curva positivo gira a la izquierda.
 *
 * La esfera solo se mueve por la superficie: el borde de la pista la detiene (desliza junto a la baranda) y un cambio
 * de altura brusco (muro, otra plataforma) también. Lo único que la hace caer son los agujeros. Los trampolines la
 * lanzan por una parábola fija hasta un punto de aterrizaje seguro (nunca a una zona inaccesible).
 */
(function (global) {
    "use strict";

    var RAD = Math.PI / 180;
    var EPS = 0.04;

    function dirDe(th) { return { x: Math.cos(th), z: -Math.sin(th) }; }
    function izqDe(th) { return { x: -Math.sin(th), z: -Math.cos(th) }; }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

    var DEF = {
        radioEsfera: 0.45,
        velocidadMax: 4.2,
        aceleracionMax: 7.5,
        respuesta: 3.4,
        ganancia: 2.2,
        freno: 2.4,
        gravedad: 5.5,
        toleranciaAltura: 0.35,
        sonda: 0.3,
        margenCaida: 0.22,
        distanciaAlerta: 0.85,
        radioSeguro: 1.7,
        radioMeta: 1.5,
        radioTrampolin: 0.95,
        duracionSalto: 1.2,
        alturaSalto: 2.4
    };

    function opciones(cfg) {
        var o = {};
        Object.keys(DEF).forEach(function (k) { o[k] = num(cfg && cfg[k], DEF[k]); });
        return o;
    }

    // ------------------------------------------------------------------ construcción

    /**
     * def: { id, ancho, inicio: { x, z, h, rumbo }, tramos: [ … ] }
     * Devuelve la pista: piezas, agujeros, postes, trampolines, muros, seguros, ruta, meta, salida.
     */
    function construir(def, cfg) {
        var o = opciones(cfg);
        var ini = def.inicio || {};
        var tor = { x: num(ini.x, 0), z: num(ini.z, 0), h: num(ini.h, 0), th: num(ini.rumbo, 0) * RAD, w: num(def.ancho, 3.4) };
        var P = {
            id: def.id || "pista",
            nombre: def.nombre || "",
            opciones: o,
            piezas: [],
            agujeros: [],
            postes: [],
            trampolines: [],
            muros: [],
            seguros: [],
            ruta: [],
            meta: null,
            salida: null
        };
        var cerrarSiguiente = false;

        function agregarRuta(x, z, h, extra) {
            var p = { x: x, z: z, h: h };
            if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
            P.ruta.push(p);
        }

        function seguro(x, z, h) {
            P.seguros.push({ id: "s" + P.seguros.length, x: x, z: z, h: h, idx: P.seguros.length });
        }

        (def.tramos || []).forEach(function (c, ci) {
            var tipo = c.t || c.tipo;
            var w = num(c.ancho, tor.w);
            if (tipo === "recto") {
                var L = num(c.largo, 4);
                var dh = num(c.dh, 0);
                var d = dirDe(tor.th);
                var iz = izqDe(tor.th);
                var pz = {
                    id: "p" + P.piezas.length, tipo: "recto", orden: ci,
                    ox: tor.x, oz: tor.z, th: tor.th, L: L, w: w, h0: tor.h, h1: tor.h + dh,
                    puente: !!c.puente, inicioCerrado: cerrarSiguiente, finCerrado: false,
                    agujeros: [], postes: []
                };
                cerrarSiguiente = false;
                var lp = function (u, v) { return { x: tor.x + d.x * u + iz.x * v, z: tor.z + d.z * u + iz.z * v }; };
                (c.agujeros || []).forEach(function (a) {
                    var u = num(a.t, 0.5) * L;
                    var q = lp(u, num(a.lado, 0));
                    var A = { id: "a" + P.agujeros.length, x: q.x, z: q.z, r: num(a.r, 0.95), h: pz.h0 + (pz.h1 - pz.h0) * u / L, pieza: pz.id, u: u, v: num(a.lado, 0) };
                    P.agujeros.push(A);
                    pz.agujeros.push(A);
                });
                (c.postes || []).forEach(function (a) {
                    var u = num(a.t, 0.5) * L;
                    var q = lp(u, num(a.lado, 0));
                    var B = { id: "o" + P.postes.length, x: q.x, z: q.z, r: num(a.r, 0.4), h: pz.h0 + (pz.h1 - pz.h0) * u / L, pieza: pz.id, u: u, v: num(a.lado, 0) };
                    P.postes.push(B);
                    pz.postes.push(B);
                });
                P.piezas.push(pz);
                if (!P.salida) {
                    var s0 = lp(Math.min(1.6, L / 2), 0);
                    P.salida = { x: s0.x, z: s0.z, h: pz.h0, rumbo: tor.th };
                    seguro(s0.x, s0.z, pz.h0);
                }
                // ruta del recorrido: por el carril libre cuando hay agujeros o postes
                var lado = 0;
                if (c.ruta != null) lado = num(c.ruta, 0);
                else {
                    var obst = pz.agujeros.concat(pz.postes);
                    if (obst.length) {
                        var suma = obst.reduce(function (s, a) { return s + a.v; }, 0);
                        lado = (suma > 0 ? -1 : 1) * Math.max(0, w / 2 - 0.6);
                    }
                }
                if (P.seguros.length && c.seguro) {
                    // el punto seguro va por el carril libre, lejos de los agujeros
                    var us = Math.min(1.2, L / 2);
                    var sq = lp(us, lado);
                    seguro(sq.x, sq.z, pz.h0 + (pz.h1 - pz.h0) * us / L);
                }
                var siguiente = (def.tramos || [])[ci + 1];
                var terminaEnSalto = siguiente && (siguiente.t || siguiente.tipo) === "salto";
                var uFin = terminaEnSalto ? L - 1.4 : L;
                var hDe = function (u) { return pz.h0 + (pz.h1 - pz.h0) * u / L; };
                var pasos = Math.max(1, Math.round(uFin / 1.6));
                for (var k = 1; k <= pasos; k++) {
                    var u = uFin * k / pasos;
                    var vv = lado;
                    if (lado !== 0) {
                        // entra y sale del carril libre suavemente
                        var obstU = pz.agujeros.concat(pz.postes).map(function (a) { return a.u; });
                        var cerca = obstU.some(function (au) { return Math.abs(au - u) < 2.6; });
                        vv = cerca ? lado : lado * 0.25;
                    }
                    if (terminaEnSalto && k === pasos) vv = 0;
                    var q2 = lp(u, vv);
                    agregarRuta(q2.x, q2.z, hDe(u), terminaEnSalto && k === pasos ? { tipo: "trampolin" } : null);
                }
                tor.x += d.x * L;
                tor.z += d.z * L;
                tor.h += dh;
            } else if (tipo === "curva") {
                var R = num(c.radio, 4);
                var al = num(c.angulo, 90) * RAD;
                var dhc = num(c.dh, 0);
                var sg = al >= 0 ? 1 : -1;
                var iz0 = izqDe(tor.th);
                var cx = tor.x + sg * iz0.x * R;
                var cz = tor.z + sg * iz0.z * R;
                var pc = {
                    id: "p" + P.piezas.length, tipo: "curva", orden: ci,
                    cx: cx, cz: cz, R: R, w: w, th0: tor.th, alfa: al, h0: tor.h, h1: tor.h + dhc,
                    ox: tor.x, oz: tor.z, inicioCerrado: cerrarSiguiente, finCerrado: false
                };
                cerrarSiguiente = false;
                P.piezas.push(pc);
                var largoArco = Math.abs(al) * R;
                var n = Math.max(2, Math.round(largoArco / 1.5));
                for (var j = 1; j <= n; j++) {
                    var q3 = puntoCurva(pc, j / n, 0);
                    agregarRuta(q3.x, q3.z, pc.h0 + (pc.h1 - pc.h0) * j / n);
                }
                if (c.seguro) {
                    var qs = puntoCurva(pc, 0.15, 0);
                    seguro(qs.x, qs.z, pc.h0 + (pc.h1 - pc.h0) * 0.15);
                }
                var fin = puntoCurva(pc, 1, 0);
                tor.x = fin.x;
                tor.z = fin.z;
                tor.th += al;
                tor.h += dhc;
            } else if (tipo === "salto") {
                var prev = P.piezas[P.piezas.length - 1];
                if (!prev || prev.tipo !== "recto") throw new Error("[ReglasGravedad] un salto necesita un recto antes");
                prev.finCerrado = true;
                var dS = dirDe(tor.th);
                var izS = izqDe(tor.th);
                var gap = num(c.largo, 2.6);
                var dhS = num(c.dh, 0);
                var ladoS = num(c.lado, 0);
                var tx = tor.x - dS.x * 1.4;
                var tz = tor.z - dS.z * 1.4;
                // nueva posición de la tortuga: al otro lado del vacío (y desplazada si cambia de carril)
                var nx = tor.x + dS.x * gap + izS.x * ladoS;
                var nz = tor.z + dS.z * gap + izS.z * ladoS;
                var nh = tor.h + dhS;
                var dest = { x: nx + dS.x * 1.7, z: nz + dS.z * 1.7, h: nh };
                var tr = {
                    id: "t" + P.trampolines.length,
                    x: tx, z: tz, h: prev.h1, r: o.radioTrampolin,
                    rumbo: tor.th,
                    destino: dest,
                    muro: c.muro !== false,
                    alto: 0
                };
                if (tr.muro) {
                    var mu = {
                        id: "m" + P.muros.length,
                        x: tor.x + dS.x * gap / 2 + izS.x * ladoS / 2,
                        z: tor.z + dS.z * gap / 2 + izS.z * ladoS / 2,
                        th: tor.th,
                        ancho: w + 1.2 + Math.abs(ladoS),
                        grosor: Math.min(0.6, gap * 0.35),
                        hBase: Math.min(tor.h, nh) - 1.2,
                        hTop: Math.max(tor.h, nh) + num(c.altoMuro, 1.6)
                    };
                    P.muros.push(mu);
                    tr.muroId = mu.id;
                    tr.alto = Math.max(o.alturaSalto, mu.hTop - Math.max(tor.h, nh) + 1.3);
                } else {
                    tr.alto = o.alturaSalto;
                }
                P.trampolines.push(tr);
                // la ruta: trampolín → vuelo → aterrizaje
                if (P.ruta.length) P.ruta[P.ruta.length - 1].trampolin = tr.id;
                agregarRuta(dest.x, dest.z, dest.h, { tipo: "aterrizaje", trampolin: tr.id });
                tor.x = nx;
                tor.z = nz;
                tor.h = nh;
                cerrarSiguiente = true;
                seguro(dest.x, dest.z, dest.h);
                P.seguros[P.seguros.length - 1].trampolin = tr.id;
            } else if (tipo === "meta") {
                var r = num(c.radio, 2.8);
                var dM = dirDe(tor.th);
                var m = { id: "p" + P.piezas.length, tipo: "meta", orden: ci, cx: tor.x + dM.x * (r - 0.3), cz: tor.z + dM.z * (r - 0.3), r: r, h: tor.h, h0: tor.h, h1: tor.h, inicioCerrado: cerrarSiguiente };
                cerrarSiguiente = false;
                P.piezas.push(m);
                P.meta = { x: m.cx, z: m.cz, h: m.h, r: r, pieza: m.id };
                agregarRuta(m.cx, m.cz, m.h, { tipo: "meta" });
            }
        });
        // distancia acumulada de la ruta (progreso y ayudas)
        P.ruta.unshift({ x: P.salida.x, z: P.salida.z, h: P.salida.h, tipo: "salida" });
        var acum = 0;
        P.ruta.forEach(function (p, i) {
            if (i > 0) acum += Math.hypot(p.x - P.ruta[i - 1].x, p.z - P.ruta[i - 1].z);
            p.s = acum;
        });
        P.largo = acum;
        P.seguros.forEach(function (s) { s.s = progresoEn(P, s.x, s.z).s; });
        return P;
    }

    function puntoCurva(pc, s, v) {
        var sg = pc.alfa >= 0 ? 1 : -1;
        var th = pc.th0 + pc.alfa * s;
        var iz = izqDe(th);
        // centro - sg*izq(θ)*(R - sg*v): v positivo = a la izquierda del rumbo
        var rr = pc.R - sg * v;
        return { x: pc.cx - sg * iz.x * rr, z: pc.cz - sg * iz.z * rr, th: th };
    }

    // ------------------------------------------------------------------ superficie

    /** Altura de una pieza en (x, z), o null si el punto no está sobre ella. También la pendiente (gx, gz). */
    function enPieza(pz, x, z) {
        if (pz.tipo === "recto") {
            var d = dirDe(pz.th);
            var iz = izqDe(pz.th);
            var dx = x - pz.ox, dz = z - pz.oz;
            var u = dx * d.x + dz * d.z;
            var v = dx * iz.x + dz * iz.z;
            if (u < -EPS || u > pz.L + EPS || Math.abs(v) > pz.w / 2) return null;
            var sl = (pz.h1 - pz.h0) / pz.L;
            return { h: pz.h0 + sl * clamp(u, 0, pz.L), gx: d.x * sl, gz: d.z * sl, pieza: pz, u: u, v: v };
        }
        if (pz.tipo === "curva") {
            var ex = x - pz.cx, ez = z - pz.cz;
            var rho = Math.hypot(ex, ez);
            if (Math.abs(rho - pz.R) > pz.w / 2) return null;
            var v0x = pz.ox - pz.cx, v0z = pz.oz - pz.cz;
            // ángulo con signo en el plano (X = x, Y = -z): positivo = antihorario = giro a la izquierda
            var cross = v0x * (-ez) - (-v0z) * ex;
            var dot = v0x * ex + v0z * ez;
            var ang = Math.atan2(cross, dot);
            var s = ang / pz.alfa;
            var tol = EPS / (Math.abs(pz.alfa) * pz.R);
            if (s < -tol || s > 1 + tol) return null;
            var sc = clamp(s, 0, 1);
            var tg = dirDe(pz.th0 + pz.alfa * sc);
            var slc = (pz.h1 - pz.h0) / (Math.abs(pz.alfa) * Math.max(0.5, rho));
            return { h: pz.h0 + (pz.h1 - pz.h0) * sc, gx: tg.x * slc, gz: tg.z * slc, pieza: pz, u: sc, v: 0 };
        }
        if (pz.tipo === "meta") {
            if (Math.hypot(x - pz.cx, z - pz.cz) > pz.r) return null;
            return { h: pz.h, gx: 0, gz: 0, pieza: pz, u: 0, v: 0 };
        }
        return null;
    }

    /** La superficie en (x, z) más cercana a la altura hRef (si hRef es null, la más alta). */
    function superficie(P, x, z, hRef) {
        var mejor = null;
        var md = Infinity;
        for (var i = 0; i < P.piezas.length; i++) {
            var r = enPieza(P.piezas[i], x, z);
            if (!r) continue;
            var dd = hRef == null ? -r.h : Math.abs(r.h - hRef);
            if (dd < md) {
                md = dd;
                mejor = r;
            }
        }
        if (mejor && hRef != null && md > P.opciones.toleranciaAltura) return null;
        return mejor;
    }

    function enPoste(P, x, z, extra) {
        for (var i = 0; i < P.postes.length; i++) {
            var b = P.postes[i];
            if (Math.hypot(x - b.x, z - b.z) < b.r + extra) return b;
        }
        return null;
    }

    /** ¿Puede estar el centro de la esfera en (x, z)? Superficie bajo el centro y bajo cuatro sondas alrededor. */
    function valida(P, x, z, hRef) {
        var o = P.opciones;
        var s = superficie(P, x, z, hRef);
        if (!s) return null;
        var m = o.sonda;
        if (!superficie(P, x + m, z, s.h) || !superficie(P, x - m, z, s.h) || !superficie(P, x, z + m, s.h) || !superficie(P, x, z - m, s.h)) return null;
        if (enPoste(P, x, z, o.radioEsfera * 0.9)) return null;
        return s;
    }

    // ------------------------------------------------------------------ movimiento

    function nuevoEstado(P, punto) {
        var p = punto || P.salida;
        return { x: p.x, z: p.z, h: p.h, vx: 0, vz: 0, seguro: 0, alertas: {} };
    }

    /**
     * Un paso de física. ctrl: { modo: "punto", x, z } (el dedo atrae a la esfera), { modo: "dir", dx, dz } (teclado)
     * o null (suelta: frena poco a poco). Devuelve los eventos del paso.
     */
    function paso(P, e, ctrl, dt) {
        var o = P.opciones;
        dt = clamp(dt || 0.016, 0, 0.05);
        var ev = { pared: false, agujero: null, cerca: null, trampolin: null, meta: false, seguro: null, pendiente: 0 };
        var ax = 0, az = 0;
        if (ctrl && ctrl.modo === "punto") {
            var ex = ctrl.x - e.x, ez = ctrl.z - e.z;
            var dist = Math.hypot(ex, ez);
            var vdes = dist < 0.12 ? 0 : Math.min(o.velocidadMax * (ctrl.factor || 1), dist * o.ganancia);
            var dvx = (dist > 0 ? ex / dist * vdes : 0) - e.vx;
            var dvz = (dist > 0 ? ez / dist * vdes : 0) - e.vz;
            ax = dvx * o.respuesta;
            az = dvz * o.respuesta;
        } else if (ctrl && ctrl.modo === "dir") {
            var dl = Math.hypot(ctrl.dx, ctrl.dz) || 1;
            var vd = o.velocidadMax * 0.85;
            ax = (ctrl.dx / dl * vd - e.vx) * o.respuesta;
            az = (ctrl.dz / dl * vd - e.vz) * o.respuesta;
        } else {
            ax = -e.vx * o.freno;
            az = -e.vz * o.freno;
        }
        var al = Math.hypot(ax, az);
        if (al > o.aceleracionMax) {
            ax *= o.aceleracionMax / al;
            az *= o.aceleracionMax / al;
        }
        // gravedad: las rampas empujan hacia abajo (aceleran al bajar y frenan al subir)
        var s0 = superficie(P, e.x, e.z, e.h);
        if (s0) {
            ax -= o.gravedad * s0.gx;
            az -= o.gravedad * s0.gz;
            ev.pendiente = Math.hypot(s0.gx, s0.gz);
        }
        e.vx += ax * dt;
        e.vz += az * dt;
        var sp = Math.hypot(e.vx, e.vz);
        var tope = o.velocidadMax * 1.35;
        if (sp > tope) {
            e.vx *= tope / sp;
            e.vz *= tope / sp;
            sp = tope;
        }
        if (sp < 0.004 && !ctrl) {
            e.vx = 0;
            e.vz = 0;
        }
        // movimiento en sub-pasos: el borde detiene y la esfera desliza junto a la baranda
        var n = Math.max(1, Math.ceil(sp * dt / 0.05));
        var h = dt / n;
        for (var i = 0; i < n; i++) {
            var nx = e.x + e.vx * h, nz = e.z + e.vz * h;
            var s = valida(P, nx, nz, e.h);
            if (s) {
                e.x = nx; e.z = nz; e.h = s.h;
                continue;
            }
            ev.pared = true;
            // un poste: la esfera lo rodea (se quita la parte de la velocidad que lo empuja)
            var b = enPoste(P, nx, nz, o.radioEsfera * 0.9);
            if (b) {
                var bnx = e.x - b.x, bnz = e.z - b.z;
                var bl = Math.hypot(bnx, bnz) || 1;
                bnx /= bl; bnz /= bl;
                var vn = e.vx * bnx + e.vz * bnz;
                if (vn < 0) {
                    e.vx -= vn * bnx;
                    e.vz -= vn * bnz;
                }
                var tx2 = e.x + e.vx * h, tz2 = e.z + e.vz * h;
                var st = valida(P, tx2, tz2, e.h);
                if (st) {
                    e.x = tx2; e.z = tz2; e.h = st.h;
                    continue;
                }
            }
            var sx = valida(P, nx, e.z, e.h);
            if (sx) {
                e.x = nx; e.h = sx.h;
                e.vz *= -0.15;
                continue;
            }
            var sz = valida(P, e.x, nz, e.h);
            if (sz) {
                e.z = nz; e.h = sz.h;
                e.vx *= -0.15;
                continue;
            }
            e.vx *= -0.2;
            e.vz *= -0.2;
            break;
        }
        // agujeros, trampolines, puntos seguros y meta
        var cercaD = Infinity;
        for (var a = 0; a < P.agujeros.length; a++) {
            var A = P.agujeros[a];
            if (Math.abs(A.h - e.h) > 0.6) continue;
            var d = Math.hypot(e.x - A.x, e.z - A.z);
            if (d < A.r - o.margenCaida) ev.agujero = A.id;
            else if (d < A.r + o.distanciaAlerta && d < cercaD) {
                cercaD = d;
                ev.cerca = A.id;
            }
        }
        if (!ev.agujero) {
            for (var t = 0; t < P.trampolines.length; t++) {
                var T = P.trampolines[t];
                if (Math.abs(T.h - e.h) < 0.5 && Math.hypot(e.x - T.x, e.z - T.z) < T.r) ev.trampolin = T.id;
            }
            for (var k = e.seguro + 1; k < P.seguros.length; k++) {
                var S = P.seguros[k];
                if (Math.abs(S.h - e.h) < 0.6 && Math.hypot(e.x - S.x, e.z - S.z) < o.radioSeguro) {
                    e.seguro = k;
                    ev.seguro = S.id;
                }
            }
            if (P.meta && Math.abs(P.meta.h - e.h) < 0.5 && Math.hypot(e.x - P.meta.x, e.z - P.meta.z) < o.radioMeta) ev.meta = true;
        }
        return ev;
    }

    // ------------------------------------------------------------------ saltos y consultas

    function trampolin(P, id) {
        return P.trampolines.filter(function (t) { return t.id === id; })[0] || null;
    }

    function agujero(P, id) {
        return P.agujeros.filter(function (a) { return a.id === id; })[0] || null;
    }

    /** Punto del vuelo del trampolín en u ∈ [0, 1]: parábola fija hasta el destino (altura del centro del suelo). */
    function puntoSalto(tr, u) {
        u = clamp(u, 0, 1);
        var d = tr.destino;
        var h = tr.h + (d.h - tr.h) * u + 4 * tr.alto * u * (1 - u);
        return { x: tr.x + (d.x - tr.x) * u, z: tr.z + (d.z - tr.z) * u, h: h };
    }

    /** Progreso a lo largo de la ruta (distancia recorrida aproximada) para el punto (x, z). */
    function progresoEn(P, x, z) {
        var mejor = { s: 0, i: 0, d: Infinity };
        var R = P.ruta;
        for (var i = 1; i < R.length; i++) {
            var a = R[i - 1], b = R[i];
            if (b.tipo === "aterrizaje") continue;   // el vuelo no es camino
            var abx = b.x - a.x, abz = b.z - a.z;
            var l2 = abx * abx + abz * abz || 1;
            var t = clamp(((x - a.x) * abx + (z - a.z) * abz) / l2, 0, 1);
            var px = a.x + abx * t, pz = a.z + abz * t;
            var d = Math.hypot(x - px, z - pz);
            if (d < mejor.d) mejor = { s: (a.s || 0) + Math.sqrt(l2) * t, i: i, d: d };
        }
        return mejor;
    }

    /** El siguiente punto de la ruta delante de (x, z), a `adelante` unidades (para la demo y la ayuda de orientación). */
    function puntoAdelante(P, x, z, adelante) {
        var pr = progresoEn(P, x, z);
        var meta = pr.s + (adelante || 2);
        var R = P.ruta;
        for (var i = Math.max(1, pr.i); i < R.length; i++) {
            if (R[i].tipo === "aterrizaje") return R[i - 1];      // no cruzar el vacío: hasta el trampolín
            if ((R[i].s || 0) >= meta) return R[i];
        }
        return R[R.length - 1];
    }

    // ------------------------------------------------------------------ validación (pruebas)

    function validar(P) {
        var err = [];
        var o = P.opciones;
        if (!P.meta) err.push("sin meta");
        if (!valida(P, P.salida.x, P.salida.z, P.salida.h)) err.push("salida fuera de la pista");
        P.trampolines.forEach(function (t) {
            if (!valida(P, t.x, t.z, t.h)) err.push("trampolín " + t.id + " fuera de la pista");
            if (!valida(P, t.destino.x, t.destino.z, t.destino.h)) err.push("aterrizaje de " + t.id + " fuera de la pista");
            P.agujeros.forEach(function (a) {
                if (Math.hypot(a.x - t.destino.x, a.z - t.destino.z) < a.r + 1.2) err.push("aterrizaje de " + t.id + " junto al agujero " + a.id);
            });
        });
        P.seguros.forEach(function (s) {
            if (!valida(P, s.x, s.z, s.h)) err.push("punto seguro " + s.id + " fuera de la pista");
            P.agujeros.forEach(function (a) {
                if (Math.hypot(a.x - s.x, a.z - s.z) < a.r + 0.9) err.push("punto seguro " + s.id + " junto al agujero " + a.id);
            });
        });
        // carril libre junto a cada agujero (la esfera tiene que poder pasar)
        P.agujeros.forEach(function (a) {
            var pz = P.piezas.filter(function (p) { return p.id === a.pieza; })[0];
            var libre = Math.max(pz.w / 2 - (a.v + a.r), pz.w / 2 + (a.v - a.r));
            if (libre < o.radioEsfera * 2 + 0.5) err.push("el agujero " + a.id + " deja un carril de " + libre.toFixed(2));
        });
        // piezas que se pisan (no vecinas)
        P.piezas.forEach(function (A, i) {
            muestras(A).forEach(function (q) {
                P.piezas.forEach(function (B, j) {
                    if (Math.abs(i - j) <= 1) return;
                    var r = enPieza(B, q.x, q.z);
                    if (r && Math.abs(r.h - q.h) < 2.2) err.push("las piezas " + A.id + " y " + B.id + " se pisan");
                });
            });
        });
        return err.filter(function (e, i, a) { return a.indexOf(e) === i; });
    }

    function muestras(pz) {
        var out = [];
        if (pz.tipo === "recto") {
            var d = dirDe(pz.th), iz = izqDe(pz.th);
            for (var u = 0.3; u < pz.L - 0.2; u += 0.6) {
                for (var v = -pz.w / 2 + 0.2; v <= pz.w / 2 - 0.2; v += 0.5) {
                    out.push({ x: pz.ox + d.x * u + iz.x * v, z: pz.oz + d.z * u + iz.z * v, h: pz.h0 + (pz.h1 - pz.h0) * u / pz.L });
                }
            }
        } else if (pz.tipo === "curva") {
            for (var s = 0.05; s < 0.96; s += 0.08) {
                for (var v2 = -pz.w / 2 + 0.2; v2 <= pz.w / 2 - 0.2; v2 += 0.5) {
                    var q = puntoCurva(pz, s, v2);
                    out.push({ x: q.x, z: q.z, h: pz.h0 + (pz.h1 - pz.h0) * s });
                }
            }
        } else if (pz.tipo === "meta") {
            for (var a = 0; a < 6.28; a += 0.5) out.push({ x: pz.cx + Math.cos(a) * pz.r * 0.6, z: pz.cz + Math.sin(a) * pz.r * 0.6, h: pz.h });
        }
        return out;
    }

    /** Caja que contiene toda la pista (para la cámara de la presentación). */
    function limites(P) {
        var b = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, h0: Infinity, h1: -Infinity };
        P.piezas.forEach(function (pz) {
            muestras(pz).forEach(function (q) {
                b.x0 = Math.min(b.x0, q.x); b.x1 = Math.max(b.x1, q.x);
                b.z0 = Math.min(b.z0, q.z); b.z1 = Math.max(b.z1, q.z);
                b.h0 = Math.min(b.h0, q.h); b.h1 = Math.max(b.h1, q.h);
            });
        });
        return b;
    }

    // ------------------------------------------------------------------ recorridos al azar

    /** Generador pseudoaleatorio con semilla (mulberry32): la misma semilla da la misma pista (pruebas). */
    function azar(semilla) {
        var a = (semilla >>> 0) || 1;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /**
     * Piloto automático que sigue la ruta con el mismo control del dedo (sin caer a propósito). Devuelve si llegó a la
     * meta, cuántos trampolines usó y si cayó. Sirve para aceptar o descartar una pista generada.
     */
    function recorrer(P, maxT) {
        var e = nuevoEstado(P);
        var t = 0, caidas = 0, saltos = 0, meta = false, vmax = 0;
        var dt = 1 / 60;
        while (t < (maxT || 150)) {
            var obj = puntoAdelante(P, e.x, e.z, 2.0);
            var ev = paso(P, e, { modo: "punto", x: obj.x, z: obj.z, factor: 0.8 }, dt);
            vmax = Math.max(vmax, Math.hypot(e.vx, e.vz));
            if (ev.agujero) {
                caidas++;
                var s = P.seguros[e.seguro];
                e.x = s.x; e.z = s.z; e.h = s.h; e.vx = 0; e.vz = 0;
                if (caidas > 3) break;
            }
            if (ev.trampolin) {
                var tr = trampolin(P, ev.trampolin);
                saltos++;
                e.x = tr.destino.x; e.z = tr.destino.z; e.h = tr.destino.h; e.vx = 0; e.vz = 0;
            }
            if (ev.meta) {
                meta = true;
                break;
            }
            t += dt;
        }
        return { meta: meta, t: t, caidas: caidas, saltos: saltos, vmax: vmax, seguro: e.seguro };
    }

    /**
     * Arma los tramos de una pista al azar con la dificultad de `nivel.aleatorio`:
     *   bloques, agujeros, trampolines, cambiosNivel, puentes, postes, rampas, curvas (probabilidad), curvasRampa
     * La pista avanza siempre hacia la derecha (el rumbo se queda entre -90° y +90°), empieza con una rampa de bajada
     * para sentir la gravedad y deja el cambio de nivel (trampolín que sube) para la segunda mitad.
     */
    function tramosAzar(nivel, rnd) {
        var A = nivel.aleatorio || {};
        var entre = function (a, b) { return a + (b - a) * rnd(); };
        var red = function (v) { return Math.round(v * 10) / 10; };
        var lado = function () { return rnd() < 0.5 ? -1 : 1; };
        var bloques = [];
        var k;
        for (k = 0; k < num(A.agujeros, 1); k++) bloques.push("agujero");
        for (k = 0; k < num(A.trampolines, 0); k++) bloques.push("trampolin");
        for (k = 0; k < num(A.puentes, 0); k++) bloques.push("puente");
        for (k = 0; k < num(A.postes, 0); k++) bloques.push("poste");
        for (k = 0; k < Math.max(0, num(A.rampas, 2) - 1); k++) bloques.push("rampa");
        while (bloques.length < num(A.bloques, 6) - num(A.cambiosNivel, 0) - 1) bloques.push("recto");
        // barajar
        for (k = bloques.length - 1; k > 0; k--) {
            var j = Math.floor(rnd() * (k + 1));
            var tmp = bloques[k]; bloques[k] = bloques[j]; bloques[j] = tmp;
        }
        for (k = 0; k < num(A.cambiosNivel, 0); k++) {
            var pos = Math.floor(bloques.length / 2) + Math.floor(rnd() * (Math.ceil(bloques.length / 2) + 1));
            bloques.splice(Math.min(bloques.length, pos), 0, "subida");
        }
        bloques.unshift("bajada");

        var T = [{ t: "recto", largo: 5, ancho: 5 }];
        var rumbo = 0;          // grados
        var h = 3;
        var curvasRampa = num(A.curvasRampa, 0);
        bloques.forEach(function (b, i) {
            if (b === "bajada") {
                var dhB = -red(entre(1.0, 1.5));
                T.push({ t: "recto", largo: red(entre(4.5, 5.5)), dh: dhB });
                h += dhB;
            } else if (b === "rampa") {
                // baja si está alto, sube si está bajo
                var sube = h < 1.5 || (h < 4 && rnd() < 0.5);
                var dhR = sube ? red(entre(0.8, 1.1)) : -red(entre(0.8, 1.2));
                T.push({ t: "recto", largo: red(entre(4, 5)), dh: dhR, seguro: true });
                h += dhR;
            } else if (b === "agujero") {
                T.push({ t: "recto", largo: red(entre(5.5, 6.5)), ancho: 4.4, seguro: true, agujeros: [{ t: red(entre(0.42, 0.55) * 100) / 100, lado: lado() * 1.0, r: 0.9 }] });
            } else if (b === "trampolin") {
                T.push({ t: "recto", largo: red(entre(5, 5.5)), ancho: 4, seguro: true });
                T.push({ t: "salto", largo: red(entre(2.4, 2.8)), muro: true });
                T.push({ t: "recto", largo: red(entre(3.5, 4.5)) });
            } else if (b === "subida") {
                var dhS = red(entre(1.4, 1.8));
                T.push({ t: "recto", largo: 3.5, ancho: 4, seguro: true });
                T.push({ t: "salto", largo: 2.4, dh: dhS, muro: true });
                T.push({ t: "recto", largo: 3 });
                h += dhS;
            } else if (b === "puente") {
                T.push({ t: "recto", largo: red(entre(4.5, 5.5)), ancho: 1.9, puente: true });
                T.push({ t: "recto", largo: 2 });
            } else if (b === "poste") {
                T.push({ t: "recto", largo: red(entre(4.5, 5)), postes: [{ t: 0.6, lado: 0, r: 0.45 }] });
            } else {
                T.push({ t: "recto", largo: red(entre(2.5, 4)) });
            }
            // curva entre bloques (no después del último): el rumbo no vuelve hacia la izquierda
            if (i < bloques.length - 1 && rnd() < num(A.curvas, 0.6)) {
                var ang = rnd() < 0.7 ? 90 : 60;
                var sg;
                if (rumbo + ang > 90) sg = -1;
                else if (rumbo - ang < -90) sg = 1;
                else sg = lado();
                // volver hacia la derecha si ya va de lado
                if (rumbo !== 0 && rnd() < 0.6) sg = rumbo > 0 ? -1 : 1;
                if (Math.abs(rumbo + sg * ang) > 90) ang = 90 - Math.abs(rumbo) || 30;
                var curva = { t: "curva", radio: red(entre(3.2, 4)), angulo: sg * ang };
                if (curvasRampa > 0 && rnd() < 0.5) {
                    curvasRampa--;
                    curva.dh = h > 3 ? -0.7 : 0.7;
                    h += curva.dh;
                }
                T.push(curva);
                rumbo += sg * ang;
            }
        });
        T.push({ t: "recto", largo: 2.5 });
        T.push({ t: "meta", radio: red(entre(2.8, 3)) });
        return T;
    }

    /**
     * Pista al azar para un nivel: genera, construye, valida y la recorre con el piloto automático; reintenta hasta
     * `intentos` veces. Sin éxito (muy raro), usa los tramos fijos de respaldo del nivel.
     */
    function generar(nivel, cfg, rnd, opciones2) {
        rnd = rnd || Math.random;
        var o = opciones2 || {};
        var intentos = o.intentos || 60;
        var largoMin = o.largoMin || 0;
        for (var i = 0; i < intentos; i++) {
            var def = {
                id: nivel.id, nombre: nivel.nombre, titulo: nivel.titulo, ancho: nivel.ancho || 3.4,
                inicio: { x: 0, z: 0, h: 3, rumbo: 0 },
                tramos: tramosAzar(nivel, rnd)
            };
            var P;
            try {
                P = construir(def, cfg);
            } catch (e) {
                continue;
            }
            if (P.largo < largoMin) continue;
            if (validar(P).length) continue;
            var r = recorrer(P, 160);
            if (!r.meta || r.caidas || r.saltos !== P.trampolines.length || r.seguro !== P.seguros.length - 1) continue;
            P.azar = true;
            P.tramosDef = def.tramos;
            return P;
        }
        var resp = construir(nivel, cfg);
        resp.azar = false;
        return resp;
    }

    /** Los recorridos de una partida, al azar y cada uno más largo que el anterior. */
    function generarPartida(niveles, cfg, rnd) {
        var out = [];
        var largo = 0;
        (niveles || []).forEach(function (n) {
            var P = generar(n, cfg, rnd, { largoMin: largo + 4 });
            out.push(P);
            largo = P.largo;
        });
        return out;
    }

    var api = {
        construir: construir,
        azar: azar,
        recorrer: recorrer,
        tramosAzar: tramosAzar,
        generar: generar,
        generarPartida: generarPartida,
        superficie: superficie,
        valida: valida,
        enPieza: enPieza,
        puntoCurva: puntoCurva,
        nuevoEstado: nuevoEstado,
        paso: paso,
        trampolin: trampolin,
        agujero: agujero,
        puntoSalto: puntoSalto,
        progresoEn: progresoEn,
        puntoAdelante: puntoAdelante,
        validar: validar,
        limites: limites,
        dirDe: dirDe,
        izqDe: izqDe,
        opciones: opciones
    };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    global.ReglasGravedad = api;
})(typeof window !== "undefined" ? window : globalThis);
