@extends('layouts.panel')
@section('title', 'Estudiantes')

@section('content')
    <div class="students-page">

        <div class="page-header students-header">
            <div>
                <h1>Estudiantes</h1>
            </div>

            <a href="#" data-bs-toggle="modal" data-bs-target="#modalRegistro" class="btn btn-primary btn-nuevo">
                <i class="fa-solid fa-plus"></i>
                Nuevo
            </a>
        </div>

        @include('panel.estudiantes.partials._filtros')

        @include('panel.estudiantes.partials._estadisticas')


        @php
            $tieneFiltros = collect($filtros ?? [])
                ->filter(fn($v) => $v !== null && $v !== '')
                ->isNotEmpty();
        @endphp

        @if ($estudiantes->isEmpty() && !$tieneFiltros)
            @include('panel.estudiantes.partials._empty')
        @elseif ($estudiantes->isEmpty())
            <div class="students-empty students-empty--filters">
                <i class="fa-solid fa-magnifying-glass"></i>
                <h3>Sin resultados</h3>
                <p>No hay estudiantes que coincidan con los filtros aplicados.</p>
                <a href="{{ route('panel.estudiantes') }}" class="btn btn-primary">Limpiar filtros</a>
            </div>
        @else
            @include('panel.estudiantes.partials._grid')
            @include('panel.estudiantes.partials._paginacion')
        @endif

    </div>
    @include('admin.estudiantes.modal_registro')


    @push('scripts')
    <script>
        const URL_ESTUDIANTES = "{{ route('panel.estudiantes.guardar') }}";
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

@push('scripts')
    <script src="{{ asset('assets/js/panel/estudiantes.js') }}"></script>
@endpush
