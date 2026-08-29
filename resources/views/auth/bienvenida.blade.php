@extends('layouts.ambiente')

@section('content')
<main class="bienvenida-wrap">
    <div class="bienvenida-card">
        <div class="ambiente-logo">
            <span class="ambiente-icono" aria-hidden="true">{{ $ambiente->icono }}</span>
            <h1 class="ambiente-nombre">{{ $ambiente->nombre }}</h1>
        </div>

        <a href="{{ route('auth.alumnos') }}" class="btn-jugar">
            <span class="btn-jugar__texto">¡Vamos a jugar!</span>
        </a>

        <a href="{{ route('docente.login') }}" class="link-docente">Acceso Administrativo/ Docente</a>
    </div>
</main>
@endsection
