@extends('layouts.panel')
@section('title', 'Estudiantes')
@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Estudiantes</h1>
            <p>{{ $ambiente->nombre }}</p>
        </div>
        <a href="#" data-bs-toggle="modal" data-bs-target="#modalRegistro" class="btn btn-primary">+ Nuevo</a>
    </div>

    {{-- Si el docente no tiene cargas activas, mostramos un aviso claro en el panel. --}}
    @if (isset($cargasActivas) && $cargasActivas->isEmpty())
        <div
            style="margin-bottom:20px;padding:16px;border-radius:12px;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;">
            <strong>No tienes grupos asignados.</strong> Contacta al administrador.
        </div>
    @endif

    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Avatar</th>
                    <th>Nombre</th>
                    <th>Condición</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                @forelse($estudiantes as $e)
                    <tr>
                        <td>
                            <div
                                style="width:40px;height:40px;border-radius:50%;background:{{ $e->color_avatar }};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem">
                                {{ $e->iniciales }}
                            </div>
                        </td>
                        <td style="font-weight:600">{{ $e->nombre }}</td>
                        <td><span class="badge badge-yellow">{{ $e->condicion }}</span></td>
                        <td><span
                                class="badge {{ $e->activo ? 'badge-green' : 'badge-red' }}">{{ $e->activo ? 'Activo' : 'Inactivo' }}</span>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" style="text-align:center;color:#64748B;padding:32px">Sin estudiantes en este
                            ambiente</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    @include('admin.estudiantes.modal_registro')


    @push('scripts')
    <script>
        const URL_ESTUDIANTES = "{{ route('panel.estudiante.guardar') }}";
        var tipoPost = 1; // 1: nuevo estudiante, 2: editar estudiante
        var pin = [];
        var tipoGuardaEstudiante = 2; // 1: administrador, 2: docente
    </script>
    <script src="{{ asset('assets/js/estudiantes/index.js') }}"></script>
    <script src="{{ asset('assets/js/estudiantes/pin.js') }}"></script>

    <script>
        $("#ambiente_id_nuevo").on("change", function() {
            var ambiente_id = $(this).val();
            $.ajax({
                url: "/panel/grados/ambiente/docente/" + ambiente_id,
                type: "GET",
                success: function(response) {
                    if (response.data.length > 0) {
                        mapearGrados(response.data);
                    } else {
                        $("#grado_id_nuevo_docente").html("<option value=''>No hay grados disponibles</option>");
                    }
                }
            });
        });

        function mapearGrados(grados) {
            var html = "<option value=''>Seleccione</option>";
            for (var i = 0; i < grados.length; i++) {
                html += "<option value='" + grados[i].id + "'>" + grados[i].nombre + "</option>";
            }
            $("#grado_id_nuevo_docente").html(html);
        }

        $("#grado_id_nuevo_docente").on("change", function() {
            var grado_id = $(this).val();
            $.ajax({
                url: "/panel/grupos/grados/docente/" + grado_id,
                type: "GET",
                success: function(response) {
                    if (response.data.length > 0) {
                        mapearGrupos(response.data);
                    } else {
                        $("#grupo_id_nuevo").html("<option value=''>No hay grupos disponibles</option>");
                    }
                }
            });
        });

        function mapearGrupos(grupos) { 
            var html = "<option value=''>Seleccione</option>";
            for (var i = 0; i < grupos.length; i++) {
                html += "<option value='" + grupos[i].id + "'>" + grupos[i].nombre + "</option>";
            }
            $("#grupo_id_nuevo").html(html);
        }
    </script>
    @endpush
@endsection
