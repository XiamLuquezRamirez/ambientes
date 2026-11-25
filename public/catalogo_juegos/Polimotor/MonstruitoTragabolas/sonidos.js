/**
 * SonidosMonstruo — audio sintetizado de "Alimenta al Monstruito Tragabolas" (window.SonidosMonstruo).
 * Sin archivos: si no hay Web Audio, todo queda en silencio sin errores.
 *
 * Dos buses (fondo y efectos) sobre un compresor suave: comun/volumen.js usa volumenFondo/volumenEfectos. La voz de
 * Zoe y Zeus baja la música con agachar(). Todo es suave y gracioso (pops, ¡ñam!, campanitas, resortes): nada de
 * alarmas ni sonidos de error. Los sonidos repetidos tienen un tope para no amontonarse.
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.3, nivelEfectos = 0.85, mudo = false;
    var ruidoBuf = null;
    var ultimo = {};
    var PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

    function crear() {
        if (ctx && ctx.state !== "closed") return ctx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 5;
        comp.attack.value = 0.005;
        comp.release.value = 0.25;
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
        try {
            crear();
            if (ctx && ctx.state === "suspended") ctx.resume();
        } catch (e) { /* sin audio */ }
        return ctx;
    }

    function ahora() { return ctx ? ctx.currentTime : 0; }

    /** Evita que el mismo sonido se dispare muchas veces seguidas. */
    function libre(nombre, ms) {
        var t = Date.now();
        if (ultimo[nombre] && t - ultimo[nombre] < ms) return false;
        ultimo[nombre] = t;
        return true;
    }

    function tono(tipo, f0, f1, dur, vol, retraso) {
        if (!ctx || mudo) return;
        var t = ahora() + (retraso || 0);
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = tipo;
        o.frequency.setValueAtTime(Math.max(30, f0), t);
        if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(busEfectos);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    function campana(f, vol, retraso, dur) {
        tono("sine", f, f, dur || 0.9, vol, retraso);
        tono("sine", f * 2.01, f * 2.01, (dur || 0.9) * 0.6, vol * 0.35, retraso);
        tono("triangle", f * 3, f * 3, (dur || 0.9) * 0.25, vol * 0.12, retraso);
    }

    function ruido() {
        if (ruidoBuf && ruidoBuf.sampleRate === ctx.sampleRate) return ruidoBuf;
        var n = Math.floor(ctx.sampleRate * 1.5);
        ruidoBuf = ctx.createBuffer(1, n, ctx.sampleRate);
        var d = ruidoBuf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return ruidoBuf;
    }

    function soplo(dur, vol, f0, f1, retraso, tipoFiltro) {
        if (!ctx || mudo) return;
        var t = ahora() + (retraso || 0);
        var src = ctx.createBufferSource();
        src.buffer = ruido();
        src.loop = true;
        var fil = ctx.createBiquadFilter();
        fil.type = tipoFiltro || "bandpass";
        fil.Q.value = 1.2;
        fil.frequency.setValueAtTime(f0, t);
        fil.frequency.exponentialRampToValueAtTime(Math.max(40, f1 || f0), t + dur);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(fil);
        fil.connect(g);
        g.connect(busEfectos);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    // ------------------------------------------------------------------ efectos

    /** Botones: toque suave. */
    function boton() { tono("sine", 880, 880, 0.09, 0.07); tono("sine", 1318.5, 1318.5, 0.06, 0.035, 0.03); }

    /** Seleccionar una bola: "pop" blandito que sube. */
    function seleccion() {
        if (!libre("sel", 120)) return;
        tono("sine", 330, 620, 0.12, 0.13);
        tono("triangle", 660, 990, 0.08, 0.04, 0.03);
    }

    /** Mientras desliza: un roce muy suave (con tope). */
    function estira(d) {
        if (!libre("estira", 130)) return;
        tono("sine", 300 + Math.min(200, d || 0) * 2, 360 + Math.min(200, d || 0) * 2.4, 0.08, 0.035);
    }

    /** ¡Zas! Impulso del lanzamiento: soplido que sube. */
    function lanzar() {
        soplo(0.42, 0.16, 500, 2600);
        tono("sine", 260, 780, 0.28, 0.08);
    }

    /** ¡Ñam! La bola entra en la boca. */
    function nam() {
        tono("sine", 520, 140, 0.16, 0.22);
        soplo(0.12, 0.1, 900, 300, 0, "lowpass");
        tono("triangle", 180, 120, 0.1, 0.08, 0.05);
    }

    /** Masticación divertida: tres mordiscos con "crunch" blandito y un "mmm". */
    function masticar() {
        [0.22, 0.5, 0.78].forEach(function (r, i) {
            soplo(0.09, 0.09, 1400 - i * 150, 600, r, "bandpass");
            tono("sine", 240 - i * 15, 150, 0.09, 0.09, r);
        });
        // "mmm" de satisfacción
        tono("sine", 220, 260, 0.45, 0.06, 1.05);
        tono("sine", 330, 390, 0.45, 0.025, 1.05);
    }

    /** Campanitas de acierto (cambian de tono con el número de bola). */
    function campanitas(n) {
        var k = Number(n) || 0;
        var base = PENTA[k % 5];
        [0, 4, 7, 12].forEach(function (s, i) { campana(base * Math.pow(2, s / 12), 0.07, 0.25 + i * 0.09, 0.9); });
    }

    function estrellas() {
        if (!libre("estrellas", 200)) return;
        for (var i = 0; i < 5; i++) tono("sine", 1400 + Math.random() * 900, 2200 + Math.random() * 600, 0.12, 0.03, i * 0.06);
    }

    /** ¡Boing! Rebote cómico de resorte (fuerza 0..1). */
    function rebote(fuerza) {
        var f = Math.max(0.3, Number(fuerza) || 1);
        if (!ctx || mudo) return;
        var t = ahora();
        var o = ctx.createOscillator();
        var lfo = ctx.createOscillator();
        var lfoG = ctx.createGain();
        var g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(180, t);
        o.frequency.exponentialRampToValueAtTime(420, t + 0.35);
        lfo.frequency.setValueAtTime(18, t);
        lfoG.gain.setValueAtTime(60, t);
        lfo.connect(lfoG);
        lfoG.connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12 * f, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g);
        g.connect(busEfectos);
        o.start(t); lfo.start(t);
        o.stop(t + 0.45); lfo.stop(t + 0.45);
    }

    /** La bola vuelve saltando a la bandeja. */
    function regreso() {
        tono("sine", 392, 784, 0.3, 0.06);
        tono("sine", 784, 1046.5, 0.18, 0.04, 0.32);
    }

    /** El monstruito se muda a su nuevo lugar dando n saltitos (1,6 s en total). */
    function saltitos(n) {
        var k = Math.max(2, Math.min(4, Number(n) || 3));
        for (var i = 0; i < k; i++) {
            var r = (i + 0.5) * 1.6 / k;
            tono("sine", 300 + i * 40, 520 + i * 60, 0.16, 0.07, r - 0.12);
            tono("triangle", 180, 120, 0.08, 0.05, r + 0.18);
        }
    }

    /** Risita del monstruito cuando la bola pasa de largo. */
    function risita() {
        if (!libre("risa", 600)) return;
        [0, 0.12, 0.24].forEach(function (r, i) { tono("sine", 520 - i * 30, 440 - i * 30, 0.09, 0.05, r); });
    }

    function aparece(i) {
        var f = PENTA[(Number(i) || 0) % PENTA.length];
        tono("sine", f * 0.5, f, 0.16, 0.08);
        campana(f, 0.03, 0.08, 0.4);
    }

    function guia() {
        campana(659.25, 0.04, 0, 0.6);
        campana(880, 0.035, 0.14, 0.6);
    }

    function transicion() {
        soplo(0.9, 0.07, 400, 2400);
        [523.25, 659.25, 783.99].forEach(function (f, i) { campana(f, 0.04, 0.3 + i * 0.1, 0.6); });
    }

    function victoria() {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { campana(f, 0.09, i * 0.12, 1.1); });
        campana(1318.5, 0.06, 0.55, 1.4);
    }

    function fanfarria() {
        var notas = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
        notas.forEach(function (f, i) {
            tono("triangle", f, f, 0.32, 0.07, i * 0.15);
            tono("sine", f / 2, f / 2, 0.32, 0.04, i * 0.15);
        });
    }

    function destello() {
        if (!libre("destello", 150)) return;
        soplo(0.3, 0.05, 3000, 6000);
        campana(1568 + Math.random() * 400, 0.04, 0.05, 0.6);
    }

    function pausa(on) {
        if (on) { tono("sine", 660, 440, 0.2, 0.07); } else { tono("sine", 440, 660, 0.2, 0.07); }
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
        busFondo.gain.setTargetAtTime(on ? nivelFondo * 0.3 : nivelFondo, ahora(), 0.15);
    }

    function detenerTodo() { silenciar(true); }

    function reanudar() {
        desbloquear();
        silenciar(false);
    }

    global.SonidosMonstruo = {
        desbloquear: desbloquear,
        boton: boton,
        seleccion: seleccion,
        estira: estira,
        lanzar: lanzar,
        nam: nam,
        masticar: masticar,
        campanitas: campanitas,
        estrellas: estrellas,
        rebote: rebote,
        regreso: regreso,
        risita: risita,
        saltitos: saltitos,
        aparece: aparece,
        guia: guia,
        transicion: transicion,
        victoria: victoria,
        fanfarria: fanfarria,
        destello: destello,
        pausa: pausa,
        volumenFondo: volumenFondo,
        volumenEfectos: volumenEfectos,
        silenciar: silenciar,
        agachar: agachar,
        detenerTodo: detenerTodo,
        reanudar: reanudar
    };
})(typeof window !== "undefined" ? window : global);
