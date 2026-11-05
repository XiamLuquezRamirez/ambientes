/* Efectos del juego, API: window.CoheteEstelarSfx.sonar(tipo). */
(function (global) {
    "use strict";
    var ctx = null;

    function asegurarCtx() {
        if (ctx) return ctx;
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            ctx = new AC();
        } catch (e) { ctx = null; }
        return ctx;
    }

    function activa() {
        return !(document.body && document.body.classList.contains("sin-efectos"));
    }

    function tono(freq, dur, tipo, ganancia) {
        if (!activa()) return;
        var c = asegurarCtx();
        if (!c) return;
        try {
            var osc = c.createOscillator();
            var g = c.createGain();
            osc.type = tipo || "sine";
            osc.frequency.value = freq;
            g.gain.value = 0;
            g.gain.linearRampToValueAtTime(ganancia || 0.18, c.currentTime + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
            osc.connect(g); g.connect(c.destination);
            osc.start();
            osc.stop(c.currentTime + dur);
        } catch (e) {}
    }

    function sonar(tipo) {
        switch (tipo) {
            case "bloque":
                tono(520, 0.12, "triangle", 0.2);
                setTimeout(function () { tono(780, 0.12, "triangle", 0.18); }, 70);
                break;
            case "numero":
                tono(660, 0.08, "sine", 0.15);
                break;
            case "error":
                tono(220, 0.18, "sawtooth", 0.15);
                setTimeout(function () { tono(180, 0.22, "sawtooth", 0.13); }, 110);
                break;
            case "despegue":
                tono(220, 0.6, "sawtooth", 0.2);
                setTimeout(function () { tono(440, 0.4, "triangle", 0.2); }, 180);
                setTimeout(function () { tono(880, 0.6, "sine", 0.18); }, 420);
                break;
            case "regreso":
                tono(420, 0.08, "triangle", 0.12);
                break;
            default:
                tono(600, 0.12, "sine", 0.15);
        }
    }

    global.CoheteEstelarSfx = { sonar: sonar };
})(typeof window !== "undefined" ? window : this);
