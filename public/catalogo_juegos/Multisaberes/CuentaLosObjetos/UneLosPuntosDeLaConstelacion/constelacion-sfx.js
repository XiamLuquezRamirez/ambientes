/**
 * Efectos de sonido por síntesis (WebAudio), sin archivos de audio.
 *
 * Archivo propio del juego: sfx.js de la categoría está copiado en los ocho
 * subjuegos y no se toca.
 */
(function (global) {
    "use strict";

    var ctx = null;

    function contexto() {
        if (ctx) return ctx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { ctx = null; }
        return ctx;
    }

    /** Los navegadores exigen un gesto del usuario antes de sonar. */
    function desbloquear() {
        var c = contexto();
        if (c && c.state === "suspended" && c.resume) c.resume();
    }

    function nota(frec, duracion, tipo, volumen, retardo) {
        var c = contexto();
        if (!c) return;
        var t0 = c.currentTime + (retardo || 0);
        var osc = c.createOscillator();
        var gan = c.createGain();
        osc.type = tipo || "sine";
        osc.frequency.setValueAtTime(frec, t0);
        /* Ataque corto y caída exponencial: un gain plano produce un clic
           audible al cortar la nota. */
        gan.gain.setValueAtTime(0.0001, t0);
        gan.gain.exponentialRampToValueAtTime(volumen == null ? 0.16 : volumen, t0 + 0.012);
        gan.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
        osc.connect(gan);
        gan.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + duracion + 0.03);
    }

    function barrido(desde, hasta, duracion, volumen) {
        var c = contexto();
        if (!c) return;
        var t0 = c.currentTime;
        var osc = c.createOscillator();
        var gan = c.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(desde, t0);
        osc.frequency.exponentialRampToValueAtTime(hasta, t0 + duracion);
        gan.gain.setValueAtTime(0.0001, t0);
        gan.gain.exponentialRampToValueAtTime(volumen == null ? 0.12 : volumen, t0 + 0.05);
        gan.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
        osc.connect(gan);
        gan.connect(c.destination);
        osc.start(t0);
        osc.stop(t0 + duracion + 0.03);
    }

    /** Ruido filtrado para los motores. */
    function ruido(duracion, volumen) {
        var c = contexto();
        if (!c) return;
        var marcos = Math.floor(c.sampleRate * duracion);
        var buffer = c.createBuffer(1, marcos, c.sampleRate);
        var datos = buffer.getChannelData(0);
        var i;
        for (i = 0; i < marcos; i++) {
            datos[i] = (Math.random() * 2 - 1) * (1 - i / marcos);
        }
        var src = c.createBufferSource();
        src.buffer = buffer;
        var filtro = c.createBiquadFilter();
        filtro.type = "lowpass";
        filtro.frequency.setValueAtTime(820, c.currentTime);
        var gan = c.createGain();
        gan.gain.setValueAtTime(volumen == null ? 0.14 : volumen, c.currentTime);
        src.connect(filtro);
        filtro.connect(gan);
        gan.connect(c.destination);
        src.start();
    }

    /**
     * @param {string} nombre
     * @param {number} [indice] para 'conexion': sube de tono con cada estrella
     */
    function tono(nombre, indice) {
        switch (nombre) {
        case "conexion":
            /* Escala pentatónica ascendente: cada estrella suena más aguda que
               la anterior, así el oído confirma el avance. */
            var escala = [523, 587, 659, 784, 880, 1047, 1175, 1319];
            var paso = escala[Math.min((indice || 1) - 1, escala.length - 1)];
            nota(paso, 0.16, "triangle", 0.17);
            nota(paso * 2, 0.09, "sine", 0.07, 0.015);
            break;
        case "error":
            nota(196, 0.17, "square", 0.1);
            nota(147, 0.22, "square", 0.09, 0.09);
            break;
        case "completo":
            [523, 659, 784, 1047].forEach(function (f, i) {
                nota(f, 0.3, "triangle", 0.16, i * 0.1);
            });
            break;
        case "motores":
            ruido(0.7, 0.1);
            barrido(90, 230, 0.7, 0.1);
            break;
        case "despegue":
            barrido(180, 1100, 1.1, 0.12);
            ruido(1.2, 0.09);
            break;
        case "boton":
            nota(660, 0.09, "sine", 0.13);
            break;
        case "victoria":
            [523, 659, 784, 1047, 1319].forEach(function (f, i) {
                nota(f, 0.42, "triangle", 0.16, i * 0.13);
            });
            break;
        default:
            nota(440, 0.1, "sine", 0.12);
        }
    }

    global.ConstelacionSfx = {
        desbloquear: desbloquear,
        tono: tono
    };
})(typeof window !== "undefined" ? window : globalThis);
