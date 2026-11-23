/**
 * SonidosArbol — audio sintetizado del bosque mágico (window.SonidosArbol). Sin archivos.
 *
 * Todo cuelga de dos buses (fondo y efectos) sobre un compresor: comun/volumen.js usa
 * volumenFondo/volumenEfectos porque el nombre cumple /^Sonidos[A-Z]/. La voz de Zoe y Zeus
 * baja la música con agachar().
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.4, nivelEfectos = 0.85, mudo = false;
    var ambienteNodos = null, pajarosTimer = null, musicaTimer = null, paso = 0;
    var ultimoArrastre = 0, ultimoCerca = 0;

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
        o.frequency.setValueAtTime(Math.max(40, f0), t);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(bus || busEfectos);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    /** Campanita: fundamental + armónico inarmónico, como un xilófono de cristal. */
    function campana(f, vol, retraso) {
        tono("sine", f, f, 0.6, vol, retraso);
        tono("sine", f * 2.76, f * 2.76, 0.28, vol * 0.35, retraso);
    }

    function seleccion() {
        desbloquear();
        tono("triangle", 440, 700, 0.12, 0.12, 0);
        campana(1046, 0.05, 0.05);
    }

    function arrastre() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoArrastre < 180) return;
        ultimoArrastre = t;
        tono("sine", 260 + Math.random() * 40, 220, 0.06, 0.022, 0);
    }

    /** El molde correcto empieza a brillar. */
    function cerca() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoCerca < 900) return;
        ultimoCerca = t;
        campana(1318, 0.06, 0);
        campana(1568, 0.05, 0.08);
    }

    function encaje() {
        desbloquear();
        tono("sine", 160, 90, 0.14, 0.2, 0);          // "clac" de la pieza que entra
        tono("triangle", 523, 1046, 0.18, 0.1, 0.04);
        [1046, 1318, 1568, 2093].forEach(function (f, i) { campana(f, 0.07, 0.1 + i * 0.07); });
    }

    function acierto() {
        desbloquear();
        tono("triangle", 523, 523, 0.1, 0.1, 0);
        tono("triangle", 659, 659, 0.1, 0.1, 0.09);
        tono("triangle", 784, 1046, 0.2, 0.12, 0.18);
    }

    /** Intento en otro molde: un "boing" blando, nada que suene a error. */
    function suave() {
        desbloquear();
        tono("sine", 330, 250, 0.16, 0.08, 0);
        tono("sine", 250, 300, 0.16, 0.06, 0.13);
    }

    function regreso() {
        desbloquear();
        tono("sine", 520, 380, 0.22, 0.05, 0);
    }

    function victoria() {
        desbloquear();
        var notas = [523, 659, 784, 1046, 784, 1046, 1318, 1568];
        notas.forEach(function (f, i) {
            tono("triangle", f, f, 0.24, 0.11, i * 0.13);
            tono("sine", f / 2, f / 2, 0.24, 0.05, i * 0.13);
        });
        for (var k = 0; k < 10; k++) campana(1568 + Math.random() * 1200, 0.03, 1.1 + k * 0.08);
    }

    function pajaro() {
        if (!ctx || mudo) return;
        var base = 2200 + Math.random() * 900;
        var n = 2 + Math.floor(Math.random() * 3);
        for (var i = 0; i < n; i++) {
            tono("sine", base, base * 1.25, 0.07, 0.018, i * 0.11, busFondo);
        }
    }

    function ambiente(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (ambienteNodos) {
                ambienteNodos.g.gain.setTargetAtTime(0.0001, ahora(), 0.3);
                ambienteNodos = null;
            }
            if (pajarosTimer) { clearInterval(pajarosTimer); pajarosTimer = null; }
            return;
        }
        if (ambienteNodos) return;
        // pad suave del bosque (acorde de Do mayor muy bajo) con un leve trémolo
        var g = ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.035, ahora(), 1);
        var lfo = ctx.createOscillator();
        var lfoG = ctx.createGain();
        lfo.frequency.value = 0.18;
        lfoG.gain.value = 0.012;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        var osc = [196, 247, 294].map(function (f, i) {
            var o = ctx.createOscillator();
            o.type = i === 1 ? "triangle" : "sine";
            o.frequency.value = f;
            o.connect(g);
            o.start();
            return o;
        });
        g.connect(busFondo);
        lfo.start();
        ambienteNodos = { osc: osc, g: g, lfo: lfo };
        pajarosTimer = setInterval(function () { if (Math.random() < 0.55) pajaro(); }, 2600);
    }

    function musica(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;
        var escala = [523, 659, 784, 659, 880, 784, 659, 587];
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = escala[paso % escala.length];
            paso += 1;
            tono("triangle", f, f, 0.32, 0.045, 0, busFondo);
            if (paso % 2 === 0) tono("sine", f / 2, f / 2, 0.4, 0.03, 0, busFondo);
        }, 330);
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

    global.SonidosArbol = {
        desbloquear: desbloquear,
        seleccion: seleccion,
        arrastre: arrastre,
        cerca: cerca,
        encaje: encaje,
        acierto: acierto,
        suave: suave,
        regreso: regreso,
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
