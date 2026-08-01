@extends('layouts.admin')
@section('title', 'Condiciones transitorias')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/admin/configuracion-condiciones.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
            <h1>Condiciones transitorias</h1>
            <p>Opciones disponibles para docentes en su institución</p>
        </div>
        <div>
            <button type="button" class="btn btn-primary" onclick="abrirModalRegistrarTransitoria()">
                <i class="fas fa-plus"></i> Nueva opción
            </button>
        </div>
    </div>

    <p class="cfg-hint">
        <i class="fa-solid fa-info-circle"></i>
        Arrastre para reordenar, o elija un criterio y guarde el orden.
        Solo puede editar o eliminar las opciones adicionales de su institución.
    </p>

    <form id="formFiltrosTransitorias" class="cfg-filtros">
        <select name="condicion_base_id" class="form-control" style="width:auto;min-width:220px">
            <option value="">Todas las condiciones base</option>
            @foreach ($condicionesBase as $base)
                <option value="{{ $base->id }}" @selected((string) request('condicion_base_id') === (string) $base->id)>
                    {{ $base->codigo }} — {{ $base->nombre }}
                </option>
            @endforeach
        </select>

        <select name="ordenar" id="selectOrdenarTransitorias" class="form-control" style="width:auto;min-width:200px">
            <option value="">Orden personalizado (arrastrar)</option>
            <option value="nombre" @selected(request('ordenar') === 'nombre')>Ordenar por nombre</option>
            <option value="codigo" @selected(request('ordenar') === 'codigo')>Ordenar por código</option>
        </select>

        <select name="activa" class="form-control" style="width:auto">
            <option value="">Todas</option>
            <option value="1" @selected(request('activa') === '1')>Activas</option>
            <option value="0" @selected(request('activa') === '0')>Desactivadas</option>
        </select>

        <button type="button" id="btnGuardarOrdenTransitorias" class="btn btn-primary btn-sm btn-condiciones"
            style="display:{{ request('ordenar') ? 'inline-flex' : 'none' }}">
            <i class="fas fa-save"></i> Guardar orden seleccionado
        </button>
    </form>

    <div id="contenedorListaTransitorias">
        @include('admin.configuracion.condiciones-transitorias._lista')
    </div>

    @include('superAdmin.condicionesTransitorias.ModalRegistrarTransitoria', [
        'esSuperAdmin' => false,
        'condicionesBase' => $condicionesBase,
        'urlTransitoriasBase' => route('admin.configuracion.condiciones-transitorias.index'),
        'urlTransitoriasItem' => url('admin/configuracion/condiciones-transitorias/opcion'),
    ])
@endsection

@push('scripts')
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
    <script>
        window.URL_CFG_TRANSITORIAS = @json(route('admin.configuracion.condiciones-transitorias.index'));
        window.URL_CFG_TRANSITORIAS_ORDEN = @json(route('admin.configuracion.condiciones-transitorias.orden'));
    </script>
    <script src="{{ asset('assets/js/admin/configuracion-condiciones-transitorias.js') }}"></script>
@endpush
