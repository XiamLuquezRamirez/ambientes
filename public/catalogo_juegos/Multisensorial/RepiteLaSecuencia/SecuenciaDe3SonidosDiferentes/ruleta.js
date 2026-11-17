/**
 * «La ruleta de la feria» — motor propio de Secuencia de 3 Sonidos Diferentes (5-6 años).
 *
 * Una noria de feria gira sin parar. Mientras suena el código, los focos de su borde se encienden
 * uno a uno (no dicen cuáles son). Después las cabinas, cada una con un sonido, empiezan a girar y
 * el niño debe TOCAR cada cabina cuando pasa, en el mismo orden en que sonó. Cada acierto se anota
 * en el tablero de abajo y la noria gira más rápido en cada nivel. Si toca una equivocada, la noria
 * se sacude, el tablero se borra y el código suena otra vez.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.ang = 0;
            this.omega = 0.3;
            this.focoOn = -1;
            this.miniaturas = [];
            this.ranuras = [];
            this.celebra = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.suelo = Math.round(H * 0.82);
            L.R = Math.max(110, Math.min(H * 0.3, L.der * 0.22));
            L.cx = Math.round(L.der * 0.5);
            L.cy = Math.round(L.suelo - L.R - L.R * 0.35);
            L.tam = Math.max(70, Math.min(100, L.R * 0.62));
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.suelo - 50, arboles: [0.04, 0.96], solX: 0.12 });
                V.globos && V.globos({ x: 0, y: 40, w: L.W, h: L.suelo * 0.5 });
            }
            var g = keep(this.add.graphics().setDepth(1.6));
            g.fillStyle(0xf4a261, 1); g.fillRect(0, L.suelo - 30, L.W, L.H - L.suelo + 30);
            g.fillStyle(0xe76f51, 1); g.fillRect(0, L.suelo - 30, L.W, 8);
            // Banderines de feria.
            var ban = keep(this.add.graphics().setDepth(2));
            ban.lineStyle(3, 0x6d4c41, 1); ban.lineBetween(0, 30, L.W, 30);
            for (var b = 0; b < L.W; b += 44) { ban.fillStyle(COLORES[(b / 44) % COLORES.length | 0], 1); ban.fillTriangle(b, 30, b + 34, 30, b + 17, 62); }
            // Patas de la noria.
            var pat = keep(this.add.graphics().setDepth(4));
            pat.lineStyle(L.R * 0.07, 0x7a4a1c, 1);
            pat.lineBetween(L.cx, L.cy, L.cx - L.R * 0.75, L.suelo - 24);
            pat.lineBetween(L.cx, L.cy, L.cx + L.R * 0.75, L.suelo - 24);
            pat.fillStyle(0x495057, 1); pat.fillRoundedRect(L.cx - L.R * 1.0, L.suelo - 30, L.R * 2, 16, 6);
            this.ruedaG = keep(this.add.graphics().setDepth(5));
            this.tablero(keep);
            this.montarHud(keep);
            this.sembrarMotes(keep, 12, { x: 0, y: 40, w: L.W, h: L.suelo - 60, depth: 8 }, 0xfff3bf);
            if (reubicar) this.redibujarMiniaturas();
        },

        /* ── Tablero de aciertos (franja de abajo) ── */

        tablero: function (keep) {
            var L = this.L;
            this.tableroG = keep(this.add.graphics().setDepth(14));
            this.dibujarTablero();
        },

        celdaX: function (i, n) {
            var L = this.L;
            var w = Math.min(L.R * 2.2, n * 78);
            return L.cx - w / 2 + (w / n) * (i + 0.5);
        },

        dibujarTablero: function () {
            var L = this.L, g = this.tableroG, n = this.ranuras.length;
            if (!g || !g.active) return;
            g.clear();
            if (!n) return;
            var y = L.suelo + (L.H - L.suelo) * 0.55, w = Math.min(L.R * 2.2, n * 78);
            g.fillStyle(0x12263f, 0.7); g.fillRoundedRect(L.cx - w / 2 - 10, y - 38, w + 20, 76, 16);
            for (var i = 0; i < n; i++) {
                var x = this.celdaX(i, n);
                g.fillStyle(this.ranuras[i] ? 0x2b8a3e : 0x31475e, 1); g.fillRoundedRect(x - 31, y - 31, 62, 62, 12);
            }
        },

        redibujarMiniaturas: function () {
            var L = this.L, n = this.ranuras.length, y = L.suelo + (L.H - L.suelo) * 0.55;
            this.miniaturas.forEach(function (m, i) { if (m && m.active) m.setPosition(this.celdaX(i, n), y); }, this);
        },

        limpiarMiniaturas: function () {
            this.miniaturas.forEach(function (m) { if (m && m.active) m.destroy(); });
            this.miniaturas = [];
        },

        /* ── Cabinas ── */

        crearCabina: function (id, i, tam) {
            var a = this.crearCosa(id, -300, -300, tam * 0.62, { depth: 30, sinSombra: true });
            var g = this.add.graphics();
            var col = COLORES[i % COLORES.length];
            g.fillStyle(0x000000, 0.18); g.fillRoundedRect(-tam * 0.5 + 3, -tam * 0.5 + 6, tam, tam, 16);
            g.fillStyle(col, 1); g.fillRoundedRect(-tam * 0.5, -tam * 0.5, tam, tam, 16);
            g.fillStyle(0xffffff, 1); g.fillRoundedRect(-tam * 0.42, -tam * 0.42, tam * 0.84, tam * 0.84, 12);
            g.lineStyle(4, col, 1); g.strokeRoundedRect(-tam * 0.42, -tam * 0.42, tam * 0.84, tam * 0.84, 12);
            g.fillStyle(0x495057, 1); g.fillRect(-4, -tam * 0.5 - 14, 8, 14);
            var luz = this.add.graphics(); luz.fillStyle(0x69db7c, 1); luz.fillRoundedRect(-tam * 0.42, -tam * 0.42, tam * 0.84, tam * 0.84, 12); luz.setAlpha(0);
            a.cont.addAt(g, 0); a.cont.addAt(luz, 1);
            a.luz = luz; a.tam = tam; a.fase = (Math.PI * 2 * i) / 6 + 0.4;
            a.cont.setAlpha(0);
            return a;
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            this.cosas = nv.opciones.map(function (id, i) { var a = self.crearCabina(id, i, self.L.tam); a.slot = i; return a; });
            this.omega = 0.28 + (this.nivelActual || 0) * 0.1;
            this.colocarCabinas();
            K.ruido({ f: 1300, q: 1, dur: 0.1, vol: 0.05 });
            this.cosas.forEach(function (a, i) { self.tweens.add({ targets: a.cont, alpha: 1, duration: 450, delay: i * 120 }); });
            await esperar(this, 500 + n * 110);
        },

        colocarCabinas: function () {
            var self = this, n = this.cosas.length, L = this.L;
            this.cosas.forEach(function (a, i) {
                var th = self.ang + (Math.PI * 2 * i) / n;
                a.cont.x = L.cx + Math.cos(th) * L.R;
                a.cont.y = L.cy + Math.sin(th) * L.R + L.tam * 0.55;
            });
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.limpiarMiniaturas();
            this.ranuras = nv.reproducciones[0].map(function () { return null; });
            this.dibujarTablero();
            this.omega = 0.3;
        },

        alSonar: function (id, k) {
            this.focoOn = k;
            this.focoT = this.time.now;
            K.tono({ f: 700 + k * 100, dur: 0.05, vol: 0.03 });
        },

        /* ── Tocar cabinas al pasar ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.L.tam * 0.7);
            if (!a || a.hecha) return;
            this.pista.reiniciar();
            await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
        },

        alMarcar: async function (id, k) {
            var a = this.tocado, L = this.L;
            a.hecha = true;
            a.luz.setAlpha(0.9);
            this.tweens.add({ targets: a.luz, alpha: 0.4, duration: 500 });
            this.ranuras[k] = id;
            this.dibujarTablero();
            var n = this.ranuras.length, y = L.suelo + (L.H - L.suelo) * 0.55;
            var m = this.add.image(a.cont.x, a.cont.y, 'el_' + id).setDepth(16);
            var esc = 52 / Math.max(m.width, m.height);
            m.setScale(esc * 1.6);
            this.miniaturas[k] = m;
            Ut.estallido(this, a.cont.x, a.cont.y, { n: 8, tex: 'estrella', tam: 22, dist: 100, depth: 70, sinTinte: true });
            await tw(this, { targets: m, x: this.celdaX(k, n), y: y, scale: esc, duration: 420, ease: 'Cubic.easeOut' });
        },

        alFallar: async function () {
            var a = this.tocado;
            this.cameras.main.shake(220, 0.005);
            K.tono({ f: 300, f2: 170, dur: 0.25, vol: 0.05 });
            var viejo = this.omega;
            this.omega = 0.02;
            if (a) await a.sacudir();
            this.omega = viejo;
        },

        alReiniciar: async function () {
            this.cosas.forEach(function (a) { a.hecha = false; if (a.luz) a.luz.setAlpha(0); });
            this.limpiarMiniaturas();
            this.ranuras = this.ranuras.map(function () { return null; });
            this.dibujarTablero();
        },

        alAcertar: async function () {
            var nv = this.nv;
            this.omega = 1.4;
            for (var k = 0; k < nv.correctas.length; k++) {
                if (!this.sigue()) return;
                this.reunidos.push(nv.correctas[k]);
                var a = this.cosas.filter(function (q) { return q.id === nv.correctas[k]; })[0];
                if (a) { a.luz.fillColor = 0xffd43b; a.luz.setAlpha(0.9); a.latir(); Ut.estallido(this, a.cont.x, a.cont.y, { n: 10, tex: 'estrella', tam: 26, dist: 120, depth: 70, sinTinte: true }); }
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 100);
            }
            this.celebra = 1;
            Ut.confeti(this, 60);
            await esperar(this, 600);
            this.celebra = 0;
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            this.limpiarMiniaturas();
            this.ranuras = [];
            this.dibujarTablero();
        },

        mostrarPista: function (cancelada) { return this.pistaToque(cancelada, this.cosas.filter(function (a) { return !a.hecha; })); },
        demoPaso: function () { return this.demoOrden(this.cosas); },

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.cosas.forEach(function (a) { if (a.cont.active) a.cont.destroy(); });
            this.cosas = [];
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 6);
            if (!ids.length) ids = ['carro', 'campana', 'perro'];
            this.cosas = ids.map(function (id, i) { return self.crearCabina(id, i, L.tam); });
            this.omega = 0.5;
            this.colocarCabinas();
            this.cosas.forEach(function (a, i) { self.tweens.add({ targets: a.cont, alpha: 1, duration: 400, delay: i * 100 }); });
            await esperar(this, 900);
            this.celebra = 1;
            this.omega = 1.0;
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var a = this.cosas[i];
                a.luz.fillColor = 0xffd43b; a.luz.setAlpha(0.9); a.latir();
                Ut.estallido(this, a.cont.x, a.cont.y, { n: 12, tex: 'estrella', tam: 26, dist: 140, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 100);
            await esperar(this, 1200);
        },

        estadoExtra: function () {
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), hecha: !!a.hecha }; }),
                ranuras: this.ranuras.slice(), omega: this.omega
            };
        },

        paso: function (time, delta) {
            var L = this.L, dt = (delta || 16) / 1000;
            this.ang += this.omega * dt;
            if (this.cosas.length) this.colocarCabinas();
            var g = this.ruedaG;
            if (!g || !g.active) return;
            g.clear();
            var R = L.R;
            g.lineStyle(R * 0.06, 0xe9ecef, 1); g.strokeCircle(L.cx, L.cy, R);
            g.lineStyle(R * 0.03, 0xadb5bd, 1); g.strokeCircle(L.cx, L.cy, R * 0.55);
            for (var s = 0; s < 10; s++) {
                var th = this.ang + s * Math.PI / 5;
                g.lineStyle(R * 0.025, 0xced4da, 1);
                g.lineBetween(L.cx, L.cy, L.cx + Math.cos(th) * R, L.cy + Math.sin(th) * R);
            }
            g.fillStyle(0xfcc419, 1); g.fillCircle(L.cx, L.cy, R * 0.12);
            // Focos del borde: se encienden con cada sonido y parpadean en la fiesta.
            var nF = 18;
            for (var i = 0; i < nF; i++) {
                var t = this.ang * 0.6 + (i / nF) * Math.PI * 2;
                var on = (this.celebra && (Math.floor(time / 140) + i) % 3 === 0) || (this.focoOn >= 0 && time - this.focoT < 420 && i % 6 === (this.focoOn % 6));
                g.fillStyle(on ? 0xfff3bf : COLORES[i % COLORES.length], on ? 1 : 0.55);
                g.fillCircle(L.cx + Math.cos(t) * R, L.cy + Math.sin(t) * R, on ? R * 0.045 : R * 0.03);
            }
        }
    };

    K.crear({ id: 'ruleta', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
