/**
 * PedniaPhaserHost — ciclo de vida mínimo de Phaser (vendor del catálogo).
 *
 * Usado por el sandbox (/prueba-phaser) y el piloto
 * Polimotor/ArrastrarYSoltarObjetos. Contrato alineado con intro3d
 * (window.__introPhaser) y una sola instancia de gameplay
 * (window.__pedniaPhaserGame).
 *
 * Requiere: Phaser 4 global (public/assets/vendor/phaser/phaser.min.js).
 */
(function (global) {
    'use strict';

    var INTRO_KEY = '__introPhaser';
    var GAME_KEY = '__pedniaPhaserGame';

    function destruirInstancia(ref, clave) {
        if (!ref) {
            if (clave) global[clave] = null;
            return;
        }
        try {
            ref.destroy(true);
        } catch (e) { /* noop */ }
        if (clave) global[clave] = null;
    }

    /**
     * Destruye el overlay Phaser de intro3d si existe.
     * Llamar siempre antes de crear el Phaser de gameplay.
     */
    function destruirIntro() {
        destruirInstancia(global[INTRO_KEY], INTRO_KEY);
    }

    /**
     * Destruye el juego de gameplay gestionado por este host.
     */
    function destruirJuego() {
        destruirInstancia(global[GAME_KEY], GAME_KEY);
    }

    /**
     * Intro off + gameplay off. Usar al salir del paquete o al “jugar de nuevo”.
     */
    function destruirTodo() {
        destruirIntro();
        destruirJuego();
    }

    /**
     * Crea un Phaser.Game de gameplay. Destruye intro y juego previos.
     *
     * @param {object} config Config de Phaser 4 (se fuerza parent si se pasa).
     * @returns {Phaser.Game|null}
     */
    function crear(config) {
        if (typeof global.Phaser === 'undefined') {
            console.error('[PedniaPhaserHost] Phaser no está cargado (vendor 4.2.1).');
            return null;
        }

        destruirTodo();

        var cfg = Object.assign({}, config || {});
        var game = new global.Phaser.Game(cfg);
        global[GAME_KEY] = game;
        return game;
    }

    /**
     * ¿Hay instancia de gameplay viva?
     */
    function activo() {
        return !!global[GAME_KEY];
    }

    global.PedniaPhaserHost = {
        crear: crear,
        destruirIntro: destruirIntro,
        destruirJuego: destruirJuego,
        destruirTodo: destruirTodo,
        activo: activo,
        INTRO_KEY: INTRO_KEY,
        GAME_KEY: GAME_KEY
    };
})(typeof window !== 'undefined' ? window : this);
