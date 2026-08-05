(function() {
    const URL_INDEX = window.URL_CFG_PERFILES_APRENDIZAJE;
    const URL_ORDEN = window.URL_CFG_PERFILES_APRENDIZAJE_ORDEN;
    const URL_ESTADO = (id) => `${URL_INDEX}/${id}/estado`;
    let sortable = null;

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    function ordenSeleccionado() {
        return ($('#selectOrdenarPerfilesAprendizaje').val() || '').trim();
    }

    function actualizarBotonGuardarOrden() {
        const visible = !!ordenSeleccionado();
        $('#btnGuardarOrdenPerfilesAprendizaje').css('display', visible ? 'inline-flex' : 'none');
    }

    function initSortable() {
        const lista = document.getElementById('listaPerfilesAprendizajeOrden');
        if (!lista || typeof Sortable === 'undefined') return;

        if (sortable) {
            sortable.destroy();
            sortable = null;
        }

        const conCriterio = !!ordenSeleccionado();
        lista.classList.toggle('is-filtrada', conCriterio);
        if (conCriterio) return;

        sortable = Sortable.create(lista, {
            animation: 160,
            handle: '.cfg-drag',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: guardarOrden
        });
    }

    function guardarOrden(despuesDeSelect = false) {
        const ids = [...document.querySelectorAll('#listaPerfilesAprendizajeOrden .cfg-card')]
            .map(el => parseInt(el.dataset.id, 10))
            .filter(Boolean);

        if (!ids.length) {
            mostrarToast('info', 'No hay perfiles de aprendizaje para ordenar.');
            return;
        }

        const $btn = $('#btnGuardarOrdenPerfilesAprendizaje');
        $btn.prop('disabled', true);

        $.ajax({
            url: URL_ORDEN,
            type: 'PATCH',
            data: {
                orden: ids,
                _token: $('meta[name="csrf-token"]').attr('content')
            },
            dataType: 'json',
            success: function(res) {
                if (res.success) {
                    mostrarToast('success', res.message || 'Orden guardado correctamente.');
                    if (despuesDeSelect) {
                        $('#selectOrdenarPerfilesAprendizaje').val('');
                        actualizarBotonGuardarOrden();
                        cargarLista(URL_INDEX + (construirParamsSinOrdenar() ? `?${construirParamsSinOrdenar()}` : ''));
                        return;
                    }
                } else {
                    mostrarToast('error', res.message || 'No se pudo guardar el orden');
                    cargarLista();
                }
            },
            error: function(xhr) {
                mostrarToast('error', xhr.responseJSON?.message || 'Error al guardar el orden');
                cargarLista();
            },
            complete: function() {
                $btn.prop('disabled', false);
            }
        });
    }

    function construirParamsSinOrdenar() {
        const params = new URLSearchParams(new FormData(document.getElementById('formFiltrosPerfilesAprendizaje')));
        params.delete('ordenar');
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        return params.toString();
    }

    async function cargarLista(url = null) {
        const destino = url || construirUrl();
        const $contenedor = $('#contenedorListaPerfilesAprendizaje');
        $contenedor.css('opacity', '.45');

        try {
            const res = await $.ajax({
                url: destino,
                type: 'GET',
                dataType: 'json'
            });

            if (res.success) {
                $contenedor.html(res.html);
                history.pushState(null, '', destino);
                actualizarBotonGuardarOrden();
                initSortable();
            } else {
                mostrarToast('error', 'Error al cargar');
            }
        } catch (e) {
            mostrarToast('error', 'Error al cargar');
        } finally {
            $contenedor.css('opacity', '1');
        }
    }

    function construirUrl() {
        const params = new URLSearchParams(new FormData(document.getElementById('formFiltrosPerfilesAprendizaje')));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        return params.toString() ? `${URL_INDEX}?${params}` : URL_INDEX;
    }

    window.cargarListaPerfilesAprendizajeAdmin = cargarLista;

    $('#formFiltrosPerfilesAprendizaje select').on('change', function() {
        actualizarBotonGuardarOrden();
        cargarLista();
    });

    $('#formFiltrosPerfilesAprendizaje').on('submit', function(e) {
        e.preventDefault();
        cargarLista();
    });

    $('#btnGuardarOrdenPerfilesAprendizaje').on('click', function() {
        guardarOrden(true);
    });

    $(document).on('change', '.toggle-activa-perfil-aprendizaje-orden', async function() {
        const $toggle = $(this);
        const id = $toggle.data('id');
        const quiereActivar = $toggle.is(':checked');
        const nombre = $toggle.closest('.cfg-card').find('.cfg-titulo').text().trim() || 'este perfil de aprendizaje';

        if (!quiereActivar) {
            const confirmacion = await Swal.fire({
                icon: 'question',
                title: '¿Desactivar perfil de aprendizaje?',
                html: `El perfil de aprendizaje <strong>"${nombre}"</strong> dejará de aparecer para los docentes.<br><br>¿Desea continuar?`,
                showCancelButton: true,
                confirmButtonText: 'Sí, desactivar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#D97706',
                cancelButtonColor: '#94A3B8'
            });

            if (!confirmacion.isConfirmed) {
                $toggle.prop('checked', true);
                return;
            }
        }

        $toggle.prop('disabled', true);

        $.ajax({
            url: URL_ESTADO(id),
            type: 'PATCH',
            data: {
                _token: $('meta[name="csrf-token"]').attr('content')
            },
            dataType: 'json',
            success: function(res) {
                mostrarToast('success', res.message);
                const $card = $toggle.closest('.cfg-card');
                $card.toggleClass('is-inactive', !res.activa);
                $card.find('.badge-estado-local')
                    .toggleClass('badge-green', res.activa)
                    .toggleClass('badge-gray', !res.activa)
                    .text(res.activa ? 'Activa' : 'Desactivada');
            },
            error: function(xhr) {
                $toggle.prop('checked', !quiereActivar);
                mostrarToast('error', xhr.responseJSON?.message || 'No fue posible cambiar el estado');
            },
            complete: function() {
                $toggle.prop('disabled', false);
            }
        });
    });

    actualizarBotonGuardarOrden();
    initSortable();
})();
