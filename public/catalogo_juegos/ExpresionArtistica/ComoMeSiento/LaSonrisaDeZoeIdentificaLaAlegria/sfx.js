/**
 * ComoMeSientoSfx — mezcla, xilófono, bocina y festejos con WebAudio.
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
        campana: function () { tono(392, 0, 0.12, 0.12); tono(523, 0.1, 0.18, 0.14); tono(659, 0.22, 0.28, 0.12); },
        cristal: function () {
            const c = contexto();
            if (!c) return;
            for (let i = 0; i < 4; i++) tono(600 + i * 120, i * 0.07, 0.1, 0.08);
            ruido(c, salida(c), c.currentTime, 0.25, { vol: 0.08, ataque: 0.02, filtros: [{ tipo: "highpass", f: 800 }] });
        },
        xilofono: function () { [523, 587, 659, 784].forEach(function (f, i) { tono(f, i * 0.05, 0.2, 0.1, "triangle"); }); },
        madera: function () { tono(440 + Math.random() * 200, 0, 0.18, 0.12, "triangle"); },
        silbato: function () { tono(320, 0, 0.15, 0.14); tono(480, 0.12, 0.2, 0.12); },
        destello: function () { tono(880, 0, 0.08, 0.1); tono(1320, 0.06, 0.15, 0.12); },
        alarma: function () {
            for (let i = 0; i < 4; i++) { tono(880, i * 0.12, 0.08, 0.12, "square"); tono(660, i * 0.12 + 0.06, 0.06, 0.1, "square"); }
        },
        arpa: function () { [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.06, 0.35, 0.1, "triangle"); }); },
        laser: function () {
            const c = contexto();
            if (!c) return;
            osc(c, salida(c), c.currentTime, 0.28, { tipo: "sawtooth", f: 1200, vol: 0.1, ataque: 0.01, curva: [[0.25, 400]] });
        },
        teleport: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.35, { vol: 0.14, ataque: 0.01, filtros: [{ tipo: "bandpass", f: 2000, q: 0.6 }] });
            tono(1400, 0, 0.12, 0.1); tono(400, 0.15, 0.2, 0.08);
        },
        salpicadura: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.15, { vol: 0.18, ataque: 0.005, filtros: [{ tipo: "bandpass", f: 1200, q: 0.8 }] });
            tono(700 + Math.random() * 400, 0, 0.2, 0.1);
        },
        fuego: function () { tono(200, 0, 0.2, 0.08, "sawtooth"); tono(400, 0.1, 0.15, 0.08); },
        hielo: function () { tono(900, 0, 0.12, 0.08); tono(1200, 0.08, 0.18, 0.1); },
        recompensa: function () { [523, 659, 784].forEach(function (f, i) { tono(f, i * 0.08, 0.28, 0.14); }); },
        fanfarria: function () { [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.1, 0.35, 0.14, "triangle"); }); },
        celebracion: function () { [392, 523, 659, 784].forEach(function (f, i) { tono(f, i * 0.08, 0.32, 0.12, "triangle"); }); },
        chispas: function () { for (let i = 0; i < 5; i++) tono(1400 + i * 180, i * 0.05, 0.12, 0.06); },
        suave: function () { tono(300, 0, 0.14, 0.08); },
        error: function () { tono(220, 0, 0.12, 0.1, "triangle"); tono(180, 0.1, 0.16, 0.08, "triangle"); },
        aplausos: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.5, { vol: 0.15, ataque: 0.02, filtros: [{ tipo: "bandpass", f: 1500, q: 0.5 }] });
        },
        risa: function () {
            [520, 640, 720, 580].forEach(function (f, i) { tono(f, i * 0.07, 0.12, 0.1, "triangle"); });
        },
        ohh: function () {
            const c = contexto();
            if (!c) return;
            osc(c, salida(c), c.currentTime, 0.45, { tipo: "sine", f: 380, vol: 0.14, ataque: 0.04, curva: [[0.4, 520]] });
        },
        suspiro: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.4, { vol: 0.1, ataque: 0.05, filtros: [{ tipo: "lowpass", f: 900 }] });
            tono(260, 0.05, 0.35, 0.06);
        },
        enojo: function () {
            tono(180, 0, 0.16, 0.1, "sawtooth");
            tono(140, 0.14, 0.18, 0.08, "sawtooth");
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

    global.ComoMeSientoSfx = {
        sonar: sonar,
        detener: detener,
        desbloquear: contexto,
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
