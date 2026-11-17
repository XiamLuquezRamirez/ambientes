/**
 * PedniaGranja — "Paseo por la granja" (El sonido viajero, 5-6 años) en Phaser 4.2.1.
 *
 * Los animales pasean por la granja. Suena uno y, al rato, se va caminando (o volando) a
 * otro sitio: hay que seguirlo con los ojos y tocarlo donde quede. El documento: si se
 * equivoca, el ejercicio se repite desde el inicio (todos vuelven a su lugar).
 *   paseo     → caminan despacio (reto del documento).
 *   corral    → se juntan en el corral y se mueven más rápido.
 *   pajar     → al viajar pasan por detrás de los fardos de paja.
 *   todos     → llega la vaca y todos caminan a la vez.
 * Premio propio de este juego: el animal encontrado entra al granero y se asoma por una
 * ventanita; al final se abren las puertas y salen todos a saltar.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 *
 * API: montar, prepararRonda, jugar, pausar, viajar, volverInicio, celebrar, guardarEnGranero,
 *      pista, resaltar, demo, limpiarDemo, rectDe, panDe, fiestaFinal, estado, destruir.
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

    /* ── Arte del diseño ──────────────────────────────────────────
     * FONDO_5.svg (1280×720) trae la granja entera: cielo, nubes, colinas, el granero
     * rojo con sus ventanitas y su portón, el molino, el manzano, el tractor y la
     * camioneta con pacas. Aquí solo se coloca encima lo que se mueve (aspas,
     * portón que se abre, animales, pacas de heno), anclado a las medidas reales
     * del dibujo. HENO.svg (500×500) es la paca de la ronda "pajar".
     */
    var ESCENA = {
        // fondo_sin_aspas.svg, aspas.svg y nubeN.svg salen de FONDO_5.svg: las aspas y las
        // nubes se recortaron aparte para poder girarlas y moverlas.
        fondo: 'img/El Sonido Viajero/fondo_sin_aspas.svg',
        aspas: 'img/El Sonido Viajero/aspas.svg',
        heno: 'img/El Sonido Viajero/HENO.svg'
    };
    /** Las 3 nubes del dibujo, con su ancho y su alto en unidades del fondo (1280×720). */
    var NUBES_ARTE = [
        { src: 'img/El Sonido Viajero/nube1.svg', w: 140, h: 60, y: 70 },
        { src: 'img/El Sonido Viajero/nube2.svg', w: 220, h: 70, y: 135 },
        { src: 'img/El Sonido Viajero/nube3.svg', w: 220, h: 70, y: 183 }
    ];
    /** Mariposas del diseño (copias de AsociaSonidoEImagen/QueSuena/img/mariposaN.svg). */
    var MARIPOSAS = ['img/mariposa1.svg', 'img/mariposa2.svg', 'img/mariposa3.svg', 'img/mariposa4.svg'];
    var ESCENA_V = '?v=20261113viajero';
    var FONDO_W = 1280;
    var FONDO_H = 720;
    // Medido sobre el propio FONDO_5.svg.
    var GRANERO = { x: 102, y: 164, w: 297, h: 395 };                 // pared roja
    var PORTON = { x: 190, y: 431, w: 156, h: 124 };                  // portón blanco de abajo
    // Las 4 ventanitas del altillo (ahí se asoman los animales encontrados).
    var VENTANAS = [
        { x: 150, y: 325, t: 61 },
        { x: 234, y: 325, t: 61 },
        { x: 318, y: 326, t: 60 },
        { x: 234, y: 241, t: 62 }
    ];
    var ASPAS = { x: 766, y: 305, lado: 350 };                        // eje y tamaño de las aspas del molino
    var PASTO = { y0: 575, y1: 700, x0: 420, x1: 1240 };              // pasto libre delante del granero
    var HENO_ALTO = 96;
    var CIELO = 0x96e3fe;                                             // azul del cielo del propio FONDO_5.svg
    var ANCLA_Y = 120;                                                // cuánto cielo se puede recortar por arriba
    var PASTO_COLOR = 0xa3a307;                                       // verde del pasto del propio FONDO_5.svg                                              // alto de la paca en unidades del fondo

    function texEscena(parte) { return 'granja:escena:' + parte; }

    // Los SVG del diseño traen viewBox pero no width/height: hay que rasterizarlos a tamaño.
    var ESCENA_TAM = { fondo: { width: FONDO_W, height: FONDO_H }, aspas: { width: 440, height: 440 }, heno: { width: 500, height: 500 } };

    function encolarEscena(scene) {
        Object.keys(ESCENA).forEach(function (k) {
            var src = ESCENA[k];
            if (!src || scene.textures.exists(texEscena(k))) return;
            scene.load.svg(texEscena(k), src.indexOf('?') === -1 ? src + ESCENA_V : src, ESCENA_TAM[k]);
        });
        MARIPOSAS.forEach(function (src, i) {
            var key = texEscena('mariposa:' + i);
            if (scene.textures.exists(key)) return;
            scene.load.svg(key, src + ESCENA_V, { width: 160, height: 160 });
        });
        NUBES_ARTE.forEach(function (n, i) {
            var key = texEscena('nube:' + i);
            if (scene.textures.exists(key)) return;
            scene.load.svg(key, n.src + ESCENA_V, { width: n.w * 2, height: n.h * 2 });
        });
    }

    var VUELAN = { pajaro: true };

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'granja:' + id;
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
        if (doc.getElementById('granja-css')) return;
        var css = doc.createElement('style');
        css.id = 'granja-css';
        css.textContent = [
            '#granja-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#granja-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-granja{background:#a5d8ff !important}',
            'body.modo-granja #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-granja #principal button,body.modo-granja .dialogo{pointer-events:auto}',
            'body.modo-granja .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-granja .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-granja .parque-fondo,body.modo-granja #zonas,body.modo-granja #elementos{display:none !important}',
            'body.modo-granja .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(20vh,160px)}',
            'body.modo-granja .pj-zoe{left:6px}',
            'body.modo-granja .pj-zeus{right:6px}',
            'body.modo-granja .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaGranja = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaGranja() {
            Phaser.Scene.call(this, { key: 'EscenaGranja' });
            this.animales = {};
            this.fardos = [];
            this.enGranero = [];
            this.modo = 'paseo';
            this.objetivo = null;
            this.jugando = false;
            this.ronda = 0;
            this.demoObj = null;
        },

        create: function () {
            // Mientras llega el FONDO_5.svg no se pinta la granja dibujada a mano: así no se
            // ve primero el dibujo viejo y luego el nuevo. Solo un cielo liso de espera.
            this.esperandoArte = true;
            this.cielo = this.add.graphics().setDepth(-30);
            // Sol con rayos que giran despacio.
            this.sol = this.add.container(0, 0).setDepth(-29);
            var rayos = this.add.graphics();
            rayos.fillStyle(0xffe066, 0.7);
            for (var r = 0; r < 12; r++) {
                var a = (Math.PI * 2 / 12) * r;
                rayos.fillTriangle(Math.cos(a - 0.12) * 46, Math.sin(a - 0.12) * 46, Math.cos(a + 0.12) * 46, Math.sin(a + 0.12) * 46, Math.cos(a) * 70, Math.sin(a) * 70);
            }
            this.sol.add([rayos, this.add.circle(0, 0, 44, 0xfcc419), this.add.circle(-10, -10, 16, 0xffe066)]);
            this.sol.rayos = rayos;
            this.nubes = [];
            for (var i = 0; i < 4; i++) {
                var n = this.add.container(0, 0).setDepth(-28);
                n.add(this.add.circle(-30, 8, 22, 0xffffff, 0.95));
                n.add(this.add.circle(0, -6, 32, 0xffffff, 0.95));
                n.add(this.add.circle(32, 8, 21, 0xffffff, 0.95));
                n.vel = 6 + i * 3;
                n.base = [0.12, 0.4, 0.62, 0.86][i];
                n.alto = [0.12, 0.2, 0.09, 0.17][i];
                this.nubes.push(n);
            }
            this.pajaros = [];
            for (var j = 0; j < 3; j++) {
                var pj = this.add.graphics().setDepth(-27);
                pj.fase = j * 1.9;
                pj.vel = 34 + j * 10;
                pj.alto = 0.16 + j * 0.05;
                this.pajaros.push(pj);
            }
            this.fondo = this.add.graphics().setDepth(-26);
            // Molino de viento en la colina (las aspas giran).
            this.molino = this.add.graphics().setDepth(-25);
            this.aspas = this.add.graphics().setDepth(-24);
            this.campo = this.add.graphics().setDepth(-20);
            this.silo = this.add.graphics().setDepth(-13);
            this.granero = this.add.graphics().setDepth(-12);
            this.puertas = this.add.graphics().setDepth(-11);
            this.veleta = this.add.graphics().setDepth(-12);
            this.mariposas = [0xff8787, 0xffd43b, 0xb197fc].map(function (col, k) {
                var m = this.add.container(0, 0).setDepth(900);
                var a1 = this.add.ellipse(-6, 0, 12, 16, col);
                var a2 = this.add.ellipse(6, 0, 12, 16, col);
                m.add([a1, a2, this.add.rectangle(0, 0, 3, 13, 0x495057)]);
                m.alas = [a1, a2];
                m.fase = k * 2.3;
                return m;
            }, this);
            this.dibujar();
            var scene = this;
            this.scale.on('resize', function () { scene.dibujar(); });
            // Si el arte no llega (archivo movido, red caída), se pinta la granja de siempre.
            this.time.delayedCall(4000, function () {
                if (!scene.esperandoArte) return;
                scene.esperandoArte = false;
                scene.dibujar();
            });
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

        /** Mapa cover del FONDO_5.svg → pantalla. null si aún no hay textura. */
        /**
         * Mapa del FONDO_5.svg → pantalla. El dibujo entra ENTERO a lo ancho (así no se
         * pierden el granero ni la camioneta de los extremos) y se ancla abajo; lo que
         * sobra arriba se rellena con el azul del cielo del propio dibujo.
         */
        mapaFondo: function () {
            if (!this.textures.exists(texEscena('fondo'))) return null;
            var src = this.textures.get(texEscena('fondo')).getSourceImage();
            var tw = (src && src.width) || FONDO_W;
            var th = (src && src.height) || FONDO_H;
            var w = this.scale.width;
            var h = this.scale.height;
            // Manda el ancho: el dibujo entra entero y nunca se corta por los lados
            // (si no, se pierden el granero y la camioneta de los extremos).
            var esc = w / FONDO_W;
            var ox = 0;
            // Anclado abajo, pero sin comerse el granero: el recorte de arriba no pasa de
            // ANCLA_Y (sobre esa línea solo hay cielo y la punta del tejado). Si aun así
            // sobra sitio abajo, el pasto de relleno lo cubre.
            var oy = h - FONDO_H * esc;
            if (oy < -ANCLA_Y * esc) oy = -ANCLA_Y * esc;
            if (oy > 0) oy = 0;
            return {
                esc: esc, ox: ox, oy: oy,
                // escala que hay que darle a la imagen para que mida FONDO_W × FONDO_H × esc
                escImg: (FONDO_W * esc) / tw,
                sx: function (x) { return ox + x * esc; },
                sy: function (y) { return oy + y * esc; }
            };
        },

        /** ¿Está puesto el arte del diseño? */
        hayArte: function () { return !!(this.fondoImg && this.fondoImg.visible); },

        /**
         * Pone el FONDO_5.svg y apaga todo lo que el dibujo ya trae (cielo, campo,
         * granero, silo, molino, huerto, nubes y pájaros procedurales).
         */
        aplicarEscena: function () {
            var m = this.mapaFondo();
            if (!m) return;
            if (!this.fondoImg) this.fondoImg = this.add.image(0, 0, texEscena('fondo')).setOrigin(0).setDepth(-40);
            this.fondoImg.setVisible(true).setPosition(m.ox, m.oy).setScale(m.escImg);
            // Cielo del propio dibujo por detrás, por si no llega a algún borde.
            var hh = this.scale.height;
            var ww = this.scale.width;
            this.cielo.clear().setVisible(true).setDepth(-41);
            this.cielo.fillStyle(CIELO, 1);
            this.cielo.fillRect(0, 0, ww, hh);
            // Pasto del dibujo por DELANTE del fondo, alargando el suelo hasta el borde
            // de abajo cuando la pantalla es más alta que el dibujo.
            if (!this.sueloExtra) this.sueloExtra = this.add.graphics().setDepth(-39.5);
            var yFin = m.sy(FONDO_H);
            this.sueloExtra.clear();
            if (yFin < hh) {
                this.sueloExtra.fillStyle(PASTO_COLOR, 1);
                this.sueloExtra.fillRect(0, yFin - 1, ww, hh - yFin + 2);
            }
            [this.fondo, this.campo, this.molino, this.silo, this.granero, this.veleta].forEach(function (g) {
                if (g) g.clear().setVisible(false);
            });
            if (this.sol) this.sol.setVisible(false);
            this.nubes.forEach(function (n) { n.setVisible(false); });
            this.pajaros.forEach(function (pj) { pj.clear(); });
            // El eje de las aspas y el granero pasan a las medidas del dibujo.
            // Aspas del dibujo, recortadas aparte: giran sobre su propio eje.
            var keyAspas = texEscena('aspas');
            if (this.textures.exists(keyAspas)) {
                if (!this.aspasImg) this.aspasImg = this.add.image(0, 0, keyAspas).setOrigin(0.5).setDepth(-39);
                var lado = ASPAS.lado * m.esc;
                this.aspasImg.setVisible(true)
                    .setPosition(m.sx(ASPAS.x), m.sy(ASPAS.y))
                    .setScale(lado / (this.aspasImg.width || 1));
            }
            this.ejeMolino = null;
            // Nubes del dibujo, recortadas aparte: cruzan el cielo despacio.
            if (!this.nubesArte) {
                this.nubesArte = [];
                for (var ni = 0; ni < NUBES_ARTE.length; ni++) {
                    var keyN = texEscena('nube:' + ni);
                    if (!this.textures.exists(keyN)) continue;
                    var nu = this.add.image(0, 0, keyN).setOrigin(0.5).setDepth(-38);
                    nu.datos = NUBES_ARTE[ni];
                    nu.vel = 7 + ni * 4;
                    nu.px = [0.6, 0.3, 0.8][ni % 3];     // sitio de salida, en tanto por uno
                    this.nubesArte.push(nu);
                }
            }
            if (this.nubesArte.length) this.nubes.forEach(function (n) { n.setVisible(false); });
            this.graneroPos = {
                x: m.sx(GRANERO.x), w: GRANERO.w * m.esc,
                y: m.sy(GRANERO.y + GRANERO.h), h: GRANERO.h * m.esc,
                puertaX: m.sx(PORTON.x + PORTON.w / 2), puertaY: m.sy(PORTON.y + PORTON.h)
            };
            this.ventanitas = VENTANAS.map(function (v) {
                return { x: m.sx(v.x + v.t / 2), y: m.sy(v.y + v.t / 2), t: v.t * m.esc };
            });
            // Mariposas del diseño en vez de las dibujadas a mano.
            if (!this.mariposasArte) {
                this.mariposasArte = [];
                for (var mi = 0; mi < MARIPOSAS.length; mi++) {
                    var keyM = texEscena('mariposa:' + mi);
                    if (!this.textures.exists(keyM)) continue;
                    var mar = this.add.image(0, 0, keyM).setDepth(900);
                    mar.fase = mi * 1.7;
                    this.mariposasArte.push(mar);
                }
            }
            if (this.mariposasArte.length) this.mariposas.forEach(function (m) { m.setVisible(false); });
            this.dibujarPuertas(this.graneroAbierto ? 1 : 0);
            var scene = this;
            this.enGranero.forEach(function (im, k) {
                var vv = scene.ventanitas[k % scene.ventanitas.length];
                im.setPosition(vv.x, vv.y + vv.t / 2);
            });
            this.ubicarFardos();
        },

        horizonte: function () { return this.scale.height * 0.46; },

        /** Zona donde caminan: el pasto libre del dibujo, delante del granero. */
        zona: function () {
            var m = this.mapaFondo();
            if (m && this.hayArte()) {
                var h = this.scale.height;
                // Todo el pasto que se ve: desde donde empieza en el dibujo hasta el borde
                // de abajo (en pantallas altas el suelo sigue más allá del dibujo).
                var y1 = Math.min(h - this.tamAnimal() * 0.1, Math.max(m.sy(PASTO.y1), h - h * 0.06));
                var y0 = Math.min(m.sy(PASTO.y0), y1 - h * 0.1);
                return { x0: m.sx(PASTO.x0), x1: Math.min(m.sx(PASTO.x1), this.scale.width - 20), y0: y0, y1: y1 };
            }
            var w = this.scale.width;
            var h = this.scale.height;
            return { x0: w * 0.3, x1: w * 0.94, y0: h * 0.6, y1: h * 0.86 };
        },

        corral: function () {
            var z = this.zona();
            return { x0: z.x0 + (z.x1 - z.x0) * 0.35, x1: z.x1 - 10, y0: z.y0, y1: z.y1 };
        },

        dibujar: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var hz = this.horizonte();
            var k;

            // Esperando el arte del diseño: cielo liso, nada del dibujo antiguo.
            if (this.esperandoArte && !this.textures.exists(texEscena('fondo'))) {
                this.cielo.clear().setVisible(true);
                this.cielo.fillStyle(CIELO, 1);
                this.cielo.fillRect(0, 0, w, h);
                [this.fondo, this.campo, this.molino, this.silo, this.granero, this.veleta, this.puertas, this.aspas]
                    .forEach(function (g) { if (g) g.clear().setVisible(false); });
                if (this.sol) this.sol.setVisible(false);
                this.nubes.forEach(function (n) { n.setVisible(false); });
                this.mariposas.forEach(function (m) { m.setVisible(false); });
                return;
            }

            // Cielo en degradado, sol, nubes.
            var g = this.cielo;
            g.clear();
            for (var b = 0; b < 16; b++) {
                var c0 = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(0x4dabf7), Phaser.Display.Color.ValueToColor(0xe7f5ff), 100, Math.round(b / 15 * 100));
                g.fillStyle(Phaser.Display.Color.GetColor(c0.r, c0.g, c0.b), 1);
                g.fillRect(0, (hz + 20) / 16 * b - 1, w, (hz + 20) / 16 + 2);
            }
            this.sol.setPosition(w * 0.76, h * 0.2).setScale(Math.max(0.7, h / 820));
            this.nubes.forEach(function (n) {
                if (!n.listo) { n.x = w * n.base; n.listo = true; }
                n.y = h * n.alto + h * 0.08;
                n.setScale(Math.min(1.3, w / 1000));
            });

            // Colinas lejanas, árbol grande y huerto.
            var f = this.fondo;
            f.clear();
            f.fillStyle(0xb2f2bb, 1);
            f.fillEllipse(w * 0.2, hz + 10, w * 0.8, h * 0.24);
            f.fillStyle(0xa9e34b, 1);
            f.fillEllipse(w * 0.75, hz + 6, w * 0.9, h * 0.3);
            f.fillStyle(0x94d82d, 1);
            f.fillEllipse(w * 0.45, hz + 20, w * 0.9, h * 0.16);
            // Árbol a la derecha.
            var ax = w * 0.93;
            f.fillStyle(0x8d5524, 1);
            f.fillRect(ax - 8, hz - h * 0.14, 16, h * 0.18);
            f.fillStyle(0x2b8a3e, 1);
            f.fillCircle(ax, hz - h * 0.19, h * 0.075);
            f.fillCircle(ax - h * 0.05, hz - h * 0.13, h * 0.055);
            f.fillCircle(ax + h * 0.05, hz - h * 0.13, h * 0.055);
            f.fillStyle(0xff6b6b, 1);
            [[-0.03, -0.18], [0.02, -0.12], [0.04, -0.2], [-0.05, -0.12]].forEach(function (p) { f.fillCircle(ax + h * p[0], hz + h * p[1], 5); });

            // Molino en la colina de la izquierda.
            var mo = this.molino;
            mo.clear();
            var mx = w * 0.52;
            var my = hz - h * 0.02;
            var mt = h * 0.2;
            mo.fillStyle(0xf8f9fa, 1);
            mo.fillTriangle(mx - mt * 0.18, my, mx + mt * 0.18, my, mx + mt * 0.1, my - mt);
            mo.fillTriangle(mx - mt * 0.18, my, mx - mt * 0.1, my - mt, mx + mt * 0.1, my - mt);
            mo.fillStyle(0xc92a2a, 1);
            mo.fillTriangle(mx - mt * 0.14, my - mt, mx + mt * 0.14, my - mt, mx, my - mt * 1.18);
            mo.fillStyle(0x8d5524, 1);
            mo.fillRect(mx - mt * 0.05, my - mt * 0.22, mt * 0.1, mt * 0.22);
            this.ejeMolino = { x: mx, y: my - mt * 0.95, r: mt * 0.62 };

            // Pasto en franjas, huerto, camino al granero y flores.
            var c = this.campo;
            c.clear();
            c.fillStyle(0x82c91e, 1);
            c.fillRect(0, hz + h * 0.04, w, h);
            for (k = 0; k < 6; k++) {
                c.fillStyle(k % 2 ? 0x74b816 : 0x82c91e, 1);
                c.fillRect(0, hz + h * 0.04 + k * (h - hz) / 6, w, (h - hz) / 6 + 1);
            }
            // Huerto con hileras de plantas.
            var hx = w * 0.44;
            var hw = w * 0.34;
            c.fillStyle(0x8d5524, 1);
            c.fillRoundedRect(hx, hz + h * 0.05, hw, h * 0.1, 8);
            for (k = 0; k < 4; k++) {
                var fy = hz + h * 0.065 + k * h * 0.022;
                c.fillStyle(0x6f3f1a, 1);
                c.fillRect(hx + 6, fy + 6, hw - 12, 3);
                for (var q = 0; q < 12; q++) {
                    var px = hx + 14 + q * (hw - 28) / 11;
                    c.fillStyle(0x2f9e44, 1);
                    c.fillCircle(px, fy + 2, 5);
                    if ((q + k) % 4 === 0) { c.fillStyle(0xff922b, 1); c.fillCircle(px, fy + 5, 3); }
                }
            }
            // Camino de tierra desde el granero.
            c.fillStyle(0xd9a066, 1);
            c.beginPath();
            c.moveTo(w * 0.1, h * 0.7);
            c.lineTo(w * 0.24, h * 0.7);
            c.lineTo(w * 0.42, h * 0.84);
            c.lineTo(w * 0.36, h * 0.92);
            c.lineTo(w * 0.12, h * 0.76);
            c.closePath();
            c.fillPath();
            c.fillStyle(0xc08a4d, 1);
            [[0.16, 0.73], [0.24, 0.77], [0.31, 0.82], [0.37, 0.87]].forEach(function (p) { c.fillEllipse(w * p[0], h * p[1], 14, 6); });
            // Flores y matas.
            for (k = 0; k < 34; k++) {
                var mx2 = ((k * 89) % 100) / 100 * w;
                var my2 = hz + h * 0.17 + ((k * 57) % 100) / 100 * h * 0.36;
                c.fillStyle(0x5c940d, 1);
                c.fillTriangle(mx2 - 6, my2, mx2 + 6, my2, mx2 - 2, my2 - 14);
                c.fillTriangle(mx2, my2, mx2 + 10, my2, mx2 + 6, my2 - 11);
                if (k % 3 === 0) { c.fillStyle(FIESTA[k % FIESTA.length], 1); c.fillCircle(mx2 + 12, my2 - 8, 4); c.fillStyle(0xffffff, 1); c.fillCircle(mx2 + 12, my2 - 8, 1.5); }
            }
            // Cerca de madera del corral, con girasoles.
            var co = this.corral();
            var yA = co.y0 - 30;
            c.fillStyle(0xa9713c, 1);
            c.fillRect(co.x0, yA + 6, co.x1 - co.x0, 7);
            c.fillRect(co.x0, yA + 18, co.x1 - co.x0, 7);
            for (var fx = co.x0; fx <= co.x1; fx += 42) {
                c.fillStyle(0x8d5524, 1);
                c.fillRect(fx - 4, yA, 9, 34);
                c.fillTriangle(fx - 4, yA, fx + 5, yA, fx + 0.5, yA - 7);
            }
            c.fillRect(co.x0 - 4, yA, 9, h * 0.1);
            [0.15, 0.5, 0.85].forEach(function (t) {
                var sx = co.x0 + (co.x1 - co.x0) * t;
                c.fillStyle(0x2f9e44, 1);
                c.fillRect(sx - 2, yA - 34, 4, 40);
                c.fillEllipse(sx + 7, yA - 14, 12, 6);
                c.fillStyle(0xfcc419, 1);
                for (var p = 0; p < 10; p++) {
                    var an = (Math.PI * 2 / 10) * p;
                    c.fillEllipse(sx + Math.cos(an) * 9, yA - 40 + Math.sin(an) * 9, 8, 8);
                }
                c.fillStyle(0x8d5524, 1);
                c.fillCircle(sx, yA - 40, 7);
            });

            this.dibujarGranero(this.graneroAbierto ? 1 : 0);
            this.ubicarFardos();
            if (this.textures.exists(texEscena('fondo'))) this.aplicarEscena();
        },

        /** Granero de tablas con altillo (4 ventanitas: ahí se asoman los encontrados) y silo. */
        dibujarGranero: function (abierto) {
            var w = this.scale.width;
            var h = this.scale.height;
            var gx = w * 0.04;
            var gw = Math.min(w * 0.22, h * 0.42);
            var gy = h * 0.7;
            var gh = h * 0.36;
            this.graneroPos = { x: gx, w: gw, y: gy, h: gh, puertaX: gx + gw / 2, puertaY: gy };
            // Silo detrás, a la derecha del granero.
            var s = this.silo;
            s.clear();
            var sx = gx + gw + 6;
            var sw = gw * 0.3;
            var sh = gh * 1.05;
            s.fillStyle(0xadb5bd, 1);
            s.fillRect(sx, gy - sh, sw, sh);
            s.fillStyle(0xced4da, 1);
            s.fillRect(sx, gy - sh, sw * 0.4, sh);
            s.fillStyle(0x868e96, 1);
            for (var r = 1; r < 6; r++) s.fillRect(sx, gy - sh + r * sh / 6, sw, 3);
            s.fillStyle(0x495057, 1);
            s.fillEllipse(sx + sw / 2, gy - sh, sw, sw * 0.7);
            s.fillStyle(0x868e96, 1);
            s.fillEllipse(sx + sw / 2, gy - sh - 2, sw * 0.8, sw * 0.5);

            var g = this.granero;
            g.clear();
            // Pared de tablas verticales.
            g.fillStyle(0xc92a2a, 1);
            g.fillRect(gx, gy - gh, gw, gh);
            g.lineStyle(2, 0xa61e1e, 1);
            for (var t = gx + gw / 10; t < gx + gw; t += gw / 10) g.lineBetween(t, gy - gh + 4, t, gy - 4);
            // Techo de tejas con borde blanco.
            var tope = gy - gh - gh * 0.35;
            g.fillStyle(0x7f4f24, 1);
            g.fillTriangle(gx - 14, gy - gh, gx + gw + 14, gy - gh, gx + gw / 2, tope);
            g.lineStyle(2, 0x5c3d1e, 0.7);
            for (var q = 1; q < 4; q++) {
                var yy = gy - gh - (gh * 0.35) * (q / 4);
                var md = (gw / 2 + 14) * (1 - q / 4);
                g.lineBetween(gx + gw / 2 - md, yy, gx + gw / 2 + md, yy);
            }
            g.fillStyle(0xffffff, 1);
            g.fillRect(gx - 14, gy - gh - 6, gw + 28, 8);
            g.fillRect(gx, gy - 6, gw, 6);
            g.fillRect(gx, gy - gh, 6, gh);
            g.fillRect(gx + gw - 6, gy - gh, 6, gh);
            // Puerta del pajar en el triángulo.
            g.fillStyle(0xfff3bf, 1);
            g.fillRect(gx + gw * 0.42, gy - gh - gh * 0.2, gw * 0.16, gh * 0.14);
            g.lineStyle(3, 0xffffff, 1);
            g.strokeRect(gx + gw * 0.42, gy - gh - gh * 0.2, gw * 0.16, gh * 0.14);
            g.fillStyle(0xfab005, 1);
            g.fillTriangle(gx + gw * 0.44, gy - gh - gh * 0.06, gx + gw * 0.56, gy - gh - gh * 0.06, gx + gw * 0.5, gy - gh - gh * 0.12);
            // Ventanitas del altillo.
            this.ventanitas = [];
            for (var i = 0; i < 4; i++) {
                var vx = gx + gw * (0.16 + i * 0.23);
                var vy = gy - gh * 0.78;
                g.fillStyle(0x343a40, 1);
                g.fillRect(vx - gw * 0.08, vy - gw * 0.08, gw * 0.16, gw * 0.16);
                g.lineStyle(3, 0xffffff, 1);
                g.strokeRect(vx - gw * 0.08, vy - gw * 0.08, gw * 0.16, gw * 0.16);
                g.lineBetween(vx, vy - gw * 0.08, vx, vy + gw * 0.08);
                this.ventanitas.push({ x: vx, y: vy, t: gw * 0.16 });
            }
            // Veleta con gallo en la punta del techo.
            var v = this.veleta;
            v.clear();
            v.lineStyle(3, 0x343a40, 1);
            v.lineBetween(gx + gw / 2, tope, gx + gw / 2, tope - h * 0.07);
            v.lineBetween(gx + gw / 2 - 12, tope - h * 0.035, gx + gw / 2 + 12, tope - h * 0.035);
            v.fillStyle(0x343a40, 1);
            v.fillTriangle(gx + gw / 2 - 2, tope - h * 0.07, gx + gw / 2 + 18, tope - h * 0.065, gx + gw / 2 - 2, tope - h * 0.09);
            v.fillCircle(gx + gw / 2 + 4, tope - h * 0.09, 5);

            this.dibujarPuertas(abierto);
            var scene = this;
            this.enGranero.forEach(function (im, k) { var vv = scene.ventanitas[k % 4]; im.setPosition(vv.x, vv.y + vv.t / 2); });
        },

        dibujarPuertas: function (t) {
            var p = this.graneroPos;
            if (!p) return;
            var g = this.puertas;
            // Siempre visible: el modo de espera la había apagado y así el portón nunca se abría.
            g.clear().setVisible(true);
            var pw = p.w * 0.5;
            var ph = p.h * 0.5;
            var x0 = p.x + (p.w - pw) / 2;
            var m = this.hayArte() ? this.mapaFondo() : null;
            if (m) {
                // El portón blanco del dibujo: las hojas se abren dentro de su propio hueco.
                pw = PORTON.w * m.esc;
                ph = PORTON.h * m.esc;
                x0 = m.sx(PORTON.x);
            }
            var yBase = m ? m.sy(PORTON.y + PORTON.h) : p.y;
            var hoja = (pw / 2) * (1 - t * 0.85);
            // Dentro del granero: penumbra cálida con un montón de paja al fondo, para que
            // la puerta abierta no sea un rectángulo negro plano.
            g.fillStyle(0x3a2318, 1);
            g.fillRect(x0, yBase - ph, pw, ph);
            if (t > 0.05) {
                g.fillStyle(0x4a2f20, 1);
                g.fillRect(x0 + pw * 0.08, yBase - ph * 0.92, pw * 0.84, ph * 0.92);
                g.fillStyle(0xb8860b, 0.55);
                g.fillEllipse(x0 + pw * 0.5, yBase - ph * 0.08, pw * 0.7, ph * 0.26);
                g.fillStyle(0xd9a520, 0.5);
                g.fillEllipse(x0 + pw * 0.33, yBase - ph * 0.13, pw * 0.3, ph * 0.2);
            }
            g.fillStyle(m ? 0xffffff : 0xe03131, 1);
            g.fillRect(x0, yBase - ph, hoja, ph);
            g.fillRect(x0 + pw - hoja, yBase - ph, hoja, ph);
            g.lineStyle(4, m ? 0xdfe3e6 : 0xffffff, 1);
            g.strokeRect(x0, yBase - ph, hoja, ph);
            g.strokeRect(x0 + pw - hoja, yBase - ph, hoja, ph);
            if (hoja > 10) {
                g.lineBetween(x0, yBase - ph, x0 + hoja, yBase);
                g.lineBetween(x0 + pw - hoja, yBase - ph, x0 + pw, yBase);
            }
        },

        /** Fardos de paja: delante de los animales (para la ronda "pajar"). */
        ubicarFardos: function () {
            var z = this.zona();
            var n = 3;
            while (this.fardos.length < n) {
                var f = this.add.graphics().setDepth(50);
                this.fardos.push(f);
            }
            var h = this.scale.height;
            var fw = Math.min(this.scale.width * 0.12, h * 0.2);
            var fh = fw * 0.62;
            var scene = this;
            var m = this.hayArte() ? this.mapaFondo() : null;
            var usaHeno = !!m && this.textures.exists(texEscena('heno'));
            this.fardos.forEach(function (f, i) {
                var x = z.x0 + (z.x1 - z.x0) * (0.18 + i * 0.32);
                var y = z.y0 + (z.y1 - z.y0) * (i % 2 ? 0.75 : 0.35);
                f.clear();
                if (usaHeno) {
                    // Paca del diseño: el dibujo ocupa ~70 % del alto de la imagen.
                    if (!f.heno) {
                        f.heno = scene.add.image(0, 0, texEscena('heno')).setOrigin(0.5, 0.92);
                        f.heno.setDepth(50);
                    }
                    var alto = HENO_ALTO * m.esc;
                    f.heno.setScale(alto / ((f.heno.height || 1) * 0.7));
                    f.heno.setPosition(x, y).setDepth(y + 0.5)
                        .setVisible(scene.modo === 'pajar');
                    f.fw = f.heno.displayWidth;
                    f.fh = f.heno.displayHeight * 0.7;
                    f.setPosition(x, y).setVisible(false);
                    return;
                }
                if (f.heno) f.heno.setVisible(false);
                f.fillStyle(0x000000, 0.12);
                f.fillEllipse(0, 0, fw * 1.05, fh * 0.25);
                f.fillStyle(0xfab005, 1);
                f.fillRoundedRect(-fw / 2, -fh, fw, fh, 10);
                f.fillStyle(0xffd43b, 1);
                f.fillRoundedRect(-fw / 2 + 4, -fh + 4, fw - 8, fh * 0.3, 8);
                // Pajitas sueltas.
                f.lineStyle(2, 0xe67700, 1);
                for (var k = 0; k < 14; k++) {
                    var px = -fw / 2 + 8 + ((k * 37) % 100) / 100 * (fw - 16);
                    var py = -fh + 8 + ((k * 53) % 100) / 100 * (fh - 16);
                    f.lineBetween(px, py, px + 8, py + ((k % 2) ? 3 : -3));
                }
                f.fillStyle(0xc92a2a, 1);
                f.fillRect(-fw * 0.28, -fh, 6, fh);
                f.fillRect(fw * 0.22, -fh, 6, fh);
                f.fillStyle(0xfcc419, 1);
                for (var e = 0; e < 7; e++) f.fillTriangle(-fw / 2 + e * fw / 7, -fh + 2, -fw / 2 + e * fw / 7 + 8, -fh + 2, -fw / 2 + e * fw / 7 + 4, -fh - 6);
                f.setPosition(x, y);
                f.fw = fw;
                f.fh = fh;
                f.setVisible(scene.modo === 'pajar');
                f.setDepth(y + 0.5);
            });
        },

        /* ── Animales ──────────────────────────────────────────────── */

        tamAnimal: function () {
            return Math.min(this.scale.height * 0.2, this.scale.width * 0.12, 170);
        },

        crearAnimal: function (id) {
            if (this.animales[id]) return this.animales[id];
            var img = this.add.image(-300, 0, tex(id)).setOrigin(0.5, 1);
            var t = this.tamAnimal();
            var esc = Math.min(t / (img.width || 1), t / (img.height || 1));
            img.setScale(esc);
            var sombra = this.add.ellipse(-300, 0, img.width * esc * 0.7, 12, 0x000000, 0.15);
            var a = {
                id: id, img: img, sombra: sombra, esc: esc, size: img.height * esc, ancho: img.width * esc,
                x: -300, y: 0, inicio: null, destino: null, vel: 0, alto: 0, resaltado: false, fase: Math.random() * 6, quieto: true
            };
            this.animales[id] = a;
            return a;
        },

        puntoLibre: function (zona, lejosDe) {
            var z = zona || this.zona();
            var w = this.scale.width;
            var h = this.scale.height;
            for (var k = 0; k < 30; k++) {
                var x = rnd(z.x0, z.x1);
                var y = rnd(z.y0, z.y1);
                if (y > h * 0.8 && Math.abs(x - w / 2) < w * 0.11) continue;
                if (lejosDe && Math.abs(x - lejosDe.x) < w * 0.18) continue;
                // Que no quede encima de otro animal.
                var scene = this;
                var tapa = Object.keys(this.animales).some(function (id) {
                    var b = scene.animales[id];
                    if (b === lejosDe || !b.img.visible) return false;
                    var bx = b.destinoX != null ? b.destinoX : b.x;
                    return Math.abs(bx - x) < Math.max(b.ancho, scene.tamAnimal() * 0.8) && Math.abs(b.y - y) < scene.tamAnimal() * 0.5;
                });
                if (tapa && k < 25) continue;
                return { x: x, y: y };
            }
            return { x: rnd(z.x0, z.x1), y: rnd(z.y0, z.y0 + (z.y1 - z.y0) * 0.5) };
        },

        lugaresIniciales: function (n, zona) {
            var z = zona || this.zona();
            var out = [];
            for (var i = 0; i < n; i++) {
                var x = z.x0 + (z.x1 - z.x0) * ((i + 0.5) / n);
                var y = z.y0 + (z.y1 - z.y0) * (i % 2 ? 0.75 : 0.25);
                out.push({ x: x, y: y });
            }
            return mezclar(out);
        },

        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.modo = o.modo || 'paseo';
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            this.ubicarFardos();
            Object.keys(this.animales).forEach(function (id) {
                var a = scene.animales[id];
                if (o.elementos.indexOf(id) === -1 || scene.enGranero.indexOf(a) !== -1) { a.img.setVisible(false); a.sombra.setVisible(false); }
            });
            var zona = this.modo === 'corral' ? this.corral() : this.zona();
            var lug = this.lugaresIniciales(o.elementos.length, zona);
            var w = this.scale.width;
            return Promise.all(o.elementos.map(function (id, i) {
                var a = scene.crearAnimal(id);
                a.img.setVisible(true).setAlpha(1).clearTint();
                a.sombra.setVisible(true);
                a.resaltado = false;
                a.inicio = lug[i];
                // Entran caminando desde la derecha (o ya estaban en la granja).
                if (a.x < 0) { a.x = w + 80; a.y = lug[i].y; }
                return scene.caminarA(a, lug[i], 1, 1000 + i * 150);
            })).then(function () { return esperar(scene, 200); });
        },

        /** Camina (o vuela, el pájaro) hasta un punto; la promesa se cumple al llegar. */
        caminarA: function (a, p, rapidez, ms) {
            var scene = this;
            var desde = { x: a.x, y: a.y };
            var d = Phaser.Math.Distance.Between(desde.x, desde.y, p.x, p.y);
            var dur = reducido() ? 1 : (ms || Phaser.Math.Clamp(d * 4 / (rapidez || 1), 500, 2600));
            a.img.setFlipX(p.x < desde.x);
            a.quieto = false;
            a.destinoX = p.x;
            if (a.tween) a.tween.stop();
            return new Promise(function (resolve) {
                var t = { k: 0 };
                a.tween = scene.tweens.add({
                    targets: t, k: 1, duration: dur, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        a.x = Phaser.Math.Linear(desde.x, p.x, t.k);
                        a.y = Phaser.Math.Linear(desde.y, p.y, t.k);
                        a.alto = VUELAN[a.id] ? Math.sin(t.k * Math.PI) * scene.scale.height * 0.18 : Math.abs(Math.sin(t.k * Math.PI * Math.max(2, dur / 180))) * a.size * 0.06;
                    },
                    onComplete: function () { a.alto = 0; a.quieto = true; a.tween = null; resolve(); },
                    onStop: function () { a.alto = 0; a.quieto = true; resolve(); }
                });
            });
        },

        /**
         * Documento: "después de un momento, el elemento cambia de posición". El objetivo se
         * va lejos de donde estaba; según la ronda, los demás también se mueven.
         */
        viajar: function () {
            var scene = this;
            var a = this.animales[this.objetivo];
            if (!a) return Promise.resolve();
            var zona = this.modo === 'corral' ? this.corral() : this.zona();
            var rapidez = this.modo === 'corral' ? 1.6 : (this.modo === 'todos' ? 1.3 : 1);
            var destino = this.puntoLibre(zona, a);
            // En "pajar" se esconde detrás de un fardo (asoma un poco).
            if (this.modo === 'pajar') {
                var f = this.fardos[Math.floor(Math.random() * this.fardos.length)];
                destino = { x: f.x + rnd(-f.fw * 0.2, f.fw * 0.2), y: f.y - 2 };
            }
            sfx('zas');
            var viajes = [this.caminarA(a, destino, rapidez)];
            if (this.modo === 'corral' || this.modo === 'todos') {
                Object.keys(this.animales).forEach(function (id) {
                    var b = scene.animales[id];
                    if (b === a || !b.img.visible || scene.enGranero.indexOf(b) !== -1) return;
                    viajes.push(scene.caminarA(b, scene.puntoLibre(zona), rapidez));
                });
            }
            return Promise.all(viajes);
        },

        /** Documento: si se equivoca, se repite desde el inicio (todos vuelven a su lugar). */
        volverInicio: function () {
            var scene = this;
            sfx('magia');
            return Promise.all(Object.keys(this.animales).map(function (id) {
                var a = scene.animales[id];
                if (!a.img.visible || !a.inicio) return Promise.resolve();
                return scene.caminarA(a, a.inicio, 1.8);
            }));
        },

        jugar: function () {
            this.jugando = true;
        },

        pausar: function () {
            this.jugando = false;
        },

        update: function (time, delta) {
            var scene = this;
            var w = this.scale.width;
            var h = this.scale.height;
            var dt = Math.min(delta || 16, 50) / 1000;
            var quieto = reducido();
            var conArte = this.hayArte();
            // Aspas del molino: giran despacio; en la fiesta final, de alegría, más rápido.
            var fiesta = !!this.festejando;
            if (this.aspasImg && this.aspasImg.visible && !quieto) {
                this.aspasImg.rotation += dt * (fiesta ? 2.2 : 0.45);
            }
            var m = conArte ? this.mapaFondo() : null;
            var arteNubes = conArte && this.nubesArte && this.nubesArte.length;
            this.nubes.forEach(function (n) {
                n.setVisible(!arteNubes);
                if (!n.visible) return;
                if (!quieto) n.x += n.vel * dt;
                if (n.x > w + 90) n.x = -90;
            });
            // Nubes del dibujo: cruzan el cielo y vuelven a entrar por la izquierda.
            if (this.nubesArte && m) {
                this.nubesArte.forEach(function (nu) {
                    nu.setVisible(conArte);
                    if (!nu.visible) return;
                    var anchoP = nu.datos.w * m.esc;
                    nu.setScale(anchoP / (nu.width || 1));
                    if (!quieto) nu.px += (nu.vel * (fiesta ? 3 : 1) * dt) / Math.max(1, w);
                    if (nu.px > 1.2) nu.px = -0.2;
                    // Altura: la del dibujo, pero sin salirse por arriba cuando el cielo se recorta.
                    var yN = Math.max(nu.datos.h * m.esc * 0.6 + 6, m.sy(nu.datos.y));
                    nu.setPosition(w * nu.px, yN);
                });
            }
            if (!quieto && !conArte) this.sol.rayos.rotation += dt * 0.15;
            this.pajaros.forEach(function (pj) {
                pj.clear();
                if (quieto) return;
                var x = ((time / 1000) * pj.vel + pj.fase * 300) % (w + 200) - 100;
                var y = h * pj.alto + Math.sin(time / 600 + pj.fase) * 10;
                var ala = 6 + Math.sin(time / 120 + pj.fase) * 5;
                pj.lineStyle(3, 0x495057, 1);
                pj.lineBetween(x - 10, y - ala, x, y);
                pj.lineBetween(x, y, x + 10, y - ala);
            });
            // Aspas del molino (el dibujo del diseño ya las trae: no pintar encima).
            var e = this.ejeMolino;
            var as = this.aspas;
            as.clear();
            if (e && !conArte) {
                var giro = quieto ? 0.3 : time / 900;
                for (var k = 0; k < 4; k++) {
                    var an = giro + (Math.PI / 2) * k;
                    var cx = Math.cos(an);
                    var cy = Math.sin(an);
                    var px = -cy;
                    var py = cx;
                    as.fillStyle(0xf1f3f5, 1);
                    as.fillTriangle(e.x + px * 3, e.y + py * 3, e.x + cx * e.r + px * 9, e.y + cy * e.r + py * 9, e.x + cx * e.r - px * 2, e.y + cy * e.r - py * 2);
                    as.lineStyle(2, 0x8d5524, 1);
                    as.lineBetween(e.x, e.y, e.x + cx * e.r, e.y + cy * e.r);
                }
                as.fillStyle(0x5c3d1e, 1);
                as.fillCircle(e.x, e.y, 5);
            }
            // Mariposas que revolotean sobre el campo.
            var z = this.zona();
            var arteMar = conArte && this.mariposasArte && this.mariposasArte.length;
            this.mariposas.forEach(function (m) {
                m.setVisible(!quieto && !arteMar);
                if (quieto || arteMar) return;
                var t = time / 1000 + m.fase;
                m.x = z.x0 + (z.x1 - z.x0) * (0.5 + 0.45 * Math.sin(t * 0.21));
                m.y = z.y0 - h * 0.12 + Math.sin(t * 0.9) * h * 0.05;
                m.alas.forEach(function (al) { al.scaleX = 0.3 + 0.7 * Math.abs(Math.sin(t * 9)); });
            });
            if (this.mariposasArte) {
                // Pequeñas: acompañan, no compiten con los animales que se buscan.
                var tm = Math.max(22, Math.min(36, w * 0.03));
                this.mariposasArte.forEach(function (m, k) {
                    m.setVisible(conArte && !quieto);
                    if (!m.visible) return;
                    var t = time / 1000 + m.fase;
                    m.x = z.x0 + (z.x1 - z.x0) * (0.5 + 0.42 * Math.sin(t * (0.19 + k * 0.04) + k));
                    m.y = z.y0 - h * 0.16 + Math.sin(t * (0.8 + k * 0.15)) * h * 0.06;
                    var base = tm / (m.height || 1);
                    // Aletea encogiéndose de lado, como en ¿Qué suena?.
                    m.setScale(base * (0.35 + 0.65 * Math.abs(Math.sin(time / 70 + m.fase))), base);
                });
            }
            Object.keys(this.animales).forEach(function (id) {
                var a = scene.animales[id];
                if (!a.img.visible) return;
                var balanceo = a.quieto && !reducido() ? Math.sin(time / 600 + a.fase) * 2 : 0;
                a.img.setPosition(a.x, a.y - a.alto);
                a.img.angle = a.celebrando ? a.img.angle : balanceo;
                a.img.setDepth(a.alto > a.size * 0.3 ? 60 : a.y);
                a.sombra.setPosition(a.x, a.y - 2).setDepth(a.y - 1);
                if (VUELAN[id] && scene.textures.exists(tex(id) + ':alas')) {
                    var aleteo = !a.quieto && Math.sin(time / 70) > 0;
                    a.img.setTexture(aleteo ? tex(id) + ':alas' : tex(id));
                }
                a.img.setAlpha(a.resaltado ? 0.6 + 0.4 * Math.sin(time / 140) : 1);
            });
        },

        /* ── Toques ───────────────────────────────────────────────── */

        alTocar: function (pointer) {
            if (!this.jugando || this.ocupada || !puedeTocar()) return;
            var px = pointer.worldX;
            var py = pointer.worldY;
            var scene = this;
            var lista = Object.keys(this.animales).map(function (id) { return scene.animales[id]; })
                .filter(function (a) { return a.img.visible && scene.enGranero.indexOf(a) === -1; })
                .sort(function (a, b) { return b.y - a.y; });
            for (var i = 0; i < lista.length; i++) {
                var a = lista[i];
                var arriba = a.y - a.alto - a.size - 10;
                if (Math.abs(px - a.x) < Math.max(a.ancho, a.size * 0.6) / 2 + 12 && py > arriba && py < a.y - a.alto + 12) {
                    this.responder(a);
                    return;
                }
            }
        },

        responder: function (a) {
            var scene = this;
            if (a.id === this.objetivo) {
                this.jugando = false;
                avisar('onAcierto', a.id);
                return;
            }
            this.ocupada = true;
            if (!reducido()) this.tweens.add({ targets: a, alto: a.size * 0.25, duration: 150, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            avisar('onError', a.id, { pan: this.panDe(a.id) });
            this.time.delayedCall(1500, function () { scene.ocupada = false; });
        },

        animalDe: function (id) {
            var a = this.animales[id];
            return a && a.img.visible ? a : null;
        },

        /** Pista: el objetivo da un salto donde está. */
        pista: function (id) {
            var a = this.animalDe(id);
            if (!a || reducido()) return;
            this.tweens.add({ targets: a, alto: a.size * 0.3, duration: 170, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
        },

        resaltar: function (id, si) {
            var a = this.animalDe(id);
            if (a) a.resaltado = !!si;
        },

        /* ── Premio: el granero ──────────────────────────────────── */

        /** Documento: el elemento se detiene, suena y hay una animación especial. */
        celebrar: function (id) {
            var a = this.animalDe(id) || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!a) return Promise.resolve();
            var scene = this;
            Object.keys(this.animales).forEach(function (k) { var b = scene.animales[k]; if (b.tween) b.tween.stop(); });
            a.resaltado = false;
            a.celebrando = true;
            this.chispas(a.x, a.y - a.size / 2, 18);
            if (!reducido()) {
                this.tweens.add({ targets: a.img, angle: 360, duration: 700, ease: 'Cubic.easeInOut' });
                this.tweens.add({ targets: a, alto: a.size * 0.4, duration: 300, yoyo: true, ease: 'Quad.easeOut' });
            }
            return esperar(this, 1300).then(function () { a.celebrando = false; a.img.angle = 0; });
        },

        /** El animal camina hasta el granero, entra y se asoma por una ventanita. */
        guardarEnGranero: function (id) {
            var a = this.animalDe(id);
            var scene = this;
            if (!a) return Promise.resolve();
            var p = this.graneroPos;
            var t = { k: 0 };
            return new Promise(function (resolve) {
                t.k = 0;
                scene.tweens.add({ targets: t, k: 1, duration: reducido() ? 1 : 400, onUpdate: function () { scene.dibujarPuertas(t.k); }, onComplete: resolve });
            }).then(function () {
                return scene.caminarA(a, { x: p.puertaX, y: p.puertaY }, 1.5);
            }).then(function () {
                a.img.setVisible(false);
                a.sombra.setVisible(false);
                sfx('puerta');
                var t2 = { k: 1 };
                scene.tweens.add({ targets: t2, k: 0, duration: reducido() ? 1 : 400, onUpdate: function () { scene.dibujarPuertas(t2.k); } });
                var v = scene.ventanitas[scene.enGranero.length % 4];
                var cara = scene.add.image(v.x, v.y + v.t / 2, tex(id)).setOrigin(0.5, 1).setDepth(-10);
                cara.setScale(Math.min(v.t * 0.95 / (cara.width || 1), v.t * 0.95 / (cara.height || 1)));
                cara.base = v.y + v.t / 2;
                cara.setAlpha(0);
                scene.tweens.add({ targets: cara, alpha: 1, duration: 300 });
                scene.enGranero.push(cara);
                scene.chispas(v.x, v.y, 8);
                sfx('ding');
                // El animal vuelve a pasear en la próxima ronda (sale por detrás del granero).
                a.x = -300;
                return esperar(scene, 500);
            });
        },

        /**
         * Final: se abren de par en par las puertas del granero y salen todos en fila a
         * saltar al pasto. El molino se acelera, las nubes corren y cae confeti.
         */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.graneroAbierto = true;
            this.festejando = true;
            sfx('puerta');
            // Las puertas se abren despacio, de par en par.
            var t = { k: 0 };
            this.tweens.add({
                targets: t, k: 1, duration: reducido() ? 1 : 700, ease: 'Cubic.easeOut',
                onUpdate: function () { scene.dibujarPuertas(t.k); }
            });
            var p = this.graneroPos;
            var z = this.zona();
            var ids = Object.keys(this.animales);
            // Los que estaban asomados se meten dentro antes de salir por la puerta.
            this.enGranero.forEach(function (c) {
                scene.tweens.add({ targets: c, alpha: 0, y: c.y + 10, duration: 300 });
            });
            ids.forEach(function (id, i) {
                var a = scene.animales[id];
                a.img.setVisible(true);
                a.sombra.setVisible(true);
                a.celebrando = false;
                // Todos salen del portón, uno detrás de otro.
                a.x = p.puertaX;
                a.y = p.puertaY;
                a.alto = 0;
                a.img.setAlpha(1);
                var destino = {
                    x: z.x0 + (z.x1 - z.x0) * ((i + 0.5) / ids.length),
                    y: z.y0 + (z.y1 - z.y0) * (i % 2 ? 0.7 : 0.35)
                };
                scene.time.delayedCall(500 + i * 260, function () {
                    sfx('paso');
                    scene.caminarA(a, destino, 1.3).then(function () {
                        if (reducido()) return;
                        // Saltos: cada uno con su ritmo, y polvito al caer.
                        var salto = scene.tweens.add({
                            targets: a, alto: a.size * 0.34, duration: 230 + i * 20,
                            ease: 'Quad.easeOut', yoyo: true, repeat: -1,
                            onYoyo: function () { scene.polvo(a.x, a.y); }
                        });
                        var baile = scene.tweens.add({
                            targets: a.img, angle: { from: -7, to: 7 }, duration: 240,
                            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                        });
                        // Saltan hasta que la fiesta termina; luego quedan quietos y derechos.
                        a.fiestaTweens = [salto, baile];
                        scene.chispas(a.x, a.y - a.size * 0.6, 6);
                    });
                });
            });
            this.confeti();
            // Más confeti a media fiesta, para que no se apague de golpe.
            this.time.delayedCall(1400, function () { scene.confeti(); });
            return esperar(this, 3600).then(function () {
                scene.festejando = false;
                ids.forEach(function (id) {
                    var a = scene.animales[id];
                    (a.fiestaTweens || []).forEach(function (tw) { if (tw && tw.stop) tw.stop(); });
                    a.fiestaTweens = null;
                    a.alto = 0;
                    a.img.angle = 0;
                });
            });
        },

        /** Polvito en el suelo cuando un animal cae de un salto. */
        polvo: function (x, y) {
            if (reducido()) return;
            for (var i = 0; i < 5; i++) {
                var d = rnd(14, 34) * (i % 2 ? 1 : -1);
                var nube = this.add.ellipse(x, y - 2, rnd(10, 18), rnd(5, 9), 0xe8dcc0, 0.75).setDepth(y - 0.5);
                this.tweens.add({
                    targets: nube, x: x + d, y: y - rnd(6, 16), alpha: 0, scaleX: 1.6, scaleY: 1.6,
                    duration: rnd(350, 550), onComplete: (function (o) { return function () { o.destroy(); }; })(nube)
                });
            }
        },

        /* ── Efectos y utilidades ───────────────────────────────── */

        chispas: function (x, y, n) {
            if (reducido()) return;
            for (var i = 0; i < n; i++) {
                var a = (Math.PI * 2 / n) * i;
                var d = rnd(60, 150);
                var st = this.add.star(x, y, 5, 4, 10, FIESTA[i % FIESTA.length]).setDepth(100);
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
                var c = this.add.rectangle(rnd(0, w), -20, rnd(8, 14), rnd(5, 9), FIESTA[i % FIESTA.length]).setDepth(100);
                this.tweens.add({
                    targets: c, y: h + 30, x: c.x + rnd(-80, 80), angle: rnd(180, 720), duration: rnd(1400, 2200), delay: rnd(0, 900),
                    onComplete: (function (o) { return function () { o.destroy(); }; })(c)
                });
            }
        },

        /** Ejemplo guiado: un solo animal quieto en el campo. */
        demo: function (id) {
            var scene = this;
            Object.keys(this.animales).forEach(function (k) { scene.animales[k].img.setVisible(false); scene.animales[k].sombra.setVisible(false); });
            var a = this.crearAnimal(id);
            a.img.setVisible(true);
            a.sombra.setVisible(true);
            var z = this.zona();
            a.x = (z.x0 + z.x1) / 2;
            a.y = (z.y0 + z.y1) / 2;
            this.demoObj = a;
        },

        limpiarDemo: function () {
            var a = this.demoObj;
            this.demoObj = null;
            if (a) { a.img.setVisible(false); a.sombra.setVisible(false); a.x = -300; }
            return Promise.resolve();
        },

        rectDe: function (id) {
            var a = this.animalDe(id);
            if (!a) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            var y = a.y - a.alto;
            return {
                x: r.left + a.x * sx,
                y: r.top + (y - a.size / 2) * sy,
                left: r.left + (a.x - a.ancho / 2) * sx,
                top: r.top + (y - a.size) * sy,
                width: a.ancho * sx,
                height: a.size * sy
            };
        },

        /** El sonido sale de donde está el animal en este momento. */
        panDe: function (id) {
            var a = this.animalDe(id);
            if (!a) return 0;
            return Phaser.Math.Clamp((a.x / this.scale.width) * 2 - 1, -1, 1) * 0.85;
        },

        estado: function () {
            var scene = this;
            return {
                jugando: this.jugando,
                modo: this.modo,
                ronda: this.ronda,
                objetivo: this.objetivo,
                granero: this.enGranero.length,
                animales: Object.keys(this.animales).filter(function (id) { return scene.animales[id].img.visible; })
                    .map(function (id) { var a = scene.animales[id]; return { id: id, x: Math.round(a.x), y: Math.round(a.y), quieto: a.quieto }; })
            };
        }
    });

    function cargarTexturas(scene) {
        var elems = (gameConfig && gameConfig.elementos) || {};
        var lista = [];
        Object.keys(elems).forEach(function (id) {
            if (elems[id].img) lista.push({ key: tex(id), src: elems[id].img });
            if (elems[id].imgAlas) lista.push({ key: tex(id) + ':alas', src: elems[id].imgAlas });
        });
        lista = lista.filter(function (t) { return !scene.textures.exists(t.key); });
        var faltaEscena = !scene.textures.exists(texEscena('fondo'));
        if (!lista.length && !faltaEscena) return Promise.resolve();
        return new Promise(function (resolve) {
            lista.forEach(function (t) {
                if (/\.svg(\?|$)/i.test(t.src)) scene.load.svg(t.key, t.src, { scale: 2 });
                else scene.load.image(t.key, t.src);
            });
            if (faltaEscena) encolarEscena(scene);
            scene.load.once('complete', function () {
                if (scene.aplicarEscena) scene.aplicarEscena();
                resolve();
            });
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
        var el = doc.getElementById('granja-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'granja-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-granja');
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#a5d8ff',
            audio: { noAudio: true },
            scene: [EscenaGranja],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-granja');
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }
        return esperarEscena().then(function (scene) {
            return cargarTexturas(scene).then(function () { return scene; });
        });
    }

    function conEscena(fn) {
        return function () {
            if (!sceneRef) return undefined;
            return fn.apply(null, [sceneRef].concat(Array.prototype.slice.call(arguments)));
        };
    }

    global.PedniaGranja = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        viajar: conEscena(function (s) { return s.viajar(); }),
        volverInicio: conEscena(function (s) { return s.volverInicio(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        guardarEnGranero: conEscena(function (s, id) { return s.guardarEnGranero(id); }),
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
            global.document.body.classList.remove('modo-granja');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
