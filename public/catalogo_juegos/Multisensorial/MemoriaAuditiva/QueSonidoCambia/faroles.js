/**
 * «El desfile de linternas» — motor propio de ¿Qué sonido cambia? (5-6 años).
 * De noche pasa un desfile de faroles; cada farol brilla cuando suena su sonido (no se ve qué es).
 * Pasa otra vez y falta uno. En la guirnalda cuelgan los faroles apagados con su dibujo y el niño
 * ENCIENDE EL DEL PERDIDO tocándolo y MANTENIENDO el dedo hasta que se llena de luz. Si no es,
 * el farol parpadea y se apaga.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    var MANTENER = 900;   // ms que hay que mantener el dedo

    // Arte del diseñador (img/faroles/): fondo 1280×720 y 5 lámparas en lienzo de 500×500.
    var DIR = 'img/faroles/';
    var FONDO_W = 1280, FONDO_H = 720;
    var ANCHO_UTIL = 1100;            // ancho del dibujo que siempre debe caber en pantalla
    var CAJA = 500;                   // lienzo de cada lámpara
    var ANCHO_CUERPO = 126;           // ancho del cuerpo de la lámpara, en unidades de su lienzo
    // Por lámpara: cx = hilo (x), top = donde el hilo toca el cable, cy = centro del cuerpo, pico = punta del techo.
    var LAMP = [
        { cx: 212.7, top: 16.0, cy: 272.6, pico: 142 },
        { cx: 283.8, top: 31.2, cy: 270.9, pico: 146 },
        { cx: 273.8, top: 44.2, cy: 285.0, pico: 152 },
        { cx: 250.0, top: 40.6, cy: 283.0, pico: 166 },
        { cx: 250.0, top: 16.3, cy: 265.9, pico: 135 }
    ];
    // Cable amarillo del fondo (centro), medido por color: [x, y] en unidades del dibujo.
    var CABLE = [[0, 113], [160, 129], [320, 144], [480, 156], [640, 162], [720, 162], [800, 160.5], [960, 152], [1120, 135.5], [1280, 112]];
    // Estrellas de cuatro puntas del cielo (medidas por color): titilan encima.
    var BRILLOS = [[1084, 17], [466, 41], [796, 46], [957, 67], [343, 87], [862, 96], [1073, 99], [209, 108], [1256, 180]];
    var SIN_LUZ = 0xa9a9b8;           // tinte de la lámpara apagada

    function cableY(u) {
        if (u <= CABLE[0][0]) return CABLE[0][1];
        for (var i = 1; i < CABLE.length; i++) {
            if (u <= CABLE[i][0]) {
                var a = CABLE[i - 1], b = CABLE[i];
                return a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]);
            }
        }
        return CABLE[CABLE.length - 1][1];
    }

    var escena = {
        iniciar: function () { this.faroles = []; this.desfile = []; this.reunidos = []; },

        precargar: function () {
            var self = this;
            if (!this.textures.exists('fq_fondo')) this.load.svg('fq_fondo', DIR + 'fondo.svg', { width: 1920, height: 1080 });
            for (var i = 1; i <= 5; i++) {
                if (!this.textures.exists('fq_lampara' + i)) self.load.svg('fq_lampara' + i, DIR + 'lampara' + i + '.svg', { width: 640, height: 640 });
            }
        },

        /** Encaje del fondo: cubre la pantalla anclado abajo, sin recortar el ancho útil. */
        marcoFondo: function (W, H) {
            if (!this.textures.exists('fq_fondo')) return null;
            var k = Math.min(Math.max(W / FONDO_W, H / FONDO_H), W / ANCHO_UTIL);
            var ox = (W - FONDO_W * k) / 2, oy = H - FONDO_H * k;
            return { k: k, ox: ox, oy: oy, sx: function (x) { return ox + x * k; }, sy: function (y) { return oy + y * k; } };
        },

        /** y de pantalla del cable en la x de pantalla dada. */
        yCable: function (px) {
            var F = this.L.F;
            return F.sy(cableY((px - F.ox) / F.k));
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var F = L.F = this.marcoFondo(W, H) || { k: Math.max(W / FONDO_W, H / FONDO_H), ox: 0, oy: 0, sx: function (x) { return x * W / FONDO_W; }, sy: function (y) { return y * H / FONDO_H; } };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            L.der = L.pres ? W - 150 : W - 16;
            L.izq = Math.max(110, F.sx(135));
            L.bocina = { x: Math.max(48, F.sx(62)), y: F.sy(300), r: 24 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var F = L.F;
            var keep = this.limpiarEscenario();
            if (this.textures.exists('fq_fondo')) {
                // Si sobra pantalla arriba (pantallas más altas), el cielo plano del dibujo continúa.
                if (F.oy > 0) keep(this.add.rectangle(0, 0, L.W, F.oy + 2, 0x15265c).setOrigin(0, 0).setDepth(0));
                keep(this.add.image(F.ox, F.oy, 'fq_fondo').setOrigin(0, 0).setDisplaySize(FONDO_W * F.k, FONDO_H * F.k).setDepth(0));
            } else {
                keep(this.add.rectangle(0, 0, L.W, L.H, 0x0b1a3f).setOrigin(0, 0).setDepth(0));
            }
            // Brillos de las estrellas del cielo: titilan.
            var self = this;
            BRILLOS.forEach(function (b, i) {
                var e = keep(self.add.star(F.sx(b[0]), F.sy(b[1]), 4, 1.6 * F.k, 7 * F.k, 0xffffff, 0.9).setDepth(2));
                self.tweens.add({ targets: e, alpha: { from: 0.25, to: 1 }, scale: { from: 0.55, to: 1.25 }, duration: 900 + (i * 173) % 700, delay: (i * 311) % 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            });
            this.sembrarMotes(keep, 14, { x: 0, y: F.sy(190), w: L.W, h: F.k * 320, depth: 4 }, 0xffe066);
            this.montarVida(keep);
            this.montarHud(keep);
            if (reubicar && this.nv && this.faroles.length) this.colgar(this.faroles.map(function (f) { return f.id; }), true);
        },

        /**
         * Una lámpara del diseño colgada del cable en la x de pantalla hx. cont queda en el CENTRO del cuerpo
         * (ahí se toca) y sw —que se mece— gira alrededor del punto donde el hilo toca el cable.
         */
        crearFarol: function (id, hx, tipo, tam) {
            var M = LAMP[tipo % LAMP.length];
            var s = tam / ANCHO_CUERPO;
            var d = (M.cy - M.top) * s;
            var c = this.add.container(hx, this.yCable(hx) + d).setDepth(20);
            var sw = this.add.container(0, -d);
            if (!this.textures.exists('fq_brillo')) {
                var cv = this.textures.createCanvas('fq_brillo', 128, 128), x = cv.getContext();
                var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
                g.addColorStop(0, 'rgba(255,230,120,0.95)'); g.addColorStop(0.45, 'rgba(255,214,80,0.45)'); g.addColorStop(1, 'rgba(255,200,60,0)');
                x.fillStyle = g; x.fillRect(0, 0, 128, 128); cv.refresh();
            }
            var halo = this.add.image(0, d, 'fq_brillo').setDisplaySize(tam * 2.6, tam * 2.6).setAlpha(0);
            halo.base = halo.scaleX;
            var lamp = this.add.image(0, 0, 'fq_lampara' + (tipo % LAMP.length + 1)).setOrigin(M.cx / CAJA, M.top / CAJA).setDisplaySize(CAJA * s, CAJA * s).setTint(SIN_LUZ);
            sw.add([halo, lamp]);
            var medalla = null, img = null;
            if (id) {
                medalla = this.add.circle(0, d, tam * 0.35, 0xfff4cf, 0.72).setStrokeStyle(Math.max(2, tam * 0.03), 0xffffff, 0.8);
                img = this.add.image(0, d, 'el_' + id);
                img.setScale(tam * 0.5 / Math.max(img.width, img.height)).setAlpha(0.75);
                sw.add([medalla, img]);
            }
            var anillo = this.add.graphics();
            c.add([sw, anillo]);
            return { id: id, cont: c, sw: sw, halo: halo, lamp: lamp, medalla: medalla, img: img, anillo: anillo, tam: tam, tipo: tipo, d: d, s: s, encendido: false };
        },

        encender: function (f, si) {
            f.encendido = si;
            this.tweens.add({ targets: f.halo, alpha: si ? 1 : 0, duration: 250 });
            if (si) f.lamp.clearTint(); else f.lamp.setTint(SIN_LUZ);
            if (f.medalla) f.medalla.setFillStyle(0xfff4cf, si ? 1 : 0.72);
            if (f.img) f.img.setAlpha(si ? 1 : 0.75);
        },

        /* ── El desfile ── */

        pasarDesfile: async function (n) {
            var L = this.L;
            this.desfile.forEach(function (f) { f.cont.destroy(); });
            var self = this;
            var tam = Math.min(100 * L.F.k, (L.der - L.izq) / (n + 0.5) * 0.8);
            var sep = Math.min(tam * 1.35, (L.der - 20) / (n + 0.5));
            this.desfile = [];
            for (var i = 0; i < n; i++) {
                var f = this.crearFarol(null, -sep * (i + 1), i, tam);
                f.cont.setDepth(15);
                this.desfile.push(f);
            }
            var total = (L.der - 20) * 0.5 + sep * (n + 1) / 2 + sep;
            await Promise.all(this.desfile.map(function (f, i) {
                return tw(self, { targets: f.cont, x: f.cont.x + total, duration: 1500, ease: 'Sine.easeOut' });
            }));
        },

        salirDesfile: async function () {
            var self = this;
            var L = this.L;
            await Promise.all(this.desfile.map(function (f) { return tw(self, { targets: f.cont, x: f.cont.x + L.W, duration: 1300, ease: 'Sine.easeIn' }); }));
            this.desfile.forEach(function (f) { f.cont.destroy(); });
            this.desfile = [];
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await Promise.all(this.faroles.map(function (f) { return tw(self, { targets: f.cont, alpha: 0, duration: 250 }).then(function () { f.cont.destroy(); }); }));
            this.faroles = [];
            await this.pasarDesfile(nv.reproducciones[0].length);
        },

        /** El farol k del desfile brilla mientras suena (el primero que suena es el de adelante). */
        alSonar: function (id, k) {
            var self = this;
            var f = this.desfile[k];
            if (!f) return;
            this.encender(f, true);
            this.tweens.add({ targets: f.sw, y: f.sw.y - 12, scale: 1.1, duration: 160, yoyo: true });
            this.time.delayedCall(700, function () { if (f.cont.active) self.encender(f, false); });
        },

        alTerminarVuelta: async function (v) { if (v === 0) await this.salirDesfile(); },

        alSegundaVuelta: async function () { await this.pasarDesfile(this.nv.reproducciones[1].length); },

        /** Faroles apagados en la guirnalda, cada uno con el dibujo de un candidato. */
        colgar: function (ids, ya) {
            var self = this;
            var L = this.L;
            this.faroles.forEach(function (f) { f.cont.destroy(); });
            var n = ids.length;
            var ancho = L.der - L.izq;
            var tam = Math.min(100 * L.F.k, ancho / n * 0.8);
            this.faroles = ids.map(function (id, i) {
                var x = L.izq + ancho * (i + 0.5) / n;
                var f = self.crearFarol(id, x, i, tam);
                f.sw.setScale(ya ? 1 : 0);
                return f;
            });
        },

        mostrarOpciones: async function (nv) {
            await this.salirDesfile();
            this.colgar(nv.opciones, false);
            for (var i = 0; i < this.faroles.length; i++) {
                K.ruido({ f: 1500, q: 1, dur: 0.06, vol: 0.05 });
                this.tweens.add({ targets: this.faroles[i].sw, scale: 1, duration: 320, ease: 'Back.easeOut' });
                await esperar(this, 120);
            }
        },

        farolEn: function (x, y) {
            return this.faroles.filter(function (f) { return !f.encendido && Math.hypot(x - f.cont.x, y - f.cont.y) < f.tam * 0.65; })[0];
        },

        /* ── Gesto: tocar y mantener ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var f = this.farolEn(p.x, p.y);
            if (!f) return;
            this.arrastrando = { f: f, t0: this.time.now, x: p.x, y: p.y };
            this.pista.reiniciar();
        },
        alMover: function (p) {
            var r = this.arrastrando;
            if (r && Math.hypot(p.x - r.x, p.y - r.y) > r.f.tam * 0.7) this.cancelarMantener();
        },
        alSoltar: function () { if (this.arrastrando) this.cancelarMantener(); },

        cancelarMantener: function () {
            var r = this.arrastrando;
            this.arrastrando = null;
            if (r) r.f.anillo.clear();
        },

        listoMantener: async function (f) {
            this.arrastrando = null;
            f.anillo.clear();
            this.tocado = f;
            this.encender(f, true);
            K.tono({ f: 900, f2: 1400, dur: 0.2, vol: 0.05 });
            var ok = await this.elegir(f.id, { x: f.cont.x, y: f.cont.y });
            if (ok === false) {
                // Parpadea y se apaga.
                for (var k = 0; k < 3; k++) { this.encender(f, k % 2 === 1); await esperar(this, 120); }
                this.encender(f, false);
            }
        },

        alAcertar: async function () {
            var self = this;
            var f = this.tocado;
            var L = this.L;
            this.reunidos.push(f.id);
            await Promise.all([this.sonar(f.id, { breve: true, bocina: false }), tw(this, { targets: f.sw, scale: 1.15, duration: 200, yoyo: true })]);
            // Vuelve el desfile completo: el perdido en su lugar y la secuencia entera.
            var seq = this.nv.reproducciones[0];
            // El cable queda libre para el desfile: las opciones se apagan y se desvanecen.
            await Promise.all(this.faroles.map(function (q) { return tw(self, { targets: q.cont, alpha: 0, duration: 300 }); }));
            await this.pasarDesfile(seq.length);
            for (var k = 0; k < seq.length; k++) {
                this.alSonar(seq[k], k);
                if (seq[k] === f.id) Ut.estallido(this, this.desfile[k].cont.x, this.desfile[k].cont.y, { n: 8, tex: 'estrella', tam: 22, dist: 70, sinTinte: true, depth: 30 });
                await this.sonar(seq[k], { breve: true, bocina: false });
            }
            await this.salirDesfile();
        },

        alFallar: async function () {},

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            var f = this.faroles.filter(function (q) { return self.respuestas().indexOf(q.id) >= 0; })[0];
            return f ? this.ctx.mano({ punto: { x: f.cont.x, y: f.cont.y }, holdMs: MANTENER, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } }) : Promise.resolve();
        },

        /* ── Escena final: los faroles suben al cielo ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            this.colgar(ids, true);
            for (var i = 0; i < this.faroles.length; i++) {
                var f = this.faroles[i];
                this.encender(f, true);
                // Se suelta del cable: se recorta el hilo y la lámpara sube al cielo.
                var pico = LAMP[f.tipo % LAMP.length].pico - 24;
                f.lamp.setCrop(0, Math.round(pico * 640 / CAJA), 640, 640);
                f.suelto = true;
                this.sonar(f.id, { breve: true, bocina: false });
                this.tweens.add({ targets: f.cont, y: -f.tam * 3, x: f.cont.x + Ut.rnd(-30, 30), duration: 3600, ease: 'Sine.easeIn' });
                this.tweens.add({ targets: f.sw, angle: { from: -8, to: 8 }, duration: 700, yoyo: true, repeat: -1 });
                await esperar(this, 520);
                if (!this.sigue()) return;
            }
            await esperar(this, 2200);
        },

        /** Demo: la mano se queda apretando el farol del que se perdió hasta encenderlo. */
        demoPaso: function () {
            var self = this;
            var r = this.respuestas();
            var f = this.faroles.filter(function (q) { return r.indexOf(q.id) >= 0; })[0];
            if (!f) return null;
            return { desde: { x: f.cont.x, y: f.cont.y }, mantener: MANTENER, hacer: function () { return self.listoMantener(f); } };
        },

        estadoExtra: function () {
            return { faroles: this.faroles.map(function (f) { return { id: f.id, x: Math.round(f.cont.x), y: Math.round(f.cont.y), encendido: f.encendido }; }) };
        },

        paso: function (time) {
            (this.faroles || []).forEach(function (f, i) {
                if (!f.cont || !f.cont.active || f.suelto || (this.arrastrando && this.arrastrando.f === f)) return;
                f.sw.angle = Math.sin(time / 650 + i * 1.3) * 3.5;
                if (f.encendido) f.halo.setScale(f.halo.base * (1 + 0.07 * Math.sin(time / 170 + i)));
            }, this);
            (this.desfile || []).forEach(function (f, i) {
                if (!f || !f.cont || !f.cont.active) return;
                f.cont.y = this.yCable(f.cont.x) + f.d;    // cuelgan del cable y lo siguen al avanzar
                f.sw.angle = Math.sin(time / 380 + i * 1.1) * 5;
                if (f.encendido) f.halo.setScale(f.halo.base * (1 + 0.07 * Math.sin(time / 170 + i)));
            }, this);
            var r = this.arrastrando;
            if (!r || this.fase !== 'jugar') return;
            var k = Math.min(1, (time - r.t0) / MANTENER);
            var g = r.f.anillo;
            g.clear();
            g.lineStyle(6, 0xffe066, 1);
            g.beginPath(); g.arc(0, 0, r.f.tam * 0.62, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
            r.f.halo.setAlpha(k * 0.7);
            if (k >= 1) this.listoMantener(r.f);
        }
    };

    K.crear({ id: 'faroles', fondo: '#15265c', escena: escena });
})(typeof window !== 'undefined' ? window : this);
