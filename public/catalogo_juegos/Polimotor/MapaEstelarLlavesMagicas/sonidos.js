/**
 * SonidosMapa — sonidos originales de "El Mapa Estelar y las Llaves Mágicas", sintetizados con Web Audio
 * (window.SonidosMapa). Sin archivos: envolventes suaves y filtros pasa-bajos (sin pitidos puros ni golpes fuertes),
 * cortos y bajitos, pensados para niños de 5 a 6 años.
 *
 *   motor(on) · motorVelocidad(0..1)   zumbido del motor de la nave (sube con la rapidez)
 *   propulsion()                       soplido de los propulsores al arrancar
 *   llave(id)                          recolección: "roja" (arpegio cálido), "verde" (campanitas), "azul" (cristal)
 *   alerta()                           camino equivocado: dos notas suaves que bajan
 *   barrera()                          barrera espacial de un camino sin salida
 *   cruce()                            destellos de un cruce
 *   dormida()                          llave dormida (burbuja)
 *   portal(0..1)                       remolino continuo del portal (según qué tan activo está)
 *   candado(i)                         un candado se abre
 *   portalAbre() · teletransporte() · aterriza() · luz(i)
 *   aparece() · brillo() · exito() · fanfarria() · fiesta()
 *   silenciar(on) · silenciado()       control de sonido general (efectos y música)
 *   musica()                           { play, pause, volume, modo("intro"|"espacio"|"final") }
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

    // ------------------------------------------------------------------ bucles continuos

    var mot = null;

    /** Motor: dos sierras graves desafinadas muy filtradas + soplido de ruido; suben con la rapidez. */
    function motor(on) {
        var c = audio();
        if (!c) return;
        if (on && !mot) {
            var o1 = c.createOscillator(), o2 = c.createOscillator();
            var fl = c.createBiquadFilter();
            var g = c.createGain();
            var src = c.createBufferSource();
            var flR = c.createBiquadFilter();
            var gR = c.createGain();
            o1.type = "sawtooth"; o2.type = "triangle";
            o1.frequency.value = 72; o2.frequency.value = 108.4;
            fl.type = "lowpass";
            fl.frequency.value = 380;
            src.buffer = bufRuido(c);
            src.loop = true;
            flR.type = "bandpass";
            flR.frequency.value = 900;
            flR.Q.value = 0.8;
            gR.gain.value = 0.5;
            g.gain.value = 0.0001;
            o1.connect(fl); o2.connect(fl);
            src.connect(flR); flR.connect(gR); gR.connect(fl);
            fl.connect(g);
            g.connect(salida);
            o1.start(); o2.start(); src.start();
            mot = { o1: o1, o2: o2, src: src, fl: fl, flR: flR, g: g };
        } else if (!on && mot) {
            var m = mot;
            mot = null;
            try {
                m.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
                setTimeout(function () { try { m.o1.stop(); m.o2.stop(); m.src.stop(); } catch (e) { /* noop */ } }, 500);
            } catch (e) { /* noop */ }
        }
    }

    function motorVelocidad(v) {
        if (!mot || !ctx) return;
        v = Math.max(0, Math.min(1, v || 0));
        var t = ctx.currentTime;
        mot.g.gain.setTargetAtTime(v < 0.03 ? 0.012 * VOL : (0.03 + v * 0.09) * VOL, t, 0.08);
        mot.o1.frequency.setTargetAtTime(72 + v * 40, t, 0.12);
        mot.o2.frequency.setTargetAtTime(108.4 + v * 60, t, 0.12);
        mot.fl.frequency.setTargetAtTime(300 + v * 900, t, 0.12);
        mot.flR.frequency.setTargetAtTime(700 + v * 1400, t, 0.12);
    }

    var rem = null;

    /** Remolino del portal: ruido en banda que gira (LFO) y un acorde grave lejano. */
    function portal(v) {
        var c = audio();
        if (!c) return;
        v = Math.max(0, Math.min(1, v || 0));
        if (!rem) {
            if (v < 0.02) return;
            var src = c.createBufferSource();
            var fl = c.createBiquadFilter();
            var lfo = c.createOscillator();
            var lfoG = c.createGain();
            var o = c.createOscillator();
            var go = c.createGain();
            var g = c.createGain();
            src.buffer = bufRuido(c);
            src.loop = true;
            fl.type = "bandpass";
            fl.frequency.value = 700;
            fl.Q.value = 3;
            lfo.frequency.value = 0.9;
            lfoG.gain.value = 420;
            lfo.connect(lfoG);
            lfoG.connect(fl.frequency);
            o.type = "sine";
            o.frequency.value = 110;
            go.gain.value = 0.35;
            src.connect(fl);
            fl.connect(g);
            o.connect(go);
            go.connect(g);
            g.gain.value = 0.0001;
            g.connect(salida);
            src.start(); lfo.start(); o.start();
            rem = { g: g, lfo: lfo, o: o };
        }
        rem.g.gain.setTargetAtTime(v < 0.02 ? 0.0001 : v * 0.07 * VOL, c.currentTime, 0.2);
        rem.lfo.frequency.setTargetAtTime(0.6 + v * 2.2, c.currentTime, 0.3);
        rem.o.frequency.setTargetAtTime(98 + v * 40, c.currentTime, 0.4);
    }

    // ------------------------------------------------------------------ efectos

    var MELODIAS = {
        roja: [[523.25, 0], [659.25, 0.1], [783.99, 0.2], [1046.5, 0.3], [1318.51, 0.46]],
        verde: [[587.33, 0], [880, 0.09], [783.99, 0.18], [1174.66, 0.27], [1567.98, 0.42]],
        azul: [[659.25, 0], [987.77, 0.11], [1318.51, 0.22], [1975.53, 0.36], [1567.98, 0.5]]
    };

    var api = {
        motor: motor,
        motorVelocidad: motorVelocidad,
        portal: portal,
        propulsion: con(function (c, t) {
            rafaga(c, t, 0.45, 300, 1600, 0.09, 0.7);
            nota(c, t, 110, 0.35, 0.06, "sawtooth", 600, null, 180);
        }),
        llave: con(function (c, t, id) {
            var m = MELODIAS[id] || MELODIAS.roja;
            var tipo = id === "azul" ? "sine" : "triangle";
            m.forEach(function (n) { nota(c, t + n[1], n[0], 0.55, 0.13, tipo, 5600); });
            rafaga(c, t + 0.05, 0.7, 1500, 7000, 0.05, 1.2);
            var f = m[m.length - 1][0];
            nota(c, t + 0.6, f / 2, 1.2, 0.06, "sine", 3000);
            nota(c, t + 0.6, f * 0.75, 1.2, 0.05, "sine", 3000);
        }),
        alerta: con(function (c, t) {
            golpe(c, t, 150, 0.22);
            nota(c, t + 0.02, 587.33, 0.2, 0.09, "triangle", 2000);
            nota(c, t + 0.2, 466.16, 0.3, 0.08, "triangle", 1800);
        }),
        barrera: con(function (c, t) {
            rafaga(c, t, 0.6, 2600, 700, 0.07, 2);
            nota(c, t, 392, 0.5, 0.06, "sine", 2200, null, 262);
            nota(c, t + 0.05, 523.25, 0.4, 0.04, "sine", 2400, null, 349);
        }),
        cruce: con(function (c, t) {
            [1318.51, 1567.98, 1975.53].forEach(function (f, i) { nota(c, t + i * 0.08, f, 0.3, 0.035, "sine", 6000); });
        }),
        dormida: con(function (c, t) {
            nota(c, t, 330, 0.3, 0.08, "sine", 1800, null, 520);
            nota(c, t + 0.14, 440, 0.3, 0.06, "sine", 1800, null, 660);
        }),
        candado: con(function (c, t, i) {
            golpe(c, t, 260, 0.2);
            rafaga(c, t, 0.08, 3000, 1800, 0.05, 4);
            var base = [783.99, 987.77, 1174.66][(i | 0) % 3];
            nota(c, t + 0.08, base, 0.6, 0.11, "triangle", 5200);
            nota(c, t + 0.16, base * 1.5, 0.6, 0.06, "sine", 6000);
        }),
        portalAbre: con(function (c, t) {
            nota(c, t, 98, 2.2, 0.12, "sawtooth", 900, null, 392);
            rafaga(c, t, 2.0, 200, 5200, 0.1, 0.9);
            [392, 493.88, 587.33, 783.99].forEach(function (f, i) { nota(c, t + 1.4 + i * 0.05, f, 1.8, 0.07, "triangle", 4200); });
        }),
        teletransporte: con(function (c, t) {
            nota(c, t, 220, 1.0, 0.1, "sine", 3000, null, 1760);
            rafaga(c, t, 1.0, 400, 8000, 0.08, 1);
        }),
        aterriza: con(function (c, t) {
            rafaga(c, t, 1.2, 1600, 300, 0.07, 0.8);
            golpe(c, t + 1.0, 90, 0.25);
        }),
        luz: con(function (c, t, i) {
            var f = [523.25, 659.25, 783.99, 880, 1046.5, 1174.66][(i | 0) % 6];
            nota(c, t, f, 0.25, 0.05, "sine", 5000);
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
     * Música de fondo: un AMBIENTE DE ESPACIO continuo (se comporta como un <audio> para TextoVoz).
     *   - zumbido profundo: senos graves (La1, Mi2, La2) un poquito desafinados que "respiran" muy lento;
     *   - viento cósmico: ruido en banda estrecha cuyo filtro sube y baja despacio (como un soplo lejano);
     *   - destellos: campanitas agudas sueltas que pasan por un eco largo (estrellas que titilan);
     *   - sonar: de vez en cuando un "ping" suave con eco.
     * Modos: "espacio" (partida), "intro" (igual + un arpegio lento que presenta el mapa), "final" (el ambiente baja y
     * suena una música de victoria alegre).
     */
    function musica() {
        if (musicaObj) return musicaObj;
        var vol = 0.2;
        var g = null;          // salida general de la música (volumen de fondo)
        var amb = null;        // capa del ambiente (zumbido + viento)
        var eco = null;        // bus con eco para destellos y sonar
        var timer = null;
        var paso = 0;
        var modo = "espacio";
        var ESCALA = [880, 987.77, 1108.73, 1318.51, 1479.98, 1760, 2217.46];
        var ARP_FINAL = [587.33, 739.99, 880, 1174.66];
        var ACORDES_FINAL = [[293.66, 369.99, 440], [246.94, 293.66, 369.99], [196, 246.94, 293.66], [220, 277.18, 329.63]];

        function aplicar() {
            if (g && ctx) g.gain.setTargetAtTime(Math.max(0.0001, vol * 0.9), ctx.currentTime, 0.4);
            if (amb && ctx) amb.gain.setTargetAtTime(modo === "final" ? 0.25 : 1, ctx.currentTime, 1.2);
        }

        function crearAmbiente(c) {
            amb = c.createGain();
            amb.gain.value = 0.0001;
            amb.connect(g);
            // eco largo (destellos y sonar)
            eco = c.createGain();
            var retardo = c.createDelay(2);
            retardo.delayTime.value = 0.55;
            var vuelta = c.createGain();
            vuelta.gain.value = 0.5;
            var flEco = c.createBiquadFilter();
            flEco.type = "lowpass";
            flEco.frequency.value = 2600;
            eco.connect(retardo);
            retardo.connect(flEco);
            flEco.connect(vuelta);
            vuelta.connect(retardo);
            flEco.connect(g);
            eco.connect(g);
            // zumbido profundo que respira
            var respira = c.createOscillator();
            var respiraG = c.createGain();
            respira.frequency.value = 0.06;
            respiraG.gain.value = 0.035;
            var zumbido = c.createGain();
            zumbido.gain.value = 0.09;
            respira.connect(respiraG);
            respiraG.connect(zumbido.gain);
            var flZ = c.createBiquadFilter();
            flZ.type = "lowpass";
            flZ.frequency.value = 320;
            [[55, "sine", 1], [82.41, "sine", 0.7], [110.3, "triangle", 0.35], [164.8, "sine", 0.18]].forEach(function (d) {
                var o = c.createOscillator();
                var og = c.createGain();
                o.type = d[1];
                o.frequency.value = d[0];
                og.gain.value = d[2];
                var lfo = c.createOscillator();
                var lfoG = c.createGain();
                lfo.frequency.value = 0.03 + Math.random() * 0.05;
                lfoG.gain.value = d[0] * 0.004;
                lfo.connect(lfoG);
                lfoG.connect(o.frequency);
                o.connect(og);
                og.connect(flZ);
                o.start();
                lfo.start();
            });
            flZ.connect(zumbido);
            zumbido.connect(amb);
            respira.start();
            // viento cósmico
            var ruidoSrc = c.createBufferSource();
            ruidoSrc.buffer = bufRuido(c);
            ruidoSrc.loop = true;
            var flV = c.createBiquadFilter();
            flV.type = "bandpass";
            flV.Q.value = 5;
            flV.frequency.value = 600;
            var barrido = c.createOscillator();
            var barridoG = c.createGain();
            barrido.frequency.value = 0.045;
            barridoG.gain.value = 420;
            barrido.connect(barridoG);
            barridoG.connect(flV.frequency);
            var viento = c.createGain();
            viento.gain.value = 0.05;
            var soplo = c.createOscillator();
            var soploG = c.createGain();
            soplo.frequency.value = 0.08;
            soploG.gain.value = 0.03;
            soplo.connect(soploG);
            soploG.connect(viento.gain);
            ruidoSrc.connect(flV);
            flV.connect(viento);
            viento.connect(amb);
            ruidoSrc.start();
            barrido.start();
            soplo.start();
        }

        function destello(c, t) {
            var f = ESCALA[Math.floor(Math.random() * ESCALA.length)];
            var o = c.createOscillator();
            var gg = c.createGain();
            o.type = "sine";
            o.frequency.value = f;
            gg.gain.setValueAtTime(0.0001, t);
            gg.gain.exponentialRampToValueAtTime(0.022, t + 0.02);
            gg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
            o.connect(gg);
            gg.connect(eco);
            o.start(t);
            o.stop(t + 1.5);
        }

        function sonar(c, t) {
            var o = c.createOscillator();
            var gg = c.createGain();
            o.type = "sine";
            o.frequency.setValueAtTime(740, t);
            o.frequency.exponentialRampToValueAtTime(720, t + 1.6);
            gg.gain.setValueAtTime(0.0001, t);
            gg.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
            gg.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
            o.connect(gg);
            gg.connect(eco);
            o.start(t);
            o.stop(t + 1.9);
        }

        function ciclo() {
            var c = audio();
            if (!c || !g) return;
            var t = c.currentTime;
            paso++;
            if (modo === "final") {
                var ac = ACORDES_FINAL[paso % ACORDES_FINAL.length];
                ac.forEach(function (f) { nota(c, t, f, 3.2, 0.06, "triangle", 1800, g); });
                for (var q = 0; q < 12; q++) nota(c, t + 0.05 + q * 0.25, ARP_FINAL[q % 4] * (q >= 8 ? 1.5 : 1), 0.26, 0.07, "triangle", 4800, g);
                golpe(c, t, 80, 0.15);
                golpe(c, t + 1.6, 80, 0.15);
                return;
            }
            // estrellas que titilan (2 a 4 por ciclo, en momentos sueltos) y un sonar cada tanto
            var n = 2 + Math.floor(Math.random() * 3);
            for (var k = 0; k < n; k++) destello(c, t + 0.3 + Math.random() * 4.6);
            if (paso % 3 === 0) sonar(c, t + 1 + Math.random() * 2);
            if (modo === "intro") {
                var arp = [440, 554.37, 659.25, 880, 659.25, 554.37];
                for (var a = 0; a < arp.length; a++) nota(c, t + 0.2 + a * 0.75, arp[a], 0.9, 0.035, "sine", 3600, eco);
            }
        }

        function reprogramar() {
            clearInterval(timer);
            timer = setInterval(ciclo, modo === "final" ? 3200 : 5200);
        }

        musicaObj = {
            play: function () {
                var c = audio();
                if (!c) return Promise.resolve();
                if (!g) {
                    g = c.createGain();
                    g.gain.value = 0.0001;
                    g.connect(salida);
                    crearAmbiente(c);
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
                modo = m || "espacio";
                aplicar();
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
    global.SonidosMapa = api;
})(window);
