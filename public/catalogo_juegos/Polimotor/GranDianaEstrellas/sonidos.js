/**
 * SonidosDiana — audio sintetizado de "La Gran Diana de Estrellas" (window.SonidosDiana).
 * Sin archivos: si no hay Web Audio, todo queda en silencio sin errores.
 *
 * Dos buses (fondo y efectos) sobre un compresor suave: comun/volumen.js usa volumenFondo/volumenEfectos. La voz de
 * Zoe y Zeus baja la música con agachar(). Todo es mágico y festivo (destellos, campanitas, organillo de feria): nada de
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

    /** La estrella aparece: barrido mágico hacia arriba con campanita. */
    function aparece(i) {
        if (!libre("aparece", 300)) return;
        var f = PENTA[(Number(i) || 0) % 5];
        soplo(0.6, 0.05, 600, 4200);
        tono("sine", f * 0.5, f * 1.5, 0.5, 0.06);
        campana(f * 2, 0.05, 0.42, 1.1);
    }

    /** Brillo mágico (destellos agudos). */
    function brillo() {
        if (!libre("brillo", 220)) return;
        for (var i = 0; i < 5; i++) tono("sine", 1600 + Math.random() * 1200, 2400 + Math.random() * 900, 0.12, 0.025, i * 0.05);
    }

    /** El dedo baja sobre la estrella: "tin" corto (respuesta inmediata). */
    function presiona() {
        if (!libre("presiona", 120)) return;
        tono("triangle", 1046.5, 1318.5, 0.08, 0.06);
    }

    /** Toque correcto: acorde brillante. */
    function acierto(n) {
        var base = PENTA[(Number(n) || 0) % 5];
        tono("triangle", base, base * 2, 0.14, 0.12);
        [0, 4, 7].forEach(function (s, i) { campana(base * 2 * Math.pow(2, s / 12), 0.07, 0.06 + i * 0.03, 0.8); });
    }

    /** Explosión de partículas: "puf" con chisporroteo. */
    function explosion() {
        soplo(0.5, 0.14, 2400, 300, 0, "lowpass");
        tono("sine", 180, 60, 0.3, 0.12);
        for (var i = 0; i < 8; i++) soplo(0.05, 0.05, 3000 + Math.random() * 3000, 5000, 0.12 + i * 0.045 + Math.random() * 0.03, "highpass");
    }

    /** Campanitas que suben (cambian con el número de estrella). */
    function campanitas(n) {
        var k = Number(n) || 0;
        var base = PENTA[k % 5];
        [0, 4, 7, 12].forEach(function (s, i) { campana(base * Math.pow(2, s / 12), 0.06, 0.22 + i * 0.09, 0.9); });
    }

    /** Organillo de feria: frase alegre corta. */
    function feria() {
        if (!libre("feria", 900)) return;
        var notas = [783.99, 659.25, 783.99, 1046.5, 987.77, 1046.5];
        notas.forEach(function (f, i) {
            tono("square", f, f, 0.12, 0.022, 0.5 + i * 0.11);
            tono("sine", f / 2, f / 2, 0.12, 0.04, 0.5 + i * 0.11);
        });
    }

    /** Toque fuera de la estrella: burbujita suave (nada de error). */
    function onda() {
        if (!libre("onda", 160)) return;
        tono("sine", 520, 700, 0.12, 0.04);
    }

    /** La estrella se apaga sola: tres notas suaves que bajan. */
    function apaga() {
        [880, 783.99, 659.25].forEach(function (f, i) { tono("sine", f, f * 0.98, 0.3, 0.035, i * 0.14); });
    }

    function guia() {
        campana(659.25, 0.04, 0, 0.6);
        campana(880, 0.035, 0.14, 0.6);
    }

    function transicion() {
        soplo(0.9, 0.07, 400, 2400);
        [523.25, 659.25, 783.99].forEach(function (f, i) { campana(f, 0.04, 0.3 + i * 0.1, 0.6); });
    }

    /** Luces de la feria que se encienden en secuencia. */
    function luces() {
        if (!libre("luces", 400)) return;
        for (var i = 0; i < 6; i++) tono("sine", 1046.5 + i * 130, 1046.5 + i * 130, 0.07, 0.025, i * 0.07);
    }

    function fuegos() {
        if (!libre("fuegos", 250)) return;
        soplo(0.35, 0.05, 800, 3000, 0, "bandpass");
        soplo(0.6, 0.09, 3000, 400, 0.35, "lowpass");
        for (var i = 0; i < 6; i++) soplo(0.04, 0.035, 5000, 6000, 0.45 + i * 0.06 + Math.random() * 0.04, "highpass");
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

    global.SonidosDiana = {
        desbloquear: desbloquear,
        boton: boton,
        aparece: aparece,
        brillo: brillo,
        presiona: presiona,
        acierto: acierto,
        explosion: explosion,
        campanitas: campanitas,
        feria: feria,
        onda: onda,
        apaga: apaga,
        guia: guia,
        transicion: transicion,
        luces: luces,
        fuegos: fuegos,
        victoria: victoria,
        fanfarria: fanfarria,
        pausa: pausa,
        volumenFondo: volumenFondo,
        volumenEfectos: volumenEfectos,
        silenciar: silenciar,
        agachar: agachar,
        detenerTodo: detenerTodo,
        reanudar: reanudar
    };
})(typeof window !== "undefined" ? window : global);
