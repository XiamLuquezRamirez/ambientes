@extends('layouts.panel')
@section('title', 'Estudiantes')
@section('content')
    <div class="students-page">

        <div class="page-header students-header">
            <div>
                <h1>Estudiantes en el ambiente</h1>
                <p>Gestión de estudiantes</p>
            </div>

            <div class="d-flex gap-2">
                <button type="button" onclick="abrirModal()" class="btn btn-primary btn-nuevo">
                    <i class="fa-solid fa-plus"></i>
                    Nuevo
                </button>
                <button type="button" data-bs-toggle="modal" data-bs-target="#modalSeleccionarAmbiente" class="btn btn-secondary btn-nuevo">
                    <i class="fa-solid fa-building"></i>
                    Cambiar Ambiente
                </button>
            </div>
        </div>

        @include('panel.estudiantes.partials._filtros')

        @php
            $tieneFiltros = collect($filtros ?? [])
                ->filter(fn($v) => $v !== null && $v !== '')
                ->isNotEmpty();
        @endphp

        @if ($estudiantes->isEmpty() && !$tieneFiltros)
            @include('panel.estudiantes.partials._empty')
        @else
            @include('panel.estudiantes.partials._grid')
        @endif

    </div>
    @include('admin.estudiantes.modal_registro')
    @include('panel.estudiantes.modalConfigurarPin')
    @include('panel.estudiantes.modalSeleccionarAmbiente')
    @push('scripts')
        <script>
            const URL_ESTUDIANTES = "{{ route('panel.estudiantes.guardar') }}";
            var tipoPost = 1; // 1: nuevo estudiante, 2: editar estudiante
            var pin = [];
            var tipoGuardaEstudiante = 2; // 1: administrador, 2: docente
            var ambientesSeleccionados = [];
            var idContainerPin = 'configuracion_pin_docente';
            var idEstudianteConfigurarPin = 0;
        </script>
        <script src="{{ asset('assets/js/panel/estudiante_index.js') }}"></script>
        <script src="{{ asset('assets/js/estudiantes/index.js') }}"></script>
        <script src="{{ asset('assets/js/estudiantes/pin.js') }}"></script>
        <script src="{{ asset('assets/js/panel/estudiantes.js') }}"></script>
    @endpush
@endsection
