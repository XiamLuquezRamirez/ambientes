/**
 * «Los vasos del mago» — motor propio de Escucha y Recuerda (5-6 años).
 *
 * El mago pone sobre la mesa los objetos que pueden haber sonado y los tapa con vasos. Primero
 * suena un sonido; DESPUÉS de una pausa aparecen los objetos un instante, los vasos bajan y se
 * MEZCLAN a toda velocidad. El niño recuerda el sonido, SIGUE con la vista el vaso que lo esconde
 * y lo toca. Si destapa otro, suena su propio sonido y el vaso vuelve a bajar (sin castigo). En los
 * niveles altos se mezclan más veces y más rápido.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xe03131, 0x1c7ed6, 0xf08c00, 0x2f9e44, 0x9c36b5];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.mezclando = false;
            this.ocupado = false;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.mesa = Math.round(H * 0.7);
            L.tam = Math.max(96, Math.min(140, (L.der - 100) / 4.4, H * 0.2));
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'vasos_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#2b1a55'); g.addColorStop(1, '#5a2d82');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                // cortinas laterales
                x.fillStyle = '#9c1c3a';
                x.fillRect(0, 0, w * 0.07, h); x.fillRect(w * 0.93, 0, w * 0.07, h);
                x.fillStyle = '#7a1530';
                for (var i = 0; i < 4; i++) { x.fillRect(i * w * 0.018 + w * 0.01, 0, w * 0.006, h); x.fillRect(w - (i * w * 0.018 + w * 0.016), 0, w * 0.006, h); }
                // estrellas
                x.fillStyle = 'rgba(255,230,120,0.7)';
                for (var s = 0; s < 40; s++) { x.beginPath(); x.arc(((s * 137) % w) * 0.86 + w * 0.07, (s * 61) % (h * 0.5), 1.5 + (s % 3), 0, Math.PI * 2); x.fill(); }
                // mesa con mantel
                x.fillStyle = '#0b3d6b'; x.fillRect(0, L.mesa, w, h - L.mesa);
                x.fillStyle = '#1c7ed6'; x.fillRect(0, L.mesa, w, 22);
                x.fillStyle = 'rgba(255,255,255,0.12)';
                for (var k = 0; k < w; k += 70) x.fillRect(k, L.mesa + 22, 34, h - L.mesa);
            });
            keep(this.add.image(0, 0, 'vasos_fondo').setOrigin(0, 0).setDepth(1));
            this.focoG = keep(this.add.graphics().setDepth(2));
            this.focoG.fillStyle(0xfff3bf, 0.1);
            this.focoG.fillTriangle(L.der / 2 - 40, 0, L.der / 2 + 40, 0, L.der / 2 + L.tam * 2.6, L.mesa);
            this.focoG.fillTriangle(L.der / 2 - 40, 0, L.der / 2 + L.tam * 2.6, L.mesa, L.der / 2 - L.tam * 2.6, L.mesa);
            this.montarHud(keep);
            this.sembrarMotes(keep, 14, { x: 0, y: 0, w: L.W, h: L.mesa, depth: 8 }, 0xfff3bf);
            if (reubicar) this.ubicarCosas();
        },

        lugares: function (n) {
            var L = this.L;
            var x0 = 100, disp = L.der - x0 - 40;
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: x0 + disp * (i + 0.5) / n, y: L.mesa - L.tam * 0.12 });
            return out;
        },

        ubicarCosas: function () {
            var self = this;
            if (this.mezclando) return;
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.pos = i; a.cont.setPosition(lug[i].x, lug[i].y); });
        },

        crearVaso: function (id, i, lug, tam) {
            var a = this.crearCosa(id, lug.x, lug.y, tam * 0.66, { depth: 30, sinSombra: true });
            var copa = this.add.container(0, 0);
            var g = this.add.graphics();
            var col = COLORES[i % COLORES.length];
            var tw2 = tam * 0.54, bw = tam * 0.42, h = tam * 0.9;
            g.fillStyle(0x000000, 0.2); g.fillEllipse(4, 0, tam * 0.9, tam * 0.16);
            g.fillStyle(col, 1);
            g.fillPoints([{ x: -tw2, y: -h }, { x: tw2, y: -h }, { x: bw, y: 4 }, { x: -bw, y: 4 }], true);
            g.fillStyle(0xffffff, 0.25); g.fillPoints([{ x: -tw2 * 0.6, y: -h }, { x: -tw2 * 0.3, y: -h }, { x: -bw * 0.4, y: 4 }, { x: -bw * 0.7, y: 4 }], true);
            g.fillStyle(0xffd43b, 1); g.fillRect(-tw2 * 0.92, -h * 0.62, tw2 * 1.84, h * 0.12);
            g.lineStyle(4, 0x000000, 0.2); g.strokePoints([{ x: -tw2, y: -h }, { x: tw2, y: -h }, { x: bw, y: 4 }, { x: -bw, y: 4 }], true);
            copa.add(g);
            a.cont.add(copa);
            a.copa = copa;
            a.cont.bringToTop(copa);
            a.img.setY(-tam * 0.32);
            a.tam = tam; a.pos = i; a.alto = h;
            copa.setY(-h * 1.1);      // vaso levantado
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            var lug = this.lugares(n);
            var tam = Math.min(this.L.tam, (this.L.der - 120) / n * 0.8);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearVaso(id, i, lug[i], tam); });
            this.lug = lug;
            K.ruido({ f: 1100, q: 1, dur: 0.1, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) { return esperar(self, i * 110).then(function () { return tw(self, { targets: a.cont, alpha: 1, duration: 300 }); }); }));
            // Se ven los objetos un momento...
            await esperar(this, 1500);
            // ...los vasos bajan...
            await Promise.all(this.cosas.map(function (a, i) { return esperar(self, i * 80).then(function () { K.ruido({ f: 300, q: 0.8, dur: 0.1, vol: 0.08 }); return tw(self, { targets: a.copa, y: 0, duration: 260, ease: 'Bounce.easeOut' }); }); }));
            await esperar(this, 350);
            // ...y se mezclan.
            await this.mezclar();
        },

        mezclar: async function () {
            var self = this;
            this.mezclando = true;
            var nivel = this.nivelActual || 0;
            var veces = [3, 5, 7, 9][Math.min(3, nivel)];
            var dur = [520, 420, 340, 270][Math.min(3, nivel)];
            var n = this.cosas.length;
            var ultimo = '';
            for (var k = 0; k < veces; k++) {
                var i, j, clave;
                do { i = Math.floor(Math.random() * n); j = (i + 1 + Math.floor(Math.random() * (n - 1))) % n; clave = Math.min(i, j) + '-' + Math.max(i, j); } while (clave === ultimo);
                ultimo = clave;
                var A = this.cosas.filter(function (c) { return c.pos === i; })[0];
                var B = this.cosas.filter(function (c) { return c.pos === j; })[0];
                var pa = this.lug[i], pb = this.lug[j];
                K.tono({ f: 400 + k * 30, f2: 600 + k * 30, dur: 0.12, vol: 0.04, tipo: 'triangle' });
                A.cont.setDepth(31); B.cont.setDepth(29);
                var alto = this.L.tam * 0.45;
                await Promise.all([
                    self.arco(A, pb, -alto, dur),
                    self.arco(B, pa, alto * 0.5, dur)
                ]);
                A.pos = j; B.pos = i;
            }
            this.mezclando = false;
        },

        /** Mueve un vaso a otra casilla describiendo un arco (por delante o por detrás). */
        arco: function (a, destino, alto, dur) {
            var self = this;
            var x0 = a.cont.x, y0 = a.cont.y;
            var k = { t: 0 };
            return tw(this, {
                targets: k, t: 1, duration: dur, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    a.cont.x = x0 + (destino.x - x0) * k.t;
                    a.cont.y = y0 + (destino.y - y0) * k.t + Math.sin(k.t * Math.PI) * alto;
                },
                onComplete: function () { a.cont.setPosition(destino.x, destino.y); a.cont.setDepth(30); }
            });
        },

        prepararNivel: async function () {
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.ocupado = false;
        },

        alSonar: function () {
            Ut.estallido(this, this.L.W * 0.5, this.L.H * 0.2, { n: 3, tex: 'nota', tam: 24, dist: 100, depth: 70 });
        },

        /* ── Destapar ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.ocupado || this.mezclando) return;
            var mejor = null, dm = Infinity;
            this.cosas.forEach(function (a) {
                var d = Math.hypot(p.x - a.cont.x, p.y - (a.cont.y - a.alto * 0.45));
                if (d < a.tam * 0.7 && d < dm) { dm = d; mejor = a; }
            });
            if (mejor) { this.pista.reiniciar(); this.destapar(mejor); }
        },

        destapar: async function (a) {
            if (this.ocupado) return;
            this.ocupado = true;
            this.actual = a;
            K.ruido({ f: 500, q: 0.8, dur: 0.1, vol: 0.08 });
            await tw(this, { targets: a.copa, y: -a.alto * 1.15, duration: 260, ease: 'Back.easeOut' });
            var ok = await this.elegir(a.id, { x: a.cont.x, y: a.cont.y });
            if (ok === false) {
                await esperar(this, 400);
                await tw(this, { targets: a.copa, y: 0, duration: 260, ease: 'Bounce.easeOut' });
            }
            this.ocupado = false;
        },

        alAcertar: async function () {
            var a = this.actual;
            if (!a) return;
            this.reunidos.push(a.id);
            Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.5, { n: 16, tex: 'estrella', tam: 28, dist: 150, depth: 70, sinTinte: true });
            // el mago levanta todos los vasos
            this.cosas.forEach(function (c) { if (c !== a) c.copa.setY(-c.alto * 1.15); });
            a.saltito(0.4, 3);
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 300);
        },

        alFallar: async function () {
            var a = this.actual;
            if (a) a.sacudir();
            await esperar(this, 450);
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.ocupado) return Promise.resolve();
            var a = this.correctaDe(this.cosas);
            if (!a || !this.ayuda) {
                if (this.bocina) this.tweens.add({ targets: this.bocina, scale: 1.18, duration: 220, yoyo: true, repeat: 2 });
                return esperar(this, 900);
            }
            return this.ctx.mano({ punto: { x: a.cont.x, y: a.cont.y - a.alto * 0.45 }, holdMs: 500, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var a = this.correctaDe(this.cosas);
            if (!a) return null;
            return { desde: { x: a.cont.x, y: a.cont.y - a.alto * 0.45 }, hacer: function () { return self.destapar(a); } };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['gallo', 'carro', 'pelota'];
            var lug = this.lugares(ids.length);
            var tam = Math.min(L.tam, (L.der - 120) / ids.length * 0.8);
            this.cosas = ids.map(function (id, i) { return self.crearVaso(id, i, lug[i], tam); });
            await Promise.all(this.cosas.map(function (a, i) { return esperar(self, i * 90).then(function () { return tw(self, { targets: a.cont, alpha: 1, duration: 300 }); }); }));
            for (var i = 0; i < this.cosas.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas[i];
                a.saltito(0.4, 2);
                Ut.estallido(this, a.cont.x, a.cont.y - a.tam * 0.5, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 90);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            return {
                mezclando: this.mezclando, veces: [3, 5, 7, 9][Math.min(3, this.nivelActual || 0)],
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y - a.alto * 0.45) }; })
            };
        },

        paso: function (time) {
            var self = this;
            this.cosas.forEach(function (a, i) { if (a.cont.active && a.img && !self.mezclando && !self.tweens.isTweening(a.img)) a.copa.angle = Math.sin(time / 800 + i) * 1.2; });
        }
    };

    K.crear({ id: 'vasos', fondo: '#2b1a55', escena: escena });
})(typeof window !== 'undefined' ? window : this);
