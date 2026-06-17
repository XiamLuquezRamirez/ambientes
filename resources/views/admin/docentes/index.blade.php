@extends('layouts.admin')
@section('title', 'Docentes')

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

{{-- ── Contenedor de tabla (reemplazado por AJAX) ──────────────── --}}
<div id="contenedorTabla">
    @include('admin.docentes._tabla')
</div>
<div id="cargando-tabla">⏳ Cargando...</div>

{{-- ── Modal Nuevo Docente ──────────────────────────────────────── --}}
<div class="modal-backdrop" id="modalDocente" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="dialogo">

        <div class="modal-header">
            <div class="modal-header-icon">👩‍🏫</div>
            <div class="modal-header-text">
                <h2 id="modal-title">Nuevo Docente</h2>
                <p>Completa los datos para crear la cuenta</p>
            </div>
            <button class="modal-close" onclick="cerrarModal()" aria-label="Cerrar">✕</button>
        </div>

        <div class="modal-body">
            <form id="formCrearDocente">
                @csrf
                <div class="form-group">
                    <label>Nombre completo</label>
                    <input type="text" name="nombre" class="form-control" autocomplete="off">
                </div>
                <div class="form-group">
                    <label>Correo electrónico</label>
                    <input type="email" name="email" class="form-control" autocomplete="off">
                </div>
                <div class="form-group">
                    <label>Contraseña <span style="color:#94A3B8;font-size:0.78rem">(mínimo 8 caracteres)</span></label>
                    <input type="password" name="password" class="form-control">
                </div>
                <div class="form-group">
                    <label>Rol</label>
                    <select name="rol" class="form-control">
                        @foreach(['admin' => 'Administrador', 'docente_lider' => 'Docente Líder', 'docente_auxiliar' => 'Docente Auxiliar'] as $val => $label)
                            <option value="{{ $val }}">{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label>Ambiente <span style="color:#94A3B8;font-size:0.78rem">(no aplica si es Administrador)</span></label>
                    <select name="ambiente_id" class="form-control">
                        <option value="">— Sin ambiente —</option>
                        @foreach($ambientes as $a)
                            <option value="{{ $a->id }}">{{ $a->icono }} {{ $a->nombre }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="modal-actions">
                    <button type="submit" id="btnCrearDocente" class="btn btn-primary">Crear Docente</button>
                    <button type="button" class="btn" style="background:#F1F5F9;color:#475569;border:1px solid #E2E8F0" onclick="cerrarModal()">Cancelar</button>
                </div>
            </form>
        </div>

    </div>
</div>
@endsection

@push('scripts')
<script>
const URL_DOCENTES = "{{ route('admin.docentes') }}";

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

/* ── Modal ───────────────────────────────────────────────────── */
function abrirModal() {
    document.getElementById('modalDocente').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function cerrarModal() {
    document.getElementById('modalDocente').classList.remove('open');
    document.body.style.overflow = '';
    limpiarErroresModal();
    document.getElementById('formCrearDocente').reset();
}
document.getElementById('modalDocente').addEventListener('click', function(e) {
    if (e.target === this) cerrarModal();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') cerrarModal();
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
