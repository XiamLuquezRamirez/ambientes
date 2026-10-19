/**
 * ExploraDescubreSfx — efectos sintetizados.
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
        const vol = o.vol || 0.16;
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
        g.gain.exponentialRampToValueAtTime(o.vol || 0.1, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        let salida = src;
        if (o.filtro) {
            const f = c.createBiquadFilter();
            f.type = o.filtro;
            f.frequency.value = o.f || 900;
            salida.connect(f);
            salida = f;
        }
        salida.connect(g).connect(dest);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }
    function arpegio(notas, paso, vol) {
        const c = contexto();
        if (!c) return;
        const t = c.currentTime;
        notas.forEach(function (f, i) { osc(c, c.destination, t + i * paso, 0.28, { tipo: "sine", f: f, vol: vol || 0.14 }); });
    }
    const EFECTOS = {
        chispas: function () { arpegio([880, 1174, 1568, 2093], 0.06, 0.1); },
        bumTap: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            osc(c, c.destination, t, 0.2, { tipo: "sine", vol: 0.2, curva: [[0, 140], [0.15, 70]] });
            osc(c, c.destination, t + 0.22, 0.08, { tipo: "square", f: 420, vol: 0.06 });
            osc(c, c.destination, t + 0.34, 0.08, { tipo: "square", f: 480, vol: 0.06 });
        },
        sfffff: function () {
            const c = contexto(); if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.45, { vol: 0.1, filtro: "bandpass", f: 1400 });
        },
        hielo: function () {
            const c = contexto(); if (!c) return;
            osc(c, c.destination, c.currentTime, 0.35, { tipo: "triangle", vol: 0.1, curva: [[0, 1800], [0.3, 2400]] });
        },
        tadaaRainbow: function () { arpegio([523, 659, 784, 1046, 1318], 0.08, 0.15); },
        ratataplan: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            [0, 0.12, 0.22, 0.34].forEach(function (d, i) {
                osc(c, c.destination, t + d, 0.1, { tipo: "sine", f: i % 2 ? 180 : 140, vol: 0.18 });
            });
        },
        puffBloom: function () {
            const c = contexto(); if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.2, { vol: 0.1, filtro: "highpass", f: 800 });
            arpegio([659, 880, 1174], 0.1, 0.12);
        },
        miamSlurp: function () {
            const c = contexto(); if (!c) return;
            osc(c, c.destination, c.currentTime, 0.35, { tipo: "sine", vol: 0.14, curva: [[0, 500], [0.2, 220], [0.32, 360]] });
        },
        glimmerChime: function () { arpegio([1046, 1318, 1568, 2093], 0.07, 0.12); },
        ratataplanRock: function () {
            const c = contexto(); if (!c) return;
            const t = c.currentTime;
            [0, 0.1, 0.18, 0.28, 0.36].forEach(function (d, i) {
                osc(c, c.destination, t + d, 0.08, { tipo: "sine", f: 120 + (i % 2) * 60, vol: 0.16 });
            });
        },
        slurpFreeze: function () {
            const c = contexto(); if (!c) return;
            osc(c, c.destination, c.currentTime, 0.4, { tipo: "triangle", vol: 0.12, curva: [[0, 700], [0.15, 280], [0.35, 1600]] });
        },
        pop: function () {
            const c = contexto(); if (!c) return;
            osc(c, c.destination, c.currentTime, 0.12, { tipo: "sine", vol: 0.14, curva: [[0, 620], [0.1, 240]] });
        },
        boing: function () {
            const c = contexto(); if (!c) return;
            osc(c, c.destination, c.currentTime, 0.22, { tipo: "sine", vol: 0.16, curva: [[0, 180], [0.08, 320], [0.2, 140]] });
        },
        recompensa: function () { arpegio([523, 659, 784, 1046], 0.1, 0.15); }
    };
    global.ExploraDescubreSfx = {
        EFECTOS: Object.keys(EFECTOS),
        desbloquear: function () { contexto(); },
        sonar: function (nombre) { if (EFECTOS[nombre]) EFECTOS[nombre](); }
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ExploraDescubreSfx;
})(typeof window !== "undefined" ? window : globalThis);
