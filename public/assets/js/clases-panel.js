/**
 * clases-panel.js — Crear clase con wizard curricular
 * Requiere: jQuery, Bootstrap 5, SweetAlert2, window.TEMATICAS_ARBOL
 */
(function ($) {
    'use strict';

    const $app = $('.clases-app').first();
    if (!$app.length) return;

    const arbol = Array.isArray(window.TEMATICAS_ARBOL) ? window.TEMATICAS_ARBOL : [];
    const ambienteFijo = arbol[0] || null;
    const gradoId = Number($app.data('grado-id') || 0);
    const cargaActualId = Number($app.data('carga-id') || 0);
    const gruposReplica = Array.isArray(window.CLASES_GRUPOS_REPLICA)
        ? window.CLASES_GRUPOS_REPLICA
        : [];
    const experienciasUsadasPorCarga = window.CLASES_EXPERIENCIAS_USADAS || {};

    const urls = {
        tematicasEje: $app.data('url-tematicas-eje-template') || '',
        experiencias: $app.data('url-experiencias-template') || '',
        guardar: $app.data('url-guardar') || '',
        estadoTpl: $app.data('url-estado-template') || '',
    };

    const csrf = $('meta[name="csrf-token"]').attr('content');

    const WIZARD_PASOS = ['modulo', 'eje', 'tematica', 'experiencia', 'datos'];
    const WIZARD_LABELS = {
        modulo: 'Módulo',
        eje: 'Eje',
        tematica: 'Temática',
        experiencia: 'Experiencia',
        datos: 'Datos',
    };
    const WIZARD_INSTRUCCIONES = {
        modulo: 'Seleccione un módulo',
        eje: 'Seleccione un eje',
        tematica: 'Seleccione una temática',
        experiencia: 'Seleccione una experiencia',
        datos: 'Confirme los datos de la clase',
    };

    const wizard = {
        paso: 0,
        ambiente: ambienteFijo,
        modulo: null,
        eje: null,
        tematica: null,
        tematicas: null,
        experiencia: null,
        experiencias: null,
    };

    const $wizardCards = $('#claseWizardCards');
    const $wizardLoading = $('#claseWizardLoading');
    const $wizardEmpty = $('#claseWizardEmpty');
    const $wizardPasoLabel = $('#claseWizardPasoLabel');
    const $wizardBreadcrumb = $('#claseWizardBreadcrumb');
    const $wizardInstruction = $('#claseWizardInstruction');
    const $wizardSeleccion = $('#claseWizardSeleccion');
    const $wizardDatos = $('#claseWizardDatos');
    const $wizardResumen = $('#claseWizardResumen');
    const $btnVolver = $('#btnClaseWizardVolver');
    const $btnGuardar = $('#btnClaseWizardGuardar');
    const $btnNueva = $('#btnNuevaClase');
    const $inputNombre = $('#clase_nombre');
    const $inputFecha = $('#clase_fecha');
    const $inputDescripcion = $('#clase_descripcion');
    const $replicaGrupos = $('#claseReplicaGrupos');
    const $replicaHint = $('#claseReplicaHint');
    const $btnReplicaTodos = $('#btnClaseReplicaTodos');
    const $btnReplicaNinguno = $('#btnClaseReplicaNinguno');

    const modalEl = document.getElementById('modalCrearClase');
    const modal = modalEl ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;

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

    function hoyIso() {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${m}-${day}`;
    }

    function pasoActual() {
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

    function experienciasUsadasEnCarga(cargaId) {
        const ids = experienciasUsadasPorCarga[cargaId]
            ?? experienciasUsadasPorCarga[String(cargaId)]
            ?? [];

        return ids.map(Number);
    }

    function experienciaYaUsadaEnCarga(expId, cargaId) {
        return experienciasUsadasEnCarga(cargaId).includes(Number(expId));
    }

    function htmlCardExperiencia(exp) {
        const yaUsadaActual = experienciaYaUsadaEnCarga(exp.id, cargaActualId);
        const partes = [];
        if (exp.grado) partes.push(exp.grado);
        if (exp.duracion_minutos) partes.push(`${exp.duracion_minutos} min`);
        const meta = partes.length
            ? `<p class="exp-wizard-card-meta mb-0">${escapar(partes.join(' · '))}</p>`
            : '';

        const cardClases = ['exp-wizard-item-card', 'exp-wizard-card'];
        if (yaUsadaActual) {
            cardClases.push('exp-wizard-card--usada');
        }

        const badges = yaUsadaActual
            ? '<div class="exp-wizard-card-badges"><span class="clase-exp-badge-usada">Ya agregada</span></div>'
            : '';

        const attrs = yaUsadaActual
            ? ' aria-disabled="true" tabindex="-1"'
            : ' role="button" tabindex="0"';

        return `
            <div class="col-md-4 col-sm-6">
                <article class="${cardClases.join(' ')}" data-id="${exp.id}" data-usada="${yaUsadaActual ? '1' : '0'}"
                    ${attrs} aria-label="${escapar(exp.nombre || 'Sin nombre')}">
                    <div class="exp-wizard-item-top">
                        <div class="exp-wizard-item-icon" aria-hidden="true">
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <div class="exp-wizard-item-info">
                            <h6 class="exp-wizard-card-title mb-1">${escapar(exp.nombre || 'Sin nombre')}</h6>
                            ${badges}
                            ${meta}
                        </div>
                        <span class="exp-wizard-card-arrow" aria-hidden="true">
                            <i class="fa-solid ${yaUsadaActual ? 'fa-check' : 'fa-chevron-right'}"></i>
                        </span>
                    </div>
                </article>
            </div>
        `;
    }

    function htmlCardItem(item, tipo) {
        if (tipo === 'experiencia') {
            return htmlCardExperiencia(item);
        }

        const iconos = {
            modulo: 'fa-cube',
            eje: 'fa-diagram-project',
            tematica: 'fa-layer-group',
        };
        const icono = iconos[tipo] || 'fa-circle';
        const badge = typeof item.es_oficial === 'boolean' ? badgeOrigen(item.es_oficial) : '';
        let meta = '';

        if (tipo === 'modulo' && Array.isArray(item.ejes)) {
            meta = `<p class="exp-wizard-card-meta mb-0">${escapar(pluralizar(item.ejes.length, 'eje', 'ejes'))}</p>`;
        }

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

    function actualizarChrome() {
        const paso = pasoActual();
        const total = WIZARD_PASOS.length;
        $wizardPasoLabel.text(`Paso ${wizard.paso + 1} de ${total} · ${WIZARD_LABELS[paso]}`);
        $wizardInstruction.text(WIZARD_INSTRUCCIONES[paso]);
        $btnVolver.prop('hidden', wizard.paso <= 0);
        $btnGuardar.prop('hidden', paso !== 'datos');

        const enDatos = paso === 'datos';
        $wizardSeleccion.prop('hidden', enDatos);
        $wizardDatos.prop('hidden', !enDatos);

        const crumbs = [];
        if (wizard.ambiente) {
            crumbs.push({ paso: null, nombre: wizard.ambiente.nombre });
        }
        if (wizard.modulo) crumbs.push({ paso: 0, nombre: wizard.modulo.nombre });
        if (wizard.eje) crumbs.push({ paso: 1, nombre: wizard.eje.nombre });
        if (wizard.tematica) crumbs.push({ paso: 2, nombre: wizard.tematica.nombre });
        if (wizard.experiencia) crumbs.push({ paso: 3, nombre: wizard.experiencia.nombre });

        if (!crumbs.length) {
            $wizardBreadcrumb.prop('hidden', true).empty();
            return;
        }

        const html = crumbs.map((crumb, idx) => {
            const sep = idx > 0 ? '<span class="exp-wizard-crumb-sep" aria-hidden="true">›</span>' : '';
            const puedeIr = crumb.paso !== null
                && crumb.paso < wizard.paso
                && paso !== 'datos';
            const attrs = puedeIr
                ? ` class="exp-wizard-crumb" data-paso="${crumb.paso}"`
                : ' class="exp-wizard-crumb" disabled';
            return `${sep}<button type="button"${attrs}>${escapar(crumb.nombre)}</button>`;
        }).join('');

        $wizardBreadcrumb.html(html).prop('hidden', false);
    }

    function mostrarEstado(estado) {
        $wizardCards.prop('hidden', estado !== 'cards').empty();
        $wizardLoading.prop('hidden', estado !== 'loading');
        $wizardEmpty.prop('hidden', estado !== 'empty');
    }

    function renderCards(html) {
        mostrarEstado('cards');
        $wizardCards.html(html);
    }

    function renderModulos() {
        const modulos = wizard.ambiente?.modulos || [];
        if (!modulos.length) {
            mostrarEstado('empty');
            return;
        }
        renderCards(modulos.map((m) => htmlCardItem(m, 'modulo')).join(''));
    }

    function renderEjes() {
        const ejes = wizard.modulo?.ejes || [];
        if (!ejes.length) {
            mostrarEstado('empty');
            return;
        }
        renderCards(ejes.map((e) => htmlCardItem(e, 'eje')).join(''));
    }

    function renderTematicas() {
        if (Array.isArray(wizard.tematicas)) {
            if (!wizard.tematicas.length) {
                mostrarEstado('empty');
                return;
            }
            renderCards(wizard.tematicas.map((t) => htmlCardItem(t, 'tematica')).join(''));
            return;
        }

        const ejeId = wizard.eje?.id;
        if (!ejeId || !urls.tematicasEje) {
            mostrarEstado('empty');
            return;
        }

        mostrarEstado('loading');
        api(tpl(urls.tematicasEje, { __EJE__: ejeId }), 'GET')
            .done((res) => {
                wizard.tematicas = res?.data?.tematicas || [];
                if (!wizard.tematicas.length) {
                    mostrarEstado('empty');
                    return;
                }
                renderCards(wizard.tematicas.map((t) => htmlCardItem(t, 'tematica')).join(''));
            })
            .fail(() => {
                wizard.tematicas = [];
                mostrarEstado('empty');
                $wizardEmpty.text('No se pudieron cargar las temáticas.');
            });
    }

    function filtrarExperiencias(lista) {
        if (!gradoId) return lista;
        const delGrado = lista.filter((exp) => Number(exp.grado_id) === gradoId);
        return delGrado.length ? delGrado : lista;
    }

    function renderExperiencias() {
        const pintar = (lista) => {
            if (!lista.length) {
                mostrarEstado('empty');
                $wizardEmpty.text('No hay experiencias disponibles para esta temática.');
                return;
            }

            renderCards(lista.map((e) => htmlCardExperiencia(e)).join(''));
        };

        if (Array.isArray(wizard.experiencias)) {
            pintar(wizard.experiencias);
            return;
        }

        const tematicaId = wizard.tematica?.id;
        if (!tematicaId || !urls.experiencias) {
            mostrarEstado('empty');
            return;
        }

        mostrarEstado('loading');
        api(tpl(urls.experiencias, { __TEMATICA__: tematicaId }), 'GET')
            .done((res) => {
                const todas = res?.data?.experiencias || [];
                wizard.experiencias = filtrarExperiencias(todas).filter((e) => e.activo !== false);
                pintar(wizard.experiencias);
            })
            .fail(() => {
                wizard.experiencias = [];
                mostrarEstado('empty');
                $wizardEmpty.text('No se pudieron cargar las experiencias.');
            });
    }

    function prepararPasoDatos() {
        $inputNombre.val(wizard.experiencia?.nombre || '');
        $inputFecha.val(hoyIso());
        $inputDescripcion.val('');
        $wizardResumen.html(`
            <strong>Ruta curricular</strong><br>
            ${escapar(wizard.ambiente?.nombre || '—')}
            › ${escapar(wizard.modulo?.nombre || '—')}
            › ${escapar(wizard.eje?.nombre || '—')}
            › ${escapar(wizard.tematica?.nombre || '—')}
            › ${escapar(wizard.experiencia?.nombre || '—')}
        `);
        renderGruposReplica();
    }

    function renderGruposReplica() {
        if (!gruposReplica.length) {
            $replicaHint.text('No hay otros grupos disponibles para replicar en este grado.');
            $replicaGrupos.html(`
                <div class="col-12">
                    <div class="cfg-empty mb-0">
                        Solo se creará en el grupo actual.
                    </div>
                </div>
            `);

            $btnReplicaTodos.prop('hidden', true);
            $btnReplicaNinguno.prop('hidden', true);

            return;
        }

        $btnReplicaTodos.prop('hidden', gruposReplica.length < 2);
        $btnReplicaNinguno.prop('hidden', gruposReplica.length < 2);

        $replicaHint.text(
            gruposReplica.length === 1
                ? 'La clase se creará en este grupo.'
                : 'Marca los grupos del grado donde quieres replicar esta clase.'
        );

        const expId = wizard.experiencia?.id;
        const html = gruposReplica.map((grupo) => {
            const id = Number(grupo.carga_docente_id);
            const yaTieneExp = expId && experienciaYaUsadaEnCarga(expId, id);
            const checked = !yaTieneExp && (grupo.es_actual || gruposReplica.length === 1);
            const disabled = yaTieneExp ? 'disabled' : '';
            const bloqueadaBadge = yaTieneExp
                ? '<span class="clase-replica-badge clase-replica-badge--bloqueada">Experiencia ya agregada</span>'
                : '';

            const actualBadge = grupo.es_actual && !yaTieneExp
                ? '<span class="clase-replica-badge">Actual</span>'
                : '';

            const labelClases = ['clase-replica-grupo'];
            if (grupo.es_actual) labelClases.push('es-actual');
            if (yaTieneExp) labelClases.push('es-bloqueada');

            return `
                <div class="col-md-4 col-sm-6">
                    <label class="${labelClases.join(' ')}" for="clase_replica_${id}">
                        <input type="checkbox" class="form-check-input clase-replica-check"
                            id="clase_replica_${id}"
                            value="${id}"
                            data-es-actual="${grupo.es_actual ? '1' : '0'}"
                            ${checked ? 'checked' : ''}
                            ${disabled}>
                        <span class="clase-replica-grupo-nombre">
                            Grupo ${escapar(grupo.nombre)}
                            ${actualBadge}
                            ${bloqueadaBadge}
                        </span>
                    </label>
                </div>
            `;
        }).join('');

        $replicaGrupos.html(html);
    }

    function cargasSeleccionadas() {
        return $replicaGrupos
            .find('.clase-replica-check:checked')
            .map(function () {
                return Number($(this).val());
            })
            .get()
            .filter((id) => id > 0);
    }

    function marcarReplicaTodos(soloActual) {
        $replicaGrupos.find('.clase-replica-check:not(:disabled)').each(function () {
            const esActual = $(this).data('es-actual') === 1 || $(this).data('es-actual') === '1';
            $(this).prop('checked', soloActual ? esActual : true);
        });
    }

    function renderPaso() {
        actualizarChrome();
        const paso = pasoActual();
        if (paso === 'modulo') renderModulos();
        else if (paso === 'eje') renderEjes();
        else if (paso === 'tematica') renderTematicas();
        else if (paso === 'experiencia') renderExperiencias();
        else if (paso === 'datos') prepararPasoDatos();
    }

    function limpiarDesde(indice) {
        if (indice <= 0) {
            wizard.modulo = null;
            wizard.eje = null;
            wizard.tematica = null;
            wizard.tematicas = null;
            wizard.experiencia = null;
            wizard.experiencias = null;
        } else if (indice <= 1) {
            wizard.eje = null;
            wizard.tematica = null;
            wizard.tematicas = null;
            wizard.experiencia = null;
            wizard.experiencias = null;
        } else if (indice <= 2) {
            wizard.tematica = null;
            wizard.tematicas = null;
            wizard.experiencia = null;
            wizard.experiencias = null;
        } else if (indice <= 3) {
            wizard.experiencia = null;
            wizard.experiencias = null;
        }
    }

    function irPaso(indice) {
        if (indice < 0 || indice >= WIZARD_PASOS.length) return;
        limpiarDesde(indice);
        wizard.paso = indice;
        $wizardEmpty.text('No hay opciones disponibles en este nivel.');
        renderPaso();
    }

    function onCardSelect(id) {
        const paso = pasoActual();
        const numId = Number(id);

        if (paso === 'modulo') {
            wizard.modulo = (wizard.ambiente?.modulos || []).find((item) => Number(item.id) === numId) || null;
            if (!wizard.modulo) return;
            irPaso(1);
            return;
        }

        if (paso === 'eje') {
            wizard.eje = (wizard.modulo?.ejes || []).find((item) => Number(item.id) === numId) || null;
            if (!wizard.eje) return;
            irPaso(2);
            return;
        }

        if (paso === 'tematica') {
            wizard.tematica = (wizard.tematicas || []).find((item) => Number(item.id) === numId) || null;
            if (!wizard.tematica) return;
            irPaso(3);
            return;
        }

        if (paso === 'experiencia') {
            if (experienciaYaUsadaEnCarga(numId, cargaActualId)) {
                toast('info', 'Esta experiencia ya está agregada en este grupo.');
                return;
            }
            wizard.experiencia = (wizard.experiencias || []).find((item) => Number(item.id) === numId) || null;
            if (!wizard.experiencia) return;
            irPaso(4);
        }
    }

    function abrirModal() {
        if (!ambienteFijo) {
            toast('warning', 'No hay currículo disponible para este ambiente.');
            return;
        }
        wizard.ambiente = ambienteFijo;
        irPaso(0);
        modal?.show();
    }

    function guardarClase() {
        const nombre = String($inputNombre.val() || '').trim();
        if (!nombre) {
            toast('warning', 'Escribe un nombre para la clase.');
            $inputNombre.trigger('focus');
            return;
        }

        if (!wizard.modulo || !wizard.eje || !wizard.tematica || !wizard.experiencia) {
            toast('error', 'Completa la selección curricular.');
            return;
        }

        let cargaIds = cargasSeleccionadas();
        if (!cargaIds.length && cargaActualId) {
            cargaIds = [cargaActualId];
        }

        if (!cargaIds.length) {
            toast('warning', 'Selecciona al menos un grupo.');
            return;
        }

        const payload = {
            modulo_id: wizard.modulo.id,
            eje_id: wizard.eje.id,
            tematica_id: wizard.tematica.id,
            experiencia_id: wizard.experiencia.id,
            nombre,
            descripcion: String($inputDescripcion.val() || '').trim() || null,
            fecha: String($inputFecha.val() || '').trim() || null,
            estado: 'borrador',
            carga_docente_ids: cargaIds,
        };

        $btnGuardar.prop('disabled', true);
        api(urls.guardar, 'POST', payload)
            .done((res) => {
                toast('success', res?.message || 'Clase creada correctamente.');
                modal?.hide();
                window.location.reload();
            })
            .fail((xhr) => {
                toast('error', errorAjax(xhr, 'No se pudo crear la clase.'));
            })
            .always(() => {
                $btnGuardar.prop('disabled', false);
            });
    }

    $btnNueva.on('click', abrirModal);
    $btnVolver.on('click', () => {
        if (wizard.paso <= 0) return;
        irPaso(wizard.paso - 1);
    });
    $btnGuardar.on('click', guardarClase);
    $btnReplicaTodos.on('click', () => marcarReplicaTodos(false));
    $btnReplicaNinguno.on('click', () => marcarReplicaTodos(true));

    $app.on('click', '.btn-clase-estado', function () {
        const $btn = $(this);
        const estado = String($btn.data('estado') || '');
        const claseId = Number($btn.closest('tr').data('clase-id') || 0);
        if (!estado || !claseId || !urls.estadoTpl) return;

        const url = String(urls.estadoTpl).replace('__ID__', String(claseId));
        $btn.prop('disabled', true);

        api(url, 'PATCH', { estado })
            .done((res) => {
                toast('success', res?.message || 'Estado actualizado.');
                window.location.reload();
            })
            .fail((xhr) => {
                toast('error', errorAjax(xhr, 'No se pudo actualizar el estado.'));
                $btn.prop('disabled', false);
            });
    });

    $wizardCards.on('click', '.exp-wizard-card', function () {
        if ($(this).data('usada') === 1 || $(this).data('usada') === '1') {
            return;
        }
        onCardSelect($(this).data('id'));
    });

    $wizardCards.on('keydown', '.exp-wizard-card', function (e) {
        if ($(this).data('usada') === 1 || $(this).data('usada') === '1') {
            return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCardSelect($(this).data('id'));
        }
    });

    $wizardBreadcrumb.on('click', '.exp-wizard-crumb:not([disabled])', function () {
        const paso = Number($(this).data('paso'));
        if (Number.isNaN(paso)) return;
        irPaso(paso);
    });
})(jQuery);
