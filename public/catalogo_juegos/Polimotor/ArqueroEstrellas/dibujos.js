/**
 * DibujosArquero — dibujos propios de "El Arquero de las Estrellas" (window.DibujosArquero).
 *
 * Todo es SVG propio rasterizado UNA vez a <canvas> por preparar(); la escena los convierte en texturas.
 * Las piezas de luz (chispas, halos, anillos, nebulosas, haces, chevrones) se dibujan en blanco y Phaser las tiñe.
 * La diana, la flecha, la empuñadura del arco, las columnas, los banderines y los trofeos llevan su color propio.
 * Las palas del arco y la cuerda NO son imágenes: la escena las dibuja cada cuadro para que se deformen al tensar.
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

    function roca(cx, cy, r, n, rnd, var_) {
        var p = [];
        for (var i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2;
            var rr = r * (1 - (var_ || 0.14) + rnd() * (var_ || 0.14) * 2);
            p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
        }
        return p;
    }

    function rutaSuave(p) {
        var n = p.length, d = "";
        for (var i = 0; i < n; i++) {
            var a = p[i], b = p[(i + 1) % n];
            var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
            if (!i) {
                var z = p[n - 1];
                d += "M" + f1((z[0] + a[0]) / 2) + " " + f1((z[1] + a[1]) / 2);
            }
            d += " Q" + f1(a[0]) + " " + f1(a[1]) + " " + f1(mx) + " " + f1(my);
        }
        return d + " Z";
    }

    /** Estrella de n puntas (path). */
    function estrellaRuta(cx, cy, rExt, rInt, n, giro) {
        var d = "";
        for (var i = 0; i < n * 2; i++) {
            var a = (giro || -Math.PI / 2) + i * Math.PI / n;
            var r = i % 2 ? rInt : rExt;
            d += (i ? " L" : "M") + f1(cx + Math.cos(a) * r) + " " + f1(cy + Math.sin(a) * r);
        }
        return d + " Z";
    }

    /** Sector de corona circular (para los gajos de los anillos de la diana). */
    function gajo(cx, cy, r0, r1, a0, a1) {
        var p = function (r, a) { return f1(cx + Math.cos(a) * r) + " " + f1(cy + Math.sin(a) * r); };
        var largo = a1 - a0 > Math.PI ? 1 : 0;
        return "M" + p(r1, a0) + " A" + r1 + " " + r1 + " 0 " + largo + " 1 " + p(r1, a1) +
            " L" + p(r0, a1) + " A" + r0 + " " + r0 + " 0 " + largo + " 0 " + p(r0, a0) + " Z";
    }

    // ------------------------------------------------------------------ espacio

    function cielo() {
        var rnd = semilla(5), estrellas = "";
        for (var i = 0; i < 240; i++) {
            var r = rnd() < 0.85 ? 0.8 + rnd() * 1.2 : 1.8 + rnd() * 1.4;
            estrellas += '<circle cx="' + f1(rnd() * 1600) + '" cy="' + f1(rnd() * 760) + '" r="' + f1(r) + '" fill="' + (rnd() < 0.2 ? "#c5d9ff" : (rnd() < 0.1 ? "#ffe8b0" : "#ffffff")) + '" opacity="' + f1(0.35 + rnd() * 0.6) + '"/>';
        }
        return svg(1600, 900,
            '<defs><radialGradient id="c" cx="0.62" cy="0.4" r="0.95"><stop offset="0" stop-color="#2f2a92"/><stop offset="0.45" stop-color="#18176a"/><stop offset="1" stop-color="#070b2e"/></radialGradient>' +
            '<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a1d8a" stop-opacity="0.5"/><stop offset="0.55" stop-color="#4a1d8a" stop-opacity="0"/><stop offset="1" stop-color="#0d3b66" stop-opacity="0.45"/></linearGradient></defs>' +
            '<rect width="1600" height="900" fill="url(#c)"/><rect width="1600" height="900" fill="url(#v)"/>' + estrellas);
    }

    function nebulosa() {
        return svg(512, 320,
            '<defs><radialGradient id="n" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<ellipse cx="256" cy="160" rx="254" ry="158" fill="url(#n)"/>' +
            '<ellipse cx="180" cy="130" rx="150" ry="90" fill="url(#n)" opacity="0.7"/>' +
            '<ellipse cx="340" cy="190" rx="140" ry="80" fill="url(#n)" opacity="0.6"/>');
    }

    function galaxia() {
        var rnd = semilla(9), p = "";
        for (var i = 0; i < 140; i++) {
            var brazo = i % 2, t = rnd() * 3.2;
            var a = t * 1.6 + brazo * Math.PI;
            var r = 12 + t * 34;
            p += '<circle cx="' + f1(150 + Math.cos(a) * r + (rnd() - 0.5) * 14) + '" cy="' + f1(150 + Math.sin(a) * r * 0.55 + (rnd() - 0.5) * 8) + '" r="' + f1(1 + rnd() * 2.2) + '" fill="#fff" opacity="' + f1(0.3 + rnd() * 0.6) + '"/>';
        }
        return svg(300, 300,
            '<defs><radialGradient id="g" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.25" stop-color="#fff" stop-opacity="0.4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<ellipse cx="150" cy="150" rx="140" ry="80" fill="url(#g)" opacity="0.7"/>' + p +
            '<circle cx="150" cy="150" r="16" fill="#fff"/>');
    }

    function planeta(c1, c2, c3, anillo) {
        var bandas = "";
        [[-40, 14], [-10, 10], [22, 16], [52, 9]].forEach(function (b) {
            bandas += '<ellipse cx="150" cy="' + (150 + b[0]) + '" rx="120" ry="' + b[1] + '" fill="' + c3 + '" opacity="0.35"/>';
        });
        var ani = anillo ? '<ellipse cx="150" cy="150" rx="146" ry="34" fill="none" stroke="' + anillo + '" stroke-width="12" opacity="0.85" transform="rotate(-14 150 150)"/>' : "";
        var aniFrente = anillo ? '<path d="M8 168 A146 34 0 0 0 292 132" fill="none" stroke="' + anillo + '" stroke-width="12" opacity="0.95" transform="rotate(-14 150 150)"/>' : "";
        return svg(300, 300,
            '<defs><radialGradient id="p" cx="0.36" cy="0.32" r="0.8"><stop offset="0" stop-color="' + c1 + '"/><stop offset="0.6" stop-color="' + c2 + '"/><stop offset="1" stop-color="#0b0d33"/></radialGradient>' +
            '<clipPath id="k"><circle cx="150" cy="150" r="96"/></clipPath>' +
            '<radialGradient id="a" cx="0.5" cy="0.5" r="0.5"><stop offset="0.8" stop-color="' + c1 + '" stop-opacity="0.45"/><stop offset="1" stop-color="' + c1 + '" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="150" cy="150" r="118" fill="url(#a)"/>' + ani +
            '<circle cx="150" cy="150" r="96" fill="url(#p)"/>' +
            '<g clip-path="url(#k)">' + bandas + "</g>" + aniFrente +
            '<ellipse cx="116" cy="104" rx="30" ry="14" fill="#fff" opacity="0.28" transform="rotate(-30 116 104)"/>');
    }

    function luna() {
        return svg(140, 140,
            '<defs><radialGradient id="l" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#f1f3ff"/><stop offset="0.7" stop-color="#a9b0d6"/><stop offset="1" stop-color="#4a5088"/></radialGradient></defs>' +
            '<circle cx="70" cy="70" r="60" fill="url(#l)"/>' +
            '<circle cx="52" cy="58" r="11" fill="#8a91c2" opacity="0.6"/><circle cx="88" cy="86" r="14" fill="#8a91c2" opacity="0.5"/><circle cx="84" cy="42" r="6" fill="#8a91c2" opacity="0.55"/>');
    }

    function asteroide(k) {
        var rnd = semilla(41 + k * 13);
        return svg(120, 120, '<path d="' + rutaSuave(roca(60, 60, 50, 9, rnd, 0.22)) + '" fill="#fff"/>' +
            '<circle cx="46" cy="50" r="9" fill="#000" opacity="0.18"/><circle cx="74" cy="72" r="7" fill="#000" opacity="0.18"/>');
    }

    // ------------------------------------------------------------------ luces (blancas: Phaser las tiñe)

    function chispa() { return svg(64, 64, '<path d="M32 2 Q36 28 62 32 Q36 36 32 62 Q28 36 2 32 Q28 28 32 2 Z" fill="#fff"/>'); }

    function punto() {
        return svg(32, 32, '<defs><radialGradient id="p"><stop offset="0" stop-color="#fff"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="16" cy="16" r="16" fill="url(#p)"/>');
    }

    function luz() {
        return svg(128, 128, '<defs><radialGradient id="l"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="64" fill="url(#l)"/>');
    }

    /** Aro fino de 200 × 200 (radio 90): ondas de luz y destellos de anillo. */
    function aro() {
        return svg(200, 200, '<circle cx="100" cy="100" r="88" fill="none" stroke="#fff" stroke-width="10"/><circle cx="100" cy="100" r="96" fill="none" stroke="#fff" stroke-width="4" opacity="0.4"/>');
    }

    /** Corona luminosa (para iluminar un anillo concreto de la diana): radio exterior 100, interior 72. */
    function corona() {
        return svg(200, 200,
            '<defs><radialGradient id="c" cx="0.5" cy="0.5" r="0.5"><stop offset="0.7" stop-color="#fff" stop-opacity="0"/><stop offset="0.8" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.93" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="100" cy="100" r="100" fill="url(#c)"/>');
    }

    function fugaz() {
        return svg(260, 20, '<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient></defs><rect x="0" y="7" width="256" height="6" rx="3" fill="url(#f)"/><circle cx="252" cy="10" r="6" fill="#fff"/>');
    }

    /** Marca de llegada de la curva predictiva. */
    function reticula() {
        return svg(120, 120,
            '<circle cx="60" cy="60" r="40" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="20 12"/>' +
            '<circle cx="60" cy="60" r="9" fill="#fff"/>' +
            '<path d="M60 4 L60 22 M60 98 L60 116 M4 60 L22 60 M98 60 L116 60" stroke="#fff" stroke-width="6" stroke-linecap="round"/>');
    }

    /** Haz de luz de reflector (estrecho arriba): 240 × 640. */
    function haz() {
        return svg(240, 640,
            '<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="k" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
            '<mask id="m"><rect width="240" height="640" fill="url(#k)"/></mask></defs>' +
            '<path d="M104 0 L136 0 L240 640 L0 640 Z" fill="url(#h)" mask="url(#m)"/>');
    }

    /** Chevron (flecha de dirección) apuntando hacia arriba. */
    function chevron() {
        return svg(80, 56, '<path d="M8 48 L40 12 L72 48" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>');
    }

    /** Anillo decorativo que gira alrededor de la diana: arcos y puntas de flecha. */
    function anilloDeco() {
        var c = 160, r = 150, partes = "";
        for (var i = 0; i < 4; i++) {
            var a0 = i * Math.PI / 2 + 0.18, a1 = a0 + Math.PI / 2 - 0.5;
            var p0 = [c + Math.cos(a0) * r, c + Math.sin(a0) * r], p1 = [c + Math.cos(a1) * r, c + Math.sin(a1) * r];
            partes += '<path d="M' + f1(p0[0]) + " " + f1(p0[1]) + " A" + r + " " + r + " 0 0 1 " + f1(p1[0]) + " " + f1(p1[1]) + '" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>';
            // punta de flecha al final del arco (tangente)
            var t = [-Math.sin(a1), Math.cos(a1)], n = [Math.cos(a1), Math.sin(a1)];
            var q = [p1[0] + t[0] * 16, p1[1] + t[1] * 16];
            partes += '<path d="M' + f1(q[0]) + " " + f1(q[1]) + " L" + f1(p1[0] + n[0] * 12) + " " + f1(p1[1] + n[1] * 12) + " L" + f1(p1[0] - n[0] * 12) + " " + f1(p1[1] - n[1] * 12) + ' Z" fill="#fff"/>';
        }
        for (var k = 0; k < 24; k++) {
            var a = k / 24 * Math.PI * 2;
            partes += '<circle cx="' + f1(c + Math.cos(a) * (r - 14)) + '" cy="' + f1(c + Math.sin(a) * (r - 14)) + '" r="2.6" fill="#fff" opacity="0.7"/>';
        }
        return svg(320, 320, partes);
    }

    /** Estrella dorada de 5 puntas (celebraciones). */
    function estrella5() {
        return svg(120, 120,
            '<defs><radialGradient id="e" cx="0.45" cy="0.4" r="0.6"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.55" stop-color="#ffd43b"/><stop offset="1" stop-color="#f08c00"/></radialGradient></defs>' +
            '<path d="' + estrellaRuta(60, 62, 56, 24, 5) + '" fill="url(#e)" stroke="#fff3bf" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="' + estrellaRuta(60, 62, 30, 13, 5) + '" fill="#fff" opacity="0.45"/>');
    }

    // ------------------------------------------------------------------ escenario del torneo

    /** Piso de la arena (1600 × 210): borde de luz arriba y retícula en perspectiva. */
    function piso() {
        var lineas = "";
        for (var i = -10; i <= 10; i++) {
            lineas += '<line x1="' + f1(800 + i * 70) + '" y1="14" x2="' + f1(800 + i * 260) + '" y2="210" stroke="#63e6ff" stroke-width="2" opacity="' + f1(0.18 + (i % 2 ? 0 : 0.12)) + '"/>';
        }
        [40, 80, 130, 190].forEach(function (y, k) {
            lineas += '<line x1="0" y1="' + y + '" x2="1600" y2="' + y + '" stroke="#b197fc" stroke-width="' + (2 + k) + '" opacity="' + f1(0.16 + k * 0.05) + '"/>';
        });
        return svg(1600, 210,
            '<defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1f78"/><stop offset="0.5" stop-color="#160f4a"/><stop offset="1" stop-color="#0a0726"/></linearGradient>' +
            '<linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#63e6ff"/><stop offset="0.5" stop-color="#ffd43b"/><stop offset="1" stop-color="#f783ac"/></linearGradient></defs>' +
            '<rect y="10" width="1600" height="200" fill="url(#p)"/>' + lineas +
            '<rect y="4" width="1600" height="12" rx="6" fill="url(#b)"/>' +
            '<rect y="6" width="1600" height="4" fill="#fff" opacity="0.7"/>');
    }

    /** Plataforma del arquero (340 × 130), centro de apoyo en (170, 44). */
    function plataforma() {
        var luces = "";
        for (var i = 0; i < 9; i++) {
            var a = Math.PI * (0.1 + i * 0.1);
            luces += '<circle cx="' + f1(170 - Math.cos(a) * 150) + '" cy="' + f1(66 + Math.sin(a) * 30) + '" r="5" fill="' + (i % 2 ? "#63e6ff" : "#ffd43b") + '"/>';
        }
        return svg(340, 130,
            '<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c7cfa"/><stop offset="1" stop-color="#1b1464"/></linearGradient>' +
            '<radialGradient id="t" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#e5dbff"/><stop offset="0.6" stop-color="#7950f2"/><stop offset="1" stop-color="#3b1d9e"/></radialGradient></defs>' +
            '<ellipse cx="170" cy="78" rx="164" ry="46" fill="url(#m)"/>' +
            '<ellipse cx="170" cy="56" rx="160" ry="40" fill="url(#t)" stroke="#63e6ff" stroke-width="6"/>' +
            '<ellipse cx="170" cy="52" rx="110" ry="24" fill="none" stroke="#fff" stroke-width="3" opacity="0.55" stroke-dasharray="14 10"/>' + luces);
    }

    /** Columna de energía (100 × 440): base metálica, tubo de cristal y orbe arriba. */
    function columna() {
        return svg(100, 440,
            '<defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b2b8f"/><stop offset="0.5" stop-color="#9775fa"/><stop offset="1" stop-color="#2b1f6b"/></linearGradient>' +
            '<linearGradient id="v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#63e6ff" stop-opacity="0.25"/><stop offset="0.5" stop-color="#e3fafc" stop-opacity="0.85"/><stop offset="1" stop-color="#63e6ff" stop-opacity="0.25"/></linearGradient>' +
            '<radialGradient id="o" cx="0.4" cy="0.35" r="0.6"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#99e9f2"/><stop offset="1" stop-color="#1098ad"/></radialGradient></defs>' +
            '<rect x="10" y="380" width="80" height="60" rx="14" fill="url(#m)" stroke="#63e6ff" stroke-width="4"/>' +
            '<rect x="26" y="80" width="48" height="310" rx="24" fill="url(#v)" stroke="#c5f6fa" stroke-width="4"/>' +
            '<rect x="42" y="96" width="16" height="280" rx="8" fill="#fff" opacity="0.8"/>' +
            '<rect x="16" y="62" width="68" height="30" rx="12" fill="url(#m)" stroke="#63e6ff" stroke-width="4"/>' +
            '<circle cx="50" cy="38" r="30" fill="url(#o)" stroke="#fff" stroke-width="4"/>' +
            '<circle cx="40" cy="28" r="9" fill="#fff" opacity="0.75"/>');
    }

    /** Banderín del torneo (60 × 86) colgando del punto (30, 4). */
    function banderin(c1, c2) {
        return svg(60, 86,
            '<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
            '<path d="M4 6 L56 6 L30 82 Z" fill="url(#b)" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="' + estrellaRuta(30, 30, 12, 5, 5) + '" fill="#fff"/>' +
            '<rect x="2" y="0" width="56" height="9" rx="4" fill="#ffd43b"/>');
    }

    /** Trofeo dorado (140 × 180). */
    function trofeo() {
        return svg(140, 180,
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e67700"/><stop offset="0.35" stop-color="#ffe066"/><stop offset="0.6" stop-color="#fcc419"/><stop offset="1" stop-color="#d9480f"/></linearGradient>' +
            '<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7048e8"/><stop offset="1" stop-color="#3b1d9e"/></linearGradient></defs>' +
            '<path d="M30 30 Q4 30 6 52 Q8 78 40 84" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round"/>' +
            '<path d="M110 30 Q136 30 134 52 Q132 78 100 84" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round"/>' +
            '<path d="M24 16 L116 16 L108 70 Q100 104 70 108 Q40 104 32 70 Z" fill="url(#g)" stroke="#fff3bf" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="' + estrellaRuta(70, 58, 22, 9, 5) + '" fill="#fff" opacity="0.92"/>' +
            '<rect x="60" y="106" width="20" height="26" fill="url(#g)"/>' +
            '<rect x="36" y="130" width="68" height="16" rx="6" fill="url(#g)" stroke="#fff3bf" stroke-width="3"/>' +
            '<rect x="26" y="146" width="88" height="28" rx="8" fill="url(#b)" stroke="#ffd43b" stroke-width="4"/>' +
            '<ellipse cx="50" cy="34" rx="8" ry="16" fill="#fff" opacity="0.45"/>');
    }

    /** Pedestal holográfico (150 × 54). */
    function pedestal() {
        return svg(150, 54,
            '<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9775fa"/><stop offset="1" stop-color="#2b1f6b"/></linearGradient></defs>' +
            '<ellipse cx="75" cy="34" rx="70" ry="18" fill="url(#m)"/>' +
            '<ellipse cx="75" cy="24" rx="66" ry="16" fill="#3b2b8f" stroke="#63e6ff" stroke-width="4"/>' +
            '<ellipse cx="75" cy="22" rx="40" ry="8" fill="#99e9f2" opacity="0.5"/>');
    }

    // ------------------------------------------------------------------ el arco y la flecha

    /** Empuñadura del arco (90 × 130), centro en (45, 65); el frente mira a la derecha. */
    function empunadura() {
        return svg(90, 130,
            '<defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c3faa"/><stop offset="0.45" stop-color="#4dabf7"/><stop offset="1" stop-color="#1b2a7a"/></linearGradient>' +
            '<radialGradient id="n" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff"/><stop offset="0.45" stop-color="#99e9f2"/><stop offset="1" stop-color="#1098ad"/></radialGradient></defs>' +
            '<path d="M30 6 Q62 10 66 40 L70 90 Q66 122 30 124 Q20 104 24 65 Q20 26 30 6 Z" fill="url(#m)" stroke="#c5f6fa" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M38 18 Q54 22 56 42" fill="none" stroke="#b197fc" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M38 112 Q54 108 56 88" fill="none" stroke="#b197fc" stroke-width="5" stroke-linecap="round"/>' +
            '<circle cx="45" cy="65" r="17" fill="url(#n)" stroke="#fff" stroke-width="3"/>' +
            '<rect x="66" y="56" width="16" height="18" rx="5" fill="#ffd43b" stroke="#fff" stroke-width="2"/>');
    }

    /** Remate de la punta de una pala (orbe de energía). */
    function puntaArco() {
        return svg(44, 44,
            '<defs><radialGradient id="o" cx="0.4" cy="0.35" r="0.6"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#99e9f2"/><stop offset="1" stop-color="#7048e8"/></radialGradient></defs>' +
            '<circle cx="22" cy="22" r="17" fill="url(#o)" stroke="#fff" stroke-width="3"/>');
    }

    /** Flecha de energía (190 × 44) apuntando a la derecha; la punta está en (188, 22). */
    function flecha() {
        return svg(190, 44,
            '<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#99e9f2"/><stop offset="1" stop-color="#ffffff"/></linearGradient>' +
            '<linearGradient id="h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fcc419"/><stop offset="1" stop-color="#fff9db"/></linearGradient>' +
            '<linearGradient id="p" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f783ac"/><stop offset="1" stop-color="#9775fa"/></linearGradient></defs>' +
            '<rect x="14" y="17" width="146" height="10" rx="5" fill="url(#s)" stroke="#3bc9db" stroke-width="2"/>' +
            '<path d="M150 8 L188 22 L150 36 L158 22 Z" fill="url(#h)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M4 6 L40 18 L40 22 L10 18 Z" fill="url(#p)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>' +
            '<path d="M4 38 L40 26 L40 22 L10 26 Z" fill="url(#p)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>' +
            '<circle cx="14" cy="22" r="6" fill="#fff"/>');
    }

    // ------------------------------------------------------------------ la diana

    /**
     * Cara de la diana (320 × 320, centro 160, radio 150). Anillos: exterior turquesa/azul (10), medio violeta/rosa
     * (30) y centro dorado con estrella (50). Los gajos alternados dejan ver el giro; los radios coinciden con las
     * fracciones de las reglas (0,3 y 0,64 del radio).
     */
    function diana() {
        var c = 160, R = 150, r30 = R * 0.64, r50 = R * 0.3, g = "", i;
        for (i = 0; i < 12; i++) {
            var a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2;
            g += '<path d="' + gajo(c, c, r30, R, a0, a1) + '" fill="' + (i % 2 ? "#15aabf" : "#4dabf7") + '"/>';
        }
        for (i = 0; i < 8; i++) {
            var b0 = i / 8 * Math.PI * 2, b1 = (i + 1) / 8 * Math.PI * 2;
            g += '<path d="' + gajo(c, c, r50, r30, b0, b1) + '" fill="' + (i % 2 ? "#ae3ec9" : "#e64980") + '"/>';
        }
        var luces = "";
        for (i = 0; i < 16; i++) {
            var a = i / 16 * Math.PI * 2;
            luces += '<circle cx="' + f1(c + Math.cos(a) * (R - 3)) + '" cy="' + f1(c + Math.sin(a) * (R - 3)) + '" r="4.5" fill="' + (i % 2 ? "#fff" : "#ffd43b") + '"/>';
        }
        return svg(320, 320,
            '<defs><radialGradient id="o" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.45" stop-color="#ffd43b"/><stop offset="1" stop-color="#f08c00"/></radialGradient>' +
            '<radialGradient id="sombra" cx="0.5" cy="0.5" r="0.5"><stop offset="0.75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></radialGradient></defs>' +
            '<circle cx="160" cy="160" r="' + (R + 8) + '" fill="#1b1464"/>' + g +
            '<circle cx="160" cy="160" r="' + R + '" fill="url(#sombra)"/>' +
            '<circle cx="160" cy="160" r="' + f1(r50) + '" fill="url(#o)"/>' +
            '<path d="' + estrellaRuta(c, c + 2, r50 * 0.78, r50 * 0.34, 5) + '" fill="#fff" stroke="#f59f00" stroke-width="3" stroke-linejoin="round"/>' +
            '<circle cx="160" cy="160" r="' + f1(r30) + '" fill="none" stroke="#fff" stroke-width="5"/>' +
            '<circle cx="160" cy="160" r="' + f1(r50) + '" fill="none" stroke="#fff" stroke-width="5"/>' +
            '<circle cx="160" cy="160" r="' + R + '" fill="none" stroke="#c5f6fa" stroke-width="7"/>' + luces);
    }

    /** Icono pequeño de diana para los objetivos pendientes del HUD. */
    function mini() {
        return svg(64, 64,
            '<circle cx="32" cy="32" r="30" fill="#4dabf7" stroke="#fff" stroke-width="3"/>' +
            '<circle cx="32" cy="32" r="19" fill="#e64980" stroke="#fff" stroke-width="3"/>' +
            '<circle cx="32" cy="32" r="9" fill="#ffd43b" stroke="#fff" stroke-width="2"/>' +
            '<path d="M58 6 L36 28" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M58 6 L48 6 M58 6 L58 16" stroke="#f783ac" stroke-width="5" stroke-linecap="round"/>');
    }

    function lista() {
        var l = [
            ["cielo", cielo(), 1],
            ["nebulosa", nebulosa(), 1],
            ["galaxia", galaxia(), 1],
            ["planetaAzul", planeta("#a5d8ff", "#1c7ed6", "#e7f5ff", null), 1.2],
            ["planetaAnillo", planeta("#ffc9e3", "#c2255c", "#fff0f6", "#ffd8a8"), 1.2],
            ["planetaVerde", planeta("#c3fae8", "#0ca678", "#e6fcf5", null), 1.1],
            ["luna", luna(), 1.2],
            ["chispa", chispa(), 1.5],
            ["punto", punto(), 1.5],
            ["luz", luz(), 1],
            ["aro", aro(), 1.2],
            ["corona", corona(), 1.6],
            ["fugaz", fugaz(), 1],
            ["reticula", reticula(), 1.3],
            ["haz", haz(), 0.8],
            ["chevron", chevron(), 1.4],
            ["anilloDeco", anilloDeco(), 1.3],
            ["estrella5", estrella5(), 1.4],
            ["piso", piso(), 1],
            ["plataforma", plataforma(), 1.3],
            
            ["trofeo", trofeo(), 2],
            ["pedestal", pedestal(), 1.3],
            ["empunadura", empunadura(), 1.6],
            ["puntaArco", puntaArco(), 1.6],
            ["flecha", flecha(), 1.6],
            ["diana", diana(), 1.7],
            ["mini", mini(), 1.5]
        ];
        for (var a = 0; a < 3; a++) l.push(["asteroide" + a, asteroide(a), 1]);
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
                console.warn("[DibujosArquero] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    global.DibujosArquero = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        svgDiana: diana,
        svgFlecha: flecha,
        svgTrofeo: trofeo
    };
})(typeof window !== "undefined" ? window : globalThis);
