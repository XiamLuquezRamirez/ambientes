/**
 * CanastaDemo — demostración automática de arrastrar y soltar (window.CanastaDemo).
 * Usa la mano de PedniaTutorial. No cuenta como juguete guardado: el objeto vuelve a su sitio.
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

    async function correr(api) {
        try {
            await api.preparar();
            if (api.cancelado()) return;
            var voz = api.decir(api.textoDemo(), "zeus");
            var id = api.objeto();
            var p = api.punto(id);
            if (!p) return;
            await manoA({ x: p.x + 140, y: p.y + 40 }, 0);
            fase("viajar");
            await manoA(p, 620);
            if (api.cancelado()) return;
            fase("presionar");
            await sleep(160);
            api.tomar(id);
            await sleep(180);
            var desde = api.punto(id);
            var t0 = Date.now();
            var dur = reducido ? 180 : 1200;
            while (!api.cancelado()) {
                var u = Math.min(1, (Date.now() - t0) / dur);
                var k = u * u * (3 - 2 * u);
                var b = api.destino(id);
                if (!b || !desde) break;
                var x = desde.x + (b.x - desde.x) * k;
                var y = desde.y + (b.y - desde.y) * k - Math.sin(u * Math.PI) * 36;
                api.mover(id, x, y);
                await manoA({ x: x, y: y }, 0);
                if (u >= 1) break;
                await sleep(16);
            }
            if (api.cancelado()) return;
            fase("viajar");
            await api.entregar(id);
            await sleep(200);
            if (T()) T().quitarManos();
            mano = null;
            await Promise.race([voz, sleep(2200)]);
        } catch (e) {
            console.warn("[CanastaDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        await api.terminar();
    }

    global.CanastaDemo = { correr: correr };
})(typeof window !== "undefined" ? window : global);
