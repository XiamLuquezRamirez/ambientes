/**
 * PedniaOrquesta — "La orquesta" (Encuentra el sonido entre distractores, 5-6 años) en
 * Phaser 4.2.1.
 *
 * Un escenario con telón y atriles; en cada atril, un instrumento. Todos son de la misma
 * familia (el documento: distractores parecidos). Cada ronda suenan más a la vez y hay
 * que reconocer las maracas dentro de la mezcla:
 *   solo  → solo suenan las maracas (reto del documento).
 *   duo   → las maracas y otro instrumento a la vez.
 *   trio  → tres a la vez; sube un instrumento más al escenario.
 *   tutti → toda la orquesta; antes los instrumentos cambian de atril.
 * Premio propio de este juego: cada hallazgo pone una nota dorada en el pentagrama; al
 * final la orquesta toca y el público aplaude.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 * El script pregunta coro() para saber quiénes suenan junto al objetivo.
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, ponerNota, coro, pista, resaltar,
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
    var PIEL = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'orquesta:' + id;
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
        if (doc.getElementById('orquesta-css')) return;
        var css = doc.createElement('style');
        css.id = 'orquesta-css';
        css.textContent = [
            '#orquesta-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#orquesta-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-orquesta{background:#5f1d2c !important}',
            'body.modo-orquesta #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-orquesta #principal button,body.modo-orquesta .dialogo{pointer-events:auto}',
            'body.modo-orquesta .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-orquesta .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-orquesta .parque-fondo,body.modo-orquesta #zonas,body.modo-orquesta #elementos{display:none !important}',
            'body.modo-orquesta .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(20vh,160px)}',
            'body.modo-orquesta .pj-zoe{left:6px}',
            'body.modo-orquesta .pj-zeus{right:6px}',
            'body.modo-orquesta .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaOrquesta = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaOrquesta() {
            Phaser.Scene.call(this, { key: 'EscenaOrquesta' });
            this.atriles = [];
            this.instr = {};
            this.notas = [];
            this.publico = [];
            this.coroIds = [];
            this.modo = 'solo';
            this.objetivo = null;
            this.jugando = false;
            this.ronda = 0;
            this.demoObj = null;
        },

        create: function () {
            this.fondo = this.add.graphics().setDepth(-30);
            this.pentagrama = this.add.graphics().setDepth(-5);
            this.telonIzq = this.add.graphics().setDepth(15);
            this.telonDer = this.add.graphics().setDepth(15);
            this.foco = this.add.ellipse(0, 0, 10, 10, 0xfff3bf, 0).setDepth(-2);
            for (var i = 0; i < 22; i++) {
                var c = this.add.container(0, 0).setDepth(16);
                c.add(this.add.ellipse(0, 12, 34, 30, 0x2b1a2e));
                c.add(this.add.circle(0, -6, 13, 0x3b2440));
                c.fase = Math.random() * 6;
                this.publico.push(c);
            }
            this.dibujar();
            var scene = this;
            this.scale.on('resize', function () { scene.dibujar(); scene.ubicarAtriles(); });
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

        piso: function () { return this.scale.height * 0.74; },

        dibujar: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var p = this.piso();
            var g = this.fondo;
            g.clear();
            // Pared del teatro y piso de madera del escenario.
            g.fillStyle(0x3b1726, 1);
            g.fillRect(0, 0, w, h);
            g.fillStyle(0x4a1d31, 1);
            for (var x = 0; x < w; x += 60) g.fillRect(x, 0, 30, p);
            g.fillStyle(0xb5651d, 1);
            g.fillRect(0, p, w, h - p);
            g.fillStyle(0x9c5518, 1);
            for (var y = p + 14; y < h; y += 18) g.fillRect(0, y, w, 3);
            g.fillStyle(0x5c2d0a, 1);
            g.fillRect(0, p, w, 8);
            // Bambalina arriba.
            g.fillStyle(0xc92a2a, 1);
            g.fillRect(0, 0, w, h * 0.07);
            for (var k = 0; k < w; k += 40) g.fillTriangle(k, h * 0.07, k + 40, h * 0.07, k + 20, h * 0.1);
            g.fillStyle(0xfcc419, 1);
            g.fillRect(0, h * 0.065, w, 4);
            this.foco.setPosition(w / 2, p).setSize(w * 0.9, h * 0.12);
            this.dibujarTelones(this.telonAbierto === undefined ? 1 : this.telonAbierto);
            this.dibujarPentagrama();
            var scene = this;
            this.publico.forEach(function (c, i) {
                c.x = (w / scene.publico.length) * (i + 0.5);
                c.base = h - 4 + (i % 2) * 6;
                c.y = c.base;
                c.setScale(Math.max(0.9, h / 700));
            });
        },

        /** Telones: t = 1 abiertos (recogidos a los lados), 0 cerrados. */
        dibujarTelones: function (t) {
            this.telonAbierto = t;
            var w = this.scale.width;
            var h = this.scale.height;
            var ancho = w * (0.08 + (1 - t) * 0.44);
            [this.telonIzq, this.telonDer].forEach(function (g, k) {
                g.clear();
                g.fillStyle(0xc92a2a, 1);
                var x0 = k ? w - ancho : 0;
                g.fillRect(x0, 0, ancho, h);
                g.fillStyle(0xa61e4d, 1);
                for (var f = 0; f < ancho; f += 22) g.fillRect(x0 + f, 0, 8, h);
                g.fillStyle(0xfcc419, 1);
                g.fillRect(k ? x0 : ancho - 6, 0, 6, h);
            });
        },

        /** Pentagrama arriba al centro: ahí se ponen las notas doradas. */
        dibujarPentagrama: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var g = this.pentagrama;
            g.clear();
            var x0 = w * 0.3;
            var x1 = w * 0.7;
            var y0 = h * 0.24;
            var sep = h * 0.018;
            this.penta = { x0: x0, x1: x1, y0: y0, sep: sep };
            g.fillStyle(0xfff9db, 0.92);
            g.fillRoundedRect(x0 - 20, y0 - sep * 2, x1 - x0 + 40, sep * 8, 10);
            g.lineStyle(2, 0x495057, 1);
            for (var i = 0; i < 5; i++) g.lineBetween(x0, y0 + i * sep, x1, y0 + i * sep);
            var scene = this;
            this.notas.forEach(function (n, k) { var q = scene.puestoNota(k); n.setPosition(q.x, q.y); });
        },

        puestoNota: function (k) {
            var p = this.penta;
            var alturas = [3, 1, 2, 0, 2, 4];
            return { x: p.x0 + (p.x1 - p.x0) * (0.15 + k * 0.22), y: p.y0 + alturas[k % alturas.length] * p.sep };
        },

        /* ── Atriles e instrumentos ───────────────────────────────── */

        tamInstr: function () {
            return Math.min(this.scale.height * 0.19, this.scale.width * 0.12, 160);
        },

        ubicarAtriles: function () {
            var w = this.scale.width;
            var p = this.piso();
            var n = this.atriles.length;
            var scene = this;
            // En semicírculo: los de los lados un poco más adelante.
            this.atriles.forEach(function (a, i) {
                var t = n === 1 ? 0.5 : i / (n - 1);
                a.x = w * (0.18 + 0.64 * t);
                a.y = p - scene.scale.height * 0.02 - Math.sin(t * Math.PI) * scene.scale.height * 0.07;
                scene.dibujarAtril(a);
                var ins = a.ocupante && scene.instr[a.ocupante];
                if (ins) scene.ponerEnAtril(ins, a);
            });
        },

        dibujarAtril: function (a) {
            var g = a.g;
            var t = this.tamInstr();
            g.clear();
            g.fillStyle(0x212529, 1);
            g.fillRect(a.x - 3, a.y - t * 0.55, 6, t * 0.55);
            g.fillRect(a.x - t * 0.25, a.y - 4, t * 0.5, 6);
            g.fillStyle(0x343a40, 1);
            g.fillRect(a.x - t * 0.42, a.y - t * 0.62, t * 0.84, 10);
            a.top = a.y - t * 0.6;
        },

        crearAtriles: function (n) {
            var scene = this;
            while (this.atriles.length < n) {
                var a = { i: this.atriles.length, g: this.add.graphics().setDepth(1), ocupante: null, resaltado: false };
                this.atriles.push(a);
            }
            while (this.atriles.length > n) {
                var b = this.atriles.pop();
                b.g.destroy();
            }
            this.atriles.forEach(function (a) { a.ocupante = null; });
            this.ubicarAtriles();
            void scene;
        },

        crearInstr: function (id) {
            if (this.instr[id]) return this.instr[id];
            var img = this.add.image(-300, 0, tex(id)).setOrigin(0.5, 1).setDepth(3);
            var t = this.tamInstr();
            var esc = Math.min(t / (img.width || 1), t / (img.height || 1));
            img.setScale(esc);
            var brillo = this.add.circle(-300, 0, t * 0.65, 0xffe066, 0).setDepth(2);
            var ins = { id: id, img: img, brillo: brillo, esc: esc, atril: null, size: img.height * esc, ancho: img.width * esc, resaltado: false, fase: Math.random() * 6 };
            this.instr[id] = ins;
            return ins;
        },

        ponerEnAtril: function (ins, a) {
            var t = this.tamInstr();
            ins.esc = Math.min(t / (ins.img.width || 1), t / (ins.img.height || 1));
            ins.img.setScale(ins.esc);
            ins.size = ins.img.height * ins.esc;
            ins.ancho = ins.img.width * ins.esc;
            ins.atril = a;
            a.ocupante = ins.id;
            ins.img.setPosition(a.x, a.top);
            ins.brillo.setPosition(a.x, a.top - ins.size / 2).setRadius(t * 0.65);
        },

        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.modo = o.modo || 'solo';
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            this.coroIds = (o.coro || []).slice();
            var ids = mezclar(o.elementos);
            Object.keys(this.instr).forEach(function (id) { if (ids.indexOf(id) === -1) { scene.instr[id].img.setVisible(false); scene.instr[id].brillo.fillAlpha = 0; } });
            // El telón se cierra, se acomoda la orquesta y se abre.
            return this.telon(0).then(function () {
                scene.crearAtriles(ids.length);
                ids.forEach(function (id, i) {
                    var ins = scene.crearInstr(id);
                    ins.img.setVisible(true).setAlpha(1);
                    ins.img.angle = 0;
                    ins.resaltado = false;
                    scene.ponerEnAtril(ins, scene.atriles[i]);
                });
                return scene.telon(1);
            }).then(function () {
                if (scene.modo === 'tutti') return scene.rotar();
                return null;
            });
        },

        telon: function (t) {
            var scene = this;
            var desde = this.telonAbierto === undefined ? 1 : this.telonAbierto;
            if (Math.abs(desde - t) < 0.01) return Promise.resolve();
            var v = { k: desde };
            if (t === 0) sfx('zas');
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: v, k: t, duration: reducido() ? 1 : 650, ease: 'Sine.easeInOut',
                    onUpdate: function () { scene.dibujarTelones(v.k); },
                    onComplete: resolve
                });
            });
        },

        /** Tutti: los instrumentos dan una vuelta y quedan en otros atriles. */
        rotar: function () {
            var scene = this;
            var ocupantes = this.atriles.map(function (a) { return a.ocupante; });
            var nuevos = ocupantes.slice(1).concat(ocupantes.slice(0, 1));
            sfx('magia');
            return Promise.all(nuevos.map(function (id, i) {
                var ins = scene.instr[id];
                var a = scene.atriles[i];
                var desde = { x: ins.img.x, y: ins.img.y };
                var t = { k: 0 };
                return new Promise(function (r) {
                    scene.tweens.add({
                        targets: t, k: 1, duration: reducido() ? 1 : 1000, ease: 'Sine.easeInOut',
                        onUpdate: function () {
                            ins.img.x = Phaser.Math.Linear(desde.x, a.x, t.k);
                            ins.img.y = Phaser.Math.Linear(desde.y, a.top, t.k) - Math.sin(t.k * Math.PI) * scene.scale.height * 0.12;
                        },
                        onComplete: function () { scene.ponerEnAtril(ins, a); r(); }
                    });
                });
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
            Object.keys(this.instr).forEach(function (id) {
                var ins = scene.instr[id];
                if (!ins.img.visible) return;
                ins.brillo.fillAlpha = ins.resaltado ? 0.25 + 0.2 * Math.sin(time / 140) : (ins.encendido ? ins.brillo.fillAlpha : 0);
                if (scene.fiesta && !reducido()) {
                    ins.img.y = (ins.atril ? ins.atril.top : ins.img.y) - Math.abs(Math.sin(time / 230 + ins.fase)) * 14;
                    ins.img.angle = Math.sin(time / 230 + ins.fase) * 8;
                }
            });
            this.publico.forEach(function (c) {
                c.y = c.base - (scene.fiesta && !reducido() ? Math.abs(Math.sin(time / 180 + c.fase)) * 10 : 0);
            });
            this.foco.fillAlpha = this.focoEn ? 0.25 : 0.08;
            this.notas.forEach(function (n, k) { n.angle = Math.sin(time / 400 + k) * 6; });
        },

        /* ── Toques ───────────────────────────────────────────────── */

        alTocar: function (pointer) {
            if (!this.jugando || this.ocupada || !puedeTocar()) return;
            var px = pointer.worldX;
            var py = pointer.worldY;
            var scene = this;
            var lista = Object.keys(this.instr).map(function (id) { return scene.instr[id]; }).filter(function (i) { return i.img.visible && i.atril; });
            for (var k = 0; k < lista.length; k++) {
                var ins = lista[k];
                var a = ins.atril;
                if (Math.abs(px - a.x) < Math.max(ins.ancho, this.tamInstr() * 0.7) / 2 + 10 && py > a.top - ins.size - 10 && py < a.y + 10) {
                    this.responder(ins);
                    return;
                }
            }
        },

        responder: function (ins) {
            var scene = this;
            if (ins.id === this.objetivo) {
                this.jugando = false;
                avisar('onAcierto', ins.id);
                return;
            }
            this.ocupada = true;
            if (!reducido()) this.tweens.add({ targets: ins.img, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 3, onComplete: function () { ins.img.angle = 0; } });
            avisar('onError', ins.id, { pan: this.panDe(ins.id) });
            this.time.delayedCall(1300, function () { scene.ocupada = false; });
        },

        instrDe: function (id) {
            var i = this.instr[id];
            return i && i.img.visible ? i : null;
        },

        /** Quiénes suenan junto al objetivo en esta ronda (los elige el script). */
        coro: function () {
            return this.coroIds.slice();
        },

        /** Pista: el atril del objetivo se ilumina un instante. */
        pista: function (id) {
            var ins = this.instrDe(id);
            if (!ins) return;
            ins.encendido = true;
            ins.brillo.fillAlpha = 0.5;
            var scene = this;
            this.tweens.add({ targets: ins.brillo, fillAlpha: 0, duration: 1100, onComplete: function () { ins.encendido = false; void scene; } });
        },

        resaltar: function (id, si) {
            var ins = this.instrDe(id);
            if (ins) ins.resaltado = !!si;
        },

        /* ── Premio: notas doradas en el pentagrama ──────────────── */

        /** Documento: las maracas hacen una animación (se sacuden) y suenan otra vez. */
        celebrar: function (id) {
            var ins = this.instrDe(id) || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!ins) return Promise.resolve();
            ins.resaltado = false;
            var a = ins.atril;
            this.focoEn = true;
            this.foco.setPosition(a.x, a.y).setSize(this.tamInstr() * 2.2, this.scale.height * 0.08);
            this.chispas(a.x, a.top - ins.size / 2, 16);
            if (!reducido()) {
                this.tweens.add({ targets: ins.img, angle: { from: -22, to: 22 }, duration: 80, yoyo: true, repeat: 7, onComplete: function () { ins.img.angle = 0; } });
                this.tweens.add({ targets: ins.img, scale: ins.esc * 1.25, duration: 300, yoyo: true });
            }
            var scene = this;
            return esperar(this, 1300).then(function () {
                scene.focoEn = false;
                scene.foco.setPosition(scene.scale.width / 2, scene.piso()).setSize(scene.scale.width * 0.9, scene.scale.height * 0.12);
            });
        },

        /** Una nota dorada sale del instrumento y se posa en el pentagrama. */
        ponerNota: function (id) {
            var ins = this.instrDe(id);
            var scene = this;
            var k = this.notas.length;
            var q = this.puestoNota(k);
            var desde = ins ? { x: ins.atril.x, y: ins.atril.top - ins.size / 2 } : { x: this.scale.width / 2, y: this.scale.height / 2 };
            var n = this.add.text(desde.x, desde.y, '♪', {
                fontFamily: 'Arial', fontSize: Math.round(this.scale.height * 0.07) + 'px', color: '#f59f00', stroke: '#ffffff', strokeThickness: 4
            }).setOrigin(0.5, 0.75).setDepth(6);
            return new Promise(function (resolve) {
                sfx('zas');
                scene.tweens.add({
                    targets: n, x: q.x, y: q.y, duration: reducido() ? 1 : 900, ease: 'Cubic.easeInOut',
                    onComplete: function () {
                        scene.notas.push(n);
                        sfx('ding');
                        scene.chispas(q.x, q.y, 8);
                        resolve();
                    }
                });
            });
        },

        /** Final: la orquesta toca, el público aplaude y el telón saluda. */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.fiesta = true;
            sfx('aplausos');
            this.notas.forEach(function (n, k) {
                if (!reducido()) scene.tweens.add({ targets: n, scale: 1.4, duration: 200, yoyo: true, repeat: 3, delay: k * 150 });
            });
            this.confeti();
            return esperar(this, 2600).then(function () {
                scene.fiesta = false;
                Object.keys(scene.instr).forEach(function (id) { var i = scene.instr[id]; if (i.atril) { i.img.y = i.atril.top; i.img.angle = 0; } });
            });
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

        /** Ejemplo guiado: un solo instrumento en el escenario. */
        demo: function (id) {
            var scene = this;
            Object.keys(this.instr).forEach(function (k) { scene.instr[k].img.setVisible(false); });
            this.crearAtriles(1);
            var ins = this.crearInstr(id);
            ins.img.setVisible(true);
            this.ponerEnAtril(ins, this.atriles[0]);
            this.demoObj = ins;
        },

        limpiarDemo: function () {
            var ins = this.demoObj;
            this.demoObj = null;
            if (ins) ins.img.setVisible(false);
            return Promise.resolve();
        },

        rectDe: function (id) {
            var ins = this.instrDe(id);
            if (!ins || !ins.atril) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            var a = ins.atril;
            return {
                x: r.left + a.x * sx,
                y: r.top + (a.top - ins.size / 2) * sy,
                left: r.left + (a.x - ins.ancho / 2) * sx,
                top: r.top + (a.top - ins.size) * sy,
                width: ins.ancho * sx,
                height: ins.size * sy
            };
        },

        panDe: function (id) {
            var ins = this.instrDe(id);
            if (!ins || !ins.atril) return 0;
            return Phaser.Math.Clamp((ins.atril.x / this.scale.width) * 2 - 1, -1, 1) * 0.85;
        },

        estado: function () {
            var scene = this;
            return {
                jugando: this.jugando,
                modo: this.modo,
                ronda: this.ronda,
                objetivo: this.objetivo,
                coro: this.coroIds,
                notas: this.notas.length,
                atriles: this.atriles.map(function (a) { return a.ocupante; }),
                visibles: Object.keys(this.instr).filter(function (id) { return scene.instr[id].img.visible; })
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
        var el = doc.getElementById('orquesta-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'orquesta-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-orquesta');
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#3b1726',
            audio: { noAudio: true },
            scene: [EscenaOrquesta],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-orquesta');
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

    global.PedniaOrquesta = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        ponerNota: conEscena(function (s, id) { return s.ponerNota(id); }),
        coro: conEscena(function (s) { return s.coro(); }),
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
            global.document.body.classList.remove('modo-orquesta');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
