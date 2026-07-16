@extends('layouts.panel')
@section('title', 'Estudiantes')

@section('content')
    <div class="students-page">

        <div class="page-header students-header">
            <div>
                <h1>Estudiantes</h1>
            </div>

            <button type="button" onclick="abrirModal()" class="btn btn-primary btn-nuevo">
                <i class="fa-solid fa-plus"></i>
                Nuevo
            </button>
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
            var ambientesSeleccionados = [];
        </script>
        <script>
            $("#grado_id_nuevo_docente").on("change", function() {
                var grado_id = $(this).val();
                grado_id == '' ? grado_id = 0 : grado_id = grado_id;
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
                    html += "<option value='" + grupos[i].id + "'>" + grupos[i].nombre + " Año Lectivo: " + grupos[i].anio_lectivo + "</option>";
                }
                $("#grupo_id_nuevo").html(html);

                $("#grupo_id_nuevo").val('').trigger('change');
                ambientesSeleccionados = [];
            }

            $("#grupo_id_nuevo").on("change", function() {
                var grado_id = $("#grado_id_nuevo_docente").val();
                var grupo_id = $(this).val() == '' ? 0 : $(this).val();
                $.ajax({
                    url: "/panel/grupos/ambientes-disponibles/" + grado_id + "/" + grupo_id,
                    type: "GET",
                    success: function(response) {
                        mapearAmbientes(response.ambientes, response.disponible);
                    }
                });
            });

            function mapearAmbientes(ambientes, disponible) {
                if(ambientes.length > 0) {
                    var clase = "";
                    var claseInactivo = "";
                    var colorBorde = generarColoresBordeBackgroundAzar();

                    if(disponible == 0) {
                        clase = "badge-stat bs-gris";
                        claseInactivo = "item-ambiente-inactivo";
                        colorBorde = "#212529";
                    } else if(disponible > 0 && disponible < 5) {
                        clase = "badge-stat bs-amarillo";
                    } else {
                        clase = "badge-stat bs-verde";
                    }
                
                    var html = "<div style='position: absolute; top: -60px; right: 0px; width: auto;'><span class='" + clase + "'><i class='fa-solid fa-users'></i> Cupos disponibles: " + disponible + "</span></div>";
                    for (var i = 0; i < ambientes.length; i++) {
                        html += "<div class='col-md-4'>";
                            html += "<div class='item-ambiente " + claseInactivo + "' id='item-ambiente-" + ambientes[i].id + "' style='border-color: " + colorBorde +"' onclick='seleccionarAmbienteCrearEstudiante(" + ambientes[i].id + ")'>";
                                html += "<div class='d-flex align-items-center gap-2' style='margin-bottom: 10px;'>";
                                    html += "<div class='item-ambiente-icon' style='background-color: " + colorBorde + "'>" + ambientes[i].icono + "</div>";
                                    html += "<label style='margin-bottom: 0; font-size: 20px; font-weight: bold; color: " + colorBorde + "'>Ambiente " + ambientes[i].nombre + "</label>";
                                html += "</div>";
                            html += "</div>";
                        html += "</div>";
                    }
                } else {
                    html = "<div class='col-md-12 p-4 text-center'><h4 class='text-center'>No hay ambientes disponibles</h4></div>";
                }

                $("#contenedor-ambientes-disponibles").empty();
                $("#contenedor-ambientes-disponibles").html(html);
            }

            function generarColoresBordeBackgroundAzar() {
                var colores = ["#007bff", "#0056b3", "#003d80", "#002650", "#001325" ];
                // mismos colores  de arriba peroal 60% de transparencia
                var indiceColor = Math.floor(Math.random()*colores.length);
                return colores[indiceColor];
            }

            function seleccionarAmbienteCrearEstudiante(id) {
                if($("#item-ambiente-" + id).hasClass("item-ambiente-seleccionado")) {
                    $("#item-ambiente-" + id).removeClass("item-ambiente-seleccionado");
                    ambientesSeleccionados = ambientesSeleccionados.filter(ambiente => ambiente !== id);
                } else {
                    $("#item-ambiente-" + id).addClass("item-ambiente-seleccionado");
                    ambientesSeleccionados.push(id);
                } 
            }
        </script>
        <script src="{{ asset('assets/js/estudiantes/index.js') }}"></script>
        <script src="{{ asset('assets/js/estudiantes/pin.js') }}"></script>
    @endpush
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/panel/estudiantes.js') }}"></script>
@endpush
