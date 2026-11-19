/**
 * IconosBurbujas — dibujos propios del juego (window.IconosBurbujas).
 *
 * - La estrella (la burbuja de la demo y la que nombra Zeus). Los demás juguetes son los que ya existían en
 *   Polimotor, copiados a img/ (config.json → objetos[].imagen): los SVG de Arrastrar y Soltar Objetos y los PNG
 *   del pato, el oso y el balón. La escena rasteriza todo a textura (ico-<id>).
 * - Los árboles del parque: mismo generador de follaje y tronco que "La Ardilla y la Bellota Gigante"
 *   (racimos ondulados con degradado de luz, ramas que asoman y hojitas sueltas, sin contorno), con paletas de
 *   parque colorido: rosada, lila, verde y durazno. La copa va aparte del tronco para que se meza.
 */
(function (global) {
    "use strict";

    var S = function (cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">' + cuerpo + "</svg>";
    };

    // ------------------------------------------------------------------ follaje natural (copiado de la Ardilla)

    // de la sombra a la luz
    var PALETAS = {
        rosa: ["#8a1f55", "#c93a83", "#ee6aa8", "#ff9fcb", "#ffdaed"],
        lila: ["#3f2a8a", "#6146c4", "#8b6ff0", "#b8a2ff", "#e9e0ff"],
        verde: ["#1f5e1a", "#2f8a2a", "#4fb33d", "#86d65e", "#d0f7a4"],
        durazno: ["#8a4a06", "#c46f0c", "#f0961c", "#ffc04f", "#ffeab0"]
    };

    function azar(semilla) {
        var s = semilla >>> 0;
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function n1(v) { return Math.round(v * 10) / 10; }

    /** Racimo de hojas: contorno ondulado e irregular (no un círculo). */
    function racimo(r, cx, cy, rad) {
        var lob = 7 + Math.floor(r() * 4);
        var pts = [];
        var giro = r() * Math.PI * 2;
        for (var i = 0; i < lob; i++) {
            var a = giro + i / lob * Math.PI * 2 + (r() - 0.5) * 0.35;
            var rr = rad * (0.78 + r() * 0.2);
            pts.push({ a: a, x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
        }
        var d = "M" + n1(pts[0].x) + " " + n1(pts[0].y);
        for (var k = 0; k < lob; k++) {
            var p0 = pts[k], p1 = pts[(k + 1) % lob];
            var am = p0.a + (((p1.a - p0.a) + Math.PI * 4) % (Math.PI * 2)) / 2;
            var rc = rad * (1.04 + r() * 0.16);
            d += " Q" + n1(cx + Math.cos(am) * rc) + " " + n1(cy + Math.sin(am) * rc) + " " + n1(p1.x) + " " + n1(p1.y);
        }
        return d + "Z";
    }

    function puntoElipse(r, e, dMin, dMax, aMin, aMax) {
        var a = aMin + r() * (aMax - aMin);
        var d = dMin + Math.sqrt(r()) * (dMax - dMin);
        return { x: e.cx + Math.cos(a) * d * e.rx, y: e.cy + Math.sin(a) * d * e.ry };
    }

    /**
     * Copa con aspecto natural: masa de racimos oscuros atrás, ramas que asoman, racimos medios y racimos
     * iluminados arriba a la izquierda (cada uno con su degradado de luz) y hojitas sueltas de textura.
     * Las copas rosada y lila llevan además florecitas blancas.
     */
    function follaje(nombre, semilla, e, id, flores) {
        var r = azar(semilla);
        var c = PALETAS[nombre];
        var out = "<defs>";
        [[0, 1], [1, 2], [2, 3], [2, 4]].forEach(function (par, t) {
            out += '<radialGradient id="' + id + t + '" cx="0.35" cy="0.3" r="0.75">' +
                '<stop offset="0" stop-color="' + c[par[1]] + '"/><stop offset="1" stop-color="' + c[par[0]] + '"/></radialGradient>';
        });
        out += "</defs>";
        var capa = function (n, tono, rMin, rMax, dMin, dMax, aMin, aMax) {
            for (var i = 0; i < n; i++) {
                var p = puntoElipse(r, e, dMin, dMax, aMin, aMax);
                out += '<path d="' + racimo(r, p.x, p.y, rMin + r() * (rMax - rMin)) + '" fill="url(#' + id + tono + ')"/>';
            }
        };
        capa(16, 0, 26, 40, 0.55, 0.92, 0, Math.PI * 2);
        out += '<g stroke="#5a3418" stroke-linecap="round" fill="none" opacity="0.9">';
        for (var b = 0; b < 4; b++) {
            var bx = e.cx + (r() - 0.5) * e.rx * 0.3, by = e.cy + e.ry * 0.95;
            var tx = e.cx + (b % 2 ? 1 : -1) * e.rx * (0.35 + r() * 0.35), ty = e.cy + (r() - 0.6) * e.ry * 0.7;
            out += '<path d="M' + n1(bx) + " " + n1(by) + " Q" + n1((bx + tx) / 2) + " " + n1(by - e.ry * 0.35) + " " + n1(tx) + " " + n1(ty) +
                '" stroke-width="' + n1(5 + r() * 3) + '"/>';
        }
        out += "</g>";
        capa(22, 1, 22, 36, 0.1, 0.82, 0, Math.PI * 2);
        capa(14, 2, 18, 30, 0.05, 0.72, Math.PI * 0.95, Math.PI * 1.85);
        capa(4, 3, 10, 16, 0.2, 0.6, Math.PI * 1.05, Math.PI * 1.7);
        for (var h = 0; h < 70; h++) {
            var q = puntoElipse(r, e, 0, 0.92, 0, Math.PI * 2);
            var luz = q.y < e.cy && q.x < e.cx + e.rx * 0.2;
            var col = luz ? c[3 + Math.floor(r() * 2)] : c[Math.floor(r() * 3)];
            out += '<ellipse cx="' + n1(q.x) + '" cy="' + n1(q.y) + '" rx="' + n1(3 + r() * 3.5) + '" ry="' + n1(1.6 + r() * 1.4) +
                '" transform="rotate(' + Math.round(r() * 180) + " " + n1(q.x) + " " + n1(q.y) + ')" fill="' + col + '" opacity="' + (0.55 + r() * 0.4).toFixed(2) + '"/>';
        }
        if (flores) {
            for (var f = 0; f < 18; f++) {
                var fp = puntoElipse(r, e, 0.1, 0.85, 0, Math.PI * 2);
                var fr = 4 + r() * 2.5;
                var pet = "";
                for (var k = 0; k < 5; k++) {
                    var a = k / 5 * Math.PI * 2;
                    pet += '<circle cx="' + n1(fp.x + Math.cos(a) * fr) + '" cy="' + n1(fp.y + Math.sin(a) * fr) + '" r="' + n1(fr * 0.72) + '"/>';
                }
                out += '<g fill="#ffffff" opacity="0.92">' + pet + '</g><circle cx="' + n1(fp.x) + '" cy="' + n1(fp.y) + '" r="' + n1(fr * 0.5) + '" fill="#ffd43b"/>';
            }
        }
        return out;
    }

    function copa(nombre, semilla, flores) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" width="300" height="260">' +
            follaje(nombre, semilla, { cx: 150, cy: 138, rx: 118, ry: 98 }, "c" + nombre, flores) + "</svg>";
    }

    var SVG = {
        estrella: S(
            '<path d="M60,8 L74,42 L111,44 L82,67 L92,104 L60,84 L28,104 L38,67 L9,44 L46,42 Z" fill="#ffd43b" stroke="#e67700" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M60,22 L70,46 L94,48" fill="none" stroke="#fff3bf" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>' +
            '<circle cx="49" cy="62" r="5" fill="#5c3b00"/><circle cx="71" cy="62" r="5" fill="#5c3b00"/>' +
            '<circle cx="51" cy="60" r="1.8" fill="#fff"/><circle cx="73" cy="60" r="1.8" fill="#fff"/>' +
            '<path d="M52,73 Q60,80 68,73" fill="none" stroke="#5c3b00" stroke-width="4" stroke-linecap="round"/>' +
            '<ellipse cx="42" cy="72" rx="6" ry="4" fill="#ff8fab" opacity=".7"/><ellipse cx="78" cy="72" rx="6" ry="4" fill="#ff8fab" opacity=".7"/>'
        )
    };

    // Árboles del parque (texturas arb-<nombre>): tronco con vetas (de la Ardilla) y cuatro copas.
    var ARBOL = {
        tronco:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 220" width="90" height="220">' +
            '<defs><linearGradient id="tr" x1="0" x2="1"><stop offset="0" stop-color="#a0714a"/><stop offset="0.45" stop-color="#7a4f2c"/><stop offset="1" stop-color="#46291a"/></linearGradient></defs>' +
            '<path d="M32 0 C 34 40, 31 90, 30 140 C 29 170, 24 192, 10 206 C 4 211, 2 215, 6 216 L 30 213 L 44 216 L 60 213 L 84 216 C 88 215, 86 211, 80 206 C 66 192, 61 170, 60 140 C 59 90, 56 40, 58 0 Z" fill="url(#tr)"/>' +
            '<g fill="none" stroke-linecap="round">' +
            '<path d="M38 8 C 36 50, 39 90, 36 150 C 35 175, 30 195, 20 208" stroke="#3a2210" stroke-width="1.6" opacity="0.4"/>' +
            '<path d="M48 20 C 50 70, 46 120, 49 170 C 50 190, 56 200, 66 209" stroke="#3a2210" stroke-width="1.4" opacity="0.35"/>' +
            '<path d="M35 30 C 34 60, 36 80, 34 110" stroke="#d4aa7c" stroke-width="1.4" opacity="0.45"/>' +
            '<path d="M41 120 C 40 140, 41 155, 39 170" stroke="#d4aa7c" stroke-width="1.2" opacity="0.4"/></g>' +
            '<path d="M44 96 c -4 2, -5 8, -1 10 c 4 1, 6 -4, 4 -8 z" fill="#3a2210" opacity="0.55"/>' +
            '</svg>',
        rosa: copa("rosa", 11, true),
        lila: copa("lila", 23, true),
        verde: copa("verde", 37, false),
        durazno: copa("durazno", 53, false)
    };

    global.IconosBurbujas = { SVG: SVG, ARBOL: ARBOL };
})(window);
