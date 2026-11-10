/**
 * Motor Phaser de Asocia sonido e imagen (los 11 juegos). Es un juego continuo, no un cuestionario:
 * los objetos asoman y se esconden sin parar y el niño atrapa el que suena.
 *
 * 3-4 años, «El álbum de los sonidos»: escena viva según el reto (parque, sala, dormitorio,
 * aeropuerto, estación) con cinco escondites (arbustos, baúles, cajas o maletas). La bocina hace
 * sonar lo que hay que buscar; tocar el objeto correcto mientras está afuera lo atrapa: hace su
 * acción real y su foto va al marco del nivel. Si se equivoca, el objeto deja oír su propio
 * sonido y se esconde rápido.
 *
 * 5-6 años, «El laboratorio de las asociaciones»: la máquina dibuja la onda real, la condensa en
 * una esfera y los pedestales suben y bajan con objetos; hay que arrastrar la esfera (o tocar) al
 * objeto correcto antes de que se esconda. Cada nivel llena un tubo de ensayo.
 *
 * Cuatro niveles: 1 el objeto del reto (lento, de a uno), 2 y 3 otros sonidos con más objetos y
 * más rápido (en 5-6 el 3 suena con el escenario vacío), 4 el sonido cambia en cada acierto.
 * Usa PedniaParejaBase.crearMotor (window.PedniaJuego).
 */
