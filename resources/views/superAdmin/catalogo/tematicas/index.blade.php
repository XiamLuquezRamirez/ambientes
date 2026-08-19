@extends('layouts.superAdmin')
@section('title', 'Temáticas')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/tematicas.css') }}">
@endpush

@section('content')
    <div class="page-header tematicas-page-header">
        <div>
            <h1>Temáticas</h1>
            <p>Catálogo de temáticas PedNia y de los colegios</p>
        </div>
        <button type="button" class="btn btn-primary" id="btnNuevaTematica">
            <i class="fa-solid fa-plus"></i> Nueva temática
        </button>
    </div>

    <div class="c-card config-sistema tematicas-app" data-rol="superadmin"
        data-url-listar="{{ route('superadmin.catalogo.tematicas.listar') }}"
        data-url-guardar-template="{{ url('superadmin/catalogo/ejes/__EJE__/tematicas') }}"
        data-url-mostrar-template="{{ url('superadmin/catalogo/tematicas/__TEMATICA__') }}"
        data-url-actualizar-template="{{ url('superadmin/catalogo/tematicas/__TEMATICA__') }}"
        data-url-estado-template="{{ url('superadmin/catalogo/tematicas/__TEMATICA__/estado') }}"
        data-url-eliminar-template="" data-url-dbas="{{ route('superadmin.catalogo.tematicas.dbas') }}"
        data-url-experiencias-template="{{ url('superadmin/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-experiencias-guardar-template="{{ url('superadmin/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-experiencias-mostrar-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-experiencias-actualizar-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-experiencias-flujo-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__/flujo') }}"
        data-url-experiencias-estado-template="{{ url('superadmin/catalogo/experiencias/__EXPERIENCIA__/estado') }}"
        data-url-experiencias-index="{{ route('superadmin.catalogo.experiencias.index') }}">

        <p class="text-muted small mb-3">
            Puede consultar todas las temáticas.
            Solo gestiona las <span class="star">⭐ Oficiales</span> que usted creó;
            las demás (oficiales de otros SuperAdmin y <span class="badge-colegio">Del colegio</span>) son de solo lectura.
        </p>

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
                    'modulos' => collect($ambiente->modulosOficiales ?? [])
                        ->map(function ($modulo) {
                            return [
                                'id' => $modulo->id,
                                'nombre' => $modulo->nombre,
                                'ejes' => collect($modulo->ejesOficiales ?? [])
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
