/**
 * EscenarioTopos — escena Phaser 4 de "Golpea a los Topos" (window.EscenarioTopos).
 *
 * Dibuja en #escenario-phaser la colina desértica mágica de PedNia: montañas al fondo, el suelo de arena,
 * la colina grande en el centro con sus agujeros, cactus y el campamento a los lados, el mazo de juguete
 * que golpea a los topos y los efectos (estrellas, lluvia, luz).
 * El cielo y el sol son CSS (.topos-cielo) y quedan detrás del lienzo transparente.
 *
 * Cada agujero (config.agujeros, x/y en fracciones de la zona útil) tiene un registro con el topo, su globo
 * y una zona táctil. topos.js anima los números del registro; aquí se dibujan en cada cuadro. La zona útil
 * deja libre la barra de abajo (Zoe y los botones flotan sobre la arena).
 *
 * API:
 *   montar(el, cfg) → Promise   listo(), reacomodar(), escena(), objetos(), diseno(), config()
 *   hoyo(id), hoyos()           registros de los agujeros
 *   alGolpear(fn)               fn(hoyoId) cuando el niño toca un topo o su globo (ratón o dedo)
 *   iconoGlobo(id, icono), marcaGlobo(id, "si"|"no"|null), haloGlobo(id, on)
 *   puntoGlobo(id, mundo), puntoTopo(id), puntoDe(hoyoId) → coords de pantalla
 *   mazo(id) → Promise                el mazo de juguete aparece y golpea al topo (resuelve en el impacto)
 *   estallido(x, y), estrellas(x, y, n, colores, fuerza), lluvia(ms), iluminar(on), flotante(x, y, texto)
 *   aPantalla(x, y), mundoDePantalla(x, y)
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var I = global.IconosTopos;
    var R = global.ReglasTopos;
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2;
    var COLORES_FIESTA = [0xffe066, 0xff8fc7, 0x7cf3ff, 0x9df59a, 0xffb36b, 0xc9a7ff];
    var ALTO_TOPO = 300;       // alto del dibujo del topo (entero, de las orejas a los pies)
    var BORDE_AGUJERO = 292;   // fila de los pies: va en el borde del agujero cuando el topo está afuera
    var PIVOTE = 180;          // fila del pivote (0.6 del alto): ahí se aplasta y se tambalea
    var CORONILLA = 40;        // fila de la parte de arriba de la cabeza (donde cae el mazo)

    var cfg = null;
    var juego = null;
    var sc = null;
    var obj = {};
    var hoyos = {};
    var orden = [];
    var golpeCb = null;
    var fondoG = null;
    var deco = {};
    var luz = null;
    var lay = { W: 0, H: 0, Hu: 0, sTopo: 0.4, globo: 110, kGlobo: 1, hoyoW: 100, hoyoH: 34, escala: 0.5 };
    var listoPromesa = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, reducido ? Math.min(ms, 80) : ms); });
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // ------------------------------------------------------------------ texturas

/** viewBox de cada SVG → origen (0..1) para que el (0,0) del dibujo sea el pivote. */
    function origen(s) {
        var m = /viewBox="([^"]+)"/.exec(s || "");
        if (!m) return { x: 0.5, y: 0.5, w: 0, h: 0 };
        var v = m[1].split(/\s+/).map(Number);
        return { x: -v[0] / v[2], y: -v[1] / v[3], w: v[2], h: v[3] };
    }

    function cargarSvg(clave, s, ancho, alto) {
        return new Promise(function (resolve) {
            var o = origen(s);
            var w = ancho || o.w;
            var h = alto || o.h;
            var img = new Image();
            img.onload = function () {
                var c = document.createElement("canvas");
                c.width = Math.ceil(w * RES);
                c.height = Math.ceil(h * RES);
                c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                if (sc.textures.exists(clave)) sc.textures.remove(clave);
                sc.textures.addCanvas(clave, c);
                resolve();
            };
            img.onerror = function () {
                console.warn("[EscenarioTopos] no se pudo dibujar", clave);
                resolve();
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function texturaCanvas(clave, s, dibujar) {
        if (sc.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = s;
        c.height = s;
        dibujar(c.getContext("2d"), s);
        sc.textures.addCanvas(clave, c);
    }

    function texturasFx() {
        texturaCanvas("fx-halo", 128, function (ctx, s) {
            var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,255,0.95)");
            g.addColorStop(0.4, "rgba(255,255,255,0.5)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, s, s);
        });
        texturaCanvas("fx-estrella", 48, function (ctx, s) {
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
        texturaCanvas("fx-chispa", 32, function (ctx, s) {
            ctx.translate(s / 2, s / 2);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(0, -s / 2);
            ctx.quadraticCurveTo(0, 0, s / 2, 0);
            ctx.quadraticCurveTo(0, 0, 0, s / 2);
            ctx.quadraticCurveTo(0, 0, -s / 2, 0);
            ctx.quadraticCurveTo(0, 0, 0, -s / 2);
            ctx.fill();
        });
    }

    // Decoración (SVG con el (0,0) en la base, al centro).
    var DECO = {
        // Mazo de juguete: cabeza roja con franjas amarillas, mango de madera; el (0,0) es la empuñadura.
        mazo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -196 140 200" width="140" height="200">' +
            '<rect x="-8" y="-136" width="16" height="136" rx="8" fill="#f4a261" stroke="#9c5a1c" stroke-width="4"/>' +
            '<rect x="-10" y="-42" width="20" height="42" rx="8" fill="#4dabf7" stroke="#1864ab" stroke-width="4"/>' +
            '<path d="M-4,-128 L-4,-50" stroke="#ffd8a8" stroke-width="3" stroke-linecap="round"/>' +
            '<rect x="-64" y="-192" width="128" height="66" rx="26" fill="#ff6b6b" stroke="#c92a2a" stroke-width="5"/>' +
            '<rect x="-46" y="-190" width="14" height="62" fill="#ffd43b"/><rect x="32" y="-190" width="14" height="62" fill="#ffd43b"/>' +
            '<rect x="-64" y="-192" width="128" height="66" rx="26" fill="none" stroke="#c92a2a" stroke-width="5"/>' +
            '<ellipse cx="-62" cy="-159" rx="8" ry="29" fill="#ff8787" stroke="#c92a2a" stroke-width="4"/>' +
            '<ellipse cx="62" cy="-159" rx="8" ry="29" fill="#ff8787" stroke="#c92a2a" stroke-width="4"/>' +
            '<path d="M-30,-178 Q0,-186 26,-178" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/></svg>',
        cactus: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -170 120 172" width="120" height="172">' +
            '<g fill="#5fa84a" stroke="#2f6b2a" stroke-width="4" stroke-linejoin="round">' +
            '<path d="M-36,-70 Q-52,-70 -52,-90 L-52,-118 Q-52,-128 -43,-128 Q-34,-128 -34,-118 L-34,-92 L-18,-92 L-18,-70 Z"/>' +
            '<path d="M36,-96 Q52,-96 52,-114 L52,-134 Q52,-144 43,-144 Q34,-144 34,-134 L34,-114 L18,-114 L18,-96 Z"/>' +
            '<path d="M-18,0 L-18,-146 Q-18,-166 0,-166 Q18,-166 18,-146 L18,0 Z"/></g>' +
            '<path d="M-6,-150 L-6,-8 M6,-150 L6,-8" stroke="#4c9440" stroke-width="3"/>' +
            '<path d="M-24,-120 l-6,-3 M24,-100 l6,-3 M-24,-60 l-6,-3 M24,-40 l6,-3 M-46,-112 l-6,-2 M46,-128 l6,-2" stroke="#2f6b2a" stroke-width="2.5" stroke-linecap="round"/>' +
            '<circle cx="0" cy="-168" r="7" fill="#ff8fc7" stroke="#d6336c" stroke-width="2.5"/></svg>',
        carpa: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -170 200 172" width="200" height="172">' +
            '<path d="M-4,-120 L-4,-166" stroke="#7a4a26" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M-2,-166 L44,-154 L-2,-140 Z" fill="#ffd43b" stroke="#e67700" stroke-width="3" stroke-linejoin="round"/>' +
            '<text x="17" y="-150" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#7a3d00" text-anchor="middle">PEDNIA</text>' +
            '<path d="M-92,0 L0,-124 L92,0 Z" fill="#ff922b" stroke="#c2410c" stroke-width="5" stroke-linejoin="round"/>' +
            '<path d="M-46,0 L0,-124 L-14,0 Z" fill="#ffa94d"/>' +
            '<path d="M0,-124 L-30,0 L30,0 Z" fill="#7a2e0e"/>' +
            '<path d="M0,-124 L-10,0 L-30,0 Z" fill="#a8461b"/>' +
            '<path d="M-92,0 L92,0" stroke="#c2410c" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M-60,-40 L-40,-40 M40,-40 L60,-40" stroke="#fff4e6" stroke-width="4" stroke-linecap="round"/></svg>',
        arbusto: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -36 80 38" width="80" height="38">' +
            '<g fill="#8cbf5a" stroke="#4f7d2c" stroke-width="3"><circle cx="-20" cy="-12" r="13"/><circle cx="20" cy="-12" r="13"/><circle cx="0" cy="-20" r="16"/></g>' +
            '<circle cx="-8" cy="-24" r="3" fill="#fff3bf"/><circle cx="14" cy="-18" r="3" fill="#ffc9de"/></svg>'
    };

    function imagenDe(clave, svgTexto, x, y) {
        var o = origen(svgTexto);
        var im = sc.add.image(x || 0, y || 0, clave);
        im.setOrigin(o.x, o.y);
        im.setScale(1 / RES);
        im.escalaBase = 1 / RES;
        return im;
    }

    // ------------------------------------------------------------------ agujeros, topos y globos

    function crearHoyos() {
        var ys = [];
        R.agujeros(cfg).forEach(function (a) { if (ys.indexOf(a.y) < 0) ys.push(a.y); });
        ys.sort(function (a, b) { return a - b; });
        R.agujeros(cfg).forEach(function (a) {
            var fila = ys.indexOf(a.y);
            var base = 10 + fila * 10;
            var r = {
                id: a.id, cfg: a, fila: fila, x: 0, lip: 0,
                sube: 0, salto: 0, giro: 0, kx: 1, ky: 1, globoK: 0,
                estado: "oculto", imagen: null, op: 0
            };
            r.gAtras = sc.add.graphics();
            r.gAtras.setDepth(base);
            r.img = sc.add.image(0, 0, "topo-normal");
            r.img.setOrigin(0.5, PIVOTE / ALTO_TOPO);
            r.img.setDepth(base + 1);
            r.img.setVisible(false);
            r.gFrente = sc.add.graphics();
            r.gFrente.setDepth(base + 2);

            // Globo: unidades de diseño con el (0,0) en la punta de la colita (abajo, al centro).
            var g = sc.add.container(0, 0);
            g.setDepth(base + 5);
            var halo = sc.add.graphics();
            halo.lineStyle(10, 0xffd43b, 1);
            halo.strokeRoundedRect(-72, -138, 144, 128, 34);
            halo.setAlpha(0);
            var burbuja = sc.add.graphics();
            burbuja.fillStyle(0x000000, 0.12);
            burbuja.fillRoundedRect(-60, -122, 124, 108, 26);
            burbuja.fillStyle(0xffffff, 1);
            burbuja.fillRoundedRect(-62, -128, 124, 108, 26);
            burbuja.fillTriangle(-15, -22, 15, -22, 0, -1);
            burbuja.lineStyle(5, 0x74c0fc, 1);
            burbuja.strokeRoundedRect(-62, -128, 124, 108, 26);
            burbuja.lineBetween(-15, -20, 0, -1);
            burbuja.lineBetween(15, -20, 0, -1);
            burbuja.fillStyle(0xffffff, 1);
            burbuja.fillRect(-13, -24, 26, 6);
            var icono = sc.add.image(0, -74, "ico-nariz");
            icono.setScale(86 / (120 * RES));
            var marca = sc.add.graphics();
            g.add([halo, burbuja, icono, marca]);
            g.setVisible(false);
            r.globo = g;
            r.halo = halo;
            r.icono = icono;
            r.marca = marca;

            r.zona = sc.add.zone(0, 0, 10, 10);
            r.zona.setInteractive({ useHandCursor: true });
            r.zona.on("pointerdown", function () {
                if (typeof golpeCb === "function") golpeCb(r.id);
            });

            hoyos[a.id] = r;
            orden.push(r);
        });
    }

    function iconoGlobo(id, icono) {
        var r = hoyos[id];
        if (!r) return;
        var clave = "ico-" + icono;
        if (sc.textures.exists(clave)) r.icono.setTexture(clave);
    }

    /** Sello de la presentación y la demo: "si" aro verde con ✓; "no" aro rojo tachado. */
    function marcaGlobo(id, tipo) {
        var r = hoyos[id];
        if (!r) return;
        var g = r.marca;
        g.clear();
        if (!tipo) return;
        var verde = tipo === "si";
        var c = verde ? 0x2f9e44 : 0xe03131;
        g.lineStyle(9, c, 0.9);
        g.strokeCircle(0, -74, 50);
        if (!verde) g.lineBetween(-35, -39, 35, -109);
        g.fillStyle(c, 1);
        g.fillCircle(52, -122, 22);
        g.lineStyle(7, 0xffffff, 1);
        if (verde) {
            g.beginPath();
            g.moveTo(41, -122);
            g.lineTo(49, -113);
            g.lineTo(64, -132);
            g.strokePath();
        } else {
            g.lineBetween(43, -131, 61, -113);
            g.lineBetween(61, -131, 43, -113);
        }
    }

    function haloGlobo(id, on) {
        var r = hoyos[id];
        if (!r) return;
        sc.tweens.killTweensOf(r.halo);
        r.halo.setAlpha(0);
        if (!on) return;
        r.halo.setAlpha(1);
        if (!reducido) sc.tweens.add({ targets: r.halo, alpha: 0.25, duration: 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    function dibujarHoyo(r) {
        var a = lay.hoyoW / 2;
        var b = lay.hoyoH / 2;
        var x = r.x;
        var y = r.lip;
        var g = r.gAtras;
        g.clear();
        // montoncito de tierra alrededor (parte de atrás) y el agujero
        g.fillStyle(0xc98d4c, 1);
        g.fillEllipse(x, y + b * 0.1, a * 2.5, b * 3.1);
        g.fillStyle(0xe2ac68, 1);
        g.fillEllipse(x, y - b * 0.15, a * 2.32, b * 2.7);
        g.fillStyle(0x4a2c16, 1);
        g.fillEllipse(x, y, a * 2, b * 2);
        g.fillStyle(0x2b170a, 1);
        g.fillEllipse(x, y + b * 0.18, a * 1.62, b * 1.4);

        // labio de adelante: tapa el corte del topo
        var f = r.gFrente;
        f.clear();
        var pts = [];
        var n = 24;
        var i;
        var ax = a * 1.25;
        var by = b * 1.55;
        for (i = 0; i <= n; i++) {
            var t = (i / n) * Math.PI;
            pts.push(new Phaser.Math.Vector2(x + Math.cos(t) * ax, y + b * 0.1 + Math.sin(t) * by));
        }
        for (i = n; i >= 0; i--) {
            var t2 = (i / n) * Math.PI;
            pts.push(new Phaser.Math.Vector2(x + Math.cos(t2) * a, y + Math.sin(t2) * b));
        }
        f.fillStyle(0xd59a55, 1);
        f.fillPoints(pts, true);
        f.lineStyle(Math.max(2, b * 0.22), 0xf3c987, 1);
        f.beginPath();
        for (i = 0; i <= n; i++) {
            var t3 = (i / n) * Math.PI;
            var px = x + Math.cos(t3) * a;
            var py = y + Math.sin(t3) * b;
            if (i === 0) f.moveTo(px, py); else f.lineTo(px, py);
        }
        f.strokePath();
        // piedritas en el borde
        f.fillStyle(0xb67a3f, 1);
        f.fillCircle(x - ax * 0.8, y + by * 0.55, Math.max(2, b * 0.18));
        f.fillCircle(x + ax * 0.65, y + by * 0.75, Math.max(2, b * 0.14));
    }

    function ubicarHoyo(r) {
        r.x = r.cfg.x * lay.W;
        r.lip = r.cfg.y * lay.Hu;
        dibujarHoyo(r);
        var s = lay.sTopo;
        var arriba = r.lip - BORDE_AGUJERO * s - lay.globo - 8;
        var abajo = r.lip + lay.hoyoH * 0.9;
        var ancho = Math.max(lay.hoyoW * 1.1, lay.globo * 1.05);
        r.zona.setPosition(r.x, (arriba + abajo) / 2);
        r.zona.setSize(ancho, abajo - arriba);
        if (r.zona.input && r.zona.input.hitArea && r.zona.input.hitArea.setTo) {
            r.zona.input.hitArea.setTo(0, 0, ancho, abajo - arriba);
        }
    }

    /** Pone cada topo y su globo según los números que anima topos.js. */
    function dibujarTopos() {
        var s = lay.sTopo;
        for (var i = 0; i < orden.length; i++) {
            var r = orden[i];
            var img = r.img;
            var visible = r.sube > 0.002 || r.salto > 0.5;
            img.setVisible(visible);
            if (visible) {
                var sx = s * r.kx;
                var sy = s * r.ky;
                img.setScale(sx / RES, sy / RES);
                var yArriba = r.lip - (BORDE_AGUJERO - PIVOTE) * s;
                var yAbajo = r.lip + PIVOTE * s + 6;
                var y = yAbajo + (yArriba - yAbajo) * r.sube - r.salto * s;
                img.setPosition(r.x, y);
                img.angle = r.giro;
                var filas = (r.lip + lay.hoyoH * 0.12 - (y - PIVOTE * sy)) / sy;
                if (filas >= ALTO_TOPO || r.salto > 30) img.setCrop();
                else img.setCrop(0, 0, 200 * RES, Math.max(0, filas) * RES);
            }
            var g = r.globo;
            var vg = r.globoK > 0.01;
            g.setVisible(vg);
            if (vg) {
                g.setPosition(r.x, r.lip - BORDE_AGUJERO * s - 6);
                g.setScale(r.globoK * lay.kGlobo);
            }
        }
    }

    // ------------------------------------------------------------------ fondo: montañas, arena y colina

    var azarDeco = null;

    function puntosColina() {
        var W = lay.W;
        var H = lay.H;
        var cima = lay.Hu * 0.2;
        var base = H + 20;
        var mitad = W * 0.56;
        var pts = [];
        for (var i = 0; i <= 64; i++) {
            var x = -W * 0.06 + (W * 1.12 * i) / 64;
            var u = Math.min(1, Math.abs(x - W / 2) / mitad);
            pts.push(new Phaser.Math.Vector2(x, cima + (base - cima) * Math.pow(u, 2.6)));
        }
        pts.push(new Phaser.Math.Vector2(W * 1.06, H + 30));
        pts.push(new Phaser.Math.Vector2(-W * 0.06, H + 30));
        return { pts: pts, alturaEn: function (x) {
            var u = Math.min(1, Math.abs(x - W / 2) / mitad);
            return cima + (base - cima) * Math.pow(u, 2.6);
        } };
    }

    function montanas(g, puntos, color, altoMax, horizonte) {
        var pts = puntos.map(function (p) {
            return new Phaser.Math.Vector2(p[0] * lay.W, horizonte - p[1] * altoMax);
        });
        pts.push(new Phaser.Math.Vector2(lay.W * 1.05, horizonte + 4));
        pts.push(new Phaser.Math.Vector2(-lay.W * 0.05, horizonte + 4));
        g.fillStyle(color, 1);
        g.fillPoints(pts, true);
    }

    function cercaDeHoyo(x, y, margen) {
        return orden.some(function (r) {
            return Math.abs(x - r.x) < lay.hoyoW * margen && Math.abs(y - r.lip) < lay.hoyoH * margen * 1.6 + 10;
        });
    }

    function dibujarFondo() {
        var g = fondoG;
        g.clear();
        var W = lay.W;
        var H = lay.H;
        var horizonte = lay.Hu * 0.32;
        // montañas desérticas (mesas) lejanas y cercanas
        montanas(g, [[-0.05, 0.2], [0.04, 0.55], [0.1, 0.62], [0.16, 0.6], [0.2, 0.35], [0.3, 0.42], [0.36, 0.8], [0.44, 0.84], [0.48, 0.5],
            [0.58, 0.46], [0.64, 0.7], [0.72, 0.74], [0.76, 0.4], [0.86, 0.52], [0.9, 0.9], [0.97, 0.92], [1.05, 0.4]], 0xf0b48a, horizonte * 0.85, horizonte);
        montanas(g, [[-0.05, 0.3], [0.06, 0.34], [0.12, 0.5], [0.2, 0.52], [0.26, 0.22], [0.4, 0.26], [0.5, 0.18], [0.62, 0.3], [0.68, 0.46],
            [0.78, 0.48], [0.84, 0.22], [0.94, 0.3], [1.05, 0.36]], 0xdc8a5e, horizonte * 0.85, horizonte);
        // franjas de las mesas
        g.lineStyle(3, 0xc97448, 0.45);
        g.lineBetween(W * 0.12, horizonte - horizonte * 0.3, W * 0.2, horizonte - horizonte * 0.3);
        g.lineBetween(W * 0.7, horizonte - horizonte * 0.25, W * 0.78, horizonte - horizonte * 0.25);
        // suelo de arena
        g.fillStyle(0xf2c787, 1);
        g.fillRect(-10, horizonte, W + 20, H - horizonte + 20);
        g.fillStyle(0xeab872, 1);
        g.fillEllipse(W * 0.12, horizonte + lay.Hu * 0.1, W * 0.5, lay.Hu * 0.08);
        g.fillEllipse(W * 0.9, horizonte + lay.Hu * 0.07, W * 0.45, lay.Hu * 0.06);

        // colina: sombra, cuerpo y brillo de arriba
        var col = puntosColina();
        var sombra = col.pts.map(function (p) { return new Phaser.Math.Vector2(p.x, p.y + 10); });
        g.fillStyle(0xd09a55, 1);
        g.fillPoints(sombra, true);
        g.fillStyle(0xf6cf8c, 1);
        g.fillPoints(col.pts, true);
        var brillo = col.pts.slice(0, 65).map(function (p) {
            return new Phaser.Math.Vector2(W / 2 + (p.x - W / 2) * 0.72, p.y + lay.Hu * 0.025);
        });
        brillo.push(new Phaser.Math.Vector2(W * 0.86, lay.Hu * 0.6));
        brillo.push(new Phaser.Math.Vector2(W * 0.14, lay.Hu * 0.6));
        g.fillStyle(0xfadca6, 0.75);
        g.fillPoints(brillo, true);
        // ondas de arena (lejos de los agujeros)
        azarDeco = R.crearAzar(7);
        g.lineStyle(3, 0xe0ae6a, 0.8);
        var k;
        for (k = 0; k < 16; k++) {
            var ox = W * (0.12 + azarDeco() * 0.76);
            var oy = Math.max(col.alturaEn(ox) + 18, lay.Hu * (0.3 + azarDeco() * 0.65));
            if (cercaDeHoyo(ox, oy, 1.25)) continue;
            var largo = W * (0.03 + azarDeco() * 0.03);
            g.beginPath();
            g.moveTo(ox - largo, oy);
            g.lineTo(ox - largo * 0.3, oy - 5);
            g.lineTo(ox + largo * 0.3, oy - 2);
            g.lineTo(ox + largo, oy - 6);
            g.strokePath();
        }
        // piedritas y matas de pasto
        for (k = 0; k < 26; k++) {
            var px = W * (0.08 + azarDeco() * 0.84);
            var py = Math.max(col.alturaEn(px) + 10, lay.Hu * (0.25 + azarDeco() * 0.75));
            if (cercaDeHoyo(px, py, 1.15)) continue;
            if (k % 3 === 0) {
                g.lineStyle(3, 0x6f9c3c, 1);
                g.lineBetween(px, py, px - 6, py - 12);
                g.lineBetween(px, py, px, py - 15);
                g.lineBetween(px, py, px + 6, py - 11);
            } else {
                g.fillStyle(k % 2 ? 0xc48a4c : 0xd8a465, 1);
                g.fillEllipse(px, py, 8 + azarDeco() * 10, 5 + azarDeco() * 5);
            }
        }
    }

    function ubicarDeco() {
        var W = lay.W;
        var Hu = lay.Hu;
        var horizonte = Hu * 0.32;
        var poner = function (im, x, y, alto, flip) {
            var base = alto / (im.frame.realHeight / RES) / RES;
            im.setScale(base);
            im.setPosition(x, y);
            im.setFlipX(!!flip);
        };
        poner(deco.carpa, W * 0.075, horizonte + Hu * 0.05, Hu * 0.2);
        poner(deco.cactusIzq, W * 0.025, Hu * 0.66, Hu * 0.3);
        poner(deco.cactusDer, W * 0.97, Hu * 0.5, Hu * 0.26, true);
        poner(deco.cactusChico, W * 0.89, horizonte + Hu * 0.02, Hu * 0.12);
        poner(deco.arbusto1, W * 0.2, horizonte + Hu * 0.03, Hu * 0.05);
        poner(deco.arbusto2, W * 0.985, Hu * 0.95, Hu * 0.07);
    }

    // ------------------------------------------------------------------ diseño

    function alturaBarra() {
        var barra = document.querySelector(".barra-abajo");
        if (!barra || !sc) return 0;
        var r = sc.game.canvas.getBoundingClientRect();
        var b = barra.getBoundingClientRect();
        if (!r.height) return 0;
        return Math.max(0, r.bottom - b.top) * (sc.scale.height / r.height);
    }

    function reacomodar() {
        if (!sc || !orden.length) return;
        var W = sc.scale.width;
        var H = sc.scale.height;
        if (W < 10 || H < 10) return;
        lay.W = W;
        lay.H = H;
        lay.Hu = Math.max(H * 0.62, H - alturaBarra());
        var Hu = lay.Hu;
        lay.sTopo = Math.min((0.2 * Hu) / BORDE_AGUJERO, (0.115 * W) / 200);
        lay.hoyoW = 200 * lay.sTopo * 1.12;
        lay.hoyoH = lay.hoyoW * 0.3;
        lay.globo = Math.min(0.2 * Hu, 0.2 * W, BORDE_AGUJERO * lay.sTopo * 1.0);
        lay.kGlobo = lay.globo / 130;
        orden.forEach(ubicarHoyo);
        dibujarFondo();
        ubicarDeco();
        if (luz) luz.setSize(W, H);
        dibujarTopos();
    }

    /** Phaser guarda la posición del lienzo; se renueva antes de cada toque (misma trampa que los otros juegos). */
    function vigilarPosicion(el) {
        var renovar = function () { if (sc && sc.scale) sc.scale.updateBounds(); };
        ["pointerdown", "mousedown", "touchstart"].forEach(function (ev) {
            el.addEventListener(ev, renovar, { capture: true, passive: true });
        });
        if (typeof ResizeObserver === "function") {
            var ro = new ResizeObserver(function () {
                renovar();
                reacomodar();
            });
            ro.observe(document.body);
            var barra = document.querySelector(".barra-abajo");
            if (barra) ro.observe(barra);
        }
        global.addEventListener("scroll", renovar, { passive: true });
    }

    function aPantalla(x, y) {
        var r = sc.game.canvas.getBoundingClientRect();
        return { x: r.left + x * (r.width / sc.scale.width), y: r.top + y * (r.height / sc.scale.height) };
    }

    function mundoDePantalla(x, y) {
        var r = sc.game.canvas.getBoundingClientRect();
        return { x: (x - r.left) * (sc.scale.width / r.width), y: (y - r.top) * (sc.scale.height / r.height) };
    }

    /** Centro del globo de un agujero (mundo o pantalla). */
    function puntoGlobo(id, mundo) {
        var r = hoyos[id];
        if (!r) return null;
        var p = { x: r.x, y: r.lip - BORDE_AGUJERO * lay.sTopo - 6 - 74 * lay.kGlobo };
        return mundo ? p : aPantalla(p.x, p.y);
    }

    /** Cara del topo cuando está afuera (pantalla). */
    function puntoTopo(id) {
        var r = hoyos[id];
        if (!r) return null;
        return aPantalla(r.x, r.lip - (BORDE_AGUJERO - 150) * lay.sTopo);
    }

    function puntoDe(id) {
        if (!sc) return null;
        if (hoyos[id]) return puntoTopo(id);
        return null;
    }

    // ------------------------------------------------------------------ efectos

    function estrellas(x, y, n, colores, fuerza) {
        if (!sc || reducido) return;
        var e = sc.add.particles(x, y, n > 14 ? "fx-estrella" : "fx-chispa", {
            speed: { min: 110 * (fuerza || 1), max: 300 * (fuerza || 1) },
            angle: { min: 0, max: 360 },
            scale: { start: Math.max(0.45, lay.kGlobo * 0.9), end: 0 },
            lifespan: { min: 450, max: 950 },
            rotate: { min: 0, max: 360 },
            gravityY: 240,
            tint: colores || COLORES_FIESTA,
            blendMode: "ADD",
            emitting: false
        });
        e.setDepth(40);
        e.explode(n || 12);
        sc.time.delayedCall(1300, function () { e.destroy(); });
    }

    /** El globo estalla: aro que se abre y estrellas de colores. */
    function estallido(x, y) {
        if (!sc) return;
        var aro = sc.add.image(x, y, "fx-halo");
        aro.setBlendMode(Phaser.BlendModes.ADD);
        aro.setDepth(41);
        aro.setScale(0.5 * lay.kGlobo);
        aro.setTint(0xfff3bf);
        sc.tweens.add({ targets: aro, scale: 2.6 * lay.kGlobo, alpha: 0, duration: 520, ease: "Cubic.easeOut", onComplete: function () { aro.destroy(); } });
        estrellas(x, y, 18, null, 0.9);
    }

    /** Lluvia de estrellas desde arriba durante ms. */
    function lluvia(ms) {
        if (!sc || reducido) return;
        var e = sc.add.particles(0, -20, "fx-estrella", {
            x: { min: 0, max: lay.W },
            speedY: { min: 140, max: 280 },
            speedX: { min: -40, max: 40 },
            lifespan: Math.max(1600, (lay.H / 170) * 1000),
            scale: { start: 0.7, end: 0.25 },
            rotate: { min: 0, max: 360 },
            tint: COLORES_FIESTA,
            blendMode: "ADD",
            frequency: 45,
            quantity: 2
        });
        e.setDepth(46);
        sc.time.delayedCall(ms || 3000, function () { e.stop(); });
        sc.time.delayedCall((ms || 3000) + 3500, function () { e.destroy(); });
    }

    /** El escenario se ilumina (luz cálida que late) o vuelve a la normalidad. */
    function iluminar(on) {
        if (!luz) return;
        sc.tweens.killTweensOf(luz);
        if (!on) {
            sc.tweens.add({ targets: luz, alpha: 0, duration: 500 });
            return;
        }
        luz.setAlpha(0);
        sc.tweens.add({ targets: luz, alpha: 0.32, duration: 600, ease: "Sine.easeOut", onComplete: function () {
            if (!reducido) sc.tweens.add({ targets: luz, alpha: 0.16, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        } });
    }

    /** Texto que sube y se desvanece (por ejemplo "+1" sobre el topo). */
    function flotante(x, y, texto, color) {
        if (!sc) return;
        var t = sc.add.text(x, y, texto, {
            fontFamily: "Fredoka, sans-serif",
            fontSize: Math.round(clamp(lay.globo * 0.38, 26, 48)) + "px",
            fontStyle: "700",
            color: color || "#ffffff",
            stroke: "#e67700",
            strokeThickness: 7
        });
        t.setOrigin(0.5);
        t.setDepth(50);
        sc.tweens.add({ targets: t, y: y - lay.globo * 0.7, alpha: 0, duration: 900, ease: "Cubic.easeOut", onComplete: function () { t.destroy(); } });
    }

    /**
     * Mazo de juguete: aparece a la derecha del topo, toma impulso y cae sobre su cabeza. La Promise
     * se resuelve en el impacto (ahí topos.js hace la reacción); luego el mazo sube y se desvanece.
     * Unidades del dibujo: la cabeza del mazo está a 159 de la empuñadura y mide 128 de largo.
     */
    function mazo(id) {
        var r = hoyos[id];
        if (!sc || !r) return Promise.resolve();
        var s = lay.sTopo;
        var m = (230 * s) / 159;                         // px por unidad de dibujo
        var cabeza = r.lip - (BORDE_AGUJERO - CORONILLA) * s;    // coronilla del topo
        // con el mango horizontal (ángulo -90) la cabeza del mazo queda vertical y su punta baja toca al topo
        var gx = r.x + 159 * m;
        var gy = cabeza - 64 * m;
        var im = sc.add.image(gx, gy, "deco-mazo");
        var o = origen(DECO.mazo);
        im.setOrigin(o.x, o.y);
        im.setScale(m / RES);
        im.setDepth(42);
        im.angle = 10;
        im.setAlpha(0);
        var rapido = reducido ? 0.4 : 1;
        return new Promise(function (resolve) {
            var hecho = false;
            var impacto = function () {
                if (hecho) return;
                hecho = true;
                estrellas(r.x, cabeza, 8, [0xffe066, 0xffffff, 0xffb36b], 0.6);
                resolve();
                sc.tweens.add({ targets: im, angle: -55, alpha: 0, duration: 260, delay: 90, ease: "Quad.easeOut", onComplete: function () { im.destroy(); } });
            };
            sc.tweens.add({ targets: im, alpha: 1, angle: 28, duration: 90 * rapido, ease: "Quad.easeOut", onComplete: function () {
                sc.tweens.add({ targets: im, angle: -90, duration: 110 * rapido, ease: "Quad.easeIn", onComplete: impacto });
            } });
            // si la escena no avanza (pestaña oculta), el golpe igual se resuelve
            setTimeout(function () { if (!hecho) { im.angle = -90; impacto(); } }, 500);
        });
    }

    /**
     * Estrellitas de mareo: tres estrellas amarillas dan vueltas sobre la cabeza del topo durante ms.
     * Siguen al topo en cada cuadro (si se hunde, se van con él) y se borran solas.
     */
    function mareo(id, ms) {
        var r = hoyos[id];
        if (!sc || !r) return;
        var s = lay.sTopo;
        var es = [0, 1, 2].map(function () {
            var e = sc.add.image(0, 0, "fx-estrella");
            e.setTint(0xffe066);
            e.setScale(Math.max(0.35, s * 0.9));
            e.setDepth(r.img.depth + 0.5);
            return e;
        });
        var giro = { t: 0 };
        sc.tweens.add({
            targets: giro, t: 1, duration: reducido ? 300 : (ms || 900), ease: "Linear",
            onUpdate: function () {
                var cx = r.img.x;
                var cy = r.img.y - (PIVOTE - CORONILLA + 8) * s * r.ky;
                es.forEach(function (e, i) {
                    var a = giro.t * Math.PI * 4 + (i * Math.PI * 2) / 3;
                    e.setPosition(cx + Math.cos(a) * 58 * s, cy + Math.sin(a) * 16 * s);
                    e.angle = giro.t * 360;
                    e.setAlpha(giro.t > 0.8 ? (1 - giro.t) * 5 : 1);
                });
            },
            onComplete: function () { es.forEach(function (e) { e.destroy(); }); },
            onStop: function () { es.forEach(function (e) { e.destroy(); }); }
        });
    }

    /** La pantalla se sacude un poquito (al golpear un objeto). */
    function sacudir() {
        if (!sc || reducido) return;
        sc.cameras.main.shake(280, 0.012);
    }

    // ------------------------------------------------------------------ montaje

    function fuenteLista() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        return Promise.race([
            document.fonts.load('700 24px "Fredoka"').catch(function () {}),
            sleep(1500)
        ]);
    }

    function montar(el, config) {
        if (config) cfg = config;
        if (listoPromesa) return listoPromesa;
        if (!Phaser || !I || !R || !global.Topos || !cfg) {
            console.warn("[EscenarioTopos] falta Phaser, IconosTopos, ReglasTopos, Topos o config");
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        listoPromesa = new Promise(function (resolve) {
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: el,
                transparent: true,
                banner: false,
                scale: { mode: Phaser.Scale.RESIZE, width: el.clientWidth || 800, height: el.clientHeight || 600 },
                input: { activePointers: 3 },
                scene: {
                    create: function () {
                        sc = this;
                        texturasFx();
                        var cargas = [fuenteLista()];
                        Object.keys(I.SVG).forEach(function (k) { cargas.push(cargarSvg("ico-" + k, I.SVG[k], 120, 120)); });
                        Object.keys(global.Topos.SVG).forEach(function (k) { cargas.push(cargarSvg("topo-" + k, global.Topos.SVG[k], 200, ALTO_TOPO)); });
                        Object.keys(DECO).forEach(function (k) { cargas.push(cargarSvg("deco-" + k, DECO[k])); });
                        Promise.all(cargas).then(function () {
                            fondoG = sc.add.graphics();
                            fondoG.setDepth(0);
                            deco.carpa = imagenDe("deco-carpa", DECO.carpa).setDepth(3);
                            deco.cactusIzq = imagenDe("deco-cactus", DECO.cactus).setDepth(4);
                            deco.cactusDer = imagenDe("deco-cactus", DECO.cactus).setDepth(4);
                            deco.cactusChico = imagenDe("deco-cactus", DECO.cactus).setDepth(3);
                            deco.arbusto1 = imagenDe("deco-arbusto", DECO.arbusto).setDepth(3);
                            deco.arbusto2 = imagenDe("deco-arbusto", DECO.arbusto).setDepth(48);
                            crearHoyos();
                            luz = sc.add.rectangle(0, 0, 10, 10, 0xfff3bf, 1);
                            luz.setOrigin(0, 0);
                            luz.setBlendMode(Phaser.BlendModes.ADD);
                            luz.setDepth(45);
                            luz.setAlpha(0);
                            reacomodar();
                            sc.scale.on("resize", reacomodar);
                            sc.events.on("update", dibujarTopos);
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__escenarioTopos = juego;
        });
        return listoPromesa;
    }

    global.EscenarioTopos = {
        montar: montar,
        listo: function () { return !!(sc && orden.length); },
        reacomodar: reacomodar,
        escena: function () { return sc; },
        objetos: function () { return obj; },
        diseno: function () { return lay; },
        config: function () { return cfg; },
        hoyo: function (id) { return hoyos[id] || null; },
        hoyos: function () { return orden.slice(); },
        alGolpear: function (fn) { golpeCb = fn; },
        iconoGlobo: iconoGlobo,
        marcaGlobo: marcaGlobo,
        haloGlobo: haloGlobo,
        puntoGlobo: puntoGlobo,
        puntoTopo: puntoTopo,
        puntoDe: puntoDe,
        estallido: estallido,
        estrellas: estrellas,
        lluvia: lluvia,
        iluminar: iluminar,
        flotante: flotante,
        mazo: mazo,
        mareo: mareo,
        sacudir: sacudir,
        aPantalla: aPantalla,
        mundoDePantalla: mundoDePantalla
    };
})(window);
