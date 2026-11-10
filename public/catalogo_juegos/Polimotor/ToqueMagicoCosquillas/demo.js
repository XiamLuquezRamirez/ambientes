/**
 * CosquillasDemo — demostración automática antes de jugar (window.CosquillasDemo).
 *
 * La narra Zeus, el guía 3D del panel lateral (no entra el personaje 3D del tutorial compartido: en el
 * juego solo se ve Zeus y él habla de Zoe en tercera persona). De PedniaTutorial solo se usa la mano
 * animada. Se juega sobre el espejo real,
 * con los toques bloqueados (body.demo-lock) y sin contar aciertos:
 *    1. Zoe sonríe en el espejo.             7. La mano toca la nariz.
 *    2. Se oye la instrucción de los ojos.   8. Zoe hace su movimiento cómico.
 *    3. La mano toca los ojos.               9. Se pide la boca.
 *    4. Los ojos parpadean y brillan.       10. La boca sonríe y se ilumina.
 *    5. Salen estrellas.                    11. Se piden las manos.
 *    6. Se pide la nariz.                   12. Zoe aplaude.
 * El script principal muestra después el botón "¡A jugar!".
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
        t.faseMano(m, "viajar");
        m.style.transition = ms > 0 ? "transform " + ms + "ms cubic-bezier(0.4, 0, 0.2, 1)" : "none";
        t.puntaManoEn(m, p.x, p.y);
        return sleep((ms || 0) + 40);
    }

    function presionar(on) {
        var t = T();
        if (t && mano) t.faseMano(mano, on ? "presionar" : "viajar");
    }

    /** La mano viaja a la parte, la toca y Zoe reacciona como en el juego real. */
    async function tocarParte(api, paso) {
        if (api.cancelado()) return;
        api.actual(paso.parte);
        await Promise.race([api.instruccion(paso.texto), sleep(3200)]);
        if (api.cancelado()) return;
        await manoA(api.punto(paso.parte), 800);
        presionar(true);
        await sleep(220);
        var reaccion = api.reaccionar(paso.parte);
        await sleep(180);
        presionar(false);
        // La mano se aparta para que se vea la reacción.
        var p = api.punto(paso.parte);
        if (p) await manoA({ x: p.x + 110, y: p.y + 120 }, 380);
        await reaccion;
        await sleep(350);
    }

    async function jugar(api) {
        var pasos = api.pasos();
        api.preparar();
        await sleep(600); // 1
        for (var i = 0; i < pasos.length; i++) {
            await tocarParte(api, pasos[i]); // 2-12
        }
        if (T()) T().quitarManos();
        mano = null;
        await sleep(300);
    }

    async function correr(api) {
        var t = api.textos();
        if (!api.pasos().length) return;
        try {
            if (t.demostracion) await Promise.race([api.decir(t.demostracion), sleep(6000)]);
            if (!api.cancelado()) await jugar(api);
            if (!api.cancelado() && t.demostracionFin) await Promise.race([api.decir(t.demostracionFin), sleep(6000)]);
        } catch (e) {
            console.warn("[CosquillasDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        api.terminar();
    }

    global.CosquillasDemo = { correr: correr };
})(window);
