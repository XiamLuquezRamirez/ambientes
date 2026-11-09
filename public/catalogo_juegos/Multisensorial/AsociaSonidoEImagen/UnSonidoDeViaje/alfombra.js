/**
 * «La alfombra de la ciudad» — motor propio de Un sonido de viaje (3-4 años).
 *
 * Una alfombra de juego con calles, vía de tren y pista de aterrizaje impresas. Los vehículos de
 * juguete esperan en el estacionamiento. Suena uno; el niño puede tocar cada vehículo para oírlo
 * y, cuando sabe cuál es, lo LLEVA CON EL DEDO por su camino (el avión por la pista, el tren por
 * la vía, los de calle por la calle): el juguete sigue el dedo pegado al camino, como cuando se
 * juega de verdad. Al llegar, hace su viaje: el avión despega, el tren pita y se va, la
 * ambulancia enciende la sirena. Si lleva otro, a mitad de camino se detiene, suena y vuelve.
 *
 * Niveles: 1 el reto · 2 otro sonido con cuatro vehículos · 3 cinco vehículos y el sonido llega
 * de lejos (más bajo) · 4 cada viaje trae un sonido nuevo.
 */
(function (global) {
    'use strict';

    var K = global.AsociaKit;
    var Ut = global.PedniaParejaBase.util;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;
    var EXTRA = ['camion', 'motocicleta', 'bicicleta'];
    var CAMINO = { avion: 'pista', tren: 'via' };

    function largo(pts) {
        var acc = [0];
        for (var i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        return acc;
    }
    function puntoEn(r, d) {
        var acc = r.acc, pts = r.pts;
        d = Math.max(0, Math.min(acc[acc.length - 1], d));
        for (var i = 1; i < pts.length; i++) {
            if (acc[i] >= d) {
                var t = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
                return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t, dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y };
            }
        }
        var u = pts[pts.length - 1];
        return { x: u.x, y: u.y, dx: 1, dy: 0 };
    }
    /** Proyecta (x, y) sobre el camino y devuelve la distancia recorrida más cercana. */
    function proyectar(r, x, y, desde, hasta) {
        var mejor = desde, dmin = Infinity;
        for (var d = Math.max(0, desde); d <= hasta; d += 6) {
            var p = puntoEn(r, d);
            var q = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
            if (q < dmin) { dmin = q; mejor = d; }
        }
        return { d: mejor, dist: Math.sqrt(dmin) };
    }

    var escena = {
        iniciar: function () { this.autos = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 70, piso: H - 104, alto: Math.min(160, H * 0.28) } : null;
            var der = L.pres ? W - 140 : W - 10;
            // La alfombra ocupa casi todo, con un borde de tela.
            L.alf = { x: 14, y: L.bocina.y + L.bocina.r + 14, w: der - 28, h: H - (L.bocina.y + L.bocina.r + 14) - 12 };
            var A0 = L.alf;
            L.tam = Math.max(64, Math.min(118, A0.h * 0.2, A0.w / 7));
            // Estacionamiento abajo a la izquierda; caminos que salen hacia arriba y a la derecha.
            // Avenida de salida (calle con vía de tranvía) a la izquierda: une el estacionamiento con las tres franjas.
            L.conn = A0.x + Math.max(L.tam * 0.55, A0.w * 0.07);
            L.est = { x: L.conn + L.tam * 0.6, y: A0.y + A0.h * 0.66, w: Math.min(A0.w * 0.6, L.tam * 1.25 * 5), h: A0.h * 0.3 };
            L.pasillo = L.est.y + L.est.h * 0.12;
            var yP = A0.y + A0.h * 0.16, yV = A0.y + A0.h * 0.36, yC = A0.y + A0.h * 0.54;
            var xF = A0.x + A0.w - 10;
            L.rutas = {
                pista: { y: yP, fin: xF, color: 0x495057 },
                via: { y: yV, fin: xF, color: 0x8d6e63 },
                calle: { y: yC, fin: xF, color: 0x5c5f66 }
            };
            return L;
        },

        bahia: function (k, n) {
            var e = this.L.est;
            return { x: e.x + e.w * (k + 0.5) / n, y: e.y + e.h * 0.66 };
        },

        /**
         * Camino impreso: sale de la bahía al pasillo del estacionamiento, va a la avenida de la
         * izquierda, sube por ella y dobla por su franja (pista, vía o calle). Esquinas redondeadas.
         */
        ruta: function (tipo, desde) {
            var L = this.L, R = L.rutas[tipo];
            var esquinas = [
                { x: desde.x, y: desde.y },
                { x: desde.x, y: L.pasillo },
                { x: L.conn, y: L.pasillo },
                { x: L.conn, y: R.y },
                { x: R.fin, y: R.y }
            ];
            var rad = L.tam * 0.35;
            var pts = [esquinas[0]];
            for (var i = 1; i < esquinas.length - 1; i++) {
                var a = esquinas[i - 1], b = esquinas[i], c = esquinas[i + 1];
                var l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y);
                var r = Math.min(rad, l1 / 2, l2 / 2);
                var p1 = { x: b.x + (a.x - b.x) * r / Math.max(1, l1), y: b.y + (a.y - b.y) * r / Math.max(1, l1) };
                var p2 = { x: b.x + (c.x - b.x) * r / Math.max(1, l2), y: b.y + (c.y - b.y) * r / Math.max(1, l2) };
                pts.push(p1);
                for (var s = 0.2; s < 1; s += 0.2) {
                    var u = 1 - s;
                    pts.push({ x: u * u * p1.x + 2 * u * s * b.x + s * s * p2.x, y: u * u * p1.y + 2 * u * s * b.y + s * s * p2.y });
                }
                pts.push(p2);
            }
            pts.push(esquinas[esquinas.length - 1]);
            // Puntos cada ~8 px para que el dedo se pueda seguir en los tramos rectos largos.
            var densos = [pts[0]];
            for (var k = 1; k < pts.length; k++) {
                var q0 = pts[k - 1], q1 = pts[k];
                var n = Math.max(1, Math.ceil(Math.hypot(q1.x - q0.x, q1.y - q0.y) / 8));
                for (var m = 1; m <= n; m++) densos.push({ x: q0.x + (q1.x - q0.x) * m / n, y: q0.y + (q1.y - q0.y) * m / n });
            }
            return { tipo: tipo, pts: densos, acc: largo(densos) };
        },

        armar: function () {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'alfombra_fondo', L.W, L.H, function (x, w, h) { self.pintarAlfombra(x, w, h); });
            keep(this.add.image(0, 0, 'alfombra_fondo').setOrigin(0, 0).setDepth(0));
            this.rastroG = keep(this.add.graphics().setDepth(5));
            var V = this.montarVida(keep);
            var A0 = L.alf;
            if (V) {
                V.pato(A0.x + A0.w * 0.86, A0.y + A0.h * 0.82, A0.w * 0.04, 0.9);
                V.mariposas(2, { x: L.est.x + L.est.w + 20, y: A0.y + A0.h * 0.62, w: A0.x + A0.w - L.est.x - L.est.w - 140, h: A0.h * 0.1, depth: 8 });
            }
            this.montarHud(keep);
            var n = this.autos.length;
            this.autos.forEach(function (c) {
                if (c.estado !== 'quieto') return;
                var b = self.bahia(c.k, Math.max(n, c.n || n));
                c.base = b;
                c.actor.cont.setPosition(b.x, b.y - L.tam * 0.3).setScale(L.tam / c.actor.tam);
            });
        },

        pintarAlfombra: function (x, w, h) {
            var L = this.L, A0 = L.alf;
            // Piso de la habitación alrededor.
            var g = x.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#c99a6a'); g.addColorStop(1, '#a8794a');
            x.fillStyle = g; x.fillRect(0, 0, w, h);
            K.grano(x, 0, 0, w, h, Math.round(w * h / 600), ['#7a4a1c', '#f0c58c'], 1.2, 0.3);
            // Alfombra: borde de tela azul con costura.
            K.sombra(x, A0.x + A0.w / 2, A0.y + A0.h, A0.w * 0.55, 18, 0.35);
            x.fillStyle = '#1971c2'; K.rr(x, A0.x - 8, A0.y - 8, A0.w + 16, A0.h + 16, 18); x.fill();
            x.strokeStyle = 'rgba(255,255,255,0.6)'; x.setLineDash([7, 6]); x.lineWidth = 2;
            K.rr(x, A0.x - 3, A0.y - 3, A0.w + 6, A0.h + 6, 14); x.stroke(); x.setLineDash([]);
            // Pasto impreso.
            x.fillStyle = '#8ce99a'; x.fillRect(A0.x, A0.y, A0.w, A0.h);
            K.grano(x, A0.x, A0.y, A0.w, A0.h, Math.round(A0.w * A0.h / 300), ['#69db7c', '#b2f2bb', '#51cf66'], 1.4, 0.4);
            // Lago y árboles impresos.
            x.fillStyle = '#74c0fc'; x.beginPath(); x.ellipse(A0.x + A0.w * 0.86, A0.y + A0.h * 0.82, A0.w * 0.08, A0.h * 0.08, 0, 0, Math.PI * 2); x.fill();
            x.fillStyle = '#a5d8ff'; x.beginPath(); x.ellipse(A0.x + A0.w * 0.85, A0.y + A0.h * 0.8, A0.w * 0.045, A0.h * 0.035, 0, 0, Math.PI * 2); x.fill();
            for (var i = 0; i < 7; i++) {
                var tx = A0.x + A0.w * (0.66 + (i % 4) * 0.08), ty = A0.y + A0.h * (0.68 + Math.floor(i / 4) * 0.16) + (i % 2) * 8;
                if (tx > A0.x + A0.w - 20) continue;
                x.fillStyle = 'rgba(0,0,0,0.15)'; x.beginPath(); x.ellipse(tx + 4, ty + 6, 15, 7, 0, 0, Math.PI * 2); x.fill();
                x.fillStyle = '#2f9e44'; x.beginPath(); x.arc(tx, ty, 14, 0, Math.PI * 2); x.fill();
                x.fillStyle = '#40c057'; x.beginPath(); x.arc(tx - 4, ty - 4, 8, 0, Math.PI * 2); x.fill();
            }
            var R = L.rutas, ancho = L.tam * 0.55;
            var xb = L.conn - ancho * 0.6, wb = A0.x + A0.w - xb;
            // Pista de aterrizaje.
            x.fillStyle = '#495057'; x.fillRect(xb, R.pista.y - ancho * 0.6, wb, ancho * 1.2);
            x.fillStyle = '#ffffff';
            for (var px = xb + ancho * 2.2; px < A0.x + A0.w; px += 46) x.fillRect(px, R.pista.y - 3, 26, 6);
            for (var k = 0; k < 6; k++) x.fillRect(xb + ancho * 1.4, R.pista.y - ancho * 0.5 + k * ancho * 0.2, 18, ancho * 0.1);
            x.fillStyle = '#ffd43b';
            for (var lx = xb + ancho * 1.4; lx < A0.x + A0.w; lx += 34) { x.beginPath(); x.arc(lx, R.pista.y - ancho * 0.62, 3, 0, Math.PI * 2); x.arc(lx, R.pista.y + ancho * 0.62, 3, 0, Math.PI * 2); x.fill(); }
            // Vía del tren: durmientes y rieles.
            var yv = R.via.y;
            x.fillStyle = '#8d6e63';
            for (var dx = xb; dx < A0.x + A0.w; dx += 16) x.fillRect(dx, yv - ancho * 0.42, 9, ancho * 0.84);
            x.fillStyle = '#adb5bd';
            x.fillRect(xb, yv - ancho * 0.28, wb, 4);
            x.fillRect(xb, yv + ancho * 0.24, wb, 4);
            // Estación impresa al final de la vía.
            var ex = A0.x + A0.w - L.tam * 0.9;
            x.fillStyle = '#ffa94d'; x.fillRect(ex, yv - ancho * 1.25, L.tam * 0.75, ancho * 0.7);
            x.fillStyle = '#e8590c'; x.beginPath(); x.moveTo(ex - 6, yv - ancho * 1.25); x.lineTo(ex + L.tam * 0.375, yv - ancho * 1.7); x.lineTo(ex + L.tam * 0.75 + 6, yv - ancho * 1.25); x.fill();
            // Calle con línea amarilla.
            var yc = R.calle.y;
            x.fillStyle = '#5c5f66'; x.fillRect(xb, yc - ancho * 0.6, wb, ancho * 1.2);
            x.fillStyle = '#ffd43b';
            for (var cx = xb + ancho * 1.4; cx < A0.x + A0.w; cx += 40) x.fillRect(cx, yc - 2, 22, 4);
            // Hospital con cruz roja al final de la calle.
            var hx = A0.x + A0.w - L.tam * 0.85;
            x.fillStyle = '#ffffff'; x.fillRect(hx, yc + ancho * 0.7, L.tam * 0.7, ancho * 0.9);
            x.fillStyle = '#e03131'; x.fillRect(hx + L.tam * 0.3, yc + ancho * 0.78, L.tam * 0.1, ancho * 0.7); x.fillRect(hx + L.tam * 0.18, yc + ancho * 1.05, L.tam * 0.34, ancho * 0.16);
            // Avenida de salida: calle con vía de tranvía, desde el pasillo del estacionamiento hasta la pista.
            var ya = R.pista.y - ancho * 0.6, yb = L.pasillo + ancho * 0.6;
            x.fillStyle = '#5c5f66'; x.fillRect(L.conn - ancho * 0.6, ya, ancho * 1.2, yb - ya);
            x.fillStyle = '#adb5bd';
            x.fillRect(L.conn - ancho * 0.26, ya, 4, yb - ya);
            x.fillRect(L.conn + ancho * 0.22, ya, 4, yb - ya);
            x.fillStyle = '#ffffff';
            for (var zy = ya + 10; zy < yb; zy += 34) x.fillRect(L.conn - 2, zy, 4, 16);
            // Estacionamiento: pasillo arriba y bahías pintadas abajo.
            var e = L.est;
            x.fillStyle = '#5c5f66'; x.fillRect(L.conn - ancho * 0.6, L.pasillo - ancho * 0.6, e.x + e.w - L.conn + ancho * 0.6, ancho * 1.2);
            x.fillStyle = '#868e96'; K.rr(x, e.x, L.pasillo + ancho * 0.6, e.w, e.y + e.h - L.pasillo - ancho * 0.6, 10); x.fill();
            x.strokeStyle = '#ffffff'; x.lineWidth = 3;
            for (var b = 0; b <= 5; b++) { x.beginPath(); x.moveTo(e.x + e.w * b / 5, L.pasillo + ancho * 0.7); x.lineTo(e.x + e.w * b / 5, e.y + e.h - 6); x.stroke(); }
            x.fillStyle = '#ffd43b';
            for (var px2 = L.conn + ancho; px2 < e.x + e.w; px2 += 40) x.fillRect(px2, L.pasillo - 2, 22, 4);
            x.fillStyle = '#ffffff'; x.font = 'bold ' + Math.round(ancho * 0.6) + 'px Fredoka, sans-serif';
            x.fillText('P', e.x + 8, e.y + e.h - 10);
        },

        /* ── Vehículos ── */

        tipoDe: function (id) { return CAMINO[id] || 'calle'; },

        estacionar: async function (ids) {
            var self = this;
            var L = this.L;
            var n = ids.length;
            this.autos.forEach(function (c) { if (c.actor.cont.active) c.actor.destruir(); });
            this.autos = [];
            this.vivos = this.coleccion.slice();
            var proms = ids.map(function (id, k) {
                var b = self.bahia(k, n);
                var a = Act.crear(self, id, -L.tam, b.y - L.tam * 0.3, L.tam);
                if (a.animarIdle) a.animarIdle(false);
                a.sonido = self.sonidoDe(id);
                a.cont.setDepth(20 + k * 0.01);
                var c = { id: id, actor: a, k: k, n: n, base: b, estado: 'llega' };
                self.autos.push(c);
                self.vivos.push(a);
                // Llegan rodando desde la izquierda a su bahía.
                return esperar(self, k * 180).then(function () {
                    return tw(self, { targets: a.cont, x: b.x, duration: 700 + k * 60, ease: 'Cubic.easeOut' });
                }).then(function () { c.estado = 'quieto'; });
            });
            K.ruido({ f: 400, q: 0.6, dur: 0.6, vol: 0.06 });
            await Promise.all(proms);
        },

        autoEn: function (x, y) {
            var L = this.L;
            var mejor = null, dmin = L.tam * 0.6;
            this.autos.forEach(function (c) {
                if (c.estado !== 'quieto') return;
                var d = Math.hypot(x - c.actor.cont.x, y - c.actor.cont.y);
                if (d < dmin) { dmin = d; mejor = c; }
            });
            return mejor;
        },

        disponibles: function () { return this.autos.filter(function (c) { return c.estado === 'quieto'; }).map(function (c) { return c.id; }); },

        /* ── Entrada: tocar = oír; arrastrar = llevar por su camino ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var c = this.autoEn(p.x, p.y);
            if (!c) return;
            this.pista.reiniciar();
            c.ruta = this.ruta(this.tipoDe(c.id), { x: c.base.x, y: c.base.y - this.L.tam * 0.3 });
            c.d = 0;
            c.estado = 'llevando';
            c.t0 = this.time.now;
            c.sono = false;
            this.llevado = c;
            this.dibujarRuta(c, 0xffffff);
            c.actor.cont.setDepth(40);
            this.tweens.add({ targets: c.actor.cont, scale: (this.L.tam / c.actor.tam) * 1.12, duration: 120 });
            K.tono({ f: 900, dur: 0.05, vol: 0.05 });
        },

        alMover: function (p) {
            var c = this.llevado;
            if (!c) return;
            var r = c.ruta;
            var total = r.acc[r.acc.length - 1];
            var pr = proyectar(r, p.x, p.y, c.d - 20, c.d + 90);
            if (pr.dist > this.L.tam * 1.6) return;       // el dedo se fue lejos del camino
            if (pr.d > c.d) {
                c.d = pr.d;
                var q = puntoEn(r, c.d);
                var a = c.actor.cont;
                a.x = q.x; a.y = q.y;
                var dir = q.dx >= 0 ? 1 : -1;
                a.scaleX = Math.abs(a.scaleX) * dir;
                a.angle = Math.max(-25, Math.min(25, Math.atan2(q.dy, Math.abs(q.dx)) * 57 * 0.5));
                if (this.time.now - (this.ultMotor || 0) > 140) { this.ultMotor = this.time.now; K.ruido({ f: 220, q: 1.5, dur: 0.12, vol: 0.05 }); }
                this.dibujarRuta(c, 0xffffff);
            }
            // Si no es el que suena, a mitad de camino se frena.
            if (c.id !== this.objetivo && c.d > total * 0.3 && !c.frenado) { c.frenado = true; this.llevado = null; this.devolver(c, true); return; }
            if (c.d >= total - 4) { this.llevado = null; this.viajar(c); }
        },

        alSoltar: function () {
            var c = this.llevado;
            if (!c) return;
            this.llevado = null;
            // Solo un toque: el vehículo suena (para comparar) y vuelve; sin error.
            if (c.d < this.L.tam * 0.3) {
                if (!this.sonando) this.escuchar(c.actor.sonido, { breve: true, vol: 0.75, bocina: false });
                c.actor.saltito(0.08, 1);
                this.devolver(c, false);
                return;
            }
            this.devolver(c, false);
        },

        dibujarRuta: function (c, color) {
            var g = this.rastroG;
            g.clear();
            var r = c.ruta;
            // Camino punteado por delante, lleno por detrás.
            for (var d = 0; d < r.acc[r.acc.length - 1]; d += 18) {
                var p = puntoEn(r, d);
                if (d < c.d) { g.fillStyle(0xffe066, 0.9); g.fillCircle(p.x, p.y, 5); } else { g.fillStyle(color, 0.75); g.fillCircle(p.x, p.y, 4); }
            }
        },

        devolver: async function (c, error) {
            var self = this;
            var a = c.actor;
            if (error) await this.fallar(a);
            var o = { d: c.d };
            var r = c.ruta;
            await tw(this, {
                targets: o, d: 0, duration: Math.min(900, 200 + c.d * 1.5), ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var q = puntoEn(r, o.d);
                    a.cont.x = q.x; a.cont.y = q.y;
                    c.d = o.d;
                    if (r) self.dibujarRuta(c, error ? 0xff8787 : 0xffffff);
                }
            });
            a.cont.setScale(this.L.tam / a.tam).setAngle(0).setDepth(20 + c.k * 0.01);
            this.rastroG.clear();
            c.estado = 'quieto';
            c.frenado = false;
        },

        /** Llegó al final de su camino: hace su viaje y se va. */
        viajar: async function (c) {
            var self = this;
            var L = this.L;
            var a = c.actor;
            c.estado = 'viaje';
            this.rastroG.clear();
            this.fase = 'premio';
            if (c.id === 'avion') {
                // Despega: acelera, sube y se achica en el cielo.
                this.tweens.add({ targets: a.cont, x: L.W - L.tam * 1.2, y: L.alf.y + L.tam * 0.2, angle: -16, duration: 700, ease: 'Quad.easeIn' });
            } else if (c.id === 'tren') {
                for (var k = 0; k < 4; k++) this.time.delayedCall(k * 160, function () { Ut.estallido(self, a.cont.x - L.tam * 0.3, a.cont.y - L.tam * 0.4, { n: 2, tex: 'humo', tam: 26, dist: 40, angulo: -Math.PI / 2, abanico: 0.6, depth: 45 }); });
            }
            await this.celebrar(a, { punto: { x: Math.min(a.cont.x, L.W - L.tam), y: a.cont.y - L.tam * 0.3 } });
            // Se va de la alfombra; queda como «viaje hecho» en el borde de arriba.
            var dest = this.lugarRecuerdo(this.coleccion.length);
            this.coleccion.push(a);
            await tw(this, { targets: a.cont, x: dest.x, y: dest.y, scaleX: dest.esc, scaleY: dest.esc, angle: 0, duration: 600, ease: 'Sine.easeInOut' });
            await this.seguir();
        },

        /** Los que ya viajaron quedan estacionados chiquitos junto al parque de la alfombra. */
        lugarRecuerdo: function (k) {
            var L = this.L, A0 = L.alf, e = L.est;
            var esc = 0.5;
            var paso = L.tam * 0.5;
            var x0 = e.x + e.w + paso * 0.8;
            var max = Math.max(1, Math.floor((A0.x + A0.w - 150 - x0) / paso));
            return { x: x0 + (k % max) * paso, y: e.y + e.h * 0.25 + Math.floor(k / max) * paso * 0.8, esc: esc };
        },

        anunciar: function () {
            // Nivel 3 y 4: el sonido llega de lejos (más bajo y del costado).
            var lejos = this.nv && this.nv.dificil;
            return this.escuchar(this.sonidoDe(this.objetivo), lejos ? { vol: 0.6, pan: 0.6 } : {});
        },

        planNiveles: function () { return this.planBase({ extra: EXTRA, n: [3, 4, 5, 5] }); },

        prepararNivel: async function (i, nv) { await this.estacionar(nv.ids); },

        mostrarPista: function (cancelada) {
            var self = this;
            var c = this.autos.filter(function (q) { return q.id === self.objetivo && q.estado === 'quieto'; })[0];
            if (this.fase !== 'jugar' || !c || this.sonando) return Promise.resolve();
            var r = this.ruta(this.tipoDe(c.id), { x: c.base.x, y: c.base.y - this.L.tam * 0.3 });
            var fin = puntoEn(r, r.acc[r.acc.length - 1] * 0.45);
            return this.ctx.mano({
                punto: { x: c.actor.cont.x, y: c.actor.cont.y }, holdMs: 300,
                arrastre: { dx: fin.x - c.actor.cont.x, dy: fin.y - c.actor.cont.y, durMs: 1200 },
                cancelado: function () { return cancelada() || self.fase !== 'jugar' || !!self.llevado; }
            });
        },

        estadoExtra: function () {
            return this.autos.map(function (c) { return { id: c.id, estado: c.estado, x: Math.round(c.actor.cont.x), y: Math.round(c.actor.cont.y) }; });
        },

        zonaFiesta: function () { var L = this.L; return { x: L.alf.x + 20, y: L.rutas.calle.y, w: L.alf.w * 0.8 }; },

        antesDeFiesta: async function () {
            this.autos.forEach(function (c) { if (c.estado === 'quieto') c.actor.cont.setAlpha(0.3); });
        },

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var L = this.L;
            this.fase = 'demo';
            // En la alfombra no hay vacas: la demo usa el tren y la moto.
            var ids = ['motocicleta', 'tren'];
            var limpiar = function () {
                ctx.quitarMano();
                self.rastroG.clear();
                self.autos.forEach(function (c) { if (c.actor.cont.active) c.actor.destruir(); });
                self.autos = [];
                self.vivos = [];
            };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 1600 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            await this.estacionar(ids);
            var b = L.bocina;
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar('tren'); } });
            await sonando;
            var c = this.autos.filter(function (q) { return q.id === 'tren'; })[0];
            if (!ctx.vivo() || !ctx.enDemo() || !c) return limpiar();
            c.ruta = this.ruta('via', { x: c.base.x, y: c.base.y - L.tam * 0.3 });
            c.d = 0;
            var r = c.ruta, total = r.acc[r.acc.length - 1];
            var fin = puntoEn(r, total);
            var o = { d: 0 };
            await ctx.mano({
                punto: { x: c.actor.cont.x, y: c.actor.cont.y }, holdMs: 300,
                arrastre: { dx: fin.x - c.actor.cont.x, dy: fin.y - c.actor.cont.y, durMs: 1800, soltarEnDestino: true },
                onDuranteArrastre: function () {
                    self.tweens.add({ targets: o, d: total, duration: 1800, ease: 'Sine.easeInOut', onUpdate: function () { var q = puntoEn(r, o.d); c.actor.cont.setPosition(q.x, q.y); c.d = o.d; self.dibujarRuta(c, 0xffffff); } });
                }
            });
            if (!ctx.vivo()) return limpiar();
            self.rastroG.clear();
            K.efecto(this, 'recompensa');
            Ut.estallido(this, c.actor.cont.x - L.tam, c.actor.cont.y - L.tam * 0.3, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true, depth: 85 });
            await Promise.all([this.escuchar('tren', { breve: true, bocina: false }), c.actor.acierto(1500)]);
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1300 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1000 });
            limpiar();
        }
    };

    K.crear({ id: 'alfombra', fondo: '#a8794a', escena: escena });
})(typeof window !== 'undefined' ? window : this);
