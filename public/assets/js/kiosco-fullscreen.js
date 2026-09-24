/**
 * Pantalla completa para kiosco tablet (auth + ambiente).
 * Depende de kiosco-fs-core.js (preferencia entre páginas).
 *
 * Entrada principal: gesto en "Iniciar" / "¡Vamos a jugar!" de la portada
 * (y .btn-jugar de bienvenida). El botón flotante es opcional si existe en DOM.
 */
(function () {
    'use strict';

    const core = window.KioscoFsCore;
    if (!core) return;

    const btn = document.getElementById('kioscoBtnFullscreen');
    const SELECTOR_ENTRADA = 'a.btn-jugar, .btn-jugar';

    const esIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const esStandalone = window.navigator.standalone === true
        || window.matchMedia('(display-mode: standalone)').matches;

    function ocultarBarraNavegador() {
        try {
            window.scrollTo(0, 1);
            setTimeout(function () { window.scrollTo(0, 0); }, 120);
        } catch (e) { /* noop */ }
    }

    function actualizarBtn() {
        if (!btn) return;

        const activo = core.estaEnFullscreen();
        core.marcarClaseFullscreen(activo);

        const iconExpand = btn.querySelector('.kiosco-fs-icon-expand');
        const iconCompress = btn.querySelector('.kiosco-fs-icon-compress');
        if (iconExpand) iconExpand.hidden = activo;
        if (iconCompress) iconCompress.hidden = !activo;

        btn.setAttribute('aria-label', activo ? 'Salir de pantalla completa' : 'Pantalla completa');
        btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
        btn.title = activo ? 'Salir de pantalla completa' : 'Pantalla completa';
    }

    function entrarFullscreen() {
        if (core.estaEnFullscreen()) {
            return Promise.resolve();
        }

        if (esIos && !esStandalone) {
            ocultarBarraNavegador();
            core.marcarDeseado(true);
            return Promise.resolve();
        }

        return core.entrarFullscreen(true)
            .catch(function () {
                ocultarBarraNavegador();
                core.marcarDeseado(true);
            });
    }

    function toggleFullscreen() {
        if (core.estaEnFullscreen()) {
            return core.salirFullscreenExplicito().finally(actualizarBtn);
        }

        return entrarFullscreen().finally(actualizarBtn);
    }

    // Capture: pedir FS en el mismo gesto del usuario, antes de navegar.
    document.addEventListener('click', function (e) {
        const trigger = e.target.closest(SELECTOR_ENTRADA);
        if (!trigger) return;
        entrarFullscreen().finally(actualizarBtn);
    }, true);

    if (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleFullscreen();
        });

        document.addEventListener('fullscreenchange', actualizarBtn);
        document.addEventListener('webkitfullscreenchange', actualizarBtn);
        document.addEventListener('MSFullscreenChange', actualizarBtn);
    }

    core.initRestauracion();

    if (esStandalone) {
        if (btn) btn.hidden = true;
        core.marcarClaseFullscreen(true);
        core.marcarDeseado(true);
    } else if (btn) {
        actualizarBtn();
    }
})();
