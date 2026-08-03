/**
 * Modal estudiantes asociados a condición normal — solo admin, solo lectura
 */
(function() {
    if (!window.CN_EST_URL_LIST) return;

    const $modal = $('#modalEstudiantesCondicion');
    const $contenedor = $('#modalEstudiantesCondicionContenedor');
    const $tbody = $('#modalEstudiantesCondicionTbody');
    const $loading = $('#modalEstudiantesCondicionLoading');
    const $empty = $('#modalEstudiantesCondicionEmpty');
    const $sinResultados = $('#modalEstudiantesCondicionSinResultados');
    const $contador = $('#modalEstudiantesCondicionContador');
    const $filtroNombre = $('#cnEstFiltroNombre');

    let estudiantesCache = [];

    function escapar(texto) {
        return $('<div>').text(texto ?? '').html();
    }

    function normalizar(texto) {
        return (texto || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function renderFila(e) {
        const ficha = e.ficha_url
            ? `<a href="${e.ficha_url}" class="btn btn-sm btn-outline-primary" target="_blank" rel="noopener">
                    <i class="fa-solid fa-eye"></i> Ver ficha
               </a>`
            : '';

        return `<tr>
            <td><strong>${escapar(e.nombre)}</strong></td>
            <td>${escapar(e.grado || '—')}</td>
            <td>${escapar(e.grupo || '—')}</td>
            <td class="text-end ct-est-acciones-cell">${ficha}</td>
        </tr>`;
    }

    function filtrarEstudiantes() {
        const q = normalizar($filtroNombre.val().trim());
        return estudiantesCache.filter((e) => !q || normalizar(e.nombre).includes(q));
    }

    function aplicarFiltros() {
        const filtrados = filtrarEstudiantes();
        $tbody.empty();

        if (!filtrados.length) {
            $sinResultados.show();
            $('.ct-est-table-wrap').hide();
        } else {
            $sinResultados.hide();
            $('.ct-est-table-wrap').show();
            $tbody.html(filtrados.map(renderFila).join(''));
        }

        $contador.text(
            filtrados.length === estudiantesCache.length
                ? `${estudiantesCache.length} estudiante${estudiantesCache.length === 1 ? '' : 's'}`
                : `${filtrados.length} de ${estudiantesCache.length} estudiantes`
        );
    }

    function mostrarEstudiantes(estudiantes) {
        estudiantesCache = estudiantes || [];

        if (!estudiantesCache.length) {
            $contenedor.hide();
            $empty.show();
            $contador.text('');
            return;
        }

        $empty.hide();
        $contenedor.show();
        $filtroNombre.val('');
        aplicarFiltros();
    }

    window.abrirModalEstudiantesCondicion = function(condicionId, etiqueta) {
        $filtroNombre.val('');
        estudiantesCache = [];
        $('#modalEstudiantesCondicionSubtitle').text(etiqueta || 'Condición');
        $loading.show();
        $empty.hide();
        $contenedor.hide();
        $sinResultados.hide();
        $tbody.empty();
        $contador.text('');

        bootstrap.Modal.getOrCreateInstance($modal[0]).show();

        $.ajax({
            url: window.CN_EST_URL_LIST(condicionId),
            type: 'GET',
            dataType: 'json',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            },
            success: function(res) {
                $loading.hide();
                if (!res.success) {
                    $empty.show();
                    return;
                }
                if (res.condicion?.nombre) {
                    const codigo = res.condicion.codigo ? `${res.condicion.codigo} — ` : '';
                    $('#modalEstudiantesCondicionSubtitle').text(`${codigo}${res.condicion.nombre}`);
                }
                mostrarEstudiantes(res.estudiantes || []);
            },
            error: function(xhr) {
                $loading.hide();
                $empty.show();
                if (typeof mostrarToast === 'function') {
                    mostrarToast('error', xhr.responseJSON?.message || 'Error al cargar estudiantes.');
                }
            }
        });
    };

    $filtroNombre.on('input', aplicarFiltros);

    $(document).on('click keydown', '.badge-estudiantes-condicion--click', function(e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e.type === 'keydown') e.preventDefault();
        const id = $(this).data('condicion-id');
        const etiqueta = $(this).data('etiqueta') || '';
        if (id) window.abrirModalEstudiantesCondicion(id, etiqueta);
    });
})();
