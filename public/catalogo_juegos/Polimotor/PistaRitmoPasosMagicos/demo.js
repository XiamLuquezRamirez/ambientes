/**
 * PistaDemo — demostración automática de "¡La Pista de Ritmo y Pasos Mágicos!" (window.PistaDemo).
 *
 * Siempre es automática: no espera toques, no cuenta como ronda ni como ítem y las baldosas están bloqueadas
 * para el niño (body.demo-activa). Secuencia fija: pie → mano. Pasos:
 *   1. Zoe: "¡Presta mucha atención! Escucha los sonidos y mira cómo se encienden las baldosas…"
 *   2. Se ilumina la baldosa azul del PIE, suena el tambor (¡BUM!), el dibujo se mueve y sale un halo.
 *   3. Se ilumina la baldosa roja de la MANO, suena la campana (¡TING!) y salen estrellitas.
 *   4. Microtutorial: la mano de PedniaTutorial toca PIE y luego MANO (cada toque con su sonido) mientras
 *      Zoe dice "¡Sigue la música: primero el pie y luego la mano!".
 *   5. Las seis baldosas se encienden un momento, la mano se va y aparece "¡AHORA ES TU TURNO!";
 *      tras una pausa breve script.js empieza la ronda 1.
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
        var d = reducido ? 0 : (ms || 0);
        var t0 = performance.now();
        return new Promise(function (resolve) {
            var paso = function () {
                var u = d > 0 ? Math.min(1, (performance.now() - t0) / d) : 1;
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

    /** La mano viaja hasta la baldosa, la presiona y la baldosa responde como si la tocara el niño. */
    async function tocar(api, id) {
        var p = api.puntoBaldosa(id);
        if (!p) return;
        fase("viajar");
        await manoA({ x: p.x, y: p.y }, 620);
        if (api.cancelado()) return;
        fase("presionar");
        await sleep(180);
        var toque = api.pulsar(id);
        await sleep(240);
        fase("viajar");
        await manoA({ x: p.x + 30, y: p.y + 60 }, 240);
        await toque;
    }

    async function correr(api) {
        var sec = api.secuencia();
        try {
            // 1. instrucción de Zoe
            api.fase("observa");
            await Promise.race([api.decir(api.texto("demoInstruccion"), "zoe"), sleep(8000)]);
            if (api.cancelado()) return;
            await sleep(300);

            // 2 y 3. las dos baldosas se encienden con su sonido y su efecto
            await api.mostrar(sec);
            if (api.cancelado()) return;
            await sleep(500);

            // 4. la mano muestra cómo tocar las baldosas en orden, mientras Zeus lo dice
            api.fase("repite");
            api.limpiarRanuras();
            var p0 = api.puntoBaldosa(sec[0]);
            if (p0) await manoA({ x: p0.x + 40, y: p0.y + 220 }, 0);
            var voz = api.decir(api.texto("demoZoe"), "zoe");
            await sleep(400);
            for (var i = 0; i < sec.length; i++) {
                if (api.cancelado()) return;
                await tocar(api, sec[i]);
                await sleep(320);
            }
            if (api.cancelado()) return;
            api.bien();
            await Promise.race([voz, sleep(5000)]);
        } catch (e) {
            console.warn("[PistaDemo]", e);
        }
        // 5. las seis baldosas se encienden, la mano se va y "¡AHORA ES TU TURNO!"
        quitarMano();
        if (api.cancelado()) return;
        await api.todasBrillan();
        if (api.cancelado()) return;
        await api.tuTurno();
    }

    global.PistaDemo = { correr: correr, quitarMano: quitarMano };
})(window);
