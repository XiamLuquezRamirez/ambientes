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

    function botonCerrarVista() {
        return '<button type="button" class="bj-cerrar" data-bj-volver aria-label="Cerrar">'
            + '<i class="fa-solid fa-xmark" aria-hidden="true"></i> Cerrar</button>';
    }

    function renderCargando() {
        ctx.$paso.attr('data-paso', 'juegos').html(`
            <div class="bj-galeria">
                <div class="bj-galeria-top">
                    <h2 class="bj-galeria-titulo">
                        <span class="bj-emoji" aria-hidden="true">🎮</span> Juegos
                    </h2>
                    ${botonCerrarVista()}
                </div>
                <p class="bj-vacio">Cargando juegos del ambiente…</p>
            </div>
        `);
    }

    function renderVacio(mensaje) {
        ctx.$paso.find('.bj-galeria').html(`
            <div class="bj-galeria-top">
                <h2 class="bj-galeria-titulo">
                    <span class="bj-emoji" aria-hidden="true">🎮</span> Juegos
                </h2>
                ${botonCerrarVista()}
            </div>
            <p class="bj-vacio">${escapar(mensaje)}</p>
        `);
    }

    function renderGaleria() {
        const cards = juegos.map((j) => {
            const color = j.color || '#2563eb';
            const desc = j.descripcion || '';
            const badge = j.tipo_label || 'Juego';
            return `
            <button type="button" class="bj-card" data-juego-slug="${escapar(j.slug)}"
                    data-url-paquete="${escapar(j.url_paquete || '')}"
                    style="--c:${escapar(color)}">
                <span class="bj-card-badge">${escapar(badge)}</span>
                <span class="bj-card-emoji" aria-hidden="true">${iconoHtml(j)}</span>
                <h3 class="bj-card-titulo">${escapar(j.nombre)}</h3>
                ${desc ? `<p class="bj-card-desc">${escapar(desc)}</p>` : ''}
            </button>`;
        }).join('');

        ctx.$paso.attr('data-paso', 'juegos').html(`
            <div class="bj-galeria">
                <div class="bj-galeria-top">
                    <h2 class="bj-galeria-titulo">
                        <span class="bj-emoji" aria-hidden="true">🎮</span> Juegos
                    </h2>
                    ${botonCerrarVista()}
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

    /** Añade ?edad=N al paquete para que el juego no dependa solo del postMessage. */
    function urlPaqueteConEdad(url, perfil) {
        if (!url) return url;
        const edad = perfil && perfil.edad != null && perfil.edad !== ''
            ? parseInt(String(perfil.edad), 10)
            : NaN;
        if (!isFinite(edad)) return url;
        try {
            const u = new URL(url, window.location.origin);
            u.searchParams.set('edad', String(edad));
            return u.pathname + u.search + u.hash;
        } catch (e) {
            const sep = url.indexOf('?') >= 0 ? '&' : '?';
            return url + sep + 'edad=' + encodeURIComponent(String(edad));
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
        const perfil = perfilPayload();
        const url = urlPaqueteConEdad(juego.url_paquete, perfil);
        if (!url) return;

        const $g = ctx.$paso.find('.bj-galeria');
        const $player = $(`
            <div class="bj-player" data-bj-player>
                <div class="bj-player-top">
                    <h3 class="bj-player-titulo">${iconoHtml(juego)} ${escapar(juego.nombre)}</h3>
                    <button type="button" class="bj-salir-juego" data-bj-cerrar-juego>Cerrar</button>
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

    function juegoPorSlug(slug) {
        const clave = String(slug || '').trim();
        if (!clave) return null;
        return juegos.find((j) => String(j.slug || '') === clave) || null;
    }

    function enlazar() {
        ctx.$paso.off('click.bj');
        ctx.$paso.on('click.bj', '[data-bj-volver]', function () {
            cerrarJuego();
            if (ctx.onVolver) ctx.onVolver();
        });
        ctx.$paso.on('click.bj', '[data-bj-cerrar-juego]', function () {
            cerrarJuego();
        });
        ctx.$paso.on('click.bj', '.bj-card', function () {
            const $card = $(this);
            let juego = juegoPorSlug($card.attr('data-juego-slug'));
            if (!juego) {
                const url = String($card.attr('data-url-paquete') || '').trim();
                if (!url) return;
                juego = {
                    nombre: $card.find('.bj-card-titulo').text() || 'Juego',
                    url_paquete: url,
                    icono: 'fa-gamepad',
                };
            }
            if (juego.url_paquete) montarJuego(juego);
        });
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
                juegos = Array.isArray(json.data?.juegos)
                    ? json.data.juegos.filter((j) => j.slug && j.url_paquete)
                    : [];
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
