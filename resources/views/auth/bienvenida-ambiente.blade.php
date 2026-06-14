@extends('layouts.ambiente')

@section('content')
<main class="bienambiente-wrap">
    <div class="bienambiente-card">
        <div class="estudiante-avatar" style="--color-av: {{ $estudiante->color_avatar }};">
            <span class="estudiante-avatar__circulo">{{ $estudiante->iniciales }}</span>
        </div>

        <h1 class="saludo">¡Hola, {{ $estudiante->nombre }}!</h1>
        <p class="ambiente-label">Ambiente {{ $ambiente->nombre }} te espera {{ $ambiente->icono }}</p>

        <div class="estrellas">
            <span class="estrella" style="--delay: 0s">⭐</span>
            <span class="estrella" style="--delay: 0.2s">⭐</span>
            <span class="estrella" style="--delay: 0.4s">⭐</span>
        </div>

        <a href="{{ route('ambiente.inicio') }}" class="btn-entrar">¡Entrar!</a>
    </div>
</main>
@endsection

@push('styles')
<style>
    .bienambiente-wrap {
        min-height: 100vh; display: flex; align-items: center; justify-content: center;
        background: radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--color-ambiente) 30%, transparent), transparent 70%),
                    var(--fondo);
    }
    .bienambiente-card { display: flex; flex-direction: column; align-items: center; gap: 28px; }
    .estudiante-avatar__circulo {
        display: flex; align-items: center; justify-content: center;
        width: 140px; height: 140px; border-radius: 50%;
        background: var(--color-av);
        font-family: 'Fredoka One', cursive; font-size: 3rem; color: #fff;
        box-shadow: 0 0 0 6px var(--dorado), 0 12px 40px color-mix(in srgb, var(--color-av) 60%, transparent);
        animation: aparecer 0.5s ease;
    }
    .saludo { font-size: 3rem; color: var(--dorado); text-align: center; animation: aparecer 0.5s ease 0.15s both; }
    .ambiente-label { font-size: 1.3rem; color: rgba(240,250,244,0.75); animation: aparecer 0.5s ease 0.3s both; }
    .estrellas { display: flex; gap: 24px; font-size: 2.5rem; }
    .estrella { opacity: 0; animation: aparecerEstrella 0.5s ease var(--delay) forwards; }
    .btn-entrar {
        margin-top: 16px;
        display: flex; align-items: center; justify-content: center;
        min-width: 220px; min-height: 72px;
        background: var(--color-ambiente); border-radius: 36px; text-decoration: none;
        font-family: 'Fredoka One', cursive; font-size: 1.8rem; color: #fff;
        box-shadow: 0 8px 32px color-mix(in srgb, var(--color-ambiente) 50%, transparent);
        animation: aparecer 0.5s ease 0.7s both; transition: transform 0.15s;
    }
    .btn-entrar:hover { transform: scale(1.05); }
    @keyframes aparecer { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes aparecerEstrella { from { opacity: 0; transform: scale(0) rotate(-30deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
</style>
@endpush
