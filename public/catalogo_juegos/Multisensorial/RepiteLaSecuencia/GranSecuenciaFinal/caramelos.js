/**
 * «La fábrica de caramelos» — motor propio de Gran Secuencia Final (3-4 años).
 *
 * Verbo de juego: DIBUJAR RAMPAS. Una máquina de chicles suelta una bola; el niño dibuja con el dedo
 * caminos de crayón (cada trazo es de verdad un tobogán con física, motor Matter) para que la bola
 * ruede y rebote sobre las teclas-caramelo de un xilófono. Cada tecla tiene su instrumento y suena al
 * golpearla. La canción final se arma si la bola toca las teclas EN ORDEN; si toca una que no sigue,
 * la melodía vuelve a empezar (la bola sigue rodando, sin castigo). Se puede borrar todo con la
 * goma o soltar otra bola tocando la máquina.
 *
 * Niveles: más teclas, rebotadores (donas) y distractores. Final: lluvia de caramelos y la
 * máquina lanzando chicles que rebotan por toda la fábrica.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var C = Phaser.Display.Color;
    var M = global.Phaser && global.Phaser.Physics && global.Phaser.Physics.Matter && global.Phaser.Physics.Matter.Matter;

    var DISP = {
        3: [[0.30, 0.45, -0.22], [0.62, 0.62, 0.2], [0.42, 0.86, -0.18]],
        4: [[0.26, 0.42, -0.2], [0.58, 0.5, 0.2], [0.82, 0.72, -0.2], [0.40, 0.84, 0.15]],
        5: [[0.24, 0.40, -0.22], [0.52, 0.46, 0.2], [0.82, 0.40, -0.18], [0.36, 0.72, 0.18], [0.72, 0.84, -0.2]],
        6: [[0.22, 0.38, -0.2], [0.46, 0.46, 0.2], [0.72, 0.38, -0.2], [0.30, 0.68, 0.2], [0.58, 0.74, -0.18], [0.84, 0.84, 0.18]]
    };
    var REBOTADORES = [[], [], [[0.50, 0.64], [0.70, 0.62]], [[0.80, 0.62], [0.20, 0.60], [0.52, 0.64]]];   // ninguno sobre la ruta de la fila de arriba: la bola sale arriba y solo baja
    var PAL = [
        { fondo: [0xffd6e7, 0xfff0f6], franja: 0xffb3d1, deco: 'piruletas', suelo: 0x7a4a2a },
        { fondo: [0xc9f2e0, 0xf0fff8], franja: 0x9be3c3, deco: 'galletas', suelo: 0x7a4a2a },
        { fondo: [0xe4d4ff, 0xf7f0ff], franja: 0xc9b0ff, deco: 'helados', suelo: 0x6a3f24 },
        { fondo: [0xffeaa7, 0xfffbe6], franja: 0xffd75e, deco: 'pasteles', suelo: 0x6a3f24 }
    ];
    var COL_TECLA = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b];

    // Dibujo del diseñador (1280x720): máquina de chicles en el fondo, suelo de caramelo desde y=575.
    var ARTE = { w: 1280, h: 720, suelo: 590, maq: [149, 150], globoR: 60 };

    function mezcla(a, b, t) {
        var c = C.Interpolate.ColorWithColor(C.ValueToColor(a), C.ValueToColor(b), 100, Math.max(0, Math.min(1, t)) * 100);
        return C.GetColor(c.r, c.g, c.b);
    }
    function hsv(h) { var c = C.HSVToRGB(((h % 1) + 1) % 1, 0.65, 1); return c.color; }

    var escena = {
        precargar: function () {
            var self = this;
            [1, 2, 3, 4].forEach(function (i) { if (!self.textures.exists('gf_fondo' + i)) self.load.svg('gf_fondo' + i, 'img/diseno/fondo' + i + '.svg?v=20261127', { width: 1280, height: 720 }); });
            if (!this.textures.exists('gf_arte')) this.load.svg('gf_arte', 'img/diseno/arte.svg', { width: 1400, height: 488 });
        },

        prepararArte: function () {
            var A = global.GranSecuenciaArte;
            var tex = this.textures.exists('gf_arte') ? this.textures.get('gf_arte') : null;
            this.arteOk = !!(A && tex && [1, 2, 3, 4].every(function (i) { return this.textures.exists('gf_fondo' + i); }, this));
            if (!this.arteOk || tex.__gfMarcos) return;
            Object.keys(A.frames).forEach(function (n) { var m = A.frames[n]; tex.add(n, 0, m.x, m.y, m.w, m.h); });
            tex.__gfMarcos = true;
        },

        /** Imagen de un marco de la hoja, a un ancho dado en pantalla. */
        pieza: function (nom, x, y, ancho) {
            var m = global.GranSecuenciaArte.frames[nom];
            var im = this.add.image(x, y, 'gf_arte', nom);
            im.setDisplaySize(ancho, ancho * m.bh / m.bw);
            return im;
        },

        iniciar: function () {
            this.motor = null; this.estaticosF = [];
            this.teclas = []; this.rebotadores = [];
            this.trazos = []; this.trazoActual = null; this.nSeg = 0;
            this.bola = null;
            this.prog = 0; this.song = [];
            this.reunidos = [];
            this.pal = 0;
            this.confites = [];
            this.ultimoReclamo = -99999;
            this.fiesta = false;
            this.sinMovimiento = 0;
            this.crank = 0;
            this.ultSuelta = 0;
            this.chispas = [];
        },

        filtrarPool: function (pool) {
            var ok = K.ANIMALES.concat(['campana', 'tambor', 'maracas', 'trompeta', 'carro', 'tren', 'reloj', 'pelota']);
            var f = pool.filter(function (id) { return ok.indexOf(id) >= 0; });
            return f.length >= 6 ? f : pool;
        },

        calcular: function () {
            var W = this.scale.width, H = this.scale.height;
            var L = { W: W, H: H };
            L.pres = W >= 900 ? { x: W - 88, piso: H - 70, alto: Math.min(165, H * 0.28), giro: 0.35 } : null;
            L.der = L.pres ? W - 168 : W - 16;
            L.k = Math.max(0.72, Math.min(1.15, H / 768));
            L.suelo = Math.round(H * (this.arteOk ? ARTE.suelo / ARTE.h : 0.9));
            L.zona = { x0: Math.round(W * 0.2), x1: L.der - 24, y0: Math.round(H * 0.2), y1: L.suelo - 30 };
            L.maq = { x: Math.round(W * 0.095), y: Math.round(H * 0.34) };
            L.salida = { x: Math.round(W * 0.195), y: Math.round(H * 0.3) };
            if (this.arteOk) {
                L.maq = { x: Math.round(W * ARTE.maq[0] / ARTE.w), y: Math.round(H * ARTE.maq[1] / ARTE.h) };
                L.salida = { x: Math.round(W * 145 / ARTE.w), y: Math.round(H * 203 / ARTE.h) };   // la bola sale por la ranura gris de la base (149, 203 del dibujo, ya subida); no hay tubo aparte
            }
            L.dibujoX0 = this.arteOk ? 24 : L.zona.x0;   // con el arte se puede dibujar desde junto a la máquina
            L.goma = { x: 58, y: H - 62, r: 38 };
            L.bocina = { x: 48, y: Math.round(H * 0.17), r: 30 };
            return L;
        },

        armar: function (reubicar) {
            this.prepararArte();
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            this.fondoImg = null; this.nubesImg = null; this.fondoNuevo = null; this.fondoClave = 'gf_fondo' + (this.pal + 1);
            if (this.arteOk) {
                this.fondoImg = keep(this.add.image(0, 0, 'gf_fondo' + (this.pal + 1)).setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(0.5));
                this.nubesImg = [0, 1, 2, 0].map(function (q, i) {
                    var im = keep(this.pieza('n' + (q + 1), 0, 0, Math.round(L.W * (0.13 + 0.02 * (i % 2)))).setDepth(3).setAlpha(0.88));
                    im.vel = 8 + i * 3; im.fase = i * 360; im.fy = 0.1 + i * 0.07;
                    return im;
                }, this);
            }
            this.fondoG = keep(this.add.graphics().setDepth(1));
            this.dinG = keep(this.add.graphics().setDepth(2));
            this.trazoG = keep(this.add.graphics().setDepth(20));
            this.luzG = keep(this.add.graphics().setDepth(40));
            this.pintarFondo();
            this.montarHud(keep);
            this.sembrarMotes(keep, 10, { x: 0, y: 60, w: L.W, h: L.suelo - 80, depth: 6 }, 0xffffff);
            this.armarMaquina(keep);
            this.montarFisica();
            if (reubicar && this.nv && this.nv.tipo) this.colocarNivel(this.nv);
        },

        /* ── Fábrica: papel pintado de rayas, estantes con dulces, suelo de chocolate ── */

        pintarFondo: function () {
            var L = this.L, g = this.fondoG, P = PAL[this.pal];
            g.clear();
            if (this.arteOk) {
                // Fondo del diseño: se mezcla suavemente al cambiar de nivel.
                var clave = 'gf_fondo' + (this.pal + 1), fi = this.fondoImg, self = this;
                if (fi && fi.active && this.fondoClave !== clave) {
                    this.fondoClave = clave;
                    if (this.fondoNuevo && this.fondoNuevo.active) { fi.setTexture(this.fondoNuevo.texture.key); this.tweens.killTweensOf(this.fondoNuevo); this.fondoNuevo.destroy(); }
                    var nuevo = this.fondoNuevo = this.add.image(0, 0, clave).setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(0.55).setAlpha(0);
                    this.tweens.add({ targets: nuevo, alpha: 1, duration: 700, onComplete: function () { if (fi.active) fi.setTexture(clave); if (nuevo.active) nuevo.destroy(); if (self.fondoNuevo === nuevo) self.fondoNuevo = null; } });
                }
                return;
            }
            for (var b = 0; b < 16; b++) { g.fillStyle(mezcla(P.fondo[0], P.fondo[1], b / 15), 1); g.fillRect(0, (L.suelo / 16) * b, L.W, L.suelo / 16 + 1); }
            g.fillStyle(P.franja, 0.35);
            for (var x = 0; x < L.W; x += 120) g.fillRect(x, 0, 60, L.suelo);
            g.fillStyle(0xffffff, 0.5);
            for (var y = 30; y < L.suelo; y += 90) for (var xx = 30; xx < L.W; xx += 120) g.fillCircle(xx + (y % 180 ? 60 : 0), y, 6);
            // Suelo de tableta de chocolate con virutas de colores.
            g.fillStyle(0x000000, 0.2); g.fillRect(0, L.suelo - 4, L.W, 8);
            g.fillStyle(P.suelo, 1); g.fillRect(0, L.suelo, L.W, L.H - L.suelo);
            g.fillStyle(0x8f5a34, 1); for (var cx = 0; cx < L.W; cx += 90) g.fillRoundedRect(cx + 4, L.suelo + 8, 82, L.H - L.suelo - 16, 8);
            g.fillStyle(0xffffff, 0.14); for (var cy = 0; cy < L.W; cy += 90) g.fillRect(cy + 8, L.suelo + 10, 74, 6);
            var cols = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xcc5de8];
            for (var v = 0; v < 60; v++) { g.fillStyle(cols[v % 5], 0.9); g.fillRoundedRect((v * 83) % L.W, L.suelo + 4 + (v * 37) % 40, 10, 4, 2); }
            // Decoración a ambos lados según el nivel.
            this.decorar(g, P.deco);
        },

        decorar: function (g, tipo) {
            var L = this.L;
            [L.W * 0.03, L.der - 20].forEach(function (cx, i) {
                var base = L.suelo;
                if (tipo === 'piruletas') {
                    g.fillStyle(0xf8f9fa, 1); g.fillRect(cx - 4, base - 190, 8, 190);
                    g.fillStyle(0xff6b6b, 1); g.fillCircle(cx, base - 220, 44); g.fillStyle(0xffffff, 1); g.fillCircle(cx, base - 220, 30); g.fillStyle(0x4dabf7, 1); g.fillCircle(cx, base - 220, 16);
                } else if (tipo === 'galletas') {
                    g.fillStyle(0xd9a05b, 1); g.fillCircle(cx, base - 80, 70); g.fillStyle(0x6b3f1d, 1); [[-20, -90], [18, -70], [-4, -50], [26, -100], [-34, -60]].forEach(function (p) { g.fillCircle(cx + p[0], base + p[1], 7); });
                } else if (tipo === 'helados') {
                    g.fillStyle(0xe9b872, 1); g.fillTriangle(cx - 40, base - 120, cx + 40, base - 120, cx, base); g.fillStyle(0xf783ac, 1); g.fillCircle(cx, base - 140, 46); g.fillStyle(0xffffff, 1); g.fillCircle(cx - 20, base - 170, 26); g.fillStyle(0xff6b6b, 1); g.fillCircle(cx, base - 192, 8);
                } else {
                    g.fillStyle(0xfff3bf, 1); g.fillRoundedRect(cx - 70, base - 90, 140, 90, 10); g.fillStyle(0xf783ac, 1); g.fillRoundedRect(cx - 62, base - 150, 124, 62, 12); g.fillStyle(0xffffff, 1); g.fillRoundedRect(cx - 50, base - 190, 100, 44, 12); g.fillStyle(0xe03131, 1); g.fillCircle(cx, base - 204, 12);
                }
            });
        },

        /* ── Máquina de chicles ── */

        armarMaquina: function (keep) {
            var L = this.L;
            if (this.arteOk) {
                // La máquina ya viene dibujada en el fondo: solo queda la zona de toque y el brillo.
                var ca = keep(this.add.container(L.maq.x, L.maq.y).setDepth(8));
                var ra = Math.round(L.H * 80 / ARTE.h);
                this.maquina = { cont: ca, r: ra, bolas: this.add.container(0, 0), mani: this.add.graphics() };
                ca.add([this.maquina.bolas, this.maquina.mani]);
                this.boca = null; this.bocaLar = 0;
                return;
            }
            var c = keep(this.add.container(L.maq.x, L.maq.y).setDepth(8));
            var g = this.add.graphics();
            var r = Math.round(L.k * 62);
            g.fillStyle(0x000000, 0.2); g.fillEllipse(0, r * 2.05, r * 2, r * 0.4);
            g.fillStyle(0xd62839, 1); g.fillRoundedRect(-r * 0.75, r * 0.9, r * 1.5, r * 1.1, 12);
            g.fillStyle(0xff6b6b, 1); g.fillRoundedRect(-r * 0.75, r * 0.9, r * 1.5, r * 0.25, 10);
            g.fillStyle(0x212529, 1); g.fillRoundedRect(-r * 0.3, r * 1.45, r * 0.6, r * 0.35, 6);
            g.fillStyle(0xffffff, 0.3); g.fillCircle(0, 0, r * 1.1);
            g.lineStyle(5, 0xffffff, 0.8); g.strokeCircle(0, 0, r * 1.1);
            g.fillStyle(0xd62839, 1); g.fillRoundedRect(-r * 0.95, -r * 1.3, r * 1.9, r * 0.38, 10);
            g.fillStyle(0xffffff, 0.35); g.fillEllipse(-r * 0.4, -r * 0.4, r * 0.4, r * 0.8);
            c.add(g);
            var cols = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xcc5de8, 0xff922b];
            var bolas = this.add.graphics();
            for (var i = 0; i < 14; i++) { var a = i * 2.4, rr = r * 0.78 * Math.sqrt((i + 1) / 14); bolas.fillStyle(cols[i % 6], 1); bolas.fillCircle(Math.cos(a) * rr, Math.sin(a) * rr * 0.9 + r * 0.1, 11 * L.k); bolas.fillStyle(0xffffff, 0.5); bolas.fillCircle(Math.cos(a) * rr - 3, Math.sin(a) * rr * 0.9 + r * 0.1 - 3, 3); }
            c.add(bolas);
            var mani = this.add.graphics(); mani.setPosition(0, r * 1.2);
            c.add(mani);
            this.maquina = { cont: c, r: r, bolas: bolas, mani: mani };
        },

        /* ── Física ── */

        montarFisica: function () {
            var L = this.L, self = this;
            if (!M) return;
            if (!this.motor) {
                this.motor = M.Engine.create({ gravity: { x: 0, y: 1.1 }, positionIterations: 8, velocityIterations: 6 });
                M.Events.on(this.motor, 'collisionStart', function (ev) { self.alChoque(ev); });
            }
            var mundo = this.motor.world;
            this.estaticosF.forEach(function (b) { M.Composite.remove(mundo, b); });
            this.estaticosF = [];
            var add = function (x, y, w, h, o) { var b = M.Bodies.rectangle(x, y, w, h, Object.assign({ isStatic: true, friction: 0.4, restitution: 0.35 }, o || {})); self.estaticosF.push(b); return b; };
            add(L.W / 2, L.suelo + 40, L.W * 3, 80);
            add(this.arteOk ? -20 : L.zona.x0 - 40, L.H / 2, 40, L.H * 2);   // con el arte la bola nace en la ranura, a la izquierda de la zona de juego
            add(L.zona.x1 + 40, L.H / 2, 40, L.H * 2);
            M.Composite.add(mundo, this.estaticosF);
        },

        /** Crea las teclas (xilófono de caramelo) y los rebotadores del nivel en sus lugares. */
        colocarNivel: function (nv) {
            var L = this.L, self = this, Z = L.zona, mundo = this.motor.world;
            this.teclas.forEach(function (t) { M.Composite.remove(mundo, t.body); if (t.cont.active) t.cont.destroy(); });
            this.rebotadores.forEach(function (t) { M.Composite.remove(mundo, t.body); if (t.cont.active) t.cont.destroy(); });
            this.teclas = []; this.rebotadores = [];
            var n = nv.opciones.length;
            var disp = DISP[Math.max(3, Math.min(6, n))].slice(0, n);
            var ids = nv.opciones.slice();
            ids.forEach(function (id, i) {
                var d = disp[i], x = Z.x0 + (Z.x1 - Z.x0) * d[0], y = Z.y0 + (Z.y1 - Z.y0) * d[1];
                var w = Math.round(132 * L.k), h = Math.round(30 * L.k);
                var cuerpo = M.Bodies.rectangle(x, y, w, h, { isStatic: true, angle: d[2], friction: 0.3, restitution: 0.55, chamfer: { radius: 8 } });
                M.Composite.add(mundo, cuerpo);
                var c = self.add.container(x, y).setDepth(14);
                var g = self.add.graphics();
                var col = COL_TECLA[i % 6];
                if (self.arteOk) {
                    g.fillStyle(0x000000, 0.16); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 12);
                    c.add(g);
                    c.add(self.pieza('b' + ((i % 6) + 1), 0, 1, w * 1.06));
                } else {
                g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 10);
                g.fillStyle(col, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
                g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, 8, 4);
                g.lineStyle(3, 0x000000, 0.2); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
                g.fillStyle(0xffffff, 0.5); for (var s = -w / 2 + 14; s < w / 2 - 10; s += 22) g.fillRect(s, h / 2 - 7, 10, 4);
                c.add(g);
                }
                var halo = self.add.graphics(); c.add(halo);
                var disco = self.add.container(0, -h / 2 - 28);
                var dg = self.add.graphics();
                dg.fillStyle(0x000000, 0.18); dg.fillCircle(2, 3, 30 * L.k);
                dg.fillStyle(0xffffff, 1); dg.fillCircle(0, 0, 30 * L.k);
                dg.lineStyle(4, col, 1); dg.strokeCircle(0, 0, 30 * L.k);
                var im = self.add.image(0, 0, 'el_' + id); im.setScale((40 * L.k) / Math.max(im.width, im.height));
                disco.add([dg, im]);
                c.add(disco);
                c.rotation = d[2];
                var t = { id: id, body: cuerpo, cont: c, halo: halo, disco: disco, w: w, h: h, col: col, estado: null, ultimo: 0 };
                cuerpo.plugin = { tecla: t };
                self.teclas.push(t);
            });
            (REBOTADORES[this.nivelActual] || []).forEach(function (d) {
                var x = Z.x0 + (Z.x1 - Z.x0) * d[0], y = Z.y0 + (Z.y1 - Z.y0) * d[1], r = Math.round(34 * L.k);
                var cuerpo = M.Bodies.circle(x, y, r, { isStatic: true, restitution: 1.25, friction: 0 });
                M.Composite.add(mundo, cuerpo);
                var c = self.add.container(x, y).setDepth(13);
                var g = self.add.graphics();
                g.fillStyle(0x000000, 0.18); g.fillCircle(3, 5, r);
                if (self.arteOk) {
                    c.add(g);
                    c.add(self.pieza('dona', 0, 0, r * 2.1));
                } else {
                g.fillStyle(0xf783ac, 1); g.fillCircle(0, 0, r);
                g.fillStyle(0xffffff, 1); g.fillCircle(0, 0, r * 0.38);
                g.lineStyle(5, 0xc2255c, 0.6); g.strokeCircle(0, 0, r * 0.72);
                g.fillStyle(0xffffff, 0.85); [[-0.5, -0.4], [0.45, -0.5], [0.1, 0.62], [-0.55, 0.3]].forEach(function (p) { g.fillRoundedRect(p[0] * r - 4, p[1] * r - 2, 9, 4, 2); });
                c.add(g);
                }
                self.rebotadores.push({ cuerpo: cuerpo, cont: c, r: r, body: cuerpo });
            });
        },

        crearBola: function () {
            var L = this.L;
            if (this.bola) this.quitarBola();
            var r = Math.round(20 * L.k);
            var x = L.salida.x + 4, y = L.salida.y;
            var cuerpo = M.Bodies.circle(x, y, r, { restitution: 0.6, friction: 0.04, frictionAir: 0.002, density: 0.0022 });
            M.Composite.add(this.motor.world, cuerpo);
            cuerpo.plugin = { bola: true };
            M.Body.setVelocity(cuerpo, this.arteOk ? { x: 2.4 + Math.random() * 0.8, y: -1.5 } : { x: 0.9 + Math.random() * 0.8, y: 0 });
            var c = this.add.container(x, y).setDepth(30);
            var g = this.add.graphics();
            var col = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8][(Math.random() * 5) | 0];
            if (this.arteOk) {
                var pq = 1 + ((Math.random() * 6) | 0);
                c.add(g);
                c.add(this.pieza('p' + pq, 0, 0, r * 2.15));
                col = [0xff922b, 0xcc5de8, 0xff6b6b, 0x69db7c, 0x4dabf7, 0xf06595][pq - 1];
            } else {
            g.fillStyle(col, 1); g.fillCircle(0, 0, r);
            g.fillStyle(0xffffff, 0.75); g.fillCircle(-r * 0.35, -r * 0.35, r * 0.3);
            g.lineStyle(2, 0x000000, 0.18); g.strokeCircle(0, 0, r);
            c.add(g);
            }
            this.bola = { body: cuerpo, cont: c, r: r, col: col, estela: [] };
            c.setScale(0.2); this.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.easeOut' });
            this.crank = 1;
            K.tono({ f: 420, f2: 760, dur: 0.14, vol: 0.05 });
            this.sinMovimiento = 0;
        },

        quitarBola: function () {
            if (!this.bola) return;
            M.Composite.remove(this.motor.world, this.bola.body);
            if (this.bola.cont.active) this.bola.cont.destroy();
            this.bola = null;
        },

        /* ── Trazos de crayón: cada segmento es un cuerpo estático (un tobogán de verdad) ── */

        iniciarTrazo: function (p) {
            this.trazoActual = { pts: [{ x: p.x, y: p.y }], bodies: [], t0: this.time.now };
            this.trazos.push(this.trazoActual);
        },

        agregarPunto: function (p) {
            var t = this.trazoActual;
            if (!t) return;
            var u = t.pts[t.pts.length - 1];
            var d = Math.hypot(p.x - u.x, p.y - u.y);
            if (d < 14) return;
            var Z = this.L.zona;
            var q = { x: Math.max(this.L.dibujoX0 + 6, Math.min(Z.x1 - 6, p.x)), y: Math.max(40, Math.min(this.L.suelo - 6, p.y)) };
            var ang = Math.atan2(q.y - u.y, q.x - u.x), len = Math.hypot(q.x - u.x, q.y - u.y);
            var b = M.Bodies.rectangle((q.x + u.x) / 2, (q.y + u.y) / 2, len + 6, 12, { isStatic: true, angle: ang, friction: 0.15, restitution: 0.3 });
            M.Composite.add(this.motor.world, b);
            t.bodies.push(b); t.pts.push(q);
            this.nSeg += 1;
            // Límite de tinta: se borran los trazos más viejos.
            while (this.nSeg > 150 && this.trazos.length > 1) this.borrarTrazo(this.trazos[0]);
            if (time_ok(this)) K.tono({ f: 500 + Math.min(500, this.nSeg * 6), dur: 0.03, vol: 0.012 });
        },

        borrarTrazo: function (t) {
            var self = this;
            t.bodies.forEach(function (b) { M.Composite.remove(self.motor.world, b); });
            this.nSeg -= t.bodies.length;
            this.trazos = this.trazos.filter(function (q) { return q !== t; });
        },

        borrarTodo: function () {
            var self = this;
            this.trazos.slice().forEach(function (t) { self.borrarTrazo(t); });
            this.trazos = []; this.nSeg = 0; this.trazoActual = null;
            K.ruido({ f: 900, q: 0.5, dur: 0.18, vol: 0.06 });
            Ut.estallido(this, this.L.goma.x, this.L.goma.y, { n: 8, tex: 'chispa', tam: 18, dist: 70, depth: 70, colores: [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7] });
        },

        /* ── Entrada ── */

        alTocar: function (p) {
            if (this.fase !== 'jugar' && this.fase !== 'demo') return;
            var L = this.L;
            if (Math.hypot(p.x - L.goma.x, p.y - L.goma.y) < L.goma.r) { this.borrarTodo(); return; }
            if (Math.hypot(p.x - L.maq.x, p.y - L.maq.y) < this.maquina.r * 1.3) { this.crearBola(); return; }
            if (p.x < L.dibujoX0 || p.y > L.suelo) return;
            this.pista.reiniciar();
            this.iniciarTrazo(p);
        },
        alMover: function (p) { if (this.trazoActual && p.isDown) this.agregarPunto(p); },
        alSoltar: function () { this.trazoActual = null; },

        ocupadoPorJuego: function () { return !!this.trazoActual; },

        /* ── Choques: la bola golpea una tecla ── */

        alChoque: function (ev) {
            var self = this, now = this.time.now;
            ev.pairs.forEach(function (p) {
                var bola = p.bodyA.plugin && p.bodyA.plugin.bola ? p.bodyA : (p.bodyB.plugin && p.bodyB.plugin.bola ? p.bodyB : null);
                if (!bola) return;
                var otro = bola === p.bodyA ? p.bodyB : p.bodyA;
                var t = otro.plugin && otro.plugin.tecla;
                var v = Math.hypot(bola.velocity.x, bola.velocity.y);
                if (t && v > 1.1 && now - t.ultimo > 380) { t.ultimo = now; self.tocarTecla(t); }
                else if (!t && v > 2.2 && self.rebotadores.some(function (r) { return r.body === otro; })) {
                    var rb = self.rebotadores.filter(function (r) { return r.body === otro; })[0];
                    self.tweens.add({ targets: rb.cont, scale: 1.25, duration: 100, yoyo: true });
                    K.tono({ f: 700 + Math.random() * 200, f2: 1000, dur: 0.09, vol: 0.04 });
                    Ut.estallido(self, rb.cont.x, rb.cont.y, { n: 4, tex: 'chispa', tam: 14, dist: 60, depth: 60, colores: [0xf783ac, 0xffffff] });
                }
            });
        },

        tocarTecla: function (t) {
            var self = this;
            this.sonar(t.id, { breve: true, bocina: false });
            this.tweens.add({ targets: t.cont, scaleY: 0.82, scaleX: 1.05, duration: 90, yoyo: true });
            this.tweens.add({ targets: t.disco, y: t.disco.y - 12, duration: 120, yoyo: true });
            Ut.estallido(this, t.body.position.x, t.body.position.y - 20, { n: 4, tex: 'nota', tam: 22, dist: 80, depth: 70 });
            if (this.fase !== 'jugar' || this.completa) return;
            var esp = this.song[this.prog], anterior = this.prog > 0 ? this.song[this.prog - 1] : null;
            if (t.id === esp) {
                this.prog += 1;
                this.pintarTecla(t, 'ok');
                this.pista.reiniciar();
                K.tono({ f: 660 + this.prog * 110, f2: 990 + this.prog * 110, dur: 0.2, vol: 0.05 });
                Ut.estallido(this, t.body.position.x, t.body.position.y, { n: 10, tex: 'estrella', tam: 24, dist: 110, depth: 71, sinTinte: true });
                if (this.prog >= this.song.length) this.llegar();
            } else if (t.id !== anterior || this.prog === 0) {
                if (this.prog > 0 || t.estado !== 'mal') {
                    // Una tecla que no sigue la canción: la melodía vuelve a empezar (sin castigo).
                    this.prog = 0;
                    this.teclas.forEach(function (q) { self.pintarTecla(q, null); });
                    this.pintarTecla(t, 'mal');
                    this.tweens.add({ targets: t.cont, angle: { from: t.cont.angle - 5, to: t.cont.angle + 5 }, duration: 70, yoyo: true, repeat: 3 });
                    this.errores += 1; this.erroresNivel += 1;
                    if (this.erroresNivel >= 5) this.ayuda = true;
                    if (this.time.now - this.ultimoReclamo > 7000) {
                        this.ultimoReclamo = this.time.now;
                        this.reaccion('Decir_no', 1400);
                        this.ctx.decir({ voz: 'zeus', texto: '¡Esa tecla no sigue la canción! Empieza otra vez.' }, { minMs: 800 });
                    }
                }
            }
        },

        pintarTecla: function (t, estado) {
            t.estado = estado;
            var g = t.halo; g.clear();
            if (!estado) return;
            var col = estado === 'ok' ? 0xffd43b : 0xff6b6b;
            g.lineStyle(6, col, 1); g.strokeRoundedRect(-t.w / 2 - 4, -t.h / 2 - 4, t.w + 8, t.h + 8, 12);
            g.lineStyle(14, col, 0.25); g.strokeRoundedRect(-t.w / 2 - 8, -t.h / 2 - 8, t.w + 16, t.h + 16, 16);
        },

        llegar: async function () {
            if (this.llegando) return;
            this.llegando = true;
            this.completa = true;
            this.fase = 'premio';
            this.marcadas = this.song.slice();
            var Z = this.L.zona;
            await this.acertar(this.song.slice(), { x: (Z.x0 + Z.x1) / 2, y: Z.y0 + 80 });
            this.llegando = false;
        },

        alAcertar: async function () {
            var self = this;
            for (var k = 0; k < this.song.length; k++) {
                if (!this.sigue()) return;
                var t = this.teclas.filter(function (q) { return q.id === self.song[k]; })[0];
                if (t) {
                    this.reunidos.push(t.id);
                    this.tweens.add({ targets: t.cont, scaleY: 0.8, scaleX: 1.06, duration: 120, yoyo: true });
                    Ut.estallido(this, t.body.position.x, t.body.position.y, { n: 10, tex: 'estrella', tam: 24, dist: 120, depth: 71, sinTinte: true });
                }
                await this.sonar(this.song[k], { breve: true, bocina: false });
            }
            Ut.confeti(this, 70);
            await esperar(this, 700);
        },

        /* ── Niveles ── */

        alSonar: function (id, k) {
            this.crank = 1;
            var t = this.teclas.filter(function (q) { return q.id === id; })[0];
            if (t) { this.tweens.add({ targets: t.cont, scaleY: 0.86, duration: 100, yoyo: true }); t.destello = this.time.now; }
            this.bombillasEsc = k + 1;
        },

        alReescuchar: function (empieza) { if (empieza) this.bombillasEsc = 0; },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Dibuja rampas para que la bola toque las teclas en el orden de la canción!' }, { minMs: 900 });
        },

        prepararNivel: async function (i, nv) {
            this.nv = nv;
            this.pal = Math.max(0, Math.min(3, i < 0 ? 0 : this.nivelActual));
            this.pintarFondo();
            this.quitarBola();
            this.borrarTodo();
            this.prog = 0; this.completa = false; this.llegando = false; this.erroresNivel = 0;
            this.song = nv.correctas.slice();
            this.bombillasEsc = 0;
            this.colocarNivel(nv);
            this.teclas.forEach(function (t, k) { t.cont.setAlpha(0); });
            var self = this;
            this.teclas.forEach(function (t, k) { self.tweens.add({ targets: t.cont, alpha: 1, duration: 300, delay: k * 90 }); });
            await esperar(this, 700);
        },

        mostrarOpciones: async function () {
            this.crearBola();
            await esperar(this, 400);
        },

        alTerminarNivel: async function () {
            var self = this;
            this.quitarBola();
            this.teclas.forEach(function (t) { if (t.cont.active) tw(self, { targets: t.cont, alpha: 0, duration: 350 }); });
            this.rebotadores.forEach(function (t) { if (t.cont.active) tw(self, { targets: t.cont, alpha: 0, duration: 350 }); });
            await esperar(this, 450);
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.trazoActual) return Promise.resolve();
            var sig = this.song[this.prog];
            var t = this.teclas.filter(function (q) { return q.id === sig; })[0];
            if (!this.ayuda || !t || !this.bola) { this.pulsoBombilla(); return esperar(this, 800); }
            var b = this.bola.body.position;
            return this.ctx.mano({ punto: { x: Math.max(this.L.zona.x0 + 30, b.x), y: Math.max(120, b.y + 40) }, holdMs: 250, arrastre: { dx: t.body.position.x - 90 - b.x, dy: t.body.position.y - 70 - b.y, durMs: 1100 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        pulsoBombilla: function () { this.pulso = this.time.now; },

        demoPaso: function () {
            var self = this;
            return this.nv.correctas.map(function (id, k) {
                return function () {
                    var t = self.teclas.filter(function (q) { return q.id === id; })[0];
                    if (!t) return null;
                    var x = t.body.position.x, y = t.body.position.y;
                    var ini = { x: x - 80, y: y - 110 }, fin = { x: x - 80 + 72, y: y - 110 + 56 };
                    // La mano recorre exactamente la rampa y el trazo se dibuja a la vez, punto a punto.
                    self.borrarTodo();
                    self.time.delayedCall(300, function () { self.iniciarTrazo(ini); });
                    for (var q = 1; q <= 4; q++) (function (q) {
                        self.time.delayedCall(300 + q * 225, function () {
                            self.agregarPunto({ x: ini.x + q * 18, y: ini.y + q * 14 });
                            if (q === 4) self.trazoActual = null;
                        });
                    })(q);
                    return {
                        desde: ini, hasta: fin,
                        hacer: async function () {
                            self.fase = 'jugar';
                            self.trazoActual = null;
                            self.crearBola();
                            M.Body.setPosition(self.bola.body, { x: x - 74, y: y - 135 });
                            M.Body.setVelocity(self.bola.body, { x: 0, y: 0 });
                            for (var w = 0; w < 30 && self.prog <= k && !self.completa; w++) await esperar(self, 100);
                            await esperar(self, 600);
                        }
                    };
                };
            });
        },

        /* ── Final: lluvia de caramelos ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.fiesta = true;
            this.quitarBola();
            this.borrarTodo();
            this.pal = 3; this.pintarFondo();
            var ids = this.reunidos.filter(function (id, i, a) { return a.indexOf(id) === i; });
            if (!ids.length) ids = ['tambor', 'campana', 'maracas'];
            // La máquina lanza chicles que rebotan por toda la fábrica (física de verdad).
            var bolas = [];
            var cols = [0xff6b6b, 0xffd43b, 0x69db7c, 0x4dabf7, 0xcc5de8, 0xff922b];
            for (var n = 0; n < 38; n++) {
                if (!this.sigue()) return;
                var r = Math.round((12 + Math.random() * 14) * L.k);
                var x = L.salida.x + Math.random() * 40, y = L.salida.y;
                var cuerpo = M.Bodies.circle(x, y, r, { restitution: 0.72, friction: 0.05, density: 0.002 });
                M.Body.setVelocity(cuerpo, { x: 3 + Math.random() * 5, y: -2 - Math.random() * 3 });
                M.Composite.add(this.motor.world, cuerpo);
                var c = this.add.container(x, y).setDepth(31);
                var g = this.add.graphics(); var col = cols[n % 6];
                g.fillStyle(col, 1); g.fillCircle(0, 0, r); g.fillStyle(0xffffff, 0.7); g.fillCircle(-r * 0.35, -r * 0.35, r * 0.28);
                c.add(g);
                bolas.push({ body: cuerpo, cont: c });
                this.crank = 1;
                if (n % 3 === 0) { var t = this.teclas.length ? null : null; K.tono({ f: 500 + (n % 7) * 90, dur: 0.07, vol: 0.04 }); }
                if (n % 6 === 0) this.sonar(ids[(n / 6 | 0) % ids.length], { breve: true, bocina: false });
                if (n % 8 === 0) Ut.confeti(this, 20);
                await esperar(this, 120);
            }
            this.bolasFinal = bolas;
            // Fuegos artificiales de sprinkles mientras suena la canción.
            for (var k = 0; k < 6; k++) {
                if (!this.sigue()) return;
                this.fuego(L.W * (0.25 + 0.5 * Math.random()), L.H * (0.12 + 0.22 * Math.random()), k);
                await this.sonar(ids[k % ids.length], { breve: true, bocina: false });
            }
            Ut.confeti(this, 100);
            await esperar(this, 1600);
            bolas.forEach(function (b) { M.Composite.remove(self.motor.world, b.body); if (b.cont.active) b.cont.destroy(); });
            this.bolasFinal = [];
        },

        fuego: function (x, y, k) {
            var cols = [0xff6b6b, 0xfab005, 0x69db7c, 0x4dabf7, 0xcc5de8];
            K.ruido({ f: 2400, q: 0.6, dur: 0.3, vol: 0.08 });
            Ut.estallido(this, x, y, { n: 22, tex: 'chispa', tam: 22, dist: 140, depth: 52, colores: [cols[k % 5], 0xffffff, cols[(k + 2) % 5]], ms: 1100, gravedad: 50 });
        },

        estadoExtra: function () {
            var b = this.bola && this.bola.body;
            return {
                song: this.song, prog: this.prog, completa: !!this.completa, nSeg: this.nSeg,
                bola: b && { x: Math.round(b.position.x), y: Math.round(b.position.y), v: +Math.hypot(b.velocity.x, b.velocity.y).toFixed(2) },
                teclas: this.teclas.map(function (t) { return { id: t.id, x: Math.round(t.body.position.x), y: Math.round(t.body.position.y), estado: t.estado }; }),
                salida: this.L.salida, zona: this.L.zona
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!L || !this.motor || !this.dinG || !this.dinG.active) return;
            M.Engine.update(this.motor, 1000 / 120);
            M.Engine.update(this.motor, 1000 / 120);
            // Bola: sigue su cuerpo; se repone si sale de la fábrica o se queda quieta.
            var B = this.bola;
            if (B) {
                var p = B.body.position;
                B.cont.setPosition(p.x, p.y); B.cont.rotation = B.body.angle;
                B.estela.unshift({ x: p.x, y: p.y }); if (B.estela.length > 14) B.estela.length = 14;
                var v = Math.hypot(B.body.velocity.x, B.body.velocity.y);
                this.sinMovimiento = v < 0.12 ? this.sinMovimiento + dt : 0;
                if (this.sinMovimiento > 0.7 && p.y < L.suelo - 60 && this.fase === 'jugar') { M.Body.setVelocity(B.body, { x: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random()), y: -1.2 }); this.sinMovimiento = 0.3; }
                if (p.y > L.H + 60 || p.x < -40 || p.x > L.W + 40 || this.sinMovimiento > 3.5) { if (this.fase === 'jugar' || this.fase === 'demo') this.crearBola(); }
            }
            this.bolasFinal && this.bolasFinal.forEach(function (b) { b.cont.setPosition(b.body.position.x, b.body.position.y); b.cont.rotation = b.body.angle; });
            this.teclas.forEach(function (t) { t.cont.setPosition(t.body.position.x, t.body.position.y); if (t.estado) t.halo.setAlpha(0.7 + 0.3 * Math.sin(s * 6 + t.body.id)); });
            this.rebotadores.forEach(function (r) { r.cont.rotation = Math.sin(s * 1.2 + r.body.id) * 0.12; });

            // ── Dibujo dinámico: nubes de algodón, trazos de crayón, estela de la bola, bombillas de progreso ──
            var g = this.dinG; g.clear();
            if (this.arteOk) {
                (this.nubesImg || []).forEach(function (im) {
                    if (!im.active) return;
                    var nx = ((s * im.vel + im.fase) % (L.W + 300)) - 150;
                    im.setPosition(nx, L.H * im.fy + Math.sin(s * 0.5 + im.fase) * 4);
                    im.setAlpha(0.88 * Math.max(0, Math.min(1, (nx - L.W * 0.17) / 140)));   // se desvanecen antes de la máquina
                });
                // Destellos que titilan sobre el suelo de caramelo.
                for (var dz = 0; dz < 22; dz++) {
                    var al = Math.max(0, Math.sin(s * 1.6 + dz * 2.9));
                    if (al < 0.05) continue;
                    var dx = (dz * 137 + 40) % L.W, dy = L.suelo + 8 + (dz * 53) % (L.H - L.suelo - 24);
                    g.fillStyle(0xffffff, al * 0.7); g.fillCircle(dx, dy, 1.5 + al * 1.6);
                    g.fillRect(dx - 4 * al, dy - 0.5, 8 * al, 1); g.fillRect(dx - 0.5, dy - 4 * al, 1, 8 * al);
                }
            }
            for (var nn = 0; nn < (this.arteOk ? 0 : 4); nn++) {
                var nx = ((s * (8 + nn * 3) + nn * 360) % (L.W + 300)) - 150, ny = L.H * (0.1 + nn * 0.07);
                g.fillStyle(0xffffff, 0.8); g.fillEllipse(nx, ny, 140, 28); g.fillCircle(nx - 24, ny - 8, 20); g.fillCircle(nx + 4, ny - 14, 26); g.fillCircle(nx + 32, ny - 6, 18);
            }
            // Máquina: manivela que gira al soltar una bola.
            var Mq = this.maquina;
            if (Mq && Mq.cont.active) {
                this.crank = Math.max(0, this.crank - dt * 1.4);
                var m = Mq.mani; m.clear();
                if (this.arteOk) {
                    // Brillo del globo de la máquina: late en reposo y destella al soltar una bola.
                    var gr = L.H * ARTE.globoR / ARTE.h;
                    m.fillStyle(0xffffff, 0.06 + 0.04 * Math.sin(s * 2) + this.crank * 0.32); m.fillCircle(0, 0, gr * (0.95 + this.crank * 0.12));
                    m.fillStyle(0xffd43b, this.crank * 0.5); m.fillCircle(0, gr * 0.75, gr * 0.28);
                    if (this.crank > 0.05) { m.fillStyle(0xffffff, this.crank * 0.9); m.fillCircle(Math.cos(s * 20) * gr * 0.5, Math.sin(s * 17) * gr * 0.5, 4); m.fillCircle(Math.cos(s * 14 + 2) * gr * 0.6, Math.sin(s * 23) * gr * 0.4, 3); }
                    Mq.cont.angle = Math.sin(s * 40) * this.crank * 2.5;
                    if (this.boca && this.boca.active) this.boca.setScale(1 + 0.04 * this.crank, 1 + 0.14 * this.crank * Math.abs(Math.sin(s * 14)));   // la boca "escupe" la bola
                } else {
                m.fillStyle(0xadb5bd, 1); m.fillCircle(0, 8, 12); m.lineStyle(6, 0x868e96, 1);
                var an = s * 0 + this.crank * 9; m.lineBetween(0, 8, Math.cos(an) * 20, 8 + Math.sin(an) * 20); m.fillStyle(0xe03131, 1); m.fillCircle(Math.cos(an) * 20, 8 + Math.sin(an) * 20, 6);
                Mq.bolas.angle = Math.sin(s * 0.9) * 3 + this.crank * 20;
                }
            }
            var tg = this.trazoG; tg.clear();
            this.trazos.forEach(function (t, ti) {
                if (t.pts.length < 2) return;
                tg.lineStyle(14, 0x000000, 0.14); tg.beginPath(); t.pts.forEach(function (q, i) { if (!i) tg.moveTo(q.x + 2, q.y + 4); else tg.lineTo(q.x + 2, q.y + 4); }); tg.strokePath();
                for (var i = 1; i < t.pts.length; i++) {
                    tg.lineStyle(11, hsv((ti * 0.17 + i * 0.045)), 1); tg.lineBetween(t.pts[i - 1].x, t.pts[i - 1].y, t.pts[i].x, t.pts[i].y);
                    tg.lineStyle(3, 0xffffff, 0.45); tg.lineBetween(t.pts[i - 1].x, t.pts[i - 1].y - 3, t.pts[i].x, t.pts[i].y - 3);
                }
                tg.fillStyle(hsv(ti * 0.17), 1); tg.fillCircle(t.pts[0].x, t.pts[0].y, 7);
            });
            var lz = this.luzG; lz.clear();
            if (B) { for (var e = 1; e < B.estela.length; e += 2) { lz.fillStyle(B.col, 0.35 * (1 - e / 14)); lz.fillCircle(B.estela[e].x, B.estela[e].y, B.r * (1 - e / 18)); } }
            // Goma de borrar (abajo a la izquierda).
            var Gm = L.goma;
            lz.fillStyle(0x000000, 0.22); lz.fillCircle(Gm.x + 3, Gm.y + 5, Gm.r);
            lz.fillStyle(0xf783ac, 1); lz.fillCircle(Gm.x, Gm.y, Gm.r);
            lz.fillStyle(0xffffff, 1); lz.fillRoundedRect(Gm.x - 22, Gm.y - 12, 44, 24, 6);
            lz.fillStyle(0xf783ac, 1); lz.fillRoundedRect(Gm.x - 22, Gm.y - 12, 20, 24, { tl: 6, tr: 0, bl: 6, br: 0 });
            lz.lineStyle(3, 0xc2255c, 1); lz.strokeCircle(Gm.x, Gm.y, Gm.r);
            // Bombillas / caramelos que cuentan la canción y se encienden con cada tecla bien tocada.
            var n = this.song ? this.song.length : 0;
            for (var i2 = 0; i2 < n; i2++) {
                var bx = L.W * 0.2 + 28 + i2 * 54, by = L.H * 0.13;
                var oro = this.prog > i2, esc = this.fase === 'escuchando' && (this.bombillasEsc || 0) > i2;
                var pul = this.pulso && time - this.pulso < 800 && i2 === this.prog ? 1 + 0.25 * Math.sin((time - this.pulso) / 60) : 1;
                lz.fillStyle(0xffd43b, (oro || esc ? 0.3 : 0.05) + (oro ? 0.08 * Math.sin(s * 5 + i2) : 0)); lz.fillCircle(bx, by, 28 * pul);
                lz.fillStyle(oro ? 0xff6b6b : esc ? 0xffd43b : 0x9a8c98, 1); lz.fillCircle(bx, by, 16 * pul);
                lz.fillStyle(0xffffff, oro || esc ? 0.8 : 0.3); lz.fillCircle(bx - 5, by - 5, 5);
                lz.lineStyle(3, 0xffffff, 0.8); lz.strokeCircle(bx, by, 16 * pul);
            }
            // Ayuda: la tecla que sigue pulsa suavemente.
            if (this.ayuda && this.fase === 'jugar' && !this.completa && this.song) {
                var sig = this.song[this.prog], tk = this.teclas.filter(function (q) { return q.id === sig; })[0];
                if (tk) { lz.lineStyle(5, 0xffe066, 0.5 + 0.4 * Math.sin(s * 6)); lz.strokeCircle(tk.body.position.x, tk.body.position.y - 30, 52); }
            }
        }
    };

    function time_ok(self) { var n = self.time.now; if (n - (self.ultSuelta || 0) < 90) return false; self.ultSuelta = n; return true; }

    K.crear({ id: 'caramelos', fondo: '#ffd6e7', escena: escena });
})(typeof window !== 'undefined' ? window : this);
