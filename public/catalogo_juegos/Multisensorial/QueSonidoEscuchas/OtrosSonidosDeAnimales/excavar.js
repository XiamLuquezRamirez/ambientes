/**
 * «Excava y descubre» — motor propio de Otros Sonidos de Animales (3-4 años).
 *
 * En la pradera hay montículos de tierra y debajo de cada uno se esconde un animal. Suena un
 * animal; cuando aparecen los montículos el niño RASCA la tierra con el dedo (la tierra salta en
 * terrones) hasta destapar al animal que escuchó. Si era ese, sale saltando; si no, suena su
 * propio sonido, se vuelve a esconder y la tierra lo tapa otra vez (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var TIERRAS = [0x8a5a2b, 0x9c6a35, 0x7a4e20, 0xa87a44];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.cavando = false;
            this.ocupado = false;
            this.pala = null;
        },

        filtrarPool: function (pool) {
            var f = pool.filter(function (id) { return K.ANIMALES.indexOf(id) >= 0; });
            return f.length >= 4 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * 0.4);
            L.suelo = Math.round(H * 0.72);
            L.tam = Math.max(100, Math.min(160, (L.der - 60) / 4.2, H * 0.24));
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.05, 0.3, 0.7, 0.95], solX: 0.12 });
                V.mariposas(3, { x: 0, y: L.horizonte, w: L.W, h: L.H * 0.4, depth: 8 });
            }
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x8ce99a, 1); pasto.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            pasto.fillStyle(0x69db7c, 1); pasto.fillRect(0, L.horizonte, L.W, 8);
            pasto.fillStyle(0x51cf66, 0.5);
            for (var i = 0; i < 80; i++) { var gx = (i * 97) % L.W, gy = L.horizonte + 14 + ((i * 53) % Math.max(10, L.H - L.horizonte - 20)); pasto.fillTriangle(gx, gy, gx + 4, gy - 11, gx + 8, gy); }
            this.tierraG = keep(this.add.graphics().setDepth(32));
            var pala = keep(this.add.container(-100, -100).setDepth(90));
            var pg = this.add.graphics();
            pg.fillStyle(0x7a4e1e, 1); pg.fillRoundedRect(-4, -58, 8, 48, 4);
            pg.fillStyle(0xadb5bd, 1); pg.fillRoundedRect(-14, -14, 28, 30, 8);
            pg.fillStyle(0xdee2e6, 1); pg.fillRoundedRect(-10, -10, 8, 18, 3);
            pala.add(pg); pala.setAlpha(0);
            this.pala = pala;
            this.montarHud(keep);
            this.sembrarMotes(keep, 10, { x: 0, y: L.horizonte, w: L.W, h: L.H - L.horizonte, depth: 8 }, 0xfff3bf);
            if (reubicar) this.ubicarCosas();
        },

        lugares: function (n) {
            var L = this.L;
            var x0 = 110, disp = L.der - x0 - 40;
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: x0 + disp * (i + 0.5) / n, y: L.suelo + (i % 2 ? L.tam * 0.15 : -L.tam * 0.05) });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) {
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.cont.setPosition(lug[i].x, lug[i].y - a.tam * 0.1);
                a.terrones.forEach(function (t) { t.x = a.casa.x + t.dx; t.y = a.casa.y + t.dy; });
            });
        },

        crearMonticulo: function (id, i, lug, tam) {
            var a = this.crearCosa(id, lug.x, lug.y - tam * 0.1, tam * 0.7, { depth: 30, sinSombra: true });
            var terrones = [];
            var rx = tam * 0.78, ry = tam * 0.52;
            for (var fila = 0; fila < 6; fila++) {
                for (var col = 0; col < 11; col++) {
                    var u = (col / 10) * 2 - 1 + (Math.random() - 0.5) * 0.1, v = (fila / 5) * 2 - 1 + (Math.random() - 0.5) * 0.15;
                    if (u * u + v * v > 1.02) continue;
                    terrones.push({ dx: u * rx, dy: v * ry + ry * 0.1, r: 15 + Math.random() * 5, vivo: true, col: TIERRAS[(fila + col) % TIERRAS.length], alfa: 1 });
                }
            }
            terrones.forEach(function (t) { t.x = lug.x + t.dx; t.y = lug.y + t.dy; });
            a.terrones = terrones;
            a.rx = rx; a.ry = ry;
            a.tam = tam; a.casa = { x: lug.x, y: lug.y }; a.revelado = false; a.fase2 = Math.random() * 6;
            a.cont.setAlpha(0);
            return a;
        },

        fraccion: function (a) {
            var v = a.terrones.filter(function (t) { return !t.vivo; }).length;
            return v / a.terrones.length;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(this.L.tam, (this.L.der - 120) / nv.opciones.length * 0.82);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearMonticulo(id, i, lug[i], tam); });
            K.ruido({ f: 300, q: 0.8, dur: 0.25, vol: 0.06 });
            this.cosas.forEach(function (a, i) {
                a.terrones.forEach(function (t) { t.alfa = 0; });
                self.tweens.add({ targets: a.terrones, alfa: 1, duration: 450, delay: i * 120 });
            });
            await esperar(this, 500 + this.cosas.length * 120);
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.ocupado = false;
        },

        alSonar: function () {
            var L = this.L;
            Ut.estallido(this, L.W * 0.35, L.suelo, { n: 4, tex: 'nota', tam: 24, dist: 110, depth: 70 });
        },

        /* ── Rascar ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            this.cavando = true;
            this.cavar(p);
        },

        alMover: function (p) {
            var pl = this.pala;
            if (pl) { pl.setPosition(p.x + 18, p.y - 6); pl.setAlpha(this.cavando && this.fase === 'jugar' ? 1 : 0); pl.setAngle(Math.sin(this.time.now / 70) * 14); }
            if (this.cavando && this.fase === 'jugar') this.cavar(p);
        },

        alSoltar: function () { this.cavando = false; if (this.pala) this.pala.setAlpha(0); },

        cavar: function (p) {
            if (this.ocupado) return;
            var self = this, R = 36;
            this.cosas.forEach(function (a) {
                if (a.revelado) return;
                var quito = 0;
                a.terrones.forEach(function (t) {
                    if (t.vivo && Math.hypot(t.x - p.x, t.y - p.y) < R) { t.vivo = false; quito++; t.vx = (t.x - p.x) * 0.06 + (Math.random() - 0.5) * 2; t.vy = -3 - Math.random() * 3; t.vol = 1; t.px = t.x; t.py = t.y; }
                });
                if (quito) {
                    self.pista.reiniciar();
                    K.ruido({ f: 500 + Math.random() * 300, q: 0.8, dur: 0.05, vol: 0.04 });
                    if (self.fraccion(a) >= 0.55) self.revelar(a);
                }
            });
        },

        revelar: async function (a) {
            if (this.ocupado) return;
            this.ocupado = true;
            this.cavando = false;
            a.revelado = true;
            if (this.pala) this.pala.setAlpha(0);
            // el resto de la tierra se desmorona
            a.terrones.forEach(function (t) { if (t.vivo) { t.vivo = false; t.vx = (Math.random() - 0.5) * 3; t.vy = -1 - Math.random() * 2; t.vol = 1; t.px = t.x; t.py = t.y; } });
            a.cont.setAlpha(1);
            this.tweens.add({ targets: a.cont, y: a.casa.y - a.tam * 0.45, duration: 280, ease: 'Back.easeOut' });
            this.actual = a;
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            if (ok === false) await this.taparDeNuevo(a);
            this.ocupado = false;
        },

        taparDeNuevo: async function (a) {
            await tw(this, { targets: a.cont, y: a.casa.y - a.tam * 0.1, duration: 300 });
            a.terrones.forEach(function (t) { t.vivo = true; t.vol = 0; t.x = a.casa.x + t.dx; t.y = a.casa.y + t.dy; t.alfa = 0; });
            this.tweens.add({ targets: a.terrones, alfa: 1, duration: 500 });
            a.revelado = false;
            K.ruido({ f: 300, q: 0.8, dur: 0.2, vol: 0.05 });
        },

        alAcertar: async function () {
            var a = this.actual;
            if (!a) return;
            this.reunidos.push(a.id);
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.3, { n: 14, tex: 'estrella', tam: 28, dist: 150, depth: 70, sinTinte: true });
            a.saltito(0.6, 3);
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.actual;
            if (a) a.sacudir();
            await esperar(this, 700);
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var a = this.correctaDe(this.cosas.filter(function (c) { return !c.revelado; }));
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            return this.ctx.mano({ punto: { x: a.casa.x - a.rx * 0.5, y: a.casa.y }, holdMs: 100, arrastre: { dx: a.rx, dy: 0, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var a = this.correctaDe(this.cosas);
            if (!a) return null;
            return {
                desde: { x: a.casa.x - a.rx * 0.5, y: a.casa.y }, hasta: { x: a.casa.x + a.rx * 0.5, y: a.casa.y },
                hacer: async function () {
                    for (var k = 0; k < 14; k++) { self.cavar({ x: a.casa.x + (k % 7 - 3) * a.rx * 0.28, y: a.casa.y + (k < 7 ? -a.ry * 0.3 : a.ry * 0.2) }); await esperar(self, 60); }
                    if (!a.revelado) await self.revelar(a);
                }
            };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['perro', 'gato', 'vaca'];
            var tam = Math.min(L.tam, (L.der - 100) / ids.length * 0.9);
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var x = 90 + (L.der - 130) * (i + 0.5) / ids.length;
                var a = this.crearCosa(ids[i], x, L.suelo - 200, tam * 0.8, { depth: 30 });
                a.cont.setScale(0.3);
                await this.saltarA(a.cont, x, L.suelo, { ms: 500, alto: 140, esc: 1 });
                a.saltito(0.3, 2);
                Ut.estallido(this, x, L.suelo - tam * 0.6, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 90);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            var self = this;
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.casa.x), y: Math.round(a.casa.y), rx: Math.round(a.rx), ry: Math.round(a.ry), frac: +self.fraccion(a).toFixed(2), revelado: a.revelado }; })
            };
        },

        paso: function (time, delta) {
            var g = this.tierraG;
            if (!g || !g.active) return;
            g.clear();
            var dt = (delta || 16) / 16;
            this.cosas.forEach(function (a) {
                if (!a.cont.active) return;
                g.fillStyle(0x000000, 0.18); g.fillEllipse(a.casa.x, a.casa.y + a.ry * 0.85, a.rx * 2.1, a.ry * 0.5);
                a.terrones.forEach(function (t) {
                    if (t.vivo) {
                        g.fillStyle(t.col, t.alfa); g.fillCircle(t.x, t.y, t.r);
                        g.fillStyle(0xffffff, 0.08 * t.alfa); g.fillCircle(t.x - 4, t.y - 4, t.r * 0.45);
                    } else if (t.vol > 0) {
                        // terrón que sale volando y cae
                        t.px += t.vx * dt; t.py += t.vy * dt; t.vy += 0.5 * dt; t.vol -= 0.012 * dt;
                        g.fillStyle(t.col, Math.max(0, t.vol)); g.fillCircle(t.px, t.py, t.r * 0.8);
                    }
                });
            });
        }
    };

    K.crear({ id: 'excavar', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
