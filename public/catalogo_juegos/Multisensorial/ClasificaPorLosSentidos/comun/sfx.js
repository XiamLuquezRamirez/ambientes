/**
 * ClasificaSentidosSfx — sonidos sintetizados de Clasifica por los sentidos (sin archivos).
 *
 *   reproducir(nombre, { breve })  suena el estímulo de un objeto del oído (campana, tambor…);
 *                                  devuelve la duración en segundos.
 *   sonar(nombre)                  efecto corto: lo que "hace" cada sentido (brillo, aroma, ñam,
 *                                  rasposo, suave) y los del juego (recompensa, suave, magia…).
 */
(function (global) {
    "use strict";

    let ctx = null;
    let ruidoBuffer = null;

    function contexto() {
        const Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function blanco(c) {
        if (ruidoBuffer) return ruidoBuffer;
        const largo = Math.ceil(c.sampleRate * 3);
        ruidoBuffer = c.createBuffer(1, largo, c.sampleRate);
        const d = ruidoBuffer.getChannelData(0);
        for (let i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
        return ruidoBuffer;
    }

    /** Oscilador con envolvente. o: tipo, f, curva [[t, f]…], vol, ataque, caida. */
    function osc(c, dest, t0, dur, o) {
        const n = c.createOscillator();
        const g = c.createGain();
        n.type = o.tipo || "sine";
        const curva = o.curva || [[0, o.f || 440]];
        n.frequency.setValueAtTime(curva[0][1], t0);
        for (let i = 1; i < curva.length; i++) n.frequency.exponentialRampToValueAtTime(Math.max(1, curva[i][1]), t0 + curva[i][0]);
        const vol = o.vol || 0.2;
        const a = Math.min(o.ataque || 0.008, dur / 2);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        n.connect(g).connect(dest);
        n.start(t0);
        n.stop(t0 + dur + 0.05);
    }

    /** Ruido filtrado. o: vol, ataque, filtro, f, q. */
    function ruido(c, dest, t0, dur, o) {
        const src = c.createBufferSource();
        src.buffer = blanco(c);
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
            if (o.q) f.Q.value = o.q;
            salida.connect(f);
            salida = f;
        }
        salida.connect(g).connect(dest);
        src.start(t0, Math.random() * 2);
        src.stop(t0 + dur + 0.05);
    }

    /* ── Estímulos de los objetos que se escuchan ─────────────── */

    const ESTIMULOS = {
        campana: function (c, d, t, breve) {
            const golpes = breve ? 2 : 3;
            for (let i = 0; i < golpes; i++) {
                const f = [1175, 988, 1319][i];
                osc(c, d, t + i * 0.32, 1.2, { f: f, vol: 0.16 });
                osc(c, d, t + i * 0.32, 0.9, { f: f * 2.76, vol: 0.05 });
            }
            return golpes * 0.32 + 0.9;
        },
        tambor: function (c, d, t, breve) {
            const golpes = breve ? 2 : 4;
            for (let i = 0; i < golpes; i++) {
                const tt = t + i * 0.26;
                osc(c, d, tt, 0.32, { curva: [[0, 150], [0.25, 55]], vol: 0.42 });
                ruido(c, d, tt, 0.09, { vol: 0.12, filtro: "lowpass", f: 900 });
            }
            return golpes * 0.26 + 0.3;
        },
        trompeta: function (c, d, t, breve) {
            const notas = breve ? [523, 659] : [523, 659, 784, 1047];
            notas.forEach(function (f, i) {
                osc(c, d, t + i * 0.2, 0.22, { tipo: "sawtooth", f: f, vol: 0.07, ataque: 0.03 });
                osc(c, d, t + i * 0.2, 0.22, { tipo: "square", f: f, vol: 0.03, ataque: 0.03 });
            });
            return notas.length * 0.2 + 0.2;
        },
        maracas: function (c, d, t, breve) {
            const n = breve ? 4 : 8;
            for (let i = 0; i < n; i++) ruido(c, d, t + i * 0.13, 0.08, { vol: 0.2, filtro: "highpass", f: 4200, ataque: 0.004 });
            return n * 0.13 + 0.1;
        },
        pandereta: function (c, d, t, breve) {
            const n = breve ? 3 : 6;
            for (let i = 0; i < n; i++) {
                ruido(c, d, t + i * 0.17, 0.16, { vol: 0.16, filtro: "bandpass", f: 7000, q: 2, ataque: 0.003 });
                osc(c, d, t + i * 0.17, 0.12, { curva: [[0, 220], [0.1, 120]], vol: 0.12 });
            }
            return n * 0.17 + 0.15;
        },
        triangulo: function (c, d, t, breve) {
            const n = breve ? 2 : 3;
            for (let i = 0; i < n; i++) {
                osc(c, d, t + i * 0.45, 1.3, { f: 2637, vol: 0.09 });
                osc(c, d, t + i * 0.45, 1.1, { f: 3951, vol: 0.04 });
            }
            return n * 0.45 + 0.9;
        },
        telefono: function (c, d, t, breve) {
            const n = breve ? 1 : 2;
            for (let k = 0; k < n; k++) {
                for (let i = 0; i < 14; i++) {
                    osc(c, d, t + k * 0.9 + i * 0.04, 0.035, { tipo: "square", f: i % 2 ? 1300 : 1700, vol: 0.05 });
                }
            }
            return n * 0.9;
        },
        sirena: function (c, d, t, breve) {
            const dur = breve ? 1.2 : 2.4;
            const vueltas = breve ? 2 : 4;
            const curva = [[0, 650]];
            for (let i = 1; i <= vueltas; i++) curva.push([i * dur / vueltas - 0.01, i % 2 ? 1100 : 650]);
            osc(c, d, t, dur, { tipo: "triangle", curva: curva, vol: 0.12, ataque: 0.05 });
            return dur;
        }
    };

    /* ── Efectos ─────────────────────────────────────────────── */

    function nota(f, retraso, dur, vol, tipo) {
        const c = contexto();
        if (!c) return;
        osc(c, c.destination, c.currentTime + (retraso || 0), dur || 0.3, { tipo: tipo || "sine", f: f, vol: vol || 0.15 });
    }

    const EFECTOS = {
        /* Lo que hace cada sentido */
        brillo: function (c) {           // vista: destello de luz
            const t = c.currentTime;
            [1568, 2093, 2637, 3136].forEach(function (f, i) { osc(c, c.destination, t + i * 0.06, 0.45, { tipo: "triangle", f: f, vol: 0.05 }); });
        },
        aroma: function (c) {            // olfato: un soplo perfumado (sfff-bloom)
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.5, { vol: 0.09, filtro: "bandpass", f: 2400, q: 0.8, ataque: 0.12 });
            osc(c, c.destination, t + 0.25, 0.5, { curva: [[0, 660], [0.45, 990]], vol: 0.06 });
        },
        nam: function (c) {              // gusto: ñam ñam
            const t = c.currentTime;
            [0, 0.2].forEach(function (dd) {
                osc(c, c.destination, t + dd, 0.14, { curva: [[0, 280], [0.12, 180]], vol: 0.16, tipo: "triangle" });
                ruido(c, c.destination, t + dd + 0.02, 0.07, { vol: 0.08, filtro: "bandpass", f: 1800 });
            });
            osc(c, c.destination, t + 0.45, 0.25, { curva: [[0, 520], [0.2, 880]], vol: 0.08 });
        },
        rasposo: function (c) {          // tacto áspero: rrrasss
            const t = c.currentTime;
            for (let i = 0; i < 5; i++) ruido(c, c.destination, t + i * 0.07, 0.09, { vol: 0.12, filtro: "bandpass", f: 900 + i * 120, q: 3 });
        },
        suavecito: function (c) {        // tacto suave: fuff
            ruido(c, c.destination, c.currentTime, 0.5, { vol: 0.07, filtro: "lowpass", f: 600, ataque: 0.15 });
        },
        /* Del juego */
        recompensa: function () { [1047, 1319, 1568].forEach(function (f, i) { nota(f, i * 0.08, 0.35, 0.15); }); },
        celebracion: function () { [784, 988, 1175, 1568].forEach(function (f, i) { nota(f, i * 0.1, 0.4, 0.14); }); },
        victoria: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { nota(f, i * 0.12, 0.5, 0.15); }); },
        suave: function () { nota(330, 0, 0.22, 0.1, "triangle"); nota(262, 0.14, 0.3, 0.09, "triangle"); },
        pop: function () { nota(880, 0, 0.09, 0.08); },
        magia: function () { [1319, 1568, 1976, 2637].forEach(function (f, i) { nota(f, i * 0.05, 0.3, 0.06, "triangle"); }); },
        chispas: function () { [2093, 2637, 3136].forEach(function (f, i) { nota(f, i * 0.07, 0.2, 0.05); }); },
        boing: function (c) { osc(c, c.destination, c.currentTime, 0.3, { curva: [[0, 180], [0.08, 340], [0.26, 140]], vol: 0.16 }); },
        achis: function (c) {            // la nariz estornuda
            const t = c.currentTime;
            osc(c, c.destination, t, 0.3, { curva: [[0, 500], [0.28, 900]], vol: 0.05, tipo: "triangle" });
            ruido(c, c.destination, t + 0.35, 0.35, { vol: 0.22, filtro: "highpass", f: 1800, ataque: 0.005 });
        },
        whoosh: function (c) { ruido(c, c.destination, c.currentTime, 0.35, { vol: 0.12, filtro: "bandpass", f: 1200, q: 0.7, ataque: 0.1 }); },
        splash: function (c) {
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.4, { vol: 0.2, filtro: "lowpass", f: 2200, ataque: 0.005 });
            osc(c, c.destination, t + 0.02, 0.15, { curva: [[0, 900], [0.12, 300]], vol: 0.06 });
        },
        ding: function () { nota(1568, 0, 0.6, 0.12); },
        clic: function () { nota(1320, 0, 0.05, 0.08, "square"); },
        motor: function (c) { osc(c, c.destination, c.currentTime, 0.6, { tipo: "sawtooth", curva: [[0, 90], [0.5, 140]], vol: 0.05 }); },
        crece: function (c) { osc(c, c.destination, c.currentTime, 0.4, { curva: [[0, 400], [0.35, 1200]], vol: 0.06, tipo: "triangle" }); }
    };

    function reproducir(nombre, o) {
        o = o || {};
        const fn = ESTIMULOS[nombre];
        const c = contexto();
        if (!fn || !c) return 0;
        const bus = c.createGain();
        bus.gain.value = o.vol != null ? o.vol : 1;
        bus.connect(c.destination);
        return fn(c, bus, c.currentTime + 0.02, !!o.breve);
    }

    function sonar(nombre) {
        const fn = EFECTOS[nombre];
        const c = contexto();
        if (!fn || !c) return;
        fn(c);
    }

    global.ClasificaSentidosSfx = {
        reproducir: reproducir,
        sonar: sonar,
        existe: function (n) { return !!(ESTIMULOS[n] || EFECTOS[n]); },
        desbloquear: contexto,
        detener: function () { /* los estímulos son cortos: se dejan terminar */ },
        ESTIMULOS: Object.keys(ESTIMULOS),
        EFECTOS: Object.keys(EFECTOS)
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ClasificaSentidosSfx;
})(typeof window !== "undefined" ? window : globalThis);
