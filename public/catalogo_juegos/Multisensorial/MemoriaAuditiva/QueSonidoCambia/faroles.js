/**
 * «El desfile de linternas» — motor propio de ¿Qué sonido cambia? (5-6 años).
 * De noche pasa un desfile de faroles; cada farol brilla cuando suena su sonido (no se ve qué es).
 * Pasa otra vez y falta uno. En la guirnalda cuelgan los faroles apagados con su dibujo y el niño
 * ENCIENDE EL DEL PERDIDO tocándolo y MANTENIENDO el dedo hasta que se llena de luz. Si no es,
 * el farol parpadea y se apaga.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0xffa94d, 0xffd43b, 0x69db7c, 0x74c0fc, 0xb197fc];
    var MANTENER = 900;   // ms que hay que mantener el dedo

    var escena = {
        iniciar: function () { this.faroles = []; this.desfile = []; this.reunidos = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            L.der = L.pres ? W - 150 : W - 16;
            L.calle = Math.round(H * 0.7);
            L.guirnalda = Math.max(L.bocina.y + L.bocina.r + 46, H * 0.27);
            L.paso = L.calle - Math.min(80, H * 0.09);
            L.tam = Math.max(56, Math.min(110, (L.der - 30) / 5.6, H * 0.13));
            L.bocina = { x: 48, y: L.guirnalda + 10, r: 24 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'faroles_noche', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, L.calle);
                g.addColorStop(0, '#0b1a3a'); g.addColorStop(1, '#364fc7');
                x.fillStyle = g; x.fillRect(0, 0, w, L.calle);
                // Casitas en silueta con ventanas encendidas.
                var cx = 0, k = 0;
                while (cx < w) {
                    var cw = 60 + ((k * 37) % 50), ch = 70 + ((k * 53) % 70);
                    x.fillStyle = '#1b2547'; x.fillRect(cx, L.calle - ch, cw, ch);
                    x.beginPath(); x.moveTo(cx - 4, L.calle - ch); x.lineTo(cx + cw / 2, L.calle - ch - 26); x.lineTo(cx + cw + 4, L.calle - ch); x.fill();
                    x.fillStyle = 'rgba(255,224,102,0.8)';
                    for (var v = 0; v < 2; v++) x.fillRect(cx + 10 + v * (cw - 34), L.calle - ch + 18, 14, 16);
                    cx += cw + 6; k++;
                }
                // Calle empedrada.
                x.fillStyle = '#495057'; x.fillRect(0, L.calle, w, h - L.calle);
                x.fillStyle = 'rgba(255,255,255,0.08)';
                for (var py = L.calle + 10; py < h; py += 22) for (var px = (py / 22 % 2) * 20; px < w; px += 40) { x.beginPath(); x.ellipse(px, py, 16, 8, 0, 0, Math.PI * 2); x.fill(); }
            });
            keep(this.add.image(0, 0, 'faroles_noche').setOrigin(0, 0).setDepth(0));
            keep(this.add.circle(L.W * 0.84, 78, 32, 0xfff3bf).setDepth(1));
            keep(this.add.circle(L.W * 0.84 + 12, 70, 26, 0x12244e).setDepth(1));
            keep(K.nino(this, 70, L.calle + 4, 12, { ropa: 0xffd43b, pelo: 0x212529, esc: 1.75 }));
            this.sembrarMotes(keep, 14, { x: 0, y: 10, w: L.W, h: L.guirnalda, depth: 4 }, 0xffe066);
            var V = this.montarVida(keep);
            if (V) V.estrellas({ x: 0, y: 0, w: L.W, h: L.guirnalda - 30, depth: 1 }, 18);
            // Cuerda de la guirnalda.
            var c = keep(this.add.graphics().setDepth(5));
            c.lineStyle(3, 0xadb5bd, 0.9);
            c.beginPath(); c.moveTo(0, L.guirnalda - 30);
            for (var t = 0; t <= 1; t += 0.05) c.lineTo(L.der * t, L.guirnalda - 30 + Math.sin(t * Math.PI) * 26);
            c.lineTo(L.W, L.guirnalda - 30); c.strokePath();
            this.montarHud(keep);
            if (reubicar && this.nv && this.faroles.length) this.colgar(this.faroles.map(function (f) { return f.id; }), true);
        },

        /** Un farol de papel (apagado o encendido) con su dibujo adentro. */
        crearFarol: function (id, x, y, tam, color) {
            var c = this.add.container(x, y).setDepth(20);
            var halo = this.add.circle(0, 0, tam * 0.85, 0xffe066, 0);
            var cuerpo = this.add.ellipse(0, 0, tam * 0.9, tam * 1.1, color, 0.35).setStrokeStyle(3, color, 0.9);
            var tapa = this.add.rectangle(0, -tam * 0.56, tam * 0.4, tam * 0.1, 0x343a40);
            var base = this.add.rectangle(0, tam * 0.56, tam * 0.4, tam * 0.1, 0x343a40);
            var hilo = this.add.rectangle(0, -tam * 0.85, 2, tam * 0.5, 0xadb5bd);
            c.add([halo, hilo, cuerpo, tapa, base]);
            var img = null;
            if (id) {
                img = this.add.image(0, 0, 'el_' + id);
                img.setScale(tam * 0.62 / Math.max(img.width, img.height)).setAlpha(0.55);
                c.add(img);
            }
            var anillo = this.add.graphics();
            c.add(anillo);
            return { id: id, cont: c, halo: halo, cuerpo: cuerpo, img: img, anillo: anillo, tam: tam, color: color, encendido: false };
        },

        encender: function (f, si) {
            f.encendido = si;
            this.tweens.add({ targets: f.halo, fillAlpha: si ? 0.45 : 0, duration: 250 });
            f.cuerpo.setFillStyle(f.color, si ? 0.95 : 0.35);
            if (f.img) f.img.setAlpha(si ? 1 : 0.55);
        },

        /* ── El desfile ── */

        pasarDesfile: async function (n) {
            var L = this.L;
            this.desfile.forEach(function (f) { f.cont.destroy(); });
            var self = this;
            var sep = Math.min(L.tam * 1.25, (L.der - 20) / (n + 0.5));
            this.desfile = [];
            for (var i = 0; i < n; i++) {
                var f = this.crearFarol(null, -sep * (i + 1), L.paso, L.tam * 0.75, COLORES[i % COLORES.length]);
                f.cont.setDepth(15);
                this.desfile.push(f);
            }
            var total = (L.der - 20) * 0.5 + sep * (n + 1) / 2 + sep;
            await Promise.all(this.desfile.map(function (f, i) {
                return tw(self, { targets: f.cont, x: f.cont.x + total, duration: 1500, ease: 'Sine.easeOut' });
            }));
        },

        salirDesfile: async function () {
            var self = this;
            var L = this.L;
            await Promise.all(this.desfile.map(function (f) { return tw(self, { targets: f.cont, x: f.cont.x + L.W, duration: 1300, ease: 'Sine.easeIn' }); }));
            this.desfile.forEach(function (f) { f.cont.destroy(); });
            this.desfile = [];
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await Promise.all(this.faroles.map(function (f) { return tw(self, { targets: f.cont, alpha: 0, duration: 250 }).then(function () { f.cont.destroy(); }); }));
            this.faroles = [];
            await this.pasarDesfile(nv.reproducciones[0].length);
        },

        /** El farol k del desfile brilla mientras suena (el primero que suena es el de adelante). */
        alSonar: function (id, k) {
            var self = this;
            var f = this.desfile[k];
            if (!f) return;
            this.encender(f, true);
            this.tweens.add({ targets: f.cont, y: f.cont.y - 12, duration: 160, yoyo: true });
            this.time.delayedCall(700, function () { if (f.cont.active) self.encender(f, false); });
        },

        alTerminarVuelta: async function (v) { if (v === 0) await this.salirDesfile(); },

        alSegundaVuelta: async function () { await this.pasarDesfile(this.nv.reproducciones[1].length); },

        /** Faroles apagados en la guirnalda, cada uno con el dibujo de un candidato. */
        colgar: function (ids, ya) {
            var self = this;
            var L = this.L;
            this.faroles.forEach(function (f) { f.cont.destroy(); });
            var n = ids.length;
            var tam = Math.min(L.tam, (L.der - 30) / n * 0.82);
            this.faroles = ids.map(function (id, i) {
                var t = (i + 0.5) / n;
                var x = 15 + (L.der - 30) * t;
                var y = L.guirnalda - 30 + Math.sin(t * Math.PI) * 26 + tam * 0.95;
                var f = self.crearFarol(id, x, y, tam, COLORES[i % COLORES.length]);
                f.cont.setScale(ya ? 1 : 0);
                return f;
            });
        },

        mostrarOpciones: async function (nv) {
            await this.salirDesfile();
            this.colgar(nv.opciones, false);
            for (var i = 0; i < this.faroles.length; i++) {
                K.ruido({ f: 1500, q: 1, dur: 0.06, vol: 0.05 });
                this.tweens.add({ targets: this.faroles[i].cont, scale: 1, duration: 320, ease: 'Back.easeOut' });
                this.tweens.add({ targets: this.faroles[i].cont, angle: { from: -6, to: 6 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                await esperar(this, 120);
            }
        },

        farolEn: function (x, y) {
            return this.faroles.filter(function (f) { return !f.encendido && Math.hypot(x - f.cont.x, y - f.cont.y) < f.tam * 0.65; })[0];
        },

        /* ── Gesto: tocar y mantener ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var f = this.farolEn(p.x, p.y);
            if (!f) return;
            this.arrastrando = { f: f, t0: this.time.now, x: p.x, y: p.y };
            this.pista.reiniciar();
        },
        alMover: function (p) {
            var r = this.arrastrando;
            if (r && Math.hypot(p.x - r.x, p.y - r.y) > r.f.tam * 0.7) this.cancelarMantener();
        },
        alSoltar: function () { if (this.arrastrando) this.cancelarMantener(); },

        cancelarMantener: function () {
            var r = this.arrastrando;
            this.arrastrando = null;
            if (r) r.f.anillo.clear();
        },

        listoMantener: async function (f) {
            this.arrastrando = null;
            f.anillo.clear();
            this.tocado = f;
            this.encender(f, true);
            K.tono({ f: 900, f2: 1400, dur: 0.2, vol: 0.05 });
            var ok = await this.elegir(f.id, { x: f.cont.x, y: f.cont.y });
            if (ok === false) {
                // Parpadea y se apaga.
                for (var k = 0; k < 3; k++) { this.encender(f, k % 2 === 1); await esperar(this, 120); }
                this.encender(f, false);
            }
        },

        alAcertar: async function () {
            var self = this;
            var f = this.tocado;
            var L = this.L;
            this.reunidos.push(f.id);
            await Promise.all([this.sonar(f.id, { breve: true, bocina: false }), tw(this, { targets: f.cont, scale: 1.25, duration: 200, yoyo: true })]);
            // Vuelve el desfile completo: el perdido en su lugar y la secuencia entera.
            var seq = this.nv.reproducciones[0];
            await this.pasarDesfile(seq.length);
            for (var k = 0; k < seq.length; k++) {
                this.alSonar(seq[k], k);
                if (seq[k] === f.id) Ut.estallido(this, this.desfile[k].cont.x, this.desfile[k].cont.y, { n: 8, tex: 'estrella', tam: 22, dist: 70, sinTinte: true, depth: 30 });
                await this.sonar(seq[k], { breve: true, bocina: false });
            }
            await this.salirDesfile();
        },

        alFallar: async function () {},

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            var f = this.faroles.filter(function (q) { return self.respuestas().indexOf(q.id) >= 0; })[0];
            return f ? this.ctx.mano({ punto: { x: f.cont.x, y: f.cont.y }, holdMs: MANTENER, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } }) : Promise.resolve();
        },

        /* ── Escena final: los faroles suben al cielo ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            this.colgar(ids, true);
            for (var i = 0; i < this.faroles.length; i++) {
                var f = this.faroles[i];
                this.encender(f, true);
                this.sonar(f.id, { breve: true, bocina: false });
                this.tweens.add({ targets: f.cont, y: -f.tam * 2, x: f.cont.x + Ut.rnd(-30, 30), duration: 3600, ease: 'Sine.easeIn' });
                this.tweens.add({ targets: f.cont, angle: { from: -8, to: 8 }, duration: 700, yoyo: true, repeat: -1 });
                await esperar(this, 520);
                if (!this.sigue()) return;
            }
            await esperar(this, 2200);
        },

        /** Demo: la mano se queda apretando el farol del que se perdió hasta encenderlo. */
        demoPaso: function () {
            var self = this;
            var r = this.respuestas();
            var f = this.faroles.filter(function (q) { return r.indexOf(q.id) >= 0; })[0];
            if (!f) return null;
            return { desde: { x: f.cont.x, y: f.cont.y }, mantener: MANTENER, hacer: function () { return self.listoMantener(f); } };
        },

        estadoExtra: function () {
            return { faroles: this.faroles.map(function (f) { return { id: f.id, x: Math.round(f.cont.x), y: Math.round(f.cont.y), encendido: f.encendido }; }) };
        },

        paso: function (time) {
            (this.faroles || []).forEach(function (f, i) {
                if (!f.cont || !f.cont.active || (this.arrastrando && this.arrastrando.f === f)) return;
                f.cont.angle = Math.sin(time / 600 + i) * 4;
            }, this);
            (this.desfile || []).forEach(function (f, i) {
                if (!f || !f.cont || !f.cont.active) return;
                f.cont.angle = Math.sin(time / 400 + i) * 3;
            });
            var r = this.arrastrando;
            if (!r || this.fase !== 'jugar') return;
            var k = Math.min(1, (time - r.t0) / MANTENER);
            var g = r.f.anillo;
            g.clear();
            g.lineStyle(6, 0xffe066, 1);
            g.beginPath(); g.arc(0, 0, r.f.tam * 0.62, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
            r.f.halo.setFillStyle(0xffe066, k * 0.4);
            if (k >= 1) this.listoMantener(r.f);
        }
    };

    K.crear({ id: 'faroles', fondo: '#0b1a3a', escena: escena });
})(typeof window !== 'undefined' ? window : this);
