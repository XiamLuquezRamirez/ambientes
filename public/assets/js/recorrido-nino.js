/**
 * recorrido-nino.js — Kiosco: portada pública y arranque del camino 3D.
 */
(function ($) {
    'use strict';

    let $app;
    let $shell;
    let $paso;
    let $player;
    let $btnFs;
    let arbol;
    let urlExperienciaTpl;
    let urlSalir;
    let urlContinuar;
    let portadaImg;
    let estudianteSexo;

    function escapar(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderPortada() {
        $shell.addClass('rn-shell--portada').removeClass('rn-shell--camino');
        $paso.attr('data-paso', 'portada');
        const a = arbol.ambiente || {};
        const nombre = a.nombre || 'Ambiente';
        const img = portadaImg
            ? `<img class="rn-portada-img" src="${escapar(portadaImg)}" alt="" decoding="async">`
            : `<div class="rn-portada-img rn-portada-img--fallback" aria-hidden="true"><span>${escapar(a.icono || '🎨')}</span></div>`;

        $paso.html(`
            <div class="rn-portada">
                <header class="rn-portada-banner">
                    <h1 class="rn-portada-titulo">${escapar(nombre)}</h1>
                </header>
                <div class="rn-portada-cuerpo">
                    <div class="rn-portada-ilustracion" aria-hidden="true">${img}</div>
                    <div class="rn-portada-accion">
                        <div class="rn-portada-iniciar-halo">
                            <button type="button" class="rn-btn-iniciar-pill" id="rnBtnIniciarAmbiente">
                                <span>Iniciar</span>
                                <span class="rn-btn-iniciar-flecha" aria-hidden="true">
                                    <i class="fa-solid fa-chevron-right"></i>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }

    function renderErrorCamino() {
        $paso.attr('data-paso', 'error');
        $paso.html(`
            <div class="rn-empty-wrap" role="alert">
                <p class="rn-empty">No se pudo cargar el recorrido.</p>
                <p class="rn-empty">Pide ayuda a tu docente.</p>
            </div>
        `);
    }

    function csrfToken() {
        return String($('meta[name="csrf-token"]').attr('content') || '');
    }

    function salirSesion() {
        function irInicio() {
            if (window.KioscoNav && window.KioscoNav.esRutaKiosco('/inicio')) {
                window.KioscoNav.ir('/inicio', true);
                return;
            }
            window.location.href = '/inicio';
        }

        if (!urlSalir) {
            irInicio();
            return;
        }

        $.ajax({
            url: urlSalir,
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            data: JSON.stringify({ _token: csrfToken() }),
            contentType: 'application/json',
        }).always(irInicio);
    }

    function estaEnFullscreen() {
        return window.KioscoFsCore
            ? window.KioscoFsCore.estaEnFullscreen()
            : !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }

    function actualizarBtnFullscreen() {
        if (!$btnFs.length) return;
        const activo = estaEnFullscreen();
        if (window.KioscoFsCore) {
            window.KioscoFsCore.marcarClaseFullscreen(activo);
        }
        $btnFs.prop('hidden', activo);
        $btnFs.attr('title', activo ? 'Pantalla completa activa' : 'Pantalla completa');
        $btnFs.find('i').attr('class', activo ? 'fa-solid fa-compress' : 'fa-solid fa-expand');
    }

    function toggleFullscreen() {
        if (window.KioscoFsCore) {
            return window.KioscoFsCore.toggleFullscreen().finally(actualizarBtnFullscreen);
        }
        const salir = document.exitFullscreen
            || document.webkitExitFullscreen
            || document.msExitFullscreen;
        const entrar = document.documentElement.requestFullscreen
            || document.documentElement.webkitRequestFullscreen;
        const prom = estaEnFullscreen()
            ? (salir ? Promise.resolve(salir.call(document)) : Promise.resolve())
            : (entrar ? Promise.resolve(entrar.call(document.documentElement)) : Promise.reject());
        return prom.finally(actualizarBtnFullscreen);
    }

    function enlazarEventosPortada() {
        $paso.off('click.rn').on('click.rn', '#rnBtnIniciarAmbiente', function () {
            if (!urlContinuar) return;
            if (window.KioscoNav && window.KioscoNav.esRutaKiosco(urlContinuar)) {
                window.KioscoNav.ir(urlContinuar);
                return;
            }
            window.location.href = urlContinuar;
        });

        if ($btnFs.length) {
            $btnFs.off('click.rn').on('click.rn', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleFullscreen();
            });
            actualizarBtnFullscreen();
        }

        $('#rnBtnSalirSesion').off('click.rn').on('click.rn', function (e) {
            e.preventDefault();
            salirSesion();
        });
    }

    function montarCamino3D() {
        const ctxCamino = {
            $app,
            $shell,
            $paso,
            $player,
            urlExperienciaTpl,
            onSalir: salirSesion,
        };

        const intentar = function () {
            return window.KioscoCamino && window.KioscoCamino.boot(ctxCamino);
        };

        if (intentar()) return;

        let intentos = 0;
        const timer = setInterval(function () {
            intentos += 1;
            if (intentar() || intentos > 60) {
                clearInterval(timer);
                if (!window.KioscoCamino || intentos > 60) {
                    renderErrorCamino();
                }
            }
        }, 50);
    }

    function boot() {
        if (window.VistaNino && typeof window.VistaNino.vincular === 'function') {
            window.VistaNino.vincular();
        }
        if (window.VistaNino && typeof window.VistaNino.detener === 'function') {
            window.VistaNino.detener();
        }

        $app = $('#rnApp');
        if (!$app.length) return;

        $shell = $('#rnShell');
        $paso = $('#rnPaso');
        $player = $('#vnDispositivo');
        $btnFs = $('#rnBtnFullscreen');

        try {
            arbol = JSON.parse(document.getElementById('rn-arbol')?.textContent || '{}');
        } catch (e) {
            arbol = { ambiente: {}, modulos: [] };
        }

        urlExperienciaTpl = String($app.data('url-experiencia') || '');
        urlSalir = String($app.data('url-salir') || '');
        urlContinuar = String($app.data('url-continuar') || '');
        portadaImg = String($app.data('portada-img') || '');
        estudianteSexo = String($app.data('estudiante-sexo') || '');

        $shell.prop('hidden', false);
        $player.prop('hidden', true);

        if (String($app.data('ui') || '') === 'camino-lineal') {
            montarCamino3D();
            return;
        }

        enlazarEventosPortada();
        renderPortada();
    }

    $(document).on('fullscreenchange webkitfullscreenchange MSFullscreenChange', function () {
        if ($btnFs && $btnFs.length) actualizarBtnFullscreen();
    });

    window.KioscoRecorrido = { boot };
    $(boot);
})(jQuery);
