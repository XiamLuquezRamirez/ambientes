/**
 * BuscaSombraSfx — efectos sintetizados con WebAudio (sin archivos).
 * Provisionales: si config.audios.efectos[nombre] tiene ruta, el juego usa ese archivo.
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

    function tono(frecuencia, o) {
        const c = contexto();
        if (!c) return;
        o = o || {};
        const t0 = c.currentTime + (o.retraso || 0);
        const dur = o.dur || 0.3;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = o.tipo || "sine";
        osc.frequency.setValueAtTime(frecuencia, t0);
        if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + Math.min(0.02, dur / 3));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    }

    function ruido(o) {
        const c = contexto();
        if (!c) return;
        o = o || {};
        const t0 = c.currentTime + (o.retraso || 0);
        const dur = o.dur || 0.4;
        const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource();
        src.buffer = buffer;
        const filtro = c.createBiquadFilter();
        filtro.type = o.filtro || "lowpass";
        filtro.frequency.setValueAtTime(o.desde || 1200, t0);
        if (o.hasta) filtro.frequency.exponentialRampToValueAtTime(o.hasta, t0 + dur);
        if (o.q) filtro.Q.setValueAtTime(o.q, t0);
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + (o.ataque || 0.02));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filtro).connect(gain).connect(c.destination);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }

    const EFECTOS = {
        /** La figura choca contra la sombra equivocada: ¡boing! */
        boing: function () {
            tono(170, { tipo: "sine", dur: 0.42, hasta: 520, vol: 0.32 });
            tono(520, { tipo: "sine", dur: 0.3, hasta: 260, vol: 0.18, retraso: 0.2 });
        },
        /** La sombra se enciende con chispas de luz. */
        chispas: function () {
            [1568, 2093, 2637, 3136, 2637].forEach(function (f, k) {
                tono(f, { tipo: "triangle", dur: 0.28, vol: 0.11, retraso: k * 0.06 });
            });
        },
        /** Se enciende un foco de la carpa. */
        foco: function () {
            ruido({ dur: 0.05, filtro: "highpass", desde: 2600, vol: 0.3 });
            tono(880, { tipo: "sine", dur: 0.5, hasta: 1320, vol: 0.14, retraso: 0.04 });
        },
        /** El carro arranca: ¡vroom, vroom! */
        vroom: function () {
            [0, 0.55].forEach(function (r) {
                tono(70, { tipo: "sawtooth", dur: 0.5, hasta: 210, vol: 0.15, retraso: r });
                tono(105, { tipo: "sawtooth", dur: 0.5, hasta: 320, vol: 0.07, retraso: r });
            });
            ruido({ dur: 1.05, desde: 500, hasta: 1500, vol: 0.07 });
        },
        burbujas: function () {
            for (let k = 0; k < 6; k++) {
                const f = 500 + Math.random() * 500;
                tono(f, { tipo: "sine", dur: 0.09, hasta: f * 2.2, vol: 0.14, retraso: k * 0.09 });
            }
        },
        /** El árbol suelta hojas: susurro con viento suave. */
        hojas: function () {
            ruido({ dur: 1, filtro: "bandpass", desde: 2400, hasta: 900, q: 0.9, vol: 0.12, ataque: 0.25 });
            [0.2, 0.45, 0.7].forEach(function (r) {
                ruido({ dur: 0.08, filtro: "highpass", desde: 3500, vol: 0.08, retraso: r });
            });
        },
        /** Destello láser verde de escaneo. */
        laser: function () {
            tono(1800, { tipo: "sawtooth", dur: 0.45, hasta: 600, vol: 0.06 });
            tono(2400, { tipo: "sine", dur: 0.35, hasta: 900, vol: 0.08, retraso: 0.05 });
            tono(1318.5, { tipo: "triangle", dur: 0.4, vol: 0.12, retraso: 0.45 });
        },
        /** Sonido neutro de escáner en pausa. */
        escanerPausa: function () {
            tono(440, { tipo: "square", dur: 0.14, vol: 0.06 });
            tono(330, { tipo: "square", dur: 0.22, vol: 0.06, retraso: 0.18 });
        },
        holograma: function () {
            tono(600, { tipo: "sine", dur: 0.7, hasta: 1500, vol: 0.08 });
            [0, 0.12, 0.24, 0.36].forEach(function (r) {
                tono(2200, { tipo: "triangle", dur: 0.06, vol: 0.05, retraso: r });
            });
        },
        /** Sube el medidor de energía. */
        energia: function () {
            tono(300, { tipo: "triangle", dur: 0.6, hasta: 900, vol: 0.12 });
            tono(900, { tipo: "sine", dur: 0.3, vol: 0.1, retraso: 0.58 });
        },
        salto: function () {
            tono(260, { tipo: "sine", dur: 0.22, hasta: 780, vol: 0.22 });
        },
        /** Las turbinas despegan: ¡whoosh! */
        whoosh: function () {
            ruido({ dur: 0.9, filtro: "bandpass", desde: 400, hasta: 3000, q: 1.2, vol: 0.25, ataque: 0.15 });
        },
        /** Una nube sacude al avión. */
        nube: function () {
            ruido({ dur: 0.45, desde: 900, hasta: 200, vol: 0.22 });
            tono(140, { tipo: "sine", dur: 0.25, hasta: 90, vol: 0.18 });
        },
        /** Entrega de la Linterna Mágica. */
        linterna: function () {
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f, k) {
                tono(f, { tipo: "triangle", dur: 0.4, vol: 0.16, retraso: k * 0.1 });
            });
            tono(2093, { tipo: "sine", dur: 0.8, vol: 0.08, retraso: 0.45 });
        },
        /** El Creador de Sombras proyecta una figura. */
        proyectar: function () {
            ruido({ dur: 0.04, filtro: "highpass", desde: 3000, vol: 0.25 });
            tono(220, { tipo: "sine", dur: 0.8, hasta: 660, vol: 0.1, retraso: 0.04 });
        }
    };

    function sonar(nombre) {
        if (!nombre || !EFECTOS[nombre]) return false;
        try {
            EFECTOS[nombre]();
            return true;
        } catch (e) {
            return false;
        }
    }

    global.BuscaSombraSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
