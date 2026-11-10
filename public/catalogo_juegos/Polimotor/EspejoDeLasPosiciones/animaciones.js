/**
 * EspejoAnim — animaciones de la figura: tweens de ángulos, "cobra vida" y rutina final.
 * Sin Math.random (el juego baraja con él). Depende de Postura y Muneco.
 *
 * El bucle usa requestAnimationFrame y, si la pestaña está oculta, setTimeout: las animaciones
 * siempre terminan por tiempo (si el panel está oculto rAF no corre y la promesa quedaría colgada).
 */
(function (global) {
    "use strict";

    var P = global.Postura;
    var M = global.Muneco;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var EASE = {
        lineal: function (t) { return t; },
        suave: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
        salida: function (t) { return 1 - Math.pow(1 - t, 3); },
        rebote: function (t) {
            var c1 = 1.5;
            var c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        }
    };

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    function siguienteCuadro(fn) {
        if (!document.hidden && typeof requestAnimationFrame === "function") {
            var hecho = false;
            var id = requestAnimationFrame(function () {
                if (hecho) return;
                hecho = true;
                fn();
            });
            // Respaldo: si rAF no corre (panel oculto), seguimos con setTimeout.
            setTimeout(function () {
                if (hecho) return;
                hecho = true;
                if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(id);
                fn();
            }, 60);
        } else {
            setTimeout(fn, 30);
        }
    }

    /** Llama onUpdate(t ∈ [0,1] ya suavizado) durante ms. Devuelve { promesa, cancelar }. */
    function tween(ms, onUpdate, easing) {
        var fn = typeof easing === "function" ? easing : (EASE[easing] || EASE.suave);
        var dur = reducido ? Math.min(ms, 120) : ms;
        var inicio = Date.now();
        var cancelado = false;
        var promesa = new Promise(function (resolve) {
            function paso() {
                if (cancelado) {
                    resolve(false);
                    return;
                }
                var t = dur <= 0 ? 1 : Math.min(1, (Date.now() - inicio) / dur);
                try { onUpdate(fn(t), t); } catch (e) { /* noop */ }
                if (t >= 1) {
                    resolve(true);
                    return;
                }
                siguienteCuadro(paso);
            }
            paso();
        });
        return { promesa: promesa, cancelar: function () { cancelado = true; } };
    }

    function mezclar(desde, hasta, t) {
        var r = {};
        P.EXTREMIDADES.forEach(function (id) {
            var a = (desde && desde[id]) || { a: 0, b: 0 };
            var b = (hasta && hasta[id]) || a;
            r[id] = P.interpolar(a, b, t);
        });
        return r;
    }

    /** Lleva toda la figura de una postura a otra. */
    function pose(raiz, desde, hasta, ms, easing) {
        return tween(ms, function (t) {
            M.aplicarTodo(raiz, mezclar(desde, hasta, t));
        }, easing).promesa;
    }

    /** Lleva una extremidad de un ángulo a otro. */
    function parte(raiz, id, desde, hasta, ms, easing) {
        return tween(ms, function (t) {
            M.aplicar(raiz, id, P.interpolar(desde, hasta, t));
        }, easing).promesa;
    }

    function clase(el, nombre, ms) {
        if (!el) return Promise.resolve();
        el.classList.remove(nombre);
        void el.getBoundingClientRect();
        el.classList.add(nombre);
        return sleep(ms).then(function () { el.classList.remove(nombre); });
    }

    /**
     * El cuerpo "realiza" la postura: se relaja a la pose neutra y vuelve a la postura con impulso,
     * con un salto de toda la figura (las piezas nunca se separan: se mueve el SVG entero).
     */
    function realizar(raices, angulos) {
        var lista = (raices || []).filter(Boolean);
        var neutra = P.neutra();
        return Promise.all(lista.map(function (raiz) {
            var fig = raiz.closest ? raiz.closest("svg") || raiz : raiz;
            return pose(raiz, angulos, neutra, 520, "suave")
                .then(function () { return sleep(140); })
                .then(function () {
                    clase(fig, "fig-salto", 900);
                    return pose(raiz, neutra, angulos, 820, "rebote");
                })
                .then(function () { return sleep(260); })
                .then(function () { return clase(fig, "fig-brillo", 900); });
        }));
    }

    /** Entrada del modelo: Zeus pasa de estar de pie a la postura. */
    function adoptar(raiz, angulos, ms) {
        return pose(raiz, P.neutra(), angulos, ms || 900, "rebote");
    }

    /** Rutina final: todas las posturas logradas, encadenadas, en las dos figuras a la vez. */
    function rutina(raices, posturas, opts) {
        opts = opts || {};
        var lista = (raices || []).filter(Boolean);
        var seq = [P.neutra()].concat(posturas || []).concat([P.neutra()]);
        var actual = Promise.resolve();
        seq.forEach(function (ang, i) {
            if (i === 0) return;
            var desde = seq[i - 1];
            actual = actual.then(function () {
                lista.forEach(function (raiz) {
                    var fig = raiz.closest ? raiz.closest("svg") || raiz : raiz;
                    clase(fig, "fig-salto", 900);
                });
                if (typeof opts.onPostura === "function") opts.onPostura(i - 1);
                return Promise.all(lista.map(function (raiz) {
                    return pose(raiz, desde, ang, opts.ms || 760, "rebote");
                })).then(function () { return sleep(opts.pausa || 520); });
            });
        });
        return actual;
    }

    global.EspejoAnim = {
        EASE: EASE,
        reducido: reducido,
        sleep: sleep,
        tween: tween,
        mezclar: mezclar,
        pose: pose,
        parte: parte,
        clase: clase,
        realizar: realizar,
        adoptar: adoptar,
        rutina: rutina
    };
})(window);
