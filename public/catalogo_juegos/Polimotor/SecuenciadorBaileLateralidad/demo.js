/**
 * SimonDemo — demostración automática de "¡Simón Dice Corporal!" (window.SimonDemo).
 *
 * Siempre es automática: no espera toques, no cuenta como ronda ni como ítem y los botones están bloqueados
 * para el niño (body.demo-activa). Secuencia fija: cabeza → aplaudir. Pasos:
 *   1. Zeus: "¡Observa con atención! Primero hago un movimiento y después otro. ¡Recuerda el orden!"
 *   2. Zeus se toca la cabeza: se ilumina el botón 1 y aparece el primer movimiento en la marquesina.
 *   3. Zeus aplaude: se ilumina el botón 2 y aparece el segundo movimiento.
 *   4. La mano de PedniaTutorial toca "Tocar cabeza" y luego "Aplaudir" mientras Zoe dice
 *      "¡Primero cabeza y después aplauso! Toca los botones en ese orden."
 *   5. La mano se va y aparece "¡AHORA ES TU TURNO!"; tras una pausa breve script.js empieza la ronda 1.
 * Recibe un `api` de script.js; con api.cancelado() (reinicio) se detiene en el siguiente paso.
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
            mano.style.zIndex = "1100";
            if (p) t.puntaManoEn(mano, p.x, p.y);
            void mano.offsetWidth;
        }
        return mano;
    }

    var posMano = null;

    /**
     * La mano viaja hasta p en `ms`. Paso a paso con setTimeout (no transición CSS): avanza aunque el navegador
     * no esté pintando y la posición real siempre es la del recorrido.
     */
    function manoA(p, ms) {
        var t = T();
        var m = asegurarMano(p);
        if (!t || !m || !p) return sleep(ms || 0);
        m.style.transition = "none";
        var desde = posMano || p;
        var dur = reducido ? 0 : (ms || 0);
        var t0 = performance.now();
        return new Promise(function (resolve) {
            var paso = function () {
                var u = dur > 0 ? Math.min(1, (performance.now() - t0) / dur) : 1;
                var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                var x = desde.x + (p.x - desde.x) * e;
                var y = desde.y + (p.y - desde.y) * e;
                if (m.isConnected) t.puntaManoEn(m, x, y);
                posMano = { x: x, y: y };
                if (u < 1) {
                    setTimeout(paso, 16);
                    return;
                }
                setTimeout(resolve, 40);
            };
            paso();
        });
    }

    function fase(nombre) {
        var t = T();
        if (t && mano) t.faseMano(mano, nombre);
    }

    function quitarMano() {
        if (T()) T().quitarManos();
        mano = null;
        posMano = null;
    }

    /** La mano viaja hasta el botón, lo presiona y el botón responde como si lo tocara el niño. */
    async function tocar(api, id) {
        var p = api.puntoBoton(id);
        if (!p) return;
        fase("viajar");
        await manoA({ x: p.x, y: p.y }, 650);
        if (api.cancelado()) return;
        fase("presionar");
        await sleep(200);
        var mov = api.pulsar(id);
        await sleep(260);
        fase("viajar");
        await manoA({ x: p.x + 30, y: p.y + 60 }, 260);
        await mov;
    }

    async function correr(api) {
        var sec = api.secuencia();
        try {
            // 1. instrucción de Zeus
            api.fase("observa");
            await Promise.race([api.decir(api.texto("demoInstruccion"), "zeus"), sleep(7000)]);
            if (api.cancelado()) return;
            await sleep(300);

            // 2 y 3. los dos movimientos, con su botón y su indicador
            await api.mostrar(sec);
            if (api.cancelado()) return;
            await sleep(500);

            // 4. la mano muestra cómo tocar los botones en orden
            api.fase("repite");
            api.limpiarRanuras();
            var p0 = api.puntoBoton(sec[0]);
            if (p0) await manoA({ x: p0.x + 40, y: p0.y + 220 }, 0);
            var voz = api.decir(api.texto("demoZoe"), "zoe");
            await sleep(400);
            for (var i = 0; i < sec.length; i++) {
                if (api.cancelado()) return;
                await tocar(api, sec[i]);
                await sleep(350);
            }
            if (api.cancelado()) return;
            api.bien();
            await Promise.race([voz, sleep(5000)]);
        } catch (e) {
            console.warn("[SimonDemo]", e);
        }
        // 5. la mano se va y "¡AHORA ES TU TURNO!"
        quitarMano();
        if (api.cancelado()) return;
        await api.tuTurno();
    }

    global.SimonDemo = { correr: correr, quitarMano: quitarMano };
})(window);
