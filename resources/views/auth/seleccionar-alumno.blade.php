@extends('layouts.ambiente')

@php
    $destino = $destino ?? \App\Services\SesionNinoService::DESTINO_RECORRIDO;
    $qsDestino = $destino === \App\Services\SesionNinoService::DESTINO_JUEGOS
        ? ['destino' => \App\Services\SesionNinoService::DESTINO_JUEGOS]
        : [];
    $esPolimotor = ($ambiente->slug ?? '') === 'polimotor';
@endphp

@if ($esPolimotor)
    @push('styles')
        <link rel="stylesheet"
            href="{{ asset('assets/css/kiosco-selector-polimotor.css') }}?v={{ @filemtime(public_path('assets/css/kiosco-selector-polimotor.css')) ?: time() }}">
    @endpush
@endif

@section('content')
<main class="selector-wrap{{ $esPolimotor ? ' selector-wrap--polimotor' : '' }}">
    <h2 class="selector-titulo">¿Quién eres tú?</h2>

    @if ($estudiantes->isEmpty())
        <div class="selector-vacio" role="status">
            <span class="selector-vacio__icono" aria-hidden="true"><i class="fas fa-user-graduate"></i></span>
            <p class="selector-vacio__titulo">No hay alumnos aquí</p>
            <p class="selector-vacio__texto">
                Pide a tu profe que asigne estudiantes a este ambiente para el año {{ date('Y') }}.
            </p>
        </div>
    @else
        <div class="avatares-grid">
            @foreach ($estudiantes as $estudiante)
                @php
                    $tienePin = $estudiante->tiene_pin;
                    $bloqueado = $estudiante->estado_pin === 'bloqueado';
                    $primerNombre = explode(' ', trim((string) $estudiante->nombre))[0] ?? '';
                    $primerApellido = explode(' ', trim((string) ($estudiante->apellido ?? '')))[0] ?? '';
                    $nombreVisible = trim($primerNombre . ' ' . $primerApellido);
                @endphp
                <a
                    href="{{ route('auth.pin', array_merge(['estudianteId' => $estudiante->id], $qsDestino)) }}"
                    class="avatar-btn {{ $tienePin ? '' : 'avatar-btn--sin-pin' }}"
                    style="--color-av: {{ $estudiante->color_avatar }};"
                    aria-label="{{ $nombreVisible }}{{ $tienePin ? '' : ' (sin PIN)' }}{{ $bloqueado ? ' (PIN bloqueado)' : '' }}"
                >
                    @if ($esPolimotor)
                        <span class="avatar-card">
                            <span class="avatar-circulo">
                                <span class="avatar-circulo__contenido">
                                    @include('auth._avatar-circulo')
                                </span>
                            </span>
                            <span class="avatar-nombre">{{ $nombreVisible }}</span>
                            @if (! $tienePin)
                                <span class="avatar-meta">Sin PIN</span>
                            @elseif ($bloqueado)
                                <span class="avatar-meta">Bloqueado</span>
                            @endif
                        </span>
                        @if (! $tienePin)
                            <span class="avatar-badge" title="Sin PIN" aria-hidden="true">
                                <i class="fas fa-lock"></i>
                            </span>
                        @elseif ($bloqueado)
                            <span class="avatar-badge" title="PIN bloqueado" aria-hidden="true">
                                <i class="fas fa-ban"></i>
                            </span>
                        @endif
                    @else
                        <span class="avatar-circulo">
                            @include('auth._avatar-circulo')
                        </span>
                        @if (! $tienePin)
                            <span class="avatar-badge" title="Sin PIN" aria-hidden="true">
                                <i class="fas fa-lock"></i>
                            </span>
                            <span class="avatar-nombre">{{ $nombreVisible }}</span>
                            <span class="avatar-meta">Sin PIN</span>
                        @elseif ($bloqueado)
                            <span class="avatar-badge" title="PIN bloqueado" aria-hidden="true">
                                <i class="fas fa-ban"></i>
                            </span>
                            <span class="avatar-nombre">{{ $nombreVisible }}</span>
                            <span class="avatar-meta">Bloqueado</span>
                        @else
                            <span class="avatar-nombre">{{ $nombreVisible }}</span>
                        @endif
                    @endif
                </a>
            @endforeach
        </div>
    @endif

    @if ($esPolimotor)
        <a href="{{ route('ambiente.inicio') }}" class="selector-volver" aria-label="Volver">
            <span class="selector-volver__texto">
                <i class="fas fa-arrow-left" aria-hidden="true"></i>
                Volver
            </span>
        </a>
    @else
        <a href="{{ route('ambiente.inicio') }}" class="link-volver">← Volver</a>
    @endif
</main>
@endsection
