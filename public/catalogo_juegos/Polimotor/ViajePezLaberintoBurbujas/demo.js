/**
 * PezDemo — demostración automática antes de jugar (window.PezDemo). Arranca sola, sin botón.
 *
 * Se hace sobre un camino de muestra real (no es ninguno de los cuatro recorridos) con el input bloqueado
 * (body.demo-lock) y no cuenta. De PedniaTutorial solo se usa la mano.
 *   1. El pez espera en la concha de salida; Zeus: "¡Lleva al pececito por el agua, despacio y siguiendo el
 *      camino hasta su hogar!". La mano aparece, presiona al pez y lo toma.
 *   2. La mano lo arrastra por la primera curva y un pequeño giro (mismo nado del juego: burbujas, cola, luces).
 *   3. A mitad de camino la mano se desvía un poco: el camino se pone rojo y suena la alerta; la mano corrige
 *      y el pez vuelve al agua (el camino recupera su color).
 *   4. El pez llega al coral, entra en su cueva y Zoe dice "¡Muy bien! Así se hace. ¡Ahora es tu turno!".
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

    /**
     * La mano arrastra al pez por el centro del camino principal de u0 a u1 (fracciones del largo), cuadro a
     * cuadro (setTimeout). desvio(u) devuelve cuánto se aparta del centro (en anchos de camino) en ese punto.
     */
    function pilotar(api, u0, u1, ms, desvio) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var t = T();
            if (mano) mano.style.transition = "none";
            var paso = function () {
                if (api.cancelado()) { resolve(); return; }
                var k = Math.min(1, (performance.now() - t0) / ms);
                var e = k < 0.1 ? k * k / 0.2 : (k > 0.9 ? 1 - (1 - k) * (1 - k) / 0.2 : k);   // arranca y frena suave
                var u = u0 + (u1 - u0) * e;
                var w = api.puntoCamino(Math.min(1, u));
                var off = desvio ? desvio(u) : 0;
                if (off) {
                    var a = w.ang + Math.PI / 2;
                    w = { x: w.x + Math.cos(a) * off * api.ancho(), y: w.y + Math.sin(a) * off * api.ancho(), ang: w.ang };
                }
                api.mover(w);
                var s = api.aPantalla(w);
                if (t && mano) t.puntaManoEn(mano, s.x, s.y);
                if (k >= 1 || api.llego()) {
                    resolve();
                    return;
                }
                setTimeout(paso, 16);
            };
            paso();
        });
    }

    async function correr(api) {
        try {
            api.preparar();
            // 1) Zeus explica; la mano llega al pez en la concha y lo toma
            var vozZeus = api.decirZeus(api.textos().demoZeus);
            var c = api.puntoPez();
            fase("viajar");
            await manoA({ x: c.x - 90, y: c.y + 130 }, 0);
            await sleep(500);
            await manoA(c, 900);
            if (api.cancelado()) return;
            fase("presionar");
            api.tomar();
            await sleep(500);
            // 2) primera curva y un pequeño giro
            await pilotar(api, 0, 0.42, reducido ? 300 : 3600);
            await Promise.race([vozZeus, sleep(1200)]);
            if (api.cancelado()) return;
            // 3) se aparta un poco del camino (alerta en rojo) y vuelve
            var vozDesvio = api.decir(api.textos().demoDesvio);
            await pilotar(api, 0.42, 0.56, reducido ? 300 : 2600, function (u) {
                var k = (u - 0.42) / 0.14;
                return Math.sin(Math.min(1, Math.max(0, k)) * Math.PI) * 0.82;
            });
            await Promise.race([vozDesvio, sleep(900)]);
            if (api.cancelado()) return;
            // 4) sigue hasta el coral
            await pilotar(api, 0.56, 1, reducido ? 300 : 4200);
            api.soltar();
            fase("viajar");
            var m = api.puntoPez();
            await manoA({ x: m.x + 60, y: m.y + 140 }, 420);
            if (T()) T().quitarManos();
            mano = null;
            await api.felicitar();
        } catch (e) {
            console.warn("[PezDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.PezDemo = { correr: correr };
})(window);
