/**
 * banco-juegos.js — Banco de juegos del niño (PROTOTIPO VISUAL, sin backend).
 *
 *   - Muestra una galería de juegos (datos mock) sobre el contenedor #rnPaso.
 *   - Al tocar un juego, abre un "reproductor" con el HUECO donde luego irá el
 *     <canvas> de Unity WebGL (por ahora: carga simulada + placeholder).
 *
 * API pública:
 *   window.BancoJuegos.abrir({ $paso, color, onVolver })
 *      $paso   : jQuery del contenedor donde pintar (normalmente #rnPaso).
 *      color   : color del ambiente (para acentos). Opcional.
 *      onVolver: callback al pulsar "Volver" (para restaurar la portada/mapa).
 *
 * Cuando integremos Unity real, solo cambia `montarJuego()`:
 *   - cargar el build (loader.js) dentro de .bj-canvas-wrap
 *   - createUnityInstance(canvas, config, onProgress)
 *   - puente JS<->Unity para reportar resultados.
 */
(function ($) {
    'use strict';

    // ---- Datos MOCK: banco de juegos de ejemplo -------------------------------
    // id: identificador; luego será el slug/build de Unity.
    // motor: 'unity' (futuro) | 'web' (juegos JS actuales). Aquí todo mock.
    const JUEGOS_MOCK = [
        { id: 'memoria-animales', titulo: 'Memoria de Animales', desc: 'Encuentra las parejas iguales', emoji: '🐘', color: '#e0794f', motor: 'web' },
        { id: 'colores-magicos',  titulo: 'Colores Mágicos',     desc: 'Mezcla y descubre colores',    emoji: '🎨', color: '#8e5bd6', motor: 'web' },
        { id: 'formas-locas',     titulo: 'Formas Locas',        desc: 'Arrastra cada forma a su lugar', emoji: '🔷', color: '#3a8fd0', motor: 'unity' },
        { id: 'conteo-frutas',    titulo: 'Cuenta las Frutas',   desc: 'Aprende a contar del 1 al 10',  emoji: '🍎', color: '#4caf6d', motor: 'unity' },
        { id: 'sonidos-musica',   titulo: 'Sonidos y Música',    desc: 'Toca y escucha los sonidos',    emoji: '🎵', color: '#d64f8e', motor: 'unity' },
        { id: 'laberinto-feliz',  titulo: 'Laberinto Feliz',     desc: 'Guía al amigo hasta la meta',   emoji: '🌟', color: '#c9a227', motor: 'unity' },
        { id: 'rompecabezas',     titulo: 'Rompecabezas',        desc: 'Arma la imagen pieza a pieza',  emoji: '🧩', color: '#5b8def', motor: 'unity' },
        { id: 'emociones',        titulo: 'Mis Emociones',       desc: '¿Cómo te sientes hoy?',         emoji: '😊', color: '#e06a4f', motor: 'unity' },
    ];

    function escapar(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    let ctx = null;        // { $paso, color, onVolver }
    let loaderTimer = null;
    let juegoActivo = null; // instancia del juego web montado (con .destruir())

    // ---- Galería ---------------------------------------------------------------
    function render() {
        const cards = JUEGOS_MOCK.map((j) => `
            <button type="button" class="bj-card" data-juego-id="${escapar(j.id)}"
                    style="--c:${escapar(j.color)}">
                <span class="bj-card-badge">Juego</span>
                <span class="bj-card-emoji" aria-hidden="true">${escapar(j.emoji)}</span>
                <h3 class="bj-card-titulo">${escapar(j.titulo)}</h3>
                <p class="bj-card-desc">${escapar(j.desc)}</p>
            </button>
        `).join('');

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
                <div class="bj-grid">${cards}</div>
            </div>
        `);
    }

    // ---- Reproductor mock (hueco de Unity) ------------------------------------
    function montarJuego(juego) {
        const $g = ctx.$paso.find('.bj-galeria');
        // superpone el reproductor sobre la galería
        const $player = $(`
            <div class="bj-player" data-bj-player>
                <div class="bj-player-top">
                    <h3 class="bj-player-titulo">
                        <span aria-hidden="true">${escapar(juego.emoji)}</span>
                        ${escapar(juego.titulo)}
                    </h3>
                    <button type="button" class="bj-salir-juego" data-bj-salir-juego>
                        <i class="fa-solid fa-xmark"></i><span>Salir</span>
                    </button>
                </div>
                <div class="bj-canvas-wrap" data-bj-canvas>
                    <div class="bj-unity-placeholder">
                        <div class="bj-unity-emoji" aria-hidden="true">${escapar(juego.emoji)}</div>
                        <p class="bj-unity-texto">Cargando <strong>${escapar(juego.titulo)}</strong>…</p>
                        <div class="bj-loader"><div class="bj-loader-fill" data-bj-loader></div></div>
                        <div class="bj-loader-pct" data-bj-pct>0%</div>
                        <p class="bj-unity-nota">Aquí se ejecutará el juego (Unity WebGL)</p>
                    </div>
                </div>
            </div>
        `);
        $g.append($player);
        simularCarga($player, juego);
    }

    // Carga simulada: rellena la barra hasta 100% y luego muestra el juego.
    // Los juegos web nativos cargan casi al instante (paso grande); los Unity
    // futuros mostrarán progreso real desde onProgress.
    function simularCarga($player, juego) {
        let pct = 0;
        const rapido = juego.motor === 'web';
        const paso = rapido ? 34 : 8;
        const cada = rapido ? 60 : 220;
        const $fill = $player.find('[data-bj-loader]');
        const $pctTxt = $player.find('[data-bj-pct]');
        clearInterval(loaderTimer);
        loaderTimer = setInterval(() => {
            pct = Math.min(100, pct + (paso + Math.random() * 8));
            $fill.css('width', pct + '%');
            $pctTxt.text(Math.round(pct) + '%');
            if (pct >= 100) {
                clearInterval(loaderTimer);
                mostrarListo($player, juego);
            }
        }, cada);
    }

    // Motores web nativos disponibles, por id de juego. Cada uno expone
    // montar(contenedorEl, opciones) y devuelve { destruir() }.
    function motorWeb(juego) {
        if (juego.id === 'memoria-animales' && window.JuegoMemoriaAnimales) {
            return window.JuegoMemoriaAnimales;
        }
        if (juego.id === 'colores-magicos' && window.JuegoColoresMagicos) {
            return window.JuegoColoresMagicos;
        }
        return null;
    }

    function parejasPerfil(juego) {
        if (juego.id !== 'memoria-animales') return undefined;
        const p = window.PedniaPerfil;
        if (!p || !p.activo || typeof p.v !== 'function') return 6;
        const max = Number(p.v('memoria_pares_max', 6));
        return Math.min(6, Math.max(2, max || 6));
    }

    function mostrarListo($player, juego) {
        const $canvas = $player.find('[data-bj-canvas]');
        const motor = (juego.motor === 'web') ? motorWeb(juego) : null;
        if (motor) {
            // Juego web REAL: se monta en el lienzo. Al ganar o volver, cierra.
            $canvas.empty();
            juegoActivo = motor.montar($canvas[0], {
                parejas: parejasPerfil(juego),
                onSalir: cerrarJuego,
                onGanar: function (datos) {
                    // Gancho para futura integración (evidencias/logros).
                    if (window.BancoJuegos && typeof window.BancoJuegos.onGanar === 'function') {
                        try { window.BancoJuegos.onGanar(juego, datos); } catch (e) { /* noop */ }
                    }
                },
            });
            return;
        }
        // Sin motor web (p. ej. juegos Unity aún sin build): placeholder.
        $canvas.html(`
            <div class="bj-unity-placeholder">
                <div class="bj-unity-emoji" aria-hidden="true">${escapar(juego.emoji)}</div>
                <p class="bj-unity-texto"><strong>${escapar(juego.titulo)}</strong><br>listo para jugar</p>
                <p class="bj-unity-nota">Aquí se ejecutará el juego (Unity WebGL)</p>
            </div>
        `);
    }

    function cerrarJuego() {
        clearInterval(loaderTimer);
        if (juegoActivo && typeof juegoActivo.destruir === 'function') {
            try { juegoActivo.destruir(); } catch (e) { /* noop */ }
        }
        juegoActivo = null;
        ctx.$paso.find('[data-bj-player]').remove();
    }

    // ---- Eventos ---------------------------------------------------------------
    function enlazar() {
        ctx.$paso.off('click.bj');
        ctx.$paso.on('click.bj', '[data-bj-volver]', function () {
            clearInterval(loaderTimer);
            if (ctx.onVolver) ctx.onVolver();
        });
        ctx.$paso.on('click.bj', '.bj-card', function () {
            const id = $(this).data('juego-id');
            const juego = JUEGOS_MOCK.find((j) => j.id === id);
            if (juego) montarJuego(juego);
        });
        ctx.$paso.on('click.bj', '[data-bj-salir-juego]', cerrarJuego);
    }

    // ---- API pública -----------------------------------------------------------
    function abrir(opciones) {
        ctx = {
            $paso: opciones.$paso,
            color: opciones.color || '',
            onVolver: opciones.onVolver || null,
        };
        if (ctx.color) ctx.$paso.css('--rn-color', ctx.color);
        render();
        enlazar();
    }

    window.BancoJuegos = { abrir, JUEGOS_MOCK };
})(jQuery);
