/**
 * MemoPosturasDemo — demostración automática antes de jugar (window.MemoPosturasDemo). La narra Zeus.
 *
 * Arranca sola al terminar la presentación (sin botón de por medio), sobre el mural real de la ronda 1,
 * con las tarjetas bloqueadas para el niño; no cuenta como jugada.
 *
 * La demo enseña EXACTAMENTE el error que el juego quiere evitar: confundir una postura con su reflejo.
 * Por eso elige la postura A de la ronda y su espejo B (la misma postura del otro lado):
 *    1. La mano toca una tarjeta de A: se voltea y Zeus nombra la postura.
 *    2. Toca una de B: se voltea. Se parece, pero cambia el lado → "¡Ojo con el lado!".
 *       Los dos distintivos D/I se resaltan y las dos tarjetas se vuelven a esconder.
 *    3. "Ahora busco la que sí tiene la misma mano…": vuelve a A y toca la OTRA A → pareja dorada.
 *    4. "¡Ahora es tu turno! ¡Encuentra todas las parejas!" y script.js cierra todo antes del botón.
 *
 * De PedniaTutorial solo se usa la mano.
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

    /**
     * Elige para la demo una postura A con sus dos tarjetas y una postura B que sea su REFLEJO (si la
     * ronda lo tiene; si no, cualquier otra postura). Devuelve { a: [i, j], b: k, idA, idB }.
     */
    function elegir(api) {
        var orden = api.orden();
        var porTipo = {};
        orden.forEach(function (t, i) {
            (porTipo[t] = porTipo[t] || []).push(i);
        });
        var ids = Object.keys(porTipo);
        var idA = null;
        var idB = null;
        // se prefiere un par postura/reflejo: es lo que la demo tiene que explicar
        ids.some(function (id) {
            var esp = api.espejoDe(id);
            if (esp && porTipo[esp]) {
                idA = id;
                idB = esp;
                return true;
            }
            return false;
        });
        if (!idA) {
            idA = ids[0];
            idB = ids.find(function (id) { return id !== idA; });
        }
        if (!idA || !idB || porTipo[idA].length < 2) return null;
        return { a: porTipo[idA], b: porTipo[idB][0], idA: idA, idB: idB };
    }

    async function correr(api) {
        try {
            var elec = elegir(api);
            if (!elec) return;
            var a1 = elec.a[0];
            var a2 = elec.a[1];
            var b = elec.b;

            // la mano empieza abajo, fuera del mural
            var z = api.puntoCarta(a1);
            if (z) await manoA({ x: z.x + 40, y: z.y + 260 }, 0);

            var voz = api.decir(api.texto("demoUno"));
            await tocar(api, a1);
            await Promise.race([voz, sleep(3200)]);
            if (api.cancelado()) return;

            // la del reflejo: se parece, pero el lado es otro
            voz = api.decir(api.texto("demoDistinta"));
            await tocar(api, b);
            await Promise.race([voz, sleep(6500)]);
            if (api.cancelado()) return;
            await api.noIguales(a1, b, elec.idA, elec.idB);
            if (api.cancelado()) return;

            voz = api.decir(api.texto("demoOtraVez"));
            await tocar(api, a1);
            await Promise.race([voz, sleep(4000)]);
            await tocar(api, a2);
            if (api.cancelado()) return;
            voz = api.decir(api.texto("demoIgual"));
            await api.pareja(a1, a2, elec.idA);
            await Promise.race([voz, sleep(3500)]);
        } catch (e) {
            console.warn("[MemoPosturasDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.MemoPosturasDemo = { correr: correr };
})(window);
