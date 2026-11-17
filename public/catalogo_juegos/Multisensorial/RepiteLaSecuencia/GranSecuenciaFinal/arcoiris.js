/**
 * «El arcoíris de sonidos» — motor propio de la Gran Secuencia Final (3-4 años).
 *
 * Un paisaje con un arcoíris «fantasma» (sin color) de tantas bandas como sonidos. Mientras suena
 * la secuencia, cada banda se ilumina un instante (cuenta cuántos son, sin decir cuáles). Después
 * unas nubes con los instrumentos y animales DERIVAN lentamente por el cielo y el niño las ATRAPA
 * tocándolas en el mismo orden en que sonaron: cada nube correcta estalla en colores y pinta la
 * siguiente banda. Si toca otra, la nube se sacude, el color se retira y la secuencia suena de
 * nuevo. Al completar, el arcoíris brilla, suena entero y llueven globos y confeti.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var BANDAS = [0xe03131, 0xff922b, 0xffd43b, 0x51cf66, 0x339af0, 0x9c36b5];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.bandas = [];
            this.reunidos = [];
            this.v = 24;
            this.brillo = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), modelo: 'nina', giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * 0.8);
            L.cx = Math.round(L.der / 2);
            L.R = Math.min(L.der * 0.42, H * 0.52);
            L.grosor = Math.max(18, Math.min(38, L.R * 0.1));
            L.tam = Math.max(86, Math.min(130, (L.der - 120) / 4.4, H * 0.18));
            L.nubes = { y0: Math.round(H * 0.5), y1: Math.round(H * 0.72) };
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte - 30, arboles: [0.05, 0.95], solX: 0.14 });
                V.mariposas(2, { x: 0, y: L.horizonte - 120, w: L.W, h: 90, depth: 8 });
            }
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x8ce99a, 1); pasto.fillRect(0, L.horizonte - 30, L.W, L.H - L.horizonte + 30);
            pasto.fillStyle(0x69db7c, 1); pasto.fillRect(0, L.horizonte - 30, L.W, 8);
            pasto.fillStyle(0x51cf66, 0.5);
            for (var i = 0; i < 60; i++) { var gx = (i * 101) % L.W, gy = L.horizonte - 12 + ((i * 47) % Math.max(10, L.H - L.horizonte)); pasto.fillTriangle(gx, gy, gx + 4, gy - 11, gx + 8, gy); }
            this.arcoG = keep(this.add.graphics().setDepth(10));
            this.lluviaG = keep(this.add.graphics().setDepth(29));
            this.montarHud(keep);
            this.sembrarMotes(keep, 12, { x: 0, y: 0, w: L.W, h: L.horizonte, depth: 8 }, 0xfff3bf);
            if (reubicar && this.cosas.length) this.sembrarNubes();
        },

        nBandas: function () { return this.bandas.length; },

        armarBandas: function (n) {
            this.bandas = [];
            for (var k = 0; k < n; k++) this.bandas.push({ p: 0, fantasma: 0, col: BANDAS[k % BANDAS.length] });
        },

        /* ── Nubes que derivan ── */

        crearNube: function (id, i, tam) {
            var a = this.crearCosa(id, -200, 0, tam * 0.62, { depth: 30, sinSombra: true });
            var g = this.add.graphics();
            var w = tam * 1.55;
            g.fillStyle(0x74c0fc, 0.28); g.fillEllipse(0, tam * 0.26, w * 0.95, tam * 0.3);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(-w * 0.28, 0, tam * 0.4); g.fillCircle(w * 0.28, 0, tam * 0.38);
            g.fillCircle(-w * 0.05, -tam * 0.2, tam * 0.5); g.fillRoundedRect(-w * 0.45, -tam * 0.02, w * 0.9, tam * 0.36, tam * 0.18);
            g.fillStyle(0xe7f5ff, 1); g.fillEllipse(0, tam * 0.2, w * 0.82, tam * 0.2);
            a.cont.addAt(g, 0);
            a.tam = tam * 1.0;
            a.fase = Math.random() * 6;
            a.cont.setAlpha(0);
            return a;
        },

        sembrarNubes: function () {
            var L = this.L;
            var n = this.cosas.length;
            this.span = L.der + L.tam;
            var self = this;
            this.cosas.forEach(function (a, i) {
                a.off = self.span * (i + 0.5) / n;
                a.yBase = L.nubes.y0 + (L.nubes.y1 - L.nubes.y0) * (i % 2 ? 0.2 : 0.8);
            });
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L;
            var tam = Math.min(L.tam, (L.der - 60) / nv.opciones.length * 0.9);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearNube(id, i, tam); });
            this.sembrarNubes();
            this.v = 24 + (this.nivelActual || 0) * 12;
            this.t0 = this.time.now;
            K.ruido({ f: 1200, q: 1, dur: 0.1, vol: 0.05 });
            this.cosas.forEach(function (a, i) {
                self.tweens.add({ targets: a.cont, alpha: 1, duration: 500, delay: i * 120 });
            });
            await esperar(this, 600 + nv.opciones.length * 100);
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.armarBandas(nv.reproducciones[0].length);
            this.bandas.forEach(function (b) { b.fantasma = 0.16; });
            await esperar(this, 300);
        },

        alSonar: function (id, k) {
            var b = this.bandas[k];
            if (!b) return;
            this.tweens.killTweensOf(b);
            b.fantasma = 0.16;
            this.tweens.add({ targets: b, fantasma: 0.85, duration: 180, yoyo: true, hold: 260 });
            var L = this.L;
            var ang = Math.PI * (0.2 + 0.6 * (k + 1) / (this.bandas.length + 1));
            Ut.estallido(this, L.cx - Math.cos(ang) * (L.R - k * L.grosor), L.horizonte - Math.sin(ang) * (L.R - k * L.grosor), { n: 3, tex: 'nota', tam: 22, dist: 60, depth: 70 });
        },

        /* ── Atrapar nubes ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.cosas.length ? this.cosas[0].tam * 0.8 : 70);
            if (!a || a.usada) return;
            this.pista.reiniciar();
            await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
        },

        alMarcar: async function (id, k) {
            var a = this.tocado;
            var b = this.bandas[k];
            var L = this.L;
            a.usada = true;
            Ut.estallido(this, a.cont.x, a.cont.y, { n: 12, tex: 'chispa', tam: 26, dist: 110, depth: 70, colores: [b.col, 0xffffff, b.col] });
            this.tweens.add({ targets: a.cont, scale: 1.4, alpha: 0, duration: 260 });
            K.tono({ f: 520 + k * 120, f2: 780 + k * 120, dur: 0.2, vol: 0.05 });
            await tw(this, { targets: b, p: 1, duration: 650, ease: 'Sine.easeOut' });
        },

        alFallar: async function () {
            var a = this.tocado;
            if (a) await a.sacudir();
            K.tono({ f: 300, f2: 190, dur: 0.2, vol: 0.05 });
        },

        alReiniciar: async function () {
            for (var k = this.bandas.length - 1; k >= 0; k--) {
                var b = this.bandas[k];
                if (b.p > 0) { await tw(this, { targets: b, p: 0, duration: 200 }); }
            }
            this.cosas.forEach(function (a) {
                if (a.usada) {
                    a.usada = false;
                    a.cont.setScale(1);
                    a.tweens = null;
                }
            });
            var self = this;
            this.cosas.forEach(function (a) { self.tweens.add({ targets: a.cont, alpha: 1, duration: 400 }); });
        },

        /** Acierto: el arcoíris se enciende banda por banda al ritmo de cada sonido. */
        alAcertar: async function () {
            var nv = this.nv;
            for (var k = 0; k < this.bandas.length; k++) {
                if (!this.sigue()) return;
                this.reunidos.push(nv.correctas[k]);
                this.tweens.add({ targets: this, brillo: 1, duration: 120, yoyo: true });
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 100);
            }
            Ut.confeti(this, 60);
            Ut.estallido(this, this.L.cx, this.L.horizonte - this.L.R, { n: 18, tex: 'corazon', tam: 28, dist: 220, depth: 70 });
            await esperar(this, 700);
        },

        alTerminarNivel: async function () {
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            for (var k = this.bandas.length - 1; k >= 0; k--) await tw(this, { targets: this.bandas[k], p: 0, fantasma: 0, duration: 140 });
        },

        mostrarPista: function (cancelada) {
            return this.pistaToque(cancelada, this.cosas.filter(function (a) { return !a.usada; }));
        },
        demoPaso: function () { return this.demoOrden(this.cosas); },

        /** Final: un arcoíris de seis colores suena entero con todos los sonidos de la partida. */
        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.armarBandas(6);
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            if (!ids.length) ids = ['tambor', 'campana', 'pajaro'];
            for (var k = 0; k < 6; k++) {
                if (!this.sigue()) return;
                K.tono({ f: 440 + k * 110, f2: 660 + k * 110, dur: 0.22, vol: 0.05 });
                Ut.estallido(this, L.cx - (L.R - k * L.grosor) * 0.8, L.horizonte - 40, { n: 6, tex: 'estrella', tam: 22, dist: 90, depth: 70, sinTinte: true });
                await tw(this, { targets: this.bandas[k], p: 1, duration: 420, ease: 'Sine.easeOut' });
            }
            var V = this.vidaAmb;
            if (V && V.globos) V.globos({ x: 0, y: 0, w: L.W, h: L.H });
            for (var i = 0; i < Math.min(ids.length, 4); i++) {
                this.tweens.add({ targets: this, brillo: 1, duration: 140, yoyo: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 90);
            await esperar(this, 1200);
        },

        estadoExtra: function () {
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active && !a.usada; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; }),
                bandas: this.bandas.map(function (b) { return Math.round(b.p * 100); })
            };
        },

        paso: function (time) {
            var L = this.L;
            if (this.lluviaG && this.lluviaG.active) this.lluviaG.clear();
            // Nubes: derivan hacia la derecha y vuelven por la izquierda.
            if (this.cosas.length && this.span) {
                var t = (time - (this.t0 || time)) / 1000;
                var self = this;
                this.cosas.forEach(function (a) {
                    if (!a.cont.active || a.usada) return;
                    var x = ((a.off + self.v * t) % self.span) - L.tam * 0.5;
                    a.cont.x = x;
                    a.cont.y = a.yBase + Math.sin(time / 900 + a.fase) * 10;
                    var borde = Math.min(1, Math.max(0, Math.min(x + L.tam * 0.5, L.der - x) / (L.tam * 0.8)));
                    if (!self.tweens.isTweening(a.cont)) a.cont.setAlpha(borde);
                    // Cada nube suelta gotitas que caen: el cielo está vivo.
                    if (!a.gotas) { a.gotas = [0, 0.25, 0.5, 0.75]; }
                    self.lluviaG.fillStyle(0x74c0fc, 0.7 * borde);
                    a.gotas.forEach(function (gp, gi) {
                        var ph = ((time / 900) + gp) % 1;
                        self.lluviaG.fillCircle(x + (gi - 1.5) * L.tam * 0.22, a.cont.y + L.tam * 0.3 + ph * L.tam * 0.7, 2.6 * (1 - ph * 0.5));
                    });
                });
            }
            var g = this.arcoG;
            if (!g || !g.active) return;
            g.clear();
            var n = this.bandas.length;
            for (var k = 0; k < n; k++) {
                var b = this.bandas[k];
                var r = L.R - k * L.grosor * 1.02;
                if (b.fantasma > 0.01) {
                    g.lineStyle(L.grosor, 0xffffff, b.fantasma * 0.9);
                    g.beginPath(); g.arc(L.cx, L.horizonte, r, Math.PI, Math.PI * 2, false); g.strokePath();
                }
                if (b.p > 0.005) {
                    g.lineStyle(L.grosor, b.col, 0.92);
                    g.beginPath(); g.arc(L.cx, L.horizonte, r, Math.PI, Math.PI + Math.PI * b.p, false); g.strokePath();
                    if (this.brillo > 0.02) { g.lineStyle(L.grosor * 0.5, 0xffffff, 0.5 * this.brillo); g.beginPath(); g.arc(L.cx, L.horizonte, r, Math.PI, Math.PI + Math.PI * b.p, false); g.strokePath(); }
                }
            }
        }
    };

    K.crear({ id: 'arcoiris', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
