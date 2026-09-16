@extends('layouts.superAdmin')
@section('title', 'Tipos de Juegos')

@section('content')
    <div id="tiposJuegosPage" data-url-base="{{ route('superadmin.catalogo_juegos.tipos.index') }}"
        data-url-guardar="{{ route('superadmin.catalogo_juegos.tipos.guardar') }}"
        data-url-mostrar-template="{{ url('superadmin/catalogo_juegos/tipos/__ID__') }}"
        data-url-actualizar-template="{{ url('superadmin/catalogo_juegos/tipos/__ID__') }}"
        data-url-estado-template="{{ url('superadmin/catalogo_juegos/tipos/__ID__/estado') }}">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
            <div>
                <h1>Tipos de Juegos</h1>
                <p>Catálogo de tipos para clasificar los paquetes de juegos</p>
            </div>
            <button type="button" class="btn btn-primary" id="btnNuevoTipoJuego">
                <i class="fa-solid fa-plus"></i> Nuevo tipo de juego
            </button>
        </div>

        <form id="formBuscar" style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
            <div class="input-buscar">
                <span class="icono-buscar"><i class="fas fa-search"></i></span>
                <input type="text" name="buscar" placeholder="Buscar por nombre o descripción..." value="{{ request('buscar') }}"
                    autocomplete="off">
            </div>

            <select name="activo" class="form-control" style="width:auto">
                <option value="">Todos los estados</option>
                <option value="1" @selected(request('activo') === '1')>Activos</option>
                <option value="0" @selected(request('activo') === '0')>Inactivos</option>
            </select>

            <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-filter"></i> Filtrar</button>
            <a id="btnLimpiar" href="{{ route('superadmin.catalogo_juegos.tipos.index') }}" class="btn btn-sm"
                style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
                  display:{{ request()->hasAny(['buscar', 'activo']) ? 'inline-flex' : 'none' }}">
                <i class="fas fa-broom"></i> Limpiar
            </a>
        </form>

        <div id="contenedorTabla">
            @include('superAdmin.catalogo_juegos.tipos_juegos._tabla')
        </div>
        <div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>
    </div>
    @include('superAdmin.catalogo_juegos.tipos_juegos.modalCrearTipo')
@endsection

@push('scripts')
    <script
        src="{{ asset('assets/js/superAdmin/tipos-juegos.js') }}?v={{ @filemtime(public_path('assets/js/superAdmin/tipos-juegos.js')) }}">
    </script>
@endpush
