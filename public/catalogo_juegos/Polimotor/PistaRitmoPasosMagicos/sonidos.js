/**
 * SonidosPista — efectos de "¡La Pista de Ritmo y Pasos Mágicos!" sintetizados con Web Audio
 * (window.SonidosPista), sin archivos nuevos. Cada baldosa tiene una identidad sonora clara, reconocible
 * incluso sin mirar la pantalla:
 *   tambor()     PIE      golpe de tambor grave     ¡BUM!
 *   campana()    MANO     campana alegre            ¡TING!
 *   plim()       CARITA   sonido agudo y divertido  ¡PLIM!
 *   bloque()     RODILLA  bloque de madera seco     ¡TOC!
 *   maraca()     HOMBRO   maraca / shaker           ¡CHIS!
 *   pop()        BARRIGA  burbujita que estalla     ¡POP!
 * Y los sonidos del juego:
 *   seleccion()        "clic" acolchado al tocar
 *   nota(f)            nota tipo marimba (las baldosas "cantan" en el acierto)
 *   suave()            dos notas graves y amables (error, nunca estridente)
 *   fanfarria()        arpegio alegre (ronda completada)
 *   cuentaAtras()      tres toques cortos antes de encender la secuencia
 *   fiesta()           melodía corta de celebración
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

    function tono(c, t0, f, dur, tipo, vol, f1) {
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = tipo || "triangle";
        o.frequency.setValueAtTime(f, t0);
        if (f1 && f1 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
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

    /** Nota tipo marimba: fundamental + armónicos cortos, caída rápida. */
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

    // ------------------------------------------------------------------ las seis baldosas

    /** PIE — ¡BUM! Tambor grave: parche que baja de tono + golpe de bombo. */
    var tambor = con(function (c, v, t) {
        tono(c, t, 150, 0.34, "sine", v * 1.1, 52);
        tono(c, t, 88, 0.42, "sine", v * 0.7, 40);
        ruido(c, t, 0.09, "lowpass", 900, 180, v * 0.8, 0.8);
    });

    /** MANO — ¡TING! Campana alegre: fundamental con armónicos inarmónicos y cola brillante. */
    var campana = con(function (c, v, t) {
        tono(c, t, 1318.5, 0.7, "sine", v * 0.5);
        tono(c, t, 1979, 0.5, "sine", v * 0.25);
        tono(c, t, 2637, 0.34, "sine", v * 0.16);
        tono(c, t, 659.25, 0.8, "triangle", v * 0.2);
        ruido(c, t, 0.04, "highpass", 4200, 4200, v * 0.25, 0.7);
    });

    /** CARITA — ¡PLIM! Agudo y divertido: salto rápido hacia arriba con brillito. */
    var plim = con(function (c, v, t) {
        tono(c, t, 1046.5, 0.14, "triangle", v * 0.45, 2093);
        tono(c, t + 0.07, 2093, 0.3, "sine", v * 0.4);
        tono(c, t + 0.07, 3136, 0.18, "sine", v * 0.16);
        ruido(c, t, 0.03, "highpass", 5000, 5000, v * 0.2, 0.7);
    });

    /** RODILLA — ¡TOC! Bloque de madera: ataque muy corto y seco, medio-agudo. */
    var bloque = con(function (c, v, t) {
        tono(c, t, 880, 0.08, "square", v * 0.3, 620);
        tono(c, t, 440, 0.1, "triangle", v * 0.35, 330);
        ruido(c, t, 0.05, "bandpass", 2400, 1200, v * 0.7, 3.2);
    });

    /** HOMBRO — ¡CHIS! Maraca / shaker: ruido agudo con dos sacudidas. */
    var maraca = con(function (c, v, t) {
        ruido(c, t, 0.11, "highpass", 5200, 7200, v * 0.75, 0.8);
        ruido(c, t + 0.055, 0.08, "highpass", 6200, 8200, v * 0.4, 0.8);
        tono(c, t, 3200, 0.06, "sine", v * 0.1);
    });

    /** BARRIGA — ¡POP! Burbujita: tono que sube muy rápido y se corta. */
    var pop = con(function (c, v, t) {
        tono(c, t, 180, 0.11, "sine", v * 0.85, 820);
        tono(c, t + 0.02, 420, 0.08, "triangle", v * 0.3, 1100);
        ruido(c, t + 0.06, 0.035, "bandpass", 1800, 2600, v * 0.3, 2);
    });

    // ------------------------------------------------------------------ sonidos del juego

    var seleccion = con(function (c, v, t) {
        ruido(c, t, 0.05, "bandpass", 1800, 900, v * 0.4, 1.4);
        marimba(c, t, 880, 0.1, v * 0.2);
    });

    var nota = con(function (c, v, t, f) {
        marimba(c, t, f || 659.25, 0.5, v * 0.5);
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

    /** Tres toques de claves antes de encender la secuencia ("¡uno, dos, tres!"). */
    var cuentaAtras = con(function (c, v, t) {
        for (var i = 0; i < 3; i++) {
            ruido(c, t + i * 0.19, 0.045, "bandpass", 2200, 1400, v * 0.5, 3);
            tono(c, t + i * 0.19, i === 2 ? 880 : 660, 0.07, "triangle", v * 0.22);
        }
    });

    /** Melodía corta de fiesta: arpegio ascendente con acorde final. */
    var fiesta = con(function (c, v, t) {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) {
            marimba(c, t + i * 0.085, f, 0.34, v * 0.4);
        });
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f) {
            tono(c, t + 0.44, f, 1.1, "triangle", v * 0.14);
        });
        ruido(c, t + 0.44, 0.3, "highpass", 6000, 9000, v * 0.18, 0.8);
    });

    /** Sonido de una baldosa por su nombre de config ("tambor", "campana", …). */
    var PORNOMBRE = {
        tambor: tambor,
        campana: campana,
        plim: plim,
        bloque: bloque,
        maraca: maraca,
        pop: pop
    };

    function baldosa(nombre) {
        var fn = PORNOMBRE[nombre];
        if (fn) fn();
    }

    global.SonidosPista = {
        tambor: tambor,
        campana: campana,
        plim: plim,
        bloque: bloque,
        maraca: maraca,
        pop: pop,
        baldosa: baldosa,
        seleccion: seleccion,
        nota: nota,
        suave: suave,
        fanfarria: fanfarria,
        cuentaAtras: cuentaAtras,
        fiesta: fiesta
    };
})(window);
