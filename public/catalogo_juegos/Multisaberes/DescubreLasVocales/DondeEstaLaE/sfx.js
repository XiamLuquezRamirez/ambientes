/**
 * VocalesSfx — vocales y efectos con WebAudio + fallback HTMLAudio.
 * Si config.audios.sonidos[vocal] trae ruta, el juego usa esa grabación.
 *
 * Importante: tras la intro 3D el AudioContext suele quedar suspended;
 * hay que await resume() y un keep-alive silencioso, o no se oye nada.
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

    var TONOS = { a: 440, e: 494, i: 554, o: 392, u: 349 };

    var ctx = null;
    var vivos = [];
    var keepOsc = null;
    var keepGain = null;
    var htmlCache = Object.create(null);

    function CtxClass() {
        return global.AudioContext || global.webkitAudioContext || null;
    }

    function asegurarCtx() {
        var C = CtxClass();
        if (!C) return Promise.resolve(null);
        if (!ctx) {
            try { ctx = new C(); } catch (e) { return Promise.resolve(null); }
        }
        if (ctx.state === "running") return Promise.resolve(ctx);
        return Promise.resolve(ctx.resume()).then(function () {
            return ctx;
        }).catch(function () {
            return ctx;
        });
    }

    function keepAlive(c) {
        if (!c || keepOsc) return;
        try {
            keepGain = c.createGain();
            keepGain.gain.value = 0.00001;
            keepOsc = c.createOscillator();
            keepOsc.frequency.value = 40;
            keepOsc.connect(keepGain).connect(c.destination);
            keepOsc.start();
        } catch (e) { /* noop */ }
    }

    function desbloquear() {
        return asegurarCtx().then(function (c) {
            keepAlive(c);
            return c;
        });
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

    /** WAV mono 16-bit en data-URI (fallback si WebAudio sigue suspended). */
    function wavDataUri(freq, durSec) {
        var sr = 22050;
        var n = Math.floor(sr * durSec);
        var dataSize = n * 2;
        var buf = new ArrayBuffer(44 + dataSize);
        var v = new DataView(buf);
        function str(o, s) {
            for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
        }
        str(0, "RIFF");
        v.setUint32(4, 36 + dataSize, true);
        str(8, "WAVE");
        str(12, "fmt ");
        v.setUint32(16, 16, true);
        v.setUint16(20, 1, true);
        v.setUint16(22, 1, true);
        v.setUint32(24, sr, true);
        v.setUint32(28, sr * 2, true);
        v.setUint16(32, 2, true);
        v.setUint16(34, 16, true);
        str(36, "data");
        v.setUint32(40, dataSize, true);
        for (var i = 0; i < n; i++) {
            var t = i / sr;
            var env = Math.min(1, t * 12) * Math.min(1, (durSec - t) * 6);
            var sample = Math.sin(2 * Math.PI * freq * t) * env * 0.55;
            var s = Math.max(-1, Math.min(1, sample));
            v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        var bytes = new Uint8Array(buf);
        var bin = "";
        for (var j = 0; j < bytes.length; j++) bin += String.fromCharCode(bytes[j]);
        return "data:audio/wav;base64," + btoa(bin);
    }

    function vocalHtml(id) {
        var f = TONOS[id] || 440;
        var src = htmlCache[id] || (htmlCache[id] = wavDataUri(f, 0.7));
        return new Promise(function (resolve) {
            var a = new Audio(src);
            a.volume = 0.9;
            var fin = function () { resolve(); };
            a.onended = fin;
            a.onerror = fin;
            var p = a.play();
            if (p && p.catch) p.catch(fin);
            setTimeout(fin, 900);
        });
    }

    function vocalWeb(c, id) {
        cortar();
        var par = FORMANTES[id] || FORMANTES.a;
        var t0 = c.currentTime + 0.02;
        var dur = 0.72;
        var master = c.createGain();
        master.gain.setValueAtTime(0.0001, t0);
        master.gain.exponentialRampToValueAtTime(0.45, t0 + 0.05);
        master.gain.setValueAtTime(0.45, t0 + dur * 0.55);
        master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        master.connect(c.destination);

        var osc = c.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(TONOS[id] || 210, t0);
        par.forEach(function (f, i) {
            var bp = c.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.setValueAtTime(f, t0);
            bp.Q.value = i === 0 ? 5 : 7;
            osc.connect(bp).connect(master);
        });
        // Fundamental audible aunque el formante falle.
        var fund = c.createOscillator();
        var fg = c.createGain();
        fund.type = "sine";
        fund.frequency.setValueAtTime(TONOS[id] || 440, t0);
        fg.gain.value = 0.22;
        fund.connect(fg).connect(master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
        fund.start(t0);
        fund.stop(t0 + dur + 0.05);
        vivos.push(osc, fund);
        return new Promise(function (resolve) {
            setTimeout(resolve, dur * 1000 + 60);
        });
    }

    function vocal(id) {
        return desbloquear().then(function (c) {
            if (c && c.state === "running") return vocalWeb(c, id);
            return vocalHtml(id);
        }).catch(function () {
            return vocalHtml(id);
        });
    }

    function sonar(nombre) {
        return desbloquear().then(function (c) {
            if (!c || c.state !== "running" || !nombre) {
                if (nombre === "celebracion" || nombre === "recompensa" || nombre === "estrellas") {
                    return vocalHtml("a");
                }
                return;
            }
            var t0 = c.currentTime + 0.01;
            if (nombre === "suave") {
                tono(c, c.destination, t0, 0.18, { f: 320, f2: 220, vol: 0.12, tipo: "sine" });
                return;
            }
            if (nombre === "recompensa") {
                tono(c, c.destination, t0, 0.16, { f: 523, vol: 0.18 });
                tono(c, c.destination, t0 + 0.12, 0.22, { f: 784, vol: 0.18 });
                return;
            }
            if (nombre === "celebracion" || nombre === "estrellas") {
                [523, 659, 784, 1046].forEach(function (f, i) {
                    tono(c, c.destination, t0 + i * 0.08, 0.22, { f: f, vol: 0.16 });
                });
            }
        });
    }

    global.VocalesSfx = {
        desbloquear: desbloquear,
        cortar: cortar,
        vocal: vocal,
        sonar: sonar
    };
})(typeof window !== "undefined" ? window : this);
