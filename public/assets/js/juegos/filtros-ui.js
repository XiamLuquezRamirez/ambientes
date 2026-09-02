/**
 * Cascada de filtros del catálogo de juegos (ambiente → módulo → eje → temática).
 */
window.JuegosFiltrosUi = (function () {
    function filtrarOpciones(select, attr, valorPadre) {
        if (!select) return;
        select.querySelectorAll(`option[${attr}]`).forEach((opt) => {
            const visible = !valorPadre || opt.getAttribute(attr) === String(valorPadre);
            opt.hidden = !visible;
            if (!visible && opt.selected) {
                select.value = '';
            }
        });
    }

    function aplicarCascada(form) {
        if (!form) return;
        const ambienteId = form.querySelector('.js-juego-filtro-ambiente')?.value || '';
        const moduloId = form.querySelector('.js-juego-filtro-modulo')?.value || '';
        const ejeId = form.querySelector('.js-juego-filtro-eje')?.value || '';

        filtrarOpciones(form.querySelector('.js-juego-filtro-modulo'), 'data-ambiente-id', ambienteId);
        filtrarOpciones(form.querySelector('.js-juego-filtro-eje'), 'data-modulo-id', moduloId);
        filtrarOpciones(form.querySelector('.js-juego-filtro-tematica'), 'data-eje-id', ejeId);
    }

    function enlazar(form, onChange) {
        if (!form || form.dataset.juegosFiltrosBound === '1') return;
        form.dataset.juegosFiltrosBound = '1';

        aplicarCascada(form);

        if (typeof onChange === 'function') {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                onChange();
            });
        }

        form.querySelectorAll('select').forEach((select) => {
            select.addEventListener('change', () => {
                aplicarCascada(form);
                if (typeof onChange === 'function') onChange();
            });
        });

        const buscar = form.querySelector('.js-juego-buscar');
        let debounceTimer = null;
        if (buscar) {
            buscar.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (typeof onChange === 'function') onChange();
                }, 400);
            });
            buscar.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(debounceTimer);
                    if (typeof onChange === 'function') onChange();
                }
            });
        }

        form.querySelectorAll('.js-juego-view-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const vista = btn.dataset.vista;
                const vistaInput = form.querySelector('.js-juego-vista');
                if (!vista || !vistaInput) return;
                vistaInput.value = vista;
                form.querySelectorAll('.js-juego-view-btn.active').forEach((el) => el.classList.remove('active'));
                btn.classList.add('active');
                if (typeof onChange === 'function') onChange();
            });
        });
    }

    function paramsDesdeForm(form) {
        const params = new URLSearchParams(new FormData(form));
        for (const [k, v] of [...params.entries()]) {
            if (!v) params.delete(k);
        }
        return params;
    }

    return {
        aplicarCascada,
        enlazar,
        paramsDesdeForm,
    };
})();
