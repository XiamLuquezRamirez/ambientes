(function() {
    const URL_INDEX = window.URL_CFG_CONDICIONES;
    const URL_ORDEN = window.URL_CFG_CONDICIONES_ORDEN;
    const URL_ESTADO = (id) => `${URL_INDEX}/${id}/estado`;
    let sortable = null;

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    function hayFiltrosActivos() {
        const params = new URLSearchParams(new FormData(document.getElementById('formFiltrosCondiciones')));
        return [...params.values()].some(v => !!v);
    }

    function initSortable() {
        const lista = document.getElementById('listaCondicionesOrden');
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
        const ids = [...document.querySelectorAll('#listaCondicionesOrden .cfg-card')]
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
        const $contenedor = $('#contenedorListaCondiciones');
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
                const tiene = params.has('buscar') || params.has('ordenar') || params.has('activa');
                $('#btnLimpiarCondiciones').css('display', tiene ? 'inline-flex' : 'none');
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
        const params = new URLSearchParams(new FormData(document.getElementById('formFiltrosCondiciones')));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        return params.toString() ? `${URL_INDEX}?${params}` : URL_INDEX;
    }

    window.cargarListaCondicionesAdmin = cargarLista;

    $('#formFiltrosCondiciones select').on('change', () => cargarLista());
    let debounce;
    $('#formFiltrosCondiciones input[name="buscar"]').on('input', function() {
        clearTimeout(debounce);
        debounce = setTimeout(() => cargarLista(), 350);
    });
    $('#formFiltrosCondiciones').on('submit', function(e) {
        e.preventDefault();
        cargarLista();
    });
    $('#btnLimpiarCondiciones').on('click', function(e) {
        e.preventDefault();
        $('#formFiltrosCondiciones')[0].reset();
        cargarLista(URL_INDEX);
    });

    $(document).on('change', '.toggle-activa-condicion-orden', function() {
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

    initSortable();
})();
