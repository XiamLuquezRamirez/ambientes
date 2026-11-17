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

    /* ── Arte del diseño ──────────────────────────────────────────
     * El diseñador entregó las cuatro regiones ya pintadas (1280×720)
     * con sus tres pedestales dibujados: tocones en la selva, rocas en
     * el desierto, piedras en la cueva y rocas nevadas en la cima.
     * El mundo es más ancho que una pantalla, así que el dibujo se
     * repite en mosaico y cada copia aporta sus tres apoyos reales.
     * Aquí solo se colocan encima las cosas, las flechas, el mapa del
     * premio y el cofre final; nada del paisaje se vuelve a pintar.
     */
    var ESCENA_V = '?v=20261114expedicion';
    var FONDO_W = 1280;
    var FONDO_H = 720;
    var ESCENA = {
        selva: 'img/selva.svg',
        desierto: 'img/desierto.svg',
        cueva: 'img/cueva.svg',
        cima: 'img/cima.svg',
        mapa: 'img/mapa.svg',
        bandera: 'img/bandera_mapa.svg',
        cofreCaja: 'img/cofre_caja.svg',
        cofreTapa: 'img/cofre_tapa.svg',
        flechaIzq: 'img/flecha_izq.svg',
        flechaDer: 'img/flecha_der.svg'
    };
    // Apoyos medidos sobre cada dibujo 1280×720: x del centro del pedestal
    // e y de su superficie, donde se posa la cosa.
    // La y es la superficie medida más unos píxeles de hundido, para que la
    // cosa se apoye en el pedestal y no parezca flotar sobre él.
    var APOYOS = {
        selva: [{ x: 354, y: 532 }, { x: 657, y: 464 }, { x: 940, y: 587 }],
        desierto: [{ x: 376, y: 598 }, { x: 659, y: 490 }, { x: 952, y: 566 }],
        cueva: [{ x: 370, y: 490 }, { x: 680, y: 390 }, { x: 960, y: 522 }],
        cima: [{ x: 318, y: 540 }, { x: 640, y: 494 }, { x: 920, y: 580 }]
    };
    // Color del borde superior e inferior de cada dibujo, para rellenar las
    // franjas que el mosaico no cubre en pantallas más altas que 16:9.
    var BORDES = {
        selva: { arriba: 0x71b738, abajo: 0x438926 },
        desierto: { arriba: 0xf4b168, abajo: 0xfaa262 },
        cueva: { arriba: 0x100d16, abajo: 0x0d0b12 },
        cima: { arriba: 0x3c5884, abajo: 0xeef4fb }
    };
    // Las cuatro marcas del MAPA del diseño, en su lienzo 837×500, en el
    // orden del recorrido: selva, desierto, cueva, cima.
    var MAPA_W = 837;
    var MAPA_H = 500;
    var MAPA_PARADAS = [
        { x: 218, y: 166, r: 24 },
        { x: 312, y: 221, r: 30 },
        { x: 591, y: 116, r: 31 },
        { x: 578, y: 328, r: 47 }
    ];
    // El camino punteado del mapa.svg (su <path class="cls-5"> y las dos puntas),
    // muestreado cada ~13 px de su largo (1156) en el mismo lienzo 837×500. Va de
    // la marca verde a la azul; MAPA_CAMINO_PARADA dice qué punto del camino toca
    // cada marca (el más cercano a su centro).
    var MAPA_CAMINO = ('216,175 213,188 211,200 212,213 216,225 223,236 233,244 245,248 258,249 ' +
        '271,247 283,243 294,237 305,229 314,221 323,211 331,201 339,191 347,181 356,172 365,163 ' +
        '375,155 385,147 395,139 406,132 417,126 428,120 440,114 452,110 464,105 477,102 489,99 ' +
        '502,97 515,96 527,96 540,96 553,98 565,102 577,107 588,114 596,124 602,135 604,148 ' +
        '606,160 605,173 600,185 593,196 583,204 572,210 560,215 548,219 535,222 523,225 510,227 ' +
        '498,230 485,233 472,235 460,238 448,242 436,246 424,251 412,257 401,264 391,272 382,281 ' +
        '375,291 369,303 364,314 361,327 359,340 360,352 363,365 368,377 374,388 383,398 392,406 ' +
        '403,413 414,419 426,424 439,427 452,428 464,428 477,427 490,424 502,420 513,415 524,408 ' +
        '534,400 544,391 552,381 559,370 565,359').split(' ').map(function (par) {
            var xy = par.split(',');
            return { x: +xy[0], y: +xy[1] };
        });
    var MAPA_CAMINO_PARADA = [0, 13, 38, 90];
    // Velocidad del explorador sobre el mapa (px del lienzo por segundo): lenta,
    // para que el niño siga con la vista el camino de una parada a la otra.
    var MAPA_VELOCIDAD = 95;
    // Alto de la bandera en px del lienzo del mapa (igual en todas las marcas).
    var MAPA_BANDERA_ALTO = 62;
    // La bandera ocupa 419×451 de su lienzo 500×500, con el pie del asta
    // abajo a la izquierda: de ahí salen su origen y su escala.
    var BANDERA = { x0: 40, y0: 24, w: 419, h: 451, pieX: 52, pieY: 475 };
    // Las flechas del diseño traen mucho aire: el disco ocupa 263 de 500 px.
    var FLECHA_LIENZO = 500;
    var FLECHA_UTIL = 263;
    // Lo lejano se desplaza a un tercio de lo cercano: así se nota la distancia.
    var PARALLAX = 0.34;
    // De la capa lejana solo se ve la franja del relieve del dibujo (en partes
    // de su alto): ni su cielo, que duplicaría el sol, ni su suelo.
    var CIELO_LEJOS = 0.34;
    var SUELO_LEJOS = 0.78;
    // Mariposas del diseño (mariposa1..5.svg), compartidas con los demás juegos.
    var MARIPOSAS = 5;
    // Las tres antorchas que el dibujo de la cueva ya trae, medidas sobre él.
    var ANTORCHAS = [{ x: 240, y: 190 }, { x: 695, y: 172 }, { x: 1172, y: 173 }];

    function texEscena(parte) {
        return 'expedicion:escena:' + parte;
    }

    function encolarEscena(load) {
        Object.keys(ESCENA).forEach(function (k) {
            var src = ESCENA[k];
            if (!src) return;
            if (src.indexOf('?') === -1) src += ESCENA_V;
            load.svg(texEscena(k), src);
        });
        // Las mariposas son siempre las del diseño, nunca dibujadas por código.
        // Son SVG sin ancho/alto: hay que darles tamaño o salen en negro.
        for (var i = 1; i <= MARIPOSAS; i++) {
            load.svg(texEscena('mariposa' + i), 'img/mariposa' + i + '.svg' + ESCENA_V, { width: 160, height: 160 });
        }
    }

    function hayArte(scene) {
        return !!(scene && scene.textures && scene.textures.exists(texEscena('selva')));
    }

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
            'body.modo-expedicion{background:#71b738 !important}',
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
            // Hasta que se sepa si hay arte del diseño no se pinta paisaje alguno.
            this.arteDecidido = false;
        },

        create: function () {
            // Arte del diseño: franjas del borde y, encima, las copias del dibujo
            // (se crean en aplicarEscena, ya con su textura) y todo lo demás.
            this.bordes = this.add.graphics().setDepth(-36).setScrollFactor(0).setVisible(false);
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
            // Flechas para mirar a los lados (fijas en la pantalla). Si el diseño
            // trae las suyas se usan esas; si no, el botón dibujado de siempre.
            this.flechas = [-1, 1].map(function (dir) {
                var c = this.add.container(0, 0).setDepth(40).setScrollFactor(0);
                var key = texEscena(dir < 0 ? 'flechaIzq' : 'flechaDer');
                if (this.textures.exists(key)) {
                    c.add(this.add.image(0, 0, key));
                } else {
                    c.add(this.add.circle(0, 0, 34, 0xffffff, 0.85));
                    c.add(this.add.triangle(dir * 4, 0, 0, -16, 0, 16, dir * 22, 0, 0x1971c2).setOrigin(0.5));
                }
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

        /** Cuando llega el arte, las flechas dibujadas se cambian por las del diseño. */
        rehacerFlechas: function () {
            var scene = this;
            if (!this.textures.exists(texEscena('flechaIzq'))) return;
            this.flechas.forEach(function (c) {
                if (c.conArte) return;
                c.removeAll(true);
                c.add(scene.add.image(0, 0, texEscena(c.dir < 0 ? 'flechaIzq' : 'flechaDer')));
                c.conArte = true;
            });
        },

        ubicarFijos: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            // Tamaño del botón: el mismo que tenía el dibujado (68 px de diámetro).
            var lado = Math.min(96, Math.max(68, Math.min(w, h) * 0.13));
            this.flechas.forEach(function (c) {
                var im = c.list[0];
                // El disco del diseño ocupa 263 de los 500 px del lienzo: se escala
                // por esa parte útil, o la flecha se vería a poco más de la mitad.
                if (im && im.setDisplaySize && im.width) {
                    var lienzo = lado * (FLECHA_LIENZO / FLECHA_UTIL);
                    im.setDisplaySize(lienzo, lienzo);
                }
            });
            // Separada del borde lo bastante para poder tocarla con el dedo.
            var margen = lado * 0.5 + 14;
            this.margenFlecha = margen;
            this.flechas[0].setPosition(margen, h * 0.5);
            this.flechas[1].setPosition(w - margen, h * 0.5);
            this.radioFlecha = lado * 0.5;
            this.penumbra.setSize(w, h);
        },

        /**
         * Mapa del dibujo del diseño → pantalla. El dibujo se escala por su
         * alto (ocupa toda la pantalla) y se repite a lo ancho del mundo, así
         * que de cada copia salen tres apoyos. null si aún no hay textura.
         */
        mapaArte: function () {
            if (!hayArte(this)) return null;
            var h = this.scale.height;
            // El dibujo llena el alto de la pantalla; a lo ancho se repite en
            // mosaico cuantas veces haga falta, así que nunca sobra espacio.
            var esc = h / FONDO_H;
            var anchoCopia = FONDO_W * esc;
            var altoCopia = FONDO_H * esc;
            var oy = 0;
            return {
                esc: esc, oy: oy, copia: anchoCopia, alto: altoCopia,
                sx: function (x, i) { return (i || 0) * anchoCopia + x * esc; },
                sy: function (y) { return oy + y * esc; }
            };
        },

        /**
         * Los apoyos reales del dibujo, repetidos a lo ancho del mundo. Las
         * copias impares van espejadas, así que sus apoyos también se reflejan.
         */
        apoyosArte: function () {
            var m = this.mapaArte();
            if (!m) return null;
            var lista = APOYOS[this.region] || APOYOS.selva;
            var copias = Math.ceil(this.mundoW / m.copia);
            var out = [];
            for (var i = 0; i < copias; i++) {
                var espejo = i % 2 === 1;
                for (var k = 0; k < lista.length; k++) {
                    var xd = espejo ? FONDO_W - lista[k].x : lista[k].x;
                    var x = m.sx(xd, i);
                    if (x > this.mundoW - 20) continue;
                    out.push({ x: x, y: m.sy(lista[k].y) });
                }
            }
            // De izquierda a derecha, que lugares() los reparte por tramos.
            out.sort(function (a, b) { return a.x - b.x; });
            return out;
        },

        /**
         * Mientras llega el dibujo del diseño: solo el color del lugar, en vez
         * del paisaje a mano, que asomaría un instante y luego desaparecería.
         */
        esperandoArte: function (W) {
            var w = this.scale.width;
            var h = this.scale.height;
            var col = BORDES[this.region] || BORDES.selva;
            this.ocultarArte();
            [this.cielo, this.lejos, this.fondo, this.sueloG, this.frente].forEach(function (g) {
                if (g) g.clear().setVisible(false);
            });
            var bg = this.bordes;
            bg.clear().setVisible(true);
            bg.fillStyle(col.arriba, 1);
            bg.fillRect(0, 0, w, h * 0.72);
            bg.fillStyle(col.abajo, 1);
            bg.fillRect(0, h * 0.72 - 1, w, h - h * 0.72 + 1);
            this.penumbra.fillAlpha = 0;
            this.copos = [];
            void W;
        },

        /** Apaga el dibujo del diseño (sus copias espejadas y el mosaico antiguo). */
        ocultarArte: function () {
            if (this.copias) this.copias.forEach(function (im) { if (im) im.setVisible(false); });
            if (this.lejanas) this.lejanas.forEach(function (im) { if (im) im.setVisible(false); });
            if (this.niebla) this.niebla.setVisible(false);
            if (this.luz) this.luz.clear().setVisible(false);
        },

        /**
         * Profundidad al mirar a los lados: detrás del paisaje va el mismo dibujo
         * más grande, desvaído y con `scrollFactor` bajo, así que se desplaza
         * más despacio que el suelo. Delante, un velo de niebla del color del
         * lugar separa el fondo de las cosas que se tocan.
         */
        ponerLejania: function (m, key, W) {
            var h = this.scale.height;
            var col = BORDES[this.region] || BORDES.selva;
            // La capa lejana se mueve a un tercio: necesita menos ancho.
            var escL = m.esc * 1.22;
            var copiaL = FONDO_W * escL;
            var nL = Math.ceil((W * PARALLAX + this.scale.width) / copiaL) + 1;
            if (!this.lejanas) this.lejanas = [];
            for (var i = 0; i < nL; i++) {
                var im = this.lejanas[i];
                if (!im) {
                    im = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-34)
                        .setScrollFactor(PARALLAX, 1);
                    this.lejanas[i] = im;
                }
                im.setTexture(key).setVisible(true)
                    .setScale(escL).setFlipX(i % 2 === 1)
                    .setAlpha(0.42)
                    // Un poco más arriba: al estar lejos, su horizonte sube.
                    .setPosition(i * copiaL, m.oy - h * 0.06);
                // Del dibujo lejano solo se usa la franja del relieve (montañas,
                // mesetas, copas): con su cielo se verían dos soles y dos nevadas,
                // y con su suelo taparía el paisaje cercano. setCrop es por objeto,
                // así que no afecta a las copias de primer plano.
                im.setCrop(0, FONDO_H * CIELO_LEJOS, FONDO_W, FONDO_H * (SUELO_LEJOS - CIELO_LEJOS));
            }
            this.lejanas.forEach(function (im, i) {
                if (i >= nL && im) im.setVisible(false);
            });
            // Velo de aire entre la lejanía y el paisaje: va DETRÁS de las copias
            // (depth -35) para no cubrirlas; solo matiza lo que se ve al fondo.
            if (!this.niebla) {
                this.niebla = this.add.graphics().setDepth(-35).setScrollFactor(0);
            }
            var g = this.niebla;
            g.clear().setVisible(true);
            g.fillStyle(col.arriba, 1);
            g.fillRect(0, 0, this.scale.width, h);
        },

        /** Coloca el dibujo del diseño y apaga todo el paisaje pintado a mano. */
        aplicarEscena: function (W) {
            var m = this.mapaArte();
            if (!m) return false;
            var w = this.scale.width;
            var h = this.scale.height;
            var key = texEscena(this.region);
            if (!this.textures.exists(key)) return false;
            // El dibujo no está hecho para repetirse: sus bordes izquierdo y derecho
            // no casan (árboles y montañas quedarían cortados en la unión). Por eso
            // no se usa un mosaico, sino copias sueltas con las impares espejadas:
            // así cada junta enfrenta un borde con su propio reflejo y no se ve.
            if (!this.copias) this.copias = [];
            var n = Math.ceil(W / m.copia);
            var scene = this;
            for (var i = 0; i < n; i++) {
                var im = this.copias[i];
                if (!im) {
                    im = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-32);
                    this.copias[i] = im;
                }
                im.setTexture(key).setVisible(true)
                    .setScale(m.esc).setFlipX(i % 2 === 1)
                    // Con flipX el origen sigue arriba a la izquierda, así que la
                    // posición no cambia; solo se invierte el contenido.
                    .setPosition(i * m.copia, m.oy);
            }
            this.copias.forEach(function (im, i) {
                if (i >= n && im) im.setVisible(false);
                void scene;
            });
            this.ponerLejania(m, key, W);
            // Franjas: el dibujo es 16:9; si la pantalla es más alta, se prolongan sus bordes.
            var col = BORDES[this.region] || BORDES.selva;
            var bg = this.bordes;
            bg.clear().setVisible(true);
            if (m.oy > 0) {
                bg.fillStyle(col.arriba, 1);
                bg.fillRect(0, 0, w, m.oy + 2);
            }
            var pie = m.oy + m.alto;
            if (pie < h) {
                bg.fillStyle(col.abajo, 1);
                bg.fillRect(0, pie - 2, w, h - pie + 2);
            }
            // El dibujo ya trae cielo, montañas, suelo y pedestales: no pintar encima.
            [this.cielo, this.lejos, this.fondo, this.sueloG, this.frente].forEach(function (g) {
                if (g) g.clear().setVisible(false);
            });
            this.penumbra.fillAlpha = 0;
            this.copos = [];
            return true;
        },

        suelo: function () {
            var m = this.mapaArte();
            // Con arte, el suelo es la base de los pedestales del dibujo (y≈660).
            if (m) return Math.min(this.scale.height * 0.96, m.sy(662));
            return this.scale.height * 0.86;
        },

        /* ── Región: paisaje ancho que se recorre arrastrando ──────── */

        dibujarRegion: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var R = REGIONES[this.region];
            var W = Math.round(w * R.ancho);
            this.mundoW = W;
            this.cameras.main.setBounds(0, 0, W, h);
            // Con el arte del diseño no se pinta nada del paisaje: el dibujo lo trae todo.
            if (this.aplicarEscena(W)) return;
            // Mientras el arte todavía está cargando no se dibuja el paisaje a mano:
            // asomaría un instante el dibujo viejo antes de que llegue el del diseño.
            // Solo queda el color de fondo del lugar, y al terminar la carga se repinta.
            if (!this.arteDecidido) {
                this.esperandoArte(W);
                return;
            }
            // Sin arte: se vuelve al paisaje de siempre (esperandoArte lo había apagado).
            this.ocultarArte();
            if (this.bordes) this.bordes.clear().setVisible(false);
            [this.cielo, this.lejos, this.fondo, this.sueloG, this.frente].forEach(function (g) {
                if (g) g.setVisible(true);
            });
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
            // Con el arte del diseño los pedestales ya están dibujados: no se pinta ninguno.
            if (this.mapaArte()) return;
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
            // Con el arte del diseño, cada cosa va sobre un pedestal dibujado.
            var apoyos = this.apoyosArte();
            if (apoyos && apoyos.length) {
                // Nunca puede faltar sitio: si el mundo no da para tantos pedestales
                // como cosas, se ensancha hasta que quepan todos (cada copia del
                // dibujo aporta tres). Sin esto la ronda se quedaba sin colocar nada.
                var m = this.mapaArte();
                if (apoyos.length < n && m) {
                    var copiasNec = Math.ceil(n / APOYOS[this.region].length);
                    this.mundoW = Math.max(this.mundoW, Math.round(copiasNec * m.copia));
                    this.cameras.main.setBounds(0, 0, this.mundoW, this.scale.height);
                    // Se repinta el fondo con las copias que ahora hacen falta.
                    this.aplicarEscena(this.mundoW);
                    apoyos = this.apoyosArte() || apoyos;
                }
                var elegidos;
                if (apoyos.length > n) {
                    // Repartidos a lo ancho: se toma uno de cada tramo.
                    var paso = apoyos.length / n;
                    elegidos = [];
                    for (var a = 0; a < n; a++) {
                        var base = Math.floor(a * paso);
                        var desp = Math.floor(Math.random() * Math.max(1, Math.floor(paso)));
                        elegidos.push(apoyos[Math.min(apoyos.length - 1, base + desp)]);
                    }
                } else {
                    elegidos = apoyos.slice(0, n);
                }
                // Último seguro: si aun así faltara alguno, se reparte por el suelo.
                while (elegidos.length < n) {
                    elegidos.push({ x: rnd(this.scale.width * 0.1, this.mundoW - this.scale.width * 0.1), y: s });
                }
                return mezclar(elegidos.map(function (p) { return { x: p.x, y: p.y }; }));
            }
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
            var tmp;
            if (iObj !== -1 && lug[iObj]) {
                if (this.ronda > 0 && lug[iObj].x < this.scale.width) {
                    // Desde la segunda región el objetivo se busca: va al fondo del mundo.
                    var j = lug.reduce(function (m, p, k) { return p.x > lug[m].x ? k : m; }, 0);
                    tmp = lug[iObj]; lug[iObj] = lug[j]; lug[j] = tmp;
                } else if (this.ronda === 0 && lug[iObj].x > this.scale.width * 0.88) {
                    // En la primera, en cambio, tiene que verse de entrada: si cayó
                    // fuera de la pantalla se cambia por el sitio visible más cercano.
                    var v = lug.reduce(function (m, p, k) {
                        return p.x < scene.scale.width * 0.88 && (m < 0 || p.x > lug[m].x) ? k : m;
                    }, -1);
                    if (v !== -1) { tmp = lug[iObj]; lug[iObj] = lug[v]; lug[v] = tmp; }
                }
            }
            o.elementos.forEach(function (id, i) {
                var c = scene.crearCosa(id);
                scene.medir(c);
                // Sin sitio asignado la cosa quedaría sin colocar y la ronda sin jugarse.
                var p = lug[i] || { x: scene.scale.width * (0.2 + 0.2 * i), y: scene.suelo() };
                c.x = p.x;
                c.y = p.y;
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
            // Vaivén que invita a tocar: hacia DENTRO de la pantalla, desde el margen
            // de ubicarFijos (que ya cuenta el tamaño del botón). Con 46 px fijos y el
            // vaivén hacia afuera, el botón grande se salía del borde.
            var mf = this.margenFlecha || 46;
            var va = (1 + Math.sin(time / 300)) * 3;
            this.flechas.forEach(function (f, i) { f.x = i ? scene.scale.width - mf - va : mf + va; });
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
            this.animarMariposas(time);
            if (reducido()) return;
            // El dibujo de la cima ya trae una nevada de fondo, pero plana: encima
            // van copos cercanos que caen de verdad, y en la cueva el resplandor
            // de sus antorchas. Lo que el dibujo ya hace no se repite.
            var conArte = !!this.mapaArte();
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
                // Las mariposas son las del diseño (animarMariposas); aquí solo
                // los pájaros del fondo y las motas de polen entre los rayos de luz.
                for (k = 0; k < 2; k++) pajaro(((t * (40 + k * 15) + k * 400) % (w + 200)) - 100, h * (0.16 + k * 0.06), k, 0x2b8a3e);
                for (k = 0; k < 16; k++) {
                    var px = w * ((k * 0.0717 + t * 0.012 + Math.sin(t * 0.3 + k) * 0.02) % 1);
                    var py = h * (0.2 + 0.6 * ((k * 0.41) % 1)) + Math.sin(t * 0.6 + k) * 18;
                    a.fillStyle(0xfff9db, 0.25 + 0.25 * Math.sin(t * 1.5 + k * 2));
                    a.fillCircle(px, py, 2.5 + (k % 3));
                }
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
                // El dibujo trae tres antorchas encendidas pero quietas: se les
                // pone encima un halo que late, para que parezcan arder.
                this.animarAntorchas(t, conArte);
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
                // Nieve cercana, en tres profundidades: los copos de delante son
                // grandes, caen deprisa y se mecen; los de atrás, finos y lentos.
                // El dibujo ya trae una nevada de fondo, así que esta va encima.
                while (this.copos.length < 90) {
                    var cerca = Math.random();
                    this.copos.push({
                        x: Math.random(), y: Math.random(),
                        v: 0.03 + cerca * 0.12,
                        r: 1.2 + cerca * 4,
                        f: Math.random() * 6,
                        vaiven: 8 + cerca * 26,
                        alfa: 0.45 + cerca * 0.5
                    });
                }
                this.copos.forEach(function (c) {
                    c.y += c.v * dt;
                    if (c.y > 1) { c.y = -0.02; c.x = Math.random(); }
                    a.fillStyle(0xffffff, c.alfa);
                    a.fillCircle(c.x * w + Math.sin(t * 0.8 + c.f) * c.vaiven, c.y * h, c.r);
                });
                // Ráfagas de viento que cruzan la cumbre.
                var raf = (t * 0.24) % 1;
                var ry2 = h * (0.3 + 0.18 * Math.sin(t * 0.3));
                a.lineStyle(2, 0xffffff, 0.3 * Math.sin(raf * Math.PI));
                for (k = 0; k < 4; k++) {
                    var rx2 = raf * (w + 300) - 200 + k * 46;
                    a.lineBetween(rx2, ry2 + k * 9, rx2 + 70 - k * 8, ry2 + k * 9 - 4);
                }
                // Un ave grande planeando muy alto, casi en silueta.
                var ax = w * (0.5 + 0.44 * Math.sin(t * 0.17));
                var ay = h * (0.15 + 0.04 * Math.sin(t * 0.5));
                var aleteo = 5 + Math.sin(t * 1.6) * 9;
                a.lineStyle(3, 0x3c5884, 0.75);
                a.lineBetween(ax - 26, ay - aleteo, ax, ay);
                a.lineBetween(ax, ay, ax + 26, ay - aleteo);
            }
        },

        /**
         * Las antorchas que el dibujo de la cueva ya trae (medidas en x 240, 695
         * y 1172 de su lienzo) reciben un halo que late, uno por copia del
         * mosaico. Va en coordenadas del mundo para moverse con el paisaje.
         */
        animarAntorchas: function (t, conArte) {
            if (!this.luz) {
                this.luz = this.add.graphics().setDepth(-31);
            }
            var g = this.luz;
            g.clear().setVisible(true);
            var m = conArte ? this.mapaArte() : null;
            if (!m) { g.setVisible(false); return; }
            var copias = Math.ceil(this.mundoW / m.copia);
            for (var i = 0; i < copias; i++) {
                var espejo = i % 2 === 1;
                for (var k = 0; k < ANTORCHAS.length; k++) {
                    var p = ANTORCHAS[k];
                    var xd = espejo ? FONDO_W - p.x : p.x;
                    var x = m.sx(xd, i);
                    if (x > this.mundoW) continue;
                    var y = m.sy(p.y);
                    // Cada llama late a su ritmo, para que no parpadeen a la vez.
                    var late = 0.72 + 0.28 * Math.sin(t * 5.5 + k * 2.1 + i);
                    var r = m.esc * 86 * late;
                    g.fillStyle(0xff922b, 0.1 * late);
                    g.fillCircle(x, y, r * 1.5);
                    g.fillStyle(0xffc078, 0.16 * late);
                    g.fillCircle(x, y, r);
                    g.fillStyle(0xfff3bf, 0.26 * late);
                    g.fillCircle(x, y, r * 0.5);
                }
            }
        },

        /**
         * Mariposas del diseño (mariposa1..5.svg), no dibujadas por código.
         * Solo en la selva: vuelan en bucles suaves y abren y cierran las alas.
         */
        animarMariposas: function (time) {
            var scene = this;
            var hay = this.textures.exists(texEscena('mariposa1'));
            var activas = hay && !reducido() && this.region === 'selva';
            if (!this.mariposas) this.mariposas = [];
            if (!activas) {
                this.mariposas.forEach(function (m) { m.setVisible(false); });
                return;
            }
            var w = this.scale.width;
            var h = this.scale.height;
            var t = time / 1000;
            var lado = Math.max(30, Math.min(54, w * 0.05));
            for (var i = 0; i < MARIPOSAS; i++) {
                // Cada mariposa espera SU imagen: los SVG llegan por separado y, si
                // se creaba con una que aún no había cargado, Phaser le ponía la
                // textura de «falta imagen» (cuadro negro con borde verde) para siempre.
                var clave = texEscena('mariposa' + (i + 1));
                if (!this.textures.exists(clave)) {
                    if (this.mariposas[i]) this.mariposas[i].setVisible(false);
                    continue;
                }
                var m = this.mariposas[i];
                if (!m) {
                    m = this.add.image(0, 0, clave)
                        .setDepth(27).setScrollFactor(0);
                    this.mariposas[i] = m;
                } else if (m.texture.key !== clave) {
                    m.setTexture(clave);
                }
                var fase = i * 1.7;
                // Recorrido en ocho, cada una a su altura y a su ritmo.
                var x = w * (0.5 + 0.4 * Math.sin(t * (0.16 + i * 0.03) + fase));
                // A media altura: por encima de los pedestales, lejos de la
                // cabecera y del globo de diálogo.
                var y = h * (0.44 + 0.14 * Math.sin(t * (0.42 + i * 0.05) + fase * 1.3));
                var base = lado / (m.width || 160);
                // Aleteo: se estrecha y se ensancha, como en los demás juegos.
                var ale = base * (0.35 + 0.65 * Math.abs(Math.sin(t * 7 + fase)));
                m.setVisible(true).setPosition(x, y);
                m.setScale(ale, base);
                // Mira hacia donde va.
                m.setFlipX(Math.cos(t * (0.16 + i * 0.03) + fase) < 0);
                void scene;
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
                if (f.visible && Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) < (this.radioFlecha || 34) + 10) {
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

        /**
         * El mapa del diseño: pergamino con las cuatro marcas de colores ya
         * pintadas (selva, desierto, cueva, cima). Encima van los sellos de lo
         * encontrado y la bandera del explorador en la parada actual.
         */
        mostrarMapaArte: function (k, ms, opts) {
            var scene = this;
            var w = this.scale.width;
            var h = this.scale.height;
            var m = this.mapa;
            var quieto = reducido();
            var esc = Math.min(w * 0.78 / MAPA_W, h * 0.68 / MAPA_H);
            var pergamino = this.add.image(0, 0, texEscena('mapa')).setScale(esc);
            m.add(pergamino);
            function enMapa(p) { return { x: (p.x - MAPA_W / 2) * esc, y: (p.y - MAPA_H / 2) * esc }; }
            // Las marcas del dibujo, llevadas al centro del pergamino.
            var puntos = MAPA_PARADAS.map(function (p) {
                var q = enMapa(p);
                q.r = p.r * esc;
                return q;
            });
            var camino = MAPA_CAMINO.map(enMapa);
            var idx = MAPA_CAMINO_PARADA;
            var ultima = puntos.length - 1;
            k = Math.min(k, ultima);
            // ¿Viaje a la parada siguiente? (al completar un nivel).
            var destino = opts && typeof opts.viajeA === 'number' && opts.viajeA <= ultima ? opts.viajeA : -1;

            // Rastro: el tramo ya recorrido se repasa en rojo sobre el punteado.
            var rastro = this.add.graphics();
            m.add(rastro);
            var grosor = Math.max(3, 5 * esc);
            function pintarRastro(hasta) {
                // hasta: índice (con decimales) del punto del camino.
                rastro.clear();
                if (hasta <= 0) return;
                rastro.lineStyle(grosor, 0xe03131, 0.85);
                rastro.beginPath();
                rastro.moveTo(camino[0].x, camino[0].y);
                var n = Math.floor(hasta);
                for (var a = 1; a <= n; a++) rastro.lineTo(camino[a].x, camino[a].y);
                var f = hasta - n;
                if (f > 0 && camino[n + 1]) {
                    rastro.lineTo(camino[n].x + (camino[n + 1].x - camino[n].x) * f,
                        camino[n].y + (camino[n + 1].y - camino[n].y) * f);
                }
                rastro.strokePath();
            }
            pintarRastro(idx[k]);

            // Sellos: lo encontrado en cada parada, dentro de su propia marca.
            this.paradas.forEach(function (id, i) {
                var p = puntos[i];
                if (!p) return;
                var lado = p.r * 1.45;
                var im = scene.add.image(p.x, p.y, tex(id));
                im.setScale(Math.min(lado / (im.width || 1), lado / (im.height || 1)));
                m.add(im);
                var est = scene.add.star(p.x + p.r * 0.95, p.y - p.r * 0.95, 5, p.r * 0.22, p.r * 0.46, 0xfcc419);
                m.add(est);
                // El sello recién ganado aparece con un saltito.
                if (opts && opts.nuevo === i && !quieto) {
                    var e0 = im.scale;
                    im.setScale(0.01);
                    est.setScale(0.01);
                    scene.tweens.add({ targets: im, scale: e0, duration: 450, delay: 300, ease: 'Back.easeOut' });
                    scene.tweens.add({ targets: est, scale: 1, duration: 450, delay: 550, ease: 'Back.easeOut' });
                }
            });

            // La bandera del diseño, clavada en el CENTRO de la marca: el pie del
            // asta en el centro, un poco abajo, y el paño por encima.
            var ban = null;
            var escBan = 1;
            function lugarBandera(p) { return { x: p.x, y: p.y + p.r * 0.3 }; }
            if (this.textures.exists(texEscena('bandera'))) {
                var lb = lugarBandera(puntos[k]);
                ban = this.add.image(lb.x, lb.y, texEscena('bandera'));
                escBan = MAPA_BANDERA_ALTO * esc / BANDERA.h;
                ban.setScale(escBan);
                // El pie del asta (52,475 del lienzo 500) queda en ese punto.
                ban.setOrigin(BANDERA.pieX / 500, BANDERA.pieY / 500);
            }

            // El explorador: un punto rojo que recorre el camino.
            var explorador = null;
            if (destino > k) {
                explorador = this.add.container(camino[idx[k]].x, camino[idx[k]].y);
                var halo = this.add.circle(0, 0, 16 * esc, 0xffffff, 0.55);
                var punto = this.add.circle(0, 0, 10 * esc, 0xe03131, 1).setStrokeStyle(Math.max(2, 3 * esc), 0xffffff, 1);
                explorador.add([halo, punto]);
                explorador.halo = halo;
                explorador.setVisible(false);
                m.add(explorador);
            }
            if (ban) m.add(ban);

            this.puntosMapa = puntos;
            m.setVisible(true).setAlpha(0).setScale(0.8);
            sfx('magia');

            function cerrar(resolve) {
                scene.time.delayedCall(quieto ? 300 : (ms || 1400), function () {
                    scene.tweens.add({ targets: m, alpha: 0, duration: quieto ? 1 : 300, onComplete: function () { m.setVisible(false); resolve(); } });
                });
            }

            return new Promise(function (resolve) {
                scene.tweens.add({ targets: m, alpha: 1, scale: 1, duration: quieto ? 1 : 300, ease: 'Back.easeOut' });
                if (!explorador) { cerrar(resolve); return; }

                var desde = idx[k];
                var hasta = idx[destino];
                // Largo del tramo en px del lienzo: de ahí sale la duración.
                var largo = 0;
                for (var a = desde; a < hasta; a++) {
                    largo += Math.hypot(MAPA_CAMINO[a + 1].x - MAPA_CAMINO[a].x, MAPA_CAMINO[a + 1].y - MAPA_CAMINO[a].y);
                }
                var dur = quieto ? 1 : Math.max(2600, Math.min(6500, largo / MAPA_VELOCIDAD * 1000));
                var pDest = puntos[destino];
                var lbDest = lugarBandera(pDest);

                // 1) Se ve el sello nuevo; la bandera se arranca de la parada hecha.
                scene.time.delayedCall(quieto ? 1 : 1300, function () {
                    if (ban) scene.tweens.add({ targets: ban, scaleY: 0.01, alpha: 0, duration: quieto ? 1 : 350, ease: 'Sine.easeIn' });
                    explorador.setVisible(true).setScale(0.01);
                    scene.tweens.add({ targets: explorador, scale: 1, duration: quieto ? 1 : 300, ease: 'Back.easeOut' });
                    // 2) El explorador sigue el camino punteado, despacio, y deja rastro.
                    var t = { v: desde };
                    var latido = quieto ? null : scene.tweens.add({ targets: explorador.halo, scale: 1.35, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
                    scene.tweens.add({
                        targets: t, v: hasta, duration: dur, delay: quieto ? 0 : 400, ease: 'Sine.easeInOut',
                        onUpdate: function () {
                            var n = Math.min(Math.floor(t.v), camino.length - 1);
                            var f = t.v - n;
                            var a0 = camino[n];
                            var a1 = camino[Math.min(n + 1, camino.length - 1)];
                            explorador.setPosition(a0.x + (a1.x - a0.x) * f, a0.y + (a1.y - a0.y) * f);
                            pintarRastro(t.v);
                        },
                        onComplete: function () {
                            // 3) Del final del camino al centro de la marca.
                            scene.tweens.add({
                                targets: explorador, x: pDest.x, y: pDest.y, duration: quieto ? 1 : 450, ease: 'Sine.easeOut',
                                onComplete: function () {
                                    if (latido) latido.stop();
                                    scene.tweens.add({ targets: explorador, scale: 0.01, alpha: 0, duration: quieto ? 1 : 250 });
                                    // 4) ¡Llegamos! Sale la bandera en el centro de la marca.
                                    if (ban) {
                                        ban.setPosition(lbDest.x, lbDest.y).setAlpha(1).setScale(escBan, 0.01);
                                        scene.tweens.add({ targets: ban, scaleY: escBan, duration: quieto ? 1 : 650, ease: 'Back.easeOut' });
                                    }
                                    sfx('ding');
                                    cerrar(resolve);
                                }
                            });
                        }
                    });
                });
            });
        },

        /** Mapa de pergamino con las 4 paradas; muestra la ruta hasta la parada k. */
        mostrarMapa: function (k, ms, opts) {
            var scene = this;
            var w = this.scale.width;
            var h = this.scale.height;
            var m = this.mapa;
            m.removeAll(true);
            m.setPosition(w / 2, h * 0.5);
            // El mapa del diseño, con sus cuatro marcas ya pintadas.
            if (this.textures.exists(texEscena('mapa'))) {
                return this.mostrarMapaArte(k, ms, opts);
            }
            var mw = Math.min(w * 0.7, 640);
            var mh = Math.min(h * 0.5, 320);
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
            // Al completar el nivel: se sella lo encontrado y el explorador recorre
            // el camino punteado hasta la parada siguiente, donde sale la bandera.
            var k = this.paradas.length - 1;
            return this.mostrarMapa(k, 1800, { nuevo: k, viajeA: k + 1 }).then(function () { void scene; });
        },

        /**
         * Final con el cofre del diseño, en dos piezas sobre el mismo lienzo
         * 609×500: la caja ocupa y 118..382 y la tapa (la cúpula) y 194..305, pero
         * dibujada DENTRO de la caja. Para armarlo como en el diseño, la tapa se
         * sube hasta que su borde de abajo (305) quede sobre el borde de arriba de
         * la caja (118). El cofre aparece entero y cerrado, y después SOLO se
         * levanta la tapa (bisagra atrás) y sale la luz con la insignia.
         */
        fiestaFinalArte: function (cx, s, cw, h) {
            var scene = this;
            var quieto = reducido();
            var ancho = Math.max(cw * 1.5, Math.min(this.scale.width * 0.3, 280));
            var esc = ancho / 609;
            var cofre = this.add.container(cx, s).setDepth(30);
            // La base de la caja (y 382 del lienzo) se apoya en el suelo (y 0).
            var CAJA_ARRIBA = 118, CAJA_ABAJO = 382, TAPA_ABAJO = 305, TAPA_ALTO = 111;
            var caja = this.add.image(0, -CAJA_ABAJO * esc, texEscena('cofreCaja')).setOrigin(0.5, 0).setScale(esc);
            // Bisagra de la tapa: el centro de su borde de abajo, apoyado sobre la caja
            // (se montan 3 px del lienzo para que no quede una rendija).
            var yBisagra = (CAJA_ARRIBA + 3 - CAJA_ABAJO) * esc;
            var tapa = this.add.image(0, yBisagra, texEscena('cofreTapa')).setOrigin(0.5, TAPA_ABAJO / 500).setScale(esc);
            // Luz que sale de dentro al abrir (detrás de la caja y de la tapa).
            var luz = this.add.ellipse(0, yBisagra, (552 - 56) * esc * 0.9, TAPA_ALTO * esc * 0.9, 0xffe066, 0);
            var rayos = this.add.graphics();
            rayos.fillStyle(0xfff3bf, 1);
            for (var r = -2; r <= 2; r++) {
                var bx = r * 90 * esc;
                rayos.fillTriangle(bx - 22 * esc, 0, bx + 22 * esc, 0, bx + r * 40 * esc, -190 * esc);
            }
            rayos.setPosition(0, yBisagra).setAlpha(0);
            cofre.add([rayos, luz, caja, tapa]);
            cofre.setScale(0.01);
            var yInsignia = s + yBisagra - TAPA_ALTO * esc * 0.4;
            var ins = this.textures.exists(tex('__insignia'))
                ? this.add.image(cx, yInsignia, tex('__insignia')).setDepth(29).setScale(0.01) : null;
            // 1) Aparece el cofre cerrado, entero.
            this.tweens.add({ targets: cofre, scale: 1, duration: quieto ? 1 : 500, ease: 'Back.easeOut' });
            // 2) Se queda cerrado un momento, tiembla un poquito y se abre la tapa.
            this.time.delayedCall(quieto ? 1 : 1000, function () {
                if (!quieto) scene.tweens.add({ targets: cofre, angle: { from: -2, to: 2 }, duration: 70, yoyo: true, repeat: 3, onComplete: function () { cofre.angle = 0; } });
            });
            this.time.delayedCall(quieto ? 1 : 1500, function () {
                sfx('magia');
                // La tapa gira hacia atrás sobre su bisagra: sube, se inclina un poco
                // y se ve más corta (se aleja), sin despegarse de la caja.
                scene.tweens.add({ targets: tapa, y: yBisagra - TAPA_ALTO * esc * 0.42, scaleY: esc * 0.72, angle: -8, duration: quieto ? 1 : 650, ease: 'Back.easeOut' });
                scene.tweens.add({ targets: luz, fillAlpha: 0.85, duration: quieto ? 1 : 400 });
                scene.tweens.add({ targets: rayos, alpha: 0.75, duration: quieto ? 1 : 500 });
                if (!quieto) scene.tweens.add({ targets: rayos, scaleX: 1.08, alpha: 0.45, duration: 700, yoyo: true, repeat: -1, delay: 500 });
                scene.chispas(cx, s + yBisagra, 24);
                if (ins) {
                    var t = h * 0.22;
                    var e2 = Math.min(t / (ins.width || 1), t / (ins.height || 1));
                    scene.tweens.add({ targets: ins, scale: e2, y: yInsignia - h * 0.2, duration: quieto ? 1 : 800, delay: quieto ? 0 : 200, ease: 'Back.easeOut' });
                }
            });
            this.confeti();
            return esperar(this, 3600);
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
            // Con el cofre del diseño: la caja y su tapa, que gira sobre la bisagra.
            if (this.textures.exists(texEscena('cofreCaja'))) {
                return this.fiestaFinalArte(cx, s, cw, h);
            }
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
            // Con el arte, sobre el primer tocón que quede a ese lado de la pantalla.
            var apoyos = this.apoyosArte();
            var elegido = null;
            if (apoyos) {
                for (var i = 0; i < apoyos.length; i++) {
                    if (apoyos[i].x < this.scale.width * 0.48) elegido = apoyos[i];
                }
                if (!elegido) elegido = apoyos[0];
            }
            c.x = elegido ? elegido.x : this.scale.width * 0.32;
            c.y = elegido ? elegido.y : this.suelo();
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
        var faltaEscena = !hayArte(scene);
        if (!lista.length && !faltaEscena) {
            // Ya estaba todo: se da por resuelto el arte y se pinta lo que toque.
            scene.arteDecidido = true;
            scene.dibujarRegion();
            return Promise.resolve();
        }
        return new Promise(function (resolve) {
            lista.forEach(function (t) {
                if (/\.svg(\?|$)/i.test(t.src)) scene.load.svg(t.key, t.src, { scale: 2 });
                else scene.load.image(t.key, t.src);
            });
            if (faltaEscena) encolarEscena(scene.load);
            function terminar() {
                // Ya se sabe si hay arte: se rehacen las flechas y se repinta la
                // región, con el dibujo del diseño o, si falló, con el de siempre.
                scene.arteDecidido = true;
                scene.rehacerFlechas();
                scene.dibujarRegion();
                scene.ubicarFijos();
                scene.reubicar();
                resolve();
            }
            // Si la carga falla, tampoco puede quedarse en el color de espera.
            scene.load.once('complete', terminar);
            scene.load.once('loaderror', function () {
                scene.load.once('complete', terminar);
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
            backgroundColor: '#71b738',
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
