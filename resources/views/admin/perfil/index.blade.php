@extends('layouts.admin')
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
        @include('admin.perfil.partials._page_header')
        @include('admin.perfil.partials._header')
        @include('admin.perfil.partials._tabs')
        @include('admin.perfil.editar_usuario')
    </div>

    @if ($rol === 'admin')
        @include('admin.perfil.partials._historial_accesos')
    @endif
@endsection
