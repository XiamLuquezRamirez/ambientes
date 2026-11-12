/**
 * Campamento nocturno de PedNia (window.Campamento).
 *
 * Dos capas:
 *  - capa (profundidad 0): el paisaje quieto pintado UNA vez en un lienzo 2D con
 *    degradados (cielo, montañas, pinos, tiendas domo, letrero, fogata apagada).
 *    La oscuridad de la linterna lo cubre.
 *  - brillo (profundidad 6, sobre la oscuridad): lo que da luz propia y por eso se
 *    ve aun a oscuras — luna, estrellas que titilan, llamas, el interior de las
 *    tiendas, los bombillos de las guirnaldas y las luciérnagas.
 *
 * tick() lo llama la escena en cada cuadro; pulsoLuz() recibe dónde está el haz.
 */
(function (global) {
    "use strict";

    var reducido = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var DPR = Math.min(2, global.devicePixelRatio || 1);
    var COLORES_BOMBILLO = [0xffd166, 0xff6fae, 0x6fd3ff, 0x9dff7a, 0xffa24c, 0xc59bff];

    var est = {
        escena: null,
        capa: null,
        brillo: null,
        tweens: [],
        bombillas: [],
        luciernagas: [],
        llamas: [],
        brasas: [],
        puertas: [],
        estrellas: [],
        banderas: [],
        fuegoGlow: null,
        fuego: { x: 0, y: 0, h: 0 },
        encendidas: 0,
        celebrando: 0,
        w: 0,
        h: 0,
        t: 0,
        luz: { x: -999, y: -999, r: 1 }
    };

    function rnd(semilla) {
        var s = semilla;
        return function () {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    // ------------------------------------------------------------------ texturas

    function texCanvas(escena, clave, ancho, alto, fn) {
        if (escena.textures.exists(clave)) return;
        var c = document.createElement("canvas");
        c.width = ancho;
        c.height = alto;
        fn(c.getContext("2d"), ancho, alto);
        escena.textures.addCanvas(clave, c);
    }

    function texturas(escena) {
        texCanvas(escena, "camp-glow", 128, 128, function (c, s) {
            var g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.25, "rgba(255,255,255,0.55)");
            g.addColorStop(0.6, "rgba(255,255,255,0.14)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            c.fillStyle = g;
            c.fillRect(0, 0, s, s);
        });
        texCanvas(escena, "camp-punto", 32, 32, function (c, s) {
            var g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.5, "rgba(255,255,255,0.9)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            c.fillStyle = g;
            c.fillRect(0, 0, s, s);
        });
        texCanvas(escena, "camp-titila", 48, 48, function (c, s) {
            c.translate(s / 2, s / 2);
            c.fillStyle = "#ffffff";
            c.beginPath();
            c.moveTo(0, -s / 2);
            c.quadraticCurveTo(2, -2, s / 2, 0);
            c.quadraticCurveTo(2, 2, 0, s / 2);
            c.quadraticCurveTo(-2, 2, -s / 2, 0);
            c.quadraticCurveTo(-2, -2, 0, -s / 2);
            c.fill();
        });
        texCanvas(escena, "camp-llama", 64, 112, function (c, w, h) {
            var g = c.createLinearGradient(0, h, 0, 0);
            g.addColorStop(0, "rgba(255,120,30,1)");
            g.addColorStop(0.55, "rgba(255,80,40,0.9)");
            g.addColorStop(1, "rgba(220,40,40,0)");
            llama(c, w, h, g);
        });
        texCanvas(escena, "camp-llama-nucleo", 64, 112, function (c, w, h) {
            var g = c.createLinearGradient(0, h, 0, 0);
            g.addColorStop(0, "rgba(255,255,220,1)");
            g.addColorStop(0.5, "rgba(255,220,90,0.95)");
            g.addColorStop(1, "rgba(255,170,40,0)");
            llama(c, w, h, g);
        });
        texCanvas(escena, "camp-luna", 256, 256, function (c, s) {
            var cx = s / 2, cy = s / 2, r = s * 0.2;
            var halo = c.createRadialGradient(cx, cy, r * 0.8, cx, cy, s / 2);
            halo.addColorStop(0, "rgba(255,246,210,0.45)");
            halo.addColorStop(0.4, "rgba(220,225,255,0.14)");
            halo.addColorStop(1, "rgba(200,210,255,0)");
            c.fillStyle = halo;
            c.fillRect(0, 0, s, s);
            var disco = c.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
            disco.addColorStop(0, "#fffdf0");
            disco.addColorStop(1, "#f3e3b0");
            c.fillStyle = disco;
            c.beginPath();
            c.arc(cx, cy, r, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = "rgba(214,192,140,0.45)";
            [[-0.3, -0.15, 0.2], [0.28, 0.2, 0.16], [0.05, 0.45, 0.1], [0.35, -0.38, 0.09]].forEach(function (k) {
                c.beginPath();
                c.arc(cx + k[0] * r, cy + k[1] * r, k[2] * r, 0, Math.PI * 2);
                c.fill();
            });
        });
    }

    function llama(c, w, h, relleno) {
        c.fillStyle = relleno;
        c.beginPath();
        c.moveTo(w / 2, 2);
        c.bezierCurveTo(w * 0.62, h * 0.3, w * 0.98, h * 0.5, w * 0.92, h * 0.74);
        c.bezierCurveTo(w * 0.86, h * 0.96, w * 0.62, h, w / 2, h);
        c.bezierCurveTo(w * 0.38, h, w * 0.14, h * 0.96, w * 0.08, h * 0.74);
        c.bezierCurveTo(w * 0.02, h * 0.5, w * 0.38, h * 0.3, w / 2, 2);
        c.fill();
    }

    // ------------------------------------------------------------------ paisaje fijo

    function montes(c, w, base, alto, color, frec, fase) {
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(0, base + alto);
        for (var x = 0; x <= w + 8; x += 8) {
            var t = x / w;
            var y = base - alto * (0.55 + 0.3 * Math.sin(t * frec * Math.PI + fase) + 0.15 * Math.sin(t * frec * 2.7 * Math.PI + fase * 2));
            c.lineTo(x, y);
        }
        c.lineTo(w, base + alto * 3);
        c.lineTo(0, base + alto * 3);
        c.closePath();
        c.fill();
    }

    function pinoSimple(c, x, base, alto, color) {
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(x, base - alto);
        c.lineTo(x - alto * 0.28, base);
        c.lineTo(x + alto * 0.28, base);
        c.closePath();
        c.fill();
    }

    function pino(c, x, base, alto, color, borde) {
        c.fillStyle = "#3a2717";
        c.fillRect(x - alto * 0.03, base - alto * 0.14, alto * 0.06, alto * 0.16);
        var pisos = 4;
        for (var k = 0; k < pisos; k++) {
            var top = base - alto + k * alto * 0.19;
            var bot = top + alto * 0.36;
            if (k === pisos - 1) bot = base - alto * 0.08;
            var hw = alto * (0.13 + k * 0.065);
            var mid = top + (bot - top) * 0.55;
            c.fillStyle = color;
            c.beginPath();
            c.moveTo(x, top);
            c.quadraticCurveTo(x - hw * 0.45, mid, x - hw, bot);
            c.quadraticCurveTo(x - hw * 0.5, bot - alto * 0.035, x, bot - alto * 0.01);
            c.quadraticCurveTo(x + hw * 0.5, bot - alto * 0.035, x + hw, bot);
            c.quadraticCurveTo(x + hw * 0.45, mid, x, top);
            c.fill();
            // borde iluminado por la luna (lado izquierdo)
            c.fillStyle = borde;
            c.beginPath();
            c.moveTo(x, top);
            c.quadraticCurveTo(x - hw * 0.45, mid, x - hw, bot);
            c.quadraticCurveTo(x - hw * 0.62, bot - alto * 0.03, x - hw * 0.3, bot - alto * 0.025);
            c.quadraticCurveTo(x - hw * 0.2, mid, x, top + alto * 0.03);
            c.fill();
        }
    }

    function tiendaDomo(c, x, base, ancho, alto, col) {
        var izq = x - ancho / 2;
        var der = x + ancho / 2;
        var cima = base - alto;
        c.fillStyle = "rgba(0,0,0,0.28)";
        c.beginPath();
        c.ellipse(x, base + 2, ancho * 0.6, alto * 0.07, 0, 0, Math.PI * 2);
        c.fill();
        // vientos
        c.strokeStyle = "rgba(240,230,210,0.5)";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(izq + ancho * 0.08, base - alto * 0.55);
        c.lineTo(izq - ancho * 0.12, base);
        c.moveTo(der - ancho * 0.08, base - alto * 0.55);
        c.lineTo(der + ancho * 0.12, base);
        c.stroke();
        c.fillStyle = "#6b4a2a";
        c.fillRect(izq - ancho * 0.13, base - 4, 4, 6);
        c.fillRect(der + ancho * 0.11, base - 4, 4, 6);
        // cuerpo
        var g = c.createLinearGradient(izq, 0, der, 0);
        g.addColorStop(0, col.claro);
        g.addColorStop(0.45, col.base);
        g.addColorStop(1, col.osc);
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(izq, base);
        c.bezierCurveTo(izq, cima - alto * 0.05, der, cima - alto * 0.05, der, base);
        c.closePath();
        c.fill();
        // franja inferior
        c.save();
        c.clip();
        c.fillStyle = col.franja;
        c.fillRect(izq, base - alto * 0.16, ancho, alto * 0.16);
        c.restore();
        // costuras
        c.strokeStyle = "rgba(255,255,255,0.28)";
        c.lineWidth = Math.max(2, ancho * 0.012);
        c.beginPath();
        c.moveTo(izq + ancho * 0.2, base);
        c.bezierCurveTo(izq + ancho * 0.22, cima + alto * 0.05, der - ancho * 0.22, cima + alto * 0.05, der - ancho * 0.2, base);
        c.moveTo(x, cima + alto * 0.21);
        c.lineTo(x, base - alto * 0.5);
        c.stroke();
        // puerta con luz interior
        var pw = ancho * 0.34;
        var ph = alto * 0.5;
        var luzIn = c.createRadialGradient(x, base - ph * 0.3, 2, x, base - ph * 0.3, ph);
        luzIn.addColorStop(0, "#fff1b8");
        luzIn.addColorStop(0.55, "#ffbf5e");
        luzIn.addColorStop(1, "#b5652a");
        c.fillStyle = luzIn;
        c.beginPath();
        c.moveTo(x - pw / 2, base);
        c.quadraticCurveTo(x - pw * 0.45, base - ph * 1.1, x, base - ph);
        c.quadraticCurveTo(x + pw * 0.45, base - ph * 1.1, x + pw / 2, base);
        c.closePath();
        c.fill();
        // solapas recogidas
        c.fillStyle = col.osc;
        c.beginPath();
        c.moveTo(x, base - ph);
        c.quadraticCurveTo(x - pw * 0.42, base - ph * 0.85, x - pw * 0.62, base);
        c.lineTo(x - pw * 0.42, base);
        c.quadraticCurveTo(x - pw * 0.28, base - ph * 0.6, x, base - ph);
        c.fill();
        c.beginPath();
        c.moveTo(x, base - ph);
        c.quadraticCurveTo(x + pw * 0.42, base - ph * 0.85, x + pw * 0.62, base);
        c.lineTo(x + pw * 0.42, base);
        c.quadraticCurveTo(x + pw * 0.28, base - ph * 0.6, x, base - ph);
        c.fill();
        // mástil del banderín
        c.strokeStyle = "#e9dcc0";
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(x, cima + alto * 0.04);
        c.lineTo(x, cima - alto * 0.2);
        c.stroke();
        return { puerta: { x: x, y: base - ph * 0.4, r: ph }, punta: { x: x, y: cima - alto * 0.2 } };
    }

    function letrero(c, x, piso, w, h) {
        var ancho = Math.max(110, Math.min(w * 0.12, h * 0.24));
        var alto = ancho * 0.36;
        var y = piso - h * 0.42;
        var poste = Math.max(6, ancho * 0.06);
        c.fillStyle = "#4a2f19";
        c.fillRect(x - ancho * 0.36 - poste / 2, y, poste, piso - y);
        c.fillRect(x + ancho * 0.36 - poste / 2, y, poste, piso - y);
        c.fillStyle = "rgba(0,0,0,0.3)";
        c.beginPath();
        c.ellipse(x, piso, ancho * 0.5, 5, 0, 0, Math.PI * 2);
        c.fill();
        var g = c.createLinearGradient(0, y - alto / 2, 0, y + alto / 2);
        g.addColorStop(0, "#9a6638");
        g.addColorStop(1, "#6e4424");
        c.fillStyle = g;
        redondeado(c, x - ancho / 2, y - alto / 2, ancho, alto, alto * 0.22);
        c.fill();
        c.strokeStyle = "#4a2c15";
        c.lineWidth = 3;
        c.stroke();
        c.strokeStyle = "rgba(60,34,16,0.4)";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(x - ancho / 2 + 6, y);
        c.lineTo(x + ancho / 2 - 6, y);
        c.stroke();
        c.fillStyle = "#3a2410";
        [[-0.42, -0.28], [0.42, -0.28], [-0.42, 0.28], [0.42, 0.28]].forEach(function (k) {
            c.beginPath();
            c.arc(x + k[0] * ancho, y + k[1] * alto, 2.4, 0, Math.PI * 2);
            c.fill();
        });
        c.font = "700 " + Math.round(alto * 0.52) + "px Fredoka, 'Baloo 2', Arial, sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.lineWidth = 4;
        c.strokeStyle = "#3d230f";
        c.strokeText("PEDNIA", x, y + 1);
        c.fillStyle = "#ffe7b0";
        c.fillText("PEDNIA", x, y + 1);
        return { x: x + ancho * 0.36, y: y + alto / 2 };
    }

    function redondeado(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function fogata(c, x, y, s) {
        c.fillStyle = "rgba(0,0,0,0.3)";
        c.beginPath();
        c.ellipse(x, y + s * 0.06, s * 0.62, s * 0.14, 0, 0, Math.PI * 2);
        c.fill();
        c.lineCap = "round";
        [[-1, "#7a4a26"], [1, "#8e5a2e"]].forEach(function (l) {
            c.strokeStyle = l[1];
            c.lineWidth = s * 0.13;
            c.beginPath();
            c.moveTo(x - l[0] * s * 0.42, y + s * 0.02);
            c.lineTo(x + l[0] * s * 0.3, y - s * 0.12);
            c.stroke();
        });
        c.lineCap = "butt";
        var piedras = 7;
        for (var i = 0; i < piedras; i++) {
            var a = Math.PI * (0.05 + 0.9 * i / (piedras - 1));
            var px = x - Math.cos(a) * s * 0.5;
            var py = y + Math.sin(a) * s * 0.07;
            c.fillStyle = i % 2 ? "#7c7f93" : "#666a80";
            c.beginPath();
            c.ellipse(px, py, s * 0.1, s * 0.07, 0, 0, Math.PI * 2);
            c.fill();
        }
    }

    function guirnalda(c, x1, y1, x2, y2, caida, n) {
        var pts = [];
        c.strokeStyle = "rgba(30,24,20,0.9)";
        c.lineWidth = 1.6;
        c.beginPath();
        for (var i = 0; i <= 24; i++) {
            var t = i / 24;
            var px = x1 + (x2 - x1) * t;
            var py = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * caida;
            if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.stroke();
        for (var k = 1; k <= n; k++) {
            var u = k / (n + 1);
            pts.push({
                x: x1 + (x2 - x1) * u,
                y: y1 + (y2 - y1) * u + Math.sin(u * Math.PI) * caida + 4
            });
        }
        return pts;
    }

    function pasto(c, w, h, piso) {
        var r = rnd(42);
        for (var i = 0; i < 70; i++) {
            var x = r() * w;
            var y = piso + r() * (h - piso) * 0.9;
            var s = 5 + r() * 9;
            c.strokeStyle = r() > 0.5 ? "rgba(70,140,95,0.75)" : "rgba(48,110,78,0.8)";
            c.lineWidth = 1.6;
            c.beginPath();
            c.moveTo(x - s * 0.4, y);
            c.quadraticCurveTo(x - s * 0.3, y - s * 0.6, x - s * 0.55, y - s);
            c.moveTo(x, y);
            c.quadraticCurveTo(x + 1, y - s * 0.7, x + 2, y - s * 1.2);
            c.moveTo(x + s * 0.4, y);
            c.quadraticCurveTo(x + s * 0.35, y - s * 0.6, x + s * 0.6, y - s * 0.9);
            c.stroke();
        }
        var flores = ["#ff9ec7", "#ffe27a", "#b9a6ff", "#ffffff"];
        for (var f = 0; f < 16; f++) {
            var fx = r() * w;
            if (Math.abs(fx - w / 2) < w * 0.12) continue;
            var fy = piso + h * 0.02 + r() * (h - piso) * 0.75;
            c.fillStyle = flores[f % flores.length];
            for (var p = 0; p < 5; p++) {
                var a = p * Math.PI * 0.4;
                c.beginPath();
                c.arc(fx + Math.cos(a) * 3, fy + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
                c.fill();
            }
            c.fillStyle = "#ffb347";
            c.beginPath();
            c.arc(fx, fy, 1.8, 0, Math.PI * 2);
            c.fill();
        }
    }

    function pintarPaisaje(c, w, h) {
        var piso = h * 0.86;
        var horizonte = h * 0.6;
        var cielo = c.createLinearGradient(0, 0, 0, horizonte + h * 0.08);
        cielo.addColorStop(0, "#090f35");
        cielo.addColorStop(0.45, "#1a2766");
        cielo.addColorStop(0.85, "#36428e");
        cielo.addColorStop(1, "#5a5aa6");
        c.fillStyle = cielo;
        c.fillRect(0, 0, w, h);

        // vía láctea suave
        c.save();
        c.translate(w * 0.6, h * 0.2);
        c.rotate(-0.22);
        c.scale(1, 0.16);
        var vl = c.createRadialGradient(0, 0, 0, 0, 0, w * 0.55);
        vl.addColorStop(0, "rgba(200,190,255,0.2)");
        vl.addColorStop(1, "rgba(200,190,255,0)");
        c.fillStyle = vl;
        c.beginPath();
        c.arc(0, 0, w * 0.55, 0, Math.PI * 2);
        c.fill();
        c.restore();

        var r = rnd(7);
        for (var i = 0; i < 170; i++) {
            var sx = r() * w;
            var sy = r() * horizonte * 0.92;
            c.fillStyle = "rgba(255,250,225," + (0.3 + r() * 0.6).toFixed(2) + ")";
            c.beginPath();
            c.arc(sx, sy, 0.4 + r() * 1.1, 0, Math.PI * 2);
            c.fill();
        }

        montes(c, w, horizonte - h * 0.05, h * 0.17, "#2a3480", 2.2, 1.1);
        montes(c, w, horizonte + h * 0.01, h * 0.11, "#202a6a", 4.6, 0.3);

        var r2 = rnd(19);
        for (var x = -8; x < w + 16; x += Math.max(10, w * 0.02)) {
            pinoSimple(c, x + r2() * 6, horizonte + h * 0.07, h * (0.08 + r2() * 0.07), "#18235a");
        }

        var suelo = c.createLinearGradient(0, horizonte, 0, h);
        suelo.addColorStop(0, "#1f4752");
        suelo.addColorStop(0.35, "#1f5040");
        suelo.addColorStop(1, "#163a2c");
        c.fillStyle = suelo;
        c.beginPath();
        c.moveTo(0, horizonte + h * 0.07);
        c.quadraticCurveTo(w * 0.5, horizonte + h * 0.01, w, horizonte + h * 0.07);
        c.lineTo(w, h);
        c.lineTo(0, h);
        c.closePath();
        c.fill();

        // claro iluminado por la luna, donde está Zoe
        c.save();
        c.translate(w * 0.5, piso);
        c.scale(1, 0.24);
        var claro = c.createRadialGradient(0, 0, 0, 0, 0, w * 0.34);
        claro.addColorStop(0, "rgba(130,200,150,0.5)");
        claro.addColorStop(1, "rgba(130,200,150,0)");
        c.fillStyle = claro;
        c.beginPath();
        c.arc(0, 0, w * 0.34, 0, Math.PI * 2);
        c.fill();
        c.restore();

        // pinos laterales: más chicos hacia el centro
        var PINOS = [
            [0.015, 0.62, "#12352c", "#2a6a52"],
            [0.075, 0.5, "#143c31", "#2f7258"],
            [0.255, 0.36, "#163f33", "#2f735a"],
            [0.33, 0.27, "#17443a", "#31785e"]
        ];
        var base = piso - h * 0.02;
        PINOS.forEach(function (p) {
            pino(c, p[0] * w, base - h * 0.04, h * p[1] * 0.9, "#122c3a", "#1e4656");
        });
        PINOS.forEach(function (p) {
            pino(c, p[0] * w, base, h * p[1], p[2], p[3]);
            pino(c, (1 - p[0]) * w, base, h * p[1], p[2], p[3]);
        });

        var fuegoS = Math.max(36, Math.min(h * 0.1, w * 0.065));
        var fx = w * 0.345;
        var fy = piso + h * 0.035;

        var sign = letrero(c, w * 0.7, piso - h * 0.005, w, h);

        var altoT = Math.min(h * 0.3, w * 0.16);
        var anchoT = altoT * 1.45;
        var tIzq = tiendaDomo(c, w * 0.17, piso, anchoT, altoT, {
            claro: "#c79af0", base: "#9a5fd6", osc: "#6c3aa8", franja: "rgba(70,30,120,0.55)"
        });
        var tDer = tiendaDomo(c, w * 0.83, piso, anchoT, altoT, {
            claro: "#ffb07a", base: "#ec7a3c", osc: "#b44f22", franja: "rgba(120,40,20,0.5)"
        });

        fogata(c, fx, fy, fuegoS);
        pasto(c, w, h, piso);

        var bombillos = []
            .concat(guirnalda(c, w * 0.0, h * 0.27, tIzq.punta.x, tIzq.punta.y + 6, h * 0.05, 6))
            .concat(guirnalda(c, tDer.punta.x, tDer.punta.y + 6, sign.x - w * 0.06, sign.y - h * 0.06, h * 0.03, 3))
            .concat(guirnalda(c, w * 1.0, h * 0.27, tDer.punta.x, tDer.punta.y + 6, h * 0.05, 6));

        // viñeta
        var v = c.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
        v.addColorStop(0, "rgba(0,0,12,0)");
        v.addColorStop(1, "rgba(0,0,12,0.45)");
        c.fillStyle = v;
        c.fillRect(0, 0, w, h);

        return {
            piso: piso,
            puertas: [tIzq.puerta, tDer.puerta],
            puntas: [tIzq.punta, tDer.punta],
            fuego: { x: fx, y: fy, s: fuegoS },
            bombillos: bombillos
        };
    }

    // ------------------------------------------------------------------ armado

    function limpiar(escena, capa) {
        est.tweens.forEach(function (tw) { if (tw) tw.stop(); });
        est.tweens = [];
        est.bombillas = [];
        est.luciernagas = [];
        est.llamas = [];
        est.brasas = [];
        est.puertas = [];
        est.estrellas = [];
        est.banderas = [];
        est.fuegoGlow = null;
        if (capa) capa.removeAll(true);
        if (est.brillo) est.brillo.removeAll(true);
    }

    function asegurarBrillo(escena) {
        if (est.brillo && est.brillo.scene === escena) return est.brillo;
        est.brillo = escena.add.container(0, 0);
        est.brillo.setDepth(6);
        return est.brillo;
    }

    function add(obj) {
        est.brillo.add(obj);
        return obj;
    }

    function dibujar(escena, capa, w, h) {
        limpiar(escena, capa);
        est.escena = escena;
        est.capa = capa;
        if (!escena || !capa || w < 20 || h < 20) return null;
        est.w = w;
        est.h = h;
        texturas(escena);
        asegurarBrillo(escena);
        var ADD = global.Phaser ? global.Phaser.BlendModes.ADD : 1;

        var lienzo = document.createElement("canvas");
        lienzo.width = Math.max(2, Math.round(w * DPR));
        lienzo.height = Math.max(2, Math.round(h * DPR));
        var c = lienzo.getContext("2d");
        c.scale(DPR, DPR);
        var info = pintarPaisaje(c, w, h);
        if (escena.textures.exists("camp-fondo")) escena.textures.remove("camp-fondo");
        escena.textures.addCanvas("camp-fondo", lienzo);
        var fondo = escena.add.image(0, 0, "camp-fondo").setOrigin(0, 0);
        fondo.setDisplaySize(w, h);
        capa.add(fondo);

        // banderines de las tiendas (se apagan con la oscuridad, pero ondean)
        info.puntas.forEach(function (p, i) {
            var f = escena.add.triangle(p.x + 1, p.y + 2, 0, 0, 24, 7, 0, 15, i ? 0xffe27a : 0x7af0d4, 1);
            f.setOrigin(0, 0.15);
            capa.add(f);
            est.banderas.push(f);
            if (!reducido) {
                est.tweens.push(escena.tweens.add({
                    targets: f, scaleX: 0.75, angle: 6, duration: 700 + i * 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
                }));
            }
        });

        // luna
        var luna = add(escena.add.image(w * 0.22, h * 0.15, "camp-luna"));
        var tamLuna = Math.min(h * 0.36, w * 0.26);
        luna.setDisplaySize(tamLuna, tamLuna);
        if (!reducido) {
            est.tweens.push(escena.tweens.add({
                targets: luna, alpha: 0.82, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
            }));
        }

        // estrellas que titilan
        var r = rnd(99);
        for (var i = 0; i < 18; i++) {
            var sx = r() * w;
            var sy = h * 0.03 + r() * h * 0.4;
            if (Math.abs(sx - w * 0.22) < h * 0.12 && sy < h * 0.3) continue;
            var st = add(escena.add.image(sx, sy, "camp-titila"));
            var tam = 7 + r() * 9;
            st.setDisplaySize(tam, tam);
            st.setTint(r() > 0.7 ? 0xbfe3ff : 0xfff3c4);
            st.setBlendMode(ADD);
            st.setAlpha(0.5);
            st.base = tam;
            est.estrellas.push(st);
            if (!reducido) {
                est.tweens.push(escena.tweens.add({
                    targets: st, alpha: 1, scale: st.scale * 1.5, duration: 700 + r() * 1400,
                    delay: r() * 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
                }));
            }
        }

        // interior iluminado de las tiendas
        info.puertas.forEach(function (p) {
            var g = add(escena.add.image(p.x, p.y, "camp-glow"));
            g.setTint(0xffb35c).setBlendMode(ADD).setAlpha(0.55);
            g.setDisplaySize(p.r * 2.6, p.r * 2.1);
            g.base = 0.55;
            est.puertas.push(g);
        });

        // fogata
        var F = info.fuego;
        est.fuego = { x: F.x, y: F.y, h: F.s };
        est.fuegoGlow = add(escena.add.image(F.x, F.y - F.s * 0.25, "camp-glow"));
        est.fuegoGlow.setTint(0xff8a2a).setBlendMode(ADD).setAlpha(0.7);
        est.fuegoGlow.setDisplaySize(F.s * 4.2, F.s * 3.2);
        [
            ["camp-llama", -0.2, 0.62, 0.8],
            ["camp-llama", 0.2, 0.6, 0.78],
            ["camp-llama", 0, 0.75, 1.05],
            ["camp-llama-nucleo", 0, 0.5, 0.7]
        ].forEach(function (d, k) {
            var l = add(escena.add.image(F.x + d[1] * F.s, F.y - F.s * 0.05, d[0]));
            l.setOrigin(0.5, 1).setBlendMode(ADD);
            l.anchoBase = F.s * d[2];
            l.altoBase = F.s * d[3];
            l.setDisplaySize(l.anchoBase, l.altoBase);
            l.fase = k * 1.7;
            est.llamas.push(l);
        });
        for (var b = 0; b < 8; b++) {
            var br = add(escena.add.image(F.x, F.y, "camp-punto"));
            br.setTint(0xffb347).setBlendMode(ADD).setDisplaySize(5, 5).setAlpha(0);
            br.vida = -b * 0.25;
            est.brasas.push(br);
        }

        // bombillos de las guirnaldas
        info.bombillos.forEach(function (p, k) {
            var color = COLORES_BOMBILLO[k % COLORES_BOMBILLO.length];
            var halo = add(escena.add.image(p.x, p.y + 3, "camp-glow"));
            halo.setTint(color).setBlendMode(ADD).setDisplaySize(h * 0.07, h * 0.07).setAlpha(0);
            var foco = add(escena.add.ellipse(p.x, p.y + 3, 8, 11, color, 1));
            var casq = add(escena.add.rectangle(p.x, p.y - 3, 5, 4, 0x2a2a35, 1));
            foco.setAlpha(0.3);
            est.bombillas.push({ halo: halo, foco: foco, casq: casq, color: color, on: false, fase: k * 0.9 });
        });

        // luciérnagas
        var r3 = rnd(5);
        for (var n = 0; n < 12; n++) {
            var lx = r3() * w;
            var ly = h * 0.35 + r3() * h * 0.5;
            if (Math.abs(lx - w / 2) < w * 0.08) lx += w * 0.18 * (lx < w / 2 ? -1 : 1);
            var halo2 = add(escena.add.image(lx, ly, "camp-glow"));
            halo2.setTint(0xd6ff6b).setBlendMode(ADD).setDisplaySize(26, 26).setAlpha(0.5);
            var nucleo = add(escena.add.image(lx, ly, "camp-punto"));
            nucleo.setTint(0xf4ffb8).setDisplaySize(6, 6);
            est.luciernagas.push({
                halo: halo2, nucleo: nucleo, bx: lx, by: ly, x: lx, y: ly,
                fase: r3() * 6.28, vel: 0.4 + r3() * 0.6, amp: 18 + r3() * 26, boost: 0
            });
        }

        aplicarEncendidas(est.encendidas, false);
        capa.setDepth(0);
        if (document.fonts && document.fonts.ready && !est.fuentes) {
            est.fuentes = true;
            document.fonts.ready.then(function () {
                if (est.escena === escena && est.w) dibujar(escena, capa, est.w, est.h);
            });
        }
        return { bombillas: est.bombillas };
    }

    // ------------------------------------------------------------------ vida

    function aplicarEncendidas(n, animar) {
        var e = est.escena;
        var total = est.bombillas.length;
        var cuantas = Math.round(total * Math.max(0, Math.min(1, n)));
        est.bombillas.forEach(function (b, i) {
            // se encienden desde los extremos hacia el centro, alternando lados
            var orden = i % 2 === 0 ? i / 2 : total - 1 - (i - 1) / 2;
            var on = orden < cuantas;
            var cambia = on !== b.on;
            b.on = on;
            b.foco.setAlpha(on ? 1 : 0.3);
            b.halo.setAlpha(on ? 0.7 : 0);
            if (cambia && on && animar && e && !reducido) {
                b.foco.setScale(0.2);
                e.tweens.add({ targets: b.foco, scale: 1, duration: 380, delay: orden * 50, ease: "Back.easeOut" });
            }
        });
    }

    function encender() {
        est.encendidas = 1 / 3;
        aplicarEncendidas(est.encendidas, true);
    }

    function ronda(n) {
        est.encendidas = Math.min(1, (n || 1) / 3);
        aplicarEncendidas(est.encendidas, true);
        est.celebrando = Math.max(est.celebrando, 0.6);
    }

    function tick(time, dt) {
        if (!est.escena || !est.brillo) return;
        var t = (time || 0) / 1000;
        est.t = t;
        var paso = Math.min(0.05, (dt || 16) / 1000);
        est.celebrando = Math.max(0, est.celebrando - paso * 0.6);
        var fiesta = est.celebrando;

        est.llamas.forEach(function (l, k) {
            var s = reducido ? 0 : (Math.sin(t * 9 + l.fase) * 0.08 + Math.sin(t * 15.3 + l.fase * 2) * 0.06);
            var extra = 1 + fiesta * 0.45;
            l.setDisplaySize(l.anchoBase * (1 - s * 0.6) * extra, l.altoBase * (1 + s) * extra);
            l.angle = reducido ? 0 : Math.sin(t * 5 + k) * 4;
        });
        if (est.fuegoGlow) {
            est.fuegoGlow.setAlpha(0.58 + (reducido ? 0 : Math.sin(t * 11) * 0.06 + Math.sin(t * 17) * 0.04) + fiesta * 0.3);
        }
        if (!reducido) {
            est.brasas.forEach(function (br) {
                br.vida += paso * 0.7;
                if (br.vida > 1) br.vida = 0;
                if (br.vida < 0) { br.setAlpha(0); return; }
                var f = est.fuego;
                br.setPosition(f.x + Math.sin(br.vida * 8 + br.y) * f.h * 0.18, f.y - f.h * 0.4 - br.vida * f.h * 1.6);
                br.setAlpha((1 - br.vida) * 0.9);
            });
        }
        est.puertas.forEach(function (p, i) {
            p.setAlpha(p.base + (reducido ? 0 : Math.sin(t * 2.3 + i * 2) * 0.08) + fiesta * 0.3);
        });
        est.bombillas.forEach(function (b, i) {
            if (!b.on) return;
            var a = 0.55 + (reducido ? 0.1 : Math.sin(t * 2 + b.fase) * 0.15);
            if (fiesta > 0.05) {
                var c = COLORES_BOMBILLO[(i + Math.floor(t * 8)) % COLORES_BOMBILLO.length];
                b.halo.setTint(c);
                b.foco.setFillStyle(c, 1);
                a = 0.9;
            } else {
                b.halo.setTint(b.color);
                b.foco.setFillStyle(b.color, 1);
            }
            b.halo.setAlpha(a);
        });

        var L = est.luz;
        est.luciernagas.forEach(function (f) {
            var tx = f.bx + (reducido ? 0 : Math.sin(t * f.vel + f.fase) * f.amp);
            var ty = f.by + (reducido ? 0 : Math.cos(t * f.vel * 1.3 + f.fase) * f.amp * 0.6);
            var d = Math.hypot(L.x - f.x, L.y - f.y);
            var cerca = d < L.r * 2.2;
            if (cerca && !reducido) {
                // se acercan un poco a la linterna, sin entrar al centro
                var ang = Math.atan2(f.y - L.y, f.x - L.x);
                tx = tx * 0.6 + (L.x + Math.cos(ang) * L.r * 1.25) * 0.4;
                ty = ty * 0.6 + (L.y + Math.sin(ang) * L.r * 1.25) * 0.4;
            }
            f.x += (tx - f.x) * Math.min(1, paso * 3);
            f.y += (ty - f.y) * Math.min(1, paso * 3);
            f.boost *= 0.96;
            var pulso = reducido ? 0.7 : 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 + f.fase));
            f.halo.setPosition(f.x, f.y - f.boost * 20);
            f.nucleo.setPosition(f.x, f.y - f.boost * 20);
            f.halo.setAlpha(Math.min(1, pulso + (cerca ? 0.3 : 0) + f.boost * 0.5));
            var tam = 24 + (cerca ? 10 : 0) + f.boost * 26;
            f.halo.setDisplaySize(tam, tam);
        });
    }

    function pulsoLuz(x, y, r) {
        est.luz.x = x;
        est.luz.y = y;
        est.luz.r = r || 1;
    }

    function celebrar() {
        est.celebrando = 1;
        est.luciernagas.forEach(function (f) { f.boost = 1; });
        var e = est.escena;
        if (!e || reducido) return;
        est.banderas.forEach(function (f, i) {
            e.tweens.add({ targets: f, angle: i % 2 ? -18 : 18, duration: 140, yoyo: true, repeat: 2 });
        });
        est.bombillas.forEach(function (b, i) {
            if (!b.on) return;
            e.tweens.add({ targets: b.foco, scale: 1.5, duration: 150, yoyo: true, repeat: 1, delay: i * 25 });
        });
    }

    global.Campamento = {
        dibujar: dibujar,
        encender: encender,
        limpiar: limpiar,
        pulsoLuz: pulsoLuz,
        tick: tick,
        celebrar: celebrar,
        ronda: ronda
    };
})(window);
