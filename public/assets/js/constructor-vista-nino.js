/**
 * constructor-vista-nino.js — Vista niño (overlay constructor + player kiosco)
 */
(function ($) {
    'use strict';

    const $overlay = $('#vnOverlay');
    const enKiosco = $('#kioscoPane').length > 0;
    const enPlayer = $('#vnDispositivo').length > 0;
    if (!$overlay.length && !enKiosco && !enPlayer) return;

    let $root;
    let $body;
    let $progress;
    let $stepLabel;
    let $title;
    let $blockName;
    let $btnPrev;
    let $btnNext;
    let $tablet;
    let $stage;
    let $btnFullscreen;

    function esModoDispositivo() {
        return $('#vnDispositivo').length > 0;
    }

    function playerEstaActivo() {
        const $player = $('#vnDispositivo');
        if (!$player.length) return false;
        return !$player.prop('hidden') && String($player.attr('aria-hidden')) !== 'true';
    }

    function overlayEstaAbierto() {
        return $overlay.length > 0 && !$overlay.prop('hidden');
    }

    function resolverUrlExperienciaTpl() {
        if (urlExperienciaTpl) return urlExperienciaTpl;
        const desdeApp = String($('#rnApp').data('url-experiencia') || '').trim();
        if (desdeApp) urlExperienciaTpl = desdeApp;
        return urlExperienciaTpl;
    }

    function resolverExperienciaIdActiva() {
        if (experienciaIdActiva) return experienciaIdActiva;
        const desdeRoot = $root && $root.length ? $root.data('experiencia-id') : null;
        if (desdeRoot) {
            experienciaIdActiva = desdeRoot;
            return experienciaIdActiva;
        }
        const desdeMeta = window.CxConstructor && typeof window.CxConstructor.getMeta === 'function'
            ? window.CxConstructor.getMeta().experienciaId
            : null;
        if (desdeMeta) {
            experienciaIdActiva = desdeMeta;
            return experienciaIdActiva;
        }
        return null;
    }

    function urlFetchExperiencia(id) {
        const tpl = resolverUrlExperienciaTpl();
        if (!tpl || !id) return '';
        const base = String(tpl).replace('__ID__', String(id));
        return base + (base.includes('?') ? '&' : '?') + '_=' + Date.now();
    }

    function fetchExperienciaDesdeServidor(id) {
        const url = urlFetchExperiencia(id);
        if (!url) {
            return $.Deferred().reject({ message: 'No hay URL de experiencia configurada.' }).promise();
        }
        return $.ajax({
            url,
            method: 'GET',
            dataType: 'json',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
    }

    function vincularElementos() {
        const $player = $('#vnDispositivo');
        if ($overlay.length && overlayEstaAbierto()) {
            $root = $overlay;
        } else if ($player.length && playerEstaActivo()) {
            $root = $player;
        } else if ($player.length && String($player.data('vn-defer') || '') === '1') {
            $root = $player;
        } else {
            $root = $('.cx-app').first();
        }
        $body = $root.find('.vn-screen-body').first();
        if (!$body.length) {
            $body = $('#vnDispositivo .vn-screen-body, #vnOverlay .vn-screen-body').first();
        }
        $progress = $root.find('#vnProgress').first();
        if (!$progress.length) $progress = $('#vnProgress').first();
        $stepLabel = $root.find('#vnStepLabel').first();
        if (!$stepLabel.length) $stepLabel = $('#vnStepLabel').first();
        $title = $root.find('#vnTitle').first();
        if (!$title.length) $title = $('#vnTitle').first();
        $blockName = $root.find('#vnBlockName').first();
        if (!$blockName.length) $blockName = $('#vnBlockName').first();
        $btnPrev = $root.find('#vnBtnPrev').first();
        if (!$btnPrev.length) $btnPrev = $('#vnBtnPrev').first();
        $btnNext = $root.find('#vnBtnNext').first();
        if (!$btnNext.length) $btnNext = $('#vnBtnNext').first();
        $tablet = $('#vnTablet');
        $stage = $('#vnTabletStage');
        $btnFullscreen = $root.find('#vnBtnFullscreen').first();
        if (!$btnFullscreen.length) $btnFullscreen = $('#vnBtnFullscreen').first();
    }

    function onBody(events, selector, handler) {
        $(document).on(
            events + '.vnBody',
            '#vnDispositivo #vnScreenBody ' + selector + ', #vnOverlay #vnScreenBody ' + selector,
            handler
        );
    }

    vincularElementos();

    const SCREEN_W = 1280;
    const SCREEN_H = 800;

    let bloques = [];
    let index = 0;
    let mediaBase = '';
    let experienciaNombre = 'Experiencia';
    let historiaPage = 0;
    let historiaAnimando = false;
    let retoPaso = 0;
    let intentosRestantes = null;
    let bloqueAvanceTimer = null;
    const BLOQUE_AVANCE_MS = 3000;
    let drawCtx = null;
    let paint = null;
    let paintListeners = [];
    let resizeTimer = null;
    let alTerminarExperiencia = null;
    let experienciaIdActiva = null;
    let urlExperienciaTpl = '';
    let evidenciaSesion = 0;

    const PAINT_SIZE_MAP = { s: 6, m: 12, l: 22 };
    const PAINT_DEFAULT_COLORS = [
        '#000000', '#FFFFFF', '#EF4444', '#F97316', '#F59E0B', '#FACC15',
        '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#A855F7',
        '#EC4899', '#78716C', '#94A3B8', '#64748B',
    ];

    const EMOCION_IDS = {
        4: ['feliz', 'emocionado', 'tranquilo', 'confundido'],
        6: ['feliz', 'emocionado', 'tranquilo', 'confundido', 'cansado', 'nervioso'],
    };

    const EMOCION_ETIQUETA = {
        nino: {
            feliz: 'Feliz',
            emocionado: 'Emocionado',
            tranquilo: 'Tranquilo',
            confundido: 'Confundido',
            cansado: 'Cansado',
            nervioso: 'Nervioso',
        },
        nina: {
            feliz: 'Feliz',
            emocionado: 'Emocionada',
            tranquilo: 'Tranquila',
            confundido: 'Confundida',
            cansado: 'Cansada',
            nervioso: 'Nerviosa',
        },
    };

    const EMOCION_IMAGEN = {
        nino: {
            feliz: 'NIÑO_FELIZ.png',
            emocionado: 'NIÑO_EMOCIONADO.png',
            tranquilo: 'NIÑO_TRANQUILO.png',
            confundido: 'NIÑO_CONFUNDIDO.png',
            cansado: 'NIÑO_CANSADO.png',
            nervioso: 'NIÑO_NERVIOSO.png',
        },
        nina: {
            feliz: 'NIÑA_FELIZ.png',
            emocionado: 'NIÑA_EMOCIONADA.png',
            tranquilo: 'NIÑA_TRANQUILA.png',
            confundido: 'NIÑA_CONFUNDIDA.png',
            cansado: 'NIÑA_CANSADA.png',
            nervioso: 'NIÑA_NERVIOSA.png',
        },
    };

    let estudianteSexo = '';
    let nivelEtario = 'jardin';
    let estudianteNombre = '';

    const NIVEL_ETARIO = {
        prejardin: { ttsRate: 0.82, touchScale: 1.35, simplificar: true, iconosNav: true },
        jardin: { ttsRate: 0.88, touchScale: 1.22, simplificar: true, iconosNav: true },
        transicion: { ttsRate: 0.94, touchScale: 1.1, simplificar: false, iconosNav: false },
        primaria: { ttsRate: 1.0, touchScale: 1.0, simplificar: false, iconosNav: false },
    };

    const ICONOS_BLOQUE = {
        bienvenida: '👋', audio: '🔊', video: '🎬', imagen: '🖼️', historia: '📖',
        ra: '📱', evidencia: '📸', juego: '🎮', dibujo: '🎨', pregunta: '❓',
        emparejar: '🔗', clasificacion: '📦', arrastrar: '✋', reto: '🏅',
        emocion: '💛', recompensa: '🏆',
    };

    const TITULOS_POR_NIVEL = {
        prejardin: {
            bienvenida: '¡Hola!', audio: '¡Escucha!', video: '¡Mira!', imagen: '¡Mira!',
            historia: 'Cuento', evidencia: '¡Tu foto!', dibujo: '¡Pinta!', pregunta: '¿Cuál?',
            emparejar: '¡Une!', clasificacion: '¡Ordena!', arrastrar: '¡Mueve!',
            reto: '¡Reto!', emocion: '¿Cómo estás?', recompensa: '¡Ganaste!',
        },
        jardin: {
            bienvenida: '¡Hola!', audio: 'Escucha', video: 'Mira el video', imagen: 'Observa',
            historia: 'Cuento', evidencia: '¡Tu evidencia!', dibujo: 'Dibuja', pregunta: 'Pregunta',
            emparejar: 'Empareja', clasificacion: 'Clasifica', arrastrar: 'Arrastra',
            reto: 'Reto', emocion: '¿Cómo te sentiste?', recompensa: '¡Lo lograste!',
        },
        transicion: {
            bienvenida: '¡Bienvenido!', audio: 'Escucha con atención', video: 'Observa el video',
            imagen: 'Mira la imagen', historia: 'Historia', evidencia: 'Registra tu evidencia',
            dibujo: 'Dibuja aquí', pregunta: 'Responde', emparejar: 'Empareja los pares',
            clasificacion: 'Clasifica', arrastrar: 'Arrastra a su lugar', reto: 'Supera el reto',
            emocion: '¿Cómo te sentiste?', recompensa: '¡Excelente trabajo!',
        },
    };

    function configNivel() {
        return NIVEL_ETARIO[nivelEtario] || NIVEL_ETARIO.jardin;
    }

    function resolverNivelEtario(valor) {
        const s = String(valor || '').trim().toLowerCase();
        if (s === 'prejardin' || s === 'prejardín') return 'prejardin';
        if (s === 'jardin' || s === 'jardín') return 'jardin';
        if (s === 'transicion' || s === 'transición') return 'transicion';
        if (s === 'primaria') return 'primaria';
        return 'jardin';
    }

    function aplicarNivelEtario() {
        const cls = `vn-nivel--${nivelEtario}`;
        const cfg = configNivel();
        const $hosts = $()
            .add($root)
            .add('#vnDispositivo')
            .add('#vnOverlay')
            .add('#vnTabletScreen');
        $hosts.removeClass('vn-nivel--prejardin vn-nivel--jardin vn-nivel--transicion vn-nivel--primaria vn-chrome-simple');
        $hosts.addClass(cls);
        if (cfg.simplificar) $hosts.addClass('vn-chrome-simple');
        $hosts.css('--vn-touch-scale', String(cfg.touchScale));
    }

    function tituloBloque(tipo, fallback) {
        const map = TITULOS_POR_NIVEL[nivelEtario] || TITULOS_POR_NIVEL.jardin;
        return map[tipo] || fallback;
    }

    function primerNombre() {
        const n = String(estudianteNombre || '').trim();
        if (!n) return configNivel().simplificar ? 'amiguito' : 'amigo';
        return n.split(/\s+/)[0];
    }

    function celebrarExito(intenso) {
        const host = $body[0] || $root[0];
        if (!host) return;
        const $burst = $('<div class="vn-celebrate" aria-hidden="true"></div>');
        const emojis = intenso ? ['⭐', '🌟', '✨', '🎉', '💫', '🎊'] : ['⭐', '✨', '🎉'];
        for (let i = 0; i < (intenso ? 14 : 8); i++) {
            const $p = $('<span class="vn-celebrate-p"></span>');
            $p.text(emojis[i % emojis.length]);
            $p.css({
                left: `${10 + Math.random() * 80}%`,
                top: `${15 + Math.random() * 50}%`,
                animationDelay: `${Math.random() * 0.35}s`,
                fontSize: `${1.2 + Math.random() * 1.4}rem`,
            });
            $burst.append($p);
        }
        $(host).append($burst);
        setTimeout(() => { $burst.remove(); }, 1600);
        reproducirSfx('ok');
    }

    function reproducirSfx(tipo) {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (tipo === 'ok') {
                osc.frequency.setValueAtTime(523, ctx.currentTime);
                osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
                osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            } else if (tipo === 'err') {
                osc.frequency.setValueAtTime(280, ctx.currentTime);
                osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.25);
            }
            setTimeout(() => { ctx.close(); }, 500);
        } catch (e) { /* noop */ }
    }

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

    function emocionesAssetsBase() {
        const base = $root.data('emociones-base')
            || $('#rnApp').data('emociones-base')
            || '/assets/images/emociones';
        return String(base).replace(/\/$/, '');
    }

    function normalizarSexoEmocion(valor) {
        const s = String(valor || '').trim().toLowerCase();
        if (s === 'femenino' || s === 'f' || s === 'niña' || s === 'nina' || s === 'mujer') return 'nina';
        return 'nino';
    }

    function resolverSexoEmocion() {
        return normalizarSexoEmocion(
            estudianteSexo
            || $root.data('estudiante-sexo')
            || $('#rnApp').data('estudiante-sexo')
        );
    }

    function emocionImgUrl(id) {
        const sexo = resolverSexoEmocion();
        const archivo = EMOCION_IMAGEN[sexo]?.[id] || EMOCION_IMAGEN.nino[id];
        if (!archivo) return '';
        return `${emocionesAssetsBase()}/${encodeURIComponent(archivo)}`;
    }

    function emocionLabel(id) {
        const sexo = resolverSexoEmocion();
        return EMOCION_ETIQUETA[sexo]?.[id] || EMOCION_ETIQUETA.nino[id] || id;
    }

    function datos(bloque) {
        return bloque?.datos || {};
    }

    function wrap(html, bloque, extraClass) {
        const warn = (bloque && !bloque.completo && !esModoDispositivo())
            ? '<div class="text-center"><span class="vn-badge-warn"><i class="fa-solid fa-triangle-exclamation"></i> Bloque incompleto</span></div>'
            : '';
        const cls = extraClass ? ` vn-card--${escapar(extraClass)}` : '';
        const paintBlocks = ['dibujo', 'juego-colorear'];
        const inner = paintBlocks.includes(extraClass)
            ? `${warn}${html}`
            : `<div class="vn-card-body">${warn}${html}</div>`;
        return `<div class="vn-block-fit"><div class="vn-card${cls}">${inner}</div></div>`;
    }

    function instruccionHtml(texto) {
        const t = String(texto || '').trim();
        if (!t) return '';
        return `<p class="vn-instruccion" data-vn-tts-text="${escapar(t)}">
            <button type="button" class="vn-tts-replay" data-vn-tts-replay title="Escuchar de nuevo" aria-label="Escuchar de nuevo">
                <i class="fa-solid fa-volume-high"></i>
            </button>
            <span>${escapar(t)}</span>
        </p>`;
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

    function etiquetaVideoPlay() {
        return configNivel().simplificar ? '¡Toca!' : 'Toca para ver';
    }

    function etiquetaVideoReplay() {
        return configNivel().simplificar ? '¡Otra vez!' : 'Toca para ver otra vez';
    }

    function htmlBotonEvidenciaAudio(attrs) {
        const label = configNivel().simplificar ? '¡Escucha!' : 'Toca para escuchar';
        return `<button type="button" class="vn-audio-btn vn-evidencia-replay-btn" ${attrs}>
            <span class="vn-audio-btn-ring" aria-hidden="true"></span>
            <span class="vn-audio-waves" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
            <span class="vn-audio-btn-icon"><i class="fa-solid fa-play"></i></span>
            <span class="vn-audio-btn-label">${escapar(label)}</span>
        </button>`;
    }

    function setEvidenciaAudioUi(refs, estado) {
        const $btn = refs.$audioPlayBtn;
        if (!$btn || !$btn.length) return;
        const $icon = $btn.find('.vn-audio-btn-icon');
        const $label = $btn.find('.vn-audio-btn-label');
        $btn.removeClass('is-playing is-done');
        if (estado === 'playing') {
            $btn.addClass('is-playing');
            $icon.html('<i class="fa-solid fa-volume-high"></i>');
            $label.text(configNivel().simplificar ? 'Sonando…' : 'Escuchando…');
            return;
        }
        $icon.html('<i class="fa-solid fa-play"></i>');
        $label.text(configNivel().simplificar ? '¡Escucha!' : 'Toca para escuchar');
    }

    function detenerEvidenciaReplay(refs) {
        if (!refs) return;
        if (refs.$audioEl && refs.$audioEl.length) {
            try {
                refs.$audioEl[0].pause();
                refs.$audioEl[0].currentTime = 0;
                refs.$audioEl[0].onended = null;
            } catch (e) { /* noop */ }
        }
        if (refs.$videoEl && refs.$videoEl.length) {
            try {
                refs.$videoEl[0].pause();
                refs.$videoEl[0].currentTime = 0;
                refs.$videoEl[0].onended = null;
            } catch (e) { /* noop */ }
        }
        setEvidenciaAudioUi(refs, 'idle');
        if (refs.$videoPlayBtn && refs.$videoPlayBtn.length) {
            setVideoBotonEstado(refs.$videoPlayBtn, refs.$videoStage, refs.$videoEl, 'idle');
        }
    }

    function reproducirEvidenciaAudio(refs) {
        const audio = refs.$audioEl && refs.$audioEl[0];
        if (!audio || !refs.$audioPlayBtn || !refs.$audioPlayBtn.length) return;
        if (refs.$audioPlayBtn.hasClass('is-playing')) {
            audio.pause();
            setEvidenciaAudioUi(refs, 'idle');
            return;
        }
        setEvidenciaAudioUi(refs, 'playing');
        try { audio.currentTime = 0; } catch (e) { /* noop */ }
        audio.onended = function () { setEvidenciaAudioUi(refs, 'idle'); };
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () { setEvidenciaAudioUi(refs, 'idle'); });
        }
    }

    function reproducirEvidenciaVideo(refs) {
        const video = refs.$videoEl && refs.$videoEl[0];
        if (!video || !refs.$videoPlayBtn || !refs.$videoPlayBtn.length) return;
        setVideoBotonEstado(refs.$videoPlayBtn, refs.$videoStage, refs.$videoEl, 'playing');
        try { video.currentTime = 0; } catch (e) { /* noop */ }
        video.muted = false;
        video.onended = function () {
            setVideoBotonEstado(refs.$videoPlayBtn, refs.$videoStage, refs.$videoEl, 'done');
        };
        const p = video.play();
        if (p && typeof p.catch === 'function') {
            p.catch(function () {
                setVideoBotonEstado(refs.$videoPlayBtn, refs.$videoStage, refs.$videoEl, 'idle');
                refs.$videoPlayBtn.addClass('vn-pulse-hint');
            });
        }
    }

    function htmlBotonVideo(attrs) {
        return `<button type="button" class="vn-video-btn vn-video-btn--hero vn-pulse-hint" ${attrs}>
            <span class="vn-video-btn-ring" aria-hidden="true"></span>
            <span class="vn-video-btn-icon"><i class="fa-solid fa-play"></i></span>
            <span class="vn-video-btn-label">${escapar(etiquetaVideoPlay())}</span>
        </button>`;
    }

    function setVideoBotonEstado($btn, $wrap, $video, estado) {
        if (!$btn || !$btn.length) return;
        $btn.removeClass('is-playing is-done');
        if (estado === 'playing') {
            $btn.removeClass('vn-pulse-hint').prop('hidden', true);
            if ($wrap && $wrap.length) $wrap.addClass('is-playing');
            if ($video && $video.length) $video.prop('hidden', false);
            return;
        }
        if ($wrap && $wrap.length) $wrap.removeClass('is-playing');
        $btn.prop('hidden', false);
        if (estado === 'done') {
            $btn.addClass('is-done');
            $btn.find('.vn-video-btn-icon').html('<i class="fa-solid fa-rotate-right"></i>');
            $btn.find('.vn-video-btn-label').text(etiquetaVideoReplay());
        } else {
            $btn.find('.vn-video-btn-icon').html('<i class="fa-solid fa-play"></i>');
            $btn.find('.vn-video-btn-label').text(etiquetaVideoPlay());
        }
        if ($video && $video.length) $video.prop('hidden', true);
    }

    function renderBienvenida(bloque) {
        const d = datos(bloque);
        const personaje = (d.personaje || 'personaje') !== 'ninguno';
        const tipoMedia = d.tipo_media || 'ninguno';
        const saludo = configNivel().simplificar
            ? `¡Hola, ${escapar(primerNombre())}!`
            : tituloBloque('bienvenida', '¡Hola!');
        let mediaHtml = '';
        if (tipoMedia === 'imagen') {
            const imgUrl = mediaUrl(d.imagen);
            if (imgUrl) {
                mediaHtml = `<div class="vn-pregunta-media vn-bienvenida-media vn-media-zoomable"><img src="${escapar(imgUrl)}" alt=""></div>`;
            }
        } else if (tipoMedia === 'video') {
            const vidUrl = mediaUrl(d.video);
            if (vidUrl) {
                mediaHtml = `
                    <div class="vn-bienvenida-media vn-video-stage vn-bienvenida-video-wrap" data-vn-bienvenida-video-wrap>
                        ${htmlBotonVideo('data-vn-bienvenida-play aria-label="Reproducir video de bienvenida"')}
                        <video class="vn-video-el vn-bienvenida-video" playsinline preload="auto"
                            src="${escapar(vidUrl)}" hidden aria-label="Video de bienvenida"></video>
                    </div>`;
            }
        }
        const emoji = personaje ? '🦊' : '👋';
        return wrap(`
            <div class="vn-bienvenida-hero">
                <div class="vn-hero-emoji vn-hero-emoji--wave" aria-hidden="true">${emoji}</div>
                <div class="vn-sparkles" aria-hidden="true"><span>✨</span><span>⭐</span><span>✨</span></div>
            </div>
            <h2 class="vn-title">${saludo}</h2>
            ${instruccionHtml(d.instruccion)}
            ${mediaHtml}
        `, bloque, 'bienvenida');
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
            <h2 class="vn-title">${tituloBloque('audio', 'Escucha')}</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-audio-stage" data-vn-audio-stage>
                <button type="button" class="vn-audio-btn vn-pulse-hint" data-vn-audio-play
                    data-reps="${escapar(reps)}" aria-label="Reproducir audio">
                    <span class="vn-audio-btn-ring" aria-hidden="true"></span>
                    <span class="vn-audio-waves" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
                    <span class="vn-audio-btn-icon"><i class="fa-solid fa-play"></i></span>
                    <span class="vn-audio-btn-label">${configNivel().simplificar ? '¡Toca!' : 'Toca para escuchar'}</span>
                </button>
                <p class="vn-audio-status" data-vn-audio-status hidden>Sonando…</p>
                <audio class="vn-audio-el" preload="auto" src="${escapar(url)}" hidden></audio>
            </div>
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
            <h2 class="vn-title">${tituloBloque('video', 'Mira el video')}</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-video-stage" data-vn-video-stage>
                ${htmlBotonVideo('data-vn-video-play aria-label="Reproducir video"')}
                <video class="vn-video-el" playsinline preload="metadata" src="${escapar(url)}" hidden></video>
            </div>
        `, bloque, 'video');
    }

    function renderImagen(bloque) {
        const d = datos(bloque);
        const url = mediaUrl(d.archivo);
        const imgHtml = url
            ? `<div class="vn-media vn-imagen-zoom" data-vn-imagen-zoom>
                <div class="vn-imagen-zoom-inner">
                    <img src="${escapar(url)}" alt="${escapar(d.descripcion || 'Imagen')}" draggable="false">
                </div>
            </div>`
            : '<p class="vn-empty">Sin imagen</p>';
        return wrap(`
            <h2 class="vn-title">${tituloBloque('imagen', 'Observa')}</h2>
            ${instruccionHtml(d.instruccion)}
            ${imgHtml}
        `, bloque, 'imagen');
    }

    function totalPaginasHistoria(bloque) {
        const d = datos(bloque);
        const pages = Array.isArray(d.paginas_data) ? d.paginas_data : [];
        return Math.max(pages.length, Number(d.paginas) || 0, 1);
    }

    function paginasHistoria(bloque) {
        const d = datos(bloque);
        return Array.isArray(d.paginas_data) ? d.paginas_data : [];
    }

    function paginaHistoriaMedia(page, num) {
        const url = mediaUrl(page?.imagen);
        if (!url) return '<p class="vn-empty">Sin imagen en esta página</p>';
        return `<div class="vn-media vn-historia-media"><img src="${escapar(url)}" alt="Página ${num}"></div>`;
    }

    function renderHistoriaLibro(bloque) {
        const pages = paginasHistoria(bloque);
        const page = pages[historiaPage] || {};
        const contenido = paginaHistoriaMedia(page, historiaPage + 1);
        return `<div class="vn-historia-libro" data-vn-historia-libro>
            <div class="vn-historia-libro-cuerpo">
                <div class="vn-historia-pagina" data-vn-hist-pagina>${contenido}</div>
                <div class="vn-historia-hoja" data-vn-hist-hoja hidden aria-hidden="true">
                    <div class="vn-historia-hoja-cara vn-historia-hoja-cara--frente" data-vn-hist-hoja-frente></div>
                    <div class="vn-historia-hoja-cara vn-historia-hoja-cara--atras" data-vn-hist-hoja-atras"></div>
                </div>
            </div>
        </div>`;
    }

    function dotsHistoriaHtml(total, current) {
        return Array.from({ length: total }, (_, i) =>
            `<span class="vn-hist-dot${i === current ? ' is-current' : ''}${i < current ? ' is-done' : ''}"></span>`
        ).join('');
    }

    function badgeHistoriaHtml(total, current) {
        return configNivel().simplificar
            ? `${current + 1} / ${total}`
            : `Página ${current + 1} de ${total}`;
    }

    function actualizarHistoriaMeta(bloque) {
        const total = totalPaginasHistoria(bloque);
        const puedeAnt = historiaPage > 0;
        const puedeSig = historiaPage < total - 1;
        const pages = paginasHistoria(bloque);
        const page = pages[historiaPage] || {};
        const audioUrl = mediaUrl(page.audio);
        const d = datos(bloque);
        const textoInstr = String(d.instruccion || '').trim();

        $body.find('.vn-historia-progress').html(dotsHistoriaHtml(total, historiaPage));
        $body.find('.vn-historia-badge').text(badgeHistoriaHtml(total, historiaPage));
        $body.find('[data-vn-hist-prev]').prop('disabled', !puedeAnt);
        $body.find('[data-vn-hist-next]').prop('disabled', !puedeSig);

        const $instr = $body.find('.vn-instruccion');
        if (historiaPage === 0 && textoInstr) {
            $instr.show();
        } else {
            $instr.hide();
        }

        let $audio = $body.find('.vn-historia-audio');
        if (audioUrl) {
            if (!$audio.length) {
                $body.find('.vn-historia-nav').before('<audio class="vn-historia-audio" preload="auto" hidden></audio>');
                $audio = $body.find('.vn-historia-audio');
            }
            $audio.attr('src', audioUrl);
        } else {
            $audio.remove();
        }
    }

    function finalizarVolteoHistoria(bloque, newIndex, pageNueva) {
        historiaPage = newIndex;
        const $pagina = $body.find('[data-vn-hist-pagina]');
        const $hoja = $body.find('[data-vn-hist-hoja]');

        $pagina.html(paginaHistoriaMedia(pageNueva, historiaPage + 1)).css('visibility', '');
        $hoja.prop('hidden', true)
            .removeClass('is-volteando-adelante is-volteando-atras is-sin-transicion');
        $body.find('[data-vn-hist-hoja-frente], [data-vn-hist-hoja-atras]').empty();
        historiaAnimando = false;
        actualizarHistoriaMeta(bloque);
        iniciarAudioHistoria();
        actualizarNavBloque();
        programarAjusteLayout();
    }

    function voltearHistoria(delta) {
        const bloque = bloques[index];
        if (!bloque || bloque.tipo !== 'historia' || historiaAnimando) return;
        const total = totalPaginasHistoria(bloque);
        const next = historiaPage + delta;
        if (next < 0 || next >= total) return;

        const pages = paginasHistoria(bloque);
        const prevPage = historiaPage;
        const pageActual = pages[prevPage] || {};
        const pageNueva = pages[next] || {};
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        detenerAudioHistoria();
        $body.find('.vn-hist-nav-btn').prop('disabled', true);

        if (reduceMotion) {
            finalizarVolteoHistoria(bloque, next, pageNueva);
            return;
        }

        const $pagina = $body.find('[data-vn-hist-pagina]');
        const $hoja = $body.find('[data-vn-hist-hoja]');
        const $frente = $body.find('[data-vn-hist-hoja-frente]');
        const $atras = $body.find('[data-vn-hist-hoja-atras]');
        let terminado = false;

        const terminar = () => {
            if (terminado) return;
            terminado = true;
            $hoja.off('transitionend.vnHist');
            clearTimeout(fallbackTimer);
            finalizarVolteoHistoria(bloque, next, pageNueva);
        };

        const fallbackTimer = setTimeout(terminar, 900);

        historiaAnimando = true;

        $frente.html(delta > 0
            ? paginaHistoriaMedia(pageActual, prevPage + 1)
            : paginaHistoriaMedia(pageNueva, next + 1));
        $atras.html(delta > 0
            ? paginaHistoriaMedia(pageNueva, next + 1)
            : paginaHistoriaMedia(pageActual, prevPage + 1));

        $hoja.removeClass('is-volteando-adelante is-volteando-atras is-sin-transicion');
        $pagina.css('visibility', 'hidden');
        $hoja.prop('hidden', false);

        if (delta > 0) {
            void $hoja[0].offsetWidth;
            $hoja.addClass('is-volteando-adelante');
        } else {
            $hoja.addClass('is-volteando-atras is-sin-transicion');
            void $hoja[0].offsetWidth;
            $hoja.removeClass('is-sin-transicion');
        }

        $hoja.on('transitionend.vnHist', function (e) {
            if (e.target !== this || e.propertyName !== 'transform') return;
            terminar();
        });
    }

    function navegarHistoria(delta) {
        voltearHistoria(delta);
    }

    function renderHistoria(bloque) {
        const d = datos(bloque);
        const total = totalPaginasHistoria(bloque);
        if (historiaPage >= total) historiaPage = total - 1;
        if (historiaPage < 0) historiaPage = 0;
        const page = paginasHistoria(bloque)[historiaPage] || {};
        const audioUrl = mediaUrl(page.audio);
        const puedeAnt = historiaPage > 0;
        const puedeSig = historiaPage < total - 1;
        return wrap(`
            <h2 class="vn-title">${tituloBloque('historia', 'Cuento')}</h2>
            <div class="vn-historia-progress" aria-hidden="true">${dotsHistoriaHtml(total, historiaPage)}</div>
            <p class="vn-paso-badge vn-historia-badge">${badgeHistoriaHtml(total, historiaPage)}</p>
            ${instruccionHtml(d.instruccion)}
            ${renderHistoriaLibro(bloque)}
            ${audioUrl ? `<audio class="vn-historia-audio" preload="auto" src="${escapar(audioUrl)}" hidden></audio>` : ''}
            <div class="vn-historia-nav">
                <button type="button" class="vn-hist-nav-btn vn-hist-nav-btn--big" data-vn-hist-prev ${puedeAnt ? '' : 'disabled'}>
                    <i class="fa-solid fa-arrow-left"></i> ${configNivel().simplificar ? '' : 'Anterior'}
                </button>
                <button type="button" class="vn-hist-nav-btn vn-hist-nav-btn--big" data-vn-hist-next ${puedeSig ? '' : 'disabled'}>
                    ${configNivel().simplificar ? '' : 'Siguiente'} <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `, bloque, 'historia');
    }

    function renderRa(bloque) {
        const d = datos(bloque);
        return wrap(`
            <div class="vn-ra-stage">
                <div class="vn-ra-scanner" aria-hidden="true">
                    <div class="vn-ra-scan-frame">
                        <span class="vn-ra-corner vn-ra-corner--tl"></span>
                        <span class="vn-ra-corner vn-ra-corner--tr"></span>
                        <span class="vn-ra-corner vn-ra-corner--bl"></span>
                        <span class="vn-ra-corner vn-ra-corner--br"></span>
                        <div class="vn-ra-marker">${escapar(d.marcador || '?')}</div>
                        <div class="vn-ra-scan-line"></div>
                    </div>
                </div>
                <h2 class="vn-title">${configNivel().simplificar ? '¡Magia!' : 'Realidad aumentada'}</h2>
                ${instruccionHtml(d.instruccion)}
                <p class="vn-ra-hint">${configNivel().simplificar
                ? '¡Apunta la tablet!'
                : escapar(d.contenido || 'Animación 3D')}</p>
                <button type="button" class="vn-ra-listo-btn vn-pulse-hint" data-vn-ra-listo>
                    <i class="fa-solid fa-check"></i>
                    ${configNivel().simplificar ? '¡Lo vi!' : 'Ya vi el marcador'}
                </button>
            </div>
        `, bloque, 'ra');
    }

    function evidenciaTipoKey(tipo) {
        const t = String(tipo || 'Foto').toLowerCase();
        if (t.includes('audio')) return 'audio';
        if (t.includes('video')) return 'video';
        if (t.includes('selección') || t.includes('seleccion')) return 'seleccion';
        return 'foto';
    }

    function renderEvidencia(bloque) {
        const d = datos(bloque);
        const tipo = d.tipo || 'Foto';
        const tipoKey = evidenciaTipoKey(tipo);
        const icon = tipoKey === 'audio' ? 'fa-microphone'
            : (tipoKey === 'video' ? 'fa-video'
                : (tipoKey === 'seleccion' ? 'fa-image' : 'fa-camera'));
        const label = configNivel().simplificar
            ? (tipoKey === 'seleccion' ? '¡Elige!' : (tipoKey === 'audio' ? '¡Graba!' : (tipoKey === 'video' ? '¡Graba!' : '¡Foto!')))
            : tipo;
        const capturaLabel = configNivel().simplificar
            ? '¡Ya!'
            : (tipoKey === 'foto' ? 'Capturar' : 'Detener');
        const fileAccept = tipoKey === 'video' ? 'video/*' : 'image/*';
        const fileCapture = (tipoKey === 'video' || tipoKey === 'foto') ? 'environment' : '';
        const hintNativo = (window.VnCaptura && window.VnCaptura.hayNativo())
            ? (tipoKey === 'audio'
                ? (configNivel().simplificar ? 'Toca para grabar tu voz.' : 'Se abrirá el micrófono del dispositivo.')
                : (tipoKey === 'video'
                    ? (configNivel().simplificar ? 'Toca para grabar.' : 'Se abrirá la cámara para grabar (máx. 45 s).')
                    : (configNivel().simplificar ? 'Toca para tomar foto.' : 'Se abrirá la cámara del dispositivo.')))
            : '';
        return wrap(`
            <h2 class="vn-title">${tituloBloque('evidencia', '¡Tu evidencia!')}</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-evidencia-wrap">
                <div class="vn-evidencia-stage" data-vn-evidencia-stage hidden>
                    <video class="vn-evidencia-preview" playsinline webkit-playsinline muted hidden></video>
                    <img class="vn-evidencia-result" alt="" hidden>
                    <div class="vn-evidencia-replay vn-evidencia-replay--audio" data-vn-evidencia-replay="audio" hidden>
                        ${htmlBotonEvidenciaAudio('data-vn-evidencia-audio-play aria-label="Escuchar evidencia"')}
                        <audio class="vn-evidencia-audio-el" playsinline hidden></audio>
                    </div>
                    <div class="vn-evidencia-replay vn-evidencia-replay--video" data-vn-evidencia-replay="video" hidden>
                        <div class="vn-video-stage vn-evidencia-video-stage" data-vn-evidencia-video-stage>
                            ${htmlBotonVideo('data-vn-evidencia-video-play aria-label="Ver evidencia"')}
                            <video class="vn-evidencia-video-el vn-video-el" playsinline hidden></video>
                        </div>
                    </div>
                    <div class="vn-evidencia-recording" hidden>
                        <i class="fa-solid fa-microphone vn-evidencia-recording-icon"></i>
                        <span class="vn-evidencia-recording-label">${configNivel().simplificar ? '¡Graba!' : 'Grabando…'}</span>
                        <div class="vn-evidencia-contador" hidden aria-hidden="true">00:00</div>
                    </div>
                    <div class="vn-evidencia-preview-placeholder" hidden>
                        <i class="fa-solid ${icon}"></i>
                        <span>¡Listo!</span>
                    </div>
                </div>
                <p class="vn-evidencia-estado" data-vn-evidencia-estado hidden aria-live="polite"></p>
                <input type="file" class="vn-evidencia-file" data-vn-evidencia-file
                    accept="${escapar(fileAccept)}"${fileCapture ? ' capture="' + fileCapture + '"' : ''} hidden>
                <div class="vn-evidencia-actions">
                    <div class="vn-evidencia-action">
                        <button type="button"
                            class="vn-evidencia-btn vn-evidencia-btn--${escapar(tipoKey)} vn-pulse-hint"
                            data-vn-evidencia data-vn-evidencia-tipo="${escapar(tipoKey)}"
                            aria-label="${escapar(label)}">
                            <span class="vn-evidencia-btn-glow" aria-hidden="true"></span>
                            <span class="vn-evidencia-btn-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>
                        </button>
                        <span class="vn-evidencia-btn-label">${escapar(label)}</span>
                    </div>
                    <button type="button" class="vn-evidencia-captura-btn vn-pulse-hint" data-vn-evidencia-captura hidden
                        aria-label="${escapar(capturaLabel)}">
                        <span class="vn-evidencia-captura-icon" aria-hidden="true"><i class="fa-solid fa-stop"></i></span>
                        <span class="vn-evidencia-captura-label" data-vn-evidencia-captura-label>${escapar(capturaLabel)}</span>
                    </button>
                </div>
                ${hintNativo ? `<p class="vn-evidencia-hint">${escapar(hintNativo)}</p>` : ''}
            </div>
            <div class="vn-evidencia-msg vn-feedback is-ok" id="vnEvidenciaMsg" hidden>${configNivel().simplificar ? '¡Listo!' : '¡Muy bien! Tu evidencia quedó lista.'}</div>
        `, bloque, 'evidencia');
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
            <div class="vn-puzzle" data-vn-puzzle data-cols="${cols}" data-rows="${rows}" data-total="${n}">
                <div class="vn-puzzle-board" style="--vn-puzzle-ar:${cols} / ${rows};grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);">${slots}</div>
                <div class="vn-puzzle-pool">${pieces}</div>
            </div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `;
    }

    function renderPaintToolbar(options) {
        const colors = options.colors || PAINT_DEFAULT_COLORS;
        const showShapes = !!options.showShapes;
        const customColor = options.fixedColors ? '' : `
            <label class="vn-paint-swatch vn-paint-swatch--custom" title="Más colores" aria-label="Elegir otro color">
                <span class="vn-paint-swatch-custom-bg" style="background:${escapar(colors[2] || '#EF4444')}"></span>
                <span class="vn-paint-swatch-custom-icon" aria-hidden="true"><i class="fa-solid fa-plus"></i></span>
                <span class="vn-paint-swatch-custom-label">Más</span>
                <input type="color" class="vn-paint-color-input" value="${escapar(colors[2] || '#EF4444')}" aria-label="Elegir color personalizado">
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
            `<button type="button" class="vn-paint-swatch"
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
            <div class="vn-paint vn-paint--colorear" data-vn-paint="colorear">
                ${toolbar}
                <div class="vn-paint-stage vn-colorear-stage">
                    <div class="vn-colorear-bg" style="background-image:url('${escapar(url)}')"></div>
                    <canvas id="vnCanvas" class="vn-colorear-canvas" aria-label="Lienzo para colorear"></canvas>
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
            <div class="vn-secuencia" data-vn-secuencia data-total="${items.length}">${cards}</div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `;
    }

    function juegoHeadHtml(d, id, opts) {
        const o = opts || {};
        const titulo = escapar(d.juego_nombre || (id === 'colorear' ? 'Colorea' : 'Juego'));
        const paintCls = id === 'colorear' ? ' vn-juego-head--paint' : '';
        let extra = '';
        if (id === 'memoria' && o.paresTotal != null) {
            const p = o.paresTotal;
            extra = `<p class="vn-memory-score" data-vn-memory-score>${configNivel().simplificar ? `⭐ 0 / ${p}` : `0 / ${p} parejas`}</p>`;
        } else if (id === 'rompecabezas') {
            const tapHint = esModoDispositivo()
                ? (configNivel().simplificar ? ' · Toca pieza y hueco' : ' · También puedes tocar la pieza y luego el hueco')
                : '';
            extra = `<p class="vn-puzzle-meta">${configNivel().simplificar
                ? '¡Pon cada pieza!'
                : `${escapar(d.juego_piezas || '4 piezas')} · Arrastra cada pieza a su lugar`}${tapHint}</p>`;
        } else if (id === 'secuencia' && o.seqNums) {
            extra = `<p class="vn-puzzle-meta">${configNivel().simplificar ? '¡Ordénalas!' : 'Arrastra las imágenes y ordénalas'}</p>
                <div class="vn-seq-nums" aria-hidden="true">${o.seqNums}</div>`;
        }
        return `<div class="vn-juego-head${paintCls}">
            <h2 class="vn-title vn-title--compact">${titulo}</h2>
            ${instruccionHtml(d.instruccion)}
            ${extra}
        </div>`;
    }

    function renderJuego(bloque) {
        const d = datos(bloque);
        const id = d.juego_id || '';
        let extra = '';
        let cardClass = 'juego';
        let headOpts = {};
        if (id === 'memoria') {
            cardClass = 'juego-memoria';
            const imgs = [1, 2, 3, 4, 5, 6].map((i) => d[`imagen_${i}`]).filter(Boolean);
            const deck = imgs.concat(imgs).map((f, i) => ({ key: i, file: f, pair: f }));
            shuffleInPlace(deck);
            const paresTotal = imgs.length;
            headOpts = { paresTotal };
            extra = `<div class="vn-memory" data-vn-memory data-pares="${paresTotal}">${deck.map((c, i) =>
                `<button type="button" class="vn-memory-card" data-i="${i}" data-pair="${escapar(c.pair)}" aria-label="Tarjeta">
                    <span class="vn-memory-back" aria-hidden="true">?</span>
                </button>`
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
            const items = [1, 2, 3, 4]
                .map((i) => ({ orden: i - 1, file: d[`seq_${i}`] }))
                .filter((x) => x.file);
            if (items.length >= 3) {
                headOpts = {
                    seqNums: items.map((_, i) => `<span class="vn-seq-num">${i + 1}</span>`).join(''),
                };
            }
            extra = renderSecuencia(d);
        } else {
            extra = '<p class="vn-empty">Elige un juego en la configuración</p>';
        }
        return wrap(`${juegoHeadHtml(d, id, headOpts)}${extra}`, bloque, cardClass);
    }

    function renderDibujo(bloque) {
        const d = datos(bloque);
        const fondo = mediaUrl(d.fondo);
        const toolbar = renderPaintToolbar({
            colors: PAINT_DEFAULT_COLORS,
            fixedColors: false,
            showShapes: true,
        });
        const stageStyle = fondo
            ? ` style="background:url('${escapar(fondo)}') center/contain no-repeat #fff"`
            : '';
        return wrap(`
            <div class="vn-paint-head">
                <h2 class="vn-title vn-title--compact">${tituloBloque('dibujo', 'Dibuja')}</h2>
                ${instruccionHtml(d.instruccion)}
            </div>
            <div class="vn-paint vn-paint--dibujo" data-vn-paint="dibujo">
                ${toolbar}
                <div class="vn-paint-stage vn-draw-stage"${stageStyle}>
                    <canvas id="vnCanvas" class="vn-draw-canvas" aria-label="Lienzo de dibujo"></canvas>
                </div>
            </div>
        `, bloque, 'dibujo');
    }

    function renderPregunta(bloque) {
        const d = datos(bloque);
        const ops = Array.isArray(d.opciones) ? d.opciones : [];
        const tipo = d.tipo_opts || 'emoji_texto';
        const textoPregunta = String(d.texto || '').trim();
        const instruccion = String(d.instruccion || '').trim();
        const mostrarInstruccion = instruccion && (!textoPregunta || instruccion !== textoPregunta);
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
        const preguntaImg = mediaUrl(d.imagen);
        const preguntaImgHtml = preguntaImg
            ? `<div class="vn-pregunta-media"><img src="${escapar(preguntaImg)}" alt=""></div>`
            : '';
        const tituloHtml = textoPregunta
            ? `<h2 class="vn-title vn-pregunta-enunciado" data-vn-tts-text="${escapar(textoPregunta)}">${escapar(textoPregunta)}</h2>`
            : `<h2 class="vn-title">${tituloBloque('pregunta', 'Pregunta')}</h2>`;
        const instrHtml = mostrarInstruccion ? instruccionHtml(instruccion) : '';
        return wrap(`
            <div class="vn-pregunta-head">
                ${tituloHtml}
                ${instrHtml}
            </div>
            ${preguntaImgHtml}
            <div class="vn-options" data-vn-pregunta data-count="${ops.length}" data-fb-ok="${escapar(d.fb_ok || '¡Muy bien!')}"
                data-fb-err="${escapar(d.fb_err || 'Inténtalo de nuevo')}"
                data-intentos="${escapar(d.intentos || '2')}"
                data-al-agotar="${escapar(d.al_agotar || 'Mostrar respuesta correcta')}">${optsHtml}</div>
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
            <h2 class="vn-title">${tituloBloque('emparejar', 'Empareja')}</h2>
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
        const zonas = cats.map((c, i) =>
            `<div class="vn-zone" data-vn-cat="${escapar(c)}" style="background:${pickColor(c)}; --vn-i:${i}">
                <span class="vn-zone-label">${escapar(c)}</span>
                <div class="vn-zone-slots" aria-hidden="true"></div>
            </div>`
        ).join('');
        const pool = items.map((it, i) => {
            const label = it.texto || (it.imagen ? '' : 'Ítem');
            const img = it.imagen ? `<img src="${escapar(mediaUrl(it.imagen))}" alt="">` : '';
            const text = label ? `<span>${escapar(label)}</span>` : '';
            return `<button type="button" class="vn-chip vn-chip-drag" data-vn-item="${i}" data-cat="${escapar(it.categoria || '')}" aria-grabbed="false" style="--vn-i:${i}">${img}${text || '—'}</button>`;
        }).join('');
        return wrap(`
            <h2 class="vn-title">${tituloBloque('clasificacion', 'Clasifica')}</h2>
            ${instruccionHtml(d.instruccion)}
            <p class="vn-hint-drag">${configNivel().simplificar ? '¡Arrastra cada cosa a su lugar!' : 'Arrastra cada elemento a su categoría'}</p>
            <div class="vn-sort-board" data-vn-clasif-board>
                <div class="vn-sort-col vn-sort-col--pool" data-vn-clasif-pool>${pool}</div>
                <div class="vn-sort-col vn-sort-col--zones" data-vn-clasif>${zonas}</div>
            </div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `, bloque, 'clasificacion');
    }

    function renderArrastrar(bloque) {
        const d = datos(bloque);
        const zonas = Array.isArray(d.zonas) ? d.zonas : [];
        const items = Array.isArray(d.items) ? d.items : [];
        const zHtml = zonas.map((z, i) =>
            `<div class="vn-zone" data-vn-zona="${escapar(z.nombre || '')}" style="background:${escapar(z.color || '#0F6E56')}; --vn-i:${i}">
                <span class="vn-zone-label">${escapar(z.nombre || 'Zona')}</span>
                <div class="vn-zone-slots" aria-hidden="true"></div>
            </div>`
        ).join('');
        const pool = items.map((it, i) => {
            const label = it.texto || (it.imagen ? '' : 'Ítem');
            const img = it.imagen ? `<img src="${escapar(mediaUrl(it.imagen))}" alt="">` : '';
            const text = label ? `<span>${escapar(label)}</span>` : '';
            return `<button type="button" class="vn-chip vn-chip-drag" data-vn-item="${i}" data-zona="${escapar(it.zona || '')}"
                aria-grabbed="false" style="--vn-i:${i}">${img}${text || '—'}</button>`;
        }).join('');
        return wrap(`
            <h2 class="vn-title">${tituloBloque('arrastrar', 'Arrastra')}</h2>
            ${instruccionHtml(d.instruccion)}
            <p class="vn-hint-drag">${configNivel().simplificar ? '¡Llévalo a su lugar!' : 'Arrastra cada elemento a su zona'}</p>
            <div class="vn-sort-board" data-vn-arrastrar-board>
                <div class="vn-sort-col vn-sort-col--pool" data-vn-arrastrar-pool>${pool}</div>
                <div class="vn-sort-col vn-sort-col--zones" data-vn-arrastrar>${zHtml}</div>
            </div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `, bloque, 'arrastrar');
    }

    function colocarChipEnZona($chip, zoneEl) {
        if (!$chip || !$chip.length || !zoneEl) return;
        const $slots = $(zoneEl).find('.vn-zone-slots').first();
        if (!$slots.length) {
            $chip.addClass('is-matched').removeClass('is-selected');
            alCompletarActividad();
            return;
        }
        const placed = $chip[0].cloneNode(true);
        placed.classList.remove('is-selected', 'is-dragging', 'vn-chip-drag');
        placed.classList.add('is-placed', 'vn-chip--placed');
        placed.removeAttribute('aria-grabbed');
        placed.style.pointerEvents = 'none';
        placed.type = 'button';
        placed.disabled = true;
        $slots.append(placed);
        $chip.addClass('is-matched is-leaving').removeClass('is-selected');
        setTimeout(() => { $chip.prop('hidden', true); }, 280);
        zoneEl.classList.add('is-landed');
        setTimeout(() => { zoneEl.classList.remove('is-landed'); }, 450);
        alCompletarActividad();
    }

    function flashUnionEmparejar($izq, $der) {
        if (!$izq || !$izq.length || !$der || !$der.length) return;
        const a = $izq[0].getBoundingClientRect();
        const b = $der[0].getBoundingClientRect();
        const x1 = a.left + a.width / 2;
        const y1 = a.top + a.height / 2;
        const x2 = b.left + b.width / 2;
        const y2 = b.top + b.height / 2;
        const len = Math.hypot(x2 - x1, y2 - y1);
        const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        const $line = $('<div class="vn-match-line" aria-hidden="true"></div>');
        $line.css({
            width: `${len}px`,
            left: `${x1}px`,
            top: `${y1}px`,
            transform: `rotate(${ang}deg)`,
        });
        $(document.body).append($line);
        setTimeout(() => { $line.remove(); }, 700);
    }

    function renderReto(bloque) {
        const d = datos(bloque);
        const pasos = Array.isArray(d.pasos) ? d.pasos : [];
        if (retoPaso >= pasos.length) retoPaso = Math.max(0, pasos.length - 1);
        const paso = pasos[retoPaso] || { pregunta: '', opciones: [] };
        const textoPaso = String(paso.pregunta || '').trim();
        const nombreReto = String(d.descripcion || '').trim();
        const instruccion = String(d.instruccion || '').trim();
        const enunciado = textoPaso
            || (retoPaso === 0 ? instruccion : '')
            || nombreReto
            || tituloBloque('reto', 'Reto');
        const mostrarInstruccion = retoPaso === 0 && instruccion && textoPaso
            && instruccion !== textoPaso;
        const mostrarNombre = nombreReto && nombreReto !== enunciado;
        const mostrarBadge = pasos.length > 1;
        const metaHtml = (mostrarNombre || mostrarBadge)
            ? `<div class="vn-reto-meta">${mostrarNombre
                ? `<span class="vn-reto-nombre">${escapar(nombreReto)}</span>`
                : ''}${mostrarBadge
                    ? `<span class="vn-paso-badge">${configNivel().simplificar
                        ? `${retoPaso + 1} / ${pasos.length}`
                        : `Paso ${retoPaso + 1} de ${pasos.length}`}</span>`
                    : ''}</div>`
            : '';
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
            <div class="vn-reto-head">
                ${metaHtml}
                <h2 class="vn-title vn-pregunta-enunciado" data-vn-tts-text="${escapar(enunciado)}">${escapar(enunciado)}</h2>
                ${mostrarInstruccion ? instruccionHtml(instruccion) : ''}
            </div>
            <div class="vn-options" data-vn-reto data-count="${(paso.opciones || []).length}" data-fb-ok="${escapar(d.fb_ok || '¡Correcto!')}"
                data-fb-err="${escapar(d.fb_err || 'Casi…')}" data-intentos="${escapar(d.intentos || '2')}"
                data-al-agotar="${escapar(d.al_agotar || 'Mostrar respuesta correcta')}"
                data-total-pasos="${pasos.length}">${ops}</div>
            <div class="vn-feedback" id="vnFb" hidden></div>
        `, bloque, 'reto');
    }

    function renderEmocion(bloque) {
        const d = datos(bloque);
        const n = String(d.cantidad || '6') === '4' ? 4 : 6;
        const list = EMOCION_IDS[n];
        const titulo = configNivel().simplificar
            ? '¿Cómo estás?'
            : tituloBloque('emocion', 'Ahora cuéntame, ¿cómo te sentiste?');
        return wrap(`
            <h2 class="vn-title">${titulo}</h2>
            ${instruccionHtml(d.instruccion)}
            <div class="vn-emociones" data-vn-emocion data-count="${n}" data-sexo="${escapar(resolverSexoEmocion())}">
                ${list.map((id) => {
            const label = emocionLabel(id);
            const imgUrl = emocionImgUrl(id);
            return `<button type="button" class="vn-emocion vn-pulse-hint" data-id="${escapar(id)}">
                        <img class="vn-emocion-img" src="${escapar(imgUrl)}" alt="${escapar(label)}">
                        <span class="vn-emocion-label">${escapar(label)}</span>
                    </button>`;
        }).join('')}
            </div>
        `, bloque, 'emocion');
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
            <div class="vn-reward vn-reward--celebrate">
                <div class="vn-reward-rays" aria-hidden="true"></div>
                <div class="vn-reward-icon vn-reward-icon--bounce">${icon}</div>
                <h2 class="vn-title">${tituloBloque('recompensa', '¡Lo lograste!')}</h2>
                ${instruccionHtml(d.instruccion)}
                ${insignia}
            </div>
        `, bloque, 'recompensa');
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
        const usarIconos = configNivel().iconosNav && nivelEtario !== 'primaria';
        $progress.html(bloques.map((b, i) => {
            let cls = 'vn-dot';
            if (i < index) cls += ' is-done';
            if (i === index) cls += ' is-current';
            const icon = usarIconos ? (ICONOS_BLOQUE[b.tipo] || '•') : '';
            const inner = usarIconos
                ? `<span class="vn-dot-icon">${icon}</span>`
                : '';
            return `<span class="${cls}" title="${escapar(b.nombre || b.tipo)}">${inner}</span>`;
        }).join(''));
        if (configNivel().simplificar) {
            $stepLabel.prop('hidden', true).text('');
        } else {
            $stepLabel.prop('hidden', false).text(`Paso ${index + 1} de ${bloques.length || 1}`);
        }
    }

    function overlayAbierto() {
        if (playerEstaActivo()) return true;
        return overlayEstaAbierto();
    }

    function ajustarEscalaTablet() {
        if (esModoDispositivo() || !$tablet.length || !overlayAbierto()) return;

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

    function esBloquePintar(bloque) {
        if (!bloque) return false;
        if (bloque.tipo === 'dibujo') return true;
        return bloque.tipo === 'juego' && datos(bloque).juego_id === 'colorear';
    }

    function ajustarBloqueAlViewport() {
        if (!$body || !$body.length || !overlayAbierto()) return;

        const bloque = bloques[index];
        if (esBloquePintar(bloque)) return;

        const $fit = $body.children('.vn-block-fit').first();
        const $card = $fit.length ? $fit.children('.vn-card').first() : $body.children('.vn-card').first();
        if (!$card.length) return;

        $card.css({ transform: 'none', marginTop: '', marginBottom: '' });

        if (esModoDispositivo()) return;

        const bodyEl = $body[0];
        const cardEl = $card[0];
        const availW = bodyEl.clientWidth;
        const availH = bodyEl.clientHeight;
        if (availW <= 0 || availH <= 0) return;

        const naturalW = cardEl.scrollWidth;
        const naturalH = cardEl.scrollHeight;
        if (naturalW <= 0 || naturalH <= 0) return;

        let scale = Math.min(availW / naturalW, availH / naturalH, 1);
        if (scale >= 0.999) return;

        scale = Math.max(0.32, scale);
        const visualH = naturalH * scale;
        const padTop = Math.max(0, (availH - visualH) / 2);

        $card.css({
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            marginTop: padTop + 'px',
            marginBottom: (visualH - naturalH) + 'px',
        });
    }

    function ajustarLayoutPintar() {
        const bloque = bloques[index];
        if (!esBloquePintar(bloque) || !$body || !$body.length) return;

        const $card = $body.find('.vn-card--dibujo, .vn-card--juego-colorear').first();
        if ($card.length) {
            $card.css({ transform: 'none', marginTop: '', marginBottom: '' });
        }

        // Dejar que el flex CSS ocupe el espacio; limpiar tamaños inline previos.
        $body.find('.vn-paint, .vn-paint-stage').css({
            minHeight: '',
            height: '',
            maxHeight: '',
            minWidth: '',
            width: '',
            flex: '',
        });
    }

    function ajustarCanvasPaint() {
        const canvas = document.getElementById('vnCanvas');
        if (!canvas) return;
        const stage = canvas.closest('.vn-paint-stage');
        if (!stage) return;

        const w = Math.round(stage.clientWidth);
        const h = Math.round(stage.clientHeight);
        if (w <= 0 || h <= 0) return;

        const needsResize = canvas.width !== w || canvas.height !== h;
        if (!needsResize && drawCtx && paint) return;

        let snap = null;
        if (needsResize && drawCtx && paint) {
            try {
                snap = canvas.toDataURL();
            } catch (e) { /* noop */ }
        }

        if (needsResize) {
            canvas.width = w;
            canvas.height = h;
        }

        if (!drawCtx || !paint) return;

        if (snap && needsResize) {
            const img = new Image();
            img.onload = function () {
                if (!drawCtx || !paint) return;
                if (paint.mode === 'dibujo' && !paint.hasFondo) {
                    drawCtx.fillStyle = '#ffffff';
                    drawCtx.fillRect(0, 0, w, h);
                }
                drawCtx.drawImage(img, 0, 0, w, h);
                paint.history = [];
                paintSaveState();
            };
            img.src = snap;
            return;
        }

        if (paint.mode === 'dibujo' && !paint.hasFondo && (!paint.history || paint.history.length <= 1)) {
            drawCtx.fillStyle = '#ffffff';
            drawCtx.fillRect(0, 0, w, h);
        }
        if (!paint.history || !paint.history.length) {
            paintSaveState();
        }
    }

    function programarAjusteLayout() {
        requestAnimationFrame(function () {
            ajustarEscalaTablet();
            ajustarLayoutPintar();
            ajustarBloqueAlViewport();
            ajustarCanvasPaint();
            requestAnimationFrame(function () {
                ajustarLayoutPintar();
                ajustarBloqueAlViewport();
                ajustarCanvasPaint();
            });
        });
    }

    function pintar() {
        vincularElementos();
        if (typeof limpiarDragArrastrar === 'function') limpiarDragArrastrar();
        if (typeof limpiarDragPuzzle === 'function') limpiarDragPuzzle();
        limpiarSeleccionPuzzle();
        if (typeof limpiarDragSecuencia === 'function') limpiarDragSecuencia();
        if (typeof limpiarPaint === 'function') limpiarPaint();
        limpiarEvidenciaRecursos();
        cancelarAvanceAutomatico();
        detenerVoz();
        historiaAnimando = false;
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
        $body.removeData('vn-bloque-visto vn-bienvenida-video-ok');
        $body.toggleClass('vn-body--paint', esBloquePintar(bloque));
        $body.html(renderBloque(bloque));
        $btnPrev.prop('disabled', index <= 0);
        renderProgress();
        initInteracciones(bloque);
        actualizarNavBloque();
        $body.scrollTop(0);
        programarAjusteLayout();
        if (bloque.tipo === 'recompensa') {
            setTimeout(() => { celebrarExito(true); }, 400);
        }
    }

    let ttsToken = 0;
    let ttsKeepAlive = null;
    let ttsPlayer = null;

    if (window.speechSynthesis) {
        try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
        window.speechSynthesis.addEventListener('voiceschanged', function () {
            window.speechSynthesis.getVoices();
        });
    }

    function asegurarTtsPlayer() {
        if (!ttsPlayer) ttsPlayer = new Audio();
        return ttsPlayer;
    }

    function desbloquearAudioTts() {
        const player = asegurarTtsPlayer();
        try {
            player.onended = null;
            player.onerror = null;
            player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
            const p = player.play();
            if (p && typeof p.catch === 'function') p.catch(function () { /* noop */ });
        } catch (e) { /* noop */ }
    }

    function vozNaturalEspanol() {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        let best = null;
        let bestScore = -1;
        voices.forEach((v) => {
            const lang = String(v.lang || '').toLowerCase().replace('_', '-');
            const name = String(v.name || '').toLowerCase();
            const es = lang.startsWith('es') || /spanish|español/.test(name);
            if (!es) return;
            let score = 10;
            if (v.localService === false) score += 70;
            if (/google/.test(name)) score += 80;
            if (/natural|neural|online|premium|enhanced|wavenet|studio/.test(name)) score += 50;
            if (/desktop|espeak|microsoft zira/.test(name)) score -= 40;
            if (lang.indexOf('co') >= 0) score += 18;
            else if (lang.indexOf('mx') >= 0) score += 16;
            else if (lang.indexOf('us') >= 0 || lang.indexOf('419') >= 0) score += 12;
            if (score > bestScore) {
                bestScore = score;
                best = v;
            }
        });
        return best;
    }

    function detenerVoz() {
        ttsToken += 1;
        if (ttsKeepAlive) {
            clearInterval(ttsKeepAlive);
            ttsKeepAlive = null;
        }
        if (ttsPlayer) {
            try {
                ttsPlayer.onended = null;
                ttsPlayer.onerror = null;
                ttsPlayer.pause();
                ttsPlayer.removeAttribute('src');
                ttsPlayer.load();
            } catch (e) { /* noop */ }
        }
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
        }
        $body.find('.vn-tts-replay').removeClass('is-speaking');
    }

    function hablarConNavegador(t, myToken, onEnd) {
        if (!window.speechSynthesis) {
            if (typeof onEnd === 'function') onEnd();
            return;
        }
        if (ttsKeepAlive) {
            clearInterval(ttsKeepAlive);
            ttsKeepAlive = null;
        }
        const u = new SpeechSynthesisUtterance(t);
        const voice = vozNaturalEspanol();
        u.lang = (voice && voice.lang) ? voice.lang : 'es-MX';
        if (voice) u.voice = voice;
        u.rate = configNivel().ttsRate;
        u.pitch = 1;
        u.volume = 1;
        u.onend = function () {
            if (myToken !== ttsToken) return;
            if (ttsKeepAlive) {
                clearInterval(ttsKeepAlive);
                ttsKeepAlive = null;
            }
            $body.find('.vn-tts-replay').removeClass('is-speaking');
            if (typeof onEnd === 'function') onEnd();
        };
        u.onerror = function () {
            if (myToken !== ttsToken) return;
            $body.find('.vn-tts-replay').removeClass('is-speaking');
            if (typeof onEnd === 'function') onEnd();
        };
        try {
            window.speechSynthesis.speak(u);
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        } catch (e) {
            if (typeof onEnd === 'function') onEnd();
            return;
        }
        ttsKeepAlive = setInterval(function () {
            if (myToken !== ttsToken) {
                clearInterval(ttsKeepAlive);
                ttsKeepAlive = null;
                return;
            }
            if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
                try { window.speechSynthesis.resume(); } catch (err) { /* noop */ }
            }
        }, 250);
    }

    function hablarTexto(texto, onEnd) {
        const t = String(texto || '').replace(/\s+/g, ' ').trim();
        if (!t) {
            if (typeof onEnd === 'function') onEnd();
            return;
        }
        ttsToken += 1;
        const myToken = ttsToken;
        if (ttsKeepAlive) {
            clearInterval(ttsKeepAlive);
            ttsKeepAlive = null;
        }
        if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
        }
        if (ttsPlayer) {
            try {
                ttsPlayer.onended = null;
                ttsPlayer.onerror = null;
                ttsPlayer.pause();
                ttsPlayer.removeAttribute('src');
            } catch (e) { /* noop */ }
        }

        $body.find('.vn-tts-replay').addClass('is-speaking');
        const ttsUrl = (esModoDispositivo() ? $root.data('url-tts') : $('.cx-app').data('url-tts')) || '';
        const csrf = $('meta[name="csrf-token"]').attr('content');
        const ttsGet = esModoDispositivo();

        const terminar = function () {
            if (myToken !== ttsToken) return;
            $body.find('.vn-tts-replay').removeClass('is-speaking');
            if (typeof onEnd === 'function') onEnd();
        };

        if (!ttsUrl) {
            hablarConNavegador(t, myToken, onEnd);
            return;
        }

        const ajaxOpts = ttsGet
            ? {
                url: ttsUrl,
                method: 'GET',
                data: { texto: t },
                headers: { Accept: 'application/json' },
            }
            : {
                url: ttsUrl,
                method: 'POST',
                data: JSON.stringify({ texto: t }),
                contentType: 'application/json',
                headers: { 'X-CSRF-TOKEN': csrf, Accept: 'application/json' },
            };

        $.ajax(ajaxOpts).done(function (res) {
            if (myToken !== ttsToken) return;
            const src = res && res.data && res.data.url;
            if (!src) {
                hablarConNavegador(t, myToken, onEnd);
                return;
            }
            const player = asegurarTtsPlayer();
            try {
                player.onended = null;
                player.onerror = null;
                player.pause();
            } catch (e) { /* noop */ }

            // Solo una reproducción neuronal; no mezclar con voz del navegador.
            player.src = src;
            player.onended = terminar;
            player.onerror = terminar;
            const p = player.play();
            if (p && typeof p.then === 'function') {
                p.then(function () {
                    if (myToken !== ttsToken) return;
                    if (window.speechSynthesis) {
                        try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
                    }
                }).catch(function () {
                    if (myToken !== ttsToken) return;
                    hablarConNavegador(t, myToken, onEnd);
                });
            }
        }).fail(function () {
            if (myToken !== ttsToken) return;
            hablarConNavegador(t, myToken, onEnd);
        });
    }

    function parseIntentos(val) {
        if (val === 'Sin límite') return Infinity;
        const n = Number(val);
        return Number.isFinite(n) && n > 0 ? n : 2;
    }

    function showFb(ok, okMsg, errMsg) {
        let $fb = $('#vnFb');
        if (!$fb.length) {
            $fb = $('<div class="vn-feedback vn-feedback--nav" id="vnFb" hidden></div>');
            const $card = $body.find('.vn-card').first();
            if ($card.length) $card.append($fb);
            else return;
        }
        $fb.prop('hidden', false)
            .toggleClass('is-ok', !!ok)
            .toggleClass('is-bad', !ok)
            .text(ok ? okMsg : errMsg);
        if (ok) celebrarExito(false);
        else reproducirSfx('err');
    }

    function marcarBloqueVisto() {
        $body.data('vn-bloque-visto', true);
        actualizarNavBloque();
    }

    function itemsPoolCompletos($items) {
        if (!$items.length) return true;
        return $items.filter(':not(.is-matched)').filter(function () {
            return !this.hidden;
        }).length === 0;
    }

    function bloqueEstaCompleto(bloque) {
        if (!bloque) return false;
        const d = datos(bloque);
        const tipo = bloque.tipo;

        switch (tipo) {
            case 'bienvenida': {
                const tipoMedia = d.tipo_media || 'ninguno';
                if (tipoMedia === 'video' && mediaUrl(d.video)) {
                    return !!$body.data('vn-bienvenida-video-ok');
                }
                return !!$body.data('vn-bloque-visto');
            }
            case 'audio':
                if (!mediaUrl(d.archivo)) return !!$body.data('vn-bloque-visto');
                return $body.find('[data-vn-audio-play].is-done').length > 0;
            case 'video':
                if (!mediaUrl(d.archivo)) return !!$body.data('vn-bloque-visto');
                return $body.find('[data-vn-video-play].is-done').length > 0;
            case 'imagen':
            case 'recompensa':
                return !!$body.data('vn-bloque-visto');
            case 'ra':
                return $body.find('[data-vn-ra-listo].is-done').length > 0;
            case 'historia':
                return historiaPage >= totalPaginasHistoria(bloque) - 1 && !!$body.data('vn-bloque-visto');
            case 'evidencia':
                return $body.find('.vn-evidencia-msg').filter(function () {
                    return !$(this).prop('hidden');
                }).length > 0;
            case 'pregunta':
                return !!$body.find('[data-vn-pregunta]').data('locked');
            case 'reto': {
                const pasos = Array.isArray(d.pasos) ? d.pasos : [];
                return pasos.length > 0
                    && retoPaso >= pasos.length - 1
                    && !!$body.find('[data-vn-reto]').data('locked');
            }
            case 'emocion':
                return $body.find('.vn-emocion.is-picked').length > 0;
            case 'emparejar': {
                const total = $body.find('[data-vn-emparejar] [data-vn-izq]').length;
                const matched = $body.find('[data-vn-emparejar] [data-vn-izq].is-matched').length;
                return total > 0 && matched >= total;
            }
            case 'clasificacion':
                return itemsPoolCompletos($body.find('[data-vn-clasif-pool] [data-vn-item]'));
            case 'arrastrar':
                return itemsPoolCompletos($body.find('[data-vn-arrastrar-pool] [data-vn-item]'));
            case 'dibujo':
                return !!(paint && paint.history && paint.history.length > 1);
            case 'juego': {
                const juegoId = d.juego_id || '';
                if (juegoId === 'memoria') {
                    const total = $body.find('[data-vn-memory] .vn-memory-card').length;
                    const done = $body.find('[data-vn-memory] .vn-memory-card.is-done').length;
                    return total > 0 && done >= total;
                }
                if (juegoId === 'rompecabezas') {
                    return $body.find('[data-vn-puzzle].is-complete').length > 0;
                }
                if (juegoId === 'secuencia') {
                    return $body.find('[data-vn-secuencia].is-complete').length > 0;
                }
                if (juegoId === 'colorear') {
                    return !!(paint && paint.history && paint.history.length > 1);
                }
                return !!$body.data('vn-bloque-visto');
            }
            default:
                return !!$body.data('vn-bloque-visto');
        }
    }

    function mensajePendienteBloque(bloque) {
        if (!bloque) return configNivel().simplificar ? '¡Aún no!' : 'Termina esta actividad antes de continuar.';
        const d = datos(bloque);
        const simple = configNivel().simplificar;
        switch (bloque.tipo) {
            case 'audio': return simple ? '¡Escucha!' : 'Escucha el audio hasta el final.';
            case 'video': return simple ? '¡Mira el video!' : 'Mira el video hasta el final.';
            case 'historia': return simple ? '¡Sigue el cuento!' : 'Llega a la última página del cuento.';
            case 'pregunta': return simple ? '¡Elige una!' : 'Responde la pregunta.';
            case 'reto': return simple ? '¡Sigue el reto!' : 'Completa todos los pasos del reto.';
            case 'emparejar': return simple ? '¡Une todos!' : 'Empareja todos los elementos.';
            case 'clasificacion': return simple ? '¡Ordénalos!' : 'Clasifica todos los elementos.';
            case 'arrastrar': return simple ? '¡Llévalos!' : 'Arrastra todos los elementos a su zona.';
            case 'emocion': return simple ? '¿Cómo estás?' : 'Elige cómo te sentiste.';
            case 'evidencia': return simple ? '¡Toca!' : 'Toca el botón para registrar tu evidencia.';
            case 'ra': return simple ? '¡Mira y toca!' : 'Toca el botón cuando veas el marcador.';
            case 'dibujo':
                return simple ? '¡Pinta!' : 'Haz un dibujo en el lienzo.';
            case 'juego': {
                const juegoId = d.juego_id || '';
                if (juegoId === 'memoria') return simple ? '¡Busca las parejas!' : 'Encuentra todas las parejas.';
                if (juegoId === 'rompecabezas') return simple ? '¡Ármalo!' : 'Completa el rompecabezas.';
                if (juegoId === 'secuencia') return simple ? '¡Ordénalas!' : 'Ordena las tarjetas correctamente.';
                if (juegoId === 'colorear') return simple ? '¡Colorea!' : 'Colorea la imagen.';
                return simple ? '¡Termina!' : 'Termina el juego.';
            }
            case 'bienvenida':
                return (d.tipo_media || '') === 'video'
                    ? (simple ? '¡Mira el video!' : 'Mira el video de bienvenida.')
                    : (simple ? '¡Escucha!' : 'Escucha la bienvenida.');
            default:
                return simple ? '¡Aún no!' : 'Termina esta actividad antes de continuar.';
        }
    }

    function cancelarAvanceAutomatico() {
        if (!bloqueAvanceTimer) return;
        clearTimeout(bloqueAvanceTimer);
        bloqueAvanceTimer = null;
    }

    function programarAvanceAutomatico() {
        cancelarAvanceAutomatico();
        const bloqueIdx = index;
        bloqueAvanceTimer = setTimeout(() => {
            bloqueAvanceTimer = null;
            if (index !== bloqueIdx) return;
            const bloque = bloques[index];
            if (!bloque || !['pregunta', 'reto'].includes(bloque.tipo)) return;
            if (!bloqueEstaCompleto(bloque)) return;
            alClicSiguiente();
        }, BLOQUE_AVANCE_MS);
    }

    function programarAvanceRetoPaso($box) {
        cancelarAvanceAutomatico();
        const bloqueIdx = index;
        const pasoIdx = retoPaso;
        bloqueAvanceTimer = setTimeout(() => {
            bloqueAvanceTimer = null;
            if (index !== bloqueIdx || retoPaso !== pasoIdx) return;
            const total = Number($box.data('total-pasos')) || 1;
            if (retoPaso < total - 1) {
                retoPaso += 1;
                pintar();
                return;
            }
            $box.data('locked', true);
            alCompletarActividad();
            programarAvanceAutomatico();
        }, BLOQUE_AVANCE_MS);
    }

    function actualizarNavBloque() {
        const bloque = bloques[index];
        if (!bloque) return;
        const esUltimoBloque = index >= bloques.length - 1;
        const completo = bloqueEstaCompleto(bloque);
        const simple = configNivel().simplificar;
        const labelSeguir = simple ? '¡Listo!' : 'Seguir';
        const labelSiguiente = simple ? '¡Sigue!' : 'Siguiente';

        $btnPrev.find('span').first().text(simple ? '' : 'Atrás');

        if (alTerminarExperiencia && esUltimoBloque) {
            $btnNext.find('span').first().text(labelSeguir);
            $btnNext.prop('disabled', false);
            $btnNext.toggleClass('is-blocked', !completo);
        } else if (esUltimoBloque) {
            $btnNext.find('span').first().text(labelSiguiente);
            $btnNext.prop('disabled', true);
            $btnNext.toggleClass('is-blocked', true);
        } else {
            $btnNext.find('span').first().text(labelSiguiente);
            $btnNext.prop('disabled', false);
            $btnNext.toggleClass('is-blocked', !completo);
        }
        const listoParaAvanzar = completo && (!esUltimoBloque || !!alTerminarExperiencia);
        $btnNext.toggleClass('vn-nav-ready', listoParaAvanzar);
        $btnNext.attr('aria-disabled', completo ? 'false' : 'true');
    }

    function mostrarAvisoBloquePendiente() {
        const bloque = bloques[index];
        showFb(false, '', mensajePendienteBloque(bloque));
        $btnNext.addClass('vn-nav-shake');
        setTimeout(() => { $btnNext.removeClass('vn-nav-shake'); }, 520);
    }

    function alCompletarActividad() {
        actualizarNavBloque();
    }

    function actualizarScoreMemoria() {
        const $root = $body.find('[data-vn-memory]');
        if (!$root.length) return;
        const pares = Number($root.data('pares')) || 0;
        const done = $root.find('.vn-memory-card.is-done').length / 2;
        $body.find('[data-vn-memory-score]').text(
            configNivel().simplificar ? `⭐ ${done} / ${pares}` : `${done} / ${pares} parejas`
        );
    }

    function aplicarAlAgotar($box) {
        const modo = String($box.data('al-agotar') || 'Mostrar respuesta correcta');
        const esReto = $box.is('[data-vn-reto]');
        if (modo === 'Repetir desde el inicio') {
            $box.data('locked', false);
            $body.find('.vn-option').removeClass('is-ok is-bad');
            const bloque = bloques[index];
            if (bloque && bloque.tipo === 'pregunta') {
                intentosRestantes = parseIntentos($box.data('intentos'));
            }
            if (bloque && bloque.tipo === 'reto') {
                retoPaso = 0;
                intentosRestantes = parseIntentos($box.data('intentos'));
                const $fb = $('#vnFb');
                if ($fb.length) $fb.prop('hidden', true).removeClass('is-ok is-bad').text('');
                pintar();
                return;
            }
            const $fb = $('#vnFb');
            if ($fb.length) $fb.prop('hidden', true).removeClass('is-ok is-bad').text('');
            return;
        }
        if (modo !== 'Continuar sin mostrar') {
            $body.find('.vn-option[data-correcta="1"]').addClass('is-ok');
        }
        if (esReto) {
            const total = Number($box.data('total-pasos')) || 1;
            if (retoPaso < total - 1) {
                $box.data('locked', true);
                programarAvanceRetoPaso($box);
                return;
            }
        }
        $box.data('locked', true);
        alCompletarActividad();
        programarAvanceAutomatico();
    }

    function revisarHistoriaVista() {
        const bloque = bloques[index];
        if (!bloque || bloque.tipo !== 'historia') return;
        if (historiaPage < totalPaginasHistoria(bloque) - 1) return;
        marcarBloqueVisto();
    }

    function trasInstruccionBloque(bloque) {
        const d = datos(bloque);
        const tipo = bloque.tipo;
        if (tipo === 'historia') {
            iniciarAudioHistoria();
            return;
        }
        if (tipo === 'bienvenida' && (d.tipo_media || '') === 'video' && mediaUrl(d.video)) {
            reproducirVideoBienvenida();
            return;
        }
        if (['imagen', 'recompensa', 'bienvenida'].includes(tipo)) {
            marcarBloqueVisto();
        }
    }

    function iniciarInstruccionBloque(bloque) {
        const d = datos(bloque);
        if (bloque.tipo === 'pregunta') {
            const pregunta = String(d.texto || '').trim();
            const instr = String(d.instruccion || '').trim();
            let texto = '';
            if (pregunta && instr && instr !== pregunta) {
                texto = `${pregunta}. ${instr}`;
            } else {
                texto = pregunta || instr;
            }
            if (texto) {
                hablarTexto(texto, () => trasInstruccionBloque(bloque));
            } else {
                trasInstruccionBloque(bloque);
            }
            return;
        }
        if (bloque.tipo === 'reto') {
            const pasos = Array.isArray(d.pasos) ? d.pasos : [];
            const paso = pasos[retoPaso] || {};
            const pregunta = String(paso.pregunta || '').trim();
            const nombreReto = String(d.descripcion || '').trim();
            const instr = retoPaso === 0 ? String(d.instruccion || '').trim() : '';
            const enunciado = pregunta || instr || nombreReto;
            let texto = '';
            if (pregunta && instr && instr !== pregunta) {
                texto = `${pregunta}. ${instr}`;
            } else {
                texto = enunciado;
            }
            if (texto) {
                hablarTexto(texto, () => trasInstruccionBloque(bloque));
            } else {
                trasInstruccionBloque(bloque);
            }
            return;
        }
        const texto = String(d.instruccion || '').trim();
        if (texto) {
            hablarTexto(texto, () => trasInstruccionBloque(bloque));
        } else {
            trasInstruccionBloque(bloque);
        }
    }

    function paintAddListener(el, type, fn, opts) {
        el.addEventListener(type, fn, opts);
        paintListeners.push({ el, type, fn, opts });
    }

    let paintResizeObs = null;

    function observarStagePaint() {
        if (paintResizeObs) {
            paintResizeObs.disconnect();
            paintResizeObs = null;
        }
        const stage = $body && $body.find('.vn-paint-stage')[0];
        if (!stage || typeof ResizeObserver === 'undefined') return;
        paintResizeObs = new ResizeObserver(function () {
            ajustarCanvasPaint();
        });
        paintResizeObs.observe(stage);
    }

    function limpiarPaint() {
        if (paintResizeObs) {
            paintResizeObs.disconnect();
            paintResizeObs = null;
        }
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
        alCompletarActividad();
    }

    function paintUndo() {
        if (!drawCtx || !paint || paint.history.length <= 1) return;
        paint.history.pop();
        drawCtx.putImageData(paint.history[paint.history.length - 1], 0, 0);
        paintUpdateActions();
        actualizarNavBloque();
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

        const rect = () => canvas.getBoundingClientRect();
        const pos = (e) => {
            const r = rect();
            if (r.width <= 0 || r.height <= 0) return { x: 0, y: 0 };
            const scaleX = canvas.width / r.width;
            const scaleY = canvas.height / r.height;
            const t = (e.touches && e.touches[0])
                || (e.changedTouches && e.changedTouches[0])
                || e;
            return {
                x: (t.clientX - r.left) * scaleX,
                y: (t.clientY - r.top) * scaleY,
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
        observarStagePaint();
        requestAnimationFrame(function () {
            ajustarLayoutPintar();
            ajustarCanvasPaint();
        });
    }

    function initInteracciones(bloque) {
        intentosRestantes = null;
        detenerAudioBloque();
        detenerVideoBloque();
        detenerAudioHistoria();

        if (bloque.tipo === 'dibujo') {
            const d = datos(bloque);
            const brushKey = nivelEtario === 'prejardin' ? 'l' : (nivelEtario === 'jardin' ? 'm' : 'm');
            const colorInicial = PAINT_DEFAULT_COLORS[2];
            initPaintCanvas({
                mode: 'dibujo',
                color: colorInicial,
                hasFondo: !!d.fondo,
                lineWidth: PAINT_SIZE_MAP[brushKey],
            });
            paintSelectColor(colorInicial);
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
                lineWidth: nivelEtario === 'prejardin' ? PAINT_SIZE_MAP.l : PAINT_SIZE_MAP.m,
                hasFondo: true,
            });
            paintSelectColor(colores[0] || '#EF4444');
        }

        if (bloque.tipo === 'pregunta') {
            const $box = $body.find('[data-vn-pregunta]');
            intentosRestantes = parseIntentos($box.data('intentos'));
        }
        if (bloque.tipo === 'reto') {
            const $box = $body.find('[data-vn-reto]');
            intentosRestantes = parseIntentos($box.data('intentos'));
            if (retoPaso !== 0) $body.find('.vn-instruccion').hide();
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
        if (bloque.tipo === 'imagen') {
            initImagenZoom();
        }
        if (bloque.tipo === 'historia') {
            if (historiaPage !== 0) $body.find('.vn-instruccion').hide();
            const texto = String(datos(bloque).instruccion || '').trim();
            if (historiaPage === 0 && texto) {
                hablarTexto(texto, () => iniciarAudioHistoria());
            } else {
                iniciarAudioHistoria();
            }
        } else if (bloque.tipo === 'audio' && !mediaUrl(datos(bloque).archivo)) {
            iniciarInstruccionBloque(bloque);
        } else if (bloque.tipo === 'video' && !mediaUrl(datos(bloque).archivo)) {
            iniciarInstruccionBloque(bloque);
        } else if (bloque.tipo === 'bienvenida' && (datos(bloque).tipo_media || '') === 'video') {
            const texto = String(datos(bloque).instruccion || '').trim();
            if (texto) {
                hablarTexto(texto, () => pulsarBotonVideoBienvenida());
            } else {
                pulsarBotonVideoBienvenida();
            }
        } else {
            iniciarInstruccionBloque(bloque);
        }
        actualizarNavBloque();
    }

    function initImagenZoom() {
        const viewport = $body.find('[data-vn-imagen-zoom]')[0];
        if (!viewport) return;

        const inner = viewport.querySelector('.vn-imagen-zoom-inner');
        if (!inner) return;

        const MIN_SCALE = 1;
        const MAX_SCALE = 4;
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let pinchStartDist = 0;
        let pinchStartScale = 1;
        let panStartX = 0;
        let panStartY = 0;
        let panOriginX = 0;
        let panOriginY = 0;
        let isPanning = false;
        let marcoZoom = false;

        function distancia(touches) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.hypot(dx, dy);
        }

        function aplicarTransform() {
            inner.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
            viewport.classList.toggle('is-zoomed', scale > 1.02);
        }

        function resetZoom() {
            scale = 1;
            translateX = 0;
            translateY = 0;
            aplicarTransform();
        }

        function marcarSiZoom() {
            if (!marcoZoom && scale > 1.05) {
                marcoZoom = true;
                marcarBloqueVisto();
            }
        }

        viewport.addEventListener('touchstart', function (e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                pinchStartDist = distancia(e.touches);
                pinchStartScale = scale;
                isPanning = false;
            } else if (e.touches.length === 1 && scale > 1.02) {
                isPanning = true;
                panStartX = e.touches[0].clientX;
                panStartY = e.touches[0].clientY;
                panOriginX = translateX;
                panOriginY = translateY;
            }
        }, { passive: false });

        viewport.addEventListener('touchmove', function (e) {
            if (e.touches.length === 2) {
                e.preventDefault();
                if (pinchStartDist <= 0) return;
                scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale * (distancia(e.touches) / pinchStartDist)));
                aplicarTransform();
                marcarSiZoom();
            } else if (e.touches.length === 1 && isPanning && scale > 1.02) {
                e.preventDefault();
                translateX = panOriginX + (e.touches[0].clientX - panStartX);
                translateY = panOriginY + (e.touches[0].clientY - panStartY);
                aplicarTransform();
            }
        }, { passive: false });

        viewport.addEventListener('touchend', function (e) {
            if (e.touches.length < 2) pinchStartDist = 0;
            if (e.touches.length === 0) {
                isPanning = false;
                if (scale <= 1.02) resetZoom();
            }
        });

        viewport.addEventListener('wheel', function (e) {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.12 : 0.12;
            scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
            if (scale <= 1.02) resetZoom();
            else {
                aplicarTransform();
                marcarSiZoom();
            }
        }, { passive: false });
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
        if (!audio) {
            revisarHistoriaVista();
            return;
        }
        try { audio.currentTime = 0; } catch (e) { /* noop */ }
        audio.onended = function () {
            revisarHistoriaVista();
        };
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
            $btn.removeClass('vn-pulse-hint').addClass('is-playing');
            $icon.html('<i class="fa-solid fa-volume-high"></i>');
            $label.text('Sonando…');
        } else if (estado === 'done') {
            $btn.addClass('is-done');
            $icon.html('<i class="fa-solid fa-rotate-right"></i>');
            $label.text('Toca para oír otra vez');
            $status.prop('hidden', false).text('¡Listo!');
            celebrarExito(false);
            alCompletarActividad();
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
        detenerVoz();

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
        $body.find('.vn-bienvenida-video').each(function () {
            try {
                this.pause();
                this.currentTime = 0;
                this.onended = null;
            } catch (e) { /* noop */ }
        });
        $body.find('[data-vn-bienvenida-video-wrap]').removeClass('is-playing');
        const $btnBien = $body.find('[data-vn-bienvenida-play]');
        const $wrapBien = $body.find('[data-vn-bienvenida-video-wrap]');
        const $videoBien = $body.find('.vn-bienvenida-video');
        if ($btnBien.length) {
            setVideoBotonEstado($btnBien, $wrapBien, $videoBien, 'idle');
        }
        const video = $body.find('.vn-video-el').not('.vn-bienvenida-video')[0];
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
        const $video = $body.find('.vn-video-el').not('.vn-bienvenida-video');
        const $stage = $body.find('[data-vn-video-stage]');
        if (!$btn.length && !$video.length) return;
        if (estado === 'done') {
            setVideoBotonEstado($btn, $stage, $video, 'done');
            celebrarExito(false);
            alCompletarActividad();
            return;
        }
        setVideoBotonEstado($btn, $stage, $video, estado === 'playing' ? 'playing' : 'idle');
    }

    function pulsarBotonVideoBienvenida() {
        const $btn = $body.find('[data-vn-bienvenida-play]');
        if ($btn.length) {
            $btn.addClass('vn-pulse-hint');
            return;
        }
        marcarBloqueVisto();
    }

    function reproducirVideoBienvenida() {
        const video = $body.find('.vn-bienvenida-video')[0];
        const $btn = $body.find('[data-vn-bienvenida-play]');
        const $wrap = $body.find('[data-vn-bienvenida-video-wrap]');
        const $video = $body.find('.vn-bienvenida-video');
        if (!video) {
            marcarBloqueVisto();
            return;
        }
        detenerVoz();
        setVideoBotonEstado($btn, $wrap, $video, 'playing');
        try { video.currentTime = 0; } catch (e) { /* noop */ }
        video.onended = function () {
            $body.data('vn-bienvenida-video-ok', true);
            setVideoBotonEstado($btn, $wrap, $video, 'done');
            celebrarExito(false);
            alCompletarActividad();
        };
        video.muted = false;
        const intentar = function (conMuted) {
            video.muted = !!conMuted;
            const p = video.play();
            if (!p || typeof p.catch !== 'function') return;
            p.catch(function () {
                if (!conMuted) {
                    intentar(true);
                } else {
                    setVideoBotonEstado($btn, $wrap, $video, 'idle');
                    $btn.addClass('vn-pulse-hint');
                }
            });
        };
        intentar(false);
    }

    function reproducirVideo() {
        const video = $body.find('.vn-video-el').not('.vn-bienvenida-video')[0];
        if (!video) return;
        detenerVoz();
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
        cancelarAvanceAutomatico();
        const next = index + delta;
        if (next < 0 || next >= bloques.length) return;
        index = next;
        historiaPage = 0;
        retoPaso = 0;
        pintar();
    }

    function alClicSiguiente() {
        cancelarAvanceAutomatico();
        const bloque = bloques[index];
        if (!bloqueEstaCompleto(bloque)) {
            mostrarAvisoBloquePendiente();
            return;
        }
        if (alTerminarExperiencia && index >= bloques.length - 1) {
            alTerminarExperiencia();
            return;
        }
        ir(1);
    }

    function reiniciarSecuenciaPlayer() {
        index = 0;
        historiaPage = 0;
        retoPaso = 0;
        intentosRestantes = null;
        if ($body && $body.length) {
            $body.removeData('vn-bloque-visto vn-bienvenida-video-ok');
        }
    }

    function aplicarPayloadExperiencia(payload) {
        bloques = Array.isArray(payload.bloques) ? payload.bloques : [];
        mediaBase = payload.mediaBase || payload.media_base || mediaBase;
        experienciaNombre = payload.experienciaNombre
            || payload.nombre
            || payload.experiencia?.nombre
            || experienciaNombre;
        if (payload.experienciaId || payload.experiencia?.id) {
            experienciaIdActiva = payload.experienciaId || payload.experiencia.id;
            if ($root && $root.length) {
                $root.attr('data-experiencia-id', experienciaIdActiva);
            }
        }
    }

    function notificarExperienciaRecargada() {
        $(document).trigger('vn:experiencia-recargada', [{
            id: experienciaIdActiva,
            bloques: bloques.map((b) => ({ ...b, datos: { ...(b.datos || {}) } })),
            mediaBase,
            nombre: experienciaNombre,
        }]);
    }

    function recargarVistaNino() {
        vincularElementos();
        if (!overlayAbierto()) return;

        const $btn = $('#vnBtnRecargar');
        $btn.prop('disabled', true).addClass('is-loading');

        const finalizar = function () {
            $btn.prop('disabled', false).removeClass('is-loading');
        };

        const terminarRecarga = function () {
            reiniciarSecuenciaPlayer();
            pintar();
            requestAnimationFrame(function () {
                programarAjusteLayout();
            });
            finalizar();
        };

        limpiarMediosPlayer();

        const api = window.CxConstructor;
        const puedeUsarConstructor = overlayEstaAbierto()
            && api
            && typeof api.getBloques === 'function';

        if (puedeUsarConstructor) {
            aplicarPayloadExperiencia({
                bloques: api.getBloques() || [],
                mediaBase: api.getMeta ? api.getMeta().mediaBase : mediaBase,
                experienciaNombre: api.getMeta ? api.getMeta().nombre : experienciaNombre,
                experienciaId: api.getMeta ? api.getMeta().experienciaId : experienciaIdActiva,
            });
            if (!bloques.length) {
                const urlListar = String($('.cx-app').data('url-listar') || '').trim();
                if (urlListar) {
                    $.ajax({
                        url: urlListar + (urlListar.includes('?') ? '&' : '?') + '_=' + Date.now(),
                        method: 'GET',
                        dataType: 'json',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    }).done(function (res) {
                        const lista = res?.data?.bloques || res?.bloques || [];
                        if (!lista.length) {
                            const msg = 'No hay bloques para recargar.';
                            if (window.Swal) Swal.fire({ icon: 'info', title: 'Sin bloques', text: msg });
                            else window.alert(msg);
                            finalizar();
                            return;
                        }
                        aplicarPayloadExperiencia({
                            bloques: lista,
                            mediaBase: $('.cx-app').data('media-base') || mediaBase,
                            experienciaNombre: $('.cx-app').data('experiencia-nombre') || experienciaNombre,
                            experienciaId: $('.cx-app').data('experiencia-id') || experienciaIdActiva,
                        });
                        terminarRecarga();
                    }).fail(function (xhr) {
                        const msg = xhr?.responseJSON?.message || 'No se pudo recargar la experiencia.';
                        if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: msg });
                        else window.alert(msg);
                        finalizar();
                    });
                    return;
                }
                const msg = 'Agrega bloques a la secuencia para previsualizar.';
                if (window.Swal) Swal.fire({ icon: 'info', title: 'Sin bloques', text: msg });
                else window.alert(msg);
                finalizar();
                return;
            }
            terminarRecarga();
            return;
        }

        const expId = resolverExperienciaIdActiva();
        if (playerEstaActivo() && expId && resolverUrlExperienciaTpl()) {
            fetchExperienciaDesdeServidor(expId).done(function (res) {
                if (!res?.success || !res?.data?.bloques?.length) {
                    const msg = res?.message || 'No se pudo recargar la experiencia.';
                    if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: msg });
                    else window.alert(msg);
                    return;
                }
                aplicarPayloadExperiencia({
                    bloques: res.data.bloques,
                    mediaBase: res.data.media_base,
                    experiencia: res.data.experiencia,
                    experienciaId: res.data.experiencia?.id || expId,
                });
                if ($root && $root.length) {
                    $root.attr('data-experiencia-id', experienciaIdActiva);
                }
                terminarRecarga();
                notificarExperienciaRecargada();
            }).fail(function (xhr) {
                const msg = xhr?.responseJSON?.message
                    || xhr?.responseJSON?.mensaje
                    || xhr?.message
                    || 'No se pudo recargar la experiencia.';
                if (window.Swal) Swal.fire({ icon: 'error', title: 'Error', text: msg });
                else window.alert(msg);
            }).always(finalizar);
            return;
        }

        if (bloques.length) {
            terminarRecarga();
            return;
        }

        const msg = 'No hay una experiencia activa para recargar.';
        if (window.Swal) Swal.fire({ icon: 'info', title: 'Recargar', text: msg });
        else window.alert(msg);
        finalizar();
    }

    function abrir() {
        if (esModoDispositivo()) return;
        if (window.speechSynthesis) {
            try { window.speechSynthesis.getVoices(); } catch (e) { /* noop */ }
        }
        desbloquearAudioTts();
        const api = window.CxConstructor;
        if (api && typeof api.getBloques === 'function') {
            bloques = api.getBloques() || [];
            const meta = api.getMeta ? api.getMeta() : {};
            mediaBase = meta.mediaBase || $('.cx-app').data('media-base') || '';
            experienciaNombre = meta.nombre || 'Experiencia';
            experienciaIdActiva = meta.experienciaId || experienciaIdActiva;
            estudianteSexo = normalizarSexoEmocion(
                meta.estudianteSexo || $('.cx-app').data('estudiante-sexo')
            );
            nivelEtario = resolverNivelEtario(
                meta.nivelEtario || $('.cx-app').data('nivel-etario')
            );
            estudianteNombre = meta.estudianteNombre || $('.cx-app').data('estudiante-nombre') || '';
        } else {
            try {
                bloques = JSON.parse(document.getElementById('cx-bloques-iniciales')?.textContent || '[]');
            } catch (e) {
                bloques = [];
            }
            mediaBase = $('.cx-app').data('media-base') || '';
            experienciaNombre = $('.cx-app').data('experiencia-nombre') || 'Experiencia';
            estudianteSexo = normalizarSexoEmocion($('.cx-app').data('estudiante-sexo'));
            nivelEtario = resolverNivelEtario($('.cx-app').data('nivel-etario'));
            estudianteNombre = $('.cx-app').data('estudiante-nombre') || '';
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
        aplicarNivelEtario();
        $overlay.prop('hidden', false).attr('aria-hidden', 'false');
        $('body').css('overflow', 'hidden');
        pintar();
        requestAnimationFrame(function () {
            programarAjusteLayout();
        });
    }

    function detenerEvidenciaStream() {
        const recorder = $body && $body.data('vn-evidencia-recorder');
        if (recorder && recorder.state && recorder.state !== 'inactive') {
            try { recorder.stop(); } catch (e) { /* noop */ }
        }
        if ($body && $body.length) $body.data('vn-evidencia-recorder', null);
        const evStream = $body && $body.data('vn-evidencia-stream');
        if (evStream && evStream.getTracks) evStream.getTracks().forEach((t) => t.stop());
        if ($body && $body.length) $body.data('vn-evidencia-stream', null);
    }

    function limpiarEvidenciaRecursos() {
        evidenciaSesion += 1;
        $body.removeData('vn-evidencia-estado');
        const objectUrl = $body && $body.data('vn-evidencia-object-url');
        if (objectUrl) {
            try { URL.revokeObjectURL(objectUrl); } catch (e) { /* noop */ }
            if ($body && $body.length) $body.data('vn-evidencia-object-url', null);
        }
        if (window.VnCaptura) {
            VnCaptura.detenerContador($body.find('.vn-evidencia-contador'));
            VnCaptura.cancelar();
        }
        detenerEvidenciaStream();
    }

    function asegurarMediaDevices() {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
            return true;
        }
        const legacy = navigator.getUserMedia
            || navigator.webkitGetUserMedia
            || navigator.mozGetUserMedia;
        if (!legacy) return false;
        if (!navigator.mediaDevices) navigator.mediaDevices = {};
        navigator.mediaDevices.getUserMedia = function (constraints) {
            return new Promise(function (resolve, reject) {
                legacy.call(navigator, constraints, resolve, reject);
            });
        };
        return true;
    }

    function mimeGrabacionEvidencia(tipo) {
        if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
        const opciones = tipo === 'audio'
            ? ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
            : ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        return opciones.find(function (m) { return MediaRecorder.isTypeSupported(m); }) || '';
    }

    function obtenerMediaEvidencia(tipo) {
        if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost') {
            return Promise.reject(new Error('insecure'));
        }
        if (!asegurarMediaDevices()) {
            return Promise.reject(new Error('unsupported'));
        }
        if (tipo === 'audio') {
            return navigator.mediaDevices.getUserMedia({ audio: true });
        }
        const intentosVideo = tipo === 'foto'
            ? [
                { video: { facingMode: { ideal: 'environment' } } },
                { video: { facingMode: 'environment' } },
                { video: true },
            ]
            : [
                { video: { facingMode: { ideal: 'environment' } }, audio: true },
                { video: { facingMode: 'environment' }, audio: true },
                { video: true, audio: true },
                { video: true, audio: false },
            ];
        let cadena = Promise.reject(new Error('sin intentos'));
        intentosVideo.forEach(function (constraints) {
            cadena = cadena.catch(function () {
                return navigator.mediaDevices.getUserMedia(constraints);
            });
        });
        return cadena;
    }

    function mensajeErrorEvidencia(err) {
        const nombre = String((err && err.name) || '');
        if (err && err.message === 'insecure') {
            return 'La cámara y el micrófono necesitan una conexión segura (HTTPS).';
        }
        if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError') {
            return 'Necesitamos permiso para usar la cámara o el micrófono. Pide ayuda a tu profe.';
        }
        if (nombre === 'NotFoundError' || nombre === 'DevicesNotFoundError') {
            return 'No encontramos cámara o micrófono en este dispositivo.';
        }
        if (nombre === 'NotReadableError' || nombre === 'TrackStartError') {
            return 'La cámara está ocupada. Ciérrala en otra app e intenta otra vez.';
        }
        return 'No pudimos abrir la cámara o el micrófono. Intenta otra vez.';
    }

    function limpiarMediosPlayer() {
        cancelarAvanceAutomatico();
        if (typeof limpiarDragArrastrar === 'function') limpiarDragArrastrar();
        if (typeof limpiarDragPuzzle === 'function') limpiarDragPuzzle();
        if (typeof limpiarDragSecuencia === 'function') limpiarDragSecuencia();
        if (typeof limpiarPaint === 'function') limpiarPaint();
        const clasifDrag = $body && $body.data('vn-clasif-drag');
        if (clasifDrag && clasifDrag.ghost && clasifDrag.ghost.parentNode) {
            clasifDrag.ghost.parentNode.removeChild(clasifDrag.ghost);
        }
        if ($body && $body.length) $body.data('vn-clasif-drag', null);
        limpiarEvidenciaRecursos();
        detenerAudioBloque();
        detenerVideoBloque();
        detenerAudioHistoria();
        detenerVoz();
        if ($body && $body.length) {
            $body.find('audio, video').each(function () {
                try { this.pause(); } catch (e) { /* noop */ }
            });
        }
    }

    function cerrar() {
        if (esModoDispositivo()) return;
        limpiarMediosPlayer();
        $overlay.prop('hidden', true).attr('aria-hidden', 'true');
        $('body').css('overflow', '');
        $tablet.css('transform', 'none');
    }

    function estaEnFullscreen() {
        return !!(document.fullscreenElement
            || document.webkitFullscreenElement
            || document.msFullscreenElement);
    }

    function pedirFullscreen() {
        const candidatos = [
            document.documentElement,
            document.getElementById('rnApp'),
            document.getElementById('vnDispositivo'),
            document.getElementById('vnTabletScreen'),
        ].filter(Boolean);

        let ultimoError = null;
        const intentar = function (i) {
            if (i >= candidatos.length) {
                ocultarBarraNavegador();
                return Promise.reject(ultimoError || new Error('fullscreen no soportado'));
            }
            const el = candidatos[i];
            const req = el.requestFullscreen
                || el.webkitRequestFullscreen
                || el.webkitRequestFullScreen
                || el.msRequestFullscreen;
            if (!req) return intentar(i + 1);
            return Promise.resolve(req.call(el)).catch(function (err) {
                ultimoError = err;
                return intentar(i + 1);
            });
        };

        return intentar(0);
    }

    function ocultarBarraNavegador() {
        try {
            window.scrollTo(0, 1);
            setTimeout(function () { window.scrollTo(0, 0); }, 120);
        } catch (e) { /* noop */ }
    }

    function actualizarBtnFullscreen() {
        if (!$btnFullscreen.length) return;
        $btnFullscreen.prop('hidden', estaEnFullscreen());
    }

    let handlersFsListos = false;

    function asegurarHandlersFullscreen() {
        if (handlersFsListos || !$btnFullscreen.length) return;
        handlersFsListos = true;
        $btnFullscreen.off('click.vnFs').on('click.vnFs', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (estaEnFullscreen()) {
                const salir = document.exitFullscreen
                    || document.webkitExitFullscreen
                    || document.webkitCancelFullScreen
                    || document.msExitFullscreen;
                if (salir) {
                    Promise.resolve(salir.call(document)).finally(actualizarBtnFullscreen);
                }
                return;
            }
            pedirFullscreen()
                .catch(function () { ocultarBarraNavegador(); })
                .finally(actualizarBtnFullscreen);
        });
        $(document).on('fullscreenchange.vnFs webkitfullscreenchange.vnFs MSFullscreenChange.vnFs', actualizarBtnFullscreen);
    }

    function iniciarDispositivoCon(opts) {
        vincularElementos();
        opts = opts || {};
        bloques = Array.isArray(opts.bloques) ? opts.bloques : [];
        mediaBase = opts.mediaBase || '';
        experienciaNombre = opts.experienciaNombre || 'Experiencia';
        estudianteSexo = normalizarSexoEmocion(
            opts.estudianteSexo
            || $root.data('estudiante-sexo')
            || $('#rnApp').data('estudiante-sexo')
        );
        nivelEtario = resolverNivelEtario(
            opts.nivelEtario
            || $root.data('nivel-etario')
            || $('#rnApp').data('nivel-etario')
        );
        estudianteNombre = opts.estudianteNombre
            || $root.data('estudiante-nombre')
            || $('#rnApp').data('estudiante-nombre')
            || '';
        alTerminarExperiencia = typeof opts.alTerminarExperiencia === 'function'
            ? opts.alTerminarExperiencia
            : null;
        experienciaIdActiva = opts.experienciaId || experienciaIdActiva || null;
        urlExperienciaTpl = opts.urlExperiencia
            || urlExperienciaTpl
            || String($('#rnApp').data('url-experiencia') || '');
        if ($root && $root.length && experienciaIdActiva) {
            $root.attr('data-experiencia-id', experienciaIdActiva);
        }
        index = 0;
        historiaPage = 0;
        retoPaso = 0;
        intentosRestantes = null;
        desbloquearAudioTts();
        aplicarNivelEtario();
        pintar();
        asegurarHandlersFullscreen();
        actualizarBtnFullscreen();
    }

    function detenerDispositivo() {
        vincularElementos();
        limpiarMediosPlayer();
        bloques = [];
        index = 0;
        alTerminarExperiencia = null;
        if ($body && $body.length) $body.empty();
        $('body').removeClass('rn-player-activo');
    }

    if (enPlayer) {
        resolverUrlExperienciaTpl();
    }

    window.VistaNino = {
        iniciar: iniciarDispositivoCon,
        detener: detenerDispositivo,
        vincular: vincularElementos,
        recargar: recargarVistaNino,
    };

    /* ── Eventos UI ──────────────────────────────────────────── */

    if (!esModoDispositivo()) {
        $('#cxBtnVistaNino').on('click', abrir);
        $overlay.on('click', '[data-vn-close]', cerrar);
    }
    $(document).on('click.vnReload', '#vnBtnRecargar', function (e) {
        e.preventDefault();
        e.stopPropagation();
        recargarVistaNino();
    });
    $(document).on('click.vnNav', '#vnBtnPrev', () => ir(-1));
    $(document).on('click.vnNav', '#vnBtnNext', () => alClicSiguiente());

    $(document).on('keydown', function (e) {
        if (!overlayAbierto()) return;
        if (!esModoDispositivo() && e.key === 'Escape') cerrar();
        const bloque = bloques[index];
        if (bloque && bloque.tipo === 'historia') {
            const total = totalPaginasHistoria(bloque);
            if (e.key === 'ArrowLeft' && historiaPage > 0) {
                e.preventDefault();
                navegarHistoria(-1);
                return;
            }
            if (e.key === 'ArrowRight' && historiaPage < total - 1) {
                e.preventDefault();
                navegarHistoria(1);
                return;
            }
        }
        if (e.key === 'ArrowLeft') ir(-1);
        if (e.key === 'ArrowRight') alClicSiguiente();
    });

    onBody('click', '[data-vn-hist-prev]', function () {
        if ($(this).prop('disabled')) return;
        navegarHistoria(-1);
    });

    onBody('click', '[data-vn-hist-next]', function () {
        if ($(this).prop('disabled')) return;
        navegarHistoria(1);
    });

    onBody('click', '[data-vn-tts-replay]', function (e) {
        e.stopPropagation();
        const texto = $(this).closest('[data-vn-tts-text]').attr('data-vn-tts-text')
            || $(this).closest('.vn-instruccion').text();
        hablarTexto(texto);
    });

    onBody('click', '[data-vn-audio-play]', function () {
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

    onBody('click', '[data-vn-video-play]', function () {
        reproducirVideo();
    });

    onBody('click', '[data-vn-paint-tool]', function () {
        if (!paint) return;
        paint.tool = String($(this).data('vn-paint-tool'));
        $body.find('[data-vn-paint-tool]').removeClass('is-on');
        $(this).addClass('is-on');
    });

    onBody('click', '[data-vn-paint-size]', function () {
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

        let matchedPreset = false;
        $body.find('[data-vn-paint-color]').each(function () {
            const isMatch = String($(this).data('vn-paint-color')).toLowerCase() === color.toLowerCase();
            $(this).toggleClass('is-on', isMatch);
            if (isMatch) matchedPreset = true;
        });

        const $custom = $body.find('.vn-paint-swatch--custom');
        if ($custom.length) {
            $custom.toggleClass('is-on', !matchedPreset);
            $custom.find('.vn-paint-swatch-custom-bg').css('background', color);
            $custom.find('.vn-paint-color-input').val(color);
            $custom.find('.vn-paint-swatch-custom-icon').toggleClass('is-hidden', !matchedPreset);
            $custom.find('.vn-paint-swatch-custom-label').text(matchedPreset ? 'Más' : '');
        }
    }

    onBody('click', '[data-vn-paint-color]', function () {
        paintSelectColor(String($(this).data('vn-paint-color')));
    });

    onBody('click', '.vn-paint-swatch--custom', function (e) {
        if ($(e.target).hasClass('vn-paint-color-input')) return;
        const input = $(this).find('.vn-paint-color-input')[0];
        if (!input) return;
        e.preventDefault();
        try { input.showPicker(); } catch (err) { input.click(); }
    });

    onBody('input change', '.vn-paint-color-input', function () {
        const color = String(this.value || '');
        if (!color) return;
        paintSelectColor(color);
    });

    onBody('click', '[data-vn-paint-undo]', function () {
        if ($(this).prop('disabled')) return;
        paintUndo();
    });

    onBody('click', '[data-vn-bienvenida-play]', function () {
        reproducirVideoBienvenida();
    });

    function refsEvidencia($scope) {
        const $wrap = $scope.find('.vn-evidencia-wrap');
        const $stage = $wrap.find('[data-vn-evidencia-stage]');
        const $videoStage = $stage.find('[data-vn-evidencia-video-stage]');
        return {
            $wrap,
            $stage,
            $preview: $stage.find('.vn-evidencia-preview'),
            $result: $stage.find('.vn-evidencia-result'),
            $audioReplay: $stage.find('[data-vn-evidencia-replay="audio"]'),
            $audioPlayBtn: $stage.find('[data-vn-evidencia-audio-play]'),
            $audioEl: $stage.find('.vn-evidencia-audio-el'),
            $videoReplay: $stage.find('[data-vn-evidencia-replay="video"]'),
            $videoStage: $videoStage,
            $videoPlayBtn: $videoStage.find('[data-vn-evidencia-video-play]'),
            $videoEl: $stage.find('.vn-evidencia-video-el'),
            $recording: $stage.find('.vn-evidencia-recording'),
            $contador: $stage.find('.vn-evidencia-contador'),
            $placeholder: $stage.find('.vn-evidencia-preview-placeholder'),
            $estado: $wrap.find('[data-vn-evidencia-estado]'),
            $btn: $wrap.find('[data-vn-evidencia]'),
            $captura: $wrap.find('[data-vn-evidencia-captura]'),
            $file: $wrap.find('[data-vn-evidencia-file]'),
            $msg: $scope.find('.vn-evidencia-msg'),
        };
    }

    function setEstadoEvidencia(refs, texto, modo) {
        if (!refs.$estado.length) return;
        refs.$estado.removeClass('is-grabando is-exito is-error');
        if (!texto) {
            refs.$estado.prop('hidden', true).text('');
            return;
        }
        if (modo) refs.$estado.addClass('is-' + modo);
        refs.$estado.text(texto).prop('hidden', false);
    }

    function iniciarUiGrabacionEvidencia(refs, sesion, nativo) {
        refs.$stage.prop('hidden', false);
        refs.$btn.prop('hidden', true).prop('disabled', false);
        refs.$captura.prop('hidden', false);
        refs.$placeholder.prop('hidden', true);
        refs.$preview.prop('hidden', true);
        refs.$result.prop('hidden', true).removeAttr('src');
        refs.$audioReplay.prop('hidden', true);
        refs.$videoReplay.prop('hidden', true);
        refs.$audioEl.removeAttr('src');
        refs.$videoEl.removeAttr('src');
        refs.$recording.prop('hidden', false);
        setEstadoEvidencia(refs, configNivel().simplificar ? '¡Graba!' : 'Grabando…', 'grabando');
        if (window.VnCaptura) {
            VnCaptura.iniciarContador(refs.$contador);
        }
        $body.data('vn-evidencia-estado', { tipo: 'audio', sesion: sesion, nativo: !!nativo });
    }

    function evidenciaTieneCaptura(refs) {
        if (refs.$result.attr('src')) return true;
        if (refs.$audioEl.attr('src')) return true;
        if (refs.$videoEl.attr('src')) return true;
        return false;
    }

    function resetUiEvidencia(refs) {
        refs.$stage.prop('hidden', true);
        refs.$captura.prop('hidden', true);
        refs.$recording.prop('hidden', true);
        refs.$preview.prop('hidden', true);
        refs.$result.prop('hidden', true);
        refs.$audioReplay.prop('hidden', true);
        refs.$videoReplay.prop('hidden', true);
        refs.$placeholder.prop('hidden', true);
        refs.$msg.prop('hidden', true);
        refs.$btn.prop('hidden', false).prop('disabled', false).removeClass('is-done');
        setEstadoEvidencia(refs, '', '');
        detenerEvidenciaReplay(refs);
        if (window.VnCaptura) VnCaptura.detenerContador(refs.$contador);
        if (refs.$preview.length) {
            try { refs.$preview[0].pause(); } catch (e) { /* noop */ }
            refs.$preview[0].srcObject = null;
            refs.$preview.removeAttr('src');
        }
        refs.$result.removeAttr('src');
        refs.$audioEl.removeAttr('src');
        refs.$videoEl.removeAttr('src');
    }

    function mostrarErrorEvidencia(refs, mensaje) {
        detenerEvidenciaStream();
        $body.removeData('vn-evidencia-estado');
        resetUiEvidencia(refs);
        showFb(false, '', mensaje);
    }

    function aplicarBlobEvidencia(refs, tipo, blob) {
        if (!blob || !refs) return;
        const prevUrl = $body.data('vn-evidencia-object-url');
        if (prevUrl) {
            try { URL.revokeObjectURL(prevUrl); } catch (e) { /* noop */ }
        }
        const url = URL.createObjectURL(blob);
        $body.data('vn-evidencia-object-url', url);
        refs.$stage.prop('hidden', false);
        refs.$captura.prop('hidden', true);
        refs.$recording.prop('hidden', true);
        refs.$placeholder.prop('hidden', true);
        refs.$preview.prop('hidden', true).removeAttr('src');
        refs.$result.prop('hidden', true).removeAttr('src');
        refs.$audioReplay.prop('hidden', true);
        refs.$videoReplay.prop('hidden', true);
        refs.$audioEl.removeAttr('src');
        refs.$videoEl.removeAttr('src');
        if (refs.$preview.length) refs.$preview[0].srcObject = null;

        if (tipo === 'foto') {
            refs.$result.attr('src', url).prop('hidden', false);
        } else if (tipo === 'audio') {
            refs.$audioEl.attr('src', url);
            refs.$audioReplay.prop('hidden', false);
            setEvidenciaAudioUi(refs, 'idle');
        } else if (tipo === 'video') {
            refs.$videoEl.attr('src', url);
            refs.$videoReplay.prop('hidden', false);
            setVideoBotonEstado(refs.$videoPlayBtn, refs.$videoStage, refs.$videoEl, 'idle');
        }
        finalizarEvidencia(refs);
    }

    function finalizarEvidencia(refs) {
        if (!evidenciaTieneCaptura(refs)) {
            mostrarErrorEvidencia(refs, 'No se guardó la evidencia. Intenta otra vez.');
            return;
        }

        if (window.VnCaptura) VnCaptura.detenerContador(refs.$contador);
        setEstadoEvidencia(refs, '', '');

        refs.$stage.prop('hidden', false);
        refs.$recording.prop('hidden', true);
        refs.$captura.prop('hidden', true);
        refs.$btn.prop('hidden', true).prop('disabled', true).addClass('is-done');
        refs.$preview.prop('hidden', true);

        const tieneFoto = !!refs.$result.attr('src');
        const tieneAudio = !!refs.$audioEl.attr('src');
        const tieneVideo = !!refs.$videoEl.attr('src');

        refs.$result.prop('hidden', true);
        refs.$audioReplay.prop('hidden', true);
        refs.$videoReplay.prop('hidden', true);
        refs.$placeholder.prop('hidden', true);

        if (tieneFoto) {
            refs.$result.prop('hidden', false);
        } else if (tieneAudio) {
            refs.$audioReplay.prop('hidden', false);
            setEvidenciaAudioUi(refs, 'idle');
        } else if (tieneVideo) {
            refs.$videoReplay.prop('hidden', false);
            setVideoBotonEstado(refs.$videoPlayBtn, refs.$videoStage, refs.$videoEl, 'idle');
        }

        refs.$msg.prop('hidden', false);
        $body.removeData('vn-evidencia-estado');
        celebrarExito(false);
        alCompletarActividad();
    }

    function iniciarGrabacionEvidencia(stream, tipo, sesion) {
        if (typeof MediaRecorder === 'undefined') return null;
        const mime = mimeGrabacionEvidencia(tipo);
        let recorder;
        try {
            recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        } catch (e) {
            try { recorder = new MediaRecorder(stream); } catch (err) { return null; }
        }
        const chunks = [];
        recorder.ondataavailable = function (e) {
            if (e.data && e.data.size) chunks.push(e.data);
        };
        recorder._vnChunks = chunks;
        recorder._vnSesion = sesion;
        try { recorder.start(500); } catch (e) { return null; }
        $body.data('vn-evidencia-recorder', recorder);
        return recorder;
    }

    function capturarFotoEvidencia($preview, $result) {
        return new Promise(function (resolve) {
            const video = $preview[0];
            if (!video) {
                resolve(false);
                return;
            }
            let resuelto = false;
            const tomar = function () {
                if (resuelto) return;
                if (!video.videoWidth || !video.videoHeight) return;
                resuelto = true;
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                $result.attr('src', canvas.toDataURL('image/jpeg', 0.9)).prop('hidden', false);
                resolve(true);
            };
            if (video.readyState >= 2 && video.videoWidth) {
                tomar();
                return;
            }
            video.addEventListener('loadedmetadata', tomar, { once: true });
            setTimeout(function () {
                if (!resuelto) {
                    resuelto = true;
                    resolve(false);
                }
            }, 3500);
        });
    }

    function detenerGrabacionEvidencia(refs, tipo, sesion) {
        const recorder = $body.data('vn-evidencia-recorder');
        if (!recorder || !recorder._vnChunks || recorder._vnSesion !== sesion) {
            detenerEvidenciaStream();
            return Promise.resolve(false);
        }
        return new Promise(function (resolve) {
            recorder.onstop = function () {
                if (recorder._vnSesion !== sesion || recorder._vnSesion !== evidenciaSesion) {
                    resolve(false);
                    return;
                }
                const blob = new Blob(recorder._vnChunks, {
                    type: recorder.mimeType || mimeGrabacionEvidencia(tipo) || (tipo === 'audio' ? 'audio/mp4' : 'video/mp4'),
                });
                const url = URL.createObjectURL(blob);
                $body.data('vn-evidencia-object-url', url);
                if (tipo === 'video' && refs.$videoEl.length) {
                    refs.$videoEl[0].srcObject = null;
                    refs.$videoEl.attr('src', url);
                } else if (tipo === 'audio' && refs.$audioEl.length) {
                    refs.$audioEl.attr('src', url);
                }
                $body.data('vn-evidencia-recorder', null);
                detenerEvidenciaStream();
                resolve(blob.size > 0);
            };
            try { recorder.stop(); } catch (e) {
                detenerEvidenciaStream();
                resolve(false);
            }
        });
    }

    onBody('click', '[data-vn-evidencia-audio-play]', function () {
        vincularElementos();
        reproducirEvidenciaAudio(refsEvidencia($body));
    });

    onBody('click', '[data-vn-evidencia-video-play]', function () {
        vincularElementos();
        reproducirEvidenciaVideo(refsEvidencia($body));
    });

    onBody('change', '[data-vn-evidencia-file]', function () {
        vincularElementos();
        const file = this.files && this.files[0];
        const refs = refsEvidencia($body);
        this.value = '';
        if (!file) return;
        const tipo = String(file.type || '').indexOf('video/') === 0 ? 'video' : 'foto';
        aplicarBlobEvidencia(refs, tipo, file);
    });

    onBody('click', '[data-vn-evidencia]', function () {
        vincularElementos();
        const refs = refsEvidencia($body);
        const $btn = $(this);
        if ($btn.prop('disabled')) return;
        const tipo = String($btn.data('vn-evidencia-tipo') || 'foto');
        const sesion = evidenciaSesion + 1;

        if (tipo === 'seleccion' || (tipo === 'video' && !(window.VnCaptura && VnCaptura.hayNativo()))) {
            const input = refs.$file[0];
            if (input) input.click();
            else mostrarErrorEvidencia(refs, tipo === 'seleccion' ? 'No pudimos abrir la galería.' : 'No pudimos abrir la cámara.');
            return;
        }

        $btn.prop('disabled', true);
        $body.find('#vnFb').prop('hidden', true);
        setEstadoEvidencia(refs, '', '');

        if (window.VnCaptura && VnCaptura.hayNativo()) {
            if (tipo === 'foto') {
                VnCaptura.fotoNativa()
                    .then(function (blob) { aplicarBlobEvidencia(refs, tipo, blob); })
                    .catch(function (err) {
                        mostrarErrorEvidencia(refs, (err && err.message) || 'No se pudo tomar la fotografía.');
                    })
                    .finally(function () { $btn.prop('disabled', false); });
                return;
            }
            if (tipo === 'video') {
                VnCaptura.videoNativo()
                    .then(function (blob) { aplicarBlobEvidencia(refs, tipo, blob); })
                    .catch(function (err) {
                        mostrarErrorEvidencia(refs, (err && err.message) || 'No se pudo grabar el video.');
                    })
                    .finally(function () { $btn.prop('disabled', false); });
                return;
            }
            if (tipo === 'audio') {
                VnCaptura.audioNativo.iniciar(function () {
                    evidenciaSesion = sesion;
                    iniciarUiGrabacionEvidencia(refs, sesion, true);
                }).catch(function (err) {
                    mostrarErrorEvidencia(refs, (err && err.message) || 'No se pudo iniciar la grabación.');
                }).finally(function () { $btn.prop('disabled', false); });
                return;
            }
        }

        obtenerMediaEvidencia(tipo).then(function (stream) {
            evidenciaSesion = sesion;
            refs.$stage.prop('hidden', false);
            refs.$btn.prop('hidden', true).prop('disabled', false);
            refs.$captura.prop('hidden', false);
            refs.$placeholder.prop('hidden', true);
            refs.$result.prop('hidden', true).removeAttr('src');
            refs.$audioReplay.prop('hidden', true);
            refs.$videoReplay.prop('hidden', true);
            refs.$audioEl.removeAttr('src');
            refs.$videoEl.removeAttr('src');
            refs.$preview.removeAttr('src');
            $body.data('vn-evidencia-stream', stream);
            $body.data('vn-evidencia-estado', { tipo: tipo, sesion: sesion, nativo: false });

            if (tipo === 'audio') {
                refs.$preview.prop('hidden', true);
                refs.$recording.prop('hidden', false);
                setEstadoEvidencia(refs, configNivel().simplificar ? '¡Graba!' : 'Grabando…', 'grabando');
                if (window.VnCaptura) VnCaptura.iniciarContador(refs.$contador);
                iniciarGrabacionEvidencia(stream, 'audio', sesion);
            } else {
                refs.$recording.prop('hidden', true);
                refs.$preview.prop('hidden', false);
                refs.$preview[0].srcObject = stream;
                refs.$preview[0].controls = false;
                refs.$preview[0].muted = true;
                refs.$preview[0].setAttribute('playsinline', '');
                refs.$preview[0].setAttribute('webkit-playsinline', '');
                refs.$preview[0].play().catch(function () { /* noop */ });
                setEstadoEvidencia(refs, configNivel().simplificar ? '¡Mira!' : 'Cámara activa', 'grabando');
            }
        }).catch(function (err) {
            mostrarErrorEvidencia(refs, mensajeErrorEvidencia(err));
        }).finally(function () {
            $btn.prop('disabled', false);
        });
    });

    onBody('click', '[data-vn-evidencia-captura]', function () {
        vincularElementos();
        const estado = $body.data('vn-evidencia-estado');
        if (!estado) return;
        const refs = refsEvidencia($body);
        const tipo = estado.tipo;
        const sesion = estado.sesion;

        if (estado.nativo && tipo === 'audio' && window.VnCaptura) {
            refs.$captura.prop('disabled', true);
            VnCaptura.audioNativo.detener()
                .then(function (blob) {
                    if (estado.sesion !== evidenciaSesion) return;
                    if (window.VnCaptura) VnCaptura.detenerContador(refs.$contador);
                    setEstadoEvidencia(refs, '', '');
                    aplicarBlobEvidencia(refs, tipo, blob);
                })
                .catch(function (err) {
                    if (estado.sesion !== evidenciaSesion) return;
                    mostrarErrorEvidencia(refs, (err && err.message) || 'No se pudo guardar la grabación.');
                })
                .finally(function () { refs.$captura.prop('disabled', false); });
            return;
        }

        if (tipo === 'foto') {
            capturarFotoEvidencia(refs.$preview, refs.$result).then(function (ok) {
                if (estado.sesion !== evidenciaSesion) return;
                detenerEvidenciaStream();
                setEstadoEvidencia(refs, '', '');
                if (!ok) {
                    mostrarErrorEvidencia(refs, 'Espera un momentito y vuelve a tocar Capturar.');
                    return;
                }
                finalizarEvidencia(refs);
            });
            return;
        }
        if (tipo === 'audio') {
            detenerGrabacionEvidencia(refs, tipo, sesion).then(function (ok) {
                if (estado.sesion !== evidenciaSesion) return;
                if (window.VnCaptura) VnCaptura.detenerContador(refs.$contador);
                setEstadoEvidencia(refs, '', '');
                if (!ok) {
                    mostrarErrorEvidencia(refs, 'No se pudo guardar la grabación. Intenta otra vez.');
                    return;
                }
                finalizarEvidencia(refs);
            });
        }
    });

    onBody('click', '[data-vn-ra-listo]', function () {
        $(this).addClass('is-done');
        celebrarExito(false);
        alCompletarActividad();
    });

    onBody('click', '.vn-media-zoomable img', function () {
        const $media = $(this).closest('.vn-media');
        $media.toggleClass('is-zoomed');
        if ($media.hasClass('is-zoomed')) {
            marcarBloqueVisto();
        }
    });

    onBody('click', '[data-vn-emocion] .vn-emocion', function () {
        $body.find('.vn-emocion').removeClass('is-picked');
        $(this).addClass('is-picked vn-emocion--pop');
        setTimeout(() => { $(this).removeClass('vn-emocion--pop'); }, 450);
        celebrarExito(false);
        alCompletarActividad();
    });

    onBody('click', '[data-vn-pregunta] .vn-option', function () {
        const $box = $body.find('[data-vn-pregunta]');
        if ($box.data('locked')) return;
        const ok = String($(this).data('correcta')) === '1';
        $body.find('.vn-option').removeClass('is-ok is-bad');
        if (ok) {
            $(this).addClass('is-ok vn-option--pop');
            setTimeout(() => { $(this).removeClass('vn-option--pop'); }, 500);
            showFb(true, $box.data('fb-ok'), $box.data('fb-err'));
            $box.data('locked', true);
            alCompletarActividad();
            programarAvanceAutomatico();
            return;
        }
        $(this).addClass('is-bad vn-option--shake');
        setTimeout(() => { $(this).removeClass('vn-option--shake'); }, 450);
        showFb(false, $box.data('fb-ok'), $box.data('fb-err'));
        if (intentosRestantes !== Infinity) {
            intentosRestantes -= 1;
            if (intentosRestantes <= 0) {
                aplicarAlAgotar($box);
            }
        }
    });

    onBody('click', '[data-vn-reto] .vn-option', function () {
        const $box = $body.find('[data-vn-reto]');
        if ($box.data('locked')) return;
        const ok = String($(this).data('correcta')) === '1';
        $body.find('.vn-option').removeClass('is-ok is-bad');
        if (ok) {
            $(this).addClass('is-ok vn-option--pop');
            setTimeout(() => { $(this).removeClass('vn-option--pop'); }, 500);
            showFb(true, $box.data('fb-ok'), $box.data('fb-err'));
            const total = Number($box.data('total-pasos')) || 1;
            if (retoPaso < total - 1) {
                $box.data('locked', true);
                programarAvanceRetoPaso($box);
            } else {
                $box.data('locked', true);
                alCompletarActividad();
                programarAvanceAutomatico();
            }
            return;
        }
        $(this).addClass('is-bad vn-option--shake');
        setTimeout(() => { $(this).removeClass('vn-option--shake'); }, 450);
        showFb(false, $box.data('fb-ok'), $box.data('fb-err'));
        if (intentosRestantes !== Infinity) {
            intentosRestantes -= 1;
            if (intentosRestantes <= 0) {
                aplicarAlAgotar($box);
            }
        }
    });

    onBody('click', '[data-vn-emparejar] [data-vn-izq]', function () {
        if ($(this).hasClass('is-matched')) return;
        $body.find('[data-vn-izq]').removeClass('is-selected');
        $(this).addClass('is-selected');
        $body.data('emp-izq', Number($(this).data('vn-izq')));
    });

    onBody('click', '[data-vn-emparejar] [data-vn-der]', function () {
        if ($(this).hasClass('is-matched')) return;
        const izq = $body.data('emp-izq');
        if (izq === null || izq === undefined) return;
        const der = Number($(this).data('vn-der'));
        const $box = $body.find('[data-vn-emparejar]');
        const ok = izq === der;
        if (ok) {
            const $izqBtn = $body.find(`[data-vn-izq="${izq}"]`);
            const $derBtn = $body.find(`[data-vn-der="${der}"]`);
            $izqBtn.add($derBtn).addClass('is-matched vn-chip--matched').removeClass('is-selected');
            flashUnionEmparejar($izqBtn, $derBtn);
            showFb(true, $box.data('fb-ok'), $box.data('fb-err'));
            alCompletarActividad();
        } else {
            showFb(false, $box.data('fb-ok'), $box.data('fb-err'));
            $body.find('[data-vn-izq]').removeClass('is-selected');
        }
        $body.data('emp-izq', null);
    });

    onBody('click', '[data-vn-clasif-pool] [data-vn-item]', function () {
        if ($(this).hasClass('is-matched') || $(this).prop('hidden')) return;
        $body.find('[data-vn-clasif-pool] .vn-chip').removeClass('is-selected');
        $(this).addClass('is-selected');
        $body.data('pick-item', $(this));
        $body.find('[data-vn-clasif] .vn-zone').addClass('is-target');
    });

    onBody('click', '[data-vn-clasif] .vn-zone', function () {
        const $item = $body.data('pick-item');
        if (!$item || !$item.length) return;
        const ok = String($item.attr('data-cat')) === String($(this).attr('data-vn-cat'));
        showFb(ok, '¡Muy bien!', 'Prueba otra categoría');
        if (ok) colocarChipEnZona($item, this);
        else {
            $item.removeClass('is-selected');
            this.classList.add('is-wrong');
            setTimeout(() => { this.classList.remove('is-wrong'); }, 400);
        }
        $body.data('pick-item', null);
        $body.find('.vn-zone').removeClass('is-target');
        alCompletarActividad();
    });

    function limpiarDragArrastrar() {
        $(document).off('.vnArrDrag');
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

    onBody('pointerdown', '[data-vn-arrastrar-pool] .vn-chip-drag', function (e) {
        if ($(this).hasClass('is-matched')) return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        const chipEl = this;
        const $chip = $(chipEl);
        const rect = chipEl.getBoundingClientRect();
        const ghost = chipEl.cloneNode(true);
        ghost.classList.add('vn-drag-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        document.body.appendChild(ghost);
        $chip.addClass('is-dragging').attr('aria-grabbed', 'true');
        $body.find('[data-vn-arrastrar] .vn-zone').addClass('is-target');
        try { chipEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const drag = {
            $chip,
            ghost,
            pointerId: e.pointerId,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
        };
        $body.data('vn-drag', drag);

        const onMove = function (ev) {
            if (ev.pointerId !== drag.pointerId) return;
            ev.preventDefault();
            const dx = ev.clientX - drag.startX;
            const dy = ev.clientY - drag.startY;
            if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
            drag.ghost.style.left = `${ev.clientX - drag.offsetX}px`;
            drag.ghost.style.top = `${ev.clientY - drag.offsetY}px`;
            $body.find('[data-vn-arrastrar] .vn-zone').removeClass('is-drop-hover');
            const zone = zonaBajoPuntero(ev.clientX, ev.clientY);
            if (zone) zone.classList.add('is-drop-hover');
        };

        const onUp = function (ev) {
            if (ev.pointerId !== drag.pointerId) return;
            $(document).off('.vnArrDrag');
            try { chipEl.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
            const zone = zonaBajoPuntero(ev.clientX, ev.clientY);
            const $chipUp = drag.$chip;
            limpiarDragArrastrar();
            if (!zone || !drag.moved) return;
            const ok = String($chipUp.attr('data-zona')) === String($(zone).attr('data-vn-zona'));
            showFb(ok, '¡Muy bien!', 'Esa no es la zona');
            if (ok) colocarChipEnZona($chipUp, zone);
            else {
                zone.classList.add('is-wrong');
                setTimeout(() => { zone.classList.remove('is-wrong'); }, 400);
            }
        };

        $(document).on('pointermove.vnArrDrag', onMove);
        $(document).on('pointerup.vnArrDrag pointercancel.vnArrDrag', onUp);
    });

    function zonaClasifBajoPuntero(clientX, clientY) {
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return null;
        return el.closest('[data-vn-clasif] .vn-zone');
    }

    onBody('pointerdown', '[data-vn-clasif-pool] .vn-chip-drag', function (e) {
        if ($(this).hasClass('is-matched')) return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        const chipEl = this;
        const $chip = $(chipEl);
        const rect = chipEl.getBoundingClientRect();
        const ghost = chipEl.cloneNode(true);
        ghost.classList.add('vn-drag-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        document.body.appendChild(ghost);
        $chip.addClass('is-dragging').attr('aria-grabbed', 'true');
        $body.find('[data-vn-clasif] .vn-zone').addClass('is-target');
        try { chipEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const drag = {
            $chip,
            ghost,
            pointerId: e.pointerId,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
        };
        $body.data('vn-clasif-drag', drag);

        const onMove = function (ev) {
            if (ev.pointerId !== drag.pointerId) return;
            ev.preventDefault();
            if (Math.abs(ev.clientX - drag.startX) + Math.abs(ev.clientY - drag.startY) > 6) drag.moved = true;
            drag.ghost.style.left = `${ev.clientX - drag.offsetX}px`;
            drag.ghost.style.top = `${ev.clientY - drag.offsetY}px`;
            $body.find('[data-vn-clasif] .vn-zone').removeClass('is-drop-hover');
            const zone = zonaClasifBajoPuntero(ev.clientX, ev.clientY);
            if (zone) zone.classList.add('is-drop-hover');
        };

        const onUp = function (ev) {
            if (ev.pointerId !== drag.pointerId) return;
            $(document).off('.vnClasifDrag');
            try { chipEl.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
            const zone = zonaClasifBajoPuntero(ev.clientX, ev.clientY);
            const $chipUp = drag.$chip;
            if (drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
            $chipUp.removeClass('is-dragging').attr('aria-grabbed', 'false');
            $body.find('[data-vn-clasif] .vn-zone').removeClass('is-target is-drop-hover');
            $body.data('vn-clasif-drag', null);
            if (!zone || !drag.moved) return;
            const ok = String($chipUp.attr('data-cat')) === String($(zone).attr('data-vn-cat'));
            showFb(ok, '¡Muy bien!', 'Prueba otra categoría');
            if (ok) colocarChipEnZona($chipUp, zone);
            else {
                zone.classList.add('is-wrong');
                setTimeout(() => { zone.classList.remove('is-wrong'); }, 400);
            }
            alCompletarActividad();
        };

        $(document).on('pointermove.vnClasifDrag', onMove);
        $(document).on('pointerup.vnClasifDrag pointercancel.vnClasifDrag', onUp);
    });

    function limpiarDragPuzzle() {
        $(document).off('.vnPuzzleDrag');
        const drag = $body.data('vn-puzzle-drag');
        if (!drag) return;
        if (drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
        if (drag.$piece) drag.$piece.removeClass('is-dragging');
        $body.find('.vn-puzzle-slot').removeClass('is-drop-hover is-target');
        $body.data('vn-puzzle-drag', null);
    }

    function limpiarSeleccionPuzzle() {
        if (!$body || !$body.length) return;
        $body.find('.vn-puzzle-piece.is-selected').removeClass('is-selected');
    }

    function colocarPiezaPuzzle($piece, $slot) {
        const pieceIdx = Number($piece.data('vn-puzzle-piece'));
        const slotIdx = Number($slot.data('vn-puzzle-slot'));
        if (pieceIdx !== slotIdx) {
            showFb(false, '¡Ups!', configNivel().simplificar ? '¡Otra!' : 'Esa pieza no va ahí');
            return false;
        }
        $piece.addClass('is-placed').removeClass('is-selected').prop('disabled', true);
        $slot.addClass('is-filled').empty().append($piece);
        celebrarExito(false);
        revisarPuzzleCompleto();
        return true;
    }

    function slotPuzzleBajoPuntero(clientX, clientY, pieceIdx) {
        const drag = $body.data('vn-puzzle-drag');
        if (drag && drag.ghost) {
            const gr = drag.ghost.getBoundingClientRect();
            clientX = gr.left + gr.width / 2;
            clientY = gr.top + gr.height / 2;
        }

        const el = document.elementFromPoint(clientX, clientY);
        const hit = el ? el.closest('.vn-puzzle-slot:not(.is-filled)') : null;
        if (hit) return hit;
        const $slots = $body.find('.vn-puzzle-slot:not(.is-filled)');
        let best = null;
        let bestDist = Infinity;
        const tol = esModoDispositivo() ? 1.1 : 0.7;
        $slots.each(function () {
            const r = this.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) return;
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dist = Math.hypot(clientX - cx, clientY - cy);
            const radio = Math.max(r.width, r.height) * tol;
            if (dist > radio) return;
            const idx = Number($(this).data('vn-puzzle-slot'));
            const prefer = pieceIdx === idx ? dist * 0.4 : dist;
            if (prefer < bestDist) {
                bestDist = prefer;
                best = this;
            }
        });
        return best;
    }

    function revisarPuzzleCompleto() {
        const $puzzle = $body.find('[data-vn-puzzle]');
        if (!$puzzle.length) return;
        const total = Number($puzzle.data('total')) || 0;
        const filled = $puzzle.find('.vn-puzzle-slot.is-filled').length;
        if (total > 0 && filled >= total) {
            showFb(true, '¡Rompecabezas listo!', '');
            $puzzle.addClass('is-complete');
            alCompletarActividad();
        }
    }

    onBody('pointerdown', '.vn-puzzle-pool .vn-puzzle-piece', function (e) {
        if ($(this).hasClass('is-placed')) return;
        if (e.button != null && e.button !== 0) return;
        limpiarSeleccionPuzzle();
        e.preventDefault();
        const pieceEl = this;
        const $piece = $(pieceEl);
        const rect = pieceEl.getBoundingClientRect();
        const ghost = pieceEl.cloneNode(true);
        ghost.classList.add('vn-drag-ghost', 'vn-puzzle-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        document.body.appendChild(ghost);
        $piece.addClass('is-dragging');
        $body.find('.vn-puzzle-slot:not(.is-filled)').addClass('is-target');
        try { pieceEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const pieceIdx = Number($piece.data('vn-puzzle-piece'));
        const drag = {
            $piece,
            ghost,
            pointerId: e.pointerId,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
        };
        $body.data('vn-puzzle-drag', drag);

        const onMove = function (ev) {
            if (ev.pointerId !== drag.pointerId) return;
            ev.preventDefault();
            if (Math.abs(ev.clientX - drag.startX) + Math.abs(ev.clientY - drag.startY) > 6) drag.moved = true;
            drag.ghost.style.left = `${ev.clientX - drag.offsetX}px`;
            drag.ghost.style.top = `${ev.clientY - drag.offsetY}px`;
            $body.find('.vn-puzzle-slot').removeClass('is-drop-hover');
            const slot = slotPuzzleBajoPuntero(ev.clientX, ev.clientY, pieceIdx);
            if (slot) slot.classList.add('is-drop-hover');
        };

        const onUp = function (ev) {
            if (ev.pointerId !== drag.pointerId) return;
            $(document).off('.vnPuzzleDrag');
            try { pieceEl.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
            const slot = slotPuzzleBajoPuntero(ev.clientX, ev.clientY, pieceIdx);
            const $pieceUp = drag.$piece;
            limpiarDragPuzzle();
            if (!drag.moved) {
                if (esModoDispositivo()) {
                    limpiarSeleccionPuzzle();
                    $pieceUp.addClass('is-selected');
                }
                return;
            }
            if (!slot) return;
            colocarPiezaPuzzle($pieceUp, $(slot));
        };

        $(document).on('pointermove.vnPuzzleDrag', onMove);
        $(document).on('pointerup.vnPuzzleDrag pointercancel.vnPuzzleDrag', onUp);
    });

    onBody('pointerup', '.vn-puzzle-slot:not(.is-filled)', function (e) {
        if (e.button != null && e.button !== 0) return;
        const $sel = $body.find('.vn-puzzle-pool .vn-puzzle-piece.is-selected');
        if (!$sel.length) return;
        colocarPiezaPuzzle($sel, $(this));
    });

    function limpiarDragSecuencia() {
        $(document).off('.vnSeqDrag');
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
            alCompletarActividad();
        } else {
            const $fb = $('#vnFb');
            if ($fb.length) $fb.prop('hidden', true).removeClass('is-ok is-bad').text('');
        }
    }

    onBody('pointerdown', '[data-vn-seq-card]', function (e) {
        if ($(this).prop('disabled')) return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        const cardEl = this;
        const $card = $(cardEl);
        const rect = cardEl.getBoundingClientRect();
        const ghost = cardEl.cloneNode(true);
        ghost.classList.add('vn-drag-ghost', 'vn-seq-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        document.body.appendChild(ghost);
        $card.addClass('is-dragging');
        try { cardEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const drag = {
            $card,
            ghost,
            pointerId: e.pointerId,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
        };
        $body.data('vn-seq-drag', drag);

        const onMove = function (ev) {
            if (ev.pointerId !== drag.pointerId) return;
            ev.preventDefault();
            if (Math.abs(ev.clientX - drag.startX) + Math.abs(ev.clientY - drag.startY) > 6) drag.moved = true;
            drag.ghost.style.left = `${ev.clientX - drag.offsetX}px`;
            drag.ghost.style.top = `${ev.clientY - drag.offsetY}px`;
            $body.find('.vn-seq-card').removeClass('is-drop-hover');
            const target = cardSecuenciaBajoPuntero(ev.clientX, ev.clientY, drag.$card[0]);
            if (target) target.classList.add('is-drop-hover');
        };

        const onUp = function (ev) {
            if (ev.pointerId !== drag.pointerId) return;
            $(document).off('.vnSeqDrag');
            try { cardEl.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
            const target = cardSecuenciaBajoPuntero(ev.clientX, ev.clientY, drag.$card[0]);
            const $cardUp = drag.$card;
            const moved = drag.moved;
            limpiarDragSecuencia();
            if (!moved || !target) return;
            const $target = $(target);
            const rectT = target.getBoundingClientRect();
            if (ev.clientX < rectT.left + rectT.width / 2) {
                $target.before($cardUp);
            } else {
                $target.after($cardUp);
            }
            revisarSecuenciaOrden();
        };

        $(document).on('pointermove.vnSeqDrag', onMove);
        $(document).on('pointerup.vnSeqDrag pointercancel.vnSeqDrag', onUp);
    });

    onBody('click', '[data-vn-memory] .vn-memory-card', function () {
        const $card = $(this);
        if ($card.hasClass('is-flipped') || $card.hasClass('is-done')) return;
        let flipped = $body.data('mem-flipped') || [];
        if (flipped.length >= 2) return;

        const pair = String($card.data('pair'));
        const url = mediaUrl(pair);
        $card.addClass('is-flipped vn-memory-card--flip');
        setTimeout(() => { $card.removeClass('vn-memory-card--flip'); }, 380);
        if (url) {
            $card.find('.vn-memory-back').remove();
            $card.append(`<img src="${escapar(url)}" alt="" class="vn-memory-front">`);
        } else {
            $card.find('.vn-memory-back').text('★');
        }
        flipped.push($card);
        $body.data('mem-flipped', flipped);

        if (flipped.length < 2) return;
        const a = flipped[0];
        const b = flipped[1];
        if (String(a.data('pair')) === String(b.data('pair'))) {
            a.addClass('is-done');
            b.addClass('is-done');
            $body.data('mem-flipped', []);
            actualizarScoreMemoria();
            celebrarExito(false);
            const total = $body.find('[data-vn-memory] .vn-memory-card').length;
            const done = $body.find('[data-vn-memory] .vn-memory-card.is-done').length;
            if (total > 0 && done >= total) {
                showFb(true, '¡Todas las parejas!', '');
                alCompletarActividad();
            }
        } else {
            setTimeout(() => {
                a.removeClass('is-flipped').find('img, .vn-memory-front').remove();
                b.removeClass('is-flipped').find('img, .vn-memory-front').remove();
                if (!a.find('.vn-memory-back').length) a.prepend('<span class="vn-memory-back" aria-hidden="true">?</span>');
                if (!b.find('.vn-memory-back').length) b.prepend('<span class="vn-memory-back" aria-hidden="true">?</span>');
                $body.data('mem-flipped', []);
                reproducirSfx('err');
            }, 750);
        }
    });

    $(window).on('resize orientationchange', function () {
        if (!overlayAbierto()) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(programarAjusteLayout, 80);
    });

    // Per-block eye button in timeline → open at that block
    $(document).on('click', '.cx-btn-preview', function (e) {
        if (esModoDispositivo()) return;
        e.preventDefault();
        e.stopPropagation();
        const id = Number($(this).data('id'));
        abrir();
        if (overlayAbierto() && id) {
            const i = bloques.findIndex((b) => Number(b.id) === id);
            if (i >= 0) {
                index = i;
                historiaPage = 0;
                retoPaso = 0;
                pintar();
            }
        }
    });

    if (esModoDispositivo()) {
        const defer = String($root.data('vn-defer') || '') === '1';
        if (defer) {
            asegurarHandlersFullscreen();
            actualizarBtnFullscreen();
        }
    }
})(jQuery);
