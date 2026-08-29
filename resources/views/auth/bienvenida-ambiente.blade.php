@extends('layouts.ambiente')

@section('content')
<main class="bienambiente-wrap" data-kiosco-sesion="1" data-redirect-inicio="/recorrido">
    <div class="bienambiente-card">
        <div class="estudiante-avatar" style="--color-av: {{ $estudiante->color_avatar }};">
            <span class="estudiante-avatar__circulo">{{ $estudiante->iniciales }}</span>
        </div>

        <h1 class="saludo">¡Hola, {{ $estudiante->nombre }}!</h1>
        <p class="ambiente-label">Ambiente {{ $ambiente->nombre }} te espera {{ $ambiente->icono }}</p>

        <div class="estrellas" aria-hidden="true">
            <span class="estrella" style="--delay: 0s">⭐</span>
            <span class="estrella" style="--delay: 0.2s">⭐</span>
            <span class="estrella" style="--delay: 0.4s">⭐</span>
        </div>
    </div>
</main>
@endsection
