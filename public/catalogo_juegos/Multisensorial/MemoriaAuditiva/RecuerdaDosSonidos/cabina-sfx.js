/**
 * SFX de tema «cabina» — síntesis WebAudio (sin archivos).
 * RecuerdaDosSfx(nombre) → true si sonó. script.js puede envolver PedniaAudio encima.
 */
(function (global) {
    'use strict';

    var ctx = null;

    function ac() {
        var Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function beep(o) {
        var c = ac();
        if (!c) return false;
        o = o || {};
        var t0 = c.currentTime;
        var dur = o.dur || 0.12;
        var n = c.createOscillator();
        var g = c.createGain();
        n.type = o.tipo || 'sine';
        n.frequency.setValueAtTime(o.f || 440, t0);
        if (o.f2) n.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(o.vol || 0.12, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        n.connect(g).connect(c.destination);
        n.start(t0);
        n.stop(t0 + dur + 0.02);
        return true;
    }

    function ruidoCorto(o) {
        var c = ac();
        if (!c) return false;
        o = o || {};
        var dur = o.dur || 0.1;
        var buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        var src = c.createBufferSource();
        src.buffer = buf;
        var f = c.createBiquadFilter();
        f.type = o.filtro || 'bandpass';
        f.frequency.value = o.f || 800;
        f.Q.value = o.q || 1.2;
        var g = c.createGain();
        g.gain.value = o.vol || 0.08;
        src.connect(f).connect(g).connect(c.destination);
        src.start();
        return true;
    }

    var FX = {
        onair: function () {
            beep({ f: 880, f2: 1320, dur: 0.09, vol: 0.08, tipo: 'triangle' });
            return beep({ f: 660, dur: 0.06, vol: 0.05, tipo: 'square' });
        },
        aparece: function () {
            return ruidoCorto({ f: 700, q: 1.4, dur: 0.09, vol: 0.07 });
        },
        vuela: function () {
            return beep({ f: 420, f2: 780, dur: 0.18, vol: 0.07, tipo: 'sine' });
        },
        encaja: function () {
            beep({ f: 520, dur: 0.05, vol: 0.08, tipo: 'square' });
            return beep({ f: 780, dur: 0.08, vol: 0.09, tipo: 'triangle' });
        },
        eyecta: function () {
            return beep({ f: 320, f2: 140, dur: 0.16, vol: 0.1, tipo: 'sawtooth' });
        },
        celebrar: function () {
            beep({ f: 523, dur: 0.08, vol: 0.08 });
            beep({ f: 659, dur: 0.08, vol: 0.08 });
            return beep({ f: 784, dur: 0.14, vol: 0.1 });
        }
    };

    function tocar(nombre) {
        if (!nombre || !FX[nombre]) return false;
        try { return !!FX[nombre](); } catch (e) { return false; }
    }

    global.RecuerdaDosCabinaSfx = tocar;
    if (!global.RecuerdaDosSfx) global.RecuerdaDosSfx = tocar;
})(typeof window !== 'undefined' ? window : this);
