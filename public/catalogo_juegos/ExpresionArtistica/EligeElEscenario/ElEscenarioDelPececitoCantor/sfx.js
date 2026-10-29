/**
 * EligeElEscenarioSfx — telones, utilería y festejos con WebAudio.
 */
(function (global) {
    "use strict";

    let ctx = null;
    let ruidoBuffer = null;
    let bus = null;

    function contexto() {
        const Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }
    function salida(c) {
        if (!bus) {
            bus = c.createGain();
            bus.gain.value = 1;
            bus.connect(c.destination);
        }
        return bus;
    }
    function ruidoBlanco(c) {
        if (ruidoBuffer) return ruidoBuffer;
        const largo = Math.ceil(c.sampleRate * 2);
        ruidoBuffer = c.createBuffer(1, largo, c.sampleRate);
        const data = ruidoBuffer.getChannelData(0);
        for (let i = 0; i < largo; i++) data[i] = Math.random() * 2 - 1;
        return ruidoBuffer;
    }
    function env(g, t0, dur, vol, ataque) {
        const a = Math.min(ataque || 0.01, dur / 3);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }
    function osc(c, dest, t0, dur, o) {
        const n = c.createOscillator();
        const g = c.createGain();
        n.type = o.tipo || "sine";
        n.frequency.setValueAtTime(Math.max(40, o.f || 440), t0);
        (o.curva || []).forEach(function (p) { n.frequency.exponentialRampToValueAtTime(Math.max(40, p[1]), t0 + p[0]); });
        env(g, t0, dur, o.vol || 0.2, o.ataque);
        let s = n;
        (o.filtros || []).forEach(function (f) {
            const b = c.createBiquadFilter();
            b.type = f.tipo;
            b.frequency.value = f.f;
            b.Q.value = f.q || 1;
            s.connect(b);
            s = b;
        });
        s.connect(g).connect(dest);
        n.start(t0);
        n.stop(t0 + dur + 0.05);
    }
    function ruido(c, dest, t0, dur, o) {
        const src = c.createBufferSource();
        src.buffer = ruidoBlanco(c);
        src.loop = true;
        const g = c.createGain();
        env(g, t0, dur, o.vol || 0.2, o.ataque);
        let s = src;
        (o.filtros || []).forEach(function (f) {
            const b = c.createBiquadFilter();
            b.type = f.tipo;
            b.frequency.value = f.f;
            b.Q.value = f.q || 1;
            s.connect(b);
            s = b;
        });
        s.connect(g).connect(dest);
        src.start(t0, Math.random());
        src.stop(t0 + dur + 0.05);
    }
    function tono(f, retraso, dur, vol, tipo) {
        const c = contexto();
        if (!c) return;
        osc(c, salida(c), c.currentTime + (retraso || 0), dur || 0.3, { tipo: tipo || "sine", f: f, vol: vol || 0.16, ataque: 0.01 });
    }

    const EFECTOS = {
        burbujas: function () {
            const c = contexto();
            if (!c) return;
            for (let i = 0; i < 5; i++) tono(500 + i * 80, i * 0.08, 0.12, 0.08);
            ruido(c, salida(c), c.currentTime, 0.35, { vol: 0.06, filtros: [{ tipo: "highpass", f: 900 }] });
        },
        trompeta: function () { tono(392, 0, 0.2, 0.14, "square"); tono(523, 0.18, 0.28, 0.12, "square"); tono(659, 0.4, 0.35, 0.1, "square"); },
        motor: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.5, { vol: 0.1, filtros: [{ tipo: "lowpass", f: 280 }] });
            tono(120, 0, 0.4, 0.08, "sawtooth");
        },
        estrellas: function () { [880, 988, 1175, 1319].forEach(function (f, i) { tono(f, i * 0.07, 0.25, 0.1, "triangle"); }); },
        noche: function () { tono(220, 0, 0.4, 0.1); tono(330, 0.2, 0.5, 0.08); tono(440, 0.45, 0.4, 0.06); },
        engranaje: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.2, { vol: 0.1, filtros: [{ tipo: "bandpass", f: 600, q: 4 }] });
            tono(180, 0.05, 0.15, 0.08, "square");
        },
        fuego: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.45, { vol: 0.1, filtros: [{ tipo: "highpass", f: 400 }] });
            tono(160, 0, 0.3, 0.06, "sawtooth");
        },
        fiesta: function () { [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.06, 0.2, 0.1); }); },
        destello: function () { tono(880, 0, 0.08, 0.1); tono(1320, 0.06, 0.15, 0.12); },
        error: function () { tono(180, 0, 0.15, 0.14, "square"); tono(140, 0.12, 0.2, 0.12, "square"); },
        fanfarria: function () { [392, 523, 659, 784].forEach(function (f, i) { tono(f, i * 0.08, 0.28, 0.12, "triangle"); }); },
        celebracion: function () {
            [523, 659, 784, 1047, 1319].forEach(function (f, i) { tono(f, i * 0.07, 0.3, 0.1); });
        },
        chispas: function () { for (let i = 0; i < 6; i++) tono(700 + Math.random() * 600, i * 0.04, 0.08, 0.07); },
        suave: function () { tono(392, 0, 0.25, 0.1); tono(494, 0.15, 0.3, 0.08); },
        aplausos: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.55, { vol: 0.16, ataque: 0.02, filtros: [{ tipo: "bandpass", f: 1600, q: 0.5 }] });
            tono(523, 0.05, 0.2, 0.06);
        }
    };

    function sonar(nombre) {
        const c = contexto();
        if (!c) return;
        const fn = EFECTOS[nombre];
        if (fn) fn();
    }
    function detener() {
        if (!bus || !ctx) return;
        const viejo = bus;
        bus = null;
        try {
            viejo.gain.cancelScheduledValues(ctx.currentTime);
            viejo.gain.setValueAtTime(viejo.gain.value, ctx.currentTime);
            viejo.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
        } catch (e) { /* noop */ }
    }

    global.EligeElEscenarioSfx = {
        sonar: sonar,
        detener: detener,
        desbloquear: contexto,
        EFECTOS: Object.keys(EFECTOS)
    };
    if (typeof module !== "undefined") module.exports = global.EligeElEscenarioSfx;
})(typeof window !== "undefined" ? window : globalThis);
