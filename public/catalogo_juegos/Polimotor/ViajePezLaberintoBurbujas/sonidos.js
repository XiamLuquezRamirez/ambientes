/**
 * SonidosPez — sonidos originales de "¡El Viaje del Pez por el Laberinto de Burbujas!" sintetizados con Web Audio
 * (window.SonidosPez). No hay archivos: todo se crea al vuelo, con envolventes suaves y filtros (nada de pitidos
 * puros), cortos y pensados para niños de 3 a 4 años.
 *
 *   nado(on) · nadoVelocidad(0..1)   agua que se mueve: rumor filtrado y burbujitas que aumentan con la velocidad
 *   burbuja(n)                       "plop" de burbuja que sube de tono con el avance (burbujas que brillan)
 *   revienta()                       burbuja del borde que se revienta (el pez se salió del camino)
 *   estrella(n)                      estrella que aparece en el resumen del nivel (n = 0, 1, 2)
 *   brillo()                         destello corto (pistas, tocar lejos del pez)
 *   alerta()                         "uh-oh" suave y acuoso (el pez se sale del camino)
 *   positivo()                       dos notas que suben (el pez vuelve al camino)
 *   callejon()                       resorte amable que baja (camino sin salida)
 *   regreso()                        remolino de agua (el pez vuelve solo)
 *   corriente()                      ola que pasa (cambio de recorrido)
 *   coral()                          brillo mágico del coral (llegada)
 *   exito()                          arpegio alegre (recorrido completado)
 *   fanfarria()                      celebración larga (final)
 *   fiesta()                         lluvia de burbujas (celebración)
 *   musica()                         objeto { play, pause, volume } con la música ambiental submarina; TextoVoz
 *                                    le ajusta el volumen.
 */
