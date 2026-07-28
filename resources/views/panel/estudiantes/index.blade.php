@extends('layouts.panel')
@section('title', 'Estudiantes')

@section('content')
    <div class="students-page">

        <div class="page-header students-header">

            <p style= "font-size: 1.2rem;">Gestión de estudiantes</p>

            <div class="d-flex gap-2">
                <button type="button" onclick="abrirModal()" class="btn btn-primary btn-nuevo">
                    <i class="fa-solid fa-plus"></i>
                    Nuevo
                </button>
                <button type="button" onclick="abrirModalAgregarEstudiante()" class="btn btn-agregar-estudiante btn-nuevo">
                    <i class="fa-solid fa-user-plus"></i>
                    Agregar estudiantes
                </button>
                <button type="button" data-bs-toggle="modal" data-bs-target="#modalSeleccionarAmbiente"
                    class="btn btn-secondary btn-nuevo">
                    <i class="fa-solid fa-building"></i>
                    Cambiar Ambiente
                </button>
            </div>
        </div>


        @include('panel.estudiantes.partials._grid')

    </div>
    @include('admin.estudiantes.modal_registro')
    @include('panel.estudiantes.modalConfigurarPin')
    @include('panel.estudiantes.modalSeleccionarAmbiente')
    @include('panel.estudiantes.modalAgregarEstudiante')
    @push('scripts')
        <script>
            const URL_ESTUDIANTES = "{{ route('panel.estudiantes.guardar') }}";
            var tipoPost = 1; // 1: nuevo estudiante, 2: editar estudiante
            var pin = [];
            var tipoGuardaEstudiante = 2; // 1: administrador, 2: docente
            var ambientesSeleccionados = [];
            var idContainerPin = 'configuracion_pin_docente';
            var idEstudianteConfigurarPin = 0;

            function abrirModalAgregarEstudiante() {
                $('#modalAgregarEstudiante').modal('show');
                cargarEstudiantes();

            }
        </script>
        <script src="{{ asset('assets/js/panel/estudiante_index.js') }}"></script>
        <script src="{{ asset('assets/js/estudiantes/index.js') }}"></script>
        <script src="{{ asset('assets/js/estudiantes/pin.js') }}"></script>
        <script src="{{ asset('assets/js/panel/estudiantes.js') }}"></script>
    @endpush
@endsection
