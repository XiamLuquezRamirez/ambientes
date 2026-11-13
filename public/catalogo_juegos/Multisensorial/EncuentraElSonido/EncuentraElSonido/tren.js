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
    // Nombres iguales a los dibujos (fondo_1..4). "anden" = colores del andén que se pinta
    // delante de la vía; la montaña ya trae su andén en el dibujo.
    var ESTACIONES = [
        { nombre: 'campo', cielo: [0x4dabf7, 0xd0ebff], suelo: 0x69db7c, anden: { piso: 0xd9caa5, borde: 0xa8916a, junta: 0xc4b48d } },
        { nombre: 'desierto', cielo: [0xffc078, 0xfff4e6], suelo: 0xf5c983, anden: { piso: 0xe8c48c, borde: 0xbf975a, junta: 0xd4ad72 } },
        { nombre: 'playa', cielo: [0x3bc9db, 0xe3fafc], suelo: 0xffe066, anden: { piso: 0xd9a066, borde: 0xa8703d, junta: 0xbf8650, tablas: true } },
        { nombre: 'montana', cielo: [0x91a7ff, 0xedf2ff], suelo: 0xf8f9fa, anden: null }
    ];
    /** Vía de los fondos ilustrados (1280×720): rieles de y 411 a 458; las ruedas pisan y 443. */
    var VIA_Y = 443;
    /** El andén pintado empieza bajo los durmientes (terminan en y 480). */
    var ANDEN_Y = 484;
    /**
     * Tren por piezas (docs/partir_tren.py): cuerpo sin ruedas (1214×380, las ruedas apoyan
     * en y 375) y ruedas sueltas que giran. Medidas en unidades del dibujo.
     */
    var TREN = {
        ancho: 1214, base: 375, alto: 226,
        ruedas: [
            { x: 946, y: 320, r: 53, grande: true }, { x: 1035, y: 333, r: 34 }, { x: 821, y: 335, r: 40 },
            { x: 721, y: 335, r: 37 }, { x: 622, y: 335, r: 35 }, { x: 523, y: 335, r: 40 },
            { x: 424, y: 335, r: 40 }, { x: 324, y: 335, r: 40 }, { x: 225, y: 335, r: 41 }, { x: 126, y: 335, r: 35 }
        ],
        // Vagones: centro x (el 0 es el que va pegado a la locomotora), borde de arriba y fondo.
        vagones: [771, 572, 374, 175], vagonArriba: 243, vagonAbajo: 350, vagonAncho: 177,
        chimenea: { x: 1050, y: 155 }
    };
    /** Arte de escena (staging EncuentraElSonido/img → img/). */
    var ESCENA = {
        fondos: ['img/fondo_1.svg', 'img/fondo_2.svg', 'img/fondo_3.svg', 'img/fondo_4.svg'],
        maletas: ['img/maleta_1.svg', 'img/maleta_2.svg', 'img/maleta_3.svg', 'img/maleta_4.svg'],
        tren: 'img/tren_escena.svg',
        cuerpo: 'img/tren_cuerpo.svg',
        rueda: 'img/rueda.svg',
        ruedaGrande: 'img/rueda_grande.svg',
        copo: 'img/copo.svg',
        nubeNieve: 'img/nube_nieve.svg',
        // Mariposas del diseño (copias de AsociaSonidoEImagen/QueSuena/img).
        mariposas: ['img/mariposa1.svg', 'img/mariposa2.svg', 'img/mariposa3.svg']
    };
    function texEscena(parte) { return 'tren:escena:' + parte; }
    var ESCENA_V = '?v=20261113piezas';
    /** Todo el arte de escena. Los SVG de Illustrator sin ancho/alto van con load.svg y tamaño. */
    function listaEscena() {
        var l = [];
        ESCENA.fondos.forEach(function (src, i) { l.push({ key: texEscena('fondo:' + i), src: src }); });
        ESCENA.maletas.forEach(function (src, i) { l.push({ key: texEscena('maleta:' + i), src: src }); });
        ['tren', 'cuerpo', 'rueda', 'ruedaGrande', 'copo', 'nubeNieve'].forEach(function (k) {
            l.push({ key: texEscena(k), src: ESCENA[k] });
        });
        ESCENA.mariposas.forEach(function (src, i) {
            l.push({ key: texEscena('mariposa:' + i), src: src, svg: { width: 160, height: 160 } });
        });
        return l;
    }
    function encolarEscena(load) {
        listaEscena().forEach(function (t) {
            var src = t.src;
            if (src.indexOf('?') === -1) src += ESCENA_V;
            if (t.svg) load.svg(t.key, src, t.svg);
            else load.image(t.key, src);
        });
    }

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

        preload: function () {
            encolarEscena(this.load);
        },

        create: function () {
            this.cielo = this.add.graphics().setDepth(-30);
            this.paisaje = this.add.container(0, 0).setDepth(-25);
            this.paisajeG = this.add.graphics();
            this.paisajeImg = null;
            this.paisaje.add(this.paisajeG);
            this.via = this.add.graphics().setDepth(-12);
            this.anden = this.add.container(0, 0).setDepth(-8);
            this.andenG = this.add.graphics();
            this.anden.add(this.andenG);
            this.tren = this.add.container(0, 0).setDepth(-10);
            this.nieve = this.add.graphics().setDepth(14);
            this.coposImg = this.add.group();
            this.nubeNieveImg = null;
            // Escena solo tras cargarTexturas.
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
        /** ¿Hay fondos y tren ilustrados? Entonces se usan sus medidas y no el dibujo procedural. */
        ilustrado: function () {
            return this.textures.exists(texEscena('fondo:0')) && this.textures.exists(texEscena('cuerpo')) &&
                this.textures.exists(texEscena('rueda'));
        },

        /** Dónde cae el fondo (1280×720, centrado y cubriendo la pantalla). */
        marcoFondo: function () {
            var w = this.scale.width, h = this.scale.height;
            var k = Math.max(w / 1280, h / 720);
            var x0 = w / 2 - 640 * k, y0 = h / 2 - 360 * k;
            return { k: k, ancho: 1280 * k, px: function (u) { return x0 + u * k; }, py: function (v) { return y0 + v * k; } };
        },

        viaY: function () {
            if (this.ilustrado()) return this.marcoFondo().py(VIA_Y);
            return this.scale.height * 0.6;
        },
        pisoAnden: function () { return this.scale.height * 0.9; },
        tamPasajero: function () { return Math.min(this.scale.height * 0.24, this.scale.width * 0.15, 210); },

        dibujarTodo: function () {
            if (this.ilustrado()) {
                this.cielo.clear();
                this.paisaje.setVisible(false);
                this.anden.setVisible(false);
                this.via.clear();
                if (this.estCont) this.estCont.destroy();
                this.estCont = this.armarEstacion(this.estacion);
                this.armarTren();
                return;
            }
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
            // Si hay fondo ilustrado, el cielo va en el arte: no pintar el procedural encima/detrás.
            var keyFondo = texEscena('fondo:' + (this.estacion % ESCENA.fondos.length));
            if (this.textures.exists(keyFondo)) return;
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
            var idx = k % ESCENA.fondos.length;
            var keyFondo = texEscena('fondo:' + idx);
            if (this.textures.exists(keyFondo)) {
                if (!this.paisajeImg) {
                    this.paisajeImg = this.add.image(0, 0, keyFondo).setOrigin(0.5, 0.5).setDepth(-26);
                    this.paisaje.addAt(this.paisajeImg, 0);
                } else if (this.paisajeImg.texture.key !== keyFondo) {
                    this.paisajeImg.setTexture(keyFondo);
                }
                this.paisajeImg.setVisible(true);
                // Cover a pantalla completa (el SVG ya trae cielo, colinas y vía).
                var esc = Math.max(w / (this.paisajeImg.width || 1), h / (this.paisajeImg.height || 1));
                this.paisajeImg.setScale(esc).setPosition(w / 2, h / 2);
                return;
            }
            if (this.paisajeImg) this.paisajeImg.setVisible(false);
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
            // Con fondo ilustrado la vía viene en el dibujo.
            if (this.ilustrado()) { this.via.clear(); return; }
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

        /**
         * Una estación ilustrada entera, en un contenedor que se desliza en el viaje: el fondo,
         * el andén pintado delante de la vía (la montaña ya lo trae), el letrero y su vida.
         */
        armarEstacion: function (k) {
            var w = this.scale.width, h = this.scale.height;
            var F = this.marcoFondo();
            var e = ESTACIONES[k % ESTACIONES.length];
            var c = this.add.container(0, 0).setDepth(-25);
            var img = this.add.image(w / 2, h / 2, texEscena('fondo:' + (k % ESCENA.fondos.length))).setScale(F.k);
            c.add(img);
            var g = this.add.graphics();
            c.add(g);
            if (e.anden) this.pintarAnden(g, e.anden, F);
            this.pintarLetrero(c, e.nombre, F);
            c.estacion = k;
            c.vida = [];
            this.armarVida(c, e.nombre, F);
            return c;
        },

        /** Andén plano, del estilo del dibujo: borde oscuro, línea amarilla y juntas (o tablas). */
        pintarAnden: function (g, a, F) {
            var h = this.scale.height;
            var x0 = F.px(-40), x1 = F.px(1320);
            var y0 = F.py(ANDEN_Y);
            g.fillStyle(a.piso, 1);
            g.fillRect(x0, y0, x1 - x0, h - y0 + 2);
            g.fillStyle(a.borde, 1);
            g.fillRect(x0, y0, x1 - x0, 9 * F.k);
            g.fillStyle(0xfcc419, 1);
            g.fillRect(x0, y0 + 16 * F.k, x1 - x0, 6 * F.k);
            g.fillStyle(a.junta, 1);
            if (a.tablas) {
                for (var y = y0 + 40 * F.k; y < h; y += 34 * F.k) g.fillRect(x0, y, x1 - x0, 3 * F.k);
            } else {
                for (var x = F.px(0); x < x1; x += 120 * F.k) g.fillRect(x, y0 + 28 * F.k, 3 * F.k, h - y0);
                g.fillRect(x0, F.py(600), x1 - x0, 3 * F.k);
            }
        },

        /** Letrero de la estación con su dibujo (sin letras), a la derecha del cruce del fondo. */
        pintarLetrero: function (c, nombre, F) {
            var w = this.scale.width;
            var g = this.add.graphics();
            var u = F.k;
            var x = Math.max(F.px(255), w * 0.05);
            var yPie = F.py(ANDEN_Y + 6);
            var ancho = 74 * u, alto = 58 * u;
            var yTab = F.py(VIA_Y) - 150 * u;
            g.fillStyle(0x495057, 1);
            g.fillRoundedRect(x - 4 * u, yTab + alto - 4 * u, 8 * u, yPie - yTab - alto + 4 * u, 3 * u);
            g.fillStyle(0x0b4f8a, 1);
            g.fillRoundedRect(x - ancho / 2, yTab + 3 * u, ancho, alto, 10 * u);
            g.fillStyle(0x1c7ed6, 1);
            g.fillRoundedRect(x - ancho / 2, yTab, ancho, alto, 10 * u);
            g.lineStyle(3 * u, 0xffffff, 0.9);
            g.strokeRoundedRect(x - ancho / 2 + 4 * u, yTab + 4 * u, ancho - 8 * u, alto - 8 * u, 7 * u);
            var cx = x, cy = yTab + alto / 2;
            g.fillStyle(0xffffff, 1);
            if (nombre === 'campo') {
                g.fillRect(cx - 3 * u, cy, 6 * u, 16 * u);
                g.fillCircle(cx, cy - 4 * u, 13 * u);
            } else if (nombre === 'desierto') {
                g.fillRoundedRect(cx - 5 * u, cy - 17 * u, 10 * u, 34 * u, 5 * u);
                g.fillRoundedRect(cx - 17 * u, cy - 6 * u, 7 * u, 14 * u, 3.5 * u);
                g.fillRect(cx - 17 * u, cy + 4 * u, 14 * u, 5 * u);
                g.fillRoundedRect(cx + 10 * u, cy - 12 * u, 7 * u, 14 * u, 3.5 * u);
                g.fillRect(cx + 3 * u, cy - 2 * u, 14 * u, 5 * u);
            } else if (nombre === 'playa') {
                g.fillCircle(cx, cy - 2 * u, 11 * u);
                g.fillStyle(0x1c7ed6, 1);
                g.fillRect(cx - 20 * u, cy + 2 * u, 40 * u, 16 * u);
                g.lineStyle(3 * u, 0xffffff, 1);
                for (var i = 0; i < 2; i++) {
                    g.beginPath();
                    var yy = cy + (6 + i * 7) * u;
                    g.moveTo(cx - 18 * u, yy);
                    for (var t = 1; t <= 6; t++) g.lineTo(cx - 18 * u + t * 6 * u, yy + (t % 2 ? -3 : 0) * u);
                    g.strokePath();
                }
            } else {
                g.fillTriangle(cx - 22 * u, cy + 16 * u, cx, cy - 18 * u, cx + 22 * u, cy + 16 * u);
                g.fillStyle(0x1c7ed6, 1);
                g.fillTriangle(cx - 9 * u, cy + 2 * u, cx, cy - 8 * u, cx + 9 * u, cy + 2 * u);
            }
            c.add(g);
            this.letreroX = x + ancho / 2;
        },

        /* ── Vida de cada estación (va dentro de su contenedor y se desliza con él) ── */

        armarVida: function (c, nombre, F) {
            var scene = this;
            var w = this.scale.width;
            if (reducido()) return;
            if (nombre === 'campo') {
                // Mariposas del diseño sobre las colinas y pájaros que cruzan el cielo.
                ESCENA.mariposas.forEach(function (src, i) {
                    var key = texEscena('mariposa:' + i);
                    if (!scene.textures.exists(key)) return;
                    var m = scene.add.image(rnd(0, w), F.py(rnd(170, 260)), key);
                    c.add(m);
                    c.vida.push({ tipo: 'mariposa', o: m, y0: m.y, fase: Math.random() * 6, base: Math.max(30, Math.min(52, w * 0.045)) / (m.width || 1) });
                });
                this.pajaros(c, 3, F.py(70), F.py(220), 0x495057);
            } else if (nombre === 'desierto') {
                c.vida.push({ tipo: 'rodadora', o: this.rodadora(c, F), espera: rnd(1, 3) });
            } else if (nombre === 'playa') {
                this.pajaros(c, 3, F.py(80), F.py(240), 0xffffff);
                // Brillos del sol sobre el mar (el agua va de y 340 a 405 del dibujo).
                for (var i = 0; i < 9; i++) {
                    var b = this.add.ellipse(F.px(rnd(150, 1150)), F.py(rnd(350, 400)), rnd(14, 26) * F.k, 3 * F.k, 0xffffff, 0);
                    c.add(b);
                    c.vida.push({ tipo: 'brillo', o: b, fase: Math.random() * 6, vel: rnd(1.2, 2.4) });
                }
            } else {
                // Montaña: copos sueltos que caen despacio aunque no nieve (en la nieve caen muchos más).
                for (var k = 0; k < 14; k++) {
                    var cp = this.add.circle(rnd(0, w), F.py(rnd(0, 400)), rnd(1.5, 3) * F.k, 0xffffff, 0.85);
                    c.add(cp);
                    c.vida.push({ tipo: 'copito', o: cp, vel: rnd(14, 28), fase: Math.random() * 6, alto: F.py(VIA_Y) });
                }
            }
        },

        /** Bandada de pájaros: una "v" que aletea y cruza el cielo. */
        pajaros: function (c, n, yMin, yMax, color) {
            var w = this.scale.width;
            for (var i = 0; i < n; i++) {
                var g = this.add.graphics();
                g.x = rnd(-w * 0.3, w);
                g.y = rnd(yMin, yMax);
                c.add(g);
                c.vida.push({ tipo: 'pajaro', o: g, vel: rnd(28, 55), fase: Math.random() * 6, color: color, tam: rnd(9, 14), y0: g.y });
            }
        },

        /** Rodadora del desierto: una bola de ramitas secas que rueda por la arena. */
        rodadora: function (c, F) {
            var g = this.add.graphics();
            var r = 22 * F.k;
            g.lineStyle(2.4 * F.k, 0xa9773a, 1);
            for (var i = 0; i < 9; i++) {
                var a = (Math.PI * 2 / 9) * i;
                g.beginPath();
                g.arc(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, r * 0.65, a, a + Math.PI * 1.2);
                g.strokePath();
            }
            g.lineStyle(1.6 * F.k, 0xc9955a, 1);
            g.strokeCircle(0, 0, r * 0.9);
            g.x = -r * 3;
            g.y = F.py(392) - r;
            g.r = r;
            g.suelo = g.y;
            c.add(g);
            return g;
        },

        /** Mueve la vida de una estación (local a su contenedor). */
        moverVida: function (c, time, dt) {
            if (!c || !c.vida) return;
            var w = this.scale.width;
            c.vida.forEach(function (v) {
                var o = v.o;
                if (v.tipo === 'mariposa') {
                    v.fase += dt;
                    o.x += Math.sin(v.fase * 0.7) * 0.9 + 0.35;
                    o.y = v.y0 + Math.sin(v.fase * 1.6) * 14;
                    o.setScale(v.base * (0.35 + 0.65 * Math.abs(Math.sin(time / 70 + v.fase))), v.base);
                    if (o.x > w + 30) o.x = -30;
                } else if (v.tipo === 'pajaro') {
                    o.x += v.vel * dt;
                    if (o.x > w + 40) { o.x = -40 - Math.random() * w * 0.4; v.y0 = o.y; }
                    o.y = v.y0 + Math.sin(time / 900 + v.fase) * 6;
                    var ala = Math.sin(time / 120 + v.fase) * v.tam * 0.5;
                    o.clear();
                    o.lineStyle(2.2, v.color, 1);
                    o.beginPath();
                    o.moveTo(-v.tam, -ala);
                    o.lineTo(0, 0);
                    o.lineTo(v.tam, -ala);
                    o.strokePath();
                } else if (v.tipo === 'rodadora') {
                    if (v.espera > 0) { v.espera -= dt; return; }
                    o.x += 120 * dt;
                    o.rotation += (120 * dt) / o.r;
                    o.y = o.suelo - Math.abs(Math.sin(o.x / 60)) * o.r * 0.8;
                    if (o.x > w + o.r * 3) { o.x = -o.r * 3; v.espera = rnd(4, 8); }
                } else if (v.tipo === 'brillo') {
                    o.fillAlpha = Math.max(0, Math.sin(time / 1000 * v.vel + v.fase)) * 0.85;
                } else if (v.tipo === 'copito') {
                    o.y += v.vel * dt;
                    o.x += Math.sin(time / 900 + v.fase) * 0.3;
                    if (o.y > v.alto) o.y = -10;
                }
            });
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
            this.trenPiezas = false;
            var vw = Math.min(w * 0.14, 190);
            var vh = h * 0.13;
            this.medidaVagon = { w: vw, h: vh };
            var x0 = w * 0.92;
            var keyTren = texEscena('tren');
            var loco;
            var lw = vw * 1.15;
            if (this.ilustrado()) {
                this.armarTrenPiezas();
                return;
            }
            if (this.textures.exists(keyTren)) {
                // El tren ilustrado ya trae locomotora y 4 vagones: se dibuja entero y los
                // vagones del juego son las zonas de sus coches (no se dibujan aparte).
                var img = this.add.image(0, 0, keyTren).setOrigin(1, 1);
                var anchoTren = Math.min(w * 0.9, (vw + 10) * (this.totalVagones + 1.4));
                var escT = Math.min(anchoTren / (img.width || 1), (vh * 2.1) / (img.height || 1));
                img.setScale(escT).setPosition(x0 + vw * 0.1, vy + 2);
                this.tren.add(img);
                var anchoReal = img.width * escT;
                var altoReal = img.height * escT;
                // Reparto medido sobre el dibujo: la locomotora ocupa el 24 % de la derecha.
                var izq = img.x - anchoReal;
                var zonaVag = anchoReal * 0.76;
                var pasoV = zonaVag / this.totalVagones;
                this.chimenea = { x: img.x - anchoReal * 0.12, y: vy - altoReal * 0.92 };
                for (var q = 0; q < this.totalVagones; q++) {
                    // Vagón 0 = el más cercano a la locomotora (derecha).
                    var cxv = izq + zonaVag - (q + 0.5) * pasoV;
                    var vq = { i: q, x: cxv, y: vy - altoReal * 0.42, ventana: altoReal * 0.42, pasajero: null };
                    var prev = this.vagonesPrevios && this.vagonesPrevios[q];
                    if (prev && prev.id) vq.pasajero = this.sentar(vq, prev.id);
                    this.vagones.push(vq);
                }
                this.vagonesPrevios = this.vagones.map(function (v) { return { id: v.pasajero ? v.pasajero.id : null }; });
                return;
            }
            {
            // Locomotora.
            loco = this.add.graphics();
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
            }
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

        /**
         * Tren ilustrado por piezas, apoyado en la vía del dibujo: los pasajeros sentados van
         * detrás del cuerpo (asoman por arriba del vagón) y las ruedas encima, sueltas, para girar.
         */
        armarTrenPiezas: function () {
            var scene = this;
            var w = this.scale.width, h = this.scale.height;
            var F = this.marcoFondo();
            var base = this.viaY();
            var izqMin = Math.max(w * 0.03, (this.letreroX || F.px(300)) + 8);
            var s = Math.min((w * 0.97 - izqMin) / TREN.ancho, (h * 0.3) / TREN.alto);
            var izq = w * 0.97 - TREN.ancho * s;
            this.escalaTren = s;
            var cuerpo = this.add.image(izq, base, texEscena('cuerpo')).setOrigin(0, TREN.base / 380).setScale(s);
            this.tren.add(cuerpo);
            TREN.ruedas.forEach(function (r) {
                var key = texEscena(r.grande ? 'ruedaGrande' : 'rueda');
                var im = scene.add.image(izq + r.x * s, base - (TREN.base - r.y) * s, key);
                im.setScale(s * (r.grande ? r.r / 53 : r.r / 40));
                im.r = r.r * s;
                scene.tren.add(im);
                scene.ruedas.push(im);
            });
            var alto = (TREN.vagonAbajo - TREN.vagonArriba) * s;
            for (var q = 0; q < this.totalVagones; q++) {
                var vq = {
                    i: q, x: izq + TREN.vagones[q] * s,
                    y: base - (TREN.base - TREN.vagonArriba) * s + alto * 0.45,
                    ventana: alto, anchoV: TREN.vagonAncho * s, pasajero: null
                };
                var prev = this.vagonesPrevios && this.vagonesPrevios[q];
                if (prev && prev.id) vq.pasajero = this.sentar(vq, prev.id);
                this.vagones.push(vq);
            }
            this.vagonesPrevios = this.vagones.map(function (v) { return { id: v.pasajero ? v.pasajero.id : null }; });
            this.chimenea = { x: izq + TREN.chimenea.x * s, y: base - (TREN.base - TREN.chimenea.y) * s };
            this.trenPiezas = true;
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
            // Con el tren por piezas el vagón es abierto: el pasajero asoma bien por arriba.
            var t = v.ventana * (this.trenPiezas ? 1.6 : 1.25);
            var esc = Math.min(t / (im.width || 1), t / (im.height || 1));
            if (v.anchoV) esc = Math.min(esc, (v.anchoV * 0.8) / (im.width || 1));
            im.setScale(esc);
            im.id = id;
            if (this.trenPiezas) this.tren.addAt(im, 0);
            else this.tren.add(im);
            return im;
        },

        /* ── Pasajeros del andén ─────────────────────────────────── */

        lugares: function (n) {
            var w = this.scale.width;
            // Un lugar de más y se quita el del centro: ahí abajo está el botón de escuchar.
            var out = [];
            // De 12 % a 78 %: a la derecha abajo están los botones de accesibilidad y sonido.
            for (var i = 0; i <= n; i++) out.push(w * (0.12 + (0.66 / n) * i));
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
            var keyM = texEscena('maleta:' + (k % ESCENA.maletas.length));
            if (this.textures.exists(keyM)) {
                var im = this.add.image(0, 0, keyM).setOrigin(0.5, 1);
                var esc = Math.min(mw / (im.width || 1), mh / (im.height || 1)) * 1.15;
                im.setScale(esc);
                c.add(im);
                c.mw = Math.max(mw, (im.width || 1) * esc);
                c.mh = Math.max(mh, (im.height || 1) * esc);
                return c;
            }
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
            var h = this.scale.height;
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
            if (this.modo === 'nieve') {
                this.nevando = true;
                var keyNube = texEscena('nubeNieve');
                if (this.textures.exists(keyNube)) {
                    if (!this.nubeNieveImg) this.nubeNieveImg = this.add.image(0, 0, keyNube).setDepth(13).setAlpha(0);
                    this.nubeNieveImg.setVisible(true).setPosition(w * 0.55, h * 0.14);
                    this.nubeNieveImg.setScale(Math.min(w * 0.45 / (this.nubeNieveImg.width || 1), h * 0.22 / (this.nubeNieveImg.height || 1)));
                    this.tweens.add({ targets: this.nubeNieveImg, alpha: 1, duration: 400 });
                }
            }
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
                var u = this.escalaTren ? this.escalaTren / 0.7 : 1;
                var b = this.add.circle(this.chimenea.x, this.chimenea.y, rnd(10, 16) * u, 0xffffff, 0.95).setDepth(-9);
                b.setStrokeStyle(2, 0xdee2e6, 0.9);
                this.tweens.add({
                    targets: b, y: b.y - h * (this.viajando ? 0.08 : 0.15), x: b.x - (this.viajando ? w * 0.3 : rnd(-10, 20)),
                    scale: this.viajando ? 3 : 2.4, alpha: 0,
                    duration: this.viajando ? 1300 : 1800, ease: 'Sine.easeOut', onComplete: function () { b.destroy(); }
                });
            }
            if (this.viajando) {
                if (this.trenPiezas) {
                    // Las ruedas giran según su tamaño (como si avanzaran ~520 px/s) y el tren traquetea.
                    this.ruedas.forEach(function (r) { r.rotation += dt * 520 / (r.r || 20); });
                    this.tren.y = reducido() ? 0 : Math.abs(Math.sin(time / 110)) * -2;
                } else {
                    this.ruedas.forEach(function (r) { r.rotation += dt * 12; });
                    this.dibujarVia();
                }
            } else if (this.tren.y) {
                this.tren.y = 0;
            }
            this.moverVida(this.estCont, time, dt);
            this.moverVida(this.estVieja, time, dt);
            // Nieve.
            var g = this.nieve;
            g.clear();
            var keyCopo = texEscena('copo');
            var usaCopo = this.textures.exists(keyCopo);
            if (this.nevando && !reducido()) {
                var maxCopos = usaCopo ? 36 : 90;
                while (this.copos.length < maxCopos) {
                    this.copos.push({ x: Math.random(), y: Math.random(), v: rnd(0.05, 0.12), f: Math.random() * 6, img: null });
                }
                if (!usaCopo) g.fillStyle(0xffffff, 0.9);
                this.copos.forEach(function (c) {
                    c.y += c.v * dt;
                    if (c.y > 1) { c.y = 0; c.x = Math.random(); }
                    var cx = c.x * w + Math.sin(time / 800 + c.f) * 12;
                    var cy = c.y * h;
                    if (usaCopo) {
                        if (!c.img) {
                            c.img = scene.add.image(cx, cy, keyCopo).setDepth(14).setScale(0.045 + c.v * 0.2);
                        } else {
                            c.img.setPosition(cx, cy).setVisible(true);
                        }
                    } else {
                        g.fillCircle(cx, cy, 3);
                    }
                });
            } else {
                this.copos.forEach(function (c) { if (c.img) c.img.setVisible(false); });
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
            var tVent = v.ventana * (this.trenPiezas ? 1.6 : 1.25);
            var escFinal = Math.min(tVent / (p.img.width || 1), tVent / (p.img.height || 1));
            if (v.anchoV) escFinal = Math.min(escFinal, (v.anchoV * 0.8) / (p.img.width || 1));
            return new Promise(function (resolve) {
                var desde = { x: p.x, y: scene.pisoAnden() };
                var t = { k: 0 };
                sfx('zas');
                scene.tweens.add({
                    targets: t, k: 1, duration: reducido() ? 1 : 900, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        p.img.x = Phaser.Math.Linear(desde.x, v.x, t.k);
                        p.img.y = Phaser.Math.Linear(desde.y, v.y, t.k) - Math.sin(t.k * Math.PI) * scene.scale.height * 0.18;
                        p.img.setScale(Phaser.Math.Linear(p.esc, escFinal, t.k));
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
            if (this.nubeNieveImg) this.nubeNieveImg.setVisible(false).setAlpha(0);
            this.viajando = true;
            sfx('magia');
            if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir('trompeta', { breve: true, vol: 0.35 });
            if (this.ilustrado() && this.estCont) {
                var paso = this.marcoFondo().ancho;
                var sig = (this.estacion + 1) % ESTACIONES.length;
                var vieja = this.estCont;
                var nueva = this.armarEstacion(sig);
                nueva.x = paso;
                this.estVieja = vieja;
                this.estCont = nueva;
                return new Promise(function (resolve) {
                    scene.tweens.add({
                        targets: [vieja, nueva], x: '-=' + paso, duration: reducido() ? 1 : 2800, ease: 'Sine.easeInOut',
                        onComplete: function () {
                            vieja.destroy();
                            scene.estVieja = null;
                            scene.estacion = sig;
                            scene.viajando = false;
                            resolve();
                        }
                    });
                });
            }
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
            if (this.nubeNieveImg) this.nubeNieveImg.setVisible(false).setAlpha(0);
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
            // A un lado: abajo al centro están el botón de escuchar y la mano del tutorial.
            var p = this.crearPasajero(id, this.scale.width * 0.3);
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
        lista = lista.concat(listaEscena());
        lista = lista.filter(function (t) { return !scene.textures.exists(t.key); });
        if (!lista.length) return Promise.resolve();
        return new Promise(function (resolve) {
            // Fondos Illustrator con clipPath fallan en load.svg → se ve el procedural viejo.
            // load.image deja que el navegador rasterice el SVG.
            lista.forEach(function (t) {
                var src = t.src;
                var esEscena = t.key.indexOf(':escena:') !== -1;
                if (esEscena) {
                    if (src.indexOf('?') === -1) src += ESCENA_V;
                    if (t.svg) scene.load.svg(t.key, src, t.svg);
                    else scene.load.image(t.key, src);
                } else if (/\.svg(\?|$)/i.test(src)) {
                    scene.load.svg(t.key, src, { scale: 2 });
                } else {
                    scene.load.image(t.key, src);
                }
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
        el.style.visibility = 'hidden';
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
            return cargarTexturas(scene).then(function () {
                scene.dibujarTodo();
                el.style.visibility = '';
                return scene;
            });
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
