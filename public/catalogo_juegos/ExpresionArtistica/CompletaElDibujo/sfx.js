/**
 * CompletaElDibujoSfx — pegado, arpa, tuerca y festejos con WebAudio (sin archivos).
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
        iman: function () { tono(660, 0, 0.08, 0.12); tono(990, 0.06, 0.16, 0.14); },
        pegado: function () { tono(520, 0, 0.1, 0.12); tono(780, 0.08, 0.18, 0.14); },
        tuerca: function () { tono(300, 0, 0.06, 0.1, "square"); tono(450, 0.07, 0.1, 0.1, "square"); tono(600, 0.14, 0.12, 0.08); },
        arpa: function () { [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.09, 0.45, 0.1); }); },
        laser: function () { tono(900, 0, 0.12, 0.1); tono(1400, 0.08, 0.18, 0.12); },
        salto: function () { tono(400, 0, 0.08, 0.1); tono(700, 0.07, 0.14, 0.12); },
        despegue: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.6, { vol: 0.2, ataque: 0.05, filtros: [{ tipo: "lowpass", f: 900 }] });
            tono(200, 0, 0.5, 0.1, "sawtooth");
        },
        robot: function () { tono(220, 0, 0.1, 0.1, "square"); tono(330, 0.12, 0.12, 0.1, "square"); tono(440, 0.24, 0.2, 0.12, "square"); },
        bisagra: function () { tono(280, 0, 0.15, 0.1); tono(360, 0.12, 0.2, 0.12); },
        recompensa: function () { [523, 659, 784].forEach(function (f, i) { tono(f, i * 0.08, 0.28, 0.14); }); },
        fanfarria: function () { [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.1, 0.35, 0.14, "triangle"); }); },
        celebracion: function () { [392, 523, 659, 784].forEach(function (f, i) { tono(f, i * 0.08, 0.32, 0.12, "triangle"); }); },
        chispas: function () { for (let i = 0; i < 5; i++) tono(1400 + i * 180, i * 0.05, 0.12, 0.06); },
        suave: function () { tono(300, 0, 0.14, 0.08); },
        error: function () { tono(220, 0, 0.12, 0.1, "triangle"); tono(180, 0.1, 0.16, 0.08, "triangle"); }
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

    global.CompletaElDibujoSfx = {
        sonar: sonar,
        detener: detener,
        desbloquear: contexto,
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
