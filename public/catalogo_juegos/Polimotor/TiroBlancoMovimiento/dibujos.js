/**
 * DibujosTiro — dibujos originales de "El Tiro al Blanco en Movimiento" (window.DibujosTiro).
 * Todo se pinta con canvas 2D (degradados y brillos): arena espacial, piso metálico en perspectiva,
 * planetas, torres holográficas, diana holográfica de tres anillos, sombra fantasma, lanzador estelar,
 * disco de luz, ondas, chispas y la estrella final. Cada función devuelve un <canvas> para Phaser.
 */
(function (global) {
    "use strict";

    var W = 1600, H = 900;
    /** Piso de la arena: borde del fondo (lejos) y del frente (cerca) en el mundo 1600 × 900. */
    var PISO = { yLejos: 560, yCerca: 900, x0Lejos: 360, x1Lejos: 1240, x0Cerca: -260, x1Cerca: 1860, columnas: 10, filas: 6 };

    function lienzo(w, h, fn) {
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        var g = c.getContext("2d");
        fn(g, w, h);
        return c;
    }

    function azar(semilla) {
        var s = semilla || 1;
        return function () {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function rgba(hex, a) {
        var n = parseInt(hex.slice(1), 16);
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }

    function mancha(g, x, y, r, color, a) {
        var rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, rgba(color, a));
        rg.addColorStop(0.45, rgba(color, a * 0.45));
        rg.addColorStop(1, rgba(color, 0));
        g.fillStyle = rg;
        g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // ------------------------------------------------------------------ geometría del piso (la usa la escena)

    function puntoPiso(col, fila) {
        var f = Math.pow(fila / PISO.filas, 1.55);
        var y = PISO.yLejos + (PISO.yCerca - PISO.yLejos) * f;
        var xl = PISO.x0Lejos + (PISO.x1Lejos - PISO.x0Lejos) * col / PISO.columnas;
        var xc = PISO.x0Cerca + (PISO.x1Cerca - PISO.x0Cerca) * col / PISO.columnas;
        return { x: xl + (xc - xl) * f, y: y };
    }

    /** Las cuatro esquinas de una baldosa del piso (col 0..columnas-1, fila 0..filas-1). */
    function celdaPiso(col, fila) {
        return [puntoPiso(col, fila), puntoPiso(col + 1, fila), puntoPiso(col + 1, fila + 1), puntoPiso(col, fila + 1)];
    }

    // ------------------------------------------------------------------ fondo: espacio, nebulosas y estrellas fijas

    function fondo() {
        return lienzo(W, H, function (g, w, h) {
            var gr = g.createLinearGradient(0, 0, 0, h);
            gr.addColorStop(0, "#060824");
            gr.addColorStop(0.38, "#141047");
            gr.addColorStop(0.62, "#2a1263");
            gr.addColorStop(1, "#0d0830");
            g.fillStyle = gr;
            g.fillRect(0, 0, w, h);
            g.globalCompositeOperation = "lighter";
            mancha(g, 280, 210, 460, "#ff4fd8", 0.2);
            mancha(g, 1290, 170, 480, "#3be8ff", 0.16);
            mancha(g, 820, 430, 560, "#8b5cf6", 0.22);
            mancha(g, 1480, 520, 300, "#ff7ac8", 0.12);
            mancha(g, 120, 560, 320, "#4f8cff", 0.14);
            // velo de la nebulosa: franjas suaves cruzadas
            var r = azar(11);
            for (var i = 0; i < 28; i++) {
                var x = r() * w, y = 80 + r() * 420;
                mancha(g, x, y, 60 + r() * 120, r() < 0.5 ? "#c77dff" : "#5ad1ff", 0.05 + r() * 0.05);
            }
            // estrellas fijas
            r = azar(7);
            for (var k = 0; k < 460; k++) {
                var sx = r() * w, sy = r() * h * 0.72;
                var grande = r() > 0.93;
                var s = grande ? 1.3 + r() * 1.5 : 0.3 + r() * 1.1;
                g.fillStyle = "rgba(255,255,255," + (0.3 + r() * 0.6) + ")";
                g.beginPath();
                g.arc(sx, sy, s, 0, Math.PI * 2);
                g.fill();
                if (grande) mancha(g, sx, sy, s * 5, "#bfe9ff", 0.25);
            }
            g.globalCompositeOperation = "source-over";
            // bruma baja detrás del piso
            var b = g.createLinearGradient(0, 470, 0, 600);
            b.addColorStop(0, "rgba(120,80,255,0)");
            b.addColorStop(1, "rgba(120,80,255,0.35)");
            g.fillStyle = b;
            g.fillRect(0, 470, w, 130);
        });
    }

    function planeta(r, c1, c2, anillo) {
        var tam = Math.ceil(r * (anillo ? 4.4 : 2.6));
        return lienzo(tam, tam, function (g, w, h) {
            var cx = w / 2, cy = h / 2;
            mancha(g, cx, cy, r * 1.3, c1, 0.25);
            function aro(atras) {
                if (!anillo) return;
                g.save();
                g.translate(cx, cy);
                g.rotate(-0.32);
                g.scale(1, 0.28);
                g.beginPath();
                if (atras) g.arc(0, 0, r * 2, Math.PI, Math.PI * 2);
                else g.arc(0, 0, r * 2, 0, Math.PI);
                g.lineWidth = r * 0.42;
                g.strokeStyle = rgba(c2, 0.55);
                g.stroke();
                g.lineWidth = r * 0.08;
                g.strokeStyle = rgba("#ffffff", 0.45);
                g.stroke();
                g.restore();
            }
            aro(true);
            var rg = g.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r);
            rg.addColorStop(0, "#ffffff");
            rg.addColorStop(0.18, c2);
            rg.addColorStop(0.7, c1);
            rg.addColorStop(1, "#1a0b40");
            g.fillStyle = rg;
            g.beginPath();
            g.arc(cx, cy, r, 0, Math.PI * 2);
            g.fill();
            // bandas
            g.save();
            g.beginPath();
            g.arc(cx, cy, r, 0, Math.PI * 2);
            g.clip();
            g.globalAlpha = 0.18;
            g.fillStyle = "#ffffff";
            for (var i = -2; i <= 2; i++) g.fillRect(cx - r, cy + i * r * 0.36, r * 2, r * 0.1);
            g.restore();
            aro(false);
        });
    }

    // ------------------------------------------------------------------ piso metálico en perspectiva

    function piso() {
        return lienzo(W, H, function (g) {
            var p = PISO;
            var esq = [puntoPiso(0, 0), puntoPiso(p.columnas, 0), puntoPiso(p.columnas, p.filas), puntoPiso(0, p.filas)];
            g.beginPath();
            esq.forEach(function (q, i) { if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
            g.closePath();
            var gr = g.createLinearGradient(0, p.yLejos, 0, p.yCerca);
            gr.addColorStop(0, "#2a2f6b");
            gr.addColorStop(0.35, "#1c2152");
            gr.addColorStop(1, "#0b0f2c");
            g.fillStyle = gr;
            g.fill();
            g.save();
            g.clip();
            // reflejo metálico central
            var ref = g.createRadialGradient(800, 640, 20, 800, 700, 620);
            ref.addColorStop(0, "rgba(150,170,255,0.35)");
            ref.addColorStop(1, "rgba(150,170,255,0)");
            g.fillStyle = ref;
            g.fillRect(0, p.yLejos, W, H - p.yLejos);
            // baldosas: biseles claros y oscuros
            for (var f = 0; f < p.filas; f++) {
                for (var c = 0; c < p.columnas; c++) {
                    var q = celdaPiso(c, f);
                    var par = (c + f) % 2 === 0;
                    g.beginPath();
                    q.forEach(function (pt, i) { if (i) g.lineTo(pt.x, pt.y); else g.moveTo(pt.x, pt.y); });
                    g.closePath();
                    g.fillStyle = par ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.08)";
                    g.fill();
                    // remaches en la esquina cercana
                    var r = q[3];
                    g.fillStyle = "rgba(200,220,255,0.25)";
                    g.beginPath();
                    g.arc(r.x + 8, r.y - 4, 1.6 + f * 0.5, 0, Math.PI * 2);
                    g.fill();
                }
            }
            // líneas de la rejilla con brillo
            g.lineCap = "round";
            for (var col = 0; col <= p.columnas; col++) {
                var a = puntoPiso(col, 0), b = puntoPiso(col, p.filas);
                g.strokeStyle = "rgba(90,209,255,0.28)";
                g.lineWidth = 2;
                g.beginPath();
                g.moveTo(a.x, a.y);
                g.lineTo(b.x, b.y);
                g.stroke();
            }
            for (var fil = 0; fil <= p.filas; fil++) {
                g.beginPath();
                for (var cc = 0; cc <= p.columnas; cc++) {
                    var pt = puntoPiso(cc, fil);
                    if (cc) g.lineTo(pt.x, pt.y);
                    else g.moveTo(pt.x, pt.y);
                }
                g.strokeStyle = "rgba(199,125,255," + (0.18 + fil * 0.03) + ")";
                g.lineWidth = 1.5 + fil * 0.5;
                g.stroke();
            }
            // círculo de lanzamiento alrededor del lanzador
            g.save();
            g.translate(800, 812);
            g.scale(1, 0.3);
            for (var k = 0; k < 3; k++) {
                g.beginPath();
                g.arc(0, 0, 150 + k * 46, 0, Math.PI * 2);
                g.strokeStyle = rgba(k === 1 ? "#ff4fd8" : "#3be8ff", 0.4 - k * 0.1);
                g.lineWidth = 8 - k * 2;
                g.stroke();
            }
            g.restore();
            g.restore();
            // borde del fondo de la plataforma: franja luminosa
            g.globalCompositeOperation = "lighter";
            g.beginPath();
            g.moveTo(esq[0].x, esq[0].y);
            g.lineTo(esq[1].x, esq[1].y);
            g.strokeStyle = "rgba(59,232,255,0.9)";
            g.lineWidth = 5;
            g.stroke();
            g.strokeStyle = "rgba(59,232,255,0.25)";
            g.lineWidth = 18;
            g.stroke();
            g.globalCompositeOperation = "source-over";
            // canto de la plataforma (grosor visible bajo el borde lejano)
            g.fillStyle = "#0a0c26";
            g.beginPath();
            g.moveTo(esq[0].x, esq[0].y + 3);
            g.lineTo(esq[1].x, esq[1].y + 3);
            g.lineTo(esq[1].x + 30, esq[1].y + 18);
            g.lineTo(esq[0].x - 30, esq[0].y + 18);
            g.closePath();
            g.fill();
        });
    }

    // ------------------------------------------------------------------ estructuras de la arena

    function plataforma() {
        return lienzo(320, 170, function (g, w) {
            var cx = w / 2;
            mancha(g, cx, 120, 120, "#3be8ff", 0.35);
            // cuerpo
            g.fillStyle = "#1b1f4d";
            g.beginPath();
            g.moveTo(30, 56);
            g.lineTo(290, 56);
            g.lineTo(250, 104);
            g.lineTo(70, 104);
            g.closePath();
            g.fill();
            var gr = g.createLinearGradient(0, 30, 0, 80);
            gr.addColorStop(0, "#7d8fd8");
            gr.addColorStop(1, "#30387a");
            g.fillStyle = gr;
            g.beginPath();
            g.ellipse(cx, 56, 132, 26, 0, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = "#5ad1ff";
            g.lineWidth = 4;
            g.stroke();
            g.beginPath();
            g.ellipse(cx, 56, 92, 16, 0, 0, Math.PI * 2);
            g.strokeStyle = "rgba(255,79,216,0.8)";
            g.lineWidth = 3;
            g.stroke();
            // luces del canto
            for (var i = 0; i < 7; i++) {
                g.fillStyle = i % 2 ? "#ff7ae0" : "#7ff3ff";
                g.beginPath();
                g.arc(70 + i * 30, 82 + Math.sin(i / 6 * Math.PI) * 8, 4, 0, Math.PI * 2);
                g.fill();
            }
        });
    }

    function torre() {
        return lienzo(110, 420, function (g, w, h) {
            var cx = w / 2;
            var gr = g.createLinearGradient(0, 0, w, 0);
            gr.addColorStop(0, "#1a1d45");
            gr.addColorStop(0.5, "#4a55a8");
            gr.addColorStop(1, "#1a1d45");
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(cx - 16, 60);
            g.lineTo(cx + 16, 60);
            g.lineTo(cx + 26, h);
            g.lineTo(cx - 26, h);
            g.closePath();
            g.fill();
            g.globalCompositeOperation = "lighter";
            g.fillStyle = "rgba(59,232,255,0.85)";
            g.fillRect(cx - 3, 80, 6, h - 100);
            for (var i = 0; i < 6; i++) {
                g.fillStyle = i % 2 ? "rgba(255,79,216,0.8)" : "rgba(127,243,255,0.8)";
                g.fillRect(cx - 20, 110 + i * 48, 40, 5);
            }
            // emisor holográfico arriba
            mancha(g, cx, 48, 52, "#3be8ff", 0.7);
            g.fillStyle = "#e6fbff";
            g.beginPath();
            g.arc(cx, 48, 12, 0, Math.PI * 2);
            g.fill();
            g.globalCompositeOperation = "source-over";
        });
    }

    function pantalla() {
        return lienzo(300, 150, function (g, w, h) {
            g.save();
            g.globalCompositeOperation = "lighter";
            mancha(g, w / 2, h / 2, 170, "#3be8ff", 0.3);
            g.restore();
            g.fillStyle = "rgba(20,40,110,0.55)";
            g.strokeStyle = "rgba(127,243,255,0.95)";
            g.lineWidth = 5;
            var r = 20;
            g.beginPath();
            g.moveTo(r + 10, 12);
            g.lineTo(w - 10 - r, 12);
            g.quadraticCurveTo(w - 10, 12, w - 10, 12 + r);
            g.lineTo(w - 10, h - 12 - r);
            g.quadraticCurveTo(w - 10, h - 12, w - 10 - r, h - 12);
            g.lineTo(10 + r, h - 12);
            g.quadraticCurveTo(10, h - 12, 10, h - 12 - r);
            g.lineTo(10, 12 + r);
            g.quadraticCurveTo(10, 12, 10 + r, 12);
            g.closePath();
            g.fill();
            g.stroke();
            // líneas de barrido
            g.fillStyle = "rgba(127,243,255,0.12)";
            for (var y = 20; y < h - 16; y += 7) g.fillRect(14, y, w - 28, 2);
            g.font = "bold 58px Arial, sans-serif";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillStyle = "#e9fdff";
            g.shadowColor = "#3be8ff";
            g.shadowBlur = 18;
            g.fillText("PEDNIA", w / 2, h / 2 + 3);
        });
    }

    function cono() {
        return lienzo(260, 640, function (g, w, h) {
            var gr = g.createLinearGradient(0, 0, 0, h);
            gr.addColorStop(0, "rgba(255,255,255,0.75)");
            gr.addColorStop(0.5, "rgba(255,255,255,0.18)");
            gr.addColorStop(1, "rgba(255,255,255,0)");
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(w / 2 - 14, 0);
            g.lineTo(w / 2 + 14, 0);
            g.lineTo(w, h);
            g.lineTo(0, h);
            g.closePath();
            g.fill();
        });
    }

    // ------------------------------------------------------------------ diana holográfica (radio 120 en la textura)

    var RD = 120;

    function texto(g, t, x, y, tam) {
        g.font = "bold " + tam + "px Arial, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.lineWidth = 5;
        g.strokeStyle = "rgba(20,10,70,0.85)";
        g.strokeText(t, x, y);
        g.fillStyle = "#ffffff";
        g.fillText(t, x, y);
    }

    function diana() {
        return lienzo(264, 264, function (g, w) {
            var c = w / 2;
            function disco(r, relleno) {
                g.beginPath();
                g.arc(c, c, r, 0, Math.PI * 2);
                g.fillStyle = relleno;
                g.fill();
            }
            function borde(r, color, ancho) {
                g.beginPath();
                g.arc(c, c, r, 0, Math.PI * 2);
                g.strokeStyle = color;
                g.lineWidth = ancho;
                g.stroke();
            }
            // anillo exterior (10)
            var a1 = g.createRadialGradient(c, c, RD * 0.6, c, c, RD);
            a1.addColorStop(0, "rgba(40,170,255,0.55)");
            a1.addColorStop(1, "rgba(90,230,255,0.75)");
            disco(RD, a1);
            // anillo intermedio (20)
            var a2 = g.createRadialGradient(c, c, RD * 0.3, c, c, RD * 0.67);
            a2.addColorStop(0, "rgba(200,90,255,0.75)");
            a2.addColorStop(1, "rgba(255,79,216,0.85)");
            disco(RD * 0.67, a2);
            // núcleo (50)
            var a3 = g.createRadialGradient(c, c, 0, c, c, RD * 0.34);
            a3.addColorStop(0, "#ffffff");
            a3.addColorStop(0.45, "#fff3a6");
            a3.addColorStop(1, "#ffb21e");
            disco(RD * 0.34, a3);
            // bordes brillantes
            borde(RD - 3, "#b9f6ff", 6);
            borde(RD * 0.67, "#ffffff", 4);
            borde(RD * 0.34, "#fff6c9", 4);
            // marcas holográficas del anillo exterior
            g.save();
            g.translate(c, c);
            for (var i = 0; i < 24; i++) {
                g.rotate(Math.PI * 2 / 24);
                g.fillStyle = i % 2 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)";
                g.fillRect(RD * 0.86, -2, RD * 0.08, 4);
            }
            g.restore();
            // líneas de barrido holográfico
            g.save();
            g.beginPath();
            g.arc(c, c, RD, 0, Math.PI * 2);
            g.clip();
            g.fillStyle = "rgba(255,255,255,0.08)";
            for (var y = c - RD; y < c + RD; y += 8) g.fillRect(c - RD, y, RD * 2, 2);
            g.restore();
            // números (pequeños, sin tapar la diana)
            texto(g, "10", c, c - RD * 0.835, 22);
            texto(g, "20", c, c - RD * 0.505, 22);
            texto(g, "50", c, c, 24);
        });
    }

    function dianaAro() {
        return lienzo(320, 320, function (g, w) {
            var c = w / 2;
            g.lineCap = "round";
            for (var i = 0; i < 12; i++) {
                g.beginPath();
                var a0 = i * Math.PI / 6, a1 = a0 + Math.PI / 10;
                g.arc(c, c, 146, a0, a1);
                g.strokeStyle = i % 3 === 0 ? "rgba(255,122,224,0.95)" : "rgba(127,243,255,0.85)";
                g.lineWidth = i % 3 === 0 ? 7 : 4;
                g.stroke();
            }
        });
    }

    function halo(tam, color) {
        return lienzo(tam, tam, function (g, w) {
            mancha(g, w / 2, w / 2, w / 2, color || "#ffffff", 0.9);
        });
    }

    /** Sombra fantasma: contorno punteado verde menta, semitransparente (distinta de la diana). */
    function sombra() {
        return lienzo(264, 264, function (g, w) {
            var c = w / 2;
            g.setLineDash([14, 10]);
            [1, 0.67, 0.34].forEach(function (k, i) {
                g.beginPath();
                g.arc(c, c, RD * k - 3, 0, Math.PI * 2);
                g.strokeStyle = i ? "rgba(140,255,205,0.75)" : "rgba(140,255,205,0.95)";
                g.lineWidth = i ? 4 : 6;
                g.stroke();
            });
            g.setLineDash([]);
            var rg = g.createRadialGradient(c, c, 0, c, c, RD);
            rg.addColorStop(0, "rgba(140,255,205,0.35)");
            rg.addColorStop(1, "rgba(140,255,205,0.05)");
            g.fillStyle = rg;
            g.beginPath();
            g.arc(c, c, RD, 0, Math.PI * 2);
            g.fill();
        });
    }

    function reflejo() {
        return lienzo(300, 90, function (g, w, h) {
            g.save();
            g.translate(w / 2, h / 2);
            g.scale(1, h / w);
            var rg = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
            rg.addColorStop(0, "rgba(140,230,255,0.85)");
            rg.addColorStop(0.5, "rgba(170,110,255,0.4)");
            rg.addColorStop(1, "rgba(170,110,255,0)");
            g.fillStyle = rg;
            g.beginPath();
            g.arc(0, 0, w / 2, 0, Math.PI * 2);
            g.fill();
            g.restore();
        });
    }

    // ------------------------------------------------------------------ disco de luz

    function disco() {
        return lienzo(128, 128, function (g, w) {
            var c = w / 2;
            mancha(g, c, c, 64, "#ff4fd8", 0.65);
            var rg = g.createRadialGradient(c, c, 4, c, c, 40);
            rg.addColorStop(0, "#ffffff");
            rg.addColorStop(0.35, "#ffd1f5");
            rg.addColorStop(0.8, "#ff4fd8");
            rg.addColorStop(1, "#b5179e");
            g.fillStyle = rg;
            g.beginPath();
            g.arc(c, c, 40, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = "#ffffff";
            g.lineWidth = 4;
            g.stroke();
            // rayos que se ven girar
            g.save();
            g.translate(c, c);
            for (var i = 0; i < 6; i++) {
                g.rotate(Math.PI / 3);
                g.fillStyle = i % 2 ? "rgba(255,255,255,0.9)" : "rgba(127,243,255,0.9)";
                g.beginPath();
                g.moveTo(10, -3);
                g.lineTo(34, -6);
                g.lineTo(34, 6);
                g.lineTo(10, 3);
                g.closePath();
                g.fill();
            }
            g.restore();
            g.fillStyle = "#ffffff";
            g.beginPath();
            g.arc(c, c, 8, 0, Math.PI * 2);
            g.fill();
        });
    }

    // ------------------------------------------------------------------ lanzador estelar de Zeus

    /**
     * Lanzador estelar: plato metálico abajo, cilindro de vidrio con energía cian y collar metálico arriba,
     * con el hueco donde se apoya el disco (centro del hueco en y = 40 de la textura).
     */
    function lanzador() {
        return lienzo(260, 250, function (g, w) {
            var cx = w / 2;
            function elipse(y, rx, ry) {
                g.beginPath();
                g.ellipse(cx, y, rx, ry, 0, 0, Math.PI * 2);
            }
            function arcoFrente(y, rx, ry) {
                g.beginPath();
                g.ellipse(cx, y, rx, ry, 0, Math.PI, 0, true);
            }
            function metal(rx) {
                var m = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
                m.addColorStop(0, "#4b4f93");
                m.addColorStop(0.22, "#eef0ff");
                m.addColorStop(0.45, "#bcc3f2");
                m.addColorStop(0.8, "#7a83c9");
                m.addColorStop(1, "#43478a");
                return m;
            }
            // brillo cian en el piso
            g.save();
            g.globalCompositeOperation = "lighter";
            g.translate(cx, 212);
            g.scale(1, 0.32);
            mancha(g, 0, 0, 128, "#3be8ff", 0.6);
            g.restore();

            // --- plato de la base
            g.fillStyle = metal(110);
            g.fillRect(cx - 110, 180, 220, 26);
            elipse(206, 110, 27);
            g.fill();
            elipse(180, 110, 27);
            var tapa = g.createLinearGradient(0, 154, 0, 206);
            tapa.addColorStop(0, "#f4f5ff");
            tapa.addColorStop(1, "#8e96d6");
            g.fillStyle = tapa;
            g.fill();
            g.strokeStyle = "rgba(255,255,255,0.8)";
            g.lineWidth = 2;
            g.stroke();
            // ranura de luz en la tapa y franja en el canto
            g.save();
            g.globalCompositeOperation = "lighter";
            elipse(182, 88, 19);
            g.strokeStyle = "rgba(59,232,255,0.95)";
            g.lineWidth = 5;
            g.stroke();
            arcoFrente(194, 110, 27);
            g.strokeStyle = "rgba(59,232,255,0.9)";
            g.lineWidth = 4;
            g.stroke();
            g.restore();

            // --- cilindro de vidrio con energía
            var top = 54, fondo = 180, rx = 64;
            g.save();
            g.beginPath();
            g.moveTo(cx - rx, top);
            g.lineTo(cx - rx, fondo);
            g.ellipse(cx, fondo, rx, 16, 0, Math.PI, 0, true);
            g.lineTo(cx + rx, top);
            g.closePath();
            g.clip();
            var energia = g.createLinearGradient(0, fondo + 16, 0, top);
            energia.addColorStop(0, "rgba(59,232,255,0.9)");
            energia.addColorStop(0.45, "rgba(59,200,255,0.45)");
            energia.addColorStop(1, "rgba(120,180,255,0.12)");
            g.fillStyle = energia;
            g.fillRect(cx - rx, top, rx * 2, fondo - top + 20);
            var vidrio = g.createLinearGradient(cx - rx, 0, cx + rx, 0);
            vidrio.addColorStop(0, "rgba(200,240,255,0.55)");
            vidrio.addColorStop(0.2, "rgba(255,255,255,0.05)");
            vidrio.addColorStop(0.75, "rgba(255,255,255,0.05)");
            vidrio.addColorStop(1, "rgba(200,240,255,0.45)");
            g.fillStyle = vidrio;
            g.fillRect(cx - rx, top, rx * 2, fondo - top + 20);
            // burbujas y destellos de energía
            var r = azar(5);
            for (var k = 0; k < 16; k++) {
                g.fillStyle = "rgba(255,255,255," + (0.35 + r() * 0.5) + ")";
                g.beginPath();
                g.arc(cx - rx + 12 + r() * (rx * 2 - 24), top + 20 + r() * (fondo - top - 20), 1.5 + r() * 3, 0, Math.PI * 2);
                g.fill();
            }
            g.restore();
            // bordes y reflejos del vidrio
            g.strokeStyle = "rgba(225,248,255,0.85)";
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(cx - rx, top);
            g.lineTo(cx - rx, fondo);
            g.moveTo(cx + rx, top);
            g.lineTo(cx + rx, fondo);
            g.stroke();
            arcoFrente(fondo, rx, 16);
            g.stroke();
            g.fillStyle = "rgba(255,255,255,0.55)";
            g.fillRect(cx - rx + 12, top + 14, 9, fondo - top - 22);
            g.fillStyle = "rgba(255,255,255,0.22)";
            g.fillRect(cx + rx - 22, top + 18, 5, fondo - top - 30);

            // --- collar metálico arriba con el hueco del disco
            var cy = 40;
            g.fillStyle = metal(84);
            g.fillRect(cx - 84, cy, 168, 18);
            elipse(cy + 18, 84, 20);
            g.fill();
            elipse(cy, 84, 20);
            var tapaC = g.createLinearGradient(0, cy - 20, 0, cy + 20);
            tapaC.addColorStop(0, "#ffffff");
            tapaC.addColorStop(1, "#9aa2e0");
            g.fillStyle = tapaC;
            g.fill();
            g.strokeStyle = "rgba(255,255,255,0.9)";
            g.lineWidth = 2;
            g.stroke();
            elipse(cy, 62, 13);
            var hueco = g.createRadialGradient(cx, cy, 2, cx, cy, 62);
            hueco.addColorStop(0, "#5ff3ff");
            hueco.addColorStop(0.45, "#2b5fd0");
            hueco.addColorStop(1, "#1a1d5e");
            g.fillStyle = hueco;
            g.fill();
            // luces del collar
            for (var q = 0; q < 7; q++) {
                var a = Math.PI * (0.12 + q * 0.127);
                g.fillStyle = q % 2 ? "#ff8ae6" : "#7ff3ff";
                g.beginPath();
                g.arc(cx - Math.cos(a) * 80, cy + 9 + Math.sin(a) * 18, 3.2, 0, Math.PI * 2);
                g.fill();
            }
        });
    }

    /** Disco de luz visto acostado (el que espera sobre el lanzador y los de repuesto). */
    function discoPlano(claro, medio, oscuro) {
        return lienzo(190, 96, function (g, w) {
            var cx = w / 2, cy = 42;
            g.save();
            g.globalCompositeOperation = "lighter";
            g.translate(cx, cy + 4);
            g.scale(1, 0.42);
            mancha(g, 0, 0, 94, medio, 0.55);
            g.restore();
            // canto (grosor del disco)
            g.fillStyle = oscuro;
            g.fillRect(cx - 78, cy, 156, 11);
            g.beginPath();
            g.ellipse(cx, cy + 11, 78, 24, 0, 0, Math.PI * 2);
            g.fill();
            // cara de arriba
            g.beginPath();
            g.ellipse(cx, cy, 78, 24, 0, 0, Math.PI * 2);
            var cara = g.createRadialGradient(cx - 10, cy - 6, 4, cx, cy, 80);
            cara.addColorStop(0, "#ffffff");
            cara.addColorStop(0.3, claro);
            cara.addColorStop(0.8, medio);
            cara.addColorStop(1, oscuro);
            g.fillStyle = cara;
            g.fill();
            g.strokeStyle = "#ffffff";
            g.lineWidth = 3.5;
            g.stroke();
            g.beginPath();
            g.ellipse(cx, cy, 52, 15, 0, 0, Math.PI * 2);
            g.strokeStyle = "rgba(255,255,255,0.85)";
            g.lineWidth = 3;
            g.stroke();
            g.beginPath();
            g.ellipse(cx, cy, 20, 6, 0, 0, Math.PI * 2);
            g.fillStyle = "#ffffff";
            g.fill();
            // reflejo
            g.beginPath();
            g.ellipse(cx - 30, cy - 10, 22, 5, -0.15, 0, Math.PI * 2);
            g.fillStyle = "rgba(255,255,255,0.55)";
            g.fill();
        });
    }

    function anillo(color) {
        return lienzo(260, 90, function (g, w, h) {
            g.save();
            g.globalCompositeOperation = "lighter";
            g.beginPath();
            g.ellipse(w / 2, h / 2, w / 2 - 12, h / 2 - 12, 0, 0, Math.PI * 2);
            g.strokeStyle = rgba(color, 0.35);
            g.lineWidth = 16;
            g.stroke();
            g.strokeStyle = rgba(color, 0.95);
            g.lineWidth = 5;
            g.stroke();
            // nodos de luz sobre el anillo
            for (var i = 0; i < 6; i++) {
                var a = i * Math.PI / 3;
                g.fillStyle = "#ffffff";
                g.beginPath();
                g.arc(w / 2 + Math.cos(a) * (w / 2 - 12), h / 2 + Math.sin(a) * (h / 2 - 12), 4, 0, Math.PI * 2);
                g.fill();
            }
            g.restore();
        });
    }

    // ------------------------------------------------------------------ esfera de energía (zona de apuntado)

    /** Esfera de energía alrededor del disco: brillo interior y borde. Radio 140 en la textura de 320. */
    function esferaMira() {
        return lienzo(320, 320, function (g, w) {
            var c = w / 2, r = 140;
            var rg = g.createRadialGradient(c, c, r * 0.2, c, c, r);
            rg.addColorStop(0, "rgba(59,232,255,0.02)");
            rg.addColorStop(0.7, "rgba(59,232,255,0.10)");
            rg.addColorStop(0.95, "rgba(140,240,255,0.32)");
            rg.addColorStop(1, "rgba(140,240,255,0)");
            g.fillStyle = rg;
            g.beginPath();
            g.arc(c, c, r, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(c, c, r - 2, 0, Math.PI * 2);
            g.strokeStyle = "rgba(160,245,255,0.75)";
            g.lineWidth = 3;
            g.stroke();
            // reflejo de esfera arriba a la izquierda
            g.beginPath();
            g.arc(c, c, r - 18, Math.PI * 1.1, Math.PI * 1.4);
            g.strokeStyle = "rgba(255,255,255,0.45)";
            g.lineWidth = 7;
            g.lineCap = "round";
            g.stroke();
        });
    }

    /** Anillos de energía que giran sobre la esfera (segmentos y nodos). */
    function esferaAro() {
        return lienzo(320, 320, function (g, w) {
            var c = w / 2;
            g.lineCap = "round";
            for (var i = 0; i < 8; i++) {
                var a0 = i * Math.PI / 4;
                g.beginPath();
                g.arc(c, c, 150, a0, a0 + Math.PI / 7);
                g.strokeStyle = i % 2 ? "rgba(255,122,224,0.95)" : "rgba(127,243,255,0.95)";
                g.lineWidth = i % 2 ? 4 : 6;
                g.stroke();
                g.fillStyle = "#ffffff";
                g.beginPath();
                g.arc(c + Math.cos(a0) * 150, c + Math.sin(a0) * 150, 4, 0, Math.PI * 2);
                g.fill();
            }
            g.setLineDash([6, 12]);
            g.beginPath();
            g.arc(c, c, 128, 0, Math.PI * 2);
            g.strokeStyle = "rgba(127,243,255,0.55)";
            g.lineWidth = 2.5;
            g.stroke();
        });
    }

    // ------------------------------------------------------------------ efectos

    function destello() {
        return lienzo(64, 64, function (g, w) {
            var c = w / 2;
            mancha(g, c, c, 22, "#ffffff", 0.8);
            g.fillStyle = "#ffffff";
            g.beginPath();
            g.moveTo(c, 2);
            g.quadraticCurveTo(c + 4, c - 4, w - 2, c);
            g.quadraticCurveTo(c + 4, c + 4, c, w - 2);
            g.quadraticCurveTo(c - 4, c + 4, 2, c);
            g.quadraticCurveTo(c - 4, c - 4, c, 2);
            g.fill();
        });
    }

    function onda() {
        return lienzo(256, 256, function (g, w) {
            var c = w / 2;
            g.beginPath();
            g.arc(c, c, 118, 0, Math.PI * 2);
            g.strokeStyle = "rgba(255,255,255,0.3)";
            g.lineWidth = 16;
            g.stroke();
            g.strokeStyle = "rgba(255,255,255,0.95)";
            g.lineWidth = 5;
            g.stroke();
        });
    }

    function estrellaGrande() {
        return lienzo(380, 380, function (g, w) {
            var c = w / 2;
            mancha(g, c, c, 190, "#ffd43b", 0.55);
            function estrella(r1, r2) {
                g.beginPath();
                for (var i = 0; i < 10; i++) {
                    var r = i % 2 ? r2 : r1;
                    var a = -Math.PI / 2 + i * Math.PI / 5;
                    g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
                }
                g.closePath();
            }
            estrella(150, 66);
            var gr = g.createRadialGradient(c, c - 20, 10, c, c, 150);
            gr.addColorStop(0, "#ffffff");
            gr.addColorStop(0.35, "#fff3a6");
            gr.addColorStop(0.8, "#ffc21e");
            gr.addColorStop(1, "#ff9f1c");
            g.fillStyle = gr;
            g.fill();
            g.lineWidth = 8;
            g.strokeStyle = "#fffbe6";
            g.stroke();
            estrella(108, 48);
            g.lineWidth = 3;
            g.strokeStyle = "rgba(255,79,216,0.7)";
            g.stroke();
            g.save();
            estrella(150, 66);
            g.clip();
            g.fillStyle = "rgba(255,255,255,0.18)";
            for (var y = 0; y < w; y += 9) g.fillRect(0, y, w, 3);
            g.restore();
        });
    }

    var DibujosTiro = {
        W: W,
        H: H,
        PISO: PISO,
        puntoPiso: puntoPiso,
        celdaPiso: celdaPiso,
        RADIO_DIANA: RD,
        /** Todas las texturas: clave → función que devuelve el canvas. */
        texturas: function () {
            return {
                "fondo": fondo,
                "planeta-a": function () { return planeta(70, "#7b3fe4", "#ff9ce6", true); },
                "planeta-b": function () { return planeta(38, "#1c7ed6", "#9bf6ff", false); },
                "planeta-c": function () { return planeta(22, "#e8590c", "#ffd8a8", false); },
                "piso": piso,
                "plataforma": plataforma,
                "torre": torre,
                "pantalla": pantalla,
                "cono": cono,
                "diana": diana,
                "diana-aro": dianaAro,
                "diana-halo": function () { return halo(360, "#7ff3ff"); },
                "sombra": sombra,
                "reflejo": reflejo,
                "disco": disco,
                "lanzador": lanzador,
                "lanzador-nucleo": function () { return halo(160, "#7ff3ff"); },
                "esfera-mira": esferaMira,
                "esfera-aro": esferaAro,
                "disco-plano": function () { return discoPlano("#ffd1f5", "#ff4fd8", "#a61e88"); },
                "disco-plano-cian": function () { return discoPlano("#d0fbff", "#3bc9ff", "#1864ab"); },
                "anillo-cian": function () { return anillo("#3be8ff"); },
                "anillo-rosa": function () { return anillo("#ff4fd8"); },
                "chispa": function () { return halo(48, "#ffffff"); },
                "destello": destello,
                "onda": onda,
                "estrella-grande": estrellaGrande
            };
        }
    };

    global.DibujosTiro = DibujosTiro;
})(window);
