/**
 * encuentra-color-anim.js — HUD GSAP para Encuentra el Color.
 * Canvas/sprites: Phaser.Tweens (phaser-tablero.js). Celebración: PedniaFx.
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var activo = !!gsap && !reducido;

    if (activo) {
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
        acierto: acierto,
        cierre: cierre
    };
})(typeof window !== 'undefined' ? window : this);
