/**
 * CompletaFiguraSfx — efectos sintetizados con WebAudio (sin archivos).
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
        /** Varita mágica: ¡ding-aling! */
        dingaling: function () {
            [1318.5, 1568, 2093, 1568, 2637].forEach(function (f, k) {
                tono(f, { tipo: "triangle", dur: 0.35, vol: 0.16, retraso: k * 0.07 });
            });
        },
        boing: function () {
            tono(170, { tipo: "sine", dur: 0.42, hasta: 520, vol: 0.32 });
            tono(520, { tipo: "sine", dur: 0.3, hasta: 260, vol: 0.18, retraso: 0.2 });
        },
        splash: function () {
            ruido({ dur: 0.7, desde: 2600, hasta: 300, vol: 0.4 });
            ruido({ dur: 0.35, filtro: "bandpass", desde: 700, q: 2, vol: 0.25, retraso: 0.08 });
        },
        /** Motor atascado que «ronca». */
        ronquido: function () {
            [0, 0.38].forEach(function (r) {
                tono(62, { tipo: "sawtooth", dur: 0.32, hasta: 48, vol: 0.12, retraso: r });
                ruido({ dur: 0.3, desde: 260, vol: 0.08, retraso: r });
            });
        },
        swoosh: function () {
            ruido({ dur: 0.28, filtro: "bandpass", desde: 600, hasta: 2400, q: 1.5, vol: 0.18 });
        },
        /** Imán que engancha: ¡clack! */
        clack: function () {
            ruido({ dur: 0.07, filtro: "highpass", desde: 2200, vol: 0.4 });
            tono(240, { tipo: "square", dur: 0.08, vol: 0.12 });
        },
        puff: function () {
            ruido({ dur: 0.38, desde: 1600, hasta: 240, vol: 0.32 });
        },
        vroom: function () {
            tono(70, { tipo: "sawtooth", dur: 1.1, hasta: 240, vol: 0.16 });
            tono(105, { tipo: "sawtooth", dur: 1.1, hasta: 360, vol: 0.08 });
            ruido({ dur: 1, desde: 500, hasta: 1600, vol: 0.08 });
        },
        /** Encastre de madera: ¡clic! */
        clic: function () {
            tono(820, { tipo: "square", dur: 0.05, vol: 0.12 });
            ruido({ dur: 0.06, filtro: "bandpass", desde: 1800, q: 4, vol: 0.3 });
        },
        golpe: function () {
            tono(120, { tipo: "sine", dur: 0.25, hasta: 60, vol: 0.35 });
            ruido({ dur: 0.12, desde: 900, vol: 0.15 });
        },
        escaner: function () {
            tono(600, { tipo: "sine", dur: 0.9, hasta: 1400, vol: 0.08 });
            [0, 0.3, 0.6].forEach(function (r) { tono(1800, { tipo: "square", dur: 0.04, vol: 0.04, retraso: r }); });
        },
        clackding: function () {
            EFECTOS.clack();
            tono(1568, { tipo: "triangle", dur: 0.6, vol: 0.2, retraso: 0.1 });
            tono(2093, { tipo: "sine", dur: 0.5, vol: 0.1, retraso: 0.16 });
        },
        alerta: function () {
            [0, 0.28].forEach(function (r) {
                tono(880, { tipo: "square", dur: 0.16, vol: 0.07, retraso: r });
                tono(660, { tipo: "square", dur: 0.12, vol: 0.06, retraso: r + 0.14 });
            });
        },
        /** Tuercas girando: ¡zzzz-pop! */
        zzzpop: function () {
            tono(300, { tipo: "sawtooth", dur: 0.7, hasta: 1200, vol: 0.06 });
            tono(900, { tipo: "sine", dur: 0.12, hasta: 1500, vol: 0.25, retraso: 0.72 });
        },
        grua: function () {
            for (let k = 0; k < 6; k++) tono(1100, { tipo: "square", dur: 0.03, vol: 0.05, retraso: k * 0.18 });
            tono(140, { tipo: "sawtooth", dur: 1.1, vol: 0.06 });
        },
        /** Cierre hermético: ¡pum-clack! */
        pumclack: function () {
            tono(110, { tipo: "sine", dur: 0.28, hasta: 55, vol: 0.4 });
            ruido({ dur: 0.07, filtro: "highpass", desde: 2400, vol: 0.35, retraso: 0.2 });
        },
        lluvia: function () {
            ruido({ dur: 2.4, filtro: "highpass", desde: 3000, vol: 0.1, ataque: 0.4 });
            for (let k = 0; k < 10; k++) tono(1800 + Math.random() * 1600, { tipo: "sine", dur: 0.04, vol: 0.04, retraso: 0.2 + k * 0.2 });
        },
        viento: function () {
            ruido({ dur: 1.6, filtro: "bandpass", desde: 400, hasta: 1200, q: 1.2, vol: 0.2, ataque: 0.4 });
        },
        fanfarria: function () {
            [[392, 0, 0.14], [392, 0.16, 0.14], [392, 0.32, 0.14], [523.25, 0.5, 0.7]].forEach(function (n) {
                tono(n[0], { tipo: "triangle", dur: n[2], vol: 0.22, retraso: n[1] });
                tono(n[0] * 1.5, { tipo: "sine", dur: n[2], vol: 0.08, retraso: n[1] });
            });
        },
        magia: function () {
            [1046.5, 1318.5, 1568, 2093].forEach(function (f, k) {
                tono(f, { tipo: "sine", dur: 0.3, vol: 0.12, retraso: k * 0.07 });
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

    global.CompletaFiguraSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
