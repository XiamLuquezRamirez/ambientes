/**
 * SonidosHuellas — efectos de "¡La Pista de Patrones de Huellas y Ritmo!" sintetizados con Web Audio
 * (window.SonidosHuellas), sin archivos nuevos. Cada huella tiene una identidad sonora clara, reconocible
 * incluso sin mirar la pantalla. Además del timbre, cada una tiene su propio RITMO, para que no se
 * confundan entre sí. Cada sonido de huella dura 1,5 s (DURACION) y suena FUERTE y parejo todo ese tiempo
 * (base sostenida + golpes del mismo volumen); solo se suelta en los últimos 0,1 s:
 *   palmada()    MANO IZQUIERDA   palmas seguidas            ¡PLAF-PLAF-PLAF-PLAF!  (6 palmadas)
 *   campana()    MANO DERECHA     campana que no se apaga    ¡TIN-TIN-TIN!          (agudo, 3 campanadas)
 *   tambor()     PIE IZQUIERDO    tambor grave               ¡BUM-BUM-BUM-BUM!      (grave, 4 golpes)
 *   bloque()     PIE DERECHO      golpes de madera           ¡toc-toc-TOC-toc!      (8 golpes secos)
 *   salto()      AMBOS PIES       resorte que sube y cae     ¡boing-PUM! ×3         (3 saltos)
 * Cuando empieza una huella (o un sonido del juego que corta), la anterior se apaga en un instante: si el
 * niño toca rápido, cada sonido se oye limpio. Las huellas aceptan `corto` (true) para una versión breve
 * que no corta a las demás: se usa cuando todas suenan seguidas como celebración.
 * Y los sonidos del juego:
 *   seleccion()        "clic" suavecito al tocar (no tapa el sonido de la huella)
 *   paso()             pisada de Zeus al avanzar por el circuito
 *   rebote()           "boing" amable de la plataforma equivocada (nunca estridente)
 *   nota(f)            nota tipo marimba (las huellas "cantan" en el acierto)
 *   suave()            dos notas graves y amables
 *   fanfarria()        arpegio alegre (ronda completada y meta)
 *   cuentaAtras()      tres toques cortos antes de encender la secuencia
 *   fiesta()           melodía corta de celebración
 * Todas devuelven cuánto dura el sonido en segundos (0 si no sonó): script.js lo usa para bajar la
 * música de fondo mientras suena y para no encender la siguiente huella antes de que acabe el sonido.
 * Pasan por un bus con un poco de eco (sala) y un compresor, que les da cuerpo sin saturar. Respeta el
 * silencio global de PedNia; sin Web Audio no suena y no falla.
 */
