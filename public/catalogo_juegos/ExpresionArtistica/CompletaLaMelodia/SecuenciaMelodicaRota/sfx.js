/**
 * CompletaMelodiaSfx — timbre, xilófono, tren y acordes con WebAudio (sin archivos).
 * tocar(evento, timbre) suena una nota o un golpe. sonar(nombre) suena un efecto.
 */
(function (global) {
    "use strict";

    let ctx = null;
    let ruidoBuffer = null;
    let bus = null;

    const NOTAS = {
        do4: 261.6, re4: 293.7, mi4: 329.6, fa4: 349.2, sol4: 392, la4: 440,
        do5: 523.3, re5: 587.3, mi5: 659.3, sol5: 784
    };

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
        const largo = Math.ceil(c.sampleRate * 2);
        ruidoBuffer = c.createBuffer(1, largo, c.sampleRate);
        const data = ruidoBuffer.getChannelData(0);
        for (let i = 0; i < largo; i++) data[i] = Math.random() * 2 - 1;
        return ruidoBuffer;
    }

    function envolvente(g, t0, dur, vol, ataque) {
        const a = Math.min(ataque || 0.01, dur / 3);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }

    function osc(c, dest, t0, dur, o) {
        const n = c.createOscillator();
        const g = c.createGain();
        n.type = o.tipo || "sine";
        const f0 = Math.max(40, o.f || 440);
        n.frequency.setValueAtTime(f0, t0);
        (o.curva || []).forEach(function (p) {
            n.frequency.exponentialRampToValueAtTime(Math.max(40, p[1]), t0 + p[0]);
        });
        envolvente(g, t0, dur, o.vol || 0.22, o.ataque);
        let s = n;
        (o.filtros || []).forEach(function (f) {
            const b = c.createBiquadFilter();
            b.type = f.tipo;
            b.frequency.value = f.f;
            b.Q.value = f.q || 1;
            s.connect(b);
            s = b;
        });
        s.connect(g).connect(dest);
        n.start(t0);
        n.stop(t0 + dur + 0.05);
    }

    function ruido(c, dest, t0, dur, o) {
        const src = c.createBufferSource();
        src.buffer = ruidoBlanco(c);
        src.loop = true;
        const g = c.createGain();
        envolvente(g, t0, dur, o.vol || 0.2, o.ataque);
        let s = src;
        (o.filtros || []).forEach(function (f) {
            const b = c.createBiquadFilter();
            b.type = f.tipo;
            b.frequency.value = f.f;
            b.Q.value = f.q || 1;
            s.connect(b);
            s = b;
        });
        s.connect(g).connect(dest);
        src.start(t0, Math.random());
        src.stop(t0 + dur + 0.05);
    }

    function tono(f, retraso, dur, vol, tipo) {
        const c = contexto();
        if (!c) return;
        osc(c, salida(c), c.currentTime + (retraso || 0), dur || 0.35, { tipo: tipo || "sine", f: f, vol: vol || 0.16, ataque: 0.01 });
    }

    const GOLPES = {
        ding: function (c, d, t) {
            osc(c, d, t, 0.35, { tipo: "sine", f: 880, vol: 0.24, ataque: 0.005 });
            osc(c, d, t, 0.22, { tipo: "triangle", f: 1760, vol: 0.06, ataque: 0.004 });
        },
        dong: function (c, d, t) {
            osc(c, d, t, 0.7, { tipo: "sine", f: 587, vol: 0.26, ataque: 0.006 });
            osc(c, d, t, 0.5, { tipo: "triangle", f: 1174, vol: 0.06, ataque: 0.004 });
        },
        xilofono: function (c, d, t, f) {
            osc(c, d, t, 0.45, { tipo: "sine", f: f || 523, vol: 0.28, ataque: 0.004 });
            osc(c, d, t, 0.2, { tipo: "triangle", f: (f || 523) * 2.7, vol: 0.06, ataque: 0.002 });
        },
        flauta: function (c, d, t, f) {
            osc(c, d, t, 0.4, { tipo: "sine", f: f || 440, vol: 0.18, ataque: 0.04 });
            osc(c, d, t, 0.28, { tipo: "triangle", f: (f || 440) * 2, vol: 0.04, ataque: 0.05 });
        },
        violin: function (c, d, t, f) {
            osc(c, d, t, 0.55, { tipo: "sawtooth", f: f || 440, vol: 0.07, ataque: 0.06, filtros: [{ tipo: "lowpass", f: 1800 }] });
            osc(c, d, t, 0.5, { tipo: "triangle", f: (f || 440) * 2, vol: 0.04, ataque: 0.08 });
        },
        acorde: function (c, d, t) {
            [392, 494, 587, 784].forEach(function (f) {
                osc(c, d, t, 0.9, { tipo: "triangle", f: f, vol: 0.1, ataque: 0.02 });
            });
        },
        suspenso: function (c, d, t) {
            osc(c, d, t, 0.7, { tipo: "sine", f: 466, vol: 0.16, ataque: 0.02, curva: [[0.55, 520]] });
        },
        chucu: function (c, d, t) {
            ruido(c, d, t, 0.12, { vol: 0.28, ataque: 0.004, filtros: [{ tipo: "bandpass", f: 400, q: 0.7 }] });
            osc(c, d, t, 0.1, { tipo: "sine", f: 90, vol: 0.2, ataque: 0.004 });
        },
        silbato: function (c, d, t) {
            osc(c, d, t, 0.55, { tipo: "sine", f: 700, vol: 0.16, ataque: 0.02, curva: [[0.2, 1100], [0.45, 880]] });
        },
        gran: function (c, d, t) {
            [262, 330, 392, 523, 659].forEach(function (f) {
                osc(c, d, t, 1.3, { tipo: "triangle", f: f, vol: 0.08, ataque: 0.03 });
            });
        }
    };

    function tocar(ev, timbre) {
        const c = contexto();
        if (!c || !ev) return;
        const t = c.currentTime + 0.012;
        const dest = salida(c);
        if (ev.golpe && GOLPES[ev.golpe]) {
            GOLPES[ev.golpe](c, dest, t, NOTAS[ev.nota]);
            return;
        }
        const f = NOTAS[ev.nota] || 440;
        const voz = timbre === "violin" ? "violin" : (timbre === "flauta" ? "flauta" : "xilofono");
        GOLPES[voz](c, dest, t, f);
    }

    const EFECTOS = {
        recompensa: function () { [523, 659, 784].forEach(function (f, i) { tono(f, i * 0.08, 0.28, 0.14); }); },
        suave: function () { tono(330, 0, 0.16, 0.1); tono(262, 0.1, 0.2, 0.08); },
        arcoiris: function () { [523, 587, 659, 784, 880].forEach(function (f, i) { tono(f, i * 0.07, 0.25, 0.12); }); },
        fanfarria: function () { [523, 659, 784, 1047].forEach(function (f, i) { tono(f, i * 0.11, 0.4, 0.14, "triangle"); }); },
        celebracion: function () { [392, 523, 659, 784].forEach(function (f, i) { tono(f, i * 0.09, 0.35, 0.14, "triangle"); }); },
        chispas: function () { for (let i = 0; i < 5; i++) tono(1500 + i * 180, i * 0.05, 0.14, 0.06); },
        aplausos: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            for (let i = 0; i < 40; i++) {
                ruido(c, salida(c), t + Math.random() * 1.4, 0.04, { vol: 0.08, ataque: 0.002, filtros: [{ tipo: "bandpass", f: 1200, q: 0.8 }] });
            }
        }
    };

    function sonar(nombre) {
        const fn = EFECTOS[nombre];
        if (fn && contexto()) fn();
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

    global.CompletaMelodiaSfx = {
        tocar: tocar,
        sonar: sonar,
        detener: detener,
        desbloquear: contexto,
        NOTAS: Object.keys(NOTAS),
        GOLPES: Object.keys(GOLPES),
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
