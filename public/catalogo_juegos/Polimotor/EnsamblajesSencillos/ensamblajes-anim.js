/**
 * ensamblajes-anim.js — Capa de animación de "Ensamblajes sencillos" (robot por piezas).
 *
 *   GSAP 3   → piezas de la bandeja, cuenta regresiva, encaje, errores, zoom y HUD.
 *   Phaser 4 → partículas compartidas (../../shared/pednia-fx.js → PedniaFx).
 *
 * SOLO VISUAL. Este módulo no decide aciertos, no cambia estado del juego y no mueve
 * piezas del tablero:
 *   - Las partes del robot (.svg-parte) y #figura-svg se ubican con `transform`
 *     (script.js → armarSiluetaSvg). Aquí NUNCA se anima su transform.
 *   - OJO, distinto del Rompecabezas: la capa de color de cada parte lleva un ATRIBUTO
 *     `transform="translate(…)"` (alinearCapaColorAGris la centra sobre la gris). GSAP,
 *     al limpiar cualquier transform de un elemento SVG (clearProps 'all', 'transform',
 *     scale…), BORRA ese atributo y la pieza se correría. Por eso en las capas SVG
 *     (.svg-parte-color / .svg-parte-gris) solo se animan `opacity` y `filter`, y solo
 *     se limpian esas dos propiedades.
 *   - Antes de medir el solape de una pieza arrastrada se neutraliza su transform
 *     (neutralizar), así el cálculo de acierto es idéntico al de siempre.
 *   - #lienzo se mide (tamaño de fichas, solape): su animación de entrada termina mucho
 *     antes de que se arme el tablero y, además, se asienta antes de cada medición.
 * Si GSAP no está disponible, `activo` es false y script.js usa su comportamiento original.
 *
 * Trampas de GSAP 3.15 evitadas (ver memoria del proyecto): sin `stagger` (un tween por
 * elemento con delay), killTweensOf elemento por elemento, y limpieza en onComplete
 * cuando hay `keyframes` o `yoyo`. Sin Math.random (el juego lo usa): generador propio.
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Con "reducir movimiento" del sistema se deja el juego exactamente como antes.
    var activo = !!gsap && !reducido;

    if (activo && doc.body) doc.body.classList.add('gsap-anim');

    // Las animaciones siguen el reloj real: en un equipo lento "saltan" fotogramas pero
    // terminan a tiempo, en sincronía con los tiempos de la lógica (setTimeout del juego).
    if (activo) gsap.ticker.lagSmoothing(0);

    // Generador propio (no consume Math.random, que el juego usa para elegir cuerpo y voz).
    var semilla = 20261029;
    function azar(min, max) {
        semilla = (semilla * 1664525 + 1013904223) >>> 0;
        return min + (semilla / 4294967296) * (max - min);
    }

    // Propiedades que se pueden limpiar en las capas SVG sin tocar su atributo transform.
    var PROPS_SVG = 'opacity,filter';

    function animar() { return activo && !reducido; }

    function fx() {
        var F = global.PedniaFx;
        return (F && F.activo) ? F : null;
    }

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function rectUtil(el) {
        if (!el || !el.getBoundingClientRect) return null;
        var r = el.getBoundingClientRect();
        return (r.width > 1 && r.height > 1) ? r : null;
    }

    // Rect visible del destino: capa de color de la parte SVG, o la zona en modo imagen.
    function rectDestino(destino) {
        if (!destino) return null;
        if (destino.classList && destino.classList.contains('svg-parte')) {
            return rectUtil(destino.querySelector('.svg-parte-color')) || rectUtil(destino);
        }
        return rectUtil(destino);
    }

    function destinoPorId(id) {
        return doc.querySelector('#figura-svg .svg-parte[data-id="' + id + '"]')
            || doc.querySelector('.zona-drop[data-id="' + id + '"]');
    }

    function hayFichasEnBandeja() {
        return !!doc.querySelector('#bandeja .pieza');
    }

    // Escalonado con un tween INDIVIDUAL por elemento (delay propio) en vez de `stagger`.
    // desdeCentro: el retardo crece desde el elemento central hacia los extremos.
    function escalonar(elems, cada, desdeCentro, crear) {
        var lista = Array.prototype.slice.call(elems || []);
        var mitad = (lista.length - 1) / 2;
        lista.forEach(function (el, i) {
            crear(el, (desdeCentro ? Math.abs(i - mitad) : i) * cada);
        });
    }

    // Detiene animaciones y quita SOLO las propiedades indicadas, elemento por elemento.
    function limpiar(targets, props) {
        if (!activo || !targets) return;
        var lista = (targets.length !== undefined && !targets.nodeType)
            ? Array.prototype.slice.call(targets)
            : [targets];
        lista.forEach(function (el) {
            if (!el) return;
            gsap.killTweensOf(el);
            gsap.set(el, { clearProps: props });
        });
    }

    function detener(elems) {
        (elems || []).forEach(function (el) { if (el) gsap.killTweensOf(el); });
    }

    // La lógica mide la figura (tamaño de fichas, solape al soltar). Antes de eso nada
    // puede quedar a medio animar, aunque el navegador vaya lento.
    function asentarGeometria() {
        if (!activo) return;
        limpiar(doc.getElementById('lienzo'), 'transform,opacity');
        limpiar(doc.querySelectorAll(
            '#figura-svg .svg-parte:not(.colocada) .svg-parte-color,' +
            '#figura-svg .svg-parte:not(.colocada) .svg-parte-gris'
        ), PROPS_SVG);
    }

    // ------------------------------------------------------------------
    //  API pública (la llama script.js en puntos solo visuales)
    // ------------------------------------------------------------------
    var vuelos = {};       // id de pieza cuyo fantasma ya vuela al destino
    var ultimoProgreso = null;

    var EnsamblajesAnim = {
        activo: activo,

        // Arranca la capa de partículas en segundo plano (al armar el tablero).
        preparar: function () {
            asentarGeometria();
            var f = fx();
            if (f) f.preparar();
        },

        // Aparición del robot al empezar (la opacidad va aparte para que no rebote).
        revelarLienzo: function () {
            if (!animar()) return;
            var lienzo = doc.getElementById('lienzo');
            if (!lienzo) return;
            limpiar(lienzo, 'transform,opacity');
            gsap.fromTo(lienzo, { y: 26, scale: 0.92 }, {
                y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.5)', clearProps: 'transform'
            });
            gsap.fromTo(lienzo, { opacity: 0 }, {
                opacity: 1, duration: 0.4, ease: 'power1.out', clearProps: 'opacity'
            });
        },

        // Partes a color: se "encienden" una a una desde el centro (opacidad + brillo; sin
        // transform, ver cabecera). Con fichas ya en la bandeja (ver de nuevo) solo opacidad.
        mostrarColor: function () {
            if (!animar()) return;
            var capas = doc.querySelectorAll('#figura-svg .svg-parte:not(.colocada) .svg-parte-color');
            if (!capas.length) return;
            limpiar(capas, PROPS_SVG);
            if (hayFichasEnBandeja()) {
                escalonar(capas, 0.05, false, function (capa, delay) {
                    gsap.fromTo(capa, { opacity: 0 }, {
                        opacity: 1, duration: 0.35, delay: delay, ease: 'power1.out', clearProps: 'opacity'
                    });
                });
                return;
            }
            escalonar(capas, 0.09, true, function (capa, delay) {
                gsap.fromTo(capa, { opacity: 0 }, {
                    opacity: 1, duration: 0.35, delay: delay, ease: 'power1.out', clearProps: 'opacity'
                });
                gsap.fromTo(capa, { filter: 'brightness(1.9)' }, {
                    filter: 'brightness(1)', duration: 0.6, delay: delay, ease: 'power2.out', clearProps: 'filter'
                });
            });
        },

        // Vuelve la silueta. Primero se asienta la geometría (la lógica medirá enseguida)
        // y luego solo se anima la opacidad de la capa gris (el brillo de pista usa filter).
        mostrarSombra: function () {
            if (!animar()) return;
            asentarGeometria();
            escalonar(doc.querySelectorAll('#figura-svg .svg-parte.sombra .svg-parte-gris'), 0.05, false, function (capa, delay) {
                gsap.fromTo(capa, { opacity: 0 }, {
                    opacity: 1, duration: 0.4, delay: delay, ease: 'power1.out', clearProps: 'opacity'
                });
            });
        },

        // Cuenta regresiva: la etiqueta entra al inicio; cada número "salta".
        cuentaEtiqueta: function (cuenta) {
            if (!animar() || !cuenta) return;
            var lbl = cuenta.querySelector('.cuenta-label');
            if (!lbl) return;
            gsap.fromTo(lbl, { y: -24, opacity: 0, scale: 0.9 }, {
                y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', clearProps: 'opacity,transform'
            });
        },

        cuentaTick: function (cuenta) {
            if (!animar() || !cuenta) return;
            var num = cuenta.querySelector('strong');
            if (!num) return;
            gsap.fromTo(num, { scale: 2.6, opacity: 0, rotation: -22, y: -18 }, {
                scale: 1, opacity: 1, rotation: 0, y: 0, duration: 0.55, ease: 'back.out(2.4)'
            });
        },

        // Fichas nuevas en la bandeja: caen con rebote, una tras otra.
        entradaFichas: function (fichas) {
            fichas = Array.prototype.slice.call(fichas || []);
            fichas.forEach(function (f) {
                f.classList.add('pieza-visible');
                f.classList.remove('pieza-entrada');
            });
            if (!animar() || !fichas.length) return;
            escalonar(fichas, 0.09, false, function (ficha, delay) {
                gsap.fromTo(ficha, { y: 46, scale: 0.5, rotation: azar(-16, 16) }, {
                    y: 0, scale: 1, rotation: 0, duration: 0.62, delay: delay, ease: 'back.out(1.8)', clearProps: 'transform'
                });
                gsap.fromTo(ficha, { opacity: 0 }, {
                    opacity: 1, duration: 0.3, delay: delay, ease: 'power1.out', clearProps: 'opacity'
                });
            });
        },

        // La demo del tutorial controla la ficha con su propio transform.
        liberar: function (el) {
            if (!activo || !el) return;
            gsap.killTweensOf(el);
            gsap.set(el, { clearProps: 'opacity,transform' });
        },

        // Selección en modo toque.
        seleccion: function (el) {
            if (!animar() || !el) return;
            gsap.killTweensOf(el);
            gsap.fromTo(el, { scale: 0.92 }, {
                scale: 1.04, duration: 0.35, ease: 'back.out(3)', clearProps: 'transform'
            });
        },

        // Inicio del arrastre: la pieza "se levanta". El fantasma es un clon de la ficha:
        // se le quita cualquier transform/opacidad que la ficha tuviera a medio animar.
        fantasmaInicio: function (f, ficha) {
            if (!activo || !f) return;
            if (ficha) {
                gsap.killTweensOf(ficha);
                gsap.set(ficha, { clearProps: 'opacity,transform' });
            }
            gsap.set(f, { clearProps: 'opacity,transform' });
            if (reducido) return;
            gsap.fromTo(f, { scale: 1 }, { scale: 1.1, duration: 0.18, ease: 'power2.out' });
            f.__rotar = gsap.quickTo(f, 'rotation', { duration: 0.35, ease: 'power3.out' });
            f.__ultX = null;
        },

        // Durante el arrastre: leve inclinación según la velocidad horizontal.
        fantasmaMover: function (f, x) {
            if (!animar() || !f || !f.__rotar) return;
            if (f.__ultX !== null) {
                var dx = x - f.__ultX;
                f.__rotar(Math.max(-14, Math.min(14, dx * 0.9)));
            }
            f.__ultX = x;
            if (f.__calma) f.__calma.kill();
            f.__calma = gsap.delayedCall(0.12, function () { if (f.__rotar) f.__rotar(0); });
        },

        // Antes de medir el solape: geometría original (sin escala ni giro).
        neutralizar: function (f) {
            if (!activo || !f) return;
            gsap.killTweensOf(f);
            if (f.__calma) f.__calma.kill();
            f.__rotar = null;
            gsap.set(f, { clearProps: 'transform' });
        },

        // Al soltar: el fantasma vuela al hueco correcto o regresa a la bandeja.
        // `f` ya no es el fantasma del juego (script.js lo soltó); aquí solo se anima y se borra.
        soltarFantasma: function (f, destino, origen) {
            if (!f) return;
            if (!animar()) { f.remove(); return; }
            gsap.killTweensOf(f);
            if (f.__calma) f.__calma.kill();
            var r0 = f.getBoundingClientRect();
            var idOrigen = origen && origen.dataset ? origen.dataset.id : null;

            if (destino) {
                var rd = rectDestino(destino);
                if (!rd) { f.remove(); return; }
                if (idOrigen) vuelos[idOrigen] = true;
                var esc = Math.max(0.5, Math.min(1.4, Math.min(rd.width / r0.width, rd.height / r0.height)));
                gsap.timeline({
                    onComplete: function () {
                        f.remove();
                        if (idOrigen) delete vuelos[idOrigen];
                    }
                })
                    .to(f, {
                        left: rd.left + rd.width / 2 - r0.width / 2,
                        top: rd.top + rd.height / 2 - r0.height / 2,
                        scale: esc,
                        rotation: 0,
                        duration: 0.24,
                        ease: 'power3.in'
                    })
                    .to(f, { opacity: 0, duration: 0.1 });
                return;
            }

            // Regreso a la bandeja.
            var ro = origen && origen.isConnected ? rectUtil(origen) : null;
            if (!ro) {
                gsap.to(f, { opacity: 0, scale: 0.6, duration: 0.2, onComplete: function () { f.remove(); } });
                return;
            }
            gsap.set(origen, { opacity: 0.35 });
            origen.__regresoHasta = Date.now() + 320;
            gsap.timeline({
                onComplete: function () {
                    f.remove();
                    if (origen.isConnected) gsap.to(origen, { opacity: 1, duration: 0.12, clearProps: 'opacity' });
                }
            })
                .to(f, {
                    left: ro.left + (ro.width - r0.width) / 2,
                    top: ro.top + (ro.height - r0.height) / 2,
                    rotation: 0,
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.inOut'
                });
        },

        // La ficha sale de la bandeja (script.js la borra a los 300 ms).
        // En modo toque no hubo fantasma: un clon vuela hasta el hueco.
        salidaFicha: function (ficha) {
            if (!animar() || !ficha) return;
            var id = ficha.dataset ? ficha.dataset.id : null;
            gsap.killTweensOf(ficha);
            if (id && !vuelos[id]) {
                var rf = rectUtil(ficha);
                var rd = rectDestino(destinoPorId(id));
                if (rf && rd) {
                    var clon = ficha.cloneNode(true);
                    clon.className = 'pieza-fantasma';
                    clon.style.left = rf.left + 'px';
                    clon.style.top = rf.top + 'px';
                    clon.style.width = rf.width + 'px';
                    clon.style.height = rf.height + 'px';
                    clon.style.transform = '';
                    clon.style.opacity = '';
                    doc.body.appendChild(clon);
                    gsap.set(ficha, { opacity: 0 });
                    var esc = Math.max(0.5, Math.min(1.4, Math.min(rd.width / rf.width, rd.height / rf.height)));
                    gsap.timeline({ onComplete: function () { clon.remove(); } })
                        .to(clon, {
                            left: rd.left + rd.width / 2 - rf.width / 2,
                            top: rd.top + rd.height / 2 - rf.height / 2,
                            scale: esc,
                            duration: 0.26,
                            ease: 'power3.inOut'
                        })
                        .to(clon, { opacity: 0, duration: 0.1 });
                    return;
                }
            }
            gsap.to(ficha, {
                opacity: 0,
                scale: 0.35,
                rotation: azar(-25, 25),
                duration: 0.26,
                ease: 'back.in(1.6)'
            });
        },

        // Encaje correcto: destello en la parte + anillo + estrellas.
        // En la capa SVG solo `filter` (su atributo transform la alinea, ver cabecera).
        encaje: function (id, color) {
            var parte = doc.querySelector('#figura-svg .svg-parte[data-id="' + id + '"]');
            var capa = parte
                ? parte.querySelector('.svg-parte-color')
                : doc.querySelector('#piezas-colocadas .pieza-colocada:last-child');
            var tono = color || '#ffd54f';
            var rect = rectUtil(capa) || rectUtil(parte);

            if (capa && activo) {
                if (parte) {
                    limpiar(capa, PROPS_SVG);
                    if (animar()) {
                        gsap.fromTo(capa, {
                            filter: 'brightness(1.9) drop-shadow(0px 0px 16px rgba(255,213,79,0.95))'
                        }, {
                            filter: 'brightness(1) drop-shadow(0px 0px 0px rgba(255,213,79,0))',
                            duration: 0.7,
                            ease: 'power2.out',
                            clearProps: 'filter'
                        });
                    }
                } else {
                    // Modo imagen: .pieza-colocada es un div con left/top/width/height propios.
                    limpiar(capa, 'transform,filter');
                    if (animar()) {
                        gsap.fromTo(capa, { scale: 1.28, filter: 'brightness(1.7)' }, {
                            scale: 1, filter: 'brightness(1)', duration: 0.6,
                            ease: 'elastic.out(1, 0.55)', clearProps: 'transform,filter'
                        });
                    }
                }
            }
            var f = fx();
            if (rect && f) {
                var c = centro(rect);
                f.anillo(rect, tono);
                f.estallido(c.x, c.y, tono, 16);
            }
        },

        // Error: la ficha tiembla con un destello rojo (tras volver, si venía volando).
        error: function (el) {
            if (!el || !animar()) return;
            var espera = Math.max(0, (el.__regresoHasta || 0) - Date.now()) / 1000;
            // Se mata la animación de error anterior por referencia (puede estar aún en su
            // retardo) y se limpia lo que dejó, porque su onComplete ya no se ejecutará.
            if (el.__errorTl) {
                el.__errorTl.kill();
                el.__errorTl = null;
                gsap.set(el, { clearProps: 'transform,boxShadow' });
            }
            // GSAP no aplica clearProps a tweens con `keyframes` ni a los que terminan
            // con `yoyo` en su valor inicial → se limpia al completar la línea de tiempo.
            el.__errorTl = gsap.timeline({
                delay: espera,
                onComplete: function () {
                    el.__errorTl = null;
                    gsap.set(el, { clearProps: 'transform,boxShadow' });
                }
            })
                .to(el, {
                    keyframes: { x: [-14, 13, -9, 7, -3, 0] },
                    duration: 0.5,
                    ease: 'none'
                }, 0)
                .fromTo(el, { boxShadow: '0 0 0 0 rgba(229,57,53,0)' }, {
                    boxShadow: '0 0 0 6px rgba(229,57,53,0.85)',
                    duration: 0.16,
                    yoyo: true,
                    repeat: 3
                }, 0);
        },

        // Contador del HUD: salta cuando aumenta.
        progreso: function (el, hechas) {
            if (!el) return;
            var prev = ultimoProgreso;
            ultimoProgreso = hechas;
            if (!animar() || el.hidden || prev === null || hechas <= prev) return;
            gsap.fromTo(el, { scale: 1.45 }, {
                scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
            var ic = el.querySelector('i');
            if (ic) gsap.fromTo(ic, { rotation: 0 }, { rotation: 360, duration: 0.5, ease: 'power2.out', clearProps: 'transform' });
        },

        reiniciarProgreso: function () { ultimoProgreso = null; },

        zoomAbrir: function (overlay) {
            if (!animar() || !overlay) return;
            var inner = overlay.querySelector('.pieza-zoom-inner');
            detener([overlay, inner]);
            gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, clearProps: 'opacity' });
            if (inner) {
                gsap.fromTo(inner, { scale: 0.45, rotation: -8, opacity: 0 }, {
                    scale: 1, rotation: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.9)', clearProps: 'transform,opacity'
                });
            }
        },

        // Devuelve true si se encarga de ocultar el zoom al terminar la animación.
        zoomCerrar: function (overlay) {
            if (!animar() || !overlay || overlay.hidden) return false;
            var inner = overlay.querySelector('.pieza-zoom-inner');
            detener([overlay, inner]);
            gsap.to(inner || overlay, { scale: 0.6, opacity: 0, duration: 0.18, ease: 'power2.in' });
            gsap.to(overlay, {
                opacity: 0,
                duration: 0.2,
                onComplete: function () {
                    overlay.hidden = true;
                    gsap.set(inner ? [overlay, inner] : [overlay], { clearProps: 'opacity,transform' });
                }
            });
            return true;
        },

        // Robot completo: salto de alegría + confeti (dentro de los 400 ms previos al final).
        celebrar: function () {
            var lienzo = doc.getElementById('lienzo');
            var rect = rectUtil(lienzo);
            if (animar() && lienzo) {
                // yoyo termina en el valor inicial: GSAP no aplica clearProps → onComplete.
                gsap.fromTo(lienzo, { scale: 1 }, {
                    scale: 1.07, duration: 0.17, yoyo: true, repeat: 1, ease: 'power2.out',
                    onComplete: function () { gsap.set(lienzo, { clearProps: 'transform' }); }
                });
            }
            var f = fx();
            if (f) f.celebracion(rect);
        }
    };

    global.EnsamblajesAnim = EnsamblajesAnim;
})(window);
