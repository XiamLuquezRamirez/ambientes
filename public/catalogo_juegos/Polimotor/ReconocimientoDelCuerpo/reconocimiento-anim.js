/**
 * reconocimiento-anim.js — Capa de animación de "Reconocimiento del cuerpo" (GSAP 3).
 * Las partículas (Phaser 4) vienen de ../../shared/pednia-fx.js (PedniaFx).
 *
 * SOLO VISUAL. La lógica del juego vive en script.js y no se toca:
 *   - #lienzo, #img-completo y las .zona-toque los MIDE la lógica (puntoEnImagen,
 *     zonasBajoPunto con getBoundingClientRect) y sizeLienzo les da tamaño. Aquí nunca
 *     se anima su transform ni su tamaño: en la figura solo `opacity` y `filter`; las
 *     zonas ya tienen sus animaciones CSS originales (iluminar, zonaError) y no se tocan.
 *   - Las marcas del toque, anillos y estrellas son capas nuevas `position:fixed` con
 *     pointer-events:none (no interceptan toques).
 *   - La burbuja del enunciado (.enunciado-burbuja) sí se anima: la lógica mide el
 *     offsetWidth del <h1> interior, que no cambia con transform.
 *
 * Trampas de GSAP evitadas (ver memoria del proyecto):
 *   - Sin `stagger`; tweens de un solo objetivo y killTweensOf elemento por elemento.
 *   - `clearProps` no se aplica con `keyframes` ni `yoyo` que termina en el inicio →
 *     se limpia en onComplete.
 *   - Sin Math.random (el juego elige el cuerpo con él).
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var activo = !!gsap && !reducido;
    var Fx = global.PedniaFx || null;

    if (activo) {
        doc.body.classList.add('gsap-anim');
        // Reloj real: si el equipo va lento, las animaciones saltan cuadros pero terminan
        // a tiempo, en sincronía con los setTimeout del juego.
        gsap.ticker.lagSmoothing(0);
    }

    function fx() { return (Fx && Fx.activo) ? Fx : null; }

    // "Sin animaciones" del menú de accesibilidad (si el juego lo usa) también se respeta.
    function animar() { return activo && !doc.body.classList.contains('sin-animaciones'); }

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function rectUtil(el) {
        if (!el || !el.getBoundingClientRect) return null;
        var r = el.getBoundingClientRect();
        return (r.width > 1 && r.height > 1) ? r : null;
    }

    function zonaPorId(id) {
        return doc.querySelector('.zona-toque[data-id="' + id + '"]');
    }

    // Detiene los tweens de un elemento y borra lo que dejaron (uno por uno: ver cabecera).
    function detener(el, props) {
        if (!el) return;
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: props || 'transform,opacity,filter' });
    }

    // ---------------- Marca del toque (capa nueva, fija) ----------------

    // Círculo que se expande donde tocó el niño. Con error tiembla un poco ("no es ahí").
    function marcaToque(x, y, ok) {
        var m = doc.createElement('span');
        m.className = 'recon-toque' + (ok ? '' : ' recon-toque-error');
        m.setAttribute('aria-hidden', 'true');
        m.style.left = x + 'px';
        m.style.top = y + 'px';
        doc.body.appendChild(m);
        var tl = gsap.timeline({ onComplete: function () { m.remove(); } });
        tl.fromTo(m, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.3, opacity: 0.95 }, {
            scale: ok ? 1.7 : 1.25,
            opacity: 0,
            duration: ok ? 0.55 : 0.6,
            ease: 'power2.out'
        }, 0);
        if (!ok) {
            tl.to(m, { keyframes: { x: [-7, 6, -4, 3, 0] }, duration: 0.4, ease: 'none' }, 0);
        }
    }

    // ---------------- Figura: solo opacidad y filtro ----------------

    function destelloFigura(sombra, intensidad) {
        var img = doc.getElementById('img-completo');
        if (!img) return;
        detener(img, 'filter');
        // yoyo termina en el inicio: GSAP no aplica clearProps → se limpia en onComplete.
        gsap.fromTo(img, { filter: 'brightness(1) drop-shadow(0 0 0px ' + sombra + ')' }, {
            filter: 'brightness(' + intensidad + ') drop-shadow(0 0 14px ' + sombra + ')',
            duration: 0.22,
            yoyo: true,
            repeat: 1,
            ease: 'power2.out',
            onComplete: function () { gsap.set(img, { clearProps: 'filter' }); }
        });
    }

    var ultimoProgreso = null;

    var ReconocimientoAnim = {
        activo: activo,

        // Arranca la capa de partículas en segundo plano (el primer acierto no espera).
        preparar: function () {
            if (fx()) fx().preparar();
        },

        // La figura aparece con un fundido suave (solo opacidad y brillo).
        entradaFigura: function () {
            if (!animar()) return;
            var img = doc.getElementById('img-completo');
            if (!img) return;
            detener(img, 'opacity,filter');
            gsap.fromTo(img, { opacity: 0, filter: 'brightness(1.5)' }, {
                opacity: 1,
                filter: 'brightness(1)',
                duration: 0.6,
                ease: 'power2.out',
                clearProps: 'opacity,filter'
            });
        },

        // Toque válido sobre la figura: marca en el punto exacto del dedo.
        toque: function (x, y, ok) {
            if (!animar() || !isFinite(x) || !isFinite(y)) return;
            marcaToque(x, y, !!ok);
        },

        // Acierto: anillo + estrellas sobre la(s) zona(s) iluminada(s) y brillo en la figura.
        acierto: function (ids) {
            (ids || []).forEach(function (id) {
                var r = rectUtil(zonaPorId(id));
                if (!r || !fx()) return;
                var c = centro(r);
                fx().anillo(r, '#00e5ff');
                fx().estallido(c.x, c.y, '#ffd54f', 16);
            });
            if (animar()) destelloFigura('rgba(0,229,255,0.9)', 1.18);
        },

        // Error: la burbuja de la pregunta se sacude suave y la figura da un destello rojo.
        // (La zona tocada ya tiembla con su animación CSS original.)
        error: function () {
            if (!animar()) return;
            destelloFigura('rgba(239,83,80,0.85)', 1.05);
            var burbuja = doc.querySelector('.enunciado-burbuja');
            if (!burbuja) return;
            detener(burbuja, 'transform');
            // keyframes: GSAP no aplica clearProps → se limpia en onComplete.
            gsap.to(burbuja, {
                keyframes: { x: [-10, 9, -6, 4, -2, 0] },
                duration: 0.5,
                ease: 'none',
                onComplete: function () { gsap.set(burbuja, { clearProps: 'transform' }); }
            });
        },

        // Texto nuevo de la burbuja: pequeño "pop" (los estados acierto/error ya tienen el
        // suyo en CSS sobre el <h1>, aquí solo se anima la pregunta).
        enunciado: function (en, texto, estado) {
            if (!animar() || !en || !texto || estado) return;
            var burbuja = en.closest ? en.closest('.enunciado-burbuja') : null;
            if (!burbuja) return;
            detener(burbuja, 'transform,opacity');
            gsap.fromTo(burbuja, { scale: 0.9, opacity: 0.55 }, {
                scale: 1,
                opacity: 1,
                duration: 0.45,
                ease: 'back.out(2)',
                clearProps: 'transform,opacity'
            });
        },

        // Contador del HUD: salta cuando avanza.
        progreso: function (el) {
            if (!el) return;
            var txt = String(el.textContent || '').replace(/\s+/g, '');
            var prev = ultimoProgreso;
            ultimoProgreso = txt;
            if (!animar() || el.hidden || prev === null || prev === txt) return;
            detener(el, 'transform');
            gsap.fromTo(el, { scale: 1.45 }, {
                scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
            var ic = el.querySelector('i');
            if (ic) {
                gsap.fromTo(ic, { rotation: 0 }, {
                    rotation: 360, duration: 0.5, ease: 'power2.out', clearProps: 'transform'
                });
            }
        },

        // Fin del juego: confeti + ráfagas sobre la figura (antes de la pantalla final).
        celebrar: function () {
            var rect = rectUtil(doc.getElementById('lienzo'));
            if (animar()) destelloFigura('rgba(255,213,79,0.95)', 1.25);
            if (fx()) fx().celebracion(rect);
        }
    };

    global.ReconocimientoAnim = ReconocimientoAnim;
})(window);
