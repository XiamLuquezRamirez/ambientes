/**
 * AnillosDemo — demostración automática antes de jugar (window.AnillosDemo). Arranca sola, sin botón, y no cuenta.
 *
 * De PedniaTutorial solo se usa la mano. La mano mueve el anillo rojo con el MISMO arrastre del juego
 * (EscenarioAnillos.demoTomar / demoMover / demoSoltar); el lanzamiento lo hace la escena real:
 *   1. Zeus junto al cono señala; los tres anillos esperan en sus cojines.
 *   2. La mano viaja hasta el anillo rojo, lo señala y lo presiona (el anillo se resalta).
 *   3. Aparece la trayectoria punteada de luz hasta la punta del cono.
 *   4. La mano desliza el anillo hacia arriba, hacia el cono, y lo suelta.
 *   5. El anillo vuela girando, atraviesa el mástil y queda ensartado; el cono destella y Zeus celebra.
 *   6. El anillo vuelve a su cojín (la demo no cuenta).
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

    /** Mueve la mano paso a paso con setTimeout (avanza aunque el navegador no pinte). */
    function manoA(p, ms, alPaso) {
        var t = T();
        var m = asegurarMano(p);
        if (!p) return sleep(ms || 0);
        if (!t || !m) {
            if (alPaso) alPaso(p);
            return sleep(ms || 0);
        }
        m.style.transition = "none";
        var ini = m.__p || p;
        var t0 = performance.now();
        var dur = Math.max(1, reducido ? Math.min(ms, 150) : (ms || 0));
        return new Promise(function (resolve) {
            var paso = function () {
                var u = Math.min(1, (performance.now() - t0) / dur);
                var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                var q = { x: ini.x + (p.x - ini.x) * e, y: ini.y + (p.y - ini.y) * e };
                t.puntaManoEn(m, q.x, q.y);
                m.__p = q;
                if (alPaso) alPaso(q);
                if (u < 1) setTimeout(paso, 16);
                else resolve();
            };
            paso();
        });
    }

    function fase(nombre) {
        var t = T();
        if (t && mano) t.faseMano(mano, nombre);
    }

    async function correr(api) {
        try {
            var id = api.anillo();
            var p = api.puntoAnillo(id);
            if (!p) return;
            api.zeusGesto("senala");
            var voz = api.decir("demoToma", "zeus");
            // 1-2) la mano llega al anillo rojo y lo señala
            fase("viajar");
            await manoA({ x: p.x + 160, y: p.y + 120 }, 0);
            await sleep(250);
            await manoA({ x: p.x, y: p.y }, 800);
            if (api.cancelado()) return;
            api.resaltar(id);
            fase("presionar");
            await sleep(500);
            api.tomar(id);
            await Promise.race([voz, sleep(2600)]);
            if (api.cancelado()) return;
            // 3) trayectoria punteada hasta el cono
            api.guia(id, 1);
            api.destello(true);
            var voz2 = api.decir("demoDesliza", "zoe");
            await sleep(900);
            // 4) desliza hacia arriba, apuntando al cono, y suelta
            fase("llegar");
            var c = api.puntoCono();
            var fin = { x: p.x + (c.x - p.x) * 0.22, y: p.y - Math.max(120, (p.y - c.y) * 0.4) };
            await manoA(fin, 650, function (q) { api.mover(q); });
            api.guia(null);
            fase("viajar");
            var acierto = await api.soltar(id);
            await manoA({ x: fin.x + 140, y: fin.y + 160 }, 420);
            if (T()) T().quitarManos();
            mano = null;
            if (acierto) await api.felicitar();
            await Promise.race([voz2, sleep(1500)]);
        } catch (err) {
            console.warn("[AnillosDemo]", err);
        }
        if (T()) T().quitarManos();
        mano = null;
        api.guia(null);
        api.destello(false);
        api.resaltar(null);
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.AnillosDemo = { correr: correr };
})(window);
