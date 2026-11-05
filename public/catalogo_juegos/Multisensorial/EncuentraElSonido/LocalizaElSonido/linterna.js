/**
 * PedniaLinterna — "Linterna en la noche" (Localiza el sonido, 5-6 años) en Phaser 4.2.1.
 *
 * Un jardín de noche, casi a oscuras. El niño mueve una linterna (arrastrando el dedo o
 * con el mouse) y el sonido suena más fuerte cuanto más cerca apunta: frío o caliente.
 * Lo que la linterna ilumina se puede tocar.
 *   luna   → 4 cosas, linterna grande (reto del documento).
 *   mas    → llegan cosas parecidas; más oscuro.
 *   pasos  → en la oscuridad las cosas cambian de sitio a ratos.
 *   pila   → a la linterna le queda poca pila: más chica y parpadea.
 * Premio propio de este juego: cada hallazgo enciende una estrella en el cielo; al final
 * las estrellas forman una constelación.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, encenderEstrella, pista, resaltar,
 *      cercania, demo, limpiarDemo, rectDe, panDe, fiestaFinal, estado, destruir.
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
    var OSCURIDAD = 'linterna:oscuridad';
    var LIENZO = 1024;
    /** Radio de luz (fracción del lado menor) y opacidad de la noche por ronda. */
    var RONDAS = {
        luna: { radio: 0.2, noche: 0.94 },
        mas: { radio: 0.17, noche: 0.97 },
        pasos: { radio: 0.17, noche: 0.97 },
        pila: { radio: 0.14, noche: 0.98 }
    };
    /** Constelación final (forma de estrella grande), en fracciones del cielo. */
    var CONSTELACION = [[0.5, 0.06], [0.58, 0.18], [0.7, 0.2], [0.6, 0.28], [0.64, 0.4], [0.5, 0.33], [0.36, 0.4], [0.4, 0.28], [0.3, 0.2], [0.42, 0.18]];

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'linterna:' + id;
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
        if (doc.getElementById('linterna-css')) return;
        var css = doc.createElement('style');
        css.id = 'linterna-css';
        css.textContent = [
            '#linterna-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#linterna-canvas canvas{display:block;width:100% !important;height:100% !important;cursor:none}',
            'body.modo-linterna{background:#0b1730 !important}',
            'body.modo-linterna #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-linterna #principal button,body.modo-linterna .dialogo{pointer-events:auto}',
            'body.modo-linterna .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-linterna .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-linterna .parque-fondo,body.modo-linterna #zonas,body.modo-linterna #elementos{display:none !important}',
            'body.modo-linterna .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(20vh,160px)}',
            'body.modo-linterna .pj-zoe{left:6px}',
            'body.modo-linterna .pj-zeus{right:6px}',
            'body.modo-linterna .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaLinterna = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaLinterna() {
            Phaser.Scene.call(this, { key: 'EscenaLinterna' });
            this.cosas = {};
            this.estrellasCielo = [];
            this.modo = 'luna';
            this.objetivo = null;
            this.jugando = false;
            this.ronda = 0;
            this.demoObj = null;
            this.luz = { x: 0, y: 0, r: 120, parpadeo: 1 };
            this.radioHecho = -1;
        },

        create: function () {
            this.fondo = this.add.graphics().setDepth(-30);
            this.titilan = [];
            for (var i = 0; i < 40; i++) {
                this.titilan.push(this.add.circle(0, 0, rnd(1, 2.4), 0xffffff, rnd(0.4, 1)).setDepth(-29));
            }
            this.luna = this.add.container(0, 0).setDepth(-28);
            this.luna.add(this.add.circle(0, 0, 40, 0xfff3bf));
            this.luna.add(this.add.circle(18, -10, 36, 0x15224a));
            // Noche: imagen con un agujero de luz suave que sigue a la linterna.
            if (!this.textures.exists(OSCURIDAD)) this.textures.createCanvas(OSCURIDAD, LIENZO, LIENZO);
            this.oscuridad = this.add.image(0, 0, OSCURIDAD).setDepth(10);
            this.haz = this.add.circle(0, 0, 10, 0xfff9db, 0.08).setDepth(10.5);
            this.capaCielo = this.add.container(0, 0).setDepth(11);
            this.dibujarFondo();
            var scene = this;
            this.scale.on('resize', function () { scene.dibujarFondo(); scene.radioHecho = -1; });
            this.luz.x = this.scale.width * 0.5;
            this.luz.y = this.scale.height * 0.6;
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.input.on('pointerdown', this.alTocar, this);
            this.input.on('pointermove', function (p) {
                if (!scene.jugando && !scene.demoObj) return;
                if (p.isDown || p.pointerType === 'mouse' || !p.wasTouch) { scene.luz.x = p.worldX; scene.luz.y = p.worldY; }
            });
        },

        shutdown: function () {
            this.tweens.killAll();
            if (sceneRef === this) sceneRef = null;
        },

        horizonte: function () {
            return this.scale.height * 0.5;
        },

        dibujarFondo: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var hz = this.horizonte();
            var g = this.fondo;
            g.clear();
            g.fillStyle(0x15224a, 1);
            g.fillRect(0, 0, w, hz);
            g.fillStyle(0x2b8a3e, 1);
            g.fillRect(0, hz, w, h - hz);
            // Cerca de madera.
            g.fillStyle(0xd9a066, 1);
            for (var x = 0; x < w; x += 46) {
                g.fillRect(x + 4, hz - h * 0.1, 30, h * 0.12);
                g.fillTriangle(x + 4, hz - h * 0.1, x + 34, hz - h * 0.1, x + 19, hz - h * 0.13);
            }
            g.fillRect(0, hz - h * 0.07, w, 10);
            // Casa a la izquierda con ventana encendida, macetas, caseta, árbol.
            g.fillStyle(0xe8590c, 1);
            g.fillRect(w * 0.02, hz - h * 0.28, w * 0.16, h * 0.3);
            g.fillStyle(0xa61e4d, 1);
            g.fillTriangle(0, hz - h * 0.28, w * 0.2, hz - h * 0.28, w * 0.1, hz - h * 0.4);
            g.fillStyle(0xffe066, 1);
            g.fillRect(w * 0.06, hz - h * 0.22, w * 0.05, h * 0.07);
            g.fillStyle(0x8d5524, 1);
            g.fillRect(w * 0.86, hz - h * 0.2, 16, h * 0.22);
            g.fillStyle(0x2f9e44, 1);
            g.fillCircle(w * 0.86 + 8, hz - h * 0.24, h * 0.09);
            g.fillCircle(w * 0.83, hz - h * 0.18, h * 0.06);
            g.fillCircle(w * 0.9, hz - h * 0.18, h * 0.06);
            for (var f = 0; f < 18; f++) {
                var fx = ((f * 61) % 100) / 100 * w;
                var fy = hz + h * 0.05 + ((f * 37) % 100) / 100 * h * 0.42;
                g.fillStyle(FIESTA[f % FIESTA.length], 1);
                g.fillCircle(fx, fy, 5);
                g.fillStyle(0x40c057, 1);
                g.fillTriangle(fx - 7, fy + 12, fx + 7, fy + 12, fx, fy);
            }
            this.titilan.forEach(function (s, i) {
                s.setPosition(((i * 83) % 100) / 100 * w, ((i * 47) % 100) / 100 * hz * 0.85);
            });
            this.luna.setPosition(w * 0.12, h * 0.1).setScale(Math.max(0.8, h / 700));
            var lado = Math.sqrt(w * w + h * h) * 2.2;
            this.oscuridad.setDisplaySize(lado, lado);
            var scene = this;
            this.estrellasCielo.forEach(function (s, i) { var p = scene.puestoEstrella(i); s.setPosition(p.x, p.y); });
        },

        /** Redibuja el agujero de luz cuando cambia el radio. */
        pintarOscuridad: function (radio, alfa) {
            var clave = Math.round(radio) + ':' + alfa;
            if (this.radioHecho === clave) return;
            this.radioHecho = clave;
            var t = this.textures.get(OSCURIDAD);
            var ctx = t.getContext();
            var lado = this.oscuridad.displayWidth || 1;
            var r = (radio / lado) * LIENZO;
            var c = LIENZO / 2;
            ctx.clearRect(0, 0, LIENZO, LIENZO);
            var gr = ctx.createRadialGradient(c, c, r * 0.55, c, c, r * 1.25);
            gr.addColorStop(0, 'rgba(5,10,30,0)');
            gr.addColorStop(1, 'rgba(5,10,30,' + alfa + ')');
            ctx.fillStyle = gr;
            ctx.fillRect(0, 0, LIENZO, LIENZO);
            t.refresh();
        },

        radioLuz: function () {
            var cfg = RONDAS[this.modo] || RONDAS.luna;
            return Math.min(this.scale.width, this.scale.height) * cfg.radio;
        },

        /* ── Cosas del jardín ─────────────────────────────────────── */

        tamCosa: function () {
            return Math.min(this.scale.height * 0.2, this.scale.width * 0.13, 170);
        },

        /** Lugares repartidos en el pasto, lejos del botón de escuchar (abajo al centro). */
        lugares: function (n) {
            var w = this.scale.width;
            var h = this.scale.height;
            var hz = this.horizonte();
            // Repartidas a lo ancho, en dos filas alternadas; cerca del centro, siempre arriba.
            var out = [];
            for (var i = 0; i < n; i++) {
                var x = n === 1 ? w * 0.5 : w * (0.1 + (0.8 / (n - 1)) * i);
                var abajo = i % 2 === 1 && Math.abs(x - w / 2) > w * 0.13;
                out.push({ x: x, y: hz + h * (abajo ? 0.38 : 0.2) });
            }
            return mezclar(out);
        },

        crearCosa: function (id) {
            if (this.cosas[id]) return this.cosas[id];
            var img = this.add.image(-300, 0, tex(id)).setOrigin(0.5, 1).setDepth(5);
            var t = this.tamCosa();
            var esc = Math.min(t / (img.width || 1), t / (img.height || 1));
            img.setScale(esc);
            var c = { id: id, img: img, x: -300, y: 0, esc: esc, size: img.height * esc, ancho: img.width * esc, resaltada: false };
            this.cosas[id] = c;
            return c;
        },

        ponerEn: function (c, x, y) {
            c.x = x;
            c.y = y;
            c.img.setPosition(x, y);
        },

        visibles: function () {
            var scene = this;
            return Object.keys(this.cosas).map(function (id) { return scene.cosas[id]; }).filter(function (c) { return c.img.visible; });
        },

        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.modo = o.modo || 'luna';
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            Object.keys(this.cosas).forEach(function (id) { scene.cosas[id].img.setVisible(false); });
            var lug = this.lugares(o.elementos.length);
            o.elementos.forEach(function (id, i) {
                var c = scene.crearCosa(id);
                c.img.setVisible(true).setAlpha(1).setScale(c.esc);
                c.img.angle = 0;
                c.resaltada = false;
                scene.ponerEn(c, lug[i].x, lug[i].y);
            });
            // La luz arranca lejos del objetivo, del lado contrario.
            var obj = this.cosas[o.objetivo];
            var w = this.scale.width;
            this.luz.x = obj && obj.x < w / 2 ? w * 0.8 : w * 0.2;
            this.luz.y = this.horizonte() + this.scale.height * 0.2;
            this.luz.parpadeo = 1;
            sfx('magia');
            return esperar(this, 500);
        },

        jugar: function () {
            var scene = this;
            this.jugando = true;
            if (this.mover) { this.mover.remove(); this.mover = null; }
            if (this.modo === 'pasos') {
                this.mover = this.time.addEvent({
                    delay: 6500, loop: true, callback: function () {
                        if (!scene.jugando || scene.ocupada) return;
                        scene.cambiarSitios();
                    }
                });
            }
        },

        /** En la oscuridad, las cosas caminan a otro sitio (se oyen pasitos). */
        cambiarSitios: function () {
            var scene = this;
            var vis = this.visibles();
            var lug = this.lugares(vis.length);
            sfx('crujido');
            vis.forEach(function (c, i) {
                var d = lug[i];
                scene.tweens.add({
                    targets: c, x: d.x, y: d.y, duration: reducido() ? 1 : 1200, ease: 'Sine.easeInOut',
                    onUpdate: function () { c.img.setPosition(c.x, c.y); }
                });
            });
        },

        pausar: function () {
            this.jugando = false;
        },

        update: function (time) {
            var scene = this;
            var cfg = RONDAS[this.modo] || RONDAS.luna;
            var r = this.radioLuz();
            // Pila baja: la luz parpadea a ratos.
            if (this.modo === 'pila' && this.jugando && !reducido()) {
                var f = Math.sin(time / 90) > 0.7 && Math.sin(time / 1300) > 0.6 ? 0.55 : 1;
                r *= f;
            }
            var alfa = this.final ? 0.35 : cfg.noche;
            this.pintarOscuridad(r, alfa);
            this.oscuridad.setPosition(this.luz.x, this.luz.y);
            this.haz.setPosition(this.luz.x, this.luz.y).setRadius(r * 0.9);
            this.titilan.forEach(function (s, i) { s.setAlpha(0.4 + 0.6 * Math.abs(Math.sin(time / (700 + i * 37) + i))); });
            this.visibles().forEach(function (c) {
                if (c.resaltada) c.img.setAlpha(0.6 + 0.4 * Math.sin(time / 140));
                else if (c.img.alpha < 1) c.img.setAlpha(1);
            });
            this.estrellasCielo.forEach(function (s, i) { s.setScale(1 + 0.12 * Math.sin(time / 300 + i)); });
        },

        /* ── Toques ───────────────────────────────────────────────── */

        iluminada: function (c) {
            var dx = c.x - this.luz.x;
            var dy = (c.y - c.size / 2) - this.luz.y;
            return Math.sqrt(dx * dx + dy * dy) < this.radioLuz() + Math.max(c.ancho, c.size) * 0.35;
        },

        cosaEn: function (px, py) {
            var lista = this.visibles().sort(function (a, b) { return b.y - a.y; });
            for (var i = 0; i < lista.length; i++) {
                var c = lista[i];
                if (Math.abs(px - c.x) < c.ancho / 2 + 10 && py < c.y + 10 && py > c.y - c.size - 10) return c;
            }
            return null;
        },

        /**
         * Tocar: si lo tocado ya está iluminado, se elige; si no, la linterna salta ahí
         * (en pantallas táctiles el primer toque alumbra y el segundo elige).
         */
        alTocar: function (pointer) {
            if (!this.jugando || this.ocupada || !puedeTocar()) return;
            var c = this.cosaEn(pointer.worldX, pointer.worldY);
            var yaAlumbrada = c && this.iluminada(c);
            this.luz.x = pointer.worldX;
            this.luz.y = pointer.worldY;
            if (c && yaAlumbrada) this.responder(c);
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

        /** 0 (lejos) a 1 (la linterna lo alumbra): el sonido se oye más fuerte de cerca. */
        cercania: function (id) {
            var c = this.cosaDe(id);
            if (!c) return 0;
            var w = this.scale.width;
            var h = this.scale.height;
            var dx = c.x - this.luz.x;
            var dy = (c.y - c.size / 2) - this.luz.y;
            var d = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(w * w + h * h);
            return Phaser.Math.Clamp(1 - d * 1.8, 0, 1);
        },

        /** Pista: el objetivo brilla un instante en la oscuridad. */
        pista: function (id) {
            var c = this.cosaDe(id);
            if (!c) return;
            var halo = this.add.circle(c.x, c.y - c.size / 2, Math.max(c.ancho, c.size) * 0.7, 0xfff3bf, 0.5).setDepth(10.6);
            this.tweens.add({ targets: halo, alpha: 0, scale: 1.4, duration: 1100, onComplete: function () { halo.destroy(); } });
        },

        resaltar: function (id, si) {
            var c = this.cosaDe(id);
            if (c) c.resaltada = !!si;
        },

        /* ── Premio: estrellas en el cielo ───────────────────────── */

        /** Documento: la pandereta se mueve (se sacude) y suena otra vez. */
        celebrar: function (id) {
            var c = this.cosaDe(id) || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!c) return Promise.resolve();
            c.resaltada = false;
            this.luz.x = c.x;
            this.luz.y = c.y - c.size / 2;
            this.chispas(c.x, c.y - c.size / 2, 16);
            if (!reducido()) {
                this.tweens.add({ targets: c.img, angle: { from: -18, to: 18 }, duration: 90, yoyo: true, repeat: 6, onComplete: function () { c.img.angle = 0; } });
                this.tweens.add({ targets: c.img, scale: c.esc * 1.2, duration: 300, yoyo: true });
            }
            return esperar(this, 1300);
        },

        puestoEstrella: function (i) {
            var p = CONSTELACION[i % CONSTELACION.length];
            return { x: this.scale.width * (0.25 + p[0] * 0.5), y: this.scale.height * (0.17 + p[1] * 0.55) };
        },

        /** Una chispa sube de lo encontrado y se vuelve una estrella del cielo. */
        encenderEstrella: function (id) {
            var c = this.cosaDe(id);
            var scene = this;
            var i = this.estrellasCielo.length;
            var p = this.puestoEstrella(i * 2);
            var desde = c ? { x: c.x, y: c.y - c.size / 2 } : { x: this.scale.width / 2, y: this.scale.height / 2 };
            var s = this.add.star(desde.x, desde.y, 5, 7, 16, 0xffe066).setDepth(11);
            return new Promise(function (resolve) {
                sfx('zas');
                scene.tweens.add({
                    targets: s, x: p.x, y: p.y, angle: 360, duration: reducido() ? 1 : 1000, ease: 'Cubic.easeInOut',
                    onComplete: function () {
                        scene.estrellasCielo.push(s);
                        sfx('ding');
                        scene.chispas(p.x, p.y, 8);
                        resolve();
                    }
                });
            });
        },

        /** Final: se enciende la luz del jardín y las estrellas se unen en una constelación. */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.final = true;
            var lineas = this.add.graphics().setDepth(10.9).setAlpha(0);
            lineas.lineStyle(3, 0xfff3bf, 0.8);
            var puntos = CONSTELACION.map(function (q, k) { return scene.puestoEstrella(k); });
            for (var k = 0; k < puntos.length; k++) {
                var a = puntos[k];
                var b = puntos[(k + 1) % puntos.length];
                lineas.lineBetween(a.x, a.y, b.x, b.y);
            }
            // Las estrellas que faltan se encienden todas.
            var usados = this.estrellasCielo.map(function (s, k) { return (k * 2) % CONSTELACION.length; });
            for (var j = 0; j < CONSTELACION.length; j++) {
                if (usados.indexOf(j) === -1) {
                    var s = this.add.star(puntos[j].x, puntos[j].y, 5, 5, 12, 0xffe066).setDepth(11).setScale(0);
                    this.tweens.add({ targets: s, scale: 1, duration: 300, delay: 200 + j * 120, ease: 'Back.easeOut' });
                    this.estrellasCielo.push(s);
                }
            }
            this.tweens.add({ targets: lineas, alpha: 1, duration: 900, delay: 1400 });
            this.luz.x = this.scale.width / 2;
            this.luz.y = this.scale.height / 2;
            this.confeti();
            return esperar(this, 2800);
        },

        /* ── Efectos y utilidades ───────────────────────────────── */

        chispas: function (x, y, n) {
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

        /** Ejemplo guiado: una sola cosa, alumbrada. */
        demo: function (id) {
            var scene = this;
            Object.keys(this.cosas).forEach(function (k) { scene.cosas[k].img.setVisible(false); });
            this.modo = 'luna';
            var c = this.crearCosa(id);
            c.img.setVisible(true);
            this.ponerEn(c, this.scale.width * 0.5, this.horizonte() + this.scale.height * 0.25);
            this.luz.x = c.x;
            this.luz.y = c.y - c.size / 2;
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
            return {
                jugando: this.jugando,
                modo: this.modo,
                ronda: this.ronda,
                objetivo: this.objetivo,
                estrellas: this.estrellasCielo.length,
                luz: { x: Math.round(this.luz.x), y: Math.round(this.luz.y), r: Math.round(this.radioLuz()) },
                cosas: this.visibles().map(function (c) { return { id: c.id, x: Math.round(c.x), y: Math.round(c.y) }; })
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
        var el = doc.getElementById('linterna-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'linterna-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-linterna');
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#0b1730',
            audio: { noAudio: true },
            scene: [EscenaLinterna],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-linterna');
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

    global.PedniaLinterna = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        encenderEstrella: conEscena(function (s, id) { return s.encenderEstrella(id); }),
        pista: conEscena(function (s, id) { s.pista(id); }),
        resaltar: conEscena(function (s, id, si) { s.resaltar(id, si); }),
        cercania: conEscena(function (s, id) { return s.cercania(id); }),
        demo: conEscena(function (s, id) { s.demo(id); }),
        limpiarDemo: conEscena(function (s) { return s.limpiarDemo(); }),
        rectDe: conEscena(function (s, id) { return s.rectDe(id); }),
        panDe: conEscena(function (s, id) { return s.panDe(id); }),
        fiestaFinal: conEscena(function (s) { return s.fiestaFinal(); }),
        estado: conEscena(function (s) { return s.estado(); }),
        destruir: function () {
            sceneRef = null;
            game = null;
            global.document.body.classList.remove('modo-linterna');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
