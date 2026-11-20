/**
 * demo.js — El Pinball de Gravedad Mágica
 *
 * Demostración automática: arranca sola, sin botón propio, y enseña lo único que el niño
 * necesita entender — que tocar los botones de abajo mueve las palancas y devuelve la bola.
 *
 * Durante la demo el input del niño está bloqueado (`body.demo-lock`): quien toca es la mano
 * animada. La demo no cuenta puntos ni gasta tiempo de ronda.
 */
(function (global) {
    "use strict";

    /**
     * Ejecuta la demo.
     * `api` viene de script.js y expone lo que la demo necesita sin conocer el DOM:
     *   { estado, cfg, lanzar, activarFlipper, manoSobre, manoFuera, decir, resaltarBoton, esperar, sigueViva }
     */
    function ejecutar(api) {
        var cfg = api.cfg;
        var textos = cfg.textos || {};

        return api.esperar(420)
            .then(function () {
                // Zoe es la que está en escena durante la demo: ella narra.
                return api.decir(textos.demoZeus || "¡Mira! Toco el botón izquierdo y la palanca golpea la bola.", "zoe");
            })
            .then(function () {
                api.lanzar();
                return api.esperar(300);
            })
            // 1. La bola baja; esperamos a que se acerque a la palanca izquierda.
            .then(function () {
                return esperarCercaDePalanca(api, "izquierda", 4200);
            })
            .then(function () {
                if (!api.sigueViva()) api.lanzar();
                // La demo enseña un golpe que SÍ funciona: si la bola no llegó sola a la
                // zona de la palanca, la colocamos ahí. Una demo donde la palanca falla
                // enseña justo lo contrario de lo que queremos.
                api.colocarEnPalanca("izquierda");
                api.resaltarBoton("izquierda", true);
                api.manoSobre("izquierda");
                return api.esperar(320);
            })
            // 2. La mano toca el botón izquierdo: la palanca golpea.
            .then(function () {
                api.activarFlipper("izquierda");
                api.resaltarBoton("izquierda", false);
                return api.esperar(650);
            })
            .then(function () {
                api.manoFuera();
                return api.decir("¡Ahora el derecho!", "zoe");
            })
            // 3. Ahora el lado derecho.
            .then(function () {
                return esperarCercaDePalanca(api, "derecha", 4200);
            })
            .then(function () {
                if (!api.sigueViva()) api.lanzar();
                api.colocarEnPalanca("derecha");
                api.resaltarBoton("derecha", true);
                api.manoSobre("derecha");
                return api.esperar(320);
            })
            .then(function () {
                api.activarFlipper("derecha");
                api.resaltarBoton("derecha", false);
                return api.esperar(700);
            })
            .then(function () {
                api.manoFuera();
                return api.decir(textos.demoMuyBien || "¡Así se juega!", "zoe");
            })
            .then(function () {
                return api.esperar(400);
            });
    }

    /**
     * Espera a que la bola esté bajando por el lado indicado y cerca de las palancas.
     * Si pasa el tiempo máximo, continúa igual: la demo nunca se queda colgada.
     */
    function esperarCercaDePalanca(api, lado, maxMs) {
        return new Promise(function (resolver) {
            var transcurrido = 0;
            var paso = 60;
            var limite = maxMs || 4000;
            var timer = setInterval(function () {
                transcurrido += paso;
                var e = api.estado;
                var bola = e.bola;
                var listo = false;

                if (bola && bola.viva) {
                    var f = e.flippers[lado];
                    var cercaEnY = bola.y > f.pivoteY - 320 && bola.y < f.pivoteY + 60;
                    var ladoCorrecto = lado === "izquierda" ? bola.x < e.ancho / 2 : bola.x >= e.ancho / 2;
                    listo = cercaEnY && ladoCorrecto && bola.vy > 0;
                }

                if (listo || transcurrido >= limite) {
                    clearInterval(timer);
                    resolver(listo);
                }
            }, paso);
        });
    }

    global.DemoPinball = { ejecutar: ejecutar };

})(typeof window !== "undefined" ? window : globalThis);
