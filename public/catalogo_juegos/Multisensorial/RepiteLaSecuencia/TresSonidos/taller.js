/**
 * «El taller del duende» — motor propio de Tres Sonidos (3-4 años).
 *
 * Mecánica de CONSTRUIR con física real (motor Matter): una cinta del taller trae bloques de madera
 * con un animal o instrumento pintado. El niño los agarra con el dedo y los apila sobre el pedestal;
 * los bloques pesan, se tambalean, resbalan y la torre puede caerse. La caja de música toca una
 * canción de tres sonidos y la torre debe quedar en ESE orden, de abajo hacia arriba. Cada bloque
 * suena al golpear (se explora tirándolos), una torre bien armada se ilumina piso a piso y, si el
 * orden se tuerce, el bloque equivocado se sacude en rojo y se puede sacar y cambiar. Nada castiga:
 * si todo se cae, los bloques siguen ahí para volver a intentarlo.
 *
 * Niveles: formas cada vez más difíciles de equilibrar (cubos, tablones anchos, bloques altos,
 * bloques pequeños) y distractores. Final: concierto de juguetes con la torre tocando como xilófono.
 */
(function (global) {
    'use strict';

    var K = global.MemoriaKit;
    var Ut = global.PedniaParejaBase.util;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var M = global.Phaser && global.Phaser.Physics && global.Phaser.Physics.Matter && global.Phaser.Physics.Matter.Matter;

    // Formas de bloque por nivel: [ancho, alto] en unidades de dibujo (se escalan con la altura de pantalla).
    var FORMAS = {
        cubo: [92, 92], tablon: [138, 60], alto: [64, 118], pequeno: [70, 70]
    };
    var POR_NIVEL = [['cubo'], ['cubo', 'tablon'], ['cubo', 'tablon', 'alto'], ['cubo', 'tablon', 'alto', 'pequeno']];
    var COLORES = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xcc5de8, 0xff922b, 0x20c997, 0xf783ac];

    var ARTE = { w: 1280, h: 720, suelo: 680, pedTop: 606, pedX: 532.75, pedW: 272.5, elfoX: 125, elfoY: 686, embudoX: 1112, embudoY: 300 };
    // Cajas de regalo del diseño: centro y tamaño del cuerpo (sin lazo) en unidades del dibujo.
    var CAJAS = {
        caja1: { cx: 250, cy: 282.1, bw: 284.9, bh: 292.4 },
        caja2: { cx: 342.5, cy: 298, bw: 575.7, bh: 238 },
        caja3: { cx: 342.5, cy: 250, bw: 568.5, bh: 205.2 }
    };

    function colorDe(id) {
        var h = 0;
        for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
        return COLORES[h % COLORES.length];
    }

    var escena = {
        precargar: function () {
            if (!this.textures.exists('tr_fondo')) this.load.svg('tr_fondo', 'img/diseno/fondo.svg', { width: 1280, height: 720 });
            if (!this.textures.exists('tr_arte')) this.load.svg('tr_arte', 'img/diseno/arte.svg', { width: 1400, height: 637 });
        },

        prepararArte: function () {
            var A = global.TresSonidosArte;
            var tex = this.textures.exists('tr_arte') ? this.textures.get('tr_arte') : null;
            this.arteOk = !!(A && tex && this.textures.exists('tr_fondo'));
            if (!this.arteOk || tex.__trMarcos) return;
            Object.keys(A.frames).forEach(function (n) { var m = A.frames[n]; tex.add(n, 0, m.x, m.y, m.w, m.h); });
            tex.__trMarcos = true;
        },

        /** Imagen de un marco anclada en el punto (px, py) del dibujo, con escala propia en x e y. */
        ddxy: function (nom, x, y, kx, ky, px, py) {
            var m = global.TresSonidosArte.frames[nom], wu = m.w / m.k, hu = m.h / m.k;
            var im = this.add.image(x, y, 'tr_arte', nom);
            im.setOrigin(px == null ? 0.5 : (px - m.ox) / wu, py == null ? 0.5 : (py - m.oy) / hu);
            im.setDisplaySize(wu * kx, hu * ky);
            im.sx0 = im.scaleX; im.sy0 = im.scaleY;
            return im;
        },

        /** Fondo del taller, árbol, lámpara y pedestal del diseño. */
        montarFondoArte: function (keep) {
            var L = this.L, sx = L.W / ARTE.w, sy = L.H / ARTE.h, self = this;
            var A = global.TresSonidosArte.frames;
            keep(this.add.image(0, 0, 'tr_fondo').setOrigin(0, 0).setDisplaySize(L.W, L.H).setDepth(0.5));
            var esquina = function (nom, depth) { var m = A[nom]; return keep(self.ddxy(nom, m.ox * sx, m.oy * sy, sx, sy, m.ox, m.oy).setDepth(depth)); };
            this.darbol = esquina('f_arbol', 1.5);
            this.dbanco = esquina('f_banco', 2);
            this.dlampara = keep(this.ddxy('f_lampara', 1265 * sx, 100 * sy, sx, sy, 1265, 100).setDepth(1.6));
            // Ventana del taller (cristal) para la nieve.
            this.ventana = { x0: 582 * sx, w: 140 * sx, y0: 135 * sy, h: 340 * sy };
        },

        iniciar: function () {
            this.bloques = [];
            this.cola = [];
            this.reunidos = [];
            this.arr = null;
            this.estaticosF = [];
            this.motor = null;
            this.prog = 0;
            this.firma = '';
            this.firmaT = 0;
            this.ultSpawn = 0;
            this.bombillas = 0;
            this.copos = [];
            this.llevaCinta = true;
            this.elfo = null;
            this.erroresFirma = '';
            this.ultimoReclamo = -99999;
            this.cuco = 0;
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
            L.banco = Math.round(H * 0.86);
            L.ped = { x: Math.round(W * 0.37), w: Math.round(180 * L.k), alto: Math.round(34 * L.k) };
            L.ped.top = L.banco - L.ped.alto;
            L.cinta = { x0: Math.round(W * 0.5), x1: L.der - 20, y: Math.round(H * 0.66) };
            L.tolva = { x: L.cinta.x1 - 60, y: Math.round(H * 0.3) };
            L.caja = { x: Math.round(W * 0.14), y: Math.round(H * 0.5) };
            if (this.arteOk) {
                // El tablado, el pedestal rojo y el suelo siguen al dibujo del diseño.
                L.banco = Math.round(H * ARTE.suelo / ARTE.h);
                L.ped = { x: Math.round(W * ARTE.pedX / ARTE.w), w: Math.round(W * ARTE.pedW / ARTE.w) };
                L.ped.top = Math.round(H * ARTE.pedTop / ARTE.h);
                L.ped.alto = L.banco - L.ped.top;
                // El embudo del diseño (la boca de la tubería) es de donde caen los regalos: la cinta llega hasta debajo de él.
                var fx = Math.round(W * ARTE.embudoX / ARTE.w);
                L.cinta = { x0: Math.round(L.ped.x + L.ped.w / 2 + 90), x1: fx + 60, y: Math.round(H * 0.66) };
                L.tolva = { x: fx, y: Math.round(H * ARTE.embudoY / ARTE.h) };
                L.caja = { x: Math.round(W * 0.268), y: L.banco - 40 };
            }
            L.bocina = { x: 48, y: Math.round(H * 0.2), r: 30 };
            return L;
        },

        armar: function (reubicar) {
            this.prepararArte();
            var L = this.L = this.calcular();
            var keep = this.limpiarEscenario();
            if (this.arteOk) this.montarFondoArte(keep);
            this.paredG = keep(this.add.graphics().setDepth(1));
            this.dinG = keep(this.add.graphics().setDepth(2));
            this.bancoG = keep(this.add.graphics().setDepth(45));
            this.luzG = keep(this.add.graphics().setDepth(55));
            this.sombraG = keep(this.add.graphics().setDepth(29));
            this.dedoG = keep(this.add.graphics().setDepth(62));
            this.pintarTaller();
            this.montarHud(keep);
            this.sembrarMotes(keep, 12, { x: 0, y: 60, w: L.W, h: L.banco - 80, depth: 6 }, 0xffe9a8);
            this.armarCajaYElfo(keep);
            var Pz = L.ped;
            this.etiqueta = keep(this.add.text(Pz.x, Pz.top - 26, '¡CONSTRUYE AQUÍ!', { fontFamily: 'Arial Black, Arial', fontSize: Math.round(20 * L.k) + 'px', color: '#fff3bf', stroke: '#6d3d16', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(44));
            this.tweens.add({ targets: this.etiqueta, y: this.etiqueta.y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.montarFisica();
            if (reubicar) this.reubicarBloques();
        },

        /* ── Taller: pared de tablas, ventana nocturna, tablero de herramientas, banco y cinta ── */

        pintarTaller: function () {
            var L = this.L, g = this.paredG;
            g.clear();
if (!this.arteOk) {
            // Pared de madera verde azulada con tablas.
            g.fillStyle(0x2c6e6a, 1); g.fillRect(0, 0, L.W, L.H);
            for (var x = 0; x < L.W; x += 78) { g.fillStyle(x % 156 ? 0x2f7571 : 0x2a6965, 1); g.fillRect(x, 0, 78, L.banco); g.lineStyle(2, 0x1f4f4c, 0.7); g.lineBetween(x, 0, x, L.banco); }
            g.fillStyle(0x000000, 0.18); g.fillRect(0, L.banco - 30, L.W, 30);
            // Ventana redonda con noche nevada.
            var wx = Math.round(L.W * 0.62), wy = Math.round(L.H * 0.2), wr = Math.round(L.H * 0.12);
            this.ventana = { x: wx, y: wy, r: wr };
            g.fillStyle(0x7a4419, 1); g.fillCircle(wx, wy, wr + 14);
            g.fillStyle(0x0d1b3e, 1); g.fillCircle(wx, wy, wr);
            g.fillStyle(0x16275a, 1); g.fillCircle(wx, wy + wr * 0.4, wr * 0.9);
            g.fillStyle(0xf1f3f5, 1); g.fillCircle(wx + wr * 0.32, wy - wr * 0.3, wr * 0.2);
            g.fillStyle(0xffffff, 0.9);
            for (var s = 0; s < 14; s++) g.fillCircle(wx + Math.cos(s * 2.4) * wr * 0.8 * (0.3 + (s % 5) / 6), wy + Math.sin(s * 3.1) * wr * 0.8 * (0.3 + (s % 4) / 5), 1.5);
            g.fillStyle(0xe9ecef, 1); g.fillEllipse(wx, wy + wr * 0.88, wr * 1.5, wr * 0.35);
            g.lineStyle(6, 0x7a4419, 1); g.lineBetween(wx - wr, wy, wx + wr, wy); g.lineBetween(wx, wy - wr, wx, wy + wr);
            g.lineStyle(3, 0x5c3312, 1); g.strokeCircle(wx, wy, wr + 14);
            // Tablero de herramientas colgadas.
            var tx = Math.round(L.W * 0.78), ty = Math.round(L.H * 0.12), tw2 = Math.round(Math.min(240, L.der - tx - 20)), th = Math.round(L.H * 0.3);
            if (tw2 > 120) {
                g.fillStyle(0xb5803f, 1); g.fillRoundedRect(tx, ty, tw2, th, 12);
                g.fillStyle(0x8b5524, 0.5);
                for (var py = ty + 16; py < ty + th - 8; py += 20) for (var px = tx + 14; px < tx + tw2 - 8; px += 20) g.fillCircle(px, py, 2.2);
                g.lineStyle(10, 0x6d3d16, 1); g.lineBetween(tx + 40, ty + 30, tx + 40, ty + 100);
                g.fillStyle(0x868e96, 1); g.fillRoundedRect(tx + 18, ty + 20, 44, 20, 5);
                g.lineStyle(8, 0x6d3d16, 1); g.lineBetween(tx + 110, ty + 30, tx + 168, ty + 30);
                g.fillStyle(0xadb5bd, 1); g.fillTriangle(tx + 108, ty + 14, tx + 170, ty + 14, tx + 170, ty + 30);
                g.lineStyle(6, 0xe03131, 1); g.strokeCircle(tx + 80, ty + th - 52, 26); g.lineStyle(6, 0x1c7ed6, 1); g.strokeCircle(tx + 80, ty + th - 52, 14);
                g.fillStyle(0xfab005, 1); g.fillRoundedRect(tx + 150, ty + th - 80, 44, 12, 4); g.fillRect(tx + 168, ty + th - 80, 8, 46);
            }
            // Banco de trabajo largo y pedestal de madera donde se arma la torre.
            g.fillStyle(0x000000, 0.28); g.fillRect(0, L.banco, L.W, L.H - L.banco);
            g.fillStyle(0x9a6430, 1); g.fillRect(0, L.banco, L.W, L.H - L.banco);
            g.fillStyle(0xb87a3a, 1); g.fillRect(0, L.banco, L.W, 14);
            g.fillStyle(0xffe9a8, 0.35); g.fillRect(0, L.banco, L.W, 3);
            g.lineStyle(2, 0x6d3d16, 0.5); for (var bl = L.banco + 34; bl < L.H; bl += 28) g.lineBetween(0, bl, L.W, bl);
            for (var bx = 100; bx < L.W; bx += 260) g.lineBetween(bx, L.banco + 14, bx, L.H);
            var P = L.ped;
            g.fillStyle(0x000000, 0.25); g.fillRoundedRect(P.x - P.w / 2 - 6, P.top + 6, P.w + 12, P.alto + 4, 10);
            g.fillStyle(0xd9a05b, 1); g.fillRoundedRect(P.x - P.w / 2, P.top, P.w, P.alto + 6, 10);
            g.fillStyle(0xf0c27f, 1); g.fillRoundedRect(P.x - P.w / 2, P.top, P.w, 10, { tl: 10, tr: 10, bl: 0, br: 0 });
            g.lineStyle(3, 0x8b5524, 1); g.strokeRoundedRect(P.x - P.w / 2, P.top, P.w, P.alto + 6, 10);
            g.fillStyle(0xfab005, 1); g.fillTriangle(P.x - 14, P.top + 18, P.x + 14, P.top + 18, P.x, P.top + 30);
}

            // Cinta transportadora (se mueve en dinG) y tolva.
            var C = L.cinta;
            g.fillStyle(0x495057, 1); g.fillRoundedRect(C.x0 - 16, C.y, C.x1 - C.x0 + 40, 26, 13);
            g.fillStyle(0x343a40, 1); g.fillRect(C.x0 + 20, C.y + 24, 14, L.banco - C.y - 24); g.fillRect(C.x1 - 40, C.y + 24, 14, L.banco - C.y - 24);
            var T = L.tolva;
            if (this.arteOk) return;
            g.fillStyle(this.arteOk ? 0x0f6f63 : 0x6d3d16, 1); g.fillPoints([{ x: T.x - 62, y: T.y - 50 }, { x: T.x + 62, y: T.y - 50 }, { x: T.x + 30, y: T.y + 30 }, { x: T.x - 30, y: T.y + 30 }], true);
            g.fillStyle(this.arteOk ? 0xd90b3c : 0x8b5524, 1); g.fillRect(T.x - 70, T.y - 56, 140, 12);
            g.fillStyle(0x343a40, 1); g.fillRect(T.x - 4, T.y - 140, 8, 90);
            g.lineStyle(3, 0x343a40, 1); g.lineBetween(T.x, T.y - 140, T.x, 0);
        },

        /* ── Caja de música (arriba a la izquierda), bombillas del progreso y duende ── */

        armarCajaYElfo: function (keep) {
            var L = this.L, self = this;
            var c = keep(this.add.container(L.caja.x, L.caja.y).setDepth(8));
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.22); g.fillEllipse(0, 44, 150, 20);
            g.fillStyle(0x7a4419, 1); g.fillRoundedRect(-62, -6, 124, 50, 10);
            g.fillStyle(0x9a6430, 1); g.fillRoundedRect(-62, -6, 124, 14, { tl: 10, tr: 10, bl: 0, br: 0 });
            g.fillStyle(0xfab005, 1); g.fillRect(-62, 22, 124, 4);
            g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(-52, -52, 104, 48, { tl: 24, tr: 24, bl: 0, br: 0 });
            g.lineStyle(3, 0xfab005, 1); g.strokeRoundedRect(-52, -52, 104, 48, { tl: 24, tr: 24, bl: 0, br: 0 });
            g.fillStyle(0xfab005, 1); g.fillCircle(72, 26, 7); g.lineStyle(5, 0xfab005, 1); g.lineBetween(62, 26, 74, 26);
            c.add(g);
            var bailarina = this.add.graphics();
            bailarina.fillStyle(0xf783ac, 1); bailarina.fillTriangle(-14, -4, 14, -4, 0, -26);
            bailarina.fillStyle(0xffe0c2, 1); bailarina.fillCircle(0, -34, 8);
            bailarina.fillStyle(0x7a4419, 1); bailarina.fillRect(-2, -30, 4, 4);
            bailarina.setPosition(0, -4);
            c.add(bailarina);
            this.caja = { cont: c, bailarina: bailarina, giro: 0, luz: 0 };
            if (this.arteOk) { c.destroy(); this.caja = null; }   // con el arte del diseño no hay caja de música que gira
            // Duende: gorro rojo, barba blanca y delantal, a la izquierda del pedestal.
            if (this.arteOk) {
                var ea = keep(this.add.container(Math.round(L.W * ARTE.elfoX / ARTE.w), L.banco - 4).setDepth(9));
                var kk = L.H / ARTE.h;
                ea.add(this.ddxy('f_elfo', 0, (ARTE.elfoY - ARTE.suelo + 4) * kk, kk, kk, ARTE.elfoX, ARTE.elfoY));
                this.elfo = { cont: ea, brazos: [], base: ea.y };
            }
            if (!this.arteOk) {
            var e = keep(this.add.container(Math.round(L.W * 0.17), L.banco - 4).setDepth(9));
            var d = this.add.graphics();
            d.fillStyle(0x000000, 0.2); d.fillEllipse(0, 4, 70, 14);
            d.fillStyle(0x6d3d16, 1); d.fillRoundedRect(-18, -22, 14, 24, 5); d.fillRoundedRect(4, -22, 14, 24, 5);
            d.fillStyle(0x2f9e44, 1); d.fillRoundedRect(-24, -70, 48, 56, 16);
            d.fillStyle(0x8b5524, 1); d.fillRoundedRect(-14, -52, 28, 36, 8);
            d.fillStyle(0xfab005, 1); d.fillRect(-24, -44, 48, 5);
            d.fillStyle(0xffe0c2, 1); d.fillCircle(0, -86, 22);
            d.fillStyle(0xffffff, 1); d.fillEllipse(0, -70, 36, 26); d.fillCircle(-12, -78, 9); d.fillCircle(12, -78, 9);
            d.fillStyle(0xff8787, 1); d.fillCircle(0, -86, 5);
            d.fillStyle(0xe03131, 1); d.fillTriangle(-24, -96, 24, -96, 10, -140); d.fillRect(-24, -100, 48, 10);
            d.fillStyle(0xffffff, 1); d.fillCircle(10, -142, 8); d.fillRect(-24, -100, 48, 4);
            d.fillStyle(0x212529, 1); d.fillCircle(-8, -92, 3.2); d.fillCircle(8, -92, 3.2);
            e.add(d);
            var bra1 = this.add.graphics(); bra1.fillStyle(0x2f9e44, 1); bra1.fillRoundedRect(-8, -4, 40, 12, 6); bra1.fillStyle(0xffe0c2, 1); bra1.fillCircle(34, 2, 7); bra1.setPosition(-30, -56);
            var bra2 = this.add.graphics(); bra2.fillStyle(0x2f9e44, 1); bra2.fillRoundedRect(-32, -4, 40, 12, 6); bra2.fillStyle(0xffe0c2, 1); bra2.fillCircle(-34, 2, 7); bra2.setPosition(30, -56);
            e.add([bra1, bra2]);
            this.elfo = { cont: e, brazos: [bra1, bra2], base: e.y };
}

        },

        elfoAnimar: function (tipo) {
            var E = this.elfo, self = this;
            if (!E || !E.cont.active) return;
            this.tweens.killTweensOf(E.cont);
            E.cont.y = E.base; E.cont.angle = 0;
            if (tipo === 'ole') {
                this.tweens.add({ targets: E.cont, y: E.base - 26, duration: 140, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
                E.brazos.forEach(function (b, i) { self.tweens.add({ targets: b, angle: i ? 50 : -50, duration: 140, yoyo: true, repeat: 2 }); });
            } else if (tipo === 'ups') {
                this.tweens.add({ targets: E.cont, angle: { from: -6, to: 6 }, duration: 90, yoyo: true, repeat: 3, onComplete: function () { E.cont.angle = 0; } });
            } else {
                this.tweens.add({ targets: E.cont, y: E.base - 10, duration: 160, yoyo: true });
            }
        },

        /* ── Física (Matter): mundo estático y bloques ── */

        montarFisica: function () {
            var L = this.L, self = this;
            if (!M) return;
            if (!this.motor) {
                this.motor = M.Engine.create({ gravity: { x: 0, y: 1.5 }, positionIterations: 10, velocityIterations: 8 });
                M.Events.on(this.motor, 'collisionStart', function (ev) { self.alChoque(ev); });
            }
            var mundo = this.motor.world;
            this.estaticosF.forEach(function (b) { M.Composite.remove(mundo, b); });
            this.estaticosF = [];
            var add = function (x, y, w, h, extra) {
                var b = M.Bodies.rectangle(x, y, w, h, Object.assign({ isStatic: true, friction: 0.9, frictionStatic: 1.4, restitution: 0.02 }, extra || {}));
                self.estaticosF.push(b); return b;
            };
            var P = L.ped, C = L.cinta;
            add(L.W / 2, L.banco + 40, L.W * 3, 80);                                  // banco (suelo)
            add(P.x, P.top + P.alto / 2 + 3, P.w, P.alto + 6);                         // pedestal
            add(-30, L.H / 2, 60, L.H * 2);                                            // pared izquierda
            add(L.W + 30, L.H / 2, 60, L.H * 2);                                       // pared derecha
            add((C.x0 + C.x1) / 2, C.y + 8, C.x1 - C.x0 + 30, 20);                     // cinta
            add(C.x0 - 14, C.y - 48, 22, 120);                                         // tope de la cinta
            add(C.x1 + 16, C.y - 120, 24, 250);                                        // borde derecho de la cinta
            add(L.tolva.x - 40, L.tolva.y + 10, 8, 60, { angle: 0.35 });               // guías de la tolva
            add(L.tolva.x + 40, L.tolva.y + 10, 8, 60, { angle: -0.35 });
            M.Composite.add(mundo, this.estaticosF);
        },

        reubicarBloques: function () {
            var L = this.L;
            this.bloques.forEach(function (b) {
                var p = b.body.position;
                if (p.x > L.W - 10 || p.y > L.H) M.Body.setPosition(b.body, { x: L.cinta.x0 + 80, y: L.cinta.y - 80 });
            });
        },

        crearBloque: function (id, tipo, x, y) {
            var L = this.L, k = L.k;
            var d = FORMAS[tipo] || FORMAS.cubo, w = Math.round(d[0] * k), h = Math.round(d[1] * k);
            var cuerpo = M.Bodies.rectangle(x, y, w, h, { friction: 0.95, frictionStatic: 1.6, frictionAir: 0.012, restitution: 0.05, density: 0.0022, chamfer: { radius: 7 }, slop: 0.03 });
            M.Composite.add(this.motor.world, cuerpo);
            var c = this.add.container(x, y).setDepth(30);
            var col = colorDe(id);
            if (this.arteOk) return this.crearBloqueArte(id, tipo, cuerpo, c, w, h);
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.2); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 10);
            g.fillStyle(col, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            g.fillStyle(0xffffff, 0.3); g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, Math.min(14, h * 0.2), 6);
            g.lineStyle(4, 0x000000, 0.22); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
            var lado = Math.min(w, h) * 0.68;
            g.fillStyle(0xfff9db, 1); g.fillRoundedRect(-lado / 2, -lado / 2, lado, lado, 12);
            g.lineStyle(3, 0x8b5524, 0.7); g.strokeRoundedRect(-lado / 2, -lado / 2, lado, lado, 12);
            // Tornillos en las esquinas.
            g.fillStyle(0x000000, 0.28);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { g.fillCircle(q[0] * (w / 2 - 8), q[1] * (h / 2 - 8), 2.4); });
            var im = this.add.image(0, 0, 'el_' + id);
            im.setScale((lado * 0.82) / Math.max(im.width, im.height));
            var halo = this.add.graphics();
            c.add([g, im, halo]);
            var b = { img: im, id: id, tipo: tipo, body: cuerpo, cont: c, w: w, h: h, halo: halo, estado: null, quieto: 0, asentado: false, ultimoSonido: 0, spawn: this.time.now };
            cuerpo.plugin = { bloque: b };
            this.bloques.push(b);
            return b;
        },

        /** Caja de regalo del diseño: el cuerpo físico es el mismo; solo cambia cómo se ve. */
        crearBloqueArte: function (id, tipo, cuerpo, c, w, h) {
            var par = { nom: 'caja1', rot: false };
            if (tipo === 'tablon') par.nom = (colorDe(id) % 2) ? 'caja2' : 'caja3';
            if (tipo === 'alto') { par.nom = 'caja3'; par.rot = true; }
            var D = CAJAS[par.nom];
            var spr = this.ddxy(par.nom, 0, 0, (par.rot ? h : w) / D.bw, (par.rot ? w : h) / D.bh, D.cx, D.cy);
            if (par.rot) spr.setRotation(Math.PI / 2);
            var rr = Math.min(w, h) * 0.3;
            var disco = this.add.graphics();
            disco.fillStyle(0xffffff, 1); disco.fillCircle(0, 0, rr);
            disco.lineStyle(3, 0xffffff, 0.85); disco.strokeCircle(0, 0, rr + 3);
            var im = this.add.image(0, 0, 'el_' + id);
            im.setScale((rr * 1.5) / Math.max(im.width, im.height));
            var halo = this.add.graphics();
            c.add([spr, disco, im, halo]);
            var b = { img: im, id: id, tipo: tipo, body: cuerpo, cont: c, w: w, h: h, halo: halo, estado: null, quieto: 0, asentado: false, ultimoSonido: 0, spawn: this.time.now };
            cuerpo.plugin = { bloque: b };
            this.bloques.push(b);
            return b;
        },

        pintarHalo: function (b, estado) {
            b.estado = estado;
            var g = b.halo; g.clear();
            if (!estado) return;
            g.lineStyle(6, estado === 'ok' ? 0xffd43b : 0xff6b6b, 1);
            g.strokeRoundedRect(-b.w / 2 - 3, -b.h / 2 - 3, b.w + 6, b.h + 6, 12);
            g.lineStyle(14, estado === 'ok' ? 0xffd43b : 0xff6b6b, 0.25);
            g.strokeRoundedRect(-b.w / 2 - 6, -b.h / 2 - 6, b.w + 12, b.h + 12, 14);
        },

        /** Un golpe entre un bloque y el mundo: suena el bloque (así se explora tirándolos). */
        alChoque: function (ev) {
            var self = this, now = this.time.now;
            ev.pairs.forEach(function (p) {
                [p.bodyA, p.bodyB].forEach(function (bd, i) {
                    var b = bd.plugin && bd.plugin.bloque;
                    if (!b) return;
                    var otro = i ? p.bodyA : p.bodyB;
                    var vrel = Math.hypot(bd.velocity.x - otro.velocity.x, bd.velocity.y - otro.velocity.y);
                    if (vrel > 2.4 && now - b.ultimoSonido > 450 && (self.fase === 'jugar' || self.fase === 'demo' || self.fase === 'premio')) {
                        b.ultimoSonido = now;
                        self.sonar(b.id, { breve: true, bocina: false });
                        self.tweens.add({ targets: b.cont, scaleX: 1.08, scaleY: 0.94, duration: 90, yoyo: true });
                        Ut.estallido(self, bd.position.x, bd.position.y - b.h / 2, { n: 3, tex: 'nota', tam: 20, dist: 70, depth: 70 });
                    }
                });
            });
        },

        /* ── Dedo: arrastrar bloques con una cuerda elástica (como agarrarlos con la mano) ── */

        bloqueEn: function (p) {
            var puntos = this.bloques.map(function (b) { return b.body; });
            var hits = M.Query.point(puntos, { x: p.x, y: p.y });
            if (!hits.length) {
                // Un poco de tolerancia: el bloque más cercano a menos de 26 px.
                var mejor = null, dm = 26;
                this.bloques.forEach(function (b) { var d = Math.hypot(p.x - b.body.position.x, p.y - b.body.position.y) - Math.max(b.w, b.h) * 0.5; if (d < dm) { dm = d; mejor = b; } });
                return mejor;
            }
            return hits[0].plugin.bloque;
        },

        alTocar: function (p) {
            if (this.fase !== 'jugar' && this.fase !== 'demo') return;
            if (!M || this.arr) return;
            var b = this.bloqueEn(p);
            if (!b) return;
            this.pista.reiniciar();
            var cons = M.Constraint.create({ pointA: { x: p.x, y: p.y }, bodyB: b.body, pointB: { x: p.x - b.body.position.x, y: p.y - b.body.position.y }, stiffness: 0.16, damping: 0.14, length: 0 });
            M.Composite.add(this.motor.world, cons);
            b.body.frictionAir = 0.07;
            this.arr = { b: b, cons: cons };
            b.cont.setDepth(60);
            K.tono({ f: 520, dur: 0.05, vol: 0.04 });
            this.tweens.add({ targets: b.cont, scale: 1.06, duration: 100 });
        },

        alMover: function (p) {
            if (!this.arr) return;
            var L = this.L;
            this.arr.cons.pointA.x = Math.max(20, Math.min(L.W - 20, p.x));
            this.arr.cons.pointA.y = Math.max(70, Math.min(L.banco - 10, p.y));
        },

        alSoltar: function () {
            if (!this.arr) return;
            var a = this.arr;
            M.Composite.remove(this.motor.world, a.cons);
            a.b.body.frictionAir = 0.012;
            M.Body.setVelocity(a.b.body, { x: a.b.body.velocity.x * 0.6, y: a.b.body.velocity.y * 0.6 });
            a.b.cont.setDepth(30);
            this.tweens.add({ targets: a.b.cont, scale: 1, duration: 100 });
            this.arr = null;
        },

        ocupadoPorJuego: function () { return !!this.arr; },

        /* ── Niveles ── */

        alSonar: function (id, k) {
            if (this.caja) { this.caja.luz = this.time.now; this.caja.giro += 1.2; }
            this.bombillas = k + 1;
            if (this.elfo) this.elfoAnimar('tic');
        },

        alReescuchar: function (empieza) { if (empieza) this.bombillas = 0; },

        prepararNivel: async function (i, nv) {
            var self = this;
            this.nv = nv;
            this.limpiarBloques();
            this.prog = 0; this.firma = ''; this.firmaT = 0; this.erroresFirma = '';
            this.completa = false; this.llegando = false;
            this.erroresNivel = 0;
            this.song = nv.correctas.slice();
            this.bombillas = 0;
            this.nivelFormas = POR_NIVEL[Math.max(0, Math.min(3, i < 0 ? 0 : this.nivelActual))];
            await esperar(this, 600);
        },

        limpiarBloques: function () {
            var self = this;
            if (this.arr) this.alSoltar();
            this.bloques.forEach(function (b) { if (b.body) M.Composite.remove(self.motor.world, b.body); if (b.cont.active) b.cont.destroy(); });
            this.bloques = [];
            this.cola = [];
        },

        /** La cinta trae los bloques (los de la canción y los distractores) y los lleva hasta el tope. */
        mostrarOpciones: async function (nv) {
            var self = this, L = this.L;
            var formas = this.nivelFormas || ['cubo'];
            // Cada bloque de la canción tiene su forma; los extras también (mezcladas).
            // Primero salen los bloques de la canción (mezclados) y al final los distractores: la cinta nunca se atasca.
            var nec = Ut.mezclar(nv.correctas.filter(function (id, i, a) { return a.indexOf(id) === i; }));
            var ids = nec.concat(Ut.mezclar(nv.opciones.filter(function (id) { return nec.indexOf(id) < 0; })));
            this.cola = ids.map(function (id, i) { return { id: id, tipo: formas[(Math.random() * formas.length) | 0] }; });
            // En el nivel 1 todos son cubos para empezar fácil.
            if (this.nivelActual === 0 || nv.demo) this.cola.forEach(function (q) { q.tipo = 'cubo'; });
            this.spawnOn = true;
            this.ultSpawn = this.time.now - 1000;
            var t0 = this.time.now;
            while (this.cola.length > Math.max(0, ids.length - 3) && this.sigue() && this.time.now - t0 < 9000) await esperar(this, 250);
            await esperar(this, nv.demo ? 1500 : 1200);
        },

        preguntar: function () {
            if (this.nv.demo || this.nivelActual > 0) return Promise.resolve();
            return this.ctx.decir({ voz: 'zeus', texto: '¡Apila los bloques en el mismo orden de la canción, de abajo hacia arriba!' }, { minMs: 900 });
        },

        /** Hay lugar en la cinta para otro bloque (no se amontonan unos sobre otros). */
        cabeEnCinta: function (sig) {
            var C = this.L.cinta, usado = 0, cola = false, k = this.L.k;
            this.bloques.forEach(function (b) {
                var p = b.body.position;
                if (p.x > C.x0 - 20 && p.x < C.x1 + 40 && p.y < C.y + 40 && p.y > C.y - 400) { usado += Math.max(b.w, b.h) + 14; if (p.x > C.x1 - 160) cola = true; }
            });
            var d = FORMAS[(sig && sig.tipo) || 'cubo'] || FORMAS.cubo;
            return !cola && usado + Math.max(d[0], d[1]) * k < (C.x1 - C.x0) - 40;
        },

        /* ── Revisión de la torre ── */

        torre: function () {
            var P = this.L.ped, self = this;
            return this.bloques.filter(function (b) {
                if (!b.asentado || (self.arr && self.arr.b === b)) return false;
                var p = b.body.position;
                return Math.abs(p.x - P.x) < P.w / 2 + b.w * 0.4 && (p.y + b.h / 2) <= P.top + 10;
            }).sort(function (a, c) { return c.body.position.y - a.body.position.y; });
        },

        revisarTorre: function (dt) {
            if (this.fase !== 'jugar' || this.completa) return;
            var T = this.torre();
            var firma = T.map(function (b) { return b.id; }).join('|');
            if (firma !== this.firma) { this.firma = firma; this.firmaT = 0; return; }
            this.firmaT += dt;
            if (this.firmaT < 0.4 || this.firmaProcesada === firma) return;
            this.firmaProcesada = firma;
            var song = this.song, n = song.length, self = this;
            var buenos = 0;
            while (buenos < T.length && buenos < n && T[buenos].id === song[buenos]) buenos++;
            var mal = T.length > buenos;
            // Iluminar piso a piso lo que está bien y marcar en rojo lo que se tuerce.
            T.forEach(function (b, i) { self.pintarHalo(b, i < buenos ? 'ok' : 'mal'); });
            this.bloques.forEach(function (b) { if (T.indexOf(b) < 0 && b.estado) self.pintarHalo(b, null); });
            if (buenos > this.prog) {
                this.prog = buenos;
                var b = T[buenos - 1];
                this.sonar(b.id, { breve: true, bocina: false });
                K.tono({ f: 660 + buenos * 110, f2: 990 + buenos * 110, dur: 0.22, vol: 0.05 });
                this.tweens.add({ targets: b.cont, scaleX: 1.12, scaleY: 1.12, duration: 160, yoyo: true });
                Ut.estallido(this, b.body.position.x, b.body.position.y, { n: 8, tex: 'estrella', tam: 24, dist: 100, depth: 71, sinTinte: true });
                this.elfoAnimar('ole');
                this.pista.reiniciar();
            } else if (buenos < this.prog) this.prog = buenos;
            if (mal) {
                var m = T[buenos];
                this.tweens.add({ targets: m.cont, angle: { from: -5, to: 5 }, duration: 80, yoyo: true, repeat: 3, onComplete: function () { m.cont.angle = 0; } });
                K.tono({ f: 300, f2: 180, dur: 0.2, vol: 0.05 });
                this.elfoAnimar('ups');
                if (this.erroresFirma !== firma) {
                    this.erroresFirma = firma;
                    this.errores += 1; this.erroresNivel += 1;
                    if (this.erroresNivel >= 4) this.ayuda = true;
                    if (this.time.now - this.ultimoReclamo > 7000) {
                        this.ultimoReclamo = this.time.now;
                        this.reaccion('Decir_no', 1400);
                        this.ctx.decir({ voz: 'zeus', texto: '¡Ese bloque va en otro lugar! Sácalo y prueba otro.' }, { minMs: 800 });
                    }
                }
            }
            if (buenos === n && T.length === n) this.llegar();
        },

        llegar: async function () {
            if (this.llegando) return;
            this.llegando = true;
            this.completa = true;
            this.fase = 'premio';
            this.marcadas = this.song.slice();
            var P = this.L.ped;
            await this.acertar(this.song.slice(), { x: P.x, y: P.top - 140 });
            this.llegando = false;
        },

        alAcertar: async function () {
            var T = this.torre();
            for (var k = 0; k < T.length; k++) {
                if (!this.sigue()) return;
                var b = T[k];
                this.reunidos.push(b.id);
                this.tweens.add({ targets: b.cont, scaleX: 1.12, scaleY: 1.12, duration: 140, yoyo: true });
                Ut.estallido(this, b.body.position.x, b.body.position.y, { n: 10, tex: 'estrella', tam: 26, dist: 120, depth: 71, sinTinte: true });
                await this.sonar(b.id, { breve: true, bocina: false });
            }
            this.elfoAnimar('ole');
            Ut.confeti(this, 60);
            await esperar(this, 900);
        },

        alTerminarNivel: async function () {
            this.spawnOn = false;
            var self = this;
            this.bloques.forEach(function (b) { if (b.cont.active) tw(self, { targets: b.cont, alpha: 0, duration: 400 }); });
            await esperar(this, 500);
            this.limpiarBloques();
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.arr) return Promise.resolve();
            var T = this.torre();
            var sig = this.song[this.prog];
            var b = this.bloques.filter(function (q) { return q.id === sig && T.indexOf(q) < 0; })[0];
            if (!this.ayuda || !b) { if (this.caja) this.caja.luz = this.time.now; return esperar(this, 800); }
            var P = this.L.ped;
            var alto = T.reduce(function (s, q) { return s + q.h; }, 0);
            return this.ctx.mano({ punto: { x: b.body.position.x, y: b.body.position.y }, holdMs: 250, arrastre: { dx: P.x - b.body.position.x, dy: (P.top - alto - b.h / 2) - b.body.position.y, durMs: 1200 }, cancelado: function () { return cancelada() || self.fase !== 'jugar'; } });
        },

        demoPaso: function () {
            var self = this, P = this.L.ped;
            return this.nv.correctas.map(function (id, k) {
                return function () {
                    var b = self.bloques.filter(function (q) { return q.id === id && Math.abs(q.body.position.x - P.x) > P.w; })[0];
                    if (!b) return null;
                    var T = self.torre();
                    var alto = T.reduce(function (s, q) { return s + q.h; }, 0);
                    var meta = { x: P.x, y: P.top - alto - b.h / 2 - 20 };
                    return {
                        desde: { x: b.body.position.x, y: b.body.position.y }, hasta: meta,
                        hacer: async function () {
                            M.Body.setPosition(b.body, { x: meta.x, y: meta.y - 50 });
                            M.Body.setVelocity(b.body, { x: 0, y: 0 }); M.Body.setAngle(b.body, 0); M.Body.setAngularVelocity(b.body, 0);
                            await esperar(self, 1700);
                        }
                    };
                };
            });
        },

        /* ── Final: concierto de juguetes ── */

        escenaFinal: async function () {
            var self = this, L = this.L;
            this.spawnOn = false;
            this.fiesta = true;
            // Quedan solo los bloques de la torre; los demás se retiran.
            var T = this.torre();
            this.bloques.forEach(function (b) { if (T.indexOf(b) < 0 && b.cont.active) tw(self, { targets: b.cont, alpha: 0, duration: 300 }); });
            await esperar(this, 500);
            if (!T.length) {
                var ids = this.reunidos.filter(function (id, i, a) { return a.indexOf(id) === i; }).slice(0, 4);
                if (!ids.length) ids = ['perro', 'tambor', 'campana'];
                var yy = L.ped.top - 60;
                ids.forEach(function (id) { var b = self.crearBloque(id, 'cubo', L.ped.x, yy); yy -= 96 * L.k; T.push(b); });
                await esperar(self, 1500);
            }
            this.elfoAnimar('ole');
            for (var v = 0; v < 2; v++) {
                for (var k = 0; k < T.length; k++) {
                    if (!this.sigue()) return;
                    var b = T[k];
                    this.tweens.add({ targets: b.cont, scaleX: 1.14, scaleY: 1.14, duration: 160, yoyo: true });
                    this.fuego(b.body.position.x + (Math.random() - 0.3) * 260, L.H * (0.1 + Math.random() * 0.25), k);
                    if (k % 2 === 0) this.elfoAnimar('ole');
                    await this.sonar(b.id, { breve: true, bocina: false });
                }
            }
            Ut.confeti(this, 110);
            this.cuco = this.time.now;
            K.tono({ f: 880, f2: 700, dur: 0.18, vol: 0.05 });
            await esperar(this, 1400);
        },

        fuego: function (x, y, k) {
            var cols = [0xff6b6b, 0xfab005, 0x69db7c, 0x4dabf7, 0xcc5de8];
            K.ruido({ f: 2400, q: 0.6, dur: 0.3, vol: 0.08 });
            Ut.estallido(this, x, y, { n: 22, tex: 'chispa', tam: 22, dist: 140, depth: 52, colores: [cols[k % 5], 0xffffff, cols[(k + 2) % 5]], ms: 1100, gravedad: 50 });
        },

        estadoExtra: function () {
            var self = this;
            return {
                song: this.song, prog: this.prog, completa: !!this.completa, firma: this.firma,
                ped: this.L.ped, cinta: this.L.cinta,
                bloques: this.bloques.map(function (b) { return { id: b.id, t: b.tipo, x: Math.round(b.body.position.x), y: Math.round(b.body.position.y), a: +b.body.angle.toFixed(2), asentado: b.asentado, estado: b.estado }; })
            };
        },

        /* ── Cada cuadro ── */

        paso: function (time, delta) {
            var L = this.L, s = time / 1000, dt = Math.min(0.05, (delta || 16) / 1000), self = this;
            if (!L || !this.motor || !this.dinG || !this.dinG.active) return;
            // Aparecen los bloques por la tolva, uno cada tanto.
            if (this.spawnOn && this.cola.length && time - this.ultSpawn > (this.nv && this.nv.demo ? 700 : 1500) && this.cabeEnCinta(this.cola[0])) {
                var q = this.cola.shift();
                var b = this.crearBloque(q.id, q.tipo, L.tolva.x + (Math.random() - 0.5) * 24, L.tolva.y + 20);
                M.Body.setAngle(b.body, (Math.random() - 0.5) * 0.5);
                this.ultSpawn = time;
                K.ruido({ f: 700, q: 0.7, dur: 0.12, vol: 0.05, tipo: 'lowpass' });
            }
            // Física: dos pasos pequeños para mayor estabilidad.
            M.Engine.update(this.motor, 1000 / 120);
            M.Engine.update(this.motor, 1000 / 120);
            var C = L.cinta;
            this.bloques.forEach(function (b) {
                var bd = b.body, p = bd.position;
                // Cinta: arrastra los bloques que están encima.
                var enCinta = !(self.arr && self.arr.b === b) && p.x > C.x0 - 6 && p.x < C.x1 + 10 && Math.abs((p.y + b.h / 2) - (C.y - 2)) < 8 && Math.abs(bd.velocity.y) < 1.5;
                if (enCinta) M.Body.setVelocity(bd, { x: -1.5, y: bd.velocity.y });
                if (bd.speed > 18) M.Body.setVelocity(bd, { x: bd.velocity.x * 0.8, y: bd.velocity.y * 0.8 });
                if (self.arr && self.arr.b === b) M.Body.setAngularVelocity(bd, bd.angularVelocity * 0.85);
                // Un bloque que se escapa de la pantalla vuelve a la cinta.
                if (p.y > L.H + 60 || p.x < -40 || p.x > L.W + 40) { M.Body.setPosition(bd, { x: L.tolva.x, y: L.tolva.y + 20 }); M.Body.setVelocity(bd, { x: 0, y: 0 }); }
                b.cont.setPosition(p.x, p.y); b.cont.rotation = bd.angle; b.img.rotation = -bd.angle * 0.85;
                var quieto = !(self.arr && self.arr.b === b) && bd.speed < 0.14 && Math.abs(bd.angularSpeed) < 0.012;
                b.quieto = quieto ? b.quieto + dt : 0;
                b.asentado = b.quieto > 0.45;
                if (b.estado) b.halo.setAlpha(0.65 + 0.35 * Math.sin(s * 6 + b.body.id));
            });
            if (this.fase === 'jugar' || this.fase === 'premio') this.revisarTorre(dt);

            // ── Dibujo dinámico: engranajes, péndulo del reloj, cinta que gira, nieve, luces ──
            var g = this.dinG; g.clear();
if (!this.arteOk) {
            // Engranajes de la pared.
            [[L.W * 0.5, L.H * 0.1, 54, 1], [L.W * 0.55, L.H * 0.1 + 66, 34, -1.6]].forEach(function (e) {
                g.fillStyle(0xb5803f, 0.9);
                for (var t = 0; t < 10; t++) { var a = s * e[3] * 0.5 + t * Math.PI / 5; g.fillCircle(e[0] + Math.cos(a) * e[2], e[1] + Math.sin(a) * e[2], e[2] * 0.2); }
                g.fillCircle(e[0], e[1], e[2] * 0.85); g.fillStyle(0x7a4419, 1); g.fillCircle(e[0], e[1], e[2] * 0.3);
            });
}

            // Cinta: tiras que avanzan hacia la izquierda.
            g.fillStyle(0x212529, 1); g.fillRoundedRect(C.x0 - 16, C.y - 4, C.x1 - C.x0 + 40, 10, 5);
            g.fillStyle(0x495057, 1);
            for (var x = C.x0 - 10 + (-(s * 90) % 28); x < C.x1 + 20; x += 28) { if (x > C.x0 - 12) g.fillRect(x, C.y - 3, 12, 8); }
            [C.x0, C.x1].forEach(function (rx) { g.fillStyle(0x6c757d, 1); g.fillCircle(rx, C.y + 8, 15); g.lineStyle(3, 0x343a40, 1); var a = s * 6; g.lineBetween(rx - Math.cos(a) * 11, C.y + 8 - Math.sin(a) * 11, rx + Math.cos(a) * 11, C.y + 8 + Math.sin(a) * 11); });
            if (this.arteOk) {   // nieve que cae por la ventana del diseño
                var Vn = this.ventana;
                g.fillStyle(0xffffff, 0.9);
                for (var cn = 0; cn < 26; cn++) {
                    var fxn = Vn.x0 + Vn.w * (0.5 + Math.sin(cn * 2.7 + s * 0.6) * 0.45), fyn = Vn.y0 + ((s * (16 + (cn % 4) * 6) + cn * 37) % Vn.h);
                    g.fillCircle(fxn, fyn, 1.6 + (cn % 3) * 0.5);
                }
            }
            if (!this.arteOk) {
            // Nieve que cae por la ventana.
            var V = this.ventana;
            g.fillStyle(0xffffff, 0.9);
            for (var c = 0; c < 18; c++) { var fx = V.x + Math.sin(c * 2.7 + s * 0.6) * V.r * 0.85, fy = V.y - V.r + ((s * (14 + (c % 4) * 5) + c * 23) % (V.r * 2)); if (Math.hypot(fx - V.x, fy - V.y) < V.r - 3) g.fillCircle(fx, fy, 1.6 + (c % 3) * 0.5); }
}

            // Bombillas que cuentan los sonidos de la canción (se vuelven doradas con cada piso bien puesto).
            var n = this.song ? this.song.length : 0;
            if (n) {
                var bx0 = this.arteOk ? L.W * 0.34 : L.W * 0.1, by0 = this.arteOk ? L.H * 0.075 : L.H * 0.3 - 40;
                g.lineStyle(3, 0x343a40, 1); g.beginPath(); g.moveTo(bx0 - 30, by0 - 24);
                for (var q2 = 0; q2 <= 1.0001; q2 += 0.1) g.lineTo(bx0 - 30 + q2 * (n * 62 + 20), by0 - 24 + Math.sin(q2 * Math.PI) * 18);
                g.strokePath();
                for (var i = 0; i < n; i++) {
                    var bxx = bx0 + i * 62, byy = by0 + Math.sin(((i + 0.5) / n) * Math.PI) * 18;
                    var oro = this.prog > i, esc = this.bombillas > i && this.fase === 'escuchando';
                    g.fillStyle(0xffd43b, (oro || esc ? 0.3 : 0.06) + (oro ? 0.08 * Math.sin(s * 5 + i) : 0)); g.fillCircle(bxx, byy + 6, 30);
                    g.fillStyle(oro ? 0xffd43b : esc ? 0xff922b : 0x495057, 1); g.fillCircle(bxx, byy + 6, 15);
                    g.fillStyle(0xffffff, oro || esc ? 0.7 : 0.18); g.fillCircle(bxx - 5, byy + 1, 5);
                    g.fillStyle(0x343a40, 1); g.fillRect(bxx - 5, byy - 12, 10, 8);
                }
            }
            // Caja de música: la bailarina gira y se enciende la tapa al sonar.
            var CJ = this.caja;
            if (CJ && CJ.cont.active) {
                CJ.giro *= Math.pow(0.3, dt);
                CJ.bailarina.rotation += (0.8 + CJ.giro * 3) * dt;
                CJ.bailarina.scaleX = Math.cos(CJ.bailarina.rotation) * 0.9 + 0.1;
                var f = Math.max(0, 1 - (time - CJ.luz) / 500);
                if (f > 0) { g.fillStyle(0xffd43b, 0.35 * f); g.fillCircle(L.caja.x, L.caja.y - 22, 64 + 14 * f); }
            }
            if (this.arteOk) {   // el árbol brilla, la lámpara se mece
                var kx = L.W / ARTE.w, ky = L.H / ARTE.h;
                g.fillStyle(0xffe066, 0.16 + 0.1 * Math.sin(s * 3)); g.fillCircle(151 * kx, 148 * ky, 26 * kx);
                var tcol = [0xffffff, 0xffe066, 0xff8fb1, 0x8fe3ff];
                for (var tq = 0; tq < 20; tq++) {
                    var tyy = 190 + ((tq * 137) % 430), tmed = (tyy - 140) / 500 * 112, txx = 160 + ((((tq * 61) % 100) / 50) - 1) * tmed;
                    g.fillStyle(tcol[tq % 4], 0.12 + 0.6 * Math.max(0, Math.sin(s * 2.2 + tq * 1.7)));
                    g.fillCircle(txx * kx, tyy * ky, 2.3 * kx);
                }
                if (this.dlampara && this.dlampara.active) this.dlampara.angle = Math.sin(s * 1.1) * 0.8;
            }
            if (!this.arteOk) {
            // Péndulo del cuco / reloj de pared y lámpara colgante.
            var rx = L.W * 0.46, ry = L.H * 0.12;
            g.fillStyle(0x7a4419, 1); g.fillRoundedRect(rx - 34, ry - 52, 68, 100, 12); g.fillTriangle(rx - 42, ry - 50, rx + 42, ry - 50, rx, ry - 92);
            g.fillStyle(0xfff9db, 1); g.fillCircle(rx, ry - 14, 24); g.lineStyle(3, 0x5c3312, 1); g.strokeCircle(rx, ry - 14, 24);
            var ang = s * 2; g.lineStyle(3, 0x212529, 1); g.lineBetween(rx, ry - 14, rx + Math.cos(ang) * 14, ry - 14 + Math.sin(ang) * 14); g.lineBetween(rx, ry - 14, rx + Math.cos(ang / 12) * 9, ry - 14 + Math.sin(ang / 12) * 9);
            var sw = Math.sin(s * 3) * 12; g.lineStyle(3, 0x495057, 1); g.lineBetween(rx, ry + 34, rx + sw, ry + 76); g.fillStyle(0xfab005, 1); g.fillCircle(rx + sw, ry + 80, 8);
            if (this.cuco && time - this.cuco < 1500) { var ce = Math.min(1, (time - this.cuco) / 200); g.fillStyle(0xe03131, 1); g.fillCircle(rx, ry - 52 + 24 * (1 - ce) - 2, 10 * ce + 2); }
            // Lámpara colgante sobre el pedestal: cono de luz que marca dónde se construye.
            var Pq = L.ped;
            g.lineStyle(3, 0x343a40, 1); g.lineBetween(Pq.x, 0, Pq.x, L.H * 0.1);
            g.fillStyle(0xd9a05b, 1); g.fillTriangle(Pq.x - 52, L.H * 0.1 + 28, Pq.x + 52, L.H * 0.1 + 28, Pq.x, L.H * 0.1 - 10);
            g.fillStyle(0xfff3bf, 1); g.fillEllipse(Pq.x, L.H * 0.1 + 30, 48, 10);
            g.fillStyle(0xfff3bf, 0.07 + 0.015 * Math.sin(s * 3)); g.fillTriangle(Pq.x - 40, L.H * 0.1 + 32, Pq.x + 40, L.H * 0.1 + 32, Pq.x + 150, Pq.top); g.fillTriangle(Pq.x - 40, L.H * 0.1 + 32, Pq.x - 150, Pq.top, Pq.x + 150, Pq.top);
}

            // Sombra donde caería el bloque que sostienes y marca del dedo.
            var sh = this.sombraG; sh.clear();
            var dg = this.dedoG; dg.clear();
            if (this.arr) {
                var ab = this.arr.b, ap = ab.body.position, base = L.banco, others = [];
                this.bloques.forEach(function (q) { if (q !== ab) others.push(q.body); });
                var rayo = M.Query.ray(this.estaticosF.concat(others), { x: ap.x, y: ap.y + ab.h / 2 }, { x: ap.x, y: ap.y + 900 }, ab.w * 0.7);
                rayo.forEach(function (rc) { var bb = rc.bodyA === ab.body ? rc.bodyB : rc.bodyA; if (bb && bb.bounds.min.y > ap.y + ab.h / 2 - 4 && bb.bounds.min.y < base) base = bb.bounds.min.y; });
                var alt = Math.max(0, Math.min(1, (base - (ap.y + ab.h / 2)) / 300));
                sh.fillStyle(0x000000, 0.3 * (1 - alt * 0.6)); sh.fillEllipse(ap.x, base - 2, ab.w * (1 - alt * 0.3), 12);
                sh.lineStyle(2, 0xfff3bf, 0.35 * (1 - alt)); sh.lineBetween(ap.x - ab.w * 0.4, ap.y + ab.h / 2, ap.x - ab.w * 0.4, base);
                sh.lineBetween(ap.x + ab.w * 0.4, ap.y + ab.h / 2, ap.x + ab.w * 0.4, base);
                var pc = this.arr.cons.pointA;
                for (var rk = 0; rk < 2; rk++) { var fr = (s * 1.4 + rk / 2) % 1; dg.lineStyle(3 * (1 - fr) + 1, 0xffffff, 0.7 * (1 - fr)); dg.strokeCircle(pc.x, pc.y, 14 + fr * 30); }
            }
            if (this.etiqueta && this.etiqueta.active) {
                var hayTorre = this.bloques.some(function (b) { return b.asentado && Math.abs(b.body.position.x - L.ped.x) < L.ped.w; });
                var verEt = this.fase === 'jugar' && !hayTorre && !this.arr && this.etiquetaOk !== false;
                this.etiqueta.setAlpha(verEt ? 1 : 0);
                if (hayTorre) this.etiquetaOk = false;
            }
            // Brillo cálido de las lámparas sobre el banco.
            var lg = this.luzG; lg.clear();
            [0.3, 0.52, 0.76].forEach(function (f2, i) { lg.fillStyle(0xffe9a8, 0.05 + 0.012 * Math.sin(s * 2 + i)); lg.fillEllipse(L.W * f2, L.banco - 20, 340, 120); });
            // El duende respira.
            if (this.elfo && this.elfo.cont.active && !this.tweens.isTweening(this.elfo.cont)) this.elfo.cont.y = this.elfo.base + Math.sin(s * 2.2) * 1.6;
            // Ayuda: halo sobre el bloque que sigue.
            if (this.ayuda && this.fase === 'jugar' && this.song && !this.completa) {
                var sig = this.song[this.prog], T = this.torre();
                this.bloques.forEach(function (b) { if (b.id === sig && T.indexOf(b) < 0) { lg.fillStyle(0xffe066, 0.22 + 0.12 * Math.sin(s * 6)); lg.fillCircle(b.body.position.x, b.body.position.y, Math.max(b.w, b.h) * 0.8); } });
            }
        }
    };

    K.crear({ id: 'taller', fondo: '#2c6e6a', escena: escena });
})(typeof window !== 'undefined' ? window : this);
