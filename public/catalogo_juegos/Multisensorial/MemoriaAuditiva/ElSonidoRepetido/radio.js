/**
 * «La radio del archivo» — motor propio de El sonido repetido (5-6 años).
 * En el archivo secreto, una radio antigua transmite una secuencia (el parlante late, no se ve qué
 * suena). Después aparecen las estaciones en el dial y el niño GIRA EL DIAL (arrastra la aguja o la
 * perilla) hasta la estación del sonido que se repitió y suelta: la radio lo toca dos veces. Si no es,
 * se oye estática y esa estación suena con su propio sonido.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    /**
     * Diseño del equipo (img/diseno, 1280×720): fondo.svg trae el cuarto y la radio (dial con marcas, caja de la perilla);
     * lo que se mueve va en capas aparte recortadas a su caja (antena, parlante, perilla, hojas, aguja del reloj, 2 papeles)
     * y la aguja del dial es aguja.svg (INDICADOR). Las 5 barras del ecualizador se dibujan en vivo. Medidas en unidades del dibujo.
     * Si no cargan las imágenes queda la radio dibujada a mano.
     */
    var ARTE = {
        dir: 'img/diseno/', fw: 1280, fh: 720,
        radio: { x: 640, y: 420, w: 881, h: 472, der: 1081 },
        dial: { x0: 322, x1: 957, y: 319, h: 175 },
        aguja: { y: 325, h: 150, ratio: 14.46 / 412.65 },
        perilla: { x: 838, y: 545, r: 47 },
        parlante: { x: 445, y: 514, r: 88 },
        bola: { x: 671, y: 76 },
        eq: { x0: 558, paso: 32, w: 26, base: 601, min: 12, max: 46, col: [0x69f969, 0xffd43b, 0xf9994b, 0xff6b6b, 0xae4ddb] },
        hud: { x: 100, y: 68 },
        capas: {
            antena: { vb: [645, 50, 363, 139], piv: [975, 150], prof: 9, esc: 3 },
            parlante: { vb: [349, 418, 192, 192], piv: [445, 514], prof: 10, esc: 4 },
            perilla: { vb: [785, 492, 106, 106], piv: [838, 545], prof: 12, esc: 5 },
            hojas: { vb: [-4, 343, 200, 116], piv: [92, 452], prof: 2, esc: 4 },
            reloj_aguja: { vb: [100, 146, 15, 34], piv: [107.5, 173.5], prof: 2, esc: 10 },
            papel1: { vb: [1108, 273, 79, 101], piv: [1147, 277], prof: 2, esc: 5 },
            papel2: { vb: [1172, 151, 88, 98], piv: [1216, 155], prof: 2, esc: 5 }
        }
    };

    var escena = {
        iniciar: function () { this.estaciones = []; this.reunidos = []; this.aguja = 0.5; this.vivo = 0; },

        precargar: function () {
            var self = this;
            if (!self.textures.exists('rd_fondo')) self.load.svg('rd_fondo', ARTE.dir + 'fondo.svg', { width: 1920, height: 1080 });
            Object.keys(ARTE.capas).forEach(function (n) {
                var c = ARTE.capas[n], clave = 'rd_' + n;
                if (!self.textures.exists(clave)) self.load.svg(clave, ARTE.dir + n + '.svg', { width: Math.round(c.vb[2] * c.esc), height: Math.round(c.vb[3] * c.esc) });
            });
            if (!self.textures.exists('rd_aguja')) self.load.svg('rd_aguja', ARTE.dir + 'aguja.svg', { width: 40, height: 1100 });
        },

        /** El dibujo entero y apoyado abajo; lo que sobra se rellena estirando su borde. */
        mapaFondo: function () {
            var necesarias = ['rd_fondo', 'rd_aguja'].concat(Object.keys(ARTE.capas).map(function (n) { return 'rd_' + n; }));
            for (var i = 0; i < necesarias.length; i++) if (!this.textures.exists(necesarias[i])) return null;
            var W = this.scale.width, H = this.scale.height;
            var k = Math.min(W / ARTE.fw, H / ARTE.fh);
            var ox = (W - ARTE.fw * k) / 2, oy = H - ARTE.fh * k;
            return { k: k, ox: ox, oy: oy, sx: function (x) { return ox + x * k; }, sy: function (y) { return oy + y * k; } };
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var F = this.mapaFondo();
            if (F) {
                var kk = F.k, A = ARTE;
                L.arte = true; L.F = F;
                L.mesa = F.sy(470);
                L.radio = { x: F.sx(A.radio.x), y: F.sy(A.radio.y), w: A.radio.w * kk, h: A.radio.h * kk };
                L.dial = { x0: F.sx(A.dial.x0), x1: F.sx(A.dial.x1), y: F.sy(A.dial.y), h: A.dial.h * kk };
                L.perilla = { x: F.sx(A.perilla.x), y: F.sy(A.perilla.y), r: A.perilla.r * kk };
                L.parlante = { x: F.sx(A.parlante.x), y: F.sy(A.parlante.y), r: A.parlante.r * kk };
                var rb = Math.max(24, Math.min(36, 30 * kk));
                L.bocina = { x: F.sx(A.hud.x), y: F.sy(A.hud.y), r: rb };
                // El presentador 3D, en el hueco libre a la derecha de la radio.
                var libre = W - F.sx(A.radio.der);
                L.pres = libre >= 120 ? { x: F.sx(A.radio.der) + libre / 2, piso: F.sy(700), alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
                return L;
            }
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            L.der = L.pres ? W - 150 : W - 16;
            L.mesa = Math.round(H * 0.8);
            var rw = Math.min(L.der - 24, 580), rh = Math.min(rw * 0.66, L.mesa - (L.bocina.y + L.bocina.r + 30));
            L.radio = { x: L.der / 2 + 8, y: L.mesa - rh / 2, w: rw, h: rh };
            var R = L.radio;
            L.dial = { x0: R.x - R.w * 0.42, x1: R.x + R.w * 0.42, y: R.y - R.h * 0.24, h: R.h * 0.3 };
            L.perilla = { x: R.x + R.w * 0.3, y: R.y + R.h * 0.22, r: Math.min(R.w, R.h) * 0.13 };
            L.parlante = { x: R.x - R.w * 0.2, y: R.y + R.h * 0.2, r: Math.min(R.w * 0.2, R.h * 0.26) };
            L.bocina = { x: L.parlante.x, y: L.parlante.y - L.parlante.r - 36, r: 24 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (L.arte) {
                var F = L.F;
                if (F.oy > 0) keep(this.add.rectangle(0, 0, L.W, F.oy + 2, 0x0b5c69).setOrigin(0, 0).setDepth(0));
                keep(this.add.image(F.ox, F.oy, 'rd_fondo', '__BASE').setOrigin(0, 0).setDisplaySize(ARTE.fw * F.k, ARTE.fh * F.k).setDepth(0));
                if (F.ox > 1) {
                    var tx = this.textures.get('rd_fondo'), iw = tx.getSourceImage().width, ih = tx.getSourceImage().height;
                    if (!tx.has('bi')) { tx.add('bi', 0, 0, 0, 2, ih); tx.add('bd', 0, iw - 2, 0, 2, ih); }
                    keep(this.add.image(0, F.oy, 'rd_fondo', 'bi').setOrigin(0, 0).setDisplaySize(F.ox + 1, ARTE.fh * F.k).setDepth(0));
                    keep(this.add.image(L.W - F.ox - 1, F.oy, 'rd_fondo', 'bd').setOrigin(0, 0).setDisplaySize(F.ox + 1, ARTE.fh * F.k).setDepth(0));
                }
                this.sembrarMotes(keep, 16, { x: 0, y: F.sy(20), w: L.W, h: F.sy(450) - F.sy(20), depth: 3 }, 0xfff3bf);
                this.montarRadioArte(keep);
                this.montarHud(keep);
                if (reubicar && this.nv) this.ponerEstaciones(this.nv.opciones, true);
                return;
            }
            // Archivo secreto: pared verde oscura con estantes de carpetas y una lámpara.
            K.textura(this, 'radio_archivo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, h);
                g.addColorStop(0, '#0b7285'); g.addColorStop(1, '#0c4a52');
                x.fillStyle = g; x.fillRect(0, 0, w, h);
                var cols = ['#ffd43b', '#ff8787', '#74c0fc', '#8ce99a', '#e599f7', '#ffa94d'];
                for (var f = 0; f < 3; f++) {
                    var ey = h * 0.2 + f * h * 0.17;
                    if (ey > L.radio.y - L.radio.h * 0.5 - 20) break;
                    K.madera(x, 0, ey, w, 12, { r: 2 });
                    for (var cx = 8; cx < w - 20; cx += 26 + (cx % 3) * 4) {
                        var ch = 36 + ((cx * 7 + f * 13) % 22);
                        x.fillStyle = cols[(cx + f) % cols.length];
                        x.fillRect(cx, ey - ch, 20, ch);
                        x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(cx + 5, ey - ch + 8, 10, 6);
                    }
                }
                K.madera(x, 0, L.mesa, w, h - L.mesa, { r: 0, claro: '#9c6b30', medio: '#7a4f22', oscuro: '#5c3613' });
            });
            keep(this.add.image(0, 0, 'radio_archivo').setOrigin(0, 0).setDepth(0));
            var foco = keep(this.add.graphics().setDepth(2));
            foco.fillStyle(0xffe066, 0.16);
            foco.fillTriangle(L.radio.x, 28, L.radio.x - L.radio.w * 0.7, L.radio.y - L.radio.h * 0.2, L.radio.x + L.radio.w * 0.7, L.radio.y - L.radio.h * 0.2);
            foco.fillStyle(0xffe066, 1);
            foco.fillCircle(L.radio.x, 26, 16);
            foco.fillStyle(0x495057, 1);
            foco.fillRect(L.radio.x - 3, 8, 6, 18);
            keep(K.nino(this, Math.max(90, L.radio.x - L.radio.w * 0.5 - 70), L.mesa + 2, 11, { ropa: 0xfcc419, esc: 1.65 }));
            this.sembrarMotes(keep, 20, { x: 0, y: 0, w: L.W, h: L.mesa, depth: 3 }, 0xfff3bf);
            this.montarRadio(keep);
            this.montarHud(keep);
            if (reubicar && this.nv) this.ponerEstaciones(this.nv.opciones, true);
        },

        /** Capa recortada del diseño (caja vb en unidades del dibujo) que gira o escala sobre su pivote. */
        capaArte: function (nombre, keep) {
            var F = this.L.F, k = F.k, c = ARTE.capas[nombre];
            var im = this.add.image(F.sx(c.piv[0]), F.sy(c.piv[1]), 'rd_' + nombre)
                .setOrigin((c.piv[0] - c.vb[0]) / c.vb[2], (c.piv[1] - c.vb[1]) / c.vb[3])
                .setDisplaySize(c.vb[2] * k, c.vb[3] * k).setDepth(c.prof);
            return keep(im);
        },

        montarRadioArte: function (keep) {
            var L = this.L, F = L.F, k = F.k;
            this.hojasI = this.capaArte('hojas', keep);
            this.relojI = this.capaArte('reloj_aguja', keep);
            this.papel1I = this.capaArte('papel1', keep);
            this.papel2I = this.capaArte('papel2', keep);
            this.antenaI = this.capaArte('antena', keep);
            this.parlanteI = this.capaArte('parlante', keep);
            this.perilla = this.capaArte('perilla', keep);
            // Resplandor de la bolita de la antena (late más fuerte cuando suena).
            this.bolaG = keep(this.add.circle(F.sx(ARTE.bola.x), F.sy(ARTE.bola.y), 24 * k, 0xffe066, 1).setAlpha(0).setDepth(9.5));
            this.antena = { x: F.sx(ARTE.bola.x), y: F.sy(ARTE.bola.y) };
            this.agujaI = keep(this.add.image(0, F.sy(ARTE.aguja.y), 'rd_aguja').setDisplaySize(ARTE.aguja.h * ARTE.aguja.ratio * k, ARTE.aguja.h * k).setDepth(12.6));
            this.ondasP = keep(this.add.graphics().setDepth(13));
            this.ecuG = keep(this.add.graphics().setDepth(13));
            this.dialG = null;
            this.dibujarDial();
        },

        montarRadio: function (keep) {
            var L = this.L, R = L.radio, D = L.dial, Pp = L.parlante, Pk = L.perilla;
            K.textura(this, 'radio_caja', R.w + 20, R.h + 20, function (x, w, h) {
                K.madera(x, 10, 10, R.w, R.h, { r: 28, claro: '#c47a3a', medio: '#9c5a22', oscuro: '#6b3b14' });
                // Ventana del dial.
                x.fillStyle = '#fff3bf'; K.rr(x, 10 + R.w * 0.06, 10 + R.h * 0.11, R.w * 0.88, R.h * 0.3, 14); x.fill();
                x.strokeStyle = '#5c3613'; x.lineWidth = 5; x.stroke();
                // Parlante con tela.
                x.fillStyle = '#e9d8a6'; x.beginPath(); x.arc(10 + R.w / 2 - R.w * 0.2, 10 + R.h / 2 + R.h * 0.2, Pp.r, 0, Math.PI * 2); x.fill();
                x.strokeStyle = 'rgba(92,54,19,0.5)'; x.lineWidth = 2;
                for (var k = -6; k <= 6; k++) { var yy = 10 + R.h / 2 + R.h * 0.2 + k * Pp.r / 7; x.beginPath(); x.moveTo(10 + R.w / 2 - R.w * 0.2 - Pp.r * 0.95, yy); x.lineTo(10 + R.w / 2 - R.w * 0.2 + Pp.r * 0.95, yy); x.stroke(); }
            });
            keep(this.add.image(R.x, R.y, 'radio_caja').setDepth(10));
            // Antena.
            var ant = keep(this.add.graphics().setDepth(9));
            ant.lineStyle(4, 0x868e96, 1); ant.lineBetween(R.x + R.w * 0.35, R.y - R.h / 2, R.x + R.w * 0.46, R.y - R.h / 2 - R.h * 0.35);
            ant.fillStyle(0xe03131, 1); ant.fillCircle(R.x + R.w * 0.46, R.y - R.h / 2 - R.h * 0.35, 6);
            this.antena = { x: R.x + R.w * 0.46, y: R.y - R.h / 2 - R.h * 0.35 };
            // Marcas del dial, aguja, perilla, ondas del parlante y ecualizador.
            this.dialG = keep(this.add.graphics().setDepth(12));
            this.perilla = keep(this.add.container(Pk.x, Pk.y).setDepth(12));
            var pg = this.add.graphics();
            pg.fillStyle(0x343a40, 1); pg.fillCircle(0, 0, Pk.r);
            pg.fillStyle(0x495057, 1); pg.fillCircle(0, 0, Pk.r * 0.72);
            pg.fillStyle(0xffd43b, 1); pg.fillRect(-3, -Pk.r * 0.85, 6, Pk.r * 0.5);
            this.perilla.add(pg);
            this.ondasP = keep(this.add.graphics().setDepth(13));
            this.ecuG = keep(this.add.graphics().setDepth(13));
            this.dibujarDial();
        },

        xDe: function (k) { var D = this.L.dial; return D.x0 + (D.x1 - D.x0) * k; },

        dibujarDial: function () {
            if (this.L.arte) {
                // Las marcas ya vienen en el dibujo: solo se mueven la aguja (INDICADOR) y la perilla.
                if (this.agujaI) this.agujaI.x = this.xDe(this.aguja);
                if (this.perilla) this.perilla.angle = (this.aguja - 0.5) * 300;
                return;
            }
            var D = this.L.dial;
            var g = this.dialG;
            g.clear();
            g.lineStyle(2, 0x5c3613, 0.6);
            for (var i = 0; i <= 20; i++) { var x = this.xDe(i / 20); g.lineBetween(x, D.y + D.h * 0.32, x, D.y + D.h * (i % 5 ? 0.42 : 0.5)); }
            var ax = this.xDe(this.aguja);
            g.lineStyle(4, 0xe03131, 1); g.lineBetween(ax, D.y - D.h * 0.48, ax, D.y + D.h * 0.48);
            this.perilla.angle = (this.aguja - 0.5) * 300;
        },

        /* ── Estaciones ── */

        ponerEstaciones: function (ids, ya) {
            var self = this;
            var D = this.L.dial;
            this.estaciones.forEach(function (e) { e.cont.destroy(); });
            var n = ids.length;
            var tam = Math.min(D.h * 0.62, (D.x1 - D.x0) / n * 0.8);
            this.estaciones = ids.map(function (id, i) {
                var k = (i + 0.5) / n;
                var c = self.add.container(self.xDe(k), D.y - D.h * 0.08).setDepth(11).setScale(ya ? 1 : 0);
                var halo = self.add.circle(0, 0, tam * 0.62, 0xffe066, 0);
                var img = self.add.image(0, 0, 'el_' + id);
                img.setScale(tam / Math.max(img.width, img.height));
                c.add([halo, img]);
                return { id: id, k: k, cont: c, halo: halo, img: img };
            });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            await Promise.all(this.estaciones.map(function (e) { return tw(self, { targets: e.cont, scale: 0, duration: 200 }); }));
            this.ponerEstaciones([], false);
            this.aguja = 0.5;
            this.dibujarDial();
        },

        alSonar: function () { this.vivo = this.time.now; },

        mostrarOpciones: async function (nv) {
            this.ponerEstaciones(nv.opciones, false);
            for (var i = 0; i < this.estaciones.length; i++) {
                K.ruido({ f: 2400, q: 2, dur: 0.05, vol: 0.05 });
                this.tweens.add({ targets: this.estaciones[i].cont, scale: 1, duration: 300, ease: 'Back.easeOut' });
                await esperar(this, 120);
            }
        },

        /* ── Gesto: girar el dial ── */

        enDial: function (p) {
            var L = this.L, D = L.dial, Pk = L.perilla;
            var enVentana = p.x > D.x0 - 20 && p.x < D.x1 + 20 && Math.abs(p.y - D.y) < D.h * 0.7;
            var enPerilla = Math.hypot(p.x - Pk.x, p.y - Pk.y) < Pk.r * 1.4;
            return enVentana ? 'ventana' : (enPerilla ? 'perilla' : null);
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var donde = this.enDial(p);
            if (!donde) return;
            this.arrastrando = { donde: donde, x0: p.x, a0: this.aguja };
            if (donde === 'ventana') this.moverAguja(p.x);
            this.pista.reiniciar();
        },

        alMover: function (p) {
            var r = this.arrastrando;
            if (!r) return;
            if (r.donde === 'ventana') this.moverAguja(p.x);
            else {
                var D = this.L.dial;
                this.aguja = Math.max(0, Math.min(1, r.a0 + (p.x - r.x0) / (D.x1 - D.x0) * 1.4));
                this.dibujarDial();
                this.tic();
            }
        },

        moverAguja: function (x) {
            var D = this.L.dial;
            this.aguja = Math.max(0, Math.min(1, (x - D.x0) / (D.x1 - D.x0)));
            this.dibujarDial();
            this.tic();
        },

        tic: function () {
            var e = this.estacionCerca(0.06);
            if (e !== this.sintonizada) {
                this.sintonizada = e;
                this.estaciones.forEach(function (q) { q.halo.setFillStyle(0xffe066, q === e ? 0.6 : 0); });
                K.ruido({ f: e ? 1800 : 5000, q: e ? 3 : 0.6, dur: 0.05, vol: 0.03 });
            }
        },

        estacionCerca: function (tol) {
            var a = this.aguja, mejor = null, dmin = tol;
            this.estaciones.forEach(function (e) { var d = Math.abs(e.k - a); if (d < dmin) { dmin = d; mejor = e; } });
            return mejor;
        },

        alSoltar: async function () {
            var r = this.arrastrando;
            this.arrastrando = null;
            if (!r || this.fase !== 'jugar') return;
            var e = this.estacionCerca(0.5 / Math.max(2, this.estaciones.length));
            if (!e) return;
            // La aguja se asienta en la estación.
            this.aguja = e.k;
            this.dibujarDial();
            this.tocado = e;
            var ok = await this.elegir(e.id, { x: e.cont.x, y: e.cont.y });
            if (ok === false) {
                K.ruido({ f: 5000, q: 0.4, dur: 0.6, vol: 0.06 });   // estática
                this.tweens.add({ targets: e.cont, angle: 10, duration: 60, yoyo: true, repeat: 3, onComplete: function () { e.cont.angle = 0; } });
            }
        },

        alAcertar: async function () {
            var e = this.tocado;
            this.reunidos.push(e.id);
            e.halo.setFillStyle(0x69db7c, 0.75);
            // La radio lo toca dos veces: es el que se repitió.
            for (var k = 0; k < 2; k++) {
                this.vivo = this.time.now;
                this.tweens.add({ targets: e.cont, scale: 1.3, duration: 160, yoyo: true });
                await this.sonar(e.id, { breve: true, bocina: false });
                await esperar(this, 160);
            }
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            if (!this.ayuda) return this.pistaBocina();
            var e = this.estaciones.filter(function (q) { return self.respuestas().indexOf(q.id) >= 0; })[0];
            if (!e) return Promise.resolve();
            var D = this.L.dial;
            return this.ctx.mano({ punto: { x: this.xDe(this.aguja), y: D.y }, holdMs: 200, arrastre: { dx: e.cont.x - this.xDe(this.aguja), dy: 0, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        /* ── Escena final: concierto de la radio ── */

        escenaFinal: async function () {
            var self = this;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            this.ponerEstaciones(ids, true);
            for (var i = 0; i < this.estaciones.length; i++) {
                var e = this.estaciones[i];
                await tw(this, { targets: this, aguja: e.k, duration: 380, ease: 'Sine.easeInOut', onUpdate: function () { self.dibujarDial(); } });
                e.halo.setFillStyle(0xffe066, 0.7);
                this.vivo = this.time.now;
                Ut.estallido(this, this.antena.x, this.antena.y, { n: 6, tex: 'nota', tam: 22, dist: 90, angulo: -Math.PI / 2, abanico: 1.4, depth: 60 });
                await this.sonar(e.id, { breve: true, bocina: false });
                if (!this.sigue()) return;
            }
            this.estaciones.forEach(function (e, k) { self.tweens.add({ targets: e.cont, y: e.cont.y - 10, duration: 200, yoyo: true, repeat: 3, delay: k * 80 }); });
            await esperar(this, 900);
        },

        /** Demo: la mano corre la aguja hasta la estación del que se repitió. */
        demoPaso: function () {
            var self = this;
            var r = this.respuestas();
            var e = this.estaciones.filter(function (q) { return r.indexOf(q.id) >= 0; })[0];
            if (!e) return null;
            var D = this.L.dial;
            return {
                desde: { x: this.xDe(this.aguja), y: D.y }, hasta: { x: this.xDe(e.k), y: D.y },
                hacer: async function () {
                    await tw(self, { targets: self, aguja: e.k, duration: 400, onUpdate: function () { self.dibujarDial(); self.tic(); } });
                    self.arrastrando = { donde: 'ventana', x0: 0, a0: e.k };
                    await self.alSoltar();
                }
            };
        },

        estadoExtra: function () {
            var D = this.L.dial;
            var self = this;
            return {
                aguja: +this.aguja.toFixed(2),
                dial: { x0: Math.round(D.x0), x1: Math.round(D.x1), y: Math.round(D.y) },
                estaciones: this.estaciones.map(function (e) { return { id: e.id, k: +e.k.toFixed(2), x: Math.round(self.xDe(e.k)) }; })
            };
        },

        /** Vida del cuarto: hojas, reloj, papeles, antena, parlante y ecualizador (todo desde el reloj de la escena). */
        pasoArte: function (time) {
            var L = this.L, F = L.F, k = F.k, Pp = L.parlante;
            var g = this.ondasP, q = this.ecuG;
            g.clear(); q.clear();
            var activo = this.sonando || (time - this.vivo < 400);
            if (this.hojasI) this.hojasI.setAngle(Math.sin(time / 1300) * 1.7 + Math.sin(time / 410) * 0.5);
            if (this.relojI) {
                var seg = time / 1000, fr = seg - Math.floor(seg);
                this.relojI.setAngle(Math.floor(seg) * 6 + 6 * (1 - Math.pow(1 - Math.min(1, fr * 5), 3)));
            }
            if (this.papel1I) this.papel1I.setAngle(Math.sin(time / 900) * 2.4);
            if (this.papel2I) this.papel2I.setAngle(Math.sin(time / 760 + 1.7) * 2.8);
            if (this.antenaI) {
                var an = Math.sin(time / 1700) * 0.9 + (activo ? Math.sin(time / 65) * 0.9 : 0);
                this.antenaI.setAngle(an);
                // La bolita sigue a la antena al inclinarse.
                var pv = ARTE.capas.antena.piv, dx = ARTE.bola.x - pv[0], dy = ARTE.bola.y - pv[1], r = an * Math.PI / 180;
                this.bolaG.setPosition(F.sx(pv[0] + dx * Math.cos(r) - dy * Math.sin(r)), F.sy(pv[1] + dx * Math.sin(r) + dy * Math.cos(r)));
                this.bolaG.setAlpha(activo ? 0.3 + 0.3 * Math.abs(Math.sin(time / 110)) : 0.08 + 0.08 * Math.sin(time / 600));
                this.antena.x = this.bolaG.x; this.antena.y = this.bolaG.y;
            }
            if (this.parlanteI) {
                var pu = activo ? 1 + 0.018 + 0.022 * Math.abs(Math.sin(time / 70)) : 1;
                this.parlanteI.setScale(this.parlanteI.scaleX / (this.parlanteI._pu || 1) * pu);
                this.parlanteI._pu = pu;
            }
            if (activo) {
                for (var kk = 0; kk < 3; kk++) {
                    var f = ((time / 600) + kk / 3) % 1;
                    g.lineStyle(Math.max(2, 3 * k), 0xffe066, 0.7 * (1 - f));
                    g.strokeCircle(Pp.x, Pp.y, Pp.r * (1 + f * 0.35));
                }
            }
            // Ecualizador (las 5 barras de colores del dibujo, en vivo).
            var E = ARTE.eq;
            for (var b = 0; b < 5; b++) {
                var alto = (activo ? E.min + Math.abs(Math.sin(time / (90 + b * 23) + b)) * (E.max - E.min) : E.min) * k;
                q.fillStyle(E.col[b], 1);
                q.fillRoundedRect(F.sx(E.x0 + b * E.paso), F.sy(E.base) - alto, E.w * k, alto, 2 * k);
            }
        },

        paso: function (time) {
            if (this.L.arte) return this.pasoArte(time);
            var L = this.L, Pp = L.parlante, R = L.radio;
            var g = this.ondasP, q = this.ecuG;
            g.clear(); q.clear();
            var activo = this.sonando || (time - this.vivo < 400);
            if (activo) {
                for (var k = 0; k < 3; k++) {
                    var f = ((time / 600) + k / 3) % 1;
                    g.lineStyle(3, 0xffe066, 0.7 * (1 - f));
                    g.strokeCircle(Pp.x, Pp.y, Pp.r * (0.4 + f * 0.8));
                }
            }
            // Ecualizador junto a la perilla.
            var x0 = R.x + R.w * 0.05, base = R.y + R.h * 0.4;
            for (var b = 0; b < 5; b++) {
                var alto = activo ? (0.3 + Math.abs(Math.sin(time / (90 + b * 23) + b))) * R.h * 0.12 : R.h * 0.02;
                q.fillStyle([0x69db7c, 0xffd43b, 0xff922b, 0xff6b6b, 0x74c0fc][b], 1);
                q.fillRect(x0 + b * R.w * 0.03, base - alto, R.w * 0.022, alto);
            }
        }
    };

    K.crear({ id: 'radio', fondo: '#0b7285', escena: escena });
})(typeof window !== 'undefined' ? window : this);
