/**
 * RetoVocalesSfx — efectos breves del parque / planeta.
 */
(function (global) {
    "use strict";

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

    function desbloquear() { contexto(); }

    function cortar() {
        vivos.forEach(function (n) {
            try { n.stop(); } catch (e) { /* noop */ }
        });
        vivos = [];
    }

    function tono(c, t0, dur, o) {
        var osc = c.createOscillator();
        var g = c.createGain();
        osc.type = o.tipo || "sine";
        osc.frequency.setValueAtTime(o.f, t0);
        if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g).connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
        vivos.push(osc);
    }

    function sonar(nombre) {
        var c = contexto();
        if (!c || !nombre) return;
        var t0 = c.currentTime + 0.01;
        if (nombre === "suave" || nombre === "alerta" || nombre === "error") {
            tono(c, t0, 0.18, { f: 280, f2: 200, vol: 0.08 });
            return;
        }
        if (nombre === "recompensa" || nombre === "avanza" || nombre === "salta") {
            tono(c, t0, 0.14, { f: 523, vol: 0.12 });
            tono(c, t0 + 0.1, 0.2, { f: 784, vol: 0.12 });
            return;
        }
        if (nombre === "celebracion" || nombre === "estrellas" || nombre === "energia" || nombre === "planeta" || nombre === "despega" || nombre === "abre" || nombre === "estrella") {
            [523, 659, 784, 1046].forEach(function (f, i) {
                tono(c, t0 + i * 0.08, 0.2, { f: f, vol: 0.1 });
            });
        }
    }

    global.RetoVocalesSfx = {
        desbloquear: desbloquear,
        cortar: cortar,
        sonar: sonar
    };
})(typeof window !== "undefined" ? window : this);
