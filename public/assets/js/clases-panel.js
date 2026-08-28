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
    const clasesContexto = window.CLASES_CONTEXTO || {};

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
        experienciasSeleccionadas: [],
        modoAgregar: false,
        claseId: null,
        claseNombre: '',
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
    const $modalTitle = $('#modalCrearClaseLabel');
    const $modalSubtitle = $('#claseWizardSubtitle');
    const $expBar = $('#claseWizardExpBar');
    const $expBarText = $('#claseWizardExpBarText');
    const $btnContinuar = $('#btnClaseWizardContinuar');

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

    function contextoClase(claseId) {
        if (!claseId) return null;

        return clasesContexto[claseId] ?? clasesContexto[String(claseId)] ?? null;
    }

    function experienciasUsadasEnClase(claseId) {
        const ctx = contextoClase(claseId);

        return (ctx?.experiencia_ids ?? []).map(Number);
    }

    function experienciaYaUsadaEnClase(expId, claseId) {
        if (!claseId) return false;

        return experienciasUsadasEnClase(claseId).includes(Number(expId));
    }

    function experienciaEstaSeleccionada(expId) {
        return wizard.experienciasSeleccionadas.some((item) => Number(item.id) === Number(expId));
    }

    function htmlCardExperiencia(exp) {
        const claseObjetivo = wizard.modoAgregar ? wizard.claseId : null;
        const yaUsada = experienciaYaUsadaEnClase(exp.id, claseObjetivo);
        const seleccionada = !wizard.modoAgregar && experienciaEstaSeleccionada(exp.id);
        const partes = [];
        if (exp.grado) partes.push(exp.grado);
        if (exp.duracion_minutos) partes.push(`${exp.duracion_minutos} min`);
        const meta = partes.length
            ? `<p class="exp-wizard-card-meta mb-0">${escapar(partes.join(' · '))}</p>`
            : '';

        const cardClases = ['exp-wizard-item-card', 'exp-wizard-card'];
        if (yaUsada) {
            cardClases.push('exp-wizard-card--usada');
        } else if (seleccionada) {
            cardClases.push('exp-wizard-card--seleccionada');
        }

        const badges = yaUsada
            ? '<div class="exp-wizard-card-badges"><span class="clase-exp-badge-usada">Ya agregada</span></div>'
            : (seleccionada
                ? '<div class="exp-wizard-card-badges"><span class="clase-exp-badge-usada" style="background:#DBEAFE;color:#1D4ED8">Seleccionada</span></div>'
                : '');

        const attrs = yaUsada
            ? ' aria-disabled="true" tabindex="-1"'
            : ' role="button" tabindex="0"';

        const iconoFlecha = yaUsada
            ? 'fa-check'
            : (seleccionada ? 'fa-check' : 'fa-chevron-right');

        return `
            <div class="col-md-4 col-sm-6">
                <article class="${cardClases.join(' ')}" data-id="${exp.id}" data-usada="${yaUsada ? '1' : '0'}"
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
                            <i class="fa-solid ${iconoFlecha}"></i>
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
        const totalPasos = wizard.modoAgregar ? WIZARD_PASOS.length - 1 : WIZARD_PASOS.length;
        const pasoNum = wizard.modoAgregar && paso === 'datos'
            ? totalPasos
            : Math.min(wizard.paso + 1, totalPasos);

        $wizardPasoLabel.text(`Paso ${pasoNum} de ${totalPasos} · ${WIZARD_LABELS[paso]}`);
        $wizardInstruction.text(
            wizard.modoAgregar && paso === 'experiencia'
                ? `Elige una experiencia de «${wizard.tematica?.nombre || 'la temática'}»`
                : (paso === 'experiencia' && !wizard.modoAgregar
                    ? 'Marca una o más experiencias de la temática y pulsa Continuar'
                    : WIZARD_INSTRUCCIONES[paso])
        );
        $btnVolver.prop('hidden', wizard.modoAgregar || wizard.paso <= 0);
        $btnGuardar.prop('hidden', wizard.modoAgregar || paso !== 'datos');
        $expBar.prop('hidden', wizard.modoAgregar || paso !== 'experiencia');
        $btnGuardar.html(
            wizard.modoAgregar
                ? '<i class="fa-solid fa-check"></i> Agregar experiencia'
                : '<i class="fa-solid fa-check"></i> Crear clase'
        );

        const enDatos = paso === 'datos' && !wizard.modoAgregar;
        $wizardSeleccion.prop('hidden', enDatos);
        $wizardDatos.prop('hidden', !enDatos);

        const crumbs = [];
        if (wizard.ambiente) {
            crumbs.push({ paso: null, nombre: wizard.ambiente.nombre });
        }
        if (wizard.modulo) crumbs.push({ paso: wizard.modoAgregar ? null : 0, nombre: wizard.modulo.nombre });
        if (wizard.eje) crumbs.push({ paso: wizard.modoAgregar ? null : 1, nombre: wizard.eje.nombre });
        if (wizard.tematica) crumbs.push({ paso: wizard.modoAgregar ? null : 2, nombre: wizard.tematica.nombre });
        if (!wizard.modoAgregar && wizard.experienciasSeleccionadas.length) {
            crumbs.push({
                paso: null,
                nombre: pluralizar(wizard.experienciasSeleccionadas.length, 'experiencia', 'experiencias'),
            });
        }

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
            actualizarBarraExperiencias();
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

    function actualizarBarraExperiencias() {
        const total = wizard.experienciasSeleccionadas.length;

        if (wizard.modoAgregar || pasoActual() !== 'experiencia') {
            $expBar.prop('hidden', true);
            return;
        }

        $expBar.prop('hidden', false);
        $expBarText.text(
            total === 0
                ? 'Selecciona al menos una experiencia para continuar.'
                : `${pluralizar(total, 'experiencia seleccionada', 'experiencias seleccionadas')}.`
        );
        $btnContinuar.prop('disabled', total === 0);
    }

    function prepararPasoDatos() {
        const primera = wizard.experienciasSeleccionadas[0];
        $inputNombre.val(wizard.tematica?.nombre || primera?.nombre || '');
        $inputFecha.val(hoyIso());
        $inputDescripcion.val('');

        const listaExp = wizard.experienciasSeleccionadas
            .map((exp) => `• ${escapar(exp.nombre || 'Sin nombre')}`)
            .join('<br>');

        $wizardResumen.html(`
            <strong>Ruta curricular</strong><br>
            ${escapar(wizard.ambiente?.nombre || '—')}
            › ${escapar(wizard.modulo?.nombre || '—')}
            › ${escapar(wizard.eje?.nombre || '—')}
            › ${escapar(wizard.tematica?.nombre || '—')}
            <br><br>
            <strong>${pluralizar(wizard.experienciasSeleccionadas.length, 'Experiencia', 'Experiencias')}</strong><br>
            ${listaExp}
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

        const html = gruposReplica.map((grupo) => {
            const id = Number(grupo.carga_docente_id);
            const checked = grupo.es_actual || gruposReplica.length === 1;

            const actualBadge = grupo.es_actual
                ? '<span class="clase-replica-badge">Actual</span>'
                : '';

            const labelClases = ['clase-replica-grupo'];
            if (grupo.es_actual) labelClases.push('es-actual');

            return `
                <div class="col-md-4 col-sm-6">
                    <label class="${labelClases.join(' ')}" for="clase_replica_${id}">
                        <input type="checkbox" class="form-check-input clase-replica-check"
                            id="clase_replica_${id}"
                            value="${id}"
                            data-es-actual="${grupo.es_actual ? '1' : '0'}"
                            ${checked ? 'checked' : ''}>
                        <span class="clase-replica-grupo-nombre">
                            Grupo ${escapar(grupo.nombre)}
                            ${actualBadge}
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
            wizard.experienciasSeleccionadas = [];
        } else if (indice <= 1) {
            wizard.eje = null;
            wizard.tematica = null;
            wizard.tematicas = null;
            wizard.experiencia = null;
            wizard.experiencias = null;
            wizard.experienciasSeleccionadas = [];
        } else         if (indice <= 2) {
            wizard.tematica = null;
            wizard.tematicas = null;
            wizard.experiencia = null;
            wizard.experiencias = null;
            wizard.experienciasSeleccionadas = [];
        } else if (indice <= 3) {
            wizard.experiencia = null;
            wizard.experiencias = null;
        }
    }

    function toggleExperienciaSeleccionada(exp) {
        if (experienciaEstaSeleccionada(exp.id)) {
            wizard.experienciasSeleccionadas = wizard.experienciasSeleccionadas
                .filter((item) => Number(item.id) !== Number(exp.id));
        } else {
            wizard.experienciasSeleccionadas.push(exp);
        }

        renderExperiencias();
    }

    function continuarDesdeExperiencias() {
        if (!wizard.experienciasSeleccionadas.length) {
            toast('warning', 'Selecciona al menos una experiencia.');
            return;
        }

        irPaso(4);
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
            wizard.experienciasSeleccionadas = [];
            irPaso(3);
            return;
        }

        if (paso === 'experiencia') {
            const exp = (wizard.experiencias || []).find((item) => Number(item.id) === numId) || null;
            if (!exp) return;

            if (wizard.modoAgregar) {
                if (experienciaYaUsadaEnClase(numId, wizard.claseId)) {
                    toast('info', 'Esta experiencia ya está agregada en esta clase.');
                    return;
                }
                wizard.experiencia = exp;
                guardarExperienciaEnClase();
                return;
            }

            toggleExperienciaSeleccionada(exp);
        }
    }

    function resetWizardModo() {
        wizard.modoAgregar = false;
        wizard.claseId = null;
        wizard.claseNombre = '';
        wizard.experienciasSeleccionadas = [];
        $modalTitle.text('Nueva clase');
        $modalSubtitle.text('Seleccione módulo, eje, temática y experiencias');
        $expBar.prop('hidden', true);
    }

    function abrirModalNueva() {
        if (!ambienteFijo) {
            toast('warning', 'No hay currículo disponible para este ambiente.');
            return;
        }
        resetWizardModo();
        wizard.ambiente = ambienteFijo;
        irPaso(0);
        modal?.show();
    }

    function abrirModalAgregar(claseId, claseNombre) {
        if (!ambienteFijo) {
            toast('warning', 'No hay currículo disponible para este ambiente.');
            return;
        }

        const ctx = contextoClase(claseId);
        if (!ctx?.tematica_id) {
            toast('warning', 'Esta clase aún no tiene temática definida.');
            return;
        }

        resetWizardModo();
        wizard.modoAgregar = true;
        wizard.claseId = Number(claseId) || null;
        wizard.claseNombre = String(claseNombre || '').trim();
        wizard.ambiente = ambienteFijo;
        wizard.modulo = {
            id: ctx.modulo_id,
            nombre: ctx.modulo_nombre || 'Módulo',
        };
        wizard.eje = {
            id: ctx.eje_id,
            nombre: ctx.eje_nombre || 'Eje',
        };
        wizard.tematica = {
            id: ctx.tematica_id,
            nombre: ctx.tematica_nombre || 'Temática',
        };
        wizard.experiencias = null;

        $modalTitle.text('Agregar experiencia');
        $modalSubtitle.text(
            wizard.claseNombre
                ? `Clase: ${wizard.claseNombre} · Temática: ${wizard.tematica.nombre}`
                : `Temática: ${wizard.tematica.nombre}`
        );

        wizard.paso = 3;
        $wizardEmpty.text('No hay experiencias disponibles en esta temática.');
        renderPaso();
        modal?.show();
    }

    function guardarExperienciaEnClase() {
        if (!wizard.modulo || !wizard.eje || !wizard.tematica || !wizard.experiencia || !wizard.claseId) {
            toast('error', 'Completa la selección curricular.');
            return;
        }

        const payload = {
            modulo_id: wizard.modulo.id,
            eje_id: wizard.eje.id,
            tematica_id: wizard.tematica.id,
            experiencia_id: wizard.experiencia.id,
            clase_id: wizard.claseId,
        };

        mostrarEstado('loading');
        api(urls.guardar, 'POST', payload)
            .done((res) => {
                toast('success', res?.message || 'Experiencia agregada.');
                modal?.hide();
                window.location.reload();
            })
            .fail((xhr) => {
                toast('error', errorAjax(xhr, 'No se pudo agregar la experiencia.'));
                renderPaso();
            });
    }

    function guardarClase() {
        const nombre = String($inputNombre.val() || '').trim();
        if (!nombre) {
            toast('warning', 'Escribe un nombre para la clase.');
            $inputNombre.trigger('focus');
            return;
        }

        if (!wizard.modulo || !wizard.eje || !wizard.tematica || !wizard.experienciasSeleccionadas.length) {
            toast('error', 'Completa la selección curricular y elige al menos una experiencia.');
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
            experiencia_ids: wizard.experienciasSeleccionadas.map((exp) => exp.id),
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

    $btnNueva.on('click', abrirModalNueva);

    $app.on('click', '.btn-clase-agregar-exp', function () {
        const claseId = Number($(this).data('clase-id') || 0);
        const claseNombre = String($(this).data('clase-nombre') || '');
        if (!claseId) return;
        abrirModalAgregar(claseId, claseNombre);
    });
    $btnVolver.on('click', () => {
        if (wizard.paso <= 0) return;
        irPaso(wizard.paso - 1);
    });
    $btnGuardar.on('click', guardarClase);
    $btnContinuar.on('click', continuarDesdeExperiencias);
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
