/**
 * 5–6: unir puntos 1..8 + arrastrar lupa al jeroglífico.
 */
(function (global) {
    'use strict';

    var NS = global.QuienUsaQueEscenas = global.QuienUsaQueEscenas || {};
    var Fx = null;
    var L = null;

    NS.Lupa = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function Lupa() {
            Phaser.Scene.call(this, { key: 'Lupa' });
            this.reto = null;
            this.ultimo = 0;
            this.fase = 'puntos';
            this.busy = false;
            this.puntosGo = [];
            this.lineas = null;
            this.activoDesde = null;
        },

        init: function (data) {
            this.reto = (data && data.reto) || null;
            this.ultimo = 0;
            this.fase = 'puntos';
            this.busy = false;
            this.puntosGo = [];
            this.activoDesde = null;
        },

        preload: function () {
            Fx = global.QuienUsaQueFx;
            L = global.QuienUsaQueLogica;
            var cfg = NS.cfg(this);
            NS.preloadElementos(this, cfg.elementos, ['lupa', 'jeroglifico', this.reto && this.reto.personaje].filter(Boolean));
        },

        create: function () {
            var self = this;
            var reto = this.reto;
            if (!reto) return;
            NS.fondoMarco(this, true);
            var w = this.scale.width;
            var h = this.scale.height;
            var n = reto.puntos || 8;

            this.actor = this.add.image(w * 0.12, h * 0.55, NS.texKey(reto.personaje));
            Fx.fitImage(this.actor, w * 0.22, h * 0.5);

            this.lineas = this.add.graphics();
            var cx = w * 0.55;
            var cy = h * 0.48;
            var rx = w * 0.22;
            var ry = h * 0.28;

            for (var i = 1; i <= n; i++) {
                var ang = -Math.PI / 2 + ((i - 1) / n) * Math.PI * 2;
                var x = cx + Math.cos(ang) * rx;
                var y = cy + Math.sin(ang) * ry;
                var circ = this.add.circle(x, y, 22, 0x102a43).setStrokeStyle(3, 0x00e5ff).setInteractive({ useHandCursor: true });
                var txt = this.add.text(x, y, String(i), {
                    fontFamily: 'Fredoka, sans-serif', fontSize: '20px', color: '#fff'
                }).setOrigin(0.5);
                circ.setData('num', i);
                circ.setData('label', txt);
                this.puntosGo.push(circ);
                circ.on('pointerdown', function () {
                    self.tocarPunto(this.getData('num'), this);
                });
            }

            this.events.once('shutdown', function () { NS.limpiarTweens(self); }, this);
            NS.emit(this, 'onEscenaLista', { tipo: reto.tipo, id: reto.id });
        },

        tocarPunto: function (num, go) {
            var self = this;
            if (this.busy || this.fase !== 'puntos' || !NS.puede(this)) return;

            if (this.activoDesde == null) {
                if (this.ultimo === 0 && num !== 1) {
                    Fx.sfx('error');
                    return;
                }
                if (this.ultimo > 0 && num !== this.ultimo) {
                    // permitir reiniciar trazo desde el último conectado
                    if (num !== this.ultimo) {
                        Fx.sfx('error');
                        return;
                    }
                }
                this.activoDesde = num;
                go.setFillStyle(0xffd54f);
                return;
            }

            var desde = this.activoDesde;
            var hasta = num;
            var res = L.evaluarUnion(this.ultimo, desde, hasta, this.reto.puntos || 8);

            if (res.estado === 'salto' || res.estado === 'mal') {
                this.busy = true;
                this.dibujarLinea(desde, hasta, 0xe53935);
                Fx.sfx('error');
                this.activoDesde = null;
                NS.emit(this, 'onError', { reto: this.reto, tipo: 'salto' }).then(function () {
                    self.busy = false;
                    self.redibujarBuenas();
                });
                return;
            }

            if (res.estado === 'bien' || res.estado === 'circuito') {
                this.ultimo = res.ultimo;
                this.dibujarLinea(desde, hasta, 0x69f0ae);
                Fx.sfx('xilofono', { f: 400 + res.ultimo * 60 });
                go.setFillStyle(0x69f0ae);
                this.activoDesde = res.estado === 'circuito' ? null : hasta;
                if (res.estado === 'circuito') {
                    this.busy = true;
                    this.time.delayedCall(350, function () { self.faseLupa(); });
                }
            }
        },

        puntoXY: function (num) {
            var go = this.puntosGo[num - 1];
            return go ? { x: go.x, y: go.y } : null;
        },

        dibujarLinea: function (desde, hasta, color) {
            var a = this.puntoXY(desde);
            var b = this.puntoXY(hasta);
            if (!a || !b) return;
            this.lineas.lineStyle(4, color, 1);
            this.lineas.lineBetween(a.x, a.y, b.x, b.y);
        },

        redibujarBuenas: function () {
            this.lineas.clear();
            for (var i = 1; i < this.ultimo; i++) {
                this.dibujarLinea(i, i + 1, 0x69f0ae);
            }
            this.puntosGo.forEach(function (g) {
                var n = g.getData('num');
                g.setFillStyle(n <= this.ultimo ? 0x69f0ae : 0x102a43);
            }, this);
        },

        faseLupa: function () {
            var self = this;
            this.fase = 'lupa';
            this.puntosGo.forEach(function (g) {
                g.disableInteractive();
                g.setAlpha(0.35);
                var lab = g.getData('label');
                if (lab) lab.setAlpha(0.35);
            });
            this.lineas.setAlpha(0.35);

            var w = this.scale.width;
            var h = this.scale.height;
            var j = Fx.pctToXY(this, this.reto.jeroglifico);
            this.jero = this.add.image(j.x, j.y, NS.texKey('jeroglifico')).setAlpha(0.25);
            Fx.fitImage(this.jero, j.w, j.h);

            this.lupa = this.add.image(w * 0.2, h * 0.85, NS.texKey('lupa'));
            Fx.fitImage(this.lupa, w * 0.18, h * 0.2);
            this.lupa.setInteractive({ useHandCursor: true, draggable: true });
            this.input.setDraggable(this.lupa);
            this.lupa.setData('homeX', this.lupa.x);
            this.lupa.setData('homeY', this.lupa.y);

            this.input.on('drag', function (p, go, dx, dy) {
                if (self.fase !== 'lupa' || self.busy) return;
                go.x = dx; go.y = dy;
                self.jero.setAlpha(Fx.dentroZona(self, self.reto.jeroglifico, go.x, go.y) ? 1 : 0.25);
            });
            this.input.on('dragend', function (p, go) {
                if (self.fase !== 'lupa' || self.busy) return;
                var pct = Fx.worldToPct(self, go.x, go.y);
                var res = L.evaluarHallazgo(self.reto.jeroglifico, pct.x, pct.y);
                if (res.estado === 'completo') {
                    self.busy = true;
                    self.jero.setAlpha(1);
                    Fx.sfx('templo');
                    Fx.burst(self, self.jero.x, self.jero.y, 0xce93d8);
                    Fx.cameraPunch(self, 1.06);
                    NS.emit(self, 'onAcierto', { reto: self.reto }).then(function () {
                        return NS.emit(self, 'onRetoCompleto', { reto: self.reto });
                    });
                } else {
                    self.tweens.add({
                        targets: go, x: go.getData('homeX'), y: go.getData('homeY'), duration: 200
                    });
                }
            });
            this.busy = false;
        },

        setInteractivo: function (on) {
            if (this.fase === 'puntos') {
                this.puntosGo.forEach(function (g) {
                    if (on) g.setInteractive({ useHandCursor: true });
                    else g.disableInteractive();
                });
            } else if (this.lupa) {
                if (on) {
                    this.lupa.setInteractive({ useHandCursor: true, draggable: true });
                    this.input.setDraggable(this.lupa);
                } else this.lupa.disableInteractive();
            }
        }
    });
})(typeof window !== 'undefined' ? window : this);
