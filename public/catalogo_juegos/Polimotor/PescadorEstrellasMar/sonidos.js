/**
 * SonidosPescador — audio sintetizado de "El Pescador de Estrellas de Mar" (window.SonidosPescador).
 * Sin archivos: si no hay Web Audio, todo queda en silencio sin errores.
 *
 * Dos buses (fondo y efectos) sobre un compresor suave: comun/volumen.js usa volumenFondo/volumenEfectos. La voz de
 * Zoe y Zeus baja la música con agachar(). Todo es marino y alegre (burbujas, chapoteos, polea, campanitas): nada de
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

    /** Una burbuja: "plop" que sube. */
    function plop(vol, retraso, f) {
        var b = f || 300 + Math.random() * 500;
        tono("sine", b, b * 2.6, 0.09, vol || 0.05, retraso || 0);
    }

    /** Burbujas: varios plops. */
    function burbujas() {
        if (!libre("burbujas", 350)) return;
        for (var i = 0; i < 5; i++) plop(0.035, i * 0.07 + Math.random() * 0.04);
    }

    /** Una estrella aparece en el fondo. */
    function aparece() {
        if (!libre("aparece", 120)) return;
        plop(0.04);
        campana(PENTA[Math.floor(Math.random() * 5)] * 2, 0.025, 0.05, 0.5);
    }

    /** Mecanismo de la polea: clics de madera. */
    function polea() {
        if (!libre("polea", 200)) return;
        for (var i = 0; i < 4; i++) {
            soplo(0.03, 0.06, 1800, 1500, i * 0.06, "bandpass");
            tono("triangle", 420 - i * 20, 380 - i * 20, 0.04, 0.04, i * 0.06);
        }
    }

    /** La cuerda baja: zumbido suave que desciende y burbujitas. */
    function baja() {
        soplo(1.1, 0.04, 900, 300, 0, "lowpass");
        tono("sine", 660, 330, 0.9, 0.03);
        for (var i = 0; i < 4; i++) plop(0.02, 0.2 + i * 0.22);
    }

    /** La cuerda sube: zumbido que asciende. */
    function sube() {
        soplo(1.1, 0.04, 300, 900, 0, "lowpass");
        tono("sine", 330, 660, 0.9, 0.03);
        for (var i = 0; i < 4; i++) plop(0.02, 0.15 + i * 0.25);
    }

    /** Chapoteo alegre (agua). */
    function chapoteo() {
        if (!libre("chapoteo", 160)) return;
        soplo(0.35, 0.12, 2200, 500, 0, "lowpass");
        soplo(0.18, 0.06, 4000, 2000, 0.03, "highpass");
        for (var i = 0; i < 4; i++) plop(0.04, 0.08 + i * 0.05, 500 + i * 160);
    }

    /** ¡Atrapada!: acorde brillante con campanitas. */
    function atrapa() {
        var base = PENTA[Math.floor(Math.random() * 3)];
        tono("triangle", base, base * 2, 0.14, 0.1);
        [0, 4, 7].forEach(function (s, i) { campana(base * 2 * Math.pow(2, s / 12), 0.06, 0.06 + i * 0.05, 0.8); });
    }

    /** La estrella salta hacia la red. */
    function salto() {
        tono("sine", 440, 1320, 0.35, 0.05);
        tono("triangle", 880, 1760, 0.2, 0.02, 0.1);
    }

    /** La estrella cae en la red: melodía corta de pesca exitosa. */
    function red(n) {
        var k = Number(n) || 0;
        var base = PENTA[k % 5];
        [0, 4, 7, 12].forEach(function (s, i) { campana(base * Math.pow(2, s / 12), 0.06, 0.1 + i * 0.09, 0.9); });
    }

    /** Fallo: el gancho toca la arena; "puf" suave y burbujitas (nada de error). */
    function arena() {
        soplo(0.3, 0.05, 700, 300, 0, "lowpass");
        plop(0.03, 0.12, 380);
        plop(0.03, 0.26, 520);
    }

    /** El gancho está sobre una estrella: campanita muy suave. */
    function cerca() {
        if (!libre("cerca", 700)) return;
        campana(1318.5, 0.02, 0, 0.4);
    }

    function transicion() {
        soplo(1.0, 0.07, 300, 2600);
        for (var i = 0; i < 8; i++) plop(0.03, 0.1 + i * 0.08);
        [523.25, 659.25, 783.99].forEach(function (f, i) { campana(f, 0.04, 0.35 + i * 0.1, 0.6); });
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

    global.SonidosPescador = {
        desbloquear: desbloquear,
        boton: boton,
        burbujas: burbujas,
        aparece: aparece,
        polea: polea,
        baja: baja,
        sube: sube,
        chapoteo: chapoteo,
        atrapa: atrapa,
        salto: salto,
        red: red,
        arena: arena,
        cerca: cerca,
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
})(typeof window !== "undefined" ? window : global);
