/**
 * SonidosSimon — efectos cortos de "¡Simón Dice Corporal!" sintetizados con Web Audio (window.SonidosSimon),
 * sin archivos nuevos. Todo lleva envolvente y armónicos suaves (nada de tonos puros sostenidos):
 *   seleccion()        "clic" acolchado del botón
 *   brillo()           destellos ascendentes (estrellas de "Tocar cabeza")
 *   aplauso()          una palmada (ruido filtrado)
 *   zapateo()          golpe de zapato en la tarima (madera + golpe grave)
 *   nota(f)            nota musical tipo marimba (el botón "canta" en el acierto)
 *   suave()            dos notas graves y cortas, amables (error)
 *   fanfarria()        arpegio alegre (ronda completada)
 *   redoble()          tamborcito antes de mostrar la secuencia
 * Respeta el silencio global de PedNia; sin Web Audio no suena y no falla.
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
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.012);
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
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.008, dur / 4));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.buffer = buf;
        src.connect(f);
        f.connect(g);
        g.connect(c.destination);
        src.start(t0);
    }

    /** Nota tipo marimba: fundamental + 4.ª armónica corta, caída rápida. */
    function marimba(c, t0, f, dur, vol) {
        tono(c, t0, f, dur, "sine", vol);
        tono(c, t0, f * 4, dur * 0.25, "sine", vol * 0.25);
        tono(c, t0, f * 2, dur * 0.5, "triangle", vol * 0.18);
    }

    function con(fn) {
        return function () {
            var c = audio();
            var v = volumen();
            if (!c || !v) return;
            try {
                fn.apply(null, [c, v, c.currentTime + 0.01].concat(Array.prototype.slice.call(arguments)));
            } catch (e) { /* noop */ }
        };
    }

    var seleccion = con(function (c, v, t) {
        ruido(c, t, 0.05, "bandpass", 1800, 900, v * 0.5, 1.4);
        marimba(c, t, 880, 0.12, v * 0.25);
    });

    var brillo = con(function (c, v, t) {
        [1318.5, 1568, 2093, 2637].forEach(function (f, i) {
            tono(c, t + i * 0.06, f, 0.22, "sine", v * 0.16);
        });
    });

    var aplauso = con(function (c, v, t) {
        ruido(c, t, 0.1, "bandpass", 1500, 1100, v * 1.2, 0.9);
        ruido(c, t + 0.008, 0.07, "highpass", 2600, 2600, v * 0.45, 0.7);
    });

    var zapateo = con(function (c, v, t) {
        // tacón en la madera: golpe grave + chasquido seco
        tono(c, t, 120, 0.16, "sine", v * 0.9);
        tono(c, t, 72, 0.22, "sine", v * 0.55);
        ruido(c, t, 0.07, "lowpass", 1400, 300, v * 0.9, 0.7);
        ruido(c, t + 0.004, 0.035, "bandpass", 3200, 2200, v * 0.35, 2);
    });

    var nota = con(function (c, v, t, f) {
        marimba(c, t, f || 659.25, 0.55, v * 0.55);
    });

    var suave = con(function (c, v, t) {
        marimba(c, t, 392, 0.3, v * 0.4);
        marimba(c, t + 0.2, 311.13, 0.4, v * 0.36);
    });

    var fanfarria = con(function (c, v, t) {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
            marimba(c, t + i * 0.11, f, 0.4, v * 0.45);
        });
        [523.25, 659.25, 783.99].forEach(function (f) {
            tono(c, t + 0.46, f, 0.9, "triangle", v * 0.16);
        });
    });

    var redoble = con(function (c, v, t) {
        for (var i = 0; i < 8; i++) {
            ruido(c, t + i * 0.045, 0.05, "bandpass", 900, 600, v * (0.25 + i * 0.05), 1.1);
        }
        tono(c, t + 0.38, 196, 0.2, "sine", v * 0.5);
    });

    global.SonidosSimon = {
        seleccion: seleccion,
        brillo: brillo,
        aplauso: aplauso,
        zapateo: zapateo,
        nota: nota,
        suave: suave,
        fanfarria: fanfarria,
        redoble: redoble
    };
})(window);
