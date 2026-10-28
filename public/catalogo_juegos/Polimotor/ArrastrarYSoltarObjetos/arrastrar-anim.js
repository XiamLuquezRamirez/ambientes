/**
 * arrastrar-anim.js — Capa de animación de "Arrastrar y soltar objetos" (GSAP 3).
 * Las partículas (Phaser 4) vienen de ../../shared/pednia-fx.js (PedniaFx).
 *
 * SOLO VISUAL. El tablero es un canvas Phaser (phaser-juego.js) y la lógica vive en
 * script.js; aquí no se decide nada ni se mueve ninguna pieza:
 *   - El canvas, #phaser-juego y #escena-wrap NO se animan nunca (ni transform ni
 *     tamaño): Phaser traduce el toque a coordenadas del juego con el rectángulo del
 *     canvas, y las cajas se detectan por posición (puntoEnDestino).
 *   - Del objeto arrastrado (sprite Phaser) solo se anima `angle` (leve inclinación),
 *     que ningún cálculo usa; la posición, la escala y el regreso los sigue haciendo
 *     Phaser con sus propios tweens. Al soltar, el ángulo vuelve a 0.
 *   - Celebraciones (anillo, estrellas, confeti) en una capa aparte (PedniaFx) usando
 *     el rectángulo de pantalla que entrega PedniaArrastrePhaser.rectPantalla (solo lectura).
 *   - En el DOM solo se animan el enunciado (h1) y el contador; su contenedor
 *     .enunciado-wrap conserva el translateX(-50%) del CSS.
 *
 * Trampas de GSAP evitadas (ver memoria del proyecto):
 *   - Sin `stagger`; tweens de un solo objetivo, matados elemento por elemento.
 *   - `clearProps` no se aplica con `yoyo` que termina en el inicio → limpiar en onComplete.
 *   - Sin Math.random (el juego baraja con él): colores en orden fijo.
 */
(function (global) {
    'use strict';

    var gsap = global.gsap || null;
    var doc = global.document;
    var reducido = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Con "reducir movimiento" del sistema (o sin GSAP) el juego queda exactamente como antes.
    var activo = !!gsap && !reducido;

    if (activo) {
        doc.body.classList.add('gsap-anim');
        // Reloj real: si el equipo va lento, las animaciones saltan cuadros pero terminan
        // a tiempo, en sincronía con los setTimeout del juego.
        gsap.ticker.lagSmoothing(0);
    }

    var PALETA = ['#ffd54f', '#4fc3f7', '#81c784', '#ff7043', '#ba68c8'];
    var turnoColor = 0;

    function fx() {
        var F = global.PedniaFx;
        return (F && F.activo) ? F : null;
    }

    function siguienteColor() {
        var c = PALETA[turnoColor % PALETA.length];
        turnoColor += 1;
        return c;
    }

    function rectUtil(r) {
        return (r && r.width > 1 && r.height > 1) ? r : null;
    }

    function centro(rect) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    // El sprite sigue vivo en la escena (al cambiar de ronda Phaser lo destruye).
    function spriteVivo(go) {
        return !!(go && go.scene && go.active !== false);
    }

    var ultimoProgreso = null;

    var ArrastrarAnim = {
        activo: activo,

        // Arranca la capa de partículas en segundo plano.
        preparar: function () {
            var f = fx();
            if (f) f.preparar();
        },

        // Nueva ronda: el enunciado entra con un pequeño salto.
        ronda: function (en) {
            ArrastrarAnim.preparar();
            if (!activo || !en) return;
            gsap.killTweensOf(en);
            gsap.fromTo(en, { y: -16, scale: 0.84, opacity: 0 }, {
                y: 0, scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2)',
                clearProps: 'transform,opacity'
            });
        },

        // Contador de rondas del HUD: salta cuando avanza.
        progreso: function (el, valor) {
            if (!el) return;
            var prev = ultimoProgreso;
            ultimoProgreso = valor;
            if (!activo || el.hidden || prev === null || valor <= prev) return;
            gsap.killTweensOf(el);
            gsap.fromTo(el, { scale: 1.45, rotation: -6 }, {
                scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)', clearProps: 'transform'
            });
        },

        // Inicio del arrastre (Phaser ya lo "levanta" con escala 1.08): se prepara la inclinación.
        agarrar: function (go) {
            if (!activo || !go) return;
            gsap.killTweensOf(go);
            if (go.__calma) { go.__calma.kill(); go.__calma = null; }
            go.__rotar = gsap.quickTo(go, 'angle', { duration: 0.35, ease: 'power3.out' });
            go.__ultX = null;
        },

        // Durante el arrastre: leve inclinación según la velocidad horizontal.
        mover: function (go, x) {
            if (!activo || !go || !go.__rotar) return;
            if (go.__ultX !== null && go.__ultX !== undefined) {
                var dx = x - go.__ultX;
                go.__rotar(Math.max(-12, Math.min(12, dx * 0.8)));
            }
            go.__ultX = x;
            if (go.__calma) go.__calma.kill();
            go.__calma = gsap.delayedCall(0.12, function () {
                if (go.__rotar && spriteVivo(go)) go.__rotar(0);
            });
        },

        // Al soltar: el objeto se endereza (el regreso o el encaje los hace Phaser).
        soltar: function (go) {
            if (!activo || !go) return;
            if (go.__calma) { go.__calma.kill(); go.__calma = null; }
            go.__rotar = null;
            gsap.killTweensOf(go);
            if (!spriteVivo(go) || !go.angle) return;
            gsap.to(go, { angle: 0, duration: 0.22, ease: 'power2.out' });
        },

        // Acierto: anillo dorado y estrellas sobre la caja correcta.
        acierto: function (rect) {
            var r = rectUtil(rect);
            var f = fx();
            if (!r || !f) return;
            var color = siguienteColor();
            var c = centro(r);
            f.anillo(r, color);
            f.estallido(c.x, c.y, color, 18);
        },

        // Error: anillo rojo sobre la caja equivocada (Phaser la sacude y devuelve el objeto).
        error: function (rect) {
            var r = rectUtil(rect);
            var f = fx();
            if (!r || !f) return;
            f.anillo(r, '#e53935');
        },

        // Fin del juego: confeti y ráfagas sobre el tablero + salto del enunciado.
        celebrar: function () {
            var en = doc.getElementById('enunciado');
            if (activo && en) {
                gsap.killTweensOf(en);
                // yoyo termina en el valor inicial: GSAP no aplica clearProps → onComplete.
                gsap.fromTo(en, { scale: 1 }, {
                    scale: 1.12, duration: 0.2, yoyo: true, repeat: 1, ease: 'power2.out',
                    onComplete: function () { gsap.set(en, { clearProps: 'transform' }); }
                });
            }
            var f = fx();
            var wrap = doc.getElementById('escena-wrap');
            var r = wrap ? rectUtil(wrap.getBoundingClientRect()) : null;
            if (f) f.celebracion(r);
        }
    };

    global.ArrastrarAnim = ArrastrarAnim;
})(window);
