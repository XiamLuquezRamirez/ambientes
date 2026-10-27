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
    let bjAbriendoJuego = false;

    const BJ_APERTURA_MS = 720;

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

    /** StudlyCase como en JuegoCatalogoService::segmentoCarpeta. */
    function segmentoCarpeta(texto) {
        return String(texto || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9]+/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(function (w) {
                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            })
            .join('');
    }

    function slugAmbiente() {
        try {
            const arbol = JSON.parse(document.getElementById('rn-arbol')?.textContent || '{}');
            return String(arbol?.ambiente?.slug || '').trim();
        } catch (e) {
            return '';
        }
    }

    /**
     * Único punto personalizable del skin: fondo por ambiente.
     * Convención: catalogo_juegos/{Ambiente}/img/fondo_catalogo.png
     * Si no existe el archivo, el color de respaldo del CSS sigue viéndose.
     */
    function urlFondoGaleria() {
        const fallback = '/catalogo_juegos/Polimotor/img/fondo_catalogo.png';
        const seg = segmentoCarpeta(slugAmbiente());
        if (!seg || seg === 'Polimotor') return fallback;
        return '/catalogo_juegos/' + seg + '/img/fondo_catalogo.png';
    }

    /** Trazo de la portada: catalogo_juegos/{Ambiente}/img/fondo_portada_juegos.png */
    function urlFondoPortada() {
        const seg = segmentoCarpeta(slugAmbiente()) || 'Polimotor';
        return '/catalogo_juegos/' + seg + '/img/fondo_portada_juegos.png';
    }

    function estiloFondoGaleria() {
        return ' style="--bj-fondo:url(\'' + escapar(urlFondoGaleria()) + '\')"';
    }

    function cabeceraGaleria() {
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

    function renderCargando() {
        ctx.$paso.attr('data-paso', 'juegos').html(`
            <div class="bj-galeria"${estiloFondoGaleria()}>
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

    /** Misma paginación que la lista de alumnos: 8 por página (2×4) + slide. */
    const BJ_POR_PAGINA = 8;
    const BJ_COLS = 4;
    let bjPagina = {
        pagina: 0,
        animando: false,
        items: [],
        paginas: 1,
        timers: [],
    };

    function bjCancelarTimers() {
        bjPagina.timers.forEach(clearTimeout);
        bjPagina.timers = [];
    }

    function bjGrupo(indice) {
        return bjPagina.items.slice(indice * BJ_POR_PAGINA, (indice + 1) * BJ_POR_PAGINA);
    }

    function bjAnunciar($galeria) {
        const atras = $galeria.find('[data-bj-atras]')[0];
        const adelante = $galeria.find('[data-bj-adelante]')[0];
        const anuncio = $galeria.find('[data-bj-pagina]')[0];
        const n = bjPagina.items.length;
        const p = bjPagina.paginas;
        if (atras) atras.disabled = bjPagina.animando || bjPagina.pagina <= 0 || p < 2;
        if (adelante) adelante.disabled = bjPagina.animando || bjPagina.pagina >= p - 1 || p < 2;
        if (anuncio) {
            anuncio.textContent = n ? ('Página ' + (bjPagina.pagina + 1) + ' de ' + p) : '';
        }
        $galeria.toggleClass('bj-galeria--sin-paginas', p < 2);
    }

    function bjPintar($galeria) {
        const lista = $galeria.find('.bj-grid')[0];
        if (!lista) return;
        bjPagina.items.forEach(function (el, i) {
            const visible = i >= bjPagina.pagina * BJ_POR_PAGINA && i < (bjPagina.pagina + 1) * BJ_POR_PAGINA;
            el.hidden = !visible;
            el.style.position = '';
            el.style.left = '';
            el.style.top = '';
            el.style.width = '';
            el.style.height = '';
            el.style.transform = '';
            el.style.opacity = '';
            el.style.transition = '';
            el.style.visibility = '';
            el.style.zIndex = '';
            el.removeAttribute('aria-hidden');
        });
        $galeria.removeClass('bj-galeria--pasando');
        bjAnunciar($galeria);
    }

    function bjEspera(n) {
        return Math.max(0, n - 1) * 90 + 320;
    }

    function bjOrdenHorizontal(els, desdeLaDerecha) {
        let orden = [];
        for (let i = 0; i < els.length; i += BJ_COLS) {
            let fila = els.slice(i, i + BJ_COLS);
            if (desdeLaDerecha) fila = fila.slice().reverse();
            orden = orden.concat(fila);
        }
        return orden;
    }

    function bjIr($galeria, delta) {
        if (bjPagina.animando || !bjPagina.items.length) return;
        const destino = bjPagina.pagina + delta;
        if (destino < 0 || destino >= bjPagina.paginas) return;
        const lista = $galeria.find('.bj-grid')[0];
        if (!lista) return;

        const reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducir) {
            bjPagina.pagina = destino;
            bjPintar($galeria);
            return;
        }

        bjCancelarTimers();
        bjPagina.animando = true;
        $galeria.addClass('bj-galeria--pasando');
        bjAnunciar($galeria);

        const salen = bjGrupo(bjPagina.pagina).slice();
        const entran = bjGrupo(destino).slice();
        const haciaAdelante = delta > 0;
        const viaje = Math.round(window.innerWidth);
        const saleX = haciaAdelante ? -viaje : viaje;
        const entraX = -saleX;
        const ordenSalida = bjOrdenHorizontal(salen, !haciaAdelante);
        const ordenEntrada = bjOrdenHorizontal(entran, haciaAdelante);
        const paso = 90;
        const mov = 320;
        const pausa = 60;
        const transSalida = 'transform ' + mov + 'ms cubic-bezier(0.4, 0, 1, 1)';
        const transEntrada = 'transform ' + mov + 'ms cubic-bezier(0, 0, 0.2, 1)';

        ordenSalida.forEach(function (el, i) {
            bjPagina.timers.push(window.setTimeout(function () {
                el.style.zIndex = String(2 + i);
                el.style.transition = transSalida;
                el.style.transform = 'translateX(' + saleX + 'px)';
                el.setAttribute('aria-hidden', 'true');
            }, i * paso));
        });

        bjPagina.timers.push(window.setTimeout(function () {
            salen.forEach(function (el) { el.hidden = true; });
            entran.forEach(function (el) {
                el.hidden = false;
                el.style.transition = 'none';
                el.style.opacity = '1';
                el.style.transform = 'translateX(' + entraX + 'px)';
                el.setAttribute('aria-hidden', 'true');
            });
            void lista.offsetWidth;
            ordenEntrada.forEach(function (el, i) {
                bjPagina.timers.push(window.setTimeout(function () {
                    el.style.zIndex = String(2 + i);
                    el.style.transition = transEntrada;
                    el.style.transform = 'translateX(0)';
                    el.removeAttribute('aria-hidden');
                }, i * paso));
            });
        }, bjEspera(ordenSalida.length) + pausa));

        bjPagina.timers.push(window.setTimeout(function () {
            bjPagina.pagina = destino;
            bjPagina.animando = false;
            bjPintar($galeria);
        }, bjEspera(salen.length) + pausa + bjEspera(entran.length) + 50));
    }

    function iniciarPaginacion($galeria) {
        bjCancelarTimers();
        const lista = $galeria.find('.bj-grid')[0];
        bjPagina = {
            pagina: 0,
            animando: false,
            items: lista ? Array.prototype.slice.call(lista.querySelectorAll('.bj-card')) : [],
            paginas: 1,
            timers: [],
        };
        bjPagina.paginas = Math.max(1, Math.ceil(bjPagina.items.length / BJ_POR_PAGINA));
        bjPintar($galeria);

        $galeria.off('click.bjpag').on('click.bjpag', '[data-bj-atras]', function (ev) {
            ev.preventDefault();
            bjIr($galeria, -1);
        });
        $galeria.off('click.bjpagfwd').on('click.bjpagfwd', '[data-bj-adelante]', function (ev) {
            ev.preventDefault();
            bjIr($galeria, 1);
        });

        /* Deslizar / rueda horizontal, igual que la lista de alumnos. */
        const raiz = $galeria[0];
        if (!raiz) return;

        raiz.__bjGaleria = $galeria;
        if (raiz.__bjGesto) return;
        raiz.__bjGesto = true;

        let gesto = null;
        let anularClick = false;
        let ruedaAcumulada = 0;
        let ruedaUsada = false;
        let timerRueda = 0;

        raiz.addEventListener('pointerdown', function (ev) {
            anularClick = false;
            if (!ev.isPrimary || ev.button > 0 || bjPagina.paginas < 2) {
                gesto = null;
                return;
            }
            gesto = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
        });
        raiz.addEventListener('pointerup', function (ev) {
            if (!gesto || ev.pointerId !== gesto.id) return;
            const dx = ev.clientX - gesto.x;
            const dy = ev.clientY - gesto.y;
            gesto = null;
            if (Math.abs(dx) > 12 || Math.abs(dy) > 12) anularClick = true;
            if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                bjIr(raiz.__bjGaleria || $galeria, dx < 0 ? 1 : -1);
            }
        });
        raiz.addEventListener('pointercancel', function () { gesto = null; });
        raiz.addEventListener('click', function (ev) {
            if (!anularClick) return;
            anularClick = false;
            ev.preventDefault();
            ev.stopPropagation();
        }, true);
        raiz.addEventListener('dragstart', function (ev) { ev.preventDefault(); });
        raiz.addEventListener('wheel', function (ev) {
            if (Math.abs(ev.deltaX) <= Math.abs(ev.deltaY)) return;
            ev.preventDefault();
            if (bjPagina.paginas < 2) return;
            clearTimeout(timerRueda);
            timerRueda = window.setTimeout(function () {
                ruedaAcumulada = 0;
                ruedaUsada = false;
            }, 250);
            if (ruedaUsada) return;
            ruedaAcumulada += ev.deltaX;
            if (Math.abs(ruedaAcumulada) >= 60) {
                ruedaUsada = true;
                bjIr(raiz.__bjGaleria || $galeria, ruedaAcumulada > 0 ? 1 : -1);
            }
        }, { passive: false });
    }

    function navHtml() {
        return `
            <button type="button" class="bj-nav bj-nav--atras" data-bj-atras aria-label="Ocho juegos anteriores" disabled>
                <img src="/assets/images/selector-aula/atras.png" alt="">
            </button>
            <button type="button" class="bj-nav bj-nav--adelante" data-bj-adelante aria-label="Ocho juegos siguientes" disabled>
                <img src="/assets/images/selector-aula/adelante.png" alt="">
            </button>
            <p class="bj-pagina" data-bj-pagina aria-live="polite"></p>`;
    }

    function renderGaleria() {
        const cards = juegos.map((j, i) => {
            const color = j.color || '#2563eb';
            const oculto = i >= BJ_POR_PAGINA ? ' hidden' : '';
            return `
            <button type="button" class="bj-card"${oculto} data-juego-slug="${escapar(j.slug)}"
                    data-url-paquete="${escapar(j.url_paquete || '')}"
                    style="--c:${escapar(color)}">
                <span class="bj-card-emoji" aria-hidden="true">${iconoHtml(j)}</span>
                <h3 class="bj-card-titulo">${escapar(j.nombre)}</h3>
            </button>`;
        }).join('');

        ctx.$paso.attr('data-paso', 'juegos').html(`
            <div class="bj-galeria"${estiloFondoGaleria()}>
                ${cabeceraGaleria()}
                <div class="bj-carrusel">
                    ${navHtml()}
                    <div class="bj-grid">${cards || '<p class="bj-vacio">Aún no hay juegos en este ambiente.</p>'}</div>
                </div>
            </div>
        `);
        if (juegos.length) iniciarPaginacion(ctx.$paso.find('.bj-galeria'));
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

    /** ?icono=: imagen del juego en el catálogo, para la portada si el paquete no trae la suya. */
    function urlPaqueteConIcono(url, icono) {
        return urlPaqueteConParam(url, 'icono', icono);
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

        const pararAudioJuego = function () {
            try {
                if (win.PedniaSalir && typeof win.PedniaSalir.pararAudio === 'function') {
                    win.PedniaSalir.pararAudio();
                }
            } catch (e) { /* noop */ }
        };

        const salir = function (ev) {
            if (ev) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
            }
            pararAudioJuego();
            if (frame.isConnected) cerrarJuego();
        };

        doc.querySelectorAll('[onclick*="history.back"]').forEach(function (btn) {
            // Polimotor/comun/interfaz.css pinta el ícono por este selector; sin la marca queda invisible.
            btn.setAttribute('data-salir', '1');
            btn.removeAttribute('onclick');
            btn.addEventListener('click', salir);
        });

        try {
            const atras = win.history.back.bind(win.history);
            win.history.back = function () {
                if (frame.isConnected) {
                    pararAudioJuego();
                    cerrarJuego();
                    return;
                }
                atras();
            };
        } catch (e) { /* noop */ }
    }

    function reducirMovimientoApertura() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function limpiarEstadoApertura($galeria) {
        bjAbriendoJuego = false;
        const $g = $galeria && $galeria.length ? $galeria : ctx.$paso.find('.bj-galeria');
        $g.removeClass('bj-galeria--abriendo');
        $g.find('.bj-card--elegida').removeClass('bj-card--elegida');
        $g.find('.bj-apertura-fiesta').remove();
    }

    /** Chispas y destello desde la tarjeta (transición más “de niños”). */
    function fiestaDesdeTarjeta($g, $card, color) {
        if (!$g.length || !$card.length) return;
        $g.find('.bj-apertura-fiesta').remove();

        const galeria = $g[0];
        const cardEl = $card[0];
        const rect = cardEl.getBoundingClientRect();
        const gRect = galeria.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - gRect.left;
        const cy = rect.top + rect.height / 2 - gRect.top;

        const fiesta = document.createElement('div');
        fiesta.className = 'bj-apertura-fiesta';
        fiesta.setAttribute('aria-hidden', 'true');
        fiesta.style.setProperty('--ox', cx + 'px');
        fiesta.style.setProperty('--oy', cy + 'px');
        fiesta.style.setProperty('--flash', color || '#4d96ff');

        const destello = document.createElement('div');
        destello.className = 'bj-apertura-destello';
        fiesta.appendChild(destello);

        const colores = ['#ffe066', '#ff6b6b', '#4d96ff', '#6bcb77', '#ff9ff3', '#fff', '#ffb347'];
        const formas = ['★', '●', '✦', '♥'];
        let i;
        for (i = 0; i < 18; i++) {
            const p = document.createElement('span');
            p.className = 'bj-apertura-chispa';
            const ang = (i / 18) * 360 + (Math.random() * 28 - 14);
            const dist = 90 + Math.random() * 150;
            const rad = ang * Math.PI / 180;
            p.style.setProperty('--dx', (Math.cos(rad) * dist) + 'px');
            p.style.setProperty('--dy', (Math.sin(rad) * dist) + 'px');
            p.style.setProperty('--rot', (Math.random() * 520 - 260) + 'deg');
            p.style.setProperty('--c', colores[i % colores.length]);
            p.style.setProperty('--delay', (Math.random() * 0.12) + 's');
            p.style.setProperty('--s', (0.75 + Math.random() * 0.65).toFixed(2));
            p.textContent = formas[i % formas.length];
            fiesta.appendChild(p);
        }

        const mando = document.createElement('span');
        mando.className = 'bj-apertura-mando';
        mando.setAttribute('aria-hidden', 'true');
        fiesta.appendChild(mando);

        galeria.appendChild(fiesta);
        window.setTimeout(function () {
            if (fiesta.parentNode) fiesta.remove();
        }, 1300);
    }

    function montarJuego(juego, $card) {
        if (bjAbriendoJuego || ctx.$paso.find('[data-bj-player]').length) return;

        const perfil = perfilPayload();
        const url = urlPaqueteConEdad(
            urlPaqueteConIcono(
                urlPaqueteConVolver(urlPaqueteConColor(juego.url_paquete, juego.color)),
                juego.imagen_url
            ),
            perfil
        );
        if (!url) return;

        const color = juego.color || '#64748b';
        const $g = ctx.$paso.find('.bj-galeria');
        const reducir = reducirMovimientoApertura();
        const espera = reducir ? 0 : BJ_APERTURA_MS;

        bjAbriendoJuego = true;
        if ($card && $card.length && !reducir) {
            $g.find('.bj-card--elegida').removeClass('bj-card--elegida');
            $card.addClass('bj-card--elegida');
            $g.addClass('bj-galeria--abriendo');
            fiestaDesdeTarjeta($g, $card, color);
        }

        function insertarPlayer() {
            const $player = $(`
                <div class="bj-player bj-player--entrada" data-bj-player style="--juego-color:${escapar(color)};--fondo-portada:url('${escapar(urlFondoPortada())}')">
                    <div class="bj-apertura-cargando" aria-hidden="true">
                        <span class="bj-apertura-cargando-icono"></span>
                        <span class="bj-apertura-cargando-texto">¡Vamos!</span>
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

            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () {
                    $player.removeClass('bj-player--entrada').addClass('bj-player--rebote');
                });
            });

            $(frame).on('load', function () {
                inyectarPerfil(frame);
                engancharSalida(frame);
                $player.addClass('bj-player--listo');
                limpiarEstadoApertura($g);
            });

            window.setTimeout(function () {
                if (!$player.isConnected) return;
                $player.addClass('bj-player--listo');
                limpiarEstadoApertura($g);
            }, espera + 1100);
        }

        if (espera > 0) {
            window.setTimeout(insertarPlayer, espera);
        } else {
            insertarPlayer();
        }
    }

    function cerrarJuego() {
        const $player = ctx.$paso.find('[data-bj-player]');
        const frame = $player.find('iframe')[0];
        if (frame) {
            try {
                const win = frame.contentWindow;
                if (win && win.PedniaSalir && typeof win.PedniaSalir.pararAudio === 'function') {
                    win.PedniaSalir.pararAudio();
                }
            } catch (e) { /* noop */ }
            frame.src = 'about:blank';
        }
        $player.remove();
        limpiarEstadoApertura();
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
            if (juego.url_paquete) montarJuego(juego, $card);
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
        };
        if (ctx.color) ctx.$paso.css('--rn-color', ctx.color);
        escucharSalidaJuego();
        juegos = [];
        cargarYRender();
    }

    window.BancoJuegos = { abrir };
})(jQuery);
