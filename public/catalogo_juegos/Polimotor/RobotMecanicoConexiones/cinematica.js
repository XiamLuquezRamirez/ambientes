/**
 * CinematicaRobot — "El laboratorio cobra vida" (window.CinematicaRobot).
 *
 * Cuatro secuencias encadenadas sobre la escena ya montada:
 *   1. Energía: el módulo del pecho se ilumina, los tubos y conductos se encienden, las pantallas
 *      cambian y los brazos mecánicos se retraen.
 *   2. Activación: ojos, señales de la antena, la cabeza mira a los lados, articulaciones encendidas.
 *   3. Movimiento: brazos arriba, manos que saludan, un paso al frente y un salto de celebración.
 *   4. Celebración: confeti y estrellas por todo el laboratorio.
 * Cada paso es una Promise con respaldo por tiempo (Animador), así nunca se queda colgada.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorRobot; };

    function correr(escena, avisos) {
        var robot = escena.robot, lab = escena.lab, consola = escena.consola;
        var son = function (n) { if (typeof avisos.sonido === "function") avisos.sonido(n); };
        var anim = robot.anim;
        if (typeof avisos.cine === "function") avisos.cine(true);
        global.EventosRobot && global.EventosRobot.emitir("robot_activado", {});
        consola.modo("activacion");
        robot.expresion("sorpresa");

        // 1. Energía
        son("energia");
        return Promise.all([
            lab.energizar(),
            anim.agregar(1800, function (u) { robot.brillarModulo(M().suave(u)); })
        ]).then(function () {
            // 2. Activación
            son("encendido");
            robot.brillarJuntas(1);
            robot.senalAntena(4);
            return robot.encenderOjos(true);
        }).then(function () {
            robot.expresion("contento");
            return robot.gesto({ cabeza: 14 }, 700, 2);
        }).then(function () {
            robot.senalAntena(3);
            // 3. Movimiento
            son("movimiento");
            return Promise.all([
                robot.gesto({ "brazo-izq": 150, "brazo-der": -150 }, 1300, 1),
                M().sleep(300).then(function () { return robot.gesto({ "mano-izq": 35, "mano-der": -35 }, 260, 3); })
            ]);
        }).then(function () {
            son("paso");
            return pasoAlFrente(robot);
        }).then(function () {
            son("salto");
            lab.fiestaFinal(true);
            return saltar(robot, 2);
        }).then(function () {
            // 4. Celebración
            son("celebrar");
            [0, 1, 2, 3, 4].forEach(function (i) {
                setTimeout(function () { lab.emitirFiesta(560 + i * 120, 140 + (i % 2) * 80); }, i * 220);
            });
            robot.expresion("corazon");
            return Promise.all([
                robot.gesto({ "brazo-izq": 22, "brazo-der": -22 }, 420, 4),
                lab.celebrar(2400)
            ]);
        }).then(function () {
            return bajarBrazos(robot);
        }).then(function () {
            if (typeof avisos.cine === "function") avisos.cine(false);
        }, function (err) {
            if (typeof avisos.cine === "function") avisos.cine(false);
            throw err;
        });
    }

    /** El robot da un paso hacia el niño: crece un poco y baja, alternando las piernas. */
    function pasoAlFrente(robot) {
        var r = robot.raiz;
        var y0 = r.y, k0 = r.scaleX || 1;
        var sy0 = robot.sombra.y;
        var piernas = function (u) {
            var w = Math.sin(u * Math.PI * 2);
            var pi = robot.partes["pierna-izq"], pd = robot.partes["pierna-der"];
            if (pi && pi.puesta) pi.cont.setRotation(M().rad(12) * Math.max(0, w));
            if (pd && pd.puesta) pd.cont.setRotation(M().rad(-12) * Math.max(0, -w));
        };
        return robot.anim.agregar(1100, function (u) {
            var s = M().suave(u);
            r.setScale(M().lerp(k0, k0 * 1.07, s));
            r.y = y0 + 18 * s - Math.abs(Math.sin(u * Math.PI * 2)) * 10;
            robot.sombra.y = sy0 + 26 * s;
            piernas(u);
        }).then(function () { piernas(0); });
    }

    function saltar(robot, veces) {
        var r = robot.raiz;
        var y0 = r.y;
        return robot.anim.agregar(620 * veces, function (u) {
            var w = Math.abs(Math.sin(u * Math.PI * veces));
            r.y = y0 - 46 * w;
            r.setRotation(Math.sin(u * Math.PI * veces * 2) * 0.05);
            var bi = robot.partes["brazo-izq"], bd = robot.partes["brazo-der"];
            if (bi && bi.puesta) bi.cont.setRotation(M().rad(150 + 20 * w));
            if (bd && bd.puesta) bd.cont.setRotation(M().rad(-150 - 20 * w));
        }).then(function () {
            r.y = y0;
            r.setRotation(0);
        });
    }

    /** Baja los brazos levantados con suavidad. */
    function bajarBrazos(robot) {
        var bi = robot.partes["brazo-izq"], bd = robot.partes["brazo-der"];
        var a = bi && bi.puesta ? bi.cont.rotation : 0, b = bd && bd.puesta ? bd.cont.rotation : 0;
        return robot.anim.agregar(700, function (u) {
            var s = M().suave(u);
            if (bi && bi.puesta) bi.cont.setRotation(M().lerp(a, 0, s));
            if (bd && bd.puesta) bd.cont.setRotation(M().lerp(b, 0, s));
        });
    }

    global.CinematicaRobot = { correr: correr };
})(typeof window !== "undefined" ? window : global);
