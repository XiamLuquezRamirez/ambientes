/**
 * ReglasGolf — física y decisiones de "El Mini Golf Mágico de Pendiente y Obstáculos" (window.ReglasGolf; también
 * exportable a Node para las pruebas).
 *
 * Coordenadas lógicas del terreno: plano (x, z) en metros de juguete (x a la derecha, z hacia la cámara), altura
 * y = h(x, z). La escena 3D solo dibuja lo que esto calcula.
 *
 *   pista      centro por "tortuga" (rectos y curvas) → borde cerrado; la orilla exterior de las curvas es la PARED
 *              CURVA (rebota más y se ilumina).
 *   pendientes rampas entre dos puntos del centro y lomas/hondonadas; la gravedad proyectada sobre el terreno empuja
 *              la pelota (a = −5/7·g·∇h, pelota que rueda).
 *   molino     torre con túnel; cuatro aspas giran en el plano de la boca del túnel. Una aspa bloquea la pelota cuando,
 *              en su ángulo de ESE instante, pasa a menos de r + ancho de la pelota; si la pelota está en la boca, la
 *              devuelve (o la empuja hacia adelante si ya pasó la mitad).
 *   asteroide  roca que va y viene por un segmento (choque círculo-círculo con su velocidad).
 *   hoyo       captura si el centro de la pelota está dentro del hoyo con velocidad menor que vCaptura. Pasar rápido
 *              por encima no cuenta.
 *
 * El paso es fijo (1/120 s) y la misma función mueve la pelota real y la trayectoria predictiva: si se suelta en el
 * mismo instante, la línea punteada es exactamente el recorrido que hará la pelota.
 */
