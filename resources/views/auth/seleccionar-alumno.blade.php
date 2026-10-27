@extends('layouts.ambiente')

@php
    $destino = $destino ?? \App\Services\SesionNinoService::DESTINO_RECORRIDO;
    $qsDestino = $destino === \App\Services\SesionNinoService::DESTINO_JUEGOS
        ? ['destino' => \App\Services\SesionNinoService::DESTINO_JUEGOS]
        : [];
    $slugAula = strtolower(trim((string) ($ambiente->slug ?? '')));
    if (! in_array($slugAula, config('ambiente.slugs'), true)) {
        $slugAula = '';
    }
    $assetAula = function (string $archivo) use ($slugAula) {
        if ($slugAula === '') {
            return '';
        }
        $rel = 'assets/images/selector-aula/'.$slugAula.'/'.$archivo;
        $abs = public_path($rel);
        if (! is_file($abs)) {
            return '';
        }

        return asset($rel).'?v='.@filemtime($abs);
    };
    $aulaFondo = $assetAula('fondo.png');
    $aulaHeader = $assetAula('header.png');
    $aulaMarco = $assetAula('marco_nino.svg');
    $aulaResplandor = $assetAula('marco_nino_resplandor.svg');
    $aulaHueco = $assetAula('marco_nino_hueco.svg');
    $aulaPunteado = $assetAula('marco_nino_punteado.svg');
    $aulaVars = array_filter([
        $aulaFondo !== '' ? "--aula-fondo: url('{$aulaFondo}')" : '',
        $aulaMarco !== '' ? "--aula-marco: url('{$aulaMarco}')" : '',
        $aulaResplandor !== '' ? "--aula-resplandor: url('{$aulaResplandor}')" : '',
        $aulaHueco !== '' ? "--aula-hueco: url('{$aulaHueco}')" : '',
        $aulaPunteado !== '' ? "--aula-punteado: url('{$aulaPunteado}')" : '',
    ]);
@endphp

@push('styles')
    <link rel="stylesheet"
        href="{{ asset('assets/css/kiosco-selector-aula.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-selector-aula.css')) ?: time() }}">
@endpush

@section('content')
<main class="selector-aula{{ $slugAula !== '' ? ' selector-aula--'.$slugAula : '' }}" @if ($aulaVars !== []) style="{{ implode('; ', $aulaVars) }}" @endif>
    <div class="selector-aula__escena">
    @if ($aulaHeader !== '')
        <img class="selector-aula__cielo" src="{{ $aulaHeader }}" alt="">
    @endif
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
                    <span class="marco-nino__resplandor" aria-hidden="true">
                        <span class="marco-nino__resplandor-forma"></span>
                    </span>
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
            <div class="aula-confirma__burbuja" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 805.97 506.97">
                    <path class="aula-confirma__sombra" d="M760.46,19.91H45.51A45.51,45.51,0,0,0,0,65.42V405.88a45.51,45.51,0,0,0,45.51,45.51h316.8l29,48.95a13.54,13.54,0,0,0,23.29,0l29-48.95h316.8A45.51,45.51,0,0,0,806,405.88V65.42A45.51,45.51,0,0,0,760.46,19.91Z"/>
                    <path class="aula-confirma__relleno" d="M760.46,0H45.51A45.5,45.5,0,0,0,0,45.51V386a45.5,45.5,0,0,0,45.51,45.5h316.8l29,48.95a13.53,13.53,0,0,0,23.29,0l29-48.95h316.8A45.5,45.5,0,0,0,806,386V45.51A45.5,45.5,0,0,0,760.46,0Z"/>
                    <path class="aula-confirma__trazo" d="M786.06,132.76V386a25.62,25.62,0,0,1-25.6,25.59H432.32L403,461l-29.33-49.47H330.36"/>
                    <line class="aula-confirma__trazo" x1="786.06" y1="65.27" x2="786.06" y2="110.64"/>
                    <path class="aula-confirma__trazo" d="M195.39,411.56H45.5A25.62,25.62,0,0,1,19.91,386V45.51A25.62,25.62,0,0,1,45.5,19.91h715a25.62,25.62,0,0,1,25.6,25.6"/>
                    <line class="aula-confirma__trazo" x1="310.45" y1="411.56" x2="267.3" y2="411.56"/>
                    <line class="aula-confirma__trazo" x1="245.72" y1="411.56" x2="217.51" y2="411.56"/>
                </svg>
            </div>
            <button type="button" class="selector-aula__voz aula-confirma__voz" id="aulaConfirmaVoz" aria-label="Escuchar la pregunta">
                <img src="{{ asset('assets/images/selector-aula/sonido.png') }}" alt="">
            </button>
            <div class="aula-confirma__cuerpo">
                <div class="aula-confirma__ficha">
                    @if ($slugAula === 'multisensorial')
                        <span class="aula-confirma__flor-sombra" aria-hidden="true"></span>
                    @endif
                    @if ($aulaMarco !== '')
                        <img class="aula-confirma__marco" src="{{ $aulaMarco }}" alt="">
                    @endif
                    <span class="aula-confirma__foto" id="aulaConfirmaFoto"></span>
                    <p class="aula-confirma__nombre" id="aulaConfirmaNombre"></p>
                </div>
                <div class="aula-confirma__lado">
                    <p class="aula-confirma__titulo" id="aulaConfirmaTitulo">¿Eres tú?</p>
                    <div class="aula-confirma__acciones">
                        <button type="button" class="aula-confirma__btn" id="aulaConfirmaOk" aria-label="Confirmar">
                            <img src="{{ asset('assets/images/selector-aula/confirmar.png') }}?v={{ @filemtime(public_path('assets/images/selector-aula/confirmar.png')) }}" alt="">
                        </button>
                        <button type="button" class="aula-confirma__btn" id="aulaConfirmaNo" aria-label="Cancelar">
                            <img src="{{ asset('assets/images/selector-aula/cancelar.png') }}?v={{ @filemtime(public_path('assets/images/selector-aula/cancelar.png')) }}" alt="">
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>
@endsection
