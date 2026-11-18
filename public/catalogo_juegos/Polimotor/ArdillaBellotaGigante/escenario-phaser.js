/**
 * EscenarioArdilla — escena Phaser 4 de "La Ardilla y la Bellota Gigante" (window.EscenarioArdilla).
 *
 * Un solo lienzo a pantalla completa detrás de la interfaz. La cámara encaja el mundo (ancho fijo, alto según la
 * pantalla) en el hueco que dejan la cabecera y la fila de abajo. Dibuja:
 *   - el bosque de otoño: pasto, manchas de sol que se mueven, rayos de luz cálidos, árboles rojos, naranjas y
 *     amarillos detrás de la cerca de madera (las copas se mecen), hojas que caen, flores y arbustos que se doblan
 *     cuando pasa la bellota y hojas secas en el suelo que salen volando a su paso;
 *   - los dos caminos de tierra (canvas 2D, una vez por recorrido; iguales: nada distingue el despejado del que
 *     tiene obstáculos) y su copia roja, que aparece poco a poco cuando la bellota se sale;
 *   - hojitas brillantes sobre los caminos que se encienden al pasar y una estela de luz del avance;
 *   - obstáculos (tronco, piedras, ramas, hongos, arbustos) que tiemblan cuando la bellota se acerca;
 *   - la ardilla por piezas (cola, cuerpo, cabeza, párpados): espera, mueve la cola, parpadea, gira la cabeza,
 *     acompaña a la bellota dando saltitos y celebra;
 *   - la bellota gigante (flota, se inclina al moverse y suelta hojitas y destellos) y la cesta que brilla;
 *   - el final: el árbol con la casa de la ardilla, la cesta con las cuatro bellotas y la ardilla que entra.
 *
 * El arrastre usa ReglasArdilla.mover (geometría pura). Eventos para script.js:
 *   on({ zona, avance, hoja, meta, desvio, mueve, obstaculo })
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var I = global.IconosArdilla;
    var R = global.ReglasArdilla;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2;
    var ADD = "ADD";
    var COLORES_HOJA = [0xe03131, 0xf76707, 0xfab005, 0xfd7e14, 0xc92a2a, 0xffd43b, 0xe8590c];
    var COLORES_FIESTA = [0xffe066, 0xff922b, 0xff6b6b, 0xfab005, 0xffffff, 0xa9e34b];
    var COPAS = ["copaRoja", "copaNaranja", "copaAmarilla"];

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
    var pistaImg = null, pistaRoja = null, rastroG = null, flecha = null;
    var luces = [];
    var obstaculos = [];       // { d, s, base, esc, tCerca, temblor }
    var decor = [];            // flores, arbustos y hierbas que se doblan
    var hojasSuelo = [];       // hojas secas que salen volando
    var cesta = null;          // { atras, frente, halo, x, y, brillo, extra, meta }
    var rojo = 0;

    var fondo = { pasto: null, manchas: [], rayos: [], copas: [], cercas: [], caen: [], velo: null, luz: 0, luzObj: 0 };
    var ardilla = null;        // { cont, cola, cuerpo, cabeza, cabezaImg, parpados, x, y, salto, mira, ... }
    var bellota = null;        // { cont, img, sombra, extraEsc }
    var chispas = null, hojitas = null;
    var base = null;           // escena final

    var pil = {
        x: 0, y: 0, valido: null, avance: 0, maxS: [0, 0], zona: "pista",
        arrastrando: false, bloqueado: true, objetivo: null, offset: { x: 0, y: 0 },
        fueraDesde: 0, enMeta: false, vel: 0, vx: 0, empuje: 0, visible: false,
        tUltimoMov: 0, auto: false, rastro: [], enArdilla: false, dProy: 0, atascoDesde: 0, atasco: -1
    };

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function suave(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }

    function emitir(nombre) {
        var f = ev[nombre];
        if (typeof f === "function") {
            try { f.apply(null, [].slice.call(arguments, 1)); } catch (e) { console.warn("[EscenarioArdilla]", nombre, e); }
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

    /** Anima un valor de 0 a 1 llamando a paso(e, u); avanza con setTimeout aunque Phaser no pinte. */
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
                console.warn("[EscenarioArdilla] no se pudo dibujar", clave);
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
        texturaCanvas("fx-onda", 128, 128, function (ctx, s) {
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2);
            ctx.lineWidth = 7;
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#fff";
            ctx.stroke();
        });
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
        texturaCanvas("fx-blanco", 8, 8, function (ctx, w, h) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
        });
        texturaCanvas("fx-sombra", 128, 64, function (ctx, w, h) {
            var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            g.addColorStop(0, "rgba(40,20,0,0.45)");
            g.addColorStop(1, "rgba(40,20,0,0)");
            ctx.fillStyle = g;
            ctx.save();
            ctx.scale(1, h / w);
            ctx.fillRect(0, 0, w, w);
            ctx.restore();
        });
        // pasto: verde con manchas y briznas (se repite como mosaico)
        texturaCanvas("fx-pasto", 256, 256, function (ctx, w, h) {
            ctx.fillStyle = "#7cc24a";
            ctx.fillRect(0, 0, w, h);
            var r = R.azar(77);
            for (var i = 0; i < 26; i++) {
                ctx.fillStyle = r() < 0.5 ? "rgba(95,170,55,0.55)" : "rgba(150,210,90,0.45)";
                ctx.beginPath();
                ctx.ellipse(r() * w, r() * h, r.entre(10, 30), r.entre(6, 16), r() * 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.strokeStyle = "rgba(60,130,40,0.6)";
            ctx.lineWidth = 2;
            for (var k = 0; k < 90; k++) {
                var x = r() * w, y = r() * h;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + r.entre(-3, 3), y - r.entre(5, 10));
                ctx.stroke();
            }
        });
        // flecha de regreso (blanca con borde naranja; señala hacia el camino)
        texturaCanvas("fx-flecha", 128, 96, function (ctx) {
            ctx.translate(64, 48);
            ctx.beginPath();
            ctx.moveTo(52, 0);
            ctx.lineTo(4, -38);
            ctx.lineTo(4, -16);
            ctx.lineTo(-52, -16);
            ctx.lineTo(-52, 16);
            ctx.lineTo(4, 16);
            ctx.lineTo(4, 38);
            ctx.closePath();
            ctx.lineJoin = "round";
            ctx.lineWidth = 9;
            ctx.strokeStyle = "#d9480f";
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.fill();
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

    /** Del puntero de Phaser (coordenadas del juego) al mundo con la vista actual (sin camera.getWorldPoint). */
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

    // ------------------------------------------------------------------ bosque de fondo (permanente)

    function arbol(x, y, alto, copaClave, prof) {
        var oT = origen(I.SVG.arbolTronco), oC = origen(I.SVG[copaClave]);
        var tronco = sc.add.image(x, y, "ico-arbolTronco").setOrigin(0.5, 1).setDepth(prof);
        tronco.setScale(alto * 0.62 / oT.h / RES);
        var copa = sc.add.image(x, y - alto * 0.5, "ico-" + copaClave).setOrigin(0.5, 0.8).setDepth(prof + 0.1);
        copa.setScale(alto * 0.75 / oC.w / RES);
        return { tronco: tronco, copa: copa, f: Math.random() * 6.28, v: 0.6 + Math.random() * 0.6, x: x, y: y, alto: alto };
    }

    function crearFondo() {
        sc.cameras.main.setBackgroundColor("#6fb43f");
        var r = R.azar(R.semillaNueva());
        if (sc.add.tileSprite) {
            fondo.pasto = sc.add.tileSprite(0, 0, 4000, 3000, "fx-pasto").setOrigin(0, 0).setDepth(-100);
        } else {
            fondo.pasto = sc.add.image(0, 0, "fx-pasto").setOrigin(0, 0).setDepth(-100);
        }
        // manchas de sol que se mueven despacio (luz entre las hojas)
        for (var i = 0; i < 7; i++) {
            var m = sc.add.image(r.entre(0, 1600), r.entre(0, 900), "fx-nube").setBlendMode(ADD).setDepth(-96);
            m.setScale(r.entre(2.2, 3.6)).setTint(i % 2 ? 0xfff3bf : 0xffe8a3).setAlpha(0.22);
            fondo.manchas.push({ s: m, bx: m.x, by: m.y, f: r() * 6.28, v: r.entre(0.5, 1) });
        }
        // rayos cálidos desde arriba a la izquierda
        for (var k = 0; k < 4; k++) {
            var ray = sc.add.image(0, 0, "fx-rayo").setOrigin(0.5, 0).setBlendMode(ADD).setDepth(40).setTint(0xffe8a3);
            ray.setAlpha(0.08);
            ray.setData("base", 0.06 + (k % 2) * 0.03);
            ray.setData("f", r() * 6.28);
            fondo.rayos.push(ray);
        }
        // velo para teñir la escena (rojo suave en la alerta)
        fondo.velo = sc.add.image(0, 0, "fx-blanco").setOrigin(0, 0).setDepth(39).setTint(0xff6b6b).setAlpha(0);
        // copas de árbol detrás de la cerca de arriba y árboles en los costados (se ven en pantallas anchas)
        for (var c = 0; c < 14; c++) {
            var a = arbol(0, 0, r.entre(300, 380), COPAS[c % 3], -92);
            a.u = c / 14 + r.entre(0, 0.03);
            a.fila = "arriba";
            fondo.copas.push(a);
        }
        for (var s = 0; s < 8; s++) {
            var b = arbol(0, 0, r.entre(380, 520), COPAS[(s + 1) % 3], -90);
            b.lado = s % 2 ? 1 : -1;
            b.u = Math.floor(s / 2) / 4 + r.entre(0.02, 0.12);
            b.fila = "lado";
            fondo.copas.push(b);
        }
        // cercas de madera arriba y abajo
        for (var q = 0; q < 50; q++) {
            fondo.cercas.push({ s: sc.add.image(0, 0, "ico-cerca").setOrigin(0, 1).setDepth(-88), fila: "arriba", k: q });
            fondo.cercas.push({ s: sc.add.image(0, 0, "ico-cerca").setOrigin(0, 1).setDepth(-20), fila: "abajo", k: q });
        }
        // hojas que caen de los árboles
        for (var h = 0; h < 16; h++) {
            var hj = sc.add.image(r.entre(-100, 1700), r.entre(-200, 900), "ico-hoja").setDepth(38);
            hj.setTint(COLORES_HOJA[h % COLORES_HOJA.length]).setScale(r.entre(0.35, 0.6) / RES * 1.6);
            fondo.caen.push({ s: hj, x: hj.x, y: hj.y, v: r.entre(30, 70), f: r() * 6.28, giro: r.entre(-2, 2), sop: 0 });
        }
        ajustarFondo();
    }

    function ajustarFondo() {
        if (!fondo.pasto) return;
        var W = dims.W, H = dims.H;
        var extra = 2600;
        fondo.pasto.setPosition(-extra, -1600);
        if (fondo.pasto.setSize) fondo.pasto.setSize(W + extra * 2 + 2000, H + 3400);
        fondo.velo.setPosition(-extra, -1600).setDisplaySize(W + extra * 2 + 2000, H + 3400);
        fondo.rayos.forEach(function (ray, k) {
            ray.x = W * (0.05 + k * 0.17);
            ray.y = -60;
            ray.setRotation(-0.5 + k * 0.05);
            ray.setDisplaySize(W * 0.14, H * 1.3);
        });
        fondo.copas.forEach(function (a) {
            if (a.fila === "rec" || a.fila === "casa") return;
            var x, y;
            if (a.fila === "arriba") {
                x = -200 + a.u * (W + 400);
                y = 110;
            } else {
                x = a.lado < 0 ? -150 - (a.u * 3 % 1) * 120 : W + 150 + (a.u * 3 % 1) * 120;
                y = 150 + a.u * (H + 200);
            }
            a.x = x;
            a.y = y;
            a.tronco.setPosition(x, y);
            a.copa.setPosition(x, y - a.alto * 0.5);
            if (a.fila === "lado") {
                a.tronco.setDepth(-90 + a.u);
                a.copa.setDepth(-89.9 + a.u);
            }
        });
        var anchoCerca = 110;
        fondo.cercas.forEach(function (c) {
            // de -600 hasta el claro de la casa de la ardilla (escena final, a la derecha del bosque)
            var k = (W + 3200) / (anchoCerca * 50);
            c.s.x = -600 + c.k * anchoCerca * k;
            c.s.y = c.fila === "arriba" ? 108 : H + 18;
            c.s.setDisplaySize(anchoCerca * k + 2, 60);
        });
    }

    function actualizarFondo(t, dt) {
        var s = dt / 1000;
        var hay = pil.visible && !reducido;
        var W = dims.W, H = dims.H;
        fondo.luz = lerp(fondo.luz, fondo.luzObj, Math.min(1, dt / 700));
        fondo.velo.setAlpha(rojo * 0.1);
        for (var k = 0; k < fondo.rayos.length; k++) {
            var ray = fondo.rayos[k];
            var a = ray.getData("base") * (0.7 + 0.3 * Math.sin(t * 0.0005 + ray.getData("f")));
            ray.setAlpha(clamp(a + fondo.luz * 0.12, 0, 0.35));
            if (!reducido) ray.rotation = -0.5 + k * 0.05 + Math.sin(t * 0.0003 + k) * 0.03;
        }
        for (var m = 0; m < fondo.manchas.length; m++) {
            var mo = fondo.manchas[m];
            mo.s.x = mo.bx + (reducido ? 0 : Math.sin(t * 0.00012 * mo.v + mo.f) * 90);
            mo.s.y = mo.by + (reducido ? 0 : Math.cos(t * 0.0001 * mo.v + mo.f) * 50);
            mo.s.setAlpha(0.16 + 0.08 * Math.sin(t * 0.0006 + mo.f) + fondo.luz * 0.12);
        }
        // las copas se mecen con el viento
        for (var c = 0; c < fondo.copas.length; c++) {
            var cp = fondo.copas[c];
            cp.copa.rotation = reducido ? 0 : Math.sin(t * 0.0007 * cp.v + cp.f) * 0.035;
        }
        // hojas que caen, con vaivén; las que pasan cerca de la bellota se arremolinan
        for (var h = 0; h < fondo.caen.length; h++) {
            var hj = fondo.caen[h];
            if (!reducido) {
                hj.y += hj.v * s;
                hj.x += Math.sin(t * 0.0012 + hj.f) * 22 * s + 8 * s;
                if (hj.y > H + 80) { hj.y = -60 - Math.random() * 300; hj.x = Math.random() * (W + 200) - 100; }
            }
            var ox = 0;
            if (hay) {
                var dx = hj.x - pil.x, dy = hj.y - pil.y, d = Math.hypot(dx, dy);
                var rr = rec ? rec.ancho * 1.5 : 150;
                if (d < rr && d > 0.1) ox = dx / d * (1 - d / rr) * rr * 0.7;
            }
            hj.sop = lerp(hj.sop, ox, 0.08);
            hj.s.x = hj.x + Math.sin(t * 0.002 + hj.f) * 12 + hj.sop;
            hj.s.y = hj.y;
            hj.s.rotation = reducido ? 0 : Math.sin(t * 0.0018 + hj.f) * 0.9 + hj.giro * t * 0.0002;
        }
        // flores, arbustos y hierbas: se mecen y se doblan cuando pasa la bellota
        for (var d2 = 0; d2 < decor.length; d2++) {
            var o = decor[d2];
            if (!o.s.active) continue;
            var emp = 0;
            if (hay) {
                var qx = o.x - pil.x, qy = o.y - o.alto * 0.4 - pil.y, qd = Math.hypot(qx, qy);
                if (qd < o.radio) {
                    emp = (qx >= 0 ? 1 : -1) * (1 - qd / o.radio);
                    if (Math.abs(emp) > 0.35 && Math.random() < 0.04 && hojitas) hojitas.emitParticleAt(o.x, o.y - o.alto * 0.6, 1);
                }
            }
            o.k = lerp(o.k, emp, 0.08);
            if (o.tipo === "arbusto") {
                o.s.setScale(o.esc * (1 + Math.sin(t * 0.0016 + o.f) * 0.025 + Math.abs(o.k) * 0.06), o.esc * (1 + Math.cos(t * 0.0016 + o.f) * 0.025));
                o.s.rotation = o.k * 0.12;
            } else {
                o.s.rotation = (reducido ? 0 : Math.sin(t * 0.0014 * o.v + o.f) * 0.1) + o.k * 0.5;
            }
        }
        // hojas secas del suelo: salen volando y giran al paso de la bellota, luego se asientan
        for (var q = 0; q < hojasSuelo.length; q++) {
            var hs = hojasSuelo[q];
            if (!hs.s.active) continue;
            if (hay && rec) {
                var ex = hs.x - pil.x, ey = hs.y - pil.y, ed = Math.hypot(ex, ey);
                var rad = rec.ancho * 0.55;
                if (ed < rad && ed > 0.1 && hs.vx * hs.vx + hs.vy * hs.vy < 400) {
                    var fz = (1 - ed / rad) * 520;
                    hs.vx += ex / ed * fz;
                    hs.vy += ey / ed * fz;
                    hs.vr = (Math.random() - 0.5) * 14;
                    hs.alto = 1;
                    if (Math.random() < 0.3) emitir("hojasSuelo");
                }
            }
            hs.x += hs.vx * s;
            hs.y += hs.vy * s;
            hs.vx *= Math.pow(0.04, s);
            hs.vy *= Math.pow(0.04, s);
            hs.alto = Math.max(0, hs.alto - s * 1.6);
            hs.s.rotation += hs.vr * s;
            hs.vr *= Math.pow(0.1, s);
            hs.s.x = hs.x;
            hs.s.y = hs.y - hs.alto * 14;
            hs.s.setScale(hs.esc * (1 + hs.alto * 0.25));
        }
        // obstáculos: tiemblan un poco cuando la bellota se acerca
        for (var b = 0; b < obstaculos.length; b++) {
            var ob = obstaculos[b];
            ob.temblor = Math.max(0, ob.temblor - dt / 700);
            ob.s.rotation = ob.rot + (reducido ? 0 : Math.sin(t / 45) * 0.06 * ob.temblor);
            ob.s.setScale(ob.esc * (1 + ob.temblor * 0.06), ob.esc * (1 - ob.temblor * 0.04));
            ob.halo.setAlpha(ob.temblor * 0.45);
        }
        // la cesta brilla más a medida que la bellota se acerca
        if (cesta && rec) {
            var dm = Math.hypot(pil.x - cesta.x, pil.y - cesta.y);
            var cerca = pil.visible ? clamp(1 - dm / (rec.ancho * 5), 0, 1) : 0;
            cesta.brillo = lerp(cesta.brillo, Math.max(cerca, cesta.extra), 0.06);
            cesta.halo.setAlpha(0.12 + cesta.brillo * 0.6 + Math.sin(t * 0.004) * 0.05 * cesta.brillo);
            cesta.halo.setScale(cesta.haloEsc * (1 + cesta.brillo * 0.3));
            if (cesta.extra > 0) cesta.extra = Math.max(0, cesta.extra - dt / 2500);
        }
    }

    function pulsoFondo(fuerza) {
        fondo.luz = Math.min(1, fondo.luz + (fuerza || 0.2));
    }

    // ------------------------------------------------------------------ caminos de tierra

    var PALETA = {
        normal: { sombra: "rgba(50,30,5,0.45)", borde: "#8a5a2b", tierra: "#d9a463", claro: "#e8c38a", piedritas: ["#b07f45", "#f3dcb0", "#9c6b38"] },
        roja: { sombra: "rgba(80,0,0,0.4)", borde: "#e03131", tierra: "#f2a594", claro: "#f8c9bd", piedritas: ["#e8796b", "#fff0eb", "#c94a3c"] }
    };

    function canvasPista(r, pal, escala, sinSombra) {
        var k = escala || 1;
        var c = document.createElement("canvas");
        c.width = Math.ceil(r.W * k);
        c.height = Math.ceil(r.H * k);
        var x = c.getContext("2d");
        x.scale(k, k);
        x.lineCap = "round";
        x.lineJoin = "round";
        var w = r.ancho;
        var trazo = function (ancho, color, dy, alpha) {
            x.save();
            x.translate(0, dy || 0);
            x.strokeStyle = color;
            x.lineWidth = ancho;
            x.globalAlpha = alpha == null ? 1 : alpha;
            r.rutas.forEach(function (ruta) {
                var pts = ruta.pts;
                x.beginPath();
                x.moveTo(pts[0].x, pts[0].y);
                for (var i = 1; i < pts.length; i++) x.lineTo(pts[i].x, pts[i].y);
                x.stroke();
            });
            x.restore();
        };
        if (!sinSombra) trazo(w + 18, pal.sombra, 10, 0.5);
        trazo(w + 14, pal.borde, 0);
        trazo(w - 2, pal.tierra, 0);
        trazo(w * 0.55, pal.claro, 0, 0.75);
        // piedritas y huellas de tierra (fijas para cada recorrido)
        var rnd = R.azar((r.semilla ^ 0x2f6b) >>> 0);
        r.rutas.forEach(function (ruta) {
            for (var i = 0; i < ruta.pts.length; i += 3) {
                if (rnd() > 0.55) continue;
                var p = ruta.pts[i];
                var ang = rnd() * Math.PI * 2, dist = rnd() * w * 0.42;
                x.fillStyle = pal.piedritas[Math.floor(rnd() * 3)];
                x.globalAlpha = 0.75;
                x.beginPath();
                x.ellipse(p.x + Math.cos(ang) * dist, p.y + Math.sin(ang) * dist, rnd.entre(2, 5), rnd.entre(1.5, 3.5), rnd() * 3, 0, Math.PI * 2);
                x.fill();
            }
        });
        x.globalAlpha = 1;
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
        obstaculos = [];
        decor = [];
        hojasSuelo = [];
        pistaImg = pistaRoja = rastroG = flecha = null;
        cesta = null;
        ["pista-n", "pista-r"].forEach(function (k) { if (sc.textures.exists(k)) sc.textures.remove(k); });
    }

    function guardar(o) {
        objRec.push(o);
        return o;
    }

    /** Distancia del punto al camino más cercano (en unidades del mundo). */
    function distCamino(r, x, y) {
        return R.proyectar(r, x, y).d;
    }

    /** Flores, arbustos, hierbas, hongos y árboles en los espacios libres (nunca encima de los caminos). */
    function decorar(r) {
        var rnd = R.azar((r.semilla ^ 0x5bd1e995) >>> 0);
        var w = r.ancho;
        var puestos = [];
        var libre = function (x, y, rad) {
            if (distCamino(r, x, y) < w * 0.62 + rad) return false;
            if (Math.hypot(x - (r.inicio.x - w), y - r.inicio.y) < w * 1.1 + rad) return false;   // la ardilla
            if (Math.hypot(x - (r.meta.x + w * 0.5), y - r.meta.y) < w * 1.2 + rad) return false;  // la cesta
            for (var i = 0; i < puestos.length; i++) if (Math.hypot(puestos[i].x - x, puestos[i].y - y) < puestos[i].r + rad) return false;
            return true;
        };
        var poner = function (x, y, rad) { puestos.push({ x: x, y: y, r: rad }); };
        // árboles medianos donde quepan (la isla entre los caminos, los costados)
        for (var a = 0; a < 140 && puestos.length < 4; a++) {
            var ax = rnd.entre(60, r.W - 60), ay = rnd.entre(r.area.arriba + w * 0.6, r.H - 40);
            var altoA = w * rnd.entre(2.2, 2.8);
            // la copa queda centrada a 0,68 del alto (radio ~0,38) y el tronco baja hasta ay
            if (!libre(ax, ay - altoA * 0.68, altoA * 0.4) || !libre(ax, ay - altoA * 0.18, altoA * 0.16)) continue;
            var t = arbol(ax, ay, altoA, COPAS[Math.floor(rnd() * 3)], -10 + ay / 10000);
            guardar(t.tronco);
            guardar(t.copa);
            fondo.copas.push(Object.assign(t, { fila: "rec" }));
            poner(ax, ay - altoA * 0.68, altoA * 0.4);
            poner(ax, ay - altoA * 0.18, altoA * 0.16);
        }
        // arbustos, hongos, flores y hierba
        var tipos = ["arbusto", "flor", "hierba", "flor", "hierba", "flor"];
        for (var k = 0; k < 600 && puestos.length < 34; k++) {
            var tipo = tipos[k % tipos.length];
            var tam = tipo === "arbusto" ? w * rnd.entre(0.75, 0.95) : w * rnd.entre(0.3, 0.4);
            var x = rnd.entre(30, r.W - 30), y = rnd.entre(r.area.arriba - w * 0.3, r.H - 30);
            if (!libre(x, y - tam * 0.4, tam * 0.5)) continue;
            poner(x, y - tam * 0.4, tam * 0.5);
            var o = origen(I.SVG[tipo]);
            var s = guardar(sc.add.image(x, y, "ico-" + tipo).setOrigin(0.5, 1).setDepth(-8 + y / 10000));
            var esc = tam / Math.max(o.w, o.h) / RES;
            s.setScale(esc);
            if (tipo === "flor") s.setTint([0xff8fab, 0xffd43b, 0xffffff, 0xb197fc, 0xff922b][Math.floor(rnd() * 5)]);
            decor.push({ s: s, x: x, y: y, k: 0, f: rnd() * 6.28, v: rnd.entre(0.7, 1.3), esc: esc, alto: tam, radio: w * 1.3, tipo: tipo });
        }
        // hojas secas sobre el suelo y sobre los caminos (salen volando al pasar)
        for (var h = 0; h < 46; h++) {
            var hx, hy;
            if (h % 2 === 0) {
                var ruta = r.rutas[h % 4 < 2 ? 0 : 1];
                var p = R.puntoEn(ruta, rnd() * ruta.largo);
                hx = p.x + rnd.entre(-0.45, 0.45) * w;
                hy = p.y + rnd.entre(-0.45, 0.45) * w;
                if (Math.hypot(hx - r.inicio.x, hy - r.inicio.y) < w || Math.hypot(hx - r.meta.x, hy - r.meta.y) < w) continue;
            } else {
                hx = rnd.entre(20, r.W - 20);
                hy = rnd.entre(r.area.arriba - w * 0.4, r.H - 20);
            }
            var hs = guardar(sc.add.image(hx, hy, "ico-hoja").setDepth(3.5));
            var e2 = rnd.entre(0.42, 0.62) * w / 130 / RES * 1.7;
            hs.setScale(e2).setTint(COLORES_HOJA[Math.floor(rnd() * COLORES_HOJA.length)]).setRotation(rnd() * 6.28);
            hojasSuelo.push({ s: hs, x: hx, y: hy, vx: 0, vy: 0, vr: 0, alto: 0, esc: e2 });
        }
    }

    // ------------------------------------------------------------------ obstáculos, hojitas guía, cesta

    function crearObstaculos(r) {
        r.obstaculos.forEach(function (d) {
            var o = origen(I.SVG[d.tipo]);
            // alargados (tronco, rama): acostados a lo largo del camino, del mismo largo que su forma de choque
            var largo = d.semi ? (d.semi + d.r) * 2 * 1.04 : d.r * 2.3;
            var esc = largo / o.w / RES;
            var rot = d.semi ? d.rot : 0;
            var halo = guardar(sc.add.image(d.x, d.y, "fx-halo").setBlendMode(ADD).setTint(0xffe066).setDepth(4.8).setAlpha(0));
            halo.setScale((d.r + (d.semi || 0)) * 2.6 / 128);
            var bajar = d.semi ? 0 : o.h * esc * RES * 0.12;
            var s = guardar(sc.add.image(d.x, d.y - bajar, "ico-" + d.tipo).setDepth(5 + d.y / 10000));
            s.setScale(esc).setRotation(rot);
            obstaculos.push({ d: d, s: s, halo: halo, esc: esc, rot: rot, temblor: 0, tCerca: 0 });
        });
    }

    function crearLuces(r) {
        var w = r.ancho;
        var tam = w * 0.17 / 40 / RES * 1.9;
        var cada = w * 0.85;
        r.rutas.forEach(function (ruta, k) {
            for (var s = w * 1.1; s < ruta.largo - w * 0.9; s += cada) {
                // en el tronco común solo una vez
                if (k === 1 && (s < r.tronco || s > ruta.largo - r.tronco)) continue;
                var p = R.puntoEn(ruta, s);
                var cercaObs = r.obstaculos.some(function (o) { return R.distObstaculo(o, p.x, p.y) < w * 0.25; });
                if (cercaObs) continue;
                var glow = guardar(sc.add.image(p.x, p.y, "fx-halo").setBlendMode(ADD).setScale(w * 0.42 / 128).setAlpha(0.12).setTint(0xffe8a3).setDepth(2.5));
                var hj = guardar(sc.add.image(p.x, p.y, "ico-hoja").setScale(tam).setTint(0xffd8a8).setAlpha(0.55).setRotation(p.ang + Math.PI / 2).setDepth(2.6));
                luces.push({ ruta: k, s: s, x: p.x, y: p.y, img: hj, glow: glow, on: false, tam: tam });
            }
        });
    }

    function encenderLuz(L, silencio) {
        if (L.on) return;
        L.on = true;
        sc.tweens.killTweensOf([L.img, L.glow]);
        L.img.setTint(0xffd43b).setAlpha(1).setScale(L.tam * 1.8);
        L.glow.setTint(0xffe066).setAlpha(0.8).setScale(rec.ancho * 0.9 / 128);
        sc.tweens.add({ targets: L.img, scale: L.tam * 1.15, duration: 380, ease: "Back.easeOut" });
        sc.tweens.add({ targets: L.glow, scale: rec.ancho * 0.6 / 128, alpha: 0.45, duration: 600 });
        if (!silencio && chispas && !reducido) chispas.emitParticleAt(L.x, L.y, 4);
    }

    function textoEtiqueta(x, y, texto, color) {
        var t = sc.add.text(x, y, texto, {
            fontFamily: "Fredoka, sans-serif",
            fontSize: Math.round(rec.ancho * 0.3) + "px",
            fontStyle: "bold",
            color: color || "#ffffff",
            stroke: "#7a3d12",
            strokeThickness: Math.round(rec.ancho * 0.07)
        });
        t.setOrigin(0.5, 1).setDepth(30);
        return t;
    }

    function crearCesta(r) {
        var w = r.ancho;
        var x = r.meta.x + w * 0.42, y = r.meta.y + w * 0.12;
        var esc = w * 1.55 / 260 / RES;
        var halo = guardar(sc.add.image(x, y - w * 0.1, "fx-halo").setBlendMode(ADD).setTint(0xffd43b).setDepth(5.5));
        var haloEsc = w * 2.6 / 128;
        halo.setScale(haloEsc).setAlpha(0.12);
        var atras = guardar(sc.add.image(x, y, "ico-cestaAtras").setScale(esc).setDepth(6));
        var frente = guardar(sc.add.image(x, y, "ico-cestaFrente").setScale(esc).setDepth(8));
        var arriba = y - 100 * esc * RES - w * 0.25 > r.area.m;
        var meta = guardar(textoEtiqueta(x, arriba ? y - 92 * esc * RES : y + 110 * esc * RES + w * 0.3, "¡Meta!", "#ffe066"));
        if (!reducido) sc.tweens.add({ targets: meta, y: meta.y - 8, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        // la boca de la cesta: donde cae la bellota
        cesta = { atras: atras, frente: frente, halo: halo, haloEsc: haloEsc, x: x, y: y, boca: { x: x, y: y - 6 * esc * RES }, esc: esc, brillo: 0, extra: 0, meta: meta };
        var ini = guardar(textoEtiqueta(r.inicio.x - w * 0.45, r.inicio.y - w * 1.15, "¡Inicia aquí!", "#ffffff"));
        if (!reducido) sc.tweens.add({ targets: ini, scale: 1.06, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    // ------------------------------------------------------------------ ardilla (por piezas)

    function crearArdilla() {
        var cont = sc.add.container(0, 0).setDepth(9);
        var sombra = sc.add.image(0, 0, "fx-sombra").setScale(1.2, 0.8).setAlpha(0.8);
        // marco común 240 × 240: los pies (130, 228) son el origen del contenedor
        var cola = sc.add.image(100 - 130, 190 - 228, "ico-ardillaCola").setOrigin(100 / 240, 190 / 240);
        var cuerpo = sc.add.image(0, 0, "ico-ardillaCuerpo").setOrigin(130 / 240, 228 / 240);
        var cabeza = sc.add.container(145 - 130, 128 - 228);
        var cabezaImg = sc.add.image(0, 0, "ico-ardillaCabeza").setOrigin(145 / 240, 128 / 240);
        var parpados = sc.add.image(0, 0, "ico-ardillaParpados").setOrigin(145 / 240, 128 / 240).setVisible(false);
        cabeza.add([cabezaImg, parpados]);
        [cola, cuerpo, cabezaImg, parpados].forEach(function (s) { s.setScale(1 / RES); });
        cont.add([sombra, cola, cuerpo, cabeza]);
        cont.setVisible(false);
        ardilla = {
            cont: cont, sombra: sombra, cola: cola, cuerpo: cuerpo, cabeza: cabeza, parpados: parpados,
            x: 0, y: 0, mira: 1, salto: 0, alegria: 0, caminando: 0, tParpadeo: 2000, tCabeza: 3000, cabezaObj: 0,
            visible: false, sigue: false, extraEsc: 1, saltoAlto: 0
        };
    }

    function escalaArdilla() {
        return rec ? rec.ancho * 1.25 / 240 : 0.6;
    }

    function posArdillaInicio() {
        return { x: rec.inicio.x - rec.ancho * 0.95, y: rec.inicio.y + rec.ancho * 0.45 };
    }

    /** Punto del rastro de la bellota a cierta distancia hacia atrás (la ardilla la acompaña por ahí). */
    function puntoRastro(atras) {
        var tr = pil.rastro;
        if (!tr.length) return null;
        var acum = 0;
        for (var i = tr.length - 1; i > 0; i--) {
            var d = Math.hypot(tr[i].x - tr[i - 1].x, tr[i].y - tr[i - 1].y);
            if (acum + d >= atras) {
                var k = (atras - acum) / d;
                return { x: tr[i].x + (tr[i - 1].x - tr[i].x) * k, y: tr[i].y + (tr[i - 1].y - tr[i].y) * k };
            }
            acum += d;
        }
        return null;
    }

    function actualizarArdilla(t, dt) {
        if (!ardilla) return;
        var a = ardilla;
        a.cont.setVisible(a.visible);
        if (!a.visible || !rec) return;
        // acompaña a la bellota: va detrás, por donde ella pasó, dando saltitos
        if (a.sigue && !pil.enArdilla) {
            var p = puntoRastro(rec.ancho * 1.05);
            if (p) {
                var tx = p.x, ty = p.y + rec.ancho * 0.42;
                var dx = tx - a.x, dy = ty - a.y;
                var d = Math.hypot(dx, dy);
                var k = Math.min(1, dt / 140);
                a.x += dx * k;
                a.y += dy * k;
                a.caminando = lerp(a.caminando, clamp(d / (rec.ancho * 0.15), 0, 1), 0.2);
                if (Math.abs(dx) > 2) a.mira = dx > 0 ? 1 : -1;
            } else a.caminando = lerp(a.caminando, 0, 0.1);
        }
        var esc = escalaArdilla() * a.extraEsc;
        var hop = reducido ? 0 : Math.abs(Math.sin(t / 110)) * a.caminando * rec.ancho * 0.12;
        var feliz = a.alegria > 0 && !reducido ? Math.abs(Math.sin(t / 130)) * a.alegria * rec.ancho * 0.45 : 0;
        a.cont.x = a.x;
        a.cont.y = a.y - hop - feliz - a.saltoAlto;
        a.cont.scaleX = esc * a.mira;
        a.cont.scaleY = esc * (1 + (a.alegria > 0 ? Math.sin(t / 65) * 0.04 : 0));
        a.sombra.y = (hop + feliz + a.saltoAlto) / esc;
        a.sombra.setAlpha(0.8 - Math.min(0.5, (hop + feliz + a.saltoAlto) / (rec.ancho * 0.8)));
        a.cont.setDepth(9 + (a.y > pil.y + rec.ancho * 0.3 ? 0.5 : 0));
        // cola: siempre se mueve (más rápido al caminar y al celebrar)
        var vel = 0.004 + a.caminando * 0.01 + a.alegria * 0.012;
        a.cola.rotation = reducido ? 0 : Math.sin(t * vel) * (0.12 + a.alegria * 0.15) - 0.04;
        // parpadeo
        a.tParpadeo -= dt;
        if (a.tParpadeo <= 0) {
            a.parpados.setVisible(true);
            a.tParpadeo = 2200 + Math.random() * 2600;
            sc.time.delayedCall(130, function () { if (a.parpados.active) a.parpados.setVisible(false); });
        }
        // cabeza: mira a un lado y al otro de vez en cuando; al celebrar se mueve contenta
        a.tCabeza -= dt;
        if (a.tCabeza <= 0) {
            a.cabezaObj = a.cabezaObj ? 0 : (Math.random() < 0.5 ? -0.16 : 0.12);
            a.tCabeza = 1800 + Math.random() * 2500;
        }
        var cab = a.alegria > 0 ? Math.sin(t / 120) * 0.18 : a.cabezaObj;
        a.cabeza.rotation = lerp(a.cabeza.rotation, cab, Math.min(1, dt / 220));
    }

    /** Saltito de alegría (cuando avanza bien). */
    function ardillaFeliz() {
        if (!ardilla || !ardilla.visible || !rec) return Promise.resolve();
        if (ardilla.saltando) return Promise.resolve();
        ardilla.saltando = true;
        var alto = rec.ancho * 0.4;
        return animar(420, function (e) {
            ardilla.saltoAlto = Math.sin(e * Math.PI) * alto;
        }).then(function () {
            ardilla.saltoAlto = 0;
            ardilla.saltando = false;
            if (hojitas && !reducido) hojitas.emitParticleAt(ardilla.x, ardilla.y, 4);
        });
    }

    // ------------------------------------------------------------------ bellota

    function crearBellota() {
        var cont = sc.add.container(0, 0).setDepth(7);
        var sombra = sc.add.image(0, 46, "fx-sombra").setScale(0.9, 0.7);
        var halo = sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setScale(1.6).setAlpha(0);
        var img = sc.add.image(0, 0, "ico-bellota").setScale(1 / RES);
        cont.add([sombra, halo, img]);
        cont.setVisible(false);
        bellota = { cont: cont, sombra: sombra, halo: halo, img: img, extraEsc: 1, giro: 0, flota: 0 };
        hojitas = sc.add.particles(0, 0, "ico-hoja", {
            lifespan: { min: 700, max: 1300 },
            speed: { min: 30, max: 110 },
            angle: { min: 200, max: 340 },
            gravityY: 160,
            rotate: { min: 0, max: 360 },
            scale: { start: 0.22, end: 0.05 },
            tint: COLORES_HOJA,
            emitting: false
        });
        hojitas.setDepth(10);
        chispas = sc.add.particles(0, 0, "fx-chispa", {
            lifespan: { min: 400, max: 800 },
            speed: { min: 40, max: 160 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.7, end: 0 },
            tint: COLORES_FIESTA,
            blendMode: ADD,
            emitting: false
        });
        chispas.setDepth(20);
    }

    function escalaBellota() {
        return rec ? rec.ancho * 0.58 / 120 : 0.55;
    }

    var acumHoja = 0;

    function actualizarBellota(t, dt) {
        if (!bellota) return;
        var b = bellota;
        b.cont.setVisible(pil.visible);
        if (!pil.visible || !rec) return;
        var esc = escalaBellota() * b.extraEsc;
        var quieto = !pil.arrastrando && !pil.auto;
        // espera: flota y se balancea un poco; en movimiento se inclina hacia donde va y rueda un poquito
        var flY = quieto && !reducido && !pil.enArdilla ? Math.sin(t / 480) * rec.ancho * 0.05 : 0;
        var vmax = Number(cfgJ.velocidadMax) || 1500;
        pil.empuje = lerp(pil.empuje, clamp(pil.vel / (vmax * 0.3), 0, 1), Math.min(1, dt / 140));
        var inclina = clamp(pil.vx / (vmax * 0.35), -1, 1) * 0.35;
        b.giro = lerp(b.giro, quieto ? Math.sin(t / 700) * 0.08 : inclina, Math.min(1, dt / 120));
        b.cont.x = pil.x;
        b.cont.y = pil.y + flY;
        b.cont.rotation = reducido ? 0 : b.giro;
        b.cont.setScale(esc);
        b.sombra.y = 46 - flY / esc;
        b.sombra.setAlpha(0.7);
        // halo: rojo con la alerta; dorado al ir bien
        if (rojo > 0.02) {
            b.halo.setTint(0xff4d4d);
            b.halo.setAlpha(rojo * (0.45 + 0.25 * Math.sin(t / 90)));
        } else {
            b.halo.setTint(0xffe066);
            b.halo.setAlpha(0.08 + pil.empuje * 0.25);
        }
        // hojitas y destellos mientras se mueve
        if (!reducido && pil.arrastrando && hojitas) {
            acumHoja += dt / 1000 * pil.empuje * 8;
            var n = Math.floor(acumHoja);
            if (n > 0) {
                acumHoja -= n;
                hojitas.emitParticleAt(pil.x + (Math.random() - 0.5) * 20, pil.y + rec.ancho * 0.15, n);
                if (chispas && Math.random() < 0.5) chispas.emitParticleAt(pil.x, pil.y - rec.ancho * 0.1, 1);
            }
        }
    }

    // ------------------------------------------------------------------ arrastre

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
            var dx = L.x - pil.x, dy = L.y - pil.y;
            if (dx * dx + dy * dy < r2) {
                encenderLuz(L);
                emitir("hoja", luces.filter(function (q) { return q.on; }).length);
            }
        }
    }

    /** Avance: el mayor tramo recorrido por cualquiera de las dos rutas (sin saltos por atajos). */
    function revisarAvance() {
        var lim = R.limites(rec, cfgJ);
        var mejor = 0;
        rec.rutas.forEach(function (ruta, k) {
            var c = R.cercano(ruta.pts, pil.x, pil.y);
            if (c.d <= lim.fuera && c.s > pil.maxS[k] && c.s <= pil.maxS[k] + rec.ancho * 1.5) pil.maxS[k] = c.s;
            mejor = Math.max(mejor, pil.maxS[k] / ruta.largo);
        });
        if (mejor > pil.avance + 0.004) {
            var antes = pil.avance;
            pil.avance = mejor;
            dibujarRastro();
            fondo.luzObj = mejor * 0.6;
            emitir("avance", mejor, antes);
        }
    }

    function dibujarRastro() {
        if (!rastroG || !rec) return;
        rastroG.clear();
        var w = rec.ancho;
        rec.rutas.forEach(function (ruta, k) {
            var pts = ruta.pts;
            var hasta = pil.maxS[k];
            if (hasta < 4) return;
            [[w * 0.36, 0xfff3bf, 0.16], [w * 0.16, 0xffe066, 0.4], [w * 0.05, 0xffffff, 0.75]].forEach(function (c) {
                rastroG.lineStyle(c[0], c[1], c[2]);
                rastroG.beginPath();
                rastroG.moveTo(pts[0].x, pts[0].y);
                for (var i = 1; i < pts.length && pts[i].s <= hasta; i++) rastroG.lineTo(pts[i].x, pts[i].y);
                rastroG.strokePath();
            });
        });
    }

    function reaccionObstaculo(i, tocando) {
        var ob = obstaculos[i];
        if (!ob) return;
        ob.temblor = Math.max(ob.temblor, tocando ? 1 : 0.7);
        var ahora = performance.now();
        if (ahora - ob.tCerca > 1600) {
            ob.tCerca = ahora;
            if (hojitas && !reducido) hojitas.emitParticleAt(ob.d.x, ob.d.y - ob.d.r * 0.5, 5);
            onda(ob.d.x, ob.d.y, 0xffe066);
            emitir("obstaculo", i);
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
            // fuera del camino, un empujoncito suave lo invita a volver
            if (res.zona !== "pista" && res.proy) {
                var kc = (Number(cfgJ.regresoSuave) || 0.05) * Math.min(1, dt / 16);
                pil.x = lerp(pil.x, res.proy.x, kc);
                pil.y = lerp(pil.y, res.proy.y, kc);
            }
            pil.dProy = res.proy ? res.proy.d : 0;
            cambiarZona(res.zona);
            if (res.zona === "pista") pil.valido = { x: pil.x, y: pil.y };
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
            if (res.zona !== "limite") revisarAvance();
            if (res.cerca >= 0) reaccionObstaculo(res.cerca, res.obstaculo >= 0);
            // empujando contra un obstáculo sin rodearlo: al rato aparece la flecha hacia el lado libre
            if (res.obstaculo >= 0 && Math.hypot(pil.objetivo.x - pil.x, pil.objetivo.y - pil.y) > rec.ancho * 0.25) {
                if (!pil.atascoDesde) pil.atascoDesde = t;
                else if (pil.atasco < 0 && t - pil.atascoDesde > 1100) {
                    pil.atasco = res.obstaculo;
                    emitir("atascado", res.obstaculo);
                }
            } else if (res.obstaculo < 0) {
                pil.atascoDesde = 0;
                if (pil.atasco >= 0 && (res.cerca < 0 || res.cerca !== pil.atasco)) pil.atasco = -1;
            }
            if (!pil.enMeta && res.zona !== "limite" && R.enMeta(rec, pil.x, pil.y)) {
                pil.enMeta = true;
                emitir("meta");
            }
        }
        var mov = Math.hypot(pil.x - antesX, pil.y - antesY);
        var vel = mov / Math.max(1, dt) * 1000;
        pil.vel = lerp(pil.vel, vel, 0.3);
        pil.vx = lerp(pil.vx, (pil.x - antesX) / Math.max(1, dt) * 1000, 0.3);
        if (mov > 0.6) {
            pil.tUltimoMov = t;
            var tr = pil.rastro;
            var ult = tr[tr.length - 1];
            if (!ult || Math.hypot(ult.x - pil.x, ult.y - pil.y) > 6) {
                tr.push({ x: pil.x, y: pil.y });
                if (tr.length > 160) tr.shift();
            }
            emitir("mueve");
        }
        if (pil.visible) revisarLuces();
        // rojo progresivo: según cuánto se alejó del borde del camino
        // rojo progresivo: se nota en cuanto sale y se intensifica cuanto más se aleja del camino
        var rojoObj = pil.zona === "pista" ? 0 : (pil.arrastrando ? 0.45 + 0.55 * R.salida(rec, pil.dProy, cfgJ) : rojo);
        rojo = lerp(rojo, rojoObj, Math.min(1, dt / 160));
        if (pistaRoja) pistaRoja.setAlpha(clamp(rojo * 1.1, 0, 1) * (0.85 + 0.15 * Math.sin(t / 120)));
        // flecha de regreso: aparece junto a la bellota y señala el camino
        if (flecha) {
            var obA = pil.atasco >= 0 && pil.arrastrando ? rec.obstaculos[pil.atasco] : null;
            var verFlecha = (pil.zona !== "pista" && pil.visible && rojo > 0.15) || !!obA;
            if (obA && !(pil.zona !== "pista" && rojo > 0.15)) {
                // dorada: señala el lado libre del obstáculo (contrario a donde se apoya)
                var aL = Math.atan2(-obA.ny, -obA.nx);
                var dL = rec.ancho * 0.62 + Math.sin(t / 140) * rec.ancho * 0.06;
                flecha.x = pil.x + Math.cos(aL) * dL;
                flecha.y = pil.y + Math.sin(aL) * dL;
                flecha.rotation = aL;
                flecha.setTint(0xffe066);
            } else if (verFlecha) {
                flecha.clearTint();
                var pr = R.proyectar(rec, pil.x, pil.y);
                var ang = Math.atan2(pr.y - pil.y, pr.x - pil.x);
                var dist = rec.ancho * 0.62 + Math.sin(t / 140) * rec.ancho * 0.06;
                flecha.x = pil.x + Math.cos(ang) * dist;
                flecha.y = pil.y + Math.sin(ang) * dist;
                flecha.rotation = ang;
            }
            flecha.setAlpha(lerp(flecha.alpha, verFlecha ? 1 : 0, 0.2));
        }
    }

    function tocaBellota(x, y) {
        if (!rec || !pil.visible) return false;
        return Math.hypot(x - pil.x, y - pil.y) <= rec.ancho * 0.95;
    }

    function empezarArrastre(x, y) {
        pil.offset = { x: pil.x - x, y: pil.y - y };
        pil.objetivo = { x: pil.x, y: pil.y };
        pil.arrastrando = true;
        pil.fueraDesde = 0;
        if (ardilla) ardilla.sigue = true;
        if (!pil.rastro.length) {
            var a0 = { x: ardilla ? ardilla.x : pil.x - rec.ancho, y: ardilla ? ardilla.y - rec.ancho * 0.42 : pil.y };
            pil.rastro = [a0, { x: pil.x, y: pil.y }];
        }
        sc.tweens.add({ targets: bellota, extraEsc: 1.12, duration: 160, ease: "Back.easeOut" });
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
        pil.atascoDesde = 0;
        pil.atasco = -1;
        if (bellota) sc.tweens.add({ targets: bellota, extraEsc: 1, duration: 200 });
        return estaba ? pil.zona : null;
    }

    function onda(x, y, color) {
        if (!sc || !rec) return;
        var o = sc.add.image(x, y, "fx-onda").setDepth(13).setTint(color || 0xffffff).setAlpha(0.8).setScale(rec.ancho * 0.4 / 128);
        sc.tweens.add({ targets: o, scale: rec.ancho * 1.5 / 128, alpha: 0, duration: 650, ease: "Quad.easeOut", onComplete: function () { o.destroy(); } });
    }

    function deslizarA(x, y, ms) {
        var x0 = pil.x, y0 = pil.y;
        pil.auto = true;
        return animar(ms, function (e) {
            var nx = lerp(x0, x, e), ny = lerp(y0, y, e);
            pil.vx = (nx - pil.x) * 60;
            pil.x = nx;
            pil.y = ny;
            var tr = pil.rastro;
            var ult = tr[tr.length - 1];
            if (!ult || Math.hypot(ult.x - pil.x, ult.y - pil.y) > 6) tr.push({ x: pil.x, y: pil.y });
        }, suave).then(function () { pil.auto = false; pil.vx = 0; });
    }

    /** Se alejó demasiado o soltó fuera: la bellota rueda sola al último punto válido (sin perder el avance). */
    async function regresar() {
        if (!rec) return;
        pil.bloqueado = true;
        pil.arrastrando = false;
        var v = pil.valido || { x: rec.inicio.x, y: rec.inicio.y };
        await deslizarA(v.x, v.y, 650);
        pil.dProy = 0;
        cambiarZona("pista");
        pil.bloqueado = false;
    }

    // ------------------------------------------------------------------ ayudas

    /** Las próximas hojitas de los dos caminos parpadean (no resuelve: muestra hacia dónde seguir). */
    function pistaLuces(cuantas) {
        if (!rec) return;
        rec.rutas.forEach(function (ruta, k) {
            var adelante = luces.filter(function (L) { return L.ruta === k && !L.on && L.s > pil.maxS[k]; })
                .sort(function (a, b) { return a.s - b.s; }).slice(0, cuantas || 3);
            adelante.forEach(function (L, j) {
                sc.time.delayedCall(j * 200, function () {
                    if (!L.img.active || L.on) return;
                    sc.tweens.add({ targets: L.glow, alpha: 0.85, scale: rec.ancho * 0.85 / 128, duration: 260, yoyo: true, repeat: 2 });
                    sc.tweens.add({ targets: L.img, scale: L.tam * 1.7, duration: 260, yoyo: true, repeat: 2 });
                });
            });
        });
    }

    /** Un destello dorado recorre un tramo del camino despejado (pista fuerte). */
    function guiaDorada(ms) {
        if (!rec) return Promise.resolve();
        var k = rec.conObstaculos === 0 ? 1 : 0;
        var ruta = rec.rutas[k];
        var d0 = Math.max(pil.maxS[k], R.cercano(ruta.pts, pil.x, pil.y).s);
        var d1 = Math.min(ruta.largo, d0 + rec.ancho * 3);
        var st = guardar(sc.add.image(0, 0, "fx-estrella").setTint(0xffe066).setDepth(25).setScale(rec.ancho * 0.36 / 48));
        var halo = guardar(sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setTint(0xffe066).setDepth(24).setScale(rec.ancho * 1.1 / 128));
        var ultimo = 0;
        return animar(ms || 2600, function (e) {
            var p = R.puntoEn(ruta, lerp(d0, d1, e));
            st.x = halo.x = p.x;
            st.y = halo.y = p.y;
            st.rotation = e * 6;
            var ahora = performance.now();
            if (ahora - ultimo > 70 && !reducido && chispas) {
                ultimo = ahora;
                chispas.emitParticleAt(p.x, p.y, 1);
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
            gravityY: 80,
            tint: COLORES_FIESTA,
            blendMode: ADD,
            emitting: false
        });
        e.setDepth(40);
        e.explode(n || 14);
        var h = sc.add.particles(x, y, "ico-hoja", {
            speed: { min: 80 * (fuerza || 1), max: 260 * (fuerza || 1) },
            angle: { min: 200, max: 340 },
            scale: { start: 0.35, end: 0.15 },
            rotate: { min: 0, max: 360 },
            lifespan: { min: 900, max: 1600 },
            gravityY: 260,
            tint: COLORES_HOJA,
            emitting: false
        });
        h.setDepth(40);
        h.explode(Math.round((n || 14) * 0.8));
        sc.time.delayedCall(1800, function () { e.destroy(); h.destroy(); });
    }

    /** Lluvia de hojas de colores sobre toda la vista. */
    function lluviaHojas(n, ms) {
        if (!sc || reducido) return;
        var v = vista();
        var ancho = sc.scale.width / v.z, alto = sc.scale.height / v.z;
        for (var i = 0; i < (n || 30); i++) {
            var h = sc.add.image(v.x0 + Math.random() * ancho, v.y0 - 40 - Math.random() * 200, "ico-hoja").setDepth(45);
            h.setTint(COLORES_HOJA[i % COLORES_HOJA.length]).setScale((0.5 + Math.random() * 0.5) / RES * 1.8);
            sc.tweens.add({
                targets: h, y: v.y0 + alto + 60, x: h.x + (Math.random() - 0.5) * 300, rotation: (Math.random() - 0.5) * 12,
                duration: (ms || 2400) * (0.7 + Math.random() * 0.6), delay: Math.random() * 600, ease: "Sine.easeIn",
                onComplete: function () { this.targets[0].destroy(); }
            });
        }
    }

    /** Recorrido completado: hojitas encendidas en ola, el camino brilla, la ardilla salta de felicidad. */
    async function celebrarRecorrido() {
        if (!rec) return;
        pulsoFondo(0.5);
        fondo.luzObj = 0.8;
        var orden = luces.slice().sort(function (a, b) {
            return Math.hypot(a.x - rec.inicio.x, a.y - rec.inicio.y) - Math.hypot(b.x - rec.inicio.x, b.y - rec.inicio.y);
        });
        orden.forEach(function (L, k) { sc.time.delayedCall(k * 22, function () { if (L.img.active) encenderLuz(L, true); }); });
        if (cesta) cesta.extra = 1;
        if (ardilla) ardilla.alegria = 1;
        lluviaHojas(34, 2600);
        await sleep(1100);
        if (ardilla) ardilla.alegria = 0;
    }

    /**
     * Al llegar: la bellota da un saltito, cae dentro de la cesta (entre la parte de atrás y el frente), la cesta
     * se mueve al recibirla y suelta destellos; la ardilla llega saltando de felicidad.
     * aviso(fase): "cae" | "dentro" (script.js pone los sonidos).
     */
    async function entrarCesta(aviso) {
        if (!rec || !bellota || !cesta) return;
        var av = typeof aviso === "function" ? aviso : function () {};
        pil.auto = true;
        pil.bloqueado = true;
        pil.arrastrando = false;
        var x0 = pil.x, y0 = pil.y;
        var fin = { x: cesta.boca.x, y: cesta.boca.y + rec.ancho * 0.08 };
        var alto = rec.ancho * 0.9;
        if (ardilla) ardilla.sigue = true;
        await animar(650, function (e) {
            pil.x = lerp(x0, fin.x, e);
            pil.y = lerp(y0, fin.y, e) - Math.sin(e * Math.PI) * alto;
            bellota.cont.rotation = e * 1.4;
            if (e > 0.6) bellota.cont.setDepth(7 - 0.5);   // entre la parte de atrás (6) y el frente (8)
        }, function (u) { return u; });
        av("cae");
        bellota.cont.setDepth(7);
        // la cesta se aplasta un poquito y vuelve (como si la recibiera)
        sc.tweens.killTweensOf([cesta.atras, cesta.frente]);
        [cesta.atras, cesta.frente].forEach(function (s) {
            s.setScale(cesta.esc * 1.08, cesta.esc * 0.9);
            sc.tweens.add({ targets: s, scaleX: cesta.esc, scaleY: cesta.esc, duration: 520, ease: "Elastic.easeOut" });
        });
        await animar(260, function (e) {
            pil.y = fin.y + e * rec.ancho * 0.25;
            bellota.extraEsc = lerp(1, 0.8, e);
            bellota.cont.alpha = 1 - e;
        });
        pil.visible = false;
        pil.auto = false;
        bellota.cont.alpha = 1;
        bellota.extraEsc = 1;
        bellota.cont.rotation = 0;
        av("dentro");
        cesta.extra = 1;
        cesta.atras.setTint(0xfff3bf);
        sc.time.delayedCall(320, function () { if (cesta && cesta.atras.active) cesta.atras.clearTint(); });
        onda(cesta.x, cesta.y, 0xffe066);
        chispasFiesta(cesta.x, cesta.y - rec.ancho * 0.6, 22, 1.1);
        // la ardilla llega junto a la cesta y salta de felicidad
        if (ardilla) {
            ardilla.sigue = false;
            var ax0 = ardilla.x, ay0 = ardilla.y;
            var ax1 = cesta.x - rec.ancho * 1.1, ay1 = cesta.y + rec.ancho * 0.35;
            ardilla.mira = 1;
            ardilla.caminando = 1;
            await animar(500, function (e) {
                ardilla.x = lerp(ax0, ax1, e);
                ardilla.y = lerp(ay0, ay1, e);
            }, suave);
            ardilla.caminando = 0;
            ardilla.alegria = 1;
            sc.time.delayedCall(1600, function () { if (ardilla) ardilla.alegria = 0; });
        }
    }

    /** Entre recorridos: un remolino de hojas cruza la pantalla. */
    async function transicion(ms) {
        if (!sc || reducido) { await sleep(300); return; }
        var v = vista();
        var ancho = sc.scale.width / v.z, alto = sc.scale.height / v.z;
        var lista = [];
        for (var i = 0; i < 60; i++) {
            var h = sc.add.image(v.x0 - 80 - Math.random() * 300, v.y0 + Math.random() * alto, "ico-hoja").setDepth(50);
            h.setTint(COLORES_HOJA[i % COLORES_HOJA.length]).setScale((0.6 + Math.random() * 0.8) / RES * 1.8);
            sc.tweens.add({
                targets: h, x: v.x0 + ancho + 120 + Math.random() * 200, y: h.y + (Math.random() - 0.5) * 260,
                rotation: (Math.random() - 0.5) * 16, duration: (ms || 1200) * (0.7 + Math.random() * 0.5),
                delay: Math.random() * 300, ease: "Quad.easeIn"
            });
            lista.push(h);
        }
        pulsoFondo(0.3);
        await sleep((ms || 1200) + 450);
        lista.forEach(function (h) { h.destroy(); });
    }

    /** La ardilla llega dando saltitos desde la izquierda con la bellota y la deja en el inicio. */
    async function llegarInicio() {
        if (!rec || !ardilla || !bellota) return;
        var fin = posArdillaInicio();
        var w = rec.ancho;
        ardilla.visible = true;
        ardilla.sigue = false;
        ardilla.mira = 1;
        ardilla.alegria = 0;
        ardilla.extraEsc = 1;
        ardilla.cont.alpha = 1;
        var x0 = fin.x - Math.max(380, w * 3.5);
        ardilla.x = x0;
        ardilla.y = fin.y;
        pil.visible = true;
        pil.enArdilla = true;
        pil.rastro = [];
        var patas = function () {
            var esc = escalaArdilla();
            return { x: ardilla.x + 64 * esc, y: ardilla.cont.y - 70 * esc };
        };
        ardilla.caminando = 1;
        await animar(1300, function (e) {
            ardilla.x = lerp(x0, fin.x, e);
            var p = patas();
            pil.x = p.x;
            pil.y = p.y;
        }, function (u) { return 1 - Math.pow(1 - u, 2); });
        ardilla.caminando = 0;
        // deja la bellota en el punto de inicio
        var b0 = patas();
        await animar(420, function (e) {
            pil.x = lerp(b0.x, rec.inicio.x, e);
            pil.y = lerp(b0.y, rec.inicio.y, e) - Math.sin(e * Math.PI) * w * 0.3;
        }, suave);
        pil.enArdilla = false;
        pil.x = rec.inicio.x;
        pil.y = rec.inicio.y;
        pil.valido = { x: pil.x, y: pil.y };
        pil.tUltimoMov = performance.now();
        onda(pil.x, pil.y, 0xfff3bf);
        if (hojitas && !reducido) hojitas.emitParticleAt(pil.x, pil.y + w * 0.2, 6);
    }

    // ------------------------------------------------------------------ cargar un recorrido

    async function cargarRecorrido(r, opciones) {
        if (!sc) return;
        descargar();
        fondo.copas = fondo.copas.filter(function (c) { return c.fila !== "rec"; });
        rec = r;
        dims = { W: r.W, H: r.H };
        reacomodar();
        texturaDeCanvas("pista-n", canvasPista(r, PALETA.normal, 1, false));
        texturaDeCanvas("pista-r", canvasPista(r, PALETA.roja, 1, true));
        pistaImg = guardar(sc.add.image(0, 0, "pista-n").setOrigin(0, 0).setDepth(0));
        pistaRoja = guardar(sc.add.image(0, 0, "pista-r").setOrigin(0, 0).setDepth(1).setAlpha(0));
        rastroG = guardar(sc.add.graphics().setDepth(2));
        flecha = guardar(sc.add.image(0, 0, "fx-flecha").setDepth(26).setAlpha(0).setScale(r.ancho * 0.42 / 128));
        decorar(r);
        crearLuces(r);
        crearObstaculos(r);
        crearCesta(r);
        rojo = 0;
        fondo.luzObj = 0;
        pil.x = r.inicio.x;
        pil.y = r.inicio.y;
        pil.valido = { x: pil.x, y: pil.y };
        pil.avance = 0;
        pil.maxS = [0, 0];
        pil.zona = "pista";
        pil.enMeta = false;
        pil.arrastrando = false;
        pil.bloqueado = true;
        pil.rastro = [];
        pil.dProy = 0;
        pil.vx = 0;
        if (bellota) {
            bellota.cont.setDepth(7);
            bellota.cont.alpha = 1;
            bellota.extraEsc = 1;
        }
        if (ardilla) {
            var pa = posArdillaInicio();
            ardilla.x = pa.x;
            ardilla.y = pa.y;
            ardilla.sigue = false;
            ardilla.alegria = 0;
        }
        dibujarRastro();
        if (opciones && opciones.animar) await aparecerPista();
    }

    async function aparecerPista() {
        var aparecen = objRec.filter(function (o) { return o.setAlpha && o !== pistaRoja && o !== flecha && o.type !== "Graphics"; });
        var alfas = aparecen.map(function (o) { return o.alpha; });
        aparecen.forEach(function (o) { o.setAlpha(0); });
        aparecen.forEach(function (o, k) { tw({ targets: o, alpha: alfas[k], duration: 700, delay: o === pistaImg ? 0 : 150 }); });
        await sleep(900);
    }

    async function ocultarRecorrido() {
        if (!objRec.length) return;
        await tw({ targets: objRec.filter(function (o) { return o.setAlpha; }), alpha: 0, duration: 450 });
        if (ardilla) ardilla.visible = false;
        pil.visible = false;
        descargar();
    }

    // ------------------------------------------------------------------ escena final: el hogar de la ardilla

    /**
     * La cámara viaja a la derecha del bosque: el gran árbol con la casa de la ardilla y la cesta con las cuatro
     * bellotas (aparecen una a una). La ardilla salta hasta el árbol, sube a su puerta y entra feliz; la ventana
     * se enciende y caen hojas de colores.
     */
    async function finalCinematica() {
        if (!rec || !ardilla) return;
        camLibre = true;
        pil.bloqueado = true;
        pil.arrastrando = false;
        var cam = sc.cameras.main;
        var w = rec.ancho;
        var bx = rec.W + 1100, by = rec.H * 0.62;
        var esc = 1.25;
        var oA = origen(I.SVG.arbolCasa);
        var halo = sc.add.image(bx, by - 360 * esc, "fx-halo").setBlendMode(ADD).setTint(0xffe8a3).setDepth(4).setScale(10).setAlpha(0.15);
        var arbolImg = sc.add.image(bx, by, "ico-arbolCasa").setOrigin(0.5, 684 / oA.h).setScale(esc / RES).setDepth(5);
        var puerta = { x: bx + (300 - 300) * esc, y: by + (560 - 684) * esc };
        var ventana = sc.add.image(bx, by + (400 - 684) * esc, "fx-halo").setBlendMode(ADD).setTint(0xffd43b).setDepth(5.2).setScale(1.2).setAlpha(0);
        // cesta con las cuatro bellotas al pie del árbol
        var cx = bx - 360, cy = by + 10;
        var ce = 1.1 / RES;
        var cAtras = sc.add.image(cx, cy - 100, "ico-cestaAtras").setScale(ce).setDepth(6);
        var cFrente = sc.add.image(cx, cy - 100, "ico-cestaFrente").setScale(ce).setDepth(8);
        var bellotas = [];
        for (var i = 0; i < 4; i++) {
            var bi = sc.add.image(cx - 75 + i * 50, cy - 175 - (i % 2) * 18, "ico-bellota").setScale(0.01).setDepth(7).setRotation((i - 1.5) * 0.2);
            bellotas.push(bi);
        }
        // los árboles del costado derecho del bosque se apartan; detrás de la casa, árboles propios del claro
        var costado = fondo.copas.filter(function (a) { return a.fila === "lado" && a.lado > 0; });
        costado.forEach(function (a) { tw({ targets: [a.tronco, a.copa], alpha: 0, duration: 900 }); });
        var fondoCasa = [[-760, 0.95, 0], [-1000, 0.8, 1], [560, 1.0, 2], [820, 0.85, 0], [-560, 0.7, 2]].map(function (d) {
            var t = arbol(bx + d[0], by + 10 - d[1] * 40, 520 * d[1], COPAS[d[2]], 3 + d[1] * 0.1);
            t.fila = "casa";
            fondo.copas.push(t);   // se mecen como los demás
            return t;
        });
        base = { arbol: arbolImg, halo: halo, ventana: ventana, cAtras: cAtras, cFrente: cFrente, bellotas: bellotas, x: bx, y: by, costado: costado, fondoCasa: fondoCasa };
        // la cámara viaja con la ardilla
        var z0 = cam.zoom;
        var v0 = vista();
        var c0 = { x: v0.x0 + cam.width / z0 / 2, y: v0.y0 + cam.height / z0 / 2 };
        var zFin = Math.min(z0 * 1.15, (cam.height * 0.86) / (oA.h * esc + 120));
        var finCam = { x: bx - 160, y: by - oA.h * esc * 0.5 + 40 };
        ardilla.visible = true;
        ardilla.sigue = false;
        ardilla.mira = 1;
        ardilla.extraEsc = 1;
        ardilla.cont.setDepth(9);
        var ax0 = ardilla.x, ay0 = ardilla.y;
        var ax1 = cx + 170, ay1 = by;
        ardilla.caminando = 1;
        await animar(reducido ? 300 : 3200, function (e, u) {
            ardilla.x = lerp(ax0, ax1, e);
            ardilla.y = lerp(ay0, ay1, e);
            var k = suave(u);
            cam.setZoom(lerp(z0, zFin, k));
            cam.centerOn(lerp(c0.x, finCam.x, k), lerp(c0.y, finCam.y, k));
            halo.setAlpha(0.15 + u * 0.3);
        }, suave);
        ardilla.caminando = 0;
        // las cuatro bellotas aparecen en la cesta, una por recorrido
        for (var j = 0; j < bellotas.length; j++) {
            emitir("bellotaFinal", j);
            tw({ targets: bellotas[j], scale: 0.42 / RES, duration: 380, ease: "Back.easeOut" });
            chispasFiesta(bellotas[j].x, bellotas[j].y, 8, 0.6);
            await sleep(330);
        }
        ardilla.alegria = 1;
        await sleep(900);
        ardilla.alegria = 0;
        // salta hasta la puerta y entra feliz
        var px0 = ardilla.x, py0 = ardilla.y;
        var esc0 = ardilla.extraEsc;
        await animar(1100, function (e) {
            ardilla.x = lerp(px0, puerta.x, e);
            ardilla.y = lerp(py0, puerta.y + 50, e) - Math.sin(e * Math.PI) * 140;
            ardilla.mira = -1;
        }, suave);
        emitir("puerta");
        await animar(700, function (e) {
            ardilla.extraEsc = lerp(esc0, esc0 * 0.6, e);
            ardilla.cont.alpha = 1 - e;
            ardilla.y = puerta.y + 50 - e * 20;
        }, suave);
        ardilla.visible = false;
        ardilla.cont.alpha = 1;
        ardilla.extraEsc = 1;
        // la ventana se enciende
        fondo.luzObj = 1;
        await animar(900, function (e) {
            ventana.setAlpha(e * 0.9);
            ventana.setScale(1.2 + e * 0.8);
            halo.setAlpha(0.45 + e * 0.35);
        }, suave);
        lluviaHojas(40, 3000);
    }

    /** Celebración del final: destellos, estrellas y hojas alrededor del árbol. */
    function fuegos(n) {
        if (!sc || !base) return;
        for (var i = 0; i < (n || 3); i++) {
            (function (k) {
                sc.time.delayedCall(k * 260, function () {
                    var x = base.x - 200 + (Math.random() - 0.5) * 900;
                    var y = base.y - 500 - Math.random() * 300;
                    chispasFiesta(x, y, 24, 1.2);
                    var anillo = sc.add.image(x, y, "fx-onda").setTint(COLORES_FIESTA[k % COLORES_FIESTA.length]).setDepth(39).setScale(0.3);
                    sc.tweens.add({ targets: anillo, scale: 2.6, alpha: 0, duration: 900, onComplete: function () { anillo.destroy(); } });
                });
            })(i);
        }
        lluviaHojas(14, 2600);
    }

    function reiniciarVista() {
        if (base) {
            [base.arbol, base.halo, base.ventana, base.cAtras, base.cFrente].forEach(function (o) { sc.tweens.killTweensOf(o); o.destroy(); });
            base.fondoCasa.forEach(function (t) { t.tronco.destroy(); t.copa.destroy(); });
            fondo.copas = fondo.copas.filter(function (c) { return c.fila !== "casa"; });
            base.costado.forEach(function (a) { sc.tweens.killTweensOf([a.tronco, a.copa]); a.tronco.setAlpha(1); a.copa.setAlpha(1); });
            base.bellotas.forEach(function (b) { sc.tweens.killTweensOf(b); b.destroy(); });
            base = null;
        }
        camLibre = false;
        pil.visible = false;
        if (ardilla) {
            ardilla.visible = false;
            ardilla.alegria = 0;
            ardilla.extraEsc = 1;
            ardilla.cont.alpha = 1;
        }
        fondo.luzObj = 0;
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
        x.fillStyle = "#7cc24a";
        x.fillRect(0, 0, ancho, alto);
        var e = Math.min(ancho / r.W, alto / r.H) * 0.94;
        x.save();
        x.translate((ancho - r.W * e) / 2, (alto - r.H * e) / 2);
        var mini = canvasPista(r, PALETA.normal, e, true);
        x.drawImage(mini, 0, 0, mini.width, mini.height);
        r.obstaculos.forEach(function (o) {
            var col = o.tipo === "piedra" ? "#868e96" : (o.tipo === "hongos" ? "#e03131" : (o.tipo === "arbusto" ? "#5c9e31" : "#7a4520"));
            x.strokeStyle = col;
            x.lineCap = "round";
            x.lineWidth = Math.max(5, o.r * 2 * e);
            x.beginPath();
            x.moveTo((o.x - (o.ux || 0) * (o.semi || 0)) * e - 0.01, (o.y - (o.uy || 0) * (o.semi || 0)) * e);
            x.lineTo((o.x + (o.ux || 0) * (o.semi || 0)) * e + 0.01, (o.y + (o.uy || 0) * (o.semi || 0)) * e);
            x.stroke();
        });
        x.fillStyle = "#c06a26";
        x.beginPath();
        x.arc(r.inicio.x * e, r.inicio.y * e, Math.max(4, r.ancho * e * 0.32), 0, Math.PI * 2);
        x.fill();
        x.fillStyle = "#ffd43b";
        x.strokeStyle = "#8a5a2b";
        x.lineWidth = 2;
        x.beginPath();
        x.arc((r.meta.x + r.ancho * 0.42) * e, r.meta.y * e, Math.max(5, r.ancho * e * 0.55), 0, Math.PI * 2);
        x.fill();
        x.stroke();
        x.restore();
        return c.toDataURL("image/png");
    }

    // ------------------------------------------------------------------ puntos de pantalla

    function puntoBellota() { return aPantalla(pil.x, pil.y); }

    function zonaZoe() {
        if (!sc) return null;
        // en el final la cámara viajó a la casa del árbol: Zoe va abajo a la izquierda del área visible, completa
        if (camLibre) {
            medirArea();
            var r0 = sc.game.canvas.getBoundingClientRect();
            var alto = area.height * 0.62;
            var bottom = r0.top + area.top + area.height;
            return { left: r0.left + area.left + 6, top: bottom - alto, width: Math.max(170, area.width * 0.15), height: alto, bottom: bottom };
        }
        var H = rec ? rec.H : dims.H, W = rec ? rec.W : dims.W;
        var a = aPantalla(0, H * 0.42);
        var b = aPantalla(W * 0.16, H);
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
            console.warn("[EscenarioArdilla] falta Phaser, IconosArdilla o ReglasArdilla");
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        listoPromesa = new Promise(function (resolve) {
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: el,
                backgroundColor: "#6fb43f",
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
                            dims = dimensionesMundo();
                            crearFondo();
                            crearBellota();
                            crearArdilla();
                            reacomodar();
                            sc.scale.on("resize", reacomodar);
                            // el arrastre corre con su propio reloj (setTimeout): no depende de que el navegador pinte
                            var tPrev = performance.now();
                            var paso = function () {
                                var ahora = performance.now();
                                actualizarPiloto(ahora, Math.min(ahora - tPrev, 50));
                                tPrev = ahora;
                                setTimeout(paso, 16);
                            };
                            paso();
                            sc.events.on("update", function (t, dt) {
                                var d = Math.min(dt, 50);
                                var ahora = performance.now();
                                actualizarBellota(ahora, d);
                                actualizarArdilla(ahora, d);
                                actualizarFondo(t, d);
                            });
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__pedniaPhaserGame = juego;
        });
        return listoPromesa;
    }

    global.EscenarioArdilla = {
        montar: montar,
        listo: function () { return !!(sc && bellota && ardilla); },
        escena: function () { return sc; },
        on: function (mapa) { Object.keys(mapa || {}).forEach(function (k) { ev[k] = mapa[k]; }); },
        reacomodar: reacomodar,
        dimensionesMundo: dimensionesMundo,
        recorrido: function () { return rec; },
        piloto: function () { return pil; },
        cargarRecorrido: cargarRecorrido,
        ocultarRecorrido: ocultarRecorrido,
        tocaBellota: tocaBellota,
        empezarArrastre: empezarArrastre,
        moverObjetivo: moverObjetivo,
        soltar: soltar,
        bloquear: function (on) { pil.bloqueado = !!on; if (on) pil.arrastrando = false; },
        mostrarBellota: function (on) { pil.visible = !!on; },
        regresar: regresar,
        onda: onda,
        pistaLuces: pistaLuces,
        guiaDorada: guiaDorada,
        celebrarRecorrido: celebrarRecorrido,
        entrarCesta: entrarCesta,
        transicion: transicion,
        llegarInicio: llegarInicio,
        ardillaFeliz: ardillaFeliz,
        pulsoFondo: pulsoFondo,
        chispas: chispasFiesta,
        lluviaHojas: lluviaHojas,
        finalCinematica: finalCinematica,
        fuegos: fuegos,
        reiniciarVista: reiniciarVista,
        miniatura: miniatura,
        aPantalla: aPantalla,
        mundoDePantalla: mundoDePantalla,
        mundoDeJuego: mundoDeJuego,
        puntoBellota: puntoBellota,
        zonaZoe: zonaZoe
    };
})(window);
