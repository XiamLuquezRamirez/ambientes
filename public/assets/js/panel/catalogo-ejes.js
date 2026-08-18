document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector('.config-panel-catalogo');
    if (!root) return;

    const rootModulos = root.querySelector('.config-panel-modulos');
    const rootEjes = root.querySelector('.config-panel-ejes');

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
            ejes: (moduloId) => urlFromTemplate(root.dataset.urlEjesTemplate, { '__MODULO__': moduloId }),
            ejesShow: (ejeId) => urlFromTemplate(root.dataset.urlEjesShowTemplate, { '__EJE__': ejeId }),
            ejesUpdate: (ejeId) => urlFromTemplate(root.dataset.urlEjesUpdateTemplate, { '__EJE__': ejeId }),
            ejesMover: (ejeId) => urlFromTemplate(root.dataset.urlEjesMoverTemplate, { '__EJE__': ejeId }),
            ejesEstado: (ejeId) => urlFromTemplate(root.dataset.urlEjesEstadoTemplate, { '__EJE__': ejeId }),
            ejesDestroy: (ejeId) => urlFromTemplate(root.dataset.urlEjesDestroyTemplate, { '__EJE__': ejeId }),
        };
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

    function bindAmbienteToggles(container) {
        window.ConfigEjesUi?.bindAmbienteToggles(container);
    }

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
        if (hint) {
            hint.hidden = editable;
            if (!editable) {
                hint.textContent = 'El módulo está inactivo. Solicite al administrador que lo active para gestionar ejes.';
            }
        }
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

        const celdaAcciones = propio
            ? `<td class="col-actions">${acciones}</td>`
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
            ${celdaAcciones}
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
            if (tbody.closest('[data-ejes-pager]')) {
                window.ConfigEjesUi?.irAPaginaDelEje(tbody, data.id);
            }
        }
        return row;
    }

    function insertarEjeEnTab(data) {
        const group = grupoEjesTab(data.modulo_id);
        if (!group) return;
        const tbody = contenedorEjesColegio(group);
        if (!tbody) return;
        insertarEjeEnTabla(data, tbody);
        window.ConfigEjesUi?.irAPaginaDelEje(tbody, data.id);
    }

    function actualizarContadorEjesModuloEnTabModulos(moduloId, delta) {
        rootModulos?.querySelectorAll(`tr[data-modulo-id="${moduloId}"]`).forEach((moduloRow) => {
            const cell = moduloRow.querySelector('.col-ejes-propios');
            const propios = Math.max(0, Number(cell?.textContent || 0) + delta);
            if (cell) cell.textContent = String(propios);
            const total = Math.max(0, Number(moduloRow.dataset.ejesCount || 0) + delta);
            moduloRow.dataset.ejesCount = String(total);
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
            const badgeEstado = r.querySelector('.eje-estado');
            if (badgeEstado) {
                badgeEstado.classList.toggle('is-activo', nuevoActivo);
                badgeEstado.classList.toggle('is-inactivo', !nuevoActivo);
                badgeEstado.textContent = nuevoActivo ? 'Activo' : 'Inactivo';
            }
            const group = r.closest('.mod-ejes-group');
            if (group) actualizarContadoresEjesGrupo(group);
        });
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
            if (otroTbody?.closest('[data-ejes-pager]')) {
                window.ConfigEjesUi?.aplicarPaginacion(otroTbody);
            }
        });

        if (moduloId) actualizarContadorEjesModuloEnTabModulos(moduloId, -1);
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

    async function abrirModalEjesModulo(moduloId, moduloNombre, esOficialHint = null) {
        if (!modalEjesEl) return;

        function setVisibilidadSeccionEjesOficialesModal(mostrar) {
            const seccion = modalEjesEl.querySelector('.modulos-seccion-oficiales[data-seccion="oficiales"]');
            if (seccion) seccion.hidden = !mostrar;
            const intro = modalEjesEl.querySelector('.ejes-modal-intro');
            if (intro) {
                intro.innerHTML = mostrar
                    ? 'Los <span class="star">⭐ Oficiales</span> son del sistema (solo lectura). En <span class="badge-colegio">Del colegio</span> gestiona ejes propios del módulo.'
                    : 'Gestione los <span class="badge-colegio">ejes del colegio</span> de este módulo adicional.';
            }
        }

        document.getElementById('ejes_modulo_id').value = moduloId;
        document.getElementById('modalVerEjesModuloLabel').textContent = 'Ejes del módulo';
        document.getElementById('modalVerEjesModuloSubtitle').textContent =
            moduloNombre ? `Módulo: ${moduloNombre}` : 'Ejes del módulo';

        const mostrarOficialesHint = esOficialHint == null ? true : !!esOficialHint;
        setVisibilidadSeccionEjesOficialesModal(mostrarOficialesHint);

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
        const esOficial = res.data?.modulo?.es_oficial != null
            ? !!res.data.modulo.es_oficial
            : mostrarOficialesHint;
        setVisibilidadSeccionEjesOficialesModal(esOficial);
        setFormularioEjesEditable(moduloActivo);
        renderTablaEjes(res.data?.ejes || []);
        setEstadoModalEjes('ready');
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
            const esOficial = group?.dataset.esOficial !== '0';
            await abrirModalEjesModulo(moduloId, moduloNombre, esOficial);
        }

        await cargarEjeEnFormulario(ejeId);
    }

    async function onClickEjesDelegado(e, scopeRoot) {
        const btnCrear = e.target.closest('[data-crear-eje-modulo]');
        if (btnCrear && scopeRoot.contains(btnCrear)) {
            const group = btnCrear.closest('.mod-ejes-group');
            const esOficial = group?.dataset.esOficial !== '0';
            abrirModalEjesModulo(btnCrear.dataset.moduloId, btnCrear.dataset.moduloNombre, esOficial);
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
        if (tbody.closest('[data-ejes-pager]')) {
            window.ConfigEjesUi?.irAPaginaDelEje(tbody, row.dataset.ejeId);
        }

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
            if (otra.parentElement.closest('[data-ejes-pager]')) {
                window.ConfigEjesUi?.irAPaginaDelEje(otra.parentElement, otra.dataset.ejeId);
            }
        }

        mostrarToast('success', res.message || 'Orden actualizado');
    }

    rootEjes?.querySelectorAll('[data-tbody-ejes-colegio]').forEach(actualizarBotonesReorderEjes);
    window.ConfigEjesUi?.refrescarPaginacion(rootEjes);

    document.getElementById('eje_nombre')?.addEventListener('input', (e) => {
        document.getElementById('eje_slug_preview').textContent = slugify(e.target.value);
    });

    rootModulos?.addEventListener('click', (e) => {
        const btnEjes = e.target.closest('[data-ejes-modulo]');
        if (!btnEjes) return;
        const row = btnEjes.closest('tr');
        abrirModalEjesModulo(
            row.dataset.moduloId,
            row.dataset.nombre || '',
            row.dataset.esOficial !== '0'
        );
    });

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
        if (ordenVal !== '') payload.orden = Number(ordenVal);

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
});
