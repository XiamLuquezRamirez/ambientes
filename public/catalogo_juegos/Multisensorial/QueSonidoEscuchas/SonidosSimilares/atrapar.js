/**
 * «Atrapa el sonido» — motor propio de Sonidos Similares (5-6 años, ¿Qué sonido escuchas?).
 *
 * En el huerto llueven objetos con paracaídas. Suena un sonido y el niño desliza una canasta de un
 * lado a otro para atrapar SOLO el objeto que lo produjo (campana, triángulo y tambor suenan
 * parecido: hay que escuchar bien). Si atrapa otro, el objeto suena con su propio sonido y rebota
 * fuera (sin castigo); los que caen al suelo rebotan y se desvanecen. La lluvia cae más rápido en
 * cada nivel. Con la bocina se vuelve a escuchar el sonido.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var mezclar = Ut.mezclar;

    var OBJETOS = ['campana', 'triangulo', 'tambor', 'pelota', 'carro', 'trompeta', 'gaita', 'botella', 'reloj'];
    var COLS = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8];

    var escena = {
        iniciar: function () {
            this.items = [];
            this.reunidos = [];
            this.canasta = null;
            this.meta = null;
            this.auto = null;
            this.sigS = 0;
            this.ciclo = [];
            this.llueve = false;
            this.cosas = [];
        },

        filtrarPool: function (pool) {
            var f = pool.filter(function (id) { return OBJETOS.indexOf(id) >= 0; });
            return f.length >= 5 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horizonte = Math.round(H * 0.44);
            L.suelo = Math.round(H * 0.86);
            L.tam = Math.max(80, Math.min(112, (L.der - 100) / 6, H * 0.15));
            L.cestoY = L.suelo - 24;
            L.cestoW = Math.max(120, Math.min(190, L.tam * 1.6));
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.horizonte, arboles: [0.06, 0.22, 0.5, 0.78, 0.94], solX: 0.14 });
                V.mariposas(2, { x: 0, y: L.horizonte, w: L.W, h: L.H * 0.3, depth: 8 });
            }
            var pasto = keep(this.add.graphics().setDepth(1.5));
            pasto.fillStyle(0x8ce99a, 1); pasto.fillRect(0, L.horizonte, L.W, L.H - L.horizonte);
            pasto.fillStyle(0x69db7c, 1); pasto.fillRect(0, L.horizonte, L.W, 8);
            pasto.fillStyle(0xe6c98f, 1); pasto.fillRect(0, L.suelo - 6, L.W, L.H - L.suelo + 6);
            this.lluviaG = keep(this.add.graphics().setDepth(26));
            // Canasta (fondo y frente, para que lo atrapado quede «dentro»).
            var c = keep(this.add.container(L.der / 2, L.cestoY).setDepth(36));
            var w = L.cestoW, h = w * 0.55;
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.18); g.fillEllipse(0, h * 0.55, w * 1.0, h * 0.25);
            g.fillStyle(0xc58b4f, 1); g.fillRoundedRect(-w / 2, -h * 0.35, w, h, 16);
            g.lineStyle(3, 0x8a5524, 0.8);
            for (var i = -3; i <= 3; i++) g.lineBetween(i * w * 0.14, -h * 0.3, i * w * 0.14 * 0.8, h * 0.6);
            for (var j = 0; j < 3; j++) g.lineBetween(-w * 0.48, -h * 0.1 + j * h * 0.3, w * 0.48, -h * 0.1 + j * h * 0.3);
            g.fillStyle(0xa9702f, 1); g.fillRoundedRect(-w / 2 - 6, -h * 0.42, w + 12, h * 0.18, 8);
            c.add(g);
            this.canasta = c;
            this.canasta.x = this.canasta.x || L.der / 2;
            this.montarHud(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: L.horizonte, w: L.W, h: L.suelo - L.horizonte, depth: 8 }, 0xfff3bf);
        },

        /* ── Cosas que caen ── */

        mostrarOpciones: async function (nv) {
            this.opcionesNv = nv.opciones.slice();
            this.ciclo = [];
            this.cosas = [];
            this.llueve = true;
            this.sigS = this.time.now + 400;
            this.v = 170 + (this.nivelActual || 0) * 55;
            this.intervalo = 1000 - (this.nivelActual || 0) * 110;
            this.cosas = [{ activo: true }];
            await esperar(this, 500);
        },

        siguienteId: function () {
            if (!this.ciclo.length) {
                // Cada ciclo mezcla todas las opciones; la correcta sale siempre.
                this.ciclo = mezclar(this.opcionesNv.slice());
            }
            return this.ciclo.pop();
        },

        soltarItem: function (id) {
            var L = this.L;
            var tam = Math.min(L.tam, 100);
            var x = 90 + Math.random() * (L.der - 180);
            var a = this.crearCosa(id, x, -tam, tam * 0.66, { depth: 30, sinSombra: true });
            var g = this.add.graphics();
            var col = COLS[Math.floor(Math.random() * COLS.length)];
            g.fillStyle(col, 1); g.slice(0, -tam * 0.62, tam * 0.5, Math.PI, Math.PI * 2, false); g.fillPath();
            g.fillStyle(0xffffff, 0.3); g.slice(-tam * 0.1, -tam * 0.64, tam * 0.2, Math.PI, Math.PI * 2, false); g.fillPath();
            g.lineStyle(2, 0xffffff, 0.8);
            g.lineBetween(-tam * 0.5, -tam * 0.62, -tam * 0.1, -tam * 0.12); g.lineBetween(tam * 0.5, -tam * 0.62, tam * 0.1, -tam * 0.12); g.lineBetween(0, -tam * 0.62, 0, -tam * 0.12);
            var fondo = this.add.graphics();
            fondo.fillStyle(0xffffff, 0.9); fondo.fillCircle(0, 0, tam * 0.38); fondo.lineStyle(3, col, 1); fondo.strokeCircle(0, 0, tam * 0.38);
            a.cont.addAt(g, 0); a.cont.addAt(fondo, 1);
            a.tam = tam; a.x0 = x; a.fase2 = Math.random() * 6; a.cae = true;
            this.items.push(a);
        },

        /* ── La canasta ── */

        alTocar: function (p) { this.meta = p.x; this.pista.reiniciar(); },
        alMover: function (p) { this.meta = p.x; },

        recoger: async function (a) {
            if (!a.cae) return;
            a.cae = false;
            var L = this.L, c = this.canasta;
            this.pista.reiniciar();
            await tw(this, { targets: a.cont, x: c.x, y: c.y - 10, scale: 0.55, duration: 160 });
            a.cont.setDepth(34);
            this.tweens.add({ targets: c, scaleY: 0.88, duration: 90, yoyo: true });
            K.ruido({ f: 800, q: 1, dur: 0.08, vol: 0.08 });
            this.actual = a;
            var ok = await this.elegir(a.id, { x: c.x, y: c.y });
            if (ok === false) {
                // rebota hacia afuera y se desvanece
                await tw(this, { targets: a.cont, x: a.cont.x + (Math.random() < 0.5 ? -1 : 1) * 160, y: c.y - 160, scale: 1, alpha: 0, duration: 520, ease: 'Quad.easeOut' });
                this.quitar(a);
            }
        },

        quitar: function (a) {
            var i = this.items.indexOf(a);
            if (i >= 0) this.items.splice(i, 1);
            if (a.cont.active) a.cont.destroy();
        },

        alAcertar: async function () {
            var a = this.actual;
            this.llueve = false;
            if (!a) return;
            this.reunidos.push(a.id);
            var c = this.canasta;
            a.cont.setDepth(40).setScale(1);
            Ut.estallido(this, c.x, c.y - 30, { n: 16, tex: 'estrella', tam: 28, dist: 150, depth: 70, sinTinte: true });
            await tw(this, { targets: a.cont, y: c.y - 120, duration: 300, ease: 'Back.easeOut' });
            a.saltito(0.3, 2);
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var c = this.canasta;
            await tw(this, { targets: c, angle: { from: -6, to: 6 }, duration: 80, yoyo: true, repeat: 2 });
            c.angle = 0;
        },

        alTerminarNivel: async function () {
            var self = this;
            this.llueve = false;
            var restos = this.items.slice();
            restos.forEach(function (a) { self.tweens.add({ targets: a.cont, alpha: 0, duration: 250, onComplete: function () { self.quitar(a); } }); });
            await esperar(this, 300);
            this.items = [];
            this.cosas = [];
        },

        prepararNivel: async function () {
            this.items.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.items = [];
            this.cosas = [];
            this.llueve = false;
            this.meta = null;
        },

        alSonar: function () {
            Ut.estallido(this, this.L.W * 0.5, this.L.H * 0.1, { n: 3, tex: 'nota', tam: 24, dist: 90, depth: 70 });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var r = this.respuestas()[0];
            var a = this.items.filter(function (q) { return q.cae && q.id === r && q.cont.y > 0; })[0];
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            var c = this.canasta;
            return this.ctx.mano({ punto: { x: c.x, y: c.y }, holdMs: 200, arrastre: { dx: a.cont.x - c.x, dy: 0, durMs: 800 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var c = this.canasta;
            return {
                desde: { x: c.x, y: c.y }, hasta: { x: c.x + 120, y: c.y },
                hacer: async function () {
                    self.auto = self.respuestas()[0];
                    var t0 = self.time.now;
                    while (self.fase === 'jugar' && self.time.now - t0 < 12000) await esperar(self, 120);
                    self.auto = null;
                }
            };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.llueve = false;
            this.items.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.items = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['campana', 'triangulo', 'tambor'];
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var x = 90 + (L.der - 180) * (i + 0.5) / ids.length;
                this.meta = x;
                await esperar(this, 500);
                var a = this.crearCosa(ids[i], x, -80, L.tam * 0.7, { depth: 30 });
                await tw(this, { targets: a.cont, y: this.canasta.y - 20, duration: 600, ease: 'Quad.easeIn' });
                K.ruido({ f: 800, q: 1, dur: 0.08, vol: 0.08 });
                Ut.estallido(this, x, this.canasta.y - 40, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
                a.cont.destroy();
            }
            Ut.confeti(this, 90);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            var c = this.canasta;
            return {
                canasta: c ? { x: Math.round(c.x), y: Math.round(c.y) } : null,
                cosas: this.items.filter(function (a) { return a.cae && a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        },

        paso: function (time, delta) {
            var L = this.L, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            var c = this.canasta;
            if (!c || !c.active) return;
            // La canasta sigue al dedo (o a un objeto en la demo).
            var obj = c.x;
            if (this.auto) {
                var q = this.items.filter(function (a) { return a.cae && a.id === self.auto && a.cont.y > 0; })[0];
                if (q) obj = q.cont.x;
            } else if (this.meta != null) obj = this.meta;
            obj = Math.max(L.cestoW / 2, Math.min(L.der - L.cestoW / 2, obj));
            c.x += (obj - c.x) * Math.min(1, dt * 12);
            // Nuevos objetos.
            if (this.llueve && this.fase === 'jugar' && time > this.sigS) {
                this.sigS = time + this.intervalo;
                this.soltarItem(this.siguienteId());
            }
            // Caída, balanceo y atrapada.
            this.items.slice().forEach(function (a) {
                if (!a.cae || !a.cont.active) return;
                a.cont.y += self.v * dt;
                a.cont.x = a.x0 + Math.sin(time / 600 + a.fase2) * 18;
                a.cont.angle = Math.sin(time / 600 + a.fase2) * 6;
                if (self.fase !== 'jugar') return;
                if (a.cont.y > c.y - L.tam * 0.45 && a.cont.y < c.y + 20 && Math.abs(a.cont.x - c.x) < L.cestoW * 0.55) self.recoger(a);
                else if (a.cont.y > L.suelo - 10) {
                    a.cae = false;
                    self.tweens.add({ targets: a.cont, y: a.cont.y - 40, duration: 180, yoyo: true });
                    self.tweens.add({ targets: a.cont, alpha: 0, delay: 350, duration: 300, onComplete: function () { self.quitar(a); } });
                }
            });
            // Gotitas decorativas.
            var g = this.lluviaG; g.clear();
            if (this.llueve) { g.fillStyle(0xffffff, 0.35); for (var i = 0; i < 14; i++) g.fillCircle(((i * 131) + time * 0.02 * (i % 3 + 1)) % L.W, ((i * 71) + time * 0.25) % L.suelo, 2); }
        }
    };

    K.crear({ id: 'atrapar', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
