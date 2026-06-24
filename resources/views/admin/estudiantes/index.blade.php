@extends('layouts.admin')
@section('title', 'Estudiantes')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/helpers.css') }}">
@endpush

@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div>
        <h1>Estudiantes</h1>
        <p>Gestión de estudiantes</p>   
    </div>
    <button class="btn btn-primary" onclick="abrirModal()"><i class="fas fa-plus"></i> Nuevo Estudiante</button>
</div>

{{-- ── Filtros ──────────────────────────────────────────────────── --}}
<form id="formBuscar" style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
   
    <div class="input-buscar">
        <span class="icono-buscar"><i class="fas fa-search"></i></span>
        <input type="text" name="buscar" placeholder="Buscar por nombre o identificación..."
            value="{{ request('buscar') }}" autocomplete="off">
    </div>  
    <div class="form-group">
        <label for="grado_id">Grado</label>
        <select name="grado_id" id="grado_id" class="form-control" style="width:auto">
            <option value="">Todos los grados</option>
            @foreach($grados as $g)
            <option value="{{ $g->id }}" {{ request('grado_id') == $g->id ? 'selected' : '' }}>{{ $g->nombre }}</option>
            @endforeach
        </select>
    </div>
    <div class="form-group">
        <label for="condicion_id">Condición</label>
        <select name="condicion_id" id="condicion_id" class="form-control" style="width:auto">
            <option value="">Todos</option>
            @foreach($condiciones as $c)
            <option value="{{ $c->id }}" {{ request('condicion_id') == $c->id ? 'selected' : '' }}>{{ $c->nombre }}</option>
            @endforeach
        </select>
    </div>
    <div class="form-group">
        <label for="estado">Estado</label>
        <select name="estado" id="estado" class="form-control" style="width:auto">
            <option value="">Todos</option>
            <option value="0">Inactivo</option>
            <option value="1">Activo</option>
        </select>
    </div>
    <a id="btnLimpiar" id="btnLimpiar" type="button" href="#" class="btn btn-danger" style="display:{{ request()->hasAny(['buscar','grado_id','grupo_id','condicion_id','estado']) ? 'inline-flex' : 'none' }}">
        <i class="fas fa-broom"></i> Limpiar
    </a>
</form>

{{-- ── Contenedor de tabla ──────────────────────────────────────── --}}
<div id="contenedorTabla">
    @include('admin.estudiantes._tabla')
</div>
<div id="cargando-tabla"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>

{{-- ── Modal Bootstrap 5 – Nuevo Estudiante ──────────────────────── --}}
@include('admin.estudiantes.modal_registro')

@endsection

@push('scripts')
<script>
    const URL_ESTUDIANTES = "{{ route('admin.estudiantes') }}";
</script>
<script src="{{ asset('assets/js/estudiantes/index.js') }}"></script>
@endpush