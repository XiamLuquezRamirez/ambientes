/**
 * encuentra-color-anim.js — HUD GSAP para Encuentra el Color.
 *
 * Canvas/sprites y teñido del mundo: Phaser (phaser-tablero.js).
 * Aquí vive el HUD de DOM: consigna, muestra, y el MEDIDOR DE COLOR
 * (barra que se llena a medida que el niño devuelve el color al mundo).
 * Celebración: PedniaFx.
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var activo = !!gsap && !reducido;

    var medidorEl = null;     // contenedor
    var medidorFill = null;   // relleno
    var medidorGotas = null;  // iconitos de progreso

    if (gsap) {
        doc.body.classList.add('gsap-anim');
        gsap.ticker.lagSmoothing(0);
    }

    function fx() {
        var F = global.PedniaFx;
        return (F && F.activo) ? F : null;
    }

    function matar(el) {
        if (!activo || !el) return;
        gsap.killTweensOf(el);
    }

    /* ── Medidor de color ──────────────────────────────────────── */

    function inyectarEstilo() {
        if (doc.getElementById('medidor-color-css')) return;
        var css = doc.createElement('style');
        css.id = 'medidor-color-css';
        css.textContent = [
            '.medidor-color{position:relative;display:flex;align-items:center;gap:10px;',
            'margin:6px auto 0;max-width:520px;width:72%;padding:6px 12px;',
            'background:rgba(255,255,255,.72);border-radius:999px;',
            'box-shadow:0 4px 14px rgba(30,58,95,.12);backdrop-filter:blur(2px);}',
            '.medidor-color .mc-icono{font-size:22px;line-height:1;filter:grayscale(.2)}',
            '.medidor-color .mc-pista{position:relative;flex:1;height:16px;border-radius:999px;',
            'background:#e7ecf3;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.12)}',
            '.medidor-color .mc-fill{position:absolute;inset:0 auto 0 0;width:0%;border-radius:999px;',
            'background:#9ad0ff;transition:none}',
            '.medidor-color .mc-gotas{display:flex;gap:4px}',
            '.medidor-color .mc-gota{width:13px;height:13px;border-radius:50%;background:#dfe6ef;',
            'box-shadow:inset 0 1px 2px rgba(0,0,0,.15);transition:transform .2s}',
            '.medidor-color .mc-gota.on{transform:scale(1.15)}',
            '@media (prefers-reduced-motion: reduce){.medidor-color .mc-fill{transition:none}}'
        ].join('');
        doc.head.appendChild(css);
    }

    function asegurarMedidor() {
        if (medidorEl && doc.body.contains(medidorEl)) return medidorEl;
        inyectarEstilo();
        var wrap = doc.querySelector('.enunciado-wrap');
        if (!wrap) return null;
        medidorEl = doc.createElement('div');
        medidorEl.className = 'medidor-color';
        medidorEl.setAttribute('aria-hidden', 'true');
        medidorEl.innerHTML =
            '<span class="mc-icono">🎨</span>' +
            '<span class="mc-pista"><span class="mc-fill"></span></span>' +
            '<span class="mc-gotas"></span>';
        wrap.appendChild(medidorEl);
        medidorFill = medidorEl.querySelector('.mc-fill');
        medidorGotas = medidorEl.querySelector('.mc-gotas');
        return medidorEl;
    }

    /** Prepara el medidor para una partida de `total` pasos y color `hex`. */
    function medidorIniciar(total, hex) {
        if (!asegurarMedidor()) return;
        total = Math.max(1, total | 0);
        medidorGotas.innerHTML = '';
        for (var i = 0; i < total; i++) {
            var g = doc.createElement('span');
            g.className = 'mc-gota';
            medidorGotas.appendChild(g);
        }
        if (medidorFill) {
            medidorFill.style.width = '0%';
            if (hex) medidorFill.style.background = hex;
        }
        medidorEl.dataset.total = String(total);
        medidorEl.dataset.hecho = '0';
        if (activo) {
            gsap.fromTo(medidorEl, { autoAlpha: 0, y: 8 },
                { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', overwrite: true });
        } else {
            medidorEl.style.opacity = '1';
        }
    }

    /** Avanza el medidor a `hecho`/`total` pasos, opcionalmente con color. */
    function medidorAvanzar(hecho, total, hex) {
        if (!asegurarMedidor()) return;
        total = Math.max(1, (total | 0) || Number(medidorEl.dataset.total) || 1);
        hecho = Math.max(0, Math.min(total, hecho | 0));
        var pct = (hecho / total) * 100;
        if (hex && medidorFill) medidorFill.style.background = hex;
        var gotas = medidorGotas ? medidorGotas.querySelectorAll('.mc-gota') : [];
        for (var i = 0; i < gotas.length; i++) {
            gotas[i].classList.toggle('on', i < hecho);
            if (hex && i < hecho) gotas[i].style.background = hex;
        }
        if (activo && medidorFill) {
            gsap.to(medidorFill, { width: pct + '%', duration: 0.5, ease: 'power2.out', overwrite: true });
        } else if (medidorFill) {
            medidorFill.style.width = pct + '%';
        }
        medidorEl.dataset.hecho = String(hecho);
    }

    function medidorOcultar() {
        if (!medidorEl) return;
        if (activo) {
            gsap.to(medidorEl, { autoAlpha: 0, duration: 0.3, overwrite: true });
        } else {
            medidorEl.style.opacity = '0';
        }
    }

    /* ── Consigna / muestra ────────────────────────────────────── */

    function consignaNueva() {
        if (!activo) return;
        var muestra = doc.getElementById('muestra-color');
        var enunciado = doc.getElementById('enunciado');
        var progreso = doc.getElementById('progreso');

        [muestra, enunciado, progreso].forEach(function (el) {
            if (!el || el.hidden) return;
            matar(el);
            gsap.fromTo(el,
                { autoAlpha: 0, y: -12 },
                { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', overwrite: true }
            );
        });
    }

    function acierto(rect) {
        var F = fx();
        if (!F || !rect) return;
        try {
            F.estallido(rect.x || (rect.left + rect.width / 2), rect.y || (rect.top + rect.height / 2), '#22c55e', 10);
            if (F.anillo) F.anillo(rect, '#22c55e');
        } catch (e) { /* noop */ }
    }

    function cierre() {
        medidorOcultar();
        var F = fx();
        if (!F) return;
        var wrap = doc.querySelector('.enunciado-wrap') || doc.getElementById('principal');
        if (!wrap) return;
        try {
            F.celebracion(wrap.getBoundingClientRect());
        } catch (e) { /* noop */ }
    }

    function preparar() {
        if (global.PedniaFx && global.PedniaFx.preparar) {
            try { global.PedniaFx.preparar(); } catch (e) { /* noop */ }
        }
    }

    global.PedniaEncuentraColorAnim = {
        activo: activo,
        preparar: preparar,
        consignaNueva: consignaNueva,
        medidorIniciar: medidorIniciar,
        medidorAvanzar: medidorAvanzar,
        medidorOcultar: medidorOcultar,
        acierto: acierto,
        cierre: cierre
    };
})(typeof window !== 'undefined' ? window : this);
