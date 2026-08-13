/**
 * catalogo-dba.js — Panel docente · Catálogo DBA (solo lectura)
 * ---------------------------------------------------------------------------
 * Cargado en: resources/views/panel/catalogo/index.blade.php
 *
 * Alcance docente:
 *  - MEN: institucion_id null, es_men=true, estado=true
 *  - Colegio: institucion_id de sesión, es_men=false, estado=true
 *  - Sin crear, editar ni toggle
 *  - Filtros: buscar, área, grado (sin estado)
 *  - Modal Ver detalle vía GET panel/catalogo/detalle/{id}
 * ---------------------------------------------------------------------------
 */

(function () {
    'use strict';

    const app = document.getElementById('catalogoDBAApp');
    if (!app) return;

    const URL_CATALOGO_BASE = app.dataset.urlBase;
    const URL_DETALLE_BASE = app.dataset.urlDetalle;

    let tabActiva = 'men';
    let debounceTimer;

    const modalVerCatalogoDBA = document.getElementById('modalVerCatalogoDBA');

    function getModalVerCatalogoDBA() {
        return bootstrap.Modal.getOrCreateInstance(modalVerCatalogoDBA);
    }

    function sincronizarTabCatalogo(tab) {
        tabActiva = tab === 'colegio' ? 'colegio' : 'men';

        const tabMen = document.getElementById('tab-dba-men');
        const tabColegio = document.getElementById('tab-dba-colegio');
        const panelMen = document.getElementById('panelDbaMen');
        const panelColegio = document.getElementById('panelDbaColegio');
        if (!tabMen || !tabColegio || !panelMen || !panelColegio) return;

        const esColegio = tabActiva === 'colegio';
        tabMen.classList.toggle('active', !esColegio);
        tabMen.setAttribute('aria-selected', String(!esColegio));
        tabColegio.classList.toggle('active', esColegio);
        tabColegio.setAttribute('aria-selected', String(esColegio));

        panelMen.classList.toggle('show', !esColegio);
        panelMen.classList.toggle('active', !esColegio);
        panelColegio.classList.toggle('show', esColegio);
        panelColegio.classList.toggle('active', esColegio);
    }

    function abrirModalVerCatalogoDBA(id) {
        const cargando = document.getElementById('cargandoDetalleCatalogoDBA');
        const contenido = document.getElementById('contenidoDetalleCatalogoDBA');
        if (cargando) cargando.style.display = 'block';
        if (contenido) contenido.style.opacity = '.35';

        document.getElementById('modalVerCatalogoDBASubtitle').textContent = 'Cargando información...';
        getModalVerCatalogoDBA().show();

        fetch(`${URL_DETALLE_BASE}/${id}`, {
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((resp) => {
                if (!resp.success) throw new Error('No data');
                const data = resp.data;

                document.getElementById('detalleCodigo').textContent = data.codigo || '—';
                document.getElementById('detalleArea').textContent = data.area || '—';
                document.getElementById('detalleGrado').textContent = data.grado || '—';
                document.getElementById('detalleDescripcion').textContent =
                    data.descripcion || 'Sin descripción';

                document.getElementById('detalleOrigen').innerHTML = data.es_men
                    ? '<span class="badge badge-men">MEN</span>'
                    : '<span class="badge badge-colegio">Del colegio</span>';

                document.getElementById('modalVerCatalogoDBASubtitle').textContent = data.es_men
                    ? 'DBA oficial del MEN'
                    : 'DBA personalizado del colegio';
            })
            .catch(() => {
                getModalVerCatalogoDBA().hide();
                mostrarToast('error', 'No se pudo cargar el detalle del DBA');
            })
            .finally(() => {
                if (cargando) cargando.style.display = 'none';
                if (contenido) contenido.style.opacity = '1';
            });
    }

    function aplicarFiltros() {
        const params = new URLSearchParams(new FormData(document.getElementById('formBuscar')));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        const url = params.toString() ? `${URL_CATALOGO_BASE}?${params.toString()}` : URL_CATALOGO_BASE;
        cargarTabla(url);
    }

    async function cargarTabla(url) {
        const contenedor = document.getElementById('contenedorCatalogo');
        const cargando = document.getElementById('cargando-tabla');
        if (!contenedor) return;

        contenedor.style.opacity = '.4';
        if (cargando) cargando.style.display = 'block';

        const res = await ajaxRequest(url);

        contenedor.style.opacity = '1';
        if (cargando) cargando.style.display = 'none';

        if (res.success && res.html) {
            contenedor.innerHTML = res.html;
            history.pushState(null, '', url);
            const params = new URL(url, window.location.origin).searchParams;
            const tieneFiltros =
                params.has('buscar') || params.has('area_id') || params.has('grado_id');
            const btnLimpiar = document.getElementById('btnLimpiar');
            if (btnLimpiar) {
                btnLimpiar.style.display = tieneFiltros ? 'inline-flex' : 'none';
            }
            sincronizarTabCatalogo(tabActiva);
        } else {
            mostrarToast('error', 'Error al cargar los datos');
        }
    }

    document.getElementById('contenedorCatalogo')?.addEventListener('shown.bs.tab', function (e) {
        const tab = e.target?.dataset?.tab;
        if (tab) sincronizarTabCatalogo(tab);
    });

    document.querySelectorAll('#formBuscar select').forEach((sel) => {
        sel.addEventListener('change', aplicarFiltros);
    });

    document.querySelector('#formBuscar input[name="buscar"]')?.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(aplicarFiltros, 400);
    });

    document.getElementById('formBuscar')?.addEventListener('submit', function (e) {
        e.preventDefault();
        clearTimeout(debounceTimer);
        aplicarFiltros();
    });

    document.getElementById('btnLimpiar')?.addEventListener('click', async function (e) {
        e.preventDefault();
        document.getElementById('formBuscar').reset();
        await cargarTabla(URL_CATALOGO_BASE);
    });

    document.getElementById('contenedorCatalogo')?.addEventListener('click', function (e) {
        const link = e.target.closest('.pagination a');
        if (!link) return;
        e.preventDefault();
        cargarTabla(link.href);
    });

    window.abrirModalVerCatalogoDBA = abrirModalVerCatalogoDBA;

    sincronizarTabCatalogo(tabActiva);
})();
