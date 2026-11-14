/**
 * EscenarioHuellas — capa Phaser 4 de efectos de "¡La Pista de Patrones de Huellas y Ritmo!" (window.EscenarioHuellas).
 *
 * Es un lienzo transparente que cubre toda la pantalla, delante de la pista y sin recibir toques (las baldosas
 * son HTML). Trabaja en coordenadas de pantalla: script.js le pasa el rectángulo de una baldosa o un punto.
 * Solo dibuja y anima; no decide nada del juego.
 *
 *   ondaBaldosa(rect, color)   onda luminosa que sale de la baldosa al encenderse (todas las baldosas)
 *   estrellitas(rect, color)   estrellas que saltan (manos) y destellos
 *   golpeSuelo(rect, color)    ondas aplastadas y polvito sobre la baldosa (pies y salto)
 *   chispitas(rect, color)     chispas finas que se dispersan (energía de la huella)
 *   notas(x, y, color)         notas musicales que suben (las baldosas "cantan" en el acierto)
 *   chispas(rect, n)           destellos luminosos sobre un rectángulo (acierto)
 *   serpentinas(ms)            serpentinas de colores que caen (acierto y fin de ronda)
 *   confeti(ms)                lluvia de confeti (fin de ronda y victoria)
 *   lluviaEstrellas(ms)        estrellas que caen sobre la pista (victoria)
 *   limpiar()                  borra todo lo que esté en el aire (reinicio)
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
        sc.textures.addCanvas("pr-estrella", t.c);

        // destello de cuatro puntas
        t = lienzo(40, 40);
        estrellaPath(t.ctx, 20, 20, 19, 4, 4);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.fill();
        sc.textures.addCanvas("pr-destello", t.c);

        // círculo suave (halo)
        t = lienzo(64, 64);
        var g = t.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.45, "rgba(255,255,255,0.55)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        t.ctx.fillStyle = g;
        t.ctx.fillRect(0, 0, 64, 64);
        sc.textures.addCanvas("pr-halo", t.c);

        // anillo
        t = lienzo(100, 100);
        t.ctx.lineWidth = 6;
        t.ctx.strokeStyle = "#ffffff";
        t.ctx.beginPath();
        t.ctx.arc(50, 50, 44, 0, Math.PI * 2);
        t.ctx.stroke();
        sc.textures.addCanvas("pr-anillo", t.c);

        // marco redondeado (la onda que sale de la baldosa conserva su forma de cuadro)
        t = lienzo(120, 120);
        t.ctx.lineWidth = 7;
        t.ctx.strokeStyle = "#ffffff";
        if (t.ctx.roundRect) {
            t.ctx.beginPath();
            t.ctx.roundRect(8, 8, 104, 104, 22);
            t.ctx.stroke();
        } else {
            t.ctx.strokeRect(8, 8, 104, 104);
        }
        sc.textures.addCanvas("pr-marco", t.c);

        // rayita
        t = lienzo(12, 40);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.beginPath();
        t.ctx.moveTo(6, 0);
        t.ctx.lineTo(11, 34);
        t.ctx.quadraticCurveTo(6, 40, 1, 34);
        t.ctx.closePath();
        t.ctx.fill();
        sc.textures.addCanvas("pr-raya", t.c);

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
        sc.textures.addCanvas("pr-nota", t.c);

        // confeti (rectángulo)
        t = lienzo(14, 22);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.fillRect(0, 0, 14, 22);
        sc.textures.addCanvas("pr-confeti", t.c);

        // serpentina (cinta ondulada)
        t = lienzo(18, 80);
        t.ctx.strokeStyle = "#ffffff";
        t.ctx.lineWidth = 7;
        t.ctx.lineCap = "round";
        t.ctx.beginPath();
        t.ctx.moveTo(9, 2);
        t.ctx.bezierCurveTo(1, 22, 17, 40, 9, 58);
        t.ctx.bezierCurveTo(3, 70, 13, 74, 9, 78);
        t.ctx.stroke();
        sc.textures.addCanvas("pr-serpentina", t.c);

        // polvito
        t = lienzo(20, 20);
        t.ctx.fillStyle = "#ffffff";
        t.ctx.beginPath();
        t.ctx.arc(10, 10, 9, 0, Math.PI * 2);
        t.ctx.fill();
        sc.textures.addCanvas("pr-polvo", t.c);
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
            var d = (cfg.duration || 300) + (cfg.delay || 0);
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
            }, d + 250);
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

    /** Centro de un DOMRect (o de un punto suelto). */
    function centro(rect) {
        if (!rect) return null;
        if (rect.width == null) return { x: rect.x, y: rect.y, w: 120, h: 120 };
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            w: rect.width,
            h: rect.height
        };
    }

    // ------------------------------------------------------------------ efectos de las baldosas

    /** Onda luminosa que sale de la baldosa al encenderse: dos marcos que crecen y un halo. */
    function ondaBaldosa(rect, tinte) {
        var c = centro(rect);
        if (!listo() || !c) return sleep(0);
        var col = tinte || "#ffffff";
        var base = Math.max(c.w, c.h) / 120;
        var ps = [];
        for (var i = 0; i < 2; i++) {
            var m = img("pr-marco", c.x, c.y, i ? "#ffffff" : col, base * 0.9);
            m.setAlpha(0.9);
            ps.push(vida(m, {
                scaleX: (base * (1.5 + i * 0.45)) / RES,
                scaleY: (base * (1.5 + i * 0.45)) / RES,
                alpha: 0,
                delay: i * 120,
                duration: dur(560),
                ease: "Quad.easeOut"
            }));
        }
        var halo = img("pr-halo", c.x, c.y, col, base * 1.6);
        halo.setAlpha(0.65);
        ps.push(vida(halo, {
            scale: (base * 2.6) / RES,
            alpha: 0,
            duration: dur(420)
        }));
        return Promise.all(ps);
    }

    /** Estrellas que saltan alrededor de la baldosa (manos) y destellos. */
    function estrellitas(rect, tinte) {
        var c = centro(rect);
        if (!listo() || !c) return sleep(0);
        var colores = [tinte || "#ffd43b", "#ffe066", "#ffffff"];
        var n = reducido ? 5 : 10;
        var ps = [];
        for (var i = 0; i < n; i++) {
            var a = i * Math.PI * 2 / n + al(-0.2, 0.2);
            var r0 = Math.max(c.w, c.h) * 0.32;
            var s = img(i % 3 ? "pr-estrella" : "pr-destello", c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0,
                colores[i % colores.length], al(0.45, 0.9));
            ps.push(vida(s, {
                x: c.x + Math.cos(a) * al(r0 * 1.6, r0 * 2.6),
                y: c.y + Math.sin(a) * al(r0 * 1.6, r0 * 2.6) - al(0, 30),
                angle: al(180, 420),
                alpha: { from: 1, to: 0 },
                duration: dur(al(520, 820)),
                ease: "Quad.easeOut"
            }));
        }
        return Promise.all(ps);
    }

    /** Ondas aplastadas y polvito sobre la baldosa: el golpe del PIE o de la RODILLA. */
    function golpeSuelo(rect, tinte) {
        var c = centro(rect);
        if (!listo() || !c) return sleep(0);
        var base = Math.max(c.w, c.h) / 100;
        var y0 = c.y + c.h * 0.3;
        var ps = [];
        for (var i = 0; i < 3; i++) {
            var o = img("pr-anillo", c.x, y0, i === 1 ? tinte || "#ffd43b" : "#ffffff", base * 0.4);
            o.setAlpha(0.95);
            o.scaleY = o.scaleX * 0.3;
            ps.push(vida(o, {
                scaleX: (base * (1.6 + i * 0.5)) / RES,
                scaleY: (base * (0.5 + i * 0.16)) / RES,
                alpha: 0,
                delay: i * 100,
                duration: dur(620),
                ease: "Quad.easeOut"
            }));
        }
        for (var k = 0; k < 7; k++) {
            var p = img("pr-polvo", c.x + al(-c.w * 0.2, c.w * 0.2), y0, "#ffe8cc", al(0.35, 0.75));
            var lado = k % 2 ? 1 : -1;
            ps.push(vida(p, {
                x: p.x + lado * al(c.w * 0.4, c.w * 0.9),
                y: y0 - al(10, 50),
                alpha: { from: 0.9, to: 0 },
                scale: p.scaleX * 1.6,
                duration: dur(al(420, 640)),
                ease: "Quad.easeOut"
            }));
        }
        return Promise.all(ps);
    }

    /** Chispitas finas que se dispersan desde la baldosa (energía de la huella). */
    function chispitas(rect, tinte) {
        var c = centro(rect);
        if (!listo() || !c) return sleep(0);
        var col = tinte || "#ffffff";
        var ps = [];
        var n = reducido ? 6 : 12;
        for (var i = 0; i < n; i++) {
            var a = i * Math.PI * 2 / n + al(-0.15, 0.15);
            var r0 = Math.max(c.w, c.h) * 0.22;
            var raya = img("pr-raya", c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0, i % 2 ? "#ffffff" : col, al(0.5, 0.95));
            raya.setRotation(a + Math.PI / 2);
            ps.push(vida(raya, {
                x: c.x + Math.cos(a) * r0 * al(2.2, 3.2),
                y: c.y + Math.sin(a) * r0 * al(2.2, 3.2),
                alpha: { from: 1, to: 0 },
                duration: dur(al(380, 560)),
                ease: "Quad.easeOut"
            }));
        }
        var halo = img("pr-halo", c.x, c.y, col, Math.max(c.w, c.h) / 64);
        ps.push(vida(halo, { scale: halo.scaleX * 1.9, alpha: { from: 0.8, to: 0 }, duration: dur(400) }));
        return Promise.all(ps);
    }

    // ------------------------------------------------------------------ efectos del juego

    function notas(x, y, tinte) {
        if (!listo() || x == null) return sleep(0);
        var ps = [];
        for (var i = 0; i < 3; i++) {
            var n = img("pr-nota", x + al(-26, 26), y, i === 1 ? "#ffffff" : tinte || "#ffd43b", al(0.8, 1.1));
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
            var s = img(i % 2 ? "pr-destello" : "pr-estrella", x, y, PALETA[i % PALETA.length], al(0.4, 0.9));
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

    /** Serpentinas de colores que caen meciéndose (acierto y fin de ronda). */
    function serpentinas(ms) {
        if (!listo()) return sleep(0);
        var w = global.innerWidth;
        var h = global.innerHeight;
        var n = reducido ? 10 : 34;
        var largo = ms || 2200;
        var ps = [];
        for (var i = 0; i < n; i++) {
            var s = img("pr-serpentina", al(0, w), al(-90, -20), PALETA[i % PALETA.length], al(0.7, 1.3));
            s.setAngle(al(-25, 25));
            ps.push(vida(s, {
                y: h + 70,
                x: s.x + al(-150, 150),
                angle: s.angle + al(-180, 180),
                alpha: { from: 1, to: 0.85 },
                delay: al(0, largo * 0.45),
                duration: dur(al(largo * 0.6, largo)),
                ease: "Sine.easeIn"
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
            var c = img("pr-confeti", al(0, w), al(-60, -10), PALETA[i % PALETA.length], al(0.6, 1.1));
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
            var s = img("pr-estrella", al(w * 0.2, w * 0.8), -30, ["#ffd43b", "#ffffff", "#ffe066"][i % 3], al(0.5, 1.1));
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
            console.warn("[EscenarioHuellas] falta Phaser o el contenedor");
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
                                console.warn("[EscenarioHuellas] texturas", e);
                            }
                            fin(true);
                        }
                    }
                });
                global.__escenarioPista = juego;
            } catch (e) {
                console.warn("[EscenarioHuellas] no se pudo crear Phaser", e);
                fin(false);
            }
            setTimeout(function () { fin(!!sc); }, 4000);
        });
        return listoPromesa;
    }

    global.EscenarioHuellas = {
        montar: montar,
        listo: listo,
        juego: function () { return juego; },
        ondaBaldosa: ondaBaldosa,
        estrellitas: estrellitas,
        golpeSuelo: golpeSuelo,
        chispitas: chispitas,
        notas: notas,
        chispas: chispas,
        serpentinas: serpentinas,
        confeti: confeti,
        lluviaEstrellas: lluviaEstrellas,
        limpiar: limpiar
    };
})(window);
