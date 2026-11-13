/**
 * PedniaClima — "¿Qué tiempo hace?" (Encuentra el sonido de la lluvia, 3-4 años) en Phaser 4.2.1.
 *
 * Un parque con una laguna. En cada ronda el tiempo cambia y cuesta más ver las cosas:
 *   sol      → paraguas, pelota y árbol a la vista en el pasto (reto del documento).
 *   viento   → el viento las arrastra a otro sitio (seguirlas con los ojos).
 *   niebla   → cada cosa queda bajo una nube de niebla; tocarla la despeja.
 *   tormenta → de noche y lloviendo: solo se ven bien con los relámpagos.
 * Premio propio de este juego: el paraguas se abre sobre un patito que se mojaba; el
 * patito se va a la laguna con sus hermanos. Al final sale el arcoíris.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, refugiar, pista, resaltar,
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
    var ARCOIRIS = [0xff6b6b, 0xff922b, 0xfcc419, 0x51cf66, 0x339af0, 0x845ef7];
    /** Cielo de cada tiempo: arriba y abajo. */
    var CIELOS = {
        sol: [0x4dabf7, 0xd0ebff],
        viento: [0x74c0fc, 0xe7f5ff],
        niebla: [0xadb5bd, 0xe9ecef],
        tormenta: [0x1b2a44, 0x495057]
    };
    /** Cielo que se pinta detrás de la ilustración (sin su cielo): parte del azul del dibujo. */
    var CIELOS_ILU = {
        sol: [0x7fd8fd, 0xb9eeff],
        viento: [0x8fcfee, 0xd5f0fa],
        niebla: [0xaab6bf, 0xdde3e7],
        tormenta: [0x182338, 0x3b4658]
    };
    /** Tinte de las nubes de la ilustración según el tiempo (blanco = sin cambio). */
    var TINTE_NUBE = { sol: 0xffffff, viento: 0xffffff, niebla: 0xd5dbe0, tormenta: 0x5c6573 };
    var OSCURO = 0x2f3b52;
    var ESCENA = {
        fondo: 'img/fondo.svg',
        // El arcoíris de la ilustración, recortado aparte: sale solo en la fiesta final.
        arcoiris: 'img/arcoiris.svg',
        gota: 'img/gota.svg',
        neblina: ['img/neblina_1.svg', 'img/neblina_2.svg', 'img/neblina_3.svg'],
        nubeLluvia: 'img/nube_lluvia.svg',
        pato: 'img/pato.svg'
    };
    /**
     * Capas de la ilustración (img/capas, recortadas de img/fondo.svg con docs/partir_fondo.py):
     * la base va sin cielo (lo pinta el juego según el tiempo) y las nubes viajan por detrás
     * de las colinas. x, y = esquina de cada nube en el fondo de 1280×720.
     */
    var CAPA_BASE = 'img/capas/fondo_base.svg';
    var NUBES = [
        { src: 'img/capas/nube_1.svg', x: 963, y: 296, vel: 4 },
        { src: 'img/capas/nube_2.svg', x: 903, y: 77, vel: 7 },
        { src: 'img/capas/nube_3.svg', x: 561, y: 39, vel: 5 },
        { src: 'img/capas/nube_4.svg', x: 1065, y: 197, vel: 9 },
        { src: 'img/capas/nube_5.svg', x: 103, y: 97, vel: 6 },
        { src: 'img/capas/nube_6.svg', x: 265, y: 187, vel: 8 },
        { src: 'img/capas/nube_7.svg', x: 618, y: 253, vel: 10 }
    ];
    /** Laguna de la ilustración: el agua va de x 826 a 1223 y de y 453 a 533 (de 1280×720). */
    var LAGUNA = { x: 1024, y: 493, rx: 190, ry: 36 };
    /** Mariposas del diseño (copias de AsociaSonidoEImagen/QueSuena/img/mariposaN.svg). */
    var MARIPOSAS = ['img/mariposa1.svg', 'img/mariposa2.svg', 'img/mariposa3.svg', 'img/mariposa4.svg'];
    var HOJAS_VIENTO = [0x8cc63f, 0xa6d728, 0x6f9e1a, 0xc9d46a, 0xe8a33d];
    function texEscena(parte) { return 'clima:escena:' + parte; }
    var ESCENA_V = '?v=20261113capas';
    /** Todo lo del escenario que se carga. */
    function listaEscena() {
        var l = [
            { key: texEscena('fondo'), src: ESCENA.fondo },
            { key: texEscena('base'), src: CAPA_BASE },
            { key: texEscena('arcoiris'), src: ESCENA.arcoiris },
            { key: texEscena('gota'), src: ESCENA.gota },
            { key: texEscena('nubeLluvia'), src: ESCENA.nubeLluvia },
            { key: texEscena('pato'), src: ESCENA.pato }
        ];
        ESCENA.neblina.forEach(function (src, i) { l.push({ key: texEscena('neblina:' + i), src: src }); });
        NUBES.forEach(function (n, i) { l.push({ key: texEscena('nube:' + i), src: n.src }); });
        // Los SVG de Illustrator no traen ancho/alto: se cargan con load.svg y un tamaño, como en ¿Qué suena?.
        MARIPOSAS.forEach(function (src, i) { l.push({ key: texEscena('mariposa:' + i), src: src, svg: { width: 160, height: 160 } }); });
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
        return 'clima:' + id;
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
        if (doc.getElementById('clima-css')) return;
        var css = doc.createElement('style');
        css.id = 'clima-css';
        css.textContent = [
            '#clima-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#clima-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-clima{background:#a5d8ff !important}',
            'body.modo-clima #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-clima #principal button,body.modo-clima .dialogo{pointer-events:auto}',
            'body.modo-clima .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-clima .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-clima .parque-fondo,body.modo-clima #zonas,body.modo-clima #elementos{display:none !important}',
            'body.modo-clima .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(20vh,160px)}',
            'body.modo-clima .pj-zoe{left:6px}',
            'body.modo-clima .pj-zeus{right:6px}',
            'body.modo-clima .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaClima = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaClima() {
            Phaser.Scene.call(this, { key: 'EscenaClima' });
            this.cosas = {};
            this.nubes = [];
            this.gotas = [];
            this.hojas = [];
            this.patos = [];
            this.tiempo = 'sol';
            this.mezclaCielo = { t: 0, de: CIELOS.sol, a: CIELOS.sol };
            this.lluvia = 0;
            this.objetivo = null;
            this.jugando = false;
            this.ronda = 0;
            this.demoObj = null;
            this.proxRayo = 0;
        },

        preload: function () {
            encolarEscena(this.load);
        },

        create: function () {
            this.fondoImg = null;
            this.arcoImg = null;
            this.cielo = this.add.graphics().setDepth(-30);
            this.sol = this.add.circle(0, 0, 10, 0xffd43b, 1).setDepth(-29).setVisible(false);
            this.colinas = this.add.graphics().setDepth(-25);
            this.laguna = this.add.graphics().setDepth(-20);
            for (var i = 0; i < 4; i++) {
                var n = this.add.container(0, 0).setDepth(-27);
                n.add(this.add.circle(-30, 8, 22, 0xffffff, 1));
                n.add(this.add.circle(0, -6, 32, 0xffffff, 1));
                n.add(this.add.circle(32, 8, 21, 0xffffff, 1));
                n.vel = 6 + i * 3;
                n.base = [0.12, 0.38, 0.62, 0.86][i];
                n.alto = [0.12, 0.2, 0.09, 0.17][i];
                this.nubes.push(n);
            }
            this.capaLluvia = this.add.graphics().setDepth(12);
            this.gotasImg = [];
            // Mariposas que vuelan cuando hace sol: las del diseño (las mismas de ¿Qué suena?).
            this.mariposas = [];
            for (var mi = 0; mi < MARIPOSAS.length; mi++) {
                var keyM = texEscena('mariposa:' + mi);
                if (!this.textures.exists(keyM)) continue;
                var mar = this.add.image(0, 0, keyM).setDepth(7);
                mar.fase = mi * 1.7;
                this.mariposas.push(mar);
            }
            this.noche = this.add.rectangle(0, 0, 10, 10, 0x0b1730, 0).setOrigin(0).setDepth(9);
            // Niebla del ambiente: un velo claro sobre el paisaje (bajo las cosas) y bancos que pasan.
            this.bruma = this.add.rectangle(0, 0, 10, 10, 0xeef1f4, 0).setOrigin(0).setDepth(4);
            this.bancos = [];
            this.nubarrones = [];
            this.salpicones = [];
            this.rayoG = this.add.graphics().setDepth(12.5);
            this.rayo = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0).setDepth(13);
            this.arco = this.add.graphics().setDepth(-26).setAlpha(0);
            // Escena solo tras cargarTexturas.
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.ubicarCosas(true); });
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

        /**
         * Dónde cae cada punto de la ilustración (img/fondo.svg, 1280×720) en pantalla.
         * La imagen se centra y cubre, así que hay que convertir sus medidas; si no hay
         * fondo se devuelve null y mandan las proporciones de la escena dibujada.
         */
        marcoFondo: function () {
            var img = this.fondoImg;
            if (!img || !img.visible || !img.width) return null;
            var w = this.scale.width, h = this.scale.height;
            var k = Math.max(w / img.width, h / img.height);
            var x0 = w / 2 - img.width * k / 2, y0 = h / 2 - img.height * k / 2;
            return {
                k: k,
                px: function (u) { return x0 + u * k; },
                py: function (v) { return y0 + v * k; }
            };
        },

        horizonte: function () {
            var F = this.marcoFondo();
            // Línea del pasto en la ilustración: y ≈ 390 de 720.
            if (F) return F.py(390);
            return this.scale.height * 0.56;
        },

        /* ── Escenario: cielo, colinas, laguna ─────────────────────── */

        pintarCielo: function () {
            // Con el fondo entero el cielo viene en la imagen: repintarlo la taparía.
            // Con capas, la base no trae cielo y se pinta aquí, de alto completo, según el tiempo.
            if (this.fondoImg && this.fondoImg.visible && !this.usaCapas) { this.cielo.clear(); return; }
            var w = this.scale.width;
            var hz = this.usaCapas ? this.scale.height : this.horizonte();
            var m = this.mezclaCielo;
            var arriba = mezclarColor(m.de[0], m.a[0], m.t);
            var abajo = mezclarColor(m.de[1], m.a[1], m.t);
            var g = this.cielo;
            g.clear();
            for (var b = 0; b < 16; b++) {
                g.fillStyle(mezclarColor(arriba, abajo, b / 15), 1);
                g.fillRect(0, (hz / 16) * b - 1, w, hz / 16 + 2);
            }
        },

        dibujarFondo: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var hz = this.horizonte();
            this.usaCapas = this.conCapas();
            var keyFondo = this.usaCapas ? texEscena('base') : texEscena('fondo');
            if (this.textures.exists(keyFondo)) {
                if (!this.fondoImg) this.fondoImg = this.add.image(w / 2, h / 2, keyFondo).setDepth(-28);
                if (this.fondoImg.texture.key !== keyFondo) this.fondoImg.setTexture(keyFondo);
                // Con capas la base va delante del cielo y las nubes; sin capas, al fondo de todo.
                this.fondoImg.setDepth(this.usaCapas ? -28 : -31);
                this.fondoImg.setVisible(true).setPosition(w / 2, h / 2);
                var esc = Math.max(w / (this.fondoImg.width || 1), h / (this.fondoImg.height || 1));
                this.fondoImg.setScale(esc);
                this.colinas.clear();
                this.laguna.clear();
                this.sol.setVisible(false);
                this.nubes.forEach(function (n) { n.setVisible(false); });
                this.mezclaCielo.de = this.paleta()[this.tiempo] || this.paleta().sol;
                this.mezclaCielo.a = this.mezclaCielo.de;
                this.mezclaCielo.t = 1;
                this.pintarCielo();
                var F = this.marcoFondo();
                this.colocarNubes(F);
                // El agua de la laguna de la ilustración (ver LAGUNA).
                this.lagunaPos = F
                    ? { x: F.px(LAGUNA.x), y: F.py(LAGUNA.y), rx: LAGUNA.rx * F.k, ry: LAGUNA.ry * F.k }
                    : { x: w * 0.84, y: hz + h * 0.07, rx: Math.min(w * 0.13, 190), ry: h * 0.055 };
                this.noche.setSize(w, h);
                this.rayo.setSize(w, h);
                this.bruma.setSize(w, h);
                // El arcoíris es el mismo de la ilustración, recortado aparte: va encima
                // del fondo y en su sitio exacto, oculto hasta la fiesta final.
                this.arco.clear();
                var keyArco = texEscena('arcoiris');
                if (this.textures.exists(keyArco)) {
                    if (!this.arcoImg) this.arcoImg = this.add.image(0, 0, keyArco).setDepth(-30).setAlpha(this.arco.alpha);
                    this.arcoImg.setVisible(true).setPosition(w / 2, h / 2).setScale(esc);
                }
                var sceneArt = this;
                this.patos.forEach(function (pt, k) { var q = sceneArt.puestoPato(k); pt.setPosition(q.x, q.y); pt.base = q.y; });
                return;
            }
            if (this.fondoImg) this.fondoImg.setVisible(false);
            if (this.arcoImg) this.arcoImg.setVisible(false);
            this.sol.setVisible(true);
            this.nubes.forEach(function (n) { n.setVisible(true); });
            this.pintarCielo();
            this.sol.setPosition(w * 0.1, h * 0.14).setRadius(Math.min(w, h) * 0.05);
            this.nubes.forEach(function (n) {
                if (!n.listo) { n.x = w * n.base; n.listo = true; }
                n.y = h * n.alto;
                n.setScale(Math.min(1.4, w / 900));
            });
            var c = this.colinas;
            c.clear();
            c.fillStyle(0x8ce99a, 1);
            c.fillEllipse(w * 0.2, hz + h * 0.04, w * 0.7, h * 0.22);
            c.fillStyle(0x69db7c, 1);
            c.fillEllipse(w * 0.75, hz + h * 0.05, w * 0.8, h * 0.24);
            // Arbolitos lejanos sobre las colinas.
            for (var a = 0; a < 7; a++) {
                var ax = w * (0.05 + a * 0.15) + ((a * 31) % 20);
                var ay = hz - h * (0.01 + ((a * 7) % 4) * 0.012);
                c.fillStyle(0x8d5524, 1);
                c.fillRect(ax - 3, ay - h * 0.035, 6, h * 0.035);
                c.fillStyle(a % 2 ? 0x37b24d : 0x2f9e44, 1);
                c.fillCircle(ax, ay - h * 0.05, h * 0.03);
                c.fillCircle(ax - h * 0.018, ay - h * 0.035, h * 0.022);
                c.fillCircle(ax + h * 0.018, ay - h * 0.035, h * 0.022);
            }
            c.fillStyle(0x51cf66, 1);
            c.fillRect(0, hz, w, h - hz);
            // Camino de tierra que cruza el parque.
            c.fillStyle(0xe9d8a6, 1);
            c.beginPath();
            c.moveTo(w * 0.42, hz);
            c.lineTo(w * 0.47, hz);
            c.lineTo(w * 0.62, h);
            c.lineTo(w * 0.36, h);
            c.closePath();
            c.fillPath();
            // Arbustos en el borde.
            [0.03, 0.3, 0.6].forEach(function (bx) {
                c.fillStyle(0x2b8a3e, 1);
                c.fillCircle(w * bx, hz + h * 0.02, h * 0.035);
                c.fillCircle(w * bx + h * 0.04, hz + h * 0.015, h * 0.045);
                c.fillCircle(w * bx + h * 0.085, hz + h * 0.025, h * 0.03);
            });
            // Florecitas y matas de pasto.
            for (var i = 0; i < 40; i++) {
                var fx = ((i * 97) % 100) / 100 * w;
                var fy = hz + h * 0.04 + ((i * 53) % 100) / 100 * (h - hz - h * 0.06);
                c.fillStyle(0x40c057, 1);
                c.fillTriangle(fx - 5, fy, fx + 5, fy, fx, fy - 12);
                if (i % 3 === 0) {
                    c.fillStyle(FIESTA[i % FIESTA.length], 1);
                    c.fillCircle(fx + 8, fy - 6, 4);
                }
            }
            // Laguna de los patitos (arriba a la derecha, sobre el pasto).
            var l = this.laguna;
            l.clear();
            this.lagunaPos = { x: w * 0.84, y: hz + h * 0.07, rx: Math.min(w * 0.13, 190), ry: h * 0.055 };
            var p = this.lagunaPos;
            l.fillStyle(0x339af0, 1);
            l.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
            l.fillStyle(0x74c0fc, 1);
            l.fillEllipse(p.x - p.rx * 0.2, p.y - p.ry * 0.25, p.rx * 1.2, p.ry * 0.7);
            l.lineStyle(4, 0x2f9e44, 1);
            l.strokeEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
            this.noche.setSize(w, h);
            this.rayo.setSize(w, h);
            // Arcoíris (aparece al final).
            var a = this.arco;
            a.clear();
            ARCOIRIS.forEach(function (col, k) {
                a.lineStyle(Math.max(8, h * 0.018), col, 1);
                a.beginPath();
                a.arc(w * 0.5, hz + h * 0.05, w * 0.42 - k * Math.max(8, h * 0.018), Math.PI, 0, false);
                a.strokePath();
            });
            var scene = this;
            this.patos.forEach(function (pt, k) { var q = scene.puestoPato(k); pt.setPosition(q.x, q.y); pt.base = q.y; });
        },

        /** ¿Están la base sin cielo y todas las nubes sueltas? Si no, se usa el fondo entero. */
        conCapas: function () {
            var t = this.textures;
            return t.exists(texEscena('base')) && NUBES.every(function (n, i) { return t.exists(texEscena('nube:' + i)); });
        },

        paleta: function () {
            return this.usaCapas ? CIELOS_ILU : CIELOS;
        },

        /** Coloca las nubes de la ilustración (detrás de las colinas), cada una con su velocidad. */
        colocarNubes: function (F) {
            var scene = this;
            this.nubesIlu = this.nubesIlu || [];
            NUBES.forEach(function (n, i) {
                var o = scene.nubesIlu[i];
                if (!F || !scene.usaCapas) { if (o) o.img.setVisible(false); return; }
                if (!o) {
                    o = scene.nubesIlu[i] = {
                        img: scene.add.image(0, 0, texEscena('nube:' + i)).setOrigin(0, 0).setDepth(-29),
                        u: n.x, y: n.y, vel: n.vel, fase: i * 1.3
                    };
                    o.img.setTint(TINTE_NUBE[scene.tiempo] || 0xffffff);
                }
                o.img.setScale(F.k).setVisible(true).setPosition(F.px(o.u), F.py(o.y));
            });
        },

        /** Textura de una hojita (blanca; se tiñe) para las que vuela el viento. */
        texHoja: function () {
            var key = 'clima:hoja';
            if (this.textures.exists(key)) return key;
            var g = this.make.graphics({ x: 0, y: 0, add: false });
            var L = 30, A = 14, pts = [];
            for (var k = 0; k <= 10; k++) { var t = k / 10; pts.push({ x: 1 + t * (L - 2), y: A / 2 - Math.sin(t * Math.PI) * (A / 2 - 1) }); }
            for (var j = 9; j >= 1; j--) { var u = j / 10; pts.push({ x: 1 + u * (L - 2), y: A / 2 + Math.sin(u * Math.PI) * (A / 2 - 1) }); }
            g.fillStyle(0xffffff, 1);
            g.fillPoints(pts, true);
            g.lineStyle(1.5, 0xbdbdbd, 1);
            g.lineBetween(3, A / 2, L - 4, A / 2);
            g.generateTexture(key, L, A);
            g.destroy();
            return key;
        },

        /** Bancos de niebla que cruzan despacio el prado (solo con niebla). */
        mostrarBancos: function (si) {
            var scene = this;
            var w = this.scale.width, h = this.scale.height, hz = this.horizonte();
            if (si && !this.bancos.length) {
                for (var i = 0; i < 4; i++) {
                    var b = this.add.container(0, 0).setDepth(4.2).setAlpha(0);
                    var largo = w * rnd(0.45, 0.6);
                    for (var k = 0; k < 9; k++) {
                        var r = h * rnd(0.06, 0.1);
                        b.add(this.add.circle(-largo / 2 + (largo / 8) * k, Math.sin(k * 1.7) * r * 0.25, r, 0xffffff, 0.16));
                    }
                    b.u = i / 4 + rnd(-0.05, 0.05);
                    b.altoRel = i % 2 ? 0.12 : -0.1;
                    b.vel = rnd(0.012, 0.022) * (i % 2 ? 1 : -1);
                    this.bancos.push(b);
                }
            }
            this.bancos.forEach(function (b) {
                b.setPosition(b.u * w, hz + (h - hz) * b.altoRel);
                scene.tweens.add({ targets: b, alpha: si ? 1 : 0, duration: reducido() ? 1 : 1200 });
            });
        },

        /** Nubarrones de tormenta que entran por arriba y tapan el cielo. */
        mostrarNubarrones: function (si) {
            var key = texEscena('nubeLluvia');
            if (!this.textures.exists(key)) return;
            var w = this.scale.width, h = this.scale.height;
            if (si && !this.nubarrones.length) {
                for (var i = 0; i < 6; i++) {
                    var n = this.add.image(0, 0, key).setDepth(-27.5).setAlpha(0);
                    n.base = (w * rnd(0.3, 0.4)) / (n.width || 1);
                    n.setScale(n.base);
                    n.u = (i + 0.5) / 6 + rnd(-0.04, 0.04);
                    n.altoRel = i % 2 ? 0.06 : 0.16;
                    n.vel = rnd(0.008, 0.016);
                    this.nubarrones.push(n);
                }
            }
            var scene = this;
            this.nubarrones.forEach(function (n, i) {
                n.setPosition(n.u * w, h * n.altoRel);
                scene.tweens.add({ targets: n, alpha: si ? 0.95 : 0, duration: reducido() ? 1 : 1400, delay: si ? i * 120 : 0 });
            });
        },

        /** Hojitas que arrastra una ráfaga de viento de lado a lado de la pantalla. */
        soltarHojasViento: function (n) {
            if (reducido()) return;
            var w = this.scale.width, h = this.scale.height, hz = this.horizonte();
            var key = this.texHoja();
            var scene = this;
            for (var i = 0; i < n; i++) {
                (function (k) {
                    var hoja = scene.add.image(-30, 0, key).setDepth(8);
                    var esc = rnd(0.6, 1.1);
                    hoja.setTint(HOJAS_VIENTO[Math.floor(Math.random() * HOJAS_VIENTO.length)]).setScale(esc);
                    var y0 = rnd(h * 0.2, hz + (h - hz) * 0.6);
                    var p = { t: 0 };
                    var ondas = rnd(1.5, 3), amp = rnd(20, 50), caida = rnd(-30, 60), giro = Math.random() < 0.5 ? 1 : -1;
                    scene.tweens.add({
                        targets: p, t: 1, duration: rnd(1300, 2200), delay: k * rnd(40, 110), ease: 'Sine.easeIn',
                        onUpdate: function () {
                            hoja.x = -30 + (w + 60) * p.t;
                            hoja.y = y0 + caida * p.t + Math.sin(p.t * Math.PI * 2 * ondas) * amp;
                            hoja.angle = p.t * 720 * giro;
                            hoja.scaleY = esc * (0.5 + 0.5 * Math.abs(Math.cos(p.t * Math.PI * 4)));
                        },
                        onComplete: function () { hoja.destroy(); }
                    });
                })(i);
            }
        },

        /** Rayo dibujado: un zigzag que baja del cielo y se apaga. */
        dibujarRayo: function () {
            var g = this.rayoG;
            var w = this.scale.width, hz = this.horizonte();
            var x = rnd(w * 0.15, w * 0.85), y = 0;
            var pts = [{ x: x, y: y }];
            while (y < hz * 0.85) {
                y += rnd(hz * 0.08, hz * 0.16);
                x += rnd(-40, 40);
                pts.push({ x: x, y: Math.min(y, hz * 0.85) });
            }
            var trazo = function (ancho, col, alfa) {
                g.lineStyle(ancho, col, alfa);
                g.beginPath();
                g.moveTo(pts[0].x, pts[0].y);
                for (var i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
                g.strokePath();
            };
            g.clear();
            trazo(16, 0xfff3bf, 0.35);
            trazo(7, 0xffe066, 0.9);
            trazo(3, 0xffffff, 1);
            g.setAlpha(1);
            this.tweens.add({ targets: g, alpha: 0, duration: 420, delay: 120, onComplete: function () { g.clear(); } });
        },

        puestoPato: function (k) {
            var p = this.lagunaPos;
            // Flotando en la mitad de adelante del agua (así se ven enteros sobre el estanque).
            return { x: p.x - p.rx * 0.55 + (k % 4) * p.rx * 0.36, y: p.y + p.ry * 0.5 };
        },

        /** Patito: arte de escena o dibujo procedural. */
        crearPato: function (x, y) {
            var s = Math.max(0.8, this.scale.height / 700);
            var c = this.add.container(x, y).setDepth(6);
            var keyPato = texEscena('pato');
            if (this.textures.exists(keyPato)) {
                // El dibujo ocupa ~70 % de la imagen: el patito queda a ~38 % del tamaño de las cosas.
                var im = this.add.image(0, 0, keyPato).setOrigin(0.5, 0.86);
                im.setScale((this.tamCosa() * 0.38) / ((im.width || 1) * 0.7));
                c.add(im);
                c.ala = im;
                return c;
            }
            var cuerpo = this.add.ellipse(0, -14 * s, 40 * s, 28 * s, 0xffd43b);
            var ala = this.add.ellipse(-4 * s, -14 * s, 20 * s, 13 * s, 0xfab005);
            var cabeza = this.add.circle(14 * s, -32 * s, 12 * s, 0xffd43b);
            var ojo = this.add.circle(18 * s, -35 * s, 2.5 * s, 0x212529);
            var pico = this.add.triangle(24 * s, -30 * s, 0, 0, 12 * s, 4 * s, 0, 8 * s, 0xff922b).setOrigin(0, 0.5);
            c.add([cuerpo, ala, cabeza, ojo, pico]);
            c.ala = ala;
            return c;
        },

        /* ── Cosas del parque ─────────────────────────────────────── */

        tamCosa: function () {
            return Math.min(this.scale.height * 0.26, this.scale.width * 0.17, 220);
        },

        /** Lugares en el pasto; evita la laguna y el botón de escuchar (abajo al centro). */
        lugares: function (n) {
            var w = this.scale.width;
            var h = this.scale.height;
            var hz = this.horizonte();
            var F = this.marcoFondo();
            var tam = this.tamCosa();
            // Empieza pasada la casita (su borde derecho cae en x ≈ 270 del dibujo).
            var x0 = Math.max(w * 0.1, F ? F.px(275) + tam * 0.45 : w * 0.1);
            // …y termina antes de la laguna, para no tapar a los patitos que nadan en ella.
            var x1 = this.lagunaPos ? this.lagunaPos.x - this.lagunaPos.rx - tam * 0.45 : w * 0.68;
            // Pantallas angostas: si no caben escalonadas, se usa casi todo el ancho.
            if (n > 1 && (x1 - x0) / (n - 1) < tam * 0.5) { x0 = w * 0.12; x1 = w * 0.88; }
            // Dos filas escalonadas; la de adelante queda por encima del botón de escuchar.
            var filaAtras = hz + h * 0.13;
            var filaAdelante = Math.min(hz + h * 0.23, h * 0.8);
            var out = [];
            for (var i = 0; i < n; i++) {
                var x = n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) / (n - 1)) * i;
                out.push({ x: x, y: i % 2 ? filaAdelante : filaAtras });
            }
            return mezclar(out);
        },

        crearCosa: function (id) {
            if (this.cosas[id]) return this.cosas[id];
            var img = this.add.image(-300, 0, tex(id)).setOrigin(0.5, 1).setDepth(5);
            var sombra = this.add.ellipse(-300, 0, 10, 10, 0x000000, 0.18).setDepth(4);
            var niebla = this.add.container(-300, 0).setDepth(10).setVisible(false);
            var hayNeblina = ESCENA.neblina.every(function (_, i) { return this.textures.exists(texEscena('neblina:' + i)); }, this);
            if (hayNeblina) {
                // Cuatro copos apilados; su tamaño y lugar los fija armarNiebla() según el objeto.
                for (var q = 0; q < 3; q++) {
                    niebla.add(this.add.image(0, 0, texEscena('neblina:' + (q % 3))).setOrigin(0.5, 0.5).setAlpha(0.97));
                }
            } else {
            // Nubes que tapan todo el alto de la cosa (con una fija arriba para la punta).
            niebla.add(this.add.circle(0, -88, 46, 0xf1f3f5, 0.95));
            for (var k = 0; k < 7; k++) {
                niebla.add(this.add.circle(rnd(-55, 55), rnd(-80, -18), rnd(36, 50), 0xf1f3f5, 0.95));
            }
            }
            var c = { id: id, img: img, sombra: sombra, niebla: niebla, x: 0, y: 0, size: 100, escala: 1, enNiebla: false, resaltada: false, mece: Math.random() * 6 };
            this.cosas[id] = c;
            this.medir(c);
            return c;
        },

        medir: function (c) {
            var t = this.tamCosa();
            c.escala = Math.min(t / (c.img.width || 1), t / (c.img.height || 1));
            c.img.setScale(c.escala);
            c.size = c.img.height * c.escala;
            c.ancho = c.img.width * c.escala;
            c.sombra.setSize(c.ancho * 0.8, c.size * 0.12);
            this.armarNiebla(c);
            c.niebla.setScale(this.escalaNiebla(c));
        },

        /**
         * La niebla tapa el objeto completo: copos que van del pasto hasta un poco más arriba
         * de la punta, más anchos que el objeto, para que no asome nada (ni la punta del
         * paraguas ni las orejas del perro).
         */
        armarNiebla: function (c) {
            var lista = c.niebla.list;
            var ilustrada = lista[0] && lista[0].texture && /neblina/.test(lista[0].texture.key || '');
            if (!ilustrada) {
                lista.forEach(function (o) { o.x0 = o.x; });
                return;
            }
            var ancho = Math.max(c.ancho, c.size * 0.7);
            // Lo dibujado en neblina_N.svg ocupa ~69 % del ancho y ~60 % del alto de la imagen:
            // un copo de ancho W mide ~0.68 W de alto. Tres copos cubren del pasto a la punta.
            var filas = [
                { y: -c.size * 0.2, w: ancho * 1.2, x: 0 },
                { y: -c.size * 0.55, w: ancho * 1.25, x: 0 },
                { y: -c.size * 0.9, w: ancho * 1.15, x: 0 }
            ];
            lista.forEach(function (o, k) {
                var f = filas[k % filas.length];
                o.setScale(f.w / ((o.width || 1) * 0.69));
                o.setPosition(f.x, f.y);
                o.x0 = f.x;
                o.setFlipX(k % 2 === 1);
            });
        },

        /**
         * La niebla tapa al objeto sin comerse la pantalla. Las nubecitas dibujadas miden ~100 px
         * y se escalan al objeto; las ilustradas (neblina_N.svg) ya vienen grandes, así que se
         * ajustan a su ancho real.
         */
        escalaNiebla: function (c) {
            var base = Math.max(c.ancho, c.size);
            var n = c.niebla && c.niebla.list && c.niebla.list[0];
            // Los copos ilustrados ya se arman a la medida del objeto (armarNiebla).
            if (n && n.texture && /neblina/.test(n.texture.key || '')) return 1;
            return base / 100;
        },

        ponerEn: function (c, x, y) {
            c.x = x;
            c.y = y;
            c.img.setPosition(x, y).setDepth(5 + y / 10000);
            if (c.id === 'pelota' && c.img.angle) {
                // La pelota gira sobre su centro (el origen está abajo): se corrige la posición
                // para que al rodar no se desplace ni se monte sobre las otras cosas.
                var a = c.img.angle * Math.PI / 180, r = c.size / 2;
                c.img.setPosition(x - r * Math.sin(a), y - r + r * Math.cos(a));
            }
            c.sombra.setPosition(x, y - 2);
            c.niebla.setPosition(x, y);
        },

        ubicarCosas: function (soloMedir) {
            var scene = this;
            Object.keys(this.cosas).forEach(function (id) { scene.medir(scene.cosas[id]); });
            if (soloMedir && this.lugaresRonda) {
                var lug = this.lugares(this.lugaresRonda.length);
                this.lugaresRonda.forEach(function (id, i) { var c = scene.cosas[id]; if (c && c.img.visible) scene.ponerEn(c, lug[i].x, lug[i].y); });
            }
        },

        visibles: function () {
            var scene = this;
            return Object.keys(this.cosas).map(function (id) { return scene.cosas[id]; })
                .filter(function (c) { return c.img.visible; });
        },

        /* ── Rondas ───────────────────────────────────────────────── */

        cambiarTiempo: function (t, ms) {
            var P = this.paleta();
            var previo = this.tiempo;
            this.mezclaCielo = { t: 0, de: P[this.tiempo] || P.sol, a: P[t] || P.sol };
            // Las nubes de la ilustración se agrisan (niebla) o se oscurecen (tormenta).
            var scene = this;
            var tinte = { v: 0 };
            var de = TINTE_NUBE[previo] || 0xffffff, a = TINTE_NUBE[t] || 0xffffff;
            this.tweens.add({
                targets: tinte, v: 1, duration: reducido() ? 1 : (ms || 1200),
                onUpdate: function () {
                    var col = mezclarColor(de, a, tinte.v);
                    (scene.nubesIlu || []).forEach(function (o) { o.img.setTint(col); });
                }
            });
            this.tweens.add({ targets: this.bruma, fillAlpha: t === 'niebla' ? 0.38 : 0, duration: ms || 1200 });
            this.mostrarBancos(t === 'niebla');
            this.mostrarNubarrones(t === 'tormenta');
            this.tiempo = t;
            this.tweens.add({ targets: this.mezclaCielo, t: 1, duration: reducido() ? 1 : (ms || 1200) });
            this.tweens.add({ targets: this.noche, fillAlpha: t === 'tormenta' ? 0.55 : 0, duration: ms || 1200 });
            this.tweens.add({ targets: this.sol, alpha: t === 'sol' || t === 'viento' ? 1 : 0, duration: ms || 1200 });
            var gris = t === 'niebla' || t === 'tormenta';
            this.nubes.forEach(function (n) {
                n.list.forEach(function (o) { o.setFillStyle(gris ? (t === 'tormenta' ? 0x495057 : 0xced4da) : 0xffffff, 1); });
            });
            this.lluvia = t === 'tormenta' ? 1 : 0;
        },

        /**
         * Prepara la ronda: el tiempo cambia y las cosas aparecen (o el viento las mueve).
         * La promesa se cumple cuando ya se puede jugar.
         */
        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            var t = o.modo || 'sol';
            this.cambiarTiempo(t);
            var ids = o.elementos.slice();
            this.lugaresRonda = ids;
            Object.keys(this.cosas).forEach(function (id) {
                var c = scene.cosas[id];
                if (ids.indexOf(id) === -1) { c.img.setVisible(false); c.sombra.setVisible(false); c.niebla.setVisible(false); }
            });
            var lug = this.lugares(ids.length);
            var entradas = ids.map(function (id, i) {
                var c = scene.crearCosa(id);
                scene.medir(c);
                c.img.setVisible(true).setAlpha(1).clearTint();
                c.img.angle = 0;
                c.sombra.setVisible(true);
                c.resaltada = false;
                if (id === 'paraguas') c.img.setTexture(tex('paraguas'));
                scene.medir(c);
                var destino = lug[i];
                var nueva = c.x <= 0;
                if (nueva || t !== 'viento') {
                    // Aparece con un saltito en su lugar.
                    scene.ponerEn(c, destino.x, destino.y);
                    if (reducido()) return Promise.resolve();
                    c.img.setScale(0.01);
                    return new Promise(function (r) {
                        scene.tweens.add({ targets: c.img, scale: c.escala, duration: 380, delay: i * 140, ease: 'Back.easeOut', onComplete: r });
                    });
                }
                return Promise.resolve();
            });
            return Promise.all(entradas).then(function () {
                if (t === 'viento') return scene.soplar(ids);
                return null;
            }).then(function () {
                ids.forEach(function (id) {
                    var c = scene.cosas[id];
                    var tapar = t === 'niebla';
                    c.enNiebla = tapar;
                    c.niebla.setVisible(tapar).setAlpha(tapar ? 1 : 0);
                    if (tapar && !reducido()) {
                        c.niebla.setAlpha(0);
                        scene.tweens.add({ targets: c.niebla, alpha: 1, duration: 600 });
                    }
                    if (t === 'tormenta') c.img.setTint(OSCURO);
                });
                if (t === 'tormenta') scene.proxRayo = scene.time.now + 900;
                return esperar(scene, t === 'niebla' ? 650 : 200);
            });
        },

        /** Ráfaga de viento: hojas volando y las cosas cambian de lugar rodando. */
        soplar: function (ids) {
            var scene = this;
            sfx('zas');
            if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir('viento', { breve: true, vol: 0.5 });
            this.rafaga = this.time.now + 1600;
            this.soltarHojasViento(16);
            var lug = this.lugares(ids.length);
            // Que el paraguas (el objetivo) sí cambie de sitio.
            var idxObj = ids.indexOf(this.objetivo);
            if (idxObj !== -1) {
                var c0 = this.cosas[this.objetivo];
                if (Math.abs(lug[idxObj].x - c0.x) < 20) {
                    var otro = (idxObj + 1) % ids.length;
                    var tmp = lug[idxObj]; lug[idxObj] = lug[otro]; lug[otro] = tmp;
                }
            }
            return Promise.all(ids.map(function (id, i) {
                var c = scene.cosas[id];
                var d = lug[i];
                if (reducido()) { scene.ponerEn(c, d.x, d.y); return Promise.resolve(); }
                var desde = { x: c.x, y: c.y };
                var p = { t: 0 };
                var gira = id === 'pelota' ? (d.x - desde.x) / Math.max(1, c.ancho / 2) * 57 : 0;
                return new Promise(function (r) {
                    scene.tweens.add({
                        targets: p, t: 1, duration: 1300, delay: i * 120, ease: 'Sine.easeInOut',
                        onUpdate: function () {
                            var x = Phaser.Math.Linear(desde.x, d.x, p.t);
                            var y = Phaser.Math.Linear(desde.y, d.y, p.t) - Math.sin(p.t * Math.PI) * c.size * (id === 'arbol' ? 0.05 : 0.5);
                            c.img.angle = id === 'pelota' ? gira * p.t : Math.sin(p.t * Math.PI * 4) * 12;
                            scene.ponerEn(c, x, y);
                            c.sombra.y = Phaser.Math.Linear(desde.y, d.y, p.t) - 2;
                        },
                        onComplete: function () {
                            if (id !== 'pelota') c.img.angle = 0;
                            scene.ponerEn(c, d.x, d.y);
                            r();
                        }
                    });
                });
            }));
        },

        jugar: function () {
            var scene = this;
            this.jugando = true;
            // Con viento, a mitad de la ronda otra ráfaga las vuelve a mover.
            if (this.tiempo === 'viento') {
                if (this.otraRafaga) this.otraRafaga.remove();
                this.otraRafaga = this.time.delayedCall(9000, function () {
                    if (scene.jugando && scene.tiempo === 'viento') scene.soplar(scene.lugaresRonda);
                });
            }
        },

        pausar: function () {
            this.jugando = false;
        },

        relampago: function () {
            var scene = this;
            sfx('crujido');
            if (!reducido()) this.dibujarRayo();
            this.rayo.fillAlpha = 0.85;
            // Con el rayo se ve todo un momento.
            this.noche.fillAlpha = 0.12;
            this.tweens.add({ targets: this.noche, fillAlpha: 0.55, duration: 700, delay: 500 });
            this.visibles().forEach(function (c) { c.img.clearTint(); });
            this.tweens.add({ targets: this.rayo, fillAlpha: 0, duration: 260, delay: 80 });
            this.time.delayedCall(900, function () {
                if (scene.tiempo !== 'tormenta') return;
                scene.visibles().forEach(function (c) { if (!c.encontrada) c.img.setTint(OSCURO); });
            });
        },

        update: function (time, delta) {
            var w = this.scale.width;
            var h = this.scale.height;
            var hz = this.horizonte();
            var dt = Math.min(delta, 50) / 1000;
            var scene = this;
            var quieto = reducido();
            var viento = this.rafaga && time < this.rafaga ? 6 : 1;
            if (this.mezclaCielo.t < 1) this.pintarCielo();
            this.nubes.forEach(function (n) {
                n.x += n.vel * viento * dt * (scene.tiempo === 'tormenta' ? 2 : 1);
                if (n.x > w + 100) n.x = -100;
            });
            // Nubes de la ilustración: viajan; más rápido con viento y con tormenta.
            var F = this.marcoFondo();
            if (F && this.nubesIlu && !quieto) {
                var factor = viento * (this.tiempo === 'viento' ? 2.2 : this.tiempo === 'tormenta' ? 2.5 : 1);
                this.nubesIlu.forEach(function (o) {
                    if (!o.img.visible) return;
                    o.u += o.vel * factor * dt;
                    if (F.px(o.u) > w + 10) o.u = -(o.img.width || 100) - F.px(0) / F.k - 10;
                    o.img.setPosition(F.px(o.u), F.py(o.y) + Math.sin(time / 2400 + o.fase) * 2 * F.k);
                });
            }
            // Con viento, de vez en cuando cruza alguna hojita (y muchas en cada ráfaga: ver soplar).
            if (this.tiempo === 'viento' && !quieto && time > (this.proxHojas || 0)) {
                if (this.proxHojas) this.soltarHojasViento(2);
                this.proxHojas = time + rnd(1400, 2800);
            }
            // Bancos de niebla y nubarrones: cruzan despacio y vuelven a entrar por el otro lado.
            var mover = function (lista, alto) {
                lista.forEach(function (b, k) {
                    if (!b.alpha || quieto) return;
                    b.u += b.vel * viento * dt;
                    if (b.u > 1.45) b.u = -0.45;
                    if (b.u < -0.45) b.u = 1.45;
                    b.setPosition(b.u * w, alto(b) + Math.sin(time / 1800 + k) * 4);
                });
            };
            mover(this.bancos, function (b) { return hz + (h - hz) * b.altoRel; });
            mover(this.nubarrones, function (b) { return h * b.altoRel; });
            // Las cosas se mecen un poquito (el árbol con el viento).
            Object.keys(this.cosas).forEach(function (id) {
                var c = scene.cosas[id];
                if (!c.img.visible || quieto) return;
                if (id === 'arbol' && !c.quieta) c.img.angle = Math.sin(time / (viento > 1 ? 120 : 700) + c.mece) * (viento > 1 ? 8 : 2);
                if (c.resaltada) c.img.setAlpha(0.7 + 0.3 * Math.sin(time / 140)); else if (c.img.alpha < 1 && !c.desvaneciendo) c.img.setAlpha(1);
                if (c.niebla.visible) {
                    c.niebla.list.forEach(function (o, k) { o.x = o.x0 + Math.sin(time / 1100 + k * 1.7) * c.ancho * 0.05; });
                }
            });
            this.llover(time, dt, w, h, hz, quieto);
            if (this.tiempo === 'tormenta' && this.jugando && time > this.proxRayo) {
                this.proxRayo = time + rnd(2600, 4200);
                this.relampago();
            }
            var conSol = this.tiempo === 'sol' || this.tiempo === 'viento';
            // Tamaño de las mariposas: como en ¿Qué suena? (5 % del ancho, entre 30 y 54 px).
            var tm = Math.max(30, Math.min(54, w * 0.05));
            this.mariposas.forEach(function (m) {
                m.setVisible(conSol && !quieto);
                if (!m.visible) return;
                var t = time / 1000 + m.fase;
                var base = tm / (m.width || 1);
                m.x = w * (0.5 + 0.42 * Math.sin(t * 0.23 * viento));
                m.y = hz - h * (0.08 + 0.06 * Math.sin(t * 0.7));
                m.angle = Math.cos(t * 0.23 * viento) * 18;
                // Aletea encogiéndose de lado, como en ¿Qué suena?.
                m.setScale(base * (0.35 + 0.65 * Math.abs(Math.sin(time / 70 + m.fase))), base);
            });
            this.patos.forEach(function (p, k) {
                p.y = p.base + Math.sin(time / 500 + k) * 2;
                if (p.ala) p.ala.angle = Math.sin(time / 260 + k) * 6;
            });
        },

        /**
         * Lluvia. Tormenta: rayas inclinadas por toda la pantalla y salpicones en el pasto
         * (anillos más anchos en la laguna). Premio: gotas grandes desde la nubecita que
         * rebotan en el paraguas.
         */
        llover: function (time, dt, w, h, hz, quieto) {
            var g = this.capaLluvia;
            g.clear();
            var local = this.lluviaLocal;
            var keyGota = texEscena('gota');
            var usarGota = this.textures.exists(keyGota);
            var scene = this;
            if (quieto || (!(this.lluvia > 0) && !local)) {
                this.gotasImg.forEach(function (gi) { gi.setVisible(false); });
                this.salpicones.length = 0;
                return;
            }
            var lag = this.lagunaPos;
            var salpicar = function (x, y, grande) {
                if (scene.salpicones.length < 90) scene.salpicones.push({ x: x, y: y, t: 0, r: grande ? rnd(14, 22) : rnd(6, 10) });
            };
            if (this.lluvia > 0) {
                this.gotasImg.forEach(function (gi) { gi.setVisible(false); });
                var n = 170;
                while (this.gotas.length < n) this.gotas.push({ x: Math.random(), y: Math.random(), v: rnd(1.4, 1.9), fin: rnd(0.62, 1.02), l: rnd(16, 28) });
                g.lineStyle(2, 0xd6e8ff, 0.6);
                for (var i = 0; i < n; i++) {
                    var d = this.gotas[i];
                    if (d.fin === undefined) { d.fin = rnd(0.62, 1.02); d.l = rnd(16, 28); d.v = rnd(1.4, 1.9); }
                    d.y += d.v * dt;
                    // El viento de la tormenta inclina la lluvia: avanza un poco a la izquierda.
                    var gx = ((d.x - d.y * 0.12) % 1 + 1) % 1 * w;
                    var gy = d.y * h;
                    if (d.y > d.fin) {
                        if (gy > hz) {
                            var enLaguna = lag && Math.pow((gx - lag.x) / lag.rx, 2) + Math.pow((gy - lag.y) / lag.ry, 2) < 1;
                            salpicar(gx, gy, enLaguna);
                        }
                        d.y = rnd(-0.15, 0);
                        d.x = Math.random();
                        continue;
                    }
                    g.lineBetween(gx, gy, gx - d.l * 0.22, gy + d.l);
                }
            } else {
                var m = 26;
                while (this.gotas.length < m) this.gotas.push({ x: Math.random(), y: Math.random(), v: rnd(1.4, 1.9) });
                if (usarGota) {
                    while (this.gotasImg.length < m) this.gotasImg.push(this.add.image(0, 0, keyGota).setDepth(12).setOrigin(0.5, 0.5));
                } else {
                    g.lineStyle(3, 0xd0ebff, 0.9);
                }
                var tam = local.tamGota || 18;
                for (var j = 0; j < m; j++) {
                    var e = this.gotas[j];
                    e.y += (e.v || 1.5) * dt * 1.2;
                    if (e.y > 1) {
                        // Rebota en la tela del paraguas.
                        salpicar(local.x + (e.x - 0.5) * local.ancho, local.top + local.alto, false);
                        e.y = 0;
                        e.x = Math.random();
                    }
                    var lx = local.x + (e.x - 0.5) * local.ancho;
                    var ly = local.top + e.y * local.alto;
                    if (usarGota) {
                        var gi = this.gotasImg[j];
                        gi.setVisible(true).setPosition(lx, ly).setAlpha(0.95);
                        gi.setScale((tam * 1.5) / (gi.height || 1));
                    } else {
                        g.lineBetween(lx, ly, lx - 2, ly + tam);
                    }
                }
                for (var q = m; q < this.gotasImg.length; q++) this.gotasImg[q].setVisible(false);
            }
            // Salpicones: un anillo que se abre y dos gotitas que saltan.
            for (var s = this.salpicones.length - 1; s >= 0; s--) {
                var sp = this.salpicones[s];
                sp.t += dt / 0.4;
                if (sp.t >= 1) { this.salpicones.splice(s, 1); continue; }
                var a = 1 - sp.t;
                g.lineStyle(1.6, 0xe7f5ff, 0.8 * a);
                g.strokeEllipse(sp.x, sp.y, sp.r * 2 * (0.3 + sp.t), sp.r * 0.7 * (0.3 + sp.t));
                g.fillStyle(0xe7f5ff, 0.9 * a);
                var alto = Math.sin(sp.t * Math.PI) * sp.r * 0.9;
                g.fillCircle(sp.x - sp.r * sp.t * 0.8, sp.y - alto, 1.6);
                g.fillCircle(sp.x + sp.r * sp.t * 0.8, sp.y - alto, 1.6);
            }
        },

        /* ── Toques ───────────────────────────────────────────────── */

        cosaEn: function (px, py) {
            var lista = this.visibles().sort(function (a, b) { return b.y - a.y; });
            for (var i = 0; i < lista.length; i++) {
                var c = lista[i];
                var medio = Math.max(c.ancho, c.size * 0.6) / 2 + 12;
                if (Math.abs(px - c.x) < medio && py < c.y + 14 && py > c.y - c.size - 14) return c;
            }
            return null;
        },

        alTocar: function (pointer) {
            if (!this.jugando || this.ocupada || !puedeTocar()) return;
            var c = this.cosaEn(pointer.worldX, pointer.worldY);
            if (!c) return;
            if (c.enNiebla) {
                // Despeja la niebla y se ve quién estaba ahí.
                c.enNiebla = false;
                sfx('zas');
                this.tweens.add({ targets: c.niebla, alpha: 0, scale: c.niebla.scale * 1.4, duration: reducido() ? 1 : 380, onComplete: function () { c.niebla.setVisible(false); } });
            }
            if (this.tiempo === 'tormenta') c.img.clearTint();
            this.responder(c);
        },

        responder: function (c) {
            var scene = this;
            if (c.id === this.objetivo) {
                this.jugando = false;
                c.encontrada = true;
                avisar('onAcierto', c.id);
                return;
            }
            // No era: salta en su sitio, suena como es; la niebla o la oscuridad vuelven.
            this.ocupada = true;
            if (!reducido()) this.tweens.add({ targets: c.img, y: c.y - c.size * 0.15, duration: 140, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            avisar('onError', c.id, { pan: this.panDe(c.id) });
            this.time.delayedCall(1500, function () {
                scene.ocupada = false;
                if (!scene.jugando) return;
                if (scene.tiempo === 'niebla') {
                    c.enNiebla = true;
                    c.niebla.setVisible(true).setScale(scene.escalaNiebla(c)).setAlpha(0);
                    scene.tweens.add({ targets: c.niebla, alpha: 1, duration: 500 });
                }
                if (scene.tiempo === 'tormenta') c.img.setTint(OSCURO);
            });
        },

        cosaDe: function (id) {
            var c = this.cosas[id];
            return c && c.img.visible ? c : null;
        },

        /** Pista: la niebla del objetivo se aclara un poco; en la tormenta cae un rayo; si no, se sacude. */
        pista: function (id) {
            var c = this.cosaDe(id);
            if (!c) return;
            if (c.enNiebla) this.tweens.add({ targets: c.niebla, alpha: 0.35, duration: 300, yoyo: true, hold: 1200 });
            if (this.tiempo === 'tormenta') this.relampago();
            if (!reducido()) this.tweens.add({ targets: c.img, angle: { from: -8, to: 8 }, duration: 110, yoyo: true, repeat: 3, onComplete: function () { c.img.angle = 0; } });
        },

        resaltar: function (id, si) {
            var c = this.cosaDe(id);
            if (c) c.resaltada = !!si;
        },

        /* ── Premio: el patito bajo el paraguas ───────────────────── */

        /** Documento: llueve un poquito, el paraguas se abre. */
        celebrar: function (id) {
            var c = this.cosaDe(id) || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!c) return Promise.resolve();
            var scene = this;
            c.resaltada = false;
            c.img.clearTint();
            c.img.setAlpha(1);
            if (c.enNiebla) { c.enNiebla = false; c.niebla.setVisible(false); }
            if (id === 'paraguas' && this.textures.exists(tex('paraguas:abierto'))) {
                c.img.setTexture(tex('paraguas:abierto'));
                this.medir(c);
            }
            if (id === 'paraguas' && !reducido()) {
                // No hay dibujo del paraguas cerrado: se pliega (angosto y alto) y se abre de golpe.
                var e0 = c.escala;
                c.img.setScale(e0 * 0.28, e0 * 1.08);
                sfx('pop');
                this.tweens.chain({
                    targets: c.img,
                    tweens: [
                        { scaleX: e0 * 1.18, scaleY: e0 * 0.9, duration: 260, ease: 'Back.easeOut', delay: 120 },
                        { scaleX: e0, scaleY: e0, duration: 260, ease: 'Sine.easeInOut' }
                    ]
                });
                this.tweens.add({ targets: c.img, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 2, delay: 380, onComplete: function () { c.img.angle = 0; } });
            }
            // Una nubecita gris llega sobre el paraguas y llueve de ella.
            var ny = Math.max(this.scale.height * 0.16, c.y - c.size - this.scale.height * 0.16);
            var nube = this.add.container(c.x, ny).setDepth(11).setAlpha(0);
            var keyNube = texEscena('nubeLluvia');
            var ilustrada = this.textures.exists(keyNube);
            if (ilustrada) {
                // La nube ilustrada se ajusta al ancho del paraguas (poco más que él), sin
                // volver a escalar el contenedor: si no, se acumulan las escalas y tapa la escena.
                var nim = this.add.image(0, 0, keyNube).setOrigin(0.5, 0.5);
                var anchoNube = Math.min(c.ancho * 1.6, this.scale.width * 0.3);
                nim.setScale(anchoNube / (nim.width || 1));
                nube.add(nim);
            } else {
                nube.add(this.add.circle(-26, 6, 20, 0x868e96));
                nube.add(this.add.circle(0, -6, 28, 0x868e96));
                nube.add(this.add.circle(26, 6, 19, 0x868e96));
                nube.setScale(Math.max(0.8, c.ancho / 110));
            }
            this.tweens.add({ targets: nube, alpha: 1, duration: 300 });
            if (this.nubeLluvia) this.nubeLluvia.destroy();
            this.nubeLluvia = nube;
            this.lluviaLocal = { x: c.x, top: ny + 14, alto: c.y - c.size * 0.9 - ny - 14, ancho: c.ancho * 1.3, tamGota: Math.max(14, c.size * 0.09) };
            this.estrellas(c.x, c.y - c.size / 2, 14);
            if (!reducido() && id !== 'paraguas') {
                c.img.setScale(c.escala * 0.6);
                this.tweens.add({ targets: c.img, scale: c.escala, duration: 420, ease: 'Back.easeOut' });
            }
            return esperar(scene, 1300);
        },

        /** Un patito mojado corre a refugiarse bajo el paraguas y luego se va a la laguna. */
        refugiar: function (id) {
            var c = this.cosaDe(id);
            var scene = this;
            if (!c) { this.lluviaLocal = null; return Promise.resolve(); }
            var w = this.scale.width;
            var lado = c.x < w / 2 ? -1 : 1;
            var pato = this.crearPato(c.x + lado * w * 0.35, c.y);
            pato.setScale(lado > 0 ? -1 : 1, 1);
            pato.base = c.y;
            var dur = reducido() ? 1 : 1100;
            return new Promise(function (r) {
                sfx('pop');
                scene.tweens.add({
                    targets: pato, x: c.x, duration: dur, ease: 'Sine.easeOut',
                    onUpdate: function () { pato.y = c.y - Math.abs(Math.sin(pato.x / 18)) * 6; },
                    onComplete: r
                });
            }).then(function () {
                // Ya seco: la lluvia para, la nubecita se va y el patito se sacude feliz.
                scene.lluviaLocal = null;
                var nb = scene.nubeLluvia;
                scene.nubeLluvia = null;
                if (nb) scene.tweens.add({ targets: nb, alpha: 0, x: nb.x + 120, duration: 600, onComplete: function () { nb.destroy(); } });
                sfx('recompensa');
                if (!reducido()) {
                    scene.tweens.add({ targets: pato, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 3, onComplete: function () { pato.angle = 0; } });
                    scene.sacudirGotas(pato.x, pato.y - scene.tamCosa() * 0.2, scene.tamCosa() * 0.35);
                }
                return esperar(scene, 700);
            }).then(function () {
                var k = scene.patos.length;
                var p = scene.puestoPato(k);
                pato.setScale(p.x < pato.x ? 1 : -1, 1);
                return new Promise(function (r) {
                    scene.tweens.add({
                        targets: pato, x: p.x, duration: reducido() ? 1 : 1200, ease: 'Sine.easeInOut',
                        onUpdate: function (tw) { pato.y = Phaser.Math.Linear(c.y, p.y, tw.progress) - Math.abs(Math.sin(tw.progress * Math.PI * 5)) * 10; },
                        onComplete: function () {
                            pato.setScale(1, 1);
                            pato.base = p.y;
                            pato.setDepth(-19);
                            scene.patos.push(pato);
                            scene.estrellas(p.x, p.y - 20, 8);
                            sfx('ding');
                            r();
                        }
                    });
                });
            }).then(function () {
                // El paraguas se cierra para la próxima ronda.
                if (id === 'paraguas') { c.img.setTexture(tex('paraguas')); scene.medir(c); }
                c.encontrada = false;
            });
        },

        /** Gotitas que salen disparadas al sacudirse el patito. */
        sacudirGotas: function (x, y, r) {
            var key = texEscena('gota');
            for (var i = 0; i < 8; i++) {
                var a = -Math.PI + (Math.PI / 7) * i;
                var g = this.textures.exists(key)
                    ? this.add.image(x, y, key).setScale((r * 0.22) / 300)
                    : this.add.circle(x, y, 3, 0xd0ebff);
                g.setDepth(12).setAngle(a * 57 + 90);
                this.tweens.add({
                    targets: g, x: x + Math.cos(a) * r * rnd(0.9, 1.4), y: y + Math.sin(a) * r * rnd(0.6, 1.1) + r * 0.3,
                    alpha: 0, duration: rnd(420, 620), ease: 'Quad.easeOut',
                    onComplete: (function (o) { return function () { o.destroy(); }; })(g)
                });
            }
        },

        /** Final: deja de llover, sale el sol y el arcoíris; los patitos chapotean. */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.lluviaLocal = null;
            this.cambiarTiempo('sol', 900);
            this.visibles().forEach(function (c) { c.img.clearTint(); c.niebla.setVisible(false); });
            // Sale el arcoíris: el de la ilustración si lo hay, si no el dibujado.
            var capaArco = (this.arcoImg && this.arcoImg.visible) ? this.arcoImg : this.arco;
            this.tweens.add({ targets: capaArco, alpha: 1, duration: reducido() ? 1 : 1400 });
            this.patos.forEach(function (p, i) {
                if (!reducido()) scene.tweens.add({ targets: p, base: p.base - 16, duration: 220, yoyo: true, repeat: 5, delay: i * 120 });
            });
            if (this.lagunaPos) this.estrellas(this.lagunaPos.x, this.lagunaPos.y, 16);
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

        /** Ejemplo guiado: una sola cosa a la vista, con sol. */
        demo: function (id) {
            var scene = this;
            Object.keys(this.cosas).forEach(function (k) { var c = scene.cosas[k]; c.img.setVisible(false); c.sombra.setVisible(false); c.niebla.setVisible(false); });
            var c = this.crearCosa(id);
            c.img.setVisible(true).clearTint();
            c.sombra.setVisible(true);
            this.medir(c);
            this.ponerEn(c, this.scale.width * 0.45, this.horizonte() + this.scale.height * 0.22);
            this.demoObj = c;
        },

        limpiarDemo: function () {
            var c = this.demoObj;
            this.demoObj = null;
            this.lluviaLocal = null;
            if (this.nubeLluvia) { this.nubeLluvia.destroy(); this.nubeLluvia = null; }
            if (c && c.id === 'paraguas') { c.img.setTexture(tex('paraguas')); this.medir(c); }
            if (c) { c.img.setVisible(false); c.sombra.setVisible(false); c.x = 0; }
            return Promise.resolve();
        },

        rectDe: function (id) {
            var c = this.cosaDe(id);
            if (!c) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            return {
                x: r.left + c.x * sx,
                y: r.top + (c.y - c.size / 2) * sy,
                left: r.left + (c.x - c.ancho / 2) * sx,
                top: r.top + (c.y - c.size) * sy,
                width: c.ancho * sx,
                height: c.size * sy
            };
        },

        panDe: function (id) {
            var c = this.cosaDe(id);
            if (!c) return 0;
            return Phaser.Math.Clamp((c.x / this.scale.width) * 2 - 1, -1, 1) * 0.85;
        },

        estado: function () {
            var scene = this;
            return {
                jugando: this.jugando,
                tiempo: this.tiempo,
                ronda: this.ronda,
                objetivo: this.objetivo,
                patos: this.patos.length,
                cosas: this.visibles().map(function (c) {
                    return { id: c.id, x: Math.round(c.x), y: Math.round(c.y), niebla: c.enNiebla, size: Math.round(c.size) };
                }),
                lluvia: scene.lluvia
            };
        }
    });

    function cargarTexturas(scene) {
        var elems = (gameConfig && gameConfig.elementos) || {};
        var lista = [];
        Object.keys(elems).forEach(function (id) {
            if (elems[id].img) lista.push({ key: tex(id), src: elems[id].img });
            if (elems[id].imgAbierto) lista.push({ key: tex(id) + ':abierto', src: elems[id].imgAbierto });
        });
        lista = lista.concat(listaEscena());
        lista = lista.filter(function (t) { return !scene.textures.exists(t.key); });
        if (!lista.length) return Promise.resolve();
        return new Promise(function (resolve) {
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
        var el = doc.getElementById('clima-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'clima-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-clima');
        el.style.visibility = 'hidden';
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#a5d8ff',
            audio: { noAudio: true },
            scene: [EscenaClima],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-clima');
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }
        return esperarEscena().then(function (scene) {
            return cargarTexturas(scene).then(function () {
                scene.dibujarFondo();
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

    global.PedniaClima = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        refugiar: conEscena(function (s, id) { return s.refugiar(id); }),
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
            global.document.body.classList.remove('modo-clima');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
