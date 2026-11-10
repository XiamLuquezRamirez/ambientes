/**
 * «La canasta del picnic» — motor propio de Recuerda dos sonidos (3-4 años).
 * Los sonidos entran a una canasta cerrada (la tapa se levanta y cae con cada uno, sin mostrar qué
 * es). Después aparecen cosas sobre el mantel y el niño ARRASTRA a la canasta las que escuchó.
 * Al completar, la canasta se abre y las dos (o tres) asoman iluminadas y suenan otra vez.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () { this.cosas = []; this.dentro = []; this.reunidos = []; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 78, piso: H - 104, alto: Math.min(170, H * 0.3), modelo: 'nina' } : null;
            L.der = L.pres ? W - 160 : W - 16;
            L.y0 = Math.round(H * 0.48);
            L.tam = Math.max(64, Math.min(130, (L.der - 20) / 5.4, H * 0.17));
            var cw = Math.min(L.der * 0.42, 240, H * 0.26);
            L.canasta = { x: L.der / 2 + 8, y: L.y0 + (H - L.y0) * 0.22, w: cw, h: cw * 0.62 };
            L.mantel = { x: 16, y: L.canasta.y + L.canasta.h * 0.75, w: L.der - 32, h: H - (L.canasta.y + L.canasta.h * 0.75) - 18 };
            L.fila = L.mantel.y + L.mantel.h * 0.5;
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var V = this.montarVida(keep);
            if (V) {
                V.parque({ horizonte: L.y0, arboles: [0.06, 0.25, 0.75, 0.94], solX: 0.85 });
                V.mariposas(2, { x: 0, y: L.y0 - 40, w: L.W, h: 50, depth: 8 });
            }
            K.textura(this, 'canasta_pasto', L.W, L.H - L.y0 + 10, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#8ce99a'); g.addColorStop(1, '#40c057');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                K.grano(x, 0, 0, w, h, Math.round(w * h / 300), ['#69db7c', '#b2f2bb', '#2f9e44'], 1.6, 0.4);
            });
            keep(this.add.image(0, L.y0 - 4, 'canasta_pasto').setOrigin(0, 0).setDepth(4));
            // Mantel a cuadros (en perspectiva suave).
            var m = L.mantel;
            K.textura(this, 'canasta_mantel', m.w, m.h, function (x, w, h) {
                x.fillStyle = '#fff5f5'; K.rr(x, 0, 0, w, h, 14); x.fill();
                x.save(); K.rr(x, 0, 0, w, h, 14); x.clip();
                var c = Math.max(22, w / 14);
                x.fillStyle = 'rgba(250,82,82,0.55)';
                for (var i = 0; i < w / c; i += 2) x.fillRect(i * c, 0, c, h);
                for (var j = 0; j < h / c; j += 2) x.fillRect(0, j * c, w, c);
                x.restore();
                x.strokeStyle = '#fa5252'; x.lineWidth = 4; K.rr(x, 2, 2, w - 4, h - 4, 12); x.stroke();
            });
            keep(this.add.image(m.x, m.y, 'canasta_mantel').setOrigin(0, 0).setDepth(5));
            this.montarCanasta(keep);
            this.montarHud(keep);
            if (reubicar) this.ubicarCosas();
        },

        montarCanasta: function (keep) {
            var C = this.L.canasta;
            var w = C.w, h = C.h;
            K.textura(this, 'canasta_cuerpo', w + 20, h + 20, function (x) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#e8a35c'); g.addColorStop(1, '#a8682a');
                x.fillStyle = g;
                x.beginPath(); x.moveTo(10, 10); x.lineTo(w + 10, 10); x.lineTo(w - w * 0.06 + 10, h + 10); x.lineTo(w * 0.06 + 10, h + 10); x.closePath(); x.fill();
                // Trenzado de mimbre.
                x.strokeStyle = 'rgba(110,60,20,0.55)'; x.lineWidth = 3;
                for (var yy = 18; yy < h + 6; yy += 12) { x.beginPath(); x.moveTo(12, yy); x.lineTo(w + 8, yy); x.stroke(); }
                for (var xx = 18; xx < w + 6; xx += 14) { x.beginPath(); x.moveTo(xx, 12); x.lineTo(xx + 3, h + 8); x.stroke(); }
            });
            var c = keep(this.add.container(C.x, C.y).setDepth(40));
            var asa = this.add.graphics();
            asa.lineStyle(9, 0x8c5a2b, 1); asa.beginPath(); asa.arc(0, -h * 0.05, w * 0.42, Math.PI, 0); asa.strokePath();
            var cuerpo = this.add.image(0, h * 0.5 - h * 0.5, 'canasta_cuerpo').setOrigin(0.5, 0.5);
            var tapa = this.add.container(-w / 2, -h / 2 + 2);
            var tg = this.add.graphics();
            tg.fillStyle(0xd08c47, 1); tg.fillRoundedRect(0, -10, w, 18, 8);
            tg.lineStyle(2, 0x8c5a2b, 1); tg.strokeRoundedRect(0, -10, w, 18, 8);
            tapa.add(tg);
            c.add([asa, cuerpo, tapa]);
            this.canasta = c;
            this.tapa = tapa;
        },

        abrirTapa: function (ang, ms) { return tw(this, { targets: this.tapa, angle: ang, duration: ms || 220, ease: 'Quad.easeOut' }); },

        alSonar: function () {
            var self = this;
            var C = this.L.canasta;
            // Algo entra a la canasta: chispa que cae y la tapa se levanta y cierra.
            var ch = this.add.circle(C.x + Ut.rnd(-30, 30), C.y - C.h * 1.6, 9, 0xffe066).setDepth(39);
            this.abrirTapa(-50, 180);
            this.tweens.add({ targets: ch, y: C.y - C.h * 0.3, alpha: 0.2, duration: 380, ease: 'Quad.easeIn', onComplete: function () {
                ch.destroy();
                self.abrirTapa(0, 160);
                K.ruido({ f: 300, q: 1, dur: 0.12, vol: 0.1 });
                self.tweens.add({ targets: self.canasta, scaleY: 0.94, duration: 90, yoyo: true });
            } });
        },

        lugares: function (n) {
            var m = this.L.mantel;
            var out = [];
            for (var i = 0; i < n; i++) out.push({ x: m.x + m.w * (i + 0.5) / n, y: this.L.fila });
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.casa = lug[i]; if (!a.usada) a.cont.setPosition(lug[i].x, lug[i].y); });
        },

        prepararNivel: async function () {
            await this.retirar(this.cosas.concat(this.dentro));
            this.cosas = [];
            this.dentro = [];
            this.abrirTapa(0, 150);
        },

        mostrarOpciones: async function (nv) {
            var tam = Math.min(this.L.tam, this.L.mantel.w / nv.opciones.length * 0.8);
            this.cosas = await this.filaDeCosas(nv.opciones, this.lugares(nv.opciones.length), tam, { depth: 30 });
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.tomar(p, this.cosas);
            if (!a) {
                var b = this.cosaEn(this.cosas, p.x, p.y);
                if (b && !this.sonando) this.sonar(b.id, { breve: true, bocina: false });
            }
        },
        alMover: function (p) { this.llevar(p); },

        alSoltar: async function () {
            var a = this.soltar();
            if (!a) return;
            var C = this.L.canasta;
            var dentro = Math.abs(a.cont.x - C.x) < C.w * 0.62 && Math.abs(a.cont.y - C.y) < C.h * 1.2;
            if (!dentro || this.fase !== 'jugar') { this.aCasa(a); return; }
            this.tocado = a;
            var r = await this.marcar(a.id, { x: C.x, y: C.y - C.h * 0.4 });
            if (r === 'mal') { this.aCasa(a, true); return; }
            if (r === 'repetido') { this.aCasa(a); return; }
            // 'listo': el último ya lo metió alAcertar (antes de abrir la canasta).
            if (r === 'bien') this.meter(a);
        },

        /** Entra a la canasta: sube, la tapa se abre y cae adentro. */
        meter: async function (a) {
            var C = this.L.canasta;
            a.usada = true;
            this.dentro.push(a);
            if (this.dentro.length > 1 || this.fase !== 'premio') this.abrirTapa(-70, 160);
            await this.saltarA(a.cont, C.x + (this.dentro.length - 1.5) * C.w * 0.22, C.y - C.h * 0.25, { ms: 380, alto: 50, esc: 0.55 });
            a.cont.setDepth(38);
            K.ruido({ f: 260, q: 1, dur: 0.14, vol: 0.12 });
            if (this.fase !== 'premio') this.abrirTapa(0, 160);
        },

        alAcertar: async function (ids) {
            var self = this;
            var C = this.L.canasta;
            if (this.tocado && this.dentro.indexOf(this.tocado) < 0) await this.meter(this.tocado);
            // La canasta se abre y asoman todos iluminados; suenan otra vez.
            await this.abrirTapa(-110, 260);
            var luz = this.add.circle(C.x, C.y - C.h * 0.3, C.w * 0.6, 0xfff3bf, 0).setDepth(37);
            this.tweens.add({ targets: luz, fillAlpha: 0.6, duration: 300, yoyo: true, hold: 900, onComplete: function () { luz.destroy(); } });
            var n = this.dentro.length;
            this.dentro.forEach(function (a, i) {
                a.cont.setDepth(41);
                self.tweens.add({ targets: a.cont, y: C.y - C.h * 0.75, x: C.x + (i - (n - 1) / 2) * C.w * 0.4, scale: 0.85, duration: 380, ease: 'Back.easeOut' });
            });
            await esperar(this, 400);
            for (var i = 0; i < n; i++) {
                this.dentro[i].saltito(0.15, 1);
                this.reunidos.push(this.dentro[i].id);
                await this.sonar(this.dentro[i].id, { breve: true, bocina: false });
            }
        },

        alFallar: async function () { if (this.tocado) await this.tocado.sacudir(); },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }).concat(this.dentro));
            this.cosas = [];
            this.dentro = [];
            await this.abrirTapa(0, 200);
        },

        mostrarPista: function (cancelada) {
            var C = this.L.canasta;
            return this.pistaArrastre(cancelada, this.cosas, { x: C.x, y: C.y });
        },

        /* ── Escena final: el gran picnic ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, C = L.canasta, m = L.mantel;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            await this.abrirTapa(-110, 300);
            var n = ids.length;
            var tam = Math.min(L.tam * 0.9, m.w / Math.max(4, n) * 0.95);
            var amigos = [];
            for (var i = 0; i < n; i++) {
                var a = this.crearCosa(ids[i], C.x, C.y - C.h * 0.2, tam, { depth: 42 });
                a.cont.setScale(0.4);
                // Salen de la canasta y se sientan alrededor del mantel.
                var ang = Math.PI + (i + 0.5) / n * Math.PI;
                var x = m.x + m.w / 2 + Math.cos(ang) * m.w * 0.42;
                var y = m.y + m.h * 0.55 - Math.sin(ang) * m.h * 0.1;
                K.tono({ f: 500 + i * 70, f2: 900 + i * 70, dur: 0.12, vol: 0.04 });
                await this.saltarA(a.cont, x, y, { ms: 420, alto: L.tam * 0.8, esc: 1 });
                amigos.push(a);
                this.sonar(ids[i], { breve: true, bocina: false });
                await esperar(this, 260);
                if (!this.sigue()) return;
            }
            // Todos brindan a la vez y vuelan corazones.
            amigos.forEach(function (a, k) { self.time.delayedCall(k * 90, function () { a.saltito(0.2, 2); }); });
            Ut.estallido(this, C.x, C.y - C.h * 0.5, { n: 14, tex: 'corazon', tam: 26, dist: 160, depth: 60 });
            await esperar(this, 1200);
        },

        /** Demo: la mano mete en la canasta lo que sonó. */
        demoPaso: function () {
            var C = this.L.canasta;
            return this.pasoArrastre(this.correctaDe(this.cosas), { x: C.x, y: C.y });
        },

        estadoExtra: function () {
            var C = this.L.canasta;
            return {
                canasta: { x: Math.round(C.x), y: Math.round(C.y) },
                cosas: this.cosas.filter(function (a) { return !a.usada && a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        }
    };

    K.crear({ id: 'canasta', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
