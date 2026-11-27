/**
 * SonidosGolf — audio sintetizado de "El Mini Golf Mágico" (window.SonidosGolf).
 * Sin archivos: si no hay Web Audio, todo queda en silencio sin errores.
 *
 * Dos buses (fondo y efectos) sobre un compresor suave: comun/volumen.js usa volumenFondo/volumenEfectos. La voz de
 * Zoe y Zeus baja la música con agachar(). Todo es mágico y amable (energía que se carga, "toc" del palo, rodar
 * suave sobre el césped, rebotes de goma, campana del hoyo): nada de golpes agresivos. Los sonidos repetidos tienen
 * un tope para no amontonarse.
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
        rueda = null;
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

    /** Empieza un nivel: la energía del campo se enciende. */
    function activar() {
        tono("sine", 180, 520, 0.6, 0.05);
        tono("triangle", 360, 1040, 0.6, 0.02);
        campana(1046.5, 0.035, 0.45, 0.5);
        campana(1318.5, 0.03, 0.55, 0.6);
    }

    /** El dedo toma la pelota: "tic" y un brillito. */
    function agarra() {
        if (!libre("agarra", 120)) return;
        tono("triangle", 660, 620, 0.05, 0.05);
        campana(1567.98, 0.02, 0.03, 0.3);
    }

    // Energía acumulada: zumbido grave y suave que sube con la fuerza mientras se mantiene el arrastre. Va por un
    // filtro pasa bajos y sube solo una octava, para que con la fuerza máxima no se vuelva un pitido.
    var hum = null, ultimaT = 0;

    function tension(T) {
        if (!ctx || mudo) return;
        T = Math.max(0, Math.min(1, Number(T) || 0));
        var t = ahora();
        if (!hum) {
            var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
            o1.type = "sine";
            o2.type = "sine";
            o1.frequency.value = 110;
            o2.frequency.value = 165;
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
        hum.o1.frequency.setTargetAtTime(110 + 110 * T, t, 0.08);
        hum.o2.frequency.setTargetAtTime(165 + 165 * T, t, 0.08);
        hum.g.gain.setTargetAtTime(T < 0.02 ? 0.0001 : 0.012 + 0.02 * T, t, 0.08);
        if (Math.abs(T - ultimaT) > 0.1) {
            // "tic" suave de madera a cada décimo de fuerza (antes era un destello agudo)
            if (libre("chispa", 80)) tono("triangle", 330 + 220 * T, 300 + 200 * T, 0.05, 0.012);
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

    /** Fuerza máxima: "ding" brillante. */
    function alTope() {
        if (!libre("alTope", 400)) return;
        campana(783.99, 0.035, 0, 0.45);
        tono("sine", 523.25, 523.25, 0.2, 0.012, 0.05);
    }

    /** La pelota vuelve a reposo sin golpe. */
    function cancela() { tono("sine", 520, 300, 0.18, 0.03); }

    /** El golpe: "toc" redondo del palo mágico y un destello de energía según la fuerza. */
    function golpe(T) {
        var k = Math.max(0, Math.min(1, Number(T) || 0.5));
        tono("sine", 420 + 200 * k, 180, 0.12, 0.12);
        tono("triangle", 900, 400, 0.05, 0.05);
        soplo(0.18 + 0.2 * k, 0.025 + 0.02 * k, 3200, 900, 0.01, "bandpass");
        campana(1046.5 + 500 * k, 0.025, 0.05, 0.4);
    }

    // Rodar sobre el césped: un murmullo suave de ruido filtrado que sigue la velocidad.
    var rueda = null;

    function rodar(v) {
        if (!ctx || mudo) {
            if (rueda && v <= 0) { try { rueda.src.stop(); } catch (e) { /* noop */ } rueda = null; }
            return;
        }
        var k = Math.max(0, Math.min(1, (Number(v) || 0) / 5));
        if (!rueda && k <= 0.01) return;
        var t = ahora();
        if (!rueda) {
            var src = ctx.createBufferSource();
            src.buffer = ruido();
            src.loop = true;
            var fil = ctx.createBiquadFilter();
            fil.type = "lowpass";
            fil.frequency.value = 400;
            fil.Q.value = 0.7;
            var g = ctx.createGain();
            g.gain.value = 0.0001;
            src.connect(fil);
            fil.connect(g);
            g.connect(busEfectos);
            src.start(t);
            rueda = { src: src, fil: fil, g: g };
        }
        rueda.fil.frequency.setTargetAtTime(250 + 900 * k, t, 0.08);
        rueda.g.gain.setTargetAtTime(k <= 0.01 ? 0.0001 : 0.008 + 0.05 * k, t, 0.08);
        if (k <= 0.01) {
            var r = rueda;
            rueda = null;
            try { r.src.stop(t + 0.5); } catch (e) { /* ya parado */ }
        }
    }

    /** Rebote en una pared: "boing" de goma; la pared curva suena más mágica. */
    function rebote(k, curva) {
        if (!libre("rebote", 90)) return;
        var f = Math.max(0.15, Math.min(1, Number(k) || 0.5));
        tono("sine", 240 + 120 * f, 480 + 200 * f, 0.14, 0.04 + 0.06 * f);
        tono("triangle", 520, 260, 0.12, 0.02 * f, 0.03);
        if (curva) campana(1318.5, 0.03 + 0.03 * f, 0.02, 0.5);
    }

    /** La pelota choca con un aspa del molino: "tong" de madera mágica, blandito. */
    function aspa(k) {
        if (!libre("aspa", 150)) return;
        var f = Math.max(0.2, Math.min(1, Number(k) || 0.5));
        tono("triangle", 300, 180, 0.2, 0.06 + 0.04 * f);
        tono("sine", 620, 380, 0.16, 0.03);
        soplo(0.15, 0.02, 1500, 500, 0, "bandpass");
    }

    /** Choque con el asteroide: "bonk" suave de goma. */
    function asteroide() {
        if (!libre("asteroide", 150)) return;
        tono("sine", 200, 420, 0.18, 0.07);
        tono("triangle", 380, 160, 0.22, 0.03, 0.04);
    }

    /** La pelota salió del túnel del molino. */
    function superado() {
        [0, 4, 7, 12].forEach(function (s, i) { campana(659.25 * Math.pow(2, s / 12), 0.04, i * 0.07, 0.6); });
    }

    /** Pasó por encima del hoyo muy rápido. */
    function rozaHoyo() {
        if (!libre("roza", 400)) return;
        tono("sine", 900, 500, 0.2, 0.03);
        tono("sine", 600, 350, 0.2, 0.02, 0.06);
    }

    /** La pelota se detiene. */
    function parada() { tono("sine", 520, 520, 0.1, 0.02); }

    /** La pelota cae en el hoyo: "plop" y una caída de notas. */
    function cae() {
        tono("sine", 520, 160, 0.22, 0.09);
        [1318.5, 1046.5, 783.99, 659.25].forEach(function (f, i) { tono("sine", f, f, 0.18, 0.025, 0.08 + i * 0.06); });
    }

    /** Campana de victoria del hoyo dorado. */
    function campana2() {
        [783.99, 987.77, 1174.66, 1567.98].forEach(function (f, i) { campana(f, 0.07, i * 0.1, 1.2); });
        soplo(1.0, 0.03, 6000, 2000, 0.1, "highpass");
    }

    /** Estrella de celebración (i = 0, 1, 2…). */
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
        if (on) { tensionFin(); rodar(0); tono("sine", 660, 440, 0.2, 0.07); } else { tono("sine", 440, 660, 0.2, 0.07); }
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

    function detenerTodo() { tensionFin(); rodar(0); silenciar(true); }

    function reanudar() {
        desbloquear();
        silenciar(false);
    }

    global.SonidosGolf = {
        desbloquear: desbloquear,
        boton: boton,
        activar: activar,
        agarra: agarra,
        tension: tension,
        tensionFin: tensionFin,
        alTope: alTope,
        cancela: cancela,
        golpe: golpe,
        rodar: rodar,
        rebote: rebote,
        aspa: aspa,
        asteroide: asteroide,
        superado: superado,
        rozaHoyo: rozaHoyo,
        parada: parada,
        cae: cae,
        campana: campana2,
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