(function (global) {
    "use strict";

    var ctx = null;
    var salida = null;
    var VOL = 1.8;
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
            ult = (ult + 0.02 * (Math.random() * 2 - 1)) / 1.02;   // ruido "marrón": grave y suave
            d[i] = ult * 3.2;
        }
        return ruido;
    }

    /** Nota con envolvente suave y filtro (marimba de agua). */
    function nota(c, t0, f, dur, vol, tipo, corte, destino) {
        var o = c.createOscillator();
        var o2 = c.createOscillator();
        var g = c.createGain();
        var fl = c.createBiquadFilter();
        o.type = tipo || "triangle";
        o2.type = "sine";
        o.frequency.setValueAtTime(f, t0);
        o2.frequency.setValueAtTime(f * 2.01, t0);
        fl.type = "lowpass";
        fl.frequency.value = corte || 3200;
        var g2 = c.createGain();
        g2.gain.value = 0.25;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + 0.015);
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

    /** "Plop" de burbuja: seno corto cuyo tono sube rápido (así suena una burbuja que se forma). */
    function plop(c, t0, f, vol, destino) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, t0);
        o.frequency.exponentialRampToValueAtTime(f * 2.4, t0 + 0.09);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
        o.connect(g);
        g.connect(destino || salida);
        o.start(t0);
        o.stop(t0 + 0.16);
    }

    /** Ráfaga de ruido filtrado con barrido (agua que corre). */
    function ola(c, t0, dur, f0, f1, vol) {
        var src = c.createBufferSource();
        src.buffer = bufRuido(c);
        var fl = c.createBiquadFilter();
        fl.type = "bandpass";
        fl.Q.value = 0.9;
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

    // ------------------------------------------------------------------ nado continuo

    var nadoObj = null;
    var velNado = 0;

    function nado(on) {
        var c = audio();
        if (!c) return;
        if (on && !nadoObj) {
            var src = c.createBufferSource();
            src.buffer = bufRuido(c);
            src.loop = true;
            var fl = c.createBiquadFilter();
            fl.type = "lowpass";
            fl.frequency.value = 300;
            var g = c.createGain();
            g.gain.value = 0.0001;
            src.connect(fl);
            fl.connect(g);
            g.connect(salida);
            src.start();
            // burbujitas al azar: más seguidas cuanto más rápido nada el pez
            var timer = setInterval(function () {
                if (silencio() || !ctx) return;
                if (Math.random() < 0.08 + velNado * 0.55) plop(ctx, ctx.currentTime + Math.random() * 0.05, 380 + Math.random() * 420, 0.05 + velNado * 0.07);
            }, 140);
            nadoObj = { src: src, fl: fl, g: g, timer: timer };
        } else if (!on && nadoObj) {
            var m = nadoObj;
            nadoObj = null;
            clearInterval(m.timer);
            try {
                m.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
                setTimeout(function () { try { m.src.stop(); } catch (e) { /* noop */ } }, 400);
            } catch (e) { /* noop */ }
        }
    }

    /** v de 0 (flotando) a 1 (rápido): sube el rumor del agua y las burbujitas. */
    function nadoVelocidad(v) {
        velNado = Math.max(0, Math.min(1, v || 0));
        if (!nadoObj || !ctx) return;
        var vol = silencio() ? 0.0001 : (0.03 + velNado * 0.2) * VOL;
        nadoObj.g.gain.setTargetAtTime(vol, ctx.currentTime, 0.08);
        nadoObj.fl.frequency.setTargetAtTime(260 + velNado * 700, ctx.currentTime, 0.1);
    }

    // ------------------------------------------------------------------ efectos

    var ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

    var api = {
        nado: nado,
        nadoVelocidad: nadoVelocidad,
        burbuja: con(function (c, t, n) {
            var f = ESCALA[Math.max(0, Math.min(ESCALA.length - 1, n | 0))];
            plop(c, t, f * 0.5, 0.16);
            nota(c, t + 0.04, f, 0.35, 0.08, "sine", 5000);
        }),
        // burbuja que revienta: chasquido corto y un "plop" que baja
        revienta: con(function (c, t) {
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = "sine";
            var f = 900 + Math.random() * 500;
            o.frequency.setValueAtTime(f, t);
            o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.08);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.16 * VOL, t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
            o.connect(g);
            g.connect(salida);
            o.start(t);
            o.stop(t + 0.12);
            ola(c, t, 0.06, 3000, 1500, 0.12);
        }),
        // estrella que aparece en el resumen del nivel (sube según cuál es)
        estrella: con(function (c, t, n) {
            var f = [659.25, 783.99, 1046.5][Math.max(0, Math.min(2, n | 0))];
            nota(c, t, f, 0.5, 0.16, "triangle", 5000);
            nota(c, t + 0.06, f * 1.5, 0.45, 0.07, "sine", 6000);
        }),
        brillo: con(function (c, t) {
            [1568, 2093, 2637].forEach(function (f, i) { nota(c, t + i * 0.06, f, 0.35, 0.08, "sine", 6000); });
        }),
        alerta: con(function (c, t) {
            nota(c, t, 392, 0.22, 0.2, "triangle", 1200);
            nota(c, t + 0.2, 311.13, 0.32, 0.18, "triangle", 1000);
            plop(c, t + 0.1, 260, 0.08);
        }),
        positivo: con(function (c, t) {
            nota(c, t, 659.25, 0.25, 0.14, "triangle", 4000);
            nota(c, t + 0.1, 987.77, 0.35, 0.14, "triangle", 4000);
            plop(c, t + 0.05, 700, 0.08);
        }),
        callejon: con(function (c, t) {
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(520, t);
            o.frequency.exponentialRampToValueAtTime(190, t + 0.5);
            var lfo = c.createOscillator();
            var lg = c.createGain();
            lfo.frequency.value = 12;
            lg.gain.value = 26;
            lfo.connect(lg);
            lg.connect(o.frequency);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.2 * VOL, t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
            o.connect(g);
            g.connect(salida);
            o.start(t);
            lfo.start(t);
            o.stop(t + 0.65);
            lfo.stop(t + 0.65);
        }),
        regreso: con(function (c, t) {
            ola(c, t, 0.7, 1600, 400, 0.3);
            for (var i = 0; i < 4; i++) plop(c, t + 0.1 + i * 0.09, 500 + i * 90, 0.07);
        }),
        corriente: con(function (c, t) {
            ola(c, t, 1.3, 300, 1800, 0.38);
            for (var i = 0; i < 8; i++) plop(c, t + 0.2 + i * 0.1, 400 + Math.random() * 600, 0.06);
        }),
        coral: con(function (c, t) {
            [783.99, 987.77, 1174.66, 1567.98].forEach(function (f, i) { nota(c, t + i * 0.09, f, 0.9, 0.09, "sine", 6000); });
        }),
        exito: con(function (c, t) {
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { nota(c, t + i * 0.11, f, 0.6, 0.18, "triangle", 5000); });
            nota(c, t + 0.48, 1318.51, 0.9, 0.12, "sine", 6000);
            for (var i = 0; i < 5; i++) plop(c, t + 0.5 + i * 0.07, 600 + i * 120, 0.06);
        }),
        fanfarria: con(function (c, t) {
            var m = [[523.25, 0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.48], [783.99, 0.72], [1046.5, 0.88], [1318.51, 1.1]];
            m.forEach(function (n) { nota(c, t + n[1], n[0], 0.7, 0.18, "triangle", 5200); });
            [261.63, 329.63, 392].forEach(function (f) { nota(c, t + 1.1, f, 1.6, 0.09, "sine", 2000); });
        }),
        fiesta: con(function (c, t) {
            for (var i = 0; i < 9; i++) plop(c, t + i * 0.06 + Math.random() * 0.04, 450 + Math.random() * 900, 0.08);
            nota(c, t + 0.3, 1567.98, 0.5, 0.05, "sine", 7000);
        })
    };

    // ------------------------------------------------------------------ música ambiental submarina

    var musicaObj = null;

    /**
     * Pad lento y ondulante (Fa – Re menor – Si bemol – Do) con un vaivén de filtro, como luz entrando al agua,
     * y burbujitas suaves de vez en cuando. Se comporta como un <audio> para TextoVoz: play(), pause(), volume.
     */
    function musica() {
        if (musicaObj) return musicaObj;
        var vol = 0.2;
        var g = null;
        var timer = null;
        var paso = 0;
        var ACORDES = [[174.61, 220, 261.63], [146.83, 220, 293.66], [233.08, 293.66, 349.23], [196, 261.63, 329.63]];
        function aplicar() {
            if (g && ctx) g.gain.setTargetAtTime(silencio() ? 0.0001 : Math.min(0.85, Math.max(0.0001, vol * 2.2)), ctx.currentTime, 0.4);
        }
        function acorde() {
            var c = audio();
            if (!c || !g) return;
            var t = c.currentTime;
            var ac = ACORDES[paso % ACORDES.length];
            paso++;
            ac.forEach(function (f, i) {
                var o = c.createOscillator();
                var o2 = c.createOscillator();
                var gg = c.createGain();
                var fl = c.createBiquadFilter();
                o.type = "triangle";
                o2.type = "sine";
                o.frequency.value = f;
                o2.frequency.value = f * 1.006;
                fl.type = "lowpass";
                fl.frequency.setValueAtTime(500, t);
                fl.frequency.linearRampToValueAtTime(1100, t + 3);
                fl.frequency.linearRampToValueAtTime(500, t + 6.2);
                gg.gain.setValueAtTime(0.0001, t);
                gg.gain.exponentialRampToValueAtTime(0.1, t + 1.8);
                gg.gain.setValueAtTime(0.1, t + 4.2);
                gg.gain.exponentialRampToValueAtTime(0.0001, t + 6.4);
                o.connect(fl);
                o2.connect(fl);
                fl.connect(gg);
                gg.connect(g);
                o.start(t + i * 0.06);
                o2.start(t + i * 0.06);
                o.stop(t + 6.6);
                o2.stop(t + 6.6);
            });
            // burbujitas y una gota de marimba al azar
            for (var k = 0; k < 4; k++) {
                if (Math.random() < 0.55) plop(c, t + 0.5 + Math.random() * 5, 500 + Math.random() * 500, 0.06, g);
            }
            if (Math.random() < 0.6) nota(c, t + 1 + Math.random() * 3, ac[2] * 2, 1.2, 0.06, "sine", 3000, g);
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
                    acorde();
                    timer = setInterval(acorde, 5800);
                }
                return Promise.resolve();
            },
            pause: function () {
                clearInterval(timer);
                timer = null;
                if (g && ctx) g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
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
    global.SonidosPez = api;
})(window);
