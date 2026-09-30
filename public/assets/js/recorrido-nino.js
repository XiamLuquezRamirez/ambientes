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
            ? `<div class="rn-portada-fondo" style="background-image:url('${escapar(fondoImg)}')" aria-hidden="true"></div>`
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

        const cuerpo = `
                <div class="rn-portada-main">
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
                </div>`;
        /* Con PNG 16:9: stage fijo para el mismo encuadre en ventana y fullscreen */
        $paso.html(usaFondo
            ? `<div class="rn-portada${claseFondo}">
                <div class="rn-portada-stage">
                    ${fondoLayer}
                    ${cuerpo}
                </div>
            </div>`
            : `<div class="rn-portada">
                ${cuerpo}
            </div>`
        );
        $shell.find('#rnElegir').remove();
        $shell.append(htmlElegir());
    }

    function htmlElegir() {
        return `
        <div class="rn-elegir" id="rnElegir" hidden>
            <button type="button" class="rn-elegir-fondo" id="rnElegirFondo" aria-label="Volver"></button>
            <div class="rn-elegir-panel" role="dialog" aria-modal="true" aria-labelledby="rnElegirTitulo">
                <h2 id="rnElegirTitulo" class="rn-elegir-titulo">¿Qué haremos hoy?</h2>
                <div class="rn-elegir-opciones">
                    <button type="button" class="rn-elegir-btn rn-elegir-btn--clase" id="rnBtnClase">
                        <span class="rn-elegir-icono" aria-hidden="true">
                            <span class="rn-elegir-rayos"></span>
                            ${svgProfe()}
                        </span>
                        <span class="rn-elegir-texto">Iniciar<br>clase</span>
                    </button>
                    <button type="button" class="rn-elegir-btn rn-elegir-btn--jugar" id="rnBtnJugar">
                        <span class="rn-elegir-icono rn-elegir-icono--mando" aria-hidden="true">
                            <span class="rn-elegir-rayos"></span>
                            ${svgMando()}
                        </span>
                        <span class="rn-elegir-texto">Jugar</span>
                    </button>
                </div>
            </div>
        </div>`;
    }

    function svgProfe() {
        return `
        <svg class="rn-elegir-profe" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
            <circle cx="40" cy="40" r="38" fill="#fff"/>
            <rect x="18" y="14" width="34" height="24" rx="3" fill="#58c37a"/>
            <rect x="22" y="18" width="26" height="16" rx="2" fill="#e8fff0"/>
            <path d="M24 22 h8 M24 26 h14 M24 30 h10" stroke="#3d9a5c" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="46" cy="46" r="13" fill="#f3c2a0"/>
            <path d="M34 44c1-10 8-16 16-14 6 1 10 6 10 12-8 1-16 2-26 2z" fill="#6b3a22"/>
            <circle cx="42" cy="46" r="1.5" fill="#3a2b1a"/>
            <circle cx="50" cy="46" r="1.5" fill="#3a2b1a"/>
            <path d="M43 51 q4 3 8 0" stroke="#c0392b" stroke-width="1.4" fill="none" stroke-linecap="round"/>
            <path d="M54 40 l10 -8" stroke="#f3c2a0" stroke-width="4" stroke-linecap="round"/>
            <path d="M62 28 l6 2 -2 5" fill="#f6d36b" stroke="#e0b84a" stroke-width="1"/>
        </svg>`;
    }

    function svgMando() {
        return `
        <svg class="rn-elegir-mando" viewBox="0 0 92 64" aria-hidden="true" focusable="false">
            <path d="M18 28c0-10 8-16 18-16h20c10 0 18 6 18 16 0 14-6 28-16 28-6 0-8-4-12-4s-6 4-12 4C24 56 18 42 18 28z" fill="#fff"/>
            <circle cx="34" cy="30" r="3.2" fill="#5b6cff"/>
            <path d="M34 22 v16 M26 30 h16" stroke="#5b6cff" stroke-width="3.2" stroke-linecap="round"/>
            <circle cx="58" cy="24" r="3.4" fill="#ff5a7a"/>
            <circle cx="66" cy="32" r="3.4" fill="#3ecf8e"/>
            <circle cx="58" cy="40" r="3.4" fill="#ffd24d"/>
            <circle cx="50" cy="32" r="3.4" fill="#4aa3ff"/>
        </svg>`;
    }

    let saliendoTarjeta = false;

    function abrirElegir() {
        const el = document.getElementById('rnElegir');
        if (!el) return;
        saliendoTarjeta = false;
        el.classList.remove('is-saliendo');
        el.querySelectorAll('.is-elegida, .is-ampliada').forEach(function (nodo) {
            nodo.classList.remove('is-elegida', 'is-ampliada');
        });
        el.hidden = false;
        void el.offsetWidth;
        el.classList.add('is-abierto');
        const primero = document.getElementById('rnBtnClase');
        if (primero) primero.focus();
    }

    function cerrarElegir() {
        if (saliendoTarjeta) return;
        const el = document.getElementById('rnElegir');
        if (!el || el.hidden) return;
        el.classList.remove('is-abierto');
        window.setTimeout(function () {
            if (!el.classList.contains('is-abierto')) el.hidden = true;
        }, 220);
        const iniciar = document.getElementById('rnBtnIniciarAmbiente');
        if (iniciar) iniciar.focus();
    }

    function lanzarEstrellas(btn) {
        // Estrellas que salen disparadas desde el centro de la tarjeta elegida.
        const iconos = ['⭐', '✨', '🌟', '💫'];
        const n = 10;
        for (let i = 0; i < n; i++) {
            const s = document.createElement('span');
            s.className = 'rn-elegir-estrella';
            s.textContent = iconos[i % iconos.length];
            const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
            const dist = 140 + Math.random() * 120;
            s.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
            s.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(0) + 'px');
            s.style.setProperty('--rot', (Math.random() * 540 - 270).toFixed(0) + 'deg');
            s.style.fontSize = (20 + Math.random() * 18).toFixed(0) + 'px';
            s.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
            btn.appendChild(s);
            void s.offsetWidth;
            s.classList.add('is-on');
        }
    }

    // Repertorio de formas (clip-path) reconocibles para el niño. Cada una con
    // su nombre por si se quiere mostrar. El cuadrado es el "reposo".
    // clip-path en % (escalan con el tamaño de la tarjeta). Evitamos path()
    // porque usa coordenadas en px y no se ajusta al tamaño del elemento.
    const RN_FORMAS = [
        { nombre: 'círculo', clip: 'circle(50% at 50% 50%)' },
        { nombre: 'estrella', clip: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
        { nombre: 'corazón', clip: 'polygon(50% 96%, 20% 66%, 6% 45%, 6% 27%, 20% 16%, 36% 18%, 50% 32%, 64% 18%, 80% 16%, 94% 27%, 94% 45%, 80% 66%)' },
        { nombre: 'flor', clip: 'polygon(50% 0%, 63% 12%, 80% 8%, 82% 26%, 98% 34%, 88% 50%, 98% 66%, 82% 74%, 80% 92%, 63% 88%, 50% 100%, 37% 88%, 20% 92%, 18% 74%, 2% 66%, 12% 50%, 2% 34%, 18% 26%, 20% 8%, 37% 12%)' },
        { nombre: 'triángulo', clip: 'polygon(50% 4%, 96% 92%, 4% 92%)' },
        { nombre: 'luna', clip: 'polygon(50% 2%, 24% 12%, 8% 38%, 8% 62%, 24% 88%, 50% 98%, 34% 84%, 26% 62%, 26% 38%, 34% 16%)' },
        { nombre: 'rombo', clip: 'polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)' },
        { nombre: 'hexágono', clip: 'polygon(25% 5%, 75% 5%, 98% 50%, 75% 95%, 25% 95%, 2% 50%)' },
    ];

    function barajar(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
    }

    function ampliarTarjeta(btn, despues) {
        if (saliendoTarjeta) return;
        saliendoTarjeta = true;
        const el = document.getElementById('rnElegir');
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!el || reduce) {
            despues();
            return;
        }
        btn.classList.add('is-elegida');
        el.classList.add('is-saliendo');

        // Destello y estrellas al elegir (puerta mágica).
        const flash = document.createElement('span');
        flash.className = 'rn-elegir-flash';
        btn.appendChild(flash);
        lanzarEstrellas(btn);

        // Ciclo de formas: la tarjeta va tomando varias formas reconocibles
        // (círculo, estrella, corazón, …) con un latido en cada cambio, y al
        // final se expande a pantalla completa para entrar a la vista.
        btn.classList.add('is-formando');
        const secuencia = barajar(RN_FORMAS).slice(0, 5); // 5 formas al azar
        const pasoMs = 260;
        let i = 0;
        const timer = window.setInterval(function () {
            if (i >= secuencia.length) {
                window.clearInterval(timer);
                // Última fase: volver a "cuadro" y expandir como puerta mágica.
                btn.classList.remove('is-formando');
                btn.style.clipPath = '';
                btn.style.webkitClipPath = '';
                btn.style.removeProperty('--forma');
                btn.classList.add('is-ampliada');
                flash.classList.add('is-on');
                return;
            }
            const f = secuencia[i];
            btn.style.clipPath = f.clip;
            btn.style.webkitClipPath = f.clip;
            btn.style.setProperty('--forma', f.clip); // para el borde (::before)
            // reinicia el latido en cada forma
            btn.classList.remove('rn-late');
            void btn.offsetWidth;
            btn.classList.add('rn-late');
            i += 1;
        }, pasoMs);

        // Tiempo total: ciclo de formas + expansión.
        window.setTimeout(despues, secuencia.length * pasoMs + 950);
    }

    function irAClase() {
        if (!urlContinuar) return;
        if (window.KioscoNav && window.KioscoNav.esRutaKiosco(urlContinuar)) {
            window.KioscoNav.ir(urlContinuar);
            return;
        }
        window.location.href = urlContinuar;
    }

    function abrirJuegos() {
        const url = '/alumnos?destino=juegos';
        if (window.KioscoNav && window.KioscoNav.esRutaKiosco('/alumnos')) {
            window.KioscoNav.ir(url);
            return;
        }
        window.location.href = url;
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

    function pedirFullscreenPortada() {
        if (!window.KioscoFsCore || window.KioscoFsCore.estaEnFullscreen()) {
            return Promise.resolve();
        }
        return window.KioscoFsCore.entrarFullscreen(true).catch(function () { /* iOS / permiso */ });
    }

    function enlazarEventosPortada() {
        $paso.off('click.rn').on('click.rn', '#rnBtnIniciarAmbiente', function () {
            pedirFullscreenPortada();
            abrirElegir();
        });

        $shell.off('click.rnElegir').on('click.rnElegir', '#rnBtnClase', function () {
            ampliarTarjeta(this, irAClase);
        });

        $shell.on('click.rnElegir', '#rnBtnJugar', function (e) {
            e.preventDefault();
            ampliarTarjeta(this, abrirJuegos);
        });

        $shell.on('click.rnElegir', '#rnElegirFondo', function () {
            cerrarElegir();
        });

        $(document).off('keydown.rnElegir').on('keydown.rnElegir', function (e) {
            if (e.key !== 'Escape') return;
            const el = document.getElementById('rnElegir');
            if (!el || el.hidden) return;
            cerrarElegir();
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