(function (global) {
    "use strict";

    var ctx = null;
    var bus = null;
    var VOL = 1.8;
    var ECO = 0.2;
    /** Duración de cada sonido de huella (segundos): suena fuerte y parejo todo ese tiempo. */
    var DURACION = 1.5;
    /** Mientras se arma un sonido, sus voces van a este nodo (su propio volumen, para poder apagarlo). */
    var destino = null;
    /** Volumen del último sonido que corta: el siguiente que corta lo apaga. */
    var vozAnterior = null;

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

    /** Respuesta de sala sintética (ruido que se apaga en ~1 s): da cola a los sonidos. */
    function respuestaSala(c, seg) {
        var largo = Math.floor(c.sampleRate * seg);
        var buf = c.createBuffer(2, largo, c.sampleRate);
        for (var canal = 0; canal < 2; canal++) {
            var d = buf.getChannelData(canal);
            for (var i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, 2.6);
        }
        return buf;
    }

    /** Entrada común: seco + eco → compresor → altavoz. */
    function salida(c) {
        if (bus) return bus;
        var entrada = c.createGain();
        var comp = c.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 12;
        comp.ratio.value = 4;
        comp.attack.value = 0.004;
        comp.release.value = 0.2;
        entrada.connect(comp);
        try {
            var sala = c.createConvolver();
            sala.buffer = respuestaSala(c, 1.1);
            var mojado = c.createGain();
            mojado.gain.value = ECO;
            entrada.connect(sala);
            sala.connect(mojado);
            mojado.connect(comp);
        } catch (e) { /* sin eco */ }
        comp.connect(c.destination);
        bus = entrada;
        return bus;
    }

    function volumen() {
        var A = global.PedniaAudio;
        if (A && typeof A.silenciado === "function" && A.silenciado()) return 0;
        return VOL;
    }

    /**
     * Envolvente de volumen. Sin `sostener`: golpe que se apaga solo. Con `sostener`: sube, se queda
     * FUERTE todo el tiempo y solo se apaga en los últimos 0,1 s (los sonidos de huella suenan parejos).
     */
    function envolvente(g, t0, dur, vol, ataque, sostener) {
        var v = Math.max(0.0002, vol);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(v, t0 + ataque);
        if (sostener) {
            var suelta = Math.min(0.1, dur * 0.3);
            g.gain.setValueAtTime(v, t0 + Math.max(ataque, dur - suelta));
            g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
        } else {
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        }
    }

    /**
     * Un oscilador con envolvente. opc: { ataque (s), f1 (frecuencia final), tGlide, vibrato: [hz, cents],
     * sostener }.
     */
    function tono(c, t0, f, dur, tipo, vol, opc) {
        opc = opc || {};
        var o = c.createOscillator();
        var g = c.createGain();
        o.type = tipo || "triangle";
        o.frequency.setValueAtTime(f, t0);
        if (opc.f1 && opc.f1 !== f) {
            o.frequency.exponentialRampToValueAtTime(Math.max(20, opc.f1), t0 + (opc.tGlide || dur));
        }
        if (opc.vibrato) {
            var lfo = c.createOscillator();
            var prof = c.createGain();
            lfo.frequency.value = opc.vibrato[0];
            prof.gain.value = opc.vibrato[1];
            lfo.connect(prof);
            prof.connect(o.detune);
            lfo.start(t0);
            lfo.stop(t0 + dur + 0.05);
        }
        envolvente(g, t0, dur, vol, opc.ataque || 0.008, opc.sostener);
        o.connect(g);
        g.connect(destino || salida(c));
        o.start(t0);
        o.stop(t0 + dur + 0.05);
    }

    function ruido(c, t0, dur, tipoFiltro, f0, f1, vol, q, ataque, sostener) {
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
        envolvente(g, t0, dur, vol, ataque || Math.min(0.008, dur / 4), sostener);
        src.buffer = buf;
        src.connect(f);
        f.connect(g);
        g.connect(destino || salida(c));
        src.start(t0);
    }

    /** Nota tipo marimba: fundamental + armónicos cortos, caída rápida. */
    function marimba(c, t0, f, dur, vol) {
        tono(c, t0, f, dur, "sine", vol);
        tono(c, t0, f * 4, dur * 0.25, "sine", vol * 0.25);
        tono(c, t0, f * 2, dur * 0.5, "triangle", vol * 0.18);
    }

    /** Apaga en un instante el sonido anterior que aún suena (fundido corto, sin chasquido). */
    function apagarAnterior(c) {
        if (!vozAnterior) return;
        try {
            vozAnterior.gain.cancelScheduledValues(c.currentTime);
            vozAnterior.gain.setTargetAtTime(0, c.currentTime, 0.04);
        } catch (e) { /* noop */ }
        vozAnterior = null;
    }

    /**
     * Envuelve un sonido: contexto, volumen y hora de inicio; devuelve su duración en segundos.
     * `corta`: true → al empezar apaga el sonido anterior y queda él como el que se puede apagar;
     * "huella" → igual, salvo en su versión corta (primer argumento true), que no corta a nadie.
     */
    function con(fn, corta) {
        return function () {
            var c = audio();
            var v = volumen();
            if (!c || !v) return 0;
            var args = Array.prototype.slice.call(arguments);
            var cortaAhora = corta === true || (corta === "huella" && !args[0]);
            try {
                var voz = c.createGain();
                voz.connect(salida(c));
                if (cortaAhora) {
                    apagarAnterior(c);
                    vozAnterior = voz;
                }
                destino = voz;
                var dur = fn.apply(null, [c, v, c.currentTime + 0.01].concat(args));
                return Number(dur) || 0;
            } catch (e) {
                return 0;
            } finally {
                destino = null;
            }
        };
    }

    // ------------------------------------------------------------------ piezas de las huellas

    /** Un golpe de tambor: parche que baja de tono + cuerpo grave + golpe del mazo. */
    function golpeTambor(c, t, v, largo) {
        tono(c, t, 160, largo, "sine", v * 1.15, { f1: 50, tGlide: Math.min(0.4, largo * 0.7) });
        tono(c, t, 82, largo * 1.25, "sine", v * 0.8, { f1: 42, tGlide: Math.min(0.5, largo * 0.8) });
        tono(c, t, 240, 0.12, "triangle", v * 0.3, { f1: 120 });
        ruido(c, t, 0.12, "lowpass", 1400, 200, v * 0.9, 0.8);
    }

    /** Una campanada: fundamental con ondulación, armónicos inarmónicos y cuerpo grave. */
    function campanada(c, t, f, largo, v) {
        tono(c, t, f, largo, "sine", v * 0.55, { ataque: 0.004 });
        tono(c, t, f * 1.004, largo * 0.95, "sine", v * 0.3, { ataque: 0.004 });   // ondulación "uaua"
        tono(c, t, f * 2.76, largo * 0.4, "sine", v * 0.2, { ataque: 0.003 });
        tono(c, t, f * 5.4, largo * 0.18, "sine", v * 0.1, { ataque: 0.002 });
        tono(c, t, f / 2, largo, "triangle", v * 0.18, { ataque: 0.01 });
        ruido(c, t, 0.03, "highpass", 5000, 5000, v * 0.3, 0.7);
    }

    /** Un golpe de bloque de madera: ataque muy seco y resonancia de madera hueca (`cola` en s). */
    function golpeMadera(c, t, f, v, cola) {
        tono(c, t, f, cola || 0.16, "sine", v * 0.7, { ataque: 0.002 });
        tono(c, t, f * 2.4, 0.05, "square", v * 0.12, { ataque: 0.001 });
        ruido(c, t, 0.04, "bandpass", f * 3, f * 1.5, v * 0.8, 4, 0.002);
    }

    /** Una palmada: chasquido de banda media con brillo agudo y un poco de "carne". */
    function palma(c, t, v) {
        ruido(c, t, 0.11, "bandpass", 1500, 1100, v * 1.1, 1.1, 0.002);
        ruido(c, t + 0.008, 0.08, "highpass", 3800, 3000, v * 0.5, 0.7, 0.002);
        ruido(c, t + 0.016, 0.06, "bandpass", 1200, 900, v * 0.5, 1.2, 0.002);   // segunda mano, casi a la vez
    }

    /** Un salto: resorte que sube y golpe doble al caer con los dos pies. */
    function brinco(c, t, v, largoCaida) {
        tono(c, t, 260, 0.24, "sine", v * 0.7, { f1: 820, tGlide: 0.2, vibrato: [16, 40], sostener: true });
        tono(c, t, 260, 0.24, "triangle", v * 0.3, { f1: 820, tGlide: 0.2, sostener: true });
        tono(c, t + 0.24, 140, largoCaida, "sine", v * 1.1, { f1: 48, tGlide: Math.min(0.25, largoCaida) });
        ruido(c, t + 0.24, 0.1, "lowpass", 1200, 200, v * 0.8, 0.8);
        tono(c, t + 0.28, 110, largoCaida * 0.9, "sine", v * 0.6, { f1: 44 });
    }

    // ------------------------------------------------------------------ las cinco huellas

    /** MANO IZQUIERDA — ¡PLAF-PLAF-PLAF-PLAF! Seis palmadas parejas sobre un aplauso sostenido. */
    var palmada = con(function (c, v, t, corto) {
        if (corto) {
            palma(c, t, v);
            return 0.25;
        }
        var D = DURACION;
        ruido(c, t, D, "bandpass", 1400, 1400, v * 0.9, 0.9, 0.01, true);
        for (var i = 0; i < 6; i++) palma(c, t + i * 0.25, v * (i % 2 ? 2.4 : 2.8));
        tono(c, t, 523.25, D, "triangle", v * 0.22, { sostener: true, ataque: 0.01 });
        return D;
    }, "huella");

    /** MANO DERECHA — ¡TIN-TIN-TIN! Tres campanadas iguales sobre la campana que sigue sonando fuerte. */
    var campana = con(function (c, v, t, corto) {
        if (corto) {
            campanada(c, t, 1318.5, 0.8, v);
            return 0.8;
        }
        var D = DURACION;
        var f = 1318.5;
        tono(c, t, f, D, "sine", v * 0.42, { sostener: true, ataque: 0.004 });
        tono(c, t, f * 1.006, D, "sine", v * 0.26, { sostener: true, ataque: 0.004 });   // ondulación "uaua"
        tono(c, t, f / 2, D, "triangle", v * 0.16, { sostener: true, ataque: 0.01 });
        [0, 0.5, 1.0].forEach(function (s) {
            campanada(c, t + s, f, Math.min(0.5, D - s), v * 0.75);
        });
        return D;
    }, "huella");

    /** PIE IZQUIERDO — ¡BUM-BUM-BUM-BUM! Cuatro golpes de tambor iguales sobre un retumbe grave sostenido. */
    var tambor = con(function (c, v, t, corto) {
        if (corto) {
            golpeTambor(c, t, v, 0.55);
            return 0.6;
        }
        var D = DURACION;
        tono(c, t, 62, D, "sine", v * 0.55, { sostener: true, ataque: 0.02, vibrato: [5, 20] });
        tono(c, t, 124, D, "triangle", v * 0.14, { sostener: true, ataque: 0.02 });
        [0, 0.375, 0.75, 1.125].forEach(function (s) {
            golpeTambor(c, t + s, v * 1.05, Math.min(0.42, D - s));
        });
        return D;
    }, "huella");

    /** PIE DERECHO — ¡toc-toc-TOC-toc! Ocho golpes de madera seguidos, cada uno resuena hasta el siguiente. */
    var bloque = con(function (c, v, t, corto) {
        if (corto) {
            golpeMadera(c, t, 820, v);
            return 0.25;
        }
        var D = DURACION;
        for (var i = 0; i < 8; i++) {
            var s = i * 0.1875;
            var fuerte = i % 4 === 2;
            golpeMadera(c, t + s, fuerte ? 1040 : 820, v * (fuerte ? 1.6 : 1.4), Math.min(0.3, D - s));
        }
        // cuerpo hueco del bloque, sostenido, para que no haya silencios entre golpes
        ruido(c, t, D, "bandpass", 900, 900, v * 0.6, 6, 0.01, true);
        tono(c, t, 410, D, "triangle", v * 0.16, { sostener: true, ataque: 0.01 });
        return D;
    }, "huella");

    /** AMBOS PIES — ¡boing-PUM, boing-PUM, boing-PUM! Tres saltos: el resorte sube y los dos pies caen. */
    var salto = con(function (c, v, t, corto) {
        if (corto) {
            brinco(c, t, v, 0.3);
            return 0.55;
        }
        var D = DURACION;
        tono(c, t, 90, D, "sine", v * 0.35, { sostener: true, ataque: 0.02, vibrato: [4, 30] });
        [0, 0.5, 1.0].forEach(function (s) {
            brinco(c, t + s, v, Math.min(0.28, D - s - 0.24));
        });
        return D;
    }, "huella");

    // ------------------------------------------------------------------ sonidos del juego

    /** Pisada suave de Zeus al avanzar una casilla del circuito (no corta). */
    var paso = con(function (c, v, t) {
        ruido(c, t, 0.05, "lowpass", 700, 220, v * 0.5, 0.9);
        tono(c, t, 120, 0.09, "sine", v * 0.35, { f1: 70 });
        return 0.1;
    });

    /** Plataforma equivocada: "boing" de resorte que baja, amable. Apaga la huella que sonaba. */
    var rebote = con(function (c, v, t) {
        tono(c, t, 420, 0.45, "sine", v * 0.5, { f1: 200 });
        tono(c, t + 0.05, 630, 0.3, "triangle", v * 0.14, { f1: 300 });
        return 0.5;
    }, true);

    /** Clic suave: va con el sonido de la huella, así que se queda muy por debajo (no corta). */
    var seleccion = con(function (c, v, t) {
        ruido(c, t, 0.03, "bandpass", 1800, 1200, v * 0.15, 1.4);
        return 0.05;
    });

    /** Las notas que "cantan" el acierto van seguidas: no se cortan entre sí. */
    var nota = con(function (c, v, t, f) {
        marimba(c, t, f || 659.25, 0.6, v * 0.5);
        return 0.6;
    });

    var suave = con(function (c, v, t) {
        marimba(c, t, 392, 0.4, v * 0.42);
        marimba(c, t + 0.25, 311.13, 0.55, v * 0.38);
        return 0.8;
    }, true);

    var fanfarria = con(function (c, v, t) {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
            marimba(c, t + i * 0.12, f, 0.45, v * 0.45);
        });
        [523.25, 659.25, 783.99].forEach(function (f) {
            tono(c, t + 0.5, f, 1.1, "triangle", v * 0.16);
        });
        return 1.6;
    }, true);

    /** Tres toques de claves antes de encender la secuencia ("¡uno, dos, tres!"). */
    var cuentaAtras = con(function (c, v, t) {
        for (var i = 0; i < 3; i++) {
            ruido(c, t + i * 0.2, 0.05, "bandpass", 2200, 1400, v * 0.5, 3);
            tono(c, t + i * 0.2, i === 2 ? 880 : 660, 0.12, "triangle", v * 0.25);
        }
        return 0.6;
    }, true);

    /** Melodía corta de fiesta: arpegio ascendente con acorde final. */
    var fiesta = con(function (c, v, t) {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) {
            marimba(c, t + i * 0.09, f, 0.4, v * 0.4);
        });
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f) {
            tono(c, t + 0.46, f, 1.3, "triangle", v * 0.14);
        });
        ruido(c, t + 0.46, 0.35, "highpass", 6000, 9000, v * 0.18, 0.8);
        return 1.8;
    }, true);

    /** Sonido de una huella por su nombre de config ("tambor", "campana", …). */
    var PORNOMBRE = {
        palmada: palmada,
        campana: campana,
        tambor: tambor,
        bloque: bloque,
        salto: salto
    };

    function baldosa(nombre, corto) {
        var fn = PORNOMBRE[nombre];
        return fn ? fn(!!corto) : 0;
    }

    /** Apaga ya el sonido de huella (o del juego) que esté sonando. */
    function callar() {
        if (ctx) apagarAnterior(ctx);
    }

    global.SonidosHuellas = {
        DURACION: DURACION,
        palmada: palmada,
        campana: campana,
        tambor: tambor,
        bloque: bloque,
        salto: salto,
        baldosa: baldosa,
        callar: callar,
        seleccion: seleccion,
        paso: paso,
        rebote: rebote,
        nota: nota,
        suave: suave,
        fanfarria: fanfarria,
        cuentaAtras: cuentaAtras,
        fiesta: fiesta
    };

    /*
     * Volumen de efectos para comun/volumen.js (el control "Efectos y voces" del boton de sonido).
     * Este modulo no tiene musica propia: el fondo del juego lo maneja TextoVoz o PedniaAudio.
     * VOL es el factor que multiplica cada sonido, asi que basta escalarlo.
     */
    var VOL_BASE = VOL;
    global.SonidosHuellas.volumenEfectos = function (pct) {
        var f = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
        VOL = VOL_BASE * f;
    };

})(window);
