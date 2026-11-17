/**
 * «La caja fuerte del código» — motor propio de Secuencia de 3 Sonidos (5-6 años, misión sonora).
 *
 * Una caja fuerte en una sala de rayos láser. Mientras suena el código secreto, las lámparas de su
 * pantalla se encienden una a una (no dicen cuáles son). Después aparece el teclado con los botones
 * de los sonidos (también uno que no era del código) y el niño marca el código en el mismo orden:
 * cada botón suena y su imagen queda registrada en la pantalla. Si se equivoca, suena la alarma,
 * la pantalla se borra y el código se escucha otra vez. Al completarlo, la puerta se abre.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.ranuras = [];
            this.reunidos = [];
            this.alarma = 0;
            this.abierta = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.suelo = Math.round(H * 0.88);
            L.R = Math.max(90, Math.min(H * 0.24, L.der * 0.17));
            L.cx = Math.round(Math.max(L.R * 1.6, L.der * 0.28));
            L.cy = Math.round(H * 0.56);
            L.tam = Math.max(78, Math.min(120, (L.der - L.cx - L.R * 1.6) / 3.2, H * 0.17));
            L.teclado = { x: Math.round((L.cx + L.R * 1.6 + L.der) / 2), y: Math.round(H * 0.58) };
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            var self = this;
            K.textura(this, 'caja_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#1b3a4b'); g.addColorStop(0.7, '#26566e'); g.addColorStop(1, '#2f6f86');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = 2;
                for (var i = 0; i < w; i += 70) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, L.suelo); x.stroke(); }
                for (var j = 0; j < L.suelo; j += 70) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
                x.fillStyle = '#12303f'; x.fillRect(0, L.suelo, w, h - L.suelo);
                x.fillStyle = 'rgba(255,255,255,0.08)';
                for (var k = 0; k < w; k += 90) x.fillRect(k, L.suelo + 6, 50, 6);
                // Franjas de peligro en el suelo.
                x.fillStyle = '#fcc419';
                for (var m = 0; m < w; m += 60) { x.beginPath(); x.moveTo(m, h); x.lineTo(m + 30, h); x.lineTo(m + 50, h - 12); x.lineTo(m + 20, h - 12); x.fill(); }
            });
            keep(this.add.image(0, 0, 'caja_fondo').setOrigin(0, 0).setDepth(1));
            this.lasersG = keep(this.add.graphics().setDepth(3));
            this.montarCaja(keep);
            this.montarTeclado(keep);
            this.pantallaG = keep(this.add.graphics().setDepth(14));
            this.montarHud(keep);
            this.sembrarMotes(keep, 14, { x: 0, y: 0, w: L.W, h: L.suelo, depth: 6 }, 0x9be7ff);
            if (reubicar) this.ubicarCosas();
        },

        montarCaja: function (keep) {
            var L = this.L, R = L.R;
            var g = keep(this.add.graphics().setDepth(5));
            g.fillStyle(0x000000, 0.25); g.fillEllipse(L.cx, L.suelo + 4, R * 3, R * 0.3);
            g.fillStyle(0x4f5d6b, 1); g.fillRoundedRect(L.cx - R * 1.28, L.cy - R * 1.28, R * 2.56, R * 2.56, 22);
            g.fillStyle(0x6c7a89, 1); g.fillRoundedRect(L.cx - R * 1.22, L.cy - R * 1.22, R * 2.44, R * 2.44, 18);
            g.fillStyle(0xffffff, 0.12); g.fillRoundedRect(L.cx - R * 1.2, L.cy - R * 1.2, R * 2.4, R * 0.4, 14);
            // Interior (se ve al abrir).
            g.fillStyle(0x1a1f2b, 1); g.fillCircle(L.cx, L.cy, R * 0.98);
            this.interior = keep(this.add.graphics().setDepth(6));
            // Puerta: contenedor con bisagra a la izquierda (gira con scaleX).
            var puerta = keep(this.add.container(L.cx - R, L.cy).setDepth(8));
            var p = this.add.graphics();
            p.fillStyle(0x868e96, 1); p.fillCircle(R, 0, R);
            p.fillStyle(0xadb5bd, 1); p.fillCircle(R, 0, R * 0.9);
            p.lineStyle(5, 0x495057, 1); p.strokeCircle(R, 0, R * 0.9); p.strokeCircle(R, 0, R * 0.62);
            p.fillStyle(0x495057, 1);
            for (var i = 0; i < 12; i++) p.fillCircle(R + Math.cos(i * Math.PI / 6) * R * 0.95, Math.sin(i * Math.PI / 6) * R * 0.95, 4);
            p.fillStyle(0xffffff, 0.2); p.fillEllipse(R - R * 0.3, -R * 0.4, R * 0.5, R * 0.2);
            var rueda = this.add.container(R, 0);
            var rg = this.add.graphics();
            rg.fillStyle(0xfcc419, 1); rg.fillCircle(0, 0, R * 0.2);
            rg.lineStyle(R * 0.08, 0xfcc419, 1);
            for (var s = 0; s < 3; s++) { var a = s * Math.PI * 2 / 3; rg.lineBetween(0, 0, Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5); rg.fillCircle(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.07); }
            rg.fillStyle(0xe67700, 1); rg.fillCircle(0, 0, R * 0.08);
            rueda.add(rg);
            puerta.add([p, rueda]);
            this.puerta = puerta; this.rueda = rueda;
            puerta.setScale(this.abierta ? 0.15 : 1, 1);
        },

        /** Pantalla de la caja fuerte, encima de la puerta: una ranura por sonido del código. */
        pantalla: function () {
            var L = this.L;
            var n = this.ranuras.length;
            var g = this.pantallaG;
            if (!g || !g.active) return;
            g.clear();
            if (!n) { this.celdas = []; return; }
            var w = Math.min(L.R * 2.2, n * L.R * 0.62 + L.R * 0.2), h = L.R * 0.56;
            var x0 = L.cx - w / 2, y0 = L.cy - L.R * 1.62;
            g.fillStyle(0x0b1b24, 1); g.fillRoundedRect(x0 - 8, y0 - 6, w + 16, h + 12, 12);
            g.lineStyle(4, this.alarma > 0.01 ? 0xff6b6b : 0x74c0fc, 1); g.strokeRoundedRect(x0 - 8, y0 - 6, w + 16, h + 12, 12);
            this.celdas = [];
            for (var i = 0; i < n; i++) {
                var cw = w / n;
                var cx = x0 + cw * (i + 0.5), cy = y0 + h / 2;
                var r = this.ranuras[i];
                g.fillStyle(r ? 0x2b8a3e : 0x1c313d, 1); g.fillRoundedRect(cx - cw * 0.44, y0 + 4, cw * 0.88, h - 8, 8);
                g.fillStyle(this.alarma > 0.01 ? 0xff6b6b : (r ? 0x69db7c : 0x3b6275), r || this.alarma > 0.01 ? 1 : 0.7);
                g.fillCircle(cx, y0 + h + 12 - 4, 4);
                this.celdas.push({ x: cx, y: cy, w: cw * 0.8 });
            }
            // Las miniaturas se actualizan en alMarcar (imágenes); aquí solo se acomodan.
            this.miniaturas = this.miniaturas || [];
            this.miniaturas.forEach(function (m, i) { var c = self_celda(this, i); if (c && m && m.active) m.setPosition(c.x, c.y); }, this);
        },

        montarTeclado: function (keep) {
            var L = this.L, T = L.teclado;
            var g = keep(this.add.graphics().setDepth(5));
            var w = Math.min(L.der - L.cx - L.R * 1.6 - 10, L.tam * 3.6), h = L.tam * 2.7;
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(T.x - w / 2 + 4, T.y - h / 2 + 8, w, h, 20);
            g.fillStyle(0x2b3a4a, 1); g.fillRoundedRect(T.x - w / 2, T.y - h / 2, w, h, 20);
            g.lineStyle(5, 0x74c0fc, 0.8); g.strokeRoundedRect(T.x - w / 2, T.y - h / 2, w, h, 20);
            g.fillStyle(0x74c0fc, 0.15); g.fillRoundedRect(T.x - w / 2 + 8, T.y - h / 2 + 8, w - 16, 14, 7);
            this.tecladoBox = { w: w, h: h };
        },

        lugares: function (n) {
            var L = this.L, T = L.teclado, b = this.tecladoBox || { w: L.tam * 3.4, h: L.tam * 2.6 };
            var cols = n <= 3 ? n : (n === 4 ? 2 : 3);
            var filas = Math.ceil(n / cols);
            var pasoX = Math.min(L.tam * 1.15, (b.w - 20) / cols), pasoY = Math.min(L.tam * 1.2, (b.h - 20) / filas);
            var out = [];
            for (var i = 0; i < n; i++) {
                var f = Math.floor(i / cols), c = i % cols;
                var enFila = f === filas - 1 ? n - cols * (filas - 1) : cols;
                out.push({ x: T.x + (c - (enFila - 1) / 2) * pasoX, y: T.y + (f - (filas - 1) / 2) * pasoY });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { if (a.cont.active) { a.casa = { x: lug[i].x, y: lug[i].y }; a.cont.setPosition(lug[i].x, lug[i].y); } });
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            var lug = this.lugares(n);
            var cols = n <= 3 ? n : (n === 4 ? 2 : 3);
            var tam = Math.min(this.L.tam * 0.92, (this.tecladoBox.w - 20) / cols * 0.92);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y + 30, tam * 0.72, { depth: 30, sinSombra: true });
                var b = self.add.graphics();
                b.fillStyle(0x000000, 0.3); b.fillCircle(2, 5, tam * 0.5);
                b.fillStyle(0xf1f3f5, 1); b.fillCircle(0, 0, tam * 0.5);
                b.lineStyle(5, 0x74c0fc, 1); b.strokeCircle(0, 0, tam * 0.5);
                var luz = self.add.graphics(); luz.fillStyle(0x69db7c, 1); luz.fillCircle(0, 0, tam * 0.5); luz.setAlpha(0);
                a.cont.addAt(b, 0); a.cont.addAt(luz, 1);
                a.luz = luz; a.fondo = b; a.tam = tam; a.casa = { x: lug[i].x, y: lug[i].y }; a.prof = 30;
                a.cont.setAlpha(0);
                return a;
            });
            K.ruido({ f: 1500, q: 1, dur: 0.07, vol: 0.05 });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 100).then(function () { return tw(self, { targets: a.cont, alpha: 1, y: a.casa.y, duration: 320, ease: 'Back.easeOut' }); });
            }));
        },

        limpiarMiniaturas: function () {
            (this.miniaturas || []).forEach(function (m) { if (m && m.active) m.destroy(); });
            this.miniaturas = [];
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas);
            this.cosas = [];
            this.limpiarMiniaturas();
            this.ranuras = nv.reproducciones[0].map(function () { return null; });
            if (this.abierta > 0) await this.cerrarPuerta();
            this.pantalla();
        },

        alSonar: function (id, k) {
            // Se enciende la lámpara k de la pantalla (sin decir cuál es el sonido).
            this.lampara = k;
            this.lamparaT = this.time.now;
            K.tono({ f: 900 + k * 90, dur: 0.05, vol: 0.03 });
            this.rueda.angle += 60;
        },

        /* ── Teclado ── */

        alTocar: async function (p) {
            if (this.fase !== 'jugar') return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.cosas.length ? this.cosas[0].tam * 0.62 : 60);
            if (!a || a.hecha) return;
            this.pista.reiniciar();
            await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
        },

        presionar: function (a, ok) {
            this.tweens.add({ targets: a.cont, scale: 0.88, duration: 90, yoyo: true });
            a.luz.setAlpha(0.9);
            a.luz.fillColor = ok ? 0x69db7c : 0xff6b6b;
            this.tweens.add({ targets: a.luz, alpha: ok ? 0.35 : 0, duration: ok ? 400 : 500 });
        },

        alMarcar: async function (id, k) {
            var a = this.tocado;
            a.hecha = true;
            this.ranuras[k] = id;
            this.pantalla();
            this.presionar(a, true);
            var c = this.celdas && this.celdas[k];
            if (c) {
                var m = this.add.image(c.x, c.y, 'el_' + id).setDepth(16);
                var esc = Math.min(c.w, this.L.R * 0.5) / Math.max(m.width, m.height);
                m.setScale(0.1);
                this.miniaturas[k] = m;
                this.tweens.add({ targets: m, scale: esc, duration: 240, ease: 'Back.easeOut' });
            }
            this.tweens.add({ targets: this.rueda, angle: this.rueda.angle + 120, duration: 260 });
            Ut.estallido(this, a.cont.x, a.cont.y, { n: 5, tex: 'chispa', tam: 18, dist: 60, depth: 70, colores: [0x74c0fc, 0xffffff] });
            await esperar(this, 200);
        },

        alFallar: async function () {
            var a = this.tocado;
            if (a) this.presionar(a, false);
            this.alarma = 1;
            this.pantalla();
            K.tono({ f: 520, f2: 380, dur: 0.18, vol: 0.05 });
            this.cameras.main.shake(260, 0.004);
            await tw(this, { targets: this, alarma: 0.001, duration: 700 });
            this.alarma = 0;
        },

        alReiniciar: async function () {
            this.cosas.forEach(function (a) { a.hecha = false; });
            this.limpiarMiniaturas();
            this.ranuras = this.ranuras.map(function () { return null; });
            this.pantalla();
        },

        /** Acierto: la pantalla repite el código con sus sonidos y la puerta se abre con un tesoro. */
        alAcertar: async function () {
            var nv = this.nv;
            for (var k = 0; k < nv.correctas.length; k++) {
                if (!this.sigue()) return;
                this.reunidos.push(nv.correctas[k]);
                var a = this.cosas.filter(function (q) { return q.id === nv.correctas[k]; })[0];
                if (a) { a.luz.setAlpha(0.9); a.luz.fillColor = 0xffd43b; this.tweens.add({ targets: a.luz, alpha: 0.25, duration: 500 }); a.latir(); }
                await this.sonar(nv.correctas[k], { breve: true, bocina: false });
                await esperar(this, 100);
            }
            await this.abrirPuerta();
        },

        abrirPuerta: async function () {
            var L = this.L;
            K.tono({ f: 300, f2: 600, dur: 0.5, vol: 0.05, tipo: 'triangle' });
            this.tweens.add({ targets: this.rueda, angle: this.rueda.angle + 540, duration: 700 });
            await esperar(this, 500);
            this.dibujarInterior();
            await tw(this, { targets: this.puerta, scaleX: 0.15, duration: 600, ease: 'Cubic.easeInOut' });
            this.abierta = 1;
            K.ruido({ f: 2000, q: 2, dur: 0.1, vol: 0.08 });
            Ut.estallido(this, L.cx, L.cy, { n: 22, tex: 'estrella', tam: 32, dist: L.R * 1.6, depth: 70, sinTinte: true });
            Ut.estallido(this, L.cx, L.cy, { n: 14, tex: 'corazon', tam: 26, dist: L.R * 1.4, depth: 70 });
            await esperar(this, 700);
        },

        dibujarInterior: function () {
            var L = this.L, g = this.interior;
            g.clear();
            g.fillStyle(0x2b2000, 1); g.fillCircle(L.cx, L.cy, L.R * 0.96);
            g.fillStyle(0xffd43b, 0.35); g.fillCircle(L.cx, L.cy, L.R * 0.8);
            g.fillStyle(0xffd43b, 1);
            for (var i = 0; i < 9; i++) g.fillCircle(L.cx + (i - 4) * L.R * 0.18, L.cy + L.R * 0.5 + (i % 2) * 6, L.R * 0.12);
            g.fillStyle(0xfff3bf, 1);
            this.estrellaDelTesoro = g;
        },

        cerrarPuerta: async function () {
            await tw(this, { targets: this.puerta, scaleX: 1, duration: 420, ease: 'Cubic.easeInOut' });
            this.abierta = 0;
            this.interior.clear();
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
            await esperar(this, 500);
            await this.cerrarPuerta();
            this.limpiarMiniaturas();
        },

        mostrarPista: function (cancelada) { return this.pistaToque(cancelada, this.cosas); },
        demoPaso: function () { return this.demoOrden(this.cosas); },

        /** Final: la caja se abre por última vez y salen, bailando, los sonidos del código. */
        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            await this.retirar(this.cosas);
            this.cosas = [];
            this.limpiarMiniaturas();
            this.ranuras = [];
            this.pantalla();
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            if (!ids.length) ids = ['tambor', 'campana', 'pajaro'];
            if (this.abierta === 0) await this.abrirPuerta();
            var tam = Math.min(L.tam, (L.der - L.cx - L.R * 1.6) / ids.length * 0.9);
            var objs = [];
            for (var i = 0; i < ids.length; i++) {
                if (!this.sigue()) return;
                var x = L.cx + L.R * 1.9 + (L.der - L.cx - L.R * 2) * (i + 0.5) / ids.length;
                var a = this.crearCosa(ids[i], L.cx, L.cy, tam * 0.8, { depth: 30 });
                a.cont.setScale(0.3);
                await this.saltarA(a.cont, x, L.suelo - tam * 0.5, { ms: 520, alto: 140, esc: 1 });
                a.saltito(0.25, 2);
                Ut.estallido(this, x, L.suelo - tam, { n: 8, tex: 'estrella', tam: 24, dist: 120, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 90);
            await esperar(this, 1000);
        },

        estadoExtra: function () {
            return {
                cosas: this.cosas.filter(function (a) { return a.cont.active; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y), hecha: !!a.hecha }; }),
                ranuras: this.ranuras.slice(), abierta: this.abierta
            };
        },

        paso: function (time) {
            var L = this.L;
            var self = this;
            this.cosas.forEach(function (a, i) { if (a.fondo && a.fondo.active && !a.hecha && !self.tweens.isTweening(a.cont)) a.cont.setScale(1 + Math.sin(time / 500 + i) * 0.03); });
            var g = this.lasersG;
            if (g && g.active) {
                g.clear();
                var vel = 40 / (1 + (this.nivelActual || 0) * 0.45);
                var rojo = this.alarma > 0.01;
                for (var i = 0; i < 4 + (this.nivelActual || 0); i++) {
                    var y = L.suelo - 30 - ((time / vel + i * 140) % (L.suelo - 60));
                    g.lineStyle(rojo ? 7 : 3, rojo ? 0xff0000 : (this.abierta ? 0x69db7c : 0xff6b6b), rojo ? 0.8 : 0.28 + 0.2 * Math.sin(time / 300 + i));
                    g.lineBetween(0, y, L.W, y + Math.sin(time / 1200 + i) * 40);
                }
            }
            // Lámpara del código encendida un instante mientras suena (la dibuja la pantalla).
            if (this.lampara != null && this.celdas && time - this.lamparaT < 450) {
                var c = this.celdas[this.lampara];
                if (c && this.pantallaG.active) {
                    this.pantallaG.fillStyle(0xffd43b, 0.9 * (1 - (time - this.lamparaT) / 450));
                    this.pantallaG.fillRoundedRect(c.x - c.w / 2, c.y - L.R * 0.2, c.w, L.R * 0.4, 8);
                }
            } else if (this.lampara != null) { this.lampara = null; this.pantalla(); }
        }
    };

    function self_celda(esc, i) { return esc.celdas && esc.celdas[i]; }

    K.crear({ id: 'cajafuerte', fondo: '#1b3a4b', escena: escena });
})(typeof window !== 'undefined' ? window : this);
