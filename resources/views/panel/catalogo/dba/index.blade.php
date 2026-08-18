@extends('layouts.panel')
@section('title', 'Catálogo DBA')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/admin/catalogo-dba.css') }}">
@endpush

@section('content')
    <div id="catalogoDBAApp" data-url-base="{{ url('panel/catalogo') }}"
        data-url-detalle="{{ url('panel/catalogo/detalle') }}">

        <div class="page-header catalogo-dba-page-header">
            <div>
                <h1>Catálogo DBA</h1>
                <p>DBA activos del MEN y de tu colegio (solo consulta)</p>
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

            <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-filter"></i> Filtrar</button>
            <a id="btnLimpiar" href="{{ route('panel.catalogo') }}" class="btn btn-sm btn-limpiar-filtros"
                style="display:{{ request()->hasAny(['buscar', 'area_id', 'grado_id']) ? 'inline-flex' : 'none' }}">
                <i class="fas fa-broom"></i> Limpiar
            </a>
        </form>

        <div id="contenedorCatalogo">
            @include('panel.catalogo.dba._contenido')
        </div>
        <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>

        @include('panel.catalogo.dba.modalVerCatalogoDBA')
    </div>

    <script>
        (function() {
            const tituloAmbiente = document.getElementById('txt-trabajando-en-ambiente');
            if (!tituloAmbiente) return;
            tituloAmbiente.style.display = 'none';
            const headerAmbiente = tituloAmbiente.closest('.students-header');
            if (headerAmbiente) headerAmbiente.style.display = 'none';
        })();
    </script>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/panel/catalogo-dba.js') }}"></script>
@endpush
