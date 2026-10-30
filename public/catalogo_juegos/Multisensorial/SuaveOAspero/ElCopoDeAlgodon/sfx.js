/**
 * SuaveAsperoSfx — efectos sintetizados con WebAudio (sin archivos).
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
        for (let i = 0; i < data.length; i++) {
            const grano = o.granulado ? (Math.random() < o.granulado ? 1 : 0.15) : 1;
            data[i] = (Math.random() * 2 - 1) * grano;
        }
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

    function golpeSeco(frec, retraso, vol) {
        tono(frec, { tipo: "sine", dur: 0.12, hasta: frec * 0.55, vol: vol || 0.35, retraso: retraso || 0 });
        ruido({ dur: 0.05, desde: 2400, vol: 0.12, retraso: retraso || 0 });
    }

    function rasc(retraso) {
        ruido({ dur: 0.2, filtro: "bandpass", desde: 2600, hasta: 3800, q: 2, vol: 0.17, granulado: 0.2, retraso: retraso || 0 });
    }

    function boing(retraso) {
        tono(150, { tipo: "sine", dur: 0.45, hasta: 420, vol: 0.28, retraso: retraso || 0 });
        tono(300, { tipo: "triangle", dur: 0.3, hasta: 520, vol: 0.06, retraso: (retraso || 0) + 0.05 });
    }

    function ding(retraso) {
        tono(1568, { tipo: "sine", dur: 0.9, vol: 0.22, retraso: retraso || 0 });
        tono(3136, { tipo: "sine", dur: 0.6, vol: 0.06, retraso: retraso || 0 });
    }

    const EFECTOS = {
        /** Peinar el peluche (3-4): ¡swoosh-fluff! */
        swooshfluff: function () {
            ruido({ dur: 0.4, filtro: "bandpass", desde: 600, hasta: 1800, q: 0.8, vol: 0.13, ataque: 0.1 });
            ruido({ dur: 0.3, desde: 700, hasta: 250, vol: 0.08, retraso: 0.25, ataque: 0.08 });
        },
        /** Peinar el peluche (5-6): ¡swoosh-soft! */
        swooshsoft: function () {
            ruido({ dur: 0.5, filtro: "bandpass", desde: 500, hasta: 1300, q: 0.6, vol: 0.1, ataque: 0.15 });
        },
        /** Lija: ¡rasc-rasc! */
        rascrasc: function () {
            rasc(0);
            rasc(0.22);
        },
        /** Algodón (3-4): ¡puff-boing! */
        puffboing: function () {
            ruido({ dur: 0.25, desde: 900, hasta: 200, vol: 0.2, ataque: 0.03 });
            boing(0.18);
        },
        /** Algodón (5-6): ¡puff-fluff! */
        pufffluff: function () {
            ruido({ dur: 0.25, desde: 900, hasta: 200, vol: 0.2, ataque: 0.03 });
            ruido({ dur: 0.35, filtro: "bandpass", desde: 700, hasta: 300, q: 0.7, vol: 0.09, retraso: 0.2, ataque: 0.1 });
        },
        /** Corteza: ¡croc-rasch! */
        crocrasch: function () {
            ruido({ dur: 0.12, filtro: "bandpass", desde: 900, q: 1.5, vol: 0.24, granulado: 0.3 });
            golpeSeco(170, 0, 0.2);
            rasc(0.14);
        },
        /** Pluma de la demostración. */
        fluff: function () {
            ruido({ dur: 0.45, filtro: "bandpass", desde: 500, hasta: 1500, q: 0.8, vol: 0.12, ataque: 0.12 });
        },
        /** Contenedor suave (tobogán rosado). */
        suave: function () {
            tono(660, { tipo: "sine", dur: 0.5, hasta: 990, vol: 0.1 });
            ruido({ dur: 0.5, filtro: "bandpass", desde: 800, hasta: 400, q: 0.6, vol: 0.06, ataque: 0.15 });
        },
        /** Contenedor áspero (trampilla de roca). */
        carrasposo: function () {
            ruido({ dur: 0.45, filtro: "bandpass", desde: 500, hasta: 900, q: 1.2, vol: 0.2, granulado: 0.25 });
        },
        /** Tobogán de nubes. */
        tobogan: function () {
            tono(1200, { tipo: "sine", dur: 0.7, hasta: 420, vol: 0.12 });
            ruido({ dur: 0.7, filtro: "bandpass", desde: 600, hasta: 1600, q: 1, vol: 0.06, ataque: 0.2 });
        },
        boing: function () { boing(0); },
        /** Trampilla + luz verde: ¡clack-ding! */
        clackding: function () {
            golpeSeco(900, 0, 0.3);
            golpeSeco(600, 0.06, 0.25);
            ding(0.25);
        },
        /** Bloque pulido en el laboratorio: ¡pff-ding! */
        pffding: function () {
            ruido({ dur: 0.22, desde: 1400, hasta: 300, vol: 0.18, ataque: 0.02 });
            ding(0.2);
        },
        clack: function () { golpeSeco(820, 0, 0.3); },
        /** Onda de calibración amarilla (reintentar). */
        calibracion: function () {
            [0, 0.18, 0.36].forEach(function (r) { tono(520, { tipo: "sine", dur: 0.16, hasta: 610, vol: 0.1, retraso: r }); });
        },
        jeje: function () {
            tono(660, { tipo: "triangle", dur: 0.11, hasta: 820, vol: 0.18 });
            tono(700, { tipo: "triangle", dur: 0.11, hasta: 880, vol: 0.18, retraso: 0.17 });
        },
        escaneo: function () {
            tono(400, { tipo: "sine", dur: 0.6, hasta: 1200, vol: 0.08 });
        },
        cinta: function () {
            [0, 0.12, 0.24, 0.36].forEach(function (r) { golpeSeco(300, r, 0.08); });
        },
        tubo: function () {
            ruido({ dur: 0.9, filtro: "bandpass", desde: 300, hasta: 2400, q: 1.4, vol: 0.12, ataque: 0.2 });
        },
        ding: function () { ding(0); },
        chispas: function () {
            [1318.5, 1568, 2093, 1568, 2637].forEach(function (f, k) {
                tono(f, { tipo: "triangle", dur: 0.35, vol: 0.14, retraso: k * 0.07 });
            });
        },
        magia: function () {
            [1046.5, 1318.5, 1568, 2093].forEach(function (f, k) {
                tono(f, { tipo: "sine", dur: 0.3, vol: 0.12, retraso: k * 0.07 });
            });
        },
        oops: function () {
            tono(420, { tipo: "triangle", dur: 0.16, hasta: 360, vol: 0.16 });
            tono(330, { tipo: "triangle", dur: 0.26, hasta: 250, vol: 0.16, retraso: 0.17 });
        },
        fanfarria: function () {
            [[392, 0, 0.14], [392, 0.16, 0.14], [392, 0.32, 0.14], [523.25, 0.5, 0.7]].forEach(function (n) {
                tono(n[0], { tipo: "triangle", dur: n[2], vol: 0.22, retraso: n[1] });
                tono(n[0] * 1.5, { tipo: "sine", dur: n[2], vol: 0.08, retraso: n[1] });
            });
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

    global.SuaveAsperoSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
