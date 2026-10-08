/**
 * MemoriaVisualSfx — efectos sintetizados con WebAudio (sin archivos).
 * Provisionales: cuando existan audios definitivos se reemplazan por config.
 */
(function (global) {
    "use strict";

    const NOTAS = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77];
    let ctx = null;
    let activo = true;

    function contexto() {
        const Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function tono(frecuencia, opts) {
        const c = contexto();
        if (!c) return;
        const o = opts || {};
        const t0 = c.currentTime + (o.retraso || 0);
        const dur = o.dur || 0.3;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = o.tipo || "sine";
        osc.frequency.setValueAtTime(frecuencia, t0);
        if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + Math.min(0.03, dur / 3));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    }

    function ruido(opts) {
        const c = contexto();
        if (!c) return;
        const o = opts || {};
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
        const gain = c.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(o.vol || 0.3, t0 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filtro).connect(gain).connect(c.destination);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }

    const EFECTOS = {
        /** Entrada de un objeto (índice → tono distinto). */
        pop: function (i) {
            const f = NOTAS[(i || 0) % NOTAS.length];
            tono(f * 0.75, { tipo: "sine", dur: 0.18, hasta: f * 1.4, vol: 0.28 });
        },
        /** Luz dorada del caminito. */
        ding: function (i) {
            const f = NOTAS[(i || 0) % NOTAS.length];
            tono(f, { tipo: "triangle", dur: 0.6, vol: 0.35 });
            tono(f * 2, { tipo: "sine", dur: 0.4, vol: 0.08 });
        },
        cremallera: function () {
            for (let k = 0; k < 9; k++) {
                ruido({ retraso: k * 0.05, dur: 0.04, filtro: "bandpass", desde: 2500 + k * 250, vol: 0.25 });
            }
        },
        /** Música de suspenso juguetona (dos saltitos). */
        suspenso: function () {
            [196, 233.08, 196, 261.63, 246.94].forEach(function (f, k) {
                tono(f, { tipo: "square", dur: 0.16, vol: 0.07, retraso: k * 0.22 });
            });
        },
        salto: function () {
            tono(220, { tipo: "sine", dur: 0.2, hasta: 440, vol: 0.2 });
        },
        puff: function () {
            ruido({ dur: 0.7, desde: 1800, hasta: 200, vol: 0.35 });
        },
        hoja: function () {
            ruido({ dur: 1.2, filtro: "bandpass", desde: 900, hasta: 400, vol: 0.12 });
        },
        viento: function () {
            ruido({ dur: 0.9, filtro: "bandpass", desde: 500, hasta: 1600, vol: 0.18 });
        },
        /** Error neutro: suave, sin castigo. */
        neutro: function () {
            tono(330, { tipo: "sine", dur: 0.18, vol: 0.18 });
            tono(262, { tipo: "sine", dur: 0.22, vol: 0.18, retraso: 0.16 });
        },
        /** Goma que se estira (globo). */
        goma: function () {
            tono(140, { tipo: "sawtooth", dur: 0.45, hasta: 320, vol: 0.08 });
        },
        /** «No» suave (posiciones). */
        no: function () {
            tono(392, { tipo: "triangle", dur: 0.16, hasta: 349, vol: 0.2 });
            tono(349, { tipo: "triangle", dur: 0.24, hasta: 262, vol: 0.2, retraso: 0.18 });
        },
        tic: function (par) {
            tono(par ? 1500 : 1100, { tipo: "square", dur: 0.04, vol: 0.06 });
        },
        /** Objetos moviéndose detrás del humo. */
        arrastre: function () {
            for (let k = 0; k < 4; k++) {
                ruido({ retraso: k * 0.45, dur: 0.35, filtro: "bandpass", desde: 300, hasta: 900, vol: 0.18 });
            }
        },
        magia: function () {
            [1046.5, 1318.5, 1568, 2093].forEach(function (f, k) {
                tono(f, { tipo: "sine", dur: 0.3, vol: 0.12, retraso: k * 0.07 });
            });
        },
        burbuja: function () {
            tono(300, { tipo: "sine", dur: 0.25, hasta: 900, vol: 0.2 });
            tono(500, { tipo: "sine", dur: 0.2, hasta: 1200, vol: 0.12, retraso: 0.12 });
        },
        explota: function () {
            ruido({ dur: 0.25, filtro: "highpass", desde: 1500, vol: 0.35 });
            EFECTOS.magia();
        },
        apagon: function () {
            tono(180, { tipo: "sawtooth", dur: 0.5, hasta: 60, vol: 0.12 });
        }
    };

    function sonar(nombre, arg) {
        if (!activo || !nombre || !EFECTOS[nombre]) return false;
        try {
            EFECTOS[nombre](arg);
            return true;
        } catch (e) {
            return false;
        }
    }

    global.MemoriaVisualSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        activar: function (on) { activo = !!on; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
