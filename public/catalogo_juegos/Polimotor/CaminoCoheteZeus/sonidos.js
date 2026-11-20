/**
 * SonidosCohete — sonidos originales de "¡El Camino del Cohete de Zeus!" sintetizados con Web Audio
 * (window.SonidosCohete). No hay archivos nuevos: todo se crea al vuelo, con envolventes suaves y filtros
 * (nada de pitidos puros), pensado para niños de 3 a 4 años.
 *
 *   motor(on) · motorVelocidad(0..1)   propulsor: ruido filtrado que crece con la velocidad del cohete
 *   luz(n)                              nota de campanita que sube con el avance (luces que se encienden)
 *   estrella()                          brillo corto (estrellas, pistas)
 *   alerta()                            "¡uh-oh!" suave (el cohete se sale de la pista)
 *   callejon()                          resorte amable que baja (camino sin salida)
 *   regreso()                           ráfaga de aire (el cohete vuelve solo a la pista)
 *   despegue()                          ráfaga que sube (inicio de cada recorrido)
 *   compuerta() · compuertaCierra()     persianas del hangar de la estación
 *   exito()                             arpegio alegre (recorrido completado)
 *   fanfarria()                         celebración larga (misión completada)
 *   fuegos()                            estallido de fuego artificial
 *   musica()                            objeto { play, pause, volume } con la música ambiental espacial
 *                                       (acordes lentos de pad); TextoVoz le ajusta el volumen.
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
            // ruido "marrón": más grave y suave que el blanco
            ult = (ult + 0.02 * (Math.random() * 2 - 1)) / 1.02;
            d[i] = ult * 3.2;
        }
        return ruido;
    }

    /** Nota con envolvente suave y filtro (timbre de campanita o de marimba). */
    function nota(c, t0, f, dur, vol, tipo, corte) {
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
        g.connect(salida);
        o.start(t0);
        o2.start(t0);
        o.stop(t0 + dur + 0.05);
        o2.stop(t0 + dur + 0.05);
    }

    /** Ráfaga de ruido filtrado con barrido de frecuencia (aire, propulsión). */
    function rafaga(c, t0, dur, f0, f1, vol) {
        var src = c.createBufferSource();
        src.buffer = bufRuido(c);
        var fl = c.createBiquadFilter();
        fl.type = "bandpass";
        fl.Q.value = 1.2;
        fl.frequency.setValueAtTime(f0, t0);
        fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol * VOL, t0 + dur * 0.25);
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

    // ------------------------------------------------------------------ propulsor continuo

    var mot = null;

    function motor(on) {
        var c = audio();
        if (!c) return;
        if (on && !mot) {
            var src = c.createBufferSource();
            src.buffer = bufRuido(c);
            src.loop = true;
            var fl = c.createBiquadFilter();
            fl.type = "lowpass";
            fl.frequency.value = 380;
            var g = c.createGain();
            g.gain.value = 0.0001;
            // un zumbido grave muy bajo para que suene a motor y no a viento
            var o = c.createOscillator();
            o.type = "sawtooth";
            o.frequency.value = 52;
            var fo = c.createBiquadFilter();
            fo.type = "lowpass";
            fo.frequency.value = 160;
            var go = c.createGain();
            go.gain.value = 0.18;
            o.connect(fo);
            fo.connect(go);
            go.connect(g);
            src.connect(fl);
            fl.connect(g);
            g.connect(salida);
            src.start();
            o.start();
            mot = { src: src, fl: fl, g: g, o: o };
        } else if (!on && mot) {
            var m = mot;
            mot = null;
            try {
                m.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
                setTimeout(function () { try { m.src.stop(); m.o.stop(); } catch (e) { /* noop */ } }, 400);
            } catch (e) { /* noop */ }
        }
    }

    /** v de 0 (quieto, flotando) a 1 (a toda velocidad): sube el volumen y el brillo del propulsor. */
    function motorVelocidad(v) {
        if (!mot || !ctx) return;
        var k = Math.max(0, Math.min(1, v));
        var vol = silencio() ? 0.0001 : (0.05 + k * 0.32) * VOL;
        mot.g.gain.setTargetAtTime(vol, ctx.currentTime, 0.07);
        mot.fl.frequency.setTargetAtTime(320 + k * 1100, ctx.currentTime, 0.08);
        mot.o.frequency.setTargetAtTime(48 + k * 30, ctx.currentTime, 0.1);
    }

    // ------------------------------------------------------------------ efectos

    var ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

    var api = {
        motor: motor,
        motorVelocidad: motorVelocidad,
        luz: con(function (c, t, n) {
            var f = ESCALA[Math.max(0, Math.min(ESCALA.length - 1, n | 0))];
            nota(c, t, f, 0.5, 0.16, "triangle", 4200);
        }),
        estrella: con(function (c, t) {
            [1568, 2093, 2637].forEach(function (f, i) { nota(c, t + i * 0.06, f, 0.35, 0.09, "sine", 6000); });
        }),
        alerta: con(function (c, t) {
            nota(c, t, 392, 0.22, 0.22, "triangle", 1400);
            nota(c, t + 0.2, 311.13, 0.32, 0.2, "triangle", 1200);
        }),
        callejon: con(function (c, t) {
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(520, t);
            o.frequency.exponentialRampToValueAtTime(180, t + 0.5);
            var lfo = c.createOscillator();
            var lg = c.createGain();
            lfo.frequency.value = 14;
            lg.gain.value = 30;
            lfo.connect(lg);
            lg.connect(o.frequency);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.22 * VOL, t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
            o.connect(g);
            g.connect(salida);
            o.start(t);
            lfo.start(t);
            o.stop(t + 0.65);
            lfo.stop(t + 0.65);
        }),
        // compuertas del hangar: zumbido mecánico que sube (abre) o baja (cierra) y un golpe suave al final
        compuerta: con(function (c, t) {
            rafaga(c, t, 0.65, 260, 900, 0.3);
            nota(c, t, 110, 0.6, 0.12, "sawtooth", 500);
            nota(c, t + 0.6, 523.25, 0.3, 0.12, "triangle", 3000);
            nota(c, t + 0.72, 783.99, 0.4, 0.12, "triangle", 3000);
        }),
        compuertaCierra: con(function (c, t) {
            rafaga(c, t, 0.5, 900, 260, 0.28);
            nota(c, t, 98, 0.5, 0.12, "sawtooth", 450);
            nota(c, t + 0.48, 130.81, 0.25, 0.25, "sine", 600);
        }),
        regreso: con(function (c, t) {
            rafaga(c, t, 0.7, 2400, 500, 0.35);
        }),
        despegue: con(function (c, t) {
            rafaga(c, t, 1.1, 300, 2600, 0.45);
            nota(c, t + 0.5, 659.25, 0.4, 0.1, "sine");
            nota(c, t + 0.65, 987.77, 0.5, 0.1, "sine");
        }),
        exito: con(function (c, t) {
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { nota(c, t + i * 0.11, f, 0.6, 0.2, "triangle", 5000); });
            nota(c, t + 0.48, 1318.51, 0.9, 0.14, "sine", 6000);
        }),
        fanfarria: con(function (c, t) {
            var m = [[523.25, 0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.48], [783.99, 0.72], [1046.5, 0.88], [1318.51, 1.1]];
            m.forEach(function (n) { nota(c, t + n[1], n[0], 0.7, 0.2, "triangle", 5200); });
            [261.63, 329.63, 392].forEach(function (f) { nota(c, t + 1.1, f, 1.6, 0.1, "sine", 2000); });
        }),
        fuegos: con(function (c, t) {
            rafaga(c, t, 0.5, 900, 3200, 0.22);
            for (var i = 0; i < 6; i++) nota(c, t + 0.35 + i * 0.05, 1800 + Math.random() * 1600, 0.25, 0.05, "sine", 7000);
        })
    };

    // ------------------------------------------------------------------ música ambiental espacial

    var musicaObj = null;

    /**
     * Pad de acordes lentos (Do – La menor – Fa – Sol) con un leve vibrato y estrellitas que titilan de vez en
     * cuando. Se comporta como un <audio> para TextoVoz: play(), pause() y volume (0..1).
     */
    function musica() {
        if (musicaObj) return musicaObj;
        var vol = 0.2;
        var g = null;
        var voces = [];
        var timer = null;
        var paso = 0;
        var ACORDES = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]];
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
                o2.frequency.value = f * 1.005;
                fl.type = "lowpass";
                fl.frequency.value = 900;
                gg.gain.setValueAtTime(0.0001, t);
                gg.gain.exponentialRampToValueAtTime(0.11, t + 1.6);
                gg.gain.setValueAtTime(0.11, t + 4.2);
                gg.gain.exponentialRampToValueAtTime(0.0001, t + 6.4);
                o.connect(fl);
                o2.connect(fl);
                fl.connect(gg);
                gg.connect(g);
                o.start(t + i * 0.05);
                o2.start(t + i * 0.05);
                o.stop(t + 6.6);
                o2.stop(t + 6.6);
            });
            // destellos agudos (estrellas) al azar
            for (var k = 0; k < 3; k++) {
                if (Math.random() < 0.6) {
                    var tt = t + 0.6 + Math.random() * 4;
                    var o3 = c.createOscillator();
                    var g3 = c.createGain();
                    o3.type = "sine";
                    o3.frequency.value = ac[k % 3] * 4;
                    g3.gain.setValueAtTime(0.0001, tt);
                    g3.gain.exponentialRampToValueAtTime(0.035, tt + 0.02);
                    g3.gain.exponentialRampToValueAtTime(0.0001, tt + 1.2);
                    o3.connect(g3);
                    g3.connect(g);
                    o3.start(tt);
                    o3.stop(tt + 1.3);
                }
            }
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
                    timer = setInterval(acorde, 5600);
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
        voces.length = 0;
        return musicaObj;
    }

    api.musica = musica;
    api.desbloquear = function () { audio(); };
    /*
     * Volumen por canal para comun/volumen.js (los dos controles del boton de sonido).
     * `salida` es un unico compresor del que cuelga todo, asi que la separacion se hace aqui:
     * los efectos escalan VOL (el factor que multiplica cada sonido) y el fondo va por el
     * `volume` del objeto que devuelve musica().
     */
    var VOL_BASE = VOL;
    api.volumenEfectos = function (pct) {
        var f = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
        VOL = VOL_BASE * f;
    };
    api.volumenFondo = function (pct) {
        var f = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
        if (musicaObj) {
            // `volume` de este objeto es el nivel directo (0..1), igual que el <audio> que el
            // juego ajustaba con su slider: se pasa el porcentaje tal cual, sin reescalar.
            try { musicaObj.volume = f; } catch (e) { /* noop */ }
        }
    };

    global.SonidosCohete = api;
})(window);
