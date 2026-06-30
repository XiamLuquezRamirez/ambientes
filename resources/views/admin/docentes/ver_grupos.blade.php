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
                {{-- Filtros: consulta AJAX sin recargar la página --}}
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

                <div id="grupos-asignados-contenido">
                    <div class="text-center text-muted py-4" id="grupos-asignados-placeholder">
                        <i class="fas fa-spinner fa-spin" style="margin-right:6px"></i>
                        Cargando información…
                    </div>
                </div>
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
        // Año lectivo activo en los filtros del modal (se actualiza vía AJAX).
        let ANIO_LECTIVO = {{ (int) $anio }};
        const URL_GRUPOS_ASIGNADOS = "{{ route('admin.docentes.grupos-asignados') }}";
        const URL_STORE = "{{ route('admin.grupos.guardar') }}";
    </script>
    <script>
        const modalDocentesAsignados = new bootstrap.Modal(document.getElementById('modalDocentesAsignados'));

        // Al cerrar, limpiar estado auxiliar del modal de grupos.
        document.getElementById('modalDocentesAsignados').addEventListener('hidden.bs.modal', function() {
            limpiarModalDocentesAsignados();
        });

        /**
         * Aplica filtros de grado/año vía AJAX sin recargar la página.
         */
        async function aplicarFiltrosGrupos() {
            const gradoId = document.getElementById('filtroGrado').value;
            const anio = document.getElementById('filtroAnio').value;
            const contenedor = document.getElementById('grupos-asignados-contenido');
            const filtros = document.getElementById('filtroGrado').closest('div');

            const params = new URLSearchParams();
            if (gradoId) params.set('grado_id', gradoId);
            if (anio) params.set('anio', anio);

            contenedor.style.opacity = '0.5';
            contenedor.style.pointerEvents = 'none';
            if (filtros) filtros.style.pointerEvents = 'none';

            try {
                const res = await fetch(`${URL_GRUPOS_ASIGNADOS}?${params}`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                });
                const data = await res.json();

                if (data.success) {
                    contenedor.innerHTML = data.html;
                    if (typeof data.anio !== 'undefined') {
                        ANIO_LECTIVO = data.anio;
                    }
                } else {
                    mostrarToast('error', data.message || 'Error al cargar los grupos.');
                }
            } catch {
                mostrarToast('error', 'Error de conexión.');
            } finally {
                contenedor.style.opacity = '1';
                contenedor.style.pointerEvents = '';
                if (filtros) filtros.style.pointerEvents = '';
            }
        }

        function actualizarModalDocentesAsignados() {
            const modal = document.getElementById('modalDocentesAsignados');
            if (!modal?.classList.contains('show')) return;

            if (typeof aplicarFiltrosGrupos === 'function') {
                aplicarFiltrosGrupos();
            }
        }
    </script>
@endpush
