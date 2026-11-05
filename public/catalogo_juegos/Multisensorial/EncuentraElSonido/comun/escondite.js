/**
 * PedniaEscondite — "Escondite sonoro" en Phaser 4.2.1 para Encuentra el sonido.
 *
 * Los elementos del reto juegan al escondite en un parque a pantalla completa:
 * cada uno tiene un escondite (arbusto, caja, tronco, maceta, roca) y se asoma a ratos.
 * El sonido viene del lado donde está (paneo); el niño escucha, identifica y toca al
 * que suena mientras está asomado. Entre rondas todos corren y cambian de escondite.
 *
 * El motor solo dibuja, anima y detecta toques. El audio, la voz y el orden de las
 * rondas los decide script.js mediante callbacks:
 *   puedeTocar(), onAsoma(id, {pan}), onAcierto(id), onError(id, {pan}),
 *   onToqueEscondite({cercania, pan})
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, guardarAmigo, resaltar,
 *      volverInicio, demo, limpiarDemo, rectDe, panDe, cartel, fiestaFinal, estado, destruir.
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

    /** Ritmo del escondite por edad (ms). */
    var RITMO = {
        '34': { tam: 0.23, asomado: [2600, 3300], oculto: [900, 1900], maxEspera: 3200, viajeMs: 6500 },
        '56': { tam: 0.19, asomado: [1500, 2100], oculto: [1200, 2600], maxEspera: 4800, viajeMs: 4800 }
    };

    var TIPOS_ESCONDITE = ['arbusto', 'caja', 'tronco', 'maceta', 'roca', 'arbusto', 'caja'];
    var FIESTA = [0xff6b6b, 0xfcc419, 0x51cf66, 0x339af0, 0xcc5de8, 0xff922b];
    /** Hogar del objetivo fijo; lo que no está aquí va a una cesta. */
    var HOGAR = {
        pajaro: 'nido', gallo: 'nido',
        perro: 'casita', gato: 'casita', vaca: 'casita',
        trompeta: 'musical', maracas: 'musical', pandereta: 'musical',
        campana: 'musical', triangulo: 'musical', tambor: 'musical'
    };
    var ZONAS_COLOR = [0xffd43b, 0x9775fa, 0x339af0, 0xf783ac];

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id, variante) {
        return 'esc:' + id + (variante ? ':' + variante : '');
    }

    function reducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
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

    function esperarEscena() {
        if (sceneRef) return Promise.resolve(sceneRef);
        return readyPromise || Promise.reject(new Error('Phaser no montado'));
    }

    function inyectarEstilo() {
        var doc = global.document;
        if (doc.getElementById('escondite-css')) return;
        var css = doc.createElement('style');
        css.id = 'escondite-css';
        css.textContent = [
            '#escondite-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#escondite-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-escondite{background:#bfe3ff !important}',
            'body.modo-escondite #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-escondite #principal button,body.modo-escondite .dialogo{pointer-events:auto}',
            'body.modo-escondite .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-escondite .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-escondite .parque-fondo,body.modo-escondite #zonas,body.modo-escondite #elementos{display:none !important}',
            // Zoe y Zeus siguen presentes, abajo en las esquinas, sin tapar el parque.
            'body.modo-escondite .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(28vh,210px)}',
            'body.modo-escondite .pj-zoe{left:6px}',
            'body.modo-escondite .pj-zeus{right:6px}',
            'body.modo-escondite .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaEscondite = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaEscondite() {
            Phaser.Scene.call(this, { key: 'EscenaEscondite' });
            this.escondites = [];
            this.elems = {};
            this.amigos = [];
            this.nubes = [];
            this.objetivo = null;
            this.ritmo = RITMO['34'];
            this.tipo = 'buscar';
            this.jugando = false;
            this.ronda = 0;
            this.firma = '';
            this.inicioViaje = null;
            this.proxViaje = 0;
            this.ultimoToqueEsc = 0;
            this.demoObj = null;
            this.capaZonas = null;
        },

        create: function () {
            this.cielo = this.add.graphics().setDepth(-30);
            this.rayos = this.add.graphics().setDepth(-29);
            this.sol = this.add.circle(0, 0, 10, 0xffd43b, 1).setDepth(-28);
            this.terreno = this.add.graphics().setDepth(-20);
            this.flores = this.add.graphics().setDepth(-19);
            this.crearNubes();
            this.dibujarFondo();
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.scale.on('resize', this.onResize, this);
            this.input.on('pointerdown', this.alTocar, this);
        },

        onResize: function () {
            this.dibujarFondo();
            if (this.firma) {
                this.firma = '';
                this.construirEscondites(this.ultimaCantidad || 3, this.tipo);
                var scene = this;
                Object.keys(this.elems).forEach(function (id) {
                    var el = scene.elems[id];
                    scene.dimensionar(el);
                    scene.posicionar(el);
                });
            }
        },

        shutdown: function () {
            this.tweens.killAll();
            if (sceneRef === this) sceneRef = null;
        },

        /* ── Fondo del parque ──────────────────────────────────────── */

        crearNubes: function () {
            this.nubes = [];
            for (var i = 0; i < 3; i++) {
                var n = this.add.container(0, 0).setDepth(-27);
                n.add(this.add.circle(-26, 6, 20, 0xffffff, 0.95));
                n.add(this.add.circle(0, -6, 28, 0xffffff, 0.95));
                n.add(this.add.circle(28, 6, 19, 0xffffff, 0.95));
                n.vel = 8 + i * 5;
                n.base = [0.18, 0.5, 0.8][i];
                n.altura = [0.2, 0.13, 0.24][i];
                this.nubes.push(n);
            }
        },

        dibujarFondo: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var g = this.cielo;
            g.clear();
            var bandas = 24;
            for (var b = 0; b < bandas; b++) {
                var t = b / (bandas - 1);
                var c = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(0x74c0fc),
                    Phaser.Display.Color.ValueToColor(0xe7f5ff), 100, Math.round(t * 100));
                g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
                g.fillRect(0, (h / bandas) * b - 1, w, h / bandas + 2);
            }

            // El sol va a la derecha: a la izquierda vive el hogar (nido, casita…).
            var solR = Math.min(w, h) * 0.065;
            var solX = w * 0.92;
            var solY = h * 0.27;
            this.sol.setPosition(solX, solY).setRadius(solR);
            var r = this.rayos;
            r.clear();
            r.fillStyle(0xffe066, 0.8);
            for (var i = 0; i < 12; i++) {
                var a = (Math.PI * 2 / 12) * i;
                r.fillTriangle(Math.cos(a) * solR * 1.25, Math.sin(a) * solR * 1.25,
                    Math.cos(a + 0.1) * solR * 1.9, Math.sin(a + 0.1) * solR * 1.9,
                    Math.cos(a - 0.1) * solR * 1.9, Math.sin(a - 0.1) * solR * 1.9);
            }
            r.setPosition(solX, solY);

            this.nubes.forEach(function (n) {
                if (!n.iniciada) {
                    n.x = w * n.base;
                    n.iniciada = true;
                }
                n.y = h * n.altura;
                n.setScale(Math.min(w, h) / 620);
            });

            var t2 = this.terreno;
            t2.clear();
            t2.fillStyle(0x8ce99a, 1);
            t2.fillEllipse(w * 0.22, h * 0.5, w * 0.8, h * 0.34);
            t2.fillEllipse(w * 0.82, h * 0.48, w * 0.8, h * 0.3);
            t2.fillStyle(0x69db7c, 1);
            t2.fillRoundedRect(-40, h * 0.42, w + 80, h * 0.7, 40);
            t2.fillStyle(0x51cf66, 1);
            t2.fillRoundedRect(-40, h * 0.66, w + 80, h * 0.5, 40);
            // Senderito de tierra que une los escondites.
            t2.fillStyle(0xf3d9a4, 0.7);
            t2.fillEllipse(w * 0.5, h * 0.66, w * 0.7, h * 0.08);

            var f = this.flores;
            f.clear();
            var colores = [0xff8787, 0xffd43b, 0xffffff, 0xda77f2];
            for (var k = 0; k < 34; k++) {
                var fx = ((k * 97) % 100) / 100 * w;
                var fy = h * (0.46 + ((k * 53) % 50) / 100);
                f.fillStyle(colores[k % colores.length], 0.9);
                f.fillCircle(fx, fy, Math.min(w, h) * 0.006 + (k % 3));
            }
        },

        /* ── Escondites ───────────────────────────────────────────── */

        lugares: function (n, tipo) {
            // Fila de atrás baja (deja aire al diálogo) y fila de delante sin tapar el botón de escuchar.
            if (tipo === 'zonas') {
                return [[0.3, 0.62], [0.7, 0.62], [0.3, 0.88], [0.7, 0.88]];
            }
            var mapa = {
                3: [[0.22, 0.86], [0.5, 0.64], [0.78, 0.86]],
                4: [[0.18, 0.86], [0.39, 0.63], [0.61, 0.63], [0.82, 0.86]],
                5: [[0.14, 0.86], [0.3, 0.63], [0.5, 0.63], [0.7, 0.63], [0.86, 0.86]],
                6: [[0.13, 0.86], [0.29, 0.63], [0.5, 0.63], [0.71, 0.63], [0.87, 0.86], [0.35, 0.87]],
                7: [[0.13, 0.86], [0.29, 0.63], [0.5, 0.63], [0.71, 0.63], [0.87, 0.86], [0.35, 0.87], [0.65, 0.87]]
            };
            return mapa[Math.max(3, Math.min(7, n))];
        },

        tamano: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var base = Math.min(w * 0.75, h);
            return Phaser.Math.Clamp(base * this.ritmo.tam, 76, 190);
        },

        construirEscondites: function (cantidad, tipo) {
            var firma = cantidad + ':' + tipo + ':' + this.scale.width + 'x' + this.scale.height;
            if (firma === this.firma) return false;
            this.firma = firma;
            this.ultimaCantidad = cantidad;
            this.escondites.forEach(function (e) { e.cont.destroy(); });
            this.escondites = [];
            if (this.capaZonas) {
                this.capaZonas.destroy();
                this.capaZonas = null;
            }

            var w = this.scale.width;
            var h = this.scale.height;
            var s = this.tamano();
            var scene = this;

            if (tipo === 'zonas') {
                // Cuatro zonas con color propio: arriba/abajo, izquierda/derecha.
                var z = this.add.graphics().setDepth(-15);
                var y0 = h * 0.33;
                var zh = (h * 0.98 - y0) / 2;
                [[0, y0], [w / 2, y0], [0, y0 + zh], [w / 2, y0 + zh]].forEach(function (p, i) {
                    z.fillStyle(ZONAS_COLOR[i], 0.3);
                    z.fillRect(p[0] + 6, p[1] + 6, w / 2 - 12, zh - 12);
                    z.lineStyle(5, ZONAS_COLOR[i], 0.9);
                    z.strokeRoundedRect(p[0] + 6, p[1] + 6, w / 2 - 12, zh - 12, 24);
                });
                this.capaZonas = z;
            }

            this.lugares(cantidad, tipo).forEach(function (l, i) {
                var x = w * l[0];
                var suelo = h * l[1];
                // Lo justo para tapar al elemento entero cuando está escondido.
                var W = s * 1.3;
                var H = s * 1.07;
                var tipoEsc = TIPOS_ESCONDITE[i % TIPOS_ESCONDITE.length];
                var cont = scene.add.container(x, suelo);
                cont.setDepth(suelo / 100 + 0.005);
                scene.dibujarEscondite(cont, tipoEsc, W, H);
                scene.escondites.push({
                    i: i, x: x, suelo: suelo, W: W, H: H, tipo: tipoEsc, cont: cont, ocupado: null
                });
            });
            return true;
        },

        dibujarEscondite: function (cont, tipo, W, H) {
            var g = this.add.graphics();
            g.fillStyle(0x000000, 0.12);
            g.fillEllipse(0, 0, W * 1.05, H * 0.22);
            if (tipo === 'arbusto') {
                var verdes = [0x2f9e44, 0x37b24d, 0x40c057];
                [[-0.3, -0.36, 0.31, 0], [0.3, -0.38, 0.31, 0], [0, -0.62, 0.33, 2],
                    [-0.13, -0.22, 0.33, 1], [0.15, -0.21, 0.33, 1]].forEach(function (c) {
                    g.fillStyle(verdes[c[3]], 1);
                    g.fillCircle(W * c[0], H * c[1], W * c[2]);
                });
                g.fillStyle(0xffffff, 0.25);
                g.fillCircle(-W * 0.14, -H * 0.78, W * 0.08);
                g.fillStyle(0xff8787, 1);
                g.fillCircle(W * 0.2, -H * 0.5, W * 0.035);
                g.fillCircle(-W * 0.28, -H * 0.3, W * 0.035);
            } else if (tipo === 'caja') {
                g.fillStyle(0xc68642, 1);
                g.fillRoundedRect(-W / 2, -H, W, H, 10);
                g.lineStyle(4, 0x8a5a2b, 1);
                g.strokeRoundedRect(-W / 2, -H, W, H, 10);
                g.lineBetween(-W / 2, -H * 0.5, W / 2, -H * 0.5);
                g.lineBetween(-W * 0.2, -H, -W * 0.2, 0);
                g.lineBetween(W * 0.2, -H, W * 0.2, 0);
            } else if (tipo === 'tronco') {
                g.fillStyle(0x8d5a2b, 1);
                g.fillRoundedRect(-W * 0.47, -H, W * 0.94, H, 14);
                g.fillStyle(0x6b4220, 1);
                g.fillRect(-W * 0.3, -H * 0.8, W * 0.05, H * 0.7);
                g.fillRect(W * 0.18, -H * 0.7, W * 0.05, H * 0.6);
                g.fillStyle(0xd9a066, 1);
                g.fillEllipse(0, -H, W * 0.94, H * 0.24);
                g.lineStyle(3, 0xa9743c, 1);
                g.strokeEllipse(0, -H, W * 0.6, H * 0.14);
                g.strokeEllipse(0, -H, W * 0.3, H * 0.07);
            } else if (tipo === 'maceta') {
                g.fillStyle(0xe8590c, 1);
                g.beginPath();
                g.moveTo(-W * 0.5, -H * 0.82);
                g.lineTo(W * 0.5, -H * 0.82);
                g.lineTo(W * 0.38, 0);
                g.lineTo(-W * 0.38, 0);
                g.closePath();
                g.fillPath();
                g.fillStyle(0xd9480f, 1);
                g.fillRoundedRect(-W * 0.55, -H, W * 1.1, H * 0.22, 8);
                g.fillStyle(0x37b24d, 1);
                g.fillEllipse(-W * 0.32, -H * 1.02, W * 0.22, H * 0.12);
                g.fillEllipse(W * 0.32, -H * 1.02, W * 0.22, H * 0.12);
            } else {
                g.fillStyle(0x868e96, 1);
                g.fillRoundedRect(-W / 2, -H * 1.02, W, H * 1.04, W * 0.32);
                g.fillStyle(0xadb5bd, 1);
                g.fillEllipse(-W * 0.15, -H * 0.75, W * 0.35, H * 0.22);
                g.fillStyle(0x495057, 0.5);
                g.fillCircle(W * 0.22, -H * 0.35, W * 0.06);
            }
            cont.add(g);
            cont.dibujo = g;
        },

        /* ── Elementos ─────────────────────────────────────────────── */

        crearElemento: function (id) {
            if (this.elems[id]) return this.elems[id];
            var img = this.add.image(this.scale.width / 2, this.scale.height * 0.7, tex(id)).setOrigin(0.5);
            var glow = this.add.circle(0, 0, 10, 0xffd43b, 0);
            var el = {
                id: id, img: img, glow: glow, esc: null,
                f: 1, estado: 'fuera', prox: 0, hasta: 0, ultimaAsomada: 0,
                resaltado: false, size: 100
            };
            this.elems[id] = el;
            this.dimensionar(el);
            return el;
        },

        dimensionar: function (el) {
            var s = this.tamano();
            el.size = s;
            var lado = Math.max(el.img.width, el.img.height) || 1;
            el.escala = s / lado;
            el.img.setScale(el.escala);
            el.glow.setRadius(s * 0.62);
        },

        /** Coloca el elemento según su escondite y cuánto se asoma (f: 0 oculto … 1 fuera). */
        posicionar: function (el) {
            var e = this.escondites[el.esc];
            if (!e) return;
            var tope = e.suelo - e.H;
            el.img.x = e.x;
            el.img.y = tope - el.f * el.size + el.size / 2;
            el.img.setDepth(e.suelo / 100);
            el.glow.setPosition(el.img.x, el.img.y).setDepth(e.suelo / 100 - 0.001);
        },

        moverF: function (el, f, ms, ease) {
            var scene = this;
            this.tweens.killTweensOf(el);
            return new Promise(function (resolve) {
                if (reducido() || ms <= 0) {
                    el.f = f;
                    scene.posicionar(el);
                    resolve();
                    return;
                }
                scene.tweens.add({
                    targets: el, f: f, duration: ms, ease: ease || 'Back.easeOut',
                    onUpdate: function () { scene.posicionar(el); },
                    onComplete: function () { scene.posicionar(el); resolve(); }
                });
            });
        },

        asomar: function (el) {
            if (el.estado !== 'oculto') return;
            el.estado = 'asomado';
            var a = this.ritmo.asomado;
            var acorta = 1 - Math.min(0.35, this.ronda * 0.07);
            el.hasta = this.time.now + rnd(a[0], a[1]) * acorta;
            el.ultimaAsomada = this.time.now;
            this.moverF(el, 0.78, 320);
            avisar('onAsoma', el.id, { pan: this.panDe(el.id) });
        },

        esconder: function (el) {
            if (el.estado !== 'asomado' && el.estado !== 'fuera') return;
            el.estado = 'oculto';
            el.img.angle = 0;
            var o = this.ritmo.oculto;
            el.prox = this.time.now + rnd(o[0], o[1]);
            this.moverF(el, -0.06, 260, 'Quad.easeIn');
        },

        update: function (time, delta) {
            var dt = delta / 1000;
            var w = this.scale.width;
            this.nubes.forEach(function (n) {
                n.x += n.vel * dt;
                if (n.x > w + 80) n.x = -80;
            });
            this.rayos.rotation += 0.2 * dt;

            var scene = this;
            Object.keys(this.elems).forEach(function (id) {
                var el = scene.elems[id];
                el.glow.setAlpha(el.resaltado ? 0.35 + 0.25 * Math.sin(time / 160) : 0);
                if (el.estado === 'asomado' && !reducido()) {
                    el.img.angle = Math.sin(time / 260 + el.size) * 5;
                }
            });

            if (!this.jugando) return;

            // En "solo se escucha" nadie se asoma por su cuenta: se busca con el oído.
            var autoAsoma = this.modo !== 'escucha';
            Object.keys(this.elems).forEach(function (id) {
                var el = scene.elems[id];
                if (el.esc == null) return;
                if (el.estado === 'oculto') {
                    if (!autoAsoma) return;
                    var urge = id === scene.objetivo && time - el.ultimaAsomada > scene.ritmo.maxEspera;
                    if (time >= el.prox || urge) scene.asomar(el);
                } else if (el.estado === 'asomado' && time >= el.hasta) {
                    scene.esconder(el);
                }
            });

            if ((this.tipo === 'viajero' || this.modo === 'vuela') && time >= this.proxViaje) {
                this.proxViaje = time + this.viajeMs;
                this.mudar(this.elems[this.objetivo]);
            }
        },

        /* ── Toques ───────────────────────────────────────────────── */

        alTocar: function (pointer) {
            if (!puedeTocar()) return;
            var px = pointer.worldX;
            var py = pointer.worldY;
            var scene = this;

            // Elementos asomados primero (el de delante gana).
            var candidatos = Object.keys(this.elems).map(function (id) { return scene.elems[id]; })
                .filter(function (el) { return el.esc != null && el.f > 0.3 && el.estado !== 'corriendo'; })
                .sort(function (a, b) { return b.img.depth - a.img.depth; });
            for (var i = 0; i < candidatos.length; i++) {
                var el = candidatos[i];
                var e = this.escondites[el.esc];
                var arriba = el.img.y - el.size / 2;
                var abajo = e.suelo - e.H * 0.2;
                if (Math.abs(px - el.img.x) < el.size * 0.6 && py > arriba - 10 && py < abajo) {
                    this.tocarElemento(el);
                    return;
                }
            }
            for (var k = 0; k < this.escondites.length; k++) {
                var es = this.escondites[k];
                if (Math.abs(px - es.x) < es.W * 0.55 && py > es.suelo - es.H * 1.2 && py < es.suelo + 10) {
                    this.tocarEscondite(es);
                    return;
                }
            }
        },

        tocarElemento: function (el) {
            if (!this.jugando || el.enfriado) return;
            if (el.id === this.objetivo) {
                this.jugando = false;
                el.estado = 'fuera';
                var scene = this;
                Object.keys(this.elems).forEach(function (id) {
                    if (id !== el.id) scene.esconder(scene.elems[id]);
                });
                this.moverF(el, 1.15, 380);
                avisar('onAcierto', el.id);
                return;
            }
            // Error: sale, dice "no soy yo" con su propio sonido y se vuelve a esconder.
            el.estado = 'fuera';
            el.enfriado = true;
            this.moverF(el, 1.05, 260);
            if (!reducido()) {
                this.tweens.add({
                    targets: el.img, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 4,
                    onComplete: function () { el.img.angle = 0; }
                });
            }
            var scene2 = this;
            this.time.delayedCall(1500, function () {
                el.enfriado = false;
                if (el.estado === 'fuera') scene2.esconder(el);
            });
            avisar('onError', el.id, { pan: this.panDe(el.id) });
        },

        tocarEscondite: function (es) {
            var ahora = this.time.now;
            if (!this.jugando || ahora - this.ultimoToqueEsc < 700) return;
            this.ultimoToqueEsc = ahora;
            // El escondite tiembla y quien esté dentro se asoma.
            if (!reducido()) {
                this.tweens.add({
                    targets: es.cont, scaleX: 1.06, scaleY: 0.94, duration: 80, yoyo: true, repeat: 2,
                    onComplete: function () { es.cont.setScale(1); }
                });
            }
            var dentro = es.ocupado && this.elems[es.ocupado];
            if (this.modo === 'escucha' && dentro && dentro.estado === 'oculto') {
                // Solo se escucha: tocar el escondite correcto es encontrarlo; otro se presenta.
                dentro.estado = 'asomado';
                dentro.f = 0.3;
                this.tocarElemento(dentro);
                return;
            }
            if (dentro && dentro.estado === 'oculto') this.asomar(dentro);
            // Frío o caliente: el sonido suena más fuerte cuanto más cerca está.
            var obj = this.elems[this.objetivo];
            var eo = obj && this.escondites[obj.esc];
            var cercania = 0;
            if (eo) {
                var d = Phaser.Math.Distance.Between(es.x, es.suelo, eo.x, eo.suelo);
                var maxD = Math.max(this.scale.width, this.scale.height) * 0.75;
                cercania = Phaser.Math.Clamp(1 - d / maxD, 0, 1);
            }
            avisar('onToqueEscondite', { cercania: cercania, pan: this.panDe(this.objetivo), vacio: !dentro });
        },

        /* ── Rondas ───────────────────────────────────────────────── */

        /**
         * Prepara una ronda: escondites, elementos y reparto nuevo (el objetivo no repite
         * escondite). Los elementos corren a la vista hasta su sitio y se esconden.
         */
        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.ritmo = RITMO[o.dificultad] || RITMO['34'];
            this.tipo = o.tipo || 'buscar';
            this.ronda = o.ronda || 0;
            this.modo = o.modo || 'asoma';
            this.objetivo = o.objetivo;
            var ids = o.elementos.slice();
            var viaja = this.tipo === 'viajero' || this.modo === 'vuela';
            this.viajeMs = this.modo === 'vuela' ? this.ritmo.viajeMs * 0.7 : this.ritmo.viajeMs;
            var cantidad = this.tipo === 'zonas' ? 4 : ids.length + (viaja ? 2 : 0);
            var rehecho = this.construirEscondites(Math.min(7, cantidad), this.tipo);

            var nuevos = ids.filter(function (id) { return !scene.elems[id]; });
            nuevos.forEach(function (id) { scene.crearElemento(id); });
            Object.keys(this.elems).forEach(function (id) {
                var el = scene.elems[id];
                scene.resaltar(id, false);
                if (ids.indexOf(id) === -1) {
                    // No juega esta ronda: fuera del escenario y fuera del escondite.
                    scene.tweens.killTweensOf(el);
                    el.esc = null;
                    el.estado = 'fuera';
                    el.img.setVisible(false);
                } else {
                    el.img.setVisible(true);
                    // Si cambió el parque, su escondite viejo ya no existe: entra de nuevo.
                    if (rehecho) el.esc = null;
                }
            });

            // Reparto: el objetivo cambia de escondite respecto a la ronda anterior.
            var previo = this.elems[o.objetivo] ? this.elems[o.objetivo].esc : null;
            var reparto = null;
            for (var intento = 0; intento < 20; intento++) {
                reparto = mezclar(this.escondites.map(function (e) { return e.i; })).slice(0, ids.length);
                if (reparto[ids.indexOf(o.objetivo)] !== previo) break;
            }
            this.escondites.forEach(function (e) { e.ocupado = null; });
            ids.forEach(function (id, k) { scene.escondites[reparto[k]].ocupado = id; });
            this.inicioViaje = reparto[ids.indexOf(o.objetivo)];

            var w = this.scale.width;
            var h = this.scale.height;
            var promesas = ids.map(function (id, k) {
                var el = scene.elems[id];
                var destino = reparto[k];
                return new Promise(function (resolve) {
                    var primera = el.esc == null;
                    var salir = primera ? Promise.resolve() : scene.moverF(el, 1.1, 260);
                    salir.then(function () {
                        var e = scene.escondites[destino];
                        var desdeX = primera ? w * (0.3 + 0.4 * (k + 0.5) / ids.length) : el.img.x;
                        var desdeY = primera ? h * 0.66 : el.img.y;
                        var haciaY = e.suelo - e.H - 0.1 * el.size + el.size / 2;
                        if (primera) {
                            el.img.setPosition(desdeX, desdeY).setScale(0).setDepth(9);
                        }
                        el.estado = 'corriendo';
                        var p = { t: 0 };
                        var retraso = k * 120 + (primera ? 0 : 150);
                        if (primera && !reducido()) {
                            scene.tweens.add({ targets: el.img, scale: el.escala, duration: 300, delay: k * 90, ease: 'Back.easeOut' });
                        } else {
                            el.img.setScale(el.escala);
                        }
                        scene.tweens.add({
                            targets: p, t: 1, duration: reducido() ? 1 : 700, delay: retraso + (primera ? 450 : 0),
                            ease: 'Sine.easeInOut',
                            onStart: function () { if (k === 0 && global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.sonar('zas'); },
                            onUpdate: function () {
                                el.img.x = Phaser.Math.Linear(desdeX, e.x, p.t);
                                el.img.y = Phaser.Math.Linear(desdeY, haciaY, p.t) - Math.sin(p.t * Math.PI) * el.size * 0.7;
                                el.img.angle = Math.sin(p.t * Math.PI * 4) * 10;
                            },
                            onComplete: function () {
                                el.img.angle = 0;
                                el.esc = destino;
                                el.f = 1.1;
                                scene.posicionar(el);
                                el.estado = 'fuera';
                                scene.esconder(el);
                                scene.time.delayedCall(300, resolve);
                            }
                        });
                    });
                });
            });
            return Promise.all(promesas);
        },

        jugar: function () {
            var scene = this;
            var ahora = this.time.now;
            Object.keys(this.elems).forEach(function (id) {
                var el = scene.elems[id];
                if (el.esc == null) return;
                el.prox = ahora + (id === scene.objetivo ? 500 : rnd(200, 1600));
                el.ultimaAsomada = ahora;
            });
            this.proxViaje = ahora + (this.viajeMs || this.ritmo.viajeMs);
            this.jugando = true;
        },

        pausar: function () {
            this.jugando = false;
            var scene = this;
            Object.keys(this.elems).forEach(function (id) {
                var el = scene.elems[id];
                if (el.estado === 'asomado') scene.esconder(el);
            });
        },

        /** Viajero: el objetivo corre (a la vista) a un escondite libre. */
        mudar: function (el, destino) {
            if (!el || el.estado === 'corriendo' || el.estado === 'fuera') return;
            var scene = this;
            var libres = this.escondites.filter(function (e) { return !e.ocupado && e.i !== el.esc; });
            var e = destino != null ? this.escondites[destino] : Phaser.Utils.Array.GetRandom(libres);
            if (!e || e.i === el.esc) return;
            this.escondites[el.esc].ocupado = null;
            e.ocupado = el.id;
            el.estado = 'corriendo';
            var desdeX = el.img.x;
            var desdeY = this.escondites[el.esc].suelo - el.size * 0.1;
            var haciaY = e.suelo - el.size * 0.1;
            if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.sonar('zas');
            el.img.setDepth(9);
            // Con alas vuela alto por el cielo; si no, corre dando saltitos por el suelo.
            var vuela = this.textures.exists(tex(el.id, 'alas'));
            var aleteo = null;
            if (vuela && !reducido()) {
                var arriba = false;
                aleteo = this.time.addEvent({
                    delay: 120, loop: true,
                    callback: function () {
                        arriba = !arriba;
                        el.img.setTexture(arriba ? tex(el.id, 'alas') : tex(el.id));
                    }
                });
            }
            var altura = vuela ? Math.max(el.size * 1.4, this.scale.height * 0.25) : el.size * 0.25;
            var p = { t: 0 };
            this.tweens.add({
                targets: p, t: 1, duration: reducido() ? 1 : (vuela ? 1500 : 1100), ease: 'Sine.easeInOut',
                onUpdate: function () {
                    el.img.x = Phaser.Math.Linear(desdeX, e.x, p.t);
                    var salto = vuela ? Math.sin(p.t * Math.PI) : Math.abs(Math.sin(p.t * Math.PI * 3));
                    el.img.y = Phaser.Math.Linear(desdeY, haciaY, p.t) - salto * altura;
                    el.img.setFlipX(e.x < desdeX);
                },
                onComplete: function () {
                    if (aleteo) aleteo.remove();
                    el.img.setTexture(tex(el.id));
                    el.img.setFlipX(false);
                    el.esc = e.i;
                    el.f = -0.06;
                    el.estado = 'oculto';
                    el.prox = scene.time.now + 400;
                    scene.posicionar(el);
                }
            });
        },

        /** Error en el viajero: vuelve a su escondite de partida (se repite el ejercicio). */
        volverInicio: function () {
            var el = this.elems[this.objetivo];
            if (!el || this.inicioViaje == null || el.esc === this.inicioViaje) return;
            if (el.estado === 'asomado') {
                el.estado = 'oculto';
                el.f = -0.06;
                this.posicionar(el);
            }
            this.mudar(el, this.inicioViaje);
            this.proxViaje = this.time.now + this.ritmo.viajeMs;
        },

        resaltar: function (id, si) {
            var el = this.elems[id];
            if (el) el.resaltado = !!si;
        },

        panDe: function (id) {
            var el = this.elems[id] || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!el) return 0;
            return Phaser.Math.Clamp((el.img.x / this.scale.width) * 2 - 1, -1, 1) * 0.85;
        },

        /* ── Celebraciones ───────────────────────────────────────── */

        /** Animación del acierto según el documento: aletea, paraguas, sacude, ilumina… */
        celebrar: function (id, efecto) {
            var scene = this;
            var el = this.elems[id] || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!el) return Promise.resolve();
            var img = el.img;
            var x = img.x;
            var y = img.y;
            var rm = reducido();
            var dur = 1500;
            this.estrellas(x, y, FIESTA, 16, el.size);

            if (efecto === 'aletea' && this.textures.exists(tex(id, 'alas'))) {
                var arriba = false;
                var ev = this.time.addEvent({
                    delay: 150, repeat: 10,
                    callback: function () {
                        arriba = !arriba;
                        img.setTexture(arriba ? tex(id, 'alas') : tex(id));
                    }
                });
                if (!rm) this.tweens.add({ targets: img, y: y - el.size * 0.35, duration: 450, yoyo: true, ease: 'Sine.easeInOut' });
                this.time.delayedCall(1700, function () { ev.remove(); img.setTexture(tex(id)); });
                this.notas(x, y - el.size * 0.4);
            } else if (efecto === 'paraguas') {
                if (this.textures.exists(tex(id, 'abierto'))) img.setTexture(tex(id, 'abierto'));
                this.lluvia(1900);
                dur = 1900;
            } else if (efecto === 'sacude') {
                if (!rm) this.tweens.add({ targets: img, angle: { from: -16, to: 16 }, duration: 80, yoyo: true, repeat: 7, onComplete: function () { img.angle = 0; } });
            } else if (efecto === 'ilumina') {
                var luz = this.add.circle(x, y, el.size * 0.7, 0xffe066, 0.55).setDepth(img.depth - 0.002);
                if (!rm) this.tweens.add({ targets: luz, scale: 1.35, alpha: 0.2, duration: 380, yoyo: true, repeat: 2 });
                this.time.delayedCall(1600, function () { luz.destroy(); });
                this.estrellas(x, y, [0xffd43b, 0xfff3bf, 0xfab005], 20, el.size);
            } else if (efecto === 'pulso') {
                if (!rm) this.tweens.add({ targets: img, scale: el.escala * 1.25, duration: 220, yoyo: true, repeat: 3 });
                this.notas(x, y - el.size * 0.4);
            } else if (efecto === 'detiene' || efecto === 'final' || efecto === 'especial') {
                if (!rm) {
                    this.tweens.add({ targets: img, y: y - el.size * 0.6, duration: 320, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
                    this.cameras.main.flash(220, 255, 255, 255);
                }
                this.confeti(1800);
                dur = 2000;
            } else {
                if (!rm) this.tweens.add({ targets: img, y: y - el.size * 0.5, duration: 300, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            }
            return new Promise(function (resolve) { scene.time.delayedCall(dur, resolve); });
        },

        /**
         * Hogar que se va llenando cuando el objetivo es siempre el mismo: el pájaro vuelve
         * a su nido, el perro a su casita, los instrumentos a su caja musical…
         */
        crearHogar: function (objId, total) {
            if (this.hogar) return;
            var w = this.scale.width;
            var h = this.scale.height;
            var R = Phaser.Math.Clamp(Math.min(w, h) * 0.11, 46, 90);
            // Arriba a la izquierda: por encima de lo que se asoma de la fila de delante.
            var x = Math.max(w * 0.09, R * 1.2);
            var y = h * 0.33;
            var tipo = HOGAR[objId] || 'cesta';
            var cont = this.add.container(x, y).setDepth(30);
            var g = this.add.graphics();
            if (tipo === 'nido') {
                g.lineStyle(R * 0.22, 0x8d5a2b, 1);
                g.lineBetween(-x - 10, R * 0.55, R * 0.9, R * 0.35);
                g.fillStyle(0x51cf66, 1);
                g.fillCircle(-R * 1.1, R * 0.3, R * 0.28);
                g.fillCircle(R * 1.05, R * 0.2, R * 0.24);
                g.fillStyle(0xa9743c, 1);
                g.fillEllipse(0, R * 0.12, R * 2.1, R * 0.95);
                g.lineStyle(3, 0x6b4220, 1);
                for (var i = 0; i < 4; i++) g.strokeEllipse(0, R * 0.12 + i * 4, R * (2 - i * 0.25), R * 0.5);
            } else if (tipo === 'casita') {
                g.fillStyle(0xffa94d, 1);
                g.fillRect(-R * 0.85, -R * 0.55, R * 1.7, R * 1.05);
                g.fillStyle(0xe03131, 1);
                g.fillTriangle(-R * 1.05, -R * 0.5, R * 1.05, -R * 0.5, 0, -R * 1.3);
                g.fillStyle(0x6b4220, 1);
                g.fillRoundedRect(-R * 0.28, -R * 0.1, R * 0.56, R * 0.6, { tl: R * 0.28, tr: R * 0.28, bl: 0, br: 0 });
            } else if (tipo === 'musical') {
                g.fillStyle(0x9775fa, 1);
                g.fillRoundedRect(-R, -R * 0.2, R * 2, R * 0.9, 10);
                g.fillStyle(0x7048e8, 1);
                g.fillRoundedRect(-R, -R * 0.55, R * 2, R * 0.3, 8);
                g.fillStyle(0xffd43b, 1);
                g.fillCircle(-R * 0.5, R * 0.25, R * 0.12);
                g.fillCircle(R * 0.5, R * 0.25, R * 0.12);
            } else {
                g.fillStyle(0xd9a066, 1);
                g.beginPath();
                g.moveTo(-R, -R * 0.2);
                g.lineTo(R, -R * 0.2);
                g.lineTo(R * 0.75, R * 0.7);
                g.lineTo(-R * 0.75, R * 0.7);
                g.closePath();
                g.fillPath();
                g.lineStyle(R * 0.1, 0xa9743c, 1);
                g.beginPath();
                g.arc(0, -R * 0.2, R * 0.85, Math.PI, Math.PI * 2, false);
                g.strokePath();
            }
            cont.add(g);
            var huecos = [];
            var n = Math.max(1, total);
            for (var k = 0; k < n; k++) {
                var t = n === 1 ? 0.5 : k / (n - 1);
                huecos.push({ x: x + Phaser.Math.Linear(-R * 0.75, R * 0.75, t), y: y - R * 0.3 - (k % 2) * R * 0.18 });
            }
            this.hogar = { cont: cont, tipo: tipo, R: R, huecos: huecos, items: [] };
        },

        /** El amigo encontrado vuelve a su hogar (o a la fila de abajo); el original se esconde. */
        guardarAmigo: function (id) {
            var scene = this;
            var el = this.elems[id];
            if (!el) return Promise.resolve();
            el.img.setTexture(tex(id));
            if (this.hogar) return this.guardarEnHogar(el);
            var w = this.scale.width;
            var h = this.scale.height;
            var k = this.amigos.length;
            var paso = Math.min(64, w * 0.05);
            var lado = k % 2 === 0 ? -1 : 1;
            var orden = Math.floor(k / 2);
            var destX = w / 2 + lado * (Math.min(130, w * 0.11) + orden * paso);
            var destY = h - paso * 0.75;
            var marco = this.add.circle(el.img.x, el.img.y, paso * 0.46, 0xffffff, 0.95).setDepth(40);
            marco.setStrokeStyle(4, FIESTA[k % FIESTA.length], 1);
            var mini = this.add.image(el.img.x, el.img.y, tex(id)).setDepth(41);
            var esc = (paso * 0.7) / (Math.max(mini.width, mini.height) || 1);
            mini.setScale(el.escala);
            this.amigos.push({ marco: marco, img: mini });
            this.esconder(el);
            return new Promise(function (resolve) {
                scene.tweens.add({ targets: marco, x: destX, y: destY, duration: reducido() ? 1 : 650, ease: 'Cubic.easeInOut' });
                scene.tweens.add({
                    targets: mini, x: destX, y: destY, scale: esc, duration: reducido() ? 1 : 650, ease: 'Cubic.easeInOut',
                    onComplete: function () {
                        if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.sonar('pop');
                        scene.estrellas(destX, destY, FIESTA, 8, 10);
                        resolve();
                    }
                });
            });
        },

        guardarEnHogar: function (el) {
            var scene = this;
            var ho = this.hogar;
            var k = ho.items.length;
            var hueco = ho.huecos[Math.min(k, ho.huecos.length - 1)];
            var mini = this.add.image(el.img.x, el.img.y, tex(el.id)).setDepth(31).setScale(el.escala);
            var esc = (ho.R * 0.85) / (Math.max(mini.width, mini.height) || 1);
            ho.items.push(mini);
            this.esconder(el);
            var conAlas = this.textures.exists(tex(el.id, 'alas'));
            return new Promise(function (resolve) {
                var aleteo = null;
                if (conAlas && !reducido()) {
                    var arriba = false;
                    aleteo = scene.time.addEvent({
                        delay: 120, loop: true,
                        callback: function () {
                            arriba = !arriba;
                            mini.setTexture(arriba ? tex(el.id, 'alas') : tex(el.id));
                        }
                    });
                }
                var ox = mini.x;
                var oy = mini.y;
                var p = { t: 0 };
                scene.tweens.add({
                    targets: p, t: 1, duration: reducido() ? 1 : 900, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        mini.x = Phaser.Math.Linear(ox, hueco.x, p.t);
                        mini.y = Phaser.Math.Linear(oy, hueco.y, p.t) - Math.sin(p.t * Math.PI) * ho.R * 1.6;
                        mini.setScale(Phaser.Math.Linear(el.escala, esc, p.t));
                        mini.setFlipX(hueco.x < ox);
                    },
                    onComplete: function () {
                        if (aleteo) aleteo.remove();
                        mini.setTexture(tex(el.id));
                        mini.setFlipX(false);
                        if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.sonar('pop');
                        scene.estrellas(hueco.x, hueco.y, FIESTA, 10, 10);
                        if (!reducido()) scene.tweens.add({ targets: ho.cont, scaleY: 0.9, scaleX: 1.08, duration: 110, yoyo: true });
                        resolve();
                    }
                });
            });
        },

        /** Pista en "solo se escucha": el objetivo se asoma un momento. */
        asomarObjetivo: function () {
            var el = this.elems[this.objetivo];
            if (el && el.estado === 'oculto') this.asomar(el);
        },

        fiestaFinal: function () {
            var scene = this;
            this.pausar();
            if (this.hogar && !reducido()) {
                this.hogar.items.forEach(function (it, i) {
                    scene.tweens.add({ targets: it, y: it.y - 26, duration: 230, yoyo: true, repeat: 4, delay: i * 110, ease: 'Quad.easeOut' });
                });
            }
            var ids = Object.keys(this.elems);
            ids.forEach(function (id, i) {
                var el = scene.elems[id];
                if (el.esc == null) return;
                scene.time.delayedCall(i * 160, function () {
                    el.estado = 'fuera';
                    scene.moverF(el, 1.15, 380).then(function () {
                        if (reducido()) return;
                        scene.tweens.add({ targets: el.img, y: el.img.y - el.size * 0.3, duration: 240, yoyo: true, repeat: 3, ease: 'Quad.easeOut' });
                    });
                });
            });
            this.amigos.forEach(function (a, i) {
                if (reducido()) return;
                scene.tweens.add({ targets: [a.marco, a.img], y: a.marco.y - 22, duration: 220, yoyo: true, repeat: 3, delay: i * 90 });
            });
            this.confeti(2200);
            return new Promise(function (resolve) { scene.time.delayedCall(2400, resolve); });
        },

        /* ── Efectos ──────────────────────────────────────────────── */

        estrellas: function (x, y, colores, n, r0) {
            if (reducido()) return;
            for (var i = 0; i < n; i++) {
                var a = (Math.PI * 2 / n) * i + rnd(-0.2, 0.2);
                var d = rnd(70, 170);
                var sx = x + Math.cos(a) * (r0 || 0) * 0.3;
                var sy = y + Math.sin(a) * (r0 || 0) * 0.3;
                var st = this.add.star(sx, sy, 5, 4, 10, colores[i % colores.length]).setDepth(60);
                this.tweens.add({
                    targets: st, x: sx + Math.cos(a) * d, y: sy + Math.sin(a) * d, angle: 180,
                    alpha: 0, scale: 0.3, duration: rnd(600, 1000), ease: 'Cubic.easeOut',
                    onComplete: (function (o) { return function () { o.destroy(); }; })(st)
                });
            }
        },

        notas: function (x, y) {
            if (reducido()) return;
            for (var i = 0; i < 6; i++) {
                var t = this.add.text(x + rnd(-30, 30), y, i % 2 ? '♪' : '♫', {
                    fontFamily: 'Fredoka, sans-serif', fontSize: '34px', color: '#7048e8'
                }).setOrigin(0.5).setDepth(60);
                this.tweens.add({
                    targets: t, y: y - rnd(80, 150), x: t.x + rnd(-40, 40), alpha: 0,
                    duration: rnd(900, 1300), delay: i * 120,
                    onComplete: (function (o) { return function () { o.destroy(); }; })(t)
                });
            }
        },

        lluvia: function (ms) {
            if (reducido()) return;
            var w = this.scale.width;
            var h = this.scale.height;
            var n = Math.round(ms / 22);
            for (var i = 0; i < n; i++) {
                var gota = this.add.rectangle(rnd(0, w), -20, 3, rnd(14, 24), 0x4dabf7, 0.8).setDepth(55);
                this.tweens.add({
                    targets: gota, y: h + 30, x: gota.x - 40, duration: rnd(600, 900), delay: rnd(0, ms - 600),
                    onComplete: (function (o) { return function () { o.destroy(); }; })(gota)
                });
            }
        },

        confeti: function (ms) {
            if (reducido()) return;
            var w = this.scale.width;
            var h = this.scale.height;
            for (var i = 0; i < 60; i++) {
                var c = this.add.rectangle(rnd(0, w), -20, rnd(8, 14), rnd(5, 9), FIESTA[i % FIESTA.length], 1).setDepth(58);
                this.tweens.add({
                    targets: c, y: h + 30, x: c.x + rnd(-80, 80), angle: rnd(180, 720),
                    duration: rnd(1400, 2200), delay: rnd(0, ms * 0.5),
                    onComplete: (function (o) { return function () { o.destroy(); }; })(c)
                });
            }
        },

        cartel: function (texto, color) {
            var w = this.scale.width;
            var h = this.scale.height;
            var t = this.add.text(w / 2, h * 0.45, texto, {
                fontFamily: 'Fredoka, sans-serif', fontStyle: 'bold',
                fontSize: Math.round(Math.min(w, h) * 0.09) + 'px', color: '#ffffff',
                stroke: color || '#7048e8', strokeThickness: 12, align: 'center'
            }).setOrigin(0.5).setDepth(70).setScale(0);
            var scene = this;
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: t, scale: 1, duration: 420, ease: 'Back.easeOut',
                    onComplete: function () {
                        scene.tweens.add({
                            targets: t, alpha: 0, y: t.y - 40, delay: 1000, duration: 380,
                            onComplete: function () { t.destroy(); resolve(); }
                        });
                    }
                });
            });
        },

        /* ── Demo y utilidades ───────────────────────────────────── */

        /** Ejemplo guiado: un solo escondite en el centro con el elemento de demo asomado. */
        demo: function (id) {
            var w = this.scale.width;
            var h = this.scale.height;
            var s = this.tamano();
            var cont = this.add.container(w / 2, h * 0.74).setDepth(8.01);
            this.dibujarEscondite(cont, 'arbusto', s * 1.3, s * 1.07);
            var img = this.add.image(w / 2, h * 0.74 - s * 1.08 - s * 0.78 + s / 2, tex(id)).setDepth(8);
            var escala = s / (Math.max(img.width, img.height) || 1);
            img.setScale(0);
            this.tweens.add({ targets: img, scale: escala, duration: 380, ease: 'Back.easeOut' });
            this.demoObj = { id: id, img: img, cont: cont, size: s, escala: escala };
        },

        limpiarDemo: function () {
            var d = this.demoObj;
            if (!d) return Promise.resolve();
            this.demoObj = null;
            var scene = this;
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: [d.img, d.cont], alpha: 0, duration: 300,
                    onComplete: function () { d.img.destroy(); d.cont.destroy(); resolve(); }
                });
            });
        },

        rectDe: function (id) {
            var el = this.elems[id] || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!el) return null;
            var canvas = this.game.canvas.getBoundingClientRect();
            var sx = canvas.width / this.scale.width;
            var sy = canvas.height / this.scale.height;
            return {
                x: canvas.left + el.img.x * sx,
                y: canvas.top + el.img.y * sy,
                left: canvas.left + (el.img.x - el.size / 2) * sx,
                top: canvas.top + (el.img.y - el.size / 2) * sy,
                width: el.size * sx,
                height: el.size * sy
            };
        },

        estado: function () {
            var scene = this;
            return {
                jugando: this.jugando,
                objetivo: this.objetivo,
                ronda: this.ronda,
                amigos: this.amigos.length,
                elementos: Object.keys(this.elems).map(function (id) {
                    var el = scene.elems[id];
                    return { id: id, estado: el.estado, f: Math.round(el.f * 100) / 100, x: el.img.x, y: el.img.y, size: el.size, esc: el.esc };
                }),
                escondites: this.escondites.map(function (e) { return { x: e.x, suelo: e.suelo, H: e.H, ocupado: e.ocupado }; })
            };
        }
    });

    function cargarTexturas(scene) {
        var elems = (gameConfig && gameConfig.elementos) || {};
        var lista = [];
        Object.keys(elems).forEach(function (id) {
            var e = elems[id];
            if (e.img) lista.push({ key: tex(id), src: e.img });
            if (e.imgAlas) lista.push({ key: tex(id, 'alas'), src: e.imgAlas });
            if (e.imgAbierto) lista.push({ key: tex(id, 'abierto'), src: e.imgAbierto });
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
        var el = doc.getElementById('escondite-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'escondite-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-escondite');

        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#bfe3ff',
            audio: { noAudio: true },
            scene: [EscenaEscondite],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-escondite');
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }
        return esperarEscena().then(function (scene) {
            return cargarTexturas(scene).then(function () { return scene; });
        });
    }

    function conEscena(fn) {
        return function () {
            var args = arguments;
            if (!sceneRef) return undefined;
            return fn.apply(null, [sceneRef].concat(Array.prototype.slice.call(args)));
        };
    }

    function destruir() {
        sceneRef = null;
        readyPromise = null;
        readyResolve = null;
        game = null;
        global.document.body.classList.remove('modo-escondite');
        if (Host) Host.destruirJuego();
    }

    global.PedniaEscondite = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id, ef) { return s.celebrar(id, ef); }),
        guardarAmigo: conEscena(function (s, id) { return s.guardarAmigo(id); }),
        crearHogar: conEscena(function (s, id, total) { s.crearHogar(id, total); }),
        asomarObjetivo: conEscena(function (s) { s.asomarObjetivo(); }),
        resaltar: conEscena(function (s, id, si) { s.resaltar(id, si); }),
        volverInicio: conEscena(function (s) { s.volverInicio(); }),
        demo: conEscena(function (s, id) { s.demo(id); }),
        limpiarDemo: conEscena(function (s) { return s.limpiarDemo(); }),
        rectDe: conEscena(function (s, id) { return s.rectDe(id); }),
        panDe: conEscena(function (s, id) { return s.panDe(id); }),
        cartel: conEscena(function (s, t, c) { return s.cartel(t, c); }),
        fiestaFinal: conEscena(function (s) { return s.fiestaFinal(); }),
        estado: conEscena(function (s) { return s.estado(); }),
        destruir: destruir
    };
})(typeof window !== 'undefined' ? window : this);
