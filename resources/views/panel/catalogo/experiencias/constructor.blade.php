@extends('layouts.panel')
@section('title', 'Constructor de experiencia')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/superAdmin/configuracion.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/tematicas.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/constructor-experiencia.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/constructor-vista-nino.css') }}">
@endpush

@section('content')
    @include('partials.experiencias._constructor')

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
    @include('partials._captura-multimedia')
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
    <script src="{{ asset('assets/js/constructor-experiencia.js') }}"></script>
    <script src="{{ asset('assets/js/constructor-vista-nino.js') }}"></script>
@endpush
