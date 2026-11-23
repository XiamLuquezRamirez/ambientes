/**
 * DibujosTuberia — dibujos propios de "¡La Red de Tuberías!" (window.DibujosTuberia).
 *
 * SVG: el laboratorio de conducción eléctrica (fondo 1600 × 900), el generador de luz, el reactor y sus piezas
 * animables (núcleo, anillo, engranaje), la gema de energía, el collar de los checkpoints y las partículas.
 * preparar() rasteriza cada SVG a <canvas> una sola vez y la escena los convierte en texturas de Phaser.
 *
 * Canvas 2D: tubo(red) dibuja la tubería de cada nivel (cuerpo metálico, cristal, carril y la guía de puntos)
 * siguiendo el eje que calcula ReglasTuberia, con codos y uniones redondeadas.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;

    var GEN = { w: 180, h: 300, px: 172, py: 150 };     // generador: boca de salida en (px, py)
    var REA = { w: 200, h: 340, px: 8, py: 170 };       // reactor: boca de entrada en (px, py)

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    function semilla(s) {
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    // ------------------------------------------------------------------ fondo: laboratorio de conducción eléctrica

    function perno(x, y, r) {
        return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 4) + '" fill="#2a3f78"/><circle cx="' + (x - 1) + '" cy="' + (y - 1) + '" r="' + ((r || 4) * 0.45) + '" fill="#5d78b8"/>';
    }

    function engranajeRuta(cx, cy, r, dientes, hueco) {
        var d = "";
        var n = dientes * 2;
        for (var i = 0; i < n; i++) {
            var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
            var rr = i % 2 ? r * 0.82 : r;
            var p0 = [cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr];
            var p1 = [cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr];
            d += (i ? "L" : "M") + p0[0].toFixed(1) + " " + p0[1].toFixed(1) + " L" + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + " ";
        }
        d += "Z";
        if (hueco) d += " M" + (cx + hueco) + " " + cy + " A" + hueco + " " + hueco + " 0 1 0 " + (cx - hueco) + " " + cy + " A" + hueco + " " + hueco + " 0 1 0 " + (cx + hueco) + " " + cy + " Z";
        return d;
    }

    function pantalla(x, y, w, h, tipo, r) {
        var s = '<rect x="' + (x - 6) + '" y="' + (y - 6) + '" width="' + (w + 12) + '" height="' + (h + 12) + '" rx="10" fill="#1b2a5a" stroke="#31478a" stroke-width="3"/>' +
            '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6" fill="#061536"/>';
        if (tipo === "onda") {
            var d = "M" + (x + 6) + " " + (y + h / 2);
            for (var i = 0; i <= 20; i++) d += " L" + (x + 6 + i * (w - 12) / 20).toFixed(1) + " " + (y + h / 2 + Math.sin(i * 0.9) * h * 0.3).toFixed(1);
            s += '<path d="' + d + '" fill="none" stroke="#3bdcff" stroke-width="3" opacity="0.9"/>';
        } else if (tipo === "barras") {
            for (var k = 0; k < 6; k++) {
                var hh = (0.25 + r() * 0.65) * (h - 14);
                s += '<rect x="' + (x + 8 + k * (w - 16) / 6) + '" y="' + (y + h - 7 - hh) + '" width="' + ((w - 16) / 6 - 5) + '" height="' + hh + '" rx="2" fill="' + ["#3bdcff", "#c77dff", "#ffd43b", "#ff6bd6", "#69db7c", "#ff922b"][k] + '" opacity="0.85"/>';
            }
        } else {
            s += '<circle cx="' + (x + w / 2) + '" cy="' + (y + h / 2) + '" r="' + (h * 0.32) + '" fill="none" stroke="#c77dff" stroke-width="3"/>' +
                '<circle cx="' + (x + w / 2) + '" cy="' + (y + h / 2) + '" r="' + (h * 0.14) + '" fill="#ff6bd6"/>' +
                '<line x1="' + (x + 8) + '" y1="' + (y + h / 2) + '" x2="' + (x + w - 8) + '" y2="' + (y + h / 2) + '" stroke="#3bdcff" stroke-width="1.5" opacity="0.6"/>';
        }
        return s;
    }

    function taller() {
        var r = semilla(7);
        var s = '<defs>' +
            '<linearGradient id="pared" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1b45"/><stop offset="0.6" stop-color="#142a60"/><stop offset="1" stop-color="#0e1d48"/></linearGradient>' +
            '<linearGradient id="suelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2c63"/><stop offset="1" stop-color="#0a1433"/></linearGradient>' +
            '<linearGradient id="tuboBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4d6aa8"/><stop offset="0.5" stop-color="#2a4380"/><stop offset="1" stop-color="#172a5c"/></linearGradient>' +
            '<linearGradient id="tuboBgV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#172a5c"/><stop offset="0.5" stop-color="#3f5c9c"/><stop offset="1" stop-color="#172a5c"/></linearGradient>' +
            '<radialGradient id="foco" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#2c4aa0" stop-opacity="0.55"/><stop offset="1" stop-color="#2c4aa0" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="neon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3bdcff" stop-opacity="0"/><stop offset="0.5" stop-color="#3bdcff"/><stop offset="1" stop-color="#3bdcff" stop-opacity="0"/></linearGradient>' +
            '<filter id="desenfoque"><feGaussianBlur stdDeviation="5"/></filter>' +
            '</defs>';
        s += '<rect width="1600" height="900" fill="url(#pared)"/>';
        // paneles de la pared con pernos
        for (var fy = 0; fy < 4; fy++) {
            for (var fx = 0; fx < 9; fx++) {
                var x = -40 + fx * 190 + (fy % 2) * 40, y = 20 + fy * 190;
                s += '<rect x="' + x + '" y="' + y + '" width="176" height="176" rx="14" fill="#13275a" stroke="#1d3473" stroke-width="3" opacity="0.9"/>' +
                    '<rect x="' + (x + 10) + '" y="' + (y + 10) + '" width="156" height="12" rx="6" fill="#1a3170" opacity="0.6"/>' +
                    perno(x + 14, y + 160, 4) + perno(x + 162, y + 160, 4);
            }
        }
        s += '<rect width="1600" height="900" fill="url(#foco)"/>';
        // tiras de luz neón en la pared
        s += '<rect x="120" y="196" width="1360" height="4" rx="2" fill="url(#neon)" opacity="0.45"/>' +
            '<rect x="120" y="740" width="1360" height="4" rx="2" fill="url(#neon)" opacity="0.35"/>';
        // tuberías secundarias arriba y abajo
        s += '<rect x="0" y="92" width="1600" height="30" fill="url(#tuboBg)"/>' +
            '<rect x="0" y="96" width="1600" height="5" fill="#8fb0ff" opacity="0.25"/>';
        for (var j = 0; j < 9; j++) {
            var jx = 60 + j * 190;
            s += '<rect x="' + jx + '" y="86" width="26" height="42" rx="5" fill="#5370b0" stroke="#22397a" stroke-width="3"/>';
        }
        s += '<rect x="60" y="0" width="28" height="900" fill="url(#tuboBgV)"/><rect x="1512" y="0" width="28" height="900" fill="url(#tuboBgV)"/>' +
            '<rect x="110" y="0" width="16" height="900" fill="url(#tuboBgV)" opacity="0.7"/><rect x="1474" y="0" width="16" height="900" fill="url(#tuboBgV)" opacity="0.7"/>';
        [180, 420, 660].forEach(function (yy) {
            s += '<rect x="54" y="' + yy + '" width="40" height="22" rx="5" fill="#5370b0" stroke="#22397a" stroke-width="3"/>' +
                '<rect x="1506" y="' + (yy + 60) + '" width="40" height="22" rx="5" fill="#5370b0" stroke="#22397a" stroke-width="3"/>';
        });
        // pantallas e indicadores
        s += pantalla(230, 18, 150, 56, "onda", r) + pantalla(410, 18, 104, 56, "barras", r) +
            pantalla(1090, 18, 104, 56, "radar", r) + pantalla(940, 18, 124, 56, "barras", r);
        // consolas y engranajes del fondo (los que giran los pone la escena)
        s += '<g opacity="0.55">' +
            '<path d="' + engranajeRuta(1460, 330, 70, 12, 22) + '" fill="#1d3577" fill-rule="evenodd"/>' +
            '<path d="' + engranajeRuta(140, 560, 60, 10, 18) + '" fill="#1d3577" fill-rule="evenodd"/>' +
            '</g>';
        // suelo de rejilla con franjas de seguridad
        s += '<rect x="0" y="790" width="1600" height="110" fill="url(#suelo)"/>' +
            '<rect x="0" y="788" width="1600" height="6" fill="#3bdcff" opacity="0.35"/>';
        for (var g = 0; g < 40; g++) s += '<line x1="' + (g * 42) + '" y1="800" x2="' + (g * 42 - 30) + '" y2="900" stroke="#23397a" stroke-width="3"/>';
        for (var h2 = 0; h2 < 3; h2++) s += '<line x1="0" y1="' + (820 + h2 * 28) + '" x2="1600" y2="' + (820 + h2 * 28) + '" stroke="#23397a" stroke-width="2"/>';
        for (var k = 0; k < 16; k++) s += '<path d="M' + (k * 100) + ' 878 l40 0 l-20 22 l-40 0 Z" fill="#ffd43b" opacity="0.18"/>';
        // lucecitas de estado en la pared
        for (var l = 0; l < 26; l++) {
            var lx = 150 + r() * 1300, ly = 140 + r() * 620;
            var col = ["#3bdcff", "#c77dff", "#ffd43b", "#ff6bd6"][l % 4];
            s += '<circle cx="' + lx.toFixed(0) + '" cy="' + ly.toFixed(0) + '" r="3" fill="' + col + '" opacity="0.5"/>';
        }
        return svg(1600, 900, s);
    }

    // ------------------------------------------------------------------ generador de luz (izquierda)

    function generador() {
        var s = '<defs>' +
            '<linearGradient id="gm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b3f7c"/><stop offset="0.35" stop-color="#7d9ad8"/><stop offset="0.6" stop-color="#4b67aa"/><stop offset="1" stop-color="#1c2c60"/></linearGradient>' +
            '<linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ff3ff" stop-opacity="0.9"/><stop offset="0.5" stop-color="#3bdcff" stop-opacity="0.55"/><stop offset="1" stop-color="#7b2ff7" stop-opacity="0.7"/></linearGradient>' +
            '<linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f7cc2"/><stop offset="1" stop-color="#1e2f66"/></linearGradient>' +
            '<radialGradient id="gc" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#ff9bf0"/><stop offset="1" stop-color="#c026d3" stop-opacity="0"/></radialGradient>' +
            '</defs>';
        // base
        s += '<path d="M14 268 L166 268 L176 292 L4 292 Z" fill="#1b2a5c" stroke="#0b1636" stroke-width="3"/>' +
            '<rect x="22" y="246" width="136" height="26" rx="8" fill="url(#gb)" stroke="#0b1636" stroke-width="3"/>';
        // cuerpo y cámara de energía
        s += '<rect x="34" y="36" width="112" height="214" rx="26" fill="url(#gm)" stroke="#0b1636" stroke-width="4"/>' +
            '<rect x="52" y="64" width="76" height="158" rx="20" fill="#071436" stroke="#9ff3ff" stroke-width="3"/>' +
            '<rect x="58" y="70" width="64" height="146" rx="16" fill="url(#gv)" opacity="0.55"/>' +
            '<path d="M90 92 L108 128 L90 196 L72 128 Z" fill="#ff8af0" stroke="#fff" stroke-width="3" stroke-linejoin="round" opacity="0.9"/>' +
            '<path d="M90 92 L108 128 L90 140 Z" fill="#ffd6fa"/>' +
            '<rect x="64" y="78" width="10" height="124" rx="5" fill="#fff" opacity="0.35"/>';
        // anillos metálicos
        [60, 120, 180, 232].forEach(function (y) {
            s += '<rect x="26" y="' + (y - 8) + '" width="128" height="16" rx="8" fill="#6f8ed4" stroke="#0b1636" stroke-width="3"/>' +
                '<rect x="32" y="' + (y - 5) + '" width="116" height="4" rx="2" fill="#c3d6ff" opacity="0.7"/>';
        });
        // tapa con bobina y lucecitas
        s += '<rect x="48" y="10" width="84" height="32" rx="12" fill="url(#gb)" stroke="#0b1636" stroke-width="3"/>' +
            '<circle cx="68" cy="26" r="6" fill="#ffd43b"/><circle cx="90" cy="26" r="6" fill="#3bdcff"/><circle cx="112" cy="26" r="6" fill="#ff6bd6"/>';
        // boca de salida (donde nace la tubería)
        s += '<rect x="136" y="114" width="42" height="72" rx="12" fill="url(#gb)" stroke="#0b1636" stroke-width="4"/>' +
            '<rect x="142" y="124" width="30" height="52" rx="8" fill="#0a1d48" stroke="#3bdcff" stroke-width="3"/>' +
            '<circle cx="157" cy="150" r="10" fill="url(#gc)"/>';
        // rótulo
        s += '<rect x="44" y="296" width="0" height="0"/>';
        return svg(GEN.w, GEN.h, s);
    }

    // ------------------------------------------------------------------ reactor (derecha)

    function reactor() {
        var s = '<defs>' +
            '<linearGradient id="rm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22356f"/><stop offset="0.4" stop-color="#7590d0"/><stop offset="0.7" stop-color="#4560a4"/><stop offset="1" stop-color="#1a2a5e"/></linearGradient>' +
            '<linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f7cc2"/><stop offset="1" stop-color="#1e2f66"/></linearGradient>' +
            '</defs>';
        // pie
        s += '<path d="M30 310 L180 310 L196 336 L14 336 Z" fill="#1b2a5c" stroke="#0b1636" stroke-width="3"/>' +
            '<rect x="40" y="286" width="130" height="28" rx="8" fill="url(#rb)" stroke="#0b1636" stroke-width="3"/>';
        // cuerpo cilíndrico
        s += '<rect x="36" y="40" width="148" height="252" rx="40" fill="url(#rm)" stroke="#0b1636" stroke-width="4"/>' +
            '<rect x="48" y="52" width="10" height="226" rx="5" fill="#c3d6ff" opacity="0.35"/>';
        // ventana del núcleo (el núcleo y el anillo los pone la escena encima)
        s += '<circle cx="110" cy="170" r="66" fill="#0a1638" stroke="#0b1636" stroke-width="5"/>' +
            '<circle cx="110" cy="170" r="58" fill="#071230" stroke="#5f7cc2" stroke-width="4"/>';
        // bandas y pernos
        [62, 270].forEach(function (y) {
            s += '<rect x="30" y="' + (y - 9) + '" width="160" height="18" rx="9" fill="#6f8ed4" stroke="#0b1636" stroke-width="3"/>';
            for (var i = 0; i < 6; i++) s += perno(48 + i * 25, y, 3.5);
        });
        // tapa con antena
        s += '<rect x="70" y="14" width="80" height="30" rx="10" fill="url(#rb)" stroke="#0b1636" stroke-width="3"/>' +
            '<rect x="106" y="0" width="8" height="18" rx="3" fill="#6f8ed4"/>';
        // boca de entrada a la izquierda
        s += '<rect x="0" y="134" width="46" height="72" rx="12" fill="url(#rb)" stroke="#0b1636" stroke-width="4"/>' +
            '<rect x="6" y="144" width="34" height="52" rx="8" fill="#0a1d48" stroke="#3bdcff" stroke-width="3"/>';
        // medidor de energía (las barras las enciende la escena)
        s += '<rect x="150" y="96" width="26" height="148" rx="8" fill="#061230" stroke="#31478a" stroke-width="3"/>';
        return svg(REA.w, REA.h, s);
    }

    function nucleo() {
        return svg(140, 140, '<defs><radialGradient id="n" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="#ffe3fb"/><stop offset="0.6" stop-color="#ff6bd6"/><stop offset="0.85" stop-color="#7b2ff7" stop-opacity="0.6"/><stop offset="1" stop-color="#3bdcff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="70" cy="70" r="68" fill="url(#n)"/>');
    }

    function anillo() {
        var s = '<circle cx="70" cy="70" r="56" fill="none" stroke="#3bdcff" stroke-width="6" stroke-dasharray="22 12" stroke-linecap="round"/>' +
            '<circle cx="70" cy="70" r="44" fill="none" stroke="#c77dff" stroke-width="4" stroke-dasharray="8 10" stroke-linecap="round"/>';
        return svg(140, 140, s);
    }

    function engranaje(col) {
        return svg(160, 160, '<path d="' + engranajeRuta(80, 80, 74, 12, 22) + '" fill="' + col + '" fill-rule="evenodd" stroke="#0b1636" stroke-width="4"/>' +
            '<circle cx="80" cy="80" r="44" fill="none" stroke="#0b1636" stroke-width="3" opacity="0.5"/>' +
            '<circle cx="80" cy="80" r="10" fill="#0b1636"/>');
    }

    // ------------------------------------------------------------------ gema de energía

    function gema() {
        var s = '<defs>' +
            '<linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd1fb"/><stop offset="1" stop-color="#d946ef"/></linearGradient>' +
            '<linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e879f9"/><stop offset="1" stop-color="#7e22ce"/></linearGradient>' +
            '<linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c026d3"/><stop offset="1" stop-color="#581c87"/></linearGradient>' +
            '</defs>';
        // corona y pabellón facetados
        s += '<path d="M30 40 L50 22 L78 22 L98 40 L64 108 Z" fill="url(#g3)" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M30 40 L98 40 L64 108 Z" fill="url(#g2)"/>' +
            '<path d="M30 40 L50 22 L56 40 Z" fill="#f5d0fe"/>' +
            '<path d="M56 40 L64 22 L72 40 Z" fill="url(#g1)"/>' +
            '<path d="M72 40 L78 22 L98 40 Z" fill="#c084fc"/>' +
            '<path d="M50 22 L64 22 L56 40 Z" fill="#ffffff" opacity="0.85"/>' +
            '<path d="M30 40 L56 40 L64 108 Z" fill="#f0abfc" opacity="0.75"/>' +
            '<path d="M72 40 L98 40 L64 108 Z" fill="#7e22ce" opacity="0.55"/>' +
            '<path d="M30 40 L50 22 L78 22 L98 40 L64 108 Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M42 46 L58 46 L60 70" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>';
        return svg(128, 128, s);
    }

    function halo() {
        return svg(200, 200, '<defs><radialGradient id="h" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.25" stop-color="#ffffff" stop-opacity="0.6"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="100" cy="100" r="100" fill="url(#h)"/>');
    }

    function aro() {
        return svg(200, 200, '<circle cx="100" cy="100" r="88" fill="none" stroke="#fff" stroke-width="10"/>');
    }

    // ------------------------------------------------------------------ checkpoints y partículas

    /** Collar de la tubería en un checkpoint: banda metálica que cruza el tubo (vertical: la escena la gira). */
    function collar() {
        var s = '<defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b3f7c"/><stop offset="0.45" stop-color="#a9c0f0"/><stop offset="1" stop-color="#22356f"/></linearGradient></defs>' +
            '<rect x="4" y="2" width="32" height="156" rx="10" fill="url(#c)" stroke="#0b1636" stroke-width="4"/>' +
            '<rect x="10" y="16" width="20" height="128" rx="6" fill="none" stroke="#0b1636" stroke-width="2" opacity="0.4"/>' +
            perno(20, 12, 4) + perno(20, 148, 4);
        return svg(40, 160, s);
    }

    function led() {
        return svg(48, 48, '<circle cx="24" cy="24" r="20" fill="#0b1636"/><circle cx="24" cy="24" r="15" fill="#fff"/><circle cx="19" cy="19" r="5" fill="#fff" opacity="0.9"/>');
    }

    function punto() {
        return svg(48, 48, '<defs><radialGradient id="p" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="24" cy="24" r="24" fill="url(#p)"/>');
    }

    function chispa() {
        return svg(64, 64, '<path d="M32 2 L37 27 L62 32 L37 37 L32 62 L27 37 L2 32 L27 27 Z" fill="#fff"/>');
    }

    function estrella() {
        return svg(64, 64, '<path d="M32 4 L40 24 L61 25 L44 38 L50 59 L32 47 L14 59 L20 38 L3 25 L24 24 Z" fill="#fff"/>');
    }

    function rayo() {
        return svg(240, 40, '<defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.25" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
            '<path d="M0 20 L240 14 L240 26 Z" fill="url(#r)"/>');
    }

    /** Ranura de la consola de niveles (gema apagada). */
    function ranura() {
        return svg(72, 72, '<circle cx="36" cy="36" r="32" fill="#0a1638" stroke="#31478a" stroke-width="4"/>' +
            '<path d="M22 30 L30 22 L42 22 L50 30 L36 56 Z" fill="none" stroke="#5f7cc2" stroke-width="3" stroke-linejoin="round" stroke-dasharray="4 4"/>');
    }

    function lista() {
        return [
            ["taller", taller(), 1],
            ["generador", generador(), 1.6],
            ["reactor", reactor(), 1.6],
            ["nucleo", nucleo(), 1.4],
            ["anillo", anillo(), 1.6],
            ["engranaje-a", engranaje("#2a4486"), 1.2],
            ["engranaje-b", engranaje("#3a2f7c"), 1.2],
            ["gema", gema(), 1.6],
            ["halo", halo(), 1],
            ["aro", aro(), 1],
            ["collar", collar(), 1.6],
            ["led", led(), 1.6],
            ["punto", punto(), 1],
            ["chispa", chispa(), 1],
            ["estrella", estrella(), 1],
            ["rayo", rayo(), 1],
            ["ranura", ranura(), 1.4]
        ];
    }

    function rasterizar(clave, s, res) {
        return new Promise(function (resolve) {
            var m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(s);
            var w = m ? Number(m[1]) : 100, h = m ? Number(m[2]) : 100;
            var k = res || 1;
            var img = new Image();
            var hecho = function (ok) {
                var c = document.createElement("canvas");
                c.width = Math.ceil(w * k);
                c.height = Math.ceil(h * k);
                if (ok) c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                cache[clave] = c;
                resoluciones[clave] = k;
                resolve();
            };
            img.onload = function () { hecho(true); };
            img.onerror = function () {
                console.warn("[DibujosTuberia] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    // ------------------------------------------------------------------ la tubería (Canvas 2D)

    function trazar(ctx, m, desde, hasta, off) {
        ctx.beginPath();
        var paso = 2;
        var i0 = Math.max(0, desde | 0), i1 = Math.min(m.length - 1, hasta == null ? m.length - 1 : hasta | 0);
        for (var i = i0; i <= i1; i += paso) {
            var p = m[i];
            var x = p.x, y = p.y;
            if (off) {
                x += Math.sin(p.ang) * off;
                y -= Math.cos(p.ang) * off;
            }
            if (i === i0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        var z = m[i1];
        ctx.lineTo(z.x + (off ? Math.sin(z.ang) * off : 0), z.y - (off ? Math.cos(z.ang) * off : 0));
    }

    function capa(ctx, m, ancho, color, alpha, off, sombra) {
        ctx.save();
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = ancho;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (sombra) {
            ctx.shadowColor = sombra.color;
            ctx.shadowBlur = sombra.blur;
            ctx.shadowOffsetY = sombra.dy || 0;
        }
        trazar(ctx, m, 0, null, off);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Tubería de un nivel en un lienzo de 1600 × 900: sombra, cuerpo metálico, cristal, carril interior, reflejos,
     * uniones metálicas cada ~240 de recorrido y la guía de puntos rosados que se van a iluminar.
     */
    function tubo(red, k) {
        k = k || 1;
        var c = document.createElement("canvas");
        c.width = Math.ceil(1600 * k);
        c.height = Math.ceil(900 * k);
        var ctx = c.getContext("2d");
        ctx.scale(k, k);
        var m = red.muestras, a = red.ancho;
        capa(ctx, m, a + 54, "rgba(3, 8, 30, 0.55)", 1, 0, { color: "rgba(0, 0, 0, 0.6)", blur: 24, dy: 14 });
        capa(ctx, m, a + 44, "#0b1636");
        capa(ctx, m, a + 38, "#3a5596");
        capa(ctx, m, a + 30, "#7d9ad8", 0.9, -3);
        capa(ctx, m, a + 22, "#1b2f66");
        capa(ctx, m, a + 16, "#7fe8ff", 0.85, 0, { color: "#3bdcff", blur: 18 });
        capa(ctx, m, a + 6, "#0e2a63");
        capa(ctx, m, a, "#081a45");
        capa(ctx, m, a * 0.62, "#12347a", 0.85);
        capa(ctx, m, a * 0.2, "#3bdcff", 0.12);
        // reflejo del cristal arriba del eje
        capa(ctx, m, 5, "#e3fafc", 0.45, a * 0.36);
        capa(ctx, m, 3, "#e3fafc", 0.25, -a * 0.38);
        // uniones metálicas
        var cada = 240;
        for (var s = cada * 0.6; s < red.largo - 60; s += cada) {
            var i = Math.round(s / red.paso);
            var p = m[Math.min(m.length - 1, i)];
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.ang);
            ctx.fillStyle = "#0b1636";
            ctx.fillRect(-11, -(a / 2 + 26), 22, a + 52);
            var gr = ctx.createLinearGradient(-9, 0, 9, 0);
            gr.addColorStop(0, "#2b3f7c");
            gr.addColorStop(0.45, "#a9c0f0");
            gr.addColorStop(1, "#22356f");
            ctx.fillStyle = gr;
            ctx.fillRect(-8, -(a / 2 + 23), 16, a + 46);
            ctx.fillStyle = "#5d78b8";
            ctx.beginPath();
            ctx.arc(0, -(a / 2 + 15), 3.5, 0, Math.PI * 2);
            ctx.arc(0, a / 2 + 15, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        // guía de puntos rosados por el centro
        ctx.save();
        ctx.fillStyle = "#ff8af0";
        ctx.shadowColor = "#ff6bd6";
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.55;
        for (var q = 40; q < red.largo - 20; q += 30) {
            var pp = m[Math.min(m.length - 1, Math.round(q / red.paso))];
            ctx.beginPath();
            ctx.arc(pp.x, pp.y, 4.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        return c;
    }

    global.DibujosTuberia = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        tubo: tubo,
        GEN: GEN,
        REA: REA,
        svgTaller: taller,
        svgGema: gema,
        svgGenerador: generador,
        svgReactor: reactor
    };
})(typeof window !== "undefined" ? window : global);
