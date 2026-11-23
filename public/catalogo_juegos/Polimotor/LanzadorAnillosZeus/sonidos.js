/**
 * SonidosAnillos — efectos de "El Lanzador de Anillos de Zeus" sintetizados con Web Audio (window.SonidosAnillos).
 *
 * Todos hechos para este juego: cortos, suaves y sin tonos puros sostenidos (nada de pitidos). Respetan el
 * silencio de PedniaAudio y nunca se encima un efecto largo consigo mismo.
 *
 *   seleccion()   tomar un anillo: "plin" brillante de madera
 *   arrastre(v)   mover el anillo: roce de aire muy bajito (v = rapidez 0..1, se limita solo)
 *   lanzar()      soltar: zumbido "fiuu" que sube
 *   vuelo(ms)     el anillo gira en el aire: aleteo de aire que dura lo que el vuelo
 *   encaje()      el anillo baja por el mástil y asienta: "cling" metálico + toque de madera
 *   corneta()     corneta alegre de feria (acierto)
 *   destello()    brillo mágico del cono
 *   rebote(k)     el anillo rebota en el pasto (k = 0 primer bote, 1 segundo…)
 *   recuperar()   el anillo vuelve volando a su lugar: escalita mágica que sube
 *   aparece()     algo aparece en escena (muy suave)
 *   victoria()    música de victoria (melodía de feria con acordes, ~3,5 s)
 *   desbloquear() crea/reanuda el contexto en el primer toque
 */
