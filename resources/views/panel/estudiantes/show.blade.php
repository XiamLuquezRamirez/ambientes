@extends('layouts.panel')
@section('title', 'Ficha del estudiante')
@section('content')
    <div class="page-header">
        <div>
            <h1>{{ $estudiante->nombre }}</h1>
            <p style="color:#64748B">Ficha completa del estudiante</p>
        </div>
        <a href="{{ route('panel.principal') }}" class="btn btn-outline-secondary">Volver al inicio</a>
    </div>

    <div class="c-card c-card-body" style="display:grid;gap:16px;">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <div
                style="width:62px;height:62px;border-radius:50%;background:{{ $estudiante->color_avatar ?? '#2563EB' }};display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.15rem;font-weight:700;">
                {{ $estudiante->iniciales ?? strtoupper(substr($estudiante->nombre ?? 'E', 0, 2)) }}
            </div>
            <div>
                <h3 style="margin:0">{{ $estudiante->nombre }}</h3>
                <p style="margin:4px 0 0;color:#64748B">Condición: {{ ucfirst($estudiante->condicion ?? 'estandar') }}</p>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <div class="c-card c-card-body" style="padding:14px;">
                <strong>Estado</strong>
                <div style="margin-top:8px;color:#166534">{{ $estudiante->activo ? 'Activo' : 'Inactivo' }}</div>
            </div>
            <div class="c-card c-card-body" style="padding:14px;">
                <strong>PIN</strong>
                <div style="margin-top:8px;color:#1D4ED8">
                    {{ $estudiante->configuracionPin ? 'Configurado' : 'Sin configurar' }}</div>
            </div>
            <div class="c-card c-card-body" style="padding:14px;">
                <strong>PIAR</strong>
                <div style="margin-top:8px;color:#7C3AED">{{ $estudiante->piar ? 'Activo' : 'Sin diligenciar' }}</div>
            </div>
        </div>

        @if ($estudiante->matriculas->isNotEmpty())
            <div>
                <h5 style="margin-bottom:10px">Matrículas activas</h5>
                <ul style="margin:0;padding-left:18px;color:#334155;">
                    @foreach ($estudiante->matriculas as $matricula)
                        <li>{{ $matricula->grado->nombre ?? 'Sin grado' }} - {{ $matricula->grupo->nombre ?? 'Sin grupo' }}
                        </li>
                    @endforeach
                </ul>
            </div>
        @endif
    </div>
@endsection
