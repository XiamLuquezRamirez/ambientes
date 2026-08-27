@extends('layouts.panel')
@section('title', 'Ejes')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
@endpush

@section('content')
    <div class="page-header">
        <h1>Ejes</h1>
        <p style="color:#64748B">Ejes oficiales y propios de sus ambientes asignados</p>
    </div>

    <div class="c-card config-panel-catalogo" style="padding: 20px;"
        data-url-ejes-template="{{ url('panel/catalogo/modulos/__MODULO__/ejes') }}"
        data-url-ejes-show-template="{{ url('panel/catalogo/ejes/__EJE__') }}"
        data-url-ejes-update-template="{{ url('panel/catalogo/ejes/__EJE__') }}"
        data-url-ejes-mover-template="{{ url('panel/catalogo/ejes/__EJE__/mover') }}"
        data-url-ejes-estado-template="{{ url('panel/catalogo/ejes/__EJE__/estado') }}"
        data-url-ejes-destroy-template="{{ url('panel/catalogo/ejes/__EJE__') }}">
        @include('panel.catalogo.ejes._ejes')
    </div>

    @include('panel.catalogo.ejes.modalVerEjesModulo')

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
    <script src="{{ asset('assets/js/configuracion-ejes-ui.js') }}"></script>
    <script src="{{ asset('assets/js/panel/catalogo-ejes.js') }}"></script>
@endpush
