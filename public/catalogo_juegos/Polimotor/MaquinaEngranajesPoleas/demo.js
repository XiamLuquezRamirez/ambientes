/**
 * MaquinaDemo — demostración automática del ensamblaje (window.MaquinaDemo).
 * La mano de PedniaTutorial toca la rueda más grande de la bandeja, la arrastra hasta su eje y la
 * suelta cuando el aro brilla. No cuenta: al terminar la rueda vuelve a la bandeja y el eje queda vacío.
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

    async function correr(api) {
        try {
            await api.preparar();
            if (api.cancelado()) return;
            var voz = api.decir(api.textoDemo());
            var id = api.pieza();
            var p = api.punto(id);
            if (!p) return;
            await manoA({ x: p.x - 160, y: p.y + 80 }, 0);
            fase("viajar");
            await manoA(p, 700);
            if (api.cancelado()) return;
            fase("presionar");
            await sleep(200);
            api.tomar(id);
            await sleep(420);
            var desde = api.punto(id);
            var t0 = Date.now();
            var dur = reducido ? 200 : 2100;
            while (!api.cancelado()) {
                var u = Math.min(1, (Date.now() - t0) / dur);
                var k = u * u * (3 - 2 * u);
                var b = api.destino(id);
                if (!b || !desde) break;
                var x = desde.x + (b.x - desde.x) * k;
                var y = desde.y + (b.y - desde.y) * k - Math.sin(u * Math.PI) * 60;
                api.mover(id, x, y);
                await manoA({ x: x, y: y }, 0);
                if (u >= 1) break;
                await sleep(16);
            }
            if (api.cancelado()) return;
            await sleep(260);
            fase("viajar");
            await api.entregar(id);
            quitar();
            await Promise.race([voz, sleep(2200)]);
        } catch (e) {
            console.warn("[MaquinaDemo]", e);
        }
        quitar();
        await api.terminar();
    }

    global.MaquinaDemo = { correr: correr };
})(typeof window !== "undefined" ? window : global);
