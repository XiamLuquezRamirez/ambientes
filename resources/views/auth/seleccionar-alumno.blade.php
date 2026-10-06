@extends('layouts.ambiente')

@php
    $destino = $destino ?? \App\Services\SesionNinoService::DESTINO_RECORRIDO;
    $qsDestino = $destino === \App\Services\SesionNinoService::DESTINO_JUEGOS
        ? ['destino' => \App\Services\SesionNinoService::DESTINO_JUEGOS]
        : [];
    $sillasAula = [
        '0494FC' => ['archivo' => 'silla_azul.png', 'marco' => '#0494FC', 'tinta' => '#0474C8'],
        '18BC54' => ['archivo' => 'silla_verde.png', 'marco' => '#18BC54', 'tinta' => '#0F8F3E'],
        'FCB400' => ['archivo' => 'silla_naranja.png', 'marco' => '#FCB400', 'tinta' => '#C47E00'],
        '4C007C' => ['archivo' => 'silla_morado.png', 'marco' => '#4C007C', 'tinta' => '#4C007C'],
        'F8349C' => ['archivo' => 'silla_rosa.png', 'marco' => '#F8349C', 'tinta' => '#E01484'],
        '1CC8FC' => ['archivo' => 'silla_cian.png', 'marco' => '#1CC8FC', 'tinta' => '#0094C4'],
    ];
@endphp

@push('styles')
    <link rel="stylesheet"
        href="{{ asset('assets/css/kiosco-selector-aula.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-selector-aula.css')) ?: time() }}">
@endpush

@section('content')
<main class="selector-aula">
    <header class="selector-aula__barra">
        <a class="selector-aula__volver" href="{{ route('ambiente.inicio') }}">
            <img src="{{ asset('assets/images/selector-aula/volver.png') }}" alt="Volver">
        </a>
        <div class="selector-aula__centro">
            <h1 class="selector-aula__titulo">¿Quién eres tú?</h1>
            <button type="button" class="selector-aula__voz" id="aulaVoz" aria-label="Escuchar la instrucción">
                <img src="{{ asset('assets/images/selector-aula/sonido.png') }}" alt="">
            </button>
        </div>
    </header>

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
                    $hexAvatar = strtoupper(ltrim((string) ($estudiante->color_avatar ?? ''), '#'));
                    if (isset($sillasAula[$hexAvatar])) {
                        $silla = $sillasAula[$hexAvatar];
                    } else {
                        $silla = $sillasAula['0494FC'];
                        $distancia = PHP_INT_MAX;
                        $rgbAvatar = sscanf(str_pad(substr($hexAvatar, 0, 6), 6, '0'), '%02x%02x%02x');
                        if (is_array($rgbAvatar) && count($rgbAvatar) === 3) {
                            foreach ($sillasAula as $hexSilla => $opcion) {
                                $rgbSilla = sscanf($hexSilla, '%02x%02x%02x');
                                $d = ($rgbAvatar[0] - $rgbSilla[0]) ** 2
                                    + ($rgbAvatar[1] - $rgbSilla[1]) ** 2
                                    + ($rgbAvatar[2] - $rgbSilla[2]) ** 2;
                                if ($d < $distancia) {
                                    $distancia = $d;
                                    $silla = $opcion;
                                }
                            }
                        }
                    }
                @endphp
                <a
                    href="{{ route('auth.pin', array_merge(['estudianteId' => $estudiante->id], $qsDestino)) }}"
                    class="pupitre"
                    style="--marco: {{ $silla['marco'] }}; --tinta: {{ $silla['tinta'] }};"
                    @if ($loop->index >= 6) hidden @endif
                    aria-label="{{ $nombreVisible }}{{ $tienePin ? '' : ' (sin PIN)' }}{{ $bloqueado ? ' (PIN bloqueado)' : '' }}"
                >
                    <img class="pupitre__mesa" src="{{ asset('assets/images/selector-aula/' . $silla['archivo']) }}" alt="">
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
