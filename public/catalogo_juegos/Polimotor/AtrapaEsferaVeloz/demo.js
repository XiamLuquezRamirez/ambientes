/**
 * EsferaDemo — demostración automática antes de jugar (window.EsferaDemo).
 * Corre sola sobre el túnel real, con el toque bloqueado (body.demo-lock) y la mano de PedniaTutorial. No cuenta.
 *   1. Sale una esfera por una tubería.     2. La mano espera junto al anillo mientras la esfera se acerca.
 *   3. El anillo se prepara y se pone verde. 4. La mano toca justo cuando la esfera está dentro del anillo.
 *   5. La esfera queda capturada (onda, partículas, luces del túnel).
 * Zeus: "¡Ojos muy abiertos! Toca cuando la esfera llegue al anillo."
 * Cada paso tiene respaldo por tiempo: nunca se queda bloqueada.
 */
(function (global) {
    "use strict";

    var T = function () { return global.PedniaTutorial || null; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mano = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
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

    function quitarMano() {
        if (T()) T().quitarManos();
        mano = null;
    }

    async function correr(api) {
        try {
            var voz = api.decir(api.textos().demoZeus);
            var vuelo = api.lanzar();
            var c = api.puntoAnillo();
            var rPx = api.radioAnilloPx();
            // la mano espera abajo del anillo (no tapa a la esfera)
            await manoA({ x: c.x + rPx * 0.35, y: c.y + rPx * 1.55 }, 0);
            fase("viajar");
            // espera a que la esfera esté justo en el centro del anillo (respaldo: 14 s; antes rebota en un espejo)
            var t0 = Date.now(), subio = false;
            while (!api.cancelado() && Date.now() - t0 < 14000) {
                var st = api.estado();
                if (st.activa && st.tray && st.t >= st.tray.tc - 0.12) break;
                if (!subio && st.activa && st.tray && st.t >= st.tray.tc - st.tray.ventana - 0.5) {
                    // se acerca: la mano sube hacia el anillo
                    subio = true;
                    await manoA({ x: c.x + rPx * 0.25, y: c.y + rPx * 0.75 }, 260);
                }
                await sleep(30);
            }
            if (api.cancelado()) return;
            fase("presionar");
            api.tocar();
            await sleep(reducido ? 150 : 380);
            fase("viajar");
            await manoA({ x: c.x + rPx * 0.35, y: c.y + rPx * 1.55 }, 420);
            await Promise.race([vuelo, sleep(5000)]);
            quitarMano();
            api.felicitar();
            await Promise.race([voz, sleep(4000)]);
            await sleep(600);
        } catch (e) {
            console.warn("[EsferaDemo]", e);
        }
        quitarMano();
        await api.terminar();
    }

    global.EsferaDemo = { correr: correr };
})(window);
