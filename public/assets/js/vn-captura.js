/**
 * vn-captura.js — Captura foto / audio / video (web + AndroidNativo)
 * Lógica adaptada de public/assets/utilidades/ para la vista niño.
 */
(function () {
    'use strict';

    let pendiente = null;
    let contadorInterval = null;
    let contadorSeg = 0;

    function hayNativo() {
        return typeof AndroidNativo !== 'undefined';
    }

    function limpiarPendiente() {
        pendiente = null;
    }

    function resolver(blob) {
        if (!pendiente) return;
        const p = pendiente;
        limpiarPendiente();
        if (typeof p.resolve === 'function') p.resolve(blob);
    }

    function rechazar(mensaje) {
        if (!pendiente) return;
        const p = pendiente;
        limpiarPendiente();
        const err = new Error(mensaje || 'Error en la captura nativa.');
        if (typeof p.reject === 'function') p.reject(err);
    }

    function blobDesdeBase64(b64, mime, prefijoData) {
        const dataUrl = (b64 && b64.indexOf('data:') === 0) ? b64 : (prefijoData + b64);
        return fetch(dataUrl).then(function (r) {
            if (!r.ok) throw new Error('No se pudo leer el archivo.');
            return r.blob();
        });
    }

    function blobDesdeUrlNativa(url) {
        return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now())
            .then(function (r) {
                if (!r.ok) throw new Error('El archivo no está listo.');
                return r.blob();
            });
    }

    window.fotoNativaLista = function () {
        blobDesdeUrlNativa('http://captura.nativo/foto.jpg')
            .then(resolver)
            .catch(function (e) { rechazar(e.message); });
    };

    window.recibirFotoBase64 = function (b64) {
        blobDesdeBase64(b64, 'image/jpeg', 'data:image/jpeg;base64,')
            .then(resolver)
            .catch(function () { rechazar('No se pudo leer la fotografía.'); });
    };

    window.audioNativoIniciado = function () {
        if (pendiente && pendiente.tipo === 'audio' && typeof pendiente.onIniciado === 'function') {
            pendiente.onIniciado();
        }
    };

    window.audioNativoListo = function () {
        blobDesdeUrlNativa('http://captura.nativo/audio.m4a')
            .then(resolver)
            .catch(function (e) { rechazar(e.message); });
    };

    window.recibirAudioBase64 = function (b64, mime) {
        const tipo = mime || 'audio/mp4';
        blobDesdeBase64(b64, tipo, 'data:' + tipo + ';base64,')
            .then(resolver)
            .catch(function () { rechazar('No se pudo leer el audio.'); });
    };

    window.recibirVideoUrl = function (url) {
        blobDesdeUrlNativa(url)
            .then(resolver)
            .catch(function (e) { rechazar(e.message); });
    };

    window.recibirVideoBase64 = function (b64, mime) {
        const tipo = mime || 'video/mp4';
        blobDesdeBase64(b64, tipo, 'data:' + tipo + ';base64,')
            .then(resolver)
            .catch(function () { rechazar('No se pudo leer el video.'); });
    };

    window.errorNativo = function (mensaje) {
        rechazar(mensaje || 'Error en la captura nativa.');
    };

    function contadorTexto(seg) {
        const m = Math.floor(seg / 60);
        const s = seg % 60;
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    window.VnCaptura = {
        hayNativo: hayNativo,

        fotoNativa: function () {
            return new Promise(function (resolve, reject) {
                if (!hayNativo()) {
                    reject(new Error('no-nativo'));
                    return;
                }
                pendiente = { tipo: 'foto', resolve: resolve, reject: reject };
                AndroidNativo.tomarFoto();
            });
        },

        videoNativo: function () {
            return new Promise(function (resolve, reject) {
                if (!hayNativo()) {
                    reject(new Error('no-nativo'));
                    return;
                }
                pendiente = { tipo: 'video', resolve: resolve, reject: reject };
                AndroidNativo.grabarVideo();
            });
        },

        audioNativo: {
            iniciar: function (onIniciado) {
                if (!hayNativo()) return Promise.reject(new Error('no-nativo'));
                pendiente = { tipo: 'audio', onIniciado: onIniciado };
                AndroidNativo.iniciarAudio();
                return Promise.resolve();
            },
            detener: function () {
                if (!hayNativo()) return Promise.reject(new Error('no-nativo'));
                if (!pendiente || pendiente.tipo !== 'audio') {
                    return Promise.reject(new Error('Sin grabación activa.'));
                }
                return new Promise(function (resolve, reject) {
                    pendiente.resolve = resolve;
                    pendiente.reject = reject;
                    AndroidNativo.detenerAudio();
                });
            },
        },

        iniciarContador: function ($el, onTick) {
            this.detenerContador();
            contadorSeg = 0;
            if ($el && $el.length) {
                $el.text(contadorTexto(0)).prop('hidden', false);
            }
            contadorInterval = setInterval(function () {
                contadorSeg += 1;
                const txt = contadorTexto(contadorSeg);
                if ($el && $el.length) $el.text(txt);
                if (typeof onTick === 'function') onTick(contadorSeg, txt);
            }, 1000);
        },

        detenerContador: function ($el) {
            if (contadorInterval) {
                clearInterval(contadorInterval);
                contadorInterval = null;
            }
            if ($el && $el.length) $el.prop('hidden', true);
        },

        cancelar: function () {
            this.detenerContador();
            limpiarPendiente();
        },
    };
})();
