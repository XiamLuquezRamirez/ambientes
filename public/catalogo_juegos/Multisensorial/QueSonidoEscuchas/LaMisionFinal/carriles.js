/**
 * «El corredor de carriles» — motor propio de La Misión Final (5-6 años).
 *
 * Misión: conducir por una ruta de varios carriles. Suena un sonido y, cuando empieza el camino,
 * llegan puertas con las imágenes (una por carril). El niño ARRASTRA el coche de un carril a otro y
 * cruza la puerta del sonido que escuchó. Si cruza otra, suena su propio sonido y llega otra
 * tanda de puertas (sin castigo); con la bocina vuelve a escuchar el sonido. En los niveles altos
 * el camino va más rápido y hay más carriles.
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
            this.puertas = null;
            this.reunidos = [];
            this.carro = null;
            this.meta = null;
            this.pulsado = false;
            this.corre = false;
            this.scroll = 0;
            this.v = 170;
            this.opcionesNv = [];
            this.siguiente = 0;
            this.auto = null;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.cx = Math.round(L.der / 2);
            L.tam = Math.max(78, Math.min(116, (L.der - 160) / 4.6, H * 0.15));
            L.carroY = Math.round(H * 0.8);
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        carriles: function (n) {
            var L = this.L;
            var w = Math.min(L.tam * 1.35, (L.der - 200) / n);
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: L.cx + (i - (n - 1) / 2) * w, w: w });
            this.anchoCarril = w;
            return out;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) V.parque({ horizonte: Math.round(L.H * 0.18), arboles: [0.04, 0.96], solX: 0.1 });
            this.rutaG = keep(this.add.graphics().setDepth(3));
            this.orillaG = keep(this.add.graphics().setDepth(4));
            var c = keep(this.add.container(L.cx, L.carroY).setDepth(40));
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.22); g.fillEllipse(0, 30, 74, 26);
            g.fillStyle(0xe03131, 1); g.fillRoundedRect(-30, -50, 60, 100, 16);
            g.fillStyle(0xff8787, 1); g.fillRoundedRect(-24, -44, 48, 36, 10);
            g.fillStyle(0x364fc7, 1); g.fillRoundedRect(-22, -22, 44, 26, 8);
            g.fillStyle(0xa5d8ff, 0.85); g.fillRoundedRect(-18, -18, 36, 18, 6);
            g.fillStyle(0xffd43b, 1); g.fillCircle(-18, -48, 6); g.fillCircle(18, -48, 6);
            g.fillStyle(0x212529, 1); g.fillRoundedRect(-36, -34, 8, 22, 4); g.fillRoundedRect(28, -34, 8, 22, 4); g.fillRoundedRect(-36, 18, 8, 22, 4); g.fillRoundedRect(28, 18, 8, 22, 4);
            g.fillStyle(0xffffff, 0.9); g.fillRect(-4, -50, 8, 100);
            c.add(g);
            this.carro = c;
            this.montarHud(keep);
        },

        /* ── Puertas que llegan por el camino ── */

        crearPuertas: function () {
            var self = this, L = this.L;
            var lanes = this.carriles(this.opcionesNv.length);
            var ids = this.opcionesNv.slice();
            var tam = Math.min(L.tam, this.anchoCarril * 0.78);
            var items = ids.map(function (id, i) {
                var a = self.crearCosa(id, lanes[i].x, -tam, tam * 0.62, { depth: 30, sinTinte: true, sinSombra: true });
                var g = self.add.graphics();
                var col = COLORES[i % COLORES.length];
                g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-tam * 0.55 + 3, -tam * 0.55 + 6, tam * 1.1, tam * 1.1, 14);
                g.fillStyle(col, 1); g.fillRoundedRect(-tam * 0.55, -tam * 0.55, tam * 1.1, tam * 1.1, 14);
                g.fillStyle(0xffffff, 1); g.fillRoundedRect(-tam * 0.45, -tam * 0.45, tam * 0.9, tam * 0.9, 10);
                g.fillStyle(0x495057, 1); g.fillRect(-tam * 0.55, tam * 0.5, 8, tam * 0.5); g.fillRect(tam * 0.55 - 8, tam * 0.5, 8, tam * 0.5);
                var luz = self.add.graphics(); luz.fillStyle(0x69db7c, 1); luz.fillRoundedRect(-tam * 0.55, -tam * 0.55, tam * 1.1, tam * 1.1, 14); luz.setAlpha(0);
                a.cont.addAt(g, 0); a.cont.addAt(luz, 1);
                a.luz = luz; a.tam = tam; a.lane = i; a.lx = lanes[i].x;
                return a;
            });
            this.puertas = { items: items, y: -tam, vivo: true, atendida: false };
            this.cosas = items;
        },

        retirarPuertas: function () {
            if (!this.puertas) return;
            this.puertas.items.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.puertas = null;
            this.cosas = [];
        },

        mostrarOpciones: async function (nv) {
            this.opcionesNv = nv.opciones.slice();
            this.retirarPuertas();
            this.corre = true;
            this.v = 170 + (this.nivelActual || 0) * 55;
            this.carro.x = this.L.cx;
            this.meta = null;
            this.crearPuertas();
            await esperar(this, 300);
        },

        prepararNivel: async function () {
            this.retirarPuertas();
            this.corre = false;
        },

        alSonar: function () {
            Ut.estallido(this, this.L.cx, this.L.H * 0.3, { n: 3, tex: 'nota', tam: 24, dist: 100, depth: 70 });
        },

        /* ── Conducir ── */

        alTocar: function (p) { if (this.fase === 'jugar') { this.pulsado = true; this.meta = p.x; this.pista.reiniciar(); } },
        alMover: function (p) { if (this.pulsado) this.meta = p.x; },
        alSoltar: function () { this.pulsado = false; },

        carrilCercano: function (x) {
            var lanes = this.carriles(this.opcionesNv.length), mejor = 0, dm = 1e9;
            lanes.forEach(function (l, i) { var d = Math.abs(l.x - x); if (d < dm) { dm = d; mejor = i; } });
            return mejor;
        },

        cruzar: async function (a) {
            this.puertas.atendida = true;
            this.actual = a;
            a.luz.setAlpha(0.9);
            K.ruido({ f: 900, q: 1, dur: 0.12, vol: 0.1 });
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            if (ok === false) {
                // el coche se tambalea y llega otra tanda de puertas
                await esperar(this, 500);
                if (this.fase === 'jugar' && this.corre) { this.retirarPuertas(); this.crearPuertas(); }
            }
        },

        alAcertar: async function () {
            var a = this.actual;
            if (!a) return;
            this.corre = false;
            this.reunidos.push(a.id);
            Ut.estallido(this, this.carro.x, this.carro.y - 40, { n: 16, tex: 'estrella', tam: 28, dist: 160, depth: 70, sinTinte: true });
            this.tweens.add({ targets: this.carro, angle: 360, duration: 600 });
            a.saltito(0.3, 2);
            await this.sonar(a.id, { breve: true, bocina: false });
            this.carro.angle = 0;
            await esperar(this, 250);
        },

        alFallar: async function () {
            var c = this.carro;
            this.cameras.main.shake(150, 0.004);
            await tw(this, { targets: c, angle: { from: -12, to: 12 }, duration: 80, yoyo: true, repeat: 3 });
            c.angle = 0;
        },

        alTerminarNivel: async function () {
            this.retirarPuertas();
            this.corre = false;
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var a = this.puertas && this.correctaDe(this.puertas.items);
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            return this.ctx.mano({ punto: { x: this.carro.x, y: this.carro.y }, holdMs: 200, arrastre: { dx: a.lx - this.carro.x, dy: 0, durMs: 800 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var a = this.puertas && this.correctaDe(this.puertas.items);
            if (!a) return null;
            return {
                desde: { x: this.carro.x, y: this.carro.y }, hasta: { x: a.lx, y: this.carro.y },
                hacer: async function () {
                    self.auto = a.lx;
                    var t0 = self.time.now;
                    while (self.fase === 'jugar' && self.time.now - t0 < 9000) await esperar(self, 120);
                    self.auto = null;
                }
            };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.retirarPuertas();
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 4);
            while (ids.length < 3) ids.push(['lluvia', 'mar', 'viento'][ids.length]);
            this.opcionesNv = ids;
            this.corre = true;
            this.v = 260;
            this.crearPuertas();
            this.puertas.final = true;
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                this.auto = this.puertas.items[i].lx;
                await esperar(this, 650);
                var a = this.puertas.items[i];
                a.luz.setAlpha(0.9);
                Ut.estallido(this, a.cont.x, a.cont.y, { n: 10, tex: 'estrella', tam: 26, dist: 140, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            this.auto = null;
            Ut.confeti(this, 100);
            this.corre = false;
            await esperar(this, 1000);
        },

        estadoExtra: function () {
            var p = this.puertas;
            return {
                carro: this.carro ? { x: Math.round(this.carro.x), y: Math.round(this.carro.y) } : null,
                lanes: this.opcionesNv.length ? this.carriles(this.opcionesNv.length).map(function (l) { return Math.round(l.x); }) : [],
                cosas: p ? p.items.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), lane: a.lane }; }) : []
            };
        },

        paso: function (time, delta) {
            var L = this.L, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!this.carro || !this.carro.active) return;
            var v = this.corre ? this.v : 60;
            this.scroll = (this.scroll + v * dt) % 80;
            // Ruta y orillas con desplazamiento.
            var n = this.opcionesNv.length || 3;
            var lanes = this.carriles(n);
            var ancho = lanes[0].w * n + 40;
            var rg = this.rutaG; rg.clear();
            rg.fillStyle(0x8ce99a, 1); rg.fillRect(0, 0, L.W, L.H);
            rg.fillStyle(0x495057, 1); rg.fillRect(L.cx - ancho / 2, 0, ancho, L.H);
            rg.fillStyle(0xfcc419, 1); rg.fillRect(L.cx - ancho / 2 - 8, 0, 8, L.H); rg.fillRect(L.cx + ancho / 2, 0, 8, L.H);
            rg.fillStyle(0xffffff, 0.85);
            for (var k = 1; k < n; k++) { var lx = L.cx - ancho / 2 + 20 + lanes[0].w * k; for (var y = -80; y < L.H + 80; y += 80) rg.fillRect(lx - 3, y + this.scroll, 6, 40); }
            var og = this.orillaG; og.clear();
            for (var t = -1; t < 8; t++) {
                var ty = t * 120 + (this.scroll * 1.5) % 120;
                [L.cx - ancho / 2 - 90, L.cx + ancho / 2 + 90].forEach(function (tx, s) {
                    if (tx < 20 || tx > L.der + 20) return;
                    og.fillStyle(0x7a4e1e, 1); og.fillRect(tx - 6, ty + 18, 12, 26);
                    og.fillStyle(s ? 0x2f9e44 : 0x40c057, 1); og.fillCircle(tx, ty, 30);
                });
            }
            // El coche sigue al dedo; al soltar se acomoda en el carril más cercano.
            var obj = this.carro.x;
            if (this.auto != null) obj = this.auto;
            else if (this.meta != null) obj = this.meta;
            if (this.opcionesNv.length && (!this.pulsado || this.auto != null)) obj = lanes[this.carrilCercano(obj)].x;
            obj = Math.max(lanes[0].x, Math.min(lanes[lanes.length - 1].x, obj));
            this.carro.x += (obj - this.carro.x) * Math.min(1, dt * 10);
            // Puertas: bajan por el camino.
            var P = this.puertas;
            if (P && this.corre) {
                if (P.final) P.y = L.H * 0.45; else P.y += this.v * dt;
                P.items.forEach(function (a) { if (a.cont.active) { a.cont.x = a.lx; a.cont.y = P.y; } });
                if (!P.atendida && !P.final && this.fase === 'jugar' && P.y > this.carro.y - 30) {
                    var cerca = this.carrilCercano(this.carro.x);
                    this.cruzar(P.items[cerca]);
                } else if (!P.final && P.y > L.H + 100) {
                    this.retirarPuertas();
                    if (this.fase === 'jugar' && this.corre) this.crearPuertas();
                }
            }
        }
    };

    K.crear({ id: 'carriles', fondo: '#8ce99a', escena: escena });
})(typeof window !== 'undefined' ? window : this);
