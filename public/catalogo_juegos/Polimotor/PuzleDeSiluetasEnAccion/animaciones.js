/**
 * SiluetaAnim — tweens y animaciones del personaje (window.SiluetaAnim).
 *
 *   tween(ms, onUpdate, easing)      bucle con requestAnimationFrame y respaldo setTimeout
 *                                    (si el panel está oculto rAF no corre: siempre termina por tiempo).
 *   clase(el, clase, ms)             agrega una clase un rato (reinicia la animación CSS).
 *   transformar(opts)                la silueta cobra vida: neón, color por segmentos, detalles,
 *                                    chispas en las articulaciones.
 *   actuar(opts)                     el personaje hace su movimiento deportivo (cinemática directa).
 * Sin Math.random: el juego baraja con él.
 */
(function (global) {
    "use strict";

    var P = global.Posturas;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var EASE = {
        lineal: function (t) { return t; },
        suave: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
        salida: function (t) { return 1 - Math.pow(1 - t, 3); },
        entrada: function (t) { return t * t * t; },
        rebote: function (t) {
            var c1 = 1.70158;
            var c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
        seno: function (t) { return 0.5 - Math.cos(t * Math.PI) / 2; }
    };

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    function siguienteCuadro(fn) {
        if (!document.hidden && typeof requestAnimationFrame === "function") {
            var hecho = false;
            var id = requestAnimationFrame(function () {
                if (hecho) return;
                hecho = true;
                fn();
            });
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

    function tween(ms, onUpdate, easing) {
        var fn = typeof easing === "function" ? easing : (EASE[easing] || EASE.suave);
        var dur = reducido ? Math.min(ms, 100) : ms;
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

    function clase(el, nombre, ms) {
        if (!el) return;
        el.classList.remove(nombre);
        void (el.getBoundingClientRect && el.getBoundingClientRect());
        el.classList.add(nombre);
        setTimeout(function () { el.classList.remove(nombre); }, ms || 600);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /** Interpola ángulos por el camino corto. */
    function lerpAng(a, b, t) {
        return a + P.normalizar(b - a) * t;
    }

    // ------------------------------------------------------------------ cuerpo animable

    function copiarCuerpo(c) {
        var r = { x: c.x || 0, y: c.y || 0, tronco: c.tronco || 0, cabeza: c.cabeza != null ? c.cabeza : c.tronco || 0, brazos: {}, piernas: {} };
        Object.keys(c.brazos || {}).forEach(function (id) {
            r.brazos[id] = { forma: c.brazos[id].forma, angulo: c.brazos[id].angulo };
        });
        Object.keys(c.piernas || {}).forEach(function (id) {
            var p = c.piernas[id];
            r.piernas[id] = { forma: p.forma, angulo: p.angulo, lado: p.lado, tenis: p.tenis };
        });
        return r;
    }

    function mezclar(a, b, t) {
        var r = copiarCuerpo(a);
        r.x = lerp(a.x, b.x, t);
        r.y = lerp(a.y, b.y, t);
        r.tronco = lerpAng(a.tronco, b.tronco, t);
        r.cabeza = lerpAng(a.cabeza, b.cabeza, t);
        Object.keys(r.brazos).forEach(function (id) {
            r.brazos[id].angulo = lerpAng(a.brazos[id].angulo, b.brazos[id].angulo, t);
        });
        Object.keys(r.piernas).forEach(function (id) {
            var pa = a.piernas[id];
            var pb = b.piernas[id];
            r.piernas[id].angulo = lerpAng(pa.angulo, pb.angulo, t);
            var ta = pa.tenis != null ? pa.tenis : pa.angulo + (pa.forma === "doblada" ? 90 : 0);
            var tb = pb.tenis != null ? pb.tenis : pb.angulo + (pb.forma === "doblada" ? 90 : 0);
            r.piernas[id].tenis = lerpAng(ta, tb, t);
        });
        return r;
    }

    /** Variante del cuerpo base: d = { x, y, tronco, cabeza, brazos: Δ o función, piernas: Δ o función }. */
    function variante(base, d) {
        var r = copiarCuerpo(base);
        r.x += d.x || 0;
        r.y += d.y || 0;
        r.tronco += d.tronco || 0;
        r.cabeza += d.cabeza != null ? d.cabeza : d.tronco || 0;
        var ids = Object.keys(r.brazos);
        ids.forEach(function (id, i) {
            var v = typeof d.brazos === "function" ? d.brazos(id, i, r.brazos[id]) : d.brazos;
            if (v && v.abs != null) r.brazos[id].angulo = v.abs;
            else r.brazos[id].angulo += Number(v) || 0;
        });
        Object.keys(r.piernas).forEach(function (id, i) {
            var p = r.piernas[id];
            var canilla = p.tenis != null ? p.tenis : p.angulo + (p.forma === "doblada" ? 90 : 0);
            var v = typeof d.piernas === "function" ? d.piernas(id, i, p) : d.piernas;
            var delta = Number(v) || 0;
            p.angulo += delta;
            p.tenis = canilla + delta + (d.puntas || 0);
        });
        return r;
    }

    /** Secuencias de movimiento por tipo de postura. Cada paso: [cuerpo, ms, easing]. */
    function coreografia(tipo, base) {
        var adelante = function (id, i, p) { return p.angulo <= 0 ? -1 : 1; };
        if (tipo === "carrera") {
            var pasos = [];
            for (var k = 0; k < 2; k++) {
                pasos.push([variante(base, {
                    y: -8, brazos: function (id, i) { return i % 2 === 0 ? 34 : -34; },
                    piernas: function (id, i, p) { return adelante(id, i, p) * -18; }
                }), 300, "seno"]);
                pasos.push([variante(base, {
                    y: 4, brazos: function (id, i) { return i % 2 === 0 ? -30 : 30; },
                    piernas: function (id, i, p) { return adelante(id, i, p) * 18; }
                }), 300, "seno"]);
            }
            pasos.push([variante(base, { y: -46, tronco: -6, brazos: { abs: -165 }, puntas: 20 }), 420, "salida"]);
            pasos.push([base, 520, "rebote"]);
            return pasos;
        }
        if (tipo === "equilibrio") {
            return [
                [variante(base, { y: -6, tronco: 6, brazos: function (id, i) { return i % 2 === 0 ? -24 : 24; } }), 600, "seno"],
                [variante(base, { y: 2, tronco: -6, brazos: function (id, i) { return i % 2 === 0 ? 20 : -20; } }), 600, "seno"],
                [variante(base, { y: -54, tronco: -4, brazos: { abs: -170 }, puntas: 24 }), 460, "salida"],
                [base, 600, "rebote"]
            ];
        }
        if (tipo === "giro") {
            return [
                [variante(base, { y: 10, tronco: 10, brazos: 40 }), 300, "suave"],
                [variante(base, { y: -70, tronco: -14, brazos: { abs: 180 }, piernas: function (id, i, p) { return adelante(id, i, p) * -20; }, puntas: 26 }), 480, "salida"],
                [variante(base, { y: -40, tronco: 12, brazos: { abs: -120 } }), 360, "seno"],
                [base, 560, "rebote"]
            ];
        }
        // salto (por defecto)
        return [
            [variante(base, { y: 12, tronco: 12, brazos: 50 }), 320, "suave"],
            [variante(base, { y: -78, tronco: -8, brazos: { abs: -160 }, piernas: function (id, i, p) { return adelante(id, i, p) * -14; }, puntas: 26 }), 460, "salida"],
            [variante(base, { y: 6, tronco: 10, brazos: { abs: -95 } }), 420, "entrada"],
            [base, 520, "rebote"]
        ];
    }

    /**
     * El personaje hace su movimiento. opts = { cuerpo, aplicar(poseMap), tipo, vueltas }.
     * aplicar recibe el resultado de Posturas.cinematica en cada cuadro.
     */
    async function actuar(opts) {
        var base = copiarCuerpo(opts.cuerpo);
        var actual = copiarCuerpo(base);
        var vueltas = opts.vueltas || 1;
        for (var v = 0; v < vueltas; v++) {
            var pasos = coreografia(opts.tipo, base);
            for (var i = 0; i < pasos.length; i++) {
                if (opts.cancelado && opts.cancelado()) return;
                var desde = actual;
                var hacia = pasos[i][0];
                await tween(pasos[i][1], function (t) {
                    actual = mezclar(desde, hacia, t);
                    opts.aplicar(P.cinematica(actual));
                }, pasos[i][2]).promesa;
                actual = hacia;
            }
        }
        opts.aplicar(P.cinematica(base));
    }

    /**
     * La silueta cobra vida. opts = {
     *   figura: <g> de la figura, piezas: [ids en orden], elPieza(id), alArticular(id) }
     */
    async function transformar(opts) {
        var fig = opts.figura;
        if (!fig) return;
        fig.classList.add("cobra-vida");
        // 1. El contorno oscuro se ilumina y la sombra empieza a desaparecer.
        fig.classList.add("tr-neon");
        await sleep(650);
        fig.classList.add("tr-sin-silueta");
        // 2. Los segmentos recuperan sus colores, uno tras otro, y se encienden las articulaciones.
        for (var i = 0; i < opts.piezas.length; i++) {
            var id = opts.piezas[i];
            var el = opts.elPieza(id);
            if (el) {
                el.classList.add("viva");
                if (typeof opts.alArticular === "function") opts.alArticular(id);
            }
            await sleep(150);
        }
        // 3. Aparecen los detalles (ojos, dorsal, cordones…).
        fig.classList.add("tr-detalles");
        await sleep(450);
        fig.classList.remove("tr-neon");
    }

    global.SiluetaAnim = {
        EASE: EASE,
        sleep: sleep,
        tween: tween,
        clase: clase,
        lerp: lerp,
        lerpAng: lerpAng,
        copiarCuerpo: copiarCuerpo,
        mezclar: mezclar,
        variante: variante,
        actuar: actuar,
        transformar: transformar,
        reducido: reducido
    };
})(window);
