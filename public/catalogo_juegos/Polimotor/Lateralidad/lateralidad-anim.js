/**
 * lateralidad-anim.js — Capa de animación de "Lateralidad" (GSAP 3).
 * Las partículas (Phaser 4) vienen de ../../shared/pednia-fx.js (PedniaFx).
 *
 * SOLO VISUAL. La lógica del juego vive en script.js y no se toca:
 *   - .actor-movil y .mascota-panel se ubican con `left` (transición CSS) y su
 *     transform del CSS (translate(-50%,-50%)) más la animación "caminando". Aquí
 *     NUNCA se anima su transform: solo la opacidad/filtro de su <img> interna.
 *   - .zona-slot, #tablero, #respuestas y #actor-area tampoco se animan (tienen sus
 *     propias transiciones/animaciones CSS de entrada).
 *   - Se animan .btn-mano, .tarjeta-obj y .pareja-fijos .figura: nadie los mide ni lee
 *     su estilo; todo se limpia (clearProps) al terminar, así quedan donde estaban.
 *   - Las clases que usa el juego (acerto, caminando, señala-*, resaltada,
 *     is-clickable) no se tocan.
 *
 * Trampas de GSAP evitadas (ver memoria del proyecto):
 *   - Sin `stagger`: un tween por elemento con `delay` (killTweensOf fiable).
 *   - `clearProps` no se aplica con `keyframes` ni `yoyo` → limpiar en onComplete.
 *   - Sin Math.random (el juego baraja con él): generador propio con semilla.
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
        // Reloj real: si el equipo va lento, las animaciones terminan a tiempo,
        // en sincronía con los setTimeout/sleep del juego.
        gsap.ticker.lagSmoothing(0);
    }

    function fx() { return (Fx && Fx.activo) ? Fx : null; }

    // Generador propio (no consume Math.random, que el juego usa para barajar).
    var semilla = 20261029;
    function azar(min, max) {
        semilla = (semilla * 1664525 + 1013904223) >>> 0;
        return min + (semilla / 4294967296) * (max - min);
    }

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function rectUtil(el) {
        if (!el || !el.getBoundingClientRect) return null;
        var r = el.getBoundingClientRect();
        return (r.width > 1 && r.height > 1) ? r : null;
    }

    function lista(nodos) {
        return Array.prototype.slice.call(nodos || []);
    }

    // Mata las animaciones de un elemento (uno por uno: killTweensOf(lista) no es fiable).
    function detener(el) {
        if (!el) return;
        if (el.__latErrorTl) {
            el.__latErrorTl.kill();
            el.__latErrorTl = null;
        }
        gsap.killTweensOf(el);
    }

    // Elemento animable de una respuesta: en los actores, su imagen (el contenedor
    // lleva el translate del CSS y se mueve con `left`).
    function objetivoVisual(el) {
        if (!el) return null;
        if (el.classList && el.classList.contains('actor-movil')) {
            return el.querySelector('img') || null;
        }
        return el;
    }

    var ultimoTocado = null;
    var ultimoProgreso = null;

    var LateralidadAnim = {
        activo: activo,

        // Botones de respuesta (manos izquierda/centro/derecha): saltan uno tras otro.
        opciones: function (contenedor) {
            if (!activo || !contenedor) return;
            if (fx()) fx().preparar();
            lista(contenedor.querySelectorAll('.btn-mano')).forEach(function (b, i) {
                detener(b);
                gsap.fromTo(b, { scale: 0.4, opacity: 0, rotation: azar(-14, 14) }, {
                    scale: 1,
                    opacity: 1,
                    rotation: 0,
                    duration: 0.55,
                    delay: 0.12 + i * 0.09,
                    ease: 'back.out(2)',
                    clearProps: 'transform,opacity'
                });
            });
        },

        // Tarjetas de objetos (y Zeus en "Zeus se acomoda"): aparecen con un rebote.
        tarjetas: function (tablero) {
            if (!activo || !tablero) return;
            if (fx()) fx().preparar();
            lista(tablero.querySelectorAll('.tarjeta-obj, .pareja-fijos .figura')).forEach(function (t, i) {
                detener(t);
                gsap.fromTo(t, { scale: 0.5, opacity: 0, rotation: azar(-10, 10) }, {
                    scale: 1,
                    opacity: 1,
                    rotation: 0,
                    duration: 0.6,
                    delay: 0.08 + i * 0.1,
                    ease: 'back.out(1.8)',
                    clearProps: 'transform,opacity'
                });
            });
        },

        // Actor o mascota que entra a escena: su imagen aparece (solo opacidad).
        actor: function (el) {
            if (!activo || !el) return;
            var img = el.querySelector('img');
            if (!img) return;
            gsap.killTweensOf(img);
            gsap.fromTo(img, { opacity: 0 }, {
                opacity: 1, duration: 0.35, ease: 'power1.out', clearProps: 'opacity'
            });
        },

        // El niño tocó una respuesta (valor = zona u objeto). Se recuerda el elemento
        // para la sacudida de error; el acierto lo anima `acierto`.
        toque: function (valor) {
            if (!activo) return;
            var v = String(valor);
            ultimoTocado = doc.querySelector('.btn-mano[data-zona="' + v + '"]')
                || doc.querySelector('.tarjeta-obj.seleccionable[data-objeto="' + v + '"]')
                || doc.querySelector('.actor-movil[data-actor="' + v + '"]')
                || null;
        },

        // Acierto: brillo en el elemento correcto + estrellas y anillo (Phaser).
        // Devuelve true si se encargó (el juego omite entonces sus estrellitas CSS).
        acierto: function (ancla, color) {
            if (!activo || !ancla || !fx()) return false;
            var tono = color || '#ffd54f';
            var r = rectUtil(ancla);
            if (r) {
                var c = centro(r);
                fx().estallido(c.x, c.y, tono, 18);
                fx().anillo(r, tono);
            }
            // El transform lo usa la animación CSS "aciertoPop" (clase acerto): aquí solo filtro.
            var obj = objetivoVisual(ancla) || ancla;
            gsap.killTweensOf(obj, 'filter');
            gsap.fromTo(obj, { filter: 'brightness(1.45) drop-shadow(0 0 14px rgba(255,213,79,0.95))' }, {
                filter: 'brightness(1) drop-shadow(0 0 0px rgba(255,213,79,0))',
                duration: 0.75,
                ease: 'power2.out',
                onComplete: function () { gsap.set(obj, { clearProps: 'filter' }); }
            });
            return true;
        },

        // Error: la respuesta tocada tiembla con un brillo rojo y vuelve a su sitio.
        error: function () {
            if (!activo) return;
            var el = objetivoVisual(ultimoTocado);
            if (!el || !el.isConnected) return;
            detener(el);
            gsap.set(el, { clearProps: 'transform,filter' });
            // GSAP no aplica clearProps con `keyframes` ni con `yoyo` → onComplete.
            el.__latErrorTl = gsap.timeline({
                onComplete: function () {
                    el.__latErrorTl = null;
                    gsap.set(el, { clearProps: 'transform,filter' });
                }
            })
                .to(el, { keyframes: { x: [-14, 13, -9, 7, -3, 0] }, duration: 0.5, ease: 'none' }, 0)
                .fromTo(el, { filter: 'drop-shadow(0 0 0px rgba(229,57,53,0))' }, {
                    filter: 'drop-shadow(0 0 12px rgba(229,57,53,0.95))',
                    duration: 0.16,
                    yoyo: true,
                    repeat: 3
                }, 0);
        },

        // Contador del HUD: salta al pasar de reto.
        progreso: function (el) {
            if (!el) return;
            var txt = el.textContent;
            var prev = ultimoProgreso;
            ultimoProgreso = txt;
            if (!activo || el.hidden || prev === null || prev === txt) return;
            gsap.killTweensOf(el);
            gsap.fromTo(el, { scale: 1.4 }, {
                scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
        },

        // Fin del juego: confeti y estrellas sobre el escenario.
        celebrar: function () {
            if (!activo || !fx()) return;
            fx().celebracion(rectUtil(doc.getElementById('escena-wrap')));
        }
    };

    global.LateralidadAnim = LateralidadAnim;
})(window);
