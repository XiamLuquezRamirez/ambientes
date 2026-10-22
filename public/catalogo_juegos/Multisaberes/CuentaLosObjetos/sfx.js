/**
 * Tonos cortos. Si hay archivo en config.audios, el juego lo usa y esto queda de reserva.
 */
(function (global) {
    "use strict";

    var ctx = null;

    function asegurar() {
        var C = global.AudioContext || global.webkitAudioContext;
        if (!C) return null;
        if (!ctx) {
            try { ctx = new C(); } catch (e) { return null; }
        }
        if (ctx.state === "suspended") {
            try { ctx.resume(); } catch (e2) { /* noop */ }
        }
        return ctx;
    }

    function tono(frecuencia, duracion, tipo) {
        var audio = asegurar();
        if (!audio) return false;
        var osc = audio.createOscillator();
        var gan = audio.createGain();
        osc.type = tipo || "sine";
        osc.frequency.value = frecuencia;
        gan.gain.setValueAtTime(0.0001, audio.currentTime);
        gan.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.02);
        gan.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duracion);
        osc.connect(gan);
        gan.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + duracion + 0.02);
        return true;
    }

    function sonar(nombre) {
        if (nombre === "error" || nombre === "boing") return tono(196, 0.18, "triangle");
        if (nombre === "numero") return tono(523, 0.12, "sine");
        return tono(660, 0.16, "sine") && tono(880, 0.2, "sine");
    }

    function desbloquear() {
        return Promise.resolve(asegurar());
    }

    var api = { sonar: sonar, desbloquear: desbloquear };
    global.CuentaObjetosSfx = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
