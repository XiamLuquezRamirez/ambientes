@extends('layouts.ambiente')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/constructor-vista-nino.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/recorrido-nino.css') }}">
@endpush

@section('content')
    <div class="rn-kiosco-shell"
        @if ($modo === 'sesion') data-kiosco-sesion="1" @endif
        style="--rn-color: {{ $arbol['ambiente']['color_hex'] }};">
        @include('experiencias._recorrido-nino-app', array_merge(get_defined_vars(), ['enKioscoShell' => true]))
    </div>
@endsection
