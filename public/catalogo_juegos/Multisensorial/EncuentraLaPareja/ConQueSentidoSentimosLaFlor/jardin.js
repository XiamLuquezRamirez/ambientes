/**
 * PedniaJardin — "El jardín del perfume" (¿Con qué sentido sentimos la flor?, 3-4 años).
 *
 * Un jardín con arco de rosas, cerca blanca, mariposas y un pajarito. La nariz es la protagonista.
 *   1. La flor        (reto del documento): una flor en su maceta suelta espirales de perfume; se toca la
 *                     burbuja de la nariz o se arrastra la maceta hasta ella. La nariz aspira y suelta corazones.
 *   2. Atrapa aromas  la nariz sale de su burbuja y el niño la mueve para atrapar el perfume que baja de las
 *                     flores. Si atrapa una nota del pajarito, la nota rebota hacia el oído (Zeus lo explica).
 *                     Cada aroma llena el frasco de perfume.
 *   3. ¿Dónde huele?  una flor se esconde en un arbusto y solo se ve su perfume salir; en otro se esconde el
 *                     pajarito que canta. Tocar el arbusto que huele.
 *   Final: el ramo del jarrón completo y la nariz da un gran respiro.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var A = function () { return global.PedniaArte; };
    var COLORES = ['amarilla', 'azul', 'morada', 'roja', 'blanca'];

    var escena = {
        create: function () {
            this.cayendo = [];
            this.ramo = [];
            this.mariposas = [];
            this.floresCerca = [];
            this.nivelPerfume = 0;
            this.modo = '';
            this.arr = B.arrastrador(this);
            var ops = ((this.reto && this.reto.opciones) || ['lengua', 'oido', 'nariz', 'ojo']).filter(function (o) { return o !== 'mano'; });
            this.dibujarFondo();
            this.fila = B.filaOrganos(this, ops, { depth: 20 });
            this.organos = this.fila.organos;
            this.crearMariposas();
            this.input.on('pointerdown', this.alTocar, this);
            this.input.on('pointermove', this.alMover, this);
            this.input.on('pointerup', this.alSoltar, this);
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.fila.ubicar(); });
        },

        m: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            return {
                w: w, h: h,
                suelo: h * 0.6,
                cx: w * 0.5,
                aw: Math.min(w * 0.3, 360, h * 0.5),
                obj: Phaser.Math.Clamp(Math.min(w, h) * 0.2, 90, 170),
                r: this.fila ? this.fila.radio() : 60
            };
        },

        /* ── Escenario ──────────────────────────────────────────── */

        dibujarFondo: function () {
            var m = this.m();
            var w = m.w;
            var h = m.h;
            var scene = this;
            U.cielo(this, 'jd:cielo', [[0, '#7cc4f2'], [0.6, '#cfe9fb'], [1, '#ffe9d1']]);
            if (!this.cielo) this.cielo = this.add.image(0, 0, 'jd:cielo').setOrigin(0).setDepth(-30);
            this.cielo.setDisplaySize(w, m.suelo);

            var f = this.fondoG || (this.fondoG = this.add.graphics().setDepth(-28));
            f.clear();
            // Sol suave detrás de los árboles.
            f.fillStyle(0xfff3bf, 0.5);
            f.fillCircle(w * 0.2, h * 0.24, 70);
            f.fillStyle(0xffe066, 1);
            f.fillCircle(w * 0.2, h * 0.24, 38);
            // Arboleda lejana.
            for (var i = 0; i < 14; i++) {
                var x = (i / 13) * w;
                var r = h * (0.07 + ((i * 37) % 10) / 100);
                f.fillStyle(i % 2 ? 0x5fae6b : 0x4f9e5c, 1);
                f.fillCircle(x, m.suelo - h * 0.08, r);
            }
            f.fillStyle(0x4f9e5c, 1);
            f.fillRect(0, m.suelo - h * 0.08, w, h * 0.08);
            // Césped.
            f.fillStyle(0x7ccf6b, 1);
            f.fillRect(0, m.suelo - h * 0.02, w, h - m.suelo + h * 0.02);
            f.fillStyle(0x6cc05c, 1);
            for (var k = 0; k < 40; k++) {
                var gx = (k * 97) % w;
                var gy = m.suelo + ((k * 53) % 100) / 100 * (h - m.suelo);
                f.fillTriangle(gx, gy, gx + 4, gy - 10, gx + 8, gy);
            }
            // Camino de piedras.
            [[0.5, 0.97, 70], [0.47, 0.88, 58], [0.53, 0.8, 50], [0.49, 0.73, 42], [0.52, 0.67, 34]].forEach(function (p) {
                f.fillStyle(0xbfb3a4, 1);
                f.fillEllipse(w * p[0], h * p[1] + 3, p[2] * 2, p[2] * 0.62);
                f.fillStyle(0xe2d7c8, 1);
                f.fillEllipse(w * p[0], h * p[1], p[2] * 2, p[2] * 0.6);
            });
            this.dibujarCerca(m);
            this.dibujarArco(m);
            this.dibujarMesa(m);
            this.dibujarParterres(m);
        },

        dibujarCerca: function (m) {
            var g = this.cercaG || (this.cercaG = this.add.graphics().setDepth(-24));
            g.clear();
            var y0 = m.suelo - m.h * 0.12;
            var y1 = m.suelo + 4;
            g.fillStyle(0xe9ecef, 1);
            g.fillRect(0, y0 + (y1 - y0) * 0.25, m.w, 8);
            g.fillRect(0, y0 + (y1 - y0) * 0.7, m.w, 8);
            for (var x = 6; x < m.w; x += 26) {
                g.fillStyle(0xffffff, 1);
                g.fillRect(x, y0 + 8, 16, y1 - y0 - 8);
                g.fillTriangle(x, y0 + 8, x + 16, y0 + 8, x + 8, y0 - 4);
                g.fillStyle(0xdee2e6, 1);
                g.fillRect(x + 12, y0 + 8, 4, y1 - y0 - 8);
            }
            // Flores detrás de la cerca (se mecen en update).
            if (!this.floresCerca.length) {
                for (var i = 0; i < 16; i++) {
                    var fx = (i + 0.5) / 16 * m.w + U.rnd(-10, 10);
                    var tam = U.rnd(42, 60);
                    var img = this.add.image(fx, y0 + 18, A().textura(this, i % 3 ? 'flor_' + COLORES[i % 5] : 'flor', 128))
                        .setOrigin(0.5, 0.95).setDisplaySize(tam, tam).setDepth(-25);
                    img.fase = Math.random() * 6;
                    this.floresCerca.push(img);
                }
            } else {
                this.floresCerca.forEach(function (img, i) { img.x = (i + 0.5) / 16 * m.w; img.y = y0 + 18; });
            }
        },

        dibujarArco: function (m) {
            var g = this.arcoG || (this.arcoG = this.add.graphics().setDepth(-22));
            g.clear();
            var cx = m.cx;
            var aw = m.aw;
            var base = m.suelo + 6;
            // El arco (y el pajarito de arriba) queda por debajo del globo de diálogo.
            var alto = Math.min(m.h * 0.36, base - 118 - aw * 0.2);
            var top = base - alto;
            // Postes.
            [-1, 1].forEach(function (s) {
                g.fillStyle(0xffffff, 1);
                g.fillRect(cx + s * aw / 2 - 8, top + aw * 0.3, 16, alto - aw * 0.3);
                g.fillStyle(0xdee2e6, 1);
                g.fillRect(cx + s * aw / 2 + 2, top + aw * 0.3, 6, alto - aw * 0.3);
            });
            // Arco blanco.
            g.lineStyle(14, 0xffffff, 1);
            g.beginPath();
            g.arc(cx, top + aw * 0.3, aw / 2, Math.PI, 0);
            g.strokePath();
            // Enredadera con hojas y rosas.
            var scene = this;
            this.rosas = [];
            for (var i = 0; i <= 22; i++) {
                var a = Math.PI + (i / 22) * Math.PI;
                var x = cx + Math.cos(a) * aw / 2;
                var y = top + aw * 0.3 + Math.sin(a) * aw / 2;
                g.fillStyle(i % 2 ? 0x2f9e44 : 0x40c057, 1);
                g.fillEllipse(x + U.rnd(-8, 8), y + U.rnd(-6, 6), 22, 14);
            }
            for (var j = 0; j < 9; j++) {
                var yy = top + aw * 0.3 + j * (alto - aw * 0.3) / 9;
                [-1, 1].forEach(function (s) {
                    g.fillStyle(j % 2 ? 0x2f9e44 : 0x40c057, 1);
                    g.fillEllipse(cx + s * aw / 2 + (j % 2 ? 8 : -8), yy, 18, 12);
                });
            }
            [[0.15, 0], [0.35, -1], [0.55, 1], [0.75, 0], [0.92, -1]].forEach(function (p, k) {
                var a2 = Math.PI + p[0] * Math.PI;
                var rx = cx + Math.cos(a2) * aw / 2;
                var ry = top + aw * 0.3 + Math.sin(a2) * aw / 2;
                scene.rosas.push({ x: rx, y: ry });
                g.fillStyle(k % 2 ? 0xf06595 : 0xe03131, 1);
                g.fillCircle(rx, ry, 9);
                g.fillStyle(0xffffff, 0.35);
                g.fillCircle(rx - 3, ry - 3, 3);
            });
            [0.3, 0.6].forEach(function (k, n) {
                [-1, 1].forEach(function (s) {
                    var ry = top + aw * 0.3 + k * (alto - aw * 0.3);
                    g.fillStyle(n ? 0xf06595 : 0xe03131, 1);
                    g.fillCircle(cx + s * aw / 2, ry, 8);
                });
            });
            this.ramaPajaro = { x: cx + aw * 0.12, y: top + aw * 0.3 - aw / 2 - 4 };
            if (!this.pajaro) this.crearPajaro();
            this.pajaro.setPosition(this.ramaPajaro.x, this.ramaPajaro.y);
        },

        crearPajaro: function () {
            var p = this.add.container(0, 0).setDepth(-21);
            var g = this.add.graphics();
            g.fillStyle(0x1971c2, 1);
            g.fillEllipse(-14, 2, 16, 8);
            g.fillStyle(0x339af0, 1);
            g.fillCircle(0, -6, 13);
            g.fillStyle(0xd0ebff, 1);
            g.fillEllipse(3, -2, 14, 12);
            g.fillStyle(0x339af0, 1);
            g.fillCircle(6, -18, 9);
            g.fillStyle(0xfab005, 1);
            g.fillTriangle(13, -19, 21, -17, 13, -14);
            g.fillStyle(0x212529, 1);
            g.fillCircle(8, -20, 2);
            g.fillStyle(0xfab005, 1);
            g.fillRect(-3, 6, 2, 6);
            g.fillRect(3, 6, 2, 6);
            var alaG = this.add.graphics();
            alaG.fillStyle(0x1864ab, 1);
            alaG.fillEllipse(-4, -6, 16, 10);
            p.add([g, alaG]);
            p.ala = alaG;
            this.pajaro = p;
        },

        cantar: function (n) {
            var p = this.pajaro;
            var S = global.EncuentraSonidoSfx;
            if (S) S.acompanar('trino', { breve: true, vol: 0.45, pan: (p.x / this.scale.width) * 1.4 - 0.7 });
            this.tweens.add({ targets: p, angle: { from: -8, to: 8 }, duration: 120, yoyo: true, repeat: 2, onComplete: function () { p.angle = 0; } });
            this.tweens.add({ targets: p.ala, scaleY: 0.4, duration: 80, yoyo: true, repeat: 3 });
            if (n) U.notas(this, p.x, p.y - 20, n);
        },

        dibujarMesa: function (m) {
            var g = this.mesaG || (this.mesaG = this.add.graphics().setDepth(-12));
            g.clear();
            // Mesa de jardín bajo el arco: sostiene la maceta.
            var cx = m.cx;
            var y = m.suelo + m.h * 0.04;
            var mw = m.obj * 1.1;
            this.mesaY = y;
            g.fillStyle(0x000000, 0.14);
            g.fillEllipse(cx, y + m.obj * 0.42, mw * 1.1, 16);
            g.fillStyle(0x8a5a2b, 1);
            g.fillRect(cx - mw * 0.38, y, 9, m.obj * 0.4);
            g.fillRect(cx + mw * 0.38 - 9, y, 9, m.obj * 0.4);
            g.fillStyle(0x6b3e1f, 1);
            g.fillRect(cx - mw * 0.38, y + m.obj * 0.24, mw * 0.76, 6);
            g.fillStyle(0xc98a4b, 1);
            g.fillRoundedRect(cx - mw / 2, y - 10, mw, 18, 6);
            g.fillStyle(0xe3b07a, 1);
            g.fillRoundedRect(cx - mw / 2 + 4, y - 10, mw - 8, 6, 3);
            // Frasco de perfume (izquierda) sobre un tocón y jarrón del ramo (derecha).
            var fx = m.w * 0.16;
            var jx = m.w * 0.84;
            [fx, jx].forEach(function (x) {
                g.fillStyle(0x000000, 0.12);
                g.fillEllipse(x, y + m.obj * 0.32, m.obj * 0.7, 14);
                g.fillStyle(0x8a5a2b, 1);
                g.fillRect(x - m.obj * 0.28, y, m.obj * 0.56, m.obj * 0.3);
                g.fillStyle(0xd9a066, 1);
                g.fillEllipse(x, y, m.obj * 0.56, 16);
                g.lineStyle(2, 0xa0612b, 1);
                g.strokeEllipse(x, y, m.obj * 0.34, 9);
            });
            if (!this.frasco) {
                this.frasco = this.add.container(fx, y - m.obj * 0.3).setDepth(-10);
                this.liquido = this.add.graphics();
                var vidrio = this.add.image(0, 0, A().textura(this, 'frasco', 200)).setDisplaySize(m.obj * 0.62, m.obj * 0.62);
                this.frasco.add([this.liquido, vidrio]);
                this.frasco.tam = m.obj * 0.62;
            }
            this.frasco.setPosition(fx, y - m.obj * 0.3);
            this.pintarPerfume();
            if (!this.jarron) {
                this.jarron = this.add.container(jx, y - m.obj * 0.22).setDepth(-10);
                this.ramoCont = this.add.container(0, -m.obj * 0.1);
                var jg = this.add.graphics();
                var jw = m.obj * 0.42;
                jg.fillStyle(0x74c0fc, 0.55);
                jg.fillRoundedRect(-jw / 2, -jw * 0.2, jw, jw * 0.9, jw * 0.3);
                jg.fillStyle(0xffffff, 0.5);
                jg.fillRoundedRect(-jw / 2 + 5, -jw * 0.12, 6, jw * 0.6, 3);
                jg.lineStyle(2, 0x4dabf7, 0.9);
                jg.strokeRoundedRect(-jw / 2, -jw * 0.2, jw, jw * 0.9, jw * 0.3);
                this.jarron.add([this.ramoCont, jg]);
            }
            this.jarron.setPosition(jx, y - m.obj * 0.22);
        },

        pintarPerfume: function () {
            var g = this.liquido;
            if (!g) return;
            var s = this.frasco.tam;
            g.clear();
            var k = Math.min(1, this.nivelPerfume);
            if (k <= 0) return;
            var alto = s * 0.66 * k;
            g.fillStyle(0xf783ac, 0.85);
            g.fillRoundedRect(-s * 0.3, s * 0.45 - alto, s * 0.6, alto, Math.min(s * 0.16, alto / 2));
            g.fillStyle(0xffdeeb, 0.8);
            g.fillRect(-s * 0.26, s * 0.45 - alto, s * 0.52, 3);
        },

        dibujarParterres: function (m) {
            var g = this.parterreG || (this.parterreG = this.add.graphics().setDepth(-15));
            g.clear();
            [[0.08, 0.72], [0.92, 0.72]].forEach(function (p) {
                var x = m.w * p[0];
                var y = m.h * p[1];
                g.fillStyle(0x6b4423, 1);
                g.fillEllipse(x, y, m.w * 0.16, 30);
                for (var i = 0; i < 6; i++) {
                    g.fillStyle(0x2f9e44, 1);
                    g.fillEllipse(x - m.w * 0.06 + i * m.w * 0.024, y - 10, 12, 20);
                    g.fillStyle([0xff6b6b, 0xfcc419, 0xcc5de8, 0xffffff][i % 4], 1);
                    g.fillCircle(x - m.w * 0.06 + i * m.w * 0.024, y - 22 - (i % 2) * 6, 7);
                    g.fillStyle(0xfff3bf, 1);
                    g.fillCircle(x - m.w * 0.06 + i * m.w * 0.024, y - 22 - (i % 2) * 6, 2.5);
                }
            });
        },

        crearMariposas: function () {
            for (var i = 0; i < 3; i++) {
                var c = this.add.container(0, 0).setDepth(30);
                var tam = 34;
                var izq = this.add.image(0, 0, A().textura(this, 'ala', 96)).setOrigin(0.05, 0.5).setDisplaySize(tam, tam);
                var der = this.add.image(0, 0, A().textura(this, 'ala', 96)).setOrigin(0.05, 0.5).setDisplaySize(tam, tam);
                var cuerpo = this.add.ellipse(0, 0, 5, 20, 0x3b2412);
                if (i === 1) { izq.setTint(0xb197fc); der.setTint(0xb197fc); }
                if (i === 2) { izq.setTint(0x74c0fc); der.setTint(0x74c0fc); }
                c.add([izq, der, cuerpo]);
                c.alas = [izq, der];
                c.fase = Math.random() * 10;
                this.mariposas.push(c);
            }
        },

        /* ── Maceta con flor ────────────────────────────────────── */

        crearMaceta: function (x, y, color) {
            var m = this.m();
            var tam = m.obj;
            var c = this.add.container(x, y).setDepth(16);
            var flor = this.add.image(0, -tam * 0.18, A().textura(this, color ? 'flor_' + color : 'flor', 256)).setOrigin(0.5, 0.92).setDisplaySize(tam, tam);
            var maceta = this.add.image(0, tam * 0.06, A().textura(this, 'maceta', 200)).setDisplaySize(tam * 0.52, tam * 0.52);
            c.add([flor, maceta]);
            c.flor = flor;
            c.tam = tam;
            return c;
        },

        cabezaFlor: function (c) {
            return { x: c.x + Math.sin(c.rotation + (c.flor.rotation || 0)) * c.tam * 0.55 * c.scale, y: c.y - c.tam * 0.7 * c.scale };
        },

        /** La flor (sin maceta) se pone en el jarrón. */
        alRamo: function (color, desde) {
            var scene = this;
            var i = this.ramo.length;
            var tam = this.m().obj * 0.55;
            var img = this.add.image(0, 0, A().textura(this, color ? 'flor_' + color : 'flor', 128)).setOrigin(0.5, 0.95).setDisplaySize(tam, tam).setDepth(17);
            img.setPosition(desde.x, desde.y);
            var ang = [-22, 18, -6, 30, -34, 8][i % 6];
            var destino = { x: this.jarron.x + Math.sin(ang * Math.PI / 180) * 10, y: this.jarron.y - this.m().obj * 0.12 };
            this.ramo.push(img);
            var cont = this.add.container(desde.x, desde.y).setDepth(17);
            img.setPosition(0, 0);
            cont.add(img);
            return U.volarA(this, cont, destino.x, destino.y, 650, 1).then(function () {
                cont.destroy();
                var fija = scene.add.image(0, 0, img.texture.key).setOrigin(0.5, 0.95).setDisplaySize(tam, tam).setAngle(ang);
                scene.ramoCont.add(fija);
                U.estallido(scene, destino.x, destino.y - tam * 0.6, { n: 10, dist: 70, tam: 18 });
            });
        },

        /* ── Entrada ───────────────────────────────────────────── */

        alTocar: function (p) {
            if (this.pista) this.pista.reiniciar();
            this.ctx.quitarMano();
            if (this.modo === 'flor' && this.esperando && !this.ocupado) {
                var c = this.maceta;
                if (c && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y - c.tam * 0.3) < c.tam * 0.55) {
                    this.arr.empezar(c, p);
                    return;
                }
                var id = this.fila.en(p.x, p.y);
                if (id) this.elegir(id);
                return;
            }
            if (this.modo === 'atrapa') {
                this.objetivoX = p.x;
                return;
            }
            if (this.modo === 'arbustos' && this.esperando && !this.ocupado) {
                var hit = null;
                (this.arbustos || []).forEach(function (a) {
                    if (!hit && Phaser.Math.Distance.Between(p.x, p.y, a.x, a.y - a.tam * 0.3) < a.tam * 0.55) hit = a;
                });
                if (hit) this.tocarArbusto(hit);
            }
        },

        alMover: function (p) {
            if (this.arr.cont && p.isDown) {
                this.arr.mover(p);
                var sobre = this.fila.en(p.x, p.y);
                var scene = this;
                this.fila.orden.forEach(function (id) { scene.organos[id].cont.setScale(id === sobre ? 1.12 : 1); });
            }
            if (this.modo === 'atrapa' && p.isDown) this.objetivoX = p.x;
        },

        alSoltar: function (p) {
            var r = this.arr.soltar(p);
            if (!r) return;
            var scene = this;
            this.fila.orden.forEach(function (id) { scene.organos[id].cont.setScale(1); });
            var sobre = this.fila.en(p.x, p.y);
            if (r.movido && sobre && this.esperando && !this.ocupado) this.elegir(sobre);
            else this.arr.devolver(r.cont, this.casaMaceta);
        },

        elegir: function (id) {
            if (!this.esperando || this.ocupado) return;
            if (id === this.correcto) {
                this.esperando = false;
                if (this.resolver) this.resolver(id);
                return;
            }
            this.ocupado = true;
            var scene = this;
            U.sfx('boing');
            this.organos[id].reaccion('error');
            // La maceta rebota suavemente y vuelve a su sitio (documento).
            var c = this.maceta;
            if (c) {
                this.tweens.killTweensOf(c);
                this.tweens.add({ targets: c, x: this.casaMaceta.x, y: this.casaMaceta.y, angle: 0, duration: 420, ease: 'Back.easeOut' });
                this.tweens.add({ targets: c, scaleY: { from: 0.86, to: 1 }, duration: 420, ease: 'Bounce.easeOut' });
            }
            var r = this.reto || {};
            var linea = null;
            (r.errores || []).forEach(function (e) { if (!linea && (e.objetos || []).indexOf(id) >= 0) linea = e; });
            this.ctx.decir(linea || r.errorOtro || { voz: 'zoe', texto: '¡Inténtalo otra vez!' });
            this.time.delayedCall(800, function () { scene.ocupado = false; });
        },

        esperarEleccion: function (correcto) {
            var scene = this;
            this.correcto = correcto;
            this.esperando = true;
            this.ocupado = false;
            return new Promise(function (r) { scene.resolver = r; });
        },

        /* ── Ronda 1: la flor del documento ───────────────────── */

        rondaFlor: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'flor';
            this.casaMaceta = { x: m.cx, y: this.mesaY - m.obj * 0.2 };
            var c = this.maceta = this.crearMaceta(this.casaMaceta.x, this.casaMaceta.y - 60);
            c.alpha = 0;
            this.tweens.add({ targets: c, alpha: 1, y: this.casaMaceta.y, duration: 700, ease: 'Bounce.easeOut' });
            this.perfumeMaceta = this.time.addEvent({
                delay: 900, loop: true, callback: function () {
                    if (scene.maceta) { var hc = scene.cabezaFlor(scene.maceta); U.aroma(scene, hc.x, hc.y, { n: 3, alto: 90 }); }
                }
            });
            U.sfx('sshhBloom');
            await this.ctx.decir(this.reto.presentacion || { voz: 'zeus', texto: '¿Con qué parte de nuestro cuerpo olemos su perfume?' });
            this.pista = U.crearPista(this, 9000, function (cancelado) {
                var n = scene.organos.nariz.cont;
                return scene.ctx.mano({ punto: { x: n.x, y: n.y }, holdMs: 500, cancelado: cancelado, onPresionar: function () { scene.organos.nariz.reaccion('toca'); } });
            });
            this.pista.reiniciar();
            await this.esperarEleccion('nariz');
            this.pista.parar();
            this.ctx.quitarMano();
            this.arr.cont = null;
            // La flor se acerca a la nariz, que aspira suavemente.
            var nariz = this.organos.nariz;
            // La maceta se posa justo encima de la burbuja de la nariz (sin tapar las vecinas).
            await U.volarA(this, c, nariz.cont.x - nariz.radio * 0.25, nariz.cont.y - nariz.radio * 1.3, 650, 0.5);
            this.perfumeMaceta.remove();
            U.sfx('sorber');
            var hc = this.cabezaFlor(c);
            U.aroma(this, hc.x, hc.y, { n: 10, hacia: { x: nariz.cont.x, y: nariz.cont.y + nariz.radio * 0.2 }, ms: 900, paso: 60 });
            await U.esperar(this, 500);
            U.sfx('sshhBloom');
            await nariz.reaccion('acierto');
            await this.ctx.decir(this.reto.acierto || { voz: 'zeus', texto: '¡Muy bien!' }, { estado: 'acierto' });
            // La flor va al jarrón y la maceta se va.
            var desde = this.cabezaFlor(c);
            this.maceta = null;
            this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: function () { c.destroy(); } });
            await this.alRamo(null, { x: desde.x, y: desde.y + c.tam * 0.5 });
        },

        /* ── Ronda 2: atrapa los aromas ───────────────────────── */

        rondaAtrapa: async function () {
            var scene = this;
            var m = this.m();
            var nariz = this.organos.nariz;
            this.modo = 'atrapa';
            this.atrapados = 0;
            var meta = 5;
            nariz.libre = true;
            nariz.flotar = false;
            this.lineaNariz = m.h - m.r * 1.45 - m.r * 2.25;
            this.objetivoX = nariz.cont.x;
            await U.tween(this, { targets: nariz.cont, y: this.lineaNariz, scale: 1.15, duration: 600, ease: 'Back.easeOut' });
            nariz.base.y = this.lineaNariz;
            await this.ctx.decir({ voz: 'zoe', texto: '¡Las flores sueltan perfume! Mueve la nariz para atrapar el aroma rosado.' });
            this.lluvia = this.time.addEvent({
                delay: 1500, loop: true, callback: function () {
                    var r = Math.random();
                    if (r < 0.72) scene.soltarAroma();
                    else scene.soltarNota();
                }
            });
            this.lluvia.callback();
            this.pista = U.crearPista(this, 8000, function (cancelado) {
                var a = scene.cayendo.find(function (c) { return c.tipo === 'aroma' && c.y > scene.scale.height * 0.3; });
                if (!a) return Promise.resolve();
                var x = a.x;
                return scene.ctx.mano({
                    punto: { x: nariz.cont.x, y: nariz.cont.y }, holdMs: 250, cancelado: cancelado,
                    arrastre: { dx: x - nariz.cont.x, dy: 0, durMs: 700, soltarEnDestino: true },
                    onDuranteArrastre: function () { scene.objetivoX = x; }
                });
            });
            this.pista.reiniciar();
            await new Promise(function (r) { scene.finAtrapa = r; });
            this.lluvia.remove();
            this.pista.parar();
            this.cayendo.forEach(function (c) { scene.tweens.add({ targets: c.img, alpha: 0, duration: 300, onComplete: function () { c.img.destroy(); } }); });
            this.cayendo = [];
            // La nariz vuelve a su burbuja.
            nariz.libre = false;
            nariz.flotar = true;
            this.modo = '';
            var pos = this.fila.pos(this.fila.orden.indexOf('nariz'));
            await U.tween(this, { targets: nariz.cont, x: pos.x, y: pos.y, scale: 1, duration: 600, ease: 'Sine.easeInOut' });
            this.fila.ubicar();
            void meta;
        },

        soltarAroma: function () {
            var flor = this.floresCerca[Math.floor(Math.random() * this.floresCerca.length)];
            var x = Phaser.Math.Clamp(flor.x, this.scale.width * 0.12, this.scale.width * 0.88);
            var c = this.add.container(x, flor.y - 30).setDepth(28);
            // Nube de perfume: volutas rosadas con un espiral y un brillo (bien visible).
            for (var i = 0; i < 5; i++) {
                var h = this.add.image(U.rnd(-16, 16), U.rnd(-12, 12), A().textura(this, 'humo', 64)).setTint(i % 2 ? 0xf06595 : 0xfaa2c1).setDisplaySize(44, 44).setAlpha(0.9);
                c.add(h);
            }
            var espiral = this.add.graphics();
            espiral.lineStyle(3, 0xc2255c, 0.8);
            espiral.beginPath();
            for (var k = 0; k <= 24; k++) {
                var an = k * 0.5;
                var rr = 2 + k * 0.7;
                if (k === 0) espiral.moveTo(Math.cos(an) * rr, Math.sin(an) * rr);
                else espiral.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
            }
            espiral.strokePath();
            c.add(espiral);
            var brillo = this.add.image(10, -10, A().textura(this, 'chispa', 64)).setDisplaySize(20, 20).setTint(0xfff0f6);
            c.add(brillo);
            c.alpha = 0;
            this.tweens.add({ targets: c, alpha: 1, duration: 400 });
            U.aroma(this, flor.x, flor.y - 30, { n: 3, alto: 40 });
            this.cayendo.push({ tipo: 'aroma', img: c, x: x, y: c.y, vy: this.scale.height / U.rnd(9, 11), fase: Math.random() * 6 });
        },

        soltarNota: function () {
            this.cantar(0);
            var p = this.pajaro;
            var img = this.add.container(p.x, p.y - 20).setDepth(28);
            var n = this.add.image(0, 0, A().textura(this, 'nota', 64)).setDisplaySize(32, 32).setTint(0x1c7ed6);
            img.add(n);
            this.cayendo.push({ tipo: 'nota', img: img, x: p.x, y: p.y - 20, vy: this.scale.height / U.rnd(8, 10), fase: Math.random() * 6 });
        },

        moverCayendo: function (time, dt) {
            var scene = this;
            var nariz = this.organos.nariz;
            // La nariz sigue el dedo con suavidad.
            if (this.modo === 'atrapa' && this.objetivoX != null) {
                var w = this.scale.width;
                var tx = Phaser.Math.Clamp(this.objetivoX, w * 0.1, w * 0.9);
                var vx = (tx - nariz.cont.x) * Math.min(1, dt * 7);
                nariz.cont.x += vx;
                nariz.cont.angle = Phaser.Math.Clamp(vx * 0.8, -14, 14);
            }
            this.cayendo = this.cayendo.filter(function (c) {
                if (c.fuera) return false;
                c.y += c.vy * dt;
                var x = c.x + Math.sin(time / 600 + c.fase) * 30;
                c.img.setPosition(x, c.y);
                c.img.angle = Math.sin(time / 500 + c.fase) * 10;
                if (scene.modo === 'atrapa' && !scene.ocupado2 &&
                    Phaser.Math.Distance.Between(x, c.y, nariz.cont.x, nariz.cont.y) < nariz.radio * 1.05) {
                    scene.atrapar(c);
                    return false;
                }
                if (c.y > scene.scale.height - scene.m().r * 2.6) {
                    scene.tweens.add({ targets: c.img, alpha: 0, duration: 300, onComplete: function () { c.img.destroy(); } });
                    return false;
                }
                return true;
            });
        },

        atrapar: function (c) {
            var scene = this;
            var nariz = this.organos.nariz;
            if (c.tipo === 'aroma') {
                U.sfx('sorber');
                this.tweens.add({ targets: c.img, x: nariz.cont.x, y: nariz.cont.y + nariz.radio * 0.2, scale: 0.2, alpha: 0, duration: 380, ease: 'Quad.easeIn', onComplete: function () { c.img.destroy(); } });
                nariz.reaccion('acierto');
                this.atrapados += 1;
                this.nivelPerfume = this.atrapados / 5;
                this.tweens.add({ targets: this.frasco, scale: { from: 1.15, to: 1 }, duration: 380, ease: 'Back.easeOut' });
                this.pintarPerfume();
                U.estallido(this, this.frasco.x, this.frasco.y - this.frasco.tam * 0.4, { n: 6, tex: 'corazon', dist: 50, tam: 16 });
                if (this.atrapados === 2) this.ctx.decir({ voz: 'zeus', texto: '¡Mmm! ¡La nariz huele el perfume de las flores!' }, { estado: 'acierto' });
                if (this.atrapados >= 5 && this.finAtrapa) {
                    var fin = this.finAtrapa;
                    this.finAtrapa = null;
                    U.sfx('magia');
                    this.ctx.decir({ voz: 'zoe', texto: '¡Llenaste el frasco de perfume!' }, { estado: 'acierto' });
                    this.time.delayedCall(1200, fin);
                }
                return;
            }
            // Una nota no se huele: rebota hacia el oído.
            U.sfx('boing');
            var ear = this.organos.oido;
            this.tweens.add({ targets: nariz.cont, angle: { from: -15, to: 15 }, duration: 90, yoyo: true, repeat: 1 });
            U.volarA(this, c.img, ear.cont.x, ear.cont.y - ear.radio * 0.4, 600, 0.6).then(function () {
                c.img.destroy();
                ear.reaccion('acierto');
            });
            this.cantar(0);
            if (!this.dijoNota || this.time.now - this.dijoNota > 6000) {
                this.dijoNota = this.time.now;
                this.ctx.decir({ voz: 'zeus', texto: '¡Esa es una nota del pajarito! Las notas se escuchan con el oído. La nariz busca el aroma.' });
            }
            void scene;
        },

        /* ── Ronda 3: ¿dónde huele? ───────────────────────────── */

        rondaArbustos: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'arbustos';
            var tam = m.obj * 0.95;
            var y = m.suelo + m.h * 0.13;
            this.arbustos = [0.34, 0.5, 0.66].map(function (k, i) {
                var img = scene.add.image(m.w * k, y + 30, A().textura(scene, 'arbusto', 256)).setOrigin(0.5, 0.85).setDisplaySize(tam, tam).setDepth(18);
                img.alpha = 0;
                scene.tweens.add({ targets: img, alpha: 1, y: y, duration: 500, delay: i * 120, ease: 'Back.easeOut' });
                return { img: img, x: m.w * k, y: y, tam: tam, contenido: null };
            });
            await this.ctx.decir({ voz: 'zeus', texto: '¡Una flor se escondió en un arbusto! Busca de dónde sale el perfume.' });
            var colores = U.mezclar(COLORES).slice(0, 3);
            for (var ronda = 0; ronda < 3; ronda++) {
                var orden = U.mezclar([0, 1, 2]);
                this.arbustos.forEach(function (a) { a.contenido = null; });
                this.arbustos[orden[0]].contenido = 'flor';
                if (ronda > 0) this.arbustos[orden[1]].contenido = 'pajaro';
                this.florColor = colores[ronda];
                var conFlor = this.arbustos[orden[0]];
                var intensidad = ronda === 2 ? 2 : 4;
                this.aromaArbusto = this.time.addEvent({
                    delay: 1400, loop: true, callback: function () {
                        // El perfume sale de entre las hojas del arbusto.
                        U.aroma(scene, conFlor.x + U.rnd(-25, 25), conFlor.y - conFlor.tam * 0.45, { n: intensidad, alto: 70, depth: 19 });
                    }
                });
                this.aromaArbusto.callback();
                var conPajaro = this.arbustos.find(function (a) { return a.contenido === 'pajaro'; });
                this.cantoArbusto = conPajaro ? this.time.addEvent({
                    delay: 2600, loop: true, callback: function () {
                        var S = global.EncuentraSonidoSfx;
                        if (S) S.acompanar('trino', { breve: true, vol: 0.4 });
                        U.notas(scene, conPajaro.x, conPajaro.y - conPajaro.tam * 0.6, 2);
                        scene.tweens.add({ targets: conPajaro.img, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: 2 });
                    }
                }) : null;
                this.pista = U.crearPista(this, 9000, function (cancelado) {
                    return scene.ctx.mano({ punto: { x: conFlor.x, y: conFlor.y - conFlor.tam * 0.3 }, holdMs: 400, cancelado: cancelado });
                });
                this.pista.reiniciar();
                this.esperando = true;
                this.ocupado = false;
                await new Promise(function (r) { scene.resolverArbusto = r; });
                this.pista.parar();
                this.aromaArbusto.remove();
                if (this.cantoArbusto) this.cantoArbusto.remove();
            }
            this.arbustos.forEach(function (a) { scene.tweens.add({ targets: a.img, alpha: 0, y: a.y + 30, duration: 400, onComplete: function () { a.img.destroy(); } }); });
            this.arbustos = [];
            this.modo = '';
        },

        sacudir: function (a) {
            U.sfx('crujido');
            this.tweens.add({ targets: a.img, angle: { from: -6, to: 6 }, duration: 80, yoyo: true, repeat: 3, onComplete: function () { a.img.angle = 0; } });
            for (var i = 0; i < 5; i++) {
                var h = this.add.ellipse(a.x + U.rnd(-30, 30), a.y - a.tam * 0.5, 10, 6, 0x40c057).setDepth(19);
                this.tweens.add({ targets: h, y: h.y + U.rnd(40, 70), x: h.x + U.rnd(-30, 30), angle: U.rnd(-180, 180), alpha: 0, duration: 800, onComplete: function () { this.targets[0].destroy(); } });
            }
        },

        tocarArbusto: async function (a) {
            var scene = this;
            this.ocupado = true;
            this.sacudir(a);
            if (a.contenido === 'flor') {
                this.esperando = false;
                var c = this.crearMaceta(a.x, a.y - a.tam * 0.2, this.florColor);
                c.maceta = c.list[1];
                c.maceta.setVisible(false);
                c.setDepth(17);
                c.y = a.y;
                await U.tween(this, { targets: c, y: a.y - a.tam * 0.45, duration: 500, ease: 'Back.easeOut' });
                var nariz = this.organos.nariz;
                await U.volarA(this, c, nariz.cont.x - nariz.radio * 0.25, nariz.cont.y - nariz.radio * 1.2, 650, 0.5);
                var hc = this.cabezaFlor(c);
                U.sfx('sorber');
                U.aroma(this, hc.x, hc.y, { n: 8, hacia: { x: nariz.cont.x, y: nariz.cont.y + nariz.radio * 0.2 }, ms: 800, paso: 60 });
                await U.esperar(this, 400);
                await nariz.reaccion('acierto');
                var frases = ['¡La encontraste por su perfume! La nariz la huele.', '¡Muy bien! El olor nos dice dónde está la flor.', '¡Qué nariz tan buena! Encontraste todas las flores.'];
                this.ctx.decir({ voz: 'zeus', texto: frases[Math.min(2, this.ramo.length - 1)] }, { estado: 'acierto' });
                var desde = this.cabezaFlor(c);
                this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: function () { c.destroy(); } });
                await this.alRamo(this.florColor, { x: desde.x, y: desde.y + c.tam * 0.4 });
                await U.esperar(this, 600);
                this.ocupado = false;
                if (this.resolverArbusto) this.resolverArbusto();
                return;
            }
            if (a.contenido === 'pajaro') {
                // Sale el pajarito cantando: eso se escucha, no se huele.
                var p = this.add.container(a.x, a.y - a.tam * 0.4).setDepth(19);
                var g = this.add.graphics();
                g.fillStyle(0xfab005, 1);
                g.fillCircle(0, 0, 12);
                g.fillStyle(0xfff3bf, 1);
                g.fillEllipse(3, 3, 12, 9);
                g.fillStyle(0xe67700, 1);
                g.fillTriangle(10, -2, 18, 0, 10, 3);
                g.fillStyle(0x212529, 1);
                g.fillCircle(5, -4, 2);
                p.add(g);
                var S = global.EncuentraSonidoSfx;
                if (S) S.acompanar('trino', { breve: false, vol: 0.55 });
                var ear = this.organos.oido;
                U.notas(this, a.x, a.y - a.tam * 0.5, 3, { x: ear.cont.x, y: ear.cont.y });
                ear.reaccion('acierto');
                this.tweens.add({ targets: p, x: this.scale.width + 60, y: this.scale.height * 0.1, duration: 1600, ease: 'Sine.easeIn', onComplete: function () { p.destroy(); } });
                a.contenido = null;
                if (this.cantoArbusto) { this.cantoArbusto.remove(); this.cantoArbusto = null; }
                await this.ctx.decir({ voz: 'zeus', texto: '¡Era el pajarito! Su canto se escucha con el oído. Busca el arbusto que huele a flor.' });
                this.ocupado = false;
                return;
            }
            await this.ctx.decir({ voz: 'zoe', texto: 'Aquí no hay perfume. ¡Busca el humito rosado!' });
            this.ocupado = false;
            void scene;
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var m = this.m();
            this.modo = 'demo';
            await B.demoTambor(this, this.fila, m.cx, (this.mesaY || m.suelo) - m.obj * 0.3, m.obj * 0.8);
            this.modo = '';
        },

        jugar: async function () {
            await this.rondaFlor();
            if (!this.ctx.vivo()) return;
            await this.rondaAtrapa();
            if (!this.ctx.vivo()) return;
            await this.rondaArbustos();
        },

        fiestaFinal: async function () {
            var scene = this;
            var nariz = this.organos.nariz;
            // El jarrón brilla, las mariposas vienen al ramo y la nariz da un gran respiro.
            this.tweens.add({ targets: this.jarron, scale: 1.25, duration: 500, yoyo: true, ease: 'Sine.easeInOut' });
            this.mariposas.forEach(function (mm, i) { mm.alRamo = true; mm.fase = i * 2; });
            U.aroma(this, this.jarron.x, this.jarron.y - this.m().obj * 0.4, { n: 12, hacia: { x: nariz.cont.x, y: nariz.cont.y }, ms: 1300, paso: 80 });
            U.sfx('sorber');
            await U.esperar(this, 900);
            U.sfx('celebracion');
            this.fila.orden.forEach(function (id, i) { scene.time.delayedCall(i * 120, function () { scene.organos[id].reaccion('acierto'); }); });
            U.confeti(this, 80);
            var m = this.m();
            for (var i = 0; i < 24; i++) {
                var petalo = this.add.ellipse(U.rnd(0, m.w), -20, 14, 9, [0xf783ac, 0xfcc419, 0xcc5de8, 0xffffff][i % 4]).setDepth(70);
                this.tweens.add({ targets: petalo, y: m.h + 20, x: petalo.x + U.rnd(-80, 80), angle: U.rnd(-360, 360), duration: U.rnd(2200, 3400), delay: U.rnd(0, 900), onComplete: function () { this.targets[0].destroy(); } });
            }
            await U.esperar(this, 2000);
        },

        update: function (time, delta) {
            var dt = Math.min(delta || 16, 50) / 1000;
            var scene = this;
            var m = this.m();
            var quieto = U.reducido();
            this.floresCerca.forEach(function (f) { if (!quieto) f.angle = Math.sin(time / 900 + f.fase) * 5; });
            if (this.maceta && !this.arr.cont && !quieto) this.maceta.flor.angle = Math.sin(time / 700) * 4;
            // Mariposas que revolotean (al final se juntan en el ramo).
            this.mariposas.forEach(function (mm, i) {
                var t = time / 1000 + mm.fase;
                var cx = mm.alRamo ? scene.jarron.x : m.w * (0.3 + 0.4 * ((i + 0.5) / 3));
                var cy = mm.alRamo ? scene.jarron.y - m.obj * 0.55 : m.h * (0.32 + 0.06 * i);
                var rx = mm.alRamo ? 40 : m.w * 0.22;
                var nx = cx + Math.sin(t * 0.5 + i) * rx;
                var ny = cy + Math.sin(t * 1.3) * (mm.alRamo ? 18 : 40);
                mm.scaleX = nx < mm.x ? -1 : 1;
                mm.x = nx;
                mm.y = ny;
                var ab = quieto ? 1 : 0.25 + 0.75 * Math.abs(Math.sin(t * 10));
                mm.alas[0].scaleX = -Math.abs(mm.alas[0].scaleY) * ab;
                mm.alas[1].scaleX = Math.abs(mm.alas[1].scaleY) * ab;
            });
            if (this.cayendo.length || this.modo === 'atrapa') this.moverCayendo(time, dt);
            var foco = null;
            if (this.maceta) foco = this.cabezaFlor(this.maceta);
            else if (this.cayendo.length) foco = { x: this.cayendo[0].img.x, y: this.cayendo[0].img.y };
            else if (this.mariposas.length) foco = { x: this.mariposas[0].x, y: this.mariposas[0].y };
            this.fila.actualizar(time, foco);
        },

        estado: function () {
            var scene = this;
            return {
                modo: this.modo,
                esperando: !!this.esperando,
                ocupado: !!this.ocupado,
                ramo: this.ramo.length,
                perfume: this.atrapados || 0,
                organos: this.fila.orden.reduce(function (acc, id) { acc[id] = { x: Math.round(scene.organos[id].cont.x), y: Math.round(scene.organos[id].cont.y) }; return acc; }, {}),
                cayendo: this.cayendo.map(function (c) { return { tipo: c.tipo, x: Math.round(c.img.x), y: Math.round(c.img.y) }; }),
                arbustos: (this.arbustos || []).map(function (a) { return { x: a.x, y: a.y, c: a.contenido }; })
            };
        }
    };

    global.PedniaJardin = B.crearMotor({ id: 'jardin', fondo: '#cfe9fb', escena: escena });
})(typeof window !== 'undefined' ? window : this);
