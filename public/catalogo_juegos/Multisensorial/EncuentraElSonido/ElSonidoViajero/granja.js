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
            this.cielo = this.add.graphics().setDepth(-30);
            this.campo = this.add.graphics().setDepth(-20);
            this.granero = this.add.graphics().setDepth(-12);
            this.puertas = this.add.graphics().setDepth(-11);
            this.dibujar();
            var scene = this;
            this.scale.on('resize', function () { scene.dibujar(); });
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

        horizonte: function () { return this.scale.height * 0.46; },

        /** Zona donde caminan (evita el granero y el botón de escuchar). */
        zona: function () {
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
            var g = this.cielo;
            g.clear();
            g.fillStyle(0x74c0fc, 1);
            g.fillRect(0, 0, w, hz);
            g.fillStyle(0xffd43b, 1);
            g.fillCircle(w * 0.88, h * 0.16, Math.min(w, h) * 0.05);
            var c = this.campo;
            c.clear();
            c.fillStyle(0x94d82d, 1);
            c.fillEllipse(w * 0.3, hz + 10, w * 0.9, h * 0.2);
            c.fillStyle(0x82c91e, 1);
            c.fillEllipse(w * 0.8, hz + 14, w * 0.8, h * 0.18);
            c.fillStyle(0x74b816, 1);
            c.fillRect(0, hz + h * 0.04, w, h);
            // Surcos del huerto al fondo.
            c.fillStyle(0x8d5524, 1);
            for (var s = 0; s < 4; s++) c.fillRect(w * 0.42, hz + h * 0.06 + s * h * 0.022, w * 0.36, h * 0.01);
            c.fillStyle(0x2f9e44, 1);
            for (var p = 0; p < 14; p++) c.fillCircle(w * 0.43 + p * w * 0.026, hz + h * 0.055 + (p % 4) * h * 0.022, 5);
            // Cerca del corral.
            var co = this.corral();
            c.lineStyle(5, 0xffffff, 1);
            c.lineBetween(co.x0, co.y0 - 10, co.x1, co.y0 - 10);
            c.lineBetween(co.x0, co.y0 - 10, co.x0, co.y0 + h * 0.05);
            for (var f = co.x0; f <= co.x1; f += 40) c.lineBetween(f, co.y0 - 30, f, co.y0 - 4);
            c.lineBetween(co.x0, co.y0 - 22, co.x1, co.y0 - 22);
            // Matas de pasto y flores.
            for (var m = 0; m < 30; m++) {
                var mx = ((m * 89) % 100) / 100 * w;
                var my = hz + h * 0.08 + ((m * 57) % 100) / 100 * h * 0.44;
                c.fillStyle(0x5c940d, 1);
                c.fillTriangle(mx - 6, my, mx + 6, my, mx - 2, my - 14);
                c.fillTriangle(mx, my, mx + 10, my, mx + 6, my - 11);
                if (m % 3 === 0) { c.fillStyle(FIESTA[m % FIESTA.length], 1); c.fillCircle(mx + 12, my - 8, 4); }
            }
            // Árbol grande a la derecha, al fondo.
            c.fillStyle(0x8d5524, 1);
            c.fillRect(w * 0.9, hz - h * 0.12, 14, h * 0.16);
            c.fillStyle(0x2f9e44, 1);
            c.fillCircle(w * 0.9 + 7, hz - h * 0.16, h * 0.07);
            c.fillCircle(w * 0.9 - h * 0.04, hz - h * 0.11, h * 0.05);
            c.fillCircle(w * 0.9 + h * 0.05, hz - h * 0.11, h * 0.05);
            // Camino de tierra hacia el granero.
            c.fillStyle(0xd9a066, 1);
            c.fillEllipse(w * 0.2, h * 0.72, w * 0.22, h * 0.08);
            this.dibujarGranero(this.graneroAbierto ? 1 : 0);
            this.ubicarFardos();
        },

        /** Granero rojo a la izquierda con 4 ventanitas arriba (ahí se asoman los encontrados). */
        dibujarGranero: function (abierto) {
            var w = this.scale.width;
            var h = this.scale.height;
            var gx = w * 0.04;
            var gw = Math.min(w * 0.22, h * 0.42);
            var gy = h * 0.7;
            var gh = h * 0.36;
            this.graneroPos = { x: gx, w: gw, y: gy, h: gh, puertaX: gx + gw / 2, puertaY: gy };
            var g = this.granero;
            g.clear();
            g.fillStyle(0xc92a2a, 1);
            g.fillRect(gx, gy - gh, gw, gh);
            g.fillTriangle(gx - 12, gy - gh, gx + gw + 12, gy - gh, gx + gw / 2, gy - gh - gh * 0.35);
            g.fillStyle(0xffffff, 1);
            g.fillRect(gx - 12, gy - gh - 6, gw + 24, 8);
            g.fillRect(gx, gy - 6, gw, 6);
            // Ventanitas del altillo.
            this.ventanitas = [];
            for (var i = 0; i < 4; i++) {
                var vx = gx + gw * (0.16 + i * 0.23);
                var vy = gy - gh * 0.78;
                g.fillStyle(0x343a40, 1);
                g.fillRect(vx - gw * 0.08, vy - gw * 0.08, gw * 0.16, gw * 0.16);
                g.lineStyle(3, 0xffffff, 1);
                g.strokeRect(vx - gw * 0.08, vy - gw * 0.08, gw * 0.16, gw * 0.16);
                this.ventanitas.push({ x: vx, y: vy, t: gw * 0.16 });
            }
            this.dibujarPuertas(abierto);
            var scene = this;
            this.enGranero.forEach(function (im, k) { var v = scene.ventanitas[k % 4]; im.setPosition(v.x, v.y + v.t / 2); });
        },

        dibujarPuertas: function (t) {
            var p = this.graneroPos;
            var g = this.puertas;
            g.clear();
            var pw = p.w * 0.5;
            var ph = p.h * 0.5;
            var x0 = p.x + (p.w - pw) / 2;
            g.fillStyle(0x343a40, 1);
            g.fillRect(x0, p.y - ph, pw, ph);
            var hoja = (pw / 2) * (1 - t * 0.85);
            g.fillStyle(0xe03131, 1);
            g.fillRect(x0, p.y - ph, hoja, ph);
            g.fillRect(x0 + pw - hoja, p.y - ph, hoja, ph);
            g.lineStyle(4, 0xffffff, 1);
            g.strokeRect(x0, p.y - ph, hoja, ph);
            g.strokeRect(x0 + pw - hoja, p.y - ph, hoja, ph);
            if (hoja > 10) {
                g.lineBetween(x0, p.y - ph, x0 + hoja, p.y);
                g.lineBetween(x0 + pw - hoja, p.y - ph, x0 + pw, p.y);
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
            this.fardos.forEach(function (f, i) {
                var x = z.x0 + (z.x1 - z.x0) * (0.18 + i * 0.32);
                var y = z.y0 + (z.y1 - z.y0) * (i % 2 ? 0.75 : 0.35);
                f.clear();
                f.fillStyle(0xfab005, 1);
                f.fillRoundedRect(-fw / 2, -fh, fw, fh, 10);
                f.lineStyle(3, 0xe67700, 1);
                for (var k = 1; k < 4; k++) f.lineBetween(-fw / 2 + 6, -fh + k * fh / 4, fw / 2 - 6, -fh + k * fh / 4);
                f.fillStyle(0xc92a2a, 1);
                f.fillRect(-fw * 0.28, -fh, 6, fh);
                f.fillRect(fw * 0.22, -fh, 6, fh);
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

        update: function (time) {
            var scene = this;
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

        /** Final: se abren las puertas y salen todos a saltar. */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.graneroAbierto = true;
            var t = { k: 0 };
            this.tweens.add({ targets: t, k: 1, duration: reducido() ? 1 : 600, onUpdate: function () { scene.dibujarPuertas(t.k); } });
            var p = this.graneroPos;
            var z = this.zona();
            var ids = Object.keys(this.animales);
            ids.forEach(function (id, i) {
                var a = scene.animales[id];
                a.img.setVisible(true);
                a.sombra.setVisible(true);
                a.x = p.puertaX;
                a.y = p.puertaY;
                var destino = { x: z.x0 + (z.x1 - z.x0) * ((i + 0.5) / ids.length), y: z.y0 + (z.y1 - z.y0) * 0.5 };
                scene.time.delayedCall(300 + i * 200, function () {
                    scene.caminarA(a, destino, 1.4).then(function () {
                        if (!reducido()) scene.tweens.add({ targets: a, alto: a.size * 0.3, duration: 220, yoyo: true, repeat: 3 });
                    });
                });
            });
            this.enGranero.forEach(function (c) { scene.tweens.add({ targets: c, alpha: 0, duration: 300 }); });
            this.confeti();
            return esperar(this, 3000);
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