(function (global) {
    "use strict";

    var ctx = null;
    var salida = null;
    var VOL = 1.8;
    var ruido = null;
    var ultArrastre = 0;
    var vueloActivo = null;

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
            salida.threshold.value = -16;
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
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return ruido;
    }

    function env(g, t0, ataque, vol, dur) {
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + ataque);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }

    /** Nota con armónico y filtro (timbre de campanita o de madera según el filtro). */
    function nota(c, t0, f, dur, vol, tipo, corte, destino) {
        var o = c.createOscillator();
        var o2 = c.createOscillator();
        var g = c.createGain();
        var g2 = c.createGain();
        var fl = c.createBiquadFilter();
        o.type = tipo || "triangle";
        o2.type = "sine";
        o.frequency.setValueAtTime(f, t0);
        o2.frequency.setValueAtTime(f * 3.01, t0);
        fl.type = "lowpass";
        fl.frequency.value = corte || 3400;
        g2.gain.value = 0.18;
        env(g, t0, 0.008, vol, dur);
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

    /** Ráfaga de ruido filtrado que barre de f0 a f1 (aire, roce, soplo). */
    function soplo(c, t0, dur, f0, f1, vol, q) {
        var src = c.createBufferSource();
        src.buffer = bufRuido(c);
        var fl = c.createBiquadFilter();
        fl.type = "bandpass";
        fl.Q.value = q || 1.2;
        fl.frequency.setValueAtTime(f0, t0);
        fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + dur * 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(fl);
        fl.connect(g);
        g.connect(salida);
        src.start(t0, Math.random());
        src.stop(t0 + dur + 0.05);
    }

    /** Golpe sordo con caída de tono (madera, pasto). */
    function golpe(c, t0, f, vol, dur) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, t0);
        o.frequency.exponentialRampToValueAtTime(f * 0.5, t0 + dur);
        env(g, t0, 0.004, vol, dur);
        o.connect(g);
        g.connect(salida);
        o.start(t0);
        o.stop(t0 + dur + 0.03);
    }

    /** Nota de corneta: diente de sierra filtrado con vibrato y "soplido" de ataque. */
    function trompeta(c, t0, f, dur, vol) {
        var o = c.createOscillator();
        var o2 = c.createOscillator();
        var lfo = c.createOscillator();
        var lfoG = c.createGain();
        var fl = c.createBiquadFilter();
        var g = c.createGain();
        o.type = "sawtooth";
        o2.type = "square";
        o.frequency.setValueAtTime(f * 0.985, t0);
        o.frequency.exponentialRampToValueAtTime(f, t0 + 0.05);
        o2.frequency.setValueAtTime(f * 1.003, t0);
        lfo.frequency.value = 5.5;
        lfoG.gain.value = f * 0.012;
        lfo.connect(lfoG);
        lfoG.connect(o.frequency);
        fl.type = "lowpass";
        fl.Q.value = 2;
        fl.frequency.setValueAtTime(700, t0);
        fl.frequency.exponentialRampToValueAtTime(2600, t0 + 0.06);
        fl.frequency.exponentialRampToValueAtTime(1500, t0 + dur);
        var g2 = c.createGain();
        g2.gain.value = 0.25;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol * VOL, t0 + 0.03);
        g.gain.setValueAtTime(vol * VOL * 0.8, t0 + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(fl);
        o2.connect(g2);
        g2.connect(fl);
        fl.connect(g);
        g.connect(salida);
        [o, o2, lfo].forEach(function (x) {
            x.start(t0);
            x.stop(t0 + dur + 0.05);
        });
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
        desbloquear: function () { audio(); },

        seleccion: con(function (c, t) {
            golpe(c, t, 420, 0.2, 0.08);
            nota(c, t + 0.01, 1046.5, 0.22, 0.12, "triangle", 4200);
            nota(c, t + 0.07, 1568, 0.2, 0.08, "triangle", 4200);
        }),

        arrastre: con(function (c, t, v) {
            var ahora = Date.now();
            if (ahora - ultArrastre < 140) return;
            ultArrastre = ahora;
            var k = Math.max(0.15, Math.min(1, Number(v) || 0));
            soplo(c, t, 0.16, 500 + 900 * k, 900 + 1400 * k, 0.04 + 0.05 * k, 1.4);
        }),

        lanzar: con(function (c, t) {
            soplo(c, t, 0.32, 400, 2600, 0.24, 1.1);
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(300, t);
            o.frequency.exponentialRampToValueAtTime(900, t + 0.22);
            env(g, t, 0.02, 0.1, 0.26);
            o.connect(g);
            g.connect(salida);
            o.start(t);
            o.stop(t + 0.3);
        }),

        vuelo: con(function (c, t, ms) {
            var dur = Math.max(0.3, Math.min(2.2, (Number(ms) || 800) / 1000));
            if (vueloActivo && vueloActivo.fin > c.currentTime) return;
            var src = c.createBufferSource();
            src.buffer = bufRuido(c);
            var fl = c.createBiquadFilter();
            fl.type = "bandpass";
            fl.Q.value = 3;
            fl.frequency.setValueAtTime(900, t);
            fl.frequency.linearRampToValueAtTime(1300, t + dur * 0.5);
            fl.frequency.linearRampToValueAtTime(800, t + dur);
            // aleteo: el giro del anillo corta el aire
            var trem = c.createGain();
            var lfo = c.createOscillator();
            var lfoG = c.createGain();
            lfo.frequency.value = 9;
            lfoG.gain.value = 0.5;
            trem.gain.value = 0.5;
            lfo.connect(lfoG);
            lfoG.connect(trem.gain);
            var g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.13 * VOL, t + 0.08);
            g.gain.setValueAtTime(0.11 * VOL, t + dur * 0.8);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(fl);
            fl.connect(trem);
            trem.connect(g);
            g.connect(salida);
            src.start(t, Math.random());
            src.stop(t + dur + 0.05);
            lfo.start(t);
            lfo.stop(t + dur + 0.05);
            vueloActivo = { fin: t + dur };
        }),

        encaje: con(function (c, t) {
            // cling metálico (parciales inarmónicos) + toque de madera al asentar
            [1318, 1975, 2793].forEach(function (f, i) {
                nota(c, t + i * 0.012, f, 0.55 - i * 0.12, 0.12 - i * 0.025, "sine", 6000);
            });
            golpe(c, t + 0.16, 300, 0.22, 0.12);
            golpe(c, t + 0.24, 360, 0.1, 0.08);
        }),

        corneta: con(function (c, t) {
            // ta-ta-ta-taaa de feria: Sol-Do-Mi-Sol
            var notas = [[392, 0.11], [523.25, 0.11], [659.25, 0.11], [783.99, 0.5]];
            var tt = t;
            notas.forEach(function (n) {
                trompeta(c, tt, n[0], n[1] + 0.04, 0.16);
                tt += n[1] + 0.03;
            });
        }),

        destello: con(function (c, t) {
            [1760, 2217, 2637, 3520].forEach(function (f, i) {
                nota(c, t + i * 0.05, f, 0.35, 0.05, "sine", 7000);
            });
        }),

        rebote: con(function (c, t, k) {
            var n = Number(k) || 0;
            var vol = n === 0 ? 0.28 : 0.14;
            golpe(c, t, 190 - n * 20, vol, 0.14);
            // "boing" suave de goma
            var o = c.createOscillator();
            var g = c.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(260, t);
            o.frequency.exponentialRampToValueAtTime(380, t + 0.08);
            o.frequency.exponentialRampToValueAtTime(240, t + 0.18);
            env(g, t, 0.01, vol * 0.5, 0.2);
            o.connect(g);
            g.connect(salida);
            o.start(t);
            o.stop(t + 0.24);
            soplo(c, t, 0.12, 1800, 700, vol * 0.25, 0.8);
        }),

        recuperar: con(function (c, t) {
            [659.25, 783.99, 987.77, 1318.5].forEach(function (f, i) {
                nota(c, t + i * 0.07, f, 0.26, 0.07, "triangle", 5000);
            });
            soplo(c, t, 0.5, 600, 2400, 0.06, 1);
        }),

        aparece: con(function (c, t) {
            nota(c, t, 880, 0.3, 0.06, "sine", 5000);
            nota(c, t + 0.08, 1318.5, 0.3, 0.05, "sine", 5000);
        }),

        victoria: con(function (c, t) {
            // melodía de feria con acordes y un redoble de cierre
            var mel = [
                [523.25, 0.18], [659.25, 0.18], [783.99, 0.18], [1046.5, 0.36],
                [987.77, 0.18], [1046.5, 0.18], [1174.66, 0.18], [1318.51, 0.7]
            ];
            var tt = t;
            mel.forEach(function (n) {
                nota(c, tt, n[0], n[1] + 0.25, 0.13, "triangle", 4200);
                tt += n[1];
            });
            var acordes = [[261.63, 329.63, 392], [349.23, 440, 523.25], [392, 493.88, 587.33], [523.25, 659.25, 783.99]];
            acordes.forEach(function (a, i) {
                a.forEach(function (f) { nota(c, t + i * 0.55, f, 0.6, 0.045, "sine", 2400); });
            });
            trompeta(c, tt - 0.7, 783.99, 0.75, 0.1);
            for (var i = 0; i < 6; i++) soplo(c, tt - 0.2 + i * 0.05, 0.08, 3000, 1500, 0.05, 2);
        })
    };

    /*
     * Volumen por canal para comun/volumen.js (los dos controles del boton de sonido).
     * Este modulo no tiene musica propia: solo se escala el canal de efectos, que es todo lo
     * que produce (el fondo del juego lo maneja TextoVoz o PedniaAudio).
     */
    var VOL_BASE = VOL;
    api.volumenEfectos = function (pct) {
        var f = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
        VOL = VOL_BASE * f;
    };

    global.SonidosAnillos = api;
})(window);
