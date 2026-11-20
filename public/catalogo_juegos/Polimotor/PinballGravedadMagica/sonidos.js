/**
 * sonidos.js — El Pinball de Gravedad Mágica
 *
 * Todo el audio es sintetizado con Web Audio: no hay archivos externos. Los sonidos son cortos,
 * cálidos y diferenciables entre sí, sin tonos puros estridentes.
 *
 * El módulo arma un único bus con compresor, así que expone `volumenFondo(pct)` y
 * `volumenEfectos(pct)` para que `comun/volumen.js` pueda separar los dos canales
 * (ver docs/juegos-volumen-polimotor.md). Se llama `SonidosPinball` para que volumen.js lo
 * encuentre solo por su patrón `/^Sonidos[A-Z]/`.
 */
(function (global) {
    "use strict";

    var ctx = null;
    var maestro = null;      // salida general
    var busFondo = null;     // música y zumbido ambiental
    var busEfectos = null;   // golpes, bumpers, voces de la mesa
    var compresor = null;

    var nivelFondo = 0.35;
    var nivelEfectos = 0.8;
    var mudo = false;

    var ambienteNodos = null;
    var musicaTimer = null;
    var pasoMelodia = 0;
    var rodadura = null;

    // ------------------------------------------------------------------ arranque

    function crearContexto() {
        if (ctx && ctx.state !== "closed") return ctx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();

        compresor = ctx.createDynamicsCompressor();
        compresor.threshold.value = -16;
        compresor.ratio.value = 7;
        compresor.attack.value = 0.004;
        compresor.release.value = 0.22;

        maestro = ctx.createGain();
        maestro.gain.value = mudo ? 0 : 1;

        busFondo = ctx.createGain();
        busFondo.gain.value = nivelFondo;

        busEfectos = ctx.createGain();
        busEfectos.gain.value = nivelEfectos;

        busFondo.connect(compresor);
        busEfectos.connect(compresor);
        compresor.connect(maestro);
        maestro.connect(ctx.destination);
        return ctx;
    }

    function desbloquear() {
        crearContexto();
        if (ctx && ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function ahora() { return ctx ? ctx.currentTime : 0; }

    // ------------------------------------------------------------------ bloques básicos

    /** Oscilador con envolvente ADSR simple. */
    function tono(opts) {
        if (!ctx || mudo) return null;
        var t0 = ahora() + (opts.retraso || 0);
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = opts.tipo || "sine";
        osc.frequency.setValueAtTime(opts.freq, t0);
        if (opts.freqFin) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqFin), t0 + opts.dur);
        }
        var vol = (opts.vol === undefined ? 0.3 : opts.vol);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + (opts.ataque || 0.008));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
        osc.connect(g);
        g.connect(opts.bus || busEfectos);
        osc.start(t0);
        osc.stop(t0 + opts.dur + 0.05);
        return osc;
    }

    /** Ruido blanco filtrado: para impactos metálicos y chasquidos. */
    function ruido(opts) {
        if (!ctx || mudo) return null;
        var t0 = ahora() + (opts.retraso || 0);
        var dur = opts.dur || 0.12;
        var muestras = Math.floor(ctx.sampleRate * dur);
        var buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
        var datos = buffer.getChannelData(0);
        for (var i = 0; i < muestras; i++) {
            datos[i] = (Math.random() * 2 - 1) * (1 - i / muestras);
        }
        var src = ctx.createBufferSource();
        src.buffer = buffer;

        var filtro = ctx.createBiquadFilter();
        filtro.type = opts.filtro || "bandpass";
        filtro.frequency.setValueAtTime(opts.freq || 2200, t0);
        if (opts.freqFin) filtro.frequency.exponentialRampToValueAtTime(opts.freqFin, t0 + dur);
        filtro.Q.value = opts.q || 1.2;

        var g = ctx.createGain();
        g.gain.setValueAtTime(opts.vol === undefined ? 0.22 : opts.vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        src.connect(filtro);
        filtro.connect(g);
        g.connect(opts.bus || busEfectos);
        src.start(t0);
        src.stop(t0 + dur + 0.02);
        return src;
    }

    // ------------------------------------------------------------------ sonidos del juego

    /** Lanzamiento: resorte que suelta la bola. */
    function lanzamiento() {
        desbloquear();
        tono({ tipo: "sawtooth", freq: 160, freqFin: 620, dur: 0.3, vol: 0.2 });
        ruido({ freq: 900, freqFin: 2800, dur: 0.22, vol: 0.16 });
        tono({ tipo: "sine", freq: 880, dur: 0.18, vol: 0.14, retraso: 0.12 });
    }

    /** Rebote en pared: golpe seco y corto. */
    function rebote(fuerza) {
        desbloquear();
        var f = Math.min(1, (fuerza || 300) / 700);
        ruido({ freq: 1400 + f * 1200, dur: 0.07, vol: 0.09 + f * 0.1, q: 2.2 });
        tono({ tipo: "triangle", freq: 220 + f * 180, freqFin: 120, dur: 0.09, vol: 0.09 + f * 0.08 });
    }

    /** Impacto metálico (rampas y carriles). */
    function metalico() {
        desbloquear();
        ruido({ freq: 3200, freqFin: 1400, dur: 0.14, vol: 0.12, q: 3 });
        tono({ tipo: "square", freq: 1320, freqFin: 880, dur: 0.1, vol: 0.06 });
    }

    /** Bumper: cada uno tiene su nota, así los rebotes suenan musicales. */
    function bumper(nota) {
        desbloquear();
        var f = nota || 523.25;
        tono({ tipo: "triangle", freq: f, dur: 0.26, vol: 0.26 });
        tono({ tipo: "sine", freq: f * 2, dur: 0.2, vol: 0.12, retraso: 0.015 });
        ruido({ freq: 2600, dur: 0.09, vol: 0.1 });
    }

    /** Diana encendida: arpegio ascendente breve. */
    function diana() {
        desbloquear();
        [784, 988, 1175].forEach(function (f, i) {
            tono({ tipo: "triangle", freq: f, dur: 0.17, vol: 0.2, retraso: i * 0.055 });
        });
    }

    /** Palanca: golpe mecánico. Izquierda y derecha suenan distinto a propósito. */
    function flipper(lado) {
        desbloquear();
        var base = lado === "izquierda" ? 180 : 240;
        ruido({ freq: base * 5, freqFin: base * 2, dur: 0.1, vol: 0.16, q: 1.6 });
        tono({ tipo: "square", freq: base, freqFin: base * 0.6, dur: 0.11, vol: 0.14 });
    }

    /** Palanca al aire (sin bola cerca): más suave, nunca suena a error. */
    function flipperVacio(lado) {
        desbloquear();
        var base = lado === "izquierda" ? 180 : 240;
        ruido({ freq: base * 4, dur: 0.07, vol: 0.07, q: 1.4 });
    }

    /** Caída de la bola: descenso amable, sin dramatismo. */
    function caida() {
        desbloquear();
        tono({ tipo: "sine", freq: 520, freqFin: 160, dur: 0.55, vol: 0.2 });
        tono({ tipo: "sine", freq: 390, freqFin: 120, dur: 0.6, vol: 0.12, retraso: 0.06 });
    }

    /** Rescate: la bola vuelve al juego. */
    function rescate() {
        desbloquear();
        [392, 523, 659].forEach(function (f, i) {
            tono({ tipo: "sine", freq: f, dur: 0.2, vol: 0.2, retraso: i * 0.07 });
        });
    }

    /** Punto conseguido. */
    function punto() {
        desbloquear();
        tono({ tipo: "sine", freq: 1046, dur: 0.12, vol: 0.16 });
    }

    /** Estrella ganada. */
    function estrella() {
        desbloquear();
        [1046, 1318, 1567, 2093].forEach(function (f, i) {
            tono({ tipo: "triangle", freq: f, dur: 0.22, vol: 0.18, retraso: i * 0.06 });
        });
    }

    /** Victoria: fanfarria con cuerpo, no tonos pelados. */
    function victoria() {
        desbloquear();
        var acordes = [
            [523, 659, 784],
            [587, 740, 880],
            [659, 831, 988],
            [784, 988, 1175]
        ];
        acordes.forEach(function (ac, i) {
            ac.forEach(function (f) {
                tono({ tipo: "triangle", freq: f, dur: 0.45, vol: 0.14, retraso: i * 0.22 });
            });
        });
        ruido({ freq: 5200, freqFin: 1800, dur: 1.4, vol: 0.08, retraso: 0.8, filtro: "lowpass" });
    }

    /** Rodadura continua: zumbido grave que sigue la velocidad de la bola. */
    function rodar(intensidad) {
        if (!ctx || mudo) return;
        if (!rodadura) {
            var src = ctx.createBufferSource();
            var dur = 2;
            var buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
            var d = buf.getChannelData(0);
            for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            src.buffer = buf;
            src.loop = true;

            var filtro = ctx.createBiquadFilter();
            filtro.type = "bandpass";
            filtro.frequency.value = 320;
            filtro.Q.value = 0.8;

            var g = ctx.createGain();
            g.gain.value = 0;

            src.connect(filtro);
            filtro.connect(g);
            g.connect(busEfectos);
            src.start();
            rodadura = { src: src, g: g, filtro: filtro };
        }
        var nivel = Math.min(0.08, (intensidad || 0) * 0.08);
        rodadura.g.gain.setTargetAtTime(nivel, ahora(), 0.08);
        rodadura.filtro.frequency.setTargetAtTime(240 + (intensidad || 0) * 420, ahora(), 0.1);
    }

    function pararRodadura() {
        if (rodadura) rodadura.g.gain.setTargetAtTime(0, ahora(), 0.1);
    }

    // ------------------------------------------------------------------ ambiente y música

    /** Zumbido de la máquina encendida. */
    function ambiente(encender) {
        desbloquear();
        if (!ctx) return;
        if (encender === false) {
            if (ambienteNodos) {
                ambienteNodos.g.gain.setTargetAtTime(0, ahora(), 0.3);
                ambienteNodos = null;
            }
            return;
        }
        if (ambienteNodos) return;

        var osc1 = ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.value = 58;
        var osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = 87;

        var g = ctx.createGain();
        g.gain.value = 0;
        g.gain.setTargetAtTime(0.12, ahora(), 0.6);

        var lfo = ctx.createOscillator();
        lfo.frequency.value = 0.18;
        var lfoG = ctx.createGain();
        lfoG.gain.value = 0.035;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);

        osc1.connect(g);
        osc2.connect(g);
        g.connect(busFondo);
        osc1.start();
        osc2.start();
        lfo.start();
        ambienteNodos = { osc1: osc1, osc2: osc2, lfo: lfo, g: g };
    }

    /** Melodía de fondo discreta, en bucle lento, por el bus de fondo. */
    function musica(encender) {
        desbloquear();
        if (!ctx) return;
        if (encender === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;

        var escala = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33];
        pasoMelodia = 0;
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = escala[pasoMelodia % escala.length];
            tono({ tipo: "sine", freq: f, dur: 0.6, vol: 0.055, bus: busFondo });
            tono({ tipo: "sine", freq: f / 2, dur: 0.8, vol: 0.035, bus: busFondo, retraso: 0.02 });
            pasoMelodia++;
        }, 760);
    }

    // ------------------------------------------------------------------ volumen (API de volumen.js)

    function volumenFondo(pct) {
        nivelFondo = Math.max(0, Math.min(100, Number(pct) || 0)) / 100 * 0.7;
        if (busFondo) busFondo.gain.setTargetAtTime(mudo ? 0 : nivelFondo, ahora(), 0.08);
    }

    function volumenEfectos(pct) {
        nivelEfectos = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
        if (busEfectos) busEfectos.gain.setTargetAtTime(mudo ? 0 : nivelEfectos, ahora(), 0.08);
    }

    function volumen(pct) {
        var v = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
        if (maestro) maestro.gain.setTargetAtTime(mudo ? 0 : v, ahora(), 0.08);
    }

    function silenciar(on) {
        mudo = !!on;
        if (maestro) maestro.gain.setTargetAtTime(mudo ? 0 : 1, ahora(), 0.08);
    }

    function silenciado() { return mudo; }

    /** Agacha el fondo mientras habla Zoe o Zeus. */
    function agachar(on) {
        if (!busFondo) return;
        var destino = on ? nivelFondo * 0.3 : nivelFondo;
        busFondo.gain.setTargetAtTime(mudo ? 0 : destino, ahora(), 0.15);
    }

    global.SonidosPinball = {
        desbloquear: desbloquear,
        lanzamiento: lanzamiento,
        rebote: rebote,
        metalico: metalico,
        bumper: bumper,
        diana: diana,
        flipper: flipper,
        flipperVacio: flipperVacio,
        caida: caida,
        rescate: rescate,
        punto: punto,
        estrella: estrella,
        victoria: victoria,
        rodar: rodar,
        pararRodadura: pararRodadura,
        ambiente: ambiente,
        musica: musica,
        volumenFondo: volumenFondo,
        volumenEfectos: volumenEfectos,
        volumen: volumen,
        silenciar: silenciar,
        silenciado: silenciado,
        agachar: agachar
    };

})(typeof window !== "undefined" ? window : globalThis);
