/**
 * DibujosLluvia — dibujos propios de "La lluvia de colores y las flores del jardín" (window.DibujosLluvia).
 *
 * Todo es SVG propio rasterizado UNA vez a <canvas> por preparar(); la escena los convierte en texturas.
 * Las piezas que cambian de color (nubes, gotas, pétalos, alas de mariposa) se dibujan en blanco con sombras
 * grises suaves: Phaser las tiñe y conservan el volumen. Las caras y los centros de las flores no se tiñen.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    function semilla(s) {
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    function f1(n) { return (Math.round(n * 10) / 10).toString(); }

    /** Estrella redondeada de n puntas. */
    function rutaEstrella(cx, cy, r, ri, n) {
        var pts = [];
        for (var i = 0; i < n * 2; i++) {
            var a = -Math.PI / 2 + i * Math.PI / n;
            var rr = i % 2 ? ri : r;
            pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
        }
        var d = "";
        for (var k = 0; k < pts.length; k++) {
            var p = pts[k], q = pts[(k + 1) % pts.length];
            var m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
            if (k === 0) {
                var z = pts[pts.length - 1];
                d += "M" + f1((z[0] + p[0]) / 2) + " " + f1((z[1] + p[1]) / 2);
            }
            d += " Q" + f1(p[0]) + " " + f1(p[1]) + " " + f1(m[0]) + " " + f1(m[1]);
        }
        return d + " Z";
    }

    // Degradado blanco → gris azulado: al teñir queda luz arriba y sombra abajo.
    var BLANCO = '<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f6f8fc"/><stop offset="1" stop-color="#d5ddec"/></linearGradient>';
    var BLANCO_R = '<radialGradient id="br" cx="0.42" cy="0.36" r="0.7"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#f3f6fb"/><stop offset="1" stop-color="#cfd8ea"/></radialGradient>';

    // ------------------------------------------------------------------ cielo y paisaje

    function formaNube(dx, dy) {
        dx = dx || 0; dy = dy || 0;
        var c = function (x, y, r) { return '<circle cx="' + (x + dx) + '" cy="' + (y + dy) + '" r="' + r + '"/>'; };
        return c(62, 92, 46) + c(108, 62, 54) + c(160, 76, 46) + c(190, 104, 32) + c(36, 112, 28) +
            '<rect x="' + (26 + dx) + '" y="' + (92 + dy) + '" width="' + 176 + '" height="48" rx="24"/>';
    }

    /** La nube grande (se tiñe): 220 × 150, cuerpo de x 8 a 214. */
    function nube() {
        return svg(220, 150,
            "<defs>" + BLANCO + "</defs>" +
            '<g fill="#b9c6e0" opacity="0.55">' + formaNube(0, 5) + "</g>" +
            '<g fill="url(#b)" stroke="#c4cfe6" stroke-width="5">' + formaNube(0, 0) + "</g>" +
            '<g fill="url(#b)">' + formaNube(0, 0) + "</g>" +
            '<ellipse cx="96" cy="44" rx="26" ry="12" fill="#ffffff" opacity="0.9"/>' +
            '<ellipse cx="150" cy="62" rx="14" ry="7" fill="#ffffff" opacity="0.8"/>');
    }

    function nubeDeco() {
        return svg(220, 150,
            '<g fill="#ffffff" opacity="0.92">' + formaNube(0, 0) + "</g>" +
            '<g fill="#e3efff" opacity="0.6"><rect x="26" y="118" width="176" height="22" rx="11"/></g>');
    }

    function caraNube(cerrada) {
        var ojos = cerrada
            ? '<path d="M24 26 Q32 34 40 26" stroke="#3b2a5a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M70 26 Q78 34 86 26" stroke="#3b2a5a" stroke-width="5" fill="none" stroke-linecap="round"/>'
            : '<ellipse cx="32" cy="26" rx="8" ry="10" fill="#3b2a5a"/><ellipse cx="78" cy="26" rx="8" ry="10" fill="#3b2a5a"/>' +
              '<circle cx="35" cy="22" r="3.2" fill="#fff"/><circle cx="81" cy="22" r="3.2" fill="#fff"/>';
        return svg(110, 64, ojos +
            '<ellipse cx="16" cy="42" rx="10" ry="6" fill="#ff8fab" opacity="0.75"/><ellipse cx="94" cy="42" rx="10" ry="6" fill="#ff8fab" opacity="0.75"/>' +
            '<path d="M42 40 Q55 54 68 40" stroke="#3b2a5a" stroke-width="5" fill="none" stroke-linecap="round"/>');
    }

    function fondo() {
        var r = semilla(7);
        var brillos = "";
        for (var i = 0; i < 30; i++) {
            brillos += '<circle cx="' + Math.round(r() * 1600) + '" cy="' + Math.round(40 + r() * 380) + '" r="' + f1(1.5 + r() * 2.5) + '" fill="#ffffff" opacity="' + f1(0.3 + r() * 0.4) + '"/>';
        }
        return svg(1600, 900,
            "<defs>" +
            '<linearGradient id="c" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#1e8ff0"/><stop offset="0.28" stop-color="#45acff"/><stop offset="0.5" stop-color="#86ccff"/>' +
            '<stop offset="0.66" stop-color="#c4ebff"/><stop offset="0.78" stop-color="#fff2c4"/><stop offset="0.9" stop-color="#ffd59a"/><stop offset="1" stop-color="#ffc387"/></linearGradient>' +
            '<radialGradient id="h1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="h2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff9ed2" stop-opacity="0.35"/><stop offset="1" stop-color="#ff9ed2" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="h3" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff3a0" stop-opacity="0.75"/><stop offset="1" stop-color="#fff3a0" stop-opacity="0"/></radialGradient>' +
            "</defs>" +
            '<rect width="1600" height="900" fill="url(#c)"/>' +
            '<ellipse cx="1230" cy="100" rx="520" ry="360" fill="url(#h3)"/>' +
            '<ellipse cx="800" cy="600" rx="980" ry="190" fill="url(#h1)"/>' +
            '<ellipse cx="260" cy="430" rx="420" ry="190" fill="url(#h2)"/>' +
            '<ellipse cx="1420" cy="520" rx="360" ry="160" fill="url(#h2)"/>' +
            brillos);
    }

    /** Capa cálida del horizonte (rosa y durazno): sube con la vida del jardín. */
    function cieloCalido() {
        return svg(1600, 900,
            '<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8cc6" stop-opacity="0"/><stop offset="0.45" stop-color="#ff9ed2" stop-opacity="0.15"/><stop offset="0.7" stop-color="#ffb37a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd43b" stop-opacity="0.6"/></linearGradient></defs>' +
            '<rect width="1600" height="900" fill="url(#w)"/>');
    }

    function sol() {
        return svg(200, 200,
            '<defs><radialGradient id="s" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fffbe0"/><stop offset="0.45" stop-color="#ffe14d"/><stop offset="1" stop-color="#ffa62b"/></radialGradient></defs>' +
            '<circle cx="100" cy="100" r="80" fill="url(#s)" stroke="#f59f00" stroke-width="5"/>' +
            '<ellipse cx="72" cy="66" rx="22" ry="12" fill="#ffffff" opacity="0.55"/>' +
            '<path d="M66 94 Q76 80 86 94" stroke="#8a4b00" stroke-width="6" fill="none" stroke-linecap="round"/>' +
            '<path d="M114 94 Q124 80 134 94" stroke="#8a4b00" stroke-width="6" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="60" cy="116" rx="13" ry="8" fill="#ff6b9d" opacity="0.6"/><ellipse cx="140" cy="116" rx="13" ry="8" fill="#ff6b9d" opacity="0.6"/>' +
            '<path d="M78 116 Q100 140 122 116 Z" fill="#e8496b" stroke="#8a4b00" stroke-width="5" stroke-linejoin="round"/>');
    }

    /** Rayos del sol (giran y se avivan con el jardín). */
    function rayosSol() {
        var rayos = "";
        for (var i = 0; i < 16; i++) {
            var largo = i % 2 ? 150 : 190;
            rayos += '<path d="M200 ' + (200 - largo) + " Q216 " + (200 - largo * 0.55) + " 200 112 Q184 " + (200 - largo * 0.55) + " 200 " + (200 - largo) + ' Z" fill="url(#r)" transform="rotate(' + (i * 22.5) + ' 200 200)"/>';
        }
        return svg(400, 400,
            '<defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3bf" stop-opacity="0"/><stop offset="1" stop-color="#ffd43b" stop-opacity="0.95"/></linearGradient>' +
            '<radialGradient id="g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff3bf" stop-opacity="0.95"/><stop offset="0.5" stop-color="#ffe066" stop-opacity="0.35"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="200" cy="200" r="200" fill="url(#g)"/>' + rayos);
    }

    /** Montañas lejanas (lila y azul, con bruma abajo). */
    function montanas() {
        return svg(1600, 320,
            '<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9d8cff"/><stop offset="1" stop-color="#c9c2ff"/></linearGradient>' +
            '<linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cb7ff"/><stop offset="1" stop-color="#b9dcff"/></linearGradient>' +
            '<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#fff4e0" stop-opacity="0.85"/></linearGradient></defs>' +
            '<path d="M0 200 Q120 90 240 150 Q330 40 470 120 Q560 170 640 110 Q760 20 900 120 Q1010 180 1100 100 Q1230 10 1360 110 Q1480 170 1600 90 L1600 320 L0 320 Z" fill="url(#m)"/>' +
            '<path d="M330 40 Q350 54 362 72 Q346 66 334 76 Q322 64 306 70 Q318 52 330 40 Z" fill="#ffffff" opacity="0.85"/>' +
            '<path d="M1230 10 Q1252 26 1266 48 Q1248 40 1234 52 Q1220 40 1202 46 Q1216 26 1230 10 Z" fill="#ffffff" opacity="0.85"/>' +
            '<path d="M0 240 Q180 160 380 220 Q560 270 760 190 Q960 120 1160 210 Q1380 270 1600 180 L1600 320 L0 320 Z" fill="url(#m2)"/>' +
            '<rect y="200" width="1600" height="120" fill="url(#b)"/>');
    }

    function arbolito(x, y, k, c1, c2) {
        return '<g transform="translate(' + x + " " + y + ") scale(" + k + ')">' +
            '<rect x="-6" y="-8" width="12" height="34" rx="5" fill="#b07a52"/>' +
            '<circle cx="0" cy="-30" r="30" fill="' + c1 + '"/><circle cx="-18" cy="-14" r="20" fill="' + c1 + '"/><circle cx="18" cy="-14" r="20" fill="' + c1 + '"/>' +
            '<circle cx="-9" cy="-40" r="11" fill="' + c2 + '" opacity="0.8"/>' +
            '<circle cx="12" cy="-22" r="4" fill="#ff6b9d"/><circle cx="-14" cy="-16" r="4" fill="#ffd43b"/><circle cx="4" cy="-44" r="3.5" fill="#ff8787"/></g>';
    }

    /** Colinas del medio, con arbolitos frutales y manchas de flores. */
    function colinasLejos() {
        var r = semilla(21), motas = "";
        var cols = ["#ff8cc6", "#ffd43b", "#ffffff", "#b197fc", "#ffa94d"];
        for (var i = 0; i < 90; i++) {
            var x = Math.round(r() * 1600), y = Math.round(150 + r() * 180);
            motas += '<circle cx="' + x + '" cy="' + y + '" r="' + f1(2 + r() * 2.5) + '" fill="' + cols[i % cols.length] + '" opacity="0.85"/>';
        }
        return svg(1600, 340,
            '<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6ec6e"/><stop offset="1" stop-color="#5cc84a"/></linearGradient></defs>' +
            '<path d="M0 140 Q200 40 440 110 Q680 180 900 90 Q1160 -10 1400 90 Q1520 140 1600 110 L1600 340 L0 340 Z" fill="url(#a)"/>' +
            '<path d="M90 120 Q220 70 360 96" stroke="#d3f9a8" stroke-width="7" fill="none" opacity="0.7" stroke-linecap="round"/>' +
            '<path d="M940 84 Q1100 20 1260 50" stroke="#d3f9a8" stroke-width="7" fill="none" opacity="0.7" stroke-linecap="round"/>' +
            arbolito(250, 120, 0.9, "#3fbf5a", "#9be08f") + arbolito(560, 140, 0.75, "#2fb350", "#8ce99a") +
            arbolito(1080, 70, 1.0, "#37b24d", "#a9e34b") + arbolito(1180, 84, 0.7, "#40c057", "#c0eb75") + arbolito(1490, 112, 0.85, "#2f9e44", "#8ce99a") +
            motas);
    }

    /** Colinas cercanas, más saturadas. */
    function colinasCerca() {
        var r = semilla(33), motas = "";
        var cols = ["#ff6b9d", "#ffe066", "#ffffff", "#9775fa", "#ff922b", "#4dabf7"];
        for (var i = 0; i < 110; i++) {
            var x = Math.round(r() * 1600), y = Math.round(110 + r() * 150);
            var c = cols[i % cols.length];
            motas += '<g transform="translate(' + x + " " + y + ')"><circle cx="-3" cy="0" r="2.8" fill="' + c + '"/><circle cx="3" cy="0" r="2.8" fill="' + c + '"/><circle cx="0" cy="-3" r="2.8" fill="' + c + '"/><circle cx="0" cy="3" r="2.8" fill="' + c + '"/><circle r="1.8" fill="#fff3bf"/></g>';
        }
        return svg(1600, 260,
            '<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ee35a"/><stop offset="1" stop-color="#36b03c"/></linearGradient></defs>' +
            '<path d="M0 110 Q260 20 560 90 Q820 150 1060 70 Q1340 -10 1600 80 L1600 260 L0 260 Z" fill="url(#f)"/>' +
            '<path d="M120 80 Q300 34 480 70" stroke="#c0eb75" stroke-width="8" fill="none" opacity="0.75" stroke-linecap="round"/>' +
            '<path d="M1120 56 Q1290 10 1460 40" stroke="#c0eb75" stroke-width="8" fill="none" opacity="0.75" stroke-linecap="round"/>' +
            motas);
    }

    function cesped() {
        var r = semilla(3);
        var d = "M0 40";
        for (var x = 0; x <= 1600; x += 20) {
            var h = 20 + r() * 24;
            d += " Q" + (x + 5) + " " + f1(40 - h) + " " + (x + 10) + " " + f1(30 - h * 0.2) + " Q" + (x + 15) + " " + f1(36 - h * 0.6) + " " + (x + 20) + " 40";
        }
        d += " L1600 160 L0 160 Z";
        var motas = "";
        for (var i = 0; i < 70; i++) {
            var mx = Math.round(r() * 1600), my = Math.round(56 + r() * 96);
            motas += '<ellipse cx="' + mx + '" cy="' + my + '" rx="' + f1(6 + r() * 8) + '" ry="' + f1(2 + r() * 2) + '" fill="#a9f08a" opacity="0.6"/>';
        }
        var flores = "";
        var cols = ["#ffffff", "#ffe066", "#ff8cc6", "#b197fc", "#ffa94d", "#74c0fc"];
        for (var k = 0; k < 46; k++) {
            var fx = Math.round(r() * 1600), fy = Math.round(66 + r() * 84);
            var c = cols[k % cols.length];
            flores += '<g transform="translate(' + fx + " " + fy + ')"><circle cx="-4" cy="0" r="3.6" fill="' + c + '"/><circle cx="4" cy="0" r="3.6" fill="' + c + '"/><circle cx="0" cy="-4" r="3.6" fill="' + c + '"/><circle cx="0" cy="4" r="3.6" fill="' + c + '"/><circle cx="0" cy="0" r="2.6" fill="#ffd43b"/></g>';
        }
        return svg(1600, 160,
            '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fe05a"/><stop offset="0.35" stop-color="#43c047"/><stop offset="1" stop-color="#2b9a3c"/></linearGradient></defs>' +
            '<path d="' + d + '" fill="url(#g)"/>' + motas + flores);
    }

    /** Florecita que brota en las colinas cuando se riega (pétalos blancos que se tiñen). */
    function brote() {
        var p = "";
        for (var i = 0; i < 5; i++) p += '<ellipse cx="22" cy="12" rx="6" ry="9" fill="#ffffff" stroke="#dfe5f0" stroke-width="1.5" transform="rotate(' + (i * 72) + ' 22 20)"/>';
        return svg(44, 60,
            '<path d="M22 26 Q20 44 23 58" stroke="#2f9e44" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<path d="M22 46 Q10 38 8 46 Q14 52 22 48 Z" fill="#51cf66"/>' + p +
            '<circle cx="22" cy="20" r="5.5" fill="#fff3bf"/>');
    }

    /** Pajarito (silueta con alas en "m"). */
    function pajaro() {
        return svg(64, 30,
            '<path d="M2 14 Q16 0 32 16 Q48 0 62 14 Q48 8 32 24 Q16 8 2 14 Z" fill="#3b4a8a"/>' +
            '<circle cx="32" cy="18" r="4" fill="#3b4a8a"/>');
    }

    function arcoiris() {
        var cols = ["#ff8787", "#ffc078", "#ffe066", "#8ce99a", "#74c0fc", "#b197fc"];
        var bandas = "";
        cols.forEach(function (c, i) {
            var r = 420 - i * 26;
            bandas += '<path d="M' + (450 - r) + " 450 A" + r + " " + r + " 0 0 1 " + (450 + r) + ' 450" stroke="' + c + '" stroke-width="27" fill="none"/>';
        });
        return svg(900, 460, '<g opacity="0.8">' + bandas + "</g>");
    }

    // ------------------------------------------------------------------ gotas, guías y flecha

    function rutaGota(cx, top, w, h) {
        var r = w / 2, by = top + h - r;
        return "M" + cx + " " + top + " C" + f1(cx + r * 0.2) + " " + f1(top + h * 0.25) + " " + f1(cx + r) + " " + f1(by - r * 0.55) + " " + f1(cx + r) + " " + f1(by) +
            " A" + r + " " + r + " 0 0 1 " + f1(cx - r) + " " + f1(by) +
            " C" + f1(cx - r) + " " + f1(by - r * 0.55) + " " + f1(cx - r * 0.2) + " " + f1(top + h * 0.25) + " " + cx + " " + top + " Z";
    }

    /** La gotita que acompaña al dedo (se tiñe): 72 × 92. */
    function gota() {
        return svg(72, 92,
            "<defs>" + BLANCO_R + "</defs>" +
            '<path d="' + rutaGota(36, 6, 56, 80) + '" fill="url(#br)" stroke="#c4cfe6" stroke-width="4"/>' +
            '<ellipse cx="25" cy="52" rx="7" ry="12" fill="#ffffff" opacity="0.95" transform="rotate(18 25 52)"/>');
    }

    function caraGota() {
        return svg(44, 26,
            '<ellipse cx="11" cy="9" rx="4" ry="5" fill="#2b2366"/><ellipse cx="33" cy="9" rx="4" ry="5" fill="#2b2366"/>' +
            '<circle cx="12.5" cy="7" r="1.6" fill="#fff"/><circle cx="34.5" cy="7" r="1.6" fill="#fff"/>' +
            '<path d="M16 16 Q22 23 28 16" stroke="#2b2366" stroke-width="3" fill="none" stroke-linecap="round"/>');
    }

    /** Gotita guía del carril (se tiñe): 36 × 48. */
    function gotita() {
        return svg(36, 48,
            "<defs>" + BLANCO_R + "</defs>" +
            '<path d="' + rutaGota(18, 3, 28, 42) + '" fill="url(#br)" stroke="#d0d9ea" stroke-width="2.5"/>' +
            '<ellipse cx="12.5" cy="28" rx="3.5" ry="6" fill="#ffffff" opacity="0.95" transform="rotate(16 12.5 28)"/>');
    }

    function gotaLluvia() {
        return svg(18, 36, '<path d="' + rutaGota(9, 1, 14, 33) + '" fill="#ffffff"/>');
    }

    /** Flecha hacia abajo, amarilla y naranja con borde blanco: 110 × 130. */
    function flecha() {
        var d = "M38 10 Q38 4 44 4 L66 4 Q72 4 72 10 L72 62 L94 62 Q104 62 98 71 L61 118 Q55 125 49 118 L12 71 Q6 62 16 62 L38 62 Z";
        return svg(110, 130,
            '<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset="1" stop-color="#ff922b"/></linearGradient></defs>' +
            '<path d="' + d + '" fill="#e8590c" opacity="0.35" transform="translate(0 6)"/>' +
            '<path d="' + d + '" fill="url(#f)" stroke="#ffffff" stroke-width="7" stroke-linejoin="round"/>' +
            '<path d="M47 14 L47 56" stroke="#fff9db" stroke-width="6" stroke-linecap="round" opacity="0.8"/>');
    }

    // ------------------------------------------------------------------ flores

    function tallo() {
        return svg(26, 240,
            '<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#69db7c"/><stop offset="0.5" stop-color="#40c057"/><stop offset="1" stop-color="#2f9e44"/></linearGradient></defs>' +
            '<rect x="4" y="0" width="18" height="240" rx="9" fill="url(#t)"/>' +
            '<rect x="8" y="6" width="4" height="228" rx="2" fill="#b2f2bb" opacity="0.7"/>');
    }

    function hoja() {
        return svg(100, 56,
            '<defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ce99a"/><stop offset="1" stop-color="#37b24d"/></linearGradient></defs>' +
            '<path d="M4 46 Q30 -6 96 10 Q80 58 4 46 Z" fill="url(#h)" stroke="#2f9e44" stroke-width="3"/>' +
            '<path d="M10 43 Q46 26 86 14" stroke="#d3f9d8" stroke-width="3" fill="none" stroke-linecap="round"/>');
    }

    /** Pétalos (se tiñen), 240 × 240 centrados en (120, 120). */
    function petalos(tipo) {
        var g = "", i, a;
        var borde = ' stroke="#c9d2e6" stroke-width="3"';
        if (tipo === "margarita") {
            for (i = 0; i < 12; i++) {
                a = i * 30;
                g += '<ellipse cx="120" cy="58" rx="19" ry="48" fill="url(#b)"' + borde + ' transform="rotate(' + a + ' 120 120)"/>';
            }
        } else if (tipo === "cosmos") {
            for (i = 0; i < 8; i++) {
                a = i * 45;
                g += '<path d="M120 116 Q84 70 96 22 Q106 34 112 18 Q120 32 128 18 Q134 34 144 22 Q156 70 120 116 Z" fill="url(#b)"' + borde + ' transform="rotate(' + a + ' 120 120)"/>';
            }
        } else if (tipo === "girasol") {
            for (i = 0; i < 16; i++) {
                a = i * 22.5 + 11;
                g += '<path d="M120 112 Q100 70 120 16 Q140 70 120 112 Z" fill="#e4e9f3"' + borde + ' transform="rotate(' + a + ' 120 120)"/>';
            }
            for (i = 0; i < 16; i++) {
                a = i * 22.5;
                g += '<path d="M120 110 Q102 72 120 26 Q138 72 120 110 Z" fill="url(#b)"' + borde + ' transform="rotate(' + a + ' 120 120)"/>';
            }
        } else if (tipo === "campanita") {
            for (i = 0; i < 5; i++) {
                a = i * 72;
                g += '<path d="M120 120 Q66 92 82 42 Q100 14 120 34 Q140 14 158 42 Q174 92 120 120 Z" fill="url(#b)"' + borde + ' transform="rotate(' + a + ' 120 120)"/>';
            }
            g += '<path d="' + rutaEstrella(120, 120, 46, 22, 5) + '" fill="#ffffff" opacity="0.65"/>';
        } else {
            // tulipán: copa de tres pétalos
            g = '<path d="M60 92 Q48 160 120 204 Q192 160 180 92 Q168 120 150 128 Q148 70 120 30 Q92 70 90 128 Q72 120 60 92 Z" fill="url(#b)"' + borde + '/>' +
                '<path d="M60 92 Q40 50 70 34 Q96 70 100 140 Q72 130 60 92 Z" fill="#eef2f9"' + borde + '/>' +
                '<path d="M180 92 Q200 50 170 34 Q144 70 140 140 Q168 130 180 92 Z" fill="#eef2f9"' + borde + '/>' +
                '<path d="M86 60 Q96 44 108 50" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"/>';
        }
        return svg(240, 240, "<defs>" + BLANCO + "</defs>" + g);
    }

    function centro(tipo) {
        if (tipo === "cafe") {
            var r = semilla(5), pts = "";
            for (var i = 0; i < 26; i++) {
                var a = r() * Math.PI * 2, d = 34 + r() * 14;
                pts += '<circle cx="' + f1(60 + Math.cos(a) * d) + '" cy="' + f1(60 + Math.sin(a) * d) + '" r="2.4" fill="#8a5530" opacity="0.45"/>';
            }
            return svg(120, 120,
                '<defs><radialGradient id="c" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#f2c48d"/><stop offset="1" stop-color="#c98a52"/></radialGradient></defs>' +
                '<circle cx="60" cy="60" r="54" fill="url(#c)" stroke="#9c6236" stroke-width="4"/>' + pts);
        }
        var c0 = tipo === "crema" ? "#fffdf2" : "#fff3bf", c1 = tipo === "crema" ? "#ffe8a3" : "#fcc419", bd = tipo === "crema" ? "#f2c94c" : "#f08c00";
        return svg(120, 120,
            '<defs><radialGradient id="c" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="' + c0 + '"/><stop offset="1" stop-color="' + c1 + '"/></radialGradient></defs>' +
            '<circle cx="60" cy="60" r="54" fill="url(#c)" stroke="' + bd + '" stroke-width="4"/>' +
            '<ellipse cx="44" cy="38" rx="14" ry="8" fill="#ffffff" opacity="0.6"/>');
    }

    function caraFlor(feliz) {
        if (feliz) {
            return svg(90, 60,
                '<path d="M14 22 Q24 8 34 22" stroke="#3b2a5a" stroke-width="6" fill="none" stroke-linecap="round"/>' +
                '<path d="M56 22 Q66 8 76 22" stroke="#3b2a5a" stroke-width="6" fill="none" stroke-linecap="round"/>' +
                '<ellipse cx="10" cy="36" rx="9" ry="6" fill="#ff8fab" opacity="0.85"/><ellipse cx="80" cy="36" rx="9" ry="6" fill="#ff8fab" opacity="0.85"/>' +
                '<path d="M28 32 Q45 56 62 32 Z" fill="#e8496b" stroke="#3b2a5a" stroke-width="4" stroke-linejoin="round"/>' +
                '<path d="M36 42 Q45 50 54 42" fill="#ffa8b8"/>');
        }
        return svg(90, 60,
            '<path d="M14 18 Q24 28 34 22" stroke="#3b2a5a" stroke-width="5" fill="none" stroke-linecap="round"/>' +
            '<path d="M56 22 Q66 28 76 18" stroke="#3b2a5a" stroke-width="5" fill="none" stroke-linecap="round"/>' +
            '<path d="M34 46 Q45 36 56 46" stroke="#3b2a5a" stroke-width="5" fill="none" stroke-linecap="round"/>' +
            '<path d="M78 26 Q82 34 78 38 Q74 34 78 26 Z" fill="#74c0fc" opacity="0.9"/>');
    }

    // ------------------------------------------------------------------ bichitos y adornos

    function alaMariposa() {
        return svg(96, 76,
            "<defs>" + BLANCO_R + "</defs>" +
            '<path d="M48 36 Q30 0 8 8 Q-2 26 16 40 Q2 56 16 68 Q34 72 48 44 Z" fill="url(#br)" stroke="#c4cfe6" stroke-width="3"/>' +
            '<path d="M48 36 Q66 0 88 8 Q98 26 80 40 Q94 56 80 68 Q62 72 48 44 Z" fill="url(#br)" stroke="#c4cfe6" stroke-width="3"/>' +
            '<circle cx="24" cy="24" r="7" fill="#ffffff" opacity="0.9"/><circle cx="72" cy="24" r="7" fill="#ffffff" opacity="0.9"/>' +
            '<circle cx="24" cy="56" r="5" fill="#dfe6f3"/><circle cx="72" cy="56" r="5" fill="#dfe6f3"/>');
    }

    function cuerpoMariposa() {
        return svg(30, 64,
            '<path d="M13 10 Q8 0 3 2" stroke="#4a3b6b" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="3" cy="2" r="2.5" fill="#4a3b6b"/>' +
            '<path d="M17 10 Q22 0 27 2" stroke="#4a3b6b" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="27" cy="2" r="2.5" fill="#4a3b6b"/>' +
            '<ellipse cx="15" cy="16" rx="7" ry="7" fill="#5c4a86"/><ellipse cx="15" cy="40" rx="6" ry="20" fill="#5c4a86"/>' +
            '<circle cx="12.5" cy="15" r="1.8" fill="#fff"/><circle cx="17.5" cy="15" r="1.8" fill="#fff"/>');
    }

    function hongo() {
        return svg(90, 90,
            '<path d="M34 50 Q30 82 38 86 L54 86 Q62 82 56 50 Z" fill="#fff4e6" stroke="#e0c3a0" stroke-width="3"/>' +
            '<path d="M6 54 Q8 10 45 8 Q82 10 84 54 Q45 64 6 54 Z" fill="#ff6b6b" stroke="#e03131" stroke-width="3"/>' +
            '<circle cx="30" cy="30" r="7" fill="#fff"/><circle cx="56" cy="22" r="6" fill="#fff"/><circle cx="66" cy="42" r="5" fill="#fff"/><circle cx="22" cy="46" r="4" fill="#fff"/>' +
            '<circle cx="40" cy="70" r="2" fill="#6b4f2a"/><circle cx="50" cy="70" r="2" fill="#6b4f2a"/><path d="M41 76 Q45 80 49 76" stroke="#6b4f2a" stroke-width="2" fill="none" stroke-linecap="round"/>');
    }

    function piedras() {
        return svg(110, 56,
            '<ellipse cx="38" cy="36" rx="32" ry="18" fill="#adb5bd" stroke="#868e96" stroke-width="3"/>' +
            '<ellipse cx="76" cy="40" rx="24" ry="13" fill="#ced4da" stroke="#868e96" stroke-width="3"/>' +
            '<ellipse cx="30" cy="28" rx="12" ry="5" fill="#f1f3f5" opacity="0.8"/><ellipse cx="72" cy="35" rx="8" ry="3.5" fill="#f8f9fa" opacity="0.8"/>');
    }

    function arbusto() {
        return svg(160, 96,
            '<g fill="#51cf66" stroke="#2f9e44" stroke-width="3"><circle cx="40" cy="58" r="32"/><circle cx="80" cy="42" r="38"/><circle cx="122" cy="58" r="30"/></g>' +
            '<rect x="14" y="62" width="132" height="30" rx="15" fill="#40c057"/>' +
            '<g fill="#8ce99a" opacity="0.7"><ellipse cx="70" cy="22" rx="14" ry="7"/><ellipse cx="34" cy="40" rx="9" ry="5"/></g>' +
            '<g fill="#ff6b6b"><circle cx="52" cy="54" r="5"/><circle cx="98" cy="48" r="5"/><circle cx="118" cy="68" r="5"/><circle cx="76" cy="70" r="5"/></g>');
    }

    function mariquita() {
        return svg(58, 44,
            '<circle cx="12" cy="24" r="9" fill="#343a40"/><circle cx="9" cy="21" r="2" fill="#fff"/><circle cx="14" cy="21" r="2" fill="#fff"/>' +
            '<ellipse cx="34" cy="24" rx="20" ry="17" fill="#fa5252" stroke="#c92a2a" stroke-width="3"/>' +
            '<path d="M34 8 L34 40" stroke="#343a40" stroke-width="3"/>' +
            '<g fill="#343a40"><circle cx="26" cy="18" r="4"/><circle cx="42" cy="18" r="4"/><circle cx="26" cy="31" r="3.5"/><circle cx="43" cy="31" r="3.5"/></g>' +
            '<ellipse cx="28" cy="13" rx="5" ry="2.5" fill="#fff" opacity="0.6"/>');
    }

    function caracol() {
        return svg(96, 62,
            '<path d="M6 56 Q4 40 20 40 L72 40 Q90 40 92 56 Z" fill="#ffd8a8" stroke="#e8a158" stroke-width="3"/>' +
            '<path d="M16 40 L10 20" stroke="#e8a158" stroke-width="3" stroke-linecap="round"/><circle cx="10" cy="18" r="4" fill="#e8a158"/>' +
            '<path d="M24 40 L22 22" stroke="#e8a158" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="20" r="4" fill="#e8a158"/>' +
            '<circle cx="56" cy="30" r="24" fill="#da77f2" stroke="#9c36b5" stroke-width="3"/>' +
            '<path d="M56 30 m-14 0 a14 14 0 1 1 14 14 a9 9 0 1 1 -9 -9 a4 4 0 1 1 4 4" stroke="#9c36b5" stroke-width="3" fill="none" stroke-linecap="round"/>');
    }

    function florecitas() {
        var g = "";
        [[18, 40, "#ff8cc6"], [44, 28, "#ffd43b"], [70, 42, "#b197fc"]].forEach(function (p) {
            g += '<path d="M' + p[0] + " 60 Q" + (p[0] + 2) + " " + (p[1] + 14) + " " + p[0] + " " + (p[1] + 6) + '" stroke="#37b24d" stroke-width="3" fill="none"/>';
            for (var i = 0; i < 5; i++) {
                var a = i * 72 * Math.PI / 180;
                g += '<circle cx="' + f1(p[0] + Math.cos(a) * 6) + '" cy="' + f1(p[1] + Math.sin(a) * 6) + '" r="5" fill="' + p[2] + '"/>';
            }
            g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="#fff3bf"/>';
        });
        return svg(90, 62, g);
    }

    function hierba() {
        return svg(80, 80,
            '<g fill="#51cf66" stroke="#2f9e44" stroke-width="2.5" stroke-linejoin="round">' +
            '<path d="M30 78 Q20 40 8 22 Q30 36 38 78 Z"/><path d="M36 78 Q38 30 42 4 Q50 36 46 78 Z"/><path d="M44 78 Q56 40 74 26 Q60 50 54 78 Z"/></g>');
    }

    // ------------------------------------------------------------------ partículas y premio

    function chispa() {
        return svg(48, 48,
            '<path d="M24 2 Q27 21 46 24 Q27 27 24 46 Q21 27 2 24 Q21 21 24 2 Z" fill="#ffffff"/>' +
            '<circle cx="24" cy="24" r="5" fill="#ffffff"/>');
    }

    function estrellita() {
        return svg(48, 48, '<path d="' + rutaEstrella(24, 25, 22, 10, 5) + '" fill="#ffffff"/>');
    }

    function brillo() {
        return svg(96, 96,
            '<defs><radialGradient id="g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset="0.4" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="48" cy="48" r="48" fill="url(#g)"/>');
    }

    function petalo() {
        return svg(24, 36, '<ellipse cx="12" cy="18" rx="10" ry="16" fill="#ffffff"/>');
    }

    function medalla() {
        var flor = "";
        for (var i = 0; i < 8; i++) flor += '<ellipse cx="150" cy="196" rx="17" ry="34" fill="#ff8cc6" stroke="#e64980" stroke-width="3" transform="rotate(' + (i * 45) + ' 150 236)"/>';
        return svg(300, 380,
            '<defs><radialGradient id="o" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="#fff3bf"/><stop offset="0.55" stop-color="#ffd43b"/><stop offset="1" stop-color="#f59f00"/></radialGradient></defs>' +
            '<path d="M86 0 L138 0 L170 120 L118 132 Z" fill="#4dabf7" stroke="#1c7ed6" stroke-width="4"/>' +
            '<path d="M214 0 L162 0 L130 120 L182 132 Z" fill="#ff8cc6" stroke="#e64980" stroke-width="4"/>' +
            '<circle cx="150" cy="236" r="126" fill="#f08c00"/>' +
            '<circle cx="150" cy="232" r="122" fill="url(#o)" stroke="#e67700" stroke-width="6"/>' +
            '<circle cx="150" cy="232" r="100" fill="none" stroke="#fff3bf" stroke-width="5" stroke-dasharray="4 12" stroke-linecap="round"/>' +
            flor +
            '<circle cx="150" cy="236" r="30" fill="#ffe066" stroke="#f08c00" stroke-width="4"/>' +
            '<path d="M138 232 Q143 226 148 232" stroke="#5c3b00" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
            '<path d="M152 232 Q157 226 162 232" stroke="#5c3b00" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
            '<path d="M140 242 Q150 252 160 242" stroke="#5c3b00" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="104" cy="170" rx="28" ry="12" fill="#ffffff" opacity="0.55" transform="rotate(-30 104 170)"/>');
    }

    // ------------------------------------------------------------------ rasterizado

    function lista() {
        var l = [
            ["fondo", fondo(), 1],
            ["sol", sol(), 1.4],
            ["rayosSol", rayosSol(), 1],
            ["cieloCalido", cieloCalido(), 0.5],
            ["montanas", montanas(), 1],
            ["colinasLejos", colinasLejos(), 1],
            ["colinasCerca", colinasCerca(), 1],
            ["brote", brote(), 2],
            ["pajaro", pajaro(), 2],
            ["nube", nube(), 2],
            ["nubeDeco", nubeDeco(), 1.4],
            ["caraNube", caraNube(false), 2],
            ["caraNubeCerrada", caraNube(true), 2],
            ["cesped", cesped(), 1],
            ["arcoiris", arcoiris(), 1],
            ["gota", gota(), 2],
            ["caraGota", caraGota(), 2],
            ["gotita", gotita(), 2],
            ["gotaLluvia", gotaLluvia(), 2],
            ["flecha", flecha(), 2],
            ["tallo", tallo(), 2],
            ["hoja", hoja(), 2],
            ["centro-amarillo", centro("amarillo"), 1.5],
            ["centro-cafe", centro("cafe"), 1.5],
            ["centro-crema", centro("crema"), 1.5],
            ["caraTriste", caraFlor(false), 2],
            ["caraFeliz", caraFlor(true), 2],
            ["alaMariposa", alaMariposa(), 2],
            ["cuerpoMariposa", cuerpoMariposa(), 2],
            ["hongo", hongo(), 1.5],
            ["piedras", piedras(), 1.5],
            ["arbusto", arbusto(), 1.5],
            ["mariquita", mariquita(), 1.5],
            ["caracol", caracol(), 1.5],
            ["florecitas", florecitas(), 1.5],
            ["hierba", hierba(), 1.5],
            ["chispa", chispa(), 1.5],
            ["estrellita", estrellita(), 1.5],
            ["brillo", brillo(), 1],
            ["petalo", petalo(), 2],
            ["medalla", medalla(), 1.6]
        ];
        ["margarita", "tulipan", "girasol", "campanita", "cosmos"].forEach(function (t) { l.push(["petalos-" + t, petalos(t), 1.6]); });
        return l;
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
                console.warn("[DibujosLluvia] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    // Qué centro y dónde va la cara según el tipo de flor (en píxeles del lienzo de pétalos, 240 × 240).
    var FLORES = {
        margarita: { centro: "centro-amarillo", radioCentro: 40, caraY: 4 },
        cosmos: { centro: "centro-amarillo", radioCentro: 34, caraY: 4 },
        girasol: { centro: "centro-cafe", radioCentro: 50, caraY: 4 },
        campanita: { centro: "centro-crema", radioCentro: 32, caraY: 4 },
        tulipan: { centro: null, radioCentro: 0, caraY: 44 }
    };

    global.DibujosLluvia = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        FLORES: FLORES
    };
})(typeof window !== "undefined" ? window : global);
