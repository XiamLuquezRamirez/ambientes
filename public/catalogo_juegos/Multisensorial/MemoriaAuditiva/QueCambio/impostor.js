/**
 * «El impostor del archivo» — motor propio de ¿Qué cambió? (5-6 años).
 * Cada sonido se guarda en un sobre (el sobre se ilumina cuando suena; no se ve qué hay adentro).
 * Se apaga la luz, los sobres se sacuden y vuelven a sonar: uno fue cambiado. Los sobres se abren
 * y el niño ARRASTRA AL IMPOSTOR al tacho; luego, de la bandeja, PONE EL ORIGINAL en el sobre vacío.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    /**
     * Diseño del equipo (img/diseno, 1280×720): fondo.svg = pared, piso, bandeja de madera y tacho SIN los 3 sobres ni la tapa.
     * El sobre se arma por capas (sobre_dorso, sobre_solapa abierta, sobre_frente = bolsillo, sobre_cerrada = solapa cerrada)
     * para que el animal asome DENTRO del sobre (entre el dorso y el bolsillo). Medidas en unidades del dibujo.
     * Si no cargan las imágenes queda el escenario dibujado a mano.
     */
    var ARTE = {
        dir: 'img/diseno/', fw: 1280, fh: 720,
        sobre: { cx: 640, cy: 318, w: 289, h: 166, paso: 353.5, borde: 235, sello: 322 },
        vb: { dorso: [491, 109, 298, 296], solapa: [491, 109, 298, 130], frente: [491, 290, 298, 115], cerrada: [491, 231, 298, 106] },
        esc: { dorso: 3, solapa: 3, frente: 3, cerrada: 3 },
        tacho: { x: 968, y: 560, r: 70 },
        tapa: { vb: [1012, 490, 60, 140], piv: [1042, 624], esc: 5 },
        bandeja: { x: 431, y: 552, w: 520, h: 130, caja: [140, 465, 582, 175] },
        mesa: 335, hud: { x: 80, y: 72 }, destino: { x: 640, y: 70 }
    };

    var escena = {
        precargar: function () {
            var self = this;
            if (!self.textures.exists('cb_fondo')) self.load.svg('cb_fondo', ARTE.dir + 'fondo.svg', { width: 1920, height: 1080 });
            Object.keys(ARTE.vb).forEach(function (n) {
                var v = ARTE.vb[n];
                if (!self.textures.exists('cb_' + n)) self.load.svg('cb_' + n, ARTE.dir + 'sobre_' + n + '.svg', { width: Math.round(v[2] * ARTE.esc[n]), height: Math.round(v[3] * ARTE.esc[n]) });
            });
            var t = ARTE.tapa;
            if (!self.textures.exists('cb_tapa')) self.load.svg('cb_tapa', ARTE.dir + 'tacho_tapa.svg', { width: t.vb[2] * t.esc, height: t.vb[3] * t.esc });
        },

        /** El dibujo entero y apoyado abajo; lo que sobra se rellena estirando su borde. */
        mapaFondo: function () {
            var nec = ['cb_fondo', 'cb_dorso', 'cb_solapa', 'cb_frente', 'cb_cerrada', 'cb_tapa'];
            for (var i = 0; i < nec.length; i++) if (!this.textures.exists(nec[i])) return null;
            var W = this.scale.width, H = this.scale.height;
            var k = Math.min(W / ARTE.fw, H / ARTE.fh);
            var ox = (W - ARTE.fw * k) / 2, oy = H - ARTE.fh * k;
            return { k: k, ox: ox, oy: oy, sx: function (x) { return ox + x * k; }, sy: function (y) { return oy + y * k; } };
        },

        /** Altura a la que asoma el animal dentro del sobre (en el diseño, el bolsillo le tapa los pies). */
        asomo: function (s) { return s.y - s.h * (this.L.arte ? 0.36 : 0.55); },

        abrirSobre: function (s) {
            var self = this;
            if (!this.L.arte) { this.tweens.add({ targets: s.solapa, scaleY: -1, duration: 220 }); s.sello.setVisible(false); return; }
            // La solapa cerrada se levanta (se achata hacia el borde) y aparece la abierta, con su cara turquesa.
            this.tweens.add({ targets: s.solapa, scaleY: 0, duration: 200, onComplete: function () { s.solapa.setVisible(false); } });
            this.tweens.add({ targets: s.solapaAb, scaleY: s.solapaAb.escY, duration: 260, delay: 120, ease: 'Back.easeOut' });
            s.sello.setVisible(false);
        },

        iniciar: function () { this.sobres = []; this.cosas = []; this.bandeja = []; this.reunidos = []; this.etapa = 'impostor'; },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var F = this.mapaFondo();
            if (F) {
                var kk = F.k, A = ARTE;
                L.arte = true; L.F = F;
                L.mesa = F.sy(A.mesa);
                L.tacho = { x: F.sx(A.tacho.x), y: F.sy(A.tacho.y), r: A.tacho.r * kk };
                L.bandeja = { x: F.sx(A.bandeja.x), y: F.sy(A.bandeja.y), w: A.bandeja.w * kk, h: A.bandeja.h * kk };
                L.bocina = { x: F.sx(A.hud.x), y: F.sy(A.hud.y), r: Math.max(24, Math.min(36, 30 * kk)) };
                L.destino = { x: F.sx(A.destino.x), y: F.sy(A.destino.y) };
                var libre = W - F.sx(1138);
                L.pres = libre >= 120 ? { x: F.sx(1138) + libre / 2, piso: F.sy(705), alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
                return L;
            }
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            L.der = L.pres ? W - 150 : W - 16;
            L.mesa = Math.round(H * 0.4);
            L.fila = L.mesa + (H - L.mesa) * 0.26;
            L.tacho = { x: L.der * 0.8, y: L.mesa + (H - L.mesa) * 0.72, r: Math.min(70, L.der * 0.12) };
            L.bandeja = { x: L.der * 0.36, y: L.tacho.y, w: Math.min(L.der * 0.58, 340), h: Math.min(110, (H - L.mesa) * 0.3) };
            L.bocina = { x: 56, y: L.mesa - 36, r: 24 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (L.arte) {
                var F = L.F;
                if (F.oy > 0) keep(this.add.rectangle(0, 0, L.W, F.oy + 2, 0x6b4094).setOrigin(0, 0).setDepth(0));
                keep(this.add.image(F.ox, F.oy, 'cb_fondo', '__BASE').setOrigin(0, 0).setDisplaySize(ARTE.fw * F.k, ARTE.fh * F.k).setDepth(0));
                if (F.ox > 1) {
                    var tx = this.textures.get('cb_fondo'), iw = tx.getSourceImage().width, ih = tx.getSourceImage().height;
                    if (!tx.has('bi')) { tx.add('bi', 0, 0, 0, 2, ih); tx.add('bd', 0, iw - 2, 0, 2, ih); }
                    keep(this.add.image(0, F.oy, 'cb_fondo', 'bi').setOrigin(0, 0).setDisplaySize(F.ox + 1, ARTE.fh * F.k).setDepth(0));
                    keep(this.add.image(L.W - F.ox - 1, F.oy, 'cb_fondo', 'bd').setOrigin(0, 0).setDisplaySize(F.ox + 1, ARTE.fh * F.k).setDepth(0));
                }
                this.sembrarMotes(keep, 14, { x: 0, y: F.sy(20), w: L.W, h: F.sy(330) - F.sy(20), depth: 5 }, 0xfff3bf);
                // Tapa del tacho (capa del diseño): gira sobre su base.
                var tp = ARTE.tapa, kt = F.k;
                this.tapaTacho = keep(this.add.image(F.sx(tp.piv[0]), F.sy(tp.piv[1]), 'cb_tapa')
                    .setOrigin((tp.piv[0] - tp.vb[0]) / tp.vb[2], (tp.piv[1] - tp.vb[1]) / tp.vb[3])
                    .setDisplaySize(tp.vb[2] * kt, tp.vb[3] * kt).setDepth(9));
                // Brillo de la bandeja cuando toca poner el original.
                this.bandejaG = keep(this.add.graphics().setDepth(5));
                this.lampara = null;
                this.oscuro = keep(this.add.rectangle(0, 0, L.W, L.H, 0x000814, 0).setOrigin(0, 0).setDepth(44));
                this.montarHud(keep);
                return;
            }
            K.textura(this, 'impostor_fondo', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, L.mesa);
                g.addColorStop(0, '#0b7285'); g.addColorStop(1, '#0c4a52');
                x.fillStyle = g; x.fillRect(0, 0, w, L.mesa);
                // Archivadores al fondo.
                for (var c = 0; c < 6; c++) {
                    var cx = w * (c + 0.5) / 6, cw = w / 6 * 0.8, cy = L.mesa * 0.42;
                    x.fillStyle = '#495057'; K.rr(x, cx - cw / 2, cy, cw, L.mesa - cy, 6); x.fill();
                    for (var d = 0; d < 3; d++) {
                        x.fillStyle = '#868e96'; K.rr(x, cx - cw * 0.42, cy + 8 + d * (L.mesa - cy) / 3, cw * 0.84, (L.mesa - cy) / 3 - 10, 4); x.fill();
                        x.fillStyle = '#ced4da'; x.fillRect(cx - 10, cy + 8 + d * (L.mesa - cy) / 3 + 10, 20, 5);
                    }
                }
                K.madera(x, 0, L.mesa, w, h - L.mesa, { r: 0, claro: '#9c6b30', medio: '#7a4f22', oscuro: '#5c3613' });
            });
            keep(this.add.image(0, 0, 'impostor_fondo').setOrigin(0, 0).setDepth(0));
            this.lampara = keep(this.add.circle(L.der * 0.18, 36, 16, 0xffe066, 0.85).setDepth(4));
            keep(this.add.rectangle(L.der * 0.18, 18, 8, 22, 0x495057).setDepth(4));
            var cono = keep(this.add.graphics().setDepth(1));
            cono.fillStyle(0xffe066, 0.14);
            cono.fillTriangle(L.der * 0.18, 48, L.der * 0.05, L.mesa + 8, L.der * 0.42, L.mesa + 8);
            keep(K.nino(this, L.der * 0.5, L.mesa + 2, 4, { ropa: 0x748ffc, esc: 1.65 }));
            this.sembrarMotes(keep, 16, { x: L.der * 0.05, y: 40, w: L.der * 0.4, h: L.mesa - 50, depth: 5 }, 0xfff3bf);
            // Tacho de reciclaje y bandeja.
            var T = L.tacho, B = L.bandeja;
            var tg = keep(this.add.graphics().setDepth(8));
            tg.fillStyle(0x2b8a3e, 1);
            tg.beginPath(); tg.moveTo(T.x - T.r * 0.8, T.y - T.r * 0.6); tg.lineTo(T.x + T.r * 0.8, T.y - T.r * 0.6); tg.lineTo(T.x + T.r * 0.62, T.y + T.r * 0.85); tg.lineTo(T.x - T.r * 0.62, T.y + T.r * 0.85); tg.closePath(); tg.fillPath();
            tg.lineStyle(3, 0x1b5e20, 1); for (var k = -1; k <= 1; k++) tg.lineBetween(T.x + k * T.r * 0.35, T.y - T.r * 0.4, T.x + k * T.r * 0.28, T.y + T.r * 0.7);
            this.tapaTacho = keep(this.add.rectangle(T.x, T.y - T.r * 0.68, T.r * 1.8, T.r * 0.18, 0x37b24d).setDepth(9));
            var bg = keep(this.add.graphics().setDepth(5));
            bg.fillStyle(0xd0bfff, 0.35); bg.fillRoundedRect(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 14);
            bg.lineStyle(3, 0xb197fc, 0.9); bg.strokeRoundedRect(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 14);
            this.oscuro = keep(this.add.rectangle(0, 0, L.W, L.H, 0x000814, 0).setOrigin(0, 0).setDepth(44));
            this.montarHud(keep);
        },

        /* ── Sobres ── */

        armarSobres: function (n) {
            var self = this;
            var L = this.L;
            this.sobres.forEach(function (s) { s.cont.destroy(); if (s.frente) s.frente.destroy(); });
            if (L.arte) { this.armarSobresArte(n); return; }
            var sw = Math.min((L.der - 30) / n * 0.86, 150), sh = sw * 0.72;
            this.sobres = [];
            for (var i = 0; i < n; i++) {
                var x = 15 + (L.der - 30) * (i + 0.5) / n;
                var c = this.add.container(x, L.fila).setDepth(20);
                var luz = this.add.ellipse(0, 0, sw * 1.3, sh * 1.5, 0xfff3bf, 0);
                var cuerpo = this.add.rectangle(0, 0, sw, sh, 0xf8e0b0).setStrokeStyle(3, 0xc9a26b);
                var solapa = this.add.triangle(0, -sh / 2, -sw / 2, 0, sw / 2, 0, 0, sh * 0.5, 0xe9c98b).setOrigin(0.5, 0);
                var sello = this.add.circle(0, sh * 0.02, sw * 0.08, 0xe03131);
                c.add([luz, cuerpo, solapa, sello]);
                this.sobres.push({ i: i, cont: c, luz: luz, solapa: solapa, sello: sello, w: sw, h: sh, x: x, y: L.fila, cosa: null });
            }
        },

        /** Sobres del diseño: dorso (con la solapa abierta escondida), animal en medio, y bolsillo + solapa cerrada + sello delante. */
        armarSobresArte: function (n) {
            var L = this.L, F = L.F, A = ARTE, S = A.sobre;
            var paso = n > 1 ? Math.min(S.paso, 1000 / (n - 1)) : S.paso;
            var sc = Math.min(1, paso / S.paso), q = sc * F.k;
            this.sobres = [];
            for (var i = 0; i < n; i++) {
                var dx = (i - (n - 1) / 2) * paso;
                var x = F.sx(A.sobre.cx + dx), y = F.sy(S.cy);
                var pos = function (v) { return [(v[0] - S.cx) * q, (v[1] - S.cy) * q, v[2] * q, v[3] * q]; };
                var c = this.add.container(x, y).setDepth(20);
                var mov = this.add.container(0, 0);
                var luz = this.add.ellipse(0, 0, S.w * q * 1.3, S.h * q * 1.5, 0xfff3bf, 0);
                var d = pos(A.vb.dorso);
                var dorso = this.add.image(d[0], d[1], 'cb_dorso').setOrigin(0, 0).setDisplaySize(d[2], d[3]);
                var so = pos(A.vb.solapa);
                var solapaAb = this.add.image(0, (S.borde - S.cy) * q, 'cb_solapa').setOrigin(0.5, 1).setDisplaySize(so[2], so[3]);
                solapaAb.setDisplaySize(so[2], so[3]); solapaAb.escY = solapaAb.scaleY; solapaAb.scaleY = 0;
                mov.add([dorso, solapaAb]);
                c.add([luz, mov]);
                var fr = this.add.container(x, y).setDepth(23);
                var movF = this.add.container(0, 0);
                var f = pos(A.vb.frente);
                var frente = this.add.image(f[0], f[1], 'cb_frente').setOrigin(0, 0).setDisplaySize(f[2], f[3]);
                var ce = pos(A.vb.cerrada);
                var cerrada = this.add.image(0, (S.borde - S.cy) * q, 'cb_cerrada').setOrigin(0.5, 0).setDisplaySize(ce[2], ce[3]);
                var sello = this.add.circle(0, (S.sello - S.cy) * q, 22 * q, 0xe03131).setStrokeStyle(Math.max(2, 3 * q), 0xa51111);
                movF.add([frente, cerrada, sello]);
                fr.add(movF);
                var sw = S.w * q, sh = S.h * q;
                this.sobres.push({ i: i, cont: c, frente: fr, mov: mov, movF: movF, luz: luz, solapa: cerrada, solapaAb: solapaAb, sello: sello, w: sw, h: sh, x: x, y: y, q: q, cosa: null });
            }
        },

        prepararNivel: async function (i, nv) {
            await this.retirar(this.cosas.concat(this.bandeja));
            this.cosas = [];
            this.bandeja = [];
            this.etapa = 'impostor';
            this.armarSobres(nv.reproducciones[0].length);
        },

        alSonar: function (id, k) {
            var s = this.sobres[k];
            if (!s) return;
            this.tweens.add({ targets: s.luz, fillAlpha: 0.7, duration: 150, yoyo: true, hold: 450 });
            this.tweens.add({ targets: s.cont, y: s.y - 10, duration: 120, yoyo: true });
        },

        /** Entre vueltas: se apaga la luz y todos los sobres se sacuden (uno fue cambiado). */
        alSegundaVuelta: async function () {
            var self = this;
            K.ruido({ f: 200, q: 0.6, dur: 0.5, vol: 0.06 });
            this.apagado = true;
            await tw(this, { targets: this.oscuro, fillAlpha: 0.75, duration: 300 });
            this.sobres.forEach(function (s, k) { self.tweens.add({ targets: s.cont, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 4, delay: k * 40, onComplete: function () { s.cont.angle = 0; } }); });
            K.ruido({ f: 1800, q: 0.7, dur: 0.6, vol: 0.05 });
            await esperar(this, 700);
            this.apagado = false;
            await tw(this, { targets: this.oscuro, fillAlpha: 0, duration: 300 });
        },

        /** Los sobres se abren y muestran lo que tienen ahora (la segunda escucha). */
        mostrarOpciones: async function (nv) {
            var self = this;
            var despues = nv.reproducciones[1];
            var tam = Math.min(this.sobres[0].w * 0.82, 120);
            this.cosas = [];
            for (var i = 0; i < this.sobres.length; i++) {
                var s = this.sobres[i];
                this.abrirSobre(s);
                var a = this.crearCosa(despues[i], s.x, s.y - s.h * 0.15, tam, { sinSombra: true, depth: 22 });
                a.casa = { x: s.x, y: s.y - s.h * 0.15 };
                var yA = this.asomo(s);
                a.prof = 22;
                a.sobre = s;
                s.cosa = a;
                a.cont.setScale(0.2);
                this.tweens.add({ targets: a.cont, scale: 1, y: yA, duration: 300, ease: 'Back.easeOut' });
                a.casa.y = yA;
                this.cosas.push(a);
                K.ruido({ f: 1400, q: 1, dur: 0.06, vol: 0.05 });
                await esperar(this, 140);
            }
        },

        /** Después del impostor: en la bandeja aparecen el original y dos más. */
        llenarBandeja: async function () {
            var nv = this.nv, B = this.L.bandeja;
            var antes = nv.cambio.antes;
            var self = this;
            var usados = nv.reproducciones[0].concat(nv.reproducciones[1]);
            var otros = Ut.mezclar(Object.keys(this.config.elementos || {}).filter(function (id) { return usados.indexOf(id) < 0 && self.textures.exists('el_' + id); })).slice(0, 2);
            var ids = Ut.mezclar([antes].concat(otros));
            var lug = ids.map(function (id, i) { return { x: B.x - B.w / 2 + B.w * (i + 0.5) / ids.length, y: B.y }; });
            this.bandeja = await this.filaDeCosas(ids, lug, Math.min(B.h * 0.9, B.w / ids.length * 0.8), { depth: 25 });
        },

        sobreVacio: function () { return this.sobres.filter(function (s) { return !s.cosa; })[0]; },

        /* ── Gesto: arrastrar ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar') return;
            var lista = this.etapa === 'impostor' ? this.cosas : this.bandeja;
            if (!this.tomar(p, lista)) {
                var b = this.cosaEn(this.cosas.concat(this.bandeja), p.x, p.y);
                if (b && !this.sonando) this.sonar(b.id, { breve: true, bocina: false });
            }
        },
        alMover: function (p) { this.llevar(p); },

        alSoltar: async function () {
            var a = this.soltar();
            if (!a) return;
            var T = this.L.tacho;
            if (this.fase !== 'jugar') { this.aCasa(a); return; }
            if (this.etapa === 'impostor') {
                if (Math.hypot(a.cont.x - T.x, a.cont.y - T.y) > T.r * 1.5) { this.aCasa(a); return; }
                this.tocado = a;
                if (a.id === this.nv.cambio.despues) { await this.tirar(a); return; }
                this.aCasa(a, true);
                await this.fallar(a.id, { x: T.x, y: T.y });
                return;
            }
            var s = this.sobreVacio();
            if (!s || Math.hypot(a.cont.x - s.x, a.cont.y - (s.y - s.h * 0.4)) > s.w * 0.9) { this.aCasa(a); return; }
            this.tocado = a;
            var ok = await this.elegir(a.id, { x: s.x, y: s.y });
            if (ok === false) this.aCasa(a, true);
        },

        /** El impostor va al tacho: la tapa se abre, cae y queda el sobre vacío. */
        tirar: async function (a) {
            var T = this.L.tacho;
            this.pista.reiniciar();
            if (this.L.arte) this.tweens.add({ targets: this.tapaTacho, angle: 24, duration: 150, yoyo: true, hold: 400 });
            else this.tweens.add({ targets: this.tapaTacho, angle: -40, y: this.tapaTacho.y - 10, duration: 150, yoyo: true, hold: 400 });
            await tw(this, { targets: a.cont, x: T.x, y: T.y - T.r * 0.3, scale: 0.5, duration: 260, ease: 'Quad.easeIn' });
            K.ruido({ f: 900, q: 1.5, dur: 0.18, vol: 0.12 });
            a.cont.setVisible(false);
            a.usada = true;
            if (a.sobre) a.sobre.cosa = null;
            this.impostor = a;
            this.etapa = 'original';
            this.ctx.decir({ voz: 'zeus', texto: '¡Ese era el impostor! ¿Cuál estaba antes?' }, { minMs: 800 });
            await this.llenarBandeja();
        },

        alAcertar: async function () {
            var a = this.tocado;
            var s = this.sobreVacio();
            // El original vuelve a su sobre; el impostor asoma del tacho: antes y después juntos.
            await tw(this, { targets: a.cont, x: s.x, y: this.asomo(s), duration: 260 });
            s.cosa = a;
            a.usada = true;
            this.reunidos.push(a.id);
            var T = this.L.tacho, imp = this.impostor;
            if (imp) { imp.cont.setVisible(true).setPosition(T.x, T.y - T.r * 0.9).setScale(0.6); }
            var flecha = this.add.graphics().setDepth(40);
            flecha.lineStyle(5, 0xffd43b, 1); flecha.lineBetween(T.x - T.r * 0.5, T.y - T.r * 0.9, s.x + s.w * 0.4, s.y - s.h * 0.55);
            await this.sonar(imp ? imp.id : a.id, { breve: true, bocina: false });
            await esperar(this, 150);
            await Promise.all([this.sonar(a.id, { breve: true, bocina: false }), a.saltito(0.2, 2)]);
            flecha.destroy();
        },

        alFallar: async function () { if (this.tocado) await this.tocado.sacudir(); },

        alTerminarNivel: async function () {
            var self = this;
            if (this.impostor) { this.impostor.destruir(); this.impostor = null; }
            await this.retirar(this.cosas.filter(function (a) { return a.cont.active; }).concat(this.bandeja));
            this.cosas = []; this.bandeja = [];
            await Promise.all(this.sobres.map(function (s) { return tw(self, { targets: s.cont, alpha: 0, duration: 250 }); }));
        },

        mostrarPista: function (cancelada) {
            if (this.etapa === 'impostor') {
                var T = this.L.tacho, imp = this.cosas.filter(function (c) { return c.id === this.nv.cambio.despues; }, this);
                if (this.ayuda && imp[0]) {
                    var self = this;
                    return this.ctx.mano({ punto: { x: imp[0].cont.x, y: imp[0].cont.y }, holdMs: 200, arrastre: { dx: T.x - imp[0].cont.x, dy: T.y - imp[0].cont.y, durMs: 900 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
                }
                return this.pistaBocina();
            }
            var s = this.sobreVacio();
            return s ? this.pistaArrastre(cancelada, this.bandeja, { x: s.x, y: s.y }) : Promise.resolve();
        },

        /* ── Escena final: los sobres se sellan y van al archivador ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            this.armarSobres(ids.length);
            var cosas = ids.map(function (id, i) {
                var s = self.sobres[i];
                var a = self.crearCosa(id, s.x, self.asomo(s), Math.min(s.w * 0.8, 110), { sinSombra: true, depth: 22 });
                return a;
            });
            for (var i = 0; i < ids.length; i++) {
                var s = this.sobres[i];
                await this.sonar(ids[i], { breve: true, bocina: false });
                // Entra al sobre y se sella con un sello dorado.
                await tw(this, { targets: cosas[i].cont, y: s.y, scale: 0.3, alpha: 0, duration: 220 });
                s.sello.setFillStyle(0xfab005).setScale(1.6);
                K.ruido({ f: 260, q: 1, dur: 0.1, vol: 0.12 });
                this.tweens.add({ targets: s.sello, scale: 1, duration: 200, ease: 'Back.easeOut' });
                if (!this.sigue()) return;
            }
            // Vuelan al archivador del fondo y el cajón se cierra con llave.
            var destino = L.destino || { x: L.W * 0.5, y: L.mesa * 0.6 };
            await Promise.all(this.sobres.map(function (s, k) { return esperar(self, k * 120).then(function () { return self.saltarA(s.cont, destino.x, destino.y, { ms: 600, alto: 120, esc: 0.3 }); }); }));
            K.ruido({ f: 2500, q: 3, dur: 0.08, vol: 0.12 });
            Ut.estallido(this, destino.x, destino.y, { n: 16, tex: 'estrella', tam: 26, dist: 150, sinTinte: true, depth: 60 });
            await esperar(this, 700);
        },

        /** Demo: el impostor al tacho y luego el original a su sobre. */
        demoPaso: function () {
            var self = this;
            return [
                function () {
                    var imp = self.cosas.filter(function (c) { return c.id === self.nv.cambio.despues; })[0];
                    return self.pasoArrastre(imp, self.L.tacho);
                },
                function () {
                    var s = self.sobreVacio();
                    var ori = self.bandeja.filter(function (c) { return c.id === self.nv.cambio.antes; })[0];
                    return s ? self.pasoArrastre(ori, { x: s.x, y: s.y - s.h * 0.4 }) : null;
                }
            ];
        },

        paso: function (time) {
            if (this.lampara) this.lampara.setAlpha(this.apagado ? 0.15 : 0.65 + Math.sin(time / 180) * 0.2);
            var L = this.L;
            if (!L || !L.arte) return;
            // Cada sobre flota un poquito (cada uno a su ritmo) y su parte de adelante lo sigue.
            this.sobres.forEach(function (s, i) {
                if (!s.cont.active || !s.frente || !s.frente.active) return;
                var b = Math.sin(time / 900 + i * 1.7) * 2.2 * s.q;
                s.mov.y = b; s.movF.y = b;
                s.frente.setPosition(s.cont.x, s.cont.y).setAngle(s.cont.angle).setAlpha(s.cont.alpha).setScale(s.cont.scaleX, s.cont.scaleY);
                if (s.sello.visible) s.sello.setAlpha(0.8 + Math.sin(time / 400 + i) * 0.2);
            });
            // La tapa del tacho se mece; invita a tirar al impostor.
            if (this.tapaTacho && !this.tweens.isTweening(this.tapaTacho)) {
                var gesto = this.etapa === 'impostor' && this.fase === 'jugar' ? Math.max(0, Math.sin(time / 700)) * 5 : 0;
                this.tapaTacho.angle = Math.sin(time / 1300) * 1.2 + gesto;
            }
            // La bandeja brilla cuando toca poner el original en el sobre vacío.
            var g = this.bandejaG;
            if (g) {
                g.clear();
                if (this.etapa === 'original' && this.fase === 'jugar') {
                    var F = L.F, c = ARTE.bandeja.caja;
                    g.lineStyle(Math.max(3, 4 * F.k), 0xffe066, 0.35 + 0.35 * Math.sin(time / 260));
                    g.strokeRoundedRect(F.sx(c[0]), F.sy(c[1]), c[2] * F.k, c[3] * F.k, 8 * F.k);
                }
            }
        },

        estadoExtra: function () {
            var T = this.L.tacho, s = this.sobreVacio();
            var lista = function (l) { return l.filter(function (a) { return !a.usada && a.cont.active && a.cont.visible; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; }); };
            return {
                etapa: this.etapa, impostor: this.nv && this.nv.cambio ? this.nv.cambio.despues : null, original: this.nv && this.nv.cambio ? this.nv.cambio.antes : null,
                tacho: { x: Math.round(T.x), y: Math.round(T.y) }, vacio: s ? { x: Math.round(s.x), y: Math.round(s.y - s.h * 0.4) } : null,
                sobres: lista(this.cosas), bandeja: lista(this.bandeja)
            };
        }
    };

    K.crear({ id: 'impostor', fondo: '#0b7285', escena: escena });
})(typeof window !== 'undefined' ? window : this);
