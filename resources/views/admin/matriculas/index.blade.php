@extends('layouts.admin')
@section('title', 'Matrículas')

@push('styles')
<style>
/* ── Lista de estudiantes ──────────────────────────── */
.est-fila {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; cursor: pointer;
    border-bottom: 1px solid #F1F5F9;
    transition: background .1s; user-select: none;
}
.est-fila:last-child { border-bottom: none; }
.est-fila:hover  { background: #F8FAFC; }
.est-fila.marcado{ background: #EFF6FF; }
.est-check { width: 16px; height: 16px; accent-color: #2563EB; flex-shrink: 0; cursor: pointer; }
.avatar-est {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: .82rem; flex-shrink: 0;
}
.est-nombre { font-weight: 600; color: #1E293B; font-size: .88rem; }
.est-meta   { font-size: .75rem; color: #64748B; }
.est-badge  {
    margin-left: auto; font-size: .72rem; padding: 2px 8px;
    border-radius: 99px; flex-shrink: 0;
}
.est-badge.libre  { background: #F0FDF4; color: #166534; }
.est-badge.ocupado{ background: #FEF3C7; color: #92400E; }

/* ── Pasos ─────────────────────────────────────────── */
.pasos-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.paso-dot {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: .78rem; font-weight: 700;
    background: #E2E8F0; color: #94A3B8; transition: all .2s; flex-shrink: 0;
}
.paso-dot.activo { background: #2563EB; color: #fff; }
.paso-dot.listo  { background: #22C55E; color: #fff; }
.paso-linea  { flex: 1; height: 2px; background: #E2E8F0; }
.paso-linea.activa { background: #2563EB; }

/* Modal header */
.modal-header-azul {
    background: linear-gradient(135deg,#1E3A8A,#2563EB);
    border-bottom: none; padding: 18px 22px;
}
.modal-header-azul .modal-title { font-family:'Fredoka One',cursive; color:#fff; font-size:1.1rem; }
.modal-header-azul .btn-close { filter:brightness(0) invert(1); opacity:.75; }
.campo-error { font-size:.78rem; color:#DC2626; margin-top:3px; min-height:16px; }
</style>
@endpush

@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div>
        <h1>Matrículas</h1>
        <p>Asignación académica de estudiantes · Año {{ date('Y') }}</p>
    </div>
    <div style="display:flex;gap:10px">
        <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                onclick="abrirEstadoGrupo()">
            <i class="fas fa-users"></i> Promover / Graduar grupo
        </button>
        <button class="btn btn-primary" onclick="abrirPaso1()">
            <i class="fas fa-plus"></i> Matricular estudiantes
        </button>
    </div>
</div>

{{-- Filtros --}}
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    <input type="text" id="filtroBuscar" class="form-control" style="max-width:260px"
           placeholder="Buscar estudiante…">
    <select id="filtroGrupo" class="form-select" style="max-width:220px">
        <option value="">Todos los grupos</option>
        @foreach($grupos as $g)
            <option value="{{ $g->id }}">{{ $g->grado?->nombre }} — Grupo {{ $g->nombre }}</option>
        @endforeach
    </select>
    <select id="filtroEstado" class="form-select" style="max-width:180px">
        <option value="">Todos los estados</option>
        <option value="activo">Activo</option>
        <option value="promovido">Promovido</option>
        <option value="graduado">Graduado</option>
        <option value="retirado">Retirado</option>
    </select>
</div>

{{-- Tabla AJAX --}}
<div id="contenedorTabla">
    @include('admin.matriculas._tabla')
</div>

{{-- ══════════════════════════════════════════════════════
     Modal: Matricular (2 pasos)
     ══════════════════════════════════════════════════════ --}}
<div class="modal fade" id="modalMatricular" tabindex="-1"
     data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title">
                    <i class="fas fa-graduation-cap me-2"></i>Matricular estudiantes
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:24px">

                {{-- Indicador de pasos --}}
                <div class="pasos-indicator">
                    <div class="paso-dot activo" id="dotPaso1">1</div>
                    <div class="paso-linea" id="lineaPasos"></div>
                    <div class="paso-dot" id="dotPaso2">2</div>
                    <span style="font-size:.8rem;color:#64748B;margin-left:4px" id="labelPaso">
                        Seleccionar estudiantes
                    </span>
                </div>

                {{-- PASO 1: lista con checkboxes --}}
                <div id="paso1">
                    <div style="display:flex;gap:10px;margin-bottom:12px">
                        <input type="text" id="inputFiltroEst" class="form-control"
                               placeholder="Filtrar por nombre…"
                               oninput="filtrarListaEstudiantes(this.value)">
                        <button type="button" class="btn btn-sm"
                                style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;white-space:nowrap"
                                id="btnToggleTodos" onclick="toggleTodosEstudiantes()">
                            Seleccionar todos
                        </button>
                    </div>
                    <div id="listaEstudiantes"
                         style="border:1px solid #E2E8F0;border-radius:10px;
                                max-height:340px;overflow-y:auto">
                        <p class="text-center text-muted py-4">
                            <i class="fas fa-spinner fa-spin me-2"></i>Cargando…
                        </p>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
                        <span id="contadorSeleccionados" style="font-size:.83rem;color:#64748B">
                            0 estudiantes seleccionados
                        </span>
                        <span id="sinEstudiantesMsg" style="font-size:.78rem;color:#DC2626;display:none">
                            Selecciona al menos un estudiante
                        </span>
                    </div>
                </div>

                {{-- PASO 2: Grado y grupo --}}
                <div id="paso2" style="display:none">
                    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
                        <div style="flex:1;min-width:150px">
                            <label class="form-label" style="font-weight:600">Fecha de ingreso</label>
                            <input type="date" id="inputFechaIngreso" class="form-control"
                                   value="{{ date('Y-m-d') }}">
                        </div>
                        <div style="flex:1;min-width:120px">
                            <label class="form-label" style="font-weight:600">Año lectivo</label>
                            <input type="number" id="inputAnioLectivo" class="form-control"
                                   value="{{ date('Y') }}" min="2024" max="2030">
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label" style="font-weight:600">Grado</label>
                        <select id="selGrado" class="form-select" onchange="cargarGruposDeGrado()">
                            <option value="">— Seleccionar grado —</option>
                        </select>
                        <div class="campo-error" id="errGrado"></div>
                    </div>

                    <div class="mb-3" id="grupoWrap" style="display:none">
                        <label class="form-label" style="font-weight:600">Grupo</label>
                        <select id="selGrupo" class="form-select" onchange="actualizarResumenMatricula()">
                            <option value="">— Seleccionar grupo —</option>
                        </select>
                        <div class="campo-error" id="errGrupo"></div>
                    </div>

                    <div id="resumenMatricula"
                         style="margin-top:10px;padding:10px 14px;background:#F0FDF4;
                                border:1px solid #BBF7D0;border-radius:8px;
                                font-size:.82rem;color:#166534;display:none">
                    </div>
                </div>

            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 24px;gap:10px">
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;display:none"
                        id="btnVolverPaso1" onclick="irPaso1()">
                    <i class="fas fa-arrow-left me-1"></i>Volver
                </button>
                <button class="btn btn-primary" id="btnSiguientePaso1" onclick="irPaso2()" disabled>
                    Siguiente <i class="fas fa-arrow-right ms-1"></i>
                </button>
                <button class="btn btn-primary" id="btnConfirmarMatricula"
                        style="display:none" onclick="confirmarMatricula()" disabled>
                    <i class="fas fa-graduation-cap me-1"></i>
                    <span id="txtBtnMatricular">Matricular</span>
                </button>
            </div>
        </div>
    </div>
</div>

{{-- Modal: Promover / Graduar por grupo --}}
<div class="modal fade" id="modalEstadoGrupo" tabindex="-1"
     data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title">
                    <i class="fas fa-users me-2"></i>Cambio de estado por grupo
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:24px">
                <div class="mb-3">
                    <label class="form-label" style="font-weight:600">Año lectivo</label>
                    <select id="egAnio" class="form-select" onchange="cargarGruposEstado()">
                        @foreach(range(date('Y')-1, date('Y')+1) as $y)
                            <option value="{{ $y }}" {{ $y == date('Y') ? 'selected' : '' }}>{{ $y }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="mb-3">
                    <label class="form-label" style="font-weight:600">Grupo</label>
                    <select id="egGrupo" class="form-select" onchange="actualizarPreviewEstadoGrupo()">
                        <option value="">Cargando grupos…</option>
                    </select>
                </div>
                <div class="mb-3" id="egEstadoWrap">
                    <label class="form-label" style="font-weight:600">Nuevo estado</label>
                    <select id="egEstado" class="form-select" onchange="actualizarPreviewEstadoGrupo()">
                        <option value="promovido">Promovido</option>
                        <option value="graduado">Graduado</option>
                        <option value="retirado">Retirado</option>
                    </select>
                </div>
                <div id="egPreview" style="display:none;padding:12px 14px;border-radius:8px;font-size:.84rem"></div>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                <button class="btn btn-primary" id="btnAplicarEstadoGrupo"
                        onclick="aplicarEstadoGrupo()" disabled>
                    Aplicar cambio
                </button>
            </div>
        </div>
    </div>
</div>

{{-- Modal: Editar grupo --}}
<div class="modal fade" id="modalEditar" tabindex="-1" data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title"><i class="fas fa-pencil me-2"></i>Cambiar grupo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px">
                <p id="contextoEditar" style="font-size:.84rem;color:#64748B;margin-bottom:14px"></p>
                <label class="form-label" style="font-weight:600">Grupo</label>
                <select id="selectGrupoEditar" class="form-select"></select>
                <div class="campo-error" id="errGrupoEditar"></div>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                <button class="btn btn-primary" id="btnGuardarEditar" onclick="guardarEdicion()">Guardar</button>
            </div>
        </div>
    </div>
</div>

{{-- Modal: Cambiar estado individual --}}
<div class="modal fade" id="modalEstado" tabindex="-1" data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content" style="border:none;border-radius:16px;overflow:hidden">
            <div class="modal-header modal-header-azul">
                <h5 class="modal-title"><i class="fas fa-arrow-right-arrow-left me-2"></i>Cambiar estado</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" style="padding:22px">
                <label class="form-label" style="font-weight:600">Nuevo estado</label>
                <select id="selectEstado" class="form-select">
                    <option value="activo">Activo</option>
                    <option value="promovido">Promovido</option>
                    <option value="graduado">Graduado</option>
                    <option value="retirado">Retirado</option>
                </select>
            </div>
            <div class="modal-footer" style="border-top:1px solid #E2E8F0;padding:14px 22px">
                <button class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                        data-bs-dismiss="modal">Cancelar</button>
                <button class="btn btn-primary" id="btnGuardarEstado" onclick="guardarEstado()">Guardar</button>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
const URL_MATRICULAS   = "{{ route('admin.matriculas.index') }}";
const URL_TABLA        = "{{ route('admin.matriculas.tabla') }}";
const URL_BUSCAR       = "{{ route('admin.matriculas.buscar') }}";
const URL_GRUPOS       = "{{ route('admin.matriculas.grupos') }}";
const URL_GRUPOS_EST   = "{{ route('admin.matriculas.grupos-estado') }}";
const URL_ESTADO_GRUPO = "{{ route('admin.matriculas.estado-grupo') }}";

/* ── fetch helper ─────────────────────────────────────── */
async function apiFetch(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json',
        },
    };
    if (body !== null) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    try {
        const res = await fetch(url, opts);
        return { status: res.status, data: await res.json() };
    } catch {
        return { status: 0, data: { ok: false, mensaje: 'Error de conexión.' } };
    }
}

/* ── Tabla AJAX ───────────────────────────────────────── */
async function cargarTabla(url) {
    const cont = document.getElementById('contenedorTabla');
    cont.style.opacity = '.5';
    const params = new URLSearchParams({
        buscar:   document.getElementById('filtroBuscar').value,
        grupo_id: document.getElementById('filtroGrupo').value,
        estado:   document.getElementById('filtroEstado').value,
    });
    const { data } = await apiFetch(url || `${URL_TABLA}?${params}`);
    cont.style.opacity = '1';
    if (data.success) {
        cont.innerHTML = data.html;
        if (url) history.pushState({}, '', url);
    }
}

document.getElementById('filtroGrupo').addEventListener('change', () => cargarTabla());
document.getElementById('filtroEstado').addEventListener('change',  () => cargarTabla());
let _deb;
document.getElementById('filtroBuscar').addEventListener('input', () => {
    clearTimeout(_deb); _deb = setTimeout(() => cargarTabla(), 400);
});
document.addEventListener('click', e => {
    const btn = e.target.closest('.pag-btn[href]');
    if (btn) { e.preventDefault(); cargarTabla(btn.href); }
});

/* ══════════════════════════════════════════════════════
   PASO 1 — Selección de estudiantes
   ══════════════════════════════════════════════════════ */
let _modalMatricularBS = null;
let _seleccionados = new Set();
let _todosEstudiantes = [];

function abrirPaso1() {
    _seleccionados.clear();
    _todosEstudiantes = [];
    document.getElementById('inputFiltroEst').value = '';
    document.getElementById('listaEstudiantes').innerHTML =
        '<p class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-2"></i>Cargando…</p>';

    mostrarPaso(1);
    if (!_modalMatricularBS)
        _modalMatricularBS = new bootstrap.Modal(document.getElementById('modalMatricular'));
    _modalMatricularBS.show();
    cargarEstudiantes();
}

async function cargarEstudiantes() {
    const { data } = await apiFetch(URL_BUSCAR);
    if (!data.ok) {
        document.getElementById('listaEstudiantes').innerHTML =
            '<p class="text-center text-danger py-4">Error al cargar estudiantes.</p>';
        return;
    }
    _todosEstudiantes = data.estudiantes;
    renderListaEstudiantes(_todosEstudiantes);
}

function renderListaEstudiantes(lista) {
    const cont = document.getElementById('listaEstudiantes');
    if (!lista.length) {
        cont.innerHTML = '<p class="text-center text-muted py-4">Sin estudiantes disponibles.</p>';
        return;
    }
    cont.innerHTML = lista.map(e => `
        <label class="est-fila ${_seleccionados.has(e.id) ? 'marcado' : ''}"
               data-id="${e.id}"
               onclick="toggleEstudiante(${e.id}, this)">
            <input type="checkbox" class="est-check" value="${e.id}"
                   ${_seleccionados.has(e.id) ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleEstudiante(${e.id}, this.closest('.est-fila'))">
            <div class="avatar-est" style="background:${e.color_avatar ?? '#2563EB'}">
                ${(e.iniciales ?? e.nombre.substring(0,2)).toUpperCase()}
            </div>
            <div>
                <div class="est-nombre">${e.nombre}</div>
                <div class="est-meta">${e.ya_matriculado > 0 ? 'Ya matriculado en ' + e.ya_matriculado + ' año(s)' : 'Sin matrícula este año'}</div>
            </div>
            <span class="est-badge ${e.ya_matriculado === 0 ? 'libre' : 'ocupado'}">
                ${e.ya_matriculado === 0 ? 'Libre' : 'Matriculado'}
            </span>
        </label>
    `).join('');
    actualizarContadorEst();
}

function toggleEstudiante(id, fila) {
    const check = fila.querySelector('.est-check');
    if (_seleccionados.has(id)) {
        _seleccionados.delete(id);
        fila.classList.remove('marcado');
        if (check) check.checked = false;
    } else {
        _seleccionados.add(id);
        fila.classList.add('marcado');
        if (check) check.checked = true;
    }
    actualizarContadorEst();
}

function filtrarListaEstudiantes(termino) {
    const t = termino.toLowerCase();
    renderListaEstudiantes(t ? _todosEstudiantes.filter(e => e.nombre.toLowerCase().includes(t)) : _todosEstudiantes);
}

function toggleTodosEstudiantes() {
    const t = document.getElementById('inputFiltroEst').value.toLowerCase();
    const vis = t ? _todosEstudiantes.filter(e => e.nombre.toLowerCase().includes(t)) : _todosEstudiantes;
    const todos = vis.every(e => _seleccionados.has(e.id));
    vis.forEach(e => { if (todos) _seleccionados.delete(e.id); else _seleccionados.add(e.id); });
    renderListaEstudiantes(t ? vis : _todosEstudiantes);
}

function actualizarContadorEst() {
    const n = _seleccionados.size;
    document.getElementById('contadorSeleccionados').textContent = `${n} estudiante(s) seleccionado(s)`;
    document.getElementById('btnSiguientePaso1').disabled = n === 0;
    document.getElementById('sinEstudiantesMsg').style.display = 'none';
    const t = document.getElementById('inputFiltroEst').value.toLowerCase();
    const vis = t ? _todosEstudiantes.filter(e => e.nombre.toLowerCase().includes(t)) : _todosEstudiantes;
    document.getElementById('btnToggleTodos').textContent =
        vis.every(e => _seleccionados.has(e.id)) ? 'Deseleccionar todos' : 'Seleccionar todos';
}

/* ══════════════════════════════════════════════════════
   PASO 2 — Grado y grupo
   ══════════════════════════════════════════════════════ */
let _gradosData = [];

async function irPaso2() {
    if (_seleccionados.size === 0) {
        document.getElementById('sinEstudiantesMsg').style.display = '';
        return;
    }
    mostrarPaso(2);

    const anio = document.getElementById('inputAnioLectivo').value;
    const { data } = await apiFetch(`${URL_GRUPOS}?anio=${anio}`);
    if (!data.ok) {
        document.getElementById('errGrado').textContent = 'Error al cargar grados.';
        return;
    }
    _gradosData = data.grados;
    const sel = document.getElementById('selGrado');
    sel.innerHTML = '<option value="">— Seleccionar grado —</option>' +
        _gradosData.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('');
    document.getElementById('grupoWrap').style.display = 'none';
    document.getElementById('resumenMatricula').style.display = 'none';
    document.getElementById('btnConfirmarMatricula').disabled = true;
}

function cargarGruposDeGrado() {
    const gradoId = parseInt(document.getElementById('selGrado').value);
    document.getElementById('errGrado').textContent = '';
    const grupoWrap = document.getElementById('grupoWrap');

    if (!gradoId) {
        grupoWrap.style.display = 'none';
        document.getElementById('resumenMatricula').style.display = 'none';
        document.getElementById('btnConfirmarMatricula').disabled = true;
        return;
    }
    const grado = _gradosData.find(g => g.id === gradoId);
    if (!grado || !grado.grupos.length) {
        grupoWrap.style.display = 'none';
        document.getElementById('errGrado').textContent = 'Este grado no tiene grupos activos.';
        document.getElementById('btnConfirmarMatricula').disabled = true;
        return;
    }
    const selGrupo = document.getElementById('selGrupo');
    selGrupo.innerHTML = '<option value="">— Seleccionar grupo —</option>' +
        grado.grupos.map(g =>
            `<option value="${g.id}">Grupo ${g.nombre} (${g.cupo_disponible}/${g.cupo_maximo} cupos)</option>`
        ).join('');
    grupoWrap.style.display = '';
    document.getElementById('resumenMatricula').style.display = 'none';
    document.getElementById('btnConfirmarMatricula').disabled = true;
}

function actualizarResumenMatricula() {
    const gradoId = parseInt(document.getElementById('selGrado').value);
    const grupoId = parseInt(document.getElementById('selGrupo').value);
    const resumen = document.getElementById('resumenMatricula');
    const btn     = document.getElementById('btnConfirmarMatricula');
    const txt     = document.getElementById('txtBtnMatricular');

    if (!gradoId || !grupoId) {
        resumen.style.display = 'none';
        btn.disabled = true;
        return;
    }

    const grado = _gradosData.find(g => g.id === gradoId);
    const grupo = grado?.grupos.find(g => g.id === grupoId);
    const n = _seleccionados.size;

    resumen.style.display = '';
    resumen.innerHTML = `
        <i class="fas fa-info-circle me-2"></i>
        Se matricularán hasta <strong>${n}</strong> estudiante(s) en
        <strong>${grado.nombre} — Grupo ${grupo.nombre}</strong>.
        ${grupo.cupo_disponible < n ? `<br><span style="color:#B45309"><i class="fas fa-exclamation-triangle me-1"></i>Solo hay ${grupo.cupo_disponible} cupos disponibles.</span>` : ''}
    `;
    btn.disabled = false;
    if (txt) txt.textContent = `Matricular (${n})`;
}

function irPaso1() {
    mostrarPaso(1);
    renderListaEstudiantes(_todosEstudiantes);
}

function mostrarPaso(n) {
    const en1 = n === 1;
    document.getElementById('paso1').style.display  = en1 ? '' : 'none';
    document.getElementById('paso2').style.display  = en1 ? 'none' : '';
    document.getElementById('btnSiguientePaso1').style.display   = en1 ? '' : 'none';
    document.getElementById('btnConfirmarMatricula').style.display = en1 ? 'none' : '';
    document.getElementById('btnVolverPaso1').style.display = en1 ? 'none' : '';
    document.getElementById('dotPaso1').className = en1 ? 'paso-dot activo' : 'paso-dot listo';
    document.getElementById('dotPaso2').className = en1 ? 'paso-dot' : 'paso-dot activo';
    document.getElementById('lineaPasos').className = en1 ? 'paso-linea' : 'paso-linea activa';
    document.getElementById('labelPaso').textContent = en1
        ? 'Seleccionar estudiantes'
        : 'Seleccionar grado y grupo';
}

/* ══════════════════════════════════════════════════════
   Confirmar matrícula
   ══════════════════════════════════════════════════════ */
async function confirmarMatricula() {
    const btn = document.getElementById('btnConfirmarMatricula');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Guardando…';

    const grupoId = parseInt(document.getElementById('selGrupo').value);
    const { data } = await apiFetch(URL_MATRICULAS, 'POST', {
        estudiante_ids: [..._seleccionados],
        grupo_id:       grupoId,
        fecha_ingreso:  document.getElementById('inputFechaIngreso').value,
        anio_lectivo:   parseInt(document.getElementById('inputAnioLectivo').value),
    });

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-graduation-cap me-1"></i><span id="txtBtnMatricular">Matricular</span>';

    if (data.ok) {
        _modalMatricularBS.hide();
        mostrarToast('success', data.mensaje);
        cargarTabla();
    } else {
        mostrarToast('error', data.mensaje ?? 'Error al matricular.');
    }
}

/* ══════════════════════════════════════════════════════
   Editar grupo
   ══════════════════════════════════════════════════════ */
let _modalEditarBS = null, _matriculaEditId = null;

async function abrirEditarMatricula(id) {
    _matriculaEditId = id;
    document.getElementById('errGrupoEditar').textContent = '';
    const { data } = await apiFetch(`/admin/matriculas/${id}/datos`);
    if (!data.ok) { mostrarToast('error', 'Error al cargar datos.'); return; }

    document.getElementById('contextoEditar').textContent =
        `${data.matricula.estudiante} · ${data.matricula.grado} — Grupo ${data.matricula.grupo}`;
    const sel = document.getElementById('selectGrupoEditar');
    sel.innerHTML = data.grupos.map(g =>
        `<option value="${g.id}" ${g.id === data.matricula.grupo_id ? 'selected' : ''}>${g.label}</option>`
    ).join('');

    if (!_modalEditarBS) _modalEditarBS = new bootstrap.Modal(document.getElementById('modalEditar'));
    _modalEditarBS.show();
}

async function guardarEdicion() {
    const btn = document.getElementById('btnGuardarEditar');
    btn.disabled = true;
    const { data } = await apiFetch(
        `/admin/matriculas/${_matriculaEditId}`, 'PUT',
        { grupo_id: parseInt(document.getElementById('selectGrupoEditar').value) }
    );
    btn.disabled = false;
    if (data.ok) { _modalEditarBS.hide(); mostrarToast('success', data.mensaje); cargarTabla(); }
    else document.getElementById('errGrupoEditar').textContent = data.mensaje ?? 'Error.';
}

/* ══════════════════════════════════════════════════════
   Cambiar estado individual
   ══════════════════════════════════════════════════════ */
let _modalEstadoBS = null, _matriculaEstId = null;

function abrirEstadoMatricula(id, estadoActual) {
    _matriculaEstId = id;
    document.getElementById('selectEstado').value = estadoActual;
    if (!_modalEstadoBS) _modalEstadoBS = new bootstrap.Modal(document.getElementById('modalEstado'));
    _modalEstadoBS.show();
}

async function guardarEstado() {
    const btn = document.getElementById('btnGuardarEstado');
    btn.disabled = true;
    const { data } = await apiFetch(
        `/admin/matriculas/${_matriculaEstId}/estado`, 'PATCH',
        { estado: document.getElementById('selectEstado').value }
    );
    btn.disabled = false;
    if (data.ok) { _modalEstadoBS.hide(); mostrarToast('success', data.mensaje); cargarTabla(); }
    else mostrarToast('error', data.mensaje ?? 'Error.');
}

/* ══════════════════════════════════════════════════════
   Promover / Graduar por grupo
   ══════════════════════════════════════════════════════ */
let _modalEstadoGrupoBS = null;
let _gruposEstadoData   = [];

async function abrirEstadoGrupo() {
    document.getElementById('egPreview').style.display = 'none';
    document.getElementById('btnAplicarEstadoGrupo').disabled = true;
    _gruposEstadoData = [];

    if (!_modalEstadoGrupoBS)
        _modalEstadoGrupoBS = new bootstrap.Modal(document.getElementById('modalEstadoGrupo'));
    _modalEstadoGrupoBS.show();
    cargarGruposEstado();
}

async function cargarGruposEstado() {
    const anio    = document.getElementById('egAnio').value;
    const grupoSel= document.getElementById('egGrupo');
    grupoSel.innerHTML = '<option value="">Cargando…</option>';
    document.getElementById('egPreview').style.display = 'none';
    document.getElementById('btnAplicarEstadoGrupo').disabled = true;

    const { data } = await apiFetch(`${URL_GRUPOS_EST}?anio=${anio}`);
    if (!data.ok) { grupoSel.innerHTML = '<option value="">Error al cargar</option>'; return; }

    _gruposEstadoData = data.grupos;

    if (!_gruposEstadoData.length) {
        grupoSel.innerHTML = '<option value="">Sin grupos activos para ' + anio + '</option>';
        return;
    }
    grupoSel.innerHTML = '<option value="">— Seleccionar grupo —</option>' +
        _gruposEstadoData.map(g =>
            `<option value="${g.id}">${g.grado_nombre} — Grupo ${g.nombre} (${g.anio_lectivo})</option>`
        ).join('');
}

function actualizarPreviewEstadoGrupo() {
    const grupoId = parseInt(document.getElementById('egGrupo').value);
    const estado  = document.getElementById('egEstado').value;
    const preview = document.getElementById('egPreview');
    const btn     = document.getElementById('btnAplicarEstadoGrupo');

    if (!grupoId) { preview.style.display = 'none'; btn.disabled = true; return; }

    const grupo = _gruposEstadoData.find(g => g.id === grupoId);
    if (!grupo) { preview.style.display = 'none'; btn.disabled = true; return; }

    preview.style.display = '';
    if (grupo.activas === 0) {
        Object.assign(preview.style, { background:'#FEF3C7', border:'1px solid #FCD34D', color:'#92400E' });
        preview.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>Este grupo no tiene matrículas activas.`;
        btn.disabled = true;
        return;
    }

    const etiqueta = { promovido:'Promovido', graduado:'Graduado', retirado:'Retirado' }[estado];
    Object.assign(preview.style, { background:'#EFF6FF', border:'1px solid #BFDBFE', color:'#1E40AF' });
    preview.innerHTML = `
        <i class="fas fa-info-circle me-2"></i>
        Se cambiarán <strong>${grupo.activas}</strong> matrícula(s) de
        <strong>${grupo.grado_nombre} — Grupo ${grupo.nombre}</strong>
        a <strong>${etiqueta}</strong>.
    `;
    btn.disabled = false;
    btn.textContent = `Aplicar a ${grupo.activas} matrícula(s)`;
}

async function aplicarEstadoGrupo() {
    const grupoId = parseInt(document.getElementById('egGrupo').value);
    const estado  = document.getElementById('egEstado').value;
    const btn     = document.getElementById('btnAplicarEstadoGrupo');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Aplicando…';

    const { data } = await apiFetch(URL_ESTADO_GRUPO, 'PATCH', { grupo_id: grupoId, estado });

    btn.disabled = false;
    btn.textContent = 'Aplicar cambio';

    if (data.ok) {
        _modalEstadoGrupoBS.hide();
        mostrarToast('success', data.mensaje);
        cargarTabla();
    } else {
        mostrarToast('error', data.mensaje ?? 'Error al aplicar.');
    }
}

/* ══════════════════════════════════════════════════════
   Eliminar
   ══════════════════════════════════════════════════════ */
async function eliminarMatricula(id, nombre) {
    const { isConfirmed } = await Swal.fire({
        title: '¿Eliminar matrícula?',
        text: `Se eliminará la matrícula de "${nombre}".`,
        icon: 'warning', showCancelButton: true,
        confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
        confirmButtonColor: '#DC2626', cancelButtonColor: '#94A3B8',
    });
    if (!isConfirmed) return;

    const { data } = await apiFetch(`/admin/matriculas/${id}`, 'DELETE');
    if (data.ok) {
        const fila = document.getElementById(`fila-mat-${id}`);
        if (fila) { fila.style.opacity = '0'; setTimeout(() => fila.remove(), 250); }
        mostrarToast('success', data.mensaje);
    } else {
        mostrarToast('error', data.mensaje ?? 'Error al eliminar.');
    }
}
</script>
@endpush
