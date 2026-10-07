@extends('layouts.ambiente')

@php
    $destino = $destino ?? \App\Services\SesionNinoService::DESTINO_RECORRIDO;
    $urlAlumnos = route(
        'auth.alumnos',
        $destino === \App\Services\SesionNinoService::DESTINO_JUEGOS ? ['destino' => 'juegos'] : [],
    );
@endphp

@section('content')
    @if ($sinPin || $pinBloqueado)
        <main class="pin-wrap">
            <div class="pin-bloqueado" role="alert">
                <span class="pin-bloqueado__icono" aria-hidden="true">
                    <i class="fas {{ $sinPin ? 'fa-lock' : 'fa-ban' }}"></i>
                </span>
                @include('auth._ficha-aula')
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
                @include('auth._ficha-aula')
                <p class="pin-instruccion">Toca tus 3 figuras</p>

                <div class="indicadores" id="indicadores" aria-live="polite">
                    <div class="indicador" id="ind-0"></div>
                    <div class="indicador" id="ind-1"></div>
                    <div class="indicador" id="ind-2"></div>
                </div>

                <p class="pin-mensaje" id="pinMensaje" role="alert" aria-live="assertive"></p>

                <div class="pin-acciones">
                    <a href="{{ $urlAlumnos }}" class="kiosco-volver">
                        <img src="{{ asset('assets/images/selector-aula/volver.png') }}" alt="Volver">
                    </a>
                    <button type="button" class="kiosco-volver kiosco-borrar" id="btnBorrarPin">
                        <img src="{{ asset('assets/images/selector-aula/borrar.png') }}?v={{ @filemtime(public_path('assets/images/selector-aula/borrar.png')) }}" alt="Borrar">
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
    @endif
@endsection
