/**
 * ArdillaDemo — demostración automática antes de jugar (window.ArdillaDemo). Arranca sola, sin botón.
 *
 * Se hace sobre un recorrido de muestra (no es ninguno de los cuatro) con el input bloqueado (body.demo-lock) y no
 * cuenta. De PedniaTutorial solo se usa la mano.
 *   1. Zeus: "¡Mira cómo lo hago! …". La mano aparece, señala la bellota y la toma.
 *   2. La bellota avanza por la ruta que tiene el tronco (mismo arrastre del juego: hojitas, destellos, ardilla).
 *   3. Se acerca al tronco (tiembla) y lo rodea suavemente por el lado libre.
 *   4. Sigue hasta la cesta; la bellota cae dentro y la ardilla celebra.
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
     * La mano lleva la bellota por la ruta de s0 a s1 (distancias en la ruta), cuadro a cuadro. desvio(s) dice cuánto
     * se aparta del centro (en anchos, positivo = a la izquierda de la marcha) en ese punto.
     */
    function pilotar(api, ruta, s0, s1, ms, desvio) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var t = T();
            if (mano) mano.style.transition = "none";
            var paso = function () {
                if (api.cancelado()) { resolve(); return; }
                var k = Math.min(1, (performance.now() - t0) / ms);
                var e = k < 0.1 ? k * k / 0.2 : (k > 0.9 ? 1 - (1 - k) * (1 - k) / 0.2 : k);
                var s = s0 + (s1 - s0) * e;
                var w = api.puntoRuta(ruta, s);
                var off = desvio ? desvio(s) : 0;
                if (off) {
                    var a = w.ang - Math.PI / 2;
                    w = { x: w.x + Math.cos(a) * off * api.ancho(), y: w.y + Math.sin(a) * off * api.ancho(), ang: w.ang };
                }
                api.mover(w);
                var sp = api.aPantalla(api.puntoBellotaMundo());
                if (t && mano) t.puntaManoEn(mano, sp.x, sp.y);
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
            var vozZeus = api.decirZeus(api.textos().demoZeus);
            // 1) la mano señala la bellota y la toma
            var c = api.aPantalla(api.puntoBellotaMundo());
            fase("viajar");
            await manoA({ x: c.x - 90, y: c.y + 140 }, 0);
            await sleep(400);
            await manoA(c, 900);
            if (api.cancelado()) return;
            fase("presionar");
            await sleep(350);
            api.tomar();
            await sleep(350);
            // 2) y 3) por la ruta del tronco: se acerca, lo rodea por el lado libre y sigue
            var ruta = api.rutaObstaculos();
            var ob = api.obstaculo();
            var w = api.ancho();
            var sObs = ob ? ob.s : ruta.largo * 0.5;
            // se aparta hacia el lado libre lo justo para pasar (el mismo desvío con que se valida el recorrido)
            var rodear = function (s) { return api.desvio(s) / w; };
            await pilotar(api, ruta, 0, sObs - w * 1.6, reducido ? 300 : 2400, rodear);
            if (api.cancelado()) return;
            await sleep(250);
            await pilotar(api, ruta, sObs - w * 1.6, sObs + w * 1.6, reducido ? 300 : 2600, rodear);
            await Promise.race([vozZeus, sleep(800)]);
            if (api.cancelado()) return;
            // 4) hasta la cesta
            await pilotar(api, ruta, sObs + w * 1.6, ruta.largo, reducido ? 300 : 2600, rodear);
            api.soltar();
            fase("viajar");
            var m = api.aPantalla(api.puntoBellotaMundo());
            await manoA({ x: m.x + 60, y: m.y + 140 }, 420);
            if (T()) T().quitarManos();
            mano = null;
            await api.felicitar();
        } catch (e) {
            console.warn("[ArdillaDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.ArdillaDemo = { correr: correr };
})(window);
