/**
 * EscenarioSimon — capa Phaser 4 de efectos de "¡Simón Dice Corporal!" (window.EscenarioSimon).
 *
 * Es un lienzo transparente que cubre toda la pantalla, delante de Zeus y sin recibir toques (los botones son
 * HTML). Trabaja en coordenadas de pantalla: script.js le pasa los puntos que da Zeus3D.punto(…) o el centro de
 * un botón. Solo dibuja y anima; no decide nada del juego.
 *
 *   estrellas(x, y)        "Tocar cabeza": estrellas que saltan y giran alrededor de la cabeza
 *   destello(x, y, color)  "Aplaudir": anillo, rayitas y chispas alrededor de las manos
 *   ondas(x, y)            "Zapatear": ondas de impacto aplastadas sobre la tarima y polvito
 *   notas(x, y, color)     notas musicales que suben (los botones "cantan" en el acierto)
 *   chispas(rect)          destellos luminosos alrededor de un rectángulo (acierto, botón)
 *   confeti(ms)            lluvia de confeti de colores (fin de ronda y victoria)
 *   lluviaEstrellas(ms)    estrellas que caen sobre el escenario (victoria)
 *   limpiar()              borra todo lo que esté en el aire (reinicio)
 * Si Phaser no carga, cada efecto es una Promise que se resuelve sola (el juego sigue igual).
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var juego = null;
    var sc = null;
    var listoPromesa = null;
    var vivos = [];
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var RES = 2;
    var PALETA = ["#ff6b6b", "#ffd43b", "#51cf66", "#339af0", "#cc5de8", "#ff922b", "#f783ac", "#22b8cf"];

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    function listo() {
        return !!sc;
    }

    // ------------------------------------------------------------------ texturas (canvas → textura)

    function lienzo(w, h) {
        var c = document.createElement("canvas");
        c.width = w * RES;
        c.height = h * RES;
        var ctx = c.getContext("2d");
        ctx.scale(RES, RES);
        return { c: c, ctx: ctx };
    }

    function estrellaPath(ctx, cx, cy, r1, r2, puntas) {
        ctx.beginPath();
        for (var i = 0; i < puntas * 2; i++) {
            var r = i % 2 ? r2 : r1;
            var a = -Math.PI / 2 + i * Math.PI / puntas;
            ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
    }

    function texturas() {
        var t;
        // estrella blanca con borde (se tiñe con setTint)
        t = lienzo(48, 48);
        estrellaPath(t.ctx, 24, 25, 21, 9, 5);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.fill();
        t.ctx.lineWidth = 3;
        t.ctx.strokeStyle = "rgba(90,60,0,0.45)";
        t.ctx.stroke();
        sc.textures.addCanvas("sd-estrella", t.c);

        // destello de cuatro puntas
        t = lienzo(40, 40);
        estrellaPath(t.ctx, 20, 20, 19, 4, 4);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.fill();
        sc.textures.addCanvas("sd-destello", t.c);

        // círculo suave (halo)
        t = lienzo(64, 64);
        var g = t.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.45, "rgba(255,255,255,0.55)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        t.ctx.fillStyle = g;
        t.ctx.fillRect(0, 0, 64, 64);
        sc.textures.addCanvas("sd-halo", t.c);

        // anillo
        t = lienzo(100, 100);
        t.ctx.lineWidth = 6;
        t.ctx.strokeStyle = "#ffffff";
        t.ctx.beginPath();
        t.ctx.arc(50, 50, 44, 0, Math.PI * 2);
        t.ctx.stroke();
        sc.textures.addCanvas("sd-anillo", t.c);

        // rayita (para el aplauso)
        t = lienzo(12, 40);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.beginPath();
        t.ctx.moveTo(6, 0);
        t.ctx.lineTo(11, 34);
        t.ctx.quadraticCurveTo(6, 40, 1, 34);
        t.ctx.closePath();
        t.ctx.fill();
        sc.textures.addCanvas("sd-raya", t.c);

        // nota musical (corchea)
        t = lienzo(40, 52);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.strokeStyle = "rgba(40,20,60,0.55)";
        t.ctx.lineWidth = 3;
        t.ctx.beginPath();
        t.ctx.ellipse(13, 41, 10, 7.5, -0.4, 0, Math.PI * 2);
        t.ctx.fill();
        t.ctx.stroke();
        t.ctx.fillRect(20, 6, 5, 36);
        t.ctx.strokeRect(20, 6, 5, 36);
        t.ctx.beginPath();
        t.ctx.moveTo(22, 6);
        t.ctx.quadraticCurveTo(40, 12, 34, 28);
        t.ctx.quadraticCurveTo(34, 16, 24, 16);
        t.ctx.closePath();
        t.ctx.fill();
        t.ctx.stroke();
        sc.textures.addCanvas("sd-nota", t.c);

        // confeti (rectángulo)
        t = lienzo(14, 22);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.fillRect(0, 0, 14, 22);
        sc.textures.addCanvas("sd-confeti", t.c);

        // polvito
        t = lienzo(20, 20);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.beginPath();
        t.ctx.arc(10, 10, 9, 0, Math.PI * 2);
        t.ctx.fill();
        sc.textures.addCanvas("sd-polvo", t.c);
    }

    // ------------------------------------------------------------------ ayudas

    function color(hex) {
        return parseInt(String(hex || "#ffffff").replace("#", ""), 16);
    }

    function img(key, x, y, tinte, escala) {
        var o = sc.add.image(x, y, key);
        o.setScale((escala || 1) / RES);
        if (tinte != null) o.setTint(color(tinte));
        vivos.push(o);
        return o;
    }

    function quitar(o) {
        var i = vivos.indexOf(o);
        if (i >= 0) vivos.splice(i, 1);
        if (o && o.destroy) o.destroy();
    }

    /** Tween con respaldo por tiempo: la Promise se cumple aunque Phaser no avance (pestaña oculta). */
    function tw(cfg) {
        return new Promise(function (resolve) {
            var hecho = false;
            var fin = function () {
                if (hecho) return;
                hecho = true;
                resolve();
            };
            var dur = (cfg.duration || 300) + (cfg.delay || 0);
            var original = cfg.onComplete;
            cfg.onComplete = function () {
                if (original) original();
                fin();
            };
            try {
                sc.tweens.add(cfg);
            } catch (e) {
                fin();
            }
            setTimeout(function () {
                if (!hecho && original) original();
                fin();
            }, dur + 250);
        });
    }

    function vida(o, cfg) {
        cfg.targets = o;
        var original = cfg.onComplete;
        cfg.onComplete = function () {
            if (original) original();
            quitar(o);
        };
        return tw(cfg);
    }

    function al(min, max) {
        return min + Math.random() * (max - min);
    }

    function dur(ms) {
        return reducido ? Math.min(ms, 260) : ms;
    }

    // ------------------------------------------------------------------ efectos

    function estrellas(x, y) {
        if (!listo() || x == null) return sleep(0);
        var colores = ["#ffd43b", "#ffe066", "#ffffff", "#fcc419"];
        var n = reducido ? 5 : 11;
        var ps = [];
        var halo = img("sd-halo", x, y, "#fff3bf", 2.6);
        halo.setAlpha(0.9);
        ps.push(vida(halo, { scale: 5.6 / RES, alpha: 0, duration: dur(700), ease: "Quad.easeOut" }));
        for (var i = 0; i < n; i++) {
            var a = -Math.PI / 2 + (i - (n - 1) / 2) * (Math.PI / (n + 1)) * 1.6;
            var r = al(70, 130);
            var s = img(i % 3 ? "sd-estrella" : "sd-destello", x, y, colores[i % colores.length], al(0.5, 1));
            s.setAngle(al(0, 360));
            ps.push(vida(s, {
                x: x + Math.cos(a) * r,
                y: y + Math.sin(a) * r - al(10, 40),
                angle: s.angle + al(140, 320),
                alpha: { from: 1, to: 0 },
                scale: { from: s.scaleX * 1.3, to: s.scaleX * 0.4 },
                duration: dur(al(700, 1050)),
                ease: "Cubic.easeOut"
            }));
        }
        return Promise.all(ps);
    }

    function destello(x, y, tinte) {
        if (!listo() || x == null) return sleep(0);
        var c = tinte || "#74c0fc";
        var ps = [];
        var anillo = img("sd-anillo", x, y, c, 0.4);
        ps.push(vida(anillo, { scale: 1.6 / RES, alpha: { from: 1, to: 0 }, duration: dur(520), ease: "Quad.easeOut" }));
        var halo = img("sd-halo", x, y, "#ffffff", 1.6);
        ps.push(vida(halo, { scale: 3.4 / RES, alpha: { from: 0.95, to: 0 }, duration: dur(380) }));
        var n = 8;
        for (var i = 0; i < n; i++) {
            var a = i * Math.PI * 2 / n + al(-0.1, 0.1);
            var raya = img("sd-raya", x + Math.cos(a) * 26, y + Math.sin(a) * 26, i % 2 ? "#ffd43b" : c, 0.9);
            raya.setRotation(a + Math.PI / 2);
            ps.push(vida(raya, {
                x: x + Math.cos(a) * 74,
                y: y + Math.sin(a) * 74,
                alpha: { from: 1, to: 0 },
                duration: dur(420),
                ease: "Quad.easeOut"
            }));
        }
        for (var k = 0; k < 6; k++) {
            var ch = img("sd-destello", x, y, "#ffffff", al(0.4, 0.8));
            var b = al(0, Math.PI * 2);
            ps.push(vida(ch, {
                x: x + Math.cos(b) * al(40, 90),
                y: y + Math.sin(b) * al(40, 90),
                angle: 180,
                alpha: { from: 1, to: 0 },
                duration: dur(al(500, 760))
            }));
        }
        return Promise.all(ps);
    }

    function ondas(x, y) {
        if (!listo() || x == null) return sleep(0);
        var ps = [];
        for (var i = 0; i < 3; i++) {
            var o = img("sd-anillo", x, y, i === 1 ? "#ffd43b" : "#ffffff", 0.3);
            o.setAlpha(0.95);
            o.scaleY = o.scaleX * 0.32;
            ps.push(vida(o, {
                scaleX: (2.4 + i * 0.7) / RES,
                scaleY: (0.75 + i * 0.22) / RES,
                alpha: 0,
                delay: i * 110,
                duration: dur(620),
                ease: "Quad.easeOut"
            }));
        }
        for (var k = 0; k < 7; k++) {
            var p = img("sd-polvo", x + al(-20, 20), y, "#f1d3a5", al(0.4, 0.8));
            var lado = k % 2 ? 1 : -1;
            ps.push(vida(p, {
                x: x + lado * al(40, 110),
                y: y - al(10, 46),
                alpha: { from: 0.9, to: 0 },
                scale: p.scaleX * 1.6,
                duration: dur(al(420, 640)),
                ease: "Quad.easeOut"
            }));
        }
        return Promise.all(ps);
    }

    function notas(x, y, tinte) {
        if (!listo() || x == null) return sleep(0);
        var ps = [];
        for (var i = 0; i < 3; i++) {
            var n = img("sd-nota", x + al(-26, 26), y, i === 1 ? "#ffffff" : tinte || "#ffd43b", al(0.8, 1.1));
            n.setAngle(al(-15, 15));
            ps.push(vida(n, {
                y: y - al(90, 150),
                x: n.x + al(-30, 30),
                angle: n.angle + al(-25, 25),
                alpha: { from: 1, to: 0 },
                delay: i * 110,
                duration: dur(al(900, 1200)),
                ease: "Sine.easeOut"
            }));
        }
        return Promise.all(ps);
    }

    function chispas(rect, n) {
        if (!listo() || !rect) return sleep(0);
        var ps = [];
        var total = reducido ? 6 : (n || 14);
        for (var i = 0; i < total; i++) {
            var x = rect.left + Math.random() * rect.width;
            var y = rect.top + Math.random() * rect.height;
            var s = img(i % 2 ? "sd-destello" : "sd-estrella", x, y, PALETA[i % PALETA.length], al(0.4, 0.9));
            s.setAlpha(0);
            ps.push(vida(s, {
                alpha: { from: 0, to: 1 },
                scale: s.scaleX * 1.5,
                angle: 90,
                yoyo: true,
                delay: al(0, 450),
                duration: dur(al(260, 420))
            }));
        }
        return Promise.all(ps);
    }

    function confeti(ms) {
        if (!listo()) return sleep(0);
        var w = global.innerWidth;
        var h = global.innerHeight;
        var n = reducido ? 20 : 90;
        var largo = ms || 2600;
        var ps = [];
        for (var i = 0; i < n; i++) {
            var c = img("sd-confeti", al(0, w), al(-60, -10), PALETA[i % PALETA.length], al(0.6, 1.1));
            c.setAngle(al(0, 360));
            ps.push(vida(c, {
                y: h + 40,
                x: c.x + al(-120, 120),
                angle: c.angle + al(360, 900),
                delay: al(0, largo * 0.45),
                duration: dur(al(largo * 0.55, largo)),
                ease: "Sine.easeIn"
            }));
        }
        return Promise.all(ps);
    }

    function lluviaEstrellas(ms) {
        if (!listo()) return sleep(0);
        var w = global.innerWidth;
        var h = global.innerHeight;
        var n = reducido ? 8 : 30;
        var largo = ms || 3000;
        var ps = [];
        for (var i = 0; i < n; i++) {
            var s = img("sd-estrella", al(w * 0.2, w * 0.8), -30, ["#ffd43b", "#ffffff", "#ffe066"][i % 3], al(0.5, 1.1));
            ps.push(vida(s, {
                y: al(h * 0.4, h * 0.9),
                angle: al(180, 540),
                alpha: { from: 1, to: 0 },
                delay: al(0, largo * 0.5),
                duration: dur(al(1000, 1700)),
                ease: "Quad.easeIn"
            }));
        }
        return Promise.all(ps);
    }

    function limpiar() {
        if (!sc) return;
        try { sc.tweens.killAll(); } catch (e) { /* noop */ }
        vivos.slice().forEach(quitar);
        vivos = [];
    }

    // ------------------------------------------------------------------ montaje

    function montar(el) {
        if (listoPromesa) return listoPromesa;
        if (!Phaser || !el) {
            console.warn("[EscenarioSimon] falta Phaser o el contenedor");
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        listoPromesa = new Promise(function (resolve) {
            var hecho = false;
            var fin = function (ok) {
                if (hecho) return;
                hecho = true;
                resolve(ok);
            };
            try {
                juego = new Phaser.Game({
                    type: Phaser.AUTO,
                    parent: el,
                    transparent: true,
                    banner: false,
                    scale: { mode: Phaser.Scale.RESIZE, width: global.innerWidth || 1024, height: global.innerHeight || 768 },
                    input: false,
                    scene: {
                        create: function () {
                            sc = this;
                            try {
                                texturas();
                            } catch (e) {
                                console.warn("[EscenarioSimon] texturas", e);
                            }
                            fin(true);
                        }
                    }
                });
                global.__escenarioSimon = juego;
            } catch (e) {
                console.warn("[EscenarioSimon] no se pudo crear Phaser", e);
                fin(false);
            }
            setTimeout(function () { fin(!!sc); }, 4000);
        });
        return listoPromesa;
    }

    global.EscenarioSimon = {
        montar: montar,
        listo: listo,
        juego: function () { return juego; },
        estrellas: estrellas,
        destello: destello,
        ondas: ondas,
        notas: notas,
        chispas: chispas,
        confeti: confeti,
        lluviaEstrellas: lluviaEstrellas,
        limpiar: limpiar
    };
})(window);
