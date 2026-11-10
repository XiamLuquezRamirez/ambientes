/**
 * DondeDemo — demostración automática antes de jugar (window.DondeDemo).
 *
 * Se juega sobre el vestidor real con el arrastre deshabilitado (body.demo-lock) y sin contar aciertos.
 * De PedniaTutorial solo se usa la mano animada:
 *    1. Zeus está en la tarima y los cuatro accesorios flotan alrededor.
 *    2. Zeus pregunta "¿Dónde van las gafas de sol?".
 *    3. La mano toma las gafas y las lleva directo a los ojos; las gafas se encajan y Zeus hace su pose.
 *    4. Igual con el sombrero (cabeza), los tenis (pies) y la bufanda (cuello).
 *    5. Zeus, ya disfrazado, celebra; script.js lo desviste y muestra el botón "¡A jugar!".
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
            if (p) t.puntaManoEn(mano, p.x + 140, p.y + 160);
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

    /** La mano toma el accesorio, lo arrastra hasta su parte del cuerpo y Zeus reacciona como en el juego. */
    async function ponerAccesorio(api, id) {
        if (api.cancelado()) return;
        api.actual(id);
        await Promise.race([api.instruccion(id), sleep(5200)]);
        if (api.cancelado()) return;
        var desde = api.punto(id);
        var hasta = api.puntoZona(id);
        if (!desde || !hasta) return;
        fase("viajar");
        await manoA(desde, 800);
        fase("presionar");
        api.tomar(id);
        await sleep(260);
        // mano y accesorio viajan juntos hasta la zona
        var ms = reducido ? 120 : 1100;
        await Promise.all([manoA(hasta, ms), api.moverA(id, hasta, ms)]);
        fase("viajar");
        var reaccion = api.encajar(id);
        await sleep(240);
        await manoA({ x: hasta.x + 120, y: hasta.y + 140 }, 380);
        await reaccion;
        await sleep(300);
    }

    async function correr(api) {
        var t = api.textos();
        var pasos = api.pasos();
        if (!pasos.length) return;
        try {
            api.preparar();
            if (t.demostracion) await Promise.race([api.decir(t.demostracion), sleep(7000)]);
            for (var i = 0; i < pasos.length && !api.cancelado(); i++) {
                await ponerAccesorio(api, pasos[i]);
            }
            if (T()) T().quitarManos();
            mano = null;
            if (!api.cancelado()) await api.celebrar();
            if (!api.cancelado() && t.demostracionFin) await Promise.race([api.decir(t.demostracionFin), sleep(6000)]);
        } catch (e) {
            console.warn("[DondeDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        await api.terminar();
    }

    global.DondeDemo = { correr: correr };
})(window);
