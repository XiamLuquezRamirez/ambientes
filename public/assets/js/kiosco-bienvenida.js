/**
 * Saludo post-PIN (/listo): lee el saludo en voz alta y avanza solo al recorrido (o juegos).
 * Avanza cuando terminó la voz (+ pausa) Y pasó el tiempo mínimo de lectura.
 */
(function () {
    'use strict';

    /* ~8 palabras para un lector inicial (≈1 palabra/s). */
    var LECTURA_MIN_MS = 7000;
    var INICIO_VOZ_MS = 600;
    var PAUSA_TRAS_VOZ_MS = 1500;
    /* Chrome a veces no dispara onend: tope para no dejar al niño atascado. */
    var ESPERA_MAX_MS = 14000;

    var timers = [];
    var navegado = false;
    var fraseActual = null;
    /* Cancelar dispara onerror en la frase vieja: la generación descarta esos avisos tardíos. */
    var generacion = 0;

    /* init() corre en cada página del kiosco: solo se cancela la voz propia del saludo. */
    function limpiar() {
        generacion++;
        timers.forEach(clearTimeout);
        timers = [];
        if (fraseActual && window.speechSynthesis) window.speechSynthesis.cancel();
        fraseActual = null;
    }

    function wrapActual() {
        return document.querySelector('.bienambiente-wrap[data-redirect-inicio]');
    }

    function irAlRecorrido() {
        var wrap = wrapActual();
        if (!wrap || navegado) return;

        var url = wrap.getAttribute('data-redirect-inicio');
        if (!url) return;

        navegado = true;
        limpiar();

        // Conservar query (?abrir=juegos) al navegar sin recargar.
        var pathConQuery;
        if (url.startsWith('http')) {
            var parsed = new URL(url);
            pathConQuery = parsed.pathname + parsed.search;
        } else {
            pathConQuery = url;
        }

        var pathname = pathConQuery.split('?')[0];

        if (window.KioscoNav && window.KioscoNav.esRutaKiosco(pathname)) {
            window.KioscoNav.ir(pathConQuery);
            return;
        }

        window.location.href = url;
    }

    /* Sin gesto previo del usuario (recarga completa) Chrome rechaza speak() con 'not-allowed'. */
    function hablar(texto, alTerminar) {
        var terminado = false;
        var frase = null;
        var miGeneracion = generacion;
        function fin() {
            if (terminado || miGeneracion !== generacion) return;
            terminado = true;
            if (fraseActual === frase) fraseActual = null;
            alTerminar();
        }
        try {
            frase = new SpeechSynthesisUtterance(texto);
            frase.lang = 'es-CO';
            frase.rate = 0.9;
            frase.onend = fin;
            frase.onerror = fin;
            window.speechSynthesis.cancel();
            fraseActual = frase;
            window.speechSynthesis.speak(frase);
        } catch (e) {
            fin();
        }
    }

    function init() {
        limpiar();
        navegado = false;

        var wrap = wrapActual();
        if (!wrap) return;

        var texto = (wrap.getAttribute('data-voz') || '').trim();
        var conVoz = !!(texto && window.speechSynthesis && window.SpeechSynthesisUtterance);
        var vozLista = !conVoz;
        var lecturaLista = false;

        function avanzarSiListo() {
            if (vozLista && lecturaLista) irAlRecorrido();
        }

        timers.push(setTimeout(function () {
            lecturaLista = true;
            avanzarSiListo();
        }, LECTURA_MIN_MS));
        timers.push(setTimeout(irAlRecorrido, ESPERA_MAX_MS));

        if (conVoz) {
            timers.push(setTimeout(function () {
                hablar(texto, function () {
                    timers.push(setTimeout(function () {
                        vozLista = true;
                        avanzarSiListo();
                    }, PAUSA_TRAS_VOZ_MS));
                });
            }, INICIO_VOZ_MS));
        }
    }

    window.KioscoBienvenida = { init: init };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
