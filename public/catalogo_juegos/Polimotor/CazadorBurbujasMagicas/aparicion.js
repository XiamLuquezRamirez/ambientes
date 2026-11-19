/**
 * AparicionBurbujas — suelta las burbujas de la ronda con un reloj propio (window.AparicionBurbujas).
 *
 * Cada 200 ms mira si puede salir otra (ReglasBurbujas.puedeSalir: máximo en pantalla y objetivos que
 * faltan), espera el intervalo de la ronda y busca un carril libre lejos de las burbujas cercanas. Si no
 * queda ninguna burbuja en pantalla, la siguiente sale enseguida: el niño nunca se queda esperando.
 * Corre con setTimeout (no con el reloj de Phaser) para que una ronda nunca se quede trabada.
 *
 *   arrancar(ronda, info)   info: { atrapadas(), volando() }
 *   detener()
 */
(function (global) {
    "use strict";

    var R = global.ReglasBurbujas;
    var estado = null;
    var timer = null;

    function esc() {
        return global.EscenarioBurbujas && global.EscenarioBurbujas.listo() ? global.EscenarioBurbujas : null;
    }

    function tic() {
        var e = esc();
        if (!e || !estado) return;
        var r = estado.ronda;
        var ahora = Date.now();
        var act = e.activas();
        if (!R.puedeSalir(r, act, estado.info.atrapadas(), estado.info.volando())) return;
        if (act === 0 && estado.proxima - ahora > 700) estado.proxima = ahora + 700;
        if (ahora < estado.proxima) return;

        var L = e.diseno();
        // De vez en cuando (rondas 2 y 3) una burbuja fuerte: más grande, más lenta y de 2-3 toques.
        var toques = R.elegirToques(r, estado.n, e.hayFuerte());
        var fuerte = toques > 1;
        var radio = Math.max(54, R.entre(r.radio, Math.random()) * L.rBase) * (fuerte ? r.multitoque.radio : 1);
        var amp = R.entre(r.vaiven, Math.random()) * L.W;
        // las primeras burbujas de cada ronda salen siempre desde abajo; luego, a veces a media altura
        var altura = estado.n < 1 || fuerte ? 1 : r.alturas[Math.floor(Math.random() * r.alturas.length)];
        var yIni = altura >= 1 ? L.H + radio : L.H * altura;
        var x = R.elegirCarril(L.carrilMin + radio + amp, L.carrilMax - radio - amp, radio, e.cercanas(yIni, radio * 3.2));
        if (x == null) {
            estado.proxima = ahora + 300;
            return;
        }
        var obj = R.elegirObjeto(r, estado.n, estado.anterior);
        e.soltar({
            objeto: obj,
            x: x,
            r: radio,
            subidaMs: R.entre(r.subidaSeg, Math.random()) * 1000 * (fuerte ? r.multitoque.lentitud : 1),
            vaiven: fuerte ? amp * 0.6 : amp,
            altura: altura,
            toques: toques
        });
        if (fuerte && estado.info.alFuerte) estado.info.alFuerte();
        if (global.SonidosBurbujas) global.SonidosBurbujas.aparece();
        estado.n++;
        estado.anterior = obj;
        estado.proxima = ahora + R.entre(r.intervaloMs, Math.random());
    }

    function arrancar(ronda, info) {
        detener();
        estado = { ronda: ronda, info: info, n: 0, anterior: null, proxima: Date.now() + 500 };
        timer = setInterval(tic, 200);
    }

    function detener() {
        clearInterval(timer);
        timer = null;
        estado = null;
    }

    global.AparicionBurbujas = {
        arrancar: arrancar,
        detener: detener,
        activa: function () { return !!estado; }
    };
})(window);
