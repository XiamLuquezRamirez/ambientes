/**
 * BuscaDiferenciasSfx — efectos sintetizados con WebAudio (sin archivos).
 * Provisionales: si config.audios.efectos[nombre] tiene ruta, el juego usa ese archivo.
 */
(function (global) {
    "use strict";

    let ctx = null;

    function contexto() {
        const Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function tono(frecuencia, o) {
        const c = contexto();
        if (!c) return;
        o = o || {};
        const t0 = c.currentTime + (o.retraso || 0);
        const dur = o.dur || 0.3;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = o.tipo || "sine";
        osc.frequency.setValueAtTime(frecuencia, t0);
        if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + Math.min(0.02, dur / 3));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    }

    function ruido(o) {
        const c = contexto();
        if (!c) return;
        o = o || {};
        const t0 = c.currentTime + (o.retraso || 0);
        const dur = o.dur || 0.4;
        const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource();
        src.buffer = buffer;
        const filtro = c.createBiquadFilter();
        filtro.type = o.filtro || "lowpass";
        filtro.frequency.setValueAtTime(o.desde || 1200, t0);
        if (o.hasta) filtro.frequency.exponentialRampToValueAtTime(o.hasta, t0 + dur);
        if (o.q) filtro.Q.setValueAtTime(o.q, t0);
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + (o.ataque || 0.02));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filtro).connect(gain).connect(c.destination);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }

    const EFECTOS = {
        /** Guiño del sol: tintineo corto. */
        guino: function () {
            tono(1568, { tipo: "triangle", dur: 0.18, vol: 0.12 });
            tono(2349, { tipo: "sine", dur: 0.25, vol: 0.08, retraso: 0.1 });
        },
        chispas: function () {
            [1318.5, 1568, 2093, 1568, 2637].forEach(function (f, k) {
                tono(f, { tipo: "triangle", dur: 0.35, vol: 0.14, retraso: k * 0.07 });
            });
        },
        /** Flor que brota: ¡boing-pop! */
        boingpop: function () {
            tono(170, { tipo: "sine", dur: 0.42, hasta: 520, vol: 0.32 });
            tono(900, { tipo: "sine", dur: 0.12, hasta: 1500, vol: 0.25, retraso: 0.44 });
        },
        /** Pintura que gira: ¡swoosh-splash! */
        swooshsplash: function () {
            ruido({ dur: 0.32, filtro: "bandpass", desde: 600, hasta: 2400, q: 1.5, vol: 0.2 });
            ruido({ dur: 0.6, desde: 2600, hasta: 300, vol: 0.32, retraso: 0.3 });
        },
        swoosh: function () {
            ruido({ dur: 0.4, filtro: "bandpass", desde: 500, hasta: 2800, q: 1.5, vol: 0.2 });
        },
        /** Radar del objetivo: ¡bip-bip! */
        bipbip: function () {
            tono(1320, { tipo: "sine", dur: 0.12, vol: 0.2 });
            tono(1320, { tipo: "sine", dur: 0.12, vol: 0.2, retraso: 0.2 });
        },
        escaner: function () {
            tono(600, { tipo: "sine", dur: 0.9, hasta: 1400, vol: 0.08 });
            [0, 0.3, 0.6].forEach(function (r) { tono(1800, { tipo: "square", dur: 0.04, vol: 0.04, retraso: r }); });
        },
        rayo: function () {
            tono(400, { tipo: "sawtooth", dur: 0.5, hasta: 2400, vol: 0.06 });
            tono(2093, { tipo: "sine", dur: 0.4, vol: 0.1, retraso: 0.45 });
        },
        /** Viento mágico: ¡fuuush! */
        fuuush: function () {
            ruido({ dur: 1.1, filtro: "bandpass", desde: 400, hasta: 1400, q: 1.2, vol: 0.22, ataque: 0.25 });
        },
        bote: function () {
            tono(140, { tipo: "sine", dur: 0.18, hasta: 70, vol: 0.3 });
        },
        magia: function () {
            [1046.5, 1318.5, 1568, 2093].forEach(function (f, k) {
                tono(f, { tipo: "sine", dur: 0.3, vol: 0.12, retraso: k * 0.07 });
            });
        },
        deslizar: function () {
            ruido({ dur: 0.7, filtro: "bandpass", desde: 300, hasta: 900, q: 1, vol: 0.1, ataque: 0.2 });
        },
        fanfarria: function () {
            [[392, 0, 0.14], [392, 0.16, 0.14], [392, 0.32, 0.14], [523.25, 0.5, 0.7]].forEach(function (n) {
                tono(n[0], { tipo: "triangle", dur: n[2], vol: 0.22, retraso: n[1] });
                tono(n[0] * 1.5, { tipo: "sine", dur: n[2], vol: 0.08, retraso: n[1] });
            });
        }
    };

    function sonar(nombre) {
        if (!nombre || !EFECTOS[nombre]) return false;
        try {
            EFECTOS[nombre]();
            return true;
        } catch (e) {
            return false;
        }
    }

    global.BuscaDiferenciasSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
