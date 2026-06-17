@extends('layouts.admin')
@section('title', 'Nuevo Docente')
@section('content')
    <div class="page-header">
        <h1>Nuevo Docente</h1>
    </div>

    <div style="max-width:600px;background:#1E293B;border-radius:12px;padding:32px">
        <form method="POST" action="{{ route('admin.docentes.store') }}">
            @csrf
            <div class="form-group">
                <label>Nombre completo</label>
                <input type="text" name="nombre" class="form-control" value="{{ old('nombre') }}" required autofocus>
            </div>
            <div class="form-group">
                <label>Correo electrónico</label>
                <input type="email" name="email" class="form-control" value="{{ old('email') }}" required>
            </div>
            <div class="form-group">
                <label>Contraseña (mínimo 8 caracteres)</label>
                <input type="password" name="password" class="form-control" required minlength="8">
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select name="rol" class="form-control" required>
                    @foreach (['admin' => 'Administrador', 'docente_lider' => 'Docente Líder', 'docente_auxiliar' => 'Docente Auxiliar'] as $val => $label)
                        <option value="{{ $val }}" {{ old('rol') === $val ? 'selected' : '' }}>{{ $label }}
                        </option>
                    @endforeach
                </select>
            </div>
            <div class="form-group">
                <label>Ambiente (no aplica si es Administrador)</label>
                <select name="ambiente_id" class="form-control">
                    <option value="">— Sin ambiente —</option>
                    @foreach ($ambientes as $a)
                        <option value="{{ $a->id }}" {{ old('ambiente_id') == $a->id ? 'selected' : '' }}>
                            {{ $a->icono }} {{ $a->nombre }}</option>
                    @endforeach
                </select>
            </div>
            @if ($errors->any())
                <div
                    style="background:#2D0F0F;border:1px solid #DC2626;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#FCA5A5;font-size:0.85rem">
                    @foreach ($errors->all() as $error)
                        <div>{{ $error }}</div>
                    @endforeach
                </div>
            @endif
            <div style="display:flex;gap:12px;margin-top:8px">
                <button type="submit" class="btn btn-primary">Crear Docente</button>
                <a href="{{ route('admin.docentes') }}" class="btn"
                    style="background:#243447;color:#94A3B8">Cancelar</a>
            </div>
        </form>
    </div>
@endsection
