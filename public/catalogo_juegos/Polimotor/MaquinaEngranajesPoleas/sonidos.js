/**
 * SonidosMaquina — audio sintetizado del taller de engranajes (window.SonidosMaquina). Sin archivos.
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
    var motorNodos = null, motorTimer = null;

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

    /** Clic metálico de un diente (trinquete). */
    function clic(vol, retraso, f) {
        tono("square", f || 1400, (f || 1400) * 0.6, 0.025, vol, retraso);
        tono("triangle", (f || 1400) * 0.3, (f || 1400) * 0.2, 0.04, vol * 0.8, retraso);
    }

    /** Tomar una pieza: la rueda se levanta con un zumbido de imán. */
    function seleccion() {
        desbloquear();
        tono("sine", 300, 620, 0.14, 0.1, 0);
        clic(0.04, 0.06, 1800);
    }

    function arrastre() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoArrastre < 220) return;
        ultimoArrastre = t;
        tono("sine", 170 + Math.random() * 30, 150, 0.08, 0.018, 0);
    }

    /** El aro magnético verde: zumbido que sube y un clic de dientes que se alinean. */
    function cerca() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoCerca < 900) return;
        ultimoCerca = t;
        tono("sine", 220, 440, 0.25, 0.05, 0);
        bip(1175, 0.03, 0.12);
        clic(0.04, 0.2, 1600);
    }

    /** Acoplamiento mecánico: golpe metálico, dientes que entran y campanita. */
    function encaje() {
        desbloquear();
        tono("sine", 480, 140, 0.1, 0.18, 0);
        tono("triangle", 260, 110, 0.18, 0.14, 0.01);
        soplo(0.12, 0.05, 2400, 900, 0);
        for (var i = 0; i < 4; i++) clic(0.05, 0.14 + i * 0.05, 1300 + i * 120);
        tono("triangle", 1568, 1568, 0.3, 0.05, 0.4);
        tono("sine", 2093, 2093, 0.25, 0.03, 0.42);
    }

    /** Dos ruedas o una correa quedan unidas: tic-tac de dientes en marcha corta. */
    function conexion() {
        desbloquear();
        for (var i = 0; i < 7; i++) clic(0.035, i * 0.09, 1000 + (i % 2) * 300);
        tono("sine", 330, 495, 0.5, 0.04, 0);
    }

    /** La correa se estira y se tensa. */
    function correa() {
        desbloquear();
        tono("sawtooth", 90, 260, 0.45, 0.05, 0);
        tono("sine", 180, 520, 0.45, 0.06, 0);
        tono("triangle", 660, 990, 0.12, 0.06, 0.48);
    }

    function acierto() {
        desbloquear();
        tono("triangle", 659, 659, 0.1, 0.1, 0);
        tono("triangle", 880, 880, 0.1, 0.1, 0.09);
        tono("triangle", 1046, 1318, 0.22, 0.12, 0.18);
    }

    /** Otra talla u otro eje: un "clonc" blando y un resorte, nada que suene a error. */
    function suave() {
        desbloquear();
        tono("sine", 300, 220, 0.14, 0.08, 0);
        tono("triangle", 220, 300, 0.2, 0.05, 0.12);
        tono("sine", 520, 380, 0.18, 0.03, 0.15);
    }

    function regreso() {
        desbloquear();
        soplo(0.35, 0.05, 1800, 500, 0);
        tono("sine", 520, 300, 0.25, 0.04, 0);
    }

    /** Ayuda: dos notas que llaman la atención. */
    function pista() {
        desbloquear();
        bip(988, 0.035, 0);
        bip(1318, 0.035, 0.12);
    }

    /** Nivel completo: el taller se enciende. */
    function nivel() {
        desbloquear();
        tono("sawtooth", 90, 260, 0.9, 0.05, 0);
        for (var i = 0; i < 6; i++) bip(660 + i * 130, 0.04, 0.15 + i * 0.12);
    }

    /** Arranque tras la palanca: chispazo y motor que despierta. */
    function arranque() {
        desbloquear();
        tono("square", 200, 120, 0.08, 0.06, 0);
        soplo(0.3, 0.06, 3000, 800, 0.05);
        tono("sawtooth", 50, 160, 1.2, 0.07, 0.2);
        tono("sine", 80, 330, 1.2, 0.1, 0.2);
        for (var i = 0; i < 5; i++) bip(523 + i * 160, 0.035, 0.3 + i * 0.14);
    }

    /** La palanca baja: clac metálico con resorte. */
    function palanca() {
        desbloquear();
        tono("square", 420, 180, 0.06, 0.07, 0);
        tono("triangle", 160, 90, 0.18, 0.12, 0.03);
        tono("sine", 600, 900, 0.12, 0.04, 0.08);
    }

    /** Motor en marcha: zumbido con tic-tac de engranajes (se apaga solo con detenerMotor). */
    function motor(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (motorNodos) {
                motorNodos.g.gain.setTargetAtTime(0.0001, ahora(), 0.4);
                var viejo = motorNodos;
                setTimeout(function () { viejo.osc.forEach(function (o) { try { o.stop(); } catch (e) { /* ya parado */ } }); }, 1600);
                motorNodos = null;
            }
            if (motorTimer) { clearInterval(motorTimer); motorTimer = null; }
            return;
        }
        if (motorNodos) return;
        var g = ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.035, ahora(), 0.6);
        var osc = [55, 110, 165].map(function (f, i) {
            var o = ctx.createOscillator();
            o.type = i ? "sine" : "sawtooth";
            o.frequency.value = f;
            o.connect(g);
            o.start();
            return o;
        });
        g.connect(busEfectos);
        motorNodos = { g: g, osc: osc };
        var k = 0;
        motorTimer = setInterval(function () { k += 1; clic(0.014, 0, k % 2 ? 1500 : 1100); }, 170);
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
        motor(false);
        silenciar(true);
    }

    global.SonidosMaquina = {
        desbloquear: desbloquear,
        seleccion: seleccion,
        arrastre: arrastre,
        cerca: cerca,
        encaje: encaje,
        conexion: conexion,
        correa: correa,
        acierto: acierto,
        suave: suave,
        regreso: regreso,
        pista: pista,
        nivel: nivel,
        arranque: arranque,
        motor: motor,
        palanca: palanca,
        celebrar: victoria,
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
