@extends('layouts.panel')
@section('title', 'Módulos')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
@endpush

@section('content')
    <div class="page-header">
        <h1>Módulos</h1>
        <p style="color:#64748B">Módulos de sus ambientes asignados (solo lectura)</p>
    </div>

    <div class="c-card config-panel-catalogo" style="padding: 20px;">
        @include('panel.catalogo.modulos._modulos')
    </div>

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
@endpush
