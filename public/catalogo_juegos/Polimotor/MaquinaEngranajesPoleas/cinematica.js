/**
 * CinematicaMaquina — la máquina cobra vida (window.CinematicaMaquina).
 *
 * marcha(): al bajar la palanca del panel: el tablero se ilumina, sube la energía, la rueda grande
 *   arranca y todo lo conectado la sigue con su sentido y su velocidad (es la misma transmisión del
 *   tablero, no animaciones sueltas); poleas, correas y la máquina secundaria trabajan y el taller
 *   entero cobra vida.
 * final(): nivel 4: la cámara recorre la fábrica funcionando, lluvia de chispas de colores y Zoe y
 *   Zeus celebran sobre la consola.
 * Cada paso es una Promise con respaldo por tiempo (Animador), así nunca se queda colgada.
 */
(function (global) {
    "use strict";

    var M = function () { return global.MotorMaquina; };
    var EV = function () { return global.EventosMaquina; };

    function marcha(escena, avisos) {
        var tb = escena.tablero;
        var son = function (n) { if (typeof avisos.sonido === "function") avisos.sonido(n); };
        var cfgVel = avisos.velocidad || 0.55;
        var anim = escena.anim;
        escena.bandeja.bloquear(true);
        son("arranque");
        // 1. el tablero se ilumina de punta a punta
        return anim.agregar(800, function (u) {
            tb.encendido = M().suave(u);
            tb.luces.forEach(function (l, i) { l.luz.setAlpha(Math.max(l.on, u * tb.luces.length > i ? 1 : 0)); });
        }).then(function () {
            // 2. la rueda grande arranca; todo lo conectado la sigue
            tb.arrancar(cfgVel);
            if (EV()) EV().emitir("maquina_en_marcha", { nivel: (escena.indice || 0) + 1 });
            son("motor");
            var r = tb.raiz();
            if (r) tb.particulas.emitir(r.def.x, r.def.y, { n: 16, tipos: ["p-chispa", "p-estrella"], vel: 260, grav: 80, vida: 900, escala: 0.45, sumar: true, tintes: [0xffd43b, 0x8ce99a, 0xffffff] });
            // 3. chispas en cada punto de contacto mientras gana velocidad
            var ids = Object.keys(tb.puestos);
            var veces = 0;
            return new Promise(function (resolve) {
                var tick = setInterval(function () {
                    veces += 1;
                    ids.forEach(function (id) {
                        var e = tb.el[id];
                        if (!e || e.tipo !== "engranaje" || !e.def.padre) return;
                        var c = tb.contacto(id);
                        tb.particulas.emitir(c.x, c.y, { n: 2, tipos: ["p-chispa"], vel: 120, grav: 160, vida: 500, escala: 0.3, sumar: true, tintes: [0xffd43b, 0xffffff] });
                    });
                    if (veces >= 6) { clearInterval(tick); resolve(); }
                }, 260);
            });
        }).then(function () {
            return M().sleep(700);
        });
    }

    function final(escena, avisos) {
        var cam = escena.cameras && escena.cameras.main;
        var anim = escena.anim;
        var taller = escena.taller;
        var T = escena.geo ? escena.geo.tablero : { x0: 480, y0: 140, x1: 1300, y1: 780 };
        var foco = { x: (T.x0 + T.x1) / 2, y: (T.y0 + T.y1) / 2 + 10 };
        var son = function (n) { if (typeof avisos.sonido === "function") avisos.sonido(n); };
        if (typeof avisos.cine === "function") avisos.cine(true);
        if (EV()) EV().emitir("celebracion_final", {});
        escena.panel.mostrar(false);
        son("celebrar");
        escena.tablero.arrancar((avisos.velocidad || 0.55) * 1.35);
        var fiesta = setInterval(function () {
            taller.fiesta(T.x0 + Math.random() * (T.x1 - T.x0), T.y0 + 60 + Math.random() * 120);
        }, 300);
        var z0 = cam ? cam.zoom : 1;
        var acercar = cam ? anim.agregar(2400, function (u) {
            var s = M().suave(u);
            cam.setZoom(M().lerp(z0, 1.12, s));
            cam.centerOn(M().lerp(800, foco.x, s), M().lerp(450, foco.y, s));
        }) : M().sleep(2400);
        var entran = typeof avisos.personajes === "function" ? avisos.personajes() : Promise.resolve();
        return Promise.all([acercar, entran]).then(function () {
            return M().sleep(1600);
        }).then(function () {
            clearInterval(fiesta);
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
            clearInterval(fiesta);
            if (cam) { cam.setZoom(1); cam.centerOn(800, 450); }
            if (typeof avisos.cine === "function") avisos.cine(false);
            throw err;
        });
    }

    global.CinematicaMaquina = { marcha: marcha, final: final };
})(typeof window !== "undefined" ? window : global);
