/**
 * ConstruccionSfx — clics de fábrica / portales con WebAudio.
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
        if (nombre === "suave" || nombre === "alerta") {
            tono(c, t0, 0.2, { f: 280, f2: 220, vol: 0.08 });
            return;
        }
        if (nombre === "construir" || nombre === "recompensa") {
            tono(c, t0, 0.12, { f: 440, vol: 0.12, tipo: "triangle" });
            tono(c, t0 + 0.1, 0.18, { f: 660, vol: 0.12, tipo: "triangle" });
            return;
        }
        if (nombre === "campanillas") {
            [784, 988, 1174].forEach(function (f, i) {
                tono(c, t0 + i * 0.09, 0.28, { f: f, vol: 0.09 });
            });
            return;
        }
        if (nombre === "celebracion" || nombre === "estrellas" || nombre === "maquina" || nombre === "portales") {
            [523, 659, 784, 1046].forEach(function (f, i) {
                tono(c, t0 + i * 0.08, 0.2, { f: f, vol: 0.1 });
            });
        }
    }

    global.ConstruccionSfx = {
        desbloquear: desbloquear,
        cortar: cortar,
        sonar: sonar
    };
})(typeof window !== "undefined" ? window : this);
