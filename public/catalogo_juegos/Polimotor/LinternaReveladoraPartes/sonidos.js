/**
 * SonidosLuz — efectos cortos sintetizados con Web Audio (window.SonidosLuz).
 * Sin archivos ni licencias: tamborcito de la barriga, acorde de victoria y risita.
 * Si el navegador no tiene Web Audio, cada función simplemente no suena.
 */
(function (global) {
    "use strict";

    var ctx = null;
    var VOL = 0.32;

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
        // respeta el silencio global de PedNia si existe
        var A = global.PedniaAudio;
        if (A && typeof A.silenciado === "function" && A.silenciado()) return 0;
        return VOL;
    }

    function tono(c, t0, f0, f1, dur, tipo, vol) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = tipo || "sine";
        o.frequency.setValueAtTime(f0, t0);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0);
        o.stop(t0 + dur + 0.02);
    }

    function golpe(c, t0, vol) {
        // cuerpo del tambor
        tono(c, t0, 190, 70, 0.22, "sine", vol);
        // parche (ruido corto)
        var largo = Math.floor(c.sampleRate * 0.05);
        var buf = c.createBuffer(1, largo, c.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / largo);
        var src = c.createBufferSource();
        var g = c.createGain();
        var f = c.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 900;
        src.buffer = buf;
        g.gain.value = vol * 0.35;
        src.connect(f);
        f.connect(g);
        g.connect(c.destination);
        src.start(t0);
    }

    /** "¡Tum, tum, tu-tum!" en la barriga. */
    function tambor() {
        var c = audio();
        var v = volumen();
        if (!c || !v) return;
        var t = c.currentTime + 0.02;
        [0, 0.18, 0.32, 0.42].forEach(function (dt, i) {
            golpe(c, t + dt, v * (i === 3 ? 1 : 0.8));
        });
    }

    /** Arpegio brillante y acorde final de victoria. */
    function acorde() {
        var c = audio();
        var v = volumen();
        if (!c || !v) return;
        var t = c.currentTime + 0.02;
        [523.25, 659.25, 783.99].forEach(function (f, i) {
            tono(c, t + i * 0.08, f, f, 0.32, "triangle", v * 0.5);
        });
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f) {
            tono(c, t + 0.26, f, f, 0.9, "triangle", v * 0.32);
        });
        // destellito agudo
        tono(c, t + 0.26, 2093, 3136, 0.25, "sine", v * 0.12);
    }

    /** Risita: tres saltitos agudos. */
    function risita() {
        var c = audio();
        var v = volumen();
        if (!c || !v) return;
        var t = c.currentTime + 0.02;
        [0, 0.13, 0.26].forEach(function (dt, i) {
            tono(c, t + dt, 820 + i * 90, 1250 + i * 120, 0.1, "sine", v * 0.35);
        });
    }

    global.SonidosLuz = { tambor: tambor, acorde: acorde, risita: risita };
})(window);
