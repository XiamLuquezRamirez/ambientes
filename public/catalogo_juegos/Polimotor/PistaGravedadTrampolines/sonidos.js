/**
 * SonidosGravedad — sonidos originales de "La Pista de Gravedad y Trampolines", sintetizados con Web Audio
 * (window.SonidosGravedad). Sin archivos: envolventes suaves y filtros pasa-bajos, cortos y bajitos. Ningún sonido de
 * error: la caída es un "fiuuu" juguetón y el rescate, un brillo que sube.
 *
 *   rodar(on) · rodarVelocidad(0..1, pendiente)   rodar de la esfera (sube con la rapidez; en bajada suena el viento)
 *   alerta()       cerca de un agujero: dos campanitas suaves
 *   caida()        la esfera cae al agujero
 *   rescate()      rayo tractor que la sube y la lleva al punto seguro
 *   trampolin()    resorte del trampolín (boing)        salto()  impulso por el aire     aterriza()  llegada suave
 *   pared()        roce con la baranda                  seguro() se enciende un punto seguro
 *   meta() · brillo() · aparece() · exito() · fanfarria() · fiesta() · laser() · trofeo()
 *   silenciar(on) · musica() { play, pause, volume, modo("intro"|"juego"|"final") }
 */
(function (global) {
    "use strict";

    var ctx = null;
    var salida = null;
    var maestro = null;
    var VOL = 0.5;
    var ruido = null;
    var mudo = false;

    function audio() {
        if (ctx) {
            if (ctx.state === "suspended" && ctx.resume) ctx.resume();
            return ctx;
        }
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC();
            maestro = ctx.createGain();
            maestro.gain.value = mudo ? 0 : 1;
            maestro.connect(ctx.destination);
            salida = ctx.createDynamicsCompressor();
            salida.threshold.value = -16;
            salida.ratio.value = 4;
            salida.connect(maestro);
        } catch (e) {
            ctx = null;
        }
        return ctx;
    }

    function bufRuido(c) {
        if (ruido) return ruido;
        var n = c.sampleRate * 2;
        ruido = c.createBuffer(1, n, c.sampleRate);
        var d = ruido.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return ruido;
    }

    function nota(c, t0, f, dur, vol, tipo, corte, destino, f1) {
        var o = c.createOscillator();
        var o2 = c.createOscillator();
        var g = c.createGain();
        var g2 = c.createGain();
        var fl = c.createBiquadFilter();
        o.type = tipo || "triangle";
        o2.type = "sine";
        o.frequency.setValueAtTime(f, t0);
        o2.frequency.setValueAtTime(f * 2.003, t0);
        if (f1) {
            o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
            o2.frequency.exponentialRampToValueAtTime(f1 * 2.003, t0 + dur);
        }
        fl.type = "lowpass";
        fl.frequency.value = corte || 3200;
        g2.gain.value = 0.22;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(fl);
        o2.connect(g2);
        g2.connect(fl);
        fl.connect(g);
        g.connect(destino || salida);
        o.start(t0);
        o2.start(t0);
        o.stop(t0 + dur + 0.05);
        o2.stop(t0 + dur + 0.05);
    }

    function rafaga(c, t0, dur, f0, f1, vol, q, destino) {
        var src = c.createBufferSource();
        src.buffer = bufRuido(c);
        var fl = c.createBiquadFilter();
        fl.type = "bandpass";
        fl.Q.value = q || 1;
        fl.frequency.setValueAtTime(f0, t0);
        fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + dur * 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(fl);
        fl.connect(g);
        g.connect(destino || salida);
        src.start(t0, Math.random());
        src.stop(t0 + dur + 0.05);
    }

    function golpe(c, t0, f, vol) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f * 1.8, t0);
        o.frequency.exponentialRampToValueAtTime(f, t0 + 0.08);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.connect(g);
        g.connect(salida);
        o.start(t0);
        o.stop(t0 + 0.32);
    }

    function con(fn) {
        return function () {
            if (mudo) return;
            var c = audio();
            if (!c) return;
            try { fn.apply(null, [c, c.currentTime + 0.01].concat([].slice.call(arguments))); } catch (e) { /* noop */ }
        };
    }

    // ------------------------------------------------------------------ rodar (bucle continuo)

    var rod = null;

    /** Rodar: ruido grave filtrado con un zumbido muy suave; en bajada rápida se abre un soplido de viento. */
    function rodar(on) {
        var c = audio();
        if (!c) return;
        if (on && !rod) {
            var src = c.createBufferSource();
            var fl = c.createBiquadFilter();
            var g = c.createGain();
            var o = c.createOscillator();
            var go = c.createGain();
            var src2 = c.createBufferSource();
            var fl2 = c.createBiquadFilter();
            var g2 = c.createGain();
            src.buffer = bufRuido(c);
            src.loop = true;
            fl.type = "lowpass";
            fl.frequency.value = 260;
            o.type = "sine";
            o.frequency.value = 96;
            go.gain.value = 0.25;
            src2.buffer = bufRuido(c);
            src2.loop = true;
            fl2.type = "bandpass";
            fl2.frequency.value = 1200;
            fl2.Q.value = 0.7;
            g2.gain.value = 0.0001;
            g.gain.value = 0.0001;
            src.connect(fl);
            o.connect(go);
            go.connect(fl);
            fl.connect(g);
            g.connect(salida);
            src2.connect(fl2);
            fl2.connect(g2);
            g2.connect(salida);
            src.start(); o.start(); src2.start();
            rod = { src: src, src2: src2, o: o, fl: fl, g: g, fl2: fl2, g2: g2 };
        } else if (!on && rod) {
            var r = rod;
            rod = null;
            try {
                r.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
                r.g2.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
                setTimeout(function () { try { r.src.stop(); r.src2.stop(); r.o.stop(); } catch (e) { /* noop */ } }, 500);
            } catch (e) { /* noop */ }
        }
    }

    function rodarVelocidad(v, bajada) {
        if (!rod || !ctx) return;
        v = Math.max(0, Math.min(1, v || 0));
        var t = ctx.currentTime;
        rod.g.gain.setTargetAtTime(v < 0.03 ? 0.0001 : (0.05 + v * 0.16) * VOL, t, 0.07);
        rod.fl.frequency.setTargetAtTime(180 + v * 520, t, 0.1);
        rod.o.frequency.setTargetAtTime(80 + v * 70, t, 0.1);
        var viento = bajada ? Math.max(0, v - 0.35) : 0;
        rod.g2.gain.setTargetAtTime(viento < 0.02 ? 0.0001 : viento * 0.09 * VOL, t, 0.15);
        rod.fl2.frequency.setTargetAtTime(900 + v * 1800, t, 0.15);
    }

    // ------------------------------------------------------------------ efectos

    var api = {
        rodar: rodar,
        rodarVelocidad: rodarVelocidad,
        alerta: con(function (c, t) {
            nota(c, t, 880, 0.25, 0.07, "sine", 3000);
            nota(c, t + 0.16, 698.46, 0.32, 0.06, "sine", 2600);
        }),
        caida: con(function (c, t) {
            nota(c, t, 880, 0.75, 0.09, "sine", 2400, null, 220);
            rafaga(c, t, 0.7, 2400, 300, 0.05, 1.4);
            nota(c, t + 0.7, 196, 0.25, 0.05, "sine", 900, null, 150);
        }),
        rescate: con(function (c, t) {
            nota(c, t, 262, 1.3, 0.08, "sine", 3600, null, 1046.5);
            rafaga(c, t, 1.2, 500, 6000, 0.05, 1);
            [783.99, 987.77, 1174.66, 1567.98].forEach(function (f, i) { nota(c, t + 0.9 + i * 0.09, f, 0.45, 0.06, "triangle", 6000); });
        }),
        trampolin: con(function (c, t) {
            // resorte: un tono que sube con un temblor
            var o = c.createOscillator();
            var lfo = c.createOscillator();
            var lg = c.createGain();
            var g = c.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(160, t);
            o.frequency.exponentialRampToValueAtTime(620, t + 0.35);
            lfo.frequency.value = 22;
            lg.gain.value = 40;
            lfo.connect(lg);
            lg.connect(o.frequency);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.16 * VOL, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
            o.connect(g);
            g.connect(salida);
            o.start(t); lfo.start(t);
            o.stop(t + 0.55); lfo.stop(t + 0.55);
            golpe(c, t, 110, 0.18);
        }),
        salto: con(function (c, t) {
            rafaga(c, t, 0.9, 400, 2600, 0.07, 0.8);
            nota(c, t + 0.05, 523.25, 0.4, 0.05, "triangle", 4000, null, 1046.5);
        }),
        aterriza: con(function (c, t) {
            golpe(c, t, 90, 0.24);
            rafaga(c, t, 0.35, 1800, 500, 0.05, 1);
            [1318.51, 1567.98].forEach(function (f, i) { nota(c, t + 0.08 + i * 0.07, f, 0.3, 0.04, "sine", 6000); });
        }),
        pared: con(function (c, t) {
            golpe(c, t, 180, 0.12);
            nota(c, t, 392, 0.15, 0.03, "triangle", 1800);
        }),
        seguro: con(function (c, t) {
            [659.25, 987.77, 1318.51].forEach(function (f, i) { nota(c, t + i * 0.07, f, 0.4, 0.07, "sine", 6000); });
        }),
        meta: con(function (c, t) {
            [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach(function (f, i) { nota(c, t + i * 0.1, f, 0.6, 0.12, "triangle", 5200); });
            rafaga(c, t + 0.3, 1.0, 800, 6000, 0.05, 1.2);
        }),
        laser: con(function (c, t) {
            for (var i = 0; i < 3; i++) nota(c, t + i * 0.12, 1600 - i * 200, 0.22, 0.04, "sine", 5000, null, 500);
        }),
        trofeo: con(function (c, t) {
            nota(c, t, 196, 1.4, 0.08, "triangle", 2000, null, 392);
            [783.99, 987.77, 1174.66, 1567.98, 1975.53].forEach(function (f, i) { nota(c, t + 0.5 + i * 0.08, f, 0.7, 0.07, "sine", 7000); });
            rafaga(c, t + 0.4, 1.2, 1200, 8000, 0.05, 1.5);
        }),
        aparece: con(function (c, t) {
            nota(c, t, 330, 0.55, 0.08, "sine", 2400, null, 990);
            rafaga(c, t, 0.5, 800, 5000, 0.05, 1.2);
            nota(c, t + 0.4, 1318.51, 0.4, 0.05, "sine", 6000);
        }),
        brillo: con(function (c, t) {
            [1568, 2093, 2637].forEach(function (f, i) { nota(c, t + i * 0.06, f, 0.35, 0.06, "sine", 6000); });
        }),
        exito: con(function (c, t) {
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { nota(c, t + i * 0.11, f, 0.6, 0.15, "triangle", 5000); });
            nota(c, t + 0.48, 1318.51, 0.9, 0.09, "sine", 6000);
        }),
        fanfarria: con(function (c, t) {
            var m = [[523.25, 0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.48], [783.99, 0.72], [1046.5, 0.88], [1318.51, 1.1]];
            m.forEach(function (n) { nota(c, t + n[1], n[0], 0.7, 0.15, "triangle", 5200); });
            [261.63, 329.63, 392].forEach(function (f) { nota(c, t + 1.1, f, 1.6, 0.07, "sine", 2000); });
            rafaga(c, t + 1.1, 1.2, 600, 6000, 0.06, 1);
        }),
        fiesta: con(function (c, t) {
            for (var i = 0; i < 3; i++) {
                var t1 = t + i * 0.22 + Math.random() * 0.1;
                rafaga(c, t1, 0.35, 600, 3800, 0.06, 1.2);
                nota(c, t1 + 0.3, 1046.5 + Math.random() * 800, 0.5, 0.05, "sine", 7000);
            }
        })
    };

    // ------------------------------------------------------------------ música

    var musicaObj = null;

    /**
     * Tres ambientes sobre el mismo objeto (se comporta como un <audio> para TextoVoz):
     *   "juego": colchón flotante (Fa – Re menor – Si bemol – Do) con campanitas lejanas: gravedad cero.
     *   "intro": el mismo colchón con un arpegio que presenta la pista.
     *   "final": música de victoria, arpegio alegre y más rápido.
     */
    function musica() {
        if (musicaObj) return musicaObj;
        var vol = 0.2;
        var g = null;
        var timer = null;
        var paso = 0;
        var modo = "juego";
        var ACORDES = [[349.23, 440, 523.25], [293.66, 349.23, 440], [233.08, 293.66, 349.23], [261.63, 329.63, 392]];
        var ARP_FINAL = [523.25, 659.25, 783.99, 1046.5];
        function aplicar() {
            if (g && ctx) g.gain.setTargetAtTime(Math.max(0.0001, vol * 0.5), ctx.currentTime, 0.4);
        }
        function ciclo() {
            var c = audio();
            if (!c || !g) return;
            var t = c.currentTime;
            var ac = ACORDES[paso % ACORDES.length];
            paso++;
            var dur = modo === "final" ? 3.2 : 4.8;
            ac.forEach(function (f, i) {
                var o = c.createOscillator();
                var o2 = c.createOscillator();
                var gg = c.createGain();
                var fl = c.createBiquadFilter();
                o.type = "triangle";
                o2.type = "sine";
                o.frequency.value = f / 2;
                o2.frequency.value = f * 1.004;
                fl.type = "lowpass";
                fl.frequency.setValueAtTime(500, t);
                fl.frequency.linearRampToValueAtTime(modo === "final" ? 1800 : 1200, t + dur / 2);
                fl.frequency.linearRampToValueAtTime(500, t + dur);
                gg.gain.setValueAtTime(0.0001, t);
                gg.gain.exponentialRampToValueAtTime(0.07, t + 1.0);
                gg.gain.setValueAtTime(0.07, t + dur - 1.0);
                gg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
                o.connect(fl);
                o2.connect(fl);
                fl.connect(gg);
                gg.connect(g);
                o.start(t + i * 0.05);
                o2.start(t + i * 0.05);
                o.stop(t + dur + 0.7);
                o2.stop(t + dur + 0.7);
            });
            if (modo === "intro") {
                for (var k = 0; k < 12; k++) nota(c, t + 0.2 + k * 0.38, ac[k % 3] * 2, 0.35, 0.05, "sine", 4200, g);
            } else if (modo === "final") {
                for (var q = 0; q < 12; q++) nota(c, t + 0.05 + q * 0.25, ARP_FINAL[q % 4] * (q >= 8 ? 1.5 : 1), 0.26, 0.07, "triangle", 4800, g);
                golpe(c, t, 80, 0.15);
                golpe(c, t + 1.6, 80, 0.15);
            } else {
                // pulso suave de "rebote" y campanitas en el aire
                for (var b = 0; b < 4; b++) nota(c, t + b * 1.2, ac[0], 0.5, 0.025, "sine", 1500, g, ac[0] * 1.5);
                for (var s = 0; s < 3; s++) {
                    if (Math.random() < 0.7) nota(c, t + 0.6 + s * 1.5 + Math.random() * 0.7, ac[Math.floor(Math.random() * 3)] * 4, 1.1, 0.022, "sine", 7000, g);
                }
            }
        }
        function reprogramar() {
            clearInterval(timer);
            timer = setInterval(ciclo, modo === "final" ? 3200 : 4800);
        }
        musicaObj = {
            play: function () {
                var c = audio();
                if (!c) return Promise.resolve();
                if (!g) {
                    g = c.createGain();
                    g.gain.value = 0.0001;
                    g.connect(salida);
                }
                aplicar();
                if (!timer) {
                    ciclo();
                    reprogramar();
                }
                return Promise.resolve();
            },
            pause: function () {
                clearInterval(timer);
                timer = null;
                if (g && ctx) g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
            },
            modo: function (m) {
                if (m === modo) return;
                modo = m || "juego";
                if (timer) {
                    ciclo();
                    reprogramar();
                }
            },
            get volume() { return vol; },
            set volume(v) {
                vol = Math.max(0, Math.min(1, Number(v) || 0));
                aplicar();
            }
        };
        return musicaObj;
    }

    api.musica = musica;
    api.desbloquear = function () { audio(); };
    api.silenciar = function (on) {
        mudo = !!on;
        if (maestro && ctx) maestro.gain.setTargetAtTime(mudo ? 0 : 1, ctx.currentTime, 0.05);
    };
    api.silenciado = function () { return mudo; };
    global.SonidosGravedad = api;
})(window);
