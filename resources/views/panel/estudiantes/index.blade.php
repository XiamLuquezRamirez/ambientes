@extends('layouts.panel')
@section('title', 'Estudiantes')
@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/helpers.css') }}">
@endpush
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