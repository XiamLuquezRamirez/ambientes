/**
 * SonidosComer — sonidos originales de "¡La Hora de Comer!" sintetizados con Web Audio (window.SonidosComer).
 * No usa archivos: ambiente del bosque (brisa, hojas y pajaritos), selección, arrastre, fruta en la boca,
 * masticar, "mmm" de satisfacción, acierto, intento suave, apertura de boca, rebote y música de fiesta.
 * volumen(pct) controla todo; silenciar(true) apaga todo.
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, efectos = null, amb = null;
    var vol = 0.9, mudo = false;
    var ambienteOn = false, tPajaro = null, nodosAmb = [];
    var musicaOn = false, tMusica = null;
    var ultimoArrastre = 0;
    var ruidoBuf = null;

    function asegurar() {
        if (ctx) return ctx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        comp.connect(ctx.destination);
        maestro = ctx.createGain();
        maestro.connect(comp);
        efectos = ctx.createGain();
        efectos.gain.value = 3;
        efectos.connect(maestro);
        amb = ctx.createGain();
        amb.gain.value = 0.9;
        amb.connect(maestro);
        aplicarVolumen();
        return ctx;
    }

    function aplicarVolumen() {
        if (!maestro) return;
        maestro.gain.setTargetAtTime(mudo ? 0 : vol, ctx.currentTime, 0.05);
    }

    function listo() {
        return !!(asegurar() && ctx.state !== "closed" && !mudo);
    }

    function ruido() {
        if (ruidoBuf) return ruidoBuf;
        var n = ctx.sampleRate * 2;
        ruidoBuf = ctx.createBuffer(1, n, ctx.sampleRate);
        var d = ruidoBuf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return ruidoBuf;
    }

    /** Tono con envolvente: tipo, frecuencias (inicio → fin), duración, volumen, retraso. */
    function tono(tipo, f0, f1, dur, v, retraso, destino) {
        if (!listo()) return;
        var t = ctx.currentTime + (retraso || 0);
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = tipo;
        o.frequency.setValueAtTime(f0, t);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.02, dur * 0.2));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(destino || efectos);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    function soplo(dur, frec, q, v, retraso, tipoFiltro, destino) {
        if (!listo()) return;
        var t = ctx.currentTime + (retraso || 0);
        var s = ctx.createBufferSource();
        s.buffer = ruido();
        var f = ctx.createBiquadFilter();
        f.type = tipoFiltro || "bandpass";
        f.frequency.value = frec;
        f.Q.value = q;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + dur * 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f);
        f.connect(g);
        g.connect(destino || efectos);
        s.start(t, Math.random());
        s.stop(t + dur + 0.05);
    }

    // ------------------------------------------------------------------ ambiente del bosque

    function pajarito() {
        if (!ambienteOn) return;
        var base = 2300 + Math.random() * 1400;
        var veces = 2 + Math.floor(Math.random() * 3);
        for (var i = 0; i < veces; i++) {
            tono("sine", base, base * 1.45, 0.09, 0.05, i * 0.13, amb);
            tono("sine", base * 1.4, base * 1.1, 0.07, 0.035, i * 0.13 + 0.08, amb);
        }
        tPajaro = setTimeout(pajarito, 2200 + Math.random() * 4200);
    }

    function ambiente(on) {
        if (on === ambienteOn) return;
        ambienteOn = !!on;
        if (!asegurar()) return;
        nodosAmb.forEach(function (n) { try { n.stop(); } catch (e) { /* noop */ } });
        nodosAmb = [];
        clearTimeout(tPajaro);
        if (!ambienteOn) return;
        // brisa: ruido filtrado con un vaivén lento de volumen
        var s = ctx.createBufferSource();
        s.buffer = ruido();
        s.loop = true;
        var f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 520;
        var g = ctx.createGain();
        g.gain.value = 0.5;
        var lfo = ctx.createOscillator(), lfoG = ctx.createGain();
        lfo.frequency.value = 0.09;
        lfoG.gain.value = 0.03;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        s.connect(f);
        f.connect(g);
        g.connect(amb);
        // hojas: ruido agudo muy suave
        var s2 = ctx.createBufferSource();
        s2.buffer = ruido();
        s2.loop = true;
        var f2 = ctx.createBiquadFilter();
        f2.type = "highpass";
        f2.frequency.value = 3800;
        var g2 = ctx.createGain();
        g2.gain.value = 0.008;
        var lfo2 = ctx.createOscillator(), lfo2G = ctx.createGain();
        lfo2.frequency.value = 0.23;
        lfo2G.gain.value = 0.006;
        lfo2.connect(lfo2G);
        lfo2G.connect(g2.gain);
        s2.connect(f2);
        f2.connect(g2);
        g2.connect(amb);
        [s, lfo, s2, lfo2].forEach(function (n) { n.start(); nodosAmb.push(n); });
        tPajaro = setTimeout(pajarito, 1200);
    }

    // ------------------------------------------------------------------ efectos del juego

    var S = {
        seleccion: function () {
            tono("sine", 520, 900, 0.12, 0.22);
            tono("triangle", 1300, 1300, 0.05, 0.06, 0.02);
        },
        arrastre: function () {
            var ahora = Date.now();
            if (ahora - ultimoArrastre < 170) return;
            ultimoArrastre = ahora;
            soplo(0.12, 1400 + Math.random() * 700, 1.2, 0.035);
        },
        abreBoca: function () {
            tono("triangle", 240, 380, 0.26, 0.11);
            tono("sine", 1500, 2100, 0.12, 0.04, 0.12);
        },
        entraBoca: function () {
            tono("sine", 360, 120, 0.2, 0.3);
            soplo(0.1, 600, 2, 0.08, 0.02);
        },
        masticar: function () {
            soplo(0.06, 1900, 3, 0.16);
            soplo(0.05, 1300, 3, 0.12, 0.08);
            tono("sine", 180, 140, 0.06, 0.08, 0.02);
        },
        satisfaccion: function () {
            if (!listo()) return;
            var t = ctx.currentTime;
            var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
            var vib = ctx.createOscillator(), vibG = ctx.createGain();
            o.type = "sawtooth";
            o.frequency.setValueAtTime(210, t);
            o.frequency.linearRampToValueAtTime(250, t + 0.3);
            o.frequency.linearRampToValueAtTime(200, t + 0.75);
            vib.frequency.value = 6;
            vibG.gain.value = 5;
            vib.connect(vibG);
            vibG.connect(o.frequency);
            f.type = "lowpass";
            f.frequency.value = 520;
            f.Q.value = 6;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.16, t + 0.12);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
            o.connect(f);
            f.connect(g);
            g.connect(efectos);
            o.start(t);
            vib.start(t);
            o.stop(t + 0.85);
            vib.stop(t + 0.85);
        },
        acierto: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { tono("triangle", f, f, 0.22, 0.13, i * 0.08); });
            tono("sine", 2093, 2093, 0.25, 0.04, 0.34);
        },
        error: function () {
            tono("sine", 330, 220, 0.28, 0.12);
            tono("sine", 262, 196, 0.24, 0.07, 0.14);
        },
        rebote: function () {
            tono("sine", 300, 520, 0.1, 0.12);
        },
        aparece: function () {
            tono("sine", 700 + Math.random() * 200, 1200, 0.1, 0.09);
        },
        ronda: function () {
            [392, 523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tono("triangle", f, f, 0.18, 0.12, i * 0.11); });
        },
        /** Pajaritos que llegan cantando a la fiesta. */
        pio: function () {
            for (var i = 0; i < 6; i++) {
                var b = 2400 + (i % 3) * 500;
                tono("sine", b, b * 1.45, 0.09, 0.07, i * 0.14);
                tono("sine", b * 1.4, b * 1.1, 0.07, 0.05, i * 0.14 + 0.08);
            }
        },
        /** Saltitos de la ardilla y el conejo. */
        brinco: function () {
            [0, 0.18, 0.36].forEach(function (t, i) { tono("sine", 260 + i * 60, 520 + i * 80, 0.1, 0.1, t); });
        },
        estrellas: function () {
            for (var i = 0; i < 6; i++) tono("sine", 1500 + i * 220, 2400 + i * 200, 0.12, 0.05, i * 0.06);
        }
    };

    // ------------------------------------------------------------------ música de fiesta (melodía propia)

    var MELODIA = [
        [659, 1], [784, 1], [880, 1], [784, 1], [659, 2], [523, 2],
        [587, 1], [659, 1], [698, 1], [659, 1], [587, 2], [392, 2],
        [523, 1], [659, 1], [784, 1], [1047, 1], [880, 2], [784, 2],
        [698, 1], [659, 1], [587, 1], [494, 1], [523, 4]
    ];
    var BAJOS = [131, 131, 98, 98, 110, 110, 87, 98];

    function compas() {
        if (!musicaOn || !listo()) return;
        var negra = 0.24, t = 0, dur = 0;
        MELODIA.forEach(function (n) {
            tono("triangle", n[0], n[0], n[1] * negra * 0.9, 0.1, t);
            tono("sine", n[0] * 2, n[0] * 2, n[1] * negra * 0.5, 0.025, t);
            t += n[1] * negra;
        });
        dur = t;
        for (var b = 0; b < 16; b++) {
            var f = BAJOS[Math.floor(b / 2) % BAJOS.length];
            tono("sine", f, f, negra * 1.6, 0.12, b * negra * 2);
            soplo(0.05, 6000, 1, 0.03, b * negra * 2 + negra, "highpass");
        }
        tMusica = setTimeout(compas, dur * 1000);
    }

    function musica(on) {
        clearTimeout(tMusica);
        musicaOn = !!on;
        if (musicaOn) compas();
    }

    global.SonidosComer = {
        desbloquear: function () {
            if (!asegurar()) return;
            if (ctx.state === "suspended") ctx.resume();
        },
        ambiente: ambiente,
        musica: musica,
        /**
         * Volumen de la musica/ambiente (0..100), independiente de los efectos.
         * Lo usa comun/volumen.js (el canal "Musica de fondo" del boton de sonido).
         */
        volumenFondo: function (pct) {
            if (!asegurar() || !amb) return;
            var f = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
            amb.gain.setTargetAtTime(0.9 * f, ctx.currentTime, 0.05);
        },
        /**
         * Volumen de los efectos (0..100), independiente del fondo.
         * Lo usa comun/volumen.js (el canal "Efectos y voces" del boton de sonido).
         */
        volumenEfectos: function (pct) {
            if (!asegurar() || !efectos) return;
            var f = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
            efectos.gain.setTargetAtTime(3 * f, ctx.currentTime, 0.05);
        },
        volumen: function (pct) {
            vol = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
            aplicarVolumen();
        },
        silenciar: function (on) {
            mudo = !!on;
            asegurar();
            aplicarVolumen();
        },
        silenciado: function () { return mudo; },
        /** Baja el ambiente mientras hablan Zoe o Zeus. */
        agachar: function (on) {
            if (!amb) return;
            amb.gain.setTargetAtTime(on ? 0.25 : 0.9, ctx.currentTime, 0.2);
        },
        detenerTodo: function () {
            ambiente(false);
            musica(false);
        },
        sonar: function (nombre) {
            if (S[nombre]) S[nombre]();
        }
    };
    Object.keys(S).forEach(function (k) { global.SonidosComer[k] = S[k]; });
})(window);
