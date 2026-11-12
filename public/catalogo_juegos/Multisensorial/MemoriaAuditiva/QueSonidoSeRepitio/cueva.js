/**
 * «La cueva del eco» — motor propio de ¿Qué sonido se repitió? (3-4 años).
 * Los sonidos entran a la cueva como sombras (no se ve qué son) y la cueva hace eco. Después
 * los que entraron salen a pasear por el prado y el niño ATRAPA CON LA RED al que sonó dos veces
 * (toca al que pasea: la red balancea y baja sobre él). Si no es, la red falla, el otro suena y se escapa.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var rnd = Ut.rnd;

    function dibujarRed(g, r) {
        var palo = r * 1.85;
        g.lineStyle(Math.max(5, r * 0.09), 0x8c5a2b, 1);
        g.lineBetween(0, -palo, 0, -r * 0.55);
        g.fillStyle(0x6d4c41, 1);
        g.fillRoundedRect(-r * 0.14, -palo - r * 0.12, r * 0.28, r * 0.22, 4);
        g.lineStyle(Math.max(4, r * 0.07), 0x5c3d2e, 1);
        g.strokeEllipse(0, 0, r * 1.95, r * 0.78);
        g.lineStyle(1.5, 0xf1f3f5, 0.92);
        var paso = r * 0.22;
        for (var k = -4; k <= 4; k++) {
            g.lineBetween(k * paso, -r * 0.35, k * paso * 0.55, r * 0.95);
        }
        for (var j = -2; j <= 2; j++) {
            g.strokeEllipse(0, j * r * 0.18, r * (1.75 - Math.abs(j) * 0.22), r * 0.32);
        }
        g.lineStyle(3, 0xffe066, 0.35);
        g.strokeEllipse(0, 0, r * 1.35, r * 0.52);
    }

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.red = null;
            this.apuntado = null;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 760 ? { x: W - 78, piso: H - 104, alto: Math.min(170, H * 0.3), modelo: 'nina' } : null;
            L.der = L.pres ? W - 160 : W - 16;
            L.y0 = Math.round(H * 0.48);
            L.tam = Math.max(64, Math.min(130, (L.der - 20) / 4.6, H * 0.17));
            var cw = Math.min(L.der * 0.5, 300, H * 0.3);
            L.cueva = { x: L.der / 2 + 8, y: L.y0 + 10, w: cw, h: cw * 0.7 };
            L.prado = { x0: 20 + L.tam * 0.5, x1: L.der - L.tam * 0.5, y0: L.y0 + (H - L.y0) * 0.38, y1: H - L.tam * 0.55 };
            L.ninoPt = { x: Math.round(W * 0.11), y: L.y0 + (H - L.y0) * 0.32 };
            L.bocina = { x: Math.max(52, L.ninoPt.x + 38), y: L.ninoPt.y - 48, r: Math.max(24, Math.min(30, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var self = this;
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.y0, arboles: [0.04, 0.14, 0.78, 0.94], solX: 0.12 });
                V.mariposas(3, { x: L.prado.x0, y: L.prado.y0 - 30, w: L.der - L.prado.x0, h: 80, depth: 8 });
            }
            K.textura(this, 'cueva_cielo', L.W, L.y0 + 4, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#74c0fc');
                g.addColorStop(0.55, '#a5d8ff');
                g.addColorStop(1, '#d0ebff');
                x.fillStyle = g;
                x.fillRect(0, 0, w, h);
                x.fillStyle = 'rgba(255,255,255,0.45)';
                for (var i = 0; i < 5; i++) {
                    var cx = w * (0.1 + i * 0.19), cy = h * (0.12 + (i % 3) * 0.08);
                    x.beginPath();
                    x.arc(cx, cy, 18 + i * 4, 0, Math.PI * 2);
                    x.arc(cx + 26, cy + 4, 14 + i * 2, 0, Math.PI * 2);
                    x.arc(cx - 20, cy + 6, 12, 0, Math.PI * 2);
                    x.fill();
                }
            });
            keep(this.add.image(0, 0, 'cueva_cielo').setOrigin(0, 0).setDepth(1));
            this.sembrarMotes(keep, 16, { x: L.cueva.x - L.cueva.w * 0.35, y: L.cueva.y - L.cueva.h * 1.1, w: L.cueva.w * 0.7, h: L.cueva.h * 0.55, depth: 9 }, 0xe7f5ff);
            var C = L.cueva;
            K.textura(this, 'cueva_cerro', C.w * 2.05, C.h * 1.55, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#868e96');
                g.addColorStop(0.45, '#6c757d');
                g.addColorStop(1, '#495057');
                x.fillStyle = g;
                x.beginPath();
                x.moveTo(0, h);
                x.quadraticCurveTo(w * 0.08, h * 0.12, w * 0.5, h * 0.04);
                x.quadraticCurveTo(w * 0.92, h * 0.14, w, h);
                x.closePath();
                x.fill();
                K.grano(x, 0, 0, w, h, Math.round(w * h / 220), ['#868e96', '#ced4da', '#343a40'], 2.6, 0.42);
                x.fillStyle = '#51cf66';
                x.beginPath();
                x.ellipse(w * 0.5, h * 0.07, w * 0.26, h * 0.07, 0, 0, Math.PI * 2);
                x.fill();
                x.fillStyle = '#2b8a3e';
                for (var m = 0; m < 8; m++) {
                    x.beginPath();
                    x.ellipse(w * (0.22 + m * 0.08), h * 0.09, 8, 5, 0, 0, Math.PI * 2);
                    x.fill();
                }
                // Estalactitas en el borde.
                x.fillStyle = '#adb5bd';
                for (var s = 0; s < 5; s++) {
                    var sx = w * (0.35 + s * 0.08);
                    x.beginPath();
                    x.moveTo(sx - 5, h * 0.22);
                    x.lineTo(sx + 5, h * 0.22);
                    x.lineTo(sx, h * 0.22 + 16 + s * 3);
                    x.closePath();
                    x.fill();
                }
                var bx = w / 2, by = h, bw = w * 0.24, bh = h * 0.64;
                var gb = x.createRadialGradient(bx, by - bh * 0.35, 2, bx, by - bh * 0.35, bw * 1.35);
                gb.addColorStop(0, '#000000');
                gb.addColorStop(0.55, '#0d0f12');
                gb.addColorStop(1, '#343a40');
                x.fillStyle = gb;
                x.beginPath();
                x.moveTo(bx - bw, by);
                x.quadraticCurveTo(bx - bw * 1.05, by - bh * 1.22, bx, by - bh * 1.02);
                x.quadraticCurveTo(bx + bw * 1.05, by - bh * 1.22, bx + bw, by);
                x.closePath();
                x.fill();
                x.fillStyle = 'rgba(0,0,0,0.55)';
                x.beginPath();
                x.ellipse(bx, by - bh * 0.15, bw * 0.55, bh * 0.22, 0, 0, Math.PI * 2);
                x.fill();
            });
            this.cerro = keep(this.add.image(C.x, C.y + 8, 'cueva_cerro').setOrigin(0.5, 1).setDepth(3));
            this.antorchas = [-1, 1].map(function (s) {
                var tx = C.x + s * C.w * 0.22, ty = C.y - C.h * 0.44;
                keep(self.add.rectangle(tx, ty + 18, 8, 38, 0x5c3d2e).setDepth(7));
                keep(self.add.rectangle(tx - 5, ty + 32, 18, 5, 0x4e342e).setDepth(7));
                var nucleo = keep(self.add.circle(tx, ty + 2, 5, 0xfff3bf, 0.95).setDepth(9));
                var llama = keep(self.add.circle(tx, ty - 2, 11, 0xff922b, 0.92).setDepth(8));
                return { llama: llama, nucleo: nucleo, baseY: ty };
            });
            K.textura(this, 'cueva_prado', L.W, L.H - L.y0 + 16, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#8ce99a');
                g.addColorStop(0.55, '#51cf66');
                g.addColorStop(1, '#2f9e44');
                x.fillStyle = g;
                x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 260), ['#69db7c', '#b2f2bb', '#37b24d'], 1.8, 0.45);
                // Caminito de tierra.
                var path = x.createLinearGradient(w * 0.3, 0, w * 0.7, h);
                path.addColorStop(0, 'rgba(210,160,110,0)');
                path.addColorStop(0.5, 'rgba(210,160,110,0.45)');
                path.addColorStop(1, 'rgba(210,160,110,0)');
                x.fillStyle = path;
                x.beginPath();
                x.moveTo(w * 0.38, 0);
                x.quadraticCurveTo(w * 0.48, h * 0.5, w * 0.42, h);
                x.lineTo(w * 0.54, h);
                x.quadraticCurveTo(w * 0.58, h * 0.48, w * 0.48, 0);
                x.closePath();
                x.fill();
                var flores = ['#ff6b6b', '#ffd43b', '#da77f2', '#4dabf7'];
                for (var f = 0; f < 28; f++) {
                    var fx = Math.random() * w, fy = Math.random() * h;
                    x.fillStyle = flores[f % flores.length];
                    x.beginPath();
                    x.arc(fx, fy, 3 + (f % 2), 0, Math.PI * 2);
                    x.fill();
                    x.fillStyle = '#2b8a3e';
                    x.fillRect(fx - 0.5, fy, 1, 6);
                }
            });
            this.pradoImg = keep(this.add.image(0, L.y0 - 4, 'cueva_prado').setOrigin(0, 0).setDepth(2));
            var deco = keep(this.add.graphics().setDepth(4));
            var py = L.prado.y1 - 8;
            deco.fillStyle(0x82c91e, 0.85);
            for (var t = 0; t < 18; t++) {
                var tx = L.prado.x0 + (L.prado.x1 - L.prado.x0) * (t / 17);
                deco.fillTriangle(tx, py, tx - 6, py - 14 - (t % 3) * 3, tx + 6, py - 12);
            }
            keep(K.nino(this, L.ninoPt.x, L.ninoPt.y, 11, { ropa: 0x7950f2, pelo: 0x212529, esc: 2.2 }));
            this.ecoG = keep(this.add.graphics().setDepth(6));
            this.miraG = keep(this.add.graphics().setDepth(58));
            this.montarHud(keep);
        },

        pulsoEco: function () {
            var self = this;
            this.eco = this.time.now;
            this.rumble = this.time.now;
            if (!Ut.reducido()) this.cameras.main.shake(120, 0.0025);
            this.antorchas.forEach(function (t, i) {
                self.tweens.add({
                    targets: [t.llama, t.nucleo],
                    scaleX: 1.35, scaleY: 1.35,
                    duration: 120, yoyo: true, delay: i * 40
                });
            });
            if (this.cerro) {
                this.tweens.add({ targets: this.cerro, scaleY: 0.97, duration: 90, yoyo: true });
            }
            K.ruido({ f: 90, q: 2, dur: 0.22, vol: 0.07 });
        },

        /** Mientras suena: una sombra entra a la cueva y la cueva reacciona (sin delatar). */
        alSonar: function () {
            var self = this;
            var C = this.L.cueva;
            var t = this.L.tam * 0.55;
            var sombra = this.add.ellipse(C.x - C.w * 0.95, C.y - t * 0.35, t, t * 0.75, 0x212529, 0.88).setDepth(5);
            this.tweens.add({
                targets: sombra,
                x: C.x,
                scaleX: 0.22,
                scaleY: 0.22,
                alpha: 0,
                duration: 680,
                ease: 'Sine.easeIn',
                onComplete: function () { sombra.destroy(); }
            });
            var polvo = this.add.circle(C.x, C.y - C.h * 0.2, 6, 0xced4da, 0.6).setDepth(5);
            this.tweens.add({
                targets: polvo,
                scaleX: 4, scaleY: 4, alpha: 0, duration: 480, ease: 'Quad.easeOut',
                onComplete: function () { polvo.destroy(); }
            });
            this.pulsoEco();
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.apuntado = null;
        },

        /** Salen de la cueva y pasean por el prado. */
        mostrarOpciones: async function (nv) {
            var self = this;
            var L = this.L, C = L.cueva, Pd = L.prado;
            var n = nv.opciones.length;
            var tam = Math.min(L.tam, (Pd.x1 - Pd.x0) / n);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, C.x, C.y - tam * 0.3, tam, { depth: 30 });
                a.cont.setScale(0.28).setAlpha(0);
                a.vx = (i % 2 ? 1 : -1) * rnd(22, 34) * (self.ayuda ? 0.6 : 1);
                a.base = Pd.y0 + (Pd.y1 - Pd.y0) * ((i + 0.5) / n);
                a.fase = Math.random() * 6;
                return a;
            });
            for (var i = 0; i < n; i++) {
                var a = this.cosas[i];
                K.ruido({ f: 420 + i * 40, q: 1, dur: 0.1, vol: 0.06 });
                this.tweens.add({
                    targets: a.cont, alpha: 1, scale: 1,
                    x: Pd.x0 + (Pd.x1 - Pd.x0) * (i + 0.5) / n,
                    y: a.base,
                    duration: 560, ease: 'Back.easeOut'
                });
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

        alMover: function (p) {
            if (this.fase !== 'jugar' || this.redando || this.sonando) return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.L.tam * 0.82);
            if (a !== this.apuntado) {
                if (this.apuntado && this.apuntado.cont && this.apuntado.cont.active) {
                    this.tweens.add({ targets: this.apuntado.cont, scale: 1, duration: 90 });
                }
                if (a && a.pasea) {
                    this.tweens.add({ targets: a.cont, scale: 1.1, duration: 90 });
                    if (this.time.now - (this.tonoApunt || 0) > 180) {
                        this.tonoApunt = this.time.now;
                        K.tono({ f: 720, f2: 920, dur: 0.04, vol: 0.022 });
                    }
                }
                this.apuntado = a && a.pasea ? a : null;
            }
        },

        impactoRed: function (x, y) {
            Ut.estallido(this, x, y + 8, {
                n: 10, tex: 'gota', tam: 12, dist: 52, angulo: Math.PI / 2, abanico: 1.4,
                colores: [0xd0ebff, 0xfff3bf, 0xffffff], depth: 66
            });
            Ut.estallido(this, x, y + 14, {
                n: 6, tex: 'nota', tam: 10, dist: 38, depth: 65, colores: [0xe9ecef, 0xced4da]
            });
            K.ruido({ f: 240, q: 1.2, dur: 0.14, vol: 0.08 });
        },

        fugir: async function (a) {
            var self = this;
            if (!a || !a.cont) return;
            var dir = a.cont.x < this.L.der / 2 ? 1 : -1;
            a.escapando = true;
            a.pasea = true;
            a.vx = dir * rnd(95, 130);
            this.tweens.add({
                targets: a.cont,
                y: a.cont.y - 22,
                duration: 160, ease: 'Quad.easeOut',
                yoyo: true
            });
            this.tweens.add({
                targets: a.img,
                angle: { from: -12, to: 12 },
                duration: 90,
                yoyo: true,
                repeat: 3
            });
            await tw(this, { targets: a.cont, scale: 1.15, duration: 140, yoyo: true });
            Ut.estallido(this, a.cont.x, a.cont.y, {
                n: 5, tex: 'gota', tam: 8, dist: 36, angulo: -Math.PI / 2, abanico: 0.8,
                colores: [0xe9ecef, 0xfff3bf], depth: 62
            });
            this.time.delayedCall(900, function () {
                if (a.cont && a.cont.active) {
                    a.escapando = false;
                    a.vx = Math.sign(a.vx) * rnd(22, 34);
                }
            });
        },

        lanzarRed: async function (x, y, a) {
            var self = this;
            var L = this.L;
            var r = L.tam * 0.62;
            this.redando = true;
            this.apuntado = null;
            this.miraG.clear();

            var destX = a ? a.cont.x : x;
            var destY = a ? a.cont.y - r * 0.1 : y;
            var lado = destX > L.W / 2 ? -1 : 1;
            var swingX = destX + lado * r * 1.1;
            var swingY = Math.min(destY - r * 2.6, L.prado.y0 - r * 1.2);

            var red = this.add.container(swingX, swingY).setDepth(65).setAngle(-32 * lado);
            var g = this.add.graphics();
            dibujarRed(g, r);
            red.add(g);
            red.mango = r;

            K.ruido({ f: 420, q: 0.8, dur: 0.12, vol: 0.05 });
            if (a) a.pasea = false;

            await tw(this, {
                targets: red,
                x: destX + lado * r * 0.15,
                angle: 8 * lado,
                duration: 280,
                ease: 'Sine.easeOut'
            });
            await tw(this, {
                targets: red,
                x: destX,
                y: destY,
                angle: 4 * lado,
                duration: 200,
                ease: 'Quad.easeIn'
            });

            this.impactoRed(destX, destY);
            this.red = red;

            if (!a) {
                await tw(this, { targets: red, alpha: 0, y: destY + 40, angle: 18 * lado, duration: 280 });
                red.destroy();
                this.red = null;
                this.redando = false;
                return;
            }

            this.tocado = a;
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y - a.tam * 0.3 });
            if (ok === false) {
                await tw(this, { targets: red, alpha: 0, y: destY + 24, duration: 220 });
                red.destroy();
                this.red = null;
                await this.fugir(a);
            }
            this.redando = false;
        },

        alAcertar: async function (ids) {
            var a = this.tocado;
            var red = this.red;
            if (red) {
                this.tweens.add({ targets: red, scaleY: 1.12, angle: 0, duration: 140, yoyo: true });
            }
            this.reunidos.push(a.id);
            for (var k = 0; k < 2; k++) {
                await Promise.all([this.sonar(a.id, { breve: true, bocina: false }), a.saltito(0.18, 1)]);
                await esperar(this, 150);
            }
        },

        alFallar: async function () {
            if (this.tocado) {
                await this.tocado.sacudir();
            }
        },

        alTerminarNivel: async function () {
            if (this.red) { this.red.destroy(); this.red = null; }
            var C = this.L.cueva;
            var self = this;
            await Promise.all(this.cosas.map(function (a, i) {
                a.pasea = false;
                return esperar(self, i * 90).then(function () {
                    return tw(self, {
                        targets: a.cont, x: C.x, y: C.y - a.tam * 0.3, scale: 0.3, alpha: 0,
                        duration: 500, ease: 'Sine.easeIn'
                    });
                }).then(function () { a.destruir(); });
            }));
            this.cosas = [];
            this.apuntado = null;
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            var ok = this.cosas.filter(function (c) { return self.respuestas().indexOf(c.id) >= 0; })[0];
            if (!ok) return Promise.resolve();
            ok.pasea = false;
            this.time.delayedCall(2500, function () { ok.pasea = true; });
            return this.ctx.mano({
                punto: { x: ok.cont.x, y: ok.cont.y },
                holdMs: 500,
                cancelado: function () { return cancelada() || self.fase !== 'jugar'; }
            });
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
                this.pulsoEco();
                await this.sonar(ids[i], { breve: true, bocina: false });
                await esperar(this, 120);
                this.pulsoEco();
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
            var self = this;
            if (this.antorchas) {
                this.antorchas.forEach(function (t, i) {
                    var w = Math.sin(time / 85 + i * 1.3) * 0.18 + 1;
                    t.llama.setScale(w, w * 1.05);
                    t.llama.setAlpha(0.78 + Math.sin(time / 65 + i * 2) * 0.22);
                    t.nucleo.setAlpha(0.85 + Math.sin(time / 50 + i) * 0.15);
                    t.llama.y = t.baseY - 2 + Math.sin(time / 110 + i) * 1.5;
                });
            }
            var L = this.L, Pd = L.prado, C = L.cueva;
            var rumbleY = 0;
            if (this.rumble && time - this.rumble < 420) {
                var f = 1 - (time - this.rumble) / 420;
                rumbleY = Math.sin(time / 28) * 3.5 * f;
            }
            if (this.pradoImg) this.pradoImg.y = L.y0 - 4 + rumbleY;
            if (this.cerro) this.cerro.y = C.y + 8 + rumbleY * 0.6;

            var g = this.ecoG;
            g.clear();
            if (this.eco && time - this.eco < 1600) {
                for (var k = 0; k < 4; k++) {
                    var p = ((time - this.eco) / 1600 + k * 0.18);
                    if (p > 1) continue;
                    g.lineStyle(5 - k * 0.6, 0xfff3bf, 0.55 * (1 - p));
                    g.beginPath();
                    g.arc(C.x, C.y - C.h * 0.28, C.w * (0.15 + p * 0.72), Math.PI * 1.08, Math.PI * 1.92);
                    g.strokePath();
                    g.lineStyle(2, 0xffffff, 0.35 * (1 - p));
                    g.beginPath();
                    g.arc(C.x, C.y - C.h * 0.28, C.w * (0.1 + p * 0.5), Math.PI * 1.12, Math.PI * 1.88);
                    g.strokePath();
                }
            }

            this.miraG.clear();
            if (this.apuntado && this.apuntado.pasea && this.apuntado.cont.active && !this.redando) {
                var ax = this.apuntado.cont.x;
                var ay = this.apuntado.cont.y - this.apuntado.tam * 0.15;
                var rad = this.apuntado.tam * 0.58 * (0.94 + Math.sin(time / 130) * 0.06);
                this.miraG.lineStyle(3, 0xffe066, 0.88);
                this.miraG.strokeCircle(ax, ay, rad);
                this.miraG.lineStyle(2, 0xffffff, 0.45);
                this.miraG.strokeCircle(ax, ay, rad * 0.72);
                this.miraG.lineStyle(2, 0xffe066, 0.7);
                this.miraG.lineBetween(ax - rad - 4, ay, ax - rad * 0.55, ay);
                this.miraG.lineBetween(ax + rad * 0.55, ay, ax + rad + 4, ay);
                this.miraG.lineBetween(ax, ay - rad - 4, ax, ay - rad * 0.55);
                this.miraG.lineBetween(ax, ay + rad * 0.55, ax, ay + rad + 4);
            }

            var dt = delta / 1000;
            this.cosas.forEach(function (a) {
                if (!a.pasea || !a.cont.active) return;
                a.fase += dt * (a.escapando ? 9 : 6);
                a.cont.x += a.vx * dt;
                if (a.cont.x < Pd.x0) { a.cont.x = Pd.x0; a.vx = Math.abs(a.vx); }
                if (a.cont.x > Pd.x1) { a.cont.x = Pd.x1; a.vx = -Math.abs(a.vx); }
                a.cont.y = a.base - Math.abs(Math.sin(a.fase)) * (a.escapando ? 10 : 6);
                a.img.scaleX = Math.abs(a.img.scaleX) * (a.vx < 0 ? -1 : 1);
            });
        }
    };

    K.crear({ id: 'cueva', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
