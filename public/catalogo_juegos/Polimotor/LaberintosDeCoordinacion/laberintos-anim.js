/**
 * laberintos-anim.js — Capa de animación de "Laberintos de coordinación" (GSAP 3).
 * Las partículas (Phaser 4) vienen de ../../shared/pednia-fx.js (PedniaFx).
 *
 * SOLO VISUAL. La lógica del juego vive en script.js y no se toca:
 *   - El canvas (#lienzo) lo MIDE la lógica (aNorm → getBoundingClientRect) y en él se
 *     dibujan laberinto, carita y cohete. Aquí nunca se anima su transform ni el de
 *     .lienzo-wrap/#escenario; en el canvas solo se anima la opacidad al aparecer.
 *   - Todo lo demás son elementos PROPIOS encima del canvas, sin eventos de puntero
 *     (pointer-events: none): halo de la carita, destello rojo y "fantasma" del regreso.
 *     Se ubican en % del canvas (que llena .lienzo-wrap), así siguen en su sitio.
 *   - La carita y el cohete los dibuja la lógica: aquí solo se leen sus posiciones
 *     (píxeles del canvas que pasa script.js) para poner los efectos encima.
 *
 * Trampas de GSAP evitadas (ver memoria del proyecto):
 *   - Sin `stagger`; tweens de un solo objetivo (killTweensOf fiable).
 *   - `clearProps` no se aplica con `yoyo` que termina en el inicio → limpiar en onComplete.
 *   - Sin Math.random (el juego lo usa para elegir laberintos).
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
        // a tiempo, en sincronía con los setTimeout/requestAnimationFrame del juego.
        gsap.ticker.lagSmoothing(0);
    }

    function fx() { return (Fx && Fx.activo) ? Fx : null; }

    // Sonidos que dependen del momento exacto de la animación (regreso).
    // Los del juego (agarrar, soltar, error, correcto…) los dispara script.js.
    function snd() {
        var A = global.PedniaAudio;
        return (A && A.activo && A.tieneTema()) ? A : null;
    }

    function rectUtil(el) {
        if (!el || !el.getBoundingClientRect) return null;
        var r = el.getBoundingClientRect();
        return (r.width > 1 && r.height > 1) ? r : null;
    }

    /** Píxel del canvas → pantalla (el canvas se estira para llenar su contenedor). */
    function aCliente(canvas, px) {
        var r = rectUtil(canvas);
        if (!r || !px || !canvas.width || !canvas.height) return null;
        var sx = r.width / canvas.width;
        var sy = r.height / canvas.height;
        return { x: r.left + px.x * sx, y: r.top + px.y * sy, sx: sx, sy: sy };
    }

    /** Píxel del canvas → % del contenedor (para los elementos propios). */
    function aPorciento(canvas, px) {
        return {
            x: (px.x / (canvas.width || 1)) * 100,
            y: (px.y / (canvas.height || 1)) * 100
        };
    }

    function anilloEn(p, d, color) {
        if (!p || !fx()) return;
        fx().anillo({ left: p.x - d / 2, top: p.y - d / 2, width: d, height: d }, color);
    }

    // ---------------- Halo de la carita ----------------
    // Pulso "¡tócame!" en la salida y aro brillante que la acompaña mientras se arrastra.

    var halo = null;
    var haloPulso = null;
    var invitaDelay = null;
    var agarrado = false;

    function asegurarHalo(canvas) {
        var wrap = canvas && canvas.parentNode;
        if (!wrap) return null;
        if (!halo || halo.parentNode !== wrap) {
            if (halo && halo.parentNode) halo.parentNode.removeChild(halo);
            halo = doc.createElement('div');
            halo.className = 'lab-halo';
            halo.setAttribute('aria-hidden', 'true');
            wrap.appendChild(halo);
        }
        return halo;
    }

    function ubicarHalo(canvas, px, tamPx) {
        var h = asegurarHalo(canvas);
        var c = aCliente(canvas, px);
        if (!h || !c) return null;
        var pc = aPorciento(canvas, px);
        var d = Math.max(36, tamPx * c.sx * 1.5);
        h.style.left = pc.x + '%';
        h.style.top = pc.y + '%';
        h.style.width = d + 'px';
        h.style.height = d + 'px';
        h.style.marginLeft = (-d / 2) + 'px';
        h.style.marginTop = (-d / 2) + 'px';
        return h;
    }

    function cancelarInvitacion() {
        if (invitaDelay) { invitaDelay.kill(); invitaDelay = null; }
    }

    function ocultarHalo() {
        cancelarInvitacion();
        agarrado = false;
        if (haloPulso) { haloPulso.kill(); haloPulso = null; }
        if (!halo) return;
        gsap.killTweensOf(halo);
        halo.classList.remove('is-agarrado');
        halo.style.display = 'none';
    }

    function invitar(canvas, px, tamPx) {
        if (!activo || agarrado) return;
        var h = ubicarHalo(canvas, px, tamPx);
        if (!h) return;
        if (haloPulso) { haloPulso.kill(); haloPulso = null; }
        gsap.killTweensOf(h);
        h.classList.remove('is-agarrado');
        h.style.display = 'block';
        haloPulso = gsap.fromTo(h, { scale: 0.85, opacity: 0.95 }, {
            scale: 1.18,
            opacity: 0.35,
            duration: 0.8,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut'
        });
    }

    function invitarLuego(canvas, px, tamPx, segundos) {
        cancelarInvitacion();
        invitaDelay = gsap.delayedCall(segundos, function () {
            invitaDelay = null;
            invitar(canvas, px, tamPx);
        });
    }

    // ---------------- Fallo: destello y regreso ----------------

    var flash = null;
    var salidaDedo = null;   // { x, y, t } en pantalla: por dónde se salió el dedo

    function asegurarFlash(canvas) {
        var wrap = canvas && canvas.parentNode;
        if (!wrap) return null;
        if (!flash || flash.parentNode !== wrap) {
            flash = doc.createElement('div');
            flash.className = 'lab-flash';
            flash.setAttribute('aria-hidden', 'true');
            wrap.appendChild(flash);
        }
        return flash;
    }

    function ahora() {
        return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
    }

    var LaberintosAnim = {
        activo: activo,

        /** Laberinto nuevo (primero o tras la demostración): aparece y la carita invita. */
        nuevoLaberinto: function (canvas, caraPx, tamPx, esDemo) {
            if (!activo || !canvas) return;
            if (fx()) fx().preparar();
            ocultarHalo();
            gsap.killTweensOf(canvas);
            gsap.fromTo(canvas, { opacity: 0 }, {
                opacity: 1, duration: 0.5, ease: 'power1.out', clearProps: 'opacity'
            });
            gsap.delayedCall(0.35, function () {
                var c = aCliente(canvas, caraPx);
                if (c) anilloEn(c, Math.max(50, tamPx * c.sx * 1.8), '#ffd54f');
            });
            if (!esDemo) invitarLuego(canvas, caraPx, tamPx, 0.8);
        },

        /** El cohete bajó a la meta del laberinto siguiente: anillo de aterrizaje e invitación. */
        aterrizaje: function (canvas, metaPx, caraPx, tamPx) {
            if (!activo || !canvas) return;
            var m = aCliente(canvas, metaPx);
            if (m && fx()) {
                anilloEn(m, 110, '#ffffff');
                fx().estallido(m.x, m.y + 30, '#81c784', 10);
            }
            var c = aCliente(canvas, caraPx);
            if (c) gsap.delayedCall(0.25, function () { anilloEn(c, Math.max(50, tamPx * c.sx * 1.8), '#ffd54f'); });
            invitarLuego(canvas, caraPx, tamPx, 0.6);
        },

        /** Agarrar: el halo deja de latir y se vuelve un aro brillante que sigue a la carita. */
        agarrar: function (canvas, caraPx, tamPx) {
            if (!activo || !canvas) return;
            cancelarInvitacion();
            if (haloPulso) { haloPulso.kill(); haloPulso = null; }
            var h = ubicarHalo(canvas, caraPx, tamPx);
            if (!h) return;
            agarrado = true;
            gsap.killTweensOf(h);
            h.classList.add('is-agarrado');
            h.style.display = 'block';
            gsap.fromTo(h, { scale: 0.7, opacity: 0.6 }, {
                scale: 1.08, opacity: 1, duration: 0.18, ease: 'back.out(3)'
            });
        },

        /** La carita avanzó por el pasillo: el aro la acompaña. */
        mover: function (canvas, caraPx, tamPx) {
            if (!activo || !agarrado || !canvas) return;
            ubicarHalo(canvas, caraPx, tamPx);
        },

        /** Soltar: el aro se encoge y desaparece. */
        soltar: function () {
            if (!activo || !halo || !agarrado) return;
            agarrado = false;
            var h = halo;
            gsap.killTweensOf(h);
            gsap.to(h, {
                scale: 0.6,
                opacity: 0,
                duration: 0.25,
                ease: 'power2.in',
                onComplete: function () {
                    if (!agarrado && !haloPulso) {
                        h.classList.remove('is-agarrado');
                        h.style.display = 'none';
                    }
                }
            });
        },

        /** El dedo salió del pasillo en (x, y) de pantalla: origen del regreso. */
        salida: function (x, y) {
            if (!activo) return;
            salidaDedo = { x: x, y: y, t: ahora() };
        },

        /**
         * Fallo (salirse o soltar en edad 5): destello rojo, tiembla el enunciado y una
         * copia translúcida de la carita vuela desde donde salió el dedo hasta donde la
         * lógica la devolvió. antesPx/ahoraPx en píxeles del canvas.
         */
        fallo: function (canvas, antesPx, ahoraPx, tamPx, spriteSrc, enunciado) {
            if (!activo || !canvas) return;
            ocultarHalo();
            // Tras el aviso, la carita vuelve a invitar a que la agarren donde quedó.
            if (ahoraPx) invitarLuego(canvas, ahoraPx, tamPx, 1.2);
            var r = rectUtil(canvas);
            var f = asegurarFlash(canvas);
            if (f) {
                gsap.killTweensOf(f);
                gsap.fromTo(f, { opacity: 0 }, {
                    opacity: 1,
                    duration: 0.12,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power1.out',
                    onComplete: function () { gsap.set(f, { opacity: 0 }); }
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
                    onComplete: function () { gsap.set(enunciado, { clearProps: 'transform' }); }
                });
            }
            if (!r) return;
            // Origen: por dónde salió el dedo (si acaba de pasar) o donde estaba la carita.
            var desde = null;
            if (salidaDedo && ahora() - salidaDedo.t < 500) {
                desde = { x: salidaDedo.x, y: salidaDedo.y };
            } else if (antesPx) {
                desde = aCliente(canvas, antesPx);
            }
            salidaDedo = null;
            var hacia = aCliente(canvas, ahoraPx);
            if (desde) anilloEn(desde, 60, '#e53935');
            if (!desde || !hacia) return;
            var dx = hacia.x - desde.x;
            var dy = hacia.y - desde.y;
            if (Math.abs(dx) + Math.abs(dy) < 6) return;

            var wrap = canvas.parentNode;
            if (!wrap) return;
            var d = Math.max(28, tamPx * hacia.sx);
            var fantasma;
            if (spriteSrc) {
                fantasma = doc.createElement('img');
                fantasma.src = spriteSrc;
                fantasma.alt = '';
                fantasma.draggable = false;
            } else {
                fantasma = doc.createElement('div');
            }
            fantasma.className = 'lab-fantasma';
            fantasma.setAttribute('aria-hidden', 'true');
            fantasma.style.width = d + 'px';
            fantasma.style.height = d + 'px';
            fantasma.style.marginLeft = (-d / 2) + 'px';
            fantasma.style.marginTop = (-d / 2) + 'px';
            wrap.appendChild(fantasma);
            var x0 = ((desde.x - r.left) / r.width) * 100;
            var y0 = ((desde.y - r.top) / r.height) * 100;
            var x1 = ((hacia.x - r.left) / r.width) * 100;
            var y1 = ((hacia.y - r.top) / r.height) * 100;
            if (snd()) snd().evento('regreso');
            gsap.fromTo(fantasma, { left: x0 + '%', top: y0 + '%', opacity: 0.8, scale: 1 }, {
                left: x1 + '%',
                top: y1 + '%',
                opacity: 0.15,
                scale: 0.85,
                duration: 0.5,
                ease: 'power2.inOut',
                onComplete: function () {
                    if (fantasma.parentNode) fantasma.parentNode.removeChild(fantasma);
                    anilloEn(hacia, Math.max(50, d * 1.8), '#ffd54f');
                }
            });
        },

        /** Llegó al cohete: estrellas y anillo sobre la meta (el vuelo lo dibuja la lógica). */
        exito: function (canvas, metaPx) {
            if (!activo || !canvas) return;
            ocultarHalo();
            var m = aCliente(canvas, metaPx);
            if (m && fx()) {
                fx().estallido(m.x, m.y, '#ffd54f', 20);
                anilloEn(m, 120, '#ffd54f');
            }
        },

        /** Despegue del cohete: chispas de fuego bajo la tobera. pose = poseCohete() del juego. */
        despegue: function (canvas, pose) {
            if (!activo || !canvas || !pose || !pose.p) return;
            var base = aCliente(canvas, { x: pose.p.x, y: pose.p.y + (pose.h || 0) * 0.42 });
            if (base && fx()) {
                fx().estallido(base.x, base.y, '#ff7043', 14);
                fx().estallido(base.x, base.y, '#ffd54f', 8);
            }
        },

        // Contador del HUD: salta cuando cambia el laberinto.
        progreso: function (el) {
            if (!activo || !el) return;
            var txt = el.textContent;
            var prev = el.__labPrev;
            el.__labPrev = txt;
            if (prev === undefined || prev === txt || el.hidden) return;
            gsap.killTweensOf(el);
            gsap.fromTo(el, { scale: 1.4 }, {
                scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
        },

        // Fin del juego: confeti y estrellas sobre el escenario.
        celebrar: function (canvas) {
            if (!activo) return;
            ocultarHalo();
            if (fx()) fx().celebracion(rectUtil(canvas));
        }
    };

    global.LaberintosAnim = LaberintosAnim;
})(window);
