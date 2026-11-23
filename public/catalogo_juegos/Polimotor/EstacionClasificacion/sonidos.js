/**
 * SonidosEstacion — audio sintetizado de la estación de clasificación (window.SonidosEstacion). Sin archivos.
 *
 * Todo cuelga de dos buses (fondo y efectos) sobre un compresor: comun/volumen.js usa
 * volumenFondo/volumenEfectos porque el nombre cumple /^Sonidos[A-Z]/. La voz de Zoe y Zeus
 * baja la música con agachar(). El error nunca suena feo: un "clonc" blando.
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.35, nivelEfectos = 0.85, mudo = false;
    var ambienteNodos = null, pitidosTimer = null, musicaTimer = null, paso = 0;
    var ultimoArrastre = 0, ultimoSobre = 0, ruidoBuf = null;

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

    /** Soplo filtrado (aire, compuerta, fuegos de papel). */
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

    function bip(f, vol, retraso) { tono("square", f, f, 0.07, vol, retraso); }

    /** Tomar un objeto: un "pop" suave hacia arriba. */
    function seleccion() {
        desbloquear();
        tono("sine", 360, 720, 0.12, 0.11, 0);
        bip(1320, 0.025, 0.08);
    }

    function arrastre() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoArrastre < 220) return;
        ultimoArrastre = t;
        tono("sine", 200 + Math.random() * 30, 180, 0.08, 0.018, 0);
    }

    /** El objeto pasa sobre un contenedor: la compuerta se entreabre con un "fiu" corto. */
    function sobre() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoSobre < 250) return;
        ultimoSobre = t;
        tono("triangle", 660, 990, 0.09, 0.04, 0);
    }

    /** Escáner: pitidos que suben mientras la luz verde recorre el objeto. */
    function escaner() {
        desbloquear();
        tono("sawtooth", 500, 1400, 0.4, 0.035, 0);
        bip(880, 0.04, 0.02);
        bip(1175, 0.04, 0.14);
        bip(1568, 0.04, 0.26);
    }

    /** La compuerta se abre: aire comprimido y un clic metálico. */
    function compuerta() {
        desbloquear();
        soplo(0.3, 0.09, 2600, 700, 0);
        tono("square", 1200, 500, 0.05, 0.04, 0.02);
    }

    function acierto() {
        desbloquear();
        tono("sine", 160, 70, 0.14, 0.18, 0);              // el objeto cae dentro
        tono("triangle", 784, 784, 0.1, 0.1, 0.08);
        tono("triangle", 988, 988, 0.1, 0.1, 0.17);
        tono("triangle", 1318, 1568, 0.24, 0.12, 0.26);
    }

    /** Contenedor equivocado: un "clonc" blando, nada que suene a error. */
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

    /** Un objeto nuevo llega por la cinta. */
    function entra() {
        if (!ctx || mudo) return;
        tono("sine", 140, 180, 0.4, 0.05, 0);
        bip(990, 0.025, 0.3);
    }

    /** Cada contenedor que se enciende en la escena final. */
    function ding(i) {
        desbloquear();
        var f = [784, 988, 1175, 1568][(i | 0) % 4];
        tono("triangle", f, f, 0.3, 0.1, 0);
        tono("sine", f * 2, f * 2, 0.2, 0.03, 0.02);
    }

    /** Cambio de nivel: un contenedor llega deslizándose por el estante… */
    function desliza() {
        if (!ctx || mudo) return;
        soplo(0.6, 0.06, 500, 1600, 0);
        tono("sine", 90, 140, 0.55, 0.05, 0);
    }

    /** …y frena con un golpe metálico suave. */
    function frena() {
        if (!ctx || mudo) return;
        tono("sine", 150, 70, 0.16, 0.12, 0);
        tono("triangle", 1046, 1046, 0.08, 0.03, 0.04);
    }

    function lanza() {
        if (!ctx || mudo) return;
        tono("sine", 300, 1200, 0.35, 0.05, 0);
    }

    /** Fuego artificial de papel: un "puf" y crujido de papel. */
    function fuego() {
        if (!ctx || mudo) return;
        soplo(0.4, 0.09, 3200, 900, 0);
        tono("sine", 180, 90, 0.18, 0.08, 0);
        for (var i = 0; i < 4; i++) bip(1400 + Math.random() * 1600, 0.018, 0.08 + i * 0.05);
    }

    /** Paso de nivel: arpegio corto. */
    function nivel() {
        desbloquear();
        [523, 659, 784, 1046].forEach(function (f, i) { tono("triangle", f, f, 0.2, 0.1, i * 0.1); });
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

    function pitidoEstacion() {
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
        // zumbido suave de la estación con un leve vaivén
        var g = ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.035, ahora(), 1);
        var lfo = ctx.createOscillator();
        var lfoG = ctx.createGain();
        lfo.frequency.value = 0.15;
        lfoG.gain.value = 0.012;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        var osc = [130.8, 196, 261.6].map(function (f, i) {
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
        pitidosTimer = setInterval(function () { if (Math.random() < 0.5) pitidoEstacion(); }, 3000);
    }

    /** Fanfarria alegre de la escena final (en bucle hasta musica(false)). */
    function musica(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;
        var escala = [523, 659, 784, 1046, 880, 784, 659, 784, 587, 698, 880, 1175, 988, 880, 784, 659];
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = escala[paso % escala.length];
            paso += 1;
            tono("square", f, f, 0.18, 0.025, 0, busFondo);
            if (paso % 2 === 0) tono("triangle", f / 2, f / 2, 0.36, 0.04, 0, busFondo);
        }, 230);
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

    global.SonidosEstacion = {
        desbloquear: desbloquear,
        seleccion: seleccion,
        arrastre: arrastre,
        sobre: sobre,
        escaner: escaner,
        compuerta: compuerta,
        acierto: acierto,
        suave: suave,
        regreso: regreso,
        entra: entra,
        ding: ding,
        lanza: lanza,
        desliza: desliza,
        frena: frena,
        fuego: fuego,
        nivel: nivel,
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
