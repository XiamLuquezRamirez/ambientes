/**
 * SonidosNave — audio sintetizado del taller espacial (window.SonidosNave). Sin archivos.
 *
 * Todo cuelga de dos buses (fondo y efectos) sobre un compresor: comun/volumen.js usa
 * volumenFondo/volumenEfectos porque el nombre cumple /^Sonidos[A-Z]/. La voz de Zoe y Zeus
 * baja la música con agachar().
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.35, nivelEfectos = 0.85, mudo = false;
    var ambienteNodos = null, pitidosTimer = null, musicaTimer = null, paso = 0;
    var ultimoArrastre = 0, ultimoCerca = 0, ruidoBuf = null;

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

    /** Soplo filtrado (aire, motor, despegue). */
    function soplo(dur, vol, f0, f1, retraso, bus) {
        if (!ctx || mudo) return;
        var t = ahora() + (retraso || 0);
        var src = ctx.createBufferSource();
        src.buffer = ruido();
        src.loop = true;
        var fil = ctx.createBiquadFilter();
        fil.type = "bandpass";
        fil.Q.value = 1.2;
        fil.frequency.setValueAtTime(f0, t);
        fil.frequency.exponentialRampToValueAtTime(Math.max(40, f1 || f0), t + dur);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.25, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(fil);
        fil.connect(g);
        g.connect(bus || busEfectos);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    /** Pitido digital corto. */
    function bip(f, vol, retraso) {
        tono("square", f, f, 0.07, vol, retraso);
    }

    function seleccion() {
        desbloquear();
        tono("sine", 320, 640, 0.12, 0.1, 0);       // servo que levanta la pieza
        bip(1320, 0.03, 0.08);
    }

    function arrastre() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoArrastre < 200) return;
        ultimoArrastre = t;
        tono("sine", 180 + Math.random() * 30, 160, 0.08, 0.02, 0);
    }

    /** El contorno correcto empieza a brillar: escaneo que sube. */
    function cerca() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoCerca < 900) return;
        ultimoCerca = t;
        bip(880, 0.035, 0);
        bip(1175, 0.035, 0.09);
        bip(1568, 0.035, 0.18);
    }

    /** Seguro magnético: golpe metálico, zumbido que se cierra y confirmación digital. */
    function encaje() {
        desbloquear();
        tono("sine", 140, 60, 0.16, 0.24, 0);
        tono("square", 900, 240, 0.08, 0.05, 0.01);
        tono("sawtooth", 220, 440, 0.22, 0.05, 0.06);
        soplo(0.25, 0.08, 2400, 900, 0.04);
        bip(1046, 0.05, 0.28);
        bip(1568, 0.05, 0.36);
    }

    function acierto() {
        desbloquear();
        tono("triangle", 659, 659, 0.1, 0.1, 0);
        tono("triangle", 880, 880, 0.1, 0.1, 0.09);
        tono("triangle", 1046, 1318, 0.22, 0.12, 0.18);
    }

    /** Casi o en otro lugar: un "clonc" mecánico blando, nada que suene a error. */
    function suave() {
        desbloquear();
        tono("sine", 300, 220, 0.14, 0.08, 0);
        tono("triangle", 220, 260, 0.14, 0.05, 0.12);
    }

    function regreso() {
        desbloquear();
        soplo(0.35, 0.05, 1800, 500, 0);
        tono("sine", 520, 300, 0.25, 0.04, 0);
    }

    /** Encendido de la nave: zumbido que sube y luces que se prenden. */
    function encendido(n) {
        desbloquear();
        tono("sawtooth", 70, 220, 1.2, 0.06, 0);
        tono("sine", 110, 440, 1.2, 0.08, 0);
        for (var i = 0; i < (n || 6); i++) bip(660 + i * 120, 0.04, 0.2 + i * 0.14);
    }

    function despegue() {
        desbloquear();
        soplo(2.6, 0.22, 300, 1600, 0);
        soplo(2.6, 0.12, 120, 400, 0);
        tono("sawtooth", 60, 30, 2.4, 0.08, 0);
    }

    /** Cuenta regresiva de la cinemática: 3, 2, 1 pitidos y uno largo y agudo en 0. */
    function cuenta(n) {
        desbloquear();
        if (n > 0) {
            tono("square", 880, 880, 0.16, 0.06, 0);
            tono("sine", 440, 440, 0.2, 0.06, 0);
        } else {
            tono("square", 1318, 1318, 0.5, 0.07, 0);
            tono("sine", 659, 659, 0.6, 0.07, 0);
        }
    }

    /** Salto al hiperespacio: soplo que sube muy rápido y un brillo agudo. */
    function hiperespacio() {
        desbloquear();
        soplo(1.5, 0.2, 400, 6000, 0);
        tono("sawtooth", 120, 1800, 1.4, 0.06, 0);
        tono("sine", 2093, 4186, 0.5, 0.05, 1.1);
    }

    function fuego() {
        if (!ctx || mudo) return;
        soplo(0.4, 0.07, 3000, 800, 0);
        bip(1200 + Math.random() * 1200, 0.025, 0.05);
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

    function pitidoTaller() {
        if (!ctx || mudo) return;
        var base = 900 + Math.random() * 900;
        var n = 1 + Math.floor(Math.random() * 3);
        for (var i = 0; i < n; i++) tono("sine", base, base, 0.05, 0.012, i * 0.1, busFondo);
    }

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
            if (pitidosTimer) { clearInterval(pitidosTimer); pitidosTimer = null; }
            return;
        }
        if (ambienteNodos) return;
        // zumbido grave del taller con un leve vaivén
        var g = ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.04, ahora(), 1);
        var lfo = ctx.createOscillator();
        var lfoG = ctx.createGain();
        lfo.frequency.value = 0.12;
        lfoG.gain.value = 0.014;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        var osc = [110, 165, 220.5].map(function (f, i) {
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
        pitidosTimer = setInterval(function () { if (Math.random() < 0.5) pitidoTaller(); }, 2800);
    }

    function musica(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;
        var escala = [523, 659, 784, 1046, 880, 784, 659, 784];
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = escala[paso % escala.length];
            paso += 1;
            tono("square", f, f, 0.18, 0.025, 0, busFondo);
            if (paso % 2 === 0) tono("triangle", f / 2, f / 2, 0.36, 0.04, 0, busFondo);
        }, 240);
    }

    function volumenFondo(pct) {
        nivelFondo = Math.max(0, Math.min(100, Number(pct) || 0)) / 100 * 0.7;
        if (busFondo && ctx) busFondo.gain.setTargetAtTime(nivelFondo, ahora(), 0.08);
    }

    function volumenEfectos(pct) {
        nivelEfectos = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
        if (busEfectos && ctx) busEfectos.gain.setTargetAtTime(nivelEfectos, ahora(), 0.08);
    }

    function volumen(pct) {
        var v = Math.max(0, Math.min(100, Number(pct) || 0)) / 100;
        if (maestro && ctx) maestro.gain.setTargetAtTime(mudo ? 0 : v, ahora(), 0.08);
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
        ambiente(false);
        musica(false);
        silenciar(true);
    }

    global.SonidosNave = {
        desbloquear: desbloquear,
        seleccion: seleccion,
        arrastre: arrastre,
        cerca: cerca,
        encaje: encaje,
        acierto: acierto,
        suave: suave,
        regreso: regreso,
        encendido: encendido,
        despegue: despegue,
        cuenta: cuenta,
        hiperespacio: hiperespacio,
        fuego: fuego,
        victoria: victoria,
        ambiente: ambiente,
        musica: musica,
        volumenFondo: volumenFondo,
        volumenEfectos: volumenEfectos,
        volumen: volumen,
        silenciar: silenciar,
        agachar: agachar,
        detenerTodo: detenerTodo
    };
})(typeof window !== "undefined" ? window : global);
