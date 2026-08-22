/**
 * constructor-vista-nino.js — Overlay tablet: navega la experiencia bloque a bloque
 */
(function ($) {
    'use strict';

    const $overlay = $('#vnOverlay');
    if (!$overlay.length) return;

    const $body = $('#vnScreenBody');
    const $progress = $('#vnProgress');
    const $stepLabel = $('#vnStepLabel');
    const $title = $('#vnTitle');
    const $blockName = $('#vnBlockName');
    const $btnPrev = $('#vnBtnPrev');
    const $btnNext = $('#vnBtnNext');
    const $tablet = $('#vnTablet');
    const $stage = $('#vnTabletStage');

    const SCREEN_W = 1280;
    const SCREEN_H = 800;

    let bloques = [];
    let index = 0;
    let mediaBase = '';
    let experienciaNombre = 'Experiencia';
    let historiaPage = 0;
    let retoPaso = 0;
    let intentosRestantes = null;
    let drawCtx = null;
    let paint = null;
    let paintListeners = [];
    let resizeTimer = null;

    const PAINT_SIZE_MAP = { s: 6, m: 12, l: 22 };
    const PAINT_DEFAULT_COLORS = [
        '#000000', '#FFFFFF', '#EF4444', '#F97316', '#F59E0B', '#FACC15',
        '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#A855F7',
        '#EC4899', '#78716C', '#94A3B8', '#64748B',
    ];

    const EMOCIONES = {
        4: [
            { id: 'feliz', emoji: '😊', label: 'Feliz' },
            { id: 'emocionado', emoji: '🤩', label: 'Emocionado' },
            { id: 'tranquilo', emoji: '😌', label: 'Tranquilo' },
            { id: 'confundido', emoji: '😕', label: 'Confundido' },
        ],
        6: [
            { id: 'feliz', emoji: '😊', label: 'Feliz' },
            { id: 'emocionado', emoji: '🤩', label: 'Emocionado' },
            { id: 'tranquilo', emoji: '😌', label: 'Tranquilo' },
            { id: 'confundido', emoji: '😕', label: 'Confundido' },
            { id: 'cansado', emoji: '😴', label: 'Cansado' },
            { id: 'nervioso', emoji: '😬', label: 'Nervioso' },
        ],
    };

    function escapar(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function mediaUrl(file) {
        if (!file) return '';
        const s = String(file);
        if (/^https?:\/\//i.test(s) || s.startsWith('/') || s.startsWith('data:')) return s;
        return String(mediaBase || '').replace(/\/$/, '') + '/' + s.replace(/^\//, '');
    }

    function datos(bloque) {
        return bloque?.datos || {};
    }

    function wrap(html, bloque, extraClass) {
        const warn = bloque && !bloque.completo
            ? '<div class="text-center"><span class="vn-badge-warn"><i class="fa-solid fa-triangle-exclamation"></i> Bloque incompleto</span></div>'
            : '';
        const cls = extraClass ? ` vn-card--${escapar(extraClass)}` : '';
        return `<div class="vn-card${cls}">${warn}${html}</div>`;
    }

    function instruccionHtml(texto) {
        const t = String(texto || '').trim();
        if (!t) return '<p class="vn-instruccion">¡Vamos a jugar!</p>';
        return `<p class="vn-instruccion">${escapar(t)}</p>`;
    }

    function imgTag(file, alt) {
        const url = mediaUrl(file);
        if (!url) return '';
        return `<div class="vn-media"><img src="${escapar(url)}" alt="${escapar(alt || '')}"></div>`;
    }

    function audioTag(file) {
        const url = mediaUrl(file);
        if (!url) return '<p class="vn-empty">Sin audio configurado</p>';
        return `<div class="vn-media"><audio controls src="${escapar(url)}"></audio></div>`;
    }

    function videoTag(file) {
        const url = mediaUrl(file);
        if (!url) return '<p class="vn-empty">Sin video configurado</p>';
        return `<div class="vn-media"><video controls playsinline src="${escapar(url)}"></video></div>`;
    }

    /* ── Renderers ───────────────────────────────────────────── */

    function renderBienvenida(bloque) {
        const d = datos(bloque);
        const personaje = (d.personaje || 'personaje') !== 'ninguno';
        return wrap(`
            ${personaje ? '<div class="vn-hero-emoji" aria-hidden="true">🦊</div>' : '<div class="vn-hero-emoji">👋</div>'}
            <h2 class="vn-title">¡Hola!</h2>
            ${instruccionHtml(d.instruccion)}
        `, bloque);
    }

    function renderAudio(bloque) {
        const d = datos(bloque);
        const url = mediaUrl(d.archivo);
        const reps = d.repeticiones || '1 vez';
        if (!url) {
            return wrap(`
                <div class="vn-hero-emoji">🔊</div>
                <h2 class="vn-title">Escucha</h2>
                ${instruccionHtml(d.instruccion)}
                <p class="vn-empty">Sin audio configurado</p>
            `, bloque, 'audio');
        }
        return wrap(`
            <h2 class="vn-title">Escucha</h2>
            ${instruccionHtml(d.instruccion)}
            <button type="button" class="vn-audio-btn" data-vn-audio-play
                data-reps="${escapar(reps)}" aria-label="Reproducir audio">
                <span class="vn-audio-btn-ring" aria-hidden="true"></span>
                <span class="vn-audio-btn-icon"><i class="fa-solid fa-play"></i></span>
                <span class="vn-audio-btn-label">Toca para escuchar</span>
            </button>
            <p class="vn-audio-status" data-vn-audio-status hidden>Sonando…</p>
            <audio class="vn-audio-el" preload="auto" src="${escapar(url)}" hidden></audio>
        `, bloque, 'audio');
    }

    function renderVideo(bloque) {
        const d = datos(bloque);
        const url = mediaUrl(d.archivo);
        if (!url) {
            return wrap(`
                <div class="vn-hero-emoji">🎬</div>
                <h2 class="vn-title">Mira el video</h2>
                ${instruccionHtml(d.instruccion)}
                <p class="vn-empty">Sin video configurado</p>
            `, bloque, 'video');
        }
        return wrap(`
            <h2 class="vn-title">Mira el video</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-video-stage" data-vn-video-stage>
                <button type="button" class="vn-video-btn" data-vn-video-play aria-label="Reproducir video">
                    <span class="vn-video-btn-ring" aria-hidden="true"></span>
                    <span class="vn-video-btn-icon"><i class="fa-solid fa-play"></i></span>
                    <span class="vn-video-btn-label">Toca para ver</span>
                </button>
                <video class="vn-video-el" playsinline preload="metadata" src="${escapar(url)}" hidden></video>
                <p class="vn-video-status" data-vn-video-status hidden>Reproduciendo…</p>
            </div>
        `, bloque, 'video');
    }

    function renderImagen(bloque) {
        const d = datos(bloque);
        return wrap(`
            <h2 class="vn-title">Observa</h2>
            ${instruccionHtml(d.instruccion)}
            ${imgTag(d.archivo, d.descripcion || 'Imagen') || '<p class="vn-empty">Sin imagen</p>'}
        `, bloque, 'imagen');
    }

    function renderHistoria(bloque) {
        const d = datos(bloque);
        const pages = Array.isArray(d.paginas_data) ? d.paginas_data : [];
        const total = Math.max(pages.length, Number(d.paginas) || 0, 1);
        if (historiaPage >= total) historiaPage = total - 1;
        if (historiaPage < 0) historiaPage = 0;
        const page = pages[historiaPage] || {};
        const audioUrl = mediaUrl(page.audio);
        const puedeAnt = historiaPage > 0;
        const puedeSig = historiaPage < total - 1;
        return wrap(`
            <h2 class="vn-title">Cuento</h2>
            <p class="vn-paso-badge vn-historia-badge">Página ${historiaPage + 1} de ${total}</p>
            ${historiaPage === 0 ? instruccionHtml(d.instruccion) : ''}
            ${imgTag(page.imagen, `Página ${historiaPage + 1}`) || '<p class="vn-empty">Sin imagen en esta página</p>'}
            ${audioUrl ? `<audio class="vn-historia-audio" preload="auto" src="${escapar(audioUrl)}" hidden></audio>` : ''}
            <div class="vn-historia-nav">
                <button type="button" class="vn-hist-nav-btn" data-vn-hist-prev ${puedeAnt ? '' : 'disabled'}>
                    <i class="fa-solid fa-arrow-left"></i> Anterior
                </button>
                <button type="button" class="vn-hist-nav-btn" data-vn-hist-next ${puedeSig ? '' : 'disabled'}>
                    Siguiente <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `, bloque, 'historia');
    }

    function renderRa(bloque) {
        const d = datos(bloque);
        return wrap(`
            <div class="vn-ra-stage">
                <div class="vn-hero-emoji">📱</div>
                <h2 class="vn-title">Realidad aumentada</h2>
                ${instruccionHtml(d.instruccion)}
                <div class="vn-ra-marker">${escapar(d.marcador || '?')}</div>
                <p class="vn-empty">Apunta al marcador ${escapar(d.marcador || '')}<br><small>${escapar(d.contenido || 'Animación 3D')}</small></p>
            </div>
        `, bloque);
    }

    function renderEvidencia(bloque) {
        const d = datos(bloque);
        const tipo = d.tipo || 'Foto';
        const icon = tipo.includes('Audio') ? 'fa-microphone' : (tipo.includes('Video') ? 'fa-video' : 'fa-camera');
        return wrap(`
            <h2 class="vn-title">¡Tu evidencia!</h2>
            ${instruccionHtml(d.instruccion)}
            <button type="button" class="vn-evidencia-btn" data-vn-evidencia>
                <i class="fa-solid ${icon}"></i>
                ${escapar(tipo)}
            </button>
            <div id="vnEvidenciaMsg" class="vn-feedback is-ok" hidden>¡Listo! (simulación)</div>
        `, bloque);
    }

    function puzzleDims(piezasStr) {
        const s = String(piezasStr || '');
        if (s.includes('9')) return { cols: 3, rows: 3, n: 9 };
        if (s.includes('6')) return { cols: 3, rows: 2, n: 6 };
        return { cols: 2, rows: 2, n: 4 };
    }

    function shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function renderRompecabezas(d) {
        const url = mediaUrl(d.juego_imagen);
        if (!url) {
            return '<p class="vn-empty">Sube una imagen del rompecabezas en la configuración</p>';
        }
        const { cols, rows, n } = puzzleDims(d.juego_piezas);
        const order = shuffleInPlace(Array.from({ length: n }, (_, i) => i));
        const slots = Array.from({ length: n }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            return `<div class="vn-puzzle-slot" data-vn-puzzle-slot="${i}" data-row="${r}" data-col="${c}"></div>`;
        }).join('');
        const pieces = order.map((idx) => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const posX = cols === 1 ? 0 : (c / (cols - 1)) * 100;
            const posY = rows === 1 ? 0 : (r / (rows - 1)) * 100;
            return `<button type="button" class="vn-puzzle-piece" data-vn-puzzle-piece="${idx}"
                style="background-image:url('${escapar(url)}');background-size:${cols * 100}% ${rows * 100}%;background-position:${posX}% ${posY}%;"
                aria-label="Pieza ${idx + 1}"></button>`;
        }).join('');
        return `
            <p class="vn-puzzle-meta">${escapar(d.juego_piezas || '4 piezas')} · Arrastra cada pieza a su lugar</p>
            <div class="vn-puzzle" data-vn-puzzle data-cols="${cols}" data-rows="${rows}" data-total="${n}">
                <div class="vn-puzzle-board" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);">${slots}</div>
                <div class="vn-puzzle-pool">${pieces}</div>
            </div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `;
    }

    function renderPaintToolbar(options) {
        const colors = options.colors || PAINT_DEFAULT_COLORS;
        const showShapes = !!options.showShapes;
        const customColor = options.fixedColors ? '' : `
            <label class="vn-paint-picker" title="Elegir otro color">
                <span class="vn-paint-picker-icon"><i class="fa-solid fa-eyedropper"></i></span>
                <input type="color" class="vn-paint-color-input" value="${escapar(colors[2] || '#EF4444')}" aria-label="Elegir color">
            </label>`;
        const shapes = showShapes ? `
            <button type="button" class="vn-paint-tool" data-vn-paint-tool="line" title="Línea" aria-label="Línea">
                <i class="fa-solid fa-minus"></i></button>
            <button type="button" class="vn-paint-tool" data-vn-paint-tool="rect" title="Rectángulo" aria-label="Rectángulo">
                <i class="fa-regular fa-square"></i></button>
            <button type="button" class="vn-paint-tool" data-vn-paint-tool="circle" title="Círculo" aria-label="Círculo">
                <i class="fa-regular fa-circle"></i></button>
            <button type="button" class="vn-paint-tool" data-vn-paint-tool="triangle" title="Triángulo" aria-label="Triángulo">
                <i class="fa-solid fa-play vn-icon-triangle"></i></button>` : '';
        const swatches = colors.map((c, i) =>
            `<button type="button" class="vn-paint-swatch ${i === 0 ? 'is-on' : ''}"
                data-vn-paint-color="${escapar(c)}" style="background:${escapar(c)}"
                title="Color ${i + 1}" aria-label="Color ${i + 1}"></button>`
        ).join('');
        return `
            <aside class="vn-paint-toolbar" aria-label="Herramientas de dibujo">
                <div class="vn-paint-group">
                    <span class="vn-paint-label">Herramientas</span>
                    <div class="vn-paint-tools">
                        <button type="button" class="vn-paint-tool is-on" data-vn-paint-tool="brush" title="Pincel" aria-label="Pincel">
                            <i class="fa-solid fa-paintbrush"></i></button>
                        <button type="button" class="vn-paint-tool" data-vn-paint-tool="eraser" title="Goma" aria-label="Goma">
                            <i class="fa-solid fa-eraser"></i></button>
                        ${shapes}
                    </div>
                </div>
                <div class="vn-paint-group">
                    <span class="vn-paint-label">Grosor</span>
                    <div class="vn-paint-sizes">
                        <button type="button" class="vn-paint-size" data-vn-paint-size="s" title="Trazo fino" aria-label="Trazo fino">
                            <span class="vn-paint-size-line" style="--vn-line:4px"></span></button>
                        <button type="button" class="vn-paint-size is-on" data-vn-paint-size="m" title="Trazo mediano" aria-label="Trazo mediano">
                            <span class="vn-paint-size-line" style="--vn-line:10px"></span></button>
                        <button type="button" class="vn-paint-size" data-vn-paint-size="l" title="Trazo grueso" aria-label="Trazo grueso">
                            <span class="vn-paint-size-line" style="--vn-line:18px"></span></button>
                    </div>
                </div>
                <div class="vn-paint-group vn-paint-group--colors">
                    <span class="vn-paint-label">Colores</span>
                    <div class="vn-paint-colors">${swatches}${customColor}</div>
                </div>
                <div class="vn-paint-group">
                    <span class="vn-paint-label">Acciones</span>
                    <div class="vn-paint-actions">
                        <button type="button" class="vn-paint-action" data-vn-paint-undo title="Deshacer" aria-label="Deshacer">
                            <i class="fa-solid fa-rotate-left"></i></button>
                    </div>
                </div>
            </aside>`;
    }

    function renderColorear(d) {
        const url = mediaUrl(d.juego_imagen);
        if (!url) {
            return '<p class="vn-empty">Sube una imagen en blanco y negro en la configuración</p>';
        }
        const n = (() => {
            const s = String(d.juego_piezas || '');
            if (s.includes('9')) return 9;
            if (s.includes('6')) return 6;
            return 4;
        })();
        const defaults = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
        const colores = Array.isArray(d.colores_zonas) && d.colores_zonas.length
            ? d.colores_zonas.slice(0, n)
            : defaults.slice(0, n);
        while (colores.length < n) colores.push(defaults[colores.length] || '#22C55E');
        const toolbar = renderPaintToolbar({ colors: colores, fixedColors: true, showShapes: false });
        return `
            <p class="vn-puzzle-meta">Elige un color y pinta con el dedo. El docente revisará tu dibujo.</p>
            <div class="vn-paint vn-paint--colorear" data-vn-paint="colorear">
                ${toolbar}
                <div class="vn-paint-stage vn-colorear-stage">
                    <div class="vn-colorear-bg" style="background-image:url('${escapar(url)}')"></div>
                    <canvas id="vnCanvas" class="vn-colorear-canvas" width="1100" height="825"></canvas>
                </div>
            </div>`;
    }

    function renderSecuencia(d) {
        const items = [1, 2, 3, 4]
            .map((i) => ({ orden: i - 1, file: d[`seq_${i}`] }))
            .filter((x) => x.file);
        if (items.length < 3) {
            return '<p class="vn-empty">Sube 3 o 4 imágenes en orden en la configuración</p>';
        }
        const deck = items.slice();
        let guard = 0;
        do {
            shuffleInPlace(deck);
            guard++;
        } while (guard < 24 && deck.every((x, i) => x.orden === i));
        const cards = deck.map((item) => {
            const url = mediaUrl(item.file);
            return `<button type="button" class="vn-seq-card" data-vn-seq-card data-orden="${item.orden}">
                ${url ? `<img src="${escapar(url)}" alt="Paso">` : '<span>?</span>'}
            </button>`;
        }).join('');
        return `
            <p class="vn-puzzle-meta">Arrastra las imágenes y ordénalas</p>
            <div class="vn-secuencia" data-vn-secuencia data-total="${items.length}">${cards}</div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `;
    }

    function renderJuego(bloque) {
        const d = datos(bloque);
        const id = d.juego_id || '';
        let extra = '';
        let cardClass = 'juego';
        if (id === 'memoria') {
            cardClass = 'juego-memoria';
            const imgs = [1, 2, 3, 4, 5, 6].map((i) => d[`imagen_${i}`]).filter(Boolean);
            const deck = imgs.concat(imgs).map((f, i) => ({ key: i, file: f, pair: f }));
            shuffleInPlace(deck);
            extra = `<div class="vn-memory" data-vn-memory>${deck.map((c, i) =>
                `<button type="button" class="vn-memory-card" data-i="${i}" data-pair="${escapar(c.pair)}">?</button>`
            ).join('')}</div>
            <div class="vn-feedback" id="vnFb" hidden></div>`;
        } else if (id === 'rompecabezas') {
            cardClass = 'juego-rompecabezas';
            extra = renderRompecabezas(d);
        } else if (id === 'colorear') {
            cardClass = 'juego-colorear';
            extra = renderColorear(d);
        } else if (id === 'secuencia') {
            cardClass = 'juego-secuencia';
            extra = renderSecuencia(d);
        } else {
            extra = '<p class="vn-empty">Elige un juego en la configuración</p>';
        }
        return wrap(`
            <h2 class="vn-title">${escapar(d.juego_nombre || 'Juego')}</h2>
            ${instruccionHtml(d.instruccion)}
            ${extra}
        `, bloque, cardClass);
    }

    function renderDibujo(bloque) {
        const d = datos(bloque);
        const fondo = mediaUrl(d.fondo);
        const toolbar = renderPaintToolbar({
            colors: PAINT_DEFAULT_COLORS,
            fixedColors: false,
            showShapes: true,
        });
        const canvasBg = fondo
            ? `background:url('${escapar(fondo)}') center/contain no-repeat #fff`
            : '';
        return wrap(`
            <h2 class="vn-title">Dibuja</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-paint vn-paint--dibujo" data-vn-paint="dibujo">
                ${toolbar}
                <div class="vn-paint-stage vn-draw-stage">
                    <canvas id="vnCanvas" class="vn-draw-canvas" width="1100" height="560"
                        style="${canvasBg}"></canvas>
                </div>
            </div>
            ${d.guardar_evidencia ? `<button type="button" class="vn-evidencia-btn" data-vn-evidencia>
                <i class="fa-solid fa-camera"></i><span>Guardar</span></button>
                <p class="vn-evidencia-msg" id="vnEvidenciaMsg" hidden>¡Listo! Tu dibujo quedó guardado.</p>` : ''}
        `, bloque, 'dibujo');
    }

    function renderPregunta(bloque) {
        const d = datos(bloque);
        const ops = Array.isArray(d.opciones) ? d.opciones : [];
        const tipo = d.tipo_opts || 'emoji_texto';
        const optsHtml = ops.map((op, i) => {
            let inner = '';
            if (tipo !== 'solo_texto' && op.emoji) inner += `<span class="vn-op-emoji">${escapar(op.emoji)}</span>`;
            if (tipo === 'imagen_texto' && op.imagen) {
                const u = mediaUrl(op.imagen);
                if (u) inner += `<img src="${escapar(u)}" alt="">`;
            }
            if (op.texto) inner += `<span>${escapar(op.texto)}</span>`;
            return `<button type="button" class="vn-option" data-vn-opcion="${i}" data-correcta="${op.correcta ? '1' : '0'}">${inner || '—'}</button>`;
        }).join('');
        return wrap(`
            <h2 class="vn-title">Pregunta</h2>
            ${instruccionHtml(d.instruccion)}
            <p class="vn-instruccion vn-pregunta-texto">${escapar(d.texto || '')}</p>
            <div class="vn-options" data-vn-pregunta data-fb-ok="${escapar(d.fb_ok || '¡Muy bien!')}"
                data-fb-err="${escapar(d.fb_err || 'Inténtalo de nuevo')}"
                data-intentos="${escapar(d.intentos || '2')}">${optsHtml}</div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `, bloque, 'pregunta');
    }

    function renderEmparejar(bloque) {
        const d = datos(bloque);
        const pares = Array.isArray(d.pares) ? d.pares : [];
        const modo = d.modo || 'texto';
        const izq = pares.map((p, i) => {
            let content = '';
            if (modo !== 'texto' && p.izqImg) content += `<img src="${escapar(mediaUrl(p.izqImg))}" alt="">`;
            if (modo !== 'imagen' && p.izq) content += `<span>${escapar(p.izq)}</span>`;
            return `<button type="button" class="vn-chip" data-vn-izq="${i}">${content || '—'}</button>`;
        });
        const derOrder = pares.map((_, i) => i).sort(() => Math.random() - 0.5);
        const der = derOrder.map((i) => {
            const p = pares[i];
            let content = '';
            if (modo === 'imagen' && p.derImg) content += `<img src="${escapar(mediaUrl(p.derImg))}" alt="">`;
            else if (p.der) content += `<span>${escapar(p.der)}</span>`;
            else if (p.derImg) content += `<img src="${escapar(mediaUrl(p.derImg))}" alt="">`;
            return `<button type="button" class="vn-chip" data-vn-der="${i}">${content || '—'}</button>`;
        });
        return wrap(`
            <h2 class="vn-title">Empareja</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-match-cols" data-vn-emparejar data-fb-ok="${escapar(d.fb_ok || '¡Correcto!')}"
                data-fb-err="${escapar(d.fb_err || 'Ese no va ahí…')}">
                <div class="vn-match-col">${izq.join('')}</div>
                <div class="vn-match-col">${der.join('')}</div>
            </div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `, bloque, 'emparejar');
    }

    function renderClasificacion(bloque) {
        const d = datos(bloque);
        const cats = Array.isArray(d.categorias) ? d.categorias : [];
        const items = Array.isArray(d.items) ? d.items : [];
        const zonas = cats.map((c) =>
            `<div class="vn-zone" data-vn-cat="${escapar(c)}" style="background:${pickColor(c)}">${escapar(c)}</div>`
        ).join('');
        const pool = items.map((it, i) => {
            const label = it.texto || (it.imagen ? '' : 'Ítem');
            const img = it.imagen ? `<img src="${escapar(mediaUrl(it.imagen))}" alt="">` : '';
            const text = label ? `<span>${escapar(label)}</span>` : '';
            return `<button type="button" class="vn-chip" data-vn-item="${i}" data-cat="${escapar(it.categoria || '')}">${img}${text || '—'}</button>`;
        }).join('');
        return wrap(`
            <h2 class="vn-title">Clasifica</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-zones" data-vn-clasif>${zonas}</div>
            <div class="vn-pool" data-vn-clasif-pool>${pool}</div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `, bloque, 'clasificacion');
    }

    function renderArrastrar(bloque) {
        const d = datos(bloque);
        const zonas = Array.isArray(d.zonas) ? d.zonas : [];
        const items = Array.isArray(d.items) ? d.items : [];
        const zHtml = zonas.map((z) =>
            `<div class="vn-zone" data-vn-zona="${escapar(z.nombre || '')}" style="background:${escapar(z.color || '#0F6E56')}">${escapar(z.nombre || 'Zona')}</div>`
        ).join('');
        const pool = items.map((it, i) => {
            const label = it.texto || (it.imagen ? '' : 'Ítem');
            const img = it.imagen ? `<img src="${escapar(mediaUrl(it.imagen))}" alt="">` : '';
            const text = label ? `<span>${escapar(label)}</span>` : '';
            return `<button type="button" class="vn-chip vn-chip-drag" data-vn-item="${i}" data-zona="${escapar(it.zona || '')}"
                aria-grabbed="false">${img}${text || '—'}</button>`;
        }).join('');
        return wrap(`
            <h2 class="vn-title">Arrastra</h2>
            ${instruccionHtml(d.instruccion)}
            <p class="vn-hint-drag">Arrastra cada elemento a su zona</p>
            <div class="vn-zones" data-vn-arrastrar>${zHtml}</div>
            <div class="vn-pool" data-vn-arrastrar-pool>${pool}</div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `, bloque, 'arrastrar');
    }

    function renderReto(bloque) {
        const d = datos(bloque);
        const pasos = Array.isArray(d.pasos) ? d.pasos : [];
        if (retoPaso >= pasos.length) retoPaso = Math.max(0, pasos.length - 1);
        const paso = pasos[retoPaso] || { pregunta: '', opciones: [] };
        const ops = (paso.opciones || []).map((op, i) => {
            let inner = '';
            if (op.emoji) inner += `<span class="vn-op-emoji">${escapar(op.emoji)}</span>`;
            if (op.imagen) {
                const u = mediaUrl(op.imagen);
                if (u) inner += `<img src="${escapar(u)}" alt="">`;
            }
            if (op.label) inner += `<span>${escapar(op.label)}</span>`;
            return `<button type="button" class="vn-option" data-vn-reto-op="${i}" data-correcta="${op.correcta ? '1' : '0'}">${inner || '—'}</button>`;
        }).join('');
        return wrap(`
            <h2 class="vn-title">${escapar(d.descripcion || 'Reto')}</h2>
            <p class="vn-paso-badge">Paso ${retoPaso + 1} de ${pasos.length || 1}</p>
            ${retoPaso === 0 ? instruccionHtml(d.instruccion) : ''}
            <p class="vn-instruccion vn-reto-pregunta">${escapar(paso.pregunta || '')}</p>
            <div class="vn-options" data-vn-reto data-fb-ok="${escapar(d.fb_ok || '¡Correcto!')}"
                data-fb-err="${escapar(d.fb_err || 'Casi…')}" data-intentos="${escapar(d.intentos || '2')}"
                data-total-pasos="${pasos.length}">${ops}</div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `, bloque, 'reto');
    }

    function renderEmocion(bloque) {
        const d = datos(bloque);
        const n = String(d.cantidad || '6') === '4' ? 4 : 6;
        const list = EMOCIONES[n];
        return wrap(`
            <h2 class="vn-title">¿Cómo te sientes?</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-emociones" data-vn-emocion>
                ${list.map((e) => `
                    <button type="button" class="vn-emocion" data-id="${e.id}">
                        <span class="vn-op-emoji">${e.emoji}</span>
                        ${escapar(e.label)}
                    </button>
                `).join('')}
            </div>
        `, bloque);
    }

    function renderRecompensa(bloque) {
        const d = datos(bloque);
        const tipo = d.tipo || 'Trofeo';
        const icons = {
            Trofeo: '🏆',
            Medalla: '🥇',
            'Estrella dorada': '⭐',
            'Insignia especial': '🎖️',
        };
        const icon = icons[tipo] || '🏆';
        const insignia = tipo === 'Insignia especial' && d.insignia ? imgTag(d.insignia, 'Insignia') : '';
        return wrap(`
            <div class="vn-reward">
                <div class="vn-reward-icon">${icon}</div>
                <h2 class="vn-title">¡Lo lograste!</h2>
                ${instruccionHtml(d.instruccion)}
                ${insignia}
            </div>
        `, bloque);
    }

    function pickColor(seed) {
        const palette = ['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#e11d48', '#14b8a6'];
        let h = 0;
        const s = String(seed || '');
        for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * 17) % palette.length;
        return palette[h];
    }

    function renderBloque(bloque) {
        switch (bloque.tipo) {
            case 'bienvenida': return renderBienvenida(bloque);
            case 'audio': return renderAudio(bloque);
            case 'video': return renderVideo(bloque);
            case 'imagen': return renderImagen(bloque);
            case 'historia': return renderHistoria(bloque);
            case 'ra': return renderRa(bloque);
            case 'evidencia': return renderEvidencia(bloque);
            case 'juego': return renderJuego(bloque);
            case 'dibujo': return renderDibujo(bloque);
            case 'pregunta': return renderPregunta(bloque);
            case 'emparejar': return renderEmparejar(bloque);
            case 'clasificacion': return renderClasificacion(bloque);
            case 'arrastrar': return renderArrastrar(bloque);
            case 'reto': return renderReto(bloque);
            case 'emocion': return renderEmocion(bloque);
            case 'recompensa': return renderRecompensa(bloque);
            default:
                return wrap(`<p class="vn-empty">Tipo no soportado: ${escapar(bloque.tipo)}</p>`, bloque);
        }
    }

    /* ── Chrome / navegación ─────────────────────────────────── */

    function renderProgress() {
        $progress.html(bloques.map((_, i) => {
            let cls = 'vn-dot';
            if (i < index) cls += ' is-done';
            if (i === index) cls += ' is-current';
            return `<span class="${cls}"></span>`;
        }).join(''));
        $stepLabel.text(`Paso ${index + 1} de ${bloques.length || 1}`);
    }

    function ajustarEscalaTablet() {
        if (!$tablet.length || $overlay.prop('hidden')) return;

        $tablet.css('transform', 'none');
        const padX = 48;
        const padY = 96;
        const availW = Math.max(280, window.innerWidth - padX);
        const availH = Math.max(200, window.innerHeight - padY);
        const naturalW = $tablet.outerWidth() || (SCREEN_W + 56);
        const naturalH = $tablet.outerHeight() || (SCREEN_H + 80);
        const scale = Math.min(availW / naturalW, availH / naturalH, 1);

        $tablet.css({
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
        });

        if ($stage.length) {
            $stage.css({
                width: Math.round(naturalW * scale) + 'px',
                height: Math.round(naturalH * scale) + 'px',
            });
        }
    }

    function pintar() {
        if (typeof limpiarDragArrastrar === 'function') limpiarDragArrastrar();
        if (typeof limpiarDragPuzzle === 'function') limpiarDragPuzzle();
        if (typeof limpiarDragSecuencia === 'function') limpiarDragSecuencia();
        if (typeof limpiarPaint === 'function') limpiarPaint();
        const bloque = bloques[index];
        if (!bloque) {
            $body.html('<p class="vn-empty">No hay bloques en la secuencia.</p>');
            $blockName.text('—');
            $btnPrev.prop('disabled', true);
            $btnNext.prop('disabled', true);
            renderProgress();
            return;
        }
        $title.text(experienciaNombre);
        $blockName.text(bloque.nombre || bloque.tipo);
        $body.html(renderBloque(bloque));
        $btnPrev.prop('disabled', index <= 0);
        $btnNext.prop('disabled', index >= bloques.length - 1);
        renderProgress();
        initInteracciones(bloque);
        $body.scrollTop(0);
        requestAnimationFrame(ajustarEscalaTablet);
    }

    function parseIntentos(val) {
        if (val === 'Sin límite') return Infinity;
        const n = Number(val);
        return Number.isFinite(n) && n > 0 ? n : 2;
    }

    function showFb(ok, okMsg, errMsg) {
        const $fb = $('#vnFb');
        if (!$fb.length) return;
        $fb.prop('hidden', false)
            .toggleClass('is-ok', !!ok)
            .toggleClass('is-bad', !ok)
            .text(ok ? okMsg : errMsg);
    }

    function paintAddListener(el, type, fn, opts) {
        el.addEventListener(type, fn, opts);
        paintListeners.push({ el, type, fn, opts });
    }

    function limpiarPaint() {
        paintListeners.forEach(({ el, type, fn, opts }) => el.removeEventListener(type, fn, opts));
        paintListeners = [];
        paint = null;
        drawCtx = null;
    }

    function paintIsShapeTool() {
        return paint && ['line', 'rect', 'circle', 'triangle'].indexOf(paint.tool) >= 0;
    }

    function paintUpdateActions() {
        const canUndo = !!(paint && paint.history.length > 1);
        $body.find('[data-vn-paint-undo]').prop('disabled', !canUndo).toggleClass('is-disabled', !canUndo);
    }

    function paintSaveState() {
        const canvas = document.getElementById('vnCanvas');
        if (!canvas || !drawCtx || !paint) return;
        paint.history.push(drawCtx.getImageData(0, 0, canvas.width, canvas.height));
        if (paint.history.length > 40) paint.history.shift();
        paintUpdateActions();
    }

    function paintUndo() {
        if (!drawCtx || !paint || paint.history.length <= 1) return;
        paint.history.pop();
        drawCtx.putImageData(paint.history[paint.history.length - 1], 0, 0);
        paintUpdateActions();
    }

    function paintDrawShape(ctx, tool, x1, y1, x2, y2, color, width) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (tool === 'line') {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        } else if (tool === 'rect') {
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        } else if (tool === 'circle') {
            const rx = Math.abs(x2 - x1) / 2;
            const ry = Math.abs(y2 - y1) / 2;
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (tool === 'triangle') {
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);
            ctx.beginPath();
            ctx.moveTo((minX + maxX) / 2, minY);
            ctx.lineTo(maxX, maxY);
            ctx.lineTo(minX, maxY);
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();
    }

    function initPaintCanvas(opts) {
        limpiarPaint();
        const canvas = document.getElementById('vnCanvas');
        if (!canvas) return;
        drawCtx = canvas.getContext('2d');
        paint = {
            mode: opts.mode || 'dibujo',
            tool: 'brush',
            color: opts.color || PAINT_DEFAULT_COLORS[0],
            lineWidth: opts.lineWidth || PAINT_SIZE_MAP.m,
            history: [],
            drawing: false,
            shapeStart: null,
            snapshot: null,
            hasFondo: !!opts.hasFondo,
            strokeStarted: false,
        };
        if (paint.mode === 'dibujo' && !paint.hasFondo) {
            drawCtx.fillStyle = '#ffffff';
            drawCtx.fillRect(0, 0, canvas.width, canvas.height);
        }
        paintSaveState();

        const rect = () => canvas.getBoundingClientRect();
        const pos = (e) => {
            const r = rect();
            const t = (e.touches && e.touches[0])
                || (e.changedTouches && e.changedTouches[0])
                || e;
            return {
                x: (t.clientX - r.left) * (canvas.width / r.width),
                y: (t.clientY - r.top) * (canvas.height / r.height),
            };
        };

        const start = (e) => {
            if (e.button != null && e.button !== 0) return;
            if (paintIsShapeTool()) {
                paint.drawing = true;
                paint.strokeStarted = false;
                paint.shapeStart = pos(e);
                paint.snapshot = drawCtx.getImageData(0, 0, canvas.width, canvas.height);
                e.preventDefault();
                return;
            }
            paint.drawing = true;
            paint.strokeStarted = false;
            const p = pos(e);
            drawCtx.beginPath();
            drawCtx.moveTo(p.x, p.y);
            if (paint.tool === 'eraser') {
                drawCtx.globalCompositeOperation = 'destination-out';
                drawCtx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                drawCtx.globalCompositeOperation = 'source-over';
                drawCtx.strokeStyle = paint.color;
            }
            drawCtx.lineWidth = paint.lineWidth;
            drawCtx.lineCap = 'round';
            drawCtx.lineJoin = 'round';
            e.preventDefault();
        };

        const move = (e) => {
            if (!paint.drawing) return;
            const p = pos(e);
            if (paintIsShapeTool() && paint.snapshot && paint.shapeStart) {
                paint.strokeStarted = true;
                drawCtx.putImageData(paint.snapshot, 0, 0);
                paintDrawShape(drawCtx, paint.tool, paint.shapeStart.x, paint.shapeStart.y, p.x, p.y, paint.color, paint.lineWidth);
                e.preventDefault();
                return;
            }
            paint.strokeStarted = true;
            drawCtx.lineTo(p.x, p.y);
            drawCtx.stroke();
            e.preventDefault();
        };

        const end = (e) => {
            if (!paint.drawing) return;
            if (paintIsShapeTool() && paint.shapeStart) {
                const p = pos(e);
                drawCtx.putImageData(paint.snapshot, 0, 0);
                paintDrawShape(drawCtx, paint.tool, paint.shapeStart.x, paint.shapeStart.y, p.x, p.y, paint.color, paint.lineWidth);
                paintSaveState();
            } else if (paint.strokeStarted) {
                paintSaveState();
            }
            drawCtx.globalCompositeOperation = 'source-over';
            paint.drawing = false;
            paint.shapeStart = null;
            paint.snapshot = null;
            paint.strokeStarted = false;
        };

        paintAddListener(canvas, 'mousedown', start);
        paintAddListener(canvas, 'mousemove', move);
        paintAddListener(window, 'mouseup', end);
        paintAddListener(canvas, 'touchstart', start, { passive: false });
        paintAddListener(canvas, 'touchmove', move, { passive: false });
        paintAddListener(canvas, 'touchend', end);
        paintUpdateActions();
    }

    function initInteracciones(bloque) {
        intentosRestantes = null;
        detenerAudioBloque();
        detenerVideoBloque();
        detenerAudioHistoria();

        if (bloque.tipo === 'dibujo') {
            const d = datos(bloque);
            initPaintCanvas({
                mode: 'dibujo',
                color: PAINT_DEFAULT_COLORS[2],
                hasFondo: !!d.fondo,
            });
        }

        if (bloque.tipo === 'juego' && datos(bloque).juego_id === 'colorear') {
            const d = datos(bloque);
            const n = (() => {
                const s = String(d.juego_piezas || '');
                if (s.includes('9')) return 9;
                if (s.includes('6')) return 6;
                return 4;
            })();
            const defaults = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
            const colores = Array.isArray(d.colores_zonas) && d.colores_zonas.length
                ? d.colores_zonas.slice(0, n)
                : defaults.slice(0, n);
            initPaintCanvas({
                mode: 'colorear',
                color: colores[0] || '#EF4444',
                lineWidth: PAINT_SIZE_MAP.m,
                hasFondo: true,
            });
        }

        if (bloque.tipo === 'pregunta') {
            const $box = $body.find('[data-vn-pregunta]');
            intentosRestantes = parseIntentos($box.data('intentos'));
        }
        if (bloque.tipo === 'reto') {
            const $box = $body.find('[data-vn-reto]');
            intentosRestantes = parseIntentos($box.data('intentos'));
        }

        // Memoria state
        if (bloque.tipo === 'juego' && datos(bloque).juego_id === 'memoria') {
            $body.data('mem-flipped', []);
        }

        // Emparejar state
        if (bloque.tipo === 'emparejar') {
            $body.data('emp-izq', null);
        }

        // Clasificación / arrastrar
        if (bloque.tipo === 'clasificacion' || bloque.tipo === 'arrastrar') {
            $body.data('pick-item', null);
        }

        if (bloque.tipo === 'audio') {
            setAudioUi('idle');
        }
        if (bloque.tipo === 'video') {
            setVideoUi('idle');
        }
        if (bloque.tipo === 'historia') {
            iniciarAudioHistoria();
        }
    }

    function detenerAudioHistoria() {
        const audio = $body.find('.vn-historia-audio')[0];
        if (!audio) return;
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) { /* noop */ }
    }

    function iniciarAudioHistoria() {
        const audio = $body.find('.vn-historia-audio')[0];
        if (!audio) return;
        try { audio.currentTime = 0; } catch (e) { /* noop */ }
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
            p.catch(() => { /* autoplay puede fallar sin gesto; el niño ya interactuó al navegar */ });
        }
    }

    function parseRepeticiones(val) {
        const s = String(val || '1 vez');
        if (s === 'Sin límite') return Infinity;
        const m = s.match(/(\d+)/);
        const n = m ? Number(m[1]) : 1;
        return Number.isFinite(n) && n > 0 ? n : 1;
    }

    function detenerAudioBloque() {
        const audio = $body.find('.vn-audio-el')[0];
        if (audio) {
            try {
                audio.pause();
                audio.currentTime = 0;
                audio.onended = null;
            } catch (e) { /* noop */ }
        }
        $body.data('vn-audio-plays', null);
        const $btn = $body.find('[data-vn-audio-play]');
        if ($btn.length) {
            $btn.removeClass('is-playing is-done');
            $btn.find('.vn-audio-btn-icon').html('<i class="fa-solid fa-play"></i>');
            $btn.find('.vn-audio-btn-label').text('Toca para escuchar');
            $body.find('[data-vn-audio-status]').prop('hidden', true).text('Sonando…');
        }
    }

    function setAudioUi(estado) {
        const $btn = $body.find('[data-vn-audio-play]');
        if (!$btn.length) return;
        const $status = $body.find('[data-vn-audio-status]');
        const $icon = $btn.find('.vn-audio-btn-icon');
        const $label = $btn.find('.vn-audio-btn-label');
        $btn.removeClass('is-playing is-done');
        if (estado === 'playing') {
            $btn.addClass('is-playing');
            $icon.html('<i class="fa-solid fa-volume-high"></i>');
            $label.text('Sonando…');
            $status.prop('hidden', false).text('Sonando…');
        } else if (estado === 'done') {
            $btn.addClass('is-done');
            $icon.html('<i class="fa-solid fa-rotate-right"></i>');
            $label.text('Toca para oír otra vez');
            $status.prop('hidden', false).text('¡Listo!');
        } else {
            $icon.html('<i class="fa-solid fa-play"></i>');
            $label.text('Toca para escuchar');
            $status.prop('hidden', true);
        }
    }

    function reproducirAudioConReps() {
        const audio = $body.find('.vn-audio-el')[0];
        const $btn = $body.find('[data-vn-audio-play]');
        if (!audio || !$btn.length) return;

        const max = parseRepeticiones($btn.data('reps'));
        let restantes = max;

        const playOne = () => {
            setAudioUi('playing');
            try { audio.currentTime = 0; } catch (e) { /* noop */ }
            const p = audio.play();
            if (p && typeof p.catch === 'function') {
                p.catch(() => setAudioUi('idle'));
            }
        };

        audio.onended = function () {
            if (max === Infinity) {
                playOne();
                return;
            }
            restantes -= 1;
            if (restantes > 0) {
                playOne();
            } else {
                setAudioUi('done');
            }
        };

        playOne();
    }

    function detenerVideoBloque() {
        const video = $body.find('.vn-video-el')[0];
        if (video) {
            try {
                video.pause();
                video.currentTime = 0;
                video.onended = null;
            } catch (e) { /* noop */ }
        }
        setVideoUi('idle');
    }

    function setVideoUi(estado) {
        const $btn = $body.find('[data-vn-video-play]');
        const $video = $body.find('.vn-video-el');
        const $status = $body.find('[data-vn-video-status]');
        if (!$btn.length && !$video.length) return;
        $btn.removeClass('is-playing is-done');
        if (estado === 'playing') {
            $btn.prop('hidden', true);
            $video.prop('hidden', false);
            $status.prop('hidden', false).text('Reproduciendo…');
        } else if (estado === 'done') {
            $btn.prop('hidden', false).addClass('is-done');
            $btn.find('.vn-video-btn-icon').html('<i class="fa-solid fa-rotate-right"></i>');
            $btn.find('.vn-video-btn-label').text('Toca para ver otra vez');
            $video.prop('hidden', true);
            $status.prop('hidden', false).text('¡Listo!');
        } else {
            $btn.prop('hidden', false);
            $btn.find('.vn-video-btn-icon').html('<i class="fa-solid fa-play"></i>');
            $btn.find('.vn-video-btn-label').text('Toca para ver');
            $video.prop('hidden', true);
            $status.prop('hidden', true);
        }
    }

    function reproducirVideo() {
        const video = $body.find('.vn-video-el')[0];
        if (!video) return;
        setVideoUi('playing');
        try { video.currentTime = 0; } catch (e) { /* noop */ }
        video.onended = function () {
            setVideoUi('done');
        };
        const p = video.play();
        if (p && typeof p.catch === 'function') {
            p.catch(() => setVideoUi('idle'));
        }
    }

    function ir(delta) {
        const next = index + delta;
        if (next < 0 || next >= bloques.length) return;
        index = next;
        historiaPage = 0;
        retoPaso = 0;
        pintar();
    }

    function abrir() {
        const api = window.CxConstructor;
        if (api && typeof api.getBloques === 'function') {
            bloques = api.getBloques() || [];
            const meta = api.getMeta ? api.getMeta() : {};
            mediaBase = meta.mediaBase || $('.cx-app').data('media-base') || '';
            experienciaNombre = meta.nombre || 'Experiencia';
        } else {
            try {
                bloques = JSON.parse(document.getElementById('cx-bloques-iniciales')?.textContent || '[]');
            } catch (e) {
                bloques = [];
            }
            mediaBase = $('.cx-app').data('media-base') || '';
            experienciaNombre = $('.cx-app').data('experiencia-nombre') || 'Experiencia';
        }

        if (!bloques.length) {
            if (window.Swal) {
                Swal.fire({ icon: 'info', title: 'Sin bloques', text: 'Agrega bloques a la secuencia para previsualizar.' });
            } else {
                window.alert('Agrega bloques a la secuencia para previsualizar.');
            }
            return;
        }

        index = 0;
        historiaPage = 0;
        retoPaso = 0;
        $overlay.prop('hidden', false).attr('aria-hidden', 'false');
        $('body').css('overflow', 'hidden');
        pintar();
        requestAnimationFrame(function () {
            ajustarEscalaTablet();
            requestAnimationFrame(ajustarEscalaTablet);
        });
    }

    function cerrar() {
        if (typeof limpiarDragArrastrar === 'function') limpiarDragArrastrar();
        if (typeof limpiarDragPuzzle === 'function') limpiarDragPuzzle();
        if (typeof limpiarDragSecuencia === 'function') limpiarDragSecuencia();
        if (typeof limpiarPaint === 'function') limpiarPaint();
        detenerAudioBloque();
        detenerVideoBloque();
        detenerAudioHistoria();
        $overlay.prop('hidden', true).attr('aria-hidden', 'true');
        $('body').css('overflow', '');
        $tablet.css('transform', 'none');
        $body.find('audio, video').each(function () {
            try { this.pause(); } catch (e) { /* noop */ }
        });
    }

    /* ── Eventos UI ──────────────────────────────────────────── */

    $('#cxBtnVistaNino').on('click', abrir);
    $overlay.on('click', '[data-vn-close]', cerrar);
    $btnPrev.on('click', () => ir(-1));
    $btnNext.on('click', () => ir(1));

    $(document).on('keydown', function (e) {
        if ($overlay.prop('hidden')) return;
        if (e.key === 'Escape') cerrar();
        if (e.key === 'ArrowLeft') ir(-1);
        if (e.key === 'ArrowRight') ir(1);
    });

    $body.on('click', '[data-vn-hist-prev]', function () {
        if ($(this).prop('disabled')) return;
        historiaPage = Math.max(0, historiaPage - 1);
        pintar();
    });

    $body.on('click', '[data-vn-hist-next]', function () {
        if ($(this).prop('disabled')) return;
        historiaPage += 1;
        pintar();
    });

    $body.on('click', '[data-vn-audio-play]', function () {
        const $btn = $(this);
        const audio = $body.find('.vn-audio-el')[0];
        if (!audio) return;
        if ($btn.hasClass('is-playing')) {
            const max = parseRepeticiones($btn.data('reps'));
            if (max === Infinity) {
                detenerAudioBloque();
                setAudioUi('done');
            }
            return;
        }
        reproducirAudioConReps();
    });

    $body.on('click', '[data-vn-video-play]', function () {
        reproducirVideo();
    });

    $body.on('click', '[data-vn-paint-tool]', function () {
        if (!paint) return;
        paint.tool = String($(this).data('vn-paint-tool'));
        $body.find('[data-vn-paint-tool]').removeClass('is-on');
        $(this).addClass('is-on');
    });

    $body.on('click', '[data-vn-paint-size]', function () {
        if (!paint) return;
        const key = String($(this).data('vn-paint-size'));
        paint.lineWidth = PAINT_SIZE_MAP[key] || PAINT_SIZE_MAP.m;
        $body.find('[data-vn-paint-size]').removeClass('is-on');
        $(this).addClass('is-on');
    });

    function paintSelectColor(color) {
        if (!paint || !color) return;
        paint.color = color;
        paint.tool = 'brush';
        $body.find('[data-vn-paint-tool]').removeClass('is-on');
        $body.find('[data-vn-paint-tool="brush"]').addClass('is-on');
        $body.find('[data-vn-paint-color]').removeClass('is-on');
        $body.find('[data-vn-paint-color]').each(function () {
            if (String($(this).data('vn-paint-color')).toLowerCase() === color.toLowerCase()) {
                $(this).addClass('is-on');
            }
        });
    }

    $body.on('click', '[data-vn-paint-color]', function () {
        paintSelectColor(String($(this).data('vn-paint-color')));
    });

    $body.on('input change', '.vn-paint-color-input', function () {
        const color = String(this.value || '');
        paintSelectColor(color);
        $body.find('[data-vn-paint-color]').removeClass('is-on');
    });

    $body.on('click', '[data-vn-paint-undo]', function () {
        if ($(this).prop('disabled')) return;
        paintUndo();
    });

    $body.on('click', '[data-vn-evidencia]', function () {
        $('#vnEvidenciaMsg').prop('hidden', false);
        $(this).css('transform', 'scale(0.92)');
        setTimeout(() => $(this).css('transform', ''), 180);
    });

    $body.on('click', '[data-vn-emocion] .vn-emocion', function () {
        $body.find('.vn-emocion').removeClass('is-picked');
        $(this).addClass('is-picked');
    });

    $body.on('click', '[data-vn-pregunta] .vn-option', function () {
        const $box = $body.find('[data-vn-pregunta]');
        if ($box.data('locked')) return;
        const ok = String($(this).data('correcta')) === '1';
        $body.find('.vn-option').removeClass('is-ok is-bad');
        if (ok) {
            $(this).addClass('is-ok');
            showFb(true, $box.data('fb-ok'), $box.data('fb-err'));
            $box.data('locked', true);
            return;
        }
        $(this).addClass('is-bad');
        showFb(false, $box.data('fb-ok'), $box.data('fb-err'));
        if (intentosRestantes !== Infinity) {
            intentosRestantes -= 1;
            if (intentosRestantes <= 0) {
                $box.data('locked', true);
                $body.find('.vn-option[data-correcta="1"]').addClass('is-ok');
            }
        }
    });

    $body.on('click', '[data-vn-reto] .vn-option', function () {
        const $box = $body.find('[data-vn-reto]');
        if ($box.data('locked')) return;
        const ok = String($(this).data('correcta')) === '1';
        $body.find('.vn-option').removeClass('is-ok is-bad');
        if (ok) {
            $(this).addClass('is-ok');
            showFb(true, $box.data('fb-ok'), $box.data('fb-err'));
            const total = Number($box.data('total-pasos')) || 1;
            setTimeout(() => {
                if (retoPaso < total - 1) {
                    retoPaso += 1;
                    pintar();
                } else {
                    $box.data('locked', true);
                }
            }, 650);
            return;
        }
        $(this).addClass('is-bad');
        showFb(false, $box.data('fb-ok'), $box.data('fb-err'));
        if (intentosRestantes !== Infinity) {
            intentosRestantes -= 1;
            if (intentosRestantes <= 0) {
                $body.find('.vn-option[data-correcta="1"]').addClass('is-ok');
                const total = Number($box.data('total-pasos')) || 1;
                setTimeout(() => {
                    if (retoPaso < total - 1) {
                        retoPaso += 1;
                        pintar();
                    }
                }, 800);
            }
        }
    });

    $body.on('click', '[data-vn-emparejar] [data-vn-izq]', function () {
        if ($(this).hasClass('is-matched')) return;
        $body.find('[data-vn-izq]').removeClass('is-selected');
        $(this).addClass('is-selected');
        $body.data('emp-izq', Number($(this).data('vn-izq')));
    });

    $body.on('click', '[data-vn-emparejar] [data-vn-der]', function () {
        if ($(this).hasClass('is-matched')) return;
        const izq = $body.data('emp-izq');
        if (izq === null || izq === undefined) return;
        const der = Number($(this).data('vn-der'));
        const $box = $body.find('[data-vn-emparejar]');
        const ok = izq === der;
        if (ok) {
            $body.find(`[data-vn-izq="${izq}"], [data-vn-der="${der}"]`).addClass('is-matched').removeClass('is-selected');
            showFb(true, $box.data('fb-ok'), $box.data('fb-err'));
        } else {
            showFb(false, $box.data('fb-ok'), $box.data('fb-err'));
            $body.find('[data-vn-izq]').removeClass('is-selected');
        }
        $body.data('emp-izq', null);
    });

    $body.on('click', '[data-vn-clasif-pool] [data-vn-item]', function () {
        $body.find('[data-vn-clasif-pool] .vn-chip').removeClass('is-selected');
        $(this).addClass('is-selected');
        $body.data('pick-item', $(this));
        $body.find('[data-vn-clasif] .vn-zone').addClass('is-target');
    });

    $body.on('click', '[data-vn-clasif] .vn-zone', function () {
        const $item = $body.data('pick-item');
        if (!$item || !$item.length) return;
        const ok = String($item.data('cat')) === String($(this).data('vn-cat'));
        showFb(ok, '¡Muy bien!', 'Prueba otra categoría');
        if (ok) $item.addClass('is-matched').removeClass('is-selected');
        $body.data('pick-item', null);
        $body.find('.vn-zone').removeClass('is-target');
    });

    function limpiarDragArrastrar() {
        const drag = $body.data('vn-drag');
        if (!drag) return;
        if (drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
        if (drag.$chip) {
            drag.$chip.removeClass('is-dragging').attr('aria-grabbed', 'false');
        }
        $body.find('[data-vn-arrastrar] .vn-zone').removeClass('is-target is-drop-hover');
        $body.data('vn-drag', null);
    }

    function zonaBajoPuntero(clientX, clientY) {
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return null;
        return el.closest('[data-vn-arrastrar] .vn-zone');
    }

    $body.on('pointerdown', '[data-vn-arrastrar-pool] .vn-chip-drag', function (e) {
        if ($(this).hasClass('is-matched')) return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        const $chip = $(this);
        const rect = this.getBoundingClientRect();
        const ghost = this.cloneNode(true);
        ghost.classList.add('vn-drag-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        document.body.appendChild(ghost);
        $chip.addClass('is-dragging').attr('aria-grabbed', 'true');
        $body.find('[data-vn-arrastrar] .vn-zone').addClass('is-target');
        try { this.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        $body.data('vn-drag', {
            $chip,
            ghost,
            pointerId: e.pointerId,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
        });
    });

    $body.on('pointermove', '[data-vn-arrastrar-pool] .vn-chip-drag', function (e) {
        const drag = $body.data('vn-drag');
        if (!drag || drag.pointerId !== e.pointerId) return;
        e.preventDefault();
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
        drag.ghost.style.left = `${e.clientX - drag.offsetX}px`;
        drag.ghost.style.top = `${e.clientY - drag.offsetY}px`;
        $body.find('[data-vn-arrastrar] .vn-zone').removeClass('is-drop-hover');
        const zone = zonaBajoPuntero(e.clientX, e.clientY);
        if (zone) zone.classList.add('is-drop-hover');
    });

    $body.on('pointerup pointercancel', '[data-vn-arrastrar-pool] .vn-chip-drag', function (e) {
        const drag = $body.data('vn-drag');
        if (!drag || drag.pointerId !== e.pointerId) return;
        const zone = zonaBajoPuntero(e.clientX, e.clientY);
        const $chip = drag.$chip;
        limpiarDragArrastrar();
        if (!zone || !drag.moved) return;
        const ok = String($chip.data('zona')) === String($(zone).data('vn-zona'));
        showFb(ok, '¡Muy bien!', 'Esa no es la zona');
        if (ok) $chip.addClass('is-matched');
    });

    function limpiarDragPuzzle() {
        const drag = $body.data('vn-puzzle-drag');
        if (!drag) return;
        if (drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
        if (drag.$piece) drag.$piece.removeClass('is-dragging');
        $body.find('.vn-puzzle-slot').removeClass('is-drop-hover is-target');
        $body.data('vn-puzzle-drag', null);
    }

    function slotPuzzleBajoPuntero(clientX, clientY) {
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return null;
        return el.closest('.vn-puzzle-slot:not(.is-filled)');
    }

    function revisarPuzzleCompleto() {
        const $puzzle = $body.find('[data-vn-puzzle]');
        if (!$puzzle.length) return;
        const total = Number($puzzle.data('total')) || 0;
        const filled = $puzzle.find('.vn-puzzle-slot.is-filled').length;
        if (total > 0 && filled >= total) {
            showFb(true, '¡Rompecabezas listo!', '');
            $puzzle.addClass('is-complete');
        }
    }

    $body.on('pointerdown', '.vn-puzzle-pool .vn-puzzle-piece', function (e) {
        if ($(this).hasClass('is-placed')) return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        const $piece = $(this);
        const rect = this.getBoundingClientRect();
        const ghost = this.cloneNode(true);
        ghost.classList.add('vn-drag-ghost', 'vn-puzzle-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        document.body.appendChild(ghost);
        $piece.addClass('is-dragging');
        $body.find('.vn-puzzle-slot:not(.is-filled)').addClass('is-target');
        try { this.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        $body.data('vn-puzzle-drag', {
            $piece,
            ghost,
            pointerId: e.pointerId,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
        });
    });

    $body.on('pointermove', '.vn-puzzle-pool .vn-puzzle-piece', function (e) {
        const drag = $body.data('vn-puzzle-drag');
        if (!drag || drag.pointerId !== e.pointerId) return;
        e.preventDefault();
        if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 6) drag.moved = true;
        drag.ghost.style.left = `${e.clientX - drag.offsetX}px`;
        drag.ghost.style.top = `${e.clientY - drag.offsetY}px`;
        $body.find('.vn-puzzle-slot').removeClass('is-drop-hover');
        const slot = slotPuzzleBajoPuntero(e.clientX, e.clientY);
        if (slot) slot.classList.add('is-drop-hover');
    });

    $body.on('pointerup pointercancel', '.vn-puzzle-pool .vn-puzzle-piece', function (e) {
        const drag = $body.data('vn-puzzle-drag');
        if (!drag || drag.pointerId !== e.pointerId) return;
        const slot = slotPuzzleBajoPuntero(e.clientX, e.clientY);
        const $piece = drag.$piece;
        const pieceIdx = Number($piece.data('vn-puzzle-piece'));
        limpiarDragPuzzle();
        if (!slot || !drag.moved) return;
        const slotIdx = Number($(slot).data('vn-puzzle-slot'));
        if (pieceIdx === slotIdx) {
            $piece.addClass('is-placed').prop('disabled', true);
            $(slot).addClass('is-filled').empty().append($piece);
            revisarPuzzleCompleto();
        } else {
            showFb(false, '¡Bien!', 'Esa pieza no va ahí');
        }
    });

    function limpiarDragSecuencia() {
        const drag = $body.data('vn-seq-drag');
        if (!drag) return;
        if (drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
        if (drag.$card) drag.$card.removeClass('is-dragging');
        $body.find('.vn-seq-card').removeClass('is-drop-hover');
        $body.data('vn-seq-drag', null);
    }

    function cardSecuenciaBajoPuntero(clientX, clientY, exceptEl) {
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return null;
        const card = el.closest('[data-vn-seq-card]');
        if (!card || card === exceptEl) return null;
        return card;
    }

    function revisarSecuenciaOrden() {
        const $root = $body.find('[data-vn-secuencia]');
        if (!$root.length) return;
        const orders = $root.find('[data-vn-seq-card]').map(function () {
            return Number($(this).data('orden'));
        }).get();
        const ok = orders.length > 0 && orders.every((v, i) => v === i);
        if (ok) {
            showFb(true, '¡Orden correcto!', '');
            $root.addClass('is-complete');
            $root.find('[data-vn-seq-card]').prop('disabled', true);
        } else {
            const $fb = $('#vnFb');
            if ($fb.length) $fb.prop('hidden', true).removeClass('is-ok is-bad').text('');
        }
    }

    $body.on('pointerdown', '[data-vn-seq-card]', function (e) {
        if ($(this).prop('disabled')) return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        const $card = $(this);
        const rect = this.getBoundingClientRect();
        const ghost = this.cloneNode(true);
        ghost.classList.add('vn-drag-ghost', 'vn-seq-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        document.body.appendChild(ghost);
        $card.addClass('is-dragging');
        try { this.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        $body.data('vn-seq-drag', {
            $card,
            ghost,
            pointerId: e.pointerId,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
        });
    });

    $body.on('pointermove', '[data-vn-seq-card]', function (e) {
        const drag = $body.data('vn-seq-drag');
        if (!drag || drag.pointerId !== e.pointerId) return;
        e.preventDefault();
        if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 6) drag.moved = true;
        drag.ghost.style.left = `${e.clientX - drag.offsetX}px`;
        drag.ghost.style.top = `${e.clientY - drag.offsetY}px`;
        $body.find('.vn-seq-card').removeClass('is-drop-hover');
        const target = cardSecuenciaBajoPuntero(e.clientX, e.clientY, drag.$card[0]);
        if (target) target.classList.add('is-drop-hover');
    });

    $body.on('pointerup pointercancel', '[data-vn-seq-card]', function (e) {
        const drag = $body.data('vn-seq-drag');
        if (!drag || drag.pointerId !== e.pointerId) return;
        const target = cardSecuenciaBajoPuntero(e.clientX, e.clientY, drag.$card[0]);
        const $card = drag.$card;
        const moved = drag.moved;
        limpiarDragSecuencia();
        if (!moved || !target) return;
        const $target = $(target);
        const rect = target.getBoundingClientRect();
        if (e.clientX < rect.left + rect.width / 2) {
            $target.before($card);
        } else {
            $target.after($card);
        }
        revisarSecuenciaOrden();
    });

    $body.on('click', '[data-vn-memory] .vn-memory-card', function () {
        const $card = $(this);
        if ($card.hasClass('is-flipped') || $card.hasClass('is-done')) return;
        let flipped = $body.data('mem-flipped') || [];
        if (flipped.length >= 2) return;

        const pair = String($card.data('pair'));
        const url = mediaUrl(pair);
        $card.addClass('is-flipped').html(url ? `<img src="${escapar(url)}" alt="">` : '★');
        flipped.push($card);
        $body.data('mem-flipped', flipped);

        if (flipped.length < 2) return;
        const a = flipped[0];
        const b = flipped[1];
        if (String(a.data('pair')) === String(b.data('pair'))) {
            a.addClass('is-done');
            b.addClass('is-done');
            $body.data('mem-flipped', []);
            const total = $body.find('[data-vn-memory] .vn-memory-card').length;
            const done = $body.find('[data-vn-memory] .vn-memory-card.is-done').length;
            if (total > 0 && done >= total) {
                showFb(true, '¡Todas las parejas!', '');
            }
        } else {
            setTimeout(() => {
                a.removeClass('is-flipped').text('?');
                b.removeClass('is-flipped').text('?');
                $body.data('mem-flipped', []);
            }, 700);
        }
    });

    $(window).on('resize', function () {
        if ($overlay.prop('hidden')) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(ajustarEscalaTablet, 80);
    });

    // Per-block eye button in timeline → open at that block
    $(document).on('click', '.cx-btn-preview', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = Number($(this).data('id'));
        abrir();
        if (!$overlay.prop('hidden') && id) {
            const i = bloques.findIndex((b) => Number(b.id) === id);
            if (i >= 0) {
                index = i;
                historiaPage = 0;
                retoPaso = 0;
                pintar();
            }
        }
    });
})(jQuery);
