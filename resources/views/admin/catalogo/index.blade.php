@extends('layouts.admin')
@section('title', ($soloColegio ?? false) ? 'Catálogo DBA' : 'Catálogo')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/admin/catalogo-dba.css') }}">
@endpush

@section('content')
    @php
        $soloColegio = (bool) ($soloColegio ?? false);
        $urlListado = $soloColegio
            ? url('admin/configuracion/catalogo-dba')
            : url('admin/catalogo');
        $rutaLimpiar = $soloColegio
            ? route('admin.configuracion.catalogo-dba.listar')
            : route('admin.catalogo');
    @endphp

    <div id="catalogoDBAApp"
        data-url-base="{{ $urlListado }}"
        data-url-api="{{ url('admin/configuracion/catalogo-dba') }}"
        data-url-guardar="{{ route('admin.configuracion.catalogo-dba.guardar') }}"
        data-url-detalle-base="{{ url('admin/catalogo') }}"
        data-solo-colegio="{{ $soloColegio ? '1' : '0' }}">

        <div class="page-header catalogo-dba-page-header">
            <div>
                @if ($soloColegio)
                    <h1>Catálogo DBA</h1>
                    <p>DBA personalizados de la institución</p>
                @else
                    <h1>Catálogo</h1>
                    <p>DBA del MEN (oficiales) y DBA personalizados del colegio</p>
                @endif
            </div>
            <div>
                <button type="button" id="btnNuevoDbaColegio"
                    class="btn btn-primary{{ $soloColegio ? ' is-visible' : '' }}"
                    onclick="abrirModalCrearCatalogoDBA()">
                    <i class="fas fa-plus"></i> Nuevo DBA del colegio
                </button>
            </div>
        </div>

        <form id="formBuscar" class="catalogo-dba-filtros">
            <div class="input-buscar">
                <span class="icono-buscar"><i class="fas fa-search"></i></span>
                <input type="text" name="buscar" placeholder="Buscar por código o descripción..."
                    value="{{ request('buscar') }}" autocomplete="off">
            </div>

            <select name="area_id" class="form-control" style="width:auto">
                <option value="">Todas las áreas</option>
                @foreach ($areas as $area)
                    <option value="{{ $area->id }}" @selected(request('area_id') == $area->id)>
                        {{ $area->nombre }}
                    </option>
                @endforeach
            </select>

            <select name="grado_id" class="form-control" style="width:auto">
                <option value="">Todos los grados</option>
                @foreach ($grados as $grado)
                    <option value="{{ $grado->id }}" @selected(request('grado_id') == $grado->id)>
                        {{ $grado->nombre }}
                    </option>
                @endforeach
            </select>

            <select name="estado" class="form-control" style="width:auto">
                <option value="">Todos los estados</option>
                <option value="1" @selected(request('estado') === '1')>Activos</option>
                <option value="0" @selected(request('estado') === '0')>Inactivos</option>
            </select>

            <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-filter"></i> Filtrar</button>
            <a id="btnLimpiar" href="{{ $rutaLimpiar }}" class="btn btn-sm btn-limpiar-filtros"
                style="display:{{ request()->hasAny(['buscar', 'area_id', 'grado_id', 'estado']) ? 'inline-flex' : 'none' }}">
                <i class="fas fa-broom"></i> Limpiar
            </a>
        </form>

        <div id="contenedorCatalogo">
            @include('admin.catalogo._contenido', ['soloColegio' => $soloColegio])
        </div>
        <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>

        @include('admin.configuracion.catalogos-DBA.modalCrearCatalogoDBA')
        @include('admin.catalogo.modalVerCatalogoDBA')
    </div>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/admin/catalogo-dba.js') }}"></script>
@endpush
