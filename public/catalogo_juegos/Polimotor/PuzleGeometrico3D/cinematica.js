/**
 * CinematicaPuzle — "El mundo de las construcciones mágicas" (window.CinematicaPuzle).
 *
 * Secuencias encadenadas sobre la escena ya montada (sin cambiar de escena):
 *   1. La estructura terminada: el templo se ilumina, sus caras toman luz dorada, brillan los bloques.
 *   2. Energía del mundo: máquinas, grúas con los brazos arriba, cintas de fiesta, islas con luces,
 *      arcoíris y un paisaje que se transforma.
 *   3. Celebración: Zoe y Zeus entran celebrando, destello desde la cúspide, estrellas y confeti,
 *      y la cámara se acerca despacio a la construcción.
 * Cada paso es una Promise con respaldo por tiempo (Animador), así nunca se queda colgada.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorPuzle; };

    function correr(escena, avisos) {
        var obra = escena.obra, mundo = escena.mundo;
        var son = function (n) { if (typeof avisos.sonido === "function") avisos.sonido(n); };
        var anim = escena.anim;
        var cam = escena.cameras && escena.cameras.main;
        var foco = { x: 812, y: 470 };
        if (typeof avisos.cine === "function") avisos.cine(true);
        global.EventosPuzle && global.EventosPuzle.emitir("celebracion_final", {});
        escena.panel.mostrar(false);

        // 1. La estructura terminada
        son("energia");
        return anim.agregar(1900, function (u) {
            obra.brillarTodo(M().suave(u));
            if (Math.random() < 0.35) {
                var ids = Object.keys(obra.puestas);
                var id = ids[Math.floor(Math.random() * ids.length)];
                var a = obra.punto(id);
                obra.particulas.emitir(a.x + (Math.random() - 0.5) * 40, a.y, { n: 1, tipos: ["p-chispa", "p-estrella"], vel: 60, grav: -60, vida: 900, escala: 0.35, sumar: true, tintes: [0xffd43b, 0xfff3bf] });
            }
        }).then(function () {
            // 2. Energía del mundo
            son("encendido");
            mundo.transformar(true);
            mundo.lucesIslas();
            mundo.alCompletar();
            return M().sleep(2000);
        }).then(function () {
            // 3. Celebración: personajes, destello, estrellas y acercamiento de cámara
            son("celebrar");
            var entran = typeof avisos.personajes === "function" ? avisos.personajes(true) : Promise.resolve();
            obra.destello();
            [0, 1, 2, 3, 4, 5].forEach(function (i) {
                setTimeout(function () { mundo.emitirFiesta(600 + i * 85, 160 + (i % 2) * 90); }, i * 240);
            });
            var z0 = cam ? cam.zoom : 1;
            var acercar = cam ? anim.agregar(2600, function (u) {
                var s = M().suave(u);
                cam.setZoom(M().lerp(z0, 1.16, s));
                cam.centerOn(M().lerp(800, foco.x, s), M().lerp(450, foco.y, s));
            }) : M().sleep(2600);
            return Promise.all([entran, acercar]);
        }).then(function () {
            return M().sleep(900);
        }).then(function () {
            if (!cam) return null;
            var z1 = cam.zoom;
            return anim.agregar(1100, function (u) {
                var s = M().suave(u);
                cam.setZoom(M().lerp(z1, 1, s));
                cam.centerOn(M().lerp(foco.x, 800, s), M().lerp(foco.y, 450, s));
            });
        }).then(function () {
            if (typeof avisos.cine === "function") avisos.cine(false);
        }, function (err) {
            if (cam) { cam.setZoom(1); cam.centerOn(800, 450); }
            if (typeof avisos.cine === "function") avisos.cine(false);
            throw err;
        });
    }

    global.CinematicaPuzle = { correr: correr };
})(typeof window !== "undefined" ? window : global);
