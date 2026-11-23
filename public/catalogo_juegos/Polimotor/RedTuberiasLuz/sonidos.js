/**
 * SonidosTuberia — audio sintetizado del laboratorio de conducción (window.SonidosTuberia). Sin archivos.
 *
 * Todo cuelga de dos buses (fondo y efectos) sobre un compresor: comun/volumen.js usa volumenFondo/volumenEfectos
 * porque el nombre cumple /^Sonidos[A-Z]/. La voz de Zoe y Zeus baja la música con agachar().
 * flujo(vel) es un zumbido continuo de energía cuyo tono sube con la velocidad de la gema.
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.35, nivelEfectos = 0.85, mudo = false;
    var ambienteNodos = null, musicaTimer = null, paso = 0, ruidoBuf = null;
    var flujoNodos = null;

    function crear() {
        if (ctx && ctx.state !== "closed") return ctx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 6;
        comp.attack.value = 0.005;
        comp.release.value = 0.2;
        maestro = ctx.createGain();
        maestro.gain.value = mudo ? 0 : 1;
        busFondo = ctx.createGain();
        busFondo.gain.value = nivelFondo;
        busEfectos = ctx.createGain();
        busEfectos.gain.value = nivelEfectos;
        busFondo.connect(comp);
        busEfectos.connect(comp);
        comp.connect(maestro);
        maestro.connect(ctx.destination);
        ruidoBuf = null;
        flujoNodos = null;
        ambienteNodos = null;
        return ctx;
    }

    function desbloquear() {
        crear();
        if (ctx && ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function ahora() { return ctx ? ctx.currentTime : 0; }

    function tono(tipo, f0, f1, dur, vol, retraso, bus) {
        if (!ctx || mudo) return;
        var t = ahora() + (retraso || 0);
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = tipo;
        o.frequency.setValueAtTime(Math.max(30, f0), t);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(bus || busEfectos);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    function ruido() {
        if (ruidoBuf && ruidoBuf.sampleRate === ctx.sampleRate) return ruidoBuf;
        var n = Math.floor(ctx.sampleRate * 1.5);
        ruidoBuf = ctx.createBuffer(1, n, ctx.sampleRate);
        var d = ruidoBuf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return ruidoBuf;
    }

    function soplo(dur, vol, f0, f1, retraso, bus) {
        if (!ctx || mudo) return;
        var t = ahora() + (retraso || 0);
        var src = ctx.createBufferSource();
        src.buffer = ruido();
        src.loop = true;
        var fil = ctx.createBiquadFilter();
        fil.type = "bandpass";
        fil.Q.value = 1.4;
        fil.frequency.setValueAtTime(f0, t);
        fil.frequency.exponentialRampToValueAtTime(Math.max(40, f1 || f0), t + dur);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.2, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(fil);
        fil.connect(g);
        g.connect(bus || busEfectos);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    function bip(f, vol, retraso) { tono("square", f, f, 0.07, vol, retraso); }

    // ------------------------------------------------------------------ efectos

    /** La gema se toma: chispazo y la energía que arranca. */
    function contacto() {
        desbloquear();
        tono("sine", 420, 980, 0.16, 0.12, 0);
        tono("triangle", 1318, 1318, 0.08, 0.05, 0.1);
        soplo(0.18, 0.05, 3200, 1800, 0);
    }

    /** Zumbido continuo de la energía mientras la gema viaja (vel en unidades del mundo por segundo). */
    function flujo(vel) {
        if (!ctx || mudo) return;
        if (!flujoNodos) {
            var g = ctx.createGain();
            g.gain.value = 0.0001;
            var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
            o1.type = "sawtooth";
            o2.type = "sine";
            o1.frequency.value = 110;
            o2.frequency.value = 220;
            var fil = ctx.createBiquadFilter();
            fil.type = "lowpass";
            fil.frequency.value = 600;
            o1.connect(fil);
            o2.connect(fil);
            fil.connect(g);
            g.connect(busEfectos);
            o1.start();
            o2.start();
            flujoNodos = { g: g, o1: o1, o2: o2, fil: fil };
        }
        var v = Math.max(0, Math.min(1, (Number(vel) || 0) / 700));
        var t = ahora();
        flujoNodos.g.gain.setTargetAtTime(v > 0.02 ? 0.025 + 0.05 * v : 0.0001, t, 0.08);
        flujoNodos.o1.frequency.setTargetAtTime(100 + 140 * v, t, 0.1);
        flujoNodos.o2.frequency.setTargetAtTime(200 + 320 * v, t, 0.1);
        flujoNodos.fil.frequency.setTargetAtTime(500 + 1400 * v, t, 0.1);
    }

    function checkpoint() {
        desbloquear();
        tono("triangle", 784, 784, 0.1, 0.1, 0);
        tono("triangle", 1046, 1046, 0.1, 0.1, 0.08);
        tono("triangle", 1568, 1568, 0.2, 0.1, 0.16);
        bip(2093, 0.02, 0.3);
    }

    /** Salida del carril: un "wuuu" suave, nunca un error. */
    function fuera() {
        desbloquear();
        tono("sine", 420, 300, 0.22, 0.07, 0);
        tono("sine", 440, 320, 0.22, 0.04, 0.04);
    }

    function vuelve() {
        desbloquear();
        tono("sine", 330, 560, 0.14, 0.06, 0);
    }

    /** La gema se detuvo porque el dedo se levantó. */
    function pausa() {
        desbloquear();
        tono("triangle", 660, 440, 0.18, 0.07, 0);
        tono("triangle", 523, 392, 0.22, 0.05, 0.14);
    }

    /** La gema se desliza hacia el checkpoint. */
    function regreso() {
        desbloquear();
        soplo(0.5, 0.05, 2200, 600, 0);
        tono("sine", 600, 300, 0.45, 0.04, 0);
    }

    function aparece() {
        desbloquear();
        tono("sine", 523, 1046, 0.25, 0.07, 0);
        bip(1568, 0.03, 0.2);
    }

    function barrido() {
        desbloquear();
        soplo(1.2, 0.06, 500, 3000, 0);
        tono("sine", 220, 880, 1.1, 0.04, 0);
    }

    function toque() {
        desbloquear();
        tono("sine", 880, 660, 0.1, 0.05, 0);
    }

    /** La gema entra al reactor: golpe de energía que sube. */
    function conexion() {
        desbloquear();
        tono("sine", 120, 60, 0.3, 0.22, 0);
        tono("sawtooth", 180, 720, 0.7, 0.06, 0.05);
        soplo(0.7, 0.1, 400, 4000, 0.05);
        [1046, 1318, 1568, 2093].forEach(function (f, i) { tono("triangle", f, f, 0.18, 0.08, 0.35 + i * 0.09); });
    }

    function victoria() {
        desbloquear();
        var notas = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
        notas.forEach(function (f, i) {
            tono("triangle", f, f, 0.24, 0.11, i * 0.13);
            tono("sine", f / 2, f / 2, 0.24, 0.05, i * 0.13);
        });
        for (var k = 0; k < 8; k++) bip(1568 + Math.random() * 1200, 0.02, 1.1 + k * 0.08);
    }

    /** Cinemática: el reactor se carga (zumbido que sube y chisporroteo). */
    function carga() {
        desbloquear();
        tono("sawtooth", 80, 640, 1.4, 0.07, 0);
        tono("sine", 160, 1280, 1.4, 0.06, 0);
        soplo(1.4, 0.08, 300, 3600, 0);
        for (var i = 0; i < 6; i++) bip(1400 + Math.random() * 900, 0.02, 0.3 + i * 0.18);
    }

    /** Cinemática: la ola de luz enciende el laboratorio (arpegio que sube). */
    function ola() {
        desbloquear();
        soplo(1.6, 0.07, 600, 5000, 0);
        [523, 659, 784, 1046, 1318, 1568, 2093].forEach(function (f, i) { tono("triangle", f, f, 0.3, 0.07, i * 0.2); });
    }

    function fuego() {
        if (!ctx || mudo) return;
        soplo(0.4, 0.06, 3000, 800, 0);
        bip(1200 + Math.random() * 1200, 0.025, 0.05);
    }

    // ------------------------------------------------------------------ fondo

    function ambiente(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (ambienteNodos) {
                ambienteNodos.g.gain.setTargetAtTime(0.0001, ahora(), 0.3);
                var viejo = ambienteNodos;
                setTimeout(function () { viejo.osc.concat([viejo.lfo]).forEach(function (o) { try { o.stop(); } catch (e) { /* ya parado */ } }); }, 1500);
                ambienteNodos = null;
            }
            return;
        }
        if (ambienteNodos) return;
        var g = ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.035, ahora(), 1);
        var lfo = ctx.createOscillator();
        var lfoG = ctx.createGain();
        lfo.frequency.value = 0.18;
        lfoG.gain.value = 0.012;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        var osc = [98, 147, 196.5].map(function (f, i) {
            var o = ctx.createOscillator();
            o.type = i === 0 ? "triangle" : "sine";
            o.frequency.value = f;
            o.connect(g);
            o.start();
            return o;
        });
        g.connect(busFondo);
        lfo.start();
        ambienteNodos = { osc: osc, g: g, lfo: lfo };
    }

    function musica(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;
        var escala = [392, 523, 659, 784, 659, 523, 587, 784];
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = escala[paso % escala.length];
            paso += 1;
            tono("triangle", f, f, 0.22, 0.03, 0, busFondo);
            if (paso % 2 === 0) tono("sine", f / 2, f / 2, 0.4, 0.04, 0, busFondo);
        }, 260);
    }

    function volumenFondo(pct) {
        nivelFondo = Math.max(0, Math.min(100, Number(pct) || 0)) / 100 * 0.7;
        if (busFondo && ctx) busFondo.gain.setTargetAtTime(nivelFondo, ahora(), 0.08);
    }

    function volumenEfectos(pct) {
        nivelEfectos = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
        if (busEfectos && ctx) busEfectos.gain.setTargetAtTime(nivelEfectos, ahora(), 0.08);
    }

    function silenciar(on) {
        mudo = !!on;
        if (maestro && ctx) maestro.gain.setTargetAtTime(mudo ? 0 : 1, ahora(), 0.08);
    }

    function agachar(on) {
        if (!busFondo || !ctx) return;
        busFondo.gain.setTargetAtTime(on ? nivelFondo * 0.28 : nivelFondo, ahora(), 0.15);
    }

    function detenerTodo() {
        flujo(0);
        ambiente(false);
        musica(false);
        silenciar(true);
    }

    global.SonidosTuberia = {
        desbloquear: desbloquear,
        contacto: contacto,
        flujo: flujo,
        checkpoint: checkpoint,
        fuera: fuera,
        vuelve: vuelve,
        pausa: pausa,
        regreso: regreso,
        aparece: aparece,
        barrido: barrido,
        toque: toque,
        conexion: conexion,
        victoria: victoria,
        fuego: fuego,
        carga: carga,
        ola: ola,
        ambiente: ambiente,
        musica: musica,
        volumenFondo: volumenFondo,
        volumenEfectos: volumenEfectos,
        silenciar: silenciar,
        agachar: agachar,
        detenerTodo: detenerTodo
    };
})(typeof window !== "undefined" ? window : global);
