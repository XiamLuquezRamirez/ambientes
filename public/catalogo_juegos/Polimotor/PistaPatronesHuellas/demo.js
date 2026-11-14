/**
 * PistaHuellasDemo — demostración automática de "¡La Pista de Patrones de Huellas y Ritmo!"
 * (window.PistaHuellasDemo).
 *
 * Arranca SOLA justo después de la introducción (no hay botón que pulsar), no cuenta como ronda ni como ítem y
 * las plataformas están bloqueadas para el niño (body.demo-activa). Secuencia fija: pie izquierdo → mano
 * derecha → ambos pies. Pasos:
 *   1. Zeus: "¡Presta mucha atención! Mira cómo se encienden las huellas del suelo…"
 *   2. Se iluminan, una a una, las tres plataformas: cada una con su luz, su sonido, la flecha de luz que viene
 *      de la anterior y Zeus haciendo el movimiento de esa huella (clips del GLB).
 *   3. La mano de PedniaTutorial toca las tres plataformas en orden; en cada toque la plataforma se enciende con
 *      energía, Zeus hace la huella y avanza una casilla por el carril, mientras dice
 *      "¡Pie izquierdo, mano derecha y sigue el camino de la memoria!".
 *   4. Zeus celebra, todas las plataformas brillan, la mano se va y Zeus vuelve a la línea de salida.
 *   5. "¡AHORA ES TU TURNO! Recuerda el orden y toca las huellas correctas." y script.js empieza la ronda 1.
 * Recibe un `api` de script.js; con api.cancelado() (reinicio) se detiene en el siguiente paso.
 */
(function (global) {
    "use strict";

    var T = function () { return global.PedniaTutorial || null; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mano = null;
    var posMano = null;

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

    /** La mano viaja hasta la plataforma, la presiona y la plataforma responde como si la tocara el niño. */
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
        await manoA({ x: p.x + 40, y: p.y + 70 }, 240);
        await toque;
    }

    async function correr(api) {
        var sec = api.secuencia();
        try {
            // 1. instrucción de Zeus
            api.fase("observa");
            await Promise.race([api.decir(api.texto("demoInstruccion")), sleep(9000)]);
            if (api.cancelado()) return;
            await sleep(300);

            // 2. las tres plataformas se encienden con su sonido, la flecha de luz y el movimiento de Zeus
            await api.mostrar(sec);
            if (api.cancelado()) return;
            await sleep(500);

            // 3. la mano muestra cómo tocar las plataformas en orden; Zeus avanza en cada toque
            api.fase("repite");
            api.limpiarRanuras();
            var p0 = api.puntoBaldosa(sec[0]);
            if (p0) await manoA({ x: p0.x + 50, y: p0.y + 200 }, 0);
            var voz = api.decir(api.texto("demoZeus"));
            await sleep(300);
            for (var i = 0; i < sec.length; i++) {
                if (api.cancelado()) return;
                await tocar(api, sec[i]);
                await sleep(260);
            }
            if (api.cancelado()) return;
            api.bien();
            await Promise.race([voz, sleep(5000)]);
        } catch (e) {
            console.warn("[PistaHuellasDemo]", e);
        }
        // 4. todas brillan, la mano se va y Zeus vuelve a la salida
        quitarMano();
        if (api.cancelado()) return;
        await api.todasBrillan();
        if (api.cancelado()) return;
        await api.volverASalida();
        if (api.cancelado()) return;
        // 5. "¡AHORA ES TU TURNO!"
        await api.tuTurno();
    }

    global.PistaHuellasDemo = { correr: correr, quitarMano: quitarMano };
})(window);
