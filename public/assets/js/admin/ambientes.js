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

/* ── Menú de tres puntos ─────────────────────────────────────── */
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

/* ── Verificar conexión ──────────────────────────────────────── */
async function verificarConexion(ambienteId) {
    cerrarTodosMenus();
    const dot = document.getElementById(`dot-${ambienteId}`);
    if (dot) { dot.className = 'dot-conexion dot-check'; dot.title = 'Verificando…'; }

    const { status, data } = await apiFetch(`/admin/ambientes/${ambienteId}/ping`, 'POST');

    if (dot) {
        dot.className = `dot-conexion ${data.ok ? 'dot-online' : 'dot-offline'}`;
        dot.title = data.mensaje;
    }
    mostrarToast(data.ok ? 'success' : 'warning', data.mensaje);
}

/* ══════════════════════════════════════════════════════════════
   Modal: Editar IP
   ══════════════════════════════════════════════════════════════ */
let _modalIpBS  = null;
let _modalIpId  = null;

function abrirModalIp(ambienteId) {
    cerrarTodosMenus();
    _modalIpId = ambienteId;
    const card = document.querySelector(`[data-id="${ambienteId}"]`);
    document.getElementById('inputIp').value = card?.dataset.ip ?? '';
    document.getElementById('errIp').textContent = '';
    if (!_modalIpBS) _modalIpBS = new bootstrap.Modal(document.getElementById('modalIp'));
    _modalIpBS.show();
}

async function guardarIp() {
    const btn = document.getElementById('btnGuardarIp');
    const ip  = document.getElementById('inputIp').value.trim();
    document.getElementById('errIp').textContent = '';
    btn.disabled = true;

    const { status, data } = await apiFetch(
        `/admin/ambientes/${_modalIpId}/ip`,
        'PATCH',
        { servidor_ip: ip || null }
    );
    btn.disabled = false;

    if (data.ok) {
        _modalIpBS.hide();
        mostrarToast('success', 'IP actualizada correctamente.');
        // Actualizar tarjeta sin recargar
        const card = document.querySelector(`[data-id="${_modalIpId}"]`);
        if (card) {
            const nuevoIp = data.servidor_ip ?? 'Sin IP configurada';
            card.dataset.ip = data.servidor_ip ?? '';
            const texto = card.querySelector('.card-ip-texto');
            if (texto) texto.textContent = nuevoIp;
            const cupoInfo = card.querySelector('.card-meta');
            // Resetear dot de conexión
            const dot = document.getElementById(`dot-${_modalIpId}`);
            if (dot) { dot.className = 'dot-conexion'; dot.title = 'Sin verificar'; }
        }
    } else if (status === 422 && data.errors?.servidor_ip) {
        document.getElementById('errIp').textContent = data.errors.servidor_ip[0];
    } else {
        mostrarToast('error', 'Error al guardar la IP.');
    }
}

/* ══════════════════════════════════════════════════════════════
   Modal: Cupo por defecto
   ══════════════════════════════════════════════════════════════ */
let _modalCupoBS = null;
let _modalCupoId = null;

function abrirModalCupo(ambienteId) {
    cerrarTodosMenus();
    _modalCupoId = ambienteId;
    const card = document.querySelector(`[data-id="${ambienteId}"]`);
    document.getElementById('inputCupo').value = card?.dataset.cupo ?? 25;
    document.getElementById('errCupo').textContent = '';
    if (!_modalCupoBS) _modalCupoBS = new bootstrap.Modal(document.getElementById('modalCupo'));
    _modalCupoBS.show();
}

