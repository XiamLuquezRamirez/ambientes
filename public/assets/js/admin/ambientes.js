/* ═══════════════════════════════════════════════════════════════
   ambientes.js — Admin panel · Aulas Reggio
   Cargado en: admin/ambientes/index y admin/ambientes/grados-grupos
   ═══════════════════════════════════════════════════════════════ */

const CSRF = () => document.querySelector('meta[name="csrf-token"]').content;

/* ── Fetch helper ────────────────────────────────────────────── */
async function apiFetch(url, method = 'GET', body = null) {
    const opts = {
        method,
        headers: {
            'X-CSRF-TOKEN': CSRF(),
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
    } catch (err) {
        console.error('apiFetch error:', err);
        return { status: 0, data: { ok: false, mensaje: 'Error de conexión.' } };
    }
}

/* ══════════════════════════════════════════════════════════════
   SECCIÓN: ÍNDICE DE AMBIENTES
   ══════════════════════════════════════════════════════════════ */

/* ── Dropdown de tres puntos ─────────────────────────────────── */
function abrirMenu(ambienteId) {
    const yaAbierto = document.getElementById(`menu-${ambienteId}`)?.classList.contains('abierto');
    cerrarTodosMenus();
    if (!yaAbierto) {
        document.getElementById(`menu-${ambienteId}`)?.classList.add('abierto');
    }
}

function cerrarTodosMenus() {
    document.querySelectorAll('.dropdown-menu-card.abierto').forEach(m => m.classList.remove('abierto'));
}

document.addEventListener('click', function (e) {
    if (!e.target.closest('.btn-menu') && !e.target.closest('.dropdown-menu-card')) {
        cerrarTodosMenus();
    }
});

/* ── Toggle activo del ambiente ──────────────────────────────── */
async function toggleActivo(ambienteId, nombre, estadoActual) {
    cerrarTodosMenus();

    const accion = estadoActual ? 'desactivar' : 'activar';
    const { isConfirmed } = await Swal.fire({
        title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${nombre}"?`,
        text: estadoActual
            ? 'El ambiente quedará inactivo pero sus datos se conservan.'
            : 'El ambiente volverá a estar disponible.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: estadoActual ? '#DC2626' : '#2563EB',
        cancelButtonColor: '#94A3B8',
    });

    if (!isConfirmed) return;

    const { status, data } = await apiFetch(`/admin/ambientes/${ambienteId}/toggle`, 'PATCH');

    if (status === 200) {
        const badge = document.getElementById(`badge-estado-${ambienteId}`);
        if (badge) {
            badge.textContent = data.activo ? 'Activo' : 'Inactivo';
            badge.className = `badge-estado ${data.activo ? 'badge-activo' : 'badge-inactivo'}`;
        }
        mostrarToast('success', data.mensaje);
        // Actualizar cache local
        if (window._ambientes?.[ambienteId]) {
            window._ambientes[ambienteId].activo = data.activo;
        }
    } else {
        mostrarToast('error', 'Error al cambiar el estado.');
    }
}

/* ── Modal crear/editar ambiente ─────────────────────────────── */
let _modalAmbienteBS = null;

function _getModalAmbiente() {
    if (!_modalAmbienteBS) {
        _modalAmbienteBS = new bootstrap.Modal(document.getElementById('modalAmbiente'));
    }
    return _modalAmbienteBS;
}

function abrirModalAmbiente(modo, ambienteId = null) {
    cerrarTodosMenus();
    limpiarErroresAmbiente();
    document.getElementById('formAmbiente').reset();

    const titulo = document.getElementById('modalAmbienteTitulo');
    const btnGuardar = document.getElementById('btnGuardarAmbiente');
    const idInput = document.getElementById('ambienteId');

    if (modo === 'crear') {
        titulo.textContent = 'Nuevo Ambiente';
        btnGuardar.textContent = 'Crear Ambiente';
        idInput.value = '';
        actualizarPreviewColor();
    } else {
        const amb = window._ambientes?.[ambienteId];
        if (!amb) return;
        titulo.textContent = 'Editar Ambiente';
        btnGuardar.textContent = 'Guardar Cambios';
        idInput.value = ambienteId;
        document.getElementById('ambNombre').value = amb.nombre;
        document.getElementById('ambSlug').value = amb.slug;
        document.getElementById('ambColor').value = amb.color_hex;
        document.getElementById('ambIcono').value = amb.icono;
        document.getElementById('ambIp').value = amb.servidor_ip ?? '';
        actualizarPreviewColor();
    }

    _getModalAmbiente().show();
}

document.getElementById('modalAmbiente')?.addEventListener('hidden.bs.modal', function () {
    limpiarErroresAmbiente();
    document.getElementById('formAmbiente').reset();
});

function limpiarErroresAmbiente() {
    ['nombre', 'slug', 'color_hex', 'icono', 'servidor_ip'].forEach(campo => {
        const el = document.getElementById(`err-${campo}`);
        if (el) el.textContent = '';
    });
}

function mostrarErroresAmbiente(errors) {
    limpiarErroresAmbiente();
    for (const [campo, mensajes] of Object.entries(errors)) {
        const el = document.getElementById(`err-${campo}`);
        if (el) el.textContent = mensajes[0];
    }
}

/* Auto-generar slug desde nombre */
function autoSlug() {
    const nombre = document.getElementById('ambNombre').value;
    document.getElementById('ambSlug').value = generarSlug(nombre);
}

function generarSlug(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/* Preview de color en tiempo real */
function actualizarPreviewColor() {
    const val = document.getElementById('ambColor')?.value ?? '';
    const preview = document.getElementById('previewColor');
    if (preview) {
        preview.style.background = val || '#E2E8F0';
    }
}

/* Guardar ambiente vía AJAX */
async function guardarAmbiente() {
    const btn = document.getElementById('btnGuardarAmbiente');
    const ambienteId = document.getElementById('ambienteId').value;
    const esEdicion = !!ambienteId;

    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const body = {
        nombre:      document.getElementById('ambNombre').value,
        slug:        document.getElementById('ambSlug').value,
        color_hex:   document.getElementById('ambColor').value,
        icono:       document.getElementById('ambIcono').value,
        servidor_ip: document.getElementById('ambIp').value || null,
    };

    const url    = esEdicion ? `/admin/ambientes/${ambienteId}` : '/admin/ambientes';
    const method = esEdicion ? 'PUT' : 'POST';

    const { status, data } = await apiFetch(url, method, body);

    btn.disabled = false;
    btn.textContent = esEdicion ? 'Guardar Cambios' : 'Crear Ambiente';

    if (status === 200 || status === 201) {
        _getModalAmbiente().hide();
        mostrarToast('success', data.mensaje);
        setTimeout(() => location.reload(), 800);
    } else if (status === 422 && data.errors) {
        mostrarErroresAmbiente(data.errors);
    } else {
        mostrarToast('error', data.mensaje ?? 'Error al guardar.');
    }
}

/* ══════════════════════════════════════════════════════════════
   SECCIÓN: GRADOS Y GRUPOS (vista interior del ambiente)
   ══════════════════════════════════════════════════════════════ */

/* ── Toggle grado habilitado ─────────────────────────────────── */
async function toggleGrado(ambienteId, gradoId, nombreGrado, checkbox) {
    const { status, data } = await apiFetch(
        `/admin/ambientes/${ambienteId}/grados/${gradoId}/toggle`,
        'PATCH'
    );

    if (status === 200) {
        const body = document.getElementById(`body-grado-${gradoId}`);
        if (body) {
            body.classList.toggle('oculto', !data.habilitado);
        }
        checkbox.checked = data.habilitado;
    } else {
        checkbox.checked = !checkbox.checked; // revertir
        mostrarToast('error', 'Error al cambiar el estado del grado.');
    }
}

/* ── Modal nuevo/editar grupo ────────────────────────────────── */
let _modalGrupoBS = null;

function _getModalGrupo() {
    if (!_modalGrupoBS) {
        _modalGrupoBS = new bootstrap.Modal(document.getElementById('modalGrupo'));
    }
    return _modalGrupoBS;
}

function abrirModalGrupo(gradoId = null, grupoId = null, grupoNombre = null, cupMaximo = 25) {
    limpiarErroresGrupo();
    document.getElementById('formGrupo').reset();

    const titulo     = document.getElementById('modalGrupoTitulo');
    const btnGuardar = document.getElementById('btnGuardarGrupo');
    const idInput    = document.getElementById('grupoId');

    idInput.value = grupoId ?? '';

    if (grupoId) {
        titulo.textContent = 'Editar Grupo';
        btnGuardar.textContent = 'Guardar Cambios';
        if (gradoId)   document.getElementById('grupoGradoId').value = gradoId;
        if (grupoNombre) document.getElementById('grupoNombre').value = grupoNombre;
        document.getElementById('grupoCupo').value = cupMaximo;
        document.getElementById('grupoGradoId').disabled = true;
        document.getElementById('grupoAnio').disabled = true;
    } else {
        titulo.textContent = 'Nuevo Grupo';
        btnGuardar.textContent = 'Crear Grupo';
        if (gradoId) document.getElementById('grupoGradoId').value = gradoId;
        document.getElementById('grupoGradoId').disabled = false;
        document.getElementById('grupoAnio').disabled = false;
    }

    _getModalGrupo().show();
}

document.getElementById('modalGrupo')?.addEventListener('hidden.bs.modal', function () {
    limpiarErroresGrupo();
    document.getElementById('formGrupo').reset();
    document.getElementById('grupoGradoId').disabled = false;
    document.getElementById('grupoAnio').disabled = false;
});

function limpiarErroresGrupo() {
    ['grado_id', 'nombre', 'anio_lectivo', 'cupo_maximo'].forEach(campo => {
        const el = document.getElementById(`err-${campo}`);
        if (el) el.textContent = '';
    });
}

function mostrarErroresGrupo(errors) {
    limpiarErroresGrupo();
    for (const [campo, mensajes] of Object.entries(errors)) {
        const el = document.getElementById(`err-${campo}`);
        if (el) el.textContent = mensajes[0];
    }
}

async function guardarGrupo() {
    const ambienteId = typeof AMBIENTE_ID !== 'undefined' ? AMBIENTE_ID : null;
    if (!ambienteId) return;

    const btn     = document.getElementById('btnGuardarGrupo');
    const grupoId = document.getElementById('grupoId').value;
    const esEdicion = !!grupoId;

    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const body = {
        grado_id:     document.getElementById('grupoGradoId').value,
        nombre:       document.getElementById('grupoNombre').value,
        anio_lectivo: document.getElementById('grupoAnio').value,
        cupo_maximo:  document.getElementById('grupoCupo').value,
    };

    const url    = esEdicion
        ? `/admin/ambientes/${ambienteId}/grupos/${grupoId}`
        : `/admin/ambientes/${ambienteId}/grupos`;
    const method = esEdicion ? 'PUT' : 'POST';

    const { status, data } = await apiFetch(url, method, body);

    btn.disabled = false;
    btn.textContent = esEdicion ? 'Guardar Cambios' : 'Crear Grupo';

    if (status === 200 || status === 201) {
        _getModalGrupo().hide();
        mostrarToast('success', esEdicion ? 'Grupo actualizado.' : 'Grupo creado.');
        setTimeout(() => location.reload(), 600);
    } else if (status === 422 && data.errors) {
        mostrarErroresGrupo(data.errors);
    } else {
        mostrarToast('error', data.mensaje ?? 'Error al guardar el grupo.');
    }
}

/* ── Eliminar grupo ──────────────────────────────────────────── */
async function eliminarGrupo(ambienteId, grupoId, nombreGrupo) {
    const { isConfirmed } = await Swal.fire({
        title: `¿Eliminar "${nombreGrupo}"?`,
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#DC2626',
        cancelButtonColor: '#94A3B8',
    });

    if (!isConfirmed) return;

    const { status, data } = await apiFetch(
        `/admin/ambientes/${ambienteId}/grupos/${grupoId}`,
        'DELETE'
    );

    if (data.ok) {
        const fila = document.getElementById(`fila-grupo-${grupoId}`);
        if (fila) {
            fila.style.transition = 'opacity .25s, max-height .25s';
            fila.style.opacity = '0';
            setTimeout(() => fila.remove(), 250);
        }
        mostrarToast('success', 'Grupo eliminado.');
    } else {
        Swal.fire({
            title: 'No se puede eliminar',
            text: data.mensaje ?? 'No se puede realizar esta acción.',
            icon: 'error',
            confirmButtonColor: '#2563EB',
        });
    }
}
