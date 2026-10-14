/**
 * DescubreObjetoSfx — efectos sintetizados con WebAudio (sin archivos).
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

    function rasc(retraso, vol) {
        ruido({ dur: 0.2, filtro: "bandpass", desde: 2600, hasta: 3800, q: 2, vol: vol || 0.17, granulado: 0.2, retraso: retraso || 0 });
    }

    function croc(retraso) {
        ruido({ dur: 0.12, filtro: "bandpass", desde: 900, q: 1.5, vol: 0.24, granulado: 0.3, retraso: retraso || 0 });
        golpeSeco(170, retraso || 0, 0.2);
    }

    function fluff(retraso, vol) {
        ruido({ dur: 0.45, filtro: "bandpass", desde: 500, hasta: 1500, q: 0.8, vol: vol || 0.12, ataque: 0.12, retraso: retraso || 0 });
    }

    function ding(retraso, vol) {
        tono(1568, { tipo: "sine", dur: 0.9, vol: vol || 0.22, retraso: retraso || 0 });
        tono(3136, { tipo: "sine", dur: 0.6, vol: 0.06, retraso: retraso || 0 });
    }

    function cascabeles(retraso, vol) {
        for (let k = 0; k < 6; k++) {
            tono(2637 + (k % 3) * 300, { tipo: "sine", dur: 0.18, vol: vol || 0.08, retraso: (retraso || 0) + k * 0.05 });
        }
    }

    function hojas(retraso, vol) {
        for (let k = 0; k < 5; k++) {
            ruido({ dur: 0.12, filtro: "highpass", desde: 2200 + k * 300, vol: vol || 0.07, granulado: 0.4, retraso: (retraso || 0) + k * 0.08 });
        }
    }

    function pajaro(retraso) {
        tono(2400, { tipo: "sine", dur: 0.12, hasta: 3200, vol: 0.06, retraso: retraso || 0 });
        tono(2600, { tipo: "sine", dur: 0.1, hasta: 3400, vol: 0.05, retraso: (retraso || 0) + 0.16 });
    }

    function aplauso(retraso, vol) {
        for (let k = 0; k < 7; k++) {
            ruido({ dur: 0.06, filtro: "bandpass", desde: 1800, q: 0.9, vol: vol || 0.12, retraso: (retraso || 0) + k * 0.09 + Math.random() * 0.03 });
        }
    }

    const EFECTOS = {
        /* Al tocar cada objeto */
        fluff: function () { fluff(0); },
        seda: function () {
            ruido({ dur: 0.5, filtro: "highpass", desde: 3000, vol: 0.06, ataque: 0.2 });
            tono(1320, { tipo: "sine", dur: 0.4, hasta: 1760, vol: 0.04 });
        },
        squish: function () {
            ruido({ dur: 0.3, desde: 800, hasta: 200, vol: 0.18, ataque: 0.04 });
            tono(240, { tipo: "sine", dur: 0.25, hasta: 160, vol: 0.08 });
        },
        rasc: function () { rasc(0); rasc(0.2); },
        croc: function () { croc(0); rasc(0.12, 0.1); },
        tap: function () { golpeSeco(260, 0, 0.22); },
        ting: function () { tono(2637, { tipo: "sine", dur: 0.6, vol: 0.12 }); tono(3951, { tipo: "sine", dur: 0.35, vol: 0.04 }); },
        toc: function () { golpeSeco(520, 0, 0.28); },

        /* Cofre mágico (3-4) */
        cofre: function () {
            ruido({ dur: 0.5, filtro: "bandpass", desde: 400, hasta: 1200, q: 0.8, vol: 0.1, ataque: 0.15 });
            golpeSeco(200, 0.4, 0.22);
        },
        /** Reto 1: sale el osito con cascabeles ¡Tadaa-ding! */
        tadaading: function () {
            [523.25, 659.25, 783.99].forEach(function (f) { tono(f, { tipo: "triangle", dur: 0.45, vol: 0.12 }); });
            tono(1046.5, { tipo: "triangle", dur: 0.5, vol: 0.12, retraso: 0.22 });
            cascabeles(0.3);
            ding(0.5, 0.16);
        },
        /** El gato maúlla suavemente ¡Miau! */
        miau: function () {
            tono(620, { tipo: "sawtooth", dur: 0.18, hasta: 900, vol: 0.05 });
            tono(900, { tipo: "sine", dur: 0.45, hasta: 520, vol: 0.12, retraso: 0.16 });
        },
        /** El cofre suena cerrado ¡Toc-toc! */
        toctoc: function () { golpeSeco(180, 0, 0.35); golpeSeco(180, 0.22, 0.35); },
        /** Reto 2: abre entre sonidos de naturaleza ¡Croc-yay! */
        crocyay: function () {
            croc(0);
            hojas(0.1);
            pajaro(0.35);
            [783.99, 987.77, 1174.66].forEach(function (f, k) { tono(f, { tipo: "triangle", dur: 0.3, vol: 0.1, retraso: 0.25 + k * 0.08 }); });
        },
        /** Reto 2: tono grave suave del cofre. */
        grave: function () { tono(130, { tipo: "sine", dur: 0.7, hasta: 110, vol: 0.22 }); },
        /** Reto 3: destello cristalino ¡Chime-glimmer! */
        chimeglimmer: function () {
            [2093, 2637, 3136, 3951].forEach(function (f, k) { tono(f, { tipo: "sine", dur: 0.7, vol: 0.08, retraso: k * 0.07 }); });
            ruido({ dur: 0.6, filtro: "highpass", desde: 5000, vol: 0.04, ataque: 0.2, retraso: 0.2 });
        },
        /** Reto 3: el cofre raspa suavemente. */
        raspa: function () { rasc(0, 0.12); rasc(0.18, 0.1); },
        abrir: function () {
            tono(300, { tipo: "triangle", dur: 0.35, hasta: 600, vol: 0.08 });
            ruido({ dur: 0.3, filtro: "bandpass", desde: 700, q: 2, vol: 0.06 });
        },

        /* Radar (5-6) */
        luz: function () { tono(880, { tipo: "sine", dur: 0.15, vol: 0.1 }); tono(1320, { tipo: "sine", dur: 0.15, vol: 0.06, retraso: 0.08 }); },
        casi: function () { tono(660, { tipo: "triangle", dur: 0.2, vol: 0.1 }); tono(660, { tipo: "triangle", dur: 0.2, vol: 0.1, retraso: 0.25 }); },
        /** Reto 1: tono triunfal. */
        triunfal: function () {
            [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.38]].forEach(function (n) {
                tono(n[0], { tipo: "triangle", dur: n[1] === 0.38 ? 0.7 : 0.18, vol: 0.16, retraso: n[1] });
            });
        },
        /** Reto 2: hojas mágicas con sonido de bosque ¡Croc-leaf! */
        crocleaf: function () {
            croc(0);
            hojas(0.12, 0.08);
            pajaro(0.3);
            pajaro(0.7);
        },
        /** Reto 3: al frotar ¡Schwik-schwik! */
        schwik: function () {
            ruido({ dur: 0.16, filtro: "bandpass", desde: 3000, hasta: 5200, q: 1.5, vol: 0.09 });
            tono(2637, { tipo: "sine", dur: 0.12, vol: 0.025, retraso: 0.04 });
        },
        /** Reto 3: el panel queda limpio con destello tipo prisma ¡Glimmer! */
        glimmer: function () {
            [1568, 2093, 2637, 3136, 4186].forEach(function (f, k) { tono(f, { tipo: "sine", dur: 0.5, vol: 0.07, retraso: k * 0.06 }); });
        },
        regresa: function () { tono(400, { tipo: "sine", dur: 0.2, hasta: 260, vol: 0.08 }); },

        /* Generales */
        ding: function () { ding(0); },
        magia: function () {
            [1046.5, 1318.5, 1568, 2093].forEach(function (f, k) { tono(f, { tipo: "sine", dur: 0.3, vol: 0.12, retraso: k * 0.07 }); });
        },
        chispas: function () {
            [1318.5, 1568, 2093, 1568, 2637].forEach(function (f, k) { tono(f, { tipo: "triangle", dur: 0.35, vol: 0.14, retraso: k * 0.07 }); });
        },
        fanfarria: function () {
            [[392, 0, 0.14], [392, 0.16, 0.14], [392, 0.32, 0.14], [523.25, 0.5, 0.7]].forEach(function (n) {
                tono(n[0], { tipo: "triangle", dur: n[2], vol: 0.22, retraso: n[1] });
                tono(n[0] * 1.5, { tipo: "sine", dur: n[2], vol: 0.08, retraso: n[1] });
            });
            aplauso(0.9, 0.08);
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

    global.DescubreObjetoSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
