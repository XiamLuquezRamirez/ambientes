/**
 * PedniaQuienUsaQue — fachada Phaser 4 para ¿Quién usa qué?
 */
(function (global) {
    'use strict';

    var Host = null;
    var game = null;
    var sceneActiva = null;
    var readyResolve = null;
    var readyPromise = null;
    var MAPA = {
        arrastreHerramienta: 'TallerArrastre',
        ensamblaje: 'Telescopio',
        unirPuntos: 'Lupa',
        ritmoBatuta: 'Batuta',
        notasCarriles: 'Notas'
    };

    function clases() {
        var E = global.QuienUsaQueEscenas || {};
        return [
            E.TallerArrastre,
            E.Telescopio,
            E.Lupa,
            E.Batuta,
            E.Notas
        ].filter(Boolean);
    }

    function esperarReady() {
        if (game) return Promise.resolve(game);
        if (!readyPromise) {
            readyPromise = new Promise(function (resolve) { readyResolve = resolve; });
        }
        return readyPromise;
    }

    function montar(opts) {
        opts = opts || {};
        Host = global.PedniaPhaserHost;
        if (!global.Phaser) return Promise.reject(new Error('Phaser no cargado'));
        if (!Host) return Promise.reject(new Error('PedniaPhaserHost no cargado'));

        var parentId = opts.parent || 'phaser-juego';
        var el = typeof parentId === 'string' ? document.getElementById(parentId) : parentId;
        if (!el) return Promise.reject(new Error('Falta #' + parentId));

        var scenes = clases();
        if (!scenes.length) return Promise.reject(new Error('Escenas QuienUsaQue no cargadas'));

        readyPromise = new Promise(function (resolve) { readyResolve = resolve; });

        Host.destruirIntro();

        var w = Math.max(320, el.clientWidth || 800);
        var h = Math.max(240, el.clientHeight || 450);

        // Escena boot mínima para marcar ready; las demás se arrancan con cargarReto
        var Boot = new global.Phaser.Class({
            Extends: global.Phaser.Scene,
            initialize: function Boot() {
                global.Phaser.Scene.call(this, { key: 'QUQBoot' });
            },
            create: function () {
                if (readyResolve) {
                    readyResolve(game);
                    readyResolve = null;
                }
            }
        });

        game = Host.crear({
            type: global.Phaser.AUTO,
            parent: el,
            width: w,
            height: h,
            backgroundColor: '#24160f',
            transparent: false,
            audio: { noAudio: true },
            scene: [Boot].concat(scenes),
            scale: {
                mode: global.Phaser.Scale.RESIZE,
                autoCenter: global.Phaser.Scale.CENTER_BOTH
            }
        });

        if (!game) return Promise.reject(new Error('No se pudo crear Phaser.Game'));

        game.registry.set('quqConfig', opts.gameConfig || {});
        game.registry.set('quqCallbacks', opts.callbacks || {});

        return esperarReady();
    }

    function listo() {
        return !!game;
    }

    function cargarReto(reto) {
        if (!game || !reto) return Promise.reject(new Error('Game o reto ausente'));
        var key = MAPA[reto.tipo];
        if (!key) return Promise.reject(new Error('Tipo desconocido: ' + reto.tipo));

        return new Promise(function (resolve, reject) {
            try {
                // Detener escena activa previa
                Object.keys(MAPA).forEach(function (t) {
                    var k = MAPA[t];
                    if (game.scene.isActive(k)) game.scene.stop(k);
                });
                game.scene.start(key, { reto: reto });
                sceneActiva = game.scene.getScene(key);
                // Esperar un tick a create
                setTimeout(function () {
                    resolve(sceneActiva);
                }, 50);
            } catch (e) {
                reject(e);
            }
        });
    }

    function setInteractivo(on) {
        if (!sceneActiva || typeof sceneActiva.setInteractivo !== 'function') return;
        sceneActiva.setInteractivo(!!on);
    }

    function demoLlevar() {
        if (!sceneActiva || typeof sceneActiva.demoLlevar !== 'function') {
            return Promise.resolve();
        }
        return sceneActiva.demoLlevar();
    }

    function rectPantalla(tipo, id) {
        if (!sceneActiva || typeof sceneActiva.rectPantalla !== 'function') return null;
        return sceneActiva.rectPantalla(tipo, id);
    }

    function setCallbacks(cb) {
        if (game) game.registry.set('quqCallbacks', cb || {});
    }

    function destruir() {
        sceneActiva = null;
        readyPromise = null;
        readyResolve = null;
        game = null;
        if (Host) Host.destruirJuego();
        else if (global.PedniaPhaserHost) global.PedniaPhaserHost.destruirJuego();
    }

    global.PedniaQuienUsaQue = {
        montar: montar,
        listo: listo,
        cargarReto: cargarReto,
        setInteractivo: setInteractivo,
        demoLlevar: demoLlevar,
        rectPantalla: rectPantalla,
        setCallbacks: setCallbacks,
        destruir: destruir
    };
})(typeof window !== 'undefined' ? window : this);
