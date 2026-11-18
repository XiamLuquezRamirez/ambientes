/**
 * SonidosArdilla — sonidos originales de "La Ardilla y la Bellota Gigante" sintetizados con Web Audio
 * (window.SonidosArdilla). Sin archivos: envolventes suaves y filtros (nada de pitidos puros), cortos y bajitos,
 * pensados para niños de 3 a 4 años.
 *
 *   arrastre(on) · arrastreVelocidad(0..1)   la bellota rueda sobre hojas secas (crujido suave)
 *   hojas()                                  hojas que se mueven (pasa junto a ellas, transición)
 *   hoja(n)                                  hojita brillante del camino que se enciende (sube de tono)
 *   obstaculo()                              toque de madera amable al acercarse a un obstáculo (no es negativo)
 *   alerta()                                 "uh-oh" suave (se sale del camino)
 *   positivo()                               vuelve al camino
 *   regreso()                                la bellota rueda sola de vuelta
 *   saltito()                                la ardilla da un saltito de alegría
 *   cesta()                                  la bellota cae en la cesta
 *   brillo() · exito() · fanfarria() · fiesta()
 *   musica()                                 { play, pause, volume, modo("bosque"|"intro"|"final") }; TextoVoz le ajusta el volumen
 */
(function (global) {
    "use strict";

    var ctx = null;
    var salida = null;
    var VOL = 0.5;
    var ruido = null, ruidoBlanco = null;

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

    /** Ruido "crujiente" (chasquidos dispersos): hojas secas. */
    function bufHojas(c) {
        if (ruidoBlanco) return ruidoBlanco;
        var n = c.sampleRate * 2;
        ruidoBlanco = c.createBuffer(1, n, c.sampleRate);
        var d = ruidoBlanco.getChannelData(0);
        var env = 0;
        for (var i = 0; i < n; i++) {
            if (Math.random() < 0.0016) env = 0.6 + Math.random() * 0.4;
            env *= 0.9965;
            d[i] = (Math.random() * 2 - 1) * (0.12 + env);
        }
        return ruidoBlanco;
    }

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

    /** Golpecito de madera (marimba grave). */
    function madera(c, t0, f, vol, destino) {
        var o = c.createOscillator();
        var g = c.createGain();
        var fl = c.createBiquadFilter();
        o.type = "sine";
        o.frequency.setValueAtTime(f * 1.5, t0);
        o.frequency.exponentialRampToValueAtTime(f, t0 + 0.03);
        fl.type = "bandpass";
        fl.frequency.value = f * 2;
        fl.Q.value = 1.2;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        o.connect(g);
        g.connect(destino || salida);
        o.start(t0);
        o.stop(t0 + 0.25);
    }

    /** Ráfaga de hojas: ruido crujiente con barrido. */
    function rafaga(c, t0, dur, f0, f1, vol, destino) {
        var src = c.createBufferSource();
        src.buffer = bufHojas(c);
        var fl = c.createBiquadFilter();
        fl.type = "bandpass";
        fl.Q.value = 0.7;
        fl.frequency.setValueAtTime(f0, t0);
        fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol * VOL, t0 + dur * 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(fl);
        fl.connect(g);
        g.connect(destino || salida);
        src.start(t0, Math.random());
        src.stop(t0 + dur + 0.05);
    }

    /** Trino de pajarito: dos o tres silbidos cortos que suben y bajan. */
    function pajaro(c, t0, vol, destino) {
        var base = 2200 + Math.random() * 1200;
        var n = 2 + Math.floor(Math.random() * 3);
        for (var i = 0; i < n; i++) {
            var t = t0 + i * 0.13;
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(base, t);
            o.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.05);
            o.frequency.exponentialRampToValueAtTime(base * 0.95, t + 0.1);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
            o.connect(g);
            g.connect(destino || salida);
            o.start(t);
            o.stop(t + 0.13);
        }
    }

    function con(fn) {
        return function () {
            if (silencio()) return;
            var c = audio();
            if (!c) return;
            try { fn.apply(null, [c, c.currentTime + 0.01].concat([].slice.call(arguments))); } catch (e) { /* noop */ }
        };
    }

    // ------------------------------------------------------------------ arrastre continuo (hojas secas)

    var arrObj = null;
    var velArr = 0;

    function arrastre(on) {
        var c = audio();
        if (!c) return;
        if (on && !arrObj) {
            var src = c.createBufferSource();
            src.buffer = bufHojas(c);
            src.loop = true;
            var fl = c.createBiquadFilter();
            fl.type = "bandpass";
            fl.frequency.value = 2400;
            fl.Q.value = 0.6;
            var g = c.createGain();
            g.gain.value = 0.0001;
            src.connect(fl);
            fl.connect(g);
            g.connect(salida);
            src.start();
            arrObj = { src: src, fl: fl, g: g };
        } else if (!on && arrObj) {
            var m = arrObj;
            arrObj = null;
            try {
                m.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
                setTimeout(function () { try { m.src.stop(); } catch (e) { /* noop */ } }, 400);
            } catch (e) { /* noop */ }
        }
    }

    function arrastreVelocidad(v) {
        velArr = Math.max(0, Math.min(1, v || 0));
        if (!arrObj || !ctx) return;
        var vol = silencio() || velArr < 0.04 ? 0.0001 : (0.02 + velArr * 0.12) * VOL;
        arrObj.g.gain.setTargetAtTime(vol, ctx.currentTime, 0.06);
        arrObj.fl.frequency.setTargetAtTime(1600 + velArr * 2200, ctx.currentTime, 0.1);
    }

    // ------------------------------------------------------------------ efectos

    var ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];

    var api = {
        arrastre: arrastre,
        arrastreVelocidad: arrastreVelocidad,
        hojas: con(function (c, t) { rafaga(c, t, 0.45, 3500, 1800, 0.2); }),
        hoja: con(function (c, t, n) {
            var f = ESCALA[Math.max(0, Math.min(ESCALA.length - 1, n | 0))];
            nota(c, t, f, 0.4, 0.07, "sine", 5200);
            madera(c, t, f * 0.5, 0.05);
        }),
        // toque de madera amable (dos golpecitos "toc-toc"): avisa que hay algo, sin ser un error
        obstaculo: con(function (c, t) {
            madera(c, t, 420, 0.22);
            madera(c, t + 0.12, 520, 0.18);
            rafaga(c, t, 0.2, 2800, 2000, 0.08);
        }),
        alerta: con(function (c, t) {
            nota(c, t, 440, 0.22, 0.18, "triangle", 1400);
            nota(c, t + 0.2, 349.23, 0.32, 0.16, "triangle", 1200);
        }),
        positivo: con(function (c, t) {
            nota(c, t, 659.25, 0.25, 0.14, "triangle", 4000);
            nota(c, t + 0.1, 987.77, 0.35, 0.14, "triangle", 4000);
        }),
        regreso: con(function (c, t) {
            rafaga(c, t, 0.6, 1500, 3200, 0.22);
            for (var i = 0; i < 3; i++) madera(c, t + 0.1 + i * 0.12, 500 + i * 80, 0.08);
        }),
        saltito: con(function (c, t) {
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(380, t);
            o.frequency.exponentialRampToValueAtTime(900, t + 0.12);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.12 * VOL, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
            o.connect(g);
            g.connect(salida);
            o.start(t);
            o.stop(t + 0.2);
        }),
        // la bellota cae en la cesta: "plof" de madera, crujido de hojas y una campanita
        cesta: con(function (c, t) {
            madera(c, t, 180, 0.35);
            madera(c, t + 0.06, 240, 0.2);
            rafaga(c, t, 0.35, 2600, 1400, 0.22);
            nota(c, t + 0.15, 1318.51, 0.6, 0.08, "sine", 6000);
            nota(c, t + 0.25, 1567.98, 0.7, 0.07, "sine", 6000);
        }),
        brillo: con(function (c, t) {
            [1568, 2093, 2637].forEach(function (f, i) { nota(c, t + i * 0.06, f, 0.35, 0.07, "sine", 6000); });
        }),
        exito: con(function (c, t) {
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { nota(c, t + i * 0.11, f, 0.6, 0.17, "triangle", 5000); });
            nota(c, t + 0.48, 1318.51, 0.9, 0.11, "sine", 6000);
            rafaga(c, t + 0.4, 0.5, 3000, 1800, 0.12);
        }),
        fanfarria: con(function (c, t) {
            var m = [[523.25, 0], [659.25, 0.16], [783.99, 0.32], [1046.5, 0.48], [783.99, 0.72], [1046.5, 0.88], [1318.51, 1.1]];
            m.forEach(function (n) { nota(c, t + n[1], n[0], 0.7, 0.17, "triangle", 5200); });
            [261.63, 329.63, 392].forEach(function (f) { nota(c, t + 1.1, f, 1.6, 0.08, "sine", 2000); });
        }),
        fiesta: con(function (c, t) {
            for (var i = 0; i < 6; i++) madera(c, t + i * 0.08, 500 + Math.random() * 600, 0.08);
            rafaga(c, t, 0.6, 3600, 2000, 0.14);
            nota(c, t + 0.3, 1567.98, 0.5, 0.05, "sine", 7000);
        })
    };

    // ------------------------------------------------------------------ música

    var musicaObj = null;

    /**
     * Tres ambientes sobre el mismo objeto (se comporta como un <audio> para TextoVoz):
     *   "bosque": pad cálido y lento (Do – La menor – Fa – Sol), crujidos lejanos y pajaritos.
     *   "intro":  marimba saltarina que presenta el juego, sobre el mismo pad.
     *   "final":  melodía alegre y más rápida para la casa de la ardilla.
     */
    function musica() {
        if (musicaObj) return musicaObj;
        var vol = 0.2;
        var g = null;
        var timer = null;
        var paso = 0;
        var modo = "bosque";
        var ACORDES = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]];
        var MEL_INTRO = [784, 659, 784, 880, 784, 659, 587, 659];
        var MEL_FINAL = [523, 659, 784, 1047, 880, 784, 880, 1047, 1175, 1047, 880, 784];
        function aplicar() {
            if (g && ctx) g.gain.setTargetAtTime(silencio() ? 0.0001 : Math.max(0.0001, vol * 0.5), ctx.currentTime, 0.4);
        }
        function ciclo() {
            var c = audio();
            if (!c || !g) return;
            var t = c.currentTime;
            var ac = ACORDES[paso % ACORDES.length];
            paso++;
            var dur = modo === "final" ? 3.2 : 5.6;
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
                fl.frequency.setValueAtTime(600, t);
                fl.frequency.linearRampToValueAtTime(1200, t + dur / 2);
                fl.frequency.linearRampToValueAtTime(600, t + dur);
                gg.gain.setValueAtTime(0.0001, t);
                gg.gain.exponentialRampToValueAtTime(0.08, t + 1.2);
                gg.gain.setValueAtTime(0.08, t + dur - 1.6);
                gg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
                o.connect(fl);
                o2.connect(fl);
                fl.connect(gg);
                gg.connect(g);
                o.start(t + i * 0.05);
                o2.start(t + i * 0.05);
                o.stop(t + dur + 0.6);
                o2.stop(t + dur + 0.6);
            });
            if (modo === "intro") {
                MEL_INTRO.forEach(function (f, i) { nota(c, t + 0.3 + i * 0.32, f, 0.4, 0.09, "triangle", 4200, g); });
            } else if (modo === "final") {
                MEL_FINAL.forEach(function (f, i) { if (i < 9) nota(c, t + 0.1 + i * 0.25, f, 0.32, 0.1, "triangle", 4800, g); });
                madera(c, t + 0.1, 300, 0.06, g);
                madera(c, t + 1.1, 300, 0.06, g);
                madera(c, t + 2.1, 300, 0.06, g);
            } else {
                if (Math.random() < 0.7) pajaro(c, t + 0.8 + Math.random() * 3.5, 0.04, g);
                if (Math.random() < 0.5) rafaga(c, t + Math.random() * 4, 0.8, 2500, 1600, 0.05, g);
                if (Math.random() < 0.5) nota(c, t + 1 + Math.random() * 3, ac[2] * 2, 1.2, 0.05, "sine", 3000, g);
            }
        }
        function reprogramar() {
            clearInterval(timer);
            timer = setInterval(ciclo, modo === "final" ? 3200 : 5600);
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
                modo = m || "bosque";
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
    global.SonidosArdilla = api;
})(window);
