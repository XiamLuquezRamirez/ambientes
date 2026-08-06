/**
 * Modal estudiantes asociados a perfil de aprendizaje normal — solo lectura
 */
(function() {
    if (!window.PA_EST_URL_LIST) return;

    const $modal = $('#modalEstudiantesPerfilAprendizaje');
    const $contenedor = $('#modalEstudiantesPerfilAprendizajeContenedor');
    const $tbody = $('#modalEstudiantesPerfilAprendizajeTbody');
    const $loading = $('#modalEstudiantesPerfilAprendizajeLoading');
    const $empty = $('#modalEstudiantesPerfilAprendizajeEmpty');
    const $sinResultados = $('#modalEstudiantesPerfilAprendizajeSinResultados');
    const $contador = $('#modalEstudiantesPerfilAprendizajeContador');
    const $filtroNombre = $('#cnEstFiltroNombre');
    const $filtroGrado = $('#cnEstFiltroGrado');
    const $filtroGrupo = $('#cnEstFiltroGrupo');

    let estudiantesCache = [];

    function escapar(texto) {
        return $('<div>').text(texto ?? '').html();
    }

    function normalizar(texto) {
        return (texto || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function valoresUnicosOrdenados(items, campo) {
        return [...new Set(items.map((e) => e[campo]).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true })
        );
    }

    function limpiarFiltros() {
        $filtroNombre.val('');
        $filtroGrado.val('');
        $filtroGrupo.val('');
    }

    function poblarSelectGrados(estudiantes) {
        const grados = valoresUnicosOrdenados(estudiantes, 'grado');
        $filtroGrado.html('<option value="">Todos los grados</option>' +
            grados.map((g) => `<option value="${escapar(g)}">${escapar(g)}</option>`).join(''));
    }

    function poblarSelectGrupos(estudiantes, gradoSeleccionado) {
        const fuente = gradoSeleccionado
            ? estudiantes.filter((e) => (e.grado || '') === gradoSeleccionado)
            : estudiantes;
        const grupos = valoresUnicosOrdenados(fuente, 'grupo');
        const valorActual = $filtroGrupo.val();

        $filtroGrupo.html('<option value="">Todos los grupos</option>' +
            grupos.map((g) => `<option value="${escapar(g)}">${escapar(g)}</option>`).join(''));

        if (valorActual && grupos.includes(valorActual)) {
            $filtroGrupo.val(valorActual);
        } else {
            $filtroGrupo.val('');
        }
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
        const grado = $filtroGrado.val();
        const grupo = $filtroGrupo.val();

        return estudiantesCache.filter((e) => {
            const matchNombre = !q || normalizar(e.nombre).includes(q);
            const matchGrado = !grado || (e.grado || '') === grado;
            const matchGrupo = !grupo || (e.grupo || '') === grupo;
            return matchNombre && matchGrado && matchGrupo;
        });
    }

    function aplicarFiltros() {
        const filtrados = filtrarEstudiantes();
        $tbody.empty();

        if (!filtrados.length) {
            $sinResultados.show();
            $contenedor.find('.ct-est-table-wrap').hide();
        } else {
            $sinResultados.hide();
            $contenedor.find('.ct-est-table-wrap').show();
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
        limpiarFiltros();
        poblarSelectGrados(estudiantesCache);
        poblarSelectGrupos(estudiantesCache, '');
        aplicarFiltros();
    }

    window.abrirModalEstudiantesPerfilAprendizaje = function(perfilAprendizajeId, etiqueta) {
        limpiarFiltros();
        estudiantesCache = [];
        $('#modalEstudiantesPerfilAprendizajeSubtitle').text(etiqueta || 'Perfil de aprendizaje');
        $loading.show();
        $empty.hide();
        $contenedor.hide();
        $sinResultados.hide();
        $tbody.empty();
        $contador.text('');

        bootstrap.Modal.getOrCreateInstance($modal[0]).show();

        $.ajax({
            url: window.PA_EST_URL_LIST(perfilAprendizajeId),
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
                if (res.perfil_aprendizaje?.nombre) {
                    const codigo = res.perfil_aprendizaje.codigo ? `${res.perfil_aprendizaje.codigo} — ` : '';
                    $('#modalEstudiantesPerfilAprendizajeSubtitle').text(`${codigo}${res.perfil_aprendizaje.nombre}`);
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
    $filtroGrado.on('change', function() {
        poblarSelectGrupos(estudiantesCache, $(this).val());
        aplicarFiltros();
    });
    $filtroGrupo.on('change', aplicarFiltros);

    $(document).on('click keydown', '.badge-estudiantes-perfil-aprendizaje--click', function(e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e.type === 'keydown') e.preventDefault();
        const id = $(this).data('perfil-aprendizaje-id');
        const etiqueta = $(this).data('etiqueta') || '';
        if (id) window.abrirModalEstudiantesPerfilAprendizaje(id, etiqueta);
    });
})();
