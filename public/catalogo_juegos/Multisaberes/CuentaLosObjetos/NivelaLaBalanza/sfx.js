/* Efectos del juego, API: window.NivelaBalanzaSfx.sonar(tipo). */
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
            case "impacto":
                tono(420, 0.1, "triangle", 0.16);
                setTimeout(function () { tono(280, 0.14, "sine", 0.12); }, 60);
                break;
            case "agarrar":
                tono(720, 0.07, "sine", 0.13);
                break;
            case "colocar":
                tono(560, 0.11, "triangle", 0.2);
                setTimeout(function () { tono(840, 0.12, "triangle", 0.17); }, 70);
                break;
            case "retirar":
                tono(480, 0.1, "triangle", 0.14);
                setTimeout(function () { tono(340, 0.12, "sine", 0.12); }, 70);
                break;
            case "regreso":
                tono(420, 0.08, "triangle", 0.12);
                break;
            case "equilibrio":
                tono(660, 0.12, "sine", 0.18);
                setTimeout(function () { tono(880, 0.14, "sine", 0.18); }, 110);
                setTimeout(function () { tono(1180, 0.22, "sine", 0.16); }, 240);
                break;
            case "gema":
                tono(980, 0.1, "sine", 0.16);
                setTimeout(function () { tono(1320, 0.14, "sine", 0.14); }, 80);
                break;
            case "error":
                tono(220, 0.18, "sawtooth", 0.14);
                setTimeout(function () { tono(180, 0.22, "sawtooth", 0.12); }, 110);
                break;
            case "cofre":
                tono(330, 0.3, "triangle", 0.2);
                setTimeout(function () { tono(660, 0.3, "triangle", 0.2); }, 180);
                setTimeout(function () { tono(990, 0.5, "sine", 0.18); }, 380);
                break;
            default:
                tono(600, 0.12, "sine", 0.15);
        }
    }

    global.NivelaBalanzaSfx = { sonar: sonar };
})(typeof window !== "undefined" ? window : this);
