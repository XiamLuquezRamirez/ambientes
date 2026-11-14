/**
 * SonidosMemoPosturas — efectos cortos sintetizados con Web Audio (window.SonidosMemoPosturas), sin archivos.
 *   volteo()  soplido suave de la tarjeta al girar (ruido filtrado, sin tono)
 *   acorde()  arpegio y acorde mayor alegre (pareja encontrada)
 *   suave()   dos notas graves y cortas, sin pitido (pareja distinta: "no pasa nada")
 *   aplauso() una palmada (ruido corto filtrado)
 *   paso()    pisadita blanda (huellas de los pies)
 * Respeta el silencio global de PedNia; si el navegador no tiene Web Audio, no suena y no falla.
 */
(function (global) {
    "use strict";

    var ctx = null;
    var VOL = 0.3;

    function audio() {
        if (ctx) {
            if (ctx.state === "suspended" && ctx.resume) ctx.resume();
            return ctx;
        }
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC();
        } catch (e) {
            ctx = null;
        }
        return ctx;
    }

    function volumen() {
        var A = global.PedniaAudio;
        if (A && typeof A.silenciado === "function" && A.silenciado()) return 0;
        return VOL;
    }

    function tono(c, t0, f, dur, tipo, vol) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = tipo || "triangle";
        o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.03);
    }

    function ruido(c, t0, dur, tipoFiltro, f0, f1, vol, q) {
        var largo = Math.max(1, Math.floor(c.sampleRate * dur));
        var buf = c.createBuffer(1, largo, c.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
        var src = c.createBufferSource();
        var f = c.createBiquadFilter();
        var g = c.createGain();
        f.type = tipoFiltro;
        f.Q.value = q || 0.8;
        f.frequency.setValueAtTime(f0, t0);
        if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.03, dur / 3));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.buffer = buf;
        src.connect(f);
        f.connect(g);
        g.connect(c.destination);
        src.start(t0);
    }

    function volteo() {
        var c = audio();
        var v = volumen();
        if (!c || !v) return;
        ruido(c, c.currentTime + 0.01, 0.28, "bandpass", 500, 2600, v * 0.55, 1.2);
    }

    function acorde() {
        var c = audio();
        var v = volumen();
        if (!c || !v) return;
        var t = c.currentTime + 0.02;
        [523.25, 659.25, 783.99].forEach(function (f, i) {
            tono(c, t + i * 0.09, f, 0.34, "triangle", v * 0.45);
        });
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f) {
            tono(c, t + 0.3, f, 1.0, "triangle", v * 0.28);
        });
    }

    function suave() {
        var c = audio();
        var v = volumen();
        if (!c || !v) return;
        var t = c.currentTime + 0.02;
        tono(c, t, 392, 0.22, "sine", v * 0.35);
        tono(c, t + 0.18, 329.63, 0.32, "sine", v * 0.3);
    }

    function aplauso() {
        var c = audio();
        var v = volumen();
        if (!c || !v) return;
        var t = c.currentTime + 0.005;
        ruido(c, t, 0.09, "bandpass", 1400, 1100, v * 1.1, 0.9);
        ruido(c, t + 0.012, 0.07, "highpass", 2400, 2400, v * 0.4, 0.7);
    }

    function paso() {
        var c = audio();
        var v = volumen();
        if (!c || !v) return;
        var t = c.currentTime + 0.005;
        ruido(c, t, 0.08, "lowpass", 700, 300, v * 0.9, 0.7);
        tono(c, t, 140, 0.1, "sine", v * 0.35);
    }

    global.SonidosMemoPosturas = { volteo: volteo, acorde: acorde, suave: suave, aplauso: aplauso, paso: paso };
})(window);
