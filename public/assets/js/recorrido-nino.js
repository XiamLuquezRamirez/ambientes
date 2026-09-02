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
    let fondoImg;
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
        const usaFondo = !!fondoImg;
        const claseFondo = usaFondo ? ' rn-portada--con-fondo' : '';
        const fondoLayer = usaFondo
            ? `<img class="rn-portada-fondo" src="${escapar(fondoImg)}" alt="" decoding="async" aria-hidden="true">`
            : '';
        const img = portadaImg
            ? `<img class="rn-portada-img" src="${escapar(portadaImg)}" alt="" decoding="async">`
            : `<div class="rn-portada-img rn-portada-img--fallback" aria-hidden="true"><span>${escapar(a.icono || '🎨')}</span></div>`;
        const banner = usaFondo
            ? ''
            : `<header class="rn-portada-banner">
                    <h1 class="rn-portada-titulo">${escapar(nombre)}</h1>
                </header>`;
        const ilustracion = usaFondo
            ? ''
            : `<div class="rn-portada-ilustracion" aria-hidden="true">${img}</div>`;

        $paso.html(`
            <div class="rn-portada${claseFondo}">
                ${fondoLayer}
                ${banner}
                <div class="rn-portada-cuerpo">
                    ${ilustracion}
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
                ${escenaJuegosHTML()}
            </div>
        `);
    }

    // Escena inferior DERECHA, clicable: la figura y el texto se relacionan con
    // el ambiente (p. ej. Expresión Artística → niño pintando). Al tocarla se
    // entra a la zona de juegos.
    function escenaJuegosHTML() {
        const slug = (arbol && arbol.ambiente && arbol.ambiente.slug) || '';
        const esc = escenaPorAmbiente(slug);
        return `
        <button type="button" class="bj-escena" id="rnZonaJuegos"
                aria-label="Entrar a la zona de juegos">
            <span class="bj-escena-suelo" aria-hidden="true"></span>
            <span class="bj-escena-etiqueta">
                <span class="bj-escena-emoji" aria-hidden="true">${esc.emoji}</span>
                <span>${escapar(esc.texto)}</span>
            </span>
            ${esc.svg}
        </button>`;
    }

    // Devuelve { emoji, texto, svg } según el slug del ambiente. El slug puede
    // venir como 'expresion-artistica' (BD) o como alias; cubrimos variantes.
    function escenaPorAmbiente(slug) {
        const s = String(slug).toLowerCase();
        if (s.indexOf('artist') >= 0 || s.indexOf('expresion') >= 0 || s.indexOf('musica') >= 0) {
            return { emoji: '🎨', texto: '¡Vamos a crear!', svg: svgNinoPintando() };
        }
        // Fallback genérico (niño saludando con una pelota) para otros ambientes.
        return { emoji: '🎮', texto: '¡Vamos a jugar!', svg: svgNinoJugando() };
    }

    // --- SVG: niño PINTANDO en un caballete (Expresión Artística) ---
    function svgNinoPintando() {
        return `
        <svg class="bj-nino" viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg"
             aria-hidden="true" focusable="false">
            <ellipse class="bj-nino-sombra" cx="150" cy="160" rx="60" ry="8"/>
            <!-- CABALLETE con lienzo (a la izquierda del niño) -->
            <g>
                <rect x="34" y="60" width="70" height="58" rx="4" fill="#fffdf7" stroke="#c9a24a" stroke-width="3"/>
                <!-- garabatos de pintura que "aparecen" -->
                <path class="bj-trazo bj-trazo-1" d="M46 78 q10 -8 20 0 t20 0" stroke="#e0794f" stroke-width="4" fill="none" stroke-linecap="round"/>
                <path class="bj-trazo bj-trazo-2" d="M46 92 q12 8 24 0 t20 -2" stroke="#3a8fd0" stroke-width="4" fill="none" stroke-linecap="round"/>
                <circle class="bj-trazo bj-trazo-3" cx="80" cy="104" r="6" fill="#ffd24d"/>
                <!-- patas del caballete -->
                <path d="M40 118 L30 150 M98 118 L108 150 M69 118 L69 150" stroke="#a9782f" stroke-width="4" stroke-linecap="round"/>
            </g>
            <!-- NIÑO (grupo con leve balanceo) -->
            <g class="bj-nino-cuerpo">
                <!-- piernas -->
                <rect x="150" y="120" width="12" height="30" rx="6" fill="#3a5ba0"/>
                <rect x="168" y="120" width="12" height="30" rx="6" fill="#3a5ba0"/>
                <ellipse cx="156" cy="152" rx="10" ry="6" fill="#e0e4ea"/>
                <ellipse cx="174" cy="152" rx="10" ry="6" fill="#e0e4ea"/>
                <!-- delantal/torso -->
                <rect x="144" y="82" width="42" height="46" rx="16" fill="#4caf6d"/>
                <path d="M150 96 h30 v22 a15 15 0 0 1 -30 0 z" fill="#3d9159"/>
                <!-- brazo trasero -->
                <rect x="180" y="88" width="11" height="26" rx="5.5" fill="#ffcfa3"/>
                <!-- BRAZO que pinta (con pincel), pivota para dar pinceladas -->
                <g class="bj-brazo-pinta">
                    <rect x="128" y="92" width="26" height="10" rx="5" fill="#ffcfa3"/>
                    <!-- pincel -->
                    <rect x="112" y="93" width="20" height="6" rx="3" fill="#8a5a2b"/>
                    <rect x="106" y="92" width="8" height="8" rx="2" fill="#e0794f"/>
                </g>
                <!-- cabeza -->
                <circle cx="165" cy="64" r="20" fill="#ffcfa3"/>
                <path d="M145 60 a20 20 0 0 1 40 0 q-8 -10 -20 -10 q-12 0 -20 10 z" fill="#6b4423"/>
                <!-- boina de artista -->
                <ellipse cx="165" cy="46" rx="16" ry="7" fill="#c0392b"/>
                <circle cx="165" cy="40" r="3" fill="#c0392b"/>
                <!-- cara -->
                <circle cx="159" cy="64" r="2.4" fill="#3a2b1a"/>
                <circle cx="171" cy="64" r="2.4" fill="#3a2b1a"/>
                <path d="M159 71 q6 5 12 0" stroke="#c0392b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
            </g>
            <!-- paleta de pintor en la otra mano -->
            <g class="bj-paleta">
                <ellipse cx="196" cy="112" rx="14" ry="10" fill="#d8b98a"/>
                <circle cx="190" cy="108" r="2.5" fill="#e0794f"/>
                <circle cx="198" cy="106" r="2.5" fill="#3a8fd0"/>
                <circle cx="202" cy="113" r="2.5" fill="#ffd24d"/>
                <circle cx="192" cy="116" r="2.5" fill="#4caf6d"/>
            </g>
        </svg>`;
    }

    // --- SVG: niño JUGANDO con pelota (fallback genérico) ---
    function svgNinoJugando() {
        return `
        <svg class="bj-nino" viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg"
             aria-hidden="true" focusable="false">
            <ellipse class="bj-nino-sombra" cx="96" cy="150" rx="46" ry="8"/>
            <g class="bj-pelota">
                <circle cx="170" cy="120" r="18" fill="#ff6b4a"/>
                <path d="M170 102 a18 18 0 0 1 0 36" fill="#ffd24d"/>
                <circle cx="170" cy="120" r="18" fill="none" stroke="#c0392b" stroke-width="2"/>
                <path d="M152 120 h36 M170 102 v36" stroke="#c0392b" stroke-width="2"/>
            </g>
            <g class="bj-nino-cuerpo">
                <rect class="bj-pierna bj-pierna-b" x="86" y="112" width="12" height="30" rx="6" fill="#3a5ba0"/>
                <rect class="bj-pierna bj-pierna-f" x="104" y="112" width="12" height="30" rx="6" fill="#3a5ba0"/>
                <ellipse cx="92" cy="144" rx="10" ry="6" fill="#e0e4ea"/>
                <ellipse class="bj-zapato-f" cx="110" cy="144" rx="10" ry="6" fill="#e0e4ea"/>
                <rect x="80" y="74" width="40" height="46" rx="16" fill="#4f7bd0"/>
                <rect class="bj-brazo" x="112" y="60" width="11" height="30" rx="5.5" fill="#ffcfa3"
                      transform="rotate(28 117 74)"/>
                <rect x="78" y="80" width="11" height="28" rx="5.5" fill="#ffcfa3"/>
                <circle cx="100" cy="56" r="20" fill="#ffcfa3"/>
                <path d="M80 52 a20 20 0 0 1 40 0 q-8 -10 -20 -10 q-12 0 -20 10 z" fill="#6b4423"/>
                <circle cx="94" cy="56" r="2.4" fill="#3a2b1a"/>
                <circle cx="106" cy="56" r="2.4" fill="#3a2b1a"/>
                <path d="M94 63 q6 5 12 0" stroke="#c0392b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
            </g>
        </svg>`;
    }

    // Abre el banco de juegos (prototipo). Al volver, re-renderiza la portada.
    function abrirJuegos() {
        if (!window.BancoJuegos) return;
        const color = (arbol && arbol.ambiente && arbol.ambiente.color_hex) || '';
        window.BancoJuegos.abrir({
            $paso,
            color,
            onVolver: function () {
                renderPortada();
                enlazarEventosPortada();
            },
        });
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

        $paso.on('click.rn', '#rnZonaJuegos', function (e) {
            e.preventDefault();
            abrirJuegos();
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
        fondoImg = String($app.data('fondo-img') || '');
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
