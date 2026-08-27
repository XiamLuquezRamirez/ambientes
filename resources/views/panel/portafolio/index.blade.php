@extends('layouts.panel')
@section('title', 'Portafolios')

@section('content')
    <div class="page-header">
        <p style="color:#64748B">Evidencias y registros del aprendizaje de cada estudiante</p>
    </div>

    <div class="c-card" style="padding:28px">
        <p class="mb-3" style="color:#475569;max-width:52ch">
            El portafolio de cada niño se consulta desde su ficha de estudiante.
        </p>
        <div class="d-flex flex-wrap gap-2">
            <a href="{{ route('panel.estudiantes') }}" class="btn btn-primary">
                <i class="fa-solid fa-child"></i> Ir a Estudiantes
            </a>
        </div>
    </div>
@endsection
