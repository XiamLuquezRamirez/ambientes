@extends('layouts.admin')
@section('title', 'Grupos — Año ' . $anio)

@push('styles')
    <style>
        .grado-bloque {
            background: #fff;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            margin-bottom: 16px;
            overflow: hidden;
        }

        .grado-bloque-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 20px;
            border-bottom: 1px solid #F1F5F9;
        }

        .grado-nombre {
            font-weight: 700;
            font-size: .95rem;
            color: #1E293B;
        }

        .grado-edad {
            font-size: .78rem;
            color: #64748B;
        }

        .grado-bloque-body {
            padding: 14px 20px;
        }

        .grupo-fila {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 0;
            border-bottom: 1px solid #F8FAFC;
        }

        .grupo-fila:last-of-type {
            border-bottom: none;
        }

        .grupo-nombre-txt {
            font-weight: 600;
            font-size: .9rem;
            color: #1E293B;
        }

        .grupo-chip {
            background: #EFF6FF;
            color: #1D4ED8;
            border-radius: 6px;
            padding: 2px 8px;
            font-size: .75rem;
        }

        .grupo-acciones {
            margin-left: auto;
            display: flex;
            gap: 6px;
        }

        .btn-grupo {
            border: 1px solid transparent;
            border-radius: 6px;
            padding: 4px 10px;
            font-size: .76rem;
            cursor: pointer;
            transition: all .15s;
            font-family: 'Nunito', sans-serif;
        }

        .btn-editar-grupo {
            background: #EFF6FF;
            border-color: #BFDBFE;
            color: #1D4ED8;
        }

        .btn-editar-grupo:hover {
            background: #2563EB;
            color: #fff;
        }

        .btn-eliminar-grupo {
            background: #FEF2F2;
            border-color: #FECACA;
            color: #DC2626;
        }

        .btn-eliminar-grupo:hover {
            background: #DC2626;
            color: #fff;
        }

        .link-agregar-grupo {
            display: inline-block;
            margin-top: 12px;
            font-size: .82rem;
            color: #2563EB;
            cursor: pointer;
        }

        .link-agregar-grupo:hover {
            text-decoration: underline;
        }

        #modalGrupo .modal-content {
            border: none;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 32px 80px rgba(37, 99, 235, .2);
        }

        #modalGrupo .modal-header {
            background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
            border-bottom: none;
            padding: 20px 24px;
        }

        #modalGrupo .modal-title {
            font-family: 'Fredoka One', cursive;
            color: #fff;
            font-size: 1.15rem;
        }

        #modalGrupo .btn-close {
            filter: brightness(0) invert(1);
            opacity: .75;
        }

        .campo-error {
            color: #DC2626;
            font-size: .78rem;
            margin-top: 4px;
        }
    </style>
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
            <h1>Grupos</h1>
            <p>Vista global de grupos y docentes asignados</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <select class="form-select form-select-sm" style="width:140px" id="filtroGrado" onchange="aplicarFiltros()">
                <option value="">Todos los grados</option>
                @foreach ($grados as $grado)
                    <option value="{{ $grado->id }}" {{ isset($gradoId) && $gradoId == $grado->id ? 'selected' : '' }}>
                        {{ $grado->nombre }}</option>
                @endforeach
            </select>
            <select class="form-select form-select-sm" style="width:110px" id="filtroAnio" onchange="aplicarFiltros()">
                @foreach (range(2024, date('Y') + 1) as $y)
                    <option value="{{ $y }}" {{ $anio == $y ? 'selected' : '' }}>{{ $y }}</option>
                @endforeach
            </select>
            <button class="btn btn-primary" onclick="abrirModalGrupo()">
                <i class="fas fa-plus"></i> Nuevo grupo
            </button>
        </div>
    </div>

    @if ($grupos->isEmpty())
        <div style="text-align:center;padding:60px;color:#94A3B8">
            <i class="fas fa-layer-group" style="font-size:2.5rem;opacity:.35;display:block;margin-bottom:12px"></i>
            Sin grupos para los filtros seleccionados.
        </div>
    @else
        <div class="table-responsive">
            <table class="table table-striped align-middle">
                <thead>
                    <tr>
                        <th>Grado</th>
                        <th>Grupo</th>
                        <th>Año lectivo</th>
                        <th>Docentes asignados</th>
                        <th>Estudiantes</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($grupos as $grupo)
                        @php
                            $docentesAsignados = $grupo->cargasDocente
                                ->pluck('docente')
                                ->filter()
                                ->map(fn($docente) => trim($docente->user->nombre . ' ' . $docente->user->apellido));
                            $tieneAlumnos = $grupo->totalMatriculas($anio) > 0;
                            $sinDocentes = $docentesAsignados->count() === 0;
                        @endphp
                        <tr class="{{ $tieneAlumnos && $sinDocentes ? 'table-danger' : '' }}"
                            id="fila-grupo-{{ $grupo->id }}">
                            <td>{{ $grupo->grado->nombre }}</td>
                            <td>{{ $grupo->nombre }}</td>
                            <td>{{ $grupo->anio_lectivo }}</td>
                            <td>
                                @if ($docentesAsignados->isEmpty())
                                    <span class="text-muted">Sin docentes asignados</span>
                                @else
                                    {{ $docentesAsignados->join(', ') }}
                                @endif
                            </td>
                            <td>{{ $grupo->totalMatriculas($anio) }}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" data-grupo-id="{{ $grupo->id }}"
                                    data-grado-id="{{ $grupo->grado_id }}" data-grado-nombre="{{ $grupo->grado->nombre }}"
                                    data-grupo-nombre="{{ $grupo->nombre }}" onclick="abrirModalAsignarDocente(this)">
                                    <i class="fas fa-user-plus"></i> Asignar docente
                                </button>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif

    {{-- Modal Nuevo/Editar Grupo --}}
    <div class="modal fade" id="modalGrupo" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false"
        aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalGrupoTitulo">Nuevo Grupo</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" style="padding:24px">
                    <form id="formGrupo">
                        @csrf
                        <input type="hidden" id="grupoId" value="">
                        <div class="mb-3">
                            <label class="form-label">Grado</label>
                            <select id="grupoGradoId" name="grado_id" class="form-control">
                                @foreach ($grados as $g)
                                    <option value="{{ $g->id }}">{{ $g->nombre }}</option>
                                @endforeach
                            </select>
                            <div class="campo-error" id="err-grado_id"></div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Letra del grupo</label>
                            <select id="grupoNombre" name="nombre" class="form-control">
                                @foreach (['A', 'B', 'C', 'D', 'E'] as $l)
                                    <option value="{{ $l }}">{{ $l }}</option>
                                @endforeach
                            </select>
                            <div class="campo-error" id="err-nombre"></div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Año lectivo</label>
                            <input type="number" id="grupoAnio" name="anio_lectivo" class="form-control"
                                value="{{ $anio }}" min="2024" max="2030" readonly
                                style="background:#F8FAFC;color:#64748B">
                            <div class="campo-error" id="err-anio_lectivo"></div>
                        </div>
                        <div class="mb-0">
                            <label class="form-label">Cupo máximo</label>
                            <input type="number" id="grupoCupo" name="cupo_maximo" class="form-control" value="25"
                                min="1" max="60">
                            <div class="campo-error" id="err-cupo_maximo"></div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" id="btnGuardarGrupo" class="btn btn-primary" onclick="guardarGrupo()">Crear
                        Grupo</button>
                </div>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
    <script>
        const ANIO_LECTIVO = {{ (int) $anio }};
        const URL_STORE = "{{ route('admin.grupos.guardar') }}";
        const URL_UPDATE = "{{ route('admin.grupos.actualizar', ':id') }}";
        const URL_DESTROY = "{{ route('admin.grupos.eliminar', ':id') }}";

        let _modalGrupoBS = null;

        function abrirModalGrupo(gradoId = null, grupoId = null, nombre = null, cupo = 25) {
            const titulo = document.getElementById('modalGrupoTitulo');
            const btnSave = document.getElementById('btnGuardarGrupo');

            document.getElementById('grupoId').value = grupoId ?? '';
            document.getElementById('grupoCupo').value = cupo;
            document.getElementById('grupoAnio').value = ANIO_LECTIVO;
            ['grado_id', 'nombre', 'anio_lectivo', 'cupo_maximo'].forEach(f => {
                const el = document.getElementById(`err-${f}`);
                if (el) el.textContent = '';
            });

            if (gradoId) {
                document.getElementById('grupoGradoId').value = gradoId;
            }

            const esEditar = !!grupoId;
            titulo.textContent = esEditar ? 'Editar Grupo' : 'Nuevo Grupo';
            btnSave.textContent = esEditar ? 'Guardar cambios' : 'Crear Grupo';

            if (nombre !== null) {
                document.getElementById('grupoNombre').value = nombre;
            }

            const gradoSel = document.getElementById('grupoGradoId');
            gradoSel.disabled = esEditar;

            if (!_modalGrupoBS)
                _modalGrupoBS = new bootstrap.Modal(document.getElementById('modalGrupo'));
            _modalGrupoBS.show();
        }

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

        function aplicarFiltros() {
            const gradoId = document.getElementById('filtroGrado').value;
            const anio = document.getElementById('filtroAnio').value;
            const params = new URLSearchParams();

            if (gradoId) {
                params.set('grado_id', gradoId);
            }
            if (anio) {
                params.set('anio', anio);
            }

            const url = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
            window.location.href = url;
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

        document.getElementById('modalGrupo').addEventListener('hidden.bs.modal', () => {
            document.getElementById('grupoGradoId').disabled = false;
        });
    </script>
@endpush

@include('admin.docentes.partials.modal-asignar-grupo')

@push('scripts')
    <script>
        const URL_GRUPOS_ASIGNAR = "{{ url('admin/grupos') }}/:id/asignar-docente";
        let grupoAsignarId = null;

        function abrirModalAsignarDocente(button) {
            const grupoId = button.dataset.grupoId;
            const gradoId = button.dataset.gradoId;
            const gradoNombre = button.dataset.gradoNombre;
            const grupoNombre = button.dataset.grupoNombre;

            grupoAsignarId = grupoId;
            const form = document.getElementById('formAsignarInfo');
            if (form) {
                form.reset();
            }
            const asignarDocenteId = document.getElementById('asignar_docente_id');
            if (asignarDocenteId) asignarDocenteId.value = '';
            const asignarDocenteSelect = document.getElementById('asignar_docente_id_select');
            if (asignarDocenteSelect) asignarDocenteSelect.value = '';
            const asignarNombre = document.getElementById('asignar_nombre');
            if (asignarNombre) asignarNombre.textContent = gradoNombre + ' ' + grupoNombre;
            const asignarAmbiente = document.getElementById('asignar_ambiente_id');
            if (asignarAmbiente) asignarAmbiente.value = '';
            const asignarAnio = document.getElementById('asignar_anio_lectivo');
            if (asignarAnio) asignarAnio.value = ANIO_LECTIVO;
            const gradoSelect = document.getElementById('asignar_grado_id');
            if (gradoSelect) {
                gradoSelect.innerHTML = '<option value="' + gradoId + '">' + gradoNombre + '</option>';
                gradoSelect.value = gradoId;
            }
            const grupoSelect = document.getElementById('asignar_grupos_id');
            if (grupoSelect) {
                grupoSelect.innerHTML = '<option value="' + grupoId + '">' + grupoNombre + '</option>';
                grupoSelect.value = grupoId;
            }

            const modal = new bootstrap.Modal(document.getElementById('modalAsignarInfo'));
            modal.show();
        }

        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('formAsignarInfo');
            if (!form) return;

            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                if (!grupoAsignarId) {
                    return;
                }

                const btn = document.getElementById('btnAsignarInfo');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Guardando…';
                }

                const formData = new FormData(this);
                const datos = Object.fromEntries(formData.entries());
                const url = URL_GRUPOS_ASIGNAR.replace(':id', grupoAsignarId);
                const res = await ajaxRequest(url, 'POST', datos);

                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar asignación';
                }

                if (res.success) {
                    mostrarToast('success', res.message || 'Docente asignado correctamente.');
                    const modal = bootstrap.Modal.getInstance(document.getElementById(
                        'modalAsignarInfo'));
                    if (modal) {
                        modal.hide();
                    }
                    grupoAsignarId = null;
                    this.reset();
                } else if (res.errors && Object.keys(res.errors).length) {
                    limpiarErroresModal();
                    for (const [campo, mensajes] of Object.entries(res.errors)) {
                        const input = document.querySelector(`#formAsignarInfo [name="${campo}"]`);
                        if (!input) continue;
                        input.classList.add('is-invalid');
                        const div = document.createElement('div');
                        div.className = 'campo-error';
                        div.textContent = mensajes[0];
                        input.insertAdjacentElement('afterend', div);
                    }
                    const primero = document.querySelector('#formAsignarInfo .is-invalid');
                    if (primero) primero.focus();
                } else {
                    mostrarToast('error', res.message || 'Error al guardar.');
                }
            });
        });
    </script>
@endpush
