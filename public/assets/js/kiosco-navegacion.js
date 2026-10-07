/**
 * Navegación del kiosco sin recargar el documento (conserva pantalla completa).
 */
(function () {
    'use strict';

    const PANE_ID = 'kioscoPane';
    const LAYOUT_STYLE_ID = 'kioscoLayoutStyles';
    const ESPERA_ESTILOS_MS = 2000;
    /* Si la página superpuesta nunca avisa que terminó, la anterior se retira igual. */
    const SUPERPOSICION_MAX_MS = 10000;

    let superposicion = null;

    function csrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function esRutaKiosco(pathname) {
        return /^\/(inicio|recorrido|juegos|bienvenida|alumnos(\/\d+\/pin)?|listo)$/.test(pathname);
    }

    function esEnlaceInterno(link) {
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return false;
        const url = new URL(link.href, window.location.origin);
        return url.origin === window.location.origin && esRutaKiosco(url.pathname);
    }

    function hojasLayout() {
        const hrefs = new Set();
        document.head.querySelectorAll('link[rel="stylesheet"]:not([data-kiosco-saliente])').forEach(function (link) {
            const href = link.getAttribute('href');
            if (href) hrefs.add(href);
        });
        return hrefs;
    }

    /*
     * conservarActuales: los estilos de la página anterior se marcan como salientes en vez de borrarse,
     * porque esa página sigue visible debajo de la nueva hasta terminarSuperposicion().
     * Devuelve las promesas de carga de las hojas nuevas.
     */
    function sincronizarEstilos(doc, conservarActuales) {
        document.querySelectorAll('style[data-kiosco-page], link[data-kiosco-page]').forEach(function (el) {
            if (conservarActuales) el.setAttribute('data-kiosco-saliente', '1');
            else el.remove();
        });

        const layout = hojasLayout();
        const cargas = [];

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
            layout.add(href);

            const compartida = Array.from(document.querySelectorAll('link[data-kiosco-saliente]')).find(function (el) {
                return el.getAttribute('href') === href;
            });
            if (compartida) {
                compartida.removeAttribute('data-kiosco-saliente');
                return;
            }

            const nuevo = document.createElement('link');
            nuevo.rel = 'stylesheet';
            nuevo.href = href;
            nuevo.setAttribute('data-kiosco-page', '1');
            cargas.push(new Promise(function (resolve) {
                nuevo.onload = resolve;
                nuevo.onerror = resolve;
            }));
            document.head.appendChild(nuevo);
        });

        return cargas;
    }

    function terminarSuperposicion() {
        if (!superposicion) return;
        clearTimeout(superposicion.timer);
        superposicion = null;

        document.querySelectorAll('[data-kiosco-saliente]').forEach(function (el) {
            el.remove();
        });
        const pane = document.getElementById(PANE_ID);
        if (pane) pane.removeAttribute('data-kiosco-superponiendo');
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
        if (window.KioscoSelectorAula && typeof window.KioscoSelectorAula.init === 'function') {
            window.KioscoSelectorAula.init();
        }
        actualizarBtnSalir();
    }

    /*
     * modo 'encima': la página nueva se monta encima de la actual, que queda visible e inerte debajo
     * hasta que la nueva llama a terminarSuperposicion(). Solo aplica si la nueva lo admite
     * ([data-kiosco-superponible]); si no, la anterior se retira de inmediato.
     * modo 'debajo': la nueva se monta debajo y la actual queda encima (inerte) hasta que ella
     * misma llama a terminarSuperposicion(), p. ej. al terminar su animación de salida.
     */
    function aplicarHtml(html, url, reemplazar, modo) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const nuevoPane = doc.getElementById(PANE_ID);
        const pane = document.getElementById(PANE_ID);

        if (!nuevoPane || !pane) {
            window.location.href = url;
            return;
        }

        terminarSuperposicion();

        if (window.KioscoCamino && typeof window.KioscoCamino.destroy === 'function') {
            window.KioscoCamino.destroy();
        }

        if (!modo) {
            sincronizarEstilos(doc, false);
            sincronizarPerfil(doc);
            pane.innerHTML = nuevoPane.innerHTML;
            montarPagina(doc, url, reemplazar);
            return;
        }

        const cargas = sincronizarEstilos(doc, true);
        sincronizarPerfil(doc);

        /* Sin esperar el CSS, la página nueva se vería sin estilos junto a la anterior. */
        const limite = new Promise(function (resolve) {
            setTimeout(resolve, ESPERA_ESTILOS_MS);
        });
        return Promise.race([Promise.all(cargas), limite]).then(function () {
            Array.from(pane.children).forEach(function (el) {
                el.setAttribute('data-kiosco-saliente', '1');
                el.inert = true;
            });
            pane.setAttribute('data-kiosco-superponiendo', modo);
            superposicion = { timer: setTimeout(terminarSuperposicion, SUPERPOSICION_MAX_MS) };

            const plantilla = document.createElement('template');
            plantilla.innerHTML = nuevoPane.innerHTML;
            const admite = modo === 'debajo' || !!plantilla.content.querySelector('[data-kiosco-superponible]');
            if (modo === 'debajo') pane.insertBefore(plantilla.content, pane.firstChild);
            else pane.appendChild(plantilla.content);

            if (!admite) terminarSuperposicion();
            montarPagina(doc, url, reemplazar);
        });
    }

    function montarPagina(doc, url, reemplazar) {
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

    function destinoAbsoluto(url) {
        return url.startsWith('http') ? url : (window.location.origin + url);
    }

    function pathDe(url) {
        return url.startsWith('http') ? new URL(url).pathname : (url.split('?')[0] || url);
    }

    /* Pide la página sin montarla: { html, pathFinal } o { redirect401 }. */
    function pedir(url) {
        return fetch(destinoAbsoluto(url), {
            headers: {
                Accept: 'text/html',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        }).then(function (resp) {
            if (resp.status === 401) {
                return resp.json().then(function (data) {
                    const redirect = data.redirect || '/inicio';
                    return { redirect401: redirect.startsWith('http') ? new URL(redirect).pathname : redirect };
                });
            }

            if (!resp.ok) throw new Error('HTTP ' + resp.status);

            return resp.text().then(function (html) {
                return {
                    html: html,
                    pathFinal: resp.redirected ? new URL(resp.url).pathname : pathDe(url),
                };
            });
        });
    }

    /* Para pasar luego en ir(url, false, { precarga }): la página queda lista sin esperar la red. */
    function precargar(url) {
        const promesa = pedir(url);
        promesa.catch(function () { /* se reintenta al navegar */ });
        return promesa;
    }

    /*
     * opciones.superponer: monta la nueva encima de la actual; opciones.debajo: debajo (ver aplicarHtml).
     * opciones.precarga: promesa de precargar(url) para no volver a pedir la página.
     */
    function ir(url, reemplazar, opciones) {
        opciones = opciones || {};
        const modo = opciones.debajo ? 'debajo' : (opciones.superponer ? 'encima' : null);
        const pathSolicitado = pathDe(url);
        const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
        const respuesta = (opciones.precarga || pedir(url)).catch(function () {
            return pedir(url);
        });

        return respuesta
            .then(function (r) {
                if (r.redirect401) return ir(r.redirect401, true);
                return aplicarHtml(r.html, r.pathFinal + query, reemplazar || r.pathFinal !== pathSolicitado, modo);
            })
            .catch(function () {
                window.location.href = destinoAbsoluto(url);
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
        precargar: precargar,
        terminarSuperposicion: terminarSuperposicion,
        salir: salir,
        initPagina: initPagina,
        esRutaKiosco: esRutaKiosco,
        actualizarBtnSalir: actualizarBtnSalir,
    };
})();
