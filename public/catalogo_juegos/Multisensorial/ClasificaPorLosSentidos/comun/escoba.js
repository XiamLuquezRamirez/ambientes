/**
 * «La escoba de la cocina» — Canasta del Olfato (3-4 años).
 *
 * El gatito tiró cosas al piso de la cocina, y siguen cayendo. El niño BARRE con el dedo (una escoba
 * sigue su dedo y empuja con física lo que toca) y lleva lo que huele hasta la canasta de la nariz.
 * Lo que no huele rebota en la canasta, hace lo suyo y vuelve al piso (sin castigo). Un toque sobre
 * un objeto le da un empujón hacia la canasta.
 */
(function (global) {
    'use strict';

    var K = global.SentidosKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () {
            this.suelo = [];
            this.reunidos = [];
            this.barriendo = null;
            this.ultimoSpawn = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.tam = Math.max(74, Math.min(104, H * 0.14));
            L.yPiso = Math.round(H * 0.5);
            L.canasta = { x: Math.round(L.der - 92), y: Math.round(H * 0.7), w: Math.round(Math.max(130, Math.min(190, W * 0.14))) };
            L.area = { x0: 20 + L.tam * 0.5, x1: L.canasta.x - L.canasta.w * 0.35, y0: L.yPiso + L.tam * 0.6, y1: H - L.tam * 0.55 };
            L.bocina = { x: -99, y: -99, r: 1 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.montarVida(keep);
            // Cocina: pared de azulejos, ventana, meson y piso.
            var g = keep(this.add.graphics().setDepth(0));
            g.fillStyle(0xfff3bf, 1); g.fillRect(0, 0, L.W, L.yPiso);
            g.lineStyle(2, 0xffe066, 0.8);
            for (var x = 0; x < L.W; x += 64) g.lineBetween(x, 0, x, L.yPiso);
            for (var y = 0; y < L.yPiso; y += 64) g.lineBetween(0, y, L.W, y);
            for (var i = 0; i < L.W; i += 90) {
                for (var j = L.yPiso; j < L.H; j += 90) {
                    g.fillStyle(((i / 90 + j / 90) | 0) % 2 ? 0xffd8a8 : 0xffe8cc, 1);
                    g.fillRect(i, j, 90, 90);
                }
            }
            g.fillStyle(0xa9743b, 1); g.fillRect(0, L.yPiso - 14, L.W, 14);
            // meson con ollas y ventana
            var m = keep(this.add.graphics().setDepth(1));
            m.fillStyle(0xe8590c, 1); m.fillRect(0, L.yPiso - L.H * 0.17, L.W * 0.55, L.H * 0.17 - 14);
            m.fillStyle(0xf76707, 1); m.fillRect(0, L.yPiso - L.H * 0.17, L.W * 0.55, 12);
            m.fillStyle(0x4dabf7, 1); m.fillRoundedRect(L.W * 0.62, L.H * 0.05, L.W * 0.18, L.H * 0.22, 10);
            m.fillStyle(0xe7f5ff, 1); m.fillRect(L.W * 0.62 + 6, L.H * 0.05 + 6, L.W * 0.09 - 9, L.H * 0.11 - 6);
            m.fillRect(L.W * 0.71 + 3, L.H * 0.05 + 6, L.W * 0.09 - 9, L.H * 0.11 - 6);
            m.fillRect(L.W * 0.62 + 6, L.H * 0.16 + 3, L.W * 0.09 - 9, L.H * 0.11 - 9);
            m.fillRect(L.W * 0.71 + 3, L.H * 0.16 + 3, L.W * 0.09 - 9, L.H * 0.11 - 9);
            m.fillStyle(0x868e96, 1);
            m.fillRoundedRect(L.W * 0.08, L.yPiso - L.H * 0.17 - 34, 84, 36, 8);
            m.fillRoundedRect(L.W * 0.2, L.yPiso - L.H * 0.17 - 46, 70, 48, 8);
            var V = this.vidaAmb;
            try { if (V && V.gato) V.gato(L.W * 0.42, L.yPiso - L.H * 0.17 + 4, Math.min(90, L.H * 0.12)); } catch (e) { /* adorno */ }
            this.escobaG = keep(this.add.graphics().setDepth(66));
            this.cana = this.canasta(keep, 'olfato', L.canasta.x, L.canasta.y, L.canasta.w);
            this.montarHud(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: L.yPiso, w: L.W, h: L.H - L.yPiso, depth: 8 }, 0xfff9db);
        },

        /* ── Objetos en el piso ── */

        visibles: function () { return this.suelo.filter(function (a) { return a.cont.active; }).map(function (a) { return a.id; }); },

        lugarLibre: function () {
            var A = this.L.area, mejor = null, dm = -1, self = this;
            for (var k = 0; k < 10; k++) {
                var p = { x: A.x0 + Math.random() * (A.x1 - A.x0 - this.L.tam * 1.2), y: A.y0 + Math.random() * (A.y1 - A.y0) };
                var d = Math.min.apply(null, [9999].concat(this.suelo.filter(function (a) { return a.cont.active; }).map(function (a) { return Math.hypot(a.cont.x - p.x, a.cont.y - p.y); })));
                if (d > dm) { dm = d; mejor = p; }
            }
            return mejor;
        },

        aparece: async function (id, lugar) {
            var L = this.L;
            var a = this.crearCosa(id, lugar.x, lugar.y - L.H * 0.4, L.tam, { depth: 30 });
            a.vx = 0; a.vy = 0; a.cae = true; a.inmune = 0;
            a.cont.setAlpha(0);
            this.suelo.push(a);
            tw(this, { targets: a.cont, alpha: 1, duration: 150 });
            K.ruido({ f: 800, q: 1, dur: 0.06, vol: 0.05 });
            await tw(this, { targets: a.cont, y: lugar.y, duration: 620, ease: 'Bounce.easeOut' });
            a.cae = false;
        },

        arrancar: async function (nv) {
            var L = this.L;
            this.suelo = [];
            this.ultimoSpawn = this.time.now;
            for (var i = 0; i < nv.vis; i++) {
                var id = this.sacar(this.visibles());
                if (!id) break;
                var lugar = nv.demo ? { x: L.area.x0 + (L.area.x1 - L.area.x0) * (0.25 + 0.3 * i), y: (L.area.y0 + L.area.y1) / 2 + (i % 2 ? 50 : -30) } : this.lugarLibre();
                this.aparece(id, lugar);
                await esperar(this, 220);
            }
            await esperar(this, 500);
        },

        prepararNivel: async function () {
            await this.retirar(this.suelo);
            this.suelo = [];
            this.barriendo = null;
        },

        alTerminarNivel: async function () {
            await this.retirar(this.suelo);
            this.suelo = [];
            this.barriendo = null;
        },

        /* ── Barrer ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var tocado = this.cosaEn(this.suelo.filter(function (a) { return !a.cae; }), p.x, p.y, this.L.tam * 0.6);
            this.barriendo = { x: p.x, y: p.y, ang: 0, mov: 0, tocado: tocado, t0: this.time.now };
        },

        alMover: function (p) {
            var b = this.barriendo;
            if (!b) return;
            var dx = p.x - b.x, dy = p.y - b.y;
            b.mov += Math.hypot(dx, dy);
            if (Math.hypot(dx, dy) > 2) b.ang = Math.atan2(dy, dx);
            var R = this.L.tam * 0.8;
            this.suelo.forEach(function (a) {
                if (a.cae || !a.cont.active) return;
                var rx = a.cont.x - p.x, ry = a.cont.y - p.y, d = Math.hypot(rx, ry);
                if (d < R) {
                    a.vx += dx * 10 + (rx / (d || 1)) * 90;
                    a.vy += dy * 10 + (ry / (d || 1)) * 90;
                    var v = Math.hypot(a.vx, a.vy);
                    if (v > 760) { a.vx *= 760 / v; a.vy *= 760 / v; }
                }
            });
            if (b.mov > 60 && !b.sono) { b.sono = true; K.efecto(this, 'whoosh'); }
            b.x = p.x; b.y = p.y;
        },

        alSoltar: function () {
            var b = this.barriendo;
            this.barriendo = null;
            if (!b) return;
            if (b.mov < 14 && b.tocado && !b.tocado.cae && b.tocado.cont.active) {   // un toque: empujón hacia la canasta
                var a = b.tocado, c = this.cana;
                var dx = c.x - a.cont.x, dy = c.y - a.cont.y, d = Math.hypot(dx, dy) || 1;
                a.vx = dx / d * 620; a.vy = dy / d * 620;
                K.efecto(this, 'whoosh');
            }
        },

        entra: async function (a) {
            if (a.dentro) return;
            a.dentro = true; a.cae = true;
            var c = this.cana;
            if (this.sentidoDe(a.id) === 'olfato') {
                this.suelo = this.suelo.filter(function (f) { return f !== a; });
                await this.entrarCanasta(a, c);
                await this.clasificar(a.id, 'olfato', { x: c.boca.x, y: c.boca.y - 60 });
                return;
            }
            // no huele: la canasta lo rechaza
            a.vx = -380 - Math.random() * 120; a.vy = (Math.random() - 0.5) * 300;
            a.inmune = this.time.now + 900;
            if (c.organo) c.organo.reaccion('error');
            tw(this, { targets: a.cont, angle: 360, duration: 500 }).then(function () { a.cont.angle = 0; });
            await this.clasificar(a.id, 'olfato', { x: a.cont.x - 10, y: a.cont.y - 40 });
            a.dentro = false; a.cae = false;
        },

        alAcertar: async function () { this.cameras.main.shake(90, 0.002); },

        /* ── Ayudas ── */

        mostrarPista: function (cancelada) {
            if (this.fase !== 'jugar') return Promise.resolve();
            var self = this, c = this.cana;
            var a = this.suelo.filter(function (f) { return f.cont.active && !f.cae && self.sentidoDe(f.id) === 'olfato'; })[0];
            if (!a) return esperar(this, 900);
            this.tweens.add({ targets: a.cont, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
            if (!this.ayuda) return esperar(this, 900);
            return this.manoDe(cancelada, { x: a.cont.x - 40, y: a.cont.y }, { x: c.x - c.w * 0.5, y: c.y });
        },

        demoPaso: function () {
            var self = this, c = this.cana;
            var a = this.suelo.filter(function (f) { return self.sentidoDe(f.id) === 'olfato'; })[0];
            if (!a) return null;
            return {
                desde: { x: a.cont.x - 50, y: a.cont.y }, hasta: { x: c.x - c.w * 0.3, y: c.y }, durMs: 1100,
                hacer: async function () {
                    var dx = c.x - a.cont.x, dy = c.y - a.cont.y, d = Math.hypot(dx, dy) || 1;
                    a.vx = dx / d * 640; a.vy = dy / d * 640;
                    K.efecto(self, 'whoosh');
                    await self.hasta(function () { return !a.cont.active; }, 3500);
                }
            };
        },

        /* ── Final: todo lo barrido vuelve a entrar en fila ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.suelo);
            this.suelo = [];
            var ids = this.reunidosUnicos(4).map(function (r) { return r.id; });
            if (!ids.length) ids = ['flor', 'perfume', 'rosa'];
            var A = L.area;
            var lug = ids.map(function (id, i) { return { x: A.x0 + (A.x1 - A.x0) * (i + 0.5) / ids.length, y: (A.y0 + A.y1) / 2 }; });
            var cosas = await this.celebrarObjetos(ids, lug, L.tam);
            for (var i = 0; i < cosas.length; i++) {
                if (!this.sigue()) return;
                await this.entrarCanasta(cosas[i], this.cana);
            }
            K.efecto(this, 'achis');
            Ut.aroma(this, this.cana.x, this.cana.y - this.cana.h * 0.5, { n: 10, color: 0xcc5de8, tam: 40, alto: 160, depth: 80 });
            this.cana.organo.reaccion('acierto');
            K.efecto(this, 'celebracion');
            Ut.confeti(this, 90);
            await esperar(this, 1500);
        },

        estadoExtra: function () {
            return {
                canasta: { x: Math.round(this.cana.x), y: Math.round(this.cana.y) },
                suelo: this.suelo.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), cae: !!a.cae }; })
            };
        },

        paso: function (time, dt) {
            var L = this.L, A = L.area, self = this;
            var sec = Math.min(0.05, (dt || 16) / 1000);
            var g = this.escobaG;
            if (g && g.active) {
                g.clear();
                var b = this.barriendo;
                if (b) {
                    // escoba: palo + cerdas, inclinada hacia donde se mueve
                    var s = L.tam / 90;
                    g.lineStyle(9 * s, 0x8d5a2b, 1);
                    g.lineBetween(b.x + 20 * s, b.y - 150 * s, b.x, b.y - 30 * s);
                    g.fillStyle(0xf59f00, 1);
                    g.fillTriangle(b.x - 40 * s, b.y + 34 * s, b.x + 40 * s, b.y + 34 * s, b.x, b.y - 34 * s);
                    g.lineStyle(3 * s, 0xc77700, 1);
                    for (var q = -3; q <= 3; q++) g.lineBetween(b.x + q * 6 * s, b.y - 10 * s, b.x + q * 13 * s, b.y + 34 * s);
                }
            }
            this.suelo.forEach(function (a) {
                if (!a.cont.active || a.cae) return;
                var f = Math.exp(-sec * 2.7);
                a.vx *= f; a.vy *= f;
                if (Math.hypot(a.vx, a.vy) < 4) { a.vx = 0; a.vy = 0; }
                a.cont.x += a.vx * sec; a.cont.y += a.vy * sec;
                if (a.cont.x < A.x0) { a.cont.x = A.x0; a.vx = Math.abs(a.vx) * 0.5; }
                if (a.cont.y < A.y0) { a.cont.y = A.y0; a.vy = Math.abs(a.vy) * 0.5; }
                if (a.cont.y > A.y1) { a.cont.y = A.y1; a.vy = -Math.abs(a.vy) * 0.5; }
                a.cont.angle = Math.max(-25, Math.min(25, a.vx * 0.04));
                var c = self.cana;
                if (self.fase === 'jugar' && time > a.inmune && Math.hypot(a.cont.x - c.x, a.cont.y - c.y) < c.w * 0.5) self.entra(a);
                else if (a.cont.x > A.x1 + 10 && time <= a.inmune) { a.cont.x = A.x1 + 10; a.vx = -Math.abs(a.vx); }
            });
            // separación suave entre objetos
            for (var i = 0; i < this.suelo.length; i++) for (var j = i + 1; j < this.suelo.length; j++) {
                var p = this.suelo[i], q = this.suelo[j];
                if (!p.cont.active || !q.cont.active || p.cae || q.cae) continue;
                var dx = q.cont.x - p.cont.x, dy = q.cont.y - p.cont.y, d = Math.hypot(dx, dy), m = L.tam * 0.78;
                if (d < m && d > 0.1) { var e = (m - d) / 2; p.cont.x -= dx / d * e; p.cont.y -= dy / d * e; q.cont.x += dx / d * e; q.cont.y += dy / d * e; }
            }
            var nv = this.nv;
            if (nv && !nv.demo && this.fase === 'jugar') {
                var n = this.suelo.filter(function (a) { return a.cont.active; }).length;
                if (n < nv.vis && time - this.ultimoSpawn > 1100 / nv.vel) {
                    var id = this.sacar(this.visibles());
                    if (id) { this.ultimoSpawn = time; this.aparece(id, this.lugarLibre()); }
                }
            }
        }
    };

    K.crear({ id: 'escoba', fondo: '#ffe8cc', escena: escena });
})(typeof window !== 'undefined' ? window : this);
