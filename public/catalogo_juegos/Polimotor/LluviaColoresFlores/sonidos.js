/**
 * SonidosLluvia — audio sintetizado del jardín (window.SonidosLluvia). Sin archivos: si no hay Web Audio,
 * todo queda en silencio sin errores.
 *
 * Dos buses (fondo y efectos) sobre un compresor suave: comun/volumen.js usa volumenFondo/volumenEfectos porque el
 * nombre cumple /^Sonidos[A-Z]/. La voz de Zoe y Zeus baja la música con agachar(). Todos los sonidos son suaves
 * (campanitas, brillos, soplos): nada de alarmas.
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.3, nivelEfectos = 0.85, mudo = false;
    var ruidoBuf = null;
    var ultimoPolvo = 0;
    // escala pentatónica: cualquier estrella suena bien con la anterior
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

    function tono(tipo, f0, f1, dur, vol, retraso, bus) {
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
        g.connect(bus || busEfectos);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    /** Campanita: fundamental + armónico brillante con caída larga. */
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
        g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.15, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(fil);
        fil.connect(g);
        g.connect(bus || busEfectos);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    // ------------------------------------------------------------------ efectos


    /** Gotita de agua: "plip" que sube un poco (i = número de gotita del carril). */
    function plip(i) {
        var n = Number(i) || 0;
        var f = PENTA[n % PENTA.length] * (n >= PENTA.length ? 1.5 : 1);
        tono("sine", f * 1.6, f * 0.9, 0.16, 0.12);
        tono("sine", f * 2.4, f * 2.4, 0.08, 0.03, 0.01);
    }

    /** Hilo de agua suave mientras el dedo baja (con límite: no satura). */
    function agua(avance) {
        var t = Date.now();
        if (t - ultimoPolvo < 140) return;
        ultimoPolvo = t;
        soplo(0.22, 0.035, 2400 - (avance || 0) * 900, 1500, 0);
    }

    /** Se toca una nube: "puf" blandito. */
    function nube() {
        soplo(0.22, 0.07, 700, 1600);
        tono("sine", 440, 660, 0.18, 0.08);
    }

    function fuera() { tono("sine", 520, 440, 0.2, 0.05); }
    function vuelve() { tono("sine", 523, 659, 0.14, 0.06); }

    /** Reintento amable: la gotita sube a su nube (glissando suave hacia arriba). */
    function reintento() {
        tono("triangle", 392, 587, 0.35, 0.06);
        tono("sine", 784, 1046, 0.3, 0.03, 0.12);
    }

    function aparece() {
        campana(784, 0.05, 0, 0.5);
        campana(1046.5, 0.04, 0.08, 0.5);
    }

    function toque() { tono("sine", 880, 880, 0.09, 0.06); tono("sine", 1318.5, 1318.5, 0.06, 0.03, 0.03); }

    function ayuda() {
        campana(659.25, 0.05, 0, 0.6);
        campana(880, 0.04, 0.14, 0.6);
    }

    /** Llegó a la flor: campanita de "listo". */
    function meta() {
        campana(1046.5, 0.08, 0, 0.6);
        campana(1318.5, 0.06, 0.06, 0.6);
    }

    /** La gota cae en la flor: salpicón. */
    function riego() {
        soplo(0.35, 0.12, 3000, 900);
        tono("sine", 900, 300, 0.18, 0.1);
        tono("sine", 1400, 700, 0.12, 0.05, 0.05);
    }

    /** La flor crece: glissando alegre y acorde. */
    function crecer(variante) {
        var base = [523.25, 587.33, 659.25][(Number(variante) || 0) % 3];
        tono("triangle", base / 2, base, 0.7, 0.07);
        [0, 2, 4, 7].forEach(function (k, i) {
            var f = base * Math.pow(2, [0, 4, 7, 12][i] / 12);
            campana(f, 0.07, 0.35 + k * 0.03 + i * 0.08, 0.9);
        });
    }

    function victoria() {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { campana(f, 0.09, i * 0.12, 1.1); });
        campana(1318.5, 0.06, 0.55, 1.4);
    }

    /** Brisa entre niveles. */
    function brisa() {
        soplo(1.6, 0.06, 500, 1200);
        soplo(1.2, 0.04, 900, 2200, 0.3);
    }

    /** Pajaritos de primavera (cinemática final). */
    function primavera() {
        for (var i = 0; i < 6; i++) {
            var r = 0.25 + i * 0.32 + Math.random() * 0.12;
            var f = 2200 + Math.random() * 900;
            tono("sine", f, f * 1.25, 0.08, 0.035, r);
            tono("sine", f * 1.1, f * 0.9, 0.09, 0.03, r + 0.1);
        }
    }

    function lluvia() {
        soplo(2.4, 0.05, 5000, 3000);
        for (var i = 0; i < 10; i++) tono("sine", 1400 + Math.random() * 900, 700, 0.1, 0.03, Math.random() * 2.2);
    }

    function fanfarria() {
        var notas = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
        notas.forEach(function (f, i) {
            tono("triangle", f, f, 0.32, 0.07, i * 0.15);
            tono("sine", f / 2, f / 2, 0.32, 0.04, i * 0.15);
        });
    }

    function medalla() {
        campana(1568, 0.08, 0, 1.2);
        campana(2093, 0.06, 0.1, 1.2);
        soplo(0.6, 0.05, 4000, 7000, 0.05);
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

    /** La página se ocultó: silencio sin perder nada (reanudar() lo deshace al volver). */
    function detenerTodo() { silenciar(true); }

    function reanudar() {
        desbloquear();
        silenciar(false);
    }

    global.SonidosLluvia = {
        desbloquear: desbloquear,
        plip: plip,
        agua: agua,
        nube: nube,
        fuera: fuera,
        vuelve: vuelve,
        reintento: reintento,
        aparece: aparece,
        toque: toque,
        ayuda: ayuda,
        meta: meta,
        riego: riego,
        crecer: crecer,
        victoria: victoria,
        brisa: brisa,
        primavera: primavera,
        lluvia: lluvia,
        fanfarria: fanfarria,
        medalla: medalla,
        volumenFondo: volumenFondo,
        volumenEfectos: volumenEfectos,
        silenciar: silenciar,
        agachar: agachar,
        detenerTodo: detenerTodo,
        reanudar: reanudar
    };
})(typeof window !== "undefined" ? window : global);
