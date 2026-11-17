/**
 * «La mesa del DJ» — motor propio de Secuencia con Cambio (5-6 años).
 *
 * Una cabina de DJ con luces. Suena una secuencia (las lámparas de la pista se encienden, sin decir
 * cuáles) y el niño la repite tocando los botones de la mesa. Cuando acierta, ¡la mesa CAMBIA!: los
 * botones se mezclan de lugar, suena otra secuencia con distinto orden y hay que escucharla de nuevo
 * y repetir la nueva, sin copiar la anterior. Cada toque hace saltar el ecualizador y la luz. Si se
 * equivoca, la mesa se apaga un instante y la secuencia vuelve a sonar.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var mezclar = Ut.mezclar;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.ranuras = [];
            this.miniaturas = [];
            this.eq = 0;
            this.lampOn = -1;
            this.fiesta = 0;
            this.rondaDos = false;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.mesa = { x: Math.round(L.der / 2), y: Math.round(H * 0.62) };
            L.tam = Math.max(78, Math.min(118, (L.der - 160) / 4.6, H * 0.17));
            L.pista = { x: Math.round(L.der / 2), y: Math.round(H * 0.17) };
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            K.textura(this, 'dj_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#1a0f3d'); g.addColorStop(0.6, '#3b1f6b'); g.addColorStop(1, '#5b2a86');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.fillStyle = 'rgba(255,255,255,0.06)';
                for (var i = 0; i < 40; i++) x.fillRect((i * 137) % w, (i * 71) % (h * 0.5), 3, 3);
                // Piso de baldosas.
                var sy = h * 0.8;
                for (var r = 0; r < 4; r++) for (var c = 0; c < 18; c++) {
                    x.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.18)';
                    x.fillRect(c * (w / 18), sy + r * (h * 0.05), w / 18, h * 0.05);
                }
            });
            keep(this.add.image(0, 0, 'dj_fondo').setOrigin(0, 0).setDepth(1));
            this.hacesG = keep(this.add.graphics().setDepth(2));
            this.eqG = keep(this.add.graphics().setDepth(3));
            this.mesaG = keep(this.add.graphics().setDepth(6));
            this.pistaG = keep(this.add.graphics().setDepth(14));
            this.dibujarMesa();
            this.dibujarPista();
            this.montarHud(keep);
            this.sembrarMotes(keep, 14, { x: 0, y: 0, w: L.W, h: L.H * 0.8, depth: 7 }, 0xe599f7);
            if (reubicar) { this.ubicarCosas(); this.redibujarMiniaturas(); }
        },

        dibujarMesa: function () {
            var L = this.L, g = this.mesaG, n = this.cosas.length || 4;
            if (!g || !g.active) return;
            g.clear();
            var w = Math.min(L.der - 80, L.tam * 1.3 * Math.min(n, 3) + 70), h = L.tam * 1.3 * Math.ceil(n / 3) + 60;
            g.fillStyle(0x000000, 0.35); g.fillRoundedRect(L.mesa.x - w / 2 + 5, L.mesa.y - h / 2 + 10, w, h, 24);
            g.fillStyle(0x2b2342, 1); g.fillRoundedRect(L.mesa.x - w / 2, L.mesa.y - h / 2, w, h, 24);
            g.lineStyle(5, 0xcc5de8, 0.9); g.strokeRoundedRect(L.mesa.x - w / 2, L.mesa.y - h / 2, w, h, 24);
            g.fillStyle(0xffffff, 0.08); g.fillRoundedRect(L.mesa.x - w / 2 + 10, L.mesa.y - h / 2 + 8, w - 20, 12, 6);
        },

        /* ── Pista: una lámpara/disco por sonido ── */

        posPista: function (i, n) {
            var L = this.L, w = Math.min(L.der * 0.6, n * 84);
            return { x: L.pista.x - w / 2 + (w / n) * (i + 0.5), y: L.pista.y };
        },

        dibujarPista: function () {
            var L = this.L, g = this.pistaG, n = this.ranuras.length;
            if (!g || !g.active) return;
            g.clear();
            if (!n) return;
            var p0 = this.posPista(0, n), pN = this.posPista(n - 1, n);
            g.fillStyle(0x0b0620, 0.75); g.fillRoundedRect(p0.x - 46, p0.y - 40, pN.x - p0.x + 92, 80, 18);
            g.lineStyle(3, this.rondaDos ? 0xffd43b : 0x74c0fc, 1); g.strokeRoundedRect(p0.x - 46, p0.y - 40, pN.x - p0.x + 92, 80, 18);
            for (var i = 0; i < n; i++) {
                var p = this.posPista(i, n);
                var on = this.lampOn === i || this.ranuras[i];
                g.fillStyle(on ? 0x2b8a3e : 0x30244d, 1); g.fillCircle(p.x, p.y, 31);
                g.lineStyle(4, on ? 0x69db7c : 0x6b5b95, 1); g.strokeCircle(p.x, p.y, 31);
                if (this.lampOn === i) { g.fillStyle(0xffd43b, 0.9); g.fillCircle(p.x, p.y, 16); }
            }
        },

        redibujarMiniaturas: function () {
            var n = this.ranuras.length;
            this.miniaturas.forEach(function (m, i) { if (m && m.active) { var p = this.posPista(i, n); m.setPosition(p.x, p.y); } }, this);
        },

        limpiarMiniaturas: function () {
            this.miniaturas.forEach(function (m) { if (m && m.active) m.destroy(); });
            this.miniaturas = [];
        },

        /* ── Botones de la mesa ── */

        lugares: function (n) {
            var L = this.L;
            var cols = n <= 4 ? 2 : 3;
            if (n === 3) cols = 3;
            var filas = Math.ceil(n / cols);
            var paso = L.tam * 1.3;
            var out = [];
            for (var i = 0; i < n; i++) {
                var f = Math.floor(i / cols), c = i % cols;
                var enFila = f === filas - 1 ? n - cols * (filas - 1) : cols;
                out.push({ x: L.mesa.x + (c - (enFila - 1) / 2) * paso, y: L.mesa.y + (f - (filas - 1) / 2) * paso });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { if (a.cont.active) { a.casa = { x: lug[i].x, y: lug[i].y }; a.cont.setPosition(lug[i].x, lug[i].y); } });
            this.dibujarMesa();
        },

        crearPad: function (id, i, lug) {
            var t = this.L.tam;
            var a = this.crearCosa(id, lug.x, lug.y + 40, t * 0.68, { depth: 30, sinSombra: true });
            var col = COLORES[i % COLORES.length];
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-t * 0.5 + 3, -t * 0.5 + 7, t, t, 18);
            g.fillStyle(col, 1); g.fillRoundedRect(-t * 0.5, -t * 0.5, t, t, 18);
            g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(-t * 0.42, -t * 0.42, t * 0.84, t * 0.84, 14);
            g.fillStyle(col, 0.18); g.fillRoundedRect(-t * 0.42, -t * 0.42, t * 0.84, t * 0.84, 14);
            var luz = this.add.graphics(); luz.fillStyle(0xffffff, 1); luz.fillRoundedRect(-t * 0.5, -t * 0.5, t, t, 18); luz.setAlpha(0);
            a.cont.addAt(g, 0); a.cont.addAt(luz, 1);
            a.luz = luz; a.col = col; a.tam = t; a.casa = { x: lug.x, y: lug.y }; a.prof = 30;
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var lug = this.lugares(nv.opciones.length);
            this.cosas = nv.opciones.map(function (id, i) { return self.crearPad(id, i, lug[i]); });
            this.dibujarMesa();
            K.ruido({ f: 1200, q: 1, dur: 0.08, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 320, ease: 'Back.easeOut' }); });
            }));
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.limpiarMiniaturas();
            this.rondaDos = false;
            this.ranuras = nv.reproducciones[0].map(function () { return null; });
            this.dibujarPista();
        },

        alSonar: function (id, k) {
            this.lampOn = k;
            this.dibujarPista();
            this.eq = 0.6;
            K.tono({ f: 700 + k * 90, dur: 0.05, vol: 0.03 });
            var self = this;
            this.time.delayedCall(430, function () { self.lampOn = -1; self.dibujarPista(); });
        },

        /* ── Tocar botones ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.L.tam * 0.62);
            if (!a || a.hecha) return;
            this.pista.reiniciar();
            await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
        },

        alMarcar: async function (id, k) {
            var a = this.tocado, n = this.ranuras.length;
            a.hecha = true;
            this.ranuras[k] = id;
            this.dibujarPista();
            this.eq = 1;
            a.luz.setAlpha(0.9); a.luz.fillColor = a.col;
            this.tweens.add({ targets: a.luz, alpha: 0.35, duration: 500 });
            this.tweens.add({ targets: a.cont, scale: 0.9, duration: 80, yoyo: true });
            var p = this.posPista(k, n);
            var m = this.add.image(a.cont.x, a.cont.y, 'el_' + id).setDepth(16);
            var esc = 48 / Math.max(m.width, m.height);
            m.setScale(esc * 1.6);
            this.miniaturas[k] = m;
            Ut.estallido(this, a.cont.x, a.cont.y, { n: 6, tex: 'chispa', tam: 20, dist: 80, depth: 70, colores: [a.col, 0xffffff] });
            await tw(this, { targets: m, x: p.x, y: p.y, scale: esc, duration: 380, ease: 'Cubic.easeOut' });
        },

        alFallar: async function () {
            var a = this.tocado;
            this.eq = 0;
            this.fiesta = 0;
            this.cameras.main.shake(200, 0.005);
            K.tono({ f: 300, f2: 160, dur: 0.25, vol: 0.05 });
            if (a) await a.sacudir();
        },

        alReiniciar: async function () {
            this.cosas.forEach(function (a) { a.hecha = false; if (a.luz) a.luz.setAlpha(0); });
            this.limpiarMiniaturas();
            this.ranuras = this.ranuras.map(function () { return null; });
            this.dibujarPista();
        },

        alAcertar: async function () {
            var nv = this.nv;
            var cambia = !!nv.segunda;
            for (var k = 0; k < nv.correctas.length; k++) {
                if (!this.sigue()) return;
                if (!cambia) this.reunidos.push(nv.correctas[k]);
                var a = this.cosas.filter(function (q) { return q.id === nv.correctas[k]; })[0];
                if (a) { a.luz.fillColor = 0xffd43b; a.luz.setAlpha(0.9); this.tweens.add({ targets: a.luz, alpha: 0.3, duration: 400 }); a.latir(); }
                this.eq = 1;
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 80);
            }
            if (!cambia) { this.fiesta = 1; Ut.confeti(this, 60); await esperar(this, 600); this.fiesta = 0; }
        },

        /** ¡La mesa cambia!: los botones se mezclan de lugar y se borra la pista. */
        alCambioSecuencia: async function () {
            var self = this;
            this.rondaDos = true;
            this.limpiarMiniaturas();
            this.ranuras = this.ranuras.map(function () { return null; });
            this.cosas.forEach(function (a) { a.hecha = false; if (a.luz) a.luz.setAlpha(0); });
            this.dibujarPista();
            var L = this.L;
            // Aviso del cambio: destello, estrellas y sonido (sin texto).
            K.tono({ f: 500, f2: 1000, dur: 0.35, vol: 0.06, tipo: 'triangle' });
            Ut.estallido(this, L.mesa.x, L.mesa.y, { n: 18, tex: 'estrella', tam: 30, dist: 220, depth: 80, sinTinte: true });
            this.cameras.main.flash(250, 255, 255, 255);
            var lug = mezclar(this.lugares(this.cosas.length));
            await Promise.all(this.cosas.map(function (a, i) {
                a.casa = { x: lug[i].x, y: lug[i].y };
                return tw(self, { targets: a.cont, x: lug[i].x, y: lug[i].y, angle: 360, duration: 700, ease: 'Cubic.easeInOut', onComplete: function () { a.cont.angle = 0; } });
            }));
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.limpiarMiniaturas();
            this.ranuras = [];
            this.dibujarPista();
        },

        mostrarPista: function (cancelada) { return this.pistaToque(cancelada, this.cosas.filter(function (a) { return !a.hecha; })); },
        demoPaso: function () { return this.demoOrden(this.cosas); },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.limpiarMiniaturas();
            this.ranuras = [];
            this.dibujarPista();
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 6);
            if (!ids.length) ids = ['perro', 'campana', 'pajaro'];
            var lug = this.lugares(ids.length);
            this.cosas = ids.map(function (id, i) { return self.crearPad(id, i, lug[i]); });
            this.dibujarMesa();
            await Promise.all(this.cosas.map(function (a, i) { return esperar(self, i * 90).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 300, ease: 'Back.easeOut' }); }); }));
            this.fiesta = 1;
            for (var r = 0; r < 2; r++) for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas[i];
                a.luz.fillColor = a.col; a.luz.setAlpha(0.9); this.tweens.add({ targets: a.luz, alpha: 0.2, duration: 400 });
                a.saltito(0.2, 2);
                this.eq = 1;
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 100);
            await esperar(this, 1200);
        },

        estadoExtra: function () {
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), hecha: !!a.hecha }; }),
                ranuras: this.ranuras.slice(), rondaDos: this.rondaDos
            };
        },

        paso: function (time, delta) {
            var L = this.L;
            this.eq = Math.max(0, this.eq - (delta || 16) / 900);
            var h = this.hacesG;
            if (h && h.active) {
                h.clear();
                for (var i = 0; i < 4; i++) {
                    var x0 = L.W * (0.15 + i * 0.23), ang = Math.sin(time / (1300 + i * 200) + i) * 0.5;
                    var tx = x0 + Math.tan(ang) * L.H * 0.7;
                    h.fillStyle(COLORES[i % COLORES.length], 0.1 + 0.12 * this.fiesta + 0.05 * this.eq);
                    h.fillTriangle(x0 - 8, 0, x0 + 8, 0, tx + 90, L.H * 0.78);
                    h.fillTriangle(x0 - 8, 0, tx + 90, L.H * 0.78, tx - 90, L.H * 0.78);
                }
            }
            var e = this.eqG;
            if (e && e.active) {
                e.clear();
                var nB = 28, bw = L.der / nB;
                for (var b = 0; b < nB; b++) {
                    var alto = (6 + Math.abs(Math.sin(time / 200 + b * 0.7)) * 40 * (0.15 + this.eq + this.fiesta * 0.6)) ;
                    e.fillStyle(COLORES[b % COLORES.length], 0.55);
                    e.fillRect(b * bw + 2, L.H * 0.96 - alto, bw - 4, alto);
                }
            }
            this.cosas.forEach(function (a, i) { if (a.cont.active && a.img && !a.hecha && !this.tweens.isTweening(a.img)) a.img.angle = Math.sin(time / 380 + i) * (3 + this.eq * 6); }, this);
        }
    };

    K.crear({ id: 'dj', fondo: '#1a0f3d', escena: escena });
})(typeof window !== 'undefined' ? window : this);
