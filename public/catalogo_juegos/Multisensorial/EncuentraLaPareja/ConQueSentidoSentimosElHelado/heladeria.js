/**
 * PedniaHeladeria — "La heladería del mar" (¿Con qué sentido sentimos el helado?, 3-4 años).
 *
 * Un paseo junto al mar con un quiosco de helados. La lengua es la protagonista y cada acierto
 * llena una copa gigante de helado.
 *   1. El helado      (reto del documento): un helado con chispas gotea sobre el mostrador; se toca la
 *                     burbuja de la lengua o se arrastra el helado. Lengüetazo con "¡Miam-miam!".
 *   2. Los sabores    en la vitrina hay fresa, chocolate y limón: se toca una tina, sale un cono y se
 *                     lleva a la boca. La lengua reacciona a cada sabor (dulce, rico, ¡ácido!).
 *   3. ¿Qué se come?  en el mostrador aparecen tres cosas: solo una se saborea. Las demás van a su
 *                     sentido (la campana al oído, la flor a la nariz, el sol a los ojos).
 *   Final: la cereza cae sobre la copa y la lengua le da un gran lengüetazo.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var A = function () { return global.PedniaArte; };

    var SENTIDO = { campana: 'oido', flor: 'nariz', sol: 'ojo', manzana: 'lengua', galleta: 'lengua', menta: 'lengua' };
    var NOMBRE = { campana: 'La campana', flor: 'La flor', sol: 'El sol', manzana: 'la manzana', galleta: 'la galleta', menta: 'el helado de menta' };
    var COMO = { oido: 'se escucha con el oído', nariz: 'se huele con la nariz', ojo: 'se mira con los ojos' };
    var SABOR = {
        fresa: { color: 0xf783ac, voz: 'zoe', texto: '¡Mmm, fresa! Es dulce. La lengua saborea lo dulce.' },
        choco: { color: 0x8a5a2b, voz: 'zoe', texto: '¡Chocolate! ¡Qué rico sabor!' },
        limon: { color: 0xfcc419, voz: 'zeus', texto: '¡Uy, el limón es ácido! La lengua también siente lo ácido.' }
    };

    var escena = {
        create: function () {
            this.copa = [];
            this.modo = '';
            this.olas = 0;
            this.arr = B.arrastrador(this);
            var ops = ((this.reto && this.reto.opciones) || ['oido', 'nariz', 'lengua', 'ojo']).filter(function (o) { return o !== 'mano'; });
            this.dibujarFondo();
            this.fila = B.filaOrganos(this, ops, { depth: 20 });
            this.organos = this.fila.organos;
            this.input.on('pointerdown', this.alTocar, this);
            this.input.on('pointermove', this.alMover, this);
            this.input.on('pointerup', this.alSoltar, this);
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.fila.ubicar(); });
        },

        m: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var kw = Math.min(w * 0.42, 480);
            return {
                w: w, h: h,
                mar: h * 0.4,
                arena: h * 0.54,
                cx: w * 0.5,
                kw: kw,
                kh: h * 0.36,
                base: h * 0.64,
                obj: Phaser.Math.Clamp(Math.min(w, h) * 0.2, 90, 170),
                r: this.fila ? this.fila.radio() : 60
            };
        },

        /* ── Escenario: paseo marítimo ─────────────────────────── */

        dibujarFondo: function () {
            var m = this.m();
            var w = m.w;
            var h = m.h;
            U.cielo(this, 'hl:cielo', [[0, '#4dabf7'], [0.7, '#a5d8ff'], [1, '#e7f5ff']]);
            if (!this.cielo) this.cielo = this.add.image(0, 0, 'hl:cielo').setOrigin(0).setDepth(-30);
            this.cielo.setDisplaySize(w, m.mar + 2);
            var f = this.fondoG || (this.fondoG = this.add.graphics().setDepth(-28));
            f.clear();
            f.fillStyle(0xfff3bf, 0.45);
            f.fillCircle(w * 0.64, h * 0.14, 60);
            f.fillStyle(0xffe066, 1);
            f.fillCircle(w * 0.64, h * 0.14, 32);
            // Mar con franjas de profundidad.
            f.fillStyle(0x1c7ed6, 1);
            f.fillRect(0, m.mar, w, m.arena - m.mar);
            f.fillStyle(0x339af0, 1);
            f.fillRect(0, m.mar + (m.arena - m.mar) * 0.35, w, (m.arena - m.mar) * 0.65);
            f.fillStyle(0x66d9e8, 1);
            f.fillRect(0, m.mar + (m.arena - m.mar) * 0.75, w, (m.arena - m.mar) * 0.25);
            // Arena y paseo de tablas.
            f.fillStyle(0xf8e1a8, 1);
            f.fillRect(0, m.arena, w, h - m.arena);
            f.fillStyle(0xffffff, 0.6);
            f.fillEllipse(w * 0.5, m.arena + 2, w * 1.1, 10);
            var ytab = m.base + 10;
            f.fillStyle(0xc9935a, 1);
            f.fillRect(0, ytab, w, h - ytab);
            f.lineStyle(2, 0xa0703c, 1);
            for (var y = ytab; y < h; y += 22) f.lineBetween(0, y, w, y);
            for (var x = 0; x < w; x += 90) {
                for (var yy = ytab; yy < h; yy += 44) f.lineBetween(x + ((yy / 22) % 2) * 45, yy, x + ((yy / 22) % 2) * 45, yy + 22);
            }
            // Conchas y estrellas de mar en la arena.
            [[0.08, 0.6], [0.3, 0.58], [0.72, 0.6], [0.95, 0.57]].forEach(function (p, i) {
                f.fillStyle(i % 2 ? 0xff8787 : 0xffa94d, 1);
                var sx = w * p[0];
                var sy = h * p[1];
                for (var k = 0; k < 5; k++) {
                    var a = k / 5 * Math.PI * 2 - Math.PI / 2;
                    f.fillTriangle(sx, sy, sx + Math.cos(a - 0.3) * 6, sy + Math.sin(a - 0.3) * 6, sx + Math.cos(a) * 14, sy + Math.sin(a) * 14);
                    f.fillTriangle(sx, sy, sx + Math.cos(a + 0.3) * 6, sy + Math.sin(a + 0.3) * 6, sx + Math.cos(a) * 14, sy + Math.sin(a) * 14);
                }
            });
            this.dibujarPalmera(f, w * 0.08, m.base + 6, h * 0.36);
            this.dibujarSombrilla(f, w * 0.93, m.base + 6, h * 0.22);
            if (!this.olasG) this.olasG = this.add.graphics().setDepth(-27);
            if (!this.velero) this.crearVelero();
            if (!this.gaviota) this.gaviota = this.add.graphics().setDepth(-26);
            this.dibujarQuiosco(m);
            this.dibujarCopa(m);
        },

        dibujarPalmera: function (f, x, y, alto) {
            f.fillStyle(0x000000, 0.12);
            f.fillEllipse(x + 20, y, 90, 14);
            for (var i = 0; i < 10; i++) {
                var k = i / 10;
                f.fillStyle(i % 2 ? 0x8a5a2b : 0xa0703c, 1);
                f.fillEllipse(x + Math.sin(k * 1.2) * 26, y - k * alto, 20 - k * 6, alto / 9);
            }
            var tx = x + Math.sin(1.2) * 26;
            var ty = y - alto;
            [[-2.6, 0x2b8a3e], [-2.0, 0x37b24d], [-1.2, 0x2f9e44], [-0.5, 0x37b24d], [0.2, 0x2b8a3e]].forEach(function (h) {
                f.fillStyle(h[1], 1);
                f.beginPath();
                f.moveTo(tx, ty);
                f.lineTo(tx + Math.cos(h[0] - 0.25) * 40, ty + Math.sin(h[0] - 0.25) * 40 - 6);
                f.lineTo(tx + Math.cos(h[0]) * 90, ty + Math.sin(h[0]) * 90 + 30);
                f.lineTo(tx + Math.cos(h[0] + 0.25) * 40, ty + Math.sin(h[0] + 0.25) * 40 + 6);
                f.closePath();
                f.fillPath();
            });
            f.fillStyle(0x6b3e1f, 1);
            f.fillCircle(tx - 6, ty + 6, 7);
            f.fillCircle(tx + 6, ty + 8, 7);
        },

        dibujarSombrilla: function (f, x, y, alto) {
            f.fillStyle(0xdee2e6, 1);
            f.fillRect(x - 3, y - alto, 6, alto);
            var r = alto * 0.55;
            for (var i = 0; i < 6; i++) {
                f.fillStyle(i % 2 ? 0xffffff : 0xfa5252, 1);
                f.beginPath();
                f.moveTo(x, y - alto - r * 0.3);
                f.arc(x, y - alto + r * 0.25, r, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6);
                f.closePath();
                f.fillPath();
            }
        },

        crearVelero: function () {
            var v = this.add.container(0, 0).setDepth(-27);
            var g = this.add.graphics();
            g.fillStyle(0x7a4a24, 1);
            g.fillTriangle(-26, 0, 26, 0, 18, 10);
            g.fillTriangle(-26, 0, -18, 10, 18, 10);
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(0, -44, 0, -4, 24, -6);
            g.fillStyle(0xff8787, 1);
            g.fillTriangle(-2, -38, -2, -4, -20, -6);
            v.add(g);
            this.velero = v;
        },

        dibujarQuiosco: function (m) {
            var g = this.quioscoG || (this.quioscoG = this.add.graphics().setDepth(-14));
            g.clear();
            var cx = m.cx;
            var kw = m.kw;
            var kh = m.kh;
            var base = m.base;
            var top = base - kh;
            this.mostrador = base - kh * 0.34;
            // Sombra.
            g.fillStyle(0x000000, 0.14);
            g.fillEllipse(cx, base + 8, kw * 1.1, 22);
            // Paredes pastel.
            g.fillStyle(0xffc9de, 1);
            g.fillRect(cx - kw / 2, top + kh * 0.2, kw, kh * 0.8);
            g.fillStyle(0xfcc2d7, 1);
            for (var i = 0; i < 8; i++) g.fillRect(cx - kw / 2 + i * kw / 8, top + kh * 0.2, kw / 16, kh * 0.8);
            // Ventana (interior) con estantes.
            var vx = cx - kw * 0.4;
            var vw = kw * 0.8;
            var vy = top + kh * 0.24;
            var vh = this.mostrador - vy;
            g.fillStyle(0xfff4e6, 1);
            g.fillRect(vx, vy, vw, vh);
            g.fillStyle(0xffe8cc, 1);
            g.fillRect(vx, vy + vh * 0.55, vw, vh * 0.45);
            g.fillStyle(0xe9ecef, 1);
            g.fillRect(vx, vy + vh * 0.5, vw, 6);
            this.vitrina = { x: vx, y: vy, w: vw, h: vh };
            // Mostrador.
            g.fillStyle(0xffffff, 1);
            g.fillRoundedRect(cx - kw * 0.52, this.mostrador - 8, kw * 1.04, 20, 6);
            g.fillStyle(0xf1f3f5, 1);
            g.fillRect(cx - kw * 0.52, this.mostrador + 8, kw * 1.04, 6);
            // Toldo a rayas con festón.
            var tt = top + kh * 0.04;
            var tb = top + kh * 0.22;
            var n = 9;
            for (var r = 0; r < n; r++) {
                var x0 = cx - kw * 0.58 + r * kw * 1.16 / n;
                g.fillStyle(r % 2 ? 0xffffff : 0x63e6be, 1);
                g.beginPath();
                g.moveTo(x0 + kw * 0.06 * (1 - r / (n / 2)), tt);
                g.lineTo(x0 + kw * 1.16 / n + kw * 0.06 * (1 - (r + 1) / (n / 2)), tt);
                g.lineTo(x0 + kw * 1.16 / n, tb);
                g.lineTo(x0, tb);
                g.closePath();
                g.fillPath();
                g.fillCircle(x0 + kw * 1.16 / n / 2, tb, kw * 1.16 / n / 2);
            }
            // Techo y letrero.
            g.fillStyle(0xf06595, 1);
            g.fillRoundedRect(cx - kw * 0.54, top - kh * 0.02, kw * 1.08, kh * 0.08, 8);
            if (!this.letrero) {
                this.letrero = this.add.container(cx, top - kh * 0.16).setDepth(-13);
                var disco = this.add.circle(0, 0, kh * 0.17, 0xffffff).setStrokeStyle(5, 0xf06595);
                var hel = this.add.image(0, 0, A().textura(this, 'helado', 200)).setDisplaySize(kh * 0.3, kh * 0.3);
                this.letrero.add([disco, hel]);
            }
            this.letrero.setPosition(cx, top - kh * 0.14);
            // Tinas de sabores en la vitrina.
            if (!this.tinas) {
                this.crearTinas();
                // Las tinas aparecen en la ronda de sabores (en el reto del helado la vitrina está vacía).
                this.tinas.forEach(function (tn) { tn.setVisible(false); });
            }
            this.ubicarTinas();
        },

        crearTinas: function () {
            var scene = this;
            this.tinas = ['fresa', 'choco', 'limon'].map(function (s) {
                var c = scene.add.container(0, 0).setDepth(-12);
                var g = scene.add.graphics();
                var bola = scene.add.image(0, -6, A().textura(scene, 'bola_' + s, 128));
                c.add([bola, g]);
                c.sabor = s;
                c.bola = bola;
                c.g = g;
                return c;
            });
        },

        ubicarTinas: function () {
            var v = this.vitrina;
            var scene = this;
            var tw = Math.min(v.w / 3.6, 110);
            this.tinas.forEach(function (c, i) {
                c.setPosition(v.x + v.w * (0.2 + i * 0.3), v.y + v.h * 0.78);
                c.tw = tw;
                c.bola.setDisplaySize(tw * 0.9, tw * 0.9).setY(-tw * 0.12);
                c.g.clear();
                c.g.fillStyle(0xced4da, 1);
                c.g.fillRoundedRect(-tw / 2, -tw * 0.06, tw, tw * 0.36, 6);
                c.g.fillStyle(0xf8f9fa, 1);
                c.g.fillRoundedRect(-tw / 2 + 3, -tw * 0.04, tw - 6, tw * 0.1, 4);
                void scene;
            });
        },

        dibujarCopa: function (m) {
            var x = m.w * 0.8;
            var y = m.base - 6;
            var g = this.mesaG || (this.mesaG = this.add.graphics().setDepth(-11));
            g.clear();
            // Mesita.
            g.fillStyle(0x000000, 0.12);
            g.fillEllipse(x, y + m.obj * 0.36, m.obj * 0.9, 14);
            g.fillStyle(0xf8f9fa, 1);
            g.fillRect(x - 4, y, 8, m.obj * 0.34);
            g.fillEllipse(x, y + m.obj * 0.34, m.obj * 0.5, 10);
            g.fillStyle(0x63e6be, 1);
            g.fillEllipse(x, y, m.obj * 0.9, 18);
            if (!this.copaCont) {
                this.copaCont = this.add.container(x, y).setDepth(-10);
                this.bolasCont = this.add.container(0, 0);
                var vidrio = this.add.graphics();
                var cw = m.obj * 0.68;
                vidrio.fillStyle(0xffffff, 0.35);
                vidrio.beginPath();
                vidrio.moveTo(-cw / 2, -cw * 1.1);
                vidrio.lineTo(cw / 2, -cw * 1.1);
                vidrio.lineTo(cw * 0.18, -cw * 0.35);
                vidrio.lineTo(-cw * 0.18, -cw * 0.35);
                vidrio.closePath();
                vidrio.fillPath();
                vidrio.lineStyle(3, 0xa5d8ff, 1);
                vidrio.strokePath();
                vidrio.fillStyle(0xd0ebff, 1);
                vidrio.fillRect(-4, -cw * 0.35, 8, cw * 0.3);
                vidrio.fillEllipse(0, -cw * 0.04, cw * 0.6, 10);
                vidrio.fillStyle(0xffffff, 0.7);
                vidrio.fillRect(-cw * 0.36, -cw * 1.02, 5, cw * 0.4);
                this.copaCont.add([this.bolasCont, vidrio]);
                this.copaCont.cw = cw;
            }
            this.copaCont.setPosition(x, y);
        },

        /** Añade una bola (o una galleta, manzana…) a la copa gigante. */
        aCopa: function (tex, desde) {
            var scene = this;
            var cw = this.copaCont.cw;
            var i = this.copa.length;
            var esBola = /^bola_/.test(tex);
            var col = i % 3;
            var fila = Math.floor(i / 3);
            var lx = (col - 1) * cw * 0.32 + (fila % 2 ? cw * 0.16 : 0);
            var ly = -cw * 1.05 - fila * cw * 0.3;
            var tam = esBola ? cw * 0.55 : cw * 0.5;
            var img = this.add.image(desde.x, desde.y, A().textura(this, tex, 128)).setDisplaySize(tam, tam).setDepth(30);
            var vuelo = this.add.container(desde.x, desde.y).setDepth(30);
            img.setPosition(0, 0);
            vuelo.add(img);
            this.copa.push(tex);
            return U.volarA(this, vuelo, this.copaCont.x + lx, this.copaCont.y + ly, 650, 1).then(function () {
                vuelo.remove(img);
                vuelo.destroy();
                img.setPosition(lx, ly).setAngle(esBola ? 0 : U.rnd(-25, 25));
                scene.bolasCont.add(img);
                scene.tweens.add({ targets: img, scaleY: { from: img.scaleY * 0.7, to: img.scaleY }, duration: 360, ease: 'Bounce.easeOut' });
                U.estallido(scene, scene.copaCont.x + lx, scene.copaCont.y + ly, { n: 8, dist: 60, tam: 16 });
            });
        },

        /* ── Objetos ───────────────────────────────────────────── */

        crearHelado: function (x, y, tam, sabor) {
            var c = this.add.container(x, y).setDepth(16);
            if (!sabor) {
                c.add(this.add.image(0, 0, A().textura(this, 'helado', 256)).setDisplaySize(tam, tam));
                c.goteo = { x: tam * 0.2, y: tam * 0.02 };
            } else {
                var cono = this.add.image(0, tam * 0.2, A().textura(this, 'cono', 200)).setDisplaySize(tam * 0.62, tam * 0.62);
                var bola = this.add.image(0, -tam * 0.12, A().textura(this, 'bola_' + sabor, 200)).setDisplaySize(tam * 0.6, tam * 0.6);
                c.add([cono, bola]);
                c.bola = bola;
                c.goteo = { x: tam * 0.18, y: -tam * 0.02 };
            }
            c.tam = tam;
            c.sabor = sabor;
            return c;
        },

        crearCosa: function (id, x, y, tam) {
            var c = this.add.container(x, y).setDepth(16);
            if (id === 'sol') {
                c.add(this.add.image(0, 0, A().textura(this, 'sol_rayos', 200)).setDisplaySize(tam, tam));
                c.add(this.add.image(0, 0, A().textura(this, 'sol', 200)).setDisplaySize(tam, tam));
            } else if (id === 'menta') {
                c.add(this.add.image(0, tam * 0.18, A().textura(this, 'cono', 200)).setDisplaySize(tam * 0.6, tam * 0.6));
                c.add(this.add.image(0, -tam * 0.12, A().textura(this, 'bola_menta', 200)).setDisplaySize(tam * 0.58, tam * 0.58));
            } else {
                c.add(this.add.image(0, 0, A().textura(this, id, 200)).setDisplaySize(tam * 0.85, tam * 0.85));
            }
            c.id = id;
            c.tam = tam;
            return c;
        },

        gotear: function (c) {
            if (!c || !c.goteo || !c.visible) return;
            var x = c.x + c.goteo.x * c.scale;
            var y = c.y + c.goteo.y * c.scale;
            var color = c.sabor ? SABOR[c.sabor].color : 0xf783ac;
            var d = this.add.image(x, y, A().textura(this, 'gota', 64)).setDisplaySize(12, 16).setTint(color).setDepth(15);
            var suelo = this.mostrador + 4;
            var scene = this;
            this.tweens.add({
                targets: d, y: suelo, duration: 650, ease: 'Quad.easeIn',
                onComplete: function () {
                    d.destroy();
                    var charco = scene.add.ellipse(x, suelo + 2, 6, 3, color, 0.85).setDepth(-9);
                    scene.tweens.add({ targets: charco, scaleX: 3, scaleY: 2, duration: 500, ease: 'Quad.easeOut' });
                    scene.tweens.add({ targets: charco, alpha: 0, delay: 4000, duration: 800, onComplete: function () { charco.destroy(); } });
                }
            });
        },

        /* ── Entrada ───────────────────────────────────────────── */

        alTocar: function (p) {
            if (this.pista) this.pista.reiniciar();
            this.ctx.quitarMano();
            if (!this.esperando || this.ocupado) return;
            var c = this.enMano;
            if (c && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < c.tam * 0.55) {
                this.arr.empezar(c, p);
                return;
            }
            if (this.modo === 'sabores' && !this.enMano) {
                var tina = this.tinas.find(function (t) { return !t.usada && Phaser.Math.Distance.Between(p.x, p.y, t.x, t.y) < t.tw * 0.6; });
                if (tina) { this.servir(tina); return; }
            }
            if (this.modo === 'que') {
                var cosa = (this.cosas || []).find(function (k) { return Phaser.Math.Distance.Between(p.x, p.y, k.x, k.y) < k.tam * 0.55; });
                if (cosa) { this.elegirCosa(cosa); return; }
            }
            var id = this.fila.en(p.x, p.y);
            if (id && this.enMano) this.elegir(id);
            else if (id) this.organos[id].reaccion('toca');
        },

        alMover: function (p) {
            if (!this.arr.cont || !p.isDown) return;
            this.arr.mover(p);
            var sobre = this.fila.en(p.x, p.y);
            var scene = this;
            this.fila.orden.forEach(function (id) { scene.organos[id].cont.setScale(id === sobre ? 1.12 : 1); });
        },

        alSoltar: function (p) {
            var r = this.arr.soltar(p);
            if (!r) return;
            var scene = this;
            this.fila.orden.forEach(function (id) { scene.organos[id].cont.setScale(1); });
            var sobre = this.fila.en(p.x, p.y);
            if (r.movido && sobre && this.esperando && !this.ocupado) this.elegir(sobre);
            else this.arr.devolver(r.cont, this.casa);
        },

        elegir: function (id) {
            if (!this.esperando || this.ocupado) return;
            if (id === 'lengua') {
                this.esperando = false;
                if (this.resolver) this.resolver(id);
                return;
            }
            this.ocupado = true;
            var scene = this;
            U.sfx('boing');
            this.organos[id].reaccion('error');
            var c = this.enMano;
            if (c) {
                this.tweens.killTweensOf(c);
                this.tweens.add({ targets: c, x: this.casa.x, y: this.casa.y, angle: 0, duration: 420, ease: 'Back.easeOut' });
                this.tweens.add({ targets: c, scaleY: { from: 0.86, to: 1 }, duration: 420, ease: 'Bounce.easeOut' });
            }
            var r = this.reto || {};
            var linea = null;
            if (this.modo === 'helado') {
                (r.errores || []).forEach(function (e) { if (!linea && (e.objetos || []).indexOf(id) >= 0) linea = e; });
                linea = linea || r.errorOtro;
            }
            this.ctx.decir(linea || { voz: 'zeus', texto: '¡El helado es para saborear! ¿Con qué saboreamos?' });
            this.time.delayedCall(800, function () { scene.ocupado = false; });
        },

        esperarEleccion: function () {
            var scene = this;
            this.esperando = true;
            this.ocupado = false;
            return new Promise(function (r) { scene.resolver = r; });
        },

        /** El objeto llega junto a la boca y la lengua lo saborea. */
        saborear: async function (c, sabor) {
            var boca = this.organos.lengua;
            this.arr.cont = null;
            // Se acerca por encima de la burbuja de la boca, sin tapar las burbujas vecinas.
            await U.volarA(this, c, boca.cont.x - boca.radio * 0.3, boca.cont.y - boca.radio * 1.35, 600, 0.6);
            this.tweens.add({ targets: c, x: c.x + boca.radio * 0.35, angle: 18, duration: 220, yoyo: true, repeat: 1 });
            U.sfx('lamer');
            await boca.lamer(1);
            U.sfx('miamMiam');
            await boca.lamer(1);
            if (sabor === 'limon') {
                // ¡Ácido! La boca se frunce y tiembla.
                this.tweens.add({ targets: boca.cuerpo, scaleX: 0.72, scaleY: 1.12, duration: 160, yoyo: true, repeat: 2 });
                this.tweens.add({ targets: boca.cuerpo, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 5, onComplete: function () { boca.cuerpo.angle = 0; } });
                for (var i = 0; i < 3; i++) {
                    var l = this.add.graphics().setDepth(40);
                    l.lineStyle(4, 0xfab005, 1);
                    l.lineBetween(0, 0, 14, -8);
                    l.setPosition(boca.cont.x + boca.radio * (0.7 + i * 0.2), boca.cont.y - boca.radio * (0.6 - i * 0.4));
                    this.tweens.add({ targets: l, alpha: 0, x: l.x + 20, duration: 700, delay: i * 80, onComplete: function () { this.targets[0].destroy(); } });
                }
                await U.esperar(this, 500);
            } else {
                await boca.reaccion('acierto');
                U.estallido(this, boca.cont.x, boca.cont.y - boca.radio, { n: 8, tex: 'corazon', dist: 80, tam: 20 });
            }
        },

        /* ── Rondas ────────────────────────────────────────────── */

        rondaHelado: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'helado';
            this.casa = { x: m.cx, y: this.mostrador - m.obj * 0.42 };
            var c = this.enMano = this.crearHelado(this.casa.x, this.casa.y - 80, m.obj);
            c.alpha = 0;
            this.tweens.add({ targets: c, alpha: 1, y: this.casa.y, duration: 650, ease: 'Bounce.easeOut' });
            this.goteo = this.time.addEvent({ delay: 1500, loop: true, callback: function () { if (!scene.arr.cont) scene.gotear(scene.enMano); } });
            await this.ctx.decir(this.reto.presentacion || { voz: 'zoe', texto: '¿Con qué parte de nuestro cuerpo sentimos su dulce sabor?' });
            this.pista = U.crearPista(this, 9000, function (cancelado) {
                var b = scene.organos.lengua.cont;
                return scene.ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, cancelado: cancelado, onPresionar: function () { scene.organos.lengua.reaccion('toca'); } });
            });
            this.pista.reiniciar();
            await this.esperarEleccion();
            this.pista.parar();
            this.goteo.remove();
            this.ctx.quitarMano();
            await this.saborear(c, 'fresa');
            await this.ctx.decir(this.reto.acierto || { voz: 'zoe', texto: '¡Muy bien!' }, { estado: 'acierto' });
            this.enMano = null;
            var desde = { x: c.x, y: c.y };
            this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: function () { c.destroy(); } });
            await this.aCopa('bola_fresa', desde);
            await this.aCopa('bola_vainilla', desde);
        },

        rondaSabores: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'sabores';
            this.tinas.forEach(function (tn, i) {
                tn.setVisible(true);
                tn.alpha = 0;
                scene.tweens.add({ targets: tn, alpha: 1, y: { from: tn.y - 20, to: tn.y }, duration: 400, delay: i * 120, ease: 'Bounce.easeOut' });
            });
            this.casa = { x: m.cx, y: this.mostrador - m.obj * 0.42 };
            await this.ctx.decir({ voz: 'zoe', texto: '¡Prueba los sabores! Toca un sabor de la vitrina y llévalo a la boca.' });
            this.probados = 0;
            this.tinas.forEach(function (t) { scene.tweens.add({ targets: t, scale: 1.08, duration: 500, yoyo: true, repeat: 1 }); });
            this.pista = U.crearPista(this, 8000, function (cancelado) {
                if (scene.enMano) {
                    var b = scene.organos.lengua.cont;
                    return scene.ctx.mano({ punto: { x: scene.enMano.x, y: scene.enMano.y }, holdMs: 300, cancelado: cancelado, arrastre: { dx: b.x - scene.enMano.x, dy: b.y - scene.enMano.y, durMs: 900 } });
                }
                var t = scene.tinas.find(function (tt) { return !tt.usada; });
                if (!t) return Promise.resolve();
                return scene.ctx.mano({ punto: { x: t.x, y: t.y }, holdMs: 400, cancelado: cancelado });
            });
            this.pista.reiniciar();
            this.esperando = true;
            this.ocupado = false;
            await new Promise(function (r) { scene.finSabores = r; });
            this.pista.parar();
        },

        servir: async function (tina) {
            var scene = this;
            var m = this.m();
            this.ocupado = true;
            tina.usada = true;
            U.sfx('pop');
            // La bola salta de la tina a un cono que sube desde el mostrador.
            var c = this.crearHelado(this.casa.x, this.mostrador + 20, m.obj * 0.9, tina.sabor);
            c.bola.setVisible(false);
            c.alpha = 0;
            await U.tween(this, { targets: c, y: this.casa.y, alpha: 1, duration: 450, ease: 'Back.easeOut' });
            var b = this.add.image(tina.x, tina.y - tina.tw * 0.12, A().textura(this, 'bola_' + tina.sabor, 128)).setDisplaySize(tina.tw * 0.9, tina.tw * 0.9).setDepth(17);
            await U.volarA(this, b, c.x, c.y - c.tam * 0.12, 450, b.scale * (c.tam * 0.6) / (tina.tw * 0.9), null, 60);
            b.destroy();
            c.bola.setVisible(true);
            this.tweens.add({ targets: c.bola, scaleY: { from: c.bola.scaleY * 0.7, to: c.bola.scaleY }, duration: 300, ease: 'Bounce.easeOut' });
            tina.bola.setAlpha(0.35);
            this.enMano = c;
            this.ocupado = false;
            this.esperando = true;
            this.goteo = this.time.addEvent({ delay: 1800, loop: true, callback: function () { if (!scene.arr.cont) scene.gotear(scene.enMano); } });
            await this.esperarEleccion();
            this.goteo.remove();
            await this.saborear(c, tina.sabor);
            var s = SABOR[tina.sabor];
            this.ctx.decir({ voz: s.voz, texto: s.texto }, { estado: 'acierto' });
            this.enMano = null;
            var desde = { x: c.x, y: c.y };
            this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: function () { c.destroy(); } });
            await this.aCopa('bola_' + tina.sabor, desde);
            this.probados += 1;
            this.esperando = true;
            if (this.probados >= 3 && this.finSabores) {
                await U.esperar(this, 1200);
                this.finSabores();
            }
        },

        rondaQue: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'que';
            // Fuera las tinas: en el mostrador solo quedan las cosas a elegir.
            this.tinas.forEach(function (tn) { scene.tweens.add({ targets: tn, alpha: 0, duration: 300, onComplete: function () { tn.setVisible(false); } }); });
            await this.ctx.decir({ voz: 'zeus', texto: 'En el mostrador hay cosas. ¿Cuál podemos saborear con la lengua?' });
            var comida = U.mezclar(['manzana', 'galleta', 'menta']);
            for (var ronda = 0; ronda < 3; ronda++) {
                var otras = U.mezclar(['campana', 'flor', 'sol']).slice(0, 2);
                var lista = U.mezclar([comida[ronda]].concat(otras));
                this.cosas = lista.map(function (id, i) {
                    var x = m.cx + (i - 1) * m.kw * 0.32;
                    var tamC = m.obj * 0.7;
                    var yC = scene.mostrador - tamC * 0.42;
                    var c = scene.crearCosa(id, x, yC, tamC);
                    c.alpha = 0;
                    c.y -= 40;
                    scene.tweens.add({ targets: c, alpha: 1, y: yC, duration: 450, delay: i * 120, ease: 'Bounce.easeOut' });
                    return c;
                });
                this.pista = U.crearPista(this, 8000, function (cancelado) {
                    var k = scene.cosas.find(function (c) { return SENTIDO[c.id] === 'lengua'; });
                    if (!k) return Promise.resolve();
                    return scene.ctx.mano({ punto: { x: k.x, y: k.y }, holdMs: 400, cancelado: cancelado });
                });
                this.pista.reiniciar();
                this.esperando = true;
                this.ocupado = false;
                await new Promise(function (r) { scene.resolverQue = r; });
                this.pista.parar();
                this.cosas.forEach(function (c) { scene.tweens.add({ targets: c, alpha: 0, y: c.y - 30, duration: 300, onComplete: function () { c.destroy(); } }); });
                this.cosas = [];
                await U.esperar(this, 500);
            }
        },

        elegirCosa: async function (c) {
            var scene = this;
            if (this.ocupado) return;
            this.ocupado = true;
            var sentido = SENTIDO[c.id];
            if (sentido === 'lengua') {
                this.esperando = false;
                this.cosas = this.cosas.filter(function (k) { return k !== c; });
                await this.saborear(c, c.id);
                var frases = { manzana: '¡Crunch! La manzana se saborea con la lengua.', galleta: '¡Qué rica galleta! La lengua la saborea.', menta: '¡Helado de menta! Fresquito y dulce.' };
                this.ctx.decir({ voz: 'zoe', texto: frases[c.id] }, { estado: 'acierto' });
                var desde = { x: c.x, y: c.y };
                this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: function () { c.destroy(); } });
                await this.aCopa(c.id === 'menta' ? 'bola_menta' : c.id, desde);
                await U.esperar(this, 500);
                this.ocupado = false;
                if (this.resolverQue) this.resolverQue();
                return;
            }
            // No se come: va a su propio sentido y se explica.
            var org = this.organos[sentido];
            this.cosas = this.cosas.filter(function (k) { return k !== c; });
            await U.volarA(this, c, org.cont.x, org.cont.y - org.radio * 1.35, 600, 0.8);
            if (sentido === 'ojo') org.gafas(true);
            if (sentido === 'oido') { var S = global.EncuentraSonidoSfx; if (S) S.reproducir('campana', { breve: true }); }
            if (sentido === 'nariz') U.sfx('sorber');
            await org.reaccion('acierto');
            this.ctx.decir({ voz: 'zeus', texto: NOMBRE[c.id] + ' no se come: ' + COMO[sentido] + '. ¡Busca lo que se saborea!' });
            this.tweens.add({ targets: c, alpha: 0, scale: c.scale * 0.5, duration: 400, onComplete: function () { c.destroy(); } });
            if (sentido === 'ojo') this.time.delayedCall(1300, function () { org.gafas(false); });
            this.ocupado = false;
            void scene;
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var m = this.m();
            this.modo = 'demo';
            await B.demoTambor(this, this.fila, m.cx, this.mostrador - m.obj * 0.36, m.obj * 0.8);
            this.modo = '';
        },

        jugar: async function () {
            await this.rondaHelado();
            if (!this.ctx.vivo()) return;
            await this.rondaSabores();
            if (!this.ctx.vivo()) return;
            await this.rondaQue();
        },

        fiestaFinal: async function () {
            var scene = this;
            var boca = this.organos.lengua;
            var cw = this.copaCont.cw;
            // Cae la cereza sobre la copa.
            var filas = Math.ceil(this.copa.length / 3);
            var cy = this.copaCont.y - cw * 1.05 - filas * cw * 0.3 - 10;
            var cereza = this.add.circle(this.copaCont.x, -30, cw * 0.11, 0xe03131).setDepth(31);
            var brillo = this.add.circle(this.copaCont.x - 3, -33, cw * 0.035, 0xffffff, 0.8).setDepth(32);
            this.tweens.add({ targets: [cereza, brillo], y: '+=' + (cy + 30), duration: 900, ease: 'Bounce.easeOut' });
            await U.esperar(this, 900);
            U.sfx('chispas');
            U.estallido(this, this.copaCont.x, cy, { n: 16, dist: 110 });
            await boca.lamer(1);
            U.sfx('miamMiam');
            U.sfx('celebracion');
            this.fila.orden.forEach(function (id, i) { scene.time.delayedCall(i * 120, function () { scene.organos[id].reaccion('acierto'); }); });
            U.confeti(this, 80);
            // Lluvia de chispas de colores.
            var m = this.m();
            for (var i = 0; i < 40; i++) {
                var ch = this.add.rectangle(U.rnd(0, m.w), -20, 5, 14, [0xe03131, 0x1c7ed6, 0x37b24d, 0xf59f00, 0xae3ec9][i % 5]).setDepth(70);
                this.tweens.add({ targets: ch, y: m.h + 20, angle: U.rnd(-360, 360), duration: U.rnd(1600, 2800), delay: U.rnd(0, 800), onComplete: function () { this.targets[0].destroy(); } });
            }
            await U.esperar(this, 2000);
        },

        update: function (time, delta) {
            var dt = Math.min(delta || 16, 50) / 1000;
            var m = this.m();
            var quieto = U.reducido();
            // Olas, velero y gaviota.
            var o = this.olasG;
            o.clear();
            o.lineStyle(3, 0xffffff, 0.7);
            for (var fila = 0; fila < 3; fila++) {
                var y = m.mar + (m.arena - m.mar) * (0.25 + fila * 0.28);
                for (var x = -60; x < m.w + 60; x += 80) {
                    var dx = quieto ? 0 : ((time / (40 + fila * 10)) % 80);
                    o.beginPath();
                    o.arc(x + dx + fila * 30, y, 14, Math.PI * 1.15, Math.PI * 1.85);
                    o.strokePath();
                }
            }
            if (this.velero) {
                this.velero.x = quieto ? m.w * 0.3 : ((time / 1000) * 12) % (m.w + 120) - 60;
                this.velero.y = m.mar + (m.arena - m.mar) * 0.3 + Math.sin(time / 600) * 2;
                this.velero.angle = Math.sin(time / 800) * 3;
            }
            var g = this.gaviota;
            g.clear();
            if (!quieto) {
                var gx = ((time / 1000) * 40) % (m.w + 200) - 100;
                var gy = m.h * 0.24 + Math.sin(time / 900) * 20;
                var ala = 6 + Math.sin(time / 150) * 6;
                g.lineStyle(3, 0x495057, 1);
                g.lineBetween(gx - 14, gy - ala, gx, gy);
                g.lineBetween(gx, gy, gx + 14, gy - ala);
            }
            if (this.letrero && !quieto) this.letrero.angle = Math.sin(time / 900) * 4;
            var foco = this.enMano ? { x: this.enMano.x, y: this.enMano.y } : (this.cosas && this.cosas[0] ? { x: this.cosas[0].x, y: this.cosas[0].y } : null);
            this.fila.actualizar(time, foco);
            void dt;
        },

        estado: function () {
            var scene = this;
            return {
                modo: this.modo,
                esperando: !!this.esperando,
                ocupado: !!this.ocupado,
                copa: this.copa.slice(),
                enMano: this.enMano ? { x: Math.round(this.enMano.x), y: Math.round(this.enMano.y) } : null,
                tinas: (this.tinas || []).map(function (t) { return { s: t.sabor, x: Math.round(t.x), y: Math.round(t.y), usada: !!t.usada }; }),
                cosas: (this.cosas || []).map(function (c) { return { id: c.id, x: Math.round(c.x), y: Math.round(c.y) }; }),
                organos: this.fila.orden.reduce(function (acc, id) { acc[id] = { x: Math.round(scene.organos[id].cont.x), y: Math.round(scene.organos[id].cont.y) }; return acc; }, {})
            };
        }
    };

    global.PedniaHeladeria = B.crearMotor({ id: 'heladeria', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
