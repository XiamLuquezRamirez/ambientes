/**
 * TiroDemo — demostración automática antes de jugar (window.TiroDemo).
 * Corre sola sobre la arena real, con el toque bloqueado (body.demo-lock) y la mano de PedniaTutorial. No cuenta.
 *   1. La diana se desplaza horizontalmente.      2. El lanzador se ilumina.
 *   3. La mano toca el lanzador.                  4. Arrastra para ajustar el ángulo (trayectoria punteada).
 *   5. La diana muestra su sombra fantasma.       6. El disco sale, viaja y 7. impacta: puntos.
 * Zoe: "¡Apunta un poquito adelante de la diana para que el disco la encuentre en el aire!"
 * Tiene respaldo por tiempo en cada paso: nunca se queda bloqueada.
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

    function quitarMano() {
        if (T()) T().quitarManos();
        mano = null;
    }

    /** Un tiro de la demo: tocar el lanzador, arrastrar siguiendo la solución y soltar. */
    async function tiro(api) {
        var o = api.origen();
        var pO = api.aPantalla(o.x, o.y);
        await manoA({ x: pO.x + 140, y: pO.y + 40 }, 0);
        fase("viajar");
        await manoA(pO, 600);
        if (api.cancelado()) return null;
        fase("presionar");
        await sleep(200);
        api.apuntar(o.x, o.y - 10);
        // arrastre: la mira va hacia la solución, que se recalcula cada cuadro porque la diana se mueve
        var t0 = Date.now(), dur = reducido ? 200 : 1500;
        var sol = null;
        while (!api.cancelado()) {
            var u = Math.min(1, (Date.now() - t0) / dur);
            var k = u * u * (3 - 2 * u);
            sol = api.solucion() || sol || { dx: 0, dy: -200 };
            var x = o.x + sol.dx * k, y = o.y - 10 + (sol.dy + 10) * k;
            api.apuntar(x, y);
            var p = api.aPantalla(x, y);
            await manoA(p, 0);
            if (u >= 1) break;
            await sleep(16);
        }
        if (api.cancelado()) return null;
        // un momento más siguiendo a la diana con la mira, y suelta
        var tFin = Date.now() + 350;
        while (Date.now() < tFin && !api.cancelado()) {
            sol = api.solucion() || sol;
            api.apuntar(o.x + sol.dx, o.y + sol.dy);
            await manoA(api.aPantalla(o.x + sol.dx, o.y + sol.dy), 0);
            await sleep(16);
        }
        fase("viajar");
        var res = api.soltar(sol.dx, sol.dy);
        await sleep(150);
        quitarMano();
        return Promise.race([res, sleep(4500).then(function () { return null; })]);
    }

    async function correr(api) {
        try {
            await Promise.race([api.preparar(), sleep(3000)]);
            if (api.cancelado()) return;
            // 1. la diana se desplaza horizontalmente
            await sleep(1300);
            if (api.cancelado()) return;
            // 2. el lanzador se ilumina
            api.iluminar(true);
            await sleep(700);
            // 5. sombra fantasma (aparece mientras la mano apunta) y la voz de Zoe
            api.sombra();
            var voz = api.decir(api.textos().demoZoe, "zoe");
            var res = await tiro(api);
            api.iluminar(false);
            // si por algún motivo no acertó, un segundo intento corto (la demo siempre muestra un impacto)
            if (!api.cancelado() && (!res || !res.acierto)) {
                await sleep(400);
                api.sombra();
                res = await tiro(api);
            }
            await sleep(900);
            await Promise.race([voz, sleep(3500)]);
        } catch (e) {
            console.warn("[TiroDemo]", e);
        }
        quitarMano();
        await api.terminar();
    }

    global.TiroDemo = { correr: correr };
})(window);
