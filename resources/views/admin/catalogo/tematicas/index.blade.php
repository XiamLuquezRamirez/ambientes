@extends('layouts.admin')
@section('title', 'Temáticas')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/tematicas.css') }}">
@endpush

@section('content')
    <div class="page-header tematicas-page-header">
        <div>
            <h1>Temáticas</h1>
            <p>Todas las temáticas del colegio</p>
        </div>
        <button type="button" class="btn btn-primary" id="btnNuevaTematica">
            <i class="fa-solid fa-plus"></i> Nueva temática
        </button>
    </div>

    <div class="c-card config-sistema tematicas-app" data-rol="admin" data-url-listar="{{ route('admin.catalogo.tematicas.listar') }}"
        data-url-guardar-template="{{ url('admin/catalogo/ejes/__EJE__/tematicas') }}"
        data-url-mostrar-template="{{ url('admin/catalogo/tematicas/__TEMATICA__') }}"
        data-url-actualizar-template="{{ url('admin/catalogo/tematicas/__TEMATICA__') }}"
        data-url-estado-template="{{ url('admin/catalogo/tematicas/__TEMATICA__/estado') }}"
        data-url-eliminar-template="{{ url('admin/catalogo/tematicas/__TEMATICA__') }}"
        data-url-dbas="{{ route('admin.catalogo.tematicas.dbas') }}"
        data-url-experiencias-template="{{ url('admin/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-experiencias-guardar-template="{{ url('admin/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-experiencias-mostrar-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-experiencias-actualizar-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-experiencias-flujo-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__/flujo') }}"
        data-url-experiencias-estado-template="{{ url('admin/catalogo/experiencias/__EXPERIENCIA__/estado') }}"
        data-url-experiencias-index="{{ route('admin.catalogo.experiencias.index') }}">

        @include('partials.tematicas._filtros')
        @include('partials.tematicas._tabla')
    </div>

    @include('partials.tematicas.modales')

    @php
        $arbolTematicas = collect($ambientes ?? [])
            ->map(function ($ambiente) {
                return [
                    'id' => $ambiente->id,
                    'nombre' => $ambiente->nombre,
                    'modulos' => collect($ambiente->modulos ?? [])
                        ->map(function ($modulo) {
                            return [
                                'id' => $modulo->id,
                                'nombre' => $modulo->nombre,
                                'ejes' => collect($modulo->ejes ?? [])
                                    ->map(function ($eje) {
                                        return [
                                            'id' => $eje->id,
                                            'nombre' => $eje->nombre,
                                        ];
                                    })
                                    ->values(),
                            ];
                        })
                        ->values(),
                ];
            })
            ->values();
    @endphp
    <script>
        window.TEMATICAS_ARBOL = @json($arbolTematicas);
    </script>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/tematicas-form.js') }}"></script>
@endpush
