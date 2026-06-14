@extends('layouts.panel')
@section('title', 'Nuevo Estudiante')
@section('content')
<div class="page-header"><h1>Nuevo Estudiante</h1></div>

<div style="max-width:500px;background:#0F172A;border-radius:12px;padding:32px">
<form method="POST" action="{{ route('panel.estudiantes.store') }}">
    @csrf
    <div class="form-group">
        <label>Nombre completo</label>
        <input type="text" name="nombre" class="form-control" value="{{ old('nombre') }}" required autofocus>
    </div>
    <div class="form-group">
        <label>Iniciales (2-3 letras)</label>
        <input type="text" name="iniciales" class="form-control" maxlength="3" value="{{ old('iniciales') }}" required placeholder="EJ: VA">
    </div>
    <div class="form-group">
        <label>Color de avatar (HEX)</label>
        <div style="display:flex;gap:10px;align-items:center">
            <input type="color" name="color_avatar" value="{{ old('color_avatar', '#0F6E56') }}" style="width:48px;height:40px;border:none;background:none;cursor:pointer;padding:0">
            <input type="text" id="color-text" class="form-control" value="{{ old('color_avatar', '#0F6E56') }}" style="flex:1" readonly>
            <input type="hidden" name="color_avatar" id="color-hidden" value="{{ old('color_avatar', '#0F6E56') }}">
        </div>
    </div>
    <div class="form-group">
        <label>Condición</label>
        <select name="condicion" class="form-control" required>
            @foreach($condiciones as $c)
                <option value="{{ $c }}" {{ old('condicion') === $c ? 'selected' : '' }}>{{ str_replace('_', ' ', $c) }}</option>
            @endforeach
        </select>
    </div>
    @if($errors->any())
        <div style="background:rgba(220,38,38,0.15);border:1px solid #DC2626;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#FCA5A5;font-size:0.85rem">
            @foreach($errors->all() as $error)<div>{{ $error }}</div>@endforeach
        </div>
    @endif
    <div style="display:flex;gap:12px;margin-top:8px">
        <button type="submit" class="btn btn-primary">Crear Estudiante</button>
        <a href="{{ route('panel.estudiantes') }}" class="btn btn-secondary">Cancelar</a>
    </div>
</form>
</div>
@push('scripts')
<script>
document.querySelector('input[type="color"]').addEventListener('input', function() {
    document.getElementById('color-text').value = this.value;
    document.getElementById('color-hidden').value = this.value;
});
</script>
@endpush
@endsection
