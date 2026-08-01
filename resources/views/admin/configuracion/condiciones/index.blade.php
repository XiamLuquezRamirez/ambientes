@extends('layouts.admin')
@section('title', 'Condiciones')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin/configuracion-condiciones.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
            <h1>Condiciones</h1>
            <p>Personalice visibilidad y orden de las condiciones de su institución</p>
        </div>
    </div>

    <p class="cfg-hint">
        <i class="fa-solid fa-info-circle"></i>
        Arrastre las tarjetas para reordenar. Desactivar oculta la opción a los docentes sin modificar el catálogo global.
    </p>

    <form id="formFiltrosCondiciones" class="cfg-filtros">
        <div class="input-buscar">
            <span class="icono-buscar"><i class="fas fa-search"></i></span>
            <input type="text" name="buscar" placeholder="Buscar por código o nombre..."
                value="{{ request('buscar') }}" autocomplete="off">
        </div>

        <select name="ordenar" class="form-control" style="width:auto;min-width:180px">
            <option value="">Orden personalizado</option>
            <option value="nombre" @selected(request('ordenar') === 'nombre')>Ordenar por nombre</option>
            <option value="codigo" @selected(request('ordenar') === 'codigo')>Ordenar por código</option>
        </select>

        <select name="activa" class="form-control" style="width:auto">
            <option value="">Todas</option>
            <option value="1" @selected(request('activa') === '1')>Activas</option>
            <option value="0" @selected(request('activa') === '0')>Desactivadas</option>
        </select>

        <a id="btnLimpiarCondiciones" href="{{ route('admin.configuracion.condiciones.index') }}"
            class="btn btn-sm"
            style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
              display:{{ request()->hasAny(['buscar', 'ordenar', 'activa']) ? 'inline-flex' : 'none' }}">
            <i class="fas fa-broom"></i> Limpiar
        </a>
    </form>

    <div id="contenedorListaCondiciones">
        @include('admin.configuracion.condiciones._lista')
    </div>
@endsection

@push('scripts')
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
    <script>
        window.URL_CFG_CONDICIONES = @json(route('admin.configuracion.condiciones.index'));
        window.URL_CFG_CONDICIONES_ORDEN = @json(route('admin.configuracion.condiciones.orden'));
    </script>
    <script src="{{ asset('assets/js/admin/configuracion-condiciones.js') }}"></script>
@endpush
