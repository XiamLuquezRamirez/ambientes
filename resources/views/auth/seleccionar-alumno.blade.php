@extends('layouts.ambiente')

@php
    $destino = $destino ?? \App\Services\SesionNinoService::DESTINO_RECORRIDO;
    $qsDestino = $destino === \App\Services\SesionNinoService::DESTINO_JUEGOS
        ? ['destino' => \App\Services\SesionNinoService::DESTINO_JUEGOS]
        : [];
    $marcos = ['#2f9fe8', '#e23d8c', '#f08a2a'];
@endphp

@push('styles')
    <link rel="stylesheet"
        href="{{ asset('assets/css/kiosco-selector-aula.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-selector-aula.css')) ?: time() }}">
@endpush

@section('content')
<main class="selector-aula">
    <div class="selector-aula__pizarra">
        <h1 class="selector-aula__titulo">¿Quién eres?</h1>
        <p class="selector-aula__subtitulo">
            <span>Busca tu foto y tócala</span>
            <button type="button" class="selector-aula__voz" id="aulaVoz" aria-label="Escuchar la instrucción">
                <i class="fas fa-volume-high" aria-hidden="true"></i>
            </button>
        </p>
    </div>

    @if ($estudiantes->isEmpty())
        <div class="selector-aula__vacio" role="status">
            <p>No hay alumnos aquí</p>
            <p>Pide a tu profe que asigne estudiantes a este ambiente para el año {{ date('Y') }}.</p>
        </div>
    @else
        <button type="button" class="selector-aula__nav selector-aula__nav--atras" id="aulaAtras" aria-label="Seis alumnos anteriores">
            <img src="{{ asset('assets/images/selector-aula/atras.png') }}" alt="">
        </button>

        <div class="selector-aula__pupitres" id="aulaPupitres">
            @foreach ($estudiantes as $estudiante)
                @php
                    $tienePin = $estudiante->tiene_pin;
                    $bloqueado = $estudiante->estado_pin === 'bloqueado';
                    $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
                    $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
                    $nombreVisible = trim($primerNombre . ' ' . $primerApellido);
                    $marco = $marcos[$loop->index % count($marcos)];
                @endphp
                <a
                    href="{{ route('auth.pin', array_merge(['estudianteId' => $estudiante->id], $qsDestino)) }}"
                    class="pupitre"
                    style="--marco: {{ $marco }};"
                    @if ($loop->index >= 6) hidden @endif
                    aria-label="{{ $nombreVisible }}{{ $tienePin ? '' : ' (sin PIN)' }}{{ $bloqueado ? ' (PIN bloqueado)' : '' }}"
                >
                    <span class="pupitre__foto">
                        @if ($estudiante->avatar_url)
                            <img src="{{ $estudiante->avatar_url }}" alt="" class="kiosco-avatar-img">
                        @else
                            <span class="pupitre__iniciales">{{ $estudiante->iniciales }}</span>
                        @endif
                        @if (! $tienePin)
                            <span class="pupitre__aviso" title="Sin PIN" aria-hidden="true"><i class="fas fa-lock"></i></span>
                        @elseif ($bloqueado)
                            <span class="pupitre__aviso" title="PIN bloqueado" aria-hidden="true"><i class="fas fa-ban"></i></span>
                        @endif
                    </span>
                    <img class="pupitre__mesa" src="{{ asset('assets/images/selector-aula/pupitre.png') }}" alt="">
                    <span class="pupitre__nombre">
                        <span>{{ $primerNombre }}</span>
                        @if ($primerApellido !== '')
                            <span>{{ $primerApellido }}</span>
                        @endif
                    </span>
                </a>
            @endforeach
        </div>

        <button type="button" class="selector-aula__nav selector-aula__nav--adelante" id="aulaAdelante" aria-label="Seis alumnos siguientes">
            <img src="{{ asset('assets/images/selector-aula/adelante.png') }}" alt="">
        </button>
        <p class="selector-aula__pagina" id="aulaPagina" aria-live="polite"></p>
    @endif
</main>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/kiosco-selector-aula.js') }}?v={{ @filemtime(public_path('assets/js/kiosco-selector-aula.js')) ?: time() }}"></script>
@endpush
