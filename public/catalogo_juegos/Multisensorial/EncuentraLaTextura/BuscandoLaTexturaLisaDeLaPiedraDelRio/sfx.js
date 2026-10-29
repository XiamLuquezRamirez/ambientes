/**
 * EncuentraTexturaSfx — efectos sintetizados con WebAudio (sin archivos).
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

    const EFECTOS = {
        /** Algodón y pluma: ¡swoosh-fluff! */
        fluff: function () {
            ruido({ dur: 0.45, filtro: "bandpass", desde: 500, hasta: 1500, q: 0.8, vol: 0.12, ataque: 0.12 });
            ruido({ dur: 0.3, desde: 700, hasta: 250, vol: 0.08, retraso: 0.25, ataque: 0.08 });
        },
        /** Algodón en el taller: ¡puff! */
        puff: function () {
            ruido({ dur: 0.28, desde: 900, hasta: 200, vol: 0.2, ataque: 0.03 });
        },
        /** Piedra: ¡toc-toc! */
        toctoc: function () {
            golpeSeco(190, 0, 0.4);
            golpeSeco(170, 0.17, 0.35);
        },
        toc: function () {
            golpeSeco(240, 0, 0.32);
        },
        /** Lija y madera rugosa: ¡rrrrr-rasch! */
        rasch: function () {
            ruido({ dur: 0.35, filtro: "bandpass", desde: 2600, hasta: 3800, q: 2, vol: 0.16, granulado: 0.18 });
            ruido({ dur: 0.18, filtro: "highpass", desde: 2200, vol: 0.2, retraso: 0.32 });
        },
        /** Peluche que ríe: ¡je, je! */
        jeje: function () {
            tono(660, { tipo: "triangle", dur: 0.11, hasta: 820, vol: 0.18 });
            tono(700, { tipo: "triangle", dur: 0.11, hasta: 880, vol: 0.18, retraso: 0.17 });
        },
        /** Piedra lisa, vidrio: ¡fiiiiu! */
        fiiiu: function () {
            tono(1800, { tipo: "sine", dur: 0.45, hasta: 700, vol: 0.12 });
        },
        tactac: function () {
            golpeSeco(900, 0, 0.22);
            golpeSeco(820, 0.13, 0.2);
        },
        /** Esponja: ¡squeak! */
        squeak: function () {
            tono(900, { tipo: "sine", dur: 0.18, hasta: 1700, vol: 0.14 });
            [0.05, 0.14, 0.22].forEach(function (r) { tono(2400 + r * 3000, { tipo: "sine", dur: 0.05, vol: 0.05, retraso: r }); });
        },
        frufru: function () {
            ruido({ dur: 0.5, filtro: "bandpass", desde: 3000, hasta: 1800, q: 0.7, vol: 0.06, ataque: 0.15 });
        },
        tin: function () {
            tono(2637, { tipo: "sine", dur: 0.5, vol: 0.12 });
            tono(3951, { tipo: "sine", dur: 0.35, vol: 0.05 });
        },
        crac: function () {
            ruido({ dur: 0.12, filtro: "bandpass", desde: 1600, q: 1.5, vol: 0.22, granulado: 0.3 });
            ruido({ dur: 0.1, filtro: "bandpass", desde: 1100, q: 1.5, vol: 0.18, retraso: 0.12, granulado: 0.3 });
        },
        /** Golpecito de la piedra sobre el coco. */
        golpe: function () {
            golpeSeco(320, 0, 0.45);
        },
        /** El coco se parte. */
        crack: function () {
            ruido({ dur: 0.25, filtro: "highpass", desde: 1200, vol: 0.32 });
            golpeSeco(150, 0.02, 0.4);
            ruido({ dur: 0.6, filtro: "bandpass", desde: 700, hasta: 300, q: 1, vol: 0.12, retraso: 0.2 });
        },
        /** Tobogán de agua. */
        agua: function () {
            ruido({ dur: 1.1, filtro: "bandpass", desde: 600, hasta: 1800, q: 2, vol: 0.12, ataque: 0.2 });
            [0.2, 0.45, 0.7].forEach(function (r) { tono(900 + r * 600, { tipo: "sine", dur: 0.08, hasta: 1800, vol: 0.06, retraso: r }); });
        },
        /** Zeus se hunde en el sillón: ¡fuuush-boing! */
        fuuushboing: function () {
            ruido({ dur: 0.7, filtro: "bandpass", desde: 400, hasta: 1100, q: 1, vol: 0.16, ataque: 0.2 });
            tono(140, { tipo: "sine", dur: 0.5, hasta: 360, vol: 0.3, retraso: 0.62 });
        },
        suspiro: function () {
            ruido({ dur: 1.1, filtro: "bandpass", desde: 900, hasta: 350, q: 0.9, vol: 0.08, ataque: 0.3 });
        },
        ding: function () {
            tono(1568, { tipo: "sine", dur: 0.9, vol: 0.22 });
            tono(3136, { tipo: "sine", dur: 0.6, vol: 0.06 });
        },
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
        abrir: function () {
            tono(300, { tipo: "triangle", dur: 0.3, hasta: 900, vol: 0.18 });
            ruido({ dur: 0.4, filtro: "bandpass", desde: 800, hasta: 3000, q: 1, vol: 0.1, retraso: 0.1 });
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

    global.EncuentraTexturaSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
