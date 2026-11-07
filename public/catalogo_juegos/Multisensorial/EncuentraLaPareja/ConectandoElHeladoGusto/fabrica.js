/**
 * PedniaFabrica — "La fábrica de sabores" (Conectando el helado — Gusto, 5-6 años).
 *
 * Una fábrica de colores pastel con engranajes, tuberías y una máquina de helados en el centro.
 *   1. El helado      (reto del documento): en la máquina aparece un helado de frutilla; se arrastra el cable
 *                     hasta el sentido correcto. Prueba del documento (identificar el sabor): la lengua
 *                     prueba y hay que elegir de qué fruta es el sabor por su color.
 *   2. La cinta       por la cinta transportadora pasan cosas de todos los sentidos; hay que arrastrar cada
 *                     una a la estación que la percibe (lo que se come, a la lengua; lo que suena, al oído…).
 *                     Si se equivoca, la cosa rebota a la cinta y Zeus lo explica.
 *   Cierre del documento: el Tablero de Control Humano.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var L = function () { return global.PedniaLab; };
    var A = function () { return global.PedniaArte; };

    var COSAS = {
        helado: { tex: 'helado', s: 'lengua', por: 'El helado se saborea con la lengua.' },
        manzana: { tex: 'manzana', s: 'lengua', por: 'La manzana se saborea con la lengua.' },
        galleta: { tex: 'galleta', s: 'lengua', por: 'La galleta se saborea con la lengua.' },
        campana: { tex: 'campana', s: 'oido', por: 'La campana suena: se escucha con el oído.' },
        tambor: { tex: 'tambor', s: 'oido', por: 'El tambor suena: se escucha con el oído.' },
        flor: { tex: 'flor', s: 'nariz', por: 'La flor tiene aroma: se huele con la nariz.' },
        estrella: { tex: 'estrella', s: 'ojo', por: 'La estrella brilla: se mira con los ojos.' },
        farol: { tex: 'farol', s: 'ojo', por: 'El farol da luz: se mira con los ojos.' },
        osito: { tex: 'osito', s: 'mano', por: 'El osito es suave: se siente con la mano.' }
    };

    var escena = {
        create: function () {
            this.modo = '';
            this.cablesLab = [];
            this.enCinta = [];
            this.engranajes = [];
            var ops = (this.reto && this.reto.opciones) || ['oido', 'nariz', 'lengua', 'ojo', 'mano'];
            this.dibujarFondo();
            this.est = L().estaciones(this, ops, { depth: 20 });
            this.organos = this.est.organos;
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.est.ubicar(); });
        },

        m: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            return {
                w: w, h: h, cx: w * 0.5,
                // La máquina va entre el globo de diálogo (~105 px) y la cinta.
                maquina: (function () {
                    var mh = Math.min(h * 0.34, h * 0.56 - 40 - 105);
                    return { x: w * 0.5, y: 105 + mh / 2, w: Math.min(w * 0.26, 260), h: mh };
                })(),
                cinta: h * 0.56,
                obj: Phaser.Math.Clamp(Math.min(w, h) * 0.2, 90, 160)
            };
        },

        /* ── Escenario: fábrica ────────────────────────────────── */

        dibujarFondo: function () {
            var m = this.m();
            var w = m.w;
            var h = m.h;
            U.cielo(this, 'fb:pared', [[0, '#ffe3ec'], [1, '#ffd0de']]);
            if (!this.pared) this.pared = this.add.image(0, 0, 'fb:pared').setOrigin(0).setDepth(-30);
            this.pared.setDisplaySize(w, h);
            var g = this.fondoG || (this.fondoG = this.add.graphics().setDepth(-28));
            g.clear();
            // Ladrillos suaves.
            for (var y = 0; y < m.cinta - 20; y += 26) {
                for (var x = ((y / 26) % 2) * 30; x < w; x += 60) {
                    g.fillStyle(((x + y) / 26) % 3 < 1 ? 0xffd6e2 : 0xffdbe6, 1);
                    g.fillRoundedRect(x + 2, y + 2, 56, 22, 4);
                }
            }
            // Tuberías de colores por la pared.
            [[0.08, 0x74c0fc], [0.92, 0x63e6be]].forEach(function (t) {
                g.lineStyle(16, t[1], 1);
                g.lineBetween(w * t[0], 0, w * t[0], m.cinta - 30);
                g.lineStyle(5, 0xffffff, 0.5);
                g.lineBetween(w * t[0] - 4, 0, w * t[0] - 4, m.cinta - 30);
                g.fillStyle(0x868e96, 1);
                for (var k = 1; k < 4; k++) g.fillRect(w * t[0] - 12, k * (m.cinta - 30) / 4, 24, 8);
            });
            // Ventanas redondas.
            [[0.22, 0.18], [0.78, 0.18]].forEach(function (p) {
                g.fillStyle(0x868e96, 1);
                g.fillCircle(w * p[0], h * p[1], 42);
                g.fillStyle(0xa5d8ff, 1);
                g.fillCircle(w * p[0], h * p[1], 34);
                g.fillStyle(0xffffff, 0.5);
                g.fillCircle(w * p[0] - 12, h * p[1] - 12, 9);
            });
            // Suelo de fábrica.
            g.fillStyle(0x495057, 1);
            g.fillRect(0, m.cinta + 30, w, h - m.cinta - 30);
            g.fillStyle(0xfab005, 1);
            for (var r = 0; r < w; r += 50) g.fillTriangle(r, m.cinta + 30, r + 25, m.cinta + 30, r + 12, m.cinta + 42);
            if (!this.engranajes.length) {
                var scene = this;
                [[0.3, 0.42, 34, 0xfab005, 1], [0.36, 0.36, 22, 0xff922b, -1.6], [0.7, 0.4, 30, 0x4dabf7, -1], [0.65, 0.33, 18, 0x69db7c, 1.7]].forEach(function (e) {
                    var gg = scene.add.graphics().setDepth(-26);
                    scene.dibujarEngranaje(gg, e[2], e[3]);
                    gg.vel = e[4];
                    gg.rel = [e[0], e[1]];
                    scene.engranajes.push(gg);
                });
            }
            this.engranajes.forEach(function (gg) { gg.setPosition(w * gg.rel[0], h * gg.rel[1]); });
            this.dibujarMaquina();
            this.dibujarCinta();
        },

        dibujarEngranaje: function (g, r, color) {
            g.fillStyle(color, 1);
            for (var i = 0; i < 10; i++) {
                var a = i / 10 * Math.PI * 2;
                g.fillRect(Math.cos(a) * r - 5, Math.sin(a) * r - 5, 10, 10);
            }
            g.fillCircle(0, 0, r * 0.88);
            g.fillStyle(0x000000, 0.15);
            g.fillCircle(0, 0, r * 0.88);
            g.fillStyle(color, 1);
            g.fillCircle(0, 0, r * 0.78);
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(0, 0, r * 0.25);
        },

        dibujarMaquina: function () {
            var mq = this.m().maquina;
            var g = this.maquinaG || (this.maquinaG = this.add.graphics().setDepth(-14));
            g.clear();
            g.fillStyle(0x000000, 0.18);
            g.fillRoundedRect(mq.x - mq.w / 2 + 6, mq.y - mq.h / 2 + 8, mq.w, mq.h, 22);
            g.fillStyle(0xf8f9fa, 1);
            g.fillRoundedRect(mq.x - mq.w / 2, mq.y - mq.h / 2, mq.w, mq.h, 22);
            g.fillStyle(0xf06595, 1);
            g.fillRoundedRect(mq.x - mq.w / 2, mq.y - mq.h / 2, mq.w, mq.h * 0.16, { tl: 22, tr: 22, bl: 0, br: 0 });
            // Vitrina.
            g.fillStyle(0xe7f5ff, 1);
            g.fillRoundedRect(mq.x - mq.w * 0.38, mq.y - mq.h * 0.28, mq.w * 0.76, mq.h * 0.58, 14);
            g.lineStyle(4, 0xadb5bd, 1);
            g.strokeRoundedRect(mq.x - mq.w * 0.38, mq.y - mq.h * 0.28, mq.w * 0.76, mq.h * 0.58, 14);
            g.fillStyle(0xffffff, 0.6);
            g.fillRoundedRect(mq.x - mq.w * 0.33, mq.y - mq.h * 0.24, 8, mq.h * 0.3, 4);
            // Botones y palanca.
            [0xff6b6b, 0xfcc419, 0x51cf66].forEach(function (c, i) {
                g.fillStyle(c, 1);
                g.fillCircle(mq.x - mq.w * 0.25 + i * mq.w * 0.12, mq.y - mq.h * 0.42, 7);
            });
            g.fillStyle(0x868e96, 1);
            g.fillRect(mq.x + mq.w * 0.36, mq.y - mq.h * 0.44, 6, mq.h * 0.2);
            g.fillStyle(0xe03131, 1);
            g.fillCircle(mq.x + mq.w * 0.36 + 3, mq.y - mq.h * 0.44, 9);
            // Toma del cable.
            g.fillStyle(0x212529, 1);
            g.fillRoundedRect(mq.x - 24, mq.y + mq.h * 0.38, 48, 22, 8);
            g.fillStyle(0xff8787, 1);
            g.fillCircle(mq.x, mq.y + mq.h * 0.38 + 11, 6);
            this.toma = { x: mq.x, y: mq.y + mq.h * 0.38 + 11 };
        },

        dibujarCinta: function () {
            var m = this.m();
            var g = this.cintaBase || (this.cintaBase = this.add.graphics().setDepth(-10));
            g.clear();
            g.fillStyle(0x343a40, 1);
            g.fillRoundedRect(-20, m.cinta - 14, m.w + 40, 34, 16);
            g.fillStyle(0x868e96, 1);
            for (var x = 20; x < m.w; x += 120) {
                g.fillRect(x, m.cinta + 18, 10, 26);
            }
            if (!this.cintaG) this.cintaG = this.add.graphics().setDepth(-9);
        },

        /* ── Helado de la máquina ──────────────────────────────── */

        rondaHelado: async function () {
            var scene = this;
            var mq = this.m().maquina;
            this.modo = 'helado';
            this.cintaActiva = false;
            var tam = Math.min(mq.h * 0.55, mq.w * 0.7);
            var hel = this.add.container(mq.x, mq.y).setDepth(12);
            hel.add(this.add.image(0, tam * 0.2, A().textura(this, 'cono', 200)).setDisplaySize(tam * 0.62, tam * 0.62));
            var bola = this.add.image(0, -tam * 0.12, A().textura(this, 'bola_fresa', 200)).setDisplaySize(tam * 0.62, tam * 0.62);
            hel.add(bola);
            hel.alpha = 0;
            hel.y += 30;
            this.helado = hel;
            this.tweens.add({ targets: hel, alpha: 1, y: mq.y, duration: 600, ease: 'Back.easeOut' });
            this.goteo = this.time.addEvent({
                delay: 1300, loop: true, callback: function () {
                    var d = scene.add.image(hel.x + tam * 0.16, hel.y - tam * 0.02, A().textura(scene, 'gota', 64)).setDisplaySize(10, 14).setTint(0xf783ac).setDepth(13);
                    scene.tweens.add({ targets: d, y: hel.y + tam * 0.45, alpha: 0, duration: 800, ease: 'Quad.easeIn', onComplete: function () { d.destroy(); } });
                }
            });
            await this.ctx.decir(this.reto.presentacion || { voz: 'zoe', texto: 'Conecta el helado con el sentido que nos permite saborear su gusto.' });
            var r = this.reto;
            var cb = await L().conectar(this, this.est, {
                desde: function () { return scene.toma; },
                correcto: 'lengua',
                alError: function (id) {
                    var linea = null;
                    (r.errores || []).forEach(function (e) { if (!linea && (e.objetos || []).indexOf(id) >= 0) linea = e; });
                    return scene.ctx.decir(linea || r.errorOtro || { voz: 'zeus', texto: '¡Inténtalo otra vez!' });
                }
            });
            for (var i = 0; i < 4; i++) this.time.delayedCall(i * 160, function () { scene.chispa(cb, 0xff8787); });
            await U.esperar(this, 700);
            U.sfx('miamMiam');
            await this.organos.lengua.reaccion('acierto');
            await this.adivinarSabor();
            await this.ctx.decir(r.acierto || { voz: 'zoe', texto: '¡Muy bien!' }, { estado: 'acierto' });
            this.goteo.remove();
            this.tweens.add({ targets: hel, alpha: 0, duration: 400 });
        },

        chispa: function (cb, color) {
            var p = { t: 0 };
            var c = this.add.circle(0, 0, 7, color).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
                targets: p, t: 1, duration: 650, ease: 'Sine.easeIn',
                onUpdate: function () { var q = cb.punto(p.t); c.setPosition(q.x, q.y); },
                onComplete: function () { c.destroy(); }
            });
        },

        /** Prueba del documento: ¿de qué fruta es el sabor? (por el color del helado). */
        adivinarSabor: async function () {
            var scene = this;
            var m = this.m();
            var mq = m.maquina;
            var frutas = U.mezclar(['fresa', 'limon', 'manzana']);
            // Las frutas llegan por la cinta y se detienen a la derecha del cable.
            var tam = Math.min(m.w * 0.1, 92, m.h * 0.17);
            var x0 = Math.min(mq.x + mq.w / 2 + tam * 0.62, m.w - tam * 3);
            var tarjetas = frutas.map(function (f, i) {
                var c = scene.add.container(x0 + i * tam * 1.2, m.cinta - tam * 0.5).setDepth(30);
                var g = scene.add.graphics();
                g.fillStyle(0xffffff, 1);
                g.fillRoundedRect(-tam / 2, -tam * 0.46, tam, tam * 0.92, 14);
                g.lineStyle(4, 0xff8787, 1);
                g.strokeRoundedRect(-tam / 2, -tam * 0.46, tam, tam * 0.92, 14);
                c.add([g, scene.add.image(0, 0, A().textura(scene, f, 160)).setDisplaySize(tam * 0.74, tam * 0.74)]);
                c.fruta = f;
                c.tam = tam;
                c.alpha = 0;
                var xf = c.x;
                scene.tweens.add({ targets: c, alpha: 1, x: { from: m.w + tam, to: xf }, duration: 700, delay: i * 150, ease: 'Cubic.easeOut' });
                return c;
            });
            await this.ctx.decir({ voz: 'zoe', texto: 'La lengua lo probó. Mira su color: ¿de qué fruta es el sabor del helado?' });
            await new Promise(function (resolver) {
                var ocupado = false;
                var pista = U.crearPista(scene, 9000, function (cancelado) {
                    var k = tarjetas.find(function (t) { return t.fruta === 'fresa'; });
                    return scene.ctx.mano({ punto: { x: k.x, y: k.y }, holdMs: 400, cancelado: cancelado });
                });
                pista.reiniciar();
                var toque = function (p) {
                    if (ocupado) return;
                    var k = tarjetas.find(function (t) { return Math.abs(p.x - t.x) < t.tam / 2 && Math.abs(p.y - t.y) < t.tam * 0.46; });
                    if (!k) return;
                    pista.reiniciar();
                    scene.ctx.quitarMano();
                    if (k.fruta === 'fresa') {
                        scene.input.off('pointerdown', toque);
                        pista.parar();
                        U.sfx('chispas');
                        scene.tweens.add({ targets: k, scale: 1.2, duration: 250, yoyo: true });
                        U.estallido(scene, k.x, k.y, { n: 12, dist: 80, colores: [0xfa5252, 0xffa8a8, 0xffffff] });
                        scene.ctx.decir({ voz: 'zoe', texto: '¡Sí! Es rosado como la fresa: ¡helado de frutilla!' }, { estado: 'acierto' });
                        scene.time.delayedCall(1300, resolver);
                        return;
                    }
                    ocupado = true;
                    scene.tweens.add({ targets: k, angle: { from: -8, to: 8 }, duration: 80, yoyo: true, repeat: 2, onComplete: function () { k.angle = 0; } });
                    scene.ctx.decir({ voz: 'zeus', texto: k.fruta === 'limon' ? 'El limón es amarillo y ácido. Este helado es rosado.' : 'La manzana sabe distinto. Mira el color rosado del helado.' });
                    scene.time.delayedCall(1200, function () { ocupado = false; });
                };
                scene.input.on('pointerdown', toque);
            });
            tarjetas.forEach(function (k) { scene.tweens.add({ targets: k, alpha: 0, duration: 300, onComplete: function () { k.destroy(); } }); });
        },

        /* ── Ronda 2: la cinta transportadora ──────────────────── */

        rondaCinta: async function () {
            var scene = this;
            var m = this.m();
            this.modo = 'cinta';
            this.cablesLab.forEach(function (c) { c.destruir(); });
            this.cablesLab = [];
            this.est.orden.forEach(function (id) { scene.est.encender(id, false); });
            await this.ctx.decir({ voz: 'zeus', texto: '¡La cinta de la fábrica! Arrastra cada cosa a la estación del sentido que la percibe.' });
            this.cintaActiva = true;
            this.clasificadas = 0;
            this.meta = 6;
            var cola = [];
            var rellenar = function () { cola = cola.concat(U.mezclar(Object.keys(COSAS))); };
            this.salida = this.time.addEvent({
                delay: 2600, loop: true, callback: function () {
                    if (scene.enCinta.length >= 4) return;
                    if (!cola.length) rellenar();
                    scene.ponerEnCinta(cola.shift());
                }
            });
            this.salida.callback();
            this.pista = U.crearPista(this, 9000, function (cancelado) {
                var c = scene.enCinta.find(function (k) { return !k.arrastre && k.cont.x > m.w * 0.2 && k.cont.x < m.w * 0.8; });
                if (!c) return Promise.resolve();
                var h = scene.est.enchufe(COSAS[c.id].s);
                return scene.ctx.mano({ punto: { x: c.cont.x + 30, y: c.cont.y }, holdMs: 250, cancelado: cancelado, arrastre: { dx: h.x - c.cont.x, dy: h.y - c.cont.y, durMs: 900 } });
            });
            this.pista.reiniciar();
            var arr = null;
            var abajo = function (p) {
                scene.pista.reiniciar();
                scene.ctx.quitarMano();
                var c = scene.enCinta.find(function (k) { return !k.volando && Phaser.Math.Distance.Between(p.x, p.y, k.cont.x, k.cont.y) < k.tam * 0.6; });
                if (!c) return;
                arr = c;
                c.arrastre = { dx: p.x - c.cont.x, dy: p.y - c.cont.y };
                c.cont.setDepth(40);
                scene.tweens.add({ targets: c.cont, scale: 1.12, duration: 120 });
            };
            var mover = function (p) {
                if (!arr) return;
                arr.cont.x = p.x - arr.arrastre.dx;
                arr.cont.y = p.y - arr.arrastre.dy;
                var sobre = scene.est.en(p.x, p.y);
                scene.est.orden.forEach(function (k) { scene.organos[k].cont.setScale(k === sobre ? 1.12 : 1); });
            };
            var arriba = function (p) {
                if (!arr) return;
                var c = arr;
                arr = null;
                c.arrastre = null;
                scene.est.orden.forEach(function (k) { scene.organos[k].cont.setScale(1); });
                var id = scene.est.en(p.x, p.y);
                if (id) scene.soltarEn(c, id);
                else scene.volverACinta(c);
            };
            this.input.on('pointerdown', abajo);
            this.input.on('pointermove', mover);
            this.input.on('pointerup', arriba);
            await new Promise(function (r) { scene.finCinta = r; });
            this.input.off('pointerdown', abajo);
            this.input.off('pointermove', mover);
            this.input.off('pointerup', arriba);
            this.salida.remove();
            this.pista.parar();
            this.cintaActiva = false;
            this.enCinta.forEach(function (c) { scene.tweens.add({ targets: c.cont, alpha: 0, duration: 300, onComplete: function () { c.cont.destroy(); } }); });
            this.enCinta = [];
        },

        ponerEnCinta: function (id) {
            var m = this.m();
            var tam = Math.min(m.obj * 0.62, 96);
            var c = this.add.container(-tam, m.cinta - tam * 0.42).setDepth(15);
            var sombra = this.add.ellipse(0, tam * 0.42, tam * 0.7, 10, 0x000000, 0.2);
            var img = this.add.image(0, 0, A().textura(this, COSAS[id].tex, 200)).setDisplaySize(tam * 0.9, tam * 0.9);
            c.add([sombra, img]);
            this.enCinta.push({ id: id, cont: c, tam: tam });
        },

        volverACinta: function (c) {
            var m = this.m();
            c.volando = true;
            var scene = this;
            this.tweens.add({ targets: c.cont, y: m.cinta - c.tam * 0.42, scale: 1, duration: 450, ease: 'Bounce.easeOut', onComplete: function () { c.volando = false; c.cont.setDepth(15); void scene; } });
        },

        soltarEn: function (c, id) {
            var scene = this;
            var info = COSAS[c.id];
            var h = this.est.enchufe(id);
            if (id === info.s) {
                this.enCinta = this.enCinta.filter(function (k) { return k !== c; });
                c.volando = true;
                this.tweens.add({ targets: c.cont, x: h.x, y: h.y + 20, scale: 0.3, alpha: 0, duration: 380, ease: 'Quad.easeIn', onComplete: function () { c.cont.destroy(); } });
                this.est.encender(id, true);
                this.time.delayedCall(700, function () { scene.est.encender(id, false); });
                U.sfx(id === 'lengua' ? 'miamMiam' : 'recompensa');
                this.organos[id].reaccion('acierto');
                this.clasificadas += 1;
                this.pintarContador();
                if (this.clasificadas === 2) this.ctx.decir({ voz: 'zoe', texto: '¡Muy bien! ' + info.por }, { estado: 'acierto' });
                if (this.clasificadas >= this.meta && this.finCinta) {
                    var fin = this.finCinta;
                    this.finCinta = null;
                    this.ctx.decir({ voz: 'zoe', texto: '¡La fábrica clasificó todo! Cada cosa con su sentido.' }, { estado: 'acierto' });
                    this.time.delayedCall(1400, fin);
                }
                return;
            }
            // Rebota a la cinta y Zeus explica.
            L().chispazo(this, h.x, h.y);
            this.est.parpadeo(id);
            this.organos[id].reaccion('error');
            this.ctx.decir({ voz: 'zeus', texto: info.por });
            this.volverACinta(c);
        },

        pintarContador: function () {
            var m = this.m();
            if (!this.contador) {
                this.contador = this.add.container(m.w * 0.5, m.cinta + 56).setDepth(16);
                this.contadorG = this.add.graphics();
                this.contador.add(this.contadorG);
            }
            var g = this.contadorG;
            g.clear();
            for (var i = 0; i < this.meta; i++) {
                var x = (i - (this.meta - 1) / 2) * 26;
                g.fillStyle(i < this.clasificadas ? 0x51cf66 : 0x343a40, 1);
                g.fillCircle(x, 0, 9);
                g.lineStyle(2, 0xffffff, 0.6);
                g.strokeCircle(x, 0, 9);
            }
        },

        moverCinta: function (time, dt) {
            var m = this.m();
            var g = this.cintaG;
            g.clear();
            var paso = 40;
            var off = this.cintaActiva && !U.reducido() ? (time / 1000 * 60) % paso : 0;
            g.lineStyle(3, 0x5c636a, 1);
            for (var x = -paso + off; x < m.w + paso; x += paso) g.lineBetween(x, m.cinta - 12, x + 12, m.cinta + 18);
            if (!this.cintaActiva) return;
            var scene = this;
            this.enCinta.forEach(function (c) {
                if (c.arrastre || c.volando) return;
                c.cont.x += 60 * dt;
                c.cont.y = m.cinta - c.tam * 0.42 + Math.sin(time / 120 + c.cont.x) * 0.6;
                if (c.cont.x > m.w + c.tam) c.cont.x = -c.tam;
            });
            void scene;
        },

        /* ── API ───────────────────────────────────────────────── */

        demo: async function () {
            var mq = this.m().maquina;
            this.modo = 'demo';
            await L().demoCable(this, this.est, mq.x, mq.y, Math.min(mq.h * 0.55, this.m().obj), this.toma);
            this.modo = '';
        },

        jugar: async function () {
            await this.rondaHelado();
            if (!this.ctx.vivo()) return;
            await this.rondaCinta();
        },

        fiestaFinal: async function () {
            await L().tablero(this, [
                { id: 'campana', organo: 'oido' }, { id: 'flor', organo: 'nariz' },
                { id: 'helado', organo: 'lengua' }, { id: 'sol', organo: 'ojo' }
            ]);
        },

        update: function (time, delta) {
            var dt = Math.min(delta || 16, 50) / 1000;
            if (!U.reducido()) this.engranajes.forEach(function (g) { g.rotation += g.vel * dt; });
            this.moverCinta(time, dt);
            L().dibujarCables(this, time);
            var foco = this.enCinta.length ? { x: this.enCinta[0].cont.x, y: this.enCinta[0].cont.y } : (this.helado ? { x: this.helado.x, y: this.helado.y } : null);
            this.est.actualizar(time, foco);
        },

        estado: function () {
            var scene = this;
            return {
                modo: this.modo,
                toma: this.toma,
                clasificadas: this.clasificadas || 0,
                cinta: this.enCinta.map(function (c) { return { id: c.id, s: COSAS[c.id].s, x: Math.round(c.cont.x), y: Math.round(c.cont.y) }; }),
                estaciones: this.est.orden.reduce(function (acc, id) { acc[id] = scene.est.enchufe(id); return acc; }, {})
            };
        }
    };

    global.PedniaFabrica = B.crearMotor({ id: 'fabrica', fondo: '#ffe3ec', escena: escena });
})(typeof window !== 'undefined' ? window : this);
