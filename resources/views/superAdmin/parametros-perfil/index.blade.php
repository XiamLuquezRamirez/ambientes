@extends('layouts.superAdmin')
@section('title', $tituloPagina ?? 'Parámetros por defecto')

@section('content')
    <div class="page-header" style="margin-bottom:16px">
        <h1>{{ $tituloPagina ?? 'Parámetros por defecto' }}</h1>
        <p>Valores por defecto globales que se copian a cada institución al activar un perfil</p>
    </div>

    @include('parametros-perfil._urls', ['modo' => $modo ?? 'defaults', 'prefijo' => 'superadmin'])
    @include('parametros-perfil._gestion', ['mostrarTopbar' => false])
@endsection
