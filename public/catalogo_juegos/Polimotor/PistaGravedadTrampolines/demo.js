/**
 * GravedadDemo — demostración automática antes de jugar (window.GravedadDemo). Arranca sola, sin botón.
 *
 * Se hace en una pista corta de práctica (config.demoPista) con el input del niño bloqueado (body.demo-lock); no
 * cuenta. De PedniaTutorial solo se usa la mano. La mano "arrastra" la esfera con el MISMO control del juego (un punto
 * de la pista hacia el que rueda) y todo lo demás es la mecánica real:
 *   1. La mano aparece junto a la esfera, presiona la pista y la esfera empieza a rodar hacia el dedo.
 *   2. Cambia de dirección para pasar por el carril libre junto al agujero (se enciende la alerta y no cae).
 *   3. Llega al trampolín amarillo: se comprime, la esfera salta sobre el muro (sombra de aterrizaje) y aterriza.
 *   4. Rueda hasta la plataforma de meta.
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

    function manoSigue(p) {
        var t = T();
        if (!t || !mano || !p) return;
        mano.style.transition = "transform 120ms linear";
        t.puntaManoEn(mano, p.x, p.y);
    }

    function fase(nombre) {
        var t = T();
        if (t && mano) t.faseMano(mano, nombre);
    }

    async function correr(api) {
        try {
            var R = global.ReglasGravedad;
            var P = api.pista();
            var b = api.esfera();
            var pe = api.pantallaDe(b.x, b.h + 0.4, b.z);
            // 1) la mano aparece y presiona la pista delante de la esfera
            fase("viajar");
            await manoA({ x: pe.x + 80, y: pe.y + 140 }, 0);
            await sleep(300);
            var o0 = R.puntoAdelante(P, b.x, b.z, 1.6);
            await manoA(api.pantallaDe(o0.x, o0.h, o0.z), 800);
            if (api.cancelado()) return;
            fase("presionar");
            api.decir("demoMover");
            await sleep(300);
            // 2) a 4) la mano lleva el dedo por delante de la esfera; el juego hace el resto
            var dicho = {};
            var t0 = performance.now();
            while (!api.cancelado() && performance.now() - t0 < 45000) {
                var e = api.esfera();
                if (!e) break;
                if (e.modo === "meta") break;
                if (e.modo === "rueda") {
                    var o = R.puntoAdelante(P, e.x, e.z, 1.7);
                    api.objetivo(o.x, o.z);
                    manoSigue(api.pantallaDe(o.x, o.h, o.z));
                    // avisos en el momento justo: junto al agujero y antes del trampolín
                    P.agujeros.forEach(function (A) {
                        if (!dicho.agujero && Math.hypot(e.x - A.x, e.z - A.z) < A.r + 2.2) {
                            dicho.agujero = true;
                            api.decir("demoAgujero");
                        }
                    });
                    P.trampolines.forEach(function (Tr) {
                        if (!dicho.trampolin && Math.hypot(e.x - Tr.x, e.z - Tr.z) < 3.4) {
                            dicho.trampolin = true;
                            api.decir("demoTrampolin");
                        }
                    });
                } else {
                    // en el aire: la mano se aparta un poco y sigue a la esfera
                    var pe2 = api.pantallaDe(e.x, e.h + 1, e.z);
                    manoSigue({ x: pe2.x + 60, y: pe2.y + 120 });
                }
                await sleep(60);
            }
            api.soltar();
            fase("viajar");
            var pm = api.pantallaEsfera();
            await manoA({ x: pm.x - 60, y: pm.y + 160 }, 420);
            if (T()) T().quitarManos();
            mano = null;
            await api.esperarMeta();
            await api.felicitar();
        } catch (err) {
            console.warn("[GravedadDemo]", err);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.GravedadDemo = { correr: correr };
})(window);
