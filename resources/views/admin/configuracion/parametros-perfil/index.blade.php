@extends('layouts.admin')
@section('title', $tituloPagina ?? 'Parámetros de adaptación')

@section('content')
    <div class="page-header" style="margin-bottom:16px">
        <h1>{{ $tituloPagina ?? 'Parámetros de adaptación' }}</h1>
        <p>Configure los 50 parámetros de adaptación por perfil de aprendizaje para su institución</p>
    </div>

    @include('parametros-perfil._urls', ['modo' => $modo ?? 'institucion', 'prefijo' => 'admin'])
    @include('parametros-perfil._gestion', ['mostrarTopbar' => false])
@endsection
