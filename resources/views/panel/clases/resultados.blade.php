@extends('layouts.panel')
@section('title', 'Resultados de clase')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/panel/resultados-clase.css') }}">
@endpush

@section('content')
    @php
        $queryBase = array_filter([
            'experiencia' => $experienciaId,
            'vista' => $vista,
        ]);
        $urlPdf =
            route('panel.clases.resultados.pdf', $clase) . ($experienciaId ? '?experiencia=' . $experienciaId : '');
    @endphp

    <div class="page-header rn-res-header">
        <div>
            <p class="rn-res-subtitle">
                Resultados de la clase
                {{ $clase->nombre }}
                · {{ $clase->fecha?->format('d/m/Y') ?? 'Sin fecha' }}
                · {{ $carga->grado->nombre ?? '' }} {{ $carga->grupo->nombre ?? '' }}
            </p>
        </div>
        <div class="rn-res-header__actions">
            <a href="{{ $urlPdf }}" class="btn btn-outline-secondary" target="_blank" rel="noopener">
                <i class="fa-solid fa-file-pdf"></i> Exportar PDF
            </a>
            <a href="{{ route('panel.clases') }}" class="btn btn-outline-secondary">
                <i class="fa-solid fa-arrow-left"></i> Volver a clases
            </a>
        </div>
    </div>

    <div class="stats-grid rn-res-stats">
        <div class="stat-card">
            <div class="stat-icon stat-icon--blue"><i class="fa-solid fa-users"></i></div>
            <div class="stat-body">
                <h3>{{ $estadisticas['estudiantes_con_resultado'] }}/{{ $estadisticas['estudiantes_total'] }}</h3>
                <p>Participación ({{ $estadisticas['participacion_pct'] }}%)</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon stat-icon--green"><i class="fa-solid fa-circle-check"></i></div>
            <div class="stat-body">
                <h3>{{ $estadisticas['correctos'] }}</h3>
                <p>Respuestas correctas</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon stat-icon--yellow"><i class="fa-solid fa-circle-xmark"></i></div>
            <div class="stat-body">
                <h3>{{ $estadisticas['incorrectos'] }}</h3>
                <p>Respuestas incorrectas</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon stat-icon--red"><i class="fa-solid fa-paperclip"></i></div>
            <div class="stat-body">
                <h3>{{ $estadisticas['con_archivo'] }}</h3>
                <p>Con evidencia o dibujo</p>
            </div>
        </div>
    </div>

    <div class="ficha-card rn-res-filtros">
        <form method="get" action="{{ route('panel.clases.resultados', $clase) }}" class="row g-3 align-items-end">
            <input type="hidden" name="vista" value="{{ $vista }}">
            <div class="col-md-5">
                <label for="filtroExperiencia" class="form-label">Experiencia</label>
                <select name="experiencia" id="filtroExperiencia" class="form-select">
                    <option value="">Todas las experiencias</option>
                    @foreach ($experiencias as $experiencia)
                        <option value="{{ $experiencia->id }}" @selected($experienciaId === $experiencia->id)>
                            {{ $experiencia->nombre }}
                        </option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-auto">
                <button type="submit" class="btn btn-primary">Filtrar</button>
            </div>
        </form>
    </div>

    <div class="rn-res-tabs">
        <a href="{{ route('panel.clases.resultados', array_merge(['clase' => $clase->id], $queryBase, ['vista' => 'estudiantes'])) }}"
            class="rn-res-tab {{ $vista === 'estudiantes' ? 'is-active' : '' }}">
            Por estudiante
        </a>
        <a href="{{ route('panel.clases.resultados', array_merge(['clase' => $clase->id], $queryBase, ['vista' => 'tabla'])) }}"
            class="rn-res-tab {{ $vista === 'tabla' ? 'is-active' : '' }}">
            Tabla completa
        </a>
    </div>

    @if ($vista === 'estudiantes')
        @include('panel.clases._resultados-estudiantes', [
            'porEstudiante' => $porEstudiante,
            'clase' => $clase,
            'experienciaId' => $experienciaId,
            'resumenes' => $resumenes,
            'panelService' => $panelService,
        ])
    @else
        @include('panel.clases._resultados-tabla', [
            'resultados' => $resultados,
            'resumenes' => $resumenes,
            'panelService' => $panelService,
            'mostrarEstudiante' => true,
            'mensajeVacio' =>
                'Aún no hay resultados registrados para esta clase. Los niños deben completar bloques evaluativos en el kiosco.',
        ])
    @endif
@endsection
