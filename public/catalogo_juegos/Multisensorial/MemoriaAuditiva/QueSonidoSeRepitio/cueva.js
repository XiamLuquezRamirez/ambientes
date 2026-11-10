/**
 * «La cueva del eco» — motor propio de ¿Qué sonido se repitió? (3-4 años).
 * Los sonidos entran a la cueva como sombras (no se ve qué son) y la cueva hace eco. Después
 * los que entraron salen a pasear por el prado y el niño ATRAPA CON LA RED al que sonó dos veces
 * (toca al que pasea: la red baja sobre él). Si no es, la red falla, el otro suena y se escapa.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;

    var escena = {
        iniciar: function () { this.cosas = []; this.reunidos = []; this.red = null; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 78, piso: H - 104, alto: Math.min(170, H * 0.3), modelo: 'nina' } : null;
            L.der = L.pres ? W - 160 : W - 16;
            L.y0 = Math.round(H * 0.5);
            L.tam = Math.max(64, Math.min(130, (L.der - 20) / 4.6, H * 0.17));
            var cw = Math.min(L.der * 0.5, 300, H * 0.3);
            L.cueva = { x: L.der / 2 + 8, y: L.y0 + 10, w: cw, h: cw * 0.7 };
            L.prado = { x0: 20 + L.tam * 0.5, x1: L.der - L.tam * 0.5, y0: L.y0 + (H - L.y0) * 0.38, y1: H - L.tam * 0.55 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.y0, arboles: [0.04, 0.18, 0.82, 0.96], solX: 0.1 });
                V.mariposas(2, { x: 0, y: L.prado.y0, w: L.der, h: 60, depth: 8 });
            }
            var C = L.cueva;
            // Colina rocosa con la boca de la cueva.
            K.textura(this, 'cueva_cerro', C.w * 1.9, C.h * 1.45, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#adb5bd'); g.addColorStop(1, '#6c757d');
                x.fillStyle = g;
                x.beginPath(); x.moveTo(0, h); x.quadraticCurveTo(w * 0.12, h * 0.15, w * 0.5, h * 0.05); x.quadraticCurveTo(w * 0.88, h * 0.15, w, h); x.closePath(); x.fill();
                K.grano(x, 0, 0, w, h, Math.round(w * h / 250), ['#868e96', '#ced4da', '#495057'], 2.4, 0.4);
                // Musgo arriba.
                x.fillStyle = '#69db7c';
                x.beginPath(); x.ellipse(w * 0.5, h * 0.08, w * 0.22, h * 0.06, 0, 0, Math.PI * 2); x.fill();
                // Boca oscura.
                var bx = w / 2, by = h, bw = w * 0.26, bh = h * 0.62;
                var gb = x.createRadialGradient(bx, by - bh * 0.4, 4, bx, by - bh * 0.4, bw * 1.1);
                gb.addColorStop(0, '#000'); gb.addColorStop(1, '#212529');
                x.fillStyle = gb;
                x.beginPath(); x.moveTo(bx - bw, by); x.quadraticCurveTo(bx - bw, by - bh * 1.15, bx, by - bh); x.quadraticCurveTo(bx + bw, by - bh * 1.15, bx + bw, by); x.closePath(); x.fill();
            });
            keep(this.add.image(C.x, C.y + 6, 'cueva_cerro').setOrigin(0.5, 1).setDepth(3));
            K.textura(this, 'cueva_prado', L.W, L.H - L.y0, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#8ce99a'); g.addColorStop(1, '#40c057');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 280), ['#69db7c', '#b2f2bb', '#2f9e44'], 1.6, 0.4);
            });
            keep(this.add.image(0, L.y0, 'cueva_prado').setOrigin(0, 0).setDepth(2));
            this.ecoG = keep(this.add.graphics().setDepth(6));
            this.montarHud(keep);
        },

        /** Mientras suena: una sombra entra a la cueva y salen anillos de eco. */
        alSonar: function () {
            var self = this;
            var C = this.L.cueva;
            var t = this.L.tam * 0.55;
            var sombra = this.add.ellipse(C.x - C.w * 0.9, C.y - t * 0.3, t, t * 0.8, 0x343a40, 0.85).setDepth(5);
            this.tweens.add({ targets: sombra, x: C.x, scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 600, ease: 'Sine.easeIn', onComplete: function () { sombra.destroy(); } });
            this.eco = this.time.now;
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
        },

        /** Salen de la cueva y pasean por el prado. */
        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L, C = L.cueva, Pd = L.prado;
            var n = nv.opciones.length;
            var tam = Math.min(L.tam, (Pd.x1 - Pd.x0) / n);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, C.x, C.y - tam * 0.3, tam, { depth: 30 });
                a.cont.setScale(0.3).setAlpha(0);
                a.vx = (i % 2 ? 1 : -1) * rnd(22, 34) * (self.ayuda ? 0.6 : 1);
                a.base = Pd.y0 + (Pd.y1 - Pd.y0) * ((i + 0.5) / n);
                a.fase = Math.random() * 6;
                return a;
            });
            for (var i = 0; i < n; i++) {
                var a = this.cosas[i];
                K.ruido({ f: 500, q: 1, dur: 0.1, vol: 0.05 });
                this.tweens.add({ targets: a.cont, alpha: 1, scale: 1, x: Pd.x0 + (Pd.x1 - Pd.x0) * (i + 0.5) / n, y: a.base, duration: 520, ease: 'Back.easeOut' });
                await esperar(this, 220);
            }
            await esperar(this, 400);
            this.cosas.forEach(function (a) { a.pasea = true; });
        },

        /* ── Gesto: atrapar con la red ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar' || this.redando) return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.L.tam * 0.75);
            await this.lanzarRed(p.x, p.y, a);
        },

        lanzarRed: async function (x, y, a) {
            var self = this;
            var r = this.L.tam * 0.6;
            this.redando = true;
            var red = this.add.container(x, y - r * 2.4).setDepth(65);
            var g = this.add.graphics();
            g.lineStyle(5, 0x8c5a2b, 1); g.lineBetween(0, -r * 1.6, 0, -r * 0.6);
            g.lineStyle(4, 0x495057, 1); g.strokeEllipse(0, 0, r * 1.8, r * 0.7);
            g.lineStyle(1.5, 0xdee2e6, 0.9);
            for (var k = -3; k <= 3; k++) { g.lineBetween(k * r * 0.25, -r * 0.3, k * r * 0.12, r * 0.9); }
            for (var j = 1; j < 4; j++) g.strokeEllipse(0, r * 0.2 * j, r * (1.8 - j * 0.35), r * 0.3);
            red.add(g);
            K.ruido({ f: 1500, q: 0.7, dur: 0.18, vol: 0.06 });
            if (a) a.pasea = false;
            await tw(this, { targets: red, y: a ? a.cont.y - r * 0.2 : y, duration: 220, ease: 'Quad.easeIn' });
            this.red = red;
            if (!a) {
                await tw(this, { targets: red, alpha: 0, duration: 250 });
                red.destroy(); this.red = null; this.redando = false;
                return;
            }
            this.tocado = a;
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y - a.tam * 0.3 });
            if (ok === false) {
                // Se escapa corriendo.
                await tw(this, { targets: red, alpha: 0, duration: 200 });
                red.destroy();
                this.red = null;
                a.vx = (a.cont.x < this.L.der / 2 ? 1 : -1) * 80;
                a.pasea = true;
                this.time.delayedCall(800, function () { a.vx = Math.sign(a.vx) * rnd(22, 34); });
            }
            this.redando = false;
        },

        alAcertar: async function (ids) {
            var a = this.tocado;
            var red = this.red;
            // Atrapado: la red lo envuelve, salta dos veces y suena dos veces (es el que se repitió).
            if (red) this.tweens.add({ targets: red, scaleY: 1.15, duration: 120, yoyo: true });
            this.reunidos.push(a.id);
            for (var k = 0; k < 2; k++) {
                await Promise.all([this.sonar(a.id, { breve: true, bocina: false }), a.saltito(0.18, 1)]);
                await esperar(this, 150);
            }
        },

        alFallar: async function () { if (this.tocado) await this.tocado.sacudir(); },

        alTerminarNivel: async function () {
            if (this.red) { this.red.destroy(); this.red = null; }
            var C = this.L.cueva;
            var self = this;
            // Vuelven a la cueva.
            await Promise.all(this.cosas.map(function (a, i) {
                a.pasea = false;
                return esperar(self, i * 90).then(function () { return tw(self, { targets: a.cont, x: C.x, y: C.y - a.tam * 0.3, scale: 0.3, alpha: 0, duration: 500, ease: 'Sine.easeIn' }); }).then(function () { a.destruir(); });
            }));
            this.cosas = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            var ok = this.cosas.filter(function (c) { return self.respuestas().indexOf(c.id) >= 0; })[0];
            if (!ok) return Promise.resolve();
            ok.pasea = false;
            this.time.delayedCall(2500, function () { ok.pasea = true; });
            return this.ctx.mano({ punto: { x: ok.cont.x, y: ok.cont.y }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        /* ── Escena final: la cueva canta el eco de todos ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, C = L.cueva;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            var n = ids.length;
            var tam = Math.min(L.tam, (L.der - 40) / Math.max(n, 3) * 0.9);
            var fila = [];
            for (var i = 0; i < n; i++) {
                var a = this.crearCosa(ids[i], C.x, C.y - tam * 0.3, tam, { depth: 30 });
                a.cont.setScale(0.3);
                var x = 20 + (L.der - 40) * (i + 0.5) / n;
                await this.saltarA(a.cont, x, L.prado.y0 + tam * 0.3, { ms: 420, alto: tam, esc: 1 });
                fila.push(a);
                // Cada uno suena y la cueva le devuelve el eco.
                this.eco = this.time.now;
                await this.sonar(ids[i], { breve: true, bocina: false });
                await esperar(this, 120);
                this.eco = this.time.now;
                await this.sonar(ids[i], { breve: true, bocina: false, vol: 0.5 });
                if (!this.sigue()) return;
            }
            fila.forEach(function (a, k) { self.time.delayedCall(k * 100, function () { a.saltito(0.25, 2); }); });
            Ut.estallido(this, C.x, C.y - C.h * 0.5, { n: 18, tex: 'nota', tam: 26, dist: 180, depth: 60 });
            await esperar(this, 1200);
        },

        /** Demo: la mano toca al que sonó dos veces y la red lo atrapa. */
        demoPaso: function () {
            var self = this;
            var a = this.correctaDe(this.cosas);
            if (!a) return null;
            a.pasea = false;
            return { desde: { x: a.cont.x, y: a.cont.y }, mantener: 400, hacer: function () { return self.lanzarRed(a.cont.x, a.cont.y, a); } };
        },

        estadoExtra: function () {
            return { cosas: this.cosas.map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; }) };
        },

        paso: function (time, delta) {
            var L = this.L, Pd = L.prado, C = L.cueva;
            var g = this.ecoG;
            g.clear();
            if (this.eco && time - this.eco < 1400) {
                for (var k = 0; k < 3; k++) {
                    var f = ((time - this.eco) / 1400 + k * 0.2);
                    if (f > 1) continue;
                    g.lineStyle(4, 0xffffff, 0.6 * (1 - f));
                    g.beginPath(); g.arc(C.x, C.y - C.h * 0.25, C.w * (0.2 + f * 0.6), Math.PI * 1.1, Math.PI * 1.9); g.strokePath();
                }
            }
            var dt = delta / 1000;
            this.cosas.forEach(function (a) {
                if (!a.pasea || !a.cont.active) return;
                a.fase += dt * 6;
                a.cont.x += a.vx * dt;
                if (a.cont.x < Pd.x0) { a.cont.x = Pd.x0; a.vx = Math.abs(a.vx); }
                if (a.cont.x > Pd.x1) { a.cont.x = Pd.x1; a.vx = -Math.abs(a.vx); }
                a.cont.y = a.base - Math.abs(Math.sin(a.fase)) * 6;
                a.img.scaleX = Math.abs(a.img.scaleX) * (a.vx < 0 ? -1 : 1);
            });
        }
    };

    K.crear({ id: 'cueva', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
