/**
 * EscenarioMemorama — el tablero mágico de corcho y sus cuatro tarjetas (Phaser 4). Solo dibuja y anima:
 * la lógica de la partida está en reglas.js y el flujo en script.js.
 *
 * Capas (profundidad): tablero 0 → brillos que flotan 2 → tarjetas 10 (+ la carta activa 20) → efectos 40 →
 * cuenta regresiva 50.
 *
 * Cada tarjeta tiene tres contenedores anidados, para que las animaciones no se pisen:
 *   ext     posición en el tablero (la entrada desde arriba)          + chinche (no gira con la tarjeta)
 *   cuerpo  saltos, meneos, resaltado del cursor y baile final         + halos (oro y luz)
 *   volteo  el giro: escala horizontal 1 → 0, cambio de cara, 0 → 1   (la ilustración nunca queda al revés)
 *
 * API (window.EscenarioMemorama): montar, listo, reacomodar, enlazar, habilitar, asignar, entrar,
 * llamarAtencion, voltear, voltearTodas, cuenta, resaltar, menear, noSuave, pareja, celebrarFinal,
 * detenerFinal, reiniciar, puntoCarta, cartaEn, zonaTablero.
 */
(function (global) {
    "use strict";

    var Phaser = global.Phaser;
    var I = global.IconosMemorama;

    var TW = 600;          // textura de la tarjeta (proporción 4:5)
    var TH = 750;
    var PROP = TW / TH;
    var RES = Math.min(1.5, Math.max(1, global.devicePixelRatio || 1));

    var juego = null;
    var sc = null;
    var cfg = null;
    var listoPromesa = null;
    var cartas = [];
    var tableroImg = null;
    var cuentaG = null;
    var cuentaTxt = null;
    var brillos = [];
    var lay = null;
    var cb = {};
    var habilitado = false;
    var hover = -1;
    var finalActivo = false;
    var lluviaEvt = null;

    function sleep(ms) {
        return new Promise(function (r) { setTimeout(r, ms); });
    }

    /** Espera con el reloj de la escena (se detiene si la pestaña se oculta, como las animaciones). */
    function espera(ms) {
        return new Promise(function (r) {
            if (!sc) return r();
            sc.time.delayedCall(ms, r);
        });
    }

    function reducido() {
        return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    /** Azar con semilla (el corcho se dibuja igual en cada cambio de tamaño). */
    function azar(semilla) {
        var s = semilla >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function sonar(nombre, opts) {
        if (typeof global.sonarEvento === "function") global.sonarEvento(nombre, opts);
    }

    function sfx(nombre) {
        var S = global.SonidosMemorama;
        if (S && typeof S[nombre] === "function") S[nombre]();
    }

    // ------------------------------------------------------------------ dibujo en lienzos 2D

    function lienzo(w, h) {
        var c = document.createElement("canvas");
        c.width = Math.max(2, Math.round(w));
        c.height = Math.max(2, Math.round(h));
        return c;
    }

    function ponerTextura(clave, canvas) {
        if (sc.textures.exists(clave)) sc.textures.remove(clave);
        sc.textures.addCanvas(clave, canvas);
    }

    function rr(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function estrella(ctx, cx, cy, rExt, rInt, puntas, giro) {
        ctx.beginPath();
        for (var i = 0; i < puntas * 2; i++) {
            var r = i % 2 === 0 ? rExt : rInt;
            var a = -Math.PI / 2 + (giro || 0) + i * Math.PI / puntas;
            ctx[i === 0 ? "moveTo" : "lineTo"](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.closePath();
    }

    function cargarImagen(svg) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { resolve(null); };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        });
    }

    function fuenteLista() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        return Promise.race([
            document.fonts.load('700 60px "Fredoka"').catch(function () {}),
            sleep(1500)
        ]);
    }

    /** Reverso: azul mágico, estrellas doradas, luna y borde punteado. */
    function texturaReverso() {
        var c = lienzo(TW, TH);
        var ctx = c.getContext("2d");
        var r = TW * 0.09;
        rr(ctx, 6, 6, TW - 12, TH - 12, r);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        var g = ctx.createLinearGradient(0, 0, TW, TH);
        g.addColorStop(0, "#845ef7");
        g.addColorStop(0.55, "#5c5fe6");
        g.addColorStop(1, "#3b5bdb");
        rr(ctx, 22, 22, TW - 44, TH - 44, r * 0.75);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.save();
        rr(ctx, 22, 22, TW - 44, TH - 44, r * 0.75);
        ctx.clip();
        // estrellitas de fondo
        var rnd = azar(77);
        for (var i = 0; i < 26; i++) {
            ctx.globalAlpha = 0.25 + rnd() * 0.35;
            ctx.fillStyle = rnd() < 0.5 ? "#ffffff" : "#ffe066";
            estrella(ctx, 40 + rnd() * (TW - 80), 40 + rnd() * (TH - 80), 6 + rnd() * 9, 3 + rnd() * 3, 5, rnd());
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // remolino de luz
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.arc(TW / 2, TH / 2, TW * 0.36, Math.PI * 0.15, Math.PI * 1.25);
        ctx.stroke();
        // brillo diagonal
        var b = ctx.createLinearGradient(0, 0, TW, TH * 0.6);
        b.addColorStop(0, "rgba(255,255,255,0.22)");
        b.addColorStop(0.45, "rgba(255,255,255,0)");
        ctx.fillStyle = b;
        ctx.fillRect(0, 0, TW, TH);
        ctx.restore();
        // borde punteado dorado
        ctx.setLineDash([18, 14]);
        ctx.lineWidth = 7;
        ctx.strokeStyle = "#ffd43b";
        rr(ctx, 46, 46, TW - 92, TH - 92, r * 0.55);
        ctx.stroke();
        ctx.setLineDash([]);
        // luna
        ctx.fillStyle = "#fff3bf";
        ctx.beginPath();
        ctx.arc(TW * 0.78, TH * 0.17, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6f5df0";
        ctx.beginPath();
        ctx.arc(TW * 0.78 + 16, TH * 0.17 - 10, 30, 0, Math.PI * 2);
        ctx.fill();
        // estrella grande del centro
        ctx.save();
        ctx.shadowColor = "rgba(255, 212, 59, 0.9)";
        ctx.shadowBlur = 36;
        estrella(ctx, TW / 2, TH / 2 + 6, TW * 0.27, TW * 0.12, 5, 0);
        var ge = ctx.createLinearGradient(0, TH / 2 - TW * 0.27, 0, TH / 2 + TW * 0.27);
        ge.addColorStop(0, "#fff3a3");
        ge.addColorStop(1, "#fab005");
        ctx.fillStyle = ge;
        ctx.fill();
        ctx.restore();
        ctx.lineWidth = 10;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#ffffff";
        estrella(ctx, TW / 2, TH / 2 + 6, TW * 0.27, TW * 0.12, 5, 0);
        ctx.stroke();
        // ojitos y sonrisa de la estrella
        ctx.fillStyle = "#7a4a00";
        ctx.beginPath();
        ctx.arc(TW / 2 - 22, TH / 2 + 4, 8, 0, Math.PI * 2);
        ctx.arc(TW / 2 + 22, TH / 2 + 4, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#7a4a00";
        ctx.beginPath();
        ctx.arc(TW / 2, TH / 2 + 18, 16, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        // destellos de las esquinas
        ctx.fillStyle = "#ffffff";
        [[0.2, 0.83], [0.82, 0.86], [0.18, 0.2]].forEach(function (p) {
            estrella(ctx, TW * p[0], TH * p[1], 22, 6, 4, 0);
            ctx.fill();
        });
        return c;
    }

    /** Cara de una tarjeta: ilustración grande y su nombre abajo. */
    function texturaFrente(tipo, img) {
        var c = lienzo(TW, TH);
        var ctx = c.getContext("2d");
        var r = TW * 0.09;
        rr(ctx, 6, 6, TW - 12, TH - 12, r);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        rr(ctx, 22, 22, TW - 44, TH - 44, r * 0.75);
        ctx.fillStyle = tipo.fondo || "#fff4e6";
        ctx.fill();
        ctx.lineWidth = 14;
        ctx.strokeStyle = tipo.borde || "#f08c00";
        rr(ctx, 29, 29, TW - 58, TH - 58, r * 0.7);
        ctx.stroke();
        // círculo de luz detrás del dibujo
        var cy = TH * 0.42;
        var g = ctx.createRadialGradient(TW / 2, cy, 10, TW / 2, cy, TW * 0.42);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(TW / 2, cy, TW * 0.42, 0, Math.PI * 2);
        ctx.fill();
        // estrellitas decorativas
        ctx.fillStyle = tipo.borde || "#f08c00";
        ctx.globalAlpha = 0.45;
        [[0.16, 0.12, 16], [0.86, 0.15, 12], [0.13, 0.66, 11], [0.88, 0.62, 15]].forEach(function (p) {
            estrella(ctx, TW * p[0], TH * p[1], p[2], p[2] * 0.42, 5, 0);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        if (img) {
            var s = TW * 0.74;
            ctx.save();
            ctx.shadowColor = "rgba(92,59,30,0.25)";
            ctx.shadowBlur = 14;
            ctx.shadowOffsetY = 8;
            ctx.drawImage(img, (TW - s) / 2, cy - s / 2, s, s);
            ctx.restore();
        }
        // nombre en una cinta
        var ny = TH * 0.835;
        rr(ctx, TW * 0.16, ny - 50, TW * 0.68, 100, 50);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = tipo.borde || "#f08c00";
        ctx.stroke();
        ctx.font = '700 72px "Fredoka", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1c3f6e";
        ctx.fillText(String(tipo.nombre || tipo.id).toUpperCase(), TW / 2, ny + 4);
        return c;
    }

    /** Marco dorado que se enciende sobre una pareja encontrada. */
    function texturaMarco() {
        var c = lienzo(TW, TH);
        var ctx = c.getContext("2d");
        var r = TW * 0.09;
        var g = ctx.createLinearGradient(0, 0, TW, TH);
        g.addColorStop(0, "#fff3a3");
        g.addColorStop(0.35, "#ffd43b");
        g.addColorStop(0.65, "#f59f00");
        g.addColorStop(1, "#ffe066");
        ctx.lineWidth = 26;
        ctx.strokeStyle = g;
        rr(ctx, 14, 14, TW - 28, TH - 28, r);
        ctx.stroke();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        rr(ctx, 30, 30, TW - 60, TH - 60, r * 0.8);
        ctx.stroke();
        // estrellas doradas en las esquinas
        [[40, 40], [TW - 40, 40], [40, TH - 40], [TW - 40, TH - 40]].forEach(function (p) {
            ctx.fillStyle = "#ffd43b";
            estrella(ctx, p[0], p[1], 34, 14, 5, 0);
            ctx.fill();
            ctx.lineWidth = 5;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();
        });
        return c;
    }

    function texturaHalo(clave, color) {
        var s = 256;
        var c = lienzo(s, s);
        var ctx = c.getContext("2d");
        var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, color.replace("A", "0.95"));
        g.addColorStop(0.45, color.replace("A", "0.45"));
        g.addColorStop(1, color.replace("A", "0"));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        ponerTextura(clave, c);
    }

    function texturasFx() {
        texturaHalo("fx-halo-oro", "rgba(255,200,40,A)");
        texturaHalo("fx-halo-luz", "rgba(255,255,255,A)");
        texturaHalo("fx-halo-azul", "rgba(130,230,255,A)");
        var c = lienzo(64, 64);
        var ctx = c.getContext("2d");
        estrella(ctx, 32, 32, 30, 13, 5, 0);
        ctx.fillStyle = "#ffd43b";
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ponerTextura("fx-estrella", c);
        c = lienzo(48, 48);
        ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        estrella(ctx, 24, 24, 23, 5, 4, 0);
        ctx.fill();
        ponerTextura("fx-chispa", c);
        c = lienzo(24, 24);
        ctx = c.getContext("2d");
        var g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.4, "rgba(255,244,190,0.7)");
        g.addColorStop(1, "rgba(255,244,190,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 24, 24);
        ponerTextura("fx-brillo", c);
        // huella luminosa (pie izquierdo; el derecho se dibuja espejado)
        c = lienzo(64, 96);
        ctx = c.getContext("2d");
        // turquesa con borde blanco y resplandor: se ve sobre el corcho y sobre la tarjeta clara del pie
        var formaHuella = function () {
            ctx.beginPath();
            ctx.ellipse(34, 60, 16, 27, 0.12, 0, Math.PI * 2);
            [[18, 23, 7.5], [31, 16, 5.8], [42, 16, 5.3], [51, 21, 4.8], [57, 30, 4.3]].forEach(function (d) {
                ctx.moveTo(d[0] + d[2], d[1]);
                ctx.arc(d[0], d[1], d[2], 0, Math.PI * 2);
            });
        };
        ctx.shadowColor = "rgba(21, 170, 191, 0.9)";
        ctx.shadowBlur = 9;
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#ffffff";
        formaHuella();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#15aabf";
        formaHuella();
        ctx.fill();
        ponerTextura("fx-huella", c);
        // marca de aplauso (tres rayitas)
        c = lienzo(64, 64);
        ctx = c.getContext("2d");
        ctx.strokeStyle = "#ffffff";
        ctx.lineCap = "round";
        ctx.lineWidth = 7;
        ctx.shadowColor = "rgba(255, 180, 0, 0.9)";
        ctx.shadowBlur = 6;
        [[-0.5, 30], [0, 34], [0.5, 30]].forEach(function (d) {
            var a = -Math.PI / 2 + d[0];
            ctx.beginPath();
            ctx.moveTo(32 + Math.cos(a) * 10, 52 + Math.sin(a) * 10);
            ctx.lineTo(32 + Math.cos(a) * d[1], 52 + Math.sin(a) * d[1]);
            ctx.stroke();
        });
        ponerTextura("fx-clap", c);
        // chinche roja
        c = lienzo(60, 60);
        ctx = c.getContext("2d");
        ctx.fillStyle = "rgba(60,30,10,0.3)";
        ctx.beginPath();
        ctx.ellipse(33, 38, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        var gp = ctx.createRadialGradient(24, 22, 2, 30, 28, 22);
        gp.addColorStop(0, "#ffa8a8");
        gp.addColorStop(0.5, "#fa5252");
        gp.addColorStop(1, "#c92a2a");
        ctx.fillStyle = gp;
        ctx.beginPath();
        ctx.arc(30, 28, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.beginPath();
        ctx.ellipse(23, 20, 6, 4, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ponerTextura("fx-chinche", c);
    }

    /** Tablero: marco de madera, corcho moteado y calcomanías de estrellas en los lados. */
    function texturaTablero(w, h, f, zonaCartas) {
        var c = lienzo(w * RES, h * RES);
        var ctx = c.getContext("2d");
        ctx.scale(RES, RES);
        var r = Math.max(18, f * 1.3);
        ctx.save();
        ctx.shadowColor = "rgba(70, 35, 10, 0.35)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        rr(ctx, 6, 4, w - 12, h - 16, r);
        var gm = ctx.createLinearGradient(0, 0, 0, h);
        gm.addColorStop(0, "#d08a4c");
        gm.addColorStop(1, "#9c5a2c");
        ctx.fillStyle = gm;
        ctx.fill();
        ctx.restore();
        // vetas de la madera
        var rnd = azar(9);
        ctx.save();
        rr(ctx, 6, 4, w - 12, h - 16, r);
        ctx.clip();
        ctx.strokeStyle = "rgba(90, 45, 15, 0.22)";
        ctx.lineWidth = 2;
        for (var i = 0; i < 26; i++) {
            var yv = 4 + rnd() * (h - 16);
            ctx.beginPath();
            ctx.moveTo(0, yv);
            ctx.bezierCurveTo(w * 0.3, yv + (rnd() - 0.5) * 12, w * 0.7, yv + (rnd() - 0.5) * 12, w, yv + (rnd() - 0.5) * 8);
            ctx.stroke();
        }
        ctx.restore();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(255, 220, 170, 0.6)";
        rr(ctx, 10, 8, w - 20, h - 24, r * 0.92);
        ctx.stroke();
        // corcho
        var cx = 6 + f;
        var cy = 4 + f;
        var cw = w - 12 - 2 * f;
        var ch = h - 16 - 2 * f;
        var rc = Math.max(10, r * 0.55);
        rr(ctx, cx, cy, cw, ch, rc);
        ctx.fillStyle = "#d9a467";
        ctx.fill();
        ctx.save();
        rr(ctx, cx, cy, cw, ch, rc);
        ctx.clip();
        var colores = ["#b9793f", "#c88a4f", "#ebc28a", "#a86a34", "#f2d09e"];
        var n = Math.min(9000, Math.round((cw * ch) / 70));
        for (var k = 0; k < n; k++) {
            ctx.fillStyle = colores[Math.floor(rnd() * colores.length)];
            ctx.globalAlpha = 0.35 + rnd() * 0.5;
            ctx.beginPath();
            ctx.arc(cx + rnd() * cw, cy + rnd() * ch, 0.6 + rnd() * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // luz suave al centro y sombra interior arriba
        var gl = ctx.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, Math.max(cw, ch) * 0.65);
        gl.addColorStop(0, "rgba(255, 245, 220, 0.35)");
        gl.addColorStop(1, "rgba(255, 245, 220, 0)");
        ctx.fillStyle = gl;
        ctx.fillRect(cx, cy, cw, ch);
        var gs = ctx.createLinearGradient(0, cy, 0, cy + 26);
        gs.addColorStop(0, "rgba(80, 40, 10, 0.35)");
        gs.addColorStop(1, "rgba(80, 40, 10, 0)");
        ctx.fillStyle = gs;
        ctx.fillRect(cx, cy, cw, 26);
        // calcomanías: estrellas de colores y papelitos, solo fuera de la zona de las tarjetas
        var tonos = ["#ffd43b", "#ff8cc6", "#74c0fc", "#8ce99a", "#ffa94d", "#b197fc"];
        var puestas = 0;
        var tam = Math.max(14, Math.min(cw, ch) * 0.045);
        for (var t = 0; t < 400 && puestas < 16; t++) {
            var px = cx + tam * 1.5 + rnd() * (cw - tam * 3);
            var py = cy + tam * 1.5 + rnd() * (ch - tam * 3);
            var m = tam * 1.8;
            if (px > zonaCartas.x - m && px < zonaCartas.x + zonaCartas.w + m && py > zonaCartas.y - m && py < zonaCartas.y + zonaCartas.h + m) continue;
            var s = tam * (0.7 + rnd() * 0.7);
            var col = tonos[puestas % tonos.length];
            ctx.save();
            ctx.shadowColor = "rgba(60,30,10,0.3)";
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            if (puestas % 4 === 3) {
                ctx.translate(px, py);
                ctx.rotate((rnd() - 0.5) * 0.6);
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.9;
                ctx.fillRect(-s * 0.9, -s * 0.6, s * 1.8, s * 1.2);
            } else {
                estrella(ctx, px, py, s, s * 0.45, 5, (rnd() - 0.5) * 0.6);
                ctx.fillStyle = col;
                ctx.fill();
                ctx.shadowColor = "transparent";
                ctx.lineWidth = Math.max(2, s * 0.16);
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();
            }
            ctx.restore();
            puestas++;
        }
        ctx.restore();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(90, 45, 15, 0.45)";
        rr(ctx, cx, cy, cw, ch, rc);
        ctx.stroke();
        return c;
    }

    // ------------------------------------------------------------------ tarjetas

    function crearCarta(i) {
        var ext = sc.add.container(0, 0);
        var cuerpo = sc.add.container(0, 0);
        var volteo = sc.add.container(0, 0);
        var haloOro = sc.add.image(0, 0, "fx-halo-oro").setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
        var haloLuz = sc.add.image(0, 0, "fx-halo-luz").setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
        var sombra = sc.add.graphics();
        var img = sc.add.image(0, 0, "carta-reverso");
        var marco = sc.add.image(0, 0, "carta-marco").setVisible(false);
        // la sombra gira con la tarjeta (si no, a mitad del giro se ve como una caja oscura detrás)
        volteo.add([sombra, img, marco]);
        cuerpo.add([haloOro, haloLuz, volteo]);
        var chinche = sc.add.image(0, 0, "fx-chinche");
        ext.add([cuerpo, chinche]);
        ext.setDepth(10);
        ext.setVisible(false);
        return {
            i: i, ext: ext, cuerpo: cuerpo, volteo: volteo, img: img, marco: marco, sombra: sombra,
            haloOro: haloOro, haloLuz: haloLuz, chinche: chinche,
            tipo: null, abierta: false, dorada: false, x: 0, y: 0, w: 100, h: 125
        };
    }

    function medirCarta(c) {
        var k = c.w / TW;
        c.img.setScale(k);
        c.marco.setScale(k);
        c.haloOro.setScale((c.w * 1.9) / 256, (c.h * 1.65) / 256);
        c.haloLuz.setScale((c.w * 1.7) / 256, (c.h * 1.5) / 256);
        c.chinche.setScale(Math.max(0.45, c.w * 0.16 / 60));
        c.chinche.setPosition(0, -c.h / 2 + c.h * 0.015);
        c.sombra.clear();
        c.sombra.fillStyle(0x5c3b1e, 0.28);
        c.sombra.fillRoundedRect(-c.w / 2 + 4, -c.h / 2 + 10, c.w, c.h, c.w * 0.09);
    }

    function reacomodar() {
        if (!sc) return;
        var W = sc.scale.width;
        var H = sc.scale.height;
        if (W < 10 || H < 10) return;
        var m = Math.max(6, Math.min(18, W * 0.012));
        var bh = H - m * 1.2;
        var bw = Math.min(W - 2 * m, bh * 1.62);
        var bx = (W - bw) / 2;
        var by = m * 0.4;
        var f = Math.max(12, Math.min(28, Math.min(bw, bh) * 0.035));
        var innerW = bw - 12 - 2 * f;
        var innerH = bh - 16 - 2 * f;
        var padY = innerH * 0.055;
        var gapY = innerH * 0.05;
        var ch = (innerH - 2 * padY - gapY) / 2;
        var cw = ch * PROP;
        var gapX = Math.max(gapY * 1.4, innerW * 0.05);
        if (2 * cw + gapX > innerW * 0.94) {
            cw = (innerW * 0.94 - gapX) / 2;
            ch = cw / PROP;
        }
        var cx0 = bx + bw / 2;
        var cy0 = by + 4 + f + innerH / 2;
        lay = {
            W: W, H: H, bx: bx, by: by, bw: bw, bh: bh, f: f, cw: cw, ch: ch, gapX: gapX, gapY: gapY,
            cx: cx0, cy: cy0,
            zona: { x: cx0 - cw - gapX / 2, y: cy0 - ch - gapY / 2, w: 2 * cw + gapX, h: 2 * ch + gapY }
        };
        var zonaLocal = { x: lay.zona.x - bx, y: lay.zona.y - by, w: lay.zona.w, h: lay.zona.h };
        ponerTextura("tablero", texturaTablero(bw, bh, f, zonaLocal));
        if (!tableroImg) {
            tableroImg = sc.add.image(0, 0, "tablero").setOrigin(0, 0).setDepth(0);
        } else {
            tableroImg.setTexture("tablero");
        }
        tableroImg.setPosition(bx, by);
        tableroImg.setScale(1 / RES);
        cartas.forEach(function (c, i) {
            var col = i % 2;
            var fil = Math.floor(i / 2);
            c.w = cw;
            c.h = ch;
            c.x = cx0 + (col === 0 ? -1 : 1) * (cw / 2 + gapX / 2);
            c.y = cy0 + (fil === 0 ? -1 : 1) * (ch / 2 + gapY / 2);
            sc.tweens.killTweensOf(c.ext);
            c.ext.setPosition(c.x, c.y);
            c.ext.setAlpha(1);
            medirCarta(c);
        });
        if (cuentaG) dibujarCuenta(cuentaG.__valor || 0, cuentaG.__num || "");
    }

    function cartaEn(x, y) {
        for (var i = 0; i < cartas.length; i++) {
            var c = cartas[i];
            if (!c.ext.visible) continue;
            if (Math.abs(x - c.x) <= c.w / 2 && Math.abs(y - c.y) <= c.h / 2) return i;
        }
        return -1;
    }

    function aPantalla(x, y) {
        var r = sc.game.canvas.getBoundingClientRect();
        return { x: r.left + x * (r.width / sc.scale.width), y: r.top + y * (r.height / sc.scale.height) };
    }

    function puntoCarta(i) {
        var c = cartas[i];
        return c ? aPantalla(c.x, c.y) : null;
    }

    /** Hueco a la izquierda de las tarjetas (en pantalla), donde se para Zeus durante la presentación y la demo. */
    function zonaGuia() {
        if (!lay) return null;
        var a = aPantalla(0, lay.by + lay.f);
        var b = aPantalla(lay.zona.x - lay.gapX * 0.6, lay.by + lay.bh - lay.f);
        return { left: a.x, top: a.y, right: b.x, bottom: b.y, width: b.x - a.x, height: b.y - a.y };
    }

    function zonaTablero() {
        if (!lay) return null;
        var a = aPantalla(lay.bx, lay.by);
        var b = aPantalla(lay.bx + lay.bw, lay.by + lay.bh);
        return { left: a.x, top: a.y, right: b.x, bottom: b.y, width: b.x - a.x, height: b.y - a.y };
    }

    // ------------------------------------------------------------------ entrada de datos (ratón y dedo)

    function cursor(valor) {
        if (sc && sc.game && sc.game.canvas) sc.game.canvas.style.cursor = valor;
    }

    function puedeResaltar(i) {
        return habilitado && i >= 0 && typeof cb.puedeResaltar === "function" && cb.puedeResaltar(i);
    }

    function actualizarHover(i) {
        if (i === hover) return;
        if (hover >= 0) resaltar(hover, false);
        hover = i;
        if (hover >= 0) resaltar(hover, true);
        cursor(hover >= 0 ? "pointer" : "default");
    }

    function enlazarEntrada() {
        sc.input.on("pointerdown", function (p) {
            if (!habilitado) return;
            var i = cartaEn(p.x, p.y);
            if (i < 0) return;
            if (typeof cb.alTocar === "function") cb.alTocar(i);
        });
        sc.input.on("pointermove", function (p) {
            var i = cartaEn(p.x, p.y);
            actualizarHover(puedeResaltar(i) ? i : -1);
        });
        sc.input.on("pointerup", function (p) {
            // con el dedo no hay "pasar por encima": se quita el resaltado al levantarlo
            if (p.wasTouch) actualizarHover(-1);
        });
        sc.input.on("gameout", function () { actualizarHover(-1); });
    }

    // ------------------------------------------------------------------ animaciones de las tarjetas

    function base(c) {
        sc.tweens.killTweensOf(c.cuerpo);
        c.cuerpo.setScale(1);
        c.cuerpo.setAngle(0);
        c.cuerpo.setPosition(0, 0);
    }

    function asignar(tipos) {
        tipos.forEach(function (t, i) {
            var c = cartas[i];
            if (!c) return;
            c.tipo = t;
            if (c.abierta) c.img.setTexture("carta-" + t);
        });
    }

    /** Las tarjetas caen desde arriba del tablero, una por una, boca abajo. */
    function entrar() {
        var paso = reducido() ? 0 : 160;
        cartas.forEach(function (c, i) {
            c.abierta = false;
            c.dorada = false;
            c.img.setTexture("carta-reverso");
            c.marco.setVisible(false);
            c.haloOro.setAlpha(0);
            base(c);
            c.ext.setVisible(true);
            if (reducido()) {
                c.ext.setPosition(c.x, c.y);
                return;
            }
            c.ext.setPosition(c.x, -c.h);
            c.ext.setAlpha(0);
            sc.tweens.add({
                targets: c.ext,
                y: c.y,
                alpha: 1,
                duration: 650,
                delay: i * paso,
                ease: "Back.easeOut",
                onStart: function () { sonar("aparece", { vol: 0.5 }); }
            });
        });
        return espera(paso * 3 + 700);
    }

    /** Cada tarjeta se ilumina y da un saltito, por turnos: "¡aquí están!". */
    function llamarAtencion() {
        if (reducido()) return espera(200);
        cartas.forEach(function (c, i) {
            sc.tweens.add({
                targets: c.haloLuz, alpha: { from: 0, to: 0.85 }, duration: 260, delay: i * 260, yoyo: true, hold: 120
            });
            sc.tweens.add({
                targets: c.cuerpo, scale: 1.08, y: -c.h * 0.05, duration: 220, delay: i * 260, yoyo: true, ease: "Sine.easeOut"
            });
            sc.time.delayedCall(i * 260 + 120, function () { chispas(c, 6, "fx-chispa", 0.5); });
        });
        return espera(4 * 260 + 600);
    }

    function voltear(i, abrir, ms) {
        var c = cartas[i];
        if (!c || !c.tipo) return Promise.resolve();
        if (c.abierta === abrir) return Promise.resolve();
        c.abierta = abrir;
        var dur = reducido() ? 120 : (ms || 560);
        return new Promise(function (resolve) {
            sc.tweens.killTweensOf(c.volteo);
            c.ext.setDepth(20);
            sc.tweens.add({
                targets: c.volteo,
                scaleX: 0,
                scaleY: 1.06,
                y: -c.h * 0.04,
                duration: dur * 0.45,
                ease: "Quad.easeIn",
                onComplete: function () {
                    // a mitad del giro (de canto) cambia la cara: así la ilustración nunca se ve invertida
                    c.img.setTexture(abrir ? "carta-" + c.tipo : "carta-reverso");
                    c.marco.setVisible(abrir && c.dorada);
                    sc.tweens.add({
                        targets: c.volteo,
                        scaleX: 1,
                        scaleY: 1,
                        y: 0,
                        duration: dur * 0.55,
                        ease: "Back.easeOut",
                        onComplete: function () {
                            c.ext.setDepth(10);
                            resolve();
                        }
                    });
                }
            });
        });
    }

    function voltearTodas(abrir, separacion) {
        var sep = separacion == null ? 110 : separacion;
        var ps = cartas.map(function (c, i) {
            return espera(i * sep).then(function () { return voltear(i, abrir); });
        });
        return Promise.all(ps);
    }

    function resaltar(i, encendido) {
        var c = cartas[i];
        if (!c) return;
        sc.tweens.killTweensOf(c.cuerpo);
        sc.tweens.add({
            targets: c.cuerpo,
            scale: encendido ? 1.05 : 1,
            y: encendido ? -c.h * 0.025 : 0,
            angle: 0,
            duration: 160,
            ease: "Sine.easeOut"
        });
        sc.tweens.killTweensOf(c.haloLuz);
        sc.tweens.add({ targets: c.haloLuz, alpha: encendido ? 0.45 : 0, duration: 160 });
    }

    /** Ayuda: las tarjetas cerradas se menean (no dice cuál es la pareja). */
    function menear(indices) {
        if (reducido()) return espera(100);
        (indices || []).forEach(function (i, n) {
            var c = cartas[i];
            if (!c) return;
            base(c);
            sc.tweens.add({
                targets: c.cuerpo,
                angle: { from: -5, to: 5 },
                duration: 110,
                delay: n * 120,
                yoyo: true,
                repeat: 2,
                ease: "Sine.easeInOut",
                onComplete: function () { c.cuerpo.setAngle(0); }
            });
            sc.tweens.add({ targets: c.haloLuz, alpha: { from: 0, to: 0.5 }, duration: 300, delay: n * 120, yoyo: true });
        });
        return espera(900);
    }

    /** Pareja distinta: un balanceo pequeño y suave, sin nada que parezca castigo. */
    function noSuave(a, b) {
        [a, b].forEach(function (i) {
            var c = cartas[i];
            if (!c) return;
            base(c);
            if (reducido()) return;
            sc.tweens.add({
                targets: c.cuerpo,
                angle: { from: -3, to: 3 },
                scale: 0.97,
                duration: 180,
                yoyo: true,
                repeat: 1,
                ease: "Sine.easeInOut",
                onComplete: function () {
                    c.cuerpo.setAngle(0);
                    c.cuerpo.setScale(1);
                }
            });
        });
    }

    // ------------------------------------------------------------------ efectos

    function chispas(c, n, tex, escala) {
        var k = Math.max(0.35, c.w / 260) * (escala || 1);
        for (var j = 0; j < n; j++) {
            var a = (Math.PI * 2 * j) / n + Math.random() * 0.5;
            var d = c.w * (0.45 + Math.random() * 0.35);
            var s = sc.add.image(c.x, c.y, tex).setDepth(40).setScale(k * 0.6).setAlpha(1);
            sc.tweens.add({
                targets: s,
                x: c.x + Math.cos(a) * d,
                y: c.y + Math.sin(a) * d * 1.1,
                scale: k * (0.9 + Math.random() * 0.5),
                angle: 140 + Math.random() * 120,
                alpha: 0,
                duration: 700 + Math.random() * 400,
                ease: "Cubic.easeOut",
                onComplete: function () { this.targets[0].destroy(); }
            });
        }
    }

    function estallidoOro(c) {
        chispas(c, 10, "fx-estrella", 1);
        chispas(c, 8, "fx-chispa", 0.8);
    }

    /** Manos: tres aplausos alegres (las tarjetas se aprietan y salen rayitas de palmada). */
    function aplausos(a, b) {
        var golpes = reducido() ? 1 : 3;
        for (var n = 0; n < golpes; n++) {
            (function (n) {
                sc.time.delayedCall(n * 420, function () {
                    sfx("aplauso");
                    [a, b].forEach(function (c) {
                        sc.tweens.add({
                            targets: c.cuerpo,
                            scaleX: 0.9,
                            scaleY: 1.06,
                            duration: 90,
                            yoyo: true,
                            ease: "Quad.easeOut"
                        });
                        [-1, 1].forEach(function (lado) {
                            var m = sc.add.image(c.x + lado * c.w * 0.42, c.y - c.h * 0.42, "fx-clap")
                                .setDepth(40).setAngle(lado * 35).setScale(Math.max(0.6, c.w / 220)).setAlpha(0);
                            sc.tweens.add({
                                targets: m, alpha: { from: 1, to: 0 }, y: m.y - c.h * 0.08, duration: 380,
                                onComplete: function () { m.destroy(); }
                            });
                        });
                    });
                });
            })(n);
        }
        return espera(golpes * 420 + 300);
    }

    /** Pies: huellitas luminosas que caminan alrededor de las dos tarjetas y las tarjetas dan pasitos. */
    function huellas(a, b) {
        var pasos = reducido() ? 4 : 10;
        [a, b].forEach(function (c) {
            for (var n = 0; n < pasos; n++) {
                (function (n) {
                    sc.time.delayedCall(n * 170, function () {
                        // recorrido por el borde de la tarjeta, en el sentido del reloj
                        var t = n / pasos;
                        var ang = -Math.PI / 2 + t * Math.PI * 2;
                        var rx = c.w * 0.62;
                        var ry = c.h * 0.6;
                        var lado = n % 2 === 0 ? -1 : 1;
                        var px = c.x + Math.cos(ang) * rx + Math.cos(ang) * lado * 6;
                        var py = c.y + Math.sin(ang) * ry + Math.sin(ang) * lado * 6;
                        var h = sc.add.image(px, py, "fx-huella").setDepth(40)
                            .setScale(Math.max(0.35, c.w / 520)).setAlpha(0)
                            // la huella apunta hacia arriba; se gira hacia donde avanza (tangente del recorrido)
                            .setAngle(Phaser.Math.RadToDeg(ang + Math.PI));
                        if (lado > 0) h.setFlipX(true);
                        sc.tweens.add({ targets: h, alpha: 1, duration: 120 });
                        sc.tweens.add({
                            targets: h, alpha: 0, delay: 900, duration: 500,
                            onComplete: function () { h.destroy(); }
                        });
                        if (c === a) sfx("paso");
                    });
                })(n);
            }
            if (!reducido()) {
                sc.tweens.add({
                    targets: c.cuerpo,
                    y: -c.h * 0.04,
                    angle: { from: -4, to: 4 },
                    duration: 170,
                    yoyo: true,
                    repeat: 3,
                    ease: "Sine.easeInOut",
                    onComplete: function () {
                        c.cuerpo.setAngle(0);
                        c.cuerpo.setY(0);
                    }
                });
            }
        });
        return espera(pasos * 170 + 800);
    }

    /** Las demás partes (ojos, nariz, boca, oreja, cabeza, brazo): dos saltos alegres con chispas. */
    function saltitos(a, b) {
        var veces = reducido() ? 1 : 2;
        [a, b].forEach(function (c, k) {
            for (var n = 0; n < veces; n++) {
                (function (n) {
                    sc.time.delayedCall(n * 420 + k * 120, function () {
                        if (k === 0) sfx("paso");
                        chispas(c, 6, "fx-chispa", 0.7);
                        sc.tweens.add({
                            targets: c.cuerpo,
                            y: -c.h * 0.08,
                            scale: 1.05,
                            duration: 180,
                            yoyo: true,
                            ease: "Quad.easeOut",
                            onComplete: function () {
                                c.cuerpo.setY(0);
                                c.cuerpo.setScale(1);
                            }
                        });
                    });
                })(n);
            }
        });
        return espera(veces * 420 + 400);
    }

    /**
     * Pareja encontrada: las dos tarjetas se iluminan en dorado (halo y marco), estallan estrellas y luego
     * celebran según su tipo (manos: aplausos; pies: huellitas).
     */
    function pareja(a, b, tipo) {
        var ca = cartas[a];
        var cb2 = cartas[b];
        [ca, cb2].forEach(function (c) {
            c.dorada = true;
            base(c);
            c.marco.setVisible(true).setAlpha(0);
            sc.tweens.add({ targets: c.marco, alpha: 1, duration: 300 });
            sc.tweens.killTweensOf(c.haloOro);
            sc.tweens.add({ targets: c.haloOro, alpha: { from: 0, to: 0.95 }, duration: 320 });
            sc.tweens.add({ targets: c.haloOro, alpha: 0.55, delay: 360, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            sc.tweens.add({ targets: c.cuerpo, scale: 1.08, duration: 220, yoyo: true, ease: "Back.easeOut" });
            estallidoOro(c);
        });
        return espera(500).then(function () {
            if (tipo === "pie" || tipo === "pierna") return huellas(ca, cb2);
            if (tipo === "mano") return aplausos(ca, cb2);
            return saltitos(ca, cb2);
        });
    }

    /** Final: las cuatro tarjetas bailan en ola y llueven estrellas doradas sobre el tablero. */
    function celebrarFinal() {
        finalActivo = true;
        cartas.forEach(function (c, i) {
            base(c);
            if (reducido()) return;
            sc.tweens.add({
                targets: c.cuerpo,
                y: -c.h * 0.06,
                angle: { from: -5, to: 5 },
                duration: 360,
                delay: i * 140,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
            estallidoOro(c);
        });
        sfx("acorde");
        if (lluviaEvt) lluviaEvt.remove(false);
        lluviaEvt = sc.time.addEvent({
            delay: reducido() ? 600 : 120,
            loop: true,
            callback: function () {
                if (!finalActivo || !lay) return;
                var x = lay.bx + lay.f + Math.random() * (lay.bw - 2 * lay.f);
                var s = sc.add.image(x, lay.by - 10, Math.random() < 0.7 ? "fx-estrella" : "fx-chispa")
                    .setDepth(40).setScale(0.4 + Math.random() * 0.5).setAlpha(0.95);
                sc.tweens.add({
                    targets: s,
                    y: lay.by + lay.bh * (0.6 + Math.random() * 0.4),
                    x: x + (Math.random() - 0.5) * 80,
                    angle: 360,
                    alpha: 0,
                    duration: 1800 + Math.random() * 900,
                    ease: "Sine.easeIn",
                    onComplete: function () { s.destroy(); }
                });
            }
        });
    }

    function detenerFinal() {
        finalActivo = false;
        if (lluviaEvt) {
            lluviaEvt.remove(false);
            lluviaEvt = null;
        }
        cartas.forEach(base);
    }

    /** Reinicio: se apagan los dorados y todas las tarjetas vuelven boca abajo. */
    function reiniciar() {
        detenerFinal();
        cartas.forEach(function (c) {
            c.dorada = false;
            sc.tweens.killTweensOf(c.haloOro);
            sc.tweens.add({ targets: c.haloOro, alpha: 0, duration: 250 });
            sc.tweens.add({ targets: c.marco, alpha: 0, duration: 250 });
        });
        return voltearTodas(false, 90).then(function () {
            cartas.forEach(function (c) { c.marco.setVisible(false).setAlpha(1); });
        });
    }

    // ------------------------------------------------------------------ cuenta regresiva de la vista previa

    function dibujarCuenta(valor, num) {
        if (!cuentaG || !lay) return;
        cuentaG.__valor = valor;
        cuentaG.__num = num;
        var r = Math.max(26, Math.min(lay.cw, lay.ch) * 0.17);
        var x = lay.cx;
        var y = lay.cy;
        cuentaG.clear();
        cuentaG.fillStyle(0x5c3b1e, 0.25);
        cuentaG.fillCircle(x + 2, y + 5, r + 6);
        cuentaG.fillStyle(0xffffff, 1);
        cuentaG.fillCircle(x, y, r + 6);
        cuentaG.lineStyle(Math.max(6, r * 0.22), 0xe9ecef, 1);
        cuentaG.beginPath();
        cuentaG.arc(x, y, r - r * 0.08, 0, Math.PI * 2);
        cuentaG.strokePath();
        if (valor > 0) {
            cuentaG.lineStyle(Math.max(6, r * 0.22), 0xfab005, 1);
            cuentaG.beginPath();
            cuentaG.arc(x, y, r - r * 0.08, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * valor, false);
            cuentaG.strokePath();
        }
        cuentaTxt.setText(String(num));
        cuentaTxt.setFontSize(Math.round(r * 1.05) + "px");
        cuentaTxt.setPosition(x, y + 2);
    }

    /** Círculo con 3, 2, 1 en el centro del tablero mientras se ven las tarjetas. Resuelve al terminar. */
    function cuenta(ms) {
        var total = Math.max(500, ms || 3000);
        var segundos = Math.round(total / 1000);
        cuentaG.setVisible(true).setAlpha(1);
        cuentaTxt.setVisible(true).setAlpha(1);
        var t0 = sc.time.now;
        var ultimo = null;
        return new Promise(function (resolve) {
            var evt = sc.time.addEvent({
                delay: 30,
                loop: true,
                callback: function () {
                    var u = Math.min(1, (sc.time.now - t0) / total);
                    var n = Math.max(1, Math.ceil(segundos * (1 - u)));
                    if (n !== ultimo) {
                        ultimo = n;
                        sonar("tic", { vol: 0.6 });
                        sc.tweens.add({ targets: cuentaTxt, scale: { from: 1.4, to: 1 }, duration: 260, ease: "Back.easeOut" });
                    }
                    dibujarCuenta(1 - u, n);
                    if (u >= 1) {
                        evt.remove(false);
                        sc.tweens.add({
                            targets: [cuentaG, cuentaTxt], alpha: 0, duration: 220,
                            onComplete: function () {
                                cuentaG.setVisible(false);
                                cuentaTxt.setVisible(false);
                                resolve();
                            }
                        });
                    }
                }
            });
        });
    }

    // ------------------------------------------------------------------ brillos que flotan sobre el tablero

    function crearBrillos() {
        for (var i = 0; i < 16; i++) {
            var b = sc.add.image(0, 0, "fx-brillo").setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
            b.__fase = Math.random() * Math.PI * 2;
            b.__vel = 0.012 + Math.random() * 0.02;
            b.__u = Math.random();
            b.__v = Math.random();
            brillos.push(b);
        }
    }

    function moverBrillos(time, delta) {
        if (!lay) return;
        var d = Math.min(64, delta || 16) / 16;
        brillos.forEach(function (b) {
            b.__v -= b.__vel * 0.02 * d;
            if (b.__v < 0) {
                b.__v = 1;
                b.__u = Math.random();
            }
            var x = lay.bx + lay.f + b.__u * (lay.bw - 2 * lay.f) + Math.sin(time / 900 + b.__fase) * 12;
            var y = lay.by + lay.f + b.__v * (lay.bh - 2 * lay.f);
            b.setPosition(x, y);
            b.setScale(0.7 + 0.5 * Math.sin(time / 500 + b.__fase));
            b.setAlpha(0.25 + 0.55 * Math.abs(Math.sin(time / 700 + b.__fase)));
        });
    }

    // ------------------------------------------------------------------ montaje

    function vigilarPosicion(el) {
        var renovar = function () { if (sc && sc.scale) sc.scale.updateBounds(); };
        ["pointerdown", "mousedown", "touchstart"].forEach(function (ev) {
            el.addEventListener(ev, renovar, { capture: true, passive: true });
        });
        if (typeof ResizeObserver === "function") {
            var ro = new ResizeObserver(renovar);
            ro.observe(document.body);
        }
        global.addEventListener("scroll", renovar, { passive: true });
    }

    function montar(el, config) {
        if (config) cfg = config;
        if (listoPromesa) return listoPromesa;
        if (!Phaser || !I || !cfg) {
            console.warn("[EscenarioMemorama] falta Phaser, IconosMemorama o config");
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
                input: { activePointers: 2 },
                scene: {
                    create: function () {
                        sc = this;
                        texturasFx();
                        // una cara por cada parte del catálogo (las rondas eligen de ahí)
                        var tipos = (cfg.partes || cfg.cartas || []);
                        Promise.all([fuenteLista()].concat(tipos.map(function (t) {
                            return cargarImagen(I.SVG[t.dibujo || t.id] || "");
                        }))).then(function (res) {
                            ponerTextura("carta-reverso", texturaReverso());
                            ponerTextura("carta-marco", texturaMarco());
                            tipos.forEach(function (t, k) { ponerTextura("carta-" + t.id, texturaFrente(t, res[k + 1])); });
                            crearBrillos();
                            for (var i = 0; i < 4; i++) cartas.push(crearCarta(i));
                            cuentaG = sc.add.graphics().setDepth(50).setVisible(false);
                            cuentaTxt = sc.add.text(0, 0, "3", {
                                fontFamily: '"Fredoka", sans-serif',
                                fontStyle: "700",
                                fontSize: "48px",
                                color: "#5f3dc4"
                            }).setOrigin(0.5).setDepth(51).setVisible(false);
                            reacomodar();
                            enlazarEntrada();
                            sc.scale.on("resize", reacomodar);
                            sc.events.on("update", moverBrillos);
                            vigilarPosicion(el);
                            resolve(true);
                        });
                    }
                }
            });
            global.__escenarioMemorama = juego;
        });
        return listoPromesa;
    }

    global.EscenarioMemorama = {
        montar: montar,
        listo: function () { return !!(sc && cartas.length === 4); },
        escena: function () { return sc; },
        diseno: function () { return lay; },
        reacomodar: reacomodar,
        enlazar: function (callbacks) { cb = callbacks || {}; },
        habilitar: function (si) {
            habilitado = !!si;
            if (!habilitado) actualizarHover(-1);
        },
        quitarResaltado: function () { actualizarHover(-1); },
        asignar: asignar,
        entrar: entrar,
        llamarAtencion: llamarAtencion,
        voltear: voltear,
        voltearTodas: voltearTodas,
        cuenta: cuenta,
        resaltar: resaltar,
        menear: menear,
        noSuave: noSuave,
        pareja: pareja,
        celebrarFinal: celebrarFinal,
        detenerFinal: detenerFinal,
        reiniciar: reiniciar,
        puntoCarta: puntoCarta,
        cartaEn: cartaEn,
        zonaTablero: zonaTablero,
        zonaGuia: zonaGuia,
        estadoCartas: function () {
            return cartas.map(function (c) { return { tipo: c.tipo, abierta: c.abierta, dorada: c.dorada }; });
        }
    };
})(window);
