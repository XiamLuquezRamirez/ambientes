/**
 * SiluetasDemo — demostración automática antes de jugar (window.SiluetasDemo).
 *
 * Usa el flujo compartido PedniaTutorial.correr (entra el personaje 3D, dice el texto, juega la
 * demo, dice el texto final y se despide) y la mano del tutorial. Se juega sobre el tablero real
 * con la postura de config.json → demo (Zoe dando un salto):
 *    1. La silueta de Zoe saltando.          7. Se elige el brazo doblado.
 *    2. Las piezas flotan desordenadas.       8. Se gira el brazo.
 *    3. Se elige la cabeza.                   9. Se coloca el brazo estirado.
 *    4. Se gira la cabeza.                   10. Zeus explica la rodilla y se colocan las piernas.
 *    5. La cabeza encaja.                    11. Se colocan los tenis.
 *    6. Se coloca el tronco inclinado.       12. La silueta cobra vida y hace la pose.
 * El script principal muestra después el botón "¡A jugar!".
 */
(function (global) {
    "use strict";

    var P = global.Posturas;
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
            if (p) t.puntaManoEn(mano, p.x + 120, p.y + 140);
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

    async function tocar(p, alTocar) {
        await manoA(p, 650);
        presionar(true);
        await sleep(200);
        if (typeof alTocar === "function") await alTocar();
        await sleep(160);
        presionar(false);
        await sleep(120);
    }

    /** Gira la pieza elegida hasta su hueco tocando la flecha correspondiente. */
    async function girarConToques(api, id) {
        var plan = api.planGiro(id);
        if (!plan.veces) return;
        var b = api.boton(plan.dir);
        var r = b ? b.getBoundingClientRect() : null;
        if (!r) return;
        await manoA({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, 600);
        for (var i = 0; i < plan.veces; i++) {
            if (api.cancelado()) return;
            presionar(true);
            api.girar(plan.dir);
            await sleep(190);
            presionar(false);
            await sleep(reducido ? 40 : 230);
        }
        await sleep(300);
    }

    async function llevarConMano(api, id) {
        var desde = api.centroPieza(id);
        if (desde) {
            await manoA(desde, 500);
            presionar(true);
            await sleep(240);
        }
        await api.llevar(id, reducido ? 200 : 1250, function (pt) {
            var t = T();
            if (t && mano) {
                mano.style.transition = "none";
                t.puntaManoEn(mano, pt.x, pt.y);
            }
        });
        presionar(false);
        await sleep(320);
    }

    async function pieza(api, id, opts) {
        opts = opts || {};
        if (api.cancelado()) return;
        if (opts.destacar) {
            api.destacar(id, true);
            await sleep(800);
        }
        await tocar(api.centroPieza(id), function () { api.seleccionar(id); });
        api.destacar(id, false);
        await sleep(opts.destacar ? 650 : 300);
        await girarConToques(api, id);
        await llevarConMano(api, id);
    }

    async function jugar(api, demo) {
        var t = api.textos();
        await api.cargar(demo); // 1 y 2
        api.mision("Demostración", demo.nombre || "Mira cómo se arma");
        await sleep(1100);
        api.paso(0);
        await pieza(api, "cabeza", { destacar: true }); // 3, 4 y 5
        api.paso(1);
        await pieza(api, "tronco"); // 6
        api.paso(2);
        await pieza(api, "brazo_izq", { destacar: true }); // 7 y 8 (brazo doblado)
        await pieza(api, "brazo_der"); // 9 (brazo estirado)
        api.paso(3);
        api.mision("Demostración", (t && t.demoRodilla) || "Fíjate en la rodilla");
        var voz = api.hablar(t && t.demoRodilla, "zeus");
        api.mirarRodilla(true);
        await Promise.race([voz, sleep(6500)]);
        api.mirarRodilla(false);
        await pieza(api, "pierna_der", { destacar: true }); // 10
        await pieza(api, "pierna_izq");
        api.paso(4);
        await pieza(api, "tenis_der"); // 11
        await pieza(api, "tenis_izq");
        if (T()) T().quitarManos();
        mano = null;
        api.mision("Demostración", (t && t.posturaLista) || "¡Pose completa!");
        await api.completar(); // 12
        await sleep(400);
    }

    async function correr(api) {
        var t = api.textos();
        var demo = api.demo();
        if (!demo) return;
        var tut = T();
        if (!tut) {
            await jugar(api, demo);
            api.terminar();
            return;
        }
        await tut.correr({
            texto: t.demostracion,
            textoFin: t.demostracionFin,
            cancelado: api.cancelado,
            onTexto: function (txt) {
                if (txt) api.mision("Demostración", txt);
            },
            jugar: function () {
                return jugar(api, demo).catch(function (e) {
                    console.warn("[SiluetasDemo]", e);
                });
            }
        });
        tut.quitarManos();
        mano = null;
        api.terminar();
    }

    global.SiluetasDemo = { correr: correr, plan: function (actual, objetivo, paso) {
        var dif = P.normalizar(objetivo - actual);
        var veces = Math.round(Math.abs(dif) / (paso || 15));
        return { veces: veces, dir: dif < 0 ? -1 : 1 };
    } };
})(window);
