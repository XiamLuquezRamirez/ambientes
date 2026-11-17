/**
 * «Las canicas y las palancas» — motor propio de ¿Qué sonido escuchas? (3-4 años).
 *
 * Una pista de canicas con bifurcaciones. Suena un sonido y, cuando aparecen las casitas del fondo
 * (cada una con su imagen), el niño GIRA LAS PALANCAS de las bifurcaciones (tocándolas) para
 * trazar el camino hasta la casita del sonido y luego SUELTA LA CANICA. Si cae en la casita
 * correcta, se abre y sale la fiesta; si cae en otra, suena su sonido y la canica regresa al
 * inicio con las palancas como las dejó (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.juntas = [];
            this.reunidos = [];
            this.marmol = null;
            this.ocupado = false;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.ax = 120; L.aw = L.der - 160;
            L.suelo = Math.round(H * 0.88);
            L.tam = Math.max(80, Math.min(118, L.aw / 4.6, H * 0.16));
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'can_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#ffe8a3'); g.addColorStop(1, '#ffc078');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                // tablero de madera clara con tornillos
                K.madera(x, L.ax - 70, 20, L.aw + 140, h - 40, { claro: '#f3d9a4', medio: '#e6c07a', oscuro: '#d4a655', r: 24 });
                x.fillStyle = 'rgba(120,80,30,0.45)';
                [[L.ax - 50, 40], [L.ax + L.aw + 50, 40], [L.ax - 50, h - 60], [L.ax + L.aw + 50, h - 60]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 7, 0, Math.PI * 2); x.fill(); });
            });
            keep(this.add.image(0, 0, 'can_fondo').setOrigin(0, 0).setDepth(1));
            this.tubosG = keep(this.add.graphics().setDepth(5));
            this.palG = keep(this.add.graphics().setDepth(8));
            this.montarHud(keep);
            if (reubicar && this.cosas.length) this.disponer(this.cosas.length);
        },

        /** Calcula posiciones de casitas y bifurcaciones para n casitas. */
        disponer: function (n) {
            var L = this.L;
            this.hojas = [];
            for (var i = 0; i < n; i++) this.hojas.push({ x: L.ax + L.aw * (i + 0.5) / n, y: L.suelo - L.tam * 0.6 });
            var gap = L.aw / n;
            var y0 = L.H * 0.24, paso = (L.H * 0.4) / Math.max(n - 1, 1);
            this.nodos = [];
            for (var k = 0; k < n - 1; k++) this.nodos.push({ x: this.hojas[k].x + gap / 2, y: y0 + k * paso, dir: this.nodos[k] ? this.nodos[k].dir : 0 });
            this.inicio = { x: this.nodos[0].x, y: y0 - L.tam * 0.7 };
            if (this.juntas.length !== n - 1) this.juntas = this.nodos.map(function () { return Math.random() < 0.5 ? 0 : 1; });
            var self = this;
            this.cosas.forEach(function (a, i) { a.casa = { x: self.hojas[i].x, y: self.hojas[i].y }; if (a.cont.active) a.cont.setPosition(a.casa.x, a.casa.y); });
        },

        /* ── Casitas ── */

        crearCasita: function (id, i, tam) {
            var a = this.crearCosa(id, -300, 0, tam * 0.56, { depth: 30, sinSombra: true });
            var t = tam, col = COLORES[i % COLORES.length];
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.18); g.fillEllipse(0, t * 0.52, t * 1.0, t * 0.16);
            g.fillStyle(col, 1); g.fillRoundedRect(-t * 0.46, -t * 0.34, t * 0.92, t * 0.86, 8);
            g.fillStyle(0xffffff, 1); g.fillCircle(0, -t * 0.02, t * 0.34);
            g.lineStyle(5, 0x7a4e1e, 1); g.strokeCircle(0, -t * 0.02, t * 0.34);
            g.fillStyle(0x7a4e1e, 1); g.fillTriangle(-t * 0.56, -t * 0.3, t * 0.56, -t * 0.3, 0, -t * 0.78);
            var aro = this.add.graphics(); aro.lineStyle(7, 0x51cf66, 1); aro.strokeRoundedRect(-t * 0.5, -t * 0.82, t, t * 1.4, 14); aro.setAlpha(0);
            a.cont.addAt(g, 0); a.cont.addAt(aro, 1);
            a.img.setPosition(0, -t * 0.02);
            a.aro = aro; a.tam = t;
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            var tam = Math.min(this.L.tam, this.L.aw / n * 0.8);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearCasita(id, i, tam); });
            this.juntas = [];
            this.disponer(n);
            this.crearMarmol();
            K.ruido({ f: 1100, q: 1, dur: 0.1, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                a.cont.y += 50;
                return esperar(self, i * 120).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 360, ease: 'Back.easeOut' }); });
            }));
        },

        crearMarmol: function () {
            if (this.marmol && this.marmol.active) this.marmol.destroy();
            var m = this.add.container(this.inicio.x, this.inicio.y).setDepth(40);
            var g = this.add.graphics();
            g.fillStyle(0x4dabf7, 1); g.fillCircle(0, 0, 20);
            g.fillStyle(0xffffff, 0.55); g.fillCircle(-7, -7, 7);
            g.lineStyle(3, 0x1c7ed6, 1); g.strokeCircle(0, 0, 20);
            m.add(g);
            this.marmol = m;
            this.tweens.add({ targets: m, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            if (this.marmol && this.marmol.active) { this.marmol.destroy(); this.marmol = null; }
            this.nodos = []; this.hojas = []; this.juntas = [];
            this.ocupado = false;
        },

        alSonar: function () {
            Ut.estallido(this, this.L.W * 0.5, this.L.H * 0.12, { n: 3, tex: 'nota', tam: 24, dist: 90, depth: 70 });
        },

        /* ── Palancas y canica ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.ocupado || !this.marmol) return;
            this.pista.reiniciar();
            if (Math.hypot(p.x - this.marmol.x, p.y - this.marmol.y) < 46) { this.soltarCanica(); return; }
            var self = this;
            var mejor = -1, dm = 55;
            this.nodos.forEach(function (n, k) { var d = Math.hypot(p.x - n.x, p.y - n.y); if (d < dm) { dm = d; mejor = k; } });
            if (mejor >= 0) this.girar(mejor);
        },

        girar: function (k) {
            this.juntas[k] = this.juntas[k] ? 0 : 1;
            K.tono({ f: 520, f2: 760, dur: 0.07, vol: 0.05, tipo: 'square' });
            var n = this.nodos[k];
            Ut.estallido(this, n.x, n.y, { n: 3, tex: 'chispa', tam: 16, dist: 40, depth: 60, sinTinte: true });
        },

        /** Hoja a la que llegaría la canica con las palancas actuales. */
        destino: function () {
            var k = 0;
            while (k < this.nodos.length) {
                if (this.juntas[k] === 0) return k;      // 0 = izquierda → casita k
                k++;
            }
            return this.hojas.length - 1;
        },

        soltarCanica: async function () {
            if (this.ocupado) return;
            this.ocupado = true;
            var m = this.marmol;
            this.tweens.killTweensOf(m);
            m.setScale(1);
            m.setDepth(40);
            K.tono({ f: 400, f2: 700, dur: 0.15, vol: 0.05, tipo: 'triangle' });
            var k = 0;
            await tw(this, { targets: m, x: this.nodos[0].x, y: this.nodos[0].y - 8, duration: 450, ease: 'Quad.easeIn' });
            while (true) {
                K.ruido({ f: 1300, q: 3, dur: 0.05, vol: 0.07 });
                if (this.juntas[k] === 0) {
                    var h = this.hojas[k];
                    await tw(this, { targets: m, x: h.x, y: h.y - this.L.tam * 0.6, duration: 600, ease: 'Quad.easeIn' });
                    this.llego = k; break;
                }
                if (k + 1 < this.nodos.length) {
                    var nx = this.nodos[k + 1];
                    await tw(this, { targets: m, x: nx.x, y: nx.y - 8, duration: 480, ease: 'Quad.easeIn' });
                    k++;
                } else {
                    var h2 = this.hojas[this.hojas.length - 1];
                    await tw(this, { targets: m, x: h2.x, y: h2.y - this.L.tam * 0.6, duration: 600, ease: 'Quad.easeIn' });
                    this.llego = this.hojas.length - 1; break;
                }
            }
            var a = this.cosas[this.llego];
            this.casaActual = a;
            K.ruido({ f: 700, q: 1, dur: 0.1, vol: 0.1 });
            m.setAlpha(0);
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            // la canica regresa al inicio por el tubo
            m.setPosition(this.inicio.x, this.inicio.y).setAlpha(1).setScale(0.2);
            this.tweens.add({ targets: m, scale: 1, duration: 350, ease: 'Back.easeOut', onComplete: function () { if (m.active) self2(m); } });
            var self2 = function (mm) { mm.scene.tweens.add({ targets: mm, scale: 1.08, duration: 500, yoyo: true, repeat: -1 }); };
            this.ocupado = false;
        },

        alAcertar: async function () {
            var a = this.casaActual;
            if (!a) return;
            this.reunidos.push(a.id);
            a.aro.setAlpha(1);
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.4, { n: 16, tex: 'estrella', tam: 28, dist: 150, depth: 70, sinTinte: true });
            a.saltito(0.4, 3);
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.casaActual;
            if (a) a.sacudir();
            await esperar(this, 600);
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            if (this.marmol && this.marmol.active) this.marmol.setAlpha(0);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.ocupado) return Promise.resolve();
            var c = this.cosas.findIndex(function (q) { return self.respuestas().indexOf(q.id) >= 0; });
            if (c < 0 || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            var no = function () { return cancelada() || self.fase !== 'jugar'; };
            var k = this.palancaPendiente(c);
            var punto = k >= 0 ? { x: this.nodos[k].x, y: this.nodos[k].y } : { x: this.marmol.x, y: this.marmol.y };
            return this.ctx.mano({ punto: punto, holdMs: 500, cancelado: no });
        },

        /** Primera palanca que no apunta hacia la casita c (o -1 si el camino ya es el bueno). */
        palancaPendiente: function (c) {
            for (var k = 0; k < this.nodos.length; k++) {
                var quiere = k === c ? 0 : 1;
                if (k > c) break;
                if (this.juntas[k] !== quiere) return k;
            }
            return -1;
        },

        demoPaso: function () {
            var self = this;
            var c = this.cosas.findIndex(function (q) { return self.respuestas().indexOf(q.id) >= 0; });
            var pasos = [];
            // solo las palancas que hay que girar (si ya están bien, directo a soltar la canica)
            for (var k = 0; k < this.nodos.length && k <= c; k++) {
                var quiere = k === c ? 0 : 1;
                if (this.juntas[k] !== quiere) (function (kk) {
                    pasos.push({ desde: { x: self.nodos[kk].x, y: self.nodos[kk].y }, hacer: function () { self.girar(kk); } });
                })(k);
            }
            pasos.push(function () { return { desde: { x: self.marmol.x, y: self.marmol.y }, hacer: function () { return self.soltarCanica(); } }; });
            return pasos;
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 4);
            while (ids.length < 3) ids.push(['perro', 'gato', 'campana'][ids.length]);
            this.cosas = ids.map(function (id, i) { return self.crearCasita(id, i, Math.min(L.tam, L.aw / ids.length * 0.8)); });
            this.juntas = [];
            this.disponer(ids.length);
            await Promise.all(this.cosas.map(function (a, i) { return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, duration: 300 }); }); }));
            for (var i = 0; i < this.cosas.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas[i];
                a.aro.setAlpha(1); a.saltito(0.4, 2);
                Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.4, { n: 12, tex: 'estrella', tam: 26, dist: 140, depth: 70, sinTinte: true });
                await this.sonar(a.id, { breve: true, bocina: false });
            }
            Ut.confeti(this, 90);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            var self = this;
            return {
                nodos: (this.nodos || []).map(function (n, k) { return { x: Math.round(n.x), y: Math.round(n.y), dir: self.juntas[k] }; }),
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; }),
                marmol: this.marmol && this.marmol.active ? { x: Math.round(this.marmol.x), y: Math.round(this.marmol.y) } : null,
                ocupado: this.ocupado
            };
        },

        paso: function (time) {
            var g = this.tubosG, p = this.palG, L = this.L;
            if (!g || !g.active) return;
            g.clear(); p.clear();
            if (!this.nodos || !this.nodos.length) return;
            var self = this;
            var tubo = function (x1, y1, x2, y2) {
                g.lineStyle(26, 0x5c6b7a, 1); g.lineBetween(x1, y1, x2, y2);
                g.lineStyle(18, 0x9fb3c8, 1); g.lineBetween(x1, y1, x2, y2);
                g.lineStyle(5, 0xffffff, 0.35); g.lineBetween(x1 - 4, y1 - 3, x2 - 4, y2 - 3);
            };
            tubo(this.inicio.x, this.inicio.y, this.nodos[0].x, this.nodos[0].y);
            this.nodos.forEach(function (n, k) {
                var h = self.hojas[k];
                tubo(n.x, n.y, h.x, h.y - L.tam * 0.55);
                var sig = self.nodos[k + 1];
                if (sig) tubo(n.x, n.y, sig.x, sig.y); else tubo(n.x, n.y, self.hojas[k + 1].x, self.hojas[k + 1].y - L.tam * 0.55);
            });
            this.nodos.forEach(function (n, k) {
                // palanca: disco con flecha hacia donde irá la canica (izquierda = casita, derecha = seguir)
                p.fillStyle(0x000000, 0.25); p.fillCircle(n.x + 3, n.y + 5, 28);
                p.fillStyle(0xfcc419, 1); p.fillCircle(n.x, n.y, 28);
                p.lineStyle(5, 0xe67700, 1); p.strokeCircle(n.x, n.y, 28);
                var dir = self.juntas[k] ? 1 : -1;
                var tx = n.x + dir * 20, ty = n.y + 14;
                p.fillStyle(0x2b8a3e, 1);
                p.fillTriangle(tx, ty, n.x - dir * 4, n.y - 6, n.x + dir * 4, n.y + 20);
                p.lineStyle(7, 0x2b8a3e, 1); p.lineBetween(n.x, n.y - 14, tx, ty);
            });
        }
    };

    K.crear({ id: 'canicas', fondo: '#ffc078', escena: escena });
})(typeof window !== 'undefined' ? window : this);
