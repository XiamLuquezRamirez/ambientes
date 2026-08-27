@extends('layouts.panel')
@section('title', 'Temáticas')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/tematicas.css') }}">
@endpush

@section('content')
    <div class="page-header tematicas-page-header">
        <div>
            <h1>Temáticas</h1>
            <p>Gestión de temáticas en sus ambientes asignados</p>
        </div>
        <button type="button" class="btn btn-primary" id="btnNuevaTematica">
            <i class="fa-solid fa-plus"></i> Nueva temática
        </button>
    </div>

    <div class="c-card config-sistema tematicas-app" data-rol="panel"
        data-url-listar="{{ route('panel.tematicas.listar') }}"
        data-url-guardar-template="{{ url('panel/catalogo/ejes/__EJE__/tematicas') }}"
        data-url-mostrar-template="{{ url('panel/catalogo/tematicas/__TEMATICA__') }}"
        data-url-actualizar-template="{{ url('panel/catalogo/tematicas/__TEMATICA__') }}"
        data-url-estado-template="{{ url('panel/catalogo/tematicas/__TEMATICA__/estado') }}"
        data-url-eliminar-template="{{ url('panel/catalogo/tematicas/__TEMATICA__') }}"
        data-url-dbas="{{ route('panel.tematicas.dbas') }}"
        data-url-experiencias-template="{{ url('panel/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-experiencias-guardar-template="{{ url('panel/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-experiencias-mostrar-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-experiencias-actualizar-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__') }}"
        data-url-experiencias-flujo-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__/flujo') }}"
        data-url-experiencias-estado-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__/estado') }}"
        data-url-experiencias-constructor-template="{{ url('panel/catalogo/experiencias/__EXPERIENCIA__/constructor') }}"
        data-url-experiencias-index="{{ route('panel.catalogo.experiencias.index') }}">

        <p class="text-muted small mb-3">
            Las temáticas <span class="star">⭐ Oficiales</span> son de solo lectura.
            Puede editar solo las <span class="badge-colegio">Del colegio</span> que usted creó.
        </p>

        @include('partials.tematicas._filtros')
        @include('partials.tematicas._tabla')
    </div>

    @include('partials.tematicas.modales')

    @php
        $arbolTematicas = collect($ambientesModulos ?? [])
            ->map(function ($ambiente) {
                return [
                    'id' => $ambiente->id,
                    'nombre' => $ambiente->nombre,
                    'modulos' => collect($ambiente->modulosInstitucion ?? [])
                        ->map(function ($item) {
                            $modulo = $item['modelo'];
                            $oficiales = collect($item['ejes_oficiales'] ?? [])->filter(function ($e) {
                                return (bool) $e->activo;
                            });
                            $propios = collect($item['ejes_propios'] ?? [])->filter(function ($e) {
                                return (bool) $e->activo;
                            });
                            $ejes = $oficiales
                                ->concat($propios)
                                ->map(function ($eje) {
                                    return [
                                        'id' => $eje->id,
                                        'nombre' => $eje->nombre,
                                    ];
                                })
                                ->values();

                            return [
                                'id' => $modulo->id,
                                'nombre' => $modulo->nombre,
                                'ejes' => $ejes,
                            ];
                        })
                        ->values(),
                ];
            })
            ->values();
    @endphp
    <script>
        window.TEMATICAS_ARBOL = @json($arbolTematicas);
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
    <script src="{{ asset('assets/js/tematicas-form.js') }}"></script>
@endpush
