<script>
    const URL_DOCENTES = "{{ route('admin.docentes') }}";
    const ANIO_LECTIVO_ACTUAL = "{{ date('Y') }}";

    function cerrarModalAsignarInfo() {
        limpiarErroresModal();
        document.activeElement?.blur();
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAsignarInfo'));
        modal?.hide();
    }

    async function abrirModalAsignarGrado(id) {
        try {
            const resp = await ajaxRequest(`${URL_DOCENTES}/${id}`);
            if (!resp.success) throw new Error('No data');

            const data = resp.data;
            document.getElementById('formAsignarInfo').reset();
            document.getElementById('asignar_docente_id').value = data.id;
            document.getElementById('asignar_nombre').textContent = data.nombre ?? '';
            document.getElementById('asignar_anio_lectivo').value = ANIO_LECTIVO_ACTUAL;
            document.getElementById('asignar_grado_id').innerHTML =
                '<option value="">— Selecciona un grado —</option>';
            document.getElementById('asignar_grupos_id').innerHTML =
                '<option value="">— Selecciona un grupo —</option>';
            renderizarAsignacionesActuales(data.asignaciones ?? []);

            const modal = new bootstrap.Modal(document.getElementById('modalAsignarInfo'));
            modal.show();
        } catch (error) {
            console.error('Error:', error);
            mostrarToast('error', 'No se pudo cargar la información del docente');
        }
    }

    function renderizarAsignacionesActuales(asignaciones) {
        const contenedor = document.getElementById('asignaciones_actuales_docente');

        if (!asignaciones || !asignaciones.length) {
            contenedor.innerHTML = 'Sin asignaciones para este año.';
            return;
        }

        contenedor.innerHTML = `
            <ul>
                ${asignaciones.map(asignacion => `
                    <li>
                        <span>${asignacion.ambiente}</span>
                        <strong>${asignacion.grado} ${asignacion.grupo}</strong>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    function mostrarErroresAsignacion(errors) {
        limpiarErroresModal();
        for (const [campo, mensajes] of Object.entries(errors)) {
            const input = document.querySelector(`#formAsignarInfo [name="${campo}"]`);
            if (!input) continue;
            input.classList.add('is-invalid');
            const div = document.createElement('div');
            div.className = 'campo-error';
            div.textContent = mensajes[0];
            input.insertAdjacentElement('afterend', div);
        }
        const primero = document.querySelector('#formAsignarInfo .is-invalid');
        if (primero) primero.focus();
    }

    $(document).on('change', '#asignar_ambiente_id', function() {
        const ambienteId = $(this).val();
        const anio = $('#asignar_anio_lectivo').val();

        $('#asignar_grado_id').html(
            '<option value="">— Selecciona un grado —</option>'
        );
        $('#asignar_grupos_id').html(
            '<option value="">— Selecciona un grupo —</option>'
        );

        if (!ambienteId) return;

        $.get(`/admin/ambientes/${ambienteId}/gradoslistado`, {
            anio_lectivo: anio
        }, function(grados) {
            grados.forEach(grado => {
                $('#asignar_grado_id').append(
                    `<option value="${grado.id}">${grado.nombre}</option>`
                );
            });
        });
    });

    $(document).on('change', '#asignar_grado_id', function() {
        cargarGrupos();
    });

    function cargarGrupos() {
        const ambienteId = $('#asignar_ambiente_id').val();
        const gradoId = $('#asignar_grado_id').val();
        const anio = $('#asignar_anio_lectivo').val();

        $('#asignar_grupos_id').html(
            '<option value="">— Selecciona un grupo —</option>'
        );

        if (!ambienteId || !gradoId || !anio) {
            return;
        }

        $.get(`/admin/grados/${gradoId}/grupos`, {
            anio_lectivo: anio,
            ambiente_id: ambienteId,
        }, function(grupos) {
            grupos.forEach(grupo => {
                $('#asignar_grupos_id').append(
                    `<option value="${grupo.id}">${grupo.nombre}</option>`
                );
            });
        });
    }

    document.getElementById('formAsignarInfo').addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn = document.getElementById('btnAsignarInfo');
        btn.disabled = true;
        btn.textContent = 'Guardando…';

        const formData = new FormData(this);
        const datos = Object.fromEntries(formData.entries());
        const id = datos.id;
        const res = await ajaxRequest(`${URL_DOCENTES}/${id}/asignar-grupo`, 'POST', datos);

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar asignación';

        if (res.success) {
            renderizarAsignacionesActuales(res.data?.asignaciones ?? []);
            document.getElementById('asignar_grado_id').innerHTML =
                '<option value="">— Selecciona un grado —</option>';
            document.getElementById('asignar_grupos_id').innerHTML =
                '<option value="">— Selecciona un grupo —</option>';
            document.getElementById('asignar_ambiente_id').value = '';
            mostrarToast('success', res.message);
            if (window.location.pathname.includes('/admin/docentes/')) {
                location.reload();
            }
        } else if (res.errors && Object.keys(res.errors).length) {
            mostrarErroresAsignacion(res.errors);
        } else {
            mostrarToast('error', res.message || 'Error al guardar');
        }
    });
</script>
