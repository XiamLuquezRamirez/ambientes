/**
 * «El tren de los sonidos» — motor propio de ¿Qué sonido desapareció? (3-4 años).
 * Llega un tren con vagones tapados: cada vagón se sacude y se ilumina cuando suena su sonido (sin
 * mostrar qué lleva). El tren se va y vuelve con un vagón menos y un vagón vacío al final. En el andén
 * esperan todos; el niño ARRASTRA al que se perdió hasta el vagón vacío y el tren pita contento.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];

    var escena = {
        iniciar: function () { this.cosas = []; this.tren = null; this.reunidos = []; this.humo = 0; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 78, piso: H - 104, alto: Math.min(170, H * 0.3), modelo: 'nina' } : null;
            L.der = L.pres ? W - 160 : W - 16;
            L.via = Math.round(H * 0.5);
            L.tam = Math.max(60, Math.min(120, (L.der - 20) / 5.2, H * 0.16));
            L.anden = { y: L.via + L.tam * 0.55, h: H - (L.via + L.tam * 0.55) };
            L.fila = L.anden.y + L.anden.h * 0.48;
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) V.parque({ horizonte: L.via - L.tam * 0.6, arboles: [0.05, 0.3, 0.7, 0.95], solX: 0.12 });
            K.textura(this, 'tren_suelo', L.W, L.H - L.via + L.tam * 0.6, function (x, w, h) {
                x.fillStyle = '#8ce99a'; x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h * 0.5, Math.round(w * h / 500), ['#69db7c', '#b2f2bb'], 1.4, 0.4);
                // Vía: durmientes y rieles.
                var vy = L.tam * 0.6;
                x.fillStyle = '#a1887f'; x.fillRect(0, vy - 6, w, 24);
                x.fillStyle = '#6d4c41'; for (var dx = 0; dx < w; dx += 18) x.fillRect(dx, vy - 8, 9, 26);
                x.fillStyle = '#adb5bd'; x.fillRect(0, vy - 4, w, 4); x.fillRect(0, vy + 12, w, 4);
                // Andén de baldosas.
                var ay = L.anden.y - L.via + L.tam * 0.6;
                x.fillStyle = '#dee2e6'; x.fillRect(0, ay, w, h - ay);
                x.fillStyle = '#fcc419'; x.fillRect(0, ay, w, 8);
                x.strokeStyle = 'rgba(0,0,0,0.08)'; x.lineWidth = 2;
                for (var bx = 0; bx < w; bx += 46) { x.beginPath(); x.moveTo(bx, ay + 8); x.lineTo(bx, h); x.stroke(); }
            });
            keep(this.add.image(0, L.via - L.tam * 0.6, 'tren_suelo').setOrigin(0, 0).setDepth(3));
            this.montarHud(keep);
            if (reubicar && this.tren) this.tren.cont.setY(L.via);
        },

        /* ── El tren ── */

        /** Locomotora + n vagones tapados (+ un vagón vacío al final si vacio). */
        armarTren: function (n, vacio) {
            var self = this;
            var L = this.L;
            if (this.tren) this.tren.cont.destroy();
            var ww = Math.min(L.tam * 0.95, (L.der - 40) / (n + 2.4));
            var wh = ww * 0.7;
            var c = this.add.container(-L.W, L.via).setDepth(20);
            var vagones = [];
            var total = n + (vacio ? 1 : 0);
            for (var i = 0; i < total; i++) {
                var esVacio = vacio && i === total - 1;
                var v = this.add.container(-(i + 1) * (ww + 8), 0);
                var g = this.add.graphics();
                var col = COLORES[i % COLORES.length];
                g.fillStyle(0x343a40, 1); g.fillCircle(-ww * 0.28, 0, wh * 0.18); g.fillCircle(ww * 0.28, 0, wh * 0.18);
                if (esVacio) {
                    // Plataforma abierta: aquí se sube el que se perdió.
                    g.fillStyle(0x8c5a2b, 1); g.fillRoundedRect(-ww / 2, -wh * 0.3, ww, wh * 0.2, 4);
                    g.lineStyle(3, 0xffd43b, 1); g.strokeRoundedRect(-ww / 2, -wh * 0.95, ww, wh * 0.85, 8);
                } else {
                    g.fillStyle(col, 1); g.fillRoundedRect(-ww / 2, -wh, ww, wh * 0.85, 8);
                    // Lona que tapa la carga (no se ve qué lleva).
                    g.fillStyle(0xf1f3f5, 1); g.fillRoundedRect(-ww * 0.44, -wh * 1.18, ww * 0.88, wh * 0.4, wh * 0.18);
                    g.lineStyle(2, 0xadb5bd, 1); g.lineBetween(-ww * 0.3, -wh * 1.1, -ww * 0.3, -wh * 0.8); g.lineBetween(ww * 0.3, -wh * 1.1, ww * 0.3, -wh * 0.8);
                }
                g.lineStyle(3, 0x495057, 1); g.lineBetween(ww / 2, -wh * 0.25, ww / 2 + 8, -wh * 0.25);
                var luz = this.add.ellipse(0, -wh * 0.6, ww * 1.2, wh * 1.3, 0xfff3bf, 0);
                v.add([luz, g]);
                v.luz = luz; v.vacio = esVacio;
                vagones.push(v);
                c.add(v);
            }
            // Locomotora adelante (a la derecha).
            var lw = ww * 1.25, lh = wh * 1.2;
            var loco = this.add.graphics();
            loco.fillStyle(0x343a40, 1); loco.fillCircle(-lw * 0.25, 0, lh * 0.2); loco.fillCircle(lw * 0.25, 0, lh * 0.2);
            loco.fillStyle(0x2b8a3e, 1); loco.fillRoundedRect(-lw / 2, -lh * 0.8, lw * 0.6, lh * 0.65, 6);
            loco.fillStyle(0xe03131, 1); loco.fillRoundedRect(-lw / 2, -lh * 1.25, lw * 0.42, lh * 0.5, 6);
            loco.fillStyle(0xa5d8ff, 1); loco.fillRoundedRect(-lw * 0.42, -lh * 1.15, lw * 0.26, lh * 0.25, 4);
            loco.fillStyle(0x2b8a3e, 1); loco.fillRoundedRect(lw * 0.08, -lh * 0.65, lw * 0.42, lh * 0.5, lh * 0.25);
            loco.fillStyle(0x495057, 1); loco.fillRect(lw * 0.28, -lh * 1.05, lw * 0.12, lh * 0.42);
            loco.fillStyle(0xffd43b, 1); loco.fillCircle(lw * 0.5, -lh * 0.4, lh * 0.08);
            c.add(loco);
            this.tren = { cont: c, vagones: vagones, ww: ww, wh: wh, largo: total * (ww + 8) + lw };
            this.chimenea = { dx: lw * 0.34, dy: -lh * 1.05 };
            return this.tren;
        },

        /** Mueve el tren de x0 a x1 (posición de la locomotora) con traqueteo y humo. */
        andar: function (x0, x1, ms) {
            var t = this.tren;
            t.cont.x = x0;
            this.humo = 1;
            var self = this;
            K.ruido({ f: 260, q: 0.9, dur: Math.min(1.2, ms / 1000), vol: 0.07 });
            return tw(this, { targets: t.cont, x: x1, duration: ms, ease: 'Sine.easeInOut' }).then(function () { self.humo = 0; });
        },

        silbato: function () { K.tono({ f: 880, f2: 1040, dur: 0.35, vol: 0.06, tipo: 'triangle' }); },

        centroTren: function () {
            var L = this.L;
            return L.der / 2 + this.tren.largo / 2 - this.tren.ww * 0.4;
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.armarTren(nv.reproducciones[0].length, false);
            this.silbato();
            await this.andar(-this.L.W * 0.2, this.centroTren(), 1500);
        },

        /** El vagón k (de izquierda a derecha según el orden) se sacude y se ilumina mientras suena. */
        alSonar: function (id, k) {
            var t = this.tren;
            var vs = t.vagones.filter(function (v) { return !v.vacio; });
            var v = vs[vs.length - 1 - k];   // el primero que suena es el más cercano a la locomotora
            if (!v) return;
            this.tweens.add({ targets: v.luz, fillAlpha: 0.7, duration: 160, yoyo: true, hold: 500 });
            this.tweens.add({ targets: v, y: -8, duration: 120, yoyo: true, repeat: 2 });
        },

        alTerminarVuelta: async function (v) {
            if (v !== 0) return;
            this.silbato();
            await this.andar(this.tren.cont.x, this.L.W + this.tren.largo, 1300);
        },

        alSegundaVuelta: async function () {
            var nv = this.nv;
            this.armarTren(nv.reproducciones[1].length, true);
            await esperar(this, 300);
            await this.andar(-this.tren.largo, this.centroTren(), 1600);
        },

        lugares: function (n) {
            var L = this.L;
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: 20 + (L.der - 40) * (i + 0.5) / n, y: L.fila });
            return out;
        },

        mostrarOpciones: async function (nv) {
            var tam = Math.min(this.L.tam, (this.L.der - 40) / nv.opciones.length * 0.85);
            this.cosas = await this.filaDeCosas(nv.opciones, this.lugares(nv.opciones.length), tam, { depth: 30 });
        },

        /** Volver a escuchar: vuelve el tren completo de la primera vuelta. */
        alReescuchar: function (empieza) {
            if (!empieza) return;
            this.armarTren(this.nv.reproducciones[0].length, false);
            this.tren.cont.x = this.centroTren();
        },

        vagonVacio: function () {
            var t = this.tren;
            var v = t.vagones.filter(function (q) { return q.vacio; })[0];
            return v ? { x: t.cont.x + v.x, y: t.cont.y + v.y - t.wh * 0.55 } : null;
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
            var d = this.vagonVacio();
            if (!d || Math.hypot(a.cont.x - d.x, a.cont.y - d.y) > this.tren.ww * 0.9 || this.fase !== 'jugar') { this.aCasa(a); return; }
            this.tocado = a;
            var ok = await this.elegir(a.id, d);
            if (ok === false) this.aCasa(a, true);
        },

        alAcertar: async function () {
            var a = this.tocado;
            var d = this.vagonVacio();
            var t = this.tren;
            // Se sube al vagón vacío y el tren lo engancha.
            await this.saltarA(a.cont, d.x, d.y, { ms: 380, alto: 40, esc: t.ww * 0.95 / a.tam });
            t.cont.add(a.cont);
            a.cont.setPosition(a.cont.x - t.cont.x, a.cont.y - t.cont.y);
            a.usada = true;
            this.reunidos.push(a.id);
            K.ruido({ f: 1800, q: 3, dur: 0.06, vol: 0.1 });
            this.silbato();
            await Promise.all([this.sonar(a.id, { breve: true, bocina: false }), tw(this, { targets: t.cont, x: t.cont.x + 14, duration: 180, yoyo: true })]);
        },

        alFallar: async function () { if (this.tocado) await this.tocado.sacudir(); },

        alTerminarNivel: async function () {
            this.retirar(this.cosas.filter(function (a) { return !a.usada; }));
            this.cosas = [];
            this.silbato();
            await this.andar(this.tren.cont.x, this.L.W + this.tren.largo, 1400);
        },

        mostrarPista: function (cancelada) {
            var d = this.vagonVacio();
            return d ? this.pistaArrastre(cancelada, this.cosas, d) : Promise.resolve();
        },

        /* ── Escena final: el tren de todos los rescatados da la vuelta ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            var t = this.armarTren(ids.length, false);
            ids.forEach(function (id, i) {
                var v = t.vagones[ids.length - 1 - i];
                var a = self.crearCosa(id, v.x, -t.wh * 1.35, t.ww * 0.95, { sinSombra: true });
                t.cont.add(a.cont);
                a.cont.setPosition(v.x, -t.wh * 1.35);
            });
            this.silbato();
            await this.andar(-t.largo, this.centroTren(), 1800);
            for (var i = 0; i < ids.length; i++) {
                this.alSonar(ids[i], i);
                await this.sonar(ids[i], { breve: true, bocina: false });
                if (!this.sigue()) return;
            }
            this.silbato();
            await this.andar(t.cont.x, L.W + t.largo, 1800);
        },

        /** Demo: la mano sube al que se perdió al vagón vacío. */
        demoPaso: function () {
            return this.pasoArrastre(this.correctaDe(this.cosas), this.vagonVacio());
        },

        estadoExtra: function () {
            var d = this.tren ? this.vagonVacio() : null;
            return {
                vacio: d ? { x: Math.round(d.x), y: Math.round(d.y) } : null,
                cosas: this.cosas.filter(function (a) { return !a.usada && a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        },

        paso: function (time) {
            if (!this.humo || !this.tren || time - (this.ultHumo || 0) < 160) return;
            this.ultHumo = time;
            var t = this.tren;
            Ut.estallido(this, t.cont.x + this.chimenea.dx, t.cont.y + this.chimenea.dy, { n: 2, tex: 'humo', tam: 24, dist: 40, angulo: -Math.PI / 2, abanico: 0.6, depth: 25 });
        }
    };

    K.crear({ id: 'tren', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
