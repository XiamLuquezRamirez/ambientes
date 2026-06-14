@extends('layouts.ambiente')

@section('content')
<main class="bienvenida-wrap">
    <div class="bienvenida-card">
        <div class="ambiente-logo">
            <span class="ambiente-icono">{{ $ambiente->icono }}</span>
            <h1 class="ambiente-nombre">{{ $ambiente->nombre }}</h1>
        </div>

        <a href="{{ route('auth.alumnos') }}" class="btn-jugar">
            <span class="btn-jugar__texto">¡Vamos a jugar!</span>
        </a>

        <a href="#" class="link-docente">Acceso docente</a>
    </div>
</main>
@endsection

@push('styles')
<style>
    .bienvenida-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(ellipse at 60% 40%, color-mix(in srgb, var(--color-ambiente) 25%, transparent), transparent 70%),
                    var(--fondo);
    }
    .bienvenida-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 48px;
    }
    .ambiente-logo {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }
    .ambiente-icono {
        font-size: 6rem;
        filter: drop-shadow(0 0 32px var(--color-ambiente));
        animation: flotar 3s ease-in-out infinite;
    }
    .ambiente-nombre {
        font-size: 3.5rem;
        color: var(--color-ambiente);
        text-shadow: 0 0 40px color-mix(in srgb, var(--color-ambiente) 60%, transparent);
        letter-spacing: 2px;
    }
    .btn-jugar {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 280px;
        min-height: 80px;
        background: var(--color-ambiente);
        border-radius: 40px;
        text-decoration: none;
        animation: pulso 2s ease-in-out infinite;
    }
    .btn-jugar__texto {
        font-family: 'Fredoka One', cursive;
        font-size: 2rem;
        color: #fff;
        letter-spacing: 1px;
    }
    .link-docente {
        font-size: 0.85rem;
        color: rgba(240,250,244,0.35);
        text-decoration: none;
    }
    .link-docente:hover { color: rgba(240,250,244,0.7); }

    @keyframes flotar {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-14px); }
    }
    @keyframes pulso {
        0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-ambiente) 60%, transparent); transform: scale(1); }
        50% { box-shadow: 0 0 0 20px transparent; transform: scale(1.04); }
    }
</style>
@endpush
