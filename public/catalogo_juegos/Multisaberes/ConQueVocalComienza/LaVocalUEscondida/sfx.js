/**
 * VocalesInicialesSfx — efectos breves. Las vocales y los nombres van por TextoVoz
 * o por archivos en config.audios.objetos.
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
        if (nombre === "campanas") {
            [659, 784, 988].forEach(function (f, i) {
                tono(c, c.destination, t0 + i * 0.14, 0.35, { f: f, vol: 0.09, tipo: "triangle" });
            });
        }
    }

    global.VocalesInicialesSfx = {
        desbloquear: desbloquear,
        cortar: cortar,
        sonar: sonar
    };
})(typeof window !== "undefined" ? window : this);