(function (global) {
    'use strict';

    var B = global.PedniaParejaBase;
    var Ut = B.util;
    var A = global.PedniaArte;
    var Act = global.AsociaActores;
    var esperar = Ut.esperar;
    var tw = Ut.tween;
    var mezclar = Ut.mezclar;
    var rnd = Ut.rnd;

    function Sfx() { return global.AsociaSonidoSfx; }
    function efecto(scene, n) { if (scene.ctx.efecto) scene.ctx.efecto(n); }

    var FONDO = {
        'que-suena': 'parque',
        'que-objeto-suena': 'sala',
        'escucha-y-asocia': 'dormitorio',
        'sonido-de-viaje': 'aeropuerto',
        'que-escuchaste': 'estacion'
    };

    /* Retos de 5-6 años con mecánica propia (mundos56.js); los demás usan el laboratorio. */
    var MUNDO56 = {
        'sonido-y-objeto': 'casa_noche',
        'sonido-de-maquina': 'fabrica',
        'sonido-de-transporte': 'calle',
        'sonido-de-accion': 'patio',
        'sonido-del-agua': 'inundacion',
        'gran-asociacion': 'feria'
    };

    var COLOR_FONDO = { parque: '#a5d8ff', sala: '#ffe8cc', dormitorio: '#e5dbff', aeropuerto: '#a5d8ff', estacion: '#ffd8a8', laboratorio: '#e3fafc' };

    /* ══ Fondos (Graphics que se redibujan al cambiar el tamaño) ══ */

    function suelo(scene) { return scene.L.horizonte; }

    var FONDOS = {
        parque: function (scene, g) {
            var w = scene.scale.width, h = scene.scale.height, hz = suelo(scene);
            g.fillGradientStyle(0x74c0fc, 0x74c0fc, 0xd0ebff, 0xd0ebff, 1);
            g.fillRect(0, 0, w, hz + 10);
            g.fillStyle(0x8ce99a, 1);
            g.fillEllipse(w * 0.2, hz + 10, w * 0.7, h * 0.22);
            g.fillStyle(0x69db7c, 1);
            g.fillEllipse(w * 0.78, hz + 16, w * 0.8, h * 0.26);
            g.fillGradientStyle(0x51cf66, 0x51cf66, 0x2f9e44, 0x2f9e44, 1);
            g.fillRect(0, hz + 12, w, h - hz);
            // Sendero de tierra que cruza el parque.
            g.fillStyle(0xe9c99a, 1);
            g.beginPath();
            g.moveTo(0, h * 0.92);
            g.lineTo(w, hz + (h - hz) * 0.4);
            g.lineTo(w, hz + (h - hz) * 0.62);
            g.lineTo(0, h);
            g.closePath();
            g.fillPath();
            g.fillStyle(0x40c057, 1);
            for (var i = 0; i < 40; i++) {
                var x = (i * 97) % w, y = hz + 18 + ((i * 53) % Math.max(10, h - hz - 20));
                g.fillTriangle(x, y, x + 4, y - 9, x + 8, y);
            }
        },
        sala: function (scene, g) {
            var w = scene.scale.width, h = scene.scale.height, hz = suelo(scene);
            g.fillGradientStyle(0xfff4e6, 0xfff4e6, 0xffd8a8, 0xffd8a8, 1);
            g.fillRect(0, 0, w, hz);
            g.fillStyle(0xffe8cc, 0.8);
            for (var x = 0; x < w; x += 46) g.fillRect(x, 0, 18, hz);
            g.fillStyle(0xd9a066, 1);
            g.fillRect(0, hz - 14, w, 14);
            // Piso de madera en tablones.
            g.fillGradientStyle(0xc68a52, 0xc68a52, 0x8b5a2b, 0x8b5a2b, 1);
            g.fillRect(0, hz, w, h - hz);
            g.lineStyle(2, 0x7a4a1f, 0.35);
            for (var y = hz + 22; y < h; y += 26) g.lineBetween(0, y, w, y);
            // Alfombra.
            g.fillStyle(0xe64980, 0.55);
            g.fillEllipse(w * 0.46, hz + (h - hz) * 0.55, w * 0.78, (h - hz) * 0.7);
            g.lineStyle(4, 0xfff0f6, 0.6);
            g.strokeEllipse(w * 0.46, hz + (h - hz) * 0.55, w * 0.7, (h - hz) * 0.58);
        },
        dormitorio: function (scene, g) {
            var w = scene.scale.width, h = scene.scale.height, hz = suelo(scene);
            g.fillGradientStyle(0xe5dbff, 0xe5dbff, 0xd0bfff, 0xd0bfff, 1);
            g.fillRect(0, 0, w, hz);
            g.fillStyle(0xffffff, 0.35);
            for (var i = 0; i < 26; i++) g.fillCircle((i * 131) % w, 30 + (i * 71) % Math.max(20, hz - 40), 3);
            g.fillStyle(0xb197fc, 1);
            g.fillRect(0, hz - 12, w, 12);
            g.fillGradientStyle(0x91a7ff, 0x91a7ff, 0x5c7cfa, 0x5c7cfa, 1);
            g.fillRect(0, hz, w, h - hz);
            g.fillStyle(0xffffff, 0.12);
            g.fillEllipse(w * 0.46, hz + (h - hz) * 0.55, w * 0.8, (h - hz) * 0.7);
        },
        aeropuerto: function (scene, g) {
            var w = scene.scale.width, h = scene.scale.height, hz = suelo(scene);
            g.fillGradientStyle(0x4dabf7, 0x4dabf7, 0xd0ebff, 0xd0ebff, 1);
            g.fillRect(0, 0, w, hz);
            // Ciudad a lo lejos.
            g.fillStyle(0xa5b4fc, 0.55);
            for (var i = 0; i < 14; i++) {
                var bw = 30 + (i * 37) % 40, bh = 30 + (i * 53) % 70;
                g.fillRect((i * 83) % w, hz - bh, bw, bh);
            }
            g.fillStyle(0x8ce99a, 1);
            g.fillRect(0, hz, w, h - hz);
            // Pista con línea central discontinua.
            var py = hz + (h - hz) * 0.25, ph = (h - hz) * 0.62;
            g.fillStyle(0x495057, 1);
            g.fillRect(0, py, w, ph);
            g.fillStyle(0xffffff, 0.9);
            for (var x = 10; x < w; x += 70) g.fillRect(x, py + ph / 2 - 3, 38, 6);
            g.fillStyle(0xffd43b, 1);
            g.fillRect(0, py + 4, w, 3);
            g.fillRect(0, py + ph - 7, w, 3);
        },
        estacion: function (scene, g) {
            var w = scene.scale.width, h = scene.scale.height, hz = suelo(scene);
            g.fillGradientStyle(0xffc078, 0xffc078, 0xfff4e6, 0xfff4e6, 1);
            g.fillRect(0, 0, w, hz);
            g.fillStyle(0xa9e34b, 1);
            g.fillEllipse(w * 0.15, hz + 6, w * 0.6, h * 0.24);
            g.fillStyle(0x94d82d, 1);
            g.fillEllipse(w * 0.85, hz + 6, w * 0.7, h * 0.28);
            g.fillGradientStyle(0x82c91e, 0x82c91e, 0x5c940d, 0x5c940d, 1);
            g.fillRect(0, hz, w, h - hz);
            // Vía del tren (durmientes y rieles) por donde pasa la locomotora.
            var vy = scene.L.via;
            g.fillStyle(0xadb5bd, 1);
            g.fillRect(0, vy - 14, w, 30);
            g.fillStyle(0x8b5a2b, 1);
            for (var x = 0; x < w; x += 26) g.fillRect(x, vy - 12, 12, 26);
            g.fillStyle(0x495057, 1);
            g.fillRect(0, vy - 9, w, 4);
            g.fillRect(0, vy + 7, w, 4);
        },
        laboratorio: function (scene, g) {
            var w = scene.scale.width, h = scene.scale.height, hz = suelo(scene);
            g.fillGradientStyle(0xf3fcfd, 0xf3fcfd, 0xc5f6fa, 0xc5f6fa, 1);
            g.fillRect(0, 0, w, hz);
            g.lineStyle(2, 0x15aabf, 0.13);
            for (var x = 0; x < w; x += 56) g.lineBetween(x, 0, x, hz);
            for (var y = 0; y < hz; y += 56) g.lineBetween(0, y, w, y);
            // Tubería que recorre la pared.
            g.lineStyle(10, 0x868e96, 1);
            g.lineBetween(0, 116, w, 116);
            g.lineStyle(4, 0xdee2e6, 1);
            g.lineBetween(0, 113, w, 113);
            // Mesón del laboratorio.
            g.fillStyle(0x0b7285, 1);
            g.fillRect(0, hz, w, 12);
            g.fillGradientStyle(0x22b8cf, 0x22b8cf, 0x0c8599, 0x0c8599, 1);
            g.fillRect(0, hz + 12, w, h - hz - 12);
            g.fillStyle(0xffffff, 0.08);
            for (var i = 0; i < 8; i++) g.fillRect(i * w / 8 + 10, hz + 22, w / 8 - 20, h - hz - 30);
        }
    };

    /** Utilería (texturas) y movimiento de ambiente de cada escena. */
    function montarUtileria(scene) {
        var w = scene.scale.width, h = scene.scale.height, hz = suelo(scene);
        var tipo = scene.tipo;
        var u = scene.utileria = [];
        var amb = scene.ambiente = [];
        var add = function (tex, x, y, tam, o) {
            o = o || {};
            var im = scene.add.image(x, y, A.textura(scene, tex, tam > 200 ? 512 : 256)).setDisplaySize(tam * (o.ancho || 1), tam).setDepth(o.depth != null ? o.depth : 3);
            if (o.ox != null) im.setOrigin(o.ox, o.oy);
            if (o.alpha != null) im.setAlpha(o.alpha);
            u.push(im);
            return im;
        };
        var nubes = function (n, y0, y1) {
            for (var i = 0; i < n; i++) {
                var nb = add('nube_algodon', rnd(0, w), rnd(y0, y1), rnd(70, 120), { depth: 1, alpha: 0.95 });
                nb.vel = rnd(6, 14);
                amb.push(function (nb) { return function (t, dt) { nb.x += nb.vel * dt / 1000; if (nb.x > w + 80) nb.x = -80; }; }(nb));
            }
        };
        if (tipo === 'parque') {
            nubes(4, 120, hz - 70);
            var sol = add('sol_rayos', w * 0.05, Math.max(150, hz * 0.42), 100, { depth: 1 });
            add('sol', sol.x, sol.y, 70, { depth: 1 });
            amb.push(function (t) { sol.angle = t / 90; });
            add('arbol', w * 0.04, hz - 40, 190, { depth: 2 });
            add('arbol', w * 0.97, hz - 30, 170, { depth: 2 });
            add('banca', w * 0.86, hz + 6, 110, { depth: 2 });
            [[0.12, 0.08], [0.6, 0.03], [0.36, 0.06]].forEach(function (p, i) {
                var fl = add(['flor_amarilla', 'flor_roja', 'flor_morada'][i], w * p[0], h - (h - hz) * p[1] - 20, 44, { depth: 2 });
                amb.push(function (t) { fl.angle = Math.sin(t / 600 + i) * 6; });
            });
        } else if (tipo === 'sala') {
            add('ventana_casa', w * 0.66, hz * 0.62, Math.min(130, hz * 0.45), { depth: 1 });
            add('cuadro', w * 0.075, hz * 0.62, Math.min(100, hz * 0.34), { depth: 1, ancho: 1.2 });
            add('sofa', w * 0.88, hz + 12, 150, { depth: 2 });
            var lam = add('lampara', w * 0.04, hz - 50, 150, { depth: 2 });
            var brillo = scene.add.circle(lam.x, lam.y - 52, 60, 0xfff3bf, 0.25).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
            u.push(brillo);
            amb.push(function (t) { brillo.alpha = 0.2 + Math.sin(t / 900) * 0.05; });
        } else if (tipo === 'dormitorio') {
            var vx = w * 0.62, vy = hz * 0.6, vt = Math.min(140, hz * 0.48);
            var cielo = scene.add.rectangle(vx, vy, vt * 0.84, vt * 0.84, 0xffa94d).setDepth(1);
            u.push(cielo);
            var solv = add('sol', vx, vy + vt * 0.2, vt * 0.38, { depth: 1 });
            add('ventana_casa', vx, vy, vt, { depth: 1, alpha: 0.85 });
            // Amanece: el sol sube y entra luz por la ventana.
            var rayo = scene.add.triangle(vx, vy, 0, 0, vt * 0.5, 0, -vt * 1.6, (h - vy) * 1.1, 0xfff3bf, 0.18).setOrigin(0, 0).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
            u.push(rayo);
            amb.push(function (t) {
                solv.y = vy + vt * 0.2 - ((t / 40000) % 1) * vt * 0.25;
                rayo.alpha = 0.6 + Math.sin(t / 1200) * 0.15;
            });
            add('cama', w * 0.07, hz + 4, 170, { depth: 2 });
            // Lámpara de noche encendida junto a la cama y su luz cálida.
            var lamN = add('lampara', w * 0.2, hz - 30, 90, { depth: 2 });
            var halo = scene.add.circle(lamN.x, lamN.y - 30, 46, 0xffe066, 0.22).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
            u.push(halo);
            amb.push(function (t) { halo.alpha = 0.18 + Math.sin(t / 700) * 0.05; });
            // Estrellitas que brillan en la oscuridad pegadas en la pared.
            for (var e = 0; e < 7; e++) {
                var est = add('estrella', w * (0.08 + e * 0.13), Math.max(scene.L.top + scene.L.marco * 1.5, hz * 0.3) + (e % 2) * 40, 22, { depth: 1, alpha: 0.6 });
                amb.push(function (est, e) { return function (t) { est.alpha = 0.35 + Math.abs(Math.sin(t / 800 + e)) * 0.5; }; }(est, e));
            }
            add('caja_juguetes', w * 0.8, hz + 10, 70, { depth: 2, ancho: 1.4 });
            // El osito lo pone el mundo «Despierta al osito» (mundos.js).
        } else if (tipo === 'aeropuerto') {
            nubes(3, 120, hz - 80);
            add('torre', w * 0.92, hz - 60, 140, { depth: 2 });
            var lejano = add('avion', -60, Math.max(hz * 0.62, hz - 110), 54, { depth: 1, alpha: 0.7 });
            amb.push(function (t, dt) { lejano.x += dt * 0.05; if (lejano.x > w + 80) lejano.x = -80; });
            // Manga de viento que ondea.
            var poste = scene.add.rectangle(w * 0.05, hz - 30, 4, 70, 0x495057).setDepth(2);
            var manga = scene.add.triangle(w * 0.05, hz - 62, 0, 0, 0, 16, 46, 8, 0xfd7e14).setOrigin(0, 0.5).setDepth(2);
            u.push(poste, manga);
            amb.push(function (t) { manga.angle = Math.sin(t / 500) * 10; manga.scaleX = 0.85 + Math.sin(t / 300) * 0.15; });
        } else if (tipo === 'estacion') {
            nubes(3, 120, hz - 90);
            add('estacion', w * 0.9, hz - 54, 150, { depth: 2 });
            add('arbol', w * 0.03, hz - 40, 160, { depth: 2 });
            // Señal de paso a nivel que parpadea (lejos de los objetos).
            var sx = Math.max(24, w * 0.03);
            var poste = scene.add.rectangle(sx, hz - 30, 5, 70, 0x343a40).setDepth(2);
            var l1 = scene.add.circle(sx - 9, hz - 62, 7, 0xfa5252).setDepth(2);
            var l2 = scene.add.circle(sx + 9, hz - 62, 7, 0xfa5252).setDepth(2);
            u.push(poste, l1, l2);
            amb.push(function (t) { var on = (t / 500 | 0) % 2; l1.alpha = on ? 1 : 0.25; l2.alpha = on ? 0.25 : 1; });
        } else if (tipo === 'laboratorio') {
            // Repisa con frascos que burbujean (solo si cabe a la derecha de la oreja).
            var rx = w * 0.9, ry = 196;
            if (scene.L.oreja && rx - 90 < scene.L.oreja.x + scene.L.oreja.r) return;
            u.push(scene.add.rectangle(rx, ry + 26, Math.min(170, w * 0.18), 10, 0x868e96).setDepth(1));
            ['frasco_verde', 'frasco_rosa', 'frasco_azul'].forEach(function (f, i) {
                var fx = rx + (i - 1) * Math.min(52, w * 0.055);
                add(f, fx, ry, 54, { depth: 1 });
                amb.push(function (t) {
                    if (Math.random() < 0.04) {
                        var b = scene.add.circle(fx + rnd(-6, 6), ry + 14, rnd(2, 4), 0xffffff, 0.8).setDepth(1);
                        scene.tweens.add({ targets: b, y: ry - 40, alpha: 0, duration: rnd(700, 1200), onComplete: function () { b.destroy(); } });
                    }
                });
            });
            // Luces del panel de la pared que parpadean.
            for (var i = 0; i < 5; i++) {
                var l = scene.add.circle(rx - 32 + i * 16, ry + 50, 5, [0xfa5252, 0xfcc419, 0x51cf66, 0x339af0, 0xcc5de8][i]).setDepth(1);
                u.push(l);
                amb.push(function (l, i) { return function (t) { l.alpha = 0.4 + 0.6 * ((Math.floor(t / 400) + i) % 3 === 0 ? 1 : 0); }; }(l, i));
            }
        }
    }

    /* ══ Escena ══ */

    var escena = {
        create: function () {
            var self = this;
            // `mayor` = 5-6 años (dificultad); `cinco` = usa el laboratorio (solo si el reto no tiene mundo propio).
            this.mayor = String(this.nivel.id) === '5';
            this.cinco = this.mayor;
            this.tipo = this.cinco ? 'laboratorio' : (FONDO[this.reto.id] || 'parque');
            var M = global.AsociaMundos || {};
            var propio = this.mayor ? MUNDO56[this.reto.id] : null;
            if (propio && M[propio]) {
                this.cinco = false;
                this.tipo = propio;
            }
            this.mundo = !this.cinco ? M[this.tipo] || null : null;
            this.cameras.main.setBackgroundColor(COLOR_FONDO[this.tipo] || (this.mundo && this.mundo.color) || '#a5d8ff');
            this.actores = {};
            this.sombras = {};
            this.fase = 'intro';
            this.errores = 0;
            this.hechos = 0;
            this.calcularLayout();
            this.fondoG = this.add.graphics().setDepth(0);
            this.pintarFondo();
            montarUtileria(this);
            this.montarVida();
            this.arr = B.arrastrador(this);
            this.anillosG = this.add.graphics().setDepth(40);
            // Cada escena tiene su propia mecánica (comun/mundos.js y mundos56.js).
            if (this.cinco) this.montarLaboratorio();
            else this.montarAlbum();
            this.pops = [];
            this.nivelActual = 0;
            this.input.on('pointerdown', function (p) { self.alTocar(p); });
            this.input.on('pointermove', function (p) { self.alMover(p); });
            this.input.on('pointerup', function (p) { self.alSoltar(p); });
            this.scale.on('resize', function () { self.reubicar(); });
            this.pista = Ut.crearPista(this, 9000, function (cancelada) { return self.mostrarPista(cancelada); });
        },

        /**
         * Vida de fondo en las escenas al aire libre: bandadas de pájaros que cruzan el cielo y
         * mariposas que revolotean cerca del pasto.
         */
        montarVida: function () {
            var self = this;
            var L = this.L;
            var cielo = { parque: 1, aeropuerto: 1, estacion: 1, calle: 1, patio: 1 }[this.tipo];
            var flores = { parque: 1, patio: 1 }[this.tipo];
            (this.vida || []).forEach(function (o) { o.destroy(); });
            this.vida = [];
            if (cielo) {
                for (var i = 0; i < 3; i++) {
                    var p = this.add.graphics().setDepth(2);
                    p.vx = rnd(35, 70);
                    p.base = rnd(L.top + L.marco * 1.3, Math.max(L.top + L.marco * 1.4, L.horizonte - 70));
                    p.x = rnd(-200, L.w);
                    p.fase = Math.random() * 6;
                    this.vida.push(p);
                }
            }
            if (flores) {
                var colores = [0xff922b, 0xcc5de8, 0x4dabf7, 0xfcc419];
                for (var k = 0; k < 3; k++) {
                    var m = this.add.container(rnd(0, L.w), L.horizonte + rnd(10, 40)).setDepth(27);
                    var c = colores[k % colores.length];
                    var a1 = this.add.ellipse(-6, 0, 12, 16, c).setOrigin(1, 0.5);
                    var a2 = this.add.ellipse(6, 0, 12, 16, c).setOrigin(0, 0.5);
                    m.add([a1, a2, this.add.ellipse(0, 0, 3, 12, 0x343a40)]);
                    m.alas = [a1, a2];
                    m.mariposa = true;
                    m.fase = Math.random() * 6;
                    m.y0 = m.y;
                    this.vida.push(m);
                }
            }
            this.vidaPaso = function (t, dt) {
                self.vida.forEach(function (o) {
                    if (o.mariposa) {
                        o.fase += dt / 1000;
                        o.x += Math.sin(o.fase * 0.7) * 0.9 + 0.25;
                        o.y = o.y0 + Math.sin(o.fase * 1.6) * 22;
                        var ab = Math.abs(Math.sin(t / 70 + o.fase));
                        o.alas[0].scaleX = ab;
                        o.alas[1].scaleX = ab;
                        if (o.x > L.w + 20) o.x = -20;
                        return;
                    }
                    // Bandada de 3 pájaros en V aleteando.
                    o.x += o.vx * dt / 1000;
                    if (o.x > L.w + 80) { o.x = -120; o.base = rnd(L.top + L.marco * 1.3, Math.max(L.top + L.marco * 1.4, L.horizonte - 70)); }
                    o.y = o.base + Math.sin(t / 900 + o.fase) * 8;
                    o.clear();
                    o.lineStyle(2.5, 0x343a40, 0.8);
                    [[0, 0], [-16, 9], [-14, -10]].forEach(function (q, j) {
                        var al = Math.sin(t / 110 + j + o.fase) * 5;
                        o.beginPath();
                        o.moveTo(q[0] - 7, q[1] - al);
                        o.lineTo(q[0], q[1] + 2);
                        o.lineTo(q[0] + 7, q[1] - al);
                        o.strokePath();
                    });
                });
            };
        },

        /* ── Presentador 3D (Zoe en 3-4, Zeus en 5-6) que reacciona al juego ── */

        montarPresentador: function () {
            if (this.pres || !global.AsociaPj3D || !this.L) return;
            // En pantallas angostas no hay lugar libre para el presentador.
            if (this.L.w < 700 || (this.mundo && this.mundo.sinPresentador)) { this.pres = { clip: function () {}, visible: function () {}, ubicar: function () {}, falso: true }; return; }
            var alto = Math.min(140, this.L.h * 0.25);
            this.tarima = this.add.image(0, 0, A.textura(this, 'pedestal', 256)).setDisplaySize(alto * 0.75, alto * 0.42).setDepth(19);
            this.presAlto = alto;
            this.pres = global.AsociaPj3D.crear(this.mayor ? 'nino' : 'nina', { alto: alto, clip: 'Saludar', giro: -0.6 });
            this.ubicarPresentador();
            this.reaccion('Saludar', 2600);
        },

        /** Arriba a la derecha, debajo de los botones de reiniciar y salir: no tapa a ningún objeto. */
        ubicarPresentador: function () {
            if (!this.pres || this.pres.falso) return;
            var L = this.L;
            var piso = 84 + this.presAlto;
            this.pres.ubicar(L.w - 56, piso - this.presAlto / 2);
            if (this.tarima) this.tarima.setPosition(L.w - 56, piso + 2);
        },

        reaccion: function (clip, ms) {
            var self = this;
            if (!this.pres) return;
            this.pres.clip(clip);
            if (this.presTimer) this.presTimer.remove();
            this.presTimer = this.time.delayedCall(ms || 1800, function () {
                if (self.pres) self.pres.clip(self.fase === 'fin' ? 'Bailar' : 'Quieto');
            });
        },

        /** Sombra en el piso para lo que camina, rueda o salta (no para lo que vuela). */
        ponerSombra: function (m) {
            if (!m || m.vuela || m.sinSombra || !m.actor) return;
            var a = m.actor;
            m.suelo = (m.y0 != null ? m.y0 : a.cont.y) + a.tam * 0.46;
            m.sombra = this.add.ellipse(a.cont.x, m.suelo, a.tam * 0.62, a.tam * 0.1, 0x000000, 0.18).setDepth(Math.max(1, a.cont.depth - 1));
            var destruir = a.destruir;
            a.destruir = function () { if (m.sombra) { m.sombra.destroy(); m.sombra = null; } destruir(); };
        },

        moverSombra: function (m) {
            if (!m.sombra) return;
            var a = m.actor;
            var alto = m.suelo - (a.cont.y + a.tam * 0.46);
            var f = Math.max(0.35, Math.min(1, 1 - alto / (a.tam * 0.9)));
            m.sombra.x = a.cont.x;
            m.sombra.setScale(f * Math.abs(a.cont.scaleY));
            m.sombra.alpha = 0.2 * f * a.cont.alpha;
        },

        /** Fondo de la escena: los mundos de 5-6 traen el suyo. */
        pintarFondo: function () {
            var f = FONDOS[this.tipo] || (this.mundo && this.mundo.fondo) || FONDOS.parque;
            f(this, this.fondoG);
        },

        calcularLayout: function () {
            var w = this.scale.width, h = this.scale.height;
            var L = this.L = { w: w, h: h, top: 108 };
            // Pantalla angosta (tableta vertical): todo centrado y por encima de los botones de la
            // esquina inferior derecha en lugar de correrse a la izquierda.
            var angosta = w < 700;
            if (!this.cinco) {
                L.tam = Math.max(95, Math.min(w * (angosta ? 0.27 : 0.2), (h - L.top) * 0.38, 210));
                L.paso = Math.min(w * (angosta ? 0.31 : 0.24), L.tam * 1.32);
                var medio = L.paso + L.tam * 0.55;
                L.cx = Math.min(w * 0.5, w - 150 - medio);
                L.ys = h - L.tam * 0.55 - Math.max(16, h * 0.05);
                if (angosta || L.cx - medio < 8) {
                    L.cx = w * 0.5;
                    L.ys = Math.min(L.ys, h - 118 - L.tam * 0.45);
                }
                // Cinco escondites: tres adelante y dos atrás (más pequeños, en el fondo).
                var atras = L.ys - L.tam * 0.62;
                L.spots = [
                    { x: L.cx - L.paso, y: L.ys, esc: 1 }, { x: L.cx, y: L.ys, esc: 1 }, { x: L.cx + L.paso, y: L.ys, esc: 1 },
                    { x: L.cx - L.paso * 0.5, y: atras, esc: 0.74 }, { x: L.cx + L.paso * 0.5, y: atras, esc: 0.74 }
                ];
                L.horizonte = atras + L.tam * 0.12;
                L.via = L.ys + L.tam * 0.3;
                L.marco = Math.max(50, Math.min(L.tam * 0.5, 86));
                var fx = angosta ? w * 0.5 : L.cx;
                var fpaso = Math.min(L.paso, (Math.min(fx, w - fx) - L.marco * 0.62 - 6) / 1.15);
                L.marcos = [-1.15, -0.55, 0.55, 1.15].map(function (f) { return fx + f * fpaso; });
                var hueco = Math.max(60, (atras - L.tam * 0.45 - L.top));
                L.bocina = { x: fx, y: L.top + Math.min(56, hueco * 0.5), r: Math.min(46, hueco * 0.42, fpaso * 0.42) };
                L.cuerda = L.top + 4;
            } else {
                var n = 5;
                L.cols = angosta ? 3 : n;
                var util = angosta ? w - 24 : w - 150 - 24;
                L.paso = Math.min(util / L.cols, 190);
                L.tam = Math.max(70, Math.min(L.paso * 0.84, h * 0.27, 170));
                L.cx = angosta ? w * 0.5 : Math.min(w * 0.5, w - 150 - (n * L.paso) / 2);
                L.ys = h - L.tam * 0.55 - Math.max(22, h * 0.045);
                if (angosta) L.ys = Math.min(L.ys, h - 112 - L.tam * 0.6);
                L.fila2 = angosta ? L.ys - L.tam * 1.3 : null;
                L.spots = [];
                for (var i = 0; i < n; i++) {
                    var s;
                    if (angosta) {
                        s = i < 2 ? { x: L.cx + (i - 0.5) * L.paso, y: L.fila2 } : { x: L.cx + (i - 3) * L.paso, y: L.ys };
                    } else {
                        s = { x: L.cx + (i - (n - 1) / 2) * L.paso, y: L.ys };
                    }
                    s.esc = 1;
                    L.spots.push(s);
                }
                L.horizonte = L.ys + L.tam * 0.1;
                L.mw = Math.min(w * (angosta ? 0.42 : 0.34), (h * 0.3) / 0.62, 330);
                L.mh = L.mw * 0.62;
                L.mx = w * 0.5;
                L.my = L.top + L.mh / 2 + 2;
                var orejaR = Math.min(38, (w - (L.mx + L.mw / 2)) * 0.3);
                L.oreja = { x: L.mx + L.mw / 2 + orejaR + 12, y: L.my, r: orejaR };
                L.nido = { x: L.mx, y: L.my + L.mh / 2 + 30 };
                // Gradilla con cuatro tubos de ensayo (uno por nivel) a la izquierda de la máquina.
                var piso = (L.fila2 != null ? L.fila2 : L.ys) - L.tam * 0.55;
                var alto = Math.min(h * 0.34, 190, piso - L.top - 10);
                var izq = L.mx - L.mw / 2;
                L.tubos = { x: izq / 2, y: L.top + 8 + alto / 2, alto: alto, ancho: Math.min(30, alto * 0.2, (izq - 16) / 8.4) };
            }
        },

        /* ── 3-4: bocina, tendedero (un marco por nivel) y escondites ── */

        montarAlbum: function () {
            var L = this.L;
            var self = this;
            this.bocina = this.add.container(L.bocina.x, L.bocina.y).setDepth(30);
            var plato = this.add.circle(0, 0, L.bocina.r, 0xff922b).setStrokeStyle(5, 0xffffff);
            var luz = this.add.circle(-L.bocina.r * 0.3, -L.bocina.r * 0.35, L.bocina.r * 0.35, 0xffffff, 0.3);
            var icono = this.add.image(0, 0, A.textura(this, 'bocina', 128)).setDisplaySize(L.bocina.r * 1.35, L.bocina.r * 1.35);
            this.bocina.add([plato, luz, icono]);
            this.bocina.plato = plato;
            this.cuerda = this.add.graphics().setDepth(20);
            this.marcos = L.marcos.map(function (x) {
                var m = self.add.container(x, L.cuerda + 8).setDepth(21);
                var foto = self.add.image(0, L.marco * 0.5, A.textura(self, 'polaroid', 256)).setDisplaySize(L.marco, L.marco);
                m.add(foto);
                m.estrellas = [];
                m.angle = rnd(-4, 4);
                return m;
            });
            this.dibujarCuerda();
            if (this.mundo) this.mundo.montar(this);
            else this.montarEscondites();
        },

        /** Arbustos, baúles, cajas o maletas según la escena: de ahí asoman los objetos. */
        montarEscondites: function () {
            var self = this;
            var L = this.L;
            var tex = { parque: 'arbusto', sala: 'caja_juguetes', dormitorio: 'caja_juguetes', aeropuerto: 'maleta', estacion: 'caja_carton' }[this.tipo] || 'caja_juguetes';
            (this.tapas || []).forEach(function (t) { t.destroy(); });
            this.tapas = L.spots.map(function (s) {
                var t = L.tam * s.esc;
                var alto = tex === 'arbusto' ? t * 0.62 : t * 0.5;
                return self.add.image(s.x, s.y + t * 0.3, A.textura(self, tex, 256)).setDisplaySize(t * 0.98, alto).setDepth(s.esc < 1 ? 23 : 27);
            });
        },

        dibujarCuerda: function () {
            var L = this.L;
            var g = this.cuerda;
            g.clear();
            g.lineStyle(3, 0x8b5a2b, 0.9);
            var x0 = L.marcos[0] - L.marco, x1 = L.marcos[3] + L.marco;
            g.beginPath();
            g.moveTo(x0, L.cuerda);
            for (var i = 1; i <= 20; i++) {
                var t = i / 20;
                g.lineTo(x0 + (x1 - x0) * t, L.cuerda + Math.sin(t * Math.PI) * 10);
            }
            g.strokePath();
            this.marcos.forEach(function (m) {
                var t = (m.x - x0) / (x1 - x0);
                m.y = L.cuerda + Math.sin(t * Math.PI) * 10 + 2;
                g.fillStyle(0xf08c00, 1);
                g.fillRect(m.x - 3, m.y - 6, 6, 12);
            });
        },

        /* ── 5-6: máquina, oreja, esfera, pedestales y tubos ──── */

        montarLaboratorio: function () {
            var L = this.L;
            this.maquina = this.add.image(L.mx, L.my, A.textura(this, 'maquina', 512)).setDisplaySize(L.mw, L.mh / 0.92).setDepth(10);
            this.pantalla = this.add.graphics().setDepth(11);
            this.oreja = this.add.container(L.oreja.x, L.oreja.y).setDepth(30);
            var plato = this.add.circle(0, 0, L.oreja.r, 0x15aabf).setStrokeStyle(5, 0xffffff);
            var icono = this.add.image(0, 0, A.textura(this, 'oreja', 128)).setDisplaySize(L.oreja.r * 1.4, L.oreja.r * 1.4);
            this.oreja.add([plato, icono]);
            this.oreja.plato = plato;
            this.nidoG = this.add.graphics().setDepth(12);
            this.esfera = this.add.container(L.nido.x, L.nido.y).setDepth(50).setVisible(false);
            var halo = this.add.circle(0, 0, 34, 0x63e6be, 0.35).setBlendMode(Phaser.BlendModes.ADD);
            var nucleo = this.add.circle(0, 0, 22, 0x20c997).setStrokeStyle(4, 0xe6fcf5);
            var brillo = this.add.circle(-7, -7, 7, 0xffffff, 0.7);
            this.esferaOnda = this.add.graphics();
            this.esfera.add([halo, nucleo, this.esferaOnda, brillo]);
            this.esfera.halo = halo;
            this.tubosG = this.add.graphics().setDepth(14);
            this.llenos = [0, 0, 0, 0];
            this.montarPedestales();
            this.dibujarLab();
        },

        /** Compuertas del mesón: el pedestal sube con el objeto y vuelve a bajar. */
        montarPedestales: function () {
            var self = this;
            var L = this.L;
            (this.compuertas || []).forEach(function (c) { c.destroy(); });
            (this.pedestales || []).forEach(function (p) { p.destroy(); });
            this.compuertas = L.spots.map(function (s) {
                return self.add.ellipse(s.x, s.y + L.tam * 0.47, L.tam * 0.9, L.tam * 0.16, 0x0b7285, 0.85).setDepth(21);
            });
            this.pedestales = L.spots.map(function (s) {
                return self.add.image(s.x, s.y + L.tam * 0.42, A.textura(self, 'pedestal', 256)).setDisplaySize(L.tam * 1.05, L.tam * 0.6).setDepth(22).setAlpha(0);
            });
        },

        dibujarLab: function () {
            var L = this.L;
            var g = this.nidoG;
            g.clear();
            g.fillStyle(0x495057, 1);
            g.fillRect(L.mx - 14, L.my + L.mh / 2 - 4, 28, 12);
            g.fillStyle(0x868e96, 1);
            g.fillEllipse(L.nido.x, L.nido.y + 22, 70, 16);
            g.lineStyle(3, 0x20c997, 0.7);
            g.strokeEllipse(L.nido.x, L.nido.y + 22, 70, 16);
            this.dibujarTubos();
        },

        /** Cuatro tubos de ensayo (uno por nivel) que se llenan con cada sonido atrapado. */
        dibujarTubos: function () {
            var T = this.L.tubos;
            var g = this.tubosG;
            var self = this;
            var N = 4;
            g.clear();
            var paso = T.ancho * 1.9;
            var colores = [0x63e6be, 0x74c0fc, 0xf783ac, 0xffd43b];
            var medio = paso * (N / 2 + 0.2);
            g.fillStyle(0xa0522d, 1);
            g.fillRoundedRect(T.x - medio, T.y + T.alto * 0.18, medio * 2, 14, 4);
            g.fillRoundedRect(T.x - medio, T.y + T.alto * 0.46, medio * 2, 12, 4);
            g.fillRect(T.x - medio + 4, T.y + T.alto * 0.18, 8, T.alto * 0.32);
            g.fillRect(T.x + medio - 12, T.y + T.alto * 0.18, 8, T.alto * 0.32);
            for (var i = 0; i < N; i++) {
                var x = T.x + (i - (N - 1) / 2) * paso;
                var top = T.y - T.alto * 0.42;
                var fondo = T.y + T.alto * 0.42;
                var r = T.ancho / 2;
                var nivel = self.llenos[i];
                if (nivel > 0) {
                    var ytope = fondo - (fondo - top - r) * 0.85 * nivel;
                    g.fillStyle(colores[i], 0.9);
                    g.fillRect(x - r + 3, ytope, T.ancho - 6, fondo - ytope);
                    g.fillCircle(x, fondo, r - 3);
                    g.fillStyle(0xffffff, 0.5);
                    g.fillEllipse(x, ytope, T.ancho - 6, 6);
                }
                if (self.nivelActual === i && self.fase !== 'fin') {
                    g.lineStyle(3, 0xfcc419, 0.9);
                    g.strokeRoundedRect(x - r - 5, top - 10, T.ancho + 10, fondo - top + 18, 6);
                }
                g.lineStyle(3, 0x495057, 0.7);
                g.fillStyle(0xe7f5ff, 0.25);
                g.fillRect(x - r, top, T.ancho, fondo - top);
                g.strokeRect(x - r, top, T.ancho, fondo - top);
                g.fillStyle(0xffffff, 0.55);
                g.fillRect(x - r + 4, top + 6, 4, fondo - top - 12);
                g.fillStyle(0x868e96, 1);
                g.fillRoundedRect(x - r - 4, top - 6, T.ancho + 8, 8, 3);
            }
        },

        bocaTubo: function (i) {
            var T = this.L.tubos;
            return { x: T.x + (i - 1.5) * T.ancho * 1.9, y: T.y - T.alto * 0.42 };
        },

        /** Onda en la pantalla de la máquina: la real del audio mientras suena. */
        dibujarPantalla: function (time) {
            var L = this.L;
            var g = this.pantalla;
            var sx = L.mx - L.mw * 0.42, sw = L.mw * 0.84;
            var sy = L.my - L.mh / 0.92 / 2 + (L.mh / 0.92) * 0.12, sh = (L.mh / 0.92) * 0.62;
            g.clear();
            g.lineStyle(1, 0x20c997, 0.18);
            for (var i = 1; i < 6; i++) g.lineBetween(sx + sw * i / 6, sy + 4, sx + sw * i / 6, sy + sh - 4);
            g.lineBetween(sx + 4, sy + sh / 2, sx + sw - 4, sy + sh / 2);
            var datos = this.sonando && Sfx() ? Sfx().onda() : null;
            if (datos) {
                // Grabaciones (config.audios.sonidos) o audio aún bloqueado no pasan por el analizador:
                // si llega plana mientras suena, se dibuja una onda sintética que sí se mueve.
                var mn = 255, mx = 0;
                for (var q = 0; q < datos.length; q += 16) { mn = Math.min(mn, datos[q]); mx = Math.max(mx, datos[q]); }
                if (mx - mn < 4) datos = null;
            }
            var sintetica = this.sonando && !datos;
            var amp = this.ampPantalla != null ? this.ampPantalla : 1;
            g.lineStyle(3, 0x63e6be, 1);
            g.beginPath();
            var n = 90;
            for (var j = 0; j <= n; j++) {
                var x = sx + 6 + (sw - 12) * j / n;
                var v;
                if (datos) v = (datos[Math.floor(j / n * (datos.length - 1))] - 128) / 128 * 2.2;
                else if (sintetica) v = (Math.sin(j * 0.9 + time / 35) * 0.5 + Math.sin(j * 2.3 - time / 21) * 0.3 + (Math.random() - 0.5) * 0.25) * (0.55 + 0.45 * Math.abs(Math.sin(time / 260)));
                else v = Math.sin(time / 300 + j * 0.4) * 0.03;
                v = Math.max(-1, Math.min(1, v)) * amp;
                var y = sy + sh / 2 + v * sh * 0.42;
                if (j) g.lineTo(x, y); else g.moveTo(x, y);
            }
            g.strokePath();
            if (this.memoria) {
                for (var p = 0; p < 3; p++) {
                    var on = (time / 500 | 0) % 4 > p;
                    g.fillStyle(0xfcc419, on ? 1 : 0.25);
                    g.fillCircle(L.mx + (p - 1) * 26, sy + sh * 0.82, 7);
                }
            }
        },

        /* ── Niveles ──────────────────────────────────────────── */

        /** Frases de acierto (una por objeto). */
        elogios: function () {
            return {
                bicicleta: { voz: 'zoe', texto: '¡Sí! ¡Era la bicicleta!' },
                telefono: { voz: 'zeus', texto: '¡Sí! ¡Era el teléfono!' },
                reloj: { voz: 'zoe', texto: '¡Sí! ¡Era el reloj despertador!' },
                avion: { voz: 'zeus', texto: '¡Sí! ¡Era el avión!' },
                tren: { voz: 'zoe', texto: '¡Sí! ¡Era el tren!' },
                ambulancia: { voz: 'zeus', texto: '¡Sí! ¡Era la ambulancia!' },
                aspiradora: { voz: 'zoe', texto: '¡Sí! ¡Era la aspiradora!' },
                puerta: { voz: 'zeus', texto: '¡Sí! ¡Era la puerta!' },
                ventana: { voz: 'zoe', texto: '¡Sí! ¡Era la ventana!' },
                cajon: { voz: 'zeus', texto: '¡Sí! ¡Era el cajón!' },
                secador: { voz: 'zoe', texto: '¡Sí! ¡Era el secador de cabello!' },
                licuadora: { voz: 'zeus', texto: '¡Sí! ¡Era la licuadora!' },
                ventilador: { voz: 'zoe', texto: '¡Sí! ¡Era el ventilador!' },
                camion: { voz: 'zeus', texto: '¡Sí! ¡Era el camión!' },
                motocicleta: { voz: 'zoe', texto: '¡Sí! ¡Era la moto!' },
                aplaudiendo: { voz: 'zeus', texto: '¡Sí! ¡Estaban aplaudiendo!' },
                corriendo: { voz: 'zoe', texto: '¡Sí! ¡Estaba corriendo!' },
                saltando: { voz: 'zeus', texto: '¡Sí! ¡Estaba saltando!' },
                durmiendo: { voz: 'zoe', texto: '¡Sí! ¡Estaba roncando dormido!' },
                pluma: { voz: 'zeus', texto: '¡Sí! ¡Era el agua de la pluma!' },
                ducha: { voz: 'zoe', texto: '¡Sí! ¡Era la ducha!' },
                fuente: { voz: 'zeus', texto: '¡Sí! ¡Era la fuente!' },
                lavadora: { voz: 'zoe', texto: '¡Sí! ¡Era la lavadora!' },
                regadera: { voz: 'zeus', texto: '¡Sí! ¡Era la regadera!' }
            };
        },

        /** Frase al empezar cada nivel (2, 3 y 4). */
        avisosNivel: function () {
            return [
                null,
                { voz: 'zeus', texto: '¡Muy bien! ¡Ahora escucha otro sonido!' },
                { voz: 'zoe', texto: '¡Más rápido! ¡Salen más cosas!' },
                { voz: 'zeus', texto: '¡Atento! ¡El sonido cambia cada vez!' }
            ];
        },

        /**
         * Cuatro niveles. 1: el objeto del reto, de a uno y lento. 2 y 3: otro sonido, más objetos
         * a la vez y más rápido (en 5-6 el nivel 3 suena con el escenario vacío). 4: el sonido
         * buscado cambia en cada acierto.
         */
        armarNiveles: function () {
            var r = this.reto;
            var ops = (r.opciones || []).slice();
            var otros = mezclar(ops.filter(function (id) { return id !== r.correcto; }));
            var T = [r.correcto, otros[0], otros[1] || otros[0]];
            var c = this.mayor;
            var memoria = r.id === 'gran-asociacion';
            return [
                { objetivo: T[0], meta: 2, max: 2, arriba: c ? 5600 : 4300, cada: c ? 1300 : 1200, spots: c ? 5 : 3, memoria: memoria },
                { objetivo: T[1], meta: 2, max: 2, arriba: c ? 5000 : 3700, cada: c ? 1300 : 1300, spots: 5, memoria: memoria },
                { objetivo: T[2], meta: 2, max: c ? 3 : 2, arriba: c ? 4600 : 3200, cada: c ? 1100 : 1100, spots: 5, memoria: c || memoria },
                { objetivo: null, rota: T.concat(otros.slice(2)), meta: 3, max: 3, arriba: c ? 4400 : 3000, cada: 1000, spots: 5, memoria: memoria }
            ];
        },

        sonidoDe: function (id) {
            if (id === 'telefono' && this.reto.sonido === 'vibracion') return 'vibracion';
            if (id === this.reto.correcto) return this.reto.sonido;
            return Act.sonidoDe(id);
        },

        jugar: async function () {
            this.niveles = this.armarNiveles();
            this.pops = [];
            this.atrapados = 0;
            for (var i = 0; i < this.niveles.length; i++) {
                if (!this.ctx.vivo()) return;
                this.nivelActual = i;
                if (this.cinco) this.dibujarTubos();
                else this.marcarMarco(i);
                if (i > 0) {
                    await this.cambioNivel(i);
                    if (!this.ctx.vivo()) return;
                }
                await this.jugarNivel(this.niveles[i], i);
            }
            this.nivelActual = -1;
        },

        /** Cartel del nivel (estrellas, sin texto) y la frase de Zoe o Zeus. */
        cambioNivel: async function (i) {
            this.reaccion('Aplaudir', 2400);
            var L = this.L;
            var self = this;
            this.fase = 'nivel';
            await this.esconderTodo();
            efecto(this, 'magia');
            var cartel = this.add.container(L.w / 2, L.h * 0.5).setDepth(85).setScale(0.2).setAlpha(0);
            var fondo = this.add.circle(0, 0, 78, 0xffffff, 0.95).setStrokeStyle(8, 0xfcc419);
            cartel.add(fondo);
            for (var k = 0; k <= i; k++) {
                var est = this.add.image((k - i / 2) * 36, 0, A.textura(this, 'estrella', 128)).setDisplaySize(42, 42);
                cartel.add(est);
            }
            await tw(this, { targets: cartel, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
            Ut.estallido(this, cartel.x, cartel.y, { n: 16, tex: 'estrella', tam: 26, dist: 160, sinTinte: true });
            var aviso = this.avisosNivel()[i];
            await Promise.all([aviso ? this.ctx.decir(aviso, { minMs: 1200 }) : esperar(this, 900), esperar(this, 1000)]);
            await tw(this, { targets: cartel, scale: 0.2, alpha: 0, duration: 300, onComplete: function () { cartel.destroy(); } });
            void self;
        },

        jugarNivel: async function (nv, i) {
            var self = this;
            this.nv = nv;
            this.cuenta = 0;
            this.errores = 0;
            this.ayuda = false;
            this.brillaron = false;
            this.objetivo = nv.objetivo || nv.rota[0];
            // Mundos de objetos fijos (casa, agua, noria): se arman de nuevo en cada nivel.
            if (this.mundo && this.mundo.preparar) this.mundo.preparar(this, nv, i);
            await this.llamar(true);
            await new Promise(function (r) { self.finNivel = r; });
            this.finNivel = null;
            void i;
        },

        /**
         * La bocina (o la máquina) hace sonar lo que hay que buscar. Con `vaciar` los objetos se
         * esconden antes; en modo memoria el escenario queda vacío un momento después del sonido.
         */
        llamar: async function (vaciar) {
            this.fase = 'llamando';
            this.ultimaLlamada = this.time.now;
            var fijo = this.mundo && this.mundo.estatico;
            if (((vaciar && !this.mundo) || this.nv.memoria) && !fijo) await this.esconderTodo();
            // Modo memoria en mundos fijos: un telón tapa la escena mientras suena.
            var velo = this.nv.memoria && this.mundo && this.mundo.velo;
            if (velo) await this.mundo.velo(this, true);
            if (this.cinco) this.esfera.setVisible(false);
            await esperar(this, 250);
            await this.escuchar(this.sonidoDe(this.objetivo));
            if (!this.ctx.vivo()) return;
            if (this.cinco) await this.condensar();
            if (this.nv.memoria) {
                this.memoria = true;
                await esperar(this, 2000);
                this.memoria = false;
            }
            if (velo) await this.mundo.velo(this, false);
            if (this.mundo && this.mundo.alLlamar) this.mundo.alLlamar(this);
            this.fase = 'jugar';
            this.vistosSinObjetivo = 0;
            this.proximo = this.time.now + 200;
            this.ultimaAtrapada = this.time.now;
            this.pista.reiniciar();
        },

        /* ── Objetos que asoman y se esconden ─────────────────── */

        spotsLibres: function () {
            var usados = this.pops.map(function (p) { return p.spot; });
            var n = this.nv ? this.nv.spots : this.L.spots.length;
            var libres = [];
            for (var i = 0; i < Math.min(n, this.L.spots.length); i++) if (usados.indexOf(i) < 0 && i !== this.ultimoSpot) libres.push(i);
            if (!libres.length) for (var j = 0; j < Math.min(n, this.L.spots.length); j++) if (usados.indexOf(j) < 0) libres.push(j);
            return libres;
        },

        elegirQuien: function () {
            var nv = this.nv;
            var obj = this.objetivo;
            var hayObjetivo = this.pops.some(function (p) { return p.actor.id === obj && p.estado !== 'baja'; });
            var ops = (this.reto.opciones || []).slice();
            // El objetivo sale seguido (nunca dos salidas seguidas sin él) pero no siempre.
            if (!hayObjetivo && (this.vistosSinObjetivo >= 1 || Math.random() < 0.5)) {
                this.vistosSinObjetivo = 0;
                return obj;
            }
            this.vistosSinObjetivo += 1;
            var arriba = this.pops.map(function (p) { return p.actor.id; });
            var otros = ops.filter(function (id) { return id !== obj && arriba.indexOf(id) < 0; });
            if (!otros.length) otros = ops.filter(function (id) { return id !== obj; });
            void nv;
            return otros[Math.floor(Math.random() * otros.length)];
        },

        /** Objeto quieto y bien visible (demostración y fiesta final de los mundos de 3-4). */
        asomarQuieto: function (id, idx, opts) {
            var L = this.L;
            var x = L.w * (0.26 + 0.12 * idx);
            var movil = id === 'telefono' && this.reto.sonido === 'vibracion';
            var a = Act.crear(this, id, x, L.ys, L.tam, { variante: movil ? 'movil' : null });
            a.casa = { x: x, y: L.ys };
            a.sonido = this.sonidoDe(id);
            a.cont.setDepth(26).setScale(0.2);
            efecto(this, 'pop');
            var p = { actor: a, estado: 'arriba', hasta: this.time.now + ((opts && opts.ms) || 4000), fijo: true };
            this.tweens.add({ targets: a.cont, scale: 1, duration: 420, ease: 'Back.easeOut' });
            this.pops.push(p);
            return p;
        },

        asomar: function (id, spotIdx, opts) {
            if (this.mundo) return this.asomarQuieto(id, spotIdx, opts);
            opts = opts || {};
            var self = this;
            var L = this.L;
            var s = L.spots[spotIdx];
            var t = L.tam * s.esc;
            var movil = id === 'telefono' && this.reto.sonido === 'vibracion';
            var a = Act.crear(this, id, s.x, s.y, t, { variante: movil ? 'movil' : null });
            a.casa = { x: s.x, y: s.y };
            a.sonido = this.sonidoDe(id);
            var p = { actor: a, spot: spotIdx, estado: 'sube', hasta: this.time.now + (opts.ms || (this.nv ? this.nv.arriba : 4000)) };
            this.ultimoSpot = spotIdx;
            if (this.cinco) {
                var ped = this.pedestales[spotIdx];
                a.cont.setDepth(25).setAlpha(0);
                a.cont.y = s.y + t * 0.55;
                this.tweens.add({ targets: ped, alpha: 1, duration: 250 });
                efecto(this, 'enciende');
                this.tweens.add({ targets: a.cont, y: s.y, alpha: 1, duration: 420, ease: 'Back.easeOut', onComplete: function () { if (p.estado === 'sube') p.estado = 'arriba'; } });
            } else {
                // Sale de su escondite: crece desde la tapa y queda asomado.
                a.cont.setDepth(s.esc < 1 ? 22 : 26);
                a.cont.setScale(0.15);
                a.cont.y = s.y + t * 0.3;
                efecto(this, 'pop');
                this.tweens.add({ targets: a.cont, y: s.y - t * 0.22, scale: 1, duration: 420, ease: 'Back.easeOut', onComplete: function () { if (p.estado === 'sube') p.estado = 'arriba'; } });
            }
            this.pops.push(p);
            void self;
            return p;
        },

        /** El objeto vuelve a su escondite (más rápido si lo tocaron por error). */
        bajar: function (p, rapido) {
            var self = this;
            if (p.estado === 'baja' || p.estado === 'atrapado') return Promise.resolve();
            p.estado = 'baja';
            var a = p.actor;
            if (this.mundo) {
                if (this.mundo.quitar) this.mundo.quitar(p);
                return tw(this, { targets: a.cont, alpha: 0, duration: rapido ? 200 : 340 }).then(function () {
                    a.destruir();
                    self.pops = self.pops.filter(function (q) { return q !== p; });
                });
            }
            var s = this.L.spots[p.spot];
            var t = this.L.tam * s.esc;
            var ms = rapido ? 220 : 380;
            var fin = function () {
                a.destruir();
                self.pops = self.pops.filter(function (q) { return q !== p; });
            };
            if (this.cinco) {
                var ocupado = this.pops.some(function (q) { return q !== p && q.spot === p.spot; });
                if (!ocupado) this.tweens.add({ targets: this.pedestales[p.spot], alpha: 0, duration: ms });
                return tw(this, { targets: a.cont, y: s.y + t * 0.55, alpha: 0, duration: ms, ease: 'Quad.easeIn' }).then(fin);
            }
            return tw(this, { targets: a.cont, y: s.y + t * 0.3, scale: 0.15, duration: ms, ease: 'Back.easeIn' }).then(fin);
        },

        esconderTodo: async function () {
            var self = this;
            var lista = (this.pops || []).slice();
            if (lista.length) efecto(this, 'whoosh');
            await Promise.all(lista.map(function (p) { return self.bajar(p); }));
        },

        /** Reparto de salidas: corre en update mientras se juega. */
        /**
         * Mundos de 3-4: los objetos se mueven a su manera y el mundo sigue andando (también
         * mientras suena la llamada); se detiene durante el premio y los cambios de nivel.
         */
        repartirMundo: function (time) {
            var self = this;
            var dt = Math.min(60, time - (this.ultT || time));
            this.ultT = time;
            var anda = this.fase === 'jugar' || this.fase === 'llamando';
            var n = Math.max(0, this.nivelActual || 0);
            var vel = [1, 1.2, 1.4, 1.55][Math.min(3, n)];
            this.mundo.actualizar(this, time, dt, vel, anda);
            if (anda) {
                this.pops.slice().forEach(function (p) {
                    if (p.fijo || !p.paso || (p.estado !== 'arriba' && p.estado !== 'huye')) return;
                    p.paso(dt, vel, time);
                    self.moverSombra(p);
                    if (p.fuera()) {
                        p.estado = 'baja';
                        if (self.mundo.quitar) self.mundo.quitar(p);
                        p.actor.destruir();
                        self.pops = self.pops.filter(function (q) { return q !== p; });
                    }
                });
            }
            var nv = this.nv;
            if (!nv || this.fase !== 'jugar') return;
            var maxM = [3, 3, 4, 4][Math.min(3, n)];
            var cada = [2500, 2200, 1900, 1700][Math.min(3, n)];
            var vivos = this.pops.filter(function (p) { return p.estado === 'arriba'; }).length;
            if (this.mundo.estatico) {
                if (this.ayuda && !this.brillaron) {
                    this.brillaron = true;
                    this.pops.forEach(function (p) { if (p.actor.id === self.objetivo && p.estado === 'arriba') self.brillar(p); });
                }
            } else if (vivos < maxM && time > this.proximo) {
                var id = this.elegirQuien();
                var m = this.mundo.crear(this, id);
                if (m) {
                    m.estado = 'arriba';
                    this.ponerSombra(m);
                    this.pops.push(m);
                    if (this.ayuda && id === this.objetivo) this.brillar(m);
                }
                this.proximo = time + cada * (1 - this.cuenta * 0.06) * rnd(0.8, 1.2);
            }
            if (time - this.ultimaLlamada > 7000 && !this.sonando) {
                this.ultimaLlamada = time;
                this.escuchar(this.sonidoDe(this.objetivo), { breve: true });
            }
            if (time - this.ultimaAtrapada > 14000 && !this.ayuda) this.ayuda = true;
        },

        repartirSalidas: function (time) {
            if (this.mundo) return this.repartirMundo(time);
            var nv = this.nv;
            if (!nv || this.fase !== 'jugar') return;
            var self = this;
            // Los que ya cumplieron su tiempo se esconden (no mientras el niño arrastra la esfera hacia ellos).
            this.pops.forEach(function (p) {
                if (p.estado === 'arriba' && time > p.hasta && !(self.arr.cont && p === self.apuntado)) self.bajar(p);
            });
            var vivos = this.pops.filter(function (p) { return p.estado !== 'baja'; }).length;
            if (vivos < nv.max && time > this.proximo) {
                var libres = this.spotsLibres();
                if (libres.length) {
                    var spot = libres[Math.floor(Math.random() * libres.length)];
                    var id = this.elegirQuien();
                    var p = this.asomar(id, spot);
                    if (this.ayuda && id === this.objetivo) this.brillar(p);
                }
                // Cada acierto acelera un poco el ritmo dentro del nivel.
                this.proximo = time + nv.cada * (1 - this.cuenta * 0.08) * rnd(0.8, 1.2);
            }
            // Si pasa mucho sin aciertos: vuelve a sonar y el objetivo sale brillando.
            if (time - this.ultimaLlamada > 7000 && !this.sonando) {
                this.ultimaLlamada = time;
                this.escuchar(this.sonidoDe(this.objetivo), { breve: true });
            }
            if (time - this.ultimaAtrapada > 14000 && !this.ayuda) this.ayuda = true;
        },

        brillar: function (p) {
            var a = p.actor;
            var h = this.add.circle(0, 0, a.tam * 0.55, 0xfff3bf, 0.45).setBlendMode(Phaser.BlendModes.ADD);
            a.cont.addAt(h, 0);
            this.tweens.add({ targets: h, alpha: 0.1, duration: 600, yoyo: true, repeat: -1 });
        },

        /* ── Escuchar ─────────────────────────────────────────── */

        boton: function () { return this.cinco ? this.oreja : this.bocina; },

        escuchar: async function (sonido, o) {
            o = o || {};
            this.sonando = true;
            this.ampPantalla = 1;
            var b = this.boton();
            this.tweens.killTweensOf(b);
            b.setScale(1);
            var p = this.ctx.sonido ? this.ctx.sonido(sonido, o) : esperar(this, 1500);
            await p;
            this.sonando = false;
        },

        /** Repite lo que hay que buscar a pedido del niño (los objetos siguen saliendo). */
        repetir: function () {
            if (this.sonando || this.fase !== 'jugar') return;
            efecto(this, 'clic');
            this.ultimaLlamada = this.time.now;
            this.pista.reiniciar();
            this.escuchar(this.sonidoDe(this.objetivo));
        },

        invitar: function (si) {
            var b = this.boton();
            this.tweens.killTweensOf(b);
            b.setScale(1);
            if (si) this.tweens.add({ targets: b, scale: 1.12, duration: 420, yoyo: true, repeat: 3, ease: 'Sine.easeInOut' });
        },

        mostrarPista: function (cancelada) {
            var self = this;
            if (this.fase !== 'jugar' || this.sonando) return Promise.resolve();
            var b = this.boton();
            return this.ctx.mano({
                punto: { x: b.x, y: b.y }, holdMs: 500,
                cancelado: function () { return cancelada() || self.fase !== 'jugar'; },
                onPresionar: function () { self.repetir(); }
            });
        },

        /* ── Entrada ──────────────────────────────────────────── */

        tocaBoton: function (p) {
            var b = this.boton();
            var r = this.cinco ? this.L.oreja.r : this.L.bocina.r;
            return Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < r * 1.25;
        },

        popEn: function (x, y) {
            var hit = null;
            (this.pops || []).forEach(function (p) {
                if (!hit && (p.estado === 'arriba' || p.estado === 'sube') && p.actor.contiene(x, y)) hit = p;
            });
            return hit;
        },

        alTocar: function (p) {
            if (this.ctx.enDemo && this.ctx.enDemo()) return;
            if (this.fase !== 'jugar') return;
            if (this.tocaBoton(p)) { this.repetir(); return; }
            if (this.cinco && this.esfera.visible && Phaser.Math.Distance.Between(p.x, p.y, this.esfera.x, this.esfera.y) < 46) {
                this.arr.empezar(this.esfera, p);
                this.esfera.setScale(1.15);
                return;
            }
            var pop = this.popEn(p.x, p.y);
            if (pop) this.elegir(pop, false);
        },

        alMover: function (p) {
            if (!this.arr.cont) return;
            this.arr.mover(p);
            var pop = this.popEn(this.esfera.x, this.esfera.y);
            if (pop !== this.apuntado) {
                if (this.apuntado && this.apuntado.actor.cont.active) this.apuntado.actor.cont.setScale(1);
                this.apuntado = pop;
                if (pop) pop.actor.cont.setScale(1.08);
            }
        },

        alSoltar: function (p) {
            var r = this.arr.soltar(p);
            if (!r) return;
            this.esfera.setScale(1);
            var pop = this.popEn(this.esfera.x, this.esfera.y);
            if (this.apuntado && this.apuntado.actor.cont.active) this.apuntado.actor.cont.setScale(1);
            this.apuntado = null;
            if (pop && this.fase === 'jugar') this.elegir(pop, true);
            else this.arr.devolver(this.esfera, { x: this.L.nido.x, y: this.L.nido.y });
        },

        elegir: function (pop, arrastrada) {
            if (this.fase !== 'jugar') return;
            this.pista.reiniciar();
            if (pop.actor.id === this.objetivo) this.atrapar(pop, arrastrada);
            else this.fallo(pop, arrastrada);
        },

        /** Error: el objeto deja oír su propio sonido, se sacude y se esconde rápido. */
        fallo: async function (pop, arrastrada) {
            this.reaccion('Decir_no', 1500);
            var a = pop.actor;
            this.errores += 1;
            pop.estado = 'atrapado';
            if (this.cinco) {
                if (!arrastrada) await tw(this, { targets: this.esfera, x: a.cont.x, y: a.cont.y - this.L.tam * 0.2, duration: 300, ease: 'Quad.easeIn' });
                efecto(this, 'rebote');
                this.tweens.add({ targets: this.esfera, x: this.L.nido.x, y: this.L.nido.y, duration: 560, ease: 'Back.easeOut' });
            } else {
                efecto(this, 'suave');
            }
            this.escuchar(a.sonido, { breve: true, vol: 0.7 });
            await a.sacudir();
            if (this.mundo && this.mundo.estatico) {
                pop.estado = 'arriba';
            } else if (this.mundo && pop.huir) {
                pop.estado = 'huye';
                pop.huir();
            } else {
                pop.estado = 'arriba';
                this.bajar(pop, true);
            }
            if (this.time.now - (this.ultimoReclamo || -99999) > 7000) {
                this.ultimoReclamo = this.time.now;
                this.ctx.decir({ voz: 'zeus', texto: '¡Escucha otra vez!' }, { minMs: 900 });
            }
            if (this.errores >= 3) this.ayuda = true;
            this.invitar(true);
        },

        /** Acierto: el objeto se queda, hace su acción real con su sonido y suma al nivel. */
        atrapar: async function (pop, arrastrada) {
            var self = this;
            var L = this.L;
            var a = pop.actor;
            var nv = this.nv;
            this.fase = 'premio';
            this.reaccion('Celebrar', 2600);
            this.pista.parar();
            pop.estado = 'atrapado';
            this.cuenta += 1;
            this.atrapados += 1;
            this.hechos = this.atrapados;
            this.ultimaAtrapada = this.time.now;
            var principal = a.id === this.reto.correcto && !this.dijoReto;
            var ac = principal ? (this.reto.acierto || {}) : { repetir: 'breve' };
            // Los demás se esconden (o en los mundos se quedan quietos y opacos) para que el acierto se luzca.
            var opacos = [];
            this.pops.forEach(function (q) {
                if (q === pop) return;
                if (self.mundo) { if (q.estado === 'arriba') { q.actor.cont.alpha = 0.4; opacos.push(q); } } else self.bajar(q);
            });
            a.cont.setDepth(35);
            var haz = null;
            var esc0 = a.cont.scale;
            if (this.cinco) {
                if (!arrastrada) await tw(this, { targets: this.esfera, x: a.cont.x, y: a.cont.y, duration: 340, ease: 'Quad.easeIn' });
                else await tw(this, { targets: this.esfera, x: a.cont.x, y: a.cont.y, duration: 140 });
                this.esfera.setVisible(false);
                Ut.estallido(this, a.cont.x, a.cont.y, { n: 14, tex: 'chispa', tam: 26, dist: 110, colores: [0x63e6be, 0x20c997, 0xffffff] });
                efecto(this, 'camara');
                haz = this.add.rectangle(a.casa.x, a.casa.y + L.tam * 0.42, L.tam * 0.9, L.tam * 2.2, 0x99e9f2, 0).setOrigin(0.5, 1).setDepth(23).setBlendMode(Phaser.BlendModes.ADD);
                this.tweens.add({ targets: haz, fillAlpha: 0.35, duration: 400 });
                var techo = L.tubos.y + L.tubos.alto * 0.5 + L.tam * 0.62;
                var sube = Math.max(0, Math.min(L.tam * 0.16, a.casa.y - techo));
                await tw(this, { targets: a.cont, y: a.casa.y - sube, scale: 1.12, duration: 420, ease: 'Back.easeOut' });
            } else if (this.mundo) {
                if (pop.quieto && typeof pop.quieto === 'function') pop.quieto();
                // Si lo atraparon pegado a un borde (detrás de los botones), se acerca al centro.
                var minX = L.tam * 0.6, maxX = L.w - Math.max(170, L.tam * 0.6);
                if (!this.mundo.estatico && (a.cont.x < minX || a.cont.x > maxX)) {
                    await tw(this, { targets: a.cont, x: Math.max(minX, Math.min(maxX, a.cont.x)), duration: 380, ease: 'Sine.easeOut' });
                }
                await this.mundo.alAtrapar(this, pop);
                await tw(this, { targets: a.cont, scale: esc0 * 1.1, duration: 220, ease: 'Back.easeOut' });
            } else {
                // Sale del todo de su escondite para hacer su acción delante.
                var s = L.spots[pop.spot];
                await tw(this, { targets: a.cont, y: s.y - L.tam * 0.3 * s.esc, scale: esc0 * 1.08, duration: 260, ease: 'Back.easeOut' });
            }
            var rep = ac.repetir === 'completo' ? {} : { breve: true };
            var sonido = this.escuchar(a.sonido, rep);
            await Promise.all([sonido, a.acierto(this.ultimaDuracion())]);
            if (!this.ctx.vivo()) return;
            efecto(this, ac.efecto || 'recompensa');
            this.cameras.main.shake(160, 0.0035);
            Ut.estallido(this, a.cont.x, a.cont.y - L.tam * 0.2, { n: ac.efecto === 'celebracion' || ac.especial ? 24 : 14, tex: 'estrella', tam: 30, dist: ac.especial ? 220 : 160, sinTinte: true });
            if (ac.especial) Ut.confeti(this, 50);
            var ultimo = this.cuenta >= nv.meta && this.nivelActual === 3;
            if (ac.celebran || ultimo) {
                if (this.ctx.celebrar) this.ctx.celebrar(true);
                Ut.confeti(this, 90);
            }
            var linea = principal && ac.texto ? { voz: ac.voz || 'zoe', texto: ac.texto } : (this.cuenta === 1 ? this.elogios()[a.id] : null);
            if (principal) this.dijoReto = true;
            var voz = linea ? this.ctx.decir(linea, { estado: 'acierto', minMs: 1000 }) : esperar(this, 500);
            if (this.cinco) {
                await this.llenarTubo(a, this.nivelActual, this.cuenta / nv.meta);
                await voz;
                if (haz) this.tweens.add({ targets: haz, fillAlpha: 0, duration: 300, onComplete: function () { haz.destroy(); } });
            } else {
                await this.fotografiar(a, this.nivelActual, this.cuenta === 1);
                if (this.mundo && this.mundo.alGuardar) this.mundo.alGuardar(this, pop);
                await voz;
            }
            opacos.forEach(function (q) { if (q.actor.cont.active) q.actor.cont.alpha = 1; });
            if (ac.celebran && this.ctx.celebrar) this.ctx.celebrar(false);
            a.cont.setScale(esc0);
            pop.estado = 'arriba';
            if (this.mundo && this.mundo.estatico) {
                a.cont.setDepth(25);
                if (this.mundo.trasAtrapar) await this.mundo.trasAtrapar(this, pop);
            } else {
                await this.bajar(pop);
            }
            if (!this.ctx.vivo()) return;
            if (this.cuenta >= nv.meta) {
                if (this.finNivel) this.finNivel();
                return;
            }
            // Nivel 4: cada acierto trae un sonido nuevo; en los demás se recuerda el mismo.
            if (nv.rota) {
                var actual = this.objetivo;
                var cand = nv.rota.filter(function (id) { return id !== actual; });
                this.objetivo = cand[Math.floor(Math.random() * cand.length)];
                await this.llamar(true);
            } else {
                await this.llamar(false);
            }
        },

        /** La onda de la pantalla se encoge y cae convertida en esfera. */
        condensar: async function () {
            var L = this.L;
            efecto(this, 'carga');
            await tw(this, { targets: this, ampPantalla: 0, duration: 500 });
            this.ampPantalla = 1;
            this.esfera.setPosition(L.mx, L.my + L.mh / 2).setScale(0.2).setVisible(true).setAlpha(1);
            await tw(this, { targets: this.esfera, y: L.nido.y, scale: 1, duration: 480, ease: 'Bounce.easeOut' });
        },

        /** Una esferita sale del objeto y llena el tubo del nivel hasta `nivel` (0-1). */
        llenarTubo: async function (a, i, nivel) {
            var self = this;
            var j = Math.max(0, Math.min(3, i));
            var boca = this.bocaTubo(j);
            var bola = this.add.circle(a.cont.x, a.cont.y - this.L.tam * 0.2, 14, 0x63e6be).setStrokeStyle(3, 0xffffff).setDepth(60);
            efecto(this, 'carga');
            var prog = { k: 0 };
            var x0 = bola.x, y0 = bola.y;
            await tw(this, {
                targets: prog, k: 1, duration: 700, ease: 'Sine.easeInOut',
                onUpdate: function () {
                    var k = prog.k;
                    bola.x = x0 + (boca.x - x0) * k;
                    bola.y = y0 + (boca.y - y0) * k - Math.sin(k * Math.PI) * 90;
                }
            });
            bola.destroy();
            Ut.estallido(this, boca.x, boca.y, { n: 8, tex: 'burbuja', tam: 16, dist: 50, sinTinte: true, ms: 700 });
            var desde = this.llenos[j];
            this.tweens.addCounter({ from: desde, to: Math.min(1, nivel), duration: 600, onUpdate: function (t) { self.llenos[j] = t.getValue(); self.dibujarTubos(); } });
        },

        ultimaDuracion: function () {
            return this.ctx.duracionSonido ? this.ctx.duracionSonido() : 2000;
        },

        /** Marco del nivel que se está jugando: se balancea y se marca con un borde. */
        marcarMarco: function (i) {
            (this.marcos || []).forEach(function (m, k) { m.setAlpha(k <= i ? 1 : 0.55); });
            var m = this.marcos && this.marcos[i];
            if (m) this.tweens.add({ targets: m, angle: { from: -12, to: m.angle }, duration: 700, ease: 'Elastic.easeOut' });
        },

        /**
         * Flash de cámara: la primera vez en el nivel la foto del objeto vuela a su marco; las
         * siguientes suman una estrellita debajo del marco.
         */
        fotografiar: async function (a, i, foto) {
            var L = this.L;
            var marco = this.marcos[Math.max(0, Math.min(3, i))];
            var flash = this.add.rectangle(0, 0, L.w, L.h, 0xffffff, 0.75).setOrigin(0).setDepth(90);
            efecto(this, 'clic');
            this.tweens.add({ targets: flash, alpha: 0, duration: 360, onComplete: function () { flash.destroy(); } });
            if (foto || !marco.mini) {
                if (marco.mini) { marco.mini.destruir(); marco.mini = null; }
                var movil = this.reto.sonido === 'vibracion' && a.id === 'telefono';
                var mini = Act.crear(this, a.id, a.cont.x, a.cont.y, L.tam, { variante: movil ? 'movil' : null });
                mini.cont.setDepth(60);
                var self2 = this, cuenta = 0;
                await Ut.volarA(this, mini.cont, marco.x, marco.y + L.marco * 0.44, 700, (L.marco * 0.66) / L.tam, function (x, y) {
                    if (cuenta++ % 3) return;
                    var ch = self2.add.image(x, y, A.textura(self2, 'chispa', 64)).setDisplaySize(16, 16).setTint(0xffe066).setDepth(59);
                    self2.tweens.add({ targets: ch, alpha: 0, scale: 0.1, duration: 500, onComplete: function () { ch.destroy(); } });
                }, 80);
                mini.cont.setDepth(22);
                marco.mini = mini;
                this.fotos = (this.fotos || []).concat([mini]);
            }
            var n = marco.estrellas.length;
            var est = this.add.image(marco.x + (n - 1) * 15, marco.y + L.marco * 1.05, A.textura(this, 'estrella', 64)).setDisplaySize(18, 18).setDepth(22).setScale(0);
            marco.estrellas.push(est);
            this.tweens.add({ targets: est, scale: 18 / 64, duration: 400, ease: 'Back.easeOut' });
            this.tweens.add({ targets: marco, angle: { from: -10, to: marco.angle }, duration: 600, ease: 'Elastic.easeOut' });
            Ut.estallido(this, marco.x, marco.y + L.marco * 0.4, { n: 8, tex: 'chispa', tam: 18, dist: 60, colores: [0xffe066, 0xffffff] });
        },

        /* ── Demostración (vaca y gallo, que no salen en el juego) ── */

        demo: async function () {
            var self = this;
            var ctx = this.ctx;
            var t = ctx.textos || {};
            var d = this.config.demo || { sonido: 'mugido', correcto: 'vaca', opciones: ['gallo', 'vaca'] };
            var L = this.L;
            this.pops = [];
            this.nv = null;
            var limpiar = function () {
                ctx.quitarMano();
                self.esconderTodo();
                if (self.cinco) self.esfera.setVisible(false);
            };
            await ctx.decir({ voz: 'zoe', texto: t.demostracion || '¡Mira cómo se juega!' }, { minMs: 2200 });
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            var b = this.boton();
            var sonando = Promise.resolve();
            await ctx.mano({ punto: { x: b.x, y: b.y }, holdMs: 500, onPresionar: function () { sonando = self.escuchar(d.sonido); } });
            await sonando;
            if (!ctx.vivo() || !ctx.enDemo()) return limpiar();
            if (this.cinco) await this.condensar();
            // Asoman el gallo y la vaca de dos escondites.
            var spots = this.cinco ? [1, 3] : [0, 2];
            var popVaca = null;
            d.opciones.forEach(function (id, i) {
                var p = self.asomar(id, spots[i], { ms: 60000 });
                p.actor.sonido = id === d.correcto ? d.sonido : Act.sonidoDe(id);
                if (id === d.correcto) popVaca = p;
            });
            await esperar(this, 700);
            if (!ctx.vivo() || !ctx.enDemo() || !popVaca) return limpiar();
            var vaca = popVaca.actor;
            if (this.cinco) {
                var dx = vaca.cont.x - this.esfera.x;
                var dy = vaca.cont.y - this.esfera.y;
                await ctx.mano({
                    punto: { x: this.esfera.x, y: this.esfera.y }, holdMs: 300,
                    arrastre: { dx: dx, dy: dy, durMs: 1000, soltarEnDestino: true },
                    onDuranteArrastre: function () {
                        self.tweens.add({ targets: self.esfera, x: vaca.cont.x, y: vaca.cont.y, duration: 1000, ease: 'Sine.easeInOut' });
                    }
                });
                this.esfera.setVisible(false);
                Ut.estallido(this, vaca.cont.x, vaca.cont.y, { n: 12, tex: 'chispa', tam: 24, dist: 100, colores: [0x63e6be, 0xffffff] });
            } else {
                await ctx.mano({ punto: { x: vaca.cont.x, y: vaca.cont.y }, holdMs: 450 });
            }
            if (!ctx.vivo()) return limpiar();
            this.escuchar(d.sonido, { breve: true });
            efecto(this, 'recompensa');
            Ut.estallido(this, vaca.cont.x, vaca.cont.y - L.tam * 0.2, { n: 14, tex: 'estrella', tam: 28, dist: 150, sinTinte: true });
            await vaca.acierto();
            await ctx.decir({ voz: 'zoe', texto: t.demostracionAcierto || '¡Así se hace!' }, { estado: 'acierto', minMs: 1500 });
            await ctx.decir({ voz: 'zoe', texto: t.demostracionFin || '¡Ahora te toca a ti!' }, { minMs: 1100 });
            limpiar();
            await esperar(this, 500);
        },

        /* ── Fiesta final: todos los objetos salen a la vez y celebran ── */

        fiestaFinal: async function () {
            var self = this;
            var L = this.L;
            this.fase = 'fin';
            this.pista.parar();
            await this.esconderTodo();
            efecto(this, 'victoria');
            Ut.confeti(this, 110);
            var ids = (this.reto.opciones || []).slice();
            ids.forEach(function (id, i) {
                if (i >= L.spots.length) return;
                var p = self.asomar(id, i, { ms: 60000 });
                self.time.delayedCall(500 + i * 180, function () { if (p.actor.cont.active) p.actor.saltito(0.16, 3); });
            });
            if (this.cinco) {
                this.dibujarTubos();
                [0, 1, 2, 3].forEach(function (i) {
                    var b = self.bocaTubo(i);
                    self.time.delayedCall(i * 220, function () { Ut.estallido(self, b.x, b.y, { n: 12, tex: 'burbuja', tam: 20, dist: 90, angulo: -Math.PI / 2, abanico: 1.6, sinTinte: true, ms: 1200 }); });
                });
            } else {
                (this.fotos || []).forEach(function (f, i) { self.time.delayedCall(i * 200, function () { f.saltito(0.2, 2); }); });
            }
            if (this.pres) this.pres.clip('Bailar');
            await esperar(this, 2800);
            if (global.AsociaPj3D && global.AsociaPj3D.capa) global.AsociaPj3D.capa(false);
        },

        estado: function () {
            return {
                fase: this.fase,
                nivel: this.nivelActual,
                objetivo: this.objetivo,
                cuenta: this.cuenta,
                atrapados: this.atrapados || 0,
                hechos: this.hechos,
                errores: this.errores,
                sonando: !!this.sonando,
                arriba: (this.pops || []).filter(function (p) { return p.estado === 'arriba' || p.estado === 'sube'; }).map(function (p) { return { id: p.actor.id, x: p.actor.cont.x, y: p.actor.cont.y }; })
            };
        },

        /* ── Cuadro a cuadro ──────────────────────────────────── */

        update: function (time, delta) {
            (this.ambiente || []).forEach(function (f) { f(time, delta); });
            if (this.vidaPaso) this.vidaPaso(time, delta);
            if (!this.pres) this.montarPresentador();
            else this.pres.visible(!(this.ctx.enDemo && this.ctx.enDemo()));
            (this.pops || []).forEach(function (p) { if (p.actor.cont.active) p.actor.actualizar(time, delta); });
            (this.fotos || []).forEach(function (f) { f.actualizar(time, delta); });
            this.repartirSalidas(time);
            var b = this.boton();
            if (this.sonando) {
                b.setScale(1 + Math.abs(Math.sin(time / 110)) * 0.08);
                if (time > (this.ultAnillo || 0)) {
                    this.ultAnillo = time + 260;
                    Act.efectos.anillos(this, b.x, b.y, { r: (this.cinco ? this.L.oreja.r : this.L.bocina.r) * 0.9, n: 1, escala: 2.4, ms: 800, color: this.cinco ? 0x63e6be : 0xffd43b, depth: 29 });
                }
            }
            if (this.cinco) {
                this.dibujarPantalla(time);
                if (this.esfera.visible) {
                    this.esfera.halo.setScale(1 + Math.sin(time / 200) * 0.12);
                    var g = this.esferaOnda;
                    g.clear();
                    g.lineStyle(2, 0xe6fcf5, 0.9);
                    g.beginPath();
                    for (var i = 0; i <= 20; i++) {
                        var x = -16 + i * 1.6;
                        var y = Math.sin(i * 0.9 + time / 90) * 6 * Math.sin(i / 20 * Math.PI);
                        if (i) g.lineTo(x, y); else g.moveTo(x, y);
                    }
                    g.strokePath();
                }
            }
        },

        /** Al rotar o cambiar el tamaño: se recalcula todo; lo que estaba asomado se esconde. */
        reubicar: function () {
            this.calcularLayout();
            var L = this.L;
            this.fondoG.clear();
            this.pintarFondo();
            (this.utileria || []).forEach(function (u) { u.destroy(); });
            montarUtileria(this);
            this.montarVida();
            this.ubicarPresentador();
            (this.pops || []).slice().forEach(function (p) { p.actor.destruir(); });
            this.pops = [];
            if (this.cinco) {
                this.maquina.setPosition(L.mx, L.my).setDisplaySize(L.mw, L.mh / 0.92);
                this.oreja.setPosition(L.oreja.x, L.oreja.y);
                if (!this.arr.cont && this.esfera.visible) this.esfera.setPosition(L.nido.x, L.nido.y);
                this.montarPedestales();
                this.dibujarLab();
            } else {
                this.bocina.setPosition(L.bocina.x, L.bocina.y);
                var self = this;
                this.marcos.forEach(function (m, i) {
                    m.x = L.marcos[i];
                    if (m.mini) m.mini.cont.x = m.x;
                    m.estrellas.forEach(function (e, k) { e.x = m.x + (k - 1) * 15; });
                });
                this.dibujarCuerda();
                this.marcos.forEach(function (m) {
                    if (m.mini) m.mini.cont.y = m.y + L.marco * 0.44;
                    m.estrellas.forEach(function (e) { e.y = m.y + L.marco * 1.05; });
                });
                if (this.mundo) { if (this.mundo.reubicar) this.mundo.reubicar(this); } else this.montarEscondites();
                void self;
            }
        }
    };

    B.crearMotor({ id: 'asocia', fondo: '#a5d8ff', escena: escena });
})(typeof window !== 'undefined' ? window : this);
