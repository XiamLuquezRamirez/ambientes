/**
 * Pantalla completa para kiosco tablet (auth + ambiente).
 * Depende de kiosco-fs-core.js (preferencia entre páginas).
 */
(function () {
    'use strict';

    const core = window.KioscoFsCore;
    const btn = document.getElementById('kioscoBtnFullscreen');
    const hint = document.getElementById('kioscoFsHint');
    const hintTexto = document.getElementById('kioscoFsHintTexto');
    const hintCerrar = document.getElementById('kioscoFsHintCerrar');
    const HINT_KEY = 'pednia_kiosco_fs_hint_visto';

    const MENSAJE_INICIAL = 'Toca el botón de expandir (esquina superior derecha) para ver PedNia a pantalla completa.';
    const MENSAJE_IOS = 'En iPad/iPhone: Safari → Compartir → <strong>Añadir a pantalla de inicio</strong>. Abre PedNia desde el icono para verla a pantalla completa.';
    const MENSAJE_FALLBACK = 'Si la barra del navegador sigue visible, usa <strong>Añadir a pantalla de inicio</strong> en el menú del navegador.';

    if (!btn || !core) return;

    const iconExpand = btn.querySelector('.kiosco-fs-icon-expand');
    const iconCompress = btn.querySelector('.kiosco-fs-icon-compress');

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
        const activo = core.estaEnFullscreen();
        core.marcarClaseFullscreen(activo);

        if (iconExpand) iconExpand.hidden = activo;
        if (iconCompress) iconCompress.hidden = !activo;

        btn.setAttribute('aria-label', activo ? 'Salir de pantalla completa' : 'Pantalla completa');
        btn.setAttribute('aria-pressed', activo ? 'true' : 'false');
        btn.title = activo ? 'Salir de pantalla completa' : 'Pantalla completa';

        if (hint && activo) {
            hint.hidden = true;
        }
    }

    function mostrarHint(html) {
        if (!hint || !hintTexto || core.estaEnFullscreen()) return;
        hintTexto.innerHTML = html;
        hint.hidden = false;
    }

    function ocultarHint() {
        if (!hint) return;
        hint.hidden = true;
        try {
            sessionStorage.setItem(HINT_KEY, '1');
        } catch (e) { /* noop */ }
    }

    function mostrarHintSiCorresponde() {
        if (!hint || core.estaEnFullscreen() || esStandalone || core.deseaFullscreen()) return;

        try {
            if (sessionStorage.getItem(HINT_KEY) === '1') return;
        } catch (e) { /* noop */ }

        if (hintTexto) hintTexto.textContent = MENSAJE_INICIAL;
        hint.hidden = false;
    }

    function entrarFullscreen() {
        ocultarHint();

        if (esIos && !esStandalone) {
            ocultarBarraNavegador();
            mostrarHint(MENSAJE_IOS);
            core.marcarDeseado(true);
            return Promise.resolve();
        }

        return core.entrarFullscreen(true)
            .catch(function () {
                ocultarBarraNavegador();
                mostrarHint(MENSAJE_FALLBACK);
            });
    }

    function toggleFullscreen() {
        if (core.estaEnFullscreen()) {
            return core.salirFullscreenExplicito().finally(actualizarBtn);
        }

        return entrarFullscreen().finally(actualizarBtn);
    }

    btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleFullscreen();
    });

    if (hintCerrar) {
        hintCerrar.addEventListener('click', ocultarHint);
    }

    document.addEventListener('fullscreenchange', actualizarBtn);
    document.addEventListener('webkitfullscreenchange', actualizarBtn);
    document.addEventListener('MSFullscreenChange', actualizarBtn);

    core.initRestauracion();

    if (esStandalone) {
        btn.hidden = true;
        ocultarHint();
        core.marcarClaseFullscreen(true);
        core.marcarDeseado(true);
    } else {
        actualizarBtn();
        mostrarHintSiCorresponde();
    }
})();
