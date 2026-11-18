/**
 * EscenarioLaser — escena Phaser 4 de "El Circuito Láser de la Central de Energía" (window.EscenarioLaser).
 *
 * Un solo lienzo a pantalla completa detrás de la interfaz. La cámara encaja el mundo (ancho fijo, alto según la
 * pantalla) en el hueco que dejan la cabecera y la fila de abajo. Capas, de atrás hacia adelante:
 *   - la central: paredes metálicas con placas y remaches, rejilla del piso en perspectiva, tuberías de energía
 *     arriba y abajo con pulsos que corren hacia el reactor, tiras de luz azul/violeta, paneles de control con
 *     pantallas y luces que se encienden cuando la esfera pasa cerca, polvo luminoso que flota;
 *   - un velo oscuro que se aclara a medida que avanza la esfera (la central "se reactiva");
 *   - el circuito: sombra (está elevado), paredes de metal con remaches, carril oscuro con bordes de neón, flechas
 *     de luz que fluyen hacia el reactor y la estela del tramo ya recorrido;
 *   - las barreras láser: dos emisores con lámpara (roja encendida, verde apagada, ámbar a punto de encender), el
 *     rayo rojo con chispas y el contador 3, 2, 1 sobre el rayo;
 *   - el reactor central con su ventana de energía, anillos que giran y medidor de carga;
 *   - la esfera de luz neón (halo, núcleo, anillo orbital, estela) que es la protagonista.
 *
 * El movimiento y los choques los decide ReglasLaser.mover (geometría pura). Eventos para script.js:
 *   on({ avance, mueve, pared, laser, cruce, meta, acerca, estadoLaser, cuenta, panel })
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var R = global.ReglasLaser;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var ADD = "ADD";
    var CIAN = 0x22d3ee, AZUL = 0x38bdf8, VIOLETA = 0xa78bfa, ROJO = 0xff2d55, VERDE = 0x4ade80, AMBAR = 0xfbbf24;
    var NEON = [0x22d3ee, 0xa78bfa, 0xf472b6, 0xfacc15, 0x4ade80, 0x60a5fa, 0xffffff];

    var juego = null;
    var sc = null;
    var cfgJ = {};
    var listoPromesa = null;
    var dims = { W: 1600, H: 900 };
    var area = { left: 0, top: 0, width: 800, height: 600 };
    var ev = {};
    var RES = 1;

    var circ = null;            // circuito actual (ReglasLaser.construir)
    var objCirc = [];           // objetos del circuito (se destruyen al cambiar)
    var pistaImg = null, neonImg = null, rastroG = null, conectorG = null, etiquetaInicio = null;
    var chevrones = [];
    var rastroS = -1;
    var ayudaHasta = 0;

    var fondo = null;           // { img, dimsClave, tubos[], pulsos[], paneles[], polvo[], tiras[], velo, luz, energia, energiaObj, fiesta }
    var reactor = null;         // { base, halo, nucleo, anillos, medidor, etiqueta, x, y, carga, giro, extra }
    var esfera = null;          // { cont, sombra, halo, nucleo, anillo, brillo }
    var arcos = null;           // graphics de rayitos eléctricos
    var corriendoLaseres = true;
    var visCirc = 1;           // 1 visible, 0 oculto (también para lo que se repinta cada cuadro)

    var pil = {
        x: 0, y: 0, s: 0, maxS: 0, objetivo: null, offset: { x: 0, y: 0 }, ultimoPuntero: null,
        arrastrando: false, bloqueado: true, visible: false, auto: false, enMeta: false,
        vel: 0, empuje: 0, temblor: 0, tChoque: 0, tMov: 0
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
            try { f.apply(null, [].slice.call(arguments, 1)); } catch (e) { console.warn("[EscenarioLaser]", nombre, e); }
        }
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

    /** Destruye un objeto de Phaser después de ms (con setTimeout: funciona aunque la pestaña esté oculta). */
    function destruirLuego(o, ms) {
        setTimeout(function () { if (o && o.active) o.destroy(); }, ms);
    }

    // ------------------------------------------------------------------ texturas

    function texturaCanvas(clave, w, h, dibujar) {
        if (sc.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        dibujar(c.getContext("2d"), w, h);
        sc.textures.addCanvas(clave, c);
    }

    function reemplazarCanvas(clave, c) {
        if (sc.textures.exists(clave)) sc.textures.remove(clave);
        sc.textures.addCanvas(clave, c);
    }

    function radial(ctx, s, stops) {
        var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        stops.forEach(function (st) { g.addColorStop(st[0], st[1]); });
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
    }

    function redondeado(x, X, Y, w, h, r) {
        x.beginPath();
        x.moveTo(X + r, Y);
        x.arcTo(X + w, Y, X + w, Y + h, r);
        x.arcTo(X + w, Y + h, X, Y + h, r);
        x.arcTo(X, Y + h, X, Y, r);
        x.arcTo(X, Y, X + w, Y, r);
        x.closePath();
    }

    function texturasFx() {
        texturaCanvas("fx-halo", 128, 128, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-punto", 16, 16, function (ctx, s) {
            radial(ctx, s, [[0, "rgba(255,255,255,1)"], [0.5, "rgba(255,255,255,0.6)"], [1, "rgba(255,255,255,0)"]]);
        });
        texturaCanvas("fx-chispa", 32, 32, function (ctx) {
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            for (var i = 0; i < 8; i++) {
                var a = i * Math.PI / 4;
                var r = i % 2 === 0 ? 15 : 4;
                ctx.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        });
        texturaCanvas("fx-onda", 128, 128, function (ctx) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.arc(64, 64, 58, 0, Math.PI * 2);
            ctx.stroke();
        });
        texturaCanvas("fx-rayo", 256, 64, function (ctx, w, h) {
            var g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(0.32, "rgba(255,255,255,0.3)");
            g.addColorStop(0.5, "rgba(255,255,255,1)");
            g.addColorStop(0.68, "rgba(255,255,255,0.3)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            var g2 = ctx.createLinearGradient(0, 0, w, 0);
            g2.addColorStop(0, "rgba(0,0,0,1)");
            g2.addColorStop(0.06, "rgba(0,0,0,0)");
            g2.addColorStop(0.94, "rgba(0,0,0,0)");
            g2.addColorStop(1, "rgba(0,0,0,1)");
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = g2;
            ctx.fillRect(0, 0, w, h);
        });
        texturaCanvas("fx-blanco", 8, 8, function (ctx, w, h) {
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, w, h);
        });
        texturaCanvas("fx-chevron", 64, 64, function (ctx) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 10;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(22, 14);
            ctx.lineTo(42, 32);
            ctx.lineTo(22, 50);
            ctx.stroke();
        });
        texturaCanvas("fx-esfera", 128, 128, function (ctx, s) {
            radial(ctx, s, [[0, "#ffffff"], [0.22, "#e0fdff"], [0.48, "#67e8f9"], [0.72, "#0ea5e9"], [0.9, "#1d4ed8"], [1, "rgba(29,78,216,0)"]]);
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.beginPath();
            ctx.ellipse(46, 40, 16, 10, -0.6, 0, Math.PI * 2);
            ctx.fill();
        });
        texturaCanvas("fx-emisor", 56, 84, function (x) {
            var g = x.createLinearGradient(0, 0, 56, 0);
            g.addColorStop(0, "#475569");
            g.addColorStop(0.35, "#e2e8f0");
            g.addColorStop(0.7, "#94a3b8");
            g.addColorStop(1, "#334155");
            redondeado(x, 4, 4, 48, 76, 12);
            x.fillStyle = g;
            x.fill();
            x.lineWidth = 3;
            x.strokeStyle = "#1e293b";
            x.stroke();
            x.fillStyle = "#0f172a";
            redondeado(x, 16, 30, 24, 24, 6);
            x.fill();
            x.fillStyle = "#cbd5e1";
            [[12, 12], [44, 12], [12, 72], [44, 72]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 3, 0, Math.PI * 2); x.fill(); });
        });
        texturaCanvas("fx-aviso", 64, 58, function (x) {
            x.fillStyle = "#fbbf24";
            x.strokeStyle = "#78350f";
            x.lineWidth = 4;
            x.lineJoin = "round";
            x.beginPath();
            x.moveTo(32, 4);
            x.lineTo(60, 54);
            x.lineTo(4, 54);
            x.closePath();
            x.fill();
            x.stroke();
            x.fillStyle = "#1f2937";
            x.fillRect(29, 18, 6, 20);
            x.beginPath();
            x.arc(32, 45, 4, 0, Math.PI * 2);
            x.fill();
        });
        texturaCanvas("fx-panel", 168, 116, function (x) {
            var g = x.createLinearGradient(0, 0, 0, 116);
            g.addColorStop(0, "#334155");
            g.addColorStop(1, "#1e293b");
            redondeado(x, 3, 3, 162, 110, 14);
            x.fillStyle = g;
            x.fill();
            x.lineWidth = 4;
            x.strokeStyle = "#64748b";
            x.stroke();
            redondeado(x, 14, 12, 140, 66, 8);
            x.fillStyle = "#020617";
            x.fill();
            x.lineWidth = 2;
            x.strokeStyle = "#0e7490";
            x.stroke();
            for (var i = 0; i < 5; i++) {
                x.fillStyle = "#0f172a";
                x.beginPath();
                x.arc(28 + i * 28, 96, 7, 0, Math.PI * 2);
                x.fill();
            }
        });
        texturaCanvas("fx-reactor", 260, 330, function (x) {
            // base
            x.fillStyle = "#0f172a";
            x.beginPath();
            x.ellipse(130, 300, 118, 24, 0, 0, Math.PI * 2);
            x.fill();
            // cuerpo cilíndrico
            var g = x.createLinearGradient(20, 0, 240, 0);
            g.addColorStop(0, "#1e293b");
            g.addColorStop(0.25, "#94a3b8");
            g.addColorStop(0.45, "#e2e8f0");
            g.addColorStop(0.75, "#64748b");
            g.addColorStop(1, "#1e293b");
            x.fillStyle = g;
            x.fillRect(26, 50, 208, 248);
            x.beginPath();
            x.ellipse(130, 298, 104, 20, 0, 0, Math.PI);
            x.fill();
            // anillos de metal
            [92, 232].forEach(function (y) {
                x.fillStyle = "#475569";
                x.fillRect(20, y, 220, 16);
                x.fillStyle = "rgba(255,255,255,0.35)";
                x.fillRect(20, y, 220, 4);
            });
            // tapa superior
            var gt = x.createLinearGradient(0, 20, 0, 80);
            gt.addColorStop(0, "#e2e8f0");
            gt.addColorStop(1, "#64748b");
            x.fillStyle = gt;
            x.beginPath();
            x.ellipse(130, 50, 104, 26, 0, 0, Math.PI * 2);
            x.fill();
            x.strokeStyle = "#1e293b";
            x.lineWidth = 3;
            x.stroke();
            x.fillStyle = "#0f172a";
            x.beginPath();
            x.ellipse(130, 46, 46, 11, 0, 0, Math.PI * 2);
            x.fill();
            // ventana del núcleo
            x.fillStyle = "#020617";
            x.beginPath();
            x.arc(130, 165, 62, 0, Math.PI * 2);
            x.fill();
            x.lineWidth = 9;
            x.strokeStyle = "#334155";
            x.stroke();
            x.lineWidth = 3;
            x.strokeStyle = "#7dd3fc";
            x.beginPath();
            x.arc(130, 165, 56, 0, Math.PI * 2);
            x.stroke();
            // rejillas y remaches
            x.fillStyle = "#1e293b";
            for (var i = 0; i < 4; i++) {
                x.fillRect(46, 252 + i * 9, 50, 4);
                x.fillRect(164, 252 + i * 9, 50, 4);
            }
            x.fillStyle = "#cbd5e1";
            [[40, 70], [220, 70], [40, 214], [220, 214]].forEach(function (p) { x.beginPath(); x.arc(p[0], p[1], 5, 0, Math.PI * 2); x.fill(); });
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
        var H = clamp(Math.round(W * area.height / area.width), Number(cfgJ.altoMinimo) || 800, Number(cfgJ.altoMaximo) || 1100);
        return { W: W, H: H };
    }

    function zoomAjuste() {
        return Math.min(area.width / dims.W, area.height / dims.H);
    }

    function reacomodar() {
        if (!sc) return;
        sc.scale.updateBounds();
        medirArea();
        var cam = sc.cameras.main;
        var z = zoomAjuste();
        var cx = area.left + area.width / 2;
        var cy = area.top + area.height / 2;
        cam.setZoom(z);
        cam.centerOn(dims.W / 2 + (sc.scale.width / 2 - cx) / z, dims.H / 2 + (sc.scale.height / 2 - cy) / z);
        ajustarMarco();
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

    // ------------------------------------------------------------------ la central (fondo)

    var marco = null;

    /** El color del lienzo fuera del mundo: paredes oscuras de la central (no se ve un hueco en tabletas). */
    function ajustarMarco() {
        if (!marco || !sc) return;
        var v = vista();
        var w = sc.scale.width / v.z, h = sc.scale.height / v.z;
        marco.setPosition(v.x0 + w / 2, v.y0 + h / 2);
        marco.setDisplaySize(w + 8, h + 8);
    }

    function lienzoFondo(W, H) {
        var c = document.createElement("canvas");
        c.width = Math.round(W * RES);
        c.height = Math.round(H * RES);
        var x = c.getContext("2d");
        x.scale(RES, RES);
        // pared del fondo
        var g = x.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#131c4a");
        g.addColorStop(0.55, "#0e1640");
        g.addColorStop(1, "#080d2a");
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);
        // placas metálicas con remaches
        var pw = 200, ph = 150;
        for (var py = 0; py < H; py += ph) {
            for (var px = (py / ph) % 2 ? -100 : 0; px < W; px += pw) {
                var tono = 0.04 + ((px * 7 + py * 3) % 5) * 0.01;
                x.fillStyle = "rgba(148,163,214," + tono + ")";
                x.fillRect(px + 3, py + 3, pw - 6, ph - 6);
                x.strokeStyle = "rgba(5,8,30,0.7)";
                x.lineWidth = 3;
                x.strokeRect(px + 1.5, py + 1.5, pw - 3, ph - 3);
                x.strokeStyle = "rgba(160,180,255,0.08)";
                x.lineWidth = 1;
                x.strokeRect(px + 5, py + 5, pw - 10, ph - 10);
                x.fillStyle = "rgba(190,205,255,0.22)";
                [[12, 12], [pw - 12, 12], [12, ph - 12], [pw - 12, ph - 12]].forEach(function (r) {
                    x.beginPath();
                    x.arc(px + r[0], py + r[1], 3, 0, Math.PI * 2);
                    x.fill();
                });
            }
        }
        // rejilla del piso en perspectiva (profundidad), hacia un punto de fuga en el reactor
        var fx = W * 0.93, fy = H * 0.35;
        x.strokeStyle = "rgba(56,189,248,0.07)";
        x.lineWidth = 2;
        for (var k = -8; k <= 18; k++) {
            x.beginPath();
            x.moveTo(fx, fy);
            x.lineTo(k * W / 10, H + 40);
            x.stroke();
        }
        for (var j = 1; j < 9; j++) {
            var yy = fy + (H - fy) * Math.pow(j / 8, 1.8);
            x.beginPath();
            x.moveTo(0, yy);
            x.lineTo(W, yy);
            x.stroke();
        }
        // tuberías (cuerpo); los pulsos se mueven encima
        tubosDe(W, H).forEach(function (t) {
            x.lineCap = "round";
            x.lineJoin = "round";
            [[t.grosor + 6, "#0b1024"], [t.grosor, "#475569"], [t.grosor * 0.55, "#64748b"], [t.grosor * 0.18, "rgba(226,232,240,0.6)"]].forEach(function (capa) {
                x.strokeStyle = capa[1];
                x.lineWidth = capa[0];
                x.beginPath();
                t.puntos.forEach(function (p, i) { if (i) x.lineTo(p.x, p.y); else x.moveTo(p.x, p.y); });
                x.stroke();
            });
            // abrazaderas
            x.fillStyle = "#1e293b";
            for (var s = 60; s < t.largo; s += 160) {
                var p = puntoTubo(t, s);
                x.save();
                x.translate(p.x, p.y);
                x.rotate(p.ang);
                x.fillRect(-6, -t.grosor / 2 - 5, 12, t.grosor + 10);
                x.restore();
            }
        });
        // viñeta: profundidad hacia las esquinas
        var v = x.createRadialGradient(W * 0.55, H * 0.5, Math.min(W, H) * 0.3, W * 0.55, H * 0.5, Math.max(W, H) * 0.8);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,10,0.55)");
        x.fillStyle = v;
        x.fillRect(0, 0, W, H);
        return c;
    }

    /** Tuberías: arriba y abajo, de la izquierda hasta el reactor. */
    function tubosDe(W, H) {
        var rx = W * 0.935;
        var lista = [
            [{ x: -20, y: H * 0.04 }, { x: rx - 40, y: H * 0.04 }, { x: rx - 40, y: H * 0.16 }],
            [{ x: -20, y: H * 0.965 }, { x: rx + 40, y: H * 0.965 }, { x: rx + 40, y: H * 0.86 }]
        ];
        return lista.map(function (pts, i) {
            var largo = 0;
            for (var k = 1; k < pts.length; k++) largo += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
            return { puntos: pts, largo: largo, grosor: i === 0 ? 20 : 24 };
        });
    }

    function puntoTubo(t, s) {
        var resto = clamp(s, 0, t.largo);
        for (var k = 1; k < t.puntos.length; k++) {
            var a = t.puntos[k - 1], b = t.puntos[k];
            var l = Math.hypot(b.x - a.x, b.y - a.y);
            if (resto <= l || k === t.puntos.length - 1) {
                var u = l ? clamp(resto / l, 0, 1) : 0;
                return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, ang: Math.atan2(b.y - a.y, b.x - a.x) };
            }
            resto -= l;
        }
        return { x: 0, y: 0, ang: 0 };
    }

    function crearFondo(W, H) {
        var clave = W + "x" + H;
        if (fondo && fondo.clave === clave) return;
        var energiaPrev = fondo ? fondo.energia : 0;
        if (fondo) {
            [fondo.img, fondo.velo, fondo.luz].concat(fondo.pulsos.map(function (p) { return p.img; }), fondo.polvo.map(function (p) { return p.img; }),
                fondo.tiras.map(function (t) { return t.img; })).forEach(function (o) { if (o) o.destroy(); });
            fondo.paneles.forEach(function (p) { p.objs.forEach(function (o) { o.destroy(); }); });
        }
        reemplazarCanvas("fondo-central", lienzoFondo(W, H));
        fondo = { clave: clave, tubos: tubosDe(W, H), pulsos: [], paneles: [], polvo: [], tiras: [], energia: energiaPrev, energiaObj: energiaPrev, fiesta: 0 };
        fondo.img = sc.add.image(0, 0, "fondo-central").setOrigin(0).setScale(1 / RES).setDepth(0);
        // tiras de luz: debajo del tubo de arriba y encima del de abajo
        [H * 0.085, H * 0.92].forEach(function (y, i) {
            var img = sc.add.image(W * 0.47, y, "fx-rayo").setDisplaySize(W * 0.92, 26).setBlendMode(ADD).setDepth(1).setTint(VIOLETA).setAlpha(0.35);
            fondo.tiras.push({ img: img, fase: i * 1.7 });
        });
        // pulsos de energía en los tubos
        fondo.tubos.forEach(function (t, k) {
            for (var i = 0; i < 7; i++) {
                var img = sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setDepth(1).setTint(k ? VIOLETA : CIAN);
                img.setDisplaySize(t.grosor * 2.6, t.grosor * 1.3);
                fondo.pulsos.push({ img: img, tubo: t, s: (i / 7) * t.largo });
            }
        });
        // polvo luminoso
        for (var p = 0; p < 34; p++) {
            var d = sc.add.image(Math.random() * W, Math.random() * H, "fx-punto").setBlendMode(ADD).setDepth(1)
                .setTint(Math.random() < 0.5 ? AZUL : VIOLETA).setAlpha(0.3 + Math.random() * 0.4).setScale(0.5 + Math.random() * 0.9);
            fondo.polvo.push({ img: d, vy: -(6 + Math.random() * 16), vx: (Math.random() - 0.5) * 8, fase: Math.random() * 6 });
        }
        fondo.velo = sc.add.image(W / 2, H / 2, "fx-blanco").setDisplaySize(W + 4, H + 4).setTint(0x020414).setAlpha(0.5).setDepth(3);
        fondo.luz = sc.add.image(W / 2, H / 2, "fx-blanco").setDisplaySize(W + 4, H + 4).setTint(0x7dd3fc).setBlendMode(ADD).setAlpha(0).setDepth(30);
    }

    /** Paneles de control en los huecos que deja el circuito (no pisan el carril, ni el reactor, ni la salida). */
    function crearPaneles(c) {
        fondo.paneles.forEach(function (p) { p.objs.forEach(function (o) { o.destroy(); }); });
        fondo.paneles = [];
        var W = c.W, H = c.H;
        var libre = function (x, y) {
            if (x < 110 || x > W * 0.84 || y < H * 0.13 + 60 || y > H * 0.87 - 60) return false;
            if (Math.hypot(x - c.inicio.x, y - c.inicio.y) < 220) return false;
            var cer = R.cercano(c, x, y, null, null);
            return cer.d > c.ancho / 2 + c.pared + 96;
        };
        var puestos = [];
        var cand = [];
        for (var y = H * 0.15; y < H * 0.88; y += 40) {
            for (var x = 110; x < W * 0.85; x += 40) if (libre(x, y)) cand.push({ x: x, y: y, d: R.cercano(c, x, y, null, null).d });
        }
        cand.sort(function (a, b) { return b.d - a.d; });
        cand.forEach(function (p) {
            if (puestos.length >= 7) return;
            if (puestos.some(function (q) { return Math.hypot(q.x - p.x, q.y - p.y) < 300; })) return;
            puestos.push(p);
        });
        puestos.forEach(function (p, k) {
            var marcoP = sc.add.image(p.x, p.y, "fx-panel").setDepth(2).setScale(0.9);
            var brillo = sc.add.image(p.x, p.y - 9, "fx-blanco").setDisplaySize(124, 58).setBlendMode(ADD).setTint(CIAN).setAlpha(0.06).setDepth(2);
            var g = sc.add.graphics().setDepth(2).setBlendMode(ADD);
            var leds = [];
            for (var i = 0; i < 5; i++) {
                leds.push(sc.add.image(p.x - 50 + i * 25, p.y + 33, "fx-halo").setBlendMode(ADD).setDepth(2).setDisplaySize(22, 22).setTint(NEON[(i + k) % 5]).setAlpha(0.15));
            }
            var aura = sc.add.image(p.x, p.y, "fx-halo").setBlendMode(ADD).setDepth(1).setDisplaySize(320, 240).setTint(k % 2 ? VIOLETA : CIAN).setAlpha(0);
            var barras = [];
            for (var b = 0; b < 9; b++) barras.push(Math.random());
            fondo.paneles.push({
                x: p.x, y: p.y, k: k, luz: 0, encendido: false, fijo: 0, barras: barras, fase: Math.random() * 6,
                marco: marcoP, brillo: brillo, g: g, leds: leds, aura: aura, objs: [marcoP, brillo, g, aura].concat(leds)
            });
        });
    }

    function actualizarFondo(t, dt) {
        if (!fondo) return;
        var f = fondo;
        f.energia += (f.energiaObj - f.energia) * Math.min(1, dt / 600);
        var e = clamp(f.energia + f.fiesta, 0, 1.4);
        var s = t / 1000;
        f.velo.setAlpha(clamp(0.5 - e * 0.42, 0, 0.5));
        f.tiras.forEach(function (tira) {
            tira.img.setAlpha(0.22 + e * 0.35 + 0.1 * Math.sin(s * 2 + tira.fase));
            tira.img.setTint(e > 0.55 ? CIAN : VIOLETA);
        });
        var vel = 70 + e * 260;
        f.pulsos.forEach(function (p) {
            p.s += vel * dt / 1000;
            if (p.s > p.tubo.largo) p.s -= p.tubo.largo;
            var q = puntoTubo(p.tubo, p.s);
            p.img.setPosition(q.x, q.y).setRotation(q.ang).setAlpha(0.25 + e * 0.6);
        });
        var W = circ ? circ.W : dims.W, H = circ ? circ.H : dims.H;
        f.polvo.forEach(function (d) {
            d.img.y += d.vy * dt / 1000 * (1 + e);
            d.img.x += d.vx * dt / 1000 + Math.sin(s + d.fase) * 0.1;
            if (d.img.y < -10) { d.img.y = H + 10; d.img.x = Math.random() * W; }
        });
        f.paneles.forEach(function (p) {
            var cerca = pil.visible && Math.hypot(pil.x - p.x, pil.y - p.y) < 300;
            var obj = Math.max(p.fijo, cerca ? 1 : 0, e * 0.35);
            if (cerca && !p.encendido) {
                p.encendido = true;
                emitir("panel", p.k);
            } else if (!cerca && p.encendido && Math.hypot(pil.x - p.x, pil.y - p.y) > 360) {
                p.encendido = false;
            }
            p.luz += (obj - p.luz) * Math.min(1, dt / 220);
            var L = p.luz;
            p.brillo.setAlpha(0.05 + L * 0.3);
            p.aura.setAlpha(L * 0.35);
            p.leds.forEach(function (led, i) {
                var parpadeo = 0.5 + 0.5 * Math.sin(s * (3 + i) + p.fase + i);
                led.setAlpha(0.12 + L * (0.35 + 0.5 * parpadeo));
            });
            // pantalla: barras de energía que suben y bajan
            p.g.clear();
            for (var b = 0; b < p.barras.length; b++) {
                p.barras[b] = clamp(p.barras[b] + (Math.random() - 0.5) * 0.12 * (0.3 + L), 0.1, 1);
                var hb = 50 * p.barras[b] * (0.3 + L * 0.7);
                p.g.fillStyle(b % 3 === 0 ? VIOLETA : CIAN, 0.25 + L * 0.6);
                p.g.fillRect(p.x - 56 + b * 12.5, p.y + 16 - hb - 9, 8, hb);
            }
        });
    }

    function pulsoFondo(fuerza) {
        if (!fondo) return;
        fondo.fiesta = Math.max(fondo.fiesta, fuerza || 0.5);
        animar(900, function (e) { fondo.fiesta = (fuerza || 0.5) * (1 - e); });
        fondo.paneles.forEach(function (p, i) {
            setTimeout(function () { p.luz = 1; }, i * 70);
        });
    }

    // ------------------------------------------------------------------ circuito

    function trazar(x, c, escala) {
        var m = c.muestras;
        x.beginPath();
        x.moveTo(m[0].x * escala, m[0].y * escala);
        for (var i = 2; i < m.length; i += 2) x.lineTo(m[i].x * escala, m[i].y * escala);
        x.lineTo(m[m.length - 1].x * escala, m[m.length - 1].y * escala);
    }

    function lienzoCircuito(c) {
        var cv = document.createElement("canvas");
        cv.width = Math.round(c.W * RES);
        cv.height = Math.round(c.H * RES);
        var x = cv.getContext("2d");
        x.scale(RES, RES);
        x.lineCap = "round";
        x.lineJoin = "round";
        var w = c.ancho, p = c.pared;
        // sombra: el circuito está elevado sobre el piso
        x.save();
        x.translate(0, 14);
        trazar(x, c, 1);
        x.strokeStyle = "rgba(0,0,12,0.55)";
        x.lineWidth = w + p * 2 + 12;
        x.stroke();
        x.restore();
        // paredes de metal (contorno, metal, brillo) y bordes de neón
        [[w + p * 2 + 4, "#0b1024"], [w + p * 2, "#64748b"], [w + p * 2 - 5, "#94a3b8"], [w + p * 2 - 11, "#475569"], [w + 6, "#0e7490"], [w, "#0a1433"], [w - 14, "#0d1a42"]].forEach(function (capa) {
            trazar(x, c, 1);
            x.strokeStyle = capa[1];
            x.lineWidth = capa[0];
            x.stroke();
        });
        // línea central punteada
        x.setLineDash([12, 20]);
        trazar(x, c, 1);
        x.strokeStyle = "rgba(125,211,252,0.18)";
        x.lineWidth = 3;
        x.stroke();
        x.setLineDash([]);
        // remaches de la pared
        x.fillStyle = "#cbd5e1";
        for (var s = 20; s < c.largo - 10; s += 64) {
            var q = R.puntoEn(c, s);
            var nx = Math.cos(q.ang - Math.PI / 2), ny = Math.sin(q.ang - Math.PI / 2);
            [1, -1].forEach(function (lado) {
                var rx = q.x + nx * lado * (w / 2 + p / 2), ry = q.y + ny * lado * (w / 2 + p / 2);
                var cer = R.cercano(c, rx, ry, null, null);
                if (cer.d < w / 2 + p * 0.3) return; // en la curva interior la pared es más angosta
                x.beginPath();
                x.arc(rx, ry, 2.6, 0, Math.PI * 2);
                x.fill();
            });
        }
        // plataforma de salida
        var i0 = c.inicio;
        x.fillStyle = "#0c4a6e";
        x.beginPath();
        x.arc(i0.x, i0.y, w * 0.42, 0, Math.PI * 2);
        x.fill();
        x.lineWidth = 4;
        x.strokeStyle = "#38bdf8";
        x.stroke();
        // conector del reactor (enchufe)
        var mt = c.meta;
        x.save();
        x.translate(mt.x, mt.y);
        x.rotate(mt.ang);
        x.fillStyle = "#334155";
        redondeado(x, -w * 0.15, -w / 2 - p, w * 0.5, w + p * 2, 10);
        x.fill();
        x.fillStyle = "#020617";
        redondeado(x, -w * 0.05, -w * 0.36, w * 0.36, w * 0.72, 12);
        x.fill();
        x.restore();
        return cv;
    }

    function lienzoNeon(c) {
        var cv = document.createElement("canvas");
        cv.width = Math.round(c.W * RES);
        cv.height = Math.round(c.H * RES);
        var x = cv.getContext("2d");
        x.scale(RES, RES);
        x.lineCap = "round";
        x.lineJoin = "round";
        trazar(x, c, 1);
        x.strokeStyle = "#ffffff";
        x.lineWidth = c.ancho + 7;
        x.stroke();
        x.globalCompositeOperation = "destination-out";
        trazar(x, c, 1);
        x.lineWidth = c.ancho - 1;
        x.stroke();
        return cv;
    }

    function guardar(o) {
        objCirc.push(o);
        return o;
    }

    function descargar() {
        objCirc.forEach(function (o) { if (o && o.destroy) o.destroy(); });
        objCirc = [];
        chevrones = [];
        pistaImg = neonImg = rastroG = conectorG = etiquetaInicio = null;
    }

    function crearChevrones(c) {
        var paso = c.ancho * 0.85;
        for (var s = c.ancho * 1.1; s < c.largo - c.ancho * 0.9; s += paso) {
            if (c.laseres.some(function (L) { return Math.abs(L.s - s) < c.ancho * 0.6; })) continue;
            var q = R.puntoEn(c, s);
            var img = guardar(sc.add.image(q.x, q.y, "fx-chevron").setRotation(q.ang).setBlendMode(ADD).setDepth(8).setTint(CIAN)
                .setDisplaySize(c.ancho * 0.36, c.ancho * 0.36).setAlpha(0));
            chevrones.push({ img: img, s: s, extra: 0 });
        }
    }

    function crearLaseres(c) {
        c.laseres.forEach(function (L) {
            var a = L.ang + Math.PI / 2;
            var nx = Math.cos(a), ny = Math.sin(a);
            var media = c.ancho / 2 + c.pared * 0.5;
            var v = { lamparas: [], emisores: [], avisos: [] };
            [-1, 1].forEach(function (lado) {
                var ex = L.x + nx * lado * media, ey = L.y + ny * lado * media;
                var em = guardar(sc.add.image(ex, ey, "fx-emisor").setRotation(L.ang).setDepth(11).setDisplaySize(c.pared * 2.3, c.pared * 3.4));
                var lam = guardar(sc.add.image(ex, ey, "fx-halo").setBlendMode(ADD).setDepth(12).setDisplaySize(c.pared * 3.2, c.pared * 3.2).setTint(ROJO));
                var av = guardar(sc.add.image(ex + nx * lado * c.pared * 2.6, ey + ny * lado * c.pared * 2.6, "fx-aviso").setDepth(12)
                    .setDisplaySize(c.pared * 2.4, c.pared * 2.2).setAlpha(0));
                v.emisores.push(em);
                v.lamparas.push(lam);
                v.avisos.push(av);
            });
            var largoRayo = c.ancho + c.pared * 0.6;
            v.resplandor = guardar(sc.add.image(L.x, L.y, "fx-rayo").setRotation(a).setBlendMode(ADD).setDepth(11).setTint(ROJO)
                .setDisplaySize(largoRayo, c.banda * 3.2));
            v.rayo = guardar(sc.add.image(L.x, L.y, "fx-rayo").setRotation(a).setBlendMode(ADD).setDepth(11).setTint(0xff6b81)
                .setDisplaySize(largoRayo, c.banda * 1.1));
            v.nucleo = guardar(sc.add.image(L.x, L.y, "fx-rayo").setRotation(a).setBlendMode(ADD).setDepth(11).setTint(0xffffff)
                .setDisplaySize(largoRayo * 0.98, c.banda * 0.35));
            // paso libre: línea verde punteada y flecha
            v.libre = guardar(sc.add.graphics().setDepth(10).setBlendMode(ADD));
            v.libre.lineStyle(4, VERDE, 0.9);
            for (var k = -c.ancho / 2 + 6; k < c.ancho / 2 - 6; k += 16) {
                v.libre.beginPath();
                v.libre.moveTo(L.x + nx * k, L.y + ny * k);
                v.libre.lineTo(L.x + nx * (k + 8), L.y + ny * (k + 8));
                v.libre.strokePath();
            }
            v.libre.setAlpha(0);
            // contador 3, 2, 1 junto a la barrera, del lado de afuera con más espacio libre (no tapa el rayo ni el carril)
            var mejor = null;
            [-1, 1].forEach(function (lado) {
                var d = media + c.pared * 0.5 + 40;
                var px = L.x + nx * lado * d, py = L.y + ny * lado * d;
                var libre = R.cercano(c, px, py, null, null).d;
                var dentro = px > 40 && px < c.W - 40 && py > 40 && py < c.H - 40;
                if (dentro && (!mejor || libre > mejor.libre)) mejor = { x: px, y: py, libre: libre };
            });
            if (!mejor) mejor = { x: L.x, y: L.y };
            v.placa = guardar(sc.add.graphics().setDepth(14));
            v.placa.setPosition(mejor.x, mejor.y);
            v.texto = guardar(sc.add.text(mejor.x, mejor.y, "", {
                fontFamily: "Fredoka, sans-serif", fontSize: "40px", fontStyle: "bold", color: "#ffffff", stroke: "#be123c", strokeThickness: 6
            }).setOrigin(0.5).setDepth(15));
            v.placa.setAlpha(0);
            v.texto.setAlpha(0);
            v.ultimaCuenta = -1;
            v.encendido = null;
            v.ya = 0;
            v.chispaT = 0;
            v.flash = 0;
            L.vis = v;
            L.reloj = R.relojLaser(L);
            L.est = R.estadoLaser(L, L.reloj);
            L.superado = false;
            L.cerca = false;
        });
    }

    function actualizarLaseres(t, dt) {
        if (!circ) return;
        var s = t / 1000;
        circ.laseres.forEach(function (L) {
            var v = L.vis;
            if (!v) return;
            var est = L.est;
            var on = est.on;
            var cerca = cercania(L);
            var titila = 0.85 + 0.15 * Math.sin(s * 40 + L.id) * Math.sin(s * 23);
            v.flash = Math.max(0, v.flash - dt / 400);
            var aOn = on ? titila : 0;
            var k0 = visCirc;
            v.resplandor.setAlpha((aOn * 0.55 + v.flash * 0.5) * k0);
            v.rayo.setAlpha(aOn * 0.9 * k0);
            v.nucleo.setAlpha(aOn * k0);
            v.libre.setAlpha((on ? 0 : 0.55 + 0.3 * Math.sin(s * 5)) * k0);
            v.emisores.forEach(function (em) { em.setAlpha(k0); });
            var color = on ? ROJO : (est.avisoEncender ? (Math.floor(s * 6) % 2 ? AMBAR : 0x7c5a10) : VERDE);
            v.lamparas.forEach(function (l) { l.setTint(color).setAlpha((on ? 0.95 : 0.8) * k0); });
            var avisar = (on && L.cerca) || est.avisoEncender && cerca > 0.3;
            v.avisos.forEach(function (a) { a.setAlpha((avisar ? (Math.floor(s * 4) % 2 ? 1 : 0.35) : 0) * k0); });
            // contador
            var texto = "";
            var verPlaca = 0;
            if (on && est.cuenta > 0) {
                texto = String(est.cuenta);
                verPlaca = 1;
            } else if (!on && v.ya > 0) {
                texto = global.EscenarioLaser.textoYa || "¡YA!";
                verPlaca = 1;
            }
            v.ya = Math.max(0, v.ya - dt);
            if (texto !== v.texto.text) {
                v.texto.setText(texto);
                v.texto.setColor(on ? "#ffffff" : "#ecfccb");
                v.texto.setStroke(on ? "#be123c" : "#15803d", 6);
                v.placa.clear();
                v.placa.fillStyle(0x0b1024, 0.92);
                var ancho = texto.length > 1 ? 104 : 60;
                v.placa.fillRoundedRect(-ancho / 2, -30, ancho, 60, 16);
                v.placa.lineStyle(4, on ? ROJO : VERDE, 1);
                v.placa.strokeRoundedRect(-ancho / 2, -30, ancho, 60, 16);
                v.pop = 1;
            }
            v.pop = Math.max(0, (v.pop || 0) - dt / 260);
            var escala = (L.cerca && on ? 1.25 : 0.9) + v.pop * 0.35 + (L.cerca && on ? 0.06 * Math.sin(s * 8) : 0);
            v.placa.setAlpha(verPlaca * (L.cerca || !on ? 1 : 0.75) * k0).setScale(escala);
            v.texto.setAlpha(verPlaca * k0).setScale(escala);
            // chispas eléctricas del rayo encendido
            if (on && !reducido && visCirc > 0.5) {
                v.chispaT -= dt;
                if (v.chispaT <= 0) {
                    v.chispaT = 90 + Math.random() * 120;
                    var a = L.ang + Math.PI / 2;
                    var k = (Math.random() - 0.5) * circ.ancho;
                    chispa(L.x + Math.cos(a) * k, L.y + Math.sin(a) * k, Math.random() < 0.6 ? ROJO : 0xffffff, 0.6 + cerca * 0.4);
                }
            }
        });
    }

    function cercania(L) {
        if (!circ || !pil.visible) return 0;
        return clamp(1 - Math.hypot(pil.x - L.x, pil.y - L.y) / (circ.ancho * 5), 0, 1);
    }

    /** Zumbido de los láseres para el sonido (0..1): los encendidos, según qué tan cerca está la esfera. */
    function zumbidoLaser() {
        if (!circ) return 0;
        var v = 0;
        circ.laseres.forEach(function (L) { if (L.est && L.est.on) v = Math.max(v, 0.15 + cercania(L) * 0.85); });
        return v;
    }

    // ------------------------------------------------------------------ reactor

    function crearReactor() {
        reactor = { carga: 0, cargaObj: 0, giro: 0, extra: 0, x: 0, y: 0 };
        reactor.aura = sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setDepth(9).setTint(CIAN).setAlpha(0.2);
        reactor.base = sc.add.image(0, 0, "fx-reactor").setDepth(10);
        reactor.halo = sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setDepth(10).setTint(AZUL);
        reactor.nucleo = sc.add.image(0, 0, "fx-esfera").setBlendMode(ADD).setDepth(10);
        reactor.anillos = sc.add.graphics().setDepth(10).setBlendMode(ADD);
        reactor.medidor = sc.add.graphics().setDepth(10);
        reactor.etiqueta = sc.add.text(0, 0, "REACTOR CENTRAL", {
            fontFamily: "Fredoka, sans-serif", fontSize: "22px", fontStyle: "bold", color: "#e0f2fe", stroke: "#0b1024", strokeThickness: 6
        }).setOrigin(0.5).setDepth(16);
    }

    function ubicarReactor(c) {
        var esc = 0.78;
        reactor.x = c.W * 0.935;
        reactor.y = clamp(c.meta.y - 30, 190, c.H - 150);
        reactor.esc = esc;
        reactor.base.setPosition(reactor.x, reactor.y).setScale(esc);
        reactor.ventana = { x: reactor.x, y: reactor.y + (165 - 165) * esc };
        // la ventana del núcleo está a 165 px del alto 330 → al centro vertical de la imagen
        reactor.ventana.y = reactor.y + (165 - 330 / 2) * esc;
        reactor.halo.setPosition(reactor.ventana.x, reactor.ventana.y);
        reactor.nucleo.setPosition(reactor.ventana.x, reactor.ventana.y);
        reactor.aura.setPosition(reactor.x, reactor.y).setDisplaySize(520, 520);
        reactor.etiqueta.setPosition(reactor.x, reactor.y - 330 * esc / 2 - 20);
    }

    function actualizarReactor(t, dt) {
        if (!reactor || !circ) return;
        var r = reactor;
        r.carga += (r.cargaObj - r.carga) * Math.min(1, dt / 500);
        var c = clamp(r.carga + r.extra, 0, 1.6);
        var s = t / 1000;
        r.giro += dt / 1000 * (0.8 + c * 4);
        var late = 0.85 + 0.15 * Math.sin(s * (2 + c * 6));
        var rv = 56 * r.esc;
        r.halo.setDisplaySize(rv * (2.2 + c * 2.4) * late, rv * (2.2 + c * 2.4) * late).setAlpha(0.25 + c * 0.6);
        r.nucleo.setDisplaySize(rv * (0.6 + c * 1.1), rv * (0.6 + c * 1.1)).setAlpha(0.25 + c * 0.75).setRotation(s);
        r.aura.setAlpha(0.08 + c * 0.35).setDisplaySize(420 + c * 260, 420 + c * 260);
        r.anillos.clear();
        for (var k = 0; k < 2; k++) {
            var a = r.giro * (k ? -1.3 : 1) + k;
            var ancho = rv * (2.3 + k * 0.5) * Math.abs(Math.cos(a));
            r.anillos.lineStyle(3, k ? VIOLETA : CIAN, 0.25 + c * 0.6);
            r.anillos.strokeEllipse(r.ventana.x, r.ventana.y, Math.max(6, ancho), rv * (2.3 + k * 0.5));
        }
        // medidor de carga a un lado del reactor
        var mx = r.x - 118 * r.esc, my = r.y - 70 * r.esc, mh = 150 * r.esc;
        r.medidor.clear();
        r.medidor.fillStyle(0x0b1024, 0.9);
        r.medidor.fillRoundedRect(mx - 9, my - 4, 18, mh + 8, 8);
        r.medidor.fillStyle(c > 0.95 ? VERDE : CIAN, 1);
        var hc = mh * clamp(r.carga, 0, 1);
        r.medidor.fillRoundedRect(mx - 5, my + mh - hc, 10, Math.max(2, hc), 4);
        r.medidor.lineStyle(2, 0x94a3b8, 1);
        r.medidor.strokeRoundedRect(mx - 9, my - 4, 18, mh + 8, 8);
    }

    // ------------------------------------------------------------------ esfera de luz

    function crearEsfera() {
        esfera = {};
        esfera.sombra = sc.add.image(0, 0, "fx-halo").setTint(0x000000).setAlpha(0.5).setDepth(12);
        esfera.halo = sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setTint(AZUL).setDepth(12);
        esfera.nucleo = sc.add.image(0, 0, "fx-esfera").setDepth(12);
        esfera.corazon = sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setTint(0xe0fdff).setDepth(12);
        esfera.anillo = sc.add.graphics().setDepth(12).setBlendMode(ADD);
        esfera.brillo = sc.add.image(0, 0, "fx-chispa").setBlendMode(ADD).setDepth(12).setTint(0xffffff);
        arcos = sc.add.graphics().setDepth(13).setBlendMode(ADD);
        esfera.estelaT = 0;
        esfera.escala = 0;
        esfera.extra = 0;
    }

    function actualizarEsfera(t, dt) {
        if (!esfera) return;
        var vis = pil.visible && circ;
        var obj = vis ? 1 : 0;
        esfera.escala += (obj - esfera.escala) * Math.min(1, dt / 160);
        var e = esfera.escala;
        var r = circ ? circ.radio : 28;
        var s = t / 1000;
        pil.temblor = Math.max(0, pil.temblor - dt / 450);
        var jx = pil.temblor ? (Math.random() - 0.5) * r * 0.5 * pil.temblor : 0;
        var jy = pil.temblor ? (Math.random() - 0.5) * r * 0.5 * pil.temblor : 0;
        var x = pil.x + jx, y = pil.y + jy;
        var late = 1 + 0.07 * Math.sin(s * 5) + esfera.extra * 0.4;
        esfera.extra = Math.max(0, esfera.extra - dt / 600);
        esfera.sombra.setPosition(pil.x + 4, pil.y + r * 0.7).setDisplaySize(r * 2.2 * e, r * 0.9 * e).setAlpha(0.45 * e);
        esfera.halo.setPosition(x, y).setDisplaySize(r * 6.2 * late * e, r * 6.2 * late * e).setAlpha(0.95 * e);
        esfera.nucleo.setPosition(x, y).setDisplaySize(r * 2.4 * e, r * 2.4 * e).setAlpha(e);
        esfera.corazon.setPosition(x, y).setDisplaySize(r * 2.2 * late * e, r * 2.2 * late * e).setAlpha(0.85 * e);
        esfera.brillo.setPosition(x, y).setRotation(s * 2).setDisplaySize(r * 1.3 * e * late, r * 1.3 * e * late).setAlpha(0.65 * e);
        esfera.anillo.clear();
        if (e > 0.05) {
            var a = s * 3;
            esfera.anillo.lineStyle(3, CIAN, 0.8 * e);
            esfera.anillo.strokeEllipse(x, y, r * 2.9 * e, r * 2.9 * e * Math.abs(Math.sin(a)) + 3);
            esfera.anillo.lineStyle(2, VIOLETA, 0.6 * e);
            esfera.anillo.strokeEllipse(x, y, r * 2.9 * e * Math.abs(Math.cos(a * 0.7)) + 3, r * 2.9 * e);
            // electrón que orbita
            var ox = x + Math.cos(a * 1.6) * r * 1.45, oy = y + Math.sin(a * 1.6) * r * 0.55;
            esfera.anillo.fillStyle(0xffffff, 0.9 * e);
            esfera.anillo.fillCircle(ox, oy, 3.5);
        }
        // estela al moverse
        if (vis && pil.empuje > 0.08 && !reducido) {
            esfera.estelaT -= dt;
            if (esfera.estelaT <= 0) {
                esfera.estelaT = 30;
                var d = sc.add.image(pil.x + (Math.random() - 0.5) * r * 0.6, pil.y + (Math.random() - 0.5) * r * 0.6, "fx-punto")
                    .setBlendMode(ADD).setDepth(11).setTint(Math.random() < 0.7 ? CIAN : 0xffffff).setScale(1.2 + pil.empuje * 1.6).setAlpha(0.8);
                sc.tweens.add({ targets: d, alpha: 0, scale: 0.2, duration: 520, onComplete: function () { d.destroy(); } });
                destruirLuego(d, 900);
            }
        }
        // rayitos eléctricos (choques)
        arcos.clear();
        if (pil.temblor > 0.05 && vis) {
            arcos.lineStyle(3, Math.random() < 0.5 ? 0xffffff : AZUL, pil.temblor);
            for (var k = 0; k < 4; k++) {
                var ang = Math.random() * Math.PI * 2;
                var px = x + Math.cos(ang) * r * 0.9, py = y + Math.sin(ang) * r * 0.9;
                arcos.beginPath();
                arcos.moveTo(px, py);
                for (var j = 1; j <= 3; j++) {
                    var rr = r * (0.9 + j * 0.35);
                    arcos.lineTo(x + Math.cos(ang + (Math.random() - 0.5) * 0.6) * rr, y + Math.sin(ang + (Math.random() - 0.5) * 0.6) * rr);
                }
                arcos.strokePath();
            }
        }
    }

    // ------------------------------------------------------------------ circuito: luces, estela y flechas

    function dibujarRastro() {
        if (!rastroG || !circ) return;
        if (Math.abs(pil.maxS - rastroS) < 6) return;
        rastroS = pil.maxS;
        rastroG.clear();
        if (pil.maxS < 4) return;
        [[circ.ancho * 0.5, CIAN, 0.12], [circ.ancho * 0.2, AZUL, 0.3], [circ.ancho * 0.06, 0xffffff, 0.55]].forEach(function (c) {
            rastroG.lineStyle(c[0], c[1], c[2]);
            rastroG.beginPath();
            var p0 = R.puntoEn(circ, 0);
            rastroG.moveTo(p0.x, p0.y);
            for (var s = 8; s < pil.maxS; s += 8) {
                var q = R.puntoEn(circ, s);
                rastroG.lineTo(q.x, q.y);
            }
            var fin = R.puntoEn(circ, pil.maxS);
            rastroG.lineTo(fin.x, fin.y);
            rastroG.strokePath();
        });
    }

    function actualizarCircuito(t, dt) {
        if (!circ) return;
        var s = t / 1000;
        if (neonImg) neonImg.setAlpha((0.55 + 0.25 * Math.sin(s * 2.4) + (fondo ? fondo.energia * 0.2 : 0)) * visCirc);
        var ayuda = performance.now() < ayudaHasta;
        chevrones.forEach(function (ch) {
            // ola de luz que corre hacia el reactor
            var ola = Math.max(0, Math.sin(ch.s / (circ.ancho * 1.4) - s * 3.2));
            var adelante = ch.s > pil.s && ch.s < pil.s + circ.ancho * 4;
            ch.extra = Math.max(0, ch.extra - dt / 900);
            var a = 0.12 + ola * 0.38 + (ayuda && adelante ? 0.5 + 0.3 * Math.sin(s * 10) : 0) + ch.extra;
            if (ch.s < pil.maxS) a = Math.max(a, 0.5);
            ch.img.setAlpha(clamp(a, 0, 1) * (ch.visible === false ? 0 : 1) * visCirc);
        });
        dibujarRastro();
        if (conectorG) {
            var cerca = clamp(1 - (circ.largo - pil.s) / (circ.ancho * 4), 0, 1);
            conectorG.setAlpha((0.3 + cerca * 0.6 + 0.1 * Math.sin(s * 6)) * visCirc).setDisplaySize(circ.ancho * (1.6 + cerca), circ.ancho * (1.6 + cerca));
        }
    }

    // ------------------------------------------------------------------ piloto (arrastre, láseres, choques)

    function actualizarPiloto(ahora, dt) {
        if (!circ) return;
        var c = circ;
        if (corriendoLaseres) {
            c.laseres.forEach(function (L, i) {
                if (!L.reloj) return;
                var antes = L.est;
                L.est = R.avanzarLaser(L, L.reloj, dt, pil.visible && R.enBanda(c, L, pil.s));
                if (antes && antes.on !== L.est.on) {
                    if (!L.est.on && L.vis) L.vis.ya = 900;
                    emitir("estadoLaser", i, L.est.on, cercania(L));
                }
                if (L.vis && L.est.cuenta !== L.vis.ultimaCuenta) {
                    L.vis.ultimaCuenta = L.est.cuenta;
                    if (L.est.cuenta > 0) emitir("cuenta", i, L.est.cuenta, cercania(L));
                }
            });
        }
        var x0 = pil.x, y0 = pil.y;
        if (pil.visible && pil.arrastrando && !pil.auto && !pil.bloqueado && !pil.enMeta && pil.objetivo) {
            var estados = c.laseres.map(function (L) { return L.est; });
            var res = R.mover(c, pil, pil.objetivo, dt, cfgJ, estados);
            if (res.evento === "pared") chocarPared(res);
            else if (res.evento === "laser") chocarLaser(res.laser);
            else if (res.evento === "meta") {
                pil.enMeta = true;
                pil.arrastrando = false;
                pil.objetivo = null;
                emitir("meta");
            }
        }
        var d = Math.hypot(pil.x - x0, pil.y - y0);
        var v = dt > 0 ? d / dt * 1000 : 0;
        pil.vel = lerp(pil.vel, v, 0.25);
        pil.empuje = clamp(pil.vel / 650, 0, 1);
        if (d > 0.5 && !pil.auto) {
            pil.tMov = ahora;
            emitir("mueve");
        }
        if (pil.s > pil.maxS + 1 && !pil.auto) {
            pil.maxS = pil.s;
            var frac = clamp(pil.maxS / c.largo, 0, 1);
            if (fondo) fondo.energiaObj = Math.max(fondo.energiaObj, frac * 0.85);
            if (reactor) reactor.cargaObj = Math.max(reactor.cargaObj, frac * 0.8);
            emitir("avance", frac);
        }
        // barreras: aproximación y cruce
        var dAviso = (Number(cfgJ.distanciaAviso) || 3.2) * c.ancho;
        c.laseres.forEach(function (L, i) {
            if (!pil.visible) return;
            var antes = L.s - pil.s;
            var zona = antes > 0 && antes < dAviso;
            if (zona && L.est.on && !L.cerca) {
                L.cerca = true;
                emitir("acerca", i);
            } else if (!zona || !L.est.on) {
                if (!zona) L.cerca = false;
                if (zona && !L.est.on) L.cerca = false;
            }
            if (!L.superado && pil.s > L.s + c.radio + c.banda / 2 + 2 && !pil.auto) {
                L.superado = true;
                cruceFx(L);
                emitir("cruce", i);
            }
        });
    }

    function chocarPared(res) {
        pil.tChoque = performance.now();
        pil.temblor = 1;
        var px = res.px != null ? res.px : pil.x, py = res.py != null ? res.py : pil.y;
        for (var i = 0; i < 9; i++) chispa(px, py, i % 2 ? AZUL : 0xffffff, 0.8);
        onda(px, py, AZUL, 0.8);
        var s2 = R.sRetroceso(circ, pil.s, cfgJ, null);
        empujar(s2, 380);
        emitir("pared", { x: px, y: py });
    }

    function chocarLaser(i) {
        var L = circ.laseres[i];
        pil.tChoque = performance.now();
        pil.temblor = 1.3;
        esfera.extra = 1;
        if (L && L.vis) L.vis.flash = 1;
        onda(pil.x, pil.y, ROJO, 1.1);
        onda(pil.x, pil.y, 0xffffff, 0.7);
        for (var k = 0; k < 12; k++) chispa(pil.x, pil.y, k % 3 ? ROJO : 0xffffff, 1);
        var s2 = R.sRetroceso(circ, pil.s, cfgJ, i);
        empujar(s2, 450);
        emitir("laser", i);
    }

    /** La esfera se desliza hacia atrás por el centro del carril; si el dedo sigue apoyado, se vuelve a tomar donde quedó. */
    function empujar(s2, ms) {
        pil.auto = true;
        var x0 = pil.x, y0 = pil.y;
        var q = R.puntoEn(circ, s2);
        return animar(ms, function (e) {
            pil.x = lerp(x0, q.x, e);
            pil.y = lerp(y0, q.y, e);
        }, function (u) { return 1 - Math.pow(1 - u, 3); }).then(function () {
            pil.x = q.x;
            pil.y = q.y;
            pil.s = s2;
            pil.auto = false;
            if (pil.arrastrando && pil.ultimoPuntero) {
                pil.offset = { x: pil.ultimoPuntero.x - pil.x, y: pil.ultimoPuntero.y - pil.y };
                pil.objetivo = { x: pil.x, y: pil.y };
            }
        });
    }

    function tocaEsfera(x, y) {
        if (!circ || !pil.visible) return false;
        return Math.hypot(x - pil.x, y - pil.y) < Math.max(circ.radio * 2.3, 64);
    }

    function empezarArrastre(x, y) {
        if (pil.bloqueado || pil.enMeta) return;
        pil.arrastrando = true;
        pil.offset = { x: x - pil.x, y: y - pil.y };
        pil.ultimoPuntero = { x: x, y: y };
        pil.objetivo = { x: pil.x, y: pil.y };
        esfera.extra = 0.6;
    }

    function moverObjetivo(x, y) {
        if (!pil.arrastrando) return;
        pil.ultimoPuntero = { x: x, y: y };
        if (pil.auto) return;
        pil.objetivo = { x: x - pil.offset.x, y: y - pil.offset.y };
    }

    function soltar() {
        pil.arrastrando = false;
        pil.objetivo = null;
    }

    // ------------------------------------------------------------------ efectos

    function chispa(x, y, color, fuerza) {
        if (!sc) return;
        var a = Math.random() * Math.PI * 2;
        var d = (20 + Math.random() * 50) * (fuerza || 1);
        var img = sc.add.image(x, y, "fx-chispa").setBlendMode(ADD).setDepth(16).setTint(color || 0xffffff)
            .setScale(0.4 + Math.random() * 0.5).setRotation(Math.random() * 3);
        sc.tweens.add({ targets: img, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.1, angle: 180, duration: 380 + Math.random() * 260, ease: "Quad.easeOut" });
        destruirLuego(img, 900);
    }

    function onda(x, y, color, escala) {
        if (!sc) return;
        var w = circ ? circ.ancho : 120;
        var o = sc.add.image(x, y, "fx-onda").setBlendMode(ADD).setDepth(16).setTint(color || CIAN).setScale(0.2).setAlpha(0.9);
        sc.tweens.add({ targets: o, scale: w * 1.6 * (escala || 1) / 128, alpha: 0, duration: 620, ease: "Quad.easeOut" });
        destruirLuego(o, 1000);
    }

    function cruceFx(L) {
        var a = L.ang + Math.PI / 2;
        for (var k = -3; k <= 3; k++) {
            chispa(L.x + Math.cos(a) * k * circ.ancho / 7, L.y + Math.sin(a) * k * circ.ancho / 7, k % 2 ? VERDE : 0xffffff, 1.2);
        }
        onda(L.x, L.y, VERDE, 1.2);
        chevrones.forEach(function (ch) {
            var d = ch.s - L.s;
            if (d > 0 && d < circ.ancho * 6) setTimeout(function () { ch.extra = 0.8; }, d / circ.ancho * 60);
        });
        pulsoFondo(0.45);
    }

    function chispasFiesta(x, y, n, fuerza) {
        for (var i = 0; i < (n || 12); i++) chispa(x, y, NEON[i % NEON.length], (fuerza || 1) * 1.6);
        var h = sc.add.image(x, y, "fx-halo").setBlendMode(ADD).setDepth(16).setTint(0xffffff).setScale(0.3).setAlpha(0.9);
        sc.tweens.add({ targets: h, scale: 1.6 * (fuerza || 1), alpha: 0, duration: 600 });
        destruirLuego(h, 900);
    }

    /** Fuegos artificiales tecnológicos: un destello sube y explota en anillos y chispas de neón. */
    function fuegos(n) {
        if (!sc || !circ) return;
        for (var i = 0; i < (n || 4); i++) {
            (function (k) {
                setTimeout(function () {
                    if (!sc) return;
                    var x = circ.W * (0.12 + Math.random() * 0.76), y = circ.H * (0.15 + Math.random() * 0.35);
                    var color = NEON[(k + Math.floor(Math.random() * 7)) % NEON.length];
                    var sube = sc.add.image(x, circ.H * 0.95, "fx-punto").setBlendMode(ADD).setDepth(31).setTint(color).setScale(2.2);
                    sc.tweens.add({ targets: sube, y: y, duration: 520, ease: "Quad.easeOut" });
                    destruirLuego(sube, 560);
                    setTimeout(function () {
                        if (!sc) return;
                        var o = sc.add.image(x, y, "fx-onda").setBlendMode(ADD).setDepth(31).setTint(color).setScale(0.1);
                        sc.tweens.add({ targets: o, scale: 2.4, alpha: 0, duration: 800, ease: "Quad.easeOut" });
                        destruirLuego(o, 1000);
                        for (var j = 0; j < 18; j++) {
                            var a = j / 18 * Math.PI * 2;
                            var p = sc.add.image(x, y, j % 2 ? "fx-chispa" : "fx-punto").setBlendMode(ADD).setDepth(31).setTint(j % 3 ? color : 0xffffff).setScale(j % 2 ? 0.6 : 1.6);
                            sc.tweens.add({ targets: p, x: x + Math.cos(a) * 150, y: y + Math.sin(a) * 150 + 40, alpha: 0, duration: 1000, ease: "Cubic.easeOut" });
                            destruirLuego(p, 1200);
                        }
                    }, 540);
                }, k * 360);
            })(i);
        }
    }

    // ------------------------------------------------------------------ ayudas

    function pistaLuces(ms) {
        ayudaHasta = performance.now() + (ms || 2600);
    }

    /** Un pulso de luz dorado recorre el carril desde la esfera unos cuantos anchos hacia adelante. */
    function guiaDorada(ms) {
        if (!circ) return Promise.resolve();
        var s0 = pil.s, s1 = Math.min(circ.largo, pil.s + circ.ancho * 6);
        var luz = sc.add.image(pil.x, pil.y, "fx-halo").setBlendMode(ADD).setDepth(13).setTint(AMBAR).setDisplaySize(circ.ancho, circ.ancho);
        return animar(ms || 2400, function (e) {
            var q = R.puntoEn(circ, lerp(s0, s1, e));
            luz.setPosition(q.x, q.y).setAlpha(Math.sin(e * Math.PI));
        }, suave).then(function () { luz.destroy(); });
    }

    // ------------------------------------------------------------------ transiciones y escenas

    /** Carga un circuito (con su fondo, láseres, flechas y reactor). La esfera queda oculta en la salida. */
    async function cargarCircuito(c, opciones) {
        opciones = opciones || {};
        if (!sc) return;
        descargar();
        dims = { W: c.W, H: c.H };
        crearFondo(c.W, c.H);
        circ = c;
        reemplazarCanvas("circuito-pista", lienzoCircuito(c));
        reemplazarCanvas("circuito-neon", lienzoNeon(c));
        pistaImg = guardar(sc.add.image(0, 0, "circuito-pista").setOrigin(0).setScale(1 / RES).setDepth(5));
        neonImg = guardar(sc.add.image(0, 0, "circuito-neon").setOrigin(0).setScale(1 / RES).setDepth(6).setBlendMode(ADD).setTint(CIAN));
        rastroG = guardar(sc.add.graphics().setDepth(7).setBlendMode(ADD));
        rastroS = -1;
        crearChevrones(c);
        crearLaseres(c);
        crearPaneles(c);
        conectorG = guardar(sc.add.image(c.meta.x, c.meta.y, "fx-halo").setBlendMode(ADD).setDepth(9).setTint(CIAN));
        etiquetaInicio = guardar(sc.add.text(c.inicio.x, c.inicio.y - c.ancho / 2 - c.pared - 26, global.EscenarioLaser.textoInicio || "¡Inicia aquí!", {
            fontFamily: "Fredoka, sans-serif", fontSize: "24px", fontStyle: "bold", color: "#fef08a", stroke: "#0b1024", strokeThickness: 6
        }).setOrigin(0.5).setDepth(16));
        if (!reactor) crearReactor();
        ubicarReactor(c);
        reactor.cargaObj = 0;
        reactor.carga = 0;
        reactor.extra = 0;
        fondo.energiaObj = 0;
        fondo.fiesta = 0;
        pil.x = c.inicio.x;
        pil.y = c.inicio.y;
        pil.s = 0;
        pil.maxS = 0;
        pil.enMeta = false;
        pil.arrastrando = false;
        pil.auto = false;
        pil.objetivo = null;
        pil.visible = false;
        pil.temblor = 0;
        corriendoLaseres = true;
        visCirc = 1;
        reacomodar();
        if (opciones.animar) {
            var lista = [pistaImg, neonImg, etiquetaInicio].concat(chevrones.map(function (ch) { return ch.img; }));
            [pistaImg, neonImg, etiquetaInicio].forEach(function (o) { o.setAlpha(0); });
            chevrones.forEach(function (ch) { ch.visible = false; });
            await animar(700, function (e) {
                pistaImg.setAlpha(e);
                etiquetaInicio.setAlpha(e);
            });
            // una chispa recorre el circuito y lo "enciende"
            var guia = sc.add.image(c.inicio.x, c.inicio.y, "fx-halo").setBlendMode(ADD).setDepth(13).setTint(CIAN).setDisplaySize(c.ancho * 1.2, c.ancho * 1.2);
            await animar(1100, function (e) {
                var s = c.largo * e;
                var q = R.puntoEn(c, s);
                guia.setPosition(q.x, q.y);
                chevrones.forEach(function (ch) { if (ch.s <= s && ch.visible === false) { ch.visible = true; ch.extra = 0.9; } });
            }, suave);
            guia.destroy();
            chevrones.forEach(function (ch) { ch.visible = true; });
            if (lista.length) neonImg.setAlpha(0.7);
        }
    }

    async function ocultarCircuito() {
        if (!circ || !pistaImg) return;
        var objs = objCirc.slice();
        var alfas = objs.map(function (o) { return o.alpha != null ? o.alpha : 1; });
        pil.visible = false;
        corriendoLaseres = false;
        await animar(380, function (e) {
            visCirc = 1 - e;
            objs.forEach(function (o, i) { if (o.active && o.setAlpha) o.setAlpha(alfas[i] * (1 - e)); });
        });
    }

    /** Barrido de luz que cruza la pantalla entre un circuito y otro. */
    async function transicion(ms) {
        if (!sc) return;
        var W = dims.W, H = dims.H;
        var barra = sc.add.image(-200, H / 2, "fx-rayo").setRotation(Math.PI / 2).setBlendMode(ADD).setDepth(40).setTint(CIAN).setDisplaySize(H * 1.3, 260);
        var velo = sc.add.image(W / 2, H / 2, "fx-blanco").setDisplaySize(W + 8, H + 8).setTint(0x020414).setDepth(39).setAlpha(0);
        await animar(ms || 1000, function (e) {
            barra.x = lerp(-200, W + 200, e);
            velo.setAlpha(Math.sin(e * Math.PI) * 0.65);
        }, suave);
        barra.destroy();
        velo.destroy();
    }

    /** La esfera se materializa en la plataforma de salida. */
    async function llegarInicio() {
        if (!circ) return;
        pil.x = circ.inicio.x;
        pil.y = circ.inicio.y;
        var h = sc.add.image(pil.x, pil.y, "fx-onda").setBlendMode(ADD).setDepth(14).setTint(CIAN).setScale(2.2).setAlpha(0);
        await animar(500, function (e) {
            h.setScale(lerp(2.2, 0.3, e)).setAlpha(Math.sin(e * Math.PI));
        });
        h.destroy();
        pil.visible = true;
        chispasFiesta(pil.x, pil.y, 10, 0.6);
        await sleep(350);
    }

    /** La esfera entra al conector y el reactor recibe la energía (al terminar cada circuito). */
    async function conectarReactor(aviso) {
        if (!circ) return;
        var av = typeof aviso === "function" ? aviso : function () {};
        pil.arrastrando = false;
        pil.auto = true;
        var x0 = pil.x, y0 = pil.y;
        var v = reactor.ventana;
        av("entra");
        await animar(700, function (e) {
            pil.x = lerp(x0, v.x, e);
            pil.y = lerp(y0, v.y, e) - Math.sin(e * Math.PI) * 30;
            esfera.extra = e;
        }, suave);
        pil.visible = false;
        av("carga");
        reactor.cargaObj = 1;
        fondo.energiaObj = 1;
        onda(v.x, v.y, CIAN, 2);
        onda(v.x, v.y, 0xffffff, 1.3);
        chispasFiesta(v.x, v.y, 16, 1.2);
        await animar(900, function (e) { reactor.extra = Math.sin(e * Math.PI) * 0.6; });
        pulsoFondo(0.7);
        pil.auto = false;
    }

    /** Todo el carril brilla en una ola hacia el reactor. */
    async function celebrarCircuito() {
        if (!circ) return;
        chevrones.forEach(function (ch, k) { setTimeout(function () { ch.extra = 1; }, k * 30); });
        rastroS = -1;
        pil.maxS = circ.largo;
        await sleep(900);
    }

    /**
     * Final: la central se reactiva. Las tuberías se iluminan en orden, los paneles se encienden uno a uno, el
     * reactor llega a su máxima carga, toda la luz cambia y una gran onda de energía cruza la sala.
     */
    async function finalCinematica(aviso) {
        if (!circ) return;
        var av = typeof aviso === "function" ? aviso : function () {};
        // las barreras se apagan para siempre (paso libre en verde) y todo el carril queda encendido
        corriendoLaseres = false;
        circ.laseres.forEach(function (L) {
            L.est = { on: false, cuenta: 0, restante: 1e9, avisoEncender: false };
            if (L.vis) L.vis.ya = 0;
        });
        pil.maxS = circ.largo;
        rastroS = -1;
        var W = circ.W, H = circ.H;
        reactor.cargaObj = 1;
        // 1) tuberías: un brillo recorre cada tubo hasta el reactor
        var brillos = fondo.tubos.map(function (t) {
            return sc.add.image(0, 0, "fx-halo").setBlendMode(ADD).setDepth(4).setTint(0xffffff).setDisplaySize(t.grosor * 6, t.grosor * 3);
        });
        av("tubos");
        await animar(1300, function (e) {
            fondo.tubos.forEach(function (t, k) {
                var q = puntoTubo(t, t.largo * e);
                brillos[k].setPosition(q.x, q.y);
                if (Math.random() < 0.3) chispa(q.x, q.y, k ? VIOLETA : CIAN, 0.6);
            });
            fondo.energiaObj = 0.6 + e * 0.4;
        }, suave);
        brillos.forEach(function (b) { b.destroy(); });
        // 2) paneles uno a uno
        for (var i = 0; i < fondo.paneles.length; i++) {
            fondo.paneles[i].fijo = 1;
            av("panel", i);
            await sleep(150);
        }
        // 3) el reactor se expande y la luz de la central cambia
        av("expansion");
        var v = reactor.ventana;
        await animar(700, function (e) { reactor.extra = e * 0.8; });
        var gran = sc.add.image(v.x, v.y, "fx-onda").setBlendMode(ADD).setDepth(31).setTint(CIAN).setScale(0.2);
        var gran2 = sc.add.image(v.x, v.y, "fx-halo").setBlendMode(ADD).setDepth(31).setTint(0xffffff).setScale(0.5);
        await animar(1100, function (e) {
            gran.setScale(lerp(0.2, W * 2.4 / 128, e)).setAlpha(1 - e);
            gran2.setScale(lerp(0.5, W / 50, e)).setAlpha((1 - e) * 0.9);
            fondo.luz.setAlpha(Math.sin(e * Math.PI) * 0.55 + e * 0.12);
        }, function (u) { return 1 - Math.pow(1 - u, 2); });
        gran.destroy();
        gran2.destroy();
        fondo.luz.setTint(0x99f6e4);
        reactor.extra = 0.5;
        chispasFiesta(v.x, v.y, 22, 1.6);
        fuegos(5);
        await sleep(600);
    }

    /** Vuelve la central a su estado normal (jugar otra vez). */
    function reiniciarVista() {
        if (!fondo) return;
        fondo.luz.setAlpha(0).setTint(0x7dd3fc);
        fondo.energiaObj = 0;
        fondo.fiesta = 0;
        fondo.paneles.forEach(function (p) { p.fijo = 0; });
        if (reactor) {
            reactor.cargaObj = 0;
            reactor.extra = 0;
        }
    }

    /** Miniatura del circuito (resumen final). */
    function miniatura(c, w, h) {
        var cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        var x = cv.getContext("2d");
        var g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#131c4a");
        g.addColorStop(1, "#080d2a");
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        var e = Math.min(w / c.W, h / c.H);
        x.save();
        x.translate((w - c.W * e) / 2, (h - c.H * e) / 2);
        x.lineCap = "round";
        x.lineJoin = "round";
        [[(c.ancho + c.pared * 2) * e, "#64748b"], [(c.ancho + 4) * e, "#22d3ee"], [c.ancho * e, "#0a1433"], [c.ancho * e * 0.3, "rgba(56,189,248,0.7)"]].forEach(function (capa) {
            trazar(x, c, e);
            x.strokeStyle = capa[1];
            x.lineWidth = Math.max(1, capa[0]);
            x.stroke();
        });
        c.laseres.forEach(function (L) {
            var a = L.ang + Math.PI / 2;
            x.strokeStyle = "#4ade80";
            x.lineWidth = 3;
            x.beginPath();
            x.moveTo((L.x - Math.cos(a) * c.ancho / 2) * e, (L.y - Math.sin(a) * c.ancho / 2) * e);
            x.lineTo((L.x + Math.cos(a) * c.ancho / 2) * e, (L.y + Math.sin(a) * c.ancho / 2) * e);
            x.stroke();
        });
        x.fillStyle = "#67e8f9";
        x.beginPath();
        x.arc(c.inicio.x * e, c.inicio.y * e, Math.max(3, c.radio * e), 0, Math.PI * 2);
        x.fill();
        var rg = x.createRadialGradient(c.W * 0.935 * e, c.meta.y * e, 0, c.W * 0.935 * e, c.meta.y * e, 60 * e);
        rg.addColorStop(0, "#ffffff");
        rg.addColorStop(0.4, "#22d3ee");
        rg.addColorStop(1, "rgba(34,211,238,0)");
        x.fillStyle = rg;
        x.beginPath();
        x.arc(c.W * 0.935 * e, c.meta.y * e, 60 * e, 0, Math.PI * 2);
        x.fill();
        x.restore();
        return cv.toDataURL("image/png");
    }

    // ------------------------------------------------------------------ consultas para script.js y la demo

    function zonaZoe() {
        if (!sc) return null;
        var H = circ ? circ.H : dims.H, W = circ ? circ.W : dims.W;
        var a = aPantalla(0, H * 0.4);
        var b = aPantalla(W * 0.15, H);
        return { left: Math.max(0, a.x), top: a.y, width: Math.max(150, b.x - a.x), height: Math.max(220, b.y - a.y), bottom: b.y };
    }

    /** true si la esfera está quieta frente a un rayo encendido (esperar es lo correcto: no hay que dar pistas). */
    function esperandoLaser() {
        if (!circ || !pil.visible) return false;
        return circ.laseres.some(function (L) {
            var antes = L.s - pil.s;
            return L.est && (L.est.on || L.est.avisoEncender) && antes > 0 && antes < circ.ancho * 4;
        });
    }

    function estadoLaser(i) {
        var L = circ && circ.laseres[i];
        return L && L.est ? L.est : null;
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
        if (!Phaser || !R) {
            console.warn("[EscenarioLaser] falta Phaser o ReglasLaser");
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        RES = clamp((global.devicePixelRatio || 1) * Math.min(1.2, global.innerWidth / 1600), 1, 1.5);
        listoPromesa = new Promise(function (resolve) {
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: el,
                backgroundColor: "#070b24",
                banner: false,
                scale: { mode: Phaser.Scale.RESIZE, width: global.innerWidth, height: global.innerHeight },
                input: { activePointers: 2 },
                fps: { target: 60 },
                scene: {
                    create: function () {
                        sc = this;
                        texturasFx();
                        dims = dimensionesMundo();
                        marco = sc.add.image(0, 0, "fx-blanco").setTint(0x070b24).setDepth(-1);
                        crearFondo(dims.W, dims.H);
                        crearReactor();
                        crearEsfera();
                        reacomodar();
                        sc.scale.on("resize", reacomodar);
                        // el arrastre y los láseres corren con su propio reloj (setTimeout): no dependen de que el navegador pinte
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
                            actualizarFondo(ahora, d);
                            actualizarCircuito(ahora, d);
                            actualizarLaseres(ahora, d);
                            actualizarReactor(ahora, d);
                            actualizarEsfera(ahora, d);
                        });
                        vigilarPosicion(el);
                        resolve(true);
                    }
                }
            });
            global.__pedniaPhaserGame = juego;
        });
        return listoPromesa;
    }

    global.EscenarioLaser = {
        textoInicio: "¡Inicia aquí!",
        textoYa: "¡YA!",
        montar: montar,
        listo: function () { return !!(sc && esfera && fondo); },
        escena: function () { return sc; },
        on: function (mapa) { Object.keys(mapa || {}).forEach(function (k) { ev[k] = mapa[k]; }); },
        reacomodar: reacomodar,
        dimensionesMundo: dimensionesMundo,
        circuito: function () { return circ; },
        piloto: function () { return pil; },
        cargarCircuito: cargarCircuito,
        ocultarCircuito: ocultarCircuito,
        tocaEsfera: tocaEsfera,
        empezarArrastre: empezarArrastre,
        moverObjetivo: moverObjetivo,
        soltar: soltar,
        bloquear: function (on) { pil.bloqueado = !!on; if (on) { pil.arrastrando = false; pil.objetivo = null; } },
        laseresActivos: function (on) { corriendoLaseres = !!on; },
        /** Demo: deja el láser i encendido con ms restantes (para que la esfera llegue y tenga que esperar). */
        encenderLaser: function (i, ms) {
            var L = circ && circ.laseres[i];
            if (!L || !L.reloj) return;
            var ciclo = L.enc + L.apag;
            L.reloj.t = Math.floor(L.reloj.t / ciclo) * ciclo + Math.max(0, L.enc - (ms || 4000));
        },
        estadoLaser: estadoLaser,
        esperandoLaser: esperandoLaser,
        zumbidoLaser: zumbidoLaser,
        onda: onda,
        chispas: chispasFiesta,
        pistaLuces: pistaLuces,
        guiaDorada: guiaDorada,
        pulsoFondo: pulsoFondo,
        transicion: transicion,
        llegarInicio: llegarInicio,
        conectarReactor: conectarReactor,
        celebrarCircuito: celebrarCircuito,
        finalCinematica: finalCinematica,
        fuegos: fuegos,
        reiniciarVista: reiniciarVista,
        miniatura: miniatura,
        aPantalla: aPantalla,
        mundoDePantalla: mundoDePantalla,
        mundoDeJuego: mundoDeJuego,
        zonaZoe: zonaZoe
    };
})(window);
