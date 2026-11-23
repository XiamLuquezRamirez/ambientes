/**
 * TrenDemo — demostración automática del trazado (window.TrenDemo).
 *
 * En el nivel 1, con la entrada bloqueada y sin contar: la mano de PedniaTutorial se posa en el punto INICIO,
 * presiona y desliza el dedo por los puntos de luz (con las mismas ReglasTren del juego) hasta un poco más de la
 * mitad, y se levanta. Así se ve el gesto (tocar → mantener → deslizar) sin completar la vía por el niño. Al
 * final la vía construida se recoge y el tren vuelve a esperar.
 */
(function (global) {
    "use strict";

    var T = function () { return global.PedniaTutorial || null; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mano = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 140) : ms); });
    }

    function asegurar(p) {
        var t = T();
        if (!t) return null;
        if (!mano || !mano.isConnected) {
            mano = t.crearMano();
            mano.style.transition = "none";
            if (p) t.puntaManoEn(mano, p.x, p.y);
        }
        return mano;
    }

    function manoA(p, ms) {
        var t = T();
        var m = asegurar(p);
        if (!t || !m || !p) return sleep(ms || 0);
        m.style.transition = ms > 0 ? "transform " + ms + "ms ease-in-out" : "none";
        t.puntaManoEn(m, p.x, p.y);
        return sleep((ms || 0) + 16);
    }

    function fase(nombre) {
        var t = T();
        if (t && mano) t.faseMano(mano, nombre);
    }

    function quitar() {
        if (T()) T().quitarManos();
        mano = null;
    }

    /** La mano lleva el "dedo" por el eje de s0 a s1 a velocidad constante; la vía crece con las reglas reales. */
    function deslizar(api, s0, s1, vel) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var ms = Math.abs(s1 - s0) / (vel || 2.4) * 1000;
            if (reducido) ms = Math.min(ms, 400);
            var paso = function () {
                if (api.cancelado()) { resolve(); return; }
                var k = ms > 0 ? Math.min(1, (performance.now() - t0) / ms) : 1;
                var s = s0 + (s1 - s0) * k;
                api.mover(s);
                var p = api.punto(s);
                if (T() && mano) T().puntaManoEn(mano, p.x, p.y);
                if (k >= 1) { resolve(); return; }
                setTimeout(paso, 16);
            };
            paso();
        });
    }

    async function correr(api) {
        try {
            await api.preparar();
            if (api.cancelado()) return;
            var voz = api.decir(api.textoDemo(), "zeus");
            var p = api.punto(0);
            await manoA({ x: p.x + 160, y: p.y + 130 }, 0);
            fase("viajar");
            await manoA(p, 800);
            if (api.cancelado()) return;
            fase("presionar");
            await sleep(260);
            api.tomar();
            await sleep(300);
            var meta = api.largo() * 0.55;
            await deslizar(api, 0, meta, 2.3);
            if (api.cancelado()) return;
            await sleep(500);
            fase("viajar");
            var q = api.punto(meta);
            await manoA({ x: q.x + 50, y: q.y - 120 }, 420);
            api.soltar();
            await Promise.race([voz, sleep(2600)]);
            quitar();
            api.recoger();
            await sleep(700);
        } catch (e) {
            console.warn("[TrenDemo]", e);
        }
        quitar();
    }

    global.TrenDemo = { correr: correr };
})(typeof window !== "undefined" ? window : global);
