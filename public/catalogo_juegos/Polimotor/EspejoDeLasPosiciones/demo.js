/**
 * EspejoDemo — demostración automática antes de jugar (window.EspejoDemo).
 *
 * Usa el flujo compartido PedniaTutorial.correr (entra el personaje 3D, dice el texto, juega la
 * demo, dice el texto final y se despide) y la mano del tutorial. La demo se juega sobre el tablero
 * real con la postura de config.json → demo:
 *   1. Zeus hace la postura.            6. El brazo se arrastra y encaja en el hombro.
 *   2. Se destaca el brazo izquierdo.   7. Se toma la pierna derecha.
 *   3. Se selecciona.                   8. Se gira cadera y rodilla hasta la flexión del modelo.
 *   4. Aparecen las flechas.            9. Encaja en la cadera.
 *   5. El brazo gira hacia arriba.     10-11. Se colocan las demás piezas y la figura se mueve.
 * El script principal muestra después el botón "¡A jugar!".
 */
(function (global) {
    "use strict";

    var P = global.Postura;
    var T = function () { return global.PedniaTutorial || null; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var mano = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 120) : ms); });
    }

    function centro(el) {
        if (!el) return null;
        var r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
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

    async function tocar(p, alTocar) {
        var t = T();
        await manoA(p, 650);
        if (t && mano) t.faseMano(mano, "presionar");
        await sleep(200);
        if (typeof alTocar === "function") await alTocar();
        await sleep(160);
        if (t && mano) t.faseMano(mano, "viajar");
        await sleep(120);
    }

    /** Toca n veces un botón de giro (con la mano encima), despacio. */
    async function girarConToques(api, junta, dir, veces) {
        var b = api.boton(junta, dir);
        var p = centro(b);
        if (!p) return;
        await manoA(p, 600);
        for (var i = 0; i < veces; i++) {
            if (api.cancelado()) return;
            if (T() && mano) T().faseMano(mano, "presionar");
            await api.girar(junta, dir);
            await sleep(170);
            if (T() && mano) T().faseMano(mano, "viajar");
            await sleep(260);
        }
    }

    /** Cuántos toques y en qué sentido llevan la articulación al objetivo. */
    function plan(api, id, junta) {
        var actual = api.angulo(id) || { a: 0, b: 0 };
        var obj = api.objetivo(id);
        var dif = P.normalizar((junta === "d" ? obj.b - actual.b : obj.a - actual.a));
        // girar(+1) suma signo*paso al ángulo anatómico: elegimos el sentido que acerca.
        var s = P.signo(id) || 1;
        var paso = 30;
        var veces = Math.round(Math.abs(dif) / paso);
        var dir = dif === 0 ? 1 : (Math.sign(dif) * s);
        return { veces: veces, dir: dir };
    }

    async function llevarConMano(api, id) {
        var t = T();
        var desde = api.pivoteTaller();
        if (desde) {
            await manoA(desde, 600);
            if (t && mano) t.faseMano(mano, "presionar");
            await sleep(260);
        }
        await api.llevar(id, reducido ? 200 : 1300, function (pt) {
            if (t && mano) {
                mano.style.transition = "none";
                t.puntaManoEn(mano, pt.x, pt.y);
            }
        });
        if (t && mano) t.faseMano(mano, "viajar");
        await sleep(300);
    }

    async function piezaCompleta(api, id, opts) {
        opts = opts || {};
        if (api.cancelado()) return;
        var ficha = api.ficha(id);
        if (opts.destacar) {
            api.resaltarFicha(id, true);
            await sleep(900);
        }
        await tocar(centro(ficha), function () {
            api.seleccionar(id);
        });
        api.resaltarFicha(id, false);
        await sleep(opts.destacar ? 700 : 300);
        if (P.esExtremidad(id)) {
            var pp = plan(api, id, "p");
            if (pp.veces) await girarConToques(api, "p", pp.dir, pp.veces);
            var pd = plan(api, id, "d");
            if (pd.veces) {
                await sleep(300);
                await girarConToques(api, "d", pd.dir, pd.veces);
            }
            await sleep(opts.destacar ? 700 : 300);
        }
        await llevarConMano(api, id);
    }

    async function jugar(api, demo) {
        var t = api.textos();
        await api.cargar(demo); // 1. Zeus hace la postura
        api.mision("Demostración", demo.nombre || "Mira cómo se arma");
        await sleep(600);
        api.paso(0);
        await piezaCompleta(api, "cabeza");
        await piezaCompleta(api, "tronco");
        api.paso(1);
        await piezaCompleta(api, "brazo_izq", { destacar: true }); // 2 a 6
        api.paso(2);
        await piezaCompleta(api, "pierna_der", { destacar: true }); // 7 a 9
        api.paso(3);
        await piezaCompleta(api, "brazo_der"); // 10
        await piezaCompleta(api, "pierna_izq");
        if (T()) T().quitarManos();
        mano = null;
        api.mision("Demostración", (t && t.posturaLista) || "¡Postura completa!");
        await api.realizar(); // 11
        await sleep(500);
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
                    console.warn("[EspejoDemo]", e);
                });
            }
        });
        tut.quitarManos();
        mano = null;
        api.terminar();
    }

    global.EspejoDemo = { correr: correr };
})(window);
