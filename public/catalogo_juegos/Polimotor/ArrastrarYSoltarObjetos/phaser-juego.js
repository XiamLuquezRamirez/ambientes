/**
 * PedniaArrastrePhaser — tablero drag-and-drop en Phaser 4.2.1 (vendor).
 * Piloto: Polimotor/ArrastrarYSoltarObjetos. Sin GSAP (tweens nativos).

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
    var assetsLoaded = false;
    var busyDrop = false;

    function metaObj(id) {
        return (gameConfig && gameConfig.objetos && gameConfig.objetos[id]) || {};
    }

    function metaDest(id) {
        return (gameConfig && gameConfig.destinos && gameConfig.destinos[id]) || {};
    }

    function destinoCorrecto(objetoId) {
        return (gameConfig && gameConfig.pares && gameConfig.pares[objetoId]) || null;
    }

    function texKey(tipo, id) {
        return tipo + ':' + id;
    }

    /** Escala del objeto en reposo en el tablero (la que fija setDisplaySize en layoutRound). */
    function escalaTablero(slot) {
        var w = slot && slot.sprite && slot.sprite.width;
        return (w > 0 && slot.size > 0) ? slot.size / w : 1;
    }

    /**
     * Avisos opcionales para las capas de sonido y animación (script.js → callbacks
     * onAgarrar / onMover / onSoltar). SOLO notifican: no cambian el tablero ni el
     * resultado del drop, y un fallo en ellos no interrumpe el juego.
     */
    function avisar(nombre) {
        var fn = callbacks && callbacks[nombre];
        if (typeof fn !== 'function') return;
        try {
            fn.apply(null, Array.prototype.slice.call(arguments, 1));
        } catch (e) { /* noop */ }
    }

    function puedeInteractuar() {
        if (busyDrop) return false;
        if (typeof callbacks.puedeInteractuar === 'function') {
            return !!callbacks.puedeInteractuar();
        }
        return true;
    }

    function movimientoReducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function screenScale(scene) {
        var canvas = scene.game.canvas;
        var rect = canvas.getBoundingClientRect();
        var gw = scene.scale.width || 1;
        var gh = scene.scale.height || 1;
        return {
            rect: rect,
            sx: rect.width / gw,
            sy: rect.height / gh
        };
    }

    function boundsToScreen(scene, go) {
        if (!scene || !go) return null;
        var b = go.getBounds();
        var sc = screenScale(scene);
        return {
            x: sc.rect.left + b.centerX * sc.sx,
            y: sc.rect.top + b.centerY * sc.sy,
            left: sc.rect.left + b.x * sc.sx,
            top: sc.rect.top + b.y * sc.sy,
            width: b.width * sc.sx,
            height: b.height * sc.sy
        };
    }

    var EscenaArrastre = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaArrastre() {
            Phaser.Scene.call(this, { key: 'EscenaArrastre' });
            this.capaDestinos = null;
            this.capaObjetos = null;
            this.destinos = Object.create(null);
            this.objetos = Object.create(null);
            this.dragGo = null;
        },

        preload: function () {
            if (assetsLoaded || !gameConfig) return;
            var self = this;
            var objs = gameConfig.objetos || {};
            var dests = gameConfig.destinos || {};
            // Los SVG de objetos solo traen viewBox (sin width/height): cargados con
            // load.image, WebGL los subía como cuadros NEGROS. load.svg los rasteriza en un
            // canvas a tamaño fijo (escala 2 → nítidos en pantallas de alta densidad).
            function cargar(key, url) {
                if (/\.svg(\?|$)/i.test(url)) self.load.svg(key, url, { scale: 2 });
                else self.load.image(key, url);
            }
            Object.keys(objs).forEach(function (id) {
                var img = objs[id] && objs[id].img;
                if (img) cargar(texKey('obj', id), img);
            });
            Object.keys(dests).forEach(function (id) {
                var img = dests[id] && dests[id].img;
                if (img) cargar(texKey('dest', id), img);
            });
            if (gameConfig.fondo) {
                this.load.image('fondo-tablero', gameConfig.fondo);
            }
        },

        create: function () {
            sceneRef = this;
            assetsLoaded = true;
            this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
            this.capaDestinos = this.add.container(0, 0);
            this.capaObjetos = this.add.container(0, 0);

            this.input.on('dragstart', this.onDragStart, this);
            this.input.on('drag', this.onDrag, this);
            this.input.on('dragend', this.onDragEnd, this);

            this.scale.on('resize', this.onResize, this);
            this.events.once('shutdown', this.onShutdown, this);
            this.events.once('destroy', this.onShutdown, this);

            if (readyResolve) {
                readyResolve();
                readyResolve = null;
            }
        },

        onShutdown: function () {
            if (sceneRef === this) sceneRef = null;
            this.input.off('dragstart', this.onDragStart, this);
            this.input.off('drag', this.onDrag, this);
            this.input.off('dragend', this.onDragEnd, this);
            this.scale.off('resize', this.onResize, this);
        },

        onResize: function () {
            if (this._lastRound) {
                this.layoutRound(this._lastRound.objetos, this._lastRound.destinos, true);
            }
        },

        clearBoard: function () {
            var self = this;
            Object.keys(this.objetos).forEach(function (id) {
                var o = self.objetos[id];
                if (o && o.sprite) o.sprite.destroy();
            });
            Object.keys(this.destinos).forEach(function (id) {
                var d = self.destinos[id];
                if (d && d.root) d.root.destroy();
            });
            this.objetos = Object.create(null);
            this.destinos = Object.create(null);
            this.dragGo = null;
            this.capaDestinos.removeAll(true);
            this.capaObjetos.removeAll(true);
        },

        layoutRound: function (objetosIds, destinosIds, keepPlaced) {
            var w = this.scale.width;
            var h = this.scale.height;
            var nD = destinosIds.length;
            var nO = objetosIds.length;
            var destW = Math.min(150, Math.max(88, (w * 0.88) / Math.max(nD, 1) - 12));
            var destH = destW * 1.12;
            var objSize = Math.min(120, Math.max(72, (w * 0.8) / Math.max(nO, 1) - 16));
            var yDest = h * 0.30;
            var yObj = h * 0.72;
            var gapD = Math.min(28, (w * 0.9 - nD * destW) / Math.max(nD + 1, 1));
            var totalD = nD * destW + Math.max(0, nD - 1) * gapD;
            var startDX = (w - totalD) / 2 + destW / 2;
            var gapO = Math.min(24, (w * 0.85 - nO * objSize) / Math.max(nO + 1, 1));
            var totalO = nO * objSize + Math.max(0, nO - 1) * gapO;
            var startOX = (w - totalO) / 2 + objSize / 2;

            var self = this;
            destinosIds.forEach(function (id, i) {
                var slot = self.destinos[id];
                if (!slot || !slot.root) return;
                var x = startDX + i * (destW + gapD);
                slot.root.setPosition(x, yDest);
                slot.hitW = destW;
                slot.hitH = destH;
                if (slot.img) {
                    slot.img.setDisplaySize(destW * 0.85, destH * 0.62);
                }
                if (slot.label) {
                    slot.label.setPosition(0, destH * 0.42);
                    slot.label.setStyle({ fontSize: Math.max(11, Math.round(destW * 0.12)) + 'px' });
                }
                if (slot.colocadoImg) {
                    slot.colocadoImg.setPosition(0, -destH * 0.08);
                    slot.colocadoImg.setDisplaySize(objSize * 0.55, objSize * 0.55);
                }
            });

            objetosIds.forEach(function (id, i) {
                var slot = self.objetos[id];
                if (!slot || !slot.sprite) return;
                if (keepPlaced && slot.placed) return;
                var x = startOX + i * (objSize + gapO);
                slot.homeX = x;
                slot.homeY = yObj;
                slot.sprite.setPosition(x, yObj);
                slot.sprite.setDisplaySize(objSize, objSize);
                slot.size = objSize;
            });
        },

        cargarRonda: function (objetosIds, destinosIds) {
            var self = this;
            this.clearBoard();
            this._lastRound = {
                objetos: objetosIds.slice(),
                destinos: destinosIds.slice()
            };

            destinosIds.forEach(function (id) {
                var m = metaDest(id);
                var root = self.add.container(0, 0);
                var img = self.add.image(0, -10, texKey('dest', id));
                img.setOrigin(0.5);
                var label = self.add.text(0, 40, m.nombre || id, {
                    fontFamily: 'Fredoka, Nunito, sans-serif',
                    fontSize: '14px',
                    color: '#313131',
                    align: 'center',
                    wordWrap: { width: 140 }
                }).setOrigin(0.5, 0);
                root.add([img, label]);
                self.capaDestinos.add(root);
                self.destinos[id] = {
                    id: id,
                    root: root,
                    img: img,
                    label: label,
                    lleno: false,
                    colocadoImg: null,
                    hitW: 120,
                    hitH: 130
                };
            });

            objetosIds.forEach(function (id) {
                var m = metaObj(id);
                var spr = self.add.image(0, 0, texKey('obj', id));
                spr.setOrigin(0.5);
                spr.setInteractive({ useHandCursor: true, draggable: true });
                spr.setData('objetoId', id);
                spr.setData('homeX', 0);
                spr.setData('homeY', 0);
                self.input.setDraggable(spr);
                self.capaObjetos.add(spr);
                self.objetos[id] = {
                    id: id,
                    sprite: spr,
                    placed: false,
                    homeX: 0,
                    homeY: 0,
                    size: 100
                };
            });

            this.layoutRound(objetosIds, destinosIds, false);

            if (!movimientoReducido()) {
                destinosIds.forEach(function (id, i) {
                    var root = self.destinos[id].root;
                    root.setAlpha(0);
                    root.y += 18;
                    self.tweens.add({
                        targets: root,
                        alpha: 1,
                        y: root.y - 18,
                        duration: 420,
                        delay: i * 50,
                        ease: 'Back.easeOut'
                    });
                });
                objetosIds.forEach(function (id, i) {
                    var spr = self.objetos[id].sprite;
                    spr.setAlpha(0);
                    spr.y += 24;
                    self.tweens.add({
                        targets: spr,
                        alpha: 1,
                        y: spr.y - 24,
                        duration: 420,
                        delay: 120 + i * 60,
                        ease: 'Back.easeOut'
                    });
                });
            }
        },

        onDragStart: function (pointer, go) {
            var id = go.getData('objetoId');
            var slot = this.objetos[id];
            if (!slot || slot.placed || !puedeInteractuar()) {
                this._dragBloqueado = go;
                return;
            }
            this._dragBloqueado = null;
            this.dragGo = go;
            this.tweens.killTweensOf(go);
            // La escala de Phaser es relativa a la imagen (un PNG de 1080 px se ve a ~100 px con
            // escala ~0,1): levantar a 1.08 absoluto lo agrandaba 10 veces. Se usa la de tablero.
            var base = escalaTablero(slot);
            this.tweens.add({
                targets: go,
                scaleX: base * 1.08,
                scaleY: base * 1.08,
                duration: 100,
                ease: 'Power2'
            });
            this.children.bringToTop(this.capaObjetos);
            this.capaObjetos.bringToTop(go);
            avisar('onAgarrar', id, go);
        },

        onDrag: function (pointer, go, dragX, dragY) {
            if (this._dragBloqueado === go) {
                var slotB = this.objetos[go.getData('objetoId')];
                if (slotB) {
                    go.x = slotB.homeX;
                    go.y = slotB.homeY;
                }
                return;
            }
            if (this.dragGo !== go) return;
            go.x = dragX;
            go.y = dragY;
            this.highlightDestinoAt(pointer.x, pointer.y);
            avisar('onMover', go.getData('objetoId'), go, dragX);
        },

        onDragEnd: function (pointer, go) {
            if (this._dragBloqueado === go) {
                this._dragBloqueado = null;
                var slot0 = this.objetos[go.getData('objetoId')];
                if (slot0) {
                    go.setPosition(slot0.homeX, slot0.homeY);
                    go.setScale(escalaTablero(slot0));
                }
                return;
            }
            if (this.dragGo !== go) return;
            this.dragGo = null;
            this.clearDestinoHighlight();
            var id = go.getData('objetoId');
            var slot = this.objetos[id];
            if (!slot || slot.placed) return;

            this.tweens.add({
                targets: go,
                scaleX: escalaTablero(slot),
                scaleY: escalaTablero(slot),
                duration: 100
            });

            var dest = this.destinoEnPunto(pointer.x, pointer.y);
            avisar('onSoltar', id, go, !!dest);
            if (!dest) {
                this.volverACasa(slot);
                return;
            }
            this.resolverDrop(slot, dest);
        },

        highlightDestinoAt: function (x, y) {
            var self = this;
            Object.keys(this.destinos).forEach(function (id) {
                var d = self.destinos[id];
                if (!d.root) return;
                var hit = !d.lleno && self.puntoEnDestino(d, x, y);
                d.root.setScale(hit ? 1.06 : 1);
                if (d.img) d.img.setTint(hit ? 0xfff3c4 : 0xffffff);
            });
        },

        clearDestinoHighlight: function () {
            var self = this;
            Object.keys(this.destinos).forEach(function (id) {
                var d = self.destinos[id];
                if (!d.root) return;
                d.root.setScale(1);
                if (d.img) d.img.clearTint();
            });
        },

        puntoEnDestino: function (d, x, y) {
            var hw = (d.hitW || 120) / 2;
            var hh = (d.hitH || 130) / 2;
            return x >= d.root.x - hw && x <= d.root.x + hw &&
                y >= d.root.y - hh && y <= d.root.y + hh;
        },

        destinoEnPunto: function (x, y) {
            var self = this;
            var ids = Object.keys(this.destinos);
            for (var i = 0; i < ids.length; i++) {
                var d = self.destinos[ids[i]];
                if (!d.lleno && self.puntoEnDestino(d, x, y)) return d;
            }
            return null;
        },

        volverACasa: function (slot) {
            var self = this;
            return new Promise(function (resolve) {
                if (!slot || !slot.sprite) {
                    resolve();
                    return;
                }
                if (movimientoReducido()) {
                    slot.sprite.setPosition(slot.homeX, slot.homeY);
                    resolve();
                    return;
                }
                self.tweens.add({
                    targets: slot.sprite,
                    x: slot.homeX,
                    y: slot.homeY,
                    duration: 280,
                    ease: 'Cubic.easeOut',
                    onComplete: resolve
                });
            });
        },

        shakeDestino: function (dest) {
            if (!dest || !dest.root || movimientoReducido()) return;
            this.tweens.add({
                targets: dest.root,
                x: dest.root.x + 8,
                duration: 50,
                yoyo: true,
                repeat: 3,
                ease: 'Sine.easeInOut'
            });
        },

        colocarEnDestino: function (slot, dest) {
            var self = this;
            slot.placed = true;
            dest.lleno = true;
            slot.sprite.disableInteractive();
            slot.sprite.setVisible(false);

            var key = texKey('obj', slot.id);
            var img = this.add.image(0, -dest.hitH * 0.08, key);
            img.setOrigin(0.5);
            img.setDisplaySize(slot.size * 0.55, slot.size * 0.55);
            dest.root.add(img);
            dest.colocadoImg = img;

            if (!movimientoReducido()) {
                // Escala final = la que dejó setDisplaySize (no 1, que es el tamaño de la imagen).
                var finalX = img.scaleX;
                var finalY = img.scaleY;
                img.setScale(finalX * 0.2, finalY * 0.2);
                this.tweens.add({
                    targets: img,
                    scaleX: finalX,
                    scaleY: finalY,
                    duration: 380,
                    ease: 'Back.easeOut'
                });
                this.tweens.add({
                    targets: dest.root,
                    scaleX: 1.08,
                    scaleY: 1.08,
                    duration: 160,
                    yoyo: true,
                    ease: 'Sine.easeOut'
                });
            }
        },

        resolverDrop: function (slot, dest) {
            var self = this;
            if (busyDrop) {
                this.volverACasa(slot);
                return;
            }
            busyDrop = true;
            var objetoId = slot.id;
            var destinoId = dest.id;
            var correcto = destinoCorrecto(objetoId) === destinoId;
            var handler = callbacks.onDrop;

            var finish = function (ok) {
                if (ok) {
                    self.colocarEnDestino(slot, dest);
                } else {
                    self.shakeDestino(dest);
                    self.volverACasa(slot);
                }
                busyDrop = false;
            };

            if (typeof handler !== 'function') {
                finish(correcto);
                return;
            }

            Promise.resolve(handler(objetoId, destinoId, correcto))
                .then(function (res) {
                    var ok = !!correcto && !(res && res.ok === false);
                    finish(ok);
                })
                .catch(function () {
                    finish(false);
                });
        },

        demoLlevar: function (objetoId, destinoId) {
            var self = this;
            return new Promise(function (resolve) {
                var slot = self.objetos[objetoId];
                var dest = self.destinos[destinoId];
                if (!slot || !slot.sprite || !dest || !dest.root) {
                    resolve();
                    return;
                }
                dest.root.setScale(1.06);
                if (dest.img) dest.img.setTint(0xfff3c4);

                var dur = movimientoReducido() ? 220 : 1100;
                self.tweens.add({
                    targets: slot.sprite,
                    x: dest.root.x,
                    y: dest.root.y - dest.hitH * 0.08,
                    duration: dur,
                    ease: 'Cubic.easeInOut',
                    onComplete: function () {
                        self.clearDestinoHighlight();
                        self.colocarEnDestino(slot, dest);
                        resolve();
                    }
                });
            });
        },

        cancelarDrag: function () {
            if (!this.dragGo) return;
            var go = this.dragGo;
            this.dragGo = null;
            this.clearDestinoHighlight();
            var id = go.getData('objetoId');
            var slot = this.objetos[id];
            if (slot) this.volverACasa(slot);
        },

        rectPantalla: function (tipo, id) {
            if (tipo === 'objeto') {
                var o = this.objetos[id];
                return o && o.sprite ? boundsToScreen(this, o.sprite) : null;
            }
            if (tipo === 'destino') {
                var d = this.destinos[id];
                return d && d.root ? boundsToScreen(this, d.root) : null;
            }
            return null;
        }
    });

    function esperarEscena() {
        if (sceneRef) return Promise.resolve(sceneRef);
        if (!readyPromise) {
            readyPromise = new Promise(function (resolve) {
                readyResolve = resolve;
            });
        }
        return readyPromise.then(function () { return sceneRef; });
    }

    function montar(opts) {
        opts = opts || {};
        Host = global.PedniaPhaserHost;
        Phaser = global.Phaser;
        if (!Phaser) {
            return Promise.reject(new Error('Phaser no cargado'));
        }
        if (!Host) {
            return Promise.reject(new Error('PedniaPhaserHost no cargado'));
        }

        gameConfig = opts.gameConfig || opts.config || null;
        callbacks = opts.callbacks || {};
        assetsLoaded = false;
        busyDrop = false;
        readyPromise = new Promise(function (resolve) {
            readyResolve = resolve;
        });

        var parentId = opts.parent || 'phaser-juego';
        var el = typeof parentId === 'string' ? document.getElementById(parentId) : parentId;
        if (!el) {
            return Promise.reject(new Error('Falta #' + parentId));
        }

        var w = Math.max(320, el.clientWidth || 800);
        var h = Math.max(240, el.clientHeight || 450);

        // Intro ya debe estar destruida por el shell; el host limpia por si acaso.
        Host.destruirIntro();

        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: w,
            height: h,
            backgroundColor: '#00000000',
            transparent: true,
            audio: { noAudio: true },
            scene: [EscenaArrastre],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        });

        if (!game) {
            return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        }

        return esperarEscena();
    }

    function listo() {
        return !!(game && sceneRef);
    }

    function cargarRonda(objetosIds, destinosIds) {
        return esperarEscena().then(function (scene) {
            scene.cargarRonda(objetosIds || [], destinosIds || []);
        });
    }

    function setInteractivo(on) {
        if (!sceneRef) return;
        var ids = Object.keys(sceneRef.objetos);
        ids.forEach(function (id) {
            var slot = sceneRef.objetos[id];
            if (!slot || !slot.sprite || slot.placed) return;
            if (on) {
                slot.sprite.setInteractive({ useHandCursor: true, draggable: true });
                sceneRef.input.setDraggable(slot.sprite);
            } else {
                slot.sprite.disableInteractive();
            }
        });
    }

    function cancelarDrag() {
        if (sceneRef) sceneRef.cancelarDrag();
    }

    function demoLlevar(objetoId, destinoId) {
        return esperarEscena().then(function (scene) {
            return scene.demoLlevar(objetoId, destinoId);
        });
    }

    function rectPantalla(tipo, id) {
        if (!sceneRef) return null;
        return sceneRef.rectPantalla(tipo, id);
    }

    function destruir() {
        busyDrop = false;
        sceneRef = null;
        readyPromise = null;
        readyResolve = null;
        assetsLoaded = false;
        game = null;
        if (Host) Host.destruirJuego();
        else if (global.PedniaPhaserHost) global.PedniaPhaserHost.destruirJuego();
    }

    global.PedniaArrastrePhaser = {
        montar: montar,
        listo: listo,
        cargarRonda: cargarRonda,
        setInteractivo: setInteractivo,
        cancelarDrag: cancelarDrag,
        demoLlevar: demoLlevar,
        rectPantalla: rectPantalla,
        destruir: destruir
    };
})(typeof window !== 'undefined' ? window : this);
