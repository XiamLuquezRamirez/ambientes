/**
 * PedniaCalle — "Toc, toc, ¿quién está?" (¿Dónde está el perro?, 3-4 años) en Phaser 4.2.1.
 *
 * Una calle con casitas. Cada vecino (perro, carro, pájaro…) vive en una casa.
 *   vecinos → están en la puerta de su casa, a la vista (reto del documento).
 *   puertas → entran y cierran; se asoman a ratos por la ventana. Tocar una casa
 *             hace "toc, toc", la puerta se abre y sale quien vive ahí.
 *   noche   → igual, pero a oscuras: por la ventana solo se ven siluetas.
 * Premio propio de este juego: el niño le lanza la pelota al perro, el perro la trae
 * y gana un hueso para su caseta.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, jugarPelota, guardarHueso,
 *      asomarVentana, resaltar, demo, limpiarDemo, rectDe, panDe, fiestaFinal, estado, destruir.
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

    var COLORES_CASA = [0xffa8a8, 0xffd8a8, 0xa5d8ff, 0xb2f2bb, 0xd0bfff];
    var COLORES_TECHO = [0xc92a2a, 0xe8590c, 0x1971c2, 0x2b8a3e, 0x6741d9];
    var FIESTA = [0xff6b6b, 0xfcc419, 0x51cf66, 0x339af0, 0xcc5de8, 0xff922b];
    var ESCENA = {
        fondo: 'img/fondo.svg',
        casas: ['img/casa_1.svg', 'img/casa_2.svg', 'img/casa_3.svg', 'img/casa_4.svg'],
        caseta: 'img/caseta.svg',
        hueso: 'img/hueso.svg',
        // Las nubes van recortadas del propio fondo para poder moverlas.
        nubes: ['img/nube_1.svg', 'img/nube_2.svg', 'img/nube_3.svg',
                'img/nube_4.svg', 'img/nube_5.svg', 'img/nube_6.svg']
    };
    // Coordenadas del FONDO.svg (1280×720): acera y proporción de props.
    var FONDO_W = 1280;
    var FONDO_H = 720;
    var FONDO_ACERA_Y = 555; // borde superior de la acera = pies de casas/caseta
    var CASA_DISENO_W = 280; // ancho objetivo de cada casa en el lienzo 1280
    var CASETA_DISENO_W = 100; // más chica que las casas (no al revés)
    function texEscena(parte) { return 'calle:escena:' + parte; }
    var ESCENA_V = "?v=20261113vida2";
    function encolarEscena(load) {
        function add(key, src) {
            if (!src) return;
            if (src.indexOf('?') === -1) src += ESCENA_V;
            load.image(key, src);
        }
        add(texEscena('fondo'), ESCENA.fondo);
        add(texEscena('caseta'), ESCENA.caseta);
        add(texEscena('hueso'), ESCENA.hueso);
        ESCENA.nubes.forEach(function (src, i) { add(texEscena('nube:' + i), src); });
        ESCENA.casas.forEach(function (src, i) { add(texEscena('casa:' + i), src); });
    }

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'calle:' + id;
    }

    /**
     * Poses ilustradas del perro (generadas para este juego): sentado en la puerta,
     * parado al caminar y con la pelota al traerla. Si faltan, se usa su imagen única.
     */
    var POSES = {
        perro: { sentado: 'img/perro_sentado.png?v=3', parado: 'img/perro_parado.png?v=3', pelota: 'img/perro_pelota.png?v=3' }
    };

    /**
     * Marioneta: cada pose del perro está separada en capas del mismo tamaño que la pose
     * (img/perro_<pose>_<pieza>.png). El cuerpo es la imagen que mueve el juego; la cabeza,
     * la cola y las patas lo siguen y giran sobre su pivote (en píxeles de la pose).
     * "atras" = se dibuja detrás del cuerpo.
     */
    var RIG = {
        perro: {
            // Sentado: las orejas van sueltas, cuelgan de la cabeza (giran con ella y se agitan).
            sentado: {
                w: 372, h: 512, cabeza: [180, 268], piezas: [],
                orejas: [{ n: 'orejaIzq', p: [88, 30], lado: -1 }, { n: 'orejaDer', p: [252, 32], lado: 1 }]
            },
            parado: {
                w: 306, h: 512, cabeza: [185, 205],
                piezas: [
                    { n: 'cola', p: [44, 302], atras: true },
                    { n: 'pataMedio', p: [150, 396], atras: true },
                    { n: 'pataAtras', p: [78, 396] },
                    { n: 'pataFrente', p: [222, 396] }
                ]
            },
            pelota: {
                w: 406, h: 512, cabeza: [232, 198],
                piezas: [
                    { n: 'cola', p: [62, 262], atras: true },
                    { n: 'pataAtras', p: [98, 338] },
                    { n: 'pataFrente', p: [256, 350] }
                ]
            }
        }
    };
    var RIG_V = '?v=2';
    /** Todas las cabezas tienen su versión con los ojos cerrados (parpadeo). */
    var OJOS = 'cabeza_ojos';

    /** Gira el punto (x, y) alrededor de (cx, cy) un ángulo en grados (horario, como Phaser). */
    function girar(x, y, cx, cy, grados) {
        var a = grados * Math.PI / 180;
        var c = Math.cos(a);
        var s = Math.sin(a);
        return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
    }

    function rigSrc(id, pose, pieza) {
        return 'img/' + id + '_' + pose + '_' + pieza + '.png' + RIG_V;
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

    function inyectarEstilo() {
        var doc = global.document;
        if (doc.getElementById('calle-css')) return;
        var css = doc.createElement('style');
        css.id = 'calle-css';
        css.textContent = [
            '#calle-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#calle-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-calle{background:#a5d8ff !important}',
            'body.modo-calle #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-calle #principal button,body.modo-calle .dialogo{pointer-events:auto}',
            'body.modo-calle .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-calle .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-calle .parque-fondo,body.modo-calle #zonas,body.modo-calle #elementos{display:none !important}',
            // Zoe/Zeus 3D no encajan con el arte plano de la calle: fuera del gameplay.
            'body.modo-calle .pj{display:none !important}',
            'body.modo-calle .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaCalle = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaCalle() {
            Phaser.Scene.call(this, { key: 'EscenaCalle' });
            this.casas = [];
            this.vecinos = {};
            this.nubes = [];
            this.huesos = [];
            this.modo = 'vecinos';
            this.objetivo = null;
            this.jugando = false;
            this.ocupada = false;
            this.ronda = 0;
            this.firma = '';
            this.noche = null;
            this.demoObj = null;
            this.pelota = null;
        },

        preload: function () {
            encolarEscena(this.load);
        },

        create: function () {
            this.fondoImg = null;
            this.cielo = this.add.graphics().setDepth(-30);
            this.sol = this.add.circle(0, 0, 10, 0xffd43b, 1).setDepth(-29).setVisible(false);
            this.fondo = this.add.graphics().setDepth(-25);
            this.via = this.add.graphics().setDepth(-5);
            this.faroles = this.add.graphics().setDepth(1);
            for (var i = 0; i < 3; i++) {
                var n = this.add.container(0, 0).setDepth(-28).setVisible(false);
                n.add(this.add.circle(-24, 6, 18, 0xffffff, 0.95));
                n.add(this.add.circle(0, -5, 26, 0xffffff, 0.95));
                n.add(this.add.circle(26, 6, 17, 0xffffff, 0.95));
                n.vel = 7 + i * 4;
                n.base = [0.2, 0.55, 0.85][i];
                n.alto = [0.16, 0.1, 0.2][i];
                this.nubes.push(n);
            }
            this.nubesArte = [];
            this.pajaros = [];
            this.mariposas = [];
            this.noche = this.add.rectangle(0, 0, 10, 10, 0x0b1d3a, 0).setOrigin(0).setDepth(6);
            // Escena solo tras cargarTexturas: evita flash del procedural viejo.
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.input.on('pointerdown', this.alTocar, this);
            var scene = this;
            this.scale.on('resize', function () {
                scene.dibujarFondo();
                scene.crearCaseta();
                scene.firma = '';
            });
        },

        shutdown: function () {
            this.tweens.killAll();
            if (sceneRef === this) sceneRef = null;
        },

        /** Mapa cover del FONDO.svg → pantalla. null si no hay textura. */
        mapaFondo: function () {
            if (!this.textures.exists(texEscena('fondo'))) return null;
            var w = this.scale.width;
            var h = this.scale.height;
            var esc = Math.max(w / FONDO_W, h / FONDO_H);
            var ox = (w - FONDO_W * esc) / 2;
            var oy = (h - FONDO_H * esc) / 2;
            return {
                esc: esc, ox: ox, oy: oy,
                sx: function (x) { return ox + x * esc; },
                sy: function (y) { return oy + y * esc; },
                suelo: function () { return oy + FONDO_ACERA_Y * esc; }
            };
        },

        suelo: function () {
            var m = this.mapaFondo();
            return m ? m.suelo() : this.scale.height * 0.76;
        },

        /* ── Escenario fijo: cielo, colinas, acera, calle, faroles ── */

        dibujarFondo: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var s = this.suelo();
            var g = this.cielo;
            var f = this.fondo;
            var v = this.via;
            g.clear();
            f.clear();
            v.clear();
            var keyFondo = texEscena('fondo');
            var m = this.mapaFondo();
            // El SVG de staging ya trae cielo, colinas, acera y calle: no pintar encima.
            if (m) {
                if (!this.fondoImg) this.fondoImg = this.add.image(0, 0, keyFondo).setOrigin(0).setDepth(-31);
                this.fondoImg.setVisible(true).setPosition(m.ox, m.oy).setScale(m.esc);
                this.sol.setVisible(false);
                this.nubes.forEach(function (n) { n.setVisible(false); });
                this.montarNubesArte(m);
                this.montarPajaros(m);
                this.montarMariposas(m);
                this.noche.setSize(w, h);
                return;
            }
            if (this.fondoImg) this.fondoImg.setVisible(false);
            this.nubesArte.forEach(function (n) { n.setVisible(false); });
            this.pajaros.forEach(function (p) { p.setVisible(false); });
            this.mariposas.forEach(function (b) { b.setVisible(false); });
            this.sol.setVisible(true);
            this.nubes.forEach(function (n) { n.setVisible(true); });
            for (var b = 0; b < 20; b++) {
                var c = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(0x74c0fc),
                    Phaser.Display.Color.ValueToColor(0xd0ebff), 100, Math.round(b / 19 * 100));
                g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
                g.fillRect(0, (s / 20) * b - 1, w, s / 20 + 2);
            }
            this.sol.setPosition(w * 0.92, h * 0.24).setRadius(Math.min(w, h) * 0.055);
            this.nubes.forEach(function (n) {
                if (!n.listo) { n.x = w * n.base; n.listo = true; }
                n.y = h * n.alto;
            });
            f.fillStyle(0x8ce99a, 1);
            f.fillEllipse(w * 0.25, s, w * 0.8, h * 0.34);
            f.fillEllipse(w * 0.8, s, w * 0.75, h * 0.28);
            f.fillStyle(0x40c057, 1);
            for (var t = 0; t < 7; t++) {
                var tx = w * (0.05 + t * 0.15);
                f.fillCircle(tx, s - h * 0.11, h * 0.05);
            }
            v.fillStyle(0xdee2e6, 1);
            v.fillRect(0, s, w, h * 0.06);
            v.fillStyle(0xadb5bd, 1);
            v.fillRect(0, s + h * 0.06, w, 4);
            v.fillStyle(0x495057, 1);
            v.fillRect(0, s + h * 0.06 + 4, w, h);
            v.fillStyle(0xffffff, 0.85);
            for (var x = 0; x < w; x += 70) v.fillRect(x, h * 0.92, 38, 6);
            this.noche.setSize(w, h);
        },

        /* ── Vida del escenario: nubes, pájaros y mariposas ──────── */

        /**
         * Las nubes salen del propio fondo (img/nube_N.svg, mismo lienzo 1280×720),
         * así que basta con ponerlas donde va el fondo y moverlas en horizontal.
         */
        montarNubesArte: function (m) {
            var w = this.scale.width;
            var scene = this;
            if (!this.nubesArte.length) {
                ESCENA.nubes.forEach(function (src, i) {
                    var clave = texEscena('nube:' + i);
                    if (!scene.textures.exists(clave)) return;
                    var im = scene.add.image(0, 0, clave).setOrigin(0).setDepth(-30.5);
                    // Las de arriba van más rápido; las bajas, más lentas (profundidad).
                    im.vel = 3.5 + (i % 3) * 2.2;
                    im.dx = 0;
                    scene.nubesArte.push(im);
                });
            }
            this.nubesArte.forEach(function (im) {
                im.setVisible(true).setScale(m.esc);
                im.ox = m.ox;
                im.oy = m.oy;
                im.anchoTotal = FONDO_W * m.esc;
                // Al reubicar (resize) se conserva lo que ya se había desplazado.
                im.setPosition(m.ox + im.dx, m.oy);
                im.limite = w + im.anchoTotal;
            });
        },

        /** Pájaros que cruzan el cielo: dos alas en V que baten (se leen a 20 px). */
        montarPajaros: function (m) {
            var scene = this;
            var h = this.scale.height;
            if (!this.pajaros.length) {
                for (var i = 0; i < 3; i++) {
                    var c = this.add.container(0, 0).setDepth(-29.5);
                    var g = this.add.graphics();
                    c.add(g);
                    c.dibujo = g;
                    c.fase = Math.random() * Math.PI * 2;
                    this.pajaros.push(c);
                }
            }
            this.pajaros.forEach(function (c, i) {
                c.setVisible(true);
                c.alto = m.sy(80 + i * 48);
                c.amplitud = Math.max(6, h * 0.012);
                c.tam = Math.max(7, 11 * m.esc);
                c.grosor = Math.max(2, 2.6 * m.esc);
                if (!c.x) c.x = -150 - i * scene.scale.width * 0.4;
                c.vel = 44 + i * 15;
                c.y = c.alto;
            });
        },

        /** Mariposas revoloteando sobre el pasto, delante de las casas. */
        montarMariposas: function (m) {
            var scene = this;
            if (!this.mariposas.length) {
                var tonos = [0xffd43b, 0xff8787, 0xffffff, 0xda77f2];
                for (var i = 0; i < 4; i++) {
                    var c = this.add.container(0, 0).setDepth(3.5);
                    var col = tonos[i % tonos.length];
                    // Cada lado son dos alas (grande arriba, chica abajo) que se pliegan.
                    var izq = this.add.container(0, 0);
                    izq.add(this.add.ellipse(-5, -3, 10, 8, col, 0.95));
                    izq.add(this.add.ellipse(-4, 3, 7, 6, col, 0.8));
                    var der = this.add.container(0, 0);
                    der.add(this.add.ellipse(5, -3, 10, 8, col, 0.95));
                    der.add(this.add.ellipse(4, 3, 7, 6, col, 0.8));
                    c.add(izq); c.add(der);
                    c.add(this.add.ellipse(0, 0, 2.5, 9, 0x495057, 1));
                    c.alaI = izq; c.alaD = der;
                    c.fase = Math.random() * Math.PI * 2;
                    this.mariposas.push(c);
                }
            }
            this.mariposas.forEach(function (c, i) {
                // Sobre el pasto, repartidas entre la caseta y el borde derecho.
                c.setVisible(true).setScale(Math.max(0.7, m.esc));
                c.bx = scene.scale.width * (0.22 + i * 0.2);
                c.by = m.sy(470 + (i % 2) * 40);
                c.rx = scene.scale.width * 0.07;
                c.ry = Math.max(14, 22 * m.esc);
            });
        },

        crearCaseta: function () {
            var w = this.scale.width;
            var s = this.suelo();
            var m = this.mapaFondo();
            var R;
            var x;
            if (m) {
                // Caseta auxiliar: nunca más ancha que ~16% del viewport.
                var targetW = Math.min(CASETA_DISENO_W * m.esc, w * 0.16);
                R = targetW / 2;
                x = Phaser.Math.Clamp(m.sx(110), R * 1.05, w * 0.18);
            } else {
                R = Phaser.Math.Clamp(Math.min(w, this.scale.height) * 0.08, 40, 70);
                x = Math.max(w * 0.07, R * 1.1);
            }
            if (this.caseta && this.caseta.cont) this.caseta.cont.destroy();
            var c = this.add.container(x, s).setDepth(3);
            var keyCaseta = texEscena('caseta');
            if (this.textures.exists(keyCaseta)) {
                var im = this.add.image(0, 0, keyCaseta).setOrigin(0.5, 1);
                var tw = m ? CASETA_DISENO_W * m.esc : R * 2.4;
                var th = m ? tw * 0.95 : R * 2.2;
                im.setScale(Math.min(tw / (im.width || 1), th / (im.height || 1)));
                c.add(im);
            } else {
                var g = this.add.graphics();
                g.fillStyle(0xc68642, 1);
                g.fillRect(-R, -R * 1.1, R * 2, R * 1.1);
                g.fillStyle(0xe03131, 1);
                g.fillTriangle(-R * 1.25, -R * 1.05, R * 1.25, -R * 1.05, 0, -R * 1.9);
                g.fillStyle(0x3b2a1a, 1);
                g.fillRoundedRect(-R * 0.45, -R * 0.75, R * 0.9, R * 0.75, { tl: R * 0.45, tr: R * 0.45, bl: 0, br: 0 });
                c.add(g);
            }
            this.caseta = { cont: c, x: x, y: s, R: R };
        },

        /* ── Casas ─────────────────────────────────────────────────── */

        construirCasas: function (n) {
            var w = this.scale.width;
            var h = this.scale.height;
            var firma = n + ':' + w + 'x' + h;
            if (firma === this.firma) return false;
            this.firma = firma;
            this.casas.forEach(function (c) { c.cont.destroy(); c.puerta.destroy(); c.ventana.destroy(); });
            this.casas = [];
            var s = this.suelo();
            var m = this.mapaFondo();
            var W;
            var H;
            var x0;
            var x1;
            if (m) {
                // Ancho de diseño, pero sin salir del viewport (cover recorta lados en móvil).
                // Priorizar casas grandes y legibles; caseta es secundaria.
                x1 = w * 0.97;
                var caseta = this.caseta;
                var huecoCaseta = caseta ? (caseta.x + caseta.R * 1.2) : (w * 0.16);
                x0 = Math.max(huecoCaseta + 8, w * 0.18);
                W = Math.min(CASA_DISENO_W * m.esc, (x1 - x0) / Math.max(n, 1) * 0.92);
                H = W * (394 / 430.82);
            } else {
                W = Math.min((w * 0.74) / n * 0.86, (h * 0.46) / 1.15, 300);
                H = W * 1.15;
                x0 = w * 0.2;
                x1 = w * 0.94;
            }
            var scene = this;
            for (var i = 0; i < n; i++) {
                var x = x0 + (x1 - x0) * (i + 0.5) / n;
                var cont = this.add.container(x, s).setDepth(2);
                var cuerpoH = H * 0.74;
                var keyCasa = texEscena('casa:' + (i % ESCENA.casas.length));
                var conArte = this.textures.exists(keyCasa);
                // Vano de la puerta medido sobre las casas ilustradas (img/casa_N.svg):
                // centro a +0.105 del ancho, 0.316 de ancho, 0.453 de alto, base a 0.121 del suelo.
                var pW = conArte ? W * 0.316 : W * 0.44;
                var pH = conArte ? H * 0.453 : H * 0.6;
                var dx = conArte ? W * 0.105 : -W * 0.16;
                var puertaY = conArte ? (s - H * 0.121) : s;
                if (conArte) {
                    var him = this.add.image(0, 0, keyCasa).setOrigin(0.5, 1);
                    him.setScale(Math.min(W / (him.width || 1), H / (him.height || 1)));
                    cont.add(him);
                } else {
                    var g = this.add.graphics();
                    g.fillStyle(COLORES_CASA[i % COLORES_CASA.length], 1);
                    g.fillRect(-W / 2, -cuerpoH, W, cuerpoH);
                    g.fillStyle(COLORES_TECHO[i % COLORES_TECHO.length], 1);
                    g.fillTriangle(-W * 0.6, -cuerpoH + 2, W * 0.6, -cuerpoH + 2, 0, -H);
                    g.fillStyle(0x868e96, 1);
                    g.fillRect(W * 0.22, -H * 0.97, W * 0.12, H * 0.2);
                    g.fillStyle(0x3b2a1a, 1);
                    g.fillRect(dx - pW / 2, -pH, pW, pH);
                    g.fillStyle(0xffffff, 0.9);
                    g.fillRect(dx - pW / 2 - 4, -pH - 4, pW + 8, 4);
                    cont.add(g);
                }

                // Procedural: puerta dibujada. Arte: contenedor vacío (la puerta ya está en el SVG).
                // dx ya es el centro del vano (medido sobre la ilustración).
                var puerta = this.add.container(conArte ? (x + dx) : (x + dx - pW / 2), puertaY).setDepth(5);
                if (!conArte) {
                    var pg = this.add.graphics();
                    pg.fillStyle(0x8d5a2b, 1);
                    pg.fillRoundedRect(0, -pH, pW, pH, 6);
                    pg.lineStyle(3, 0x6b4220, 1);
                    pg.strokeRect(pW * 0.15, -pH * 0.85, pW * 0.7, pH * 0.32);
                    pg.strokeRect(pW * 0.15, -pH * 0.45, pW * 0.7, pH * 0.32);
                    pg.fillStyle(0xffd43b, 1);
                    pg.fillCircle(pW * 0.82, -pH * 0.48, pW * 0.06);
                    puerta.add(pg);
                }

                // Vidrio medido sobre casa_N.svg (lienzo 500): x 117-211, y 238-330.
                // Centro a -0.171 del ancho y a 0.432 del alto desde la base; lado 0.19.
                var vs = conArte ? W * 0.19 : W * 0.26;
                var vx = conArte ? (x - W * 0.171) : (x + W * 0.27);
                var vy = conArte ? (s - H * 0.432) : (s - H * 0.5);
                var ventana = this.add.container(vx, vy).setDepth(5);
                var vg = this.add.graphics();
                // Con arte la ventana ya viene pintada: no taparla con un cuadrado blanco.
                if (!conArte) {
                    vg.fillStyle(0xe7f5ff, 1);
                    vg.fillRect(-vs / 2, -vs / 2, vs, vs);
                    vg.lineStyle(4, 0xffffff, 1);
                    vg.strokeRect(-vs / 2, -vs / 2, vs, vs);
                }
                ventana.add(vg);
                // Con arte la luz es un resplandor DETRAS del vidrio pintado, no un bloque
                // opaco encima: si no, de noche tapa la ventana de la ilustracion.
                var luz = this.add.rectangle(0, 0, vs - 6, vs - 6, 0xffe066, 0);
                if (conArte) luz.setBlendMode(Phaser.BlendModes.ADD);
                ventana.add(luz);
                var marco = this.add.graphics();
                if (!conArte) {
                    marco.lineStyle(3, 0xffffff, 1);
                    marco.lineBetween(0, -vs / 2, 0, vs / 2);
                    marco.lineBetween(-vs / 2, 0, vs / 2, 0);
                }
                ventana.add(marco);

                scene.casas.push({
                    i: i, x: x, px: x + dx, suelo: s, umbral: puertaY, W: W, H: H, pW: pW, pH: pH, vs: vs, vx: vx, vy: vy,
                    cont: cont, puerta: puerta, ventana: ventana, luz: luz, marco: marco,
                    ocupante: null, abierta: false, asomo: null, arte: conArte
                });
            }
            this.dibujarFaroles();
            return true;
        },

        dibujarFaroles: function () {
            var f = this.faroles;
            f.clear();
            // El fondo staging ya arma la calle: no clavar postes encima.
            if (this.textures.exists(texEscena('fondo'))) return;
            var s = this.suelo();
            var h = this.scale.height;
            var scene = this;
            this.casas.forEach(function (c, i) {
                if (i === scene.casas.length - 1) return;
                var x = (c.x + scene.casas[i + 1].x) / 2;
                f.fillStyle(0x343a40, 1);
                f.fillRect(x - 3, s - h * 0.3, 6, h * 0.3 + h * 0.03);
                f.fillStyle(0xffe066, 1);
                f.fillCircle(x, s - h * 0.31, 9);
            });
        },

        /* ── Vecinos ───────────────────────────────────────────────── */

        crearVecino: function (id) {
            if (this.vecinos[id]) return this.vecinos[id];
            var img = this.add.image(-200, this.suelo(), this.texImg(id, 'sentado')).setOrigin(0.5, 1).setDepth(4);
            var v = {
                id: id, img: img, casa: null, estado: 'calle', escala: 1, size: 100, respira: false, pose: 'sentado',
                // Marioneta: paso al caminar, ladeo de cabeza, alegría (cola rápida) y ladrido.
                paso: 0, andando: false, ladeo: 0, ladrido: 0, felizHasta: 0, proxLadeo: 0,
                // Parpadeo, orejas con inercia y agacharse antes de arrancar a correr.
                proxParpadeo: 0, parpadeoHasta: 0, orejaAng: 0, orejaVel: 0, cabezaPrevia: null,
                proxRespingo: 0, respingo: 0, respingoLado: 1, agacha: 0
            };
            this.vecinos[id] = v;
            return v;
        },

        texPose: function (id, pose) {
            var k = tex(id) + ':' + pose;
            return this.textures.exists(k) ? k : tex(id);
        },

        /** Textura del sprite principal: el cuerpo de la marioneta si la pose la tiene. */
        texImg: function (id, pose) {
            var k = tex(id) + ':' + pose + ':cuerpo';
            return RIG[id] && RIG[id][pose] && this.textures.exists(k) ? k : this.texPose(id, pose);
        },

        /* ── Marioneta: cabeza, cola y patas que se mueven sobre el cuerpo ── */

        armarMarioneta: function (v, pose) {
            var cfg = RIG[v.id] && RIG[v.id][pose];
            if (v.rig && v.rig.pose === pose) return v.rig;
            if (v.rig) { v.rig.atras.destroy(); v.rig.frente.destroy(); v.rig = null; }
            if (!cfg) return null;
            var scene = this;
            var base = tex(v.id) + ':' + pose + ':';
            var rig = { pose: pose, cfg: cfg, atras: this.add.container(0, 0), frente: this.add.container(0, 0), piezas: {} };
            function pieza(nombre, piv, cont) {
                if (!scene.textures.exists(base + nombre)) return null;
                // Posición local respecto al origen del cuerpo (centro de abajo); gira en su pivote.
                var im = scene.add.image(piv[0] - cfg.w / 2, piv[1] - cfg.h, base + nombre)
                    .setOrigin(piv[0] / cfg.w, piv[1] / cfg.h);
                cont.add(im);
                return im;
            }
            cfg.piezas.forEach(function (p) { rig.piezas[p.n] = pieza(p.n, p.p, p.atras ? rig.atras : rig.frente); });
            rig.cabeza = pieza('cabeza', cfg.cabeza, rig.frente);
            rig.texCabeza = base + 'cabeza';
            rig.texOjos = this.textures.exists(base + OJOS) ? base + OJOS : null;
            // Orejas encima de la cabeza; su posición se recalcula al girar la cabeza.
            rig.orejas = (cfg.orejas || []).map(function (o) {
                var im = pieza(o.n, o.p, rig.frente);
                return im ? { im: im, cfg: o } : null;
            }).filter(Boolean);
            v.rig = rig;
            return rig;
        },

        /** Copia la posición del cuerpo a las piezas y les da su movimiento. */
        moverMarioneta: function (v, time) {
            var img = v.img;
            var conRig = /:cuerpo$/.test(img.texture.key);
            var rig = conRig ? this.armarMarioneta(v, v.pose) : null;
            if (!rig) {
                if (v.rig) { v.rig.atras.setVisible(false); v.rig.frente.setVisible(false); }
                return;
            }
            var flip = img.flipX ? -1 : 1;
            [rig.atras, rig.frente].forEach(function (c, i) {
                c.setPosition(img.x, img.y);
                c.setScale(img.scaleX * flip, img.scaleY);
                c.angle = img.angle;
                c.setAlpha(img.alpha);
                c.setVisible(img.visible);
                c.setDepth(img.depth + (i ? 0.001 : -0.001));
                c.list.forEach(function (o) {
                    if (img.isTinted) o.setTint(img.tintTopLeft); else o.clearTint();
                });
            });
            if (!img.visible || reducido()) return;
            var feliz = time < v.felizHasta;
            var P = rig.piezas;
            // Cola: siempre se mueve; rápida y amplia si camina o está contento.
            if (P.cola) P.cola.angle = Math.sin(time / (feliz || v.andando ? 70 : 220)) * (feliz || v.andando ? 22 : 9);
            if (v.andando) {
                // Trote: la pata de atrás y la delantera lejana van juntas; la delantera cercana, al revés.
                var s = Math.sin(v.paso);
                if (P.pataAtras) P.pataAtras.angle = s * 13;
                if (P.pataMedio) P.pataMedio.angle = s * 11;
                if (P.pataFrente) P.pataFrente.angle = -s * 13;
                // La cabeza se mantiene firme aunque el cuerpo se meza (compensa su giro).
                if (rig.cabeza) rig.cabeza.angle = Math.sin(v.paso * 2) * 2.5 - 2 - img.angle * 0.6 * flip + v.agacha * 10;
            } else {
                ['pataAtras', 'pataMedio', 'pataFrente'].forEach(function (n) { if (P[n]) P[n].angle *= 0.8; });
                if (rig.cabeza) {
                    // Quieto: mira a los lados despacio y a ratos ladea la cabeza, curioso.
                    if (time > v.proxLadeo) {
                        v.proxLadeo = time + rnd(2600, 5200);
                        this.tweens.add({ targets: v, ladeo: (Math.random() < 0.5 ? -1 : 1) * rnd(7, 11), duration: 260, ease: 'Sine.easeOut', yoyo: true, hold: rnd(700, 1300) });
                    }
                    var mira = Math.sin(time / 1900) * 2.5;
                    // Al ladrar, la cabeza da un tirón hacia arriba; agachado, mira al suelo.
                    rig.cabeza.angle = mira + v.ladeo - v.ladrido * 9 - img.angle * 0.6 * flip + v.agacha * 10;
                }
            }
            if (!rig.cabeza) return;
            // Parpadeo: cada pocos segundos (a veces doble), ojos cerrados un instante.
            if (rig.texOjos) {
                if (time > v.proxParpadeo) {
                    v.parpadeoHasta = time + 120;
                    v.proxParpadeo = time + (Math.random() < 0.2 ? 280 : rnd(2200, 4800));
                }
                var tc = time < v.parpadeoHasta ? rig.texOjos : rig.texCabeza;
                if (rig.cabeza.texture.key !== tc) rig.cabeza.setTexture(tc);
            }
            this.moverOrejas(v, rig, time);
        },

        /**
         * Orejas sueltas: cuelgan de la cabeza con un poco de inercia (se balancean cuando
         * la cabeza gira), se sacuden hacia afuera al ladrar y a ratos una da un respingo.
         */
        moverOrejas: function (v, rig, time) {
            if (!rig.orejas.length) return;
            var cab = rig.cabeza.angle;
            var cfg = rig.cfg;
            var giro = cab - (v.cabezaPrevia == null ? cab : v.cabezaPrevia);
            v.cabezaPrevia = cab;
            // Resorte amortiguado: la oreja va "detrás" del giro de la cabeza.
            v.orejaVel += -giro * 0.9 - v.orejaAng * 0.16;
            v.orejaVel *= 0.8;
            v.orejaAng += v.orejaVel;
            if (time > v.proxRespingo) {
                v.proxRespingo = time + rnd(3500, 7500);
                v.respingoLado = Math.random() < 0.5 ? -1 : 1;
                this.tweens.add({ targets: v, respingo: 1, duration: 90, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            }
            rig.orejas.forEach(function (o) {
                var q = girar(o.cfg.p[0], o.cfg.p[1], cfg.cabeza[0], cfg.cabeza[1], cab);
                o.im.setPosition(q[0] - cfg.w / 2, q[1] - cfg.h);
                // Afuera = la punta se aleja de la cara (izquierda gira a favor del reloj).
                var afuera = -o.cfg.lado;
                var tic = o.cfg.lado === v.respingoLado ? v.respingo * 9 : 0;
                o.im.angle = cab + v.orejaAng + afuera * (v.ladrido * 8 + tic);
            });
        },

        /** El perro ladra a la vista: tirón de cabeza y el cuerpo se encoge un instante. */
        ladrar: function (id) {
            var v = this.vecinos[id];
            if (!v || !v.img.visible || reducido()) return;
            var scene = this;
            this.tweens.add({ targets: v, ladrido: 1, duration: 90, yoyo: true, repeat: 1, ease: 'Quad.easeOut', onComplete: function () { v.ladrido = 0; } });
            if (!v.andando) {
                v.respira = false;
                var sy = v.escala;
                this.tweens.add({
                    targets: v.img, scaleY: sy * 0.93, duration: 90, yoyo: true, repeat: 1,
                    onComplete: function () { v.img.setScale(v.escala); if (v.estado !== 'calle' || !v.andando) v.respira = true; }
                });
            }
            v.felizHasta = Math.max(v.felizHasta, scene.time.now + 900);
        },

        /**
         * Anticipación antes de correr: mira hacia la pelota, se agacha (el cuerpo se
         * encoge y la cabeza baja) y suelta el impulso al arrancar.
         */
        agacharse: function (v, haciaX) {
            var scene = this;
            if (reducido()) return esperar(this, 500);
            if (v.pose !== 'pelota') this.ponerPose(v, 'parado');
            v.respira = false;
            v.img.setFlipX(haciaX < v.img.x);
            var e = v.escala;
            return esperar(this, 260).then(function () {
                return new Promise(function (r) {
                    scene.tweens.add({ targets: v, agacha: 1, duration: 240, ease: 'Quad.easeOut' });
                    scene.tweens.add({ targets: v.img, scaleY: e * 0.88, scaleX: e * 1.04, duration: 240, ease: 'Quad.easeOut', onComplete: r });
                });
            }).then(function () {
                // Suelta el resorte mientras ya corre.
                scene.tweens.add({ targets: v, agacha: 0, duration: 160, ease: 'Quad.easeIn' });
                scene.tweens.add({ targets: v.img, scaleY: e, scaleX: e, duration: 160, ease: 'Back.easeOut' });
            });
        },

        /**
         * Frenado al llegar: patina un poco hacia adelante con el cuerpo echado atrás y
         * se endereza. dir = 1 si venía hacia la derecha, -1 si hacia la izquierda.
         */
        frenar: function (v, dir, fuerza) {
            var scene = this;
            if (reducido()) return Promise.resolve();
            var f = fuerza || 1;
            v.img.setFlipX(dir < 0);
            v.respira = false;
            var x0 = v.img.x;
            return new Promise(function (r) {
                scene.tweens.add({ targets: v.img, x: x0 + dir * v.size * 0.14 * f, duration: 240, ease: 'Quad.easeOut' });
                scene.tweens.add({
                    targets: v.img, angle: { from: -dir * 9 * f, to: 0 }, duration: 320, ease: 'Back.easeOut',
                    onComplete: function () { v.img.setFlipX(false); v.respira = true; r(); }
                });
            });
        },

        /** Cambia de pose conservando el alto en pantalla (las poses tienen distinto ancho). */
        ponerPose: function (v, pose) {
            var k = this.texImg(v.id, pose);
            v.pose = pose;
            if (v.img.texture.key === k) return;
            var alto = v.size || v.img.displayHeight;
            v.img.setTexture(k);
            v.escala = alto / (v.img.height || 1);
            v.img.setScale(v.escala);
            v.ancho = v.img.width * v.escala;
            v.size = alto;
        },

        /**
         * Tamaño para caber DENTRO del hueco de la puerta (ancho y alto): una vaca o un
         * carro son más anchos que altos y no deben salirse sobre la pared.
         */
        medir: function (v, casa) {
            var anchoMax;
            var altoMax;
            if (casa && casa.arte) {
                // Dentro del vano de la puerta ilustrada, sin salirse sobre la pared.
                anchoMax = casa.pW * 0.92;
                altoMax = casa.pH * 0.9;
            } else if (casa) {
                anchoMax = casa.pW * 0.9;
                altoMax = casa.pH * 0.88;
            } else {
                var m = this.mapaFondo();
                anchoMax = m ? 90 * m.esc : this.scale.width * 0.14;
                altoMax = m ? 110 * m.esc : this.scale.height * 0.18;
            }
            var w = v.img.width || 1;
            var h = v.img.height || 1;
            v.escala = Math.min(anchoMax / w, altoMax / h);
            v.img.setScale(v.escala);
            v.ancho = w * v.escala;
            v.size = h * v.escala;
        },

        caminar: function (v, x, ms) {
            var scene = this;
            var desde = v.img.x;
            if (Math.abs(desde - x) < 2) return Promise.resolve();
            // De pie para caminar (salvo que lleve la pelota); mira hacia donde va.
            if (v.pose !== 'pelota') this.ponerPose(v, 'parado');
            v.respira = false;
            v.andando = true;
            v.ultimoDir = x < desde ? -1 : 1;
            v.img.setFlipX(x < desde);
            var y0 = v.img.y;
            var p = { t: 0 };
            var dur = ms || Phaser.Math.Clamp(Math.abs(x - desde) * 2.2, 500, 1600);
            var pasos = Math.max(2, dur / 200);
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: p, t: 1, duration: reducido() ? 1 : dur, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        v.img.x = Phaser.Math.Linear(desde, x, p.t);
                        // Pasitos: rebota en cada paso y se balancea de una pata a otra.
                        var fase = p.t * Math.PI * pasos;
                        v.paso = fase;
                        if (RIG[v.id] && /:cuerpo$/.test(v.img.texture.key)) {
                            // Marioneta: las patas dan el paso; el cuerpo sube un poco en cada
                            // apoyo. Con la pelota va al galope: se mece adelante y atrás.
                            var galope = v.pose === 'pelota';
                            v.img.y = y0 - Math.abs(Math.sin(fase)) * v.size * (galope ? 0.08 : 0.025);
                            v.img.angle = galope ? Math.sin(fase) * 5 * (v.img.flipX ? -1 : 1) : 0;
                            return;
                        }
                        v.img.y = y0 - Math.abs(Math.sin(fase)) * v.size * 0.07;
                        v.img.angle = Math.sin(fase) * 4;
                    },
                    onComplete: function () {
                        v.img.y = y0;
                        v.img.angle = 0;
                        v.img.setFlipX(false);
                        v.respira = true;
                        v.andando = false;
                        resolve();
                    }
                });
            });
        },

        abrir: function (casa) {
            if (casa.abierta) return Promise.resolve();
            casa.abierta = true;
            sfx('puerta');
            var scene = this;
            if (casa.arte) {
                // Arte: la ilustración ya trae la puerta; solo marcamos abierta (el vecino sale al frente).
                return Promise.resolve();
            }
            // Procedural: gira sobre la bisagra hacia afuera.
            return new Promise(function (resolve) {
                scene.tweens.add({ targets: casa.puerta, scaleX: -0.32, duration: reducido() ? 1 : 260, ease: 'Quad.easeOut', onComplete: resolve });
            });
        },

        cerrar: function (casa) {
            if (!casa.abierta) return Promise.resolve();
            casa.abierta = false;
            var scene = this;
            if (casa.arte) return Promise.resolve();
            return new Promise(function (resolve) {
                scene.tweens.add({ targets: casa.puerta, scaleX: 1, duration: reducido() ? 1 : 240, ease: 'Quad.easeIn', onComplete: resolve });
            });
        },

        /** El vecino sale (o se queda) en la puerta de su casa. */
        mostrarEnPuerta: function (v) {
            var casa = this.casas[v.casa];
            // En la puerta espera sentado (si tiene esa pose) y respira.
            v.img.setTexture(this.texImg(v.id, 'sentado'));
            v.pose = 'sentado';
            v.respira = true;
            this.medir(v, casa);
            // Centrado en el umbral (arte: puerta levantada; procedural: al ras del suelo).
            v.img.setPosition(casa.px, (casa.umbral || casa.suelo) - 2).setVisible(true).setAlpha(1);
            v.img.angle = 0;
            v.img.setFlipX(false);
            v.img.setDepth(this.modo === 'noche' ? 7.5 : 4);
            v.img.clearTint();
            v.estado = 'puerta';
        },

        /* ── Rondas ───────────────────────────────────────────────── */

        /**
         * Los vecinos salen a la calle, caminan a su casa nueva (el perro nunca repite casa)
         * y, según el modo, se quedan en la puerta o entran y cierran.
         */
        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.modo = o.modo || 'vecinos';
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            this.ritmo = o.dificultad === '56' ? [1100, 2600] : [1500, 3200];
            var ids = o.elementos.slice();
            var rehecho = this.construirCasas(ids.length);

            // De noche la calle se oscurece antes de que entren (se ven en silueta).
            this.tweens.add({ targets: this.noche, fillAlpha: this.modo === 'noche' ? 0.62 : 0, duration: 900 });
            this.casas.forEach(function (c) {
                // Con arte la luz va DETRAS del vidrio pintado (resplandor); sin arte,
                // la ventana dibujada sube por encima de la capa de noche.
                // La luz va sobre el vidrio pintado, en mezcla aditiva: lo enciende
                // sin taparlo (un rectangulo opaco borraba la ventana ilustrada).
                c.luz.setFillStyle(0xffe066, scene.modo === 'noche' ? (c.arte ? 0.5 : 0.9) : 0);
                c.ventana.setDepth(scene.modo === 'noche' ? 7 : 5);
                c.resaltada = false;
            });

            var previa = this.vecinos[o.objetivo] && this.vecinos[o.objetivo].casa;
            var reparto = null;
            for (var k = 0; k < 20; k++) {
                reparto = mezclar(this.casas.map(function (c) { return c.i; }));
                if (rehecho || reparto[ids.indexOf(o.objetivo)] !== previa) break;
            }

            ids.forEach(function (id) { scene.crearVecino(id); });
            Object.keys(this.vecinos).forEach(function (id) {
                if (ids.indexOf(id) === -1) scene.vecinos[id].img.setVisible(false);
            });

            var s = this.suelo();
            var salidas = ids.map(function (id) {
                var v = scene.vecinos[id];
                var vieja = v.casa != null && !rehecho ? scene.casas[v.casa] : null;
                // Sale de su casa vieja (si estaba dentro) o entra desde la calle.
                if (vieja && v.estado !== 'calle') {
                    scene.mostrarEnPuerta(v);
                    return scene.abrir(vieja);
                }
                if (v.estado !== 'calle' || v.img.x < 0) {
                    v.img.setPosition(-80 - Math.random() * 120, s).setVisible(true);
                    scene.medir(v, scene.casas[0]);
                }
                return Promise.resolve();
            });

            return Promise.all(salidas).then(function () {
                scene.casas.forEach(function (c) { c.ocupante = null; });
                return Promise.all(ids.map(function (id, n) {
                    var v = scene.vecinos[id];
                    var casa = scene.casas[reparto[n]];
                    v.casa = casa.i;
                    casa.ocupante = id;
                    v.estado = 'calle';
                    v.img.setDepth(scene.modo === 'noche' ? 7.5 : 4.5);
                    if (scene.modo === 'noche') v.img.setTint(0x1b2a44);
                    return esperar(scene, n * 180).then(function () {
                        sfx('pop');
                        v.img.y = s; // vuelve a la acera (tras la pelota estaba en la calle)
                        return scene.caminar(v, casa.px);
                    }).then(function () {
                        scene.medir(v, casa);
                        if (scene.modo === 'vecinos') {
                            scene.mostrarEnPuerta(v);
                            return scene.abrir(casa);
                        }
                        // Entra y cierra la puerta.
                        v.estado = 'dentro';
                        v.img.setVisible(false);
                        return scene.cerrar(casa);
                    });
                }));
            }).then(function () {
                // Las puertas viejas que quedaron abiertas se cierran.
                return Promise.all(scene.casas.map(function (c) {
                    var v = c.ocupante && scene.vecinos[c.ocupante];
                    if (scene.modo !== 'vecinos' || !v) return scene.cerrar(c);
                    return Promise.resolve();
                }));
            });
        },

        jugar: function () {
            var scene = this;
            var ahora = this.time.now;
            this.casas.forEach(function (c, i) { c.proxAsomo = ahora + 600 + i * rnd(500, 1300); });
            this.jugando = true;
        },

        pausar: function () {
            this.jugando = false;
        },

        update: function (time, delta) {
            var w = this.scale.width;
            var dt = delta / 1000;
            this.nubes.forEach(function (n) {
                n.x += n.vel * dt;
                if (n.x > w + 80) n.x = -80;
            });
            var scene = this;
            if (!reducido()) {
                // Nubes del arte: se arrastran y vuelven a entrar por la izquierda.
                this.nubesArte.forEach(function (im) {
                    if (!im.visible) return;
                    im.dx += im.vel * dt;
                    if (im.dx > im.limite) im.dx = -im.anchoTotal;
                    im.x = im.ox + im.dx;
                });
                // Pájaros: cruzan ondulando y baten las alas (la V se abre y se cierra).
                this.pajaros.forEach(function (c) {
                    if (!c.visible) return;
                    c.x += c.vel * dt;
                    if (c.x > w + 140) c.x = -140;
                    c.y = c.alto + Math.sin(time / 520 + c.fase) * c.amplitud;
                    var bate = Math.sin(time / 130 + c.fase);
                    var alto = c.tam * (0.25 + 0.75 * Math.abs(bate)) * (bate < 0 ? -0.45 : 1);
                    var g = c.dibujo;
                    g.clear();
                    g.lineStyle(c.grosor, 0x4a5568, 0.9);
                    g.beginPath();
                    g.moveTo(-c.tam, 0);
                    g.lineTo(0, -alto);
                    g.lineTo(c.tam, 0);
                    g.strokePath();
                });
                // Mariposas: dan vueltas lentas sobre el pasto y abren y cierran las alas.
                this.mariposas.forEach(function (c) {
                    if (!c.visible) return;
                    var a = time / 1600 + c.fase;
                    c.x = c.bx + Math.cos(a) * c.rx;
                    c.y = c.by + Math.sin(a * 1.7) * c.ry;
                    var abre = 0.35 + 0.65 * Math.abs(Math.sin(time / 90 + c.fase));
                    c.alaI.scaleX = abre;
                    c.alaD.scaleX = abre;
                });
            }
            this.casas.forEach(function (c) {
                if (c.resaltada) c.cont.setAlpha(0.75 + 0.25 * Math.sin(time / 150));
                else c.cont.setAlpha(1);
            });
            if (this.pelotaInvita && this.pelota) this.pelota.setScale(this.pelota.base * (1 + 0.08 * Math.sin(time / 120)));
            // Quietos, respiran: el cuerpo sube y baja un poco (no parecen una foto).
            if (!reducido()) {
                Object.keys(this.vecinos).forEach(function (id) {
                    var v = scene.vecinos[id];
                    if (v.respira && v.img.visible) v.img.setScale(v.escala, v.escala * (1 + 0.025 * Math.sin(time / 380 + v.size)));
                });
            }
            Object.keys(this.vecinos).forEach(function (id) { if (RIG[id]) scene.moverMarioneta(scene.vecinos[id], time); });
            if (!this.jugando || this.modo === 'vecinos') return;
            // Los vecinos se asoman a ratos por la ventana.
            this.casas.forEach(function (c) {
                if (!c.ocupante || c.abierta || c.asomo || time < c.proxAsomo) return;
                scene.asomar(c, false);
                c.proxAsomo = time + rnd(scene.ritmo[0], scene.ritmo[1]) + 1300;
            });
        },

        /** El vecino aparece en su ventana un momento (silueta de noche, salvo pista). */
        asomar: function (casa, color) {
            var v = this.vecinos[casa.ocupante];
            if (!v || casa.asomo) return;
            var mini = this.add.image(casa.vx, casa.vy + casa.vs * 0.5, this.texPose(v.id, 'sentado')).setOrigin(0.5, 1).setDepth(casa.ventana.depth + 0.01);
            mini.setScale((casa.vs * 0.8) / (Math.max(mini.width, mini.height) || 1));
            if (this.modo === 'noche' && !color) mini.setTint(0x1b2a44);
            casa.asomo = mini;
            var y0 = mini.y;
            mini.y = y0 + casa.vs * 0.5;
            mini.setAlpha(0);
            var scene = this;
            this.tweens.add({
                targets: mini, y: y0, alpha: 1, duration: 260, ease: 'Back.easeOut',
                onComplete: function () {
                    scene.time.delayedCall(1300, function () {
                        scene.tweens.add({
                            targets: mini, y: y0 + casa.vs * 0.5, alpha: 0, duration: 220,
                            onComplete: function () { mini.destroy(); casa.asomo = null; }
                        });
                    });
                }
            });
        },

        asomarVentana: function (id) {
            var v = this.vecinos[id];
            if (v && v.casa != null) this.asomar(this.casas[v.casa], true);
        },

        resaltar: function (id, si) {
            var v = this.vecinos[id];
            if (v && v.casa != null) this.casas[v.casa].resaltada = !!si;
        },

        /* ── Toques ───────────────────────────────────────────────── */

        alTocar: function (pointer) {
            var px = pointer.worldX;
            var py = pointer.worldY;
            if (this.pelotaInvita && this.pelota &&
                Phaser.Math.Distance.Between(px, py, this.pelota.x, this.pelota.y) < Math.max(50, this.pelota.displayWidth)) {
                this.lanzar();
                return;
            }
            if (!this.jugando || this.ocupada || !puedeTocar()) return;
            for (var i = 0; i < this.casas.length; i++) {
                var c = this.casas[i];
                if (Math.abs(px - c.x) < c.W * 0.55 && py > c.suelo - c.H && py < c.suelo + 10) {
                    if (this.modo === 'vecinos') {
                        var v = this.vecinos[c.ocupante];
                        if (v && Math.abs(px - c.px) < Math.max(c.pW * 0.6, (v.ancho || v.size) * 0.6) && py > c.suelo - c.pH - 10) this.responder(c);
                    } else {
                        this.tocarPuerta(c);
                    }
                    return;
                }
            }
        },

        /** "Toc, toc": la puerta tiembla, se abre y sale quien vive ahí. */
        tocarPuerta: function (casa) {
            var scene = this;
            if (casa.abierta || !casa.ocupante) return;
            this.ocupada = true;
            sfx('toc');
            if (!reducido()) {
                this.tweens.add({ targets: casa.puerta, x: casa.puerta.x + 4, duration: 50, yoyo: true, repeat: 3 });
            }
            this.time.delayedCall(480, function () {
                var v = scene.vecinos[casa.ocupante];
                scene.mostrarEnPuerta(v);
                scene.abrir(casa).then(function () { scene.responder(casa); });
            });
        },

        responder: function (casa) {
            var scene = this;
            var v = this.vecinos[casa.ocupante];
            if (!v) { this.ocupada = false; return; }
            if (v.id === this.objetivo) {
                this.jugando = false;
                this.ocupada = false;
                avisar('onAcierto', v.id);
                return;
            }
            // No era: saluda, suena como es y vuelve a entrar.
            this.ocupada = true;
            if (!reducido()) {
                this.tweens.add({ targets: v.img, angle: { from: -10, to: 10 }, duration: 90, yoyo: true, repeat: 4, onComplete: function () { v.img.angle = 0; } });
            }
            avisar('onError', v.id, { pan: this.panDe(v.id) });
            this.time.delayedCall(1700, function () {
                if (scene.modo === 'vecinos') {
                    scene.ocupada = false;
                    return;
                }
                v.img.setVisible(false);
                v.estado = 'dentro';
                scene.cerrar(casa).then(function () { scene.ocupada = false; });
            });
        },

        /* ── Premio: la pelota y la caseta ───────────────────────── */

        celebrar: function (id) {
            var v = this.vecinos[id] || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!v) return Promise.resolve();
            var scene = this;
            this.estrellas(v.img.x, v.img.y - v.size / 2, 18);
            if (this.modo === 'noche') {
                // De noche, el que se encuentra se ilumina.
                v.img.clearTint();
                var luz = this.add.circle(v.img.x, v.img.y - v.size / 2, v.size * 0.8, 0xffe066, 0.35).setDepth(7.4);
                this.tweens.add({ targets: luz, alpha: 0, delay: 1200, duration: 400, onComplete: function () { luz.destroy(); } });
            }
            // Contento: mueve la cola rápido mientras salta.
            v.felizHasta = this.time.now + 2200;
            if (!reducido()) {
                this.tweens.add({ targets: v.img, y: v.img.y - v.size * 0.45, duration: 260, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            }
            return esperar(scene, 1300);
        },

        /** El perro sale a la calle; el niño le lanza la pelota y él la trae. */
        jugarPelota: function (id) {
            var scene = this;
            var v = this.vecinos[id];
            if (!v) return Promise.resolve();
            var w = this.scale.width;
            var h = this.scale.height;
            var casa = this.casas[v.casa];
            v.estado = 'calle';
            // Baja del todo a la calzada: los pies tan abajo que la cabeza quede bajo la acera
            // (si no, se queda montado sobre la acera y tapando su puerta).
            var carril = Math.min(h * 0.985, this.suelo() + h * 0.06 + v.size + 10);
            this.carril = carril;
            v.img.setDepth(8);
            // El botón de escuchar ocupa el centro de abajo: el perro baja a un lado de él.
            var margenBoton = Math.max(110, w * 0.11) + (v.ancho || v.size) / 2;
            var abajoX = casa.px;
            if (Math.abs(abajoX - w / 2) < margenBoton) abajoX = w / 2 + (abajoX < w / 2 ? -1 : 1) * margenBoton;
            return this.caminar(v, casa.px, 1).then(function () {
                return new Promise(function (r) {
                    v.img.setFlipX(abajoX < v.img.x);
                    scene.tweens.add({
                        targets: v.img, y: carril, x: abajoX, duration: reducido() ? 1 : 520, ease: 'Quad.easeIn',
                        onComplete: function () { v.img.setFlipX(false); r(); }
                    });
                });
            }).then(function () {
                if (scene.modo !== 'vecinos') scene.cerrar(casa);
                // Pelota roja, la misma que el perro lleva en su dibujo al traerla.
                if (!scene.textures.exists('calle:pelotaRoja')) {
                    var pg = scene.make.graphics({ x: 0, y: 0 }, false);
                    pg.fillStyle(0xc92a2a, 1);
                    pg.fillCircle(64, 64, 62);
                    pg.fillStyle(0xe03131, 1);
                    pg.fillCircle(58, 58, 54);
                    pg.fillStyle(0xffffff, 0.75);
                    pg.fillEllipse(84, 38, 26, 16);
                    pg.generateTexture('calle:pelotaRoja', 128, 128);
                    pg.destroy();
                }
                var pelota = scene.add.image(w * 0.68, h * 0.93, 'calle:pelotaRoja');
                pelota.setDepth(9);
                if (pelota.setScale && pelota.width) {
                    pelota.base = Math.min(80, h * 0.1) / (Math.max(pelota.width, pelota.height) || 1);
                    pelota.setScale(pelota.base);
                } else {
                    pelota.base = 1;
                }
                scene.pelota = pelota;
                scene.pelotaInvita = true;
                avisar('onPelotaLista');
                return new Promise(function (resolve) {
                    scene.alTraer = resolve;
                    scene.autoLanzar = scene.time.delayedCall(6000, function () { scene.lanzar(); });
                });
            });
        },

        lanzar: function () {
            var scene = this;
            if (!this.pelotaInvita) return;
            this.pelotaInvita = false;
            if (this.autoLanzar) this.autoLanzar.remove();
            var v = this.vecinos[this.objetivo];
            var w = this.scale.width;
            var h = this.scale.height;
            var p = this.pelota;
            p.setScale(p.base);
            var carril = this.carril || (this.suelo() + h * 0.1);
            var destX = Math.abs(v.img.x - w * 0.3) > w * 0.25 ? w * 0.3 : w * 0.75;
            var ox = p.x;
            var oy = p.y;
            var t = { k: 0 };
            if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir('rebote', { breve: true });
            this.tweens.add({
                targets: t, k: 1, duration: reducido() ? 1 : 900, ease: 'Sine.easeOut',
                onUpdate: function () {
                    p.x = Phaser.Math.Linear(ox, destX, t.k);
                    p.y = Phaser.Math.Linear(oy, carril - 10, t.k) - Math.sin(t.k * Math.PI) * h * 0.3;
                    p.angle = t.k * 540;
                }
            });
            // El perro corre a buscarla, la trae en la boca y la deja junto a su caseta.
            // Ve salir la pelota, se agacha tomando impulso, arranca y frena al llegar.
            scene.agacharse(v, destX).then(function () {
                return scene.caminar(v, destX, 700);
            }).then(function () {
                return scene.frenar(v, v.ultimoDir || 1);
            }).then(function () {
                if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir(elemento(v.id).sonido, { breve: true, pan: scene.panDe(v.id) });
                scene.ladrar(v.id);
                // Si tiene la pose con la pelota, la pelota suelta se esconde mientras la lleva.
                var conPose = scene.texPose(v.id, 'pelota') !== tex(v.id);
                var sigue = null;
                if (conPose) {
                    scene.ponerPose(v, 'pelota');
                    p.setVisible(false);
                } else {
                    sigue = scene.time.addEvent({
                        delay: 16, loop: true,
                        callback: function () { p.setPosition(v.img.x + (v.img.flipX ? -1 : 1) * (v.ancho || v.size) * 0.42, v.img.y - v.size * 0.55); }
                    });
                }
                return scene.caminar(v, scene.caseta.x + scene.caseta.R * 1.8, 900).then(function () {
                    if (sigue) sigue.remove();
                    return scene.frenar(v, v.ultimoDir || -1, 0.5);
                });
            }).then(function () {
                // La deja en el suelo y se sienta, contento.
                var lado = (v.ancho || v.size) * 0.55;
                p.setPosition(v.img.x + lado, v.img.y - 30).setVisible(true);
                scene.ponerPose(v, 'sentado');
                scene.tweens.add({ targets: p, y: v.img.y - 12, duration: 200, ease: 'Bounce.easeOut' });
                if (!reducido()) scene.tweens.add({ targets: v.img, angle: { from: -8, to: 8 }, duration: 110, yoyo: true, repeat: 3, onComplete: function () { v.img.angle = 0; } });
                return esperar(scene, 700);
            }).then(function () {
                scene.tweens.add({ targets: p, alpha: 0, duration: 300, onComplete: function () { p.destroy(); } });
                scene.pelota = null;
                if (scene.alTraer) { var r = scene.alTraer; scene.alTraer = null; r(); }
            });
        },

        /** Un hueso nuevo vuela a la caseta: la colección de este juego. */
        guardarHueso: function () {
            var scene = this;
            var k = this.huesos.length;
            var c = this.caseta;
            var v = this.vecinos[this.objetivo];
            var L = c.R * 0.55;
            var keyHueso = texEscena('hueso');
            var g;
            if (this.textures.exists(keyHueso)) {
                g = this.add.image(0, 0, keyHueso).setDepth(9);
                g.setScale(Math.min(L * 1.4 / (g.width || 1), L * 0.9 / (g.height || 1)));
            } else {
                g = this.add.graphics().setDepth(9);
                g.fillStyle(0xfff9db, 1);
                g.lineStyle(2, 0xe9d8a6, 1);
                g.fillRect(-L / 2, -L * 0.12, L, L * 0.24);
                [[-L / 2, -L * 0.14], [-L / 2, L * 0.14], [L / 2, -L * 0.14], [L / 2, L * 0.14]].forEach(function (p) {
                    g.fillCircle(p[0], p[1], L * 0.16);
                    g.strokeCircle(p[0], p[1], L * 0.16);
                });
            }
            var col = k % 3;
            var fila = Math.floor(k / 3);
            var dx = c.x + (col - 1) * L * 0.85;
            var dy = c.y - c.R * 2.1 - fila * L * 0.45;
            g.setPosition(v ? v.img.x : c.x, v ? v.img.y - (v.size || 60) : c.y - 100);
            g.setAngle(-20 + col * 20);
            this.huesos.push(g);
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: g, x: dx, y: dy, duration: reducido() ? 1 : 700, ease: 'Cubic.easeInOut',
                    onComplete: function () {
                        sfx('recompensa');
                        scene.estrellas(dx, dy, 8);
                        resolve();
                    }
                });
            });
        },

        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.tweens.add({ targets: this.noche, fillAlpha: 0, duration: 600 });
            var ids = Object.keys(this.vecinos).filter(function (id) { return scene.vecinos[id].img.visible || scene.vecinos[id].estado === 'dentro'; });
            ids.forEach(function (id, i) {
                var v = scene.vecinos[id];
                if (v.casa == null) return;
                scene.time.delayedCall(i * 200, function () {
                    var casa = scene.casas[v.casa];
                    if (v.estado !== 'calle') {
                        scene.modo = 'vecinos';
                        scene.mostrarEnPuerta(v);
                        scene.abrir(casa);
                    }
                    v.img.clearTint();
                    if (!reducido()) scene.tweens.add({ targets: v.img, y: v.img.y - v.size * 0.3, duration: 240, yoyo: true, repeat: 3, delay: 300 });
                });
            });
            this.huesos.forEach(function (b, i) {
                if (!reducido()) scene.tweens.add({ targets: b, angle: b.angle + 360, duration: 700, delay: i * 120 });
            });
            this.confeti();
            return esperar(this, 2600);
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

        /** Ejemplo guiado: una sola casa con el vecino de la demo en la puerta. */
        demo: function (id) {
            var w = this.scale.width;
            this.construirCasas(1);
            var casa = this.casas[0];
            casa.ocupante = id;
            var v = this.crearVecino(id);
            v.casa = 0;
            this.modo = 'vecinos';
            this.mostrarEnPuerta(v);
            this.abrir(casa);
            this.demoObj = v;
            if (w) this.firma = '';
        },

        limpiarDemo: function () {
            var v = this.demoObj;
            if (!v) return Promise.resolve();
            this.demoObj = null;
            v.img.setVisible(false);
            v.casa = null;
            v.estado = 'calle';
            return Promise.resolve();
        },

        rectDe: function (id) {
            var v = this.vecinos[id];
            if (!v) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            var ancho = v.ancho || v.size;
            return {
                x: r.left + v.img.x * sx,
                y: r.top + (v.img.y - v.size / 2) * sy,
                left: r.left + (v.img.x - ancho / 2) * sx,
                top: r.top + (v.img.y - v.size) * sy,
                width: ancho * sx,
                height: v.size * sy
            };
        },

        panDe: function (id) {
            var v = this.vecinos[id];
            if (!v) return 0;
            var x = v.casa != null && this.casas[v.casa] ? this.casas[v.casa].x : v.img.x;
            return Phaser.Math.Clamp((x / this.scale.width) * 2 - 1, -1, 1) * 0.85;
        },

        estado: function () {
            var scene = this;
            return {
                jugando: this.jugando,
                modo: this.modo,
                ronda: this.ronda,
                objetivo: this.objetivo,
                huesos: this.huesos.length,
                pelota: !!this.pelotaInvita,
                pelotaXY: this.pelota ? { x: this.pelota.x, y: this.pelota.y } : null,
                casas: this.casas.map(function (c) {
                    return { x: c.x, suelo: c.suelo, W: c.W, H: c.H, ocupante: c.ocupante, abierta: c.abierta };
                }),
                vecinos: Object.keys(this.vecinos).map(function (id) {
                    var v = scene.vecinos[id];
                    return { id: id, estado: v.estado, casa: v.casa, x: v.img.x, y: v.img.y, size: v.size, visible: v.img.visible };
                })
            };
        }
    });

    function cargarTexturas(scene) {
        var elems = (gameConfig && gameConfig.elementos) || {};
        var lista = [];
        Object.keys(elems).forEach(function (id) {
            if (elems[id].img) lista.push({ key: tex(id), src: elems[id].img });
            var poses = POSES[id] || {};
            Object.keys(poses).forEach(function (pose) { lista.push({ key: tex(id) + ':' + pose, src: poses[pose] }); });
            var rig = RIG[id] || {};
            Object.keys(rig).forEach(function (pose) {
                var base = tex(id) + ':' + pose + ':';
                lista.push({ key: base + 'cuerpo', src: rigSrc(id, pose, 'cuerpo') });
                lista.push({ key: base + 'cabeza', src: rigSrc(id, pose, 'cabeza') });
                lista.push({ key: base + OJOS, src: rigSrc(id, pose, OJOS) });
                rig[pose].piezas.concat(rig[pose].orejas || []).forEach(function (p) { lista.push({ key: base + p.n, src: rigSrc(id, pose, p.n) }); });
            });
        });
        lista.push({ key: texEscena('fondo'), src: ESCENA.fondo });
        lista.push({ key: texEscena('caseta'), src: ESCENA.caseta });
        lista.push({ key: texEscena('hueso'), src: ESCENA.hueso });
        ESCENA.casas.forEach(function (src, i) {
            lista.push({ key: texEscena('casa:' + i), src: src });
        });
        lista = lista.filter(function (t) { return !scene.textures.exists(t.key); });
        if (!lista.length) return Promise.resolve();
        return new Promise(function (resolve) {
            lista.forEach(function (t) {
                var src = t.src;
                var esEscena = t.key.indexOf(':escena:') !== -1;
                if (esEscena) {
                    if (src.indexOf('?') === -1) src += ESCENA_V;
                    scene.load.image(t.key, src);
                } else if (/\.svg(\?|$)/i.test(src)) {
                    scene.load.svg(t.key, src, { scale: 2 });
                } else {
                    scene.load.image(t.key, src);
                }
            });
            var listo = false;
            function fin() {
                if (listo) return;
                listo = true;
                resolve();
            }
            scene.load.once('complete', fin);
            scene.load.once('loaderror', function (file) {
                try { console.warn('[calle] no cargó', file && (file.src || file.url || file.key)); } catch (e) { /* ignore */ }
            });
            scene.load.start();
            // Si el loader no dispara complete (p. ej. lista vacía tras error), no colgar.
            setTimeout(fin, 8000);
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
        var el = doc.getElementById('calle-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'calle-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-calle');
        el.style.visibility = 'hidden';
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#a5d8ff',
            audio: { noAudio: true },
            scene: [EscenaCalle],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-calle');
            el.style.visibility = '';
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }
        return esperarEscena().then(function (scene) {
            return cargarTexturas(scene).then(function () {
                scene.dibujarFondo();
                scene.crearCaseta();
                scene.firma = '';
                el.style.visibility = '';
                return scene;
            });
        }).catch(function (err) {
            el.style.visibility = '';
            throw err;
        });
    }

    function conEscena(fn) {
        return function () {
            if (!sceneRef) return undefined;
            return fn.apply(null, [sceneRef].concat(Array.prototype.slice.call(arguments)));
        };
    }

    global.PedniaCalle = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        jugarPelota: conEscena(function (s, id) { return s.jugarPelota(id); }),
        lanzar: conEscena(function (s) { s.lanzar(); }),
        guardarHueso: conEscena(function (s) { return s.guardarHueso(); }),
        asomarVentana: conEscena(function (s, id) { s.asomarVentana(id); }),
        resaltar: conEscena(function (s, id, si) { s.resaltar(id, si); }),
        ladrar: conEscena(function (s, id) { s.ladrar(id); }),
        demo: conEscena(function (s, id) { s.demo(id); }),
        limpiarDemo: conEscena(function (s) { return s.limpiarDemo(); }),
        rectDe: conEscena(function (s, id) { return s.rectDe(id); }),
        panDe: conEscena(function (s, id) { return s.panDe(id); }),
        fiestaFinal: conEscena(function (s) { return s.fiestaFinal(); }),
        estado: conEscena(function (s) { return s.estado(); }),
        destruir: function () {
            sceneRef = null;
            game = null;
            global.document.body.classList.remove('modo-calle');
            var el = global.document.getElementById('calle-canvas');
            if (el) el.style.visibility = '';
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
