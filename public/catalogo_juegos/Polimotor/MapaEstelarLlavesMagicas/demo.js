/**
 * MapaDemo — demostración automática antes de jugar (window.MapaDemo). Arranca sola, sin botón.
 *
 * Se hace sobre un laberinto pequeño de muestra (config.demoLaberinto; no es el del juego) con el input bloqueado
 * (body.demo-lock) y no cuenta. De PedniaTutorial solo se usa la mano. La nave se mueve con el MISMO movimiento del
 * juego (ReglasMapa.mover a través de la escena) y las zonas disparan las mismas reacciones que en la partida:
 *   1. La mano aparece, señala la nave en la salida, la presiona y la toma.
 *   2. Llega al primer cruce (destellos en las salidas) y entra a un camino sin salida: aparece la barrera
 *      espacial y Zeus dice "¡Camino cerrado! …"; la mano regresa la nave al cruce.
 *   3. Toma el otro camino y recoge la llave roja (gira, se eleva y entra en órbita).
 *   4. Recoge la llave verde y la azul.
 *   5. Lleva la nave al portal: las llaves van a sus candados y el portal se abre.
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

    function seguirNave(api) {
        var t = T();
        if (!t || !mano) return;
        var sp = api.pantallaNave();
        mano.style.transition = "none";
        t.puntaManoEn(mano, sp.x, sp.y);
    }

    /** Lleva la nave al centro de un nodo; espera mientras el juego anima (llave, portal) y retoma después. */
    function irA(api, nodo, maxMs) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var tick = function () {
                if (api.cancelado()) { resolve(false); return; }
                if (api.ocupado()) {
                    seguirNave(api);
                    t0 += 16;
                    setTimeout(tick, 16);
                    return;
                }
                api.guiar(nodo.x, nodo.y);
                seguirNave(api);
                var p = api.nave();
                if (Math.hypot(p.x - nodo.x, p.y - nodo.y) < 0.05 || performance.now() - t0 > (maxMs || 6000)) {
                    resolve(true);
                    return;
                }
                setTimeout(tick, 16);
            };
            tick();
        });
    }

    function esperarLibre(api, maxMs) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var tick = function () {
                seguirNave(api);
                if (api.cancelado() || !api.ocupado() || performance.now() - t0 > (maxMs || 12000)) { resolve(); return; }
                setTimeout(tick, 40);
            };
            tick();
        });
    }

    async function correr(api) {
        try {
            api.preparar();
            var ruta = api.ruta();
            // 1) la mano señala la nave y la toma
            var p = api.pantallaNave();
            fase("viajar");
            await manoA({ x: p.x + 90, y: p.y + 150 }, 0);
            await sleep(350);
            await manoA(p, 900);
            if (api.cancelado()) return;
            fase("presionar");
            await sleep(350);
            api.tomar();
            await sleep(300);
            // 2) a 5) el recorrido: cruce, camino sin salida, regreso, tres llaves y portal
            for (var i = 1; i < ruta.length; i++) {
                var n = ruta[i];
                await irA(api, n, 7000);
                if (api.cancelado()) return;
                if (n.pausa) await sleep(n.pausa);
                await esperarLibre(api, 12000);
                if (api.cancelado()) return;
            }
            api.soltar();
            fase("viajar");
            var m = api.pantallaNave();
            await manoA({ x: m.x - 60, y: m.y + 150 }, 420);
            if (T()) T().quitarManos();
            mano = null;
            await esperarLibre(api, 12000);
            await api.felicitar();
        } catch (e) {
            console.warn("[MapaDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.MapaDemo = { correr: correr };
})(window);
