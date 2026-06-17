@extends('layouts.admin')
@section('title', 'Ambientes')

@push('styles')
<style>
/* ── Grid de tarjetas ────────────────────────────────────────── */
.ambientes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 24px;
}
.ambiente-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
    transition: box-shadow .2s;
    position: relative;
}
.ambiente-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.10); }

/* Franja de color superior */
.card-franja {
    height: 6px;
}

/* Cabecera de tarjeta */
.card-head {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 20px 20px 0;
}
.card-icono {
    width: 48px; height: 48px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; flex-shrink: 0;
}
.card-info { flex: 1; }
.card-nombre { font-weight: 700; font-size: 1rem; color: #1E293B; }
.card-ip { font-family: monospace; font-size: 0.78rem; color: #64748B; margin-top: 2px; }

/* Botón de tres puntos */
.btn-menu {
    background: none; border: none;
    color: #94A3B8; font-size: 1.2rem;
    cursor: pointer; padding: 4px 8px;
    border-radius: 6px; transition: background .15s;
    line-height: 1;
}
.btn-menu:hover { background: #F1F5F9; color: #475569; }

/* Dropdown */
.dropdown-menu-card {
    position: absolute; top: 54px; right: 12px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,.12);
    z-index: 50;
    min-width: 200px;
    display: none;
    overflow: hidden;
}
.dropdown-menu-card.abierto { display: block; }
.dropdown-menu-card a,
.dropdown-menu-card button {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 10px 16px;
    font-size: 0.86rem; color: #1E293B;
    background: none; border: none;
    text-decoration: none; text-align: left;
    cursor: pointer; transition: background .12s;
    font-family: 'Nunito', sans-serif;
}
.dropdown-menu-card a:hover,
.dropdown-menu-card button:hover { background: #F8FAFC; }
.dropdown-item-danger { color: #DC2626 !important; }

/* Cuerpo de tarjeta */
.card-body-amb { padding: 16px 20px; }

/* Badges */
.badge-estado {
    display: inline-block; padding: 3px 10px;
    border-radius: 99px; font-size: 0.74rem; font-weight: 600;
}
.badge-activo   { background: #ECFDF5; color: #065F46; }
.badge-inactivo { background: #FEF2F2; color: #991B1B; }
.badge-grados   { background: #EFF6FF; color: #1D4ED8; font-size: 0.74rem; padding: 3px 10px; border-radius: 99px; }

/* Footer de tarjeta */
.card-footer-amb {
    padding: 12px 20px;
    border-top: 1px solid #F1F5F9;
    background: #F8FAFC;
    font-size: 0.8rem;
    color: #64748B;
}
.grados-lista { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.grado-chip {
    background: #FFFFFF; border: 1px solid #E2E8F0;
    border-radius: 6px; padding: 2px 8px;
    font-size: 0.75rem; color: #475569;
}

/* ── Estilos del Modal ───────────────────────────────────────── */
#modalAmbiente .modal-content {
    border: none; border-radius: 16px; overflow: hidden;
    box-shadow: 0 32px 80px rgba(37,99,235,.2);
}
#modalAmbiente .modal-header {
    background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
    border-bottom: none; padding: 20px 24px;
}
#modalAmbiente .modal-title { font-family: 'Fredoka One', cursive; color: #fff; font-size: 1.15rem; }
#modalAmbiente .btn-close { filter: brightness(0) invert(1); opacity: .75; }
#modalAmbiente .modal-body { padding: 24px; }
#modalAmbiente .modal-footer { border-top: 1px solid #E2E8F0; padding: 16px 24px 20px; gap: 10px; }
.preview-color {
    width: 36px; height: 36px; border-radius: 8px;
    border: 2px solid #E2E8F0; flex-shrink: 0;
}
</style>
@endpush

@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div>
        <h1>Ambientes</h1>
        <p>5 ambientes de aprendizaje en la red local</p>
    </div>
    <button class="btn btn-primary" onclick="abrirModalAmbiente('crear')">
        <i class="fas fa-plus"></i> Nuevo Ambiente
    </button>
</div>

{{-- ── Grid de tarjetas ─────────────────────────────────────── --}}
<div class="ambientes-grid" id="gridAmbientes">
    @foreach($ambientes as $amb)
    <div class="ambiente-card" id="card-{{ $amb->id }}">
        <div class="card-franja" style="background:{{ $amb->color_hex }}"></div>

        <div class="card-head">
            <div class="card-icono" style="background:{{ $amb->color_hex }}22">
                {{ $amb->icono }}
            </div>
            <div class="card-info">
                <div class="card-nombre">{{ $amb->nombre }}</div>
                <div class="card-ip">{{ $amb->servidor_ip ?? 'Sin IP' }}</div>
            </div>
            <button class="btn-menu" onclick="abrirMenu({{ $amb->id }})" title="Opciones">⋯</button>
        </div>

        {{-- Dropdown ─────────────────────────────────────────── --}}
        <div class="dropdown-menu-card" id="menu-{{ $amb->id }}">
            <a href="#" onclick="abrirModalAmbiente('editar', {{ $amb->id }}); return false;">
                <i class="fas fa-edit"></i> Editar ambiente
            </a>
            <a href="{{ route('admin.ambientes.grados-grupos', $amb) }}">
                <i class="fas fa-layer-group"></i> Gestionar grados y grupos
            </a>
            <button
                onclick="toggleActivo({{ $amb->id }}, '{{ addslashes($amb->nombre) }}', {{ $amb->activo ? 'true' : 'false' }})"
                class="{{ !$amb->activo ? 'dropdown-item-danger' : '' }}">
                <i class="fas fa-{{ $amb->activo ? 'ban' : 'check-circle' }}"></i>
                {{ $amb->activo ? 'Desactivar' : 'Activar' }}
            </button>
        </div>

        {{-- Cuerpo ───────────────────────────────────────────── --}}
        <div class="card-body-amb" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge-estado {{ $amb->activo ? 'badge-activo' : 'badge-inactivo' }}" id="badge-estado-{{ $amb->id }}">
                {{ $amb->activo ? 'Activo' : 'Inactivo' }}
            </span>
            <span class="badge-grados">
                {{ $amb->grados_habilitados_count }} grado(s) habilitado(s)
            </span>
        </div>

        {{-- Footer ───────────────────────────────────────────── --}}
        <div class="card-footer-amb">
            <div>{{ $amb->grupos_count }} grupo(s) activos este año</div>
            <div class="grados-lista">
                @foreach($amb->gradosHabilitados as $g)
                    <span class="grado-chip">{{ $g->nombre }}</span>
                @endforeach
                @if($amb->gradosHabilitados->isEmpty())
                    <span style="color:#94A3B8;font-size:0.75rem">Sin grados habilitados</span>
                @endif
            </div>
        </div>

        {{-- Data para JS ─────────────────────────────────────── --}}
        <script>
        window._ambientes = window._ambientes || {};
        window._ambientes[{{ $amb->id }}] = {
            id: {{ $amb->id }},
            nombre: @json($amb->nombre),
            slug: @json($amb->slug),
            color_hex: @json($amb->color_hex),
            icono: @json($amb->icono),
            servidor_ip: @json($amb->servidor_ip),
            activo: {{ $amb->activo ? 'true' : 'false' }},
        };
        </script>
    </div>
    @endforeach
</div>

{{-- ── Modal Crear/Editar Ambiente (Bootstrap 5) ──────────────── --}}
<div class="modal fade" id="modalAmbiente" tabindex="-1"
     data-bs-backdrop="static" data-bs-keyboard="false"
     aria-labelledby="modalAmbienteTitulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAmbienteTitulo">Nuevo Ambiente</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
                <form id="formAmbiente">
                    @csrf
                    <input type="hidden" id="ambienteId" name="_ambiente_id" value="">
                    <div class="mb-3">
                        <label class="form-label">Nombre</label>
                        <input type="text" id="ambNombre" name="nombre" class="form-control"
                               oninput="autoSlug()" autocomplete="off">
                        <div class="campo-error" id="err-nombre"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Slug <span style="color:#94A3B8;font-size:.78rem">(auto-generado)</span></label>
                        <input type="text" id="ambSlug" name="slug" class="form-control" autocomplete="off">
                        <div class="campo-error" id="err-slug"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Color</label>
                        <div style="display:flex;gap:10px;align-items:center">
                            <input type="text" id="ambColor" name="color_hex" class="form-control"
                                   placeholder="#0F6E56" maxlength="9"
                                   oninput="actualizarPreviewColor()" autocomplete="off">
                            <div class="preview-color" id="previewColor"></div>
                        </div>
                        <div class="campo-error" id="err-color_hex"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ícono <span style="color:#94A3B8;font-size:.78rem">(emoji)</span></label>
                        <input type="text" id="ambIcono" name="icono" class="form-control"
                               placeholder="🎵" autocomplete="off">
                        <div class="campo-error" id="err-icono"></div>
                    </div>
                    <div class="mb-0">
                        <label class="form-label">IP del servidor <span style="color:#94A3B8;font-size:.78rem">(opcional)</span></label>
                        <input type="text" id="ambIp" name="servidor_ip" class="form-control"
                               placeholder="192.168.1.20" autocomplete="off">
                        <div class="campo-error" id="err-servidor_ip"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn"
                        style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                <button type="button" id="btnGuardarAmbiente" class="btn btn-primary"
                        onclick="guardarAmbiente()">Crear Ambiente</button>
            </div>
        </div>
    </div>
</div>

@endsection

@push('scripts')
<script src="{{ asset('assets/js/admin/ambientes.js') }}"></script>
@endpush
