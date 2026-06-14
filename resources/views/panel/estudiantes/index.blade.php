@extends('layouts.panel')
@section('title', 'Estudiantes')
@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div>
        <h1>Estudiantes</h1>
        <p>{{ $ambiente->nombre }}</p>
    </div>
    <a href="{{ route('panel.estudiantes.create') }}" class="btn btn-primary">+ Nuevo</a>
</div>

<div class="table-container">
    <table>
        <thead>
            <tr><th>Avatar</th><th>Nombre</th><th>Condición</th><th>Estado</th></tr>
        </thead>
        <tbody>
        @forelse($estudiantes as $e)
            <tr>
                <td>
                    <div style="width:40px;height:40px;border-radius:50%;background:{{ $e->color_avatar }};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem">
                        {{ $e->iniciales }}
                    </div>
                </td>
                <td style="font-weight:600">{{ $e->nombre }}</td>
                <td><span class="badge badge-yellow">{{ $e->condicion }}</span></td>
                <td><span class="badge {{ $e->activo ? 'badge-green' : 'badge-red' }}">{{ $e->activo ? 'Activo' : 'Inactivo' }}</span></td>
            </tr>
        @empty
            <tr><td colspan="4" style="text-align:center;color:#64748B;padding:32px">Sin estudiantes en este ambiente</td></tr>
        @endforelse
        </tbody>
    </table>
</div>
@endsection
