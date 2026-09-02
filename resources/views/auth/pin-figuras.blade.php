@extends('layouts.ambiente')

@section('content')
@if ($sinPin || $pinBloqueado)
<main class="pin-wrap">
    <div class="pin-bloqueado" role="alert">
        <span class="pin-bloqueado__icono" aria-hidden="true">
            <i class="fas {{ $sinPin ? 'fa-lock' : 'fa-ban' }}"></i>
        </span>
        <div class="pin-avatar" style="--color-av: {{ $estudiante->color_avatar }};">
            <span class="pin-avatar__circulo">
                @include('auth._avatar-circulo')
            </span>
        </div>
        <p class="pin-nombre">{{ $estudiante->nombre }}</p>
        <p class="pin-bloqueado__titulo">
            {{ $sinPin ? 'Sin PIN configurado' : 'PIN bloqueado' }}
        </p>
        <p class="pin-bloqueado__texto">
            {{ $sinPin
                ? 'Pide a tu profe que configure tu PIN de 3 figuras para poder entrar.'
                : 'Hubo demasiados intentos. Pide a tu profe que restablezca tu PIN.' }}
        </p>
        <a href="{{ route('auth.alumnos') }}" class="link-volver">← Elegir otro alumno</a>
    </div>
</main>
@else
<main
    class="pin-wrap"
    id="kioscoPinApp"
    data-verificar="{{ route('auth.verificar-pin', $estudiante->id) }}"
    data-csrf="{{ csrf_token() }}"
    data-catalogo='@json(collect($figuras)->keyBy('icon'))'
>
    <div class="pin-izquierda">
        <div class="pin-avatar" style="--color-av: {{ $estudiante->color_avatar }};">
            <span class="pin-avatar__circulo">
                @include('auth._avatar-circulo')
            </span>
        </div>
        <p class="pin-nombre">{{ $estudiante->nombre }}</p>
        <p class="pin-instruccion">Toca tus 3 figuras</p>

        <div class="indicadores" id="indicadores" aria-live="polite">
            <div class="indicador" id="ind-0"></div>
            <div class="indicador" id="ind-1"></div>
            <div class="indicador" id="ind-2"></div>
        </div>

        <p class="pin-mensaje" id="pinMensaje" role="alert" aria-live="assertive"></p>

        <button type="button" class="btn-borrar" id="btnBorrarPin">← Borrar</button>
        <a href="{{ route('auth.alumnos') }}" class="link-volver">← Volver</a>
    </div>

    <div class="pin-figuras-grid" role="group" aria-label="Figuras del PIN">
        @foreach ($figuras as $figura)
        <button
            type="button"
            class="figura-btn"
            data-icon="{{ $figura['icon'] }}"
            data-color="{{ $figura['color'] }}"
            aria-label="{{ $figura['nombre'] }}"
        >
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
