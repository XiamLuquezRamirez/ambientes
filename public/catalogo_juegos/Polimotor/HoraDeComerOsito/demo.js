/**
 * ComerDemo — demostración automática antes de jugar (window.ComerDemo).
 * Sobre la escena real, con el toque bloqueado (body.demo-lock) y la mano de PedniaTutorial. No cuenta.
 *   1. El osito se mueve de izquierda a derecha.   2. Abre la boca.
 *   3. La mano toma la manzana.                    4. La arrastra hasta la boca.
 *   5. El osito come y celebra.                    (Zeus: "¡Mira! Espera a que abra la boca…")
 */
(function (global) {
    "use strict";

    var T = function () { return global.PedniaTutorial || null; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mano = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 150) : ms); });
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
        m.style.transition = ms > 0 ? "transform " + ms + "ms ease-in-out" : "none";
        t.puntaManoEn(m, p.x, p.y);
        return sleep((ms || 0) + 20);
    }

    function fase(nombre) {
        var t = T();
        if (t && mano) t.faseMano(mano, nombre);
    }

    async function correr(api) {
        try {
            await api.preparar();
            if (api.cancelado()) return;
            var voz = api.decir(api.textos().demoZeus, "zeus");
            // 1. el osito se mueve de izquierda a derecha
            await api.moverOso(2600);
            if (api.cancelado()) return;
            // 2. abre la boca
            await api.abrirBoca();
            // 3. la mano toma la manzana
            var id = api.frutaDemo();
            var p = api.punto(id);
            if (!p) return;
            await manoA({ x: p.x + 160, y: p.y + 60 }, 0);
            fase("viajar");
            await manoA(p, 650);
            fase("presionar");
            await sleep(180);
            api.tomar(id);
            await sleep(220);
            // 4. la arrastra despacito hasta la boca (cuadro a cuadro, sin transición CSS)
            var desde = api.punto(id);
            var t0 = Date.now(), dur = reducido ? 200 : 1300;
            while (!api.cancelado()) {
                var u = Math.min(1, (Date.now() - t0) / dur);
                var k = u * u * (3 - 2 * u);
                var b = api.boca();
                if (!b) break;
                var x = desde.x + (b.x - desde.x) * k + Math.sin(u * Math.PI) * 60;
                var y = desde.y + (b.y - desde.y) * k - Math.sin(u * Math.PI) * 50;
                api.mover(id, x, y);
                await manoA({ x: x, y: y }, 0);
                if (u >= 1) break;
                await sleep(16);
            }
            if (api.cancelado()) return;
            // 5. suelta: el osito come y celebra
            fase("viajar");
            var come = api.entregar(id);
            await sleep(200);
            if (T()) T().quitarManos();
            mano = null;
            await Promise.race([come, sleep(4000)]);
            await Promise.race([voz, sleep(2500)]);
        } catch (e) {
            console.warn("[ComerDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        await api.terminar();
    }

    global.ComerDemo = { correr: correr };
})(window);
