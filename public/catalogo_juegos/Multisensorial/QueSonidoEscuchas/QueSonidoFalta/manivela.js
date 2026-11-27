/**
 * «La caja de música a manivela» — motor propio de ¿Qué sonido falta? (5-6 años).
 *
 * Una caja de música con un disco y una manivela. Suena una secuencia y vuelve a sonar con un
 * sonido menos (las lámparas de arriba cuentan cuántos suenan, sin decir cuáles). Después aparecen
 * en el disco las imágenes de los sonidos y el niño GIRA LA MANIVELA con un movimiento circular:
 * el disco gira y una flecha fija marca la imagen que queda arriba. Cuando se detiene con el
 * sonido que falta bajo la flecha, lo elige. Si era otro, suena su sonido y puede seguir girando
 * (sin castigo).
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8];
    var TAU = Math.PI * 2;

    function norm(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

    // Arte del diseñador (img/diseno): fondo de feria y máquina partida en 4 piezas (base, engranaje, brazo, encima). Medidas del lienzo 708.56×720.
    var PASTEL = [0xf7d3a4, 0xa4f7ab, 0xa4c0f7, 0xf9a2e4, 0xfff1a4];
    var ART = {
        disc: { x: 223.51, y: 299.97, r: 152.5 }, hub: { x: 551.57, y: 312.44 }, brazo: 118.5, ang0: -2.76,
        lamp: { x: 354.28, y: 59.57 }, dotY: 516.94,
        dots: [44.16, 74.93, 105.69, 136.46, 167.22, 197.99, 228.75, 261.94, 292.71, 323.47, 354.24, 385.0, 415.77, 446.53, 474.13, 504.89, 535.64, 566.46, 597.22, 627.99, 658.75]
    };
    var PIEZAS = ['dx_m_base', 'dx_m_encima', 'dx_m_engranaje', 'dx_m_brazo'];

    var escena = {
        precargar: function () {
            if (!this.textures.exists('dx_fondo')) this.load.svg('dx_fondo', 'img/diseno/fondo.svg', { width: 1280, height: 720 });
            var self = this;
            ['base', 'encima', 'engranaje', 'brazo'].forEach(function (n) {
                if (!self.textures.exists('dx_m_' + n)) self.load.svg('dx_m_' + n, 'img/diseno/maquina_' + n + '.svg', { width: 886, height: 900 });
            });
        },

        iniciar: function () {
            this.cosas = [];
            this.reunidos = [];
            this.rot = 0;
            this.phi = 0;
            this.agarrada = false;
            this.ultAng = 0;
            this.ultMov = 0;
            this.movido = false;
            this.ocupado = false;
            this.lamparas = 0;
            this.lampOn = -1;
            this.visible = false;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var hueco = Math.max(60, H * 0.16);
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.R = Math.max(110, Math.min(H * 0.29, (L.der - 340) / 2));
            L.cx = Math.round(Math.max(L.R + 160, L.der * 0.4));
            L.cy = Math.round(H * 0.55);
            L.hub = { x: L.cx + L.R + 120, y: L.cy + L.R * 0.1 };
            L.brazo = Math.max(56, L.R * 0.42);
            L.bocina = { x: 48, y: Math.round(H * 0.3), r: Math.max(24, Math.min(32, hueco * 0.28)) };
            this.arteOk = this.textures.exists('dx_fondo') && PIEZAS.every(function (k) { return this.textures.exists(k); }, this) && W >= 900;
            if (this.arteOk) {
                // La máquina del diseño manda: el disco y la manivela se colocan sobre sus piezas.
                var k = Math.min(H * 0.84 / 648, (L.der - 40) / 652);
                var ox = (L.der - 652 * k) / 2 - 28 * k, oy = H * 0.965 - 684 * k;
                L.k = k; L.ox = ox; L.oy = oy;
                L.R = ART.disc.r * k * 0.99;
                L.cx = Math.round(ox + ART.disc.x * k); L.cy = Math.round(oy + ART.disc.y * k);
                L.hub = { x: ox + ART.hub.x * k, y: oy + ART.hub.y * k };
                L.brazo = ART.brazo * k;
            }
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (this.arteOk) {
                keep(this.add.image(0, 0, 'dx_fondo').setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(1));
                var kk = L.k, tam = [708.56 * kk, 720 * kk];
                keep(this.add.image(L.ox, L.oy, 'dx_m_base').setOrigin(0, 0).setDisplaySize(tam[0], tam[1]).setDepth(3));
                this.luzG = keep(this.add.graphics().setDepth(4));       // luces de la base
                this.engImg = keep(this.add.image(L.hub.x, L.hub.y, 'dx_m_engranaje').setOrigin(ART.hub.x / 708.56, ART.hub.y / 720).setDisplaySize(tam[0], tam[1]).setDepth(7));
                this.brazoImg = keep(this.add.image(L.hub.x, L.hub.y, 'dx_m_brazo').setOrigin(ART.hub.x / 708.56, ART.hub.y / 720).setDisplaySize(tam[0], tam[1]).setDepth(14));
                keep(this.add.image(L.ox, L.oy, 'dx_m_encima').setOrigin(0, 0).setDisplaySize(tam[0], tam[1]).setDepth(12));
            } else {
            K.textura(this, 'mani_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#5b3a8c'); g.addColorStop(1, '#8e5bb5');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                x.fillStyle = 'rgba(255,255,255,0.06)';
                for (var i = 0; i < 30; i++) { x.beginPath(); x.arc((i * 211) % w, (i * 97) % h, 20 + (i % 4) * 12, 0, Math.PI * 2); x.fill(); }
                // mueble: mesa de madera
                K.madera(x, 0, h * 0.84, w, h * 0.16, { claro: '#d39a55', medio: '#b97c3a', oscuro: '#87521f', r: 0 });
            });
            keep(this.add.image(0, 0, 'mani_fondo').setOrigin(0, 0).setDepth(1));
            // caja de música (madera con tapa abierta)
            var caja = keep(this.add.graphics().setDepth(3));
            var bw = L.R * 2 + 130, bh = L.R * 2 + 90;
            caja.fillStyle(0x000000, 0.25); caja.fillRoundedRect(L.cx - bw / 2 + 6, L.cy - bh / 2 + 10, bw + L.R * 0.9, bh, 26);
            caja.fillStyle(0x8a5524, 1); caja.fillRoundedRect(L.cx - bw / 2, L.cy - bh / 2, bw + L.R * 0.9, bh, 26);
            caja.fillStyle(0xb97c3a, 1); caja.fillRoundedRect(L.cx - bw / 2 + 10, L.cy - bh / 2 + 10, bw + L.R * 0.9 - 20, bh - 20, 20);
            caja.fillStyle(0x4a2c10, 1); caja.fillCircle(L.cx, L.cy, L.R + 14);
            }
            this.discoG = keep(this.add.container(L.cx, L.cy).setDepth(6));
            this.discoG.setRotation(this.rot);
            this.fijoG = keep(this.add.graphics().setDepth(12));
            this.manG = keep(this.add.graphics().setDepth(14));
            this.montarHud(keep);
            this.sembrarMotes(keep, 10, { x: 0, y: 0, w: L.W, h: L.H * 0.8, depth: 7 }, 0xe599f7);
            if (reubicar && this.cosas.length) { this.construirDisco(); }
            else this.construirDisco();
        },

        /** Dibuja el disco (cuñas) y coloca las imágenes de las opciones sobre él. */
        construirDisco: function () {
            var L = this.L, d = this.discoG, n = Math.max(this.cosas.length, 3);
            d.removeAll(true);
            var g = this.add.graphics();
            g.fillStyle(0xf1e3c8, 1); g.fillCircle(0, 0, L.R);
            for (var i = 0; i < n; i++) {
                var a0 = (i - 0.5) * TAU / n - Math.PI / 2, a1 = (i + 0.5) * TAU / n - Math.PI / 2;
                if (this.arteOk) g.fillStyle(PASTEL[i % PASTEL.length], 1);
                else g.fillStyle(this.cosas.length ? COLORES[i % COLORES.length] : 0xe0cba2, this.cosas.length ? 0.35 : 0.5);
                g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, L.R * 0.98, a0, a1, false); g.closePath(); g.fillPath();
            }
            if (this.arteOk) { g.lineStyle(3, 0xffffff, 1); g.strokeCircle(0, 0, L.R); g.lineStyle(3, 0xffffff, 0.9); }
            else { g.lineStyle(5, 0x8a5524, 1); g.strokeCircle(0, 0, L.R); g.lineStyle(3, 0x8a5524, 0.6); }
            for (var j = 0; j < n; j++) { var a = (j - 0.5) * TAU / n - Math.PI / 2; g.lineBetween(Math.cos(a) * L.R * 0.2, Math.sin(a) * L.R * 0.2, Math.cos(a) * L.R, Math.sin(a) * L.R); }
            if (!this.arteOk) { g.fillStyle(0x8a5524, 1); g.fillCircle(0, 0, L.R * 0.12); }
            d.add(g);
            var self = this;
            this.cosas.forEach(function (a, i) {
                var ang = i * TAU / n - Math.PI / 2;
                var img = self.add.image(Math.cos(ang) * L.R * 0.62, Math.sin(ang) * L.R * 0.62, 'el_' + a.id);
                img.setScale((L.R * 0.56) / Math.max(img.width, img.height));
                a.img2 = img; a.ang0 = i * TAU / n;
                d.add(img);
            });
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            this.cosas = nv.opciones.map(function (id) { return { id: id }; });
            this.rot = 0; this.phi = 0; this.movido = false;
            this.construirDisco();
            this.discoG.setScale(0.2).setAlpha(0);
            K.ruido({ f: 1200, q: 1, dur: 0.1, vol: 0.05 });
            await tw(this, { targets: this.discoG, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
            this.discoG.setRotation(0);
        },

        prepararNivel: async function (i, nv) {
            this.cosas = [];
            this.rot = 0; this.phi = 0; this.movido = false; this.ocupado = false;
            this.construirDisco();
            this.discoG.setScale(1).setAlpha(1).setRotation(0);
            this.lamparas = nv.reproducciones[0].length;
            this.lampOn = -1;
        },

        /** Con cada sonido se enciende una lámpara; en la segunda vuelta hay una menos. */
        alSonar: function (id, k, v) {
            this.lamparas = this.nv.reproducciones[v || 0].length;
            this.lampOn = k;
            this.lampT = this.time.now;
            K.tono({ f: 600 + k * 80, dur: 0.05, vol: 0.03 });
            this.tweens.add({ targets: this, rot: this.rot + TAU / 12, duration: 200, ease: 'Sine.easeOut' });
        },

        /* ── Manivela ── */

        manija: function () {
            var L = this.L;
            return { x: L.hub.x + Math.cos(this.phi - Math.PI / 2) * L.brazo, y: L.hub.y + Math.sin(this.phi - Math.PI / 2) * L.brazo };
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.ocupado) return;
            var m = this.manija();
            if (Math.hypot(p.x - m.x, p.y - m.y) < 70) {
                this.agarrada = true;
                this.ultAng = Math.atan2(p.y - this.L.hub.y, p.x - this.L.hub.x);
                this.pista.reiniciar();
            }
        },

        alMover: function (p) {
            if (!this.agarrada) return;
            var L = this.L;
            var ang = Math.atan2(p.y - L.hub.y, p.x - L.hub.x);
            var d = norm(ang - this.ultAng);
            this.ultAng = ang;
            this.girar(d);
        },

        girar: function (d) {
            var antes = Math.floor(this.rot / (TAU / Math.max(this.cosas.length, 3)));
            this.phi += d;
            this.rot += d * 0.45;
            var desp = Math.floor(this.rot / (TAU / Math.max(this.cosas.length, 3)));
            if (Math.abs(d) > 0.005) { this.movido = true; this.ultMov = this.time.now; }
            if (antes !== desp) K.tono({ f: 900 + (desp % 5) * 120, dur: 0.04, vol: 0.05, tipo: 'triangle' });
        },

        alSoltar: function () { this.agarrada = false; },

        /** Índice de la imagen que está bajo la flecha (arriba) y su desvío en cuñas. */
        bajoFlecha: function () {
            var n = this.cosas.length;
            if (!n) return null;
            // la imagen i está en el ángulo ang0 + rot (medido desde arriba)
            var mejor = 0, dm = 9;
            for (var i = 0; i < n; i++) { var d = Math.abs(norm(i * TAU / n + this.rot)); if (d < dm) { dm = d; mejor = i; } }
            return { i: mejor, desvio: norm(mejor * TAU / n + this.rot) };
        },

        seleccionar: async function (i) {
            if (this.ocupado) return;
            this.ocupado = true;
            this.agarrada = false;
            var n = this.cosas.length;
            var a = this.cosas[i];
            this.actual = a;
            // encaja: el disco se acomoda para dejar la imagen justo bajo la flecha
            var objetivo = -i * TAU / n;
            var k = Math.round((this.rot - objetivo) / TAU);
            await tw(this, { targets: this, rot: objetivo + k * TAU, duration: 220, ease: 'Sine.easeOut' });
            K.ruido({ f: 1500, q: 3, dur: 0.06, vol: 0.09 });
            Ut.estallido(this, this.L.cx, this.L.cy - this.L.R * 0.62, { n: 6, tex: 'chispa', tam: 22, dist: 70, depth: 70, sinTinte: true });
            var ok = await this.elegir(a.id, { x: this.L.cx, y: this.L.cy - this.L.R * 0.62 });
            this.movido = false;
            this.ocupado = false;
        },

        alAcertar: async function () {
            var a = this.actual;
            if (!a) return;
            this.reunidos.push(a.id);
            var L = this.L;
            Ut.estallido(this, L.cx, L.cy - L.R * 0.62, { n: 16, tex: 'estrella', tam: 28, dist: 160, depth: 70, sinTinte: true });
            Ut.estallido(this, L.cx, L.cy - L.R * 0.62, { n: 8, tex: 'nota', tam: 26, dist: 130, depth: 70 });
            if (a.img2) this.tweens.add({ targets: a.img2, scale: a.img2.scale * 1.35, duration: 180, yoyo: true, repeat: 1 });
            await this.sonar(a.id, { breve: true, bocina: false });
            await esperar(this, 250);
        },

        alFallar: async function () {
            var a = this.actual;
            if (a && a.img2) await tw(this, { targets: a.img2, angle: { from: -15, to: 15 }, duration: 90, yoyo: true, repeat: 3 });
        },

        alTerminarNivel: async function () {
            await tw(this, { targets: this.discoG, scale: 0.2, alpha: 0, duration: 260 });
            this.cosas = [];
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.ocupado) return Promise.resolve();
            if (!this.ayuda) {
                var m0 = this.manija();
                return this.ctx.mano({ punto: { x: m0.x, y: m0.y }, holdMs: 200, arrastre: { dx: this.L.brazo * 1.6, dy: 0, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
            }
            var m = this.manija();
            return this.ctx.mano({ punto: { x: m.x, y: m.y }, holdMs: 200, arrastre: { dx: this.L.brazo * 1.6, dy: this.L.brazo * 1.6, durMs: 1100 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            var m = this.manija();
            var L = this.L;
            return {
                desde: { x: m.x, y: m.y }, hasta: { x: L.hub.x + L.brazo, y: L.hub.y },
                hacer: async function () {
                    var r = self.respuestas()[0];
                    var i = self.cosas.findIndex(function (q) { return q.id === r; });
                    var n = self.cosas.length;
                    var obj = -i * TAU / n;
                    var k = Math.round((self.rot - obj) / TAU);
                    var meta = obj + k * TAU;
                    var d = (meta - self.rot);
                    var pasos = 14;
                    self.movido = true;
                    for (var s = 0; s < pasos; s++) { self.girar(d / 0.45 / pasos); await esperar(self, 50); }
                    await self.seleccionar(i);
                }
            };
        },

        escenaFinal: async function () {
            var self = this, L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; }).slice(0, 5);
            while (ids.length < 3) ids.push(['perro', 'campana', 'pajaro'][ids.length]);
            this.cosas = ids.map(function (id) { return { id: id }; });
            this.construirDisco();
            this.discoG.setScale(0.2).setAlpha(0);
            await tw(this, { targets: this.discoG, scale: 1, alpha: 1, duration: 400, ease: 'Back.easeOut' });
            var n = ids.length;
            for (var i = 0; i < n; i++) {
                if (!this.sigue()) return;
                await tw(this, { targets: this, rot: -i * TAU / n, phi: this.phi + 1.2, duration: 500, ease: 'Sine.easeInOut' });
                Ut.estallido(this, L.cx, L.cy - L.R * 0.62, { n: 10, tex: 'estrella', tam: 26, dist: 130, depth: 70, sinTinte: true });
                await this.sonar(ids[i], { breve: true, bocina: false });
            }
            Ut.confeti(this, 90);
            await esperar(this, 1100);
        },

        estadoExtra: function () {
            var self = this;
            var m = this.L ? this.manija() : null;
            var n = this.cosas.length;
            return {
                rot: +this.rot.toFixed(2), movido: this.movido, ocupado: this.ocupado,
                hub: this.L ? this.L.hub : null, manija: m ? { x: Math.round(m.x), y: Math.round(m.y) } : null, brazo: this.L ? this.L.brazo : 0,
                cosas: this.cosas.map(function (a, i) { return { id: a.id, bajo: Math.abs(norm(i * TAU / n + self.rot)) < 0.2 }; })
            };
        },

        /** Máquina del diseño: lámparas de la tapa, luces que corren, engranaje y brazo girando con la manivela. */
        pasoArte: function (time, f) {
            var L = this.L, k = L.k, s = time / 1000;
            // Lámparas: una por sonido; la del sonido que suena se enciende.
            if (this.lamparas) {
                var n = this.lamparas, sp = (n <= 4 ? 75 : 62) * k;
                for (var i = 0; i < n; i++) {
                    var lx = L.ox + ART.lamp.x * k + (i - (n - 1) / 2) * sp, ly = L.oy + ART.lamp.y * k;
                    var on = this.lampOn === i && time - (this.lampT || 0) < 500;
                    if (on) { f.fillStyle(0xffe066, 0.35); f.fillCircle(lx, ly, 31 * k); }
                    f.fillStyle(on ? 0xf29700 : 0x8a5410, 1); f.fillCircle(lx, ly, 17.85 * k);
                    f.fillStyle(on ? 0xfff3a0 : 0xb07514, 1); f.fillCircle(lx, ly, 12.9 * k);
                    f.fillStyle(0xffffff, on ? 1 : 0.35); f.fillCircle(lx - 4.55 * k, ly - 7 * k, 6 * k);
                }
            }
            // Luces de abajo: una ola de brillo que corre (más rápida mientras se gira).
            var g = this.luzG;
            if (g && g.active) {
                g.clear();
                var v = this.agarrada ? 11 : 4;
                ART.dots.forEach(function (x, j) {
                    var a = 0.8 * Math.max(0, Math.sin(s * v - j * 0.55));
                    if (a < 0.05) return;
                    g.fillStyle(0xfff3a0, a); g.fillCircle(L.ox + x * k, L.oy + (ART.dotY - 2.5) * k, 5.4 * k);
                });
            }
            // Engranaje y brazo giran con la manivela.
            if (this.engImg && this.engImg.active) this.engImg.setRotation(this.phi);
            if (this.brazoImg && this.brazoImg.active) this.brazoImg.setRotation(this.phi - Math.PI / 2 - ART.ang0);
            var m = this.manG; m.clear();
            var mp = this.manija();
            if (this.fase === 'jugar' && !this.movido && !this.ocupado) {
                // invitación: el pomo late y flechas circulares lo rodean
                var t = time / 400;
                m.lineStyle(5, 0xffffff, 0.35 + 0.3 * Math.abs(Math.sin(t))); m.strokeCircle(mp.x, mp.y, 26 * k + 6 * Math.abs(Math.sin(t)));
                m.lineStyle(5, 0xffffff, 0.6 + 0.3 * Math.sin(t));
                m.beginPath(); m.arc(L.hub.x, L.hub.y, L.brazo + 36, -2.2 + Math.sin(t) * 0.1, -0.8, false); m.strokePath();
            }
        },

        paso: function (time, delta) {
            var L = this.L;
            if (!this.discoG || !this.discoG.active) return;
            this.discoG.setRotation(this.rot);
            this.cosas.forEach(function (a) { if (a.img2 && a.img2.active) a.img2.setRotation(-this.rot); }, this);
            // Se detiene con una imagen bajo la flecha: la elige.
            if (this.fase === 'jugar' && this.movido && !this.agarrada && !this.ocupado && this.cosas.length && time - this.ultMov > 900) {
                var b = this.bajoFlecha();
                if (b && Math.abs(b.desvio) < 0.4) this.seleccionar(b.i);
            }
            if (this.fase === 'jugar' && this.agarrada && this.movido && this.cosas.length && time - this.ultMov > 900 && !this.ocupado) {
                var b2 = this.bajoFlecha();
                if (b2 && Math.abs(b2.desvio) < 0.4) this.seleccionar(b2.i);
            }
            // Flecha fija arriba y lámparas.
            var f = this.fijoG; f.clear();
            if (this.arteOk) {
                this.pasoArte(time, f);
                return;
            }
            f.fillStyle(0xff6b6b, 1); f.fillTriangle(L.cx - 22, L.cy - L.R - 34, L.cx + 22, L.cy - L.R - 34, L.cx, L.cy - L.R - 2);
            f.lineStyle(4, 0xffffff, 1); f.strokeTriangle(L.cx - 22, L.cy - L.R - 34, L.cx + 22, L.cy - L.R - 34, L.cx, L.cy - L.R - 2);
            if (this.lamparas) {
                var n = this.lamparas, w = n * 46, x0 = L.cx - w / 2;
                f.fillStyle(0x12263f, 0.7); f.fillRoundedRect(x0 - 12, L.cy - L.R - 100, w + 24, 50, 14);
                for (var i = 0; i < n; i++) {
                    var on = this.lampOn === i && time - (this.lampT || 0) < 500;
                    f.fillStyle(on ? 0xffd43b : 0x3b4a63, 1); f.fillCircle(x0 + 23 + i * 46, L.cy - L.R - 75, 15);
                }
            }
            // Manivela.
            var m = this.manG; m.clear();
            var mp = this.manija();
            m.fillStyle(0x000000, 0.25); m.fillCircle(L.hub.x + 3, L.hub.y + 5, 34);
            m.fillStyle(0xadb5bd, 1); m.fillCircle(L.hub.x, L.hub.y, 32);
            m.lineStyle(5, 0x868e96, 1); m.strokeCircle(L.hub.x, L.hub.y, 32);
            m.lineStyle(16, 0xfcc419, 1); m.lineBetween(L.hub.x, L.hub.y, mp.x, mp.y);
            m.fillStyle(0xe03131, 1); m.fillCircle(mp.x, mp.y, 30);
            m.fillStyle(0xffffff, 0.35); m.fillCircle(mp.x - 9, mp.y - 9, 9);
            m.lineStyle(4, 0x9c1c1c, 1); m.strokeCircle(mp.x, mp.y, 30);
            if (this.fase === 'jugar' && !this.movido && !this.ocupado) {
                // invitación: flechas circulares alrededor del pomo
                var t = time / 400;
                m.lineStyle(5, 0xffffff, 0.6 + 0.3 * Math.sin(t));
                m.beginPath(); m.arc(L.hub.x, L.hub.y, L.brazo + 36, -2.2 + Math.sin(t) * 0.1, -0.8, false); m.strokePath();
            }
        }
    };

    K.crear({ id: 'manivela', fondo: '#5b3a8c', escena: escena });
})(typeof window !== 'undefined' ? window : this);
