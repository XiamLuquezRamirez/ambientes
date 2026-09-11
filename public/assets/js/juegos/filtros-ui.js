/**
 * Cascada de filtros del catálogo del modulo de juegos (ambiente → módulo → eje → temática).
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

    function hayFiltrosActivos(form) {
        if (!form) return false;
        const q = (form.querySelector('.js-juego-buscar')?.value || '').trim();
        if (q) return true;

        const selects = [
            '.js-juego-filtro-ambiente',
            '.js-juego-filtro-modulo',
            '.js-juego-filtro-eje',
            '.js-juego-filtro-tematica',
            '.js-juego-filtro-estado',
        ];
        for (const sel of selects) {
            const el = form.querySelector(sel);
            if (el && el.value) return true;
        }
        return false;
    }

    function actualizarBotonLimpiar(form) {
        const btn = form?.querySelector('.js-juego-limpiar-filtros');
        if (!btn) return;
        btn.hidden = !hayFiltrosActivos(form);
    }

    function limpiarFiltros(form) {
        if (!form) return;
        const buscar = form.querySelector('.js-juego-buscar');
        if (buscar) buscar.value = '';

        form.querySelectorAll('select').forEach((select) => {
            select.value = '';
            select.querySelectorAll('option[hidden]').forEach((opt) => {
                opt.hidden = false;
            });
        });

        // Estado fijo "solo activos" (constructor) no se limpia.
        const estadoHidden = form.querySelector('input[type="hidden"][name="estado"]');
        if (estadoHidden) {
            estadoHidden.value = '1';
        }

        aplicarCascada(form);
        actualizarBotonLimpiar(form);
    }

    function enlazar(form, onChange) {
        if (!form) return;

        // Re-bind tras AJAX: permitir re-enlazar el botón limpiar / cascada.
        if (form.dataset.juegosFiltrosBound === '1') {
            aplicarCascada(form);
            actualizarBotonLimpiar(form);
            return;
        }
        form.dataset.juegosFiltrosBound = '1';

        aplicarCascada(form);
        actualizarBotonLimpiar(form);

        if (typeof onChange === 'function') {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                onChange();
            });
        }

        const disparar = () => {
            aplicarCascada(form);
            actualizarBotonLimpiar(form);
            if (typeof onChange === 'function') onChange();
        };

        form.querySelectorAll('select').forEach((select) => {
            select.addEventListener('change', disparar);
        });

        const buscar = form.querySelector('.js-juego-buscar');
        let debounceTimer = null;
        if (buscar) {
            buscar.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(disparar, 400);
            });
            buscar.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(debounceTimer);
                    disparar();
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
                actualizarBotonLimpiar(form);
                if (typeof onChange === 'function') onChange();
            });
        });

        const btnLimpiar = form.querySelector('.js-juego-limpiar-filtros');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                limpiarFiltros(form);
                if (typeof onChange === 'function') onChange();
            });
        }
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
        hayFiltrosActivos,
        limpiarFiltros,
        actualizarBotonLimpiar,
    };
})();
