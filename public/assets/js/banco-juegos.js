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
        if (juego.imagen_url) {
            return `<img class="bj-card-icono-img" src="${escapar(juego.imagen_url)}" alt="" decoding="async">`;
        }
        return '<i class="fa-solid fa-gamepad" aria-hidden="true"></i>';
    }

    function botonCerrarVista() {
        return '<button type="button" class="bj-cerrar" data-bj-volver aria-label="Cerrar">'
            + '<i class="fa-solid fa-xmark" aria-hidden="true"></i> Cerrar</button>';
    }

    function esPaquetePolimotor(url) {
        return /\/catalogo_juegos\/Polimotor\//i.test(String(url || ''));
    }

    function esAmbientePolimotor() {
        try {
            const arbol = JSON.parse(document.getElementById('rn-arbol')?.textContent || '{}');
            return /polimotor/i.test(String(arbol?.ambiente?.slug || ''));
        } catch (e) {
            return false;
        }
    }

    function claseGaleria() {
        return ctx.polimotor ? 'bj-galeria bj-galeria--polimotor' : 'bj-galeria';
    }

    function cabeceraGaleria() {
        if (ctx.polimotor) {
            return `
                <div class="bj-galeria-top">
                    <button type="button" class="kiosco-volver bj-volver" data-bj-volver>
                        <img src="/assets/images/selector-aula/volver.png" alt="Volver">
                    </button>
                    <h2 class="bj-galeria-titulo">
                        <span class="bj-galeria-mando" aria-hidden="true"></span> Juegos
                    </h2>
                </div>`;
        }
        return `
            <div class="bj-galeria-top">
                <h2 class="bj-galeria-titulo">
                    <span class="bj-emoji" aria-hidden="true">🎮</span> Juegos
                </h2>
                ${botonCerrarVista()}
            </div>`;
    }

    function renderCargando() {
        ctx.$paso.attr('data-paso', 'juegos').html(`
            <div class="${claseGaleria()}">
                ${cabeceraGaleria()}
                <p class="bj-vacio">Cargando juegos del ambiente…</p>
            </div>
        `);
    }

    function renderVacio(mensaje) {
        ctx.$paso.find('.bj-galeria').html(`
            ${cabeceraGaleria()}
            <p class="bj-vacio">${escapar(mensaje)}</p>
        `);
    }

    function renderGaleria() {
        if (!ctx.polimotor && juegos.some((j) => esPaquetePolimotor(j.url_paquete))) {
            ctx.polimotor = true;
        }
        const cards = juegos.map((j) => {
            const color = j.color || '#2563eb';
            const polimotor = esPaquetePolimotor(j.url_paquete);
            const desc = polimotor ? '' : (j.descripcion || '');
            const badge = polimotor ? '' : (j.tipo_label || 'Juego');
            return `
            <button type="button" class="bj-card${polimotor ? ' bj-card--polimotor' : ''}" data-juego-slug="${escapar(j.slug)}"
                    data-url-paquete="${escapar(j.url_paquete || '')}"
                    style="--c:${escapar(color)}">
                ${badge ? `<span class="bj-card-badge">${escapar(badge)}</span>` : ''}
                <span class="bj-card-emoji" aria-hidden="true">${iconoHtml(j)}</span>
                <h3 class="bj-card-titulo">${escapar(j.nombre)}</h3>
                ${desc ? `<p class="bj-card-desc">${escapar(desc)}</p>` : ''}
            </button>`;
        }).join('');

        ctx.$paso.attr('data-paso', 'juegos').html(`
            <div class="${claseGaleria()}">
                ${cabeceraGaleria()}
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

    function urlPaqueteConParam(url, clave, valor) {
        if (!url || valor == null || valor === '') return url;
        try {
            const u = new URL(url, window.location.origin);
            u.searchParams.set(clave, String(valor));
            return u.pathname + u.search + u.hash;
        } catch (e) {
            const sep = url.indexOf('?') >= 0 ? '&' : '?';
            return url + sep + clave + '=' + encodeURIComponent(String(valor));
        }
    }

    /** ?color=#hex: el paquete pinta su pantalla de inicio con el color del juego en BD. */
    function urlPaqueteConColor(url, color) {
        return urlPaqueteConParam(url, 'color', color);
    }

    /**
     * ?volver=1: el paquete muestra su botón "Volver" de la pantalla de inicio, que avisa
     * con postMessage 'pednia:salir-juego' (ver escucharSalidaJuego).
     */
    function urlPaqueteConVolver(url) {
        return urlPaqueteConParam(url, 'volver', '1');
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

    /**
     * El paquete sale con history.back() / onclick. Dentro del banco eso
     * cierra el iframe y vuelve a la galería, no a la página del kiosco.
     */
    function engancharSalida(frame) {
        let win;
        let doc;
        try {
            win = frame.contentWindow;
            doc = frame.contentDocument;
        } catch (e) {
            return;
        }
        if (!win || !doc || win.__pedniaSalidaEnganchada) return;
        win.__pedniaSalidaEnganchada = true;

        const salir = function (ev) {
            if (ev) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
            }
            if (frame.isConnected) cerrarJuego();
        };

        doc.querySelectorAll('[onclick*="history.back"]').forEach(function (btn) {
            btn.removeAttribute('onclick');
            btn.addEventListener('click', salir);
        });

        try {
            const atras = win.history.back.bind(win.history);
            win.history.back = function () {
                if (frame.isConnected) {
                    cerrarJuego();
                    return;
                }
                atras();
            };
        } catch (e) { /* noop */ }
    }

    function montarJuego(juego) {
        const perfil = perfilPayload();
        const url = urlPaqueteConEdad(
            urlPaqueteConVolver(urlPaqueteConColor(juego.url_paquete, juego.color)),
            perfil
        );
        if (!url) return;

        const $g = ctx.$paso.find('.bj-galeria');
        const $player = $(`
            <div class="bj-player" data-bj-player>
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
            engancharSalida(frame);
        });
    }

    function cerrarJuego() {
        const $player = ctx.$paso.find('[data-bj-player]');
        const frame = $player.find('iframe')[0];
        if (frame) frame.src = 'about:blank';
        $player.remove();
    }

    /**
     * A diferencia de engancharSalida (que espera al load del iframe), el mensaje funciona
     * desde que se pinta la pantalla de inicio del paquete.
     */
    function escucharSalidaJuego() {
        if (window.__bjSalidaJuegoEscuchada) return;
        window.__bjSalidaJuegoEscuchada = true;
        window.addEventListener('message', function (ev) {
            if (ev.origin !== window.location.origin) return;
            if (!ev.data || ev.data.type !== 'pednia:salir-juego' || !ctx) return;
            const frame = ctx.$paso.find('[data-bj-player] iframe')[0];
            if (frame && ev.source === frame.contentWindow) cerrarJuego();
        });
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
        ctx.$paso.on('click.bj', '.bj-card', function () {
            const $card = $(this);
            let juego = juegoPorSlug($card.attr('data-juego-slug'));
            if (!juego) {
                const url = String($card.attr('data-url-paquete') || '').trim();
                if (!url) return;
                juego = {
                    nombre: $card.find('.bj-card-titulo').text() || 'Juego',
                    url_paquete: url,
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
            })
            .then(function () {
                // La bienvenida espera este aviso para desarmarse sobre la galería ya pintada.
                document.dispatchEvent(new CustomEvent('kiosco:vista-lista'));
            });
    }

    function abrir(opciones) {
        ctx = {
            $paso: opciones.$paso,
            color: opciones.color || '',
            onVolver: opciones.onVolver || null,
            urlCatalogo: opciones.urlCatalogo || null,
            polimotor: esAmbientePolimotor(),
        };
        if (ctx.color) ctx.$paso.css('--rn-color', ctx.color);
        escucharSalidaJuego();
        juegos = [];
        cargarYRender();
    }

    window.BancoJuegos = { abrir };
})(jQuery);
