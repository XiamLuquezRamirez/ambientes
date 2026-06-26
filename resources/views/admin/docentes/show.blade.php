@extends('layouts.admin')
@section('title', 'Detalle del Docente')

@push('styles')
    <style>
        .tabla-asignaciones {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .tabla-asignaciones th,
        .tabla-asignaciones td {
            padding: 12px 14px;
            border: 1px solid #E2E8F0;
            text-align: left;
        }

        .tabla-asignaciones th {
            background: #F8FAFC;
            color: #1E293B;
            font-weight: 700;
        }

        .tabla-asignaciones tbody tr:hover {
            background: #F8FAFC;
        }

        .btn-quitar {
            background: #FEF2F2;
            border-color: #FECACA;
            color: #DC2626;
        }

        .btn-quitar:hover {
            background: #DC2626;
            border-color: #DC2626;
            color: #fff;
        }

        .seccion-vacia {
            padding: 22px;
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            color: #475569;
        }
    </style>
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Detalle del Docente</h1>
            <p>Perfil y grupos asignados</p>
        </div>
        <a href="{{ route('admin.docentes') }}" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Volver</a>
    </div>

    <div class="row g-4">
        <div class="col-md-6">
            <div class="card p-4">
                <h2>Información</h2>
                <dl class="row">
                    <dt class="col-4">Nombre</dt>
                    <dd class="col-8">{{ $usuario->nombre }} {{ $usuario->apellido }}</dd>

                    <dt class="col-4">Email</dt>
                    <dd class="col-8">{{ $usuario->email }}</dd>

                    <dt class="col-4">Estado</dt>
                    <dd class="col-8">{{ $usuario->docente?->estado ?? '—' }}</dd>
                </dl>
            </div>
        </div>

        <div class="col-md-6">
            <div class="card p-4">
                <h2>Grupos asignados</h2>
                <p class="text-muted">Año lectivo {{ date('Y') }}</p>
                @if ($asignaciones->isEmpty())
                    <div class="seccion-vacia">
                        <p>Este docente aún no tiene grupos asignados para el año actual.</p>
                        <button class="btn btn-primary" onclick="abrirModalAsignarGrado({{ $usuario->id }})">
                            <i class="fas fa-plus"></i> Asignar grupo
                        </button>
                    </div>
                @else
                    <button class="btn btn-primary mb-3" onclick="abrirModalAsignarGrado({{ $usuario->id }})">
                        <i class="fas fa-plus"></i> Asignar grupo
                    </button>
                    <table class="tabla-asignaciones">
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
                        <tbody>
                            @foreach ($asignaciones as $asignacion)
                                <tr id="fila-asignacion-{{ $asignacion['id'] }}">
                                    <td>{{ $asignacion['ambiente'] }}</td>
                                    <td>{{ $asignacion['grado'] }}</td>
                                    <td>{{ $asignacion['grupo'] }}</td>
                                    <td>{{ $asignacion['estudiantes'] }}</td>
                                    <td>{{ $asignacion['estado'] }}</td>
                                    <td style="text-align:center">
                                        <button class="btn btn-quitar btn-sm"
                                            onclick="quitarAsignacion({{ $usuario->id }}, {{ $asignacion['id'] }})">
                                            <i class="fas fa-trash"></i> Quitar
                                        </button>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>
        </div>
    </div>

    @include('admin.docentes.partials.modal-asignar-grupo')
@endsection

@push('scripts')
    @include('admin.docentes.partials.asignar-grupo-scripts')
    <script>
        // Confirma la desasignación del docente desde el detalle individual.
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

                // Llama al endpoint DELETE que marca la carga como inactiva.
                const res = await ajaxRequest(`${URL_DOCENTES}/${docenteId}/asignaciones/${cargaId}`, 'DELETE');
                if (res.success) {
                    const fila = document.getElementById(`fila-asignacion-${cargaId}`);
                    if (fila) {
                        fila.remove();
                    }

                    mostrarToast('success', res.message);

                    // Si ya no quedan filas en la tabla, recargamos para mostrar el estado vacío.
                    if (!document.querySelector('.tabla-asignaciones tbody tr')) {
                        location.reload();
                    }
                } else {
                    mostrarToast('error', res.message || 'Error al quitar la asignación');
                }
            });
        }
    </script>
@endpush
