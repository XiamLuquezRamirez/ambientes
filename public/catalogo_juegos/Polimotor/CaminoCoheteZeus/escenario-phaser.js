/**
 * EscenarioCohete — escena Phaser 4 de "¡El Camino del Cohete de Zeus!" (window.EscenarioCohete).
 *
 * Un solo lienzo a pantalla completa detrás de la interfaz. La cámara encaja el mundo (ancho fijo, alto según
 * la pantalla) en el hueco que dejan la cabecera y la fila de abajo. Dibuja:
 *   - el espacio: degradado, nebulosas, tres capas de estrellas con paralaje y planetas lejanos. El fondo
 *     reacciona: las estrellas cercanas al cohete brillan, todo se desplaza un poco con el cohete, las nebulosas
 *     laten al acertar y se tiñen de rojo cuando el cohete se sale de la pista;
 *   - la pista elevada con volumen (sombra, costado, borde de neón, superficie y guía de puntos), dibujada una
 *     vez en un canvas 2D. Los caminos falsos son parte de la misma pista y se ven igual. Hay una copia roja
 *     que aparece mientras el cohete está fuera;
 *   - luces que se encienden al pasar, el rastro dorado del avance y decoración (planetas y asteroides) en las
 *     celdas libres; plataforma de despegue y estación lunar sobre una luna;
 *   - el cohete (contenedor): cuerpo, Zeus en la ventana, reflejos, llama que se mueve, humo y estela de
 *     estrellas, inclinación en las curvas, flote cuando está quieto.
 *   - la cinemática final hacia la base espacial de Zeus.
 *
 * El pilotaje usa ReglasCohete.mover (geometría pura); esta escena solo avisa a script.js con eventos:
 *   on({ zona, avance, luz, callejon, meta, desvio, mueve })
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var I = global.IconosCohete;
    var R = global.ReglasCohete;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2;
    var ADD = "ADD";
    var COLORES_FIESTA = [0xffe066, 0xff8fc7, 0x7cf3ff, 0xb197fc, 0xffb36b, 0xffffff];

    var juego = null;
    var sc = null;
    var cfg = null;
    var cfgJ = {};
    var listoPromesa = null;
    var dims = { W: 1600, H: 900 };
    var area = { left: 0, top: 0, width: 800, height: 600 };
    var camLibre = false;      // la cinemática mueve la cámara a mano
    var ev = {};

    var rec = null;            // recorrido actual
    var objRec = [];           // objetos del recorrido (se destruyen al cambiar)
    var pistaImg = null, pistaRoja = null, pistaBrillo = null, rastroG = null;
    var luces = [];
    var plataforma = null, estacion = null, luna = null;
    var senal = null;
    var rojo = 0;              // 0..1 cuánto se ve la pista roja

    var fondo = { estrellas: [], nebulas: [], lejanos: [] };
    var cohete = null;         // { cont, cuerpo, vidrio, llama, llamaIn, halo, frente }
    var hangar = null;         // { interior, arriba, abajo, x0, y, cx, esc }
    var humo = null, estela = null, chispas = null;
    var base = null;           // escena final

    var pil = {
        x: 0, y: 0, nodo: { rama: -1, i: 0 },
        valido: null, avance: 0, zona: "pista",
        arrastrando: false, bloqueado: true, objetivo: null, offset: { x: 0, y: 0 },
        fueraDesde: 0, enCallejon: false, enMeta: false,
        ang: 0, angVis: 0, vel: 0, empuje: 0.25, visible: false, flotar: true,
        mira: 0, miraVis: 0, miraPrev: 0, yaw: 0, saltoPend: false,   // giro 3D: yaw 0 = perfil a la derecha, π = a la izquierda
        tUltimoMov: 0, auto: false
    };

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function emitir(nombre) {
        var f = ev[nombre];
        if (typeof f === "function") {
            try { f.apply(null, [].slice.call(arguments, 1)); } catch (e) { console.warn("[EscenarioCohete]", nombre, e); }
        }
    }

    // ------------------------------------------------------------------ tweens con respaldo (pestaña oculta)

    var CLAVES_TWEEN = ["targets", "duration", "delay", "ease", "yoyo", "repeat", "repeatDelay", "hold", "onComplete", "onUpdate", "onStart"];

    function aplicarFinal(c) {
        if (c.yoyo) return;
        [].concat(c.targets || []).forEach(function (o) {
            if (!o) return;
            Object.keys(c).forEach(function (k) {
                if (CLAVES_TWEEN.indexOf(k) >= 0) return;
                var v = c[k];
                if (v && typeof v === "object" && typeof v.to === "number") v = v.to;
                if (typeof v !== "number") return;
                if (k === "scale" && o.setScale) o.setScale(v);
                else o[k] = v;
            });
        });
    }

    function tw(c) {
        if (!sc) return Promise.resolve();
        if (reducido) c.duration = Math.min(c.duration || 300, 80);
        var dur = (c.duration || 300) * ((c.repeat || 0) + 1) * (c.yoyo ? 2 : 1) + (c.delay || 0);
        return new Promise(function (resolve) {
            var hecho = false;
            var prev = c.onComplete;
            var fin = function () { if (!hecho) { hecho = true; resolve(); } };
            c.onComplete = function () { if (typeof prev === "function") prev(); fin(); };
            var t = sc.tweens.add(c);
            setTimeout(function () {
                if (hecho) return;
                if (t && t.isPlaying && t.isPlaying()) t.stop();
                aplicarFinal(c);
                if (typeof prev === "function") prev();
                fin();
            }, dur + 300);
        });
    }

    /** Anima un valor de 0 a 1 llamando a paso(u); avanza con setTimeout aunque Phaser no pinte. */
    function animar(ms, paso, curva) {
        return new Promise(function (resolve) {
            var t0 = performance.now();
            var dur = reducido ? Math.min(ms, 150) : ms;
            var tick = function () {
                var u = Math.min(1, (performance.now() - t0) / dur);
                var e = curva ? curva(u) : u;
                try { paso(e, u); } catch (er) { console.warn(er); }
                if (u >= 1) { resolve(); return; }
                setTimeout(tick, 16);
            };
            tick();
        });
    }

    function suave(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }

    // ------------------------------------------------------------------ texturas

    function origen(s) {
        var m = /viewBox="([^"]+)"/.exec(s || "");
        var v = m ? m[1].split(/\s+/).map(Number) : [0, 0, 100, 100];
        return { w: v[2], h: v[3] };
    }

    function cargarSvg(clave, s) {
        return new Promise(function (resolve) {
            var o = origen(s);
            var img = new Image();
            img.onload = function () {
                var c = document.createElement("canvas");
                c.width = Math.ceil(o.w * RES);
                c.height = Math.ceil(o.h * RES);
                c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                if (sc.textures.exists(clave)) sc.textures.remove(clave);
                sc.textures.addCanvas(clave, c);
                resolve();
            };
            img.onerror = function () {
                console.warn("[EscenarioCohete] no se pudo dibujar", clave);
                resolve();
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function texturaCanvas(clave, w, h, dibujar) {
        if (sc.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        dibujar(c.getContext("2d"), w, h);
        sc.textures.addCanvas(clave, c);
    }

    function radial(ctx, s, stops) {
        var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        stops.forEach(function (st) { g.addColorStop(st[0], st[1]); });
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
    }

    function texturasFx() {
        texturaCanvas("fx-halo", 128, 128, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,0.95)"], [0.4, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-nebula", 256, 256, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,0.55)"], [0.35, "rgba(255,255,255,0.28)"], [0.7, "rgba(255,255,255,0.08)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-humo", 64, 64, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,0.85)"], [0.5, "rgba(235,240,255,0.45)"], [1, "rgba(220,228,255,0)"]]);
        });
        texturaCanvas("fx-punto", 16, 16, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.8)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-chispa", 24, 24, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.3, "rgba(255,255,255,0.9)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-destello", 64, 64, function (ctx, s) {
            ctx.translate(s / 2, s / 2);
            var g = ctx.createRadialGradient(0, 0, 0, 0, 0, s / 2);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            for (var i = 0; i < 8; i++) {
                var r = i % 2 === 0 ? s * 0.5 : s * 0.09;
                var a = -Math.PI / 2 + i * Math.PI / 4;
                ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
        });
        texturaCanvas("fx-estrella", 48, 48, function (ctx, s) {
            ctx.translate(s / 2, s / 2);
            ctx.beginPath();
            for (var i = 0; i < 10; i++) {
                var r = i % 2 === 0 ? s * 0.48 : s * 0.2;
                var a = -Math.PI / 2 + i * Math.PI / 5;
                ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        });
        texturaCanvas("fx-estela", 128, 16, function (ctx, w, h) {
            var g = ctx.createLinearGradient(0, 0, w, 0);
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(1, "rgba(255,255,255,1)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w - 6, 2);
            ctx.arc(w - 8, h / 2, h / 2 - 2, -Math.PI / 2, Math.PI / 2);
            ctx.closePath();
            ctx.fill();
        });
        // bombilla de la pista: núcleo blanco, anillo de color (se tiñe)
        texturaCanvas("fx-luz", 48, 48, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.22, "rgba(255,255,255,0.95)"], [0.42, "rgba(255,255,255,0.55)"], [1, "rgba(255,255,255,0)"]]);
        });
        // señal amable del callejón sin salida: anillo violeta con flecha de regreso
        texturaCanvas("fx-senal", 160, 160, function (ctx, s) {
            ctx.translate(s / 2, s / 2);
            var g = ctx.createRadialGradient(0, 0, 10, 0, 0, s / 2);
            g.addColorStop(0, "rgba(255,240,180,0.95)");
            g.addColorStop(0.55, "rgba(177,151,252,0.9)");
            g.addColorStop(1, "rgba(177,151,252,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.lineWidth = 9;
            ctx.strokeStyle = "#7048e8";
            ctx.stroke();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(4, 4, s * 0.15, -Math.PI * 0.95, Math.PI * 0.55);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-s * 0.2, -s * 0.06);
            ctx.lineTo(-s * 0.12, 6);
            ctx.lineTo(-s * 0.02, -s * 0.06);
            ctx.stroke();
        });
    }

    // ------------------------------------------------------------------ cámara y coordenadas

    /** Hueco de la pantalla donde cabe el mundo: debajo de la cabecera y encima de la fila de abajo. */
    function medirArea() {
        var vw = global.innerWidth, vh = global.innerHeight;
        var cab = document.querySelector(".hud-top");
        var arriba = cab ? Math.max(60, cab.getBoundingClientRect().bottom) : 80;
        var abajo = vh < 720 ? 74 : 86;
        area = { left: 10, top: arriba + 2, width: Math.max(200, vw - 20), height: Math.max(200, vh - arriba - 2 - abajo) };
        return area;
    }

    /** Alto del mundo para la pantalla actual (los recorridos se generan con estas medidas). */
    function dimensionesMundo() {
        medirArea();
        var W = Number(cfgJ.anchoMundo) || 1600;
        // tableta en vertical: un mundo más angosto para que la pista conserve un buen ancho bajo el dedo
        if (area.height / area.width > 0.85) W = Math.round(W * 0.72);
        var H = clamp(Math.round(W * area.height / area.width), Number(cfgJ.altoMinimo) || 900, Number(cfgJ.altoMaximo) || 1500);
        return { W: W, H: H };
    }

    function zoomAjuste() {
        return Math.min(area.width / dims.W, area.height / dims.H);
    }

    function reacomodar() {
        if (!sc) return;
        sc.scale.updateBounds();
        medirArea();
        if (camLibre) return;
        var cam = sc.cameras.main;
        var z = zoomAjuste();
        var cx = area.left + area.width / 2;
        var cy = area.top + area.height / 2;
        cam.setZoom(z);
        cam.centerOn(dims.W / 2 + (sc.scale.width / 2 - cx) / z, dims.H / 2 + (sc.scale.height / 2 - cy) / z);
    }

    function vista() {
        var cam = sc.cameras.main;
        var z = cam.zoom;
        return {
            z: z,
            x0: cam.scrollX + cam.width * (1 - 1 / z) / 2,
            y0: cam.scrollY + cam.height * (1 - 1 / z) / 2
        };
    }

    function aPantalla(x, y) {
        if (!sc) return { x: x, y: y };
        var v = vista();
        var r = sc.game.canvas.getBoundingClientRect();
        var kx = r.width / sc.scale.width, ky = r.height / sc.scale.height;
        return { x: r.left + (x - v.x0) * v.z * kx, y: r.top + (y - v.y0) * v.z * ky };
    }

    function mundoDePantalla(x, y) {
        var v = vista();
        var r = sc.game.canvas.getBoundingClientRect();
        var kx = sc.scale.width / r.width, ky = sc.scale.height / r.height;
        return { x: v.x0 + ((x - r.left) * kx) / v.z, y: v.y0 + ((y - r.top) * ky) / v.z };
    }

    // ------------------------------------------------------------------ fondo espacial

    function crearFondo() {
        sc.cameras.main.setBackgroundColor("#0a0f3a");
        var r = R.azar(R.semillaNueva());
        var W = 1600, H = 1200;
        // nebulosas suaves que se desplazan despacio
        [[0x7048e8, 0.15, 0.25], [0x15aabf, 0.85, 0.2], [0xe64980, 0.75, 0.85], [0x4c6ef5, 0.25, 0.8], [0x9c36b5, 0.5, 0.5]].forEach(function (n, k) {
            var s = sc.add.image(W * n[1], H * n[2], "fx-nebula");
            s.setScale(r.entre(4.5, 6.5));
            s.setTint(n[0]);
            s.setAlpha(0.32);
            s.setBlendMode(ADD);
            s.setScrollFactor(0.15);
            s.setDepth(-90);
            s.setData("base", 0.32);
            s.setData("color", n[0]);
            fondo.nebulas.push(s);
            if (!reducido) {
                sc.tweens.add({ targets: s, x: s.x + r.entre(-120, 120), y: s.y + r.entre(-80, 80), duration: r.entre(14000, 22000), yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: k * 700 });
            }
        });
        // planetas lejanos, tenues
        [["planetaRayas", -0.12, 0.08, 1.4], ["planetaLava", 1.08, 0.92, 1.2], ["planetaAnillo", 1.14, 0.06, 1.3], ["planetaHielo", -0.1, 0.95, 1.2]].forEach(function (p) {
            var s = sc.add.image(W * p[1], H * p[2], "ico-" + p[0]);
            s.setScale(p[3] / RES);
            s.setAlpha(0.55);
            s.setScrollFactor(0.3);
            s.setDepth(-75);
            fondo.lejanos.push(s);
            if (!reducido) sc.tweens.add({ targets: s, y: s.y - 14, angle: 4, duration: 6000 + r() * 3000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        });
        // tres capas de estrellas
        var capas = [[170, "fx-punto", 0.08, 0.2, 0.55, 0.12], [90, "fx-chispa", 0.25, 0.5, 0.7, 0.3], [28, "fx-destello", 0.25, 0.45, 0.85, 0.55]];
        capas.forEach(function (cp, ci) {
            for (var i = 0; i < cp[0]; i++) {
                var s = sc.add.image(r.entre(-1400, W + 2600), r.entre(-1000, H + 1000), cp[1]);
                s.setScale(r.entre(cp[2], cp[3]) * (cp[1] === "fx-punto" ? 2.2 : 1));
                var a = r.entre(0.35, cp[4]);
                s.setAlpha(a);
                if (ci > 0 && r() < 0.35) s.setTint([0xffe066, 0x99e9f2, 0xffc9e3, 0xd0bfff][Math.floor(r() * 4)]);
                s.setBlendMode(ADD);
                s.setScrollFactor(cp[5]);
                s.setDepth(-80 + ci * 8);
                fondo.estrellas.push({ s: s, bx: s.x, by: s.y, k: cp[5], a: a, f: r() * 6.28, v: r.entre(0.6, 2.2), boost: 0 });
            }
        });
        // estrellas fugaces de adorno
        if (!reducido) {
            sc.time.addEvent({ delay: 5200, loop: true, callback: function () { if (Math.random() < 0.7) estrellaFugazAdorno(); } });
        }
    }

    function estrellaFugazAdorno() {
        var v = vista();
        var ancho = sc.scale.width / v.z;
        var x = v.x0 + Math.random() * ancho;
        var y = v.y0 + Math.random() * 120;
        var s = sc.add.image(x, y, "fx-estela");
        s.setBlendMode(ADD);
        s.setDepth(-60);
        s.setScale(1.6, 0.8);
        s.setRotation(0.5);
        s.setAlpha(0.9);
        sc.tweens.add({ targets: s, x: x + 520, y: y + 290, alpha: 0, duration: 1100, ease: "Quad.easeIn", onComplete: function () { s.destroy(); } });
    }

    /** El fondo reacciona: paralaje con el cohete, estrellas que titilan y brillan cerca del cohete. */
    function actualizarFondo(t) {
        var cam = sc.cameras.main;
        var dx = cohete ? (pil.x - dims.W / 2) : 0;
        var dy = cohete ? (pil.y - dims.H / 2) : 0;
        for (var i = 0; i < fondo.estrellas.length; i++) {
            var e = fondo.estrellas[i];
            var px = -dx * 0.05 * (1 - e.k) * 2;
            var py = -dy * 0.05 * (1 - e.k) * 2;
            e.s.x = e.bx + px;
            e.s.y = e.by + py;
            var a = e.a * (0.62 + 0.38 * Math.sin(t * 0.001 * e.v + e.f));
            if (pil.visible && !reducido) {
                // posición de la estrella en el mundo (descontando su paralaje)
                var wx = e.s.x + cam.scrollX * (1 - e.k);
                var wy = e.s.y + cam.scrollY * (1 - e.k);
                var d = Math.hypot(wx - pil.x, wy - pil.y);
                var objetivo = d < 260 ? (1 - d / 260) * (0.4 + pil.empuje) : 0;
                e.boost = lerp(e.boost, objetivo, 0.08);
            } else e.boost *= 0.92;
            e.s.setAlpha(Math.min(1, a + e.boost));
        }
        // nebulosas: se tiñen de rojo cuando el cohete está fuera de la pista
        for (var n = 0; n < fondo.nebulas.length; n++) {
            var nb = fondo.nebulas[n];
            var c = Phaser.Display.Color.ValueToColor(nb.getData("color"));
            var rojoK = rojo * 0.7;
            var col = Phaser.Display.Color.GetColor(
                Math.round(lerp(c.red, 255, rojoK)), Math.round(lerp(c.green, 60, rojoK)), Math.round(lerp(c.blue, 90, rojoK)));
            nb.setTint(col);
            var pulso = nb.getData("pulso") || 0;
            nb.setAlpha(nb.getData("base") + pulso + rojo * 0.08);
            if (pulso > 0) nb.setData("pulso", Math.max(0, pulso - 0.006));
        }
    }

    /** Las nebulosas laten (acierto, recorrido completado). */
    function pulsoFondo(fuerza) {
        fondo.nebulas.forEach(function (nb) { nb.setData("pulso", Math.min(0.45, (nb.getData("pulso") || 0) + (fuerza || 0.2))); });
    }

    // ------------------------------------------------------------------ pista

    var PALETA = {
        normal: { sombra: "rgba(2,4,30,0.9)", lado2: "#1a1652", lado1: "#2a2380", lado0: "#3a31a8", neon: "#3fe6ff", borde: "#c08cff", base: "#24379a", medio: "#3550c4", brillo: "#9fb6ff", puntos: "#ffffff" },
        roja: { sombra: "rgba(30,2,10,0.9)", lado2: "#5c0a0a", lado1: "#861414", lado0: "#a61e1e", neon: "#ff3b3b", borde: "#ffa8a8", base: "#c92a2a", medio: "#e03131", brillo: "#ffc9c9", puntos: "#fff5f5" }
    };

    function lineasDe(r) {
        return [r.principal].concat(r.falsos.map(function (f) { return f.pts; }));
    }

    /** La pista con volumen en un canvas 2D (se dibuja una vez por recorrido). */
    function canvasPista(r, pal, escala, sinSombra) {
        var k = escala || 1;
        var c = document.createElement("canvas");
        c.width = Math.ceil(r.W * k);
        c.height = Math.ceil(r.H * k);
        var x = c.getContext("2d");
        x.scale(k, k);
        x.lineCap = "round";
        x.lineJoin = "round";
        var lineas = lineasDe(r);
        var w = r.ancho;
        var trazo = function (ancho, color, dy, blur, alpha, dash) {
            x.save();
            x.translate(0, dy || 0);
            x.strokeStyle = color;
            x.lineWidth = ancho;
            x.globalAlpha = alpha == null ? 1 : alpha;
            if (blur) {
                x.shadowBlur = blur * k;
                x.shadowColor = color;
            }
            if (dash) x.setLineDash(dash);
            lineas.forEach(function (pts) {
                x.beginPath();
                x.moveTo(pts[0].x, pts[0].y);
                for (var i = 1; i < pts.length; i++) x.lineTo(pts[i].x, pts[i].y);
                x.stroke();
            });
            x.restore();
        };
        if (!sinSombra) trazo(w + 22, pal.sombra, 30, 34, 0.55);       // sombra en el "suelo": la pista flota
        trazo(w + 8, pal.lado2, 17);                                    // costado (grosor)
        trazo(w + 8, pal.lado1, 11);
        trazo(w + 8, pal.lado0, 5);
        trazo(w + 10, pal.neon, 0, 24, 1);                              // borde de neón
        trazo(w + 3, pal.borde, 0);
        trazo(w - 7, pal.base, 0);                                      // superficie
        trazo(w * 0.62, pal.medio, 0, 0, 0.9);
        trazo(w * 0.24, pal.brillo, -w * 0.14, 12, 0.32);               // brillo de arriba: parece un tubo
        trazo(8, pal.puntos, 0, 10, 0.8, [0.1, 30]);                    // guía de puntos por el centro
        return c;
    }

    function texturaDeCanvas(clave, c) {
        if (sc.textures.exists(clave)) sc.textures.remove(clave);
        sc.textures.addCanvas(clave, c);
    }

    function descargar() {
        objRec.forEach(function (o) {
            if (!o) return;
            sc.tweens.killTweensOf(o);
            o.destroy();
        });
        objRec = [];
        luces = [];
        pistaImg = pistaRoja = pistaBrillo = rastroG = null;
        plataforma = estacion = luna = senal = hangar = null;
        ["pista-n", "pista-r"].forEach(function (k) { if (sc.textures.exists(k)) sc.textures.remove(k); });
    }

    function guardar(o) {
        objRec.push(o);
        return o;
    }

    function celdaCentro(r, c) {
        var g = r.rejilla;
        return { x: g.m + g.cx * (c[0] + 0.5), y: g.m + g.cy * (c[1] + 0.5) };
    }

    /** Celdas sin pista (ni caminos falsos ni sus vecinas inmediatas en la columna de la estación). */
    function celdasLibres(r) {
        var ocupadas = {};
        r.celdas.forEach(function (c) { ocupadas[c[0] + "," + c[1]] = true; });
        r.falsos.forEach(function (f) {
            var p = f.pts[f.pts.length - 1];
            var g = r.rejilla;
            ocupadas[Math.floor((p.x - g.m) / g.cx) + "," + Math.floor((p.y - g.m) / g.cy)] = true;
        });
        var g = r.rejilla;
        var fin = r.celdas[r.celdas.length - 1];
        var libres = [];
        for (var c = 0; c < g.cols; c++) {
            for (var f = 0; f < g.filas; f++) {
                if (ocupadas[c + "," + f]) continue;
                if (c === g.cols - 1 && Math.abs(f - fin[1]) <= 1) continue; // la estación y la luna
                if (c === 0 && f === g.filas - 1) continue;                 // hueco de Zoe
                libres.push([c, f]);
            }
        }
        return libres;
    }

    /** Decoración en celdas libres: planetas, asteroides y estrellas (más variedad en los recorridos altos). */
    function decorar(r) {
        var rnd = R.azar((r.semilla ^ 0x5bd1e995) >>> 0);
        var libres = celdasLibres(r);
        for (var i = libres.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = libres[i]; libres[i] = libres[j]; libres[j] = t;
        }
        var nivel = Math.max(1, r.id || 1);
        var planetas = ["planetaAnillo", "planetaRayas", "planetaLava", "planetaHielo"];
        var g = r.rejilla;
        var lado = Math.min(g.cx, g.cy);
        var nPlanetas = Math.min(libres.length, nivel === 3 ? 4 : nivel + 1);
        var nAster = Math.min(Math.max(0, libres.length - nPlanetas), nivel >= 2 ? nivel : 1);
        libres.forEach(function (c, k) {
            var p = celdaCentro(r, c);
            p.x += rnd.entre(-0.12, 0.12) * g.cx;
            p.y += rnd.entre(-0.12, 0.12) * g.cy;
            var s;
            if (k < nPlanetas) {
                var clave = planetas[(k + (r.semilla % 4)) % 4];
                var o = origen(I.SVG[clave]);
                s = sc.add.image(p.x, p.y, "ico-" + clave);
                s.setScale((lado * rnd.entre(0.5, 0.7)) / Math.max(o.w, o.h) / RES);
                s.setDepth(-5);
                s.setAlpha(0.95);
                if (!reducido) sc.tweens.add({ targets: s, y: s.y - 10, angle: rnd.entre(-6, 6), duration: rnd.entre(2600, 4200), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            } else if (k < nPlanetas + nAster) {
                s = sc.add.image(p.x, p.y, "ico-asteroide");
                s.setScale((lado * rnd.entre(0.2, 0.32)) / 100 / RES);
                s.setDepth(-5);
                if (!reducido) sc.tweens.add({ targets: s, angle: rnd() < 0.5 ? 360 : -360, duration: rnd.entre(14000, 24000), repeat: -1 });
            } else {
                s = sc.add.image(p.x, p.y, "ico-estrella");
                s.setScale((lado * rnd.entre(0.1, 0.16)) / 100 / RES);
                s.setDepth(-5);
                s.setAlpha(0.85);
                if (!reducido) sc.tweens.add({ targets: s, scale: s.scale * 1.3, alpha: 0.5, duration: rnd.entre(900, 1600), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            }
            guardar(s);
        });
    }

    function crearLuces(r) {
        var tam = r.ancho * 0.36 / 48;
        r.luces.forEach(function (l) {
            var glow = guardar(sc.add.image(l.x, l.y, "fx-halo"));
            glow.setBlendMode(ADD);
            glow.setScale(r.ancho * 0.5 / 128);
            glow.setAlpha(0.18);
            glow.setTint(0x7cf3ff);
            glow.setDepth(2);
            var s = guardar(sc.add.image(l.x, l.y, "fx-luz"));
            s.setScale(tam);
            s.setTint(0x9fb6ff);
            s.setAlpha(0.75);
            s.setDepth(3);
            luces.push({ d: l, s: s, glow: glow, on: false, tam: tam });
        });
    }

    function encenderLuz(L, silencio) {
        if (L.on) return;
        L.on = true;
        L.s.setTint(0xfff3a0);
        L.s.setAlpha(1);
        L.glow.setTint(0xffd43b);
        sc.tweens.killTweensOf([L.s, L.glow]);
        L.s.setScale(L.tam * 1.9);
        L.glow.setScale(rec.ancho * 0.9 / 128);
        L.glow.setAlpha(0.85);
        sc.tweens.add({ targets: L.s, scale: L.tam * 1.15, duration: 380, ease: "Back.easeOut" });
        sc.tweens.add({ targets: L.glow, scale: rec.ancho * 0.62 / 128, alpha: 0.55, duration: 600 });
        if (!silencio) chispasEn(L.d.x, L.d.y, 4, [0xffe066, 0xffffff, 0x7cf3ff], 0.5);
    }

    function crearExtremos(r) {
        var g = r.rejilla;
        var lado = Math.min(g.cx, g.cy);
        // Estación con hangar. El hueco (140 × 90 unidades del dibujo) queda a la altura de la pista y empieza
        // 0,1 anchos antes del final; el cohete cabe adentro (0,8 anchos de alto y 1,25 de largo).
        var k = r.ancho * 0.0089;              // unidades del mundo por unidad del dibujo
        var x0 = r.meta.x - r.ancho * 0.1;
        var y0 = r.meta.y;
        var abajo = r.celdas[r.celdas.length - 1][1] === g.filas - 1;
        luna = guardar(sc.add.image(x0 + 113 * k, y0 + 81 * k + lado * (abajo ? 0.22 : 0.4), "ico-luna"));
        luna.setScale((lado * (abajo ? 1.25 : 1.5)) / 320 / RES);
        luna.setDepth(-4);
        if (!reducido) sc.tweens.add({ targets: luna, angle: 3, duration: 5000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        var interior = guardar(sc.add.image(x0, y0, "ico-hangar").setOrigin(0, 0.5).setScale(k / RES).setDepth(4));
        estacion = guardar(sc.add.image(x0, y0, "ico-estacion"));
        estacion.setOrigin(22 / 270, 155 / 240);
        estacion.setScale(k / RES);
        estacion.setDepth(5);
        var arriba = guardar(sc.add.image(x0, y0 - 45 * k, "ico-persiana").setOrigin(0, 0).setScale(k / RES).setDepth(6));
        var bajo = guardar(sc.add.image(x0, y0 + 45 * k, "ico-persiana").setOrigin(0, 1).setScale(k / RES).setDepth(6));
        bajo.setFlipY(true);
        hangar = { interior: interior, arriba: arriba, abajo: bajo, x0: x0, y: y0, cx: x0 + 70 * k, esc: k / RES };
        // plataforma de despegue
        plataforma = guardar(sc.add.image(r.inicio.x, r.inicio.y + r.ancho * 0.12, "ico-plataforma"));
        plataforma.setScale((r.ancho * 1.25) / 240 / RES);
        plataforma.setDepth(4);
    }

    /**
     * Arma un recorrido: pista (normal y roja), rastro del avance, luces, extremos y decoración.
     * opciones.animar: la pista aparece con un barrido y las luces se encienden en ola.
     */
    async function cargarRecorrido(r, opciones) {
        if (!sc) return;
        descargar();
        rec = r;
        dims = { W: r.W, H: r.H };
        reacomodar();
        texturaDeCanvas("pista-n", canvasPista(r, PALETA.normal));
        texturaDeCanvas("pista-r", canvasPista(r, PALETA.roja, 1, true));
        pistaImg = guardar(sc.add.image(0, 0, "pista-n").setOrigin(0, 0).setDepth(0));
        pistaRoja = guardar(sc.add.image(0, 0, "pista-r").setOrigin(0, 0).setDepth(1).setAlpha(0));
        pistaBrillo = guardar(sc.add.image(0, 0, "pista-n").setOrigin(0, 0).setDepth(1).setAlpha(0).setBlendMode(ADD));
        rastroG = guardar(sc.add.graphics().setDepth(2));
        crearLuces(r);
        crearExtremos(r);
        decorar(r);
        rojo = 0;
        pil.x = r.inicio.x;
        pil.y = r.inicio.y;
        pil.nodo = { rama: -1, i: 0 };
        pil.valido = { x: pil.x, y: pil.y, nodo: { rama: -1, i: 0 } };
        pil.avance = 0;
        pil.zona = "pista";
        pil.enCallejon = false;
        pil.enMeta = false;
        pil.ang = 0;
        pil.angVis = 0;
        pil.mira = pil.miraVis = pil.miraPrev = 0;
        pil.yaw = 0;
        pil.saltoPend = false;
        pil.arrastrando = false;
        pil.bloqueado = true;
        dibujarRastro();
        if (opciones && opciones.animar) await aparecerPista();
    }

    async function aparecerPista() {
        var todos = objRec.slice();
        todos.forEach(function (o) { if (o.setAlpha && o !== pistaRoja && o !== pistaBrillo) o.setData("aFin", o.alpha); });
        pistaImg.setAlpha(0);
        luces.forEach(function (L) { L.s.setAlpha(0); L.glow.setAlpha(0); });
        tw({ targets: pistaImg, alpha: 1, duration: 700 });
        // las luces se prenden en ola desde la plataforma
        var orden = luces.slice().sort(function (a, b) { return Math.hypot(a.d.x - rec.inicio.x, a.d.y - rec.inicio.y) - Math.hypot(b.d.x - rec.inicio.x, b.d.y - rec.inicio.y); });
        orden.forEach(function (L, k) {
            sc.tweens.add({ targets: L.s, alpha: 0.75, duration: 240, delay: 200 + k * 22 });
            sc.tweens.add({ targets: L.glow, alpha: 0.18, duration: 240, delay: 200 + k * 22 });
        });
        await sleep(Math.min(1500, 400 + orden.length * 22));
        luces.forEach(function (L) { L.s.setAlpha(0.75); L.glow.setAlpha(0.18); });
    }

    /** El recorrido se va (transición): la pista y todo se desvanecen. */
    async function ocultarRecorrido() {
        if (!objRec.length) return;
        await tw({ targets: objRec.filter(function (o) { return o.setAlpha; }), alpha: 0, duration: 500 });
        descargar();
    }

    /** Rastro dorado sobre el camino principal hasta donde llegó el cohete. */
    function dibujarRastro() {
        if (!rastroG || !rec) return;
        rastroG.clear();
        var pts = rec.principal;
        var n = Math.min(pil.avance, pts.length - 1);
        if (n < 1) return;
        var w = rec.ancho;
        [[w * 0.42, 0xffd43b, 0.16], [w * 0.2, 0xffe066, 0.45], [w * 0.08, 0xfff9db, 0.9]].forEach(function (c) {
            rastroG.lineStyle(c[0], c[1], c[2]);
            rastroG.beginPath();
            rastroG.moveTo(pts[0].x, pts[0].y);
            for (var i = 1; i <= n; i++) rastroG.lineTo(pts[i].x, pts[i].y);
            rastroG.strokePath();
        });
    }

    // ------------------------------------------------------------------ cohete

    var ESC_COHETE = 1;

    function crearCohete() {
        var cont = sc.add.container(0, 0);
        cont.setDepth(12);
        var halo = sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setAlpha(0).setScale(2.4);
        var llamaFuera = sc.add.image(-110, 0, "ico-llama").setOrigin(1, 0.5).setScale(1 / RES);
        var llamaIn = sc.add.image(-112, 0, "ico-llama").setOrigin(1, 0.5).setScale(0.6 / RES).setBlendMode(ADD).setAlpha(0.8);
        var cuerpo = sc.add.image(0, 0, "ico-cohete").setScale(1 / RES);
        var vidrio = sc.add.image(11, -2, "ico-vidrio").setScale(1 / RES);
        cont.add([halo, llamaFuera, llamaIn, cuerpo, vidrio]);
        cont.setVisible(false);
        // vista de frente: aparece en la mitad del giro 3D (cuando el perfil se hace delgado)
        var frente = sc.add.image(0, 0, "ico-coheteFrente").setDepth(12).setVisible(false);
        cohete = { cont: cont, halo: halo, llama: llamaFuera, llamaIn: llamaIn, cuerpo: cuerpo, vidrio: vidrio, frente: frente, sacudir: 0, extraY: 0, extraEsc: 1 };
        humo = sc.add.particles(0, 0, "fx-humo", {
            lifespan: { min: 1100, max: 1700 },
            speed: { min: 6, max: 26 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.35, end: 1.6 },
            alpha: { start: 0.42, end: 0 },
            rotate: { min: 0, max: 360 },
            tint: [0xffffff, 0xdfe6ff, 0xc9d3ff, 0xe8e0ff],
            emitting: false
        });
        humo.setDepth(10);
        estela = sc.add.particles(0, 0, "fx-estrella", {
            lifespan: { min: 500, max: 900 },
            speed: { min: 10, max: 50 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.42, end: 0 },
            rotate: { min: 0, max: 360 },
            tint: [0xffe066, 0x7cf3ff, 0xff8fc7, 0xffffff],
            blendMode: ADD,
            emitting: false
        });
        estela.setDepth(11);
        chispas = sc.add.particles(0, 0, "fx-chispa", {
            lifespan: { min: 400, max: 800 },
            speed: { min: 60, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            tint: COLORES_FIESTA,
            blendMode: ADD,
            emitting: false
        });
        chispas.setDepth(20);
    }

    function escalaCohete() {
        return rec ? (rec.ancho * 1.06) / 250 : 0.45;
    }

    /** Punto de la tobera en el mundo (usa la escala horizontal real: cambia con el giro 3D). */
    function colaDelCohete() {
        var c = cohete && cohete.cont;
        var sx = c ? c.scaleX : escalaCohete();
        var a = c ? c.rotation : pil.angVis;
        var dx = -118 * sx;
        return { x: pil.x + Math.cos(a) * dx, y: pil.y + Math.sin(a) * dx };
    }

    function chispasEn(x, y, n, colores, fuerza) {
        if (!chispas || reducido) return;
        chispas.emitParticleAt(x, y, n || 8);
    }

    var acumHumo = 0, acumEstela = 0;

    function actualizarCohete(t, dt) {
        if (!cohete) return;
        var c = cohete.cont;
        c.setVisible(pil.visible);
        if (!pil.visible) {
            cohete.frente.setVisible(false);
            return;
        }
        var s = escalaCohete() * cohete.extraEsc;
        // Giro en 2D por grados (pedido del usuario): la nave rota hacia donde se mueve por el camino más corto,
        // con una velocidad de giro máxima para que una vuelta en U se vea como una rotación y no como un salto.
        var dA = Math.atan2(Math.sin(pil.ang - pil.angVis), Math.cos(pil.ang - pil.angVis));
        var maxGiro = (Number(cfgJ.giroGradosSeg) || 540) * Math.PI / 180 * dt / 1000;
        var giro = clamp(dA * Math.min(1, dt / 90), -maxGiro, maxGiro);
        pil.angVis += giro;
        pil.angVis = Math.atan2(Math.sin(pil.angVis), Math.cos(pil.angVis));
        var flotaY = 0, flotaA = 0;
        if (!pil.arrastrando && pil.flotar && !reducido) {
            flotaY = Math.sin(t / 430) * rec.ancho * 0.06;
            flotaA = Math.sin(t / 610) * 0.05;
        }
        var sac = cohete.sacudir ? Math.sin(t / 22) * cohete.sacudir : 0;
        c.x = pil.x + sac;
        c.y = pil.y + flotaY + cohete.extraY;
        c.rotation = pil.angVis + flotaA;
        c.scaleX = s;
        c.scaleY = s;
        c.alpha = 1;
        cohete.frente.setVisible(false);
        // empuje del propulsor según la velocidad
        var vmax = Number(cfgJ.velocidadMax) || 1500;
        var objetivo = pil.auto ? 0.85 : clamp(pil.vel / (vmax * 0.35), 0, 1);
        pil.empuje = lerp(pil.empuje, Math.max(0.22, objetivo), Math.min(1, dt / 160));
        var e = pil.empuje;
        var parpadeo = reducido ? 0 : (Math.sin(t * 0.052) * 0.1 + Math.sin(t * 0.13) * 0.06 + (Math.random() - 0.5) * 0.12);
        cohete.llama.scaleX = (0.45 + e * 0.95 + parpadeo) / RES;
        cohete.llama.scaleY = (0.78 + e * 0.32 + parpadeo * 0.6) / RES;
        cohete.llama.alpha = 0.75 + e * 0.25;
        cohete.llamaIn.scaleX = (0.3 + e * 0.7 + parpadeo * 1.2) / RES;
        cohete.llamaIn.scaleY = (0.42 + e * 0.2) / RES;
        cohete.llamaIn.y = Math.sin(t * 0.07) * 1.5;
        // halo de alerta (rojo) mientras está fuera de la pista
        if (rojo > 0.02) {
            cohete.halo.setTint(0xff4d6d);
            cohete.halo.setAlpha(rojo * (0.55 + 0.25 * Math.sin(t / 90)));
        } else {
            cohete.halo.setTint(0x7cf3ff);
            cohete.halo.setAlpha(0.12 + e * 0.18);
        }
        // humo (siempre un poco; más al moverse) y estela de estrellas (solo al moverse)
        if (!reducido) {
            var cola = colaDelCohete();
            acumHumo += dt / 1000 * (6 + e * 34);
            var nh = Math.floor(acumHumo);
            if (nh > 0) {
                acumHumo -= nh;
                for (var k = 0; k < nh; k++) humo.emitParticleAt(cola.x + (Math.random() - 0.5) * 8, cola.y + flotaY + (Math.random() - 0.5) * 8, 1);
            }
            acumEstela += dt / 1000 * (e > 0.35 ? e * 26 : 0);
            var ne = Math.floor(acumEstela);
            if (ne > 0) {
                acumEstela -= ne;
                estela.emitParticleAt(cola.x, cola.y + flotaY, ne);
            }
        }
    }

    // ------------------------------------------------------------------ pilotaje

    function cambiarZona(z) {
        if (z === pil.zona) return;
        pil.zona = z;
        emitir("zona", z);
    }

    function revisarLuces() {
        if (!rec) return;
        var r2 = Math.pow(rec.ancho * 0.55, 2);
        for (var i = 0; i < luces.length; i++) {
            var L = luces[i];
            if (L.on) continue;
            var dx = L.d.x - pil.x, dy = L.d.y - pil.y;
            if (dx * dx + dy * dy < r2) {
                encenderLuz(L);
                emitir("luz", luces.filter(function (q) { return q.on && q.d.rama < 0; }).length, L.d.rama);
            }
        }
    }

    function actualizarPiloto(t, dt) {
        if (!rec) return;
        var antesX = pil.x, antesY = pil.y;
        if (pil.arrastrando && !pil.bloqueado && pil.objetivo) {
            var vmax = Number(cfgJ.velocidadMax) || 1500;
            var res = R.mover(rec, pil, pil.objetivo, vmax * dt / 1000, cfgJ);
            pil.x = res.x;
            pil.y = res.y;
            pil.nodo = res.nodo;
            cambiarZona(res.zona);
            if (res.zona === "pista") pil.valido = { x: pil.x, y: pil.y, nodo: { rama: res.nodo.rama, i: res.nodo.i } };
            // se aleja demasiado con el dedo: el cohete se detiene y vuelve al último punto válido
            if (res.zona === "limite" && res.proy) {
                var lim = R.limites(rec, cfgJ);
                var dd = Math.hypot(pil.objetivo.x - res.proy.x, pil.objetivo.y - res.proy.y);
                if (dd > lim.fuera + rec.ancho * (Number(cfgJ.alejarseParaRegresar) || 1.4)) {
                    if (!pil.fueraDesde) pil.fueraDesde = t;
                    else if (t - pil.fueraDesde > (Number(cfgJ.msFueraParaRegresar) || 700)) {
                        pil.fueraDesde = 0;
                        emitir("desvio");
                    }
                } else pil.fueraDesde = 0;
            } else pil.fueraDesde = 0;
            if (res.nodo.rama < 0 && res.zona !== "limite" && res.nodo.i > pil.avance) {
                pil.avance = res.nodo.i;
                dibujarRastro();
                emitir("avance", R.fraccion(rec, pil.avance));
            }
            var callejon = R.enCallejon(rec, res.nodo);
            if (callejon && !pil.enCallejon) {
                pil.enCallejon = true;
                emitir("callejon", res.nodo.rama);
            } else if (!callejon) pil.enCallejon = false;
            if (!pil.enMeta && R.enMeta(rec, res.nodo) && res.zona !== "limite") {
                pil.enMeta = true;
                emitir("meta");
            }
        }
        var mov = Math.hypot(pil.x - antesX, pil.y - antesY);
        var vel = mov / Math.max(1, dt) * 1000;
        pil.vel = lerp(pil.vel, vel, 0.3);
        if (mov > 0.6) {
            pil.ang = Math.atan2(pil.y - antesY, pil.x - antesX);
            pil.tUltimoMov = t;
            emitir("mueve");
        }
        if (pil.visible) revisarLuces();
        // la pista se pone roja mientras el cohete está fuera
        var rojoObj = pil.zona === "pista" ? 0 : 1;
        rojo = lerp(rojo, rojoObj, Math.min(1, dt / 140));
        if (pistaRoja) pistaRoja.setAlpha(rojo * (0.82 + 0.18 * Math.sin(t / 110)));
        if (pistaBrillo) pistaBrillo.setAlpha(Math.max(0, pistaBrillo.getData("pulso") || 0));
        if (pistaBrillo && (pistaBrillo.getData("pulso") || 0) > 0) pistaBrillo.setData("pulso", Math.max(0, pistaBrillo.getData("pulso") - dt / 900));
    }

    function tocaCohete(x, y) {
        if (!rec || !pil.visible) return false;
        return Math.hypot(x - pil.x, y - pil.y) <= rec.ancho * 0.9;
    }

    function empezarArrastre(x, y) {
        pil.offset = { x: pil.x - x, y: pil.y - y };
        pil.objetivo = { x: pil.x, y: pil.y };
        pil.arrastrando = true;
        pil.fueraDesde = 0;
        sc.tweens.add({ targets: cohete, extraEsc: 1.12, duration: 160, ease: "Back.easeOut" });
    }

    function moverObjetivo(x, y) {
        if (!pil.arrastrando) return;
        pil.objetivo = { x: x + pil.offset.x, y: y + pil.offset.y };
    }

    function soltar() {
        var estaba = pil.arrastrando;
        pil.arrastrando = false;
        pil.objetivo = null;
        if (cohete) sc.tweens.add({ targets: cohete, extraEsc: 1, duration: 200 });
        return estaba ? pil.zona : null;
    }

    /** Sacudida suave del cohete (desvío o callejón). */
    function sacudir() {
        if (!cohete) return Promise.resolve();
        cohete.sacudir = rec ? rec.ancho * 0.08 : 6;
        return tw({ targets: cohete, sacudir: 0, duration: 520, ease: "Quad.easeOut" });
    }

    /** Lleva el cohete en línea suave hasta un punto. */
    function deslizarA(x, y, ms) {
        var x0 = pil.x, y0 = pil.y;
        pil.auto = true;
        return animar(ms, function (e) {
            if (Math.hypot(x - x0, y - y0) > 2) pil.ang = Math.atan2(y - y0, x - x0);
            pil.x = lerp(x0, x, e);
            pil.y = lerp(y0, y, e);
        }, suave).then(function () { pil.auto = false; });
    }

    /** Se salió demasiado o soltó fuera: se detiene, vibra y vuelve al último punto válido de la pista. */
    async function regresar() {
        if (!rec) return;
        pil.bloqueado = true;
        pil.arrastrando = false;
        await sacudir();
        var v = pil.valido || { x: rec.inicio.x, y: rec.inicio.y, nodo: { rama: -1, i: 0 } };
        await deslizarA(v.x, v.y, 650);
        pil.nodo = { rama: v.nodo.rama, i: v.nodo.i };
        cambiarZona("pista");
        pil.bloqueado = false;
    }

    /** Desde el fondo de un camino falso, el cohete vuelve solo por el mismo camino hasta la bifurcación. */
    async function regresarCallejon(rama) {
        if (!rec || !rec.falsos[rama]) return;
        pil.bloqueado = true;
        pil.arrastrando = false;
        var f = rec.falsos[rama];
        var pts = f.pts;
        var desde = Math.min(pts.length - 1, pil.nodo.rama === rama ? pil.nodo.i : pts.length - 1);
        var x0 = pil.x, y0 = pil.y;
        pil.auto = true;
        await animar(Math.max(700, desde * 18), function (e) {
            var idx = desde * (1 - e);
            var a = Math.floor(idx), b = Math.min(pts.length - 1, a + 1), t = idx - a;
            var px = pts[a].x + (pts[b].x - pts[a].x) * t;
            var py = pts[a].y + (pts[b].y - pts[a].y) * t;
            // primero se acerca al centro de la pista
            var k = Math.min(1, e * 4);
            pil.x = lerp(x0, px, k);
            pil.y = lerp(y0, py, k);
            if (e > 0.05) pil.ang = Math.atan2(pts[a].y - pts[b].y, pts[a].x - pts[b].x);
        }, suave);
        pil.auto = false;
        var raiz = rec.principal[f.raiz];
        pil.x = raiz.x;
        pil.y = raiz.y;
        pil.nodo = { rama: -1, i: f.raiz };
        pil.valido = { x: pil.x, y: pil.y, nodo: { rama: -1, i: f.raiz } };
        pil.enCallejon = false;
        cambiarZona("pista");
        pil.bloqueado = false;
    }

    /** Señal luminosa amable al final del camino falso. */
    function senalCallejon(rama, on) {
        if (senal) {
            sc.tweens.killTweensOf(senal);
            var vieja = senal;
            senal = null;
            tw({ targets: vieja, alpha: 0, scale: vieja.scale * 0.5, duration: 260 }).then(function () { vieja.destroy(); });
        }
        if (!on || !rec || !rec.falsos[rama]) return;
        var f = rec.falsos[rama];
        var p = f.pts[f.pts.length - 1];
        senal = guardar(sc.add.image(p.x, p.y, "fx-senal"));
        senal.setDepth(30);
        var k = rec.ancho * 0.9 / 160;
        senal.setScale(k * 0.3);
        senal.setAlpha(0);
        sc.tweens.add({ targets: senal, scale: k, alpha: 1, duration: 360, ease: "Back.easeOut" });
        sc.tweens.add({ targets: senal, scale: k * 1.12, duration: 520, yoyo: true, repeat: -1, delay: 380, ease: "Sine.easeInOut" });
        chispasEn(p.x, p.y, 10);
    }

    // ------------------------------------------------------------------ ayudas

    /** Las próximas luces del camino correcto parpadean en dorado, una tras otra (no revela todo). */
    function pistaLuces(cuantas) {
        if (!rec) return;
        var adelante = luces.filter(function (L) { return L.d.rama < 0 && L.d.i > pil.avance; })
            .sort(function (a, b) { return a.d.i - b.d.i; }).slice(0, cuantas || 5);
        adelante.forEach(function (L, k) {
            sc.time.delayedCall(k * 180, function () {
                if (!L.s.active) return;
                sc.tweens.add({ targets: L.glow, alpha: 0.9, scale: rec.ancho * 0.85 / 128, duration: 260, yoyo: true, repeat: 2 });
                sc.tweens.add({ targets: L.s, scale: L.tam * 1.7, duration: 260, yoyo: true, repeat: 2 });
                L.glow.setTint(0xffd43b);
                sc.time.delayedCall(1700, function () { if (!L.on && L.glow.active) L.glow.setTint(0x7cf3ff); });
            });
        });
    }

    /** Estrella fugaz que recorre el camino principal (demostración y pista fuerte). */
    function estrellaFugaz(desdeS, hastaS, ms) {
        if (!rec) return Promise.resolve();
        var st = guardar(sc.add.image(0, 0, "ico-estrella"));
        var k = rec.ancho * 0.5 / 100 / RES;
        st.setScale(k);
        st.setDepth(25);
        var halo = guardar(sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setTint(0xffe066).setDepth(24).setScale(rec.ancho * 1.2 / 128));
        var L = rec.largo;
        var d0 = desdeS == null ? 0 : desdeS;
        var d1 = hastaS == null ? L : Math.min(L, hastaS);
        var ultimo = 0;
        return animar(ms || 4000, function (e, u) {
            var p = R.puntoEn(rec, lerp(d0, d1, e));
            st.x = p.x;
            st.y = p.y;
            st.rotation = u * 9;
            halo.x = p.x;
            halo.y = p.y;
            var ahora = performance.now();
            if (ahora - ultimo > 45 && !reducido) {
                ultimo = ahora;
                estela.emitParticleAt(p.x, p.y, 2);
            }
        }, suave).then(function () {
            return tw({ targets: [st, halo], alpha: 0, scale: 0.01, duration: 380 });
        }).then(function () {
            st.destroy();
            halo.destroy();
        });
    }

    // ------------------------------------------------------------------ celebraciones y transiciones

    function chispasFiesta(x, y, n, fuerza) {
        if (!sc || reducido) return;
        var e = sc.add.particles(x, y, n > 14 ? "fx-estrella" : "fx-chispa", {
            speed: { min: 120 * (fuerza || 1), max: 320 * (fuerza || 1) },
            angle: { min: 0, max: 360 },
            scale: { start: 0.7, end: 0 },
            lifespan: { min: 500, max: 1100 },
            rotate: { min: 0, max: 360 },
            gravityY: 160,
            tint: COLORES_FIESTA,
            blendMode: ADD,
            emitting: false
        });
        e.setDepth(40);
        e.explode(n || 14);
        sc.time.delayedCall(1500, function () { e.destroy(); });
    }

    /** Recorrido completado: todas las luces se encienden en ola, la pista brilla y el fondo late. */
    async function celebrarRecorrido() {
        if (!rec) return;
        pulsoFondo(0.35);
        if (pistaBrillo) pistaBrillo.setData("pulso", 0.55);
        var orden = luces.slice().sort(function (a, b) {
            return Math.hypot(a.d.x - rec.inicio.x, a.d.y - rec.inicio.y) - Math.hypot(b.d.x - rec.inicio.x, b.d.y - rec.inicio.y);
        });
        orden.forEach(function (L, k) { sc.time.delayedCall(k * 18, function () { if (L.s.active) encenderLuz(L, true); }); });
        pil.avance = rec.principal.length - 1;
        dibujarRastro();
        chispasFiesta(rec.meta.x, rec.meta.y - rec.ancho * 0.4, 22, 1.2);
        await sleep(600);
    }

    function persianas(abrir, ms) {
        if (!hangar) return Promise.resolve();
        var y = abrir ? hangar.esc * 0.08 : hangar.esc;
        return Promise.all([
            tw({ targets: hangar.arriba, scaleY: y, duration: ms, ease: "Quad.easeInOut" }),
            tw({ targets: hangar.abajo, scaleY: y, duration: ms, ease: "Quad.easeInOut" })
        ]);
    }

    /**
     * Al llegar: el cohete se acomoda frente a la compuerta, las persianas del hangar se abren, el cohete entra
     * volando (pasa por detrás del marco: queda dentro del hueco, sobre el interior oscuro) y se cierran.
     * aviso(fase): "abre" | "entra" | "cierra" (script.js pone los sonidos).
     */
    async function entrarEstacion(aviso) {
        if (!rec || !cohete || !hangar) return;
        var av = typeof aviso === "function" ? aviso : function () {};
        pil.auto = true;
        pil.ang = 0;
        var x0 = pil.x, y0 = pil.y;
        var antes = { x: hangar.x0 - rec.ancho * 0.6, y: hangar.y };
        await animar(420, function (e) {
            pil.x = lerp(x0, antes.x, e);
            pil.y = lerp(y0, antes.y, e);
        }, suave);
        av("abre");
        await persianas(true, 650);
        chispasEn(hangar.x0, hangar.y, 8);
        cohete.cont.setDepth(4.6);
        cohete.frente.setDepth(4.6);
        humo.setDepth(4.5);
        estela.setDepth(4.5);
        av("entra");
        var x1 = pil.x;
        await animar(950, function (e) { pil.x = lerp(x1, hangar.cx, e); }, suave);
        await sleep(160);
        av("cierra");
        await persianas(false, 520);
        pil.visible = false;
        pil.auto = false;
        cohete.cont.setDepth(12);
        cohete.frente.setDepth(12);
        humo.setDepth(10);
        estela.setDepth(11);
        if (estacion) {
            estacion.setTint(0xfff3bf);
            sc.time.delayedCall(260, function () { if (estacion && estacion.active) estacion.clearTint(); });
        }
        chispasEn(hangar.cx, hangar.y - rec.ancho * 0.5, 14);
    }

    /** Salto al hiperespacio entre recorridos: estelas de luz que salen del centro. */
    async function hiperespacio(ms) {
        if (!sc || reducido) { await sleep(300); return; }
        var v = vista();
        var cx = v.x0 + sc.scale.width / v.z / 2;
        var cy = v.y0 + sc.scale.height / v.z / 2;
        var n = 46;
        var lineas = [];
        for (var i = 0; i < n; i++) {
            var a = Math.random() * Math.PI * 2;
            var l = sc.add.image(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, "fx-estela");
            l.setRotation(a);
            l.setBlendMode(ADD);
            l.setDepth(50);
            l.setTint([0xffffff, 0x99e9f2, 0xd0bfff, 0xffe066][i % 4]);
            l.setScale(0.4, 0.6);
            l.setAlpha(0);
            var d = (sc.scale.width / v.z) * (0.4 + Math.random() * 0.4);
            sc.tweens.add({ targets: l, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, scaleX: 3.2, alpha: { from: 0.9, to: 0 }, duration: (ms || 1100) * (0.6 + Math.random() * 0.4), delay: Math.random() * 300, ease: "Quad.easeIn" });
            lineas.push(l);
        }
        pulsoFondo(0.3);
        await sleep((ms || 1100) + 350);
        lineas.forEach(function (l) { l.destroy(); });
    }

    /** El cohete baja desde arriba hasta la plataforma de despegue, con la llama encendida. */
    async function aterrizarInicio() {
        if (!rec || !cohete) return;
        pil.x = rec.inicio.x;
        pil.y = rec.inicio.y;
        pil.ang = 0;
        pil.angVis = 0;
        pil.mira = pil.miraVis = pil.miraPrev = 0;
        pil.yaw = 0;
        pil.saltoPend = false;
        pil.visible = true;
        pil.auto = true;
        cohete.cont.setDepth(12);
        cohete.frente.setDepth(12);
        cohete.extraY = -Math.max(300, rec.inicio.y + 200);
        cohete.cont.alpha = 1;
        await animar(1000, function (e) { cohete.extraY = lerp(-Math.max(300, rec.inicio.y + 200), 0, e); }, function (u) { return 1 - Math.pow(1 - u, 3); });
        cohete.extraY = 0;
        pil.auto = false;
        if (humo && !reducido) for (var k = 0; k < 10; k++) humo.emitParticleAt(pil.x + (Math.random() - 0.5) * rec.ancho, pil.y + rec.ancho * 0.25, 1);
    }

    // ------------------------------------------------------------------ escena final

    /**
     * Cinemática final: la pista se ilumina, el cohete acelera, aparece la base espacial de Zeus, el cohete vuela
     * hasta ella con la cámara detrás, aterriza en la plataforma y se abren las compuertas.
     * Devuelve una Promise cuando las compuertas ya se abrieron.
     */
    async function finalCinematica() {
        if (!rec || !cohete) return;
        camLibre = true;
        pil.bloqueado = true;
        pil.arrastrando = false;
        await celebrarRecorrido();
        var cam = sc.cameras.main;
        // la base aparece "en el horizonte", a la derecha del mundo
        var bx = rec.W + 820, by = rec.H * 0.52;
        var escBase = 760 / 560;
        var cuerpoBase = sc.add.image(bx, by, "ico-base").setScale(escBase / RES).setDepth(6);
        var puertaX = bx + (302 - 280) * escBase, puertaY = by + (194 - 190) * escBase;
        var pieX = puertaX, pieY = by + (236 - 190) * escBase;
        var hojaI = sc.add.image(puertaX - 13 * escBase, puertaY, "ico-compuerta").setScale(escBase / RES).setDepth(7);
        var hojaD = sc.add.image(puertaX + 13 * escBase, puertaY, "ico-compuerta").setScale(escBase / RES).setDepth(7);
        var pista = { x: bx + (100 - 280) * escBase, y: by + (232 - 190) * escBase };
        base = { cuerpo: cuerpoBase, hojas: [hojaI, hojaD], puerta: { x: puertaX, y: puertaY }, pie: { x: pieX, y: pieY }, pista: pista, esc: escBase };
        // vuelo con curva Bézier: sube, cruza el cielo y baja sobre la plataforma
        var z0 = cam.zoom;
        var v0 = vista();
        var c0 = { x: v0.x0 + cam.width / z0 / 2, y: v0.y0 + cam.height / z0 / 2 };
        var P0 = { x: pil.x, y: pil.y };
        var P3 = { x: pista.x, y: pista.y - 120 };
        var C1 = { x: P0.x + 260, y: P0.y - 420 };
        var C2 = { x: P3.x - 380, y: P3.y - 360 };
        var bez = function (u) {
            var a = 1 - u;
            return {
                x: a * a * a * P0.x + 3 * a * a * u * C1.x + 3 * a * u * u * C2.x + u * u * u * P3.x,
                y: a * a * a * P0.y + 3 * a * a * u * C1.y + 3 * a * u * u * C2.y + u * u * u * P3.y
            };
        };
        var zFin = Math.min(z0 * 1.25, (cam.height * 0.8) / 520);
        var finCam = { x: bx - 40, y: by - 60 };
        pil.auto = true;
        var previo = bez(0);
        var tVuelo = reducido ? 300 : 3600;
        await animar(tVuelo, function (e, u) {
            var p = bez(e);
            pil.x = p.x;
            pil.y = p.y;
            if (Math.hypot(p.x - previo.x, p.y - previo.y) > 0.5) pil.ang = Math.atan2(p.y - previo.y, p.x - previo.x);
            previo = p;
            // la cámara acompaña: sigue al cohete y termina encuadrando la base
            var k = suave(u);
            var cx = lerp(lerp(c0.x, p.x, Math.min(1, u * 2.2)), finCam.x, k * k);
            var cy = lerp(lerp(c0.y, p.y, Math.min(1, u * 2.2)), finCam.y, k * k);
            cam.setZoom(lerp(z0, zFin, k));
            cam.centerOn(cx, cy);
            if (!reducido && Math.random() < 0.6) estela.emitParticleAt(colaDelCohete().x, colaDelCohete().y, 2);
        }, suave);
        // aterrizaje: se endereza (punta arriba) y baja despacio sobre la plataforma
        var yA = pil.y, yB = pista.y - rec.ancho * 0.35;
        await animar(1300, function (e) {
            pil.ang = lerp(pil.ang, -Math.PI / 2, 0.15);
            pil.y = lerp(yA, yB, e);
            pil.empuje = lerp(0.9, 0.3, e);
        }, suave);
        pil.ang = -Math.PI / 2;
        pil.auto = false;
        if (humo && !reducido) for (var k2 = 0; k2 < 16; k2++) humo.emitParticleAt(pil.x + (Math.random() - 0.5) * rec.ancho * 1.4, pista.y, 1);
        // se abren las compuertas
        await sleep(300);
        await Promise.all([
            tw({ targets: hojaI, x: hojaI.x - 26 * escBase, duration: 800, ease: "Quad.easeInOut" }),
            tw({ targets: hojaD, x: hojaD.x + 26 * escBase, duration: 800, ease: "Quad.easeInOut" })
        ]);
    }

    /** Fuegos artificiales espaciales alrededor de la base. */
    function fuegos(n) {
        if (!sc || !base) return;
        for (var i = 0; i < (n || 3); i++) {
            (function (k) {
                sc.time.delayedCall(k * 260, function () {
                    var x = base.cuerpo.x + (Math.random() - 0.5) * 760;
                    var y = base.cuerpo.y - 260 - Math.random() * 220;
                    chispasFiesta(x, y, 26, 1.3);
                    var anillo = sc.add.image(x, y, "fx-halo").setBlendMode(ADD).setTint(COLORES_FIESTA[k % COLORES_FIESTA.length]).setDepth(39).setScale(0.3);
                    sc.tweens.add({ targets: anillo, scale: 3.2, alpha: 0, duration: 900, onComplete: function () { anillo.destroy(); } });
                });
            })(i);
        }
    }

    function puertaBase() {
        if (!base) return null;
        var p = aPantalla(base.pie.x, base.pie.y);
        var q = aPantalla(base.puerta.x, by0(base));
        p.alto = Math.abs(p.y - q.y);
        return p;
    }

    /** Arriba de la puerta de la base (para medir la altura de Zeus en pantalla). */
    function by0(b) {
        return b.cuerpo.y + (150 - 190) * b.esc;
    }

    function escalaPantalla() {
        return sc ? sc.cameras.main.zoom : 1;
    }

    /** Vuelve a la vista normal (jugar otra vez). */
    function reiniciarVista() {
        if (base) {
            base.cuerpo.destroy();
            base.hojas.forEach(function (h) { h.destroy(); });
            base = null;
        }
        camLibre = false;
        pil.visible = false;
        reacomodar();
    }

    // ------------------------------------------------------------------ miniatura del recorrido (resumen final)

    function miniatura(r, ancho, alto) {
        var c = document.createElement("canvas");
        var k = 2;
        c.width = ancho * k;
        c.height = alto * k;
        var x = c.getContext("2d");
        x.scale(k, k);
        var g = x.createLinearGradient(0, 0, 0, alto);
        g.addColorStop(0, "#1b1f6b");
        g.addColorStop(1, "#0a0f3a");
        x.fillStyle = g;
        x.fillRect(0, 0, ancho, alto);
        for (var i = 0; i < 26; i++) {
            x.fillStyle = "rgba(255,255,255," + (0.3 + (i % 3) * 0.2) + ")";
            x.fillRect((i * 97) % ancho, (i * 53) % alto, 1.6, 1.6);
        }
        var e = Math.min(ancho / r.W, alto / r.H) * 0.92;
        x.translate((ancho - r.W * e) / 2, (alto - r.H * e) / 2);
        var mini = canvasPista(r, PALETA.normal, e, true);
        x.drawImage(mini, 0, 0, mini.width, mini.height);
        // el camino que siguió el cohete, en dorado
        x.strokeStyle = "#ffd43b";
        x.lineWidth = Math.max(2, r.ancho * e * 0.22);
        x.lineCap = "round";
        x.lineJoin = "round";
        x.shadowColor = "#ffe066";
        x.shadowBlur = 6;
        x.beginPath();
        x.moveTo(r.principal[0].x * e, r.principal[0].y * e);
        r.principal.forEach(function (p) { x.lineTo(p.x * e, p.y * e); });
        x.stroke();
        x.shadowBlur = 0;
        x.fillStyle = "#7cf3ff";
        x.beginPath();
        x.arc(r.inicio.x * e, r.inicio.y * e, Math.max(4, r.ancho * e * 0.4), 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "#ffffff";
        x.beginPath();
        x.arc(r.meta.x * e, r.meta.y * e, Math.max(5, r.ancho * e * 0.5), 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "#ffd43b";
        x.font = "bold " + Math.round(Math.max(10, r.ancho * e * 0.8)) + "px sans-serif";
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.fillText("★", r.meta.x * e, r.meta.y * e + 1);
        return c.toDataURL("image/png");
    }

    // ------------------------------------------------------------------ puntos de pantalla

    function puntoCohete() { return aPantalla(pil.x, pil.y); }
    function puntoInicio() { return rec ? aPantalla(rec.inicio.x, rec.inicio.y) : null; }
    function puntoMeta() { return rec ? aPantalla(rec.meta.x, rec.meta.y) : null; }
    function anchoPistaPantalla() { return rec ? rec.ancho * sc.cameras.main.zoom : 60; }

    /** Hueco de Zoe: la celda de abajo a la izquierda (sin pista), en coordenadas de pantalla. */
    function zonaZoe() {
        if (!sc) return null;
        var g = rec ? rec.rejilla : { m: 46, cx: 260, cy: 260, filas: 3 };
        var H = rec ? rec.H : dims.H;
        var a = aPantalla(0, g.m + g.cy * (g.filas - 1) - g.cy * 0.75);
        var b = aPantalla(g.m + g.cx * 1.05, H);
        return { left: Math.max(0, a.x), top: a.y, width: Math.max(150, b.x - a.x), height: Math.max(220, b.y - a.y), bottom: b.y };
    }

    // ------------------------------------------------------------------ montaje

    function vigilarPosicion(el) {
        var renovar = function () { if (sc && sc.scale) sc.scale.updateBounds(); };
        ["pointerdown", "mousedown", "touchstart"].forEach(function (n) {
            el.addEventListener(n, renovar, { capture: true, passive: true });
        });
        global.addEventListener("resize", function () { setTimeout(reacomodar, 40); });
    }

    function montar(el, config) {
        if (listoPromesa) return listoPromesa;
        cfg = config;
        cfgJ = (config && config.juego) || {};
        if (!Phaser || !I || !R) {
            console.warn("[EscenarioCohete] falta Phaser, IconosCohete o ReglasCohete");
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        listoPromesa = new Promise(function (resolve) {
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: el,
                backgroundColor: "#0a0f3a",
                banner: false,
                scale: { mode: Phaser.Scale.RESIZE, width: global.innerWidth, height: global.innerHeight },
                input: { activePointers: 2 },
                fps: { target: 60 },
                scene: {
                    create: function () {
                        sc = this;
                        texturasFx();
                        var cargas = [];
                        Object.keys(I.SVG).forEach(function (k) { cargas.push(cargarSvg("ico-" + k, I.SVG[k])); });
                        Promise.all(cargas).then(function () {
                            crearFondo();
                            crearCohete();
                            dims = dimensionesMundo();
                            reacomodar();
                            sc.scale.on("resize", reacomodar);
                            // El pilotaje corre con su propio reloj (setTimeout): no depende de que el navegador pinte.
                            var tPrev = performance.now();
                            var pilotaje = function () {
                                var ahora = performance.now();
                                actualizarPiloto(ahora, Math.min(ahora - tPrev, 50));
                                tPrev = ahora;
                                setTimeout(pilotaje, 16);
                            };
                            pilotaje();
                            sc.events.on("update", function (t, dt) {
                                var d = Math.min(dt, 50);
                                actualizarCohete(performance.now(), d);
                                actualizarFondo(t);
                            });
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__escenarioCohete = juego;
        });
        return listoPromesa;
    }

    global.EscenarioCohete = {
        montar: montar,
        listo: function () { return !!(sc && cohete); },
        escena: function () { return sc; },
        on: function (mapa) { Object.keys(mapa || {}).forEach(function (k) { ev[k] = mapa[k]; }); },
        reacomodar: reacomodar,
        dimensionesMundo: dimensionesMundo,
        recorrido: function () { return rec; },
        piloto: function () { return pil; },
        cargarRecorrido: cargarRecorrido,
        ocultarRecorrido: ocultarRecorrido,
        tocaCohete: tocaCohete,
        empezarArrastre: empezarArrastre,
        moverObjetivo: moverObjetivo,
        soltar: soltar,
        bloquear: function (on) { pil.bloqueado = !!on; if (on) pil.arrastrando = false; },
        mostrarCohete: function (on) { pil.visible = !!on; },
        regresar: regresar,
        regresarCallejon: regresarCallejon,
        senalCallejon: senalCallejon,
        sacudir: sacudir,
        pistaLuces: pistaLuces,
        estrellaFugaz: estrellaFugaz,
        celebrarRecorrido: celebrarRecorrido,
        entrarEstacion: entrarEstacion,
        hiperespacio: hiperespacio,
        aterrizarInicio: aterrizarInicio,
        pulsoFondo: pulsoFondo,
        chispas: chispasFiesta,
        finalCinematica: finalCinematica,
        fuegos: fuegos,
        puertaBase: puertaBase,
        escalaPantalla: escalaPantalla,
        reiniciarVista: reiniciarVista,
        miniatura: miniatura,
        aPantalla: aPantalla,
        mundoDePantalla: mundoDePantalla,
        puntoCohete: puntoCohete,
        puntoInicio: puntoInicio,
        puntoMeta: puntoMeta,
        anchoPistaPantalla: anchoPistaPantalla,
        zonaZoe: zonaZoe
    };
})(window);