async function guardarCupo() {
    const btn  = document.getElementById('btnGuardarCupo');
    const cupo = parseInt(document.getElementById('inputCupo').value, 10);
    document.getElementById('errCupo').textContent = '';
    btn.disabled = true;

    const { status, data } = await apiFetch(
        `/admin/ambientes/${_modalCupoId}/cupo`,
        'PATCH',
        { cupo_defecto: cupo }
    );
    btn.disabled = false;

    if (data.ok) {
        _modalCupoBS.hide();
        mostrarToast('success', 'Cupo por defecto actualizado.');
        // Actualizar tarjeta y data-cupo
        const card = document.querySelector(`[data-id="${_modalCupoId}"]`);
        if (card) {
            card.dataset.cupo = data.cupo_defecto;
            // Actualizar texto en card-meta
            const spans = card.querySelectorAll('.card-meta span');
            spans.forEach(s => {
                if (s.textContent.includes('Cupo defecto')) {
                    s.innerHTML = `<i class="fas fa-users-cog"></i> Cupo defecto: <strong>${data.cupo_defecto}</strong>`;
                }
            });
            // Actualizar el badge del menú
            const menuBtn = card.querySelector(`#menu-${_modalCupoId} button:nth-child(2)`);
        }
    } else if (status === 422 && data.errors?.cupo_defecto) {
        document.getElementById('errCupo').textContent = data.errors.cupo_defecto[0];
    } else {
        mostrarToast('error', 'Error al guardar el cupo.');
    }
}

/* ══════════════════════════════════════════════════════════════
   Modal: Docentes del período
   ══════════════════════════════════════════════════════════════ */
let _modalDocentesBS = null;

async function abrirModalDocentes(ambienteId, nombreAmbiente) {
    cerrarTodosMenus();
    const titulo     = document.getElementById('modalDocentesTitulo');
    const contenedor = document.getElementById('listaDocentes');

    if (titulo) titulo.innerHTML = `<i class="fas fa-chalkboard-teacher me-2"></i>${nombreAmbiente} — Docentes`;
    contenedor.innerHTML = '<p class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Cargando…</p>';

    if (!_modalDocentesBS) _modalDocentesBS = new bootstrap.Modal(document.getElementById('modalDocentes'));
    _modalDocentesBS.show();

    const { status, data } = await apiFetch(`/admin/ambientes/${ambienteId}/docentes`);

    if (data.ok && data.docentes.length > 0) {
        contenedor.innerHTML = `
            <table class="tabla-docentes">
                <thead>
                    <tr>
                        <th>Docente</th>
                        <th>Grado</th>
                        <th>Grupo</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.docentes.map(d => `
                        <tr>
                            <td>
                                <div style="font-weight:600;color:#1E293B">${d.nombre}</div>
                                <div style="font-size:.78rem;color:#64748B">${d.email}</div>
                            </td>
                            <td style="color:#475569">${d.grado}</td>
                            <td style="color:#475569">${d.grupo}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } else if (data.ok) {
        contenedor.innerHTML = '<p class="text-center text-muted py-4">Sin docentes asignados en el período actual.</p>';
    } else {
        contenedor.innerHTML = '<p class="text-center text-danger py-4">Error al cargar los docentes.</p>';
    }
}

/* ══════════════════════════════════════════════════════════════
   Modal: Módulos de contenido
   ══════════════════════════════════════════════════════════════ */
let _modalModulosBS  = null;
let _modalModulosId  = null;

async function abrirModalModulos(ambienteId, nombreAmbiente) {
    cerrarTodosMenus();
    _modalModulosId = ambienteId;
    const titulo     = document.getElementById('modalModulosTitulo');
    const contenedor = document.getElementById('listaModulos');

    if (titulo) titulo.innerHTML = `<i class="fas fa-cubes me-2"></i>${nombreAmbiente} — Módulos`;
    contenedor.innerHTML = '<p class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin me-2"></i>Cargando…</p>';

    if (!_modalModulosBS) _modalModulosBS = new bootstrap.Modal(document.getElementById('modalModulos'));
    _modalModulosBS.show();

    const { status, data } = await apiFetch(`/admin/ambientes/${ambienteId}/modulos`);

    if (data.ok) {
        renderModulos(data.modulos);
    } else {
        contenedor.innerHTML = '<p class="text-center text-danger py-4">Error al cargar los módulos.</p>';
    }
}

