/**
 * tematicas-form.js — CRUD de temáticas + experiencias rápidas
 * Requiere: jQuery, Bootstrap 5, SweetAlert2, window.TEMATICAS_ARBOL
 */
(function ($) {
    'use strict';

    const $app = $('.tematicas-app').first();
    if (!$app.length) return;

    const rol = $app.data('rol') || 'admin';
    const arbol = Array.isArray(window.TEMATICAS_ARBOL) ? window.TEMATICAS_ARBOL : [];

    const urls = {
        listar: $app.data('url-listar') || '',
        guardar: $app.data('url-guardar-template') || '',
        mostrar: $app.data('url-mostrar-template') || '',
        actualizar: $app.data('url-actualizar-template') || '',
        estado: $app.data('url-estado-template') || '',
        eliminar: $app.data('url-eliminar-template') || '',
        dbas: $app.data('url-dbas') || '',
        experiencias: $app.data('url-experiencias-template') || '',
        experienciasGuardar: $app.data('url-experiencias-guardar-template') || '',
        experienciasMostrar: $app.data('url-experiencias-mostrar-template') || '',
        experienciasActualizar: $app.data('url-experiencias-actualizar-template') || '',
        experienciasFlujo: $app.data('url-experiencias-flujo-template') || '',
        experienciasEstado: $app.data('url-experiencias-estado-template') || '',
    };

    const csrf = $('meta[name="csrf-token"]').attr('content');

    let ejeActual = null;
    let ejeNombreActual = '';
    let tematicaActual = null;
    let experienciaActual = null;
    let modoSoloLectura = false;
    let modoSoloLecturaExp = false;
    let indicadores = [];
    let dbasSeleccionados = [];
    let materialesExp = [];

    const $filtroAmbiente = $('#filtroAmbiente');
    const $filtroModulo = $('#filtroModulo');
    const $filtroEje = $('#filtroEje');
    const $filtroEstado = $('#filtroEstado');
    const $filtroGrado = $('#filtroGrado');
    const $filtroSinDba = $('#filtroSinDba');
    const $btnLimpiarFiltros = $('#btnLimpiarFiltrosTematicas');
    const $btnNueva = $('#btnNuevaTematica');
    const $cardsWrap = $('#tematicasCardsContainer');
    const $empty = $('#tematicasEmpty');
    const $pager = $('#tematicasPager');
    const $pagerPrev = $pager.find('[data-pager-prev]');
    const $pagerNext = $pager.find('[data-pager-next]');
    const $pagerInfo = $pager.find('[data-pager-info]');
    const $listaIndicadores = $('#listaIndicadores');
    const $listaDbas = $('#listaDbas');
    const $listaExp = $('#listaExperienciasBody');
    const $btnCrearExp = $('#btnCrearExperienciaDesdeTematica');
    const $btnAgregarExp = $('#btnAgregarExperiencia');
    const $listaMaterialesExp = $('#listaMaterialesExp');
    const $btnAgregarMaterialExp = $('#btnAgregarMaterialExp');
    const DURACIONES_EXP = [15, 20, 30, 45];
    const DURACION_EXP_DEFAULT = 20;
    const $selAmbiente = $('#tematica_ambiente_id');
    const $selModulo = $('#tematica_modulo_id');
    const $selEje = $('#tematica_eje_id');
    const $wrapEjeSelect = $('#wrapTematicaEjeSelect');
    const $wrapEjeNombre = $('#wrapTematicaEjeNombre');

    let paginaActual = 1;
    const perPage = 12;

    const modalTematicaEl = document.getElementById('modalTematica');
    const modalDbaEl = document.getElementById('modalSelectorDba');
    const modalExpEl = document.getElementById('modalExperienciaRapida');
    const modalTematica = modalTematicaEl ? bootstrap.Modal.getOrCreateInstance(modalTematicaEl) : null;
    const modalDba = modalDbaEl ? bootstrap.Modal.getOrCreateInstance(modalDbaEl) : null;
    const modalExp = modalExpEl ? bootstrap.Modal.getOrCreateInstance(modalExpEl) : null;

    /** Solo un modal visible: al abrir hijo se oculta el padre; al cerrar hijo se restaura. */
    const modalPila = [];
    let ocultandoModalParaApilar = false;

    function modalEstaVisible(el) {
        return !!(el && el.classList.contains('show'));
    }

    function mostrarModalRaiz(instance) {
        if (!instance) return;
        modalPila.length = 0;
        instance.show();
    }

    function mostrarModalApilado(instance, padreEl) {
        if (!instance) return;
        if (padreEl && modalEstaVisible(padreEl)) {
            const padreInst = bootstrap.Modal.getInstance(padreEl)
                || bootstrap.Modal.getOrCreateInstance(padreEl);
            modalPila.push(padreEl);
            ocultandoModalParaApilar = true;
            padreEl.addEventListener('hidden.bs.modal', function alOcultarPadre() {
                ocultandoModalParaApilar = false;
                instance.show();
            }, { once: true });
            padreInst.hide();
            return;
        }
        instance.show();
    }

    function restaurarModalPadre() {
        const padreEl = modalPila.pop();
        if (!padreEl) return;
        bootstrap.Modal.getOrCreateInstance(padreEl).show();
    }

    if (modalTematicaEl) {
        modalTematicaEl.addEventListener('hidden.bs.modal', () => {
            if (!ocultandoModalParaApilar) {
                modalPila.length = 0;
            }
        });
    }

    [modalExpEl, modalDbaEl].forEach((el) => {
        if (!el) return;
        el.addEventListener('hidden.bs.modal', restaurarModalPadre);
    });

    function tpl(template, mapa) {
        let out = String(template || '');
        Object.keys(mapa).forEach((k) => {
            out = out.split(k).join(mapa[k]);
        });
        return out;
    }

    function toast(icon, title) {
        if (typeof Swal === 'undefined') {
            window.alert(title);
            return;
        }
        Swal.fire({ icon, title, timer: 2200, showConfirmButton: false });
    }

    function errorAjax(xhr, fallback) {
        const data = xhr?.responseJSON;
        if (data?.errors) {
            const msg = Object.values(data.errors).flat().join('\n');
            return msg || fallback;
        }
        return data?.message || fallback;
    }

    function api(url, method, body) {
        const opts = {
            url,
            method,
            headers: {
                'X-CSRF-TOKEN': csrf,
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            },
            dataType: 'json',
        };
        if (body !== undefined) {
            opts.contentType = 'application/json';
            opts.data = JSON.stringify(body);
        }
        return $.ajax(opts);
    }

    function puedeEditarTematica(t) {
        if (t && typeof t.puede_editar === 'boolean') return t.puede_editar;
        return !!(t && t.es_propia);
    }

    function activarTabTematica(tabId) {
        const trigger = document.getElementById(tabId);
        if (!trigger || typeof bootstrap === 'undefined') return;
        bootstrap.Tab.getOrCreateInstance(trigger).show();
    }

    function activarTabExperiencia(tabId) {
        const trigger = document.getElementById(tabId);
        if (!trigger || typeof bootstrap === 'undefined') return;
        bootstrap.Tab.getOrCreateInstance(trigger).show();
    }

    function puedeCrearExperiencia(t) {
        if (!t || !t.id) return false;
        if (typeof t.puede_crear_experiencia === 'boolean') return t.puede_crear_experiencia;
        return puedeEditarTematica(t) && !!t.activo;
    }

    function etiquetaEstado(activo) {
        return activo
            ? '<span class="badge-estado-exp badge-estado-activo">Activo</span>'
            : '<span class="badge-estado-exp badge-estado-inactivo">Inactivo</span>';
    }

    function etiquetaOrigen(t) {
        if (t.es_oficial) {
            return '<span class="star">⭐ Oficial</span>';
        }
        return '<span class="badge-colegio">Del colegio</span>';
    }

    function badgeEstadoExp(estado) {
        const e = String(estado || 'borrador');
        if (e === 'activa') return '<span class="badge-estado-exp es-activa">Activa</span>';
        if (e === 'archivada') return '<span class="badge-estado-exp es-archivada">Archivada</span>';
        return '<span class="badge-estado-exp es-borrador">Borrador</span>';
    }

    function badgeEstadoTematica(estado) {
        const e = String(estado || 'borrador');
        if (e === 'activa') return '<span class="badge-estado-exp es-activa">Activa</span>';
        if (e === 'archivada') return '<span class="badge-estado-exp es-archivada">Archivada</span>';
        return '<span class="badge-estado-exp es-borrador">Borrador</span>';
    }

    /* ── Filtros Ambiente / Módulo / Eje (cascada opcional) ───── */
    function llenarFiltroAmbientes() {
        $filtroAmbiente.empty().append('<option value="">Todos los ambientes</option>');
        arbol.forEach((a) => {
            $filtroAmbiente.append($('<option>').val(a.id).text(a.nombre));
        });
        $filtroModulo.prop('disabled', true).empty().append('<option value="">Todos los módulos</option>');
        $filtroEje.prop('disabled', true).empty().append('<option value="">Todos los ejes</option>');
    }

    function ambienteFiltro() {
        const id = Number($filtroAmbiente.val());
        return arbol.find((a) => Number(a.id) === id) || null;
    }

    function moduloFiltro() {
        const amb = ambienteFiltro();
        if (!amb) return null;
        const id = Number($filtroModulo.val());
        return (amb.modulos || []).find((m) => Number(m.id) === id) || null;
    }

    function hayFiltrosActivos() {
        return !!(
            $filtroAmbiente.val()
            || $filtroModulo.val()
            || $filtroEje.val()
            || $filtroEstado.val()
            || $filtroGrado.val()
            || $filtroSinDba.is(':checked')
        );
    }

    function actualizarBtnLimpiar() {
        $btnLimpiarFiltros.prop('hidden', !hayFiltrosActivos());
    }

    function aplicarFiltros(resetPage) {
        if (resetPage !== false) paginaActual = 1;
        actualizarBtnLimpiar();
        listarTematicas();
    }

    function limpiarFiltros() {
        $filtroAmbiente.val('');
        $filtroModulo.prop('disabled', true).empty().append('<option value="">Todos los módulos</option>');
        $filtroEje.prop('disabled', true).empty().append('<option value="">Todos los ejes</option>');
        $filtroEstado.val('');
        $filtroGrado.val('');
        $filtroSinDba.prop('checked', false);
        aplicarFiltros(true);
    }

    function onFiltroAmbienteChange() {
        const amb = ambienteFiltro();
        $filtroModulo.empty().append('<option value="">Todos los módulos</option>');
        $filtroEje.empty().append('<option value="">Todos los ejes</option>').prop('disabled', true);
        if (!amb) {
            $filtroModulo.prop('disabled', true);
            aplicarFiltros(true);
            return;
        }
        (amb.modulos || []).forEach((m) => {
            $filtroModulo.append($('<option>').val(m.id).text(m.nombre));
        });
        $filtroModulo.prop('disabled', false);
        aplicarFiltros(true);
    }

    function onFiltroModuloChange() {
        const mod = moduloFiltro();
        $filtroEje.empty().append('<option value="">Todos los ejes</option>');
        if (!mod) {
            $filtroEje.prop('disabled', true);
            aplicarFiltros(true);
            return;
        }
        (mod.ejes || []).forEach((e) => {
            $filtroEje.append($('<option>').val(e.id).text(e.nombre));
        });
        $filtroEje.prop('disabled', false);
        aplicarFiltros(true);
    }

    function paramsFiltros() {
        const params = { page: paginaActual, per_page: perPage };
        const ambienteId = $filtroAmbiente.val();
        const moduloId = $filtroModulo.val();
        const ejeId = $filtroEje.val();
        const estado = $filtroEstado.val();
        const gradoId = $filtroGrado.val();
        if (ambienteId) params.ambiente_id = ambienteId;
        if (moduloId) params.modulo_id = moduloId;
        if (ejeId) params.eje_id = ejeId;
        if (estado) params.estado = estado;
        if (gradoId) params.grado_id = gradoId;
        if ($filtroSinDba.is(':checked')) params.sin_dba = 1;
        return params;
    }

    function mostrarEmpty(msg) {
        $cardsWrap.prop('hidden', true).empty();
        $pager.prop('hidden', true);
        $empty.prop('hidden', false).text(msg || 'No hay temáticas para mostrar.');
    }

    function renderPager(pagination) {
        if (!pagination || Number(pagination.last_page || 1) <= 1) {
            $pager.prop('hidden', true);
            return;
        }

        const from = pagination.from || 0;
        const to = pagination.to || 0;
        const total = pagination.total || 0;
        const current = Number(pagination.current_page || 1);
        const last = Number(pagination.last_page || 1);

        $pagerInfo.text(`${from}–${to} de ${total} · Página ${current} de ${last}`);
        $pagerPrev.prop('disabled', current <= 1);
        $pagerNext.prop('disabled', current >= last);
        $pager.prop('hidden', false);
    }

    /* ── Listado plano ───────────────────────────────────────── */
    function listarTematicas() {
        if (!urls.listar) {
            mostrarEmpty('No hay endpoint de listado configurado.');
            return;
        }

        const qs = $.param(paramsFiltros());
        const url = urls.listar + (urls.listar.includes('?') ? '&' : '?') + qs;

        api(url, 'GET')
            .done((res) => {
                const pagination = res?.data?.pagination || null;
                if (pagination?.current_page) {
                    paginaActual = Number(pagination.current_page);
                }
                renderCardsPlanas(res?.data?.tematicas || [], pagination);
            })
            .fail((xhr) => {
                toast('error', errorAjax(xhr, 'No se pudieron cargar las temáticas.'));
                mostrarEmpty('No se pudieron cargar las temáticas.');
            });
    }

    function escapar(texto) {
        return $('<div>').text(texto == null ? '' : String(texto)).html();
    }

    function textoOpcional(valor) {
        const limpio = String(valor || '').trim();
        return limpio || null;
    }

    function truncar(texto, max) {
        const limpio = String(texto || '').trim();
        if (!limpio) return '';
        if (limpio.length <= max) return limpio;
        return `${limpio.slice(0, max - 1)}…`;
    }

    function setBotonesCrearExperiencia(habilitado) {
        const disabled = !habilitado;
        $btnCrearExp.prop('disabled', disabled);
        $btnAgregarExp.prop('disabled', disabled);
    }

    function metaFila(icono, etiqueta, valor) {
        if (!valor) return '';
        return `<div class="tematica-meta-row"><i class="fa-solid ${icono}"></i><span><strong>${escapar(etiqueta)}:</strong> ${escapar(valor)}</span></div>`;
    }

    function htmlToggleActivo(id, activo, inputClass, nombre) {
        const title = activo ? 'Desactivar' : 'Activar';
        const nombreAttr = nombre ? ` data-nombre="${escapar(nombre)}"` : '';
        return `
            <div class="form-check form-switch mb-0" onclick="event.stopPropagation()">
                <input class="form-check-input ${inputClass}" type="checkbox" role="switch"
                    data-id="${id}"${nombreAttr}
                    title="${title}" style="cursor:pointer;"
                    ${activo ? 'checked' : ''}>
            </div>
        `;
    }

    function htmlCardTematica(t) {
        const editable = puedeEditarTematica(t);
        const origen = etiquetaOrigen(t);
        const estadoFlujo = badgeEstadoTematica(t.estado);
        const estadoActivo = etiquetaEstado(!!t.activo);
        const expTexto = t.experiencias_por_grado_texto
            || (Number(t.experiencias_count || 0) > 0
                ? `${Number(t.experiencias_count)} exp.`
                : 'Sin experiencias');

        const acciones = [];
        if (editable) {
            acciones.push(
                `<div class="tematica-card-toggle">${htmlToggleActivo(t.id, !!t.activo, 'toggle-activo-tematica', t.nombre)}</div>`
            );
            if (urls.eliminar) {
                acciones.push(
                    `<button type="button" class="btn-accion btn-eliminar" data-accion="eliminar" data-id="${t.id}" title="Eliminar"><i class="fa-solid fa-trash"></i> Eliminar</button>`
                );
            }
        }

        const cardClases = ['tematica-card', 'tematica-card--clickable'];
        cardClases.push(t.es_oficial ? 'tematica-card--oficial' : 'tematica-card--colegio');
        if (!editable) cardClases.push('tematica-card--solo-lectura');

        const accionesHtml = acciones.length
            ? `<div class="tematica-card-actions">${acciones.join('')}</div>`
            : '';

        return `
            <article class="${cardClases.join(' ')}" data-id="${t.id}" data-editable="${editable ? '1' : '0'}" role="button" tabindex="0" title="${editable ? 'Editar temática' : 'Ver temática'}">
                <div class="tematica-card-top">
                    <div class="tematica-card-icon" aria-hidden="true"><i class="fa-solid fa-layer-group"></i></div>
                    <div class="tematica-card-identity">
                        <h5>${escapar(t.nombre || 'Sin nombre')}</h5>
                        <div class="tematica-card-badges">
                            ${origen}
                            ${estadoFlujo}
                            ${estadoActivo}
                        </div>
                    </div>
                    <span class="tematica-card-arrow" aria-hidden="true"><i class="fa-solid fa-chevron-right"></i></span>
                </div>
                <div class="tematica-card-body">
                    ${metaFila('fa-building', 'Ambiente', t.ambiente || '')}
                    ${metaFila('fa-cube', 'Módulo', t.modulo || '')}
                    ${metaFila('fa-diagram-project', 'Eje', t.eje || '')}
                    ${rol === 'superadmin' ? metaFila('fa-school', 'Institución', t.institucion || (t.es_oficial ? 'PedNia (oficial)' : '')) : ''}
                    <div class="tematica-meta-row tematica-meta-row--exp">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                        <span>${escapar(expTexto)}</span>
                    </div>
                </div>
                ${accionesHtml}
            </article>
        `;
    }

    function renderCardsPlanas(tematicas, pagination) {
        if (!tematicas.length) {
            mostrarEmpty('No hay temáticas con los filtros seleccionados.');
            return;
        }

        $empty.prop('hidden', true);
        $cardsWrap.prop('hidden', false).empty();
        const $grid = $('<div class="tematicas-grid"></div>');
        tematicas.forEach((t) => {
            $grid.append(htmlCardTematica(t));
        });
        $cardsWrap.append($grid);
        renderPager(pagination);
    }

    /* ── Cascada de eje en modal (crear) ─────────────────────── */
    function llenarSelectAmbientesModal(selectedId) {
        $selAmbiente.empty().append('<option value="">Ambiente…</option>');
        arbol.forEach((a) => {
            $selAmbiente.append($('<option>').val(a.id).text(a.nombre));
        });
        if (selectedId) $selAmbiente.val(String(selectedId));
        $selModulo.prop('disabled', true).empty().append('<option value="">Módulo…</option>');
        $selEje.prop('disabled', true).empty().append('<option value="">Eje…</option>');
    }

    function ambienteModal() {
        const id = Number($selAmbiente.val());
        return arbol.find((a) => Number(a.id) === id) || null;
    }

    function moduloModal() {
        const amb = ambienteModal();
        if (!amb) return null;
        const id = Number($selModulo.val());
        return (amb.modulos || []).find((m) => Number(m.id) === id) || null;
    }

    function onModalAmbienteChange() {
        const amb = ambienteModal();
        $selModulo.empty().append('<option value="">Módulo…</option>');
        $selEje.empty().append('<option value="">Eje…</option>').prop('disabled', true);
        ejeActual = null;
        ejeNombreActual = '';
        if (!amb) {
            $selModulo.prop('disabled', true);
            return;
        }
        (amb.modulos || []).forEach((m) => {
            $selModulo.append($('<option>').val(m.id).text(m.nombre));
        });
        $selModulo.prop('disabled', false);
    }

    function onModalModuloChange() {
        const mod = moduloModal();
        $selEje.empty().append('<option value="">Eje…</option>');
        ejeActual = null;
        ejeNombreActual = '';
        if (!mod) {
            $selEje.prop('disabled', true);
            return;
        }
        (mod.ejes || []).forEach((e) => {
            $selEje.append($('<option>').val(e.id).text(e.nombre));
        });
        $selEje.prop('disabled', false);
    }

    function onModalEjeChange() {
        const mod = moduloModal();
        const id = Number($selEje.val());
        const eje = (mod?.ejes || []).find((e) => Number(e.id) === id) || null;
        ejeActual = eje ? Number(eje.id) : null;
        ejeNombreActual = eje ? eje.nombre : '';
    }

    function mostrarSelectorEjeCreacion(visible) {
        $wrapEjeSelect.prop('hidden', !visible);
        $wrapEjeNombre.prop('hidden', visible);
    }

    /* ── Indicadores ─────────────────────────────────────────── */
    function renderIndicadores() {
        $listaIndicadores.empty();
        if (!indicadores.length) {
            $listaIndicadores.append('<p class="text-muted small mb-0">Agregue al menos un indicador.</p>');
            return;
        }
        indicadores.forEach((ind, idx) => {
            const $item = $(`
                <div class="indicador-item" data-idx="${idx}">
                    <textarea class="form-control indicador-desc" maxlength="300" ${modoSoloLectura ? 'readonly' : ''} placeholder="Descripción del indicador…">${$('<div>').text(ind.descripcion || '').html()}</textarea>
                    ${modoSoloLectura ? '' : `<button type="button" class="btn-accion btn-eliminar btn-quitar-indicador" title="Quitar"><i class="fa-solid fa-trash"></i></button>`}
                </div>
            `);
            $listaIndicadores.append($item);
        });
    }

    function syncIndicadoresDesdeDom() {
        const nuevos = [];
        $listaIndicadores.find('.indicador-item').each(function () {
            const idx = Number($(this).data('idx'));
            const prev = indicadores[idx] || {};
            const desc = String($(this).find('.indicador-desc').val() || '').trim();
            if (!desc && !prev.id) return;
            nuevos.push({
                id: prev.id || null,
                descripcion: desc,
                orden: nuevos.length + 1,
            });
        });
        indicadores = nuevos;
    }

    function agregarIndicador(desc) {
        syncIndicadoresDesdeDom();
        indicadores.push({ id: null, descripcion: desc || '', orden: indicadores.length + 1 });
        renderIndicadores();
    }

    /* ── DBAs ────────────────────────────────────────────────── */
    function renderDbas() {
        $listaDbas.empty();
        if (!dbasSeleccionados.length) {
            $listaDbas.append('<p class="text-muted small mb-0">Sin DBAs asociados.</p>');
            return;
        }
        dbasSeleccionados.forEach((dba, idx) => {
            const relacion = dba.relacion || 'principal';
            const observacion = dba.observacion || '';
            const $item = $(`
                <div class="dba-item" data-idx="${idx}">
                    <div class="dba-item-body">
                        <div class="dba-codigo">${$('<div>').text(dba.codigo || ('DBA #' + dba.id)).html()}</div>
                        <div class="dba-desc">${$('<div>').text(dba.descripcion || '').html()}</div>
                        <div class="dba-meta">
                            <select class="form-select form-select-sm dba-relacion" style="max-width:220px" ${modoSoloLectura ? 'disabled' : ''}>
                                <option value="principal" ${relacion === 'principal' ? 'selected' : ''}>Principal</option>
                                <option value="complementario" ${relacion === 'complementario' ? 'selected' : ''}>Complementario</option>
                            </select>
                            <textarea class="form-control form-control-sm dba-observacion" maxlength="1000"
                                placeholder="Observación (opcional)" ${modoSoloLectura ? 'readonly' : ''}>${$('<div>').text(observacion).html()}</textarea>
                        </div>
                    </div>
                    ${modoSoloLectura ? '' : `<button type="button" class="btn-accion btn-eliminar btn-quitar-dba" title="Quitar"><i class="fa-solid fa-trash"></i></button>`}
                </div>
            `);
            $listaDbas.append($item);
        });
    }

    function syncDbasDesdeDom() {
        $listaDbas.find('.dba-item').each(function () {
            const idx = Number($(this).data('idx'));
            if (dbasSeleccionados[idx]) {
                dbasSeleccionados[idx].relacion = $(this).find('.dba-relacion').val() || 'principal';
                dbasSeleccionados[idx].observacion = String($(this).find('.dba-observacion').val() || '').trim() || null;
            }
        });
    }

    function buscarDbas() {
        if (!urls.dbas) {
            toast('warning', 'No hay endpoint de DBAs configurado.');
            return;
        }
        const params = $.param({
            grado_id: $('#filtroDbaGrado').val() || '',
            area_id: $('#filtroDbaArea').val() || '',
            q: $('#filtroDbaQ').val() || '',
        });
        api(urls.dbas + (urls.dbas.includes('?') ? '&' : '?') + params, 'GET')
            .done((res) => {
                const items = res?.data || res?.dbas || [];
                renderSelectorDba(items);
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudieron cargar los DBAs.')));
    }

    function renderSelectorDba(items) {
        const $lista = $('#selectorDbaLista');
        $lista.empty();
        if (!items.length) {
            $lista.append('<p class="text-muted small mb-0">No se encontraron DBAs.</p>');
            return;
        }
        items.forEach((dba) => {
            const ya = dbasSeleccionados.some((d) => Number(d.id || d.catalogo_dba_id) === Number(dba.id));
            const $row = $(`
                <div class="selector-dba-item">
                    <div>
                        <div class="dba-codigo">${$('<div>').text(dba.codigo || '').html()}</div>
                        <div class="dba-desc">${$('<div>').text(dba.descripcion || '').html()}</div>
                    </div>
                    <button type="button" class="btn btn-sm btn-primary btn-sel-dba" data-id="${dba.id}" ${ya ? 'disabled' : ''}>
                        ${ya ? 'Agregado' : 'Agregar'}
                    </button>
                </div>
            `);
            $row.find('.btn-sel-dba').data('dba', dba);
            $lista.append($row);
        });
    }

    /* ── Modal temática ──────────────────────────────────────── */
    function resetFormTematica() {
        $('#tematica_id').val('');
        $('#tematica_nombre').val('');
        $('#tematica_eje_nombre').val('');
        llenarSelectAmbientesModal();
        mostrarSelectorEjeCreacion(true);
        ejeActual = null;
        ejeNombreActual = '';
        $('#tematica_requiere_ra').prop('checked', false);
        $('#tematica_requiere_acompanamiento').prop('checked', false);
        $('#tematica_referente_alternativo').val('');
        indicadores = [{ id: null, descripcion: '', orden: 1 }];
        dbasSeleccionados = [];
        tematicaActual = null;
        modoSoloLectura = false;
        setBotonesCrearExperiencia(false);
        $listaExp.html('<p class="text-muted small mb-0">Guarde la temática para gestionar experiencias.</p>');
        aplicarSoloLectura(false);
        renderIndicadores();
        renderDbas();
        activarTabTematica('tab-tematica-general');
    }

    function aplicarSoloLectura(readonly) {
        modoSoloLectura = readonly;
        $('#modalTematica').toggleClass('is-readonly', !!readonly);
        $('#tematica_nombre, #tematica_referente_alternativo').prop('readonly', readonly);
        $('#tematica_requiere_ra, #tematica_requiere_acompanamiento').prop('disabled', readonly);
        const creando = !$('#tematica_id').val();
        $selAmbiente.prop('disabled', readonly || !creando);
        $selModulo.prop('disabled', readonly || !creando || !$selAmbiente.val());
        $selEje.prop('disabled', readonly || !creando || !$selModulo.val());
        $('#btnGuardarTematica').prop('hidden', readonly);
        $('#btnAgregarIndicador, #btnAgregarDba').prop('hidden', readonly);
        if (readonly) {
            setBotonesCrearExperiencia(false);
        }
        $btnAgregarExp.prop('hidden', readonly);
    }

    function setModalTematicaMeta(titulo, subtitulo) {
        $('#modalTematicaLabel').text(titulo);
        $('#modalTematicaSubtitle').text(subtitulo || 'Defina nombre, indicadores y DBA asociados');
    }

    function abrirNuevaTematica() {
        resetFormTematica();
        setModalTematicaMeta('Nueva temática', 'Elija el eje y guarde como borrador');
        mostrarModalRaiz(modalTematica);
    }

    function cargarTematica(id, soloLecturaForzado) {
        const url = tpl(urls.mostrar, { __TEMATICA__: id });
        api(url, 'GET')
            .done((res) => {
                const t = res?.data;
                if (!t) return;
                tematicaActual = t;
                const readonly = soloLecturaForzado || !puedeEditarTematica(t);
                setModalTematicaMeta(
                    readonly ? 'Ver temática' : 'Editar temática',
                    readonly ? 'Solo lectura' : 'Actualice indicadores, DBA y experiencias'
                );
                $('#tematica_id').val(t.id);
                $('#tematica_nombre').val(t.nombre || '');
                ejeActual = t.eje_id ? Number(t.eje_id) : null;
                ejeNombreActual = t.eje || '';
                mostrarSelectorEjeCreacion(false);
                $('#tematica_eje_nombre').val(
                    [t.ambiente, t.modulo, t.eje].filter(Boolean).join(' · ') || ejeNombreActual
                );
                $('#tematica_requiere_ra').prop('checked', !!t.requiere_ra);
                $('#tematica_requiere_acompanamiento').prop('checked', !!t.requiere_acompanamiento);
                $('#tematica_referente_alternativo').val(t.referente_alternativo || '');
                indicadores = Array.isArray(t.indicadores) && t.indicadores.length
                    ? t.indicadores.map((i, idx) => ({
                        id: i.id || null,
                        descripcion: i.descripcion || '',
                        orden: i.orden || idx + 1,
                    }))
                    : [{ id: null, descripcion: '', orden: 1 }];
                dbasSeleccionados = Array.isArray(t.dbas)
                    ? t.dbas.map((d) => ({
                        id: d.id,
                        catalogo_dba_id: d.id,
                        codigo: d.codigo,
                        descripcion: d.descripcion,
                        relacion: d.relacion || 'principal',
                        observacion: d.observacion || null,
                    }))
                    : [];
                aplicarSoloLectura(readonly);
                renderIndicadores();
                renderDbas();
                setBotonesCrearExperiencia(puedeCrearExperiencia(t));
                cargarExperiencias(t.id, readonly);
                activarTabTematica('tab-tematica-general');
                mostrarModalRaiz(modalTematica);
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo cargar la temática.')));
    }

    function payloadTematica() {
        syncIndicadoresDesdeDom();
        syncDbasDesdeDom();
        return {
            nombre: String($('#tematica_nombre').val() || '').trim(),
            requiere_ra: $('#tematica_requiere_ra').is(':checked'),
            requiere_acompanamiento: $('#tematica_requiere_acompanamiento').is(':checked'),
            referente_alternativo: String($('#tematica_referente_alternativo').val() || '').trim() || null,
            indicadores: indicadores
                .map((i, idx) => ({
                    id: i.id || undefined,
                    descripcion: String(i.descripcion || '').trim(),
                    orden: idx + 1,
                }))
                .filter((i) => i.descripcion),
            dbas: dbasSeleccionados.map((d) => ({
                catalogo_dba_id: Number(d.catalogo_dba_id || d.id),
                relacion: d.relacion || 'principal',
                observacion: d.observacion || null,
            })),
        };
    }

    function validarPayload(p) {
        if (!p.nombre) return 'El nombre es obligatorio.';
        if (p.nombre.length > 150) return 'El nombre no puede superar 150 caracteres.';
        if (!p.indicadores.length) return 'Debe agregar al menos un indicador de logro.';
        if (p.indicadores.some((i) => i.descripcion.length > 300)) {
            return 'Cada indicador puede tener máximo 300 caracteres.';
        }
        return null;
    }

    function guardarTematica() {
        if (modoSoloLectura) return;
        const payload = payloadTematica();
        const err = validarPayload(payload);
        if (err) {
            toast('warning', err);
            if (String(err).toLowerCase().includes('indicador')) {
                activarTabTematica('tab-tematica-indicadores');
            }
            return;
        }
        const id = $('#tematica_id').val();
        const esNuevo = !id;
        if (esNuevo) {
            onModalEjeChange();
            if (!ejeActual) {
                toast('warning', 'Seleccione ambiente, módulo y eje.');
                return;
            }
        }
        const url = esNuevo
            ? tpl(urls.guardar, { __EJE__: ejeActual })
            : tpl(urls.actualizar, { __TEMATICA__: id });
        const method = esNuevo ? 'POST' : 'PUT';

        $('#btnGuardarTematica').prop('disabled', true);
        api(url, method, payload)
            .done((res) => {
                const t = res?.data;
                toast('success', res?.message || 'Temática guardada.');
                if (t?.id) {
                    tematicaActual = t;
                    $('#tematica_id').val(t.id);
                    if (esNuevo) {
                        mostrarSelectorEjeCreacion(false);
                        $('#tematica_eje_nombre').val(
                            [t.ambiente, t.modulo, t.eje].filter(Boolean).join(' · ') || ejeNombreActual
                        );
                    }
                    setBotonesCrearExperiencia(puedeCrearExperiencia(t));
                    if (Array.isArray(t.indicadores)) {
                        indicadores = t.indicadores.map((i, idx) => ({
                            id: i.id || null,
                            descripcion: i.descripcion || '',
                            orden: i.orden || idx + 1,
                        }));
                        renderIndicadores();
                    }
                    if (Array.isArray(t.dbas)) {
                        dbasSeleccionados = t.dbas.map((d) => ({
                            id: d.id,
                            catalogo_dba_id: d.id,
                            codigo: d.codigo,
                            descripcion: d.descripcion,
                            relacion: d.relacion || 'principal',
                            observacion: d.observacion || null,
                        }));
                        renderDbas();
                    }
                    cargarExperiencias(t.id, !puedeEditarTematica(t));
                }
                listarTematicas();
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo guardar la temática.')))
            .always(() => $('#btnGuardarTematica').prop('disabled', false));
    }

    /* ── Experiencias ────────────────────────────────────────── */
    function cargarExperiencias(tematicaId, readonly) {
        if (!tematicaId || !urls.experiencias) {
            $listaExp.html('<p class="text-muted small mb-0">Sin experiencias.</p>');
            return;
        }
        const url = tpl(urls.experiencias, { __TEMATICA__: tematicaId });
        api(url, 'GET')
            .done((res) => {
                const items = res?.data?.experiencias || [];
                renderExperiencias(items, readonly);
            })
            .fail(() => {
                $listaExp.html('<p class="text-muted small mb-0">No se pudieron cargar las experiencias.</p>');
            });
    }

    function renderExperiencias(items, readonlyTematica) {
        $listaExp.empty();
        if (!items.length) {
            $listaExp.append('<p class="text-muted small mb-0">Aún no hay experiencias en esta temática.</p>');
            return;
        }
        items.forEach((exp) => {
            const puedeEditar = puedeEditarExperiencia(exp);
            const acciones = [];
            if (puedeEditar) {
                if (exp.estado !== 'activa') {
                    acciones.push(
                        `<button type="button" class="btn-accion btn-publicar-exp btn-exp-flujo" data-id="${exp.id}" data-estado="activa"><i class="fa-solid fa-upload"></i> Publicar</button>`
                    );
                } else {
                    acciones.push(
                        `<button type="button" class="btn-accion btn-despublicar-exp btn-exp-flujo" data-id="${exp.id}" data-estado="borrador"><i class="fa-solid fa-rotate-left"></i> Despublicar</button>`
                    );
                }
                acciones.push(
                    `<div class="exp-toggle-activo">${htmlToggleActivo(exp.id, !!exp.activo, 'toggle-activo-exp', exp.nombre)}</div>`
                );
            }
            const objetivo = truncar(exp.objetivo, 140);
            const detalles = [];
            if (exp.habilidades) detalles.push(`<span class="exp-detalle"><i class="fa-solid fa-brain"></i> ${escapar(truncar(exp.habilidades, 80))}</span>`);
            if (exp.proposito) detalles.push(`<span class="exp-detalle"><i class="fa-solid fa-bullseye"></i> ${escapar(truncar(exp.proposito, 80))}</span>`);
            if (exp.referente_aprendizaje) {
                detalles.push(`<span class="exp-detalle"><i class="fa-solid fa-book-open"></i> ${escapar(truncar(exp.referente_aprendizaje, 80))}</span>`);
            }
            $listaExp.append(`
                <div class="exp-item exp-item--clickable" data-id="${exp.id}" data-editable="${puedeEditar ? '1' : '0'}" role="button" tabindex="0" title="${puedeEditar ? 'Editar experiencia' : 'Ver experiencia'}">
                    <div class="exp-item-body">
                        <div class="exp-nombre">${escapar(exp.nombre || '')}</div>
                        ${objetivo ? `<div class="exp-objetivo">${escapar(objetivo)}</div>` : ''}
                        <div class="exp-meta">
                            ${badgeEstadoExp(exp.estado)}
                            · ${escapar(exp.grado || 'Sin grado')}
                            · ${Number(exp.duracion_minutos || DURACION_EXP_DEFAULT)} min
                            · ${Number(exp.materiales_count || 0)} mat.
                            · ${exp.activo ? 'Activa' : 'Inactiva'}
                        </div>
                        ${detalles.length ? `<div class="exp-detalles">${detalles.join('')}</div>` : ''}
                    </div>
                    <div class="exp-acciones">${acciones.join('')}</div>
                </div>
            `);
        });
    }

    function puedeEditarExperiencia(exp) {
        if (!exp) return false;
        if (typeof exp.puede_editar === 'boolean') return exp.puede_editar;
        return puedeEditarTematica(tematicaActual);
    }

    function resetFormExperiencia() {
        experienciaActual = null;
        modoSoloLecturaExp = false;
        $('#exp_id').val('');
        $('#exp_tematica_id').val($('#tematica_id').val() || tematicaActual?.id || '');
        $('#exp_nombre').val('');
        $('#exp_grado_id').val('');
        $('#exp_objetivo').val('');
        $('#exp_habilidades').val('');
        $('#exp_proposito').val('');
        $('#exp_referente_aprendizaje').val('');
        $('#exp_duracion_minutos').val(String(DURACION_EXP_DEFAULT));
        $('#exp_publicar').prop('checked', false);
        $('#exp_publicar_label').text('Publicar ahora (estado activa)');
        $('#exp_materiales_ayuda').text('Opcional. Puede crear la experiencia sin materiales.');
        $('#modalExperienciaRapidaLabel').text('Nueva experiencia');
        $('#modalExperienciaRapidaSubtitle').text('Se crea como borrador salvo que publique ahora');
        materialesExp = [];
        aplicarSoloLecturaExperiencia(false);
        renderMaterialesExp();
        activarTabExperiencia('tab-datos-experiencia');
    }

    function aplicarSoloLecturaExperiencia(readonly) {
        modoSoloLecturaExp = !!readonly;
        $('#modalExperienciaRapida').toggleClass('is-readonly', modoSoloLecturaExp);
        $('#exp_nombre, #exp_objetivo, #exp_habilidades, #exp_proposito, #exp_referente_aprendizaje')
            .prop('readonly', modoSoloLecturaExp);
        $('#exp_grado_id, #exp_duracion_minutos, #exp_publicar').prop('disabled', modoSoloLecturaExp);
        $('#btnAgregarMaterialExp').prop('hidden', modoSoloLecturaExp);
        $('#btnGuardarExperienciaRapida').prop('hidden', modoSoloLecturaExp);
    }

    function llenarFormExperiencia(exp) {
        experienciaActual = exp;
        $('#exp_id').val(exp.id || '');
        $('#exp_tematica_id').val(exp.tematica_id || $('#tematica_id').val() || tematicaActual?.id || '');
        $('#exp_nombre').val(exp.nombre || '');
        $('#exp_grado_id').val(exp.grado_id ? String(exp.grado_id) : '');
        $('#exp_objetivo').val(exp.objetivo || '');
        $('#exp_habilidades').val(exp.habilidades || '');
        $('#exp_proposito').val(exp.proposito || '');
        $('#exp_referente_aprendizaje').val(exp.referente_aprendizaje || '');
        const duracion = Number(exp.duracion_minutos || DURACION_EXP_DEFAULT);
        if (DURACIONES_EXP.includes(duracion)) {
            $('#exp_duracion_minutos').val(String(duracion));
        } else {
            $('#exp_duracion_minutos').val(String(DURACION_EXP_DEFAULT));
        }
        $('#exp_publicar').prop('checked', String(exp.estado) === 'activa');
        $('#exp_publicar_label').text('Publicada (estado activa)');
        $('#exp_materiales_ayuda').text('Opcional. Puede guardar la experiencia sin materiales.');
        materialesExp = Array.isArray(exp.materiales)
            ? exp.materiales.map((m, idx) => ({
                id: m.id || null,
                nombre: m.nombre || '',
                cantidad: m.cantidad || '',
                es_obligatorio: m.es_obligatorio !== false,
                orden: m.orden || idx + 1,
            }))
            : [];
        renderMaterialesExp();
        activarTabExperiencia('tab-datos-experiencia');
    }

    function etiquetaMaterialObligatorio(esObligatorio) {
        return esObligatorio ? 'Obligatorio' : 'Opcional';
    }

    function renderMaterialesExp() {
        $listaMaterialesExp.empty();
        if (!materialesExp.length) {
            $listaMaterialesExp.append('<p class="text-muted small mb-0">Sin materiales agregados.</p>');
            return;
        }

        materialesExp.forEach((material, idx) => {
            const esObligatorio = material.es_obligatorio !== false;
            const puedeSubir = !modoSoloLecturaExp && idx > 0;
            const puedeBajar = !modoSoloLecturaExp && idx < materialesExp.length - 1;
            const accionesOrden = modoSoloLecturaExp
                ? ''
                : `<div class="material-item-orden">
                        <button type="button" class="btn-accion btn-material-mover btn-material-subir" data-dir="-1"
                            title="Subir" ${puedeSubir ? '' : 'disabled'}>
                            <i class="fa-solid fa-chevron-up"></i>
                        </button>
                        <button type="button" class="btn-accion btn-material-mover btn-material-bajar" data-dir="1"
                            title="Bajar" ${puedeBajar ? '' : 'disabled'}>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                    </div>`;
            const quitar = modoSoloLecturaExp
                ? ''
                : `<button type="button" class="btn-accion btn-eliminar btn-quitar-material" title="Quitar">
                        <i class="fa-solid fa-trash"></i>
                    </button>`;
            $listaMaterialesExp.append(`
                <div class="material-item" data-idx="${idx}">
                    ${accionesOrden}
                    <div class="material-item-campos">
                        <input type="text" class="form-control material-nombre" maxlength="150"
                            placeholder="Nombre del material" value="${escapar(material.nombre || '')}" ${modoSoloLecturaExp ? 'readonly' : ''}>
                        <input type="text" class="form-control material-cantidad" maxlength="60"
                            placeholder="Cantidad (ej. 2 unidades)" value="${escapar(material.cantidad || '')}" ${modoSoloLecturaExp ? 'readonly' : ''}>
                    </div>
                    <div class="material-item-toggle">
                        <div class="form-check form-switch">
                            <input class="form-check-input material-obligatorio" type="checkbox" role="switch"
                                id="material_obligatorio_${idx}" ${esObligatorio ? 'checked' : ''} ${modoSoloLecturaExp ? 'disabled' : ''}>
                            <label class="form-check-label material-obligatorio-label" for="material_obligatorio_${idx}">
                                ${etiquetaMaterialObligatorio(esObligatorio)}
                            </label>
                        </div>
                    </div>
                    ${quitar}
                </div>
            `);
        });
    }

    function syncMaterialesDesdeDom() {
        const nuevos = [];
        $listaMaterialesExp.find('.material-item').each(function () {
            const idx = Number($(this).data('idx'));
            const prev = materialesExp[idx] || {};
            nuevos.push({
                id: prev.id || null,
                nombre: String($(this).find('.material-nombre').val() || ''),
                cantidad: String($(this).find('.material-cantidad').val() || ''),
                es_obligatorio: $(this).find('.material-obligatorio').is(':checked'),
                orden: nuevos.length + 1,
            });
        });
        materialesExp = nuevos;
    }

    function agregarMaterialExp() {
        if (modoSoloLecturaExp) return;
        materialesExp.push({
            id: null,
            nombre: '',
            cantidad: '',
            es_obligatorio: true,
            orden: materialesExp.length + 1,
        });
        renderMaterialesExp();
        const $ultimo = $listaMaterialesExp.find('.material-item').last();
        $ultimo.find('.material-nombre').trigger('focus');
    }

    function moverMaterialExp(idx, direccion) {
        if (modoSoloLecturaExp) return;
        syncMaterialesDesdeDom();
        const destino = idx + direccion;
        if (destino < 0 || destino >= materialesExp.length) return;
        const copia = materialesExp.slice();
        const temp = copia[idx];
        copia[idx] = copia[destino];
        copia[destino] = temp;
        materialesExp = copia.map((item, orden) => ({ ...item, orden: orden + 1 }));
        renderMaterialesExp();
    }

    function materialesParaEnvio() {
        syncMaterialesDesdeDom();
        return materialesExp
            .filter((material) => material.nombre.trim() || material.cantidad.trim())
            .map((material, idx) => ({
                id: material.id || undefined,
                nombre: material.nombre.trim(),
                cantidad: material.cantidad.trim(),
                es_obligatorio: material.es_obligatorio !== false,
                orden: idx + 1,
            }));
    }

    function validarMaterialesExp() {
        syncMaterialesDesdeDom();
        for (const material of materialesExp) {
            const tieneNombre = !!material.nombre.trim();
            const tieneCantidad = !!material.cantidad.trim();
            if ((tieneNombre && !tieneCantidad) || (!tieneNombre && tieneCantidad)) {
                return 'Complete nombre y cantidad en cada material, o elimine la fila incompleta.';
            }
        }
        return null;
    }

    function abrirExperienciaRapida() {
        const id = $('#tematica_id').val() || tematicaActual?.id;
        if (!id) {
            toast('warning', 'Guarde la temática antes de crear una experiencia.');
            return;
        }
        if (modoSoloLectura || !puedeCrearExperiencia(tematicaActual || { id, activo: true, puede_crear_experiencia: true })) {
            toast('warning', 'No puede crear experiencias en esta temática (solo lectura o inactiva).');
            return;
        }
        activarTabTematica('tab-tematica-experiencias');
        resetFormExperiencia();
        $('#exp_tematica_id').val(id);
        mostrarModalApilado(modalExp, modalTematicaEl);
    }

    function abrirEditarExperiencia(id, soloLecturaForzado) {
        if (!id || !urls.experienciasMostrar) return;
        const url = tpl(urls.experienciasMostrar, { __EXPERIENCIA__: id });
        api(url, 'GET')
            .done((res) => {
                const exp = res?.data;
                if (!exp) return;
                const editable = !soloLecturaForzado && puedeEditarExperiencia(exp);
                llenarFormExperiencia(exp);
                aplicarSoloLecturaExperiencia(!editable);
                $('#modalExperienciaRapidaLabel').text(editable ? 'Editar experiencia' : 'Ver experiencia');
                $('#modalExperienciaRapidaSubtitle').text(
                    editable
                        ? 'Actualice datos y materiales. La temática no se puede cambiar.'
                        : 'Solo lectura'
                );
                mostrarModalApilado(modalExp, modalTematicaEl);
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo cargar la experiencia.')));
    }

    function payloadExperiencia() {
        const duracion = Number($('#exp_duracion_minutos').val() || DURACION_EXP_DEFAULT);
        const errorMateriales = validarMaterialesExp();
        if (errorMateriales) {
            return { error: errorMateriales, tab: 'tab-materiales-experiencia' };
        }
        const payload = {
            nombre: String($('#exp_nombre').val() || '').trim(),
            grado_id: Number($('#exp_grado_id').val() || 0),
            objetivo: String($('#exp_objetivo').val() || '').trim(),
            habilidades: textoOpcional($('#exp_habilidades').val()),
            proposito: textoOpcional($('#exp_proposito').val()),
            referente_aprendizaje: textoOpcional($('#exp_referente_aprendizaje').val()),
            duracion_minutos: duracion,
            estado: $('#exp_publicar').is(':checked') ? 'activa' : 'borrador',
            materiales: materialesParaEnvio(),
        };
        if (!payload.nombre || !payload.grado_id || !payload.objetivo) {
            return { error: 'Complete nombre, grado y objetivo.', tab: 'tab-datos-experiencia' };
        }
        if (!DURACIONES_EXP.includes(duracion)) {
            return { error: 'Seleccione una duración válida (15, 20, 30 o 45 min).', tab: 'tab-datos-experiencia' };
        }
        return { payload };
    }

    function guardarExperienciaRapida() {
        if (modoSoloLecturaExp) return;
        const tematicaId = $('#exp_tematica_id').val() || $('#tematica_id').val() || tematicaActual?.id;
        if (!tematicaId) return;
        const resultado = payloadExperiencia();
        if (resultado.error) {
            toast('warning', resultado.error);
            if (resultado.tab) activarTabExperiencia(resultado.tab);
            return;
        }
        const experienciaId = $('#exp_id').val();
        const esEdicion = !!experienciaId;
        const url = esEdicion
            ? tpl(urls.experienciasActualizar, { __EXPERIENCIA__: experienciaId })
            : tpl(urls.experienciasGuardar, { __TEMATICA__: tematicaId });
        if (!url) return;
        $('#btnGuardarExperienciaRapida').prop('disabled', true);
        api(url, esEdicion ? 'PUT' : 'POST', resultado.payload)
            .done((res) => {
                toast('success', res?.message || (esEdicion ? 'Experiencia actualizada.' : 'Experiencia creada.'));
                modalExp?.hide();
                cargarExperiencias(tematicaId, modoSoloLectura);
                listarTematicas();
            })
            .fail((xhr) => toast('error', errorAjax(xhr, esEdicion ? 'No se pudo actualizar la experiencia.' : 'No se pudo crear la experiencia.')))
            .always(() => $('#btnGuardarExperienciaRapida').prop('disabled', false));
    }

    function cambiarFlujoExperiencia(id, estado) {
        const url = tpl(urls.experienciasFlujo, { __EXPERIENCIA__: id });
        api(url, 'PATCH', { estado })
            .done((res) => {
                toast('success', res?.message || 'Estado actualizado.');
                const tid = $('#tematica_id').val() || tematicaActual?.id;
                if (tid) cargarExperiencias(tid, modoSoloLectura);
                listarTematicas();
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo cambiar el estado.')));
    }

    function toggleActivoExperiencia(id, checkbox) {
        const url = tpl(urls.experienciasEstado, { __EXPERIENCIA__: id });
        api(url, 'PATCH')
            .done((res) => {
                toast('success', res?.message || 'Experiencia actualizada.');
                const tid = $('#tematica_id').val() || tematicaActual?.id;
                if (tid) cargarExperiencias(tid, modoSoloLectura);
                listarTematicas();
            })
            .fail((xhr) => {
                if (checkbox) checkbox.prop('checked', !checkbox.prop('checked'));
                toast('error', errorAjax(xhr, 'No se pudo cambiar el activo.'));
            });
    }

    function onToggleActivoExperienciaChange() {
        const checkbox = $(this);
        const id = checkbox.data('id');
        const nombre = checkbox.data('nombre') || 'esta experiencia';

        if (checkbox.prop('checked')) {
            toggleActivoExperiencia(id, checkbox);
            return;
        }

        Swal.fire({
            icon: 'warning',
            title: `¿Desactivar ${nombre}?`,
            text: 'La experiencia dejará de estar disponible.',
            showCancelButton: true,
            confirmButtonText: 'Desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626',
        }).then((r) => {
            if (r.isConfirmed) {
                toggleActivoExperiencia(id, checkbox);
            } else {
                checkbox.prop('checked', true);
            }
        });
    }

    /* ── Acciones de fila ────────────────────────────────────── */
    function toggleActivoTematica(id, checkbox) {
        if (!urls.estado) {
            if (checkbox) checkbox.prop('checked', !checkbox.prop('checked'));
            return;
        }
        const url = tpl(urls.estado, { __TEMATICA__: id });
        api(url, 'PATCH')
            .done((res) => {
                toast('success', res?.message || 'Estado actualizado.');
                listarTematicas();
            })
            .fail((xhr) => {
                if (checkbox) checkbox.prop('checked', !checkbox.prop('checked'));
                toast('error', errorAjax(xhr, 'No se pudo cambiar el estado.'));
            });
    }

    function onToggleActivoTematicaChange() {
        const checkbox = $(this);
        const id = checkbox.data('id');
        const nombre = checkbox.data('nombre') || 'esta temática';

        if (checkbox.prop('checked')) {
            toggleActivoTematica(id, checkbox);
            return;
        }

        Swal.fire({
            icon: 'warning',
            title: `¿Desactivar ${nombre}?`,
            text: 'La temática dejará de estar disponible.',
            showCancelButton: true,
            confirmButtonText: 'Desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626',
        }).then((r) => {
            if (r.isConfirmed) {
                toggleActivoTematica(id, checkbox);
            } else {
                checkbox.prop('checked', true);
            }
        });
    }

    function eliminarTematica(id) {
        if (!urls.eliminar) return;
        Swal.fire({
            icon: 'warning',
            title: '¿Eliminar temática?',
            text: 'Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
        }).then((r) => {
            if (!r.isConfirmed) return;
            const url = tpl(urls.eliminar, { __TEMATICA__: id });
            api(url, 'DELETE')
                .done((res) => {
                    toast('success', res?.message || 'Temática eliminada.');
                    if (Number($('#tematica_id').val()) === Number(id)) {
                        modalTematica?.hide();
                    }
                    listarTematicas();
                })
                .fail((xhr) => {
                    const data = xhr.responseJSON || {};
                    if (xhr.status === 422 && data.puede_desactivar) {
                        Swal.fire({
                            icon: 'info',
                            title: 'No se puede eliminar',
                            text: data.message || 'La temática tiene experiencias. Puede desactivarla.',
                            showCancelButton: true,
                            confirmButtonText: 'Desactivar',
                            cancelButtonText: 'Cerrar',
                        }).then((r2) => {
                            if (r2.isConfirmed) toggleActivoTematica(id);
                        });
                        return;
                    }
                    toast('error', errorAjax(xhr, 'No se pudo eliminar.'));
                });
        });
    }

    /* ── Eventos ─────────────────────────────────────────────── */
    $filtroAmbiente.on('change', onFiltroAmbienteChange);
    $filtroModulo.on('change', onFiltroModuloChange);
    $filtroEje.on('change', () => aplicarFiltros(true));
    $filtroEstado.on('change', () => aplicarFiltros(true));
    $filtroGrado.on('change', () => aplicarFiltros(true));
    $filtroSinDba.on('change', () => aplicarFiltros(true));
    $btnLimpiarFiltros.on('click', limpiarFiltros);
    $pagerPrev.on('click', () => {
        if (paginaActual <= 1) return;
        paginaActual -= 1;
        listarTematicas();
    });
    $pagerNext.on('click', () => {
        paginaActual += 1;
        listarTematicas();
    });
    $selAmbiente.on('change', onModalAmbienteChange);
    $selModulo.on('change', onModalModuloChange);
    $selEje.on('change', onModalEjeChange);
    $btnNueva.on('click', abrirNuevaTematica);
    $('#btnGuardarTematica').on('click', guardarTematica);
    $('#btnCrearExperienciaDesdeTematica').on('click', abrirExperienciaRapida);
    $('#btnAgregarExperiencia').on('click', abrirExperienciaRapida);
    $('#btnAgregarMaterialExp').on('click', agregarMaterialExp);
    $('#btnGuardarExperienciaRapida').on('click', guardarExperienciaRapida);

    $listaMaterialesExp.on('click', '.btn-quitar-material', function () {
        if (modoSoloLecturaExp) return;
        syncMaterialesDesdeDom();
        const idx = Number($(this).closest('.material-item').data('idx'));
        materialesExp.splice(idx, 1);
        renderMaterialesExp();
    });
    $listaMaterialesExp.on('click', '.btn-material-mover', function () {
        const idx = Number($(this).closest('.material-item').data('idx'));
        const dir = Number($(this).data('dir'));
        moverMaterialExp(idx, dir);
    });
    $listaMaterialesExp.on('change', '.material-obligatorio', function () {
        const $item = $(this).closest('.material-item');
        const idx = Number($item.data('idx'));
        const esObligatorio = $(this).is(':checked');
        if (materialesExp[idx]) {
            materialesExp[idx].es_obligatorio = esObligatorio;
        }
        $item.find('.material-obligatorio-label').text(etiquetaMaterialObligatorio(esObligatorio));
    });
    $listaMaterialesExp.on('input', '.material-nombre, .material-cantidad', function () {
        const idx = Number($(this).closest('.material-item').data('idx'));
        if (!materialesExp[idx]) return;
        if ($(this).hasClass('material-nombre')) {
            materialesExp[idx].nombre = $(this).val();
        } else {
            materialesExp[idx].cantidad = $(this).val();
        }
    });
    $('#btnAgregarIndicador').on('click', () => {
        if (modoSoloLectura) return;
        agregarIndicador('');
    });
    $listaIndicadores.on('click', '.btn-quitar-indicador', function () {
        syncIndicadoresDesdeDom();
        const idx = Number($(this).closest('.indicador-item').data('idx'));
        if (indicadores.length <= 1) {
            toast('warning', 'Debe conservar al menos un indicador.');
            return;
        }
        indicadores.splice(idx, 1);
        renderIndicadores();
    });
    $listaIndicadores.on('input', '.indicador-desc', function () {
        const idx = Number($(this).closest('.indicador-item').data('idx'));
        if (indicadores[idx]) indicadores[idx].descripcion = $(this).val();
    });

    $('#btnAgregarDba').on('click', () => {
        if (modoSoloLectura) return;
        $('#filtroDbaQ').val('');
        buscarDbas();
        mostrarModalApilado(modalDba, modalTematicaEl);
    });
    $('#filtroDbaGrado, #filtroDbaArea').on('change', buscarDbas);
    let dbaTimer = null;
    $('#filtroDbaQ').on('input', () => {
        clearTimeout(dbaTimer);
        dbaTimer = setTimeout(buscarDbas, 300);
    });
    $('#selectorDbaLista').on('click', '.btn-sel-dba', function () {
        const dba = $(this).data('dba');
        if (!dba) return;
        if (dbasSeleccionados.some((d) => Number(d.id || d.catalogo_dba_id) === Number(dba.id))) return;
        dbasSeleccionados.push({
            id: dba.id,
            catalogo_dba_id: dba.id,
            codigo: dba.codigo,
            descripcion: dba.descripcion,
            relacion: 'principal',
            observacion: null,
        });
        renderDbas();
        $(this).prop('disabled', true).text('Agregado');
    });
    $listaDbas.on('click', '.btn-quitar-dba', function () {
        syncDbasDesdeDom();
        const idx = Number($(this).closest('.dba-item').data('idx'));
        dbasSeleccionados.splice(idx, 1);
        renderDbas();
    });
    $listaDbas.on('change', '.dba-relacion', function () {
        const idx = Number($(this).closest('.dba-item').data('idx'));
        if (dbasSeleccionados[idx]) dbasSeleccionados[idx].relacion = $(this).val();
    });

    function abrirTematicaDesdeCard($card) {
        const id = $card.data('id');
        if (!id) return;
        const editable = String($card.data('editable')) === '1';
        cargarTematica(id, !editable);
    }

    $cardsWrap.on('click', '.tematica-card--clickable', function (e) {
        if ($(e.target).closest('[data-accion], .tematica-card-toggle, .toggle-activo-tematica').length) return;
        abrirTematicaDesdeCard($(this));
    });

    $cardsWrap.on('keydown', '.tematica-card--clickable', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        abrirTematicaDesdeCard($(this));
    });

    $cardsWrap.on('click', '[data-accion]', function (e) {
        e.stopPropagation();
        const accion = $(this).data('accion');
        const id = $(this).data('id');
        if (accion === 'eliminar') eliminarTematica(id);
    });
    $cardsWrap.on('change', '.toggle-activo-tematica', onToggleActivoTematicaChange);

    $listaExp.on('click', '.btn-exp-flujo', function (e) {
        e.stopPropagation();
        cambiarFlujoExperiencia($(this).data('id'), $(this).data('estado'));
    });
    $listaExp.on('change', '.toggle-activo-exp', onToggleActivoExperienciaChange);
    $listaExp.on('click', '.exp-item--clickable', function (e) {
        if ($(e.target).closest('.exp-acciones, [data-accion], .exp-toggle-activo, .toggle-activo-exp').length) return;
        const id = $(this).data('id');
        const editable = String($(this).data('editable')) === '1';
        abrirEditarExperiencia(id, !editable);
    });
    $listaExp.on('keydown', '.exp-item--clickable', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        const id = $(this).data('id');
        const editable = String($(this).data('editable')) === '1';
        abrirEditarExperiencia(id, !editable);
    });

    llenarFiltroAmbientes();
    $btnNueva.prop('disabled', false);
    listarTematicas();
})(jQuery);
