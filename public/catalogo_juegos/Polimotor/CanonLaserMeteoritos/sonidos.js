/**
 * SonidosCanon — audio sintetizado de "El Cañón Láser y los Meteoritos en Movimiento" (window.SonidosCanon).
 * Sin archivos: si no hay Web Audio, todo queda en silencio sin errores.
 *
 * Dos buses (fondo y efectos) sobre un compresor suave: comun/volumen.js usa volumenFondo/volumenEfectos. La voz de
 * Zoe y Zeus baja la música con agachar(). Todo es espacial y amable (zumbidos de energía, campanitas, polvo de
 * estrellas): nada de explosiones ni alarmas. Los sonidos repetidos tienen un tope para no amontonarse.
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

    function boton() { tono("sine", 880, 880, 0.09, 0.07); tono("sine", 1318.5, 1318.5, 0.06, 0.035, 0.03); }

    /** El cañón se activa (al empezar cada nivel): zumbido que sube y dos campanitas. */
    function activar() {
        tono("sine", 180, 520, 0.6, 0.05);
        tono("triangle", 360, 1040, 0.6, 0.02);
        campana(1046.5, 0.035, 0.45, 0.5);
        campana(1318.5, 0.03, 0.55, 0.6);
    }

    /** Giro del cañón: clic mecánico muy suave (con tope de repetición). */
    function giro(paso) {
        if (!libre("giro", 70)) return;
        var f = 520 + (Number(paso) || 0) * 8;
        tono("triangle", f, f * 0.92, 0.035, 0.022);
        soplo(0.03, 0.012, 2600, 2200, 0, "bandpass");
    }

    /** Carga de energía (recarga del cañón). */
    function carga(ms) {
        var d = Math.max(0.2, (Number(ms) || 650) / 1000);
        tono("sine", 300, 900, d, 0.025);
        tono("sine", 600, 1800, d, 0.01);
    }

    /** Listo para disparar: "ding" brillante. */
    function listo() {
        if (!libre("listo", 300)) return;
        campana(1567.98, 0.03, 0, 0.35);
    }

    /** Disparo láser: barrido amable (no agresivo) con brillo. */
    function disparo() {
        tono("sine", 1500, 380, 0.26, 0.09);
        tono("triangle", 900, 260, 0.2, 0.035);
        soplo(0.18, 0.04, 5000, 1500, 0, "highpass");
    }

    /** Impacto: chispazo de cristal. */
    function impacto(preciso) {
        var base = PENTA[Math.floor(Math.random() * 3) + 2];
        tono("triangle", base, base * 2, 0.12, 0.09);
        [0, 4, 7, 12].forEach(function (s, i) { campana(base * Math.pow(2, s / 12), 0.05, 0.04 + i * 0.05, 0.7); });
        if (preciso) campana(base * 4, 0.04, 0.3, 0.9);
    }

    /** Coraza rota: "clanc" metálico suave y piedritas (amable, nada de explosión). */
    function coraza() {
        tono("triangle", 1180, 900, 0.18, 0.06);
        tono("sine", 2360, 1800, 0.12, 0.03, 0.01);
        soplo(0.25, 0.05, 3000, 900, 0, "bandpass");
        for (var i = 0; i < 4; i++) tono("triangle", 500 + Math.random() * 400, 300, 0.06, 0.02, 0.06 + i * 0.05);
    }

    /** Desintegración: polvo de estrellas que se dispersa. */
    function desintegra() {
        soplo(0.7, 0.06, 6000, 1200, 0, "highpass");
        for (var i = 0; i < 6; i++) campana(PENTA[(i * 3) % PENTA.length] * 2, 0.018, 0.08 + i * 0.06, 0.4);
    }

    /** Puntos estelares: monedas de luz. */
    function recompensa(n) {
        var k = Number(n) || 0;
        var base = PENTA[k % 5];
        [0, 7, 12].forEach(function (s, i) { tono("square", base * Math.pow(2, s / 12), 0, 0.09, 0.018, 0.12 + i * 0.07); });
    }

    /** El láser se pierde en el espacio: siseo que se apaga, nada de error. */
    function pierde() {
        soplo(0.5, 0.025, 2400, 500, 0, "lowpass");
        tono("sine", 700, 500, 0.4, 0.015, 0.05);
    }

    /** Un meteorito entra al campo: zumbido lejano. */
    function entra() {
        if (!libre("entra", 600)) return;
        soplo(1.2, 0.03, 400, 900, 0, "bandpass");
    }

    /** En la mira: campanita muy suave. */
    function enMira() {
        if (!libre("enMira", 900)) return;
        campana(1318.5, 0.018, 0, 0.35);
    }

    function transicion() {
        soplo(1.0, 0.07, 300, 3200);
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { campana(f, 0.04, 0.3 + i * 0.09, 0.6); });
    }

    function victoria() {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { campana(f, 0.09, i * 0.12, 1.1); });
        campana(1318.5, 0.06, 0.55, 1.4);
    }

    function supernova() {
        soplo(2.2, 0.09, 200, 6000, 0, "bandpass");
        tono("sine", 110, 880, 1.8, 0.05);
        for (var i = 0; i < 12; i++) campana(PENTA[i % PENTA.length] * (i < 6 ? 1 : 2), 0.03, 0.6 + i * 0.09, 0.9);
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

    global.SonidosCanon = {
        desbloquear: desbloquear,
        boton: boton,
        activar: activar,
        giro: giro,
        carga: carga,
        listo: listo,
        disparo: disparo,
        impacto: impacto,
        desintegra: desintegra,
        coraza: coraza,
        recompensa: recompensa,
        pierde: pierde,
        entra: entra,
        enMira: enMira,
        transicion: transicion,
        victoria: victoria,
        supernova: supernova,
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
