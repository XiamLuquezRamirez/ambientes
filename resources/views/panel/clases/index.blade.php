@extends('layouts.panel')
@section('title', 'Clases')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/tematicas.css') }}">
@endpush

@section('content')
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
        <div>
            <p style="margin-bottom:4px">Gestión de clases -

                {{ $carga->grado->nombre ?? 'Grado' }}
                {{ $carga->grupo->nombre ?? '' }}
            </p>
        </div>
        <div style="display:flex;gap:10px">
            <button type="button" class="btn btn-primary" id="btnNuevaClase">
                <i class="fas fa-plus"></i> Nueva Clase
            </button>
        </div>
    </div>

    <div class="clases-app" data-grado-id="{{ $carga->grado_id }}" data-carga-id="{{ $carga->id }}"
        data-url-tematicas-eje-template="{{ url('panel/catalogo/ejes/__EJE__/tematicas') }}"
        data-url-experiencias-template="{{ url('panel/catalogo/tematicas/__TEMATICA__/experiencias') }}"
        data-url-guardar="{{ route('panel.clases.guardar') }}"
        data-url-estado-template="{{ url('panel/clases/__ID__/estado') }}">

        <div id="contenedorTabla">
            @include('panel.clases._tabla', ['clases' => $clases])
        </div>

        @include('panel.clases._modal-crear')
    </div>

    @include('partials.experiencias._script-arbol-tematicas', ['tipoArbol' => 'panel'])
    <script>
        window.CLASES_GRUPOS_REPLICA = @json($gruposReplica);
        window.CLASES_CONTEXTO = @json($contextoClases);
    </script>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/clases-panel.js') }}"></script>
@endpush
