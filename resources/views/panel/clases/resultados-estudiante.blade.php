@extends('layouts.panel')
@section('title', 'Resultados del estudiante')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/panel/resultados-clase.css') }}">
@endpush

@section('content')
    @php
        $nombre = $panelService->nombreEstudiante($estudiante, $estudianteLista);
        $urlVolver = route(
            'panel.clases.resultados',
            array_filter([
                'clase' => $clase->id,
                'experiencia' => $experienciaId,
                'vista' => 'estudiantes',
            ]),
        );
    @endphp

    <div class="page-header rn-res-header">
        <div>
            <h1>{{ $nombre }}</h1>
            <p class="rn-res-subtitle">
                {{ $clase->nombre }}
                · {{ $clase->fecha?->format('d/m/Y') ?? 'Sin fecha' }}
                · {{ $estadisticas['registros_total'] }} registro{{ $estadisticas['registros_total'] === 1 ? '' : 's' }}
            </p>
        </div>
        <a href="{{ $urlVolver }}" class="btn btn-outline-secondary">
            <i class="fa-solid fa-arrow-left"></i> Volver a la clase
        </a>
    </div>

    <div class="stats-grid rn-res-stats rn-res-stats--compact">
        <div class="stat-card">
            <div class="stat-icon stat-icon--green"><i class="fa-solid fa-circle-check"></i></div>
            <div class="stat-body">
                <h3>{{ $estadisticas['correctos'] }}</h3>
                <p>Correctas</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon stat-icon--yellow"><i class="fa-solid fa-circle-xmark"></i></div>
            <div class="stat-body">
                <h3>{{ $estadisticas['incorrectos'] }}</h3>
                <p>Incorrectas</p>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon stat-icon--red"><i class="fa-solid fa-paperclip"></i></div>
            <div class="stat-body">
                <h3>{{ $estadisticas['con_archivo'] }}</h3>
                <p>Archivos</p>
            </div>
        </div>
    </div>

    @if ($experiencias->count() > 1)
        <div class="ficha-card rn-res-filtros">
            <form method="get"
                action="{{ route('panel.clases.resultados.estudiante', ['clase' => $clase->id, 'estudiante' => $estudiante->id]) }}"
                class="row g-3 align-items-end">
                <div class="col-md-6">
                    <label for="filtroExperienciaEst" class="form-label">Experiencia</label>
                    <select name="experiencia" id="filtroExperienciaEst" class="form-select">
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
    @endif

    <div class="rn-res-detalle-lista">
        @forelse ($resultados as $resultado)
            @php
                $archivoUrl = $panelService->urlArchivo($resultado);
                $esImagen = $panelService->esArchivoImagen($resultado);
            @endphp
            <article class="rn-res-detalle-item">
                <div class="rn-res-detalle-item__meta">
                    <span class="rn-res-detalle-item__tipo">
                        {{ $panelService->etiquetaTipoBloque($resultado->tipo_bloque, $resultado->bloque->datos ?? []) }}
                    </span>
                    <span class="rn-res-detalle-item__exp">{{ $resultado->experiencia->nombre ?? '—' }}</span>
                    <span class="rn-res-detalle-item__fecha">
                        {{ $resultado->creado_en?->format('d/m/Y H:i') ?? '—' }}
                    </span>
                </div>
                <p class="rn-res-detalle-item__resumen">{{ $resumenes[$resultado->id] ?? '—' }}</p>
                <div class="rn-res-detalle-item__footer">
                    @if ($resultado->correcto === true)
                        <span class="badge badge-green">Correcto</span>
                    @elseif ($resultado->correcto === false)
                        <span class="badge badge-yellow">Incorrecto</span>
                    @else
                        <span class="badge badge-gray">Registrado</span>
                    @endif
                    @if ($archivoUrl)
                        @if ($esImagen)
                            <a href="{{ $archivoUrl }}" target="_blank" rel="noopener"
                                class="rn-res-detalle-item__media">
                                <img src="{{ $archivoUrl }}" alt="Archivo del estudiante">
                            </a>
                        @else
                            <a href="{{ $archivoUrl }}" target="_blank" rel="noopener"
                                class="btn btn-sm btn-outline-primary">
                                <i class="fa-solid fa-play"></i> Abrir archivo
                            </a>
                        @endif
                    @endif
                </div>
            </article>
        @empty
            <div class="ficha-card">
                <p class="ficha-empty" style="margin:0">Este estudiante aún no tiene registros en esta clase.</p>
            </div>
        @endforelse
    </div>
@endsection
