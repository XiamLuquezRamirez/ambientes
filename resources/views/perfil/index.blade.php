@extends($layout)
@section('title', 'Perfil')
@php
    $rol = $usuario->rol;
@endphp
@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/estilosModals.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/docente/index.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/perfil.css') }}">
@endpush
@section('content')
    <div class="container-fluid py-4">
        @include('perfil.partials._page_header')
        @include('perfil.partials._header')
        @include('perfil.partials._tabs')
        @include('perfil.editar_usuario')
        @if ($puedeCambiarFoto ?? false)
            @include('perfil.partials._modal_foto_perfil')
        @endif
    </div>
    @include('perfil.partials._historial_accesos')
@endsection
