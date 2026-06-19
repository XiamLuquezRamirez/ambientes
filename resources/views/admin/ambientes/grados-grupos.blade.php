@extends('layouts.admin')
@section('title', 'Grados habilitados — ' . $ambiente->nombre)

@push('styles')
<style>
.grado-bloque {
    background: #FFFFFF; border: 1px solid #E2E8F0;
    border-radius: 14px; margin-bottom: 14px; overflow: hidden;
}
.grado-bloque-header {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 20px;
}
.grado-nombre { font-weight: 700; font-size: .95rem; color: #1E293B; }
.grado-edad   { font-size: .78rem; color: #64748B; margin-left: 4px; }

.toggle-sw {
    position: relative; width: 44px; height: 24px;
    margin-left: auto;
}
.toggle-sw input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
    position: absolute; cursor: pointer; inset: 0;
    background: #CBD5E1; border-radius: 99px;
    transition: background .2s;
}
.toggle-slider::before {
    content: ''; position: absolute;
    width: 18px; height: 18px; border-radius: 50%;
    background: #fff; left: 3px; top: 3px;
    transition: transform .2s;
}
.toggle-sw input:checked + .toggle-slider { background: #2563EB; }
.toggle-sw input:checked + .toggle-slider::before { transform: translateX(20px); }
</style>
@endpush

@section('content')
<div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;flex-wrap:wrap">
    <a href="{{ route('admin.ambientes') }}" class="btn btn-sm"
       style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0">
        <i class="fas fa-arrow-left"></i> Volver
    </a>
    <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;
                 border-radius:99px;font-size:.88rem;font-weight:600;
                 background:{{ $ambiente->color_hex }}22;color:{{ $ambiente->color_hex }}">
        {{ $ambiente->icono }} {{ $ambiente->nombre }}
    </span>

    <a href="{{ route('admin.ambientes.asignaciones', $ambiente) }}"
       class="btn btn-sm ms-auto" style="background:#F0FDF4;color:#166534;border:1px solid #BBF7D0">
        <i class="fas fa-child me-1"></i> Ver asignaciones
    </a>
</div>

<h2 style="font-size:1.05rem;font-weight:700;color:#1E293B;margin-bottom:4px">Grados habilitados</h2>
<p style="font-size:.82rem;color:#64748B;margin-bottom:20px">
    Activa los grados académicos que trabajan en este ambiente.
</p>

@foreach($gradosConInfo as $item)
@php $grado = $item['grado']; $habilitado = $item['habilitado']; @endphp
<div class="grado-bloque" id="bloque-grado-{{ $grado->id }}">
    <div class="grado-bloque-header">
        <div>
            <span class="grado-nombre">{{ $grado->nombre }}</span>
            <span class="grado-edad">({{ $grado->edad_anos }} años)</span>
        </div>
        <label class="toggle-sw" title="{{ $habilitado ? 'Deshabilitar' : 'Habilitar' }} grado">
            <input type="checkbox"
                   id="toggle-grado-{{ $grado->id }}"
                   {{ $habilitado ? 'checked' : '' }}
                   onchange="toggleGrado({{ $ambiente->id }}, {{ $grado->id }}, '{{ addslashes($grado->nombre) }}', this)">
            <span class="toggle-slider"></span>
        </label>
    </div>
</div>
@endforeach
@endsection

@push('scripts')
<script>
const URL_TOGGLE = "{{ route('admin.ambientes.grados.toggle', [$ambiente, ':grado']) }}";

async function toggleGrado(ambienteId, gradoId, nombre, input) {
    const url = URL_TOGGLE.replace(':grado', gradoId);
    try {
        const res  = await fetch(url, {
            method: 'PATCH',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        const data = await res.json();
        if (typeof data.habilitado === 'boolean') {
            input.checked = data.habilitado;
            mostrarToast('success', `${nombre} ${data.habilitado ? 'habilitado' : 'deshabilitado'}.`);
        } else {
            input.checked = !input.checked;
            mostrarToast('error', 'Error al actualizar.');
        }
    } catch {
        input.checked = !input.checked;
        mostrarToast('error', 'Error de conexión.');
    }
}
</script>
@endpush
