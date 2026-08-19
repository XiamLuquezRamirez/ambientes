@extends('layouts.admin')
@section('title', 'Módulos')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
@endpush

@section('content')
    <div class="page-header">
        <h1>Módulos</h1>
        <p style="color:#64748B">Módulos oficiales y adicionales del colegio por ambiente</p>
    </div>

    <div class="c-card" style="padding: 20px;">
        @include('admin.catalogo.modulos._modulos')
    </div>

    @include('admin.catalogo.modulos.modalCrearModulos')
    @include('admin.catalogo.modulos.modalVerEjesModulo')
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/configuracion-ejes-ui.js') }}"></script>
    <script src="{{ asset('assets/js/admin/catalogo-modulos-ejes.js') }}"></script>
@endpush
