/**
 * PedniaEncuentraColorPhaser — tablero de toque en Phaser 4.2.1.
 * Shell (edad, TTS, Swal, escenas) sigue en script.js.
 * Animación de sprites: Phaser.Tweens (no GSAP en canvas).
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
    var loadedKeys = Object.create(null);

    function metaObj(id) {
        return (gameConfig && gameConfig.objetos && gameConfig.objetos[id]) || {};
    }

    function texKey(id) {
        return 'obj:' + id;
    }

    function movimientoReducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function avisar(nombre) {
        var fn = callbacks && callbacks[nombre];
        if (typeof fn !== 'function') return;
        try {
            fn.apply(null, Array.prototype.slice.call(arguments, 1));
        } catch (e) { /* noop */ }
    }

    function puedeInteractuar() {
        if (typeof callbacks.puedeInteractuar === 'function') {
            return !!callbacks.puedeInteractuar();
        }
        return true;
    }

    function screenScale(scene) {
        var canvas = scene.game.canvas;
        var rect = canvas.getBoundingClientRect();
        var gw = scene.scale.width || 1;
        var gh = scene.scale.height || 1;
        return { rect: rect, sx: rect.width / gw, sy: rect.height / gh };
    }

    function esperarEscena() {
        if (sceneRef) return Promise.resolve(sceneRef);
        return readyPromise || Promise.reject(new Error('Phaser no montado'));
    }

    var EscenaTablero = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaTablero() {
            Phaser.Scene.call(this, { key: 'EscenaEncuentraColor' });
            this.capa = null;
            this.slots = Object.create(null);
            this.idsActuales = [];
        },

        create: function () {
            this.capa = this.add.container(0, 0);
            sceneRef = this;
            if (readyResolve) {
                readyResolve(this);
                readyResolve = null;
            }
            this.scale.on('resize', this.onResize, this);
        },

        onResize: function () {
            if (this.idsActuales && this.idsActuales.length) {
                this.layout(this.idsActuales);
            }
        },

        shutdown: function () {
            this.tweens.killAll();
            this.slots = Object.create(null);
            this.idsActuales = [];
            if (sceneRef === this) sceneRef = null;
        },

        ensureTextures: function (ids) {
            var scene = this;
            var missing = [];
            ids.forEach(function (id) {
                var key = texKey(id);
                if (scene.textures.exists(key) || loadedKeys[key]) return;
                var m = metaObj(id);
                var src = m.img || '';
                if (!src) return;
                missing.push({ key: key, src: src });
            });
            if (!missing.length) return Promise.resolve();

            return new Promise(function (resolve) {
                // SVG sin width/height llegan negros con load.image en WebGL (mismo caso que Arrastrar).
                missing.forEach(function (item) {
                    if (/\.svg(\?|$)/i.test(item.src)) {
                        scene.load.svg(item.key, item.src, { scale: 2 });
                    } else {
                        scene.load.image(item.key, item.src);
                    }
                });
                scene.load.once('complete', function () {
                    missing.forEach(function (item) { loadedKeys[item.key] = true; });
                    resolve();
                });
                scene.load.start();
            });
        },

        cardSize: function (n) {
            var w = this.scale.width;
            var h = this.scale.height;
            if (n <= 3) {
                return Math.min(200, w * 0.28, h * 0.42);
            }
            if (n <= 5) {
                return Math.min(160, w * 0.22, h * 0.36);
            }
            return Math.min(138, w * 0.18, h * 0.32);
        },

        layout: function (ids) {
            var scene = this;
            var n = ids.length;
            var size = this.cardSize(n);
            var gap = Math.max(12, size * 0.1);
            var cols = n <= 3 ? n : (n <= 6 ? 3 : 4);
            if (n === 7) cols = 4;
            var rows = Math.ceil(n / cols);
            var totalW = cols * size + (cols - 1) * gap;
            var totalH = rows * size + (rows - 1) * gap;
            var startX = (this.scale.width - totalW) / 2 + size / 2;
            var startY = (this.scale.height - totalH) / 2 + size / 2;

            ids.forEach(function (id, i) {
                var slot = scene.slots[id];
                if (!slot || !slot.root) return;
                var col = i % cols;
                var row = Math.floor(i / cols);
                var x = startX + col * (size + gap);
                var y = startY + row * (size + gap);
                slot.root.setPosition(x, y);
                slot.size = size;
                if (slot.fondo) {
                    slot.fondo.setDisplaySize(size, size);
                }
                if (slot.sprite) {
                    var imgMax = size * 0.58;
                    slot.sprite.setDisplaySize(imgMax, imgMax);
                    slot.sprite.setPosition(0, -size * 0.08);
                }
                if (slot.label) {
                    slot.label.setPosition(0, size * 0.34);
                    slot.label.setFontSize(Math.max(12, Math.round(size * 0.1)));
                    slot.label.setWordWrapWidth(size * 0.9);
                }
            });
        },

        limpiar: function () {
            var scene = this;
            Object.keys(this.slots).forEach(function (id) {
                var slot = scene.slots[id];
                if (slot && slot.root) slot.root.destroy(true);
            });
            this.slots = Object.create(null);
            this.idsActuales = [];
            this.tweens.killAll();
        },

        cargarEscena: function (ids) {
            var scene = this;
            ids = (ids || []).slice();
            return this.ensureTextures(ids).then(function () {
                scene.limpiar();
                scene.idsActuales = ids;
                var reducido = movimientoReducido();

                ids.forEach(function (id) {
                    var m = metaObj(id);
                    var root = scene.add.container(0, 0);
                    var fondo = scene.add.rectangle(0, 0, 160, 160, 0xffffff, 0.94)
                        .setStrokeStyle(4, 0xffffff, 0.95);
                    fondo.setInteractive({ useHandCursor: true });

                    var sprite = null;
                    var key = texKey(id);
                    if (scene.textures.exists(key)) {
                        sprite = scene.add.image(0, 0, key).setOrigin(0.5);
                    }

                    var label = scene.add.text(0, 0, m.nombre || id, {
                        fontFamily: 'Fredoka, Nunito, sans-serif',
                        fontSize: '14px',
                        fontStyle: 'bold',
                        color: '#1e3a5f',
                        align: 'center'
                    }).setOrigin(0.5);

                    root.add(fondo);
                    if (sprite) root.add(sprite);
                    root.add(label);
                    scene.capa.add(root);

                    fondo.on('pointerdown', function () {
                        if (!puedeInteractuar()) return;
                        avisar('onToque', id);
                    });

                    scene.slots[id] = { root: root, fondo: fondo, sprite: sprite, label: label, size: 160 };

                    if (!reducido) {
                        root.setScale(0.7);
                        root.setAlpha(0);
                        scene.tweens.add({
                            targets: root,
                            scale: 1,
                            alpha: 1,
                            duration: 320,
                            ease: 'Back.easeOut',
                            delay: ids.indexOf(id) * 55
                        });
                    }
                });

                scene.layout(ids);
            });
        },

        marcarAcierto: function (id) {
            var slot = this.slots[id];
            if (!slot || !slot.root) return Promise.resolve();
            if (slot.fondo) {
                slot.fondo.setStrokeStyle(5, 0x22c55e, 1);
                slot.fondo.setFillStyle(0xdcfce7, 0.95);
            }
            if (movimientoReducido()) return Promise.resolve();
            var scene = this;
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: slot.root,
                    scale: 1.12,
                    duration: 180,
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    onComplete: function () {
                        slot.root.setScale(1);
                        resolve();
                    }
                });
            });
        },

        marcarError: function (id) {
            var slot = this.slots[id];
            if (!slot || !slot.root) return Promise.resolve();
            if (movimientoReducido()) return Promise.resolve();
            var scene = this;
            var x0 = slot.root.x;
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: slot.root,
                    x: x0 + 10,
                    duration: 55,
                    yoyo: true,
                    repeat: 3,
                    ease: 'Sine.easeInOut',
                    onComplete: function () {
                        slot.root.x = x0;
                        resolve();
                    }
                });
            });
        },

        pulseDemo: function (id) {
            var slot = this.slots[id];
            if (!slot || !slot.root) return Promise.resolve();
            if (slot.fondo) slot.fondo.setStrokeStyle(5, 0xf59f00, 1);
            if (movimientoReducido()) {
                return new Promise(function (r) { setTimeout(r, 700); });
            }
            var scene = this;
            return new Promise(function (resolve) {
                scene.tweens.add({
                    targets: slot.root,
                    scale: 1.08,
                    duration: 350,
                    yoyo: true,
                    repeat: 1,
                    ease: 'Sine.easeInOut',
                    onComplete: function () {
                        slot.root.setScale(1);
                        resolve();
                    }
                });
            });
        },

        rectPantalla: function (id) {
            var slot = this.slots[id];
            if (!slot || !slot.root || !slot.fondo) return null;
            var b = slot.fondo.getBounds();
            var sc = screenScale(this);
            return {
                x: sc.rect.left + b.centerX * sc.sx,
                y: sc.rect.top + b.centerY * sc.sy,
                left: sc.rect.left + b.x * sc.sx,
                top: sc.rect.top + b.y * sc.sy,
                width: b.width * sc.sx,
                height: b.height * sc.sy,
                getBoundingClientRect: function () {
                    return {
                        left: this.left,
                        top: this.top,
                        width: this.width,
                        height: this.height,
                        right: this.left + this.width,
                        bottom: this.top + this.height,
                        x: this.left,
                        y: this.top
                    };
                }
            };
        }
    });

    function montar(opts) {
        opts = opts || {};
        Host = global.PedniaPhaserHost;
        Phaser = global.Phaser;
        if (!Phaser) return Promise.reject(new Error('Phaser no cargado'));
        if (!Host) return Promise.reject(new Error('PedniaPhaserHost no cargado'));

        gameConfig = opts.gameConfig || opts.config || null;
        callbacks = opts.callbacks || {};
        loadedKeys = Object.create(null);
        readyPromise = new Promise(function (resolve) { readyResolve = resolve; });

        var parentId = opts.parent || 'phaser-tablero';
        var el = typeof parentId === 'string' ? document.getElementById(parentId) : parentId;
        if (!el) return Promise.reject(new Error('Falta #' + parentId));

        var w = Math.max(320, el.clientWidth || 800);
        var h = Math.max(240, el.clientHeight || 450);

        Host.destruirIntro();

        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: w,
            height: h,
            backgroundColor: '#00000000',
            transparent: true,
            audio: { noAudio: true },
            scene: [EscenaTablero],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        });

        if (!game) return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        return esperarEscena();
    }

    function cargarEscena(ids) {
        return esperarEscena().then(function (scene) {
            return scene.cargarEscena(ids || []);
        });
    }

    function marcarAcierto(id) {
        return esperarEscena().then(function (scene) {
            return scene.marcarAcierto(id);
        });
    }

    function marcarError(id) {
        return esperarEscena().then(function (scene) {
            return scene.marcarError(id);
        });
    }

    function pulseDemo(id) {
        return esperarEscena().then(function (scene) {
            return scene.pulseDemo(id);
        });
    }

    function rectPantalla(id) {
        return sceneRef ? sceneRef.rectPantalla(id) : null;
    }

    function anclaDemo(id) {
        var rect = rectPantalla(id);
        var el = document.getElementById('phaser-mano-ancla');
        if (!el) {
            el = document.createElement('div');
            el.id = 'phaser-mano-ancla';
            el.setAttribute('aria-hidden', 'true');
            el.style.cssText = 'position:fixed;pointer-events:none;z-index:5;';
            document.body.appendChild(el);
        }
        if (!rect) {
            el.style.display = 'none';
            return el;
        }
        el.style.display = 'block';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        return el;
    }

    function listo() {
        return !!(game && sceneRef);
    }

    function destruir() {
        sceneRef = null;
        readyPromise = null;
        readyResolve = null;
        game = null;
        var ancla = document.getElementById('phaser-mano-ancla');
        if (ancla && ancla.parentNode) ancla.parentNode.removeChild(ancla);
        if (Host) Host.destruirJuego();
        else if (global.PedniaPhaserHost) global.PedniaPhaserHost.destruirJuego();
    }

    global.PedniaEncuentraColorPhaser = {
        montar: montar,
        listo: listo,
        cargarEscena: cargarEscena,
        marcarAcierto: marcarAcierto,
        marcarError: marcarError,
        pulseDemo: pulseDemo,
        rectPantalla: rectPantalla,
        anclaDemo: anclaDemo,
        destruir: destruir
    };
})(typeof window !== 'undefined' ? window : this);
