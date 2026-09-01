@extends('layouts.ambiente')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/constructor-vista-nino.css') }}?v={{ @filemtime(public_path('assets/css/constructor-vista-nino.css')) }}">
    <link rel="stylesheet" href="{{ asset('assets/css/recorrido-nino.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/banco-juegos.css') }}?v={{ @filemtime(public_path('assets/css/banco-juegos.css')) }}">
    <link rel="stylesheet" href="{{ asset('assets/css/juego-memoria-animales.css') }}?v={{ @filemtime(public_path('assets/css/juego-memoria-animales.css')) }}">
    <link rel="stylesheet" href="{{ asset('assets/css/juego-colores-magicos.css') }}?v={{ @filemtime(public_path('assets/css/juego-colores-magicos.css')) }}">
@endpush

@section('content')
    <div class="rn-kiosco-shell"
        @if ($modo === 'sesion') data-kiosco-sesion="1" @endif
        style="--rn-color: {{ $arbol['ambiente']['color_hex'] }};">
        @include('experiencias._recorrido-nino-app', array_merge(get_defined_vars(), ['enKioscoShell' => true]))
    </div>
@endsection
