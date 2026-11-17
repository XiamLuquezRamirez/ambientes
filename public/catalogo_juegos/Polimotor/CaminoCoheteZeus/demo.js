/**
 * CoheteDemo — demostración automática antes de jugar (window.CoheteDemo). Arranca sola, sin botón.
 *
 * Se hace sobre una pista de muestra real (no es ninguno de los cuatro recorridos) con el input bloqueado
 * (body.demo-lock) y no cuenta. De PedniaTutorial solo se usa la mano.
 *   1. Zoe: "¡Mira! La estrella fugaz nos muestra el camino." Una estrella fugaz sale de la plataforma y
 *      recorre despacio el camino correcto hasta la estación (enseña dónde empezar, qué camino y la meta).
 *   2. La mano aparece junto al cohete, lo presiona y lo arrastra por el centro de la pista: el cohete usa el
 *      mismo pilotaje del juego (luces, humo, estela) y llega a la estación.
 *   3. "¡Así se hace!" y Zoe: "¡Mira cómo se hace! Sigue el camino de luces sin salirte de la pista.
 *      ¡Ahora es tu turno!".
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

    /** La mano arrastra el cohete por el centro del camino principal, cuadro a cuadro (setTimeout). */
    function pilotar(api, ms) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var t = T();
            if (mano) mano.style.transition = "none";
            var paso = function () {
                if (api.cancelado()) { resolve(); return; }
                var u = Math.min(1, (performance.now() - t0) / ms);
                var e = u < 0.08 ? u * u / 0.16 : (u > 0.92 ? 1 - (1 - u) * (1 - u) / 0.16 : u); // arranca y frena suave
                var w = api.puntoCamino(Math.min(1, e * 1.02));
                api.mover(w);
                var s = api.aPantalla(w);
                if (t && mano) t.puntaManoEn(mano, s.x, s.y);
                if (u >= 1 || api.llego()) {
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
            // 1) la estrella fugaz enseña el camino
            var voz = api.decir(api.textos().demoEstrella);
            await api.estrella(reducido ? 300 : 4200);
            await Promise.race([voz, sleep(1500)]);
            if (api.cancelado()) return;
            // 2) la mano toma el cohete y lo lleva por la pista
            var c = api.puntoCohete();
            fase("viajar");
            await manoA({ x: c.x - 90, y: c.y + 120 }, 0);
            await sleep(250);
            await manoA(c, 800);
            if (api.cancelado()) return;
            fase("presionar");
            api.tomar();
            await sleep(450);
            await pilotar(api, reducido ? 400 : 7600);
            api.soltar();
            fase("viajar");
            var m = api.puntoCohete();
            await manoA({ x: m.x + 60, y: m.y + 140 }, 420);
            if (T()) T().quitarManos();
            mano = null;
            await api.felicitar();
        } catch (e) {
            console.warn("[CoheteDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.CoheteDemo = { correr: correr };
})(window);
