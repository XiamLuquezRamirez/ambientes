@extends('layouts.ambiente')

@section('content')
<main class="pin-wrap">
    <div class="pin-izquierda">
        <div class="pin-avatar" style="--color-av: {{ $estudiante->color_avatar }};">
            <span class="pin-avatar__circulo">{{ $estudiante->iniciales }}</span>
        </div>
        <p class="pin-nombre">{{ $estudiante->nombre }}</p>
        <p class="pin-instruccion">Toca tus 3 figuras</p>

        <div class="indicadores" id="indicadores">
            <div class="indicador" id="ind-0"></div>
            <div class="indicador" id="ind-1"></div>
            <div class="indicador" id="ind-2"></div>
        </div>

        <button type="button" class="btn-borrar" onclick="borrarUltima()">← Borrar</button>
    </div>

    <div class="pin-figuras-grid">
        @foreach (['circulo' => '⬤', 'estrella' => '★', 'corazon' => '♥', 'triangulo' => '▲', 'cuadrado' => '■', 'luna' => '☽', 'diamante' => '◆', 'rayo' => '⚡'] as $key => $simbolo)
        <button type="button" class="figura-btn" data-figura="{{ $key }}" onclick="seleccionarFigura('{{ $key }}')">
            {{ $simbolo }}
        </button>
        @endforeach
    </div>
</main>

<div id="overlay-exito" class="overlay" style="display:none;">
    <div class="overlay-contenido">
        <span class="overlay-icono">✓</span>
        <p>¡Muy bien!</p>
    </div>
</div>
@endsection

@push('styles')
<style>
    .pin-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 80px;
        padding: 40px;
        background: radial-gradient(ellipse at 30% 50%, color-mix(in srgb, var(--color-ambiente) 18%, transparent), transparent 60%),
                    var(--fondo);
    }
    .pin-izquierda { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .pin-avatar__circulo {
        display: flex; align-items: center; justify-content: center;
        width: 120px; height: 120px; border-radius: 50%;
        background: var(--color-av);
        font-family: 'Fredoka One', cursive; font-size: 2.6rem; color: #fff;
        box-shadow: 0 0 0 5px var(--dorado), 0 8px 32px color-mix(in srgb, var(--color-av) 50%, transparent);
    }
    .pin-nombre { font-size: 1.6rem; font-weight: 800; }
    .pin-instruccion { font-size: 1rem; color: rgba(240,250,244,0.6); }
    .indicadores { display: flex; gap: 16px; margin-top: 8px; }
    .indicador {
        width: 52px; height: 52px; border-radius: 50%;
        border: 3px solid rgba(240,250,244,0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.4rem; transition: all 0.25s;
    }
    .indicador.activo {
        border-color: var(--color-ambiente);
        background: color-mix(in srgb, var(--color-ambiente) 25%, transparent);
    }
    .btn-borrar {
        margin-top: 8px;
        background: rgba(240,250,244,0.08); border: 2px solid rgba(240,250,244,0.15);
        border-radius: 24px; color: var(--texto);
        font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700;
        padding: 12px 28px; cursor: pointer; min-height: 52px; transition: background 0.2s;
    }
    .btn-borrar:hover { background: rgba(240,250,244,0.16); }
    .pin-figuras-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .figura-btn {
        width: 90px; height: 90px; border-radius: 20px;
        border: 2px solid rgba(240,250,244,0.18);
        background: rgba(240,250,244,0.05);
        font-size: 2.2rem; cursor: pointer; color: var(--texto);
        transition: transform 0.15s, background 0.15s, border-color 0.15s;
        display: flex; align-items: center; justify-content: center;
    }
    .figura-btn:hover {
        background: color-mix(in srgb, var(--color-ambiente) 25%, transparent);
        border-color: var(--color-ambiente); transform: scale(1.1);
    }
    .figura-btn:active { transform: scale(0.93); }
    .overlay {
        position: fixed; inset: 0; background: rgba(6,12,10,0.85);
        display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .overlay-contenido { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .overlay-icono { font-size: 6rem; color: var(--color-ambiente); animation: aparecer 0.4s ease; }
    .overlay-contenido p { font-family: 'Fredoka One', cursive; font-size: 2.5rem; color: var(--dorado); }
    @keyframes aparecer { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-10px); }
        40% { transform: translateX(10px); }
        60% { transform: translateX(-8px); }
        80% { transform: translateX(8px); }
    }
    .shake { animation: shake 0.4s ease; }
</style>
@endpush

@push('scripts')
<script>
    const RUTA_VERIFICAR = "{{ route('auth.verificar-pin', $estudiante->id) }}";
    const CSRF = "{{ csrf_token() }}";
    const FIGURAS_SIMBOLOS = {
        circulo: '⬤', estrella: '★', corazon: '♥', triangulo: '▲',
        cuadrado: '■', luna: '☽', diamante: '◆', rayo: '⚡'
    };
</script>
<script src="{{ asset('assets/js/pin-figuras.js') }}"></script>
@endpush
