/**
 * «El río de los sonidos» — Canasta del Oído (3-4 años).
 *
 * Por un río bajan flotando objetos, uno tras otro, hacia una cascada. El niño SACA del agua (con el dedo,
 * o tocándolos) lo que hace sonido y lo lleva a la canasta del oído. Si saca algo que no suena, la canasta
 * lo devuelve al río haciendo lo suyo (huele, brilla…). Lo que no se saca cae por la cascada.
 */
(function (global) {
    'use strict';

    var K = global.SentidosKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () {
            this.flota = [];
            this.reunidos = [];
            this.toque = null;
            this.ultimoSpawn = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.tam = Math.max(78, Math.min(112, H * 0.15));
            L.horizonte = Math.round(H * 0.3);
            L.rio = { y: Math.round(H * 0.46), h: Math.round(L.tam * 1.7) };
            L.cascada = Math.round(L.der - 6);
            L.canasta = { x: Math.round(L.W * 0.44), y: Math.round(H * 0.84), w: Math.round(Math.max(130, Math.min(190, L.W * 0.14))) };
            L.bocina = { x: -99, y: -99, r: 1 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.06, 0.34, 0.62, 0.9], solX: 0.1 });
                V.mariposas(2, { x: 0, y: L.horizonte, w: L.W, h: L.H * 0.3, depth: 8 });
            }
            var tierra = keep(this.add.graphics().setDepth(1.5));
            tierra.fillStyle(0x8ce99a, 1); tierra.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            tierra.fillStyle(0x69db7c, 1); tierra.fillRect(0, L.horizonte, L.W, 8);
            tierra.fillStyle(0x51cf66, 0.5);
            for (var i = 0; i < 60; i++) { var gx = (i * 97) % L.W, gy = L.rio.y + L.rio.h / 2 + 20 + ((i * 53) % Math.max(10, L.H - L.rio.y - L.rio.h)); tierra.fillTriangle(gx, gy, gx + 4, gy - 11, gx + 8, gy); }
            // Cauce del río: orillas con piedras y agua.
            var r = keep(this.add.graphics().setDepth(2));
            var y0 = L.rio.y - L.rio.h / 2, y1 = L.rio.y + L.rio.h / 2;
            r.fillStyle(0xb08968, 1); r.fillRect(0, y0 - 14, L.cascada, y1 - y0 + 28);
            r.fillStyle(0x339af0, 1); r.fillRect(0, y0, L.cascada, y1 - y0);
            r.fillStyle(0x74c0fc, 0.5); r.fillRect(0, y0, L.cascada, (y1 - y0) * 0.35);
            r.fillStyle(0xadb5bd, 1);
            for (var k = 0; k < L.cascada; k += 53) { r.fillEllipse(k + 14, y0 - 10, 30, 16); r.fillEllipse(k + 40, y1 + 10, 34, 16); }
            // Cascada al final del río.
            r.fillStyle(0xe7f5ff, 1); r.fillRect(L.cascada - 10, y0 - 6, 22, y1 - y0 + 12);
            this.olasG = keep(this.add.graphics().setDepth(2.5));
            this.cascG = keep(this.add.graphics().setDepth(4));
            this.cana = this.canasta(keep, 'oido', L.canasta.x, L.canasta.y, L.canasta.w);
            this.montarHud(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: L.horizonte, w: L.W, h: L.H - L.horizonte, depth: 8 }, 0xfff3bf);
            var self = this;
            this.flota.forEach(function (a) { if (a.cont.active && !a.agarrada) a.lane = L.rio.y + a.dy * L.rio.h; });
        },

        /* ── Objetos que flotan ── */

        velocidad: function () { return this.nv && !this.nv.demo ? 56 * this.nv.vel : 0; },

        crearFlota: function (id, x) {
            var L = this.L;
            var a = this.crearCosa(id, x, L.rio.y, L.tam, { depth: 20 });
            a.dy = (Math.random() - 0.5) * 0.3;
            a.lane = L.rio.y + a.dy * L.rio.h;
            a.fase2 = Math.random() * 6;
            a.vx = 0.9 + Math.random() * 0.2;
            a.cont.setPosition(x, a.lane);
            this.flota.push(a);
            return a;
        },

        visibles: function () { return this.flota.filter(function (a) { return a.cont.active; }).map(function (a) { return a.id; }); },

        arrancar: async function (nv) {
            var L = this.L;
            this.flota = [];
            this.ultimoSpawn = this.time.now;
            var n = nv.vis;
            for (var i = 0; i < n; i++) {
                var id = this.sacar(this.visibles());
                if (!id) break;
                var x = nv.demo ? L.W * (0.3 + i * 0.22) : L.der * (0.1 + 0.27 * i);
                var a = this.crearFlota(id, x);
                a.cont.setAlpha(0);
                tw(this, { targets: a.cont, alpha: 1, duration: 300 });
                K.ruido({ f: 1100, q: 1, dur: 0.08, vol: 0.05 });
                await esperar(this, 160);
            }
        },

        prepararNivel: async function () {
            await this.retirar(this.flota);
            this.flota = [];
            this.toque = null;
            this.arrastrando = null;
        },

        alTerminarNivel: async function () {
            await this.retirar(this.flota);
            this.flota = [];
        },

        /* ── Sacar del agua ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.tomar(p, this.flota.filter(function (f) { return !f.ocupada; }));
            if (!a) return;
            a.agarrada = true;
            this.toque = { x: p.x, y: p.y, mov: 0 };
        },

        alMover: function (p) {
            if (!this.arrastrando) return;
            if (this.toque) this.toque.mov = Math.max(this.toque.mov, Math.hypot(p.x - this.toque.x, p.y - this.toque.y));
            this.llevar(p);
        },

        alSoltar: function () {
            if (!this.arrastrando) return;
            var a = this.soltar();
            var t = this.toque;
            this.toque = null;
            if (!a) return;
            var c = this.cana;
            var cerca = Math.hypot(a.cont.x - c.x, a.cont.y - c.y) < c.w * 0.95;
            if (cerca || (t && t.mov < 14)) { this.alCesta(a); return; }
            // soltado fuera de la canasta: vuelve flotando al río
            a.ocupada = true;
            var self = this;
            tw(this, { targets: a.cont, y: a.lane, duration: 420, ease: 'Bounce.easeOut' }).then(function () {
                a.cont.setDepth(20);
                a.ocupada = false; a.agarrada = false;
                K.efecto(self, 'splash');
            });
        },

        alCesta: async function (a) {
            if (!a.cont.active || a.ocupada && !a.agarrada) return;
            a.ocupada = true; a.agarrada = true;
            var c = this.cana;
            if (this.sentidoDe(a.id) === 'oido') {
                this.flota = this.flota.filter(function (f) { return f !== a; });
                await this.entrarCanasta(a, c);
                await this.clasificar(a.id, 'oido', { x: c.boca.x, y: c.boca.y - 50 });
                return;
            }
            // no suena: la canasta lo devuelve al río haciendo lo suyo
            a.cont.setDepth(60);
            await this.saltarA(a.cont, c.boca.x, c.boca.y - 20, { ms: 420, alto: 70 });
            if (c.organo) c.organo.reaccion('error');
            await this.clasificar(a.id, 'oido', { x: a.cont.x, y: a.cont.y - 40 });
            if (!a.cont.active) return;
            var L = this.L;
            await this.saltarA(a.cont, Math.min(L.cascada - L.tam, Math.max(L.tam, c.x - 120)), a.lane, { ms: 650, alto: 130 });
            K.efecto(this, 'splash');
            a.cont.setDepth(20);
            a.ocupada = false; a.agarrada = false;
        },

        alAcertar: async function () {
            this.cameras.main.shake(90, 0.002);
        },

        /* ── Ayudas ── */

        mostrarPista: function (cancelada) {
            if (this.fase !== 'jugar') return Promise.resolve();
            var self = this;
            var a = this.flota.filter(function (f) { return f.cont.active && !f.ocupada && self.sentidoDe(f.id) === 'oido'; })
                .sort(function (p, q) { return q.cont.x - p.cont.x; })[0];
            if (!a) return esperar(this, 900);
            this.tweens.add({ targets: a.cont, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
            if (!this.ayuda) return esperar(this, 900);
            return this.manoDe(cancelada, { x: a.cont.x, y: a.cont.y }, { x: this.cana.boca.x, y: this.cana.boca.y });
        },

        demoPaso: function () {
            var self = this;
            var a = this.flota.filter(function (f) { return self.sentidoDe(f.id) === 'oido'; })[0];
            if (!a) return null;
            return {
                desde: { x: a.cont.x, y: a.cont.y }, hasta: { x: this.cana.boca.x, y: this.cana.boca.y },
                hacer: async function () { a.agarrada = true; await self.alCesta(a); }
            };
        },

        /* ── Final: todo lo que sonó flota en fiesta ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.flota);
            this.flota = [];
            var ids = this.reunidosUnicos(5).map(function (r) { return r.id; });
            if (!ids.length) ids = ['campana', 'tambor', 'trompeta'];
            var lug = ids.map(function (id, i) { return { x: L.der * (0.14 + 0.72 * (i + 0.5) / ids.length), y: L.rio.y - 10 }; });
            var cosas = await this.celebrarObjetos(ids, lug, L.tam);
            if (this.cana.organo) this.cana.organo.reaccion('acierto');
            K.efecto(this, 'celebracion');
            Ut.confeti(this, 90);
            cosas.forEach(function (a) { if (a.cont.active) self.tweens.add({ targets: a.cont, y: a.cont.y - 14, duration: 400, yoyo: true, repeat: 3 }); });
            await esperar(this, 1500);
        },

        estadoExtra: function () {
            return {
                canasta: { x: Math.round(this.cana.boca.x), y: Math.round(this.cana.boca.y) },
                flota: this.flota.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), ocupada: !!a.ocupada }; })
            };
        },

        paso: function (time, dt) {
            var L = this.L, self = this;
            var sec = (dt || 16) / 1000;
            var v = this.velocidad();
            // olas
            var g = this.olasG;
            if (g && g.active) {
                g.clear();
                var y0 = L.rio.y - L.rio.h / 2, h = L.rio.h;
                g.lineStyle(3, 0xffffff, 0.45);
                for (var k = 0; k < 4; k++) {
                    g.beginPath();
                    var yy = y0 + h * (0.15 + k * 0.22);
                    for (var x = 0; x <= L.cascada; x += 24) {
                        var y = yy + Math.sin((x - time * (0.05 + k * 0.01)) / 38 + k) * 4;
                        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
                    }
                    g.strokePath();
                }
            }
            var c = this.cascG;
            if (c && c.active) {
                c.clear();
                c.fillStyle(0xe7f5ff, 0.9);
                for (var q = 0; q < 6; q++) {
                    var f = ((time / 500) + q / 6) % 1;
                    c.fillRoundedRect(L.cascada - 8 + q * 3, L.rio.y + L.rio.h / 2 + f * 90 - 30, 6, 40, 3);
                }
            }
            this.flota.forEach(function (a) {
                if (!a.cont.active || a.agarrada || a.ocupada) return;
                a.cont.x += v * a.vx * sec;
                a.cont.y = a.lane + Math.sin(time / 520 + a.fase2) * 7;
                a.cont.angle = Math.sin(time / 640 + a.fase2) * 6;
                if (a.cont.x > L.cascada - L.tam * 0.3) self.caerCascada(a);
            });
            var nv = this.nv;
            if (nv && !nv.demo && this.fase === 'jugar') {
                var libres = this.flota.filter(function (a) { return a.cont.active; }).length;
                if (libres < nv.vis && time - this.ultimoSpawn > 1500 / nv.vel) {
                    var id = this.sacar(this.visibles());
                    if (id) {
                        this.ultimoSpawn = time;
                        var a = this.crearFlota(id, -L.tam * 0.6);
                        a.cont.setAlpha(1);
                    }
                }
            }
        },

        caerCascada: function (a) {
            if (a.cae) return;
            a.cae = true; a.ocupada = true;
            var self = this;
            K.efecto(this, 'splash');
            this.flota = this.flota.filter(function (f) { return f !== a; });
            tw(this, { targets: a.cont, y: a.cont.y + 150, angle: 80, alpha: 0, duration: 650, ease: 'Quad.easeIn' }).then(function () { if (a.cont.active) a.cont.destroy(); });
        }
    };

    K.crear({ id: 'rio', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
