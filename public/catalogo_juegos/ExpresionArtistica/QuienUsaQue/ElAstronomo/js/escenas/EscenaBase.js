/**
 * Utilidades compartidas por escenas de ¿Quién usa qué?
 */
(function (global) {
    'use strict';

    var NS = global.QuienUsaQueEscenas = global.QuienUsaQueEscenas || {};

    NS.texKey = function (id) {
        return 'el:' + id;
    };

    NS.preloadElementos = function (scene, elementos, ids) {
        var map = elementos || {};
        (ids || Object.keys(map)).forEach(function (id) {
            var el = map[id];
            if (!el || !el.img) return;
            var key = NS.texKey(id);
            if (!scene.textures.exists(key)) scene.load.image(key, el.img);
        });
    };

    NS.cb = function (scene) {
        return (scene.game && scene.game.registry && scene.game.registry.get('quqCallbacks')) || {};
    };

    NS.cfg = function (scene) {
        return (scene.game && scene.game.registry && scene.game.registry.get('quqConfig')) || {};
    };

    NS.puede = function (scene) {
        var c = NS.cb(scene);
        if (typeof c.puedeInteractuar === 'function') return !!c.puedeInteractuar();
        return true;
    };

    NS.emit = function (scene, nombre, payload) {
        var c = NS.cb(scene);
        var fn = c[nombre];
        if (typeof fn !== 'function') return Promise.resolve();
        return Promise.resolve(fn(payload || {}));
    };

    NS.limpiarTweens = function (scene) {
        if (scene && scene.tweens) scene.tweens.killAll();
    };

    /**
     * Escenario de teatro a pantalla completa (no un recuadro de ficha).
     * Polvo de luz animado para que el canvas se sienta vivo desde el primer frame.
     */
    NS.montarTeatro = function (scene, lab) {
        var w = scene.scale.width;
        var h = scene.scale.height;
        var Fx = global.QuienUsaQueFx;

        scene.add.rectangle(w / 2, h / 2, w, h, lab ? 0x061018 : 0x24160f);
        scene.add.rectangle(w / 2, h * 0.34, w, h * 0.68, lab ? 0x0d2137 : 0xff8f00);
        scene.add.rectangle(w / 2, h * 0.86, w, h * 0.32, lab ? 0x0a1440 : 0x4e342e);
        scene.add.ellipse(w * 0.5, h * 0.52, w * 0.7, h * 0.78, 0xfff3e0, lab ? 0.05 : 0.28);

        scene.add.rectangle(w * 0.035, h * 0.38, w * 0.09, h, lab ? 0x4a148c : 0xb71c1c);
        scene.add.rectangle(w * 0.965, h * 0.38, w * 0.09, h, lab ? 0x4a148c : 0xb71c1c);
        // pliegues de cortina
        var cortina = lab ? 0x6a1b9a : 0xe53935;
        for (var c = 0; c < 4; c++) {
            scene.add.rectangle(w * (0.02 + c * 0.012), h * 0.38, 6, h, cortina, 0.45);
            scene.add.rectangle(w * (0.98 - c * 0.012), h * 0.38, 6, h, cortina, 0.45);
        }

        if (!Fx || !Fx.motionOk()) return;
        for (var i = 0; i < 16; i++) {
            var mote = scene.add.circle(
                Math.random() * w,
                Math.random() * h * 0.75,
                2 + Math.random() * 3,
                lab ? 0x80d8ff : 0xfff59d,
                0.75
            );
            scene.tweens.add({
                targets: mote,
                y: mote.y - 50 - Math.random() * 90,
                x: mote.x + (Math.random() - 0.5) * 40,
                alpha: 0.1,
                duration: 1600 + Math.random() * 1800,
                yoyo: true,
                repeat: -1,
                delay: Math.random() * 900,
                ease: 'Sine.easeInOut'
            });
        }
    };

    NS.flotar = function (scene, go, amp) {
        if (!go || !global.QuienUsaQueFx || !QuienUsaQueFx.motionOk()) return;
        var base = go.y;
        scene.tweens.add({
            targets: go,
            y: base - (amp || 18),
            duration: 800 + Math.random() * 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        scene.tweens.add({
            targets: go,
            angle: (Math.random() > 0.5 ? 6 : -6),
            duration: 1100,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    };

    NS.respirar = function (scene, go) {
        if (!go || !global.QuienUsaQueFx || !QuienUsaQueFx.motionOk()) return;
        var sy = go.scaleY;
        scene.tweens.add({
            targets: go,
            scaleY: sy * 1.035,
            duration: 650,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    };

    NS.fondoMarco = function (scene, lab) {
        NS.montarTeatro(scene, lab);
    };

})(typeof window !== 'undefined' ? window : this);
