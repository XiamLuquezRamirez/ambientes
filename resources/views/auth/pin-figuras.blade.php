@extends('layouts.ambiente')

@php
    $destino = $destino ?? \App\Services\SesionNinoService::DESTINO_RECORRIDO;
    $urlAlumnos = route(
        'auth.alumnos',
        $destino === \App\Services\SesionNinoService::DESTINO_JUEGOS ? ['destino' => 'juegos'] : [],
    );
@endphp

@push('styles')
    <link rel="stylesheet"
        href="{{ asset('assets/css/kiosco-selector-polimotor.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-selector-polimotor.css')) ?: time() }}">
@endpush

@section('content')
    @if ($sinPin || $pinBloqueado)
        <main class="pin-wrap">
            <div class="pin-bloqueado" role="alert">
                <span class="pin-bloqueado__icono" aria-hidden="true">
                    <i class="fas {{ $sinPin ? 'fa-lock' : 'fa-ban' }}"></i>
                </span>
                <div class="kiosco-ficha-alumno" style="--color-av: {{ $estudiante->color_avatar }};">
                    @include('auth._avatar-ficha')
                </div>
                <p class="pin-bloqueado__titulo">
                    {{ $sinPin ? 'Sin PIN configurado' : 'PIN bloqueado' }}
                </p>
                <p class="pin-bloqueado__texto">
                    {{ $sinPin
                        ? 'Pide a tu profe que configure tu PIN de 3 figuras para poder entrar.'
                        : 'Hubo demasiados intentos. Pide a tu profe que restablezca tu PIN.' }}
                </p>
                <a href="{{ $urlAlumnos }}" class="pin-btn">
                    <i class="fas fa-arrow-left" aria-hidden="true"></i>
                    <span>Elegir otro</span>
                </a>
            </div>
        </main>
    @else
        <main class="pin-wrap" id="kioscoPinApp" data-verificar="{{ route('auth.verificar-pin', $estudiante->id) }}"
            data-csrf="{{ csrf_token() }}" data-catalogo='@json(collect($figuras)->keyBy('icon'))'>
            <div class="pin-izquierda">
                <div class="kiosco-ficha-alumno" style="--color-av: {{ $estudiante->color_avatar }};">
                    @include('auth._avatar-ficha')
                </div>
                <p class="pin-instruccion">Toca tus 3 figuras</p>

                <div class="indicadores" id="indicadores" aria-live="polite">
                    <div class="indicador" id="ind-0"></div>
                    <div class="indicador" id="ind-1"></div>
                    <div class="indicador" id="ind-2"></div>
                </div>

                <p class="pin-mensaje" id="pinMensaje" role="alert" aria-live="assertive"></p>

                <div class="pin-acciones">
                    <a href="{{ $urlAlumnos }}" class="pin-btn">
                        <i class="fas fa-arrow-left" aria-hidden="true"></i>
                        <span>Volver</span>
                    </a>
                    <button type="button" class="pin-btn" id="btnBorrarPin">
                        <i class="fas fa-trash-can" aria-hidden="true"></i>
                        <span>Borrar</span>
                    </button>
                </div>
            </div>

            <div class="pin-figuras-grid" role="group" aria-label="Figuras del PIN">
                @foreach ($figuras as $figura)
                    <button type="button" class="figura-btn" data-icon="{{ $figura['icon'] }}"
                        data-color="{{ $figura['color'] }}" aria-label="{{ $figura['nombre'] }}">
                        <i class="{{ $figura['icon'] }}" style="color: {{ $figura['color'] }};" aria-hidden="true"></i>
                    </button>
                @endforeach
            </div>
        </main>

        <div id="overlay-exito" class="overlay" style="display:none;" aria-live="polite">
            <div class="overlay-contenido">
                <span class="overlay-icono" aria-hidden="true">✓</span>
                <p>¡Muy bien!</p>
            </div>
        </div>
    @endif
@endsection
