/**
 * VocalesSfx — vocales y efectos provisionales con WebAudio.
 * Si config.audios.sonidos[vocal] trae una ruta, el juego usa esa grabación
 * y no llama a vocal().
 */
(function (global) {
    "use strict";

    var FORMANTES = {
        a: [800, 1400],
        e: [500, 1900],
        i: [350, 2400],
        o: [550, 1000],
        u: [380, 850]
    };

    var ctx = null;
    var vivos = [];

    function contexto() {
        var Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") {
            var p = ctx.resume();
            if (p && p.catch) p.catch(function () {});
        }
        return ctx;
    }

    function desbloquear() {
        contexto();
    }

    function cortar() {
        vivos.forEach(function (n) {
            try { n.stop(); } catch (e) { /* ya terminó */ }
        });
        vivos = [];
    }

    function tono(c, dest, t0, dur, o) {
        var osc = c.createOscillator();
        var g = c.createGain();
        osc.type = o.tipo || "sine";
        osc.frequency.setValueAtTime(o.f, t0);
        if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
        var a = Math.min(o.ataque || 0.02, dur / 3);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g).connect(dest);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
        vivos.push(osc);
    }

    /**
     * Pulso glotal (sierra) pasado por dos bandas: suena a vocal, no a un beep.
     * Sigue siendo un sustituto hasta que existan las grabaciones.
     */
    function vocal(id) {
        var c = contexto();
        var dur = 0.78;
        if (!c) return Promise.resolve();
        cortar();
        var par = FORMANTES[id] || FORMANTES.a;
        var t0 = c.currentTime + 0.02;
        var osc = c.createOscillator();
        var g = c.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(210, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.06);
        g.gain.setValueAtTime(0.22, t0 + dur * 0.62);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        par.forEach(function (f, i) {
            var bp = c.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.setValueAtTime(f, t0);
            bp.Q.value = i === 0 ? 7 : 9;
            osc.connect(bp).connect(g);
        });
        g.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
        vivos.push(osc);
        return new Promise(function (resolve) {
            setTimeout(resolve, dur * 1000 + 40);
        });
    }

    function sonar(nombre) {
        var c = contexto();
        if (!c || !nombre) return;
        var t0 = c.currentTime + 0.01;
        if (nombre === "suave") {
            tono(c, c.destination, t0, 0.18, { f: 320, f2: 220, vol: 0.08, tipo: "sine" });
            return;
        }
        if (nombre === "recompensa") {
            tono(c, c.destination, t0, 0.16, { f: 523, vol: 0.12 });
            tono(c, c.destination, t0 + 0.12, 0.22, { f: 784, vol: 0.12 });
            return;
        }
        if (nombre === "celebracion" || nombre === "estrellas") {
            [523, 659, 784, 1046].forEach(function (f, i) {
                tono(c, c.destination, t0 + i * 0.08, 0.2, { f: f, vol: 0.1 });
            });
        }
    }

    global.VocalesSfx = {
        desbloquear: desbloquear,
        cortar: cortar,
        vocal: vocal,
        sonar: sonar
    };
})(typeof window !== "undefined" ? window : this);
