@extends('layouts.admin')
@section('title', 'Perfiles de Aprendizaje')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin/configuracion-condiciones.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
            <h1>Perfiles de Aprendizaje</h1>
            <p>Personalice visibilidad y orden de los perfiles de aprendizaje de su institución</p>
        </div>
    </div>

    <p class="cfg-hint">
        <i class="fa-solid fa-info-circle"></i>
        Arrastre las tarjetas para reordenar, o elija un criterio en el select y guarde el orden.
    </p>

    <form id="formFiltrosCondiciones" class="cfg-filtros">
        <select name="ordenar" id="selectOrdenarCondiciones" class="form-control" style="width:auto;min-width:200px">
            <option value="">Orden personalizado (arrastrar)</option>
            <option value="nombre" @selected(request('ordenar') === 'nombre')>Ordenar por nombre</option>
            <option value="codigo" @selected(request('ordenar') === 'codigo')>Ordenar por código</option>
        </select>

        <select name="activa" class="form-control" style="width:auto">
            <option value="">Todas</option>
            <option value="1" @selected(request('activa') === '1')>Activas</option>
            <option value="0" @selected(request('activa') === '0')>Desactivadas</option>
        </select>

        <button type="button" id="btnGuardarOrdenCondiciones" class="btn btn-primary btn-sm btn-condiciones"
            style="display:{{ request('ordenar') ? 'inline-flex' : 'none' }}">
            <i class="fas fa-save"></i> Guardar orden seleccionado
        </button>
    </form>

    <div id="contenedorListaCondiciones">
        @include('admin.configuracion.perfil-aprendizaje._lista')
    </div>

    @include('partials.perfil-aprendizaje.modal-estudiantes-asociados')
@endsection

@push('scripts')
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
    <script>
        window.URL_CFG_CONDICIONES = @json(route('admin.configuracion.perfil-aprendizaje.index'));
        window.URL_CFG_CONDICIONES_ORDEN = @json(route('admin.configuracion.perfil-aprendizaje.orden'));
        window.CN_EST_URL_LIST = (id) => @json(url('admin/configuracion/perfil-aprendizaje')) + `/${id}/estudiantes`;
    </script>
    <script src="{{ asset('assets/js/admin/configuracion-condiciones.js') }}"></script>
    <script src="{{ asset('assets/js/condiciones/estudiantes-asociados-condicion.js') }}"></script>
@endpush
