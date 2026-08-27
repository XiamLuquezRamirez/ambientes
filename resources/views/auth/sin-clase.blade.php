@extends('layouts.ambiente')

@section('content')
@php
    $motivo = $motivo ?? \App\Services\ClaseKioscoService::MOTIVO_SIN_CLASE;
    $esConflicto = $motivo === \App\Services\ClaseKioscoService::MOTIVO_CONFLICTO;
    $esIncompleta = $motivo === \App\Services\ClaseKioscoService::MOTIVO_INCOMPLETA;
@endphp
<main class="selector-wrap" data-kiosco-sesion="0">
    <div class="selector-vacio" role="status">
        <span class="selector-vacio__icono" aria-hidden="true">{{ $ambiente->icono }}</span>
        @if ($esConflicto)
            <p class="selector-vacio__titulo">Hay un conflicto de clases</p>
            <p class="selector-vacio__texto">
                Hoy hay más de una clase activa en {{ $ambiente->nombre }}.
                Pide a tu profe que deje solo una clase activa para hoy.
            </p>
        @elseif ($esIncompleta)
            <p class="selector-vacio__titulo">La clase no está lista</p>
            <p class="selector-vacio__texto">
                La clase activa de hoy no tiene todo el recorrido configurado
                (módulo, eje, temática y experiencia). Pide ayuda a tu profe.
            </p>
        @else
            <p class="selector-vacio__titulo">Hoy no hay clase</p>
            <p class="selector-vacio__texto">
                En {{ $ambiente->nombre }} todavía no hay una clase activa para hoy.
                Pide ayuda a tu profe.
            </p>
        @endif
        <a href="{{ route('ambiente.inicio') }}" class="btn-entrar" style="margin-top:8px;min-width:180px;min-height:56px;font-size:1.3rem;">
            Volver
        </a>
    </div>
</main>
@endsection
