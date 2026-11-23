/**
 * SonidosCanasta — audio sintetizado de la habitación de juegos (window.SonidosCanasta).
 * Sin archivos. volumen.js reparte fondo y efectos porque el nombre cumple /^Sonidos[A-Z]/.
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.4, nivelEfectos = 0.85, mudo = false;
    var ambienteNodos = null, musicaTimer = null, paso = 0;
    var ultimoArrastre = 0;

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

    function seleccion() {
        desbloquear();
        tono("triangle", 520, 780, 0.12, 0.12, 0);
        tono("sine", 780, 1040, 0.1, 0.06, 0.04);
    }

    function arrastre() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoArrastre < 160) return;
        ultimoArrastre = t;
        tono("sine", 180, 140, 0.07, 0.03, 0);
    }

    function guardar() {
        desbloquear();
        tono("sine", 523, 659, 0.12, 0.14, 0);
        tono("triangle", 784, 988, 0.16, 0.1, 0.08);
    }

    function acierto() {
        desbloquear();
        tono("triangle", 523, 523, 0.1, 0.1, 0);
        tono("triangle", 659, 659, 0.1, 0.1, 0.09);
        tono("triangle", 784, 1046, 0.18, 0.12, 0.18);
    }

    function victoria() {
        desbloquear();
        var notas = [523, 659, 784, 1046, 784, 1046, 1318];
        notas.forEach(function (f, i) {
            tono("triangle", f, f, 0.22, 0.12, i * 0.14);
            tono("sine", f / 2, f / 2, 0.22, 0.05, i * 0.14);
        });
    }

    function ambiente(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (ambienteNodos) {
                ambienteNodos.g.gain.setTargetAtTime(0.0001, ahora(), 0.3);
                ambienteNodos = null;
            }
            return;
        }
        if (ambienteNodos) return;
        var o1 = ctx.createOscillator();
        var o2 = ctx.createOscillator();
        o1.type = "sine";
        o2.type = "triangle";
        o1.frequency.value = 196;
        o2.frequency.value = 247;
        var g = ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.045, ahora(), 0.8);
        o1.connect(g);
        o2.connect(g);
        g.connect(busFondo);
        o1.start();
        o2.start();
        ambienteNodos = { o1: o1, o2: o2, g: g };
    }

    function musica(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;
        var escala = [523, 587, 659, 784, 659, 587];
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = escala[paso % escala.length];
            paso += 1;
            tono("sine", f, f, 0.45, 0.04, 0, busFondo);
        }, 700);
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
        var dest = on ? nivelFondo * 0.28 : nivelFondo;
        busFondo.gain.setTargetAtTime(dest, ahora(), 0.15);
    }

    function detenerTodo() {
        ambiente(false);
        musica(false);
        silenciar(true);
    }

    global.SonidosCanasta = {
        desbloquear: desbloquear,
        seleccion: seleccion,
        arrastre: arrastre,
        guardar: guardar,
        acierto: acierto,
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
