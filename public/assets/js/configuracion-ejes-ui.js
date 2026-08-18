/**
 * Acordeón de ambientes/módulos + paginación client-side de tablas de ejes.
 * Usado por admin, panel (docente) y superAdmin.
 */
(function (global) {
    const PAGE_SIZE = 10;

    function bindAmbienteToggles(container) {
        if (!container || container.dataset.ambAcordeonBound === '1') return;
        container.dataset.ambAcordeonBound = '1';

        container.addEventListener('click', (event) => {
            const head = event.target.closest('[data-amb-toggle]');
            if (!head || !container.contains(head)) return;

            const group = head.closest('.amb-group');
            if (!group || !container.contains(group)) return;

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
    }

    function bindModuloToggles(container) {
        if (!container || container.dataset.modAcordeonBound === '1') return;
        container.dataset.modAcordeonBound = '1';

        container.addEventListener('click', (event) => {
            const head = event.target.closest('[data-mod-toggle]');
            if (!head || !container.contains(head)) return;

            const group = head.closest('.mod-ejes-group');
            const amb = head.closest('.amb-group');
            if (!group || !amb || !container.contains(group)) return;

            const wasCollapsed = group.classList.contains('is-collapsed');
            amb.querySelectorAll('.mod-ejes-group').forEach((other) => {
                other.classList.add('is-collapsed');
                other.querySelector('[data-mod-toggle]')?.setAttribute('aria-expanded', 'false');
            });

            if (wasCollapsed) {
                group.classList.remove('is-collapsed');
                head.setAttribute('aria-expanded', 'true');
            }
        });
    }

    function wrapOf(tbodyOrWrap) {
        if (!tbodyOrWrap) return null;
        if (tbodyOrWrap.matches?.('[data-ejes-pager]')) return tbodyOrWrap;
        return tbodyOrWrap.closest?.('[data-ejes-pager]') || null;
    }

    function filasElegibles(tbody) {
        return [...tbody.querySelectorAll('tr[data-eje-id]')].filter(
            (row) => row.dataset.filterHide !== '1',
        );
    }

    function asegurarNav(wrap) {
        let nav = wrap.querySelector('[data-ejes-pager-nav]');
        if (nav) return nav;

        nav = document.createElement('nav');
        nav.className = 'cfg-pager';
        nav.dataset.ejesPagerNav = '';
        nav.setAttribute('aria-label', 'Paginación de ejes');
        nav.hidden = true;
        nav.innerHTML = `
            <button type="button" class="cfg-pager-btn" data-pager-prev>Anterior</button>
            <span class="cfg-pager-info" data-pager-info></span>
            <button type="button" class="cfg-pager-btn" data-pager-next>Siguiente</button>
        `;
        wrap.appendChild(nav);

        nav.querySelector('[data-pager-prev]').addEventListener('click', () => {
            const page = Number(wrap.dataset.page || 1) - 1;
            aplicarPaginacion(wrap, page);
        });
        nav.querySelector('[data-pager-next]').addEventListener('click', () => {
            const page = Number(wrap.dataset.page || 1) + 1;
            aplicarPaginacion(wrap, page);
        });

        return nav;
    }

    function aplicarPaginacion(wrapOrTbody, page) {
        const wrap = wrapOf(wrapOrTbody);
        if (!wrap) return;

        const tbody = wrap.querySelector('tbody');
        if (!tbody) return;

        const size = Number(wrap.dataset.pageSize || PAGE_SIZE) || PAGE_SIZE;
        const elegibles = filasElegibles(tbody);
        const total = elegibles.length;
        const totalPages = Math.max(1, Math.ceil(total / size) || 1);
        let current = Number(page ?? wrap.dataset.page ?? 1) || 1;
        if (current < 1) current = 1;
        if (current > totalPages) current = totalPages;
        wrap.dataset.page = String(current);

        const start = (current - 1) * size;
        const end = start + size;

        tbody.querySelectorAll('tr[data-eje-id]').forEach((row) => {
            if (row.dataset.filterHide === '1') {
                row.hidden = true;
                return;
            }
            const idx = elegibles.indexOf(row);
            row.hidden = idx < start || idx >= end;
        });

        const nav = asegurarNav(wrap);
        if (total <= size) {
            nav.hidden = true;
            return;
        }

        nav.hidden = false;
        const from = total === 0 ? 0 : start + 1;
        const to = Math.min(end, total);
        const info = nav.querySelector('[data-pager-info]');
        if (info) {
            info.textContent = `${from}–${to} de ${total} · Página ${current} de ${totalPages}`;
        }

        const prev = nav.querySelector('[data-pager-prev]');
        const next = nav.querySelector('[data-pager-next]');
        if (prev) prev.disabled = current <= 1;
        if (next) next.disabled = current >= totalPages;
    }

    function refrescarPaginacion(root) {
        if (!root) return;
        root.querySelectorAll('[data-ejes-pager]').forEach((wrap) => {
            aplicarPaginacion(wrap, Number(wrap.dataset.page || 1));
        });
    }

    function irAPaginaDelEje(tbodyOrWrap, ejeId) {
        const wrap = wrapOf(tbodyOrWrap);
        if (!wrap) return;
        const tbody = wrap.querySelector('tbody');
        if (!tbody) return;

        const size = Number(wrap.dataset.pageSize || PAGE_SIZE) || PAGE_SIZE;
        const elegibles = filasElegibles(tbody);
        const idx = elegibles.findIndex((r) => String(r.dataset.ejeId) === String(ejeId));
        if (idx < 0) {
            aplicarPaginacion(wrap);
            return;
        }
        aplicarPaginacion(wrap, Math.floor(idx / size) + 1);
    }

    function autoBindAcordeones() {
        const candidates = [
            ...document.querySelectorAll(
                '.config-sistema, .config-panel-catalogo, .config-panel-portafolio, .config-admin-modulos, .config-admin-ejes, .config-panel-modulos, .config-panel-ejes',
            ),
        ];

        const roots = candidates.filter(
            (el) => !candidates.some((other) => other !== el && other.contains(el)),
        );

        roots.forEach((root) => {
            bindAmbienteToggles(root);
            bindModuloToggles(root);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoBindAcordeones);
    } else {
        autoBindAcordeones();
    }

    global.ConfigEjesUi = {
        PAGE_SIZE,
        bindAmbienteToggles,
        bindModuloToggles,
        aplicarPaginacion,
        refrescarPaginacion,
        irAPaginaDelEje,
    };
})(window);
