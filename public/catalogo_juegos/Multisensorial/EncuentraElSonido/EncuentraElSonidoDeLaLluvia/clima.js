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
    var OSCURO = 0x2f3b52;

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

        create: function () {
            this.cielo = this.add.graphics().setDepth(-30);
            this.sol = this.add.circle(0, 0, 10, 0xffd43b, 1).setDepth(-29);
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
            // Mariposas que vuelan cuando hace sol.
            this.mariposas = [0xff8787, 0xffd43b, 0xb197fc].map(function (col, k) {
                var m = this.add.container(0, 0).setDepth(7);
                var a1 = this.add.ellipse(-6, 0, 12, 16, col);
                var a2 = this.add.ellipse(6, 0, 12, 16, col);
                m.add([a1, a2, this.add.rectangle(0, 0, 3, 14, 0x495057)]);
                m.alas = [a1, a2];
                m.fase = k * 2.1;
                return m;
            }, this);
            this.noche = this.add.rectangle(0, 0, 10, 10, 0x0b1730, 0).setOrigin(0).setDepth(9);
            this.rayo = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0).setDepth(13);
            this.arco = this.add.graphics().setDepth(-26).setAlpha(0);
            this.dibujarFondo();
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

        horizonte: function () {
            return this.scale.height * 0.56;
        },

        /* ── Escenario: cielo, colinas, laguna ─────────────────────── */

        pintarCielo: function () {
            var w = this.scale.width;
            var hz = this.horizonte();
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
            this.patos.forEach(function (pt, k) { var q = scene.puestoPato(k); pt.setPosition(q.x, q.y); });
        },

        puestoPato: function (k) {
            var p = this.lagunaPos;
            return { x: p.x - p.rx * 0.6 + k * p.rx * 0.4, y: p.y + p.ry * 0.1 };
        },

        /** Patito dibujado: cuerpo, cabeza, pico, ala. */
        crearPato: function (x, y) {
            var s = Math.max(0.8, this.scale.height / 700);
            var c = this.add.container(x, y).setDepth(6);
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
            var out = [];
            for (var i = 0; i < n; i++) {
                var x = w * (0.12 + (0.54 / Math.max(1, n - 1)) * i);
                if (n === 1) x = w * 0.45;
                var y = hz + h * (i % 2 ? 0.27 : 0.17);
                out.push({ x: x, y: y });
            }
            return mezclar(out);
        },

        crearCosa: function (id) {
            if (this.cosas[id]) return this.cosas[id];
            var img = this.add.image(-300, 0, tex(id)).setOrigin(0.5, 1).setDepth(5);
            var sombra = this.add.ellipse(-300, 0, 10, 10, 0x000000, 0.18).setDepth(4);
            var niebla = this.add.container(-300, 0).setDepth(10).setVisible(false);
            // Nubes que tapan todo el alto de la cosa (con una fija arriba para la punta).
            niebla.add(this.add.circle(0, -88, 46, 0xf1f3f5, 0.95));
            for (var k = 0; k < 7; k++) {
                niebla.add(this.add.circle(rnd(-55, 55), rnd(-80, -18), rnd(36, 50), 0xf1f3f5, 0.95));
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
            c.niebla.setScale(Math.max(c.ancho, c.size) / 100);
        },

        ponerEn: function (c, x, y) {
            c.x = x;
            c.y = y;
            c.img.setPosition(x, y);
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
            this.mezclaCielo = { t: 0, de: CIELOS[this.tiempo] || CIELOS.sol, a: CIELOS[t] || CIELOS.sol };
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
                            scene.ponerEn(c, x, y);
                            c.sombra.y = Phaser.Math.Linear(desde.y, d.y, p.t) - 2;
                            c.img.angle = id === 'pelota' ? gira * p.t : Math.sin(p.t * Math.PI * 4) * 12;
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
            var dt = Math.min(delta, 50) / 1000;
            var scene = this;
            var viento = this.rafaga && time < this.rafaga ? 6 : 1;
            if (this.mezclaCielo.t < 1) this.pintarCielo();
            this.nubes.forEach(function (n) {
                n.x += n.vel * viento * dt * (scene.tiempo === 'tormenta' ? 2 : 1);
                if (n.x > w + 100) n.x = -100;
            });
            // Las cosas se mecen un poquito (el árbol con el viento).
            Object.keys(this.cosas).forEach(function (id) {
                var c = scene.cosas[id];
                if (!c.img.visible || reducido()) return;
                if (id === 'arbol' && !c.quieta) c.img.angle = Math.sin(time / (viento > 1 ? 120 : 700) + c.mece) * (viento > 1 ? 8 : 2);
                if (c.resaltada) c.img.setAlpha(0.7 + 0.3 * Math.sin(time / 140)); else if (c.img.alpha < 1 && !c.desvaneciendo) c.img.setAlpha(1);
                if (c.niebla.visible) {
                    c.niebla.list.forEach(function (o, k) { o.x += Math.sin(time / 900 + k) * 0.08; });
                }
            });
            // Lluvia: gotas que caen (tormenta en toda la pantalla; o solo sobre el paraguas al acertar).
            var g = this.capaLluvia;
            g.clear();
            var objetivo = this.lluviaLocal;
            if ((this.lluvia > 0 || objetivo) && !reducido()) {
                var n = this.lluvia > 0 ? 160 : 40;
                while (this.gotas.length < n) this.gotas.push({ x: Math.random(), y: Math.random(), v: rnd(0.9, 1.3) });
                g.lineStyle(2, 0xd0ebff, this.lluvia > 0 ? 0.7 : 0.85);
                for (var i = 0; i < n; i++) {
                    var d = this.gotas[i];
                    d.y += d.v * dt * 1.1;
                    if (d.y > 1) { d.y = 0; d.x = Math.random(); }
                    var gx, gy, largo = 14;
                    if (this.lluvia > 0) {
                        gx = d.x * w; gy = d.y * h;
                    } else {
                        gx = objetivo.x + (d.x - 0.5) * objetivo.ancho;
                        gy = objetivo.top + d.y * objetivo.alto;
                    }
                    g.lineBetween(gx, gy, gx - 3, gy + largo);
                }
            }
            if (this.tiempo === 'tormenta' && this.jugando && time > this.proxRayo) {
                this.proxRayo = time + rnd(2600, 4200);
                this.relampago();
            }
            var conSol = this.tiempo === 'sol' || this.tiempo === 'viento';
            this.mariposas.forEach(function (m) {
                m.setVisible(conSol && !reducido());
                if (!m.visible) return;
                var t = time / 1000 + m.fase;
                m.x = w * (0.5 + 0.42 * Math.sin(t * 0.23 * viento)) ;
                m.y = scene.horizonte() - h * (0.08 + 0.06 * Math.sin(t * 0.7));
                m.alas.forEach(function (al) { al.scaleX = 0.3 + 0.7 * Math.abs(Math.sin(t * 9)); });
            });
            this.patos.forEach(function (p, k) {
                p.y = p.base + Math.sin(time / 500 + k) * 2;
                p.ala.angle = Math.sin(time / 200 + k) * 10;
            });
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
                    c.niebla.setVisible(true).setScale(Math.max(c.ancho, c.size) / 100).setAlpha(0);
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
            // Una nubecita gris llega sobre el paraguas y llueve de ella.
            var ny = Math.max(this.scale.height * 0.16, c.y - c.size - this.scale.height * 0.16);
            var nube = this.add.container(c.x, ny).setDepth(11).setAlpha(0);
            nube.add(this.add.circle(-26, 6, 20, 0x868e96));
            nube.add(this.add.circle(0, -6, 28, 0x868e96));
            nube.add(this.add.circle(26, 6, 19, 0x868e96));
            nube.setScale(Math.max(0.8, c.ancho / 110));
            this.tweens.add({ targets: nube, alpha: 1, duration: 300 });
            if (this.nubeLluvia) this.nubeLluvia.destroy();
            this.nubeLluvia = nube;
            this.lluviaLocal = { x: c.x, top: ny + 14, alto: c.y - c.size * 0.9 - ny - 14, ancho: c.ancho * 1.3 };
            this.estrellas(c.x, c.y - c.size / 2, 14);
            if (!reducido()) {
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
                if (!reducido()) scene.tweens.add({ targets: pato, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 3, onComplete: function () { pato.angle = 0; } });
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

        /** Final: deja de llover, sale el sol y el arcoíris; los patitos chapotean. */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.lluviaLocal = null;
            this.cambiarTiempo('sol', 900);
            this.visibles().forEach(function (c) { c.img.clearTint(); c.niebla.setVisible(false); });
            this.tweens.add({ targets: this.arco, alpha: 1, duration: reducido() ? 1 : 1400 });
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
        var el = doc.getElementById('clima-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'clima-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-clima');
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
            return cargarTexturas(scene).then(function () { return scene; });
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
