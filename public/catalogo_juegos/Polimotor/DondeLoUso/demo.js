/**
 * UsoDemo — micro-tutorial automático antes de jugar (window.UsoDemo).
 *
 * Mismo modelo que la demo de "Une las Partes del Cuerpo": se hace sobre el tablero real con el arrastre
 * deshabilitado (body.demo-lock) y no cuenta como respuesta. De PedniaTutorial solo se usa la mano.
 * Por cada paso de config.demo.pasos (calcetines y luego nariz de payaso):
 *    1. Zoe pregunta por el objeto y su tarjeta se menea.
 *    2. La mano aparece al lado, se acerca al conector, lo presiona y lo mantiene.
 *    3. Nace la línea luminosa y viaja con la mano hasta el conector de su parte del cuerpo.
 *    4. La conexión queda fija, los conectores brillan y Zeus se pone el accesorio.
 * Al final: "¡Excelente! Cada objeto tiene un lugar especial en nuestro cuerpo." y script.js borra todo
 * (conexiones y accesorios) antes de mostrar "¡Comenzar a jugar!".
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

    /** Lleva la línea y la mano juntas del conector del objeto al de la parte, cuadro a cuadro. */
    function arrastrarJuntos(api, desde, hasta, ms) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var t = T();
            if (mano) mano.style.transition = "none";
            var paso = function () {
                var u = Math.min(1, (performance.now() - t0) / ms);
                var e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
                // un arco suave hacia abajo, como la mano de una persona
                var p = {
                    x: desde.x + (hasta.x - desde.x) * e,
                    y: desde.y + (hasta.y - desde.y) * e + Math.sin(e * Math.PI) * 26
                };
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

    async function unPaso(api, paso) {
        var id = paso.objeto;
        var parte = api.parejaDe(id);
        if (!id || !parte) return;
        var voz = api.decir(paso.texto);
        await api.destacar(id);
        var con = api.conector(id);
        if (!con) return;
        // la mano aparece al lado de la tarjeta y se acerca al conector
        fase("viajar");
        await manoA({ x: con.x - 70, y: con.y + 110 }, 0);
        await sleep(300);
        await manoA(con, 750);
        if (api.cancelado()) return;
        // toca y mantiene presionado: la tarjeta se ilumina y nace la línea
        fase("presionar");
        api.tomar(id);
        await sleep(450);
        var destino = api.conector(parte);
        await arrastrarJuntos(api, con, destino, reducido ? 150 : 1500);
        await sleep(180);
        // la conexión queda fija: brillo, sonido y Zeus se pone el accesorio
        var reaccion = api.fijar(id, parte);
        fase("viajar");
        await manoA({ x: destino.x + 60, y: destino.y + 120 }, 420);
        await reaccion;
        await Promise.race([voz, sleep(3500)]);
    }

    async function correr(api) {
        var pasos = api.pasos();
        try {
            api.preparar();
            for (var i = 0; i < pasos.length; i++) {
                if (api.cancelado()) break;
                await unPaso(api, pasos[i]);
                await api.felicitar(i === pasos.length - 1);
            }
        } catch (e) {
            console.warn("[UsoDemo]", e);
        }
        if (T()) T().quitarManos();
        mano = null;
        if (!api.cancelado()) await api.cerrar();
        await api.terminar();
    }

    global.UsoDemo = { correr: correr };
})(window);
