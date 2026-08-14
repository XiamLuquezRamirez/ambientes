/**
 * catalogo-dba.js — Admin · Catálogo unificado (MEN + colegio)
 * ---------------------------------------------------------------------------
 * Cargado en: resources/views/admin/catalogo/index.blade.php
 *
 * Requisitos globales del layout admin:
 *  - ajaxRequest(url, method?, data?)
 *  - mostrarToast(tipo, mensaje)
 *  - jQuery ($)
 *  - bootstrap, SweetAlert2 (Swal)
 *
 * Configuración: #catalogoDBAApp[data-url-base|data-url-api|data-url-guardar|data-url-detalle-base|data-solo-colegio]
 *
 * Cambios documentados (refactor):
 *  1) JS extraído desde el blade (~500 líneas) para mantenibilidad.
 *  2) Tras crear/editar se refresca por AJAX (sin location.reload),
 *     manteniendo filtros y cambiando a la pestaña «colegio».
 *  3) Filtro/columna «Origen» eliminados: las pestañas ya diferencian MEN/colegio.
 *  4) Badges/botones usan clases propias (ver catalogo-dba.css).
 *  5) Misma vista en Catálogo y Config › Catálogo DBA (data-solo-colegio=1 oculta MEN).
 * ---------------------------------------------------------------------------
 */

