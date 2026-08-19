@extends('layouts.admin')
@section('title', 'Experiencias')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/tematicas.css') }}">
@endpush

@section('content')
    <div class="page-header tematicas-page-header">
        <div>
            <h1>Experiencias</h1>
            <p>Experiencias de aprendizaje por temática del colegio</p>
        </div>
        <button type="button" class="btn btn-primary" id="btnNuevaExperiencia" hidden disabled>
            <i class="fa-solid fa-plus"></i> Nueva experiencia
        </button>
    </div>

    <div class="c-card config-sistema experiencias-app" data-rol="admin"
        data-url-listar-template="{{ url('admin/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-tematicas-eje-template="{{ url('admin/catalogo/ejes/__EJE__/tematicas') }}"
        data-url-guardar-template="{{ url('admin/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-mostrar-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-actualizar-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-flujo-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__/flujo') }}"
        data-url-estado-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__/estado') }}"
        data-url-eliminar-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__') }}">

        @include('partials.experiencias._contexto')
        @include('partials.experiencias._tabla')
    </div>

    @include('partials.experiencias.modal-seleccion-tematica')
    @include('partials.experiencias._modal-experiencia')

    @include('partials.experiencias._script-arbol-tematicas', ['tipoArbol' => 'admin'])
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/experiencias-catalogo.js') }}"></script>
@endpush
