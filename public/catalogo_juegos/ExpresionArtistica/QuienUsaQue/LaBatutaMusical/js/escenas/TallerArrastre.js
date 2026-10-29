/**
 * 3–4: arrastreHerramienta — entrega herramienta a personaje.
 */
(function (global) {
    'use strict';

    var NS = global.QuienUsaQueEscenas = global.QuienUsaQueEscenas || {};
    var Fx = null;
    var L = null;

    NS.TallerArrastre = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function TallerArrastre() {
            Phaser.Scene.call(this, { key: 'TallerArrastre' });
            this.reto = null;
            this.piezas = Object.create(null);
            this.busy = false;
            this.zonaGfx = null;
            this.actor = null;
            this.lienzo = null;
            this.osito = null;
            this.placedGo = null;
        },

        init: function (data) {
            this.reto = (data && data.reto) || null;
            this.busy = false;
            this.piezas = Object.create(null);
            this.placedGo = null;
        },

        preload: function () {
            Fx = global.QuienUsaQueFx;
            L = global.QuienUsaQueLogica;
            var cfg = NS.cfg(this);
            var ids = [];
            if (this.reto) {
                ids.push(this.reto.personaje, this.reto.correcta);
                (this.reto.opciones || []).forEach(function (id) { ids.push(id); });
            }
            NS.preloadElementos(this, cfg.elementos, ids);
        },

        create: function () {
            var self = this;
            var reto = this.reto;
            if (!reto) return;

            NS.montarTeatro(this, false);
            var w = this.scale.width;
            var h = this.scale.height;

            // Sombra + personaje que respira (no un sticker quieto).
            this.add.ellipse(w * 0.58, h * 0.78, w * 0.22, 28, 0x000000, 0.22);
            this.actor = this.add.image(w * 0.58, h * 0.52, NS.texKey(reto.personaje));
            Fx.fitImage(this.actor, w * 0.34, h * 0.58);
            NS.respirar(this, this.actor);

            if (reto.id === 'pintora') {
                this.add.rectangle(w * 0.2, h * 0.42, 18, h * 0.38, 0x5d4037);
                this.lienzo = this.add.rectangle(w * 0.2, h * 0.32, w * 0.2, h * 0.26, 0xffffff)
                    .setStrokeStyle(6, 0x4e342e);
            }
            if (reto.id === 'doctor') {
                this.osito = this.add.circle(w * 0.32, h * 0.7, 36, 0xa1887f).setStrokeStyle(4, 0x6d4c41);
                this.add.circle(w * 0.32 - 22, h * 0.7 - 28, 12, 0x8d6e63);
                this.add.circle(w * 0.32 + 22, h * 0.7 - 28, 12, 0x8d6e63);
                NS.respirar(this, this.osito);
            }
            if (reto.id === 'chef') {
                this.add.ellipse(w * 0.78, h * 0.62, w * 0.16, h * 0.12, 0x455a64);
                this.add.ellipse(w * 0.78, h * 0.58, w * 0.12, h * 0.08, 0xff8a65, 0.85);
            }

            this.zonaGfx = Fx.zonaDash(this, reto.zonaDestino, 0xff6d00);
            if (Fx.motionOk()) {
                this.tweens.add({
                    targets: this.zonaGfx,
                    alpha: 0.35,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }

            var opciones = (reto.opciones || []).slice();
            for (var i = opciones.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var t = opciones[i]; opciones[i] = opciones[j]; opciones[j] = t;
            }

            // Flotan arriba, lejos del caballete y de la zona de la mano.
            var slots = [
                { x: w * 0.36, y: h * 0.16 },
                { x: w * 0.8, y: h * 0.18 }
            ];
            opciones.forEach(function (id, idx) {
                var x = slots[idx % slots.length].x;
                var y = slots[idx % slots.length].y;
                var halo = self.add.circle(x, y, Math.min(w, h) * 0.09, 0xffffff, 0.35);
                if (Fx.motionOk()) {
                    self.tweens.add({
                        targets: halo, scale: 1.15, alpha: 0.12, duration: 700, yoyo: true, repeat: -1
                    });
                }
                var spr = self.add.image(x, y, NS.texKey(id));
                Fx.fitImage(spr, w * 0.22, h * 0.28);
                spr.setInteractive({
                    useHandCursor: true,
                    draggable: true,
                    hitArea: new Phaser.Geom.Circle(spr.width / 2, spr.height / 2, Math.max(spr.width, spr.height) * 0.7),
                    hitAreaCallback: Phaser.Geom.Circle.Contains
                });
                self.input.setDraggable(spr);
                spr.setData('piezaId', id);
                spr.setData('homeX', x);
                spr.setData('homeY', y);
                spr.setData('halo', halo);
                spr.setDepth(10);
                self.piezas[id] = spr;
                NS.flotar(self, spr, 22);
            });

            this.input.on('dragstart', this.onDragStart, this);
            this.input.on('drag', this.onDrag, this);
            this.input.on('dragend', this.onDragEnd, this);
            this.events.once('shutdown', this.onShutdown, this);
            this.events.once('destroy', this.onShutdown, this);

            NS.emit(this, 'onEscenaLista', { tipo: reto.tipo, id: reto.id });
        },

        onShutdown: function () {
            this.input.off('dragstart', this.onDragStart, this);
            this.input.off('drag', this.onDrag, this);
            this.input.off('dragend', this.onDragEnd, this);
            NS.limpiarTweens(this);
        },

        onDragStart: function (pointer, go) {
            if (this.busy || !NS.puede(this)) return;
            this.tweens.killTweensOf(go);
            go.setDepth(20);
            go.setAngle(0);
            if (Fx.motionOk()) this.tweens.add({ targets: go, scale: go.scale * 1.12, duration: 120 });
        },

        onDrag: function (pointer, go, dragX, dragY) {
            if (this.busy || !NS.puede(this)) return;
            go.x = dragX;
            go.y = dragY;
        },

        onDragEnd: function (pointer, go) {
            var self = this;
            if (this.busy || !NS.puede(this)) {
                this.volverCasa(go);
                return;
            }
            var piezaId = go.getData('piezaId');
            var pct = Fx.worldToPct(this, go.x, go.y);
            var res = L.evaluarArrastre(this.reto, piezaId, pct.x, pct.y);

            if (res.estado === 'completo') {
                this.busy = true;
                this.colocar(go);
                this.juiceAcierto();
                Fx.sfx(this.reto.efecto);
                NS.emit(this, 'onAcierto', { reto: this.reto, piezaId: piezaId }).then(function () {
                    return NS.emit(self, 'onRetoCompleto', { reto: self.reto });
                });
                return;
            }

            if (res.estado === 'fuera' && res.correcta) {
                this.volverCasa(go);
                return;
            }

            this.busy = true;
            Fx.sfx(this.reto.efectoError || 'error');
            Fx.shake(this, go, 16);
            this.volverCasa(go);
            NS.emit(this, 'onError', { reto: this.reto, piezaId: piezaId }).then(function () {
                self.busy = false;
            });
        },

        colocar: function (go) {
            var z = Fx.pctToXY(this, this.reto.zonaDestino);
            Object.keys(this.piezas).forEach(function (id) {
                var p = this.piezas[id];
                if (p !== go) {
                    p.disableInteractive();
                    this.tweens.add({ targets: p, alpha: 0.25, duration: 200 });
                }
            }, this);
            go.disableInteractive();
            this.placedGo = go;
            this.tweens.add({
                targets: go,
                x: z.x,
                y: z.y,
                scale: go.scale * 0.85,
                duration: Fx.motionOk() ? 280 : 0,
                ease: 'Back.easeOut'
            });
            if (this.zonaGfx) this.zonaGfx.setAlpha(0.35);
        },

        volverCasa: function (go) {
            var self = this;
            if (!go) return;
            this.tweens.killTweensOf(go);
            this.tweens.add({
                targets: go,
                x: go.getData('homeX'),
                y: go.getData('homeY'),
                angle: 0,
                duration: Fx.motionOk() ? 280 : 0,
                ease: 'Back.easeOut',
                onComplete: function () {
                    go.setDepth(10);
                    NS.flotar(self, go, 22);
                }
            });
        },

        juiceAcierto: function () {
            Fx.cameraPunch(this, 1.05);
            Fx.burst(this, this.actor.x, this.actor.y - 40, 0xffeb3b);
            if (this.reto.id === 'pintora' && this.lienzo) {
                this.lienzo.setFillStyle(0xffeb3b);
                this.tweens.addCounter({
                    from: 0, to: 1, duration: 500,
                    onUpdate: function (tw) {
                        // arcoíris aproximado rotando tint
                    }
                });
                var colors = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa];
                var self = this;
                var i = 0;
                this.time.addEvent({
                    delay: 80, repeat: colors.length - 1,
                    callback: function () {
                        self.lienzo.setFillStyle(colors[i++]);
                    }
                });
            }
            if (this.reto.id === 'doctor' && this.osito) {
                this.osito.setFillStyle(0xffcc80);
                this.tweens.add({ targets: this.osito, scale: 1.2, yoyo: true, duration: 200, repeat: 2 });
            }
            if (this.reto.id === 'chef' && this.placedGo) {
                this.tweens.add({
                    targets: this.placedGo, angle: 18, yoyo: true, duration: 180, repeat: 4
                });
                for (var k = 0; k < 5; k++) {
                    var hx = this.placedGo.x + (Math.random() - 0.5) * 40;
                    var hy = this.placedGo.y - 20;
                    var heart = this.add.text(hx, hy, '♥', { fontSize: '22px', color: '#e53935' });
                    this.tweens.add({
                        targets: heart, y: hy - 60, alpha: 0, duration: 700,
                        onComplete: function (tw, t) { t.destroy(); }
                    });
                }
            }
            if (this.reto.id === 'cantante') {
                for (var n = 0; n < 6; n++) {
                    var note = this.add.text(
                        this.actor.x + (Math.random() - 0.5) * 80,
                        this.actor.y - 30,
                        '♪',
                        { fontSize: '28px', color: '#ffd54f' }
                    );
                    this.tweens.add({
                        targets: note, y: note.y - 80, alpha: 0, duration: 900,
                        delay: n * 60,
                        onComplete: function (tw, t) { t.destroy(); }
                    });
                }
            }
        },

        setInteractivo: function (on) {
            var self = this;
            Object.keys(this.piezas).forEach(function (id) {
                var spr = self.piezas[id];
                if (!spr || spr === self.placedGo) return;
                if (on) {
                    spr.setInteractive({ useHandCursor: true, draggable: true });
                    self.input.setDraggable(spr);
                    spr.setAlpha(1);
                } else {
                    spr.disableInteractive();
                }
            });
        },

        demoLlevar: function () {
            var self = this;
            var correcta = this.piezas[this.reto.correcta];
            if (!correcta) return Promise.resolve();
            var z = Fx.pctToXY(this, this.reto.zonaDestino);
            return new Promise(function (resolve) {
                self.tweens.add({
                    targets: correcta,
                    x: z.x,
                    y: z.y,
                    duration: Fx.motionOk() ? 700 : 0,
                    ease: 'Sine.easeInOut',
                    onComplete: function () {
                        self.colocar(correcta);
                        self.juiceAcierto();
                        Fx.sfx(self.reto.efecto);
                        resolve();
                    }
                });
            });
        },

        rectPantalla: function (tipo, id) {
            var go = null;
            if (tipo === 'pieza') go = this.piezas[id];
            if (tipo === 'zona' && this.zonaGfx) go = this.zonaGfx;
            if (!go) return null;
            var b = go.getBounds();
            var canvas = this.game.canvas;
            var rect = canvas.getBoundingClientRect();
            var sx = rect.width / this.scale.width;
            var sy = rect.height / this.scale.height;
            return {
                left: rect.left + b.x * sx,
                top: rect.top + b.y * sy,
                width: b.width * sx,
                height: b.height * sy,
                x: rect.left + (b.x + b.width / 2) * sx,
                y: rect.top + (b.y + b.height / 2) * sy
            };
        }
    });
})(typeof window !== 'undefined' ? window : this);
