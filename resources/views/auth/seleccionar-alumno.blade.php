@extends('layouts.ambiente')

@php
    $destino = $destino ?? \App\Services\SesionNinoService::DESTINO_RECORRIDO;
    $qsDestino = $destino === \App\Services\SesionNinoService::DESTINO_JUEGOS
        ? ['destino' => \App\Services\SesionNinoService::DESTINO_JUEGOS]
        : [];
@endphp

@push('styles')
    <link rel="stylesheet"
        href="{{ asset('assets/css/kiosco-selector-aula.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-selector-aula.css')) ?: time() }}">
@endpush

@section('content')
<main class="selector-aula">
    <div class="selector-aula__escena">
    <img class="selector-aula__cielo" src="{{ asset('assets/images/selector-aula/header.png') }}?v={{ @filemtime(public_path('assets/images/selector-aula/header.png')) }}" alt="">
    <header class="selector-aula__barra">
        <span class="selector-aula__hueco" aria-hidden="true"></span>
        <div class="selector-aula__centro">
            <h1 class="selector-aula__titulo">¿Quién eres tú?</h1>
            <button type="button" class="selector-aula__voz" id="aulaVoz" aria-label="Escuchar la instrucción">
                <img src="{{ asset('assets/images/selector-aula/sonido.png') }}" alt="">
            </button>
        </div>
        <a class="selector-aula__volver" href="{{ route('ambiente.inicio') }}" aria-label="Volver">
            <img src="{{ asset('assets/images/selector-aula/volver.png') }}" alt="">
        </a>
    </header>

    @if ($estudiantes->isEmpty())
        <div class="selector-aula__vacio" role="status">
            <p>No hay alumnos aquí</p>
            <p>Pide a tu profe que asigne estudiantes a este ambiente para el año {{ date('Y') }}.</p>
        </div>
    @else
        <button type="button" class="selector-aula__nav selector-aula__nav--atras" id="aulaAtras" aria-label="Ocho alumnos anteriores">
            <img src="{{ asset('assets/images/selector-aula/atras.png') }}" alt="">
        </button>
        <div class="selector-aula__lista" id="aulaPupitres">
            @foreach ($estudiantes as $estudiante)
                @php
                    $tienePin = $estudiante->tiene_pin;
                    $bloqueado = $estudiante->estado_pin === 'bloqueado';
                    $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
                    $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
                    $nombreVisible = trim($primerNombre . ' ' . $primerApellido);
                @endphp
                <button
                    type="button"
                    class="marco-nino"
                    data-nombre="{{ $nombreVisible }}"
                    data-pin="{{ route('auth.pin', array_merge(['estudianteId' => $estudiante->id], $qsDestino)) }}"
                    style="--marco: {{ $estudiante->color_avatar ?: '#ee6747' }};"
                    @if ($loop->index >= 8) hidden @endif
                    aria-label="{{ $nombreVisible }}{{ $tienePin ? '' : ' (sin PIN)' }}{{ $bloqueado ? ' (PIN bloqueado)' : '' }}"
                >
                    <span class="marco-nino__caja">
                    <span class="marco-nino__marco" aria-hidden="true"></span>
                    <span class="marco-nino__foto">
                        @if ($estudiante->avatar_url)
                            <img src="{{ $estudiante->avatar_url }}" alt="" class="kiosco-avatar-img">
                        @else
                            <span class="marco-nino__iniciales">{{ $estudiante->iniciales }}</span>
                        @endif
                    </span>
                    <span class="marco-nino__placa" aria-hidden="true"></span>
                    <span class="marco-nino__nombre">
                        <span>{{ $primerNombre }}</span>
                        @if ($primerApellido !== '')
                            <span>{{ $primerApellido }}</span>
                        @endif
                    </span>
                    @if (! $tienePin)
                        <span class="marco-nino__aviso" title="Sin PIN"><i class="fas fa-lock" aria-hidden="true"></i></span>
                    @elseif ($bloqueado)
                        <span class="marco-nino__aviso" title="PIN bloqueado"><i class="fas fa-ban" aria-hidden="true"></i></span>
                    @endif
                    </span>
                </button>
            @endforeach
        </div>

        <button type="button" class="selector-aula__nav selector-aula__nav--adelante" id="aulaAdelante" aria-label="Ocho alumnos siguientes">
            <img src="{{ asset('assets/images/selector-aula/adelante.png') }}" alt="">
        </button>
        <p class="selector-aula__pagina" id="aulaPagina" aria-live="polite"></p>
    @endif
    </div>

    <div class="aula-confirma" id="aulaConfirma" hidden>
        <div class="aula-confirma__velo" id="aulaConfirmaVelo"></div>
        <div class="aula-confirma__caja" role="dialog" aria-modal="true" aria-labelledby="aulaConfirmaNombre aulaConfirmaTitulo">
            <div class="aula-confirma__fondo" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1663 920" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <linearGradient id="aulaFondoBase" x1="0" y1="0" x2="1" y2="1">
                            <stop class="aula-fondo__b0" offset="0"/>
                            <stop class="aula-fondo__b1" offset="0.52"/>
                            <stop class="aula-fondo__b2" offset="1"/>
                        </linearGradient>
                        <linearGradient id="aulaFondoForma" x1="0" y1="0" x2="0.9" y2="1">
                            <stop class="aula-fondo__f0" offset="0" stop-opacity="0.55"/>
                            <stop class="aula-fondo__f1" offset="1" stop-opacity="0.32"/>
                        </linearGradient>
                        <linearGradient id="aulaFondoOla" x1="0" y1="0" x2="0" y2="1">
                            <stop class="aula-fondo__o0" offset="0" stop-opacity="0.42"/>
                            <stop class="aula-fondo__o1" offset="1" stop-opacity="0.62"/>
                        </linearGradient>
                    </defs>
                    <rect width="1663" height="920" fill="url(#aulaFondoBase)"/>
                    <path d="M0 155 C65 118 111 86 178 94 C247 102 290 150 287 195 C283 264 218 327 147 369 C96 399 46 415 0 424 Z" fill="url(#aulaFondoForma)"/>
                    <path d="M1552 0 L1663 0 L1663 300 C1607 303 1550 285 1503 250 C1451 211 1421 164 1424 128 C1427 78 1482 31 1552 0 Z" fill="url(#aulaFondoForma)"/>
                    <path d="M0 773 C117 713 231 690 354 696 C506 703 641 740 786 751 C922 761 1050 723 1179 703 C1347 676 1507 711 1663 765 L1663 920 L0 920 Z" fill="url(#aulaFondoOla)"/>
                </svg>
            </div>
            <span class="aula-confirma__rayos" aria-hidden="true">
                <i style="--x: -116px; --y: -20px; --w: 30px; --h: 13px; --r: 36deg"></i>
                <i style="--x: -128px; --y: 15px; --w: 50px; --h: 13px; --r: -2deg"></i>
                <i style="--x: -108px; --y: 49px; --w: 30px; --h: 13px; --r: -34deg"></i>
                <i style="--x: 116px; --y: -20px; --w: 30px; --h: 13px; --r: -36deg"></i>
                <i style="--x: 128px; --y: 15px; --w: 50px; --h: 13px; --r: 2deg"></i>
                <i style="--x: 108px; --y: 49px; --w: 30px; --h: 13px; --r: 34deg"></i>
            </span>
            <span class="aula-confirma__foto" id="aulaConfirmaFoto"></span>
            <p class="aula-confirma__nombre" id="aulaConfirmaNombre"></p>
            <div class="aula-confirma__pregunta">
                <span class="aula-confirma__linea">
                    <p class="aula-confirma__titulo" id="aulaConfirmaTitulo">¿Eres tú?</p>
                </span>
                <button type="button" class="selector-aula__voz" id="aulaConfirmaVoz" aria-label="Escuchar la pregunta">
                    <img src="{{ asset('assets/images/selector-aula/sonido.png') }}" alt="">
                </button>
            </div>
            <div class="aula-confirma__acciones">
                <button type="button" class="aula-confirma__btn" id="aulaConfirmaNo" aria-label="Cancelar">
                    <img src="{{ asset('assets/images/selector-aula/cancelar.png') }}?v={{ @filemtime(public_path('assets/images/selector-aula/cancelar.png')) }}" alt="">
                </button>
                <button type="button" class="aula-confirma__btn" id="aulaConfirmaOk" aria-label="Confirmar">
                    <img src="{{ asset('assets/images/selector-aula/confirmar.png') }}?v={{ @filemtime(public_path('assets/images/selector-aula/confirmar.png')) }}" alt="">
                </button>
            </div>
        </div>
    </div>
</main>
@endsection
