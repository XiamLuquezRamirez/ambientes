/**
 * precision-anim.js — Capa de animación de "Juegos de precisión" (GSAP 3).
 * Las partículas (Phaser 4) vienen de ../../shared/pednia-fx.js (PedniaFx).
 *
 * SOLO VISUAL. La lógica del juego vive en script.js y no se toca:
 *   - #escena-wrap lo MIDE la lógica (refrescarStageRect → clientToFrac): nunca se
 *     anima su transform ni el de #escenario ni de las capas.
 *   - El transform de .cohete lo escribe la lógica en cada movimiento
 *     (translate(-50%,-50%) rotate(ang)): aquí solo se anima su <img> interior.
 *   - .aro no puede tener transform/filter/opacity (crearía un contexto de apilamiento
 *     y el cohete dejaría de pasar ENTRE la parte trasera y la frontal): solo se animan
 *     sus capas internas (.aro-capa), las dos con el mismo tween para que coincidan.
 *   - .meta-estrella tiene su propia animación CSS de transform: solo se anima su <img>.
 *   La posición de aros, estrella y cohete es estado (fracciones), no se mide en el DOM.
 *
 * Trampas de GSAP evitadas (ver memoria del proyecto):
 *   - Sin `stagger`; tweens de un solo objetivo (killTweensOf fiable).
 *   - `clearProps` no se aplica con `yoyo` que termina en el inicio → limpiar en onComplete.
 *   - Sin Math.random (el juego lo usa).
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

    // Sonidos que dependen del momento exacto de la animación (aparecer, regreso).
    // Los del juego (agarrar, soltar, acierto, error…) los dispara script.js.
    function snd() {
        var A = global.PedniaAudio;
        return (A && A.activo && A.tieneTema()) ? A : null;
    }

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function rectUtil(el) {
        if (!el || !el.getBoundingClientRect) return null;
        var r = el.getBoundingClientRect();
        return (r.width > 1 && r.height > 1) ? r : null;
    }

    function imgDe(el) {
        return el ? el.querySelector('img') : null;
    }

    // Color de las chispas según el aro (coloresAro del config).
    var COLORES = {
        azul: '#4fc3f7',
        amarillo: '#ffd54f',
        rosado: '#f48fb1',
        morado: '#ba68c8',
        verde: '#81c784',
        rojo: '#ef5350',
        naranja: '#ffa726'
    };

    function colorDe(nombre) {
        return COLORES[String(nombre || '').toLowerCase()] || '#ffd54f';
    }

    function limpiar(el, props) {
        if (el) gsap.set(el, { clearProps: props });
    }

    // ---------------- Cohete: pulso "tócame" y alerta ----------------

    var halo = null;        // pulso de brillo (filter, repeat infinito) en el <img> del cohete
    var haloImg = null;
    var haloDelay = null;
    var alertaOn = false;   // brillo rojo tras un fallo

    function detenerHalo() {
        if (haloDelay) { haloDelay.kill(); haloDelay = null; }
        if (halo) {
            halo.kill();
            halo = null;
            if (haloImg && !alertaOn) limpiar(haloImg, 'filter');
        }
        haloImg = null;
    }

    function invitarLuego(cohete, segundos) {
        if (haloDelay) haloDelay.kill();
        haloDelay = gsap.delayedCall(segundos, function () {
            haloDelay = null;
            PrecisionAnim.invitar(cohete);
        });
    }

    var PrecisionAnim = {
        activo: activo,

        /**
         * Ruta nueva (pintarRuta ya creó aros, estrella y cohete): los aros aparecen uno a
         * uno, la estrella gira hasta su sitio y el cohete "aterriza" en la plataforma.
         */
        nuevaRuta: function (aros, estrella, cohete, esDemo) {
            if (!activo) return;
            if (fx()) fx().preparar();
            detenerHalo();
            alertaOn = false;
            var n = (aros || []).length;
            (aros || []).forEach(function (nodo, i) {
                [nodo.back, nodo.front].forEach(function (capa) {
                    if (!capa) return;
                    gsap.killTweensOf(capa);
                    gsap.fromTo(capa, { scale: 0 }, {
                        scale: 1,
                        duration: 0.5,
                        delay: 0.12 + i * 0.1,
                        ease: 'back.out(2)',
                        onComplete: function () { limpiar(capa, 'transform'); }
                    });
                });
            });
            var imgE = imgDe(estrella);
            if (imgE) {
                gsap.killTweensOf(imgE);
                gsap.fromTo(imgE, { scale: 0, rotation: -120 }, {
                    scale: 1,
                    rotation: 0,
                    duration: 0.6,
                    delay: 0.15 + n * 0.1,
                    ease: 'back.out(1.8)',
                    onComplete: function () { limpiar(imgE, 'transform'); }
                });
            }
            var imgC = imgDe(cohete);
            if (imgC) {
                gsap.killTweensOf(imgC);
                gsap.fromTo(imgC, { scale: 0 }, {
                    scale: 1,
                    duration: 0.55,
                    delay: 0.05,
                    ease: 'back.out(2.4)'
                });
                gsap.delayedCall(0.3, function () {
                    if (snd()) snd().evento('aparece');
                });
            }
            if (!esDemo && cohete) invitarLuego(cohete, 0.9 + n * 0.1);
        },

        // Pulso de brillo "¡tócame!" en el cohete mientras el niño no lo agarra.
        invitar: function (cohete) {
            if (!activo || !cohete || !cohete.isConnected) return;
            var img = imgDe(cohete);
            if (!img) return;
            detenerHalo();
            haloImg = img;
            halo = gsap.fromTo(img, { filter: 'drop-shadow(0 0 0px rgba(255,213,79,0))' }, {
                filter: 'drop-shadow(0 0 16px rgba(255,213,79,1))',
                duration: 0.8,
                yoyo: true,
                repeat: -1,
                ease: 'sine.inOut',
                // Al redimensionar, la lógica vuelve a crear el cohete: el pulso del viejo se apaga.
                onRepeat: function () { if (!img.isConnected) detenerHalo(); }
            });
        },

        // Agarrar / soltar: el cohete se "levanta" y vuelve con rebote (solo el <img>).
        agarrar: function (cohete) {
            if (!activo || !cohete) return;
            detenerHalo();
            var img = imgDe(cohete);
            if (!img) return;
            gsap.to(img, { scale: 1.15, duration: 0.15, ease: 'back.out(3)', overwrite: 'auto' });
        },

        soltar: function (cohete) {
            if (!activo || !cohete) return;
            var img = imgDe(cohete);
            if (!img) return;
            gsap.to(img, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
        },

        // Pasó por el aro correcto: el aro late, chispas de su color y anillo.
        // Si era el último, la estrella avisa que ya está lista.
        aroPasado: function (nodo, color, esUltimo) {
            if (!activo || !nodo) return;
            var tono = colorDe(color);
            var r = rectUtil(nodo.el);
            if (r && fx()) {
                var c = centro(r);
                fx().estallido(c.x, c.y, tono, 14);
                fx().anillo(r, tono);
            }
            [nodo.back, nodo.front].forEach(function (capa) {
                if (!capa) return;
                gsap.killTweensOf(capa);
                gsap.fromTo(capa, { scale: 1.28 }, {
                    scale: 1,
                    duration: 0.55,
                    ease: 'elastic.out(1, 0.45)',
                    onComplete: function () { limpiar(capa, 'transform'); }
                });
            });
            if (esUltimo) {
                var estrella = doc.getElementById('meta-estrella');
                var img = imgDe(estrella);
                if (img) {
                    gsap.killTweensOf(img);
                    gsap.fromTo(img, { scale: 1 }, {
                        scale: 1.3,
                        duration: 0.22,
                        delay: 0.1,
                        yoyo: true,
                        repeat: 1,
                        ease: 'power2.out',
                        onComplete: function () { limpiar(img, 'transform'); }
                    });
                }
                var re = rectUtil(estrella);
                if (re && fx()) {
                    gsap.delayedCall(0.1, function () { fx().anillo(re, '#fff59d'); });
                }
            }
        },

        // Fallo (aro fuera de orden o estrella antes de tiempo): brillo rojo, temblor
        // del cohete y del enunciado. El cohete sigue donde la lógica lo dejó.
        fallo: function (cohete, enunciado) {
            if (!activo || !cohete) return;
            detenerHalo();
            var img = imgDe(cohete);
            var r = rectUtil(cohete);
            if (r && fx()) {
                var c = centro(r);
                fx().anillo({ left: c.x - 32, top: c.y - 32, width: 64, height: 64 }, '#e53935');
            }
            if (img) {
                alertaOn = true;
                gsap.to(img, { filter: 'drop-shadow(0 0 14px rgba(229,57,53,1))', duration: 0.15 });
                gsap.fromTo(img, { x: 0 }, {
                    x: -8,
                    duration: 0.06,
                    yoyo: true,
                    repeat: 5,
                    ease: 'sine.inOut',
                    onComplete: function () { gsap.set(img, { x: 0 }); }
                });
            }
            if (enunciado) {
                gsap.killTweensOf(enunciado);
                gsap.fromTo(enunciado, { x: 0 }, {
                    x: -10,
                    duration: 0.06,
                    yoyo: true,
                    repeat: 5,
                    ease: 'sine.inOut',
                    onComplete: function () { limpiar(enunciado, 'transform'); }
                });
            }
        },

        // Antes de que la lógica devuelva el cohete al inicio se guarda dónde estaba…
        antesDeRegreso: function (cohete) {
            if (!activo || !cohete) return;
            var r = rectUtil(cohete);
            cohete.__precisionDesde = r ? centro(r) : null;
        },

        // …y, ya colocado por la lógica en el inicio, su <img> vuela de vuelta desde ahí.
        regreso: function (cohete) {
            if (!activo || !cohete) return;
            var desde = cohete.__precisionDesde;
            cohete.__precisionDesde = null;
            var img = imgDe(cohete);
            var r = rectUtil(cohete);
            alertaOn = false;
            if (!img) return;
            gsap.killTweensOf(img);
            gsap.to(img, {
                filter: 'drop-shadow(0 0 0px rgba(229,57,53,0))',
                duration: 0.4,
                onComplete: function () { limpiar(img, 'filter'); }
            });
            if (!desde || !r) {
                gsap.set(img, { x: 0, y: 0, scale: 1 });
                invitarLuego(cohete, 0.5);
                return;
            }
            var ahora = centro(r);
            var dx = desde.x - ahora.x;
            var dy = desde.y - ahora.y;
            // El <img> vive dentro del cohete rotado: el desplazamiento se pasa a sus ejes.
            var ang = (Number(cohete.dataset.ang) || 0) * Math.PI / 180;
            var lx = dx * Math.cos(ang) + dy * Math.sin(ang);
            var ly = -dx * Math.sin(ang) + dy * Math.cos(ang);
            if (Math.abs(dx) + Math.abs(dy) > 4 && snd()) snd().evento('regreso');
            gsap.fromTo(img, { x: lx, y: ly }, {
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.5,
                ease: 'back.out(1.4)',
                onComplete: function () {
                    if (fx()) {
                        var rr = rectUtil(cohete);
                        if (rr) fx().anillo(rr, '#ffd54f');
                    }
                }
            });
            invitarLuego(cohete, 0.8);
        },

        // Llegó a la estrella con todos los aros: estallido, anillo y la estrella gira.
        llegada: function (estrella, cohete) {
            if (!activo) return;
            detenerHalo();
            var r = rectUtil(estrella);
            if (r && fx()) {
                var c = centro(r);
                fx().estallido(c.x, c.y, '#ffd54f', 22);
                fx().anillo(r, '#ffd54f');
            }
            var imgE = imgDe(estrella);
            if (imgE) {
                gsap.killTweensOf(imgE);
                gsap.fromTo(imgE, { scale: 1.6, rotation: -40 }, {
                    scale: 1,
                    rotation: 0,
                    duration: 0.6,
                    ease: 'elastic.out(1, 0.5)',
                    onComplete: function () { limpiar(imgE, 'transform'); }
                });
            }
            var imgC = imgDe(cohete);
            if (imgC) {
                gsap.killTweensOf(imgC, 'scale');
                gsap.fromTo(imgC, { scale: 1 }, {
                    scale: 1.2,
                    duration: 0.18,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.out',
                    onComplete: function () { gsap.set(imgC, { scale: 1 }); }
                });
            }
        },

        // Contador del HUD: salta cuando cambia la ruta.
        progreso: function (el) {
            if (!activo || !el) return;
            var txt = el.textContent;
            var prev = el.__precisionPrev;
            el.__precisionPrev = txt;
            if (prev === undefined || prev === txt || el.hidden) return;
            gsap.killTweensOf(el);
            gsap.fromTo(el, { scale: 1.4 }, {
                scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
        },

        // Fin del juego: confeti y estrellas sobre el escenario.
        celebrar: function (wrap) {
            if (!activo) return;
            detenerHalo();
            if (fx()) fx().celebracion(rectUtil(wrap));
        }
    };

    global.PrecisionAnim = PrecisionAnim;
})(window);
