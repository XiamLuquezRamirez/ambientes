/**
 * SonidosTren — audio sintetizado de "El Tren de Colores y las Vías Mágicas" (window.SonidosTren). Sin archivos.
 *
 * Todo cuelga de dos buses (fondo y efectos) sobre un compresor: comun/volumen.js usa volumenFondo/volumenEfectos
 * porque el nombre cumple /^Sonidos[A-Z]/. La voz de Zoe y Zeus baja la música con agachar().
 * construir(vel) es un zumbido mágico continuo cuyo tono sube con la velocidad del trazo; traviesa() es el
 * toc-toc de madera de cada traviesa que aparece (el ritmo de las ruedas).
 */
(function (global) {
    "use strict";

    var ctx = null, maestro = null, busFondo = null, busEfectos = null;
    var nivelFondo = 0.35, nivelEfectos = 0.85, mudo = false;
    var ambienteNodos = null, musicaTimer = null, paso = 0, ruidoBuf = null, pajaroTimer = null;
    var zumbido = null, turnoTrav = 0, tZumbido = null;

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
        zumbido = null;
        ambienteNodos = null;
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

    function soplo(dur, vol, f0, f1, retraso, tipo, bus) {
        if (!ctx || mudo) return;
        var t = ahora() + (retraso || 0);
        var src = ctx.createBufferSource();
        src.buffer = ruido();
        src.loop = true;
        var fil = ctx.createBiquadFilter();
        fil.type = tipo || "bandpass";
        fil.Q.value = 1.2;
        fil.frequency.setValueAtTime(f0, t);
        fil.frequency.exponentialRampToValueAtTime(Math.max(40, f1 || f0), t + dur);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.3));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(fil);
        fil.connect(g);
        g.connect(bus || busEfectos);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    // ------------------------------------------------------------------ efectos

    function toque() {
        desbloquear();
        tono("sine", 660, 880, 0.1, 0.1, 0);
    }

    /** El dedo toca el punto de inicio: campanita que sube. */
    function inicio() {
        desbloquear();
        [523, 659, 784].forEach(function (f, i) { tono("triangle", f, f, 0.16, 0.11, i * 0.06); });
        tono("sine", 1568, 2093, 0.2, 0.05, 0.18);
    }

    function retoma() {
        desbloquear();
        tono("triangle", 659, 988, 0.16, 0.1, 0);
    }

    /**
     * Zumbido mágico mientras se construye la vía (vel en unidades del mundo por segundo). Al parar se apaga del
     * todo: los osciladores se detienen y se crean de nuevo la próxima vez. (Antes el trémolo iba sumado al volumen
     * final y, con el volumen «en cero», seguía sonando un tono ondulante que nunca se apagaba.)
     */
    function apagarZumbido() {
        if (!zumbido) return;
        var z = zumbido;
        zumbido = null;
        z.g.gain.cancelScheduledValues(ahora());
        z.g.gain.setTargetAtTime(0.0001, ahora(), 0.05);
        setTimeout(function () {
            [z.o1, z.o2, z.trem].forEach(function (o) { try { o.stop(); } catch (e) { /* ya parado */ } });
            try { z.g.disconnect(); } catch (e) { /* ya desconectado */ }
        }, 400);
    }

    function construir(vel) {
        if (!ctx) return;
        var v = Math.max(0, Number(vel) || 0);
        // seguro: si deja de llegar avance (la demo se levanta, el dedo se queda quieto), se apaga solo
        clearTimeout(tZumbido);
        if (v < 0.15 || mudo) {
            apagarZumbido();
            return;
        }
        tZumbido = setTimeout(apagarZumbido, 300);
        if (!zumbido) {
            var g = ctx.createGain();          // volumen final (0 = silencio de verdad)
            g.gain.value = 0.0001;
            var mezcla = ctx.createGain();     // aquí va el trémolo, antes del volumen final
            mezcla.gain.value = 1;
            var o1 = ctx.createOscillator();
            var o2 = ctx.createOscillator();
            o1.type = "triangle";
            o2.type = "sine";
            o1.frequency.value = 330;
            o2.frequency.value = 495;
            var trem = ctx.createOscillator();
            var tremG = ctx.createGain();
            trem.frequency.value = 7;
            tremG.gain.value = 0.3;
            trem.connect(tremG);
            tremG.connect(mezcla.gain);
            o1.connect(mezcla);
            o2.connect(mezcla);
            mezcla.connect(g);
            g.connect(busEfectos);
            o1.start(); o2.start(); trem.start();
            zumbido = { g: g, o1: o1, o2: o2, trem: trem };
        }
        var f = 300 + Math.min(1, v / 7) * 260;
        zumbido.o1.frequency.setTargetAtTime(f, ahora(), 0.08);
        zumbido.o2.frequency.setTargetAtTime(f * 1.5, ahora(), 0.08);
        zumbido.g.gain.setTargetAtTime(0.035, ahora(), 0.06);
    }

    /** Toc de madera de cada traviesa (alterna dos tonos: el «ta-ca» de las ruedas). */
    function traviesa() {
        if (!ctx) return;
        turnoTrav++;
        var f = turnoTrav % 2 ? 520 : 430;
        tono("square", f, f * 0.6, 0.05, 0.05, 0);
        soplo(0.04, 0.05, 2200, 1500, 0, "bandpass");
    }

    function hito() {
        desbloquear();
        [784, 988, 1175, 1568].forEach(function (f, i) { tono("triangle", f, f, 0.14, 0.08, i * 0.06); });
    }

    /** Fuera del carril: aviso suave, nunca un error duro. */
    function fuera() {
        desbloquear();
        tono("sine", 440, 330, 0.22, 0.08, 0);
        tono("sine", 392, 294, 0.22, 0.06, 0.12);
    }

    function vuelve() {
        desbloquear();
        tono("triangle", 523, 784, 0.14, 0.08, 0);
    }

    function pausa() {
        desbloquear();
        tono("sine", 587, 440, 0.18, 0.07, 0);
    }

    function estrella() {
        desbloquear();
        [1318, 1568, 1760, 2093, 2349].forEach(function (f, i) { tono("sine", f, f, 0.22, 0.04, i * 0.12); });
    }

    /** La vía completa se activa: arpegio luminoso. */
    function activar() {
        desbloquear();
        [523, 659, 784, 1046, 1318].forEach(function (f, i) { tono("triangle", f, f, 0.26, 0.09, i * 0.08); });
        soplo(0.8, 0.04, 4000, 1800, 0.1);
    }

    /** Pitido del tren: dos silbatos con vibrato (chu-chuuu). */
    function pitido(corto) {
        desbloquear();
        if (!ctx || mudo) return;
        var t = ahora();
        var dur = corto ? 0.45 : 0.95;
        [[740, 0.06], [932, 0.05], [1109, 0.035]].forEach(function (p) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            var vib = ctx.createOscillator();
            var vibG = ctx.createGain();
            o.type = "sine";
            o.frequency.value = p[0];
            vib.frequency.value = 5.5;
            vibG.gain.value = p[0] * 0.012;
            vib.connect(vibG);
            vibG.connect(o.frequency);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(p[1], t + 0.05);
            g.gain.setValueAtTime(p[1], t + dur * 0.35);
            g.gain.exponentialRampToValueAtTime(p[1] * 0.4, t + dur * 0.45);
            g.gain.exponentialRampToValueAtTime(p[1], t + dur * 0.55);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g);
            g.connect(busEfectos);
            o.start(t); vib.start(t);
            o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
        });
        soplo(dur, 0.035, 2600, 2400, 0, "bandpass");
    }

    /** Vapor: soplido que se abre. */
    function vapor() {
        desbloquear();
        soplo(0.55, 0.07, 1800, 600, 0, "highpass");
    }

    /** Un golpe de marcha (chu): ruido grave con un toc de las ruedas. */
    function chuchu() {
        if (!ctx) return;
        soplo(0.18, 0.08, 900, 300, 0, "lowpass");
        tono("square", 180, 120, 0.06, 0.04, 0.02);
    }

    function arranca() {
        desbloquear();
        vapor();
        tono("sine", 110, 160, 0.4, 0.06, 0);
    }

    function llegada() {
        desbloquear();
        [784, 988, 1175, 1568].forEach(function (f, i) { tono("triangle", f, f, 0.2, 0.09, i * 0.1); });
        soplo(0.6, 0.05, 3000, 1200, 0.2);
    }

    function acople() {
        desbloquear();
        tono("square", 300, 180, 0.08, 0.07, 0);
        tono("triangle", 880, 1320, 0.12, 0.06, 0.05);
    }

    function victoria() {
        desbloquear();
        var notas = [523, 659, 784, 1046, 784, 1046, 1318];
        notas.forEach(function (f, i) {
            tono("triangle", f, f, 0.24, 0.1, i * 0.12);
            if (i % 2 === 0) tono("sine", f / 2, f / 2, 0.3, 0.05, i * 0.12);
        });
    }

    function puente() {
        desbloquear();
        [392, 523, 659].forEach(function (f, i) { tono("sine", f, f, 0.3, 0.05, i * 0.15); });
    }

    function tunel() {
        desbloquear();
        soplo(1.6, 0.06, 400, 200, 0, "lowpass");
        tono("sine", 220, 165, 1.2, 0.04, 0);
    }

    function fuego() {
        desbloquear();
        soplo(0.35, 0.09, 1500, 300, 0, "bandpass");
        tono("sine", 1200 + Math.random() * 800, 600, 0.3, 0.04, 0.05);
    }

    // ------------------------------------------------------------------ fondo

    /**
     * Pradera tranquila: solo pajaritos de vez en cuando. (Antes había además un acorde continuo de fondo; sonaba
     * todo el juego como un zumbido molesto y se quitó.)
     */
    function ambiente(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (pajaroTimer) { clearInterval(pajaroTimer); pajaroTimer = null; }
            return;
        }
        if (pajaroTimer) return;
        pajaroTimer = setInterval(function () {
            if (mudo || !ctx || Math.random() < 0.5) return;
            var f = 2200 + Math.random() * 900;
            tono("sine", f, f * 1.25, 0.08, 0.02, 0, busFondo);
            tono("sine", f * 1.1, f * 1.35, 0.07, 0.016, 0.12, busFondo);
        }, 5200);
    }

    /** Música alegre de la cinemática final. */
    function musica(on) {
        desbloquear();
        if (!ctx) return;
        if (on === false) {
            if (musicaTimer) { clearInterval(musicaTimer); musicaTimer = null; }
            return;
        }
        if (musicaTimer) return;
        var melodia = [523, 659, 784, 659, 698, 880, 784, 659, 587, 698, 880, 698, 659, 784, 1046, 784];
        var bajos = [131, 131, 175, 196];
        musicaTimer = setInterval(function () {
            if (mudo || !ctx) return;
            var f = melodia[paso % melodia.length];
            tono("triangle", f, f, 0.2, 0.035, 0, busFondo);
            if (paso % 4 === 0) tono("sine", bajos[(paso / 4) % bajos.length], bajos[(paso / 4) % bajos.length], 0.5, 0.06, 0, busFondo);
            paso += 1;
        }, 220);
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
        busFondo.gain.setTargetAtTime(on ? nivelFondo * 0.28 : nivelFondo, ahora(), 0.15);
    }

    function detenerTodo() {
        construir(0);
        ambiente(false);
        musica(false);
        silenciar(true);
    }

    global.SonidosTren = {
        desbloquear: desbloquear,
        toque: toque,
        inicio: inicio,
        retoma: retoma,
        construir: construir,
        traviesa: traviesa,
        hito: hito,
        fuera: fuera,
        vuelve: vuelve,
        pausa: pausa,
        estrella: estrella,
        activar: activar,
        pitido: pitido,
        vapor: vapor,
        chuchu: chuchu,
        arranca: arranca,
        llegada: llegada,
        acople: acople,
        victoria: victoria,
        puente: puente,
        tunel: tunel,
        fuego: fuego,
        ambiente: ambiente,
        musica: musica,
        volumenFondo: volumenFondo,
        volumenEfectos: volumenEfectos,
        silenciar: silenciar,
        agachar: agachar,
        detenerTodo: detenerTodo
    };
})(typeof window !== "undefined" ? window : global);
