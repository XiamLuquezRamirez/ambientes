/**
 * DibujosDiana — dibujos propios de "La Gran Diana de Estrellas" (window.DibujosDiana).
 *
 * Todo es SVG propio rasterizado UNA vez a <canvas> por preparar(); la escena los convierte en texturas.
 * Las piezas que cambian de color (bombillas, banderines, globos, neón, confeti, chispas) se dibujan en blanco y
 * Phaser las tiñe. La estrella dorada, la diana y los puestos llevan su color propio.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    function f1(n) { return (Math.round(n * 10) / 10).toString(); }

    function semilla(s) {
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    function puntosEstrella(cx, cy, r, ri, n) {
        var p = [];
        for (var i = 0; i < n * 2; i++) {
            var a = -Math.PI / 2 + i * Math.PI / n;
            var rr = i % 2 ? ri : r;
            p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
        }
        return p;
    }

    function rutaPuntos(p) {
        return p.map(function (q, i) { return (i ? "L" : "M") + f1(q[0]) + " " + f1(q[1]); }).join(" ") + " Z";
    }

    // ------------------------------------------------------------------ la estrella dorada (objetivo)

    /** Estrella de cinco puntas tallada: cada punta tiene una cara clara y una oscura (volumen). */
    function estrellaDorada() {
        var c = 130, p = puntosEstrella(c, c, 118, 54, 5);
        var caras = "";
        for (var i = 0; i < p.length; i++) {
            var a = p[i], b = p[(i + 1) % p.length];
            // la punta (índice par) con la cara siguiente clara; luz desde arriba a la izquierda
            var luz = (i % 2 === 0) ? (i < 5 ? "#fff3a6" : "#ffd84d") : (i < 5 ? "#ffc61a" : "#f0a000");
            if (i === 8 || i === 9) luz = i === 9 ? "#fff0a0" : "#ffcf33";
            caras += '<path d="M' + c + " " + c + " L" + f1(a[0]) + " " + f1(a[1]) + " L" + f1(b[0]) + " " + f1(b[1]) + ' Z" fill="' + luz + '"/>';
        }
        return svg(260, 260,
            '<defs><radialGradient id="eb" cx="0.42" cy="0.36" r="0.7"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="0.5" stop-color="#fff6c2" stop-opacity="0.15"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<path d="' + rutaPuntos(puntosEstrella(c, c + 5, 120, 56, 5)) + '" fill="#a65a00" opacity="0.55" stroke="#a65a00" stroke-width="10" stroke-linejoin="round"/>' +
            '<path d="' + rutaPuntos(p) + '" fill="#ffc61a" stroke="#c97800" stroke-width="9" stroke-linejoin="round"/>' +
            caras +
            '<path d="' + rutaPuntos(p) + '" fill="url(#eb)"/>' +
            '<path d="' + rutaPuntos(p) + '" fill="none" stroke="#fff7c7" stroke-width="3" stroke-linejoin="round" opacity="0.9"/>' +
            '<ellipse cx="104" cy="92" rx="16" ry="9" fill="#ffffff" opacity="0.85" transform="rotate(-30 104 92)"/>' +
            '<circle cx="152" cy="112" r="4" fill="#ffffff" opacity="0.8"/>');
    }

    /** Halo dorado (resplandor) detrás de la estrella. */
    function halo() {
        return svg(400, 400,
            '<defs><radialGradient id="h"><stop offset="0" stop-color="#fff8d6" stop-opacity="1"/><stop offset="0.3" stop-color="#ffe066" stop-opacity="0.75"/><stop offset="0.6" stop-color="#ffb300" stop-opacity="0.25"/><stop offset="1" stop-color="#ff9900" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="200" cy="200" r="200" fill="url(#h)"/>');
    }

    /** Rayos que giran lentamente detrás de la estrella. */
    function rayos() {
        var d = "";
        for (var i = 0; i < 12; i++) {
            var a = i * Math.PI / 6, a1 = a - 0.09, a2 = a + 0.09;
            d += "M200 200 L" + f1(200 + Math.cos(a1) * 200) + " " + f1(200 + Math.sin(a1) * 200) + " L" + f1(200 + Math.cos(a2) * 200) + " " + f1(200 + Math.sin(a2) * 200) + " Z ";
        }
        return svg(400, 400,
            '<defs><radialGradient id="r"><stop offset="0.2" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<path d="' + d + '" fill="url(#r)"/>');
    }

    function flash() {
        return svg(256, 256,
            '<defs><radialGradient id="f"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="#ffffff" stop-opacity="0.8"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="128" cy="128" r="128" fill="url(#f)"/>' +
            '<path d="M128 6 L136 120 L250 128 L136 136 L128 250 L120 136 L6 128 L120 120 Z" fill="#ffffff" opacity="0.9"/>');
    }

    // ------------------------------------------------------------------ la diana

    /** Diana concéntrica: bordes oscuros entre bandas para que el neón resalte. Diseño: radio exterior 318. */
    function diana() {
        var c = 330;
        var anillo = function (r, a, b, id) {
            return '<radialGradient id="' + id + '" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>' + "|" + '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="url(#' + id + ')"/>';
        };
        var bandas = [
            anillo(298, "#ff9ad2", "#d4116f", "g1"),
            anillo(248, "#7ff7f0", "#0b9fb5", "g2"),
            anillo(208, "#d3a6ff", "#6d22d6", "g3")
        ];
        var defs = bandas.map(function (b) { return b.split("|")[0]; }).join("") +
            '<radialGradient id="g0" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#3a1f7a"/><stop offset="1" stop-color="#120733"/></radialGradient>' +
            '<radialGradient id="gc" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#40238c"/><stop offset="0.7" stop-color="#1f0d4d"/><stop offset="1" stop-color="#140838"/></radialGradient>' +
            '<linearGradient id="bv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/></linearGradient>';
        var cuerpo = '<circle cx="' + c + '" cy="' + (c + 10) + '" r="322" fill="#05011a" opacity="0.5"/>' +
            '<circle cx="' + c + '" cy="' + c + '" r="320" fill="url(#g0)" stroke="#ffd84a" stroke-width="4"/>' +
            bandas[0].split("|")[1] +
            '<circle cx="' + c + '" cy="' + c + '" r="252" fill="#1a0a40"/>' +
            bandas[1].split("|")[1] +
            '<circle cx="' + c + '" cy="' + c + '" r="212" fill="#1a0a40"/>' +
            bandas[2].split("|")[1] +
            '<circle cx="' + c + '" cy="' + c + '" r="178" fill="#1a0a40"/>' +
            '<circle cx="' + c + '" cy="' + c + '" r="172" fill="#ffc928"/>' +
            '<circle cx="' + c + '" cy="' + c + '" r="164" fill="url(#gc)"/>';
        // pequeñas estrellitas pintadas en las bandas
        var rnd = semilla(11);
        var deco = "";
        [[274, "#ffe3f3"], [230, "#e6fffd"], [193, "#f1e3ff"]].forEach(function (b, k) {
            var n = 12 - k * 2;
            for (var i = 0; i < n; i++) {
                var a = i * Math.PI * 2 / n + k * 0.3;
                var x = c + Math.cos(a) * b[0], y = c + Math.sin(a) * b[0];
                deco += '<path d="' + rutaPuntos(puntosEstrella(x, y, 7 + rnd() * 3, 3.2, 5)) + '" fill="' + b[1] + '" opacity="0.55"/>';
            }
        });
        // brillo de cristal arriba
        var vidrio = '<path d="M' + (c - 250) + " " + (c - 60) + " A260 260 0 0 1 " + (c + 250) + " " + (c - 60) + " A300 240 0 0 0 " + (c - 250) + " " + (c - 60) + ' Z" fill="url(#bv)"/>';
        return svg(660, 660, "<defs>" + defs + "</defs>" + cuerpo + deco + vidrio);
    }

    /** Anillo de neón blanco (se tiñe y se suma con ADD). Radio de la línea: 180 de 200. */
    function neon() {
        return svg(400, 400,
            '<defs><radialGradient id="n" cx="200" cy="200" r="200" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0.78" stop-color="#ffffff" stop-opacity="0"/>' +
            '<stop offset="0.86" stop-color="#ffffff" stop-opacity="0.28"/>' +
            '<stop offset="0.895" stop-color="#ffffff" stop-opacity="1"/>' +
            '<stop offset="0.905" stop-color="#ffffff" stop-opacity="1"/>' +
            '<stop offset="0.94" stop-color="#ffffff" stop-opacity="0.28"/>' +
            '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="200" cy="200" r="200" fill="url(#n)"/>');
    }

    /** Disco suave (luz del centro, brillo de puestos). */
    function luz() {
        return svg(200, 200,
            '<defs><radialGradient id="l"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="100" cy="100" r="100" fill="url(#l)"/>');
    }

    // ------------------------------------------------------------------ piezas pequeñas (blancas, se tiñen)

    function bombilla() {
        return svg(48, 48,
            '<defs><radialGradient id="b"><stop offset="0" stop-color="#ffffff"/><stop offset="0.32" stop-color="#ffffff"/><stop offset="0.42" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="24" cy="24" r="24" fill="url(#b)"/>');
    }

    function chispa() {
        return svg(40, 40,
            '<defs><radialGradient id="c"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#ffffff" stop-opacity="0.7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="20" cy="20" r="20" fill="url(#c)"/>' +
            '<path d="M20 2 L22 18 L38 20 L22 22 L20 38 L18 22 L2 20 L18 18 Z" fill="#ffffff"/>');
    }

    function estrellita() {
        return svg(48, 48,
            '<path d="' + rutaPuntos(puntosEstrella(24, 25, 22, 10, 5)) + '" fill="#ffffff" stroke="#e9ecef" stroke-width="2" stroke-linejoin="round"/>' +
            '<path d="' + rutaPuntos(puntosEstrella(21, 21, 8, 4, 5)) + '" fill="#ffffff" opacity="0.8"/>');
    }

    /** Hueco de progreso (estrella con borde). */
    function estrellaHueco() {
        return svg(64, 64,
            '<path d="' + rutaPuntos(puntosEstrella(32, 33, 29, 13, 5)) + '" fill="#2b1a5c" stroke="#8d7bd9" stroke-width="3.5" stroke-linejoin="round"/>');
    }

    function estrellaProgreso() {
        var p = puntosEstrella(32, 33, 29, 13, 5);
        return svg(64, 64,
            '<defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a6"/><stop offset="1" stop-color="#ffb700"/></linearGradient></defs>' +
            '<path d="' + rutaPuntos(p) + '" fill="url(#p)" stroke="#c97800" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<ellipse cx="25" cy="24" rx="5" ry="3" fill="#ffffff" opacity="0.8" transform="rotate(-30 25 24)"/>');
    }

    function confeti() {
        return svg(22, 12, '<rect x="1" y="1" width="20" height="10" rx="3" fill="#ffffff"/>');
    }

    function luna() {
        return svg(200, 200,
            '<defs><radialGradient id="lg"><stop offset="0.4" stop-color="#fff9db" stop-opacity="0.5"/><stop offset="1" stop-color="#fff9db" stop-opacity="0"/></radialGradient>' +
            '<mask id="lm"><rect width="200" height="200" fill="#fff"/><circle cx="124" cy="82" r="50" fill="#000"/></mask></defs>' +
            '<circle cx="100" cy="100" r="98" fill="url(#lg)"/>' +
            '<circle cx="100" cy="100" r="56" fill="#fff3bf" mask="url(#lm)"/>' +
            '<circle cx="78" cy="118" r="6" fill="#ffe8a1" mask="url(#lm)"/>' +
            '<circle cx="64" cy="94" r="4" fill="#ffe8a1" mask="url(#lm)"/>');
    }

    function banderin() {
        return svg(60, 74,
            '<defs><linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd6e6"/></linearGradient></defs>' +
            '<path d="M3 3 L57 3 L30 70 Z" fill="url(#bd)" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>' +
            '<path d="M3 3 L57 3 L54 10 L6 10 Z" fill="#ffffff" opacity="0.6"/>');
    }

    function globo() {
        return svg(90, 150,
            '<defs><radialGradient id="gl" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#eef1f8"/><stop offset="1" stop-color="#b9c3d9"/></radialGradient></defs>' +
            '<path d="M45 104 C45 118 38 126 46 136 C52 144 42 148 45 150" fill="none" stroke="#e9ecef" stroke-width="2"/>' +
            '<ellipse cx="45" cy="52" rx="40" ry="48" fill="url(#gl)"/>' +
            '<path d="M39 99 L51 99 L45 108 Z" fill="#d5dbe8"/>' +
            '<ellipse cx="31" cy="34" rx="9" ry="14" fill="#ffffff" opacity="0.85" transform="rotate(25 31 34)"/>');
    }

    // ------------------------------------------------------------------ la feria (con color propio)

    function cielo() {
        var rnd = semilla(7);
        var puntos = "";
        for (var i = 0; i < 110; i++) {
            var x = rnd() * 1600, y = rnd() * 520, r = 0.6 + rnd() * 1.6;
            puntos += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="#ffffff" opacity="' + f1(0.25 + rnd() * 0.55) + '"/>';
        }
        return svg(1600, 900,
            '<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070a2e"/><stop offset="0.45" stop-color="#1b1060"/><stop offset="0.72" stop-color="#3d1675"/><stop offset="1" stop-color="#160a3a"/></linearGradient>' +
            '<radialGradient id="neb" cx="0.5" cy="0.55" r="0.6"><stop offset="0" stop-color="#c2255c" stop-opacity="0.35"/><stop offset="1" stop-color="#c2255c" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="suelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f55"/><stop offset="1" stop-color="#0d0526"/></linearGradient></defs>' +
            '<rect width="1600" height="900" fill="url(#c)"/>' +
            '<ellipse cx="800" cy="560" rx="900" ry="380" fill="url(#neb)"/>' + puntos +
            '<path d="M0 740 Q800 700 1600 740 L1600 900 L0 900 Z" fill="url(#suelo)"/>' +
            '<path d="M0 740 Q800 700 1600 740" fill="none" stroke="#7048e8" stroke-width="3" opacity="0.5"/>');
    }

    /** Siluetas lejanas de la feria (carpas, torres, montaña rusa) para dar profundidad. */
    function fondoFeria() {
        var d = '<path d="M0 760 L0 610 Q60 560 120 610 L140 600 L180 520 L220 600 L260 610 L300 560 L340 610 L420 630 L460 540 L470 470 L480 540 L520 630 L1080 630 L1120 540 L1130 480 L1140 540 L1180 630 L1260 610 L1300 560 L1340 610 L1380 600 L1420 520 L1460 600 L1480 610 Q1540 560 1600 610 L1600 760 Z" fill="#2b1160"/>';
        // montaña rusa a la derecha
        d += '<path d="M1180 630 Q1250 470 1320 560 Q1380 640 1440 500 Q1500 380 1600 520" fill="none" stroke="#3b1a7a" stroke-width="10"/>';
        for (var x = 1200; x < 1600; x += 36) d += '<line x1="' + x + '" y1="630" x2="' + x + '" y2="560" stroke="#3b1a7a" stroke-width="5"/>';
        var rnd = semilla(3), luces = "";
        for (var i = 0; i < 60; i++) {
            var lx = rnd() * 1600, ly = 560 + rnd() * 150;
            if (lx > 420 && lx < 1180) ly = 610 + rnd() * 40;
            luces += '<circle cx="' + f1(lx) + '" cy="' + f1(ly) + '" r="' + f1(1.5 + rnd() * 2) + '" fill="' + ["#ffd43b", "#ff8cc6", "#66e0ff", "#ffffff"][i % 4] + '" opacity="0.7"/>';
        }
        return svg(1600, 760, d + luces);
    }

    /** Carpa de circo a rayas. */
    function carpa(a, b) {
        var rayas = "";
        for (var i = 0; i < 8; i++) {
            var x0 = 20 + i * 47.5, x1 = x0 + 47.5;
            rayas += '<path d="M210 70 L' + f1(x0) + ' 230 L' + f1(x1) + ' 230 Z" fill="' + (i % 2 ? a : b) + '"/>';
            rayas += '<rect x="' + f1(30 + i * 45) + '" y="230" width="45" height="140" fill="' + (i % 2 ? b : a) + '" opacity="0.92"/>';
        }
        var flecos = "";
        for (var k = 0; k < 13; k++) flecos += '<path d="M' + (20 + k * 29.2) + ' 230 Q' + (34.6 + k * 29.2) + " 258 " + (49.2 + k * 29.2) + ' 230 Z" fill="' + (k % 2 ? "#ffd43b" : "#ffffff") + '"/>';
        return svg(420, 380,
            '<path d="M210 8 L210 72" stroke="#e9ecef" stroke-width="5"/><path d="M212 10 L252 22 L212 34 Z" fill="#ffd43b"/>' +
            rayas + flecos +
            '<path d="M170 370 Q210 280 250 370 Z" fill="#1a0838"/>' +
            '<path d="M170 370 Q210 280 250 370" fill="none" stroke="#ffd43b" stroke-width="5"/>' +
            '<path d="M210 70 L20 230 L400 230 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" opacity="0.6"/>');
    }

    /** Puesto de feria: toldo a rayas, cartel con estrella, mostrador y premios (peluches) en los estantes. */
    function puesto(toldoA, toldoB, madera) {
        var toldo = "", ondas = "";
        for (var i = 0; i < 7; i++) {
            toldo += '<rect x="' + (10 + i * 40) + '" y="70" width="40" height="50" fill="' + (i % 2 ? toldoA : toldoB) + '"/>';
            ondas += '<path d="M' + (10 + i * 40) + ' 120 Q' + (30 + i * 40) + ' 146 ' + (50 + i * 40) + ' 120 Z" fill="' + (i % 2 ? toldoA : toldoB) + '"/>';
        }
        var premios = "";
        var cols = ["#ff8cc6", "#66e0ff", "#ffd43b", "#b197fc", "#8ce99a"];
        for (var k = 0; k < 5; k++) {
            var x = 52 + k * 50, y = 188;
            premios += '<circle cx="' + x + '" cy="' + y + '" r="16" fill="' + cols[k] + '"/><circle cx="' + (x - 11) + '" cy="' + (y - 13) + '" r="7" fill="' + cols[k] + '"/><circle cx="' + (x + 11) + '" cy="' + (y - 13) + '" r="7" fill="' + cols[k] + '"/>' +
                '<circle cx="' + (x - 5) + '" cy="' + (y - 2) + '" r="2.2" fill="#1a0838"/><circle cx="' + (x + 5) + '" cy="' + (y - 2) + '" r="2.2" fill="#1a0838"/>';
        }
        return svg(300, 330,
            '<defs><linearGradient id="fondo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe8a1"/><stop offset="1" stop-color="#ff922b"/></linearGradient></defs>' +
            '<rect x="22" y="110" width="256" height="200" fill="url(#fondo)"/>' +
            '<rect x="22" y="206" width="256" height="8" fill="' + madera + '"/>' +
            premios +
            '<rect x="10" y="110" width="16" height="210" fill="' + madera + '"/><rect x="274" y="110" width="16" height="210" fill="' + madera + '"/>' +
            '<rect x="4" y="240" width="292" height="84" rx="8" fill="' + madera + '"/>' +
            '<rect x="4" y="240" width="292" height="12" rx="6" fill="#ffffff" opacity="0.25"/>' +
            '<path d="M4 264 L296 264" stroke="#000" stroke-opacity="0.15" stroke-width="3"/>' +
            toldo + ondas +
            '<rect x="70" y="8" width="160" height="58" rx="16" fill="#2b1160" stroke="#ffd43b" stroke-width="5"/>' +
            '<path d="' + rutaPuntos(puntosEstrella(150, 38, 21, 9, 5)) + '" fill="#ffd43b"/>' +
            '<circle cx="98" cy="37" r="6" fill="#ff8cc6"/><circle cx="202" cy="37" r="6" fill="#66e0ff"/>');
    }

    function noriaRueda() {
        var d = '<circle cx="260" cy="260" r="240" fill="none" stroke="#9775fa" stroke-width="10"/>' +
            '<circle cx="260" cy="260" r="200" fill="none" stroke="#7048e8" stroke-width="5"/>';
        for (var i = 0; i < 12; i++) {
            var a = i * Math.PI / 6;
            d += '<line x1="260" y1="260" x2="' + f1(260 + Math.cos(a) * 240) + '" y2="' + f1(260 + Math.sin(a) * 240) + '" stroke="#7048e8" stroke-width="4"/>';
        }
        d += '<circle cx="260" cy="260" r="26" fill="#ffd43b" stroke="#e67700" stroke-width="5"/>';
        return svg(520, 520, d);
    }

    function cabina() {
        return svg(60, 64,
            '<line x1="30" y1="0" x2="30" y2="14" stroke="#adb5bd" stroke-width="4"/>' +
            '<path d="M6 18 Q30 6 54 18 L54 24 L6 24 Z" fill="#ffffff"/>' +
            '<rect x="8" y="24" width="44" height="34" rx="9" fill="#ffffff"/>' +
            '<rect x="15" y="30" width="30" height="14" rx="4" fill="#cfd6e6"/>');
    }

    function noriaBase() {
        return svg(400, 360,
            '<path d="M200 20 L40 350 M200 20 L360 350" stroke="#5f3dc4" stroke-width="16" stroke-linecap="round"/>' +
            '<path d="M95 240 L305 240" stroke="#5f3dc4" stroke-width="10"/>' +
            '<rect x="10" y="340" width="380" height="18" rx="9" fill="#3b1a7a"/>');
    }

    /** Mano que señala hacia arriba a la izquierda (guía del nivel 1; se queda al lado de la estrella). */
    function dedo() {
        return svg(150, 170,
            '<g transform="rotate(-40 75 85)">' +
            '<path d="M62 18 C62 6 82 6 82 18 L82 78 L92 74 C100 70 110 76 108 86 L116 84 C124 82 132 90 128 100 C138 100 142 110 138 120 C134 142 120 160 96 162 L70 162 C52 160 40 148 36 132 L28 104 C24 92 36 84 46 92 L62 106 Z" fill="#ffe3cf" stroke="#7a3d1a" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M82 78 L82 108 M108 86 L108 112 M128 100 L126 116" stroke="#7a3d1a" stroke-width="4" stroke-linecap="round"/>' +
            '<ellipse cx="72" cy="22" rx="6" ry="4" fill="#ffffff" opacity="0.7"/>' +
            '</g>');
    }

    // ------------------------------------------------------------------ lista y rasterizado

    function lista() {
        return [
            ["estrella", estrellaDorada(), 1.6],
            ["halo", halo(), 1],
            ["rayos", rayos(), 1],
            ["flash", flash(), 1.2],
            ["diana", diana(), 1.5],
            ["neon", neon(), 1.5],
            ["luz", luz(), 1],
            ["bombilla", bombilla(), 1.5],
            ["chispa", chispa(), 1.5],
            ["estrellita", estrellita(), 1.5],
            ["estrellaHueco", estrellaHueco(), 1.5],
            ["estrellaProgreso", estrellaProgreso(), 1.5],
            ["confeti", confeti(), 1.5],
            ["luna", luna(), 1.2],
            ["banderin", banderin(), 1.4],
            ["globo", globo(), 1.3],
            ["cielo", cielo(), 0.6],
            ["fondoFeria", fondoFeria(), 0.6],
            ["carpa", carpa("#e64980", "#ffffff"), 1],
            ["carpa2", carpa("#7950f2", "#ffe066"), 1],
            ["puesto", puesto("#ff4fa3", "#ffffff", "#8a3ffc"), 1.1],
            ["puesto2", puesto("#15aabf", "#ffffff", "#d6336c"), 1.1],
            ["noriaRueda", noriaRueda(), 1],
            ["noriaBase", noriaBase(), 1],
            ["cabina", cabina(), 1.4],
            ["dedo", dedo(), 1.4]
        ];
    }

    function rasterizar(clave, s, k) {
        return new Promise(function (resolve) {
            var img = new Image();
            var hecho = function (ok) {
                if (ok) {
                    var c = document.createElement("canvas");
                    c.width = Math.max(1, Math.round(img.width * k));
                    c.height = Math.max(1, Math.round(img.height * k));
                    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                    cache[clave] = c;
                    resoluciones[clave] = k;
                }
                resolve(ok);
            };
            img.onload = function () { hecho(true); };
            img.onerror = function () {
                console.warn("[DibujosDiana] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    global.DibujosDiana = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        svgEstrella: estrellaDorada,
        svgDiana: diana
    };
})(typeof window !== "undefined" ? window : global);
