/**
 * Asignar perfil de aprendizaje (normal y personalizado) en la ficha del estudiante.
 */
(function() {
    const urlFragmentos = window.URL_FICHA_FRAGMENTOS_PERFILES || window.URL_FICHA_FRAGMENTOS_PERFIL_PERSONALIZADO;
    const TAB_LIST_ID = 'perfilTabs';

    function mostrarCargando(titulo) {
        Swal.fire({
            title: titulo || 'Procesando...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });
    }

    function tabActivoActual() {
        return document.querySelector(`#${TAB_LIST_ID} .nav-link.active`)?.getAttribute('data-bs-target') || '#tabResumen';
    }

    function activarTabFicha(selector) {
        const trigger = document.querySelector(`#${TAB_LIST_ID} [data-bs-target="${selector}"]`);
        if (!trigger || trigger.closest('.d-none')) {
            return;
        }
        bootstrap.Tab.getOrCreateInstance(trigger).show();
    }

    function sincronizarVisibilidadTabHistorial(mostrar) {
        const item = document.getElementById('fichaTabNavPerfilPersonalizado');
        if (!item) return;

        item.classList.toggle('d-none', !mostrar);

        if (!mostrar && tabActivoActual() === '#tabPerfilesAprendizajePersonalizado') {
            activarTabFicha('#tabResumen');
        }
    }

    function actualizarAccionesPerfiles(html) {
        if (html !== undefined) {
            $('#fichaAccionesPerfilesAprendizaje').html(html);
        }
    }

    function actualizarFragmentosPerfilAprendizaje(data) {
        if (data.perfil_normal_html !== undefined) {
            $('#fichaPerfilAprendizajeActivo').html(data.perfil_normal_html);
        }
        actualizarAccionesPerfiles(data.acciones_html);
    }

    function actualizarFragmentosPerfilAprendizajePersonalizado(data, opciones = {}) {
        const tabPrevio = tabActivoActual();

        if (data.activo_html !== undefined) {
            $('#fichaPerfilPersonalizadoActivo').html(data.activo_html);
        }
        actualizarAccionesPerfiles(data.acciones_html);
        if (data.historial_html !== undefined) {
            $('#tabPerfilesAprendizajePersonalizado').html(data.historial_html);
        }
        if (data.mostrar_tab_historial !== undefined) {
            sincronizarVisibilidadTabHistorial(data.mostrar_tab_historial);
        }

        if (opciones.irAHistorial && data.mostrar_tab_historial) {
            activarTabFicha('#tabPerfilesAprendizajePersonalizado');
            return;
        }

        activarTabFicha(tabPrevio);
    }

    function sincronizarPerfilPersonalizadoActivo(data) {
        if (data && data.perfil_personalizado_activo_etiqueta !== undefined) {
            window.FICHA_PERFIL_PERSONALIZADO_ACTIVO = data.perfil_personalizado_activo_etiqueta;
        }
    }

    function actualizarFragmentosCompletos(data, opciones = {}) {
        sincronizarPerfilPersonalizadoActivo(data);
        actualizarFragmentosPerfilAprendizaje(data);
        actualizarFragmentosPerfilAprendizajePersonalizado(data, opciones);
    }

    function recargarFragmentos(opciones = {}) {
        if (!urlFragmentos) {
            return $.Deferred().reject().promise();
        }

        return $.ajax({
            url: urlFragmentos,
            type: 'GET',
            dataType: 'json'
        }).done(function(res) {
            if (res.success) {
                actualizarFragmentosCompletos(res, opciones);
            }
        });
    }

    window.recargarFragmentosFichaPerfiles = recargarFragmentos;

    window.CT_EST_ON_DESACTIVAR_SUCCESS = function(res) {
        if (typeof mostrarToast === 'function') {
            mostrarToast('success', res.message);
        }
        if (res.acciones_html !== undefined || res.activo_html !== undefined) {
            actualizarFragmentosPerfilAprendizajePersonalizado(res, { irAHistorial: true });
            return;
        }
        recargarFragmentos({ irAHistorial: true });
    };
    window.CT_EST_ON_DESASOCIAR_SUCCESS = window.CT_EST_ON_DESACTIVAR_SUCCESS;

    function initCtSelect(config) {
        const root = document.getElementById(config.rootId);
        if (!root) return;

        const trigger = document.getElementById(config.triggerId);
        const label = document.getElementById(config.labelId);
        const hidden = document.getElementById(config.hiddenId);
        const buscar = document.getElementById(config.searchId);
        const empty = document.getElementById(config.emptyId);
        const modal = document.getElementById(config.modalId);
        const form = document.getElementById(config.formId);
        const options = () => Array.from(root.querySelectorAll('.ct-select-option'));

        function cerrar() {
            root.classList.remove('open');
        }

        function filtrar() {
            const q = (buscar?.value || '').trim().toLowerCase();
            let visibles = 0;

            options().forEach((opt) => {
                const texto = `${opt.dataset.label || ''} ${opt.dataset.codigo || ''}`.toLowerCase();
                const match = !q || texto.includes(q);
                opt.style.display = match ? '' : 'none';
                if (match) visibles++;
            });

            if (empty) empty.style.display = visibles === 0 ? '' : 'none';
        }

        function seleccionar(opt) {
            hidden.value = opt.dataset.id || '';
            label.textContent = opt.dataset.label || config.placeholder;
            label.classList.toggle('is-placeholder', !opt.dataset.id);
            options().forEach((o) => o.classList.remove('active'));
            opt.classList.add('active');
            if (trigger) trigger.style.borderColor = '';
            cerrar();
        }

        trigger?.addEventListener('click', (e) => {
            e.preventDefault();
            root.classList.toggle('open');
            if (root.classList.contains('open')) {
                if (buscar) buscar.value = '';
                filtrar();
                setTimeout(() => buscar?.focus(), 50);
            }
        });

        buscar?.addEventListener('input', filtrar);

        options().forEach((opt) => {
            opt.addEventListener('click', () => seleccionar(opt));
            if (opt.dataset.selected === '1') {
                seleccionar(opt);
            }
        });

        document.addEventListener('click', (e) => {
            if (!root.contains(e.target)) cerrar();
        });

        modal?.addEventListener('hidden.bs.modal', () => {
            cerrar();
            hidden.value = '';
            label.textContent = config.placeholder;
            label.classList.add('is-placeholder');
            options().forEach((o) => o.classList.remove('active'));
            if (buscar) buscar.value = '';
            form?.reset();
            if (trigger) trigger.style.borderColor = '';

            options().forEach((opt) => {
                if (opt.dataset.selected === '1') {
                    seleccionar(opt);
                }
            });
        });
    }

    initCtSelect({
        rootId: 'paSelect',
        triggerId: 'pa_select_trigger',
        labelId: 'paSelectLabel',
        hiddenId: 'perfil_aprendizaje_id_asignar',
        searchId: 'paBuscarPerfilAprendizaje',
        emptyId: 'paSelectEmpty',
        modalId: 'modalAsignarPerfilAprendizaje',
        formId: 'formAsignarPerfilAprendizaje',
        placeholder: 'Selecciona un perfil de aprendizaje…'
    });

    initCtSelect({
        rootId: 'papSelect',
        triggerId: 'pap_select_trigger',
        labelId: 'papSelectLabel',
        hiddenId: 'perfil_aprendizaje_personalizado_id_asignar',
        searchId: 'papBuscarPerfilAprendizajePersonalizado',
        emptyId: 'papSelectEmpty',
        modalId: 'modalAsignarPerfilAprendizajePersonalizado',
        formId: 'formAsignarPerfilAprendizajePersonalizado',
        placeholder: 'Selecciona un perfil de aprendizaje…'
    });

    function manejarErrorAjax(xhr, mensajeError) {
        Swal.close();
        const msg = xhr.responseJSON?.message
            || (xhr.responseJSON?.errors ? Object.values(xhr.responseJSON.errors).flat().join(' ') : null)
            || mensajeError;
        if (typeof mostrarToast === 'function') {
            mostrarToast('error', msg);
        }
    }

    function enviarAsignacionPerfilAprendizaje(form) {
        mostrarCargando('Asignando perfil...');

        $.ajax({
            url: window.URL_FICHA_ASIGNAR_PERFIL,
            type: 'POST',
            data: $(form).serialize(),
            dataType: 'json',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            success: function(res) {
                Swal.close();
                if (res.success) {
                    bootstrap.Modal.getInstance(document.getElementById('modalAsignarPerfilAprendizaje'))?.hide();
                    if (res.perfil_normal_html !== undefined || res.acciones_html !== undefined) {
                        actualizarFragmentosPerfilAprendizaje(res);
                    } else {
                        recargarFragmentos();
                    }
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('success', res.message);
                    }
                } else if (typeof mostrarToast === 'function') {
                    mostrarToast('error', res.message || 'No se pudo asignar el perfil de aprendizaje.');
                }
            },
            error: function(xhr) {
                manejarErrorAjax(xhr, 'No se pudo asignar el perfil de aprendizaje.');
            }
        });
    }

    function asignarPerfilAprendizaje(event) {
        event.preventDefault();

        if (!window.URL_FICHA_ASIGNAR_PERFIL) return;

        const form = event.currentTarget;
        const perfilId = $('#perfil_aprendizaje_id_asignar').val();

        if (!perfilId) {
            const trigger = document.getElementById('pa_select_trigger');
            if (trigger) trigger.style.borderColor = '#DC2626';
            if (typeof mostrarToast === 'function') {
                mostrarToast('warning', 'Debes elegir un perfil de aprendizaje antes de guardar.');
            }
            return;
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const perfilPersonalizadoActivo = window.FICHA_PERFIL_PERSONALIZADO_ACTIVO;

        if (perfilPersonalizadoActivo) {
            Swal.fire({
                title: '¿Asignar perfil de aprendizaje?',
                html: `El estudiante tiene activo el perfil de aprendizaje personalizado <strong>«${perfilPersonalizadoActivo}»</strong>.<br><br>Al asignar un perfil de aprendizaje, ese perfil personalizado se desactivará automáticamente.<br><br>¿Está seguro de continuar?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, asignar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#2563EB'
            }).then(function(result) {
                if (result.isConfirmed) {
                    enviarAsignacionPerfilAprendizaje(form);
                }
            });
            return;
        }

        enviarAsignacionPerfilAprendizaje(form);
    }

    function asignarPerfilAprendizajePersonalizado(event) {
        event.preventDefault();

        if (!window.URL_FICHA_ASIGNAR_PERFIL_PERSONALIZADO) return;

        const form = event.currentTarget;
        const perfilId = $('#perfil_aprendizaje_personalizado_id_asignar').val();

        if (!perfilId) {
            const trigger = document.getElementById('pap_select_trigger');
            if (trigger) trigger.style.borderColor = '#DC2626';
            if (typeof mostrarToast === 'function') {
                mostrarToast('warning', 'Debes elegir un perfil de aprendizaje personalizado antes de asignarlo.');
            }
            return;
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        mostrarCargando('Asignando perfil personalizado...');

        $.ajax({
            url: window.URL_FICHA_ASIGNAR_PERFIL_PERSONALIZADO,
            type: 'POST',
            data: $(form).serialize(),
            dataType: 'json',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            success: function(res) {
                Swal.close();
                if (res.success) {
                    bootstrap.Modal.getInstance(document.getElementById('modalAsignarPerfilAprendizajePersonalizado'))?.hide();
                    if (res.acciones_html !== undefined || res.activo_html !== undefined) {
                        actualizarFragmentosPerfilAprendizajePersonalizado(res, { irAHistorial: true });
                    } else {
                        recargarFragmentos({ irAHistorial: true });
                    }
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('success', res.message);
                    }
                } else if (typeof mostrarToast === 'function') {
                    mostrarToast('error', res.message || 'No se pudo asignar el perfil de aprendizaje personalizado.');
                }
            },
            error: function(xhr) {
                manejarErrorAjax(xhr, 'No se pudo asignar el perfil de aprendizaje personalizado.');
            }
        });
    }

    window.asignarPerfilAprendizaje = asignarPerfilAprendizaje;
    window.asignarPerfilAprendizajePersonalizado = asignarPerfilAprendizajePersonalizado;

    function desactivarPerfilAprendizaje(btn) {
        if (!window.URL_FICHA_DESACTIVAR_PERFIL) return;

        const nombre = $(btn).data('estudiante-nombre') || 'este estudiante';

        Swal.fire({
            title: '¿Desactivar perfil de aprendizaje?',
            html: `Se desactivará el perfil asignado a <strong>${nombre}</strong> y volverá a <strong>Estándar</strong>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626'
        }).then(function(result) {
            if (!result.isConfirmed) return;

            mostrarCargando('Desactivando perfil de aprendizaje...');

            $.ajax({
                url: window.URL_FICHA_DESACTIVAR_PERFIL,
                type: 'POST',
                data: {
                    _token: $('meta[name="csrf-token"]').attr('content')
                },
                dataType: 'json',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                success: function(res) {
                    Swal.close();
                    if (res.success) {
                        if (res.perfil_normal_html !== undefined || res.acciones_html !== undefined) {
                            actualizarFragmentosPerfilAprendizaje(res);
                        } else {
                            recargarFragmentos();
                        }
                        if (typeof mostrarToast === 'function') {
                            mostrarToast('success', res.message);
                        }
                    } else if (typeof mostrarToast === 'function') {
                        mostrarToast('error', res.message || 'No se pudo desactivar el perfil de aprendizaje.');
                    }
                },
                error: function(xhr) {
                    manejarErrorAjax(xhr, 'No se pudo desactivar el perfil de aprendizaje.');
                }
            });
        });
    }

    window.desactivarPerfilAprendizaje = desactivarPerfilAprendizaje;

    $(document).on('click', '.btn-desactivar-perfil-aprendizaje', function() {
        desactivarPerfilAprendizaje(this);
    });

    if (window.URL_FICHA_ASIGNAR_PERFIL) {
        document.getElementById('formAsignarPerfilAprendizaje')
            ?.addEventListener('submit', asignarPerfilAprendizaje);
    }

    if (window.URL_FICHA_ASIGNAR_PERFIL_PERSONALIZADO) {
        document.getElementById('formAsignarPerfilAprendizajePersonalizado')
            ?.addEventListener('submit', asignarPerfilAprendizajePersonalizado);
    }
})();
