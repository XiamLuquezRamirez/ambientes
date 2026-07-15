@extends('layouts.panel')
@section('title', 'Monitor de Sesión')
@section('content')
    <div class="page-header">
        <h1>Monitor de Sesión
            <small>Fecha: {{ today()->format('d/m/Y') }}</small>
        </h1>
        <a href="#" onclick="history.back()" class="btn btn-outline-secondary">
            <i class="fa-solid fa-arrow-left"></i> Volver
        </a>
    </div>

    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Estudiante</th>
                                <th>Asistencia</th>
                            </tr>
                        </thead>
                    </table>
                </div>
            </div>
        </div>
    </div>

@endsection
