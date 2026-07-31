@extends('layouts.superAdmin')
@section('title', 'Administradores')

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
        <div>
            <h1>Administradores</h1>
            <p>Gestión de administradores</p>
        </div>
        <div style="display:flex;gap:10px">
            <button class="btn btn-primary" onclick="abrirModalCrearAdministrador()"><i class="fas fa-plus"></i> Nuevo
                Administrador</button>
        </div>
    </div>

    <div id="contenedorTabla">
        @include('superAdmin.administradores._tabla')
    </div>
    <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
    @include('superAdmin.administradores.modalCrearAdmins')
@endsection

@push('scripts')
    <script></script>
@endpush
