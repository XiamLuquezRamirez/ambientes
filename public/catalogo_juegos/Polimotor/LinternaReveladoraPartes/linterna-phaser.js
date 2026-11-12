/**
 * LinternaPhaser — campamento, Zoe y la linterna (window.LinternaPhaser). Phaser 4.
 *
 * La oscuridad es UN lienzo: se pinta de azul noche y se le resta un círculo con
 * destination-out. Ese lienzo se sube como textura una vez por movimiento, no por
 * objeto. El borde dorado, la linterna y las chispas son sprites fijos que se trasladan.
 *
 * Un toque cuenta solo si, al apoyar el dedo, esa zona ya estaba dentro del haz.
 * Arrastrar mueve la luz y al soltar no confirma: si no, pasar la luz bastaría.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser || null;
    var P = global.Personaje;
    var G = P ? P.GEOMETRIA : null;
    var R = function () { return global.Retos; };
    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);

    var RES = 2;
    var IDS = [
        "barriga", "mano_izq", "mano_der", "pie_izq", "pie_der",
        "rodilla_izq", "rodilla_der", "hombro_izq", "hombro_der",
        "oreja_izq", "oreja_der", "ojo_izq", "ojo_der", "boca",
        "cabello", "coleta_izq", "coleta_der", "cuerpo"
    ];
    var INICIOS = {
        "abajo-izq": { x: 0.16, y: 0.82 },
        "abajo-der": { x: 0.84, y: 0.82 },
        "arriba-der": { x: 0.88, y: 0.2 },
        "arriba-izq": { x: 0.14, y: 0.22 }
    };
    // El cuerpo de la linterna cuelga bajo el centro del haz para no tapar la parte.

    var juego = null;
    var sc = null;
    var capaCamp = null;
    var obj = {};
    var luz = { x: -400, y: -400, r: 140 };
    var meta = { x: -400, y: -400 };
    var rect = { w: 800, h: 600 };
    var lienzo = null;
    var ctx = null;
    var grad = null;
    var imgOsc = null;
    var flash = null;
    var halos = [];
    var huellas = [];
    var pool = [];
    var habilitado = false;
    var scripted = false;
    var tweenLuz = null;
    var sucio = true;
    var ALPHA_OSCURO = 0.8;
    var ALPHA_CONTRASTE = 0.5;
    var alphaBase = ALPHA_OSCURO;
    var revelado = false;
    var umbral = 0.82;
    var retoActual = null;
    var pistasOn = false;
    var estaba = false;
    var ultimoAviso = 0;
    var ultimaChispa = 0;
    var pasoChispa = 0;
    var onToque = null;
    var onCambioLuz = null;
    var listoPromesa = null;
    var pulsado = null;
    var ultimoToque = null;
    var puntoTmp = { x: 0, y: 0 };

    function calcularRadio(w, h) {
        var m = Math.min(w, h);
        return Math.round(Math.max(58, Math.min(m * 0.115, 92)));
    }

    function minToque() {
        return Math.min(rect.w, rect.h) < 760 ? 42 : 34;
    }

    // ------------------------------------------------------------------ texturas

    function texturaCanvas(clave, s, dibujar) {
        if (sc.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = s;
        c.height = s;
        dibujar(c.getContext("2d"), s);
        sc.textures.addCanvas(clave, c);
    }

    function texturasFx() {
        grad = document.createElement("canvas");
        grad.width = 256;
        grad.height = 256;
        var g = grad.getContext("2d");
        var rg = g.createRadialGradient(128, 128, 10, 128, 128, 128);
        rg.addColorStop(0, "rgba(255,255,255,1)");
        rg.addColorStop(0.42, "rgba(255,255,255,0.92)");
        rg.addColorStop(0.68, "rgba(255,255,255,0.18)");
        rg.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = rg;
        g.fillRect(0, 0, 256, 256);

        texturaCanvas("fx-borde", 256, function (c, s) {
            var rg2 = c.createRadialGradient(s / 2, s / 2, s * 0.28, s / 2, s / 2, s * 0.5);
            rg2.addColorStop(0, "rgba(255,220,120,0)");
            rg2.addColorStop(0.7, "rgba(255,214,90,0)");
            rg2.addColorStop(0.84, "rgba(255,236,170,0.75)");
            rg2.addColorStop(0.93, "rgba(255,200,80,0.2)");
            rg2.addColorStop(1, "rgba(255,200,80,0)");
            c.fillStyle = rg2;
            c.fillRect(0, 0, s, s);
        });
        texturaCanvas("fx-halo", 128, function (c, s) {
            var h = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            h.addColorStop(0, "rgba(255,236,160,0.95)");
            h.addColorStop(0.45, "rgba(255,196,60,0.45)");
            h.addColorStop(1, "rgba(255,196,60,0)");
            c.fillStyle = h;
            c.fillRect(0, 0, s, s);
        });
        texturaCanvas("fx-huella", 64, function (c, s) {
            // huellita de pie: planta y cinco deditos, con brillo suave alrededor
            c.shadowColor = "rgba(255,214,90,0.95)";
            c.shadowBlur = s * 0.14;
            c.fillStyle = "rgba(255,246,200,1)";
            c.beginPath();
            c.ellipse(s * 0.5, s * 0.62, s * 0.17, s * 0.25, 0, 0, Math.PI * 2);
            c.fill();
            [[0.34, 0.27, 0.07], [0.45, 0.22, 0.06], [0.55, 0.22, 0.055], [0.64, 0.26, 0.05], [0.71, 0.32, 0.045]].forEach(function (d) {
                c.beginPath();
                c.arc(s * d[0], s * d[1], s * d[2], 0, Math.PI * 2);
                c.fill();
            });
        });
        texturaCanvas("fx-glow", 128, function (c, s) {
            var h = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            h.addColorStop(0, "rgba(255,255,255,1)");
            h.addColorStop(0.3, "rgba(255,255,255,0.6)");
            h.addColorStop(1, "rgba(255,255,255,0)");
            c.fillStyle = h;
            c.fillRect(0, 0, s, s);
        });
        texturaCanvas("fx-anillo", 128, function (c, s) {
            c.strokeStyle = "rgba(255,255,255,1)";
            c.shadowColor = "rgba(255,255,255,1)";
            c.shadowBlur = s * 0.08;
            c.lineWidth = s * 0.05;
            c.beginPath();
            c.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
            c.stroke();
        });
        texturaCanvas("fx-calido", 256, function (c, s) {
            var h = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            h.addColorStop(0, "rgba(255,244,205,0.85)");
            h.addColorStop(0.55, "rgba(255,226,150,0.45)");
            h.addColorStop(0.8, "rgba(255,206,110,0.12)");
            h.addColorStop(1, "rgba(255,200,100,0)");
            c.fillStyle = h;
            c.fillRect(0, 0, s, s);
        });
        texturaCanvas("fx-estrella", 48, function (c, s) {
            c.translate(s / 2, s / 2);
            c.beginPath();
            for (var i = 0; i < 10; i++) {
                var rr = i % 2 === 0 ? s * 0.48 : s * 0.2;
                var a = -Math.PI / 2 + i * Math.PI / 5;
                c[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * rr, Math.sin(a) * rr);
            }
            c.closePath();
            c.fillStyle = "#ffffff";
            c.fill();
        });
        texturaCanvas("fx-chispa", 32, function (c, s) {
            c.translate(s / 2, s / 2);
            c.fillStyle = "#fff6c8";
            c.beginPath();
            c.moveTo(0, -s / 2);
            c.quadraticCurveTo(0, 0, s / 2, 0);
            c.quadraticCurveTo(0, 0, 0, s / 2);
            c.quadraticCurveTo(0, 0, -s / 2, 0);
            c.quadraticCurveTo(0, 0, 0, -s / 2);
            c.fill();
        });
    }

    function cargarSvg(clave, svg) {
        return new Promise(function (resolve) {
            var o = P.origen(clave);
            var img = new Image();
            img.onload = function () {
                var c = document.createElement("canvas");
                c.width = Math.max(1, Math.ceil(o.w * RES));
                c.height = Math.max(1, Math.ceil(o.h * RES));
                c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                if (sc.textures.exists("zoe-" + clave)) sc.textures.remove("zoe-" + clave);
                sc.textures.addCanvas("zoe-" + clave, c);
                resolve();
            };
            img.onerror = function () { resolve(); };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        });
    }

    function imagen(clave, x, y) {
        var o = P.origen(clave);
        var im = sc.add.image(x || 0, y || 0, "zoe-" + clave);
        im.setOrigin(o.x, o.y);
        im.setScale(1 / RES);
        im.escalaBase = 1 / RES;
        return im;
    }

    function espejoX(im) {
        im.scaleX = -im.escalaBase;
        im.espejo = true;
    }

    function armarZoe() {
        var zoe = sc.add.container(rect.w / 2, rect.h * 0.9);
        zoe.setDepth(2);
        zoe.setAlpha(0);
        obj.zoe = zoe;
        obj.sombra = sc.add.ellipse(0, 6, 340, 42, 0x14301c, 0.35);
        zoe.add(obj.sombra);
        obj.cuerpo = imagen("cuerpo");
        zoe.add(obj.cuerpo);
        obj.pieIzq = imagen("zapato", G.talon.x, G.talon.y);
        obj.pieDer = imagen("zapato", -G.talon.x, G.talon.y);
        espejoX(obj.pieDer);
        zoe.add([obj.pieIzq, obj.pieDer]);

        var cab = sc.add.container(G.cabeza.x, G.cabeza.y);
        cab.setScale(G.escalaCabeza || 1);
        obj.cabeza = cab;
        obj.peloAtras = imagen("pelo_atras");
        obj.coletaIzq = imagen("coleta", G.coleta.x, G.coleta.y);
        obj.coletaDer = imagen("coleta", -G.coleta.x, G.coleta.y);
        espejoX(obj.coletaDer);
        obj.orejaIzq = imagen("oreja", G.oreja.x, G.oreja.y);
        obj.orejaDer = imagen("oreja", -G.oreja.x, G.oreja.y);
        espejoX(obj.orejaDer);
        obj.cara = imagen("cara");
        obj.ojoIzq = imagen("ojo", G.ojo.x, G.ojo.y);
        obj.ojoDer = imagen("ojo", -G.ojo.x, G.ojo.y);
        obj.ojoDer.setFlipX(true);
        obj.cejaIzq = imagen("ceja", G.ceja.x, G.ceja.y);
        obj.cejaDer = imagen("ceja", -G.ceja.x, G.ceja.y);
        obj.cejaDer.setFlipX(true);
        obj.nariz = imagen("nariz", G.nariz.x, G.nariz.y);
        obj.boca = imagen("boca_sonrisa", G.boca.x, G.boca.y);
        obj.peloFrente = imagen("pelo_frente");
        // Como en el dibujo de Zoe: el pelo y las coletas van encima de la cara.
        cab.add([
            obj.peloAtras, obj.orejaIzq, obj.orejaDer,
            obj.cara, obj.ojoIzq, obj.ojoDer, obj.cejaIzq, obj.cejaDer, obj.nariz, obj.boca, obj.peloFrente,
            obj.coletaIzq, obj.coletaDer
        ]);
        zoe.add(cab);

        function brazo(lado) {
            var k = lado === "izq" ? 1 : -1;
            var b = sc.add.container(k * G.hombro.x, G.hombro.y);
            var im = imagen("brazo");
            var mano = imagen("mano", G.mano.x, G.mano.y);
            if (k < 0) {
                im.setFlipX(true);
                mano.setFlipX(true);
            }
            b.add([im, mano]);
            b.rotation = -k * G.brazoReposo;
            b.lado = lado;
            b.reposo = b.rotation;
            b.mano = mano;
            return b;
        }
        obj.brazoIzq = brazo("izq");
        obj.brazoDer = brazo("der");
        zoe.add([obj.brazoIzq, obj.brazoDer]);
    }

    // La linterna se dibuja con el vidrio en (0,0) apuntando hacia -y.
    // Va fuera del círculo de luz (abajo a un lado) y gira para apuntar al centro.
    var DIR_BASE = { x: 0.55, y: 0.84 };
    var dir = { x: DIR_BASE.x, y: DIR_BASE.y };
    var lente = { x: -400, y: -400 };
    var vel = { x: 0, y: 0 };
    var inclina = 0;

    function dibujarLinterna(g) {
        g.clear();
        // cabeza (cono violeta)
        g.fillStyle(0x6a3fd6, 1);
        g.fillPoints([{ x: -31, y: 4 }, { x: 31, y: 4 }, { x: 20, y: 42 }, { x: -20, y: 42 }], true);
        g.fillStyle(0x9a74ff, 1);
        g.fillPoints([{ x: -31, y: 4 }, { x: -6, y: 4 }, { x: -4, y: 42 }, { x: -20, y: 42 }], true);
        // cuerpo
        g.fillStyle(0x7c4dff, 1);
        g.fillRoundedRect(-19, 38, 38, 92, 12);
        g.fillStyle(0xa98bff, 1);
        g.fillRoundedRect(-17, 42, 10, 82, 5);
        g.lineStyle(3, 0x5530c4, 0.9);
        [96, 106, 116].forEach(function (y) { g.lineBetween(-16, y, 16, y); });
        // botón rosado
        g.fillStyle(0xff5fa2, 1);
        g.fillCircle(2, 60, 7.5);
        g.fillStyle(0xffc6df, 1);
        g.fillCircle(0, 58, 2.6);
        // tapa
        g.fillStyle(0x4b2aa8, 1);
        g.fillRoundedRect(-17, 126, 34, 12, 5);
        g.fillStyle(0xffd166, 1);
        g.fillCircle(0, 142, 4);
        // aro dorado y vidrio encendido
        g.fillStyle(0xf2b134, 1);
        g.fillRoundedRect(-35, -7, 70, 15, 7);
        g.fillStyle(0xffe08a, 1);
        g.fillRoundedRect(-31, -5, 62, 5, 3);
        g.fillStyle(0xfffbe2, 1);
        g.fillEllipse(0, -6, 58, 11);
        // estrellita mágica en el cuerpo
        g.fillStyle(0xffe066, 1);
        var pts = [];
        for (var i = 0; i < 10; i++) {
            var rr = i % 2 === 0 ? 8 : 3.4;
            var a = -Math.PI / 2 + i * Math.PI / 5;
            pts.push({ x: Math.cos(a) * rr, y: 82 + Math.sin(a) * rr });
        }
        g.fillPoints(pts, true);
    }

    function dibujarMano(g) {
        var piel = 0xf8cba8;
        var borde = 0xd28e68;
        g.clear();
        // puño de la manga
        g.fillStyle(0x38b6e8, 1);
        g.fillRoundedRect(26, 82, 34, 36, 10);
        g.fillStyle(0x7fd8ff, 1);
        g.fillRoundedRect(26, 82, 9, 36, 4);
        // palma
        g.fillStyle(piel, 1);
        g.lineStyle(3, borde, 1);
        g.fillRoundedRect(2, 66, 36, 50, 16);
        g.strokeRoundedRect(2, 66, 36, 50, 16);
        // dedos que abrazan la linterna
        for (var i = 0; i < 4; i++) {
            var y = 68 + i * 11.5;
            g.fillStyle(piel, 1);
            g.fillRoundedRect(-25, y, 36, 11, 5.5);
            g.strokeRoundedRect(-25, y, 36, 11, 5.5);
        }
        // pulgar sobre el botón
        g.fillStyle(piel, 1);
        g.fillRoundedRect(-6, 52, 28, 13, 6.5);
        g.strokeRoundedRect(-6, 52, 28, 13, 6.5);
    }

    function armarLinterna() {
        var ADD = Phaser.BlendModes.ADD;
        obj.calido = sc.add.image(-400, -400, "fx-calido").setDepth(5.5).setBlendMode(ADD).setAlpha(0.2);
        obj.cono = sc.add.graphics().setDepth(5.4).setBlendMode(ADD);

        var anillo = sc.add.container(-400, -400).setDepth(11);
        obj.borde = sc.add.image(0, 0, "fx-borde");
        obj.borde.setBlendMode(ADD);
        obj.borde.setAlpha(0.6);
        anillo.add(obj.borde);
        obj.orbitas = [];
        for (var o = 0; o < 3; o++) {
            var dot = sc.add.image(0, 0, "fx-estrella").setBlendMode(ADD).setTint(0xfff1a8);
            dot.setDisplaySize(13, 13);
            obj.orbitas.push(dot);
            anillo.add(dot);
        }
        anillo.setAlpha(0);
        obj.anillo = anillo;

        var lamp = sc.add.container(-400, -400);
        lamp.setDepth(12);
        lamp.setAlpha(0);
        obj.glowLente = sc.add.image(0, -6, "fx-glow").setBlendMode(ADD).setTint(0xfff0b0).setAlpha(0.9);
        obj.glowLente.setDisplaySize(110, 60);
        var g = sc.add.graphics();
        dibujarLinterna(g);
        var m = sc.add.graphics();
        dibujarMano(m);
        lamp.add([g, obj.glowLente, m]);
        obj.lampara = lamp;
        obj.linterna = lamp;

        for (var i = 0; i < 6; i++) {
            var h = sc.add.image(0, 0, "fx-huella").setDepth(8).setVisible(false).setAlpha(0.8);
            h.setDisplaySize(30, 30);
            huellas.push(h);
        }
        obj.guias = [];
        for (var k = 0; k < 6; k++) {
            var gs = sc.add.image(0, 0, "fx-estrella").setDepth(8).setVisible(false).setBlendMode(ADD);
            gs.setTint(0xfff1a8);
            obj.guias.push(gs);
        }
        for (var n = 0; n < 22; n++) {
            var estrella = n < 12;
            var im = sc.add.image(0, 0, estrella ? "fx-estrella" : "fx-chispa");
            im.setDepth(13).setVisible(false);
            pool.push({ img: im, viva: false, estrella: estrella });
        }
        obj.fiesta = [];
        for (var f = 0; f < 22; f++) {
            var luzColor = sc.add.image(0, 0, "fx-glow").setDepth(14).setBlendMode(ADD).setVisible(false);
            obj.fiesta.push(luzColor);
        }
        obj.onda = sc.add.image(0, 0, "fx-anillo").setDepth(13).setBlendMode(ADD).setTint(0xffd36b).setVisible(false);
        flash = sc.add.rectangle(0, 0, 4, 4, 0xffd36b, 0).setOrigin(0, 0).setDepth(30);
        flash.setAlpha(0);
    }

    // ------------------------------------------------------------------ oscuridad

    function recrearOscuridad(w, h) {
        var tw = Math.max(2, Math.round(w / 2));
        var th = Math.max(2, Math.round(h / 2));
        if (!lienzo) {
            lienzo = document.createElement("canvas");
            ctx = lienzo.getContext("2d");
        }
        if (imgOsc) {
            imgOsc.destroy();
            imgOsc = null;
        }
        if (sc.textures.exists("oscuridad")) sc.textures.remove("oscuridad");
        lienzo.width = tw;
        lienzo.height = th;
        sc.textures.addCanvas("oscuridad", lienzo);
        imgOsc = sc.add.image(0, 0, "oscuridad").setOrigin(0, 0).setDepth(5);
        imgOsc.setDisplaySize(w, h);
        imgOsc.setAlpha(revelado ? 0 : alphaBase);
        sucio = true;
    }

    /** Puntos del cono: los dos bordes del vidrio y los dos lados del círculo. */
    function puntosCono() {
        var k = obj.lampara ? Math.abs(obj.lampara.scaleY) : 1;
        var dx = luz.x - lente.x;
        var dy = luz.y - lente.y;
        var d = Math.hypot(dx, dy) || 1;
        var px = -dy / d;
        var py = dx / d;
        var a = 26 * k;
        var b = luz.r * 0.9;
        return [
            { x: lente.x + px * a, y: lente.y + py * a },
            { x: luz.x + px * b, y: luz.y + py * b },
            { x: luz.x - px * b, y: luz.y - py * b },
            { x: lente.x - px * a, y: lente.y - py * a }
        ];
    }

    function pintarOscuridad() {
        if (!ctx || !imgOsc || !lienzo || !sc) return;
        var tw = lienzo.width;
        var th = lienzo.height;
        var jw = Math.max(1, rect.w);
        var jh = Math.max(1, rect.h);
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, tw, th);
        ctx.fillStyle = "rgba(4, 8, 28, 1)";
        ctx.fillRect(0, 0, tw, th);
        if (!revelado && alphaBase > 0.02) {
            ctx.globalCompositeOperation = "destination-out";
            var sx = tw / jw;
            var sy = th / jh;
            var r = luz.r * (sx + sy) * 0.5;
            // luz de luna tenue sobre Zoe: se adivina su silueta, pero las partes
            // solo se ven bien con la linterna
            var cuerpo = obj.zoe ? mundoPorId("cuerpo") : null;
            var zx = cuerpo ? cuerpo.x : jw * 0.5;
            var zy = cuerpo ? cuerpo.y : jh * 0.55;
            var zrx = cuerpo ? cuerpo.rx * 1.5 : jw * 0.14;
            var zry = cuerpo ? cuerpo.ry * 1.25 : jh * 0.4;
            ctx.globalAlpha = 0.24;
            ctx.drawImage(grad, (zx - zrx) * sx, (zy - zry) * sy, zrx * 2 * sx, zry * 2 * sy);
            ctx.globalAlpha = 1;
            if (obj.lampara && obj.lampara.alpha > 0.05) {
                var cono = puntosCono();
                ctx.fillStyle = "rgba(0,0,0,0.38)";
                ctx.beginPath();
                cono.forEach(function (p, i) {
                    if (i === 0) ctx.moveTo(p.x * sx, p.y * sy);
                    else ctx.lineTo(p.x * sx, p.y * sy);
                });
                ctx.closePath();
                ctx.fill();
            }
            ctx.drawImage(grad, luz.x * sx - r, luz.y * sy - r, r * 2, r * 2);
            ctx.globalCompositeOperation = "source-over";
        }
        var tex = sc.textures.get("oscuridad");
        if (tex && tex.source && tex.source[0]) tex.source[0].update();
    }

    function elegirDireccion(k) {
        var largo = luz.r * 1.18 + 150 * k;
        var tx = DIR_BASE.x;
        var ty = DIR_BASE.y;
        if (luz.x + tx * largo + 40 * k > rect.w) tx = -tx;
        if (luz.y + ty * largo > rect.h - 10) ty = -ty;
        return { x: tx, y: ty };
    }

    function colocarLampara() {
        if (!obj.lampara) return;
        var k = Math.max(0.78, Math.min(1.2, rect.h / 700));
        var obj2 = elegirDireccion(k);
        var suave = scripted ? 0.25 : 0.12;
        dir.x += (obj2.x - dir.x) * suave;
        dir.y += (obj2.y - dir.y) * suave;
        var n = Math.hypot(dir.x, dir.y) || 1;
        var ux = dir.x / n;
        var uy = dir.y / n;
        var dist = luz.r * 1.18;
        lente.x = luz.x + ux * dist;
        lente.y = luz.y + uy * dist;
        var lamp = obj.lampara;
        lamp.setPosition(lente.x, lente.y);
        lamp.rotation = Math.atan2(luz.y - lente.y, luz.x - lente.x) + Math.PI / 2 + inclina;
        lamp.scaleY = k;
        lamp.scaleX = ux < 0 ? -k : k;
        if (obj.anillo) {
            obj.anillo.setPosition(luz.x, luz.y);
            var d = luz.r * 2.04;
            obj.borde.setDisplaySize(d, d);
            obj.anillo.setVisible(!revelado && alphaBase > 0.05);
        }
        if (obj.calido) {
            obj.calido.setPosition(luz.x, luz.y);
            obj.calido.setDisplaySize(luz.r * 2.3, luz.r * 2.3);
            obj.calido.setVisible(!revelado && alphaBase > 0.05 && lamp.alpha > 0.05);
        }
        if (obj.cono) {
            obj.cono.clear();
            if (!revelado && alphaBase > 0.05 && lamp.alpha > 0.05) {
                obj.cono.fillStyle(0xfff0b8, 0.1 * lamp.alpha);
                obj.cono.fillPoints(puntosCono(), true);
            }
        }
    }

    function animarAnillo(time) {
        if (!obj.orbitas) return;
        var t = (time || 0) / 1000;
        obj.orbitas.forEach(function (dot, i) {
            var a = t * 1.4 + i * (Math.PI * 2 / 3);
            dot.setPosition(Math.cos(a) * luz.r * 0.98, Math.sin(a) * luz.r * 0.98);
            dot.setAlpha(0.55 + 0.45 * Math.sin(t * 5 + i));
            dot.angle = t * 90;
        });
        if (obj.glowLente) obj.glowLente.setAlpha(0.75 + Math.sin(t * 6) * 0.15);
        if (obj.anillo && obj.lampara) obj.anillo.setAlpha(obj.lampara.alpha);
    }

    // ------------------------------------------------------------------ zonas

    function contenedorDe(nombre) {
        if (nombre === "cabeza") return obj.cabeza;
        if (nombre === "brazo_izq") return obj.brazoIzq;
        if (nombre === "brazo_der") return obj.brazoDer;
        return obj.zoe;
    }

    function mundoZona(z) {
        var cont = contenedorDe(z.contenedor);
        if (!cont) return null;
        var m = cont.getWorldTransformMatrix();
        var p = m.transformPoint(z.x, z.y, { x: 0, y: 0 });
        var px = m.transformPoint(z.x + z.rx, z.y, { x: 0, y: 0 });
        var py = m.transformPoint(z.x, z.y + z.ry, { x: 0, y: 0 });
        return {
            id: z.id,
            x: p.x,
            y: p.y,
            rx: Math.max(8, Math.hypot(px.x - p.x, px.y - p.y)),
            ry: Math.max(8, Math.hypot(py.x - p.x, py.y - p.y))
        };
    }

    function defZona(id) {
        var z = G && G.zonas[id];
        return z ? { id: id, contenedor: z.contenedor, x: z.x, y: z.y, rx: z.rx, ry: z.ry } : null;
    }

    function mundoPorId(id) {
        if (obj.modo3d && global.Zoe3D && global.Zoe3D.zona) {
            var z3 = global.Zoe3D.zona(id);
            if (z3) return z3;
        }
        var z = defZona(id);
        return z ? mundoZona(z) : null;
    }

    function esperarZoe3D() {
        return new Promise(function (resolve) {
            var n = 0;
            var t = setInterval(function () {
                n++;
                if (global.Zoe3D || n > 40) {
                    clearInterval(t);
                    resolve(global.Zoe3D || null);
                }
            }, 50);
        });
    }

    function publicarZoe3D() {
        var lienzo = global.Zoe3D.lienzo();
        if (!lienzo) return false;
        if (sc.textures.exists("zoe3d")) sc.textures.remove("zoe3d");
        sc.textures.addCanvas("zoe3d", lienzo);
        if (!obj.zoe) {
            obj.zoe = sc.add.image(0, 0, "zoe3d").setOrigin(0, 0).setDepth(2);
            obj.zoe.baseEscala = 1;
        } else {
            obj.zoe.setTexture("zoe3d");
        }
        obj.modo3d = true;
        return true;
    }

    function cargarSvgYArmar() {
        var claves = Object.keys(P.SVG);
        return Promise.all(claves.map(function (k) { return cargarSvg(k, P.SVG[k]); })).then(function () {
            armarZoe();
        });
    }

    function zonasMundoDe(parte) {
        var reglas = R();
        var ids = reglas ? reglas.zonasDeParte(parte) : [];
        return ids.map(mundoPorId).filter(Boolean);
    }

    function zonaEn(x, y) {
        var reglas = R();
        if (!reglas || !obj.zoe) return null;
        var zonas = IDS.map(mundoPorId).filter(Boolean);
        return reglas.tocar(x, y, zonas, minToque());
    }

    function zonaIluminada(id) {
        var reglas = R();
        var z = mundoPorId(id);
        return !!(reglas && z && reglas.centroCubierto(luz, z, umbral));
    }

    function centroParte() {
        if (!retoActual) return null;
        var zs = zonasMundoDe(retoActual.parte);
        if (!zs.length) return null;
        var x = 0, y = 0;
        zs.forEach(function (z) { x += z.x; y += z.y; });
        return { x: x / zs.length, y: y / zs.length };
    }

    function asegurarHalos() {
        if (!retoActual) {
            halos.forEach(function (h) { h.glow.setVisible(false); h.aro.setVisible(false); });
            return;
        }
        var zs = zonasMundoDe(retoActual.parte);
        var ADD = Phaser.BlendModes.ADD;
        while (halos.length < zs.length) {
            halos.push({
                glow: sc.add.image(0, 0, "fx-halo").setDepth(7).setVisible(false).setBlendMode(ADD),
                aro: sc.add.image(0, 0, "fx-anillo").setDepth(7).setVisible(false).setBlendMode(ADD).setTint(0xffd84a)
            });
        }
        for (var i = zs.length; i < halos.length; i++) {
            halos[i].glow.setVisible(false);
            halos[i].aro.setVisible(false);
        }
    }

    function actualizarHalos(time) {
        if (!retoActual || !obj.zoe) {
            if (obj.guias) obj.guias.forEach(function (g) { g.setVisible(false); });
            return;
        }
        asegurarHalos();
        var t = (time || 0) / 1000;
        var zs = zonasMundoDe(retoActual.parte);
        var reglas = R();
        var encendida = false;
        zs.forEach(function (z, i) {
            var h = halos[i];
            if (!h) return;
            var cubre = reglas && reglas.centroCubierto(luz, z, umbral);
            if (cubre) encendida = true;
            var base = Math.max(z.rx, z.ry, 26);
            var pulso = reducido ? 1 : 1 + Math.sin(t * 6) * 0.1;
            h.glow.setPosition(z.x, z.y);
            h.glow.setDisplaySize(base * 3 * pulso, base * 3 * pulso);
            h.glow.setVisible(cubre);
            h.glow.setAlpha(0.14);
            h.aro.setPosition(z.x, z.y);
            h.aro.setDisplaySize(base * 2.7 * pulso, base * 2.7 * pulso);
            h.aro.setVisible(cubre);
            h.aro.setAlpha(0.65 + (reducido ? 0 : Math.sin(t * 6) * 0.3));
        });
        actualizarGuias(zs, t, reglas);
        if (encendida !== estaba) {
            estaba = encendida;
            if (encendida && Date.now() - ultimoAviso > 700) {
                ultimoAviso = Date.now();
                zs.forEach(function (z) { estrellas(z.x, z.y, 6, [0xffe066, 0xffffff, 0xffb3e6]); });
            }
            if (typeof onCambioLuz === "function") onCambioLuz(encendida);
        }
    }

    /** Estrellitas que parpadean suave sobre la parte pedida (más fuerte con pista). */
    function actualizarGuias(zs, t, reglas) {
        if (!obj.guias) return;
        var activas = habilitado && !revelado;
        obj.guias.forEach(function (g, i) {
            var z = zs[i % Math.max(1, zs.length)];
            var deZona = Math.floor(i / Math.max(1, zs.length));
            if (!activas || !z || deZona > (zs.length > 1 ? 2 : 2) || (reglas && reglas.centroCubierto(luz, z, umbral))) {
                g.setVisible(false);
                return;
            }
            var a = t * 0.8 + i * 2.1;
            var rx = Math.max(z.rx, 18) * 0.9;
            var ry = Math.max(z.ry, 18) * 0.9;
            g.setVisible(true);
            g.setPosition(z.x + Math.cos(a) * rx, z.y + Math.sin(a) * ry);
            var brillo = 0.5 + 0.5 * Math.sin(t * 3.2 + i * 1.7);
            var tam = (pistasOn ? 20 : 13) * (0.75 + brillo * 0.45);
            g.setDisplaySize(tam, tam);
            g.setAlpha((pistasOn ? 0.55 : 0.22) + brillo * (pistasOn ? 0.45 : 0.33));
            g.angle = t * 40 + i * 30;
        });
    }

    function actualizarHuellas(time) {
        var destino = pistasOn && habilitado ? centroParte() : null;
        var t = (time || 0) / 1000;
        var dx = destino ? destino.x - luz.x : 0;
        var dy = destino ? destino.y - luz.y : 0;
        var d = Math.hypot(dx, dy);
        var lejos = d > luz.r * 0.8;
        var ang = Math.atan2(dy, dx) + Math.PI / 2;
        var px = d ? -dy / d : 0;
        var py = d ? dx / d : 0;
        huellas.forEach(function (h, i) {
            if (!destino || !lejos) {
                h.setVisible(false);
                return;
            }
            var u = (i + 1) / (huellas.length + 1);
            var lado = i % 2 ? 1 : -1;
            h.setVisible(true);
            h.setPosition(luz.x + dx * u + px * lado * 9, luz.y + dy * u + py * lado * 9);
            h.rotation = ang;
            h.setFlipX(lado > 0);
            // la ola de brillo avanza de la linterna hacia la parte
            var ola = reducido ? 0.7 : Math.max(0, Math.sin(t * 4 - i * 0.9));
            h.setAlpha(0.2 + ola * 0.75);
        });
    }

    function tomar(estrella) {
        for (var i = 0; i < pool.length; i++) {
            if (!pool[i].viva && pool[i].estrella === !!estrella) return pool[i];
        }
        return null;
    }

    function soltar(x, y, estrella, dx, dy, ms) {
        var s = tomar(estrella);
        if (!s || !sc) return;
        s.viva = true;
        s.img.setPosition(x, y).setVisible(true).setAlpha(1).setScale(estrella ? 0.7 : 0.55);
        sc.tweens.add({
            targets: s.img,
            x: x + dx,
            y: y + dy,
            alpha: 0,
            duration: ms || 420,
            onComplete: function () {
                s.viva = false;
                s.img.setVisible(false);
            }
        });
    }

    function chispa(time) {
        if (time - ultimaChispa < 60) return;
        ultimaChispa = time;
        var a = pasoChispa * 2.513;
        pasoChispa++;
        soltar(
            luz.x + Math.cos(a) * luz.r * 0.72,
            luz.y + Math.sin(a) * luz.r * 0.72,
            false,
            Math.cos(a) * 10,
            Math.sin(a) * 10 - 16,
            380
        );
    }

    function estrellas(x, y, n, colores) {
        var total = Math.min(n || 8, 10);
        for (var i = 0; i < total; i++) {
            var a = (i / total) * Math.PI * 2;
            var dist = 24 + (i % 4) * 16;
            soltar(x, y, true, Math.cos(a) * dist, Math.sin(a) * dist - 10, 520);
            var s = pool.filter(function (p) { return p.estrella && p.viva; });
            var ult = s[s.length - 1];
            if (ult && colores && colores.length) ult.img.setTint(colores[i % colores.length]);
        }
    }

    // ------------------------------------------------------------------ movimiento

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function fijarMeta(x, y) {
        meta.x = clamp(x, 8, Math.max(9, rect.w - 8));
        meta.y = clamp(y, 8, Math.max(9, rect.h - 8));
    }

    function puntoInicio(nombre) {
        var t = INICIOS[nombre] || INICIOS["abajo-izq"];
        return { x: rect.w * t.x, y: rect.h * t.y };
    }

    function irA(x, y, ms) {
        if (!sc) return Promise.resolve();
        if (tweenLuz) tweenLuz.stop();
        scripted = true;
        var desde = { x: luz.x, y: luz.y };
        var hecho = false;
        return new Promise(function (resolve) {
            var fin = function () {
                if (hecho) return;
                hecho = true;
                scripted = false;
                fijarMeta(x, y);
                luz.x = meta.x;
                luz.y = meta.y;
                colocarLampara();
                pintarOscuridad();
                resolve();
            };
            tweenLuz = sc.tweens.add({
                targets: desde,
                x: x,
                y: y,
                duration: reducido ? Math.min(ms || 600, 180) : (ms || 600),
                ease: "Sine.easeInOut",
                onUpdate: function () { fijarMeta(desde.x, desde.y); },
                onComplete: fin
            });
            setTimeout(fin, (ms || 600) + 320);
        });
    }

    function paso(time, delta) {
        var dt = delta || 16;
        var k = scripted ? 1 : (1 - Math.exp(-dt / (reducido ? 40 : 90)));
        var nx = luz.x + (meta.x - luz.x) * k;
        var ny = luz.y + (meta.y - luz.y) * k;
        var movio = Math.abs(nx - luz.x) > 0.35 || Math.abs(ny - luz.y) > 0.35;
        // la linterna se ladea un poco hacia donde se mueve
        var vx = (nx - luz.x) / Math.max(1, dt);
        var meta2 = reducido ? 0 : clamp(vx * 0.35, -0.3, 0.3);
        var antesDir = dir.x + dir.y + inclina;
        inclina += (meta2 - inclina) * 0.12;
        luz.x = nx;
        luz.y = ny;
        colocarLampara();
        var giro = Math.abs(dir.x + dir.y + inclina - antesDir) > 0.002;
        if (movio || sucio || giro) {
            pintarOscuridad();
            sucio = false;
            if (movio && habilitado && !scripted) chispa(time);
        }
        animarAnillo(time);
        actualizarHalos(time);
        actualizarHuellas(time);
        if (global.Campamento && global.Campamento.pulsoLuz) {
            global.Campamento.pulsoLuz(luz.x, luz.y, luz.r);
        }
        if (global.Campamento && global.Campamento.tick) global.Campamento.tick(time, dt);
        if (obj.modo3d && global.Zoe3D && global.Zoe3D.paso) {
            global.Zoe3D.paso(dt);
            var tex = sc.textures.get("zoe3d");
            if (tex && tex.source && tex.source[0]) tex.source[0].update();
        }
    }

    function alBajar(p) {
        if (!habilitado || !p || (p.button > 0)) return;
        if (pulsado) return;
        if (tweenLuz) tweenLuz.stop();
        scripted = false;
        var zona = zonaEn(p.x, p.y);
        var ilum = zona ? zonaIluminada(zona) : false;
        pulsado = { id: p.id, x: p.x, y: p.y, zona: zona, iluminada: ilum, arrastre: false };
        fijarMeta(p.x, p.y);
    }

    function alMover(p) {
        if (!pulsado || !p || p.id !== pulsado.id) return;
        if (Math.hypot(p.x - pulsado.x, p.y - pulsado.y) > 32) pulsado.arrastre = true;
        fijarMeta(p.x, p.y);
    }

    function alSoltar(p) {
        if (!pulsado) return;
        if (p && p.id !== pulsado.id) return;
        var info = pulsado;
        pulsado = null;
        if (!habilitado || info.arrastre) return;
        ultimoToque = { zonaId: info.zona, iluminada: !!info.iluminada, x: info.x, y: info.y };
        if (typeof onToque === "function") onToque(ultimoToque);
    }

    function aPantalla(x, y) {
        var canvas = sc && sc.game && sc.game.canvas;
        if (!canvas) return { x: x, y: y };
        var r = canvas.getBoundingClientRect();
        var sw = sc.scale.width || r.width || 1;
        var sh = sc.scale.height || r.height || 1;
        return { x: r.left + x * (r.width / sw), y: r.top + y * (r.height / sh) };
    }

    function vigilar(el) {
        var renovar = function () {
            if (sc && sc.scale) sc.scale.updateBounds();
        };
        ["pointerdown", "mousedown", "touchstart"].forEach(function (ev) {
            el.addEventListener(ev, renovar, { capture: true, passive: true });
        });
        if (typeof global.ResizeObserver === "function") {
            var ro = new global.ResizeObserver(renovar);
            ro.observe(el);
        }
    }

    function reacomodar() {
        if (!sc) return;
        var w = sc.scale.width || (sc.game.canvas && sc.game.canvas.clientWidth) || 0;
        var h = sc.scale.height || (sc.game.canvas && sc.game.canvas.clientHeight) || 0;
        if (w < 40 || h < 40) return;
        if (Math.abs(w - rect.w) < 2 && Math.abs(h - rect.h) < 2 && imgOsc) {
            luz.r = calcularRadio(w, h);
            return;
        }
        rect.w = w;
        rect.h = h;
        luz.r = calcularRadio(w, h);
        if (global.Campamento) global.Campamento.dibujar(sc, capaCamp, w, h);
        if (obj.zoe && obj.modo3d && global.Zoe3D) {
            global.Zoe3D.encuadrar(w, h);
            publicarZoe3D();
            obj.zoe.setDisplaySize(w, h);
            obj.zoe.setPosition(0, 0);
            obj.zoe.setScale(1);
            obj.zoe.baseEscala = 1;
            obj.zoe.baseX = w * 0.5;
            obj.zoe.baseY = h * 0.86;
        } else if (obj.zoe) {
            var escala = Math.min((w * 0.36) / 420, (h * 0.66) / 900);
            obj.zoe.baseEscala = Math.max(0.28, escala);
            obj.zoe.setScale(obj.zoe.baseEscala);
            obj.zoe.x = w * 0.5;
            obj.zoe.y = h * 0.86;
            obj.zoe.baseX = obj.zoe.x;
            obj.zoe.baseY = obj.zoe.y;
        }
        if (flash) flash.setSize(w, h);
        recrearOscuridad(w, h);
        colocarLampara();
        pintarOscuridad();
    }

    function tweenAlpha(destino, ms) {
        if (!imgOsc || !sc) return Promise.resolve();
        return new Promise(function (resolve) {
            var hecho = false;
            var fin = function () {
                if (hecho) return;
                hecho = true;
                resolve();
            };
            sc.tweens.add({
                targets: imgOsc,
                alpha: destino,
                duration: ms || 400,
                onComplete: fin
            });
            setTimeout(fin, (ms || 400) + 200);
        });
    }

    // ------------------------------------------------------------------ API

    function montar(el, opts) {
        opts = opts || {};
        if (typeof opts.onToque === "function") onToque = opts.onToque;
        if (typeof opts.onCambioLuz === "function") onCambioLuz = opts.onCambioLuz;
        if (listoPromesa) return listoPromesa;
        if (!Phaser || !P || !G) {
            listoPromesa = Promise.resolve(false);
            return listoPromesa;
        }
        listoPromesa = new Promise(function (resolve) {
            var w0 = el.clientWidth || 800;
            var h0 = el.clientHeight || 600;
            juego = new Phaser.Game({
                type: Phaser.AUTO,
                parent: el,
                backgroundColor: "#2a3d86",
                banner: false,
                disableContextMenu: true,
                scale: { mode: Phaser.Scale.RESIZE, width: w0, height: h0 },
                input: { activePointers: 2 },
                scene: {
                    create: function () {
                        sc = this;
                        texturasFx();
                        capaCamp = sc.add.container(0, 0);
                        armarLinterna();
                        esperarZoe3D().then(function (Z) {
                            var listo3d = Z ? Z.preparar() : Promise.resolve(false);
                            return listo3d.then(function (ok) {
                                if (ok) {
                                    try {
                                        if (publicarZoe3D()) return null;
                                    } catch (e) {
                                        console.warn("[Linterna] Zoe 3D", e);
                                    }
                                }
                                return cargarSvgYArmar();
                            });
                        }).then(function () {
                            reacomodar();
                            sc.input.on("pointerdown", alBajar);
                            sc.input.on("pointermove", alMover);
                            sc.input.on("pointerup", alSoltar);
                            sc.input.on("pointerupoutside", alSoltar);
                            sc.scale.on("resize", reacomodar);
                            sc.events.on("update", paso);
                            vigilar(el);
                            resolve(true);
                        });
                    }
                }
            });
        });
        return listoPromesa;
    }

    global.LinternaPhaser = {
        montar: montar,
        listo: function () { return !!(sc && obj.zoe); },
        reacomodar: reacomodar,
        escena: function () { return sc; },
        objetos: function () { return obj; },
        rect: function () { return { x: 0, y: 0, w: rect.w, h: rect.h, vx: 0, vy: 0, vw: rect.w, vh: rect.h }; },
        puntoDe: function (id) {
            var z = mundoPorId(id) || (zonasMundoDe(id)[0]);
            return z ? aPantalla(z.x, z.y) : null;
        },
        luzPantalla: function () { return aPantalla(luz.x, luz.y); },
        luz: function () { return { x: luz.x, y: luz.y, r: luz.r }; },
        habilitar: function (on) { habilitado = !!on; if (!on) pulsado = null; },
        prepararReto: function (reto) {
            retoActual = reto || null;
            umbral = (reto && reto.visibilidad != null) ? reto.visibilidad : 0.82;
            pistasOn = false;
            estaba = false;
            ultimoAviso = 0;
            halos.forEach(function (h) { h.glow.setVisible(false); h.aro.setVisible(false); });
        },
        pistas: function (on) { pistasOn = !!on; },
        objetivoIluminado: function () { return estaba; },
        llevarInicio: function (nombre) {
            var p = puntoInicio(nombre);
            if (obj.lampara) obj.lampara.setAlpha(1);
            return irA(p.x, p.y, 650);
        },
        moverLuzA: function (id, ms) {
            var z = mundoPorId(id) || (zonasMundoDe(id)[0]);
            if (!z) return Promise.resolve();
            if (obj.lampara) obj.lampara.setAlpha(1);
            return irA(z.x, z.y, ms || 900);
        },
        entrada: function () {
            if (obj.lampara) obj.lampara.setAlpha(0);
            luz.x = -90;
            luz.y = rect.h * 0.72;
            meta.x = luz.x;
            meta.y = luz.y;
            pintarOscuridad();
            if (sc && obj.lampara) sc.tweens.add({ targets: obj.lampara, alpha: 1, duration: 220 });
            if (global.Campamento) global.Campamento.encender(sc);
            return irA(puntoInicio("abajo-izq").x, puntoInicio("abajo-izq").y, 780);
        },
        destello: function () {
            if (!sc || !flash) return Promise.resolve();
            flash.setAlpha(0.38);
            if (obj.onda) {
                obj.onda.setPosition(luz.x, luz.y).setVisible(true).setAlpha(1);
                obj.onda.setDisplaySize(luz.r * 1.4, luz.r * 1.4);
                sc.tweens.add({
                    targets: obj.onda, displayWidth: luz.r * 6, displayHeight: luz.r * 6, alpha: 0,
                    duration: reducido ? 200 : 700, ease: "Cubic.easeOut",
                    onComplete: function () { obj.onda.setVisible(false); }
                });
            }
            estrellas(luz.x, luz.y, 10, [0xffd84a, 0xffffff, 0xffb347]);
            var base = revelado ? 0 : alphaBase;
            var osc = tweenAlpha(Math.min(0.1, base), 260).then(function () {
                return revelado ? null : tweenAlpha(base, 320);
            });
            sc.tweens.add({ targets: flash, alpha: 0, duration: 560 });
            return osc;
        },
        /** Luces de colores que llenan toda la pantalla un momento. */
        fiesta: function () {
            if (!sc || !obj.fiesta) return Promise.resolve();
            var colores = [0xff5fa2, 0xffd166, 0x6fd3ff, 0x9dff7a, 0xc59bff, 0xffa24c];
            var n = reducido ? 6 : obj.fiesta.length;
            for (var i = 0; i < n; i++) {
                (function (im, k) {
                    var x = rect.w * (0.05 + Math.random() * 0.9);
                    var y = rect.h * (0.08 + Math.random() * 0.84);
                    var tam = Math.min(rect.w, rect.h) * (0.18 + Math.random() * 0.22);
                    sc.tweens.killTweensOf(im);
                    im.setTint(colores[k % colores.length]);
                    im.setPosition(x, y).setVisible(true).setAlpha(0).setDisplaySize(tam * 0.3, tam * 0.3);
                    sc.tweens.add({
                        targets: im, alpha: 0.75, displayWidth: tam, displayHeight: tam, y: y - 20,
                        duration: 420, delay: k * 45, ease: "Sine.easeOut",
                        onComplete: function () {
                            sc.tweens.add({
                                targets: im, alpha: 0, y: y - 60, duration: 900,
                                onComplete: function () { im.setVisible(false); }
                            });
                        }
                    });
                })(obj.fiesta[i], i);
            }
            return new Promise(function (r) { setTimeout(r, reducido ? 300 : 900); });
        },
        revelar: function () {
            revelado = true;
            alphaBase = 0;
            if (obj.anillo) obj.anillo.setVisible(false);
            if (obj.calido) obj.calido.setVisible(false);
            if (obj.cono) obj.cono.clear();
            pintarOscuridad();
            var p = puntoInicio("abajo-izq");
            irA(p.x, p.y, 700);
            return tweenAlpha(0, 700);
        },
        /** Punto de la mano que sostiene la linterna (para la mano del tutorial). */
        agarre: function () {
            var L = obj.lampara;
            if (!L) return aPantalla(luz.x, luz.y);
            var lx = 10 * L.scaleX;
            var ly = 92 * L.scaleY;
            var c = Math.cos(L.rotation);
            var s2 = Math.sin(L.rotation);
            return aPantalla(L.x + lx * c - ly * s2, L.y + lx * s2 + ly * c);
        },
        contraste: function (on) {
            if (revelado) return;
            alphaBase = on ? ALPHA_CONTRASTE : ALPHA_OSCURO;
            if (imgOsc) imgOsc.setAlpha(alphaBase);
        },
        estrellas: estrellas,
        brillo: function (parte) {
            if (!parte) return;
            zonasMundoDe(parte).forEach(function (z) { estrellas(z.x, z.y, 8, [0xffe066, 0xffffff]); });
        },
        ultimoToque: function () { return ultimoToque; },
        aPantalla: aPantalla
    };
})(window);
