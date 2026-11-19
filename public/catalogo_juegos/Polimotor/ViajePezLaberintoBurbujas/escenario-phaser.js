/**
 * EscenarioPez — escena Phaser 4 de "¡El Viaje del Pez por el Laberinto de Burbujas!" (window.EscenarioPez).
 *
 * Un solo lienzo a pantalla completa detrás de la interfaz. La cámara encaja el mundo (ancho fijo, alto según la
 * pantalla) en el hueco que dejan la cabecera y la fila de abajo. Dibuja:
 *   - el mar: degradado de profundidad, rayos de luz que se mueven, arena, burbujas que suben, motas de plancton y
 *     peces pequeños de adorno. El fondo reacciona: las burbujas y los peces se apartan del pez, las algas se
 *     doblan a su paso, la luz del agua crece con el avance y se tiñe de rojo cuando el pez se sale del camino;
 *   - el camino de agua bordeado de burbujas (canvas 2D, una vez por recorrido). Los callejones y los lazos son
 *     parte del mismo camino y se ven igual. Hay una copia roja que aparece mientras el pez está fuera;
 *   - burbujas-guía sobre el camino que brillan al pasar, la estela del avance y decoración (rocas, algas,
 *     estrellas de mar, caracoles) en las celdas libres; la concha de salida y el coral mágico de llegada;
 *   - el pez payaso (contenedor): cuerpo, cola y aleta que se mueven sin parar, burbujas al nadar, inclinación en
 *     las curvas y flote cuando está quieto;
 *   - la escena final: el pez nada hasta el gran arrecife, se acomoda con sus amigos y todo se ilumina.
 *
 * El nado usa ReglasPez.mover (geometría pura); esta escena solo avisa a script.js con eventos:
 *   on({ zona, avance, luz, callejon, meta, desvio, mueve })
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var I = global.IconosPez;
    var R = global.ReglasPez;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2;
    var ADD = "ADD";
    var COLORES_FIESTA = [0xffe066, 0xff8fc7, 0x7cf3ff, 0xb197fc, 0xffb36b, 0xffffff];
    var COLORES_AMIGOS = [0x74c0fc, 0xffd43b, 0xb197fc, 0x63e6be, 0xff8fa3, 0xffa94d];

    var juego = null;
    var sc = null;
    var cfgJ = {};
    var listoPromesa = null;
    var dims = { W: 1600, H: 900 };
    var area = { left: 0, top: 0, width: 800, height: 600 };
    var camLibre = false;
    var ev = {};

    var rec = null;
    var objRec = [];
    var pistaImg = null, pistaRoja = null, pistaBrillo = null, rastroG = null;
    var luces = [];
    var bordes = { lista: [], grilla: {}, celda: 100, reventadas: 0, tinte: -1 };   // burbujas del borde del camino
    var concha = null, coral = null, senal = null;
    var decor = [];            // decoración del recorrido que reacciona al pez
    var rojo = 0;              // 0..1 cuánto se ve el camino rojo

    var fondo = { degradado: null, rayos: [], burbujas: [], motas: [], peces: [], cardumenes: [], algas: [], suelo: [], lejanos: [], medusas: [], arena: null, velo: null, luz: 0, luzObj: 0 };
    var pez = null;            // { cont, cuerpo, cola, aleta, halo, sacudir, extraY, extraEsc }
    var burbujasPez = null, chispas = null, hojitas = null;
    var base = null;           // escena final

    var pil = {
        x: 0, y: 0, nodo: { rama: -1, i: 0 },
        valido: null, avance: 0, zona: "pista",
        arrastrando: false, bloqueado: true, objetivo: null, offset: { x: 0, y: 0 },
        fueraDesde: 0, enCallejon: false, enMeta: false,
        ang: 0, angVis: 0, vel: 0, empuje: 0.2, visible: false, flotar: true,
        mira: 0, miraPrev: 0, yaw: 0, saltoPend: false, miraVis: 0,
        tUltimoMov: 0, auto: false, alegria: 0
    };

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function emitir(nombre) {
        var f = ev[nombre];
        if (typeof f === "function") {
            try { f.apply(null, [].slice.call(arguments, 1)); } catch (e) { console.warn("[EscenarioPez]", nombre, e); }
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
                console.warn("[EscenarioPez] no se pudo dibujar", clave);
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
        texturaCanvas("fx-nube", 256, 256, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,0.55)"], [0.35, "rgba(255,255,255,0.28)"], [0.7, "rgba(255,255,255,0.08)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-punto", 16, 16, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.8)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-chispa", 24, 24, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.3, "rgba(255,255,255,0.9)"], [1, "rgba(255,255,255,0)"]]);
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
        // burbujita para partículas: cuerpo claro que se aclara hacia el filo, sin aro
        texturaCanvas("fx-burbuja", 32, 32, function (ctx, s) {
            var gb = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2 - 1);
            gb.addColorStop(0, "rgba(200,245,255,0.12)");
            gb.addColorStop(0.68, "rgba(200,245,255,0.3)");
            gb.addColorStop(0.9, "rgba(255,255,255,0.9)");
            gb.addColorStop(1, "rgba(255,255,255,0.2)");
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
            ctx.fillStyle = gb;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(s * 0.36, s * 0.34, s * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
        });
        // rayo de luz que entra desde la superficie
        texturaCanvas("fx-rayo", 128, 512, function (ctx, w, h) {
            var g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "rgba(255,255,255,0.75)");
            g.addColorStop(0.6, "rgba(255,255,255,0.18)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(w * 0.38, 0);
            ctx.lineTo(w * 0.62, 0);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();
        });
        // burbuja del borde del camino (objeto que se revienta)
        texturaCanvas("fx-burbujaBorde", 64, 64, function (ctx) {
            dibujarBurbuja(ctx, { x: 32, y: 32, r: 29 }, PALETA.normal);
        });
        // anillo de onda (al tocar, al llegar)
        texturaCanvas("fx-onda", 128, 128, function (ctx, s) {
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2);
            ctx.lineWidth = 7;
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#fff";
            ctx.stroke();
        });
        // degradado de profundidad del mar (vertical)
        texturaCanvas("fx-mar", 8, 512, function (ctx, w, h) {
            var g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "#62d4f2");
            g.addColorStop(0.35, "#2a9fd6");
            g.addColorStop(0.75, "#13649e");
            g.addColorStop(1, "#0b3d6b");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });
        texturaCanvas("fx-blanco", 8, 8, function (ctx, w, h) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
        });
        // fondo de arena con ondas
        texturaCanvas("fx-arena", 512, 128, function (ctx, w, h) {
            var g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "#f3d9a4");
            g.addColorStop(1, "#c9a26b");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(0, 30);
            for (var x = 0; x <= w; x += 16) ctx.lineTo(x, 26 + Math.sin(x / 40) * 10 + Math.sin(x / 13) * 3);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.lineWidth = 3;
            for (var k = 0; k < 3; k++) {
                ctx.beginPath();
                for (var x2 = 0; x2 <= w; x2 += 16) ctx.lineTo(x2, 58 + k * 22 + Math.sin(x2 / 30 + k) * 5);
                ctx.stroke();
            }
        });
        // perla-guía del camino
        texturaCanvas("fx-luz", 48, 48, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.22, "rgba(255,255,255,0.95)"], [0.42, "rgba(255,255,255,0.55)"], [1, "rgba(255,255,255,0)"]]);
        });
        // señal amable del callejón: burbuja grande con flecha de regreso
        texturaCanvas("fx-senal", 160, 160, function (ctx, s) {
            ctx.translate(s / 2, s / 2);
            var g = ctx.createRadialGradient(0, 0, 10, 0, 0, s / 2);
            g.addColorStop(0, "rgba(255,248,200,0.95)");
            g.addColorStop(0.55, "rgba(99,230,190,0.9)");
            g.addColorStop(1, "rgba(99,230,190,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
            ctx.fill();
            // disco blanco con un halo turquesa relleno (sin aro trazado)
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.3 + 4.5, 0, Math.PI * 2);
            ctx.fillStyle = "#15aabf";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.3 - 3, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.strokeStyle = "#0c8599";
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

    function medirArea() {
        var vw = global.innerWidth, vh = global.innerHeight;
        var cab = document.querySelector(".hud-top");
        var arriba = cab ? Math.max(60, cab.getBoundingClientRect().bottom) : 80;
        var abajo = vh < 720 ? 74 : 86;
        area = { left: 10, top: arriba + 2, width: Math.max(200, vw - 20), height: Math.max(200, vh - arriba - 2 - abajo) };
        return area;
    }

    function dimensionesMundo() {
        medirArea();
        var W = Number(cfgJ.anchoMundo) || 1600;
        // tableta en vertical: un mundo más angosto para que el camino conserve un buen ancho bajo el dedo
        if (area.height / area.width > 0.85) W = Math.round(W * 0.72);
        var H = clamp(Math.round(W * area.height / area.width), Number(cfgJ.altoMinimo) || 800, Number(cfgJ.altoMaximo) || 1500);
        return { W: W, H: H };
    }

    function zoomAjuste() {
        return Math.min(area.width / dims.W, area.height / dims.H);
    }

    function reacomodar() {
        if (!sc) return;
        sc.scale.updateBounds();
        medirArea();
        ajustarFondo();
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

    /**
     * Del punto del puntero de Phaser (coordenadas del juego) al mundo, con la vista actual. No se usa
     * camera.getWorldPoint: después de mover la cámara a mano (final) su matriz puede quedar vieja.
     */
    function mundoDeJuego(x, y) {
        var v = vista();
        return { x: v.x0 + x / v.z, y: v.y0 + y / v.z };
    }

    function mundoDePantalla(x, y) {
        var v = vista();
        var r = sc.game.canvas.getBoundingClientRect();
        var kx = sc.scale.width / r.width, ky = sc.scale.height / r.height;
        return { x: v.x0 + ((x - r.left) * kx) / v.z, y: v.y0 + ((y - r.top) * ky) / v.z };
    }

    // ------------------------------------------------------------------ fondo submarino

    /** El degradado, la arena y el velo cubren el mundo con un buen margen (la cámara puede mostrar más). */
    function ajustarFondo() {
        if (!fondo.degradado) return;
        var extra = 2600;
        var W = dims.W + extra * 2 + 1600, H = dims.H + 2400;
        fondo.degradado.setPosition(-extra, -900).setDisplaySize(W, H);
        fondo.arena.setPosition(-extra, dims.H - 34).setDisplaySize(W, 220);
        fondo.velo.setPosition(-extra, -900).setDisplaySize(W, H);
        fondo.rayos.forEach(function (r, k) {
            r.x = dims.W * (0.08 + k * 0.2) + (k % 2 ? 40 : -30);
            r.y = -80;
            r.setDisplaySize(dims.W * 0.16, dims.H * 1.15);
        });
        // algas y adornos del suelo: repartidos a lo ancho, plantados sobre la arena (o en los bordes)
        var ancho = dims.W + 700;
        fondo.algas.forEach(function (a) {
            if (a.borde) {
                a.x = a.borde < 0 ? -40 - a.u * 220 : dims.W + 40 + a.u * 220;
                a.y = dims.H + 20;
            } else {
                a.x = -350 + a.u * ancho;
                a.y = dims.H + (a.lejana ? -6 : 14 + a.u2 * 18);
            }
            a.s.x = a.x;
            a.s.y = a.y;
        });
        fondo.suelo.forEach(function (o) {
            o.s.x = -300 + o.u * (dims.W + 600);
            o.s.y = dims.H + 6 + o.u2 * 26;
        });
        // silueta del arrecife lejano: tramos seguidos a lo ancho, apoyados un poco sobre la arena
        var tramo = (dims.W + 1400) / 5;
        fondo.lejanos.forEach(function (l) {
            l.s.setDisplaySize(tramo * 1.15, l.alto);
            l.s.x = -700 + l.k * tramo - (l.k % 2 ? tramo * 0.45 : 0);
            l.s.y = dims.H + 4;
        });
    }

    /** Un alga del fondo: lejana (oscura, detrás de todo) o cercana (color, sobre la arena). */
    function algaFondo(r, tipo, alto, lejana, u, borde) {
        var o = origen(I.SVG[tipo]);
        var s = sc.add.image(0, 0, "ico-" + tipo).setOrigin(0.5, 1);
        s.setScale(alto / o.h / RES);
        if (lejana) {
            s.setDepth(-86).setTint([0x1b6e7a, 0x22808a, 0x175f73][Math.floor(r() * 3)]).setAlpha(0.6);
        } else {
            s.setDepth(-36).setTint([0xffffff, 0xd3f9d8, 0x96f2d7, 0xd8f5a2, 0xffd8a8][Math.floor(r() * 5)]);
            if (r() < 0.5) s.setFlipX(true);
        }
        var a = { s: s, u: u, u2: r(), f: r() * 6.28, v: r.entre(0.6, 1.3), alto: alto, k: 0, lejana: lejana, borde: borde || 0, x: 0, y: 0 };
        fondo.algas.push(a);
        return a;
    }

    function crearFondo() {
        sc.cameras.main.setBackgroundColor("#0b3d6b");
        var r = R.azar(R.semillaNueva());
        fondo.degradado = sc.add.image(0, 0, "fx-mar").setOrigin(0, 0).setDepth(-100);
        fondo.arena = sc.add.image(0, 0, "fx-arena").setOrigin(0, 0).setDepth(-40);
        // velo que tiñe el agua (rojo en la alerta, luz al celebrar)
        fondo.velo = sc.add.image(0, 0, "fx-blanco").setOrigin(0, 0).setDepth(-39).setTint(0xff4d6d).setAlpha(0);
        // rayos de luz que entran desde la superficie y se mecen
        for (var k = 0; k < 5; k++) {
            var ray = sc.add.image(0, 0, "fx-rayo").setOrigin(0.5, 0).setBlendMode(ADD).setDepth(-90);
            ray.setAlpha(0.16);
            ray.setRotation(-0.18 + k * 0.08);
            ray.setData("base", 0.12 + (k % 3) * 0.04);
            ray.setData("f", r() * 6.28);
            fondo.rayos.push(ray);
        }
        // nubes de luz suaves
        [[0x99e9f2, 0.2, 0.15], [0xc5f6fa, 0.75, 0.1], [0x74c0fc, 0.5, 0.6]].forEach(function (n) {
            var s = sc.add.image(1600 * n[1], 900 * n[2], "fx-nube").setScale(5).setTint(n[0]).setAlpha(0.22).setBlendMode(ADD).setDepth(-88);
            if (!reducido) sc.tweens.add({ targets: s, x: s.x + r.entre(-140, 140), y: s.y + r.entre(-60, 60), duration: r.entre(12000, 20000), yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        });
        // motas de plancton que flotan
        for (var i = 0; i < 70; i++) {
            var m = sc.add.image(r.entre(-600, 2200), r.entre(-300, 1700), "fx-punto");
            m.setScale(r.entre(0.3, 0.8)).setAlpha(r.entre(0.25, 0.6)).setBlendMode(ADD).setDepth(-70);
            fondo.motas.push({ s: m, bx: m.x, by: m.y, f: r() * 6.28, v: r.entre(0.3, 1), a: m.alpha });
        }
        // burbujas que suben despacio (se apartan del pez)
        for (var b = 0; b < 34; b++) {
            var bu = sc.add.image(r.entre(-200, 1800), r.entre(-200, 1600), "ico-burbuja");
            var tam = r.entre(10, 34);
            bu.setScale(tam / 100 / RES).setAlpha(r.entre(0.45, 0.85)).setDepth(-30);
            fondo.burbujas.push({ s: bu, x: bu.x, y: bu.y, v: r.entre(18, 46), f: r() * 6.28, dx: 0, dy: 0, tam: tam });
        }
        // bosque de algas: un plano lejano (oscuro, detrás de los rayos) y uno cercano sobre la arena
        var nLejanas = 26, nCercanas = 34;
        for (var al = 0; al < nLejanas; al++) {
            algaFondo(r, al % 3 === 0 ? "alga" : "algaLarga", r.entre(170, 340), true, (al + r.entre(0.1, 0.9)) / nLejanas);
        }
        for (var ac = 0; ac < nCercanas; ac++) {
            // en manojos: dos o tres algas juntas y luego un hueco
            var u = (Math.floor(ac / 3) * 3 + (ac % 3) * 0.35 + r.entre(0, 0.4)) / nCercanas;
            algaFondo(r, ac % 4 === 1 ? "algaLarga" : "alga", r.entre(90, 200), false, u);
        }
        // algas altas en los bordes izquierdo y derecho
        for (var ab = 0; ab < 6; ab++) {
            algaFondo(r, "algaLarga", r.entre(380, 620), true, r(), ab % 2 ? 1 : -1);
            algaFondo(r, "alga", r.entre(240, 360), false, r(), ab % 2 ? 1 : -1);
        }
        // rocas, estrellas de mar y caracoles sobre la arena
        // rocas, corales, anémonas, estrellas de mar y caracoles sobre la arena
        var adornosSuelo = ["roca", "coralAbanico", "estrellaMar", "anemona", "rocaPlana", "coralTubos", "caracol", "roca", "anemona",
            "coralAbanico", "estrellaMar", "rocaPlana", "coralTubos", "caracol", "anemona", "roca", "coralAbanico", "estrellaMar"];
        adornosSuelo.forEach(function (tipo, k) {
            var o = origen(I.SVG[tipo]);
            var chico = tipo === "estrellaMar" || tipo === "caracol";
            var coralito = tipo === "coralAbanico" || tipo === "coralTubos" || tipo === "anemona";
            var tamS = chico ? r.entre(36, 52) : coralito ? r.entre(80, 130) : r.entre(90, 140);
            var s = sc.add.image(0, 0, "ico-" + tipo).setOrigin(0.5, coralito ? 0.97 : 0.85).setDepth(coralito ? -35 : -34);
            s.setScale(tamS / Math.max(o.w, o.h) / RES);
            if (tipo === "estrellaMar") s.setRotation(r.entre(-0.6, 0.6));
            if (r() < 0.5 && !chico) s.setFlipX(true);
            fondo.suelo.push({ s: s, u: (k + r.entre(0.15, 0.85)) / adornosSuelo.length, u2: r(), mece: coralito ? r() * 6.28 : null });
        });
        // silueta del arrecife lejano: da profundidad detrás del bosque de algas
        for (var sl = 0; sl < 6; sl++) {
            var sil = sc.add.image(0, 0, "ico-arrecifeLejano").setOrigin(0, 1).setDepth(-95);
            sil.setTint(sl % 2 ? 0x1c6f99 : 0x175d85).setAlpha(sl % 2 ? 0.55 : 0.4).setFlipX(sl % 2 === 1);
            fondo.lejanos.push({ s: sil, k: sl, alto: sl % 2 ? 210 : 260 });
        }
        // medusas translúcidas que suben despacio latiendo
        for (var md = 0; md < 5; md++) {
            var me = sc.add.image(r.entre(-200, 1800), r.entre(-100, 1200), "ico-medusa");
            var tamM = r.entre(46, 84);
            me.setScale(tamM / 80 / RES).setAlpha(r.entre(0.55, 0.8)).setDepth(md % 2 ? -62 : -31);
            fondo.medusas.push({ s: me, x: me.x, y: me.y, v: r.entre(8, 16), f: r() * 6.28, esc: tamM / 80 / RES, dx: 0 });
        }
        // peces de adorno a todo color que pasan nadando, en dos planos (huyen un poco del pez)
        var especies = ["pezCirujano", "pezAngel", "pezGlobo", "pezMariposa", "pececito"];
        for (var p = 0; p < 14; p++) {
            var lejos = p % 3 === 0;
            var esp = especies[p % especies.length];
            var oe = origen(I.SVG[esp]);
            var pc = sc.add.image(r.entre(0, 1600), 0, "ico-" + esp);
            var ancho = lejos ? r.entre(38, 52) : r.entre(58, 96);
            pc.setScale(ancho / oe.w / RES).setAlpha(lejos ? 0.5 : 0.92).setDepth(lejos ? -84 : -28);
            if (esp === "pececito") pc.setTint(COLORES_AMIGOS[p % COLORES_AMIGOS.length]);
            else if (lejos) pc.setTint(0x8fc9e6);
            var dir = r() < 0.5 ? 1 : -1;
            pc.setFlipX(dir < 0);
            fondo.peces.push({ s: pc, x: pc.x, yu: r.entre(0.08, 0.86), v: r.entre(lejos ? 18 : 30, lejos ? 34 : 64) * dir, f: r() * 6.28, dy: 0 });
        }
        // una tortuga marina que cruza tranquila
        var tor = sc.add.image(r.entre(0, 1600), 0, "ico-tortuga").setScale(130 / 160 / RES).setDepth(-27);
        fondo.peces.push({ s: tor, x: tor.x, yu: 0.32, v: 16, f: r() * 6.28, dy: 0, tortuga: true });
        // cardúmenes: grupos de pececitos que nadan juntos
        [[0xffe066, 8], [0x74c0fc, 9], [0xff8fa3, 7]].forEach(function (cd, k) {
            var dir = k % 2 ? -1 : 1;
            var g = { x: r.entre(0, 1600), yu: 0.18 + k * 0.28, v: r.entre(40, 60) * dir, f: r() * 6.28, dy: 0, miembros: [] };
            for (var mm = 0; mm < cd[1]; mm++) {
                var s = sc.add.image(0, 0, "ico-pececito").setScale(r.entre(0.3, 0.42) / RES).setTint(cd[0]).setAlpha(0.8).setDepth(-29);
                s.setFlipX(dir < 0);
                g.miembros.push({ s: s, dx: r.entre(-90, 90), dy: r.entre(-40, 40), f: r() * 6.28 });
            }
            fondo.cardumenes.push(g);
        });
        ajustarFondo();
    }

    /** El fondo reacciona: burbujas y peces se apartan del pez, la luz crece con el avance, rojo en la alerta. */
    function actualizarFondo(t, dt) {
        var s = dt / 1000;
        var hay = pil.visible && !reducido;
        var Wm = Math.max(1600, dims.W), Hm = dims.H;
        fondo.luz = lerp(fondo.luz, fondo.luzObj, Math.min(1, dt / 600));
        for (var k = 0; k < fondo.rayos.length; k++) {
            var ray = fondo.rayos[k];
            var a = ray.getData("base") * (0.75 + 0.25 * Math.sin(t * 0.0006 + ray.getData("f")));
            ray.setAlpha(clamp(a + fondo.luz * 0.22, 0, 0.6));
            if (!reducido) ray.rotation = -0.18 + k * 0.08 + Math.sin(t * 0.0003 + k) * 0.05;
        }
        fondo.velo.setAlpha(rojo * 0.16);
        for (var i = 0; i < fondo.burbujas.length; i++) {
            var b = fondo.burbujas[i];
            if (!reducido) {
                b.y -= b.v * s;
                if (b.y < -260) { b.y = Hm + 200; b.x = Math.random() * Wm; }
            }
            var px = b.x + Math.sin(t * 0.001 + b.f) * 14;
            var ox = 0, oy = 0;
            if (hay) {
                var dx = px - pil.x, dy = b.y - pil.y, d = Math.hypot(dx, dy);
                var rr = rec ? rec.ancho * 1.6 : 160;
                if (d < rr && d > 0.1) {
                    var f = (1 - d / rr) * rr * 0.6;
                    ox = dx / d * f;
                    oy = dy / d * f;
                }
            }
            b.dx = lerp(b.dx, ox, 0.1);
            b.dy = lerp(b.dy, oy, 0.1);
            b.s.x = px + b.dx;
            b.s.y = b.y + b.dy;
        }
        for (var m = 0; m < fondo.motas.length; m++) {
            var mo = fondo.motas[m];
            mo.s.x = mo.bx + Math.sin(t * 0.0004 * mo.v + mo.f) * 22;
            mo.s.y = mo.by + Math.cos(t * 0.0003 * mo.v + mo.f) * 16;
            mo.s.setAlpha(mo.a * (0.6 + 0.4 * Math.sin(t * 0.002 * mo.v + mo.f)) + fondo.luz * 0.15);
        }
        for (var p = 0; p < fondo.peces.length; p++) {
            var pc = fondo.peces[p];
            if (!reducido) {
                pc.x += pc.v * s;
                if (pc.x > Wm + 200) pc.x = -200;
                if (pc.x < -200) pc.x = Wm + 200;
            }
            var py = pc.yu * Hm;
            var huye = 0;
            if (hay) {
                var ddx = pc.x - pil.x, ddy = py - pil.y, dd = Math.hypot(ddx, ddy);
                if (dd < 260) huye = (ddy >= 0 ? 1 : -1) * (1 - dd / 260) * 90;
            }
            pc.dy = lerp(pc.dy, huye, 0.06);
            pc.s.x = pc.x;
            pc.s.y = py + Math.sin(t * 0.0015 + pc.f) * 10 + pc.dy;
            // la tortuga planea: se inclina un poco al subir y bajar
            if (pc.tortuga && !reducido) pc.s.rotation = Math.cos(t * 0.0015 + pc.f) * 0.08 * (pc.v < 0 ? -1 : 1);
        }
        // medusas: suben despacio latiendo y se apartan del pez
        for (var mj = 0; mj < fondo.medusas.length; mj++) {
            var mu = fondo.medusas[mj];
            if (!reducido) {
                var late = Math.sin(t * 0.003 + mu.f);
                mu.y -= mu.v * (1 + Math.max(0, late) * 1.2) * s;
                if (mu.y < -300) { mu.y = Hm + 250; mu.x = Math.random() * Wm; }
                mu.s.setScale(mu.esc * (1 + late * 0.05), mu.esc * (1 - late * 0.07));
            }
            var aparta = 0;
            if (hay) {
                var mdx = mu.x - pil.x, mdd = Math.hypot(mdx, mu.y - pil.y);
                if (mdd < 240) aparta = (mdx >= 0 ? 1 : -1) * (1 - mdd / 240) * 80;
            }
            mu.dx = lerp(mu.dx, aparta, 0.05);
            mu.s.x = mu.x + Math.sin(t * 0.0005 + mu.f) * 20 + mu.dx;
            mu.s.y = mu.y;
        }
        // corales y anémonas de la arena: se mecen apenas con la corriente
        if (!reducido) {
            for (var so = 0; so < fondo.suelo.length; so++) {
                var su = fondo.suelo[so];
                if (su.mece != null) su.s.rotation = Math.sin(t * 0.0009 + su.mece) * 0.04;
            }
        }
        // cardúmenes: el grupo avanza junto y se abre para dejar pasar al pez
        for (var g = 0; g < fondo.cardumenes.length; g++) {
            var cd = fondo.cardumenes[g];
            if (!reducido) {
                cd.x += cd.v * s;
                if (cd.x > Wm + 300) cd.x = -300;
                if (cd.x < -300) cd.x = Wm + 300;
            }
            var gy = cd.yu * Hm + Math.sin(t * 0.0007 + cd.f) * 30;
            var abre = 0;
            if (hay) {
                var gd = Math.hypot(cd.x - pil.x, gy - pil.y);
                if (gd < 320) abre = 1 - gd / 320;
            }
            cd.dy = lerp(cd.dy, abre, 0.06);
            for (var mi = 0; mi < cd.miembros.length; mi++) {
                var mb = cd.miembros[mi];
                var sep = 1 + cd.dy * 1.4;
                mb.s.x = cd.x + mb.dx * sep + Math.sin(t * 0.002 + mb.f) * 6;
                mb.s.y = gy + mb.dy * sep + Math.cos(t * 0.0025 + mb.f) * 5;
            }
        }
        // bosque de algas: se mecen con el agua; las cercanas se doblan cuando el pez pasa al lado
        for (var q = 0; q < fondo.algas.length; q++) {
            var ag = fondo.algas[q];
            var empA = 0;
            if (hay && !ag.lejana) {
                var qx = ag.x - pil.x, qy = (ag.y - ag.alto * 0.5) - pil.y;
                var qd = Math.hypot(qx, qy), rad = ag.alto * 0.6 + (rec ? rec.ancho : 100);
                if (qd < rad) {
                    empA = (qx >= 0 ? 1 : -1) * (1 - qd / rad);
                    if (Math.abs(empA) > 0.3 && Math.random() < 0.05 && hojitas) hojitas.emitParticleAt(ag.x, ag.y - ag.alto * 0.7, 1);
                }
            }
            ag.k = lerp(ag.k, empA, 0.07);
            ag.s.rotation = reducido ? 0 : Math.sin(t * 0.001 * ag.v + ag.f) * (ag.lejana ? 0.06 : 0.1) + ag.k * 0.4;
        }
        // algas y adornos cerca del camino: se doblan y se apartan un poco al pasar el pez
        for (var d2 = 0; d2 < decor.length; d2++) {
            var o = decor[d2];
            if (!o.s.active) continue;
            var empuje = 0, ex = 0;
            if (hay) {
                var qx = o.x - pil.x, qy = o.y - pil.y, qd = Math.hypot(qx, qy);
                var radio = o.radio;
                if (qd < radio) {
                    empuje = (1 - qd / radio);
                    ex = (qx >= 0 ? 1 : -1) * empuje;
                    if (o.alga && empuje > 0.25 && Math.random() < 0.08 && hojitas) hojitas.emitParticleAt(o.x, o.y - o.alto * 0.6, 1);
                }
            }
            o.k = lerp(o.k || 0, ex, 0.08);
            if (o.alga) {
                o.s.rotation = Math.sin(t * 0.0012 + o.f) * 0.12 + o.k * 0.45;
            } else {
                o.s.x = o.x + o.k * o.desplaza;
            }
        }
        // el coral brilla más a medida que el pez se acerca
        if (coral && rec) {
            var dm = Math.hypot(pil.x - coral.cx, pil.y - coral.cy);
            var cerca = pil.visible ? clamp(1 - dm / (rec.ancho * 7), 0, 1) : 0;
            coral.brillo = lerp(coral.brillo, Math.max(cerca, coral.extra), 0.06);
            coral.halo.setAlpha(0.18 + coral.brillo * 0.62 + Math.sin(t * 0.004) * 0.05 * coral.brillo);
            coral.halo.setScale(coral.haloEsc * (1 + coral.brillo * 0.35));
            if (coral.extra > 0) coral.extra = Math.max(0, coral.extra - dt / 2500);
        }
    }

    function pulsoFondo(fuerza) {
        fondo.luz = Math.min(1, fondo.luz + (fuerza || 0.2));
        if (pistaBrillo) pistaBrillo.setData("pulso", Math.min(0.5, (pistaBrillo.getData("pulso") || 0) + (fuerza || 0.2) * 0.8));
    }

    // ------------------------------------------------------------------ camino de agua bordeado de burbujas

    var PALETA = {
        normal: { sombra: "rgba(4,30,60,0.55)", borde: "#0b5394", agua: "#4fc3f7", claro: "#9be7ff", brillo: "#e3fbff", puntos: "#ffffff", bur: ["rgba(255,255,255,0.08)", "rgba(190,240,255,0.35)", "rgba(255,255,255,0.95)"], burBorde: "rgba(120,200,255,0.9)" },
        roja: { sombra: "rgba(60,4,10,0.5)", borde: "#7a0a14", agua: "#e03131", claro: "#ff6b6b", brillo: "#ffc9c9", puntos: "#fff5f5", bur: ["rgba(255,120,120,0.25)", "rgba(240,62,62,0.6)", "rgba(255,200,200,0.95)"], burBorde: "rgba(201,42,42,0.95)" }
    };

    function lineasDe(r) {
        return [r.principal].concat(r.falsos.map(function (f) { return f.pts; }));
    }

    /** Puntos de las burbujas del borde: a ambos lados de cada línea, sin caer dentro de otro tramo del camino. */
    function burbujasBorde(r) {
        if (r._burbujas) return r._burbujas;
        var lineas = lineasDe(r);
        var w = r.ancho;
        var celda = w;
        var grilla = {};
        lineas.forEach(function (pts) {
            for (var i = 0; i < pts.length; i += 2) {
                var k = Math.floor(pts[i].x / celda) + "," + Math.floor(pts[i].y / celda);
                (grilla[k] = grilla[k] || []).push(pts[i]);
            }
        });
        var dentroDeOtro = function (x, y, lim) {
            var cx = Math.floor(x / celda), cy = Math.floor(y / celda);
            for (var a = -1; a <= 1; a++) {
                for (var b = -1; b <= 1; b++) {
                    var lista = grilla[(cx + a) + "," + (cy + b)];
                    if (!lista) continue;
                    for (var j = 0; j < lista.length; j++) if (Math.hypot(lista[j].x - x, lista[j].y - y) < lim) return true;
                }
            }
            return false;
        };
        var out = [];
        var paso = Math.max(3, Math.round(w * 0.34 / r.paso));
        lineas.forEach(function (pts, li) {
            for (var i = 0; i < pts.length; i += paso) {
                var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
                var tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1;
                var nx = -ty / tl, ny = tx / tl;
                [-1, 1].forEach(function (lado, q) {
                    var semi = ((i * 7 + li * 13 + q * 5) % 11) / 10;   // tamaño "al azar" fijo
                    var rad = w * (0.1 + semi * 0.07);
                    var x = pts[i].x + nx * lado * (w * 0.5 + rad * 0.35);
                    var y = pts[i].y + ny * lado * (w * 0.5 + rad * 0.35);
                    if (dentroDeOtro(x, y, w * 0.5 - 2)) return;
                    out.push({ x: x, y: y, r: rad });
                });
            }
            // al final de un callejón, un racimo que lo cierra
            if (li > 0 && !r.falsos[li - 1].lazo) {
                var u = pts[pts.length - 1], v = pts[Math.max(0, pts.length - 4)];
                var dx = u.x - v.x, dy = u.y - v.y, dl = Math.hypot(dx, dy) || 1;
                for (var k = -2; k <= 2; k++) {
                    var ang = Math.atan2(dy, dx) + k * 0.55;
                    out.push({ x: u.x + Math.cos(ang) * w * 0.55, y: u.y + Math.sin(ang) * w * 0.55, r: w * (0.13 + (k + 2) % 2 * 0.05) });
                }
            }
        });
        r._burbujas = out;
        return out;
    }

    /** Una burbuja del borde del camino (canvas 2D): cuerpo transparente, aro y brillo. */
    function dibujarBurbuja(x, b, pal) {
        var g = x.createRadialGradient(b.x - b.r * 0.2, b.y - b.r * 0.2, b.r * 0.1, b.x, b.y, b.r);
        // sin aro: el color del borde se funde en el propio degradado
        g.addColorStop(0, pal.bur[0]);
        g.addColorStop(0.62, pal.bur[1]);
        g.addColorStop(0.86, pal.burBorde);
        g.addColorStop(1, pal.bur[2]);
        x.fillStyle = g;
        x.beginPath();
        x.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "rgba(255,255,255,0.95)";
        x.beginPath();
        x.ellipse(b.x - b.r * 0.35, b.y - b.r * 0.38, b.r * 0.28, b.r * 0.16, -0.6, 0, Math.PI * 2);
        x.fill();
    }

    /** Camino de agua en un canvas. sinBurbujas: el juego pone las burbujas del borde como objetos aparte. */
    function canvasPista(r, pal, escala, sinSombra, sinBurbujas) {
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
        if (!sinSombra) trazo(w + 26, pal.sombra, 18, 26, 0.5);
        trazo(w + 12, pal.borde, 0, 10, 0.9);
        trazo(w + 2, pal.agua, 0);
        trazo(w * 0.78, pal.claro, 0, 0, 0.85);
        trazo(w * 0.3, pal.brillo, -w * 0.12, 14, 0.4);
        trazo(7, pal.puntos, 0, 6, 0.75, [0.1, 26]);
        // burbujas del borde (solo en la miniatura: en el juego son objetos que se pueden reventar)
        if (!sinBurbujas) burbujasBorde(r).forEach(function (b) { dibujarBurbuja(x, b, pal); });
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
        decor = [];
        bordes = { lista: [], grilla: {}, celda: 100, reventadas: 0, tinte: -1 };
        pistaImg = pistaRoja = pistaBrillo = rastroG = null;
        concha = coral = senal = null;
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

    /** Celdas sin camino (ni ramales, ni el coral, ni el hueco de Zoe). */
    function celdasLibres(r) {
        var g = r.rejilla;
        var ocupadas = {};
        r.celdas.forEach(function (c) { ocupadas[c[0] + "," + c[1]] = true; });
        r.falsos.forEach(function (f) {
            for (var i = 0; i < f.pts.length; i += 6) {
                var p = f.pts[i];
                ocupadas[Math.floor((p.x - g.m) / g.cx) + "," + Math.floor((p.y - g.m) / g.cy)] = true;
            }
        });
        var fin = r.celdas[r.celdas.length - 1];
        var libres = [];
        for (var c = 0; c < g.cols; c++) {
            for (var f = 0; f < g.filas; f++) {
                if (ocupadas[c + "," + f]) continue;
                if (c >= g.cols - 2 && Math.abs(f - fin[1]) <= 1) continue; // el coral
                if (c === 0 && f === g.filas - 1) continue;                 // hueco de Zoe
                libres.push([c, f]);
            }
        }
        return libres;
    }

    function agregarDecor(s, x, y, opciones) {
        var o = Object.assign({ s: s, x: x, y: y, k: 0, f: Math.random() * 6.28, radio: rec.ancho * 1.8, desplaza: rec.ancho * 0.12, alto: 0, alga: false }, opciones || {});
        decor.push(o);
        return o;
    }

    /**
     * Decoración en celdas libres. Lo que vive en el fondo (rocas, algas, estrellas de mar y caracoles) solo va
     * en las celdas libres de la fila de abajo, apoyado sobre la arena; nunca flota en el agua.
     * En las celdas libres de agua abierta solo hay cosas que sí flotan: racimos de burbujas que suben y bajan.
     */
    function decorar(r) {
        var rnd = R.azar((r.semilla ^ 0x5bd1e995) >>> 0);
        var libres = celdasLibres(r);
        for (var i = libres.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = libres[i]; libres[i] = libres[j]; libres[j] = t;
        }
        var g = r.rejilla;
        var lado = Math.min(g.cx, g.cy);
        var suelo = r.H + 14;   // línea de la arena (igual que las algas cercanas del fondo)
        var deFondo = libres.filter(function (c) { return c[1] === g.filas - 1; });
        var deAgua = libres.filter(function (c) { return c[1] !== g.filas - 1; });

        // sobre la arena: rocas, algas, estrellas de mar y caracoles
        var tipos = ["roca", "alga", "estrellaMar", "rocaPlana", "algaLarga", "caracol"];
        deFondo.forEach(function (c, k) {
            var p = celdaCentro(r, c);
            p.x += rnd.entre(-0.12, 0.12) * g.cx;
            var tipo = tipos[(k + (r.semilla % 6)) % tipos.length];
            var o = origen(I.SVG[tipo]);
            if (tipo === "alga" || tipo === "algaLarga") {
                // un manojo de 2-3 algas plantadas en la arena que se mecen (origen abajo)
                var n = 2 + (k % 2);
                for (var a = 0; a < n; a++) {
                    var alto = lado * rnd.entre(0.6, 0.85);
                    var ax = p.x + (a - (n - 1) / 2) * lado * 0.18;
                    var s = guardar(sc.add.image(ax, suelo, "ico-" + tipo).setOrigin(0.5, 1));
                    s.setScale(alto / o.h / RES).setDepth(-5);
                    agregarDecor(s, ax, suelo, { alga: true, alto: alto, radio: r.ancho * 2 });
                }
            } else {
                var chico = tipo === "estrellaMar" || tipo === "caracol";
                var tam = chico ? lado * rnd.entre(0.26, 0.34) : lado * rnd.entre(0.5, 0.66);
                // apoyado: la base del dibujo toca la arena (las rocas se hunden un poquito)
                var s2 = guardar(sc.add.image(p.x, suelo + (chico ? -4 : 6), "ico-" + tipo).setOrigin(0.5, 1));
                s2.setScale(tam / Math.max(o.w, o.h) / RES).setDepth(-5);
                if (tipo === "estrellaMar") s2.setRotation(rnd.entre(-0.3, 0.3));
                agregarDecor(s2, p.x, s2.y, { desplaza: chico ? rec.ancho * 0.08 : 0 });
            }
        });
        // algas sueltas en la arena a los lados de algunas celdas del fondo
        var nAlgas = Math.min(3, Math.max(1, (r.id || 1)));
        for (var q = 0; q < nAlgas && deFondo.length; q++) {
            var pc = celdaCentro(r, deFondo[(q * 3) % deFondo.length]);
            var x0 = pc.x + (q % 2 ? 1 : -1) * g.cx * 0.34;
            var o2 = origen(I.SVG.alga);
            var s3 = guardar(sc.add.image(x0, suelo, "ico-alga").setOrigin(0.5, 1).setDepth(-6));
            s3.setScale(lado * 0.42 / o2.h / RES).setTint(0x8ce99a);
            agregarDecor(s3, x0, suelo, { alga: true, alto: lado * 0.42, radio: r.ancho * 2 });
        }

        // agua abierta: racimos de burbujas que flotan (en una de cada dos celdas, para no recargar)
        deAgua.forEach(function (c, k) {
            if (k % 2) return;
            var p = celdaCentro(r, c);
            var n = 3 + (k % 3);
            for (var b = 0; b < n; b++) {
                var bx = p.x + rnd.entre(-0.22, 0.22) * g.cx;
                var by = p.y + rnd.entre(-0.22, 0.22) * g.cy;
                var tamB = lado * rnd.entre(0.07, 0.16);
                var sb = guardar(sc.add.image(bx, by, "ico-burbuja"));
                sb.setScale(tamB / 100 / RES).setAlpha(rnd.entre(0.55, 0.9)).setDepth(-5);
                if (!reducido) sc.tweens.add({ targets: sb, y: by - lado * 0.08, duration: rnd.entre(2200, 3800), yoyo: true, repeat: -1, ease: "Sine.easeInOut", delay: rnd.entre(0, 1200) });
                agregarDecor(sb, bx, by, { desplaza: rec.ancho * 0.15 });
            }
        });
    }

    // ------------------------------------------------------------------ burbujas del borde (se revientan)

    /** Cada burbuja del borde del camino es un objeto: así se puede reventar si el pez se sale por ahí. */
    function crearBordes(r) {
        var celda = r.ancho;
        bordes = { lista: [], grilla: {}, celda: celda, reventadas: 0, tinte: -1 };
        burbujasBorde(r).forEach(function (b, i) {
            var s = guardar(sc.add.image(b.x, b.y, "fx-burbujaBorde"));
            var esc = (b.r * 2) / 58;
            s.setScale(esc).setDepth(1.6);
            var o = { s: s, x: b.x, y: b.y, r: b.r, esc: esc, viva: true };
            bordes.lista.push(o);
            var k = Math.floor(b.x / celda) + "," + Math.floor(b.y / celda);
            (bordes.grilla[k] = bordes.grilla[k] || []).push(o);
            // algunas burbujas laten despacio: el borde se ve vivo
            if (!reducido && i % 5 === 0) sc.tweens.add({ targets: s, scale: esc * 1.08, duration: 900 + (i % 7) * 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        });
    }

    /** Revienta las burbujas del borde que toca el pez (radio en unidades del mundo). */
    function reventarCerca(x, y, radio) {
        var c = bordes.celda;
        var cx = Math.floor(x / c), cy = Math.floor(y / c);
        for (var a = -1; a <= 1; a++) {
            for (var b = -1; b <= 1; b++) {
                var lista = bordes.grilla[(cx + a) + "," + (cy + b)];
                if (!lista) continue;
                for (var i = 0; i < lista.length; i++) {
                    var o = lista[i];
                    if (!o.viva || Math.hypot(o.x - x, o.y - y) > radio + o.r * 0.6) continue;
                    reventar(o);
                }
            }
        }
    }

    function reventar(o) {
        o.viva = false;
        bordes.reventadas++;
        var s = o.s;
        sc.tweens.killTweensOf(s);
        s.clearTint();
        sc.tweens.add({ targets: s, scale: o.esc * 1.6, alpha: 0, duration: 180, ease: "Quad.easeOut", onComplete: function () { if (s.active) s.setVisible(false); } });
        if (!reducido) {
            if (burbujasPez) burbujasPez.emitParticleAt(o.x, o.y, 3);
            if (chispas) chispas.emitParticleAt(o.x, o.y, 2);
        }
        emitir("revienta", bordes.reventadas, bordes.lista.length);
    }

    /** Mientras el pez está fuera, las burbujas que quedan se tiñen de rojo (en pasos, para no teñir cada cuadro). */
    function tenirBordes() {
        var nivel = Math.round(rojo * 4);
        if (nivel === bordes.tinte) return;
        bordes.tinte = nivel;
        var k = nivel / 4;
        var col = Phaser.Display.Color.GetColor(255, Math.round(255 - k * 140), Math.round(255 - k * 140));
        for (var i = 0; i < bordes.lista.length; i++) {
            var o = bordes.lista[i];
            if (!o.viva) continue;
            if (nivel === 0) o.s.clearTint();
            else o.s.setTint(col);
        }
    }

    function crearLuces(r) {
        var tam = r.ancho * 0.32 / 48;
        r.luces.forEach(function (l) {
            var glow = guardar(sc.add.image(l.x, l.y, "fx-halo"));
            glow.setBlendMode(ADD);
            glow.setScale(r.ancho * 0.5 / 128);
            glow.setAlpha(0.16);
            glow.setTint(0x99e9f2);
            glow.setDepth(2);
            var s = guardar(sc.add.image(l.x, l.y, "fx-luz"));
            s.setScale(tam);
            s.setTint(0xd0f4ff);
            s.setAlpha(0.7);
            s.setDepth(3);
            luces.push({ d: l, s: s, glow: glow, on: false, tam: tam });
        });
    }

    function encenderLuz(L, silencio) {
        if (L.on) return;
        L.on = true;
        L.s.setTint(0xfff3a0);
        L.s.setAlpha(1);
        L.glow.setTint(0xffe066);
        sc.tweens.killTweensOf([L.s, L.glow]);
        L.s.setScale(L.tam * 1.9);
        L.glow.setScale(rec.ancho * 0.9 / 128);
        L.glow.setAlpha(0.8);
        sc.tweens.add({ targets: L.s, scale: L.tam * 1.1, duration: 380, ease: "Back.easeOut" });
        sc.tweens.add({ targets: L.glow, scale: rec.ancho * 0.6 / 128, alpha: 0.5, duration: 600 });
        if (!silencio && burbujasPez && !reducido) burbujasPez.emitParticleAt(L.d.x, L.d.y, 3);
    }

    function textoEtiqueta(x, y, texto, color) {
        var t = sc.add.text(x, y, texto, {
            fontFamily: "Fredoka, sans-serif",
            fontSize: Math.round(rec.ancho * 0.36) + "px",
            fontStyle: "bold",
            color: color || "#ffffff",
            stroke: "#0b3d6b",
            strokeThickness: Math.round(rec.ancho * 0.08)
        });
        t.setOrigin(0.5, 1).setDepth(8);
        return t;
    }

    function crearExtremos(r) {
        var w = r.ancho;
        // coral mágico: la entrada de su cueva queda a la derecha del final del camino
        var k = w * 0.0118;
        var cx = r.meta.x + w * 0.3, cy = r.meta.y;
        var halo = guardar(sc.add.image(cx, cy - 60 * k, "fx-halo").setBlendMode(ADD).setTint(0xff8fc7).setDepth(3.5));
        var haloEsc = w * 3.4 / 128;
        halo.setScale(haloEsc).setAlpha(0.2);
        var cueva = guardar(sc.add.image(cx, cy, "ico-coralCueva").setScale(k * 1.0 / RES).setDepth(4));
        var img = guardar(sc.add.image(cx, cy, "ico-coral").setOrigin(130 / 260, 170 / 240).setScale(k / RES).setDepth(5));
        // el letrero va encima del coral; si el coral está pegado al borde de arriba, va debajo (no choca con
        // los botones de la cabecera)
        var arriba = cy - 175 * k - w * 0.4 > 0;
        var meta = guardar(textoEtiqueta(cx, arriba ? cy - 175 * k : cy + 80 * k + w * 0.4, "¡Meta!", "#ffe066"));
        if (!reducido) sc.tweens.add({ targets: meta, y: meta.y - 8, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        coral = { img: img, cueva: cueva, halo: halo, haloEsc: haloEsc, cx: cx, cy: cy, k: k, brillo: 0, extra: 0, meta: meta };
        // concha de salida
        concha = guardar(sc.add.image(r.inicio.x, r.inicio.y + w * 0.32, "ico-concha"));
        concha.setScale((w * 1.15) / 200 / RES).setDepth(4);
        var ini = guardar(textoEtiqueta(r.inicio.x, r.inicio.y - w * 0.62, "¡Inicia aquí!", "#ffffff"));
        ini.setFontSize(Math.round(w * 0.27));
        if (!reducido) sc.tweens.add({ targets: ini, scale: 1.06, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    /**
     * Arma un recorrido: camino (normal y rojo), estela del avance, burbujas-guía, extremos y decoración.
     * opciones.animar: el camino aparece y las burbujas-guía se encienden en ola.
     */
    async function cargarRecorrido(r, opciones) {
        if (!sc) return;
        descargar();
        rec = r;
        dims = { W: r.W, H: r.H };
        reacomodar();
        texturaDeCanvas("pista-n", canvasPista(r, PALETA.normal, 1, false, true));
        texturaDeCanvas("pista-r", canvasPista(r, PALETA.roja, 1, true, true));
        pistaImg = guardar(sc.add.image(0, 0, "pista-n").setOrigin(0, 0).setDepth(0));
        pistaRoja = guardar(sc.add.image(0, 0, "pista-r").setOrigin(0, 0).setDepth(1).setAlpha(0));
        pistaBrillo = guardar(sc.add.image(0, 0, "pista-n").setOrigin(0, 0).setDepth(1).setAlpha(0).setBlendMode(ADD));
        rastroG = guardar(sc.add.graphics().setDepth(2));
        crearBordes(r);
        crearLuces(r);
        crearExtremos(r);
        decorar(r);
        rojo = 0;
        fondo.luzObj = 0;
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
        pil.mira = pil.miraPrev = pil.miraVis = 0;
        pil.yaw = 0;
        pil.arrastrando = false;
        pil.bloqueado = true;
        pil.alegria = 0;
        if (pez) {
            pez.cont.setDepth(12);
            pez.cont.alpha = 1;
            pez.extraEsc = 1;
        }
        dibujarRastro();
        if (opciones && opciones.animar) await aparecerPista();
    }

    async function aparecerPista() {
        pistaImg.setAlpha(0);
        luces.forEach(function (L) { L.s.setAlpha(0); L.glow.setAlpha(0); });
        var sprBordes = bordes.lista.map(function (o) { return o.s; });
        sprBordes.forEach(function (s) { s.setAlpha(0); });
        tw({ targets: pistaImg, alpha: 1, duration: 700 });
        tw({ targets: sprBordes, alpha: 1, duration: 700 });
        var orden = luces.slice().sort(function (a, b) { return Math.hypot(a.d.x - rec.inicio.x, a.d.y - rec.inicio.y) - Math.hypot(b.d.x - rec.inicio.x, b.d.y - rec.inicio.y); });
        orden.forEach(function (L, k) {
            sc.tweens.add({ targets: L.s, alpha: 0.7, duration: 240, delay: 200 + k * 22 });
            sc.tweens.add({ targets: L.glow, alpha: 0.16, duration: 240, delay: 200 + k * 22 });
        });
        await sleep(Math.min(1500, 400 + orden.length * 22));
        luces.forEach(function (L) { L.s.setAlpha(0.7); L.glow.setAlpha(0.16); });
    }

    async function ocultarRecorrido() {
        if (!objRec.length) return;
        await tw({ targets: objRec.filter(function (o) { return o.setAlpha; }), alpha: 0, duration: 500 });
        descargar();
    }

    /** Estela brillante sobre el camino principal hasta donde llegó el pez. */
    function dibujarRastro() {
        if (!rastroG || !rec) return;
        rastroG.clear();
        var pts = rec.principal;
        var n = Math.min(pil.avance, pts.length - 1);
        if (n < 1) return;
        var w = rec.ancho;
        [[w * 0.42, 0xfff3bf, 0.14], [w * 0.2, 0xffe066, 0.4], [w * 0.07, 0xffffff, 0.85]].forEach(function (c) {
            rastroG.lineStyle(c[0], c[1], c[2]);
            rastroG.beginPath();
            rastroG.moveTo(pts[0].x, pts[0].y);
            for (var i = 1; i <= n; i++) rastroG.lineTo(pts[i].x, pts[i].y);
            rastroG.strokePath();
        });
    }

    // ------------------------------------------------------------------ pez

    function crearPez() {
        var cont = sc.add.container(0, 0);
        cont.setDepth(12);
        var halo = sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setAlpha(0).setScale(2.6);
        // cola: unión en el borde derecho de su dibujo, pegada a la parte de atrás del cuerpo
        var cola = sc.add.image(-66, 0, "ico-cola").setOrigin(1, 0.5).setScale(1 / RES);
        var cuerpo = sc.add.image(0, 0, "ico-pez").setScale(1 / RES);
        var aleta = sc.add.image(14, 16, "ico-aleta").setOrigin(44 / 50, 6 / 40).setScale(1 / RES);
        cont.add([halo, cola, cuerpo, aleta]);
        cont.setVisible(false);
        pez = { cont: cont, halo: halo, cola: cola, cuerpo: cuerpo, aleta: aleta, sacudir: 0, extraY: 0, extraEsc: 1, fase: 0 };
        burbujasPez = sc.add.particles(0, 0, "fx-burbuja", {
            lifespan: { min: 900, max: 1600 },
            speedY: { min: -70, max: -30 },
            speedX: { min: -16, max: 16 },
            scale: { start: 0.35, end: 0.75 },
            alpha: { start: 0.9, end: 0 },
            emitting: false
        });
        burbujasPez.setDepth(11);
        hojitas = sc.add.particles(0, 0, "fx-punto", {
            lifespan: { min: 700, max: 1200 },
            speed: { min: 20, max: 70 },
            angle: { min: 200, max: 340 },
            scale: { start: 1.1, end: 0 },
            tint: [0x8ce99a, 0xd3f9d8, 0x63e6be, 0xffffff],
            blendMode: ADD,
            emitting: false
        });
        hojitas.setDepth(9);
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

    function escalaPez() {
        return rec ? (rec.ancho * 1.0) / 230 : 0.45;
    }

    /** Punto en el mundo de una parte del pez dada en coordenadas del dibujo (sin flote). */
    function puntoDelPez(dx, dy) {
        var c = pez.cont;
        var a = c.rotation;
        var px = dx * c.scaleX, py = dy * c.scaleY;
        return { x: c.x + Math.cos(a) * px - Math.sin(a) * py, y: c.y + Math.sin(a) * px + Math.cos(a) * py };
    }

    var acumBurbuja = 0;

    function actualizarPez(t, dt) {
        if (!pez) return;
        var c = pez.cont;
        c.setVisible(pil.visible);
        if (!pil.visible) return;
        var s = escalaPez() * pez.extraEsc;
        // El pez mira hacia donde nada: si va hacia la izquierda da la vuelta (se angosta y se abre al otro lado,
        // como un pez de verdad) y se inclina hacia arriba o abajo sin quedar nunca de cabeza.
        var cA = Math.cos(pil.ang);
        if (cA < -0.5) pil.mira = 1;
        else if (cA > 0.5) pil.mira = 0;
        var yawObj = pil.mira * Math.PI;
        pil.yaw = lerp(pil.yaw, yawObj, Math.min(1, dt / 130));
        if (Math.abs(pil.yaw - yawObj) < 0.01) pil.yaw = yawObj;
        var ladoVis = pil.yaw > Math.PI / 2 ? 1 : 0;
        // ángulo relativo al lado que mira, recortado a ±70°
        var rel = pil.ang - Math.PI * ladoVis;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        rel = clamp(rel, -1.22, 1.22);
        if (ladoVis) rel = -rel;
        if (!pil.arrastrando && !pil.auto && t - pil.tUltimoMov > 500) rel *= 0.0;   // quieto: se endereza
        var dA = rel - pil.angVis;
        var giro = dA * Math.min(1, dt / 150);
        pil.angVis += giro;
        var cosY = Math.cos(pil.yaw);
        var banco = clamp(Math.abs(giro) / Math.max(1, dt) * 60, 0, 0.18);
        var flotaY = 0, flotaA = 0;
        if (!pil.arrastrando && pil.flotar && !reducido) {
            flotaY = Math.sin(t / 520) * rec.ancho * 0.07;
            flotaA = Math.sin(t / 700) * 0.06;
        }
        var alegria = pil.alegria > 0 ? Math.sin(t / 70) * 0.25 * pil.alegria : 0;
        var sac = pez.sacudir ? Math.sin(t / 22) * pez.sacudir : 0;
        c.x = pil.x + sac;
        c.y = pil.y + flotaY + pez.extraY - Math.abs(Math.sin(t / 140)) * pil.alegria * rec.ancho * 0.25;
        var dirX = cosY < 0 ? -1 : 1;
        c.rotation = (pil.angVis + flotaA + alegria) * dirX;
        c.scaleX = s * (Math.abs(cosY) < 0.06 ? (cosY < 0 ? -0.06 : 0.06) : cosY);
        c.scaleY = s * (1 - banco);
        // velocidad: cola y aleta se mueven más rápido al nadar
        var vmax = Number(cfgJ.velocidadMax) || 1400;
        var objetivo = pil.auto ? 0.7 : clamp(pil.vel / (vmax * 0.35), 0, 1);
        pil.empuje = lerp(pil.empuje, Math.max(0.15, objetivo), Math.min(1, dt / 160));
        var e = pil.empuje;
        pez.fase += dt * (0.008 + e * 0.022 + pil.alegria * 0.02);
        if (reducido) pez.fase = 0;
        pez.cola.rotation = Math.sin(pez.fase) * (0.26 + e * 0.16);
        pez.cola.scaleX = (1 - Math.abs(Math.sin(pez.fase)) * 0.18) / RES;
        pez.aleta.rotation = Math.sin(pez.fase * 0.8 + 1.2) * (0.35 + e * 0.15);
        pez.cuerpo.rotation = Math.sin(pez.fase + 1.5) * 0.03 * (0.5 + e);
        // halo: rojo durante la alerta; suave y cálido el resto del tiempo
        if (rojo > 0.02) {
            pez.halo.setTint(0xff4d6d);
            pez.halo.setAlpha(rojo * (0.55 + 0.25 * Math.sin(t / 90)));
        } else {
            pez.halo.setTint(0xfff3bf);
            pez.halo.setAlpha(0.1 + e * 0.12 + pil.alegria * 0.4);
        }
        // burbujas: de vez en cuando quieto (por la boca), más seguidas al nadar (por la cola)
        if (!reducido && burbujasPez) {
            acumBurbuja += dt / 1000 * (0.7 + e * 9);
            var nb = Math.floor(acumBurbuja);
            if (nb > 0) {
                acumBurbuja -= nb;
                var p = e > 0.3 ? puntoDelPez(-130, 0) : puntoDelPez(88, -8);
                for (var k = 0; k < nb; k++) burbujasPez.emitParticleAt(p.x + (Math.random() - 0.5) * 10, p.y + (Math.random() - 0.5) * 10, 1);
            }
        }
    }

    // ------------------------------------------------------------------ nado

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
            var vmax = Number(cfgJ.velocidadMax) || 1400;
            var res = R.mover(rec, pil, pil.objetivo, vmax * dt / 1000, cfgJ);
            pil.x = res.x;
            pil.y = res.y;
            pil.nodo = res.nodo;
            // corriente suave: fuera del camino el agua empuja al pez de vuelta hacia el centro
            if (res.zona !== "pista" && res.proy) {
                var kc = (Number(cfgJ.corrienteRegreso) || 0.06) * Math.min(1, dt / 16);
                pil.x = lerp(pil.x, res.proy.x, kc);
                pil.y = lerp(pil.y, res.proy.y, kc);
            }
            cambiarZona(res.zona);
            if (res.zona === "pista") pil.valido = { x: pil.x, y: pil.y, nodo: { rama: res.nodo.rama, i: res.nodo.i } };
            if (res.zona === "limite" && res.proy) {
                var lim = R.limites(rec, cfgJ);
                var dd = Math.hypot(pil.objetivo.x - res.proy.x, pil.objetivo.y - res.proy.y);
                if (dd > lim.fuera + rec.ancho * (Number(cfgJ.alejarseParaRegresar) || 1.4)) {
                    if (!pil.fueraDesde) pil.fueraDesde = t;
                    else if (t - pil.fueraDesde > (Number(cfgJ.msFueraParaRegresar) || 900)) {
                        pil.fueraDesde = 0;
                        emitir("desvio");
                    }
                } else pil.fueraDesde = 0;
            } else pil.fueraDesde = 0;
            if (res.nodo.rama < 0 && res.zona !== "limite" && res.nodo.i > pil.avance) {
                pil.avance = res.nodo.i;
                dibujarRastro();
                var fr = R.fraccion(rec, pil.avance);
                fondo.luzObj = fr * 0.6;
                emitir("avance", fr);
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
        // fuera del camino, el pez revienta las burbujas del borde por donde pasa
        if (pil.arrastrando && !pil.bloqueado && pil.zona !== "pista" && pil.visible) reventarCerca(pil.x, pil.y, rec.ancho * 0.42);
        var rojoObj = pil.zona === "pista" ? 0 : 1;
        rojo = lerp(rojo, rojoObj, Math.min(1, dt / 140));
        if (pistaRoja) pistaRoja.setAlpha(rojo * (0.82 + 0.18 * Math.sin(t / 110)));
        tenirBordes();
        if (pistaBrillo) {
            var pulso = pistaBrillo.getData("pulso") || 0;
            pistaBrillo.setAlpha(Math.max(0, pulso));
            if (pulso > 0) pistaBrillo.setData("pulso", Math.max(0, pulso - dt / 900));
        }
    }

    function tocaPez(x, y) {
        if (!rec || !pil.visible) return false;
        return Math.hypot(x - pil.x, y - pil.y) <= rec.ancho * 0.9;
    }

    function empezarArrastre(x, y) {
        pil.offset = { x: pil.x - x, y: pil.y - y };
        pil.objetivo = { x: pil.x, y: pil.y };
        pil.arrastrando = true;
        pil.fueraDesde = 0;
        sc.tweens.add({ targets: pez, extraEsc: 1.12, duration: 160, ease: "Back.easeOut" });
        onda(pil.x, pil.y, 0xffffff);
    }

    function moverObjetivo(x, y) {
        if (!pil.arrastrando) return;
        pil.objetivo = { x: x + pil.offset.x, y: y + pil.offset.y };
    }

    function soltar() {
        var estaba = pil.arrastrando;
        pil.arrastrando = false;
        pil.objetivo = null;
        if (pez) sc.tweens.add({ targets: pez, extraEsc: 1, duration: 200 });
        return estaba ? pil.zona : null;
    }

    /** Onda de agua (anillo que se expande). */
    function onda(x, y, color) {
        if (!sc || !rec) return;
        var o = sc.add.image(x, y, "fx-onda").setDepth(13).setTint(color || 0xffffff).setAlpha(0.8).setScale(rec.ancho * 0.4 / 128);
        sc.tweens.add({ targets: o, scale: rec.ancho * 1.6 / 128, alpha: 0, duration: 650, ease: "Quad.easeOut", onComplete: function () { o.destroy(); } });
    }

    function sacudir() {
        if (!pez) return Promise.resolve();
        pez.sacudir = rec ? rec.ancho * 0.08 : 6;
        return tw({ targets: pez, sacudir: 0, duration: 520, ease: "Quad.easeOut" });
    }

    function deslizarA(x, y, ms) {
        var x0 = pil.x, y0 = pil.y;
        pil.auto = true;
        return animar(ms, function (e) {
            if (Math.hypot(x - x0, y - y0) > 2) pil.ang = Math.atan2(y - y0, x - x0);
            pil.x = lerp(x0, x, e);
            pil.y = lerp(y0, y, e);
        }, suave).then(function () { pil.auto = false; });
    }

    /** Se alejó demasiado o soltó fuera: vibra y nada de vuelta al último punto válido (sin perder el avance). */
    async function regresar() {
        if (!rec) return;
        pil.bloqueado = true;
        pil.arrastrando = false;
        await sacudir();
        var v = pil.valido || { x: rec.inicio.x, y: rec.inicio.y, nodo: { rama: -1, i: 0 } };
        await deslizarA(v.x, v.y, 700);
        pil.nodo = { rama: v.nodo.rama, i: v.nodo.i };
        cambiarZona("pista");
        pil.bloqueado = false;
    }

    /** Desde el fondo de un callejón, el pez vuelve solo por el mismo camino hasta la bifurcación. */
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
        if (burbujasPez && !reducido) burbujasPez.emitParticleAt(p.x, p.y, 8);
    }

    // ------------------------------------------------------------------ ayudas

    /** Las próximas burbujas-guía del camino correcto parpadean, una tras otra (no revela todo). */
    function pistaLuces(cuantas) {
        if (!rec) return;
        var adelante = luces.filter(function (L) { return L.d.rama < 0 && L.d.i > pil.avance; })
            .sort(function (a, b) { return a.d.i - b.d.i; }).slice(0, cuantas || 5);
        adelante.forEach(function (L, k) {
            sc.time.delayedCall(k * 180, function () {
                if (!L.s.active) return;
                sc.tweens.add({ targets: L.glow, alpha: 0.9, scale: rec.ancho * 0.85 / 128, duration: 260, yoyo: true, repeat: 2 });
                sc.tweens.add({ targets: L.s, scale: L.tam * 1.7, duration: 260, yoyo: true, repeat: 2 });
                L.glow.setTint(0xffe066);
                sc.time.delayedCall(1700, function () { if (!L.on && L.glow.active) L.glow.setTint(0x99e9f2); });
            });
        });
    }

    /** Un rastro de burbujas doradas que recorre el camino principal (pista fuerte). */
    function burbujaGuia(desdeS, hastaS, ms) {
        if (!rec) return Promise.resolve();
        var st = guardar(sc.add.image(0, 0, "ico-burbuja"));
        st.setScale(rec.ancho * 0.5 / 100 / RES).setDepth(25).setTint(0xfff3bf);
        var halo = guardar(sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setTint(0xffe066).setDepth(24).setScale(rec.ancho * 1.2 / 128));
        var L = rec.largo;
        var d0 = desdeS == null ? 0 : desdeS;
        var d1 = hastaS == null ? L : Math.min(L, hastaS);
        var ultimo = 0;
        return animar(ms || 4000, function (e) {
            var p = R.puntoEn(rec, lerp(d0, d1, e));
            st.x = p.x;
            st.y = p.y;
            halo.x = p.x;
            halo.y = p.y;
            var ahora = performance.now();
            if (ahora - ultimo > 60 && !reducido) {
                ultimo = ahora;
                burbujasPez.emitParticleAt(p.x, p.y, 1);
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
            gravityY: -60,
            tint: COLORES_FIESTA,
            blendMode: ADD,
            emitting: false
        });
        e.setDepth(40);
        e.explode(n || 14);
        var b = sc.add.particles(x, y, "fx-burbuja", {
            speed: { min: 60 * (fuerza || 1), max: 200 * (fuerza || 1) },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 1 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 700, max: 1400 },
            gravityY: -120,
            emitting: false
        });
        b.setDepth(40);
        b.explode(Math.round((n || 14) * 0.8));
        sc.time.delayedCall(1700, function () { e.destroy(); b.destroy(); });
    }

    /** Recorrido completado: todas las burbujas-guía se encienden en ola, el camino brilla y el agua se ilumina. */
    async function celebrarRecorrido() {
        if (!rec) return;
        pulsoFondo(0.5);
        fondo.luzObj = 0.8;
        if (pistaBrillo) pistaBrillo.setData("pulso", 0.55);
        var orden = luces.slice().sort(function (a, b) {
            return Math.hypot(a.d.x - rec.inicio.x, a.d.y - rec.inicio.y) - Math.hypot(b.d.x - rec.inicio.x, b.d.y - rec.inicio.y);
        });
        orden.forEach(function (L, k) { sc.time.delayedCall(k * 18, function () { if (L.s.active) encenderLuz(L, true); }); });
        pil.avance = rec.principal.length - 1;
        dibujarRastro();
        if (coral) coral.extra = 1;
        pil.alegria = 1;
        chispasFiesta(coral ? coral.cx : rec.meta.x, (coral ? coral.cy : rec.meta.y) - rec.ancho * 0.6, 22, 1.2);
        await sleep(900);
        pil.alegria = 0;
    }

    /**
     * Al llegar: el pez da un saltito de alegría, nada hasta la cueva del coral y entra (pasa por detrás de las
     * ramas, sobre el interior), el coral se ilumina y suelta burbujas.
     * aviso(fase): "entra" | "dentro" (script.js pone los sonidos).
     */
    async function entrarCoral(aviso) {
        if (!rec || !pez || !coral) return;
        var av = typeof aviso === "function" ? aviso : function () {};
        pil.auto = true;
        var x0 = pil.x, y0 = pil.y;
        var antes = { x: coral.cx - rec.ancho * 0.9, y: coral.cy };
        pil.ang = Math.atan2(antes.y - y0, antes.x - x0);
        await animar(420, function (e) {
            pil.x = lerp(x0, antes.x, e);
            pil.y = lerp(y0, antes.y, e);
        }, suave);
        pil.ang = 0;
        av("entra");
        pez.cont.setDepth(4.6);
        burbujasPez.setDepth(4.5);
        var x1 = pil.x;
        await animar(950, function (e) {
            pil.x = lerp(x1, coral.cx + rec.ancho * 0.1, e);
            pez.extraEsc = lerp(1, 0.75, e);
            pez.cont.alpha = 1 - Math.max(0, e - 0.55) * 2;
        }, suave);
        pil.visible = false;
        pil.auto = false;
        pez.cont.alpha = 1;
        pez.extraEsc = 1;
        pez.cont.setDepth(12);
        burbujasPez.setDepth(11);
        av("dentro");
        coral.extra = 1;
        coral.img.setTint(0xfff0f6);
        sc.time.delayedCall(320, function () { if (coral && coral.img.active) coral.img.clearTint(); });
        onda(coral.cx, coral.cy, 0xffc9e3);
        if (burbujasPez && !reducido) burbujasPez.emitParticleAt(coral.cx, coral.cy - rec.ancho * 0.6, 12);
        chispasEn(coral.cx, coral.cy - rec.ancho, 14);
    }

    function chispasEn(x, y, n) {
        if (!chispas || reducido) return;
        chispas.emitParticleAt(x, y, n || 8);
    }

    /** Entre recorridos: una corriente de burbujas sube por toda la pantalla y el agua se aclara. */
    async function corriente(ms) {
        if (!sc || reducido) { await sleep(300); return; }
        var v = vista();
        var ancho = sc.scale.width / v.z, alto = sc.scale.height / v.z;
        var lista = [];
        for (var i = 0; i < 46; i++) {
            var b = sc.add.image(v.x0 + Math.random() * ancho, v.y0 + alto + 40 + Math.random() * 200, "ico-burbuja");
            var tam = 20 + Math.random() * 60;
            b.setScale(tam / 100 / RES).setDepth(50).setAlpha(0.9);
            sc.tweens.add({ targets: b, y: v.y0 - 120 - Math.random() * 200, x: b.x + (Math.random() - 0.5) * 160, duration: (ms || 1200) * (0.7 + Math.random() * 0.5), delay: Math.random() * 300, ease: "Quad.easeIn" });
            lista.push(b);
        }
        pulsoFondo(0.4);
        await sleep((ms || 1200) + 450);
        lista.forEach(function (b) { b.destroy(); });
    }

    /** El pez entra nadando desde la izquierda hasta la concha de salida. */
    async function llegarInicio() {
        if (!rec || !pez) return;
        var x1 = rec.inicio.x, y1 = rec.inicio.y;
        var x0 = x1 - Math.max(320, rec.ancho * 4), y0 = y1 - rec.ancho * 0.8;
        pil.x = x0;
        pil.y = y0;
        pil.ang = 0;
        pil.angVis = 0;
        pil.mira = pil.miraPrev = pil.miraVis = 0;
        pil.yaw = 0;
        pil.visible = true;
        pil.auto = true;
        pez.cont.setDepth(12);
        pez.cont.alpha = 1;
        var prev = { x: x0, y: y0 };
        await animar(1200, function (e) {
            var x = lerp(x0, x1, e);
            var y = lerp(y0, y1, e) - Math.sin(e * Math.PI) * rec.ancho * 0.4;
            pil.ang = Math.atan2(y - prev.y, x - prev.x);
            prev = { x: x, y: y };
            pil.x = x;
            pil.y = y;
        }, function (u) { return 1 - Math.pow(1 - u, 3); });
        pil.x = x1;
        pil.y = y1;
        pil.ang = 0;
        pil.auto = false;
        pil.tUltimoMov = performance.now();
        onda(x1, y1, 0xc5f6fa);
    }

    // ------------------------------------------------------------------ escena final

    /**
     * El regreso a casa: el camino se ilumina, aparece el gran arrecife, el pez nada hasta él con la cámara
     * detrás, se acomoda en la anémona junto a sus amigos y el fondo se ilumina poco a poco.
     */
    async function finalCinematica() {
        if (!rec || !pez) return;
        camLibre = true;
        pil.bloqueado = true;
        pil.arrastrando = false;
        await celebrarRecorrido();
        var cam = sc.cameras.main;
        var bx = rec.W + 760, by = rec.H * 0.55;
        var esc = 1.5;
        var halo = sc.add.image(bx, by - 60 * esc, "fx-halo").setBlendMode(ADD).setTint(0xffd8a8).setDepth(5).setScale(8).setAlpha(0.15);
        var cuerpo = sc.add.image(bx, by, "ico-arrecife").setScale(esc / RES).setDepth(6);
        var nido = { x: bx, y: by + (225 - 180) * esc };
        var amigos = [];
        // amigos del arrecife: una especie distinta cada uno (el pececito va teñido)
        var especiesAmigas = ["pezCirujano", "pezAngel", "pezGlobo", "pezMariposa", "pececito", "pezCirujano"];
        for (var i = 0; i < 6; i++) {
            var espA = especiesAmigas[i];
            var oa = origen(I.SVG[espA]);
            var a = sc.add.image(bx + (i - 2.5) * 110, by - 120 - (i % 2) * 70, "ico-" + espA).setDepth(7);
            a.setScale(92 / oa.w / RES).setFlipX(i % 2 === 1);
            if (espA === "pececito") a.setTint(COLORES_AMIGOS[i]);
            amigos.push(a);
        }
        base = { cuerpo: cuerpo, halo: halo, amigos: amigos, nido: nido, esc: esc };
        // nado con curva Bézier: sube, cruza y baja sobre la anémona
        var z0 = cam.zoom;
        var v0 = vista();
        var c0 = { x: v0.x0 + cam.width / z0 / 2, y: v0.y0 + cam.height / z0 / 2 };
        var P0 = { x: pil.x, y: pil.y };
        var P3 = { x: nido.x, y: nido.y - 40 };
        var C1 = { x: P0.x + 300, y: P0.y - 320 };
        var C2 = { x: P3.x - 420, y: P3.y - 260 };
        var bez = function (u) {
            var q = 1 - u;
            return {
                x: q * q * q * P0.x + 3 * q * q * u * C1.x + 3 * q * u * u * C2.x + u * u * u * P3.x,
                y: q * q * q * P0.y + 3 * q * q * u * C1.y + 3 * q * u * u * C2.y + u * u * u * P3.y
            };
        };
        var zFin = Math.min(z0 * 1.3, (cam.height * 0.82) / 640);
        var finCam = { x: bx, y: by - 70 };
        pil.visible = true;
        pez.cont.setDepth(8);
        pil.auto = true;
        var previo = bez(0);
        await animar(reducido ? 300 : 3800, function (e, u) {
            var p = bez(e);
            pil.x = p.x;
            pil.y = p.y;
            if (Math.hypot(p.x - previo.x, p.y - previo.y) > 0.5) pil.ang = Math.atan2(p.y - previo.y, p.x - previo.x);
            previo = p;
            // el pez protagonista crece hasta verse más grande que sus amigos del arrecife
            pez.extraEsc = lerp(1, 2.1, e);
            var k = suave(u);
            var cx = lerp(lerp(c0.x, p.x, Math.min(1, u * 2.2)), finCam.x, k * k);
            var cy = lerp(lerp(c0.y, p.y, Math.min(1, u * 2.2)), finCam.y, k * k);
            cam.setZoom(lerp(z0, zFin, k));
            cam.centerOn(cx, cy);
            halo.setAlpha(0.15 + u * 0.35);
        }, suave);
        // se acomoda en la anémona; los amigos se acercan nadando
        pil.ang = 0;
        await deslizarA(nido.x, nido.y - 10, 700);
        pil.auto = true;
        pil.ang = 0;
        amigos.forEach(function (a, i) {
            var ang = (i / amigos.length) * Math.PI * 2;
            var tx = nido.x + Math.cos(ang) * 190, ty = nido.y - 70 + Math.sin(ang) * 90;
            a.setFlipX(tx > nido.x);
            sc.tweens.add({ targets: a, x: tx, y: ty, duration: 1100, ease: "Sine.easeInOut", delay: i * 90 });
            if (!reducido) sc.tweens.add({ targets: a, y: ty - 14, duration: 900 + i * 80, yoyo: true, repeat: -1, delay: 1300, ease: "Sine.easeInOut" });
        });
        // el fondo se ilumina poco a poco
        fondo.luzObj = 1;
        await animar(1400, function (e) {
            halo.setAlpha(0.5 + e * 0.35);
            halo.setScale(8 + e * 3);
        }, suave);
        pil.alegria = 1;
    }

    /** Celebración del final: burbujas, estrellas y destellos alrededor del arrecife. */
    function fuegos(n) {
        if (!sc || !base) return;
        for (var i = 0; i < (n || 3); i++) {
            (function (k) {
                sc.time.delayedCall(k * 260, function () {
                    var x = base.cuerpo.x + (Math.random() - 0.5) * 760;
                    var y = base.cuerpo.y - 220 - Math.random() * 220;
                    chispasFiesta(x, y, 24, 1.2);
                    var anillo = sc.add.image(x, y, "fx-onda").setTint(COLORES_FIESTA[k % COLORES_FIESTA.length]).setDepth(39).setScale(0.3);
                    sc.tweens.add({ targets: anillo, scale: 2.6, alpha: 0, duration: 900, onComplete: function () { anillo.destroy(); } });
                });
            })(i);
        }
    }

    function reiniciarVista() {
        if (base) {
            sc.tweens.killTweensOf(base.amigos);
            base.cuerpo.destroy();
            base.halo.destroy();
            base.amigos.forEach(function (a) { a.destroy(); });
            base = null;
        }
        camLibre = false;
        pil.visible = false;
        pil.alegria = 0;
        fondo.luzObj = 0;
        if (pez) {
            pez.cont.setDepth(12);
            pez.extraEsc = 1;
        }
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
        g.addColorStop(0, "#62d4f2");
        g.addColorStop(1, "#13649e");
        x.fillStyle = g;
        x.fillRect(0, 0, ancho, alto);
        var e = Math.min(ancho / r.W, alto / r.H) * 0.92;
        x.save();
        x.translate((ancho - r.W * e) / 2, (alto - r.H * e) / 2);
        var mini = canvasPista(r, PALETA.normal, e, true);
        x.drawImage(mini, 0, 0, mini.width, mini.height);
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
        x.fillStyle = "#ff922b";
        x.beginPath();
        x.arc(r.inicio.x * e, r.inicio.y * e, Math.max(4, r.ancho * e * 0.4), 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "#f06595";
        x.beginPath();
        x.arc(r.meta.x * e, r.meta.y * e, Math.max(5, r.ancho * e * 0.5), 0, Math.PI * 2);
        x.fill();
        x.restore();
        return c.toDataURL("image/png");
    }

    // ------------------------------------------------------------------ puntos de pantalla

    function puntoPez() { return aPantalla(pil.x, pil.y); }
    function puntoInicio() { return rec ? aPantalla(rec.inicio.x, rec.inicio.y) : null; }
    function puntoMeta() { return rec ? aPantalla(rec.meta.x, rec.meta.y) : null; }
    function anchoPistaPantalla() { return rec ? rec.ancho * sc.cameras.main.zoom : 60; }

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
        cfgJ = (config && config.juego) || {};
        if (!Phaser || !I || !R) {
            console.warn("[EscenarioPez] falta Phaser, IconosPez o ReglasPez");
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        listoPromesa = new Promise(function (resolve) {
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: el,
                backgroundColor: "#0b3d6b",
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
                            crearPez();
                            dims = dimensionesMundo();
                            reacomodar();
                            sc.scale.on("resize", reacomodar);
                            // El nado corre con su propio reloj (setTimeout): no depende de que el navegador pinte.
                            var tPrev = performance.now();
                            var nado = function () {
                                var ahora = performance.now();
                                actualizarPiloto(ahora, Math.min(ahora - tPrev, 50));
                                tPrev = ahora;
                                setTimeout(nado, 16);
                            };
                            nado();
                            sc.events.on("update", function (t, dt) {
                                var d = Math.min(dt, 50);
                                actualizarPez(performance.now(), d);
                                actualizarFondo(t, d);
                            });
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__escenarioPez = juego;
        });
        return listoPromesa;
    }

    global.EscenarioPez = {
        montar: montar,
        listo: function () { return !!(sc && pez); },
        escena: function () { return sc; },
        on: function (mapa) { Object.keys(mapa || {}).forEach(function (k) { ev[k] = mapa[k]; }); },
        reacomodar: reacomodar,
        dimensionesMundo: dimensionesMundo,
        recorrido: function () { return rec; },
        piloto: function () { return pil; },
        cargarRecorrido: cargarRecorrido,
        ocultarRecorrido: ocultarRecorrido,
        tocaPez: tocaPez,
        empezarArrastre: empezarArrastre,
        moverObjetivo: moverObjetivo,
        soltar: soltar,
        bloquear: function (on) { pil.bloqueado = !!on; if (on) pil.arrastrando = false; },
        mostrarPez: function (on) { pil.visible = !!on; },
        regresar: regresar,
        regresarCallejon: regresarCallejon,
        senalCallejon: senalCallejon,
        sacudir: sacudir,
        onda: onda,
        pistaLuces: pistaLuces,
        burbujaGuia: burbujaGuia,
        celebrarRecorrido: celebrarRecorrido,
        burbujas: function () { return { total: bordes.lista.length, reventadas: bordes.reventadas }; },
        entrarCoral: entrarCoral,
        corriente: corriente,
        llegarInicio: llegarInicio,
        pulsoFondo: pulsoFondo,
        chispas: chispasFiesta,
        finalCinematica: finalCinematica,
        fuegos: fuegos,
        reiniciarVista: reiniciarVista,
        miniatura: miniatura,
        aPantalla: aPantalla,
        mundoDePantalla: mundoDePantalla,
        mundoDeJuego: mundoDeJuego,
        puntoPez: puntoPez,
        puntoInicio: puntoInicio,
        puntoMeta: puntoMeta,
        anchoPistaPantalla: anchoPistaPantalla,
        zonaZoe: zonaZoe
    };
})(window);
