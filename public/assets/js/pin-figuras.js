(function () {
    'use strict';

    const seleccion = [];
    let app = null;
    let enviando = false;

    function mensajeEl() {
        return document.getElementById('pinMensaje');
    }

    function limpiarMensaje() {
        const el = mensajeEl();
        if (!el) return;
        el.textContent = '';
        el.classList.remove('visible', 'pin-mensaje--aviso');
    }

    function mostrarMensaje(texto, esAviso) {
        const el = mensajeEl();
        if (!el) return;
        el.textContent = texto || 'No se pudo verificar el PIN.';
        el.classList.toggle('pin-mensaje--aviso', !!esAviso);
        el.classList.add('visible');
    }

    function actualizarIndicadores() {
        if (!app) return;

        for (let i = 0; i < 3; i++) {
            const ind = document.getElementById('ind-' + i);
            if (!ind) continue;

            const icono = seleccion[i];
            const catalogo = window.FIGURAS_CATALOGO || {};

            if (icono && catalogo[icono]) {
                const figura = catalogo[icono];
                ind.classList.add('activo');
                ind.innerHTML = '<i class="' + figura.icon + '" style="color:' + figura.color + ';" aria-hidden="true"></i>';
            } else {
                ind.classList.remove('activo');
                ind.textContent = '';
            }
        }
    }

    function mostrarError(mensaje) {
        const inds = document.getElementById('indicadores');
        if (inds) {
            inds.classList.remove('shake');
            void inds.offsetWidth;
            inds.classList.add('shake');
        }

        seleccion.length = 0;
        mostrarMensaje(mensaje || 'PIN incorrecto. Inténtalo de nuevo.');

        setTimeout(function () {
            actualizarIndicadores();
            if (inds) inds.classList.remove('shake');
        }, 500);
    }

    async function enviarPin() {
        if (!app || enviando) return;
        enviando = true;
        limpiarMensaje();

        const body = {
            figura_1: seleccion[0],
            figura_2: seleccion[1],
            figura_3: seleccion[2],
            _token: app.dataset.csrf || '',
        };

        try {
            const resp = await fetch(app.dataset.verificar, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': app.dataset.csrf || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(body),
            });

            let data = {};
            try {
                data = await resp.json();
            } catch (e) {
                data = {};
            }

            if (data.ok) {
                const overlay = document.getElementById('overlay-exito');
                if (overlay) overlay.style.display = 'flex';

                setTimeout(function () {
                    if (window.KioscoNav && typeof window.KioscoNav.ir === 'function') {
                        const redirect = data.redirect || '/listo';
                        const path = redirect.startsWith('http')
                            ? new URL(redirect).pathname
                            : redirect;
                        window.KioscoNav.ir(path);
                    } else {
                        window.location.href = data.redirect;
                    }
                }, 1000);
                return;
            }

            mostrarError(data.mensaje);
        } catch (err) {
            mostrarError('No hay conexión. Inténtalo de nuevo.');
        } finally {
            enviando = false;
        }
    }

    function seleccionarFigura(icono) {
        const catalogo = window.FIGURAS_CATALOGO || {};
        if (enviando || seleccion.length >= 3 || !catalogo[icono]) return;

        limpiarMensaje();
        seleccion.push(icono);
        actualizarIndicadores();

        if (seleccion.length === 3) {
            enviarPin();
        }
    }

    function borrarUltima() {
        if (enviando || seleccion.length === 0) return;
        seleccion.pop();
        limpiarMensaje();
        actualizarIndicadores();
    }

    function enlazarControles() {
        document.querySelectorAll('.figura-btn[data-icon]').forEach(function (btn) {
            btn.onclick = function () {
                seleccionarFigura(btn.dataset.icon);
            };
        });

        const borrar = document.getElementById('btnBorrarPin');
        if (borrar) {
            borrar.onclick = borrarUltima;
        }
    }

    function init() {
        app = document.getElementById('kioscoPinApp');
        seleccion.length = 0;
        enviando = false;
        limpiarMensaje();

        if (!app) return;

        try {
            window.FIGURAS_CATALOGO = JSON.parse(app.dataset.catalogo || '{}');
        } catch (e) {
            window.FIGURAS_CATALOGO = {};
        }

        actualizarIndicadores();
        enlazarControles();
    }

    window.seleccionarFigura = seleccionarFigura;
    window.borrarUltima = borrarUltima;
    window.KioscoPin = { init: init };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
