/**
 * recorrido-camino.js — Camino lineal del kiosco (mapa + personaje + modales).
 */
(function ($) {
    'use strict';

    const DURACION_MIN_MS = 1400;
    const DURACION_MAX_MS = 3200;

    let ctx = {};
    let camino = { paradas: [], puntos: [] };
    let indiceActual = 0;
    let indiceMaximoVisitado = 0;
    let caminando = false;
    let experienciaCargada = false;
    let duracionActualMs = 1800;
    let indiceModal = null;

    function escapar(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function paradaActual() {
        return camino.paradas[indiceActual] || null;
    }

    function pathSuave(puntos) {
        if (!puntos.length) return '';
        if (puntos.length === 1) return 'M ' + puntos[0].x + ' ' + puntos[0].y;

        let d = 'M ' + puntos[0].x + ' ' + puntos[0].y;
        for (let i = 0; i < puntos.length - 1; i += 1) {
            const p0 = puntos[i - 1] || puntos[i];
            const p1 = puntos[i];
            const p2 = puntos[i + 1];
            const p3 = puntos[i + 2] || p2;
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            d += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + p2.x + ' ' + p2.y;
        }
        return d;
    }

    function duracionEntre(desde, hasta) {
        const a = camino.puntos[desde];
        const b = camino.puntos[hasta];
        if (!a || !b) return 1800;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return Math.min(DURACION_MAX_MS, Math.max(DURACION_MIN_MS, Math.round(dist * 48)));
    }

    function aplicarDuracion(ms) {
        duracionActualMs = ms;
        const seg = (ms / 1000).toFixed(2) + 's';
        $('.rn-camino-root').css('--rn-camino-duracion', seg);
    }

    function orientarPersonaje(desde, hasta) {
        const a = camino.puntos[desde];
        const b = camino.puntos[hasta];
        if (!a || !b) return;
        $('#rnCaminoPersonaje').toggleClass('is-izquierda', b.x < a.x - 0.5);
    }

    function etiquetaMarcador(p, i) {
        if (p.id === 'inicio') return 'GO';
        if (p.id === 'fin') return 'FIN';
        return String(i + 1);
    }

    /** Puede ir a i: parada actual, cualquier visitada antes, o solo la siguiente. */
    function paradaEsAlcanzable(i) {
        if (caminando) return false;
        if (i === indiceActual) return true;
        if (i <= indiceMaximoVisitado) return true;
        if (i === indiceActual + 1) return true;
        return false;
    }

    function htmlMarcadores() {
        const ultima = camino.paradas.length - 1;
        return camino.paradas.map(function (p, i) {
            const pt = camino.puntos[i] || { x: 0, y: 0 };
            const visitada = i <= indiceMaximoVisitado;
            const activa = i === indiceActual;
            const siguiente = i === indiceActual + 1 && indiceActual < ultima;
            const alcanzable = paradaEsAlcanzable(i);
            const esInicio = p.id === 'inicio';
            const esMeta = p.id === 'fin';
            return ''
                + '<button type="button"'
                + ' class="rn-camino-parada'
                + (visitada ? ' is-visitada' : '')
                + (activa ? ' is-activa' : '')
                + (siguiente ? ' is-siguiente' : '')
                + (alcanzable ? ' is-alcanzable' : '')
                + (esInicio ? ' is-inicio' : '')
                + (esMeta ? ' is-meta' : '')
                + '"'
                + ' style="left:' + pt.x + '%;top:' + pt.y + '%"'
                + ' data-indice="' + i + '"'
                + ' data-rn-parada="' + escapar(p.id) + '"'
                + ' aria-label="' + escapar(p.etiqueta || 'Parada') + '"'
                + (alcanzable ? '' : ' tabindex="-1" disabled')
                + '>'
                + '<span class="rn-camino-parada__poste">'
                + '<span class="rn-camino-parada__num">' + escapar(etiquetaMarcador(p, i)) + '</span>'
                + '<span class="rn-camino-parada__pin"></span>'
                + '</span>'
                + '<span class="rn-camino-parada__label">' + escapar(p.etiqueta || '') + '</span>'
                + '</button>';
        }).join('');
    }

    function actualizarHud() {
        const total = camino.paradas.length;
        const pct = total <= 1 ? 100 : Math.round((indiceMaximoVisitado / (total - 1)) * 100);
        $('#rnCaminoHudFill').css('width', pct + '%');
        const p = paradaActual();
        const nombre = p?.etiqueta || 'Recorrido';
        const haySiguiente = indiceActual < total - 1;
        let hint = 'Toca una parada visitada para volver o ver su información';
        if (caminando) {
            hint = 'Caminando…';
        } else if (p?.id === 'fin') {
            hint = 'Toca FIN para cerrar el recorrido';
        } else if (p?.id === 'experiencia') {
            hint = 'Toca esta parada para iniciar la actividad';
        } else if (haySiguiente) {
            hint = 'Toca la siguiente parada en el mapa para avanzar';
        }
        $('#rnCaminoHudTexto').text('Paso ' + (indiceActual + 1) + ' de ' + total + ' · ' + nombre);
        $('#rnCaminoHudHint').text(hint);
    }

    function htmlMapa() {
        const d = pathSuave(camino.puntos);
        return `
            <div class="rn-camino-root">
                <div class="rn-camino-hud" aria-live="polite">
                    <div class="rn-camino-hud__bar">
                        <span class="rn-camino-hud__fill" id="rnCaminoHudFill"></span>
                    </div>
                    <p class="rn-camino-hud__texto" id="rnCaminoHudTexto">Paso 1 de 7</p>
                    <p class="rn-camino-hud__hint" id="rnCaminoHudHint">Toca la siguiente parada en el mapa para avanzar</p>
                </div>
                <div class="rn-camino-viewport" id="rnCaminoViewport">
                    <div class="rn-camino-mundo" id="rnCaminoMundo">
                        <svg class="rn-camino-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                            <path class="rn-camino-ruta-borde" d="${d}"></path>
                            <path class="rn-camino-ruta-asfalto" d="${d}"></path>
                            <path class="rn-camino-ruta-raya" d="${d}"></path>
                            <path class="rn-camino-ruta-progreso" id="rnCaminoProgreso" d="${d}"></path>
                        </svg>
                        <div class="rn-camino-decor" aria-hidden="true">
                            <span class="rn-camino-nube rn-camino-nube--a"></span>
                            <span class="rn-camino-nube rn-camino-nube--b"></span>
                            <span class="rn-camino-nube rn-camino-nube--c"></span>
                            <span class="rn-camino-arbol rn-camino-arbol--a"></span>
                            <span class="rn-camino-arbol rn-camino-arbol--b"></span>
                            <span class="rn-camino-arbol rn-camino-arbol--c"></span>
                            <span class="rn-camino-bush rn-camino-bush--a"></span>
                            <span class="rn-camino-bush rn-camino-bush--b"></span>
                        </div>
                        <div class="rn-camino-paradas" id="rnCaminoParadas">${htmlMarcadores()}</div>
                        <div class="rn-camino-personaje" id="rnCaminoPersonaje" aria-hidden="true">
                            <div class="rn-camino-personaje__sombra"></div>
                            <div class="rn-camino-personaje__cuerpo">
                                <span class="rn-camino-personaje__cara"></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="rn-camino-modal" id="rnCaminoModal" hidden role="dialog" aria-modal="true">
                    <div class="rn-camino-modal__backdrop" data-accion="cerrar"></div>
                    <div class="rn-camino-modal__panel">
                        <header class="rn-camino-modal__header">
                            <p class="rn-camino-modal__etiqueta" id="rnModalEtiqueta"></p>
                            <h2 class="rn-camino-modal__titulo" id="rnModalTitulo"></h2>
                        </header>
                        <div class="rn-camino-modal__video" id="rnModalVideo" hidden aria-hidden="true">
                            <span class="rn-camino-modal__video-placeholder">
                                <i class="fa-solid fa-circle-play"></i>
                                <span>Video</span>
                            </span>
                        </div>
                        <div class="rn-camino-modal__body" id="rnModalBody"></div>
                        <footer class="rn-camino-modal__footer" id="rnModalFooter"></footer>
                    </div>
                </div>
                <div class="rn-camino-modal rn-camino-modal--player" id="rnCaminoModalPlayer" hidden role="dialog" aria-modal="true">
                    <div class="rn-camino-modal__backdrop"></div>
                </div>
            </div>
        `;
    }

    function posicionarPersonaje(indice, animar, desdeIndice) {
        const pt = camino.puntos[indice];
        if (!pt) return;
        const $p = $('#rnCaminoPersonaje');
        if (animar && typeof desdeIndice === 'number') {
            orientarPersonaje(desdeIndice, indice);
            $p.addClass('is-caminando');
        }
        $p.css({ left: pt.x + '%', top: pt.y + '%' });
        if (animar) {
            setTimeout(function () {
                $p.removeClass('is-caminando');
            }, duracionActualMs);
        }
    }

    function enfocarCamara(indice) {
        const pt = camino.puntos[indice];
        if (!pt) return;
        const escala = window.innerWidth < 900 ? 1.06 : 1;
        const tx = (50 - pt.x) * 0.32;
        const ty = (50 - pt.y) * 0.18;
        $('#rnCaminoMundo').css('transform', 'scale(' + escala + ') translate(' + tx + '%, ' + ty + '%)');
    }

    function actualizarMarcadores() {
        $('#rnCaminoParadas').html(htmlMarcadores());
        actualizarProgresoRuta();
        actualizarHud();
    }

    function actualizarProgresoRuta() {
        const $prog = $('#rnCaminoProgreso');
        if (!$prog.length) return;
        const len = $prog[0].getTotalLength ? $prog[0].getTotalLength() : 1000;
        const max = Math.max(camino.puntos.length - 1, 1);
        const ratio = indiceMaximoVisitado / max;
        $prog.css('stroke-dasharray', len);
        $prog.css('stroke-dashoffset', len * (1 - ratio));
    }

    function cerrarModal() {
        $('#rnCaminoModal').prop('hidden', true);
        indiceModal = null;
    }

    function cerrarPlayer() {
        if (window.VistaNino && typeof window.VistaNino.detener === 'function') {
            window.VistaNino.detener();
        }
        const $player = ctx.$player;
        if ($player && $player.length) {
            $player.prop('hidden', true).removeClass('rn-player--camino-overlay').attr('aria-hidden', 'true');
        }
        $('#rnCaminoModalPlayer').prop('hidden', true);
        experienciaCargada = false;
    }

    function htmlModalFooter(p, indice) {
        if (p.id === 'fin') {
            return '<button type="button" class="rn-camino-btn rn-camino-btn--pri rn-camino-btn--fin" id="rnModalSalirKiosco">Salir</button>';
        }
        if (p.id === 'experiencia') {
            return ''
                + '<button type="button" class="rn-camino-btn rn-camino-btn--sec" data-accion="cerrar">Cerrar</button>'
                + '<button type="button" class="rn-camino-btn rn-camino-btn--pri" data-accion="iniciar-experiencia"'
                + (indiceActual === indice ? '' : ' disabled')
                + '>Iniciar experiencia</button>';
        }
        return '<button type="button" class="rn-camino-btn rn-camino-btn--pri" data-accion="cerrar">Cerrar</button>';
    }

    function abrirModalParada(indice) {
        const p = camino.paradas[indice];
        if (!p || indice > indiceMaximoVisitado) return;

        indiceModal = indice;
        const tieneVideo = !!(p.video_url || p.videoUrl);

        $('#rnModalEtiqueta').text(p.etiqueta || '');
        $('#rnModalTitulo').text(p.titulo || '');

        if (p.icono) {
            $('#rnModalBody').html(
                '<p class="rn-camino-modal__icono" aria-hidden="true">' + escapar(p.icono) + '</p>'
                + '<p class="rn-camino-modal__texto">' + escapar(p.texto || '').replace(/\n\n/g, '</p><p class="rn-camino-modal__texto">') + '</p>'
            );
        } else {
            const texto = escapar(p.texto || '').replace(/\n\n/g, '</p><p class="rn-camino-modal__texto">');
            $('#rnModalBody').html('<p class="rn-camino-modal__texto">' + texto + '</p>');
        }

        if (tieneVideo) {
            $('#rnModalVideo').prop('hidden', false);
        } else {
            $('#rnModalVideo').prop('hidden', true);
        }

        $('#rnModalFooter').html(htmlModalFooter(p, indice));
        $('#rnCaminoModal').prop('hidden', false);
    }

    function tocarParada(indice) {
        if (!paradaEsAlcanzable(indice)) return;

        if (indice === indiceActual) {
            if (indice <= indiceMaximoVisitado) {
                abrirModalParada(indice);
            }
            return;
        }

        caminarA(indice);
    }

    function urlExperiencia(id) {
        return String(ctx.urlExperienciaTpl || '').replace('__ID__', String(id));
    }

    function indiceParadaExperiencia() {
        return camino.paradas.findIndex(function (p) { return p.id === 'experiencia'; });
    }

    function abrirExperiencia() {
        cerrarModal();
        const idxExp = indiceParadaExperiencia();
        if (idxExp < 0 || indiceActual !== idxExp) {
            return;
        }
        const p = camino.paradas[idxExp];
        const expId = p?.experiencia_id || camino.experiencia_id;
        if (!expId) return;

        const $player = ctx.$player;
        $player.prop('hidden', false).attr('aria-hidden', 'false').addClass('rn-player--camino-overlay');
        $('#rnCaminoModalPlayer').prop('hidden', false);

        if (experienciaCargada) {
            return;
        }

        $.ajax({
            url: urlExperiencia(expId),
            method: 'GET',
            dataType: 'json',
        }).done(function (res) {
            const data = res?.data;
            if (!data?.bloques) {
                alert('No se pudo cargar la experiencia.');
                cerrarPlayer();
                return;
            }
            experienciaCargada = true;
            if (window.VistaNino && typeof window.VistaNino.iniciar === 'function') {
                window.VistaNino.iniciar({
                    bloques: data.bloques,
                    mediaBase: data.media_base || '',
                    experienciaNombre: data.experiencia?.nombre || 'Experiencia',
                    poll: false,
                });
            }
        }).fail(function (xhr) {
            alert(xhr?.responseJSON?.message || 'No se pudo cargar la experiencia.');
            cerrarPlayer();
        });
    }

    function irAFinRecorrido() {
        cerrarPlayer();
        cerrarModal();
        const indiceFin = camino.paradas.findIndex(function (p) { return p.id === 'fin'; });
        if (indiceFin < 0 || indiceActual === indiceFin) return;

        const desde = indiceActual;
        aplicarDuracion(duracionEntre(desde, indiceFin));
        caminando = true;
        actualizarHud();
        posicionarPersonaje(indiceFin, true, desde);
        enfocarCamara(indiceFin);
        setTimeout(function () {
            indiceActual = indiceFin;
            indiceMaximoVisitado = Math.max(indiceMaximoVisitado, indiceFin);
            caminando = false;
            actualizarMarcadores();
        }, duracionActualMs);
    }

    function caminarA(indice, alLlegar) {
        if (caminando || indice === indiceActual) {
            if (alLlegar) alLlegar();
            return;
        }

        if (indice > indiceActual + 1 || indice > indiceMaximoVisitado + 1) {
            return;
        }

        cerrarModal();
        const desde = indiceActual;
        aplicarDuracion(duracionEntre(desde, indice));
        caminando = true;
        actualizarHud();
        posicionarPersonaje(indice, true, desde);
        enfocarCamara(indice);
        setTimeout(function () {
            indiceActual = indice;
            indiceMaximoVisitado = Math.max(indiceMaximoVisitado, indice);
            caminando = false;
            actualizarMarcadores();
            if (alLlegar) alLlegar();
        }, duracionActualMs);
    }

    function salirKiosco() {
        cerrarModal();
        if (typeof ctx.onSalir === 'function') {
            ctx.onSalir();
        }
    }

    function enlazarEventos() {
        ctx.$paso.off('click.rnCamino');
        ctx.$paso.on('click.rnCamino', '[data-accion="cerrar"]', function (e) {
            e.preventDefault();
            cerrarModal();
        });
        ctx.$paso.on('click.rnCamino', '[data-accion="iniciar-experiencia"]', function (e) {
            e.preventDefault();
            abrirExperiencia();
        });
        ctx.$paso.on('click.rnCamino', '#rnModalSalirKiosco', function (e) {
            e.preventDefault();
            salirKiosco();
        });
        ctx.$paso.on('click.rnCamino', '.rn-camino-parada.is-alcanzable', function (e) {
            e.preventDefault();
            const indice = Number($(this).data('indice'));
            if (Number.isNaN(indice)) return;
            tocarParada(indice);
        });

        $('#rnBtnSalirExperiencia').off('click.rnCamino').on('click.rnCamino', function (e) {
            e.preventDefault();
            irAFinRecorrido();
        });
    }

    function render() {
        ctx.$shell.addClass('rn-shell--camino');
        ctx.$paso.attr('data-paso', 'camino');
        ctx.$paso.html(htmlMapa());
        indiceActual = 0;
        indiceMaximoVisitado = 0;
        aplicarDuracion(1800);
        posicionarPersonaje(0, false);
        enfocarCamara(0);
        actualizarProgresoRuta();
        actualizarHud();
        enlazarEventos();

        requestAnimationFrame(function () {
            actualizarProgresoRuta();
        });

        $(window).off('resize.rnCamino').on('resize.rnCamino', function () {
            enfocarCamara(indiceActual);
        });
    }

    function boot(options) {
        ctx = options || {};
        try {
            camino = JSON.parse(document.getElementById('rn-camino')?.textContent || '{}');
        } catch (e) {
            camino = { paradas: [], puntos: [] };
        }

        if (!camino.paradas?.length || !camino.puntos?.length) {
            return false;
        }

        cerrarPlayer();
        render();
        return true;
    }

    window.KioscoCamino = {
        boot: boot,
        irAFinRecorrido: irAFinRecorrido,
    };
})(jQuery);
