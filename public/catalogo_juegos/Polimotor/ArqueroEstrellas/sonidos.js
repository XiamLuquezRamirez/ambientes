/**
 * SonidosArquero — audio sintetizado de "El Arquero de las Estrellas" (window.SonidosArquero).
 * Sin archivos: si no hay Web Audio, todo queda en silencio sin errores.
 *
 * Dos buses (fondo y efectos) sobre un compresor suave: comun/volumen.js usa volumenFondo/volumenEfectos. La voz de
 * Zoe y Zeus baja la música con agachar(). Todo es espacial y amable (cuerda de energía, campanitas, polvo de
 * estrellas): nada de golpes agresivos ni alarmas. Los sonidos repetidos tienen un tope para no amontonarse.
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
        hum = null;
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

    /** El arco se activa (al empezar cada nivel): zumbido que sube y dos campanitas. */
    function activar() {
        tono("sine", 180, 520, 0.6, 0.05);
        tono("triangle", 360, 1040, 0.6, 0.02);
        campana(1046.5, 0.035, 0.45, 0.5);
        campana(1318.5, 0.03, 0.55, 0.6);
    }

    /** El dedo toma la cuerda: "tic" suave. */
    function agarra() {
        if (!libre("agarra", 120)) return;
        tono("triangle", 660, 620, 0.05, 0.04);
    }

    // Tensión de la cuerda: un zumbido de energía que sube con la fuerza mientras se mantiene, más un crujido
    // suave cada vez que la tensión avanza un poco. Se apaga al soltar o cancelar.
    var hum = null, ultimaT = 0;

    function tension(T) {
        if (!ctx || mudo) return;
        T = Math.max(0, Math.min(1, Number(T) || 0));
        var t = ahora();
        if (!hum) {
            // zumbido grave por un filtro pasa bajos: sube solo una octava para no volverse un pitido
            var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
            o1.type = "sine";
            o2.type = "sine";
            o1.frequency.value = 120;
            o2.frequency.value = 180;
            f.type = "lowpass";
            f.frequency.value = 700;
            f.Q.value = 0.5;
            g.gain.setValueAtTime(0.0001, t);
            o1.connect(f);
            o2.connect(f);
            f.connect(g);
            g.connect(busEfectos);
            o1.start(t);
            o2.start(t);
            hum = { o1: o1, o2: o2, g: g };
        }
        hum.o1.frequency.setTargetAtTime(120 + 120 * T, t, 0.08);
        hum.o2.frequency.setTargetAtTime(180 + 180 * T, t, 0.08);
        hum.g.gain.setTargetAtTime(T < 0.02 ? 0.0001 : 0.012 + 0.022 * T, t, 0.08);
        if (Math.abs(T - ultimaT) > 0.1) {
            // crujido suave de la cuerda (antes era agudo)
            if (libre("cruje", 80)) tono("triangle", 330 + 220 * T, 300 + 200 * T, 0.04, 0.012);
            ultimaT = T;
        }
    }

    function tensionFin() {
        ultimaT = 0;
        if (!hum || !ctx) { hum = null; return; }
        var h = hum, t = ahora();
        hum = null;
        h.g.gain.setTargetAtTime(0.0001, t, 0.04);
        try { h.o1.stop(t + 0.3); h.o2.stop(t + 0.3); } catch (e) { /* ya parado */ }
    }

    /** Tensión máxima: "ding" brillante. */
    function alTope() {
        if (!libre("alTope", 400)) return;
        campana(783.99, 0.035, 0, 0.45);
        tono("sine", 523.25, 523.25, 0.2, 0.012, 0.05);
    }

    /** La cuerda vuelve sin disparar. */
    function cancela() { tono("sine", 520, 300, 0.18, 0.03); }

    /** Liberación de la cuerda (chasquido de luz) y vuelo de la flecha (silbido que se aleja). */
    function suelta(T) {
        var k = Math.max(0, Math.min(1, Number(T) || 0.5));
        tono("triangle", 240 + 160 * k, 90, 0.16, 0.08);
        tono("sine", 1400 + 600 * k, 500, 0.2, 0.05);
        soplo(0.25 + 0.3 * k, 0.035 + 0.03 * k, 5200, 1400, 0.02, "highpass");
        soplo(0.5 + 0.4 * k, 0.02, 2200, 700, 0.08, "bandpass");
    }

    /** Puntos que suben: monedas de luz. */
    function recompensa(n) {
        var k = Number(n) || 0;
        var base = PENTA[k % 5];
        [0, 7, 12].forEach(function (s, i) { tono("square", base * Math.pow(2, s / 12), 0, 0.09, 0.016, 0.3 + i * 0.07); });
    }

    /** Impacto en la diana: 10 alegre, 30 con más chispa, 50 triunfal. */
    function impacto(puntos) {
        var p = Number(puntos) || 10;
        tono("triangle", 330, 180, 0.08, 0.08);
        soplo(0.12, 0.04, 2600, 900, 0, "bandpass");
        if (p >= 50) {
            [0, 4, 7, 12, 16].forEach(function (s, i) { campana(783.99 * Math.pow(2, s / 12), 0.06, 0.05 + i * 0.07, 0.9); });
            campana(2093, 0.04, 0.45, 1.2);
            soplo(0.9, 0.04, 7000, 2000, 0.1, "highpass");
        } else if (p >= 30) {
            [0, 4, 7, 12].forEach(function (s, i) { campana(659.25 * Math.pow(2, s / 12), 0.05, 0.05 + i * 0.06, 0.7); });
        } else {
            [0, 7].forEach(function (s, i) { campana(587.33 * Math.pow(2, s / 12), 0.05, 0.05 + i * 0.08, 0.6); });
        }
        recompensa(p / 10);
    }

    /** La flecha se pierde: siseo que se apaga, nada de error. */
    function pierde() {
        soplo(0.5, 0.022, 2400, 500, 0, "lowpass");
        tono("sine", 700, 500, 0.4, 0.014, 0.05);
    }

    /** La flecha choca con un asteroide guardián: "boing" blandito de goma, nada de golpe fuerte. */
    function rebota() {
        if (!libre("rebota", 150)) return;
        tono("sine", 220, 520, 0.18, 0.07);
        tono("triangle", 440, 180, 0.22, 0.03, 0.05);
        soplo(0.15, 0.025, 1800, 600, 0, "bandpass");
    }

    /** Una flecha nueva aparece en la cuerda. */
    function recarga() {
        if (!libre("recarga", 300)) return;
        tono("sine", 500, 900, 0.18, 0.02);
        campana(1318.5, 0.015, 0.14, 0.25);
    }

    /** La diana se desliza a su nuevo lugar. */
    function desliza() {
        soplo(1.0, 0.035, 500, 1800, 0, "bandpass");
        tono("sine", 300, 600, 0.9, 0.02);
    }

    /** Estrella de celebración (i = 0, 1, 2). */
    function estrella(i) {
        var f = [1046.5, 1318.5, 1567.98][(Number(i) || 0) % 3];
        campana(f, 0.05, 0, 0.8);
    }

    /** Aparición del gran trofeo. */
    function trofeo() {
        soplo(2.0, 0.07, 300, 5000, 0, "bandpass");
        tono("sine", 220, 880, 1.6, 0.04);
        for (var i = 0; i < 10; i++) campana(PENTA[i % PENTA.length] * (i < 5 ? 1 : 2), 0.03, 0.5 + i * 0.09, 0.9);
    }

    function transicion() {
        soplo(1.0, 0.07, 300, 3200);
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { campana(f, 0.04, 0.3 + i * 0.09, 0.6); });
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
        if (on) { tensionFin(); tono("sine", 660, 440, 0.2, 0.07); } else { tono("sine", 440, 660, 0.2, 0.07); }
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

    function detenerTodo() { tensionFin(); silenciar(true); }

    function reanudar() {
        desbloquear();
        silenciar(false);
    }

    global.SonidosArquero = {
        desbloquear: desbloquear,
        boton: boton,
        activar: activar,
        agarra: agarra,
        tension: tension,
        tensionFin: tensionFin,
        alTope: alTope,
        cancela: cancela,
        suelta: suelta,
        impacto: impacto,
        recompensa: recompensa,
        pierde: pierde,
        rebota: rebota,
        recarga: recarga,
        desliza: desliza,
        estrella: estrella,
        trofeo: trofeo,
        transicion: transicion,
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
})(typeof window !== "undefined" ? window : globalThis);
