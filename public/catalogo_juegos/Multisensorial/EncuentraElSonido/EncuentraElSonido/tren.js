/**
 * PedniaTren — "El tren de los sonidos" (Encuentra el sonido, 3-4 años) en Phaser 4.2.1.
 *
 * Un tren espera en la estación. En el andén hay pasajeros (gato, carro, trompeta…);
 * suena uno de ellos y hay que tocarlo para que suba a su vagón. Luego el tren viaja a
 * la siguiente estación (campo, ciudad, playa, montaña) y cada vez cuesta más:
 *   anden   → los pasajeros quietos en el andén (reto del documento).
 *   paseo   → caminan de un lado a otro por el andén.
 *   maletas → cada uno se esconde detrás de una maleta grande; tocarla la abre.
 *   nieve   → nieva, llega un pasajero más y todos caminan.
 * Premio propio de este juego: el tren se llena; al final sale pitando con todos.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, subirAlTren, pista, resaltar,
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
    var VAGONES = [0xe03131, 0x1c7ed6, 0x2f9e44, 0xf08c00, 0x7048e8];
    var MALETAS = [0x8d5524, 0xc2255c, 0x1971c2, 0x5c940d, 0xe67700];
    /** Paisaje de cada estación: cielo arriba/abajo, suelo, detalle. */
    var ESTACIONES = [
        { nombre: 'campo', cielo: [0x4dabf7, 0xd0ebff], suelo: 0x69db7c },
        { nombre: 'ciudad', cielo: [0x74c0fc, 0xe7f5ff], suelo: 0xadb5bd },
        { nombre: 'playa', cielo: [0x3bc9db, 0xe3fafc], suelo: 0xffe066 },
        { nombre: 'montana', cielo: [0x91a7ff, 0xedf2ff], suelo: 0xf8f9fa }
    ];

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'tren:' + id;
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
        if (doc.getElementById('tren-css')) return;
        var css = doc.createElement('style');
        css.id = 'tren-css';
        css.textContent = [
            '#tren-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#tren-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-tren{background:#a5d8ff !important}',
            'body.modo-tren #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-tren #principal button,body.modo-tren .dialogo{pointer-events:auto}',
            'body.modo-tren .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-tren .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-tren .parque-fondo,body.modo-tren #zonas,body.modo-tren #elementos{display:none !important}',
            'body.modo-tren .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(20vh,160px)}',
            'body.modo-tren .pj-zoe{left:6px}',
            'body.modo-tren .pj-zeus{right:6px}',
            'body.modo-tren .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaTren = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaTren() {
            Phaser.Scene.call(this, { key: 'EscenaTren' });
            this.pasajeros = [];
            this.vagones = [];
            this.humo = [];
            this.copos = [];
            this.estacion = 0;
            this.desfase = 0;
            this.modo = 'anden';
            this.objetivo = null;
            this.jugando = false;
            this.ronda = 0;
            this.demoObj = null;
            this.totalVagones = 4;
        },

        create: function () {
            this.cielo = this.add.graphics().setDepth(-30);
            this.paisaje = this.add.container(0, 0).setDepth(-25);
            this.paisajeG = this.add.graphics();
            this.paisaje.add(this.paisajeG);
            this.via = this.add.graphics().setDepth(-12);
            this.anden = this.add.container(0, 0).setDepth(-8);
            this.andenG = this.add.graphics();
            this.anden.add(this.andenG);
            this.tren = this.add.container(0, 0).setDepth(-10);
            this.nieve = this.add.graphics().setDepth(14);
            this.dibujarTodo();
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarTodo(); });
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.input.on('pointerdown', this.alTocar, this);
        },

        shutdown: function () {
            this.tweens.killAll();
            if (sceneRef === this) sceneRef = null;
        },

        /** Medidas: la vía (detrás) y el piso del andén (delante, donde están los pasajeros). */
        viaY: function () { return this.scale.height * 0.6; },
        pisoAnden: function () { return this.scale.height * 0.9; },
        tamPasajero: function () { return Math.min(this.scale.height * 0.24, this.scale.width * 0.15, 210); },

        dibujarTodo: function () {
            this.dibujarCielo();
            this.dibujarPaisaje(this.estacion);
            this.dibujarVia();
            this.dibujarAnden(this.estacion);
            this.armarTren();
        },

        dibujarCielo: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var e = ESTACIONES[this.estacion % ESTACIONES.length];
            var g = this.cielo;
            g.clear();
            for (var b = 0; b < 16; b++) {
                g.fillStyle(mezclarColor(e.cielo[0], e.cielo[1], b / 15), 1);
                g.fillRect(0, (this.viaY() / 16) * b - 1, w, this.viaY() / 16 + 2);
            }
            g.fillStyle(0xffd43b, 1);
            g.fillCircle(w * 0.9, h * 0.15, Math.min(w, h) * 0.05);
        },

        /** Paisaje de fondo según la estación. */
        dibujarPaisaje: function (k) {
            var w = this.scale.width;
            var h = this.scale.height;
            var vy = this.viaY();
            var e = ESTACIONES[k % ESTACIONES.length];
            var g = this.paisajeG;
            g.clear();
            if (e.nombre === 'campo') {
                g.fillStyle(0x8ce99a, 1);
                g.fillEllipse(w * 0.25, vy, w * 0.8, h * 0.3);
                g.fillStyle(0x69db7c, 1);
                g.fillEllipse(w * 0.8, vy, w * 0.7, h * 0.24);
                for (var i = 0; i < 6; i++) {
                    var tx = w * (0.08 + i * 0.17);
                    g.fillStyle(0x8d5524, 1);
                    g.fillRect(tx - 4, vy - h * 0.1, 8, h * 0.06);
                    g.fillStyle(0x2f9e44, 1);
                    g.fillCircle(tx, vy - h * 0.12, h * 0.04);
                }
                // Granero.
                g.fillStyle(0xc92a2a, 1);
                g.fillRect(w * 0.62, vy - h * 0.16, w * 0.09, h * 0.12);
                g.fillTriangle(w * 0.61, vy - h * 0.16, w * 0.72, vy - h * 0.16, w * 0.665, vy - h * 0.23);
                g.fillStyle(0xffffff, 1);
                g.fillRect(w * 0.655, vy - h * 0.1, w * 0.02, h * 0.06);
            } else if (e.nombre === 'ciudad') {
                for (var j = 0; j < 9; j++) {
                    var bw = w / 9;
                    var bh = h * (0.14 + ((j * 7) % 5) * 0.035);
                    g.fillStyle([0x748ffc, 0x9775fa, 0x4dabf7, 0xf783ac, 0xffa94d][j % 5], 1);
                    g.fillRect(j * bw + 4, vy - bh, bw - 8, bh);
                    g.fillStyle(0xfff3bf, 1);
                    for (var r = 0; r < 3; r++) {
                        for (var q = 0; q < 2; q++) {
                            var wy = vy - bh + h * 0.025 + r * h * 0.045;
                            if (wy < vy - h * 0.03) g.fillRect(j * bw + 4 + bw * (0.2 + q * 0.38), wy, bw * 0.2, h * 0.025);
                        }
                    }
                }
            } else if (e.nombre === 'playa') {
                g.fillStyle(0x1c7ed6, 1);
                g.fillRect(0, vy - h * 0.1, w, h * 0.1);
                g.fillStyle(0x4dabf7, 1);
                for (var o = 0; o < w; o += 60) g.fillEllipse(o + 30, vy - h * 0.1, 50, 12);
                // Palmeras.
                [0.12, 0.5, 0.86].forEach(function (px) {
                    g.fillStyle(0x8d5524, 1);
                    g.fillRect(w * px - 5, vy - h * 0.22, 10, h * 0.2);
                    g.fillStyle(0x2f9e44, 1);
                    g.fillEllipse(w * px - 30, vy - h * 0.23, 70, 20);
                    g.fillEllipse(w * px + 30, vy - h * 0.23, 70, 20);
                    g.fillEllipse(w * px, vy - h * 0.25, 30, 40);
                });
                g.fillStyle(0xffffff, 1);
                g.fillTriangle(w * 0.3, vy - h * 0.12, w * 0.3, vy - h * 0.2, w * 0.35, vy - h * 0.12);
                g.fillStyle(0x8d5524, 1);
                g.fillRect(w * 0.27, vy - h * 0.12, w * 0.09, h * 0.015);
            } else {
                g.fillStyle(0x91a7ff, 1);
                g.fillTriangle(0, vy, w * 0.3, vy - h * 0.34, w * 0.6, vy);
                g.fillStyle(0x748ffc, 1);
                g.fillTriangle(w * 0.4, vy, w * 0.72, vy - h * 0.3, w, vy);
                g.fillStyle(0xffffff, 1);
                g.fillTriangle(w * 0.24, vy - h * 0.27, w * 0.3, vy - h * 0.34, w * 0.36, vy - h * 0.27);
                g.fillTriangle(w * 0.66, vy - h * 0.24, w * 0.72, vy - h * 0.3, w * 0.78, vy - h * 0.24);
                for (var p2 = 0; p2 < 7; p2++) {
                    var pxx = w * (0.05 + p2 * 0.15);
                    g.fillStyle(0x2b8a3e, 1);
                    g.fillTriangle(pxx - 18, vy - h * 0.02, pxx + 18, vy - h * 0.02, pxx, vy - h * 0.12);
                    g.fillStyle(0xffffff, 0.9);
                    g.fillTriangle(pxx - 8, vy - h * 0.08, pxx + 8, vy - h * 0.08, pxx, vy - h * 0.12);
                }
            }
        },

        dibujarVia: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var vy = this.viaY();
            var g = this.via;
            g.clear();
            var e = ESTACIONES[this.estacion % ESTACIONES.length];
            g.fillStyle(e.suelo, 1);
            g.fillRect(0, vy, w, h - vy);
            g.fillStyle(0x868e96, 1);
            g.fillRect(0, vy + 4, w, 10);
            // Durmientes: se mueven con el viaje (desfase) para que se note la velocidad.
            g.fillStyle(0x8d5524, 1);
            var paso = 36;
            var off = ((this.desfase % paso) + paso) % paso;
            for (var x = -paso; x < w + paso; x += paso) g.fillRect(x - off, vy + 12, 14, 8);
            g.fillStyle(0x495057, 1);
            g.fillRect(0, vy + 10, w, 3);
        },

        /** Andén con techo, banca, farol y letrero de la estación (un dibujo, sin letras). */
        dibujarAnden: function (k) {
            var w = this.scale.width;
            var h = this.scale.height;
            var vy = this.viaY();
            var pa = this.pisoAnden();
            var g = this.andenG;
            g.clear();
            g.fillStyle(0xced4da, 1);
            g.fillRect(0, vy + 26, w, pa - vy - 26 + h * 0.02);
            g.fillStyle(0xfcc419, 1);
            g.fillRect(0, vy + 26, w, 6);
            g.fillStyle(0xadb5bd, 1);
            for (var x = 0; x < w; x += 80) g.fillRect(x, vy + 32, 2, pa - vy);
            g.fillStyle(0x868e96, 1);
            g.fillRect(0, pa + h * 0.02, w, h);
            // Letrero con el dibujo de la estación.
            var sx = w * 0.06;
            var sy = vy - h * 0.06;
            g.fillStyle(0x495057, 1);
            g.fillRect(sx + 20, sy, 6, vy + 26 - sy);
            g.fillStyle(0x1864ab, 1);
            g.fillRoundedRect(sx - 10, sy - h * 0.07, 66, h * 0.07, 8);
            g.fillStyle(0xffffff, 1);
            var cx = sx + 23;
            var cy = sy - h * 0.035;
            var n = ESTACIONES[k % ESTACIONES.length].nombre;
            if (n === 'campo') { g.fillCircle(cx, cy - 4, 9); g.fillRect(cx - 2, cy + 3, 4, 10); }
            else if (n === 'ciudad') { g.fillRect(cx - 14, cy - 8, 9, 20); g.fillRect(cx - 3, cy - 14, 9, 26); g.fillRect(cx + 8, cy - 4, 8, 16); }
            else if (n === 'playa') { g.fillCircle(cx, cy, 10); g.fillStyle(0x1864ab, 1); g.fillRect(cx - 14, cy, 28, 14); }
            else { g.fillTriangle(cx - 16, cy + 12, cx, cy - 12, cx + 16, cy + 12); }
        },

        /** Locomotora y vagones sobre la vía (la locomotora mira a la derecha). */
        armarTren: function () {
            var scene = this;
            var w = this.scale.width;
            var h = this.scale.height;
            var vy = this.viaY();
            this.tren.removeAll(true);
            this.vagones = [];
            this.ruedas = [];
            var vw = Math.min(w * 0.14, 190);
            var vh = h * 0.13;
            this.medidaVagon = { w: vw, h: vh };
            var x0 = w * 0.92;
            // Locomotora.
            var loco = this.add.graphics();
            var lw = vw * 1.15;
            loco.fillStyle(0x343a40, 1);
            loco.fillRoundedRect(x0 - lw, vy - vh, lw * 0.62, vh, 8);
            loco.fillStyle(0xe03131, 1);
            loco.fillRect(x0 - lw * 0.42, vy - vh * 0.72, lw * 0.42, vh * 0.72);
            loco.fillStyle(0x343a40, 1);
            loco.fillRect(x0 - lw * 0.32, vy - vh * 1.15, lw * 0.12, vh * 0.45);
            loco.fillStyle(0xfcc419, 1);
            loco.fillCircle(x0 - 4, vy - vh * 0.42, vh * 0.1);
            loco.fillStyle(0xa5d8ff, 1);
            loco.fillRoundedRect(x0 - lw * 0.92, vy - vh * 0.85, lw * 0.4, vh * 0.42, 5);
            loco.fillStyle(0xfcc419, 1);
            loco.fillTriangle(x0, vy - vh * 0.1, x0, vy + 6, x0 + vw * 0.18, vy + 6);
            this.tren.add(loco);
            this.chimenea = { x: x0 - lw * 0.26, y: vy - vh * 1.15 };
            [x0 - lw * 0.8, x0 - lw * 0.45, x0 - lw * 0.15].forEach(function (rx) { scene.ruedas.push(scene.rueda(rx, vy - 2, vh * 0.2)); });
            // Vagones (uno por ronda); el pasajero que sube se sienta en la ventana.
            for (var i = 0; i < this.totalVagones; i++) {
                var vx = x0 - lw - 10 - (i + 1) * (vw + 10);
                var g = this.add.graphics();
                g.fillStyle(VAGONES[i % VAGONES.length], 1);
                g.fillRoundedRect(vx, vy - vh, vw, vh, 8);
                g.fillStyle(0xffffff, 0.25);
                g.fillRect(vx + 6, vy - vh + 6, vw - 12, 5);
                g.fillStyle(0xa5d8ff, 1);
                g.fillRoundedRect(vx + vw * 0.15, vy - vh * 0.85, vw * 0.7, vh * 0.55, 6);
                g.fillStyle(0x495057, 1);
                g.fillRect(vx + vw, vy - vh * 0.3, 10, 5);
                this.tren.add(g);
                this.ruedas.push(this.rueda(vx + vw * 0.22, vy - 2, vh * 0.17));
                this.ruedas.push(this.rueda(vx + vw * 0.78, vy - 2, vh * 0.17));
                var v = { i: i, x: vx + vw / 2, y: vy - vh * 0.3, ventana: vh * 0.55, pasajero: null };
                var viejo = this.vagonesPrevios && this.vagonesPrevios[i];
                if (viejo && viejo.id) v.pasajero = this.sentar(v, viejo.id);
                this.vagones.push(v);
            }
            this.vagonesPrevios = this.vagones.map(function (v) { return { id: v.pasajero ? v.pasajero.id : null }; });
        },

        rueda: function (x, y, r) {
            var c = this.add.graphics({ x: x, y: y });
            c.fillStyle(0x212529, 1);
            c.fillCircle(0, 0, r);
            c.fillStyle(0xadb5bd, 1);
            c.fillCircle(0, 0, r * 0.45);
            c.lineStyle(3, 0x868e96, 1);
            c.lineBetween(-r * 0.8, 0, r * 0.8, 0);
            c.r = r;
            this.tren.add(c);
            return c;
        },

        /** El pasajero queda sentado asomado por la ventana de su vagón. */
        sentar: function (v, id) {
            var im = this.add.image(v.x, v.y, tex(id)).setOrigin(0.5, 1);
            var t = v.ventana * 1.25;
            im.setScale(Math.min(t / (im.width || 1), t / (im.height || 1)));
            im.id = id;
            this.tren.add(im);
            return im;
        },

        /* ── Pasajeros del andén ─────────────────────────────────── */

        lugares: function (n) {
            var w = this.scale.width;
            // Un lugar de más y se quita el del centro: ahí abajo está el botón de escuchar.
            var out = [];
            for (var i = 0; i <= n; i++) out.push(w * (0.12 + (0.76 / n) * i));
            out.sort(function (a, b) { return Math.abs(a - w / 2) - Math.abs(b - w / 2); });
            out.shift();
            if (n === 1) out = [w * 0.3];
            return mezclar(out);
        },

        crearPasajero: function (id, x) {
            var pa = this.pisoAnden();
            var img = this.add.image(x, pa, tex(id)).setOrigin(0.5, 1).setDepth(5);
            var t = this.tamPasajero();
            var esc = Math.min(t / (img.width || 1), t / (img.height || 1));
            img.setScale(esc);
            var sombra = this.add.ellipse(x, pa - 2, img.width * esc * 0.8, 14, 0x000000, 0.15).setDepth(4);
            var p = {
                id: id, img: img, sombra: sombra, x: x, esc: esc, size: img.height * esc, ancho: img.width * esc,
                maleta: null, tapado: false, destino: x, vel: 0, resaltado: false, salto: 0, fase: Math.random() * 6
            };
            return p;
        },

        crearMaleta: function (p, k) {
            var t = this.tamPasajero();
            var mw = Math.max(p.ancho, t * 0.8) + 20;
            var mh = p.size * 0.92;
            var c = this.add.container(p.x, this.pisoAnden()).setDepth(6);
            var g = this.add.graphics();
            var col = MALETAS[k % MALETAS.length];
            g.fillStyle(col, 1);
            g.fillRoundedRect(-mw / 2, -mh, mw, mh, 14);
            g.fillStyle(0x000000, 0.15);
            g.fillRect(-mw / 2, -mh * 0.55, mw, 8);
            g.fillStyle(0xfcc419, 1);
            g.fillRect(-mw * 0.3, -mh * 0.58, 12, 14);
            g.fillRect(mw * 0.3 - 12, -mh * 0.58, 12, 14);
            // Asa.
            g.lineStyle(8, 0x343a40, 1);
            g.strokeRoundedRect(-mw * 0.18, -mh - 22, mw * 0.36, 26, 8);
            // Etiqueta con estrellita.
            g.fillStyle(0xffffff, 1);
            g.fillRoundedRect(mw * 0.12, -mh * 0.35, mw * 0.28, mh * 0.2, 4);
            g.fillStyle(FIESTA[k % FIESTA.length], 1);
            g.fillCircle(mw * 0.26, -mh * 0.25, 6);
            c.add(g);
            c.mw = mw;
            c.mh = mh;
            return c;
        },

        destruirPasajeros: function () {
            this.pasajeros.forEach(function (p) { p.img.destroy(); p.sombra.destroy(); if (p.maleta) p.maleta.destroy(); });
            this.pasajeros = [];
        },

        /**
         * Nueva estación: llegan los pasajeros. Con modo "paseo"/"nieve" caminan; con
         * "maletas" cada uno queda detrás de su maleta.
         */
        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.modo = o.modo || 'anden';
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            this.destruirPasajeros();
            var w = this.scale.width;
            var lug = this.lugares(o.elementos.length);
            var entradas = o.elementos.map(function (id, i) {
                var desdeIzq = lug[i] < w / 2;
                var p = scene.crearPasajero(id, desdeIzq ? -120 : w + 120);
                scene.pasajeros.push(p);
                p.destino = lug[i];
                if (scene.modo === 'maletas') {
                    p.maleta = scene.crearMaleta(p, i);
                    p.maleta.x = p.x;
                    p.tapado = true;
                    p.img.setVisible(false);
                    p.sombra.setVisible(false);
                }
                return scene.caminarA(p, lug[i], reducido() ? 1 : 900 + i * 200);
            });
            if (this.modo === 'nieve') this.nevando = true;
            return Promise.all(entradas).then(function () { return esperar(scene, 250); });
        },

        caminarA: function (p, x, ms) {
            var scene = this;
            var desde = p.x;
            var obj = p.maleta || p.img;
            if (p.img.flipX !== undefined) p.img.setFlipX(x < desde);
            return new Promise(function (resolve) {
                var t = { k: 0 };
                scene.tweens.add({
                    targets: t, k: 1, duration: ms, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        p.x = Phaser.Math.Linear(desde, x, t.k);
                        p.salto = p.tapado ? 0 : Math.abs(Math.sin(t.k * Math.PI * 6)) * p.size * 0.06;
                    },
                    onComplete: function () { p.x = x; p.salto = 0; p.img.setFlipX(false); if (obj) resolve(); }
                });
            });
        },

        jugar: function () {
            var scene = this;
            this.jugando = true;
            // Paseo y nieve: los pasajeros cambian de sitio cada tanto, caminando.
            if (this.paseo) this.paseo.remove();
            if (this.modo === 'paseo' || this.modo === 'nieve') {
                this.paseo = this.time.addEvent({
                    delay: this.modo === 'nieve' ? 3200 : 3800, loop: true, callback: function () {
                        if (!scene.jugando || scene.ocupada) return;
                        var lug = scene.lugares(scene.pasajeros.length);
                        scene.pasajeros.forEach(function (p, i) { scene.caminarA(p, lug[i], 1400); });
                    }
                });
            }
        },

        pausar: function () {
            this.jugando = false;
        },

        update: function (time, delta) {
            var w = this.scale.width;
            var h = this.scale.height;
            var dt = Math.min(delta, 50) / 1000;
            var scene = this;
            var pa = this.pisoAnden();
            this.pasajeros.forEach(function (p) {
                if (p.volando) return;
                p.img.setPosition(p.x, pa - p.salto);
                if (scene.jugando && !p.tapado && !reducido()) p.img.angle = Math.sin(time / 400 + p.fase) * 2;
                p.sombra.setPosition(p.x, pa - 2);
                if (p.maleta) {
                    if (p.tapado) p.maleta.x = p.x;
                    // La maleta da saltitos a ratos (alguien se mueve dentro).
                    p.maleta.y = pa - (p.tapado && !reducido() ? Math.max(0, Math.sin(time / 300 + p.fase * 3)) * Math.max(0, Math.sin(time / 1700 + p.fase)) * 8 : 0);
                }
                p.img.setAlpha(p.resaltado ? 0.7 + 0.3 * Math.sin(time / 140) : 1);
            });
            // Humo de la locomotora.
            if (this.chimenea && !reducido() && (!this.ultimoHumo || time - this.ultimoHumo > (this.viajando ? 140 : 700))) {
                this.ultimoHumo = time;
                var b = this.add.circle(this.chimenea.x, this.chimenea.y, rnd(8, 14), 0xf1f3f5, 0.9).setDepth(-9);
                this.tweens.add({
                    targets: b, y: b.y - h * 0.15, x: b.x - (this.viajando ? w * 0.12 : rnd(-10, 20)), scale: 2.4, alpha: 0,
                    duration: 1600, onComplete: function () { b.destroy(); }
                });
            }
            if (this.viajando) {
                this.ruedas.forEach(function (r) { r.rotation += dt * 12; });
                this.dibujarVia();
            }
            // Nieve.
            var g = this.nieve;
            g.clear();
            if (this.nevando && !reducido()) {
                while (this.copos.length < 90) this.copos.push({ x: Math.random(), y: Math.random(), v: rnd(0.05, 0.12), f: Math.random() * 6 });
                g.fillStyle(0xffffff, 0.9);
                this.copos.forEach(function (c) {
                    c.y += c.v * dt;
                    if (c.y > 1) { c.y = 0; c.x = Math.random(); }
                    g.fillCircle(c.x * w + Math.sin(time / 800 + c.f) * 12, c.y * h, 3);
                });
            }
        },

        /* ── Toques ───────────────────────────────────────────────── */

        alTocar: function (pointer) {
            if (!this.jugando || this.ocupada || !puedeTocar()) return;
            var px = pointer.worldX;
            var py = pointer.worldY;
            var pa = this.pisoAnden();
            for (var i = 0; i < this.pasajeros.length; i++) {
                var p = this.pasajeros[i];
                var ancho = p.tapado ? p.maleta.mw : p.ancho;
                var alto = p.tapado ? p.maleta.mh + 24 : p.size;
                if (Math.abs(px - p.x) < ancho / 2 + 10 && py > pa - alto - 10 && py < pa + 10) {
                    this.responder(p);
                    return;
                }
            }
        },

        abrirMaleta: function (p) {
            if (!p.tapado) return;
            p.tapado = false;
            p.img.setVisible(true);
            p.sombra.setVisible(true);
            sfx('zas');
            var m = p.maleta;
            this.tweens.add({ targets: m, x: p.x + (p.x < this.scale.width / 2 ? -1 : 1) * m.mw * 0.9, angle: p.x < this.scale.width / 2 ? -12 : 12, duration: reducido() ? 1 : 300, ease: 'Quad.easeOut' });
        },

        cerrarMaleta: function (p) {
            if (!p.maleta || p.tapado) return;
            var scene = this;
            this.tweens.add({
                targets: p.maleta, x: p.x, angle: 0, duration: reducido() ? 1 : 300, ease: 'Quad.easeIn',
                onComplete: function () { if (scene.pasajeros.indexOf(p) === -1) return; p.tapado = true; p.img.setVisible(false); p.sombra.setVisible(false); }
            });
        },

        responder: function (p) {
            var scene = this;
            this.abrirMaleta(p);
            if (p.id === this.objetivo) {
                this.jugando = false;
                avisar('onAcierto', p.id);
                return;
            }
            // No era: saluda saltando, suena como es y (si tenía maleta) se vuelve a esconder.
            this.ocupada = true;
            if (!reducido()) this.tweens.add({ targets: p, salto: p.size * 0.18, duration: 150, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            avisar('onError', p.id, { pan: this.panDe(p.id) });
            this.time.delayedCall(1600, function () {
                scene.ocupada = false;
                if (scene.modo === 'maletas' && scene.jugando) scene.cerrarMaleta(p);
            });
        },

        pasajeroDe: function (id) {
            for (var i = 0; i < this.pasajeros.length; i++) if (this.pasajeros[i].id === id) return this.pasajeros[i];
            return null;
        },

        /** Pista: la maleta del objetivo salta fuerte (o el pasajero da un brinco). */
        pista: function (id) {
            var p = this.pasajeroDe(id);
            if (!p || reducido()) return;
            if (p.tapado) this.tweens.add({ targets: p.maleta, angle: { from: -8, to: 8 }, duration: 110, yoyo: true, repeat: 3, onComplete: function () { p.maleta.angle = 0; } });
            else this.tweens.add({ targets: p, salto: p.size * 0.2, duration: 160, yoyo: true, repeat: 1 });
        },

        resaltar: function (id, si) {
            var p = this.pasajeroDe(id);
            if (p) p.resaltado = !!si;
        },

        /* ── Premio: sube al tren y el tren viaja ─────────────────── */

        /** Documento: animación especial: gira, crece y suelta estrellas. */
        celebrar: function (id) {
            var p = this.pasajeroDe(id) || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!p) return Promise.resolve();
            this.abrirMaleta(p);
            p.resaltado = false;
            if (this.paseo) { this.paseo.remove(); this.paseo = null; }
            var pa = this.pisoAnden();
            this.estrellas(p.x, pa - p.size / 2, 20);
            if (!reducido()) {
                this.tweens.add({ targets: p.img, angle: 360, duration: 700, ease: 'Cubic.easeInOut', onComplete: function () { p.img.angle = 0; } });
                this.tweens.add({ targets: p.img, scale: p.esc * 1.3, duration: 350, yoyo: true, ease: 'Sine.easeInOut' });
            }
            return esperar(this, 1300);
        },

        /** El pasajero salta a su vagón; el tren pita, viaja y llega a la siguiente estación. */
        subirAlTren: function (id) {
            var p = this.pasajeroDe(id);
            var scene = this;
            if (!p) return Promise.resolve();
            var v = this.vagones[Math.min(this.ronda, this.vagones.length - 1)];
            return new Promise(function (resolve) {
                var desde = { x: p.x, y: scene.pisoAnden() };
                var t = { k: 0 };
                sfx('zas');
                scene.tweens.add({
                    targets: t, k: 1, duration: reducido() ? 1 : 900, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        p.img.x = Phaser.Math.Linear(desde.x, v.x, t.k);
                        p.img.y = Phaser.Math.Linear(desde.y, v.y, t.k) - Math.sin(t.k * Math.PI) * scene.scale.height * 0.18;
                        p.img.setScale(Phaser.Math.Linear(p.esc, p.esc * 0.55, t.k));
                    },
                    onComplete: function () {
                        p.img.setVisible(false);
                        p.sombra.setVisible(false);
                        v.pasajero = scene.sentar(v, id);
                        scene.vagonesPrevios[v.i] = { id: id };
                        sfx('recompensa');
                        scene.estrellas(v.x, v.y - 20, 10);
                        resolve();
                    }
                });
                // Mientras vuela, el update no debe moverlo.
                p.volando = true;
            }).then(function () {
                scene.destruirPasajeros();
                return scene.viajar();
            });
        },

        /** Viaje: el paisaje y el andén se van a la izquierda y llega la próxima estación. */
        viajar: function () {
            var scene = this;
            var w = this.scale.width;
            this.nevando = false;
            this.viajando = true;
            sfx('magia');
            if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir('trompeta', { breve: true, vol: 0.35 });
            var dur = reducido() ? 1 : 1300;
            var mover = { d: this.desfase };
            this.tweens.add({ targets: mover, d: this.desfase + w * 2, duration: dur * 2, onUpdate: function () { scene.desfase = mover.d; } });
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: [scene.paisaje, scene.anden], x: -w, duration: dur, ease: 'Quad.easeIn',
                    onComplete: function () {
                        scene.estacion = (scene.estacion + 1) % ESTACIONES.length;
                        scene.dibujarCielo();
                        scene.dibujarPaisaje(scene.estacion);
                        scene.dibujarAnden(scene.estacion);
                        scene.paisaje.x = w;
                        scene.anden.x = w;
                        scene.tweens.add({
                            targets: [scene.paisaje, scene.anden], x: 0, duration: dur, ease: 'Quad.easeOut',
                            onComplete: function () { scene.viajando = false; scene.dibujarVia(); resolve(); }
                        });
                    }
                });
            });
        },

        /** Final: el tren lleno pita y sale de la pantalla; vuelve entrando por la izquierda. */
        fiestaFinal: function () {
            var scene = this;
            var w = this.scale.width;
            this.jugando = false;
            this.nevando = false;
            this.viajando = true;
            if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir('trompeta', { vol: 0.4 });
            this.confeti();
            if (reducido()) { this.viajando = false; return esperar(this, 1500); }
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: scene.tren, x: w * 1.05, duration: 1400, ease: 'Quad.easeIn',
                    onComplete: function () {
                        scene.tren.x = -w * 0.95;
                        scene.tweens.add({
                            targets: scene.tren, x: 0, duration: 1400, ease: 'Quad.easeOut',
                            onComplete: function () { scene.viajando = false; resolve(); }
                        });
                    }
                });
            });
        },

        /* ── Efectos y utilidades ───────────────────────────────── */

        estrellas: function (x, y, n) {
            if (reducido()) return;
            for (var i = 0; i < n; i++) {
                var a = (Math.PI * 2 / n) * i;
                var d = rnd(60, 150);
                var st = this.add.star(x, y, 5, 4, 10, FIESTA[i % FIESTA.length]).setDepth(20);
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
            for (var i = 0; i < 60; i++) {
                var c = this.add.rectangle(rnd(0, w), -20, rnd(8, 14), rnd(5, 9), FIESTA[i % FIESTA.length]).setDepth(20);
                this.tweens.add({
                    targets: c, y: h + 30, x: c.x + rnd(-80, 80), angle: rnd(180, 720), duration: rnd(1400, 2200), delay: rnd(0, 900),
                    onComplete: (function (o) { return function () { o.destroy(); }; })(c)
                });
            }
        },

        /** Ejemplo guiado: un solo pasajero quieto en el andén. */
        demo: function (id) {
            this.destruirPasajeros();
            var p = this.crearPasajero(id, this.scale.width * 0.5);
            this.pasajeros.push(p);
            this.demoObj = p;
        },

        limpiarDemo: function () {
            this.demoObj = null;
            this.destruirPasajeros();
            return Promise.resolve();
        },

        rectDe: function (id) {
            var p = this.pasajeroDe(id);
            if (!p) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            var pa = this.pisoAnden();
            var ancho = p.tapado ? p.maleta.mw : p.ancho;
            var alto = p.tapado ? p.maleta.mh : p.size;
            return {
                x: r.left + p.x * sx,
                y: r.top + (pa - alto / 2) * sy,
                left: r.left + (p.x - ancho / 2) * sx,
                top: r.top + (pa - alto) * sy,
                width: ancho * sx,
                height: alto * sy
            };
        },

        panDe: function (id) {
            var p = this.pasajeroDe(id);
            if (!p || p.volando) return 0;
            return Phaser.Math.Clamp((p.x / this.scale.width) * 2 - 1, -1, 1) * 0.85;
        },

        estado: function () {
            return {
                jugando: this.jugando,
                modo: this.modo,
                ronda: this.ronda,
                estacion: ESTACIONES[this.estacion % ESTACIONES.length].nombre,
                objetivo: this.objetivo,
                vagones: this.vagones.map(function (v) { return v.pasajero ? v.pasajero.id : null; }),
                pasajeros: this.pasajeros.map(function (p) { return { id: p.id, x: Math.round(p.x), tapado: p.tapado }; })
            };
        }
    });

    function cargarTexturas(scene) {
        var elems = (gameConfig && gameConfig.elementos) || {};
        var lista = [];
        Object.keys(elems).forEach(function (id) {
            if (elems[id].img) lista.push({ key: tex(id), src: elems[id].img });
        });
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
        var el = doc.getElementById('tren-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'tren-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-tren');
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#a5d8ff',
            audio: { noAudio: true },
            scene: [EscenaTren],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-tren');
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }
        return esperarEscena().then(function (scene) {
            return cargarTexturas(scene).then(function () { scene.armarTren(); return scene; });
        });
    }

    function conEscena(fn) {
        return function () {
            if (!sceneRef) return undefined;
            return fn.apply(null, [sceneRef].concat(Array.prototype.slice.call(arguments)));
        };
    }

    global.PedniaTren = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        subirAlTren: conEscena(function (s, id) { return s.subirAlTren(id); }),
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
            global.document.body.classList.remove('modo-tren');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