function renderModulos(modulos) {
    const contenedor = document.getElementById('listaModulos');

    if (!modulos || modulos.length === 0) {
        contenedor.innerHTML = '<p class="text-center text-muted py-4">Este ambiente no tiene módulos registrados.</p>';
        return;
    }

    contenedor.innerHTML = modulos.map(m => `
        <div class="modulo-fila" id="modfila-${m.id}">
            <div class="modulo-icono">${m.icono ?? '📦'}</div>
            <div class="modulo-nombre">${m.nombre}</div>
            <div class="modulo-toggles">
                <label class="tog" title="Visible para docentes">
                    <input type="checkbox" ${m.activo ? 'checked' : ''}
                        onchange="toggleModulo(_modalModulosId, ${m.id}, 'activo', this)">
                    <span class="tog-track"></span>
                    <span>Activo</span>
                </label>
                <label class="tog" title="Visible para estudiantes">
                    <input type="checkbox" ${m.visible_estudiantes ? 'checked' : ''}
                        onchange="toggleModulo(_modalModulosId, ${m.id}, 'visible_estudiantes', this)">
                    <span class="tog-track"></span>
                    <span>Visible</span>
                </label>
            </div>
        </div>
    `).join('');
}

async function toggleModulo(ambienteId, moduloId, campo, checkbox) {
    const { status, data } = await apiFetch(
        `/admin/ambientes/${ambienteId}/modulos/${moduloId}/toggle`,
        'PATCH',
        { campo }
    );

    if (!data.ok) {
        checkbox.checked = !checkbox.checked;
        mostrarToast('error', 'Error al cambiar el módulo.');
    }
}

/* ══════════════════════════════════════════════════════════════
   SECCIÓN: GRADOS Y GRUPOS (vista interior del ambiente)
   ══════════════════════════════════════════════════════════════ */

async function toggleGrado(ambienteId, gradoId, nombreGrado, checkbox) {
    const { status, data } = await apiFetch(
        `/admin/ambientes/${ambienteId}/grados/${gradoId}/toggle`,
        'PATCH'
    );

    if (status === 200) {
        const body = document.getElementById(`body-grado-${gradoId}`);
        if (body) body.classList.toggle('oculto', !data.habilitado);
        checkbox.checked = data.habilitado;
    } else {
        checkbox.checked = !checkbox.checked;
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

function abrirModalGrupo(gradoId = null, grupoId = null, grupoNombre = null, cupMaximo = null) {
    limpiarErroresGrupo();
    document.getElementById('formGrupo').reset();

    const titulo     = document.getElementById('modalGrupoTitulo');
    const btnGuardar = document.getElementById('btnGuardarGrupo');
    const idInput    = document.getElementById('grupoId');
    const anioInput  = document.getElementById('grupoAnio');

    idInput.value = grupoId ?? '';

    // Siempre sincronizar el año con el selector de la vista
    if (anioInput && typeof ANIO_LECTIVO !== 'undefined') {
        anioInput.value = ANIO_LECTIVO;
    }

    if (grupoId) {
        titulo.textContent     = 'Editar Grupo';
        btnGuardar.textContent = 'Guardar Cambios';
        if (gradoId)     document.getElementById('grupoGradoId').value = gradoId;
        if (grupoNombre) document.getElementById('grupoNombre').value  = grupoNombre;
        document.getElementById('grupoCupo').value       = cupMaximo ?? (typeof CUPO_DEFECTO !== 'undefined' ? CUPO_DEFECTO : 25);
        document.getElementById('grupoGradoId').disabled = true;
    } else {
        titulo.textContent     = 'Nuevo Grupo';
        btnGuardar.textContent = 'Crear Grupo';
        if (gradoId) document.getElementById('grupoGradoId').value = gradoId;
        document.getElementById('grupoCupo').value       = typeof CUPO_DEFECTO !== 'undefined' ? CUPO_DEFECTO : 25;
        document.getElementById('grupoGradoId').disabled = false;
    }

    _getModalGrupo().show();
}

function cambiarAnio(anio) {
    if (typeof URL_GRADOS_BASE === 'undefined') return;
    window.location.href = `${URL_GRADOS_BASE}?anio=${anio}`;
}

document.getElementById('modalGrupo')?.addEventListener('hidden.bs.modal', function () {
    limpiarErroresGrupo();
    document.getElementById('formGrupo').reset();
    document.getElementById('grupoGradoId').disabled = false;
    // Restaurar el año al del selector de la vista
    const anioInput = document.getElementById('grupoAnio');
    if (anioInput && typeof ANIO_LECTIVO !== 'undefined') anioInput.value = ANIO_LECTIVO;
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

    const btn      = document.getElementById('btnGuardarGrupo');
    const grupoId  = document.getElementById('grupoId').value;
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
            fila.style.transition = 'opacity .25s';
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
