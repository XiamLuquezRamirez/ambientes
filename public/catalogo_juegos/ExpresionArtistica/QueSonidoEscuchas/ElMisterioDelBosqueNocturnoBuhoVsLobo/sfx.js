/**
 * QueSonidoArteSfx — sonidos sintetizados con WebAudio (sin archivos).
 * Provisionales: si config.audios.sonidos[nombre] o config.audios.efectos[nombre] tienen ruta,
 * el juego usa esa grabación en lugar de la síntesis.
 *
 * reproducirCapas([{ nombre, retraso, activa }], { lento, breve }) suena una pista por capa
 * (detiene la anterior) y devuelve { duracion, activar(i, on) } para pausar/activar capas en vivo.
 * reproducir(nombre, o) es una sola capa y devuelve su duración en segundos.
 * tocar(nombre, { vol, maxDur }) suena un estímulo sin cortar los demás (concierto final).
 * sonar(nombre, arg) suena un efecto corto del juego.
 */
(function (global) {
    "use strict";

    let ctx = null;
    let ruidoBuffer = null;
    let busEstimulo = null;
    let busConcierto = null;

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

    function pio(c, d, t) {
        osc(c, d, t, 0.1, {
            tipo: "sine", vol: 0.22, ataque: 0.008, caida: 0.06,
            curva: [[0, 2900], [0.04, 4300], [0.1, 3100]],
            vibrato: [45, 180]
        });
    }

    /** "Huu" del búho: tono grave y suave con un armónico apagado. */
    function hu(c, d, t, dur, f, vol) {
        osc(c, d, t, dur, { tipo: "sine", vol: vol, ataque: dur * 0.3, caida: dur * 0.5, curva: [[0, f * 1.04], [dur * 0.4, f], [dur, f * 0.9]], vibrato: [5, 3] });
        osc(c, d, t, dur, { tipo: "triangle", vol: vol * 0.25, ataque: dur * 0.3, caida: dur * 0.5, curva: [[0, f * 2.08], [dur, f * 1.8]], filtros: [{ tipo: "lowpass", f: 900 }] });
        ruido(c, d, t, dur, { vol: vol * 0.08, ataque: dur * 0.3, caida: dur * 0.5, filtros: [{ tipo: "bandpass", f: f * 2, q: 3 }] });
    }

    /* ── Estímulos (el sonido que el niño debe reconocer) ─────── */

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
        trino: function (c, d, t, k, breve) {
            const frases = breve ? [0] : [0, 0.85];
            frases.forEach(function (f0) {
                for (let i = 0; i < 5; i++) pio(c, d, t + (f0 + i * 0.12) * k);
            });
            return (frases[frases.length - 1] + 0.7) * k;
        },
        /** Agua saliendo de la llave: chorro continuo con burbujas. */
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
        /** Tren de la ciudad: rodar grave y el "ta-tac" rítmico de las ruedas sobre los rieles. */
        tren: function (c, d, t, k, breve) {
            const dur = (breve ? 1.6 : 3.4) * k;
            ruido(c, d, t, dur, {
                filtros: [{ tipo: "lowpass", f: 320, q: 0.8 }],
                ganancia: [[dur * 0.15, 0.3], [dur * 0.85, 0.32], [dur, 0.0001]]
            });
            ruido(c, d, t, dur, {
                filtros: [{ tipo: "bandpass", f: 1400, q: 1.2 }],
                ganancia: [[dur * 0.2, 0.05], [dur * 0.8, 0.06], [dur, 0.0001]]
            });
            const paso = 0.42 * k;
            for (let s = 0.08; s < dur - 0.2; s += paso) {
                [0, 0.11 * k].forEach(function (dt, j) {
                    ruido(c, d, t + s + dt, 0.05, { vol: j ? 0.22 : 0.3, ataque: 0.002, caida: 0.045, filtros: [{ tipo: "bandpass", f: j ? 2600 : 1900, q: 2.5 }] });
                    osc(c, d, t + s + dt, 0.06, { tipo: "triangle", f: j ? 180 : 140, vol: 0.18, ataque: 0.002, caida: 0.05 });
                });
            }
            return dur;
        },
        /** Campana del cruce del tren: "ding-ding" alternando dos tonos. */
        campanaCruce: function (c, d, t, k, breve) {
            const golpes = breve ? 3 : 6;
            for (let i = 0; i < golpes; i++) {
                const s = t + i * 0.5 * k;
                [[1, 0.16], [2.76, 0.06], [5.4, 0.03]].forEach(function (p) {
                    osc(c, d, s, 0.45, { tipo: "sine", f: (i % 2 ? 1180 : 1320) * p[0], vol: p[1], ataque: 0.002, caida: 0.44 });
                });
            }
            return (golpes - 1) * 0.5 * k + 0.45;
        },
        /** Búho a lo lejos: "huu... hu-huuu", grave y prolongado, con un eco suave. */
        buho: function (c, d, t, k, breve) {
            const notas = breve
                ? [[0, 0.55], [0.75, 0.3], [1.1, 0.7]]
                : [[0, 0.55], [0.75, 0.3], [1.1, 0.7], [2.4, 0.55], [3.15, 0.3], [3.5, 0.8]];
            notas.forEach(function (n) {
                hu(c, d, t + n[0] * k, n[1] * k, 340, 0.34);
                hu(c, d, t + (n[0] + 0.18) * k, n[1] * k, 340, 0.08);
            });
            const ult = notas[notas.length - 1];
            return (ult[0] + ult[1] + 0.18) * k + 0.05;
        },
        /** Viento silbando en ráfagas. */
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
        /** Trueno: un chasquido y un estruendo profundo que retumba. */
        trueno: function (c, d, t, k, breve) {
            const dur = (breve ? 1.8 : 3.0) * k;
            ruido(c, d, t, 0.25, { vol: 0.5, ataque: 0.005, caida: 0.22, filtros: [{ tipo: "lowpass", f: 3500 }] });
            ruido(c, d, t + 0.05, dur, {
                filtros: [{ tipo: "lowpass", q: 0.7, curva: [[0, 900], [dur * 0.3, 260], [dur, 90]] }],
                ganancia: [[0.12, 0.9], [dur * 0.25, 0.5], [dur * 0.4, 0.75], [dur * 0.6, 0.35], [dur * 0.75, 0.45], [dur, 0.0001]]
            });
            osc(c, d, t, dur, { tipo: "sine", curva: [[0, 70], [dur, 38]], ganancia: [[0.1, 0.5], [dur * 0.5, 0.3], [dur, 0.0001]] });
            return dur + 0.1;
        }
    };

    function apagarBus(bus) {
        if (!bus || !ctx) return;
        try {
            bus.gain.cancelScheduledValues(ctx.currentTime);
            bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime);
            bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
            setTimeout(function () { try { bus.disconnect(); } catch (e) { /* noop */ } }, 200);
        } catch (e) { /* noop */ }
    }

    function detener() {
        apagarBus(busEstimulo);
        busEstimulo = null;
        apagarBus(busConcierto);
        busConcierto = null;
    }

    const SIN_PISTA = { duracion: 0, activar: function () {} };

    function reproducirCapas(capas, o) {
        o = o || {};
        const c = contexto();
        if (!c) return SIN_PISTA;
        apagarBus(busEstimulo);
        const master = c.createGain();
        master.gain.value = 1;
        master.connect(c.destination);
        busEstimulo = master;
        const t0 = c.currentTime + 0.03;
        const k = o.lento ? 1.7 : 1;
        let duracion = 0;
        const buses = (capas || []).map(function (cap) {
            const g = c.createGain();
            g.gain.value = cap.activa === false ? 0 : 1;
            g.connect(master);
            const fn = ESTIMULOS[cap.nombre];
            const retraso = Math.max(0, cap.retraso || 0);
            const d = fn ? fn(c, g, t0 + retraso, k, !!o.breve) : 0;
            duracion = Math.max(duracion, retraso + d);
            return g;
        });
        return {
            duracion: duracion,
            activar: function (i, on) {
                const g = buses[i];
                if (!g || busEstimulo !== master) return;
                try {
                    g.gain.cancelScheduledValues(c.currentTime);
                    g.gain.setValueAtTime(g.gain.value, c.currentTime);
                    g.gain.linearRampToValueAtTime(on ? 1 : 0, c.currentTime + 0.08);
                } catch (e) { /* noop */ }
            }
        };
    }

    function reproducir(nombre, o) {
        return reproducirCapas([{ nombre: nombre }], o).duracion;
    }

    function tocar(nombre, o) {
        o = o || {};
        const fn = ESTIMULOS[nombre];
        const c = contexto();
        if (!fn || !c) return 0;
        if (!busConcierto) {
            busConcierto = c.createGain();
            busConcierto.gain.value = 1;
            busConcierto.connect(c.destination);
        }
        const g = c.createGain();
        const t0 = c.currentTime + 0.02;
        const vol = o.vol != null ? o.vol : 0.75;
        g.gain.setValueAtTime(vol, t0);
        g.connect(busConcierto);
        let dur = fn(c, g, t0, 1, o.breve !== false);
        if (o.maxDur && dur > o.maxDur) {
            g.gain.setValueAtTime(vol, t0 + o.maxDur - 0.15);
            g.gain.linearRampToValueAtTime(0, t0 + o.maxDur);
            dur = o.maxDur;
        }
        setTimeout(function () { try { g.disconnect(); } catch (e) { /* noop */ } }, (dur + 0.5) * 1000);
        return dur;
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

    const PENTATONICA = [1047, 1175, 1319, 1568, 1760, 2093];

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
        /** La pista se pausa con un zumbido suave (error en la consola). */
        zumbido: function () {
            const c = contexto();
            if (!c) return;
            osc(c, c.destination, c.currentTime, 0.45, { tipo: "square", f: 110, vol: 0.07, ataque: 0.03, caida: 0.2, vibrato: [18, 4], filtros: [{ tipo: "lowpass", f: 520 }] });
        },
        pop: function () { nota(880, 0, 0.09, 0.08); },
        /** Gotita que cae al lavabo y suena como una nota de la escala pentatónica. */
        gota: function (i) {
            const c = contexto();
            if (!c) return;
            const f = PENTATONICA[Math.abs(i || 0) % PENTATONICA.length];
            osc(c, c.destination, c.currentTime, 0.08, { tipo: "sine", vol: 0.08, ataque: 0.003, caida: 0.07, curva: [[0, f * 0.6], [0.08, f * 1.2]] });
            nota(f, 0.02, 0.45, 0.1, "triangle");
        },
        /** Silbato largo del tren. */
        silbato: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [[554, 0.1], [659, 0.09], [831, 0.07]].forEach(function (p) {
                osc(c, c.destination, t, 1.6, { tipo: "triangle", f: p[0], vol: p[1], ataque: 0.12, caida: 0.4, vibrato: [5, 4] });
            });
            ruido(c, c.destination, t, 1.6, { vol: 0.03, ataque: 0.12, caida: 0.4, filtros: [{ tipo: "bandpass", f: 2200, q: 2 }] });
        },
        /** Rayo: chasquido eléctrico y el estruendo del trueno. */
        rayo: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.12, { vol: 0.35, ataque: 0.002, caida: 0.1, filtros: [{ tipo: "highpass", f: 2500 }] });
            osc(c, c.destination, t, 0.3, { tipo: "sawtooth", vol: 0.08, ataque: 0.002, caida: 0.25, curva: [[0, 1800], [0.3, 90]], filtros: [{ tipo: "lowpass", f: 3000 }] });
            ESTIMULOS.trueno(c, c.destination, t + 0.08, 1, true);
        },
        /** Base rítmica del concierto final. */
        bombo: function () {
            const c = contexto();
            if (!c) return;
            osc(c, c.destination, c.currentTime, 0.32, { tipo: "sine", vol: 0.55, ataque: 0.003, caida: 0.3, curva: [[0, 150], [0.28, 50]] });
        },
        caja: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.16, { vol: 0.18, ataque: 0.002, caida: 0.14, filtros: [{ tipo: "bandpass", f: 1800, q: 0.8 }] });
            osc(c, c.destination, c.currentTime, 0.1, { tipo: "triangle", f: 220, vol: 0.12, ataque: 0.002, caida: 0.09 });
        },
        platillo: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, c.destination, c.currentTime, 0.08, { vol: 0.06, ataque: 0.001, caida: 0.07, filtros: [{ tipo: "highpass", f: 7000 }] });
        },
        magia: function () {
            for (let i = 0; i < 6; i++) nota(1568 + i * 220, i * 0.05, 0.2, 0.06);
        },
        chispas: function () {
            for (let i = 0; i < 5; i++) nota(2093 + (i % 2) * 400, i * 0.06, 0.15, 0.06);
        },
        ding: function () { nota(1568, 0, 0.6, 0.15); }
    };

    function sonar(nombre, arg) {
        const fn = EFECTOS[nombre];
        if (!fn || !contexto()) return;
        fn(arg);
    }

    function existe(nombre) {
        return !!(EFECTOS[nombre] || ESTIMULOS[nombre]);
    }

    function desbloquear() {
        contexto();
    }

    global.QueSonidoArteSfx = {
        reproducir: reproducir,
        reproducirCapas: reproducirCapas,
        tocar: tocar,
        detener: detener,
        sonar: sonar,
        existe: existe,
        desbloquear: desbloquear,
        ESTIMULOS: Object.keys(ESTIMULOS),
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
