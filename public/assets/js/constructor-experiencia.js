/**
 * constructor-experiencia.js — Constructor de bloques (SuperAdmin / Admin / Panel)
 */
(function ($) {
    'use strict';

    const $app = $('.cx-app').first();
    if (!$app.length) return;

    const puedeEditar = String($app.data('puede-editar')) === '1';
    const puedePublicar = String($app.data('puede-publicar')) === '1';
    const urlJuegosCatalogo = String($app.data('url-juegos-catalogo') || '');
    const csrf = $('meta[name="csrf-token"]').attr('content');

    const urls = {
        listar: $app.data('url-listar') || '',
        guardar: $app.data('url-guardar') || '',
        reordenar: $app.data('url-reordenar') || '',
        limpiar: $app.data('url-limpiar') || '',
        upload: $app.data('url-upload') || '',
        publicar: $app.data('url-publicar') || '',
        tts: $app.data('url-tts') || '',
        actualizarTpl: $app.data('url-actualizar-template') || '',
        eliminarTpl: $app.data('url-eliminar-template') || '',
    };

    let bloques = [];
    let catalogo = [];
    let seleccionadoId = null;
    let sortable = null;
    let sortableInstrucciones = null;
    let saveTimer = null;
    let saving = false;

    const $catalogo = $('#cxCatalogo');
    const $timeline = $('#cxTimeline');
    const $count = $('#cxBloquesCount');
    const $resumen = $('#cxPendientesResumen');
    const $configEmpty = $('#cxConfigEmpty');
    const $configPanel = $('#cxConfigPanel');
    const $configHead = $('#cxConfigHead');
    const $configBody = $('#cxConfigBody');
    const $saveStatus = $('#cxSaveStatus');
    const $secuenciaScroll = $('.cx-secuencia-scroll');

    let syncScrollLock = false;

    function scrollSyncHabilitado() {
        return window.matchMedia('(min-width: 1201px)').matches;
    }

    function ratioScroll(el) {
        const max = el.scrollHeight - el.clientHeight;
        if (max <= 0) return 0;
        return el.scrollTop / max;
    }

    function aplicarRatioScroll(el, ratio) {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTop = max > 0 ? ratio * max : 0;
    }

    function targetsScrollLaterales() {
        const targets = [$catalogo[0]];
        if ($configPanel.length && !$configPanel.prop('hidden') && $configBody.length) {
            targets.push($configBody[0]);
        }
        return targets.filter(Boolean);
    }

    function sincronizarLateralesDesdeSecuencia() {
        if (!scrollSyncHabilitado() || syncScrollLock) return;
        const origen = $secuenciaScroll[0];
        if (!origen) return;

        syncScrollLock = true;
        const ratio = ratioScroll(origen);
        targetsScrollLaterales().forEach((el) => aplicarRatioScroll(el, ratio));
        syncScrollLock = false;
    }

    $secuenciaScroll.on('scroll', sincronizarLateralesDesdeSecuencia);
    window.addEventListener('resize', sincronizarLateralesDesdeSecuencia, { passive: true });

    function parseJsonScript(id, fallback) {
        const el = document.getElementById(id);
        if (!el) return fallback;
        try {
            return JSON.parse(el.textContent || 'null') || fallback;
        } catch (e) {
            return fallback;
        }
    }

    function tpl(template, map) {
        let out = String(template || '');
        Object.keys(map).forEach((k) => {
            out = out.split(k).join(String(map[k]));
        });
        return out;
    }

    function escapar(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function mediaUrlBloque(archivo) {
        const base = String($app.data('media-base') || '').replace(/\/$/, '');
        const name = String(archivo || '').trim();
        if (!name || !base) return '';
        if (/^https?:\/\//i.test(name) || name.startsWith('/')) return name;
        return `${base}/${name.replace(/^\//, '')}`;
    }

    function toast(icon, title) {
        if (window.Swal) {
            Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2600 });
            return;
        }
        window.alert(title);
    }

    function api(url, method, data) {
        return $.ajax({
            url,
            method,
            data: data ? JSON.stringify(data) : undefined,
            contentType: 'application/json',
            headers: {
                'X-CSRF-TOKEN': csrf,
                Accept: 'application/json',
            },
        });
    }

    function errorAjax(xhr, fallback) {
        return xhr?.responseJSON?.message
            || xhr?.responseJSON?.errors?.publicar?.[0]
            || xhr?.responseJSON?.errors?.tipo?.[0]
            || fallback;
    }

    /* ── Catálogo ───────────────────────────────────────────── */

    function renderCatalogo() {
        const grupos = {
            narrativos: [],
            interactivos: [],
            evaluativos: [],
            cierre: [],
        };
        catalogo.forEach((item) => {
            const cat = item.categoria || 'narrativos';
            if (!grupos[cat]) grupos[cat] = [];
            grupos[cat].push(item);
        });

        const labels = {
            narrativos: 'Narrativos',
            interactivos: 'Interactivos',
            evaluativos: 'Evaluativos',
            cierre: 'Cierre',
        };

        const descripciones = {
            narrativos: 'Presentan contenido al niño: instrucciones, textos, imágenes y audio.',
            interactivos: 'El niño interactúa pero NO se califica. Exploración libre sin respuesta correcta.',
            evaluativos: 'El niño responde y se registra si fue correcto. Tienen retroalimentación inmediata.',
            cierre: 'Cierran la sesión: registro emocional y recompensa.',
        };

        let html = '';
        Object.keys(grupos).forEach((cat) => {
            if (!grupos[cat].length) return;
            html += `<div class="cx-cat-group"><h3 class="cx-cat-group-title" title="${descripciones[cat] || ''}">${labels[cat] || cat}</h3>`;
            grupos[cat].forEach((item) => {
                const yaEmocion = item.tipo === 'emocion' && bloques.some((b) => b.tipo === 'emocion');
                const esObligatorio = !!item.obligatorio;
                const disabled = !puedeEditar || esObligatorio || yaEmocion;
                let badge = '';
                if (esObligatorio) badge = '<span class="cx-badge">Obligatorio</span>';
                else if (yaEmocion) badge = '<span class="cx-badge">Ya agregado</span>';
                html += `
                    <button type="button" class="cx-cat-item" data-tipo="${escapar(item.tipo)}"
                        data-categoria="${escapar(item.categoria)}"
                        data-obligatorio="${esObligatorio ? '1' : '0'}"
                        ${disabled ? 'disabled' : ''}>
                        <span class="cx-cat-icon"><i class="fa-solid ${escapar(item.icono || 'fa-cube')}"></i></span>
                        <span>
                            <span class="cx-cat-name">${escapar(item.nombre)} ${badge}</span>
                            <span class="cx-cat-desc">${escapar(item.descripcion || '')}</span>
                        </span>
                    </button>`;
            });
            html += '</div>';
        });
        $catalogo.html(html || '<p class="text-muted small">Sin tipos disponibles.</p>');
    }

    /* ── Secuencia ──────────────────────────────────────────── */

    function pendientesCount() {
        return bloques.filter((b) => !b.completo).length;
    }

    function actualizarResumen() {
        const n = bloques.length;
        $count.text(`(${n} bloque${n === 1 ? '' : 's'})`);
        const p = pendientesCount();
        if (p > 0) {
            $resumen.addClass('has-warn').text(`${p} bloque(s) con campos pendientes`);
        } else {
            $resumen.removeClass('has-warn').text('Sin campos pendientes');
        }
    }

    function htmlCardBloque(bloque) {
        const seleccionado = Number(seleccionadoId) === Number(bloque.id);
        const status = htmlStatusBloque(bloque);

        const tags = [];
        if (bloque.obligatorio) tags.push('<span>Obligatorio</span>');
        tags.push(`<span>${escapar(bloque.categoria_label || '')}</span>`);

        const disabledDel = !puedeEditar || !bloque.puede_eliminar ? 'disabled' : '';
        const dragClass = bloque.puede_mover ? 'is-movable' : '';
        const bodyHint = seleccionado ? '' : '<div class="cx-block-hint">Clic para configurar</div>';

        return `
            <div class="cx-block-row ${dragClass}${seleccionado ? ' is-active' : ''}" data-id="${bloque.id}" data-puede-mover="${bloque.puede_mover ? '1' : '0'}">
                <div class="cx-block-node" aria-hidden="true">
                    <i class="fa-solid ${escapar(bloque.icono || 'fa-cube')}"></i>
                </div>
                <article class="cx-block-card${seleccionado ? ' is-selected' : ''}" data-id="${bloque.id}"
                    data-categoria="${escapar(bloque.categoria || '')}" role="button" tabindex="0"
                    aria-selected="${seleccionado ? 'true' : 'false'}"
                    aria-label="Bloque ${escapar(bloque.orden)}: ${escapar(bloque.nombre)}">
                    <div class="cx-block-card-head">
                        <span class="cx-block-num">${escapar(bloque.orden)}</span>
                        <span class="cx-block-title">${escapar(bloque.nombre)}</span>
                        <div class="cx-block-tags">${tags.join('')}</div>
                        <div class="cx-block-actions">
                            <button type="button" class="cx-btn-config" title="Configurar" data-id="${bloque.id}">
                                <i class="fa-solid fa-gear"></i>
                            </button>
                            <button type="button" class="cx-btn-preview" title="Vista niño desde este bloque" data-id="${bloque.id}">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button type="button" class="cx-btn-eliminar" title="Eliminar" data-id="${bloque.id}" ${disabledDel}>
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="cx-block-body">
                        ${bodyHint}
                        ${status}
                    </div>
                </article>
            </div>`;
    }

    function renderSecuencia() {
        $timeline.html(bloques.map(htmlCardBloque).join(''));
        actualizarResumen();
        renderCatalogo();
        initSortable();
        requestAnimationFrame(sincronizarLateralesDesdeSecuencia);
    }

    function htmlStatusBloque(bloque) {
        return bloque.completo
            ? '<span class="cx-block-status"><span class="cx-dot is-ok"></span> Completo</span>'
            : '<span class="cx-block-status"><span class="cx-dot"></span> Campos pendientes</span>';
    }

    /**
     * Tras autosave: actualiza solo estado/resumen/banner.
     * No reescribe la timeline (evita perder foco y saltar el scroll del panel).
     */
    function actualizarEstadoTrasGuardar(bloque) {
        if (!bloque) return;
        const $row = $timeline.find(`.cx-block-row[data-id="${bloque.id}"]`);
        if ($row.length) {
            const $status = $row.find('.cx-block-status');
            if ($status.length) $status.replaceWith(htmlStatusBloque(bloque));
            else $row.find('.cx-block-body').append(htmlStatusBloque(bloque));
            $row.find('.cx-block-card').addClass('is-selected').attr('aria-selected', 'true');
            $row.addClass('is-active');
        }
        actualizarResumen();
        actualizarBannerPendientes(bloque);
    }

    function initSortable() {
        if (sortable) {
            sortable.destroy();
            sortable = null;
        }
        if (!puedeEditar || typeof Sortable === 'undefined') return;

        sortable = Sortable.create($timeline[0], {
            animation: 160,
            handle: '.cx-block-card',
            draggable: '.cx-block-row.is-movable',
            ghostClass: 'sortable-ghost',
            onMove(evt) {
                const related = evt.related;
                if (!related || !related.classList.contains('cx-block-row')) return false;
                // No insertar antes de Bienvenida ni después de Recompensa.
                const rows = Array.from(evt.to.querySelectorAll('.cx-block-row'));
                const relatedIndex = rows.indexOf(related);
                if (relatedIndex <= 0 && !evt.willInsertAfter) return false;
                if (relatedIndex === rows.length - 1 && evt.willInsertAfter) return false;
                if (!related.classList.contains('is-movable')) {
                    // Solo permitir quedar entre anclas: después de bienvenida / antes de recompensa.
                    const isFirst = relatedIndex === 0;
                    const isLast = relatedIndex === rows.length - 1;
                    if (isFirst && !evt.willInsertAfter) return false;
                    if (isLast && evt.willInsertAfter) return false;
                    if (isFirst && evt.willInsertAfter) return true;
                    if (isLast && !evt.willInsertAfter) return true;
                    return false;
                }
                return true;
            },
            onEnd() {
                const ids = $timeline.find('.cx-block-row.is-movable').map(function () {
                    return Number($(this).data('id'));
                }).get();
                api(urls.reordenar, 'PATCH', { orden: ids })
                    .done((res) => {
                        bloques = res?.data?.bloques || bloques;
                        renderSecuencia();
                        if (seleccionadoId) seleccionarBloque(seleccionadoId, false);
                    })
                    .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo reordenar.')));
            },
        });
    }

    function destroySortableInstrucciones() {
        if (sortableInstrucciones) {
            sortableInstrucciones.destroy();
            sortableInstrucciones = null;
        }
    }

    function numerarTurnosAudio() {
        $configBody.find('.cx-audio-linea').each(function (i) {
            $(this).attr('data-index', i);
            $(this).find('.cx-audio-linea-n').text(`Turno ${i + 1}`);
            $(this).find('.cx-audio-linea-rm').attr('data-index', i);
        });
    }

    function initSortableInstrucciones() {
        destroySortableInstrucciones();
        if (!puedeEditar || typeof Sortable === 'undefined') return;
        const el = $configBody.find('.cx-audio-lineas')[0];
        if (!el || el.querySelectorAll('.cx-audio-linea').length < 2) return;

        sortableInstrucciones = Sortable.create(el, {
            animation: 160,
            handle: '.cx-audio-linea-handle',
            draggable: '.cx-audio-linea',
            ghostClass: 'sortable-ghost',
            dragClass: 'cx-audio-linea-drag',
            filter: 'textarea, button:not(.cx-audio-linea-handle), input',
            preventOnFilter: false,
            onEnd() {
                numerarTurnosAudio();
                const bloque = bloquePorId(seleccionadoId);
                if (!bloque) return;
                bloque.instrucciones_audio = leerInstruccionesDesdeForm();
                scheduleSave();
            },
        });
    }

    function bloquePorId(id) {
        return bloques.find((b) => Number(b.id) === Number(id)) || null;
    }

    function actualizarIndicadoresSeleccion() {
        $timeline.find('.cx-block-row').each(function () {
            const activo = Number(seleccionadoId) === Number($(this).data('id'));
            const $body = $(this).find('.cx-block-body');
            const $status = $body.find('.cx-block-status');
            const statusHtml = $status.length ? $status.prop('outerHTML') : '';
            $body.html((activo ? '' : '<div class="cx-block-hint">Clic para configurar</div>') + statusHtml);
        });
    }

    function seleccionarBloque(id, scroll) {
        seleccionadoId = Number(id);
        $timeline.find('.cx-block-row').removeClass('is-active');
        $timeline.find('.cx-block-card').removeClass('is-selected').attr('aria-selected', 'false');
        const $row = $timeline.find(`.cx-block-row[data-id="${id}"]`);
        const $card = $timeline.find(`.cx-block-card[data-id="${id}"]`);
        $row.addClass('is-active');
        $card.addClass('is-selected').attr('aria-selected', 'true');
        actualizarIndicadoresSeleccion();
        const bloque = bloquePorId(id);
        if (!bloque) {
            $configPanel.prop('hidden', true);
            $configEmpty.prop('hidden', false);
            return;
        }
        $configEmpty.prop('hidden', true);
        $configPanel.prop('hidden', false);
        renderConfig(bloque);
        if (scroll) {
            const el = $row[0] || $card[0];
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /* ── Formularios ────────────────────────────────────────── */

    let ttsPreviewToken = 0;
    let ttsPreviewPlayer = null;

    function detenerMediosConfig() {
        ttsPreviewToken += 1;
        if (ttsPreviewPlayer) {
            try {
                ttsPreviewPlayer.onended = null;
                ttsPreviewPlayer.onerror = null;
                ttsPreviewPlayer.pause();
                ttsPreviewPlayer.removeAttribute('src');
            } catch (e) { /* noop */ }
        }
        $configBody.find('.cx-audio-el, .cx-video-el').each(function () {
            try {
                this.pause();
                this.currentTime = 0;
            } catch (e) { /* noop */ }
        });
        $configBody.find('.cx-audio-play-btn i, .cx-video-play-btn i')
            .removeClass('fa-pause').addClass('fa-play');
        $configBody.find('.cx-video-preview-frame').removeClass('is-playing');
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
        }
    }

    function hablarNavegadorConstructor(texto, personaje, token, onEnd) {
        if (!window.speechSynthesis) {
            if (typeof onEnd === 'function') onEnd();
            return;
        }
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'es-CO';
        u.rate = 0.92;
        u.pitch = personaje === 'zeus' ? 0.75 : 1.15;
        u.onend = function () {
            if (token === ttsPreviewToken && typeof onEnd === 'function') onEnd();
        };
        u.onerror = function () {
            if (token === ttsPreviewToken && typeof onEnd === 'function') onEnd();
        };
        window.speechSynthesis.speak(u);
    }

    function reproducirSecuenciaConstructor(lineas, idx) {
        if (idx >= lineas.length) return;
        const token = ttsPreviewToken;
        const linea = lineas[idx];
        const siguiente = function () {
            if (token !== ttsPreviewToken) return;
            reproducirSecuenciaConstructor(lineas, idx + 1);
        };
        if (!urls.tts) {
            hablarNavegadorConstructor(linea.texto, linea.personaje, token, siguiente);
            return;
        }
        $.ajax({
            url: urls.tts,
            method: 'POST',
            data: JSON.stringify({ texto: linea.texto, personaje: linea.personaje }),
            contentType: 'application/json',
            headers: { 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
        }).done(function (res) {
            if (token !== ttsPreviewToken) return;
            const src = res && res.data && res.data.url;
            if (!src) {
                hablarNavegadorConstructor(linea.texto, linea.personaje, token, siguiente);
                return;
            }
            if (!ttsPreviewPlayer) ttsPreviewPlayer = new Audio();
            ttsPreviewPlayer.onended = siguiente;
            ttsPreviewPlayer.onerror = function () {
                hablarNavegadorConstructor(linea.texto, linea.personaje, token, siguiente);
            };
            ttsPreviewPlayer.src = src;
            const p = ttsPreviewPlayer.play();
            if (p && typeof p.catch === 'function') {
                p.catch(function () {
                    if (token !== ttsPreviewToken) return;
                    hablarNavegadorConstructor(linea.texto, linea.personaje, token, siguiente);
                });
            }
        }).fail(function () {
            if (token !== ttsPreviewToken) return;
            hablarNavegadorConstructor(linea.texto, linea.personaje, token, siguiente);
        });
    }

    function fieldTextarea(name, label, value, help) {
        const helpText = help || '';
        const ttsBtn = '';
        return `
            <div class="cx-field">
                <div class="cx-field-label-row">
                    <label>${escapar(label)}</label>
                    ${ttsBtn}
                </div>
                <textarea class="form-control cx-input" data-field="${escapar(name)}" rows="3"
                    ${puedeEditar ? '' : 'readonly'}>${escapar(value || '')}</textarea>
                ${helpText ? `<div class="cx-help">${escapar(helpText)}</div>` : ''}
            </div>`;
    }

    function instruccionesDelBloque(bloque) {
        const raw = Array.isArray(bloque?.instrucciones_audio) ? bloque.instrucciones_audio : [];
        const lineas = raw.map((fila, i) => ({
            texto: String(fila?.texto ?? fila?.instruccion ?? '').trim(),
            personaje: String(fila?.personaje || 'zoe').toLowerCase() === 'zeus' ? 'zeus' : 'zoe',
            orden: i + 1,
        }));
        if (lineas.length) return lineas;
        const legacy = String(bloque?.datos?.instruccion || '').trim();
        return [{ texto: legacy, personaje: 'zoe', orden: 1 }];
    }

    function leerInstruccionesDesdeForm() {
        const lineas = [];
        $configBody.find('.cx-audio-linea').each(function () {
            const $row = $(this);
            const pj = String($row.find('.cx-audio-linea-pj.is-on').data('personaje') || 'zoe');
            lineas.push({
                texto: String($row.find('.cx-audio-linea-texto').val() || ''),
                personaje: pj === 'zeus' ? 'zeus' : 'zoe',
            });
        });
        if (!lineas.length) {
            return [{ texto: '', personaje: 'zoe', orden: 1 }];
        }
        return lineas.map((l, i) => ({ ...l, orden: i + 1 }));
    }

    function fieldInstruccionesAudio() {
        const bloque = bloquePorId(seleccionadoId) || {};
        const lineas = instruccionesDelBloque(bloque);
        const filas = lineas.map((linea, i) => {
            const zoeOn = linea.personaje !== 'zeus';
            return `
            <div class="cx-audio-linea" data-index="${i}">
                <div class="cx-audio-linea-head">
                    ${puedeEditar && lineas.length > 1
                    ? `<button type="button" class="cx-audio-linea-handle" title="Arrastrar para reordenar" aria-label="Reordenar">
                            <i class="fa-solid fa-grip-vertical"></i>
                           </button>`
                    : ''}
                    <span class="cx-audio-linea-n">Turno ${i + 1}</span>
                    <div class="cx-audio-pj" role="group" aria-label="Personaje">
                        <button type="button" class="cx-audio-linea-pj ${zoeOn ? 'is-on' : ''}" data-personaje="zoe"
                            ${puedeEditar ? '' : 'disabled'}>Zoe</button>
                        <button type="button" class="cx-audio-linea-pj ${zoeOn ? '' : 'is-on'}" data-personaje="zeus"
                            ${puedeEditar ? '' : 'disabled'}>Zeus</button>
                    </div>
                    ${puedeEditar && lineas.length > 1
                    ? `<button type="button" class="btn btn-sm btn-outline-danger cx-audio-linea-rm" data-index="${i}" title="Quitar turno">
                            <i class="fa-solid fa-trash"></i>
                           </button>`
                    : ''}
                </div>
                <textarea class="form-control cx-audio-linea-texto" rows="2" maxlength="800"
                    ${puedeEditar ? '' : 'readonly'}
                    placeholder="Lo que dice este personaje">${escapar(linea.texto || '')}</textarea>
            </div>`;
        }).join('');

        return `
            <div class="cx-field cx-audio-seq">
                <div class="cx-field-label-row">
                    <label>Instrucciones de audio</label>
                    <button type="button" class="cx-tts-preview-btn" data-cx-tts-preview title="Escuchar secuencia">
                        <i class="fa-solid fa-volume-high"></i> Escuchar
                    </button>
                </div>
                <div class="cx-audio-lineas">${filas}</div>
                ${puedeEditar && lineas.length < 8
                ? `<div class="cx-inline-actions">
                        <button type="button" class="btn btn-sm btn-outline-primary cx-audio-linea-add">+ Turno</button>
                       </div>`
                : ''}
                <div class="cx-help">Se leen en orden al entrar al bloque. Arrastra el asa para reordenar (como los bloques de la secuencia).</div>
            </div>`;
    }

    function fieldInput(name, label, value, type, help) {
        return `
            <div class="cx-field">
                <label>${escapar(label)}</label>
                <input type="${type || 'text'}" class="form-control cx-input" data-field="${escapar(name)}"
                    value="${escapar(value || '')}" ${puedeEditar ? '' : 'readonly'}>
                ${help ? `<div class="cx-help">${escapar(help)}</div>` : ''}
            </div>`;
    }

    function fieldSelect(name, label, value, options) {
        const opts = options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            const t = typeof o === 'string' ? o : o.label;
            return `<option value="${escapar(v)}" ${String(v) === String(value) ? 'selected' : ''}>${escapar(t)}</option>`;
        }).join('');
        return `
            <div class="cx-field">
                <label>${escapar(label)}</label>
                <select class="form-select cx-input" data-field="${escapar(name)}" ${puedeEditar ? '' : 'disabled'}>
                    ${opts}
                </select>
            </div>`;
    }

    const JUEGOS_OPCIONES = [
        {
            id: 'rompecabezas',
            nombre: 'Rompecabezas',
            desc: 'Armar la imagen arrastrando piezas',
            icon: 'fa-puzzle-piece',
            color: '#d97706',
        },
        {
            id: 'memoria',
            nombre: 'Memoria',
            desc: 'Encontrar parejas de imágenes iguales',
            icon: 'fa-clone',
            color: '#0284c7',
        },
        {
            id: 'colorear',
            nombre: 'Colorear',
            desc: 'Pintar sobre una imagen en blanco y negro',
            icon: 'fa-palette',
            color: '#a855f7',
        },
        {
            id: 'secuencia',
            nombre: 'Secuencia',
            desc: 'Ordenar imágenes en el paso correcto',
            icon: 'fa-arrow-down-wide-short',
            color: '#0f6e56',
        },
    ];

    function juegoCatalogoCardHtml(j, selectedCatalogoId) {
        const motorId = j.tipo || j.id;
        const catalogoId = j.tipo ? j.id : null;
        const selected = catalogoId && String(catalogoId) === String(selectedCatalogoId || '');
        const icon = j.icon || j.icono || 'fa-gamepad';
        const iconClass = icon.indexOf('fa-') === 0 ? icon : `fa-${icon}`;
        const color = j.color || '#2563eb';
        const cadena = j.cadena || {};
        const tipoLabel = j.tipo_label || motorId;
        const descripcion = (j.descripcion || '').trim();

        const badges = [];
        if (cadena.ambiente_nombre) {
            badges.push(`<span class="stu-badge">${escapar(cadena.ambiente_nombre)}</span>`);
        }
        if (cadena.modulo_nombre) {
            badges.push(`<span class="stu-badge stu-badge--perfil-aprendizaje">${escapar(cadena.modulo_nombre)}</span>`);
        }
        if (cadena.eje_nombre) {
            badges.push(`<span class="stu-badge">${escapar(cadena.eje_nombre)}</span>`);
        }
        if (cadena.tematica_nombre) {
            badges.push(`<span class="stu-badge">${escapar(cadena.tematica_nombre)}</span>`);
        }
        if (j.tipo) {
            badges.push(`<span class="stu-badge stu-badge--apoyo">${escapar(tipoLabel)}</span>`);
        }

        const badgesHtml = badges.length
            ? `<div class="student-middle">${badges.join('')}</div>`
            : '';

        return `<button type="button"
            class="cx-juego-catalogo-card student-card${selected ? ' is-selected' : ''}"
            data-juego-id="${escapar(motorId)}"
            data-juego-catalogo-id="${escapar(catalogoId || '')}"
            data-juego-nombre="${escapar(j.nombre || '')}"
            aria-pressed="${selected ? 'true' : 'false'}"
            ${puedeEditar ? '' : 'disabled'}>
            <span class="cx-juego-catalogo-check" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
            <div class="student-top">
                <div class="student-avatar initials d-flex align-items-center justify-content-center"
                    style="background:${escapar(color)};color:#fff;font-size:1.25rem;">
                    <i class="fa-solid ${escapar(iconClass)}"></i>
                </div>
                <div class="student-identity">
                    <h5>${escapar(j.nombre || 'Sin nombre')}</h5>
                    <small>${escapar(tipoLabel)}</small>
                </div>
            </div>
            ${badgesHtml}
            <div class="student-info">
                <small class="text-muted">${escapar(descripcion || 'Sin descripción')}</small>
            </div>
            <div class="cx-juego-catalogo-foot">
                <span class="cx-juego-catalogo-action">${selected ? 'Seleccionado' : 'Usar este juego'}</span>
            </div>
        </button>`;
    }

    function juegoCardHtml(j, selectedMotorId, selectedCatalogoId) {
        const motorId = j.tipo || j.id;
        const catalogoId = j.tipo ? j.id : null;
        const selected = catalogoId
            ? String(catalogoId) === String(selectedCatalogoId || '')
            : (!selectedCatalogoId && String(motorId) === String(selectedMotorId || ''));
        const icon = j.icon || j.icono || 'fa-gamepad';
        const iconClass = icon.indexOf('fa-') === 0 ? icon : `fa-${icon}`;
        const cadena = j.cadena || {};
        const meta = [cadena.ambiente_nombre, cadena.modulo_nombre, cadena.eje_nombre, cadena.tematica_nombre]
            .filter(Boolean)
            .join(' · ');
        const desc = j.desc || j.descripcion || meta || '';
        return `<button type="button" class="cx-juego-card${selected ? ' is-selected' : ''}"
            data-juego-id="${escapar(motorId)}" data-juego-catalogo-id="${escapar(catalogoId || '')}"
            data-juego-nombre="${escapar(j.nombre || '')}" aria-pressed="${selected ? 'true' : 'false'}"
            ${puedeEditar ? '' : 'disabled'}>
            <span class="cx-juego-card-icon" style="--cx-juego-color:${escapar(j.color || '#2563eb')}">
                <i class="fa-solid ${escapar(iconClass)}" aria-hidden="true"></i>
            </span>
            <span class="cx-juego-card-body">
                <span class="cx-juego-card-name">${escapar(j.nombre)}</span>
                <span class="cx-juego-card-desc">${escapar(desc)}</span>
            </span>
        </button>`;
    }

    function fieldJuegoPicker(name, label, datos) {
        const value = datos?.juego_id || '';
        const catalogoId = datos?.juego_catalogo_id || '';
        const cards = JUEGOS_OPCIONES.map((j) => juegoCardHtml(j, value, catalogoId)).join('');
        const btnCatalogo = (urlJuegosCatalogo && puedeEditar)
            ? `<div class="cx-inline-actions mb-2">
                <button type="button" class="btn btn-outline-primary btn-sm" id="cxBtnJuegosModulo">
                    <i class="fa-solid fa-gamepad"></i> Catálogo del modulo de juegos
                </button>
               </div>`
            : '';
        return `
            <div class="cx-field">
                <label>${escapar(label)}</label>
                ${btnCatalogo}
                <input type="hidden" class="cx-input" data-field="${escapar(name)}" value="${escapar(value || '')}">
                <input type="hidden" class="cx-input" data-field="juego_catalogo_id" value="${escapar(catalogoId || '')}">
                <div class="cx-juego-picker" role="radiogroup" aria-label="${escapar(label)}">${cards}</div>
                ${!value ? '<div class="cx-help">Elige un tipo de juego o abre el catálogo para seleccionar uno importado.</div>' : ''}
            </div>`;
    }

    function fieldUpload(name, label, value, accept) {
        return `
            <div class="cx-field">
                <label>${escapar(label)}</label>
                <div class="cx-upload-row">
                    <input type="hidden" class="cx-input" data-field="${escapar(name)}" value="${escapar(value || '')}">
                    <span class="cx-file-name">${escapar(value || 'Sin archivo')}</span>
                    ${puedeEditar ? `<input type="file" class="form-control form-control-sm cx-file" data-target="${escapar(name)}" accept="${escapar(accept || '*/*')}">` : ''}
                </div>
            </div>`;
    }

    /** Thumb clicable; el hidden va dentro del wrap para no desfasar el layout. */
    function imageThumbBtn(name, value, title, large) {
        const archivo = value || '';
        const url = mediaUrlBloque(archivo);
        const thumb = url
            ? `<img src="${escapar(url)}" alt="">`
            : '<i class="fa-solid fa-image"></i>';
        const sizeClass = large ? ' cx-image-preview-btn' : '';
        const btn = puedeEditar
            ? `<label class="cx-img-btn${sizeClass}" title="${escapar(title || 'Subir imagen')}">
                    ${thumb}
                    <input type="file" class="cx-file" data-target="${escapar(name)}" accept="image/*" hidden>
               </label>`
            : `<span class="cx-img-btn${sizeClass} is-readonly">${thumb}</span>`;
        return `<span class="cx-img-wrap">
            <input type="hidden" class="cx-input" data-field="${escapar(name)}" value="${escapar(archivo)}">
            ${btn}
        </span>`;
    }

    /**
     * Preview de imagen (patrón único del constructor).
     * opts.compact: marco chico junto a inputs (elementos, opciones de reto).
     */
    function fieldImagePreview(name, label, value, opts) {
        const archivo = value || '';
        const compact = !!(opts && opts.compact);
        const frameCls = compact ? 'cx-image-frame cx-image-frame--sm' : 'cx-image-frame';
        const fieldCls = compact ? 'cx-field cx-field--img-compact' : 'cx-field';
        return `<div class="${fieldCls}">
            <label>${escapar(label)}</label>
            <div class="${frameCls}">
                ${imageThumbBtn(name, archivo, 'Subir imagen', !compact)}
            </div>
            <div class="cx-media-preview-meta">
                <span class="cx-file-name">${escapar(archivo || 'Sin archivo')}</span>
                ${compact
            ? ''
            : '<div class="cx-help">Toca el recuadro para elegir o cambiar la imagen.</div>'}
            </div>
        </div>`;
    }

    function fieldAudioPreview(name, label, value) {
        const archivo = value || '';
        const url = mediaUrlBloque(archivo);
        const hasAudio = !!url;
        return `<div class="cx-field">
            <label>${escapar(label)}</label>
            <div class="cx-media-preview-row cx-audio-preview-row">
                <input type="hidden" class="cx-input" data-field="${escapar(name)}" value="${escapar(archivo)}">
                <button type="button" class="cx-audio-btn cx-audio-play-btn" title="Reproducir audio"
                    ${hasAudio ? '' : 'disabled'} aria-label="Reproducir audio">
                    <i class="fa-solid fa-${hasAudio ? 'play' : 'volume-high'}"></i>
                </button>
                ${hasAudio ? `<audio class="cx-audio-el" preload="metadata" src="${escapar(url)}" hidden></audio>` : ''}
                <div class="cx-media-preview-meta">
                    <span class="cx-file-name">${escapar(archivo || 'Sin archivo')}</span>
                    ${puedeEditar
                ? `<label class="cx-audio-upload-btn">
                            <i class="fa-solid fa-upload"></i> Elegir archivo
                            <input type="file" class="cx-file" data-target="${escapar(name)}"
                                accept="audio/mpeg,.mp3,audio/wav,.wav" hidden>
                           </label>`
                : ''}
                    <div class="cx-help">Toca ▶ para escuchar el audio. Formatos: MP3, WAV.</div>
                </div>
            </div>
        </div>`;
    }

    function fieldCheckbox(name, label, checked) {
        return `
            <div class="cx-field form-check">
                <input type="checkbox" class="form-check-input cx-check" data-field="${escapar(name)}"
                    id="cx_chk_${escapar(name)}" ${checked ? 'checked' : ''} ${puedeEditar ? '' : 'disabled'}>
                <label class="form-check-label" for="cx_chk_${escapar(name)}">${escapar(label)}</label>
            </div>`;
    }

    /** Pestañas Bootstrap (mismo patrón que modales del proyecto). */
    function configTabs(tabs) {
        const uid = 'cxcfg';
        let nav = '<ul class="nav nav-tabs cx-config-tabs" role="tablist">';
        let panes = '<div class="tab-content cx-config-tab-content">';
        tabs.forEach((t, i) => {
            const active = i === 0;
            const tabId = `${uid}-tab-${t.id}`;
            const paneId = `${uid}-pane-${t.id}`;
            nav += `<li class="nav-item" role="presentation">
                <button type="button" class="nav-link${active ? ' active' : ''}" id="${tabId}"
                    data-bs-toggle="tab" data-bs-target="#${paneId}" role="tab"
                    aria-controls="${paneId}" aria-selected="${active ? 'true' : 'false'}"
                    data-cx-tab="${escapar(t.id)}">
                    ${t.icon ? `<i class="fa-solid ${escapar(t.icon)}"></i> ` : ''}${escapar(t.label)}
                </button>
            </li>`;
            panes += `<div class="tab-pane fade${active ? ' show active' : ''}" id="${paneId}"
                role="tabpanel" aria-labelledby="${tabId}" tabindex="0">
                ${t.content || ''}
            </div>`;
        });
        nav += '</ul>';
        panes += '</div>';
        return nav + panes;
    }

    function tabActivaId() {
        return $configBody.find('.cx-config-tabs .nav-link.active').data('cx-tab') || null;
    }

    function restaurarTab(tabId) {
        if (!tabId) return;
        const $btn = $configBody.find(`.cx-config-tabs .nav-link[data-cx-tab="${tabId}"]`);
        if (!$btn.length) return;
        const target = $btn.attr('data-bs-target');
        $configBody.find('.cx-config-tabs .nav-link').removeClass('active').attr('aria-selected', 'false');
        $configBody.find('.cx-config-tab-content .tab-pane').removeClass('show active');
        $btn.addClass('active').attr('aria-selected', 'true');
        if (target) $configBody.find(target).addClass('show active');
    }

    function videoPreviewFrameHtml(url) {
        if (!url) {
            return '<i class="fa-solid fa-film cx-video-placeholder"></i>';
        }
        return `<video class="cx-video-el" preload="metadata" playsinline src="${escapar(url)}"></video>
            <button type="button" class="cx-video-btn cx-video-play-btn" title="Reproducir video" aria-label="Reproducir video">
                <i class="fa-solid fa-play"></i>
            </button>`;
    }

    function fieldVideoPreview(name, label, value) {
        const archivo = value || '';
        const url = mediaUrlBloque(archivo);
        return `<div class="cx-field">
            <label>${escapar(label)}</label>
            <div class="cx-media-preview-row cx-video-preview-row">
                <input type="hidden" class="cx-input" data-field="${escapar(name)}" value="${escapar(archivo)}">
                <div class="cx-video-preview-frame">${videoPreviewFrameHtml(url)}</div>
                <div class="cx-media-preview-meta">
                    <span class="cx-file-name">${escapar(archivo || 'Sin archivo')}</span>
                    ${puedeEditar
                ? `<label class="cx-video-upload-btn">
                            <i class="fa-solid fa-upload"></i> Elegir archivo
                            <input type="file" class="cx-file" data-target="${escapar(name)}"
                                accept="video/mp4,.mp4" hidden>
                           </label>`
                : ''}
                    <div class="cx-help">Toca ▶ en la vista previa para ver el video. Formato: MP4.</div>
                </div>
            </div>
        </div>`;
    }

    function formBienvenida(d) {
        const tipoMedia = d.tipo_media || 'ninguno';
        let mediaHtml = fieldSelect('tipo_media', 'Imagen o video (opcional)', tipoMedia, [
            { value: 'ninguno', label: 'Ninguno' },
            { value: 'imagen', label: 'Imagen' },
            { value: 'video', label: 'Video' },
        ]);
        if (tipoMedia === 'imagen') {
            mediaHtml += fieldImagePreview('imagen', 'Imagen de bienvenida (opcional)', d.imagen);
        } else if (tipoMedia === 'video') {
            mediaHtml += fieldVideoPreview('video', 'Video de bienvenida (opcional)', d.video);
        }
        return fieldInstruccionesAudio()
            + fieldSelect('personaje', 'Personaje narrador', d.personaje || 'personaje', [
                { value: 'personaje', label: 'Personaje del ambiente' },
                { value: 'ninguno', label: 'Ninguno' },
            ])
            + mediaHtml
            + fieldTextarea('descripcion_accesible', 'Descripción accesible', d.descripcion_accesible);
    }

    function formAudio(d) {
        return fieldInstruccionesAudio()
            + fieldAudioPreview('archivo', 'Archivo de audio (.mp3)', d.archivo)
            + fieldSelect('repeticiones', 'Repeticiones', d.repeticiones || '1 vez', ['1 vez', '2 veces', '3 veces', 'Sin límite'])
            + fieldTextarea('descripcion_accesible', 'Descripción accesible', d.descripcion_accesible);
    }

    function formVideo(d) {
        return fieldInstruccionesAudio()
            + fieldVideoPreview('archivo', 'Archivo de video (.mp4)', d.archivo)
            + fieldTextarea('descripcion_accesible', 'Descripción accesible', d.descripcion_accesible);
    }

    function formImagen(d) {
        return fieldInstruccionesAudio()
            + fieldImagePreview('archivo', 'Archivo de imagen', d.archivo)
            + fieldTextarea('descripcion', 'Descripción accesible', d.descripcion);
    }

    function formHistoria(d) {
        const n = Number(d.paginas || 3);
        const pages = Array.isArray(d.paginas_data) ? d.paginas_data : [];
        const badgeColors = ['#2563eb', '#0f6e56', '#d97706', '#7c3aed', '#dc2626'];
        let html = fieldInstruccionesAudio()
            + fieldSelect('paginas', 'Número de páginas', String(n), ['2', '3', '4', '5']);
        for (let i = 0; i < n; i++) {
            const p = pages[i] || { imagen: '', audio: '' };
            const color = badgeColors[i % badgeColors.length];
            html += `<div class="cx-subcard cx-paso-card" data-pagina="${i}" style="--cx-paso-color:${color}">
                <div class="cx-subcard-head">
                    <span class="cx-paso-badge" style="background:${color}">Página ${i + 1}</span>
                </div>
                ${fieldImagePreview(`paginas_data.${i}.imagen`, 'Imagen', p.imagen)}
                ${fieldAudioPreview(`paginas_data.${i}.audio`, 'Audio de la página (.mp3)', p.audio)}
            </div>`;
        }
        return html;
    }

    function formRa(d) {
        return fieldInstruccionesAudio()
            + fieldInput('marcador', 'Marcador (número de cartilla)', d.marcador)
            + fieldSelect('contenido', 'Contenido RA', d.contenido || 'Animación 3D', [
                'Animación 3D', 'Audio narrado', 'Video LSC', 'Animación + narración',
            ]);
    }

    function formEvidencia(d) {
        return fieldInstruccionesAudio()
            + fieldSelect('tipo', 'Tipo de evidencia', d.tipo || 'Foto', [
                'Foto', 'Audio grabado', 'Video corto', 'Selección de imagen',
            ]);
    }

    function formJuego(d) {
        const id = d.juego_id || '';
        const defaultZonaColors = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
        let extra = '';
        if (id === 'rompecabezas') {
            extra = fieldImagePreview('juego_imagen', 'Imagen del juego', d.juego_imagen)
                + fieldSelect('juego_piezas', 'Dificultad', d.juego_piezas || '', [
                    { value: '', label: 'Seleccione…' },
                    '4 piezas (fácil)', '6 piezas (medio)', '9 piezas (difícil)',
                ]);
        }
        if (id === 'colorear') {
            const n = (() => {
                const s = String(d.juego_piezas || '');
                if (s.includes('9')) return 9;
                if (s.includes('6')) return 6;
                if (s.includes('4')) return 4;
                return 4;
            })();
            const colores = Array.isArray(d.colores_zonas) ? d.colores_zonas : [];
            let zonasHtml = '';
            for (let i = 0; i < n; i++) {
                const color = colores[i] || defaultZonaColors[i] || '#22C55E';
                zonasHtml += `<div class="cx-zona-color-row">
                    <span class="cx-paso-badge cx-zona-color-badge" style="background:${escapar(color)}">Color ${i + 1}</span>
                    ${fieldInput(`colores_zonas.${i}`, 'Color', color, 'color')}
                </div>`;
            }
            extra = fieldImagePreview('juego_imagen', 'Imagen en blanco y negro', d.juego_imagen)
                + fieldSelect('juego_piezas', 'Colores en la paleta', d.juego_piezas || '4 piezas (fácil)', [
                    { value: '', label: 'Seleccione…' },
                    '4 piezas (fácil)', '6 piezas (medio)', '9 piezas (difícil)',
                ])
                + `<div class="cx-field"><label>Paleta de colores</label>
                    <div class="cx-help">El niño pinta con el dedo sobre la imagen. Tú revisas el dibujo después (no hay corrección automática por zonas).</div>
                    <div class="cx-zonas-colores">${zonasHtml}</div>
                </div>`;
        }
        if (id === 'memoria') {
            extra = '<div class="cx-help mb-2">Hasta 6 pares. Mínimo 2 para marcar completo.</div>'
                + [1, 2, 3, 4, 5, 6].map((i) =>
                    fieldImagePreview(`imagen_${i}`, `Par ${i}`, d[`imagen_${i}`])
                ).join('');
        }
        if (id === 'secuencia') {
            extra = '<div class="cx-help mb-2">Sube 3 o 4 imágenes <strong>en el orden correcto</strong>. El niño las verá mezcladas y deberá ordenarlas arrastrando.</div>'
                + [1, 2, 3, 4].map((i) =>
                    fieldImagePreview(`seq_${i}`, `Paso ${i}${i <= 3 ? '' : ' (opcional)'}`, d[`seq_${i}`])
                ).join('');
        }
        return fieldInstruccionesAudio()
            + fieldJuegoPicker('juego_id', 'Juego', d)
            + fieldInput('juego_nombre', 'Nombre del juego', d.juego_nombre)
            + extra;
    }

    function formDibujo(d) {
        return fieldInstruccionesAudio()
            + fieldImagePreview('fondo', 'Imagen de fondo (opcional)', d.fondo)
            + `<div class="cx-help mb-2">El niño elige colores y herramientas libremente (pincel, goma, figuras, grosor y deshacer).</div>`
            + fieldCheckbox('guardar_evidencia', 'Guardar dibujo como evidencia', !!d.guardar_evidencia)
            + fieldInput('nota_evidencia', 'Nota de evidencia', d.nota_evidencia);
    }

    function formPregunta(d) {
        const ops = Array.isArray(d.opciones) ? d.opciones : [];
        const tipo = d.tipo_opts || 'emoji_texto';
        const showEmoji = tipo === 'emoji_texto';
        const showImagen = tipo === 'imagen_texto';
        let opcionesHtml = '';
        ops.forEach((op, i) => {
            const mediaYTexto = showImagen
                ? `<div class="cx-item-row cx-item-row--pair">
                    <div class="cx-item-media">
                        ${fieldImagePreview(`opciones.${i}.imagen`, 'Imagen', op.imagen, { compact: true })}
                    </div>
                    <div class="cx-item-fields">
                        ${fieldInput(`opciones.${i}.texto`, 'Texto', op.texto)}
                    </div>
                   </div>`
                : `${fieldInput(`opciones.${i}.texto`, 'Texto', op.texto)}
                   ${showEmoji ? fieldInput(`opciones.${i}.emoji`, 'Emoji', op.emoji) : ''}`;
            opcionesHtml += `<div class="cx-subcard" data-opcion="${i}">
                <div class="cx-subcard-head">
                    <span>Opción ${i + 1}</span>
                    <label class="mb-0"><input type="radio" name="cx_correcta_pregunta" class="cx-correcta" data-index="${i}"
                        ${op.correcta ? 'checked' : ''} ${puedeEditar ? '' : 'disabled'}> Correcta</label>
                </div>
                ${mediaYTexto}
            </div>`;
        });
        opcionesHtml += `<div class="cx-inline-actions">
            ${puedeEditar ? '<button type="button" class="btn btn-sm btn-outline-primary cx-add-opcion" data-max="4">+ Opción</button>' : ''}
            ${puedeEditar && ops.length > 2 ? '<button type="button" class="btn btn-sm btn-outline-danger cx-rm-opcion">Quitar última</button>' : ''}
        </div>`;

        return configTabs([
            {
                id: 'pregunta',
                label: 'Pregunta',
                icon: 'fa-circle-question',
                content: fieldInstruccionesAudio()
                    + fieldTextarea('texto', 'Texto de la pregunta', d.texto)
                    + fieldImagePreview('imagen', 'Imagen de la pregunta (opcional)', d.imagen)
                    + fieldSelect('tipo_opts', 'Tipo de opciones', tipo, [
                        { value: 'emoji_texto', label: 'Emoji + texto' },
                        { value: 'imagen_texto', label: 'Imagen + texto' },
                        { value: 'solo_texto', label: 'Solo texto' },
                    ]),
            },
            {
                id: 'opciones',
                label: 'Opciones',
                icon: 'fa-list-ul',
                content: opcionesHtml,
            },
            {
                id: 'retro',
                label: 'Retroalimentación',
                icon: 'fa-comment-dots',
                content: fieldInput('fb_ok', 'Mensaje al acertar', d.fb_ok)
                    + fieldInput('fb_err', 'Mensaje al fallar', d.fb_err)
                    + fieldSelect('intentos', 'Intentos', d.intentos || '2', ['1', '2', '3', 'Sin límite'])
                    + fieldSelect('al_agotar', 'Al agotar intentos', d.al_agotar || 'Mostrar respuesta correcta', [
                        'Mostrar respuesta correcta', 'Continuar sin mostrar', 'Repetir desde el inicio',
                    ]),
            },
        ]);
    }

    function formEmparejar(d) {
        const pares = Array.isArray(d.pares) ? d.pares : [];
        const modo = d.modo || 'texto';
        let paresHtml = '';
        pares.forEach((par, i) => {
            let cuerpo = '';
            if (modo === 'imagen') {
                cuerpo = `<div class="cx-item-row cx-item-row--pair">
                    <div class="cx-item-media">
                        ${fieldImagePreview(`pares.${i}.izqImg`, 'Izquierda', par.izqImg, { compact: true })}
                    </div>
                    <div class="cx-item-media">
                        ${fieldImagePreview(`pares.${i}.derImg`, 'Derecha', par.derImg, { compact: true })}
                    </div>
                </div>`;
            } else if (modo === 'imagen_texto') {
                cuerpo = `<div class="cx-item-row cx-item-row--pair">
                    <div class="cx-item-media">
                        ${fieldImagePreview(`pares.${i}.izqImg`, 'Imagen', par.izqImg, { compact: true })}
                    </div>
                    <div class="cx-item-fields">
                        ${fieldInput(`pares.${i}.der`, 'Texto derecha', par.der)}
                    </div>
                </div>`;
            } else {
                cuerpo = fieldInput(`pares.${i}.izq`, 'Texto izquierda', par.izq)
                    + fieldInput(`pares.${i}.der`, 'Texto derecha', par.der);
            }
            paresHtml += `<div class="cx-subcard" data-par="${i}">
                <div class="cx-subcard-head">Par ${i + 1}</div>
                ${cuerpo}
            </div>`;
        });
        paresHtml += `<div class="cx-inline-actions">
            ${puedeEditar ? '<button type="button" class="btn btn-sm btn-outline-primary cx-add-par">+ Par</button>' : ''}
            ${puedeEditar && pares.length > 2 ? '<button type="button" class="btn btn-sm btn-outline-danger cx-rm-par">Quitar último</button>' : ''}
        </div>`;

        return configTabs([
            {
                id: 'actividad',
                label: 'Actividad',
                icon: 'fa-sliders',
                content: fieldInstruccionesAudio()
                    + fieldSelect('modo', 'Modo de emparejamiento', modo, [
                        { value: 'texto', label: 'Texto ↔ texto' },
                        { value: 'imagen_texto', label: 'Imagen ↔ texto' },
                        { value: 'imagen', label: 'Imagen ↔ imagen' },
                    ]),
            },
            {
                id: 'pares',
                label: 'Pares',
                icon: 'fa-link',
                content: paresHtml,
            },
            {
                id: 'retro',
                label: 'Retroalimentación',
                icon: 'fa-comment-dots',
                content: fieldInput('fb_ok', 'Mensaje al acertar', d.fb_ok)
                    + fieldInput('fb_err', 'Mensaje al fallar', d.fb_err)
                    + fieldSelect('intentos', 'Intentos por par', d.intentos || 'Sin límite', ['1', '2', '3', 'Sin límite']),
            },
        ]);
    }

    function esCategoriaPlaceholderClasificacion(nombre) {
        return /^Cat\s*\d+$/i.test(String(nombre || '').trim());
    }

    function categoriasClasificacion(d) {
        const raw = Array.isArray(d?.categorias) ? d.categorias : [];
        return raw
            .map((c) => String(c || '').trim())
            .filter((c) => c !== '' && !esCategoriaPlaceholderClasificacion(c));
    }

    function categoriaItemClasificacion(valor, cats) {
        const cat = String(valor || '').trim();
        if (!cat || esCategoriaPlaceholderClasificacion(cat)) return '';
        return cats.includes(cat) ? cat : '';
    }

    function formClasificacion(d) {
        const cats = categoriasClasificacion(d);
        const items = Array.isArray(d.items) ? d.items : [];
        const catOpts = cats.length
            ? cats
            : [{ value: '', label: 'Crea categorías en la pestaña Categorías' }];

        const chipsHtml = cats.map((c, i) => `
            <span class="cx-cat-chip" data-cat-index="${i}" ${puedeEditar ? 'role="button" tabindex="0" title="Editar categoría"' : ''}>
                <span class="cx-cat-chip-label">${escapar(c)}</span>
                ${puedeEditar
                ? `<button type="button" class="cx-cat-chip-rm" data-index="${i}" title="Quitar categoría" aria-label="Quitar">
                        <i class="fa-solid fa-xmark"></i>
                    </button>`
                : ''}
            </span>`).join('');

        const categoriasHtml = `
            <div class="cx-field">
                <label>Grupos / categorías</label>
                <div class="cx-cat-chips" id="cxCatChips">${chipsHtml || '<span class="cx-help">Aún no hay categorías. Usa el campo de abajo para crearlas.</span>'}</div>
                <div class="cx-help">Crea al menos 2 categorías (ej.: Frutas, Verduras). Cada una será un grupo destino en la actividad.</div>
            </div>
            ${puedeEditar ? `
            <div class="cx-cat-add">
                <input type="text" class="form-control form-control-sm" id="cxCatNueva"
                    placeholder="Nombre de la categoría" maxlength="60">
                <button type="button" class="btn btn-sm btn-outline-primary" id="cxCatAdd">
                    <i class="fa-solid fa-plus"></i> Agregar
                </button>
            </div>` : ''}`;

        let itemsHtml = '';
        items.forEach((item, i) => {
            itemsHtml += `
            <div class="cx-item-row" data-item="${i}">
                <div class="cx-item-media">
                    ${fieldImagePreview(`items.${i}.imagen`, 'Imagen', item.imagen, { compact: true })}
                </div>
                <div class="cx-item-fields">
                    ${fieldInput(`items.${i}.texto`, 'Texto (o imagen)', item.texto)}
                    ${fieldSelect(
                `items.${i}.categoria`,
                'Categoría destino',
                categoriaItemClasificacion(item.categoria, cats),
                catOpts
            )}
                </div>
                ${puedeEditar && items.length > 2
                    ? `<button type="button" class="btn btn-sm btn-outline-danger cx-rm-item-at" data-index="${i}" title="Quitar">
                        <i class="fa-solid fa-trash"></i>
                       </button>`
                    : ''}
            </div>`;
        });
        itemsHtml += `<div class="cx-inline-actions">
            ${puedeEditar ? '<button type="button" class="btn btn-sm btn-outline-primary cx-add-item">+ Elemento</button>' : ''}
        </div>
        <div class="cx-help">Mínimo 2. Completo con imagen o texto (no hace falta ambos).</div>`;

        return configTabs([
            {
                id: 'actividad',
                label: 'Actividad',
                icon: 'fa-sliders',
                content: fieldInstruccionesAudio(),
            },
            {
                id: 'categorias',
                label: 'Categorías',
                icon: 'fa-folder',
                content: categoriasHtml,
            },
            {
                id: 'elementos',
                label: 'Elementos',
                icon: 'fa-cubes',
                content: itemsHtml,
            },
        ]);
    }

    function formArrastrar(d) {
        const zonas = Array.isArray(d.zonas) ? d.zonas : [];
        const items = Array.isArray(d.items) ? d.items : [];
        let zonasHtml = '';
        zonas.forEach((z, i) => {
            zonasHtml += `<div class="cx-subcard" data-zona="${i}">
                <div class="cx-subcard-head">Zona ${i + 1}</div>
                ${fieldInput(`zonas.${i}.nombre`, 'Nombre', z.nombre)}
                ${fieldInput(`zonas.${i}.color`, 'Color HEX', z.color || '#0F6E56', 'color')}
            </div>`;
        });
        zonasHtml += `<div class="cx-inline-actions">
            ${puedeEditar ? '<button type="button" class="btn btn-sm btn-outline-primary cx-add-zona">+ Zona</button>' : ''}
            ${puedeEditar && zonas.length > 2 ? '<button type="button" class="btn btn-sm btn-outline-danger cx-rm-zona">Quitar última zona</button>' : ''}
        </div>`;

        const nombres = zonas.map((z) => z.nombre).filter(Boolean);
        const zonaOpts = nombres.length ? nombres : ['Zona 1', 'Zona 2'];
        let itemsHtml = '';
        items.forEach((item, i) => {
            itemsHtml += `
            <div class="cx-item-row" data-item="${i}">
                <div class="cx-item-media">
                    ${fieldImagePreview(`items.${i}.imagen`, 'Imagen', item.imagen, { compact: true })}
                </div>
                <div class="cx-item-fields">
                    ${fieldInput(`items.${i}.texto`, 'Texto (o imagen)', item.texto)}
                    ${fieldSelect(`items.${i}.zona`, 'Zona destino', item.zona, zonaOpts)}
                </div>
                ${puedeEditar && items.length > 2
                    ? `<button type="button" class="btn btn-sm btn-outline-danger cx-rm-item-arr-at" data-index="${i}" title="Quitar">
                        <i class="fa-solid fa-trash"></i>
                       </button>`
                    : ''}
            </div>`;
        });
        itemsHtml += `<div class="cx-inline-actions">
            ${puedeEditar ? '<button type="button" class="btn btn-sm btn-outline-primary cx-add-item-arr">+ Elemento</button>' : ''}
        </div>
        <div class="cx-help">Mínimo 2. Completo con imagen o texto (no hace falta ambos).</div>`;

        return configTabs([
            {
                id: 'actividad',
                label: 'Actividad',
                icon: 'fa-sliders',
                content: fieldInstruccionesAudio(),
            },
            {
                id: 'zonas',
                label: 'Zonas',
                icon: 'fa-map-location-dot',
                content: zonasHtml,
            },
            {
                id: 'elementos',
                label: 'Elementos',
                icon: 'fa-cubes',
                content: itemsHtml,
            },
        ]);
    }

    function formReto(d) {
        const pasos = Array.isArray(d.pasos) ? d.pasos : [];
        const badgeColors = ['#2563eb', '#0f6e56', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
        let pasosHtml = '';
        pasos.forEach((paso, i) => {
            const color = badgeColors[i % badgeColors.length];
            pasosHtml += `<div class="cx-subcard cx-paso-card" data-paso="${i}" style="--cx-paso-color:${color}">
                <div class="cx-subcard-head">
                    <span class="cx-paso-badge" style="background:${color}">Paso ${i + 1}</span>
                </div>
                ${fieldTextarea(`pasos.${i}.pregunta`, 'Pregunta', paso.pregunta)}
                <div class="cx-paso-opciones">`;
            const ops = Array.isArray(paso.opciones) ? paso.opciones : [];
            ops.forEach((op, j) => {
                pasosHtml += `<div class="cx-paso-opcion" data-opcion="${j}">
                    <div class="cx-paso-opcion-head">
                        <span>Opción ${j + 1}</span>
                        <label class="mb-0"><input type="radio" name="cx_correcta_paso_${i}" class="cx-correcta-paso"
                            data-paso="${i}" data-index="${j}" ${op.correcta ? 'checked' : ''} ${puedeEditar ? '' : 'disabled'}> Correcta</label>
                    </div>
                    <div class="cx-paso-opcion-body">
                        <div class="cx-item-media">
                            ${fieldImagePreview(`pasos.${i}.opciones.${j}.imagen`, 'Imagen', op.imagen, { compact: true })}
                        </div>
                        <div class="cx-paso-opcion-fields">
                            ${fieldInput(`pasos.${i}.opciones.${j}.emoji`, 'Emoji', op.emoji)}
                            ${fieldInput(`pasos.${i}.opciones.${j}.label`, 'Etiqueta', op.label)}
                        </div>
                    </div>
                </div>`;
            });
            pasosHtml += '</div></div>';
        });
        pasosHtml += `<div class="cx-inline-actions">
            ${puedeEditar ? '<button type="button" class="btn btn-sm btn-outline-primary cx-add-paso">+ Paso</button>' : ''}
            ${puedeEditar && pasos.length > 2 ? '<button type="button" class="btn btn-sm btn-outline-danger cx-rm-paso">Quitar último paso</button>' : ''}
        </div>`;

        return configTabs([
            {
                id: 'reto',
                label: 'Reto',
                icon: 'fa-flag',
                content: fieldInstruccionesAudio()
                    + fieldInput('descripcion', 'Nombre del reto', d.descripcion),
            },
            {
                id: 'pasos',
                label: 'Pasos',
                icon: 'fa-stairs',
                content: pasosHtml,
            },
            {
                id: 'retro',
                label: 'Retroalimentación',
                icon: 'fa-comment-dots',
                content: fieldInput('fb_ok', 'Mensaje al acertar', d.fb_ok)
                    + fieldInput('fb_err', 'Mensaje al fallar', d.fb_err)
                    + fieldSelect('intentos', 'Intentos por paso', d.intentos || '2', ['1', '2', '3', 'Sin límite'])
                    + fieldSelect('al_agotar', 'Al agotar intentos', d.al_agotar || 'Mostrar respuesta correcta', [
                        'Mostrar respuesta correcta',
                        'Continuar sin mostrar',
                        'Repetir desde el inicio',
                    ]),
            },
        ]);
    }

    function formEmocion(d) {
        return fieldInstruccionesAudio()
            + fieldSelect('cantidad', 'Cantidad de emociones', d.cantidad || '6', [
                { value: '4', label: '4 (feliz, emocionado, tranquilo, confundido)' },
                { value: '6', label: '6 (+ cansado, nervioso)' },
            ])
            + '<p class="text-muted small mt-2 mb-0">En la experiencia cada niño verá ilustraciones y textos de niño o niña según su sexo registrado. La previsualización del constructor usa la forma masculina.</p>';
    }

    function formRecompensa(d) {
        const tipo = d.tipo || 'Trofeo';
        return fieldInstruccionesAudio()
            + fieldSelect('tipo', 'Tipo de recompensa', tipo, [
                'Trofeo', 'Medalla', 'Estrella dorada', 'Insignia especial',
            ])
            + (tipo === 'Insignia especial'
                ? fieldImagePreview('insignia', 'Imagen de insignia', d.insignia)
                : '');
    }

    function htmlFormulario(bloque) {
        const d = bloque.datos || {};
        switch (bloque.tipo) {
            case 'bienvenida': return formBienvenida(d);
            case 'audio': return formAudio(d);
            case 'video': return formVideo(d);
            case 'imagen': return formImagen(d);
            case 'historia': return formHistoria(d);
            case 'ra': return formRa(d);
            case 'evidencia': return formEvidencia(d);
            case 'juego': return formJuego(d);
            case 'dibujo': return formDibujo(d);
            case 'pregunta': return formPregunta(d);
            case 'emparejar': return formEmparejar(d);
            case 'clasificacion': return formClasificacion(d);
            case 'arrastrar': return formArrastrar(d);
            case 'reto': return formReto(d);
            case 'emocion': return formEmocion(d);
            case 'recompensa': return formRecompensa(d);
            default: return '<p class="text-muted">Tipo sin formulario.</p>';
        }
    }

    function htmlBannerPendientes(bloque) {
        const pendientes = Array.isArray(bloque.pendientes) ? bloque.pendientes : [];
        if (bloque.completo) {
            return `<div class="cx-pendientes-banner cx-pendientes-banner--ok" data-cx-pendientes-banner>
                <i class="fa-solid fa-circle-check"></i> Bloque completo
               </div>`;
        }
        if (pendientes.length) {
            return `<div class="cx-pendientes-banner cx-pendientes-banner--warn" data-cx-pendientes-banner>
                    <strong>Campos pendientes</strong>
                    <ul class="cx-pendientes-items">${pendientes.map((p) => `<li>${escapar(p)}</li>`).join('')}</ul>
                   </div>`;
        }
        return `<div class="cx-pendientes-banner cx-pendientes-banner--warn" data-cx-pendientes-banner>
                    <i class="fa-solid fa-triangle-exclamation"></i> Campos pendientes
                   </div>`;
    }

    function actualizarBannerPendientes(bloque) {
        if (!bloque || Number(seleccionadoId) !== Number(bloque.id)) return;
        const html = htmlBannerPendientes(bloque);
        const $banner = $configBody.children('[data-cx-pendientes-banner]').first();
        if ($banner.length) {
            $banner.replaceWith(html);
        } else {
            $configBody.prepend(html);
        }
    }

    function renderConfig(bloque) {
        destroySortableInstrucciones();
        detenerMediosConfig();
        const tabPrev = tabActivaId();
        $configHead.html(`
            <div class="cx-config-head-icon"><i class="fa-solid ${escapar(bloque.icono || 'fa-cube')}"></i></div>
            <div>
                <p class="cx-config-head-meta">Bloque ${escapar(bloque.orden)} en la secuencia</p>
                <h3>${escapar(bloque.nombre)}</h3>
                <p>${escapar(bloque.categoria_label || '')}${bloque.obligatorio ? ' · Obligatorio' : ''}</p>
            </div>
        `);
        $configBody.html(htmlBannerPendientes(bloque) + htmlFormulario(bloque));
        restaurarTab(tabPrev);
        initSortableInstrucciones();
        $saveStatus.prop('hidden', true).removeClass('is-saving is-ok is-err');
        requestAnimationFrame(sincronizarLateralesDesdeSecuencia);
    }

    function setDeep(obj, path, value) {
        const parts = path.split('.');
        let cur = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i];
            const next = parts[i + 1];
            const idx = Number(p);
            if (!Number.isNaN(idx) && Array.isArray(cur)) {
                if (!cur[idx]) cur[idx] = Number.isNaN(Number(next)) ? {} : [];
                cur = cur[idx];
            } else {
                if (cur[p] == null) cur[p] = Number.isNaN(Number(next)) ? {} : [];
                cur = cur[p];
            }
        }
        const last = parts[parts.length - 1];
        const lastIdx = Number(last);
        if (!Number.isNaN(lastIdx) && Array.isArray(cur)) cur[lastIdx] = value;
        else cur[last] = value;
    }

    function leerDatosDesdeForm(bloque) {
        const datos = JSON.parse(JSON.stringify(bloque.datos || {}));

        $configBody.find('.cx-input').each(function () {
            const $el = $(this);
            const field = $el.data('field');
            if (!field) return;
            let val = $el.val();
            if (field === 'juego_id' && val === '') val = null;
            if (field === 'juego_catalogo_id' && val === '') val = null;
            if (field.includes('.')) setDeep(datos, field, val);
            else datos[field] = val;
        });

        $configBody.find('.cx-check').each(function () {
            const field = $(this).data('field');
            if (field) datos[field] = $(this).is(':checked');
        });

        if (bloque.tipo === 'pregunta' && Array.isArray(datos.opciones)) {
            const idx = Number($configBody.find('.cx-correcta:checked').data('index'));
            datos.opciones = datos.opciones.map((op, i) => ({ ...op, correcta: i === idx }));
        }

        if (bloque.tipo === 'reto' && Array.isArray(datos.pasos)) {
            datos.pasos = datos.pasos.map((paso, i) => {
                const idx = Number($configBody.find(`.cx-correcta-paso[data-paso="${i}"]:checked`).data('index'));
                const ops = (paso.opciones || []).map((op, j) => ({ ...op, correcta: j === idx }));
                return { ...paso, opciones: ops };
            });
        }

        if (bloque.tipo === 'juego') {
            const mapNombres = {
                rompecabezas: 'Rompecabezas',
                memoria: 'Memoria',
                colorear: 'Colorear',
                secuencia: 'Secuencia',
            };
            if (datos.juego_id && !datos.juego_nombre) {
                datos.juego_nombre = mapNombres[datos.juego_id] || '';
            }
        }

        if (bloque.tipo === 'clasificacion') {
            datos.categorias = categoriasClasificacion(datos);
            if (Array.isArray(datos.items)) {
                datos.items = datos.items.map((it) => ({
                    ...it,
                    categoria: categoriaItemClasificacion(it.categoria, datos.categorias),
                }));
            }
        }

        const lineas = leerInstruccionesDesdeForm();
        datos.instruccion = lineas.map((l) => String(l.texto || '').trim()).filter(Boolean).join(' ');

        return datos;
    }

    function scheduleSave() {
        if (!puedeEditar || !seleccionadoId) return;
        clearTimeout(saveTimer);
        $saveStatus.prop('hidden', false).removeClass('is-ok is-err').addClass('is-saving').text('Guardando…');
        saveTimer = setTimeout(guardarBloqueActual, 450);
    }

    function guardarBloqueActual(reRenderForm) {
        const bloque = bloquePorId(seleccionadoId);
        if (!bloque || !puedeEditar) return;
        const datos = leerDatosDesdeForm(bloque);
        const instruccionesAudio = leerInstruccionesDesdeForm();
        saving = true;
        const url = tpl(urls.actualizarTpl, { __BLOQUE__: bloque.id });
        api(url, 'PUT', { datos, instrucciones_audio: instruccionesAudio })
            .done((res) => {
                const actualizado = res?.data;
                if (actualizado) {
                    bloques = bloques.map((b) => (Number(b.id) === Number(actualizado.id) ? actualizado : b));
                    if (reRenderForm) {
                        renderSecuencia();
                        renderConfig(actualizado);
                    } else {
                        actualizarEstadoTrasGuardar(actualizado);
                    }
                }
                $saveStatus.removeClass('is-saving is-err').addClass('is-ok').text('Guardado');
            })
            .fail((xhr) => {
                $saveStatus.removeClass('is-saving is-ok').addClass('is-err').text(errorAjax(xhr, 'Error al guardar'));
                toast('error', errorAjax(xhr, 'No se pudo guardar el bloque.'));
            })
            .always(() => { saving = false; });
    }

    function mutarDatosLocales(mutator, andSave) {
        const bloque = bloquePorId(seleccionadoId);
        if (!bloque) return;
        const datos = leerDatosDesdeForm(bloque);
        const instrucciones = leerInstruccionesDesdeForm();
        mutator(datos);
        bloque.datos = datos;
        bloque.instrucciones_audio = instrucciones;
        renderConfig(bloque);
        if (andSave !== false) scheduleSave();
    }

    function mutarInstruccionesLocales(mutator) {
        const bloque = bloquePorId(seleccionadoId);
        if (!bloque) return;
        const datos = leerDatosDesdeForm(bloque);
        const instrucciones = leerInstruccionesDesdeForm();
        mutator(instrucciones);
        bloque.datos = datos;
        bloque.instrucciones_audio = instrucciones.map((l, i) => ({
            texto: String(l.texto || ''),
            personaje: l.personaje === 'zeus' ? 'zeus' : 'zoe',
            orden: i + 1,
        }));
        renderConfig(bloque);
        scheduleSave();
    }

    /* ── Acciones ───────────────────────────────────────────── */

    function agregarTipo(tipo) {
        if (!puedeEditar) return;
        api(urls.guardar, 'POST', { tipo })
            .done((res) => {
                bloques = res?.bloques || bloques;
                if (res?.data) seleccionadoId = res.data.id;
                renderSecuencia();
                if (seleccionadoId) seleccionarBloque(seleccionadoId, true);
                toast('success', res?.message || 'Bloque agregado.');
            })
            .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo agregar el bloque.')));
    }

    function eliminarBloque(id) {
        if (!puedeEditar) return;
        const bloque = bloquePorId(id);
        if (!bloque?.puede_eliminar) return;
        const go = () => {
            const url = tpl(urls.eliminarTpl, { __BLOQUE__: id });
            api(url, 'DELETE')
                .done((res) => {
                    bloques = res?.bloques || [];
                    if (Number(seleccionadoId) === Number(id)) {
                        seleccionadoId = bloques[0]?.id || null;
                    }
                    renderSecuencia();
                    if (seleccionadoId) seleccionarBloque(seleccionadoId, false);
                    else {
                        $configPanel.prop('hidden', true);
                        $configEmpty.prop('hidden', false);
                    }
                    toast('success', res?.message || 'Bloque eliminado.');
                })
                .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo eliminar.')));
        };
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: '¿Eliminar bloque?',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
            }).then((r) => { if (r.isConfirmed) go(); });
        } else if (window.confirm('¿Eliminar bloque?')) go();
    }

    function limpiarSecuencia() {
        if (!puedeEditar) return;
        const go = () => {
            api(urls.limpiar, 'POST')
                .done((res) => {
                    bloques = res?.data?.bloques || [];
                    seleccionadoId = bloques[0]?.id || null;
                    renderSecuencia();
                    if (seleccionadoId) seleccionarBloque(seleccionadoId, false);
                    toast('success', res?.message || 'Secuencia reiniciada.');
                })
                .fail((xhr) => toast('error', errorAjax(xhr, 'No se pudo limpiar.')));
        };
        if (window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: '¿Limpiar secuencia?',
                text: 'Se eliminarán todos los bloques y se recrearán Bienvenida y Recompensa.',
                showCancelButton: true,
                confirmButtonText: 'Limpiar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#DC2626',
            }).then((r) => { if (r.isConfirmed) go(); });
        } else if (window.confirm('¿Limpiar secuencia?')) go();
    }

    function publicar() {
        if (!puedePublicar) return;
        api(urls.publicar, 'POST')
            .done((res) => {
                toast('success', res?.message || 'Experiencia publicada.');
                $app.attr('data-experiencia-estado', res?.data?.estado || 'activa');
            })
            .fail((xhr) => {
                const msg = xhr?.responseJSON?.message
                    || (xhr?.responseJSON?.data?.pendientes
                        ? `${xhr.responseJSON.data.pendientes} bloque(s) con campos pendientes.`
                        : null)
                    || errorAjax(xhr, 'No se pudo publicar.');
                toast('error', msg);
                renderSecuencia();
            });
    }

    function uploadArchivo(input) {
        const file = input.files && input.files[0];
        const target = $(input).data('target');
        if (!file || !target || !urls.upload) return;
        const fd = new FormData();
        fd.append('archivo', file);
        fd.append('_token', csrf);
        $saveStatus.prop('hidden', false).addClass('is-saving').text('Subiendo archivo…');
        $.ajax({
            url: urls.upload,
            method: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
        }).done((res) => {
            const nombre = res?.data?.archivo || '';
            $configBody.find(`.cx-input[data-field="${target}"]`).val(nombre);
            $(input).closest('.cx-upload-row').find('.cx-file-name').text(nombre || 'Sin archivo');
            const $audioRow = $(input).closest('.cx-audio-preview-row');
            if ($audioRow.length) {
                const url = mediaUrlBloque(nombre);
                $audioRow.find('.cx-file-name').text(nombre || 'Sin archivo');
                let $audio = $audioRow.find('.cx-audio-el');
                const $btn = $audioRow.find('.cx-audio-play-btn');
                if (url) {
                    if (!$audio.length) {
                        $btn.after(`<audio class="cx-audio-el" preload="metadata" hidden></audio>`);
                        $audio = $audioRow.find('.cx-audio-el');
                    }
                    $audio.attr('src', url);
                    $btn.prop('disabled', false);
                    $btn.find('i').removeClass('fa-volume-high fa-pause').addClass('fa-play');
                } else {
                    $audio.remove();
                    $btn.prop('disabled', true);
                    $btn.find('i').removeClass('fa-play fa-pause').addClass('fa-volume-high');
                }
            }
            const $videoRow = $(input).closest('.cx-video-preview-row');
            if ($videoRow.length) {
                const url = mediaUrlBloque(nombre);
                $videoRow.find('.cx-file-name').text(nombre || 'Sin archivo');
                $videoRow.find('.cx-video-preview-frame')
                    .removeClass('is-playing')
                    .html(videoPreviewFrameHtml(url));
            }
            const $imgBtn = $(input).closest('.cx-img-btn');
            if ($imgBtn.length) {
                $imgBtn.find('img, i.fa-image').remove();
                const url = mediaUrlBloque(nombre);
                if (url) {
                    $imgBtn.prepend(`<img src="${escapar(url)}" alt="">`);
                } else {
                    $imgBtn.prepend('<i class="fa-solid fa-image"></i>');
                }
                $imgBtn.closest('.cx-field, .cx-media-preview-row, .cx-item-row')
                    .find('.cx-file-name').first().text(nombre || 'Sin archivo');
            }
            scheduleSave();
        }).fail((xhr) => {
            toast('error', errorAjax(xhr, 'No se pudo subir el archivo.'));
            $saveStatus.removeClass('is-saving').addClass('is-err').text('Error al subir');
        });
    }

    /* ── Eventos ────────────────────────────────────────────── */

    $catalogo.on('click', '.cx-cat-item', function () {
        if ($(this).is(':disabled') || String($(this).data('obligatorio')) === '1') return;
        agregarTipo($(this).data('tipo'));
    });

    $timeline.on('click', '.cx-block-card', function (e) {
        if ($(e.target).closest('.cx-block-actions').length) return;
        seleccionarBloque($(this).data('id'), false);
    });

    $timeline.on('click', '.cx-btn-config', function (e) {
        e.stopPropagation();
        seleccionarBloque($(this).data('id'), true);
    });

    $timeline.on('click', '.cx-btn-eliminar', function (e) {
        e.stopPropagation();
        eliminarBloque($(this).data('id'));
    });

    $configBody.on('click', '.cx-juego-card:not(:disabled)', function () {
        const id = $(this).data('juego-id');
        const nombre = $(this).data('juego-nombre') || '';
        $configBody.find('.cx-juego-card').removeClass('is-selected').attr('aria-pressed', 'false');
        $(this).addClass('is-selected').attr('aria-pressed', 'true');
        $configBody.find('.cx-input[data-field="juego_id"]').val(id).trigger('change');
        $configBody.find('.cx-input[data-field="juego_catalogo_id"]').val('');
        if (nombre) {
            $configBody.find('.cx-input[data-field="juego_nombre"]').val(nombre);
        }
    });

    const $modalJuegosModulo = $('#cxModalJuegosModulo');
    const $juegosModuloLista = $('#cxJuegosModuloLista');
    const $juegosModuloLoading = $('#cxJuegosModuloLoading');
    const $juegosModuloError = $('#cxJuegosModuloError');
    const $juegosModuloPaginacion = $('#cxJuegosModuloPaginacion');
    const $juegosModuloResumen = $('#cxJuegosModuloResumen');
    let juegosCatalogoPagina = 1;

    function modalJuegosModulo() {
        if (!$modalJuegosModulo.length) return null;
        return bootstrap.Modal.getOrCreateInstance($modalJuegosModulo[0]);
    }

    function urlJuegosCatalogoConFiltros(pagina) {
        const form = document.getElementById('formFiltrosJuegosConstructor');
        if (!form || !urlJuegosCatalogo) return '';
        const params = window.JuegosFiltrosUi
            ? window.JuegosFiltrosUi.paramsDesdeForm(form)
            : new URLSearchParams(new FormData(form));
        params.set('json', '1');
        params.set('per_page', '12');
        if (pagina) params.set('page', String(pagina));
        return `${urlJuegosCatalogo}?${params.toString()}`;
    }

    function renderPaginacionJuegos(pagination) {
        if (!$juegosModuloPaginacion.length || !pagination) return;
        if (pagination.last_page <= 1) {
            $juegosModuloPaginacion.prop('hidden', true).empty();
            return;
        }
        const prev = pagination.current_page > 1 ? pagination.current_page - 1 : null;
        const next = pagination.current_page < pagination.last_page ? pagination.current_page + 1 : null;
        let html = '<div class="paginacion-controles">';
        if (prev) {
            html += `<button type="button" class="pag-btn" data-juego-page="${prev}">&#8592; Anterior</button>`;
        }
        html += `<span class="pag-btn pag-btn-activo">${pagination.current_page} / ${pagination.last_page}</span>`;
        if (next) {
            html += `<button type="button" class="pag-btn" data-juego-page="${next}">Siguiente &#8594;</button>`;
        }
        html += '</div>';
        $juegosModuloPaginacion.html(html).prop('hidden', false);
    }

    function actualizarResumenModalJuegos(estadisticas, pagination) {
        if (!$juegosModuloResumen.length) return;
        if (!estadisticas || !pagination || pagination.total === 0) {
            $juegosModuloResumen.prop('hidden', true).empty();
            return;
        }
        const paginaTxt = pagination.last_page > 1
            ? `Página ${pagination.current_page} de ${pagination.last_page}`
            : 'Resultados del filtro';
        $juegosModuloResumen.html(`
            <div class="stats-grid cx-juegos-stats-grid">
                <div class="stat-card">
                    <div class="stat-icon stat-icon--blue"><i class="fa-solid fa-gamepad"></i></div>
                    <div class="stat-body">
                        <h3>${pagination.total}</h3>
                        <p>Juegos encontrados</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon--green"><i class="fa-solid fa-circle-check"></i></div>
                    <div class="stat-body">
                        <h3>${estadisticas.activos ?? pagination.total}</h3>
                        <p>Activos en catálogo</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon--yellow"><i class="fa-solid fa-cube"></i></div>
                    <div class="stat-body">
                        <h3>${estadisticas.modulos ?? 0}</h3>
                        <p>Módulos representados</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon stat-icon--blue"><i class="fa-solid fa-layer-group"></i></div>
                    <div class="stat-body">
                        <h3>${pagination.per_page}</h3>
                        <p>${escapar(paginaTxt)}</p>
                    </div>
                </div>
            </div>
        `).prop('hidden', false);
    }

    function actualizarSubtituloModalJuegos(pagination) {
        const $sub = $('#cxModalJuegosModuloSubtitle');
        if (!$sub.length) return;
        if (!pagination || pagination.total === 0) {
            $sub.text('No hay juegos que coincidan con los filtros.');
            return;
        }
        const etiqueta = pagination.total === 1 ? 'juego disponible' : 'juegos disponibles';
        $sub.text(`${pagination.total} ${etiqueta}`);
    }

    function renderJuegosCatalogoModal(juegos, selectedCatalogoId) {
        if (!juegos.length) {
            $juegosModuloLista.html(`
                <div class="students-empty students-empty--filters cx-juegos-empty">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <h3>Sin resultados</h3>
                    <p>No hay juegos que coincidan con los filtros aplicados.</p>
                </div>
            `);
            return;
        }
        $juegosModuloLista.html(juegos.map((j) => juegoCatalogoCardHtml(j, selectedCatalogoId)).join(''));
    }

    async function cargarJuegosCatalogo(pagina) {
        const bloque = bloquePorId(seleccionadoId);
        if (!bloque || bloque.tipo !== 'juego') return;
        const url = urlJuegosCatalogoConFiltros(pagina || 1);
        if (!url) return;

        $juegosModuloError.prop('hidden', true).text('');
        $juegosModuloLista.prop('hidden', true).attr('aria-busy', 'true');
        $juegosModuloLoading.prop('hidden', false);

        try {
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'No se pudieron cargar los juegos.');
            }
            const juegos = json.data?.juegos || [];
            juegosCatalogoPagina = json.data?.pagination?.current_page || 1;
            renderJuegosCatalogoModal(juegos, bloque.datos?.juego_catalogo_id || '');
            renderPaginacionJuegos(json.data?.pagination);
            actualizarResumenModalJuegos(json.data?.estadisticas, json.data?.pagination);
            actualizarSubtituloModalJuegos(json.data?.pagination);
            $juegosModuloLista[0]?.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            $juegosModuloError.text(err.message || 'Error al cargar juegos.').prop('hidden', false);
            $juegosModuloLista.empty();
            $juegosModuloPaginacion.prop('hidden', true).empty();
            $juegosModuloResumen.prop('hidden', true).empty();
            $('#cxModalJuegosModuloSubtitle').text('Error al cargar el catálogo');
        } finally {
            $juegosModuloLoading.prop('hidden', true);
            $juegosModuloLista.prop('hidden', false).attr('aria-busy', 'false');
        }
    }

    function abrirModalJuegosModulo() {
        const bloque = bloquePorId(seleccionadoId);
        if (!urlJuegosCatalogo || !bloque || bloque.tipo !== 'juego') return;

        $juegosModuloError.prop('hidden', true).text('');
        $juegosModuloLista.empty().prop('hidden', true);
        $juegosModuloPaginacion.prop('hidden', true).empty();
        $juegosModuloResumen.prop('hidden', true).empty();
        $juegosModuloLoading.prop('hidden', false);
        $('#cxModalJuegosModuloSubtitle').text('Filtra y elige un juego para el bloque');
        setFiltrosJuegosAbiertos(false);
        modalJuegosModulo()?.show();

        const form = document.getElementById('formFiltrosJuegosConstructor');
        if (form && window.JuegosFiltrosUi) {
            form.dataset.juegosFiltrosBound = '';
            window.JuegosFiltrosUi.enlazar(form, () => cargarJuegosCatalogo(1));
        }
        cargarJuegosCatalogo(1);
    }

    function aplicarJuegoCatalogo(tipo, nombre, catalogoId) {
        const bloque = bloquePorId(seleccionadoId);
        if (!bloque) return;
        const datos = leerDatosDesdeForm(bloque);
        datos.juego_id = tipo;
        datos.juego_nombre = nombre || datos.juego_nombre || '';
        datos.juego_catalogo_id = catalogoId || null;
        bloque.datos = datos;
        renderConfig(bloque);
        scheduleSave();
        modalJuegosModulo()?.hide();
    }

    function setFiltrosJuegosAbiertos(abierto) {
        const $panel = $('#cxJuegosFiltrosPanel');
        const $btn = $('#cxBtnToggleFiltrosJuegos');
        $panel.toggleClass('is-open', !!abierto);
        $btn.attr('aria-expanded', abierto ? 'true' : 'false');
        $btn.find('.cx-juegos-filtros-toggle-label').text(abierto ? 'Ocultar filtros' : 'Más filtros');
        $btn.find('i').toggleClass('fa-sliders', !abierto).toggleClass('fa-chevron-up', !!abierto);
    }

    $('#cxBtnToggleFiltrosJuegos').on('click', function () {
        setFiltrosJuegosAbiertos(!$('#cxJuegosFiltrosPanel').hasClass('is-open'));
    });

    $configBody.on('click', '#cxBtnJuegosModulo', function (e) {
        e.preventDefault();
        abrirModalJuegosModulo();
    });

    $juegosModuloPaginacion.on('click', '[data-juego-page]', function () {
        const pagina = Number($(this).data('juego-page'));
        if (pagina > 0) cargarJuegosCatalogo(pagina);
    });

    $juegosModuloLista.on('click', '.cx-juego-catalogo-card:not(:disabled)', function () {
        const tipo = $(this).attr('data-juego-id');
        const catalogoId = $(this).attr('data-juego-catalogo-id') || null;
        const nombre = $(this).attr('data-juego-nombre') || '';
        aplicarJuegoCatalogo(tipo, nombre, catalogoId);
    });

    $configBody.on('input change', '.cx-input, .cx-check, .cx-correcta, .cx-correcta-paso, .cx-audio-linea-texto', function () {
        const field = $(this).data('field');
        if (typeof field === 'string' && field.indexOf('colores_zonas.') === 0) {
            $(this).closest('.cx-zona-color-row').find('.cx-zona-color-badge').css('background', $(this).val());
        }
        if (field === 'paginas' || field === 'juego_id' || field === 'juego_piezas' || field === 'modo' || field === 'tipo' || field === 'tipo_opts' || field === 'tipo_media') {
            const bloque = bloquePorId(seleccionadoId);
            if (!bloque) return;
            const datos = leerDatosDesdeForm(bloque);
            if (field === 'tipo_media') {
                if (datos.tipo_media === 'imagen') datos.video = '';
                else if (datos.tipo_media === 'video') datos.imagen = '';
                else {
                    datos.imagen = '';
                    datos.video = '';
                }
            }
            if (field === 'paginas') {
                const n = Math.max(2, Math.min(5, Number(datos.paginas || 3)));
                datos.paginas = String(n);
                const pages = Array.isArray(datos.paginas_data) ? datos.paginas_data : [];
                while (pages.length < n) pages.push({ imagen: '', audio: '' });
                datos.paginas_data = pages.slice(0, n);
            }
            if (field === 'juego_id') {
                const mapNombres = {
                    rompecabezas: 'Rompecabezas', memoria: 'Memoria', colorear: 'Colorear', secuencia: 'Secuencia',
                };
                if (!datos.juego_nombre) {
                    datos.juego_nombre = mapNombres[datos.juego_id] || '';
                }
            }
            if (field === 'juego_piezas' && datos.juego_id === 'colorear') {
                const s = String(datos.juego_piezas || '');
                const n = s.includes('9') ? 9 : (s.includes('6') ? 6 : 4);
                const defaults = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
                const prev = Array.isArray(datos.colores_zonas) ? datos.colores_zonas : [];
                const next = [];
                for (let i = 0; i < n; i++) next.push(prev[i] || defaults[i] || '#22C55E');
                datos.colores_zonas = next;
            }
            bloque.datos = datos;
            renderConfig(bloque);
            scheduleSave();
            return;
        }
        scheduleSave();
    });

    $configBody.on('change', '.cx-file', function () {
        uploadArchivo(this);
    });

    $configBody.on('click', '.cx-audio-play-btn', function () {
        const $btn = $(this);
        if ($btn.prop('disabled')) return;
        const $row = $btn.closest('.cx-audio-preview-row');
        const audio = $row.find('.cx-audio-el')[0];
        if (!audio) return;
        $configBody.find('.cx-audio-el').each(function () {
            if (this !== audio) {
                try {
                    this.pause();
                    this.currentTime = 0;
                } catch (e) { /* noop */ }
            }
        });
        $configBody.find('.cx-video-el').each(function () {
            try {
                this.pause();
                this.currentTime = 0;
            } catch (e) { /* noop */ }
        });
        $configBody.find('.cx-video-preview-frame').removeClass('is-playing');
        $configBody.find('.cx-audio-play-btn').not($btn).each(function () {
            $(this).find('i').removeClass('fa-pause').addClass('fa-play');
        });
        $configBody.find('.cx-video-play-btn i').removeClass('fa-pause').addClass('fa-play');
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
        }
        const $icon = $btn.find('i');
        if (audio.paused) {
            audio.onended = function () {
                $icon.removeClass('fa-pause').addClass('fa-play');
            };
            const p = audio.play();
            $icon.removeClass('fa-play').addClass('fa-pause');
            if (p && typeof p.catch === 'function') {
                p.catch(() => $icon.removeClass('fa-pause').addClass('fa-play'));
            }
        } else {
            audio.pause();
            $icon.removeClass('fa-pause').addClass('fa-play');
        }
    });

    $configBody.on('click', '.cx-video-play-btn', function (e) {
        e.stopPropagation();
        const $btn = $(this);
        const $frame = $btn.closest('.cx-video-preview-frame');
        const video = $frame.find('.cx-video-el')[0];
        if (!video) return;
        $configBody.find('.cx-video-el').each(function () {
            if (this !== video) {
                try {
                    this.pause();
                    this.currentTime = 0;
                } catch (err) { /* noop */ }
            }
        });
        $configBody.find('.cx-video-preview-frame').not($frame).removeClass('is-playing');
        $configBody.find('.cx-audio-el').each(function () {
            try {
                this.pause();
                this.currentTime = 0;
            } catch (err) { /* noop */ }
        });
        $configBody.find('.cx-audio-play-btn i').removeClass('fa-pause').addClass('fa-play');
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (err) { /* noop */ }
        }
        video.onended = function () {
            $frame.removeClass('is-playing');
        };
        $frame.addClass('is-playing');
        const p = video.play();
        if (p && typeof p.catch === 'function') {
            p.catch(() => $frame.removeClass('is-playing'));
        }
    });

    $configBody.on('click', '.cx-video-preview-frame.is-playing .cx-video-el', function () {
        const $frame = $(this).closest('.cx-video-preview-frame');
        try {
            this.pause();
        } catch (err) { /* noop */ }
        $frame.removeClass('is-playing');
    });

    $configBody.on('click', '[data-cx-tts-preview]', function () {
        detenerMediosConfig();
        const lineas = leerInstruccionesDesdeForm()
            .map((l) => ({ texto: String(l.texto || '').trim(), personaje: l.personaje }))
            .filter((l) => l.texto);
        if (!lineas.length) {
            toast('info', 'Escribe al menos una instrucción para escucharla.');
            return;
        }
        reproducirSecuenciaConstructor(lineas, 0);
    });
    $configBody.on('click', '.cx-audio-linea-pj', function () {
        if (!puedeEditar) return;
        const $btn = $(this);
        $btn.closest('.cx-audio-pj').find('.cx-audio-linea-pj').removeClass('is-on');
        $btn.addClass('is-on');
        scheduleSave();
    });
    $configBody.on('click', '.cx-audio-linea-add', function () {
        mutarInstruccionesLocales((list) => {
            if (list.length >= 8) return;
            const ultimo = list[list.length - 1];
            const siguiente = ultimo && ultimo.personaje === 'zeus' ? 'zoe' : 'zeus';
            list.push({ texto: '', personaje: siguiente });
        });
    });
    $configBody.on('click', '.cx-audio-linea-rm', function () {
        const idx = $(this).closest('.cx-audio-linea').index();
        mutarInstruccionesLocales((list) => {
            if (list.length <= 1) return;
            if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
            list.splice(idx, 1);
        });
    });

    $configBody.on('click', '.cx-add-opcion', function () {
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.opciones)) d.opciones = [];
            if (d.opciones.length >= 4) return;
            d.opciones.push({ texto: '', emoji: '', imagen: '', correcta: false });
        });
    });
    $configBody.on('click', '.cx-rm-opcion', function () {
        mutarDatosLocales((d) => {
            if (Array.isArray(d.opciones) && d.opciones.length > 2) d.opciones.pop();
        });
    });
    $configBody.on('click', '.cx-add-par', function () {
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.pares)) d.pares = [];
            d.pares.push({ izq: '', izqImg: '', der: '', derImg: '' });
        });
    });
    $configBody.on('click', '.cx-rm-par', function () {
        mutarDatosLocales((d) => {
            if (Array.isArray(d.pares) && d.pares.length > 2) d.pares.pop();
        });
    });
    $configBody.on('click', '.cx-add-item', function () {
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.items)) d.items = [];
            const cats = Array.isArray(d.categorias)
                ? d.categorias.map((c) => String(c || '').trim()).filter(Boolean)
                : [];
            d.items.push({ texto: '', imagen: '', categoria: cats[0] || '' });
        });
    });
    $configBody.on('click', '.cx-rm-item', function () {
        mutarDatosLocales((d) => {
            if (Array.isArray(d.items) && d.items.length > 2) d.items.pop();
        });
    });
    $configBody.on('click', '.cx-rm-item-at', function () {
        const idx = Number($(this).data('index'));
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.items) || d.items.length <= 2) return;
            if (Number.isNaN(idx) || idx < 0 || idx >= d.items.length) return;
            d.items.splice(idx, 1);
        });
    });
    function indiceEdicionCategoria() {
        const raw = $('#cxCatNueva').attr('data-edit-index');
        if (raw === undefined || raw === '') return null;
        const idx = Number(raw);
        return Number.isInteger(idx) && idx >= 0 ? idx : null;
    }

    function activarEdicionCategoria(idx, nombre) {
        $('#cxCatNueva').val(nombre).attr('data-edit-index', String(idx)).trigger('focus');
        $('#cxCatAdd').html('<i class="fa-solid fa-check"></i> Guardar');
        $configBody.find('.cx-cat-chip').removeClass('is-editing');
        $configBody.find(`.cx-cat-chip[data-cat-index="${idx}"]`).addClass('is-editing');
    }

    $configBody.on('click', '#cxCatAdd', function () {
        const nombre = String($('#cxCatNueva').val() || '').trim();
        if (!nombre) {
            toast('warning', 'Escribe el nombre de la categoría.');
            return;
        }
        const bloque = bloquePorId(seleccionadoId);
        if (!bloque) return;
        const cats = Array.isArray(bloque.datos?.categorias) ? bloque.datos.categorias : [];
        const editIdx = indiceEdicionCategoria();
        const duplicada = cats.some((c, i) => i !== editIdx && String(c).toLowerCase() === nombre.toLowerCase());
        if (duplicada) {
            toast('warning', 'Esa categoría ya existe.');
            return;
        }
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.categorias)) d.categorias = [];
            if (editIdx !== null && editIdx >= 0 && editIdx < d.categorias.length) {
                const viejo = d.categorias[editIdx];
                d.categorias[editIdx] = nombre;
                if (Array.isArray(d.items)) {
                    d.items = d.items.map((it) => ({
                        ...it,
                        categoria: it.categoria === viejo ? nombre : it.categoria,
                    }));
                }
                return;
            }
            d.categorias.push(nombre);
        });
    });
    $configBody.on('keydown', '#cxCatNueva', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#cxCatAdd').trigger('click');
        }
        if (e.key === 'Escape' && indiceEdicionCategoria() !== null) {
            e.preventDefault();
            $('#cxCatNueva').val('').removeAttr('data-edit-index');
            $('#cxCatAdd').html('<i class="fa-solid fa-plus"></i> Agregar');
            $configBody.find('.cx-cat-chip').removeClass('is-editing');
        }
    });
    $configBody.on('click', '.cx-cat-chip', function (e) {
        if (!puedeEditar) return;
        if ($(e.target).closest('.cx-cat-chip-rm').length) return;
        const idx = Number($(this).data('cat-index'));
        const bloque = bloquePorId(seleccionadoId);
        if (!bloque) return;
        const cats = categoriasClasificacion(bloque.datos);
        if (Number.isNaN(idx) || idx < 0 || idx >= cats.length) return;
        activarEdicionCategoria(idx, cats[idx] || '');
    });
    $configBody.on('keydown', '.cx-cat-chip', function (e) {
        if (!puedeEditar) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if ($(e.target).closest('.cx-cat-chip-rm').length) return;
        e.preventDefault();
        $(this).trigger('click');
    });
    $configBody.on('click', '.cx-cat-chip-rm', function (e) {
        e.stopPropagation();
        const idx = Number($(this).data('index'));
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.categorias)) return;
            if (Number.isNaN(idx) || idx < 0 || idx >= d.categorias.length) return;
            const removida = d.categorias[idx];
            d.categorias.splice(idx, 1);
            const fallback = d.categorias[0] || '';
            if (Array.isArray(d.items)) {
                d.items = d.items.map((it) => ({
                    ...it,
                    categoria: it.categoria === removida ? fallback : it.categoria,
                }));
            }
        });
    });
    $configBody.on('click', '.cx-add-zona', function () {
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.zonas)) d.zonas = [];
            d.zonas.push({ nombre: `Zona ${d.zonas.length + 1}`, color: '#0F6E56' });
        });
    });
    $configBody.on('click', '.cx-rm-zona', function () {
        mutarDatosLocales((d) => {
            if (Array.isArray(d.zonas) && d.zonas.length > 2) d.zonas.pop();
        });
    });
    $configBody.on('click', '.cx-add-item-arr', function () {
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.items)) d.items = [];
            const zona = (d.zonas && d.zonas[0] && d.zonas[0].nombre) || 'Zona 1';
            d.items.push({ texto: '', imagen: '', zona });
        });
    });
    $configBody.on('click', '.cx-rm-item-arr', function () {
        mutarDatosLocales((d) => {
            if (Array.isArray(d.items) && d.items.length > 2) d.items.pop();
        });
    });
    $configBody.on('click', '.cx-rm-item-arr-at', function () {
        const idx = Number($(this).data('index'));
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.items) || d.items.length <= 2) return;
            if (Number.isNaN(idx) || idx < 0 || idx >= d.items.length) return;
            d.items.splice(idx, 1);
        });
    });
    $configBody.on('click', '.cx-add-paso', function () {
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.pasos)) d.pasos = [];
            d.pasos.push({
                pregunta: '',
                opciones: [
                    { emoji: '', label: '', imagen: '', correcta: true },
                    { emoji: '', label: '', imagen: '', correcta: false },
                    { emoji: '', label: '', imagen: '', correcta: false },
                    { emoji: '', label: '', imagen: '', correcta: false },
                ],
            });
        });
    });
    $configBody.on('click', '.cx-rm-paso', function () {
        mutarDatosLocales((d) => {
            if (Array.isArray(d.pasos) && d.pasos.length > 2) d.pasos.pop();
        });
    });

    $('#cxBtnLimpiar').on('click', limpiarSecuencia);
    $('.cx-btn-publicar').on('click', publicar);

    /* ── API pública (Vista Niño y otros) ─────────────────────── */
    window.CxConstructor = {
        getBloques() {
            return bloques.map((b) => ({ ...b, datos: { ...(b.datos || {}) } }));
        },
        getMeta() {
            return {
                experienciaId: $app.data('experiencia-id'),
                nombre: $app.data('experiencia-nombre') || 'Experiencia',
                mediaBase: $app.data('media-base') || '',
            };
        },
    };

    /* ── Init ───────────────────────────────────────────────── */

    bloques = parseJsonScript('cx-bloques-iniciales', []);
    catalogo = parseJsonScript('cx-catalogo-inicial', []);
    renderCatalogo();
    renderSecuencia();
    if (bloques.length) seleccionarBloque(bloques[0].id, false);
})(jQuery);
