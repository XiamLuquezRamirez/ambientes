/**
 * EncuentraParejaSfx — efectos sintetizados con WebAudio (sin archivos).
 * Provisionales: si config.audios.efectos[nombre] tiene ruta, el juego usa esa grabación.
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

    function osc(c, dest, t0, dur, o) {
        const n = c.createOscillator();
        const g = c.createGain();
        n.type = o.tipo || "sine";
        const curva = o.curva || [[0, o.f || 440]];
        n.frequency.setValueAtTime(curva[0][1], t0);
        for (let i = 1; i < curva.length; i++) n.frequency.exponentialRampToValueAtTime(curva[i][1], t0 + curva[i][0]);
        const vol = o.vol || 0.2;
        const a = Math.min(o.ataque || 0.01, dur / 2);
        const r = Math.min(o.caida != null ? o.caida : dur * 0.6, dur - a);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + a);
        g.gain.setValueAtTime(vol, t0 + dur - r);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        n.connect(g).connect(dest);
        n.start(t0);
        n.stop(t0 + dur + 0.05);
    }

    function ruido(c, dest, t0, dur, o) {
        const largo = Math.ceil(c.sampleRate * Math.max(dur, 0.05));
        const buf = c.createBuffer(1, largo, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < largo; i++) data[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource();
        src.buffer = buf;
        const g = c.createGain();
        const vol = o.vol || 0.15;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + (o.ataque || 0.01));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        let salida = src;
        if (o.filtro) {
            const f = c.createBiquadFilter();
            f.type = o.filtro;
            f.frequency.value = o.f || 1200;
            if (o.q) f.Q.value = o.q;
            salida.connect(f);
            salida = f;
        }
        salida.connect(g).connect(dest);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
    }

    function nota(f, retraso, dur, vol, tipo) {
        const c = contexto();
        if (!c) return;
        osc(c, c.destination, c.currentTime + (retraso || 0), dur || 0.3, { tipo: tipo || "sine", f: f, vol: vol || 0.2, ataque: 0.01 });
    }

    function campanazo(f, retraso) {
        const c = contexto();
        if (!c) return;
        const t = c.currentTime + (retraso || 0);
        [[1, 0.28], [2, 0.16], [3, 0.08]].forEach(function (p) {
            osc(c, c.destination, t, 1.2, { tipo: "sine", f: f * p[0], vol: p[1], ataque: 0.004, caida: 1.1 });
        });
    }

    const EFECTOS = {
        /** Campana que repica al presentarse. */
        dingDong: function () {
            campanazo(660, 0);
            campanazo(523, 0.55);
        },
        /** Acierto: campanada armónica. */
        dingDingYay: function () {
            campanazo(784, 0);
            campanazo(988, 0.28);
            campanazo(1175, 0.55);
            nota(1568, 0.75, 0.4, 0.1);
        },
        /** Flor: brisa aromática. */
        sshhBloom: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            ruido(c, c.destination, t, 0.9, { vol: 0.12, ataque: 0.15, filtro: "bandpass", f: 900, q: 0.8 });
            nota(523, 0.2, 0.5, 0.08, "triangle");
            nota(659, 0.45, 0.5, 0.07, "triangle");
        },
        /** Helado: lengüetazo. */
        miamMiam: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [0, 0.28].forEach(function (s) {
                osc(c, c.destination, t + s, 0.22, { tipo: "sine", vol: 0.22, ataque: 0.02, caida: 0.15, curva: [[0, 320], [0.22, 180]] });
                ruido(c, c.destination, t + s, 0.1, { vol: 0.08, ataque: 0.01, filtro: "lowpass", f: 800 });
            });
        },
        /** Sol: brillo. */
        shineGlimmer: function () {
            [1047, 1319, 1568, 2093].forEach(function (f, i) { nota(f, i * 0.08, 0.35, 0.1, "triangle"); });
        },
        /** Tambor de la demo. */
        tambor: function () {
            const c = contexto();
            if (!c) return;
            const t = c.currentTime;
            [0, 0.35].forEach(function (s) {
                osc(c, c.destination, t + s, 0.35, { tipo: "sine", vol: 0.7, ataque: 0.003, caida: 0.32, curva: [[0, 170], [0.3, 60]] });
                ruido(c, c.destination, t + s, 0.06, { vol: 0.2, ataque: 0.002, filtro: "lowpass", f: 900 });
            });
        },
        recompensa: function () {
            [1047, 1319, 1568].forEach(function (f, i) { nota(f, i * 0.08, 0.35, 0.16); });
        },
        celebracion: function () {
            [523, 659, 784, 1047].forEach(function (f, i) { nota(f, i * 0.1, 0.4, 0.16, "triangle"); });
        },
        victoria: function () {
            [392, 523, 659].forEach(function (f, i) { nota(f, i * 0.14, 0.24, 0.16, "triangle"); });
            [523, 659, 784, 1047].forEach(function (f) { nota(f, 0.46, 1.1, 0.1, "triangle"); });
        },
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
        ding: function () { nota(1568, 0, 0.6, 0.15); },
        boing: function () {
            const c = contexto();
            if (!c) return;
            osc(c, c.destination, c.currentTime, 0.28, { tipo: "sine", vol: 0.25, ataque: 0.005, caida: 0.22, curva: [[0, 280], [0.28, 90]] });
        }
    };

    function sonar(nombre) {
        const fn = EFECTOS[nombre];
        if (!fn || !contexto()) return;
        fn();
    }

    function existe(nombre) {
        return !!EFECTOS[nombre];
    }

    function desbloquear() {
        contexto();
    }

    global.EncuentraParejaSfx = {
        sonar: sonar,
        existe: existe,
        desbloquear: desbloquear,
        EFECTOS: Object.keys(EFECTOS)
    };
})(typeof window !== "undefined" ? window : globalThis);
