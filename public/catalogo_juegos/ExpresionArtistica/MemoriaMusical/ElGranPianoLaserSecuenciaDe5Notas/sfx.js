/**
 * MemoriaMusicalSfx — notas, campanas e instrumentos con WebAudio (sin archivos).
 * tocar(sonido, nota) suena el elemento. sonar(nombre) suena un efecto del juego.
 */
(function (global) {
    "use strict";

    let ctx = null;
    let ruidoBuffer = null;
    let bus = null;

    const NOTAS = {
        do3: 130.8, sol3: 196, do4: 261.6, re4: 293.7, mi4: 329.6, fa4: 349.2,
        sol4: 392, la4: 440, do5: 523.3, mi5: 659.3, sol5: 784, la5: 880, do6: 1046.5
    };

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

    function envolvente(g, t0, dur, vol, ataque, caida) {
        const a = Math.min(ataque || 0.01, dur / 2);
        const r = Math.min(caida != null ? caida : dur * 0.55, Math.max(0.02, dur - a));
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }

    function osc(c, dest, t0, dur, o) {
        const n = c.createOscillator();
        const g = c.createGain();
        n.type = o.tipo || "sine";
        const f0 = Math.max(40, o.f || 440);
        n.frequency.setValueAtTime(f0, t0);
        (o.curva || []).forEach(function (p) {
            n.frequency.exponentialRampToValueAtTime(Math.max(40, p[1]), t0 + p[0]);
        });
        envolvente(g, t0, dur, o.vol || 0.25, o.ataque, o.caida);
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
        envolvente(g, t0, dur, o.vol || 0.2, o.ataque, o.caida);
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
        src.start(t0, Math.random() * 1.2);
        src.stop(t0 + dur + 0.05);
    }

    const GOLPES = {
        nota: function (c, d, t, f) {
            osc(c, d, t, 0.55, { tipo: "triangle", f: f, vol: 0.28, ataque: 0.01, caida: 0.5 });
            osc(c, d, t, 0.4, { tipo: "sine", f: f * 2, vol: 0.08, ataque: 0.01, caida: 0.35 });
        },
        campana: function (c, d, t, f) {
            osc(c, d, t, 1.1, { tipo: "sine", f: f, vol: 0.22, ataque: 0.005, caida: 1 });
            osc(c, d, t, 0.8, { tipo: "triangle", f: f * 2.4, vol: 0.07, ataque: 0.004, caida: 0.7 });
            osc(c, d, t, 0.45, { tipo: "sine", f: f * 3.1, vol: 0.04, ataque: 0.002, caida: 0.4 });
        },
        tambor: function (c, d, t, f) {
            const grave = Math.max(70, Math.min(f || 140, 220));
            osc(c, d, t, 0.36, { tipo: "sine", vol: 0.75, ataque: 0.004, caida: 0.32, curva: [[0, grave], [0.3, grave * 0.45]] });
            ruido(c, d, t, 0.05, { vol: 0.18, ataque: 0.002, caida: 0.04, filtros: [{ tipo: "lowpass", f: 800 }] });
        },
        flauta: function (c, d, t, f) {
            osc(c, d, t, 0.55, { tipo: "sine", f: f || 784, vol: 0.2, ataque: 0.04, caida: 0.4 });
            osc(c, d, t, 0.4, { tipo: "triangle", f: (f || 784) * 2, vol: 0.04, ataque: 0.05, caida: 0.3 });
        },
        madera: function (c, d, t) {
            osc(c, d, t, 0.12, { tipo: "square", f: 180, vol: 0.12, ataque: 0.002, caida: 0.1, filtros: [{ tipo: "bandpass", f: 900, q: 1 }] });
            ruido(c, d, t, 0.06, { vol: 0.28, ataque: 0.001, caida: 0.05, filtros: [{ tipo: "bandpass", f: 1200, q: 0.8 }] });
        },
        violin: function (c, d, t, f) {
            osc(c, d, t, 0.7, { tipo: "sawtooth", f: f || 440, vol: 0.08, ataque: 0.08, caida: 0.4, filtros: [{ tipo: "lowpass", f: 1800 }] });
            osc(c, d, t, 0.7, { tipo: "triangle", f: (f || 440) * 2, vol: 0.04, ataque: 0.1, caida: 0.4 });
        },
        trompeta: function (c, d, t, f) {
            osc(c, d, t, 0.45, { tipo: "square", f: f || 392, vol: 0.07, ataque: 0.03, caida: 0.3, filtros: [{ tipo: "lowpass", f: 1600 }] });
            osc(c, d, t, 0.45, { tipo: "triangle", f: (f || 392) * 2, vol: 0.05, ataque: 0.02, caida: 0.3 });
        },
        platillo: function (c, d, t) {
            ruido(c, d, t, 0.55, { vol: 0.2, ataque: 0.003, caida: 0.5, filtros: [{ tipo: "highpass", f: 5000 }] });
        },
        caja: function (c, d, t) {
            osc(c, d, t, 0.1, { tipo: "triangle", f: 220, vol: 0.22, ataque: 0.002, caida: 0.08 });
            ruido(c, d, t, 0.1, { vol: 0.32, ataque: 0.002, caida: 0.08, filtros: [{ tipo: "highpass", f: 1800 }] });
        },
        bombo: function (c, d, t) {
            osc(c, d, t, 0.4, { tipo: "sine", vol: 0.8, ataque: 0.004, caida: 0.36, curva: [[0, 140], [0.32, 42]] });
            ruido(c, d, t, 0.05, { vol: 0.2, ataque: 0.002, caida: 0.04, filtros: [{ tipo: "lowpass", f: 400 }] });
        }
    };

    function tocar(sonido, nota) {
        const fn = GOLPES[sonido];
        const c = contexto();
        if (!fn || !c) return;
        fn(c, salida(c), c.currentTime + 0.012, NOTAS[nota] || 440);
    }

    function tono(f, retraso, dur, vol, tipo) {
        const c = contexto();
        if (!c) return;
        osc(c, salida(c), c.currentTime + (retraso || 0), dur || 0.3, { tipo: tipo || "sine", f: f, vol: vol || 0.16, ataque: 0.01, caida: dur || 0.3 });
    }

    const EFECTOS = {
        recompensa: function () {
            [523, 659, 784].forEach(function (f, i) { tono(f, i * 0.08, 0.3, 0.14); });
        },
        suave: function () {
            tono(330, 0, 0.16, 0.1);
            tono(262, 0.12, 0.22, 0.08);
        },
        acorde: function () {
            [392, 494, 587, 784].forEach(function (f) { tono(f, 0, 0.9, 0.1, "triangle"); });
        },
        arcoiris: function () {
            [392, 494, 587, 659, 784, 988].forEach(function (f, i) { tono(f, i * 0.07, 0.28, 0.12, "triangle"); });
        },
        puente: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.1, 0.45, 0.12); });
            tono(1319, 0.5, 0.7, 0.08);
        },
        invertido: function () {
            [880, 659, 494, 330, 220].forEach(function (f, i) { tono(f, i * 0.07, 0.2, 0.1, "sawtooth"); });
        },
        fanfarria: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.12, 0.4, 0.14, "triangle"); });
        },
        celebracion: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.09, 0.35, 0.14, "triangle"); });
        },
        chispas: function () {
            for (let i = 0; i < 5; i++) tono(1600 + (i % 3) * 220, i * 0.05, 0.14, 0.06);
        }
    };

    function sonar(nombre) {
        const fn = EFECTOS[nombre];
        if (!fn || !contexto()) return;
        fn();
    }

    function detener() {
        if (!bus || !ctx) return;
        const viejo = bus;
        bus = null;
        try {
            viejo.gain.cancelScheduledValues(ctx.currentTime);
            viejo.gain.setValueAtTime(viejo.gain.value, ctx.currentTime);
            viejo.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
            setTimeout(function () { try { viejo.disconnect(); } catch (e) { /* noop */ } }, 200);
        } catch (e) { /* noop */ }
    }

    function desbloquear() { contexto(); }

    global.MemoriaMusicalSfx = {
        tocar: tocar,
        sonar: sonar,
        detener: detener,
        desbloquear: desbloquear,
        NOTAS: Object.keys(NOTAS),
        SONIDOS: Object.keys(GOLPES),
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
