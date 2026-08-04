/**
 * Lista de perfiles de aprendizaje personalizados — Panel docente
 */
(function() {
    const URL_INDEX = window.URL_PANEL_TRANSITORIAS;
    if (!URL_INDEX) return;

    const URL_OPCION = (id) => `${URL_INDEX}/opcion/${id}`;
    const URL_ESTADO = (id) => (window.URL_PANEL_TRANSITORIAS_ESTADO
        ? window.URL_PANEL_TRANSITORIAS_ESTADO(id)
        : `${URL_INDEX}/${id}/estado`);

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    function construirParams() {
        const form = document.getElementById('formFiltrosTransitoriasPanel');
        if (!form) return '';
        const params = new URLSearchParams(new FormData(form));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        return params.toString();
    }

    window.cargarListaTransitoriasPanel = function(url) {
        const destino = url || (construirParams() ? `${URL_INDEX}?${construirParams()}` : URL_INDEX);
        const $contenedor = $('#contenedorListaTransitoriasPanel');
        $contenedor.addClass('loading');

        $.ajax({
            url: destino,
            type: 'GET',
            dataType: 'json',
            success: function(res) {
                if (res.success && res.html !== undefined) {
                    $contenedor.html(res.html);
                }
            },
            error: function(xhr) {
                if (typeof mostrarToast === 'function') {
                    mostrarToast('error', xhr.responseJSON?.message || 'Error al cargar la lista.');
                }
            },
            complete: function() {
                $contenedor.removeClass('loading');
            }
        });
    };

    function desactivarCondicion(ordenId, nombre, onSuccess) {
        Swal.fire({
            title: 'Desactivando...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: URL_ESTADO(ordenId),
            type: 'PATCH',
            data: {
                _token: $('meta[name="csrf-token"]').attr('content'),
                activa: 0
            },
            dataType: 'json',
            success: function(res) {
                Swal.close();
                if (res.success) {
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('success', res.message || `«${nombre}» desactivada correctamente.`);
                    }
                    if (typeof onSuccess === 'function') onSuccess();
                    else window.cargarListaTransitoriasPanel();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'No se pudo desactivar',
                        text: res.message || 'Error al desactivar.',
                        confirmButtonColor: '#2563eb'
                    });
                }
            },
            error: function(xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'No se pudo desactivar',
                    text: xhr.responseJSON?.message || 'Error al desactivar.',
                    confirmButtonColor: '#2563eb'
                });
            }
        });
    }

    function ofrecerDesactivarEnLugarDeEliminar(ordenId, nombre, estudiantes) {
        Swal.fire({
            icon: 'warning',
            title: 'No se puede eliminar',
            html: `«<strong>${nombre}</strong>» tiene <strong>${estudiantes}</strong> estudiante(s) asociados.<br><br>¿Desea desactivarla en su lugar? Dejará de aparecer al asignar nuevos perfiles de aprendizaje.`,
            showCancelButton: true,
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#D97706',
            cancelButtonColor: '#64748B'
        }).then((result) => {
            if (result.isConfirmed) {
                desactivarCondicion(ordenId, nombre);
            }
        });
    }

    let debounceTimer = null;
    $('#formFiltrosTransitoriasPanel').on('change input', 'select, input[type="search"]', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => window.cargarListaTransitoriasPanel(), 280);
    });

    $(document).on('click', '.btn-editar-transitoria-panel', function() {
        const id = $(this).data('id');
        if (typeof window.abrirModalEditarTransitoria === 'function') {
            window.abrirModalEditarTransitoria(id);
        }
    });

    $(document).on('change', '.toggle-activa-transitoria-panel', function() {
        const $toggle = $(this);
        const ordenId = $toggle.data('id');
        const nombre = $toggle.data('nombre') || 'este perfil de aprendizaje';
        const quiereActivar = $toggle.is(':checked');

        if (!quiereActivar) {
            Swal.fire({
                icon: 'question',
                title: '¿Desactivar perfil de aprendizaje?',
                html: `«<strong>${nombre}</strong>» dejará de estar disponible para asignar a estudiantes.`,
                showCancelButton: true,
                confirmButtonText: 'Sí, desactivar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#D97706',
                cancelButtonColor: '#64748B'
            }).then((result) => {
                if (!result.isConfirmed) {
                    $toggle.prop('checked', true);
                    return;
                }
                enviarCambioEstado($toggle, ordenId);
            });
            return;
        }

        enviarCambioEstado($toggle, ordenId);
    });

    function enviarCambioEstado($toggle, ordenId) {
        $toggle.prop('disabled', true);

        $.ajax({
            url: URL_ESTADO(ordenId),
            type: 'PATCH',
            data: { _token: $('meta[name="csrf-token"]').attr('content') },
            dataType: 'json',
            success: function(res) {
                if (res.success) {
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('success', res.message);
                    }
                    const $card = $toggle.closest('.cfg-card');
                    $card.toggleClass('is-inactive', !res.activa);
                    $card.find('.cfg-acciones small.text-muted').text(res.activa ? 'Activa' : 'Desactivada');
                } else {
                    $toggle.prop('checked', !$toggle.is(':checked'));
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('error', res.message || 'No se pudo cambiar el estado.');
                    }
                }
            },
            error: function(xhr) {
                $toggle.prop('checked', !$toggle.is(':checked'));
                if (typeof mostrarToast === 'function') {
                    mostrarToast('error', xhr.responseJSON?.message || 'No se pudo cambiar el estado.');
                }
            },
            complete: function() {
                $toggle.prop('disabled', false);
            }
        });
    }

    $(document).on('click', '.btn-eliminar-transitoria-panel', function() {
        const id = $(this).data('id');
        const ordenId = $(this).data('orden-id');
        const nombre = $(this).data('nombre') || 'este perfil de aprendizaje';
        const estudiantes = parseInt($(this).data('estudiantes'), 10) || 0;

        if (estudiantes > 0) {
            ofrecerDesactivarEnLugarDeEliminar(ordenId, nombre, estudiantes);
            return;
        }

        Swal.fire({
            icon: 'warning',
            title: '¿Eliminar perfil de aprendizaje?',
            html: `Se eliminará <strong>${nombre}</strong>. Esta acción no se puede deshacer.`,
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#64748B'
        }).then((result) => {
            if (!result.isConfirmed) return;

            Swal.fire({
                title: 'Eliminando...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => Swal.showLoading()
            });

            $.ajax({
                url: URL_OPCION(id),
                type: 'DELETE',
                dataType: 'json',
                success: function(res) {
                    Swal.close();
                    if (res.success) {
                        if (typeof mostrarToast === 'function') {
                            mostrarToast('success', res.message || 'Eliminada correctamente.');
                        }
                        window.cargarListaTransitoriasPanel();
                    } else {
                        if (res.estudiantes_asignados > 0 && res.puede_desactivar) {
                            ofrecerDesactivarEnLugarDeEliminar(ordenId, nombre, res.estudiantes_asignados);
                            return;
                        }
                        Swal.fire({
                            icon: 'error',
                            title: 'No se pudo eliminar',
                            text: res.message || 'Error al eliminar.',
                            confirmButtonColor: '#2563eb'
                        });
                    }
                },
                error: function(xhr) {
                    Swal.close();
                    const data = xhr.responseJSON || {};
                    if (data.estudiantes_asignados > 0 && data.puede_desactivar) {
                        ofrecerDesactivarEnLugarDeEliminar(ordenId, nombre, data.estudiantes_asignados);
                        return;
                    }
                    Swal.fire({
                        icon: 'error',
                        title: 'No se pudo eliminar',
                        text: data.message || 'Error al eliminar.',
                        confirmButtonColor: '#2563eb'
                    });
                }
            });
        });
    });
})();
