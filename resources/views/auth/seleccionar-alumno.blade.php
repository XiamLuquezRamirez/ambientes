@extends('layouts.ambiente')

@section('content')
<main class="selector-wrap">
    <h2 class="selector-titulo">¿Quién eres tú?</h2>

    <div class="avatares-grid">
        @foreach ($estudiantes as $estudiante)
        <button
            type="button"
            class="avatar-btn"
            onclick="window.location.href='{{ route('auth.pin', $estudiante->id) }}'"
            style="--color-av: {{ $estudiante->color_avatar }};"
        >
            <span class="avatar-circulo">{{ $estudiante->iniciales }}</span>
            <span class="avatar-nombre">{{ $estudiante->nombre }}</span>
        </button>
        @endforeach
    </div>

    <a href="{{ route('auth.bienvenida') }}" class="link-volver">← Volver</a>
</main>
@endsection

@push('styles')
<style>
    .selector-wrap {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 48px;
        background: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-ambiente) 20%, transparent), transparent 65%),
                    var(--fondo);
    }
    .selector-titulo { font-size: 2.5rem; color: var(--dorado); }
    .avatares-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 32px;
        justify-content: center;
        max-width: 900px;
    }
    .avatar-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        background: none;
        border: none;
        cursor: pointer;
        transition: transform 0.18s;
    }
    .avatar-btn:hover { transform: scale(1.08); }
    .avatar-btn:active { transform: scale(0.96); }
    .avatar-circulo {
        width: 110px;
        height: 110px;
        border-radius: 50%;
        background: var(--color-av);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Fredoka One', cursive;
        font-size: 2.2rem;
        color: #fff;
        box-shadow: 0 4px 24px color-mix(in srgb, var(--color-av) 50%, transparent);
    }
    .avatar-nombre { font-size: 1.1rem; font-weight: 700; color: var(--texto); }
    .link-volver { font-size: 0.9rem; color: rgba(240,250,244,0.45); text-decoration: none; }
    .link-volver:hover { color: var(--texto); }
</style>
@endpush
