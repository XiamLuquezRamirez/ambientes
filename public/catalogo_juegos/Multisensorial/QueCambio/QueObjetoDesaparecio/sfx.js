/**
 * QueCambioSfx — efectos sintetizados.
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
    function osc(c, dest, t0, dur, o) {
        const n = c.createOscillator();
        const g = c.createGain();
        n.type = o.tipo || "sine";
        const curva = o.curva || [[0, o.f || 440]];
        n.frequency.setValueAtTime(Math.max(1, curva[0][1]), t0);
        for (let i = 1; i < curva.length; i++) n.frequency.exponentialRampToValueAtTime(Math.max(1, curva[i][1]), t0 + curva[i][0]);
        const vol = o.vol || 0.18;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        n.connect(g).connect(dest);
        n.start(t0);
        n.stop(t0 + dur + 0.05);
    }
    function ruido(c, dest, t0, dur, o) {
        const largo = Math.ceil(c.sampleRate * Math.max(dur, 0.05));
        const buf = c.createBuffer(1, largo, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < largo; i++) data[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource();
        src.buffer = buf;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.12, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        let salida = src;
        if (o.filtro) {
            const f = c.createBiquadFilter();
            f.type = o.filtro;
            f.frequency.value = o.f || 1000;
            salida.connect(f);
            salida = f;
        }
        salida.connect(g).connect(dest);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }
    const EFECTOS = {
        flashSnap: function () {
            const c = contexto(); if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.08, { vol: 0.2, filtro: "highpass", f: 2000 });
        },
        flashChick: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.06, { vol: 0.16, filtro: "highpass", f: 2500 });
            osc(c, c.destination, t + 0.08, 0.12, { tipo: "square", f: 1800, vol: 0.05 });
        },
        clickShhh: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.05, { vol: 0.18, filtro: "bandpass", f: 900 });
            ruido(c, c.destination, t + 0.08, 0.35, { vol: 0.08, filtro: "lowpass", f: 400 });
        },
        clickWhir: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            osc(c, c.destination, t, 0.4, { tipo: "sawtooth", vol: 0.05, curva: [[0, 180], [0.35, 90]] });
            ruido(c, c.destination, t, 0.08, { vol: 0.12, filtro: "bandpass", f: 700 });
        },
        boingShine: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            osc(c, c.destination, t, 0.28, { tipo: "sine", vol: 0.2, curva: [[0, 180], [0.08, 420], [0.25, 160]] });
            osc(c, c.destination, t + 0.2, 0.35, { tipo: "triangle", f: 1200, vol: 0.1 });
        },
        dingDing: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            [784, 1046].forEach(function (f, i) { osc(c, c.destination, t + i * 0.16, 0.4, { tipo: "sine", f: f, vol: 0.16 }); });
        },
        dingDong: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            osc(c, c.destination, t, 0.35, { tipo: "sine", f: 660, vol: 0.16 });
            osc(c, c.destination, t + 0.2, 0.45, { tipo: "sine", f: 880, vol: 0.14 });
        },
        tadaaSparkle: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            [523, 659, 784, 1046].forEach(function (f, i) { osc(c, c.destination, t + i * 0.08, 0.3, { tipo: "sine", f: f, vol: 0.14 }); });
        },
        boing: function () {
            const c = contexto(); if (!c) return;
            osc(c, c.destination, c.currentTime, 0.28, { tipo: "sine", vol: 0.18, curva: [[0, 180], [0.08, 320], [0.25, 140]] });
        },
        pop: function () {
            const c = contexto(); if (!c) return;
            osc(c, c.destination, c.currentTime, 0.12, { tipo: "sine", vol: 0.14, curva: [[0, 600], [0.1, 220]] });
        },
        recompensa: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            [523, 659, 784, 1046].forEach(function (f, i) { osc(c, c.destination, t + i * 0.1, 0.3, { tipo: "sine", f: f, vol: 0.15 }); });
        }
    };
    global.QueCambioSfx = {
        EFECTOS: Object.keys(EFECTOS),
        sonar: function (nombre) { if (EFECTOS[nombre]) EFECTOS[nombre](); }
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.QueCambioSfx;
})(typeof window !== "undefined" ? window : globalThis);
