document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector('.config-sistema');
    if (!root) return;

    const rootEjesEl = document.querySelector('.config-sa-ejes');
    const rootEjes = rootEjesEl || (root.classList.contains('config-sa-ejes') ? root : null);

    const modalEl = document.getElementById('modalCrearModulos');
    const form = document.getElementById('formCrearModulo');
    const btnGuardar = document.getElementById('btnGuardarModulo');
    const totalInstituciones = Number(root.dataset.totalInstituciones || 0);

    const modalEjesEl = document.getElementById('modalVerEjesModulo');
    const formEje = document.getElementById('formCrearEje');
    const btnGuardarEje = document.getElementById('btnGuardarEje');
    const btnCancelarEje = document.getElementById('btnCancelarEje');
    const tablaEjesBody = document.getElementById('tablaEjesModuloBody')
        || modalEjesEl?.querySelector('[data-tbody-ejes]');
    const ejesEmpty = document.getElementById('ejesModuloEmpty')
        || modalEjesEl?.querySelector('[data-empty-ejes]');
    const ejesLoading = document.getElementById('ejesModuloLoading');
    const ejesError = document.getElementById('ejesModuloError');
    const ejesContenido = document.getElementById('ejesModuloContenido');

    function urlFromTemplate(template, replacements) {
        let url = template || '';
        Object.entries(replacements).forEach(([key, value]) => {
            url = url.replace(key, value);
        });
        return url;
    }

    function urls() {
        return {
            store: (ambienteId) => urlFromTemplate(root.dataset.urlStoreTemplate, {
                '__AMBIENTE__': ambienteId,
            }),
            show: (moduloId) => urlFromTemplate(root.dataset.urlShowTemplate, {
                '__MODULO__': moduloId,
            }),
            update: (moduloId) => urlFromTemplate(root.dataset.urlUpdateTemplate, {
                '__MODULO__': moduloId,
            }),
            estado: (moduloId) => urlFromTemplate(root.dataset.urlEstadoTemplate, {
                '__MODULO__': moduloId,
            }),
            mover: (moduloId) => urlFromTemplate(root.dataset.urlMoverTemplate, {
                '__MODULO__': moduloId,
            }),
            ejes: (moduloId) => urlFromTemplate(root.dataset.urlEjesTemplate, {
                '__MODULO__': moduloId,
            }),
            ejesShow: (ejeId) => urlFromTemplate(root.dataset.urlEjesShowTemplate, {
                '__EJE__': ejeId,
            }),
            ejesUpdate: (ejeId) => urlFromTemplate(root.dataset.urlEjesUpdateTemplate, {
                '__EJE__': ejeId,
            }),
            ejesMover: (ejeId) => urlFromTemplate(root.dataset.urlEjesMoverTemplate, {
                '__EJE__': ejeId,
            }),
            ejesEstado: (ejeId) => urlFromTemplate(root.dataset.urlEjesEstadoTemplate, {
                '__EJE__': ejeId,
            }),
        };
    }

    function getModal() {
        return modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;
    }

    function getModalEjes() {
        return modalEjesEl ? bootstrap.Modal.getOrCreateInstance(modalEjesEl) : null;
    }

    function escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function slugify(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'se genera automáticamente';
    }

    function bindAmbienteToggles(container) {
        if (!container) return;
        container.querySelectorAll('[data-amb-toggle]').forEach((head) => {
            head.addEventListener('click', () => {
                const group = head.closest('.amb-group');
                if (!group) return;
                const wasCollapsed = group.classList.contains('is-collapsed');
                container.querySelectorAll('.amb-group').forEach((other) => {
                    other.classList.add('is-collapsed');
                    other.querySelector('[data-amb-toggle]')?.setAttribute('aria-expanded', 'false');
                });
                if (wasCollapsed) {
                    group.classList.remove('is-collapsed');
                    head.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    bindAmbienteToggles(root);
    window.ConfigEjesUi?.bindModuloToggles(rootEjes);

    /* ── Módulos ─────────────────────────────────────────────── */
    function limpiarErroresForm() {
        if (!form) return;
        form.querySelectorAll('.campo-error').forEach((el) => el.remove());
        form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    }

    function mostrarErroresForm(errors) {
        limpiarErroresForm();
        if (!errors || !form) return;

        Object.entries(errors).forEach(([campo, mensajes]) => {
            const input = form.querySelector(`[name="${campo}"]`);
            if (!input) return;
            input.classList.add('is-invalid');
            const div = document.createElement('div');
            div.className = 'campo-error invalid-feedback d-block';
            div.textContent = mensajes[0];
            input.insertAdjacentElement('afterend', div);
        });
    }

    function setBtnGuardar(modo) {
        if (!btnGuardar) return;
        btnGuardar.disabled = false;
        if (modo === 'creando') {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
        } else if (modo === 'guardando') {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
        } else if (modo === 'crear') {
            btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear módulo';
        } else {
            btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        }
    }

    function setOrdenEditable(editable) {
        const input = document.getElementById('modulo_orden');
        if (!input) return;
        input.disabled = !editable;
        input.title = editable ? '' : 'El orden se cambia con las flechas de la tabla';
    }

    function resetFormModulo() {
        if (!form) return;
        form.reset();
        limpiarErroresForm();
        document.getElementById('modulo_id').value = '';
        document.getElementById('modulo_ambiente_id').value = '';
        document.getElementById('modulo_slug_preview').textContent = 'se genera automáticamente';
        setOrdenEditable(true);
    }

    function getGroup(ambienteId) {
        return root.querySelector(`.amb-group[data-ambiente-id="${ambienteId}"]`);
    }

    function getTbody(group) {
        return group?.querySelector('tbody') || null;
    }

    function actualizarBotonesReorder(tbody) {
        if (!tbody) return;
        const rows = [...tbody.querySelectorAll('tr[data-modulo-id]')];
        rows.forEach((row, index) => {
            const btnUp = row.querySelector('.btn-reorder[data-dir="arriba"]');
            const btnDown = row.querySelector('.btn-reorder[data-dir="abajo"]');
            if (btnUp) btnUp.disabled = index === 0;
            if (btnDown) btnDown.disabled = index === rows.length - 1;
        });
    }

    function actualizarContadorGrupo(group) {
        if (!group || group.querySelector('.mod-ejes-group')) return;
        const rows = group.querySelectorAll('tbody tr[data-modulo-id]');
        const total = rows.length;
        const activos = [...rows].filter((r) => r.dataset.activo === '1').length;
        const label = group.querySelector('.amb-count');
        if (!label) return;
        const palabra = total === 1 ? 'módulo oficial' : 'módulos oficiales';
        label.textContent = `${total} ${palabra} · ${activos} activos`;
    }

    function ensureTable(group) {
        let tbody = getTbody(group);
        if (tbody) return tbody;

        group.querySelector('.cfg-empty')?.remove();

        const wrap = document.createElement('div');
        wrap.className = 'table-container ';
        wrap.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th style="width:34px"></th>
                        <th>Módulo</th>
                        <th>Slug</th>
                        <th>Estado</th>
                        <th>Instituciones activas</th>
                        <th>Creado</th>
                        <th style="text-align:right">Acciones</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `;

        const foot = group.querySelector('.amb-foot');
        group.querySelector('.amb-body').insertBefore(wrap, foot);
        return wrap.querySelector('tbody');
    }

    function crearFilaModulo(data) {
        const activo = !!data.activo;
        const tr = document.createElement('tr');
        tr.dataset.moduloId = data.id;
        tr.dataset.nombre = data.nombre;
        tr.dataset.orden = String(data.orden ?? 0);
        tr.dataset.activo = activo ? '1' : '0';
        tr.dataset.instActivas = String(data.instituciones_activas_count ?? 0);
        tr.dataset.temasActivos = String(data.temas_activos_count ?? 0);

        tr.innerHTML = `
            <td>
                <div class="reorder">
                    <button type="button" class="btn-reorder" data-dir="arriba" title="Subir">▲</button>
                    <button type="button" class="btn-reorder" data-dir="abajo" title="Bajar">▼</button>
                </div>
            </td>
            <td>
                <div class="mod-name">
                    <span class="mod-nombre-texto">${escapeHtml(data.nombre)}</span>
                    <span class="star">⭐ Oficial</span>
                </div>
            </td>
            <td class="slug">${escapeHtml(data.slug)}</td>
            <td>
                <div class="state-row">
                    <button type="button" class="switch ${activo ? 'on' : ''}"
                        data-toggle-estado aria-label="Cambiar estado"
                        title="${activo ? 'Desactivar' : 'Activar'}"></button>
                </div>
            </td>
            <td class="col-inst-activas">${Number(data.instituciones_activas_count || 0)} / ${totalInstituciones}</td>
            <td class="col-creado">${escapeHtml(data.created_at || '—')}</td>
            <td class="col-actions">
            <div class="row-actions d-flex justify-content-center">
                <button type="button" class="btn-accion btn-asignar-grado" data-ejes-modulo
                    title="Ver ejes del módulo">
                    <i class="fa-solid fa-diagram-project"></i> Ejes
                </button>
                <button type="button" class="btn-accion btn-editar" data-editar-modulo
                    title="Editar módulo">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
            </div>
        </td>
        `;
        return tr;
    }

    function colocarFilaPorOrden(tbody, row, orden) {
        row.dataset.orden = String(orden);
        const siblings = [...tbody.querySelectorAll('tr[data-modulo-id]')].filter((r) => r !== row);
        const next = siblings.find((r) => Number(r.dataset.orden) > Number(orden));
        if (next) tbody.insertBefore(row, next);
        else tbody.appendChild(row);
        actualizarBotonesReorder(tbody);
    }

    function pintarFilaModulo(row, data) {
        row.dataset.nombre = data.nombre;
        row.dataset.orden = String(data.orden ?? row.dataset.orden ?? 0);
        row.dataset.activo = data.activo ? '1' : '0';
        row.dataset.instActivas = String(data.instituciones_activas_count ?? row.dataset.instActivas ?? 0);
        row.dataset.temasActivos = String(data.temas_activos_count ?? row.dataset.temasActivos ?? 0);

        const nombreEl = row.querySelector('.mod-nombre-texto') || row.querySelector('.mod-name');
        if (nombreEl) {
            if (nombreEl.classList.contains('mod-nombre-texto')) {
                nombreEl.textContent = data.nombre;
            } else {
                const texto = [...nombreEl.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
                if (texto) texto.textContent = data.nombre + ' ';
                else {
                    const span = document.createElement('span');
                    span.className = 'mod-nombre-texto';
                    span.textContent = data.nombre;
                    nombreEl.prepend(span);
                }
            }
        }

        const slugEl = row.querySelector('.slug');
        if (slugEl) slugEl.textContent = data.slug;

        const switchBtn = row.querySelector('[data-toggle-estado]');
        if (switchBtn) {
            switchBtn.classList.toggle('on', !!data.activo);
            switchBtn.title = data.activo ? 'Desactivar' : 'Activar';
        }

        const instEl = row.querySelector('.col-inst-activas');
        if (instEl) {
            instEl.textContent = `${Number(data.instituciones_activas_count || 0)} / ${totalInstituciones}`;
        }
    }

    function insertarOActualizarModulo(data) {
        const group = getGroup(data.ambiente_id);
        if (!group) return;

        const tbody = ensureTable(group);
        let row = tbody.querySelector(`tr[data-modulo-id="${data.id}"]`);

        if (!row) {
            row = crearFilaModulo(data);
            colocarFilaPorOrden(tbody, row, data.orden);
        } else {
            pintarFilaModulo(row, data);
            colocarFilaPorOrden(tbody, row, data.orden);
        }

        actualizarContadorGrupo(group);
    }

    window.abrirModalCrearModulos = function (ambienteId, ambienteNombre) {
        if (!modalEl) return;
        resetFormModulo();
        document.getElementById('modulo_ambiente_id').value = ambienteId;
        document.getElementById('modalCrearModulosLabel').textContent = 'Nuevo módulo';
        document.getElementById('modalCrearModulosSubtitle').textContent =
            ambienteNombre ? `Ambiente: ${ambienteNombre}` : 'Completa los datos del módulo';
        document.getElementById('modalCrearModulosIcon').className = 'fas fa-cube text-white';
        setOrdenEditable(true);
        setBtnGuardar('crear');
        getModal()?.show();
    };

    async function abrirModalEditarModulo(moduloId, ambienteNombre) {
        if (!modalEl) return;
        resetFormModulo();
        setBtnGuardar('editar');
        document.getElementById('modalCrearModulosLabel').textContent = 'Editar módulo';
        document.getElementById('modalCrearModulosSubtitle').textContent =
            ambienteNombre ? `Ambiente: ${ambienteNombre}` : 'Actualiza los datos del módulo';
        document.getElementById('modalCrearModulosIcon').className = 'fas fa-pen text-white';
        setOrdenEditable(false);
        getModal()?.show();

        const res = await ajaxRequest(urls().show(moduloId), 'GET');
        if (!res.success) {
            mostrarToast('error', res.message || 'No se pudo cargar el módulo');
            bootstrap.Modal.getInstance(modalEl)?.hide();
            return;
        }

        const data = res.data;
        document.getElementById('modulo_id').value = data.id;
        document.getElementById('modulo_ambiente_id').value = data.ambiente_id;
        document.getElementById('modulo_nombre').value = data.nombre || '';
        document.getElementById('modulo_descripcion').value = data.descripcion || '';
        document.getElementById('modulo_orden').value = data.orden ?? '';
        document.getElementById('modulo_slug_preview').textContent = data.slug || slugify(data.nombre);
    }

    if (form || root.querySelector('[data-crear-modulo]')) {
        root.addEventListener('click', async (e) => {
            const btnCrear = e.target.closest('[data-crear-modulo]');
            if (btnCrear) {
                abrirModalCrearModulos(btnCrear.dataset.ambienteId, btnCrear.dataset.ambienteNombre || '');
                return;
            }

            const btnEditar = e.target.closest('[data-editar-modulo]');
            if (btnEditar) {
                const row = btnEditar.closest('tr');
                const group = btnEditar.closest('.amb-group');
                const ambienteNombre = group?.querySelector('.amb-title')?.textContent?.trim() || '';
                abrirModalEditarModulo(row.dataset.moduloId, ambienteNombre);
                return;
            }

            const btnEjes = e.target.closest('[data-ejes-modulo]');
            if (btnEjes) {
                const row = btnEjes.closest('tr');
                abrirModalEjesModulo(row.dataset.moduloId, row.dataset.nombre || '');
                return;
            }

            const btnToggle = e.target.closest('[data-toggle-estado]');
            if (btnToggle && !btnToggle.hasAttribute('data-toggle-estado-eje')) {
                const row = btnToggle.closest('tr[data-modulo-id]');
                if (!row) return;
                const moduloId = row.dataset.moduloId;
                const nombre = row.dataset.nombre || 'este módulo';
                const activo = row.dataset.activo === '1';
                const instActivas = Number(row.dataset.instActivas || 0);
                const temasActivos = Number(row.dataset.temasActivos || 0);

                if (activo) {
                    const html = `
                        <div style="text-align:left">
                            ${instActivas > 0
                            ? `<p>Este cambio afecta a <b>${instActivas}</b> institución(es) activa(s).</p>`
                            : ''}
                            ${temasActivos > 0
                            ? `<p>Este módulo tiene <b>${temasActivos}</b> temática(s) activa(s). Se ocultará el contenido, pero no se eliminará.</p>`
                            : ''}
                            <p>¿Desactivar <b>${escapeHtml(nombre)}</b>?</p>
                        </div>
                    `;
                    const confirmacion = await Swal.fire({
                        title: 'Confirmar desactivación',
                        html,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, desactivar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#C14A2F',
                        reverseButtons: true,
                    });
                    if (!confirmacion.isConfirmed) return;
                }

                btnToggle.disabled = true;
                const res = await ajaxRequest(urls().estado(moduloId), 'PATCH');
                btnToggle.disabled = false;

                if (!res.success) {
                    mostrarToast('error', res.message || 'No se pudo cambiar el estado');
                    return;
                }

                const nuevoActivo = !!res.activo;
                row.dataset.activo = nuevoActivo ? '1' : '0';
                btnToggle.classList.toggle('on', nuevoActivo);
                btnToggle.title = nuevoActivo ? 'Desactivar' : 'Activar';
                actualizarContadorGrupo(row.closest('.amb-group'));
                mostrarToast('success', res.message);
                return;
            }

            const btnReorder = e.target.closest('.btn-reorder');
            if (btnReorder) {
                const row = btnReorder.closest('tr[data-modulo-id]');
                if (!row || btnReorder.closest('tr[data-eje-id]')) return;
                if (btnReorder.disabled) return;

                const tbody = row.parentElement;
                const direccion = btnReorder.dataset.dir;
                const moduloId = row.dataset.moduloId;

                btnReorder.disabled = true;
                const res = await ajaxRequest(urls().mover(moduloId), 'PATCH', { direccion });
                btnReorder.disabled = false;

                if (!res.success) {
                    mostrarToast('error', res.message || 'No se pudo reordenar');
                    actualizarBotonesReorder(tbody);
                    return;
                }

                if (direccion === 'arriba') {
                    const prev = row.previousElementSibling;
                    if (prev) {
                        const ordenRow = row.dataset.orden;
                        row.dataset.orden = prev.dataset.orden;
                        prev.dataset.orden = ordenRow;
                        tbody.insertBefore(row, prev);
                    }
                } else {
                    const next = row.nextElementSibling;
                    if (next) {
                        const ordenRow = row.dataset.orden;
                        row.dataset.orden = next.dataset.orden;
                        next.dataset.orden = ordenRow;
                        tbody.insertBefore(next, row);
                    }
                }

                actualizarBotonesReorder(tbody);
                mostrarToast('success', res.message || 'Orden actualizado');
            }
        });

        document.getElementById('modulo_nombre')?.addEventListener('input', (e) => {
            const moduloId = document.getElementById('modulo_id')?.value;
            if (moduloId) return;
            const preview = document.getElementById('modulo_slug_preview');
            if (preview) preview.textContent = slugify(e.target.value);
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            limpiarErroresForm();

            const moduloId = document.getElementById('modulo_id').value;
            const ambienteId = document.getElementById('modulo_ambiente_id').value;
            const esEdicion = Boolean(moduloId);
            const payload = {
                nombre: document.getElementById('modulo_nombre').value.trim(),
                descripcion: document.getElementById('modulo_descripcion').value.trim() || null,
            };
            const ordenVal = document.getElementById('modulo_orden').value;
            if (!esEdicion && ordenVal !== '') payload.orden = Number(ordenVal);

            setBtnGuardar(esEdicion ? 'guardando' : 'creando');

            const endpoint = esEdicion ? urls().update(moduloId) : urls().store(ambienteId);
            const method = esEdicion ? 'PUT' : 'POST';
            const res = await ajaxRequest(endpoint, method, payload);

            setBtnGuardar(esEdicion ? 'editar' : 'crear');

            if (!res.success) {
                if (res.errors) mostrarErroresForm(res.errors);
                mostrarToast('error', res.message || 'No se pudo guardar el módulo');
                return;
            }

            bootstrap.Modal.getInstance(modalEl)?.hide();
            if (res.data) insertarOActualizarModulo(res.data);
            mostrarToast('success', res.message || 'Guardado');
        });

        root.querySelectorAll('tbody').forEach((tbody) => {
            if (tbody.querySelector('tr[data-modulo-id]')) actualizarBotonesReorder(tbody);
        });
    }

    /* ── Ejes (modal Ver + modal Crear/Editar página) ────────── */
    const modalCrearEjeEl = document.getElementById('modalCrearEjes');
    const formEjePagina = document.getElementById('formCrearEjePagina');
    const btnGuardarEjePagina = document.getElementById('btnGuardarEjePagina');

    function getModalCrearEje() {
        return modalCrearEjeEl ? bootstrap.Modal.getOrCreateInstance(modalCrearEjeEl) : null;
    }

    function limpiarErroresFormEje(formRef = formEje) {
        if (!formRef) return;
        formRef.querySelectorAll('.campo-error').forEach((el) => el.remove());
        formRef.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    }

    function mostrarErroresFormEje(errors, formRef = formEje) {
        limpiarErroresFormEje(formRef);
        if (!errors || !formRef) return;
        Object.entries(errors).forEach(([campo, mensajes]) => {
            const input = formRef.querySelector(`[name="${campo}"]`);
            if (!input) return;
            input.classList.add('is-invalid');
            const div = document.createElement('div');
            div.className = 'campo-error invalid-feedback d-block';
            div.textContent = mensajes[0];
            input.insertAdjacentElement('afterend', div);
        });
    }

    function setBtnGuardarEje(modo, btn = btnGuardarEje) {
        if (!btn) return;
        btn.disabled = false;
        if (modo === 'creando') {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
        } else if (modo === 'guardando') {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
        } else if (modo === 'editar') {
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear eje';
        }
    }

    function setOrdenEjeEditable(editable, inputEl) {
        const input = inputEl
            || formEje?.querySelector('[name="orden"]')
            || document.getElementById('eje_orden');
        if (!input) return;
        input.disabled = !editable;
        input.title = editable ? '' : 'El orden se cambia con las flechas de la tabla';
    }

    function setTituloFormEjeModal(modo) {
        const icon = document.getElementById('ejesFormTitleIcon');
        const text = document.getElementById('ejesFormTitleText');
        if (icon) icon.className = modo === 'editar' ? 'fa-solid fa-pen' : 'fa-solid fa-plus';
        if (text) text.textContent = modo === 'editar' ? 'Editar eje oficial' : 'Nuevo eje oficial';
        if (btnCancelarEje) btnCancelarEje.hidden = modo !== 'editar';
    }

    function resetFormEjeModal() {
        if (!formEje) return;
        formEje.reset();
        limpiarErroresFormEje(formEje);
        const ejeId = document.getElementById('eje_id');
        if (ejeId) ejeId.value = '';
        const preview = document.getElementById('eje_slug_preview');
        if (preview) preview.textContent = 'se genera automáticamente';
        setOrdenEjeEditable(true, document.getElementById('eje_orden'));
        setTituloFormEjeModal('crear');
        setBtnGuardarEje('crear', btnGuardarEje);
    }

    function resetFormEjePagina() {
        if (!formEjePagina) return;
        formEjePagina.reset();
        limpiarErroresFormEje(formEjePagina);
        document.getElementById('eje_pagina_id').value = '';
        document.getElementById('eje_pagina_modulo_id').value = '';
        document.getElementById('eje_pagina_slug_preview').textContent = 'se genera automáticamente';
        setOrdenEjeEditable(true, document.getElementById('eje_pagina_orden'));
        setBtnGuardarEje('crear', btnGuardarEjePagina);
    }

    function setEstadoModalEjes(estado, mensajeError = '') {
        if (ejesLoading) ejesLoading.hidden = estado !== 'loading';
        if (ejesError) {
            ejesError.hidden = estado !== 'error';
            ejesError.textContent = mensajeError;
        }
        if (ejesContenido) ejesContenido.hidden = estado !== 'ready';
    }

    function filasEjesEn(tbody) {
        if (!tbody) return [];
        return [...tbody.querySelectorAll('tr[data-eje-id]')];
    }

    function actualizarBotonesReorderEjes(tbody) {
        const rows = filasEjesEn(tbody);
        rows.forEach((row, index) => {
            const btnUp = row.querySelector('.btn-reorder[data-dir="arriba"]');
            const btnDown = row.querySelector('.btn-reorder[data-dir="abajo"]');
            if (btnUp) btnUp.disabled = index === 0;
            if (btnDown) btnDown.disabled = index === rows.length - 1;
        });
    }

    function sincronizarVisibilidadEjes(scope) {
        if (!scope) return;
        const tbody = scope.querySelector('[data-tbody-ejes]');
        const wrap = scope.querySelector('[data-wrap-ejes]');
        const emptyEl = scope.querySelector('[data-empty-ejes]');
        const count = filasEjesEn(tbody).length;
        if (wrap) wrap.hidden = count === 0;
        if (emptyEl) emptyEl.hidden = count > 0;
        actualizarBotonesReorderEjes(tbody);
    }

    function grupoEjesPagina(moduloId) {
        return rootEjes?.querySelector(`.mod-ejes-group[data-modulo-id="${moduloId}"]`) || null;
    }

    function actualizarContadoresEjesGrupo(group) {
        if (!group) return;
        const rows = filasEjesEn(group.querySelector('[data-tbody-ejes]'));
        const total = rows.length;
        const activos = rows.filter((r) => r.dataset.activo === '1').length;

        const hint = group.querySelector('.mod-ejes-hint');
        if (hint) {
            hint.textContent = `${total} ${total === 1 ? 'eje' : 'ejes'} · ${activos} activos`;
        }

        const ambGroup = group.closest('.amb-group');
        if (!ambGroup) return;
        let totalAmb = 0;
        let activosAmb = 0;
        ambGroup.querySelectorAll('.mod-ejes-group').forEach((g) => {
            const r = filasEjesEn(g.querySelector('[data-tbody-ejes]'));
            totalAmb += r.length;
            activosAmb += r.filter((x) => x.dataset.activo === '1').length;
        });
        const countEl = ambGroup.querySelector('.amb-count');
        if (countEl) {
            countEl.textContent = `${totalAmb} ${totalAmb === 1 ? 'eje' : 'ejes'} · ${activosAmb} activos`;
        }
    }

    function crearFilaEje(data) {
        const activo = !!data.activo;
        const tr = document.createElement('tr');
        tr.dataset.ejeId = data.id;
        tr.dataset.moduloId = String(data.modulo_id ?? '');
        tr.dataset.nombre = data.nombre || '';
        tr.dataset.orden = String(data.orden ?? 0);
        tr.dataset.activo = activo ? '1' : '0';
        tr.dataset.puedeGestionar = '1';
        tr.dataset.temasCount = String(data.temas_count ?? 0);
        tr.className = 'fila-oficial';

        const descripcion = data.descripcion
            ? escapeHtml(data.descripcion)
            : '<span class="text-muted">—</span>';

        tr.innerHTML = `
            <td>
                <div class="reorder">
                    <button type="button" class="btn-reorder" data-dir="arriba" title="Subir">▲</button>
                    <button type="button" class="btn-reorder" data-dir="abajo" title="Bajar">▼</button>
                </div>
            </td>
            <td>
                <div class="mod-name">
                    <span class="eje-nombre-texto">${escapeHtml(data.nombre)}</span>
                    <span class="star">⭐ Oficial</span>
                </div>
            </td>
            <td class="eje-descripcion">${descripcion}</td>
            <td class="col-tematicas">${Number(data.tematicas_oficiales_activas_count || 0)}</td>
            <td class="col-orden">${Number(data.orden ?? 0)}</td>
            <td>
                <div class="state-row">
                    <button type="button" class="switch ${activo ? 'on' : ''}"
                        data-toggle-estado-eje aria-label="Cambiar estado"
                        title="${activo ? 'Desactivar' : 'Activar'}"></button>
                </div>
            </td>
            <td class="col-actions">
                <div class="row-actions d-flex justify-content-center">
                    <button type="button" class="btn-accion btn-editar" data-editar-eje title="Editar eje">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                </div>
            </td>
        `;
        return tr;
    }

    function renderTablaEjesModal(ejes) {
        if (!tablaEjesBody) return;
        tablaEjesBody.innerHTML = '';
        const lista = Array.isArray(ejes) ? ejes : [];
        lista
            .slice()
            .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
            .forEach((eje) => tablaEjesBody.appendChild(crearFilaEje(eje)));
        sincronizarVisibilidadEjes(modalEjesEl);
    }

    function insertarEjeEnTbody(data, tbody) {
        if (!tbody) return null;
        const row = crearFilaEje(data);
        const siblings = filasEjesEn(tbody).filter((r) => r !== row);
        const next = siblings.find((r) => Number(r.dataset.orden) > Number(data.orden ?? 0));
        if (next) tbody.insertBefore(row, next);
        else tbody.appendChild(row);
        return row;
    }

    function insertarEjeEnTodasLasSuperficies(data) {
        const tbodys = new Set();
        if (tablaEjesBody
            && String(document.getElementById('ejes_modulo_id')?.value || '') === String(data.modulo_id)) {
            tbodys.add(tablaEjesBody);
        }
        const group = grupoEjesPagina(data.modulo_id);
        const tbodyPagina = group?.querySelector('[data-tbody-ejes]');
        if (tbodyPagina) tbodys.add(tbodyPagina);

        tbodys.forEach((tbody) => {
            if (tbody.querySelector(`tr[data-eje-id="${data.id}"]`)) return;
            insertarEjeEnTbody(data, tbody);
            const scope = tbody.closest('.mod-ejes-group') || tbody.closest('#ejesModuloContenido') || modalEjesEl;
            sincronizarVisibilidadEjes(scope);
            if (scope?.classList?.contains('mod-ejes-group')) {
                actualizarContadoresEjesGrupo(scope);
            }
            if (tbody.closest('[data-ejes-pager]')) {
                window.ConfigEjesUi?.irAPaginaDelEje(tbody, data.id);
            }
        });
    }

    function actualizarFilasEje(data) {
        const filas = document.querySelectorAll(`tr[data-eje-id="${data.id}"]`);
        if (!filas.length) {
            insertarEjeEnTodasLasSuperficies(data);
            return;
        }
        filas.forEach((oldRow) => {
            const nueva = crearFilaEje(data);
            const group = oldRow.closest('.mod-ejes-group');
            const tbody = oldRow.parentElement;
            oldRow.replaceWith(nueva);
            if (tbody) actualizarBotonesReorderEjes(tbody);
            if (group) actualizarContadoresEjesGrupo(group);
            if (tbody?.closest('[data-ejes-pager]')) {
                window.ConfigEjesUi?.aplicarPaginacion(tbody);
            }
        });
    }

    function aplicarEstadoEjeEnFilas(ejeId, nuevoActivo) {
        document.querySelectorAll(`tr[data-eje-id="${ejeId}"]`).forEach((r) => {
            r.dataset.activo = nuevoActivo ? '1' : '0';
            const sw = r.querySelector('[data-toggle-estado-eje]');
            if (sw) {
                sw.classList.toggle('on', nuevoActivo);
                sw.title = nuevoActivo ? 'Desactivar' : 'Activar';
            }
            const group = r.closest('.mod-ejes-group');
            if (group) actualizarContadoresEjesGrupo(group);
        });
    }

    function aplicarReordenGemelo(row, vecino, direccion) {
        const otra = [...document.querySelectorAll(`tr[data-eje-id="${row.dataset.ejeId}"]`)]
            .find((r) => r !== row);
        const otraVecina = otra
            ? [...document.querySelectorAll(`tr[data-eje-id="${vecino.dataset.ejeId}"]`)].find((r) => r !== vecino)
            : null;
        if (!otra || !otraVecina || otra.parentElement !== otraVecina.parentElement) return;

        otra.dataset.orden = row.dataset.orden;
        otraVecina.dataset.orden = vecino.dataset.orden;
        const oc = otra.querySelector('.col-orden');
        const ovc = otraVecina.querySelector('.col-orden');
        if (oc) oc.textContent = otra.dataset.orden;
        if (ovc) ovc.textContent = otraVecina.dataset.orden;
        if (direccion === 'arriba') otra.parentElement.insertBefore(otra, otraVecina);
        else otra.parentElement.insertBefore(otraVecina, otra);
        actualizarBotonesReorderEjes(otra.parentElement);
        if (otra.parentElement.closest('[data-ejes-pager]')) {
            window.ConfigEjesUi?.irAPaginaDelEje(otra.parentElement, otra.dataset.ejeId);
        }
    }

    function abrirModalCrearEjePagina(moduloId, moduloNombre) {
        if (!modalCrearEjeEl) return;
        resetFormEjePagina();
        document.getElementById('eje_pagina_modulo_id').value = moduloId;
        document.getElementById('modalCrearEjesLabel').textContent = 'Nuevo eje oficial';
        document.getElementById('modalCrearEjesSubtitle').textContent =
            moduloNombre ? `Módulo: ${moduloNombre}` : 'Completa los datos del eje';
        document.getElementById('modalCrearEjesIcon').className = 'fas fa-diagram-project text-white';
        setOrdenEjeEditable(true, document.getElementById('eje_pagina_orden'));
        setBtnGuardarEje('crear', btnGuardarEjePagina);
        getModalCrearEje()?.show();
    }

    async function abrirModalEditarEjePagina(ejeId, moduloNombre) {
        if (!modalCrearEjeEl) return;
        resetFormEjePagina();
        setBtnGuardarEje('editar', btnGuardarEjePagina);
        document.getElementById('modalCrearEjesLabel').textContent = 'Editar eje oficial';
        document.getElementById('modalCrearEjesSubtitle').textContent =
            moduloNombre ? `Módulo: ${moduloNombre}` : 'Actualiza los datos del eje';
        document.getElementById('modalCrearEjesIcon').className = 'fas fa-pen text-white';
        setOrdenEjeEditable(false, document.getElementById('eje_pagina_orden'));
        getModalCrearEje()?.show();

        const res = await ajaxRequest(urls().ejesShow(ejeId), 'GET');
        if (!res.success) {
            mostrarToast('error', res.message || 'No se pudo cargar el eje');
            bootstrap.Modal.getInstance(modalCrearEjeEl)?.hide();
            return;
        }

        const data = res.data;
        document.getElementById('eje_pagina_id').value = data.id;
        document.getElementById('eje_pagina_modulo_id').value = data.modulo_id;
        document.getElementById('eje_pagina_nombre').value = data.nombre || '';
        document.getElementById('eje_pagina_descripcion').value = data.descripcion || '';
        document.getElementById('eje_pagina_orden').value = data.orden ?? '';
        document.getElementById('eje_pagina_slug_preview').textContent = data.slug || slugify(data.nombre);
    }

    async function cargarEjeEnFormularioModal(ejeId) {
        setTituloFormEjeModal('editar');
        setBtnGuardarEje('editar', btnGuardarEje);
        setOrdenEjeEditable(false, document.getElementById('eje_orden'));

        const res = await ajaxRequest(urls().ejesShow(ejeId), 'GET');
        if (!res.success) {
            mostrarToast('error', res.message || 'No se pudo cargar el eje');
            resetFormEjeModal();
            return false;
        }

        const data = res.data;
        document.getElementById('eje_id').value = data.id;
        document.getElementById('ejes_modulo_id').value = data.modulo_id;
        document.getElementById('eje_nombre').value = data.nombre || '';
        document.getElementById('eje_descripcion').value = data.descripcion || '';
        document.getElementById('eje_orden').value = data.orden ?? '';
        document.getElementById('eje_slug_preview').textContent = data.slug || slugify(data.nombre);
        document.getElementById('ejesFormCrearWrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return true;
    }

    async function abrirEditarEjeDesdeFila(row) {
        const moduloId = row.dataset.moduloId;
        const ejeId = row.dataset.ejeId;
        const group = row.closest('.mod-ejes-group');
        const moduloNombre = group?.dataset.moduloNombre
            || document.getElementById('modalVerEjesModuloSubtitle')?.textContent?.replace(/^Módulo:\s*/, '')
            || '';

        // Página Ejes → modal dedicado (como módulos)
        if (rootEjes?.contains(row) && modalCrearEjeEl) {
            await abrirModalEditarEjePagina(ejeId, moduloNombre);
            return;
        }

        // Modal Ver ejes (desde Módulos) → formulario embebido
        const modalAbierto = modalEjesEl?.classList.contains('show');
        const moduloActual = document.getElementById('ejes_modulo_id')?.value;

        if (!modalAbierto || String(moduloActual) !== String(moduloId)) {
            await abrirModalEjesModulo(moduloId, moduloNombre);
        }

        await cargarEjeEnFormularioModal(ejeId);
    }

    async function abrirModalEjesModulo(moduloId, moduloNombre) {
        if (!modalEjesEl) return;

        document.getElementById('ejes_modulo_id').value = moduloId;
        document.getElementById('modalVerEjesModuloLabel').textContent = 'Ejes del módulo';
        document.getElementById('modalVerEjesModuloSubtitle').textContent =
            moduloNombre ? `Módulo: ${moduloNombre}` : 'Consulta y gestiona ejes oficiales';

        resetFormEjeModal();
        if (tablaEjesBody) tablaEjesBody.innerHTML = '';
        sincronizarVisibilidadEjes(modalEjesEl);
        setEstadoModalEjes('loading');
        getModalEjes()?.show();

        const res = await ajaxRequest(urls().ejes(moduloId), 'GET');
        if (!res.success) {
            setEstadoModalEjes('error', res.message || 'No se pudieron cargar los ejes');
            return;
        }

        renderTablaEjesModal(res.data?.ejes || []);
        setEstadoModalEjes('ready');
    }

    async function onClickEjesDelegado(e, scopeRoot) {
        const btnCrear = e.target.closest('[data-crear-eje-modulo]');
        if (btnCrear && scopeRoot.contains(btnCrear)) {
            abrirModalCrearEjePagina(btnCrear.dataset.moduloId, btnCrear.dataset.moduloNombre || '');
            return;
        }

        const btnToggle = e.target.closest('[data-toggle-estado-eje]');
        if (btnToggle && scopeRoot.contains(btnToggle)) {
            const row = btnToggle.closest('tr[data-eje-id]');
            if (!row) return;

            const nombre = row.dataset.nombre || 'este eje';
            const activo = row.dataset.activo === '1';
            const temasCount = Number(row.dataset.temasCount || 0);

            if (activo) {
                const html = `
                    <div style="text-align:left">
                        ${temasCount > 0
                        ? `<p>Este eje tiene <b>${temasCount}</b> temática(s). Se ocultará el contenido, pero no se eliminará.</p>`
                        : ''}
                        <p>¿Desactivar <b>${escapeHtml(nombre)}</b>?</p>
                    </div>
                `;
                const confirmacion = await Swal.fire({
                    title: 'Confirmar desactivación',
                    html,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, desactivar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#C14A2F',
                    reverseButtons: true,
                });
                if (!confirmacion.isConfirmed) return;
            }

            btnToggle.disabled = true;
            const res = await ajaxRequest(urls().ejesEstado(row.dataset.ejeId), 'PATCH');
            btnToggle.disabled = false;

            if (!res.success) {
                mostrarToast('error', res.message || 'No se pudo cambiar el estado');
                return;
            }

            aplicarEstadoEjeEnFilas(row.dataset.ejeId, !!res.activo);
            mostrarToast('success', res.message);
            return;
        }

        const btnEditar = e.target.closest('[data-editar-eje]');
        if (btnEditar && scopeRoot.contains(btnEditar)) {
            const row = btnEditar.closest('tr[data-eje-id]');
            if (!row) return;
            await abrirEditarEjeDesdeFila(row);
            return;
        }

        const btnReorder = e.target.closest('.btn-reorder');
        if (!btnReorder || !scopeRoot.contains(btnReorder)) return;
        const row = btnReorder.closest('tr[data-eje-id]');
        if (!row || btnReorder.disabled) return;

        const tbody = row.parentElement;
        const direccion = btnReorder.dataset.dir;
        const filas = filasEjesEn(tbody);
        const index = filas.indexOf(row);
        const vecino = direccion === 'arriba' ? filas[index - 1] : filas[index + 1];
        if (!vecino) return;

        btnReorder.disabled = true;
        const res = await ajaxRequest(urls().ejesMover(row.dataset.ejeId), 'PATCH', { direccion });
        btnReorder.disabled = false;

        if (!res.success) {
            mostrarToast('error', res.message || 'No se pudo reordenar');
            actualizarBotonesReorderEjes(tbody);
            return;
        }

        const ordenRow = row.dataset.orden;
        row.dataset.orden = vecino.dataset.orden;
        vecino.dataset.orden = ordenRow;
        const ordenCell = row.querySelector('.col-orden');
        const vecinoOrdenCell = vecino.querySelector('.col-orden');
        if (ordenCell) ordenCell.textContent = row.dataset.orden;
        if (vecinoOrdenCell) vecinoOrdenCell.textContent = vecino.dataset.orden;

        if (direccion === 'arriba') tbody.insertBefore(row, vecino);
        else tbody.insertBefore(vecino, row);

        actualizarBotonesReorderEjes(tbody);
        if (tbody.closest('[data-ejes-pager]')) {
            window.ConfigEjesUi?.irAPaginaDelEje(tbody, row.dataset.ejeId);
        }
        aplicarReordenGemelo(row, vecino, direccion);
        mostrarToast('success', res.message || 'Orden actualizado');
    }

    async function submitFormEjeVerModal() {
        if (!formEje) return;
        limpiarErroresFormEje(formEje);

        const ejeId = document.getElementById('eje_id')?.value;
        const moduloId = document.getElementById('ejes_modulo_id')?.value;
        const esEdicion = !!ejeId;

        if (!moduloId && !esEdicion) {
            mostrarToast('error', 'No se identificó el módulo');
            return;
        }

        const payload = {
            nombre: (document.getElementById('eje_nombre')?.value || '').trim(),
            descripcion: (document.getElementById('eje_descripcion')?.value || '').trim() || null,
        };
        const ordenVal = document.getElementById('eje_orden')?.value ?? '';
        if (!esEdicion && ordenVal !== '') payload.orden = Number(ordenVal);
        if (esEdicion && ordenVal !== '') payload.orden = Number(ordenVal);

        setBtnGuardarEje(esEdicion ? 'guardando' : 'creando', btnGuardarEje);
        const res = await ajaxRequest(
            esEdicion ? urls().ejesUpdate(ejeId) : urls().ejes(moduloId),
            esEdicion ? 'PUT' : 'POST',
            payload
        );
        setBtnGuardarEje(esEdicion ? 'editar' : 'crear', btnGuardarEje);

        if (!res.success) {
            if (res.errors) mostrarErroresFormEje(res.errors, formEje);
            mostrarToast('error', res.message || (esEdicion ? 'No se pudo actualizar el eje' : 'No se pudo crear el eje'));
            return;
        }

        if (res.data) {
            if (esEdicion) actualizarFilasEje(res.data);
            else insertarEjeEnTodasLasSuperficies(res.data);
        }

        resetFormEjeModal();
        mostrarToast('success', res.message || (esEdicion ? 'Eje actualizado' : 'Eje creado'));
    }

    async function submitFormEjePagina() {
        if (!formEjePagina) return;
        limpiarErroresFormEje(formEjePagina);

        const ejeId = document.getElementById('eje_pagina_id')?.value;
        const moduloId = document.getElementById('eje_pagina_modulo_id')?.value;
        const esEdicion = !!ejeId;

        if (!moduloId && !esEdicion) {
            mostrarToast('error', 'No se identificó el módulo');
            return;
        }

        const payload = {
            nombre: (document.getElementById('eje_pagina_nombre')?.value || '').trim(),
            descripcion: (document.getElementById('eje_pagina_descripcion')?.value || '').trim() || null,
        };
        const ordenVal = document.getElementById('eje_pagina_orden')?.value ?? '';
        if (!esEdicion && ordenVal !== '') payload.orden = Number(ordenVal);
        if (esEdicion && ordenVal !== '') payload.orden = Number(ordenVal);

        setBtnGuardarEje(esEdicion ? 'guardando' : 'creando', btnGuardarEjePagina);
        const res = await ajaxRequest(
            esEdicion ? urls().ejesUpdate(ejeId) : urls().ejes(moduloId),
            esEdicion ? 'PUT' : 'POST',
            payload
        );
        setBtnGuardarEje(esEdicion ? 'editar' : 'crear', btnGuardarEjePagina);

        if (!res.success) {
            if (res.errors) mostrarErroresFormEje(res.errors, formEjePagina);
            mostrarToast('error', res.message || (esEdicion ? 'No se pudo actualizar el eje' : 'No se pudo crear el eje'));
            return;
        }

        bootstrap.Modal.getInstance(modalCrearEjeEl)?.hide();
        if (res.data) {
            if (esEdicion) actualizarFilasEje(res.data);
            else insertarEjeEnTodasLasSuperficies(res.data);
        }
        mostrarToast('success', res.message || (esEdicion ? 'Eje actualizado' : 'Eje creado'));
    }

    document.getElementById('eje_nombre')?.addEventListener('input', (e) => {
        const ejeId = document.getElementById('eje_id')?.value;
        if (ejeId) return;
        const preview = document.getElementById('eje_slug_preview');
        if (preview) preview.textContent = slugify(e.target.value);
    });

    document.getElementById('eje_pagina_nombre')?.addEventListener('input', (e) => {
        const ejeId = document.getElementById('eje_pagina_id')?.value;
        if (ejeId) return;
        const preview = document.getElementById('eje_pagina_slug_preview');
        if (preview) preview.textContent = slugify(e.target.value);
    });

    modalEjesEl?.addEventListener('click', (e) => onClickEjesDelegado(e, modalEjesEl));
    rootEjes?.addEventListener('click', (e) => onClickEjesDelegado(e, rootEjes));

    btnCancelarEje?.addEventListener('click', () => resetFormEjeModal());

    formEje?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitFormEjeVerModal();
    });

    formEjePagina?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitFormEjePagina();
    });

    rootEjes?.querySelectorAll('[data-tbody-ejes]').forEach(actualizarBotonesReorderEjes);
    window.ConfigEjesUi?.refrescarPaginacion(rootEjes);
});
