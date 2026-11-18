/**
 * CircuitoDemo — demostración automática antes de jugar (window.CircuitoDemo). Arranca sola, sin botón.
 *
 * Se hace sobre un circuito de muestra (no es ninguno de los tres niveles) con el input bloqueado (body.demo-lock) y
 * no cuenta. De PedniaTutorial solo se usa la mano. Enseña la mecánica real, con el mismo arrastre del juego:
 *   1. La mano aparece, señala la esfera en la salida y la toma.
 *   2. La esfera recorre el primer tramo del circuito.
 *   3. Se acerca a la primera barrera y SE DETIENE mientras el rayo está encendido (Zeus: "¡Calcula el tiempo! …").
 *   4. Espera el contador 3, 2, 1 hasta que el láser se apaga.
 *   5. Cruza.
 *   6. Repite con la segunda barrera.
 *   7. Llega al reactor y la esfera entra en el conector.
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

    function seguirEsfera(api) {
        var t = T();
        if (!t || !mano) return;
        var sp = api.aPantalla(api.puntoEsfera());
        t.puntaManoEn(mano, sp.x, sp.y);
    }

    /** La mano lleva la esfera por el centro del carril de s0 a s1 (distancias en el circuito), a velocidad constante. */
    function pilotar(api, s0, s1, velocidad) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var ms = Math.abs(s1 - s0) / (velocidad || 300) * 1000;
            if (reducido) ms = Math.min(ms, 400);
            if (mano) mano.style.transition = "none";
            var paso = function () {
                if (api.cancelado()) { resolve(); return; }
                var k = ms > 0 ? Math.min(1, (performance.now() - t0) / ms) : 1;
                api.mover(api.puntoCircuito(s0 + (s1 - s0) * k));
                seguirEsfera(api);
                if (k >= 1 || api.llego()) { resolve(); return; }
                setTimeout(paso, 16);
            };
            paso();
        });
    }

    /** Espera (sin mover la esfera) hasta que el láser i se apague. La mano se queda quieta sobre la esfera. */
    function esperarApagado(api, i, maxMs) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var tick = function () {
                if (api.cancelado()) { resolve(); return; }
                var est = api.estadoLaser(i);
                seguirEsfera(api);
                if (!est || !est.on || performance.now() - t0 > (maxMs || 9000)) { resolve(); return; }
                setTimeout(tick, 50);
            };
            tick();
        });
    }

    async function correr(api) {
        try {
            api.preparar();
            var c = api.circuito();
            // 1) la mano señala la esfera y la toma
            var p = api.aPantalla(api.puntoEsfera());
            fase("viajar");
            await manoA({ x: p.x + 90, y: p.y + 150 }, 0);
            await sleep(400);
            await manoA(p, 900);
            if (api.cancelado()) return;
            fase("presionar");
            await sleep(350);
            api.tomar();
            await sleep(300);
            var s = 0;
            for (var i = 0; i < c.laseres.length; i++) {
                var L = c.laseres[i];
                var sParada = L.s - (c.radio + c.banda / 2 + c.ancho * 0.45);
                // 2) recorre el tramo; un poco antes de la barrera el rayo está encendido (enseña a esperar)
                await pilotar(api, s, sParada - c.ancho * 1.4, 300);
                if (api.cancelado()) return;
                api.encenderLaser(i, 4300);
                await pilotar(api, sParada - c.ancho * 1.4, sParada, 220);
                if (api.cancelado()) return;
                // 3) y 4) se detiene y espera el contador 3, 2, 1
                var voz = i === 0 ? api.decirZeus(api.textos().sincronizacion) : api.decirZeus(api.textos().esperaRayo);
                await esperarApagado(api, i, 9000);
                if (api.cancelado()) return;
                await sleep(250);
                // 5) cruza mientras el láser está apagado
                s = sParada + c.ancho * 1.6;
                await pilotar(api, sParada, s, 360);
                if (i === 0) await Promise.race([voz, sleep(1500)]);
            }
            // 6) hasta el reactor
            await pilotar(api, s, c.largo, 320);
            if (api.cancelado()) return;
            api.soltar();
            fase("viajar");
            var m = api.aPantalla(api.puntoEsfera());
            await manoA({ x: m.x - 60, y: m.y + 150 }, 420);
            if (T()) T().quitarManos();
            mano = null;
            await api.felicitar();
        } catch (e) {
            console.warn("[CircuitoDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.CircuitoDemo = { correr: correr };
})(window);
