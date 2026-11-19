/**
 * SonidosTiro — sonidos originales de "El Tiro al Blanco en Movimiento", sintetizados con Web Audio
 * (window.SonidosTiro). Sin archivos: zumbido espacial de la arena, carga del lanzador, disparo, impactos
 * distintos para 10, 20 y 50 puntos (el centro con fanfarria), intento suave, conteo de puntos, logro de
 * ronda, fuegos artificiales y música de celebración. volumen(pct) controla todo; silenciar(true) lo apaga.
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, efectos = null, amb = null;
    var vol = 0.9, mudo = false;
    var ambienteOn = false, tBrillo = null, nodosAmb = [];
    var musicaOn = false, tMusica = null;
    var ultimoTic = 0;
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

    /** Ruido filtrado; frec1 opcional hace un barrido del filtro (silbido del disco). */
    function soplo(dur, frec, q, v, retraso, tipoFiltro, frec1, destino) {
        if (!listo()) return;
        var t = ctx.currentTime + (retraso || 0);
        var s = ctx.createBufferSource();
        s.buffer = ruido();
        var f = ctx.createBiquadFilter();
        f.type = tipoFiltro || "bandpass";
        f.frequency.setValueAtTime(frec, t);
        if (frec1) f.frequency.exponentialRampToValueAtTime(frec1, t + dur);
        f.Q.value = q;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + dur * 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f);
        f.connect(g);
        g.connect(destino || efectos);
        s.start(t, Math.random());
        s.stop(t + dur + 0.05);
    }

    // ------------------------------------------------------------------ ambiente de la arena espacial

    function brillo() {
        if (!ambienteOn) return;
        var base = [1568, 1760, 2093, 2349, 2637][Math.floor(Math.random() * 5)];
        tono("sine", base, base, 0.9, 0.025, 0, amb);
        tono("sine", base * 1.5, base * 1.5, 0.7, 0.015, 0.12, amb);
        tBrillo = setTimeout(brillo, 2600 + Math.random() * 3800);
    }

    function ambiente(on) {
        if (on === ambienteOn) return;
        ambienteOn = !!on;
        if (!asegurar()) return;
        nodosAmb.forEach(function (n) { try { n.stop(); } catch (e) { /* noop */ } });
        nodosAmb = [];
        clearTimeout(tBrillo);
        if (!ambienteOn) return;
        // zumbido grave de la plataforma: dos osciladores apenas desafinados con vaivén lento
        var filtro = ctx.createBiquadFilter();
        filtro.type = "lowpass";
        filtro.frequency.value = 380;
        var g = ctx.createGain();
        g.gain.value = 0.5;
        filtro.connect(g);
        g.connect(amb);
        [55, 55.6, 82.4].forEach(function (f, i) {
            var o = ctx.createOscillator();
            o.type = i === 2 ? "sine" : "sawtooth";
            o.frequency.value = f;
            var og = ctx.createGain();
            og.gain.value = i === 2 ? 0.5 : 0.22;
            o.connect(og);
            og.connect(filtro);
            o.start();
            nodosAmb.push(o);
        });
        var lfo = ctx.createOscillator(), lfoG = ctx.createGain();
        lfo.frequency.value = 0.07;
        lfoG.gain.value = 140;
        lfo.connect(lfoG);
        lfoG.connect(filtro.frequency);
        lfo.start();
        nodosAmb.push(lfo);
        // aire del espacio: ruido muy suave
        var s = ctx.createBufferSource();
        s.buffer = ruido();
        s.loop = true;
        var f2 = ctx.createBiquadFilter();
        f2.type = "bandpass";
        f2.frequency.value = 900;
        f2.Q.value = 0.6;
        var g2 = ctx.createGain();
        g2.gain.value = 0.012;
        s.connect(f2);
        f2.connect(g2);
        g2.connect(amb);
        s.start();
        nodosAmb.push(s);
        tBrillo = setTimeout(brillo, 1500);
    }

    // ------------------------------------------------------------------ efectos

    var S = {
        seleccion: function () {
            tono("sine", 660, 990, 0.12, 0.12);
            tono("triangle", 1320, 1320, 0.08, 0.05, 0.06);
        },
        aparece: function () {
            soplo(0.6, 600, 2, 0.06, 0, "bandpass", 3200);
            [784, 988, 1175, 1568].forEach(function (f, i) { tono("sine", f, f, 0.25, 0.05, 0.08 * i); });
        },
        /** Carga del lanzador al empezar a apuntar. */
        carga: function () {
            tono("sine", 220, 880, 0.45, 0.09);
            tono("triangle", 440, 1760, 0.45, 0.03, 0.02);
            soplo(0.45, 1200, 4, 0.03, 0, "bandpass", 4000);
        },
        /** Tic suave al mover la mira (limitado para que no sature). */
        mira: function () {
            var ahora = Date.now();
            if (ahora - ultimoTic < 110) return;
            ultimoTic = ahora;
            tono("sine", 1500 + Math.random() * 300, 1500, 0.04, 0.025);
        },
        lanzar: function () {
            tono("sine", 120, 50, 0.22, 0.25);
            tono("square", 900, 180, 0.22, 0.05);
            tono("sawtooth", 1400, 500, 0.16, 0.03, 0.01);
            soplo(0.55, 2400, 1.2, 0.12, 0, "bandpass", 500);
        },
        exterior: function () {
            tono("sine", 660, 660, 0.35, 0.12);
            tono("sine", 990, 990, 0.3, 0.06, 0.05);
            soplo(0.18, 3000, 1, 0.04);
        },
        medio: function () {
            tono("triangle", 784, 784, 0.3, 0.13);
            tono("triangle", 1175, 1175, 0.35, 0.1, 0.08);
            soplo(0.28, 2000, 0.8, 0.07, 0, "bandpass", 6000);
        },
        centro: function () {
            soplo(0.5, 300, 0.7, 0.2, 0, "lowpass", 2400);
            tono("sine", 90, 45, 0.4, 0.25);
            // fanfarria corta
            [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]].forEach(function (n) {
                tono("triangle", n[0], n[0], 0.3, 0.12, n[1]);
                tono("square", n[0] * 2, n[0] * 2, 0.12, 0.018, n[1]);
            });
            tono("triangle", 1047, 1047, 0.7, 0.12, 0.46);
            tono("triangle", 1319, 1319, 0.7, 0.08, 0.46);
            tono("triangle", 1568, 1568, 0.7, 0.07, 0.46);
        },
        /** Intento que no acierta: suave, nunca negativo. */
        fallo: function () {
            tono("sine", 520, 330, 0.5, 0.07);
            soplo(0.7, 1800, 1.5, 0.03, 0.05, "bandpass", 400);
        },
        puntos: function () {
            [1047, 1319, 1568].forEach(function (f, i) { tono("sine", f, f, 0.1, 0.06, i * 0.06); });
        },
        ronda: function () {
            [523, 659, 784, 1047, 1319].forEach(function (f, i) {
                tono("triangle", f, f, 0.3, 0.1, i * 0.09);
                tono("sine", f * 2, f * 2, 0.2, 0.025, i * 0.09);
            });
            soplo(0.8, 5000, 1, 0.04, 0.3, "highpass");
        },
        estrellas: function () {
            [1568, 2093, 2637, 3136].forEach(function (f, i) { tono("sine", f, f, 0.22, 0.05, i * 0.08); });
        },
        fuego: function () {
            soplo(0.35, 1500, 0.8, 0.05, 0, "bandpass", 300);
            soplo(0.45, 600, 0.6, 0.14, 0.32, "lowpass");
            for (var i = 0; i < 6; i++) soplo(0.05, 4000 + Math.random() * 3000, 2, 0.03, 0.4 + Math.random() * 0.4, "bandpass");
        },
        transforma: function () {
            tono("sine", 300, 1200, 0.9, 0.08);
            tono("triangle", 450, 1800, 0.9, 0.04, 0.05);
            soplo(1, 800, 1, 0.05, 0, "bandpass", 5000);
        }
    };

    // ------------------------------------------------------------------ música de celebración

    var MELODIA = [
        [784, 1], [988, 1], [1175, 1], [1568, 2], [1175, 1], [1319, 3],
        [1047, 1], [1319, 1], [1568, 1], [2093, 2], [1760, 1], [1568, 3],
        [1397, 1], [1319, 1], [1175, 1], [988, 1], [1047, 2], [1175, 2], [1568, 4]
    ];
    var BAJOS = [131, 131, 165, 165, 110, 110, 147, 98];

    function compas() {
        if (!musicaOn || !listo()) return;
        var paso = 0.17, t = 0;
        MELODIA.forEach(function (n) {
            tono("triangle", n[0] / 2, n[0] / 2, n[1] * paso * 0.9, 0.08, t);
            tono("sine", n[0], n[0], n[1] * paso * 0.6, 0.025, t);
            t += n[1] * paso;
        });
        for (var b = 0; b < 16; b++) {
            var f = BAJOS[Math.floor(b / 2) % BAJOS.length];
            tono("sine", f, f, paso * 1.6, 0.12, b * paso * 2);
            soplo(0.04, 7000, 1, 0.025, b * paso * 2 + paso, "highpass");
        }
        tMusica = setTimeout(compas, t * 1000);
    }

    function musica(on) {
        clearTimeout(tMusica);
        musicaOn = !!on;
        if (musicaOn) compas();
    }

    global.SonidosTiro = {
        desbloquear: function () {
            if (!asegurar()) return;
            if (ctx.state === "suspended") ctx.resume();
        },
        ambiente: ambiente,
        musica: musica,
        volumen: function (pct) {
            vol = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
            aplicarVolumen();
        },
        silenciar: function (on) {
            mudo = !!on;
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
    Object.keys(S).forEach(function (k) { global.SonidosTiro[k] = S[k]; });
})(window);
