@extends('layouts.panel')
@section('title', 'Estudiantes')

@section('content')
    <div class="students-page">

        <div class="page-header students-header">
            <div>
                <h1>Estudiantes</h1>
            </div>

            <a href="{{ route('panel.estudiantes.create') }}" class="btn btn-primary btn-nuevo">
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
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/panel/estudiantes.js') }}"></script>
@endpush
