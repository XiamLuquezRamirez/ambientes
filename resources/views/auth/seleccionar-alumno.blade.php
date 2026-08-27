@extends('layouts.ambiente')

@section('content')
<main class="selector-wrap">
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
                @endphp
                <a
                    href="{{ route('auth.pin', $estudiante->id) }}"
                    class="avatar-btn {{ $tienePin ? '' : 'avatar-btn--sin-pin' }}"
                    style="--color-av: {{ $estudiante->color_avatar }};"
                    aria-label="{{ $estudiante->nombre }}{{ $tienePin ? '' : ' (sin PIN)' }}{{ $bloqueado ? ' (PIN bloqueado)' : '' }}"
                >
                    <span class="avatar-circulo">{{ $estudiante->iniciales }}</span>
                    @if (! $tienePin)
                        <span class="avatar-badge" title="Sin PIN" aria-hidden="true">
                            <i class="fas fa-lock"></i>
                        </span>
                        <span class="avatar-nombre">{{ $estudiante->nombre }}</span>
                        <span class="avatar-meta">Sin PIN</span>
                    @elseif ($bloqueado)
                        <span class="avatar-badge" title="PIN bloqueado" aria-hidden="true">
                            <i class="fas fa-ban"></i>
                        </span>
                        <span class="avatar-nombre">{{ $estudiante->nombre }}</span>
                        <span class="avatar-meta">Bloqueado</span>
                    @else
                        <span class="avatar-nombre">{{ $estudiante->nombre }}</span>
                    @endif
                </a>
            @endforeach
        </div>
    @endif

    <a href="{{ route('ambiente.inicio') }}" class="link-volver">← Volver</a>
</main>
@endsection
