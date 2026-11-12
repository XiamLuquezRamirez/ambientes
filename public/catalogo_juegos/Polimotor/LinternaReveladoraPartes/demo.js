/**
 * LinternaDemo — la mano enseña las dos acciones, sin sumar aciertos (window.LinternaDemo).
 *
 * 1. Zoe ya está en el campamento y la linterna entró en la intro.
 * 2. La mano toma la linterna y la lleva a la barriga: eso solo ilumina.
 * 3. La mano suelta la linterna y toca la barriga: recién ahí hay destello y risa.
 */
(function (global) {
    "use strict";

    var T = function () { return global.PedniaTutorial; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mano = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    function asegurarMano(p) {
        var t = T();
        if (!t) return null;
        if (!mano || !mano.isConnected) {
            mano = t.crearMano();
            mano.style.transition = "none";
            if (p) t.puntaManoEn(mano, p.x + 120, p.y + 140);
            void mano.offsetWidth;
        }
        return mano;
    }

    function manoA(p, ms) {
        var t = T();
        var m = asegurarMano(p);
        if (!t || !m || !p) return sleep(ms || 0);
        t.faseMano(m, "viajar");
        m.style.transition = ms > 0 ? "transform " + ms + "ms cubic-bezier(0.4, 0, 0.2, 1)" : "none";
        t.puntaManoEn(m, p.x, p.y);
        return sleep((ms || 0) + 30);
    }

    function presionar(on) {
        var t = T();
        if (t && mano) t.faseMano(mano, on ? "presionar" : "viajar");
    }

    /** La mano va pegada a la linterna mientras esta se desliza. No toca todavía. */
    async function seguirLuz(api, ms) {
        var fin = Date.now() + ms;
        while (Date.now() < fin) {
            if (api.cancelado()) return;
            var p = api.agarre ? api.agarre() : api.luzPantalla();
            if (p) await manoA(p, 0);
            await sleep(40);
        }
    }

    async function jugar(api) {
        api.preparar();
        var luz = api.agarre ? api.agarre() : api.luzPantalla();
        await manoA(luz || { x: 80, y: 80 }, 500);
        if (api.cancelado()) return;
        var viaje = api.moverLuz("barriga", reducido ? 200 : 1200);
        await seguirLuz(api, reducido ? 200 : 1200);
        await viaje;
        if (api.cancelado()) return;
        await sleep(350);
        var barriga = api.punto("barriga");
        await manoA(barriga, 420);
        presionar(true);
        await sleep(180);
        var reaccion = api.reaccionar("barriga");
        await sleep(160);
        presionar(false);
        if (barriga) await manoA({ x: barriga.x + 110, y: barriga.y + 90 }, 320);
        await reaccion;
    }

    async function correr(api) {
        var t = api.textos();
        try {
            if (t.demostracion) await Promise.race([api.decir(t.demostracion), sleep(7000)]);
            if (!api.cancelado()) await jugar(api);
            if (!api.cancelado() && t.demostracionFin) await Promise.race([api.decir(t.demostracionFin), sleep(5000)]);
        } catch (e) {
            console.warn("[LinternaDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        api.terminar();
    }

    global.LinternaDemo = { correr: correr };
})(window);
