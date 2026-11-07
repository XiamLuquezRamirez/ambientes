/**
 * PedniaConcierto — "Concierto para la Oreja" (¿Con qué sentido sentimos la campana?, 3-4 años).
 *
 * Un parque con una glorieta de música y, abajo, las 4 burbujas del mural mágico (oído, ojo,
 * nariz, lengua). Lo que suena se escucha con el oído y va formando la banda de la glorieta.
 *   1. La campana   (reto del documento): la campana dorada cuelga y repica de verdad (péndulo con
 *      badajo que golpea); se toca la burbuja del oído o se arrastra la campana hasta ella.
 *   2. Los globos   suben globos con cosas: hay que reventar los que SUENAN (tambor, maracas,
 *      pandereta). Si revienta una flor, un helado o el sol, va a SU sentido y Zeus lo explica.
 *   3. ¿Quién oye?  las burbujas cambian de lugar y suena un instrumento de la glorieta: tocar el oído.
 *   4. El concierto la oreja dirige: cada toque a un instrumento suena y llega a la oreja.
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var U = B.util;
    var A = function () { return global.PedniaArte; };
    var Sfx = function () { return global.EncuentraSonidoSfx; };

    var SENTIDO = { campana: 'oido', tambor: 'oido', maracas: 'oido', pandereta: 'oido', flor: 'nariz', helado: 'lengua', sol: 'ojo' };
    var NOMBRE = { campana: 'la campana', tambor: 'el tambor', maracas: 'las maracas', pandereta: 'la pandereta', flor: 'la flor', helado: 'el helado', sol: 'el sol' };
    var COMO = {
        nariz: 'se huele con la nariz', lengua: 'se saborea con la lengua', ojo: 'se mira con los ojos'
    };
    var ORGANOS = ['oido', 'ojo', 'nariz', 'lengua'];
    var COLORES_GLOBO = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2', '#ff922b'];

    function sonidoDe(id) {
        return { campana: 'campana', tambor: 'tambor', maracas: 'maracas', pandereta: 'pandereta' }[id];
    }

    var escena = {
        create: function () {
            this.organos = {};
            this.objetos = [];
            this.globos = [];
            this.banda = [];
            this.modo = '';
            this.nubes = [];
            this.luces = [];
            this.input.on('pointerdown', this.alTocar, this);
            this.input.on('pointermove', this.alMover, this);
            this.input.on('pointerup', this.alSoltar, this);
            this.dibujarFondo();
            this.crearOrganos();
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.ubicarOrganos(); scene.ubicarBanda(); });
        },

        /* ── Escenario: parque con glorieta ─────────────────────── */

        medidas: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var bw = Math.min(w * 0.36, 440, h * 0.5);
            return {
                w: w, h: h,
                suelo: h * 0.6,
                cx: w * 0.5,
                bw: bw,
                piso: h * 0.6 + 6,
                techo: h * 0.6 - bw * 0.62,
                r: Phaser.Math.Clamp(Math.min(Math.min(w, h) * 0.085, w * 0.068), 36, 72),
                obj: Phaser.Math.Clamp(Math.min(w, h) * 0.2, 90, 170)
            };
        },

        dibujarFondo: function () {
            var m = this.medidas();
            var w = m.w;
            var h = m.h;
            if (!this.textures.exists('cc:cielo')) {
                var t = this.textures.createCanvas('cc:cielo', 4, 256);
                var c = t.getContext();
                var g = c.createLinearGradient(0, 0, 0, 256);
                g.addColorStop(0, '#5fb0f5');
                g.addColorStop(0.65, '#bfe3ff');
                g.addColorStop(1, '#eaf6ff');
                c.fillStyle = g;
                c.fillRect(0, 0, 4, 256);
                t.refresh();
            }
            if (!this.cielo) this.cielo = this.add.image(0, 0, 'cc:cielo').setOrigin(0).setDepth(-20);
            this.cielo.setDisplaySize(w, m.suelo + 4);

            if (!this.sol) {
                this.sol = this.add.container(0, 0).setDepth(-19);
                var halo = this.add.circle(0, 0, 70, 0xfff3bf, 0.45);
                var rayos = this.add.image(0, 0, A().textura(this, 'sol_rayos', 256)).setDisplaySize(170, 170).setAlpha(0.9);
                var disco = this.add.circle(0, 0, 40, 0xffe066);
                var brillo = this.add.circle(-10, -10, 22, 0xfff9db, 0.8);
                this.sol.add([halo, rayos, disco, brillo]);
                this.sol.rayos = rayos;
            }
            // Bajo los botones de la esquina, sin taparse con ellos.
            this.sol.setPosition(w * 0.88, Math.max(h * 0.3, 150));

            if (!this.nubes.length) {
                for (var i = 0; i < 4; i++) {
                    var n = this.add.graphics().setDepth(-18);
                    var s = 0.7 + Math.random() * 0.6;
                    n.fillStyle(0xdbe9f6, 1);
                    n.fillEllipse(0, 10 * s, 150 * s, 34 * s);
                    n.fillStyle(0xffffff, 1);
                    n.fillCircle(-40 * s, 0, 26 * s);
                    n.fillCircle(-6 * s, -14 * s, 36 * s);
                    n.fillCircle(34 * s, -2 * s, 26 * s);
                    n.fillEllipse(0, 6 * s, 140 * s, 30 * s);
                    n.x = Math.random() * w;
                    n.y = h * (0.08 + Math.random() * 0.22);
                    n.vel = 6 + Math.random() * 10;
                    this.nubes.push(n);
                }
            }

            var f = this.fondoG || (this.fondoG = this.add.graphics().setDepth(-17));
            f.clear();
            // Colinas lejanas.
            f.fillStyle(0xa9dca0, 1);
            f.fillEllipse(w * 0.18, m.suelo + 10, w * 0.7, h * 0.26);
            f.fillEllipse(w * 0.86, m.suelo + 14, w * 0.6, h * 0.22);
            f.fillStyle(0x8fcf86, 1);
            f.fillEllipse(w * 0.55, m.suelo + 18, w * 0.8, h * 0.16);
            // Árboles a los lados.
            var scene = this;
            [[w * 0.08, 1.05], [w * 0.2, 0.8], [w * 0.92, 1.1], [w * 0.8, 0.78]].forEach(function (a) {
                scene.arbol(f, a[0], m.suelo + 4, Math.min(w, h) * 0.11 * a[1]);
            });
            // Césped con franjas.
            f.fillStyle(0x69c25a, 1);
            f.fillRect(0, m.suelo, w, h - m.suelo);
            for (var k = 0; k < 9; k++) {
                f.fillStyle(k % 2 ? 0x74cb64 : 0x62b954, 1);
                var y0 = m.suelo + (h - m.suelo) * Math.pow(k / 9, 1.4);
                var y1 = m.suelo + (h - m.suelo) * Math.pow((k + 1) / 9, 1.4);
                f.fillRect(0, y0, w, y1 - y0);
            }
            // Camino de baldosas hacia la glorieta.
            f.fillStyle(0xe9d8b4, 1);
            f.fillTriangle(m.cx - m.bw * 0.16, m.piso + 10, m.cx + m.bw * 0.16, m.piso + 10, m.cx + w * 0.2, h);
            f.fillTriangle(m.cx - m.bw * 0.16, m.piso + 10, m.cx + w * 0.2, h, m.cx - w * 0.2, h);
            f.lineStyle(2, 0xcdb88f, 1);
            for (var b = 1; b < 7; b++) {
                var yy = m.piso + 10 + (h - m.piso) * Math.pow(b / 7, 1.3);
                var ancho = m.bw * 0.16 + (w * 0.2 - m.bw * 0.16) * ((yy - m.piso) / (h - m.piso));
                f.lineBetween(m.cx - ancho, yy, m.cx + ancho, yy);
            }
            // Macizos de flores.
            [[w * 0.14, h * 0.7], [w * 0.86, h * 0.7], [w * 0.33, m.suelo + 14], [w * 0.67, m.suelo + 14]].forEach(function (p, i) {
                f.fillStyle(0x2f9e44, 1);
                f.fillEllipse(p[0], p[1], 90, 26);
                for (var q = 0; q < 7; q++) {
                    f.fillStyle([0xff6b6b, 0xfcc419, 0xf783ac, 0xffffff][(q + i) % 4], 1);
                    f.fillCircle(p[0] - 36 + q * 12, p[1] - 6 - (q % 2) * 5, 5);
                }
            });
            this.dibujarGlorieta(m);
        },

        arbol: function (f, x, y, s) {
            f.fillStyle(0x000000, 0.12);
            f.fillEllipse(x, y + 4, s * 1.6, s * 0.3);
            f.fillStyle(0x7a4a24, 1);
            f.fillRect(x - s * 0.1, y - s * 1.1, s * 0.2, s * 1.1);
            f.fillStyle(0x2b8a3e, 1);
            f.fillCircle(x - s * 0.4, y - s * 1.2, s * 0.5);
            f.fillCircle(x + s * 0.42, y - s * 1.15, s * 0.48);
            f.fillCircle(x, y - s * 1.6, s * 0.62);
            f.fillStyle(0x40c057, 1);
            f.fillCircle(x - s * 0.25, y - s * 1.45, s * 0.42);
            f.fillCircle(x + s * 0.28, y - s * 1.35, s * 0.36);
            f.fillStyle(0x8ce99a, 0.7);
            f.fillCircle(x - s * 0.32, y - s * 1.62, s * 0.18);
        },

        dibujarGlorieta: function (m) {
            var g = this.glorietaG || (this.glorietaG = this.add.graphics().setDepth(-6));
            g.clear();
            var cx = m.cx;
            var bw = m.bw;
            var piso = m.piso;
            var techo = m.techo;
            // Sombra.
            g.fillStyle(0x000000, 0.14);
            g.fillEllipse(cx, piso + 16, bw * 1.15, bw * 0.12);
            // Plataforma.
            g.fillStyle(0xc9a27a, 1);
            g.fillRect(cx - bw * 0.52, piso - 4, bw * 1.04, 22);
            g.fillStyle(0xe8cfae, 1);
            g.fillEllipse(cx, piso - 4, bw * 1.04, bw * 0.12);
            g.fillStyle(0xb5835a, 1);
            for (var s = 0; s < 9; s++) g.fillRect(cx - bw * 0.5 + s * bw * 0.125, piso + 2, bw * 0.06, 14);
            // Escalones.
            g.fillStyle(0xdcc3a1, 1);
            g.fillRect(cx - bw * 0.15, piso + 14, bw * 0.3, 8);
            g.fillStyle(0xcfb38e, 1);
            g.fillRect(cx - bw * 0.17, piso + 22, bw * 0.34, 8);
            // Columnas.
            var cols = 5;
            for (var c = 0; c < cols; c++) {
                var x = cx - bw * 0.46 + c * (bw * 0.92 / (cols - 1));
                g.fillStyle(0xffffff, 1);
                g.fillRect(x - 7, techo + bw * 0.12, 14, piso - techo - bw * 0.12 - 4);
                g.fillStyle(0xdee2e6, 1);
                g.fillRect(x + 2, techo + bw * 0.12, 5, piso - techo - bw * 0.12 - 4);
                g.fillStyle(0xf1f3f5, 1);
                g.fillRect(x - 10, piso - 12, 20, 8);
                g.fillRect(x - 10, techo + bw * 0.12, 20, 7);
            }
            // Barandilla.
            g.lineStyle(4, 0xffffff, 1);
            g.lineBetween(cx - bw * 0.46, piso - bw * 0.12, cx - bw * 0.12, piso - bw * 0.12);
            g.lineBetween(cx + bw * 0.12, piso - bw * 0.12, cx + bw * 0.46, piso - bw * 0.12);
            g.lineStyle(2, 0xffffff, 1);
            for (var bb = 0; bb < 12; bb++) {
                var xb = cx - bw * 0.44 + bb * bw * 0.03;
                g.lineBetween(xb, piso - bw * 0.12, xb, piso - 6);
                g.lineBetween(cx + bw * 0.14 + bb * bw * 0.027, piso - bw * 0.12, cx + bw * 0.14 + bb * bw * 0.027, piso - 6);
            }
            // Cornisa y techo a rayas.
            g.fillStyle(0xffffff, 1);
            g.fillRect(cx - bw * 0.55, techo + bw * 0.06, bw * 1.1, bw * 0.07);
            var franjas = 10;
            for (var r = 0; r < franjas; r++) {
                var x0 = cx - bw * 0.55 + r * bw * 1.1 / franjas;
                var x1 = x0 + bw * 1.1 / franjas;
                var t0 = (r / franjas - 0.5);
                var t1 = ((r + 1) / franjas - 0.5);
                g.fillStyle(r % 2 ? 0xffffff : 0xe03131, 1);
                g.beginPath();
                g.moveTo(x0, techo + bw * 0.06);
                g.lineTo(cx + t0 * bw * 0.16, techo - bw * 0.3);
                g.lineTo(cx + t1 * bw * 0.16, techo - bw * 0.3);
                g.lineTo(x1, techo + bw * 0.06);
                g.closePath();
                g.fillPath();
            }
            // Festón.
            for (var fe = 0; fe < franjas; fe++) {
                g.fillStyle(fe % 2 ? 0xe03131 : 0xffffff, 1);
                g.fillCircle(cx - bw * 0.55 + (fe + 0.5) * bw * 1.1 / franjas, techo + bw * 0.13, bw * 1.1 / franjas / 2);
            }
            // Remate con banderín.
            g.fillStyle(0xfab005, 1);
            g.fillCircle(cx, techo - bw * 0.31, 7);
            g.lineStyle(3, 0x868e96, 1);
            g.lineBetween(cx, techo - bw * 0.31, cx, techo - bw * 0.46);
            g.fillStyle(0x1c7ed6, 1);
            g.fillTriangle(cx, techo - bw * 0.46, cx + 26, techo - bw * 0.42, cx, techo - bw * 0.38);
            // Bombillas en la cornisa (se encienden en update).
            this.luces = [];
            for (var l = 0; l < 11; l++) this.luces.push({ x: cx - bw * 0.52 + l * bw * 0.104, y: techo + bw * 0.1 });
            if (!this.lucesG) this.lucesG = this.add.graphics().setDepth(-5);
        },

        /* ── Órganos (burbujas del mural) ───────────────────────── */

        crearOrganos: function () {
            var scene = this;
            var m = this.medidas();
            ORGANOS.forEach(function (id) {
                scene.organos[id] = global.PedniaOrganos.crear(scene, id === 'oido' ? 'oreja' : id, 0, 0, m.r, { id: id });
                scene.organos[id].cont.setDepth(20);
            });
            this.orden = ORGANOS.slice();
            this.ubicarOrganos();
        },

        posOrgano: function (i, m) {
            m = m || this.medidas();
            var paso = Math.min(m.w * 0.17, m.r * 2.9);
            var cx = Math.min(m.w * 0.5, m.w - 150 - (1.5 * paso + m.r * 1.1));
            return { x: cx + (i - 1.5) * paso, y: m.h - m.r * 1.45 };
        },

        ubicarOrganos: function () {
            var scene = this;
            var m = this.medidas();
            this.orden.forEach(function (id, i) {
                var o = scene.organos[id];
                var p = scene.posOrgano(i, m);
                o.base.x = p.x;
                o.base.y = p.y;
                if (!o.moviendo) o.cont.setPosition(p.x, p.y);
            });
        },

        organoEn: function (x, y) {
            var scene = this;
            var hit = null;
            ORGANOS.forEach(function (id) {
                if (!hit && scene.organos[id].contiene(x, y, 1.15)) hit = id;
            });
            return hit;
        },

        /* ── Objetos: instrumentos y cosas de otros sentidos ────── */

        crearObjeto: function (id, x, y, tam) {
            var scene = this;
            var cont = this.add.container(x, y).setDepth(12);
            var o = { id: id, cont: cont, tam: tam, suena: !!sonidoDe(id), sentido: SENTIDO[id], partes: {} };
            var T = function (n, t) { return A().textura(scene, n, t || 256); };
            if (id === 'tambor') {
                o.partes.cuerpo = this.add.image(0, 0, T('tambor')).setDisplaySize(tam, tam);
                // Baquetas apoyadas sobre el parche: giran desde el mango y la bola golpea.
                o.partes.b1 = this.add.image(-tam * 0.355, -tam * 0.53, T('baqueta', 128)).setDisplaySize(tam * 0.55, tam * 0.55).setOrigin(0.5, 0.95).setAngle(150);
                o.partes.b2 = this.add.image(tam * 0.355, -tam * 0.53, T('baqueta', 128)).setDisplaySize(tam * 0.55, tam * 0.55).setOrigin(0.5, 0.95).setAngle(-150);
                o.partes.b1.base = 150;
                o.partes.b2.base = -150;
                cont.add([o.partes.cuerpo, o.partes.b1, o.partes.b2]);
            } else if (id === 'maracas') {
                o.partes.m1 = this.add.image(-tam * 0.14, tam * 0.1, T('maraca')).setDisplaySize(tam * 0.8, tam * 0.8).setOrigin(0.5, 0.85).setAngle(-22);
                o.partes.m2 = this.add.image(tam * 0.14, tam * 0.1, T('maraca')).setDisplaySize(tam * 0.8, tam * 0.8).setOrigin(0.5, 0.85).setAngle(22);
                o.partes.m2.setTint(0xffe8f0);
                cont.add([o.partes.m1, o.partes.m2]);
            } else if (id === 'pandereta') {
                o.partes.cuerpo = this.add.image(0, 0, T('pandereta')).setDisplaySize(tam * 0.9, tam * 0.9);
                cont.add(o.partes.cuerpo);
            } else if (id === 'campana') {
                o.partes.badajo = this.add.image(0, tam * 0.05, T('badajo', 128)).setDisplaySize(tam * 0.32, tam * 0.32).setOrigin(0.5, 0);
                o.partes.cuerpo = this.add.image(0, 0, T('campana')).setDisplaySize(tam, tam);
                cont.add([o.partes.badajo, o.partes.cuerpo]);
            } else if (id === 'sol') {
                o.partes.rayos = this.add.image(0, 0, T('sol_rayos')).setDisplaySize(tam * 1.05, tam * 1.05);
                o.partes.cuerpo = this.add.image(0, 0, T('sol')).setDisplaySize(tam * 1.05, tam * 1.05);
                cont.add([o.partes.rayos, o.partes.cuerpo]);
            } else {
                o.partes.cuerpo = this.add.image(0, 0, T(id)).setDisplaySize(tam, tam);
                cont.add(o.partes.cuerpo);
            }
            this.objetos.push(o);
            return o;
        },

        /** Hace sonar un objeto con su animación propia. */
        sonar: function (o, opts) {
            opts = opts || {};
            var scene = this;
            var nombre = sonidoDe(o.id);
            if (!nombre) return 0;
            var pan = Phaser.Math.Clamp((o.cont.x / this.scale.width) * 2 - 1, -1, 1) * 0.7;
            var dur = 0;
            if (Sfx() && nombre) {
                dur = opts.junto
                    ? Sfx().acompanar(nombre, { breve: true, pan: pan, vol: opts.vol || 0.7 })
                    : Sfx().reproducir(nombre, { breve: opts.breve !== false, pan: pan, vol: opts.vol || 0.9 });
            }
            var p = o.partes;
            if (o.id === 'tambor') {
                [p.b1, p.b2].forEach(function (b, i) {
                    // La baqueta se levanta y vuelve a golpear el parche.
                    scene.tweens.add({ targets: b, angle: b.base + (i ? 14 : -14), duration: 110, yoyo: true, repeat: 2, delay: i * 140, ease: 'Quad.easeOut' });
                });
                scene.tweens.add({ targets: p.cuerpo, scaleY: p.cuerpo.scaleY * 0.94, duration: 90, yoyo: true, repeat: 3, delay: 80 });
            } else if (o.id === 'maracas') {
                [p.m1, p.m2].forEach(function (mm, i) {
                    scene.tweens.add({ targets: mm, angle: (i ? 22 : -22) + (i ? 18 : -18), duration: 70, yoyo: true, repeat: 5, delay: i * 35 });
                });
            } else if (o.id === 'pandereta') {
                scene.tweens.add({ targets: o.cont, angle: { from: -16, to: 16 }, duration: 80, yoyo: true, repeat: 4, onComplete: function () { o.cont.angle = 0; } });
            } else if (o.id === 'campana') {
                if (o.pendulo) o.pendulo.w += 2.6;
                else scene.tweens.add({ targets: o.cont, angle: { from: -18, to: 18 }, duration: 160, yoyo: true, repeat: 2, onComplete: function () { o.cont.angle = 0; } });
            }
            this.notas(o.cont.x, o.cont.y - o.tam * 0.3, 3);
            return dur;
        },

        notas: function (x, y, n, hacia) {
            var scene = this;
            for (var i = 0; i < (n || 3); i++) {
                var nota = this.add.image(x + U.rnd(-20, 20), y, A().textura(this, 'nota', 64))
                    .setDisplaySize(30, 30).setDepth(40).setTint([0xe64980, 0x1c7ed6, 0xf59f00, 0x2f9e44][i % 4]);
                var dx = hacia ? hacia.x : x + U.rnd(-90, 90);
                var dy = hacia ? hacia.y : y - U.rnd(80, 150);
                scene.tweens.add({
                    targets: nota, x: dx, y: dy, angle: U.rnd(-30, 30), alpha: { from: 1, to: hacia ? 0.2 : 0 },
                    scale: hacia ? nota.scale * 0.5 : nota.scale * 1.2,
                    delay: i * 140, duration: hacia ? 650 : 1100, ease: hacia ? 'Quad.easeIn' : 'Sine.easeOut',
                    onComplete: function () { this.targets[0].destroy(); }
                });
            }
        },

        /* ── Campana colgante con física de péndulo ─────────────── */

        colgarCampana: function (id) {
            var m = this.medidas();
            var o = this.crearObjeto(id, 0, 0, m.obj);
            var largo = Math.max(30, (m.h * 0.42 - m.obj * 0.5) - (m.techo + m.bw * 0.16));
            o.cont.setPosition(0, largo + m.obj * 0.5);
            var piv = this.add.container(m.cx, m.techo + m.bw * 0.16).setDepth(12);
            var cuerda = this.add.graphics();
            if (id === 'campana') {
                cuerda.lineStyle(4, 0x8a5a2b, 1);
                cuerda.lineBetween(0, 0, 0, largo + m.obj * 0.08);
            } else {
                // Lo que no cuelga se presenta sobre un taburete de madera.
                o.rigido = true;
                var tx = piv.x;
                var ty = piv.y + largo + m.obj * 0.88;
                var tb = this.taburete = this.add.graphics().setDepth(11);
                tb.fillStyle(0x000000, 0.15);
                tb.fillEllipse(tx, ty + m.obj * 0.5, m.obj * 0.8, m.obj * 0.12);
                tb.fillStyle(0x8a5a2b, 1);
                [-0.28, 0.28].forEach(function (k) { tb.fillRect(tx + k * m.obj - 5, ty, 10, m.obj * 0.5); });
                tb.fillStyle(0x6b3e1f, 1);
                tb.fillRect(tx - m.obj * 0.3, ty + m.obj * 0.3, m.obj * 0.6, 7);
                tb.fillStyle(0xc98a4b, 1);
                tb.fillRoundedRect(tx - m.obj * 0.4, ty - 8, m.obj * 0.8, 16, 6);
                tb.fillStyle(0xe3b07a, 1);
                tb.fillRoundedRect(tx - m.obj * 0.38, ty - 8, m.obj * 0.76, 6, 3);
            }
            piv.add([cuerda, o.cont]);
            o.piv = piv;
            o.largo = largo;
            o.casa = { x: piv.x, y: piv.y };
            o.pendulo = { a: 0, w: 0, b: 0, bw: 0 };
            o.cont.alpha = 0;
            o.cont.y -= 60;
            this.tweens.add({ targets: o.cont, alpha: 1, y: largo + m.obj * 0.5, duration: 700, ease: 'Back.easeOut' });
            this.colgada = o;
            return o;
        },

        centroColgada: function () {
            var o = this.colgada;
            if (!o) return null;
            var a = o.piv.rotation;
            var d = o.largo + o.tam * 0.5;
            return { x: o.piv.x - Math.sin(a) * d, y: o.piv.y + Math.cos(a) * d };
        },

        fisicaCampana: function (dt) {
            var o = this.colgada;
            if (!o || !o.pendulo || o.volando) return;
            var p = o.pendulo;
            var ax = 0;
            if (o.arrastre) {
                var nx = o.piv.x + (o.arrastre.x - o.piv.x) * Math.min(1, dt * 14);
                var ny = o.piv.y + (o.arrastre.y - o.piv.y) * Math.min(1, dt * 14);
                ax = (nx - o.piv.x) / Math.max(dt, 0.001);
                o.vx = o.vx == null ? 0 : o.vx;
                var acc = (ax - o.vx) / Math.max(dt, 0.001);
                o.vx = ax;
                p.w += -acc * 0.00018;
                o.piv.setPosition(nx, ny);
            }
            // Péndulo amortiguado del cuerpo (lo que está en el taburete solo se mece al arrastrarlo).
            if (o.rigido && !o.arrastre) p.w += (-60 * p.a - 9 * p.w) * dt;
            else p.w += (-9 * Math.sin(p.a) - 0.9 * p.w) * dt;
            p.a += p.w * dt;
            p.a = Phaser.Math.Clamp(p.a, -1.1, 1.1);
            o.piv.rotation = p.a;
            if (!o.partes.badajo) return;
            // El badajo se queda atrás y golpea las paredes.
            p.bw += (-30 * p.b - 2.2 * p.bw - (-9 * Math.sin(p.a) - 0.9 * p.w) * 3) * dt;
            p.b += p.bw * dt;
            // Holgura del badajo: golpea la pared en cada extremo del vaivén (y ahí suena).
            var lim = 0.14;
            if (Math.abs(p.b) > lim) {
                var v = Math.abs(p.bw);
                p.b = lim * Math.sign(p.b);
                p.bw = -p.bw * 0.35;
                if (v > 0.4 && (!o.ultimoGolpe || this.time.now - o.ultimoGolpe > 160)) {
                    o.ultimoGolpe = this.time.now;
                    this.golpeCampana(o, Math.min(1, v / 1.2));
                }
            }
            o.partes.badajo.rotation = p.b;
        },

        golpeCampana: function (o, fuerza) {
            if (Sfx()) Sfx().acompanar('campana', { breve: true, vol: 0.35 + fuerza * 0.6, pan: (o.piv.x / this.scale.width) * 1.4 - 0.7 });
            var c = this.centroColgada();
            if (c) this.notas(c.x, c.y - o.tam * 0.3, 1 + Math.round(fuerza * 2));
            if (this.organos.ojo) this.organos.ojo.mirar(c.x, c.y);
        },

        empujarCampana: function (f) {
            if (this.colgada && this.colgada.pendulo) this.colgada.pendulo.w += f;
        },

        soltarCampana: function () {
            var o = this.colgada;
            if (!o) return;
            o.arrastre = null;
            this.tweens.add({ targets: o.piv, x: o.casa.x, y: o.casa.y, duration: 520, ease: 'Back.easeOut' });
            this.empujarCampana(U.rnd(-1.5, 1.5));
        },

        /** El objeto vuela en arco hasta (x, y). */
        volarA: function (cont, x, y, ms, escala) {
            var scene = this;
            var x0 = cont.x;
            var y0 = cont.y;
            var alto = Math.min(y0, y) - 120;
            var s0 = cont.scale;
            var prog = { k: 0 };
            if (global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('vuela');
            return U.tween(this, {
                targets: prog, k: 1, duration: ms || 700, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var k = prog.k;
                    var a = (1 - k) * (1 - k);
                    var b = 2 * (1 - k) * k;
                    var c = k * k;
                    cont.x = a * x0 + b * ((x0 + x) / 2) + c * x;
                    cont.y = a * y0 + b * alto + c * y;
                    cont.scale = s0 + ((escala != null ? escala : s0) - s0) * k;
                    cont.angle = Math.sin(k * Math.PI) * 14 * (x > x0 ? 1 : -1);
                    scene.organos.ojo && scene.organos.ojo.mirar(cont.x, cont.y);
                }
            });
        },

        /* ── Banda de la glorieta ──────────────────────────────── */

        /** Cada instrumento se apoya en el piso: cuánto baja su base (PIE) y cuánto mide (ALTO), en fracción de su tamaño. */
        PIE: { campana: 0.37, tambor: 0.41, maracas: 0.2, pandereta: 0.4 },
        ALTO: { campana: 0.8, tambor: 0.62, maracas: 0.78, pandereta: 0.8 },

        puestoBanda: function (i, m, o, grande) {
            m = m || this.medidas();
            var tamVis = m.obj * (grande ? 0.72 : 0.55);
            var pie = o ? (this.PIE[o.id] || 0.4) : 0.4;
            var paso = Math.max(m.bw * 0.22, tamVis * 0.98);
            return { x: m.cx + (i - 1.5) * paso, y: m.piso - 4 - pie * tamVis, escala: o ? tamVis / o.tam : 1 };
        },

        /** Centro visible del instrumento (para tocarlo). */
        centroBanda: function (o) {
            var s = o.tam * o.cont.scale;
            var base = o.cont.y + (this.PIE[o.id] || 0.4) * s;
            return { x: o.cont.x, y: base - (this.ALTO[o.id] || 0.8) * s / 2, r: s * 0.5 };
        },

        llevarABanda: function (o) {
            var i = this.banda.length;
            this.banda.push(o);
            var p = this.puestoBanda(i, null, o);
            o.cont.setDepth(-4);
            var scene = this;
            return this.volarA(o.cont, p.x, p.y, 650, p.escala).then(function () {
                o.cont.angle = 0;
                scene.tweens.add({ targets: o.cont, scale: { from: p.escala * 0.85, to: p.escala }, duration: 260, ease: 'Back.easeOut' });
                U.estallido(scene, p.x, p.y, { n: 10, dist: 70, tam: 18 });
            });
        },

        ubicarBanda: function () {
            var scene = this;
            var m = this.medidas();
            this.banda.forEach(function (o, i) {
                var p = scene.puestoBanda(i, m, o, scene.modo === 'concierto');
                o.cont.setPosition(p.x, p.y).setScale(p.escala);
            });
        },

        bandaEn: function (x, y) {
            var hit = null;
            var scene = this;
            this.banda.forEach(function (o) {
                var c = scene.centroBanda(o);
                if (!hit && Phaser.Math.Distance.Between(x, y, c.x, c.y) < c.r + 14) hit = o;
            });
            return hit;
        },

        /* ── Globos ────────────────────────────────────────────── */

        lanzarGlobo: function (id) {
            var m = this.medidas();
            var tam = m.obj * 0.62;
            var x = U.rnd(m.w * 0.18, m.w * 0.82);
            var y = m.h + tam * 1.6;
            var color = COLORES_GLOBO[Math.floor(Math.random() * COLORES_GLOBO.length)];
            var g = {
                id: id,
                x: x, y: y,
                vy: -(m.h / U.rnd(14, 17)),
                fase: Math.random() * 6,
                globo: this.add.image(x, y, A().globo(this, color, 200)).setDisplaySize(tam * 0.95, tam * 1.1).setDepth(9),
                hilo: this.add.graphics().setDepth(9),
                obj: this.crearObjeto(id, x, y + tam, tam),
                color: Phaser.Display.Color.HexStringToColor(color).color,
                tam: tam,
                proxSonido: this.time.now + U.rnd(600, 1600)
            };
            g.obj.cont.setDepth(10);
            this.globos.push(g);
            return g;
        },

        moverGlobos: function (time, dt) {
            var scene = this;
            this.globos = this.globos.filter(function (g) {
                if (g.reventado) return false;
                g.y += g.vy * dt;
                var sx = Math.sin(time / 900 + g.fase) * 26;
                g.globo.setPosition(g.x + sx, g.y);
                g.globo.angle = Math.sin(time / 700 + g.fase) * 6;
                var ox = g.x + Math.sin(time / 900 + g.fase - 0.6) * 26;
                var oy = g.y + g.tam * 1.25;
                g.obj.cont.setPosition(ox, oy);
                g.obj.cont.angle = (ox - (g.x + sx)) * 0.4;
                g.hilo.clear();
                g.hilo.lineStyle(2, 0x495057, 0.8);
                g.hilo.beginPath();
                g.hilo.moveTo(g.x + sx, g.y + g.tam * 0.55);
                g.hilo.lineTo((g.x + sx + ox) / 2 + Math.sin(time / 300 + g.fase) * 6, (g.y + oy) / 2 + g.tam * 0.2);
                g.hilo.lineTo(ox, oy - g.obj.tam * 0.4);
                g.hilo.strokePath();
                if (g.obj.suena && time > g.proxSonido && g.y < scene.scale.height * 0.85) {
                    g.proxSonido = time + U.rnd(2600, 3600);
                    scene.sonar(g.obj, { junto: true, vol: 0.55 });
                } else if (!g.obj.suena && time > g.proxSonido) {
                    g.proxSonido = time + 1500;
                    scene.pistaSentido(g.obj);
                }
                if (g.y < -g.tam * 2) {
                    g.globo.destroy();
                    g.hilo.destroy();
                    g.obj.cont.destroy();
                    return false;
                }
                return true;
            });
        },

        /** Señal visual de las cosas que no suenan: aroma, gota, rayos. */
        pistaSentido: function (o) {
            var c = o.cont;
            if (o.id === 'flor') {
                for (var i = 0; i < 3; i++) {
                    var h = this.add.image(c.x, c.y - o.tam * 0.3, A().textura(this, 'humo', 64)).setTint(0xf783ac).setDisplaySize(16, 16).setDepth(11);
                    this.tweens.add({ targets: h, x: c.x + U.rnd(-30, 30), y: c.y - o.tam * 0.9, alpha: { from: 0.8, to: 0 }, scale: h.scale * 2.4, duration: 1200, delay: i * 200, onComplete: function () { this.targets[0].destroy(); } });
                }
            } else if (o.id === 'helado') {
                var d = this.add.image(c.x + o.tam * 0.18, c.y + o.tam * 0.1, A().textura(this, 'gota', 64)).setDisplaySize(12, 16).setDepth(11);
                this.tweens.add({ targets: d, y: d.y + 50, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: function () { this.targets[0].destroy(); } });
            } else if (o.id === 'sol') {
                this.tweens.add({ targets: o.partes.rayos, scale: o.partes.rayos.scale * 1.12, duration: 300, yoyo: true });
            }
        },

        globoEn: function (x, y) {
            var hit = null;
            for (var i = this.globos.length - 1; i >= 0 && !hit; i--) {
                var g = this.globos[i];
                if (g.reventado) continue;
                var b = g.globo;
                var o = g.obj.cont;
                if (Phaser.Math.Distance.Between(x, y, b.x, b.y) < g.tam * 0.62 || Phaser.Math.Distance.Between(x, y, o.x, o.y) < g.tam * 0.6) hit = g;
            }
            return hit;
        },

        reventar: function (g) {
            g.reventado = true;
            if (global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('explota');
            U.estallido(this, g.globo.x, g.globo.y, { n: 12, colores: [g.color], tex: 'humo', dist: 60, tam: 18, ms: 450 });
            U.estallido(this, g.globo.x, g.globo.y, { n: 8, colores: [g.color, 0xffffff], dist: 90, tam: 14, ms: 500 });
            g.globo.destroy();
            g.hilo.destroy();
            var o = g.obj;
            o.cont.setDepth(14);
            return U.tween(this, { targets: o.cont, y: o.cont.y + 30, angle: 0, duration: 220, ease: 'Quad.easeIn' }).then(function () { return o; });
        },

        /* ── Entrada del niño ──────────────────────────────────── */

        alTocar: function (p) {
            if (!this.esperando || this.ocupado) return;
            var x = p.x;
            var y = p.y;
            if (this.pista) this.pista.reiniciar();
            if (this.ctx.quitarMano) this.ctx.quitarMano();
            if (this.modo === 'campana') {
                var c = this.centroColgada();
                if (c && Phaser.Math.Distance.Between(x, y, c.x, c.y) < this.colgada.tam * 0.55) {
                    this.colgada.arrastre = { x: this.colgada.piv.x, y: this.colgada.piv.y, dx: x - this.colgada.piv.x, dy: y - this.colgada.piv.y, x0: x, y0: y };
                    this.empujarCampana(x < c.x ? 1.6 : -1.6);
                    return;
                }
                var id = this.organoEn(x, y);
                if (id) this.elegir(id);
                return;
            }
            if (this.modo === 'globos') {
                var g = this.globoEn(x, y);
                if (g) { this.tocarGlobo(g); return; }
                var oid = this.organoEn(x, y);
                if (oid) this.organos[oid].reaccion('toca');
                return;
            }
            if (this.modo === 'quien') {
                var q = this.organoEn(x, y);
                if (q) this.elegir(q);
                return;
            }
            if (this.modo === 'concierto') {
                var b = this.bandaEn(x, y);
                if (b) this.tocarInstrumento(b);
            }
        },

        alMover: function (p) {
            var o = this.colgada;
            if (o && o.arrastre && p.isDown) {
                o.arrastre.x = p.x - o.arrastre.dx;
                o.arrastre.y = p.y - o.arrastre.dy;
                var sobre = this.organoEn(p.x, p.y);
                var scene = this;
                ORGANOS.forEach(function (id) { scene.organos[id].cont.setScale(id === sobre ? 1.12 : 1); });
            }
        },

        alSoltar: function (p) {
            var o = this.colgada;
            if (!o || !o.arrastre) return;
            var movido = Phaser.Math.Distance.Between(p.x, p.y, o.arrastre.x0, o.arrastre.y0) > 20;
            var sobre = this.organoEn(p.x, p.y);
            var scene = this;
            ORGANOS.forEach(function (id) { scene.organos[id].cont.setScale(1); });
            if (movido && sobre && this.esperando && !this.ocupado) {
                o.arrastre = null;
                this.elegir(sobre);
            } else {
                this.soltarCampana();
            }
        },

        /* ── Decisiones ────────────────────────────────────────── */

        elegir: function (id) {
            if (!this.esperando || this.ocupado) return;
            var org = this.organos[id];
            if (id === this.correcto) {
                this.esperando = false;
                if (this.resolver) this.resolver(id);
                return;
            }
            this.errores += 1;
            this.ocupado = true;
            var scene = this;
            if (global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('boing');
            org.reaccion('error');
            // El objeto rebota suavemente (documento).
            if (this.colgada && this.modo === 'campana') {
                var o = this.colgada;
                o.arrastre = null;
                this.tweens.add({ targets: o.piv, x: o.casa.x, y: o.casa.y, duration: 480, ease: 'Back.easeOut' });
                this.tweens.add({ targets: o.cont, scaleY: { from: o.cont.scaleY * 0.86, to: o.cont.scaleY }, duration: 380, ease: 'Bounce.easeOut' });
                this.empujarCampana(1.2);
            }
            this.vozError(id).then(function () { scene.ocupado = false; });
            this.time.delayedCall(700, function () { scene.ocupado = false; });
        },

        vozError: function (id) {
            var r = this.reto || {};
            var linea = null;
            if (this.modo === 'campana') {
                (r.errores || []).forEach(function (e) { if (!linea && (e.objetos || []).indexOf(id) >= 0) linea = e; });
                linea = linea || r.errorOtro || { voz: 'zeus', texto: '¡Inténtalo otra vez!' };
            } else {
                var que = NOMBRE[this.sonando] || 'eso';
                linea = { voz: 'zeus', texto: '¡Escucha! ' + que.charAt(0).toUpperCase() + que.slice(1) + (this.sonando === 'maracas' ? ' suenan' : ' suena') + '. ¿Con qué escuchamos?' };
            }
            return this.ctx.decir(linea);
        },

        esperarEleccion: function (correcto) {
            var scene = this;
            this.correcto = correcto;
            this.esperando = true;
            this.ocupado = false;
            return new Promise(function (r) { scene.resolver = r; });
        },

        /* ── Rondas ────────────────────────────────────────────── */

        rondaCampana: async function () {
            var scene = this;
            this.modo = 'campana';
            var o = this.colgarCampana('campana');
            await U.esperar(this, 500);
            this.empujarCampana(1.7);
            this.repique = this.time.addEvent({ delay: 4200, loop: true, callback: function () { if (scene.esperando && !o.arrastre) scene.empujarCampana(U.rnd(1.1, 1.6) * (Math.random() < 0.5 ? -1 : 1)); } });
            await this.ctx.decir(this.reto.presentacion || { voz: 'zoe', texto: '¿Con qué parte del cuerpo escuchamos la campana?' });
            this.pista = U.crearPista(this, 9000, function (cancelado) {
                var org = scene.organos.oido.cont;
                return scene.ctx.mano({ punto: { x: org.x, y: org.y }, holdMs: 500, cancelado: cancelado, onPresionar: function () { scene.organos.oido.reaccion('toca'); } });
            });
            this.pista.reiniciar();
            await this.esperarEleccion('oido');
            this.pista.parar();
            this.repique.remove();
            this.ctx.quitarMano();
            await this.aciertoColgada(o);
            await this.ctx.decir(this.reto.acierto || { voz: 'zoe', texto: '¡Muy bien!' }, { estado: 'acierto' });
            await this.llevarABanda(o);
        },

        /** La campana (o el tambor de la demo) vuela a la oreja y la oreja escucha feliz. */
        aciertoColgada: async function (o) {
            var ear = this.organos.oido;
            o.volando = true;
            var c = this.centroColgada();
            // Se suelta del cordel: el objeto pasa a moverse solo.
            o.piv.remove(o.cont);
            o.cont.setPosition(c.x, c.y).setDepth(30);
            o.cont.rotation = o.piv.rotation;
            this.tweens.add({ targets: o.piv, alpha: 0, duration: 300, onComplete: function () { o.piv.destroy(); } });
            this.colgada = null;
            await this.volarA(o.cont, ear.cont.x, ear.cont.y - ear.radio * 1.3, 650, 0.6);
            o.cont.rotation = 0;
            if (o.id === 'campana') {
                if (global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('dingDingYay');
                this.tweens.add({ targets: o.cont, angle: { from: -24, to: 24 }, duration: 150, yoyo: true, repeat: 4, onComplete: function () { o.cont.angle = 0; } });
                this.tweens.add({ targets: o.partes.badajo, angle: { from: 18, to: -18 }, duration: 150, yoyo: true, repeat: 4 });
            } else {
                this.sonar(o);
            }
            this.notas(o.cont.x, o.cont.y, 4, { x: ear.cont.x, y: ear.cont.y });
            ear.destello(true);
            await ear.reaccion('acierto');
            ear.destello(false);
            U.estallido(this, ear.cont.x, ear.cont.y, { n: 16, dist: 150 });
        },

        rondaGlobos: async function () {
            var scene = this;
            this.modo = 'globos';
            this.encontrados = 0;
            var meta = 3;
            var cola = [];
            var rellenar = function () { cola = cola.concat(U.mezclar(['tambor', 'maracas', 'pandereta', 'flor', 'helado', 'sol'])); };
            await this.ctx.decir({ voz: 'zoe', texto: '¡Mira los globos! Revienta los que SUENAN y la oreja los escuchará.' });
            this.esperando = true;
            this.ocupado = false;
            var lanzador = this.time.addEvent({
                delay: 2300, loop: true, callback: function () {
                    if (scene.globos.length >= 3) return;
                    if (!cola.length) rellenar();
                    // Que no falten los que suenan: si no hay ninguno en el aire, sale uno.
                    var haySonoro = scene.globos.some(function (g) { return g.obj.suena && !g.reventado; });
                    var id = cola.shift();
                    if (!haySonoro && !sonidoDe(id)) {
                        var k = cola.findIndex(function (c) { return !!sonidoDe(c); });
                        if (k >= 0) { cola.push(id); id = cola.splice(k, 1)[0]; }
                    }
                    if (scene.banda.some(function (b) { return b.id === id; })) return;
                    scene.lanzarGlobo(id);
                }
            });
            lanzador.callback();
            this.pista = U.crearPista(this, 9000, function (cancelado) {
                var g = scene.globos.find(function (gg) { return gg.obj.suena && !gg.reventado && gg.y > scene.scale.height * 0.35; });
                if (!g) return Promise.resolve();
                return scene.ctx.mano({ punto: function () { return { x: g.obj.cont.x, y: g.obj.cont.y + g.vy * 0.9 }; }, holdMs: 400, cancelado: cancelado });
            });
            this.pista.reiniciar();
            await new Promise(function (r) { scene.finGlobos = r; });
            lanzador.remove();
            this.pista.parar();
            this.esperando = false;
            // Los globos que quedan se van volando.
            this.globos.forEach(function (g) { g.vy *= 6; });
            await U.esperar(this, 900);
        },

        tocarGlobo: async function (g) {
            var scene = this;
            if (g.obj.suena && this.banda.some(function (b) { return b.id === g.id; })) return;
            this.ocupado = true;
            var o = await this.reventar(g);
            if (o.suena) {
                var ear = this.organos.oido;
                this.sonar(o, { breve: true });
                await this.volarA(o.cont, ear.cont.x, ear.cont.y - ear.radio * 1.3, 600, 0.9);
                this.notas(o.cont.x, o.cont.y, 3, { x: ear.cont.x, y: ear.cont.y });
                ear.destello(true);
                await ear.reaccion('acierto');
                ear.destello(false);
                this.encontrados += 1;
                this.globos.forEach(function (gg) { if (gg.id === o.id) gg.vy *= 5; });
                var suena = { campana: '¡Sí! La campana suena: la escuchamos con el oído.', tambor: '¡Sí! El tambor suena: lo escuchamos con el oído.', maracas: '¡Sí! Las maracas suenan: las escuchamos con el oído.', pandereta: '¡Sí! La pandereta suena: la escuchamos con el oído.' };
                var frases = [suena[o.id], '¡Muy bien! La oreja escucha ' + NOMBRE[o.id] + '.', '¡Bravo! ¡Otro para la banda!'];
                this.ctx.decir({ voz: 'zoe', texto: frases[(this.encontrados - 1) % 3] }, { estado: 'acierto' });
                await this.llevarABanda(o);
                this.ocupado = false;
                if (this.encontrados >= 3 && this.finGlobos) this.finGlobos();
                return;
            }
            // No suena: va a su propio sentido, que lo disfruta, y Zeus explica.
            this.errores += 1;
            var org = this.organos[o.sentido];
            await this.volarA(o.cont, org.cont.x, org.cont.y - org.radio * 1.3, 600, 0.9);
            if (o.sentido === 'ojo') org.gafas(true);
            if (o.sentido === 'nariz' && global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('sorber');
            if (o.sentido === 'lengua' && global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('miamMiam');
            org.reaccion('acierto');
            this.ctx.decir({ voz: 'zeus', texto: '¡' + NOMBRE[o.id].replace(/^./, function (c) { return c.toUpperCase(); }) + ' no suena! ' + COMO[o.sentido].replace(/^./, function (c) { return c.toUpperCase(); }) + '. ¡Busca lo que suena!' });
            await U.esperar(this, 900);
            await U.tween(this, { targets: o.cont, alpha: 0, scale: o.cont.scale * 0.4, duration: 400 });
            o.cont.destroy();
            if (o.sentido === 'ojo') this.time.delayedCall(1200, function () { org.gafas(false); });
            this.ocupado = false;
        },

        rondaQuien: async function () {
            var scene = this;
            this.modo = 'quien';
            var pruebas = U.mezclar(this.banda.slice()).slice(0, 2);
            await this.ctx.decir({ voz: 'zeus', texto: '¡Las burbujas cambian de lugar! Escucha bien… ¿quién oye el sonido?' });
            for (var i = 0; i < pruebas.length; i++) {
                await this.barajar(i === 0 ? 2 : 3);
                var o = pruebas[i];
                this.sonando = o.id;
                var ear = this.organos.oido;
                await U.esperar(this, 300);
                this.tweens.add({ targets: o.cont, scale: o.cont.scale * 1.3, duration: 220, yoyo: true });
                this.sonar(o, { breve: false });
                var repetir = this.time.addEvent({ delay: 3800, loop: true, callback: function () { if (scene.esperando) scene.sonar(o, { breve: false }); } });
                this.pista = U.crearPista(this, 8000, function (cancelado) {
                    return scene.ctx.mano({ punto: function () { return { x: ear.cont.x, y: ear.cont.y }; }, holdMs: 450, cancelado: cancelado });
                });
                this.pista.reiniciar();
                await this.esperarEleccion('oido');
                repetir.remove();
                this.pista.parar();
                this.ctx.quitarMano();
                this.notas(o.cont.x, o.cont.y, 4, { x: ear.cont.x, y: ear.cont.y });
                ear.destello(true);
                await ear.reaccion('acierto');
                ear.destello(false);
                await this.ctx.decir({ voz: 'zoe', texto: i === 0 ? '¡Lo encontraste! El oído escucha ' + NOMBRE[o.id] + '.' : '¡Excelente! Todo lo que suena lo escucha el oído.' }, { estado: 'acierto' });
            }
        },

        /** Las burbujas intercambian lugares con un arco (se ve todo el recorrido). */
        barajar: async function (veces) {
            var scene = this;
            for (var v = 0; v < veces; v++) {
                var i = Math.floor(Math.random() * 4);
                var j = (i + 1 + Math.floor(Math.random() * 3)) % 4;
                var a = this.organos[this.orden[i]];
                var b = this.organos[this.orden[j]];
                var t = this.orden[i];
                this.orden[i] = this.orden[j];
                this.orden[j] = t;
                var pa = this.posOrgano(j);
                var pb = this.posOrgano(i);
                a.moviendo = b.moviendo = true;
                if (global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('vuela');
                await Promise.all([
                    this.arcoOrgano(a, pa, -1),
                    this.arcoOrgano(b, pb, 1)
                ]);
                a.moviendo = b.moviendo = false;
            }
            this.ubicarOrganos();
            void scene;
        },

        arcoOrgano: function (o, destino, lado) {
            var x0 = o.base.x;
            var y0 = o.base.y;
            var prog = { k: 0 };
            return U.tween(this, {
                targets: prog, k: 1, duration: 650, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    o.base.x = x0 + (destino.x - x0) * prog.k;
                    o.base.y = y0 + Math.sin(prog.k * Math.PI) * 70 * lado;
                }
            }).then(function () { o.base.x = destino.x; o.base.y = destino.y; });
        },

        rondaConcierto: async function () {
            var scene = this;
            this.modo = 'concierto';
            var ear = this.organos.oido;
            var m = this.medidas();
            // Los demás se apartan y la oreja pasa al centro a dirigir.
            ORGANOS.forEach(function (id) {
                if (id === 'oido') return;
                var o = scene.organos[id];
                scene.tweens.add({ targets: o.cont, alpha: 0, scale: 0.6, duration: 450 });
            });
            ear.moviendo = true;
            this.tweens.add({ targets: ear.cont, scale: 1.3, duration: 700, ease: 'Back.easeOut' });
            await U.tween(this, { targets: ear.base, x: m.cx, y: m.h - m.r * 1.75, duration: 700, ease: 'Back.easeOut' });
            this.banda.forEach(function (o) {
                var pg = scene.puestoBanda(scene.banda.indexOf(o), m, o, true);
                scene.tweens.add({ targets: o.cont, scale: pg.escala, y: pg.y, duration: 400, ease: 'Back.easeOut' });
            });
            await this.ctx.decir({ voz: 'zoe', texto: '¡Es el concierto! Toca los instrumentos y la oreja los escuchará.' });
            this.toques = 0;
            this.esperando = true;
            this.ocupado = false;
            this.pista = U.crearPista(this, 7000, function (cancelado) {
                var o = scene.banda[Math.floor(Math.random() * scene.banda.length)];
                var cb = scene.centroBanda(o);
                return scene.ctx.mano({ punto: { x: cb.x, y: cb.y }, holdMs: 400, cancelado: cancelado, onPresionar: function () { scene.tocarInstrumento(o, true); } });
            });
            this.pista.reiniciar();
            await new Promise(function (r) {
                scene.finConcierto = r;
                scene.time.delayedCall(16000, r);
            });
            this.pista.parar();
            this.esperando = false;
            // Final: todos suenan a la vez y la oreja baila.
            this.banda.forEach(function (o, i) { scene.time.delayedCall(i * 120, function () { scene.sonar(o, { junto: true, vol: 0.6 }); }); });
            ear.destello(true);
            await ear.reaccion('acierto');
            ear.destello(false);
        },

        tocarInstrumento: function (o, demo) {
            var ear = this.organos.oido;
            if (o.id === 'campana') {
                this.tweens.add({ targets: o.cont, angle: { from: -20, to: 20 }, duration: 140, yoyo: true, repeat: 2, onComplete: function () { o.cont.angle = 0; } });
                if (global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('dingDong');
                this.notas(o.cont.x, o.cont.y - 20, 2);
            } else {
                this.sonar(o, { junto: true, vol: 0.8 });
            }
            this.notas(o.cont.x, o.cont.y - 10, 2, { x: ear.cont.x, y: ear.cont.y });
            ear.reaccion('toca');
            this.tweens.add({ targets: ear.cuerpo, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, onComplete: function () { ear.cuerpo.angle = 0; } });
            if (demo) return;
            this.toques += 1;
            if (this.toques >= 7 && this.finConcierto) this.finConcierto();
        },

        /* ── API para script.js ────────────────────────────────── */

        demo: async function () {
            var scene = this;
            var t = this.ctx.textos || {};
            var d = (this.config && this.config.demo) || {};
            this.modo = 'demo';
            var o = this.colgarCampana(d.estimulo === 'tambor' || !d.estimulo ? 'tambor' : d.estimulo);
            await this.ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 2200 });
            if (!this.ctx.vivo() || !this.ctx.enDemo()) return this.limpiarDemo();
            var c = this.centroColgada();
            await this.ctx.mano({ punto: c, holdMs: 500, onPresionar: function () { scene.sonar(o, { breve: false }); scene.empujarCampana(2.2); } });
            await U.esperar(this, 500);
            if (!this.ctx.vivo() || !this.ctx.enDemo()) return this.limpiarDemo();
            var ear = this.organos.oido.cont;
            c = this.centroColgada();
            var dx = ear.x - c.x;
            var dy = ear.y - c.y;
            await this.ctx.mano({
                punto: c, holdMs: 300,
                arrastre: { dx: dx, dy: dy, durMs: 900, soltarEnDestino: true },
                onDuranteArrastre: function () {
                    o.arrastre = { x: o.piv.x, y: o.piv.y, dx: 0, dy: 0 };
                    var p = { k: 0 };
                    var x0 = o.piv.x;
                    var y0 = o.piv.y;
                    scene.tweens.add({ targets: p, k: 1, duration: 900, ease: 'Sine.easeInOut', onUpdate: function () { o.arrastre.x = x0 + dx * p.k; o.arrastre.y = y0 + dy * p.k; } });
                }
            });
            o.arrastre = null;
            if (!this.ctx.vivo()) return this.limpiarDemo();
            await this.aciertoColgada(o);
            await this.ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1600 });
            await this.ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1200 });
            await U.tween(this, { targets: o.cont, alpha: 0, y: o.cont.y + 40, duration: 400 });
            o.cont.destroy();
            return this.limpiarDemo();
        },

        limpiarDemo: function () {
            if (this.taburete) {
                var tb = this.taburete;
                this.taburete = null;
                this.tweens.add({ targets: tb, alpha: 0, duration: 300, onComplete: function () { tb.destroy(); } });
            }
            if (this.colgada) {
                this.colgada.piv.destroy();
                this.colgada = null;
            }
            this.modo = '';
            this.ctx.quitarMano();
        },

        jugar: async function () {
            this.errores = 0;
            await this.rondaCampana();
            if (!this.ctx.vivo()) return;
            await this.rondaGlobos();
            if (!this.ctx.vivo()) return;
            await this.rondaQuien();
            if (!this.ctx.vivo()) return;
            await this.rondaConcierto();
        },

        fiestaFinal: async function () {
            var m = this.medidas();
            var scene = this;
            // Vuelven todos los sentidos a celebrar; la oreja regresa a su burbuja.
            var ear = this.organos.oido;
            var pe = this.posOrgano(this.orden.indexOf('oido'));
            this.tweens.add({ targets: ear.base, x: pe.x, y: pe.y, duration: 500, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: ear.cont, scale: 1, duration: 500 });
            ORGANOS.forEach(function (id, i) {
                var o = scene.organos[id];
                if (id !== 'oido') scene.tweens.add({ targets: o.cont, alpha: 1, scale: 1, duration: 450, delay: i * 90, ease: 'Back.easeOut' });
                scene.time.delayedCall(500 + i * 120, function () { o.reaccion('acierto'); });
            });
            if (global.EncuentraParejaSfx) global.EncuentraParejaSfx.sonar('celebracion');
            U.confeti(this, 90);
            U.estallido(this, m.cx, m.h * 0.45, { n: 28, dist: 260 });
            this.notas(m.cx, m.h * 0.5, 6);
            await U.esperar(this, 1800);
        },

        update: function (time, delta) {
            var dt = Math.min(delta || 16, 50) / 1000;
            var scene = this;
            var w = this.scale.width;
            if (!U.reducido()) {
                this.nubes.forEach(function (n) {
                    n.x += n.vel * dt;
                    if (n.x > w + 120) n.x = -120;
                });
                if (this.sol) this.sol.rayos.rotation += dt * 0.12;
            }
            if (this.lucesG) {
                this.lucesG.clear();
                this.luces.forEach(function (l, i) {
                    var on = 0.55 + 0.45 * Math.sin(time / 300 + i * 1.3);
                    scene.lucesG.fillStyle(0xfff3bf, 0.35 * on);
                    scene.lucesG.fillCircle(l.x, l.y, 9);
                    scene.lucesG.fillStyle([0xffd43b, 0xff8787, 0x74c0fc][i % 3], 0.6 + 0.4 * on);
                    scene.lucesG.fillCircle(l.x, l.y, 4);
                });
            }
            this.fisicaCampana(dt);
            if (this.globos.length) this.moverGlobos(time, dt);
            // El ojo mira lo que se mueve: la campana, un globo o el centro.
            var foco = this.centroColgada();
            if (!foco && this.globos.length) foco = { x: this.globos[0].obj.cont.x, y: this.globos[0].obj.cont.y };
            ORGANOS.forEach(function (id) {
                var o = scene.organos[id];
                if (foco) o.mirar(foco.x, foco.y);
                o.actualizar(time);
            });
        },

        estado: function () {
            var scene = this;
            return {
                modo: this.modo,
                esperando: !!this.esperando,
                ocupado: !!this.ocupado,
                banda: this.banda.map(function (b) { return b.id; }),
                orden: this.orden.slice(),
                organos: ORGANOS.reduce(function (acc, id) { acc[id] = { x: Math.round(scene.organos[id].cont.x), y: Math.round(scene.organos[id].cont.y) }; return acc; }, {}),
                campana: this.centroColgada(),
                globos: this.globos.map(function (g) { return { id: g.id, x: Math.round(g.obj.cont.x), y: Math.round(g.obj.cont.y) }; })
            };
        }
    };

    global.PedniaConcierto = B.crearMotor({ id: 'concierto', fondo: '#bfe3ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
