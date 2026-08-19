/**
 * experiencias-catalogo.js — Listado de experiencias por temática
 * Requiere: jQuery, Bootstrap 5, SweetAlert2, window.TEMATICAS_ARBOL
 */
(function ($) {
    'use strict';

    const $app = $('.experiencias-app').first();
    if (!$app.length) return;

    const rol = $app.data('rol') || 'admin';
    const arbol = Array.isArray(window.TEMATICAS_ARBOL) ? window.TEMATICAS_ARBOL : [];

    const urls = {
        listar: $app.data('url-listar-template') || '',
        tematicasEje: $app.data('url-tematicas-eje-template') || '',
        guardar: $app.data('url-guardar-template') || '',
        mostrar: $app.data('url-mostrar-template') || '',
        actualizar: $app.data('url-actualizar-template') || '',
        flujo: $app.data('url-flujo-template') || '',
        estado: $app.data('url-estado-template') || '',
        eliminar: $app.data('url-eliminar-template') || '',
    };

    const csrf = $('meta[name="csrf-token"]').attr('content');
    const DURACIONES_EXP = [15, 20, 30, 45];
    const DURACION_EXP_DEFAULT = 20;

    let tematicaActual = null;
    let experienciaActual = null;
    let modoSoloLecturaExp = false;
    let materialesExp = [];

    const $contexto = $('#expContextoTematica');
    const $contextoNombre = $('#expContextoNombre');
    const $contextoRuta = $('#expContextoRuta');
    const $btnCambiarTematica = $('#btnCambiarTematicaExp');
    const $btnNueva = $('#btnNuevaExperiencia');
    const $cardsWrap = $('#experienciasCardsContainer');
    const $empty = $('#experienciasEmpty');
    const $btnSeleccionarTematica = $('#btnSeleccionarTematicaExp');
    const $wizardCards = $('#expWizardCards');
    const $wizardLoading = $('#expWizardLoading');
    const $wizardEmpty = $('#expWizardEmpty');
    const $wizardPasoLabel = $('#expWizardPasoLabel');
    const $wizardBreadcrumb = $('#expWizardBreadcrumb');
    const $wizardInstruction = $('#expWizardInstruction');
    const $btnWizardVolver = $('#btnExpWizardVolver');
    const $btnWizardCancelar = $('#btnExpWizardCancelar');
    const $listaMaterialesExp = $('#listaMaterialesExp');

    const WIZARD_PASOS = ['ambiente', 'modulo', 'eje', 'tematica'];
    const WIZARD_LABELS = {
        ambiente: 'Ambiente',
        modulo: 'Módulo',
        eje: 'Eje',
        tematica: 'Temática',
    };
    const WIZARD_INSTRUCCIONES = {
        ambiente: 'Seleccione un ambiente',
        modulo: 'Seleccione un módulo',
        eje: 'Seleccione un eje',
        tematica: 'Seleccione una temática',
    };

    const wizard = {
        paso: 0,
        ambiente: null,
        modulo: null,
        eje: null,
        tematicas: null,
    };

    const modalSeleccionEl = document.getElementById('modalSeleccionTematicaExp');
    const modalExpEl = document.getElementById('modalExperienciaRapida');
    const modalSeleccion = modalSeleccionEl ? bootstrap.Modal.getOrCreateInstance(modalSeleccionEl) : null;
    const modalExp = modalExpEl ? bootstrap.Modal.getOrCreateInstance(modalExpEl) : null;

    function tpl(template, mapa) {
        let out = String(template || '');
        Object.keys(mapa).forEach((k) => {
            out = out.split(k).join(mapa[k]);
        });
        return out;
    }

    function escapar(texto) {
        return $('<div>').text(String(texto || '')).html();
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
            return Object.values(data.errors).flat().join('\n') || fallback;
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

    function truncar(texto, max) {
        const limpio = String(texto || '').trim();
        if (!limpio) return '';
        if (limpio.length <= max) return limpio;
        return `${limpio.slice(0, max - 1)}…`;
    }

    function activarTabExperiencia(tabId) {
        const trigger = document.getElementById(tabId);
        if (!trigger || typeof bootstrap === 'undefined') return;
        bootstrap.Tab.getOrCreateInstance(trigger).show();
    }

    function badgeEstadoExp(estado) {
        const e = String(estado || 'borrador');
        if (e === 'activa') return '<span class="badge-estado-exp es-activa">Activa</span>';
        if (e === 'archivada') return '<span class="badge-estado-exp es-archivada">Archivada</span>';
        return '<span class="badge-estado-exp es-borrador">Borrador</span>';
    }

    function etiquetaEstado(activo) {
        return activo
            ? '<span class="badge-estado-exp badge-estado-activo">Activo</span>'
            : '<span class="badge-estado-exp badge-estado-inactivo">Inactivo</span>';
    }

    function etiquetaOrigen(esOficial) {
        return esOficial
            ? '<span class="star">⭐ Oficial</span>'
            : '<span class="badge-colegio">Del colegio</span>';
    }

    function puedeEditarExperiencia(exp) {
        if (!exp) return false;
        if (typeof exp.puede_editar === 'boolean') return exp.puede_editar;
        return !!tematicaActual?.puede_editar;
    }

    function puedeCrearExperiencia() {
        if (!tematicaActual?.id) return false;
        if (typeof tematicaActual.puede_crear_experiencia === 'boolean') {
            return tematicaActual.puede_crear_experiencia;
        }
        return !!tematicaActual.puede_editar && !!tematicaActual.activo;
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

    function actualizarUrlTematica(id) {
        const url = new URL(window.location.href);
        if (id) {
            url.searchParams.set('tematica', String(id));
        } else {
            url.searchParams.delete('tematica');
        }
        window.history.replaceState(null, '', url.toString());
    }

    function rutaTematica(t) {
        return [t.ambiente, t.modulo, t.eje].filter(Boolean).join(' · ');
    }

    function actualizarContexto(t) {
        if (!t?.id) {
            $contexto.prop('hidden', true);
            $btnNueva.prop('hidden', true).prop('disabled', true);
            return;
        }
        $contexto.prop('hidden', false);
        $contextoNombre.text(t.nombre || 'Sin nombre');
        $contextoRuta.text(rutaTematica(t) || '—');
        const puedeCrear = puedeCrearExperiencia();
        $btnNueva.prop('hidden', !puedeCrear).prop('disabled', !puedeCrear);
    }

    function mostrarEmpty(mensaje) {
        $cardsWrap.prop('hidden', true).empty();
        $empty.find('.experiencias-empty-text').text(mensaje);
        $empty.find('#btnSeleccionarTematicaExp').prop('hidden', false);
        $empty.prop('hidden', false);
    }

    function mostrarSinTematica() {
        tematicaActual = null;
        actualizarContexto(null);
        actualizarUrlTematica(null);
        $cardsWrap.prop('hidden', true).empty();
        mostrarEmpty('Ninguna temática seleccionada.');
    }

    function metaFila(icono, etiqueta, valor) {
        if (!valor) return '';
        return `<div class="tematica-meta-row"><i class="fa-solid ${icono}"></i><span><strong>${escapar(etiqueta)}:</strong> ${escapar(valor)}</span></div>`;
    }

    function htmlCardExperiencia(exp) {
        const editable = puedeEditarExperiencia(exp);
        const partesFooter = [];

        if (editable) {
            partesFooter.push(`
                <div class="tematica-card-toggle">
                    ${htmlToggleActivo(exp.id, !!exp.activo, 'toggle-activo-exp-card', exp.nombre)}
                </div>
            `);

            const itemsDropdown = [];
            if (exp.estado !== 'activa') {
                itemsDropdown.push(`
                    <li>
                        <button type="button" class="btn-accion btn-publicar-exp" data-accion="publicar" data-id="${exp.id}">
                            <i class="fa-solid fa-upload"></i>
                            Publicar
                        </button>
                    </li>
                `);
            } else {
                itemsDropdown.push(`
                    <li>
                        <button type="button" class="btn-accion btn-despublicar-exp" data-accion="despublicar" data-id="${exp.id}">
                            <i class="fa-solid fa-rotate-left"></i>
                            Despublicar
                        </button>
                    </li>
                `);
            }

            if (urls.eliminar) {
                itemsDropdown.push(`
                    <li>
                        <button type="button" class="btn-accion btn-eliminar" data-accion="eliminar" data-id="${exp.id}">
                            <i class="fa-solid fa-trash"></i>
                            Eliminar
                        </button>
                    </li>
                `);
            }

            if (itemsDropdown.length) {
                partesFooter.push(`
                    <div class="dropdown catalogo-card-opciones tabla-opciones-dropdown">
                        <button type="button" class="catalogo-card-opciones-btn" data-bs-toggle="dropdown"
                            aria-expanded="false" aria-label="Acciones" title="Acciones"
                            onclick="event.stopPropagation()">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end dropdown-menu-acciones">
                            ${itemsDropdown.join('')}
                        </ul>
                    </div>
                `);
            }
        }

        const cardClases = ['tematica-card', 'experiencia-card', 'tematica-card--clickable'];
        cardClases.push(tematicaActual?.es_oficial ? 'tematica-card--oficial' : 'tematica-card--colegio');
        if (!editable) cardClases.push('tematica-card--solo-lectura');

        const accionesHtml = partesFooter.length
            ? `<div class="tematica-card-actions">${partesFooter.join('')}</div>`
            : '';

        const objetivo = truncar(exp.objetivo, 120);

        return `
            <article class="${cardClases.join(' ')}" data-id="${exp.id}" data-editable="${editable ? '1' : '0'}"
                role="button" tabindex="0" title="${editable ? 'Editar experiencia' : 'Ver experiencia'}">
                <div class="tematica-card-top">
                    <div class="tematica-card-icon experiencia-card-icon" aria-hidden="true">
                        <i class="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div class="tematica-card-identity">
                        <h5>${escapar(exp.nombre || 'Sin nombre')}</h5>
                        <div class="tematica-card-badges">
                            ${badgeEstadoExp(exp.estado)}
                            ${etiquetaEstado(!!exp.activo)}
                        </div>
                    </div>
                    <span class="tematica-card-arrow" aria-hidden="true"><i class="fa-solid fa-chevron-right"></i></span>
                </div>
                <div class="tematica-card-body">
                    ${metaFila('fa-graduation-cap', 'Grado', exp.grado || '')}
                    ${metaFila('fa-clock', 'Duración', `${Number(exp.duracion_minutos || DURACION_EXP_DEFAULT)} min`)}
                    ${metaFila('fa-toolbox', 'Materiales', `${Number(exp.materiales_count || 0)}`)}
                    ${objetivo ? `<div class="tematica-meta-row tematica-meta-row--exp"><i class="fa-solid fa-bullseye"></i><span>${escapar(objetivo)}</span></div>` : ''}
                </div>
                ${accionesHtml}
            </article>
        `;
    }

    function renderCards(experiencias) {
        if (!experiencias.length) {
            mostrarEmpty('No hay experiencias en esta temática.');
            return;
        }
        $empty.prop('hidden', true);
        $empty.find('#btnSeleccionarTematicaExp').prop('hidden', false);
        $cardsWrap.prop('hidden', false).empty();
        const $grid = $('<div class="tematicas-grid"></div>');
        experiencias.forEach((exp) => $grid.append(htmlCardExperiencia(exp)));
        $cardsWrap.append($grid);
    }

    function cargarExperiencias(tematicaId) {
        const url = tpl(urls.listar, { __TEMATICA__: tematicaId });
        if (!url) return;
        $empty.find('.experiencias-empty-text').text('Cargando experiencias…');
        $empty.find('#btnSeleccionarTematicaExp').prop('hidden', true);
        $empty.prop('hidden', false);
        $cardsWrap.prop('hidden', true);
        api(url, 'GET')
            .done((res) => {
                tematicaActual = res?.data?.tematica || null;
                actualizarContexto(tematicaActual);
                actualizarUrlTematica(tematicaActual?.id || null);
                renderCards(res?.data?.experiencias || []);
            })
            .fail((xhr) => {
                tematicaActual = null;
                actualizarContexto(null);
                mostrarEmpty(errorAjax(xhr, 'No se pudieron cargar las experiencias.'));
            });
    }

    function seleccionarTematica(id) {
        if (!id) return;
        cargarExperiencias(id);
    }

    /* ── Modal selección temática (wizard) ────────────────────── */
    function resetWizard() {
        wizard.paso = 0;
        wizard.ambiente = null;
        wizard.modulo = null;
        wizard.eje = null;
        wizard.tematicas = null;
    }

    function pasoWizardActual() {
        return WIZARD_PASOS[wizard.paso] || WIZARD_PASOS[0];
    }

    function pluralizar(cantidad, singular, plural) {
        const n = Number(cantidad || 0);
        return `${n} ${n === 1 ? singular : plural}`;
    }

    function badgeOrigen(esOficial) {
        return esOficial
            ? '<span class="star">⭐ Oficial</span>'
            : '<span class="badge-colegio">Del colegio</span>';
    }

    function htmlCardAmbiente(ambiente) {
        const color = ambiente.color_hex || '#64748B';
        const icono = ambiente.icono || '📦';
        const modulos = pluralizar(ambiente.modulos_count, 'módulo', 'módulos');
        const ejes = pluralizar(ambiente.ejes_count, 'eje', 'ejes');

        return `
            <div class="col-md-4 col-sm-6">
                <article class="exp-wizard-ambiente-card exp-wizard-card" data-id="${ambiente.id}"
                    role="button" tabindex="0" aria-label="Ambiente ${escapar(ambiente.nombre)}">
                    <div class="exp-wizard-ambiente-franja" style="background:${escapar(color)}"></div>
                    <div class="exp-wizard-ambiente-body">
                        <div class="exp-wizard-ambiente-icono" style="background:${escapar(color)}22">${icono}</div>
                        <div class="exp-wizard-ambiente-info">
                            <h6 class="exp-wizard-card-title mb-0">Ambiente ${escapar(ambiente.nombre)}</h6>
                        </div>
                    </div>
                    <div class="exp-wizard-ambiente-stats">
                        <span class="exp-wizard-stat exp-wizard-stat-azul">
                            <i class="fa-solid fa-cube"></i> ${escapar(modulos)}
                        </span>
                        <span class="exp-wizard-stat exp-wizard-stat-verde">
                            <i class="fa-solid fa-diagram-project"></i> ${escapar(ejes)}
                        </span>
                    </div>
                </article>
            </div>
        `;
    }

    function htmlCardItem(item, tipo) {
        const iconos = {
            modulo: 'fa-cube',
            eje: 'fa-diagram-project',
            tematica: 'fa-layer-group',
        };
        const icono = iconos[tipo] || 'fa-circle';
        const badge = typeof item.es_oficial === 'boolean' ? badgeOrigen(item.es_oficial) : '';
        const meta = tipo === 'modulo' && Array.isArray(item.ejes)
            ? `<p class="exp-wizard-card-meta mb-0">${escapar(pluralizar(item.ejes.length, 'eje', 'ejes'))}</p>`
            : '';

        return `
            <div class="col-md-4 col-sm-6">
                <article class="exp-wizard-item-card exp-wizard-card" data-id="${item.id}"
                    role="button" tabindex="0" aria-label="${escapar(item.nombre || 'Sin nombre')}">
                    <div class="exp-wizard-item-top">
                        <div class="exp-wizard-item-icon" aria-hidden="true">
                            <i class="fa-solid ${icono}"></i>
                        </div>
                        <div class="exp-wizard-item-info">
                            <h6 class="exp-wizard-card-title mb-1">${escapar(item.nombre || 'Sin nombre')}</h6>
                            ${badge ? `<div class="exp-wizard-card-badges">${badge}</div>` : ''}
                            ${meta}
                        </div>
                        <span class="exp-wizard-card-arrow" aria-hidden="true">
                            <i class="fa-solid fa-chevron-right"></i>
                        </span>
                    </div>
                </article>
            </div>
        `;
    }

    function actualizarWizardChrome() {
        const paso = pasoWizardActual();
        const total = WIZARD_PASOS.length;
        $wizardPasoLabel.text(`Paso ${wizard.paso + 1} de ${total} · ${WIZARD_LABELS[paso]}`);
        $wizardInstruction.text(WIZARD_INSTRUCCIONES[paso]);
        $btnWizardVolver.prop('hidden', wizard.paso <= 0);

        const crumbs = [];
        if (wizard.ambiente) {
            crumbs.push({ paso: 0, nombre: wizard.ambiente.nombre });
        }
        if (wizard.modulo) {
            crumbs.push({ paso: 1, nombre: wizard.modulo.nombre });
        }
        if (wizard.eje) {
            crumbs.push({ paso: 2, nombre: wizard.eje.nombre });
        }

        if (!crumbs.length) {
            $wizardBreadcrumb.prop('hidden', true).empty();
            return;
        }

        const html = crumbs.map((crumb, idx) => {
            const sep = idx > 0 ? '<span class="exp-wizard-crumb-sep" aria-hidden="true">›</span>' : '';
            return `${sep}<button type="button" class="exp-wizard-crumb" data-paso="${crumb.paso}">${escapar(crumb.nombre)}</button>`;
        }).join('');

        $wizardBreadcrumb.html(html).prop('hidden', false);
    }

    function mostrarWizardEstado(estado) {
        $wizardCards.prop('hidden', estado !== 'cards').empty();
        $wizardLoading.prop('hidden', estado !== 'loading');
        $wizardEmpty.prop('hidden', estado !== 'empty');
    }

    function renderWizardCards(html) {
        mostrarWizardEstado('cards');
        $wizardCards.html(html);
    }

    function renderWizardAmbientes() {
        if (!arbol.length) {
            mostrarWizardEstado('empty');
            return;
        }
        renderWizardCards(arbol.map((ambiente) => htmlCardAmbiente(ambiente)).join(''));
    }

    function renderWizardModulos() {
        const modulos = wizard.ambiente?.modulos || [];
        if (!modulos.length) {
            mostrarWizardEstado('empty');
            return;
        }
        renderWizardCards(modulos.map((modulo) => htmlCardItem(modulo, 'modulo')).join(''));
    }

    function renderWizardEjes() {
        const ejes = wizard.modulo?.ejes || [];
        if (!ejes.length) {
            mostrarWizardEstado('empty');
            return;
        }
        renderWizardCards(ejes.map((eje) => htmlCardItem(eje, 'eje')).join(''));
    }

    function renderWizardTematicas() {
        if (Array.isArray(wizard.tematicas)) {
            if (!wizard.tematicas.length) {
                mostrarWizardEstado('empty');
                return;
            }
            renderWizardCards(wizard.tematicas.map((tematica) => htmlCardItem(tematica, 'tematica')).join(''));
            return;
        }

        const ejeId = wizard.eje?.id;
        if (!ejeId || !urls.tematicasEje) {
            mostrarWizardEstado('empty');
            return;
        }

        mostrarWizardEstado('loading');
        const url = tpl(urls.tematicasEje, { __EJE__: ejeId });
        api(url, 'GET')
            .done((res) => {
                wizard.tematicas = res?.data?.tematicas || [];
                if (!wizard.tematicas.length) {
                    mostrarWizardEstado('empty');
                    return;
                }
                renderWizardCards(wizard.tematicas.map((tematica) => htmlCardItem(tematica, 'tematica')).join(''));
            })
            .fail(() => {
                wizard.tematicas = [];
                mostrarWizardEstado('empty');
                $wizardEmpty.text('No se pudieron cargar las temáticas.');
            });
    }

    function renderWizardPaso() {
        actualizarWizardChrome();
        const paso = pasoWizardActual();
        if (paso === 'ambiente') renderWizardAmbientes();
        else if (paso === 'modulo') renderWizardModulos();
        else if (paso === 'eje') renderWizardEjes();
        else renderWizardTematicas();
    }

    function irWizardPaso(indice) {
        if (indice < 0 || indice >= WIZARD_PASOS.length) return;
        if (indice <= 0) {
            wizard.ambiente = null;
            wizard.modulo = null;
            wizard.eje = null;
            wizard.tematicas = null;
        } else if (indice <= 1) {
            wizard.modulo = null;
            wizard.eje = null;
            wizard.tematicas = null;
        } else if (indice <= 2) {
            wizard.eje = null;
            wizard.tematicas = null;
        } else {
            wizard.tematicas = null;
        }
        wizard.paso = indice;
        renderWizardPaso();
    }

    function wizardVolver() {
        if (wizard.paso <= 0) return;
        irWizardPaso(wizard.paso - 1);
    }

    function onWizardCardSelect(id) {
        const paso = pasoWizardActual();
        const numId = Number(id);

        if (paso === 'ambiente') {
            wizard.ambiente = arbol.find((item) => Number(item.id) === numId) || null;
            if (!wizard.ambiente) return;
            wizard.paso = 1;
            renderWizardPaso();
            return;
        }

        if (paso === 'modulo') {
            wizard.modulo = (wizard.ambiente?.modulos || []).find((item) => Number(item.id) === numId) || null;
            if (!wizard.modulo) return;
            wizard.paso = 2;
            renderWizardPaso();
            return;
        }

        if (paso === 'eje') {
            wizard.eje = (wizard.modulo?.ejes || []).find((item) => Number(item.id) === numId) || null;
            if (!wizard.eje) return;
            wizard.paso = 3;
            renderWizardPaso();
            return;
        }

        if (paso === 'tematica' && numId) {
            modalSeleccion?.hide();
            seleccionarTematica(numId);
        }
    }

    function abrirModalSeleccion() {
        resetWizard();
        $wizardEmpty.text('No hay opciones disponibles en este nivel.');
        renderWizardPaso();
        modalSeleccion?.show();
    }

    function cancelarWizard() {
        modalSeleccion?.hide();
        if (!tematicaActual?.id) {
            mostrarSinTematica();
        }
    }

    /* ── Modal experiencia (CRUD) ────────────────────────────── */
    function resetFormExperiencia() {
        experienciaActual = null;
        modoSoloLecturaExp = false;
        $('#exp_id').val('');
        $('#exp_tematica_id').val(tematicaActual?.id || '');
        $('#exp_nombre').val('');
        $('#exp_grado_id').val('');
        $('#exp_objetivo').val('');
        $('#exp_habilidades').val('');
        $('#exp_proposito').val('');
        $('#exp_referente_aprendizaje').val('');
        $('#exp_duracion_minutos').val(String(DURACION_EXP_DEFAULT));
        $('#exp_publicar').prop('checked', false);
        $('#exp_publicar_label').text('Publicar ahora (estado activa)');
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
                : `<button type="button" class="btn-accion btn-eliminar btn-quitar-material" title="Quitar"><i class="fa-solid fa-trash"></i></button>`;
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

    function llenarFormExperiencia(exp) {
        experienciaActual = exp;
        $('#exp_id').val(exp.id || '');
        $('#exp_tematica_id').val(exp.tematica_id || tematicaActual?.id || '');
        $('#exp_nombre').val(exp.nombre || '');
        $('#exp_grado_id').val(exp.grado_id ? String(exp.grado_id) : '');
        $('#exp_objetivo').val(exp.objetivo || '');
        $('#exp_habilidades').val(exp.habilidades || '');
        $('#exp_proposito').val(exp.proposito || '');
        $('#exp_referente_aprendizaje').val(exp.referente_aprendizaje || '');
        const duracion = Number(exp.duracion_minutos || DURACION_EXP_DEFAULT);
        $('#exp_duracion_minutos').val(String(DURACIONES_EXP.includes(duracion) ? duracion : DURACION_EXP_DEFAULT));
        $('#exp_publicar').prop('checked', String(exp.estado) === 'activa');
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
    }

    function abrirEditarExperiencia(id, soloLecturaForzado) {
        const url = tpl(urls.mostrar, { __EXPERIENCIA__: id });
        if (!url) return;
        api(url, 'GET')
            .done((res) => {
                const exp = res?.data;
                if (!exp) return;
                const editable = !soloLecturaForzado && puedeEditarExperiencia(exp);
                llenarFormExperiencia(exp);
                aplicarSoloLecturaExperiencia(!editable);
                $('#modalExperienciaRapidaLabel').text(editable ? 'Editar experiencia' : 'Ver experiencia');
                $('#modalExperienciaRapidaSubtitle').text(editable ? 'Actualice datos y materiales' : 'Solo lectura');
                modalExp?.show();
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo cargar la experiencia.')));
    }

    function payloadExperiencia() {
        syncMaterialesDesdeDom();
        const duracion = Number($('#exp_duracion_minutos').val() || DURACION_EXP_DEFAULT);
        const payload = {
            nombre: String($('#exp_nombre').val() || '').trim(),
            grado_id: Number($('#exp_grado_id').val() || 0),
            objetivo: String($('#exp_objetivo').val() || '').trim(),
            habilidades: String($('#exp_habilidades').val() || '').trim() || null,
            proposito: String($('#exp_proposito').val() || '').trim() || null,
            referente_aprendizaje: String($('#exp_referente_aprendizaje').val() || '').trim() || null,
            duracion_minutos: duracion,
            estado: $('#exp_publicar').is(':checked') ? 'activa' : 'borrador',
            materiales: materialesExp
                .filter((m) => m.nombre.trim() || m.cantidad.trim())
                .map((m, idx) => ({
                    id: m.id || undefined,
                    nombre: m.nombre.trim(),
                    cantidad: m.cantidad.trim(),
                    es_obligatorio: m.es_obligatorio !== false,
                    orden: idx + 1,
                })),
        };
        if (!payload.nombre || !payload.grado_id || !payload.objetivo) {
            return { error: 'Complete nombre, grado y objetivo.' };
        }
        return { payload };
    }

    function guardarExperiencia() {
        if (modoSoloLecturaExp) return;
        const tematicaId = tematicaActual?.id;
        if (!tematicaId) return;
        const resultado = payloadExperiencia();
        if (resultado.error) {
            toast('warning', resultado.error);
            return;
        }
        const experienciaId = $('#exp_id').val();
        const esEdicion = !!experienciaId;
        const url = esEdicion
            ? tpl(urls.actualizar, { __EXPERIENCIA__: experienciaId })
            : tpl(urls.guardar, { __TEMATICA__: tematicaId });
        $('#btnGuardarExperienciaRapida').prop('disabled', true);
        api(url, esEdicion ? 'PUT' : 'POST', resultado.payload)
            .done((res) => {
                toast('success', res?.message || (esEdicion ? 'Experiencia actualizada.' : 'Experiencia creada.'));
                modalExp?.hide();
                cargarExperiencias(tematicaId);
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo guardar la experiencia.')))
            .always(() => $('#btnGuardarExperienciaRapida').prop('disabled', false));
    }

    function cambiarFlujoExperiencia(id, estado) {
        const url = tpl(urls.flujo, { __EXPERIENCIA__: id });
        api(url, 'PATCH', { estado })
            .done((res) => {
                toast('success', res?.message || 'Estado actualizado.');
                if (tematicaActual?.id) cargarExperiencias(tematicaActual.id);
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo cambiar el estado.')));
    }

    function toggleActivoExperiencia(id, checkbox) {
        const url = tpl(urls.estado, { __EXPERIENCIA__: id });
        api(url, 'PATCH')
            .done((res) => {
                toast('success', res?.message || 'Experiencia actualizada.');
                if (tematicaActual?.id) cargarExperiencias(tematicaActual.id);
            })
            .fail((xhr) => {
                if (checkbox) checkbox.prop('checked', !checkbox.prop('checked'));
                toast('error', errorAjax(xhr, 'No se pudo cambiar el activo.'));
            });
    }

    function eliminarExperiencia(id) {
        if (!urls.eliminar) return;
        Swal.fire({
            icon: 'warning',
            title: '¿Eliminar experiencia?',
            text: 'Esta acción no se puede deshacer.',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626',
        }).then((r) => {
            if (!r.isConfirmed) return;
            const url = tpl(urls.eliminar, { __EXPERIENCIA__: id });
            api(url, 'DELETE')
                .done((res) => {
                    toast('success', res?.message || 'Experiencia eliminada.');
                    if (tematicaActual?.id) cargarExperiencias(tematicaActual.id);
                })
                .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo eliminar.')));
        });
    }

    function onToggleActivoChange() {
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
            showCancelButton: true,
            confirmButtonText: 'Desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#DC2626',
        }).then((r) => {
            if (r.isConfirmed) toggleActivoExperiencia(id, checkbox);
            else checkbox.prop('checked', true);
        });
    }

    /* ── Eventos ─────────────────────────────────────────────── */
    $wizardCards.on('click', '.exp-wizard-card', function () {
        onWizardCardSelect($(this).data('id'));
    });
    $wizardCards.on('keydown', '.exp-wizard-card', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onWizardCardSelect($(this).data('id'));
    });
    $wizardBreadcrumb.on('click', '.exp-wizard-crumb', function () {
        irWizardPaso(Number($(this).data('paso')));
    });
    $btnWizardVolver.on('click', wizardVolver);
    $btnWizardCancelar.on('click', cancelarWizard);
    $btnSeleccionarTematica.on('click', abrirModalSeleccion);
    $btnCambiarTematica.on('click', abrirModalSeleccion);
    $btnNueva.on('click', () => {
        if (!puedeCrearExperiencia()) return;
        resetFormExperiencia();
        $('#modalExperienciaRapidaLabel').text('Nueva experiencia');
        $('#modalExperienciaRapidaSubtitle').text('Se crea como borrador salvo que publique ahora');
        modalExp?.show();
    });
    $('#btnGuardarExperienciaRapida').on('click', guardarExperiencia);
    $('#btnAgregarMaterialExp').on('click', () => {
        if (modoSoloLecturaExp) return;
        materialesExp.push({ id: null, nombre: '', cantidad: '', es_obligatorio: true, orden: materialesExp.length + 1 });
        renderMaterialesExp();
    });
    $listaMaterialesExp.on('click', '.btn-quitar-material', function () {
        syncMaterialesDesdeDom();
        materialesExp.splice(Number($(this).closest('.material-item').data('idx')), 1);
        renderMaterialesExp();
    });
    $listaMaterialesExp.on('click', '.btn-material-mover', function () {
        const idx = Number($(this).closest('.material-item').data('idx'));
        const dir = Number($(this).data('dir'));
        moverMaterialExp(idx, dir);
    });
    $listaMaterialesExp.on('change', '.material-obligatorio', function () {
        const idx = Number($(this).closest('.material-item').data('idx'));
        if (materialesExp[idx]) {
            materialesExp[idx].es_obligatorio = $(this).is(':checked');
            $(this).siblings('.material-obligatorio-label').text(etiquetaMaterialObligatorio($(this).is(':checked')));
        }
    });

    $cardsWrap.on('click', '.tematica-card--clickable', function (e) {
        if ($(e.target).closest('[data-accion], .tematica-card-toggle, .toggle-activo-exp-card, .catalogo-card-opciones').length) return;
        const id = $(this).data('id');
        const editable = String($(this).data('editable')) === '1';
        abrirEditarExperiencia(id, !editable);
    });
    $cardsWrap.on('keydown', '.tematica-card--clickable', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        const id = $(this).data('id');
        const editable = String($(this).data('editable')) === '1';
        abrirEditarExperiencia(id, !editable);
    });
    $cardsWrap.on('click', '[data-accion]', function (e) {
        e.stopPropagation();
        const accion = $(this).data('accion');
        const id = $(this).data('id');
        if (accion === 'eliminar') eliminarExperiencia(id);
        if (accion === 'publicar') cambiarFlujoExperiencia(id, 'activa');
        if (accion === 'despublicar') cambiarFlujoExperiencia(id, 'borrador');
    });
    $cardsWrap.on('change', '.toggle-activo-exp-card', onToggleActivoChange);

    /* ── Inicio ──────────────────────────────────────────────── */
    const params = new URLSearchParams(window.location.search);
    const tematicaParam = Number(params.get('tematica') || 0);
    if (tematicaParam) {
        seleccionarTematica(tematicaParam);
    } else {
        mostrarSinTematica();
        abrirModalSeleccion();
    }
})(jQuery);
