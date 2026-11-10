/**
 * «El arca de los sonidos» — motor propio de Recuerda los sonidos (5-6 años).
 * Mientras suenan, sombras suben por la rampa y entran al arca (no se ve quiénes). Después, en el
 * muelle esperan varios animales y el niño ARRASTRA hasta la puerta del arca a todos los que
 * escuchó: suben por la rampa y asoman por las ventanas. Cuando están todos, el arca se ilumina y
 * cada uno suena otra vez.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () { this.cosas = []; this.abordo = []; this.reunidos = []; },

        filtrarPool: function (pool) { return pool.filter(function (id) { return K.ANIMALES.indexOf(id) >= 0; }); },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            L.der = L.pres ? W - 150 : W - 16;
            L.mar = Math.round(H * 0.4);
            L.muelle = Math.round(H * 0.64);
            var aw = Math.min(L.der * 0.62, 420, H * 0.42);
            L.arca = { x: L.der * 0.56, y: L.muelle - 18, w: aw, h: aw * 0.42 };
            L.puerta = { x: L.arca.x - aw * 0.18, y: L.arca.y - L.arca.h * 0.62 };
            L.tam = Math.max(56, Math.min(110, (L.der - 30) / 6.2, H * 0.13));
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.mar, arboles: [], solX: 0.12, nubes: 4 });
                V.pajaros(2, 40, L.mar * 0.6);
            }
            // Mar con olas y muelle de madera.
            K.textura(this, 'arca_mar', L.W, L.muelle - L.mar + 20, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#1971c2');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 3;
                for (var yy = 14; yy < h; yy += 22) { x.beginPath(); for (var xx = 0; xx <= w; xx += 20) x.lineTo(xx, yy + Math.sin(xx / 22 + yy) * 4); x.stroke(); }
            });
            keep(this.add.image(0, L.mar, 'arca_mar').setOrigin(0, 0).setDepth(2));
            K.textura(this, 'arca_muelle', L.W, L.H - L.muelle, function (x, w, h) {
                K.madera(x, 0, 0, w, h, { r: 0, claro: '#d39a55', medio: '#b97c3a', oscuro: '#87521f' });
                x.strokeStyle = 'rgba(70,35,10,0.4)'; x.lineWidth = 2;
                for (var xx = 0; xx < w; xx += 48) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, h); x.stroke(); }
            });
            keep(this.add.image(0, L.muelle, 'arca_muelle').setOrigin(0, 0).setDepth(4));
            this.montarArca(keep);
            this.montarHud(keep);
            if (reubicar) this.ubicarCosas();
        },

        montarArca: function (keep) {
            var A = this.L.arca, w = A.w, h = A.h;
            var c = keep(this.add.container(A.x, A.y).setDepth(10));
            var g = this.add.graphics();
            // Casco.
            g.fillStyle(0x8c5a2b, 1);
            g.beginPath(); g.moveTo(-w / 2, -h * 0.55); g.lineTo(w / 2, -h * 0.55); g.lineTo(w * 0.38, 0); g.lineTo(-w * 0.38, 0); g.closePath(); g.fillPath();
            g.lineStyle(3, 0x5c3613, 1);
            for (var k = 1; k < 4; k++) g.lineBetween(-w * (0.5 - k * 0.03), -h * 0.55 + h * 0.14 * k, w * (0.5 - k * 0.03), -h * 0.55 + h * 0.14 * k);
            // Casita de cubierta con techo.
            g.fillStyle(0xd08c47, 1); g.fillRect(-w * 0.32, -h * 1.15, w * 0.64, h * 0.6);
            g.fillStyle(0xc92a2a, 1);
            g.beginPath(); g.moveTo(-w * 0.38, -h * 1.15); g.lineTo(0, -h * 1.5); g.lineTo(w * 0.38, -h * 1.15); g.closePath(); g.fillPath();
            // Puerta.
            g.fillStyle(0x5c3613, 1); g.fillRoundedRect(-w * 0.18 - w * 0.07, -h * 0.98, w * 0.14, h * 0.43, { tl: 10, tr: 10, bl: 0, br: 0 });
            c.add(g);
            // Ventanas (donde asoman los que suben).
            this.ventanas = [];
            for (var i = 0; i < 4; i++) {
                var vx = -w * 0.04 + i * w * 0.085;
                var v = this.add.rectangle(vx, -h * 0.85, w * 0.065, h * 0.2, 0x343a40).setStrokeStyle(2, 0xffe066);
                c.add(v);
                this.ventanas.push({ x: A.x + vx, y: A.y - h * 0.85, r: v });
            }
            this.arca = c;
            // Rampa del muelle a la puerta.
            var r = keep(this.add.graphics().setDepth(11));   // delante del casco: se ve apoyada en la cubierta
            var P = this.L.puerta;
            r.lineStyle(14, 0xa47148, 1); r.lineBetween(P.x - w * 0.32, this.L.muelle + 6, P.x, P.y + h * 0.2);
            r.lineStyle(2, 0x5c3613, 1);
            for (var t = 0.1; t < 1; t += 0.15) { var rx = P.x - w * 0.32 + (w * 0.32) * t, ry = this.L.muelle + 6 + (P.y + h * 0.2 - this.L.muelle - 6) * t; r.lineBetween(rx - 7, ry - 4, rx + 7, ry + 4); }
        },

        alSonar: function () {
            var self = this;
            var L = this.L, P = L.puerta, A = L.arca;
            var t = L.tam * 0.5;
            var sombra = this.add.ellipse(P.x - A.w * 0.32, L.muelle - t * 0.3, t, t * 0.8, 0x343a40, 0.85).setDepth(11);
            this.tweens.add({ targets: sombra, x: P.x, y: P.y + A.h * 0.1, scale: 0.4, alpha: 0, duration: 650, ease: 'Sine.easeIn', onComplete: function () { sombra.destroy(); } });
            this.tweens.add({ targets: this.arca, angle: 1.2, duration: 160, yoyo: true, repeat: 1 });
        },

        lugares: function (n) {
            var L = this.L;
            var porFila = n > 5 ? Math.ceil(n / 2) : n;
            var filas = Math.ceil(n / porFila);
            var out = [];
            for (var i = 0; i < n; i++) {
                var f = Math.floor(i / porFila), k = i % porFila;
                var enFila = f === filas - 1 ? n - f * porFila : porFila;
                out.push({ x: 16 + (L.der - 32) * (k + 0.5) / enFila, y: L.muelle + (L.H - L.muelle) * (filas === 1 ? 0.5 : 0.3 + f * 0.42) });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.casa = lug[i]; if (!a.usada) a.cont.setPosition(lug[i].x, lug[i].y); });
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }).concat(this.abordo));
            this.cosas = [];
            this.abordo = [];
            this.ventanas.forEach(function (v) { v.r.setFillStyle(0x343a40); });
        },

        mostrarOpciones: async function (nv) {
            var n = nv.opciones.length;
            var lug = this.lugares(n);
            var porFila = n > 5 ? Math.ceil(n / 2) : n;
            var tam = Math.min(this.L.tam, (this.L.der - 32) / porFila * 0.85);
            this.cosas = await this.filaDeCosas(nv.opciones, lug, tam, { depth: 30 });
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            if (!this.tomar(p, this.cosas)) {
                var b = this.cosaEn(this.cosas, p.x, p.y);
                if (b && !this.sonando) this.sonar(b.id, { breve: true, bocina: false });
            }
        },
        alMover: function (p) { this.llevar(p); },

        alSoltar: async function () {
            var a = this.soltar();
            if (!a) return;
            var L = this.L, P = L.puerta, A = L.arca;
            var cerca = Math.abs(a.cont.x - A.x) < A.w * 0.55 && a.cont.y < L.muelle + 10 && a.cont.y > P.y - A.h * 0.8;
            if (!cerca || this.fase !== 'jugar') { this.aCasa(a); return; }
            this.tocado = a;
            var r = await this.marcar(a.id, { x: P.x, y: P.y });
            if (r === 'mal') { this.aCasa(a, true); return; }
            if (r === 'repetido') { this.aCasa(a); return; }
            if (r === 'bien') await this.subir(a);
        },

        /** Sube por la rampa, entra y asoma por una ventana. */
        subir: async function (a) {
            var L = this.L, P = L.puerta, A = L.arca;
            if (a.usada) return;
            a.usada = true;
            this.abordo.push(a);
            await this.saltarA(a.cont, P.x - A.w * 0.32, L.muelle - a.tam * 0.2, { ms: 300, alto: 30 });
            await tw(this, { targets: a.cont, x: P.x, y: P.y + A.h * 0.1, scale: 0.4, alpha: 0.3, duration: 420, ease: 'Sine.easeIn' });
            var v = this.ventanas[(this.abordo.length - 1) % this.ventanas.length];
            v.r.setFillStyle(0xfff3bf);
            a.cont.setPosition(v.x, v.y).setScale(A.h * 0.24 / a.tam * 1.6).setAlpha(1).setDepth(11);
            a.sombra.setVisible(false);
            K.ruido({ f: 300, q: 1, dur: 0.12, vol: 0.08 });
        },

        alAcertar: async function () {
            if (this.tocado) await this.subir(this.tocado);
            var A = this.L.arca;
            var luz = this.add.ellipse(A.x, A.y - A.h * 0.8, A.w * 1.1, A.h * 1.4, 0xfff3bf, 0).setDepth(9);
            this.tweens.add({ targets: luz, fillAlpha: 0.55, duration: 300, yoyo: true, hold: 1400, onComplete: function () { luz.destroy(); } });
            for (var i = 0; i < this.abordo.length; i++) {
                var a = this.abordo[i];
                this.reunidos.push(a.id);
                a.saltito(0.25, 1);
                await this.sonar(a.id, { breve: true, bocina: false });
            }
        },

        alFallar: async function () { if (this.tocado) await this.tocado.sacudir(); },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }).concat(this.abordo));
            this.cosas = [];
            this.abordo = [];
            this.ventanas.forEach(function (v) { v.r.setFillStyle(0x343a40); });
        },

        mostrarPista: function (cancelada) {
            return this.pistaArrastre(cancelada, this.cosas, this.L.puerta);
        },

        /* ── Escena final: el arca zarpa con todos ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, A = L.arca;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            // Todos asoman por la borda.
            var asomados = ids.map(function (id, i) {
                var a = self.crearCosa(id, A.x - A.w * 0.4 + A.w * 0.8 * (i + 0.5) / ids.length, A.y - A.h * 0.62, Math.min(L.tam * 0.7, A.w / ids.length * 0.9), { sinSombra: true, depth: 9 });
                a.cont.setScale(0.2);
                self.tweens.add({ targets: a.cont, scale: 1, duration: 300, delay: i * 80, ease: 'Back.easeOut' });
                return a;
            });
            await esperar(this, 500 + ids.length * 80);
            // Zarpa: el arca y los pasajeros se van mar adentro, meciéndose.
            var todos = [this.arca].concat(asomados.map(function (a) { return a.cont; }));
            this.tweens.add({ targets: todos, y: '-=6', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            K.tono({ f: 300, f2: 220, dur: 0.8, vol: 0.06, tipo: 'triangle' });   // bocina del barco
            for (var i = 0; i < ids.length; i++) {
                this.sonar(ids[i], { breve: true, bocina: false });
                asomados[i].saltito(0.2, 1);
                await esperar(this, 420);
                if (!this.sigue()) return;
            }
            await tw(this, { targets: todos, x: '+=' + (L.W * 0.9), duration: 2600, ease: 'Sine.easeIn' });
        },

        /** Demo: la mano sube al arca al que sonó. */
        demoPaso: function () {
            return this.pasoArrastre(this.correctaDe(this.cosas), this.L.puerta);
        },

        estadoExtra: function () {
            var P = this.L.puerta;
            return {
                puerta: { x: Math.round(P.x), y: Math.round(P.y) },
                cosas: this.cosas.filter(function (a) { return !a.usada && a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        }
    };

    K.crear({ id: 'arca', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
