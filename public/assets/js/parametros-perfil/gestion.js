(function () {
    'use strict';

    const CFG = window.PARAMETROS_PERFIL || {};
    const URLS = CFG.urls || {};

    let catalogo = null;
    let CATS = {};
    let categoriasOrden = [];
    let perfilesFormales = [];
    let perfilesTransitorias = [];

    let fCond = null;
    let fCat = null;
    let fVals = {};
    let fBaseDisplay = {};
    let fPreset = {};
    let fOverrides = {};

    let tCond = null;
    let tCat = null;
    let tVals = {};
    let tBaseDisplay = {};
    let tOverrides = {};

    let fCatPage = 0;
    let tCatPage = 0;

    const CATS_POR_PAGINA = 8;

    const $ = (id) => document.getElementById(id);

    function csrfToken() {
        return CFG.csrf || document.querySelector('meta[name="csrf-token"]')?.content || '';
    }

    function urlWithId(template, id) {
        return String(template ?? '')
            .replace(/__ID__/g, id)
            .replace(':id', id)
            .replace('{id}', id);
    }

    async function apiFetch(url, options = {}) {
        if (!url) {
            throw new Error('URL no configurada');
        }

        const headers = {
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
            ...(options.headers || {}),
        };

        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const res = await fetch(url, { ...options, headers });
        let data = null;

        try {
            data = await res.json();
        } catch (e) {
            data = null;
        }

        if (!res.ok) {
            const msg = data?.message || data?.error || `Error ${res.status}`;
            throw new Error(msg);
        }

        return data;
    }

    function showToast(id, mensaje) {
        const el = $(id);
        if (!el) return;

        if (mensaje) {
            el.innerHTML = `<i class="fa-solid fa-check"></i> ${mensaje}`;
        }

        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 2500);
    }

    function toggleHidden(el, visible) {
        if (!el) return;
        el.classList.toggle('is-hidden', !visible);
    }

    function colorBg(hex) {
        if (!hex) return '#F3F4F6';
        return hex.length === 7 ? `${hex}22` : hex;
    }

    function mergeBasePreset(clave) {
        const base = { ...(catalogo?.base || {}) };
        const preset = catalogo?.presets?.[clave] || {};
        return { ...base, ...preset };
    }

    function clavePorPerfilId(id) {
        const mapa = catalogo?.mapa_perfiles || {};
        return mapa[id] || mapa[String(id)] || null;
    }

    function principio(clave) {
        return catalogo?.principios?.[clave] || '';
    }

    function paramDef(clave) {
        for (const cat of categoriasOrden) {
            const p = (cat.params || []).find((x) => x.k === clave);
            if (p) return p;
        }
        return null;
    }

    function allParamDefs() {
        return categoriasOrden.flatMap((c) => c.params || []);
    }

    function normalizarLista(data) {
        if (Array.isArray(data)) return data;
        if (data?.perfiles) return data.perfiles;
        if (data?.data) return data.data;
        return [];
    }

    function perfilFormalItem(p) {
        const clave = p.clave || clavePorPerfilId(p.id);
        const color = p.color || p.color_hex || '#64748B';
        return {
            id: p.id,
            clave,
            label: p.label || p.nombre,
            color,
            bg: p.bg || colorBg(color),
            students: p.students ?? p.estudiantes ?? p.estudiantes_count ?? 0,
        };
    }

    function perfilTransitoriaItem(t) {
        const color = t.color || t.color_hex || t.base_color || '#854F0B';
        return {
            id: t.id,
            nombre: t.nombre || t.etiqueta,
            base: t.base || t.base_clave || clavePorPerfilId(t.base_id || t.perfil_aprendizaje_id),
            base_id: t.base_id || t.perfil_aprendizaje_id,
            base_nombre: t.base_nombre || t.base_label || '',
            color,
            bg: t.bg || colorBg(color),
            desc: t.desc || t.descripcion_interna || t.descripcion || '',
            overrides: t.overrides || {},
            activos: t.activos ?? t.activos_count ?? 0,
            es_sistema: !!t.es_sistema,
            predefinida: t.predefinida ?? t.es_sistema ?? false,
        };
    }

    // ── Init ────────────────────────────────────────────────

    async function init() {
        if (!URLS.catalogo) {
            console.error('PARAMETROS_PERFIL.urls.catalogo no está definido');
            return;
        }

        bindEvents();
        await cargarCatalogo();
        await Promise.all([cargarFormales(), cargarTransitorias()]);

        if (categoriasOrden.length) {
            fCat = categoriasOrden[0].k;
            tCat = categoriasOrden[0].k;
        }

        renderCatCarousel('f');
        renderCatCarousel('t');
        renderFPrev();
        renderTPrev();
    }

    async function cargarCatalogo() {
        const data = await apiFetch(URLS.catalogo);
        catalogo = data?.catalogo || data;
        categoriasOrden = catalogo.categorias || [];
        CATS = {};
        categoriasOrden.forEach((c) => {
            CATS[c.k] = c.params || [];
        });
    }

    async function cargarFormales() {
        if (!URLS.perfilesFormales) return;
        const data = await apiFetch(URLS.perfilesFormales);
        perfilesFormales = normalizarLista(data).map(perfilFormalItem);
        renderListaFormales();
        $('pp-fSbTitle').textContent = `${perfilesFormales.length} perfiles de aprendizaje`;
    }

    async function cargarTransitorias() {
        if (!URLS.perfilesPersonalizados) return;
        const data = await apiFetch(URLS.perfilesPersonalizados);
        perfilesTransitorias = normalizarLista(data).map(perfilTransitoriaItem);
        renderListaTransitorias();
    }

    function bindEvents() {
        document.querySelectorAll('.pp-top-tab').forEach((tab) => {
            tab.addEventListener('click', () => setView(tab.dataset.ppView));
        });

        $('pp-fBtnGuardar')?.addEventListener('click', guardarFormal);
        $('pp-fBtnReset')?.addEventListener('click', resetFormal);
        $('pp-tBtnGuardar')?.addEventListener('click', guardarTransitoria);
        $('pp-tBtnReset')?.addEventListener('click', resetTransitoria);
        $('pp-tBtnElim')?.addEventListener('click', eliminarTransitoria);

        const root = $('ppGestion');
        root?.addEventListener('click', onRootClick);
        root?.addEventListener('change', onRootChange);
    }

    function onRootClick(e) {
        const catNav = e.target.closest('.pp-cat-nav');
        if (catNav) {
            navegarCatPagina(catNav.dataset.ctx, catNav.dataset.dir === 'next' ? 1 : -1);
            return;
        }

        const catDot = e.target.closest('.pp-cat-dot');
        if (catDot) {
            irCatPagina(catDot.dataset.ctx, parseInt(catDot.dataset.page, 10));
            return;
        }

        const catTile = e.target.closest('.pp-cat-tile');
        if (catTile) {
            if (catTile.dataset.action === 'more') {
                navegarCatPagina(catTile.dataset.ctx, 1);
                return;
            }
            setCat(catTile, catTile.dataset.cat, catTile.dataset.ctx);
            return;
        }

        const toggle = e.target.closest('.pp-toggle');
        if (toggle) {
            tv(toggle.dataset.ctx, toggle.dataset.key);
            return;
        }

        const nbtn = e.target.closest('.pp-nbtn');
        if (nbtn) {
            cn(nbtn.dataset.ctx, nbtn.dataset.key, parseInt(nbtn.dataset.step, 10));
        }
    }

    function onRootChange(e) {
        const sel = e.target.closest('.pp-sel');
        if (sel) {
            ss(sel.dataset.ctx, sel.dataset.key, sel.value);
        }
    }

    // ── Navegación ──────────────────────────────────────────

    function setView(v) {
        document.querySelectorAll('.pp-view').forEach((el) => el.classList.remove('on'));
        $('pp-view-' + v)?.classList.add('on');
        document.querySelectorAll('.pp-top-tab').forEach((el) => {
            const on = el.dataset.ppView === v;
            el.classList.toggle('on', on);
            el.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }

    function renderParamIcon(icon) {
        if (!icon) return '';

        return `<span class="pp-param-icon" aria-hidden="true"><i class="fa-solid ${escapeHtml(icon)}"></i></span>`;
    }

    function totalCatPaginas() {
        return Math.max(1, Math.ceil(categoriasOrden.length / CATS_POR_PAGINA));
    }

    function paginaDeCategoria(catKey) {
        const idx = categoriasOrden.findIndex((c) => c.k === catKey);

        return idx >= 0 ? Math.floor(idx / CATS_POR_PAGINA) : 0;
    }

    function irCatPagina(ctx, page) {
        const total = totalCatPaginas();
        const nueva = Math.max(0, Math.min(total - 1, page));

        if (ctx === 'f') {
            fCatPage = nueva;
        } else {
            tCatPage = nueva;
        }

        renderCatCarousel(ctx);
    }

    function navegarCatPagina(ctx, delta) {
        const actual = ctx === 'f' ? fCatPage : tCatPage;
        irCatPagina(ctx, actual + delta);
    }

    function renderCatTile(c, catActual, ctx) {
        const icon = c.icon ? `<i class="fa-solid ${escapeHtml(c.icon)}" aria-hidden="true"></i>` : '';
        const activa = c.k === catActual ? ' on' : '';

        return (
            `<button type="button" class="pp-cat-tile${activa}" data-cat="${c.k}" data-ctx="${ctx}" aria-pressed="${c.k === catActual ? 'true' : 'false'}">` +
            `<span class="pp-cat-tile-icon">${icon}</span>` +
            `<span class="pp-cat-tile-label">${escapeHtml(c.label)}</span>` +
            `</button>`
        );
    }

    function renderCatCarousel(ctx) {
        const track = $(ctx === 'f' ? 'pp-fCatTrack' : 'pp-tCatTrack');
        const dots = $(ctx === 'f' ? 'pp-fCatDots' : 'pp-tCatDots');
        const wrap = $(ctx === 'f' ? 'pp-fCatCarousel' : 'pp-tCatCarousel');
        if (!track || !dots || !wrap) return;

        const catActual = ctx === 'f' ? fCat : tCat;
        const page = ctx === 'f' ? fCatPage : tCatPage;
        const totalPages = totalCatPaginas();
        const inicio = page * CATS_POR_PAGINA;
        const visibles = categoriasOrden.slice(inicio, inicio + CATS_POR_PAGINA);
        const hayMas = page < totalPages - 1;

        let html = visibles.map((c) => renderCatTile(c, catActual, ctx)).join('');

        if (hayMas) {
            html +=
                `<button type="button" class="pp-cat-tile pp-cat-tile-more" data-ctx="${ctx}" data-action="more" aria-label="Ver más categorías">` +
                `<span class="pp-cat-tile-icon"><i class="fa-solid fa-ellipsis" aria-hidden="true"></i></span>` +
                `<span class="pp-cat-tile-label">Más</span>` +
                `</button>`;
        }

        track.innerHTML = html;

        dots.innerHTML = Array.from({ length: totalPages }, (_, i) =>
            `<button type="button" class="pp-cat-dot${i === page ? ' on' : ''}" data-page="${i}" data-ctx="${ctx}" aria-label="Página ${i + 1} de categorías"></button>`
        ).join('');

        wrap.querySelectorAll('.pp-cat-nav').forEach((btn) => {
            const enInicio = page <= 0;
            const enFin = page >= totalPages - 1;
            btn.disabled = btn.classList.contains('pp-cat-nav-prev') ? enInicio : enFin;
        });
    }

    function setCat(el, cat, ctx) {
        const page = paginaDeCategoria(cat);

        if (ctx === 'f') {
            fCat = cat;
            if (fCatPage !== page) {
                fCatPage = page;
                renderCatCarousel('f');
            } else {
                document.querySelectorAll('#pp-fCatTrack .pp-cat-tile').forEach((t) => {
                    const on = t.dataset.cat === cat;
                    t.classList.toggle('on', on);
                    t.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
            }
            renderFParams();
            renderFPrev();
        } else {
            tCat = cat;
            if (tCatPage !== page) {
                tCatPage = page;
                renderCatCarousel('t');
            } else {
                document.querySelectorAll('#pp-tCatTrack .pp-cat-tile').forEach((t) => {
                    const on = t.dataset.cat === cat;
                    t.classList.toggle('on', on);
                    t.setAttribute('aria-pressed', on ? 'true' : 'false');
                });
            }
            renderTParams();
            renderTPrev();
        }
    }

    // ── Listas sidebar ──────────────────────────────────────

    function renderListaFormales() {
        const el = $('pp-listFormales');
        if (!el) return;

        el.innerHTML = perfilesFormales
            .map(
                (c) => `
            <div class="pp-cond-item${fCond?.id === c.id ? ' on' : ''}" data-fid="${c.id}">
                <div class="pp-cond-dot" style="background:${c.color}"></div>
                <div style="flex:1;min-width:0">
                    <div class="pp-cond-name">${escapeHtml(c.label)}</div>
                    <div class="pp-cond-meta">${c.students} estudiantes</div>
                </div>
            </div>`
            )
            .join('');

        el.querySelectorAll('[data-fid]').forEach((item) => {
            item.addEventListener('click', () => selFormal(parseInt(item.dataset.fid, 10)));
        });
    }

    function renderListaTransitorias() {
        const el = $('pp-listTransitorias');
        if (!el) return;

        const pred = perfilesTransitorias.filter((t) => t.predefinida || t.es_sistema);
        const custom = perfilesTransitorias.filter((t) => !t.predefinida && !t.es_sistema);

        let html = '';
        if (pred.length) {
            html += '<div class="pp-sep-label">Predefinidos</div>';
            html += pred.map(renderTransItem).join('');
        }
        if (custom.length) {
            html += '<div class="pp-sep-label">Creadas por el admin</div>';
            html += custom.map(renderTransItem).join('');
        }
        if (!html) {
            html = '<div class="pp-empty" style="padding:20px 10px"><p>Sin perfiles personalizados</p></div>';
        }

        el.innerHTML = html;
        el.querySelectorAll('[data-tid]').forEach((item) => {
            item.addEventListener('click', () => selTransitoria(parseInt(item.dataset.tid, 10)));
        });
    }

    function renderTransItem(t) {
        const baseLabel = t.base_nombre || t.base || '';
        return `
            <div class="pp-cond-item${tCond?.id === t.id ? ' on' : ''}" data-tid="${t.id}">
                <div class="pp-cond-dot" style="background:${t.color}"></div>
                <div style="flex:1;min-width:0">
                    <div class="pp-cond-name">${escapeHtml(t.nombre)}</div>
                    <div class="pp-cond-meta">${t.activos} activos · base: ${escapeHtml(baseLabel)}</div>
                </div>
            </div>`;
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── Selección formal ────────────────────────────────────

    async function selFormal(id) {
        const c = perfilesFormales.find((x) => x.id === id);
        if (!c || !URLS.inclusionShow) return;

        fCond = c;
        renderListaFormales();

        try {
            const url = urlWithId(URLS.inclusionShow, id);
            const data = await apiFetch(url);
            const payload = data?.data || data;

            fVals = { ...(payload.valores || payload.valores_resueltos || {}) };
            fBaseDisplay = payload.sistema || payload.referencia_sistema || mergeBasePreset(c.clave);
            fPreset = catalogo?.presets?.[c.clave] || {};
            fOverrides = payload.overrides || {};
        } catch (err) {
            alert(err.message || 'No se pudieron cargar los parámetros');
            return;
        }

        $('pp-fTitle').textContent = c.label;
        $('pp-fSub').textContent = 'Principio: ' + (principio(c.clave) || '—');

        const badge = $('pp-fBadge');
        badge.textContent = c.students + ' est.';
        badge.style.background = c.bg;
        badge.style.color = c.color;
        toggleHidden(badge, true);

        toggleHidden($('pp-fCatCarousel'), true);
        toggleHidden($('pp-fCatDots'), true);
        toggleHidden($('pp-fBtnReset'), true);
        toggleHidden($('pp-fBtnGuardar'), true);

        fCatPage = paginaDeCategoria(fCat);
        renderCatCarousel('f');

        renderFParams();
        renderFPrev();
    }

    async function selTransitoria(id) {
        const t = perfilesTransitorias.find((x) => x.id === id);
        if (!t || !URLS.personalizadoShow) return;

        tCond = t;
        renderListaTransitorias();

        try {
            const url = urlWithId(URLS.personalizadoShow, id);
            const data = await apiFetch(url);
            const payload = data?.data || data;

            tVals = { ...(payload.valores || payload.valores_resueltos || {}) };
            tBaseDisplay = payload.referencia || payload.base || mergeBasePreset(t.base);
            tOverrides = payload.overrides || t.overrides || {};
        } catch (err) {
            alert(err.message || 'No se pudieron cargar los parámetros');
            return;
        }

        $('pp-tTitle').textContent = t.nombre;
        $('pp-tSub').textContent =
            'Base: ' + (t.base_nombre || t.base) + ' · ' + (t.desc || 'Perfil personalizado');

        const badge = $('pp-tBadge');
        badge.textContent = t.activos + ' activos';
        badge.style.background = t.bg;
        badge.style.color = t.color;
        toggleHidden(badge, true);
        toggleHidden($('pp-tBadgeTrans'), true);
        toggleHidden($('pp-tCatCarousel'), true);
        toggleHidden($('pp-tCatDots'), true);
        toggleHidden($('pp-tBtnReset'), true);
        toggleHidden($('pp-tBtnGuardar'), true);
        toggleHidden($('pp-tBtnElim'), !t.es_sistema && !t.predefinida && !!URLS.personalizadoDestroy);

        tCatPage = paginaDeCategoria(tCat);
        renderCatCarousel('t');

        renderTParams();
        renderTPrev();
    }

    // ── Render parámetros ───────────────────────────────────

    function fmtBase(p, base) {
        const v = base[p.k];
        if (typeof v === 'boolean') return v ? 'Sí' : 'No';
        if (p.unit) return v + ' ' + p.unit;
        return v;
    }

    function renderCtrl(p, v, ctx) {
        if (p.type === 'toggle') {
            return (
                `<div class="pp-toggle${v ? ' on' : ''}" data-ctx="${ctx}" data-key="${p.k}" title="${escapeHtml(p.label)}" role="switch" aria-checked="${v ? 'true' : 'false'}"></div>` +
                `<span class="pp-tlbl">${v ? 'Sí' : 'No'}</span>`
            );
        }
        if (p.type === 'num') {
            return (
                `<div class="pp-num-wrap">` +
                `<button type="button" class="pp-nbtn" data-ctx="${ctx}" data-key="${p.k}" data-step="-${p.step}">−</button>` +
                `<div class="pp-nval">${v} ${p.unit}</div>` +
                `<button type="button" class="pp-nbtn" data-ctx="${ctx}" data-key="${p.k}" data-step="${p.step}">+</button>` +
                `</div>`
            );
        }
        if (p.type === 'select') {
            const opts = (p.opts || [])
                .map((o) => `<option value="${escapeHtml(o)}"${v === o ? ' selected' : ''}>${escapeHtml(o)}</option>`)
                .join('');
            return `<select class="pp-sel" data-ctx="${ctx}" data-key="${p.k}">${opts}</select>`;
        }
        return '';
    }

    function renderParams(params, vals, baseDisplay, perfil, ctx, preset) {
        const sistemaBase = catalogo?.base || {};

        return params
            .map((p) => {
                const v = vals[p.k];
                const changedFromSistema =
                    JSON.stringify(v) !== JSON.stringify(baseDisplay[p.k] ?? sistemaBase[p.k]);
                const isPreset = preset && Object.prototype.hasOwnProperty.call(preset, p.k);
                const isOverride =
                    ctx === 't' &&
                    (Object.prototype.hasOwnProperty.call(tOverrides, p.k) ||
                        JSON.stringify(v) !== JSON.stringify(baseDisplay[p.k]));

                let tags = '';
                if (ctx === 'f' && changedFromSistema) {
                    tags += `<span class="pp-changed-tag" style="background:${perfil.bg};color:${perfil.color}">${isPreset ? 'Recomendado' : 'Modificado'}</span>`;
                }
                if (ctx === 't' && isOverride) {
                    tags += `<span class="pp-changed-tag" style="background:#FAEEDA;color:#633806">Personalizado</span>`;
                }
                if (ctx === 't' && !isOverride) {
                    tags += `<span class="pp-inherited-tag">Heredado de base</span>`;
                }

                return (
                    `<div class="pp-param-card"><div class="pp-param-row">` +
                    `<div class="pp-param-info">` +
                    `<div class="pp-param-head">` +
                    renderParamIcon(p.icon) +
                    `<div class="pp-param-copy">` +
                    `<div class="pp-param-label">${escapeHtml(p.label)} ${tags}</div>` +
                    `<div class="pp-param-desc">${escapeHtml(p.desc)}</div>` +
                    `</div></div></div>` +
                    `<div class="pp-param-ctrl"><div class="pp-param-base">Base: ${escapeHtml(String(fmtBase(p, baseDisplay)))}</div>${renderCtrl(p, v, ctx)}</div>` +
                    `</div></div>`
                );
            })
            .join('');
    }

    function renderFParams() {
        if (!fCond) return;
        const params = CATS[fCat] || [];
        $('pp-fParams').innerHTML = renderParams(params, fVals, fBaseDisplay, fCond, 'f', fPreset);
    }

    function renderTParams() {
        if (!tCond) return;
        const params = CATS[tCat] || [];
        $('pp-tParams').innerHTML = renderParams(params, tVals, tBaseDisplay, tCond, 't', null);
    }

    function labelCategoria(catKey) {
        const cat = categoriasOrden.find((c) => c.k === catKey);
        return cat?.label || '';
    }

    function renderPrevEmpty(contentId, catId, catKey) {
        const content = $(contentId);
        const catEl = $(catId);
        if (catEl) catEl.textContent = catKey ? labelCategoria(catKey) : '';
        if (content) {
            content.innerHTML =
                '<div class="pp-prev-empty"><i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i><p>Selecciona un perfil para ver la vista previa</p></div>';
        }
    }

    function renderFPrev() {
        const catEl = $('pp-fPrevCat');
        if (!fCond) {
            renderPrevEmpty('pp-fPrevContent', 'pp-fPrevCat', null);
            return;
        }
        if (catEl) catEl.textContent = labelCategoria(fCat);
        $('pp-fPrevContent').innerHTML = buildPreview(fVals, fCat);
    }

    function renderTPrev() {
        const catEl = $('pp-tPrevCat');
        if (!tCond) {
            renderPrevEmpty('pp-tPrevContent', 'pp-tPrevCat', null);
            return;
        }
        if (catEl) catEl.textContent = labelCategoria(tCat);
        $('pp-tPrevContent').innerHTML = buildPreview(tVals, tCat);
    }

    // ── Controles ───────────────────────────────────────────

    function tv(ctx, k) {
        if (ctx === 'f') {
            fVals[k] = !fVals[k];
            renderFParams();
            renderFPrev();
        } else {
            tVals[k] = !tVals[k];
            renderTParams();
            renderTPrev();
        }
    }

    function cn(ctx, k, step) {
        const p = paramDef(k);
        if (!p) return;

        if (ctx === 'f') {
            fVals[k] = Math.max(p.min, Math.min(p.max, (fVals[k] || 0) + step));
            renderFParams();
            renderFPrev();
        } else {
            tVals[k] = Math.max(p.min, Math.min(p.max, (tVals[k] || 0) + step));
            renderTParams();
            renderTPrev();
        }
    }

    function ss(ctx, k, v) {
        if (ctx === 'f') {
            fVals[k] = v;
            renderFParams();
            renderFPrev();
        } else {
            tVals[k] = v;
            renderTParams();
            renderTPrev();
        }
    }

    // ── Guardar / restablecer ───────────────────────────────

    async function guardarFormal() {
        if (!fCond || !URLS.inclusionSave) return;

        const url = urlWithId(URLS.inclusionSave, fCond.id);

        try {
            await apiFetch(url, {
                method: 'PUT',
                body: JSON.stringify({ valores: fVals }),
            });
            showToast('pp-fToast', 'Guardado');
        } catch (err) {
            alert(err.message || 'No se pudo guardar');
        }
    }

    async function resetFormal() {
        if (!fCond || !URLS.inclusionReset) return;
        if (!confirm('¿Restablecer los parámetros de "' + fCond.label + '" a los valores de referencia?')) return;

        const url = urlWithId(URLS.inclusionReset, fCond.id);

        try {
            await apiFetch(url, { method: 'DELETE' });
            await selFormal(fCond.id);
            showToast('pp-fToast', 'Restablecido');
        } catch (err) {
            alert(err.message || 'No se pudo restablecer');
        }
    }

    async function guardarTransitoria() {
        if (!tCond || !URLS.personalizadoSave) return;

        const url = urlWithId(URLS.personalizadoSave, tCond.id);

        try {
            const res = await apiFetch(url, {
                method: 'PUT',
                body: JSON.stringify({ valores: tVals }),
            });
            const payload = res?.data || res;
            if (payload?.overrides) {
                tOverrides = payload.overrides;
            }
            showToast('pp-tToast', 'Guardado');
            renderTParams();
        } catch (err) {
            alert(err.message || 'No se pudo guardar');
        }
    }

    async function resetTransitoria() {
        if (!tCond || !URLS.personalizadoReset) return;
        if (!confirm('¿Restablecer "' + tCond.nombre + '" a los valores de su condición base?')) return;

        const url = urlWithId(URLS.personalizadoReset, tCond.id);

        try {
            await apiFetch(url, { method: 'DELETE' });
            await selTransitoria(tCond.id);
            showToast('pp-tToast', 'Restablecido a base');
        } catch (err) {
            alert(err.message || 'No se pudo restablecer');
        }
    }

    async function eliminarTransitoria() {
        if (!tCond || !URLS.personalizadoDestroy) return;
        if (
            !confirm(
                '¿Eliminar el perfil "' +
                    tCond.nombre +
                    '"?\nSe eliminará la configuración — los estudiantes que lo tengan activo volverán al perfil de aprendizaje formal.'
            )
        ) {
            return;
        }

        const url = urlWithId(URLS.personalizadoDestroy, tCond.id);

        try {
            await apiFetch(url, { method: 'DELETE' });
            tCond = null;
            $('pp-tParams').innerHTML =
                '<div class="pp-empty"><i class="fa-solid fa-puzzle-piece"></i><p>Selecciona un perfil personalizado</p></div>';
            renderTPrev();
            toggleHidden($('pp-tCatCarousel'), false);
            toggleHidden($('pp-tCatDots'), false);
            ['pp-tBtnReset', 'pp-tBtnGuardar', 'pp-tBtnElim', 'pp-tBadge', 'pp-tBadgeTrans'].forEach((id) =>
                toggleHidden($(id), false)
            );
            $('pp-tTitle').textContent = 'Selecciona un perfil de aprendizaje personalizado';
            await cargarTransitorias();
        } catch (err) {
            alert(err.message || 'No se pudo eliminar');
        }
    }

    // ── Vista previa ────────────────────────────────────────

    function buildPreview(vals, cat) {
        const bs = vals.btn_size ?? 72;
        const bsp = vals.btn_spacing ?? 12;
        const fs = vals.font_size ?? 16;
        const opts = vals.opciones_max ?? 4;
        const prog = vals.progreso ?? 'barra';
        const animDec = vals.anim_decorativas !== false;
        const animSpd = vals.anim_speed ?? 100;
        const audioI = vals.audio_instruc ?? 'opcional';
        const audioF = vals.audio_fondo !== false;
        const audioB = vals.audio_btn !== false;
        const coop = !!vals.cooperativo;
        const sub = !!vals.subtitulos;
        const lf = !!vals.lectura_facil;
        const raI = vals.ra_inicio ?? 'automático';
        const raV = vals.ra_velocidad ?? 100;
        const raC = vals.ra_contenido ?? 'animación';
        const trans = vals.trans_ms ?? 300;

        const instruc = lf ? 'Toca el sonido' : 'Escucha con atención el instrumento';
        const ICONS = ['🎸', '🥁', '🪈', '🎹'];
        const COLS = ['#FAEEDA', '#EEEDFE', '#E6F1FB', '#E1F5EE'];
        const nombres = ['Guitarra', 'Tambor', 'Flauta', 'Piano'];

        let progHtml = '';
        if (prog === 'barra' || prog === 'barra prominente') {
            progHtml = `<div style="height:${prog === 'barra prominente' ? 7 : 4}px;background:rgba(0,0,0,.1);border-radius:3px;overflow:hidden"><div style="height:100%;width:40%;background:#0F6E56;border-radius:3px"></div></div>`;
        } else if (prog === 'pasos') {
            progHtml = `<div style="display:flex;gap:3px;justify-content:center">${[1, 2, 3]
                .map(
                    (_, i) =>
                        `<div style="width:${i === 1 ? 16 : 7}px;height:6px;border-radius:3px;background:${i <= 1 ? '#0F6E56' : 'rgba(0,0,0,.1)'}"></div>`
                )
                .join('')}</div><div style="font-size:9px;text-align:center;color:#6B7280;margin-top:1px">2 de 3</div>`;
        } else if (prog === 'círculos') {
            progHtml = `<div style="display:flex;gap:4px;justify-content:center">${[0, 1, 2]
                .map(
                    (i) =>
                        `<div style="width:9px;height:9px;border-radius:50%;${i < 2 ? 'background:#0F6E56' : 'border:1.5px solid rgba(0,0,0,.1)'}"></div>`
                )
                .join('')}</div>`;
        }

        const optsHtml = ICONS.slice(0, opts)
            .map((ic, i) => {
                const sz = Math.round(bs * 0.48);
                return `<div class="pp-dev-opt" style="gap:3px;padding:${Math.round(bsp / 3)}px">
      <div style="width:${sz}px;height:${sz}px;border-radius:5px;background:${COLS[i]};display:flex;align-items:center;justify-content:center;font-size:${Math.round(sz * 0.5)}px">${ic}</div>
      <div style="font-size:${Math.max(8, Math.round(fs * 0.55))}px;font-weight:500;color:#111827;padding-bottom:3px">${nombres[i]}</div>
    </div>`;
            })
            .join('');

        const coopHtml = coop
            ? `<div class="pp-dev-coop"><i class="fa-solid fa-users" style="font-size:10px"></i> Docente acompaña</div>`
            : '';

        const previews = {
            botones: `
      <div class="pp-info-chip">Botón ${bs}px · Espacio ${bsp}px</div>
      <div class="pp-dev"><div class="pp-dev-bar"><div class="pp-dev-title">¿Cuál instrumento?</div><div class="pp-dev-av">VA</div></div>
      <div class="pp-dev-body">
        <div class="pp-dev-narr" style="font-size:${Math.max(8, Math.round(fs * 0.58))}px">${instruc}</div>
        <div class="pp-dev-sec">Toca la respuesta correcta</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:${bsp}px">${optsHtml}</div>
        ${progHtml}${coopHtml}
      </div></div>`,

            navegacion: `
      <div class="pp-info-chip">Gestos: ${vals.gestos || 'toque y swipe'}${coop ? ' · Cooperativo' : ''}</div>
      <div class="pp-dev"><div class="pp-dev-bar"><div class="pp-dev-title">Los instrumentos</div><div class="pp-dev-av">VA</div></div>
      <div class="pp-dev-body">
        <div class="pp-dev-narr">${instruc}</div>
        <div style="display:flex;gap:5px;justify-content:center">
          <div style="border:1.5px solid rgba(0,0,0,.1);border-radius:5px;padding:6px 10px;font-size:9px;text-align:center">
            <i class="fa-solid fa-hand-pointer" style="font-size:14px;display:block;margin-bottom:3px;color:#0F6E56"></i>Toque
          </div>
          ${
              (vals.gestos || 'toque y swipe') === 'toque y swipe'
                  ? `<div style="border:1.5px solid rgba(0,0,0,.1);border-radius:5px;padding:6px 10px;font-size:9px;text-align:center">
                <i class="fa-solid fa-arrows-left-right" style="font-size:14px;display:block;margin-bottom:3px;color:#0F6E56"></i>Swipe</div>`
                  : `<div style="border:1.5px solid #FCA5A5;border-radius:5px;padding:6px 10px;font-size:9px;text-align:center;opacity:.5;background:#FAECE7">
                <i class="fa-solid fa-arrows-left-right" style="font-size:14px;display:block;margin-bottom:3px;color:#A32D2D"></i><span style="text-decoration:line-through">Swipe</span></div>`
          }
        </div>
        ${coopHtml}
      </div></div>`,

            contraste: buildPreviewContraste(vals),

            tipografia: `
      <div class="pp-info-chip">Fuente ${fs}pt${lf ? ' · Lectura fácil' : ''}${sub ? ' · Subtítulos' : ''}</div>
      <div class="pp-dev"><div class="pp-dev-bar"><div class="pp-dev-title">Los instrumentos</div><div class="pp-dev-av">VA</div></div>
      <div class="pp-dev-body">
        <div class="pp-dev-narr" style="font-size:${Math.max(8, Math.round(fs * 0.6))}px">${instruc}</div>
        ${sub ? `<div style="background:rgba(0,0,0,.7);color:#fff;font-size:8px;padding:2px 5px;border-radius:3px;text-align:center">— Subtítulos —</div>` : ''}
        <div style="background:#fff;border:1.5px solid rgba(0,0,0,.1);border-radius:6px;padding:7px;text-align:center">
          <div style="font-size:20px">🎸</div>
          <div style="font-size:${Math.max(8, Math.round(fs * 0.62))}px;font-weight:500;margin-top:3px">${lf ? 'Guitarra' : 'Guitarra — familia de cuerdas'}</div>
        </div>${coopHtml}
      </div></div>`,

            audio: `
      <div class="pp-info-chip">Audio: ${audioI}${!audioF ? ' · Sin fondo' : ''}${!audioB ? ' · Sin sonido btn' : ''}</div>
      <div class="pp-dev"><div class="pp-dev-bar"><div class="pp-dev-title">Escucha el sonido</div><div class="pp-dev-av">VA</div></div>
      <div class="pp-dev-body">
        <div class="pp-dev-narr">${instruc}</div>
        ${
            audioI === 'desactivado'
                ? `<div style="background:#FAECE7;border-radius:5px;padding:5px 7px;font-size:9px;color:#712B13;text-align:center">Sin audio — instrucción visual</div>`
                : `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:36px;height:36px;border-radius:50%;background:#E1F5EE;border:2px solid #0F6E56;display:flex;align-items:center;justify-content:center">
              <i class="fa-solid fa-${audioB ? 'volume-high' : 'volume-xmark'}" style="font-size:16px;color:#0F6E56"></i>
            </div>
            <div style="font-size:9px;color:#9CA3AF">${audioI === 'automático' ? 'Se reproduce solo' : audioI === 'manual' ? 'El niño toca' : 'El docente decide'}</div>
            ${audioF ? `<div style="font-size:8px;color:#9CA3AF">🎵 Música de fondo</div>` : ''}
          </div>`
        }
        ${sub ? `<div style="background:rgba(0,0,0,.7);color:#fff;font-size:8px;padding:2px 5px;border-radius:3px;text-align:center">— Subtítulos —</div>` : ''}
        ${coopHtml}
      </div></div>`,

            animaciones: `
      <div class="pp-info-chip">Animaciones ${animSpd}% · Transición ${trans}ms</div>
      <div class="pp-dev"><div class="pp-dev-bar"><div class="pp-dev-title">Expresión Artística</div><div class="pp-dev-av">VA</div></div>
      <div class="pp-dev-body">
        ${
            animDec
                ? `<div style="background:#E1F5EE;border-radius:6px;padding:6px;text-align:center;display:flex;justify-content:center;gap:6px">
              <span class="pp-spin" style="font-size:14px;animation-duration:${(200 / animSpd) * 2}s">✨</span>
              <span style="font-size:10px;color:#085041;align-self:center">${animSpd}%</span>
              <span class="pp-spin" style="font-size:14px;animation-duration:${(200 / animSpd) * 2.5}s">⭐</span>
            </div>`
                : `<div style="background:#fff;border:0.5px solid rgba(0,0,0,.1);border-radius:5px;padding:5px 7px;font-size:9px;color:#9CA3AF;text-align:center">Sin animaciones de fondo</div>`
        }
        <div style="background:#fff;border:0.5px solid rgba(0,0,0,.1);border-radius:5px;padding:6px 8px;font-size:10px;color:#6B7280">
          Transición: ${trans}ms
          <div style="margin-top:4px;height:3px;border-radius:2px;background:rgba(0,0,0,.1);overflow:hidden">
            <div style="height:100%;background:#0F6E56;width:${Math.round((1 - trans / 600) * 100)}%"></div>
          </div>
        </div>
        ${coopHtml}
      </div></div>`,

            evaluacion: `
      <div class="pp-info-chip">${opts} opciones · ${vals.intentos_max ?? 3} intentos · ${vals.refuerzo ?? 'al completar'}</div>
      <div class="pp-dev"><div class="pp-dev-bar"><div class="pp-dev-title">¿Cuál instrumento?</div><div class="pp-dev-av">VA</div></div>
      <div class="pp-dev-body">
        <div class="pp-dev-narr">${instruc}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:${bsp}px">
          ${ICONS.slice(0, opts)
              .map((ic, i) => {
                  const sz = Math.round(bs * 0.44);
                  return `<div class="pp-dev-opt" style="padding:4px;gap:2px"><div style="width:${sz}px;height:${sz}px;border-radius:5px;background:${COLS[i]};display:flex;align-items:center;justify-content:center;font-size:${Math.round(sz * 0.5)}px">${ic}</div><div style="font-size:8px;font-weight:500">${nombres[i]}</div></div>`;
              })
              .join('')}
        </div>
        ${progHtml}
        <div style="font-size:8px;color:#9CA3AF;text-align:center">Intentos: ${vals.intentos_max ?? 3}</div>
        ${coopHtml}
      </div></div>`,

            ra: `
      <div class="pp-info-chip">Inicio: ${raI} · ${raC} · ${raV}%</div>
      <div class="pp-dev"><div class="pp-dev-bar"><div class="pp-dev-title">Descubre la guitarra</div><div class="pp-dev-av">VA</div></div>
      <div class="pp-dev-body">
        <div class="pp-dev-narr">Apunta la tablet a la cartilla</div>
        <div style="border:2px ${raI === 'manual' ? 'dashed' : 'solid'} #0F6E56;border-radius:7px;padding:8px;text-align:center;background:${raI === 'automático' ? '#E1F5EE' : '#fff'}">
          <i class="fa-solid fa-camera" style="font-size:16px;color:#0F6E56;display:block;margin-bottom:3px"></i>
          <div style="font-size:9px;color:#085041;font-weight:500">${raI === 'automático' ? 'Se activa solo' : 'Toca para activar'}</div>
          <div style="font-size:8px;color:#9CA3AF;margin-top:2px">${raC} · ${raV}%</div>
        </div>
        ${sub ? `<div style="background:rgba(0,0,0,.7);color:#fff;font-size:8px;padding:2px 5px;border-radius:3px;text-align:center">— Subtítulos en RA —</div>` : ''}
        ${coopHtml}
      </div></div>`,

            retroalimentacion: buildPreviewRetroalimentacion(vals),
            sesion: buildPreviewSesion(vals),
            idioma: buildPreviewIdioma(vals),
            dibujo: buildPreviewDibujo(vals),
            juegos: buildPreviewJuegos(vals),
            acceso: buildPreviewAcceso(vals),
        };

        if (previews[cat]) return previews[cat];

        return `<div class="pp-info-chip">Vista previa: ${escapeHtml(cat)}</div>
      <div class="pp-dev"><div class="pp-dev-bar"><div class="pp-dev-title">PedNia</div><div class="pp-dev-av">VA</div></div>
      <div class="pp-dev-body"><div class="pp-dev-narr">${instruc}</div>${coopHtml}</div></div>`;
    }

    function buildPreviewContraste(vals) {
        const ct = vals.contraste || 'estándar';
        const mc = vals.modo_color || 'normal';
        const fp = vals.fondo_pantalla || 'blanco';
        const ef = vals.elementos_flotantes !== false;
        const cg = !!vals.cursor_grande;
        const fondos = { blanco: '#FFFFFF', crema: '#FFF9EE', gris_suave: '#F3F4F6' };
        const bgF = fondos[fp] || '#FFFFFF';
        const contrasteBorde = { estándar: '1px solid #E5E7EB', alto: '2px solid #374151', máximo: '3px solid #111827' };
        const contrasteTexto = { estándar: '#374151', alto: '#111827', máximo: '#000000' };
        const filtros = {
            normal: 'none',
            daltonismo_protanopia: 'sepia(.4) hue-rotate(-30deg)',
            daltonismo_deuteranopia: 'sepia(.3) hue-rotate(30deg)',
            escala_grises: 'grayscale(1)',
        };
        const mcLabel = {
            normal: 'Normal',
            daltonismo_protanopia: 'Protanopía',
            daltonismo_deuteranopia: 'Deuteranopía',
            escala_grises: 'Escala de grises',
        };
        const cb = contrasteBorde[ct] || '1px solid #E5E7EB';
        const ctxt = contrasteTexto[ct] || '#374151';
        const filtro = filtros[mc] || 'none';
        const iconos = ['🎸', '🥁', '🪈', '🎹'];
        const nombres = ['Guitarra', 'Tambor', 'Flauta', 'Piano'];
        const nOpts = Math.min(vals.opciones_max || 4, 4);

        let opcionesHtml = '';
        for (let i = 0; i < nOpts; i++) {
            opcionesHtml +=
                '<div style="border:' +
                cb +
                ';border-radius:7px;padding:6px 4px;text-align:center;background:' +
                bgF +
                '">' +
                '<div style="font-size:18px">' +
                iconos[i] +
                '</div>' +
                '<div style="font-size:8px;font-weight:600;color:' +
                ctxt +
                '">' +
                nombres[i] +
                '</div></div>';
        }

        const sinFlotantes = !ef
            ? '<div style="font-size:8px;color:#9CA3AF;text-align:center;margin-bottom:3px;background:#FFF3CD;border-radius:3px;padding:1px 4px">Sin elementos flotantes</div>'
            : '';
        const cursorHtml = cg
            ? '<div style="position:absolute;bottom:6px;right:6px;width:16px;height:16px;border-radius:50%;border:2.5px solid #0F6E56;background:rgba(15,110,86,.15);display:flex;align-items:center;justify-content:center"><div style="width:5px;height:5px;border-radius:50%;background:#0F6E56"></div></div>'
            : '';
        const chipTxt = 'Contraste: ' + ct + ' · ' + mcLabel[mc] + ' · Fondo: ' + fp;

        return (
            '<div class="pp-info-chip">' +
            chipTxt +
            '</div>' +
            '<div class="pp-dev" style="filter:' +
            filtro +
            '">' +
            '<div class="pp-dev-bar" style="border-bottom:' +
            cb +
            '"><div class="pp-dev-title">¿Cuál instrumento?</div><div class="pp-dev-av">VA</div></div>' +
            '<div class="pp-dev-body" style="background:' +
            bgF +
            ';position:relative">' +
            sinFlotantes +
            '<div class="pp-dev-narr" style="color:' +
            ctxt +
            '">Toca la respuesta correcta</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:5px 0">' +
            opcionesHtml +
            '</div>' +
            cursorHtml +
            '<div style="font-size:8px;color:#9CA3AF;text-align:center;margin-top:3px">Modo color: ' +
            mcLabel[mc] +
            '</div>' +
            '</div>' +
            '</div>'
        );
    }

    function buildPreviewRetroalimentacion(vals) {
        const rv = vals.refuerzo_visual !== false;
        const rs = vals.refuerzo_sonido !== false;
        const rt = vals.refuerzo_tipo || 'animación';
        const ev = vals.error_visible !== false;
        const fd = vals.feedback_demora_ms ?? 400;
        const tiposLabel = {
            animación: '🎉 Animación',
            badge: '🏅 Badge',
            solo_texto: 'Texto',
            trofeo_estático: '🏆 Trofeo',
        };
        const recompensaHtml =
            rt === 'animación'
                ? '<div style="font-size:22px;text-align:center">🎉🏆⭐</div>'
                : rt === 'badge'
                  ? '<div style="display:inline-block;background:#0F6E56;color:#fff;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;margin:0 auto">¡Logro desbloqueado!</div>'
                  : rt === 'solo_texto'
                    ? '<div style="font-size:9px;font-weight:700;color:#085041;text-align:center">¡Muy bien, lo lograste!</div>'
                    : '<div style="font-size:24px;text-align:center">🏆</div>';
        const errorHtml = ev
            ? '<div style="background:#FCEBEB;border:1px solid #A32D2D;border-radius:5px;padding:3px 6px;font-size:8px;color:#A32D2D;text-align:center">Casi... inténtalo de nuevo</div>'
            : '<div style="background:#FFF3CD;border-radius:5px;padding:3px 6px;font-size:8px;color:#854F0B;text-align:center">Sin mensaje de error</div>';

        return (
            '<div class="pp-info-chip">' +
            (tiposLabel[rt] || rt) +
            ' · ' +
            (rv ? 'Con visual' : 'Sin visual') +
            ' · ' +
            (rs ? 'Con sonido' : 'Sin sonido') +
            '</div>' +
            '<div class="pp-dev">' +
            '<div class="pp-dev-bar"><div class="pp-dev-title">Recompensa</div><div class="pp-dev-av">VA</div></div>' +
            '<div class="pp-dev-body">' +
            '<div class="pp-dev-narr">¡Lo lograste!</div>' +
            '<div style="text-align:center;padding:6px 0">' +
            recompensaHtml +
            '</div>' +
            '<div style="font-size:8px;color:#9CA3AF;text-align:center;margin:4px 0">' +
            (rv ? '✓ Visual' : '✗ Sin animación') +
            ' · ' +
            (rs ? '✓ Sonido' : '✗ Sin sonido') +
            '</div>' +
            '<div style="font-size:8px;color:#6B7280;margin:4px 0">Si responde mal:</div>' +
            errorHtml +
            '<div style="font-size:8px;color:#9CA3AF;text-align:center;margin-top:3px">Demora feedback: ' +
            fd +
            'ms</div>' +
            '</div></div>'
        );
    }

    function buildPreviewSesion(vals) {
        const tmb = vals.tiempo_max_bloque || 0;
        const peb = !!vals.pausa_entre_bloques;
        const dps = vals.duracion_pausa_seg ?? 5;
        const rpos = !!vals.recordatorio_postura;
        const tiempoHtml =
            tmb > 0
                ? '<div style="display:flex;align-items:center;gap:4px;background:#E6F1FB;border-radius:5px;padding:3px 6px"><div style="font-size:10px">⏱</div><div style="font-size:8px;font-weight:600;color:#185FA5">Máx ' +
                  tmb +
                  'seg por bloque</div></div>'
                : '<div style="font-size:8px;color:#9CA3AF;text-align:center">Sin límite de tiempo</div>';
        const pausaHtml = peb
            ? '<div style="background:#E1F5EE;border-radius:5px;padding:4px 6px;text-align:center"><div style="font-size:14px">😮‍💨</div><div style="font-size:8px;font-weight:600;color:#085041">Pausa ' +
              dps +
              'seg entre bloques</div></div>'
            : '<div style="font-size:8px;color:#9CA3AF;text-align:center">Sin pausa entre bloques</div>';

        return (
            '<div class="pp-info-chip">Tiempo: ' +
            (tmb ? tmb + 'seg' : 'ilimitado') +
            ' · Pausa: ' +
            (peb ? dps + 'seg' : 'no') +
            '</div>' +
            '<div class="pp-dev">' +
            '<div class="pp-dev-bar"><div class="pp-dev-title">Control de sesión</div><div class="pp-dev-av">VA</div></div>' +
            '<div class="pp-dev-body">' +
            tiempoHtml +
            '<div style="margin:5px 0">' +
            pausaHtml +
            '</div>' +
            (rpos
                ? '<div style="background:#FAEEDA;border-radius:5px;padding:3px 6px;font-size:8px;color:#854F0B;text-align:center">📢 Recordatorio postura al docente</div>'
                : '<div style="font-size:8px;color:#9CA3AF;text-align:center">Sin recordatorio de postura</div>') +
            '</div></div>'
        );
    }

    function buildPreviewIdioma(vals) {
        const id = vals.idioma || 'español';
        const vn = vals.voz_narradora || 'infantil_femenina';
        const vv = vals.velocidad_voz ?? 100;
        const ra = !!vals.repeticion_audio;
        const idLabel = { español: 'Español 🇨🇴', wayuunaiki: 'Wayuunaiki 🪶', inglés: 'Inglés 🌐' };
        const vnLabel = {
            infantil_femenina: 'Infantil femenina',
            infantil_masculina: 'Infantil masculina',
            lenta: 'Lenta',
            muy_lenta: 'Muy lenta',
        };
        const barW = Math.round((vv / 120) * 100);

        return (
            '<div class="pp-info-chip">' +
            (idLabel[id] || id) +
            ' · ' +
            (vnLabel[vn] || vn) +
            ' · ' +
            vv +
            '%</div>' +
            '<div class="pp-dev">' +
            '<div class="pp-dev-bar"><div class="pp-dev-title">Idioma y voz</div><div class="pp-dev-av">VA</div></div>' +
            '<div class="pp-dev-body">' +
            '<div style="background:#F3F2EE;border-radius:6px;padding:6px;margin-bottom:5px">' +
            '<div style="font-size:8px;font-weight:600;color:#6B7280;margin-bottom:3px">🎙 Instrucción de audio</div>' +
            '<div style="font-size:9px;color:#111827">' +
            (idLabel[id] || id) +
            '</div>' +
            '<div style="font-size:8px;color:#9CA3AF">' +
            (vnLabel[vn] || vn) +
            '</div></div>' +
            '<div style="font-size:8px;color:#6B7280;margin-bottom:2px">Velocidad de voz</div>' +
            '<div style="background:#F3F2EE;border-radius:3px;height:8px;width:100%;margin-bottom:4px"><div style="width:' +
            barW +
            '%;height:100%;background:#0F6E56;border-radius:3px"></div></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:8px;color:#9CA3AF"><span>Lenta 60%</span><span style="color:#085041;font-weight:700">' +
            vv +
            '%</span><span>Rápida 120%</span></div>' +
            (ra
                ? '<div style="background:#E1F5EE;border-radius:5px;padding:3px 6px;font-size:8px;color:#085041;margin-top:5px;text-align:center">🔁 Audio se repite automáticamente</div>'
                : '') +
            '</div></div>'
        );
    }

    function buildPreviewDibujo(vals) {
        const gp = vals.grosor_pincel ?? 6;
        const pr = !!vals.paleta_reducida;
        const du = vals.deshacer !== false;
        const lc = !!vals.lienzo_cuadriculado;
        const colores = pr
            ? ['#FF6B6B', '#4ECDC4', '#000000']
            : ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#000000'];
        const trazoPx = Math.round(gp * 2.2);
        const lienzoBg = lc
            ? 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(0,0,0,.05) 10px,rgba(0,0,0,.05) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(0,0,0,.05) 10px,rgba(0,0,0,.05) 11px)'
            : '#fff';

        return (
            '<div class="pp-info-chip">Pincel ' +
            gp +
            'px · ' +
            (pr ? 'Paleta reducida' : '6 colores') +
            ' · ' +
            (du ? 'Deshacer on' : 'Sin deshacer') +
            '</div>' +
            '<div class="pp-dev">' +
            '<div class="pp-dev-bar"><div class="pp-dev-title">Dibujo libre</div><div class="pp-dev-av">VA</div></div>' +
            '<div class="pp-dev-body">' +
            '<div style="border:1px solid rgba(0,0,0,.1);border-radius:6px;background:' +
            lienzoBg +
            ';height:55px;margin-bottom:5px;display:flex;align-items:center;justify-content:center;position:relative">' +
            '<svg width="60" height="30" style="position:absolute"><path d="M5,25 Q20,5 35,20 Q50,35 60,15" stroke="#FF6B6B" stroke-width="' +
            trazoPx +
            '" fill="none" stroke-linecap="round"/></svg>' +
            (lc ? '<div style="position:absolute;top:3px;right:4px;font-size:7px;color:#9CA3AF">cuad.</div>' : '') +
            '</div>' +
            '<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:4px">' +
            colores
                .map(
                    (col) =>
                        '<div style="width:14px;height:14px;border-radius:50%;background:' +
                        col +
                        ';border:1.5px solid rgba(0,0,0,.1)"></div>'
                )
                .join('') +
            (pr ? '<div style="font-size:8px;color:#9CA3AF;margin-left:3px;align-self:center">Reducida</div>' : '') +
            '</div>' +
            '<div style="display:flex;gap:5px">' +
            (du
                ? '<div style="font-size:8px;background:#F3F2EE;border:1px solid rgba(0,0,0,.1);border-radius:4px;padding:1px 5px;color:#6B7280">↩ Deshacer</div>'
                : '') +
            '<div style="font-size:8px;color:#9CA3AF">Grosor: ' +
            gp +
            'px</div></div></div></div>'
        );
    }

    function buildPreviewJuegos(vals) {
        const rpm = vals.rompecabezas_piezas_max ?? 9;
        const mpm = vals.memoria_pares_max ?? 6;
        const spm = vals.secuencia_pasos_max ?? 4;
        const jb = !!vals.juego_bordes;
        const diffR = rpm <= 4 ? 'Fácil' : rpm <= 6 ? 'Medio' : 'Normal';
        const diffColor = rpm <= 4 ? '#0F6E56' : rpm <= 6 ? '#854F0B' : '#374151';

        return (
            '<div class="pp-info-chip">Rompecabezas máx ' +
            rpm +
            ' piezas · Memoria máx ' +
            mpm +
            ' pares</div>' +
            '<div class="pp-dev">' +
            '<div class="pp-dev-bar"><div class="pp-dev-title">Juegos interactivos</div><div class="pp-dev-av">VA</div></div>' +
            '<div class="pp-dev-body">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:6px">' +
            '<div style="background:#F3F2EE;border:1px solid rgba(0,0,0,.1);border-radius:6px;padding:5px;text-align:center">' +
            '<div style="font-size:14px">🧩</div><div style="font-size:8px;font-weight:600;color:#6B7280">Rompecabezas</div>' +
            '<div style="font-size:9px;font-weight:700;color:' +
            diffColor +
            '">' +
            rpm +
            ' piezas · ' +
            diffR +
            '</div></div>' +
            '<div style="background:#F3F2EE;border:1px solid rgba(0,0,0,.1);border-radius:6px;padding:5px;text-align:center">' +
            '<div style="font-size:14px">🃏</div><div style="font-size:8px;font-weight:600;color:#6B7280">Memoria</div>' +
            '<div style="font-size:9px;font-weight:700;color:#185FA5">' +
            mpm +
            ' pares máx</div></div>' +
            '<div style="background:#F3F2EE;border:1px solid rgba(0,0,0,.1);border-radius:6px;padding:5px;text-align:center">' +
            '<div style="font-size:14px">📋</div><div style="font-size:8px;font-weight:600;color:#6B7280">Secuencia</div>' +
            '<div style="font-size:9px;font-weight:700;color:#534AB7">' +
            spm +
            ' pasos máx</div></div>' +
            '<div style="background:#F3F2EE;border:' +
            (jb ? '2px solid #374151' : '1px solid rgba(0,0,0,.1)') +
            ';border-radius:6px;padding:5px;text-align:center">' +
            '<div style="font-size:14px">🎨</div><div style="font-size:8px;font-weight:600;color:#6B7280">Bordes</div>' +
            '<div style="font-size:9px;font-weight:700;color:' +
            (jb ? '#374151' : '#9CA3AF') +
            '">' +
            (jb ? 'Destacados' : 'Normales') +
            '</div></div></div></div></div>'
        );
    }

    function buildPreviewAcceso(vals) {
        const lt = vals.login_tipo || 'pin_4';
        const tg = !!vals.teclado_grande;
        const ma = !!vals.modo_aula_automatico;
        const ltLabel = {
            pin_4: 'PIN 4 dígitos',
            pin_3: 'PIN 3 dígitos',
            avatar: 'Toque de avatar',
            docente_inicia: 'Docente inicia',
        };
        const pinSize = tg ? 18 : 13;
        const pinBtns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
        let pinHtml;
        if (lt === 'pin_4' || lt === 'pin_3') {
            pinHtml =
                '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-bottom:5px">' +
                pinBtns
                    .map((b) =>
                        b
                            ? '<div style="background:#F3F2EE;border:1px solid rgba(0,0,0,.1);border-radius:6px;text-align:center;font-size:' +
                              pinSize +
                              'px;font-weight:700;padding:' +
                              (tg ? '6' : '4') +
                              'px 0;color:#111827">' +
                              b +
                              '</div>'
                            : '<div></div>'
                    )
                    .join('') +
                '</div>';
        } else if (lt === 'avatar') {
            pinHtml =
                '<div style="text-align:center;padding:8px 0"><div style="font-size:32px;display:inline-block;background:#F3F2EE;border-radius:50%;width:50px;height:50px;line-height:50px;border:2px solid rgba(0,0,0,.1)">👧</div><div style="font-size:8px;color:#9CA3AF;margin-top:3px">Toca tu foto para entrar</div></div>';
        } else {
            pinHtml =
                '<div style="text-align:center;padding:8px 0;font-size:8px;color:#9CA3AF">El docente activa la sesión desde su panel</div>';
        }

        return (
            '<div class="pp-info-chip">' +
            (ltLabel[lt] || lt) +
            ' · ' +
            (ma ? 'Modo Aula auto' : 'Catálogo normal') +
            '</div>' +
            '<div class="pp-dev">' +
            '<div class="pp-dev-bar"><div class="pp-dev-title">Acceso a la tablet</div><div class="pp-dev-av">VA</div></div>' +
            '<div class="pp-dev-body">' +
            pinHtml +
            (ma
                ? '<div style="background:#E1F5EE;border-radius:5px;padding:3px 6px;font-size:8px;color:#085041;text-align:center;margin-bottom:4px">🚀 Va directo a la experiencia del día</div>'
                : '') +
            '<div style="display:flex;gap:5px;flex-wrap:wrap">' +
            (tg
                ? '<div style="font-size:8px;background:#E6F1FB;border:1px solid #BFDBFE;border-radius:4px;padding:1px 5px;color:#185FA5">Teclado grande</div>'
                : '') +
            '<div style="font-size:8px;background:#F3F2EE;border:1px solid rgba(0,0,0,.1);border-radius:4px;padding:1px 5px;color:#6B7280">' +
            (ltLabel[lt] || lt) +
            '</div></div></div></div>'
        );
    }

    // ── Boot ────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
