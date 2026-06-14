@extends('layouts.admin')
@section('title', 'Docentes')
@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div><h1>Docentes</h1></div>
    <a href="{{ route('admin.docentes.create') }}" class="btn btn-primary">+ Nuevo Docente</a>
</div>

<form method="GET" style="display:flex;gap:12px;margin-bottom:24px">
    <select name="ambiente_id" class="form-control" style="width:auto">
        <option value="">Todos los ambientes</option>
        @foreach($ambientes as $a)
            <option value="{{ $a->id }}" {{ request('ambiente_id') == $a->id ? 'selected' : '' }}>{{ $a->nombre }}</option>
        @endforeach
    </select>
    <select name="rol" class="form-control" style="width:auto">
        <option value="">Todos los roles</option>
        @foreach(['admin','docente_lider','docente_auxiliar'] as $r)
            <option value="{{ $r }}" {{ request('rol') === $r ? 'selected' : '' }}>{{ str_replace('_', ' ', $r) }}</option>
        @endforeach
    </select>
    <button type="submit" class="btn btn-primary btn-sm">Filtrar</button>
</form>

<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Nombre</th><th>Email</th><th>Rol</th><th>Ambiente</th><th>Estado</th>
            </tr>
        </thead>
        <tbody>
        @forelse($docentes as $d)
            <tr>
                <td>{{ $d->nombre }}</td>
                <td style="color:#64748B">{{ $d->email }}</td>
                <td><span class="badge badge-yellow">{{ str_replace('_', ' ', $d->rol) }}</span></td>
                <td>{{ $d->ambiente?->nombre ?? '—' }}</td>
                <td><span class="badge {{ $d->activo ? 'badge-green' : 'badge-red' }}">{{ $d->activo ? 'Activo' : 'Inactivo' }}</span></td>
            </tr>
        @empty
            <tr><td colspan="5" style="text-align:center;color:#64748B;padding:32px">Sin docentes registrados</td></tr>
        @endforelse
        </tbody>
    </table>
</div>
<div style="margin-top:16px">{{ $docentes->links() }}</div>
@endsection
