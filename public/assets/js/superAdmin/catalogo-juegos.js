/**
 * Catálogo SuperAdmin de juegos: filtros AJAX + preview en overlay tablet.
 */
document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('juegosPage');
    if (!page) return;

    const urlBase = page.dataset.urlBase || '';
    const overlay = document.getElementById('cjPreviewOverlay');
    const frame = document.getElementById('cjPreviewFrame');
    const tablet = document.getElementById('cjTablet');
    const stage = document.getElementById('cjTabletStage');
    const titleEl = document.getElementById('cjPreviewTitle');
    const btnReload = document.getElementById('cjPreviewReload');

    const SCREEN_W = 1280;
    const SCREEN_H = 800;

    let urlActual = '';

    function perfilPayload() {
        try {
            const el = document.getElementById('cj-perfil-payload');
            return el ? JSON.parse(el.textContent || 'null') : null;
        } catch (e) {
            return null;
        }
    }

    function inyectarPerfil() {
        const perfil = perfilPayload();
        if (!perfil || !frame || !frame.contentWindow) return;
        try {
            frame.contentWindow.__PEDNIA_PERFIL__ = perfil;
            frame.contentWindow.postMessage({
                type: 'pednia:perfil',
                perfil: perfil,
            }, window.location.origin);
        } catch (e) { /* noop */ }
    }

    function ajustarEscalaTablet() {
        if (!overlay || overlay.hidden || !tablet) return;

        tablet.style.transform = 'none';
        const padX = 48;
        const padY = 96;
        const availW = Math.max(280, window.innerWidth - padX);
        const availH = Math.max(200, window.innerHeight - padY);
        const naturalW = tablet.offsetWidth || (SCREEN_W + 56);
        const naturalH = tablet.offsetHeight || (SCREEN_H + 80);
        const scale = Math.min(availW / naturalW, availH / naturalH, 1);

        tablet.style.transform = 'scale(' + scale + ')';
        tablet.style.transformOrigin = 'center center';

        if (stage) {
            stage.style.width = Math.round(naturalW * scale) + 'px';
            stage.style.height = Math.round(naturalH * scale) + 'px';
        }
    }

    function abrirPreview(url, nombre) {
        if (!overlay || !frame || !url) return;
        urlActual = url;
        if (titleEl) titleEl.textContent = nombre || 'Juego';
        if (frame) frame.title = nombre || 'Vista previa del juego';

        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        frame.onload = function () {
            inyectarPerfil();
        };
        frame.src = url;
        requestAnimationFrame(ajustarEscalaTablet);
    }

    function cerrarPreview() {
        if (!overlay) return;
        if (frame) {
            frame.onload = null;
            frame.src = 'about:blank';
        }
        urlActual = '';
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (tablet) tablet.style.transform = 'none';
        if (stage) {
            stage.style.width = '';
            stage.style.height = '';
        }
    }

    function recargarPreview() {
        if (!urlActual || !frame) return;
        frame.src = 'about:blank';
        requestAnimationFrame(function () {
            frame.src = urlActual;
        });
    }

    // Delegación: sobrevive al re-render AJAX del grid
    page.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-cj-preview]');
        if (!btn || !page.contains(btn)) return;
        e.preventDefault();
        abrirPreview(btn.getAttribute('data-url-paquete'), btn.getAttribute('data-juego-nombre'));
    });

    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target.closest('[data-cj-close]')) {
                e.preventDefault();
                cerrarPreview();
            }
        });
    }

    if (btnReload) {
        btnReload.addEventListener('click', function (e) {
            e.preventDefault();
            recargarPreview();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay && !overlay.hidden) {
            cerrarPreview();
        }
    });

    window.addEventListener('resize', function () {
        if (overlay && !overlay.hidden) ajustarEscalaTablet();
    });

    async function cargarGrid(url) {
        const contenedor = document.getElementById('container-grid');
        if (!contenedor) return;

        contenedor.style.opacity = '0.45';
        try {
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'No se pudo cargar el listado.');
            }
            contenedor.innerHTML = json.html;
            history.pushState(null, '', url);
            enlazarFiltros();
        } catch (err) {
            const msg = err.message || 'No se pudo cargar el listado de juegos.';
            if (typeof mostrarToast === 'function') mostrarToast('error', msg);
            else alert(msg);
        } finally {
            contenedor.style.opacity = '1';
        }
    }

    function aplicarFiltros() {
        const form = document.getElementById('formFiltrosJuegos');
        if (!form) return;
        const params = window.JuegosFiltrosUi.paramsDesdeForm(form);
        const url = params.toString() ? `${urlBase}?${params.toString()}` : urlBase;
        cargarGrid(url);
    }

    function enlazarFiltros() {
        const form = document.getElementById('formFiltrosJuegos');
        window.JuegosFiltrosUi.enlazar(form, aplicarFiltros);

        document.querySelectorAll('.pag-btn[href]').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                cargarGrid(link.getAttribute('href'));
            });
        });
    }

    enlazarFiltros();
});
