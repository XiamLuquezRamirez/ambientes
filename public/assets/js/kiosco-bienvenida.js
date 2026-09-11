/**
 * Animación post-PIN: saludo sin botón y auto-avance al recorrido autenticado.
 */
(function () {
    'use strict';

    var DELAY_MS = 2000;
    var timer = null;

    function irAlRecorrido() {
        var wrap = document.querySelector('.bienambiente-wrap[data-redirect-inicio]');
        if (!wrap) return;

        var url = wrap.getAttribute('data-redirect-inicio');
        if (!url) return;

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

    function init() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        var wrap = document.querySelector('.bienambiente-wrap[data-redirect-inicio]');
        if (!wrap) return;

        timer = setTimeout(irAlRecorrido, DELAY_MS);
    }

    window.KioscoBienvenida = { init: init };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
