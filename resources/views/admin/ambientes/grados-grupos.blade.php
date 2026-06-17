@extends('layouts.admin')
@section('title', 'Grados y Grupos — ' . $ambiente->nombre)

@push('styles')
<style>
/* ── Header de sección ───────────────────────────────────────── */
.seccion-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 24px;
}
.amb-badge-header {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 99px;
    font-size: 0.88rem; font-weight: 600;
}

/* ── Bloques de grado ────────────────────────────────────────── */
.grado-bloque {
    background: #FFFFFF; border: 1px solid #E2E8F0;
    border-radius: 14px; margin-bottom: 16px; overflow: hidden;
}
.grado-bloque-header {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 20px;
    border-bottom: 1px solid #F1F5F9;
}
.grado-nombre { font-weight: 700; font-size: 0.95rem; color: #1E293B; }
.grado-edad   { font-size: 0.78rem; color: #64748B; margin-left: 4px; }
.grado-bloque-body { padding: 16px 20px; }
.grado-bloque-body.oculto { display: none; }

/* ── Toggle switch ───────────────────────────────────────────── */
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

/* ── Fila de grupo ───────────────────────────────────────────── */
.grupo-fila {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0; border-bottom: 1px solid #F8FAFC;
}
.grupo-fila:last-of-type { border-bottom: none; }
.grupo-nombre-txt { font-weight: 600; font-size: 0.9rem; color: #1E293B; }
.grupo-chip {
    background: #EFF6FF; color: #1D4ED8; border-radius: 6px;
    padding: 2px 8px; font-size: 0.75rem;
}
.grupo-acciones { margin-left: auto; display: flex; gap: 6px; }
.btn-grupo {
    border: 1px solid transparent; border-radius: 6px; padding: 4px 10px;
    font-size: 0.76rem; cursor: pointer; transition: all .15s;
    font-family: 'Nunito', sans-serif;
}
.btn-editar-grupo  { background: #EFF6FF; border-color: #BFDBFE; color: #1D4ED8; }
.btn-editar-grupo:hover  { background: #2563EB; color: #fff; }
.btn-eliminar-grupo { background: #FEF2F2; border-color: #FECACA; color: #DC2626; }
.btn-eliminar-grupo:hover { background: #DC2626; color: #fff; }

/* ── Link agregar grupo en grado ─────────────────────────────── */
.link-agregar-grupo {
    display: inline-block; margin-top: 12px;
    font-size: 0.82rem; color: #2563EB; cursor: pointer;
    text-decoration: none;
}
.link-agregar-grupo:hover { text-decoration: underline; }

/* ── Modal ───────────────────────────────────────────────────── */
#modalGrupo .modal-content {
    border: none; border-radius: 16px; overflow: hidden;
    box-shadow: 0 32px 80px rgba(37,99,235,.2);
}
#modalGrupo .modal-header {
    background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
    border-bottom: none; padding: 20px 24px;
}
#modalGrupo .modal-title { font-family: 'Fredoka One', cursive; color: #fff; font-size: 1.15rem; }
#modalGrupo .btn-close { filter: brightness(0) invert(1); opacity: .75; }
#modalGrupo .modal-body { padding: 24px; }
#modalGrupo .modal-footer { border-top: 1px solid #E2E8F0; padding: 16px 24px 20px; gap: 10px; }

.campo-error { color: #DC2626; font-size: 0.78rem; margin-top: 4px; }
</style>
@endpush

@section('content')
{{-- ── Header ───────────────────────────────────────────────── --}}
<div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;flex-wrap:wrap">
    <a href="{{ route('admin.ambientes') }}" class="btn btn-sm"
       style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0">
        <i class="fas fa-arrow-left"></i> Volver
    </a>
    <span class="amb-badge-header"
          style="background:{{ $ambiente->color_hex }}22;color:{{ $ambiente->color_hex }}">
        {{ $ambiente->icono }} {{ $ambiente->nombre }}
    </span>
    <span style="font-family:monospace;font-size:0.8rem;color:#64748B">
        {{ $ambiente->servidor_ip ?? 'Sin IP' }}
    </span>
    <button class="btn btn-primary btn-sm ms-auto" onclick="abrirModalGrupo()">
        <i class="fas fa-plus"></i> Agregar grupo
    </button>
</div>

<h2 style="font-size:1.1rem;font-weight:700;color:#1E293B;margin-bottom:16px">
    Grados habilitados y grupos
</h2>

{{-- ── Bloques por grado ────────────────────────────────────── --}}
@foreach($gradosConInfo as $item)
@php
    $grado      = $item['grado'];
    $habilitado = $item['habilitado'];
    $grupos     = $item['grupos'];
@endphp
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

    <div class="grado-bloque-body {{ $habilitado ? '' : 'oculto' }}" id="body-grado-{{ $grado->id }}">
        @if($grupos->isEmpty())
            <p style="color:#94A3B8;font-size:0.85rem;margin:0" id="sin-grupos-{{ $grado->id }}">
                Sin grupos creados aún.
            </p>
        @else
            @foreach($grupos as $grupo)
            <div class="grupo-fila" id="fila-grupo-{{ $grupo->id }}">
                <span class="grupo-nombre-txt">{{ $grado->nombre }} {{ $grupo->nombre }}</span>
                <span class="grupo-chip">Grupo {{ $grupo->nombre }}</span>
                <span style="font-size:0.78rem;color:#64748B">
                    Cupo: {{ $grupo->cupo_maximo }} · {{ $grupo->anio_lectivo }}
                </span>
                <div class="grupo-acciones">
                    <button class="btn-grupo btn-editar-grupo"
                            onclick="abrirModalGrupo({{ $grado->id }}, {{ $grupo->id }}, '{{ addslashes($grupo->nombre) }}', {{ $grupo->cupo_maximo }})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-grupo btn-eliminar-grupo"
                            onclick="eliminarGrupo({{ $ambiente->id }}, {{ $grupo->id }}, '{{ addslashes($grado->nombre . ' ' . $grupo->nombre) }}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
            @endforeach
        @endif

        <a class="link-agregar-grupo"
           onclick="abrirModalGrupo({{ $grado->id }}); return false;">
            + Agregar grupo en {{ $grado->nombre }}
        </a>
    </div>
</div>
@endforeach

{{-- ── Modal Nuevo/Editar Grupo ────────────────────────────── --}}
<div class="modal fade" id="modalGrupo" tabindex="-1"
     data-bs-backdrop="static" data-bs-keyboard="false"
     aria-labelledby="modalGrupoTitulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalGrupoTitulo">Nuevo Grupo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="formGrupo">
                    @csrf
                    <input type="hidden" id="grupoId" value="">
                    <div class="mb-3">
                        <label class="form-label">Grado</label>
                        <select id="grupoGradoId" name="grado_id" class="form-control">
                            @foreach($gradosConInfo as $item)
                                @if($item['habilitado'])
                                    <option value="{{ $item['grado']->id }}">{{ $item['grado']->nombre }}</option>
                                @endif
                            @endforeach
                        </select>
                        <div class="campo-error" id="err-grado_id"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Letra del grupo</label>
                        <select id="grupoNombre" name="nombre" class="form-control">
                            @foreach(['A','B','C','D','E'] as $letra)
                                <option value="{{ $letra }}">{{ $letra }}</option>
                            @endforeach
                        </select>
                        <div class="campo-error" id="err-nombre"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Año lectivo</label>
                        <input type="number" id="grupoAnio" name="anio_lectivo"
                               class="form-control" value="{{ date('Y') }}"
                               min="2024" max="2030">
                        <div class="campo-error" id="err-anio_lectivo"></div>
                    </div>
                    <div class="mb-0">
                        <label class="form-label">Cupo máximo</label>
                        <input type="number" id="grupoCupo" name="cupo_maximo"
                               class="form-control" value="25" min="1" max="60">
                        <div class="campo-error" id="err-cupo_maximo"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                <button type="button" id="btnGuardarGrupo" class="btn btn-primary"
                        onclick="guardarGrupo()">Crear Grupo</button>
            </div>
        </div>
    </div>
</div>

@endsection

@push('scripts')
<script>
const AMBIENTE_ID = {{ $ambiente->id }};
const AMBIENTE_COLOR = @json($ambiente->color_hex);
</script>
<script src="{{ asset('assets/js/admin/ambientes.js') }}"></script>
@endpush
