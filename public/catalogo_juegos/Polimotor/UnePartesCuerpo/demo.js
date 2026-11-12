/**
 * UneDemo — demostración automática antes de jugar (window.UneDemo).
 *
 * Se hace sobre la escena real con el arrastre deshabilitado (body.demo-lock) y no cuenta como respuesta.
 * De PedniaTutorial solo se usa la mano animada:
 *    1. Se destaca la tarjeta NARIZ y aparece la mano a su lado.
 *    2. La mano se acerca al punto conector, lo toca y lo mantiene presionado.
 *    3. Nace la línea violeta y viaja con la mano hasta la nariz de Zeus.
 *    4. La conexión se fija: destello en la nariz y sonido de acierto.
 *    5. Mensaje "¡Muy bien!"; la mano se va y script.js borra la conexión y muestra "¡A jugar!".
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

    /** Lleva la línea del conector a la nariz junto con la mano, cuadro a cuadro. */
    function arrastrarJuntos(api, desde, hasta, ms) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var t = T();
            if (mano) mano.style.transition = "none";
            var paso = function () {
                var u = Math.min(1, (performance.now() - t0) / ms);
                var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                var p = { x: desde.x + (hasta.x - desde.x) * e, y: desde.y + (hasta.y - desde.y) * e };
                api.moverLinea(p);
                if (t && mano) t.puntaManoEn(mano, p.x, p.y);
                if (u >= 1) {
                    resolve();
                    return;
                }
                // setTimeout y no requestAnimationFrame: si el panel está oculto, la demo sigue avanzando
                setTimeout(paso, 16);
            };
            paso();
        });
    }

    async function correr(api) {
        var id = api.tarjetaDemo();
        if (!id) return;
        try {
            api.preparar(id);
            var voz = api.decir(api.textos().demostracion);
            await api.destacar(id);
            var con = api.conector(id);
            if (!con) return;
            // 1-2. la mano aparece al lado de la tarjeta y se acerca al conector
            fase("viajar");
            await manoA({ x: con.x + 90, y: con.y + 110 }, 0);
            await sleep(350);
            await manoA(con, 800);
            if (api.cancelado()) return;
            // 3. toca y mantiene presionado: la tarjeta se ilumina y nace la línea
            fase("presionar");
            api.tomar(id);
            await sleep(450);
            // 4-6. arrastra la línea hasta la nariz
            var destino = api.destino(id);
            await arrastrarJuntos(api, con, destino, reducido ? 150 : 1500);
            await sleep(200);
            // 7-9. la conexión queda fija, destello y sonido
            await api.fijar(id);
            fase("viajar");
            await manoA({ x: destino.x + 110, y: destino.y + 130 }, 420);
            // 10. pequeño mensaje de felicitación
            await api.felicitar();
            await Promise.race([voz, sleep(4500)]);
        } catch (e) {
            console.warn("[UneDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado() && api.textos().demostracionFin) await Promise.race([api.decir(api.textos().demostracionFin), sleep(6000)]);
        await api.terminar();
    }

    global.UneDemo = { correr: correr };
})(window);
