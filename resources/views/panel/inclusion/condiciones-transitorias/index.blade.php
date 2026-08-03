@extends('layouts.panel')
@section('title', 'Condiciones transitorias')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin/configuracion-condiciones.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/condiciones/index.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
            <h1 style="font-family: var(--font-display); font-size: 1.6rem; color: var(--color-primary-dark); margin:0 0 4px">
                Condiciones transitorias
            </h1>
            <p style="color:#64748B;margin:0">Opciones de tu institución. Solo puedes editar o eliminar las que tú creaste.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="{{ route('panel.inclusion') }}" class="btn btn-outline-secondary">
                <i class="fas fa-arrow-left"></i> Inclusión
            </a>
            <button type="button" class="btn btn-primary" onclick="abrirModalRegistrarTransitoria()">
                <i class="fas fa-plus"></i> Nueva opción
            </button>
        </div>
    </div>

    <p class="cfg-hint">
        <i class="fa-solid fa-info-circle"></i>
        Puedes ver todas las condiciones de la institución y crear nuevas.
        En las tuyas puedes activar o desactivar, editar y eliminar.
    </p>

    <form id="formFiltrosTransitoriasPanel" class="cfg-filtros">
        <input type="search" name="buscar" class="form-control" style="width:auto;min-width:220px"
            placeholder="Buscar por nombre o código…" value="{{ request('buscar') }}">

        <select name="condicion_base_id" class="form-control" style="width:auto;min-width:220px">
            <option value="">Todas las condiciones base</option>
            @foreach ($condicionesBase as $base)
                <option value="{{ $base->id }}" @selected((string) request('condicion_base_id') === (string) $base->id)>
                    {{ $base->codigo }} — {{ $base->nombre }}
                </option>
            @endforeach
        </select>

        <select name="activa" class="form-control" style="width:auto">
            <option value="">Todas</option>
            <option value="1" @selected(request('activa') === '1')>Activas</option>
            <option value="0" @selected(request('activa') === '0')>Desactivadas</option>
        </select>

        <select name="origen" class="form-control" style="width:auto">
            <option value="">Todos los orígenes</option>
            <option value="propias" @selected(request('origen') === 'propias')>Creadas por mí</option>
            <option value="institucion" @selected(request('origen') === 'institucion')>De la institución</option>
        </select>
    </form>

    <div id="contenedorListaTransitoriasPanel">
        @include('panel.inclusion.condiciones-transitorias._lista')
    </div>

    @include('superAdmin.condicionesTransitorias.ModalRegistrarTransitoria', [
        'esSuperAdmin' => false,
        'condicionesBase' => $condicionesBase,
        'urlTransitoriasBase' => route('panel.inclusion.condiciones-transitorias'),
        'urlTransitoriasItem' => url('panel/inclusion/condiciones-transitorias/opcion'),
    ])

    @include('partials.condiciones-transitorias.modal-estudiantes-asociados')
    @include('partials.condiciones-transitorias.modal-desactivar')
@endsection

@push('scripts')
    <script>
        window.URL_PANEL_TRANSITORIAS = @json(route('panel.inclusion.condiciones-transitorias'));
        window.URL_PANEL_TRANSITORIAS_ESTADO = (id) => @json(url('panel/inclusion/condiciones-transitorias')) + `/${id}/estado`;
        window.CT_EST_URL_LIST = (id) => @json(url('panel/inclusion/condiciones-transitorias/opcion')) + `/${id}/estudiantes`;
        window.CT_EST_URL_DESASOCIAR = (id) => @json(url('panel/inclusion/condiciones-transitorias/asignaciones')) + `/${id}/desasociar`;
        window.cargarListaTransitoriasAdmin = function() {
            if (typeof window.cargarListaTransitoriasPanel === 'function') {
                window.cargarListaTransitoriasPanel();
            }
        };
    </script>
    <script src="{{ asset('assets/js/panel/condiciones-transitorias.js') }}"></script>
    <script src="{{ asset('assets/js/condiciones/estudiantes-asociados-transitoria.js') }}"></script>
@endpush
