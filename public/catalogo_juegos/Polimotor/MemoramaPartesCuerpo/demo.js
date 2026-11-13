/**
 * MemoramaDemo — demostración automática antes de jugar (window.MemoramaDemo). La narra Zeus.
 *
 * Se hace sobre el tablero real de la ronda 1 con las tarjetas bloqueadas para el niño y no cuenta como jugada.
 * De PedniaTutorial solo se usa la mano. Pasos:
 *    1. La mano toca una tarjeta: se voltea y es una mano.
 *    2. Toca otra: es un pie. No son iguales: las dos se vuelven a esconder.
 *    3. "Yo recuerdo dónde estaba la mano": toca otra vez la mano y luego la otra mano → pareja dorada y aplausos.
 *    4. "¡Así se juega! Ahora te toca a ti." y script.js cierra todo antes del botón "¡A jugar!".
 */
(function (global) {
    "use strict";

    var T = function () { return global.PedniaTutorial || null; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mano = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 120) : ms); });
    }

    function asegurarMano(p) {
        var t = T();
        if (!t) return null;
        if (!mano || !mano.isConnected) {
            mano = t.crearMano();
            mano.style.transition = "none";
            if (p) t.puntaManoEn(mano, p.x, p.y);
            void mano.offsetWidth;
        }
        return mano;
    }

    function manoA(p, ms) {
        var t = T();
        var m = asegurarMano(p);
        if (!t || !m || !p) return sleep(ms || 0);
        m.style.transition = ms > 0 ? "transform " + ms + "ms cubic-bezier(0.4, 0, 0.2, 1)" : "none";
        t.puntaManoEn(m, p.x, p.y);
        return sleep((ms || 0) + 40);
    }

    function fase(nombre) {
        var t = T();
        if (t && mano) t.faseMano(mano, nombre);
    }

    /** La mano viaja hasta la tarjeta i, la toca y la tarjeta se voltea. */
    async function tocar(api, i) {
        var p = api.puntoCarta(i);
        if (!p) return;
        fase("viajar");
        await manoA({ x: p.x, y: p.y + 20 }, 700);
        if (api.cancelado()) return;
        fase("presionar");
        await sleep(220);
        await api.voltear(i, true);
        fase("viajar");
        await manoA({ x: p.x + 50, y: p.y + 90 }, 300);
    }

    async function correr(api) {
        try {
            var orden = api.orden();
            var manos = [];
            var otro = -1;
            orden.forEach(function (t, i) {
                if (t === "mano") manos.push(i);
                else if (otro < 0) otro = i;
            });
            if (manos.length < 2 || otro < 0) return;
            // la mano empieza abajo, fuera del tablero
            var z = api.puntoCarta(manos[0]);
            if (z) await manoA({ x: z.x + 40, y: z.y + 260 }, 0);

            var voz = api.decir(api.texto("demoUno"));
            await tocar(api, manos[0]);
            await Promise.race([voz, sleep(3000)]);
            if (api.cancelado()) return;

            voz = api.decir(api.texto("demoDistinta"));
            await tocar(api, otro);
            await Promise.race([voz, sleep(5500)]);
            await api.noIguales(manos[0], otro);
            if (api.cancelado()) return;

            voz = api.decir(api.texto("demoOtraVez"));
            await tocar(api, manos[0]);
            await Promise.race([voz, sleep(3500)]);
            await tocar(api, manos[1]);
            if (api.cancelado()) return;
            voz = api.decir(api.texto("demoIgual"));
            await api.pareja(manos[0], manos[1]);
            await Promise.race([voz, sleep(3500)]);
        } catch (e) {
            console.warn("[MemoramaDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.MemoramaDemo = { correr: correr };
})(window);
