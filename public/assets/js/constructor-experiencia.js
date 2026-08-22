/**
 * constructor-experiencia.js — Constructor de bloques (SuperAdmin / Admin / Panel)
 */
(function ($) {
    'use strict';

    const $app = $('.cx-app').first();
    if (!$app.length) return;

    const puedeEditar = String($app.data('puede-editar')) === '1';
    const puedePublicar = String($app.data('puede-publicar')) === '1';
    const csrf = $('meta[name="csrf-token"]').attr('content');

    const urls = {
        listar: $app.data('url-listar') || '',
        guardar: $app.data('url-guardar') || '',
        reordenar: $app.data('url-reordenar') || '',
        limpiar: $app.data('url-limpiar') || '',
        upload: $app.data('url-upload') || '',
        publicar: $app.data('url-publicar') || '',
        actualizarTpl: $app.data('url-actualizar-template') || '',
        eliminarTpl: $app.data('url-eliminar-template') || '',
    };

    let bloques = [];
    let catalogo = [];
    let seleccionadoId = null;
    let sortable = null;
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
        const status = bloque.completo
            ? '<span class="cx-block-status"><span class="cx-dot is-ok"></span> Completo</span>'
            : '<span class="cx-block-status"><span class="cx-dot"></span> Campos pendientes</span>';

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

    function fieldTextarea(name, label, value, help) {
        return `
            <div class="cx-field">
                <label>${escapar(label)}</label>
                <textarea class="form-control cx-input" data-field="${escapar(name)}" rows="3"
                    ${puedeEditar ? '' : 'readonly'}>${escapar(value || '')}</textarea>
                ${help ? `<div class="cx-help">${escapar(help)}</div>` : ''}
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

    /** Thumb clicable con preview (mismo patrón que Elementos en Clasificación). */
    function imageThumbBtn(name, value, title) {
        const archivo = value || '';
        const url = mediaUrlBloque(archivo);
        const thumb = url
            ? `<img src="${escapar(url)}" alt="">`
            : '<i class="fa-solid fa-image"></i>';
        return `
            <input type="hidden" class="cx-input" data-field="${escapar(name)}" value="${escapar(archivo)}">
            ${puedeEditar
                ? `<label class="cx-img-btn cx-image-preview-btn" title="${escapar(title || 'Subir imagen')}">
                    ${thumb}
                    <input type="file" class="cx-file" data-target="${escapar(name)}" accept="image/*" hidden>
                   </label>`
                : `<span class="cx-img-btn cx-image-preview-btn is-readonly">${thumb}</span>`}`;
    }

    function fieldImagePreview(name, label, value) {
        const archivo = value || '';
        return `<div class="cx-field">
            <label>${escapar(label)}</label>
            <div class="cx-media-preview-row">
                ${imageThumbBtn(name, archivo, 'Subir imagen')}
                <div class="cx-media-preview-meta">
                    <span class="cx-file-name">${escapar(archivo || 'Sin archivo')}</span>
                    <div class="cx-help">Toca el recuadro para elegir o cambiar la imagen.</div>
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

    function formBienvenida(d) {
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion,
            'Este texto se leerá en audio. Usa frases cortas y amigables.')
            + fieldSelect('personaje', 'Personaje narrador', d.personaje || 'personaje', [
                { value: 'personaje', label: 'Personaje del ambiente' },
                { value: 'ninguno', label: 'Ninguno' },
            ])
            + fieldTextarea('descripcion_accesible', 'Descripción accesible', d.descripcion_accesible);
    }

    function formAudio(d) {
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
            + fieldUpload('archivo', 'Archivo de audio (.mp3)', d.archivo, 'audio/mpeg,.mp3')
            + fieldSelect('repeticiones', 'Repeticiones', d.repeticiones || '1 vez', ['1 vez', '2 veces', '3 veces', 'Sin límite'])
            + fieldTextarea('descripcion_accesible', 'Descripción accesible', d.descripcion_accesible);
    }

    function formVideo(d) {
        const archivo = d.archivo || '';
        const url = mediaUrlBloque(archivo);
        const thumb = url
            ? `<video src="${escapar(url)}" muted preload="metadata" playsinline></video>`
            : '<i class="fa-solid fa-film"></i>';
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
            + `<div class="cx-field">
                <label>Archivo de video (.mp4)</label>
                <div class="cx-media-preview-row">
                    <input type="hidden" class="cx-input" data-field="archivo" value="${escapar(archivo)}">
                    ${puedeEditar
                        ? `<label class="cx-img-btn cx-video-preview-btn" title="Subir video">
                            ${thumb}
                            <input type="file" class="cx-file" data-target="archivo" accept="video/mp4,.mp4" hidden>
                           </label>`
                        : `<span class="cx-img-btn cx-video-preview-btn is-readonly">${thumb}</span>`}
                    <div class="cx-media-preview-meta">
                        <span class="cx-file-name">${escapar(archivo || 'Sin archivo')}</span>
                        <div class="cx-help">Toca el recuadro para elegir o cambiar el video. Se muestra una vista previa del primer fotograma.</div>
                    </div>
                </div>
            </div>`
            + fieldTextarea('descripcion_accesible', 'Descripción accesible', d.descripcion_accesible);
    }

    function formImagen(d) {
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
            + fieldImagePreview('archivo', 'Archivo de imagen', d.archivo)
            + fieldTextarea('descripcion', 'Descripción accesible', d.descripcion);
    }

    function formHistoria(d) {
        const n = Number(d.paginas || 3);
        const pages = Array.isArray(d.paginas_data) ? d.paginas_data : [];
        const badgeColors = ['#2563eb', '#0f6e56', '#d97706', '#7c3aed', '#dc2626'];
        let html = fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
            + fieldSelect('paginas', 'Número de páginas', String(n), ['2', '3', '4', '5']);
        for (let i = 0; i < n; i++) {
            const p = pages[i] || { imagen: '', audio: '' };
            const color = badgeColors[i % badgeColors.length];
            html += `<div class="cx-subcard cx-paso-card" data-pagina="${i}" style="--cx-paso-color:${color}">
                <div class="cx-subcard-head">
                    <span class="cx-paso-badge" style="background:${color}">Página ${i + 1}</span>
                </div>
                ${fieldImagePreview(`paginas_data.${i}.imagen`, 'Imagen', p.imagen)}
                ${fieldUpload(`paginas_data.${i}.audio`, 'Audio de la página (.mp3)', p.audio, 'audio/mpeg,.mp3')}
            </div>`;
        }
        return html;
    }

    function formRa(d) {
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
            + fieldInput('marcador', 'Marcador (número de cartilla)', d.marcador)
            + fieldSelect('contenido', 'Contenido RA', d.contenido || 'Animación 3D', [
                'Animación 3D', 'Audio narrado', 'Video LSC', 'Animación + narración',
            ]);
    }

    function formEvidencia(d) {
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
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
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
            + fieldSelect('juego_id', 'Juego', id, [
                { value: '', label: 'Seleccione…' },
                { value: 'rompecabezas', label: 'Rompecabezas' },
                { value: 'memoria', label: 'Memoria' },
                { value: 'colorear', label: 'Colorear' },
                { value: 'secuencia', label: 'Secuencia' },
            ])
            + fieldInput('juego_nombre', 'Nombre del juego', d.juego_nombre)
            + extra;
    }

    function formDibujo(d) {
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
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
            opcionesHtml += `<div class="cx-subcard" data-opcion="${i}">
                <div class="cx-subcard-head">
                    <span>Opción ${i + 1}</span>
                    <label class="mb-0"><input type="radio" name="cx_correcta_pregunta" class="cx-correcta" data-index="${i}"
                        ${op.correcta ? 'checked' : ''} ${puedeEditar ? '' : 'disabled'}> Correcta</label>
                </div>
                ${fieldInput(`opciones.${i}.texto`, 'Texto', op.texto)}
                ${showEmoji ? fieldInput(`opciones.${i}.emoji`, 'Emoji', op.emoji) : ''}
                ${showImagen ? fieldImagePreview(`opciones.${i}.imagen`, 'Imagen', op.imagen) : ''}
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
                content: fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
                    + fieldTextarea('texto', 'Texto de la pregunta', d.texto)
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
            paresHtml += `<div class="cx-subcard" data-par="${i}">
                <div class="cx-subcard-head">Par ${i + 1}</div>
                ${modo === 'imagen' || modo === 'imagen_texto' ? fieldImagePreview(`pares.${i}.izqImg`, 'Imagen izquierda', par.izqImg) : ''}
                ${modo !== 'imagen' ? fieldInput(`pares.${i}.izq`, 'Texto izquierda', par.izq) : ''}
                ${modo === 'imagen' ? fieldImagePreview(`pares.${i}.derImg`, 'Imagen derecha', par.derImg) : fieldInput(`pares.${i}.der`, 'Texto derecha', par.der)}
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
                content: fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
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

    function formClasificacion(d) {
        const cats = Array.isArray(d.categorias) ? d.categorias.filter((c) => String(c || '').trim() !== '') : [];
        const items = Array.isArray(d.items) ? d.items : [];
        const catOpts = cats.length ? cats : ['Cat 1', 'Cat 2'];

        const chipsHtml = cats.map((c, i) => `
            <span class="cx-cat-chip" data-cat-index="${i}">
                <span class="cx-cat-chip-label">${escapar(c)}</span>
                ${puedeEditar && cats.length > 2
                    ? `<button type="button" class="cx-cat-chip-rm" data-index="${i}" title="Quitar categoría" aria-label="Quitar">
                        <i class="fa-solid fa-xmark"></i>
                    </button>`
                    : ''}
            </span>`).join('');

        const categoriasHtml = `
            <div class="cx-field">
                <label>Grupos / categorías</label>
                <div class="cx-cat-chips" id="cxCatChips">${chipsHtml || '<span class="cx-help">Sin categorías aún</span>'}</div>
                <div class="cx-help">Mínimo 2. Cada chip es un grupo donde el niño clasificará.</div>
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
                <div class="cx-item-img">
                    ${imageThumbBtn(`items.${i}.imagen`, item.imagen, 'Imagen opcional')}
                </div>
                <div class="cx-item-texto">
                    ${fieldInput(`items.${i}.texto`, 'Texto (o imagen)', item.texto)}
                </div>
                <div class="cx-item-cat">
                    ${fieldSelect(`items.${i}.categoria`, 'Categoría destino', item.categoria, catOpts)}
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
                content: fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion),
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
                <div class="cx-item-img">
                    ${imageThumbBtn(`items.${i}.imagen`, item.imagen, 'Imagen opcional')}
                </div>
                <div class="cx-item-texto">
                    ${fieldInput(`items.${i}.texto`, 'Texto (o imagen)', item.texto)}
                </div>
                <div class="cx-item-cat">
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
                content: fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion),
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
                        <div class="cx-item-img">
                            ${imageThumbBtn(`pasos.${i}.opciones.${j}.imagen`, op.imagen, 'Imagen opcional')}
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
                content: fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
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
                    + fieldSelect('intentos', 'Intentos por paso', d.intentos || '2', ['1', '2', '3', 'Sin límite']),
            },
        ]);
    }

    function formEmocion(d) {
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion)
            + fieldSelect('cantidad', 'Cantidad de emociones', d.cantidad || '6', [
                { value: '4', label: '4 (feliz, emocionado, tranquilo, confundido)' },
                { value: '6', label: '6 (+ cansado, nervioso)' },
            ]);
    }

    function formRecompensa(d) {
        const tipo = d.tipo || 'Trofeo';
        return fieldTextarea('instruccion', 'Instrucción de audio para el niño', d.instruccion,
            'Este texto se leerá en audio. Usa frases cortas y amigables para niños de 4 años.')
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

    function renderConfig(bloque) {
        const tabPrev = tabActivaId();
        $configHead.html(`
            <div class="cx-config-head-icon"><i class="fa-solid ${escapar(bloque.icono || 'fa-cube')}"></i></div>
            <div>
                <p class="cx-config-head-meta">Bloque ${escapar(bloque.orden)} en la secuencia</p>
                <h3>${escapar(bloque.nombre)}</h3>
                <p>${escapar(bloque.categoria_label || '')}${bloque.obligatorio ? ' · Obligatorio' : ''}</p>
            </div>
        `);
        $configBody.html(htmlFormulario(bloque));
        restaurarTab(tabPrev);
        $saveStatus.prop('hidden', true).removeClass('is-saving is-ok is-err');
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
        saving = true;
        const url = tpl(urls.actualizarTpl, { __BLOQUE__: bloque.id });
        api(url, 'PUT', { datos })
            .done((res) => {
                const actualizado = res?.data;
                if (actualizado) {
                    bloques = bloques.map((b) => (Number(b.id) === Number(actualizado.id) ? actualizado : b));
                    renderSecuencia();
                    if (reRenderForm) renderConfig(actualizado);
                    else {
                        $timeline.find(`.cx-block-card[data-id="${actualizado.id}"]`).addClass('is-selected');
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
        mutator(datos);
        bloque.datos = datos;
        renderConfig(bloque);
        if (andSave !== false) scheduleSave();
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
            const $imgBtn = $(input).closest('.cx-img-btn');
            if ($imgBtn.length) {
                $imgBtn.find('img, video, i.fa-image, i.fa-film').remove();
                const url = mediaUrlBloque(nombre);
                if (url && $imgBtn.hasClass('cx-video-preview-btn')) {
                    $imgBtn.prepend(`<video src="${escapar(url)}" muted preload="metadata" playsinline></video>`);
                } else if (url) {
                    $imgBtn.prepend(`<img src="${escapar(url)}" alt="">`);
                } else if ($imgBtn.hasClass('cx-video-preview-btn')) {
                    $imgBtn.prepend('<i class="fa-solid fa-film"></i>');
                } else {
                    $imgBtn.prepend('<i class="fa-solid fa-image"></i>');
                }
                $imgBtn.closest('.cx-media-preview-row').find('.cx-file-name').text(nombre || 'Sin archivo');
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

    $configBody.on('input change', '.cx-input, .cx-check, .cx-correcta, .cx-correcta-paso', function () {
        const field = $(this).data('field');
        if (typeof field === 'string' && field.indexOf('colores_zonas.') === 0) {
            $(this).closest('.cx-zona-color-row').find('.cx-zona-color-badge').css('background', $(this).val());
        }
        if (field === 'paginas' || field === 'juego_id' || field === 'juego_piezas' || field === 'modo' || field === 'tipo' || field === 'tipo_opts') {
            const bloque = bloquePorId(seleccionadoId);
            if (!bloque) return;
            const datos = leerDatosDesdeForm(bloque);
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
                datos.juego_nombre = mapNombres[datos.juego_id] || '';
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
            const cat = (d.categorias && d.categorias[0]) || 'Cat 1';
            d.items.push({ texto: '', imagen: '', categoria: cat });
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
    $configBody.on('click', '#cxCatAdd', function () {
        const nombre = String($('#cxCatNueva').val() || '').trim();
        if (!nombre) {
            toast('warning', 'Escribe el nombre de la categoría.');
            return;
        }
        const bloque = bloquePorId(seleccionadoId);
        if (!bloque) return;
        const cats = Array.isArray(bloque.datos?.categorias) ? bloque.datos.categorias : [];
        if (cats.some((c) => String(c).toLowerCase() === nombre.toLowerCase())) {
            toast('warning', 'Esa categoría ya existe.');
            return;
        }
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.categorias)) d.categorias = [];
            d.categorias.push(nombre);
        });
    });
    $configBody.on('keydown', '#cxCatNueva', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#cxCatAdd').trigger('click');
        }
    });
    $configBody.on('click', '.cx-cat-chip-rm', function () {
        const idx = Number($(this).data('index'));
        mutarDatosLocales((d) => {
            if (!Array.isArray(d.categorias) || d.categorias.length <= 2) return;
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
