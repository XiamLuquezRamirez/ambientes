/**
 * ClasificaSentidosSfx — efectos sintetizados (provisionales).
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
        n.frequency.setValueAtTime(curva[0][1], t0);
        for (let i = 1; i < curva.length; i++) n.frequency.exponentialRampToValueAtTime(Math.max(1, curva[i][1]), t0 + curva[i][0]);
        const vol = o.vol || 0.2;
        const a = Math.min(o.ataque || 0.01, dur / 2);
        const r = Math.min(o.caida != null ? o.caida : dur * 0.6, Math.max(0.01, dur - a));
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + a);
        g.gain.setValueAtTime(vol, t0 + dur - r);
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
        const vol = o.vol || 0.15;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + (o.ataque || 0.01));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        let salida = src;
        if (o.filtro) {
            const f = c.createBiquadFilter();
            f.type = o.filtro;
            f.frequency.value = o.f || 1200;
            salida.connect(f);
            salida = f;
        }
        salida.connect(g).connect(dest);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }

    const EFECTOS = {
        bumBum: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [0, 0.22].forEach(function (d) {
                osc(c, c.destination, t + d, 0.2, { tipo: "sine", vol: 0.28, curva: [[0, 90], [0.18, 50]] });
            });
        },
        aroma: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.45, { vol: 0.08, filtro: "lowpass", f: 500, ataque: 0.08 });
        },
        dingDingDong: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [784, 988, 1174].forEach(function (f, i) {
                osc(c, c.destination, t + i * 0.16, 0.45, { tipo: "sine", f: f, vol: 0.16, caida: 0.4 });
            });
        },
        sfffffBloom: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.35, { vol: 0.1, filtro: "highpass", f: 2000, ataque: 0.02 });
            osc(c, c.destination, t + 0.12, 0.4, { tipo: "sine", f: 880, vol: 0.12, curva: [[0, 880], [0.35, 1320]] });
        },
        puffShine: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.12, { vol: 0.12, filtro: "bandpass", f: 1400 });
            osc(c, c.destination, t + 0.08, 0.4, { tipo: "triangle", f: 1200, vol: 0.12, curva: [[0, 900], [0.35, 1600]] });
        },
        dingDongTam: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            osc(c, c.destination, t, 0.3, { tipo: "sine", f: 660, vol: 0.16 });
            osc(c, c.destination, t + 0.18, 0.35, { tipo: "sine", f: 880, vol: 0.14 });
            osc(c, c.destination, t + 0.34, 0.2, { tipo: "triangle", f: 196, vol: 0.18 });
        },
        miamSour: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            osc(c, c.destination, t, 0.25, { tipo: "sine", vol: 0.16, curva: [[0, 500], [0.2, 800]] });
            osc(c, c.destination, t + 0.22, 0.2, { tipo: "square", f: 1400, vol: 0.05 });
        },
        textura: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.28, { vol: 0.14, filtro: "bandpass", f: 700 });
        },
        boing: function () {
            const c = contexto();
            if (!c) return;
            osc(c, c.destination, c.currentTime, 0.28, { tipo: "sine", vol: 0.18, curva: [[0, 180], [0.08, 320], [0.25, 140]] });
        },
        pop: function () {
            const c = contexto();
            if (!c) return;
            osc(c, c.destination, c.currentTime, 0.12, { tipo: "sine", vol: 0.15, curva: [[0, 600], [0.1, 200]] });
        },
        recompensa: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [523, 659, 784, 1046].forEach(function (f, i) {
                osc(c, c.destination, t + i * 0.1, 0.35, { tipo: "sine", f: f, vol: 0.16 });
            });
        }
    };

    function sonar(nombre) {
        const fn = EFECTOS[nombre];
        if (fn) fn();
    }

    global.ClasificaSentidosSfx = { EFECTOS: Object.keys(EFECTOS), sonar: sonar };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ClasificaSentidosSfx;
})(typeof window !== "undefined" ? window : globalThis);
