/* ── Bootstrap Modal ─────────────────────────────────────────── */
const modalBSReestablecerContrasena = new bootstrap.Modal(document.getElementById('modalReestablecerContrasena'));
const modalBSEditarDocente = new bootstrap.Modal(document.getElementById('modalEditarDocente'));

// Al cerrar cualquier modal, limpiar errores y resetear el formulario correspondiente.
document.getElementById('modalEditarDocente').addEventListener('hidden.bs.modal', function () {
    limpiarErroresModal();
    document.getElementById('formEditarDocente').reset();
});

function abrirModalReestablecerContrasena(id) {
    modalBSReestablecerContrasena.show();
}

function cerrarModalReestablecerContrasena() {
    document.activeElement?.blur();
    modalBSReestablecerContrasena.hide();
}

/* ── Cerrar modal Editar Docente ─────────────────────────── */
function cerrarModalEditarDocente() {
    document.activeElement?.blur();
    modalBSEditarDocente.hide();
}

function abrirModalEditarDocente(id) {
    fetch(`${URL_DOCENTES}/${id}`)
        .then(response => response.json())
        .then(resp => {
            if (!resp.success) throw new Error('No data');
            const data = resp.data;
            document.getElementById('editar_docente_id').value = data.id;
            document.getElementById('editar_nombre').value = data.nombre ?? '';
            document.getElementById('editar_email').value = data.email ?? '';
            document.getElementById('editar_descripcion').value = data.descripcion ?? '';
            console.log(data);
            modalBSEditarDocente.show();
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarToast('error', 'No se pudo cargar la información del docente');
        });
}

/* ── Formulario Reestablecer Contraseña ────────────────────────────────────── */
document.getElementById('formReestablecerContrasena').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnReestablecerContrasena');
    btn.disabled = true;
    btn.textContent = 'Reestableciendo…';

    const formData = new FormData(this);
    const datos = Object.fromEntries(formData.entries());
    const id = datos.id;
    const res = await ajaxRequest(`${URL_DOCENTES}/${id}/reset-password`, 'POST', datos);

    btn.disabled = false;
    btn.textContent = 'Reestablecer';

    if (res.success) {
        mostrarToast('success', res.message || 'Contraseña reestablecida.');
    } else {
        mostrarToast('error', res.message || 'Error al reestablecer la contraseña');
    }
});

/* ── Formulario Editar Docente ────────────────────────────────────── */
document.getElementById('formEditarDocente').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnEditarDocente');
    btn.disabled = true;
    btn.textContent = 'Guardando…';

    const formData = new FormData(this);
    const datos = Object.fromEntries(formData.entries());
    const id = datos.id;
    const res = await ajaxRequest(`${URL_DOCENTES}/${id}`, 'PUT', datos);

    btn.disabled = false;
    btn.textContent = 'Guardar';

    if (res.success) {
        mostrarToast('success', res.message || 'Datos del docente actualizados.');
    } else {
        btn.disabled = false;
        btn.textContent = 'Guardar';
        mostrarToast('error', res.message || 'Error al actualizar los datos del docente');
    }
});

