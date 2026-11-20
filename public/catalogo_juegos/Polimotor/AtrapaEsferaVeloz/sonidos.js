/**
 * SonidosEsfera — sonidos originales de "¡Atrapa la Esfera Veloz!", sintetizados con Web Audio
 * (window.SonidosEsfera). Sin archivos: zumbido de la central, activación de tubería, aparición de la esfera,
 * zumbido de movimiento mientras vuela, anticipación, aviso de "¡ahora!" al entrar al anillo, captura, toque
 * anticipado (suave), esfera que pasa, inicio y fin de ronda, encendido de la central y celebración final.
 * Todos cortos y suaves. volumen(pct) controla todo; silenciar(true) lo apaga.
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, efectos = null, amb = null;
    var vol = 0.9, mudo = false;
    var ambienteOn = false, nodosAmb = [], tChispa = null;
    var musicaOn = false, tMusica = null;
    var ruidoBuf = null;
    var vuelo = null;

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
        g.gain.exponentialRampToValueAtTime(v, t + dur * 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f);
        f.connect(g);
        g.connect(destino || efectos);
        s.start(t, Math.random());
        s.stop(t + dur + 0.05);
    }

    // ------------------------------------------------------------------ zumbido de la central

    function chispa() {
        if (!ambienteOn) return;
        var f = [1319, 1568, 1760, 2093][Math.floor(Math.random() * 4)];
        tono("sine", f, f * 1.01, 0.5, 0.018, 0, amb);
        tChispa = setTimeout(chispa, 3000 + Math.random() * 4000);
    }

    function ambiente(on) {
        if (!!on === ambienteOn) return;
        ambienteOn = !!on;
        if (!asegurar()) return;
        nodosAmb.forEach(function (n) { try { n.stop(); } catch (e) { /* noop */ } });
        nodosAmb = [];
        clearTimeout(tChispa);
        if (!ambienteOn) return;
        var filtro = ctx.createBiquadFilter();
        filtro.type = "lowpass";
        filtro.frequency.value = 420;
        var g = ctx.createGain();
        g.gain.value = 0.5;
        filtro.connect(g);
        g.connect(amb);
        [65.4, 65.9, 98].forEach(function (f, i) {
            var o = ctx.createOscillator();
            o.type = i === 2 ? "sine" : "triangle";
            o.frequency.value = f;
            var lfo = ctx.createOscillator(), lg = ctx.createGain();
            lfo.frequency.value = 0.15 + i * 0.07;
            lg.gain.value = 1.5;
            lfo.connect(lg);
            lg.connect(o.frequency);
            o.connect(filtro);
            o.start();
            lfo.start();
            nodosAmb.push(o, lfo);
        });
        chispa();
    }

    // ------------------------------------------------------------------ zumbido de movimiento (mientras vuela una esfera)

    function vueloInicio() {
        vueloFin();
        if (!listo()) return;
        var o = ctx.createOscillator(), o2 = ctx.createOscillator();
        var f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = 180;
        o2.type = "sine";
        o2.frequency.value = 360;
        f.type = "lowpass";
        f.frequency.value = 600;
        f.Q.value = 6;
        g.gain.value = 0.0001;
        g.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.25);
        o.connect(f);
        o2.connect(f);
        f.connect(g);
        g.connect(efectos);
        o.start();
        o2.start();
        vuelo = { o: o, o2: o2, f: f, g: g };
    }

    /** k: 0 lejos → 1 en el anillo; sube el tono y abre el filtro (anticipación sonora). */
    function vueloCerca(k) {
        if (!vuelo || !ctx) return;
        var t = ctx.currentTime;
        vuelo.o.frequency.setTargetAtTime(180 + 160 * k, t, 0.08);
        vuelo.o2.frequency.setTargetAtTime(360 + 320 * k, t, 0.08);
        vuelo.f.frequency.setTargetAtTime(600 + 1400 * k, t, 0.08);
    }

    function vueloFin() {
        if (!vuelo || !ctx) return;
        var v = vuelo;
        vuelo = null;
        var t = ctx.currentTime;
        v.g.gain.cancelScheduledValues(t);
        v.g.gain.setTargetAtTime(0.0001, t, 0.06);
        setTimeout(function () {
            try { v.o.stop(); v.o2.stop(); } catch (e) { /* noop */ }
        }, 400);
    }

    // ------------------------------------------------------------------ efectos

    var S = {
        seleccion: function () {
            tono("triangle", 660, 990, 0.12, 0.12);
        },
        tubo: function () {
            soplo(0.5, 400, 2, 0.1, 0, "bandpass", 2400);
            tono("sine", 220, 440, 0.35, 0.05);
        },
        aparece: function () {
            tono("sine", 520, 1040, 0.16, 0.14);
            tono("triangle", 1040, 1560, 0.12, 0.06, 0.06);
        },
        /** Rebote en un espejo: "ting" de cristal, corto y suave. */
        rebote: function () {
            tono("sine", 2093, 2093, 0.35, 0.08);
            tono("sine", 3136, 3136, 0.25, 0.04, 0.02);
            tono("triangle", 1047, 1568, 0.12, 0.05);
        },
        preparar: function () {
            tono("sine", 600, 900, 0.5, 0.05);
        },
        /** Aviso de "¡ahora!": la esfera entró al anillo (no solo color: también sonido). */
        ventana: function () {
            tono("triangle", 1175, 1175, 0.18, 0.12);
            tono("sine", 1760, 1760, 0.22, 0.07, 0.05);
        },
        captura: function () {
            [784, 988, 1175, 1568].forEach(function (f, i) {
                tono("triangle", f, f, 0.22, 0.13, i * 0.06);
            });
            soplo(0.5, 3000, 1, 0.06, 0, "highpass");
            tono("sine", 200, 90, 0.35, 0.12);
        },
        temprano: function () {
            tono("sine", 440, 392, 0.18, 0.07);
        },
        pasa: function () {
            soplo(0.55, 1800, 1.4, 0.06, 0, "bandpass", 400);
            tono("sine", 523, 392, 0.3, 0.05, 0.05);
        },
        anillo: function () {
            tono("sine", 220, 880, 0.9, 0.08);
            tono("triangle", 440, 1320, 0.8, 0.05, 0.2);
        },
        /** El aro se cierra un poco: barrido descendente con brillo. */
        achica: function () {
            tono("sine", 1320, 660, 0.7, 0.07);
            tono("triangle", 990, 495, 0.6, 0.04, 0.08);
            soplo(0.6, 4000, 2, 0.04, 0, "bandpass", 1200);
        },
        /** Cinemática: la cámara cruza el aro y viaja por el túnel (soplo largo que sube). */
        viaje: function () {
            soplo(3.6, 250, 1.2, 0.09, 0, "bandpass", 2600);
            tono("sine", 196, 392, 3.4, 0.05);
            tono("triangle", 392, 784, 3.0, 0.03, 0.4);
        },
        /** La columna de energía del reactor: acorde brillante. */
        columna: function () {
            [523, 659, 784, 1047].forEach(function (f, i) {
                tono("sine", f, f * 1.01, 1.6, 0.07, i * 0.04);
            });
            soplo(1.2, 6000, 1, 0.06, 0, "highpass");
            tono("sawtooth", 65, 130, 1.4, 0.05);
        },
        /** La onda recorre el túnel de vuelta y la cámara regresa (soplo que baja). */
        regreso: function () {
            soplo(3.2, 2600, 1.2, 0.08, 0, "bandpass", 300);
            [1568, 1319, 1175, 988, 784].forEach(function (f, i) {
                tono("triangle", f, f, 0.25, 0.05, 0.3 + i * 0.35);
            });
        },
        rondaInicio: function () {
            tono("triangle", 784, 784, 0.15, 0.1);
            tono("triangle", 1175, 1175, 0.22, 0.1, 0.16);
        },
        rondaFin: function () {
            [523, 659, 784, 1047, 1319].forEach(function (f, i) {
                tono("triangle", f, f, 0.25, 0.11, i * 0.09);
            });
        },
        expande: function () {
            soplo(1.6, 200, 1, 0.12, 0, "lowpass", 3000);
            tono("sine", 110, 440, 1.6, 0.1);
        },
        reactor: function () {
            tono("sawtooth", 80, 160, 1.2, 0.05);
            tono("sine", 330, 660, 1.0, 0.07, 0.2);
        },
        fiesta: function () {
            [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach(function (f, i) {
                tono("triangle", f, f, 0.22, 0.1, i * 0.11);
            });
            soplo(0.8, 5000, 1, 0.05, 0.3, "highpass");
        }
    };

    // ------------------------------------------------------------------ música de celebración

    var MELODIA = [[784, 1], [988, 1], [1175, 1], [1568, 2], [1319, 1], [1175, 1], [988, 2], [1047, 1], [1175, 1], [1319, 2], [1568, 2]];
    var BAJOS = [196, 247, 262, 294];

    function compas() {
        if (!musicaOn) return;
        var paso = 0.17;
        var t = 0;
        MELODIA.forEach(function (n) {
            tono("triangle", n[0], n[0], n[1] * paso * 0.8, 0.045, t);
            t += n[1] * paso;
        });
        for (var b = 0; b < 8; b++) {
            var f = BAJOS[Math.floor(b / 2) % BAJOS.length];
            tono("sine", f, f, paso * 1.6, 0.08, b * paso * 2);
        }
        tMusica = setTimeout(compas, t * 1000 + 400);
    }

    function musica(on) {
        clearTimeout(tMusica);
        musicaOn = !!on;
        if (musicaOn) compas();
    }

    global.SonidosEsfera = {
        desbloquear: function () {
            if (!asegurar()) return;
            if (ctx.state === "suspended") ctx.resume();
        },
        ambiente: ambiente,
        musica: musica,
        vueloInicio: vueloInicio,
        vueloCerca: vueloCerca,
        vueloFin: vueloFin,
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
            vueloFin();
        },
        sonar: function (nombre) {
            if (S[nombre]) S[nombre]();
        }
    };
    Object.keys(S).forEach(function (k) { global.SonidosEsfera[k] = S[k]; });
})(window);
