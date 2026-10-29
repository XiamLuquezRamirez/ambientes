/**
 * 5–6: ensamblaje telescopio + apunte cielo/suelo.
 */
(function (global) {
    'use strict';

    var NS = global.QuienUsaQueEscenas = global.QuienUsaQueEscenas || {};
    var Fx = null;
    var L = null;

    NS.Telescopio = new Phaser.Class({
        Extends: Phaser.Scene,

        initialize: function Telescopio() {
            Phaser.Scene.call(this, { key: 'Telescopio' });
            this.reto = null;
            this.fase = 'armar';
            this.halladas = {};
            this.piezas = {};
            this.busy = false;
            this.telescopioGo = null;
        },

        init: function (data) {
            this.reto = (data && data.reto) || null;
            this.fase = 'armar';
            this.halladas = {};
            this.piezas = {};
            this.busy = false;
            this.telescopioGo = null;
        },

        preload: function () {
            Fx = global.QuienUsaQueFx;
            L = global.QuienUsaQueLogica;
            var cfg = NS.cfg(this);
            var ids = ['tripode', 'tubo', 'lente', 'telescopio', 'cielo', 'suelo', this.reto && this.reto.personaje];
            NS.preloadElementos(this, cfg.elementos, ids.filter(Boolean));
        },

        create: function () {
            var self = this;
            var reto = this.reto;
            if (!reto) return;
            NS.fondoMarco(this, true);
            var w = this.scale.width;
            var h = this.scale.height;

            this.actor = this.add.image(w * 0.18, h * 0.55, NS.texKey(reto.personaje));
            Fx.fitImage(this.actor, w * 0.28, h * 0.55);

            (reto.piezas || []).forEach(function (p) {
                self.zonas = self.zonas || {};
                self.zonas[p.id] = Fx.zonaDash(self, p.zonaDestino, 0x00e5ff);
            });

            var orden = reto.orden || [];
            orden.forEach(function (id, idx) {
                var spr = self.add.image(w * (0.55 + idx * 0.14), h * 0.88, NS.texKey(id));
                Fx.fitImage(spr, w * 0.16, h * 0.18);
                spr.setInteractive({ useHandCursor: true, draggable: true });
                self.input.setDraggable(spr);
                spr.setData('piezaId', id);
                spr.setData('homeX', spr.x);
                spr.setData('homeY', spr.y);
                self.piezas[id] = spr;
            });

            this.input.on('drag', function (pointer, go, dx, dy) {
                if (self.busy || self.fase !== 'armar' || !NS.puede(self)) return;
                go.x = dx; go.y = dy;
            });
            this.input.on('dragend', this.onDragEnd, this);
            this.events.once('shutdown', this.onShutdown, this);
            NS.emit(this, 'onEscenaLista', { tipo: reto.tipo, id: reto.id });
        },

        onShutdown: function () {
            this.input.off('dragend', this.onDragEnd, this);
            NS.limpiarTweens(this);
        },

        onDragEnd: function (pointer, go) {
            var self = this;
            if (this.busy || this.fase !== 'armar' || !NS.puede(this)) {
                this.casa(go);
                return;
            }
            var id = go.getData('piezaId');
            var pct = Fx.worldToPct(this, go.x, go.y);
            var res = L.evaluarEnsamblaje(this.reto, id, pct.x, pct.y, this.halladas);

            if (res.estado === 'orden') {
                this.busy = true;
                Fx.sfx('error');
                Fx.shake(this, go, 14);
                this.casa(go);
                NS.emit(this, 'onError', { reto: this.reto, tipo: 'orden' }).then(function () {
                    self.busy = false;
                });
                return;
            }
            if (res.estado === 'fuera' || res.estado === 'mal' || res.estado === 'ya') {
                this.casa(go);
                return;
            }

            this.halladas = res.halladas;
            go.disableInteractive();
            var z = Fx.pctToXY(this, res.pieza.zonaDestino);
            this.tweens.add({ targets: go, x: z.x, y: z.y, duration: 250, ease: 'Back.easeOut' });
            Fx.sfx('destello');
            Fx.burst(this, z.x, z.y, 0x00e5ff);

            if (res.estado === 'armado') {
                this.busy = true;
                this.time.delayedCall(400, function () { self.pasarApunte(); });
            }
        },

        casa: function (go) {
            if (!go) return;
            this.tweens.add({
                targets: go, x: go.getData('homeX'), y: go.getData('homeY'), duration: 200
            });
        },

        pasarApunte: function () {
            var self = this;
            this.fase = 'apunte';
            Object.keys(this.piezas).forEach(function (id) {
                self.piezas[id].setVisible(false);
            });
            if (this.zonas) {
                Object.keys(this.zonas).forEach(function (id) {
                    self.zonas[id].destroy();
                });
            }

            var w = this.scale.width;
            var h = this.scale.height;
            this.telescopioGo = this.add.image(w * 0.5, h * 0.55, NS.texKey('telescopio'));
            Fx.fitImage(this.telescopioGo, w * 0.28, h * 0.4);

            var apunte = this.reto.apunte;
            this.btnCielo = this.add.image(
                Fx.pctToXY(this, apunte.zonas.cielo).x,
                Fx.pctToXY(this, apunte.zonas.cielo).y,
                NS.texKey('cielo')
            ).setInteractive({ useHandCursor: true });
            Fx.fitImage(this.btnCielo, w * 0.5, h * 0.18);

            this.btnSuelo = this.add.image(
                Fx.pctToXY(this, apunte.zonas.suelo).x,
                Fx.pctToXY(this, apunte.zonas.suelo).y,
                NS.texKey('suelo')
            ).setInteractive({ useHandCursor: true });
            Fx.fitImage(this.btnSuelo, w * 0.5, h * 0.14);

            this.pregunta = this.add.text(w / 2, h * 0.08, apunte.pregunta, {
                fontFamily: 'Fredoka, sans-serif',
                fontSize: '22px',
                color: '#eceff1',
                align: 'center',
                wordWrap: { width: w * 0.85 }
            }).setOrigin(0.5);

            NS.emit(this, 'onFaseApunte', { pregunta: apunte.pregunta });

            this.btnCielo.on('pointerdown', function () { self.elegirApunte('cielo'); });
            this.btnSuelo.on('pointerdown', function () { self.elegirApunte('suelo'); });
            this.busy = false;
        },

        elegirApunte: function (destino) {
            var self = this;
            if (this.busy || this.fase !== 'apunte' || !NS.puede(this)) return;
            var res = L.evaluarApunte(this.reto, destino);
            if (res.estado !== 'completo') {
                this.busy = true;
                Fx.sfx('error');
                Fx.shake(this, this.btnSuelo, 12);
                NS.emit(this, 'onError', { reto: this.reto, tipo: 'apunte' }).then(function () {
                    self.busy = false;
                });
                return;
            }
            this.busy = true;
            Fx.sfx(this.reto.efecto || 'espacial');
            Fx.cameraPunch(this, 1.08);
            // haz láser + galaxia
            var w = this.scale.width;
            var haz = this.add.rectangle(this.telescopioGo.x, this.telescopioGo.y - 40, 8, hOr(this, 0.35), 0xffd54f, 0.85);
            haz.setOrigin(0.5, 1);
            this.tweens.add({ targets: haz, alpha: 0.3, yoyo: true, duration: 200, repeat: 4 });
            for (var i = 0; i < 12; i++) {
                var star = this.add.circle(
                    w * (0.3 + Math.random() * 0.4),
                    this.scale.height * (0.12 + Math.random() * 0.2),
                    3 + Math.random() * 4,
                    0xffffff
                );
                this.tweens.add({
                    targets: star, alpha: 0.2, yoyo: true, duration: 300 + Math.random() * 400, repeat: -1
                });
            }
            NS.emit(this, 'onAcierto', { reto: this.reto }).then(function () {
                return NS.emit(self, 'onRetoCompleto', { reto: self.reto });
            });
        },

        setInteractivo: function (on) {
            var self = this;
            if (this.fase === 'armar') {
                Object.keys(this.piezas).forEach(function (id) {
                    var spr = self.piezas[id];
                    if (!spr || self.halladas[id]) return;
                    if (on) {
                        spr.setInteractive({ useHandCursor: true, draggable: true });
                        self.input.setDraggable(spr);
                    } else spr.disableInteractive();
                });
            } else {
                if (this.btnCielo) on ? this.btnCielo.setInteractive({ useHandCursor: true }) : this.btnCielo.disableInteractive();
                if (this.btnSuelo) on ? this.btnSuelo.setInteractive({ useHandCursor: true }) : this.btnSuelo.disableInteractive();
            }
        }
    });

    function hOr(scene, f) {
        return scene.scale.height * f;
    }
})(typeof window !== 'undefined' ? window : this);
