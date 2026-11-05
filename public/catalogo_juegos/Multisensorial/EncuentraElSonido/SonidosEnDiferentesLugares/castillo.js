/**
 * PedniaCastillo — "El castillo de las 4 ventanas" (Sonidos en diferentes lugares, 5-6 años)
 * en Phaser 4.2.1.
 *
 * El documento divide el escenario en zonas (arriba, abajo, izquierda, derecha). Aquí son
 * las 4 ventanas de un castillo: dos arriba en las torres y dos abajo en el muro. En cada
 * una hay un instrumento; el sonido llega desde su lado y se toca su ventana.
 *   abiertas → las 4 ventanas abiertas (reto del documento).
 *   postigos → los postigos se cierran y se abren de a uno, un momento.
 *   cambio   → los instrumentos saltan de una ventana a otra.
 *   noche    → de noche y todo cerrado: solo guía el oído.
 * Premio propio de este juego: cada hallazgo iza una bandera en una de las 4 torres; al
 * final baja el puente levadizo y hay fuegos artificiales.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan})
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, izarBandera, pista, resaltar,
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
    var BANDERAS = [0xe03131, 0x1c7ed6, 0xf59f00, 0x2f9e44];
    var ZONAS = ['arribaIzq', 'arribaDer', 'abajoIzq', 'abajoDer'];

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'castillo:' + id;
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
        if (doc.getElementById('castillo-css')) return;
        var css = doc.createElement('style');
        css.id = 'castillo-css';
        css.textContent = [
            '#castillo-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#castillo-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-castillo{background:#a5d8ff !important}',
            'body.modo-castillo #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-castillo #principal button,body.modo-castillo .dialogo{pointer-events:auto}',
            'body.modo-castillo .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-castillo .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-castillo .parque-fondo,body.modo-castillo #zonas,body.modo-castillo #elementos{display:none !important}',
            'body.modo-castillo .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(20vh,160px)}',
            'body.modo-castillo .pj-zoe{left:6px}',
            'body.modo-castillo .pj-zeus{right:6px}',
            'body.modo-castillo .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaCastillo = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaCastillo() {
            Phaser.Scene.call(this, { key: 'EscenaCastillo' });
            this.ventanas = [];
            this.musicos = {};
            this.banderas = [];
            this.modo = 'abiertas';
            this.objetivo = null;
            this.jugando = false;
            this.ronda = 0;
            this.demoObj = null;
        },

        create: function () {
            this.cielo = this.add.graphics().setDepth(-30);
            this.estrellasNoche = this.add.graphics().setDepth(-29).setAlpha(0);
            this.muro = this.add.graphics().setDepth(-10);
            this.puente = this.add.graphics().setDepth(-9);
            this.noche = this.add.rectangle(0, 0, 10, 10, 0x0b1730, 0).setOrigin(0).setDepth(8);
            this.dibujar();
            var scene = this;
            this.scale.on('resize', function () { scene.dibujar(); scene.reubicar(); });
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

        /** Medidas del castillo (centrado, sobre el foso). */
        medidas: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var base = h * 0.84;
            var ancho = Math.min(w * 0.66, h * 1.1);
            var cx = w / 2;
            var torreW = ancho * 0.24;
            var torreH = h * 0.44;
            var muroH = h * 0.33;
            return {
                w: w, h: h, base: base, cx: cx, ancho: ancho, torreW: torreW, torreH: torreH, muroH: muroH,
                izq: cx - ancho / 2, der: cx + ancho / 2
            };
        },

        dibujar: function () {
            var m = this.medidas();
            var w = m.w;
            var h = m.h;
            var g = this.cielo;
            g.clear();
            g.fillStyle(0x74c0fc, 1);
            g.fillRect(0, 0, w, h);
            g.fillStyle(0xa5d8ff, 1);
            g.fillRect(0, h * 0.4, w, h * 0.3);
            g.fillStyle(0x8ce99a, 1);
            g.fillEllipse(w * 0.15, h * 0.8, w * 0.6, h * 0.3);
            g.fillEllipse(w * 0.85, h * 0.8, w * 0.6, h * 0.3);
            g.fillStyle(0x51cf66, 1);
            g.fillRect(0, m.base, w, h - m.base);
            // Foso.
            g.fillStyle(0x339af0, 1);
            g.fillRect(m.izq - 30, m.base, m.ancho + 60, h * 0.05);
            var e = this.estrellasNoche;
            e.clear();
            e.fillStyle(0xffffff, 1);
            for (var s = 0; s < 40; s++) e.fillCircle(((s * 83) % 100) / 100 * w, ((s * 41) % 100) / 100 * h * 0.45, 1.5 + (s % 3) * 0.6);
            this.noche.setSize(w, h);

            // Castillo: muro central, dos torres grandes a los lados y dos torrecitas al centro.
            var c = this.muro;
            c.clear();
            var piedra = 0xced4da;
            var sombra = 0xadb5bd;
            var muroTop = m.base - m.muroH;
            c.fillStyle(piedra, 1);
            c.fillRect(m.izq + m.torreW * 0.8, muroTop, m.ancho - m.torreW * 1.6, m.muroH);
            // Almenas del muro.
            var nA = 8;
            var aw = (m.ancho - m.torreW * 1.6) / (nA * 2 - 1);
            for (var i = 0; i < nA; i++) c.fillRect(m.izq + m.torreW * 0.8 + i * aw * 2, muroTop - aw * 0.8, aw, aw * 0.8);
            // Torrecitas centrales (2 de las 4 torres).
            var tcW = m.torreW * 0.55;
            var tcH = m.muroH * 0.55;
            this.puntas = [];
            [m.cx - m.ancho * 0.14, m.cx + m.ancho * 0.14].forEach(function (tx) {
                c.fillStyle(piedra, 1);
                c.fillRect(tx - tcW / 2, muroTop - tcH, tcW, tcH);
                c.fillStyle(0x7048e8, 1);
                c.fillTriangle(tx - tcW / 2 - 8, muroTop - tcH, tx + tcW / 2 + 8, muroTop - tcH, tx, muroTop - tcH - tcW * 0.7);
            });
            // Torres grandes.
            var scene = this;
            var tops = [];
            [m.izq, m.der - m.torreW].forEach(function (tx) {
                var tTop = m.base - m.torreH;
                c.fillStyle(piedra, 1);
                c.fillRect(tx, tTop, m.torreW, m.torreH);
                c.fillStyle(sombra, 1);
                c.fillRect(tx + m.torreW - 8, tTop, 8, m.torreH);
                c.fillStyle(0xe03131, 1);
                c.fillTriangle(tx - 10, tTop, tx + m.torreW + 10, tTop, tx + m.torreW / 2, tTop - m.torreW * 0.6);
                tops.push({ x: tx + m.torreW / 2, y: tTop - m.torreW * 0.6 });
            });
            // Puntas en orden izquierda → derecha: torre izq, torrecita izq, torrecita der, torre der.
            this.puntas = [tops[0],
                { x: m.cx - m.ancho * 0.14, y: muroTop - tcH - tcW * 0.7 },
                { x: m.cx + m.ancho * 0.14, y: muroTop - tcH - tcW * 0.7 },
                tops[1]];
            // Ladrillos sugeridos.
            c.lineStyle(2, sombra, 0.6);
            for (var by = muroTop + 24; by < m.base; by += 26) {
                c.lineBetween(m.izq + m.torreW * 0.8, by, m.der - m.torreW * 0.8, by);
            }
            // Puerta con puente levadizo (abajo al centro).
            this.dibujarPuente(this.puenteBajo ? 1 : 0);
            this.banderas.forEach(function (b, k) { var p = scene.puntas[k]; b.setPosition(p.x, p.y); });
        },

        dibujarPuente: function (t) {
            var m = this.medidas();
            var p = this.puente;
            p.clear();
            var pw = m.ancho * 0.16;
            var ph = m.muroH * 0.5;
            p.fillStyle(0x495057, 1);
            p.fillRoundedRect(m.cx - pw / 2, m.base - ph, pw, ph, { tl: pw / 2, tr: pw / 2, bl: 0, br: 0 });
            // Tablones: de pie (cerrado) a acostado (abierto).
            var largo = ph * (1 - t) + m.h * 0.06 * t;
            p.fillStyle(0x8d5524, 1);
            if (t < 1) p.fillRect(m.cx - pw / 2, m.base - largo, pw, largo);
            else p.fillRect(m.cx - pw / 2, m.base, pw, m.h * 0.06);
            p.lineStyle(2, 0x5c3d1e, 1);
            for (var k = 1; k < 4; k++) p.lineBetween(m.cx - pw / 2 + (pw / 4) * k, m.base - (t < 1 ? largo : 0), m.cx - pw / 2 + (pw / 4) * k, m.base + (t < 1 ? 0 : m.h * 0.06));
        },

        /** Centro de cada ventana (zona): arriba en las torres, abajo en el muro. */
        posZona: function (z) {
            var m = this.medidas();
            var arriba = m.base - m.torreH + m.torreH * 0.3;
            var abajo = m.base - m.muroH * 0.48;
            var xi = m.izq + m.torreW / 2;
            var xd = m.der - m.torreW / 2;
            var xbi = m.cx - m.ancho * 0.24;
            var xbd = m.cx + m.ancho * 0.24;
            return {
                arribaIzq: { x: xi, y: arriba }, arribaDer: { x: xd, y: arriba },
                abajoIzq: { x: xbi, y: abajo }, abajoDer: { x: xbd, y: abajo }
            }[z];
        },

        tamVentana: function () {
            var m = this.medidas();
            return { w: m.torreW * 0.78, h: Math.min(m.torreW * 0.95, m.muroH * 0.62) };
        },

        crearVentanas: function () {
            var scene = this;
            if (this.ventanas.length) return;
            ZONAS.forEach(function (z, i) {
                var cont = scene.add.container(0, 0).setDepth(2);
                var marco = scene.add.graphics();
                var fondo = scene.add.graphics();
                var luz = scene.add.rectangle(0, 0, 10, 10, 0xffe066, 0);
                var izq = scene.add.graphics();
                var der = scene.add.graphics();
                cont.add([fondo, luz, marco]);
                var postigos = scene.add.container(0, 0).setDepth(4);
                postigos.add([izq, der]);
                scene.ventanas.push({ zona: z, i: i, cont: cont, fondo: fondo, marco: marco, luz: luz, izq: izq, der: der, postigos: postigos, cerrada: false, ocupante: null, abriendo: 0, resaltada: false });
            });
            this.reubicar();
        },

        dibujarVentana: function (v) {
            var p = this.posZona(v.zona);
            var t = this.tamVentana();
            v.x = p.x;
            v.y = p.y;
            v.w = t.w;
            v.h = t.h;
            v.cont.setPosition(p.x, p.y);
            v.postigos.setPosition(p.x, p.y);
            v.fondo.clear();
            v.fondo.fillStyle(0x343a40, 1);
            v.fondo.fillRoundedRect(-t.w / 2, -t.h / 2, t.w, t.h, { tl: t.w / 2, tr: t.w / 2, bl: 4, br: 4 });
            v.luz.setSize(t.w - 8, t.h - 8);
            v.marco.clear();
            v.marco.lineStyle(6, 0x868e96, 1);
            v.marco.strokeRoundedRect(-t.w / 2, -t.h / 2, t.w, t.h, { tl: t.w / 2, tr: t.w / 2, bl: 4, br: 4 });
            v.marco.fillStyle(0x868e96, 1);
            v.marco.fillRect(-t.w / 2 - 8, t.h / 2 - 2, t.w + 16, 10);
            // Postigos: dos hojas de madera que giran sobre las bisagras.
            [v.izq, v.der].forEach(function (g, k) {
                g.clear();
                g.fillStyle(0xa9713c, 1);
                g.fillRect(k ? 0 : -t.w / 2, -t.h / 2 + t.w * 0.18, t.w / 2, t.h - t.w * 0.18);
                g.lineStyle(3, 0x7f4f24, 1);
                for (var q = 1; q < 4; q++) g.lineBetween(k ? 0 : -t.w / 2, -t.h / 2 + t.w * 0.18 + q * (t.h - t.w * 0.18) / 4, k ? t.w / 2 : 0, -t.h / 2 + t.w * 0.18 + q * (t.h - t.w * 0.18) / 4);
                g.x = k ? 0 : 0;
            });
            v.izq.x = 0;
            v.der.x = 0;
        },

        reubicar: function () {
            var scene = this;
            this.ventanas.forEach(function (v) {
                scene.dibujarVentana(v);
                var mu = v.ocupante && scene.musicos[v.ocupante];
                if (mu) scene.sentarEn(mu, v, true);
            });
        },

        /** Abre o cierra los postigos (escala de cada hoja hacia su bisagra). */
        postigar: function (v, cerrar, ms) {
            v.cerrada = cerrar;
            var t = this.tamVentana();
            var dur = reducido() ? 1 : (ms || 260);
            // Hoja izquierda: gira sobre su borde izquierdo; derecha: sobre su borde derecho.
            this.tweens.add({ targets: v.izq, scaleX: cerrar ? 1 : 0.08, x: cerrar ? 0 : -t.w / 2 * 0.92, duration: dur });
            this.tweens.add({ targets: v.der, scaleX: cerrar ? 1 : 0.08, x: cerrar ? 0 : t.w / 2 * 0.92, duration: dur });
        },

        /* ── Músicos ──────────────────────────────────────────────── */

        crearMusico: function (id) {
            if (this.musicos[id]) return this.musicos[id];
            var img = this.add.image(-300, -300, tex(id)).setDepth(3);
            var mu = { id: id, img: img, ventana: null, esc: 1 };
            this.musicos[id] = mu;
            return mu;
        },

        sentarEn: function (mu, v, sinMover) {
            var t = this.tamVentana();
            var caja = Math.min(t.w, t.h) * 0.82;
            mu.esc = Math.min(caja / (mu.img.width || 1), caja / (mu.img.height || 1));
            mu.img.setScale(mu.esc);
            mu.ventana = v;
            v.ocupante = mu.id;
            if (sinMover !== false) mu.img.setPosition(v.x, v.y + t.h * 0.08);
        },

        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.modo = o.modo || 'abiertas';
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            this.crearVentanas();
            this.tweens.add({ targets: this.noche, fillAlpha: this.modo === 'noche' ? 0.55 : 0, duration: 800 });
            this.tweens.add({ targets: this.estrellasNoche, alpha: this.modo === 'noche' ? 1 : 0, duration: 800 });
            var ids = o.elementos.slice(0, 4);
            // Cada ronda el objetivo cambia de ventana (el documento: cambiar la ubicación).
            var previa = this.musicos[o.objetivo] && this.musicos[o.objetivo].ventana ? this.musicos[o.objetivo].ventana.i : -1;
            var orden;
            for (var k = 0; k < 20; k++) {
                orden = mezclar([0, 1, 2, 3]);
                if (orden[ids.indexOf(o.objetivo)] !== previa) break;
            }
            Object.keys(this.musicos).forEach(function (id) { if (ids.indexOf(id) === -1) scene.musicos[id].img.setVisible(false); });
            this.ventanas.forEach(function (v) { v.ocupante = null; v.luz.fillAlpha = 0; v.resaltada = false; });
            // Primero se cierran, se reparten adentro y luego se abren (o no, según el modo).
            this.ventanas.forEach(function (v) { scene.postigar(v, true, 200); });
            return esperar(this, 260).then(function () {
                ids.forEach(function (id, n) {
                    var mu = scene.crearMusico(id);
                    mu.img.setVisible(true).clearTint().setAlpha(1);
                    mu.img.angle = 0;
                    scene.sentarEn(mu, scene.ventanas[orden[n]]);
                });
                var abrir = scene.modo === 'abiertas' || scene.modo === 'cambio';
                if (abrir) {
                    scene.ventanas.forEach(function (v, i) { scene.time.delayedCall(i * 150, function () { sfx('pop'); scene.postigar(v, false); }); });
                }
                return esperar(scene, abrir ? 900 : 300);
            });
        },

        jugar: function () {
            var scene = this;
            this.jugando = true;
            if (this.evento) { this.evento.remove(); this.evento = null; }
            if (this.modo === 'postigos') {
                // Se abre una ventana al azar un momento y se vuelve a cerrar.
                this.evento = this.time.addEvent({
                    delay: 1700, loop: true, callback: function () {
                        if (!scene.jugando || scene.ocupada) return;
                        var cerradas = scene.ventanas.filter(function (v) { return v.cerrada && !v.abiertaPorToque; });
                        if (!cerradas.length) return;
                        var v = cerradas[Math.floor(Math.random() * cerradas.length)];
                        scene.postigar(v, false);
                        scene.time.delayedCall(1100, function () { if (scene.jugando && !v.abiertaPorToque) scene.postigar(v, true); });
                    }
                });
            }
            if (this.modo === 'cambio') {
                this.evento = this.time.addEvent({
                    delay: 6000, loop: true, callback: function () {
                        if (!scene.jugando || scene.ocupada) return;
                        scene.intercambiar();
                    }
                });
                this.time.delayedCall(1200, function () { if (scene.jugando) scene.intercambiar(); });
            }
        },

        /** El objetivo salta a otra ventana y quien estaba ahí, a la suya (se ve el salto). */
        intercambiar: function () {
            var scene = this;
            var a = this.musicos[this.objetivo];
            if (!a || !a.ventana) return;
            var otras = this.ventanas.filter(function (v) { return v !== a.ventana; });
            var vb = otras[Math.floor(Math.random() * otras.length)];
            var b = this.musicos[vb.ocupante];
            var va = a.ventana;
            sfx('zas');
            [[a, vb], [b, va]].forEach(function (par) {
                var mu = par[0];
                var v = par[1];
                if (!mu) return;
                var desde = { x: mu.img.x, y: mu.img.y };
                var t = { k: 0 };
                var hasta = { x: v.x, y: v.y + scene.tamVentana().h * 0.08 };
                scene.tweens.add({
                    targets: t, k: 1, duration: reducido() ? 1 : 900, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        mu.img.x = Phaser.Math.Linear(desde.x, hasta.x, t.k);
                        mu.img.y = Phaser.Math.Linear(desde.y, hasta.y, t.k) - Math.sin(t.k * Math.PI) * scene.scale.height * 0.15;
                        mu.img.setDepth(t.k > 0 && t.k < 1 ? 7 : 3);
                    }
                });
                mu.ventana = v;
                v.ocupante = mu.id;
            });
        },

        pausar: function () {
            this.jugando = false;
        },

        update: function (time) {
            var scene = this;
            this.ventanas.forEach(function (v) {
                if (v.resaltada) v.luz.fillAlpha = 0.35 + 0.3 * Math.sin(time / 140);
                else if (!v.encendida) v.luz.fillAlpha = 0;
            });
            this.banderas.forEach(function (b, k) { b.bandera.scaleX = 0.85 + 0.15 * Math.sin(time / 180 + k); });
            Object.keys(this.musicos).forEach(function (id) {
                var mu = scene.musicos[id];
                if (scene.jugando && mu.img.visible && !reducido() && mu.ventana && !mu.saltando) mu.img.angle = Math.sin(time / 500 + id.length) * 3;
            });
        },

        /* ── Toques ───────────────────────────────────────────────── */

        alTocar: function (pointer) {
            if (!this.jugando || this.ocupada || !puedeTocar()) return;
            var px = pointer.worldX;
            var py = pointer.worldY;
            for (var i = 0; i < this.ventanas.length; i++) {
                var v = this.ventanas[i];
                if (Math.abs(px - v.x) < v.w / 2 + 12 && Math.abs(py - v.y) < v.h / 2 + 12) {
                    this.responder(v);
                    return;
                }
            }
        },

        responder: function (v) {
            var scene = this;
            if (v.cerrada) { v.abiertaPorToque = true; sfx('puerta'); this.postigar(v, false); }
            var id = v.ocupante;
            if (!id) return;
            if (id === this.objetivo) {
                this.jugando = false;
                avisar('onAcierto', id);
                return;
            }
            this.ocupada = true;
            var mu = this.musicos[id];
            if (mu && !reducido()) this.tweens.add({ targets: mu.img, angle: { from: -15, to: 15 }, duration: 100, yoyo: true, repeat: 3, onComplete: function () { mu.img.angle = 0; } });
            avisar('onError', id, { pan: this.panDe(id) });
            this.time.delayedCall(1500, function () {
                scene.ocupada = false;
                v.abiertaPorToque = false;
                if (scene.jugando && (scene.modo === 'postigos' || scene.modo === 'noche')) scene.postigar(v, true);
            });
        },

        ventanaDe: function (id) {
            var mu = this.musicos[id];
            return mu && mu.img.visible ? mu.ventana : null;
        },

        /** Pista: los postigos de la ventana del objetivo tiemblan. */
        pista: function (id) {
            var v = this.ventanaDe(id);
            if (!v || reducido()) return;
            this.tweens.add({ targets: v.postigos, x: v.x + 5, duration: 60, yoyo: true, repeat: 5, onComplete: function () { v.postigos.x = v.x; } });
            if (!v.cerrada) {
                var mu = this.musicos[id];
                this.tweens.add({ targets: mu.img, scale: mu.esc * 1.15, duration: 160, yoyo: true, repeat: 1 });
            }
        },

        resaltar: function (id, si) {
            var v = this.ventanaDe(id);
            if (v) v.resaltada = !!si;
        },

        /* ── Premio: banderas en las torres ──────────────────────── */

        /** Documento: la campana se ilumina y suena; animación de confirmación. */
        celebrar: function (id) {
            var mu = this.musicos[id];
            var v = this.ventanaDe(id) || (this.demoObj && this.demoObj.id === id ? this.demoObj.ventana : null);
            if (!mu || !v) return Promise.resolve();
            if (this.evento) { this.evento.remove(); this.evento = null; }
            v.resaltada = false;
            if (v.cerrada) this.postigar(v, false);
            v.encendida = true;
            v.luz.fillAlpha = 0.85;
            this.tweens.add({ targets: v.luz, fillAlpha: 0.2, duration: 300, yoyo: true, repeat: 3 });
            var halo = this.add.circle(v.x, v.y, Math.max(v.w, v.h) * 0.8, 0xffe066, 0.45).setDepth(6);
            this.tweens.add({ targets: halo, scale: 1.6, alpha: 0, duration: 1100, onComplete: function () { halo.destroy(); } });
            this.chispas(v.x, v.y, 16);
            if (!reducido()) this.tweens.add({ targets: mu.img, angle: { from: -20, to: 20 }, duration: 120, yoyo: true, repeat: 4, onComplete: function () { mu.img.angle = 0; } });
            var scene = this;
            return esperar(this, 1300).then(function () { v.encendida = false; scene.tweens.add({ targets: v.luz, fillAlpha: 0, duration: 300 }); });
        },

        /** Una bandera sube por el mástil de la torre que toca. */
        izarBandera: function () {
            var scene = this;
            var k = this.banderas.length;
            var p = this.puntas[k % this.puntas.length];
            var m = this.medidas();
            var alto = m.h * 0.09;
            var c = this.add.container(p.x, p.y).setDepth(-8);
            var mastil = this.add.rectangle(0, 0, 4, alto, 0x495057).setOrigin(0.5, 1);
            var bandera = this.add.triangle(2, -alto * 0.15, 0, 0, alto * 0.6, alto * 0.2, 0, alto * 0.4, BANDERAS[k % BANDERAS.length]).setOrigin(0, 1);
            c.add([mastil, bandera]);
            c.bandera = bandera;
            this.banderas.push(c);
            bandera.y = 0;
            return new Promise(function (resolve) {
                sfx('magia');
                scene.tweens.add({
                    targets: bandera, y: -alto * 0.6, duration: reducido() ? 1 : 900, ease: 'Sine.easeOut',
                    onComplete: function () {
                        sfx('ding');
                        scene.chispas(p.x, p.y - alto * 0.7, 8);
                        resolve();
                    }
                });
            });
        },

        /** Final: amanece, baja el puente levadizo y hay fuegos artificiales. */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            this.tweens.add({ targets: this.noche, fillAlpha: 0, duration: 600 });
            this.tweens.add({ targets: this.estrellasNoche, alpha: 0, duration: 600 });
            this.ventanas.forEach(function (v) { scene.postigar(v, false); });
            var t = { k: 0 };
            sfx('puerta');
            this.tweens.add({
                targets: t, k: 1, duration: reducido() ? 1 : 1000, ease: 'Bounce.easeOut',
                onUpdate: function () { scene.dibujarPuente(t.k); },
                onComplete: function () { scene.puenteBajo = true; }
            });
            var m = this.medidas();
            for (var f = 0; f < 5; f++) {
                (function (n) {
                    scene.time.delayedCall(300 + n * 380, function () { scene.chispas(m.izq + rnd(0, m.ancho), m.h * rnd(0.1, 0.3), 18); sfx('pop'); });
                })(f);
            }
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

        /** Ejemplo guiado: el elemento de la demo en una ventana abierta. */
        demo: function (id) {
            var scene = this;
            this.crearVentanas();
            this.ventanas.forEach(function (v) { v.ocupante = null; scene.postigar(v, true, 1); });
            var mu = this.crearMusico(id);
            mu.img.setVisible(true);
            var v = this.ventanas[1];
            this.sentarEn(mu, v);
            this.postigar(v, false, 1);
            this.demoObj = mu;
        },

        limpiarDemo: function () {
            var mu = this.demoObj;
            this.demoObj = null;
            if (mu) { mu.img.setVisible(false); if (mu.ventana) mu.ventana.ocupante = null; mu.ventana = null; }
            return Promise.resolve();
        },

        rectDe: function (id) {
            var v = this.ventanaDe(id);
            if (!v) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            return {
                x: r.left + v.x * sx,
                y: r.top + v.y * sy,
                left: r.left + (v.x - v.w / 2) * sx,
                top: r.top + (v.y - v.h / 2) * sy,
                width: v.w * sx,
                height: v.h * sy
            };
        },

        /** Izquierda o derecha según la ventana (las de abajo suenan un poco más al centro). */
        panDe: function (id) {
            var v = this.ventanaDe(id);
            if (!v) return 0;
            return Phaser.Math.Clamp((v.x / this.scale.width) * 2 - 1, -1, 1) * 0.9;
        },

        estado: function () {
            var scene = this;
            return {
                jugando: this.jugando,
                modo: this.modo,
                ronda: this.ronda,
                objetivo: this.objetivo,
                banderas: this.banderas.length,
                ventanas: this.ventanas.map(function (v) { return { zona: v.zona, ocupante: v.ocupante, cerrada: v.cerrada }; }),
                musicos: Object.keys(this.musicos).filter(function (id) { return scene.musicos[id].img.visible; })
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
        var el = doc.getElementById('castillo-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'castillo-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-castillo');
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#a5d8ff',
            audio: { noAudio: true },
            scene: [EscenaCastillo],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-castillo');
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

    global.PedniaCastillo = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        izarBandera: conEscena(function (s) { return s.izarBandera(); }),
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
            global.document.body.classList.remove('modo-castillo');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
