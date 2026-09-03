@extends('layouts.panel')
@section('title', $tituloPagina ?? 'Parámetros de adaptación')

@section('content')
    <div class="page-header" style="margin-bottom:16px">
        <h1>{{ $tituloPagina ?? 'Parámetros de adaptación' }}</h1>
        <p>Parámetros de adaptación por perfil de aprendizaje para los estudiantes de su carga</p>
    </div>

    @include('parametros-perfil._urls', ['modo' => $modo ?? 'institucion', 'prefijo' => 'panel'])
    @include('parametros-perfil._gestion', ['mostrarTopbar' => false])
@endsection
