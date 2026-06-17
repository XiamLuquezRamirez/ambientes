@extends('layouts.admin')
@section('title', 'Docentes')

@push('styles')
<style>
/* ── Buscador ────────────────────────────────────────────────── */
.input-buscar { position: relative; flex: 1; min-width: 220px; }
.input-buscar input {
    width: 100%; background: #FFFFFF; border: 1px solid #CBD5E1;
    border-radius: 8px; padding: 9px 14px 9px 38px; color: #1E293B;
    font-family: 'Nunito', sans-serif; font-size: 0.9rem; outline: none;
    transition: border-color .15s, box-shadow .15s;
}
.input-buscar input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
.input-buscar input::placeholder { color: #94A3B8; }
.input-buscar .icono-buscar {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    color: #94A3B8; font-size: 0.95rem; pointer-events: none;
}

/* ── Paginación ──────────────────────────────────────────────── */
.paginacion-wrapper {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 20px; flex-wrap: wrap; gap: 12px;
}
.paginacion-info { font-size: 0.82rem; color: #64748B; }
.paginacion-controles { display: flex; gap: 6px; flex-wrap: wrap; }
.pag-btn {
    display: inline-flex; align-items: center; padding: 6px 12px;
    border-radius: 7px; font-size: 0.82rem; font-family: 'Nunito', sans-serif;
    background: #FFFFFF; border: 1px solid #E2E8F0; color: #64748B;
    text-decoration: none; transition: all .15s; cursor: pointer;
}
.pag-btn:hover { background: #EFF6FF; color: #1E40AF; border-color: #BFDBFE; }
.pag-btn-activo { background: #2563EB; border-color: #2563EB; color: #FFFFFF; font-weight: 700; }
.pag-btn-disabled { opacity: .4; cursor: not-allowed; pointer-events: none; }

/* ── Acciones en tabla ───────────────────────────────────────── */
.tabla-acciones { display: flex; gap: 6px; }
.btn-accion {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 6px; font-size: 0.76rem;
    font-family: 'Nunito', sans-serif; cursor: pointer;
    border: 1px solid transparent; text-decoration: none; transition: all .15s;
}
.btn-editar  { background: #EFF6FF; border-color: #BFDBFE; color: #1D4ED8; }
.btn-editar:hover  { background: #2563EB; border-color: #2563EB; color: #fff; }
.btn-eliminar { background: #FEF2F2; border-color: #FECACA; color: #DC2626; }
.btn-eliminar:hover { background: #DC2626; border-color: #DC2626; color: #fff; }

/* ── Loading overlay ─────────────────────────────────────────── */
#cargando-tabla {
    display: none; text-align: center; padding: 40px;
    color: #64748B; font-size: 0.9rem;
}

/* ── Errores de campo ────────────────────────────────────────── */
.campo-error { color: #DC2626; font-size: 0.78rem; margin-top: 4px; }
.form-control.is-invalid { border-color: #DC2626 !important; }

/* ════════════════════════════════════════════════════════════════
   MODAL CUSTOM – sin conflictos con Bootstrap
   ════════════════════════════════════════════════════════════════ */

/* Fondo oscuro con blur */
.dlg-fondo {
    position: fixed; inset: 0; z-index: 1060;
    background: rgba(10, 18, 40, 0);
    backdrop-filter: blur(0px);
    visibility: hidden;
    transition: background .3s ease, backdrop-filter .3s ease, visibility 0s .3s;
}
.dlg-fondo.abierto {
    background: rgba(10, 18, 40, 0.65);
    backdrop-filter: blur(5px);
    visibility: visible;
    transition: background .3s ease, backdrop-filter .3s ease;
}

/* Contenedor centrado */
.dlg-wrap {
    position: fixed; inset: 0; z-index: 1061;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
    padding: 16px;
}

/* Panel del diálogo */
.dlg-panel {
    background: #FFFFFF;
    border-radius: 18px;
    width: 100%; max-width: 520px;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(37,99,235,.25), 0 8px 24px rgba(0,0,0,.15);
    pointer-events: auto;

    /* estado inicial: invisible, encogido y elevado */
    opacity: 0;
    transform: scale(0.82) translateY(-40px);
    transition: none;
}

/* Keyframe de apertura: spring bounce */
@keyframes dlgEntrar {
    0%   { opacity: 0; transform: scale(0.82) translateY(-40px); }
    55%  { opacity: 1; transform: scale(1.03) translateY(6px); }
    75%  { transform: scale(0.98) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* Keyframe de cierre: rápido y descendente */
@keyframes dlgSalir {
    0%   { opacity: 1; transform: scale(1) translateY(0); }
    100% { opacity: 0; transform: scale(0.88) translateY(24px); }
}

.dlg-fondo.abierto + .dlg-wrap .dlg-panel {
    animation: dlgEntrar .42s cubic-bezier(.34,1.56,.64,1) forwards;
}
.dlg-fondo.cerrando + .dlg-wrap .dlg-panel {
    animation: dlgSalir .22s ease-in forwards;
}

/* Cabecera degradada */
.dlg-header {
    background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
    padding: 20px 24px;
    display: flex; align-items: center; gap: 14px;
}
.dlg-header-icon {
    width: 44px; height: 44px;
    background: rgba(255,255,255,.15);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.35rem; flex-shrink: 0;
}
.dlg-header-text { flex: 1; }
.dlg-header-text h2 {
    font-family: 'Fredoka One', cursive;
    font-size: 1.2rem; color: #FFFFFF; line-height: 1.2; margin: 0;
}
.dlg-header-text p { font-size: 0.78rem; color: rgba(255,255,255,.65); margin: 2px 0 0; }
.dlg-btn-cerrar {
    background: rgba(255,255,255,.12); border: none;
    color: rgba(255,255,255,.8);
    width: 32px; height: 32px; border-radius: 8px;
    font-size: 1rem; cursor: pointer; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s, color .15s, transform .15s;
}
.dlg-btn-cerrar:hover {
    background: rgba(255,255,255,.25); color: #fff;
    transform: rotate(90deg);
}

/* Sacudida cuando se intenta cerrar desde fuera */
@keyframes dlgSacudir {
    0%   { transform: scale(1)    translateX(0); }
    15%  { transform: scale(1.03) translateX(-8px); }
    35%  { transform: scale(1.03) translateX(8px); }
    55%  { transform: scale(1.01) translateX(-5px); }
    75%  { transform: scale(1.01) translateX(5px); }
    90%  { transform: scale(1)    translateX(-2px); }
    100% { transform: scale(1)    translateX(0); }
}
.dlg-panel.dlg-sacudir {
    animation: dlgSacudir .45s cubic-bezier(.36,.07,.19,.97) forwards;
}

/* Cuerpo */
.dlg-body { padding: 28px; }

/* Pie */
.dlg-footer {
    display: flex; gap: 12px;
    padding: 0 28px 24px;
    border-top: 1px solid #E2E8F0;
    padding-top: 20px;
}
</style>
@endpush

@section('content')
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
    <div>
        <h1>Docentes</h1>
        <p>Gestión de cuentas de docentes y administradores</p>
    </div>
    <button class="btn btn-primary" onclick="abrirModal()">+ Nuevo Docente</button>
</div>

{{-- ── Filtros ──────────────────────────────────────────────────── --}}
<form id="formBuscar" style="display:flex;gap:12px;margin-bottom:24px;align-items:center;flex-wrap:wrap">
    <div class="input-buscar">
        <span class="icono-buscar">🔍</span>
        <input type="text" name="buscar" placeholder="Buscar por nombre o correo..."
               value="{{ request('buscar') }}" autocomplete="off">
    </div>
    <select name="ambiente_id" class="form-control" style="width:auto">
        <option value="">Todos los ambientes</option>
        @foreach($ambientes as $a)
            <option value="{{ $a->id }}" {{ request('ambiente_id') == $a->id ? 'selected' : '' }}>{{ $a->nombre }}</option>
        @endforeach
    </select>
    <select name="rol" class="form-control" style="width:auto">
        <option value="">Todos los roles</option>
        @foreach(['admin' => 'Administrador', 'docente_lider' => 'Docente Líder', 'docente_auxiliar' => 'Docente Auxiliar'] as $val => $label)
            <option value="{{ $val }}" {{ request('rol') === $val ? 'selected' : '' }}>{{ $label }}</option>
        @endforeach
    </select>
    <button type="submit" class="btn btn-primary btn-sm">Filtrar</button>
    <a id="btnLimpiar" href="{{ route('admin.docentes') }}"
       class="btn btn-sm" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0;
              display:{{ request()->hasAny(['buscar','ambiente_id','rol']) ? 'inline-flex' : 'none' }}">
        ✕ Limpiar
    </a>
</form>

{{-- ── Contenedor de tabla ──────────────────────────────────────── --}}
<div id="contenedorTabla">
    @include('admin.docentes._tabla')
</div>
<div id="cargando-tabla">⏳ Cargando...</div>

{{-- ── Fondo oscuro ─────────────────────────────────────────────── --}}
<div class="dlg-fondo" id="dlgFondo"></div>

{{-- ── Modal custom – Nuevo Docente ───────────────────────────── --}}
<div class="dlg-wrap" id="dlgWrap">
    <div class="dlg-panel" id="dlgPanel" role="dialog" aria-modal="true" aria-labelledby="dlgTitulo">

        <div class="dlg-header">
            <div class="dlg-header-icon">👩‍🏫</div>
            <div class="dlg-header-text">
                <h2 id="dlgTitulo">Nuevo Docente</h2>
                <p>Completa los datos para crear la cuenta</p>
            </div>
            <button class="dlg-btn-cerrar" onclick="cerrarModal()" aria-label="Cerrar">✕</button>
        </div>

        <div class="dlg-body">
            <form id="formCrearDocente">
                @csrf
                <div class="form-group mb-3">
                    <label class="form-label">Nombre completo</label>
                    <input type="text" name="nombre" class="form-control" autocomplete="off">
                </div>
                <div class="form-group mb-3">
                    <label class="form-label">Correo electrónico</label>
                    <input type="email" name="email" class="form-control" autocomplete="off">
                </div>
                <div class="form-group mb-3">
                    <label class="form-label">Contraseña <span style="color:#94A3B8;font-size:0.78rem">(mínimo 8 caracteres)</span></label>
                    <input type="password" name="password" class="form-control">
                </div>
                <div class="form-group mb-3">
                    <label class="form-label">Rol</label>
                    <select name="rol" class="form-control">
                        @foreach(['admin' => 'Administrador', 'docente_lider' => 'Docente Líder', 'docente_auxiliar' => 'Docente Auxiliar'] as $val => $label)
                            <option value="{{ $val }}">{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label class="form-label">Ambiente <span style="color:#94A3B8;font-size:0.78rem">(no aplica si es Administrador)</span></label>
                    <select name="ambiente_id" class="form-control">
                        <option value="">— Sin ambiente —</option>
                        @foreach($ambientes as $a)
                            <option value="{{ $a->id }}">{{ $a->icono }} {{ $a->nombre }}</option>
                        @endforeach
                    </select>
                </div>
            </form>
        </div>

        <div class="dlg-footer">
            <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0"
                    onclick="cerrarModal()">Cancelar</button>
            <button type="submit" form="formCrearDocente" id="btnCrearDocente" class="btn btn-primary">Crear Docente</button>
        </div>

    </div>
</div>
@endsection

@push('scripts')
<script>
const URL_DOCENTES = "{{ route('admin.docentes') }}";

/* ── Modal custom ────────────────────────────────────────────── */
const dlgFondo = document.getElementById('dlgFondo');

function abrirModal() {
    dlgFondo.classList.remove('cerrando');
    dlgFondo.classList.add('abierto');
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    dlgFondo.classList.replace('abierto', 'cerrando');
    setTimeout(() => {
        dlgFondo.classList.remove('cerrando');
        document.body.style.overflow = '';
        limpiarErroresModal();
        document.getElementById('formCrearDocente').reset();
    }, 220);
}

/* Clic en el fondo o ESC → sacudir el panel */
function sacudirModal() {
    const panel = document.getElementById('dlgPanel');
    panel.classList.remove('dlg-sacudir');
    void panel.offsetWidth; // reflow para reiniciar la animación
    panel.classList.add('dlg-sacudir');
}

dlgFondo.addEventListener('click', sacudirModal);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && dlgFondo.classList.contains('abierto')) sacudirModal();
});

/* ── Tabla AJAX ──────────────────────────────────────────────── */
async function cargarTabla(url) {
    document.getElementById('contenedorTabla').style.opacity = '.4';
    document.getElementById('cargando-tabla').style.display = 'block';

    const res = await ajaxRequest(url);

    document.getElementById('contenedorTabla').style.opacity = '1';
    document.getElementById('cargando-tabla').style.display = 'none';

    if (res.success) {
        document.getElementById('contenedorTabla').innerHTML = res.html;
        history.pushState(null, '', url);
        const params = new URL(url).searchParams;
        const tieneFilros = params.has('buscar') || params.has('ambiente_id') || params.has('rol');
        document.getElementById('btnLimpiar').style.display = tieneFilros ? 'inline-flex' : 'none';
    } else {
        mostrarToast('error', 'Error al cargar los datos');
    }
}

/* Delegación: clics en paginación dinámica */
document.addEventListener('click', function(e) {
    const pagBtn = e.target.closest('.pag-btn[href]');
    if (pagBtn) {
        e.preventDefault();
        cargarTabla(pagBtn.href);
    }
});

/* ── Filtros ─────────────────────────────────────────────────── */
function aplicarFiltros() {
    const params = new URLSearchParams(new FormData(document.getElementById('formBuscar')));
    for (const [k, v] of [...params.entries()]) {
        if (!v) params.delete(k);
    }
    const url = params.toString() ? `${URL_DOCENTES}?${params.toString()}` : URL_DOCENTES;
    cargarTabla(url);
}

document.querySelectorAll('#formBuscar select').forEach(sel => {
    sel.addEventListener('change', aplicarFiltros);
});

let debounceTimer;
document.querySelector('#formBuscar input[name="buscar"]').addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(aplicarFiltros, 400);
});

document.getElementById('formBuscar').addEventListener('submit', function(e) {
    e.preventDefault();
    clearTimeout(debounceTimer);
    aplicarFiltros();
});

document.getElementById('btnLimpiar').addEventListener('click', async function(e) {
    e.preventDefault();
    document.getElementById('formBuscar').reset();
    await cargarTabla(URL_DOCENTES);
});

/* ── Errores inline en modal ─────────────────────────────────── */
function limpiarErroresModal() {
    document.querySelectorAll('#formCrearDocente .campo-error').forEach(el => el.remove());
    document.querySelectorAll('#formCrearDocente .is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function mostrarErroresModal(errors) {
    limpiarErroresModal();
    for (const [campo, mensajes] of Object.entries(errors)) {
        const input = document.querySelector(`#formCrearDocente [name="${campo}"]`);
        if (!input) continue;
        input.classList.add('is-invalid');
        const div = document.createElement('div');
        div.className = 'campo-error';
        div.textContent = mensajes[0];
        input.insertAdjacentElement('afterend', div);
    }
    const primero = document.querySelector('#formCrearDocente .is-invalid');
    if (primero) primero.focus();
}

/* ── Crear docente (AJAX) ────────────────────────────────────── */
document.getElementById('formCrearDocente').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnCrearDocente');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const formData = new FormData(this);
    const datos = Object.fromEntries(formData.entries());
    if (!datos.ambiente_id) datos.ambiente_id = null;

    const res = await ajaxRequest(URL_DOCENTES, 'POST', datos);

    btn.disabled = false;
    btn.textContent = 'Crear Docente';

    if (res.success) {
        cerrarModal();
        mostrarToast('success', res.message);
        await cargarTabla(location.href);
    } else if (res.errors && Object.keys(res.errors).length) {
        mostrarErroresModal(res.errors);
    } else {
        mostrarToast('error', res.message || 'Error al crear el docente');
    }
});

/* ── Eliminar docente (AJAX) ─────────────────────────────────── */
document.addEventListener('click', async function(e) {
    const btn = e.target.closest('.btn-eliminar');
    if (!btn) return;

    const id     = btn.dataset.id;
    const nombre = btn.dataset.nombre;

    const confirmacion = await Swal.fire({
        title: '¿Eliminar docente?',
        text: `"${nombre}" será eliminado permanentemente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#94A3B8',
        iconColor: '#F59E0B',
    });

    if (!confirmacion.isConfirmed) return;

    const res = await ajaxRequest(`${URL_DOCENTES}/${id}`, 'DELETE');

    if (res.success) {
        const fila = document.getElementById(`fila-${id}`);
        if (fila) {
            fila.style.transition = 'opacity .25s';
            fila.style.opacity = '0';
            setTimeout(() => {
                fila.remove();
                if (!document.querySelector('#contenedorTabla tbody tr[id^="fila-"]')) {
                    cargarTabla(URL_DOCENTES);
                }
            }, 250);
        }
        mostrarToast('success', res.message);
    } else {
        mostrarToast('error', res.message || 'Error al eliminar');
    }
});
</script>
@endpush
