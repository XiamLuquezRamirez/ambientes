@extends('layouts.panel')
@section('title', 'Portafolio Estudiante')
@section('content')
    @php
        $tipos = [
            'foto' => 'Foto',
            'audio' => 'Audio',
            'emocion' => 'Emoción',
            'resultado' => 'Resultado',
        ];
    @endphp
    <div class="ficha-page">
        <div class="page-header ficha-header">
            <div>
                <h1>Portafolio</h1>
                <p class="ficha-subtitle">{{ $estudiante->nombre_completo }}</p>
            </div>
            <a href="{{ route('panel.estudiantes.show', $estudiante) }}" class="btn btn-outline-secondary">
                <i class="fa-solid fa-arrow-left"></i> Volver a la ficha
            </a>
        </div>

        <section class="ficha-card">
            @forelse ($estudiante->portafolios as $entrada)
                <div class="ficha-activity-row">
                    <span
                        class="ficha-activity-type">{{ $tipos[$entrada->tipo_registro] ?? ucfirst($entrada->tipo_registro) }}</span>
                    <span class="ficha-activity-date">
                        {{ $entrada->creado_en ? \Carbon\Carbon::parse($entrada->creado_en)->format('d/m/Y H:i') : '—' }}
                    </span>
                </div>
            @empty
                <p class="ficha-empty">Este estudiante aún no tiene entradas en el portafolio.</p>
            @endforelse
        </section>
    </div>
@endsection
