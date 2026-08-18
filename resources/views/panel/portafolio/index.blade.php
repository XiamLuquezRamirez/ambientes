@extends('layouts.panel')
@section('title', 'Portafolios')

@section('content')
    <div class="page-header">
        <h1>Portafolios</h1>
        <p style="color:#64748B">Evidencias y registros del aprendizaje de cada estudiante</p>
    </div>

    <div class="c-card" style="padding:28px">
        <p class="mb-3" style="color:#475569;max-width:52ch">
            El portafolio de cada niño se consulta desde su ficha de estudiante.
            Módulos, ejes y temáticas ahora viven en
            <strong>Catálogo</strong> (Módulos / Ejes / Temáticas).
        </p>
        <div class="d-flex flex-wrap gap-2">
            <a href="{{ route('panel.estudiantes') }}" class="btn btn-primary">
                <i class="fa-solid fa-child"></i> Ir a Estudiantes
            </a>
            <a href="{{ route('panel.catalogo.tematicas') }}" class="btn btn-outline-primary">
                <i class="fa-solid fa-layer-group"></i> Ver Temáticas
            </a>
        </div>
    </div>
@endsection
