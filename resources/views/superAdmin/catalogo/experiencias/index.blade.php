@extends('layouts.superAdmin')
@section('title', 'Experiencias')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/tematicas.css') }}">
@endpush

@section('content')
    <div class="page-header tematicas-page-header">
        <div>
            <h1>Experiencias</h1>
            <p>Experiencias oficiales de PedNia por temática</p>
        </div>
        <button type="button" class="btn btn-primary" id="btnNuevaExperiencia" hidden disabled>
            <i class="fa-solid fa-plus"></i> Nueva experiencia
        </button>
    </div>

    <div class="c-card config-sistema experiencias-app" data-rol="superadmin"
        data-url-listar-template="{{ url('superadmin/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-tematicas-eje-template="{{ url('superadmin/catalogo/ejes/__EJE__/tematicas') }}"
        data-url-guardar-template="{{ url('superadmin/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-mostrar-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-actualizar-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-flujo-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__/flujo') }}"
        data-url-estado-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__/estado') }}"
        data-url-eliminar-template=""
        data-url-constructor-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__/constructor') }}">

        @include('partials.experiencias._contexto')
        @include('partials.experiencias._tabla')
    </div>

    @include('partials.experiencias.modal-seleccion-tematica')
    @include('partials.experiencias._modal-experiencia')

    @include('partials.experiencias._script-arbol-tematicas', ['tipoArbol' => 'superadmin'])
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/experiencias-catalogo.js') }}"></script>
@endpush
