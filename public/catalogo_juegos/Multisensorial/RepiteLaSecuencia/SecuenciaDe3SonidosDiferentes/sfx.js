/**
 * RepiteSecuenciaSfx — sonidos sintetizados con WebAudio (sin archivos).
 * Provisionales: si config.audios.sonidos[id] o config.audios.efectos[nombre] tienen ruta,
 * el juego usa esa grabación en lugar de la síntesis.
 *
 * reproducir(nombre, { lento, breve }) suena un estímulo (detiene el anterior) y devuelve su duración en segundos.
 * sonar(nombre) suena un efecto corto del juego.
 */
(function (global) {
    "use strict";

    let ctx = null;
    let ruidoBuffer = null;
    let busEstimulo = null;

    function contexto() {
        const Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function ruidoBlanco(c) {
        if (ruidoBuffer) return ruidoBuffer;
        const largo = Math.ceil(c.sampleRate * 4);
        ruidoBuffer = c.createBuffer(1, largo, c.sampleRate);
        const data = ruidoBuffer.getChannelData(0);
        for (let i = 0; i < largo; i++) data[i] = Math.random() * 2 - 1;
        return ruidoBuffer;
    }

    /** Envolvente: sube en `ataque`, se mantiene y cae a cero al final. */
    function envolvente(g, t0, dur, vol, ataque, caida) {
        const a = Math.min(ataque || 0.01, dur / 2);
        const r = Math.min(caida != null ? caida : dur * 0.6, dur - a);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + a);
        g.gain.setValueAtTime(vol, t0 + dur - r);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }

    /** Oscilador con contorno de frecuencia [[t, f], ...] relativo a t0. */
    function osc(c, dest, t0, dur, o) {
        const n = c.createOscillator();
        const g = c.createGain();
        n.type = o.tipo || "sine";
        const curva = o.curva || [[0, o.f || 440]];
        n.frequency.setValueAtTime(curva[0][1], t0);
        for (let i = 1; i < curva.length; i++) n.frequency.exponentialRampToValueAtTime(curva[i][1], t0 + curva[i][0]);
        if (o.vibrato) {
            const lfo = c.createOscillator();
            const lg = c.createGain();
            lfo.frequency.value = o.vibrato[0];
            lg.gain.value = o.vibrato[1];
            lfo.connect(lg).connect(n.frequency);
            lfo.start(t0);
            lfo.stop(t0 + dur + 0.05);
        }
        envolvente(g, t0, dur, o.vol || 0.3, o.ataque, o.caida);
        let salida = n;
        (o.filtros || []).forEach(function (fdef) {
            const f = c.createBiquadFilter();
            f.type = fdef.tipo;
            f.Q.value = fdef.q || 1;
            const fc = fdef.curva || [[0, fdef.f]];
            f.frequency.setValueAtTime(fc[0][1], t0);
            for (let i = 1; i < fc.length; i++) f.frequency.exponentialRampToValueAtTime(fc[i][1], t0 + fc[i][0]);
            salida.connect(f);
            salida = f;
        });
        salida.connect(g).connect(dest);
        n.start(t0);
        n.stop(t0 + dur + 0.05);
    }

    /** Ruido filtrado; `ganancia` opcional [[t, vol], ...] para oleajes y ráfagas. */
    function ruido(c, dest, t0, dur, o) {
        const src = c.createBufferSource();
        src.buffer = ruidoBlanco(c);
        src.loop = true;
        const g = c.createGain();
        let salida = src;
        (o.filtros || [{ tipo: "lowpass", f: 1200 }]).forEach(function (fdef) {
            const f = c.createBiquadFilter();
            f.type = fdef.tipo;
            f.Q.value = fdef.q || 1;
            const fc = fdef.curva || [[0, fdef.f]];
            f.frequency.setValueAtTime(fc[0][1], t0);
            for (let i = 1; i < fc.length; i++) f.frequency.exponentialRampToValueAtTime(fc[i][1], t0 + fc[i][0]);
            salida.connect(f);
            salida = f;
        });
        if (o.ganancia) {
            g.gain.setValueAtTime(0.0001, t0);
            o.ganancia.forEach(function (p) { g.gain.exponentialRampToValueAtTime(Math.max(0.0001, p[1]), t0 + p[0]); });
        } else {
            envolvente(g, t0, dur, o.vol || 0.2, o.ataque, o.caida);
        }
        salida.connect(g).connect(dest);
        src.start(t0, Math.random() * 3);
        src.stop(t0 + dur + 0.05);
    }

    /* ── Estímulos (el sonido que el niño debe reconocer) ─────── */

    function guau(c, d, t) {
        osc(c, d, t, 0.17, {
            tipo: "sawtooth", vol: 0.5, ataque: 0.008, caida: 0.12,
            curva: [[0, 560], [0.05, 640], [0.17, 300]],
            filtros: [{ tipo: "bandpass", f: 950, q: 1.3 }, { tipo: "lowpass", f: 2600 }]
        });
        osc(c, d, t, 0.15, {
            tipo: "square", vol: 0.12, ataque: 0.008, caida: 0.1,
            curva: [[0, 1100], [0.15, 620]],
            filtros: [{ tipo: "bandpass", f: 1500, q: 2 }]
        });
        ruido(c, d, t, 0.09, { vol: 0.22, ataque: 0.004, caida: 0.07, filtros: [{ tipo: "bandpass", f: 1300, q: 1.2 }] });
    }

    function campanazo(c, d, t, f, decae, vol) {
        [[0.5, 0.28], [1, 0.5], [1.19, 0.2], [1.5, 0.16], [2, 0.24], [2.74, 0.1], [3, 0.08]].forEach(function (p, i) {
            osc(c, d, t, decae * (i < 2 ? 1 : 0.6), { tipo: "sine", f: f * p[0], vol: p[1] * (vol || 0.5), ataque: 0.004, caida: decae * (i < 2 ? 1 : 0.6) - 0.01 });
        });
    }

    function tin(c, d, t, decae) {
        [[1, 0.26], [2.76, 0.12], [5.4, 0.06], [8.9, 0.03]].forEach(function (p) {
            osc(c, d, t, decae, { tipo: "sine", f: 2600 * p[0], vol: p[1], ataque: 0.002, caida: decae - 0.005 });
        });
    }

    function golpeTambor(c, d, t, vol) {
        osc(c, d, t, 0.35, { tipo: "sine", vol: vol || 0.8, ataque: 0.003, caida: 0.33, curva: [[0, 170], [0.3, 60]] });
        ruido(c, d, t, 0.06, { vol: 0.2, ataque: 0.002, caida: 0.05, filtros: [{ tipo: "lowpass", f: 900 }] });
    }

    function bote(c, d, t, vol) {
        osc(c, d, t, 0.12, { tipo: "sine", vol: vol, ataque: 0.003, caida: 0.1, curva: [[0, 210], [0.12, 85]] });
        osc(c, d, t, 0.09, { tipo: "triangle", vol: vol * 0.25, ataque: 0.003, caida: 0.08, curva: [[0, 420], [0.09, 300]] });
        ruido(c, d, t, 0.03, { vol: vol * 0.3, ataque: 0.002, caida: 0.025, filtros: [{ tipo: "bandpass", f: 2000, q: 1 }] });
    }

    /** Nota de metal: sierra con filtro que se abre al soplar y vibrato leve. */
    function soplido(c, d, t, dur, f) {
        [[1, 0.2], [1.004, 0.12]].forEach(function (p) {
            osc(c, d, t, dur, {
                tipo: "sawtooth", f: f * p[0], vol: p[1], ataque: 0.03, caida: Math.min(0.12, dur * 0.4),
                vibrato: dur > 0.4 ? [5.5, 4] : null,
                filtros: [{ tipo: "lowpass", q: 2, curva: [[0, 500], [0.05, 2600], [dur, 1800]] }]
            });
        });
    }

    function cascabeles(c, d, t, dur, vol) {
        ruido(c, d, t, dur, { vol: vol, ataque: 0.003, caida: dur * 0.85, filtros: [{ tipo: "bandpass", f: 7800, q: 2.5 }] });
        [5400, 6900].forEach(function (f) {
            osc(c, d, t, dur, { tipo: "sine", f: f, vol: vol * 0.25, ataque: 0.002, caida: dur * 0.9 });
        });
    }

    function pio(c, d, t) {
        osc(c, d, t, 0.1, {
            tipo: "sine", vol: 0.22, ataque: 0.008, caida: 0.06,
            curva: [[0, 2900], [0.04, 4300], [0.1, 3100]],
            vibrato: [45, 180]
        });
    }

    /**
     * Cada estímulo recibe (contexto, destino, t0, k) donde k estira el tiempo (lento > 1)
     * y `breve` reduce el sonido a su primera parte. Devuelve la duración en segundos.
     */
    const ESTIMULOS = {
        ladrido: function (c, d, t, k, breve) {
            const golpes = breve ? [0, 0.3] : [0, 0.3, 0.95, 1.25];
            golpes.forEach(function (s) { guau(c, d, t + s * k); });
            return (golpes[golpes.length - 1] + 0.25) * k;
        },
        maullido: function (c, d, t, k, breve) {
            const dur = (breve ? 0.65 : 1.0) * k;
            osc(c, d, t, dur, {
                tipo: "sawtooth", vol: 0.32, ataque: 0.07, caida: dur * 0.35,
                curva: [[0, 430], [dur * 0.35, 720], [dur, 470]],
                vibrato: [6, 12],
                filtros: [{ tipo: "bandpass", q: 3, curva: [[0, 900], [dur * 0.4, 1900], [dur, 700]] }]
            });
            osc(c, d, t, dur, {
                tipo: "sawtooth", vol: 0.08, ataque: 0.07, caida: dur * 0.35,
                curva: [[0, 430], [dur * 0.35, 720], [dur, 470]],
                filtros: [{ tipo: "bandpass", f: 2700, q: 6 }]
            });
            return dur + 0.05;
        },
        trino: function (c, d, t, k, breve) {
            const frases = breve ? [0] : [0, 0.85];
            frases.forEach(function (f0) {
                for (let i = 0; i < 5; i++) pio(c, d, t + (f0 + i * 0.12) * k);
            });
            return (frases[frases.length - 1] + 0.7) * k;
        },
        mugido: function (c, d, t, k, breve) {
            const dur = (breve ? 1.0 : 1.7) * k;
            osc(c, d, t, dur, {
                tipo: "sawtooth", vol: 0.42, ataque: 0.25, caida: dur * 0.4,
                curva: [[0, 128], [dur * 0.5, 118], [dur, 100]],
                vibrato: [5, 2],
                filtros: [{ tipo: "lowpass", q: 2, curva: [[0, 320], [dur * 0.35, 950], [dur, 380]] }]
            });
            return dur + 0.05;
        },
        quiquiriqui: function (c, d, t, k, breve) {
            const silabas = [[0, 0.11, 720, 900], [0.16, 0.11, 820, 1000], [0.32, 0.14, 900, 1120], [0.52, 0.75, 1150, 900]];
            const usar = breve ? silabas.slice(0, 2).concat([[0.32, 0.4, 1150, 900]]) : silabas;
            usar.forEach(function (s) {
                const dur = s[1] * k;
                osc(c, d, t + s[0] * k, dur, {
                    tipo: "sawtooth", vol: 0.3, ataque: 0.015, caida: dur * 0.5,
                    curva: [[0, s[2]], [dur * 0.3, s[3] * 1.08], [dur, s[3]]],
                    vibrato: s[1] > 0.3 ? [9, 30] : null,
                    filtros: [{ tipo: "bandpass", f: 1500, q: 2.2 }]
                });
            });
            const ult = usar[usar.length - 1];
            return (ult[0] + ult[1]) * k + 0.05;
        },
        lluvia: function (c, d, t, k, breve) {
            const dur = (breve ? 1.4 : 3.0) * k;
            ruido(c, d, t, dur, { vol: 0.13, ataque: 0.35, caida: 0.5, filtros: [{ tipo: "highpass", f: 1400 }, { tipo: "lowpass", f: 7000 }] });
            ruido(c, d, t, dur, { vol: 0.05, ataque: 0.4, caida: 0.5, filtros: [{ tipo: "lowpass", f: 500 }] });
            const gotas = Math.round(dur * 26);
            for (let i = 0; i < gotas; i++) {
                const s = 0.1 + Math.random() * (dur - 0.3);
                osc(c, d, t + s, 0.03, { tipo: "sine", vol: 0.04 + Math.random() * 0.05, ataque: 0.002, caida: 0.025, curva: [[0, 1800 + Math.random() * 2600], [0.03, 1200]] });
            }
            return dur;
        },
        viento: function (c, d, t, k, breve) {
            const dur = (breve ? 1.6 : 3.2) * k;
            ruido(c, d, t, dur, {
                filtros: [{ tipo: "bandpass", q: 9, curva: [[0, 380], [dur * 0.3, 900], [dur * 0.55, 520], [dur * 0.8, 820], [dur, 420]] }],
                ganancia: [[dur * 0.2, 0.5], [dur * 0.45, 0.25], [dur * 0.75, 0.55], [dur, 0.0001]]
            });
            ruido(c, d, t, dur, {
                filtros: [{ tipo: "bandpass", q: 14, curva: [[0, 1200], [dur * 0.5, 1700], [dur, 1100]] }],
                ganancia: [[dur * 0.3, 0.18], [dur * 0.7, 0.08], [dur, 0.0001]]
            });
            return dur;
        },
        campana: function (c, d, t, k, breve) {
            const decae = 1.8 * k;
            campanazo(c, d, t, 660, decae);
            if (breve) return decae;
            campanazo(c, d, t + 0.75 * k, 523, decae);
            return 0.75 * k + decae;
        },
        rebote: function (c, d, t, k, breve) {
            const golpes = breve ? [0, 0.42, 0.74] : [0, 0.48, 0.88, 1.18, 1.4, 1.55, 1.66];
            golpes.forEach(function (s, i) { bote(c, d, t + s * k, 0.75 * Math.pow(0.82, i)); });
            return (golpes[golpes.length - 1] + 0.2) * k;
        },
        carro: function (c, d, t, k, breve) {
            const motor = (breve ? 0.6 : 1.1) * k;
            [[1, 0.24], [2.01, 0.1]].forEach(function (p) {
                osc(c, d, t, motor, {
                    tipo: "sawtooth", vol: p[1], ataque: 0.08, caida: 0.2,
                    curva: [[0, 52 * p[0]], [motor * 0.8, 115 * p[0]], [motor, 105 * p[0]]],
                    filtros: [{ tipo: "lowpass", q: 3, curva: [[0, 300], [motor, 1300]] }]
                });
            });
            const pitos = breve ? [motor + 0.05] : [motor + 0.05, motor + 0.37];
            pitos.forEach(function (s) {
                [400, 500].forEach(function (f) {
                    osc(c, d, t + s, 0.22 * k, { tipo: "square", f: f, vol: 0.12, ataque: 0.01, caida: 0.04, filtros: [{ tipo: "lowpass", f: 2400 }] });
                });
            });
            return pitos[pitos.length - 1] + 0.25 * k;
        },
        triangulo: function (c, d, t, k, breve) {
            const decae = 1.6 * k;
            const golpes = breve ? [0] : [0, 0.28, 0.56];
            golpes.forEach(function (s) { tin(c, d, t + s * k, decae); });
            return golpes[golpes.length - 1] * k + decae;
        },
        tambor: function (c, d, t, k, breve) {
            const golpes = breve ? [0, 0.35] : [0, 0.4, 0.8, 0.98];
            golpes.forEach(function (s, i) { golpeTambor(c, d, t + s * k, i === golpes.length - 1 ? 0.9 : 0.75); });
            return (golpes[golpes.length - 1] + 0.4) * k;
        },
        /** Fanfarria corta "tu-tu-tuuu". */
        trompeta: function (c, d, t, k, breve) {
            const notas = breve
                ? [[0, 0.16, 392], [0.2, 0.5, 523]]
                : [[0, 0.16, 392], [0.2, 0.16, 523], [0.4, 0.16, 659], [0.6, 0.85, 784]];
            notas.forEach(function (n) { soplido(c, d, t + n[0] * k, n[1] * k, n[2]); });
            const ult = notas[notas.length - 1];
            return (ult[0] + ult[1]) * k + 0.05;
        },
        /** Golpe en el parche con cascabeles y luego el sacudido. */
        pandereta: function (c, d, t, k, breve) {
            const golpes = breve ? [0, 0.32] : [0, 0.32, 0.64, 0.8];
            golpes.forEach(function (s) {
                golpeTambor(c, d, t + s * k, 0.22);
                cascabeles(c, d, t + s * k, 0.22, 0.24);
            });
            const fin = golpes[golpes.length - 1] + 0.24;
            if (breve) return fin * k;
            const sacudida = 0.7 * k;
            for (let i = 0; i < 9; i++) cascabeles(c, d, t + (fin + 0.1) * k + i * (sacudida / 9), 0.09, 0.08 + (i % 2) * 0.05);
            return (fin + 0.1) * k + sacudida + 0.1;
        },
        /** "Chiqui-chiqui": ráfagas cortas de semillas. */
        maracas: function (c, d, t, k, breve) {
            const golpes = breve ? [0, 0.16, 0.42] : [0, 0.16, 0.42, 0.58, 0.84, 0.92, 1.0];
            golpes.forEach(function (s, i) {
                ruido(c, d, t + s * k, 0.07 * k, {
                    vol: i % 2 ? 0.22 : 0.32, ataque: 0.012, caida: 0.05 * k,
                    filtros: [{ tipo: "bandpass", f: 5200, q: 1.4 }, { tipo: "highpass", f: 2600 }]
                });
            });
            return (golpes[golpes.length - 1] + 0.12) * k;
        },
        /** Timbre de bicicleta: "riiing riiing". */
        timbre: function (c, d, t, k, breve) {
            const grupos = breve ? [0] : [0, 0.55];
            grupos.forEach(function (g) {
                for (let i = 0; i < 7; i++) {
                    const s = t + (g + i * 0.045) * k;
                    osc(c, d, s, 0.18, { tipo: "sine", f: 2350, vol: 0.14, ataque: 0.002, caida: 0.16 });
                    osc(c, d, s, 0.14, { tipo: "sine", f: 3720, vol: 0.06, ataque: 0.002, caida: 0.12 });
                }
            });
            return (grupos[grupos.length - 1] + 0.5) * k;
        }
    };

    function detener() {
        if (!busEstimulo || !ctx) return;
        const bus = busEstimulo;
        busEstimulo = null;
        try {
            bus.gain.cancelScheduledValues(ctx.currentTime);
            bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime);
            bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
            setTimeout(function () { try { bus.disconnect(); } catch (e) { /* noop */ } }, 200);
        } catch (e) { /* noop */ }
    }

    function reproducir(nombre, o) {
        o = o || {};
        const fn = ESTIMULOS[nombre];
        const c = contexto();
        if (!fn || !c) return 0;
        detener();
        const bus = c.createGain();
        bus.gain.value = 1;
        bus.connect(c.destination);
        busEstimulo = bus;
        return fn(c, bus, c.currentTime + 0.03, o.lento ? 1.7 : 1, !!o.breve);
    }

    /* ── Efectos del juego ─────────────────────────────────────── */

    function nota(f, retraso, dur, vol, tipo) {
        const c = contexto();
        if (!c) return;
        osc(c, c.destination, c.currentTime + (retraso || 0), dur || 0.3, { tipo: tipo || "sine", f: f, vol: vol || 0.2, ataque: 0.01 });
    }

    function aplausos(dur) {
        const c = contexto();
        if (!c) return;
        const t = c.currentTime;
        const n = Math.round(dur * 34);
        for (let i = 0; i < n; i++) {
            const s = Math.pow(Math.random(), 0.8) * dur;
            ruido(c, c.destination, t + s, 0.035, { vol: 0.07 + Math.random() * 0.08, ataque: 0.002, caida: 0.03, filtros: [{ tipo: "bandpass", f: 900 + Math.random() * 1600, q: 1.1 }] });
        }
    }

    const EFECTOS = {
        recompensa: function () {
            [1047, 1319, 1568].forEach(function (f, i) { nota(f, i * 0.08, 0.35, 0.16); });
        },
        celebracion: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { nota(f, i * 0.1, 0.4, 0.16, "triangle"); });
            [1568, 2093, 2637].forEach(function (f, i) { nota(f, 0.45 + i * 0.06, 0.25, 0.06); });
        },
        victoria: function () {
            [392, 523, 659].forEach(function (f, i) { nota(f, i * 0.14, 0.24, 0.16, "triangle"); });
            [523, 659, 784, 1047].forEach(function (f) { nota(f, 0.46, 1.1, 0.1, "triangle"); });
            [2093, 2637, 3136].forEach(function (f, i) { nota(f, 0.6 + i * 0.07, 0.3, 0.05); });
        },
        aplausos: function () { aplausos(2.6); },
        suave: function () {
            nota(392, 0, 0.18, 0.12);
            nota(330, 0.16, 0.26, 0.1);
        },
        pop: function () { nota(880, 0, 0.09, 0.08); },
        magia: function () {
            for (let i = 0; i < 6; i++) nota(1568 + i * 220, i * 0.05, 0.2, 0.06);
        },
        chispas: function () {
            for (let i = 0; i < 5; i++) nota(2093 + (i % 2) * 400, i * 0.06, 0.15, 0.06);
        },
        ding: function () { nota(1568, 0, 0.6, 0.15); }
    };

    function sonar(nombre) {
        const fn = EFECTOS[nombre];
        if (!fn || !contexto()) return;
        fn();
    }

    function existe(nombre) {
        return !!(EFECTOS[nombre] || ESTIMULOS[nombre]);
    }

    function desbloquear() {
        contexto();
    }

    global.RepiteSecuenciaSfx = {
        reproducir: reproducir,
        detener: detener,
        sonar: sonar,
        existe: existe,
        desbloquear: desbloquear,
        ESTIMULOS: Object.keys(ESTIMULOS),
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
