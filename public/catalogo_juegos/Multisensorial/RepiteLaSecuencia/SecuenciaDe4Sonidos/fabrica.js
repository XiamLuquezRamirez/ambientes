/**
 * «La fábrica de sonidos» — motor propio de Secuencia de 4 Sonidos (5-6 años).
 *
 * Una cinta transportadora lleva los sonidos sin parar. Mientras suena el código, las lámparas sobre
 * la caja de envío se encienden una a una (cuentan cuántos son, sin decir cuáles). Después las piezas
 * empiezan a pasar por la cinta y el niño debe TOCAR cada una cuando pasa, en el mismo orden en que
 * sonó: la pieza salta a su casilla de la caja. La cinta se acelera en cada nivel. Si toca una
 * equivocada, la alarma suena, la cinta se frena y la caja devuelve lo que llevaba; luego el código
 * suena otra vez. Al completarlo, la caja se cierra y sale hacia el camión.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.v = 70;
            this.t0 = 0;
            this.recorrido = 0;
            this.casillas = [];
            this.lampOn = -1;
            this.cajaX = 0;
            this.alarma = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.tam = Math.max(72, Math.min(110, (L.der - 120) / 6, H * 0.15));
            L.cinta = { y: Math.round(H * 0.5), h: Math.round(L.tam * 0.34) };
            L.cajaY = Math.round(H * 0.8);
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'fab_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#495c70'); g.addColorStop(1, '#7a8fa3');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.fillStyle = 'rgba(255,255,255,0.07)';
                for (var i = 0; i < w; i += 80) x.fillRect(i, 0, 3, h);
                // Ventanales.
                for (var v = 0; v < 4; v++) {
                    var vx = w * (0.12 + v * 0.26);
                    x.fillStyle = '#9fd3f5'; x.fillRect(vx, h * 0.08, w * 0.12, h * 0.2);
                    x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(vx + 6, h * 0.08 + 6, 10, h * 0.2 - 12);
                    x.strokeStyle = '#3d4b5a'; x.lineWidth = 6; x.strokeRect(vx, h * 0.08, w * 0.12, h * 0.2);
                    x.beginPath(); x.moveTo(vx + w * 0.06, h * 0.08); x.lineTo(vx + w * 0.06, h * 0.28); x.stroke();
                }
                // Suelo y franjas.
                x.fillStyle = '#34414f'; x.fillRect(0, h * 0.72, w, h * 0.28);
                x.fillStyle = '#fcc419';
                for (var m = 0; m < w; m += 64) { x.beginPath(); x.moveTo(m, h * 0.72); x.lineTo(m + 32, h * 0.72); x.lineTo(m + 24, h * 0.72 + 10); x.lineTo(m - 8, h * 0.72 + 10); x.fill(); }
            });
            keep(this.add.image(0, 0, 'fab_fondo').setOrigin(0, 0).setDepth(1));
            this.engranesG = keep(this.add.graphics().setDepth(2));
            this.cintaG = keep(this.add.graphics().setDepth(10));
            this.cajaG = keep(this.add.graphics().setDepth(12));
            this.vaporG = keep(this.add.graphics().setDepth(11));
            this.montarHud(keep);
            this.sembrarMotes(keep, 12, { x: 0, y: 0, w: L.W, h: L.cinta.y, depth: 8 }, 0xfff3bf);
            if (reubicar) this.sembrarCinta();
        },

        /* ── Caja de envío: una casilla por sonido ── */

        posCasilla: function (i, n) {
            var L = this.L;
            var w = Math.min(L.der - 80, n * (L.tam * 0.95 + 10));
            var x0 = L.der / 2 - w / 2 + this.cajaX;
            var paso = w / n;
            return { x: x0 + paso * (i + 0.5), y: L.cajaY, lado: Math.min(L.tam * 0.9, paso - 8) };
        },

        dibujarCaja: function () {
            var L = this.L, g = this.cajaG;
            if (!g || !g.active) return;
            g.clear();
            var n = this.casillas.length;
            if (!n) return;
            var p0 = this.posCasilla(0, n), pN = this.posCasilla(n - 1, n);
            var ancho = pN.x - p0.x + p0.lado + 30, alto = p0.lado + 40;
            g.fillStyle(0x000000, 0.25); g.fillRoundedRect(p0.x - p0.lado / 2 - 15 + 4, L.cajaY - alto / 2 + 8, ancho, alto, 14);
            g.fillStyle(0xb7791f, 1); g.fillRoundedRect(p0.x - p0.lado / 2 - 15, L.cajaY - alto / 2, ancho, alto, 14);
            g.lineStyle(4, 0x8a5a14, 1); g.strokeRoundedRect(p0.x - p0.lado / 2 - 15, L.cajaY - alto / 2, ancho, alto, 14);
            for (var i = 0; i < n; i++) {
                var p = this.posCasilla(i, n);
                g.fillStyle(this.casillas[i] ? 0x2b8a3e : 0xe9c46a, 1); g.fillRoundedRect(p.x - p.lado / 2, p.y - p.lado / 2, p.lado, p.lado, 10);
                var lampOn = this.lampOn === i || this.casillas[i];
                g.fillStyle(lampOn ? 0xffd43b : (this.alarma > 0.01 ? 0xff6b6b : 0x6c757d), 1);
                g.fillCircle(p.x, p.y - alto / 2 - 14, 8);
            }
            this.cajaAncho = ancho;
        },

        /* ── La cinta ── */

        crearPieza: function (id, i) {
            var a = this.crearCosa(id, -300, 0, this.L.tam * 0.78, { depth: 30, sinSombra: true });
            var g = this.add.graphics();
            var t = this.L.tam;
            g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-t * 0.46 + 3, -t * 0.46 + 6, t * 0.92, t * 0.92, 12);
            g.fillStyle(0xf8f9fa, 1); g.fillRoundedRect(-t * 0.46, -t * 0.46, t * 0.92, t * 0.92, 12);
            g.lineStyle(4, 0x74c0fc, 1); g.strokeRoundedRect(-t * 0.46, -t * 0.46, t * 0.92, t * 0.92, 12);
            a.cont.addAt(g, 0);
            a.tam = t * 0.95;
            a.cont.setAlpha(0);
            return a;
        },

        sembrarCinta: function () {
            var L = this.L, n = this.cosas.length;
            this.span = L.der + L.tam;
            var self = this;
            this.cosas.forEach(function (a, i) { a.off = self.span * (i + 0.5) / n; });
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            this.cosas = nv.opciones.map(function (id, i) { return self.crearPieza(id, i); });
            this.sembrarCinta();
            this.v = 60 + (this.nivelActual || 0) * 34;
            this.recorrido = 0;
            K.ruido({ f: 700, q: 0.8, dur: 0.3, vol: 0.05 });
            this.cosas.forEach(function (a, i) { self.tweens.add({ targets: a.cont, alpha: 1, duration: 400, delay: i * 100 }); });
            await esperar(this, 500 + nv.opciones.length * 100);
        },

        prepararNivel: async function (i, nv) {
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.v = 60;
            this.cajaX = this.L.W;
            this.casillas = nv.reproducciones[0].map(function () { return null; });
            this.dibujarCaja();
            await tw(this, { targets: this, cajaX: 0, duration: 700, ease: 'Sine.easeOut', onUpdate: function () { this.targets[0].dibujarCaja(); } });
            this.cajaX = 0;
            this.dibujarCaja();
        },

        alSonar: function (id, k) {
            this.lampOn = k;
            this.dibujarCaja();
            K.tono({ f: 700 + k * 90, dur: 0.05, vol: 0.03 });
            var self = this;
            this.time.delayedCall(420, function () { self.lampOn = -1; self.dibujarCaja(); });
        },

        alTerminarVuelta: function () { this.lampOn = -1; this.dibujarCaja(); },

        /* ── Tocar piezas al pasar ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.L.tam * 0.65);
            if (!a || a.usada) return;
            this.pista.reiniciar();
            await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
        },

        alMarcar: async function (id, k) {
            var a = this.tocado;
            var n = this.casillas.length;
            var d = this.posCasilla(k, n);
            a.usada = true;
            a.cont.setDepth(40);
            this.casillas[k] = id;
            await this.saltarA(a.cont, d.x, d.y, { ms: 480, alto: 90, esc: d.lado / (a.tam * 0.95) });
            K.ruido({ f: 1700, q: 3, dur: 0.06, vol: 0.09 });
            this.dibujarCaja();
            Ut.estallido(this, d.x, d.y, { n: 6, tex: 'estrella', tam: 20, dist: 80, depth: 70, sinTinte: true });
        },

        alFallar: async function () {
            var a = this.tocado;
            this.alarma = 1;
            this.dibujarCaja();
            this.cameras.main.shake(200, 0.004);
            K.tono({ f: 300, f2: 170, dur: 0.25, vol: 0.05 });
            var viejo = this.v;
            this.v = 0;
            if (a) await a.sacudir();
            this.v = viejo;
            this.alarma = 0;
            this.dibujarCaja();
        },

        alReiniciar: async function () {
            var self = this;
            var vuelven = [];
            this.cosas.forEach(function (a) {
                if (a.usada) {
                    a.usada = false;
                    a.cont.setScale(1);
                    a.cont.setDepth(30);
                    // vuelve a la cinta, en el sitio donde le toca ahora
                    var t = (self.time.now - self.t0) / 1000;
                    var x = ((a.off + self.v * t) % self.span) - self.L.tam * 0.5;
                    vuelven.push(self.saltarA(a.cont, x, self.L.cinta.y - self.L.tam * 0.5, { ms: 420, alto: 60 }));
                }
            });
            this.casillas = this.casillas.map(function () { return null; });
            this.dibujarCaja();
            await Promise.all(vuelven);
        },

        alAcertar: async function () {
            var nv = this.nv;
            var n = nv.correctas.length;
            for (var k = 0; k < n; k++) {
                if (!this.sigue()) return;
                this.reunidos.push(nv.correctas[k]);
                this.lampOn = k;
                this.dibujarCaja();
                var a = this.cosas.filter(function (q) { return q.usada && q.id === nv.correctas[k]; })[0];
                if (a) a.latir();
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 100);
            }
            this.lampOn = -1;
            // La caja se cierra y sale hacia el camión.
            this.v = 0;
            var usadas = this.cosas.filter(function (q) { return q.usada; });
            K.tono({ f: 400, f2: 800, dur: 0.4, vol: 0.05, tipo: 'triangle' });
            Ut.estallido(this, this.L.der / 2, this.L.cajaY, { n: 16, tex: 'estrella', tam: 28, dist: 200, depth: 70, sinTinte: true });
            await esperar(this, 500);
            var self = this;
            await tw(this, { targets: this, cajaX: this.L.W, duration: 900, ease: 'Cubic.easeIn', onUpdate: function () { self.dibujarCaja(); usadas.forEach(function (q, i) { var p = self.posCasilla(self.casillas.indexOf(q.id), self.casillas.length); if (p) q.cont.x = p.x; }); } });
        },

        alTerminarNivel: async function () {
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.casillas = [];
            this.cajaX = 0;
            this.dibujarCaja();
        },

        mostrarPista: function (cancelada) { return this.pistaToque(cancelada, this.cosas.filter(function (a) { return !a.usada; })); },
        demoPaso: function () { return this.demoOrden(this.cosas); },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 6);
            if (!ids.length) ids = ['tambor', 'pajaro', 'campana', 'gato'];
            this.cosas = ids.map(function (id, i) { return self.crearPieza(id, i); });
            this.sembrarCinta();
            this.t0 = this.time.now;
            this.v = 130;
            this.cosas.forEach(function (a, i) { self.tweens.add({ targets: a.cont, alpha: 1, duration: 300, delay: i * 80 }); });
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas[i];
                a.latir();
                Ut.estallido(this, a.cont.x, a.cont.y, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 100);
            await esperar(this, 1200);
        },

        estadoExtra: function () {
            var self = this;
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active && !a.usada; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; }),
                casillas: this.casillas.slice(), v: this.v
            };
        },

        paso: function (time, delta) {
            var L = this.L, dt = (delta || 16) / 1000;
            if (!this.t0) this.t0 = time;
            this.recorrido += this.v * dt;
            // Piezas sobre la cinta: posición = desfase + recorrido acumulado (se frena sin saltar).
            var self = this;
            this.cosas.forEach(function (a) {
                if (!a.cont.active || a.usada || self.tweens.isTweening(a.cont)) return;
                var x = ((a.off + self.recorrido) % self.span) - L.tam * 0.5;
                a.cont.x = x;
                a.cont.y = L.cinta.y - L.tam * 0.46 + Math.sin(time / 300 + a.off) * 2;
                a.cont.setAlpha(Math.min(1, Math.max(0, Math.min(x + L.tam * 0.5, L.der - x) / (L.tam * 0.8))));
            });
            self.t0 = time - self.recorrido / Math.max(self.v, 1) * 1000 * 0 + 0;
            var g = this.cintaG;
            if (g && g.active) {
                g.clear();
                var y = L.cinta.y, h = L.cinta.h;
                g.fillStyle(0x212529, 1); g.fillRoundedRect(0, y - 6, L.der + 10, h + 12, 10);
                g.fillStyle(0x343a40, 1); g.fillRect(0, y, L.der + 10, h);
                g.fillStyle(0xfcc419, 0.9);
                for (var q = -1; q < L.der / 40 + 1; q++) {
                    var cx = (q * 40 + this.recorrido) % (L.der + 40);
                    g.fillTriangle(cx, y + 4, cx + 14, y + h / 2, cx, y + h - 4);
                }
                g.fillStyle(0x6c757d, 1);
                g.fillRect(0, y + h + 6, 16, L.H * 0.12); g.fillRect(L.der - 16, y + h + 6, 16, L.H * 0.12);
            }
            var e = this.engranesG;
            if (e && e.active) {
                e.clear();
                [[0.1, 0.38, 46], [0.88, 0.32, 64], [0.5, 0.12, 36]].forEach(function (d, i) {
                    var cx = L.der * d[0], cy = L.H * d[1], r = d[2], ang = (time / 1000) * (i % 2 ? -1 : 1) * (0.4 + self.v / 120);
                    e.fillStyle(0x3d4b5a, 1); e.fillCircle(cx, cy, r);
                    for (var k = 0; k < 10; k++) { var a2 = ang + k * Math.PI / 5; e.fillRect(cx + Math.cos(a2) * r - 5, cy + Math.sin(a2) * r - 5, 10, 10); }
                    e.fillStyle(0x7a8fa3, 1); e.fillCircle(cx, cy, r * 0.4);
                });
            }
            var vp = this.vaporG;
            if (vp && vp.active) {
                vp.clear();
                for (var s = 0; s < 4; s++) {
                    var f = ((time / 1500) + s / 4) % 1;
                    vp.fillStyle(0xffffff, 0.35 * (1 - f));
                    vp.fillCircle(L.der * 0.88 + Math.sin(f * 5 + s) * 10, L.H * 0.32 - 70 - f * 70, 8 + f * 18);
                }
            }
        }
    };

    K.crear({ id: 'fabrica', fondo: '#495c70', escena: escena });
})(typeof window !== 'undefined' ? window : this);
