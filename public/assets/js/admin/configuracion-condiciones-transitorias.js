(function() {
    const URL_INDEX = window.URL_CFG_TRANSITORIAS;
    const URL_ORDEN = window.URL_CFG_TRANSITORIAS_ORDEN;
    const URL_OPCION = (id) => `${URL_INDEX}/opcion/${id}`;
    const URL_ESTADO = (id) => `${URL_INDEX}/${id}/estado`;
    let sortable = null;

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    function hayFiltrosActivos() {
        const params = new URLSearchParams(new FormData(document.getElementById('formFiltrosTransitorias')));
        return [...params.values()].some(v => !!v);
    }

    function initSortable() {
        const lista = document.getElementById('listaTransitoriasOrden');
        if (!lista || typeof Sortable === 'undefined') return;

        if (sortable) {
            sortable.destroy();
            sortable = null;
        }

        const filtrada = hayFiltrosActivos();
        lista.classList.toggle('is-filtrada', filtrada);
        if (filtrada) return;

        sortable = Sortable.create(lista, {
            animation: 160,
            handle: '.cfg-drag',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: guardarOrden
        });
    }

    function guardarOrden() {
        const ids = [...document.querySelectorAll('#listaTransitoriasOrden .cfg-card')]
            .map(el => parseInt(el.dataset.id, 10))
            .filter(Boolean);

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
                    mostrarToast('success', res.message);
                } else {
                    mostrarToast('error', res.message || 'No se pudo guardar el orden');
                    cargarLista();
                }
            },
            error: function(xhr) {
                mostrarToast('error', xhr.responseJSON?.message || 'Error al guardar el orden');
                cargarLista();
            }
        });
    }

    async function cargarLista(url = null) {
        const destino = url || construirUrl();
        const $contenedor = $('#contenedorListaTransitorias');
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
                const params = new URL(destino, window.location.origin).searchParams;
                const tiene = params.has('buscar') || params.has('ordenar') ||
                    params.has('activa') || params.has('condicion_base_id');
                $('#btnLimpiarTransitorias').css('display', tiene ? 'inline-flex' : 'none');
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
        const params = new URLSearchParams(new FormData(document.getElementById('formFiltrosTransitorias')));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        return params.toString() ? `${URL_INDEX}?${params}` : URL_INDEX;
    }

    window.cargarListaTransitoriasAdmin = cargarLista;
    // Alias para el modal de registro/edición
    window.cargarTablaTransitorias = cargarLista;

    $('#formFiltrosTransitorias select').on('change', () => cargarLista());
    let debounce;
    $('#formFiltrosTransitorias input[name="buscar"]').on('input', function() {
        clearTimeout(debounce);
        debounce = setTimeout(() => cargarLista(), 350);
    });
    $('#formFiltrosTransitorias').on('submit', function(e) {
        e.preventDefault();
        cargarLista();
    });
    $('#btnLimpiarTransitorias').on('click', function(e) {
        e.preventDefault();
        $('#formFiltrosTransitorias')[0].reset();
        cargarLista(URL_INDEX);
    });

    $(document).on('change', '.toggle-activa-transitoria-orden', function() {
        const $toggle = $(this);
        const id = $toggle.data('id');
        const quiereActivar = $toggle.is(':checked');
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

    $(document).on('click', '.btn-editar-transitoria', function() {
        const id = $(this).data('id');
        if (typeof window.abrirModalEditarTransitoria === 'function') {
            window.abrirModalEditarTransitoria(id);
        }
    });

    $(document).on('click', '.btn-eliminar-transitoria', async function() {
        const id = $(this).data('id');
        const nombre = $(this).data('nombre');
        const estudiantes = parseInt($(this).data('estudiantes'), 10) || 0;

        if (estudiantes > 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'No se puede eliminar',
                html: `La opción <strong>"${nombre}"</strong> tiene <strong>${estudiantes}</strong> estudiante(s) asociados.<br>Desactívela en su lugar.`,
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const confirmacion = await Swal.fire({
            title: '¿Eliminar opción?',
            text: `"${nombre}" será eliminada permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#94A3B8'
        });

        if (!confirmacion.isConfirmed) return;

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
                mostrarToast('success', res.message || 'Eliminada correctamente');
                cargarLista();
            },
            error: function(xhr) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.message || 'No fue posible eliminar.'
                });
            }
        });
    });

    initSortable();
})();
