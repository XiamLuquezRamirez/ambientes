document.addEventListener('DOMContentLoaded', function () {
    const page = document.getElementById('juegosPage');
    if (!page) return;

    const urlBase = page.dataset.urlBase || '';

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
