/**
 * SonidosLaser — sonidos originales de "El Circuito Láser de la Central de Energía", sintetizados con Web Audio
 * (window.SonidosLaser). Sin archivos: envolventes suaves y filtros pasa-bajos (nada de pitidos puros ni chasquidos
 * agresivos), cortos y bajitos, pensados para niños de 5 a 6 años.
 *
 *   esfera(on) · esferaVelocidad(0..1)   zumbido suave de la esfera de luz al moverse (sube de tono con la rapidez)
 *   zumbido(0..1)                        crepitar eléctrico de los láseres encendidos (según qué tan cerca están)
 *   laserOn() · laserOff()               el rayo se enciende (sube) o se apaga (baja y se desinfla)
 *   aviso()                              advertencia amable (dos notas suaves)
 *   tic(n)                               contador 3, 2, 1 (campanita de cristal; el 1 es más agudo)
 *   choque()                             roce con la pared: golpecito acolchado y un chisporroteo pequeño
 *   impacto()                            toque con un rayo encendido: chispa eléctrica suave que rebota
 *   regreso()                            la esfera se desliza hacia atrás
 *   cruce()                              barrera superada (destellos que suben)
 *   panel()                              un panel se enciende
 *   aparece()                            la esfera se materializa
 *   conexion()                           la esfera entra al reactor (barrido de energía y acorde)
 *   brillo() · exito() · fanfarria() · fiesta()
 *   musica()                             { play, pause, volume, modo("intro"|"central"|"final") }; TextoVoz le ajusta el volumen
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

    /** Nota con armónico suave y filtro: base de casi todo. */
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

    /** Ráfaga de ruido filtrado con barrido (chispas, aire, energía). */
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

    /** Chisporroteo: varios granitos de ruido muy cortos y filtrados. */
    function chispas(c, t0, n, vol, f) {
        for (var i = 0; i < n; i++) {
            rafaga(c, t0 + i * (0.025 + Math.random() * 0.03), 0.04, (f || 3800) * (0.8 + Math.random() * 0.5), (f || 3800) * 0.6, vol, 3);
        }
    }

    /** Golpecito acolchado (bombo de juguete muy suave). */
    function golpe(c, t0, f, vol) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f * 1.8, t0);
        o.frequency.exponentialRampToValueAtTime(f, t0 + 0.08);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * VOL), t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.connect(g);
        g.connect(salida);
        o.start(t0);
        o.stop(t0 + 0.3);
    }

    function con(fn) {
        return function () {
            if (silencio()) return;
            var c = audio();
            if (!c) return;
            try { fn.apply(null, [c, c.currentTime + 0.01].concat([].slice.call(arguments))); } catch (e) { /* noop */ }
        };
    }

    // ------------------------------------------------------------------ bucles continuos

    var esf = null;

    /** La esfera: dos senos un poco desafinados + un brillo agudo, todo detrás de un pasa-bajos. */
    function esfera(on) {
        var c = audio();
        if (!c) return;
        if (on && !esf) {
            var o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator();
            var fl = c.createBiquadFilter();
            var g = c.createGain();
            var g3 = c.createGain();
            o1.type = "sine"; o2.type = "sine"; o3.type = "triangle";
            o1.frequency.value = 196; o2.frequency.value = 197.6; o3.frequency.value = 784;
            fl.type = "lowpass";
            fl.frequency.value = 900;
            g.gain.value = 0.0001;
            g3.gain.value = 0.12;
            o1.connect(fl); o2.connect(fl); o3.connect(g3); g3.connect(fl);
            fl.connect(g);
            g.connect(salida);
            o1.start(); o2.start(); o3.start();
            esf = { o1: o1, o2: o2, o3: o3, fl: fl, g: g };
        } else if (!on && esf) {
            var m = esf;
            esf = null;
            try {
                m.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
                setTimeout(function () { try { m.o1.stop(); m.o2.stop(); m.o3.stop(); } catch (e) { /* noop */ } }, 500);
            } catch (e) { /* noop */ }
        }
    }

    function esferaVelocidad(v) {
        if (!esf || !ctx) return;
        v = Math.max(0, Math.min(1, v || 0));
        var t = ctx.currentTime;
        esf.g.gain.setTargetAtTime(silencio() || v < 0.03 ? 0.0001 : (0.015 + v * 0.07) * VOL, t, 0.07);
        esf.o1.frequency.setTargetAtTime(196 + v * 90, t, 0.1);
        esf.o2.frequency.setTargetAtTime(197.6 + v * 92, t, 0.1);
        esf.o3.frequency.setTargetAtTime(784 + v * 360, t, 0.1);
        esf.fl.frequency.setTargetAtTime(700 + v * 1400, t, 0.1);
    }

    var zum = null;

    /** Crepitar de los láseres: diente de sierra grave muy filtrado + ruido en banda que tiembla. */
    function zumbido(v) {
        var c = audio();
        if (!c) return;
        v = Math.max(0, Math.min(1, v || 0));
        if (!zum) {
            if (v < 0.02) return;
            var o = c.createOscillator();
            var lfo = c.createOscillator();
            var lfoG = c.createGain();
            var fl = c.createBiquadFilter();
            var src = c.createBufferSource();
            var fl2 = c.createBiquadFilter();
            var g = c.createGain();
            var gR = c.createGain();
            o.type = "sawtooth";
            o.frequency.value = 110;
            lfo.frequency.value = 11;
            lfoG.gain.value = 0.5;
            fl.type = "lowpass";
            fl.frequency.value = 420;
            src.buffer = bufRuido(c);
            src.loop = true;
            fl2.type = "bandpass";
            fl2.frequency.value = 2600;
            fl2.Q.value = 2;
            gR.gain.value = 0.35;
            g.gain.value = 0.0001;
            lfo.connect(lfoG);
            lfoG.connect(gR.gain);
            o.connect(fl);
            fl.connect(g);
            src.connect(fl2);
            fl2.connect(gR);
            gR.connect(g);
            g.connect(salida);
            o.start(); lfo.start(); src.start();
            zum = { o: o, lfo: lfo, src: src, g: g };
        }
        zum.g.gain.setTargetAtTime(silencio() || v < 0.02 ? 0.0001 : v * 0.06 * VOL, c.currentTime, 0.12);
    }

    // ------------------------------------------------------------------ efectos

    var api = {
        esfera: esfera,
        esferaVelocidad: esferaVelocidad,
        zumbido: zumbido,
        laserOn: con(function (c, t, cerca) {
            var k = cerca == null ? 1 : Math.max(0.25, cerca);
            nota(c, t, 220, 0.35, 0.1 * k, "sawtooth", 1200, null, 440);
            rafaga(c, t, 0.3, 1800, 3600, 0.06 * k, 2);
        }),
        laserOff: con(function (c, t, cerca) {
            var k = cerca == null ? 1 : Math.max(0.25, cerca);
            nota(c, t, 520, 0.45, 0.1 * k, "triangle", 1600, null, 170);
            rafaga(c, t, 0.4, 3000, 900, 0.05 * k, 1.5);
        }),
        aviso: con(function (c, t) {
            nota(c, t, 659.25, 0.22, 0.12, "triangle", 2200);
            nota(c, t + 0.22, 523.25, 0.3, 0.11, "triangle", 2000);
        }),
        tic: con(function (c, t, n) {
            var f = n === 1 ? 1318.51 : (n === 2 ? 1174.66 : 1046.5);
            nota(c, t, f, 0.28, 0.08, "sine", 5000);
            nota(c, t, f * 1.5, 0.18, 0.025, "sine", 6000);
        }),
        choque: con(function (c, t) {
            golpe(c, t, 140, 0.32);
            chispas(c, t + 0.02, 4, 0.05, 3400);
            nota(c, t + 0.05, 392, 0.25, 0.06, "triangle", 1400, null, 330);
        }),
        impacto: con(function (c, t) {
            golpe(c, t, 120, 0.28);
            rafaga(c, t, 0.32, 4200, 900, 0.12, 1.4);
            chispas(c, t + 0.05, 6, 0.06, 4200);
            nota(c, t + 0.04, 300, 0.4, 0.06, "sawtooth", 900, null, 160);
        }),
        regreso: con(function (c, t) {
            rafaga(c, t, 0.35, 900, 2200, 0.08, 0.8);
            nota(c, t, 392, 0.3, 0.05, "sine", 2000, null, 523);
        }),
        cruce: con(function (c, t) {
            [783.99, 987.77, 1174.66, 1567.98].forEach(function (f, i) { nota(c, t + i * 0.07, f, 0.4, 0.09, "triangle", 5200); });
            rafaga(c, t + 0.1, 0.4, 2400, 6000, 0.05, 1.2);
        }),
        panel: con(function (c, t, n) {
            var f = [523.25, 659.25, 783.99, 880, 1046.5][(n | 0) % 5];
            nota(c, t, f, 0.18, 0.04, "sine", 4000);
        }),
        aparece: con(function (c, t) {
            nota(c, t, 330, 0.55, 0.08, "sine", 2400, null, 990);
            rafaga(c, t, 0.5, 800, 5000, 0.05, 1.2);
            nota(c, t + 0.4, 1318.51, 0.4, 0.05, "sine", 6000);
        }),
        conexion: con(function (c, t) {
            nota(c, t, 196, 1.1, 0.12, "sawtooth", 1400, null, 784);
            rafaga(c, t, 1.0, 400, 5000, 0.08, 1.1);
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { nota(c, t + 1.0, f, 1.4, 0.07, "triangle", 4200); });
            golpe(c, t + 1.0, 90, 0.3);
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
                chispas(c, t1 + 0.32, 4, 0.03, 5200);
            }
        })
    };

    // ------------------------------------------------------------------ música

    var musicaObj = null;

    /**
     * Tres ambientes sobre el mismo objeto (se comporta como un <audio> para TextoVoz):
     *   "central": pad electrónico lento (La menor – Fa – Do – Sol), latido grave de máquinas y destellos lejanos.
     *   "intro":   el mismo pad con un arpegio brillante que presenta la central.
     *   "final":   arpegio alegre y más rápido: la central encendida.
     */
    function musica() {
        if (musicaObj) return musicaObj;
        var vol = 0.2;
        var g = null;
        var timer = null;
        var paso = 0;
        var modo = "central";
        var ACORDES = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
        var ARP_FINAL = [523.25, 659.25, 783.99, 1046.5];
        function aplicar() {
            if (g && ctx) g.gain.setTargetAtTime(silencio() ? 0.0001 : Math.min(0.85, Math.max(0.0001, vol * 2.2)), ctx.currentTime, 0.4);
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
                o.type = "sawtooth";
                o2.type = "sine";
                o.frequency.value = f / 2;
                o2.frequency.value = f * 1.004;
                fl.type = "lowpass";
                fl.frequency.setValueAtTime(380, t);
                fl.frequency.linearRampToValueAtTime(modo === "final" ? 1500 : 900, t + dur / 2);
                fl.frequency.linearRampToValueAtTime(380, t + dur);
                gg.gain.setValueAtTime(0.0001, t);
                gg.gain.exponentialRampToValueAtTime(0.06, t + 1.0);
                gg.gain.setValueAtTime(0.06, t + dur - 1.2);
                gg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
                o.connect(fl);
                o2.connect(fl);
                fl.connect(gg);
                gg.connect(g);
                o.start(t + i * 0.04);
                o2.start(t + i * 0.04);
                o.stop(t + dur + 0.6);
                o2.stop(t + dur + 0.6);
            });
            if (modo === "intro") {
                for (var k = 0; k < 12; k++) nota(c, t + 0.2 + k * 0.36, ac[k % 3] * 2, 0.3, 0.06, "triangle", 3800, g);
            } else if (modo === "final") {
                for (var q = 0; q < 12; q++) nota(c, t + 0.05 + q * 0.25, ARP_FINAL[q % 4] * (q >= 8 ? 1.5 : 1), 0.26, 0.07, "triangle", 4800, g);
            } else {
                // latido de las máquinas y destellos lejanos de la central
                for (var b = 0; b < 4; b++) {
                    var tb = t + b * 1.2;
                    var o3 = c.createOscillator();
                    var g3 = c.createGain();
                    o3.type = "sine";
                    o3.frequency.setValueAtTime(70, tb);
                    o3.frequency.exponentialRampToValueAtTime(48, tb + 0.25);
                    g3.gain.setValueAtTime(0.0001, tb);
                    g3.gain.exponentialRampToValueAtTime(0.07, tb + 0.01);
                    g3.gain.exponentialRampToValueAtTime(0.0001, tb + 0.35);
                    o3.connect(g3);
                    g3.connect(g);
                    o3.start(tb);
                    o3.stop(tb + 0.4);
                }
                if (Math.random() < 0.7) nota(c, t + 0.8 + Math.random() * 3, ac[2] * 4, 0.9, 0.03, "sine", 6000, g);
                if (Math.random() < 0.5) rafaga(c, t + Math.random() * 3.5, 1.2, 300, 1200, 0.025, 0.7, g);
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
                modo = m || "central";
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
    global.SonidosLaser = api;
})(window);
