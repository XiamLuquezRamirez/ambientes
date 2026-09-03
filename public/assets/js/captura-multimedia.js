/**
 * captura-multimedia.js — Puente de integración con public/assets/utilidades/
 * Carga foto.js, audio.js y video.js en iframes sin modificar esos archivos.
 * Expone window.CapturaMultimedia y reenvía callbacks AndroidNativo al iframe activo.
 */
(function ($) {
    'use strict';

    const TIPOS = ['foto', 'audio', 'video'];
    const CALLBACKS = [
        'fotoNativaLista',
        'recibirFotoBase64',
        'audioNativoListo',
        'audioNativoIniciado',
        'recibirAudioBase64',
        'recibirVideoUrl',
        'recibirVideoBase64',
        'errorNativo',
    ];

    const rutas = (function () {
        const el = document.getElementById('cmRutas');
        if (!el) {
            return {
                foto: '/captura/foto',
                audio: '/captura/audio',
                video: '/captura/video',
            };
        }
        try {
            return JSON.parse(el.textContent || '{}');
        } catch (e) {
            return {};
        }
    })();

    let $overlay = null;
    let $iframe = null;
    let tipoActual = null;
    let resolveActual = null;
    let rejectActual = null;
    let engancheListo = false;

    function hayNativo() {
        return typeof AndroidNativo !== 'undefined';
    }

    function iframeWin() {
        return $iframe && $iframe[0] && $iframe[0].contentWindow;
    }

    function crearShell() {
        if ($overlay) return;
        $overlay = $(`
            <div id="cmOverlay" class="cm-overlay" hidden aria-hidden="true">
                <div class="cm-frame-wrap" role="dialog" aria-modal="true" aria-label="Captura multimedia">
                    <button type="button" class="cm-close" aria-label="Cerrar captura">&times;</button>
                    <iframe id="cmIframe" class="cm-iframe"
                        title="Captura multimedia"
                        allow="camera; microphone; autoplay; fullscreen"
                        referrerpolicy="same-origin"></iframe>
                </div>
            </div>
        `).appendTo('body');
        $iframe = $overlay.find('#cmIframe');

        $overlay.on('click', '.cm-close', function () {
            cancelar(new Error('cancelado'));
        });
    }

    function limpiarEnganche() {
        engancheListo = false;
        const win = iframeWin();
        if (win && win.$) {
            try {
                win.$('#btnGuardar').off('click.cmIntegracion');
            } catch (e) { /* noop */ }
        }
    }

    function cerrarShell() {
        limpiarEnganche();
        if ($overlay) {
            $overlay.prop('hidden', true).attr('aria-hidden', 'true');
        }
        if ($iframe) {
            $iframe.attr('src', 'about:blank');
        }
        tipoActual = null;
        resolveActual = null;
        rejectActual = null;
    }

    function cancelar(err) {
        const reject = rejectActual;
        cerrarShell();
        if (reject) reject(err || new Error('cancelado'));
    }

    function resolver(blob) {
        const resolve = resolveActual;
        cerrarShell();
        if (resolve) resolve(blob);
    }

    function obtenerBlobDesdeIframe(tipo) {
        const win = iframeWin();
        if (!win) return null;
        if (tipo === 'foto' && typeof win.tieneFoto === 'function' && win.tieneFoto()) {
            return win.obtenerFoto();
        }
        if (tipo === 'audio' && typeof win.tieneAudio === 'function' && win.tieneAudio()) {
            return win.obtenerAudio();
        }
        if (tipo === 'video' && typeof win.tieneVideo === 'function' && win.tieneVideo()) {
            return win.obtenerVideo();
        }
        return null;
    }

    function esperarApiIframe(tipo, intentos) {
        intentos = intentos || 0;
        const win = iframeWin();
        if (!win || intentos > 80) return;

        const listo = tipo === 'foto'
            ? typeof win.tieneFoto === 'function'
            : (tipo === 'audio'
                ? typeof win.tieneAudio === 'function'
                : typeof win.tieneVideo === 'function');

        if (!listo || !win.$) {
            setTimeout(function () { esperarApiIframe(tipo, intentos + 1); }, 75);
            return;
        }

        if (engancheListo) return;
        engancheListo = true;

        win.$('#btnGuardar').off('click').on('click.cmIntegracion', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const blob = obtenerBlobDesdeIframe(tipoActual);
            if (!blob) {
                win.alert('Debe completar la captura antes de guardar.');
                return;
            }
            resolver(blob);
        });
    }

    function abrir(tipo) {
        if (TIPOS.indexOf(tipo) === -1) {
            return Promise.reject(new Error('Tipo de captura no soportado.'));
        }

        return new Promise(function (resolve, reject) {
            crearShell();
            limpiarEnganche();
            tipoActual = tipo;
            resolveActual = resolve;
            rejectActual = reject;

            $overlay.prop('hidden', false).attr('aria-hidden', 'false');
            $iframe.off('load.cmIntegracion').one('load.cmIntegracion', function () {
                esperarApiIframe(tipo);
            });
            $iframe.attr('src', rutas[tipo] || ('/captura/' + tipo));
        });
    }

    function reenviarCallback(nombre) {
        window[nombre] = function () {
            const win = iframeWin();
            const fn = win && win[nombre];
            if (typeof fn === 'function') {
                return fn.apply(win, arguments);
            }
        };
    }

    CALLBACKS.forEach(reenviarCallback);

    window.CapturaMultimedia = {
        abrir: abrir,
        cerrar: cancelar,
        hayNativo: hayNativo,
        rutas: rutas,
    };
})(window.jQuery);
