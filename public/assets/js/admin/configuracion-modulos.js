document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector('.config-admin-modulos');
    if (!root) return;

    const rootEjes = document.querySelector('.config-admin-ejes');

    const modalEl = document.getElementById('modalCrearModulos');
    const form = document.getElementById('formCrearModulo');
    const btnGuardar = document.getElementById('btnGuardarModulo');

    const modalEjesEl = document.getElementById('modalVerEjesModulo');
    const formEje = document.getElementById('formCrearEje');
    const btnGuardarEje = document.getElementById('btnGuardarEje');
    const btnCancelarEje = document.getElementById('btnCancelarEje');
    const tablaEjesOficialesBody = document.getElementById('tablaEjesOficialesBody');
    const tablaEjesColegioBody = document.getElementById('tablaEjesColegioBody');
    const ejesLoading = document.getElementById('ejesModuloLoading');
    const ejesError = document.getElementById('ejesModuloError');
    const ejesContenido = document.getElementById('ejesModuloContenido');

    function urlFromTemplate(template, replacements) {
        let url = template;
        Object.entries(replacements).forEach(([key, value]) => {
            url = url.replace(key, value);
        });
        return url;
    }

    function urls() {
        return {
            store: (ambienteId) => urlFromTemplate(root.dataset.urlStoreTemplate, { '__AMBIENTE__': ambienteId }),
            show: (moduloId) => urlFromTemplate(root.dataset.urlShowTemplate, { '__MODULO__': moduloId }),
            update: (moduloId) => urlFromTemplate(root.dataset.urlUpdateTemplate, { '__MODULO__': moduloId }),
            estado: (moduloId) => urlFromTemplate(root.dataset.urlEstadoTemplate, { '__MODULO__': moduloId }),
            mover: (moduloId) => urlFromTemplate(root.dataset.urlMoverTemplate, { '__MODULO__': moduloId }),
            destroy: (moduloId) => urlFromTemplate(root.dataset.urlDestroyTemplate, { '__MODULO__': moduloId }),
            ejes: (moduloId) => urlFromTemplate(root.dataset.urlEjesTemplate, { '__MODULO__': moduloId }),
            ejesShow: (ejeId) => urlFromTemplate(root.dataset.urlEjesShowTemplate, { '__EJE__': ejeId }),
            ejesUpdate: (ejeId) => urlFromTemplate(root.dataset.urlEjesUpdateTemplate, { '__EJE__': ejeId }),
            ejesMover: (ejeId) => urlFromTemplate(root.dataset.urlEjesMoverTemplate, { '__EJE__': ejeId }),
            ejesEstado: (ejeId) => urlFromTemplate(root.dataset.urlEjesEstadoTemplate, { '__EJE__': ejeId }),
            ejesDestroy: (ejeId) => urlFromTemplate(root.dataset.urlEjesDestroyTemplate, { '__EJE__': ejeId }),
        };
    }

    function getModal() {
        return bootstrap.Modal.getOrCreateInstance(modalEl);
    }

    function getModalEjes() {
        return bootstrap.Modal.getOrCreateInstance(modalEjesEl);
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

    function limpiarErroresForm() {
        form.querySelectorAll('.campo-error').forEach((el) => el.remove());
        form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    }

    function mostrarErroresForm(errors) {
        limpiarErroresForm();
        if (!errors) return;
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

    function getTbodyColegio(group) {
        return group?.querySelector('[data-tbody-colegio]') || null;
    }

    function filasPropias(tbody) {
        return [...(tbody?.querySelectorAll('tr[data-modulo-id][data-es-propio="1"]') || [])];
    }

    function actualizarBotonesReorder(tbody) {
        if (!tbody) return;
        const rows = filasPropias(tbody);
        rows.forEach((row, index) => {
            const btnUp = row.querySelector('.btn-reorder[data-dir="arriba"]');
            const btnDown = row.querySelector('.btn-reorder[data-dir="abajo"]');
            if (btnUp) btnUp.disabled = index === 0;
            if (btnDown) btnDown.disabled = index === rows.length - 1;
        });
    }

    function actualizarContadorGrupo(group) {
        if (!group) return;
        const rows = group.querySelectorAll('tbody tr[data-modulo-id]');
        const total = rows.length;
        const activos = [...rows].filter((r) => r.dataset.puedeGestionarEjes === '1').length;
        const label = group.querySelector('.amb-count');
        if (!label) return;
        const palabra = total === 1 ? 'módulo' : 'módulos';
        label.textContent = `${total} ${palabra} · ${activos} activos`;
    }

    function ensureSeccionColegio(group) {
        const seccion = group.querySelector('[data-seccion="colegio"]');
        if (!seccion) return null;

        seccion.hidden = false;
        const wrap = seccion.querySelector('[data-wrap-colegio]');
        const emptyColegio = seccion.querySelector('[data-empty-colegio]');
        const tbody = seccion.querySelector('[data-tbody-colegio]');
        if (wrap) wrap.hidden = false;
        if (emptyColegio) emptyColegio.hidden = true;
        return tbody;
    }

    function crearFilaModulo(data) {
        const activo = !!data.activo;
        const tr = document.createElement('tr');
        tr.className = 'fila-colegio';
        tr.dataset.moduloId = data.id;
        tr.dataset.nombre = data.nombre;
        tr.dataset.orden = String(data.orden ?? 0);
        tr.dataset.activo = activo ? '1' : '0';
        tr.dataset.esPropio = '1';
        tr.dataset.puedeGestionar = '1';
        tr.dataset.puedeGestionarEjes = activo ? '1' : '0';
        tr.dataset.temasActivos = String(data.temas_activos_count ?? 0);
        tr.dataset.ejesCount = String(data.ejes_count ?? data.ejes_propios_count ?? 0);
        tr.dataset.temasCount = String(data.temas_count ?? 0);

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
                    <span class="badge-colegio">Del colegio</span>
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
            <td class="col-ejes-propios">${Number(data.ejes_propios_count || data.ejes_count || 0)}</td>
            <td class="col-actions">
                <div class="row-actions d-flex justify-content-center">
                    <button type="button" class="btn-accion btn-asignar-grado" data-ejes-modulo
                        title="Ver ejes del módulo">
                        <i class="fa-solid fa-diagram-project"></i> Ejes
                    </button>
                    <button type="button" class="btn-accion btn-editar" data-editar-modulo title="Editar módulo">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button type="button" class="btn-accion btn-eliminar" data-eliminar-modulo title="Eliminar módulo">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                </div>
            </td>
        `;
        return tr;
    }

    function colocarFilaPorOrden(tbody, row, orden) {
        row.dataset.orden = String(orden);
        const siblings = filasPropias(tbody).filter((r) => r !== row);
        const next = siblings.find((r) => Number(r.dataset.orden) > Number(orden));
        if (next) tbody.insertBefore(row, next);
        else tbody.appendChild(row);
        actualizarBotonesReorder(tbody);
    }

    function pintarFilaModulo(row, data) {
        row.dataset.nombre = data.nombre;
        row.dataset.orden = String(data.orden ?? row.dataset.orden ?? 0);
        row.dataset.activo = data.activo ? '1' : '0';
        row.dataset.puedeGestionarEjes = data.puede_gestionar_ejes ? '1' : '0';
        row.dataset.temasActivos = String(data.temas_activos_count ?? row.dataset.temasActivos ?? 0);
        if (data.ejes_count != null || data.ejes_propios_count != null) {
            row.dataset.ejesCount = String(data.ejes_count ?? data.ejes_propios_count ?? 0);
        }
        if (data.temas_count != null) {
            row.dataset.temasCount = String(data.temas_count ?? 0);
        }

        const nombreEl = row.querySelector('.mod-nombre-texto');
        if (nombreEl) nombreEl.textContent = data.nombre;

        const slugEl = row.querySelector('.slug');
        if (slugEl) slugEl.textContent = data.slug;

        const switchBtn = row.querySelector('[data-toggle-estado]');
        if (switchBtn) {
            switchBtn.classList.toggle('on', !!data.activo);
            switchBtn.title = data.activo ? 'Desactivar' : 'Activar';
        }

        const ejesEl = row.querySelector('.col-ejes-propios');
        if (ejesEl) ejesEl.textContent = String(data.ejes_propios_count ?? 0);

        const actions = row.querySelector('.row-actions');
        if (actions && !actions.querySelector('[data-ejes-modulo]')) {
            const ejesBtn = document.createElement('button');
            ejesBtn.type = 'button';
            ejesBtn.className = 'btn-accion btn-asignar-grado';
            ejesBtn.dataset.ejesModulo = '';
            ejesBtn.title = 'Ver ejes del módulo';
            ejesBtn.innerHTML = '<i class="fa-solid fa-diagram-project"></i> Ejes';
            actions.prepend(ejesBtn);
        }
    }

    function insertarOActualizarModulo(data) {
        const group = getGroup(data.ambiente_id);
        if (!group) return;
        const tbody = ensureSeccionColegio(group);
        let row = group.querySelector(`tr[data-modulo-id="${data.id}"]`);

        if (!row) {
            row = crearFilaModulo(data);
            colocarFilaPorOrden(tbody, row, data.orden);
        } else {
            pintarFilaModulo(row, data);
            colocarFilaPorOrden(tbody, row, data.orden);
        }

        const emptyColegio = group.querySelector('[data-empty-colegio]');
        if (emptyColegio) emptyColegio.hidden = true;
        actualizarContadorGrupo(group);
        aplicarFiltrosModulos();
    }

    function abrirModalCrearModulos(ambienteId, ambienteNombre) {
        resetFormModulo();
        document.getElementById('modulo_ambiente_id').value = ambienteId;
        document.getElementById('modalCrearModulosLabel').textContent = 'Nuevo módulo adicional';
        document.getElementById('modalCrearModulosSubtitle').textContent =
            ambienteNombre ? `Ambiente: ${ambienteNombre}` : 'Completa los datos del módulo del colegio';
        document.getElementById('modalCrearModulosIcon').className = 'fas fa-cube text-white';
        setOrdenEditable(true);
        setBtnGuardar('crear');
        getModal().show();
    }

    async function desactivarModuloDesdeFila(row) {
        const moduloId = row.dataset.moduloId;
        const res = await ajaxRequest(urls().estado(moduloId), 'PATCH');
        if (!res.success) {
            mostrarToast('error', res.message || 'No se pudo desactivar el módulo');
            return false;
        }

        const nuevoActivo = !!res.activo;
        row.dataset.activo = nuevoActivo ? '1' : '0';
        row.dataset.puedeGestionarEjes = nuevoActivo ? '1' : '0';
        pintarFilaModulo(row, {
            nombre: row.dataset.nombre,
            slug: row.querySelector('.slug')?.textContent,
            activo: nuevoActivo,
            puede_gestionar_ejes: nuevoActivo,
            temas_activos_count: row.dataset.temasActivos,
            ejes_propios_count: row.querySelector('.col-ejes-propios')?.textContent,
            ejes_count: row.dataset.ejesCount,
            temas_count: row.dataset.temasCount,
            orden: row.dataset.orden,
        });
        actualizarContadorGrupo(row.closest('.amb-group'));
        sincronizarGestionEjesEnTab(moduloId, nuevoActivo);
        aplicarFiltrosModulos();
        mostrarToast('success', res.message || 'Módulo desactivado');
        return true;
    }

    async function manejarEliminarModulo(row, btn) {
        const moduloId = row.dataset.moduloId;
        const nombre = row.dataset.nombre || 'este módulo';
        const ejesCount = Number(row.dataset.ejesCount || 0);
        const temasCount = Number(row.dataset.temasCount || 0);
        const activo = row.dataset.activo === '1';

        if (ejesCount > 0 || temasCount > 0) {
            const html = `
                <div style="text-align:left">
                    <p><b>${escapeHtml(nombre)}</b> tiene contenido y no se puede eliminar:</p>
                    <ul style="margin:8px 0 12px 18px">
                        <li><b>${ejesCount}</b> eje(s)</li>
                        <li><b>${temasCount}</b> temática(s)</li>
                    </ul>
                    <p>El contenido se conserva. ${activo ? 'Puede desactivar el módulo en su lugar.' : 'El módulo ya está inactivo.'}</p>
                </div>
            `;

            if (!activo) {
                await Swal.fire({
                    title: 'No se puede eliminar',
                    html,
                    icon: 'info',
                    confirmButtonText: 'Entendido',
                });
                return;
            }

            const oferta = await Swal.fire({
                title: 'No se puede eliminar',
                html,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Desactivar módulo',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#C14A2F',
                reverseButtons: true,
            });
            if (!oferta.isConfirmed) return;

            btn.disabled = true;
            await desactivarModuloDesdeFila(row);
            btn.disabled = false;
            return;
        }

        const confirmacion = await Swal.fire({
            title: 'Eliminar módulo',
            html: `<p>¿Eliminar <b>${escapeHtml(nombre)}</b>? Esta acción no se puede deshacer.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#C14A2F',
            reverseButtons: true,
        });
        if (!confirmacion.isConfirmed) return;

        btn.disabled = true;
        const res = await ajaxRequest(urls().destroy(moduloId), 'DELETE');
        btn.disabled = false;

        if (!res.success) {
            if (res.can_delete === false) {
                row.dataset.ejesCount = String(res.ejes_count ?? row.dataset.ejesCount ?? 0);
                row.dataset.temasCount = String(res.temas_count ?? row.dataset.temasCount ?? 0);
                await manejarEliminarModulo(row, btn);
                return;
            }
            mostrarToast('error', res.message || 'No se pudo eliminar el módulo');
            return;
        }

        const group = row.closest('.amb-group');
        const tbody = row.parentElement;
        row.remove();
        actualizarBotonesReorder(tbody);
        actualizarContadorGrupo(group);

        const emptyColegio = group?.querySelector('[data-empty-colegio]');
        const wrap = group?.querySelector('[data-wrap-colegio]');
        if (tbody && !tbody.querySelector('tr[data-modulo-id]')) {
            if (wrap) wrap.hidden = true;
            if (emptyColegio) emptyColegio.hidden = false;
        }

        aplicarFiltrosModulos();
        mostrarToast('success', res.message || 'Módulo eliminado');
    }

    async function abrirModalEditarModulo(moduloId, ambienteNombre) {
        resetFormModulo();
        setBtnGuardar('editar');
        document.getElementById('modalCrearModulosLabel').textContent = 'Editar módulo adicional';
        document.getElementById('modalCrearModulosSubtitle').textContent =
            ambienteNombre ? `Ambiente: ${ambienteNombre}` : 'Actualiza los datos del módulo';
        document.getElementById('modalCrearModulosIcon').className = 'fas fa-pen text-white';
        setOrdenEditable(false);
        getModal().show();

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

    root.querySelectorAll('[data-amb-toggle]').forEach((head) => {
        head.addEventListener('click', () => {
            const group = head.closest('.amb-group');
            if (!group) return;
            const wasCollapsed = group.classList.contains('is-collapsed');
            root.querySelectorAll('.amb-group').forEach((other) => {
                other.classList.add('is-collapsed');
                other.querySelector('[data-amb-toggle]')?.setAttribute('aria-expanded', 'false');
            });
            if (wasCollapsed) {
                group.classList.remove('is-collapsed');
                head.setAttribute('aria-expanded', 'true');
            }
        });
    });

    /* ── Filtros de módulos ──────────────────────────────────── */
    function valoresFiltrosModulos() {
        return {
            ambiente: root.querySelector('[data-filtro="ambiente"]')?.value || '',
            tipo: root.querySelector('[data-filtro="tipo"]')?.value || '',
            estado: root.querySelector('[data-filtro="estado"]')?.value || '',
        };
    }

    function filasVisiblesEnSeccion(seccion, filtros) {
        const rows = [...seccion.querySelectorAll('tr[data-modulo-id]')];
        let visibles = 0;

        rows.forEach((row) => {
            const esPropio = row.dataset.esPropio === '1';
            const activo = row.dataset.activo === '1';
            let ok = true;

            if (filtros.tipo === 'oficial' && esPropio) ok = false;
            if (filtros.tipo === 'adicional' && !esPropio) ok = false;
            if (filtros.estado === '1' && !activo) ok = false;
            if (filtros.estado === '0' && activo) ok = false;

            row.hidden = !ok;
            if (ok) visibles += 1;
        });

        return visibles;
    }

    function aplicarFiltrosModulos() {
        const filtros = valoresFiltrosModulos();
        const hayFiltros = !!(filtros.ambiente || filtros.tipo || filtros.estado);
        const emptyEl = root.querySelector('[data-empty-filtros-modulos]');
        let ambientesVisibles = 0;

        root.querySelectorAll('.amb-group').forEach((group) => {
            const matchAmbiente = !filtros.ambiente
                || String(group.dataset.ambienteId) === String(filtros.ambiente);

            if (!matchAmbiente) {
                group.hidden = true;
                return;
            }

            const seccionOficiales = group.querySelector('[data-seccion="oficiales"]');
            const seccionColegio = group.querySelector('[data-seccion="colegio"]');
            const foot = group.querySelector('.amb-foot');

            const visiblesOficiales = seccionOficiales
                ? filasVisiblesEnSeccion(seccionOficiales, filtros)
                : 0;
            const visiblesColegio = seccionColegio
                ? filasVisiblesEnSeccion(seccionColegio, filtros)
                : 0;

            if (seccionOficiales) {
                if (filtros.tipo === 'adicional') {
                    seccionOficiales.hidden = true;
                } else if (filtros.estado !== '' || filtros.tipo === 'oficial') {
                    seccionOficiales.hidden = visiblesOficiales === 0;
                } else {
                    seccionOficiales.hidden = false;
                }
            }

            if (seccionColegio) {
                if (filtros.tipo === 'oficial') {
                    seccionColegio.hidden = true;
                } else if (filtros.estado !== '' || filtros.tipo === 'adicional') {
                    seccionColegio.hidden = visiblesColegio === 0;
                } else {
                    seccionColegio.hidden = false;
                }
            }

            if (foot) {
                foot.hidden = filtros.tipo === 'oficial';
            }

            if (hayFiltros && visiblesOficiales === 0 && visiblesColegio === 0) {
                group.hidden = true;
                return;
            }

            group.hidden = false;
            ambientesVisibles += 1;

            if (filtros.ambiente) {
                group.classList.remove('is-collapsed');
                group.querySelector('[data-amb-toggle]')?.setAttribute('aria-expanded', 'true');
            }
        });

        if (emptyEl) emptyEl.hidden = ambientesVisibles > 0 || !hayFiltros;
    }

    root.querySelectorAll('[data-filtros-modulos] select').forEach((select) => {
        select.addEventListener('change', aplicarFiltrosModulos);
    });

    root.querySelector('[data-limpiar-filtros-modulos]')?.addEventListener('click', () => {
        root.querySelectorAll('[data-filtros-modulos] select').forEach((select) => {
            select.value = '';
        });
        aplicarFiltrosModulos();
    });

    root.addEventListener('click', async (e) => {
        const btnCrear = e.target.closest('[data-crear-modulo]');
        if (btnCrear) {
            e.preventDefault();
            abrirModalCrearModulos(btnCrear.dataset.ambienteId, btnCrear.dataset.ambienteNombre || '');
            return;
        }

        const btnEditar = e.target.closest('[data-editar-modulo]');
        if (btnEditar) {
            e.preventDefault();
            const row = btnEditar.closest('tr');
            if (row.dataset.puedeGestionar !== '1') return;
            const group = btnEditar.closest('.amb-group');
            const ambienteNombre = group?.querySelector('.amb-title')?.textContent?.trim() || '';
            abrirModalEditarModulo(row.dataset.moduloId, ambienteNombre);
            return;
        }

        const btnEliminar = e.target.closest('[data-eliminar-modulo]');
        if (btnEliminar) {
            e.preventDefault();
            const row = btnEliminar.closest('tr');
            if (row.dataset.puedeGestionar !== '1') return;
            await manejarEliminarModulo(row, btnEliminar);
            return;
        }

        const btnEjes = e.target.closest('[data-ejes-modulo]');
        if (btnEjes) {
            e.preventDefault();
            const row = btnEjes.closest('tr');
            abrirModalEjesModulo(row.dataset.moduloId, row.dataset.nombre || '');
            return;
        }

        const btnToggle = e.target.closest('[data-toggle-estado]');
        if (btnToggle) {
            e.preventDefault();
            const row = btnToggle.closest('tr');
            if (row.dataset.puedeGestionar !== '1') return;

            const moduloId = row.dataset.moduloId;
            const nombre = row.dataset.nombre || 'este módulo';
            const activo = row.dataset.activo === '1';
            const temasActivos = Number(row.dataset.temasActivos || 0);

            if (activo) {
                const html = `
                    <div style="text-align:left">
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
            row.dataset.puedeGestionarEjes = nuevoActivo ? '1' : '0';
            btnToggle.classList.toggle('on', nuevoActivo);
            btnToggle.title = nuevoActivo ? 'Desactivar' : 'Activar';
            pintarFilaModulo(row, {
                nombre: row.dataset.nombre,
                slug: row.querySelector('.slug')?.textContent,
                activo: nuevoActivo,
                puede_gestionar_ejes: nuevoActivo,
                temas_activos_count: row.dataset.temasActivos,
                ejes_propios_count: row.querySelector('.col-ejes-propios')?.textContent,
                orden: row.dataset.orden,
            });
            actualizarContadorGrupo(row.closest('.amb-group'));
            sincronizarGestionEjesEnTab(moduloId, nuevoActivo);
            aplicarFiltrosModulos();
            mostrarToast('success', res.message);
            return;
        }

        const btnReorder = e.target.closest('.btn-reorder');
        if (btnReorder) {
            e.preventDefault();
            if (btnReorder.disabled) return;
            const row = btnReorder.closest('tr');
            if (row.dataset.esPropio !== '1') return;

            const tbody = row.parentElement;
            const direccion = btnReorder.dataset.dir;
            const moduloId = row.dataset.moduloId;
            const propias = filasPropias(tbody);
            const index = propias.indexOf(row);
            const vecino = direccion === 'arriba' ? propias[index - 1] : propias[index + 1];
            if (!vecino) return;

            btnReorder.disabled = true;
            const res = await ajaxRequest(urls().mover(moduloId), 'PATCH', { direccion });
            btnReorder.disabled = false;

            if (!res.success) {
                mostrarToast('error', res.message || 'No se pudo reordenar');
                actualizarBotonesReorder(tbody);
                return;
            }

            const ordenRow = row.dataset.orden;
            row.dataset.orden = vecino.dataset.orden;
            vecino.dataset.orden = ordenRow;
            if (direccion === 'arriba') tbody.insertBefore(row, vecino);
            else tbody.insertBefore(vecino, row);

            actualizarBotonesReorder(tbody);
            mostrarToast('success', res.message || 'Orden actualizado');
        }
    });

    document.getElementById('modulo_nombre')?.addEventListener('input', (e) => {
        const moduloId = document.getElementById('modulo_id').value;
        if (moduloId) return;
        document.getElementById('modulo_slug_preview').textContent = slugify(e.target.value);
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

    /* ── Modal / tab ejes ────────────────────────────────────── */
    function limpiarErroresFormEje() {
        if (!formEje) return;
        formEje.querySelectorAll('.campo-error').forEach((el) => el.remove());
        formEje.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    }

    function mostrarErroresFormEje(errors) {
        limpiarErroresFormEje();
        if (!errors || !formEje) return;
        Object.entries(errors).forEach(([campo, mensajes]) => {
            const input = formEje.querySelector(`[name="${campo}"]`);
            if (!input) return;
            input.classList.add('is-invalid');
            const div = document.createElement('div');
            div.className = 'campo-error invalid-feedback d-block';
            div.textContent = mensajes[0];
            input.insertAdjacentElement('afterend', div);
        });
    }

    function setBtnGuardarEje(modo) {
        if (!btnGuardarEje) return;
        btnGuardarEje.disabled = false;
        if (modo === 'creando') {
            btnGuardarEje.disabled = true;
            btnGuardarEje.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando…';
        } else if (modo === 'guardando') {
            btnGuardarEje.disabled = true;
            btnGuardarEje.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';
        } else if (modo === 'editar') {
            btnGuardarEje.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
        } else {
            btnGuardarEje.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Crear eje';
        }
    }

    function setOrdenEjeEditable(editable) {
        const input = document.getElementById('eje_orden');
        if (!input) return;
        input.disabled = !editable;
        input.title = editable ? '' : 'El orden se cambia con las flechas de la tabla';
    }

    function setTituloFormEje(modo) {
        const icon = document.getElementById('ejesFormTitleIcon');
        const text = document.getElementById('ejesFormTitleText');
        if (icon) {
            icon.className = modo === 'editar' ? 'fa-solid fa-pen' : 'fa-solid fa-plus';
        }
        if (text) {
            text.textContent = modo === 'editar' ? 'Editar eje del colegio' : 'Nuevo eje del colegio';
        }
        if (btnCancelarEje) btnCancelarEje.hidden = modo !== 'editar';
    }

    function resetFormEje() {
        if (!formEje) return;
        formEje.reset();
        limpiarErroresFormEje();
        document.getElementById('eje_id').value = '';
        document.getElementById('eje_slug_preview').textContent = 'se genera automáticamente';
        setOrdenEjeEditable(true);
        setTituloFormEje('crear');
        setBtnGuardarEje('crear');
    }

    function setEstadoModalEjes(estado, mensajeError = '') {
        if (ejesLoading) ejesLoading.hidden = estado !== 'loading';
        if (ejesError) {
            ejesError.hidden = estado !== 'error';
            ejesError.textContent = mensajeError;
        }
        if (ejesContenido) ejesContenido.hidden = estado !== 'ready';
    }

    function contenedorEjesColegio(scope) {
        return scope?.querySelector('[data-tbody-ejes-colegio]') || null;
    }

    function contenedorEjesOficiales(scope) {
        return scope?.querySelector('[data-tbody-ejes-oficiales]') || null;
    }

    function filasEjesPropiosEn(tbody) {
        if (!tbody) return [];
        return [...tbody.querySelectorAll('tr[data-eje-id][data-es-propio="1"]')];
    }

    function filasEjesGestionablesEn(tbody) {
        if (!tbody) return [];
        return [...tbody.querySelectorAll('tr[data-eje-id][data-puede-gestionar="1"]')];
    }

    function actualizarBotonesReorderEjes(tbody) {
        const rows = filasEjesGestionablesEn(tbody);
        rows.forEach((row, index) => {
            const btnUp = row.querySelector('.btn-reorder[data-dir="arriba"]');
            const btnDown = row.querySelector('.btn-reorder[data-dir="abajo"]');
            if (btnUp) btnUp.disabled = index === 0;
            if (btnDown) btnDown.disabled = index === rows.length - 1;
        });
    }

    function setVisibilidadSeccionEjes(wrap, emptyEl, tieneFilas) {
        if (wrap) wrap.hidden = !tieneFilas;
        if (emptyEl) emptyEl.hidden = tieneFilas;
    }

    function setFormularioEjesEditable(editable) {
        const formWrap = document.getElementById('ejesFormCrearWrap');
        const hint = document.getElementById('ejesFormInactivoHint');
        if (formWrap) formWrap.hidden = !editable;
        if (hint) hint.hidden = editable;
    }

    function sincronizarSeccionEjesColegio(scope) {
        if (!scope) return;
        const tbody = contenedorEjesColegio(scope);
        const wrap = scope.querySelector('[data-wrap-ejes-colegio]');
        const emptyEl = scope.querySelector('[data-empty-ejes-colegio]');
        const count = filasEjesPropiosEn(tbody).length;
        setVisibilidadSeccionEjes(wrap, emptyEl, count > 0);
        actualizarBotonesReorderEjes(tbody);
    }

    function sincronizarSeccionEjesOficiales(scope) {
        if (!scope) return;
        const tbody = contenedorEjesOficiales(scope);
        const wrap = scope.querySelector('[data-wrap-ejes-oficiales]');
        const emptyEl = scope.querySelector('[data-empty-ejes-oficiales]');
        const count = tbody ? tbody.querySelectorAll('tr[data-eje-id]').length : 0;
        setVisibilidadSeccionEjes(wrap, emptyEl, count > 0);
    }

    function grupoEjesTab(moduloId) {
        return rootEjes?.querySelector(`.mod-ejes-group[data-modulo-id="${moduloId}"]`) || null;
    }

    function sincronizarGestionEjesEnTab(moduloId, puedeGestionar) {
        const group = grupoEjesTab(moduloId);
        if (!group) return;

        group.dataset.puedeGestionarEjes = puedeGestionar ? '1' : '0';

        const foot = group.querySelector('.mod-ejes-foot');
        if (foot) {
            foot.replaceChildren();
            if (puedeGestionar) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-primary';
                btn.dataset.crearEjeModulo = '';
                btn.dataset.moduloId = String(moduloId);
                btn.dataset.moduloNombre = group.dataset.moduloNombre || '';
                btn.innerHTML = '<i class="fa-solid fa-plus"></i> Crear eje del colegio';
                foot.appendChild(btn);
            } else {
                const hint = document.createElement('span');
                hint.className = 'text-muted small';
                hint.textContent = 'Active el módulo para crear y gestionar ejes del colegio.';
                foot.appendChild(hint);
            }
        }

        const tbody = contenedorEjesColegio(group);
        if (!tbody) return;

        [...tbody.querySelectorAll('tr[data-eje-id][data-es-propio="1"]')].forEach((row) => {
            const data = {
                id: row.dataset.ejeId,
                modulo_id: row.dataset.moduloId,
                nombre: row.dataset.nombre,
                orden: row.dataset.orden,
                activo: row.dataset.activo === '1',
                es_oficial: false,
                es_propio: true,
                puede_gestionar: puedeGestionar,
                tematicas_oficiales_activas_count: Number(row.querySelector('.col-tematicas')?.textContent || 0),
                temas_count: Number(row.dataset.temasCount || 0),
                descripcion: (() => {
                    const cell = row.querySelector('.eje-descripcion');
                    if (!cell || cell.querySelector('.text-muted')) return null;
                    return cell.textContent.trim();
                })(),
            };
            const nueva = crearFilaEje(data);
            row.replaceWith(nueva);
        });
        sincronizarSeccionEjesColegio(group);
        aplicarFiltrosEjes();
    }

    function actualizarContadoresEjesGrupo(group) {
        if (!group) return;
        const oficiales = contenedorEjesOficiales(group)?.querySelectorAll('tr[data-eje-id]').length || 0;
        const propios = filasEjesPropiosEn(contenedorEjesColegio(group));
        const total = oficiales + propios.length;
        const activosOficiales = [...(contenedorEjesOficiales(group)?.querySelectorAll('tr[data-eje-id]') || [])]
            .filter((r) => r.dataset.activo === '1').length;
        const activosPropios = propios.filter((r) => r.dataset.activo === '1').length;
        const activos = activosOficiales + activosPropios;

        const hint = group.querySelector('.mod-ejes-hint');
        if (hint) {
            hint.textContent = `${total} ${total === 1 ? 'eje' : 'ejes'} · ${activos} activos`;
        }

        const ambGroup = group.closest('.amb-group');
        if (!ambGroup) return;
        let totalAmb = 0;
        let activosAmb = 0;
        ambGroup.querySelectorAll('.mod-ejes-group').forEach((g) => {
            const off = contenedorEjesOficiales(g)?.querySelectorAll('tr[data-eje-id]').length || 0;
            const prop = filasEjesPropiosEn(contenedorEjesColegio(g));
            totalAmb += off + prop.length;
            activosAmb += [...(contenedorEjesOficiales(g)?.querySelectorAll('tr[data-eje-id]') || [])]
                .filter((r) => r.dataset.activo === '1').length;
            activosAmb += prop.filter((r) => r.dataset.activo === '1').length;
        });
        const countEl = ambGroup.querySelector('.amb-count');
        if (countEl) {
            countEl.textContent = `${totalAmb} ${totalAmb === 1 ? 'eje' : 'ejes'} · ${activosAmb} activos`;
        }
    }

    function crearFilaEje(data) {
        const activo = !!data.activo;
        const propio = data.es_propio != null ? !!data.es_propio : !data.es_oficial;
        const puedeGestionar = data.puede_gestionar != null
            ? !!data.puede_gestionar
            : propio;

        const tr = document.createElement('tr');
        tr.dataset.ejeId = data.id;
        tr.dataset.moduloId = String(data.modulo_id ?? '');
        tr.dataset.nombre = data.nombre || '';
        tr.dataset.orden = String(data.orden ?? 0);
        tr.dataset.activo = activo ? '1' : '0';
        tr.dataset.esPropio = propio ? '1' : '0';
        tr.dataset.puedeGestionar = puedeGestionar ? '1' : '0';
        tr.dataset.temasCount = String(data.temas_count ?? 0);
        tr.className = propio ? 'fila-colegio' : 'fila-oficial';

        const descripcion = data.descripcion
            ? escapeHtml(data.descripcion)
            : '<span class="text-muted">—</span>';

        const badge = data.es_oficial
            ? '<span class="star">⭐ Oficial</span>'
            : '<span class="badge-colegio">Del colegio</span>';

        const reorder = puedeGestionar
            ? `<div class="reorder">
                    <button type="button" class="btn-reorder" data-dir="arriba" title="Subir">▲</button>
                    <button type="button" class="btn-reorder" data-dir="abajo" title="Bajar">▼</button>
               </div>`
            : '';

        const estado = puedeGestionar
            ? `<div class="state-row">
                    <button type="button" class="switch ${activo ? 'on' : ''}"
                        data-toggle-estado-eje aria-label="Cambiar estado"
                        title="${activo ? 'Desactivar' : 'Activar'}"></button>
               </div>`
            : `<span class="eje-estado ${activo ? 'is-activo' : 'is-inactivo'}">
                    ${activo ? 'Activo' : 'Inactivo'}
               </span>`;

        const acciones = puedeGestionar
            ? `<div class="row-actions d-flex justify-content-center">
                    <button type="button" class="btn-accion btn-editar" data-editar-eje title="Editar eje">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button type="button" class="btn-accion btn-eliminar" data-eliminar-eje title="Eliminar eje">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
               </div>`
            : '';

        tr.innerHTML = `
            <td>${reorder}</td>
            <td>
                <div class="mod-name">
                    <span class="eje-nombre-texto">${escapeHtml(data.nombre)}</span>
                    ${badge}
                </div>
            </td>
            <td class="eje-descripcion">${descripcion}</td>
            <td class="col-tematicas">${Number(data.tematicas_oficiales_activas_count || 0)}</td>
            <td class="col-orden">${Number(data.orden ?? 0)}</td>
            <td>${estado}</td>
            <td class="col-actions">${acciones}</td>
        `;
        return tr;
    }

    function renderTablaEjes(ejes) {
        if (tablaEjesOficialesBody) tablaEjesOficialesBody.innerHTML = '';
        if (tablaEjesColegioBody) tablaEjesColegioBody.innerHTML = '';

        const lista = Array.isArray(ejes) ? ejes : [];
        lista
            .slice()
            .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
            .forEach((eje) => {
                const row = crearFilaEje(eje);
                const propio = eje.es_propio != null ? !!eje.es_propio : !eje.es_oficial;
                if (propio) tablaEjesColegioBody?.appendChild(row);
                else tablaEjesOficialesBody?.appendChild(row);
            });

        sincronizarSeccionEjesOficiales(modalEjesEl);
        sincronizarSeccionEjesColegio(modalEjesEl);
    }

    function insertarEjeEnTabla(data, tbodyPreferido = null) {
        const row = crearFilaEje(data);
        const tbody = tbodyPreferido || tablaEjesColegioBody;
        if (!tbody) return row;

        const siblings = filasEjesPropiosEn(tbody).filter((r) => r !== row);
        const next = siblings.find((r) => Number(r.dataset.orden) > Number(data.orden ?? 0));
        if (next) tbody.insertBefore(row, next);
        else tbody.appendChild(row);

        const scope = tbody.closest('.mod-ejes-group') || tbody.closest('#ejesModuloContenido') || modalEjesEl;
        sincronizarSeccionEjesColegio(scope);
        if (scope?.classList?.contains('mod-ejes-group')) {
            actualizarContadoresEjesGrupo(scope);
        }
        return row;
    }

    function insertarEjeEnTab(data) {
        const group = grupoEjesTab(data.modulo_id);
        if (!group) return;
        const tbody = contenedorEjesColegio(group);
        if (!tbody) return;
        insertarEjeEnTabla(data, tbody);
        aplicarFiltrosEjes();
    }

    function actualizarContadorEjesModuloEnTabModulos(moduloId, delta) {
        const moduloRow = root.querySelector(`tr[data-modulo-id="${moduloId}"]`);
        if (!moduloRow) return;
        const cell = moduloRow.querySelector('.col-ejes-propios');
        const propios = Math.max(0, Number(cell?.textContent || 0) + delta);
        if (cell) cell.textContent = String(propios);
        const total = Math.max(0, Number(moduloRow.dataset.ejesCount || 0) + delta);
        moduloRow.dataset.ejesCount = String(total);
    }

    function aplicarEstadoEjeEnFilas(ejeId, nuevoActivo) {
        document.querySelectorAll(`tr[data-eje-id="${ejeId}"]`).forEach((r) => {
            r.dataset.activo = nuevoActivo ? '1' : '0';
            const sw = r.querySelector('[data-toggle-estado-eje]');
            if (sw) {
                sw.classList.toggle('on', nuevoActivo);
                sw.title = nuevoActivo ? 'Desactivar' : 'Activar';
            }
            const badgeEstado = r.querySelector('.eje-estado');
            if (badgeEstado) {
                badgeEstado.classList.toggle('is-activo', nuevoActivo);
                badgeEstado.classList.toggle('is-inactivo', !nuevoActivo);
                badgeEstado.textContent = nuevoActivo ? 'Activo' : 'Inactivo';
            }
            const group = r.closest('.mod-ejes-group');
            if (group) actualizarContadoresEjesGrupo(group);
        });
        aplicarFiltrosEjes();
    }

    async function desactivarEjeDesdeFila(row) {
        const res = await ajaxRequest(urls().ejesEstado(row.dataset.ejeId), 'PATCH');
        if (!res.success) {
            mostrarToast('error', res.message || 'No se pudo desactivar el eje');
            return false;
        }

        aplicarEstadoEjeEnFilas(row.dataset.ejeId, !!res.activo);
        mostrarToast('success', res.message || 'Eje desactivado');
        return true;
    }

    async function manejarEliminarEje(row, btn) {
        const ejeId = row.dataset.ejeId;
        const nombre = row.dataset.nombre || 'este eje';
        const temasCount = Number(row.dataset.temasCount || 0);
        const activo = row.dataset.activo === '1';
        const moduloId = row.dataset.moduloId;

        if (temasCount > 0) {
            const html = `
                <div style="text-align:left">
                    <p><b>${escapeHtml(nombre)}</b> tiene contenido y no se puede eliminar:</p>
                    <ul style="margin:8px 0 12px 18px">
                        <li><b>${temasCount}</b> temática(s)</li>
                    </ul>
                    <p>El contenido se conserva. ${activo ? 'Puede desactivar el eje en su lugar.' : 'El eje ya está inactivo.'}</p>
                </div>
            `;

            if (!activo) {
                await Swal.fire({
                    title: 'No se puede eliminar',
                    html,
                    icon: 'info',
                    confirmButtonText: 'Entendido',
                });
                return;
            }

            const oferta = await Swal.fire({
                title: 'No se puede eliminar',
                html,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Desactivar eje',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#C14A2F',
                reverseButtons: true,
            });
            if (!oferta.isConfirmed) return;

            btn.disabled = true;
            await desactivarEjeDesdeFila(row);
            btn.disabled = false;
            return;
        }

        const confirmacion = await Swal.fire({
            title: 'Eliminar eje',
            html: `<p>¿Eliminar <b>${escapeHtml(nombre)}</b>? Esta acción no se puede deshacer.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#C14A2F',
            reverseButtons: true,
        });
        if (!confirmacion.isConfirmed) return;

        btn.disabled = true;
        const res = await ajaxRequest(urls().ejesDestroy(ejeId), 'DELETE');
        btn.disabled = false;

        if (!res.success) {
            if (res.can_delete === false) {
                row.dataset.temasCount = String(res.temas_count ?? row.dataset.temasCount ?? 0);
                await manejarEliminarEje(row, btn);
                return;
            }
            mostrarToast('error', res.message || 'No se pudo eliminar el eje');
            return;
        }

        document.querySelectorAll(`tr[data-eje-id="${ejeId}"]`).forEach((otra) => {
            const otroGroup = otra.closest('.mod-ejes-group');
            const otroScope = otroGroup || otra.closest('#ejesModuloContenido') || modalEjesEl;
            const otroTbody = otra.parentElement;
            otra.remove();
            sincronizarSeccionEjesColegio(otroScope);
            if (otroGroup) actualizarContadoresEjesGrupo(otroGroup);
            if (otroTbody) actualizarBotonesReorderEjes(otroTbody);
        });

        if (moduloId) actualizarContadorEjesModuloEnTabModulos(moduloId, -1);
        aplicarFiltrosEjes();
        mostrarToast('success', res.message || 'Eje eliminado');
    }

    function actualizarFilasEje(data) {
        document.querySelectorAll(`tr[data-eje-id="${data.id}"]`).forEach((oldRow) => {
            const puede = oldRow.dataset.puedeGestionar === '1' || !!data.puede_gestionar;
            const nueva = crearFilaEje({
                ...data,
                es_propio: true,
                es_oficial: false,
                puede_gestionar: puede,
            });
            const group = oldRow.closest('.mod-ejes-group');
            oldRow.replaceWith(nueva);
            if (group) actualizarContadoresEjesGrupo(group);
        });
        aplicarFiltrosEjes();
    }

    async function cargarEjeEnFormulario(ejeId) {
        setTituloFormEje('editar');
        setBtnGuardarEje('editar');
        setOrdenEjeEditable(false);

        const res = await ajaxRequest(urls().ejesShow(ejeId), 'GET');
        if (!res.success) {
            mostrarToast('error', res.message || 'No se pudo cargar el eje');
            resetFormEje();
            return false;
        }

        const data = res.data;
        document.getElementById('eje_id').value = data.id;
        document.getElementById('ejes_modulo_id').value = data.modulo_id;
        document.getElementById('eje_nombre').value = data.nombre || '';
        document.getElementById('eje_descripcion').value = data.descripcion || '';
        document.getElementById('eje_orden').value = data.orden ?? '';
        document.getElementById('eje_slug_preview').textContent = data.slug || slugify(data.nombre);
        setFormularioEjesEditable(true);

        document.getElementById('ejesFormCrearWrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return true;
    }

    async function abrirModalEditarEje(row) {
        if (!row || row.dataset.puedeGestionar !== '1') return;

        const moduloId = row.dataset.moduloId;
        const ejeId = row.dataset.ejeId;
        const group = row.closest('.mod-ejes-group');
        const moduloNombre = group?.dataset.moduloNombre
            || document.getElementById('modalVerEjesModuloSubtitle')?.textContent?.replace(/^Módulo:\s*/, '')
            || '';

        const modalAbierto = modalEjesEl?.classList.contains('show');
        const moduloActual = document.getElementById('ejes_modulo_id')?.value;

        if (!modalAbierto || String(moduloActual) !== String(moduloId)) {
            await abrirModalEjesModulo(moduloId, moduloNombre);
        }

        await cargarEjeEnFormulario(ejeId);
    }

    async function abrirModalEjesModulo(moduloId, moduloNombre) {
        if (!modalEjesEl) return;

        document.getElementById('ejes_modulo_id').value = moduloId;
        document.getElementById('modalVerEjesModuloLabel').textContent = 'Ejes del módulo';
        document.getElementById('modalVerEjesModuloSubtitle').textContent =
            moduloNombre ? `Módulo: ${moduloNombre}` : 'Ejes oficiales y del colegio';

        resetFormEje();
        setFormularioEjesEditable(true);
        if (tablaEjesOficialesBody) tablaEjesOficialesBody.innerHTML = '';
        if (tablaEjesColegioBody) tablaEjesColegioBody.innerHTML = '';
        sincronizarSeccionEjesOficiales(modalEjesEl);
        sincronizarSeccionEjesColegio(modalEjesEl);
        setEstadoModalEjes('loading');
        getModalEjes().show();

        const res = await ajaxRequest(urls().ejes(moduloId), 'GET');
        if (!res.success) {
            setEstadoModalEjes('error', res.message || 'No se pudieron cargar los ejes');
            return;
        }

        const moduloActivo = !!res.data?.modulo?.activo_para_institucion;
        setFormularioEjesEditable(moduloActivo);
        renderTablaEjes(res.data?.ejes || []);
        setEstadoModalEjes('ready');
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

    bindAmbienteToggles(rootEjes);
    rootEjes?.querySelectorAll('[data-tbody-ejes-colegio]').forEach(actualizarBotonesReorderEjes);

    /* ── Filtros de ejes (tab) ───────────────────────────────── */
    function valoresFiltrosEjes() {
        if (!rootEjes) return { tipo: '', estado: '' };
        return {
            tipo: rootEjes.querySelector('[data-filtro-ejes="tipo"]')?.value || '',
            estado: rootEjes.querySelector('[data-filtro-ejes="estado"]')?.value || '',
        };
    }

    function filasEjesVisiblesEnSeccion(seccion, filtros) {
        if (!seccion) return 0;
        const rows = [...seccion.querySelectorAll('tr[data-eje-id]')];
        let visibles = 0;

        rows.forEach((row) => {
            const esPropio = row.dataset.esPropio === '1';
            const activo = row.dataset.activo === '1';
            let ok = true;

            if (filtros.tipo === 'oficial' && esPropio) ok = false;
            if (filtros.tipo === 'colegio' && !esPropio) ok = false;
            if (filtros.estado === '1' && !activo) ok = false;
            if (filtros.estado === '0' && activo) ok = false;

            row.hidden = !ok;
            if (ok) visibles += 1;
        });

        return visibles;
    }

    function aplicarFiltrosEjes() {
        if (!rootEjes) return;

        const filtros = valoresFiltrosEjes();
        const hayFiltros = !!(filtros.tipo || filtros.estado);
        const emptyEl = rootEjes.querySelector('[data-empty-filtros-ejes]');
        let ambientesVisibles = 0;

        rootEjes.querySelectorAll('.amb-group').forEach((ambGroup) => {
            let modulosVisibles = 0;

            ambGroup.querySelectorAll('.mod-ejes-group').forEach((group) => {
                const seccionOficiales = group.querySelector('[data-seccion="oficiales"]');
                const seccionColegio = group.querySelector('[data-seccion="colegio"]');
                const foot = group.querySelector('.mod-ejes-foot');

                const visiblesOficiales = filasEjesVisiblesEnSeccion(seccionOficiales, filtros);
                const visiblesColegio = filasEjesVisiblesEnSeccion(seccionColegio, filtros);

                if (seccionOficiales) {
                    if (filtros.tipo === 'colegio') {
                        seccionOficiales.hidden = true;
                    } else if (hayFiltros) {
                        seccionOficiales.hidden = visiblesOficiales === 0;
                    } else {
                        seccionOficiales.hidden = false;
                    }
                }

                if (seccionColegio) {
                    if (filtros.tipo === 'oficial') {
                        seccionColegio.hidden = true;
                    } else if (hayFiltros) {
                        seccionColegio.hidden = visiblesColegio === 0;
                    } else {
                        seccionColegio.hidden = false;
                    }
                }

                if (foot) {
                    foot.hidden = filtros.tipo === 'oficial';
                }

                const groupVisible = !(hayFiltros && visiblesOficiales === 0 && visiblesColegio === 0);
                group.hidden = !groupVisible;
                if (groupVisible) modulosVisibles += 1;
            });

            if (hayFiltros && modulosVisibles === 0) {
                ambGroup.hidden = true;
                return;
            }

            ambGroup.hidden = false;
            ambientesVisibles += 1;
        });

        if (emptyEl) emptyEl.hidden = ambientesVisibles > 0 || !hayFiltros;
    }

    rootEjes?.querySelectorAll('[data-filtros-ejes] select').forEach((select) => {
        select.addEventListener('change', aplicarFiltrosEjes);
    });

    rootEjes?.querySelector('[data-limpiar-filtros-ejes]')?.addEventListener('click', () => {
        rootEjes.querySelectorAll('[data-filtros-ejes] select').forEach((select) => {
            select.value = '';
        });
        aplicarFiltrosEjes();
    });

    document.getElementById('eje_nombre')?.addEventListener('input', (e) => {
        document.getElementById('eje_slug_preview').textContent = slugify(e.target.value);
    });

    async function onClickEjesDelegado(e, scopeRoot) {
        const btnCrear = e.target.closest('[data-crear-eje-modulo]');
        if (btnCrear && scopeRoot.contains(btnCrear)) {
            abrirModalEjesModulo(btnCrear.dataset.moduloId, btnCrear.dataset.moduloNombre);
            return;
        }

        const btnToggle = e.target.closest('[data-toggle-estado-eje]');
        if (btnToggle && scopeRoot.contains(btnToggle)) {
            const row = btnToggle.closest('tr[data-eje-id]');
            if (!row || row.dataset.puedeGestionar !== '1') return;

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

        const btnEliminar = e.target.closest('[data-eliminar-eje]');
        if (btnEliminar && scopeRoot.contains(btnEliminar)) {
            const row = btnEliminar.closest('tr[data-eje-id]');
            if (!row || row.dataset.puedeGestionar !== '1') return;
            await manejarEliminarEje(row, btnEliminar);
            return;
        }

        const btnEditar = e.target.closest('[data-editar-eje]');
        if (btnEditar && scopeRoot.contains(btnEditar)) {
            const row = btnEditar.closest('tr[data-eje-id]');
            if (!row || row.dataset.puedeGestionar !== '1') return;
            await abrirModalEditarEje(row);
            return;
        }

        const btnReorder = e.target.closest('.btn-reorder');
        if (!btnReorder || !scopeRoot.contains(btnReorder)) return;
        if (btnReorder.disabled) return;

        const row = btnReorder.closest('tr[data-eje-id]');
        if (!row || row.dataset.puedeGestionar !== '1') return;

        const tbody = row.parentElement;
        const direccion = btnReorder.dataset.dir;
        const propias = filasEjesGestionablesEn(tbody);
        const index = propias.indexOf(row);
        const vecino = direccion === 'arriba' ? propias[index - 1] : propias[index + 1];
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

        // Reordenar gemela en el otro contenedor si existe
        const otra = [...document.querySelectorAll(`tr[data-eje-id="${row.dataset.ejeId}"]`)]
            .find((r) => r !== row);
        const otraVecina = otra
            ? [...document.querySelectorAll(`tr[data-eje-id="${vecino.dataset.ejeId}"]`)].find((r) => r !== vecino)
            : null;
        if (otra && otraVecina && otra.parentElement === otraVecina.parentElement) {
            otra.dataset.orden = row.dataset.orden;
            otraVecina.dataset.orden = vecino.dataset.orden;
            const oc = otra.querySelector('.col-orden');
            const ovc = otraVecina.querySelector('.col-orden');
            if (oc) oc.textContent = otra.dataset.orden;
            if (ovc) ovc.textContent = otraVecina.dataset.orden;
            if (direccion === 'arriba') otra.parentElement.insertBefore(otra, otraVecina);
            else otra.parentElement.insertBefore(otraVecina, otra);
            actualizarBotonesReorderEjes(otra.parentElement);
        }

        mostrarToast('success', res.message || 'Orden actualizado');
    }

    modalEjesEl?.addEventListener('click', (e) => onClickEjesDelegado(e, modalEjesEl));
    rootEjes?.addEventListener('click', (e) => onClickEjesDelegado(e, rootEjes));

    btnCancelarEje?.addEventListener('click', () => {
        resetFormEje();
    });

    formEje?.addEventListener('submit', async (e) => {
        e.preventDefault();
        limpiarErroresFormEje();

        const moduloId = document.getElementById('ejes_modulo_id').value;
        const ejeId = document.getElementById('eje_id').value;
        const esEdicion = !!ejeId;

        if (!moduloId && !esEdicion) {
            mostrarToast('error', 'No se identificó el módulo');
            return;
        }

        const payload = {
            nombre: document.getElementById('eje_nombre').value.trim(),
            descripcion: document.getElementById('eje_descripcion').value.trim() || null,
        };
        const ordenVal = document.getElementById('eje_orden').value;
        if (!esEdicion && ordenVal !== '') payload.orden = Number(ordenVal);
        if (esEdicion && ordenVal !== '') payload.orden = Number(ordenVal);

        setBtnGuardarEje(esEdicion ? 'guardando' : 'creando');
        const res = await ajaxRequest(
            esEdicion ? urls().ejesUpdate(ejeId) : urls().ejes(moduloId),
            esEdicion ? 'PUT' : 'POST',
            payload
        );
        setBtnGuardarEje(esEdicion ? 'editar' : 'crear');

        if (!res.success) {
            if (res.errors) mostrarErroresFormEje(res.errors);
            mostrarToast('error', res.message || (esEdicion ? 'No se pudo actualizar el eje' : 'No se pudo crear el eje'));
            return;
        }

        if (res.data) {
            if (esEdicion) {
                actualizarFilasEje(res.data);
            } else {
                insertarEjeEnTabla(res.data, tablaEjesColegioBody);
                insertarEjeEnTab(res.data);
                actualizarContadorEjesModuloEnTabModulos(moduloId, 1);
            }
        }
        resetFormEje();
        mostrarToast('success', res.message || (esEdicion ? 'Eje actualizado' : 'Eje creado'));
    });

    root.querySelectorAll('[data-tbody-colegio]').forEach(actualizarBotonesReorder);
});
