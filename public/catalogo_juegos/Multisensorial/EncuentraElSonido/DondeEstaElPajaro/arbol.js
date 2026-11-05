/**
 * PedniaArbol — "El árbol de los nidos" (¿Dónde está el pájaro?, 3-4 años) en Phaser 4.2.1.
 *
 * Un árbol grande en medio del prado. El pájaro quiere armar su nido en la copa.
 *   vista → el pájaro en una rama, el perro y la bicicleta en el pasto (reto del documento).
 *   copas → el pájaro y otros vecinos del árbol (gallo, campana, gato) se esconden entre
 *           las hojas. Se toca el montón de hojas de donde viene el canto: las hojas se
 *           sacuden y sale quien estaba ahí.
 *   vuela → igual, pero antes el pájaro vuela de un escondite a otro (seguirlo con los ojos).
 * Premio propio de este juego: aparece una ramita en el pasto; al tocarla el pájaro baja,
 * se la lleva y el nido crece. Al final, del nido salen pichones.
 *
 * Audio, voz y orden de rondas: script.js, mediante callbacks
 *   puedeTocar(), onAcierto(id), onError(id, {pan}), onRamitaLista()
 *
 * API: montar, prepararRonda, jugar, pausar, celebrar, jugarRamita, lanzar,
 *      asomarHojas, resaltar, demo, limpiarDemo, rectDe, panDe, fiestaFinal, estado, destruir.
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
    var HOJAS = [0x51cf66, 0x69db7c, 0x40c057, 0x8ce99a];
    /** Quién vuela (alas) y quién trepa o salta para llegar a su escondite. */
    var VUELAN = { pajaro: true, gallo: true };

    function elemento(id) {
        return (gameConfig && gameConfig.elementos && gameConfig.elementos[id]) || {};
    }

    function tex(id) {
        return 'arbol:' + id;
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
        if (doc.getElementById('arbol-css')) return;
        var css = doc.createElement('style');
        css.id = 'arbol-css';
        css.textContent = [
            '#arbol-canvas{position:fixed;inset:0;z-index:0;touch-action:none}',
            '#arbol-canvas canvas{display:block;width:100% !important;height:100% !important}',
            'body.modo-arbol{background:#a5d8ff !important}',
            'body.modo-arbol #principal{position:relative;z-index:1;pointer-events:none;background:transparent}',
            'body.modo-arbol #principal button,body.modo-arbol .dialogo{pointer-events:auto}',
            'body.modo-arbol .escenario{grid-template-columns:minmax(0,1fr);grid-template-areas:"centro"}',
            'body.modo-arbol .escena{border:0 !important;box-shadow:none !important;background:transparent !important}',
            'body.modo-arbol .parque-fondo,body.modo-arbol #zonas,body.modo-arbol #elementos{display:none !important}',
            'body.modo-arbol .pj{position:fixed;bottom:0;z-index:2;pointer-events:none;--pj-alto:min(22vh,170px)}',
            'body.modo-arbol .pj-zoe{left:6px}',
            'body.modo-arbol .pj-zeus{right:6px}',
            'body.modo-arbol .cabecera{padding-top:8px}'
        ].join('');
        doc.head.appendChild(css);
    }

    var EscenaArbol = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaArbol() {
            Phaser.Scene.call(this, { key: 'EscenaArbol' });
            this.copas = [];
            this.vecinos = {};
            this.nubes = [];
            this.modo = 'vista';
            this.objetivo = null;
            this.jugando = false;
            this.ocupada = false;
            this.ronda = 0;
            this.firma = '';
            this.etapaNido = 0;
            this.demoObj = null;
            this.ramita = null;
        },

        create: function () {
            this.cielo = this.add.graphics().setDepth(-30);
            this.sol = this.add.circle(0, 0, 10, 0xffd43b, 1).setDepth(-29);
            this.fondo = this.add.graphics().setDepth(-25);
            this.tronco = this.add.graphics().setDepth(-2);
            this.copa = this.add.graphics().setDepth(-1);
            this.nido = this.add.graphics().setDepth(6);
            for (var i = 0; i < 3; i++) {
                var n = this.add.container(0, 0).setDepth(-28);
                n.add(this.add.circle(-24, 6, 18, 0xffffff, 0.95));
                n.add(this.add.circle(0, -5, 26, 0xffffff, 0.95));
                n.add(this.add.circle(26, 6, 17, 0xffffff, 0.95));
                n.vel = 7 + i * 4;
                n.base = [0.12, 0.5, 0.85][i];
                n.alto = [0.12, 0.07, 0.17][i];
                this.nubes.push(n);
            }
            this.dibujarTodo();
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.input.on('pointerdown', this.alTocar, this);
            this.scale.on('resize', function () {
                if (this.sys && this.sys.isActive()) this.dibujarTodo();
            }, this);
        },

        shutdown: function () {
            this.tweens.killAll();
            if (sceneRef === this) sceneRef = null;
        },

        /* ── Medidas del árbol (todo sale de aquí, cambia con la pantalla) ── */

        suelo: function () {
            return this.scale.height * 0.84;
        },

        medidas: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var RX = Math.min(w * 0.36, h * 0.66);
            var RY = h * 0.25;
            var cx = w * 0.5;
            var cy = h * 0.36;
            var s = this.suelo();
            var ramaY = cy + RY * 1.05;
            var ramaX = Math.min(RX * 0.95, w * 0.3);
            return {
                w: w, h: h, s: s, RX: RX, RY: RY, cx: cx, cy: cy,
                ramas: [{ x: cx - ramaX, y: ramaY - RY * 0.18 }, { x: cx + ramaX, y: ramaY - RY * 0.18 }],
                pasto: [{ x: w * 0.27, y: s + (h - s) * 0.25 }, { x: w * 0.73, y: s + (h - s) * 0.25 }],
                nido: { x: cx, y: cy - RY * 0.98, R: Math.max(26, RX * 0.16) }
            };
        },

        dibujarTodo: function () {
            this.dibujarFondo();
            this.dibujarArbol();
            this.dibujarNido();
        },

        /* ── Escenario fijo: cielo, colinas, prado y el árbol ── */

        dibujarFondo: function () {
            var m = this.medidas();
            var w = m.w;
            var h = m.h;
            var s = m.s;
            var g = this.cielo;
            g.clear();
            for (var b = 0; b < 20; b++) {
                var c = Phaser.Display.Color.Interpolate.ColorWithColor(
                    Phaser.Display.Color.ValueToColor(0x74c0fc),
                    Phaser.Display.Color.ValueToColor(0xe7f5ff), 100, Math.round(b / 19 * 100));
                g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
                g.fillRect(0, (s / 20) * b - 1, w, s / 20 + 2);
            }
            this.sol.setPosition(w * 0.9, h * 0.16).setRadius(Math.min(w, h) * 0.055);
            this.nubes.forEach(function (n) {
                if (!n.listo) { n.x = w * n.base; n.listo = true; }
                n.y = h * n.alto;
            });
            var f = this.fondo;
            f.clear();
            f.fillStyle(0xb2f2bb, 1);
            f.fillEllipse(w * 0.15, s, w * 0.7, h * 0.36);
            f.fillEllipse(w * 0.88, s, w * 0.7, h * 0.3);
            // Prado.
            f.fillStyle(0x69db7c, 1);
            f.fillRect(0, s - 6, w, h - s + 6);
            f.fillStyle(0x51cf66, 1);
            for (var x = 0; x < w; x += 26) f.fillTriangle(x, s + 2, x + 8, s - 12, x + 16, s + 2);
            // Florecitas.
            var flores = [0xff8787, 0xffd43b, 0xffffff, 0xda77f2];
            for (var i = 0; i < 16; i++) {
                var fx = (w / 16) * (i + 0.5) + Math.sin(i * 7.3) * 18;
                var fy = s + (h - s) * (0.3 + 0.6 * ((i * 37) % 10) / 10);
                if (Math.abs(fx - w / 2) < Math.max(110, w * 0.11)) continue;
                f.fillStyle(flores[i % flores.length], 1);
                for (var p = 0; p < 5; p++) f.fillCircle(fx + Math.cos(p * 1.26) * 5, fy + Math.sin(p * 1.26) * 5, 4);
                f.fillStyle(0xfab005, 1);
                f.fillCircle(fx, fy, 3);
            }
        },

        dibujarArbol: function () {
            var m = this.medidas();
            var t = this.tronco;
            t.clear();
            var anchoT = m.RX * 0.2;
            // Tronco que se ensancha abajo, con raíces.
            t.fillStyle(0x8d5a2b, 1);
            t.fillTriangle(m.cx - anchoT * 0.5, m.cy, m.cx + anchoT * 0.5, m.cy, m.cx - anchoT * 0.75, m.s + 4);
            t.fillTriangle(m.cx + anchoT * 0.5, m.cy, m.cx + anchoT * 0.75, m.s + 4, m.cx - anchoT * 0.75, m.s + 4);
            t.fillEllipse(m.cx, m.s, anchoT * 2.1, anchoT * 0.45);
            t.fillStyle(0x6b4220, 1);
            t.fillRect(m.cx - anchoT * 0.12, m.cy + m.RY * 0.6, anchoT * 0.08, m.RY * 0.7);
            t.fillRect(m.cx + anchoT * 0.2, m.cy + m.RY * 0.9, anchoT * 0.07, m.RY * 0.5);
            // Ramas a los lados (donde se para el pájaro a la vista).
            t.lineStyle(Math.max(8, anchoT * 0.22), 0x8d5a2b, 1);
            m.ramas.forEach(function (r) {
                var dir = r.x < m.cx ? -1 : 1;
                t.beginPath();
                t.moveTo(m.cx + dir * anchoT * 0.3, r.y + m.RY * 0.32);
                t.lineTo(r.x - dir * m.RX * 0.15, r.y + m.RY * 0.04);
                t.lineTo(r.x + dir * m.RX * 0.08, r.y + m.RY * 0.02);
                t.strokePath();
            });
            // Copa: muchas bolas de hojas en óvalo (decorado; los escondites van encima).
            var c = this.copa;
            c.clear();
            var bolas = 26;
            for (var k = 0; k < 2; k++) {
                c.fillStyle(k === 0 ? 0x2b8a3e : 0x37b24d, 1);
                for (var i = 0; i < bolas; i++) {
                    var a = (Math.PI * 2 / bolas) * i;
                    var rr = k === 0 ? 0.86 : 0.62;
                    c.fillCircle(m.cx + Math.cos(a) * m.RX * rr, m.cy + Math.sin(a) * m.RY * rr, m.RY * (k === 0 ? 0.36 : 0.42));
                }
            }
            c.fillStyle(0x37b24d, 1);
            c.fillEllipse(m.cx, m.cy, m.RX * 1.5, m.RY * 1.5);
            // Manzanitas.
            c.fillStyle(0xfa5252, 1);
            [[-0.75, -0.3], [0.8, -0.2], [-0.35, 0.65], [0.45, 0.62], [0.05, -0.62]].forEach(function (p) {
                c.fillCircle(m.cx + p[0] * m.RX, m.cy + p[1] * m.RY, Math.max(5, m.RY * 0.06));
            });
        },

        /** El nido en lo alto de la copa: crece con cada ramita (etapas 0 a 4). */
        dibujarNido: function () {
            var m = this.medidas();
            var n = m.nido;
            var g = this.nido;
            g.clear();
            var e = this.etapaNido;
            var ancho = n.R * (1.3 + e * 0.22);
            var alto = n.R * (0.45 + e * 0.1);
            g.fillStyle(0x6b4220, 1);
            g.fillEllipse(n.x, n.y, ancho, alto);
            g.fillStyle(0x3b2a1a, 1);
            g.fillEllipse(n.x, n.y - alto * 0.22, ancho * 0.72, alto * 0.42);
            g.lineStyle(Math.max(2, n.R * 0.07), 0xa9713a, 1);
            var lineas = 4 + e * 4;
            for (var i = 0; i < lineas; i++) {
                var a = (i / lineas) * Math.PI;
                var x0 = n.x - ancho / 2 + (ancho * i) / lineas;
                var y0 = n.y + Math.sin(a * 3 + i) * alto * 0.2;
                g.lineBetween(x0 - ancho * 0.12, y0 - alto * 0.1, x0 + ancho * 0.18, y0 + alto * 0.18);
            }
            this.nidoInfo = { x: n.x, y: n.y - alto * 0.3, ancho: ancho, alto: alto };
        },

        /* ── Vecinos (pájaro, perro, bicicleta, gallo…) ─────────────── */

        crearVecino: function (id) {
            if (this.vecinos[id]) return this.vecinos[id];
            var img = this.add.image(-200, -200, tex(id)).setOrigin(0.5, 1).setDepth(4).setVisible(false);
            var v = { id: id, img: img, copa: null, estado: 'fuera', escala: 1, size: 80, ancho: 80, respira: false, aleteo: null };
            this.vecinos[id] = v;
            return v;
        },

        /** Tamaño para caber en una caja (ancho y alto). */
        medir: function (v, anchoMax, altoMax) {
            var w = v.img.width || 1;
            var h = v.img.height || 1;
            v.escala = Math.min(anchoMax / w, altoMax / h);
            v.img.setScale(v.escala);
            v.ancho = w * v.escala;
            v.size = h * v.escala;
        },

        tieneAlas: function (id) {
            return this.textures.exists(tex(id) + ':alas');
        },

        /** Alterna alas arriba/abajo (si tiene esa imagen); devuelve la función que lo detiene. */
        aletear: function (v, ms) {
            var scene = this;
            this.pararAleteo(v);
            if (!this.tieneAlas(v.id)) return function () {};
            var arriba = false;
            v.aleteo = this.time.addEvent({
                delay: ms || 110, loop: true,
                callback: function () {
                    arriba = !arriba;
                    v.img.setTexture(arriba ? tex(v.id) + ':alas' : tex(v.id));
                }
            });
            return function () { scene.pararAleteo(v); };
        },

        pararAleteo: function (v) {
            if (v.aleteo) { v.aleteo.remove(); v.aleteo = null; }
            if (v.img && v.img.texture && v.img.texture.key !== tex(v.id)) v.img.setTexture(tex(v.id));
        },

        /**
         * Lleva al vecino a (x, y). Los que vuelan van en arco aleteando; los demás
         * caminan con pasitos (o ruedan, la bicicleta) por el pasto.
         */
        mover: function (v, x, y, ms) {
            var scene = this;
            var x0 = v.img.x;
            var y0 = v.img.y;
            if (Math.abs(x0 - x) < 2 && Math.abs(y0 - y) < 2) return Promise.resolve();
            v.respira = false;
            v.img.setFlipX(x < x0);
            var vuela = !!VUELAN[v.id];
            var dist = Phaser.Math.Distance.Between(x0, y0, x, y);
            var dur = ms || Phaser.Math.Clamp(dist * 1.8, 500, 1500);
            var detener = vuela ? this.aletear(v, 90) : function () {};
            var p = { t: 0 };
            var pasos = Math.max(2, dur / 200);
            var arco = vuela ? Math.min(this.scale.height * 0.18, dist * 0.35) : 0;
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: p, t: 1, duration: reducido() ? 1 : dur, ease: 'Sine.easeInOut',
                    onUpdate: function () {
                        v.img.x = Phaser.Math.Linear(x0, x, p.t);
                        var base = Phaser.Math.Linear(y0, y, p.t);
                        if (vuela) {
                            v.img.y = base - Math.sin(p.t * Math.PI) * arco;
                            v.img.angle = 0;
                        } else {
                            var fase = p.t * Math.PI * pasos;
                            var salto = v.id === 'bicicleta' ? 0.01 : v.id === 'gato' ? 0.12 : 0.05;
                            v.img.y = base - Math.abs(Math.sin(fase)) * v.size * salto;
                            v.img.angle = v.id === 'bicicleta' ? 0 : Math.sin(fase) * 3;
                        }
                    },
                    onComplete: function () {
                        detener();
                        v.img.setPosition(x, y);
                        v.img.angle = 0;
                        v.img.setFlipX(false);
                        v.respira = true;
                        resolve();
                    }
                });
            });
        },

        /* ── Escondites: montones de hojas sobre la copa ─────────────── */

        construirCopas: function (n) {
            var m = this.medidas();
            var firma = n + ':' + m.w + 'x' + m.h;
            if (firma === this.firma) return false;
            this.firma = firma;
            this.copas.forEach(function (c) { c.cont.destroy(); });
            this.copas = [];
            if (!n) return true;
            var pos = n === 3
                ? [[-0.58, 0.12], [0, -0.22], [0.58, 0.12]]
                : [[-0.66, 0.2], [-0.24, -0.3], [0.24, -0.3], [0.66, 0.2]];
            var r = Math.min(m.RX * (n === 3 ? 0.3 : 0.25), m.RY * 0.62);
            var scene = this;
            pos.forEach(function (p, i) {
                var x = m.cx + p[0] * m.RX;
                var y = m.cy + p[1] * m.RY;
                var cont = scene.add.container(x, y).setDepth(5);
                var g = scene.add.graphics();
                // Sombra suave para que se lea como un montón aparte.
                g.fillStyle(0x1b5e20, 0.25);
                g.fillEllipse(0, r * 0.62, r * 2.1, r * 0.5);
                var bolas = [[0, 0, 1], [-0.62, 0.18, 0.7], [0.62, 0.18, 0.7], [-0.32, -0.45, 0.66], [0.34, -0.42, 0.64], [0, 0.42, 0.66]];
                bolas.forEach(function (b, k) {
                    g.fillStyle(HOJAS[(k + i) % HOJAS.length], 1);
                    g.fillCircle(b[0] * r, b[1] * r, b[2] * r * 0.72);
                });
                // Hojitas sueltas en el borde (forma de hoja: elipses inclinadas).
                for (var k = 0; k < 9; k++) {
                    var a = (Math.PI * 2 / 9) * k + i;
                    var hoja = scene.add.ellipse(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.62, r * 0.36, r * 0.18, HOJAS[k % HOJAS.length]);
                    hoja.setRotation(a);
                    cont.add(hoja);
                }
                cont.addAt(g, 0);
                // Brillo para la pista final (invisible hasta entonces).
                var brillo = scene.add.circle(0, 0, r * 1.25, 0xfff3bf, 0);
                cont.addAt(brillo, 0);
                scene.copas.push({ i: i, x: x, y: y, r: r, cont: cont, brillo: brillo, ocupante: null, abierta: false, resaltada: false });
            });
            return true;
        },

        /** Dónde se para quien sale de una copa (los pies hundidos entre las hojas). */
        puntoCopa: function (copa, fuera) {
            return { x: copa.x, y: copa.y + copa.r * (fuera ? -0.15 : 0.55) };
        },

        sacudir: function (copa, fuerte) {
            if (reducido() || !copa) return;
            this.tweens.add({
                targets: copa.cont, angle: { from: -(fuerte ? 7 : 3), to: fuerte ? 7 : 3 },
                duration: fuerte ? 70 : 140, yoyo: true, repeat: fuerte ? 3 : 1,
                onComplete: function () { copa.cont.angle = 0; }
            });
            // Caen algunas hojas.
            var n = fuerte ? 5 : 2;
            for (var i = 0; i < n; i++) {
                var hoja = this.add.ellipse(copa.x + rnd(-copa.r, copa.r), copa.y + copa.r * 0.4, copa.r * 0.22, copa.r * 0.11, HOJAS[i % HOJAS.length]).setDepth(7);
                this.tweens.add({
                    targets: hoja, y: hoja.y + rnd(copa.r * 1.2, copa.r * 2.4), x: hoja.x + rnd(-30, 30), angle: rnd(-200, 200), alpha: 0,
                    duration: rnd(900, 1400), onComplete: (function (o) { return function () { o.destroy(); }; })(hoja)
                });
            }
        },

        /** Esconde al vecino dentro de su copa: baja tras las hojas y desaparece. */
        esconder: function (v) {
            var scene = this;
            var copa = this.copas[v.copa];
            if (!copa) return Promise.resolve();
            var p = this.puntoCopa(copa, false);
            v.img.setDepth(4);
            v.respira = false;
            this.sacudir(copa, false);
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: v.img, x: p.x, y: p.y + v.size * 0.5, duration: reducido() ? 1 : 300, ease: 'Quad.easeIn',
                    onComplete: function () {
                        v.img.setVisible(false);
                        v.estado = 'escondido';
                        copa.abierta = false;
                        resolve();
                    }
                });
            });
        },

        /** Sale de entre las hojas de su copa (queda medio cuerpo entre las hojas). */
        sacar: function (v) {
            var scene = this;
            var copa = this.copas[v.copa];
            if (!copa) return Promise.resolve();
            var p = this.puntoCopa(copa, true);
            this.medirEnCopa(v, copa);
            v.img.setPosition(p.x, p.y + v.size * 0.6).setVisible(true).setAlpha(1).setDepth(4);
            v.img.angle = 0;
            v.img.setFlipX(false);
            copa.abierta = true;
            v.estado = 'fuera';
            this.sacudir(copa, true);
            sfx('crujido');
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: v.img, y: p.y, duration: reducido() ? 1 : 320, ease: 'Back.easeOut',
                    onComplete: function () { v.respira = true; resolve(); }
                });
            });
        },

        medirEnCopa: function (v, copa) {
            this.medir(v, copa.r * 1.5, copa.r * 1.35);
        },

        /* ── Rondas ───────────────────────────────────────────────── */

        /**
         * Reparte a los vecinos. En "vista" van a las ramas y al pasto; en las demás,
         * cada uno llega volando, trepando o saltando a su copa y se esconde.
         */
        prepararRonda: function (o) {
            var scene = this;
            this.jugando = false;
            this.modo = o.modo || 'vista';
            this.ronda = o.ronda || 0;
            this.objetivo = o.objetivo;
            this.ritmo = o.dificultad === '56' ? [1100, 2400] : [1600, 3200];
            var ids = o.elementos.slice();
            var m = this.medidas();

            ids.forEach(function (id) { scene.crearVecino(id); });

            // Los que quedaron escondidos de la ronda anterior salen primero.
            var salidas = Object.keys(this.vecinos).map(function (id) {
                var v = scene.vecinos[id];
                if (v.estado === 'escondido' && scene.copas[v.copa]) return scene.sacar(v);
                return Promise.resolve();
            });

            return Promise.all(salidas).then(function () {
                return esperar(scene, 250);
            }).then(function () {
                if (scene.modo === 'vista') return scene.repartirVista(ids, m);
                return scene.repartirCopas(ids, m);
            });
        },

        /** Reto del documento tal cual: el pájaro en una rama, los otros en el pasto. */
        repartirVista: function (ids, m) {
            var scene = this;
            this.construirCopas(0);
            var rama = m.ramas[Math.random() < 0.5 ? 0 : 1];
            var pasto = mezclar(m.pasto);
            var k = 0;
            return Promise.all(ids.map(function (id, n) {
                var v = scene.vecinos[id];
                var destino;
                if (id === scene.objetivo) {
                    scene.medir(v, m.RX * 0.42, m.RY * 0.5);
                    destino = rama;
                } else {
                    scene.medir(v, m.w * 0.17, (m.h - m.s) * 0.25 + m.h * 0.17);
                    destino = pasto[k++ % pasto.length];
                }
                v.copa = null;
                v.lugar = destino;
                v.img.setDepth(id === scene.objetivo ? 6.5 : 6);
                if (!v.img.visible) {
                    var lado = destino.x < m.w / 2 ? -1 : 1;
                    v.img.setPosition(lado < 0 ? -v.ancho : m.w + v.ancho, VUELAN[id] ? m.h * 0.15 : destino.y).setVisible(true).setAlpha(1);
                }
                return esperar(scene, n * 220).then(function () {
                    sfx('pop');
                    return scene.mover(v, destino.x, destino.y);
                }).then(function () { v.estado = 'fuera'; });
            }));
        },

        /** Cada vecino del árbol va a una copa (el pájaro nunca repite la anterior) y se esconde. */
        repartirCopas: function (ids, m) {
            var scene = this;
            var rehecho = this.construirCopas(ids.length);
            var previa = this.vecinos[this.objetivo] && this.vecinos[this.objetivo].copaPrevia;
            var reparto = null;
            for (var k = 0; k < 20; k++) {
                reparto = mezclar(this.copas.map(function (c) { return c.i; }));
                if (rehecho || previa == null || reparto[ids.indexOf(this.objetivo)] !== previa) break;
            }
            // Los que no juegan esta ronda (el perro, la bicicleta) se quedan en el pasto mirando.
            Object.keys(this.vecinos).forEach(function (id) {
                if (ids.indexOf(id) !== -1) return;
                var v = scene.vecinos[id];
                if (v.lugar && v.img.visible) v.img.setDepth(6);
                else v.img.setVisible(false);
            });
            this.copas.forEach(function (c) { c.ocupante = null; c.resaltada = false; });
            return Promise.all(ids.map(function (id, n) {
                var v = scene.vecinos[id];
                var copa = scene.copas[reparto[n]];
                v.copa = copa.i;
                v.lugar = null;
                copa.ocupante = id;
                var p = scene.puntoCopa(copa, true);
                var entrada;
                if (!v.img.visible) {
                    // Entra desde fuera: los que vuelan por arriba, el gato trepando desde el pasto.
                    var lado = copa.x < m.w / 2 ? -1 : 1;
                    scene.medirEnCopa(v, copa);
                    if (VUELAN[id]) v.img.setPosition(lado < 0 ? -v.ancho : m.w + v.ancho, m.h * 0.1);
                    else if (id === 'gato') v.img.setPosition(m.cx + lado * m.RX * 0.15, m.s);
                    else v.img.setPosition(copa.x, -v.size);
                    v.img.setVisible(true).setAlpha(1).setDepth(6.5);
                    entrada = Promise.resolve();
                } else {
                    entrada = Promise.resolve();
                }
                return entrada.then(function () {
                    return esperar(scene, n * 260);
                }).then(function () {
                    sfx('pop');
                    v.img.setDepth(6.5);
                    var dest = scene.medirAntes(v, copa, p);
                    return scene.mover(v, dest.x, dest.y);
                }).then(function () {
                    return scene.esconder(v);
                });
            })).then(function () {
                if (scene.modo !== 'vuela') return undefined;
                return scene.vuelos();
            });
        },

        /** Ajusta el tamaño al de la copa de destino antes de ir allá. */
        medirAntes: function (v, copa, p) {
            this.medirEnCopa(v, copa);
            return p;
        },

        /**
         * Modo "vuela": el pájaro sale y salta de copa en copa, a la vista, antes de quedarse
         * en una. Las otras copas también se mueven (viento) para que no sea solo mirar.
         */
        vuelos: function () {
            var scene = this;
            var v = this.vecinos[this.objetivo];
            if (!v || this.copas.length < 2) return Promise.resolve();
            var saltos = 2 + (Math.random() < 0.5 ? 1 : 0);
            var cadena = esperar(scene, 500);
            for (var k = 0; k < saltos; k++) {
                cadena = cadena.then(function () {
                    var actual = scene.copas[v.copa];
                    var libres = scene.copas.filter(function (c) { return c.i !== v.copa; });
                    var nueva = libres[Math.floor(Math.random() * libres.length)];
                    // Intercambia con quien estaba en la nueva copa (sigue escondido).
                    var otro = nueva.ocupante;
                    nueva.ocupante = v.id;
                    actual.ocupante = otro;
                    if (otro) scene.vecinos[otro].copa = actual.i;
                    return scene.sacar(v).then(function () {
                        v.copa = nueva.i;
                        var p = scene.puntoCopa(nueva, true);
                        v.img.setDepth(6.5);
                        if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir('trino', { breve: true, vol: 0.5, pan: scene.panX(nueva.x) });
                        return scene.mover(v, p.x, p.y, 700);
                    }).then(function () {
                        scene.copas.forEach(function (c) { if (c.i !== nueva.i && Math.random() < 0.5) scene.sacudir(c, false); });
                        return scene.esconder(v);
                    }).then(function () { return esperar(scene, 250); });
                });
            }
            return cadena;
        },

        jugar: function () {
            var ahora = this.time.now;
            this.proxViento = ahora + rnd(900, 1800);
            this.jugando = true;
        },

        pausar: function () {
            this.jugando = false;
        },

        update: function (time, delta) {
            var w = this.scale.width;
            var dt = delta / 1000;
            var scene = this;
            this.nubes.forEach(function (n) {
                n.x += n.vel * dt;
                if (n.x > w + 80) n.x = -80;
            });
            this.copas.forEach(function (c) {
                if (c.resaltada) {
                    c.brillo.setFillStyle(0xfff3bf, 0.35 + 0.25 * Math.sin(time / 150));
                    c.cont.setScale(1 + 0.04 * Math.sin(time / 150));
                } else {
                    c.brillo.setFillStyle(0xfff3bf, 0);
                    if (c.cont.scale !== 1) c.cont.setScale(1);
                }
            });
            if (this.ramitaInvita && this.ramita) this.ramita.setScale(1 + 0.1 * Math.sin(time / 120));
            // Quietos, respiran (no parecen pegados).
            if (!reducido()) {
                Object.keys(this.vecinos).forEach(function (id) {
                    var v = scene.vecinos[id];
                    if (v.respira && v.img.visible && !v.aleteo) v.img.setScale(v.escala, v.escala * (1 + 0.03 * Math.sin(time / 360 + v.size)));
                });
            }
            if (!this.jugando || this.modo === 'vista' || !this.copas.length) return;
            // El viento mueve copas al azar: así no basta con mirar, hay que escuchar.
            if (time > this.proxViento) {
                var c = this.copas[Math.floor(Math.random() * this.copas.length)];
                if (!c.abierta) this.sacudir(c, false);
                this.proxViento = time + rnd(this.ritmo[0], this.ritmo[1]);
            }
        },

        /** Pista: quien está escondido asoma la cabeza un momento entre las hojas. */
        asomarHojas: function (id) {
            var v = this.vecinos[id];
            if (!v || v.estado !== 'escondido') return;
            var copa = this.copas[v.copa];
            if (!copa || copa.abierta || v.asomando) return;
            var scene = this;
            var p = this.puntoCopa(copa, false);
            this.medirEnCopa(v, copa);
            v.asomando = true;
            v.img.setPosition(p.x, p.y + v.size * 0.5).setVisible(true).setDepth(4);
            this.sacudir(copa, false);
            this.tweens.add({
                targets: v.img, y: p.y - copa.r * 0.15, duration: 280, ease: 'Back.easeOut',
                onComplete: function () {
                    scene.time.delayedCall(1100, function () {
                        scene.tweens.add({
                            targets: v.img, y: p.y + v.size * 0.5, duration: 220,
                            onComplete: function () {
                                v.asomando = false;
                                if (v.estado === 'escondido') v.img.setVisible(false);
                            }
                        });
                    });
                }
            });
        },

        resaltar: function (id, si) {
            var v = this.vecinos[id];
            if (v && v.copa != null && this.copas[v.copa]) this.copas[v.copa].resaltada = !!si;
        },

        /* ── Toques ───────────────────────────────────────────────── */

        alTocar: function (pointer) {
            var px = pointer.worldX;
            var py = pointer.worldY;
            if (this.ramitaInvita && this.ramita &&
                Phaser.Math.Distance.Between(px, py, this.ramita.x, this.ramita.y) < Math.max(60, this.ramita.largo * 0.8)) {
                this.lanzar();
                return;
            }
            if (!this.jugando || this.ocupada || !puedeTocar()) return;
            var scene = this;
            if (this.modo === 'vista') {
                var tocado = null;
                Object.keys(this.vecinos).forEach(function (id) {
                    var v = scene.vecinos[id];
                    if (!v.img.visible || tocado) return;
                    var anchoT = Math.max(v.ancho, 70);
                    var altoT = Math.max(v.size, 70);
                    if (Math.abs(px - v.img.x) < anchoT * 0.6 && py < v.img.y + 12 && py > v.img.y - altoT - 12) tocado = v;
                });
                if (tocado) this.responder(tocado);
                return;
            }
            var mejor = null;
            var dMin = Infinity;
            this.copas.forEach(function (c) {
                var d = Phaser.Math.Distance.Between(px, py, c.x, c.y);
                if (d < c.r * 1.15 && d < dMin) { dMin = d; mejor = c; }
            });
            if (mejor) this.tocarCopa(mejor);
        },

        /** Las hojas se sacuden y sale quien está escondido ahí. */
        tocarCopa: function (copa) {
            var scene = this;
            if (copa.abierta || !copa.ocupante) return;
            var v = this.vecinos[copa.ocupante];
            if (!v) return;
            this.ocupada = true;
            this.sacar(v).then(function () { scene.responder(v); });
        },

        responder: function (v) {
            var scene = this;
            if (v.id === this.objetivo) {
                this.jugando = false;
                this.ocupada = false;
                avisar('onAcierto', v.id);
                return;
            }
            // No era: se mueve, suena como es y vuelve a esconderse.
            this.ocupada = true;
            if (!reducido()) {
                this.tweens.add({ targets: v.img, angle: { from: -10, to: 10 }, duration: 90, yoyo: true, repeat: 4, onComplete: function () { v.img.angle = 0; } });
            }
            avisar('onError', v.id, { pan: this.panDe(v.id) });
            this.time.delayedCall(1700, function () {
                if (scene.modo === 'vista' || v.copa == null) {
                    scene.ocupada = false;
                    return;
                }
                scene.esconder(v).then(function () { scene.ocupada = false; });
            });
        },

        /* ── Premio: la ramita y el nido ─────────────────────────── */

        celebrar: function (id) {
            var v = this.vecinos[id] || (this.demoObj && this.demoObj.id === id ? this.demoObj : null);
            if (!v) return Promise.resolve();
            var scene = this;
            this.estrellas(v.img.x, v.img.y - v.size / 2, 18);
            v.img.setDepth(8);
            // El documento: el pájaro mueve las alas.
            var detener = this.aletear(v, 100);
            if (!reducido()) {
                this.tweens.add({ targets: v.img, y: v.img.y - v.size * 0.4, duration: 260, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
            }
            return esperar(scene, 1400).then(function () { detener(); });
        },

        /** Aparece una ramita en el pasto; el niño la toca y el pájaro se la lleva al nido. */
        jugarRamita: function () {
            var scene = this;
            var m = this.medidas();
            var x = Math.random() < 0.5 ? m.w * 0.36 : m.w * 0.64;
            var y = m.s + (m.h - m.s) * 0.45;
            var largo = Math.max(60, Math.min(m.w, m.h) * 0.11);
            var r = this.add.container(x, y).setDepth(9);
            var g = this.add.graphics();
            g.lineStyle(Math.max(5, largo * 0.09), 0x8d5a2b, 1);
            g.lineBetween(-largo / 2, largo * 0.08, largo / 2, -largo * 0.08);
            g.lineBetween(-largo * 0.05, 0, largo * 0.18, -largo * 0.28);
            g.lineBetween(largo * 0.15, -largo * 0.03, largo * 0.32, largo * 0.18);
            g.fillStyle(0x51cf66, 1);
            g.fillEllipse(largo * 0.2, -largo * 0.32, largo * 0.22, largo * 0.12);
            g.fillEllipse(largo * 0.35, largo * 0.22, largo * 0.2, largo * 0.11);
            r.add(g);
            r.largo = largo;
            r.setScale(0);
            this.tweens.add({ targets: r, scale: 1, duration: 300, ease: 'Back.easeOut' });
            this.ramita = r;
            this.ramitaInvita = true;
            avisar('onRamitaLista');
            return new Promise(function (resolve) {
                scene.alTraer = resolve;
                scene.autoLanzar = scene.time.delayedCall(6500, function () { scene.lanzar(); });
            });
        },

        /** El pájaro baja, toma la ramita en el pico y la lleva al nido, que crece. */
        lanzar: function () {
            var scene = this;
            if (!this.ramitaInvita) return;
            this.ramitaInvita = false;
            if (this.autoLanzar) this.autoLanzar.remove();
            var v = this.vecinos[this.objetivo];
            var r = this.ramita;
            r.setScale(1);
            sfx('pop');
            if (!v) {
                r.destroy();
                if (this.alTraer) { var f = this.alTraer; this.alTraer = null; f(); }
                return;
            }
            var m = this.medidas();
            if (v.copa != null && this.copas[v.copa]) this.copas[v.copa].abierta = false;
            v.img.setDepth(9.5);
            v.img.setVisible(true);
            var sigue = null;
            this.mover(v, r.x - v.ancho * 0.1, r.y + r.largo * 0.1, 800).then(function () {
                if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir('trino', { breve: true, pan: scene.panX(v.img.x) });
                // La ramita va en el pico.
                sigue = scene.time.addEvent({
                    delay: 16, loop: true,
                    callback: function () {
                        r.setPosition(v.img.x + (v.img.flipX ? -1 : 1) * v.ancho * 0.42, v.img.y - v.size * 0.62);
                        r.setScale(0.7);
                    }
                });
                var n = scene.nidoInfo || { x: m.nido.x, y: m.nido.y };
                return scene.mover(v, n.x + v.ancho * 0.15, n.y + 4, 1000);
            }).then(function () {
                if (sigue) sigue.remove();
                r.destroy();
                scene.ramita = null;
                scene.etapaNido = Math.min(4, scene.etapaNido + 1);
                scene.dibujarNido();
                sfx('recompensa');
                var n = scene.nidoInfo;
                scene.estrellas(n.x, n.y, 10);
                v.copaPrevia = v.copa;
                v.copa = null;
                v.estado = 'nido';
                v.lugar = { x: v.img.x, y: v.img.y };
                if (!reducido()) scene.tweens.add({ targets: v.img, angle: { from: -6, to: 6 }, duration: 110, yoyo: true, repeat: 3, onComplete: function () { v.img.angle = 0; } });
                return esperar(scene, 800);
            }).then(function () {
                if (scene.alTraer) { var f2 = scene.alTraer; scene.alTraer = null; f2(); }
            });
        },

        /** Final: todos salen de las hojas y del nido nacen pichones que pían. */
        fiestaFinal: function () {
            var scene = this;
            this.jugando = false;
            Object.keys(this.vecinos).forEach(function (id, i) {
                var v = scene.vecinos[id];
                scene.time.delayedCall(i * 180, function () {
                    if (v.estado === 'escondido' && scene.copas[v.copa]) scene.sacar(v);
                    if (v.img.visible && !reducido()) scene.tweens.add({ targets: v.img, y: v.img.y - v.size * 0.25, duration: 240, yoyo: true, repeat: 3, delay: 350 });
                });
            });
            var n = this.nidoInfo;
            if (n) {
                var R = n.ancho * 0.16;
                [-1, 0, 1].forEach(function (k, i) {
                    var x = n.x + k * R * 1.5;
                    var y = n.y - R * 0.2;
                    var huevo = scene.add.ellipse(x, y, R * 1.3, R * 1.7, 0xfff9db).setDepth(6.2).setStrokeStyle(2, 0xe9d8a6);
                    scene.time.delayedCall(500 + i * 350, function () {
                        if (!reducido()) scene.tweens.add({ targets: huevo, angle: { from: -15, to: 15 }, duration: 90, yoyo: true, repeat: 3 });
                    });
                    scene.time.delayedCall(1300 + i * 350, function () {
                        huevo.destroy();
                        var pichon = scene.add.container(x, y).setDepth(6.3);
                        pichon.add(scene.add.circle(0, 0, R * 0.85, 0xffe066));
                        pichon.add(scene.add.circle(R * 0.28, -R * 0.18, R * 0.14, 0x212529));
                        pichon.add(scene.add.triangle(R * 0.7, R * 0.05, 0, -R * 0.2, R * 0.45, 0, 0, R * 0.2, 0xff922b));
                        if (global.EncuentraSonidoSfx) global.EncuentraSonidoSfx.reproducir('trino', { breve: true, vol: 0.6, pan: (k * 0.4) });
                        if (!reducido()) scene.tweens.add({ targets: pichon, y: y - R * 0.6, duration: 220, yoyo: true, repeat: 5 });
                        scene.estrellas(x, y, 6);
                    });
                });
            }
            this.confeti();
            return esperar(this, 3200);
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

        /** Ejemplo guiado: el vecino de la demo en el pasto, a la vista. */
        demo: function (id) {
            var m = this.medidas();
            this.construirCopas(0);
            var v = this.crearVecino(id);
            this.medir(v, m.w * 0.18, (m.h - m.s) * 0.25 + m.h * 0.18);
            var p = m.pasto[0];
            v.img.setPosition(p.x, p.y).setVisible(true).setAlpha(1).setDepth(6);
            v.lugar = p;
            v.respira = true;
            v.estado = 'fuera';
            this.modo = 'vista';
            this.demoObj = v;
        },

        limpiarDemo: function () {
            var v = this.demoObj;
            if (!v) return Promise.resolve();
            this.demoObj = null;
            v.img.setVisible(false);
            v.lugar = null;
            v.estado = 'fuera';
            v.respira = false;
            return Promise.resolve();
        },

        rectDe: function (id) {
            var v = this.vecinos[id];
            if (!v) return null;
            var r = this.game.canvas.getBoundingClientRect();
            var sx = r.width / this.scale.width;
            var sy = r.height / this.scale.height;
            var x = v.img.x;
            var yc = v.img.y - v.size / 2;
            var ancho = v.ancho || v.size;
            var alto = v.size;
            if (v.estado === 'escondido' && this.copas[v.copa]) {
                var c = this.copas[v.copa];
                x = c.x; yc = c.y; ancho = c.r * 2; alto = c.r * 2;
            }
            return {
                x: r.left + x * sx,
                y: r.top + yc * sy,
                left: r.left + (x - ancho / 2) * sx,
                top: r.top + (yc - alto / 2) * sy,
                width: ancho * sx,
                height: alto * sy
            };
        },

        panX: function (x) {
            return Phaser.Math.Clamp((x / this.scale.width) * 2 - 1, -1, 1) * 0.85;
        },

        panDe: function (id) {
            var v = this.vecinos[id];
            if (!v) return 0;
            var x = v.copa != null && this.copas[v.copa] ? this.copas[v.copa].x : v.img.x;
            return this.panX(x);
        },

        estado: function () {
            var scene = this;
            return {
                jugando: this.jugando,
                modo: this.modo,
                ronda: this.ronda,
                objetivo: this.objetivo,
                nido: this.etapaNido,
                ramita: !!this.ramitaInvita,
                ramitaXY: this.ramita ? { x: this.ramita.x, y: this.ramita.y } : null,
                copas: this.copas.map(function (c) {
                    return { x: c.x, y: c.y, r: c.r, ocupante: c.ocupante, abierta: c.abierta };
                }),
                vecinos: Object.keys(this.vecinos).map(function (id) {
                    var v = scene.vecinos[id];
                    return { id: id, estado: v.estado, copa: v.copa, x: v.img.x, y: v.img.y, size: v.size, ancho: v.ancho, visible: v.img.visible };
                })
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
        var el = doc.getElementById('arbol-canvas');
        if (!el) {
            el = doc.createElement('div');
            el.id = 'arbol-canvas';
            doc.body.insertBefore(el, doc.body.firstChild);
        }
        doc.body.classList.add('modo-arbol');
        Host.destruirIntro();
        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: global.innerWidth || 1024,
            height: global.innerHeight || 640,
            backgroundColor: '#a5d8ff',
            audio: { noAudio: true },
            scene: [EscenaArbol],
            scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
        });
        if (!game) {
            doc.body.classList.remove('modo-arbol');
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

    global.PedniaArbol = {
        montar: montar,
        listo: function () { return !!(game && sceneRef); },
        prepararRonda: conEscena(function (s, o) { return s.prepararRonda(o); }),
        jugar: conEscena(function (s) { s.jugar(); }),
        pausar: conEscena(function (s) { s.pausar(); }),
        celebrar: conEscena(function (s, id) { return s.celebrar(id); }),
        jugarRamita: conEscena(function (s) { return s.jugarRamita(); }),
        lanzar: conEscena(function (s) { s.lanzar(); }),
        asomarHojas: conEscena(function (s, id) { s.asomarHojas(id); }),
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
            global.document.body.classList.remove('modo-arbol');
            if (Host) Host.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
