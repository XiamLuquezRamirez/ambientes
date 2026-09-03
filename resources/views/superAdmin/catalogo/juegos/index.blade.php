@extends('layouts.superAdmin')
@section('title', 'Juegos')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/panel/estudiantes.css') }}">
@endpush

@section('content')
    <div class="students-page" id="juegosPage" data-url-base="{{ route('superadmin.catalogo.juegos') }}">
        <div class="page-header students-header">
            <div>
                <h1 class="mb-1">Juegos</h1>
                <p class="students-subtitle mb-0">Catálogo oficial de juegos interactivos para el constructor</p>
            </div>
        </div>

        <div id="container-grid">
            @include('superAdmin.catalogo.juegos.partials._grid')
        </div>
    </div>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/juegos/filtros-ui.js') }}"></script>
    <script src="{{ asset('assets/js/superAdmin/catalogo-juegos.js') }}"></script>
@endpush
