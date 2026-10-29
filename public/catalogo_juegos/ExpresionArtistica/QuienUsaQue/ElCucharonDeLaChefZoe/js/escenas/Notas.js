/**
 * 5–6: notasCarriles — arrastrar notas al carril de color (siempre completa).
 */
(function (global) {
    'use strict';

    var NS = global.QuienUsaQueEscenas = global.QuienUsaQueEscenas || {};
    var Fx = null;
    var L = null;

    var COLORES = [0xe53935, 0xfdd835, 0x1e88e5];
    var NOMBRES = ['rojo', 'amarillo', 'azul'];

    NS.Notas = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function Notas() {
            Phaser.Scene.call(this, { key: 'Notas' });
            this.reto = null;
            this.indice = 0;
            this.afinadas = 0;
            this.busy = false;
            this.notaGo = null;
            this.carriles = [];
        },

        init: function (data) {
            this.reto = (data && data.reto) || null;
            this.indice = 0;
            this.afinadas = 0;
            this.busy = false;
            this.notaGo = null;
        },

        preload: function () {
            Fx = global.QuienUsaQueFx;
            L = global.QuienUsaQueLogica;
            var cfg = NS.cfg(this);
            NS.preloadElementos(this, cfg.elementos, ['nota_musical', this.reto && this.reto.personaje].filter(Boolean));
        },

        create: function () {
            var self = this;
            var reto = this.reto;
            if (!reto) return;
            NS.fondoMarco(this, true);
            var w = this.scale.width;
            var h = this.scale.height;

            this.actor = this.add.image(w * 0.1, h * 0.5, NS.texKey(reto.personaje));
            Fx.fitImage(this.actor, w * 0.18, h * 0.45);

            var laneW = w * 0.22;
            var startX = w * 0.38;
            this.carriles = [];
            for (var i = 0; i < 3; i++) {
                var x = startX + i * (laneW + 16);
                var rect = this.add.rectangle(x, h * 0.55, laneW, h * 0.7, COLORES[i], 0.2)
                    .setStrokeStyle(4, COLORES[i]);
                this.add.text(x, h * 0.92, NOMBRES[i], {
                    fontFamily: 'Fredoka, sans-serif', fontSize: '16px', color: '#fff'
                }).setOrigin(0.5);
                this.carriles.push({ x: x, w: laneW, color: COLORES[i], idx: i });
            }

            this.contador = this.add.text(w / 2, h * 0.08, '', {
                fontFamily: 'Fredoka, sans-serif', fontSize: '20px', color: '#eceff1'
            }).setOrigin(0.5);

            this.events.once('shutdown', function () { NS.limpiarTweens(self); }, this);
            NS.emit(this, 'onEscenaLista', { tipo: reto.tipo, id: reto.id });
            this.time.delayedCall(300, function () { self.lanzarNota(); });
        },

        lanzarNota: function () {
            var self = this;
            var notas = this.reto.notas || [];
            if (this.indice >= notas.length) {
                this.cerrar();
                return;
            }
            var def = notas[this.indice];
            var w = this.scale.width;
            var h = this.scale.height;
            this.contador.setText((this.indice + 1) + ' / ' + notas.length);

            if (this.notaGo) {
                this.notaGo.destroy();
                this.notaGo = null;
            }

            var startLane = this.carriles[def.carril] || this.carriles[0];
            var go = this.add.image(startLane.x, h * 0.12, NS.texKey('nota_musical'));
            Fx.fitImage(go, w * 0.12, h * 0.12);
            go.setTint(COLORES[def.carril]);
            go.setInteractive({ useHandCursor: true, draggable: true });
            this.input.setDraggable(go);
            go.setData('def', def);
            go.setData('locked', false);
            this.notaGo = go;
            this.busy = false;

            // cae despacio; el niño la arrastra al carril correcto
            this.fallTween = this.tweens.add({
                targets: go,
                y: h * 0.82,
                duration: Fx.motionOk() ? 3200 : 1800,
                ease: 'Linear',
                onComplete: function () {
                    if (go.getData('locked')) return;
                    self.resolverNota(go, -1);
                }
            });

            this.input.off('drag');
            this.input.off('dragend');
            this.input.on('drag', function (p, obj, dx, dy) {
                if (obj !== self.notaGo || obj.getData('locked') || !NS.puede(self)) return;
                if (self.fallTween) self.fallTween.pause();
                obj.x = dx;
                obj.y = Math.min(dy, h * 0.82);
            });
            this.input.on('dragend', function (p, obj) {
                if (obj !== self.notaGo || obj.getData('locked')) return;
                var lane = self.carrilCercano(obj.x);
                self.resolverNota(obj, lane);
            });
        },

        carrilCercano: function (x) {
            var best = 0;
            var bestD = Infinity;
            this.carriles.forEach(function (c) {
                var d = Math.abs(c.x - x);
                if (d < bestD) { bestD = d; best = c.idx; }
            });
            return best;
        },

        resolverNota: function (go, carrilElegido) {
            var self = this;
            if (!go || go.getData('locked')) return;
            go.setData('locked', true);
            go.disableInteractive();
            if (this.fallTween) {
                this.fallTween.stop();
                this.fallTween = null;
            }

            var def = go.getData('def');
            var res = L.evaluarNota(def, carrilElegido);
            if (res.afinada) {
                this.afinadas += 1;
                Fx.sfx('nota', { f: def.f });
                Fx.burst(this, go.x, go.y, COLORES[def.carril]);
                this.tweens.add({ targets: go, scale: go.scale * 1.2, alpha: 0, duration: 250 });
            } else {
                Fx.sfx('desafinada', { f: def.f });
                Fx.shake(this, go, 10);
                this.tweens.add({ targets: go, alpha: 0, duration: 280 });
            }

            var avance = L.avanzarPista(this.indice, this.reto.notas.length);
            this.indice = avance.indice;
            this.time.delayedCall(380, function () {
                if (avance.estado === 'completo') self.cerrar();
                else self.lanzarNota();
            });
        },

        cerrar: function () {
            var self = this;
            var cierre = L.cierreMelodia(this.afinadas, (this.reto.notas || []).length);
            if (global.QuienUsaQueSfx && QuienUsaQueSfx.melodia) {
                QuienUsaQueSfx.melodia(this.reto.notas.map(function (n) { return n.f; }), cierre.perfecta);
            }
            Fx.cameraPunch(this, 1.05);
            NS.emit(this, 'onAcierto', { reto: this.reto, perfecta: cierre.perfecta }).then(function () {
                return NS.emit(self, 'onRetoCompleto', { reto: self.reto });
            });
        },

        setInteractivo: function (on) {
            if (!this.notaGo || this.notaGo.getData('locked')) return;
            if (on) {
                this.notaGo.setInteractive({ useHandCursor: true, draggable: true });
                this.input.setDraggable(this.notaGo);
            } else this.notaGo.disableInteractive();
        }
    });
})(typeof window !== 'undefined' ? window : this);
