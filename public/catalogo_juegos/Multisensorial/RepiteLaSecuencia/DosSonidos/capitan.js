/**
 * «¡El capitán soy yo!» — motor propio de Dos Sonidos (3-4 años).
 *
 * El niño MANEJA el barco pirata con el dedo por un mar abierto que avanza: hay boyas que suenan,
 * monedas, rocas y remolinos. Chocar una boya la hace sonar (se explora libremente). El loro canta una
 * canción que se repite (pato-tren-pato-…) y aparece en la tabla de arriba: hay que ir recogiendo las
 * boyas en el orden que sigue la canción. Cada boya correcta queda atada detrás del barco y suena al
 * avanzar; una que no sigue la canción rebota y suena. Con la canción completa aparece la isla: llevar
 * el barco al muelle termina el nivel. Nada castiga: las rocas solo hacen rebotar el barco.
 *
 * Niveles = momentos del viaje (mañana, mediodía, atardecer, noche) con más cosas en el mar.
 * Final: el barco atraca en la isla del tesoro, se abre el cofre y hay fuegos artificiales.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;

    var ANIM = ['perro', 'gato', 'vaca', 'gallo', 'pato', 'pollito', 'burro', 'caballo', 'leon', 'elefante'];
    var INST = ['tambor', 'campana', 'maracas', 'trompeta', 'carro', 'tren', 'reloj'];

    var NIV = [
        { ciclo: [0, 1], dados: 3, meta: 3, vel: 42, rocas: 0, remolinos: false, distr: false },
        { ciclo: [0, 1, 1], dados: 3, meta: 3, vel: 50, rocas: 1, remolinos: false, distr: false },
        { ciclo: [0, 0, 1], dados: 3, meta: 4, vel: 56, rocas: 2, remolinos: true, distr: true },
        { ciclo: [0, 1, 2], dados: 3, meta: 4, vel: 62, rocas: 2, remolinos: true, distr: true }
    ];
    var HORAS = [
        { cielo: [0x7cc8f8, 0xdff4ff], mar: [0x48b0e8, 0x1f7bc4, 0x0f4f8f], astro: 0xffe066, nubes: 0xffffff, isla: 0xf3d9a4 },
        { cielo: [0x3d9bf0, 0xb5e2ff], mar: [0x2f9ae8, 0x1668b3, 0x0a4280], astro: 0xfff3bf, nubes: 0xffffff, isla: 0xf6dfae },
        { cielo: [0x6b3fa0, 0xffb066], mar: [0xc77a9a, 0x6b3f8f, 0x2e2063], astro: 0xff7b54, nubes: 0xffc9a8, isla: 0xe8b98a, bajo: true },
        { cielo: [0x080d2e, 0x283476], mar: [0x22357a, 0x16255a, 0x0a1236], astro: 0xf1f3f5, nubes: 0x4a5590, isla: 0x8c7a63, noche: true }
    ];
    var COLB = [0xe03131, 0x1c7ed6, 0x2f9e44, 0xae3ec9, 0xf76707];

    function mezcla(a, b, t) {
        var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100);
        return C.GetColor(c.r, c.g, c.b);
    }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function mezclaPal(a, b, t) {
        return {
            cielo: [mezcla(a.cielo[0], b.cielo[0], t), mezcla(a.cielo[1], b.cielo[1], t)],
            mar: [mezcla(a.mar[0], b.mar[0], t), mezcla(a.mar[1], b.mar[1], t), mezcla(a.mar[2], b.mar[2], t)],
            astro: mezcla(a.astro, b.astro, t), nubes: mezcla(a.nubes, b.nubes, t),
            noche: (a.noche ? 1 : 0) * (1 - t) + (b.noche ? 1 : 0) * t,
            bajo: (a.bajo ? 1 : 0) * (1 - t) + (b.bajo ? 1 : 0) * t
        };
    }
    var CASCO = [{ x: -80, y: -30 }, { x: 62, y: -30 }, { x: 84, y: -42 }, { x: 64, y: 4 }, { x: -62, y: 4 }, { x: -82, y: -34 }];
    // Barco del diseño: punto de anclaje en el dibujo (centro del casco sobre la línea de agua) y px por unidad del dibujo.
    var KB = 0.68, BOX = 255.7, BOY = 418;
    var ARTE_FONDO = { w: 1280, h: 720, horiz: 258.5 };
    var LINEA_AGUA = 4;   // altura (en el dibujo del barco) a la que el agua corta el casco

    // Piezas sueltas: archivo, tamaño de rasterizado y recuadro útil (x, y, ancho, alto) en px de la textura.
    var EXTRAS = {
        dd_delfin: { f: 'delfin', w: 500, h: 500, rec: [35, 141, 430, 217] },
        dd_sp1: { f: 'sombra_pez1', w: 782, h: 500, rec: [70, 118, 642, 263] },
        dd_sp2: { f: 'sombra_pez2', w: 500, h: 500, rec: [87, 187, 325, 125] },
        dd_sp3: { f: 'sombra_pez3', w: 500, h: 500, rec: [120, 166, 260, 167] },
        dd_ave: { f: 'ave_cuerpo', w: 520, h: 400 },
        dd_ala: { f: 'ave_ala', w: 520, h: 400 }
    };
    // Ave del diseño (lienzo de 260x315 unidades): mide 250 de ancho y el ala gira desde el hombro (118, 192).
    var AVE = { w: 260, h: 200, ancho: 224, hx: 118, hy: 98 };

    var escena = {
        precargar: function () {
            if (!this.textures.exists('dd_fondo')) this.load.svg('dd_fondo', 'img/diseno/fondo.svg', { width: 1280, height: 720 });
            if (!this.textures.exists('dd_arte')) this.load.svg('dd_arte', 'img/diseno/arte.svg', { width: 2700, height: 1466 });
            // Piezas sueltas del diseñador: delfín, sombras de peces y ave (cuerpo + ala que bate).
            var self = this;
            Object.keys(EXTRAS).forEach(function (k) {
                if (!self.textures.exists(k)) self.load.svg(k, 'img/diseno/' + EXTRAS[k].f + '.svg', { width: EXTRAS[k].w, height: EXTRAS[k].h });
            });
        },

        /** Registra los marcos de la hoja de arte (una sola vez) y avisa si el diseño está disponible. */
        prepararArte: function () {
            var A = global.DosSonidosArte;
            var tex = this.textures.exists('dd_arte') ? this.textures.get('dd_arte') : null;
            this.arteOk = !!(A && tex && this.textures.exists('dd_fondo'));
            var self = this;
            this.extraOk = this.arteOk && Object.keys(EXTRAS).every(function (k) { return self.textures.exists(k); });
            if (this.extraOk) Object.keys(EXTRAS).forEach(function (k) {
                var t = self.textures.get(k), r = EXTRAS[k].rec;
                if (r && !t.has('rec')) t.add('rec', 0, r[0], r[1], r[2], r[3]);
            });
            if (!this.arteOk || tex.__ddMarcos) return;
            Object.keys(A.frames).forEach(function (n) { var m = A.frames[n]; tex.add(n, 0, m.x, m.y, m.w, m.h); });
            tex.__ddMarcos = true;
        },

        /** Imagen de un marco: se ancla en el punto (px, py) del dibujo y mide kd px por unidad del dibujo. */
        dd: function (nom, x, y, kd, px, py) {
            var m = global.DosSonidosArte.frames[nom], wu = m.w / m.k, hu = m.h / m.k;
            var im = this.add.image(x, y, 'dd_arte', nom);
            im.setOrigin(px == null ? 0.5 : (px - m.ox) / wu, py == null ? 0.5 : (py - m.oy) / hu);
            im.setDisplaySize(wu * kd, hu * kd);
            im.sx0 = im.scaleX; im.sy0 = im.scaleY;
            return im;
        },

        iniciar: function () {
            this.hora = 0;
            this.cosasMar = [];      // boyas, monedas, rocas, remolinos
            this.cadena = [];        // boyas atadas al barco
            this.rastro = [];
            this.serie = [];
            this.reunidos = [];
            this.monedas = 0;
            this.recogidas = 0;
            this.spawnOn = false;
            this.dedo = null;
            this.vx = 0; this.vy = 0;
            this.mundo = 0;
            this.isla = null;
            this.ultimo = { boya: 0, moneda: 0, roca: 0, remolino: 0 };
            this.ultimoReclamo = -99999;
            this.horaDe = 0; this.horaT = 1;
            this.estelas = []; this.anillos = [];
            this.vxPrev = 0; this.angBarco = 0;
            this.monedasMostradas = 0;
            this.ultOla = 0; this.ultCrujir = 0; this.ultGaviota = 0;
            this.dEstado = 0;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.horiz = Math.round(H * ARTE_FONDO.horiz / ARTE_FONDO.h);
            L.mar = { x0: 90, x1: L.der - 110, y0: L.horiz + 70, y1: H - 60 };
            L.tamB = Math.round(Math.max(70, Math.min(96, H * 0.12)));
            L.tamBarco = Math.round(Math.max(130, Math.min(190, H * 0.24)));
            L.cancion = { x: Math.round(W / 2), y: Math.round(H * 0.155) };
            L.bocina = { x: L.cancion.x - 250, y: L.cancion.y, r: 30 };
            return L;
        },

        armar: function (reubicar) {
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.prepararArte();
            this.cieloG = keep(this.add.graphics().setDepth(1));
            this.fondoG = keep(this.add.graphics().setDepth(1.1));
            if (this.arteOk) this.montarFondoArte(keep);
            this.marG = keep(this.add.graphics().setDepth(3));
            this.delfinG = keep(this.crearDelfin().setDepth(4));
            this.estelaG = keep(this.add.graphics().setDepth(5));
            this.cuerdaG = keep(this.add.graphics().setDepth(8));
            this.ayudaG = keep(this.add.graphics().setDepth(9));
            this.ondasG = keep(this.add.graphics().setDepth(9.4));
            this.reflejoG = keep(this.add.graphics().setDepth(9.6));
            this.pajarosG = keep(this.add.graphics().setDepth(24));
            this.sombrasPez = []; this.aves = [];
            if (this.extraOk) this.montarExtras(keep);
            this.marcaG = keep(this.add.graphics().setDepth(58));
            this.pintarCielo();
            this.montarHud(keep);
            this.armarCancion(keep);
            this.armarMonedas(keep);
            this.sembrarMotes(keep, 8, { x: 0, y: 40, w: L.W, h: L.horiz - 40, depth: 1.6 }, 0xffffff);
            if (!this.barco || !this.barco.cont.active) this.crearBarco();
            else this.pintarBarco();
            if (reubicar) this.limitarBarco();
        },

        /** Fondo del diseño: cielo y mar, nubes que pasan, olas que se mecen y los astros (sol, atardecer, luna). */
        montarFondoArte: function (keep) {
            var L = this.L, self = this;
            var sx = L.W / ARTE_FONDO.w, sy = L.H / ARTE_FONDO.h;
            this.dfondo = keep(this.add.image(0, 0, 'dd_fondo').setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(0.5));
            var mk = function (nom, depth) {
                var m = global.DosSonidosArte.frames[nom], wu = m.w / m.k, hu = m.h / m.k;
                var im = keep(self.add.image(m.ox * sx, m.oy * sy, 'dd_arte', nom).setOrigin(0, 0).setDisplaySize(wu * sx, hu * sy).setDepth(depth));
                im.bx = m.ox * sx; im.by = m.oy * sy;
                return im;
            };
            this.dnubes = [mk('f_nubes', 1.45), mk('f_nubes', 1.45)];
            this.dolas = [1, 2, 3, 4, 5].map(function (i) {
                var im = mk('f_ola' + i, 2.2);
                im.setDisplaySize(im.displayWidth * 1.04, im.displayHeight);
                im.bx -= im.displayWidth * 0.02; im.x = im.bx;
                return im;
            });
            var kd = 0.53;
            var astro = function (nom, depth) { return keep(self.dd(nom, 0, 0, kd, null, null).setDepth(depth)); };
            this.dastro = {
                solR: astro('sol_rayos', 1.2), solD: astro('sol_disco', 1.21),
                atR: astro('atard_rayos', 1.2), atD: astro('atard_disco', 1.21),
                luna: astro('luna', 1.21)
            };
        },

        /** Cada cuadro: los astros se mezclan según la hora, las nubes y las olas se mueven, y la hora tiñe el cielo y el mar. */
        animarFondoArte: function (time, s, P, te) {
            var L = this.L, D = this.dastro, ax = L.W * 0.82, ay = L.horiz * (0.38 + 0.4 * P.bajo);
            if (!D) return;
            var peso = function (h) { return h < 2 ? 0 : (h === 2 ? 1 : 2); };
            var w = [0, 0, 0];
            var de = peso(this.horaDe), a = peso(this.hora);
            w[de] += 1 - te; w[a] += te;
            var ponerPar = function (r, d, alfa, giro) {
                r.setPosition(ax, ay).setAlpha(alfa).setVisible(alfa > 0.01);
                if (giro != null) r.rotation = giro;
                d.setPosition(ax, ay).setAlpha(alfa).setVisible(alfa > 0.01);
            };
            ponerPar(D.solR, D.solD, w[0], s * 0.15);
            ponerPar(D.atR, D.atD, w[1], -s * 0.12);
            D.luna.setPosition(ax, ay).setAlpha(w[2]).setVisible(w[2] > 0.01);
            D.luna.setScale(D.luna.sx0 * (1 + Math.sin(s * 1.6) * 0.012));
            D.solD.setScale(D.solD.sx0 * (1 + Math.sin(s * 2.1) * 0.02));
            D.atD.setScale(D.atD.sx0 * (1 + Math.sin(s * 1.7) * 0.025));
            // Nubes: dos copias seguidas que dan la vuelta; la hora las tiñe.
            var per = L.W, off = (this.mundo * 0.25 + s * 8) % per;
            this.dnubes.forEach(function (n, i) { n.x = n.bx - off + i * per; n.setTint(P.nubes).setAlpha(1 - 0.35 * P.noche); });
            // Olas: se mecen despacio, cada una a su ritmo.
            var tinte = mezcla(0xffffff, 0x9fb2e6, P.noche);
            this.dolas.forEach(function (o, i) {
                o.x = o.bx + Math.sin(s * 0.55 + i * 1.7) * 16 + Math.sin(this.mundo * 0.01 + i) * 6;
                o.y = o.by + Math.sin(s * 0.9 + i * 1.3) * 3.5;
                o.setAlpha(0.7 + 0.3 * Math.sin(s * 1.4 + i * 2.1)).setTint(tinte);
            }, this);
        },

        pintarCielo: function () {
            var L = this.L, g = this.cieloG, h = HORAS[this.hora];
            g.clear();
            for (var b = 0; b < 18; b++) {
                g.fillStyle(mezcla(h.cielo[0], h.cielo[1], b / 17), 1);
                g.fillRect(0, (L.horiz / 18) * b, L.W, L.horiz / 18 + 1);
            }
        },

        /* ── Tabla de la canción (arriba) ── */

        armarCancion: function (keep) {
            var L = this.L;
            this.cancionG = keep(this.add.graphics().setDepth(60));
            (this.cancionObjs || []).forEach(function (o) { if (o.active) o.destroy(); });
            this.cancionObjs = [];
            this.dibujarCancion();
        },

        posNota: function (k, n) {
            var L = this.L, paso = 62;
            return { x: L.cancion.x - ((n - 1) * paso) / 2 + k * paso, y: L.cancion.y };
        },

        dibujarCancion: function (resalta) {
            var L = this.L, g = this.cancionG, self = this;
            if (!g || !g.active) return;
            g.clear();
            (this.cancionObjs || []).forEach(function (o) { if (o.active) o.destroy(); });
            this.cancionObjs = [];
            if (!this.nv || !this.nv.ids) return;
            var n = this.serie.length + 1;
            var a = n * 62 + 30;
            var x0 = L.cancion.x - a / 2;
            g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x0 + 3, L.cancion.y - 34, a, 72, 18);
            g.fillStyle(0x8b5524, 1); g.fillRoundedRect(x0, L.cancion.y - 38, a, 72, 18);
            g.fillStyle(0xa8642e, 1); g.fillRoundedRect(x0 + 6, L.cancion.y - 32, a - 12, 60, 14);
            g.lineStyle(2, 0x5c3312, 0.6); g.lineBetween(x0 + 12, L.cancion.y - 8, x0 + a - 12, L.cancion.y - 8); g.lineBetween(x0 + 12, L.cancion.y + 12, x0 + a - 12, L.cancion.y + 12);
            for (var k = 0; k < n; k++) {
                var p = this.posNota(k, n), on = resalta === k;
                g.fillStyle(0xffffff, 1); g.fillCircle(p.x, p.y - 2, on ? 29 : 25);
                g.lineStyle(4, k < this.serie.length ? COLB[k % 5] : 0xfab005, 1); g.strokeCircle(p.x, p.y - 2, on ? 29 : 25);
                if (k < this.serie.length) {
                    var im = this.add.image(p.x, p.y - 2, 'el_' + this.serie[k]).setDepth(61);
                    im.setScale(((on ? 40 : 34)) / Math.max(im.width, im.height));
                    this.cancionObjs.push(im);
                } else {
                    var q = this.add.text(p.x, p.y - 2, '?', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#f08c00' }).setOrigin(0.5).setDepth(61);
                    this.tweens.add({ targets: q, scale: { from: 1, to: 1.25 }, duration: 480, yoyo: true, repeat: -1 });
                    this.cancionObjs.push(q);
                }
            }
            this.L.bocina.x = x0 - 40;
            if (this.bocina) this.bocina.setPosition(this.L.bocina.x, this.L.bocina.y);
        },

        /* ── Barco ── */

        crearBarco: function () {
            var L = this.L;
            var c = this.add.container(L.mar.x0 + 140, (L.mar.y0 + L.mar.y1) / 2).setDepth(20);
            this.barco = { cont: c, cuerpo: this.add.container(0, 0), dir: 1 };
            c.add(this.barco.cuerpo);
            this.pintarBarco();
        },

        pintarBarco: function () {
            if (this.arteOk) { this.pintarBarcoArte(); return; }
            this.pintarBarcoViejo();
        },

        /** Barco pirata del diseño en capas (mástiles, velas, bandera, loro, casco); las velas y la bandera se mueven con el viento. */
        pintarBarcoArte: function () {
            var B = this.barco, s = this.L.tamBarco / 180, self = this;
            B.cuerpo.removeAll(true);
            var u = KB / s;   // unidades del dibujo -> unidades del cuerpo (el cuerpo ya se escala por s)
            var capa = function (nom, px, py) {
                var pxx = px == null ? BOX : px, pyy = py == null ? BOY : py;
                return self.dd(nom, (pxx - BOX) * u, (pyy - BOY) * u, u, pxx, pyy);
            };
            B.cuerpo.add(capa('b_fondo'));
            B.bandera = capa('b_bandera', 265.3, 118);
            B.cuerpo.add(B.bandera);
            B.vela = [capa('b_vela1', 107.3, 205), capa('b_vela2', 209.3, 280), capa('b_vela3', 210.7, 185)];
            B.cuerpo.add(B.vela[0]);
            B.cuerpo.add(capa('b_yardas'));
            B.cuerpo.add(B.vela[1]); B.cuerpo.add(B.vela[2]);
            var lo = capa('b_loro', 322, 392);
            B.cuerpo.add(lo);
            this.loro = { cont: lo, cuerpo: lo, cab: lo, pico: lo, pup: { active: true, x: 7, y: -1, scaleY: 1 }, sy0: lo.scaleY, y0: lo.y, esArte: true };
            B.cuerpo.add(capa('b_casco'));
            B.velaG = null;
            B.aguaG = this.add.graphics(); B.cuerpo.add(B.aguaG);
            this.bandera = this.add.graphics(); B.cuerpo.add(this.bandera);   // solo la luz del farol de noche
            B.s = s;
            B.cuerpo.setScale(s * (B.dir || 1), s);
            B.r = 80 * s;
        },

        pintarBarcoViejo: function () {
            var B = this.barco, s = this.L.tamBarco / 180;
            B.cuerpo.removeAll(true);
            // Mástil y botavara (la vela se dibuja cada cuadro: se hincha con el viento).
            var m = this.add.graphics();
            m.fillStyle(0x6d3d16, 1); m.fillRect(-6, -150, 12, 140);
            m.fillStyle(0x9a6430, 1); m.fillRect(-6, -150, 4, 140);
            m.fillStyle(0x6d3d16, 1); m.fillRect(-64, -139, 128, 8);
            m.fillStyle(0x9a6430, 1); m.fillRect(-64, -139, 128, 2);
            m.fillStyle(0xfab005, 1); m.fillCircle(0, -153, 6);
            B.cuerpo.add(m);
            B.velaG = this.add.graphics(); B.cuerpo.add(B.velaG);
            // Casco con tablones, sombra, borda dorada y ojos de buey.
            var g = this.add.graphics();
            g.fillStyle(0x7a4419, 1); g.fillPoints([{ x: -88, y: -26 }, { x: 70, y: -26 }, { x: 102, y: -46 }, { x: 86.2, y: 0 }, { x: -82.2, y: 0 }, { x: -96, y: -40 }], true);
            g.lineStyle(2, 0x4a290e, 0.8);
            [-12].forEach(function (y) { g.beginPath(); g.moveTo(-92 + (y + 26) * 0.1, y); g.lineTo(90 - (y + 26) * 0.12, y); g.strokePath(); });
            for (var tx = -70; tx < 80; tx += 38) g.lineBetween(tx, -26, tx + 3, 0);
            g.fillStyle(0xf2c94c, 1); g.fillPoints([{ x: -96, y: -40 }, { x: -88, y: -26 }, { x: 70, y: -26 }, { x: 102, y: -46 }, { x: 98, y: -36 }, { x: 70, y: -16 }, { x: -86, y: -16 }], true);
            g.fillStyle(0xfff3bf, 0.5); g.fillRect(-88, -26, 158, 2);
            [-45, 0, 45].forEach(function (x) {
                g.fillStyle(0xf2c94c, 1); g.fillCircle(x, -8, 8.5);
                g.fillStyle(0x1c2b4a, 1); g.fillCircle(x, -8, 6);
                g.fillStyle(0x74c0fc, 0.6); g.fillCircle(x - 1, -7, 4);
                g.fillStyle(0xffffff, 0.8); g.fillCircle(x - 3, -10, 1.6);
            });
            g.fillStyle(0x8b5524, 1); g.fillRect(-90, -44, 168, 5);
            for (var px = -84; px < 70; px += 20) g.fillRect(px, -42, 4, 16);
            g.fillStyle(0xfab005, 1);   // estrella tallada en la proa
            var es = []; for (var k = 0; k < 10; k++) { var an = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 4 : 9; es.push({ x: 88 + Math.cos(an) * rr, y: -36 + Math.sin(an) * rr }); }
            g.fillPoints(es, true);
            B.cuerpo.add(g);
            B.aguaG = this.add.graphics(); B.cuerpo.add(B.aguaG);
            this.bandera = this.add.graphics(); B.cuerpo.add(this.bandera);
            var lo = this.crearLoro(66, -58);
            lo.cont.setScale(0.95);
            this.loro = lo;
            B.cuerpo.add(lo.cont);
            B.s = s;
            B.cuerpo.setScale(s * (B.dir || 1), s);
            B.r = 70 * s;
        },

        /** Vela: se hincha con la velocidad y ondula con el viento. Franjas y estrella siguen la curva. */
        pintarVela: function (belly, s) {
            var B = this.barco;
            if (B.vela) {   // velas y bandera del diseño: se hinchan con la velocidad y ondulan con el viento
                var hin = Math.max(0, Math.min(0.12, (belly - 6) * 0.007));
                B.vela.forEach(function (v, i) {
                    if (!v.active) return;
                    v.scaleX = v.sx0 * (1 + hin * (1 - i * 0.25) + Math.sin(s * 2.2 + i * 1.3) * 0.014);
                    v.scaleY = v.sy0 * (1 + Math.sin(s * 1.9 + i) * 0.01);
                    v.angle = Math.sin(s * 1.7 + i * 0.9) * 0.9;
                });
                var bn = B.bandera;
                if (bn && bn.active) { bn.angle = Math.sin(s * 7) * 6 + hin * 30; bn.scaleX = bn.sx0 * (1 + Math.sin(s * 9) * 0.06); }
                var lo = this.loro;
                if (lo && lo.esArte && lo.cab.active && !this.tweens.isTweening(lo.cab)) { lo.cab.angle = Math.sin(s * 2) * 1.4; }
                return;
            }
            var g = B.velaG;
            if (!g || !g.active) return;
            g.clear();
            var xl = -58, xr = 58, yt = -132, yb = -40, N = 12;
            var borde = function (v) { return xr + belly * Math.sin(v * Math.PI) + Math.sin(s * 3 + v * 4) * 1.4; };
            var yv = function (v) { return yt + (yb - yt) * v; };
            var ondas = function (v) { return Math.sin(s * 2.2 + v * 3) * 1.6; };
            g.fillStyle(0xfff4dc, 1);
            g.beginPath(); g.moveTo(xl, yt);
            for (var i = 0; i <= N; i++) { var u = i / N; g.lineTo(xl + (xr - xl) * u, yt - Math.sin(u * Math.PI) * 5 + ondas(0) * u); }
            for (var j = 1; j <= N; j++) { var v = j / N; g.lineTo(borde(v), yv(v) + ondas(v)); }
            for (var k = N; k >= 0; k--) { var w = k / N; g.lineTo(xl + (xr - xl) * w, yb + Math.sin(w * Math.PI) * 8); }
            g.closePath(); g.fillPath();
            // Sombra del vientre de la vela.
            g.fillStyle(0xc9b68a, 0.35);
            g.beginPath(); g.moveTo(10, yt + 6);
            for (var q = 0; q <= N; q++) { var vq = q / N; g.lineTo(borde(vq) - 2, yv(vq) + ondas(vq)); }
            g.lineTo(10, yb + 4); g.closePath(); g.fillPath();
            // Franjas rojas siguiendo la curva.
            g.fillStyle(0xe03131, 0.92);
            [[0.3, 0.45], [0.62, 0.77]].forEach(function (f) {
                g.beginPath(); g.moveTo(xl, yv(f[0]));
                for (var a = 0; a <= 6; a++) { var va = f[0]; g.lineTo(xl + (borde(va) - xl) * (a / 6), yv(va) + ondas(va)); }
                for (var b2 = 0; b2 <= 6; b2++) { var vb = f[1]; g.lineTo(borde(vb) - (borde(vb) - xl) * (b2 / 6), yv(vb) + ondas(vb)); }
                g.closePath(); g.fillPath();
            });
            g.lineStyle(2, 0xb8a47a, 0.7);
            for (var r = 1; r < 4; r++) { g.beginPath(); g.moveTo(xl, yv(r / 4)); for (var c = 0; c <= 8; c++) { var vc = r / 4; g.lineTo(xl + (borde(vc) - xl) * (c / 8), yv(vc) + ondas(vc)); } g.strokePath(); }
            var est = []; for (var e = 0; e < 10; e++) { var an = -Math.PI / 2 + e * Math.PI / 5, rr = e % 2 ? 8 : 18; est.push({ x: 8 + belly * 0.4 + Math.cos(an) * rr, y: -86 + Math.sin(an) * rr }); }
            g.fillStyle(0xfab005, 1); g.fillPoints(est, true);
        },

        crearLoro: function (x, y) {
            var c = this.add.container(x, y);
            var cuerpo = this.add.container(0, 0);
            var g = this.add.graphics();
            g.fillStyle(0x1c7ed6, 1); g.fillTriangle(-6, 6, 6, 6, -22, 50);
            g.fillStyle(0xe03131, 1); g.fillEllipse(0, -6, 34, 44);
            g.fillStyle(0xff8787, 1); g.fillEllipse(5, 0, 16, 26);
            g.fillStyle(0xfab005, 1); g.fillEllipse(-10, -6, 18, 30);
            g.fillStyle(0x2f9e44, 1); g.fillEllipse(-12, 2, 14, 24);
            cuerpo.add(g);
            var cab = this.add.container(4, -30);
            var h = this.add.graphics();
            h.fillStyle(0xe03131, 1); h.fillCircle(0, 0, 15);
            h.fillStyle(0xffffff, 1); h.fillEllipse(7, 1, 13, 15);
            h.fillStyle(0xf8f0e3, 1); h.fillTriangle(11, -5, 24, 2, 11, 5);
            var pup = this.add.circle(7, -1, 3.6, 0x212529);
            var pico = this.add.graphics(); pico.fillStyle(0x343a40, 1); pico.fillTriangle(0, 0, 10, 2, 0, 5); pico.setPosition(11, 4);
            cab.add([h, pup, pico]);
            cuerpo.add(cab);
            c.add(cuerpo);
            return { cont: c, cuerpo: cuerpo, cab: cab, pico: pico, pup: pup };
        },

        picotear: function (ms) {
            var lo = this.loro;
            if (!lo || !lo.pico.active) return;
            this.tweens.killTweensOf(lo.pico);
            if (!lo.esArte) lo.pico.angle = 0;
            this.tweens.add({ targets: lo.pico, angle: lo.esArte ? 7 : 32, duration: 110, yoyo: true, repeat: Math.max(0, Math.round((ms || 400) / 240) - 1) });
        },

        aletear: function () {
            var lo = this.loro;
            if (!lo || !lo.cuerpo.active) return;
            this.tweens.add({ targets: lo.cuerpo, y: lo.esArte ? lo.y0 - 16 : -22, duration: 170, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            K.tono({ f: 1300, f2: 1900, dur: 0.09, vol: 0.04 });
        },

        /** Vuelta del barco: gira la proa con un saltito y salpica, en vez de aplastarse de lado. */
        virar: function (dir) {
            var B = this.barco, self = this;
            if (this.virando || this.girando) return;
            this.virando = true;
            B.dir = dir;
            this.giroT = 0;
            this.tweens.add({ targets: B.cuerpo, scaleX: B.s * dir, duration: 300, ease: 'Sine.easeInOut', onComplete: function () { self.virando = false; } });
            K.ruido({ f: 900, q: 0.6, dur: 0.16, vol: 0.04 });
            Ut.estallido(this, B.cont.x, B.cont.y + 20, { n: 5, tex: 'chispa', tam: 16, dist: 50, depth: 30, colores: [0xffffff, 0xa5d8ff], angulo: Math.PI / 2, abanico: 2.4 });
        },

        limitarBarco: function () {
            var L = this.L, c = this.barco.cont;
            c.x = Math.max(L.mar.x0, Math.min(L.mar.x1, c.x));
            c.y = Math.max(L.mar.y0, Math.min(L.mar.y1, c.y));
        },

        /* ── Cosas del mar ── */

        crearBoya: function (id, x, y) { return this.arteOk ? this.crearBoyaArte(id, x, y) : this.crearBoyaVieja(id, x, y); },

        crearBoyaArte: function (id, x, y) {
            var t = this.L.tamB, kd = t * 1.7 / 321;
            var c = this.add.container(x, y);
            var cuerpo = this.dd('boya' + (ANIM.indexOf(id) >= 0 ? ANIM.indexOf(id) : INST.indexOf(id) + 3) % 5, 0, 0, kd, 254, 405);
            var dy = -70 * kd;
            var ins = this.add.container(0, dy);
            var disco = this.add.graphics();
            disco.fillStyle(0xffffff, 1); disco.fillCircle(0, 0, t * 0.26);
            disco.lineStyle(3, 0x1c7ed6, 1); disco.strokeCircle(0, 0, t * 0.26);
            var im = this.add.image(0, 0, 'el_' + id);
            im.setScale((t * 0.38) / Math.max(im.width, im.height));
            ins.add([disco, im]);
            var agua = this.add.graphics();
            c.add([cuerpo, ins, agua]);
            return { tipo: 'boya', agua: agua, id: id, cont: c, r: t * 0.42, fase: Math.random() * 6, vx: 0, vy: 0, vivo: true, dy: dy, arte: true };
        },

        crearBoyaVieja: function (id, x, y) {
            var t = this.L.tamB;
            var c = this.add.container(x, y);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.18); g.fillEllipse(0, t * 0.36, t * 0.95, t * 0.24);
            g.fillStyle(0xf1f3f5, 1); g.fillRoundedRect(-t * 0.36, -t * 0.42, t * 0.72, t * 0.78, t * 0.24);
            g.fillStyle(0xe03131, 1); g.fillRect(-t * 0.36, -t * 0.12, t * 0.72, t * 0.14); g.fillRect(-t * 0.34, t * 0.16, t * 0.68, t * 0.14);
            g.fillStyle(0x495057, 1); g.fillRect(-3, -t * 0.62, 6, t * 0.22);
            g.fillStyle(0xfab005, 1); g.fillCircle(0, -t * 0.64, t * 0.08);
            g.fillStyle(0xffffff, 1); g.fillCircle(0, -t * 0.1, t * 0.27);
            g.lineStyle(3, 0x1c7ed6, 1); g.strokeCircle(0, -t * 0.1, t * 0.27);
            var im = this.add.image(0, -t * 0.1, 'el_' + id);
            im.setScale((t * 0.4) / Math.max(im.width, im.height));
            var agua = this.add.graphics();
            c.add([g, im, agua]);
            return { tipo: 'boya', agua: agua, id: id, cont: c, r: t * 0.42, fase: Math.random() * 6, vx: 0, vy: 0, vivo: true };
        },

        crearMoneda: function (x, y) {
            if (this.arteOk) {
                var cm = this.add.container(x, y);
                var im = this.dd('moneda', 0, 0, 0.15, 250, 255);
                cm.add(im);
                return { tipo: 'moneda', cont: cm, g: im, r: 22, fase: Math.random() * 6, vivo: true, arte: true };
            }
            var c = this.add.container(x, y);
            var g = this.add.graphics();
            g.fillStyle(0xe8a317, 1); g.fillCircle(0, 0, 16);
            g.fillStyle(0xffd43b, 1); g.fillCircle(0, 0, 13);
            g.fillStyle(0xfff3bf, 1); g.fillCircle(-4, -4, 4);
            g.lineStyle(2, 0xe8a317, 1); g.strokeCircle(0, 0, 8);
            c.add(g);
            return { tipo: 'moneda', cont: c, g: g, r: 20, fase: Math.random() * 6, vivo: true };
        },

        crearRoca: function (x, y) {
            if (this.arteOk) {
                var cr = this.add.container(x, y);
                var cual = Math.random() < 0.5 ? 'roca1' : 'roca2';
                var ri = this.dd(cual, 0, 6, cual === 'roca1' ? 0.25 : 0.27, null, null);
                cr.add(ri);
                return { tipo: 'roca', cont: cr, esp: this.add.graphics(), r: 48, fase: Math.random() * 6, vivo: true, arte: true, img: ri };
            }
            var c = this.add.container(x, y);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.2); g.fillEllipse(0, 20, 120, 26);
            g.fillStyle(0x5c677d, 1); g.fillCircle(-22, 2, 30); g.fillCircle(16, -8, 36); g.fillCircle(30, 10, 22);
            g.fillStyle(0x7d8aa3, 1); g.fillCircle(-26, -6, 16); g.fillCircle(10, -20, 18);
            g.fillStyle(0x2f9e44, 0.8); g.fillEllipse(14, -38, 26, 8);
            var esp = this.add.graphics();
            c.add([g, esp]);
            return { tipo: 'roca', cont: c, esp: esp, r: 48, fase: Math.random() * 6, vivo: true };
        },

        crearRemolino: function (x, y) {
            var c = this.add.container(x, y);
            var g = this.add.graphics();
            c.add(g);
            return { tipo: 'remolino', cont: c, g: g, r: 70, fase: 0, vivo: true };
        },

        esperado: function () {
            var nv = this.nv;
            return nv.ids[nv.ciclo[this.serie.length % nv.ciclo.length]];
        },

        yLibre: function () {
            var L = this.L;
            return L.mar.y0 + 20 + Math.random() * (L.mar.y1 - L.mar.y0 - 40);
        },

        generar: function (time) {
            var L = this.L, nv = this.nv, d = nv.d;
            var vivos = this.cosasMar.filter(function (o) { return o.vivo; });
            var boyas = vivos.filter(function (o) { return o.tipo === 'boya'; });
            var esp = this.esperado();
            var hayEsp = boyas.some(function (o) { return o.id === esp && o.cont.x > L.W * 0.35; });
            if (!this.completa && boyas.length < 5 && (time - this.ultimo.boya > 1900 || (!hayEsp && time - this.ultimo.boya > 700))) {
                var otros = nv.ids.filter(function (q) { return q !== esp; });
                var id = !hayEsp || Math.random() < 0.4 || !otros.length ? esp : otros[(Math.random() * otros.length) | 0];
                this.agregar(this.crearBoya(id, L.W + 60, this.yLibre()));
                this.ultimo.boya = time;
            }
            if (time - this.ultimo.moneda > 3800) {
                var y0 = this.yLibre();
                for (var m = 0; m < 4; m++) this.agregar(this.crearMoneda(L.W + 40 + m * 46, y0 + Math.sin(m * 0.9) * 26));
                this.ultimo.moneda = time;
            }
            if (d.rocas && time - this.ultimo.roca > 7000 / d.rocas) { this.agregar(this.crearRoca(L.W + 80, this.yLibre())); this.ultimo.roca = time; }
            if (d.remolinos && time - this.ultimo.remolino > 11000) { this.agregar(this.crearRemolino(L.W + 100, this.yLibre())); this.ultimo.remolino = time; }
        },

        agregar: function (o) { this.cosasMar.push(o); return o; },

        quitar: function (o, efecto) {
            if (!o.vivo) return;
            o.vivo = false;
            if (!efecto) { if (o.cont.active) o.cont.destroy(); return; }
            tw(this, { targets: o.cont, alpha: 0, y: o.cont.y + 30, duration: 300 }).then(function () { if (o.cont.active) o.cont.destroy(); });
        },

        /* ── Choques ── */

        chocar: function (o) {
            var B = this.barco.cont, self = this;
            if (o.tipo === 'moneda') {
                this.quitar(o, false);
                this.monedas += 1;
                K.tono({ f: 1300 + (this.monedas % 5) * 120, dur: 0.08, vol: 0.05 });
                Ut.estallido(this, o.cont.x, o.cont.y, { n: 5, tex: 'estrella', tam: 16, dist: 50, depth: 70, sinTinte: true });
                this.volarMoneda(o.cont.x, o.cont.y);
                return;
            }
            if (o.tipo === 'roca') {
                if (this.time.now - (o.ultimo || 0) < 700) return;
                o.ultimo = this.time.now;
                var ang = Math.atan2(B.y - o.cont.y, B.x - o.cont.x);
                this.vx = Math.cos(ang) * 320; this.vy = Math.sin(ang) * 320;
                B.x = o.cont.x + Math.cos(ang) * (o.r + this.barco.r + 2);
                B.y = o.cont.y + Math.sin(ang) * (o.r + this.barco.r + 2);
                this.cameras.main.shake(140, 0.004);
                K.ruido({ f: 300, q: 0.7, dur: 0.18, vol: 0.12, tipo: 'lowpass' });
                this.sorpresa();
                this.anillo(o.cont.x, o.cont.y + 20, 0xffffff);
                Ut.estallido(this, (B.x + o.cont.x) / 2, (B.y + o.cont.y) / 2, { n: 8, tex: 'chispa', tam: 18, dist: 70, depth: 70, colores: [0xffffff, 0xa5d8ff] });
                return;
            }
            if (o.tipo === 'remolino') {
                if (this.girando) return;
                this.girando = true;
                K.tono({ f: 500, f2: 180, dur: 0.6, vol: 0.05 });
                tw(this, { targets: this.barco.cuerpo, angle: 720, duration: 900, ease: 'Sine.easeInOut' }).then(function () { self.barco.cuerpo.angle = 0; self.girando = false; });
                this.vx = 260; this.vy = (Math.random() - 0.5) * 300;
                return;
            }
            // Boya.
            if (this.time.now - (o.ultimo || 0) < 600) return;
            o.ultimo = this.time.now;
            if (this.fase === 'jugar' && !this.completa && o.id === this.esperado()) { this.recoger(o); return; }
            // No sigue la canción (o no es momento): rebota y suena.
            var a2 = Math.atan2(o.cont.y - B.y, o.cont.x - B.x);
            o.vx = Math.cos(a2) * 260; o.vy = Math.sin(a2) * 260;
            this.vx -= Math.cos(a2) * 120; this.vy -= Math.sin(a2) * 120;
            this.tweens.add({ targets: o.cont, angle: { from: -20, to: 20 }, duration: 90, yoyo: true, repeat: 2, onComplete: function () { o.cont.angle = 0; } });
            this.sonar(o.id, { breve: true, bocina: false });
            this.anillo(o.cont.x, o.cont.y, 0xffffff);
            this.sorpresa();
            if (this.fase === 'jugar' && !this.completa) {
                this.errores += 1; this.erroresNivel += 1;
                if (this.erroresNivel >= 4) this.ayuda = true;
                if (this.time.now - this.ultimoReclamo > 6000) {
                    this.ultimoReclamo = this.time.now;
                    this.reaccion('Decir_no', 1400);
                    this.picotear(500);
                    this.ctx.decir({ voz: 'zeus', texto: '¡Esa no sigue la canción!' }, { minMs: 700 });
                }
            }
        },

        recoger: function (o) {
            var self = this;
            o.vivo = false;
            this.cosasMar = this.cosasMar.filter(function (q) { return q !== o; });
            this.serie.push(o.id);
            this.reunidos.push(o.id);
            this.recogidas += 1;
            this.cadena.push({ cont: o.cont, id: o.id });
            o.cont.setDepth(19);
            this.sonar(o.id, { breve: true, bocina: false });
            this.anillo(o.cont.x, o.cont.y, 0xffe066);
            this.picotear(600);
            this.aletear();
            Ut.estallido(this, o.cont.x, o.cont.y, { n: 10, tex: 'estrella', tam: 24, dist: 110, depth: 70, sinTinte: true });
            this.dibujarCancion(this.serie.length - 1);
            this.pista.reiniciar();
            if (this.recogidas >= this.nv.meta) {
                this.completa = true;
                if (this.nv.demo) { this.llegar(); return; }
                this.ctx.decir({ voz: 'zoe', texto: '¡Canción completa! ¡Vamos a la isla!' }, { minMs: 600 });
                this.traerIsla();
            }
        },

        /* ── La isla de cada nivel ── */

        traerIsla: function () {
            if (this.arteOk) { this.traerIslaArte(); return; }
            var L = this.L;
            var c = this.add.container(L.W + 260, (L.mar.y0 + L.mar.y1) / 2).setDepth(12);
            var g = this.add.graphics();
            var h = HORAS[this.hora];
            g.fillStyle(0x000000, 0.15); g.fillEllipse(10, 50, 340, 60);
            g.fillStyle(h.isla, 1); g.fillEllipse(0, 30, 320, 90);
            g.fillStyle(h.noche ? 0x1e5631 : 0x2f9e44, 1); g.fillEllipse(30, 0, 200, 70);
            [[-60, 1], [20, -1], [80, 1]].forEach(function (pl, i) {
                var bx = pl[0], by = 0, alto = 110 + i * 14;
                g.lineStyle(10, 0x8b5524, 1); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + pl[1] * 14, by - alto * 0.5); g.lineTo(bx + pl[1] * 6, by - alto); g.strokePath();
                g.fillStyle(h.noche ? 0x1e5631 : 0x37b24d, 1);
                for (var k = 0; k < 5; k++) { var a = -Math.PI + k * Math.PI / 4; g.fillEllipse(bx + pl[1] * 6 + Math.cos(a) * 34, by - alto + Math.sin(a) * 14 + 10, 64, 18); }
            });
            // Muelle con bandera: aquí atraca el barco.
            g.fillStyle(0x8b5524, 1); g.fillRect(-190, 26, 90, 14);
            for (var p = -184; p < -100; p += 22) g.fillRect(p, 26, 6, 34);
            g.lineStyle(3, 0x495057, 1); g.lineBetween(-110, 26, -110, -40);
            g.fillStyle(0xfab005, 1); g.fillTriangle(-110, -40, -76, -30, -110, -20);
            c.add(g);
            this.isla = { cont: c, muelle: { dx: -150, dy: 30 } };
            var self = this;
            this.cosasMar.forEach(function (o) { if (o.vivo) self.quitar(o, true); });
            this.tweens.add({ targets: c, x: L.mar.x1 - 120, duration: 2600, ease: 'Sine.easeOut' });
        },

        /** La isla del diseño llega desde la derecha; su muelle (a la izquierda) es donde atraca el barco. */
        traerIslaArte: function () {
            var L = this.L, h = HORAS[this.hora];
            var c = this.add.container(L.W + 360, (L.mar.y0 + L.mar.y1) / 2).setDepth(12);
            var kd = 0.64;
            var im = this.dd('isla', 0, -76, kd, 36 + 817.5 / 2, 33.5 + 424 / 2);
            im.setTint(h.noche ? 0x8d9ac4 : (h.bajo ? 0xffd9b8 : 0xffffff));
            c.add(im);
            this.isla = { cont: c, muelle: { dx: -243, dy: 20 }, img: im };
            var self = this;
            this.cosasMar.forEach(function (o) { if (o.vivo) self.quitar(o, true); });
            this.tweens.add({ targets: c, x: L.mar.x1 - 60, duration: 2600, ease: 'Sine.easeOut' });
        },

        llegar: async function () {
            if (this.llegando) return;
            this.llegando = true;
            var nv = this.nv, self = this;
            this.spawnOn = false;
            this.fase = 'premio';
            this.marcadas = this.serie.slice();
            await this.acertar([this.serie[this.serie.length - 1]], { x: this.barco.cont.x, y: this.barco.cont.y - 60 });
            this.llegando = false;
        },

        /* ── Niveles ── */

        generarNivel: function (i) {
            var self = this, d = NIV[Math.min(i, 3)];
            var hay = function (id) { return self.textures.exists('el_' + id); };
            var an = Ut.mezclar(ANIM.filter(hay)), ins = Ut.mezclar(INST.filter(hay));
            var usados = d.ciclo.reduce(function (m, q) { return Math.max(m, q); }, 0) + 1;
            var ids = [an[0], ins[0], an[1]].slice(0, usados);
            if (d.distr) ids.push(ins[1]);
            var dados = [];
            for (var k = 0; k < d.dados; k++) dados.push(ids[d.ciclo[k % d.ciclo.length]]);
            return {
                tipo: 'elegir', reproducciones: [dados], opciones: ids.slice(), correctas: [ids[d.ciclo[d.dados % d.ciclo.length]]], meta: d.meta, preguntas: [],
                ids: ids, ciclo: d.ciclo, dados: dados, d: d, hora: Math.min(i, 3)
            };
        },

        planNiveles: function () { var self = this; return [0, 1, 2, 3].map(function (i) { return self.generarNivel(i); }); },

        nivelDemo: function () { var nv = this.generarNivel(0); nv.demo = true; nv.meta = 1; return nv; },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Maneja el barco con tu dedo y recoge las boyas que siguen la canción!' }, { minMs: 900 });
        },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.cosasMar.forEach(function (o) { self.quitar(o, true); });
            this.cosasMar = [];
            this.cadena.forEach(function (o) { if (o.cont.active) tw(self, { targets: o.cont, alpha: 0, duration: 300 }).then(function () { o.cont.destroy(); }); });
            this.cadena = [];
            if (this.isla) { var ic = this.isla.cont; tw(this, { targets: ic, x: -400, duration: 900 }).then(function () { ic.destroy(); }); this.isla = null; }
            this.serie = nv.dados.slice();
            this.recogidas = 0;
            this.completa = false;
            this.llegando = false;
            this.erroresNivel = 0;
            if (this.hora !== nv.hora) { this.horaDe = this.hora; this.hora = nv.hora; this.horaT = 0; }
            this.dibujarCancion();
            await esperar(this, 500);
        },

        /** El loro canta la canción: cada nota de la tabla se ilumina con su sonido. */
        presentar: async function () {
            var nv = this.nv;
            this.fase = 'escuchando';
            this.pista.parar();
            var n = this.serie.length;
            var desde = Math.max(0, n - 4);
            for (var k = desde; k < n; k++) {
                if (!this.sigue()) return;
                this.dibujarCancion(k);
                this.picotear(500);
                await this.sonar(this.serie[k], { breve: true });
                await esperar(this, 200);
            }
            this.dibujarCancion();
            this.aletear();
            await esperar(this, 200);
        },

        mostrarOpciones: async function () {
            this.spawnOn = true;
            var L = this.L, esp = this.esperado();
            // La primera boya correcta aparece ya a la vista.
            this.agregar(this.crearBoya(esp, L.W * 0.62, (L.mar.y0 + L.mar.y1) / 2 + 40));
            this.ultimo.boya = this.time.now;
        },

        alTerminarNivel: async function () {
            this.spawnOn = false;
            await esperar(this, 400);
        },

        /* ── Dedo: el barco va hacia él ── */

        alTocar: function (p) {
            if (this.fase === 'intro' || this.fase === 'fin' || this.fase === 'demo') return;
            this.dedo = { x: p.x, y: p.y };
            this.pista.reiniciar();
        },
        alMover: function (p) { if (this.dedo && p.isDown) { this.dedo = { x: p.x, y: p.y }; } },
        alSoltar: function () { this.dedo = null; },

        alAcertar: async function () {
            var self = this;
            for (var k = 0; k < this.cadena.length; k++) {
                if (!this.sigue()) return;
                var o = this.cadena[k];
                this.tweens.add({ targets: o.cont, scale: { from: 1.3, to: 1 }, duration: 300 });
                Ut.estallido(this, o.cont.x, o.cont.y - 20, { n: 5, tex: 'nota', tam: 20, dist: 70, depth: 70 });
                await this.sonar(o.id, { breve: true, bocina: false });
            }
            Ut.confeti(this, 40);
            await esperar(this, 400);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar') return Promise.resolve();
            var B = this.barco.cont;
            var obj = this.completa && this.isla ? { x: this.isla.cont.x + this.isla.muelle.dx, y: this.isla.cont.y + this.isla.muelle.dy } : null;
            if (!obj) {
                var esp = this.esperado();
                var b = this.cosasMar.filter(function (o) { return o.vivo && o.tipo === 'boya' && o.id === esp && o.cont.x > self.L.mar.x0 + 60 && o.cont.x < self.L.mar.x1; })[0];
                if (b) obj = { x: b.cont.x - 60, y: b.cont.y };
            }
            if (!this.ayuda && !this.completa) { this.aletear(); return esperar(this, 800); }
            if (!obj) return esperar(this, 500);
            return this.ctx.mano({ punto: { x: B.x, y: B.y }, holdMs: 200, arrastre: { dx: obj.x - B.x, dy: obj.y - B.y, durMs: 1100 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this;
            return [function () {
                var esp = self.esperado();
                var b = self.cosasMar.filter(function (o) { return o.vivo && o.tipo === 'boya' && o.id === esp; })[0];
                if (!b) return null;
                b.quieta = true;
                var B = self.barco.cont;
                return {
                    desde: { x: B.x, y: B.y }, hasta: { x: b.cont.x, y: b.cont.y },
                    hacer: async function () {
                        self.fase = 'jugar';
                        self.dedo = { x: b.cont.x, y: b.cont.y };
                        for (var t = 0; t < 60 && !self.completa; t++) await esperar(self, 80);
                        self.dedo = null;
                        while (self.llegando && self.fase === 'premio') await esperar(self, 100);
                    }
                };
            }];
        },

        /* ── Final: el tesoro ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.spawnOn = false;
            this.cosasMar.forEach(function (o) { self.quitar(o, true); });
            if (this.hora !== 2) { this.horaDe = this.hora; this.hora = 2; this.horaT = 0; }
            if (!this.isla) this.traerIsla();
            await esperar(this, 1500);
            var muelle = { x: this.isla.cont.x + this.isla.muelle.dx - 40, y: this.isla.cont.y + 10 };
            await tw(this, { targets: this.barco.cont, x: muelle.x - 60, y: muelle.y, duration: 1200, ease: 'Sine.easeInOut' });
            // La tabla de la canción se guarda y las boyas remolcadas forman una fila frente a la isla.
            this.cancionG.clear(); this.cancionObjs.forEach(function (o) { if (o.active) o.destroy(); }); this.cancionObjs = [];
            if (this.bocina) this.bocina.setVisible(false);
            this.cadenaLibre = true;
            var nC = this.cadena.length, filaY = Math.min(L.H - 70, this.isla.cont.y + 120);
            this.cadena.forEach(function (o, i) {
                if (!o.cont.active) return;
                o.cont.setDepth(30);
                self.tweens.add({ targets: o.cont, x: L.W * 0.5 + (i - (nC - 1) / 2) * (L.tamB * 1.05), y: filaY, angle: 0, duration: 700, delay: i * 80, ease: 'Sine.easeOut' });
            });
            var cofre = this.add.container(this.isla.cont.x + 40, this.isla.cont.y + 10).setDepth(13).setScale(0.2);
            var base = this.add.graphics();
            base.fillStyle(0x7a4419, 1); base.fillRoundedRect(-34, -20, 68, 38, 6);
            base.fillStyle(0xfab005, 1); base.fillRect(-34, -6, 68, 6); base.fillRect(-4, -20, 8, 38);
            var tapa = this.add.container(-34, -20);
            var tg = this.add.graphics(); tg.fillStyle(0x8f5225, 1); tg.fillRoundedRect(0, -20, 68, 22, { tl: 14, tr: 14, bl: 0, br: 0 }); tg.fillStyle(0xfab005, 1); tg.fillRect(30, -20, 8, 22);
            tapa.add(tg);
            cofre.add([base, tapa]);
            await tw(this, { targets: cofre, scale: 1.4, duration: 500, ease: 'Back.easeOut' });
            K.tono({ f: 520, f2: 1040, dur: 0.4, vol: 0.06 });
            await tw(this, { targets: tapa, angle: -110, duration: 420, ease: 'Back.easeOut' });
            for (var m = 0; m < 3; m++) {
                Ut.estallido(this, cofre.x, cofre.y - 30, { n: 14, tex: 'estrella', tam: 26, dist: 170, depth: 50, colores: [0xfab005, 0xffd43b, 0xff922b, 0x4dabf7, 0xe64980], angulo: -Math.PI / 2, abanico: 1.6, gravedad: 60 });
                await esperar(this, 260);
            }
            var ids = this.reunidos.filter(function (id, i, a) { return a.indexOf(id) === i; }).slice(0, 6);
            if (!ids.length) ids = ['perro', 'tambor'];
            for (var k = 0; k < Math.max(5, ids.length); k++) {
                if (!this.sigue()) return;
                var fx = L.W * (0.2 + Math.random() * 0.55), fy = L.horiz * (0.3 + Math.random() * 0.45);
                K.ruido({ f: 2400, q: 0.6, dur: 0.3, vol: 0.08 });
                Ut.estallido(this, fx, fy, { n: 22, tex: 'chispa', tam: 22, dist: 150, depth: 50, colores: [COLB[k % 5], 0xffffff, COLB[(k + 2) % 5]], ms: 1100, gravedad: 50 });
                Ut.estallido(this, fx, fy, { n: 6, tex: 'estrella', tam: 22, dist: 90, depth: 51, sinTinte: true });
                this.picotear(500);
                var bo = this.cadena[k % Math.max(1, this.cadena.length)];
                if (bo && bo.cont.active) { this.tweens.add({ targets: bo.cont, y: bo.cont.y - 40, duration: 180, yoyo: true, ease: 'Quad.easeOut' }); }
                await this.sonar(bo ? bo.id : ids[k % ids.length], { breve: true, bocina: false });
            }
            this.aletear();
            Ut.confeti(this, 100);
            await esperar(this, 1200);
        },

        estadoExtra: function () {
            var B = this.barco && this.barco.cont;
            return {
                serie: this.serie.slice(), esperado: this.nv && this.nv.ids ? this.esperado() : null, recogidas: this.recogidas, monedas: this.monedas, completa: !!this.completa, hora: this.hora,
                barco: B && { x: Math.round(B.x), y: Math.round(B.y) }, isla: this.isla && { x: Math.round(this.isla.cont.x + this.isla.muelle.dx), y: Math.round(this.isla.cont.y + this.isla.muelle.dy) },
                cosas: this.cosasMar.filter(function (o) { return o.vivo; }).map(function (o) { return { t: o.tipo, id: o.id, x: Math.round(o.cont.x), y: Math.round(o.cont.y) }; })
            };
        },

        /** Punto del rastro del barco a cierta distancia hacia atrás (para atar las boyas). */
        puntoAtras: function (d) {
            var r = this.rastro, acc = 0;
            for (var i = 1; i < r.length; i++) {
                acc += Math.hypot(r[i].x - r[i - 1].x, r[i].y - r[i - 1].y);
                if (acc >= d) return r[i];
            }
            var ult = r[r.length - 1] || { x: this.barco.cont.x, y: this.barco.cont.y };
            var falta = d - acc;
            return { x: ult.x - this.barco.dir * falta, y: ult.y };
        },

        /* ── Detalles vivos ── */

        olaY: function (x, s) { return Math.sin(x / 90 + s * 1.6) * 3 + Math.sin(x / 37 - s * 2.3) * 1.4; },

        anillo: function (x, y, col) {
            this.anillos.push({ x: x, y: y, t0: this.time.now, col: col || 0xffffff });
            if (this.anillos.length > 14) this.anillos.shift();
        },

        /** El loro se sobresalta (choque con roca o boya equivocada). */
        sorpresa: function () {
            var lo = this.loro;
            if (!lo || !lo.cab.active) return;
            this.tweens.add({ targets: lo.cab, angle: lo.esArte ? { from: -7, to: 7 } : { from: -16, to: 16 }, duration: 70, yoyo: true, repeat: 3, onComplete: function () { lo.cab.angle = 0; } });
            this.tweens.add({ targets: lo.cuerpo, y: lo.esArte ? lo.y0 - 8 : -10, duration: 110, yoyo: true });
        },

        armarMonedas: function (keep) {
            var L = this.L;
            var c = keep(this.add.container(26, L.H - 44).setDepth(70));
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.3); g.fillRoundedRect(2, -20, 118, 44, 22);
            g.fillStyle(0x12263f, 0.88); g.fillRoundedRect(0, -22, 118, 44, 22);
            g.lineStyle(3, 0xffd43b, 0.9); g.strokeRoundedRect(0, -22, 118, 44, 22);
            var tx = this.add.text(54, 0, String(this.monedasMostradas || 0), { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#ffffff' }).setOrigin(0, 0.5);
            c.add(g);
            if (this.arteOk) c.add(this.dd('moneda', 24, 0, 0.13, 250, 255));
            else {
                var gm = this.add.graphics();
                gm.fillStyle(0xe8a317, 1); gm.fillCircle(24, 0, 17);
                gm.fillStyle(0xffd43b, 1); gm.fillCircle(24, 0, 14);
                gm.fillStyle(0xfff3bf, 1); gm.fillCircle(19, -5, 4);
                gm.lineStyle(2, 0xe8a317, 1); gm.strokeCircle(24, 0, 9);
                c.add(gm);
            }
            c.add(tx);
            this.hudMon = { cont: c, txt: tx, x: 50, y: L.H - 44 };
        },

        volarMoneda: function (x, y) {
            var self = this, h = this.hudMon;
            if (!h || !h.cont.active) return;
            var c = this.add.container(x, y).setDepth(72);
            if (this.arteOk) c.add(this.dd('moneda', 0, 0, 0.16, 250, 255));
            else {
                var g = this.add.graphics();
                g.fillStyle(0xe8a317, 1); g.fillCircle(0, 0, 15); g.fillStyle(0xffd43b, 1); g.fillCircle(0, 0, 12); g.fillStyle(0xfff3bf, 1); g.fillCircle(-4, -4, 3.5);
                c.add(g);
            }
            this.tweens.add({
                targets: c, x: h.x, y: h.y, scale: { from: 1.4, to: 0.8 }, duration: 650, ease: 'Cubic.easeIn',
                onComplete: function () {
                    c.destroy();
                    self.monedasMostradas += 1;
                    if (h.txt.active) h.txt.setText(String(self.monedasMostradas));
                    if (h.cont.active) self.tweens.add({ targets: h.cont, scale: { from: 1.2, to: 1 }, duration: 220, ease: 'Back.easeOut' });
                    K.tono({ f: 1500 + (self.monedasMostradas % 4) * 140, dur: 0.05, vol: 0.03 });
                }
            });
        },

        /** Ave del diseño: cuerpo + ala que bate desde el hombro. Mira a la izquierda; ancho = px del cuerpo. */
        crearAve: function (ancho) {
            var kb = ancho / AVE.ancho, c = this.add.container(0, 0);
            var cuerpo = this.add.image(0, 0, 'dd_ave').setDisplaySize(AVE.w * kb, AVE.h * kb);
            var ala = this.add.image((AVE.hx - AVE.w / 2) * kb, (AVE.hy - AVE.h / 2) * kb, 'dd_ala').setDisplaySize(AVE.w * kb, AVE.h * kb).setOrigin(AVE.hx / AVE.w, AVE.hy / AVE.h);
            c.add([cuerpo, ala]);
            c.ala = ala;
            return c;
        },

        /** Sombras de peces bajo el agua y aves (3 que acompañan al barco y 3 lejanas) con el arte del diseño. */
        montarExtras: function (keep) {
            var L = this.L, kk = L.H / 720;
            var tipos = [['dd_sp1', 104, 642, 263], ['dd_sp2', 70, 325, 125], ['dd_sp3', 58, 260, 167]];
            for (var i = 0; i < 6; i++) {
                var t = tipos[i % 3], ancho = t[1] * kk * (0.85 + 0.15 * (i % 2));
                var im = keep(this.add.image(0, 0, t[0], 'rec').setDepth(3.2));
                im.setDisplaySize(ancho, ancho * t[3] / t[2]);
                this.sombrasPez.push(im);
            }
            for (var j = 0; j < 5; j++) {
                var lejos = j >= 2;
                var ave = keep(this.crearAve((lejos ? 30 : 74) * kk).setDepth(lejos ? 1.2 : 24));
                ave.lejos = lejos; ave.k = lejos ? j - 2 : j; ave.dirS = 1;
                this.aves.push(ave);
            }
        },

        /** Delfín dibujado una vez: cada tanto salta por el mar. */
        crearDelfin: function () {
            if (this.extraOk) {
                // Delfín del diseño: mira a la derecha, igual que el dibujo anterior (el salto lo orienta en paso()).
                var c = this.add.container(0, 0), im = this.add.image(0, 0, 'dd_delfin', 'rec');
                im.setDisplaySize(190, 190 * 217 / 430);
                c.add(im); c.setVisible(false);
                return c;
            }
            var g = this.add.graphics();
            g.fillStyle(0x6f8ba3, 1); g.fillEllipse(0, 0, 96, 30);
            g.fillStyle(0xdde9f0, 1); g.fillEllipse(6, 7, 76, 15);
            g.fillStyle(0x6f8ba3, 1); g.fillTriangle(-2, -12, 18, -14, 4, -34);
            g.fillTriangle(-44, 0, -70, -18, -64, 2); g.fillTriangle(-44, 0, -70, 18, -62, 4);
            g.fillTriangle(8, 8, 26, 12, 14, 24);
            g.fillStyle(0x6f8ba3, 1); g.fillEllipse(50, 2, 26, 12);
            g.fillStyle(0x212529, 1); g.fillCircle(36, -4, 3);
            g.fillStyle(0xffffff, 0.35); g.fillEllipse(0, -8, 60, 6);
            g.setVisible(false);
            return g;
        },

        /** Aves: las lejanas cruzan el cielo; las cercanas escoltan al barco. Baten el ala y miran hacia donde vuelan. */
        animarAves: function (s, dt, P, B, dir, sB, L) {
            this.aves.forEach(function (a, i) {
                if (!a.active) return;
                var dia = a.lejos ? P.noche < 0.5 : P.noche < 0.6;
                a.setVisible(dia);
                if (!dia) return;
                var gv = a.k, ph = gv * 2 + i, x, y, rumbo;
                if (a.lejos) {
                    var v = 38 + gv * 12, sentido = gv === 1 ? -1 : 1;
                    var t = (s * v + gv * 400) % (L.W + 200);
                    x = sentido > 0 ? t - 100 : L.W + 100 - t;
                    y = L.horiz * (0.35 + gv * 0.15) + Math.sin(s * 2 + gv) * 8;
                    rumbo = sentido;
                } else {
                    x = B.x - dir * (70 + gv * 46) + Math.cos(s * 0.9 + gv * 3) * 70;
                    y = B.y - 200 * sB - 78 - gv * 30 + Math.sin(s * 1.3 + gv * 2) * 20;
                    rumbo = dir;
                }
                // El dibujo mira a la izquierda: al ir a la derecha se espeja (con un giro suave).
                a.dirS += (rumbo - a.dirS) * Math.min(1, dt * 5);
                var bate = Math.sin(s * (a.lejos ? 8 : 10) + ph);
                a.setPosition(x, y + bate * 2);
                a.setScale(-a.dirS, 1).setAngle(Math.sin(s * 1.3 + ph) * 4 * a.dirS);
                a.setAlpha((a.lejos ? 0.8 : 1) * (1 - P.noche));
                a.ala.setRotation(-0.2 + bate * 0.6);
            });
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!L || !this.marG || !this.marG.active || !this.barco) return;
            this.horaT = Math.min(1, this.horaT + dt / 2.6);
            var te = this.horaT * this.horaT * (3 - 2 * this.horaT);
            var P = this.pal = mezclaPal(HORAS[this.horaDe], HORAS[this.hora], te);
            var corre = this.nv && this.nv.d && (this.fase === 'jugar' || this.fase === 'escuchando') && !(this.completa && this.isla) ? this.nv.d.vel : (this.fase === 'fin' ? 0 : 20);
            if (this.nv && this.nv.demo) corre = 20;
            this.mundo += corre * dt;
            var alto = L.H - L.horiz;
            var B = this.barco.cont, sB = this.barco.s, dir = this.barco.dir;

            // ── Cielo y mar del diseño; la hora (atardecer, noche) los tiñe con un velo de color ──
            var ax = L.W * 0.82, ay = L.horiz * (0.38 + 0.4 * P.bajo);
            var cg0 = this.cieloG; cg0.clear();
            var velo = this.arteOk ? Math.min(1, P.bajo + P.noche) : 1;
            if (velo > 0.01) {
                for (var cb = 0; cb < 18; cb++) { cg0.fillStyle(mezcla(P.cielo[0], P.cielo[1], cb / 17), 0.92 * velo); cg0.fillRect(0, (L.horiz / 18) * cb, L.W, L.horiz / 18 + 1); }
                for (var mb = 0; mb < 12; mb++) { cg0.fillStyle(mezcla(P.mar[0], P.mar[2], mb / 11), 0.88 * velo); cg0.fillRect(0, L.horiz + (alto / 12) * mb, L.W, alto / 12 + 1); }
            }
            if (this.arteOk) this.animarFondoArte(time, s, P, te);
            var f = this.fondoG; f.clear();
            if (P.noche > 0.02) for (var e = 0; e < 55; e++) { f.fillStyle(0xffffff, P.noche * (0.3 + 0.6 * Math.abs(Math.sin(s * 1.2 + e * 2.3)))); f.fillCircle((e * 977 + 50) % L.W, 8 + (e * 613) % (L.horiz - 20), 1 + (e % 3) * 0.6); }
            f.fillStyle(P.astro, 0.2); f.fillCircle(ax, ay, 80 - 18 * P.noche);
            if (!(this.aves && this.aves.length) && P.noche < 0.5) for (var gv = 0; gv < 3; gv++) {
                var gx = ((s * (38 + gv * 12) + gv * 400) % (L.W + 200)) - 100, gy = L.horiz * (0.35 + gv * 0.15) + Math.sin(s * 2 + gv) * 8, al = Math.sin(s * 9 + gv) * 6;
                f.lineStyle(3, 0x343a40, 0.8); f.beginPath(); f.moveTo(gx - 12, gy - al); f.lineTo(gx, gy); f.lineTo(gx + 12, gy - al); f.strokePath();
            }

            // ── Mar: degradado, camino de luz del astro, peces, capas de olas con crestas y espuma ──
            var g = this.marG;
            g.clear();
            if (!this.arteOk) for (var b = 0; b < 12; b++) { g.fillStyle(mezcla(P.mar[0], P.mar[2], b / 11), 1); g.fillRect(0, L.horiz + (alto / 12) * b, L.W, alto / 12 + 1); }
            for (var gi = 0; gi < 14; gi++) {
                var gy2 = L.horiz + 5 + gi * (alto * 0.42 / 14), gw = 8 + gi * 6;
                for (var d = 0; d < 4; d++) {
                    var gx2 = ax + Math.sin(d * 2.3 + gi * 1.1 + s * 0.8) * gw, br = 0.5 + 0.5 * Math.sin(s * 3.2 + gi * 2.1 + d * 1.7);
                    g.fillStyle(P.noche > 0.5 ? 0xdbe4ff : 0xfff3bf, 0.55 * br * (1 - gi / 17));
                    g.fillRect(gx2 - (4 + gi), gy2, 8 + gi * 2, 2 + gi * 0.25);
                }
            }
            for (var pk = 0; pk < 6; pk++) {
                var fx = L.W + 80 - ((this.mundo * 0.6 + s * (18 + pk * 5) + pk * 260) % (L.W + 220)), fy = L.horiz + alto * (0.22 + (pk % 3) * 0.24) + Math.sin(s * 1.2 + pk) * 6;
                if (this.sombrasPez && this.sombrasPez[pk] && this.sombrasPez[pk].active) { this.sombrasPez[pk].setPosition(fx, fy + Math.sin(s * 2 + pk) * 3).setAngle(Math.sin(s * 1.5 + pk) * 4); continue; }
                g.fillStyle(0x08305a, 0.15 + 0.04 * (pk % 2)); g.fillEllipse(fx, fy, 30, 11); g.fillTriangle(fx + 13, fy, fx + 26, fy - 8, fx + 26, fy + 8);
            }
            if (!this.arteOk) for (var l = 0; l < 5; l++) {
                var base = L.horiz + alto * (0.05 + l * 0.2), amp = 2.5 + l * 2.2, len = 38 + l * 20;
                var fase = this.mundo * (0.010 + l * 0.008) + s * (0.55 + l * 0.13);
                var pts = [];
                for (var px = -10; px <= L.W + 20; px += 14) pts.push({ x: px, y: base + amp * Math.sin(px / len + fase) + amp * 0.45 * Math.sin(px / (len * 0.43) - fase * 1.6) });
                g.lineStyle(1.6 + l * 0.6, 0xffffff, 0.13 + l * 0.045);
                g.beginPath(); pts.forEach(function (p, i) { if (!i) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y); }); g.strokePath();
            }

            // ── Delfín que salta de vez en cuando ──
            var dd = this.delfinG, ct = (time % 18000) / 1000;
            if (ct < 1.7 && this.fase !== 'fin') {
                var dp = ct / 1.7, dbase = L.horiz + alto * 0.3, ddx = L.W * 0.16 + dp * L.W * 0.42, ddy = dbase - Math.sin(dp * Math.PI) * 120;
                dd.setVisible(true).setPosition(ddx, ddy).setRotation(Math.atan2(-Math.cos(dp * Math.PI) * 120 * Math.PI, L.W * 0.42 * 1.7)).setScale(0.8);
                if (this.dEstado === 0 && dp > 0.03) { this.dEstado = 1; this.chapoteo(ddx, dbase); }
                if (this.dEstado === 1 && dp > 0.95) { this.dEstado = 2; this.chapoteo(ddx, dbase); }
            } else { dd.setVisible(false); this.dEstado = 0; }

            // ── Barco: sigue al dedo, vira con calma y se mueve con las olas ──
            if (this.dedo && this.fase !== 'fin') {
                var dx = this.dedo.x - B.x, dy = this.dedo.y - 46 - B.y, dis = Math.hypot(dx, dy);
                var vmax = 280, quiere = dis < 16 ? 0 : Math.min(vmax, (dis - 16) * 2.2);
                var ax2 = dis > 0 ? (dx / dis) * quiere : 0, ay2 = dis > 0 ? (dy / dis) * quiere : 0;
                this.vx += (ax2 - this.vx) * Math.min(1, dt * 3.2);
                this.vy += (ay2 - this.vy) * Math.min(1, dt * 3.2);
            } else { this.vx *= Math.pow(0.3, dt); this.vy *= Math.pow(0.3, dt); }
            if (this.fase !== 'fin') { B.x += this.vx * dt; B.y += this.vy * dt; this.limitarBarco(); }
            var acc = (this.vx - this.vxPrev) / Math.max(dt, 0.001); this.vxPrev = this.vx;
            var vel = Math.hypot(this.vx, this.vy);
            var quiereDir = this.vx > 0 ? 1 : -1;
            if (Math.abs(this.vx) > 70 && quiereDir !== dir) { this.giroT = (this.giroT || 0) + dt; if (this.giroT > 0.2) this.virar(quiereDir); } else this.giroT = 0;
            dir = this.barco.dir;
            if (!this.girando) {
                var pend = Math.cos(B.x / 90 + s * 1.6) * 3 / 90 + Math.cos(B.x / 37 - s * 2.3) * 1.4 / 37;
                var obj = -Math.max(-6, Math.min(6, acc * 0.0045)) + Math.max(-6, Math.min(6, this.vy * 0.022)) * dir - Math.atan(pend) * 57 * 0.9;
                this.angBarco += (obj - this.angBarco) * Math.min(1, dt * 6);
                this.barco.cuerpo.angle = this.angBarco;
                this.barco.cuerpo.y = this.olaY(B.x, s) * 1.6;
            }
            B.setDepth(10 + (B.y / L.H) * 10);
            this.pintarVela(6 + Math.abs(this.vx) * 0.055 + Math.sin(s * 2.1) * 2.5, s);
            // El casco se hunde en la ola: su borde inferior sigue la superficie y la espuma lo abraza (sin pieza de agua encima).
            var ag = this.barco.aguaG;
            if (ag && ag.active) {
                ag.clear();
                var ola = function (x) { return LINEA_AGUA + Math.sin(x / 16 + s * 3) * 3 + Math.sin(x / 7 - s * 5) * 1.2; };
                if (!this.arteOk) {
                    ag.fillStyle(0x7a4419, 1);
                    ag.beginPath(); ag.moveTo(-82.2, -2); ag.lineTo(86.2, -2);
                    for (var wx = 86; wx >= -82; wx -= 6) ag.lineTo(wx, ola(wx));
                    ag.closePath(); ag.fillPath();
                    ag.fillStyle(0x3d2208, 0.45);
                    ag.beginPath(); ag.moveTo(-82.2, -9); ag.lineTo(86.2, -9);
                    for (var wz = 86; wz >= -82; wz -= 6) ag.lineTo(wz, ola(wz));
                    ag.closePath(); ag.fillPath();
                }
                // Espuma: banda translúcida pegada al casco y línea blanca en la superficie.
                ag.fillStyle(0xffffff, 0.38);
                ag.beginPath(); ag.moveTo(-104, ola(-104));
                for (var fx = -104; fx <= 108; fx += 6) ag.lineTo(fx, ola(fx) - 1);
                for (var fy = 108; fy >= -104; fy -= 6) ag.lineTo(fy, ola(fy) + 7 + Math.sin(fy / 9 - s * 4) * 1.6);
                ag.closePath(); ag.fillPath();
                ag.lineStyle(3, 0xffffff, 0.92);
                ag.beginPath(); for (var lx = -104; lx <= 108; lx += 6) { var ly = ola(lx) - 1; if (lx === -104) ag.moveTo(lx, ly); else ag.lineTo(lx, ly); } ag.strokePath();
                ag.fillStyle(0xffffff, 0.55);
                ag.fillEllipse(-98 + Math.sin(s * 3) * 2, ola(-98) + 2, 22, 7);
                ag.fillEllipse(100 + Math.sin(s * 3.4) * 2, ola(100) + 2, 20, 7);
            }
            var bm = this.bandera;
            if (bm && bm.active) {
                var amp2 = 3 + vel * 0.02;
                bm.clear();
                if (!this.arteOk) {
                    bm.fillStyle(0xe03131, 1); bm.beginPath(); bm.moveTo(0, -170);
                    for (var q = 0; q <= 1.0001; q += 0.25) bm.lineTo(-q * 40, -170 + Math.sin(s * 7 - q * 4) * amp2);
                    for (var q2 = 1; q2 >= -0.0001; q2 -= 0.25) bm.lineTo(-q2 * 40, -150 + Math.sin(s * 7 - q2 * 4) * amp2);
                    bm.closePath(); bm.fillPath(); bm.fillStyle(0x6d3d16, 1); bm.fillRect(-3, -176, 6, 30);
                }
                if (P.noche > 0.3) { bm.fillStyle(0xffd43b, (0.22 + 0.06 * Math.sin(s * 5)) * P.noche); bm.fillCircle(-80, -60, 30); bm.fillStyle(0xffe066, P.noche); bm.fillRoundedRect(-85, -66, 10, 14, 3); }
            }
            // Loro: la pupila mira hacia lo que busca y parpadea.
            var lo = this.loro;
            if (lo && lo.pup && lo.pup.active) {
                var tgt = null, esp2 = this.nv && this.nv.ids && !this.completa ? this.esperado() : null;
                if (esp2) { var bb = this.cosasMar.filter(function (o) { return o.vivo && o.tipo === 'boya' && o.id === esp2; })[0]; if (bb) tgt = bb.cont; }
                if (!tgt && this.isla && this.completa) tgt = this.isla.cont;
                if (!tgt && this.dedo) tgt = this.dedo;
                var lx = tgt ? (tgt.x - B.x) * dir : 1, ly = tgt ? tgt.y - B.y : 0, ln = Math.hypot(lx, ly) || 1;
                lo.pup.x += (7 + (lx / ln) * 2.8 - lo.pup.x) * Math.min(1, dt * 10);
                lo.pup.y += (-1 + (ly / ln) * 2.4 - lo.pup.y) * Math.min(1, dt * 10);
                lo.pup.scaleY = time % 3600 < 130 ? 0.15 : 1;
            }

            // ── Estela de espuma y chorro en la proa ──
            this.tEstela = (this.tEstela || 0) - dt;
            if (vel > 45 && this.tEstela <= 0) {
                this.tEstela = 0.035;
                this.estelas.push({ x: B.x - dir * 88 * sB, y: B.y + (LINEA_AGUA + 4) * sB, vx: -dir * (6 + Math.random() * 10), vy: (Math.random() - 0.5) * 12, t: 0, life: 1.3 + Math.random() * 0.7, r: 7 + Math.random() * 6 });
                if (vel > 130) this.estelas.push({ x: B.x + dir * 96 * sB, y: B.y + (LINEA_AGUA + 2) * sB, vx: dir * (20 + Math.random() * 20), vy: -(40 + Math.random() * 50), t: 0, life: 0.6, r: 3 + Math.random() * 3, chorro: true });
            }
            if (this.estelas.length > 150) this.estelas.splice(0, this.estelas.length - 150);
            var eg = this.estelaG; eg.clear();
            this.estelas = this.estelas.filter(function (p) { return p.t < p.life; });
            this.estelas.forEach(function (p) {
                p.t += dt; var fr = p.t / p.life;
                p.x += (p.vx - corre) * dt;
                if (p.chorro) { p.vy += 260 * dt; p.y += p.vy * dt; eg.fillStyle(0xffffff, 0.8 * (1 - fr)); eg.fillCircle(p.x, p.y, p.r * (1 - fr * 0.4)); }
                else { p.y += p.vy * dt; p.r += dt * 16; eg.fillStyle(0xffffff, 0.42 * (1 - fr)); eg.fillEllipse(p.x, p.y, p.r * 2.6, p.r * 0.75); }
            });
            // Rastro del barco (las boyas atadas lo siguen).
            if (!this.rastro.length || Math.hypot(this.rastro[0].x - B.x, this.rastro[0].y - B.y - 14) > 3) this.rastro.unshift({ x: B.x, y: B.y + 14 });
            if (this.rastro.length > 260) this.rastro.length = 260;

            // ── Sombra y reflejo del barco sobre el agua; luz de los faroles de noche ──
            var rg = this.reflejoG; rg.clear();
            rg.fillStyle(0x000000, 0.15); rg.fillEllipse(B.x, B.y + 26 * sB, 230 * sB, 22 * sB);
            rg.fillStyle(0x0b2a4f, 0.2);
            rg.fillPoints(CASCO.map(function (p) { return { x: B.x + dir * sB * p.x + Math.sin(s * 3 + p.y * 0.25) * 2.2, y: B.y + sB * ((2 * LINEA_AGUA - p.y) * 0.75 + 4) }; }), true);
            rg.lineStyle(2, 0xffffff, 0.22);
            rg.strokeEllipse(B.x, B.y + 30 * sB, (170 + Math.sin(s * 2) * 12) * sB, 11 * sB);
            if (P.noche > 0.3) for (var lz = 0; lz < 3; lz++) { rg.fillStyle(0xffd43b, 0.07 * P.noche); rg.fillEllipse(B.x - dir * 80 * sB, B.y + 24 * sB, (130 + lz * 70) * sB, (22 + lz * 12) * sB); }

            // ── Cosas del mar: boyas que se mecen, monedas que giran, rocas, remolinos ──
            if (this.spawnOn && this.nv && this.nv.d && !this.completa) this.generar(time);
            this.cosasMar = this.cosasMar.filter(function (o) { return o.vivo || (o.cont && o.cont.active); });
            this.cosasMar.forEach(function (o) {
                if (!o.vivo) return;
                if (!o.quieta) o.cont.x -= corre * dt;
                if (o.tipo === 'boya' && vel > 70) {   // la ola de proa las empuja suavemente
                    var dB = dist(o.cont, B), zona = o.r + self.barco.r * 1.9;
                    if (dB < zona && dB > o.r + self.barco.r) {
                        var aB = Math.atan2(o.cont.y - B.y, o.cont.x - B.x), pushB = (1 - dB / zona) * vel * 0.5 * dt;
                        o.vx = Math.max(-70, Math.min(70, (o.vx || 0) + Math.cos(aB) * pushB * 3));
                        o.vy = Math.max(-70, Math.min(70, (o.vy || 0) + Math.sin(aB) * pushB * 3));
                        if (time - (o.rizo || 0) > 500) { o.rizo = time; self.anillo(o.cont.x, o.cont.y + 10, 0xffffff); }
                    }
                }
                if (o.vx || o.vy) { o.cont.x += o.vx * dt; o.cont.y += o.vy * dt; o.vx *= Math.pow(0.2, dt); o.vy *= Math.pow(0.2, dt); if (Math.abs(o.vx) < 2) o.vx = 0; if (Math.abs(o.vy) < 2) o.vy = 0; o.cont.y = Math.max(L.mar.y0 - 20, Math.min(L.mar.y1 + 10, o.cont.y)); }
                if (o.tipo === 'boya') {
                    var bob = self.olaY(o.cont.x, s + o.fase) * 1.4;
                    o.cont.angle = Math.sin(s * 1.8 + o.fase) * 6 + Math.atan(Math.cos(o.cont.x / 90 + s * 1.6) * 3 / 90) * 57;
                    o.cont.list[0].y = bob; o.cont.list[1].y = (o.arte ? o.dy : -self.L.tamB * 0.1) + bob;
                    var tB = self.L.tamB, ga = o.agua;
                    if (ga && ga.active && !o.arte) {
                        ga.clear(); ga.fillStyle(mezcla(P.mar[0], P.mar[2], Math.max(0, Math.min(1, (o.cont.y + tB * 0.36 - L.horiz) / alto))), 0.97); ga.fillEllipse(0, tB * 0.36, tB * 1.05, tB * 0.2 + Math.sin(s * 2 + o.fase) * 2);
                        ga.lineStyle(2, 0xffffff, 0.75); ga.beginPath();
                        for (var bx = -tB * 0.5; bx <= tB * 0.5 + 0.01; bx += tB * 0.05) { var by = tB * 0.36 - tB * 0.1 * Math.sqrt(Math.max(0, 1 - Math.pow(bx / (tB * 0.525), 2))) + Math.sin(bx * 0.2 + s * 4 + o.fase) * 1.3; if (bx === -tB * 0.5) ga.moveTo(bx, by); else ga.lineTo(bx, by); }
                        ga.strokePath();
                    }
                }
                if (o.tipo === 'moneda') o.g.scaleX = o.arte ? o.g.sx0 * (0.3 + 0.7 * Math.abs(Math.cos(s * 4 + o.fase))) : Math.cos(s * 4 + o.fase);
                if (o.tipo === 'roca' && o.arte) { o.img.y = 6 + Math.sin(s * 1.6 + o.fase) * 1.6; o.img.angle = Math.sin(s * 1.2 + o.fase) * 0.7; }
                else if (o.tipo === 'roca') { o.esp.clear(); o.esp.lineStyle(3, 0xffffff, 0.6); o.esp.strokeEllipse(0, 18, 128 + Math.sin(s * 3 + o.fase) * 8, 30); }
                if (o.tipo === 'remolino') {
                    o.g.clear();
                    for (var ring = 0; ring < 4; ring++) {
                        o.g.lineStyle(4, 0xffffff, 0.5 - ring * 0.1);
                        o.g.beginPath(); o.g.arc(0, 0, 18 + ring * 16, s * (4 - ring * 0.6) + ring, s * (4 - ring * 0.6) + ring + Math.PI * 1.2); o.g.strokePath();
                    }
                    o.g.scaleY = 0.45;
                }
                o.cont.setDepth(o.tipo === 'remolino' ? 6 : 10 + (o.cont.y / L.H) * 10);
                if (o.cont.x < -120) { self.quitar(o, false); return; }
                if (self.fase !== 'fin' && self.fase !== 'premio' && dist(o.cont, B) < o.r + self.barco.r) self.chocar(o);
            });

            // ── Cadena de boyas atadas: cuerda con comba y boyas que se balancean ──
            var cg = this.cuerdaG;
            cg.clear();
            var prev = { x: B.x - dir * this.barco.r * 1.1, y: B.y - 4 };
            for (var kk = 0; kk < this.cadena.length && !this.cadenaLibre; kk++) {
                var o2 = this.cadena[kk], pt = this.puntoAtras((kk + 1) * L.tamB * 0.95 + this.barco.r * 0.6);
                if (!o2.cont.active || !pt) continue;
                var ox = o2.cont.x;
                o2.cont.x += (pt.x - o2.cont.x) * Math.min(1, dt * 6);
                o2.cont.y += (pt.y - 10 - o2.cont.y) * Math.min(1, dt * 6) + this.olaY(o2.cont.x, s + kk) * 0.05;
                var objA = Math.max(-16, Math.min(16, (prev.x - o2.cont.x) * 0.1 - (o2.cont.x - ox) / Math.max(dt, 0.001) * 0.02)) + Math.sin(s * 2 + kk) * 4;
                o2.cont.angle += (objA - o2.cont.angle) * Math.min(1, dt * 8);
                o2.cont.setDepth(10 + (o2.cont.y / L.H) * 10);
                var pa = prev, pb = { x: o2.cont.x, y: o2.cont.y - 6 }, sag = Math.hypot(pb.x - pa.x, pb.y - pa.y) * 0.16 + Math.sin(s * 2 + kk) * 3;
                for (var pas = 0; pas < 2; pas++) {
                    cg.lineStyle(pas ? 1.5 : 4, pas ? 0xc89b60 : 0x5c3312, 1); cg.beginPath();
                    for (var ci = 0; ci <= 8; ci++) { var tt = ci / 8, cx = pa.x + (pb.x - pa.x) * tt, cy = pa.y + (pb.y - pa.y) * tt + Math.sin(tt * Math.PI) * sag - (pas ? 1 : 0); if (!ci) cg.moveTo(cx, cy); else cg.lineTo(cx, cy); }
                    cg.strokePath();
                }
                prev = pb;
            }

            // ── Anillos de sonido sobre el agua y marca del dedo ──
            var og = this.ondasG; og.clear();
            this.anillos = this.anillos.filter(function (a) { return time - a.t0 < 1500; });
            this.anillos.forEach(function (a) {
                for (var k2 = 0; k2 < 2; k2++) {
                    var fr = (time - a.t0 - k2 * 180) / 1100;
                    if (fr < 0 || fr > 1) continue;
                    og.lineStyle(4 * (1 - fr) + 1, a.col, 0.8 * (1 - fr)); og.strokeEllipse(a.x, a.y + 14, 30 + fr * 230, 12 + fr * 74);
                }
            });
            var mg = this.marcaG; mg.clear();
            if (this.dedo && this.fase !== 'fin' && this.fase !== 'intro') {
                var mx = this.dedo.x, my = this.dedo.y, dmd = Math.hypot(mx - B.x, my - 46 - B.y);
                if (dmd > 40) { var nP = Math.min(24, dmd / 22); for (var pp = 1; pp < nP; pp++) { var ft = pp / nP; mg.fillStyle(0xffffff, 0.35 * (0.6 + 0.4 * Math.sin(s * 9 - pp))); mg.fillCircle(B.x + (mx - B.x) * ft, B.y - 20 + (my - 46 - B.y + 20) * ft, 3.5); } }
                for (var rk = 0; rk < 3; rk++) { var fr2 = (s * 1.3 + rk / 3) % 1; mg.lineStyle(3.5 * (1 - fr2) + 1, 0xffffff, 0.75 * (1 - fr2)); mg.strokeEllipse(mx, my, 24 + fr2 * 56, 12 + fr2 * 28); }
                mg.fillStyle(0xffffff, 0.85); mg.fillEllipse(mx, my, 14, 7);
            }

            // ── Gaviotas que acompañan al barco (de día) ──
            var pg = this.pajarosG; pg.clear();
            if (this.aves && this.aves.length) this.animarAves(s, dt, P, B, dir, sB, L);
            else if (P.noche < 0.6) for (var gi2 = 0; gi2 < 2; gi2++) {
                var gbx = B.x - dir * 70 + Math.cos(s * 0.9 + gi2 * 3) * 70, gby = B.y - 200 * sB / 0.6 * 0.6 - 60 + Math.sin(s * 1.3 + gi2 * 2) * 20, flap = Math.sin(s * 10 + gi2 * 2) * 7;
                pg.lineStyle(3, 0xffffff, 0.95 * (1 - P.noche)); pg.beginPath(); pg.moveTo(gbx - 15, gby - flap); pg.lineTo(gbx, gby + 2); pg.lineTo(gbx + 15, gby - flap); pg.strokePath();
            }

            // ── Isla: atracar en el muelle termina el nivel ──
            if (this.isla && this.completa && this.fase === 'jugar' && !this.llegando) {
                var mu = { x: this.isla.cont.x + this.isla.muelle.dx, y: this.isla.cont.y + this.isla.muelle.dy };
                if (dist(mu, B) < this.barco.r + 60) this.llegar();
            }
            // ── Ayuda: halo sobre lo que hay que buscar ──
            var ay3 = this.ayudaG; ay3.clear();
            if (this.ayuda && this.fase === 'jugar' && this.nv && this.nv.ids && !this.completa) {
                var esp = this.esperado();
                this.cosasMar.forEach(function (o) { if (o.vivo && o.tipo === 'boya' && o.id === esp) { ay3.fillStyle(0xffe066, 0.25 + 0.15 * Math.sin(s * 6)); ay3.fillCircle(o.cont.x, o.cont.y - 10, L.tamB * 0.75); } });
            }
            if (this.completa && this.isla && this.fase === 'jugar') {
                var m2 = { x: this.isla.cont.x + this.isla.muelle.dx, y: this.isla.cont.y + this.isla.muelle.dy };
                ay3.fillStyle(0xffe066, 0.25 + 0.15 * Math.sin(s * 6)); ay3.fillCircle(m2.x, m2.y, 70);
            }
            if (this.loro && this.loro.cuerpo.active) this.loro.cuerpo.scaleY = (this.loro.sy0 || 1) * (1 + Math.sin(s * 2.4) * 0.03);

            // ── Ambiente sonoro suave: oleaje, madera que cruje y alguna gaviota ──
            if ((this.fase === 'jugar' || this.fase === 'escuchando') && !(this.ctx.enDemo && this.ctx.enDemo())) {
                if (time - this.ultOla > 3900) { this.ultOla = time; K.ruido({ f: 420, q: 0.5, dur: 1.2, vol: 0.017, tipo: 'lowpass' }); }
                if (vel > 150 && time - this.ultCrujir > 2800 + Math.random() * 1500) { this.ultCrujir = time; K.tono({ f: 150 + Math.random() * 40, f2: 105, dur: 0.35, vol: 0.011, tipo: 'sawtooth' }); }
                if (P.noche < 0.5 && time - this.ultGaviota > 13000 + Math.random() * 5000) { this.ultGaviota = time; K.tono({ f: 1900, f2: 1350, dur: 0.14, vol: 0.012 }); setTimeout(function () { K.tono({ f: 1800, f2: 1250, dur: 0.16, vol: 0.011 }); }, 220); }
            }
        },

        chapoteo: function (x, y) {
            Ut.estallido(this, x, y, { n: 9, tex: 'chispa', tam: 18, dist: 80, depth: 6, colores: [0xffffff, 0xbfe3ff], angulo: -Math.PI / 2, abanico: 1.7, gravedad: 70 });
            this.anillo(x, y - 4, 0xffffff);
            K.ruido({ f: 1200, q: 0.6, dur: 0.22, vol: 0.04 });
        }
    };

    K.crear({ id: 'capitan', fondo: '#7cc8f8', escena: escena });
})(typeof window !== 'undefined' ? window : this);
