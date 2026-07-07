@extends('layouts.panel')
@section('title', 'Inicio')
@section('content')
    <div class="page-header">
        <h1>¡Bienvenida, {{ Auth::guard('docente')->user()->nombre }}!</h1>
        <p>Pendiente de implementación.</p>
    </div>
@endsection