(function () {
    'use strict';

    const app = document.getElementById('catalogoDBAApp');
    if (!app) return;

    const URL_CATALOGO_BASE = app.dataset.urlBase;
    const URL_CATALOGO_DBA_BASE = app.dataset.urlApi;
    const URL_CATALOGO_DBA_GUARDAR = app.dataset.urlGuardar;
    const URL_DETALLE_BASE = app.dataset.urlDetalleBase || URL_CATALOGO_BASE;
    const SOLO_COLEGIO = app.dataset.soloColegio === '1';

    /** 1 = crear, 2 = editar */
    let tipoPost = 1;
    let id_editar = '';
    /** Tab activa: men | colegio */
    let tabActiva = SOLO_COLEGIO ? 'colegio' : 'men';
    let debounceTimer;

    const modalCrearCatalogoDBA = document.getElementById('modalCrearCatalogoDBA');
    const modalVerCatalogoDBA = document.getElementById('modalVerCatalogoDBA');

    function getModalCrearCatalogoDBA() {
        return bootstrap.Modal.getOrCreateInstance(modalCrearCatalogoDBA);
    }

    function getModalVerCatalogoDBA() {
        return bootstrap.Modal.getOrCreateInstance(modalVerCatalogoDBA);
    }

    function cerrarModalCrearCatalogoDBA() {
        bootstrap.Modal.getInstance(modalCrearCatalogoDBA)?.hide();
    }

    function sincronizarTabCatalogo(tab) {
        tabActiva = SOLO_COLEGIO ? 'colegio' : tab === 'colegio' ? 'colegio' : 'men';
        const btnNuevo = document.getElementById('btnNuevoDbaColegio');
        if (btnNuevo) {
            btnNuevo.classList.toggle('is-visible', tabActiva === 'colegio');
        }

        if (SOLO_COLEGIO) return;

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

    function setBtnCrearCatalogoDBA(modo) {
        const btn = document.getElementById('btnCrearCatalogoDBA');
        if (!btn) return;
        btn.disabled = false;
        if (modo === 'creando') {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
        } else if (modo === 'guardando') {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
        } else if (modo === 'crear') {
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear DBA del colegio';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        }
    }

    function abrirModalCrearCatalogoDBA() {
        tipoPost = 1;
        id_editar = '';
        $('#modalCrearCatalogoDBALabel').text('Crear DBA del colegio');
        $('#modalCrearCatalogoDBASubtitle').text('Define un DBA personalizado para tu institución');
        $('#modalCrearCatalogoDBAIcon').html('<i class="fas fa-book-medical text-white"></i>');
        setBtnCrearCatalogoDBA('crear');
        resetFormCrearCatalogoDBA();
        getModalCrearCatalogoDBA().show();
    }

    function abrirModalEditarCatalogoDBA(id) {
        tipoPost = 2;
        id_editar = id;
        $('#modalCrearCatalogoDBALabel').text('Editar DBA del colegio');
        $('#modalCrearCatalogoDBASubtitle').text('Modifica los datos del DBA de tu institución');
        $('#modalCrearCatalogoDBAIcon').html('<i class="fas fa-pen-to-square text-white"></i>');
        setBtnCrearCatalogoDBA('editar');
        resetFormCrearCatalogoDBA();
        getModalCrearCatalogoDBA().show();
        cargarDatosCatalogoDBA(id);
    }

    function abrirModalVerCatalogoDBA(id) {
        const cargando = document.getElementById('cargandoDetalleCatalogoDBA');
        const contenido = document.getElementById('contenidoDetalleCatalogoDBA');
        if (cargando) cargando.style.display = 'block';
        if (contenido) contenido.style.opacity = '.35';

        document.getElementById('modalVerCatalogoDBASubtitle').textContent = 'Cargando información...';
        getModalVerCatalogoDBA().show();

        fetch(`${URL_DETALLE_BASE}/detalle/${id}`, {
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

                document.getElementById('detalleEstado').innerHTML = data.estado
                    ? '<span class="badge badge-estado-activo">Activo</span>'
                    : '<span class="badge badge-estado-inactivo">Inactivo</span>';

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

    function resetFormCrearCatalogoDBA() {
        const form = document.getElementById('formCrearCatalogoDBA');
        if (!form) return;
        form.reset();
        limpiarErroresModal('formCrearCatalogoDBA');
    }

    function limpiarErroresModal(form) {
        document.querySelectorAll(`#${form} .campo-error`).forEach((el) => el.remove());
        document.querySelectorAll(`#${form} .is-invalid`).forEach((el) => el.classList.remove('is-invalid'));
    }

    function laravelKeyToInputName(campo) {
        if (!campo.includes('.')) return campo;
        const partes = campo.split('.');
        return partes[0] + partes.slice(1).map((p) => `[${p}]`).join('');
    }

    function mensajeValidacionCatalogoDBA(campo, codigo) {
        switch (codigo) {
            case 'validation.unique':
                return 'Este código ya existe en tu institución.';
            case 'validation.exists':
                return 'El valor seleccionado no es válido.';
            case 'validation.required':
                return 'Este campo es requerido.';
            case 'validation.max.string':
                return 'El texto supera la longitud permitida.';
            default:
                return codigo && !String(codigo).startsWith('validation.')
                    ? codigo
                    : 'Revise este campo.';
        }
    }

    function mostrarErroresModal(errors, form) {
        limpiarErroresModal(form);
        if (!errors) return;

        let primerInput = null;

        $.each(errors, function (campo, mensajes) {
            const nameAttr = laravelKeyToInputName(campo);
            const $input = $(document.getElementById(form)).find(`[name="${nameAttr}"]`);
            if (!$input.length) return;

            $input.addClass('is-invalid');
            $('<div>', {
                class: 'campo-error invalid-feedback d-block',
                text: mensajeValidacionCatalogoDBA(campo, mensajes[0]),
            }).insertAfter($input);

            if (!primerInput) primerInput = $input.get(0);
        });

        if (primerInput) primerInput.focus();
    }

    function aplicarFiltros() {
        const params = new URLSearchParams(new FormData(document.getElementById('formBuscar')));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        const url = params.toString() ? `${URL_CATALOGO_BASE}?${params.toString()}` : URL_CATALOGO_BASE;
        cargarTabla(url);
    }

    function mapearDatosCatalogoDBA(data) {
        document.getElementById('codigo').value = data.codigo || '';
        document.getElementById('area_id').value = data.area_id || '';
        document.getElementById('grado_id').value = data.grado_id || '';
        document.getElementById('descripcion').value = data.descripcion || '';
    }

    function cargarDatosCatalogoDBA(id) {
        Swal.fire({
            title: 'Cargando...',
            text: 'Consultando datos del catálogo',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading(),
        });

        fetch(`${URL_CATALOGO_DBA_BASE}/datos/${id}`, {
            headers: { Accept: 'application/json' },
        })
            .then((r) => r.json())
            .then((resp) => {
                Swal.close();
                if (!resp.success) throw new Error('No data');
                mapearDatosCatalogoDBA(resp.data);
            })
            .catch(() => {
                Swal.close();
                mostrarToast('error', 'No se pudo cargar la información del catálogo');
                cerrarModalCrearCatalogoDBA();
            });
    }

    /** Refresca listado por AJAX y opcionalmente fuerza pestaña colegio. */
    async function refrescarTrasGuardar() {
        sincronizarTabCatalogo('colegio');
        const params = new URLSearchParams(new FormData(document.getElementById('formBuscar')));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        // Al crear/editar conviene ver la primera página del colegio
        params.delete('page_colegio');
        const url = params.toString() ? `${URL_CATALOGO_BASE}?${params.toString()}` : URL_CATALOGO_BASE;
        await cargarTabla(url);
    }

    async function guardarCatalogoDBA() {
        const form = document.getElementById('formCrearCatalogoDBA');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const esCrear = tipoPost === 1;
        const formData = new FormData(form);

        if (esCrear) {
            setBtnCrearCatalogoDBA('creando');

            $.ajax({
                url: URL_CATALOGO_DBA_GUARDAR,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function (res) {
                    if (!res.success) {
                        mostrarToast('error', res.message);
                        return;
                    }
                    cerrarModalCrearCatalogoDBA();
                    Swal.fire({
                        icon: 'success',
                        title: res.message,
                        timer: 1200,
                        showConfirmButton: false,
                    }).then(() => refrescarTrasGuardar());
                },
                error: function (xhr) {
                    if (xhr.status === 422) {
                        const errors = xhr.responseJSON?.errors ?? {};
                        mostrarToast('error', 'Verifique los datos ingresados');
                        mostrarErroresModal(errors, 'formCrearCatalogoDBA');
                        return;
                    }
                    mostrarToast('error', xhr.responseJSON?.message || 'Error al crear el catálogo DBA');
                },
                complete: function () {
                    setBtnCrearCatalogoDBA('crear');
                },
            });
            return;
        }

        if (tipoPost === 2) {
            if (!id_editar) {
                mostrarToast('error', 'No se identificó el catálogo a editar.');
                return;
            }

            setBtnCrearCatalogoDBA('guardando');
            formData.append('_method', 'PUT');

            $.ajax({
                url: `${URL_CATALOGO_DBA_BASE}/${id_editar}`,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'json',
                success: function (res) {
                    if (!res.success) {
                        mostrarToast('error', res.message || 'No se pudo actualizar');
                        return;
                    }
                    cerrarModalCrearCatalogoDBA();
                    Swal.fire({
                        icon: 'success',
                        title: res.message,
                        timer: 1200,
                        showConfirmButton: false,
                    }).then(() => refrescarTrasGuardar());
                },
                error: function (xhr) {
                    if (xhr.status === 422) {
                        const errors = xhr.responseJSON?.errors ?? {};
                        mostrarToast('error', 'Verifique los datos ingresados');
                        mostrarErroresModal(errors, 'formCrearCatalogoDBA');
                        return;
                    }
                    mostrarToast(
                        'error',
                        xhr.responseJSON?.message || 'Error al actualizar el catálogo DBA'
                    );
                },
                complete: function () {
                    setBtnCrearCatalogoDBA('editar');
                },
            });
        }
    }

    function actualizarEstado(id, checkbox) {
        $.ajax({
            url: `${URL_CATALOGO_DBA_BASE}/${id}/toggle-activo`,
            type: 'PATCH',
            data: {
                _token: $('meta[name="csrf-token"]').attr('content'),
            },
            success: function (response) {
                Swal.fire({
                    icon: 'success',
                    title: response.estado ? 'Catálogo activado' : 'Catálogo desactivado',
                    timer: 1200,
                    showConfirmButton: false,
                });
            },
            error: function (xhr) {
                checkbox.prop('checked', !checkbox.prop('checked'));
                Swal.fire({
                    icon: 'warning',
                    title: 'No permitido',
                    text: xhr.responseJSON?.message ?? 'No fue posible actualizar el estado.',
                });
            },
        });
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
                params.has('buscar') ||
                params.has('area_id') ||
                params.has('grado_id') ||
                params.has('estado');
            const btnLimpiar = document.getElementById('btnLimpiar');
            if (btnLimpiar) {
                btnLimpiar.style.display = tieneFiltros ? 'inline-flex' : 'none';
            }
            sincronizarTabCatalogo(tabActiva);
        } else {
            mostrarToast('error', 'Error al cargar los datos');
        }
    }

    // ── Eventos ───────────────────────────────────────────────────────────
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

    $(document).on('change', '#contenedorCatalogo .toggle-activo', function () {
        const checkbox = $(this);
        const id = checkbox.data('id');
        const nombre = checkbox.data('nombre');

        if (checkbox.prop('checked')) {
            actualizarEstado(id, checkbox);
            return;
        }

        Swal.fire({
            title: `¿Desactivar ${nombre}?`,
            html: 'El catálogo dejará de estar disponible.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#94A3B8',
        }).then((result) => {
            if (result.isConfirmed) {
                actualizarEstado(id, checkbox);
            } else {
                checkbox.prop('checked', true);
            }
        });
    });

    document.getElementById('contenedorCatalogo')?.addEventListener('click', function (e) {
        const link = e.target.closest('.pagination a');
        if (!link) return;
        e.preventDefault();
        cargarTabla(link.href);
    });

    document.getElementById('formCrearCatalogoDBA')?.addEventListener('submit', function (e) {
        e.preventDefault();
        guardarCatalogoDBA();
    });

    // API global para onclick de tablas parciales
    window.abrirModalCrearCatalogoDBA = abrirModalCrearCatalogoDBA;
    window.abrirModalEditarCatalogoDBA = abrirModalEditarCatalogoDBA;
    window.abrirModalVerCatalogoDBA = abrirModalVerCatalogoDBA;
    window.cerrarModalCrearCatalogoDBA = cerrarModalCrearCatalogoDBA;

    sincronizarTabCatalogo(tabActiva);
})();
