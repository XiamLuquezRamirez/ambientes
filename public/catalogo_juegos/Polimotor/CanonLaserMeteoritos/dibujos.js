/**
 * DibujosCanon — dibujos propios de "El Cañón Láser y los Meteoritos en Movimiento" (window.DibujosCanon).
 *
 * Todo es SVG propio rasterizado UNA vez a <canvas> por preparar(); la escena los convierte en texturas.
 * Las piezas de luz (chispas, halos, anillos, nebulosas, estelas, láser) se dibujan en blanco y Phaser las tiñe.
 * Los meteoritos, planetas, el cañón, la plataforma, la consola, la rueda de giro y el botón llevan su color propio.
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

    function puntos(p) { return p.map(function (q) { return f1(q[0]) + "," + f1(q[1]); }).join(" "); }

    /** Contorno irregular de roca (n vértices alrededor de un círculo). */
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
        // curva cerrada que pasa por los puntos medios (bordes redondeados)
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

    // ------------------------------------------------------------------ meteoritos

    var METEOROS = {
        dorado: { roca: "#c98a1b", rocaOsc: "#7a4a08", luz: "#ffe27a", nucleo: "#fff6c4", brillo: "#ffd43b", grieta: "#fff1a1" },
        azul: { roca: "#3d63c9", rocaOsc: "#1e2f78", luz: "#8fd3ff", nucleo: "#e3f6ff", brillo: "#4dabf7", grieta: "#bfe9ff" },
        naranja: { roca: "#c8561c", rocaOsc: "#6e2508", luz: "#ffb36b", nucleo: "#fff0dc", brillo: "#ff922b", grieta: "#ffd8a8" },
        violeta: { roca: "#7a46c9", rocaOsc: "#3b1c7a", luz: "#d0a8ff", nucleo: "#f5ecff", brillo: "#b197fc", grieta: "#e5d4ff" }
    };

    /** Meteorito de roca luminosa: 220 × 220, radio visual ≈ 80 (centro 110,110). */
    function meteorito(tipo, k) {
        var c = METEOROS[tipo] || METEOROS.dorado;
        var rnd = semilla(17 + k * 31);
        var cuerpo = rutaSuave(roca(110, 110, 80, 11, rnd, 0.12));
        var crateres = "";
        [[84, 82, 15], [132, 92, 11], [100, 138, 13], [140, 134, 8], [70, 120, 7]].forEach(function (q, i) {
            var dx = (rnd() - 0.5) * 8, dy = (rnd() - 0.5) * 8;
            crateres += '<ellipse cx="' + f1(q[0] + dx) + '" cy="' + f1(q[1] + dy) + '" rx="' + q[2] + '" ry="' + f1(q[2] * 0.8) + '" fill="' + c.rocaOsc + '" opacity="0.55"/>' +
                '<ellipse cx="' + f1(q[0] + dx - q[2] * 0.25) + '" cy="' + f1(q[1] + dy - q[2] * 0.3) + '" rx="' + f1(q[2] * 0.55) + '" ry="' + f1(q[2] * 0.35) + '" fill="' + c.luz + '" opacity="0.35"/>';
        });
        var grietas = '<path d="M74 104 L96 112 L104 98 L126 108 L146 100" stroke="' + c.grieta + '" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>' +
            '<path d="M104 112 L110 132 L124 140" stroke="' + c.grieta + '" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85"/>';
        return svg(220, 220,
            "<defs>" +
            '<radialGradient id="g" cx="0.38" cy="0.34" r="0.75"><stop offset="0" stop-color="' + c.luz + '"/><stop offset="0.45" stop-color="' + c.roca + '"/><stop offset="1" stop-color="' + c.rocaOsc + '"/></radialGradient>' +
            '<radialGradient id="h" cx="0.5" cy="0.5" r="0.5"><stop offset="0.55" stop-color="' + c.brillo + '" stop-opacity="0.55"/><stop offset="1" stop-color="' + c.brillo + '" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="n" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="' + c.nucleo + '" stop-opacity="0.95"/><stop offset="1" stop-color="' + c.nucleo + '" stop-opacity="0"/></radialGradient>' +
            "</defs>" +
            '<circle cx="110" cy="110" r="108" fill="url(#h)"/>' +
            '<path d="' + cuerpo + '" fill="url(#g)" stroke="' + c.rocaOsc + '" stroke-width="4"/>' +
            crateres + grietas +
            '<circle cx="108" cy="108" r="26" fill="url(#n)"/>' +
            '<ellipse cx="80" cy="66" rx="20" ry="9" fill="#ffffff" opacity="0.5" transform="rotate(-28 80 66)"/>');
    }

    /** Miniatura para el progreso del HUD (DOM). */
    function meteoritoMini(tipo, lleno) {
        var c = METEOROS[tipo] || METEOROS.dorado;
        var rnd = semilla(5);
        return svg(64, 64,
            '<defs><radialGradient id="g" cx="0.38" cy="0.34" r="0.75"><stop offset="0" stop-color="' + c.luz + '"/><stop offset="0.5" stop-color="' + c.roca + '"/><stop offset="1" stop-color="' + c.rocaOsc + '"/></radialGradient></defs>' +
            '<circle cx="32" cy="32" r="31" fill="' + c.brillo + '" opacity="' + (lleno ? 0.45 : 0.15) + '"/>' +
            '<path d="' + rutaSuave(roca(32, 32, 22, 9, rnd, 0.12)) + '" fill="url(#g)" stroke="' + c.rocaOsc + '" stroke-width="2.5"/>' +
            '<path d="M22 30 L30 33 L34 27 L42 31" stroke="' + c.grieta + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
    }

    /** Estela de fuego (blanca, se tiñe): 360 × 120, la cabeza a la derecha. */
    function estela() {
        return svg(360, 120,
            '<defs><linearGradient id="e" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.7" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0.95"/></linearGradient>' +
            '<linearGradient id="f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient></defs>' +
            '<path d="M0 60 Q180 18 360 14 L360 106 Q180 102 0 60 Z" fill="url(#e)"/>' +
            '<path d="M90 60 Q230 42 360 40 L360 80 Q230 78 90 60 Z" fill="url(#f)" opacity="0.8"/>');
    }

    // ------------------------------------------------------------------ espacio

    function cielo() {
        var rnd = semilla(3), estrellas = "";
        for (var i = 0; i < 260; i++) {
            var r = rnd() < 0.85 ? 0.8 + rnd() * 1.2 : 1.8 + rnd() * 1.4;
            estrellas += '<circle cx="' + f1(rnd() * 1600) + '" cy="' + f1(rnd() * 900) + '" r="' + f1(r) + '" fill="' + (rnd() < 0.2 ? "#c5d9ff" : (rnd() < 0.1 ? "#ffe8b0" : "#ffffff")) + '" opacity="' + f1(0.35 + rnd() * 0.6) + '"/>';
        }
        return svg(1600, 900,
            '<defs><radialGradient id="c" cx="0.5" cy="0.22" r="0.95"><stop offset="0" stop-color="#2a2a8a"/><stop offset="0.45" stop-color="#151a5c"/><stop offset="1" stop-color="#070b2e"/></radialGradient>' +
            '<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b1d7a" stop-opacity="0.45"/><stop offset="0.6" stop-color="#3b1d7a" stop-opacity="0"/></linearGradient></defs>' +
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

    function asteroideLejano(k) {
        var rnd = semilla(41 + k * 13);
        return svg(120, 120, '<path d="' + rutaSuave(roca(60, 60, 50, 9, rnd, 0.22)) + '" fill="#fff"/>' +
            '<circle cx="46" cy="50" r="9" fill="#000" opacity="0.18"/><circle cx="74" cy="72" r="7" fill="#000" opacity="0.18"/>');
    }

    // ------------------------------------------------------------------ cañón y base

    /** Plataforma circular (vista en perspectiva) 520 × 200; centro de giro en (260, 92). */
    function plataforma() {
        var luces = "";
        for (var i = 0; i < 14; i++) {
            var a = Math.PI + i / 13 * Math.PI;
            luces += '<circle cx="' + f1(260 + Math.cos(a) * 205) + '" cy="' + f1(118 - Math.sin(a) * -48) + '" r="6" fill="#63e6ff"/>';
        }
        return svg(520, 200,
            '<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4a9a"/><stop offset="1" stop-color="#121a4d"/></linearGradient>' +
            '<radialGradient id="t" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#5c7cfa"/><stop offset="1" stop-color="#1b2470"/></radialGradient></defs>' +
            '<ellipse cx="260" cy="128" rx="256" ry="70" fill="url(#b)"/>' +
            '<ellipse cx="260" cy="110" rx="250" ry="64" fill="#1c2a78" stroke="#4dd9ff" stroke-width="5"/>' +
            '<ellipse cx="260" cy="104" rx="210" ry="50" fill="url(#t)" stroke="#2fe3ff" stroke-width="3" stroke-dasharray="18 10"/>' +
            '<ellipse cx="260" cy="100" rx="150" ry="34" fill="#13206a" stroke="#74c0fc" stroke-width="3"/>' +
            luces);
    }

    /** Torreta (base giratoria) 220 × 150; el pivote del tubo en (110, 60). */
    function torreta() {
        return svg(220, 150,
            '<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9d4ff"/><stop offset="0.5" stop-color="#4c6ef5"/><stop offset="1" stop-color="#1e2a7a"/></linearGradient></defs>' +
            '<path d="M18 128 Q18 52 110 40 Q202 52 202 128 Z" fill="url(#m)" stroke="#0b1450" stroke-width="5"/>' +
            '<path d="M36 120 Q40 70 110 60 Q180 70 184 120" fill="none" stroke="#63e6ff" stroke-width="5" opacity="0.85"/>' +
            '<rect x="10" y="118" width="200" height="24" rx="12" fill="#2b3a8f" stroke="#0b1450" stroke-width="4"/>' +
            '<circle cx="50" cy="130" r="5" fill="#ffe066"/><circle cx="110" cy="130" r="5" fill="#63e6ff"/><circle cx="170" cy="130" r="5" fill="#ffe066"/>');
    }

    /** Tubo del cañón 120 × 240, apuntando hacia arriba; pivote abajo en (60, 214), boca arriba en (60, 18). */
    function canonTubo() {
        return svg(120, 240,
            '<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e2a7a"/><stop offset="0.35" stop-color="#7aa2ff"/><stop offset="0.55" stop-color="#e3ecff"/><stop offset="1" stop-color="#2b3a8f"/></linearGradient>' +
            '<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c5f6fa"/><stop offset="1" stop-color="#15aabf"/></linearGradient></defs>' +
            '<rect x="26" y="40" width="68" height="180" rx="22" fill="url(#t)" stroke="#0b1450" stroke-width="5"/>' +
            '<rect x="46" y="54" width="28" height="150" rx="14" fill="url(#c)" opacity="0.9"/>' +
            '<rect x="18" y="86" width="84" height="18" rx="9" fill="#2fe3ff" stroke="#0b1450" stroke-width="4"/>' +
            '<rect x="18" y="138" width="84" height="18" rx="9" fill="#2fe3ff" stroke="#0b1450" stroke-width="4"/>' +
            '<rect x="14" y="10" width="92" height="40" rx="16" fill="url(#t)" stroke="#0b1450" stroke-width="5"/>' +
            '<ellipse cx="60" cy="20" rx="30" ry="9" fill="#e3fafc" stroke="#0b1450" stroke-width="3"/>' +
            '<ellipse cx="60" cy="20" rx="18" ry="5" fill="#2fe3ff"/>' +
            '<circle cx="60" cy="214" r="26" fill="#3b5bdb" stroke="#0b1450" stroke-width="5"/>' +
            '<circle cx="60" cy="214" r="11" fill="#ffe066"/>');
    }

    /** Consola de control a lo ancho: 1600 × 150. */
    function consola() {
        var luces = "", tubos = "";
        for (var i = 0; i < 26; i++) {
            var x = 30 + i * 62;
            if (x > 360 && x < 1240) continue;
            luces += '<rect x="' + x + '" y="62" width="34" height="12" rx="6" fill="' + (i % 3 ? "#2fe3ff" : "#ffd43b") + '" opacity="0.85"/>';
        }
        [[250, 40], [1350, 40]].forEach(function (q) {
            tubos += '<rect x="' + (q[0] - 90) + '" y="' + q[1] + '" width="180" height="14" rx="7" fill="#1c2a78" stroke="#4dd9ff" stroke-width="3"/>';
        });
        return svg(1600, 150,
            '<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3a96"/><stop offset="1" stop-color="#0b1240"/></linearGradient></defs>' +
            '<path d="M0 40 Q0 20 30 20 L560 20 Q620 20 650 0 L950 0 Q980 20 1040 20 L1570 20 Q1600 20 1600 40 L1600 150 L0 150 Z" fill="url(#c)" stroke="#4dd9ff" stroke-width="5"/>' +
            '<path d="M20 34 L560 34 Q620 34 650 14 L950 14 Q980 34 1040 34 L1580 34" fill="none" stroke="#9775fa" stroke-width="3" opacity="0.8"/>' +
            luces + tubos +
            '<rect x="40" y="96" width="300" height="26" rx="13" fill="#0b1240" stroke="#4dd9ff" stroke-width="3"/>' +
            '<rect x="1260" y="96" width="300" height="26" rx="13" fill="#0b1240" stroke="#4dd9ff" stroke-width="3"/>');
    }

    /** Rueda de giro (control de orientación) 260 × 170: semicírculo con escala; centro en (130, 140). */
    function rueda() {
        var marcas = "";
        for (var i = 0; i <= 14; i++) {
            var a = Math.PI + i / 14 * Math.PI;
            var r0 = i % 7 === 0 ? 96 : 104, r1 = 116;
            marcas += '<line x1="' + f1(130 + Math.cos(a) * r0) + '" y1="' + f1(140 + Math.sin(a) * r0) + '" x2="' + f1(130 + Math.cos(a) * r1) + '" y2="' + f1(140 + Math.sin(a) * r1) + '" stroke="' + (i % 7 === 0 ? "#ffe066" : "#74c0fc") + '" stroke-width="' + (i % 7 === 0 ? 5 : 3) + '" stroke-linecap="round"/>';
        }
        return svg(260, 170,
            '<defs><radialGradient id="r" cx="0.5" cy="0.85" r="0.9"><stop offset="0" stop-color="#3b5bdb"/><stop offset="1" stop-color="#0f1757"/></radialGradient></defs>' +
            '<path d="M6 150 A124 124 0 0 1 254 150 Z" fill="url(#r)" stroke="#4dd9ff" stroke-width="6"/>' +
            '<path d="M34 150 A96 96 0 0 1 226 150" fill="none" stroke="#2fe3ff" stroke-width="3" stroke-dasharray="6 8" opacity="0.6"/>' +
            marcas +
            '<path d="M26 150 L234 150" stroke="#4dd9ff" stroke-width="6" stroke-linecap="round"/>');
    }

    /** Perilla que se arrastra (60 × 60). */
    function perilla() {
        return svg(70, 70,
            '<defs><radialGradient id="p" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="#fffbe0"/><stop offset="0.5" stop-color="#ffd43b"/><stop offset="1" stop-color="#e67700"/></radialGradient></defs>' +
            '<circle cx="35" cy="35" r="31" fill="url(#p)" stroke="#ffffff" stroke-width="5"/>' +
            '<path d="M22 35 L30 27 M22 35 L30 43 M48 35 L40 27 M48 35 L40 43" stroke="#a35200" stroke-width="4" stroke-linecap="round"/>');
    }

    /** Botón de disparo (listo o cargando) 220 × 220. */
    function boton(cargando) {
        var c = cargando ? ["#a5b4fc", "#5c6bc0", "#283593"] : ["#fff3bf", "#ffb21e", "#e8590c"];
        return svg(220, 220,
            '<defs><radialGradient id="b" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="0.55" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></radialGradient></defs>' +
            '<circle cx="110" cy="116" r="96" fill="#0b1240" opacity="0.55"/>' +
            '<circle cx="110" cy="108" r="96" fill="url(#b)" stroke="#ffffff" stroke-width="8"/>' +
            '<circle cx="110" cy="108" r="80" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.5"/>' +
            '<path d="M122 36 L86 102 L110 102 L96 150 L136 84 L112 84 Z" fill="#ffffff" opacity="' + (cargando ? 0.55 : 0.95) + '" transform="translate(0 -6) scale(1 0.9) translate(0 4)"/>' +
            '<ellipse cx="80" cy="56" rx="34" ry="14" fill="#ffffff" opacity="0.35" transform="rotate(-30 80 56)"/>');
    }

    // ------------------------------------------------------------------ luces y partículas (blancas, se tiñen)

    function chispa() {
        return svg(64, 64, '<path d="M32 2 Q36 28 62 32 Q36 36 32 62 Q28 36 2 32 Q28 28 32 2 Z" fill="#fff"/>');
    }

    function punto() {
        return svg(32, 32, '<defs><radialGradient id="p"><stop offset="0" stop-color="#fff"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="16" cy="16" r="16" fill="url(#p)"/>');
    }

    function luz() {
        return svg(128, 128, '<defs><radialGradient id="l"><stop offset="0" stop-color="#fff" stop-opacity="0.95"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="64" fill="url(#l)"/>');
    }

    function anillo() {
        return svg(200, 200, '<circle cx="100" cy="100" r="88" fill="none" stroke="#fff" stroke-width="10"/><circle cx="100" cy="100" r="96" fill="none" stroke="#fff" stroke-width="4" opacity="0.4"/>');
    }

    /** Proyectil láser 120 × 40 apuntando a la derecha (núcleo blanco, halo que se tiñe). */
    function laser() {
        return svg(120, 40,
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient></defs>' +
            '<rect x="0" y="6" width="116" height="28" rx="14" fill="url(#g)" opacity="0.7"/>' +
            '<rect x="30" y="14" width="88" height="12" rx="6" fill="#fff"/>');
    }

    function fragmento(k) {
        var rnd = semilla(77 + k * 7);
        return svg(40, 40, '<polygon points="' + puntos(roca(20, 20, 16, 5, rnd, 0.35)) + '" fill="#fff"/>');
    }

    function fugaz() {
        return svg(260, 20, '<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient></defs><rect x="0" y="7" width="256" height="6" rx="3" fill="url(#f)"/><circle cx="252" cy="10" r="6" fill="#fff"/>');
    }

    function reticula() {
        return svg(120, 120,
            '<circle cx="60" cy="60" r="40" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="20 12"/>' +
            '<circle cx="60" cy="60" r="8" fill="#fff"/>' +
            '<path d="M60 4 L60 22 M60 98 L60 116 M4 60 L22 60 M98 60 L116 60" stroke="#fff" stroke-width="6" stroke-linecap="round"/>');
    }

    function flecha() {
        return svg(60, 60, '<path d="M14 10 L46 30 L14 50 L22 30 Z" fill="#fff"/>');
    }

    /** Coraza de un meteorito resistente (220 × 220, mismo centro y escala que el meteorito): placas de roca y metal. */
    function coraza() {
        var placas = "", remaches = "";
        var n = 8;
        for (var i = 0; i < n; i++) {
            var a0 = i / n * Math.PI * 2 + 0.08, a1 = (i + 1) / n * Math.PI * 2 - 0.08;
            var r0 = 66, r1 = 100;
            var p = [[110 + Math.cos(a0) * r0, 110 + Math.sin(a0) * r0], [110 + Math.cos(a0) * r1, 110 + Math.sin(a0) * r1],
                [110 + Math.cos((a0 + a1) / 2) * (r1 + 6), 110 + Math.sin((a0 + a1) / 2) * (r1 + 6)],
                [110 + Math.cos(a1) * r1, 110 + Math.sin(a1) * r1], [110 + Math.cos(a1) * r0, 110 + Math.sin(a1) * r0]];
            placas += '<polygon points="' + puntos(p) + '" fill="url(#pl)" stroke="#2b2f66" stroke-width="5" stroke-linejoin="round"/>';
            var am = (a0 + a1) / 2;
            remaches += '<circle cx="' + f1(110 + Math.cos(am) * 84) + '" cy="' + f1(110 + Math.sin(am) * 84) + '" r="5" fill="#e7f5ff" stroke="#2b2f66" stroke-width="2"/>';
        }
        return svg(220, 220,
            '<defs><linearGradient id="pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dbe4ff"/><stop offset="0.5" stop-color="#7d8fd6"/><stop offset="1" stop-color="#3b4a9e"/></linearGradient></defs>' +
            '<circle cx="110" cy="110" r="104" fill="none" stroke="#bac8ff" stroke-width="3" opacity="0.6"/>' + placas + remaches);
    }

    /** Escudito (cuántos disparos faltan): 56 × 64. */
    function escudo() {
        return svg(56, 64,
            '<defs><linearGradient id="e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7f5ff"/><stop offset="1" stop-color="#5c7cfa"/></linearGradient></defs>' +
            '<path d="M28 4 L52 12 Q52 44 28 60 Q4 44 4 12 Z" fill="url(#e)" stroke="#1b1464" stroke-width="5" stroke-linejoin="round"/>' +
            '<path d="M28 14 L42 19 Q41 38 28 48 Z" fill="#ffffff" opacity="0.55"/>');
    }

    // ------------------------------------------------------------------ catálogo

    function lista() {
        var l = [
            ["cielo", cielo(), 1],
            ["nebulosa", nebulosa(), 1],
            ["galaxia", galaxia(), 1],
            ["planetaAzul", planeta("#a5d8ff", "#1c7ed6", "#e7f5ff", null), 1.2],
            ["planetaAnillo", planeta("#ffc9e3", "#c2255c", "#fff0f6", "#ffd8a8"), 1.2],
            ["planetaVerde", planeta("#c3fae8", "#0ca678", "#e6fcf5", null), 1.1],
            ["luna", luna(), 1.2],
            ["plataforma", plataforma(), 1.2],
            ["torreta", torreta(), 1.4],
            ["canon", canonTubo(), 1.5],
            ["consola", consola(), 1],
            ["rueda", rueda(), 1.4],
            ["perilla", perilla(), 1.6],
            ["boton", boton(false), 1.3],
            ["botonCarga", boton(true), 1.3],
            ["estela", estela(), 1],
            ["chispa", chispa(), 1.5],
            ["punto", punto(), 1.5],
            ["luz", luz(), 1],
            ["anillo", anillo(), 1.2],
            ["laser", laser(), 1.5],
            ["fugaz", fugaz(), 1],
            ["reticula", reticula(), 1.3],
            ["coraza", coraza(), 1.3],
            ["escudo", escudo(), 1.6],
            ["flecha", flecha(), 1.3]
        ];
        for (var a = 0; a < 3; a++) l.push(["asteroide" + a, asteroideLejano(a), 1]);
        for (var f = 0; f < 3; f++) l.push(["fragmento" + f, fragmento(f), 1.5]);
        Object.keys(METEOROS).forEach(function (t) {
            l.push(["met_" + t, meteorito(t, 1), 1.3]);
            l.push(["mini_" + t, meteoritoMini(t, false), 1.5]);
        });
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
                console.warn("[DibujosCanon] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    global.DibujosCanon = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        tipos: function () { return Object.keys(METEOROS); },
        svgMeteorito: meteorito,
        svgMini: meteoritoMini
    };
})(typeof window !== "undefined" ? window : global);