(function (global) {
    "use strict";

    var G = 9.8;
    var K_RODAR = 5 / 7;
    var DT = 1 / 120;
    var RAD = Math.PI / 180;

    // ------------------------------------------------------------------ utilidades

    function azar(semilla) {
        var s = (semilla >>> 0) || 1;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function entre(rnd, v) {
        if (Array.isArray(v)) return v[0] + (v[1] - v[0]) * rnd();
        return v == null ? 0 : Number(v);
    }

    function lim(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function suave(t) { t = lim(t, 0, 1); return t * t * (3 - 2 * t); }

    // ------------------------------------------------------------------ pista por tortuga

    /**
     * def: { inicio:[x,z], rumbo:grados, ancho, tramos:[{recto:L} | {curva:[R, grados]}] }
     * rumbo: dirección (cos, sin) en (x, z); un giro positivo aumenta el rumbo.
     */
    function construirPista(def) {
        var x = def.inicio[0], z = def.inicio[1];
        var psi = (def.rumbo || 0) * RAD;
        var ancho = def.ancho || 2.5;
        var centro = [{ x: x, z: z, psi: psi, s: 0, curva: false, lado: 0 }];
        var s = 0;
        (def.tramos || []).forEach(function (tr) {
            if (tr.recto) {
                var n = Math.max(1, Math.ceil(tr.recto / 0.25));
                for (var i = 1; i <= n; i++) {
                    var d = tr.recto / n;
                    x += Math.cos(psi) * d;
                    z += Math.sin(psi) * d;
                    s += d;
                    centro.push({ x: x, z: z, psi: psi, s: s, curva: false, lado: 0 });
                }
            } else if (tr.curva) {
                var R = tr.curva[0], ang = tr.curva[1] * RAD;
                var sg = ang >= 0 ? 1 : -1;
                // el centro del giro queda a la izquierda (+90°) si el rumbo crece
                var cx = x + Math.cos(psi + sg * Math.PI / 2) * R;
                var cz = z + Math.sin(psi + sg * Math.PI / 2) * R;
                var m = Math.max(2, Math.ceil(Math.abs(tr.curva[1]) / 5));
                var a0 = Math.atan2(z - cz, x - cx);
                for (var k = 1; k <= m; k++) {
                    var a = a0 + ang * k / m;
                    var nx = cx + Math.cos(a) * R, nz = cz + Math.sin(a) * R;
                    s += Math.abs(ang) * R / m;
                    x = nx;
                    z = nz;
                    centro.push({ x: x, z: z, psi: psi + ang * k / m, s: s, curva: true, lado: -sg });
                }
                psi += ang;
            }
        });
        // orillas: A a la izquierda (+90°), B a la derecha. En una curva la orilla exterior es la del lado contrario
        // al centro del giro: lado > 0 → A es la exterior; lado < 0 → B.
        var A = [], B = [];
        centro.forEach(function (c) {
            var nx = -Math.sin(c.psi), nz = Math.cos(c.psi);
            A.push({ x: c.x + nx * ancho / 2, z: c.z + nz * ancho / 2 });
            B.push({ x: c.x - nx * ancho / 2, z: c.z - nz * ancho / 2 });
        });
        var pol = [], aristas = [];
        var n = centro.length;
        // A hacia adelante
        for (var i = 0; i < n; i++) pol.push([A[i].x, A[i].z]);
        var tiposA = [];
        for (var i2 = 0; i2 < n - 1; i2++) tiposA.push(centro[i2 + 1].curva && centro[i2 + 1].lado > 0 ? "curva" : "borde");
        // tapa del final (semicírculo de A a B por delante)
        var tapa = function (c, signo) {
            var nx = -Math.sin(c.psi), nz = Math.cos(c.psi);
            var dx = Math.cos(c.psi), dz = Math.sin(c.psi);
            var r = ancho / 2, pts = [];
            for (var k = 1; k < 14; k++) {
                var a = Math.PI * k / 14;
                pts.push([c.x + signo * (nx * r * Math.cos(a) + dx * r * Math.sin(a)), c.z + signo * (nz * r * Math.cos(a) + dz * r * Math.sin(a))]);
            }
            return pts;
        };
        tapa(centro[n - 1], 1).forEach(function (p) { pol.push(p); });
        // B hacia atrás
        for (var i3 = n - 1; i3 >= 0; i3--) pol.push([B[i3].x, B[i3].z]);
        tapa(centro[0], -1).forEach(function (p) { pol.push(p); });
        // tipo de cada arista en el mismo orden del polígono
        var tipos = tiposA.slice();
        for (var k1 = 0; k1 < 14; k1++) tipos.push("tapa");
        for (var i4 = n - 1; i4 > 0; i4--) tipos.push(centro[i4].curva && centro[i4].lado < 0 ? "curva" : "borde");
        while (tipos.length < pol.length) tipos.push("tapa");
        for (var j = 0; j < pol.length; j++) {
            var p = pol[j], q = pol[(j + 1) % pol.length];
            aristas.push({ ax: p[0], az: p[1], bx: q[0], bz: q[1], tipo: tipos[j] });
        }
        return { centro: centro, A: A, B: B, poligono: pol, aristas: aristas, largo: s, ancho: ancho };
    }

    /** Punto del centro a una distancia s (interpolado) con su rumbo. */
    function puntoCentro(pista, s) {
        var c = pista.centro;
        s = lim(s, 0, pista.largo);
        for (var i = 1; i < c.length; i++) {
            if (c[i].s >= s) {
                var u = (s - c[i - 1].s) / Math.max(1e-9, c[i].s - c[i - 1].s);
                var psi = c[i - 1].psi + (c[i].psi - c[i - 1].psi) * u;
                return { x: c[i - 1].x + (c[i].x - c[i - 1].x) * u, z: c[i - 1].z + (c[i].z - c[i - 1].z) * u, psi: psi };
            }
        }
        var l = c[c.length - 1];
        return { x: l.x, z: l.z, psi: l.psi };
    }

    /** Punto a distancia s del inicio y desplazado `lateral` hacia la izquierda del rumbo. */
    function puntoPista(pista, s, lateral) {
        var p = puntoCentro(pista, s);
        return { x: p.x - Math.sin(p.psi) * lateral, z: p.z + Math.cos(p.psi) * lateral, psi: p.psi };
    }

    function dentroPoligono(pol, x, z) {
        var dentro = false;
        for (var i = 0, j = pol.length - 1; i < pol.length; j = i++) {
            var xi = pol[i][0], zi = pol[i][1], xj = pol[j][0], zj = pol[j][1];
            if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) dentro = !dentro;
        }
        return dentro;
    }

    function distSegmento(px, pz, ax, az, bx, bz) {
        var dx = bx - ax, dz = bz - az;
        var l2 = dx * dx + dz * dz;
        var t = l2 > 0 ? lim(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
        var cx = ax + dx * t, cz = az + dz * t;
        return { d: Math.hypot(px - cx, pz - cz), cx: cx, cz: cz, t: t };
    }

    // ------------------------------------------------------------------ molino (torre, túnel, embudo y aspas)

    /**
     * m: { x, z, yaw (rad, dirección del túnel), D (fondo de la torre), W (ancho total), w (túnel), F (embudo),
     *      L (largo de aspa), bw (medio ancho de aspa), H (altura del eje), omega, fase, decorativo }
     */
    function marcoMolino(m) {
        var dx = Math.cos(m.yaw), dz = Math.sin(m.yaw);
        return {
            dx: dx, dz: dz, lx: -dz, lz: dx,
            aMundo: function (u, v) { return [m.x + dx * u - dz * v, m.z + dz * u + dx * v]; },
            aLocal: function (x, z) { var rx = x - m.x, rz = z - m.z; return { u: rx * dx + rz * dz, v: -rx * dz + rz * dx }; }
        };
    }

    /** Paredes de la torre (dos bloques con el túnel entre ellos) y del embudo de entrada, en el mundo. */
    function paredesMolino(m) {
        var f = marcoMolino(m);
        var D = m.D, W = m.W / 2 + 0.15, w = m.w / 2, F = m.F;
        var bloques = [
            [[-D / 2, w], [D / 2, w], [D / 2 + 0.35, W], [-D / 2 - F, W]],
            [[-D / 2 - F, -W], [D / 2 + 0.35, -W], [D / 2, -w], [-D / 2, -w]]
        ];
        var aristas = [];
        bloques.forEach(function (b) {
            for (var i = 0; i < b.length; i++) {
                var p = f.aMundo(b[i][0], b[i][1]);
                var q = f.aMundo(b[(i + 1) % b.length][0], b[(i + 1) % b.length][1]);
                aristas.push({ ax: p[0], az: p[1], bx: q[0], bz: q[1], tipo: "molino" });
            }
        });
        return aristas;
    }

    function anguloMolino(m, t) { return m.fase + m.omega * t; }

    /** Plano de la boca (u) donde giran las aspas. */
    function bocaMolino(m) { return -m.D / 2 - 0.14; }

    /**
     * ¿Alguna aspa ocupa la boca a la altura de la pelota en la posición lateral v? Devuelve el índice del aspa o −1.
     * Las aspas giran en el plano (v, y) con el eje a la altura H; θ = 0 apunta hacia abajo.
     */
    function aspaEn(m, v, t, r) {
        var th = anguloMolino(m, t);
        for (var k = 0; k < 4; k++) {
            var a = th + k * Math.PI / 2;
            var tipV = Math.sin(a) * m.L, tipY = m.H - Math.cos(a) * m.L;
            var d = distSegmento(v, r, 0, m.H, tipV, tipY).d;
            if (d < r + m.bw) return k;
        }
        return -1;
    }

    // ------------------------------------------------------------------ pendientes

    /**
     * Distancia a lo largo de la pista (s) del punto del centro más cercano a (x, z), con la dirección de avance en
     * ese lugar. Las rampas se definen con s: así una rampa de un tramo no inclina los otros tramos.
     */
    var SP = { s: 0, tx: 1, tz: 0 };
    function sDePunto(pista, x, z) {
        var c = pista.centro;
        var mejor = Infinity;
        for (var i = 0; i < c.length - 1; i++) {
            var a = c[i], b = c[i + 1];
            var dx = b.x - a.x, dz = b.z - a.z;
            var l2 = dx * dx + dz * dz;
            if (l2 < 1e-12) continue;
            var t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
            t = t < 0 ? 0 : (t > 1 ? 1 : t);
            var px = a.x + dx * t - x, pz = a.z + dz * t - z;
            var d = px * px + pz * pz;
            if (d < mejor) {
                mejor = d;
                var l = Math.sqrt(l2);
                SP.s = a.s + (b.s - a.s) * t;
                SP.tx = dx / l;
                SP.tz = dz / l;
            }
        }
        return SP;
    }

    function alturaYGrad(nv, x, z, salida) {
        var h = 0, gx = 0, gz = 0;
        var ps = nv.pendientes;
        var sp = null;
        for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            if (p.tipo === "rampa") {
                if (!sp) sp = sDePunto(nv.pista, x, z);
                var largo = p.s1 - p.s0;
                var t = (sp.s - p.s0) / largo;
                if (t <= 0) continue;
                if (t >= 1) { h += p.alto; continue; }
                h += p.alto * t * t * (3 - 2 * t);
                var dh = p.alto * 6 * t * (1 - t) / largo;
                gx += dh * sp.tx;
                gz += dh * sp.tz;
            } else {
                var rx = x - p.x, rz = z - p.z;
                var d = Math.hypot(rx, rz);
                if (d >= p.r) continue;
                var sN = d / p.r, w = 1 - sN * sN;
                h += p.alto * w * w;
                if (d > 1e-6) {
                    var df = p.alto * -4 * sN * w / p.r;
                    gx += df * rx / d;
                    gz += df * rz / d;
                }
            }
        }
        salida.h = h;
        salida.gx = gx;
        salida.gz = gz;
        return salida;
    }

    var HG = { h: 0, gx: 0, gz: 0 };
    function altura(nv, x, z) { return alturaYGrad(nv, x, z, HG).h; }

    // ------------------------------------------------------------------ rejilla de paredes (búsqueda rápida)

    function indexar(nv) {
        var c = 0.5;
        var mapa = {};
        nv.paredes.forEach(function (a, i) {
            var x0 = Math.floor(Math.min(a.ax, a.bx) / c) - 1, x1 = Math.floor(Math.max(a.ax, a.bx) / c) + 1;
            var z0 = Math.floor(Math.min(a.az, a.bz) / c) - 1, z1 = Math.floor(Math.max(a.az, a.bz) / c) + 1;
            for (var gx = x0; gx <= x1; gx++) {
                for (var gz = z0; gz <= z1; gz++) {
                    var k = gx + "," + gz;
                    (mapa[k] = mapa[k] || []).push(i);
                }
            }
        });
        nv.rejilla = { c: c, mapa: mapa };
    }

    function cercanas(nv, x, z) {
        var R = nv.rejilla;
        return R.mapa[Math.floor(x / R.c) + "," + Math.floor(z / R.c)] || [];
    }

    // ------------------------------------------------------------------ objetos móviles

    function posAsteroide(a, t) {
        var w = 2 * Math.PI / a.periodo;
        var k = 0.5 - 0.5 * Math.cos(w * t + a.fase);
        var dk = 0.5 * w * Math.sin(w * t + a.fase);
        return { x: a.x0 + (a.x1 - a.x0) * k, z: a.z0 + (a.z1 - a.z0) * k, vx: (a.x1 - a.x0) * dk, vz: (a.z1 - a.z0) * dk };
    }

    // ------------------------------------------------------------------ el paso de física

    /** Estado de pelota: { x, z, vx, vz, quieta, enHoyo, tRodando, uMolino } */
    function pelota(x, z) {
        return { x: x, z: z, vx: 0, vz: 0, quieta: true, enHoyo: false, tRodando: 0, uMol: {}, sobreHoyo: false, pasoMol: {} };
    }

    /**
     * Avanza un paso fijo DT en el instante t (reloj de juego). ev (opcional): lista donde se anotan los eventos
     * (rebote, aspa, asteroide, hoyo, sobreHoyo, molinoSuperado, parada).
     */
    function paso(nv, j, b, t, ev) {
        if (b.enHoyo) return;
        var r = j.radio;
        var hg = alturaYGrad(nv, b.x, b.z, HG);
        var ax = -K_RODAR * G * hg.gx, az = -K_RODAR * G * hg.gz;
        var aPend = Math.hypot(ax, az);
        var hx = nv.hoyo.x, hz = nv.hoyo.z;
        var dH = Math.hypot(b.x - hx, b.z - hz);
        // el borde del hoyo tira un poquito de la pelota hacia adentro
        if (dH < nv.hoyo.r && dH > 1e-4) {
            ax -= (b.x - hx) / dH * j.atraccionHoyo;
            az -= (b.z - hz) / dH * j.atraccionHoyo;
        }
        var sp = Math.hypot(b.vx, b.vz);
        var fr = j.friccion * G;
        if (sp > 1e-6) {
            if (sp > fr * DT) {
                ax -= fr * b.vx / sp;
                az -= fr * b.vz / sp;
            } else {
                b.vx = 0;
                b.vz = 0;
                sp = 0;
            }
        }
        if (sp === 0 && aPend < j.friccionEstatica * G) {
            b.quieta = true;
            return;
        }
        b.quieta = false;
        b.vx += ax * DT;
        b.vz += az * DT;
        sp = Math.hypot(b.vx, b.vz);
        if (sp > j.velMaxima) {
            b.vx *= j.velMaxima / sp;
            b.vz *= j.velMaxima / sp;
        }
        b.x += b.vx * DT;
        b.z += b.vz * DT;
        b.tRodando += DT;

        // paredes (bordes, pared curva, torre del molino)
        var lista = cercanas(nv, b.x, b.z);
        for (var i = 0; i < lista.length; i++) {
            var w = nv.paredes[lista[i]];
            var c = distSegmento(b.x, b.z, w.ax, w.az, w.bx, w.bz);
            if (c.d >= r || c.d < 1e-9) continue;
            var nx = (b.x - c.cx) / c.d, nz = (b.z - c.cz) / c.d;
            b.x = c.cx + nx * r;
            b.z = c.cz + nz * r;
            var vn = b.vx * nx + b.vz * nz;
            if (vn < 0) {
                var e = w.tipo === "curva" ? j.reboteCurva : j.rebote;
                b.vx -= (1 + e) * vn * nx;
                b.vz -= (1 + e) * vn * nz;
                // un poquito de roce a lo largo de la pared
                b.vx *= j.rocePared;
                b.vz *= j.rocePared;
                if (ev && vn < -0.25) ev.push({ tipo: "rebote", clase: w.tipo, x: c.cx, z: c.cz, nx: nx, nz: nz, fuerza: -vn });
            }
        }

        // aspas de cada molino (en la posición de ESTE instante)
        var ms = nv.molinos;
        for (var im = 0; im < ms.length; im++) {
            var m = ms[im];
            if (m.decorativo) continue;
            var f = m.marco || (m.marco = marcoMolino(m));
            var L = f.aLocal(b.x, b.z);
            var ug = bocaMolino(m);
            var grosor = 0.05;
            if (Math.abs(L.u - ug) < r + grosor && Math.abs(L.v) < m.w / 2 + 0.4) {
                var k = aspaEn(m, L.v, t, r);
                if (k >= 0) {
                    var vu = b.vx * f.dx + b.vz * f.dz;
                    var vv = b.vx * f.lx + b.vz * f.lz;
                    var lado = L.u - ug > 0.02 ? 1 : (L.u - ug < -0.02 ? -1 : (vu > 0 ? -1 : 1));
                    var nu = ug + lado * (r + grosor);
                    var pm = f.aMundo(nu, L.v);
                    b.x = pm[0];
                    b.z = pm[1];
                    if (vu * lado < 0) {
                        // la pelota choca con el aspa: vuelve con parte de su fuerza y el aspa la roza de lado
                        var fuerza = Math.abs(vu);
                        vu = -vu * j.reboteAspa;
                        vv += Math.cos(anguloMolino(m, t) + k * Math.PI / 2) * m.omega * m.L * 0.25;
                        if (ev && fuerza > 0.15) ev.push({ tipo: "aspa", x: pm[0], z: pm[1], fuerza: fuerza, aspa: k, molino: im });
                    } else if (lado > 0 && vu < 0.6) {
                        vu = 0.6;   // ya estaba pasando: el aspa la empuja hacia adentro
                    } else if (lado < 0 && vu > -0.4) {
                        vu = -0.4;  // el aspa baja delante de ella: la aparta hacia atrás
                    }
                    b.vx = f.dx * vu + f.lx * vv;
                    b.vz = f.dz * vu + f.lz * vv;
                }
            }
            // dentro del túnel la pelota no se queda quieta (el piso baja un poquito hacia la salida)
            var L2 = f.aLocal(b.x, b.z);
            if (L2.u > ug - r && L2.u < m.D / 2 + r * 2 && Math.abs(L2.v) < m.w / 2 + 0.05) {
                var vu2 = b.vx * f.dx + b.vz * f.dz;
                if (Math.abs(vu2) < 0.45) {
                    var sgn = vu2 < -0.05 && L2.u < 0 ? -1 : 1;
                    b.vx += f.dx * (sgn * 0.45 - vu2);
                    b.vz += f.dz * (sgn * 0.45 - vu2);
                }
            }
            // atravesó todo el túnel
            var antes = b.uMol[im];
            if (antes != null && antes < ug - r && L2.u > m.D / 2 + r && Math.abs(L2.v) < m.w / 2 + 0.6 && !b.pasoMol[im]) {
                b.pasoMol[im] = true;
                if (ev) ev.push({ tipo: "molinoSuperado", x: b.x, z: b.z, molino: im });
            }
            if (L2.u < ug - r && Math.abs(L2.v) < m.W) b.uMol[im] = L2.u;
        }

        // asteroides que van y vienen, y pilares de cristal quietos
        var obs = nv.asteroides;
        for (var ia = 0; ia < obs.length + nv.postes.length; ia++) {
            var esPoste = ia >= obs.length;
            var as = esPoste ? nv.postes[ia - obs.length] : obs[ia];
            var pa = esPoste ? as : posAsteroide(as, t);
            var dx = b.x - pa.x, dz = b.z - pa.z;
            var d = Math.hypot(dx, dz);
            var lim2 = r + as.r;
            if (d < lim2 && d > 1e-6) {
                var anx = dx / d, anz = dz / d;
                b.x = pa.x + anx * lim2;
                b.z = pa.z + anz * lim2;
                var rvx = b.vx - (pa.vx || 0), rvz = b.vz - (pa.vz || 0);
                var rvn = rvx * anx + rvz * anz;
                if (rvn < 0) {
                    var e2 = esPoste ? j.rebotePoste || 0.8 : j.reboteAsteroide;
                    b.vx -= (1 + e2) * rvn * anx;
                    b.vz -= (1 + e2) * rvn * anz;
                    if (ev && rvn < -0.2) ev.push({ tipo: esPoste ? "poste" : "asteroide", indice: esPoste ? ia - obs.length : ia, x: pa.x + anx * as.r, z: pa.z + anz * as.r, fuerza: -rvn });
                }
            }
        }

        // hoyo
        var dH2 = Math.hypot(b.x - hx, b.z - hz);
        var sp2 = Math.hypot(b.vx, b.vz);
        if (dH2 < nv.hoyo.r * 0.92) {
            if (sp2 < nv.vCaptura) {
                b.enHoyo = true;
                b.vx = 0;
                b.vz = 0;
                if (ev) ev.push({ tipo: "hoyo", x: b.x, z: b.z });
                return;
            }
            if (!b.sobreHoyo) {
                b.sobreHoyo = true;
                if (ev) ev.push({ tipo: "sobreHoyo", x: b.x, z: b.z, vel: sp2 });
            }
        } else if (dH2 > nv.hoyo.r * 1.4) {
            b.sobreHoyo = false;
        }

        // parada
        if (sp2 < j.velParada) {
            var hg2 = alturaYGrad(nv, b.x, b.z, HG);
            if (K_RODAR * G * Math.hypot(hg2.gx, hg2.gz) < j.friccionEstatica * G && !enTunel(nv, b)) {
                b.vx = 0;
                b.vz = 0;
                b.quieta = true;
                if (ev) ev.push({ tipo: "parada", x: b.x, z: b.z });
            }
        }
        if (b.tRodando > j.tiempoMaximo) {
            b.vx = 0;
            b.vz = 0;
            b.quieta = true;
            if (ev) ev.push({ tipo: "parada", x: b.x, z: b.z, forzada: true });
        }
    }

    function enTunel(nv, b) {
        for (var i = 0; i < nv.molinos.length; i++) {
            var m = nv.molinos[i];
            if (m.decorativo) continue;
            var f = m.marco || (m.marco = marcoMolino(m));
            var L = f.aLocal(b.x, b.z);
            if (L.u > bocaMolino(m) - 0.2 && L.u < m.D / 2 + 0.2 && Math.abs(L.v) < m.w / 2 + 0.1) return true;
        }
        return false;
    }

    /** Si una pieza que se mueve alcanza a la pelota quieta (aspa o asteroide), la empuja: devuelve true si la movió. */
    function empujarQuieta(nv, j, b, t) {
        if (b.enHoyo) return false;
        var r = j.radio;
        for (var ia = 0; ia < nv.asteroides.length; ia++) {
            var as = nv.asteroides[ia];
            var pa = posAsteroide(as, t);
            if (Math.hypot(b.x - pa.x, b.z - pa.z) < r + as.r) return true;
        }
        for (var i = 0; i < nv.molinos.length; i++) {
            var m = nv.molinos[i];
            if (m.decorativo) continue;
            var f = m.marco || (m.marco = marcoMolino(m));
            var L = f.aLocal(b.x, b.z);
            if (Math.abs(L.u - bocaMolino(m)) < r + 0.05 && aspaEn(m, L.v, t, r) >= 0) return true;
        }
        var hg = alturaYGrad(nv, b.x, b.z, HG);
        return K_RODAR * G * Math.hypot(hg.gx, hg.gz) >= j.friccionEstatica * G;
    }

    // ------------------------------------------------------------------ golpe y simulación (la misma para la predicción)

    /** Velocidad inicial a partir de la tensión (0..1). */
    function velocidadGolpe(j, tension) {
        var T = lim(tension, 0, 1);
        return j.velMin + (j.velMax - j.velMin) * T;
    }

    /** Zona de fuerza: suave, media o potente. */
    function zona(T) { return T < 0.4 ? "suave" : (T < 0.75 ? "media" : "potente"); }

    function golpear(j, b, angulo, tension) {
        var v = velocidadGolpe(j, tension);
        b.vx = Math.cos(angulo) * v;
        b.vz = Math.sin(angulo) * v;
        b.quieta = false;
        b.tRodando = 0;
        b.sobreHoyo = false;
        b.pasoMol = {};
        b.uMol = {};
        return b;
    }

    /**
     * Simula un golpe desde la pelota b0 en el instante t0. opts: { largoMax, tMax, cada } → { puntos [[x,z]],
     * rebotes [{x,z,clase}], aspa {x,z} | null, fin {x,z}, hoyo, molino, t, largo }.
     */
    function simular(nv, j, b0, t0, angulo, tension, opts) {
        opts = opts || {};
        var b = pelota(b0.x, b0.z);
        golpear(j, b, angulo, tension);
        var ev = [];
        var puntos = [[b.x, b.z]];
        var rebotes = [];
        var aspa = null, asteroide = null;
        var largo = 0, acum = 0;
        var cada = opts.cada || 0.16;
        var largoMax = opts.largoMax == null ? Infinity : opts.largoMax;
        var tMax = opts.tMax || j.tiempoMaximo;
        var t = t0, px = b.x, pz = b.z;
        var corte = false, molino = false;
        var n = Math.ceil(tMax / DT);
        for (var i = 0; i < n; i++) {
            paso(nv, j, b, t, ev);
            t += DT;
            var dl = Math.hypot(b.x - px, b.z - pz);
            largo += dl;
            acum += dl;
            px = b.x;
            pz = b.z;
            if (acum >= cada) {
                acum = 0;
                puntos.push([b.x, b.z]);
            }
            while (ev.length) {
                var e = ev.shift();
                if (e.tipo === "rebote" && rebotes.length < 8) rebotes.push({ x: e.x, z: e.z, clase: e.clase, largo: largo });
                else if (e.tipo === "aspa" && !aspa) aspa = { x: e.x, z: e.z, largo: largo };
                else if ((e.tipo === "asteroide" || e.tipo === "poste") && !asteroide) asteroide = { x: e.x, z: e.z, largo: largo };
                else if (e.tipo === "molinoSuperado") molino = true;
            }
            if (b.enHoyo || b.quieta) break;
            if (largo > largoMax && (!opts.hastaRebote || rebotes.length || aspa)) { corte = true; break; }
        }
        puntos.push([b.x, b.z]);
        return { puntos: puntos, rebotes: rebotes, aspa: aspa, asteroide: asteroide, fin: { x: b.x, z: b.z }, hoyo: b.enHoyo, molino: molino, t: t - t0, largo: largo, cortada: corte };
    }

    // ------------------------------------------------------------------ niveles

    /** Prepara un nivel (pista, salida, hoyo, molino, pendientes, asteroide) dentro de los rangos del config. */
    /**
     * Un nivel tiene varios mundos (forma de la pista, pendientes, obstáculos y colores). Se usa opts.mundo si viene;
     * si no, uno al azar (evitando opts.evitar si hay otro).
     */
    function elegirMundo(ronda, rnd, opts) {
        var ms = ronda.mundos;
        if (!ms || !ms.length) return { ronda: ronda, idx: -1 };
        var idx;
        if (opts && opts.mundo != null) idx = Math.max(0, Math.min(ms.length - 1, opts.mundo | 0));
        else {
            idx = Math.floor(rnd() * ms.length) % ms.length;
            if (opts && opts.evitar === idx && ms.length > 1) idx = (idx + 1 + Math.floor(rnd() * (ms.length - 1))) % ms.length;
        }
        var r = {};
        Object.keys(ronda).forEach(function (k) { if (k !== "mundos") r[k] = ronda[k]; });
        Object.keys(ms[idx]).forEach(function (k) { r[k] = ms[idx][k]; });
        return { ronda: r, idx: idx };
    }

    function prepararNivel(rondaBase, j, rnd, opts) {
        rnd = rnd || Math.random;
        var elegido = elegirMundo(rondaBase, rnd, opts);
        var ronda = elegido.ronda;
        var pista = construirPista(ronda.pista);
        var nv = {
            id: ronda.id,
            pista: pista,
            borde: pista.poligono,
            paredes: pista.aristas.slice(),
            pendientes: [],
            molinos: [],
            molino: null,
            asteroides: [],
            postes: [],
            prediccion: ronda.prediccion == null ? Infinity : ronda.prediccion,
            par: ronda.par || 3,
            vCaptura: ronda.vCaptura || j.vCaptura,
            mundo: elegido.idx,
            nombreMundo: ronda.nombre || "",
            tema: ronda.tema || "esmeralda"
        };
        // salida y hoyo (posición a lo largo de la pista y hacia los lados)
        var sal = ronda.salida || {};
        var ps = puntoPista(pista, entre(rnd, sal.s), entre(rnd, sal.lado));
        nv.salida = { x: ps.x, z: ps.z, psi: ps.psi };
        var ho = ronda.hoyo || {};
        var ph = puntoPista(pista, entre(rnd, ho.s), entre(rnd, ho.lado));
        nv.hoyo = { x: ph.x, z: ph.z, r: ho.r || j.radioHoyo };
        // pendientes: rampas entre dos puntos del centro (alto al azar en su rango) y lomas
        (ronda.pendientes || []).forEach(function (p) {
            var alto = entre(rnd, p.alto);
            if (p.rampa) {
                var a = puntoCentro(pista, p.rampa[0]), b = puntoCentro(pista, p.rampa[1]);
                nv.pendientes.push({ tipo: "rampa", s0: p.rampa[0], s1: p.rampa[1], ax: a.x, az: a.z, bx: b.x, bz: b.z, alto: alto });
            } else if (p.loma) {
                var c = puntoPista(pista, p.loma[0], p.loma[1] || 0);
                nv.pendientes.push({ tipo: "loma", x: c.x, z: c.z, r: p.loma[2], alto: alto });
            }
        });
        // hondonada suave alrededor del hoyo (ayuda a entrar si llega despacio)
        nv.pendientes.push({ tipo: "loma", x: nv.hoyo.x, z: nv.hoyo.z, r: nv.hoyo.r * (j.hondonadaHoyo || 2.6), alto: -(j.hondoHoyo || 0.05) });
        // molinos (uno o varios; los decorativos quedan fuera del camino)
        var listaMolinos = ronda.molinos || (ronda.molino ? [ronda.molino] : []);
        listaMolinos.forEach(function (md) {
            var periodo = entre(rnd, md.periodo || [8, 9]);
            var sentido = md.sentido || (rnd() < 0.5 ? 1 : -1);
            var m = {
                decorativo: !!md.decorativo,
                D: md.D || 1.0,
                W: md.W || pista.ancho,
                w: md.w || 1.05,
                F: md.F || 1.4,
                L: md.L || 1.45,
                bw: md.bw || 0.12,
                omega: sentido * 2 * Math.PI / periodo,
                periodo: periodo,
                fase: rnd() * Math.PI * 2
            };
            m.H = md.H || (m.L + m.bw + 0.03);
            if (md.decorativo) {
                m.x = md.pos[0];
                m.z = md.pos[1];
                m.yaw = (md.yaw || 90) * RAD;
            } else {
                var pm = puntoCentro(pista, md.s);
                m.s = md.s;
                m.x = pm.x;
                m.z = pm.z;
                m.yaw = pm.psi;
                nv.paredes = nv.paredes.concat(paredesMolino(m));
            }
            m.marco = marcoMolino(m);
            nv.molinos.push(m);
        });
        nv.molino = nv.molinos[0] || null;
        // asteroides que cruzan la pista de lado a lado
        var listaAst = ronda.asteroides || (ronda.asteroide ? [ronda.asteroide] : []);
        listaAst.forEach(function (ad) {
            var s0 = entre(rnd, ad.s);
            var amp = pista.ancho / 2 - (ad.r || 0.3) - (ad.margen || 0.18);
            var p0 = puntoPista(pista, s0, -amp), p1 = puntoPista(pista, s0, amp);
            nv.asteroides.push({ s: s0, x0: p0.x, z0: p0.z, x1: p1.x, z1: p1.z, r: ad.r || 0.3, periodo: entre(rnd, ad.periodo || [5, 6]), fase: rnd() * Math.PI * 2 });
        });
        nv.asteroide = nv.asteroides[0] || null;
        // pilares de cristal quietos (rebotan); el lado es al azar dentro de su rango
        (ronda.postes || []).forEach(function (pd) {
            var sp = entre(rnd, pd.s);
            var pp = puntoPista(pista, sp, entre(rnd, pd.lado || 0));
            nv.postes.push({ s: sp, x: pp.x, z: pp.z, r: pd.r || 0.26 });
        });
        indexar(nv);
        return nv;
    }

    /** Distancia del punto a la pared más cercana. */
    function holgura(nv, x, z) {
        var mejor = Infinity;
        nv.paredes.forEach(function (w) { mejor = Math.min(mejor, distSegmento(x, z, w.ax, w.az, w.bx, w.bz).d); });
        return mejor;
    }

    /** Pendiente máxima (|∇h|) del campo, muestreada. */
    function pendienteMaxima(nv) {
        var max = 0;
        var c = nv.pista.centro;
        c.forEach(function (p) {
            for (var l = -1; l <= 1; l += 0.5) {
                var x = p.x - Math.sin(p.psi) * l * nv.pista.ancho / 2.4, z = p.z + Math.cos(p.psi) * l * nv.pista.ancho / 2.4;
                var g = alturaYGrad(nv, x, z, HG);
                max = Math.max(max, Math.hypot(g.gx, g.gz));
            }
        });
        return max;
    }

    /** Busca un golpe que meta la pelota desde b en el instante t: { angulo, tension, sim } o null. */
    function buscarGolpe(nv, j, b, t, opts) {
        opts = opts || {};
        var nA = opts.angulos || 72, nT = opts.tensiones || 14;
        var exige = opts.exige || {};
        for (var it = 0; it < nT; it++) {
            var T = 0.06 + 0.94 * (it + 0.5) / nT;
            for (var ia = 0; ia < nA; ia++) {
                var ang = (ia / nA) * Math.PI * 2;
                var s = simular(nv, j, b, t, ang, T, {});
                if (!s.hoyo) continue;
                if (exige.molino && !s.molino) continue;
                if (exige.curva && !s.rebotes.some(function (r) { return r.clase === "curva"; })) continue;
                return { angulo: ang, tension: T, sim: s };
            }
        }
        return null;
    }

    /**
     * ¿Se llega al hoyo en `max` golpes como mucho? Busca primero un golpe que entre; si no, avanza por el camino con
     * los golpes que dejen la pelota más cerca del hoyo (varios candidatos por etapa) y vuelve a probar.
     */
    function resoluble(nv, j, max, opts) {
        opts = opts || {};
        var ancho = opts.candidatos || 3;
        var etapa = [{ x: nv.salida.x, z: nv.salida.z, plan: [] }];
        var t = opts.t || 0;
        for (var g = 1; g <= max; g++) {
            var siguientes = [];
            for (var e = 0; e < etapa.length; e++) {
                var b = pelota(etapa[e].x, etapa[e].z);
                var ok = buscarGolpe(nv, j, b, t, { angulos: opts.angulos || 48, tensiones: opts.tensiones || 12 });
                if (ok) return { golpes: g, plan: etapa[e].plan.concat([ok]) };
                if (g === max) continue;
                var dAhora = distanciaCamino(nv, b.x, b.z);
                for (var it = 0; it < 8; it++) {
                    for (var ia = 0; ia < 36; ia++) {
                        var T = 0.15 + 0.85 * it / 7;
                        var ang = ia / 36 * Math.PI * 2;
                        var s = simular(nv, j, b, t, ang, T, {});
                        var d = distanciaCamino(nv, s.fin.x, s.fin.z);
                        if (d < dAhora - 0.5) siguientes.push({ x: s.fin.x, z: s.fin.z, d: d, plan: etapa[e].plan.concat([{ angulo: ang, tension: T }]) });
                    }
                }
            }
            if (!siguientes.length) return null;
            siguientes.sort(function (a, c) { return a.d - c.d; });
            // candidatos variados: no tomar dos que terminen casi en el mismo lugar
            etapa = [];
            for (var k = 0; k < siguientes.length && etapa.length < ancho; k++) {
                var c = siguientes[k];
                if (etapa.some(function (o) { return Math.hypot(o.x - c.x, o.z - c.z) < 0.6; })) continue;
                etapa.push(c);
            }
            t += 3;
        }
        return null;
    }

    /** Distancia por el camino (a lo largo del centro) desde el punto hasta el hoyo. */
    function distanciaCamino(nv, x, z) {
        var c = nv.pista.centro;
        var sPunto = 0, sHoyo = 0, dp = Infinity, dh = Infinity;
        c.forEach(function (p) {
            var a = Math.hypot(p.x - x, p.z - z), b = Math.hypot(p.x - nv.hoyo.x, p.z - nv.hoyo.z);
            if (a < dp) { dp = a; sPunto = p.s; }
            if (b < dh) { dh = b; sHoyo = p.s; }
        });
        return Math.abs(sHoyo - sPunto) + Math.hypot(x - nv.hoyo.x, z - nv.hoyo.z) * 0.3;
    }

    /** Comprueba que el nivel sea jugable: devuelve una lista de avisos (vacía = válido). */
    function validarNivel(nv, j, opts) {
        opts = opts || {};
        var av = [];
        var r = j.radio;
        if (!dentroPoligono(nv.borde, nv.salida.x, nv.salida.z)) av.push("salida fuera del campo");
        else if (holgura(nv, nv.salida.x, nv.salida.z) < r + 0.25) av.push("salida pegada a una pared");
        if (!dentroPoligono(nv.borde, nv.hoyo.x, nv.hoyo.z)) av.push("hoyo fuera del campo");
        else if (holgura(nv, nv.hoyo.x, nv.hoyo.z) < nv.hoyo.r + 0.2) av.push("hoyo pegado a una pared");
        if (Math.hypot(nv.salida.x - nv.hoyo.x, nv.salida.z - nv.hoyo.z) < 2.5) av.push("hoyo demasiado cerca");
        var sH = sDePunto(nv.pista, nv.hoyo.x, nv.hoyo.z).s, sS = sDePunto(nv.pista, nv.salida.x, nv.salida.z).s;
        nv.molinos.forEach(function (m) {
            if (m.decorativo) return;
            // por la distancia a lo largo de la pista (sirve también en las vueltas en U)
            // ni en el embudo de entrada ni pegado a la salida del túnel
            if (sH < m.s && m.s - sH < m.D / 2 + m.F + 0.6) av.push("hoyo junto al molino");
            if (sH >= m.s && sH - m.s < m.D / 2 + 0.35 + 0.8) av.push("hoyo junto al molino");
            if (sS > m.s - m.D / 2 - m.F - 0.3 && sS < m.s + m.D / 2 + 0.6) av.push("salida dentro del embudo del molino");
            // el aspa debe dejar libre el centro de la boca buena parte del tiempo
            var libre = 0, n = 240;
            for (var i = 0; i < n; i++) if (aspaEn(m, 0, m.periodo * i / n, r) < 0) libre++;
            if (libre / n < 0.5) av.push("el molino casi no deja paso");
        });
        if (nv.molino && !nv.molino.decorativo && sH < nv.molino.s) av.push("hoyo antes del molino");
        nv.asteroides.forEach(function (a) {
            if (distSegmento(nv.hoyo.x, nv.hoyo.z, a.x0, a.z0, a.x1, a.z1).d < a.r + nv.hoyo.r + 0.5) av.push("asteroide sobre el hoyo");
            if (distSegmento(nv.salida.x, nv.salida.z, a.x0, a.z0, a.x1, a.z1).d < a.r + r + 0.5) av.push("asteroide sobre la salida");
        });
        nv.postes.forEach(function (p) {
            if (Math.hypot(p.x - nv.hoyo.x, p.z - nv.hoyo.z) < p.r + nv.hoyo.r + 0.5) av.push("pilar junto al hoyo");
            if (Math.hypot(p.x - nv.salida.x, p.z - nv.salida.z) < p.r + r + 0.6) av.push("pilar junto a la salida");
            if (holgura(nv, p.x, p.z) < p.r + r * 2 + 0.12) av.push("pilar que tapa el paso");
        });
        if (pendienteMaxima(nv) > (j.pendienteMaxima || 0.3)) av.push("pendiente demasiado fuerte");
        if (opts.golpes) {
            var res = resoluble(nv, j, opts.golpes, { angulos: opts.angulos || 48, tensiones: opts.tensiones || 12 });
            if (!res) av.push("no se encontró un camino en " + opts.golpes + " golpe(s)");
        }
        return av;
    }

    /** Estrellas del nivel según los golpes (nunca cero). */
    function estrellas(golpes, par) {
        if (golpes <= par) return 3;
        if (golpes <= par + 2) return 2;
        return 1;
    }

    /** Consejo amable tras un golpe que no entró. */
    function consejo(nv, j, b0, fin, info) {
        info = info || {};
        if (info.aspa) return "molino";
        var dAntes = distanciaCamino(nv, b0.x, b0.z);
        var dDespues = distanciaCamino(nv, fin.x, fin.z);
        var dRecta = Math.hypot(fin.x - nv.hoyo.x, fin.z - nv.hoyo.z);
        if (dRecta < 0.9) return "casi";
        if (info.pasoHoyo) return "menos";
        if (dDespues > dAntes - 0.5) return "direccion";
        return "mas";
    }

    var API = {
        DT: DT,
        G: G,
        azar: azar,
        entre: entre,
        construirPista: construirPista,
        puntoCentro: puntoCentro,
        puntoPista: puntoPista,
        dentroPoligono: dentroPoligono,
        distSegmento: distSegmento,
        marcoMolino: marcoMolino,
        paredesMolino: paredesMolino,
        anguloMolino: anguloMolino,
        bocaMolino: bocaMolino,
        aspaEn: aspaEn,
        alturaYGrad: function (nv, x, z) { return alturaYGrad(nv, x, z, { h: 0, gx: 0, gz: 0 }); },
        altura: altura,
        posAsteroide: posAsteroide,
        pelota: pelota,
        paso: paso,
        empujarQuieta: empujarQuieta,
        enTunel: enTunel,
        velocidadGolpe: velocidadGolpe,
        zona: zona,
        golpear: golpear,
        simular: simular,
        prepararNivel: prepararNivel,
        elegirMundo: elegirMundo,
        validarNivel: validarNivel,
        buscarGolpe: buscarGolpe,
        resoluble: resoluble,
        distanciaCamino: distanciaCamino,
        sDePunto: function (pista, x, z) { var r = sDePunto(pista, x, z); return { s: r.s, tx: r.tx, tz: r.tz }; },
        holgura: holgura,
        pendienteMaxima: pendienteMaxima,
        estrellas: estrellas,
        consejo: consejo
    };

    global.ReglasGolf = API;
    if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
