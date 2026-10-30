/**
 * DescubreInstrumentoSfx — instrumentos y efectos sintetizados con WebAudio (sin archivos).
 * Provisionales: si config.audios.sonidos[instrumento] o config.audios.efectos[nombre] tienen ruta,
 * el juego usa esa grabación en lugar de la síntesis.
 *
 * tocar(instrumento) suena su frase característica ("¡Tum!", "¡Pa-pa-pa!", "¡Booooom-prum!"...).
 * nota(instrumento, "do5", seg) / acorde(instrumento, [...], seg) / golpe(instrumento, fuerte)
 * tocan el arreglo de las canciones. sonar(efecto, arg) suena un efecto corto del juego.
 * Todo pasa por un bus maestro: detener() lo corta.
 */
(function (global) {
    "use strict";

    let ctx = null;
    let ruidoBuffer = null;
    let bus = null;

    const SEMITONOS = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };
    const NOTAS = {};
    for (let oct = 1; oct <= 7; oct++) {
        Object.keys(SEMITONOS).forEach(function (n) {
            const midi = 12 * (oct + 1) + SEMITONOS[n];
            NOTAS[n + oct] = 440 * Math.pow(2, (midi - 69) / 12);
        });
    }

    function contexto() {
        const Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function salida(c) {
        if (!bus) {
            bus = c.createGain();
            bus.gain.value = 1;
            bus.connect(c.destination);
        }
        return bus;
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
        let s = entrada;
        filtros.forEach(function (fdef) {
            const f = c.createBiquadFilter();
            f.type = fdef.tipo;
            f.Q.value = fdef.q || 1;
            const fc = fdef.curva || [[0, fdef.f]];
            f.frequency.setValueAtTime(fc[0][1], t0);
            for (let i = 1; i < fc.length; i++) f.frequency.exponentialRampToValueAtTime(fc[i][1], t0 + fc[i][0]);
            s.connect(f);
            s = f;
        });
        return s;
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
        if (o.detune) n.detune.value = o.detune;
        if (o.vibrato) {
            const lfo = c.createOscillator();
            const lg = c.createGain();
            lfo.frequency.value = o.vibrato[0];
            lg.gain.setValueAtTime(0, t0);
            lg.gain.linearRampToValueAtTime(o.vibrato[1], t0 + Math.min(0.25, dur / 2));
            lfo.connect(lg).connect(n.frequency);
            lfo.start(t0);
            lfo.stop(t0 + dur + 0.05);
        }
        ganancia(g, t0, dur, o);
        filtrar(c, n, t0, o.filtros || []).connect(g).connect(dest);
        n.start(t0);
        n.stop(t0 + dur + 0.05);
    }

    /** Ruido filtrado; `ganancia` opcional [[t, vol], ...] para ráfagas. */
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

    function hz(nombre) {
        return NOTAS[nombre] || 440;
    }

    /* ── Voces de los instrumentos ─────────────────────────────── */

    const VOCES = {
        guitarra: function (c, d, t, f, dur) {
            const largo = Math.max(0.6, dur);
            osc(c, d, t, largo, { tipo: "sawtooth", f: f, vol: 0.16, ataque: 0.004, caida: largo - 0.01, filtros: [{ tipo: "lowpass", q: 1.5, curva: [[0, 3800], [0.25, 900], [largo, 450]] }] });
            osc(c, d, t, largo * 0.8, { tipo: "triangle", f: f * 2, vol: 0.05, ataque: 0.004, caida: largo * 0.8 - 0.01 });
            ruido(c, d, t, 0.02, { vol: 0.05, ataque: 0.001, caida: 0.018, filtros: [{ tipo: "highpass", f: 2500 }] });
        },
        violin: function (c, d, t, f, dur) {
            [0, 7].forEach(function (det) {
                osc(c, d, t, dur, { tipo: "sawtooth", f: f, detune: det, vol: 0.07, ataque: 0.09, caida: Math.min(0.18, dur / 2), vibrato: [5.6, f * 0.007], filtros: [{ tipo: "highpass", f: 260 }, { tipo: "lowpass", f: 3600 }] });
            });
            ruido(c, d, t, dur, { vol: 0.012, ataque: 0.08, caida: 0.1, filtros: [{ tipo: "bandpass", f: f * 2, q: 4 }] });
        },
        contrabajo: function (c, d, t, f, dur) {
            osc(c, d, t, dur, { tipo: "sawtooth", f: f, vol: 0.34, ataque: 0.04, caida: dur * 0.5, vibrato: [4.2, f * 0.01], filtros: [{ tipo: "lowpass", q: 1.4, curva: [[0, 900], [dur, 380]] }] });
            osc(c, d, t, dur, { tipo: "sine", f: f * 2, vol: 0.22, ataque: 0.04, caida: dur * 0.5 });
            ruido(c, d, t, 0.05, { vol: 0.08, ataque: 0.002, caida: 0.04, filtros: [{ tipo: "lowpass", f: 600 }] });
        },
        trompeta: function (c, d, t, f, dur) {
            osc(c, d, t, dur, { tipo: "sawtooth", f: f, vol: 0.12, ataque: 0.03, caida: Math.min(0.08, dur / 3), vibrato: dur > 0.3 ? [5.2, f * 0.005] : null, filtros: [{ tipo: "lowpass", q: 2, curva: [[0, 500], [0.05, 2800], [dur, 1700]] }] });
            osc(c, d, t, dur, { tipo: "square", f: f, vol: 0.03, ataque: 0.03, caida: Math.min(0.08, dur / 3), filtros: [{ tipo: "lowpass", f: 2200 }] });
        },
        flauta: function (c, d, t, f, dur) {
            osc(c, d, t, dur, { tipo: "sine", f: f, vol: 0.18, ataque: 0.06, caida: Math.min(0.12, dur / 2), vibrato: [5, f * 0.006] });
            osc(c, d, t, dur, { tipo: "triangle", f: f * 2, vol: 0.025, ataque: 0.06, caida: Math.min(0.12, dur / 2) });
            ruido(c, d, t, dur, { vol: 0.03, ataque: 0.05, caida: Math.min(0.12, dur / 2), filtros: [{ tipo: "bandpass", f: f * 1.5, q: 2 }] });
        },
        flautaTubos: function (c, d, t, f, dur) {
            osc(c, d, t, dur, { tipo: "sine", vol: 0.2, ataque: 0.04, caida: Math.min(0.15, dur / 2), curva: [[0, f * 0.97], [0.06, f]], vibrato: [4.5, f * 0.004] });
            ruido(c, d, t, dur, { vol: 0.06, ataque: 0.03, caida: Math.min(0.15, dur / 2), filtros: [{ tipo: "bandpass", f: f * 1.2, q: 1.5 }] });
            ruido(c, d, t, 0.08, { vol: 0.05, ataque: 0.01, caida: 0.06, filtros: [{ tipo: "highpass", f: 3000 }] });
        }
    };

    function golpeTambor(c, d, t, fuerte) {
        osc(c, d, t, 0.38, { tipo: "sine", vol: fuerte ? 0.85 : 0.6, ataque: 0.003, caida: 0.36, curva: [[0, 170], [0.3, 55]] });
        osc(c, d, t, 0.14, { tipo: "triangle", vol: 0.12, ataque: 0.003, caida: 0.12, curva: [[0, 340], [0.14, 170]] });
        ruido(c, d, t, 0.06, { vol: 0.22, ataque: 0.002, caida: 0.05, filtros: [{ tipo: "lowpass", f: 900 }] });
    }

    function golpePlatillos(c, d, t, fuerte) {
        const dur = fuerte ? 1.4 : 0.12;
        ruido(c, d, t, dur, { vol: fuerte ? 0.2 : 0.05, ataque: 0.002, caida: dur - 0.01, filtros: [{ tipo: "highpass", f: 5000 }] });
        if (fuerte) ruido(c, d, t, dur * 0.8, { vol: 0.08, ataque: 0.002, caida: dur * 0.8 - 0.01, filtros: [{ tipo: "bandpass", f: 8200, q: 3 }] });
    }

    function sacudidaMaracas(c, d, t, golpes) {
        golpes.forEach(function (s, i) {
            ruido(c, d, t + s, 0.07, {
                vol: i % 2 ? 0.22 : 0.32, ataque: 0.012, caida: 0.05,
                filtros: [{ tipo: "bandpass", f: 5200, q: 1.4 }, { tipo: "highpass", f: 2600 }]
            });
        });
    }

    /** Frase característica de cada instrumento. Devuelve la duración en segundos. */
    const FRASES = {
        tambor: function (c, d, t) {
            golpeTambor(c, d, t, true);
            return 0.4;
        },
        guitarra: function (c, d, t) {
            ["do3", "mi3", "sol3", "do4", "mi4"].forEach(function (n, i) { VOCES.guitarra(c, d, t + i * 0.03, hz(n), 1.4); });
            return 1.5;
        },
        flautaTubos: function (c, d, t, o) {
            VOCES.flautaTubos(c, d, t, hz(o.nota || "do5"), 0.6);
            return 0.6;
        },
        violin: function (c, d, t) {
            VOCES.violin(c, d, t, hz("la5"), 0.55);
            VOCES.violin(c, d, t + 0.62, hz("la5"), 0.38);
            return 1.05;
        },
        trompeta: function (c, d, t) {
            [["sol4", 0, 0.15], ["sol4", 0.2, 0.15], ["do5", 0.4, 0.45]].forEach(function (n) { VOCES.trompeta(c, d, t + n[1], hz(n[0]), n[2]); });
            return 0.9;
        },
        flauta: function (c, d, t) {
            [["re6", 0, 0.22], ["mi6", 0.24, 0.22], ["sol6", 0.48, 0.5]].forEach(function (n) { VOCES.flauta(c, d, t + n[1], hz(n[0]), n[2]); });
            return 1.0;
        },
        platillos: function (c, d, t) {
            golpePlatillos(c, d, t, true);
            return 1.4;
        },
        contrabajo: function (c, d, t) {
            VOCES.contrabajo(c, d, t, hz("mi1"), 1.15);
            VOCES.contrabajo(c, d, t + 1.2, hz("la1"), 0.4);
            return 1.65;
        },
        maracas: function (c, d, t) {
            sacudidaMaracas(c, d, t, [0, 0.16, 0.42, 0.58, 0.84]);
            return 1.0;
        }
    };

    function tocar(instrumento, o) {
        o = o || {};
        const fn = FRASES[instrumento];
        const c = contexto();
        if (!fn || !c) return 0;
        return fn(c, salida(c), c.currentTime + 0.02, o);
    }

    function nota(instrumento, nombre, seg) {
        const c = contexto();
        if (!c) return;
        const d = salida(c);
        const t = c.currentTime + 0.01;
        if (instrumento === "tambor") { golpeTambor(c, d, t, true); return; }
        if (instrumento === "platillos") { golpePlatillos(c, d, t, true); return; }
        const voz = VOCES[instrumento];
        if (voz) voz(c, d, t, hz(nombre), Math.max(0.12, seg || 0.4));
    }

    /** Guitarra: rasgueo de las notas. Trompeta: "pa-pa" con el acorde. Otros: notas juntas. */
    function acorde(instrumento, notas, seg) {
        const c = contexto();
        if (!c) return;
        const d = salida(c);
        const t = c.currentTime + 0.01;
        const dur = Math.max(0.3, seg || 1);
        if (instrumento === "guitarra") {
            notas.forEach(function (n, i) { VOCES.guitarra(c, d, t + i * 0.025, hz(n), dur); });
        } else if (instrumento === "trompeta") {
            [0, dur / 2].forEach(function (s) {
                notas.forEach(function (n) { VOCES.trompeta(c, d, t + s, hz(n) * 2, 0.22); });
            });
        } else if (VOCES[instrumento]) {
            notas.forEach(function (n) { VOCES[instrumento](c, d, t, hz(n), dur); });
        }
    }

    function golpe(instrumento, fuerte) {
        const c = contexto();
        if (!c) return;
        const d = salida(c);
        const t = c.currentTime + 0.01;
        if (instrumento === "platillos") golpePlatillos(c, d, t, !!fuerte);
        else if (instrumento === "maracas") sacudidaMaracas(c, d, t, [0, 0.12]);
        else golpeTambor(c, d, t, !!fuerte);
    }

    /* ── Efectos del juego ─────────────────────────────────────── */

    function tono(f, retraso, dur, vol, tipo) {
        const c = contexto();
        if (!c) return;
        osc(c, salida(c), c.currentTime + (retraso || 0), dur || 0.3, { tipo: tipo || "sine", f: f, vol: vol || 0.2, ataque: 0.01 });
    }

    function aplausos(dur) {
        const c = contexto();
        if (!c) return;
        const t = c.currentTime;
        const n = Math.round(dur * 40);
        for (let i = 0; i < n; i++) {
            const s = Math.pow(Math.random(), 0.8) * dur;
            ruido(c, salida(c), t + s, 0.035, { vol: 0.07 + Math.random() * 0.08, ataque: 0.002, caida: 0.03, filtros: [{ tipo: "bandpass", f: 900 + Math.random() * 1600, q: 1.1 }] });
        }
    }

    const EFECTOS = {
        recompensa: function () {
            [1047, 1319, 1568].forEach(function (f, i) { tono(f, i * 0.08, 0.35, 0.16); });
        },
        celebracion: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.1, 0.4, 0.16, "triangle"); });
            [1568, 2093, 2637].forEach(function (f, i) { tono(f, 0.45 + i * 0.06, 0.25, 0.06); });
        },
        victoria: function () {
            [392, 523, 659].forEach(function (f, i) { tono(f, i * 0.14, 0.24, 0.16, "triangle"); });
            [523, 659, 784, 1047].forEach(function (f) { tono(f, 0.46, 1.1, 0.1, "triangle"); });
        },
        aplausos: function () { aplausos(3); },
        suave: function () {
            tono(392, 0, 0.18, 0.12);
            tono(330, 0.16, 0.26, 0.1);
        },
        pop: function () { tono(880, 0, 0.09, 0.08); },
        chispas: function () {
            for (let i = 0; i < 5; i++) tono(2093 + (i % 2) * 400, i * 0.06, 0.15, 0.06);
        },
        /** Papel de regalo que se rompe. */
        papel: function () {
            const c = contexto();
            if (!c) return;
            const f = 2200 + Math.random() * 1800;
            ruido(c, salida(c), c.currentTime, 0.12, { vol: 0.14, ataque: 0.004, caida: 0.1, filtros: [{ tipo: "bandpass", q: 1.2, curva: [[0, f], [0.12, f * 1.8]] }] });
        },
        /** La caja se abre con un salto. */
        boing: function () {
            const c = contexto();
            if (!c) return;
            osc(c, salida(c), c.currentTime, 0.5, { tipo: "sine", vol: 0.22, ataque: 0.01, caida: 0.35, curva: [[0, 220], [0.12, 660], [0.5, 440]] });
            osc(c, salida(c), c.currentTime, 0.5, { tipo: "triangle", vol: 0.06, ataque: 0.01, caida: 0.35, curva: [[0, 440], [0.12, 1320], [0.5, 880]] });
        },
        /** El instrumento encaja en su estuche: clic perfecto. */
        clic: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.025, { vol: 0.25, ataque: 0.001, caida: 0.02, filtros: [{ tipo: "bandpass", f: 3000, q: 2 }] });
            tono(1760, 0.03, 0.12, 0.1);
            tono(2349, 0.08, 0.16, 0.08);
        },
        /** Broche brillante de los estuches. */
        broche: function () {
            tono(2093, 0, 0.5, 0.1);
            tono(3136, 0.05, 0.6, 0.06);
        },
        /** "¡Tadaa!" de celebración. */
        fanfarria: function () {
            const c = contexto();
            if (!c) return;
            const d = salida(c);
            const t = c.currentTime + 0.02;
            ["sol4", "do5"].forEach(function (n) { VOCES.trompeta(c, d, t, hz(n), 0.16); });
            ["do5", "mi5", "sol5"].forEach(function (n) { VOCES.trompeta(c, d, t + 0.2, hz(n), 0.9); });
            golpePlatillos(c, d, t + 0.2, true);
        },
        burbujas: function () {
            const c = contexto();
            if (!c) return;
            for (let i = 0; i < 6; i++) {
                const f = 500 + Math.random() * 600;
                osc(c, salida(c), c.currentTime + i * 0.07, 0.08, { tipo: "sine", vol: 0.07, ataque: 0.004, caida: 0.07, curva: [[0, f], [0.08, f * 2]] });
            }
        },
        /** El pajarito canta feliz. */
        trino: function () {
            const c = contexto();
            if (!c) return;
            [0, 0.8].forEach(function (f0) {
                for (let i = 0; i < 5; i++) {
                    osc(c, salida(c), c.currentTime + f0 + i * 0.12, 0.1, { tipo: "sine", vol: 0.16, ataque: 0.008, caida: 0.06, curva: [[0, 2900], [0.04, 4300], [0.1, 3100]], vibrato: [45, 180] });
                }
            });
        },
        /** Se enciende la luz cenital sobre el instrumento. */
        luz: function () {
            const c = contexto();
            if (!c) return;
            ruido(c, salida(c), c.currentTime, 0.4, { vol: 0.05, ataque: 0.05, caida: 0.3, filtros: [{ tipo: "bandpass", q: 2, curva: [[0, 600], [0.4, 3000]] }] });
            tono(1568, 0.05, 0.4, 0.05);
        },
        /** Rebote suave cuando el instrumento no va en esa zona. */
        rebote: function () {
            const c = contexto();
            if (!c) return;
            osc(c, salida(c), c.currentTime, 0.25, { tipo: "sine", vol: 0.14, ataque: 0.01, caida: 0.2, curva: [[0, 330], [0.1, 220], [0.25, 260]] });
        }
    };

    function sonar(nombre, arg) {
        const fn = EFECTOS[nombre];
        if (!fn || !contexto()) return;
        fn(arg);
    }

    function detener() {
        if (!bus || !ctx) return;
        const viejo = bus;
        bus = null;
        try {
            viejo.gain.cancelScheduledValues(ctx.currentTime);
            viejo.gain.setValueAtTime(viejo.gain.value, ctx.currentTime);
            viejo.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
            setTimeout(function () { try { viejo.disconnect(); } catch (e) { /* noop */ } }, 200);
        } catch (e) { /* noop */ }
    }

    function existe(nombre) {
        return !!(EFECTOS[nombre] || FRASES[nombre]);
    }

    function desbloquear() {
        contexto();
    }

    global.DescubreInstrumentoSfx = {
        tocar: tocar,
        nota: nota,
        acorde: acorde,
        golpe: golpe,
        sonar: sonar,
        detener: detener,
        existe: existe,
        desbloquear: desbloquear,
        NOTAS: Object.keys(NOTAS),
        INSTRUMENTOS: Object.keys(FRASES),
        VOCES: Object.keys(VOCES),
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
