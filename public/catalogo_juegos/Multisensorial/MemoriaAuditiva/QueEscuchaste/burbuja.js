/**
 * «La burbuja de sonido» — motor propio de ¿Qué escuchaste? (3-4 años).
 * En el parque, el sonido queda atrapado en una burbuja que se infla mientras suena (sin delatar
 * qué es). Después aparecen los objetos sobre el pasto y el niño ARRASTRA la burbuja hasta el que
 * sonó: la burbuja revienta sobre él y el objeto hace su sonido. Si no es, la burbuja rebota y el
 * objeto suena con su propio sonido (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;

    var escena = {
        iniciar: function () { this.cosas = []; this.burbuja = null; this.reunidos = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 78, piso: H - 104, alto: Math.min(170, H * 0.3), modelo: 'nina' } : null;
            L.der = L.pres ? W - 160 : W - 16;
            L.y0 = Math.round(H * 0.6);
            L.tam = Math.max(70, Math.min(150, (L.der - 20) / 4.4, H * 0.2));
            L.fila = L.y0 + (H - L.y0) * 0.42;
            L.casa = { x: L.der / 2 + 8, y: Math.max(L.bocina.y + L.bocina.r + L.tam * 0.75, L.y0 * 0.62) };
            L.R = L.tam * 0.62;
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.y0 - 10, arboles: [0.05, 0.22, 0.78, 0.95], solX: 0.12 });
                V.mariposas(2, { x: 0, y: L.y0 - 30, w: L.W, h: 40, depth: 8 });
            }
            K.textura(this, 'burbuja_pasto', L.W, L.H - L.y0 + 20, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#8ce99a'); g.addColorStop(1, '#51cf66');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 300), ['#69db7c', '#b2f2bb', '#40c057'], 1.6, 0.4);
                // Camino de tierra donde se paran los objetos.
                x.fillStyle = 'rgba(210,170,110,0.55)';
                K.rr(x, w * 0.04, h * 0.22, (L.der - w * 0.04 - 10), h * 0.5, h * 0.25); x.fill();
            });
            keep(this.add.image(0, L.y0 - 10, 'burbuja_pasto').setOrigin(0, 0).setDepth(4));
            // Soplador de burbujas: un aro con mango clavado en el pasto, de donde nace la burbuja.
            var s = keep(this.add.graphics().setDepth(6));
            s.lineStyle(6, 0x845ef7, 1);
            s.lineBetween(L.casa.x, L.casa.y + L.R * 1.05, L.casa.x, L.y0 + 14);
            s.strokeCircle(L.casa.x, L.casa.y + L.R * 1.05, 10);
            this.montarHud(keep);
            if (reubicar) {
                this.ubicarCosas();
                if (this.burbuja) this.burbuja.setPosition(L.casa.x, L.casa.y);
            }
        },

        /* ── Burbuja ── */

        crearBurbuja: function () {
            var L = this.L;
            if (this.burbuja) this.burbuja.destroy();
            var b = this.add.container(L.casa.x, L.casa.y).setDepth(60).setScale(0.05);
            var cuerpo = this.add.circle(0, 0, L.R, 0xd0ebff, 0.28).setStrokeStyle(4, 0xffffff, 0.9);
            var tornasol = this.add.circle(0, 0, L.R * 0.92, 0xe599f7, 0).setStrokeStyle(3, 0xe599f7, 0.35);
            var brillo = this.add.ellipse(-L.R * 0.38, -L.R * 0.42, L.R * 0.42, L.R * 0.24, 0xffffff, 0.85).setAngle(-30);
            var ondas = this.add.graphics();
            b.add([cuerpo, tornasol, ondas, brillo]);
            b.ondas = ondas;
            b.libre = false;
            b.fase = 0;
            this.burbuja = b;
            return b;
        },

        dibujarOndas: function (t, fuerte) {
            var b = this.burbuja;
            if (!b) return;
            var g = b.ondas, R = this.L.R;
            g.clear();
            // Ondas de sonido dentro de la burbuja (no muestran qué es: solo que guarda un sonido).
            for (var k = 0; k < 3; k++) {
                var f = ((t / 700) + k / 3) % 1;
                g.lineStyle(3, 0x7950f2, (fuerte ? 0.8 : 0.45) * (1 - f));
                g.beginPath(); g.arc(-R * 0.15, 0, R * (0.15 + f * 0.6), -0.7, 0.7); g.strokePath();
            }
        },

        alSonar: function () {
            var b = this.burbuja;
            if (!b) return;
            // Cada vez que suena, la burbuja se infla un poco más.
            this.tweens.add({ targets: b, scale: 1, duration: 700, ease: 'Back.easeOut' });
            K.ruido({ f: 900, q: 0.6, dur: 0.5, vol: 0.03 });
        },

        /* ── Objetos sobre el pasto ── */

        lugares: function (n) {
            var L = this.L;
            var out = [];
            var ancho = L.der - 40;
            for (var i = 0; i < n; i++) out.push({ x: 20 + ancho * (i + 0.5) / n, y: L.fila });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.cont.setPosition(lug[i].x, lug[i].y); a.casa = lug[i]; });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await Promise.all(this.cosas.map(function (a) { return tw(self, { targets: a.cont, alpha: 0, y: a.cont.y + 30, duration: 250 }).then(function () { a.destruir(); }); }));
            this.cosas = [];
            this.crearBurbuja();
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L;
            var lug = this.lugares(nv.opciones.length);
            var tam = Math.min(L.tam, (L.der - 40) / nv.opciones.length * 0.85);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y + 40, tam, { depth: 30 });
                a.casa = lug[i];
                a.cont.setAlpha(0);
                return a;
            });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 130).then(function () {
                    K.ruido({ f: 1600, q: 1, dur: 0.06, vol: 0.05 });
                    return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 360, ease: 'Back.easeOut' });
                });
            }));
            this.burbuja.libre = true;
        },

        cosaBajo: function (x, y) {
            var mejor = null, dmin = this.L.tam * 0.75;
            this.cosas.forEach(function (a) {
                var d = Math.hypot(x - a.cont.x, y - a.cont.y);
                if (d < dmin) { dmin = d; mejor = a; }
            });
            return mejor;
        },

        /* ── Gesto: arrastrar la burbuja ── */

        alTocar: function (p) {
            var b = this.burbuja;
            if (this.fase !== 'jugar' || !b || !b.libre) return;
            if (Math.hypot(p.x - b.x, p.y - b.y) < this.L.R * 1.3) {
                this.arrastrando = { dx: b.x - p.x, dy: b.y - p.y };
                b.libre = false;
                this.tweens.killTweensOf(b);
                b.setScale(1.08);
                K.tono({ f: 700, dur: 0.06, vol: 0.04 });
                this.pista.reiniciar();
                return;
            }
            // Tocar un objeto suelto lo hace sonar (para comparar), sin contar como error.
            var a = this.cosaBajo(p.x, p.y);
            if (a && !this.sonando) { this.sonar(a.id, { breve: true, bocina: false }); a.saltito(0.08, 1); }
        },

        alMover: function (p) {
            var r = this.arrastrando;
            if (!r || !this.burbuja) return;
            this.burbuja.setPosition(p.x + r.dx, p.y + r.dy);
            var a = this.cosaBajo(this.burbuja.x, this.burbuja.y);
            if (a !== this.apuntado) {
                if (this.apuntado) this.tweens.add({ targets: this.apuntado.cont, scale: 1, duration: 120 });
                if (a) this.tweens.add({ targets: a.cont, scale: 1.12, duration: 120 });
                this.apuntado = a;
            }
        },

        alSoltar: async function () {
            if (!this.arrastrando) return;
            this.arrastrando = null;
            var b = this.burbuja;
            if (this.apuntado) this.tweens.add({ targets: this.apuntado.cont, scale: 1, duration: 120 });
            var a = this.apuntado;
            this.apuntado = null;
            if (!b) return;
            b.setScale(1);
            if (!a || this.fase !== 'jugar') { this.volverBurbuja(); return; }
            this.tocado = a;
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y - a.tam * 0.4 });
            if (ok === false) this.volverBurbuja(true);
        },

        volverBurbuja: function (rebote) {
            var self = this;
            var b = this.burbuja, L = this.L;
            if (!b) return;
            if (rebote) K.tono({ f: 300, f2: 180, dur: 0.18, vol: 0.06 });
            tw(this, { targets: b, x: L.casa.x, y: L.casa.y, duration: rebote ? 650 : 450, ease: rebote ? 'Bounce.easeOut' : 'Sine.easeOut' }).then(function () { b.libre = true; });
        },

        /* ── Respuestas ── */

        alAcertar: async function (ids) {
            var a = this.tocado || this.cosas.filter(function (c) { return c.id === ids[0]; })[0];
            var b = this.burbuja;
            if (b) {
                // La burbuja revienta sobre el objeto.
                await tw(this, { targets: b, x: a.cont.x, y: a.cont.y - a.tam * 0.25, scale: 1.25, duration: 200 });
                K.tono({ f: 1300, f2: 300, dur: 0.12, vol: 0.08 });
                Ut.estallido(this, b.x, b.y, { n: 12, tex: 'burbuja', tam: 22, dist: 110, depth: 70 });
                b.destroy();
                this.burbuja = null;
            }
            this.reunidos.push(a.id);
            await Promise.all([this.sonar(a.id, { bocina: false }), a.saltito(0.2, 3)]);
        },

        alFallar: async function (id) {
            var a = this.tocado;
            if (a) await a.sacudir();
        },

        alTerminarNivel: async function () {
            var self = this;
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 80).then(function () { return tw(self, { targets: a.cont, alpha: 0, y: a.cont.y + 30, duration: 260 }); });
            }));
        },

        mostrarPista: function (cancelada) {
            var self = this;
            var b = this.burbuja;
            if (!b || this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var no = function () { return cancelada() || self.fase !== 'jugar' || !!self.arrastrando; };
            if (this.ayuda) {
                var ok = this.cosas.filter(function (c) { return self.respuestas().indexOf(c.id) >= 0; })[0];
                if (ok) return this.ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 200, arrastre: { dx: ok.cont.x - b.x, dy: ok.cont.y - b.y, durMs: 900 }, cancelado: no });
            }
            this.tweens.add({ targets: b, y: b.y - 16, duration: 220, yoyo: true, repeat: 2 });
            return this.ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, cancelado: no });
        },

        /* ── Escena final: burbujas de fiesta con lo que recordó ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.alTerminarNivel();
            var ids = this.reunidos.slice();
            var n = ids.length;
            for (var i = 0; i < n; i++) {
                (function (id, k) {
                    var x = 30 + (L.der - 60) * (k + 0.5) / n;
                    var c = self.add.container(x, L.H + 60).setDepth(70);
                    var R = Math.min(L.R * 0.95, (L.der - 60) / n * 0.45);
                    var cuerpo = self.add.circle(0, 0, R, 0xd0ebff, 0.3).setStrokeStyle(3, 0xffffff, 0.9);
                    var img = self.add.image(0, 0, 'el_' + id);
                    img.setScale(R * 1.3 / Math.max(img.width, img.height));
                    var brillo = self.add.ellipse(-R * 0.38, -R * 0.42, R * 0.42, R * 0.24, 0xffffff, 0.85).setAngle(-30);
                    c.add([img, cuerpo, brillo]);
                    var alto = L.H * (0.3 + (k % 2) * 0.12);
                    self.time.delayedCall(k * 380, function () {
                        self.tweens.add({ targets: c, y: alto, x: x + rnd(-20, 20), duration: 1600, ease: 'Sine.easeOut' });
                        self.tweens.add({ targets: c, angle: { from: -6, to: 6 }, duration: 700, yoyo: true, repeat: -1 });
                    });
                    // Cada una revienta y suena lo que guardaba.
                    self.time.delayedCall(2200 + k * 600, function () {
                        if (!c.active) return;
                        self.sonar(id, { breve: true, bocina: false });
                        K.tono({ f: 1300, f2: 300, dur: 0.12, vol: 0.06 });
                        Ut.estallido(self, c.x, c.y, { n: 10, tex: 'estrella', tam: 22, dist: 100, sinTinte: true, depth: 75 });
                        self.tweens.add({ targets: img, y: L.H * 0.1, alpha: 0, scale: img.scale * 1.4, duration: 700 });
                        self.tweens.add({ targets: [cuerpo, brillo], scale: 1.6, alpha: 0, duration: 200 });
                    });
                })(ids[i], i);
            }
            await esperar(this, 2600 + n * 600);
        },

        /** Demo: la mano lleva la burbuja hasta el que sonó. */
        demoPaso: function () {
            var self = this;
            var a = this.correctaDe(this.cosas), b = this.burbuja;
            if (!a || !b) return null;
            return {
                desde: { x: b.x, y: b.y }, hasta: { x: a.cont.x, y: a.cont.y },
                hacer: async function () {
                    b.libre = false;
                    self.arrastrando = { dx: 0, dy: 0 };
                    await tw(self, { targets: b, x: a.cont.x, y: a.cont.y, duration: 350 });
                    self.apuntado = a;
                    await self.alSoltar();
                }
            };
        },

        estadoExtra: function () {
            var b = this.burbuja;
            return {
                burbuja: b ? { x: Math.round(b.x), y: Math.round(b.y), libre: !!b.libre } : null,
                cosas: this.cosas.map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        },

        paso: function (time) {
            var b = this.burbuja;
            if (!b) return;
            this.dibujarOndas(time, this.sonando);
            if (b.libre && !this.arrastrando) {
                b.fase += 0.016;
                b.y = this.L.casa.y + Math.sin(time / 600) * 8;
                b.x = this.L.casa.x + Math.sin(time / 1100) * 10;
            }
        }
    };

    K.crear({ id: 'burbuja', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
