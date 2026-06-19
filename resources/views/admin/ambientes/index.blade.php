@extends('layouts.admin')
@section('title', 'Ambientes')

@push('styles')
<style>
/* ══════════════════════════════════════════════════════════
   Grid y tarjetas
   ══════════════════════════════════════════════════════════ */
.ambientes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
    gap: 20px;
    margin-top: 24px;
}
.ambiente-card {
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    overflow: visible;
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
    transition: box-shadow .2s;
    position: relative;
}
.ambiente-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.10); }
.card-franja { height: 6px; border-radius: 14px 14px 0 0; }

/* Cabecera */
.card-head {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 18px 18px 0;
}
.card-icono {
    width: 48px; height: 48px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; flex-shrink: 0;
}
.card-info { flex: 1; min-width: 0; }
.card-nombre { font-weight: 700; font-size: .98rem; color: #1E293B; }
.card-ip {
    font-family: monospace; font-size: .77rem; color: #64748B;
    margin-top: 3px; display: flex; align-items: center; gap: 6px;
}
.card-ip-texto { cursor: default; }

/* Punto de conexión */
.dot-conexion {
    display: inline-block; width: 9px; height: 9px;
    border-radius: 50%; background: #CBD5E1;
    flex-shrink: 0; transition: background .3s;
    cursor: default;
}
.dot-conexion.dot-online  { background: #22C55E; }
.dot-conexion.dot-offline { background: #EF4444; }
.dot-conexion.dot-check   { background: #F59E0B; animation: parpadeo .6s infinite alternate; }
@keyframes parpadeo { to { opacity: .35; } }

/* Botón tres puntos */
.btn-menu {
    background: none; border: none; color: #94A3B8;
    font-size: 1.25rem; cursor: pointer; padding: 2px 8px;
    border-radius: 6px; transition: background .15s; line-height: 1;
    flex-shrink: 0;
}
.btn-menu:hover { background: #F1F5F9; color: #475569; }

/* Dropdown */
.dropdown-menu-card {
    position: absolute; top: 52px; right: 12px;
    background: #FFFFFF; border: 1px solid #E2E8F0;
    border-radius: 10px; box-shadow: 0 8px 28px rgba(0,0,0,.13);
    z-index: 100; min-width: 220px; display: none; overflow: hidden;
}
.dropdown-menu-card.abierto { display: block; }
.dropdown-menu-card button {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 10px 16px;
    font-size: .85rem; color: #1E293B;
    background: none; border: none; text-align: left;
    cursor: pointer; transition: background .12s;
    font-family: 'Nunito', sans-serif;
}
.dropdown-menu-card button:hover { background: #F8FAFC; }
.dropdown-menu-card button i { width: 16px; text-align: center; color: #64748B; }
.dropdown-sep { height: 1px; background: #F1F5F9; margin: 4px 0; }

/* Badges estadísticas */
.card-stats {
    display: flex; flex-wrap: wrap; gap: 6px;
    padding: 12px 18px 8px;
}
.badge-stat {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 99px;
    font-size: .74rem; font-weight: 600;
}
.bs-azul   { background: #EFF6FF; color: #1D4ED8; }
.bs-verde  { background: #F0FDF4; color: #166534; }
.bs-morado { background: #F5F3FF; color: #5B21B6; }
.bs-slate  { background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; }

/* Info secundaria */
.card-meta {
    padding: 0 18px 10px;
    font-size: .78rem; color: #64748B;
    display: flex; flex-wrap: wrap; gap: 14px;
}
.card-meta span { display: flex; align-items: center; gap: 5px; }
.card-meta i { font-size: .72rem; }

/* Footer */
.card-footer-amb {
    padding: 12px 18px 16px;
    border-top: 1px solid #F1F5F9;
    background: #F8FAFC;
}
.grados-lista { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.grado-chip {
    background: #FFFFFF; border: 1px solid #E2E8F0;
    border-radius: 6px; padding: 2px 8px;
    font-size: .74rem; color: #475569;
}
.btn-gestionar {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 9px 16px;
    background: linear-gradient(135deg,#1E3A8A,#2563EB);
    color: #fff; border: none; border-radius: 8px;
    font-size: .84rem; font-weight: 600;
    cursor: pointer; text-decoration: none;
    transition: opacity .15s;
}
.btn-gestionar:hover { opacity: .88; color: #fff; }

/* ══════════════════════════════════════════════════════════
   Estilos compartidos de modales
   ══════════════════════════════════════════════════════════ */
.modal-header-azul {
    background: linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%);
    border-bottom: none; padding: 18px 22px;
}
.modal-header-azul .modal-title { font-family:'Fredoka One',cursive; color:#fff; font-size:1.1rem; }
.modal-header-azul .btn-close { filter: brightness(0) invert(1); opacity: .75; }
.campo-error { font-size: .78rem; color: #DC2626; margin-top: 3px; min-height: 16px; }

/* Módulos */
.modulo-fila {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid #F1F5F9;
}
.modulo-fila:last-child { border-bottom: none; }
.modulo-icono { font-size: 1.4rem; width: 36px; text-align: center; flex-shrink: 0; }
.modulo-nombre { flex: 1; font-weight: 600; font-size: .9rem; color: #1E293B; }
.modulo-toggles { display: flex; gap: 10px; flex-shrink: 0; }

.tog {
    display: flex; align-items: center; gap: 5px;
    cursor: pointer; font-size: .75rem; color: #64748B; user-select: none;
}
.tog input { display: none; }
.tog-track {
    width: 34px; height: 18px; border-radius: 9px;
    background: #CBD5E1; position: relative;
    transition: background .2s; flex-shrink: 0;
}
.tog-track::after {
    content: ''; position: absolute;
    top: 2px; left: 2px;
    width: 14px; height: 14px; border-radius: 50%;
    background: #fff; transition: transform .2s;
    box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.tog input:checked + .tog-track { background: #2563EB; }
.tog input:checked + .tog-track::after { transform: translateX(16px); }

/* Tabla docentes */
.tabla-docentes { width: 100%; border-collapse: collapse; font-size: .85rem; }
.tabla-docentes th {
    background: #F8FAFC; padding: 8px 12px;
    font-weight: 600; color: #475569; text-align: left;
    border-bottom: 2px solid #E2E8F0;
}
.tabla-docentes td {
    padding: 10px 12px; border-bottom: 1px solid #F1F5F9; color: #1E293B;
}
.tabla-docentes tr:last-child td { border-bottom: none; }
</style>
@endpush

@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div>
        <h1>Ambientes</h1>
        <p>{{ $ambientes->count() }} ambientes de aprendizaje en la red local</p>
    </div>
    <a href="{{ route('admin.matriculas.index') }}" class="btn btn-primary">
        <i class="fas fa-graduation-cap"></i> Matrículas
    </a>
</div>

<div class="ambientes-grid">
    @foreach($ambientes as $amb)
    <div class="ambiente-card"
         data-id="{{ $amb->id }}"
         data-ip="{{ $amb->servidor_ip ?? '' }}"
         data-cupo="{{ $amb->cupo_defecto }}">

        <div class="card-franja" style="background:{{ $amb->color_hex }}"></div>

        {{-- Cabecera --}}
        <div class="card-head">
            <div class="card-icono" style="background:{{ $amb->color_hex }}22">{{ $amb->icono }}</div>
            <div class="card-info">
                <div class="card-nombre">{{ $amb->nombre }}</div>
                <div class="card-ip">
                    <i class="fas fa-server" style="font-size:.7rem"></i>
                    <span class="card-ip-texto">{{ $amb->servidor_ip ?? 'Sin IP configurada' }}</span>
                    <span class="dot-conexion" id="dot-{{ $amb->id }}" title="Sin verificar"></span>
                </div>
            </div>
            <button class="btn-menu" onclick="abrirMenu({{ $amb->id }})" title="Opciones">⋯</button>
        </div>

        {{-- Menú desplegable --}}
        <div class="dropdown-menu-card" id="menu-{{ $amb->id }}">
            <button onclick="abrirModalIp({{ $amb->id }})">
                <i class="fas fa-network-wired"></i> Editar IP del servidor
            </button>
            <button onclick="abrirModalCupo({{ $amb->id }})">
                <i class="fas fa-users"></i> Configurar cupo por defecto
            </button>
            <div class="dropdown-sep"></div>
            <button onclick="abrirModalDocentes({{ $amb->id }}, '{{ addslashes($amb->nombre) }}')">
                <i class="fas fa-chalkboard-teacher"></i>
                Ver docentes
                <span style="margin-left:auto;color:#94A3B8;font-size:.78rem">{{ $amb->cargas_docente_count }}</span>
            </button>
            <button onclick="abrirModalModulos({{ $amb->id }}, '{{ addslashes($amb->nombre) }}')">
                <i class="fas fa-cubes"></i>
                Gestionar módulos
                <span style="margin-left:auto;color:#94A3B8;font-size:.78rem">{{ $amb->modulos_activos_count }}/{{ $amb->modulos_count }}</span>
            </button>
            <div class="dropdown-sep"></div>
            <button onclick="verificarConexion({{ $amb->id }})">
                <i class="fas fa-wifi"></i> Verificar conexión
            </button>
        </div>

        {{-- Estadísticas --}}
        <div class="card-stats">
            <span class="badge-stat bs-azul">
                <i class="fas fa-graduation-cap"></i> {{ $amb->grados_habilitados_count }} grado(s)
            </span>
            <span class="badge-stat bs-verde">
                <i class="fas fa-child"></i> {{ $amb->estudiantes_count }} estudiante(s)
            </span>
            <span class="badge-stat bs-morado">
                <i class="fas fa-chalkboard-teacher"></i> {{ $amb->cargas_docente_count }} docente(s)
            </span>
        </div>
        <div class="card-meta">
            <span><i class="fas fa-cube"></i> {{ $amb->modulos_activos_count }}/{{ $amb->modulos_count }} módulos activos</span>
            <span><i class="fas fa-users-cog"></i> Cupo defecto: <strong>{{ $amb->cupo_defecto }}</strong></span>
        </div>

        {{-- Footer --}}
        <div class="card-footer-amb">
            <div class="grados-lista">
                @forelse($amb->gradosHabilitados as $g)
                    <span class="grado-chip">{{ $g->nombre }}</span>
                @empty
                    <span style="color:#94A3B8;font-size:.75rem">Sin grados habilitados</span>
                @endforelse
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <a href="{{ route('admin.ambientes.grados', $amb) }}" class="btn-gestionar" style="font-size:.8rem">
                    <i class="fas fa-layer-group"></i> Grados
                </a>
                <a href="{{ route('admin.ambientes.asignaciones', $amb) }}" class="btn-gestionar" style="font-size:.8rem">
                    <i class="fas fa-child"></i> Asignaciones
                </a>
            </div>
        </div>

    </div>
    @endforeach
</div>

{{-- ══════════════════════════════════════════════════════════
     Modal: Editar IP del servidor
     ══════════════════════════════════════════════════════════ --}}
<div class="modal fade" id="modalIp" tabindex="-1" data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title"><i class="fas fa-network-wired me-2"></i>IP del servidor</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px">
                <label class="form-label" style="font-weight:600;color:#1E293B">Dirección IP</label>
                <input type="text" id="inputIp" class="form-control" placeholder="192.168.1.20" maxlength="15" autocomplete="off">
                <div class="campo-error" id="errIp"></div>
                <small class="text-muted d-block mt-1">Dejar vacío para quitar la IP.</small>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn btn-primary" id="btnGuardarIp" onclick="guardarIp()">Guardar</button>
            </div>
        </div>
    </div>
</div>

{{-- ══════════════════════════════════════════════════════════
     Modal: Cupo por defecto
     ══════════════════════════════════════════════════════════ --}}
<div class="modal fade" id="modalCupo" tabindex="-1" data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title"><i class="fas fa-users me-2"></i>Cupo por defecto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px">
                <label class="form-label" style="font-weight:600;color:#1E293B">Estudiantes por grupo</label>
                <input type="number" id="inputCupo" class="form-control" min="1" max="100" placeholder="25">
                <div class="campo-error" id="errCupo"></div>
                <small class="text-muted d-block mt-1">Se usa al crear grupos sin especificar cupo.</small>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn btn-primary" id="btnGuardarCupo" onclick="guardarCupo()">Guardar</button>
            </div>
        </div>
    </div>
</div>

{{-- ══════════════════════════════════════════════════════════
     Modal: Docentes del período
     ══════════════════════════════════════════════════════════ --}}
<div class="modal fade" id="modalDocentes" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title" id="modalDocentesTitulo"><i class="fas fa-chalkboard-teacher me-2"></i>Docentes del período</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px;max-height:420px;overflow-y:auto">
                <div id="listaDocentes">
                    <p class="text-center text-muted py-3">Cargando…</p>
                </div>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn btn-primary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        </div>
    </div>
</div>

{{-- ══════════════════════════════════════════════════════════
     Modal: Módulos de contenido
     ══════════════════════════════════════════════════════════ --}}
<div class="modal fade" id="modalModulos" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title" id="modalModulosTitulo"><i class="fas fa-cubes me-2"></i>Módulos de contenido</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px;max-height:460px;overflow-y:auto">
                <p style="font-size:.8rem;color:#64748B;margin-bottom:14px">
                    <strong>Activo:</strong> visible para docentes.
                    <strong>Visible:</strong> además visible para estudiantes.
                </p>
                <div id="listaModulos">
                    <p class="text-center text-muted py-3">Cargando…</p>
                </div>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn btn-primary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        </div>
    </div>
</div>

@endsection

@push('scripts')
<script src="{{ asset('assets/js/admin/ambientes.js') }}"></script>
@endpush
