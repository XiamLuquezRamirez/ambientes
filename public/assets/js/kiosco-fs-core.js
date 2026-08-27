/**
 * Núcleo compartido: preferencia de pantalla completa entre páginas del kiosco.
 */
(function (global) {
    'use strict';

    const STORAGE_KEY = 'pednia_kiosco_fs_deseado';

    function estaEnFullscreen() {
        return !!(document.fullscreenElement
            || document.webkitFullscreenElement
            || document.msFullscreenElement);
    }

    function marcarClaseFullscreen(activo) {
        document.documentElement.classList.toggle('kiosco-fullscreen-active', activo);
    }

    function pedirFullscreenEn(el) {
        const req = el.requestFullscreen
            || el.webkitRequestFullscreen
            || el.webkitRequestFullScreen
            || el.msRequestFullscreen;

        if (!req) return Promise.reject(new Error('API no disponible'));

        try {
            return Promise.resolve(req.call(el, { navigationUI: 'hide' }));
        } catch (err) {
            return Promise.resolve(req.call(el));
        }
    }

    function pedirFullscreen() {
        const candidatos = [document.documentElement, document.body].filter(Boolean);
        let ultimoError = null;

        function intentar(i) {
            if (i >= candidatos.length) {
                return Promise.reject(ultimoError || new Error('fullscreen no soportado'));
            }

            return pedirFullscreenEn(candidatos[i]).catch(function (err) {
                ultimoError = err;
                return intentar(i + 1);
            });
        }

        return intentar(0);
    }

    function salirFullscreen() {
        const salir = document.exitFullscreen
            || document.webkitExitFullscreen
            || document.webkitCancelFullScreen
            || document.msExitFullscreen;

        if (!salir) return Promise.resolve();
        return Promise.resolve(salir.call(document));
    }

    function deseaFullscreen() {
        try {
            return sessionStorage.getItem(STORAGE_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function marcarDeseado(activo) {
        try {
            if (activo) {
                sessionStorage.setItem(STORAGE_KEY, '1');
            } else {
                sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) { /* noop */ }
    }

    function entrarFullscreen(marcar) {
        if (marcar !== false) {
            marcarDeseado(true);
        }

        return pedirFullscreen().then(function () {
            marcarClaseFullscreen(true);
        });
    }

    function salirFullscreenExplicito() {
        marcarDeseado(false);
        return salirFullscreen().finally(function () {
            marcarClaseFullscreen(false);
        });
    }

    function toggleFullscreen() {
        if (estaEnFullscreen()) {
            return salirFullscreenExplicito();
        }
        return entrarFullscreen(true);
    }

    function restaurarEnGesto() {
        if (!deseaFullscreen() || estaEnFullscreen()) {
            return;
        }

        entrarFullscreen(false).catch(function () { /* requiere gesto válido */ });
    }

    function engancharRestauracionPorGesto() {
        if (!deseaFullscreen() || estaEnFullscreen()) {
            return;
        }

        function enGesto() {
            document.removeEventListener('pointerdown', enGesto, true);
            document.removeEventListener('click', enGesto, true);
            restaurarEnGesto();
        }

        document.addEventListener('pointerdown', enGesto, true);
        document.addEventListener('click', enGesto, true);
    }

    function sincronizarEstado() {
        marcarClaseFullscreen(estaEnFullscreen());
    }

    let restauracionIniciada = false;

    function initRestauracion() {
        if (restauracionIniciada) {
            sincronizarEstado();
            if (deseaFullscreen() && !estaEnFullscreen()) {
                engancharRestauracionPorGesto();
            }
            return;
        }
        restauracionIniciada = true;

        sincronizarEstado();

        document.addEventListener('fullscreenchange', sincronizarEstado);
        document.addEventListener('webkitfullscreenchange', sincronizarEstado);
        document.addEventListener('MSFullscreenChange', sincronizarEstado);

        window.addEventListener('pageshow', function () {
            sincronizarEstado();
            if (deseaFullscreen() && !estaEnFullscreen()) {
                restaurarEnGesto();
                engancharRestauracionPorGesto();
            }
        });

        if (deseaFullscreen() && !estaEnFullscreen()) {
            restaurarEnGesto();
            engancharRestauracionPorGesto();
        }
    }

    global.KioscoFsCore = {
        STORAGE_KEY: STORAGE_KEY,
        estaEnFullscreen: estaEnFullscreen,
        pedirFullscreen: pedirFullscreen,
        salirFullscreen: salirFullscreen,
        deseaFullscreen: deseaFullscreen,
        marcarDeseado: marcarDeseado,
        entrarFullscreen: entrarFullscreen,
        salirFullscreenExplicito: salirFullscreenExplicito,
        toggleFullscreen: toggleFullscreen,
        restaurarEnGesto: restaurarEnGesto,
        engancharRestauracionPorGesto: engancharRestauracionPorGesto,
        sincronizarEstado: sincronizarEstado,
        initRestauracion: initRestauracion,
        marcarClaseFullscreen: marcarClaseFullscreen,
    };
}(window));
