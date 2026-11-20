/**
 * «La bóveda del archivo» — motor propio de El gran desafío de memoria (5-6 años).
 * La rueda gira un clic con cada sonido (no se ve qué). Tres cerraduras:
 *   1) TOCA los que escuchaste: vuelan al buzón;
 *   2) TOCA el que sonó PRIMERO → placa bandera verde;
 *   3) TOCA el que sonó AL FINAL → placa a cuadros.
 * Con las tres luces verdes la bóveda se abre. No hay arrastre de fichas.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;

    /**
     * Diseño del equipo (img/diseno, 1280×720): fondo.svg trae el cuarto, el aro de la bóveda, los 2 paneles, el buzón y el piso.
     * Lo que se mueve va aparte: puerta (cara con remaches), rueda, interior de la bóveda abierta y puerta abierta (Mesa de trabajo 13),
     * luces de cerradura (roja/verde) y banderas (Mesa de trabajo 14: verde = primero; la de cuadros es la misma recoloreada).
     * Medidas en unidades del dibujo. Si no cargan las imágenes queda la bóveda dibujada a mano.
     */
    var ARTE = {
        dir: 'img/diseno/', fw: 1280, fh: 720,
        puerta: { x: 640, y: 263.2, r: 162 },
        mesa: 537,
        buzon: { x: 638, y: 478, w: 148, h: 62, caja: [564, 447, 148, 64] },
        panel: { w: 165, h: 125, s: 118, ini: [340.1, 286.7], fin: [939.9, 286.7] },
        luces: [[559.1, 75.6], [639, 56.3], [718.7, 75.6]], luzVb: [539, 55, 42, 42],
        off: [248.28, -41.43],
        hud: { x: 70, y: 72 },
        banderas: { ini: { x: 258, y: 222, flip: false, clave: 'bandera_verde' }, fin: { x: 1021.5, y: 222, flip: true, clave: 'bandera_cuadros' }, esc: 0.45, vb: [0, 120, 500, 345], piv: [58.6, 455] },
        capas: {
            puerta: { vb: [484, 106, 312, 312], esc: 3 },
            rueda: { vb: [558, 178.4, 160, 160], esc: 4 },
            interior_abierta: { vb: [262, 160, 270, 285], esc: 3 },
            puerta_abierta: { vb: [86, 128, 178, 354], esc: 3 }
        }
    };

    var escena = {
        precargar: function () {
            var self = this;
            if (!self.textures.exists('bv_fondo')) self.load.svg('bv_fondo', ARTE.dir + 'fondo.svg', { width: 1920, height: 1080 });
            Object.keys(ARTE.capas).forEach(function (n) {
                var c = ARTE.capas[n];
                if (!self.textures.exists('bv_' + n)) self.load.svg('bv_' + n, ARTE.dir + n + '.svg', { width: Math.round(c.vb[2] * c.esc), height: Math.round(c.vb[3] * c.esc) });
            });
            var lv = ARTE.luzVb;
            ['luz_roja', 'luz_verde'].forEach(function (n) {
                if (!self.textures.exists('bv_' + n)) self.load.svg('bv_' + n, ARTE.dir + n + '.svg', { width: lv[2] * 6, height: lv[3] * 6 });
            });
            var b = ARTE.banderas;
            ['bandera_verde', 'bandera_cuadros'].forEach(function (n) {
                if (!self.textures.exists('bv_' + n)) self.load.svg('bv_' + n, ARTE.dir + n + '.svg', { width: b.vb[2] * 1.5, height: b.vb[3] * 1.5 });
            });
        },

        /** El dibujo entero y apoyado abajo; lo que sobra se rellena estirando su borde. */
        mapaFondo: function () {
            var nec = ['bv_fondo', 'bv_puerta', 'bv_rueda', 'bv_interior_abierta', 'bv_puerta_abierta', 'bv_luz_roja', 'bv_luz_verde', 'bv_bandera_verde', 'bv_bandera_cuadros'];
            for (var i = 0; i < nec.length; i++) if (!this.textures.exists(nec[i])) return null;
            var W = this.scale.width, H = this.scale.height;
            var k = Math.min(W / ARTE.fw, H / ARTE.fh);
            var ox = (W - ARTE.fw * k) / 2, oy = H - ARTE.fh * k;
            return { k: k, ox: ox, oy: oy, sx: function (x) { return ox + x * k; }, sy: function (y) { return oy + y * k; } };
        },

        iniciar: function () {
            this.cosas = [];
            this.dentro = [];
            this.puestos = [];
            this.reunidos = [];
            this.giro = 0;
            this.enviando = false;
            this.apuntado = null;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            var F = this.mapaFondo();
            if (F) {
                var kk = F.k, A = ARTE;
                L.arte = true; L.F = F;
                L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
                L.der = L.pres ? W - 150 : W - 16;
                L.mesa = F.sy(A.mesa);
                L.puerta = { x: F.sx(A.puerta.x), y: F.sy(A.puerta.y), r: A.puerta.r * kk };
                L.buzon = { x: F.sx(A.buzon.x), y: F.sy(A.buzon.y), w: A.buzon.w * kk, h: A.buzon.h * kk };
                L.placaIni = { x: F.sx(A.panel.ini[0]), y: F.sy(A.panel.ini[1]), s: A.panel.s * kk };
                L.placaFin = { x: F.sx(A.panel.fin[0]), y: F.sy(A.panel.fin[1]), s: A.panel.s * kk };
                L.tam = Math.max(54, Math.min(100, (L.der - 30) / 4.6, H * 0.12));
                L.bocina = { x: F.sx(A.hud.x), y: F.sy(A.hud.y), r: Math.max(24, Math.min(36, 30 * kk)) };
                return L;
            }
            var hueco = Math.max(60, H * 0.16);
            L.bocina = { x: W / 2, y: Math.max(60, Math.min(100, 56 + hueco * 0.2)), r: Math.max(28, Math.min(40, hueco * 0.3)) };
            L.pres = W >= 760 ? { x: W - 72, piso: H - 104, alto: Math.min(160, H * 0.28), modelo: 'nino' } : null;
            L.der = L.pres ? W - 150 : W - 16;
            L.mesa = Math.round(H * 0.68);
            var r = Math.min(L.der * 0.26, H * 0.15);
            L.puerta = { x: L.der / 2 + 8, y: L.bocina.y + L.bocina.r + r * 1.25 + 34, r: r };   // las luces de arriba no tocan la bocina
            L.buzon = { x: L.puerta.x, y: L.puerta.y + r + 30, w: r * 1.3, h: 22 };
            L.placaIni = { x: L.puerta.x - r * 1.55, y: L.puerta.y + r * 0.35, s: Math.min(r * 0.85, (L.der / 2 - r) * 0.9) };
            L.placaFin = { x: L.puerta.x + r * 1.55, y: L.puerta.y + r * 0.35, s: L.placaIni.s };
            L.tam = Math.max(54, Math.min(100, (L.der - 30) / 4.6, H * 0.12));
            L.bocina = { x: 48, y: L.mesa * 0.28, r: 24 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (L.arte) {
                var F = L.F;
                if (F.oy > 0) keep(this.add.rectangle(0, 0, L.W, F.oy + 2, 0x112549).setOrigin(0, 0).setDepth(0));
                keep(this.add.image(F.ox, F.oy, 'bv_fondo', '__BASE').setOrigin(0, 0).setDisplaySize(ARTE.fw * F.k, ARTE.fh * F.k).setDepth(0));
                if (F.ox > 1) {
                    var tx = this.textures.get('bv_fondo'), iw = tx.getSourceImage().width, ih = tx.getSourceImage().height;
                    if (!tx.has('bi')) { tx.add('bi', 0, 10, 0, 2, ih); tx.add('bd', 0, iw - 12, 0, 2, ih); }
                    keep(this.add.image(0, F.oy, 'bv_fondo', 'bi').setOrigin(0, 0).setDisplaySize(F.ox + 1 + 5 * F.k, ARTE.fh * F.k).setDepth(0));
                    keep(this.add.image(L.W - F.ox - 1, F.oy, 'bv_fondo', 'bd').setOrigin(0, 0).setDisplaySize(F.ox + 1, ARTE.fh * F.k).setDepth(0));
                }
                this.sembrarMotes(keep, 16, { x: L.puerta.x - L.puerta.r, y: L.puerta.y - L.puerta.r, w: L.puerta.r * 2, h: L.puerta.r * 2, depth: 5 }, 0xfff3bf);
                this.montarPuertaArte(keep);
                this.montarHud(keep);
                if (reubicar) this.ubicarCosas();
                return;
            }
            K.textura(this, 'boveda_sala', L.W, L.H, function (x, w, h) {
                var g = x.createLinearGradient(0, 0, 0, L.mesa);
                g.addColorStop(0, '#343a40'); g.addColorStop(1, '#212529');
                x.fillStyle = g; x.fillRect(0, 0, w, L.mesa);
                // Paredes de acero remachadas.
                x.strokeStyle = 'rgba(255,255,255,0.06)'; x.lineWidth = 2;
                for (var yy = 40; yy < L.mesa; yy += 60) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); }
                x.fillStyle = 'rgba(255,255,255,0.12)';
                for (var ry = 40; ry < L.mesa; ry += 60) for (var rx = 20; rx < w; rx += 60) { x.beginPath(); x.arc(rx, ry, 2.5, 0, Math.PI * 2); x.fill(); }
                K.madera(x, 0, L.mesa, w, h - L.mesa, { r: 0, claro: '#9c6b30', medio: '#7a4f22', oscuro: '#5c3613' });
            });
            keep(this.add.image(0, 0, 'boveda_sala').setOrigin(0, 0).setDepth(0));
            var foco = keep(this.add.graphics().setDepth(2));
            foco.fillStyle(0xfff3bf, 0.13);
            foco.fillTriangle(L.puerta.x, 16, L.puerta.x - L.puerta.r * 1.5, L.mesa, L.puerta.x + L.puerta.r * 1.5, L.mesa);
            foco.fillStyle(0xffe066, 0.9);
            foco.fillCircle(L.puerta.x, 18, 12);
            var cebra = keep(this.add.graphics().setDepth(1));
            for (var i = 0; i < 8; i++) {
                cebra.fillStyle(i % 2 ? 0xf8f9fa : 0x212529, 1);
                cebra.fillRect(L.puerta.x - 90 + i * 22, L.mesa - 16, 22, 16);
            }
            keep(K.nino(this, 64, L.mesa + 2, 4, { ropa: 0xced4da, pelo: 0x343a40, esc: 1.6 }));
            this.sembrarMotes(keep, 18, { x: L.puerta.x - L.puerta.r, y: L.puerta.y - L.puerta.r, w: L.puerta.r * 2, h: L.puerta.r * 2, depth: 5 }, 0xfff3bf);
            this.montarPuerta(keep);
            this.montarHud(keep);
            if (reubicar) this.ubicarCosas();
        },

        /** Capa recortada del diseño: imagen con su caja (vb) en unidades del dibujo; (px,py) = punto de la lámina que queda en (0,0) del padre. */
        imgArte: function (clave, vb, centro) {
            var k = this.L.F.k;
            var im = this.add.image((vb[0] - centro[0]) * k, (vb[1] - centro[1]) * k, clave).setOrigin(0, 0).setDisplaySize(vb[2] * k, vb[3] * k);
            return im;
        },

        montarPuertaArte: function (keep) {
            var self = this, L = this.L, F = L.F, k = F.k, A = ARTE, Pt = L.puerta;
            var C = [A.puerta.x, A.puerta.y];
            var off = A.off;
            // Interior de la bóveda (Mesa 13): nace oculto y se ve al abrir.
            var vi = A.capas.interior_abierta.vb;
            this.interiorImg = keep(this.add.image(F.sx(vi[0] + off[0]), F.sy(vi[1] + off[1]), 'bv_interior_abierta').setOrigin(0, 0)
                .setDisplaySize(vi[2] * k, vi[3] * k).setDepth(6.4).setAlpha(0));
            // Brillo dorado de adentro (como antes, pero con el interior pintado por debajo).
            this.interior = keep(this.add.circle(Pt.x, Pt.y + 5 * k, 118 * k, 0xffe066, 0).setDepth(6.5).setVisible(false));
            // Puerta abierta (Mesa 13): aparece solo en el final.
            var vp = A.capas.puerta_abierta.vb;
            this.puertaAb = keep(this.add.image(F.sx(vp[0] + vp[2] + off[0]), F.sy(vp[1] + vp[3] / 2 + off[1]), 'bv_puerta_abierta').setOrigin(1, 0.5)
                .setDisplaySize(vp[2] * k, vp[3] * k).setDepth(7.5).setAlpha(0));
            this.puertaAb.sx0 = this.puertaAb.scaleX;
            this.puertaAb.scaleX = this.puertaAb.sx0 * 0.05;
            // Puerta cerrada: cara + rueda, un contenedor que se achata al abrir.
            var puerta = keep(this.add.container(Pt.x, Pt.y).setDepth(7));
            puerta.add(this.imgArte('bv_puerta', A.capas.puerta.vb, C));
            var vr = A.capas.rueda.vb;
            var rueda = this.add.image((vr[0] + vr[2] / 2 - C[0]) * k, (vr[1] + vr[3] / 2 - C[1]) * k, 'bv_rueda').setDisplaySize(vr[2] * k, vr[3] * k);
            puerta.add(rueda);
            this.puerta = puerta; this.rueda = rueda;
            // Tres luces de cerradura (rojas; pasan a verde al acertar).
            var lv = A.luzVb;
            this.luces = A.luces.map(function (p) {
                var im = self.add.image(F.sx(p[0]), F.sy(p[1]), 'bv_luz_roja').setDisplaySize(lv[2] * k, lv[3] * k).setDepth(8);
                im.base = im.scaleX;
                return keep(im);
            });
            // Banderas (verde = primero, cuadros = último) sobre cada panel.
            var B = A.banderas;
            this.banderas = [B.ini, B.fin].map(function (b, i) {
                var im = self.add.image(F.sx(b.x), F.sy(b.y), 'bv_' + b.clave).setOrigin(B.piv[0] / B.vb[2], (B.piv[1] - B.vb[1]) / B.vb[3]).setDepth(6);
                var e = B.esc * k * (500 / im.width) * 1.5 / 1.5;
                im.setDisplaySize(B.vb[2] * B.esc * k, B.vb[3] * B.esc * k);
                im.sx0 = im.scaleX; im.sy0 = im.scaleY;
                if (b.flip) im.scaleX = -im.sx0;
                im.flip = b.flip ? -1 : 1;
                return keep(im);
            });
            var P = A.panel;
            this.placas = [L.placaIni, L.placaFin].map(function (Q) {
                var marca = keep(self.add.rectangle(Q.x, Q.y, (P.w + 8) * k, (P.h + 8) * k, 0xffe066, 0).setStrokeStyle(4, 0xffe066, 0).setDepth(5));
                return { x: Q.x, y: Q.y, s: Q.s, marca: marca };
            });
            this.buzonG = keep(this.add.graphics().setDepth(6));
        },

        montarPuerta: function (keep) {
            var L = this.L, Pt = L.puerta, r = Pt.r;
            var marco = keep(this.add.graphics().setDepth(6));
            marco.fillStyle(0x495057, 1); marco.fillCircle(Pt.x, Pt.y, r * 1.18);
            marco.fillStyle(0x0b1a3a, 1); marco.fillCircle(Pt.x, Pt.y, r * 1.02);   // interior (se ve al abrir)
            this.interior = keep(this.add.circle(Pt.x, Pt.y, r, 0xffe066, 0).setDepth(6.5));
            var puerta = keep(this.add.container(Pt.x, Pt.y).setDepth(7));
            var pg = this.add.graphics();
            pg.fillStyle(0xadb5bd, 1); pg.fillCircle(0, 0, r);
            pg.lineStyle(6, 0x868e96, 1); pg.strokeCircle(0, 0, r * 0.82);
            for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; pg.fillStyle(0x868e96, 1); pg.fillCircle(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, 4); }
            puerta.add(pg);
            var rueda = this.add.container(0, 0);
            var rg = this.add.graphics();
            rg.lineStyle(8, 0x495057, 1); rg.strokeCircle(0, 0, r * 0.42);
            for (var e = 0; e < 4; e++) { var b = e * Math.PI / 2; rg.lineBetween(0, 0, Math.cos(b) * r * 0.55, Math.sin(b) * r * 0.55); }
            rg.fillStyle(0xfab005, 1); rg.fillCircle(0, 0, r * 0.12);
            rueda.add(rg);
            puerta.add(rueda);
            this.puerta = puerta; this.rueda = rueda;
            // Tres luces de cerradura.
            this.luces = [0, 1, 2].map(function (i) {
                var a = -Math.PI / 2 + (i - 1) * 0.55;
                return keep(this.add.circle(Pt.x + Math.cos(a) * r * 1.12, Pt.y + Math.sin(a) * r * 1.12 - 6, 9, 0xe03131).setStrokeStyle(2, 0xffffff).setDepth(8));
            }, this);
            // Buzón y las dos placas (bandera verde = primero, a cuadros = último).
            var B = L.buzon;
            var bg = keep(this.add.graphics().setDepth(6));
            bg.fillStyle(0x212529, 1); bg.fillRoundedRect(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 6);
            bg.lineStyle(3, 0xfab005, 1); bg.strokeRoundedRect(B.x - B.w / 2, B.y - B.h / 2, B.w, B.h, 6);
            this.placas = [L.placaIni, L.placaFin].map(function (Q, i) {
                var g = keep(this.add.graphics().setDepth(6));
                g.fillStyle(0x495057, 1); g.fillRoundedRect(Q.x - Q.s / 2, Q.y - Q.s / 2, Q.s, Q.s, 10);
                g.lineStyle(3, 0xfab005, 1); g.strokeRoundedRect(Q.x - Q.s / 2, Q.y - Q.s / 2, Q.s, Q.s, 10);
                // Banderita arriba de la placa.
                var fx = Q.x - Q.s * 0.3, fy = Q.y - Q.s / 2 - 6;
                g.lineStyle(3, 0xdee2e6, 1); g.lineBetween(fx, fy, fx, fy - Q.s * 0.45);
                if (i === 0) { g.fillStyle(0x40c057, 1); g.fillTriangle(fx, fy - Q.s * 0.45, fx + Q.s * 0.4, fy - Q.s * 0.35, fx, fy - Q.s * 0.25); }
                else {
                    var c = Q.s * 0.1;
                    for (var yy = 0; yy < 2; yy++) for (var xx = 0; xx < 4; xx++) { g.fillStyle((xx + yy) % 2 ? 0x212529 : 0xffffff, 1); g.fillRect(fx + xx * c, fy - Q.s * 0.45 + yy * c, c, c); }
                }
                var marcaActiva = keep(this.add.rectangle(Q.x, Q.y, Q.s + 8, Q.s + 8, 0xffe066, 0).setStrokeStyle(4, 0xffe066, 0).setDepth(5));
                return { x: Q.x, y: Q.y, s: Q.s, marca: marcaActiva };
            }, this);
        },

        luz: function (i, si) {
            var l = this.luces[i];
            if (this.L.arte) {
                l.setTexture(si ? 'bv_luz_verde' : 'bv_luz_roja');
                if (si) this.tweens.add({ targets: l, scaleX: l.base * 1.6, scaleY: l.base * 1.6, duration: 160, yoyo: true });
                else l.setScale(l.base);
                return;
            }
            l.setFillStyle(si ? 0x40c057 : 0xe03131);
            if (si) this.tweens.add({ targets: l, scale: 1.6, duration: 160, yoyo: true });
        },

        /** Abre como en el diseño: la cara se achata hacia la bisagra, se ve el interior y asoma la puerta abierta. */
        /**
         * Giro de la puerta alrededor de su bisagra (borde izquierdo del aro): la cara redonda se achata hacia la bisagra
         * mientras la puerta abierta (Mesa de trabajo 13) crece desde ella hacia la izquierda; al final queda el aro con el
         * interior oscuro y la puerta de lado. p: 0 = cerrada, 1 = abierta.
         */
        giroPuerta: function (p) {
            var L = this.L, Pt = L.puerta, hx = Pt.x - Pt.r;   // x de la bisagra
            var cara = Math.max(0.02, 1 - p);
            this.puerta.scaleX = cara;
            this.puerta.x = hx + (Pt.x - hx) * cara;
            if (this.puertaAb) this.puertaAb.scaleX = this.puertaAb.sx0 * Math.max(0.05, p);
        },

        abrirBoveda: async function (ms) {
            var self = this;
            ms = ms || 1200;
            // 1) se destraba: un golpe seco y un temblor corto de la rueda
            K.ruido({ f: 140, q: 1, dur: 0.25, vol: 0.1 });
            this.cameras.main.shake(90, 0.003);
            this.tweens.add({ targets: this.rueda, angle: this.rueda.angle - 14, duration: 90, yoyo: true });
            await esperar(this, 220);
            // 2) gira sobre la bisagra
            this.puerta.setAlpha(1);
            if (this.puertaAb) this.puertaAb.setAlpha(1);
            this.mostrarInterior(1, ms * 0.55);
            K.tono({ f: 180, f2: 90, dur: ms / 1000, vol: 0.05, tipo: 'triangle' });
            var o = { p: 0 };
            await tw(this, { targets: o, p: 1, duration: ms, ease: 'Sine.easeInOut', onUpdate: function () { self.giroPuerta(o.p); } });
            this.giroPuerta(1);
            this.puerta.setAlpha(0);
            K.ruido({ f: 300, q: 1.2, dur: 0.12, vol: 0.08 });
        },

        cerrarBoveda: async function (ms) {
            var self = this;
            ms = ms || 900;
            this.puerta.setAlpha(1);
            K.tono({ f: 90, f2: 180, dur: ms / 1000, vol: 0.05, tipo: 'triangle' });
            var o = { p: 1 };
            await tw(this, { targets: o, p: 0, duration: ms, ease: 'Sine.easeInOut', onUpdate: function () { self.giroPuerta(o.p); } });
            this.giroPuerta(0);
            if (this.puertaAb) this.puertaAb.setAlpha(0);
            this.mostrarInterior(0, 200);
            K.ruido({ f: 220, q: 1, dur: 0.15, vol: 0.1 });
            this.tweens.add({ targets: this.rueda, angle: this.rueda.angle + 20, duration: 160, yoyo: true });
        },

        /** Interior pintado de la bóveda (se ve al abrirse la puerta). */
        mostrarInterior: function (alfa, ms) {
            if (this.interiorImg) this.tweens.add({ targets: this.interiorImg, alpha: alfa, duration: ms || 400 });
        },

        /** La rueda gira un clic con cada sonido. */
        alSonar: function () {
            this.giro += 45;
            this.tweens.add({ targets: this.rueda, angle: this.giro, duration: 380, ease: 'Back.easeOut' });
            K.ruido({ f: 2600, q: 3, dur: 0.05, vol: 0.08 });
            this.tweens.add({ targets: this.interior, fillAlpha: 0.25, duration: 150, yoyo: true });
        },

        lugares: function (n) {
            var L = this.L;
            var porFila = n > 4 ? Math.ceil(n / 2) : n;
            var filas = Math.ceil(n / porFila);
            var out = [];
            for (var i = 0; i < n; i++) {
                var f = Math.floor(i / porFila), k = i % porFila;
                var enFila = f === filas - 1 ? n - f * porFila : porFila;
                out.push({ x: 16 + (L.der - 32) * (k + 0.5) / enFila, y: L.mesa + (L.H - L.mesa) * (filas === 1 ? 0.45 : 0.27 + f * 0.43) });
            }
            return out;
        },

        ubicarCosas: function () {
            var lug = this.lugares(this.cosas.length);
            this.cosas.forEach(function (a, i) { a.casa = lug[i]; if (!a.usada) a.cont.setPosition(lug[i].x, lug[i].y); });
        },

        tamDe: function (n) {
            var porFila = n > 4 ? Math.ceil(n / 2) : n;
            return Math.min(this.L.tam, (this.L.der - 32) / porFila * 0.82);
        },

        prepararNivel: async function () {
            var self = this;
            this.enviando = false;
            this.apuntado = null;
            await this.retirar(this.cosas.concat(this.dentro, this.puestos));
            this.cosas = []; this.dentro = []; this.puestos = [];
            [0, 1, 2].forEach(function (i) { self.luz(i, false); });
            this.placas.forEach(function (p) { p.marca.setStrokeStyle(4, 0xffe066, 0); });
            this.interior.setFillStyle(0xffe066, 0);
            if (this.interiorImg) this.interiorImg.setAlpha(0);
            if (this.puertaAb) this.puertaAb.setAlpha(0);
            this.giroPuerta(0);
            this.puerta.setAlpha(1);
            this.puerta.x = this.L.puerta.x;
            await tw(this, { targets: this.puerta, scaleX: 1, duration: 300 });
        },

        mostrarOpciones: async function (nv) {
            var self = this;
            var n = nv.opciones.length;
            var lug = this.lugares(n);
            var tam = this.tamDe(n);
            this.cosas = nv.opciones.map(function (id, i) {
                var a = self.crearCosa(id, lug[i].x, lug[i].y - 24, tam, { depth: 30 });
                a.casa = { x: lug[i].x, y: lug[i].y };
                a.fase = Math.random() * 6;
                a.vx = (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 35);
                a.usada = false;
                a.ocupada = false;
                a.cont.setAlpha(0).setScale(0.4);
                return a;
            });
            await Promise.all(this.cosas.map(function (a, i) {
                return esperar(self, i * 80).then(function () {
                    return tw(self, {
                        targets: a.cont, alpha: 1, scale: 1, y: a.casa.y,
                        duration: 300, ease: 'Back.easeOut'
                    });
                });
            }));
            this.marcarDestino();
        },

        /** Resalta el destino activo de este paso. */
        marcarDestino: function () {
            var self = this;
            this.placas.forEach(function (p, i) {
                var activa = self.paso === i + 1;
                p.marca.setStrokeStyle(4, 0xffe066, activa ? 1 : 0);
                if (activa) self.tweens.add({ targets: p.marca, scale: 1.08, duration: 400, yoyo: true, repeat: 2 });
            });
        },

        destino: function () {
            var L = this.L;
            if (this.paso === 0) return { x: L.buzon.x, y: L.buzon.y, r: L.puerta.r * 1.1 };
            var p = this.placas[this.paso - 1];
            return { x: p.x, y: p.y, r: p.s * 0.9 };
        },

        cosaEnPunto: function (x, y) {
            var hit = null, best = 1e9;
            this.cosas.forEach(function (a) {
                if (a.usada || a.ocupada || !a.cont.active) return;
                var d = Math.hypot(a.cont.x - x, a.cont.y - y);
                if (d < a.tam * 0.7 && d < best) { best = d; hit = a; }
            });
            return hit;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' || this.enviando) return;
            var a = this.cosaEnPunto(p.x, p.y);
            if (!a) return;
            this.pista.reiniciar();
            this.enviar(a);
        },
        alMover: function (p) {
            if (this.fase !== 'jugar' || this.enviando) { this.apuntado = null; return; }
            this.apuntado = this.cosaEnPunto(p.x, p.y);
        },
        alSoltar: function () {},

        /** Tocar → vuela al destino activo (buzón o placa). */
        enviar: async function (a) {
            if (!a || a.usada || a.ocupada || this.enviando) return;
            this.enviando = true;
            a.ocupada = true;
            this.tocado = a;
            var d = this.destino();
            a.cont.setDepth(40);
            K.tono({ f: 560, f2: 720, dur: 0.05, vol: 0.04 });
            await tw(this, {
                targets: a.cont, x: d.x, y: d.y, scale: 0.55,
                duration: 320, ease: 'Quad.easeIn'
            });
            if (this.paso === 0) {
                var r = await this.marcar(a.id, d);
                if (r === 'mal' || r === 'repetido') {
                    await this.rechazar(a, r === 'mal');
                    a.ocupada = false;
                    this.enviando = false;
                    return;
                }
                await this.meter(a);
                this.enviando = false;
                return;
            }
            var ok = await this.elegir(a.id, d);
            if (ok === false) {
                await this.rechazar(a, true);
                a.ocupada = false;
            }
            this.enviando = false;
        },

        rechazar: async function (a, conSacudir) {
            var casa = a.casa || { x: 80, y: this.L.mesa + 40 };
            this.cameras.main.shake(90, 0.004);
            K.ruido({ f: 160, q: 1, dur: 0.15, vol: 0.08 });
            await tw(this, {
                targets: a.cont, x: casa.x, y: casa.y, scale: 1, alpha: 1,
                duration: 400, ease: 'Back.easeOut'
            });
            a.cont.setDepth(30);
            if (conSacudir) await a.sacudir();
        },

        /** Entra por el buzón de la bóveda. */
        meter: async function (a) {
            var B = this.L.buzon;
            if (a.usada) return;
            a.usada = true;
            this.dentro.push(a);
            await tw(this, { targets: a.cont, x: B.x, y: B.y, scale: 0.15, alpha: 0.2, duration: 300, ease: 'Quad.easeIn' });
            a.cont.setVisible(false);
            K.ruido({ f: 700, q: 2, dur: 0.08, vol: 0.08 });
        },

        alAcertar: async function () {
            var a = this.tocado;
            var self = this;
            if (this.paso === 0) {
                if (a) await this.meter(a);
                this.luz(0, true);
                return;
            }
            var p = this.placas[this.paso - 1];
            a.usada = true;
            this.puestos.push(a);
            await tw(this, { targets: a.cont, x: p.x, y: p.y, scale: p.s * 0.82 / a.tam, duration: 260 });
            a.sombra.setVisible(false);
            this.luz(this.paso, true);
            await Promise.all([this.sonar(a.id, { breve: true, bocina: false }), a.saltito(0.15, 1)]);
            if (this.paso === 2) {
                // Tres luces verdes: la rueda gira y la bóveda se entreabre; suena la secuencia entera.
                this.giro += 360;
                await tw(this, { targets: this.rueda, angle: this.giro, duration: 700, ease: 'Sine.easeInOut' });
                if (this.L.arte) await this.abrirBoveda(800);
                else {
                    this.tweens.add({ targets: this.interior, fillAlpha: 0.7, duration: 400 });
                    await tw(this, { targets: this.puerta, scaleX: 0.25, duration: 500, ease: 'Back.easeOut' });
                }
                var seq = this.nv.reproducciones[0];
                for (var k = 0; k < seq.length; k++) {
                    this.reunidos.push(seq[k]);
                    Ut.estallido(this, this.L.puerta.x, this.L.puerta.y, { n: 4, tex: 'estrella', tam: 18, dist: 60, sinTinte: true, depth: 9 });
                    await this.sonar(seq[k], { breve: true, bocina: false });
                }
                if (this.L.arte) await this.cerrarBoveda(600);
                else await tw(this, { targets: this.puerta, scaleX: 1, duration: 400 });
            }
        },

        /** Paso siguiente: vuelven a la mesa los que estaban en la bóveda (para elegir primero / último). */
        alPaso: async function (paso) {
            var self = this;
            this.enviando = false;
            this.apuntado = null;
            if (paso === 1) {
                await this.retirar(this.cosas.filter(function (a) { return !a.usada; }));
                this.dentro.forEach(function (a) { a.destruir(); });
                this.dentro = [];
                var ids = Ut.mezclar(this.nv.correctas.slice());
                var lug = this.lugares(ids.length);
                var tam = this.tamDe(ids.length);
                this.cosas = ids.map(function (id, i) {
                    var a = self.crearCosa(id, lug[i].x, lug[i].y, tam, { depth: 30 });
                    a.casa = { x: lug[i].x, y: lug[i].y };
                    a.fase = Math.random() * 6;
                    a.vx = (Math.random() < 0.5 ? -1 : 1) * (25 + Math.random() * 35);
                    a.usada = false;
                    a.ocupada = false;
                    return a;
                });
            }
            this.marcarDestino();
        },

        alFallar: async function () {},

        alTerminarNivel: async function () {
            this.apuntado = null;
            await this.retirar(this.cosas.filter(function (a) { return !a.usada; }).concat(this.puestos));
            this.cosas = []; this.puestos = [];
            this.placas.forEach(function (p) { p.marca.setStrokeStyle(4, 0xffe066, 0); });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando || this.enviando) return Promise.resolve();
            var ok = this.cosas.filter(function (c) {
                return !c.usada && self.respuestas().indexOf(c.id) >= 0;
            })[0];
            if (!ok) return Promise.resolve();
            return this.ctx.mano({
                punto: { x: ok.cont.x, y: ok.cont.y },
                holdMs: 450,
                cancelado: function () { return cancelada() || self.fase !== 'jugar'; }
            });
        },

        /* ── Escena final: la bóveda se abre del todo ── */

        escenaFinal: async function () {
            var self = this;
            var L = this.L, Pt = L.puerta;
            var vistos = {};
            var ids = this.reunidos.filter(function (id) { if (vistos[id]) return false; vistos[id] = 1; return true; });
            [0, 1, 2].forEach(function (i) { self.luz(i, true); });
            this.giro += 720;
            await tw(this, { targets: this.rueda, angle: this.giro, duration: 1000, ease: 'Sine.easeInOut' });
            if (L.arte) await this.abrirBoveda(1000);
            else {
                this.tweens.add({ targets: this.interior, fillAlpha: 0.9, duration: 500 });
                await tw(this, { targets: this.puerta, scaleX: 0.05, x: Pt.x - Pt.r * 0.95, duration: 700, ease: 'Sine.easeInOut' });
            }
            // De la bóveda sale el tesoro: todos los sonidos que guardó, en abanico.
            var n = ids.length;
            for (var i = 0; i < n; i++) {
                var a = this.crearCosa(ids[i], Pt.x, Pt.y, Math.min(L.tam * 0.8, Pt.r * 0.9), { sinSombra: true, depth: 60 });
                a.cont.setScale(0.2);
                var ang = Math.PI + (i + 0.5) / n * Math.PI;
                var x = Pt.x + Math.cos(ang) * Pt.r * 2.1, y = Pt.y + Pt.r * 0.6 + Math.sin(ang) * -Pt.r * 0.2 + Pt.r * 1.2;
                this.saltarA(a.cont, x, Math.min(y, L.mesa + 30), { ms: 520, alto: Pt.r, esc: 1 });
                this.sonar(ids[i], { breve: true, bocina: false });
                await esperar(this, 380);
                if (!this.sigue()) return;
            }
            Ut.estallido(this, Pt.x, Pt.y, { n: 22, tex: 'estrella', tam: 28, dist: 200, sinTinte: true, depth: 61 });
            await esperar(this, 900);
        },

        /** Demo: la mano toca lo que sonó y vuela al destino. */
        demoPaso: function () {
            var self = this;
            var ok = this.correctaDe(this.cosas);
            if (!ok) return null;
            return {
                desde: { x: ok.cont.x, y: ok.cont.y - 16 },
                mantener: 350,
                hacer: function () { return self.enviar(ok); }
            };
        },

        paso: function (time, delta) {
            var dt = (delta || 16) / 1000;
            var L = this.L;
            if (L.arte) this.animarArte(time);
            if (this.interior && !this.tweens.isTweening(this.interior) && this.interior.fillAlpha < 0.2) {
                this.interior.setFillStyle(0xffe066, 0.04 + Math.sin(time / 500) * 0.03);
            }
            if (this.fase !== 'jugar' || this.enviando) return;
            var yMin = L.mesa + 18;
            var yMax = L.H - 40;
            this.cosas.forEach(function (a) {
                if (a.usada || a.ocupada || !a.cont.active) return;
                if (this.tweens.isTweening(a.cont)) return;
                a.fase = (a.fase || 0) + dt * 2.2;
                a.cont.x += a.vx * dt;
                a.cont.y += Math.sin(a.fase) * 22 * dt;
                if (a.cont.x < 40) { a.cont.x = 40; a.vx = Math.abs(a.vx); }
                if (a.cont.x > L.der - 40) { a.cont.x = L.der - 40; a.vx = -Math.abs(a.vx); }
                if (a.cont.y < yMin) a.cont.y = yMin;
                if (a.cont.y > yMax) a.cont.y = yMax;
                a.casa = { x: a.cont.x, y: a.cont.y };
                if (this.apuntado === a) a.cont.setScale(1.08);
                else if (Math.abs(a.cont.scale - 1) > 0.02) a.cont.setScale(1);
            }, this);
        },

        /** Banderas que ondean, luces rojas que respiran y el buzón que brilla cuando toca meter. */
        animarArte: function (time) {
            var L = this.L, k = L.F.k;
            (this.banderas || []).forEach(function (b, i) {
                if (!b.active) return;
                var ph = i * 1.9;
                b.setRotation(Math.sin(time / 520 + ph) * 0.035);
                b.scaleX = b.flip * b.sx0 * (1 + Math.sin(time / 190 + ph) * 0.05);
                b.scaleY = b.sy0 * (1 + Math.sin(time / 330 + ph) * 0.015);
            });
            (this.luces || []).forEach(function (l, i) {
                if (!l.active || l.texture.key !== 'bv_luz_roja' || this.tweens.isTweening(l)) return;
                var q = l.base * (1 + Math.sin(time / 430 + i * 1.3) * 0.05);
                l.setScale(q);
            }, this);
            var g = this.buzonG;
            if (g) {
                g.clear();
                if (this.paso === 0 && this.fase === 'jugar' && !this.enviando) {
                    var c = ARTE.buzon.caja, F = L.F;
                    g.lineStyle(Math.max(3, 4 * k), 0xffe066, 0.3 + 0.35 * Math.sin(time / 260));
                    g.strokeRoundedRect(F.sx(c[0]), F.sy(c[1]), c[2] * k, c[3] * k, 6 * k);
                }
            }
        },

        estadoExtra: function () {
            var d = this.destino();
            return {
                destino: { x: Math.round(d.x), y: Math.round(d.y) },
                cosas: this.cosas.filter(function (a) { return !a.usada && a.cont.active && a.cont.visible; }).map(function (a) { return { id: a.id, x: Math.round(a.cont.x), y: Math.round(a.cont.y) }; })
            };
        }
    };

    K.crear({ id: 'boveda', fondo: '#212529', escena: escena });
})(typeof window !== 'undefined' ? window : this);
