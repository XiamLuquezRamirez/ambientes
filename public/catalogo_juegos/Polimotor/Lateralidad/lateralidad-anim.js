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
    // En los niveles nuevos se anima la pieza visible, no el contenedor, que suele
    // llevar transiciones propias (puertas que giran, cestas que se deslizan).
    function objetivoVisual(el) {
        if (!el) return null;
        var c = el.classList;
        if (!c) return el;
        if (c.contains('actor-movil')) return el.querySelector('img') || null;
        if (c.contains('sendero-ramal')) return el.querySelector('.sendero-puerta') || el;
        if (c.contains('atrapa-carril')) return el.querySelector('.atrapa-cartel') || el;
        if (c.contains('parejas-puesto')) return el.querySelector('.parejas-carta') || el;
        if (c.contains('estante-hueco')) return el;
        return el;
    }

    // Dónde está la respuesta recién tocada, en cualquiera de los niveles.
    function anclaDe(valor) {
        var v = String(valor);
        return doc.querySelector('.sendero-ramal[data-zona="' + v + '"]')
            || doc.querySelector('.atrapa-carril[data-zona="' + v + '"]')
            || doc.querySelector('.estante-hueco[data-zona="' + v + '"]')
            || doc.querySelector('.parejas-puesto[data-objeto="' + v + '"]')
            || null;
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
                || anclaDe(v);
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
        },

        /**
         * Premio de cada acierto, con tres intensidades:
         * "ronda" una chispa, "nivel" un estallido doble, "final" confeti.
         */
        festejar: function (valor, grado, color) {
            if (!activo) return;
            var ancla = anclaDe(valor);
            var obj = objetivoVisual(ancla) || ancla;
            var tono = color || '#ffd54f';

            if (obj) {
                detener(obj);
                gsap.fromTo(obj,
                    { scale: 1 },
                    {
                        scale: grado === 'ronda' ? 1.12 : 1.22,
                        duration: 0.22,
                        ease: 'power2.out',
                        yoyo: true,
                        repeat: 1,
                        clearProps: 'transform'
                    });
            }

            if (!fx() || !ancla) return;
            var r = rectUtil(ancla);
            if (!r) return;
            var c = centro(r);
            fx().estallido(c.x, c.y, tono, grado === 'ronda' ? 14 : 26);
            fx().anillo(r, tono);
            if (grado === 'nivel') {
                setTimeout(function () {
                    fx().estallido(c.x, c.y, '#51cf66', 22);
                }, 190);
            }
            if (grado === 'final') {
                fx().celebracion(rectUtil(doc.getElementById('escena-wrap')));
            }
        },

        /** La escena del reto entra escalonada en vez de aparecer de golpe. */
        entrada: function (tablero) {
            if (!activo || !tablero) return;
            if (fx()) fx().preparar();
            var piezas = lista(tablero.querySelectorAll(
                '.sendero-ramal, .atrapa-carril, .parejas-puesto, .estante-hueco, .estante-ancla, .estante-pieza'
            ));
            piezas.forEach(function (p, i) {
                detener(p);
                gsap.fromTo(p,
                    { y: 26, opacity: 0, scale: 0.88 },
                    {
                        y: 0,
                        opacity: 1,
                        scale: 1,
                        duration: 0.5,
                        delay: i * 0.07,
                        ease: 'back.out(1.7)',
                        clearProps: 'transform,opacity'
                    });
            });
        },

        /** La escena sale antes de dar paso a la ronda siguiente. */
        salida: function (tablero) {
            if (!activo || !tablero) return Promise.resolve();
            var piezas = lista(tablero.querySelectorAll(
                '.sendero-ramal, .atrapa-carril, .parejas-puesto, .estante-hueco, .estante-ancla, .estante-pieza'
            ));
            if (!piezas.length) return Promise.resolve();
            return new Promise(function (resolve) {
                gsap.to(piezas, {
                    y: -18,
                    opacity: 0,
                    scale: 0.9,
                    duration: 0.26,
                    stagger: 0.04,
                    ease: 'power2.in',
                    onComplete: resolve
                });
                setTimeout(resolve, 650);
            });
        }
    };

    global.LateralidadAnim = LateralidadAnim;
})(window);
