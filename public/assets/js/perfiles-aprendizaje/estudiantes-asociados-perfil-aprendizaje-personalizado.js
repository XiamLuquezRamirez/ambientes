/**
 * Modal estudiantes asociados a perfil de aprendizaje personalizado (admin / panel docente)
 */
(function() {
    const urlDesactivar = window.CT_EST_URL_DESACTIVAR || window.CT_EST_URL_DESASOCIAR;
    if (!urlDesactivar) return;

    const $modal = $('#modalEstudiantesTransitoria');
    const $contenedor = $('#modalEstudiantesTransitoriaContenedor');
    const $tbody = $('#modalEstudiantesTransitoriaTbody');
    const $loading = $('#modalEstudiantesTransitoriaLoading');
    const $empty = $('#modalEstudiantesTransitoriaEmpty');
    const $sinResultados = $('#modalEstudiantesTransitoriaSinResultados');
    const $contador = $('#modalEstudiantesTransitoriaContador');
    const $filtroNombre = $('#ctEstFiltroNombre');
    const $filtroGrado = $('#ctEstFiltroGrado');
    const $filtroGrupo = $('#ctEstFiltroGrupo');
    const $filtroDocente = $('#ctEstFiltroDocente');
    const $modalDesasociar = $('#modalDesasociarTransitoria');
    const $formDesasociar = $('#formDesasociarTransitoria');

    let perfilAprendizajePersonalizadoActualId = null;
    let estudiantesCache = [];

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content'),
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    function refrescarListas() {
        if (typeof window.cargarListaTransitoriasPanel === 'function') {
            window.cargarListaTransitoriasPanel();
        } else if (typeof window.cargarListaTransitoriasAdmin === 'function') {
            window.cargarListaTransitoriasAdmin();
        }
    }

    function escapar(texto) {
        return $('<div>').text(texto ?? '').html();
    }

    function normalizar(texto) {
        return (texto || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function limpiarFiltros() {
        $filtroNombre.val('');
        $filtroGrado.val('');
        $filtroGrupo.val('');
        $filtroDocente.val('');
    }

    function valoresUnicosOrdenados(items, campo) {
        return [...new Set(items.map((e) => e[campo]).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true })
        );
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

    function poblarSelectDocentes(estudiantes) {
        const docentes = [...new Set(estudiantes.map((e) => e.docente).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' })
        );

        $filtroDocente.html('<option value="">Todos los docentes</option>' +
            docentes.map((d) => `<option value="${escapar(d)}">${escapar(d)}</option>`).join(''));
    }

    function filtrarEstudiantes() {
        const q = normalizar($filtroNombre.val().trim());
        const grado = $filtroGrado.val();
        const grupo = $filtroGrupo.val();
        const docente = $filtroDocente.val();

        return estudiantesCache.filter((e) => {
            const matchNombre = !q || normalizar(e.nombre).includes(q);
            const matchGrado = !grado || (e.grado || '') === grado;
            const matchGrupo = !grupo || (e.grupo || '') === grupo;
            const matchDocente = !docente || (e.docente || '') === docente;
            return matchNombre && matchGrado && matchGrupo && matchDocente;
        });
    }

    function renderFila(e) {
        const acciones = e.puede_desasociar
            ? `<button type="button" class="btn btn-sm btn-outline-danger btn-desasociar-transitoria"
                    data-asignacion-id="${e.asignacion_id}"
                    data-nombre="${escapar(e.nombre)}">
                    <i class="fa-solid fa-unlink"></i> Desactivar
               </button>`
            : `<span class="text-muted" style="font-size:.82rem">Solo lectura</span>`;

        const ficha = e.ficha_url
            ? `<a href="${e.ficha_url}" class="btn btn-sm btn-outline-primary" target="_blank" rel="noopener">
                    <i class="fa-solid fa-eye"></i>
               </a>`
            : '';

        const obs = e.observacion
            ? `<small class="d-block text-muted ct-est-obs-inline">${escapar(e.observacion)}</small>`
            : '';

        return `<tr>
            <td><strong>${escapar(e.nombre)}</strong>${obs}</td>
            <td>${escapar(e.grado || '—')}</td>
            <td>${escapar(e.grupo || '—')}</td>
            <td>${escapar(e.fecha_activacion || '—')}</td>
            <td>${escapar(e.docente || '—')}</td>
            <td class="text-end ct-est-acciones-cell">${ficha}${acciones}</td>
        </tr>`;
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
        poblarSelectDocentes(estudiantesCache);
        aplicarFiltros();
    }

    function recargarModalActual() {
        if (!perfilAprendizajePersonalizadoActualId || !window.CT_EST_URL_LIST) return;
        $loading.show();
        $empty.hide();
        $contenedor.hide();
        $sinResultados.hide();

        $.ajax({
            url: window.CT_EST_URL_LIST(perfilAprendizajePersonalizadoActualId),
            type: 'GET',
            dataType: 'json',
            success: function(res) {
                $loading.hide();
                if (res.success) {
                    mostrarEstudiantes(res.estudiantes || []);
                } else {
                    $empty.show();
                }
            },
            error: function() {
                $loading.hide();
                $empty.show();
            }
        });
    }

    window.abrirModalEstudiantesTransitoria = function(perfilAprendizajeId, etiqueta) {
        perfilAprendizajePersonalizadoActualId = perfilAprendizajeId;
        estudiantesCache = [];
        $('#modalEstudiantesTransitoriaSubtitle').text(etiqueta || 'Perfil de aprendizaje personalizado');
        limpiarFiltros();
        $loading.show();
        $empty.hide();
        $contenedor.hide();
        $sinResultados.hide();
        $tbody.empty();
        $contador.text('');

        bootstrap.Modal.getOrCreateInstance($modal[0]).show();

        $.ajax({
            url: window.CT_EST_URL_LIST(perfilAprendizajeId),
            type: 'GET',
            dataType: 'json',
            success: function(res) {
                $loading.hide();
                if (!res.success) {
                    $empty.show();
                    return;
                }
                if (res.perfil_aprendizaje_personalizado?.etiqueta) {
                    const codigo = res.perfil_aprendizaje_personalizado.codigo ? `${res.perfil_aprendizaje_personalizado.codigo} — ` : '';
                    $('#modalEstudiantesTransitoriaSubtitle').text(`${codigo}${res.perfil_aprendizaje_personalizado.etiqueta}`);
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
    $filtroDocente.on('change', aplicarFiltros);

    $(document).on('click keydown', '.badge-estudiantes-transitoria--click', function(e) {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e.type === 'keydown') e.preventDefault();
        const id = $(this).data('transitoria-id');
        const etiqueta = $(this).data('etiqueta') || '';
        if (id) window.abrirModalEstudiantesTransitoria(id, etiqueta);
    });

    $(document).on('click', '.btn-desasociar-transitoria', function() {
        $('#desasociarAsignacionId').val($(this).data('asignacion-id'));
        $('#desasociarEstudianteNombre').html(`Estudiante: <strong>${escapar($(this).data('nombre'))}</strong>`);
        $formDesasociar[0].reset();
        bootstrap.Modal.getOrCreateInstance($modalDesasociar[0]).show();
    });

    $formDesasociar.on('submit', function(e) {
        e.preventDefault();
        const asignacionId = $('#desasociarAsignacionId').val();
        if (!$formDesasociar[0].checkValidity()) {
            $formDesasociar[0].reportValidity();
            return;
        }

        Swal.fire({
            title: 'Desactivando...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });

        $.ajax({
            url: urlDesactivar(asignacionId),
            type: 'POST',
            data: {
                motivo_cierre: $('#motivo_cierre').val(),
                observacion_cierre: ($('#observacion_cierre').val() || '').trim(),
                _token: $('meta[name="csrf-token"]').attr('content')
            },
            dataType: 'json',
            success: function(res) {
                Swal.close();
                if (res.success) {
                    bootstrap.Modal.getInstance($modalDesasociar[0])?.hide();
                    const onDesactivarSuccess = window.CT_EST_ON_DESACTIVAR_SUCCESS || window.CT_EST_ON_DESASOCIAR_SUCCESS;
                    if (typeof onDesactivarSuccess === 'function') {
                        onDesactivarSuccess(res);
                        return;
                    }
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('success', res.message);
                    }
                    refrescarListas();
                    recargarModalActual();
                } else {
                    const onDesactivarSuccess = window.CT_EST_ON_DESACTIVAR_SUCCESS || window.CT_EST_ON_DESASOCIAR_SUCCESS;
                    if (typeof onDesactivarSuccess === 'function') {
                        if (typeof mostrarToast === 'function') {
                            mostrarToast('error', res.message || 'No se pudo desactivar el perfil de aprendizaje personalizado.');
                        }
                    } else {
                        Swal.fire({ icon: 'error', title: 'Error', text: res.message || 'No se pudo desactivar el perfil de aprendizaje personalizado.' });
                    }
                }
            },
            error: function(xhr) {
                Swal.close();
                const msg = xhr.responseJSON?.message || 'No se pudo desactivar el perfil de aprendizaje personalizado.';
                const onDesactivarSuccess = window.CT_EST_ON_DESACTIVAR_SUCCESS || window.CT_EST_ON_DESASOCIAR_SUCCESS;
                if (typeof onDesactivarSuccess === 'function') {
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('error', msg);
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: msg
                    });
                }
            }
        });
    });
})();
