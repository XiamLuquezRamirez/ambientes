/**
 * SolidosPuzle — cuerpos geométricos en perspectiva isométrica (window.SolidosPuzle).
 *
 * Cada sólido se arma como un poliedro convexo (cajas, prismas triangulares, pirámides y, con 28
 * lados, cilindros y conos) en coordenadas de la cuadrícula: x crece hacia la derecha, y hacia el
 * frente y z hacia arriba. Solo se pintan las caras que miran al que observa (cara superior,
 * frontal y lateral), cada una con su tono según una luz fija, el contorno y la decoración de la
 * variante. La geometría (caras, proyección, cajas 2D) no usa Phaser y se prueba en Node; dibujar()
 * recibe un Phaser.GameObjects.Graphics.
 *
 * Proyección (escala 1): un paso en x = (46, 13) px, en y = (-28, 20) px y en z = (0, -52) px.
 */
(function (global) {
    "use strict";

    var EX = [46, 13], EY = [-28, 20], EZ = [0, -52];
    var LADOS = 28;
    // dirección hacia el que mira: la que se proyecta en un punto
    var VISTA = normal3([28, 46, (13 * 28 + 20 * 46) / 52]);
    var LUZ = normal3([-0.35, 0.55, 0.95]);

    function normal3(v) {
        var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
        return [v[0] / l, v[1] / l, v[2] / l];
    }
    function punto(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

    function proyectar(x, y, z, esc) {
        var k = esc || 1;
        return { x: (x * EX[0] + y * EY[0] + z * EZ[0]) * k, y: (x * EX[1] + y * EY[1] + z * EZ[1]) * k };
    }

    // ------------------------------------------------------------------ geometría local (orientación 0)

    function cara(pts, extra) {
        var c = { pts: pts };
        if (extra) Object.keys(extra).forEach(function (k) { c[k] = extra[k]; });
        return c;
    }

    function carasCaja(w, d, h) {
        return [
            cara([[0, 0, h], [w, 0, h], [w, d, h], [0, d, h]], { arriba: true }),
            cara([[0, 0, 0], [0, d, 0], [w, d, 0], [w, 0, 0]], { abajo: true }),
            // verticales con (u, v): u a lo largo de la cara, v hacia arriba (para la decoración)
            cara([[0, d, 0], [w, d, 0], [w, d, h], [0, d, h]], { pared: true, ancho: w, alto: h }),
            cara([[w, d, 0], [w, 0, 0], [w, 0, h], [w, d, h]], { pared: true, ancho: d, alto: h }),
            cara([[w, 0, 0], [0, 0, 0], [0, 0, h], [w, 0, h]], { pared: true, ancho: w, alto: h }),
            cara([[0, 0, 0], [0, d, 0], [0, d, h], [0, 0, h]], { pared: true, ancho: d, alto: h })
        ];
    }

    /** Prisma triangular acostado: la arista de arriba corre a lo largo de x. */
    function carasPrisma(w, d, h) {
        var m = d / 2;
        return [
            cara([[0, d, 0], [w, d, 0], [w, m, h], [0, m, h]], { techo: true }),
            cara([[w, 0, 0], [0, 0, 0], [0, m, h], [w, m, h]], { techo: true }),
            cara([[w, d, 0], [w, 0, 0], [w, m, h]], { pared: true, triangulo: true, ancho: d, alto: h }),
            cara([[0, 0, 0], [0, d, 0], [0, m, h]], { pared: true, triangulo: true, ancho: d, alto: h }),
            cara([[0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0]], { abajo: true })
        ];
    }

    function carasPiramide(w, d, h) {
        var a = [w / 2, d / 2, h];
        return [
            cara([[0, d, 0], [w, d, 0], a], { techo: true }),
            cara([[w, d, 0], [w, 0, 0], a], { techo: true }),
            cara([[w, 0, 0], [0, 0, 0], a], { techo: true }),
            cara([[0, 0, 0], [0, d, 0], a], { techo: true }),
            cara([[0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0]], { abajo: true })
        ];
    }

    function aro(w, d, z) {
        var out = [];
        for (var i = 0; i < LADOS; i++) {
            var a = (i / LADOS) * Math.PI * 2;
            out.push([w / 2 + Math.cos(a) * w / 2, d / 2 + Math.sin(a) * d / 2, z]);
        }
        return out;
    }

    function carasCilindro(w, d, h) {
        var b = aro(w, d, 0), t = aro(w, d, h);
        var l = [];
        for (var i = 0; i < LADOS; i++) {
            var k = (i + 1) % LADOS;
            l.push(cara([b[i], b[k], t[k], t[i]], { curva: true, seg: i }));
        }
        l.push(cara(t.slice(), { arriba: true, tapa: true }));
        l.push(cara(b.slice().reverse(), { abajo: true }));
        return l;
    }

    function carasCono(w, d, h) {
        var b = aro(w, d, 0);
        var a = [w / 2, d / 2, h];
        var l = [];
        for (var i = 0; i < LADOS; i++) {
            var k = (i + 1) % LADOS;
            l.push(cara([b[i], b[k], a], { curva: true, seg: i }));
        }
        l.push(cara(b.slice().reverse(), { abajo: true }));
        return l;
    }

    function carasBase(def) {
        var w = def.w, d = def.d, h = def.h;
        if (def.tipo === "prisma") return carasPrisma(w, d, h);
        if (def.tipo === "piramide") return carasPiramide(w, d, h);
        if (def.tipo === "cilindro") return carasCilindro(w, d, h);
        if (def.tipo === "cono") return carasCono(w, d, h);
        return carasCaja(w, d, h);
    }

    /** Normal hacia afuera (Newell + chequeo contra el centro del sólido). */
    function normalCara(pts, centro) {
        var n = [0, 0, 0], c = [0, 0, 0];
        for (var i = 0; i < pts.length; i++) {
            var p = pts[i], q = pts[(i + 1) % pts.length];
            n[0] += (p[1] - q[1]) * (p[2] + q[2]);
            n[1] += (p[2] - q[2]) * (p[0] + q[0]);
            n[2] += (p[0] - q[0]) * (p[1] + q[1]);
            c[0] += p[0]; c[1] += p[1]; c[2] += p[2];
        }
        c = [c[0] / pts.length - centro[0], c[1] / pts.length - centro[1], c[2] / pts.length - centro[2]];
        n = normal3(n);
        if (punto(n, c) < 0) n = [-n[0], -n[1], -n[2]];
        return n;
    }

    /** Gira (x, y) de una caja w × d de 90 en 90 sobre el piso: orient 1 = (x, y) → (d − y, x). */
    function girarPunto(p, w, d, orient) {
        var x = p[0], y = p[1], ww = w, dd = d;
        for (var i = 0; i < ((orient | 0) % 4 + 4) % 4; i++) {
            var nx = dd - y, ny = x;
            x = nx; y = ny;
            var t = ww; ww = dd; dd = t;
        }
        return [x, y, p[2]];
    }

    var cacheCaras = {};

    /**
     * Caras del sólido con la orientación dada (0-3), en coordenadas locales (esquina 0, 0, 0).
     * Cada cara: { pts, n, visible, luz, ... }.
     */
    function caras(def, orient) {
        var clave = [def.tipo, def.w, def.d, def.h, orient | 0].join(":");
        if (cacheCaras[clave]) return cacheCaras[clave];
        var impar = ((orient | 0) % 2 + 2) % 2 === 1;
        var W = impar ? def.d : def.w, D = impar ? def.w : def.d;
        var centro = [W / 2, D / 2, def.h / 2];
        var l = carasBase(def).map(function (c) {
            var pts = c.pts.map(function (p) { return girarPunto(p, def.w, def.d, orient); });
            var n = normalCara(pts, centro);
            var out = {};
            Object.keys(c).forEach(function (k) { out[k] = c[k]; });
            out.pts = pts;
            out.n = n;
            out.visible = punto(n, VISTA) > 0.015;
            out.luz = 0.6 + 0.4 * (punto(n, LUZ) * 0.5 + 0.5);
            return out;
        });
        var res = { caras: l, w: W, d: D, h: def.h, centro: centro };
        cacheCaras[clave] = res;
        return res;
    }

    /** Caja 2D (relativa al ancla: el centro proyectado de la caja 3D) a la escala dada. */
    function rect2d(def, orient, esc) {
        var g = caras(def, orient);
        var a = proyectar(g.centro[0], g.centro[1], g.centro[2], esc);
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        g.caras.forEach(function (c) {
            c.pts.forEach(function (p) {
                var q = proyectar(p[0], p[1], p[2], esc);
                x0 = Math.min(x0, q.x - a.x); x1 = Math.max(x1, q.x - a.x);
                y0 = Math.min(y0, q.y - a.y); y1 = Math.max(y1, q.y - a.y);
            });
        });
        return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0, h: y1 - y0 };
    }

    /** Centro 3D (mundo) de una caja { x0..z1 }. */
    function centroCaja(c) {
        return [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, (c.z0 + c.z1) / 2];
    }

    // ------------------------------------------------------------------ color

    function hexA(c) {
        if (typeof c === "number") return c;
        return parseInt(String(c || "#888888").replace("#", ""), 16);
    }

    function mezclar(a, b, u) {
        var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
        var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
        var f = function (x, y) { return Math.round(x + (y - x) * u); };
        return (f(ar, br) << 16) | (f(ag, bg) << 8) | f(ab, bb);
    }

    function escalar(c, k) {
        var r = Math.min(255, Math.round(((c >> 16) & 255) * k));
        var g = Math.min(255, Math.round(((c >> 8) & 255) * k));
        var b = Math.min(255, Math.round((c & 255) * k));
        return (r << 16) | (g << 8) | b;
    }

    function tono(base, cara, brillo) {
        var c = escalar(base, cara.luz);
        if (cara.arriba) c = mezclar(c, 0xffffff, 0.16);
        if (brillo) c = mezclar(c, 0xffffff, Math.max(0, Math.min(1, brillo)));
        return c;
    }

    // ------------------------------------------------------------------ dibujo

    function aPantalla(p, esc, ancla) {
        var q = proyectar(p[0], p[1], p[2], esc);
        return { x: q.x - ancla.x, y: q.y - ancla.y };
    }

    /** Punto de una cara vertical de cuatro lados con (u, v) en 0..1. */
    function bilineal(pts, u, v) {
        var a = pts[0], b = pts[1], c = pts[2], d = pts[3];
        var ab = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
        var dc = [d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u, d[2] + (c[2] - d[2]) * u];
        return [ab[0] + (dc[0] - ab[0]) * v, ab[1] + (dc[1] - ab[1]) * v, ab[2] + (dc[2] - ab[2]) * v];
    }

    /** Punto de una cara triangular (base a-b, punta c) con (u, v) en 0..1. */
    function triangular(pts, u, v) {
        var a = pts[0], b = pts[1], c = pts[2];
        var bx = a[0] + (b[0] - a[0]) * u, by = a[1] + (b[1] - a[1]) * u, bz = a[2] + (b[2] - a[2]) * u;
        return [bx + (c[0] - bx) * v, by + (c[1] - by) * v, bz + (c[2] - bz) * v];
    }

    function poligono(g, pts, color, alfa) {
        g.fillStyle(color, alfa);
        g.fillPoints(pts, true, true);
    }

    /** Decoración de una cara vertical: puntos, rayas, estrella, ladrillos o rombos. */
    function decorar(g, c, deco, base, op) {
        if (!deco || deco === "liso" || !c.pared) return;
        var en = c.triangulo ? function (u, v) { return triangular(c.pts, u, v); } : function (u, v) { return bilineal(c.pts, u, v); };
        var P = function (u, v) { return aPantalla(en(u, v), op.esc, op.ancla); };
        var claro = mezclar(base, 0xffffff, 0.55), osc = escalar(base, 0.62);
        var a = op.alfa != null ? op.alfa : 1;
        var ancho = c.ancho || 1, alto = c.alto || 1;
        var lado = Math.min(ancho, alto);
        var circ = function (cu, cv, r, color, alf) {
            var pts = [];
            for (var i = 0; i < 12; i++) {
                var t = i / 12 * Math.PI * 2;
                pts.push(P(cu + Math.cos(t) * r / ancho, cv + Math.sin(t) * r / alto));
            }
            poligono(g, pts, color, alf);
        };
        if (c.triangulo) {
            // en el frente triangular del prisma: una ventanita redonda o un rombo
            if (deco === "rombos" || deco === "estrella") {
                poligono(g, [P(0.5, 0.12), P(0.66, 0.32), P(0.5, 0.52), P(0.34, 0.32)], claro, 0.85 * a);
            } else {
                circ(0.5, 0.3, lado * 0.16, osc, 0.55 * a);
                circ(0.5, 0.3, lado * 0.1, claro, 0.8 * a);
            }
            return;
        }
        if (deco === "puntos") {
            var n = Math.max(1, Math.min(4, Math.round(ancho / 0.6)));
            for (var i = 0; i < n; i++) circ((i + 0.5) / n, 0.5, lado * 0.13, claro, 0.8 * a);
        } else if (deco === "rayas") {
            [[0.22, 0.34], [0.62, 0.74]].forEach(function (r) {
                poligono(g, [P(0.04, r[0]), P(0.96, r[0]), P(0.96, r[1]), P(0.04, r[1])], claro, 0.6 * a);
            });
        } else if (deco === "estrella") {
            var s = [];
            for (var k = 0; k < 10; k++) {
                var t = -Math.PI / 2 + k * Math.PI / 5;
                var rr = (k % 2 ? 0.42 : 1) * lado * 0.3;
                s.push(P(0.5 + Math.cos(t) * rr / ancho, 0.5 - Math.sin(t) * rr / alto));
            }
            poligono(g, s, 0xfff3bf, 0.9 * a);
        } else if (deco === "ladrillos") {
            g.lineStyle(Math.max(1.2, 2 * op.esc), osc, 0.5 * a);
            var filas = Math.max(2, Math.round(alto / 0.33));
            for (var f = 1; f < filas; f++) {
                var p0 = P(0, f / filas), p1 = P(1, f / filas);
                g.lineBetween(p0.x, p0.y, p1.x, p1.y);
            }
            var cols = Math.max(2, Math.round(ancho / 0.5));
            for (var fi = 0; fi < filas; fi++) {
                for (var cc = 1; cc < cols; cc++) {
                    var uu = (cc + (fi % 2 ? 0.5 : 0)) / cols;
                    if (uu >= 1) continue;
                    var q0 = P(uu, fi / filas), q1 = P(uu, (fi + 1) / filas);
                    g.lineBetween(q0.x, q0.y, q1.x, q1.y);
                }
            }
        } else if (deco === "rombos") {
            var m = Math.max(1, Math.min(3, Math.round(ancho / 0.8)));
            for (var j = 0; j < m; j++) {
                var cu = (j + 0.5) / m, du = 0.16 / m * 1.6, dv = 0.22;
                poligono(g, [P(cu, 0.5 - dv), P(cu + du, 0.5), P(cu, 0.5 + dv), P(cu - du, 0.5)], claro, 0.75 * a);
            }
        }
    }

    /** Aros o puntos sobre la parte visible de un cilindro o un cono. */
    function decorarCurva(g, def, geo, deco, base, op) {
        if (!deco || deco === "liso") return;
        var visibles = geo.caras.filter(function (c) { return c.curva && c.visible; });
        if (!visibles.length) return;
        var claro = mezclar(base, 0xffffff, 0.55);
        var a = op.alfa != null ? op.alfa : 1;
        var cono = def.tipo === "cono";
        var anillo = function (v, grosor) {
            visibles.forEach(function (c) {
                var p0, p1, p2, p3;
                if (cono) {
                    p0 = triangular(c.pts, 0, v); p1 = triangular(c.pts, 1, v);
                    p2 = triangular(c.pts, 1, v + grosor); p3 = triangular(c.pts, 0, v + grosor);
                } else {
                    p0 = bilineal(c.pts, 0, v); p1 = bilineal(c.pts, 1, v);
                    p2 = bilineal(c.pts, 1, v + grosor); p3 = bilineal(c.pts, 0, v + grosor);
                }
                poligono(g, [p0, p1, p2, p3].map(function (p) { return aPantalla(p, op.esc, op.ancla); }), claro, 0.55 * a);
            });
        };
        if (deco === "rayas" || deco === "ladrillos") { anillo(0.25, 0.1); anillo(0.62, 0.1); }
        else if (deco === "rombos") { anillo(0.45, 0.12); }
        else {
            // puntos o estrella: una hilera de puntos al frente
            var mitad = visibles[Math.floor(visibles.length / 2)];
            var idx = visibles.indexOf(mitad);
            [-4, 0, 4].forEach(function (dk) {
                var c = visibles[Math.max(0, Math.min(visibles.length - 1, idx + dk))];
                var centro = cono ? triangular(c.pts, 0.5, 0.3) : bilineal(c.pts, 0.5, 0.5);
                var q = aPantalla(centro, op.esc, op.ancla);
                g.fillStyle(deco === "estrella" ? 0xfff3bf : claro, 0.85 * a);
                g.fillCircle(q.x, q.y, Math.max(2, def.w * 7 * op.esc));
            });
        }
    }

    /** Contorno exterior de un cilindro o cono: tapa, líneas de los costados y arco de abajo. */
    function contornoCurva(g, def, geo, op, color, ancho, alfa) {
        var curvas = geo.caras.filter(function (c) { return c.curva; });
        var vis = curvas.map(function (c) { return c.visible; });
        var n = curvas.length;
        // la corrida visible es contigua: buscar dónde empieza
        var ini = -1;
        for (var i = 0; i < n; i++) if (vis[i] && !vis[(i - 1 + n) % n]) { ini = i; break; }
        g.lineStyle(ancho, color, alfa);
        if (ini < 0) return;
        var arco = [];
        var k = ini;
        var guard = 0;
        while (vis[k] && guard++ <= n) {
            arco.push(aPantalla(curvas[k].pts[0], op.esc, op.ancla));
            k = (k + 1) % n;
        }
        arco.push(aPantalla(curvas[(k - 1 + n) % n].pts[1], op.esc, op.ancla));
        g.strokePoints(arco, false, false);
        var primero = curvas[ini], ultimo = curvas[(k - 1 + n) % n];
        var arriba0 = def.tipo === "cono" ? primero.pts[2] : primero.pts[3];
        var arriba1 = def.tipo === "cono" ? ultimo.pts[2] : ultimo.pts[2];
        var a0 = aPantalla(primero.pts[0], op.esc, op.ancla), t0 = aPantalla(arriba0, op.esc, op.ancla);
        var a1 = aPantalla(ultimo.pts[1], op.esc, op.ancla), t1 = aPantalla(arriba1, op.esc, op.ancla);
        g.lineBetween(a0.x, a0.y, t0.x, t0.y);
        g.lineBetween(a1.x, a1.y, t1.x, t1.y);
    }

    /**
     * Dibuja el sólido en g con el ancla (centro proyectado de su caja) en (0, 0).
     * op: { esc, color, alfa, brillo, deco, fantasma, contorno, anchoContorno }
     */
    function dibujar(g, def, orient, opciones) {
        var o = opciones || {};
        var esc = o.esc || 1;
        var geo = caras(def, orient);
        var a0 = proyectar(geo.centro[0], geo.centro[1], geo.centro[2], esc);
        // dx, dy: dónde queda el ancla dentro de g (por defecto en 0, 0)
        var ancla = { x: a0.x - (o.dx || 0), y: a0.y - (o.dy || 0) };
        var op = { esc: esc, ancla: ancla, alfa: o.alfa != null ? o.alfa : 1 };
        var base = hexA(o.color);
        var lineaCol = o.contorno != null ? hexA(o.contorno) : escalar(base, 0.42);
        var anchoL = o.anchoContorno || Math.max(1.4, 2.6 * esc);
        var curvo = def.tipo === "cilindro" || def.tipo === "cono";
        var visibles = geo.caras.filter(function (c) { return c.visible && !c.abajo; });

        if (o.fantasma) {
            visibles.forEach(function (c) {
                var pts = c.pts.map(function (p) { return aPantalla(p, esc, ancla); });
                g.fillStyle(mezclar(0xffffff, base, 0.35), (c.arriba ? 0.45 : 0.32) * op.alfa);
                g.fillPoints(pts, true, true);
            });
            var col = hexA(o.contorno != null ? o.contorno : 0xfff59d);
            if (curvo) {
                contornoCurva(g, def, geo, op, col, anchoL, 0.95 * op.alfa);
                var tapa = geo.caras.filter(function (c) { return c.tapa; })[0];
                if (tapa) g.strokePoints(tapa.pts.map(function (p) { return aPantalla(p, esc, ancla); }), true, true);
            } else {
                g.lineStyle(anchoL, col, 0.95 * op.alfa);
                visibles.forEach(function (c) {
                    g.strokePoints(c.pts.map(function (p) { return aPantalla(p, esc, ancla); }), true, true);
                });
            }
            return;
        }

        visibles.forEach(function (c) {
            var pts = c.pts.map(function (p) { return aPantalla(p, esc, ancla); });
            var col = tono(base, c, o.brillo);
            g.fillStyle(col, op.alfa);
            g.fillPoints(pts, true, true);
            if (c.curva) {
                // costura invisible entre los lados del cilindro
                g.lineStyle(1, col, op.alfa);
                g.strokePoints(pts, true, true);
            }
        });
        if (curvo) decorarCurva(g, def, geo, o.deco, base, op);
        else visibles.forEach(function (c) { decorar(g, c, o.deco, tono(base, c, o.brillo), op); });
        // reflejo en el borde superior
        if (!curvo) {
            visibles.forEach(function (c) {
                if (!c.arriba && !c.techo) return;
                var pts = c.pts.map(function (p) { return aPantalla(p, esc, ancla); });
                g.lineStyle(Math.max(1, 1.6 * esc), 0xffffff, 0.35 * op.alfa);
                g.strokePoints(pts, true, true);
            });
        }
        if (curvo) {
            contornoCurva(g, def, geo, op, lineaCol, anchoL, op.alfa);
            var tp = geo.caras.filter(function (c) { return c.tapa; })[0];
            if (tp) {
                g.lineStyle(anchoL, lineaCol, op.alfa);
                g.strokePoints(tp.pts.map(function (p) { return aPantalla(p, esc, ancla); }), true, true);
            }
        } else {
            g.lineStyle(anchoL, lineaCol, op.alfa);
            visibles.forEach(function (c) {
                g.strokePoints(c.pts.map(function (p) { return aPantalla(p, esc, ancla); }), true, true);
            });
        }
    }

    /**
     * Huella (piso) de una caja del mundo, en pantalla relativa a `origen` (proyección de 0,0,0).
     * Devuelve 4 puntos { x, y } para pintar sombras, resaltes y ondas.
     */
    function huella(c, esc, origen, z) {
        var zz = z != null ? z : c.z0;
        var o = origen || { x: 0, y: 0 };
        return [[c.x0, c.y0], [c.x1, c.y0], [c.x1, c.y1], [c.x0, c.y1]].map(function (p) {
            var q = proyectar(p[0], p[1], zz, esc);
            return { x: o.x + q.x, y: o.y + q.y };
        });
    }

    global.SolidosPuzle = {
        EX: EX, EY: EY, EZ: EZ,
        VISTA: VISTA,
        proyectar: proyectar,
        caras: caras,
        rect2d: rect2d,
        centroCaja: centroCaja,
        huella: huella,
        dibujar: dibujar,
        hexA: hexA,
        mezclar: mezclar,
        escalar: escalar
    };
})(typeof window !== "undefined" ? window : global);
