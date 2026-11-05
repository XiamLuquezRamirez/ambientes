/**
 * PedniaExpedicion — "La expedición" (Misión final: ¿dónde está?, 5-6 años) en Phaser 4.2.1.
 *
 * El documento: el escenario más complejo, 5 elementos en distintas posiciones, sin pistas
 * escritas; ESCUCHAR – IDENTIFICAR – BUSCAR – LOCALIZAR – TOCAR. Cada región es más ancha
 * que la pantalla: se arrastra el paisaje (o se tocan las flechas) para mirar a los lados.
 * El sonido sale del lado donde está la cosa, aunque todavía no se vea.
 *   selva    → 1,6 pantallas de ancho.
 *   desierto → 1,9 pantallas.
 *   cueva    → 2,1 pantallas, en penumbra.
 *   cima     → 2,4 pantallas y una cosa más.
 * Premio propio de este juego: el mapa de la expedición marca cada parada con lo
 * encontrado; al final se abre un cofre con la insignia de explorador.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, marcarMapa, pista, resaltar,
 *      demo, limpiarDemo, rectDe, panDe, fiestaFinal, estado, destruir.
 */
(function (global) {
    'use strict';

    var Phaser = global.Phaser;
    var Host = null;
    var gameConfig = null;
    var callbacks = {};
    var game = null;
    var sceneRef = null;
    var readyPromise = null;
    var readyResolve = null;

    var FIESTA = [0xff6b6b, 0xfcc419, 0x51cf66, 0x339af0, 0xcc5de8, 0xff922b];
    var REGIONES = {
        selva: { ancho: 1.6, cielo: [0x63e6be, 0xc3fae8], suelo: 0x2f9e44, base: 0x37b24d, penumbra: 0 },
        desierto: { ancho: 1.9, cielo: [0x74c0fc, 0xfff3bf], suelo: 0xfcc419, base: 0xffd43b, penumbra: 0 },
        cueva: { ancho: 2.1, cielo: [0x343a40, 0x495057], suelo: 0x5c4033, base: 0x6f4e37, penumbra: 0.3 },
        cima: { ancho: 2.4, cielo: [0x4c6ef5, 0xdbe4ff], suelo: 0xf1f3f5, base: 0xe9ecef, penumbra: 0 }
    };
    var ORDEN = ['selva', 'desierto', 'cueva', 'cima'];

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'expedicion:' + id;
    }

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function sfx(nombre) {
        if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.sonar(nombre);
    }

    function avisar(nombre) {
        var fn = callbacks && callbacks[nombre];
        if (typeof fn !== 'function') return undefined;
        try {
            return fn.apply(null, Array.prototype.slice.call(arguments, 1));
        } catch (e) { return undefined; }
    }

    function puedeTocar() {
        var r = avisar('puedeTocar');
        return r === undefined ? true : !!r;
    }

    function rnd(a, b) {
        return a + Math.random() * (b - a);
    }

    function mezclar(lista) {
        var out = lista.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    function esperar(scene, ms) {
        return new Promise(function (r) { scene.time.delayedCall(ms, r); });
    }

    function esperarEscena() {
        if (sceneRef) return Promise.resolve(sceneRef);
        return readyPromise || Promise.reject(new Error('Phaser no montado'));
    }

    function mezclarColor(a, b, t) {
        var c = Phaser.Display.Color.Interpolate.ColorWithColor(
            Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, Math.round(t * 100));
        return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    }

    function inyectarEstilo() {
        var doc = global.document;
        if (doc.getElementById('expedicion-css')) return;
        var css = doc.createElement('style');
        css.id = 'expedicion-css';
        css.textContent = [
            '#expedicion-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#expedicion-canvas canvas{display:block;width:100% !important;height:100% !important;cursor:grab}',
            'body.modo-expedicion{background:#63e6be !important}',
            'body.modo-expedicion #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-expedicion #principal button,body.modo-expedicion .dialogo{pointer-events:auto}',
            'body.modo-expedicion .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-expedicion .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-expedicion .parque-fondo,body.modo-expedicion #zonas,body.modo-expedicion #elementos{display:none !important}',
            'body.modo-expedicion .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(20vh,160px)}',
            'body.modo-expedicion .pj-zoe{left:6px}',
            'body.modo-expedicion .pj-zeus{right:6px}',
            'body.modo-expedicion .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaExpedicion = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaExpedicion() {
            Phaser.Scene.call(this, { key: 'EscenaExpedicion' });
            this.cosas = {};
            this.pedestales = [];
            this.region = 'selva';
            this.objetivo = null;
            this.jugando = false;
            this.ronda = 0;
            this.demoObj = null;
            this.mundoW = 1;
            this.paradas = [];
            this.arrastre = null;
        },

        create: function () {
            this.cielo = this.add.graphics().setDepth(-30).setScrollFactor(0);
            // Capa lejana: se mueve más lento al arrastrar (da profundidad).
            this.lejos = this.add.graphics().setDepth(-25).setScrollFactor(0.45);
            this.fondo = this.add.graphics().setDepth(-20);
            this.sueloG = this.add.graphics().setDepth(-19);
            // Vida del lugar (en la pantalla): mariposas, luciérnagas, nieve…
            this.ambiente = this.add.graphics().setDepth(26).setScrollFactor(0);
            this.copos = [];
            this.frente = this.add.graphics().setDepth(20);
            this.penumbra = this.add.rectangle(0, 0, 10, 10, 0x000000, 0).setOrigin(0).setDepth(25).setScrollFactor(0);
            // Flechas para mirar a los lados (fijas en la pantalla).
            this.flechas = [-1, 1].map(function (dir) {
                var c = this.add.container(0, 0).setDepth(40).setScrollFactor(0);
                c.add(this.add.circle(0, 0, 34, 0xffffff, 0.85));
                c.add(this.add.triangle(dir * 4, 0, 0, -16, 0, 16, dir * 22, 0, 0x1971c2).setOrigin(0.5));
                c.dir = dir;
                return c;
            }, this);
            this.mapa = this.add.container(0, 0).setDepth(60).setScrollFactor(0).setVisible(false);
            this.ubicarFijos();
            var scene = this;
            this.scale.on('resize', function () { scene.ubicarFijos(); scene.dibujarRegion(); scene.reubicar(); });
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.input.on('pointerdown', this.alBajar, this);
            this.input.on('pointermove', this.alMover, this);
            this.input.on('pointerup', this.alSoltar, this);
        },

        shutdown: function () {
            this.tweens.killAll();
            if (sceneRef === this) sceneRef = null;
        },

        ubicarFijos: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            this.flechas[0].setPosition(46, h * 0.5);
            this.flechas[1].setPosition(w - 46, h * 0.5);
            this.penumbra.setSize(w, h);
        },

        suelo: function () { return this.scale.height * 0.86; },

        /* ── Región: paisaje ancho que se recorre arrastrando ──────── */

        dibujarRegion: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var R = REGIONES[this.region];
            var W = Math.round(w * R.ancho);
            this.mundoW = W;
            this.cameras.main.setBounds(0, 0, W, h);
            var s = this.suelo();
            var c = this.cielo;
            c.clear();
            for (var b = 0; b < 16; b++) {
                c.fillStyle(mezclarColor(R.cielo[0], R.cielo[1], b / 15), 1);
                c.fillRect(0, (h / 16) * b - 1, w, h / 16 + 2);
            }
            var g = this.fondo;
            g.clear();
            var L = this.lejos;
            L.clear();
            var f = this.frente;
            f.clear();
            var k;
            // Número pseudoaleatorio fijo por posición (el paisaje no cambia al redibujar).
            function az(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
            function nube(x, y, e, col, a) {
                L.fillStyle(col, a);
                L.fillCircle(x - 30 * e, y + 8 * e, 22 * e);
                L.fillCircle(x, y - 6 * e, 32 * e);
                L.fillCircle(x + 32 * e, y + 8 * e, 21 * e);
            }

            if (this.region === 'selva') {
                // Colinas lejanas con bruma y rayos de luz.
                L.fillStyle(0x96f2d7, 1);
                for (k = 0; k < W; k += 260) L.fillEllipse(k + 130, s - h * 0.36, 420, h * 0.36);
                L.fillStyle(0x63e6be, 1);
                for (k = 100; k < W; k += 300) L.fillEllipse(k, s - h * 0.2, 380, h * 0.3);
                g.fillStyle(0xfff9db, 0.18);
                for (k = 0; k < W; k += 520) g.fillTriangle(k + 120, 0, k + 220, 0, k + 360, s);
                // Árboles del fondo, de copas variadas.
                for (k = 0; k < W; k += 150) {
                    var tx = k + 40 + az(k) * 60;
                    var th = h * (0.4 + az(k + 1) * 0.2);
                    g.fillStyle(0x6f4e37, 1);
                    g.fillRect(tx - 10, s - th, 20, th);
                    var verdes = [0x2b8a3e, 0x2f9e44, 0x37b24d];
                    for (var q = 0; q < 5; q++) {
                        g.fillStyle(verdes[(q + k / 150) % 3 | 0], 1);
                        g.fillCircle(tx + (az(k + q * 3) - 0.5) * 120, s - th - (az(k + q * 5) - 0.3) * 60, 40 + az(k + q) * 34);
                    }
                }
                // Lianas colgando con hojitas.
                for (k = 80; k < W; k += 210) {
                    var largo = h * (0.25 + az(k + 7) * 0.2);
                    g.lineStyle(3, 0x2b8a3e, 1);
                    g.beginPath();
                    g.moveTo(k, 0);
                    for (var y = 0; y <= largo; y += 10) g.lineTo(k + Math.sin(y / 30 + k) * 8, y);
                    g.strokePath();
                    g.fillStyle(0x51cf66, 1);
                    for (var hj = 20; hj < largo; hj += 26) g.fillEllipse(k + Math.sin(hj / 30 + k) * 8 + (hj % 52 ? 8 : -8), hj, 14, 7);
                }
                // Helechos y flores del suelo (delante).
                for (k = 0; k < W; k += 90) {
                    var fx = k + az(k + 3) * 50;
                    f.fillStyle(0x2f9e44, 1);
                    for (var hoja = -2; hoja <= 2; hoja++) f.fillEllipse(fx + hoja * 12, h - h * 0.05 - Math.abs(hoja) * 4, 14, h * 0.09);
                    if (az(k + 9) > 0.5) {
                        f.fillStyle(0xff6b6b, 1);
                        for (var pe = 0; pe < 5; pe++) f.fillCircle(fx + 30 + Math.cos(pe * 1.26) * 7, h - h * 0.1 + Math.sin(pe * 1.26) * 7, 6);
                        f.fillStyle(0xfcc419, 1);
                        f.fillCircle(fx + 30, h - h * 0.1, 4);
                    }
                }
            } else if (this.region === 'desierto') {
                nube(W * 0.2, h * 0.16, 0.8, 0xffffff, 0.7);
                nube(W * 0.7, h * 0.12, 0.9, 0xffffff, 0.7);
                L.fillStyle(0xfff3bf, 0.5);
                L.fillCircle(W * 0.5, h * 0.18, h * 0.12);
                L.fillStyle(0xfff3bf, 1);
                L.fillCircle(W * 0.5, h * 0.18, h * 0.08);
                // Dunas lejanas en capas.
                L.fillStyle(0xffec99, 1);
                for (k = 0; k < W; k += 420) L.fillEllipse(k + 210, s - h * 0.2, 640, h * 0.3);
                L.fillStyle(0xffe8a1, 1);
                for (k = 0; k < W; k += 360) L.fillEllipse(k + 180, s - h * 0.12, 560, h * 0.3);
                // Pirámide de bloques.
                var pxc = W * 0.42;
                var pb = h * 0.5;
                for (var fila = 0; fila < 7; fila++) {
                    var ancho = pb * (1 - fila / 7);
                    var yb = s - h * 0.06 - fila * h * 0.055;
                    L.fillStyle(fila % 2 ? 0xf08c00 : 0xf59f00, 1);
                    L.fillRect(pxc - ancho / 2, yb - h * 0.055, ancho, h * 0.055);
                    L.fillStyle(0xe8590c, 0.5);
                    L.fillRect(pxc, yb - h * 0.055, ancho / 2, h * 0.055);
                }
                L.fillStyle(0x5c3d1e, 1);
                L.fillRoundedRect(pxc - h * 0.03, s - h * 0.06 - h * 0.08, h * 0.06, h * 0.08, { tl: 10, tr: 10, bl: 0, br: 0 });
                // Oasis con palmera.
                var ox = W * 0.78;
                g.fillStyle(0x339af0, 1);
                g.fillEllipse(ox, s - h * 0.01, h * 0.34, h * 0.05);
                g.fillStyle(0x74c0fc, 1);
                g.fillEllipse(ox - h * 0.03, s - h * 0.015, h * 0.16, h * 0.02);
                g.fillStyle(0x8d5524, 1);
                g.fillRect(ox + h * 0.08, s - h * 0.3, 10, h * 0.3);
                g.fillStyle(0x2f9e44, 1);
                [-1, 1].forEach(function (d) {
                    g.fillEllipse(ox + h * 0.08 + d * 34, s - h * 0.31, 80, 18);
                    g.fillEllipse(ox + h * 0.08 + d * 22, s - h * 0.34, 60, 16);
                });
                // Cactus con flor y piedras.
                for (k = 120; k < W; k += 330) {
                    if (Math.abs(k - pxc) < pb * 0.6 || Math.abs(k - ox) < h * 0.25) continue;
                    var ch = h * (0.16 + az(k) * 0.08);
                    g.fillStyle(0x2b8a3e, 1);
                    g.fillRoundedRect(k, s - ch, 26, ch, 13);
                    g.fillRoundedRect(k - 22, s - ch * 0.7, 22, 14, 7);
                    g.fillRoundedRect(k - 22, s - ch * 0.95, 14, ch * 0.32, 7);
                    g.fillRoundedRect(k + 26, s - ch * 0.55, 22, 14, 7);
                    g.fillRoundedRect(k + 34, s - ch * 0.78, 14, ch * 0.3, 7);
                    g.fillStyle(0xf783ac, 1);
                    g.fillCircle(k + 13, s - ch - 4, 7);
                }
                for (k = 60; k < W; k += 230) {
                    f.fillStyle(0xd9a066, 1);
                    f.fillEllipse(k + az(k) * 60, h - h * 0.05, 46, 22);
                    f.fillStyle(0xe9c46a, 1);
                    f.fillEllipse(k + az(k) * 60 - 6, h - h * 0.058, 22, 8);
                }
            } else if (this.region === 'cueva') {
                // Paredes de roca en capas.
                L.fillStyle(0x3d2b1f, 1);
                L.fillRect(0, 0, W, s);
                for (k = 0; k < 7; k++) {
                    L.fillStyle(k % 2 ? 0x4a3527 : 0x452f22, 1);
                    for (var rx = 0; rx < W; rx += 140) L.fillEllipse(rx + az(rx + k) * 80, h * (0.12 + k * 0.1), 180, h * 0.08);
                }
                // Estalactitas.
                for (k = 0; k < W; k += 70) {
                    var la = h * (0.06 + az(k) * 0.14);
                    g.fillStyle(0x6f4e37, 1);
                    g.fillTriangle(k, 0, k + 46, 0, k + 23, la);
                    g.fillStyle(0x8d6748, 1);
                    g.fillTriangle(k + 8, 0, k + 23, 0, k + 23, la * 0.9);
                }
                // Cristales que brillan y hongos luminosos.
                var cristal = [0x74c0fc, 0xb197fc, 0x63e6be, 0xf783ac];
                for (k = 40; k < W; k += 190) {
                    var col = cristal[(k / 190 | 0) % cristal.length];
                    g.fillStyle(col, 0.18);
                    g.fillCircle(k + 27, s - h * 0.06, h * 0.09);
                    g.fillStyle(col, 0.95);
                    g.fillTriangle(k, s, k + 18, s - h * 0.13, k + 36, s);
                    g.fillTriangle(k + 24, s, k + 40, s - h * 0.09, k + 54, s);
                    g.fillStyle(0xffffff, 0.5);
                    g.fillTriangle(k + 8, s - 4, k + 18, s - h * 0.12, k + 16, s - 4);
                }
                for (k = 130; k < W; k += 260) {
                    f.fillStyle(0xe9ecef, 1);
                    f.fillRect(k - 3, h - h * 0.08, 6, h * 0.05);
                    f.fillStyle(0x63e6be, 1);
                    f.fillEllipse(k, h - h * 0.08, 30, 16);
                    f.fillStyle(0x63e6be, 0.2);
                    f.fillCircle(k, h - h * 0.08, 30);
                }
                // Charquitos.
                g.fillStyle(0x1864ab, 0.8);
                for (k = 300; k < W; k += 600) g.fillEllipse(k, s + h * 0.04, 140, 18);
            } else {
                nube(W * 0.15, h * 0.2, 0.9, 0xffffff, 0.85);
                nube(W * 0.55, h * 0.12, 1.1, 0xffffff, 0.85);
                nube(W * 0.85, h * 0.22, 0.8, 0xffffff, 0.85);
                // Cordillera nevada en dos capas.
                for (k = -200; k < W; k += 420) {
                    L.fillStyle(0x748ffc, 1);
                    L.fillTriangle(k, s, k + 230, s - h * (0.45 + az(k) * 0.15), k + 460, s);
                    L.fillStyle(0x5c7cfa, 1);
                    L.fillTriangle(k + 230, s - h * (0.45 + az(k) * 0.15), k + 460, s, k + 260, s);
                    L.fillStyle(0xffffff, 1);
                    var cimaY = s - h * (0.45 + az(k) * 0.15);
                    L.fillTriangle(k + 175, cimaY + h * 0.11, k + 230, cimaY, k + 285, cimaY + h * 0.11);
                }
                for (k = 0; k < W; k += 300) {
                    g.fillStyle(0x91a7ff, 1);
                    g.fillTriangle(k, s, k + 150, s - h * 0.28, k + 300, s);
                    g.fillStyle(0xedf2ff, 1);
                    g.fillTriangle(k + 115, s - h * 0.2, k + 150, s - h * 0.28, k + 185, s - h * 0.2);
                }
                // Banderines de la cumbre.
                var bx0 = W * 0.6;
                g.lineStyle(2, 0x495057, 1);
                g.lineBetween(bx0, s - h * 0.42, bx0 + 240, s - h * 0.3);
                for (var bd = 0; bd < 9; bd++) {
                    g.fillStyle(FIESTA[bd % FIESTA.length], 1);
                    var bxx = bx0 + bd * 26;
                    var byy = s - h * 0.42 + bd * (h * 0.12 / 9);
                    g.fillTriangle(bxx, byy, bxx + 18, byy + 2, bxx + 8, byy + 20);
                }
                // Pinos nevados.
                for (k = 80; k < W; k += 230) {
                    var pt = h * (0.16 + az(k) * 0.08);
                    var pxx = k + az(k + 2) * 60;
                    g.fillStyle(0x6f4e37, 1);
                    g.fillRect(pxx - 4, s - h * 0.03, 8, h * 0.03);
                    for (var n = 0; n < 3; n++) {
                        var ancho2 = 34 - n * 8;
                        var yy = s - h * 0.03 - n * pt * 0.28;
                        g.fillStyle(0x2b8a3e, 1);
                        g.fillTriangle(pxx - ancho2, yy, pxx + ancho2, yy, pxx, yy - pt * 0.45);
                        g.fillStyle(0xffffff, 0.95);
                        g.fillTriangle(pxx - ancho2 * 0.45, yy - pt * 0.25, pxx + ancho2 * 0.45, yy - pt * 0.25, pxx, yy - pt * 0.45);
                    }
                }
                for (k = 0; k < W; k += 200) {
                    f.fillStyle(0xffffff, 1);
                    f.fillEllipse(k + az(k) * 80, h - h * 0.05, 120, 30);
                }
            }
            g.fillStyle(R.suelo, 1);
            g.fillRect(0, s, W, h - s);
            g.fillStyle(R.base, 1);
            g.fillRect(0, s, W, 8);
            this.dibujarSuelo(W, s, az);
            this.penumbra.fillAlpha = R.penumbra;
            this.copos = [];
        },

        /** Textura del suelo: pasto, arena con ondas, roca con guijarros o nieve que brilla. */
        dibujarSuelo: function (W, s, az) {
            var h = this.scale.height;
            var g = this.sueloG;
            g.clear();
            var k;
            if (this.region === 'selva') {
                for (k = 0; k < W; k += 34) {
                    var x = k + az(k) * 20;
                    var y = s + 12 + az(k + 1) * (h - s - 24);
                    g.fillStyle(az(k + 2) > 0.5 ? 0x2b8a3e : 0x37b24d, 1);
                    g.fillTriangle(x - 6, y, x + 6, y, x - 2, y - 14);
                    g.fillTriangle(x, y, x + 10, y, x + 6, y - 11);
                }
                for (k = 20; k < W; k += 160) {
                    g.fillStyle(0xf8f9fa, 1);
                    g.fillRect(k - 2, s + 14, 4, 10);
                    g.fillStyle(0xe03131, 1);
                    g.fillEllipse(k, s + 14, 20, 12);
                    g.fillStyle(0xffffff, 1);
                    g.fillCircle(k - 4, s + 12, 2);
                    g.fillCircle(k + 4, s + 13, 2);
                }
            } else if (this.region === 'desierto') {
                g.lineStyle(2, 0xf59f00, 0.6);
                for (var fila = 0; fila < 4; fila++) {
                    var yy = s + 14 + fila * (h - s) / 4.5;
                    g.beginPath();
                    g.moveTo(0, yy);
                    for (k = 0; k <= W; k += 30) g.lineTo(k, yy + Math.sin(k / 50 + fila) * 4);
                    g.strokePath();
                }
                for (k = 40; k < W; k += 120) {
                    g.fillStyle(0xc08a4d, 1);
                    g.fillEllipse(k + az(k) * 60, s + 10 + az(k + 3) * (h - s - 20), 14, 8);
                }
            } else if (this.region === 'cueva') {
                for (k = 0; k < W; k += 60) {
                    g.fillStyle(az(k) > 0.5 ? 0x6f4e37 : 0x7d5a43, 1);
                    g.fillEllipse(k + az(k + 1) * 30, s + 10 + az(k + 2) * (h - s - 20), 18 + az(k + 3) * 16, 10);
                }
            } else {
                for (k = 0; k < W; k += 140) {
                    g.fillStyle(0xe7f5ff, 1);
                    g.fillEllipse(k + az(k) * 60, s + 18, 160, 22);
                }
                for (k = 0; k < W; k += 45) {
                    g.fillStyle(0xffffff, 1);
                    g.fillCircle(k + az(k) * 30, s + 8 + az(k + 1) * (h - s - 16), 2);
                }
            }
        },

        /* ── Cosas sobre pedestales naturales ─────────────────────── */

        tamCosa: function () {
            return Math.min(this.scale.height * 0.18, this.scale.width * 0.12, 150);
        },

        crearCosa: function (id) {
            if (this.cosas[id]) return this.cosas[id];
            var img = this.add.image(-500, 0, tex(id)).setOrigin(0.5, 1).setDepth(5);
            var c = { id: id, img: img, x: -500, y: 0, esc: 1, size: 100, ancho: 100, resaltada: false, fase: Math.random() * 6 };
            this.cosas[id] = c;
            this.medir(c);
            return c;
        },

        medir: function (c) {
            var t = this.tamCosa();
            c.esc = Math.min(t / (c.img.width || 1), t / (c.img.height || 1));
            c.img.setScale(c.esc);
            c.size = c.img.height * c.esc;
            c.ancho = c.img.width * c.esc;
        },

        /** Pedestal según la región: roca, tocón, duna, estalagmita, montículo de nieve. */
        pedestal: function (x, y) {
            var g = this.add.graphics().setDepth(4);
            var t = this.tamCosa();
            var abajo = this.suelo() + 4;
            var alto = abajo - y;
            if (this.region === 'selva') {
                // Tocón con corteza y anillos arriba.
                g.fillStyle(0x8d5524, 1);
                g.fillRect(x - t * 0.42, y, t * 0.84, alto);
                g.fillStyle(0x6f3f1a, 1);
                for (var v = -2; v <= 2; v++) g.fillRect(x + v * t * 0.16 - 2, y + 6, 4, alto - 8);
                g.fillStyle(0xd9a066, 1);
                g.fillEllipse(x, y, t * 0.84, t * 0.22);
                g.lineStyle(2, 0xa9713c, 1);
                g.strokeEllipse(x, y, t * 0.56, t * 0.14);
                g.strokeEllipse(x, y, t * 0.28, t * 0.07);
                g.fillStyle(0x2f9e44, 1);
                g.fillEllipse(x - t * 0.42, y + alto * 0.5, 16, 10);
            } else if (this.region === 'desierto') {
                // Roca de arenisca en capas.
                g.fillStyle(0xd9480f, 1);
                g.fillRoundedRect(x - t * 0.5, y, t, alto, { tl: t * 0.25, tr: t * 0.15, bl: 0, br: 0 });
                g.fillStyle(0xe8590c, 1);
                for (var c = 1; c < 4; c++) g.fillRect(x - t * 0.5, y + alto * c / 4, t, 4);
                g.fillStyle(0xff922b, 1);
                g.fillRoundedRect(x - t * 0.46, y + 2, t * 0.5, alto * 0.2, 10);
            } else if (this.region === 'cueva') {
                // Estalagmita ancha con punta cortada y un cristal.
                g.fillStyle(0x868e96, 1);
                g.fillTriangle(x - t * 0.55, abajo, x + t * 0.55, abajo, x + t * 0.38, y);
                g.fillTriangle(x - t * 0.55, abajo, x - t * 0.38, y, x + t * 0.38, y);
                g.fillStyle(0xadb5bd, 1);
                g.fillTriangle(x - t * 0.38, y, x - t * 0.1, y, x - t * 0.45, abajo);
                g.fillStyle(0x74c0fc, 0.9);
                g.fillTriangle(x + t * 0.3, abajo, x + t * 0.42, abajo - t * 0.3, x + t * 0.52, abajo);
            } else {
                // Bloque de hielo con brillo y nieve encima.
                g.fillStyle(0xa5d8ff, 0.95);
                g.fillRoundedRect(x - t * 0.48, y, t * 0.96, alto, 10);
                g.fillStyle(0xe7f5ff, 0.9);
                g.fillTriangle(x - t * 0.36, y + 8, x - t * 0.2, y + 8, x - t * 0.36, y + alto * 0.6);
                g.fillStyle(0xffffff, 1);
                g.fillEllipse(x, y + 2, t, t * 0.2);
            }
            g.fillStyle(0x000000, 0.12);
            g.fillEllipse(x, abajo, t * 1.1, 12);
            this.pedestales.push(g);
        },

        /** Reparte las cosas a lo ancho del mundo, a distintas alturas. */
        lugares: function (n) {
            var W = this.mundoW;
            var h = this.scale.height;
            var s = this.suelo();
            var margen = this.scale.width * 0.12;
            var paso = (W - margen * 2) / n;
            var out = [];
            for (var i = 0; i < n; i++) {
                var x = margen + paso * (i + 0.5) + rnd(-paso * 0.2, paso * 0.2);
                var alto = [0, 0.12, 0.24, 0.06, 0.18][i % 5];
                out.push({ x: x, y: s - h * alto });
            }
            return mezclar(out);
        },

        reubicar: function () {
            var scene = this;
            Object.keys(this.cosas).forEach(function (id) { scene.medir(scene.cosas[id]); });
        },

        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.region = o.modo || ORDEN[(o.ronda || 0) % ORDEN.length];
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            this.dibujarRegion();
            this.pedestales.forEach(function (p) { p.destroy(); });
            this.pedestales = [];
            Object.keys(this.cosas).forEach(function (id) { scene.cosas[id].img.setVisible(false); });
            var lug = this.lugares(o.elementos.length);
            // Desde la segunda región el objetivo empieza fuera de la vista: hay que buscarlo.
            var iObj = o.elementos.indexOf(o.objetivo);
            if (this.ronda > 0 && iObj !== -1 && lug[iObj].x < this.scale.width) {
                var j = lug.reduce(function (m, p, k) { return p.x > lug[m].x ? k : m; }, 0);
                var tmp = lug[iObj]; lug[iObj] = lug[j]; lug[j] = tmp;
            }
            o.elementos.forEach(function (id, i) {
                var c = scene.crearCosa(id);
                scene.medir(c);
                c.x = lug[i].x;
                c.y = lug[i].y;
                c.img.setVisible(true).setAlpha(1).setPosition(c.x, c.y);
                c.img.angle = 0;
                c.resaltada = false;
                if (c.y < scene.suelo() - 2) scene.pedestal(c.x, c.y);
            });
            this.cameras.main.setScroll(0, 0);
            return this.mostrarMapa(this.ronda, 1400);
        },

        jugar: function () {
            this.jugando = true;
        },

        pausar: function () {
            this.jugando = false;
        },

        update: function (time, delta) {
            var scene = this;
            var cam = this.cameras.main;
            this.animarAmbiente(time, Math.min(delta || 16, 50) / 1000);
            this.flechas[0].setVisible(this.jugando && cam.scrollX > 4);
            this.flechas[1].setVisible(this.jugando && cam.scrollX < this.mundoW - this.scale.width - 4);
            this.flechas.forEach(function (f, i) { f.x = (i ? scene.scale.width - 46 : 46) + Math.sin(time / 300) * 4 * f.dir; });
            Object.keys(this.cosas).forEach(function (id) {
                var c = scene.cosas[id];
                if (!c.img.visible || c.celebrando) return;
                c.img.setAlpha(c.resaltada ? 0.6 + 0.4 * Math.sin(time / 140) : 1);
                if (!reducido()) c.img.angle = Math.sin(time / 700 + c.fase) * 2;
            });
        },

        /** Vida de cada región: mariposas y pájaros, rodadora y buitre, luciérnagas y murciélago, nieve. */
        animarAmbiente: function (time, dt) {
            var a = this.ambiente;
            a.clear();
            if (reducido()) return;
            var w = this.scale.width;
            var h = this.scale.height;
            var s = this.suelo();
            var t = time / 1000;
            var k;
            function pajaro(x, y, fase, col) {
                var ala = 6 + Math.sin(t * 8 + fase) * 5;
                a.lineStyle(3, col, 1);
                a.lineBetween(x - 11, y - ala, x, y);
                a.lineBetween(x, y, x + 11, y - ala);
            }
            if (this.region === 'selva') {
                [0xff8787, 0xffd43b, 0xb197fc].forEach(function (col, i) {
                    var x = w * (0.5 + 0.42 * Math.sin(t * 0.2 + i * 2.1));
                    var y = h * (0.42 + 0.12 * Math.sin(t * 0.7 + i));
                    var ab = 0.3 + 0.7 * Math.abs(Math.sin(t * 9 + i));
                    a.fillStyle(col, 1);
                    a.fillEllipse(x - 6 * ab, y, 12 * ab, 16);
                    a.fillEllipse(x + 6 * ab, y, 12 * ab, 16);
                    a.fillStyle(0x495057, 1);
                    a.fillRect(x - 1.5, y - 6, 3, 12);
                });
                for (k = 0; k < 2; k++) pajaro(((t * (40 + k * 15) + k * 400) % (w + 200)) - 100, h * (0.16 + k * 0.06), k, 0x2b8a3e);
            } else if (this.region === 'desierto') {
                // Rodadora que cruza rodando y un buitre planeando.
                var rx = ((t * 90) % (w + 300)) - 150;
                var ry = s - 24 - Math.abs(Math.sin(t * 3)) * 18;
                a.lineStyle(3, 0xa9713c, 1);
                for (k = 0; k < 6; k++) {
                    var an = t * 4 + k;
                    a.strokeCircle(rx + Math.cos(an) * 4, ry + Math.sin(an) * 4, 16 - k * 1.5);
                }
                var bx = w * 0.5 + Math.cos(t * 0.4) * w * 0.3;
                var by = h * 0.22 + Math.sin(t * 0.4) * h * 0.05;
                a.lineStyle(4, 0x495057, 1);
                a.lineBetween(bx - 22, by - 6, bx, by);
                a.lineBetween(bx, by, bx + 22, by - 6);
            } else if (this.region === 'cueva') {
                // Luciérnagas que brillan y un murciélago a ratos.
                for (k = 0; k < 10; k++) {
                    var fx = w * ((k * 0.13 + 0.05 + Math.sin(t * 0.3 + k) * 0.05) % 1);
                    var fy = h * (0.25 + 0.4 * ((k * 0.37) % 1)) + Math.sin(t * 1.3 + k * 2) * 20;
                    var luz = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7);
                    a.fillStyle(0xe9fac8, 0.18 * luz);
                    a.fillCircle(fx, fy, 22);
                    a.fillStyle(0xd8f5a2, 0.4 * luz);
                    a.fillCircle(fx, fy, 10);
                    a.fillStyle(0xfff3a0, 0.7 * luz + 0.3);
                    a.fillCircle(fx, fy, 4);
                }
                var ciclo = (t % 9) / 9;
                if (ciclo < 0.4) {
                    var mx = w * (ciclo / 0.4) * 1.2 - w * 0.1;
                    var my = h * 0.2 + Math.sin(t * 6) * 14;
                    var al = Math.sin(t * 18) * 10;
                    a.fillStyle(0x212529, 1);
                    a.fillEllipse(mx, my, 14, 10);
                    a.fillTriangle(mx - 4, my, mx - 26, my - al, mx - 18, my + 6);
                    a.fillTriangle(mx + 4, my, mx + 26, my - al, mx + 18, my + 6);
                }
            } else {
                // Nieve cayendo.
                while (this.copos.length < 70) this.copos.push({ x: Math.random(), y: Math.random(), v: 0.04 + Math.random() * 0.06, r: 1.5 + Math.random() * 2.5, f: Math.random() * 6 });
                a.fillStyle(0xffffff, 0.9);
                this.copos.forEach(function (c) {
                    c.y += c.v * dt;
                    if (c.y > 1) { c.y = 0; c.x = Math.random(); }
                    a.fillCircle(c.x * w + Math.sin(t + c.f) * 14, c.y * h, c.r);
                });
            }
        },

        /* ── Arrastrar para mirar; tocar para elegir ──────────────── */

        alBajar: function (p) {
            this.arrastre = { x: p.x, scroll: this.cameras.main.scrollX, movido: false };
        },

        alMover: function (p) {
            var a = this.arrastre;
            if (!a || !p.isDown || !this.jugando) return;
            var dx = p.x - a.x;
            if (Math.abs(dx) > 10) a.movido = true;
            if (a.movido) this.cameras.main.setScroll(Phaser.Math.Clamp(a.scroll - dx, 0, this.mundoW - this.scale.width), 0);
        },

        alSoltar: function (p) {
            var a = this.arrastre;
            this.arrastre = null;
            if (!a || a.movido || !this.jugando || !puedeTocar()) return;
            // ¿Flecha?
            for (var i = 0; i < this.flechas.length; i++) {
                var f = this.flechas[i];
                if (f.visible && Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < 44) {
                    this.mirarHacia(this.cameras.main.scrollX + f.dir * this.scale.width * 0.6);
                    return;
                }
            }
            var wx = p.x + this.cameras.main.scrollX;
            var wy = p.y;
            var scene = this;
            var lista = Object.keys(this.cosas).map(function (id) { return scene.cosas[id]; }).filter(function (c) { return c.img.visible; });
            for (var k = 0; k < lista.length; k++) {
                var c = lista[k];
                if (Math.abs(wx - c.x) < c.ancho / 2 + 12 && wy > c.y - c.size - 12 && wy < c.y + 12) {
                    this.responder(c);
                    return;
                }
            }
        },

        mirarHacia: function (scrollX) {
            var dest = Phaser.Math.Clamp(scrollX, 0, this.mundoW - this.scale.width);
            sfx('zas');
            this.tweens.add({ targets: this.cameras.main, scrollX: dest, duration: reducido() ? 1 : 500, ease: 'Sine.easeInOut' });
        },

        responder: function (c) {
            var scene = this;
            if (c.id === this.objetivo) {
                this.jugando = false;
                avisar('onAcierto', c.id);
                return;
            }
            this.ocupada = true;
            if (!reducido()) this.tweens.add({ targets: c.img, y: c.y - c.size * 0.15, duration: 140, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            avisar('onError', c.id, { pan: this.panDe(c.id) });
            this.time.delayedCall(1200, function () { scene.ocupada = false; });
        },

        cosaDe: function (id) {
            var c = this.cosas[id];
            return c && c.img.visible ? c : null;
        },

        /** Pista: la cámara gira un poco hacia el objetivo y este salta. */
        pista: function (id) {
            var c = this.cosaDe(id);
            if (!c) return;
            var cam = this.cameras.main;
            var centro = cam.scrollX + this.scale.width / 2;
            if (Math.abs(c.x - centro) > this.scale.width * 0.4) this.mirarHacia(cam.scrollX + Math.sign(c.x - centro) * this.scale.width * 0.4);
            if (!reducido()) this.tweens.add({ targets: c.img, y: c.y - c.size * 0.2, duration: 160, yoyo: true, repeat: 1, delay: 500 });
        },

        resaltar: function (id, si) {
            var c = this.cosaDe(id);
            if (c) c.resaltada = !!si;
        },

        /* ── Premio: el mapa de la expedición ────────────────────── */

        /** Documento: lo elegido se anima y suena otra vez (Zoe y Zeus celebran en el script). */
        celebrar: function (id) {
            var c = this.cosaDe(id) || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!c) return Promise.resolve();
            c.resaltada = false;
            c.celebrando = true;
            this.mirarHacia(c.x - this.scale.width / 2);
            this.chispas(c.x, c.y - c.size / 2, 20);
            if (!reducido()) {
                this.tweens.add({ targets: c.img, angle: 360, duration: 800, ease: 'Cubic.easeInOut' });
                this.tweens.add({ targets: c.img, y: c.y - c.size * 0.4, duration: 320, yoyo: true, ease: 'Quad.easeOut' });
            }
            return esperar(this, 1400).then(function () { c.celebrando = false; c.img.angle = 0; c.img.y = c.y; });
        },

        /** Mapa de pergamino con las 4 paradas; muestra la ruta hasta la parada k. */
        mostrarMapa: function (k, ms) {
            var scene = this;
            var w = this.scale.width;
            var h = this.scale.height;
            var m = this.mapa;
            m.removeAll(true);
            var mw = Math.min(w * 0.7, 640);
            var mh = Math.min(h * 0.5, 320);
            m.setPosition(w / 2, h * 0.5);
            var g = this.add.graphics();
            g.fillStyle(0xf3d9a4, 1);
            g.fillRoundedRect(-mw / 2, -mh / 2, mw, mh, 18);
            g.lineStyle(6, 0xc08a3e, 1);
            g.strokeRoundedRect(-mw / 2, -mh / 2, mw, mh, 18);
            var puntos = ORDEN.map(function (r, i) { return { x: -mw * 0.36 + i * mw * 0.24, y: (i % 2 ? -1 : 1) * mh * 0.12 }; });
            g.lineStyle(4, 0x8d5524, 0.8);
            for (var i = 0; i < puntos.length - 1; i++) {
                var a = puntos[i];
                var b = puntos[i + 1];
                for (var t = 0; t < 1; t += 0.12) g.lineBetween(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.x + (b.x - a.x) * (t + 0.06), a.y + (b.y - a.y) * (t + 0.06));
            }
            var colores = { selva: 0x2f9e44, desierto: 0xf59f00, cueva: 0x5c4033, cima: 0x4c6ef5 };
            puntos.forEach(function (p, i) {
                g.fillStyle(colores[ORDEN[i]], 1);
                g.fillCircle(p.x, p.y, mh * 0.09);
                g.lineStyle(3, 0xffffff, 1);
                g.strokeCircle(p.x, p.y, mh * 0.09);
            });
            m.add(g);
            // Sellos con lo encontrado en cada parada.
            this.paradas.forEach(function (id, i) {
                var p = puntos[i];
                var im = scene.add.image(p.x, p.y - mh * 0.2, tex(id));
                im.setScale(Math.min(mh * 0.22 / (im.width || 1), mh * 0.22 / (im.height || 1)));
                m.add(im);
                m.add(scene.add.star(p.x, p.y, 5, 6, 12, 0xfcc419));
            });
            // El explorador (una banderita) en la parada actual.
            var p0 = puntos[Math.min(k, puntos.length - 1)];
            var bandera = this.add.triangle(p0.x + 2, p0.y - mh * 0.16, 0, 0, mh * 0.12, mh * 0.05, 0, mh * 0.1, 0xe03131).setOrigin(0, 0);
            m.add(this.add.rectangle(p0.x, p0.y, 4, mh * 0.18, 0x495057).setOrigin(0.5, 1));
            m.add(bandera);
            this.puntosMapa = puntos;
            m.setVisible(true).setAlpha(0).setScale(0.8);
            sfx('magia');
            return new Promise(function (resolve) {
                scene.tweens.add({ targets: m, alpha: 1, scale: 1, duration: reducido() ? 1 : 300, ease: 'Back.easeOut' });
                scene.time.delayedCall(ms || 1400, function () {
                    scene.tweens.add({ targets: m, alpha: 0, duration: reducido() ? 1 : 300, onComplete: function () { m.setVisible(false); resolve(); } });
                });
            });
        },

        /** Lo encontrado queda sellado en el mapa (se ve el mapa con el sello nuevo). */
        marcarMapa: function (id) {
            this.paradas.push(id);
            var scene = this;
            sfx('ding');
            return this.mostrarMapa(this.paradas.length - 1, 1500).then(function () { void scene; });
        },

        /** Final: el mapa completo y un cofre que se abre con la insignia de explorador. */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            var w = this.scale.width;
            var h = this.scale.height;
            var s = this.suelo();
            var cw = Math.min(w * 0.2, 200);
            // A la izquierda del botón de escuchar (abajo al centro), no detrás de él.
            var cx = this.cameras.main.scrollX + w / 2 - Math.max(cw * 0.75 + 70, w * 0.16);
            var cofre = this.add.container(cx, s).setDepth(30);
            var caja = this.add.graphics();
            caja.fillStyle(0x8d5524, 1);
            caja.fillRoundedRect(-cw / 2, -cw * 0.55, cw, cw * 0.55, 10);
            caja.fillStyle(0xfcc419, 1);
            caja.fillRect(-cw / 2, -cw * 0.35, cw, 10);
            caja.fillRect(-8, -cw * 0.45, 16, 24);
            var tapa = this.add.graphics();
            tapa.fillStyle(0xa0522d, 1);
            // La tapa gira sobre su bisagra (borde de atrás, a la derecha).
            tapa.fillRoundedRect(-cw, -cw * 0.3, cw, cw * 0.3, { tl: cw * 0.15, tr: cw * 0.15, bl: 0, br: 0 });
            tapa.fillStyle(0xfcc419, 1);
            tapa.fillRect(-cw, -cw * 0.08, cw, 8);
            tapa.y = -cw * 0.55;
            tapa.x = cw / 2;
            cofre.add([caja, tapa]);
            cofre.setScale(0.01);
            var ins = this.textures.exists(tex('__insignia')) ? this.add.image(cx, s - cw * 0.6, tex('__insignia')).setDepth(29).setScale(0.01) : null;
            this.tweens.add({ targets: cofre, scale: 1, duration: reducido() ? 1 : 500, ease: 'Back.easeOut' });
            this.time.delayedCall(700, function () {
                sfx('magia');
                scene.tweens.add({ targets: tapa, angle: 75, duration: reducido() ? 1 : 450, ease: 'Back.easeOut' });
                scene.chispas(cx, s - cw * 0.6, 24);
                if (ins) {
                    var t = h * 0.22;
                    var esc = Math.min(t / (ins.width || 1), t / (ins.height || 1));
                    scene.tweens.add({ targets: ins, scale: esc, y: s - cw * 0.6 - h * 0.18, duration: reducido() ? 1 : 700, ease: 'Back.easeOut' });
                }
            });
            this.confeti();
            return esperar(this, 2800);
        },

        /* ── Efectos y utilidades ───────────────────────────────── */

        chispas: function (x, y, n) {
            if (reducido()) return;
            for (var i = 0; i < n; i++) {
                var a = (Math.PI * 2 / n) * i;
                var d = rnd(60, 150);
                var st = this.add.star(x, y, 5, 4, 10, FIESTA[i % FIESTA.length]).setDepth(50);
                this.tweens.add({
                    targets: st, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, angle: 180,
                    duration: rnd(600, 950), onComplete: (function (o) { return function () { o.destroy(); }; })(st)
                });
            }
        },

        confeti: function () {
            if (reducido()) return;
            var w = this.scale.width;
            var h = this.scale.height;
            var x0 = this.cameras.main.scrollX;
            for (var i = 0; i < 60; i++) {
                var c = this.add.rectangle(x0 + rnd(0, w), -20, rnd(8, 14), rnd(5, 9), FIESTA[i % FIESTA.length]).setDepth(50);
                this.tweens.add({
                    targets: c, y: h + 30, x: c.x + rnd(-80, 80), angle: rnd(180, 720), duration: rnd(1400, 2200), delay: rnd(0, 900),
                    onComplete: (function (o) { return function () { o.destroy(); }; })(c)
                });
            }
        },

        /** Ejemplo guiado: una sola cosa a la vista en la selva. */
        demo: function (id) {
            var scene = this;
            this.region = 'selva';
            this.dibujarRegion();
            Object.keys(this.cosas).forEach(function (k) { scene.cosas[k].img.setVisible(false); });
            var c = this.crearCosa(id);
            // A un lado: abajo al centro están el botón de escuchar y la mano del tutorial.
            c.x = this.scale.width * 0.32;
            c.y = this.suelo();
            c.img.setVisible(true).setPosition(c.x, c.y);
            this.cameras.main.setScroll(0, 0);
            this.demoObj = c;
        },

        limpiarDemo: function () {
            var c = this.demoObj;
            this.demoObj = null;
            if (c) c.img.setVisible(false);
            return Promise.resolve();
        },

        rectDe: function (id) {
            var c = this.cosaDe(id);
            if (!c) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            var x = c.x - this.cameras.main.scrollX;
            return {
                x: r.left + x * sx,
                y: r.top + (c.y - c.size / 2) * sy,
                left: r.left + (x - c.ancho / 2) * sx,
                top: r.top + (c.y - c.size) * sy,
                width: c.ancho * sx,
                height: c.size * sy
            };
        },

        /** El sonido sale de donde está respecto de lo que se ve (aunque esté fuera de la pantalla). */
        panDe: function (id) {
            var c = this.cosaDe(id);
            if (!c) return 0;
            var centro = this.cameras.main.scrollX + this.scale.width / 2;
            return Phaser.Math.Clamp((c.x - centro) / (this.scale.width / 2), -1, 1) * 0.9;
        },

        estado: function () {
            var scene = this;
            var cam = this.cameras.main;
            return {
                jugando: this.jugando,
                region: this.region,
                ronda: this.ronda,
                objetivo: this.objetivo,
                mundo: this.mundoW,
                vista: Math.round(cam.scrollX),
                paradas: this.paradas.slice(),
                cosas: Object.keys(this.cosas).filter(function (id) { return scene.cosas[id].img.visible; })
                    .map(function (id) { var c = scene.cosas[id]; return { id: id, x: Math.round(c.x), y: Math.round(c.y) }; })
            };
        }
    });

    function cargarTexturas(scene) {
        var elems = (gameConfig && gameConfig.elementos) || {};
        var lista = [];
        Object.keys(elems).forEach(function (id) {
            if (elems[id].img) lista.push({ key: tex(id), src: elems[id].img });
        });
        var niveles = (gameConfig && gameConfig.niveles) || [];
        var conInsignia = niveles.filter(function (n) { return n.insignia && n.insignia.img; })[0];
        if (conInsignia) lista.push({ key: tex('__insignia'), src: conInsignia.insignia.img });
        lista = lista.filter(function (t) { return !scene.textures.exists(t.key); });
        if (!lista.length) return Promise.resolve();
        return new Promise(function (resolve) {
            lista.forEach(function (t) {
                if (/\.svg(\?|$)/i.test(t.src)) scene.load.svg(t.key, t.src, { scale: 2 });
                else scene.load.image(t.key, t.src);
            });
            scene.load.once('complete', resolve);
            scene.load.start();
        });
    }

    function montar(opts) {
        opts = opts || {};
        Host = global.PedniaPhaserHost;
        Phaser = global.Phaser;
        if (!Phaser) return Promise.reject(new Error('Phaser no cargado'));
        if (!Host) return Promise.reject(new Error('PedniaPhaserHost no cargado'));
        gameConfig = opts.gameConfig || null;
        callbacks = opts.callbacks || {};
        readyPromise = new Promise(function (resolve) { readyResolve = resolve; });
        inyectarEstilo();
        var doc = global.document;
        var el = doc.getElementById('expedicion-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'expedicion-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-expedicion');
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#63e6be',
            audio: { noAudio: true },
            scene: [EscenaExpedicion],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-expedicion');
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }
        return esperarEscena().then(function (scene) {
            scene.dibujarRegion();
            return cargarTexturas(scene).then(function () { return scene; });
        });
    }

    function conEscena(fn) {
        return function () {
            if (!sceneRef) return undefined;
            return fn.apply(null, [sceneRef].concat(Array.prototype.slice.call(arguments)));
        };
    }

    global.PedniaExpedicion = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        marcarMapa: conEscena(function (s, id) { return s.marcarMapa(id); }),
        pista: conEscena(function (s, id) { s.pista(id); }),
        resaltar: conEscena(function (s, id, si) { s.resaltar(id, si); }),
        demo: conEscena(function (s, id) { s.demo(id); }),
        limpiarDemo: conEscena(function (s) { return s.limpiarDemo(); }),
        rectDe: conEscena(function (s, id) { return s.rectDe(id); }),
        panDe: conEscena(function (s, id) { return s.panDe(id); }),
        fiestaFinal: conEscena(function (s) { return s.fiestaFinal(); }),
        estado: conEscena(function (s) { return s.estado(); }),
        destruir: function () {
            sceneRef = null;
            game = null;
            global.document.body.classList.remove('modo-expedicion');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
