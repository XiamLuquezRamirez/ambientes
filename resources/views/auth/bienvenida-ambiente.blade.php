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
                <span class="bienambiente-estrella bienambiente-estrella--izq" style="--delay: .35s"></span>
                <span class="bienambiente-estrella bienambiente-estrella--centro" style="--delay: .5s"></span>
                <span class="bienambiente-estrella bienambiente-estrella--der" style="--delay: .65s"></span>
            </div>
        </div>
    </div>
</main>
@endsection
