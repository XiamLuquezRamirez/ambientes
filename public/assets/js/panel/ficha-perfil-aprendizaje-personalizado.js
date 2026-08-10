/**
 * Activar / desactivar perfil de aprendizaje personalizado en la ficha del estudiante (AJAX parcial).
 */
(function() {
    const urlFragmentos = window.URL_FICHA_FRAGMENTOS_PERFILES || window.URL_FICHA_FRAGMENTOS_PERFIL_PERSONALIZADO;
    if (!urlFragmentos) return;

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

    function actualizarFragmentos(data, opciones = {}) {
        const tabPrevio = tabActivoActual();

        if (data.activo_html !== undefined) {
            $('#fichaPerfilPersonalizadoActivo').html(data.activo_html);
        }
        if (data.acciones_html !== undefined) {
            const contenedor = document.getElementById('fichaAccionesPerfilesAprendizaje')
                || document.getElementById('fichaAccionesPerfilPersonalizado');
            if (contenedor) {
                contenedor.innerHTML = data.acciones_html;
            }
        }
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

    function recargarFragmentos(opciones = {}) {
        return $.ajax({
            url: urlFragmentos,
            type: 'GET',
            dataType: 'json'
        }).done(function(res) {
            if (res.success) {
                actualizarFragmentos(res, opciones);
            }
        });
    }

    window.CT_EST_ON_DESASOCIAR_SUCCESS = function(res) {
        if (typeof mostrarToast === 'function') {
            mostrarToast('success', res.message);
        }
        recargarFragmentos({ irAHistorial: true });
    };

    $(document).on('submit', '#formPerfilAprendizajePersonalizado', function(e) {
        if (!window.URL_FICHA_ACTIVAR_PERFIL_PERSONALIZADO) return;

        e.preventDefault();

        const form = this;
        const perfilId = $('#perfil_aprendizaje_personalizado_id').val();

        if (!perfilId) {
            document.getElementById('ct_select_trigger').style.borderColor = '#DC2626';
            if (typeof mostrarToast === 'function') {
                mostrarToast('warning', 'Debes elegir un perfil de aprendizaje personalizado antes de activarlo.');
            }
            return;
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        mostrarCargando('Activando perfil...');

        $.ajax({
            url: window.URL_FICHA_ACTIVAR_PERFIL_PERSONALIZADO,
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
                    bootstrap.Modal.getInstance(document.getElementById('modalPerfilAprendizajePersonalizado'))?.hide();
                    actualizarFragmentos(res, { irAHistorial: true });
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('success', res.message);
                    }
                } else if (typeof mostrarToast === 'function') {
                    mostrarToast('error', res.message || 'No se pudo activar el perfil.');
                }
            },
            error: function(xhr) {
                Swal.close();
                const msg = xhr.responseJSON?.message
                    || (xhr.responseJSON?.errors ? Object.values(xhr.responseJSON.errors).flat().join(' ') : null)
                    || 'No se pudo activar el perfil.';
                if (typeof mostrarToast === 'function') {
                    mostrarToast('error', msg);
                }
            }
        });
    });
})();
