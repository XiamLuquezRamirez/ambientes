/**
 * Temporizador — cuenta regresiva de la partida de "Golpea a los Topos" (window.Temporizador).
 *
 * Avanza con el evento "update" de la escena Phaser: se detiene solo si la pestaña no se ve (Phaser no
 * avanza) y nunca sigue corriendo después de detener().
 *
 * API: iniciar(seg, { alTic(restanteSeg), alTerminar() }) · detener() · restante() · corriendo()
 */
(function (global) {
    "use strict";

    var E = function () { return global.EscenarioTopos; };
    var restanteMs = 0;
    var activo = false;
    var cb = {};
    var ultimoSeg = -1;
    var enganchado = false;

    function paso(time, delta) {
        if (!activo) return;
        restanteMs -= Math.min(delta || 16, 100);
        var seg = Math.max(0, Math.ceil(restanteMs / 1000));
        if (seg !== ultimoSeg) {
            ultimoSeg = seg;
            if (typeof cb.alTic === "function") cb.alTic(seg);
        }
        if (restanteMs <= 0) {
            activo = false;
            if (typeof cb.alTerminar === "function") cb.alTerminar();
        }
    }

    function iniciar(seg, callbacks) {
        cb = callbacks || {};
        restanteMs = Math.max(1, seg) * 1000;
        ultimoSeg = -1;
        activo = true;
        if (!enganchado && E() && E().escena()) {
            E().escena().events.on("update", paso);
            enganchado = true;
        }
        if (typeof cb.alTic === "function") cb.alTic(Math.ceil(restanteMs / 1000));
    }

    function detener() {
        activo = false;
    }

    global.Temporizador = {
        iniciar: iniciar,
        detener: detener,
        restante: function () { return Math.max(0, restanteMs / 1000); },
        corriendo: function () { return activo; }
    };
})(window);
