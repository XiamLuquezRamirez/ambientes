@extends('layouts.panel')
@section('title', 'Monitor de Sesión')
@section('content')
    <div class="page-header">
        <h1>Monitor de Sesión
            <small>Fecha: {{ today()->format('d/m/Y') }}</small>

        </h1>

    </div>

@endsection
