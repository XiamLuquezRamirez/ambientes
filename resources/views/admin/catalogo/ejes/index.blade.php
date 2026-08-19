@extends('layouts.admin')
@section('title', 'Ejes')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
@endpush

@section('content')
    <div class="page-header">
        <h1>Ejes</h1>
        <p style="color:#64748B">Ejes oficiales y propios del colegio por módulo</p>
    </div>

    <div class="c-card" style="padding: 20px;">
        @include('admin.catalogo.ejes._ejes')
    </div>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/configuracion-ejes-ui.js') }}"></script>
    <script src="{{ asset('assets/js/admin/catalogo-modulos-ejes.js') }}"></script>
@endpush
