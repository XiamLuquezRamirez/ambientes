/**
 * AsociaSonidoSfx — sonidos sintetizados con WebAudio (sin archivos).
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

    function filtrar(c, entrada, t0, filtros) {
        let salida = entrada;
        filtros.forEach(function (fdef) {
            const f = c.createBiquadFilter();
            f.type = fdef.tipo;
            f.Q.value = fdef.q || 1;
            const fc = fdef.curva || [[0, fdef.f]];
            f.frequency.setValueAtTime(fc[0][1], t0);
            for (let i = 1; i < fc.length; i++) f.frequency.exponentialRampToValueAtTime(fc[i][1], t0 + fc[i][0]);
            salida.connect(f);
            salida = f;
        });
        return salida;
    }

    function ganancia(g, t0, dur, o) {
        if (o.ganancia) {
            g.gain.setValueAtTime(0.0001, t0);
            o.ganancia.forEach(function (p) { g.gain.exponentialRampToValueAtTime(Math.max(0.0001, p[1]), t0 + p[0]); });
        } else {
            envolvente(g, t0, dur, o.vol || 0.3, o.ataque, o.caida);
        }
    }

    /** Oscilador con contorno de frecuencia [[t, f], ...] relativo a t0; `ganancia` opcional [[t, vol], ...]. */
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
        ganancia(g, t0, dur, o);
        filtrar(c, n, t0, o.filtros || []).connect(g).connect(dest);
        n.start(t0);
        n.stop(t0 + dur + 0.05);
    }

    /** Ruido filtrado; `ganancia` opcional [[t, vol], ...] para oleajes y ráfagas. */
    function ruido(c, dest, t0, dur, o) {
        const src = c.createBufferSource();
        src.buffer = ruidoBlanco(c);
        src.loop = true;
        const g = c.createGain();
        ganancia(g, t0, dur, Object.assign({ vol: 0.2 }, o));
        filtrar(c, src, t0, o.filtros || [{ tipo: "lowpass", f: 1200 }]).connect(g).connect(dest);
        src.start(t0, Math.random() * 3);
        src.stop(t0 + dur + 0.05);
    }

    /* ── Estímulos (el sonido que el niño debe asociar) ───────── */

    /** Palmada: golpe de ruido medio-agudo muy corto. */
    function palmada(c, d, t, vol) {
        const f = 1300 + Math.random() * 900;
        ruido(c, d, t, 0.06, { vol: vol, ataque: 0.002, caida: 0.05, filtros: [{ tipo: "bandpass", f: f, q: 1.1 }, { tipo: "highpass", f: 700 }] });
        ruido(c, d, t, 0.02, { vol: vol * 0.5, ataque: 0.001, caida: 0.018, filtros: [{ tipo: "bandpass", f: f * 2.1, q: 1.5 }] });
    }

    /** Golpe del martillo del despertador contra sus dos campanas. */
    function golpeCampanita(c, d, t, f, vol) {
        [[1, 0.5], [2.4, 0.22], [3.9, 0.1]].forEach(function (p) {
            osc(c, d, t, 0.12, { tipo: "sine", f: f * p[0], vol: vol * p[1], ataque: 0.002, caida: 0.11 });
        });
        ruido(c, d, t, 0.012, { vol: vol * 0.25, ataque: 0.001, caida: 0.01, filtros: [{ tipo: "highpass", f: 4000 }] });
    }

    /**
     * Cada estímulo recibe (contexto, destino, t0, k) donde k estira el tiempo (lento > 1)
     * y `breve` reduce el sonido a su primera parte. Devuelve la duración en segundos.
     */
    const ESTIMULOS = {
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
        },
        /** Teléfono de casa: trinos electrónicos "rrrin rrrin". */
        telefono: function (c, d, t, k, breve) {
            const timbres = breve ? [0] : [0, 1.25];
            const largo = 0.9 * k;
            timbres.forEach(function (s0) {
                const pasos = Math.floor(largo / 0.04);
                for (let i = 0; i < pasos; i++) {
                    const f = i % 2 ? 1250 : 1000;
                    osc(c, d, t + s0 * k + i * 0.04, 0.045, { tipo: "triangle", f: f, vol: 0.16, ataque: 0.003, caida: 0.01, filtros: [{ tipo: "lowpass", f: 3200 }] });
                }
            });
            return timbres[timbres.length - 1] * k + largo + 0.05;
        },
        /** Despertador de campanas: el martillo golpea muy rápido. */
        despertador: function (c, d, t, k, breve) {
            const rafagas = breve ? [[0, 0.9]] : [[0, 1.0], [1.25, 1.0]];
            rafagas.forEach(function (r) {
                const golpes = Math.floor((r[1] * k) / 0.055);
                for (let i = 0; i < golpes; i++) {
                    golpeCampanita(c, d, t + r[0] * k + i * 0.055, i % 2 ? 2100 : 2350, 0.2);
                }
            });
            const ult = rafagas[rafagas.length - 1];
            return (ult[0] + ult[1]) * k + 0.12;
        },
        /** Avión despegando: rugido que crece y turbina que sube de tono. */
        avion: function (c, d, t, k, breve) {
            const dur = (breve ? 1.6 : 3.2) * k;
            ruido(c, d, t, dur, {
                filtros: [{ tipo: "lowpass", q: 1.2, curva: [[0, 260], [dur * 0.7, 2200], [dur, 1500]] }],
                ganancia: [[dur * 0.15, 0.08], [dur * 0.7, 0.4], [dur, 0.0001]]
            });
            osc(c, d, t, dur, {
                tipo: "sawtooth", curva: [[0, 520], [dur * 0.8, 1700], [dur, 1500]],
                filtros: [{ tipo: "bandpass", f: 1800, q: 3 }],
                ganancia: [[dur * 0.2, 0.03], [dur * 0.75, 0.09], [dur, 0.0001]]
            });
            osc(c, d, t, dur, {
                tipo: "sine", curva: [[0, 70], [dur, 110]],
                ganancia: [[dur * 0.3, 0.2], [dur * 0.75, 0.35], [dur, 0.0001]]
            });
            return dur;
        },
        /** Sirena de ambulancia: el tono sube y baja varias veces. */
        sirena: function (c, d, t, k, breve) {
            const ciclos = breve ? 2 : 4;
            const ciclo = 0.75 * k;
            const curva = [[0, 650]];
            for (let i = 0; i < ciclos; i++) {
                curva.push([i * ciclo + ciclo * 0.5, 1450]);
                curva.push([(i + 1) * ciclo, 650]);
            }
            const dur = ciclos * ciclo;
            osc(c, d, t, dur, { tipo: "square", curva: curva, vol: 0.09, ataque: 0.05, caida: 0.1, filtros: [{ tipo: "lowpass", f: 2600 }] });
            osc(c, d, t, dur, { tipo: "sine", curva: curva, vol: 0.12, ataque: 0.05, caida: 0.1 });
            return dur + 0.05;
        },
        /** Puerta abriéndose: crujido de la bisagra (pulsos lentos que se aceleran). */
        puerta: function (c, d, t, k, breve) {
            const dur = (breve ? 0.9 : 1.6) * k;
            osc(c, d, t, dur, {
                tipo: "sawtooth", curva: [[0, 22], [dur * 0.5, 55], [dur, 34]],
                filtros: [{ tipo: "bandpass", q: 9, curva: [[0, 700], [dur * 0.5, 1300], [dur, 950]] }, { tipo: "highpass", f: 350 }],
                ganancia: [[dur * 0.1, 0.5], [dur * 0.5, 0.8], [dur * 0.85, 0.45], [dur, 0.0001]]
            });
            osc(c, d, t, dur, {
                tipo: "sawtooth", curva: [[0, 22], [dur * 0.5, 55], [dur, 34]],
                filtros: [{ tipo: "bandpass", q: 12, curva: [[0, 2100], [dur, 2600]] }],
                ganancia: [[dur * 0.1, 0.15], [dur * 0.6, 0.25], [dur, 0.0001]]
            });
            return dur + 0.05;
        },
        /** Aspiradora: el motor arranca y queda zumbando con aire aspirado. */
        aspiradora: function (c, d, t, k, breve) {
            const dur = (breve ? 1.3 : 2.6) * k;
            ruido(c, d, t, dur, {
                filtros: [{ tipo: "bandpass", q: 0.9, curva: [[0, 900], [dur * 0.3, 3200], [dur, 3000]] }],
                ganancia: [[dur * 0.3, 0.32], [dur * 0.85, 0.3], [dur, 0.0001]]
            });
            osc(c, d, t, dur, {
                tipo: "sawtooth", curva: [[0, 90], [dur * 0.3, 420], [dur, 410]],
                filtros: [{ tipo: "lowpass", f: 1500 }],
                ganancia: [[dur * 0.3, 0.1], [dur * 0.85, 0.09], [dur, 0.0001]]
            });
            return dur;
        },
        /** Aplausos de varias personas. */
        aplausos: function (c, d, t, k, breve) {
            const dur = (breve ? 1.2 : 2.2) * k;
            const n = Math.round(dur * 30);
            for (let i = 0; i < n; i++) {
                const s = Math.random() * (dur - 0.08);
                palmada(c, d, t + s, 0.14 + Math.random() * 0.14);
            }
            return dur;
        },
        /** Agua saliendo de la pluma: chorro continuo con burbujas. */
        grifo: function (c, d, t, k, breve) {
            const dur = (breve ? 1.2 : 2.4) * k;
            ruido(c, d, t, dur, {
                filtros: [{ tipo: "bandpass", f: 2200, q: 0.7 }, { tipo: "lowpass", f: 6500 }],
                ganancia: [[0.15, 0.3], [dur * 0.5, 0.26], [dur * 0.85, 0.3], [dur, 0.0001]]
            });
            ruido(c, d, t, dur, { vol: 0.12, ataque: 0.15, caida: 0.2, filtros: [{ tipo: "lowpass", f: 450 }] });
            const burbujas = Math.round(dur * 14);
            for (let i = 0; i < burbujas; i++) {
                const s = 0.1 + Math.random() * (dur - 0.25);
                const f = 500 + Math.random() * 700;
                osc(c, d, t + s, 0.05, { tipo: "sine", vol: 0.05 + Math.random() * 0.04, ataque: 0.004, caida: 0.04, curva: [[0, f], [0.05, f * 1.7]] });
            }
            return dur;
        },
        /** Teléfono vibrando sobre la mesa: "bzz bzz". */
        vibracion: function (c, d, t, k, breve) {
            const pulsos = breve ? [0, 0.6] : [0, 0.6, 1.5, 2.1];
            const largo = 0.42 * k;
            pulsos.forEach(function (s) {
                osc(c, d, t + s * k, largo, { tipo: "square", f: 165, vol: 0.2, ataque: 0.02, caida: 0.04, vibrato: [32, 9], filtros: [{ tipo: "lowpass", f: 900 }] });
                ruido(c, d, t + s * k, largo, { vol: 0.05, ataque: 0.02, caida: 0.04, filtros: [{ tipo: "bandpass", f: 330, q: 4 }] });
            });
            return pulsos[pulsos.length - 1] * k + largo + 0.05;
        },
        /** "Chu-chu" de la locomotora y su silbato. */
        tren: function (c, d, t, k, breve) {
            const chu = breve ? 4 : 8;
            for (let i = 0; i < chu; i++) {
                ruido(c, d, t + i * 0.2 * k, 0.16 * k, {
                    vol: i % 2 ? 0.16 : 0.26, ataque: 0.015, caida: 0.12 * k,
                    filtros: [{ tipo: "bandpass", f: 900, q: 0.8 }, { tipo: "lowpass", f: 2400 }]
                });
            }
            const silbato = chu * 0.2 * k;
            const dur = (breve ? 0.55 : 0.9) * k;
            [[740, 0.13], [932, 0.1]].forEach(function (p) {
                osc(c, d, t + silbato, dur, { tipo: "triangle", f: p[0], vol: p[1], ataque: 0.05, caida: 0.15, vibrato: [6, 5] });
            });
            ruido(c, d, t + silbato, dur, { vol: 0.04, ataque: 0.05, caida: 0.15, filtros: [{ tipo: "bandpass", f: 2000, q: 2 }] });
            return silbato + dur + 0.05;
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

    global.AsociaSonidoSfx = {
        reproducir: reproducir,
        detener: detener,
        sonar: sonar,
        existe: existe,
        desbloquear: desbloquear,
        ESTIMULOS: Object.keys(ESTIMULOS),
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
