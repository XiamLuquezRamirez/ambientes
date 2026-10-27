/**
 * SigueElRitmoSfx — percusión y efectos sintetizados con WebAudio (sin archivos).
 * Provisionales: si config.audios.sonidos[elemento] o config.audios.efectos[nombre] tienen ruta,
 * el juego usa esa grabación en lugar de la síntesis.
 *
 * golpe(nombre) suena el golpe corto de un elemento y devuelve su duración en segundos.
 * nota(nombre, seg) suena una nota de la melodía (do5, mi5, sol5...).
 * sonar(nombre) suena un efecto del juego. detener() corta todo.
 */
(function (global) {
    "use strict";

    let ctx = null;
    let ruidoBuffer = null;
    let bus = null;

    const NOTAS = { do4: 261.6, fa4: 349.2, sol4: 392, la4: 440, do5: 523.3, re5: 587.3, mi5: 659.3, sol5: 783.9, la5: 880 };

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
        const largo = Math.ceil(c.sampleRate * 3);
        ruidoBuffer = c.createBuffer(1, largo, c.sampleRate);
        const data = ruidoBuffer.getChannelData(0);
        for (let i = 0; i < largo; i++) data[i] = Math.random() * 2 - 1;
        return ruidoBuffer;
    }

    function envolvente(g, t0, dur, vol, ataque, caida) {
        const a = Math.min(ataque || 0.01, dur / 2);
        const r = Math.min(caida != null ? caida : dur * 0.6, dur - a);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + a);
        g.gain.setValueAtTime(vol, t0 + dur - r);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }

    function osc(c, dest, t0, dur, o) {
        const n = c.createOscillator();
        const g = c.createGain();
        n.type = o.tipo || "sine";
        n.frequency.setValueAtTime((o.curva || [[0, o.f]])[0][1], t0);
        (o.curva || []).slice(1).forEach(function (p) { n.frequency.exponentialRampToValueAtTime(p[1], t0 + p[0]); });
        envolvente(g, t0, dur, o.vol || 0.3, o.ataque, o.caida);
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
        src.start(t0, Math.random() * 2);
        src.stop(t0 + dur + 0.05);
    }

    /* ── Golpes (lo que marca cada elemento) ──────────────────── */

    const GOLPES = {
        /** "Bum": golpe grave y alegre. */
        tambor: function (c, d, t) {
            osc(c, d, t, 0.34, { tipo: "sine", vol: 0.8, ataque: 0.003, caida: 0.32, curva: [[0, 180], [0.3, 60]] });
            ruido(c, d, t, 0.05, { vol: 0.2, ataque: 0.002, caida: 0.045, filtros: [{ tipo: "lowpass", f: 900 }] });
            return 0.36;
        },
        /** "Plop": palmada. */
        aplauso: function (c, d, t) {
            ruido(c, d, t, 0.07, { vol: 0.5, ataque: 0.002, caida: 0.06, filtros: [{ tipo: "bandpass", f: 1600, q: 0.8 }] });
            ruido(c, d, t, 0.03, { vol: 0.25, ataque: 0.001, caida: 0.025, filtros: [{ tipo: "highpass", f: 3000 }] });
            return 0.1;
        },
        /** "Tap-tap-clic": zapateo con castañuela. */
        zapato: function (c, d, t) {
            [0, 0.09].forEach(function (s) {
                ruido(c, d, t + s, 0.04, { vol: 0.4, ataque: 0.001, caida: 0.035, filtros: [{ tipo: "highpass", f: 2500 }] });
            });
            osc(c, d, t + 0.16, 0.12, { tipo: "triangle", f: 2400, vol: 0.16, ataque: 0.002, caida: 0.1 });
            return 0.3;
        },
        /** Nota brillante del piano. */
        piano: function (c, d, t) {
            [[523, 0.3], [1046, 0.12], [1568, 0.05]].forEach(function (p) {
                osc(c, d, t, 0.8, { tipo: "sine", f: p[0], vol: p[1], ataque: 0.004, caida: 0.75 });
            });
            return 0.8;
        },
        /** Cuerda pulsada. */
        guitarra: function (c, d, t) {
            osc(c, d, t, 0.7, { tipo: "sawtooth", f: 330, vol: 0.16, ataque: 0.004, caida: 0.66, filtros: [{ tipo: "lowpass", f: 2200 }] });
            osc(c, d, t, 0.5, { tipo: "triangle", f: 660, vol: 0.05, ataque: 0.004, caida: 0.46 });
            return 0.7;
        },
        /** La batería completa: bombo y caja juntos. */
        bateria: function (c, d, t) {
            GOLPES.bombo(c, d, t);
            GOLPES.caja(c, d, t + 0.18);
            return 0.45;
        },
        /** "Boom": el bombo, profundo. */
        bombo: function (c, d, t) {
            osc(c, d, t, 0.4, { tipo: "sine", vol: 0.9, ataque: 0.004, caida: 0.38, curva: [[0, 150], [0.35, 42]] });
            ruido(c, d, t, 0.05, { vol: 0.25, ataque: 0.002, caida: 0.045, filtros: [{ tipo: "lowpass", f: 400 }] });
            return 0.42;
        },
        /** "Tac": la caja, seca. */
        caja: function (c, d, t) {
            osc(c, d, t, 0.12, { tipo: "triangle", f: 220, vol: 0.3, ataque: 0.002, caida: 0.1 });
            ruido(c, d, t, 0.12, { vol: 0.4, ataque: 0.002, caida: 0.1, filtros: [{ tipo: "highpass", f: 1800 }] });
            return 0.14;
        },
        /** Clic neutro del metrónomo (no revela qué instrumento sigue). */
        tick: function (c, d, t) {
            osc(c, d, t, 0.05, { tipo: "square", f: 1400, vol: 0.1, ataque: 0.001, caida: 0.04, filtros: [{ tipo: "highpass", f: 900 }] });
            return 0.06;
        },
        /** "Tsssh": el platillo. */
        platillo: function (c, d, t) {
            ruido(c, d, t, 0.7, { vol: 0.2, ataque: 0.003, caida: 0.66, filtros: [{ tipo: "highpass", f: 5500 }] });
            return 0.7;
        }
    };

    function golpe(nombre) {
        const fn = GOLPES[nombre];
        const c = contexto();
        if (!fn || !c) return 0;
        return fn(c, salida(c), c.currentTime + 0.012);
    }

    /** Nota de la melodía que acompaña los aplausos. */
    function nota(nombre, seg) {
        const f = NOTAS[nombre];
        const c = contexto();
        if (!f || !c) return;
        const t = c.currentTime + 0.01;
        const dur = Math.max(0.15, seg || 0.4);
        osc(c, salida(c), t, dur, { tipo: "triangle", f: f, vol: 0.16, ataque: 0.01, caida: dur * 0.6 });
        osc(c, salida(c), t, dur * 0.6, { tipo: "sine", f: f * 2, vol: 0.05, ataque: 0.01, caida: dur * 0.4 });
    }

    /* ── Efectos del juego ─────────────────────────────────────── */

    function tono(f, retraso, dur, vol, tipo) {
        const c = contexto();
        if (!c) return;
        osc(c, salida(c), c.currentTime + (retraso || 0), dur || 0.3, { tipo: tipo || "sine", f: f, vol: vol || 0.2, ataque: 0.01 });
    }

    const EFECTOS = {
        recompensa: function () {
            [1047, 1319, 1568].forEach(function (f, i) { tono(f, i * 0.08, 0.35, 0.16); });
        },
        celebracion: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.1, 0.4, 0.16, "triangle"); });
            [1568, 2093, 2637].forEach(function (f, i) { tono(f, 0.45 + i * 0.06, 0.25, 0.06); });
        },
        victoria: function () {
            [392, 523, 659].forEach(function (f, i) { tono(f, i * 0.14, 0.24, 0.16, "triangle"); });
            [523, 659, 784, 1047].forEach(function (f) { tono(f, 0.46, 1.1, 0.1, "triangle"); });
        },
        aplausos: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            for (let i = 0; i < 90; i++) {
                const s = Math.pow(Math.random(), 0.8) * 2.6;
                ruido(c, salida(c), t + s, 0.035, { vol: 0.07 + Math.random() * 0.08, ataque: 0.002, caida: 0.03, filtros: [{ tipo: "bandpass", f: 900 + Math.random() * 1600, q: 1.1 }] });
            }
        },
        suave: function () {
            tono(392, 0, 0.18, 0.12);
            tono(330, 0.16, 0.26, 0.1);
        },
        /** El tambor (o la pista) rebota cuando el ritmo se pierde. */
        rebote: function () {
            const c = contexto();
            if (!c) return;
            osc(c, salida(c), c.currentTime, 0.3, { tipo: "sine", vol: 0.16, ataque: 0.01, caida: 0.26, curva: [[0, 300], [0.12, 180], [0.3, 220]] });
        },
        /** Destello láser azul de la mesa de neón. */
        laser: function () {
            const c = contexto();
            if (!c) return;
            osc(c, salida(c), c.currentTime, 0.4, { tipo: "sawtooth", vol: 0.08, ataque: 0.01, caida: 0.35, curva: [[0, 600], [0.4, 2400]], filtros: [{ tipo: "bandpass", f: 1800, q: 2 }] });
            tono(2093, 0.02, 0.3, 0.06);
        },
        pop: function () { tono(880, 0, 0.09, 0.08); },
        /** Un globo que explota. */
        globo: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.16, { vol: 0.3, ataque: 0.003, caida: 0.14, filtros: [{ tipo: "bandpass", f: 900, q: 0.7 }] });
        },
        fanfarria: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.12, 0.3, 0.14, "triangle"); });
        },
        chispas: function () {
            for (let i = 0; i < 5; i++) tono(2093 + (i % 2) * 400, i * 0.06, 0.15, 0.06);
        },
        magia: function () {
            for (let i = 0; i < 6; i++) tono(1568 + i * 220, i * 0.05, 0.2, 0.06);
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

    function desbloquear() {
        contexto();
    }

    global.SigueElRitmoSfx = {
        golpe: golpe,
        nota: nota,
        sonar: sonar,
        detener: detener,
        desbloquear: desbloquear,
        NOTAS: Object.keys(NOTAS),
        GOLPES: Object.keys(GOLPES),
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
