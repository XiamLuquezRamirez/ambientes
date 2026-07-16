@extends('layouts.panel')
@section('title', 'Registrar Asistencia')
@section('content')
    <div class="page-header">
        <h1>Registrar Asistencia
            <small>Fecha: {{ today()->format('d/m/Y') }}</small>
        </h1>
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
                        <td>{{ $estudiante->nombre }}</td>
                        <td>
                            <div class="estado-asistencia">
                                <button type="button"
                                    class="btn-asistencia {{ $estudiante->presente ? 'presente' : 'ausente' }}"
                                    data-id="{{ $estudiante->id }}"
                                    data-estado="{{ $estudiante->presente ? 'presente' : 'ausente' }}">

                                    {{ $estudiante->presente ? 'Presente' : 'Ausente' }}

                                </button>
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

        const asistencia = {};

        document.addEventListener('click', function(e) {

            const boton = e.target.closest('.btn-asistencia');

            if (!boton) return;

            if (boton.dataset.estado === 'presente') {

                boton.dataset.estado = 'ausente';
                boton.textContent = 'Ausente';

                boton.classList.remove('presente');
                boton.classList.add('ausente');

            } else {

                boton.dataset.estado = 'presente';
                boton.textContent = 'Presente';

                boton.classList.remove('ausente');
                boton.classList.add('presente');

            }

        });


        async function registrarAsistencia() {

            const asistencias = {};

            document.querySelectorAll('.btn-asistencia').forEach(btn => {

                asistencias[btn.dataset.id] = btn.dataset.estado === 'presente';

            });

            try {

                const respuesta = await ajaxRequest(
                    URL_REGISTRAR_ASISTENCIA,
                    'POST', {
                        carga_docente_id: CARGA_DOCENTE_ID,
                        asistencias: asistencias
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
