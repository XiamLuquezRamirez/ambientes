{{--
    JavaScript del modal "Asignar grupo".

    Requiere en el DOM:
    - #modalAsignarInfo (ver partials/modal-asignar-grupo.blade.php)

    Requiere globales del layout admin:
    - ajaxRequest(), mostrarToast(), Swal, bootstrap, jQuery

    Integración opcional (solo en listado de docentes):
    - cargarTabla()              Refresca la tabla principal tras asignar.
    - aplicarFiltrosGrupos()     Refresca el modal "Docentes asignados".
    - actualizarModalDocentesAsignados()
--}}
@push('scripts')
    <script>
        /**
         * ── Configuración ─────────────────────────────────────────────
         * Constantes y estado compartido del flujo de asignación.
         */
        if (typeof URL_DOCENTES === 'undefined') {
            window.URL_DOCENTES = "{{ route('admin.docentes') }}";
        }
        if (typeof ANIO_LECTIVO_ACTUAL === 'undefined') {
            window.ANIO_LECTIVO_ACTUAL = "{{ date('Y') }}";
        }
        if (typeof URL_GRUPOS_ASIGNAR === 'undefined') {
            window.URL_GRUPOS_ASIGNAR = "{{ url('admin/grupos') }}/:id/asignar-docente";
        }

        /** Referencias locales (el listado define const homónimas en un script previo). */
        const urlDocentesAsignar = window.URL_DOCENTES;
        const anioLectivoAsignar = window.ANIO_LECTIVO_ACTUAL;
        const urlGruposAsignar = window.URL_GRUPOS_ASIGNAR;

        /** Grupo precargado cuando el modal se abre en modo "grupo → docente". */
        let grupoAsignarId = null;

        /** Instancia Bootstrap del modal de asignación. */
        const modalBSAsignarInfo = bootstrap.Modal.getOrCreateInstance(
            document.getElementById('modalAsignarInfo')
        );

        document.getElementById('modalAsignarInfo').addEventListener('hidden.bs.modal', function() {
            limpiarErroresAsignacionForm();
            document.getElementById('formAsignarInfo').reset();
            document.getElementById('asignar_anio_lectivo').value = anioLectivoAsignar;
            renderizarAsignacionesActuales([]);
            grupoAsignarId = null;
            configurarModalAsignarModo('docente');
        });

        /**
         * Limpia errores de validación solo del formulario de asignación.
         * No depende de limpiarErroresModal() del listado principal.
         */
        function limpiarErroresAsignacionForm() {
            document.querySelectorAll('#formAsignarInfo .campo-error').forEach(el => el.remove());
            document.querySelectorAll('#formAsignarInfo .is-invalid').forEach(el => el.classList.remove('is-invalid'));
        }

        /**
         * Alterna la UI según el flujo activo:
         * - docente: se elige ambiente/grado/grupo para un docente ya seleccionado.
         * - grupo:   se elige docente y ambiente para un grupo ya precargado.
         */
        function configurarModalAsignarModo(modo) {
            const esModoGrupo = modo === 'grupo';
            document.getElementById('asignar_modo').value = modo;

            document.getElementById('asignar-campo-docente-nombre').style.display = esModoGrupo ? 'none' : '';
            document.getElementById('asignar-campo-grupo-contexto').style.display = esModoGrupo ? '' : 'none';
            document.getElementById('asignar-campo-docente-select').style.display = esModoGrupo ? '' : 'none';
            document.getElementById('asignar-seccion-asignaciones-docente').style.display = esModoGrupo ? 'none' : '';

            document.getElementById('asignar_grado_id').disabled = esModoGrupo;
            document.getElementById('asignar_grupos_id').disabled = esModoGrupo;

            const titulo = document.getElementById('modalAsignarInfoLabel');
            const subtitulo = document.querySelector('#modalAsignarInfo .modal-subtitle');
            if (titulo) {
                titulo.textContent = esModoGrupo ? 'Asignar docente' : 'Asignar grupo';
            }
            if (subtitulo) {
                subtitulo.textContent = esModoGrupo ?
                    'Selecciona el docente y el ambiente para este grupo' :
                    'Agrega una carga docente para el año actual';
            }
        }

        /** Cierra el modal de asignación. */
        function cerrarModalAsignarInfo() {
            limpiarErroresAsignacionForm();
            document.activeElement?.blur();
            modalBSAsignarInfo.hide();
        }

        /**
         * Refresca el modal "Docentes asignados" si está abierto en la página de listado.
         */
        function refrescarModalDocentesAsignadosSiAbierto() {
            const modal = document.getElementById('modalDocentesAsignados');
            if (modal?.classList.contains('show') && typeof aplicarFiltrosGrupos === 'function') {
                aplicarFiltrosGrupos();
            }
        }

        /**
         * Abre el modal en modo docente→grupo.
         * Bloquea docentes inactivos con Swal (sus asignaciones quedan liberadas en el servidor).
         *
         * @param {number} id - user_id del docente.
         */
        async function abrirModalAsignarGrado(id) {
            try {
                const resp = await ajaxRequest(`${urlDocentesAsignar}/${id}`);
                if (!resp.success) throw new Error('No data');

                const data = resp.data;

                if (data.estado !== 'activo') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Docente inactivo',
                        text: 'No se puede asignar grupo a un docente inactivo.',
                        confirmButtonText: 'Entendido',
                    });
                    refrescarModalDocentesAsignadosSiAbierto();
                    return;
                }

                grupoAsignarId = null;
                configurarModalAsignarModo('docente');

                document.getElementById('formAsignarInfo').reset();
                document.getElementById('asignar_modo').value = 'docente';
                document.getElementById('asignar_docente_id').value = data.id;
                document.getElementById('asignar_nombre').textContent =
                    `${data.nombre ?? ''} ${data.apellido ?? ''}`.trim();
                document.getElementById('asignar_anio_lectivo').value = anioLectivoAsignar;
                document.getElementById('asignar_grado_id').innerHTML =
                    '<option value="">— Selecciona un grado —</option>';
                document.getElementById('asignar_grupos_id').innerHTML =
                    '<option value="">— Selecciona un grupo —</option>';
                renderizarAsignacionesActuales(data.asignaciones ?? []);

                modalBSAsignarInfo.show();
            } catch (error) {
                console.error('Error:', error);
                mostrarToast('error', 'No se pudo cargar la información del docente');
            }
        }

        /**
         * Pinta la tabla de cargas actuales del docente dentro del modal.
         *
         * @param {Array} asignaciones - Lista devuelta por el endpoint ver/asignarGrupo.
         */
        function renderizarAsignacionesActuales(asignaciones) {
            const contenedor = document.getElementById('asignaciones_actuales_docente');
            const docenteId = document.getElementById('asignar_docente_id').value;

            if (!asignaciones.length) {
                contenedor.innerHTML = `
                    <div class="seccion-vacia">
                        <p>Este docente aún no tiene grupos asignados para el año actual.</p>
                    </div>`;
                return;
            }

            const filas = asignaciones.map(a => `
                <tr id="fila-asignacion-${a.id}">
                    <td>${a.ambiente}</td>
                    <td>${a.grado}</td>
                    <td>${a.grupo}</td>
                    <td>${a.estudiantes}</td>
                    <td>${a.estado}</td>
                    <td style="text-align:center">
                        <button type="button" class="btn-accion btn-eliminar"
                            onclick="quitarAsignacion(${docenteId}, ${a.id})">
                            <i class="fa-solid fa-trash-can"></i> Quitar
                        </button>
                    </td>
                </tr>
            `).join('');

            contenedor.innerHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Ambiente</th>
                                <th>Grado</th>
                                <th>Grupo</th>
                                <th>Estudiantes</th>
                                <th>Estado</th>
                                <th style="width:110px;text-align:center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>`;
        }

        /** Muestra errores de validación del formulario de asignación. */
        function mostrarErroresAsignacion(errors) {
            limpiarErroresAsignacionForm();
            for (const [campo, mensajes] of Object.entries(errors)) {
                const input = document.querySelector(`#formAsignarInfo [name="${campo}"]`);
                if (!input) continue;
                input.classList.add('is-invalid');
                const div = document.createElement('div');
                div.className = 'campo-error';
                div.textContent = mensajes[0];
                input.insertAdjacentElement('afterend', div);
            }
            document.querySelector('#formAsignarInfo .is-invalid')?.focus();
        }

        /**
         * Carga grados disponibles para el ambiente y año seleccionados.
         */
        $(document).on('change', '#asignar_ambiente_id', function() {
            const ambienteId = $(this).val();
            const anio = $('#asignar_anio_lectivo').val();

            $('#asignar_grado_id').html('<option value="">— Selecciona un grado —</option>');
            $('#asignar_grupos_id').html('<option value="">— Selecciona un grupo —</option>');

            if (!ambienteId) return;

            $.get(`/admin/ambientes/${ambienteId}/gradoslistado`, {
                anio_lectivo: anio
            }, function(grados) {
                grados.forEach(grado => {
                    $('#asignar_grado_id').append(
                        `<option value="${grado.id}">${grado.nombre}</option>`
                    );
                });
            });
        });

        $(document).on('change', '#asignar_grado_id', cargarGruposAsignacion);
        $('#asignar_anio_lectivo').on('change', cargarGruposAsignacion);

        /**
         * Carga grupos libres para ambiente + grado + año.
         */
        function cargarGruposAsignacion() {
            const ambienteId = $('#asignar_ambiente_id').val();
            const gradoId = $('#asignar_grado_id').val();
            const anio = $('#asignar_anio_lectivo').val();

            $('#asignar_grupos_id').html('<option value="">— Selecciona un grupo —</option>');

            if (!ambienteId || !gradoId || !anio) return;

            $.get(`/admin/grados/${gradoId}/grupos`, {
                anio_lectivo: anio,
                ambiente_id: ambienteId,
            }, function(grupos) {
                grupos.forEach(grupo => {
                    $('#asignar_grupos_id').append(
                        `<option value="${grupo.id}">${grupo.nombre}</option>`
                    );
                });
            });
        }

        /**
         * Submit unificado: soporta modo docente→grupo y grupo→docente.
         */
        document.getElementById('formAsignarInfo').addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnAsignarInfo');
            btn.disabled = true;

            const gradoSelect = document.getElementById('asignar_grado_id');
            const grupoSelect = document.getElementById('asignar_grupos_id');
            const gradoEstabaDeshabilitado = gradoSelect.disabled;
            const grupoEstabaDeshabilitado = grupoSelect.disabled;
            gradoSelect.disabled = false;
            grupoSelect.disabled = false;

            const datos = Object.fromEntries(new FormData(this).entries());

            if (gradoEstabaDeshabilitado) gradoSelect.disabled = true;
            if (grupoEstabaDeshabilitado) grupoSelect.disabled = true;

            const modo = datos.asignar_modo || 'docente';
            let res;

            if (modo === 'grupo') {
                const grupoId = grupoAsignarId || datos.grupo_id;
                if (!grupoId) {
                    mostrarToast('error', 'Selecciona un grupo válido.');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar asignación';
                    return;
                }
                res = await ajaxRequest(urlGruposAsignar.replace(':id', grupoId), 'POST', datos);
            } else {
                res = await ajaxRequest(`${urlDocentesAsignar}/${datos.id}/asignar-grupo`, 'POST', datos);
            }

            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar asignación';

            if (res.success) {
                if (modo === 'grupo') {
                    mostrarToast('success', res.message || 'Docente asignado correctamente.');
                    modalBSAsignarInfo.hide();
                    grupoAsignarId = null;
                } else {
                    renderizarAsignacionesActuales(res.data?.asignaciones ?? []);
                    document.getElementById('asignar_grado_id').innerHTML =
                        '<option value="">— Selecciona un grado —</option>';
                    document.getElementById('asignar_grupos_id').innerHTML =
                        '<option value="">— Selecciona un grupo —</option>';
                    document.getElementById('asignar_ambiente_id').value = '';
                    mostrarToast('success', res.message);

                    if (typeof cargarTabla === 'function') {
                        await cargarTabla(location.href);
                    }
                }

                if (typeof actualizarModalDocentesAsignados === 'function') {
                    actualizarModalDocentesAsignados();
                }
            } else if (res.errors && Object.keys(res.errors).length) {
                mostrarErroresAsignacion(res.errors);
            } else {
                mostrarToast('error', res.message || 'Error al guardar');
            }
        });

        /**
         * Desasigna una carga docente (marca inactiva en el servidor).
         * Usado desde el modal y desde la vista de detalle del docente.
         */
        function quitarAsignacion(docenteId, cargaId) {
            Swal.fire({
                title: '¿Quitar asignación?',
                text: 'Se desasignará este grupo del docente para el año actual.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, quitar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
            }).then(async (result) => {
                if (!result.isConfirmed) return;

                const res = await ajaxRequest(
                    `${urlDocentesAsignar}/${docenteId}/asignaciones/${cargaId}`,
                    'DELETE'
                );

                if (res.success) {
                    document.getElementById(`fila-asignacion-${cargaId}`)?.remove();

                    if (typeof actualizarModalDocentesAsignados === 'function') {
                        actualizarModalDocentesAsignados();
                    }

                    mostrarToast('success', res.message);

                    const tbody = document.querySelector('.tabla-asignaciones tbody');
                    if (tbody && !tbody.querySelector('tr')) {
                        tbody.innerHTML =
                            '<tr><td colspan="6" class="text-center text-muted">Sin asignaciones para este año.</td></tr>';
                    }
                } else {
                    mostrarToast('error', res.message || 'Error al quitar la asignación');
                }
            });
        }
    </script>
@endpush
