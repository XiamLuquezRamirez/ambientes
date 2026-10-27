/**
 * Al salir del juego (Volver / Salir / cerrar iframe): corta TTS, medios y módulos Sfx.
 */
(function (global) {
    'use strict';

    function pararElementosMedio() {
        try {
            var lista = document.querySelectorAll('audio, video');
            for (var i = 0; i < lista.length; i++) {
                var el = lista[i];
                try {
                    el.pause();
                    el.currentTime = 0;
                } catch (e) { /* noop */ }
            }
        } catch (e2) { /* noop */ }
    }

    function detenerSfxGlobales() {
        var w = global;
        var k;
        for (k in w) {
            if (!Object.prototype.hasOwnProperty.call(w, k)) continue;
            if (!/Sfx$/i.test(k)) continue;
            var mod = w[k];
            if (mod && typeof mod.detener === 'function') {
                try { mod.detener(); } catch (e) { /* noop */ }
            }
        }
    }

    function detenerTutorial() {
        if (global.PedniaTutorial && typeof global.PedniaTutorial.detenerDemo === 'function') {
            try { global.PedniaTutorial.detenerDemo(); } catch (e) { /* noop */ }
        }
    }

    function detenerVoz() {
        if (global.TextoVoz && typeof global.TextoVoz.detener === 'function') {
            try { global.TextoVoz.detener(); } catch (e) { /* noop */ }
            return;
        }
        if (global.speechSynthesis) {
            try { global.speechSynthesis.cancel(); } catch (e2) { /* noop */ }
        }
    }

    function pararAudio() {
        detenerVoz();
        pararElementosMedio();
        detenerSfxGlobales();
        detenerTutorial();
        if (typeof global.__PEDNIA_PARAR_AUDIO__ === 'function') {
            try { global.__PEDNIA_PARAR_AUDIO__(); } catch (e) { /* noop */ }
        }
    }

    function esBotonSalir(el) {
        if (!el) return false;
        if (el.id === 'btn-inicio-volver') return true;
        if (el.getAttribute('data-salir') === '1') return true;
        var onclick = el.getAttribute('onclick') || '';
        if (/history\.back\s*\(\s*\)/.test(onclick)) return true;
        var label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().toLowerCase();
        if (label === 'salir' || label === 'volver') {
            if (el.classList.contains('btn-danger') || el.classList.contains('btn-round')) return true;
        }
        return false;
    }

    function engancharSalida() {
        if (global.__pedniaSalirEnganchado) return;
        global.__pedniaSalirEnganchado = true;

        document.addEventListener('click', function (ev) {
            var btn = ev.target && ev.target.closest ? ev.target.closest('button, a[role="button"]') : null;
            if (btn && esBotonSalir(btn)) pararAudio();
        }, true);

        document.addEventListener('pagehide', pararAudio);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') pararAudio();
        });

        try {
            var atrasNativo = global.history.back.bind(global.history);
            global.history.back = function () {
                pararAudio();
                return atrasNativo();
            };
        } catch (e) { /* noop */ }
    }

    global.PedniaSalir = {
        pararAudio: pararAudio,
        enganchar: engancharSalida
    };

    engancharSalida();
}(typeof window !== 'undefined' ? window : globalThis));
