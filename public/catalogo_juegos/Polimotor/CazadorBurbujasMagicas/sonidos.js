/**
 * SonidosBurbujas — efectos de "El Cazador de Burbujas Mágicas" sintetizados con Web Audio (window.SonidosBurbujas).
 *
 * Mismos generadores que SonidosPez (nota con envolvente y filtro, "plop", ráfaga de ruido filtrado): nada de
 * archivos ni de pitidos puros; todo corto y suave, pensado para niños de 3 a 4 años. Respeta el silencio de
 * PedniaAudio.
 *
 *   pop()        la burbuja revienta: chasquido + plop que sube
 *   cascabel()   campanitas alegres (acierto)
 *   estrellas()  destello de estrellas
 *   canasta()    el juguete cae en la canasta (golpecito suave + nota)
 *   brisa()      la burbuja se escapa por arriba: soplo de aire suave
 *   aparece()    burbuja nueva que sale de abajo (muy bajito)
 *   exito()      ronda terminada (arpegio)
 *   fanfarria()  final
 *   fiesta()     lluvia de pops de celebración
 */
(function (global) {
    "use strict";

    var ctx = null;
    var salida = null;
    var VOL = 0.5;
    var ruido = null;

    function audio() {
        if (ctx) {
            if (ctx.state === "suspended" && ctx.resume) ctx.resume();
            return ctx;
        }
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC();
            salida = ctx.createDynamicsCompressor();
            salida.threshold.value = -14;
            salida.ratio.value = 4;
            salida.connect(ctx.destination);
        } catch (e) {
            ctx = null;
        }
        return ctx;
    }

    function silencio() {
        var A = global.PedniaAudio;
        return !!(A && typeof A.silenciado === "function" && A.silenciado());
    }

    function bufRuido(c) {
        if (ruido) return ruido;
        var n = c.sampleRate * 2;
        ruido = c.createBuffer(1, n, c.sampleRate);
        var d = ruido.getChannelData(0);
        var ult = 0;
        for (var i = 0; i < n; i++) {
            ult = (ult + 0.02 * (Math.random() * 2 - 1)) / 1.02;
            d[i] = ult * 3.2;
        }
        return ruido;
    }

    function nota(c, t0, f, dur, vol, tipo, corte) {
        var o = c.createOscillator();
        var o2 = c.createOscillator();
        var g = c.createGain();
        var g2 = c.createGain();
        var fl = c.createBiquadFilter();
        o.type = tipo || "triangle";
        o2.type = "sine";
        o.frequency.setValueAtTime(f, t0);
        o2.frequency.setValueAtTime(f * 2.01, t0);
        fl.type = "lowpass";
        fl.frequency.value = corte || 3200;
        g2.gain.value = 0.25;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(fl);
        o2.connect(g2);
        g2.connect(fl);
        fl.connect(g);
        g.connect(salida);
        o.start(t0);
        o2.start(t0);
        o.stop(t0 + dur + 0.05);
        o2.stop(t0 + dur + 0.05);
    }

    function plop(c, t0, f, vol) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, t0);
        o.frequency.exponentialRampToValueAtTime(f * 2.4, t0 + 0.09);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
        o.connect(g);
        g.connect(salida);
        o.start(t0);
        o.stop(t0 + 0.16);
    }

    function ola(c, t0, dur, f0, f1, vol, q) {
        var src = c.createBufferSource();
        src.buffer = bufRuido(c);
        var fl = c.createBiquadFilter();
        fl.type = "bandpass";
        fl.Q.value = q || 0.9;
        fl.frequency.setValueAtTime(f0, t0);
        fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol * VOL, t0 + dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(fl);
        fl.connect(g);
        g.connect(salida);
        src.start(t0, Math.random());
        src.stop(t0 + dur + 0.05);
    }

    function con(fn) {
        return function () {
            if (silencio()) return;
            var c = audio();
            if (!c) return;
            try { fn.apply(null, [c, c.currentTime + 0.01].concat([].slice.call(arguments))); } catch (e) { /* noop */ }
        };
    }

    var api = {
        pop: con(function (c, t) {
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = "sine";
            var f = 700 + Math.random() * 300;
            o.frequency.setValueAtTime(f, t);
            o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.07);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.2 * VOL, t + 0.004);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
            o.connect(g);
            g.connect(salida);
            o.start(t);
            o.stop(t + 0.11);
            ola(c, t, 0.07, 3600, 1600, 0.16);
            plop(c, t + 0.03, 520 + Math.random() * 160, 0.16);
        }),
        // toque a una burbuja fuerte que aguanta: "boing" de gelatina, corto y gracioso
        toque: con(function (c, t) {
            var o = c.createOscillator();
            var g = c.createGain();
            var fl = c.createBiquadFilter();
            o.type = "triangle";
            o.frequency.setValueAtTime(260, t);
            o.frequency.exponentialRampToValueAtTime(520, t + 0.08);
            o.frequency.exponentialRampToValueAtTime(330, t + 0.22);
            var lfo = c.createOscillator();
            var lg = c.createGain();
            lfo.frequency.value = 18;
            lg.gain.value = 22;
            lfo.connect(lg);
            lg.connect(o.frequency);
            fl.type = "lowpass";
            fl.frequency.value = 1800;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.2 * VOL, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
            o.connect(fl);
            fl.connect(g);
            g.connect(salida);
            o.start(t);
            lfo.start(t);
            o.stop(t + 0.32);
            lfo.stop(t + 0.32);
            plop(c, t, 420, 0.1);
        }),
        cascabel: con(function (c, t) {
            [1318.51, 1567.98, 2093, 1760, 2349.32].forEach(function (f, i) {
                nota(c, t + 0.08 + i * 0.055, f, 0.32, 0.07, "sine", 7000);
            });
            ola(c, t + 0.08, 0.3, 6000, 8000, 0.04, 2);
        }),
        estrellas: con(function (c, t) {
            [1568, 2093, 2637].forEach(function (f, i) { nota(c, t + i * 0.06, f, 0.35, 0.07, "sine", 6000); });
        }),
        canasta: con(function (c, t) {
            ola(c, t, 0.12, 500, 200, 0.22, 1.2);
            nota(c, t + 0.02, 523.25, 0.3, 0.12, "triangle", 2600);
            nota(c, t + 0.1, 783.99, 0.4, 0.1, "triangle", 3200);
        }),
        brisa: con(function (c, t) {
            ola(c, t, 1.3, 500, 1400, 0.16, 0.6);
            ola(c, t + 0.25, 1.0, 900, 420, 0.08, 0.6);
        }),
        aparece: con(function (c, t) {
            plop(c, t, 300 + Math.random() * 120, 0.06);
        }),
        exito: con(function (c, t) {
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { nota(c, t + i * 0.11, f, 0.6, 0.16, "triangle", 5000); });
            nota(c, t + 0.48, 1318.51, 0.9, 0.1, "sine", 6000);
            for (var i = 0; i < 5; i++) plop(c, t + 0.5 + i * 0.07, 600 + i * 120, 0.06);
        }),
        fanfarria: con(function (c, t) {
            var m = [[523.25, 0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.48], [783.99, 0.72], [1046.5, 0.88], [1318.51, 1.1]];
            m.forEach(function (n) { nota(c, t + n[1], n[0], 0.7, 0.16, "triangle", 5200); });
            [261.63, 329.63, 392].forEach(function (f) { nota(c, t + 1.1, f, 1.6, 0.08, "sine", 2000); });
        }),
        fiesta: con(function (c, t) {
            for (var i = 0; i < 9; i++) plop(c, t + i * 0.06 + Math.random() * 0.04, 450 + Math.random() * 900, 0.08);
            nota(c, t + 0.3, 1567.98, 0.5, 0.05, "sine", 7000);
        })
    };

    api.desbloquear = function () { audio(); };
    global.SonidosBurbujas = api;
})(window);
