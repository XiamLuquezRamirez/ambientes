/**
 * ToposDemo — micro-tutorial automático antes de jugar (window.ToposDemo).
 *
 * Mismo modelo que la demo de "Une las Partes del Cuerpo": se hace sobre la escena real con el toque
 * deshabilitado (body.demo-lock), con la mano animada de PedniaTutorial, y no cuenta como respuesta
 * (no suma aciertos, no corre el reloj, no registra nada). Pasos (config.demo.pasos):
 *    1. Salen tres topos: NARIZ, CEPILLO y MANO.
 *    2. La mano señala el globo de la nariz…
 *    3. …baja y toca al topo: pirueta, el globo estalla en estrellas y el letrero dice "¡CORRECTO!".
 *    4. La mano va hacia el cepillo, pero el globo se tacha en rojo: ese topo no se toca y se esconde.
 *    5. La mano toca al topo de la mano: otro acierto.
 *    6. "¡Muy bien! Recuerda: golpea solamente los topos que tengan partes del cuerpo." (script.js muestra
 *       luego el botón ¡COMENZAR A JUGAR!).
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

    /** Señala el globo y luego baja a tocar al topo (un acierto). */
    async function tocarParte(api, paso, texto) {
        var g = api.globo(paso.agujero);
        var topo = api.topo(paso.agujero);
        if (!g || !topo) return;
        fase("viajar");
        await manoA({ x: g.x + 40, y: g.y - 10 }, 700);
        api.destacar(paso.agujero, true);
        var voz = api.decir(texto);
        await sleep(900);
        if (api.cancelado()) return;
        await manoA(topo, 520);
        fase("presionar");
        await sleep(160);
        api.golpear(paso.agujero);
        await sleep(260);
        fase("viajar");
        await manoA({ x: topo.x + 60, y: topo.y + 70 }, 360);
        await Promise.race([voz, sleep(2600)]);
    }

    /** Va hacia el distractor, pero el globo se tacha: ese topo no se toca. */
    async function noTocar(api, paso, texto) {
        var g = api.globo(paso.agujero);
        if (!g) return;
        fase("viajar");
        await manoA({ x: g.x + 30, y: g.y + 40 }, 700);
        api.prohibido(paso.agujero);
        var voz = api.decir(texto);
        // la mano dice "no" moviéndose de lado a lado, sin tocar
        for (var i = 0; i < 2; i++) {
            await manoA({ x: g.x + 70, y: g.y + 70 }, 220);
            await manoA({ x: g.x + 10, y: g.y + 70 }, 220);
        }
        await manoA({ x: g.x + 90, y: g.y + 130 }, 300);
        await Promise.race([voz, sleep(3000)]);
        await api.esconder(paso.agujero);
    }

    async function correr(api) {
        var pasos = api.pasos();
        if (!pasos || pasos.length < 3) return;
        try {
            api.preparar();
            var voz = api.decir(api.textos().demostracion);
            // 1. salen los tres topos
            for (var i = 0; i < pasos.length; i++) {
                api.sacar(pasos[i].agujero, pasos[i].imagen);
                await sleep(260);
            }
            await Promise.race([voz, sleep(3200)]);
            if (api.cancelado()) return;
            // 2-4. la nariz
            await tocarParte(api, pasos[0], api.textos().demoNariz);
            if (api.cancelado()) return;
            // 5. el cepillo no se toca
            await noTocar(api, pasos[1], api.textos().demoCepillo);
            if (api.cancelado()) return;
            // 6. la mano
            await tocarParte(api, pasos[2], api.textos().demoMano);
        } catch (e) {
            console.warn("[ToposDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado() && api.textos().demostracionFin) {
            await Promise.race([api.decir(api.textos().demostracionFin, api.textos().demostracionFin), sleep(6500)]);
        }
        await api.terminar();
    }

    global.ToposDemo = { correr: correr };
})(window);
