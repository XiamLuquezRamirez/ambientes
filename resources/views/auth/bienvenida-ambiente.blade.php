@extends('layouts.ambiente')

@php
    $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
    $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
@endphp

@push('styles')
    <link rel="stylesheet"
        href="{{ asset('assets/css/kiosco-bienvenida.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-bienvenida.css')) ?: time() }}">
@endpush

@section('content')
<main class="bienambiente-wrap{{ $fondoBienvenida ? ' is-armando' : '' }}" data-kiosco-sesion="1" data-kiosco-superponible
    data-redirect-inicio="{{ $redirectInicio ?? '/recorrido' }}"
    data-voz="¡Hola, {{ $primerNombre }}! Acompáñame al ambiente {{ $ambiente->nombre }}."
    @if ($fondoBienvenida) data-fondo="{{ $fondoBienvenida }}" @endif>
    <div class="bienambiente-escena"
        @if ($fondoBienvenida) style="--bienambiente-fondo: url('{{ $fondoBienvenida }}');" @endif>
        <div class="bienambiente-nino">
            <p class="bienambiente-hola">¡Hola!</p>
            <div class="bienambiente-ficha" style="--color-av: {{ $estudiante->color_avatar ?: '#7cc242' }};">
                <span class="bienambiente-ficha__foto">
                    @include('auth._avatar-circulo')
                </span>
                <span class="bienambiente-ficha__nombre">
                    <span>{{ $primerNombre }}</span>
                    @if ($primerApellido !== '')
                        <span>{{ $primerApellido }}</span>
                    @endif
                </span>
            </div>
        </div>

        <div class="bienambiente-mensaje">
            <h1 class="bienambiente-texto">¡Acompáñame al ambiente {{ $ambiente->nombre }}!</h1>
            <div class="bienambiente-estrellas" aria-hidden="true">
                <i class="fa-solid fa-star" style="--delay: .35s"></i>
                <i class="fa-solid fa-star" style="--delay: .5s"></i>
                <i class="fa-solid fa-star" style="--delay: .65s"></i>
            </div>
        </div>
    </div>
</main>
@endsection
