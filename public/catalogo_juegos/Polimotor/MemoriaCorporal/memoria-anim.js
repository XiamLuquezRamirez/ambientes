/**
 * memoria-anim.js — Capa de animación de "Memoria corporal" (GSAP 3).
 * Las partículas (Phaser 4) vienen de ../../shared/pednia-fx.js (PedniaFx).
 *
 * SOLO VISUAL. La lógica del juego vive en script.js y no se toca:
 *   - Los contenedores #secuencia, #opciones, #cuenta y .memoria-bloque NO se animan:
 *     usan clases propias (secuencia-entra/-sube/-sale, opcion-sale, fase-memoria) con
 *     tiempos que la lógica espera con setTimeout.
 *   - Las clases de estado (opcion-ok, opcion-error, opcion-tenue, paso-acierto,
 *     data-ok) no se tocan; aquí solo se animan transform/opacity/filter/colores en
 *     línea y se limpian (clearProps) al terminar.
 *   - #secuencia tiene overflow-x:auto: dentro de ella nada crece por encima de su
 *     tamaño (scale ≤ 1, sin desplazamientos) para no provocar barras de scroll; el
 *     brillo del hueco se hace con colores (una sombra quedaría recortada).
 *   - La entrada de las opciones dura lo mismo que la animación CSS original
 *     (retardo i·140 ms): termina antes de que la lógica acepte respuestas.
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
        // Reloj real: las animaciones terminan a tiempo, en sincronía con los
        // setTimeout/sleep del juego aunque el equipo vaya lento.
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
        if (el.__memTl) {
            el.__memTl.kill();
            el.__memTl = null;
        }
        gsap.killTweensOf(el);
    }

    // Marca ✓ / ✗ que la lógica acaba de poner en la opción: aparece girando.
    function popMarca(btn) {
        var circ = btn && btn.querySelector('.opcion-marca-circulo');
        if (!circ) return;
        gsap.killTweensOf(circ);
        gsap.fromTo(circ, { scale: 0, rotation: -120 }, {
            scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2.6)', clearProps: 'transform'
        });
    }

    var ultimoProgreso = null;

    var MemoriaAnim = {
        activo: activo,

        // Secuencia a memorizar: cada tarjeta aparece una tras otra (solo scale ≤ 1 y opacidad).
        secuencia: function (caja) {
            if (!activo || !caja) return;
            if (fx()) fx().preparar();
            var pasos = lista(caja.querySelectorAll('.paso-mov'));
            pasos.forEach(function (p, i) {
                detener(p);
                gsap.fromTo(p, { scale: 0.55, opacity: 0, rotation: azar(-8, 8) }, {
                    scale: 1,
                    opacity: 1,
                    rotation: 0,
                    duration: 0.45,
                    delay: 0.12 + i * 0.16,
                    ease: 'power3.out',
                    clearProps: 'transform,opacity'
                });
            });
            lista(caja.querySelectorAll('.paso-flecha')).forEach(function (f, i) {
                gsap.killTweensOf(f);
                gsap.fromTo(f, { opacity: 0 }, {
                    opacity: 1, duration: 0.3, delay: 0.24 + i * 0.16, ease: 'power1.out', clearProps: 'opacity'
                });
            });
        },

        // Pista con hueco: el "?" aparece y el hueco parpadea en amarillo.
        pista: function (caja) {
            if (!activo || !caja) return;
            var hueco = caja.querySelector('.paso-hueco');
            if (!hueco) return;
            var marca = hueco.querySelector('.paso-hueco-marca');
            detener(hueco);
            if (marca) {
                gsap.killTweensOf(marca);
                gsap.fromTo(marca, { scale: 0.3, rotation: -40, opacity: 0 }, {
                    scale: 1, rotation: 0, opacity: 1, duration: 0.5, delay: 0.25, ease: 'power3.out',
                    clearProps: 'transform,opacity'
                });
            }
            // yoyo termina en el valor inicial: GSAP no aplica clearProps → onComplete.
            hueco.__memTl = gsap.timeline({
                delay: 0.45,
                onComplete: function () {
                    hueco.__memTl = null;
                    gsap.set(hueco, { clearProps: 'borderColor,backgroundColor' });
                }
            }).fromTo(hueco, { borderColor: '#c4b4e0', backgroundColor: 'rgba(255,255,255,0.78)' }, {
                borderColor: '#ffb300',
                backgroundColor: 'rgba(255,236,170,0.95)',
                duration: 0.32,
                yoyo: true,
                repeat: 3,
                ease: 'sine.inOut'
            });
        },

        // Opciones: entran con rebote, mismo retardo que la animación CSS (i·140 ms).
        entradaOpciones: function (caja) {
            if (!activo || !caja) return;
            lista(caja.querySelectorAll('.opcion-seq')).forEach(function (b, i) {
                detener(b);
                gsap.fromTo(b, { y: 24, scale: 0.7, opacity: 0, rotation: azar(-9, 9) }, {
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    rotation: 0,
                    duration: 0.5,
                    delay: i * 0.14,
                    ease: 'back.out(1.9)',
                    clearProps: 'transform,opacity'
                });
            });
        },

        // Acierto: la opción late, aparece la marca ✓, estrellas y anillo; en la
        // secuencia revelada brilla el movimiento que faltaba.
        acierto: function (btn, pasoAcierto) {
            if (!activo || !btn) return;
            detener(btn);
            gsap.set(btn, { clearProps: 'transform,opacity' });
            // yoyo termina en el valor inicial: GSAP no aplica clearProps → onComplete.
            btn.__memTl = gsap.timeline({
                onComplete: function () {
                    btn.__memTl = null;
                    gsap.set(btn, { clearProps: 'transform' });
                }
            }).fromTo(btn, { scale: 1 }, {
                scale: 1.08, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.out'
            });
            popMarca(btn);
            var r = rectUtil(btn);
            if (r && fx()) {
                var c = centro(r);
                fx().estallido(c.x, c.y, '#81c784', 18);
                fx().anillo(r, '#81c784');
            }
            if (pasoAcierto) {
                gsap.killTweensOf(pasoAcierto);
                gsap.fromTo(pasoAcierto, { scale: 0.6, opacity: 0.2, filter: 'brightness(1.5)' }, {
                    scale: 1, opacity: 1, filter: 'brightness(1)', duration: 0.5, delay: 0.1, ease: 'power3.out',
                    onComplete: function () { gsap.set(pasoAcierto, { clearProps: 'transform,opacity,filter' }); }
                });
                var rp = rectUtil(pasoAcierto);
                if (rp && fx()) {
                    var cp = centro(rp);
                    gsap.delayedCall(0.25, function () { if (fx()) fx().estallido(cp.x, cp.y, '#ffd54f', 12); });
                }
            }
        },

        // Error: la opción tiembla y aparece la marca ✗.
        error: function (btn) {
            if (!activo || !btn) return;
            detener(btn);
            gsap.set(btn, { clearProps: 'transform,opacity' });
            // GSAP no aplica clearProps con `keyframes` → onComplete.
            btn.__memTl = gsap.timeline({
                onComplete: function () {
                    btn.__memTl = null;
                    gsap.set(btn, { clearProps: 'transform' });
                }
            }).to(btn, { keyframes: { x: [-14, 13, -9, 7, -3, 0] }, duration: 0.5, ease: 'none' });
            popMarca(btn);
        },

        // Cuenta "se esconderán en…": el rótulo cae y cada número salta.
        cuentaEtiqueta: function (cuenta) {
            if (!activo || !cuenta) return;
            var lbl = cuenta.querySelector('.cuenta-label');
            if (!lbl) return;
            gsap.fromTo(lbl, { y: -20, opacity: 0, scale: 0.9 }, {
                y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', clearProps: 'transform,opacity'
            });
        },

        cuentaTick: function (cuenta) {
            if (!activo || !cuenta) return;
            var num = cuenta.querySelector('strong');
            if (!num) return;
            gsap.fromTo(num, { scale: 2.4, opacity: 0, rotation: -20 }, {
                scale: 1, opacity: 1, rotation: 0, duration: 0.55, ease: 'back.out(2.4)', clearProps: 'transform,opacity'
            });
        },

        // Contador del HUD: salta al pasar de ronda.
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
            var ic = el.querySelector('i');
            if (ic) {
                gsap.fromTo(ic, { rotation: 0 }, { rotation: 360, duration: 0.5, ease: 'power2.out', clearProps: 'transform' });
            }
        },

        // Fin del juego: confeti y estrellas sobre el bloque del juego.
        celebrar: function () {
            if (!activo || !fx()) return;
            fx().celebracion(rectUtil(doc.querySelector('.memoria-bloque')));
        }
    };

    global.MemoriaAnim = MemoriaAnim;
})(window);
