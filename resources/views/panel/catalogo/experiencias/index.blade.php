@extends('layouts.panel')
@section('title', 'Experiencias')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/tematicas.css') }}">
@endpush

@section('content')
    <div class="page-header tematicas-page-header">
        <div>
            <h1>Experiencias</h1>
            <p>Experiencias de aprendizaje por temática en sus ambientes asignados</p>
        </div>
        <button type="button" class="btn btn-primary" id="btnNuevaExperiencia" hidden disabled>
            <i class="fa-solid fa-plus"></i> Nueva experiencia
        </button>
    </div>

    <div class="c-card config-sistema experiencias-app" data-rol="panel"
        data-url-listar-template="{{ url('panel/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-tematicas-eje-template="{{ url('panel/catalogo/ejes/__EJE__/tematicas') }}"
        data-url-guardar-template="{{ url('panel/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-mostrar-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-actualizar-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-flujo-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__/flujo') }}"
        data-url-estado-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__/estado') }}"
        data-url-eliminar-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-constructor-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__/constructor') }}">

        @include('partials.experiencias._contexto')
        @include('partials.experiencias._tabla')
    </div>

    @include('partials.experiencias.modal-seleccion-tematica')
    @include('partials.experiencias._modal-experiencia')

    @include('partials.experiencias._script-arbol-tematicas', ['tipoArbol' => 'panel'])

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
    <script src="{{ asset('assets/js/experiencias-catalogo.js') }}"></script>
@endpush
