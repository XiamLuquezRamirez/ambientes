@extends('layouts.panel')
@section('title', 'Portafolios')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
@endpush

@section('content')
    <div class="page-header">
        <h1>Portafolios</h1>
        <p style="color:#64748B">Gestión de ejes en sus ambientes asignados</p>
    </div>

    <div class="c-card config-panel-portafolio" style="padding-top: 16px;"
        data-url-ejes-template="{{ url('panel/portafolio/modulos/__MODULO__/ejes') }}"
        data-url-ejes-show-template="{{ url('panel/portafolio/ejes/__EJE__') }}"
        data-url-ejes-update-template="{{ url('panel/portafolio/ejes/__EJE__') }}"
        data-url-ejes-mover-template="{{ url('panel/portafolio/ejes/__EJE__/mover') }}"
        data-url-ejes-estado-template="{{ url('panel/portafolio/ejes/__EJE__/estado') }}"
        data-url-ejes-destroy-template="{{ url('panel/portafolio/ejes/__EJE__') }}">
        <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item" role="presentation">
                <a class="nav-link active" id="tab-modulos" data-bs-toggle="tab" href="#modulos" role="tab"
                    aria-controls="modulos" aria-selected="true">
                    <i class="fas fa-cube"></i> Módulos
                </a>
            </li>
            <li class="nav-item" role="presentation">
                <a class="nav-link" id="tab-ejes" data-bs-toggle="tab" href="#ejes" role="tab" aria-controls="ejes"
                    aria-selected="false">
                    <i class="fas fa-diagram-project"></i> Ejes
                </a>
            </li>
        </ul>

        <div class="tab-content" style="padding: 20px;">
            <div class="tab-pane fade show active" id="modulos" role="tabpanel" aria-labelledby="tab-modulos">
                @include('panel.portafolio._modulos')
            </div>
            <div class="tab-pane fade" id="ejes" role="tabpanel" aria-labelledby="tab-ejes">
                @include('panel.portafolio._ejes')
            </div>
        </div>
    </div>

    @include('admin.configuracion.institucion.modalVerEjesModulo')

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
    <script src="{{ asset('assets/js/panel/portafolio-ejes.js') }}"></script>
@endpush
