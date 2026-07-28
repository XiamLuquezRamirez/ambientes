@extends('layouts.panel')
@section('title', 'Registrar Asistencia')
@section('content')
    <div class="page-header">
        <p style="font-size: 1.2rem;">Registrar Asistencia
            <strong>Fecha: {{ today()->format('d/m/Y') }}</strong>
        </p>
    </div>

    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Estudiante</th>
                    <th>Asistencia</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($estudiantes as $estudiante)
                    <tr>
                        <td>
                            <strong>
                                {{ $estudiante->nombre }} {{ $estudiante->apellido }}
                            </strong>
                        </td>
                        <td>
                            <div class="form-check form-switch asistencia-switch">
                                <input class="form-check-input btn-asistencia" type="checkbox" role="switch"
                                    id="asistencia{{ $estudiante->id }}" data-id="{{ $estudiante->id }}"
                                    {{ $estudiante->presente ? 'checked' : '' }} style="cursor:pointer;">

                                <label class="form-check-label estado-texto" for="asistencia{{ $estudiante->id }}">
                                    {{ $estudiante->presente ? 'Presente' : 'Ausente' }}
                                </label>
                            </div>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    <div class="d-flex justify-content-end mt-4">
        <button class="btn btn-outline-secondary" onclick="window.location.href = '/panel/principal'">
            <i class="fa-solid fa-arrow-left"></i> Volver
        </button>
        <button class="btn btn-success" onclick="registrarAsistencia()">
            <i class="fa-solid fa-check"></i> Registrar Asistencia
        </button>
    </div>
@endsection


@push('scripts')
    <script>
        const CARGA_DOCENTE_ID = {{ $carga->id }};
        const URL_REGISTRAR_ASISTENCIA = '/panel/asistencia/registrar-asistencia';

        document.querySelectorAll('.btn-asistencia').forEach(switchAsistencia => {

            actualizarEstado(switchAsistencia);

            switchAsistencia.addEventListener('change', function() {
                actualizarEstado(this);
            });

        });

        function actualizarEstado(switchAsistencia) {

            const label = switchAsistencia.parentElement.querySelector('.estado-texto');

            if (!label) return;

            if (switchAsistencia.checked) {

                label.textContent = 'Presente';
                label.classList.remove('text-danger');
                label.classList.add('text-primary');

            } else {

                label.textContent = 'Ausente';
                label.classList.remove('text-primary');
                label.classList.add('text-danger');

            }

        }

        async function registrarAsistencia() {

            const asistencias = {};

            document.querySelectorAll('.btn-asistencia').forEach(input => {
                asistencias[input.dataset.id] = input.checked;
            });

            try {

                const respuesta = await ajaxRequest(
                    URL_REGISTRAR_ASISTENCIA,
                    'POST', {
                        carga_docente_id: CARGA_DOCENTE_ID,
                        asistencias
                    }
                );

                Swal.fire({
                    icon: 'success',
                    title: 'Asistencia registrada',
                    text: respuesta.message,
                    timer: 1800,
                    showConfirmButton: false
                });

            } catch (error) {

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.message ?? 'No fue posible registrar la asistencia.'
                });

            }

        }
    </script>

    @if ($listaTomada)
        <script>
            document.addEventListener('DOMContentLoaded', function() {

                Swal.fire({
                    icon: 'info',
                    title: 'Lista de asistencia encontrada',
                    html: `
            <div style="text-align:left">
                <p>Se encontró una asistencia registrada para <strong>hoy</strong>.</p>

                <ul style="margin-top:10px;padding-left:18px">
                    <li>Los estados cargados corresponden al último registro.</li>
                    <li>Puedes cambiar cualquier estudiante.</li>
                    <li>Al presionar <strong>Guardar asistencia</strong>, el registro se actualizará.</li>
                </ul>
            </div>
        `,
                    confirmButtonText: 'Continuar',
                    confirmButtonColor: '#2563EB'
                });

            });
        </script>
    @endif
@endpush
