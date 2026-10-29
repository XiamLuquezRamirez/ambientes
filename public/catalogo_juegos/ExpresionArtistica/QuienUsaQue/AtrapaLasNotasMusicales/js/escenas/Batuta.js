/**
 * 5–6: ritmoBatuta — memorizar y repetir arriba/abajo.
 */
(function (global) {
    'use strict';

    var NS = global.QuienUsaQueEscenas = global.QuienUsaQueEscenas || {};
    var Fx = null;
    var L = null;

    NS.Batuta = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function Batuta() {
            Phaser.Scene.call(this, { key: 'Batuta' });
            this.reto = null;
            this.rondaIdx = 0;
            this.paso = 0;
            this.busy = false;
            this.escuchando = false;
            this.orquesta = [];
        },

        init: function (data) {
            this.reto = (data && data.reto) || null;
            this.rondaIdx = 0;
            this.paso = 0;
            this.busy = false;
            this.escuchando = false;
            this.orquesta = [];
        },

        preload: function () {
            Fx = global.QuienUsaQueFx;
            L = global.QuienUsaQueLogica;
            var cfg = NS.cfg(this);
            NS.preloadElementos(this, cfg.elementos, ['batuta', this.reto && this.reto.personaje].filter(Boolean));
        },

        create: function () {
            var self = this;
            var reto = this.reto;
            if (!reto) return;
            NS.fondoMarco(this, true);
            var w = this.scale.width;
            var h = this.scale.height;

            this.actor = this.add.image(w * 0.18, h * 0.5, NS.texKey(reto.personaje));
            Fx.fitImage(this.actor, w * 0.26, h * 0.5);

            this.batuta = this.add.image(w * 0.5, h * 0.32, NS.texKey('batuta'));
            Fx.fitImage(this.batuta, w * 0.14, h * 0.28);

            this.chipRow = this.add.container(w * 0.72, h * 0.25);

            this.btnArriba = this.hacerBoton(w * 0.35, h * 0.72, '▲ ARRIBA', 0x26a69a, 'arriba');
            this.btnAbajo = this.hacerBoton(w * 0.65, h * 0.72, '▼ ABAJO', 0x5c6bc0, 'abajo');

            this.estadoTxt = this.add.text(w / 2, h * 0.1, '', {
                fontFamily: 'Fredoka, sans-serif', fontSize: '22px', color: '#eceff1'
            }).setOrigin(0.5);

            this.events.once('shutdown', function () { NS.limpiarTweens(self); }, this);
            NS.emit(this, 'onEscenaLista', { tipo: reto.tipo, id: reto.id });
            this.time.delayedCall(400, function () { self.iniciarRonda(); });
        },

        hacerBoton: function (x, y, label, color, dir) {
            var self = this;
            var bg = this.add.rectangle(x, y, 180, 90, color, 1).setStrokeStyle(4, 0xffffff)
                .setInteractive({ useHandCursor: true });
            var txt = this.add.text(x, y, label, {
                fontFamily: 'Fredoka, sans-serif', fontSize: '20px', color: '#fff', fontStyle: 'bold'
            }).setOrigin(0.5);
            bg.on('pointerdown', function () { self.tocar(dir); });
            bg.setData('label', txt);
            return bg;
        },

        iniciarRonda: function () {
            var self = this;
            var rondas = this.reto.rondas || [];
            if (this.rondaIdx >= rondas.length) {
                Fx.sfx('fanfarria');
                NS.emit(this, 'onAcierto', { reto: this.reto }).then(function () {
                    return NS.emit(self, 'onRetoCompleto', { reto: self.reto });
                });
                return;
            }
            this.paso = 0;
            this.escuchando = false;
            this.setBotones(false);
            var ron = rondas[this.rondaIdx];
            this.estadoTxt.setText('Mira el ritmo…');
            this.reproducirDemo(ron).then(function () {
                self.estadoTxt.setText('¡Tu turno!');
                self.escuchando = true;
                self.setBotones(true);
            });
        },

        reproducirDemo: function (ron) {
            var self = this;
            var patron = ron.patron || [];
            var tempo = ron.tempoMs || 700;
            return new Promise(function (resolve) {
                var i = 0;
                function beat() {
                    if (i >= patron.length) {
                        resolve();
                        return;
                    }
                    self.mostrarDir(patron[i]);
                    Fx.sfx('tambor');
                    i += 1;
                    self.time.delayedCall(tempo, beat);
                }
                beat();
            });
        },

        mostrarDir: function (dir) {
            var y = dir === 'arriba' ? this.batuta.y - 40 : this.batuta.y + 40;
            if (!Fx.motionOk()) {
                this.batuta.y = y;
                return;
            }
            this.tweens.add({
                targets: this.batuta,
                y: y,
                duration: 160,
                yoyo: true,
                ease: 'Sine.easeOut'
            });
            var btn = dir === 'arriba' ? this.btnArriba : this.btnAbajo;
            this.tweens.add({ targets: btn, scale: 1.08, duration: 120, yoyo: true });
        },

        tocar: function (dir) {
            var self = this;
            if (!this.escuchando || this.busy || !NS.puede(this)) return;
            var ron = this.reto.rondas[this.rondaIdx];
            var res = L.evaluarBatuta(ron.patron, this.paso, dir);
            this.mostrarDir(dir);

            if (res.estado === 'mal') {
                this.busy = true;
                this.escuchando = false;
                this.setBotones(false);
                Fx.sfx('error');
                NS.emit(this, 'onError', { reto: this.reto, tipo: 'ritmo' }).then(function () {
                    self.busy = false;
                    self.iniciarRonda();
                });
                return;
            }

            Fx.sfx('destello');
            this.paso = res.indice;
            if (res.estado === 'completo') {
                this.escuchando = false;
                this.setBotones(false);
                this.sumarInstrumento(ron.instrumento);
                Fx.sfx(ron.instrumento);
                this.rondaIdx += 1;
                this.time.delayedCall(700, function () { self.iniciarRonda(); });
            }
        },

        sumarInstrumento: function (nombre) {
            var chip = this.add.text(0, this.orquesta.length * 28, '♪ ' + nombre, {
                fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#ffd54f'
            });
            this.chipRow.add(chip);
            this.orquesta.push(nombre);
            if (Fx.motionOk()) {
                this.tweens.add({ targets: chip, scale: 1.2, yoyo: true, duration: 200 });
            }
        },

        setBotones: function (on) {
            [this.btnArriba, this.btnAbajo].forEach(function (b) {
                if (!b) return;
                if (on) b.setInteractive({ useHandCursor: true });
                else b.disableInteractive();
                b.setAlpha(on ? 1 : 0.45);
            });
        },

        setInteractivo: function (on) {
            if (this.escuchando) this.setBotones(on);
            else this.setBotones(false);
        }
    });
})(typeof window !== 'undefined' ? window : this);
