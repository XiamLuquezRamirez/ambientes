{{-- Modal: vista global de cobertura docente por grupo --}}
<div class="modal fade" id="modalDocentesAsignados" tabindex="-1" data-bs-keyboard="false"
    aria-labelledby="modalDocentesAsignadosLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-header-icon"><i class="fa-solid fa-user-group text-white"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="modal-title mb-0" id="modalDocentesAsignadosLabel">Grupos</h5>
                    <p class="modal-subtitle mb-0" id="modalDocentesAsignadosSubtitle">Vista global de grupos y docentes
                        asignados</p>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>

            <div class="modal-body">
                {{-- Filtros: recargan la página conservando búsqueda/estado de la tabla de docentes --}}
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
                    <select class="form-select form-select-sm" style="width:140px" id="filtroGrado"
                        onchange="aplicarFiltrosGrupos()">
                        <option value="">Todos los grados</option>
                        @foreach ($grados as $grado)
                            <option value="{{ $grado->id }}"
                                {{ isset($gradoId) && $gradoId == $grado->id ? 'selected' : '' }}>
                                {{ $grado->nombre }}</option>
                        @endforeach
                    </select>
                    <select class="form-select form-select-sm" style="width:110px" id="filtroAnio"
                        onchange="aplicarFiltrosGrupos()">
                        @foreach (range(2024, date('Y') + 1) as $y)
                            <option value="{{ $y }}" {{ $anio == $y ? 'selected' : '' }}>{{ $y }}
                            </option>
                        @endforeach
                    </select>
                </div>
                @php
                    // Contador para el aviso superior: grupos con alumnos pero sin ningún docente.
                    $gruposSinDocente = $grupos->filter(function ($grupo) use ($anio) {
                        $sinDocente = $grupo->cargasDocente->pluck('docente')->filter()->isEmpty();
                        return $grupo->totalMatriculas($anio) > 0 && $sinDocente;
                    });
                @endphp

                @if ($gruposSinDocente->isNotEmpty())
                    <div class="alerta-cobertura" id="alerta-cobertura-grupos">
                        <i class="fas fa-triangle-exclamation"></i>
                        {{ $gruposSinDocente->count() }} grupo(s) con estudiantes matriculados sin docente asignado.
                    </div>
                @endif

                @if ($grupos->isEmpty())
                    <div style="text-align:center;padding:40px;color:#94A3B8">
                        <i class="fas fa-layer-group"
                            style="font-size:2.5rem;opacity:.35;display:block;margin-bottom:12px"></i>
                        Sin grupos para los filtros seleccionados.
                    </div>
                @else
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Grado</th>
                                    <th>Grupo</th>
                                    <th>Docentes asignados</th>
                                    <th>Estudiantes</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($grupos as $grupo)
                                    @php
                                        $docentesAsignados = $grupo->cargasDocente
                                            ->pluck('docente')
                                            ->filter()
                                            ->map(
                                                fn($docente) => trim(
                                                    $docente->user->nombre . ' ' . $docente->user->apellido,
                                                ),
                                            );
                                        $tieneAlumnos = $grupo->totalMatriculas($anio) > 0;
                                        $sinDocentes = $docentesAsignados->count() === 0;
                                    @endphp
                                    {{-- table-danger = indicador rojo cuando hay estudiantes sin docente --}}
                                    <tr class="{{ $tieneAlumnos && $sinDocentes ? 'table-danger' : '' }}"
                                        id="fila-grupo-{{ $grupo->id }}"
                                        @if ($tieneAlumnos && $sinDocentes) title="Grupo con estudiantes matriculados sin docente asignado" @endif>
                                        <td>{{ $grupo->grado->nombre }}</td>
                                        <td>{{ $grupo->nombre }}</td>
                                        {{-- clase celda-docentes-grupo: objetivo del update AJAX tras asignar --}}
                                        <td class="celda-docentes-grupo">
                                            @if ($docentesAsignados->isEmpty())
                                                <span class="text-muted">Sin docentes asignados</span>
                                            @else
                                                {{ $docentesAsignados->join(', ') }}
                                            @endif
                                        </td>
                                        <td class="celda-estudiantes-grupo">{{ $grupo->totalMatriculas($anio) }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endif
            </div>

            <div class="modal-footer">
                <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    data-bs-dismiss="modal"> <i class="fa-solid fa-xmark"></i> Cerrar</button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
    <script>
        // Año lectivo activo en los filtros del modal (viene del controlador).
        const ANIO_LECTIVO = {{ (int) $anio }};
        const URL_STORE = "{{ route('admin.grupos.guardar') }}";
    </script>
    <script>
        const modalDocentesAsignados = new bootstrap.Modal(document.getElementById('modalDocentesAsignados'));

        // Al cerrar, limpiar estado auxiliar del modal de grupos.
        document.getElementById('modalDocentesAsignados').addEventListener('hidden.bs.modal', function() {
            limpiarModalDocentesAsignados();
        });

        /**
         * Limpieza al cerrar el modal de grupos.
         * (El submit de asignación vive en index.blade.php para evitar doble POST.)
         */
        function limpiarModalDocentesAsignados() {
            // Reservado para futura lógica de limpieza sin recargar la página.
        }

        // Abre el modal global; si hay filtros en la URL, la tabla ya viene filtrada desde el servidor.
        function abrirModalDocentesAsignados() {
            modalDocentesAsignados.show();
        }

        // Reabrir el modal solo si el usuario acaba de aplicar filtros (flag abrir_grupos=1).
        document.addEventListener('DOMContentLoaded', function() {
            const params = new URLSearchParams(window.location.search);
            if (params.get('abrir_grupos') === '1') {
                abrirModalDocentesAsignados();
                params.delete('abrir_grupos');
                const query = params.toString();
                history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location
                    .pathname);
            }
        });

        async function guardarGrupo() {
            const btn = document.getElementById('btnGuardarGrupo');
            const grupoId = document.getElementById('grupoId').value;
            const esEdit = !!grupoId;

            const body = {
                grado_id: document.getElementById('grupoGradoId').value,
                nombre: document.getElementById('grupoNombre').value,
                anio_lectivo: parseInt(document.getElementById('grupoAnio').value),
                cupo_maximo: parseInt(document.getElementById('grupoCupo').value),
            };

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Guardando…';

            const url = esEdit ?
                URL_UPDATE.replace(':id', grupoId) :
                URL_STORE;
            const method = esEdit ? 'PUT' : 'POST';

            const opts = {
                method,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(body),
            };

            btn.disabled = false;
            btn.textContent = esEdit ? 'Guardar cambios' : 'Crear Grupo';

            try {
                const res = await fetch(url, opts);
                const data = await res.json();

                if (data.ok) {
                    _modalGrupoBS.hide();
                    mostrarToast('success', esEdit ? 'Grupo actualizado.' : 'Grupo creado.');
                    setTimeout(() => window.location.reload(), 700);
                } else if (res.status === 422 && data.errors) {
                    Object.entries(data.errors).forEach(([f, msgs]) => {
                        const el = document.getElementById(`err-${f}`);
                        if (el) el.textContent = msgs[0];
                    });
                } else {
                    mostrarToast('error', data.mensaje ?? 'Error al guardar.');
                }
            } catch {
                mostrarToast('error', 'Error de conexión.');
            }
        }

        /**
         * Aplica filtros de grado/año recargando la página.
         * Conserva buscar, estado y página de la tabla de docentes.
         */
        function aplicarFiltrosGrupos() {
            const gradoId = document.getElementById('filtroGrado').value;
            const anio = document.getElementById('filtroAnio').value;
            const params = new URLSearchParams(window.location.search);

            if (gradoId) {
                params.set('grado_id', gradoId);
            } else {
                params.delete('grado_id');
            }

            if (anio) {
                params.set('anio', anio);
            } else {
                params.delete('anio');
            }

            // Marca para reabrir el modal tras recargar (solo cuando el usuario filtró desde aquí).
            params.set('abrir_grupos', '1');

            const query = params.toString();
            window.location.href = query ? `${window.location.pathname}?${query}` : window.location.pathname;
        }

        async function eliminarGrupo(id, nombre) {
            const {
                isConfirmed
            } = await Swal.fire({
                title: '¿Eliminar grupo?',
                text: `Se eliminará "${nombre}". Solo es posible si no tiene matrículas activas.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
                cancelButtonColor: '#94A3B8',
            });
            if (!isConfirmed) return;

            const url = URL_DESTROY.replace(':id', id);
            const res = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });
            const data = await res.json();
            if (data.ok) {
                const fila = document.getElementById(`fila-grupo-${id}`);
                if (fila) {
                    fila.style.opacity = '0';
                    setTimeout(() => fila.remove(), 250);
                }
                mostrarToast('success', 'Grupo eliminado.');
            } else {
                mostrarToast('error', data.mensaje ?? 'Error al eliminar.');
            }
        }

        /**
         * Refresca la fila de un grupo en la tabla del modal tras asignar docente.
         * Evita recargar toda la página: solo actualiza celdas y el indicador rojo.
         *
         * @param {Object} data - Payload devuelto por GruposController::asignarDocente
         */
        function actualizarFilaGrupoAsignado(data) {
            const fila = document.getElementById(`fila-grupo-${data.grupo_id}`);
            if (!fila) return;

            // Actualizar lista de nombres en la columna "Docentes asignados".
            const celdaDocentes = fila.querySelector('.celda-docentes-grupo');
            if (celdaDocentes) {
                celdaDocentes.innerHTML = data.docentes.length ?
                    data.docentes.join(', ') :
                    '<span class="text-muted">Sin docentes asignados</span>';
            }

            // Actualizar cantidad de estudiantes por si cambió en otra pestaña/sesión.
            const celdaEstudiantes = fila.querySelector('.celda-estudiantes-grupo');
            if (celdaEstudiantes && typeof data.estudiantes !== 'undefined') {
                celdaEstudiantes.textContent = data.estudiantes;
            }

            // Quitar el fondo rojo cuando ya hay al menos un docente asignado.
            if (!data.alerta_sin_docente) {
                fila.classList.remove('table-danger');
                fila.removeAttribute('title');
            }

            // Recalcular el banner superior de grupos sin cobertura.
            actualizarAlertaCoberturaGrupos();
        }

        /**
         * Cuenta las filas aún en rojo y actualiza u oculta el banner de alerta.
         */
        function actualizarAlertaCoberturaGrupos() {
            const filasEnRojo = document.querySelectorAll(
                '#modalDocentesAsignados tbody tr.table-danger'
            );
            const alerta = document.getElementById('alerta-cobertura-grupos');
            const total = filasEnRojo.length;

            if (total === 0) {
                if (alerta) alerta.remove();
                return;
            }

            const texto = `${total} grupo(s) con estudiantes matriculados sin docente asignado.`;
            if (alerta) {
                alerta.innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${texto}`;
            }
        }
    </script>
@endpush
