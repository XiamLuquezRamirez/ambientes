@extends('layouts.panel')
@section('title', 'Perfiles de Aprendizaje')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin/configuracion-perfiles-aprendizaje.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/perfiles-aprendizaje/index.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
            <h1 style="font-family: var(--font-display); font-size: 1.6rem; color: var(--color-primary-dark); margin:0 0 4px">
                Perfiles de Aprendizaje
            </h1>
            <p style="color:#64748B;margin:0">Perfiles de aprendizaje habilitados en tu institución. Solo consulta y revisión de estudiantes.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="{{ route('panel.inclusion') }}" class="btn btn-outline-secondary">
                <i class="fas fa-arrow-left"></i> Inclusión
            </a>
        </div>
    </div>

    <p class="cfg-hint">
        <i class="fa-solid fa-info-circle"></i>
        Puedes consultar los perfiles de aprendizaje de la institución y ver los estudiantes de tus grupos asociados a cada uno.
        No es posible desvincular estudiantes desde aquí.
    </p>

    <form id="formFiltrosPerfilesAprendizajePanel" class="cfg-filtros">
        <input type="search" name="buscar" class="form-control" style="width:auto;min-width:220px"
            placeholder="Buscar por nombre o código…" value="{{ request('buscar') }}">

        <select name="activa" class="form-control" style="width:auto">
            <option value="">Todas</option>
            <option value="1" @selected(request('activa') === '1')>Activas</option>
            <option value="0" @selected(request('activa') === '0')>Desactivadas</option>
        </select>
    </form>

    <div id="contenedorListaPerfilesAprendizajePanel">
        @include('panel.inclusion.perfil-aprendizaje._lista')
    </div>

    @include('partials.perfil-aprendizaje.modal-estudiantes-asociados')
@endsection

@push('scripts')
    <script>
        window.URL_PANEL_PERFILES_APRENDIZAJE = @json(route('panel.inclusion.perfil-aprendizaje'));
        window.PA_EST_URL_LIST = (id) => @json(url('panel/inclusion/perfil-aprendizaje')) + `/${id}/estudiantes`;
    </script>
    <script src="{{ asset('assets/js/panel/perfiles-aprendizaje.js') }}"></script>
    <script src="{{ asset('assets/js/perfiles-aprendizaje/estudiantes-asociados-perfil-aprendizaje.js') }}"></script>
@endpush
