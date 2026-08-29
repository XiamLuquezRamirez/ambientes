@extends('layouts.ambiente')

@section('content')
<main class="selector-wrap" data-kiosco-sesion="1">
    <div class="selector-vacio" role="status">
        <span class="selector-vacio__icono" aria-hidden="true">{{ $ambiente->icono }}</span>
        <p class="selector-vacio__titulo">{{ $ambiente->nombre }}</p>
        <p class="selector-vacio__texto">
            @if (! empty($motivoRecorrido))
                La clase de hoy aún no tiene un recorrido listo en el kiosco.
                Pide ayuda a tu docente para revisar la clase activa.
            @else
                Los módulos de este ambiente todavía se están preparando.
                ¡Pronto podrás explorarlos aquí!
            @endif
        </p>
        <a href="{{ route('ambiente.inicio') }}" class="btn-entrar" style="margin-top:8px;min-width:180px;min-height:56px;font-size:1.3rem;">
            Salir
        </a>
    </div>
</main>
@endsection
