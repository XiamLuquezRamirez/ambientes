/**
 * «La caja fuerte del código» — motor propio de Secuencia de 3 Sonidos (5-6 años, misión sonora).
 *
 * Una caja fuerte en una sala de seguridad con rayos láser y cámaras. Mientras suena el código
 * secreto, las lámparas de su pantalla se encienden una a una (no dicen cuáles son). Después aparece
 * el teclado con los botones de los sonidos (también uno que no era del código) y el niño marca el
 * código en el mismo orden: cada botón suena y su imagen queda registrada en la pantalla. Si se
 * equivoca, suena la alarma (la baliza y los láseres se ponen rojos), la pantalla se borra y el código
 * se escucha otra vez. Al completarlo hay que GIRAR LA RUEDA de la puerta con el dedo: los cerrojos
 * se retiran poco a poco y la puerta se abre con el tesoro del nivel (lingotes, gemas, corona, copa).
 * Cada nivel es otra sala (banco, museo, laboratorio, palacio).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;

    var SALAS = [
        { tinte: 0xffffff, laser: 0xff6b6b },
        { tinte: 0xc8ffd8, laser: 0xff9f43 },
        { tinte: 0xe0c8ff, laser: 0xff5fd0 },
        { tinte: 0xffe6b0, laser: 0xff4d4d }
    ];
    var VUELTA = 5.2;   // radianes que hay que girar la rueda (≈ 300°)

    function rg(i) { var x = Math.sin(i * 127.1 + 11.7) * 43758.5453; return x - Math.floor(x); }
    function mezTinte(a, b, t) { var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100); return C.GetColor(c.r, c.g, c.b); }

    var escena = {
        iniciar: function () {
            this.cosas = [];
            this.ranuras = [];
            this.reunidos = [];
            this.alarma = 0;
            this.abierta = 0;
            this.cerrojos = 1;
            this.giro = null;
            this.sala = 0;
            this.tinteActual = 0xffffff;
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
            var clave = 'caja_fondo_' + L.W + 'x' + L.H;
            K.textura(this, clave, L.W, L.H, function (x, w, h) { pintarSala(x, w, h, L); });
            this.fondoImg = keep(this.add.image(0, 0, clave).setOrigin(0, 0).setDepth(1).setTint(this.tinteActual));
            this.salaG = keep(this.add.graphics().setDepth(2));
            this.lasersG = keep(this.add.graphics().setDepth(3));
            this.montarCaja(keep);
            this.montarTeclado(keep);
            this.cerrojosG = keep(this.add.graphics().setDepth(9));
            this.pantallaG = keep(this.add.graphics().setDepth(14));
            this.balizaG = keep(this.add.graphics().setDepth(12));
            this.montarHud(keep);
            this.sembrarMotes(keep, 14, { x: 0, y: 0, w: L.W, h: L.suelo, depth: 6 }, 0x9be7ff);
            if (this.abierta) this.dibujarInterior();
            if (reubicar) this.ubicarCosas();
        },

        montarCaja: function (keep) {
            var L = this.L, R = L.R;
            var g = keep(this.add.graphics().setDepth(5));
            g.fillStyle(0x000000, 0.25); g.fillEllipse(L.cx, L.suelo + 4, R * 3, R * 0.3);
            g.fillStyle(0x3b4752, 1); g.fillRoundedRect(L.cx - R * 1.34, L.cy - R * 1.34, R * 2.68, R * 2.68, 24);
            g.fillStyle(0x4f5d6b, 1); g.fillRoundedRect(L.cx - R * 1.28, L.cy - R * 1.28, R * 2.56, R * 2.56, 22);
            g.fillStyle(0x6c7a89, 1); g.fillRoundedRect(L.cx - R * 1.22, L.cy - R * 1.22, R * 2.44, R * 2.44, 18);
            g.fillStyle(0xffffff, 0.12); g.fillRoundedRect(L.cx - R * 1.2, L.cy - R * 1.2, R * 2.4, R * 0.4, 14);
            g.fillStyle(0x2f3a45, 1);
            [[-1.14, -1.14], [1.14, -1.14], [-1.14, 1.14], [1.14, 1.14]].forEach(function (q) { g.fillCircle(L.cx + q[0] * R, L.cy + q[1] * R, R * 0.045); });
            // Bisagras.
            g.fillStyle(0x2f3a45, 1);
            [-0.62, 0.62].forEach(function (f) { g.fillRoundedRect(L.cx - R * 1.16, L.cy + f * R - R * 0.12, R * 0.2, R * 0.24, 5); });
            // Interior (se ve al abrir).
            g.fillStyle(0x1a1f2b, 1); g.fillCircle(L.cx, L.cy, R * 0.98);
            this.interior = keep(this.add.graphics().setDepth(6));
            this.brilloG = keep(this.add.graphics().setDepth(7));
            // Puerta: contenedor con bisagra a la izquierda (gira con scaleX).
            var puerta = keep(this.add.container(L.cx - R, L.cy).setDepth(8));
            var p = this.add.graphics();
            p.fillStyle(0x6b747d, 1); p.fillCircle(R, 0, R);
            p.fillStyle(0x868e96, 1); p.fillCircle(R, 0, R * 0.97);
            p.fillStyle(0xadb5bd, 1); p.fillCircle(R, 0, R * 0.9);
            p.lineStyle(5, 0x495057, 1); p.strokeCircle(R, 0, R * 0.9); p.strokeCircle(R, 0, R * 0.62);
            p.lineStyle(2, 0x495057, 0.5); for (var t = 0; t < 24; t++) { var a = t * Math.PI / 12; p.lineBetween(R + Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, R + Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); }
            p.fillStyle(0x495057, 1);
            for (var i = 0; i < 12; i++) p.fillCircle(R + Math.cos(i * Math.PI / 6) * R * 0.95, Math.sin(i * Math.PI / 6) * R * 0.95, 4);
            p.fillStyle(0xffffff, 0.2); p.fillEllipse(R - R * 0.3, -R * 0.4, R * 0.5, R * 0.2);
            var rueda = this.add.container(R, 0);
            var rg2 = this.add.graphics();
            rg2.fillStyle(0xfcc419, 1); rg2.fillCircle(0, 0, R * 0.2);
            rg2.lineStyle(R * 0.08, 0xfcc419, 1);
            for (var s = 0; s < 3; s++) { var a2 = s * Math.PI * 2 / 3; rg2.lineBetween(0, 0, Math.cos(a2) * R * 0.5, Math.sin(a2) * R * 0.5); rg2.fillCircle(Math.cos(a2) * R * 0.5, Math.sin(a2) * R * 0.5, R * 0.07); }
            rg2.fillStyle(0xe67700, 1); rg2.fillCircle(0, 0, R * 0.08);
            rueda.add(rg2);
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
            this.miniaturas = this.miniaturas || [];
            this.miniaturas.forEach(function (m, i) { var c = self_celda(this, i); if (c && m && m.active) m.setPosition(c.x, c.y); }, this);
        },

        montarTeclado: function (keep) {
            var L = this.L, T = L.teclado;
            var g = keep(this.add.graphics().setDepth(5));
            var w = Math.min(L.der - L.cx - L.R * 1.6 - 10, L.tam * 3.6), h = L.tam * 2.7;
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(T.x - w / 2 + 4, T.y - h / 2 + 8, w, h, 20);
            g.fillStyle(0x1d2733, 1); g.fillRoundedRect(T.x - w / 2 - 5, T.y - h / 2 - 5, w + 10, h + 10, 24);
            g.fillStyle(0x2b3a4a, 1); g.fillRoundedRect(T.x - w / 2, T.y - h / 2, w, h, 20);
            g.lineStyle(5, 0x74c0fc, 0.8); g.strokeRoundedRect(T.x - w / 2, T.y - h / 2, w, h, 20);
            g.fillStyle(0x74c0fc, 0.15); g.fillRoundedRect(T.x - w / 2 + 8, T.y - h / 2 + 8, w - 16, 14, 7);
            g.fillStyle(0x151e28, 1);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { g.fillCircle(T.x + q[0] * (w / 2 - 12), T.y + q[1] * (h / 2 - 12), 4); });
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
                b.fillStyle(0x59687a, 1); b.fillCircle(0, 0, tam * 0.54);
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
            var self = this;
            await this.retirar(this.cosas);
            this.cosas = [];
            this.limpiarMiniaturas();
            this.ranuras = nv.reproducciones[0].map(function () { return null; });
            if (this.abierta > 0) await this.cerrarPuerta();
            this.pantalla();
            // Otra sala en cada nivel: cambia el tinte de la pared y el color de los láseres.
            var nueva = SALAS[(i < 0 ? 0 : i) % 4];
            this.sala = (i < 0 ? 0 : i) % 4;
            var desde = this.tinteActual, o = { t: 0 };
            this.tweens.add({ targets: o, t: 1, duration: 900, onUpdate: function () { self.tinteActual = mezTinte(desde, nueva.tinte, o.t); if (self.fondoImg && self.fondoImg.active) self.fondoImg.setTint(self.tinteActual); } });
        },

        alSonar: function (id, k) {
            // Se enciende la lámpara k de la pantalla (sin decir cuál es el sonido).
            this.lampara = k;
            this.lamparaT = this.time.now;
            K.tono({ f: 900 + k * 90, dur: 0.05, vol: 0.03 });
            this.rueda.angle += 60;
        },

        /* ── Teclado y rueda ── */

        alTocar: async function (p) {
            var L = this.L;
            if (this.giro && this.giro.on) {
                if (Math.hypot(p.x - L.cx, p.y - L.cy) < L.R * 0.85) { this.giro.drag = true; this.giro.ang = Math.atan2(p.y - L.cy, p.x - L.cx); this.giro.tocado = true; }
                return;
            }
            if (this.fase !== 'jugar') return;
            var a = this.cosaEn(this.cosas, p.x, p.y, this.cosas.length ? this.cosas[0].tam * 0.62 : 60);
            if (!a || a.hecha) return;
            this.pista.reiniciar();
            await this.tocarOrden(a, { x: a.cont.x, y: a.cont.y });
        },

        alMover: function (p) {
            var g = this.giro, L = this.L;
            if (!g || !g.on || !g.drag || !p.isDown) return;
            var a = Math.atan2(p.y - L.cy, p.x - L.cx);
            var da = a - g.ang;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            g.ang = a;
            g.acum += Math.abs(da);
            this.rueda.angle += da * 180 / Math.PI;
            this.cerrojos = Math.max(0, 1 - g.acum / VUELTA);
            var tic = Math.floor(g.acum / 0.55);
            if (tic !== g.tic) { g.tic = tic; K.ruido({ f: 2400, q: 2, dur: 0.03, vol: 0.06 }); K.tono({ f: 300 + g.acum * 60, dur: 0.03, vol: 0.03 }); }
            if (g.acum >= VUELTA && g.listo) g.listo();
        },

        alSoltar: function () { if (this.giro) this.giro.drag = false; },

        /** Después del código: el niño gira la rueda con el dedo y los cerrojos se retiran (con respaldo automático). */
        esperarRueda: function () {
            var self = this;
            return new Promise(function (resolve) {
                var g = self.giro = { on: true, drag: false, acum: 0, ang: 0, tic: 0, tocado: false, t0: self.time.now };
                var fin = function () { if (!g.on) return; g.on = false; self.cerrojos = 0; resolve(); };
                g.listo = fin;
                self.ctx.decir({ voz: 'zeus', texto: '¡Gira la rueda para abrir la caja!' }, { minMs: 800 });
                // Si nadie la toca en un rato, gira sola para no quedarse esperando.
                var auto = function () {
                    if (!g.on) return;
                    if (g.tocado) { self.time.delayedCall(2500, function () { if (g.on && g.acum < VUELTA && !g.drag) g.acum = VUELTA; if (g.on && g.acum >= VUELTA) fin(); else if (g.on) auto(); }); return; }
                    tw(self, { targets: self.rueda, angle: self.rueda.angle + 330, duration: 1200, onUpdate: function () { self.cerrojos = Math.max(0, self.cerrojos - 0.012); } }).then(fin);
                };
                self.time.delayedCall(10000, auto);
            });
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
            K.tono({ f: 700, f2: 520, dur: 0.2, vol: 0.04 });
            this.cameras.main.shake(260, 0.004);
            await tw(this, { targets: this, alarma: 0.001, duration: 900 });
            this.alarma = 0;
        },

        alReiniciar: async function () {
            this.cosas.forEach(function (a) { a.hecha = false; });
            this.limpiarMiniaturas();
            this.ranuras = this.ranuras.map(function () { return null; });
            this.pantalla();
        },

        /** Acierto: la pantalla repite el código con sus sonidos, se gira la rueda y la puerta se abre. */
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
            if (!nv.demo && this.sigue()) await this.esperarRueda();
            this.giro = null;
            await this.abrirPuerta();
        },

        abrirPuerta: async function () {
            var L = this.L;
            K.tono({ f: 300, f2: 600, dur: 0.5, vol: 0.05, tipo: 'triangle' });
            await tw(this, { targets: this, cerrojos: 0, duration: 350 });
            this.tweens.add({ targets: this.rueda, angle: this.rueda.angle + 360, duration: 600 });
            await esperar(this, 450);
            this.dibujarInterior();
            K.ruido({ f: 140, q: 0.6, dur: 0.6, vol: 0.1 });
            await tw(this, { targets: this.puerta, scaleX: 0.15, duration: 650, ease: 'Cubic.easeInOut' });
            this.abierta = 1;
            K.ruido({ f: 2000, q: 2, dur: 0.1, vol: 0.08 });
            [880, 1100, 1320, 1760].forEach(function (f, i) { setTimeout(function () { K.tono({ f: f, dur: 0.3, vol: 0.04, tipo: 'triangle' }); }, i * 90); });
            Ut.estallido(this, L.cx, L.cy, { n: 22, tex: 'estrella', tam: 32, dist: L.R * 1.6, depth: 70, sinTinte: true });
            Ut.estallido(this, L.cx, L.cy, { n: 14, tex: 'corazon', tam: 26, dist: L.R * 1.4, depth: 70 });
            await esperar(this, 700);
        },

        /** Interior de la caja: luz dorada y el tesoro del nivel (lingotes, gemas, corona o copa). */
        dibujarInterior: function () {
            var L = this.L, g = this.interior, R = L.R, cx = L.cx, cy = L.cy;
            g.clear();
            g.fillStyle(0x2b2000, 1); g.fillCircle(cx, cy, R * 0.96);
            g.fillStyle(0xffd43b, 0.18); g.fillCircle(cx, cy, R * 0.9);
            g.fillStyle(0xffd43b, 0.2); g.fillCircle(cx, cy, R * 0.7);
            g.fillStyle(0xfff3bf, 0.25); g.fillCircle(cx, cy - R * 0.1, R * 0.4);
            g.fillStyle(0x4a3a10, 1); g.fillEllipse(cx, cy + R * 0.7, R * 1.1, R * 0.42);
            var tipo = this.sala % 4;
            if (tipo === 0) {
                for (var f = 0; f < 3; f++) for (var c = 0; c < 3 - f; c++) {
                    var x = cx + (c - (2 - f) / 2) * R * 0.46, y = cy + R * 0.5 - f * R * 0.2;
                    g.fillStyle(0xe6a800, 1); g.fillRoundedRect(x - R * 0.2, y - R * 0.1, R * 0.4, R * 0.2, 4);
                    g.fillStyle(0xffd43b, 1); g.fillRoundedRect(x - R * 0.18, y - R * 0.1, R * 0.36, R * 0.12, 4);
                    g.fillStyle(0xfff3bf, 0.9); g.fillRect(x - R * 0.14, y - R * 0.08, R * 0.12, R * 0.03);
                }
            } else if (tipo === 1) {
                var cols = [0x4dabf7, 0xf06595, 0x69db7c, 0xcc5de8, 0xffd43b];
                for (var i = 0; i < 9; i++) {
                    var gx = cx + (i - 4) * R * 0.2, gy = cy + R * 0.42 - (i % 3) * R * 0.14, r = R * 0.12;
                    g.fillStyle(cols[i % 5], 1); g.fillTriangle(gx - r, gy, gx + r, gy, gx, gy - r * 1.5); g.fillTriangle(gx - r, gy, gx + r, gy, gx, gy + r);
                    g.fillStyle(0xffffff, 0.5); g.fillTriangle(gx - r * 0.5, gy, gx, gy, gx - r * 0.1, gy - r * 1.1);
                }
            } else if (tipo === 2) {
                g.fillStyle(0xb02a2a, 1); g.fillRoundedRect(cx - R * 0.32, cy + R * 0.24, R * 0.64, R * 0.3, 8);
                g.fillStyle(0xffd43b, 1); g.fillRect(cx - R * 0.34, cy - R * 0.08, R * 0.68, R * 0.34);
                for (var q = 0; q < 4; q++) g.fillTriangle(cx - R * 0.34 + q * R * 0.17, cy - R * 0.08, cx - R * 0.17 + q * R * 0.17, cy - R * 0.08, cx - R * 0.255 + q * R * 0.17, cy - R * 0.36);
                [-0.2, 0, 0.2].forEach(function (d, k) { g.fillStyle([0xe03131, 0x4dabf7, 0x69db7c][k], 1); g.fillCircle(cx + d * R, cy + R * 0.09, R * 0.06); });
                g.fillStyle(0xfff3bf, 0.8); g.fillRect(cx - R * 0.3, cy - R * 0.04, R * 0.1, R * 0.06);
            } else {
                g.fillStyle(0xffd43b, 1); g.fillRoundedRect(cx - R * 0.34, cy - R * 0.3, R * 0.68, R * 0.5, { tl: 4, tr: 4, bl: R * 0.3, br: R * 0.3 });
                g.fillRect(cx - R * 0.05, cy + R * 0.18, R * 0.1, R * 0.2); g.fillRoundedRect(cx - R * 0.26, cy + R * 0.36, R * 0.52, R * 0.1, 4);
                g.lineStyle(R * 0.06, 0xffd43b, 1); g.strokeCircle(cx - R * 0.4, cy - R * 0.06, R * 0.14); g.strokeCircle(cx + R * 0.4, cy - R * 0.06, R * 0.14);
                g.fillStyle(0xfff3bf, 0.8); g.fillRect(cx - R * 0.26, cy - R * 0.24, R * 0.08, R * 0.3);
                estrellaG(g, cx, cy - R * 0.5, R * 0.14, 0xfff3bf);
            }
            for (var m = 0; m < 12; m++) { g.fillStyle(0xffd43b, 1); g.fillCircle(cx + (rg(m) - 0.5) * R * 0.9, cy + R * 0.58 + rg(m + 5) * R * 0.14, R * 0.05); }
        },

        cerrarPuerta: async function () {
            this.tweens.add({ targets: this, cerrojos: 1, duration: 500, delay: 300 });
            K.ruido({ f: 140, q: 0.6, dur: 0.4, vol: 0.08 });
            await tw(this, { targets: this.puerta, scaleX: 1, duration: 450, ease: 'Cubic.easeInOut' });
            this.abierta = 0;
            this.interior.clear();
            this.cerrojos = 1;
        },

        alTerminarNivel: async function () {
            await this.retirar(this.cosas);
            this.cosas = [];
            await esperar(this, 500);
            await this.cerrarPuerta();
            this.limpiarMiniaturas();
        },

        mostrarPista: function (cancelada) {
            if (this.giro && this.giro.on) return esperar(this, 600);
            return this.pistaToque(cancelada, this.cosas);
        },
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
            this.sala = 3;
            if (this.abierta === 0) await this.abrirPuerta();
            this.fiesta = 1;
            var tam = Math.min(L.tam, (L.der - L.cx - L.R * 1.6) / ids.length * 0.9);
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
                ranuras: this.ranuras.slice(), abierta: this.abierta, cerrojos: +this.cerrojos.toFixed(2), giro: this.giro ? { on: this.giro.on, acum: +this.giro.acum.toFixed(2) } : null, sala: this.sala
            };
        },

        /* ── Cada cuadro: láseres, cámaras, baliza, cerrojos y brillos ── */

        paso: function (time, delta) {
            var L = this.L, self = this, s = time / 1000, R = L.R;
            if (!L || !this.lasersG || !this.lasersG.active) return;
            var alarma = this.alarma > 0.01;
            var sala = SALAS[this.sala % 4];
            this.cosas.forEach(function (a, i) { if (a.fondo && a.fondo.active && !a.hecha && !self.tweens.isTweening(a.cont)) a.cont.setScale(1 + Math.sin(time / 500 + i) * 0.03); });
            // Láseres.
            var g = this.lasersG; g.clear();
            var vel = 40 / (1 + (this.nivelActual || 0) * 0.45);
            var col = alarma ? 0xff0000 : (this.abierta ? 0x69db7c : sala.laser);
            for (var i = 0; i < 4 + (this.nivelActual || 0); i++) {
                var y = L.suelo - 30 - ((time / vel + i * 140) % (L.suelo - 60));
                var y2 = y + Math.sin(time / 1200 + i) * 40;
                g.lineStyle(alarma ? 12 : 6, col, alarma ? 0.25 : 0.08); g.lineBetween(0, y, L.W, y2);
                g.lineStyle(alarma ? 7 : 3, col, alarma ? 0.85 : 0.3 + 0.2 * Math.sin(time / 300 + i)); g.lineBetween(0, y, L.W, y2);
                g.fillStyle(0x2b3340, 1); g.fillRoundedRect(0, y - 8, 14, 16, 3); g.fillRoundedRect(L.W - 14, y2 - 8, 14, 16, 3);
                g.fillStyle(col, 1); g.fillCircle(14, y, 3); g.fillCircle(L.W - 14, y2, 3);
            }
            // Cámaras de seguridad y focos.
            var sg = this.salaG; sg.clear();
            var cams = [{ x: L.W * 0.05, y: L.H * 0.075, dir: 1 }, { x: L.der - 34, y: L.H * 0.075, dir: -1 }];
            cams.forEach(function (c, k) {
                var ang = (c.dir > 0 ? Math.PI * 0.35 : Math.PI * 0.65) + Math.sin(s * 0.9 + k * 2) * 0.45;
                var lx = c.x + Math.cos(ang) * 22, ly = c.y + 14 + Math.sin(ang) * 10;
                sg.fillStyle(alarma ? 0xff0000 : 0xfff3bf, alarma ? 0.2 : 0.08);
                sg.fillTriangle(lx, ly, lx + Math.cos(ang - 0.28) * L.H, ly + Math.sin(ang - 0.28) * L.H, lx + Math.cos(ang + 0.28) * L.H, ly + Math.sin(ang + 0.28) * L.H);
                sg.lineStyle(6, 0x39434f, 1); sg.lineBetween(c.x - c.dir * 28, c.y - 20, c.x, c.y + 4);
                sg.fillStyle(0x59687a, 1); sg.fillRoundedRect(c.x - 24, c.y - 4, 48, 26, 8);
                sg.fillStyle(0x39434f, 1); sg.fillCircle(lx, ly, 10); sg.fillStyle(0x10243a, 1); sg.fillCircle(lx, ly, 6); sg.fillStyle(0x74c0fc, 0.8); sg.fillCircle(lx - 2, ly - 2, 2);
                sg.fillStyle(Math.sin(s * 4 + k) > 0 || alarma ? 0xff3b3b : 0x5a1010, 1); sg.fillCircle(c.x - c.dir * 14, c.y + 4, 3);
            });
            // Baliza de alarma sobre el teclado.
            var bg = this.balizaG; bg.clear();
            var bx = L.teclado.x, by = L.teclado.y - L.tam * 1.35 - 34;
            var r = alarma ? s * 7 : s * 1.2;
            bg.fillStyle(0x39434f, 1); bg.fillRoundedRect(bx - 22, by + 6, 44, 12, 4);
            bg.fillStyle(alarma ? 0xff3b3b : 0x3b82c4, alarma ? 1 : 0.9); bg.fillRoundedRect(bx - 16, by - 12, 32, 22, { tl: 14, tr: 14, bl: 3, br: 3 });
            bg.fillStyle(0xffffff, 0.45); bg.fillEllipse(bx - 5, by - 5, 8, 5);
            var rx = Math.cos(r), cone = alarma ? 0.3 : 0.1;
            bg.fillStyle(alarma ? 0xff3b3b : 0x74c0fc, cone);
            bg.fillTriangle(bx, by - 2, bx + rx * 140, by - 34 - 60, bx + rx * 140, by + 54);
            bg.fillTriangle(bx, by - 2, bx - rx * 140, by - 94, bx - rx * 140, by + 54);
            // Cerrojos de la caja (se retiran al girar la rueda).
            var cg = this.cerrojosG; cg.clear();
            var q = this.cerrojos;
            [[0, -0.66], [0, 0], [0, 0.66]].forEach(function (b) {
                var x0 = L.cx + R * (1.2 - 0.34 * q), y0 = L.cy + b[1] * R;
                cg.fillStyle(0x2f3a45, 1); cg.fillRoundedRect(L.cx + R * 1.0, y0 - R * 0.1, R * 0.24, R * 0.2, 4);
                cg.fillStyle(0x9aa5b1, 1); cg.fillRoundedRect(x0 - R * 0.34 + R * 0.34 * (1 - q) * 0 + (q > 0.02 ? 0 : 0), y0 - R * 0.075, R * 0.34 + R * 0.02, R * 0.15, 4);
                cg.fillStyle(0xdee2e6, 0.7); cg.fillRect(x0 - R * 0.3, y0 - R * 0.06, R * 0.3, R * 0.03);
            });
            // Rueda lista para girar: aro que pulsa y flecha circular.
            if (this.giro && this.giro.on) {
                var pul = 1 + 0.06 * Math.sin(s * 5);
                bg.lineStyle(6, 0xffe066, 0.8); bg.strokeCircle(L.cx, L.cy, R * 0.72 * pul);
                var a0 = s * 3;
                bg.lineStyle(7, 0xffffff, 0.85); bg.beginPath(); bg.arc(L.cx, L.cy, R * 0.86, a0, a0 + 1.6); bg.strokePath();
                var ax = L.cx + Math.cos(a0 + 1.6) * R * 0.86, ay = L.cy + Math.sin(a0 + 1.6) * R * 0.86, ta = a0 + 1.6 + Math.PI / 2;
                bg.fillStyle(0xffffff, 0.9); bg.fillTriangle(ax + Math.cos(ta) * 16, ay + Math.sin(ta) * 16, ax + Math.cos(ta + 2.4) * 12, ay + Math.sin(ta + 2.4) * 12, ax + Math.cos(ta - 2.4) * 12, ay + Math.sin(ta - 2.4) * 12);
            }
            // Destellos del tesoro.
            var br = this.brilloG; br.clear();
            if (this.abierta > 0 || this.puerta.scaleX < 0.9) {
                for (var k2 = 0; k2 < 10; k2++) {
                    var ph = (s * 0.8 + rg(k2) * 4) % 1, px = L.cx + (rg(k2 + 7) - 0.5) * R * 1.4, py = L.cy + R * 0.5 - ph * R * 1.1;
                    br.fillStyle(0xfff3bf, 0.8 * Math.sin(ph * Math.PI)); estrellaG(br, px, py, R * 0.05 + R * 0.04 * Math.sin(ph * Math.PI), 0xfff3bf);
                }
                for (var rr = 0; rr < 6; rr++) {
                    var an = -Math.PI / 2 + (rr - 2.5) * 0.4 + Math.sin(s + rr) * 0.05;
                    br.fillStyle(0xffe27a, 0.1); br.fillTriangle(L.cx, L.cy + R * 0.2, L.cx + Math.cos(an - 0.08) * R * 1.0, L.cy + Math.sin(an - 0.08) * R * 1.0, L.cx + Math.cos(an + 0.08) * R * 1.0, L.cy + Math.sin(an + 0.08) * R * 1.0);
                }
            }
            if (this.fiesta) {
                var fb = this.balizaG;
                for (var f2 = 0; f2 < 5; f2++) { fb.fillStyle([0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xcc5de8][f2], 0.15); var fx = L.W * (0.15 + f2 * 0.18) + Math.sin(s * 1.5 + f2) * 40; fb.fillTriangle(fx - 6, 0, fx + 6, 0, fx + 120 * Math.sin(s + f2), L.suelo); }
            }
            // Lámpara del código encendida un instante mientras suena (la dibuja la pantalla).
            if (this.lampara != null && this.celdas && time - this.lamparaT < 450) {
                var ce = this.celdas[this.lampara];
                if (ce && this.pantallaG.active) {
                    this.pantallaG.fillStyle(0xffd43b, 0.9 * (1 - (time - this.lamparaT) / 450));
                    this.pantallaG.fillRoundedRect(ce.x - ce.w / 2, ce.y - L.R * 0.2, ce.w, L.R * 0.4, 8);
                }
            } else if (this.lampara != null) { this.lampara = null; this.pantalla(); }
        }
    };

    function estrellaG(g, x, y, r, col) {
        g.fillStyle(col, 1);
        var pts = [];
        for (var i = 0; i < 8; i++) { var a = -Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? r * 0.35 : r; pts.push({ x: x + Math.cos(a) * q, y: y + Math.sin(a) * q }); }
        g.fillPoints(pts, true);
    }

    function self_celda(esc, i) { return esc.celdas && esc.celdas[i]; }

    /** La sala: paredes de paneles remachados, tuberías, nicho de la caja, suelo con franjas de peligro. */
    function pintarSala(x, w, h, L) {
        var g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1b3a4b'); g.addColorStop(0.7, '#26566e'); g.addColorStop(1, '#2f6f86');
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        var pw = 150, ph = 110;
        for (var r = 0; r * ph < L.suelo; r++) for (var c = 0; c * pw < w; c++) {
            var px = c * pw, py = r * ph;
            x.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)'; x.fillRect(px, py, pw, ph);
            x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 2; x.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
            x.strokeStyle = 'rgba(255,255,255,0.07)'; x.beginPath(); x.moveTo(px + 3, py + ph - 3); x.lineTo(px + 3, py + 3); x.lineTo(px + pw - 3, py + 3); x.stroke();
            x.fillStyle = 'rgba(255,255,255,0.18)';
            [[8, 8], [pw - 8, 8], [8, ph - 8], [pw - 8, ph - 8]].forEach(function (q) { x.beginPath(); x.arc(px + q[0], py + q[1], 2.2, 0, 6.2832); x.fill(); });
        }
        // Tuberías con soportes.
        [0.045, 0.07].forEach(function (f, i) {
            var yy = h * f, hh = 12 - i * 3;
            var gp = x.createLinearGradient(0, yy - hh, 0, yy + hh); gp.addColorStop(0, '#6b7c8c'); gp.addColorStop(0.5, '#a9bac9'); gp.addColorStop(1, '#4b5a68');
            x.fillStyle = gp; x.fillRect(0, yy - hh, w, hh * 2);
            for (var k = 0; k < w; k += 220) { x.fillStyle = '#39434f'; x.fillRect(k + 60, yy - hh - 4, 16, hh * 2 + 8); }
        });
        // Nicho de la caja fuerte.
        var cx = L.cx, cy = L.cy, R = L.R;
        x.fillStyle = 'rgba(0,0,0,0.38)'; x.beginPath(); if (x.roundRect) x.roundRect(cx - R * 1.6, cy - R * 1.95, R * 3.2, L.suelo - (cy - R * 1.95), 30); else x.rect(cx - R * 1.6, cy - R * 1.95, R * 3.2, L.suelo - (cy - R * 1.95)); x.fill();
        x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 4; x.stroke();
        var rd = x.createRadialGradient(cx, cy, R, cx, cy, R * 2.3); rd.addColorStop(0, 'rgba(255,255,255,0.0)'); rd.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = rd; x.fillRect(0, 0, w, L.suelo);
        // Suelo.
        x.fillStyle = '#12303f'; x.fillRect(0, L.suelo, w, h - L.suelo);
        x.fillStyle = 'rgba(255,255,255,0.08)';
        for (var k2 = 0; k2 < w; k2 += 90) x.fillRect(k2, L.suelo + 6, 50, 6);
        x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(0, L.suelo, w, 5);
        x.fillStyle = '#fcc419';
        for (var m = 0; m < w; m += 60) { x.beginPath(); x.moveTo(m, h); x.lineTo(m + 30, h); x.lineTo(m + 50, h - 12); x.lineTo(m + 20, h - 12); x.fill(); }
        var v = x.createRadialGradient(w / 2, h * 0.5, h * 0.4, w / 2, h * 0.5, w * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,10,25,0.4)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
    }

    K.crear({ id: 'cajafuerte', fondo: '#1b3a4b', escena: escena });
})(typeof window !== 'undefined' ? window : this);
