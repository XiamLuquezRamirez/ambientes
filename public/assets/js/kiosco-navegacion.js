/**
 * Navegación del kiosco sin recargar el documento (conserva pantalla completa).
 */
(function () {
    'use strict';

    const PANE_ID = 'kioscoPane';
    const LAYOUT_STYLE_ID = 'kioscoLayoutStyles';

    function csrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function esRutaKiosco(pathname) {
        return /^\/(inicio|recorrido|bienvenida|alumnos(\/\d+\/pin)?|listo)$/.test(pathname);
    }

    function esEnlaceInterno(link) {
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return false;
        const url = new URL(link.href, window.location.origin);
        return url.origin === window.location.origin && esRutaKiosco(url.pathname);
    }

    function hojasLayout() {
        const hrefs = new Set();
        document.head.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
            const href = link.getAttribute('href');
            if (href) hrefs.add(href);
        });
        return hrefs;
    }

    function sincronizarEstilos(doc) {
        document.querySelectorAll('style[data-kiosco-page]').forEach(function (el) {
            el.remove();
        });
        document.querySelectorAll('link[data-kiosco-page]').forEach(function (el) {
            el.remove();
        });

        const layout = hojasLayout();

        doc.head.querySelectorAll('style').forEach(function (style) {
            if (style.id === LAYOUT_STYLE_ID) return;

            const nuevo = document.createElement('style');
            nuevo.setAttribute('data-kiosco-page', '1');
            nuevo.textContent = style.textContent;
            document.head.appendChild(nuevo);
        });

        doc.head.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
            const href = link.getAttribute('href');
            if (!href || layout.has(href)) return;

            const nuevo = document.createElement('link');
            nuevo.rel = 'stylesheet';
            nuevo.href = href;
            nuevo.setAttribute('data-kiosco-page', '1');
            document.head.appendChild(nuevo);
            layout.add(href);
        });
    }

    function sincronizarPerfil(doc) {
        const src = doc.getElementById('kiosco-perfil-params');
        const dest = document.getElementById('kiosco-perfil-params');
        if (src && dest) {
            dest.textContent = src.textContent;
        }
        if (window.PedniaPerfil && typeof window.PedniaPerfil.recargar === 'function') {
            window.PedniaPerfil.recargar();
        }
    }

    function actualizarBtnSalir() {
        const btn = document.getElementById('kioscoBtnSalir');
        if (!btn) return;

        const activa = !!document.querySelector('[data-kiosco-sesion="1"]');
        btn.hidden = !activa;
    }

    function initPagina() {
        if (window.KioscoPin && typeof window.KioscoPin.init === 'function') {
            window.KioscoPin.init();
        }
        if (window.KioscoBienvenida && typeof window.KioscoBienvenida.init === 'function') {
            window.KioscoBienvenida.init();
        }
        if (window.KioscoRecorrido && typeof window.KioscoRecorrido.boot === 'function') {
            window.KioscoRecorrido.boot();
        }
        actualizarBtnSalir();
    }

    function aplicarHtml(html, url, reemplazar) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nuevoPane = doc.getElementById(PANE_ID);
        const pane = document.getElementById(PANE_ID);

        if (!nuevoPane || !pane) {
            window.location.href = url;
            return;
        }

        if (window.KioscoCamino && typeof window.KioscoCamino.destroy === 'function') {
            window.KioscoCamino.destroy();
        }

        sincronizarEstilos(doc);
        sincronizarPerfil(doc);
        pane.innerHTML = nuevoPane.innerHTML;
        document.title = doc.title || document.title;

        const meta = doc.querySelector('meta[name="csrf-token"]');
        const metaActual = document.querySelector('meta[name="csrf-token"]');
        if (meta && metaActual) {
            metaActual.setAttribute('content', meta.getAttribute('content') || '');
        }

        if (reemplazar) {
            history.replaceState({ kiosco: true }, '', url);
        } else {
            history.pushState({ kiosco: true }, '', url);
        }

        initPagina();
    }

    function ir(url, reemplazar) {
        const destino = url.startsWith('http') ? url : (window.location.origin + url);
        const pathSolicitado = url.startsWith('http')
            ? new URL(url).pathname
            : (url.split('?')[0] || url);

        return fetch(destino, {
            headers: {
                Accept: 'text/html',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        })
            .then(function (resp) {
                if (resp.status === 401) {
                    return resp.json().then(function (data) {
                        const redirect = data.redirect || '/inicio';
                        const path = redirect.startsWith('http')
                            ? new URL(redirect).pathname
                            : redirect;
                        return ir(path, true);
                    });
                }

                if (!resp.ok) throw new Error('HTTP ' + resp.status);

                return resp.text().then(function (html) {
                    let pathFinal = pathSolicitado;
                    if (resp.redirected) {
                        pathFinal = new URL(resp.url).pathname;
                    }
                    aplicarHtml(html, pathFinal + (url.includes('?') ? url.slice(url.indexOf('?')) : ''), reemplazar || pathFinal !== pathSolicitado);
                });
            })
            .catch(function () {
                window.location.href = destino;
            });
    }

    function salir() {
        const btn = document.getElementById('kioscoBtnSalir');
        const url = (btn && btn.dataset.salirUrl) || '/salir';

        return fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ _token: csrfToken() }),
        })
            .then(function (resp) {
                return resp.json().catch(function () {
                    return { ok: true, redirect: '/inicio' };
                });
            })
            .then(function (data) {
                const redirect = (data && data.redirect) || '/inicio';
                const path = redirect.startsWith('http')
                    ? new URL(redirect).pathname
                    : redirect;
                if (!esRutaKiosco(path)) {
                    window.location.href = path;
                    return;
                }
                return ir(path, true);
            })
            .catch(function () {
                window.location.href = '/inicio';
            });
    }

    document.addEventListener('click', function (e) {
        const salirBtn = e.target.closest('#kioscoBtnSalir');
        if (salirBtn) {
            e.preventDefault();
            e.stopPropagation();
            salir();
            return;
        }

        const link = e.target.closest('a[href]');
        if (!esEnlaceInterno(link)) return;

        e.preventDefault();
        const url = new URL(link.href, window.location.origin);
        ir(url.pathname + url.search);
    }, true);

    window.addEventListener('popstate', function () {
        if (!esRutaKiosco(window.location.pathname)) return;
        ir(window.location.pathname + window.location.search, true);
    });

    actualizarBtnSalir();

    window.KioscoNav = {
        ir: ir,
        salir: salir,
        initPagina: initPagina,
        esRutaKiosco: esRutaKiosco,
        actualizarBtnSalir: actualizarBtnSalir,
    };
})();
