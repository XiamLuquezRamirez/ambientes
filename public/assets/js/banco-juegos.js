/**
 * banco-juegos.js — Catálogo de paquetes del ambiente (kiosco niño).
 *
 * API:
 *   window.BancoJuegos.abrir({ $paso, color, onVolver, urlCatalogo })
 *
 * Carga GET /juegos-catalogo filtrado por el ambiente del nodo y abre cada
 * paquete en un iframe (mismo origen que PedNia).
 */
(function ($) {
    'use strict';

    let ctx = null;
    let juegos = [];

    function escapar(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function urlCatalogo() {
        if (ctx && ctx.urlCatalogo) return ctx.urlCatalogo;
        const fromDom = document.getElementById('rnApp')?.getAttribute('data-url-juegos-catalogo');
        return fromDom || '/juegos-catalogo';
    }

    function iconoHtml(juego) {
        const fa = (juego.icono || 'fa-gamepad').replace(/^fa-/, '');
        return `<i class="fa-solid fa-${escapar(fa)}" aria-hidden="true"></i>`;
    }

    function renderCargando() {
        ctx.$paso.attr('data-paso', 'juegos').html(`
            <div class="bj-galeria">
                <div class="bj-galeria-top">
                    <button type="button" class="bj-volver" data-bj-volver>
                        <i class="fa-solid fa-arrow-left"></i><span>Volver</span>
                    </button>
                    <h2 class="bj-galeria-titulo">
                        <span class="bj-emoji" aria-hidden="true">🎮</span> Juegos
                    </h2>
                </div>
                <p class="bj-vacio">Cargando juegos del ambiente…</p>
            </div>
        `);
    }

    function renderVacio(mensaje) {
        ctx.$paso.find('.bj-galeria').html(`
            <div class="bj-galeria-top">
                <button type="button" class="bj-volver" data-bj-volver>
                    <i class="fa-solid fa-arrow-left"></i><span>Volver</span>
                </button>
                <h2 class="bj-galeria-titulo">
                    <span class="bj-emoji" aria-hidden="true">🎮</span> Juegos
                </h2>
            </div>
            <p class="bj-vacio">${escapar(mensaje)}</p>
        `);
    }

    function renderGaleria() {
        const cards = juegos.map((j) => {
            const color = j.color || '#2563eb';
            const desc = j.descripcion || j.tipo_label || '';
            return `
            <button type="button" class="bj-card" data-juego-id="${escapar(j.id)}"
                    data-url-paquete="${escapar(j.url_paquete || '')}"
                    style="--c:${escapar(color)}">
                <span class="bj-card-badge">Juego</span>
                <span class="bj-card-emoji" aria-hidden="true">${iconoHtml(j)}</span>
                <h3 class="bj-card-titulo">${escapar(j.nombre)}</h3>
                <p class="bj-card-desc">${escapar(desc)}</p>
            </button>`;
        }).join('');

        ctx.$paso.attr('data-paso', 'juegos').html(`
            <div class="bj-galeria">
                <div class="bj-galeria-top">
                    <button type="button" class="bj-volver" data-bj-volver>
                        <i class="fa-solid fa-arrow-left"></i><span>Volver</span>
                    </button>
                    <h2 class="bj-galeria-titulo">
                        <span class="bj-emoji" aria-hidden="true">🎮</span> Juegos
                    </h2>
                </div>
                <div class="bj-grid">${cards || '<p class="bj-vacio">Aún no hay juegos en este ambiente.</p>'}</div>
            </div>
        `);
    }

    function perfilPayload() {
        try {
            const el = document.getElementById('kiosco-perfil-params');
            if (!el) return null;
            return JSON.parse(el.textContent || 'null');
        } catch (e) {
            return null;
        }
    }

    function inyectarPerfil(frame) {
        const perfil = perfilPayload();
        if (!perfil || !frame || !frame.contentWindow) return;
        try {
            frame.contentWindow.__PEDNIA_PERFIL__ = perfil;
            frame.contentWindow.postMessage({
                type: 'pednia:perfil',
                perfil: perfil,
            }, window.location.origin);
        } catch (e) { /* noop */ }
    }

    function montarJuego(juego) {
        const url = juego.url_paquete;
        if (!url) return;

        const $g = ctx.$paso.find('.bj-galeria');
        const $player = $(`
            <div class="bj-player" data-bj-player>
                <div class="bj-player-top">
                    <h3 class="bj-player-titulo">
                        <span aria-hidden="true">${iconoHtml(juego)}</span>
                        ${escapar(juego.nombre)}
                    </h3>
                    <button type="button" class="bj-salir-juego" data-bj-salir-juego>
                        <i class="fa-solid fa-xmark"></i><span>Salir</span>
                    </button>
                </div>
                <div class="bj-canvas-wrap" data-bj-canvas>
                    <iframe class="bj-iframe"
                        title="${escapar(juego.nombre)}"
                        src="${escapar(url)}"
                        allow="autoplay; fullscreen"
                        referrerpolicy="same-origin"></iframe>
                </div>
            </div>
        `);
        $g.append($player);
        const frame = $player.find('iframe')[0];
        $(frame).on('load', function () {
            inyectarPerfil(frame);
        });
    }

    function cerrarJuego() {
        const $player = ctx.$paso.find('[data-bj-player]');
        const frame = $player.find('iframe')[0];
        if (frame) frame.src = 'about:blank';
        $player.remove();
    }

    function juegoPorId(id) {
        const n = Number(id);
        return juegos.find((j) => Number(j.id) === n) || null;
    }

    function enlazar() {
        ctx.$paso.off('click.bj');
        ctx.$paso.on('click.bj', '[data-bj-volver]', function () {
            cerrarJuego();
            if (ctx.onVolver) ctx.onVolver();
        });
        ctx.$paso.on('click.bj', '.bj-card', function () {
            const juego = juegoPorId($(this).data('juego-id'));
            if (juego && juego.url_paquete) montarJuego(juego);
        });
        ctx.$paso.on('click.bj', '[data-bj-salir-juego]', cerrarJuego);
    }

    function cargarYRender() {
        renderCargando();
        enlazar();
        return fetch(urlCatalogo(), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((json) => {
                if (!json || !json.success) {
                    throw new Error((json && json.message) || 'No se pudo cargar el catálogo');
                }
                juegos = Array.isArray(json.data?.juegos) ? json.data.juegos.filter((j) => j.url_paquete) : [];
                renderGaleria();
                enlazar();
            })
            .catch(function () {
                renderVacio('No pudimos cargar los juegos. Intenta de nuevo.');
                enlazar();
            });
    }

    function abrir(opciones) {
        ctx = {
            $paso: opciones.$paso,
            color: opciones.color || '',
            onVolver: opciones.onVolver || null,
            urlCatalogo: opciones.urlCatalogo || null,
        };
        if (ctx.color) ctx.$paso.css('--rn-color', ctx.color);
        juegos = [];
        cargarYRender();
    }

    window.BancoJuegos = { abrir };
})(jQuery);
