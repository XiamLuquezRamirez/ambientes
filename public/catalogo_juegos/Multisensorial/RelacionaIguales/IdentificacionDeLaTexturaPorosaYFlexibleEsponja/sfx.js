/**
 * RelacionaIgualesSfx — efectos sintetizados con WebAudio (sin archivos).
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
        if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
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

    function campanitas(notas, paso, retraso, vol) {
        notas.forEach(function (f, k) { tono(f, { tipo: "sine", dur: 0.45, vol: vol || 0.09, retraso: (retraso || 0) + k * paso }); });
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
        nieve: function () { ruido({ dur: 0.3, filtro: "bandpass", desde: 1800, q: 1.2, vol: 0.14, granulado: 0.25 }); },
        metal: function () { tono(1900, { tipo: "square", dur: 0.18, vol: 0.04 }); tono(2850, { tipo: "sine", dur: 0.5, vol: 0.06 }); },
        papel: function () { ruido({ dur: 0.25, filtro: "highpass", desde: 2200, vol: 0.12, granulado: 0.5 }); },
        pop: function () { [0, 0.09, 0.15].forEach(function (r) { golpeSeco(900, r, 0.18); }); },
        hielo: function () { tono(3200, { tipo: "sine", dur: 0.3, vol: 0.1 }); tono(4100, { tipo: "sine", dur: 0.25, vol: 0.06, retraso: 0.08 }); },
        crujir: function () { ruido({ dur: 0.35, filtro: "bandpass", desde: 2400, q: 0.8, vol: 0.18, granulado: 0.12 }); },

        /* Espejo mágico (3-4) */
        /** Portal de fusión: melodía armónica. */
        armonia: function () { campanitas([523.25, 659.25, 783.99, 1046.5], 0.11, 0, 0.1); },
        /** Reto 1: el portal brilla con estrellitas. */
        estrellitas: function () { campanitas([1568, 2093, 2637, 3136], 0.06, 0.1, 0.07); },
        /** Reto 2: salta polvillo brillante. */
        polvillo: function () { rasc(0, 0.08); campanitas([2093, 2637], 0.08, 0.15, 0.06); },
        /** Reto 3: las telas se entrelazan. */
        entrelazar: function () { ruido({ dur: 0.8, filtro: "bandpass", desde: 700, hasta: 2200, q: 0.7, vol: 0.1, ataque: 0.25 }); },
        /** Reto 4: ambos elementos brillan. */
        brillo: function () { tono(2637, { tipo: "sine", dur: 0.8, vol: 0.1 }); tono(3520, { tipo: "sine", dur: 0.6, vol: 0.05, retraso: 0.1 }); },
        /** Reto 1: el espejo suena como un timbre desafinado ¡Boing-clack! */
        boingclack: function () {
            tono(660, { tipo: "square", dur: 0.25, vol: 0.06 });
            tono(660, { tipo: "square", dur: 0.25, vol: 0.06, detune: 70 });
            boing(0.18);
            golpeSeco(900, 0.5, 0.25);
        },
        /** Reto 3: el espejo vibra deteniendo el movimiento. */
        vibra: function () {
            tono(90, { tipo: "sawtooth", dur: 0.5, vol: 0.06 });
            ruido({ dur: 0.5, filtro: "bandpass", desde: 300, q: 2, vol: 0.08 });
        },
        /** Reto 4: el objeto blando rebota sin deslizar. */
        boing: function () { boing(0); },
        /** Objeto que no es pareja y vuelve a su sitio. */
        devolver: function () { tono(392, { tipo: "triangle", dur: 0.18, vol: 0.12 }); tono(311, { tipo: "triangle", dur: 0.25, vol: 0.12, retraso: 0.16 }); },

        /* Laboratorio (5-6) */
        escaneo: function () { tono(400, { tipo: "sine", dur: 0.8, hasta: 1200, vol: 0.08 }); tono(1200, { tipo: "sine", dur: 0.2, vol: 0.05, retraso: 0.8 }); },
        colocar: function () { golpeSeco(700, 0, 0.2); },
        /** Reto 1: luz verde y ondas de frecuencia suave. */
        ondas: function () { tono(330, { tipo: "sine", dur: 1.2, hasta: 440, vol: 0.1 }); tono(495, { tipo: "sine", dur: 1.2, hasta: 660, vol: 0.05, retraso: 0.2 }); },
        /** Reto 2: señal de confirmación ¡Crack-zizz! */
        crackzizz: function () {
            ruido({ dur: 0.1, filtro: "bandpass", desde: 1400, q: 1, vol: 0.3, granulado: 0.4 });
            tono(1800, { tipo: "sawtooth", dur: 0.45, hasta: 2600, vol: 0.04, retraso: 0.12 });
            ruido({ dur: 0.4, filtro: "highpass", desde: 4000, vol: 0.06, retraso: 0.12 });
        },
        /** Reto 3: las telas se deslizan. */
        deslizar: function () { ruido({ dur: 0.9, filtro: "bandpass", desde: 1200, hasta: 3000, q: 0.6, vol: 0.09, ataque: 0.3 }); },
        /** Reto 4: destello de prisma con sonido cristalino ¡Chime-glimmer! */
        chimeglimmer: function () { campanitas([2093, 2637, 3136, 3951, 4699], 0.07, 0, 0.07); tono(5274, { tipo: "sine", dur: 0.9, vol: 0.03, retraso: 0.4 }); },
        /** Reto 5: compresión y expansión ¡Squeeze-bounce! */
        squeezebounce: function () {
            [0, 0.5, 1].forEach(function (r) {
                ruido({ dur: 0.25, desde: 900, hasta: 250, vol: 0.14, ataque: 0.05, retraso: r });
                tono(220, { tipo: "sine", dur: 0.22, hasta: 440, vol: 0.12, retraso: r + 0.22 });
            });
        },
        /** Reto 1: el escáner emite luz amarilla. */
        alerta: function () { tono(880, { tipo: "triangle", dur: 0.18, vol: 0.12 }); tono(880, { tipo: "triangle", dur: 0.18, vol: 0.12, retraso: 0.26 }); },
        microscopio: function () { tono(300, { tipo: "sine", dur: 0.5, hasta: 1400, vol: 0.06 }); },

        /* Generales */
        ding: function () { ding(0); },
        magia: function () { campanitas([1046.5, 1318.5, 1568, 2093], 0.07, 0, 0.12); },
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

    global.RelacionaIgualesSfx = {
        sonar: sonar,
        existe: function (nombre) { return !!EFECTOS[nombre]; },
        desbloquear: function () { contexto(); }
    };
})(typeof window !== "undefined" ? window : this);
