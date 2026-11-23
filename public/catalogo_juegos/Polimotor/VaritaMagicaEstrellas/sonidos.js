/**
 * SonidosVarita — audio sintetizado del cielo mágico (window.SonidosVarita). Sin archivos: si no hay Web Audio,
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
    var ambienteNodos = null, musicaTimer = null, paso = 0, ruidoBuf = null;
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
        ambienteNodos = null;
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

    /** La varita se activa: brillo que sube. */
    function varita() {
        desbloquear();
        soplo(0.35, 0.05, 2500, 7000, 0);
        [1046.5, 1318.5, 1568].forEach(function (f, i) { tono("sine", f, f, 0.25, 0.07, i * 0.05); });
    }

    /** Polvo mágico mientras se traza: tintineo suave y espaciado (no se repite a cada cuadro). */
    function polvo(avance) {
        if (!ctx || mudo) return;
        var t = Date.now();
        if (t - ultimoPolvo < 110 || !(avance > 0)) return;
        ultimoPolvo = t;
        var f = PENTA[3 + Math.floor(Math.random() * 5)] * 2;
        tono("sine", f, f, 0.2, 0.12, 0);
        tono("triangle", f * 1.5, f * 1.5, 0.1, 0.045, 0.03);
    }

    /** Estrella encendida: campanita que sube con cada estrella (i = 0, 1, 2…). */
    function estrella(i, ultima) {
        desbloquear();
        var f = PENTA[Math.min(PENTA.length - 1, i || 0)];
        campana(f, 0.12, 0, 1.0);
        tono("sine", f * 1.5, f * 1.5, 0.3, 0.04, 0.08);
        if (ultima) [0, 2, 4].forEach(function (k, j) { campana(PENTA[k] * 2, 0.06, 0.18 + j * 0.09, 0.8); });
    }

    /** Salida del carril: "uuu" suave, nunca un error. */
    function fuera() {
        desbloquear();
        tono("sine", 520, 390, 0.3, 0.05, 0);
    }

    function vuelve() {
        desbloquear();
        tono("sine", 440, 660, 0.18, 0.05, 0);
    }

    function pausa() {
        desbloquear();
        tono("triangle", 784, 659, 0.22, 0.04, 0);
    }

    function aparece() {
        desbloquear();
        soplo(0.8, 0.04, 800, 4000, 0);
        [523.25, 659.25, 783.99].forEach(function (f, i) { campana(f * 2, 0.04, i * 0.12, 0.6); });
    }

    function toque() {
        desbloquear();
        tono("sine", 988, 784, 0.12, 0.05, 0);
    }

    function ayuda() {
        desbloquear();
        [1318.5, 1568, 1318.5].forEach(function (f, i) { tono("sine", f, f, 0.18, 0.035, i * 0.12); });
    }

    /** La luna despierta y sonríe. */
    function luna() {
        desbloquear();
        campana(392, 0.09, 0, 1.4);
        campana(587.33, 0.07, 0.25, 1.2);
        campana(783.99, 0.06, 0.5, 1.2);
    }

    /** Nivel terminado: la curva se llena de luz y la figura aparece. */
    function figura() {
        desbloquear();
        soplo(1.2, 0.05, 600, 6000, 0);
        PENTA.slice(0, 6).forEach(function (f, i) { campana(f, 0.06, 0.1 + i * 0.09, 0.8); });
    }

    function victoria() {
        desbloquear();
        var notas = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
        notas.forEach(function (f, i) {
            tono("triangle", f, f, 0.26, 0.08, i * 0.14);
            tono("sine", f / 2, f / 2, 0.3, 0.04, i * 0.14);
        });
        for (var k = 0; k < 6; k++) campana(1568 + Math.random() * 900, 0.025, 1.0 + k * 0.1, 0.5);
    }

    /** Explosión de luz del final: soplo grande que sube y lluvia de campanitas. */
    function explosion() {
        desbloquear();
        tono("sine", 140, 70, 0.5, 0.12, 0);
        soplo(1.4, 0.09, 400, 8000, 0);
        for (var k = 0; k < 10; k++) campana(PENTA[k % PENTA.length] * 2, 0.03, 0.2 + k * 0.08, 0.6);
    }

    function fanfarria() {
        desbloquear();
        var notas = [[523.25, 0], [659.25, 0.18], [783.99, 0.36], [1046.5, 0.6], [987.77, 0.9], [1046.5, 1.05], [1318.5, 1.3]];
        notas.forEach(function (n) {
            tono("triangle", n[0], n[0], 0.34, 0.08, n[1]);
            tono("sine", n[0] / 2, n[0] / 2, 0.4, 0.05, n[1]);
        });
        campana(2093, 0.04, 1.5, 1.4);
    }

    // ------------------------------------------------------------------ fondo

    /** Ambiente: un colchón muy suave de notas largas. */
    function ambiente(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (ambienteNodos) {
                ambienteNodos.g.gain.setTargetAtTime(0.0001, ahora(), 0.3);
                var viejo = ambienteNodos;
                setTimeout(function () { viejo.osc.forEach(function (o) { try { o.stop(); } catch (e) { /* ya parado */ } }); }, 1500);
                ambienteNodos = null;
            }
            return;
        }
        if (ambienteNodos) return;
        var g = ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.03, ahora(), 1.2);
        // el trémolo va en un nodo intermedio: si el volumen base es 0 no queda zumbando
        var trem = ctx.createGain();
        trem.gain.value = 0.8;
        var lfo = ctx.createOscillator();
        var lfoG = ctx.createGain();
        lfo.frequency.value = 0.12;
        lfoG.gain.value = 0.2;
        lfo.connect(lfoG);
        lfoG.connect(trem.gain);
        var osc = [261.63, 392, 523.25, 659.25].map(function (f, i) {
            var o = ctx.createOscillator();
            o.type = "sine";
            o.frequency.value = f;
            o.detune.value = (i - 1.5) * 4;
            o.connect(trem);
            o.start();
            return o;
        });
        trem.connect(g);
        g.connect(busFondo);
        lfo.start();
        osc.push(lfo);
        ambienteNodos = { osc: osc, g: g };
    }

    /** Cajita de música para la celebración final. */
    function musica(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;
        var melodia = [783.99, 659.25, 783.99, 1046.5, 880, 783.99, 659.25, 587.33, 659.25, 783.99, 659.25, 523.25];
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = melodia[paso % melodia.length];
            paso += 1;
            tono("triangle", f, f, 0.26, 0.035, 0, busFondo);
            if (paso % 3 === 1) tono("sine", f / 2, f / 2, 0.5, 0.04, 0, busFondo);
        }, 280);
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

    /** La página se ocultó (cambio de ventana o de pestaña): silencio sin perder nada. */
    function detenerTodo() {
        ambiente(false);
        musica(false);
        silenciar(true);
    }

    /**
     * La página vuelve a verse: se quita el silencio de detenerTodo() y se despierta el contexto (el navegador lo
     * pudo suspender). volumen.js vuelve a aplicar después el mudo del niño, si lo tenía.
     */
    function reanudar() {
        desbloquear();
        silenciar(false);
    }

    global.SonidosVarita = {
        desbloquear: desbloquear,
        varita: varita,
        polvo: polvo,
        estrella: estrella,
        fuera: fuera,
        vuelve: vuelve,
        pausa: pausa,
        aparece: aparece,
        toque: toque,
        ayuda: ayuda,
        luna: luna,
        figura: figura,
        victoria: victoria,
        explosion: explosion,
        fanfarria: fanfarria,
        ambiente: ambiente,
        musica: musica,
        volumenFondo: volumenFondo,
        volumenEfectos: volumenEfectos,
        silenciar: silenciar,
        agachar: agachar,
        detenerTodo: detenerTodo,
        reanudar: reanudar
    };
})(typeof window !== "undefined" ? window : global);
