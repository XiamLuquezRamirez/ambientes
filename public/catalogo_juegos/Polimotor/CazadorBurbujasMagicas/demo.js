/**
 * BurbujasDemo — micro-tutorial automático antes de jugar (window.BurbujasDemo).
 *
 * Se hace sobre la escena real, con el toque bloqueado (body.demo-lock) y la mano de PedniaTutorial.
 * No cuenta: no suma estrellas ni rondas, y la estrella de la demo se saca de la canasta al terminar.
 *   1. Sale una burbuja con una estrella y sube despacio (Zeus: "¡Síguela con la vista…!").
 *   2. La mano aparece y la sigue mientras sube.
 *   3. La mano la toca: la burbuja estalla y la estrella cae en la canasta de Zoe.
 *   4. "¡Así se hace!" y Zoe: "¡Muy bien! Ahora te toca a ti." (script.js muestra luego el botón).
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
        m.style.transition = ms > 0 ? "transform " + ms + "ms linear" : "none";
        t.puntaManoEn(m, p.x, p.y);
        return sleep((ms || 0) + 20);
    }

    function fase(nombre) {
        var t = T();
        if (t && mano) t.faseMano(mano, nombre);
    }

    /**
     * La mano acompaña a la burbuja (un poco abajo a la derecha, sin taparla) durante ms. Se mueve cuadro a
     * cuadro con setTimeout y sin transición CSS: así no se queda atrás aunque el navegador no anime.
     */
    async function seguir(api, id, ms) {
        var fin = Date.now() + ms;
        while (Date.now() < fin && !api.cancelado()) {
            var p = api.punto(id);
            if (!p) return;
            await manoA({ x: p.x + p.r * 0.7, y: p.y + p.r * 0.8 }, 0);
        }
    }

    async function correr(api) {
        try {
            api.preparar();
            var id = api.soltar();
            if (id == null) return;
            var voz = api.decir(api.textos().instruccionZeus, "zeus");
            await sleep(1900);
            if (api.cancelado()) return;
            var p = api.punto(id);
            if (p) await manoA({ x: p.x + p.r * 0.7, y: p.y + p.r * 0.8 }, 0);
            fase("viajar");
            await seguir(api, id, 2600);
            await Promise.race([voz, sleep(2500)]);
            if (api.cancelado()) return;
            // toca la burbuja
            // se acerca al centro de la burbuja en pasitos (también sin transición CSS)
            for (var k = 1; k <= 10; k++) {
                p = api.punto(id);
                if (!p) break;
                await manoA({ x: p.x + p.r * 0.7 * (1 - k / 10), y: p.y + p.r * 0.8 * (1 - k / 10) }, 0);
            }
            fase("presionar");
            await sleep(170);
            var cae = api.reventar(id);
            await sleep(240);
            fase("viajar");
            var c = api.canasta();
            if (c) manoA({ x: c.x + 60, y: c.y - 30 }, 900);
            var voz2 = api.decir(api.textos().demoToca, "zoe");
            await Promise.race([cae, sleep(2500)]);
            api.cartel(api.textos().demostracionBien);
            await Promise.race([voz2, sleep(3500)]);
        } catch (e) {
            console.warn("[BurbujasDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado() && api.textos().demoFin) {
            await Promise.race([api.decir(api.textos().demoFin, "zoe"), sleep(4500)]);
        }
        await api.terminar();
    }

    global.BurbujasDemo = { correr: correr };
})(window);
