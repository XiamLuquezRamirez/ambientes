/**
 * DibujosArbol — dibujos SVG propios de "El Árbol de las Formas Mágicas" (window.DibujosArbol).
 *
 * Todo se dibuja aquí: bosque, árbol (tronco, ramas, copa), frutos, moldes, cojines de hojas,
 * decoración y partículas. preparar() rasteriza cada SVG a <canvas> una sola vez, a la resolución
 * que pide su uso (RES), y la escena los convierte en texturas de Phaser.
 *
 * Fruto y molde comparten la misma geometría (FORMAS): el cuerpo del fruto mide lo mismo que
 * la silueta del molde, así que al encajar coinciden borde con borde.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;

    // Lado del lienzo del fruto y centro de su cuerpo (el tallo y la hoja sobresalen por arriba).
    var FRUTO = { w: 170, h: 170, cx: 85, cy: 100 };
    var MOLDE = { w: 210, h: 210, c: 105 };

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    function semilla(s) {
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function r1(n) { return Math.round(n * 10) / 10; }

    // ------------------------------------------------------------------ geometría de las tres formas

    /**
     * Polígono con esquinas redondeadas y lados un poco abombados (más orgánico, sin perder la forma).
     * pts: vértices en sentido horario, centrados en 0,0. r: radio de esquina. bombeo: px hacia fuera.
     */
    function poligono(pts, r, bombeo, esc, dx, dy) {
        var k = esc || 1;
        var n = pts.length;
        var P = pts.map(function (p) { return { x: p[0] * k + (dx || 0), y: p[1] * k + (dy || 0) }; });
        var rr = r * k;
        var bb = (bombeo || 0) * k;
        function hacia(a, b, d) {
            var vx = b.x - a.x, vy = b.y - a.y, L = Math.sqrt(vx * vx + vy * vy) || 1;
            return { x: a.x + vx / L * d, y: a.y + vy / L * d };
        }
        var cx = 0, cy = 0;
        P.forEach(function (p) { cx += p.x / n; cy += p.y / n; });
        var d = "";
        for (var i = 0; i < n; i++) {
            var a = P[i], b = P[(i + 1) % n], c = P[(i + 2) % n];
            var sale = hacia(a, b, rr);
            var llega = hacia(b, a, rr);
            var sale2 = hacia(b, c, rr);
            if (i === 0) d += "M" + r1(sale.x) + " " + r1(sale.y);
            var mx = (sale.x + llega.x) / 2, my = (sale.y + llega.y) / 2;
            var nx = mx - cx, ny = my - cy, NL = Math.sqrt(nx * nx + ny * ny) || 1;
            d += " Q" + r1(mx + nx / NL * bb) + " " + r1(my + ny / NL * bb) + " " + r1(llega.x) + " " + r1(llega.y);
            d += " Q" + r1(b.x) + " " + r1(b.y) + " " + r1(sale2.x) + " " + r1(sale2.y);
        }
        return d + " Z";
    }

    var FORMAS = {
        circulo: function (esc, dx, dy) {
            var r = 62 * (esc || 1);
            var x = dx || 0, y = dy || 0;
            return "M" + r1(x - r) + " " + r1(y) + " A" + r1(r) + " " + r1(r) + " 0 1 0 " + r1(x + r) + " " + r1(y) +
                " A" + r1(r) + " " + r1(r) + " 0 1 0 " + r1(x - r) + " " + r1(y) + " Z";
        },
        cuadrado: function (esc, dx, dy) {
            return poligono([[-60, -60], [60, -60], [60, 60], [-60, 60]], 24, 3, esc, dx, dy);
        },
        triangulo: function (esc, dx, dy) {
            return poligono([[0, -64], [68, 62], [-68, 62]], 15, 6, esc, dx, dy);
        },
        corazon: function (esc, dx, dy) {
            var k = esc || 1, x = dx || 0, y = dy || 0;
            var P = function (a, b) { return r1(x + a * k) + " " + r1(y + b * k); };
            return "M" + P(0, -32) + " C " + P(-12, -64) + ", " + P(-68, -66) + ", " + P(-68, -16) +
                " C " + P(-68, 24) + ", " + P(-24, 44) + ", " + P(0, 64) +
                " C " + P(24, 44) + ", " + P(68, 24) + ", " + P(68, -16) +
                " C " + P(68, -66) + ", " + P(12, -64) + ", " + P(0, -32) + " Z";
        },
        estrella: function (esc, dx, dy) {
            var pts = [];
            for (var i = 0; i < 10; i++) {
                var a = -Math.PI / 2 + i * Math.PI / 5;
                var r = i % 2 ? 33 : 72;
                pts.push([Math.cos(a) * r, Math.sin(a) * r + 6]);
            }
            return poligono(pts, 8, 0, esc, dx, dy);
        }
    };

    // ------------------------------------------------------------------ frutos

    function hoja(x, y, giro, esc, id) {
        return '<g transform="translate(' + x + " " + y + ") rotate(" + giro + ") scale(" + (esc || 1) + ')">' +
            '<path d="M0 0 C 10 -20, 40 -24, 54 -12 C 40 6, 14 10, 0 0 Z" fill="url(#' + id + ')" stroke="#1d5b28" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<path d="M4 -1 C 18 -8, 32 -11, 46 -11" stroke="#1d5b28" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.7"/>' +
            '<path d="M10 -8 C 18 -14, 30 -16, 38 -15" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45"/></g>';
    }

    var DEF_HOJA = '<linearGradient id="gh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b2f2bb"/><stop offset="0.5" stop-color="#51cf66"/><stop offset="1" stop-color="#2b8a3e"/></linearGradient>';

    function fruto(forma) {
        var cx = FRUTO.cx, cy = FRUTO.cy;
        var cuerpo = FORMAS[forma](1, cx, cy);
        var brillo = FORMAS[forma](0.82, cx - 6, cy - 7);
        var paletas = {
            circulo: { luz: "#ff9b9b", medio: "#f03e3e", sombra: "#a01313", linea: "#5c0b0b", brillo: "#ffe3e3" },
            cuadrado: { luz: "#c5b3ff", medio: "#7950f2", sombra: "#3f1c9e", linea: "#24105e", brillo: "#efe9ff" },
            triangulo: { luz: "#e2f78f", medio: "#94d82d", sombra: "#4f8a10", linea: "#2b4f08", brillo: "#f8ffd9" },
            corazon: { luz: "#ff8fa3", medio: "#e8364f", sombra: "#9c0d24", linea: "#5a0614", brillo: "#ffe0e6" },
            estrella: { luz: "#fff3a0", medio: "#fcc419", sombra: "#e67700", linea: "#7a3d00", brillo: "#fffbe0" }
        };
        var p = paletas[forma];
        var tops = { triangulo: cy - 62, cuadrado: cy - 58, circulo: cy - 60, corazon: cy - 34, estrella: cy - 62 };
        var top = tops[forma];
        var defs = "<defs>" +
            '<radialGradient id="gc" cx="34%" cy="30%" r="78%"><stop offset="0" stop-color="' + p.luz + '"/><stop offset="0.5" stop-color="' + p.medio + '"/><stop offset="1" stop-color="' + p.sombra + '"/></radialGradient>' +
            '<radialGradient id="gb" cx="30%" cy="26%" r="55%"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></linearGradient>' +
            DEF_HOJA + "</defs>";
        var detalle = "";
        if (forma === "circulo") {
            // hoyuelo de la manzana arriba
            detalle = '<path d="M' + (cx - 14) + " " + (top + 6) + " Q" + cx + " " + (top + 16) + " " + (cx + 14) + " " + (top + 6) + '" stroke="' + p.linea + '" stroke-width="3.2" fill="none" stroke-linecap="round" opacity="0.75"/>';
        } else if (forma === "cuadrado") {
            // surco de la ciruela y polvillo
            detalle = '<path d="M' + (cx + 4) + " " + (top + 10) + " C " + (cx - 6) + " " + (cy - 10) + ", " + (cx - 6) + " " + (cy + 26) + ", " + (cx + 2) + " " + (cy + 52) + '" stroke="' + p.linea + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.35"/>' +
                '<g fill="#fff" opacity="0.28"><circle cx="58" cy="132" r="2.5"/><circle cx="112" cy="70" r="2"/><circle cx="120" cy="128" r="2.5"/><circle cx="70" cy="66" r="1.8"/></g>';
        } else if (forma === "triangulo") {
            // pintitas de la pera
            detalle = '<g fill="' + p.linea + '" opacity="0.32"><circle cx="70" cy="120" r="2.4"/><circle cx="104" cy="132" r="2.2"/><circle cx="88" cy="100" r="2"/><circle cx="58" cy="142" r="2.2"/><circle cx="118" cy="110" r="1.8"/><circle cx="96" cy="150" r="2.3"/></g>';
        } else if (forma === "corazon") {
            // semillas de la fresa
            var sem = "";
            [[52, 86], [76, 80], [100, 82], [120, 90], [62, 108], [86, 104], [110, 110], [74, 128], [96, 128], [86, 148], [42, 96], [128, 106]].forEach(function (s) {
                sem += '<ellipse cx="' + s[0] + '" cy="' + s[1] + '" rx="2.6" ry="4" fill="#ffe066" stroke="#b8860b" stroke-width="1"/>';
            });
            detalle = sem;
        } else {
            // aristas de la carambola, del centro a cada punta
            var ar = "";
            for (var q = 0; q < 5; q++) {
                var ang = -Math.PI / 2 + q * 2 * Math.PI / 5;
                ar += '<path d="M' + cx + " " + (cy + 6) + " L " + r1(cx + Math.cos(ang) * 56) + " " + r1(cy + 6 + Math.sin(ang) * 56) + '" stroke="' + p.sombra + '" stroke-width="3" stroke-linecap="round" opacity="0.45"/>';
            }
            detalle = ar;
        }
        var tallo = '<path d="M' + cx + " " + (top + 8) + " C " + (cx - 1) + " " + (top - 6) + ", " + (cx + 3) + " " + (top - 18) + ", " + (cx + 10) + " " + (top - 26) + '" stroke="#5b3417" stroke-width="7.5" fill="none" stroke-linecap="round"/>' +
            '<path d="M' + (cx + 1) + " " + (top + 2) + " C " + cx + " " + (top - 8) + ", " + (cx + 3) + " " + (top - 16) + ", " + (cx + 8) + " " + (top - 22) + '" stroke="#a9703f" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
        var hojita = hoja(cx + 6, top - 12, -18, forma === "triangulo" ? 0.9 : 1, "gh");
        if (forma === "corazon") {
            // la fresa lleva cáliz de hojitas en vez de tallo y hoja
            tallo = '<path d="M' + cx + " " + (top + 4) + " C " + (cx + 1) + " " + (top - 8) + ", " + (cx + 4) + " " + (top - 16) + ", " + (cx + 8) + " " + (top - 22) + '" stroke="#2b8a3e" stroke-width="6" fill="none" stroke-linecap="round"/>';
            hojita = "";
            [-60, -25, 0, 25, 60].forEach(function (g) {
                hojita += '<path transform="translate(' + cx + " " + (top + 6) + ") rotate(" + g + ')" d="M0 0 C -9 6, -7 22, 0 28 C 7 22, 9 6, 0 0 Z" fill="url(#gh)" stroke="#1d5b28" stroke-width="2.5" stroke-linejoin="round"/>';
            });
            hojita += hoja(cx + 6, top - 14, -30, 0.7, "gh");
        }
        var cuerpoSvg = '<path d="' + cuerpo + '" fill="url(#gc)" stroke="' + p.linea + '" stroke-width="5.5" stroke-linejoin="round"/>' +
            '<path d="' + cuerpo + '" fill="url(#gs)"/>' +
            '<path d="' + brillo + '" fill="url(#gb)"/>' + detalle +
            '<ellipse cx="' + (cx - 26) + '" cy="' + (cy - 26) + '" rx="11" ry="17" fill="' + p.brillo + '" opacity="0.85" transform="rotate(-30 ' + (cx - 26) + " " + (cy - 26) + ')"/>' +
            '<circle cx="' + (cx - 10) + '" cy="' + (cy - 42) + '" r="4.5" fill="#fff" opacity="0.8"/>';
        return svg(FRUTO.w, FRUTO.h, defs + tallo + cuerpoSvg + hojita);
    }

    /** Silueta plana del fruto (contador y progreso). */
    function frutoSombra(forma) {
        var cuerpo = FORMAS[forma](1, FRUTO.cx, FRUTO.cy);
        return svg(FRUTO.w, FRUTO.h, '<path d="' + cuerpo + '" fill="#ffffff" fill-opacity="0.55" stroke="#ffffff" stroke-width="6" stroke-dasharray="12 9" stroke-linecap="round"/>');
    }

    // ------------------------------------------------------------------ moldes

    function molde(forma) {
        var c = MOLDE.c;
        var hueco = FORMAS[forma](1.2, c, c);
        var borde = FORMAS[forma](1.08, c, c);
        var silueta = FORMAS[forma](1, c, c);
        var defs = "<defs>" +
            '<radialGradient id="gh" cx="50%" cy="40%" r="62%"><stop offset="0" stop-color="#5a3216"/><stop offset="0.75" stop-color="#3b1f0b"/><stop offset="1" stop-color="#2a1506"/></radialGradient>' +
            '<radialGradient id="gi" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fff6cc" stop-opacity="0.38"/><stop offset="1" stop-color="#ffe066" stop-opacity="0.12"/></radialGradient>' +
            '<filter id="fb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>' +
            "</defs>";
        return svg(MOLDE.w, MOLDE.h, defs +
            // corteza levantada alrededor del hueco
            '<path d="' + hueco + '" fill="#c08850" stroke="#4a2a12" stroke-width="5" stroke-linejoin="round"/>' +
            '<path d="' + borde + '" fill="url(#gh)"/>' +
            // sombra interior arriba (el hueco es hondo)
            '<path d="' + silueta + '" fill="none" stroke="#000" stroke-opacity="0.45" stroke-width="12" filter="url(#fb)" transform="translate(0 5)"/>' +
            '<path d="' + silueta + '" fill="url(#gi)"/>' +
            // halo y línea punteada dorada
            '<path d="' + silueta + '" fill="none" stroke="#ffe066" stroke-opacity="0.35" stroke-width="13" stroke-linejoin="round"/>' +
            '<path d="' + silueta + '" fill="none" stroke="#ffe8a1" stroke-width="5.5" stroke-dasharray="15 10" stroke-linecap="round" stroke-linejoin="round"/>');
    }

    /** Resplandor blanco de la forma (se tiñe y se suma con ADD). */
    function brilloForma(forma) {
        var w = 300, c = 150;
        return svg(w, w, '<defs><filter id="fg" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter></defs>' +
            '<path d="' + FORMAS[forma](1.22, c, c) + '" fill="#fff" filter="url(#fg)" opacity="0.95"/>' +
            '<path d="' + FORMAS[forma](1.04, c, c) + '" fill="none" stroke="#fff" stroke-width="10" filter="url(#fg)"/>');
    }

    /** Borde dorado macizo: molde completado. */
    function bordeForma(forma) {
        var c = MOLDE.c;
        return svg(MOLDE.w, MOLDE.h, '<path d="' + FORMAS[forma](1.07, c, c) + '" fill="none" stroke="#7a4a00" stroke-width="13" stroke-linejoin="round"/>' +
            '<path d="' + FORMAS[forma](1.07, c, c) + '" fill="none" stroke="#ffd43b" stroke-width="8" stroke-linejoin="round"/>' +
            '<path d="' + FORMAS[forma](1.07, c, c) + '" fill="none" stroke="#fff9db" stroke-width="2.5" stroke-linejoin="round" stroke-dasharray="4 18" stroke-linecap="round"/>');
    }

    // ------------------------------------------------------------------ fondo del bosque (1600 × 900)

    // ------------------------------------------------------------------ fondo del bosque por capas
    //
    // Cada plano es una textura aparte (cielo, montañas, bosque lejano, árboles medios, pradera,
    // primer plano) para que la escena les dé profundidad: paralaje, bruma, luz que cambia por
    // nivel y reacciones al juego. Las capas anchas miden 1700 (50 de sobra a cada lado del mundo
    // de 1600) para que el paralaje nunca deje ver el borde.

    var ANCHO = 1700;

    function cielo() {
        var s = "<defs>" +
            '<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fa9ec"/><stop offset="0.38" stop-color="#8fd0fb"/><stop offset="0.72" stop-color="#cdeefc"/><stop offset="1" stop-color="#eefbe6"/></linearGradient>' +
            '<linearGradient id="v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
            "</defs>";
        s += '<rect width="' + ANCHO + '" height="700" fill="url(#c)"/>';
        // velos altos de nube, muy suaves
        [[260, 70, 520], [980, 110, 620], [1420, 50, 420]].forEach(function (v) {
            s += '<ellipse cx="' + v[0] + '" cy="' + v[1] + '" rx="' + v[2] / 2 + '" ry="9" fill="url(#v)" opacity="0.7"/>';
        });
        return svg(ANCHO, 700, s);
    }

    function sol() {
        return svg(360, 360, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0" stop-color="#fffef2"/><stop offset="0.16" stop-color="#fff6c4"/><stop offset="0.3" stop-color="#ffe98a" stop-opacity="0.55"/>' +
            '<stop offset="0.6" stop-color="#fff1b0" stop-opacity="0.18"/><stop offset="1" stop-color="#fff1b0" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="180" cy="180" r="180" fill="url(#g)"/><circle cx="180" cy="180" r="44" fill="#fffbe0"/>');
    }

    /** Nube con volumen: cara clara arriba, panza azulada abajo. */
    function nube(v) {
        var formas = [
            [[90, 90, 50], [150, 70, 64], [215, 82, 54], [265, 100, 38], [55, 108, 34]],
            [[80, 86, 40], [130, 66, 52], [185, 78, 44], [225, 96, 30]],
            [[100, 84, 46], [160, 74, 56], [220, 92, 40]]
        ][v % 3];
        var s = '<defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#f4f9ff"/><stop offset="1" stop-color="#cfe2f5"/></linearGradient></defs>';
        formas.forEach(function (c) { s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="url(#n)"/>'; });
        s += '<rect x="40" y="100" width="240" height="34" rx="17" fill="url(#n)"/>';
        formas.forEach(function (c) { s += '<circle cx="' + (c[0] - c[2] * 0.25) + '" cy="' + (c[1] - c[2] * 0.3) + '" r="' + c[2] * 0.45 + '" fill="#fff" opacity="0.7"/>'; });
        return svg(320, 150, s);
    }

    /** Dos cordilleras lejanas, azuladas por la distancia, con bruma al pie (1700 × 380). */
    function montanas() {
        var s = "<defs>" +
            '<linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fbfe6"/><stop offset="1" stop-color="#bcd6ef"/></linearGradient>' +
            '<linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb9a8"/><stop offset="1" stop-color="#a9d6c2"/></linearGradient>' +
            '<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#eef8f6" stop-opacity="0"/><stop offset="1" stop-color="#eef8f6" stop-opacity="0.85"/></linearGradient>' +
            "</defs>";
        s += '<path d="M0 230 L 120 150 L 210 190 L 340 80 L 470 170 L 560 130 L 700 200 L 820 110 L 960 190 L 1080 120 L 1220 180 L 1330 90 L 1460 170 L 1580 130 L 1700 190 L 1700 380 L 0 380 Z" fill="url(#m1)" stroke-linejoin="round"/>';
        // nieve suave en las cumbres altas
        [[340, 80], [820, 110], [1330, 90]].forEach(function (p) {
            s += '<path d="M' + (p[0] - 34) + " " + (p[1] + 26) + " L " + p[0] + " " + p[1] + " L " + (p[0] + 36) + " " + (p[1] + 28) + " Q " + p[0] + " " + (p[1] + 40) + " " + (p[0] - 34) + " " + (p[1] + 26) + ' Z" fill="#f4f9ff" opacity="0.9"/>';
        });
        s += '<path d="M0 280 C 140 220, 260 250, 400 220 C 560 186, 680 250, 860 226 C 1020 204, 1140 258, 1300 222 C 1460 190, 1580 240, 1700 226 L 1700 380 L 0 380 Z" fill="url(#m2)"/>';
        s += '<rect width="' + ANCHO + '" height="380" fill="url(#b)"/>';
        return svg(ANCHO, 380, s);
    }

    /** Bosque lejano en dos filas, más claro y brumoso arriba (1700 × 300). */
    function bosqueLejano() {
        var rnd = semilla(31);
        var s = "<defs>" +
            '<linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f6ee" stop-opacity="0.55"/><stop offset="0.7" stop-color="#e6f6ee" stop-opacity="0"/></linearGradient>' +
            "</defs>";
        var fila = function (y0, alto, c1, c2, n) {
            var out = "";
            for (var i = 0; i < n; i++) {
                var x = (i / (n - 1)) * ANCHO + (rnd() - 0.5) * 30;
                var h = alto * (0.75 + rnd() * 0.5);
                var r = h * 0.32;
                var c = rnd() < 0.5 ? c1 : c2;
                out += '<rect x="' + r1(x - 4) + '" y="' + r1(y0 - h * 0.35) + '" width="8" height="' + r1(h * 0.4) + '" fill="#5e7a52"/>';
                out += '<circle cx="' + r1(x) + '" cy="' + r1(y0 - h * 0.62) + '" r="' + r1(r) + '" fill="' + c + '"/>';
                out += '<circle cx="' + r1(x - r * 0.5) + '" cy="' + r1(y0 - h * 0.45) + '" r="' + r1(r * 0.8) + '" fill="' + c + '"/>';
                out += '<circle cx="' + r1(x + r * 0.55) + '" cy="' + r1(y0 - h * 0.47) + '" r="' + r1(r * 0.78) + '" fill="' + c + '"/>';
                out += '<circle cx="' + r1(x - r * 0.25) + '" cy="' + r1(y0 - h * 0.74) + '" r="' + r1(r * 0.38) + '" fill="#fff" opacity="0.12"/>';
            }
            return out;
        };
        s += fila(250, 170, "#8ccf95", "#7ec48a", 30);
        s += '<rect y="130" width="' + ANCHO + '" height="170" fill="#d9f1e4" opacity="0.35"/>';
        s += fila(300, 200, "#5fb26b", "#55a862", 24);
        s += '<rect y="240" width="' + ANCHO + '" height="60" fill="#5aae66"/>';
        s += '<rect width="' + ANCHO + '" height="300" fill="url(#h)"/>';
        return svg(ANCHO, 300, s);
    }

    /** Árbol de plano medio (a los lados del claro), 340 × 560, con tronco y copa por racimos. */
    function arbolMedio(v) {
        var rnd = semilla(40 + v);
        var tonos = [["#2f8f46", "#3fa858", "#6fcf7f"], ["#2b8248", "#379e55", "#62c27a"], ["#3d8f3b", "#4fae48", "#8fd77a"]][v % 3];
        var s = "<defs>" +
            '<linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3a1e"/><stop offset="0.4" stop-color="#8a5c33"/><stop offset="1" stop-color="#4a2e17"/></linearGradient>' +
            "</defs>";
        s += '<path d="M150 560 C 156 470, 158 380, 152 300 L 188 300 C 182 380, 184 470, 196 560 Z" fill="url(#t)" stroke="#3b2414" stroke-width="4"/>';
        s += '<path d="M168 380 C 140 350, 118 330, 100 300" stroke="#5a3a1e" stroke-width="12" fill="none" stroke-linecap="round"/>';
        var blobs = [];
        for (var i = 0; i < 16; i++) {
            var a = rnd() * Math.PI * 2, d = rnd();
            blobs.push([170 + Math.cos(a) * 110 * d, 200 + Math.sin(a) * 120 * d - 10, 46 + rnd() * 34]);
        }
        blobs.forEach(function (b) { s += '<circle cx="' + r1(b[0]) + '" cy="' + r1(b[1]) + '" r="' + r1(b[2]) + '" fill="' + tonos[0] + '" stroke="#1d5a2c" stroke-width="7"/>'; });
        blobs.forEach(function (b) { s += '<circle cx="' + r1(b[0]) + '" cy="' + r1(b[1]) + '" r="' + r1(b[2]) + '" fill="' + tonos[0] + '"/>'; });
        blobs.forEach(function (b) { s += '<circle cx="' + r1(b[0] - b[2] * 0.25) + '" cy="' + r1(b[1] - b[2] * 0.3) + '" r="' + r1(b[2] * 0.62) + '" fill="' + tonos[1] + '"/>'; });
        blobs.slice(0, 9).forEach(function (b) { s += '<circle cx="' + r1(b[0] - b[2] * 0.4) + '" cy="' + r1(b[1] - b[2] * 0.45) + '" r="' + r1(b[2] * 0.28) + '" fill="' + tonos[2] + '" opacity="0.85"/>'; });
        return svg(340, 560, s);
    }

    /** Pradera con ondulaciones, manchas de sol y claro alrededor del árbol (1700 × 340). */
    function pradera() {
        var rnd = semilla(77);
        var s = "<defs>" +
            '<linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6e36a"/><stop offset="0.45" stop-color="#76c94a"/><stop offset="1" stop-color="#3f962b"/></linearGradient>' +
            '<linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5daf3c"/><stop offset="1" stop-color="#3a8a28"/></linearGradient>' +
            '<radialGradient id="l" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#e9ffb8" stop-opacity="0.7"/><stop offset="1" stop-color="#e9ffb8" stop-opacity="0"/></radialGradient>' +
            '<radialGradient id="cl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#d8f5a2" stop-opacity="0.9"/><stop offset="1" stop-color="#d8f5a2" stop-opacity="0"/></radialGradient>' +
            "</defs>";
        s += '<path d="M0 40 C 260 6, 520 30, 850 22 C 1180 14, 1440 34, 1700 6 L 1700 340 L 0 340 Z" fill="url(#p)"/>';
        // ondulaciones más oscuras (dan relieve)
        s += '<path d="M0 150 C 180 120, 330 150, 470 140 C 560 134, 600 160, 640 190 L 0 260 Z" fill="url(#o)" opacity="0.45"/>';
        s += '<path d="M1700 140 C 1520 116, 1380 150, 1240 142 C 1150 138, 1100 162, 1060 190 L 1700 260 Z" fill="url(#o)" opacity="0.45"/>';
        // manchas de sol entre la hierba
        for (var i = 0; i < 9; i++) {
            s += '<ellipse cx="' + r1(rnd() * ANCHO) + '" cy="' + r1(60 + rnd() * 240) + '" rx="' + r1(80 + rnd() * 120) + '" ry="' + r1(18 + rnd() * 20) + '" fill="url(#l)"/>';
        }
        s += '<ellipse cx="850" cy="270" rx="560" ry="110" fill="url(#cl)"/>';
        // briznas y piedritas
        for (var k = 0; k < 110; k++) {
            var bx = rnd() * ANCHO, by = 30 + rnd() * 300;
            var tono = rnd() < 0.5 ? "#4a9e32" : "#9ae05c";
            var alto = 10 + (by / 300) * 16;
            s += '<path d="M' + r1(bx) + " " + r1(by) + " q 3 " + r1(-alto * 0.6) + " 7 " + r1(-alto) + " M" + r1(bx + 6) + " " + r1(by) + " q 2 " + r1(-alto * 0.5) + " -2 " + r1(-alto * 0.85) +
                '" stroke="' + tono + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>';
        }
        for (var p = 0; p < 10; p++) {
            var px = rnd() * ANCHO, py = 120 + rnd() * 200;
            s += '<ellipse cx="' + r1(px) + '" cy="' + r1(py) + '" rx="' + r1(7 + rnd() * 6) + '" ry="' + r1(4 + rnd() * 3) + '" fill="#b7b0a2" stroke="#6f685c" stroke-width="2"/>';
        }
        return svg(ANCHO, 340, s);
    }

    /** Helecho del primer plano (esquinas inferiores), 300 × 230. */
    function helecho() {
        var s = '<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa35a"/><stop offset="1" stop-color="#1c6b35"/></linearGradient></defs>';
        [[150, -60, 1], [150, -25, 0.9], [150, 10, 0.95], [150, 45, 0.85], [150, -95, 0.7], [150, 80, 0.7]].forEach(function (h) {
            var hojitas = "";
            for (var i = 1; i < 9; i++) {
                var y = -i * 22;
                var w = 26 - i * 2.4;
                hojitas += '<path d="M0 ' + y + " C " + (-w * 0.6) + " " + (y - 6) + ", " + (-w) + " " + (y - 2) + ", " + (-w) + " " + (y + 4) + ' C ' + (-w * 0.6) + " " + (y + 6) + ", -4 " + (y + 4) + ", 0 " + y + ' Z" fill="url(#f)"/>';
                hojitas += '<path d="M0 ' + y + " C " + (w * 0.6) + " " + (y - 6) + ", " + w + " " + (y - 2) + ", " + w + " " + (y + 4) + ' C ' + (w * 0.6) + " " + (y + 6) + ", 4 " + (y + 4) + ", 0 " + y + ' Z" fill="url(#f)"/>';
            }
            s += '<g transform="translate(' + h[0] + ' 228) rotate(' + h[1] + ") scale(" + h[2] + ')"><path d="M0 0 L 0 -190" stroke="#1c6b35" stroke-width="5" stroke-linecap="round"/>' + hojitas + "</g>";
        });
        return svg(300, 230, s);
    }

    /** Franja de hierba alta del primer plano (1700 × 110), oscura, con puntas claras. */
    function pastoFrente() {
        var rnd = semilla(5);
        var s = "";
        for (var i = 0; i < 170; i++) {
            var x = i * 10 + rnd() * 8;
            var h = 30 + rnd() * 70;
            var inc = (rnd() - 0.5) * 30;
            var c = rnd() < 0.5 ? "#2f7d2a" : "#3c9233";
            s += '<path d="M' + r1(x - 5) + " 110 Q " + r1(x + inc * 0.3) + " " + r1(110 - h * 0.6) + " " + r1(x + inc) + " " + r1(110 - h) + " Q " + r1(x + inc * 0.4 + 3) + " " + r1(110 - h * 0.5) + " " + r1(x + 6) + ' 110 Z" fill="' + c + '"/>';
            if (rnd() < 0.4) s += '<circle cx="' + r1(x + inc) + '" cy="' + r1(112 - h) + '" r="2.5" fill="#a9e34b" opacity="0.8"/>';
        }
        return svg(ANCHO, 110, s);
    }

    /** Viñeta: centro transparente y bordes oscuros (se estira a toda la pantalla). */
    function vineta() {
        return svg(320, 180, '<defs><radialGradient id="g" cx="50%" cy="46%" r="62%"><stop offset="0.55" stop-color="#0b2610" stop-opacity="0"/><stop offset="1" stop-color="#0b2610" stop-opacity="0.75"/></radialGradient></defs><rect width="320" height="180" fill="url(#g)"/>');
    }

    function arcoiris() {
        var colores = ["#ff6b6b", "#ffa94d", "#ffe066", "#8ce99a", "#74c0fc", "#b197fc"];
        var s = "";
        colores.forEach(function (c, i) {
            var r = 560 - i * 26;
            s += '<path d="M' + (600 - r) + " 600 A " + r + " " + r + " 0 0 1 " + (600 + r) + ' 600" stroke="' + c + '" stroke-width="27" fill="none" opacity="0.75"/>';
        });
        return svg(1200, 610, s);
    }

    function pajaro() {
        return svg(64, 32, '<path d="M2 14 C 12 4, 24 6, 32 18 C 40 6, 52 4, 62 14 C 50 10, 40 14, 32 24 C 24 14, 14 10, 2 14 Z" fill="#2c3e50"/>');
    }

    // ------------------------------------------------------------------ árbol mágico

    /**
     * Tronco con raíces y dos ramas bajas (1100 × 640). Se dibuja con su esquina en (250, 300)
     * del mundo: el centro del tronco queda en x 800.
     */
    function tronco() {
        var rnd = semilla(12);
        var s = "<defs>" +
            '<linearGradient id="gt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b3c1a"/><stop offset="0.18" stop-color="#b9824b"/><stop offset="0.45" stop-color="#a06635"/><stop offset="0.78" stop-color="#7d4a22"/><stop offset="1" stop-color="#55301a"/></linearGradient>' +
            '<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9723f"/><stop offset="1" stop-color="#6e3f1c"/></linearGradient>' +
            '<radialGradient id="gm" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#8ce99a"/><stop offset="1" stop-color="#40a14f"/></radialGradient>' +
            '<radialGradient id="gsom" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1f4a12" stop-opacity="0.45"/><stop offset="1" stop-color="#1f4a12" stop-opacity="0"/></radialGradient>' +
            DEF_HOJA + "</defs>";
        // sombra en el pasto
        s += '<ellipse cx="550" cy="604" rx="420" ry="44" fill="url(#gsom)"/>';
        // ramas bajas (izquierda y derecha), detrás del tronco
        var rama = function (lado) {
            var m = lado < 0 ? "" : ' transform="translate(1100 0) scale(-1 1)"';
            return "<g" + m + ">" +
                '<path d="M420 250 C 330 236, 250 210, 170 196 C 140 190, 112 196, 92 206 L 88 190 C 110 176, 146 170, 176 176 C 256 186, 330 196, 424 196 Z" fill="url(#gr)" stroke="#4a2a12" stroke-width="5" stroke-linejoin="round"/>' +
                '<path d="M300 214 C 270 186, 262 160, 270 140" stroke="#4a2a12" stroke-width="13" fill="none" stroke-linecap="round"/>' +
                '<path d="M300 214 C 270 186, 262 160, 270 140" stroke="#9a6233" stroke-width="7" fill="none" stroke-linecap="round"/>' +
                hoja(270, 142, -110, 0.9, "gh") + hoja(270, 142, -60, 0.8, "gh") +
                '<path d="M380 214 C 330 206, 260 196, 190 190" stroke="#d29a62" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/></g>';
        };
        s += rama(-1) + rama(1);
        // raíces
        s += '<path d="M330 470 C 290 540, 230 570, 160 600 C 230 612, 300 600, 350 572 Z" fill="url(#gr)" stroke="#4a2a12" stroke-width="5" stroke-linejoin="round"/>';
        s += '<path d="M770 470 C 810 540, 870 570, 940 600 C 870 612, 800 600, 750 572 Z" fill="url(#gr)" stroke="#4a2a12" stroke-width="5" stroke-linejoin="round"/>';
        s += '<path d="M450 540 C 430 580, 400 600, 360 618 C 420 626, 470 612, 490 590 Z" fill="url(#gr)" stroke="#4a2a12" stroke-width="5" stroke-linejoin="round"/>';
        s += '<path d="M650 540 C 670 580, 700 600, 740 618 C 680 626, 630 612, 610 590 Z" fill="url(#gr)" stroke="#4a2a12" stroke-width="5" stroke-linejoin="round"/>';
        // tronco
        var cuerpo = "M405 0 C 400 90, 380 170, 352 260 C 330 340, 318 430, 296 520 C 290 560, 300 590, 330 600 L 770 600 C 800 590, 810 560, 804 520 C 782 430, 770 340, 748 260 C 720 170, 700 90, 695 0 Z";
        s += '<path d="' + cuerpo + '" fill="url(#gt)" stroke="#4a2a12" stroke-width="6" stroke-linejoin="round"/>';
        // vetas de la corteza
        for (var i = 0; i < 16; i++) {
            var x = 360 + i * 25 + rnd() * 10;
            var y0 = 20 + rnd() * 120, y1 = y0 + 120 + rnd() * 200;
            var ond = (rnd() - 0.5) * 30;
            s += '<path d="M' + r1(x) + " " + r1(y0) + " C " + r1(x + ond) + " " + r1(y0 + 60) + ", " + r1(x - ond) + " " + r1(y1 - 60) + ", " + r1(x + ond * 0.4) + " " + r1(y1) +
                '" stroke="#4f2c12" stroke-width="' + r1(3 + rnd() * 3) + '" fill="none" stroke-linecap="round" opacity="0.38"/>';
            if (rnd() < 0.55) {
                s += '<path d="M' + r1(x + 6) + " " + r1(y0 + 20) + " C " + r1(x + 6 + ond) + " " + r1(y0 + 70) + ", " + r1(x + 6 - ond) + " " + r1(y1 - 80) + ", " + r1(x + 8) + " " + r1(y1 - 30) +
                    '" stroke="#d6a26b" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.4"/>';
            }
        }
        // luz del lado izquierdo
        s += '<path d="M410 20 C 404 110, 384 200, 360 290 C 346 350, 336 420, 322 480" stroke="#f0c48c" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.35"/>';
        // nudo
        s += '<ellipse cx="700" cy="520" rx="20" ry="13" fill="#5b3417" stroke="#3a1f0b" stroke-width="3"/><ellipse cx="700" cy="518" rx="10" ry="6" fill="#2e1808"/>';
        // musgo en las raíces
        [[340, 584, 46], [560, 600, 60], [770, 586, 44], [420, 600, 30], [690, 604, 34]].forEach(function (m) {
            s += '<ellipse cx="' + m[0] + '" cy="' + m[1] + '" rx="' + m[2] + '" ry="' + r1(m[2] * 0.32) + '" fill="url(#gm)" stroke="#2b7a3a" stroke-width="3"/>';
        });
        // hongos al pie
        var hongo = function (x, y, k) {
            return '<g transform="translate(' + x + " " + y + ") scale(" + k + ')"><rect x="-7" y="-22" width="14" height="24" rx="6" fill="#fff4e0" stroke="#4a2a12" stroke-width="3"/>' +
                '<path d="M-24 -18 C -24 -42, 24 -42, 24 -18 Z" fill="#ff6b6b" stroke="#4a2a12" stroke-width="3.5" stroke-linejoin="round"/>' +
                '<circle cx="-10" cy="-28" r="4" fill="#fff"/><circle cx="7" cy="-31" r="3.2" fill="#fff"/><circle cx="14" cy="-22" r="2.5" fill="#fff"/></g>';
        };
        s += hongo(250, 600, 1) + hongo(278, 606, 0.7) + hongo(860, 604, 0.85);
        return svg(1100, 640, s);
    }

    /**
     * Copa: capa de atrás (oscura) o de adelante (clara), 1000 × 500. La mitad de abajo va achatada
     * para que la copa no tape la cara del tronco.
     */
    function copa(capa) {
        var rnd = semilla(capa === "atras" ? 5 : 9);
        var W = 1000, H = 500, cx = 500, cy = capa === "atras" ? 270 : 250;
        var blobs = [];
        var n = capa === "atras" ? 30 : 24;
        var rx = capa === "atras" ? 420 : 350, ry = capa === "atras" ? 160 : 130;
        var bajo = function (s) { return s > 0 ? s * 0.7 : s; };
        for (var i = 0; i < n; i++) {
            var a = (i / n) * Math.PI * 2;
            var rr = (capa === "atras" ? 70 : 62) + rnd() * 34;
            blobs.push([cx + Math.cos(a) * rx * (0.92 + rnd() * 0.08), cy - 10 + bajo(Math.sin(a)) * ry * (0.9 + rnd() * 0.1), rr]);
        }
        for (var j = 0; j < (capa === "atras" ? 12 : 9); j++) {
            blobs.push([cx + (rnd() - 0.5) * rx * 1.3, cy - 10 + (rnd() - 0.6) * ry * 0.9, 90 + rnd() * 40]);
        }
        var oscuro = capa === "atras" ? "#1b5e20" : "#21682c";
        var defs = "<defs>" +
            (capa === "atras"
                ? '<radialGradient id="gf" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#3fae4f"/><stop offset="1" stop-color="#25803a"/></radialGradient>'
                : '<radialGradient id="gf" cx="35%" cy="25%" r="80%"><stop offset="0" stop-color="#a6e86a"/><stop offset="0.5" stop-color="#5ccf5c"/><stop offset="1" stop-color="#2f9e44"/></radialGradient>') +
            '<radialGradient id="gl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
            "</defs>";
        var s = defs;
        // contorno unido: primero todos con trazo, luego todos sin trazo encima
        blobs.forEach(function (b) { s += '<circle cx="' + r1(b[0]) + '" cy="' + r1(b[1]) + '" r="' + r1(b[2]) + '" fill="' + oscuro + '" stroke="' + oscuro + '" stroke-width="12"/>'; });
        blobs.forEach(function (b) { s += '<circle cx="' + r1(b[0]) + '" cy="' + r1(b[1]) + '" r="' + r1(b[2]) + '" fill="url(#gf)"/>'; });
        if (capa === "frente") {
            // racimos de luz arriba a la izquierda, mechones de hojas y flores
            for (var k = 0; k < 16; k++) {
                var lx = cx + (rnd() - 0.65) * rx * 1.5, ly = cy + (rnd() - 0.75) * ry * 1.2;
                s += '<circle cx="' + r1(lx) + '" cy="' + r1(ly) + '" r="' + r1(30 + rnd() * 30) + '" fill="url(#gl)"/>';
            }
            for (var h = 0; h < 40; h++) {
                var hx = cx + (rnd() - 0.5) * rx * 1.8, hy = cy + (rnd() - 0.5) * ry * 1.6;
                var g = rnd() * 360;
                s += '<path transform="translate(' + r1(hx) + " " + r1(hy) + ") rotate(" + r1(g) + ')" d="M0 0 C 6 -10, 20 -12, 26 -6 C 20 4, 8 5, 0 0 Z" fill="' + (rnd() < 0.5 ? "#8ce99a" : "#2b8a3e") + '" opacity="0.8"/>';
            }
            var flores = ["#ffffff", "#ffc9de", "#ffe066", "#ffd8a8"];
            for (var f = 0; f < 22; f++) {
                var fx = cx + (rnd() - 0.5) * rx * 1.7, fy = cy + (rnd() - 0.5) * ry * 1.5;
                var col = flores[Math.floor(rnd() * flores.length)];
                s += '<g transform="translate(' + r1(fx) + " " + r1(fy) + ')"><circle cx="-5" r="5.5" fill="' + col + '"/><circle cx="5" r="5.5" fill="' + col + '"/>' +
                    '<circle cy="-5" r="5.5" fill="' + col + '"/><circle cy="5" r="5.5" fill="' + col + '"/><circle r="3.4" fill="#f59f00"/></g>';
            }
        } else {
            // hojas que cuelgan por debajo
            for (var c = 0; c < 14; c++) {
                var x = cx - rx * 0.85 + c * (rx * 1.7 / 13);
                var u = (x - cx) / rx;
                var y = cy - 10 + 0.7 * ry * Math.sqrt(Math.max(0, 1 - u * u)) + 62 + rnd() * 14;
                s += '<path transform="translate(' + r1(x) + " " + r1(y) + ") rotate(" + r1(80 + rnd() * 30) + ')" d="M0 0 C 8 -12, 26 -14, 34 -6 C 26 6, 10 7, 0 0 Z" fill="#2f9e44" stroke="#1b5e20" stroke-width="3"/>';
            }
        }
        return svg(W, H, s);
    }

    /** Cara del árbol: solo las cejas y los cachetes; ojos y boca se dibujan vivos en la escena. */

    /** Cojín de hojas donde reposa cada fruto (240 × 110). */
    function nido() {
        var s = "<defs>" + DEF_HOJA +
            '<linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8f5a2"/><stop offset="0.6" stop-color="#82c91e"/><stop offset="1" stop-color="#5c940d"/></linearGradient>' +
            "</defs>";
        var hojaGrande = function (x, y, giro, k, g) {
            return '<g transform="translate(' + x + " " + y + ") rotate(" + giro + ") scale(" + k + ')">' +
                '<path d="M0 0 C 18 -30, 70 -36, 96 -14 C 70 12, 22 16, 0 0 Z" fill="url(#' + g + ')" stroke="#1d5b28" stroke-width="4" stroke-linejoin="round"/>' +
                '<path d="M6 -2 C 30 -12, 60 -16, 86 -14" stroke="#1d5b28" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.6"/></g>';
        };
        s += hojaGrande(120, 62, -170, 1.05, "gh") + hojaGrande(120, 62, -10, 1.05, "gh");
        s += hojaGrande(118, 66, -140, 0.85, "g2") + hojaGrande(122, 66, -40, 0.85, "g2");
        s += hojaGrande(120, 72, -100, 0.6, "gh") + hojaGrande(120, 72, -80, 0.6, "g2");
        s += '<ellipse cx="120" cy="70" rx="56" ry="14" fill="#2b5a12" opacity="0.35"/>';
        return svg(240, 110, s);
    }

    /** Cinta con el nombre del fruto. */
    function cinta(color, oscuro) {
        return svg(300, 66, '<path d="M14 18 L 42 18 L 42 54 L 14 54 L 26 36 Z" fill="' + oscuro + '" stroke="#3b2414" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M286 18 L 258 18 L 258 54 L 286 54 L 274 36 Z" fill="' + oscuro + '" stroke="#3b2414" stroke-width="3" stroke-linejoin="round"/>' +
            '<rect x="34" y="8" width="232" height="44" rx="12" fill="' + color + '" stroke="#3b2414" stroke-width="3.5"/>' +
            '<rect x="42" y="13" width="216" height="10" rx="5" fill="#fff" opacity="0.28"/>');
    }

    // ------------------------------------------------------------------ decoración del claro

    function flor(c1, c2) {
        var s = '<path d="M40 76 C 40 60, 42 50, 40 40" stroke="#2b8a3e" stroke-width="5" fill="none" stroke-linecap="round"/>' +
            '<path d="M40 64 C 50 56, 60 58, 64 62 C 56 68, 46 68, 40 64 Z" fill="#51cf66" stroke="#1d5b28" stroke-width="2.5"/>';
        for (var i = 0; i < 6; i++) {
            var a = i * 60;
            s += '<ellipse cx="40" cy="22" rx="10" ry="16" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="2.5" transform="rotate(' + a + ' 40 36)"/>';
        }
        s += '<circle cx="40" cy="36" r="9" fill="#ffd43b" stroke="#e67700" stroke-width="2.5"/><circle cx="37" cy="33" r="3" fill="#fff" opacity="0.7"/>';
        return svg(80, 80, s);
    }

    function arbusto() {
        var s = '<g stroke="#1b5e20" stroke-width="8"><circle cx="60" cy="90" r="48" fill="#2f9e44"/><circle cx="120" cy="70" r="58" fill="#2f9e44"/><circle cx="180" cy="92" r="46" fill="#2f9e44"/></g>' +
            '<circle cx="60" cy="90" r="48" fill="#40c057"/><circle cx="120" cy="70" r="58" fill="#51cf66"/><circle cx="180" cy="92" r="46" fill="#40c057"/>' +
            '<rect x="14" y="100" width="212" height="40" fill="#40c057"/>' +
            '<circle cx="100" cy="50" r="22" fill="#fff" opacity="0.16"/>' +
            '<g fill="#e03131" stroke="#7a1010" stroke-width="2"><circle cx="70" cy="80" r="7"/><circle cx="140" cy="62" r="7"/><circle cx="176" cy="96" r="6"/><circle cx="108" cy="100" r="6"/></g>';
        return svg(240, 140, s);
    }

    function letrero() {
        return svg(220, 200, '<rect x="100" y="70" width="20" height="130" rx="6" fill="#8b5a2b" stroke="#3b2414" stroke-width="4"/>' +
            '<path d="M16 22 L 186 14 L 210 52 L 186 92 L 18 96 Z" fill="#c08850" stroke="#3b2414" stroke-width="5" stroke-linejoin="round"/>' +
            '<path d="M24 34 L 180 28" stroke="#e0b07a" stroke-width="5" stroke-linecap="round" opacity="0.7"/>' +
            '<path d="M26 82 L 180 78" stroke="#8b5a2b" stroke-width="4" stroke-linecap="round" opacity="0.6"/>' +
            '<text x="104" y="68" text-anchor="middle" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="900" font-size="34" fill="#4a2a12" letter-spacing="2">PEDNIA</text>');
    }

    function mariposa(c1, c2) {
        return svg(90, 70, '<path d="M45 34 C 30 4, 4 6, 8 26 C 10 40, 30 40, 45 36 Z" fill="' + c1 + '" stroke="#3b2414" stroke-width="3"/>' +
            '<path d="M45 34 C 60 4, 86 6, 82 26 C 80 40, 60 40, 45 36 Z" fill="' + c1 + '" stroke="#3b2414" stroke-width="3"/>' +
            '<path d="M45 38 C 32 46, 18 62, 30 64 C 40 64, 44 52, 45 40 Z" fill="' + c2 + '" stroke="#3b2414" stroke-width="3"/>' +
            '<path d="M45 38 C 58 46, 72 62, 60 64 C 50 64, 46 52, 45 40 Z" fill="' + c2 + '" stroke="#3b2414" stroke-width="3"/>' +
            '<circle cx="24" cy="24" r="5" fill="#fff" opacity="0.8"/><circle cx="66" cy="24" r="5" fill="#fff" opacity="0.8"/>' +
            '<rect x="42" y="22" width="6" height="34" rx="3" fill="#3b2414"/>' +
            '<path d="M44 22 C 40 12, 36 10, 32 8 M46 22 C 50 12, 54 10, 58 8" stroke="#3b2414" stroke-width="2.5" fill="none" stroke-linecap="round"/>');
    }

    // ------------------------------------------------------------------ partículas y efectos (blancas: se tiñen)

    function estrella() {
        return svg(64, 64, '<path d="M32 4 L 40 24 L 61 25 L 44 38 L 50 59 L 32 47 L 14 59 L 20 38 L 3 25 L 24 24 Z" fill="#ffd43b" stroke="#e67700" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M32 14 L 36 26 L 28 26 Z" fill="#fff" opacity="0.7"/>');
    }

    function destello() {
        return svg(64, 64, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="32" cy="32" r="16" fill="url(#g)"/>' +
            '<path d="M32 0 C 34 24, 40 30, 64 32 C 40 34, 34 40, 32 64 C 30 40, 24 34, 0 32 C 24 30, 30 24, 32 0 Z" fill="#fff"/>');
    }

    function chispa() {
        return svg(48, 48, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="24" cy="24" r="24" fill="url(#g)"/>');
    }

    function luz() {
        return svg(256, 256, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="128" cy="128" r="128" fill="url(#g)"/>');
    }

    function anillo() {
        return svg(200, 200, '<circle cx="100" cy="100" r="88" fill="none" stroke="#fff" stroke-width="10"/><circle cx="100" cy="100" r="88" fill="none" stroke="#fff" stroke-width="24" opacity="0.25"/>');
    }

    function hojaFx() {
        return svg(40, 28, '<path d="M2 14 C 8 2, 28 0, 38 12 C 28 26, 8 26, 2 14 Z" fill="#fff" stroke="#999" stroke-width="2"/><path d="M4 14 L 34 12" stroke="#bbb" stroke-width="1.5"/>');
    }

    function confeti() {
        return svg(16, 24, '<rect x="1" y="1" width="14" height="22" rx="3" fill="#fff"/>');
    }

    function serpentina() {
        return svg(30, 140, '<path d="M15 4 C 28 22, 2 40, 15 58 C 28 76, 2 94, 15 112 C 24 124, 18 132, 15 136" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>');
    }

    function sombra() {
        return svg(160, 40, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1a3a0c" stop-opacity="0.55"/><stop offset="1" stop-color="#1a3a0c" stop-opacity="0"/></radialGradient></defs><ellipse cx="80" cy="20" rx="80" ry="20" fill="url(#g)"/>');
    }

    function rayo() {
        return svg(220, 900, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M80 0 L 140 0 L 220 900 L 0 900 Z" fill="url(#g)"/>');
    }

    // ------------------------------------------------------------------ rasterizado (una vez)

    // [clave, svg, resolución]: lo que se agranda o se ve de cerca va a 2×, el fondo a 1×.
    function lista() {
        var l = [
            ["cielo", cielo(), 0.8],
            ["sol", sol(), 1],
            ["nube-0", nube(0), 1.2],
            ["nube-1", nube(1), 1.2],
            ["nube-2", nube(2), 1.2],
            ["montanas", montanas(), 0.9],
            ["bosque-lejano", bosqueLejano(), 1],
            ["arbol-medio-0", arbolMedio(0), 1.2],
            ["arbol-medio-1", arbolMedio(1), 1.2],
            ["arbol-medio-2", arbolMedio(2), 1.2],
            ["pradera", pradera(), 1],
            ["helecho", helecho(), 1.4],
            ["pasto-frente", pastoFrente(), 1],
            ["vineta", vineta(), 1],
            ["arcoiris", arcoiris(), 0.8],
            ["pajaro", pajaro(), 1.5],
            ["tronco", tronco(), 1.4],
            ["copa-atras", copa("atras"), 1.25],
            ["copa-frente", copa("frente"), 1.25],
            ["nido", nido(), 1.6],
            ["cinta-circulo", cinta("#f03e3e", "#a51111"), 2],
            ["cinta-cuadrado", cinta("#7950f2", "#3f1c9e"), 2],
            ["cinta-triangulo", cinta("#5c940d", "#2b5a0a"), 2],
            ["cinta-corazon", cinta("#e64980", "#a61e4d"), 2],
            ["cinta-estrella", cinta("#f08c00", "#a85d00"), 2],
            ["flor-0", flor("#ffffff", "#ced4da"), 1.5],
            ["flor-1", flor("#ffc9de", "#e64980"), 1.5],
            ["flor-2", flor("#d0bfff", "#7950f2"), 1.5],
            ["flor-3", flor("#ffe066", "#f08c00"), 1.5],
            ["arbusto", arbusto(), 1.4],
            ["letrero", letrero(), 1.5],
            ["mariposa-0", mariposa("#ff922b", "#ffd43b"), 1.5],
            ["mariposa-1", mariposa("#4dabf7", "#a5d8ff"), 1.5],
            ["estrella", estrella(), 1.5],
            ["destello", destello(), 1.5],
            ["chispa", chispa(), 1.5],
            ["luz", luz(), 1],
            ["anillo", anillo(), 1.2],
            ["hoja", hojaFx(), 1.5],
            ["confeti", confeti(), 1.5],
            ["serpentina", serpentina(), 1.5],
            ["sombra", sombra(), 1.2],
            ["rayo", rayo(), 0.6]
        ];
        Object.keys(FORMAS).forEach(function (f) {
            l.push(["fruto-" + f, fruto(f), 2]);
            l.push(["molde-" + f, molde(f), 2]);
            l.push(["brillo-" + f, brilloForma(f), 1.2]);
            l.push(["borde-" + f, bordeForma(f), 2]);
        });
        return l;
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
                console.warn("[DibujosArbol] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) {
            listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        }
        return listo;
    }

    function dataUrl(s) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); }

    global.DibujosArbol = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        formas: Object.keys(FORMAS),
        FRUTO: FRUTO,
        MOLDE: MOLDE,
        // Para el contador del HUD (DOM): el mismo fruto o su silueta punteada.
        urlFruto: function (forma) { return dataUrl(fruto(forma)); },
        urlSilueta: function (forma) { return dataUrl(frutoSombra(forma)); },
        svgFruto: fruto,
        svgMolde: molde
    };
})(typeof window !== "undefined" ? window : global);
