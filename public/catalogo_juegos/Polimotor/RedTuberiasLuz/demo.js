/**
 * TuberiaDemo — demostración automática de la conducción (window.TuberiaDemo).
 *
 * Sobre la tubería del nivel 1, con la entrada bloqueada y sin contar: la mano de PedniaTutorial presiona la gema,
 * la conduce por el centro del primer tramo (con el mismo ReglasTuberia.conducir del juego) hasta pasar el primer
 * checkpoint, y se levanta: la gema se detiene y vuelve al checkpoint. Así se ven las dos ideas del juego
 * (no soltar y los puntos de control) sin completar el recorrido por el niño. Al final la gema vuelve al generador.
 */
(function (global) {
    "use strict";

    var T = function () { return global.PedniaTutorial || null; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mano = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 140) : ms); });
    }

    function asegurar(p) {
        var t = T();
        if (!t) return null;
        if (!mano || !mano.isConnected) {
            mano = t.crearMano();
            mano.style.transition = "none";
            if (p) t.puntaManoEn(mano, p.x, p.y);
        }
        return mano;
    }

    function manoA(p, ms) {
        var t = T();
        var m = asegurar(p);
        if (!t || !m || !p) return sleep(ms || 0);
        m.style.transition = ms > 0 ? "transform " + ms + "ms ease-in-out" : "none";
        t.puntaManoEn(m, p.x, p.y);
        return sleep((ms || 0) + 16);
    }

    function fase(nombre) {
        var t = T();
        if (t && mano) t.faseMano(mano, nombre);
    }

    function quitar() {
        if (T()) T().quitarManos();
        mano = null;
    }

    /** La mano lleva el "dedo" por el eje de s0 a s1 a velocidad constante; la gema lo sigue con las reglas reales. */
    function conducir(api, s0, s1, vel) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var ms = Math.abs(s1 - s0) / (vel || 260) * 1000;
            if (reducido) ms = Math.min(ms, 400);
            var paso = function () {
                if (api.cancelado()) { resolve(); return; }
                var k = ms > 0 ? Math.min(1, (performance.now() - t0) / ms) : 1;
                var w = api.punto(s0 + (s1 - s0) * k);
                api.mover(w.x, w.y);
                var p = api.aPantalla(w.x, w.y);
                if (T() && mano) T().puntaManoEn(mano, p.x, p.y);
                if (k >= 1) { resolve(); return; }
                setTimeout(paso, 16);
            };
            paso();
        });
    }

    async function correr(api) {
        try {
            await api.preparar();
            if (api.cancelado()) return;
            var voz = api.decir(api.textoDemo(), "zeus");
            var g = api.gema();
            var p = api.aPantalla(g.x, g.y);
            await manoA({ x: p.x + 150, y: p.y + 120 }, 0);
            fase("viajar");
            await manoA(p, 700);
            if (api.cancelado()) return;
            fase("presionar");
            await sleep(220);
            api.tomar();
            await sleep(320);
            var meta = api.sCheckpoint(0) + 70;
            await conducir(api, 0, meta, 250);
            if (api.cancelado()) return;
            await sleep(450);
            // la mano se levanta: la gema se detiene y vuelve al punto de control
            fase("viajar");
            api.soltar();
            var q = api.aPantalla(api.gema().x, api.gema().y);
            await manoA({ x: q.x + 40, y: q.y - 110 }, 420);
            await api.esperarRegreso();
            await Promise.race([voz, sleep(2500)]);
            quitar();
        } catch (e) {
            console.warn("[TuberiaDemo]", e);
        }
        quitar();
        await api.terminar();
    }

    global.TuberiaDemo = { correr: correr };
})(typeof window !== "undefined" ? window : global);
