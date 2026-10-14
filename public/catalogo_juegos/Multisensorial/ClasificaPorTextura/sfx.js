/**
 * ClasificaTexturaSfx — efectos sintetizados con WebAudio (sin archivos).
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

    function boing(retraso) {
        tono(150, { tipo: "sine", dur: 0.45, hasta: 420, vol: 0.28, retraso: retraso || 0 });
        tono(300, { tipo: "triangle", dur: 0.3, hasta: 520, vol: 0.06, retraso: (retraso || 0) + 0.05 });
    }

    function ding(retraso, vol) {
        tono(1568, { tipo: "sine", dur: 0.9, vol: vol || 0.22, retraso: retraso || 0 });
        tono(3136, { tipo: "sine", dur: 0.6, vol: 0.06, retraso: retraso || 0 });
    }

    function aplauso(retraso, vol) {
        for (let k = 0; k < 7; k++) {
            ruido({ dur: 0.06, filtro: "bandpass", desde: 1800, q: 0.9, vol: vol || 0.12, retraso: (retraso || 0) + k * 0.09 + Math.random() * 0.03 });
        }
    }

    const EFECTOS = {
        /* Al tocar cada material */
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

        /* Cestas (3-4) */
        /** Cesta Nube: ¡swoosh-fluff! */
        swooshfluff: function () {
            ruido({ dur: 0.4, filtro: "bandpass", desde: 600, hasta: 1800, q: 0.8, vol: 0.13, ataque: 0.1 });
            fluff(0.25, 0.08);
        },
        /** Cesta Roca: ¡clack-croc! */
        clackcroc: function () {
            golpeSeco(900, 0, 0.3);
            croc(0.12);
        },
        /** Reto 1: cascabel suave ¡ding-fluff! */
        dingfluff: function () {
            [2093, 2637, 2349].forEach(function (f, k) { tono(f, { tipo: "sine", dur: 0.4, vol: 0.08, retraso: k * 0.05 }); });
            fluff(0.15, 0.1);
        },
        /** Reto 1: la cesta rebota la lija ¡boing-rasc! */
        boingrasc: function () { boing(0); rasc(0.25); },
        /** Reto 3: estrellitas y aplausos suaves ¡puff-yay! */
        puffyay: function () {
            ruido({ dur: 0.25, desde: 900, hasta: 200, vol: 0.2, ataque: 0.03 });
            [523.25, 659.25, 783.99].forEach(function (f) { tono(f, { tipo: "triangle", dur: 0.5, vol: 0.08, retraso: 0.18 }); });
            aplauso(0.3, 0.08);
        },
        /** Reto 3: la cesta vibra y expulsa la corteza. */
        vibra: function () {
            tono(90, { tipo: "sawtooth", dur: 0.5, vol: 0.06 });
            ruido({ dur: 0.5, filtro: "bandpass", desde: 300, q: 2, vol: 0.08 });
        },
        cesta: function () {
            ruido({ dur: 0.6, filtro: "bandpass", desde: 400, hasta: 1400, q: 0.8, vol: 0.1, ataque: 0.2 });
        },

        /* Estación (5-6) */
        /** Módulo Suave: ¡swoosh-ding! */
        swooshding: function () {
            ruido({ dur: 0.45, filtro: "bandpass", desde: 500, hasta: 1500, q: 0.7, vol: 0.12, ataque: 0.12 });
            ding(0.3);
        },
        /** Barrera roja: ¡rasc-boing! */
        rascboing: function () {
            tono(220, { tipo: "square", dur: 0.25, vol: 0.05 });
            rasc(0.05);
            boing(0.25);
        },
        /** Tolva: ¡croc-clack! */
        crocclack: function () {
            croc(0);
            croc(0.14);
            golpeSeco(900, 0.32, 0.3);
            [1568, 2093, 2637].forEach(function (f, k) { tono(f, { tipo: "triangle", dur: 0.2, vol: 0.06, retraso: 0.4 + k * 0.06 }); });
        },
        /** La tolva expulsa deslizando. */
        deslizar: function () {
            ruido({ dur: 0.6, filtro: "bandpass", desde: 1600, hasta: 500, q: 1, vol: 0.12, ataque: 0.05 });
        },
        /** Rampa de cristal: ¡fiiiiuuu-ding! */
        fiuuding: function () {
            tono(1800, { tipo: "sine", dur: 0.7, hasta: 500, vol: 0.12 });
            ding(0.65);
        },
        /** La rampa se frena en seco: ¡scratch! */
        scratch: function () {
            ruido({ dur: 0.35, filtro: "bandpass", desde: 3200, hasta: 1200, q: 3, vol: 0.2, granulado: 0.35 });
            golpeSeco(200, 0.3, 0.2);
        },
        /** Trituradora: engranaje ¡clack-croc-ding! */
        clackcrocding: function () {
            golpeSeco(820, 0, 0.3);
            croc(0.14);
            golpeSeco(600, 0.3, 0.2);
            ding(0.45);
        },
        boing: function () { boing(0); },
        /** Pinza electromagnética al agarrar. */
        pinza: function () {
            golpeSeco(1200, 0, 0.18);
            tono(110, { tipo: "sine", dur: 0.35, vol: 0.06, retraso: 0.04 });
        },
        tropiezo: function () { rasc(0, 0.1); },
        escaneo: function () { tono(400, { tipo: "sine", dur: 0.6, hasta: 1200, vol: 0.08 }); },
        cinta: function () { [0, 0.12, 0.24, 0.36].forEach(function (r) { golpeSeco(300, r, 0.08); }); },

        /* Generales */
        ding: function () { ding(0); },
        magia: function () {
            [1046.5, 1318.5, 1568, 2093].forEach(function (f, k) { tono(f, { tipo: "sine", dur: 0.3, vol: 0.12, retraso: k * 0.07 }); });
        },
        chispas: function () {
            [1318.5, 1568, 2093, 1568, 2637].forEach(function (f, k) { tono(f, { tipo: "triangle", dur: 0.35, vol: 0.14, retraso: k * 0.07 }); });
        },
        sello: function () {
            golpeSeco(140, 0, 0.4);
            ding(0.15, 0.14);
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

    global.ClasificaTexturaSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
