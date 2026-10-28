/**
 * secuencia-anim.js — Capa de animación de "Secuencia de movimiento" (GSAP 3).
 * Las partículas (Phaser 4) vienen de ../../shared/pednia-fx.js (PedniaFx).
 *
 * SOLO VISUAL. La lógica del juego vive en script.js y no se toca:
 *   - La lógica MIDE con getBoundingClientRect la imagen de la tarjeta elegida y el
 *     hueco "?" (moverTarjetaAlHueco) y la mano del tutorial mide la tarjeta.
 *       · Tarjetas: GSAP reemplaza la entrada CSS (opcionEntra) con el MISMO tiempo
 *         (0,42 s + 70 ms por tarjeta) y limpia el transform al terminar, antes de que
 *         la mano del tutorial (700 ms) o la lógica midan. El rechazo sigue en CSS.
 *       · Hueco: nunca se le pone transform mientras espera la carta (el CSS ya pulsa);
 *         solo se sacude tras un error, cuando la lógica ya no lo va a medir.
 *   - La tarjeta que vuela (.tarjeta-vuelo) la mueve la lógica con una transición CSS:
 *     no se toca.
 *   - Las poses del riel se animan por su <img> interior (el slot lo escala el CSS).
 *   - El <video> de presentación no se toca.
 *
 * Trampas de GSAP evitadas (ver memoria del proyecto):
 *   - Sin `stagger`; un tween por elemento con `delay` y killTweensOf elemento por elemento.
 *   - `clearProps` no se aplica con `keyframes` ni `yoyo` que termina en el inicio →
 *     se limpia en onComplete.
 *   - Sin Math.random (el juego baraja las opciones con él).
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var activo = !!gsap && !reducido;
    var Fx = global.PedniaFx || null;
    var PALETA = ['#ffd54f', '#4fc3f7', '#81c784', '#ff7043', '#ba68c8', '#ffffff'];

    if (activo) {
        doc.body.classList.add('gsap-anim');
        // Reloj real: si el equipo va lento, las animaciones saltan cuadros pero terminan
        // a tiempo, en sincronía con los setTimeout del juego.
        gsap.ticker.lagSmoothing(0);
    }

    function fx() { return (Fx && Fx.activo) ? Fx : null; }

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function rectUtil(el) {
        if (!el || !el.getBoundingClientRect) return null;
        var r = el.getBoundingClientRect();
        return (r.width > 1 && r.height > 1) ? r : null;
    }

    // Detiene los tweens de un elemento y borra lo que dejaron (uno por uno: ver cabecera).
    function detener(el, props) {
        if (!el) return;
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: props || 'transform,opacity,filter' });
    }

    // Mientras GSAP mueve un elemento con `transition: transform` en CSS, la transición
    // lo haría temblar: la clase sec-gsap la apaga solo durante la animación.
    function sinTransicion(el, si) {
        if (el) el.classList.toggle('sec-gsap', !!si);
    }

    var ultimoProgreso = null;
    var ultimoTitulo = null;

    var SecuenciaAnim = {
        activo: activo,

        // Arranca la capa de partículas en segundo plano (el primer acierto no espera).
        preparar: function () {
            if (fx()) fx().preparar();
        },

        // Tarjetas de respuesta: entran saltando, con el mismo tiempo que la entrada CSS.
        entradaOpciones: function (ops) {
            if (!activo || !ops) return;
            var tarjetas = ops.querySelectorAll('.tarjeta-opcion');
            Array.prototype.forEach.call(tarjetas, function (btn, i) {
                detener(btn, 'transform,opacity');
                sinTransicion(btn, true);
                gsap.fromTo(btn, { opacity: 0, y: 22, scale: 0.7 }, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.42,
                    delay: i * 0.07,
                    ease: 'back.out(1.8)',
                    onComplete: function () {
                        gsap.set(btn, { clearProps: 'transform,opacity' });
                        sinTransicion(btn, false);
                    }
                });
            });
        },

        // Tarjeta elegida (también la de la demostración): anillo de "¡la tengo!".
        elegir: function (btn) {
            var r = rectUtil(btn);
            if (r && fx()) fx().anillo(r, '#7ec8ff');
        },

        // La carta llegó al hueco: la pose nueva aparece con un pequeño rebote.
        encajar: function (hueco) {
            if (!hueco) return;
            var r = rectUtil(hueco);
            if (r && fx()) fx().anillo(r, '#ffd54f');
            if (!activo) return;
            var img = hueco.querySelector('img');
            if (!img) return;
            detener(img, 'transform,opacity');
            gsap.fromTo(img, { scale: 0.6, opacity: 0.4 }, {
                scale: 1,
                opacity: 1,
                duration: 0.4,
                ease: 'back.out(2.2)',
                clearProps: 'transform,opacity'
            });
        },

        // Paso de la secuencia que se está nombrando: la pose da un saltito.
        pasoActivo: function (slot) {
            if (!activo || !slot) return;
            var img = slot.querySelector('img');
            if (!img) return;
            detener(img, 'transform');
            // yoyo termina en el inicio: GSAP no aplica clearProps → se limpia en onComplete.
            gsap.fromTo(img, { y: 0 }, {
                y: -10,
                duration: 0.18,
                yoyo: true,
                repeat: 1,
                ease: 'power2.out',
                onComplete: function () { gsap.set(img, { clearProps: 'transform' }); }
            });
        },

        // Secuencia completa y correcta: estrellas sobre cada pose y anillo en la última.
        acierto: function () {
            if (!fx()) return;
            var slots = doc.querySelectorAll('#riel .slot-pose');
            // Rectángulos medidos ahora: el riel se vacía al pasar al siguiente reto.
            var rects = Array.prototype.map.call(slots, rectUtil);
            rects.forEach(function (r, i) {
                if (!r) return;
                var c = centro(r);
                var ultima = i === rects.length - 1;
                var lanzar = function () {
                    if (!fx()) return;
                    fx().estallido(c.x, c.y, PALETA[i % PALETA.length], ultima ? 18 : 8);
                    if (ultima) fx().anillo(r, '#ffd54f');
                };
                // Un temporizador por pose (sin stagger).
                if (activo) gsap.delayedCall(i * 0.08, lanzar);
                else lanzar();
            });
        },

        // Error: destello rojo en la tarjeta (su sacudida sigue en CSS: .rechazo) y el hueco
        // "?" tiembla suave.
        error: function (btn) {
            if (!activo) return;
            var img = btn ? btn.querySelector('img') : null;
            if (img) {
                detener(img, 'filter');
                gsap.fromTo(img, { filter: 'drop-shadow(0 0 0px rgba(229,57,53,0))' }, {
                    filter: 'drop-shadow(0 0 10px rgba(229,57,53,0.95))',
                    duration: 0.14,
                    yoyo: true,
                    repeat: 3,
                    ease: 'power1.inOut',
                    onComplete: function () { gsap.set(img, { clearProps: 'filter' }); }
                });
            }
            var hueco = doc.querySelector('#riel .slot-pose.hueco');
            if (hueco && !hueco.classList.contains('espera-carta')) {
                detener(hueco, 'transform');
                sinTransicion(hueco, true);
                // keyframes: GSAP no aplica clearProps → se limpia en onComplete.
                gsap.to(hueco, {
                    keyframes: { x: [-8, 7, -5, 3, 0] },
                    duration: 0.45,
                    ease: 'none',
                    onComplete: function () {
                        gsap.set(hueco, { clearProps: 'transform' });
                        sinTransicion(hueco, false);
                    }
                });
            }
        },

        // Título del enunciado: "pop" cuando cambia su texto.
        enunciado: function (titulo) {
            if (!titulo) return;
            var txt = String(titulo.textContent || '');
            var prev = ultimoTitulo;
            ultimoTitulo = txt;
            if (!activo || prev === null || prev === txt) return;
            detener(titulo, 'transform');
            gsap.fromTo(titulo, { scale: 0.85 }, {
                scale: 1, duration: 0.45, ease: 'back.out(2.2)', clearProps: 'transform'
            });
        },

        // Contador del HUD: salta cuando avanza.
        progreso: function (el) {
            if (!el) return;
            var txt = String(el.textContent || '').replace(/\s+/g, '');
            var prev = ultimoProgreso;
            ultimoProgreso = txt;
            if (!activo || el.hidden || prev === null || prev === txt) return;
            detener(el, 'transform');
            gsap.fromTo(el, { scale: 1.45 }, {
                scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
        },

        // Fin del juego: confeti + ráfagas sobre el riel (antes de la pantalla final).
        celebrar: function () {
            var rect = rectUtil(doc.getElementById('riel')) || rectUtil(doc.getElementById('escena-wrap'));
            if (fx()) fx().celebracion(rect);
        }
    };

    global.SecuenciaAnim = SecuenciaAnim;
})(window);
