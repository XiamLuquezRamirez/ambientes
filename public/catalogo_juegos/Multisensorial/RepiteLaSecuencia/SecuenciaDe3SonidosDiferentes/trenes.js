/**
 * «El valle de los cambiavías» — motor propio de Secuencia de 3 Sonidos Diferentes (5-6 años).
 *
 * Verbo de juego: PLANIFICAR EL CAMINO de un tren con cambiavías. Cada estación del valle tiene su
 * sonido (se ve su instrumento y se oye al tocarla). Un tren sale del túnel y recorre las vías: en
 * cada desvío va por el lado que marca el cambiavías, y el niño los toca para llevarlo a la estación
 * que toca. La ruta que seguirá el tren se ilumina, así que siempre se ve a dónde va. El programa
 * (la canción de 3 o 4 sonidos diferentes) se arma llevando el tren a las estaciones EN ORDEN, una por
 * viaje. Llegar a una estación que no toca reinicia el programa (el tren sigue y se prueba de nuevo);
 * un semáforo da tiempo de preparar los desvíos antes de cada salida y un toque lo adelanta.
 *
 * Nada depende del azar ni de la puntería: los desvíos son grandes y el tren va a una velocidad
 * tranquila. Niveles: más estaciones y desvíos, el tren más rápido. El valle cambia: primavera,
 * otoño, nieve y noche. Final: tren de fiesta con luces y personajes.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;

    var VELOCIDAD = [92, 104, 116, 128];
    var ESPERA = [2.4, 2.2, 2.0, 1.8];
    var COL_E = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];
    var COL_VAGON = [0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8];
    var BIOMAS = [
        { cielo: [0x74c0fc, 0xe3f4ff], lejos: 0x9db4d0, medio: 0x6fb06a, suelo: 0x8bc760, noche: 0, nieve: 0, arbol: 0x2f9e44, rio: 0x4dabf7 },
        { cielo: [0xffa94d, 0xfff0d6], lejos: 0xc29a7a, medio: 0xc9803c, suelo: 0xd9a05b, noche: 0, nieve: 0, arbol: 0xe67700, rio: 0x74a8c9 },
        { cielo: [0x9db4d0, 0xf0f6fc], lejos: 0xb8c7da, medio: 0xe3edf7, suelo: 0xf5f9fd, noche: 0, nieve: 1, arbol: 0x2b6e47, rio: 0xa5c8e4 },
        { cielo: [0x070d2b, 0x2d3d82], lejos: 0x2b3566, medio: 0x1d2a52, suelo: 0x233a52, noche: 1, nieve: 0, arbol: 0x15402e, rio: 0x1c3a68 }
    ];

    function mezcla(a, b, t) {
        var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100);
        return C.GetColor(c.r, c.g, c.b);
    }
    function hash(i) { var x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); }
    function P(x, y, ang, lx, ly) { var c = Math.cos(ang), s = Math.sin(ang); return { x: x + lx * c - ly * s, y: y + lx * s + ly * c }; }
    function R(g, x, y, ang, x0, y0, x1, y1, col, al) { g.fillStyle(col, al == null ? 1 : al); g.fillPoints([P(x, y, ang, x0, y0), P(x, y, ang, x1, y0), P(x, y, ang, x1, y1), P(x, y, ang, x0, y1)], true); }
    function Ci(g, x, y, ang, lx, ly, r, col, al) { var p = P(x, y, ang, lx, ly); g.fillStyle(col, al == null ? 1 : al); g.fillCircle(p.x, p.y, r); }

    /** Arista de vía: puntos muestreados cada ~8 px con su longitud acumulada. */
    function crearArista(p0, p3, tipo, recta) {
        var h = (p3.x - p0.x) * 0.5, pts = [], n = Math.max(2, Math.ceil(Math.hypot(p3.x - p0.x, p3.y - p0.y) / 8));
        for (var i = 0; i <= n; i++) {
            var t = i / n, u = 1 - t, x, y;
            if (recta) { x = p0.x + (p3.x - p0.x) * t; y = p0.y + (p3.y - p0.y) * t; }
            else { x = u * u * u * p0.x + 3 * u * u * t * (p0.x + h) + 3 * u * t * t * (p3.x - h) + t * t * t * p3.x; y = u * u * u * p0.y + 3 * u * u * t * p0.y + 3 * u * t * t * p3.y + t * t * t * p3.y; }
            pts.push({ x: x, y: y });
        }
        var len = [0];
        for (var k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
        return { pts: pts, len: len, total: len[len.length - 1], tipo: tipo, hacia: null, desde: null };
    }
    /** Posición y ángulo a la distancia s de la arista (se prolonga recto antes y después). */
    function enArista(a, s) {
        var pts = a.pts, n = pts.length;
        if (s <= 0) { var d0 = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x); return { x: pts[0].x + Math.cos(d0) * s, y: pts[0].y + Math.sin(d0) * s, ang: d0 }; }
        if (s >= a.total) { var d1 = Math.atan2(pts[n - 1].y - pts[n - 2].y, pts[n - 1].x - pts[n - 2].x); return { x: pts[n - 1].x + Math.cos(d1) * (s - a.total), y: pts[n - 1].y + Math.sin(d1) * (s - a.total), ang: d1 }; }
        var i = 1; while (i < n - 1 && a.len[i] < s) i++;
        var f = (s - a.len[i - 1]) / Math.max(0.0001, a.len[i] - a.len[i - 1]);
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f, ang: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) };
    }

    var escena = {
        iniciar: function () {
            this.nodos = []; this.estaciones = []; this.aristas = [];
            this.entrada = null; this.tren = null;
            this.objs = []; this.leversC = [];
            this.prog = 0; this.song = [];
            this.reunidos = [];
            this.humo = []; this.trail = [];
            this.bombillasEsc = 0;
            this.nivelV = 0;
            this.fiesta = false;
            this.ultimoReclamo = -99999;
            this.efectos = [];
            this.pulsoSt = {};
            this.viajes = 0;
        },

        filtrarPool: function (pool) {
            var ok = K.ANIMALES.concat(['campana', 'tambor', 'maracas', 'trompeta', 'carro', 'tren', 'reloj', 'pelota']);
            var f = pool.filter(function (id) { return ok.indexOf(id) >= 0; });
            return f.length >= 6 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.k = Math.max(0.72, Math.min(1.15, H / 768));
            L.tunel = Math.round(W * 0.055);
            L.xRaiz = Math.round(W * 0.2);
            L.xFin = Math.round(L.der * 0.74);
            L.yTop = Math.round(H * 0.34); L.yBot = Math.round(H * 0.84);
            L.bocina = { x: 48, y: Math.round(H * 0.17), r: 30 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.cieloG = keep(this.add.graphics().setDepth(1));
            this.fondoG = keep(this.add.graphics().setDepth(2));
            this.viasG = keep(this.add.graphics().setDepth(8));
            this.rutaG = keep(this.add.graphics().setDepth(9));
            this.trenG = keep(this.add.graphics().setDepth(30));
            this.tunelG = keep(this.add.graphics().setDepth(34));
            this.luzG = keep(this.add.graphics().setDepth(40));
            this.montarHud(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: 60, w: L.W, h: L.H - 100, depth: 6 }, 0xffffff);
            if (this.nv && this.nv.opciones) this.construirNivel(this.nv);
        },

        /* ── Red de vías: un árbol de cambiavías; cada hoja es una estación ── */

        construirNivel: function (nv) {
            var L = this.L, self = this;
            this.objs.forEach(function (o) { if (o && o.active) o.destroy(); });
            this.objs = []; this.leversC = [];
            this.nodos = []; this.estaciones = []; this.aristas = [];
            var ids = Ut.mezclar(nv.opciones.slice());
            var m = ids.length;
            ids.forEach(function (id, i) {
                self.estaciones.push({ id: id, x: L.xFin, y: L.yTop + (L.yBot - L.yTop) * (i + 0.5) / m, col: COL_E[i % 6], llegada: null, salida: null, pulso: 0 });
            });
            var profMax = Math.ceil(Math.log(m) / Math.log(2));
            var dx = (L.xFin - L.xRaiz - 30) / (profMax + 0.8);
            var arista = function (p0, p3, tipo, recta) { var a = crearArista(p0, p3, tipo, recta); self.aristas.push(a); return a; };
            var construir = function (l, r, prof) {
                if (r - l === 1) return { hoja: self.estaciones[l], y: self.estaciones[l].y };
                var mid = l + Math.ceil((r - l) / 2);
                var arriba = construir(l, mid, prof + 1), abajo = construir(mid, r, prof + 1);
                var nodo = { tipo: 'nodo', x: L.xRaiz + prof * dx, y: (arriba.y + abajo.y) / 2, estado: 0, hijos: [null, null], prof: prof, bloq: false, hojas: [], giro: 0 };
                [arriba, abajo].forEach(function (c, i) {
                    var destino = c.hoja ? { x: L.xFin - 18, y: c.hoja.y } : { x: c.x, y: c.y };
                    var a = arista({ x: nodo.x, y: nodo.y }, destino, 'rama', false);
                    a.desde = nodo;
                    if (c.hoja) { a.hacia = { tipo: 'estacion', est: c.hoja }; c.hoja.llegada = a; var s = arista({ x: L.xFin - 18, y: c.hoja.y }, { x: L.xFin + 150, y: c.hoja.y }, 'salida', true); s.hacia = { tipo: 'fin' }; c.hoja.salida = s; }
                    else { a.hacia = c; }
                    nodo.hijos[i] = a;
                });
                nodo.hojas = (arriba.hojas || (arriba.hoja ? [arriba.hoja] : [])).concat(abajo.hojas || (abajo.hoja ? [abajo.hoja] : []));
                nodo.y = nodo.y;
                self.nodos.push(nodo);
                return nodo;
            };
            var raiz = construir(0, m, 0);
            raiz.y = raiz.y;
            this.raiz = raiz;
            this.entrada = crearArista({ x: L.tunel, y: raiz.y }, { x: raiz.x, y: raiz.y }, 'entrada', true);
            this.entrada.hacia = raiz;
            this.aristas.push(this.entrada);
            this.pintarEscenario();
            this.pintarVias();
            this.crearEstacionesYPalancas();
        },

        /* ── Escenario del valle (se pinta una vez por nivel) ── */

        pintarEscenario: function () {
            var L = this.L, g = this.cieloG, f = this.fondoG, B = BIOMAS[this.nivelV % 4];
            g.clear(); f.clear();
            for (var b = 0; b < 18; b++) { g.fillStyle(mezcla(B.cielo[0], B.cielo[1], b / 17), 1); g.fillRect(0, (L.H * 0.62 / 18) * b, L.W, L.H * 0.62 / 18 + 1); }
            var hor = L.H * 0.32;
            // Astro y estrellas.
            if (B.noche) { for (var e = 0; e < 70; e++) { f.fillStyle(0xffffff, 0.3 + 0.6 * ((e * 7) % 10) / 10); f.fillCircle((e * 977 + 50) % L.W, 8 + (e * 613) % (hor * 0.9), 1 + (e % 3) * 0.6); } f.fillStyle(0xf1f3f5, 0.2); f.fillCircle(L.W * 0.82, L.H * 0.14, 60); f.fillStyle(0xf1f3f5, 1); f.fillCircle(L.W * 0.82, L.H * 0.14, 34); f.fillStyle(0xced4da, 1); f.fillCircle(L.W * 0.82 - 9, L.H * 0.14 - 7, 7); }
            else { f.fillStyle(0xfff3bf, 0.25); f.fillCircle(L.W * 0.8, L.H * 0.13, 80); f.fillStyle(0xffe066, 1); f.fillCircle(L.W * 0.8, L.H * 0.13, 40); }
            // Montañas lejanas con picos nevados y un volcán humeante.
            f.fillStyle(B.lejos, 1); f.beginPath(); f.moveTo(0, hor + 40);
            var picos = [];
            for (var x1 = 0; x1 <= L.W + 20; x1 += 20) { var hh = (Math.sin(x1 / 200) * 0.5 + Math.sin(x1 / 83 + 1) * 0.3 + Math.sin(x1 / 37) * 0.2 + 1) * 0.5, yy = hor - hh * 120; f.lineTo(x1, yy); if (hh > 0.8) picos.push({ x: x1, y: yy }); }
            f.lineTo(L.W + 20, hor + 40); f.closePath(); f.fillPath();
            f.fillStyle(0xffffff, B.nieve ? 0.95 : 0.8); picos.forEach(function (p) { f.fillTriangle(p.x - 20, p.y + 22, p.x + 20, p.y + 22, p.x, p.y - 2); });
            var vx = L.W * 0.62;
            f.fillStyle(mezcla(B.lejos, 0x5c3b3b, 0.4), 1); f.fillTriangle(vx - 120, hor + 30, vx + 120, hor + 30, vx, hor - 120);
            f.fillStyle(0xff6b3a, B.noche ? 0.9 : 0.5); f.fillTriangle(vx - 24, hor - 98, vx + 24, hor - 98, vx, hor - 120);
            // Colinas medias, árboles y casas.
            f.fillStyle(B.medio, 1); f.beginPath(); f.moveTo(0, L.H); f.lineTo(0, hor + 60);
            for (var x2 = 0; x2 <= L.W + 20; x2 += 20) f.lineTo(x2, hor + 60 - (Math.sin(x2 / 150 + 2) * 0.5 + Math.sin(x2 / 61) * 0.3 + 1) * 40);
            f.lineTo(L.W + 20, L.H); f.closePath(); f.fillPath();
            f.fillStyle(B.suelo, 1); f.fillRect(0, hor + 90, L.W, L.H - hor - 90);
            for (var t = 0; t < 36; t++) { var tx = (t * 97 + hash(t) * 60) % L.W, ty = hor + 80 + (t * 53) % (L.H - hor - 90), th = 30 + hash(t + 9) * 26; if (tx > L.tunel - 20 && tx < L.xFin + 150 && ty > L.yTop - 40 && ty < L.yBot + 30) continue; f.fillStyle(0x5c3b1e, 1); f.fillRect(tx - 3, ty - th * 0.25, 6, th * 0.5); f.fillStyle(B.arbol, 1); f.fillTriangle(tx - th * 0.4, ty, tx + th * 0.4, ty, tx, ty - th); f.fillTriangle(tx - th * 0.32, ty - th * 0.4, tx + th * 0.32, ty - th * 0.4, tx, ty - th * 1.2); if (B.nieve) { f.fillStyle(0xffffff, 0.9); f.fillTriangle(tx - th * 0.14, ty - th * 0.95, tx + th * 0.14, ty - th * 0.95, tx, ty - th * 1.2); } }
            // Laguna con juncos y flores, fuera del trazado de las vías.
            var lx = L.W * 0.2, ly = L.H * 0.95;
            f.fillStyle(mezcla(B.rio, 0x000000, 0.18), 1); f.fillEllipse(lx, ly, 330, 62);
            f.fillStyle(B.rio, 1); f.fillEllipse(lx, ly - 3, 316, 52);
            f.fillStyle(0xffffff, 0.35); f.fillEllipse(lx - 60, ly - 8, 80, 8);
            for (var fl = 0; fl < 26; fl++) { var fx = (fl * 53 + 17) % L.W, fy = L.yBot + 46 + (fl * 37) % Math.max(10, L.H - L.yBot - 54); f.fillStyle([0xff6b6b, 0xffd43b, 0xffffff, 0xcc5de8][fl % 4], B.nieve ? 0.4 : 1); f.fillCircle(fx, fy, 3.2); }
            [0.08, 0.9].forEach(function (cx, i) { var x = L.W * cx, y = hor + 120 + i * 40; f.fillStyle(B.noche ? 0x1a2552 : 0xffe3b0, 1); f.fillRect(x - 30, y - 30, 60, 30); f.fillStyle(B.noche ? 0x0e1530 : 0xc92a2a, 1); f.fillTriangle(x - 38, y - 30, x + 38, y - 30, x, y - 62); f.fillStyle(B.noche ? 0xffe066 : 0x74c0fc, 1); f.fillRect(x - 8, y - 22, 14, 14); });
        },

        /** Vías: balasto, durmientes y rieles de cada arista; túneles a la entrada y a la salida de las estaciones. */
        pintarVias: function () {
            var L = this.L, g = this.viasG, tg = this.tunelG;
            g.clear(); tg.clear();
            this.aristas.forEach(function (a) {
                var pts = a.pts;
                g.lineStyle(26, 0x7a5c44, 1); g.beginPath(); pts.forEach(function (p, i) { if (!i) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }); g.strokePath();
                g.lineStyle(20, 0x9a7b5f, 0.7); g.beginPath(); pts.forEach(function (p, i) { if (!i) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }); g.strokePath();
                for (var i = 2; i < pts.length; i += 2) {
                    var dx = pts[i].x - pts[i - 2].x, dy = pts[i].y - pts[i - 2].y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
                    g.lineStyle(4, 0x4a3426, 0.9); g.lineBetween(pts[i].x - nx * 12, pts[i].y - ny * 12, pts[i].x + nx * 12, pts[i].y + ny * 12);
                }
                [-6, 6].forEach(function (off) {
                    g.lineStyle(3, 0xe9ecef, 1); g.beginPath();
                    for (var j = 0; j < pts.length; j++) { var a0 = pts[Math.max(0, j - 1)], a1 = pts[Math.min(pts.length - 1, j + 1)], ddx = a1.x - a0.x, ddy = a1.y - a0.y, dd = Math.hypot(ddx, ddy) || 1; var px = pts[j].x - ddy / dd * off, py = pts[j].y + ddx / dd * off; if (!j) g.moveTo(px, py); else g.lineTo(px, py); }
                    g.strokePath();
                });
            });
            // Montañas con bocas de túnel: la del tren a la izquierda y la de las salidas a la derecha.
            var B = BIOMAS[this.nivelV % 4], roca = mezcla(B.lejos, 0x3a2f2a, 0.45), rocaClara = mezcla(roca, 0xffffff, 0.18), self = this;
            var montana = function (x0, x1, yTop, yBase) {
                var pts = [{ x: x0, y: yBase }], n = 18;
                for (var i = 0; i <= n; i++) { var u = i / n, x = x0 + (x1 - x0) * u; pts.push({ x: x, y: yTop + Math.abs(Math.sin(u * Math.PI * 1.5 + 0.4)) * -26 + 60 * Math.pow(Math.abs(u - 0.5) * 2, 2.2) + hash(i + x0) * 10 }); }
                pts.push({ x: x1, y: yBase });
                tg.fillStyle(roca, 1); tg.fillPoints(pts, true);
                var cara = pts.slice(1, Math.ceil(pts.length / 2)).concat([{ x: x0 + (x1 - x0) * 0.5, y: yBase }, { x: x0, y: yBase }]);
                tg.fillStyle(rocaClara, 0.55); tg.fillPoints(cara, true);
                tg.lineStyle(3, mezcla(roca, 0x000000, 0.35), 0.6);
                for (var k = 0; k < 9; k++) { var rx = x0 + (x1 - x0) * hash(k + x0 * 0.3), ry = yTop + 50 + hash(k + 33) * (yBase - yTop - 60); tg.lineBetween(rx, ry, rx + 16, ry + 9); tg.lineBetween(rx + 16, ry + 9, rx + 10, ry + 22); }
                tg.fillStyle(B.nieve ? 0xffffff : B.medio, 1);
                tg.fillPoints(pts.slice(1, -1).map(function (p) { return { x: p.x, y: p.y }; }).concat(pts.slice(1, -1).reverse().map(function (p) { return { x: p.x, y: p.y + 16 + hash(p.x) * 8 }; })), true);
            };
            montana(-10, L.tunel + 60, L.yTop - 120, L.yBot + 70);
            var xs = L.xFin + 80;
            montana(xs + 6, L.W + 10, L.yTop - 150, L.yBot + 70);
            var portal = function (x, y) {
                tg.fillStyle(0x6c757d, 1); tg.fillRoundedRect(x - 12, y - 40, 52, 70, { tl: 26, tr: 26, bl: 0, br: 0 });
                tg.fillStyle(0x0b0d10, 1); tg.fillRoundedRect(x - 4, y - 32, 36, 62, { tl: 20, tr: 20, bl: 0, br: 0 });
                tg.lineStyle(3, 0xadb5bd, 0.8); for (var q = -2; q <= 2; q++) tg.lineBetween(x + 14 + q * 11, y - 40, x + 14 + q * 8, y - 34);
            };
            portal(L.tunel - 4, this.raiz.y);
            this.estaciones.forEach(function (e) { portal(xs + 18, e.y); });
        },

        /** Estaciones (andén, techo y cartel con el instrumento) y palancas de los cambiavías. */
        crearEstacionesYPalancas: function () {
            var L = this.L, self = this;
            this.estaciones.forEach(function (e) {
                var c = self.add.container(e.x, e.y).setDepth(20);
                var g = self.add.graphics();
                g.fillStyle(0x000000, 0.22); g.fillRoundedRect(-34 + 3, -66 + 5, 92, 40, 8);
                g.fillStyle(0xe9d8a6, 1); g.fillRoundedRect(-34, -66, 92, 36, 8);
                g.fillStyle(e.col, 1); g.fillRoundedRect(-40, -78, 104, 16, 8);
                g.fillStyle(0x7a4419, 1); g.fillRect(-26, -62, 6, 34); g.fillRect(50, -62, 6, 34);
                g.fillStyle(0xadb5bd, 1); g.fillRoundedRect(-36, -34, 96, 10, 4);
                e.sx = L.xFin + 80 + Math.min(120, (L.W - L.xFin - 80) * 0.5); e.sy = e.y; var cart = self.add.container(e.sx, e.sy).setDepth(36);
                var cg = self.add.graphics();
                cg.fillStyle(0x000000, 0.22); cg.fillCircle(3, 5, 30);
                cg.fillStyle(0xffffff, 1); cg.fillCircle(0, 0, 30);
                cg.lineStyle(5, e.col, 1); cg.strokeCircle(0, 0, 30);
                var im = self.add.image(0, 0, 'el_' + e.id); im.setScale(40 / Math.max(im.width, im.height));
                cart.add([cg, im]);
                c.add([g]);
                e.cont = c; e.cart = cart; self.objs.push(cart);
                self.objs.push(c);
            });
            this.nodos.forEach(function (n) {
                var c = self.add.container(n.x, n.y + 44).setDepth(25);
                var g = self.add.graphics();
                g.fillStyle(0x000000, 0.25); g.fillCircle(3, 5, 26);
                g.fillStyle(0x343a40, 1); g.fillCircle(0, 0, 26);
                g.fillStyle(0xffd43b, 1); g.fillCircle(0, 0, 21);
                g.lineStyle(3, 0x5c3312, 1); g.strokeCircle(0, 0, 21);
                var flecha = self.add.graphics();
                c.add([g, flecha]);
                n.palanca = { cont: c, flecha: flecha };
                self.objs.push(c);
                self.leversC.push(n);
            });
        },

        /** Ruta iluminada: del túnel de entrada hasta la estación a la que llegaría el tren. */
        rutaActual: function () {
            var rutas = [this.entrada], nodo = this.raiz, dest = null;
            while (nodo && nodo.tipo === 'nodo') {
                var a = nodo.hijos[nodo.estado];
                rutas.push(a);
                if (a.hacia.tipo === 'estacion') { dest = a.hacia.est; rutas.push(a.hacia.est.salida); nodo = null; }
                else nodo = a.hacia;
            }
            return { aristas: rutas, destino: dest };
        },

        /* ── Tren ── */

        lanzarTren: function () {
            var L = this.L;
            var nv = this.nv;
            this.tren = { edge: this.entrada, s: -40, estado: 'espera', t: 0, v: 0, rot: 0, dist: 0, ang: 0 };
            this.trail = [];
            var p0 = enArista(this.entrada, 0);
            for (var d = 400; d >= -40; d -= 5) this.trail.push({ x: p0.x + d - 400 + (d > 0 ? 0 : 0), y: p0.y });
            // La cola del tren espera dentro del túnel (a la izquierda de la boca).
            this.trail = [];
            for (var k = 0; k < 90; k++) this.trail.push({ x: p0.x - 40 - k * 5, y: p0.y });
            this.espera = ESPERA[Math.max(0, Math.min(3, this.nivelActual || 0))];
            this.viajes += 1;
            this.compraAntes = this.prog;
        },

        puntoAtrasTren: function (d) {
            var tr = this.trail, acc = 0;
            for (var i = 1; i < tr.length; i++) {
                var seg = Math.hypot(tr[i].x - tr[i - 1].x, tr[i].y - tr[i - 1].y);
                acc += seg;
                if (acc >= d) { var f = 1 - (acc - d) / Math.max(0.001, seg); return { x: tr[i - 1].x + (tr[i].x - tr[i - 1].x) * f, y: tr[i - 1].y + (tr[i].y - tr[i - 1].y) * f }; }
            }
            return tr[tr.length - 1] || { x: 0, y: 0 };
        },

        moverTren: function (dt, time) {
            var T = this.tren, L = this.L;
            if (!T) return;
            var vmax = VELOCIDAD[Math.max(0, Math.min(3, this.nivelActual || 0))];
            if (T.estado === 'espera') {
                T.t += dt;
                if (T.t >= this.espera && (this.fase === 'jugar' || this.fase === 'demo')) { T.estado = 'corre'; T.t = 0; this.silbato(); }
                return;
            }
            if (T.estado === 'para') {
                T.t += dt;
                if (T.t >= 1.7) { T.edge = T.est.salida; T.s = 0; T.estado = 'corre'; T.t = 0; }
                return;
            }
            if (T.estado === 'fin') {
                T.t += dt;
                if (T.t >= 1.3 && this.spawnOn && !this.completa) this.lanzarTren();
                return;
            }
            // corre
            var objetivoV = vmax;
            if (T.edge.hacia && T.edge.hacia.tipo === 'estacion') objetivoV = Math.max(34, Math.min(vmax, (T.edge.total - 6 - T.s) * 2.4));
            T.v += (objetivoV - T.v) * Math.min(1, dt * 2.5);
            var ds = T.v * dt;
            T.s += ds; T.dist += ds;
            if (T.edge.hacia && T.edge.hacia.tipo === 'estacion' && T.s >= T.edge.total - 6) {
                T.s = T.edge.total - 6; T.estado = 'para'; T.t = 0; T.est = T.edge.hacia.est; T.v = 0;
                this.llegada(T.est);
            } else if (T.s >= T.edge.total) {
                if (T.edge.hacia && T.edge.hacia.tipo === 'nodo') {
                    var nodo = T.edge.hacia;
                    var sobra = T.s - T.edge.total;
                    nodo.bloq = false;
                    T.edge = nodo.hijos[nodo.estado]; T.s = sobra;
                    nodo.giro = 1;
                } else if (T.edge.tipo === 'salida') { T.estado = 'fin'; T.t = 0; T.v = 0; }
                else if (T.edge.tipo === 'entrada') { T.edge = this.raiz.hijos[this.raiz.estado]; T.s = 0; }
            }
            var pos = enArista(T.edge, T.s);
            T.x = pos.x; T.y = pos.y; T.ang = pos.ang;
            var u = this.trail[0];
            if (!u || Math.hypot(u.x - pos.x, u.y - pos.y) >= 5) { this.trail.unshift({ x: pos.x, y: pos.y }); if (this.trail.length > 140) this.trail.length = 140; }
            // Cambiavías: se bloquea el que está a punto de pasar el tren.
            this.nodos.forEach(function (n) { n.bloq = false; });
            if (T.edge.hacia && T.edge.hacia.tipo === 'nodo' && T.edge.total - T.s < 80) T.edge.hacia.bloq = true;
        },

        silbato: function () {
            K.tono({ f: 520, dur: 0.22, vol: 0.05, tipo: 'sawtooth' });
            setTimeout(function () { K.tono({ f: 700, dur: 0.4, vol: 0.05, tipo: 'sawtooth' }); }, 230);
        },

        /* ── Llegada a una estación: suena, y se comprueba el orden del programa ── */

        llegada: function (e) {
            var self = this, esp = this.song[this.prog];
            e.pulso = this.time.now;
            this.sonar(e.id, { breve: true, bocina: false });
            if (this.fase !== 'jugar' || this.completa) return;
            if (e.id === esp) {
                this.prog += 1;
                this.efectos.push({ x: e.x, y: e.y - 40, t0: this.time.now, col: 0xffd43b });
                K.tono({ f: 660 + this.prog * 110, f2: 990 + this.prog * 110, dur: 0.22, vol: 0.05 });
                Ut.estallido(this, e.sx, e.sy, { n: 12, tex: 'estrella', tam: 26, dist: 120, depth: 71, sinTinte: true });
                this.pista.reiniciar();
                if (this.prog >= this.song.length) this.llegar();
            } else {
                // Esa estación no toca: el programa vuelve a empezar (basta mandar al tren otra vez).
                this.prog = 0;
                this.efectos.push({ x: e.x, y: e.y - 40, t0: this.time.now, col: 0xff6b6b });
                K.tono({ f: 300, f2: 190, dur: 0.25, vol: 0.05 });
                this.errores += 1; this.erroresNivel += 1;
                if (this.erroresNivel >= 3) this.ayuda = true;
                if (this.time.now - this.ultimoReclamo > 6500) {
                    this.ultimoReclamo = this.time.now;
                    this.reaccion('Decir_no', 1400);
                    this.ctx.decir({ voz: 'zeus', texto: '¡Esa estación no sigue el programa! Empieza otra vez desde la primera.' }, { minMs: 800 });
                }
            }
        },

        llegar: async function () {
            if (this.llegando) return;
            this.llegando = true; this.completa = true; this.spawnOn = false; this.fase = 'premio';
            this.marcadas = this.song.slice();
            await this.acertar(this.song.slice(), { x: this.L.xFin, y: (this.L.yTop + this.L.yBot) / 2 });
            this.llegando = false;
        },

        alAcertar: async function () {
            var self = this;
            for (var k = 0; k < this.song.length; k++) {
                if (!this.sigue()) return;
                var e = this.estaciones.filter(function (q) { return q.id === self.song[k]; })[0];
                if (e) {
                    this.reunidos.push(e.id); e.pulso = this.time.now;
                    this.tweens.add({ targets: e.cart, scale: 1.3, duration: 150, yoyo: true });
                    Ut.estallido(this, e.sx, e.sy, { n: 12, tex: 'estrella', tam: 26, dist: 120, depth: 71, sinTinte: true });
                }
                await this.sonar(this.song[k], { breve: true, bocina: false });
            }
            Ut.confeti(this, 70);
            await esperar(this, 800);
        },

        /* ── Niveles ── */

        alSonar: function (id, k) {
            this.bombillasEsc = k + 1;
            var e = this.estaciones.filter(function (q) { return q.id === id; })[0];
            if (e) { e.pulso = this.time.now; if (e.cart) this.tweens.add({ targets: e.cart, scale: 1.3, duration: 150, yoyo: true }); }
        },
        alReescuchar: function (empieza) { if (empieza) this.bombillasEsc = 0; },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Toca los cambiavías para llevar el tren a las estaciones en el orden del programa!' }, { minMs: 900 });
        },

        prepararNivel: async function (i, nv) {
            this.nv = nv;
            this.nivelV = Math.max(0, Math.min(3, i < 0 ? 0 : this.nivelActual));
            this.prog = 0; this.completa = false; this.llegando = false; this.erroresNivel = 0; this.spawnOn = false;
            this.song = nv.correctas.slice();
            this.bombillasEsc = 0;
            this.tren = null; this.humo = [];
            this.construirNivel(nv);
            await esperar(this, 700);
        },

        mostrarOpciones: async function () {
            this.spawnOn = true;
            this.lanzarTren();
            await esperar(this, 300);
        },

        alTerminarNivel: async function () { this.spawnOn = false; this.tren = null; await esperar(this, 400); },

        /* ── Entrada: tocar cambiavías, estaciones y semáforo ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' && this.fase !== 'demo') return;
            var self = this, L = this.L;
            this.pista.reiniciar();
            var nodo = this.nodos.filter(function (n) { return (Math.hypot(p.x - n.x, p.y - (n.y + 44)) < 52 || Math.hypot(p.x - n.x, p.y - n.y) < 40); })[0];
            if (nodo) { this.girar(nodo); return; }
            var est = this.estaciones.filter(function (e) { return Math.hypot(p.x - e.sx, p.y - e.sy) < 40; })[0];
            if (est) { est.pulso = this.time.now; this.tweens.add({ targets: est.cart, scale: 1.25, duration: 120, yoyo: true }); if (!this.sonando) this.sonar(est.id, { breve: true, bocina: false }); return; }
            if (this.tren && this.tren.estado === 'espera' && p.x < L.xRaiz + 40 && Math.abs(p.y - this.raiz.y) < 90) this.tren.t = this.espera;
        },

        girar: function (n) {
            if (n.bloq) { this.tweens.add({ targets: n.palanca.cont, angle: { from: -10, to: 10 }, duration: 60, yoyo: true, repeat: 2, onComplete: function () { n.palanca.cont.angle = 0; } }); K.tono({ f: 220, dur: 0.08, vol: 0.04 }); return; }
            n.estado = n.estado ? 0 : 1;
            n.giro = 1;
            K.ruido({ f: 800, q: 0.7, dur: 0.07, vol: 0.08 });
            K.tono({ f: 420 + n.estado * 120, dur: 0.06, vol: 0.05 });
            this.tweens.add({ targets: n.palanca.cont, scale: { from: 1.25, to: 1 }, duration: 160 });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar') return Promise.resolve();
            this.pulsoHint = this.time.now;
            if (!this.ayuda) return esperar(this, 800);
            // Con ayuda, la mano toca el primer cambiavías que falta cambiar.
            var sig = this.song[this.prog], est = this.estaciones.filter(function (e) { return e.id === sig; })[0];
            var falta = this.nodos.filter(function (n) { return n.hojas.indexOf(est) >= 0 && n.hijos[n.estado] && !self.lleva(n.hijos[n.estado], est); })[0];
            if (!falta) return esperar(this, 500);
            return this.ctx.mano({ punto: { x: falta.x, y: falta.y + 44 }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        /** ¿La arista lleva a la estación e? */
        lleva: function (a, e) {
            if (a.hacia.tipo === 'estacion') return a.hacia.est === e;
            return a.hacia.hojas.indexOf(e) >= 0 && this.lleva(a.hacia.hijos[a.hacia.estado], e);
        },

        /** Pone los cambiavías para que el tren llegue a la estación indicada. */
        ajustarRuta: function (e) {
            var self = this;
            this.nodos.forEach(function (n) { var i = n.hijos.findIndex(function (a) { return a.hacia.tipo === 'estacion' ? a.hacia.est === e : a.hacia.hojas.indexOf(e) >= 0; }); if (i >= 0 && n.estado !== i) self.girar(n); });
        },

        demoPaso: function () {
            var self = this;
            return this.nv.correctas.map(function (id) {
                return function () {
                    var e = self.estaciones.filter(function (q) { return q.id === id; })[0];
                    if (!e) return null;
                    var n = self.nodos.filter(function (q) { return q.hojas.indexOf(e) >= 0 && !self.lleva(q.hijos[q.estado], e); })[0] || self.raiz;
                    return {
                        desde: { x: n.x + 50, y: n.y + 120 }, hasta: { x: n.x, y: n.y + 44 }, mantener: 400,
                        hacer: async function () {
                            self.fase = 'jugar';
                            self.ajustarRuta(e);
                            var antes = self.prog;
                            for (var t = 0; t < 400 && self.prog === antes && !self.completa; t++) await esperar(self, 50);
                            await esperar(self, 300);
                        }
                    };
                };
            });
        },

        /* ── Final: tren de fiesta ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.fiesta = true; this.spawnOn = false; this.tren = null;
            this.nivelV = 3; this.pintarEscenario();
            this.objs.forEach(function (o) { if (o && o.active) o.setVisible(false); });
            this.objs = [];
            this.viasG.clear(); this.rutaG.clear(); this.tunelG.clear();
            // Vía recta de lado a lado y tren de fiesta con los personajes saludando.
            var y = L.H * 0.62;
            this.viaFinal = { y: y };
            var g = this.viasG;
            g.lineStyle(26, 0x7a5c44, 1); g.lineBetween(0, y, L.W, y);
            for (var x = 0; x < L.W; x += 14) { g.lineStyle(4, 0x4a3426, 0.9); g.lineBetween(x, y - 12, x, y + 12); }
            g.lineStyle(3, 0xe9ecef, 1); g.lineBetween(0, y - 6, L.W, y - 6); g.lineBetween(0, y + 6, L.W, y + 6);
            var ids = this.reunidos.filter(function (id, i, a) { return a.indexOf(id) === i; }).slice(0, 4);
            if (!ids.length) ids = ['tambor', 'campana', 'maracas'];
            this.finalTren = { x: -120, ids: ids, avatares: [] };
            ids.forEach(function (id, i) {
                var im = self.add.image(0, 0, 'el_' + id).setDepth(31); im.setScale(50 / Math.max(im.width, im.height));
                self.finalTren.avatares.push(im); self.objs.push(im);
            });
            await esperar(this, 600);
            for (var vuelta = 0; vuelta < 2; vuelta++) {
                this.finalTren.x = -140;
                this.silbato();
                var t0 = this.time.now;
                while (this.finalTren.x < L.W + 400 && this.sigue()) {
                    this.finalTren.x += 7;
                    if (this.finalTren.x > 100 && Math.random() < 0.03) this.fuego(this.finalTren.x + 40, L.H * (0.12 + Math.random() * 0.2), (Math.random() * 5) | 0);
                    await esperar(this, 16);
                }
                for (var k = 0; k < ids.length; k++) { await this.sonar(ids[k], { breve: true, bocina: false }); }
            }
            this.finalTren = null;
            Ut.confeti(this, 100);
            await esperar(this, 1200);
        },

        fuego: function (x, y, k) {
            var cols = [0xff6b6b, 0xfab005, 0x69db7c, 0x4dabf7, 0xcc5de8];
            K.ruido({ f: 2400, q: 0.6, dur: 0.3, vol: 0.08 });
            Ut.estallido(this, x, y, { n: 20, tex: 'chispa', tam: 22, dist: 130, depth: 52, colores: [cols[k % 5], 0xffffff, cols[(k + 2) % 5]], ms: 1000, gravedad: 50 });
        },

        estadoExtra: function () {
            var T = this.tren;
            return {
                song: this.song, prog: this.prog, completa: !!this.completa,
                tren: T && { estado: T.estado, s: Math.round(T.s), x: Math.round(T.x || 0), y: Math.round(T.y || 0), t: +T.t.toFixed(1) },
                nodos: this.nodos.map(function (n) { return { x: Math.round(n.x), y: Math.round(n.y), estado: n.estado, bloq: n.bloq }; }),
                estaciones: this.estaciones.map(function (e) { return { id: e.id, y: Math.round(e.y) }; })
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!L || !this.trenG || !this.trenG.active || !this.raiz) return;
            this.moverTren(dt, time);
            var rg = this.rutaG; rg.clear();
            var lz = this.luzG; lz.clear();
            var B = BIOMAS[this.nivelV % 4];
            if (!this.fiesta) {
                // Ruta iluminada y destino.
                var ruta = this.rutaActual();
                ruta.aristas.forEach(function (a) {
                    if (a.tipo === 'salida') return;
                    rg.lineStyle(30, 0xffe066, 0.22 + 0.1 * Math.sin(s * 5)); rg.beginPath(); a.pts.forEach(function (p, i) { if (!i) rg.moveTo(p.x, p.y); else rg.lineTo(p.x, p.y); }); rg.strokePath();
                    for (var i = 4; i < a.pts.length; i += 6) { var f = ((i / 6) - (s * 6)) % 3; if (Math.abs(f) < 0.5) { var p = a.pts[i]; rg.fillStyle(0xffffff, 0.8); rg.fillCircle(p.x, p.y, 3); } }
                });
                if (ruta.destino) { var d = ruta.destino; rg.lineStyle(5, 0xffe066, 0.6 + 0.4 * Math.sin(s * 6)); rg.strokeCircle(d.sx, d.sy, 38); }
                // Palancas: la flecha indica el lado que está activo (arriba / abajo).
                this.nodos.forEach(function (n) {
                    var pf = n.palanca.flecha; pf.clear();
                    var dir = n.estado ? 1 : -1;
                    pf.fillStyle(n.bloq ? 0xc92a2a : 0x2b8a3e, 1); pf.fillTriangle(-9, 4 * dir * -1 + 0, 9, 4 * dir * -1 + 0, 0, -dir * 14 + 0);
                    if (n.bloq) { pf.fillStyle(0x343a40, 1); pf.fillRoundedRect(-8, -3, 16, 12, 2); pf.lineStyle(3, 0x343a40, 1); pf.beginPath(); pf.arc(0, -4, 6, Math.PI, 0); pf.strokePath(); }
                    // El desvío se dibuja con el riel de la rama inactiva apagado.
                    var inact = n.hijos[n.estado ? 0 : 1];
                    rg.lineStyle(12, 0x000000, 0.28); rg.beginPath(); inact.pts.slice(0, Math.min(inact.pts.length, 12)).forEach(function (p, i) { if (!i) rg.moveTo(p.x, p.y); else rg.lineTo(p.x, p.y); }); rg.strokePath();
                    // Semáforo del desvío.
                    var lx = n.x - 40, ly = n.y - 6;
                    rg.fillStyle(0x343a40, 1); rg.fillRect(lx - 3, ly - 12, 6, 30); rg.fillStyle(n.bloq ? 0xff6b6b : 0x69db7c, 1); rg.fillCircle(lx, ly - 14, 6);
                    if (n.giro > 0) n.giro = Math.max(0, n.giro - dt * 3);
                });
                // Semáforo de salida (junto al túnel) con cuenta atrás.
                var T = this.tren;
                if (T && T.estado === 'espera') {
                    var sx = L.tunel + 50, sy = this.raiz.y - 56, rest = this.espera - T.t, pr = Math.min(1, T.t / this.espera);
                    rg.fillStyle(0x343a40, 1); rg.fillRoundedRect(sx - 12, sy - 40, 24, 50, 6); rg.fillRect(sx - 3, sy + 8, 6, 30);
                    rg.fillStyle(0xe03131, rest > 0.7 ? 1 : 0.25); rg.fillCircle(sx, sy - 26, 7); rg.fillStyle(0xffd43b, rest <= 0.7 && rest > 0.25 ? 1 : 0.25); rg.fillCircle(sx, sy - 10, 7); rg.fillStyle(0x69db7c, rest <= 0.25 ? 1 : 0.25); rg.fillCircle(sx, sy + 6, 7);
                    rg.lineStyle(5, 0xffffff, 0.8); rg.beginPath(); rg.arc(sx + 50, sy - 8, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pr); rg.strokePath();
                }
            }
            // Tren: locomotora y vagones siguiendo el rastro.
            var tg = this.trenG; tg.clear();
            var T2 = this.tren;
            if (T2 && T2.x != null && !this.fiesta) {
                var ang = T2.ang;
                var p1 = this.puntoAtrasTren(24), p2 = this.puntoAtrasTren(64);
                var eAng = Math.atan2(T2.y - p1.y, T2.x - p1.x);
                this.dibujarVagon(tg, T2.x, T2.y, eAng, 0, T2.dist, B.noche, s);
                for (var c = 0; c < 3; c++) {
                    var d = 82 + c * 74, a1 = this.puntoAtrasTren(d - 20), a2 = this.puntoAtrasTren(d + 20), pc = this.puntoAtrasTren(d);
                    this.dibujarVagon(tg, pc.x, pc.y, Math.atan2(a1.y - a2.y, a1.x - a2.x), c + 1, T2.dist, B.noche, s);
                }
                // Humo de la chimenea.
                if (T2.estado === 'corre' || T2.estado === 'para' || T2.estado === 'espera') {
                    if (!this.ultHumo || time - this.ultHumo > 110) { this.ultHumo = time; var ch = P(T2.x, T2.y, eAng, 27, -42); this.humo.push({ x: ch.x, y: ch.y, vx: -8 + Math.random() * 6 - (T2.v || 0) * 0.1, vy: -22 - Math.random() * 10, t: 0, r: 5 }); }
                }
            }
            if (this.finalTren) this.dibujarTrenFinal(tg, s, time);
            this.humo = this.humo.filter(function (h) { return h.t < 1.6; });
            this.humo.forEach(function (h) { h.t += dt; h.x += h.vx * dt; h.y += h.vy * dt; h.r += dt * 16; tg.fillStyle(B.noche ? 0x8a93b0 : 0xffffff, 0.55 * (1 - h.t / 1.6)); tg.fillCircle(h.x, h.y, h.r); });
            // Estaciones: la señal parpadea al llegar el tren.
            this.estaciones.forEach(function (e) {
                if (e.pulso && time - e.pulso < 800) { var f = (time - e.pulso) / 800; lz.lineStyle(5 * (1 - f) + 1, e.col, 0.9 * (1 - f)); lz.strokeCircle(e.sx, e.sy, 32 + f * 40); }
                if (e.cart && e.cart.active && !self.tweens.isTweening(e.cart)) e.cart.y = e.sy + Math.sin(s * 2 + e.y) * 1.5;
            });
            // Bombillas del programa (arriba a la izquierda).
            var n = this.song ? this.song.length : 0;
            for (var i = 0; i < n; i++) {
                var bx = L.W * 0.2 + 34 + i * 52, by = L.H * 0.12;
                var oro = this.prog > i, esc = this.fase === 'escuchando' && (this.bombillasEsc || 0) > i;
                var pul = this.pulsoHint && time - this.pulsoHint < 800 && i === this.prog ? 1 + 0.25 * Math.sin((time - this.pulsoHint) / 60) : 1;
                lz.fillStyle(0xffd43b, (oro || esc ? 0.35 : 0.06)); lz.fillCircle(bx, by, 26 * pul);
                lz.fillStyle(oro ? 0x69db7c : esc ? 0xffd43b : 0x6b5a4a, 1); lz.fillCircle(bx, by, 15 * pul);
                lz.fillStyle(0xffffff, oro || esc ? 0.8 : 0.25); lz.fillCircle(bx - 4, by - 4, 4);
                lz.lineStyle(3, 0xffffff, 0.8); lz.strokeCircle(bx, by, 15 * pul);
            }
            // Anillos de resultado.
            this.efectos = this.efectos.filter(function (e) { return time - e.t0 < 900; });
            this.efectos.forEach(function (e) { var f = (time - e.t0) / 900; lz.lineStyle(5 * (1 - f) + 1, e.col, 0.9 * (1 - f)); lz.strokeCircle(e.x + 24, e.y, 30 + f * 60); });
            // Nubes y humo del volcán.
            for (var nn = 0; nn < 4; nn++) { var nx = ((s * (6 + nn * 3) + nn * 380) % (L.W + 300)) - 150, ny = L.H * (0.06 + nn * 0.06); lz.fillStyle(B.noche ? 0x46508a : 0xffffff, B.noche ? 0.5 : 0.85); lz.fillEllipse(nx, ny, 150, 26); lz.fillCircle(nx - 26, ny - 8, 20); lz.fillCircle(nx + 4, ny - 14, 26); lz.fillCircle(nx + 34, ny - 6, 18); }
        },

        /** Locomotora (tipo 0) o vagón; ruedas con bielas que giran según lo recorrido. */
        dibujarVagon: function (g, x, y, ang, tipo, dist, noche, s) {
            var rot = dist / 9;
            if (tipo === 0) {
                R(g, x, y, ang, -44, -10, 44, 14, 0x343a40);
                R(g, x, y, ang, -4, -24, 42, 8, 0xd62839); R(g, x, y, ang, -4, -24, 42, -16, 0xff6b6b, 0.55);
                R(g, x, y, ang, -46, -38, -2, -32, 0x212529); R(g, x, y, ang, -42, -34, -6, 12, 0xb02030); R(g, x, y, ang, -34, -27, -14, -12, 0xa5d8ff);
                R(g, x, y, ang, 22, -38, 32, -22, 0x212529); R(g, x, y, ang, 19, -42, 35, -38, 0x212529);
                Ci(g, x, y, ang, 10, -28, 6, 0xfab005);
                g.fillStyle(0x868e96, 1); g.fillTriangle.apply(g, (function () { var a = P(x, y, ang, 42, 14), b = P(x, y, ang, 58, 14), c = P(x, y, ang, 42, -4); return [a.x, a.y, b.x, b.y, c.x, c.y]; })());
                Ci(g, x, y, ang, 44, -12, 5, noche ? 0xfff3bf : 0xffe066);
                if (noche) { var hp = P(x, y, ang, 56, -12); g.fillStyle(0xfff3bf, 0.14); g.fillTriangle(hp.x, hp.y, hp.x + Math.cos(ang - 0.25) * 130, hp.y + Math.sin(ang - 0.25) * 130, hp.x + Math.cos(ang + 0.25) * 130, hp.y + Math.sin(ang + 0.25) * 130); }
                [[-28, 10], [-4, 10], [24, 8]].forEach(function (w) { Ci(g, x, y, ang, w[0], 14, w[1], 0x212529); Ci(g, x, y, ang, w[0], 14, w[1] - 3, 0xdee2e6); var c0 = P(x, y, ang, w[0], 14); g.lineStyle(2, 0x495057, 1); g.lineBetween(c0.x, c0.y, c0.x + Math.cos(rot + ang) * (w[1] - 3), c0.y + Math.sin(rot + ang) * (w[1] - 3)); });
            } else {
                var col = COL_VAGON[(tipo - 1) % 4];
                R(g, x, y, ang, -34, -24, 34, 12, 0x000000, 0.2);
                R(g, x, y, ang, -34, -26, 34, 10, col);
                R(g, x, y, ang, -36, -30, 36, -24, mezcla(col, 0x000000, 0.35));
                [-22, -4, 14].forEach(function (wx) { R(g, x, y, ang, wx, -20, wx + 14, -6, noche ? 0xffe066 : 0xa5d8ff); });
                [[-20, 8], [20, 8]].forEach(function (w) { Ci(g, x, y, ang, w[0], 14, w[1], 0x212529); Ci(g, x, y, ang, w[0], 14, w[1] - 3, 0xdee2e6); });
                var c1 = P(x, y, ang, 36, 8), c2 = P(x, y, ang, 44, 8); g.lineStyle(3, 0x343a40, 1); g.lineBetween(c1.x, c1.y, c2.x, c2.y);
            }
        },

        dibujarTrenFinal: function (g, s, time) {
            var F = this.finalTren, y = this.viaFinal.y - 4, noche = true, self = this;
            var vagones = F.ids.length + 1;
            for (var v = 0; v < vagones; v++) {
                var x = F.x - v * 84;
                this.dibujarVagon(g, x, y, 0, v, F.x, noche, s);
                if (v > 0) {
                    var im = F.avatares[v - 1];
                    if (im) { im.setPosition(x, y - 46 + Math.sin(s * 8 + v) * 4); im.setDepth(31); }
                }
            }
            if (Math.floor(time / 90) % 3 === 0) { g.fillStyle(0xffd43b, 0.9); for (var k = 0; k < vagones; k++) g.fillCircle(F.x - k * 84 + ((time / 20) % 20) - 10, y - 38, 3); }
        }
    };

    K.crear({ id: 'trenes', fondo: '#74c0fc', escena: escena });
})(typeof window !== 'undefined' ? window : this);
