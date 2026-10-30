/**
 * PedniaRompecabezasPhaser — tablero completo en Phaser 4.2.1.
 * Silueta + bandeja + drag. La lógica de acierto/fallo/lotes vive en script.js vía callbacks.
 */
(function (global) {
    'use strict';

    var Phaser = global.Phaser;
    var Host = null;
    var gsap = null;

    var boardMeta = null;
    var callbacks = {};
    var game = null;
    var sceneRef = null;
    var readyResolve = null;
    var readyPromise = null;
    var assetsLoaded = false;
    var busyDrop = false;
    var previewOn = false;

    function movimientoReducido() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function tex(kind, id) {
        return kind + ':' + id;
    }

    function umbral() {
        var p = Number(callbacks.umbralSolape && callbacks.umbralSolape());
        if (p > 0 && p <= 1) return p;
        return 0.55;
    }

    function puedeInteractuar() {
        if (busyDrop || previewOn) return false;
        if (typeof callbacks.puedeInteractuar === 'function') {
            return !!callbacks.puedeInteractuar();
        }
        return true;
    }

    var EscenaPuzzle = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function EscenaPuzzle() {
            Phaser.Scene.call(this, { key: 'EscenaRompecabezas' });
            this.capaBoard = null;
            this.capaBandeja = null;
            this.slots = Object.create(null);
            this.fichas = Object.create(null);
            this.dragGo = null;
            this.boardRect = { x: 0, y: 0, w: 1, h: 1 };
            this._loteIds = [];
        },

        preload: function () {
            if (assetsLoaded || !boardMeta) return;
            var self = this;
            (boardMeta.piezas || []).forEach(function (p) {
                if (p.gris) self.load.image(tex('gris', p.id), p.gris);
                if (p.color) self.load.image(tex('color', p.id), p.color);
            });
            if (boardMeta.fondo) {
                this.load.image('fondo-rompecabezas', boardMeta.fondo);
            }
        },

        create: function () {
            sceneRef = this;
            assetsLoaded = true;
            this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
            if (this.textures.exists('fondo-rompecabezas')) {
                var bg = this.add.image(0, 0, 'fondo-rompecabezas').setOrigin(0);
                bg.setDisplaySize(this.scale.width, this.scale.height);
                bg.setAlpha(0.22);
                bg.setDepth(-2);
            }
            this.capaBoard = this.add.container(0, 0);
            this.capaBandeja = this.add.container(0, 0);

            this.input.on('dragstart', this.onDragStart, this);
            this.input.on('drag', this.onDrag, this);
            this.input.on('dragend', this.onDragEnd, this);
            this.scale.on('resize', this.onResize, this);
            this.events.once('shutdown', this.onShutdown, this);
            this.events.once('destroy', this.onShutdown, this);

            this.layoutShell();
            this.crearSilueta();
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
            this.layoutShell();
            this.reposicionarTodo();
        },

        layoutShell: function () {
            var w = this.scale.width;
            var h = this.scale.height;
            var pad = Math.max(12, Math.min(28, w * 0.02));
            var boardW = Math.min(w * 0.42, h * 0.78 * (389 / 522));
            var boardH = boardW * (522 / 389);
            if (boardH > h * 0.86) {
                boardH = h * 0.86;
                boardW = boardH * (389 / 522);
            }
            var boardX = pad + 8;
            var boardY = (h - boardH) / 2;
            this.boardRect = { x: boardX, y: boardY, w: boardW, h: boardH };
            this.bandejaRect = {
                x: boardX + boardW + pad,
                y: pad + 36,
                w: Math.max(160, w - (boardX + boardW + pad * 2)),
                h: h - pad * 2 - 36
            };
        },

        areaSilueta: function () {
            var r = this.boardRect;
            var escala = ((boardMeta && boardMeta.escala) || 100) / 100;
            var cw = r.w * escala;
            var ch = r.h * escala;
            return {
                x: r.x + (r.w - cw) / 2,
                y: r.y + (r.h - ch) / 2,
                w: cw,
                h: ch
            };
        },

        clearFichas: function () {
            var self = this;
            Object.keys(this.fichas).forEach(function (id) {
                var f = self.fichas[id];
                if (f && f.sprite) f.sprite.destroy();
            });
            this.fichas = Object.create(null);
            this._loteIds = [];
            this.dragGo = null;
        },

        crearSilueta: function () {
            var self = this;
            Object.keys(this.slots).forEach(function (id) {
                var s = self.slots[id];
                if (s.gris) s.gris.destroy();
                if (s.color) s.color.destroy();
                if (s.hint) s.hint.destroy();
            });
            this.slots = Object.create(null);
            this.capaBoard.removeAll(true);

            var area = this.areaSilueta();

            (boardMeta.piezas || []).forEach(function (p) {
                var px = area.x + p.fx * area.w + (p.fw * area.w) / 2;
                var py = area.y + p.fy * area.h + (p.fh * area.h) / 2;
                var dw = Math.max(8, p.fw * area.w);
                var dh = Math.max(8, p.fh * area.h);

                var gris = self.add.image(px, py, tex('gris', p.id));
                gris.setOrigin(0.5);
                gris.setDisplaySize(dw, dh);
                gris.setAlpha(0.95);

                var color = self.add.image(px, py, tex('color', p.id));
                color.setOrigin(0.5);
                color.setDisplaySize(dw, dh);
                color.setVisible(false);

                var hint = self.add.rectangle(px, py, dw * 1.08, dh * 1.08);
                hint.setStrokeStyle(3, 0x66bb6a, 0);
                hint.setFillStyle(0x66bb6a, 0);
                hint.setVisible(false);

                self.capaBoard.add([hint, gris, color]);
                self.slots[p.id] = {
                    id: p.id,
                    gris: gris,
                    color: color,
                    hint: hint,
                    placed: false,
                    fx: p.fx,
                    fy: p.fy,
                    fw: p.fw,
                    fh: p.fh,
                    cx: px,
                    cy: py,
                    dw: dw,
                    dh: dh
                };
            });
        },

        reposicionarTodo: function () {
            var self = this;
            var r = this.areaSilueta();
            Object.keys(this.slots).forEach(function (id) {
                var s = self.slots[id];
                var px = r.x + s.fx * r.w + (s.fw * r.w) / 2;
                var py = r.y + s.fy * r.h + (s.fh * r.h) / 2;
                var dw = Math.max(8, s.fw * r.w);
                var dh = Math.max(8, s.fh * r.h);
                s.cx = px;
                s.cy = py;
                s.dw = dw;
                s.dh = dh;
                s.gris.setPosition(px, py).setDisplaySize(dw, dh);
                s.color.setPosition(px, py).setDisplaySize(dw, dh);
                s.hint.setPosition(px, py).setSize(dw * 1.08, dh * 1.08);
            });
            this.layoutBandeja(true);
        },

        setPreviewCompleto: function (on) {
            previewOn = !!on;
            var self = this;
            Object.keys(this.slots).forEach(function (id) {
                var s = self.slots[id];
                if (!s) return;
                if (on) {
                    s.color.setVisible(true);
                    s.gris.setVisible(false);
                } else {
                    s.color.setVisible(!!s.placed);
                    s.gris.setVisible(!s.placed);
                }
            });
            this.setInteractivo(!on && puedeInteractuar());
        },

        setPista: function (piezaId, nivel) {
            var self = this;
            Object.keys(this.slots).forEach(function (id) {
                var s = self.slots[id];
                if (!s || !s.hint) return;
                if (id !== piezaId || !nivel) {
                    s.hint.setVisible(false);
                    self.tweens.killTweensOf(s.hint);
                    return;
                }
                s.hint.setVisible(true);
                if (nivel >= 2) {
                    s.hint.setStrokeStyle(4, 0xff9800, 1);
                    s.hint.setFillStyle(0xff9800, 0.12);
                    self.tweens.add({
                        targets: s.hint,
                        alpha: 0.35,
                        duration: 500,
                        yoyo: true,
                        repeat: -1
                    });
                } else {
                    s.hint.setStrokeStyle(3, 0x66bb6a, 1);
                    s.hint.setFillStyle(0x66bb6a, 0.16);
                    s.hint.setAlpha(1);
                }
            });
        },

        mostrarLote: function (ids) {
            var self = this;
            this.clearFichas();
            this._loteIds = (ids || []).slice();
            this._loteIds.forEach(function (id) {
                var slot = self.slots[id];
                if (!slot || slot.placed) return;
                var spr = self.add.image(0, 0, tex('color', id));
                spr.setOrigin(0.5);
                spr.setData('piezaId', id);
                spr.setInteractive({ useHandCursor: true, draggable: true });
                self.input.setDraggable(spr);
                self.capaBandeja.add(spr);
                self.fichas[id] = {
                    id: id,
                    sprite: spr,
                    homeX: 0,
                    homeY: 0,
                    size: 80
                };
            });
            this.layoutBandeja(false);
            this.animarEntradaLote();
        },

        layoutBandeja: function (keepPos) {
            var ids = this._loteIds.filter(function (id) {
                return !!this.fichas[id];
            }, this);
            var n = ids.length;
            if (!n) return;
            var br = this.bandejaRect;
            var cols = Math.min(2, Math.max(1, n <= 2 ? n : 2));
            var rows = Math.ceil(n / cols);
            var cellW = br.w / cols;
            var cellH = br.h / Math.max(rows, 1);
            var size = Math.min(cellW * 0.62, cellH * 0.62, 120);
            var self = this;
            ids.forEach(function (id, i) {
                var f = self.fichas[id];
                if (!f || !f.sprite) return;
                var col = i % cols;
                var row = Math.floor(i / cols);
                var x = br.x + cellW * (col + 0.5);
                var y = br.y + cellH * (row + 0.5);
                f.homeX = x;
                f.homeY = y;
                f.size = size;
                f.sprite.setDisplaySize(size, size);
                if (!keepPos || self.dragGo !== f.sprite) {
                    f.sprite.setPosition(x, y);
                }
            });
        },

        animarEntradaLote: function () {
            var self = this;
            var g = global.gsap;
            Object.keys(this.fichas).forEach(function (id, i) {
                var f = self.fichas[id];
                if (!f || !f.sprite) return;
                if (movimientoReducido()) {
                    f.sprite.setAlpha(1);
                    return;
                }
                if (g) {
                    f.sprite.setAlpha(0);
                    g.fromTo(f.sprite, { alpha: 0, y: f.homeY + 26, scaleX: 0.85, scaleY: 0.85 }, {
                        alpha: 1,
                        y: f.homeY,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 0.42,
                        delay: i * 0.07,
                        ease: 'back.out(1.7)'
                    });
                } else {
                    f.sprite.setAlpha(0);
                    self.tweens.add({
                        targets: f.sprite,
                        alpha: 1,
                        y: f.homeY,
                        duration: 380,
                        delay: i * 60,
                        ease: 'Back.easeOut'
                    });
                    f.sprite.y = f.homeY + 24;
                }
            });
        },

        setInteractivo: function (on) {
            var self = this;
            Object.keys(this.fichas).forEach(function (id) {
                var f = self.fichas[id];
                if (!f || !f.sprite) return;
                if (on) {
                    f.sprite.setInteractive({ useHandCursor: true, draggable: true });
                    self.input.setDraggable(f.sprite);
                } else {
                    f.sprite.disableInteractive();
                }
            });
        },

        onDragStart: function (pointer, go) {
            var id = go.getData('piezaId');
            var f = this.fichas[id];
            if (!f || !puedeInteractuar()) {
                this._dragBloqueado = go;
                return;
            }
            this._dragBloqueado = null;
            this.dragGo = go;
            if (global.gsap) global.gsap.killTweensOf(go);
            this.tweens.killTweensOf(go);
            go.setScale(1.08);
            this.capaBandeja.bringToTop(go);
            if (typeof callbacks.onDragStart === 'function') callbacks.onDragStart(id);
        },

        onDrag: function (pointer, go, dragX, dragY) {
            if (this._dragBloqueado === go) {
                var f0 = this.fichas[go.getData('piezaId')];
                if (f0) go.setPosition(f0.homeX, f0.homeY);
                return;
            }
            if (this.dragGo !== go) return;
            go.x = dragX;
            go.y = dragY;
            this.resaltarDestino(go);
        },

        onDragEnd: function (pointer, go) {
            if (this._dragBloqueado === go) {
                this._dragBloqueado = null;
                var f0 = this.fichas[go.getData('piezaId')];
                if (f0) go.setPosition(f0.homeX, f0.homeY).setScale(1);
                return;
            }
            if (this.dragGo !== go) return;
            this.dragGo = null;
            go.setScale(1);
            this.clearResalte();
            var id = go.getData('piezaId');
            var f = this.fichas[id];
            if (!f) return;
            var destId = this.mejorDestino(go);
            if (!destId) {
                this.volverCasa(f);
                return;
            }
            this.resolverDrop(f, destId);
        },

        solape: function (a, b) {
            var w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            var h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            var area = Math.max(1, a.width * a.height);
            return (w * h) / area;
        },

        boundsGo: function (go) {
            var b = go.getBounds();
            return { left: b.x, top: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
        },

        boundsSlot: function (s) {
            return {
                left: s.cx - s.dw / 2,
                top: s.cy - s.dh / 2,
                right: s.cx + s.dw / 2,
                bottom: s.cy + s.dh / 2,
                width: s.dw,
                height: s.dh
            };
        },

        mejorDestino: function (go) {
            var ficha = this.boundsGo(go);
            var best = { id: null, s: 0 };
            var self = this;
            var idPieza = go.getData('piezaId');
            var thr = umbral();
            // Prioriza el hueco correcto si supera el umbral (misma regla que el DOM).
            var correcta = this.slots[idPieza];
            if (correcta && !correcta.placed) {
                var sc = this.solape(ficha, this.boundsSlot(correcta));
                if (sc > thr) return idPieza;
            }
            Object.keys(this.slots).forEach(function (id) {
                var s = self.slots[id];
                if (!s || s.placed) return;
                var v = self.solape(ficha, self.boundsSlot(s));
                if (v > best.s) best = { id: id, s: v };
            });
            if (best.id && best.s > thr) return best.id;
            return null;
        },

        resaltarDestino: function (go) {
            if (!(callbacks.resaltarDestino && callbacks.resaltarDestino())) return;
            var id = this.mejorDestino(go);
            var self = this;
            Object.keys(this.slots).forEach(function (sid) {
                var s = self.slots[sid];
                if (!s || s.placed) return;
                s.gris.setTint(sid === id ? 0xffe082 : 0xb0bec5);
            });
        },

        clearResalte: function () {
            var self = this;
            Object.keys(this.slots).forEach(function (id) {
                var s = self.slots[id];
                if (s && s.gris && !s.placed) s.gris.setTint(0xb0bec5);
            });
        },

        volverCasa: function (f) {
            var self = this;
            if (!f || !f.sprite) return Promise.resolve();
            if (movimientoReducido()) {
                f.sprite.setPosition(f.homeX, f.homeY);
                return Promise.resolve();
            }
            if (global.gsap) {
                return new Promise(function (resolve) {
                    global.gsap.to(f.sprite, {
                        x: f.homeX,
                        y: f.homeY,
                        duration: 0.28,
                        ease: 'power2.out',
                        onComplete: resolve
                    });
                });
            }
            return new Promise(function (resolve) {
                self.tweens.add({
                    targets: f.sprite,
                    x: f.homeX,
                    y: f.homeY,
                    duration: 280,
                    ease: 'Cubic.easeOut',
                    onComplete: resolve
                });
            });
        },

        shakeFicha: function (f) {
            if (!f || !f.sprite || movimientoReducido()) return;
            if (global.gsap) {
                global.gsap.fromTo(f.sprite, { x: f.homeX }, {
                    keyframes: [
                        { x: f.homeX - 10, duration: 0.06 },
                        { x: f.homeX + 10, duration: 0.08 },
                        { x: f.homeX - 7, duration: 0.07 },
                        { x: f.homeX, duration: 0.08 }
                    ]
                });
                return;
            }
            this.tweens.add({
                targets: f.sprite,
                x: f.homeX + 8,
                duration: 50,
                yoyo: true,
                repeat: 3
            });
        },

        colocarPieza: function (id) {
            var s = this.slots[id];
            var f = this.fichas[id];
            if (!s) return;
            s.placed = true;
            s.gris.setVisible(false);
            s.color.setVisible(true);
            s.hint.setVisible(false);
            this.tweens.killTweensOf(s.hint);
            if (f && f.sprite) {
                var spr = f.sprite;
                delete this.fichas[id];
                this._loteIds = this._loteIds.filter(function (x) { return x !== id; });
                if (global.gsap && !movimientoReducido()) {
                    global.gsap.to(spr, {
                        x: s.cx,
                        y: s.cy,
                        scaleX: 0.2,
                        scaleY: 0.2,
                        alpha: 0,
                        duration: 0.28,
                        ease: 'power2.in',
                        onComplete: function () { spr.destroy(); }
                    });
                } else {
                    spr.destroy();
                }
            }
            if (!movimientoReducido()) {
                if (global.gsap) {
                    global.gsap.fromTo(s.color, { scaleX: 0.7, scaleY: 0.7 }, {
                        scaleX: 1,
                        scaleY: 1,
                        duration: 0.38,
                        ease: 'back.out(1.8)'
                    });
                } else {
                    s.color.setScale(0.7);
                    this.tweens.add({
                        targets: s.color,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 360,
                        ease: 'Back.easeOut'
                    });
                }
            }
            this.layoutBandeja(true);
        },

        resolverDrop: function (f, destId) {
            var self = this;
            if (busyDrop) {
                this.volverCasa(f);
                return;
            }
            busyDrop = true;
            var piezaId = f.id;
            var correcto = piezaId === destId;
            var handler = callbacks.onDrop;

            var finish = function (ok) {
                if (ok) {
                    self.colocarPieza(piezaId);
                } else {
                    self.shakeFicha(f);
                    self.volverCasa(f);
                }
                busyDrop = false;
            };

            if (typeof handler !== 'function') {
                finish(correcto);
                return;
            }

            Promise.resolve(handler(piezaId, destId, correcto))
                .then(function (res) {
                    var ok = !!correcto && !(res && res.ok === false);
                    finish(ok);
                })
                .catch(function () {
                    finish(false);
                });
        },

        demoLlevar: function (piezaId) {
            var self = this;
            return new Promise(function (resolve) {
                var f = self.fichas[piezaId];
                var s = self.slots[piezaId];
                if (!f || !f.sprite || !s) {
                    resolve();
                    return;
                }
                var dur = movimientoReducido() ? 0.2 : 0.9;
                if (global.gsap) {
                    global.gsap.to(f.sprite, {
                        x: s.cx,
                        y: s.cy,
                        duration: dur,
                        ease: 'power2.inOut',
                        onComplete: function () {
                            f.sprite.setPosition(f.homeX, f.homeY);
                            resolve();
                        }
                    });
                } else {
                    self.tweens.add({
                        targets: f.sprite,
                        x: s.cx,
                        y: s.cy,
                        duration: dur * 1000,
                        ease: 'Cubic.easeInOut',
                        yoyo: true,
                        onComplete: resolve
                    });
                }
            });
        },

        rectPantallaPieza: function (piezaId) {
            var f = this.fichas[piezaId];
            if (!f || !f.sprite || !game || !game.canvas) return null;
            var b = f.sprite.getBounds();
            var rect = game.canvas.getBoundingClientRect();
            var sx = rect.width / Math.max(1, this.scale.width);
            var sy = rect.height / Math.max(1, this.scale.height);
            return {
                x: rect.left + (b.centerX) * sx,
                y: rect.top + (b.centerY) * sy,
                left: rect.left + b.x * sx,
                top: rect.top + b.y * sy,
                width: b.width * sx,
                height: b.height * sy
            };
        }
    });

    function esperarEscena() {
        if (sceneRef) return Promise.resolve(sceneRef);
        if (!readyPromise) {
            readyPromise = new Promise(function (resolve) {
                readyResolve = resolve;
            });
        }
        return readyPromise;
    }

    function montar(opts) {
        opts = opts || {};
        Phaser = global.Phaser;
        Host = global.PedniaPhaserHost;
        gsap = global.gsap;
        if (!Phaser) return Promise.reject(new Error('Phaser no cargado'));
        if (!Host) return Promise.reject(new Error('PedniaPhaserHost no cargado'));

        boardMeta = opts.boardMeta || null;
        callbacks = opts.callbacks || {};
        assetsLoaded = false;
        busyDrop = false;
        previewOn = false;
        readyPromise = new Promise(function (resolve) {
            readyResolve = resolve;
        });

        var parentId = opts.parent || 'phaser-juego';
        var el = typeof parentId === 'string' ? document.getElementById(parentId) : parentId;
        if (!el) return Promise.reject(new Error('Falta #' + parentId));
        if (!boardMeta || !boardMeta.piezas || !boardMeta.piezas.length) {
            return Promise.reject(new Error('boardMeta vacío'));
        }

        Host.destruirIntro();
        if (game) {
            try { Host.destruirJuego(); } catch (e) { /* noop */ }
            game = null;
            sceneRef = null;
        }

        var w = Math.max(320, el.clientWidth || 900);
        var h = Math.max(280, el.clientHeight || 560);

        game = Host.crear({
            type: Phaser.AUTO,
            parent: el,
            width: w,
            height: h,
            backgroundColor: '#00000000',
            transparent: true,
            audio: { noAudio: true },
            scene: [EscenaPuzzle],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        });

        if (!game) return Promise.reject(new Error('No se pudo crear Phaser.Game'));
        return esperarEscena();
    }

    function listo() {
        return !!(game && sceneRef);
    }

    function api(fn) {
        return esperarEscena().then(function (scene) {
            return fn(scene);
        });
    }

    global.PedniaRompecabezasPhaser = {
        montar: montar,
        listo: listo,
        setPreviewCompleto: function (on) {
            return api(function (s) { s.setPreviewCompleto(on); });
        },
        mostrarLote: function (ids) {
            return api(function (s) { s.mostrarLote(ids); });
        },
        setInteractivo: function (on) {
            if (sceneRef) sceneRef.setInteractivo(on);
        },
        setPista: function (id, nivel) {
            if (sceneRef) sceneRef.setPista(id, nivel);
        },
        demoLlevar: function (id) {
            return api(function (s) { return s.demoLlevar(id); });
        },
        rectPantallaPieza: function (id) {
            return sceneRef ? sceneRef.rectPantallaPieza(id) : null;
        },
        destruir: function () {
            busyDrop = false;
            previewOn = false;
            sceneRef = null;
            readyPromise = null;
            readyResolve = null;
            assetsLoaded = false;
            game = null;
            if (Host) Host.destruirJuego();
            else if (global.PedniaPhaserHost) global.PedniaPhaserHost.destruirJuego();
        }
    };
})(typeof window !== 'undefined' ? window : this);
