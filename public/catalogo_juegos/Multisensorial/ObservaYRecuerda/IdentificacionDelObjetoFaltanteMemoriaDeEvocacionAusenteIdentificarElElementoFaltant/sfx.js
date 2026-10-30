/**
 * ObservaRecuerdaSfx — efectos sintetizados (provisionales sin archivos).
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
        for (let i = 1; i < curva.length; i++) n.frequency.exponentialRampToValueAtTime(curva[i][1], t0 + curva[i][0]);
        const vol = o.vol || 0.2;
        const a = Math.min(o.ataque || 0.01, dur / 2);
        const r = Math.min(o.caida != null ? o.caida : dur * 0.6, dur - a);
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
        clackMagic: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.08, { vol: 0.22, filtro: "lowpass", f: 800 });
            osc(c, c.destination, t + 0.05, 0.35, { tipo: "triangle", f: 520, vol: 0.18, curva: [[0, 520], [0.3, 280]] });
        },
        shhhZip: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.45, { vol: 0.12, filtro: "highpass", f: 1800, ataque: 0.02 });
        },
        tadaaZip: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [[523, 0], [659, 0.12], [784, 0.24]].forEach(function (p) {
                osc(c, c.destination, t + p[1], 0.35, { tipo: "sine", f: p[0], vol: 0.2 });
            });
        },
        bloomChime: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [660, 880, 1320].forEach(function (f, i) {
                osc(c, c.destination, t + i * 0.06, 0.5, { tipo: "sine", f: f, vol: 0.12 - i * 0.02, caida: 0.45 });
            });
        },
        clickShhh: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.05, { vol: 0.2, filtro: "bandpass", f: 900 });
            ruido(c, c.destination, t + 0.06, 0.35, { vol: 0.1, filtro: "lowpass", f: 400 });
        },
        ratataplanFly: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            for (let i = 0; i < 5; i++) {
                ruido(c, c.destination, t + i * 0.08, 0.06, { vol: 0.18, filtro: "lowpass", f: 600 + i * 80 });
            }
            osc(c, c.destination, t + 0.4, 0.4, { tipo: "sine", f: 440, vol: 0.15, curva: [[0, 440], [0.35, 880]] });
        },
        shineBloom: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            osc(c, c.destination, t, 0.6, { tipo: "sine", f: 880, vol: 0.14, curva: [[0, 880], [0.5, 1320]] });
            osc(c, c.destination, t + 0.1, 0.5, { tipo: "triangle", f: 1100, vol: 0.1 });
        },
        swooshSwitch: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.35, { vol: 0.14, filtro: "bandpass", f: 1200, ataque: 0.01 });
        },
        clickChime: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            osc(c, c.destination, t, 0.15, { tipo: "square", f: 880, vol: 0.1 });
            osc(c, c.destination, t + 0.12, 0.4, { tipo: "sine", f: 1046, vol: 0.16, caida: 0.35 });
        },
        boing: function () {
            const c = contexto();
            if (!c) return;
            osc(c, c.destination, c.currentTime, 0.28, {
                tipo: "sine",
                vol: 0.18,
                curva: [[0, 180], [0.08, 320], [0.25, 140]]
            });
        },
        pop: function () {
            const c = contexto();
            if (!c) return;
            osc(c, c.destination, c.currentTime, 0.12, { tipo: "sine", f: 600, vol: 0.15, curva: [[0, 600], [0.1, 200]] });
        },
        recompensa: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [523, 659, 784, 1046].forEach(function (f, i) {
                osc(c, c.destination, t + i * 0.1, 0.35, { tipo: "sine", f: f, vol: 0.16 });
            });
        },
        suave: function () {
            const c = contexto();
            if (!c) return;
            osc(c, c.destination, c.currentTime, 0.2, { tipo: "sine", f: 300, vol: 0.1 });
        }
    };

    function sonar(nombre) {
        const fn = EFECTOS[nombre];
        if (fn) fn();
    }

    global.ObservaRecuerdaSfx = {
        EFECTOS: Object.keys(EFECTOS),
        sonar: sonar
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ObservaRecuerdaSfx;
})(typeof window !== "undefined" ? window : globalThis);
