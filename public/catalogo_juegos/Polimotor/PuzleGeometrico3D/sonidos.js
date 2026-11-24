/**
 * SonidosPuzle — audio sintetizado del taller mágico de construcción (window.SonidosPuzle). Sin archivos.
 *
 * Todo cuelga de dos buses (fondo y efectos) sobre un compresor: comun/volumen.js usa
 * volumenFondo/volumenEfectos porque el nombre cumple /^Sonidos[A-Z]/. La voz de Zoe y Zeus
 * baja la música con agachar().
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.35, nivelEfectos = 0.85, mudo = false;
    var ambienteNodos = null, pitidosTimer = null, musicaTimer = null, paso = 0;
    var ultimoArrastre = 0, ultimoCerca = 0, ruidoBuf = null;

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

    /** Soplo filtrado (aire, motor, despegue). */
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

    /** Pitido digital corto. */
    function bip(f, vol, retraso) {
        tono("square", f, f, 0.07, vol, retraso);
    }

    function seleccion() {
        desbloquear();
        tono("sine", 320, 640, 0.12, 0.1, 0);       // servo que levanta la pieza
        bip(1320, 0.03, 0.08);
    }

    function arrastre() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoArrastre < 200) return;
        ultimoArrastre = t;
        tono("sine", 180 + Math.random() * 30, 160, 0.08, 0.02, 0);
    }

    /** El contorno correcto empieza a brillar: escaneo que sube. */
    function cerca() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoCerca < 900) return;
        ultimoCerca = t;
        bip(880, 0.035, 0);
        bip(1175, 0.035, 0.09);
        bip(1568, 0.035, 0.18);
    }

    /** Encaje: el bloque baja, golpe de madera hueco, asentamiento y campanita de confirmación. */
    function encaje() {
        desbloquear();
        tono("sine", 520, 180, 0.09, 0.16, 0);
        tono("triangle", 330, 140, 0.16, 0.14, 0.01);
        soplo(0.18, 0.05, 1600, 500, 0);
        tono("sine", 260, 120, 0.08, 0.08, 0.13);
        bip(1046, 0.04, 0.3);
        tono("triangle", 1568, 1568, 0.25, 0.05, 0.36);
    }

    /** Capa completa: escalera de notas hacia arriba. */
    function capa() {
        desbloquear();
        [523, 659, 784, 1046].forEach(function (f, i) {
            tono("triangle", f, f, 0.16, 0.1, i * 0.1);
            tono("sine", f * 2, f * 2, 0.12, 0.03, i * 0.1 + 0.04);
        });
    }

    /** La grúa se mueve: motor eléctrico suave. */
    function grua() {
        desbloquear();
        tono("sawtooth", 90, 140, 0.4, 0.025, 0);
        tono("sine", 180, 260, 0.4, 0.03, 0);
    }

    function acierto() {
        desbloquear();
        tono("triangle", 659, 659, 0.1, 0.1, 0);
        tono("triangle", 880, 880, 0.1, 0.1, 0.09);
        tono("triangle", 1046, 1318, 0.22, 0.12, 0.18);
    }

    /** Casi o en otro lugar: un "clonc" mecánico blando, nada que suene a error. */
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

    /** Giro de un bloque: trinquete de madera de tres dientes. */
    function girar() {
        desbloquear();
        for (var i = 0; i < 3; i++) tono("square", 520 - i * 40, 420 - i * 40, 0.04, 0.035, i * 0.05);
        tono("sine", 260, 330, 0.16, 0.05, 0);
    }

    /** La pieza quedó derecha: dos notas que suben. */
    function derecha() {
        desbloquear();
        bip(988, 0.04, 0);
        bip(1318, 0.04, 0.08);
    }

    /** Cerca de la ranura pero torcida: un "¿hm?" suave que baja y sube. */
    function cercaGiro() {
        if (!ctx || mudo) return;
        var t = performance.now();
        if (t - ultimoCerca < 900) return;
        ultimoCerca = t;
        tono("triangle", 520, 440, 0.12, 0.05, 0);
        tono("triangle", 440, 560, 0.14, 0.05, 0.13);
    }

    /** Pieza con candado: un toc-toc de madera, sin nada que suene a error. */
    function bloqueada() {
        desbloquear();
        tono("sine", 380, 300, 0.07, 0.07, 0);
        tono("sine", 380, 300, 0.07, 0.07, 0.12);
    }

    /** Escáner: barrido que sube y un bip de hallazgo. */
    function escaner() {
        desbloquear();
        tono("sine", 300, 1500, 0.8, 0.04, 0);
        soplo(0.8, 0.03, 600, 3000, 0);
        bip(1760, 0.05, 0.85);
    }

    /** Una máquina del laboratorio se activa: golpe de prensa y vapor. */
    function maquina() {
        desbloquear();
        tono("sine", 110, 55, 0.18, 0.16, 0);
        soplo(0.4, 0.06, 1400, 500, 0.05);
        tono("square", 220, 180, 0.06, 0.03, 0.2);
    }

    /** Nivel completo: el laboratorio se enciende. */
    function nivel() {
        desbloquear();
        tono("sawtooth", 90, 260, 0.9, 0.05, 0);
        for (var i = 0; i < 6; i++) bip(660 + i * 130, 0.04, 0.15 + i * 0.12);
    }

    /** Cinemática: energía que sube por los tubos. */
    function energia() {
        desbloquear();
        tono("sine", 80, 320, 1.8, 0.1, 0);
        tono("sawtooth", 60, 180, 1.8, 0.04, 0);
        soplo(1.8, 0.05, 200, 1400, 0);
    }

    /** El robot se enciende. */
    function encendido(n) {
        desbloquear();
        tono("sawtooth", 70, 220, 1.0, 0.06, 0);
        tono("sine", 110, 440, 1.0, 0.08, 0);
        for (var i = 0; i < (n || 6); i++) bip(660 + i * 120, 0.04, 0.2 + i * 0.12);
        tono("triangle", 1318, 1318, 0.3, 0.06, 1.0);
    }

    /** Servos que mueven brazos o cabeza. */
    function movimiento() {
        desbloquear();
        tono("sawtooth", 180, 360, 0.5, 0.035, 0);
        tono("sawtooth", 360, 200, 0.5, 0.035, 0.55);
    }

    /** Paso del robot: golpe metálico blando. */
    function paso() {
        desbloquear();
        tono("sine", 160, 70, 0.14, 0.14, 0);
        tono("square", 900, 400, 0.04, 0.02, 0.01);
    }

    function salto() {
        desbloquear();
        tono("sine", 300, 900, 0.3, 0.07, 0);
        tono("sine", 300, 900, 0.3, 0.07, 0.62);
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

    function pitidoTaller() {
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
        // zumbido grave del taller con un leve vaivén
        var g = ctx.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.04, ahora(), 1);
        var lfo = ctx.createOscillator();
        var lfoG = ctx.createGain();
        lfo.frequency.value = 0.12;
        lfoG.gain.value = 0.014;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        var osc = [110, 165, 220.5].map(function (f, i) {
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
        pitidosTimer = setInterval(function () { if (Math.random() < 0.5) pitidoTaller(); }, 2800);
    }

    function musica(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;
        var escala = [523, 659, 784, 1046, 880, 784, 659, 784];
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = escala[paso % escala.length];
            paso += 1;
            tono("square", f, f, 0.18, 0.025, 0, busFondo);
            if (paso % 2 === 0) tono("triangle", f / 2, f / 2, 0.36, 0.04, 0, busFondo);
        }, 240);
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

    global.SonidosPuzle = {
        desbloquear: desbloquear,
        seleccion: seleccion,
        arrastre: arrastre,
        cerca: cerca,
        encaje: encaje,
        capa: capa,
        grua: grua,
        acierto: acierto,
        suave: suave,
        regreso: regreso,
        girar: girar,
        derecha: derecha,
        cercaGiro: cercaGiro,
        bloqueada: bloqueada,
        escaner: escaner,
        maquina: maquina,
        nivel: nivel,
        energia: energia,
        encendido: encendido,
        movimiento: movimiento,
        paso: paso,
        salto: salto,
        celebrar: victoria,
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
