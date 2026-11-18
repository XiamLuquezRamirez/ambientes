/**
 * IconosArdilla — dibujos SVG originales de "La Ardilla y la Bellota Gigante" (window.IconosArdilla.SVG).
 * La escena los rasteriza a texturas (escala 2). La ardilla va por piezas en un mismo marco de 240 × 240
 * (cola, cuerpo, cabeza, párpados) para mover la cola, la cabeza y parpadear.
 */
(function (global) {
    "use strict";

    var NARANJA = "#e8590c", NARANJA2 = "#fd7e14", CREMA = "#ffe8cc", CAFE = "#7a3d12";

    // ------------------------------------------------------------------ follaje natural (generado con semilla)

    var PALETAS = {
        roja: ["#5e1414", "#9b2222", "#c9372c", "#e8613f", "#ffa07a"],
        naranja: ["#6e2c06", "#b34a0c", "#e0701c", "#f59a3c", "#ffd08a"],
        amarilla: ["#7a5806", "#bf870e", "#dba51c", "#f2c94c", "#fff0a8"]
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
     * Copa de árbol con aspecto natural: ramas que asoman, una masa de racimos oscuros atrás, racimos medios y
     * racimos iluminados arriba a la izquierda (cada uno con su degradado de luz), y hojitas sueltas de textura.
     * paletas: lista de nombres de PALETAS (se mezclan al azar); e: { cx, cy, rx, ry, esc, n } dentro del viewBox.
     */
    function follaje(paletas, semilla, e, id) {
        var r = azar(semilla);
        var esc = e.esc || 1;
        var mult = e.n || 1;
        var defs = "<defs>";
        paletas.forEach(function (nom, k) {
            var c = PALETAS[nom];
            [[0, 1], [1, 2], [2, 3], [2, 4]].forEach(function (par, t) {
                defs += '<radialGradient id="' + id + k + t + '" cx="0.35" cy="0.3" r="0.75">' +
                    '<stop offset="0" stop-color="' + c[par[1]] + '"/><stop offset="1" stop-color="' + c[par[0]] + '"/></radialGradient>';
            });
        });
        defs += '<radialGradient id="' + id + 's" cx="0.6" cy="0.85" r="0.65"><stop offset="0" stop-color="#2a1205" stop-opacity="0.4"/>' +
            '<stop offset="1" stop-color="#2a1205" stop-opacity="0"/></radialGradient></defs>';
        var pal = function () { return Math.floor(r() * paletas.length); };
        var out = defs;
        var capa = function (n, tono, rMin, rMax, dMin, dMax, aMin, aMax) {
            for (var i = 0; i < n; i++) {
                var p = puntoElipse(r, e, dMin, dMax, aMin, aMax);
                out += '<path d="' + racimo(r, p.x, p.y, (rMin + r() * (rMax - rMin)) * esc) + '" fill="url(#' + id + pal() + tono + ')"/>';
            }
        };
        // masa de fondo (sombra)
        capa(Math.round(16 * mult), 0, 26, 40, 0.55, 0.92, 0, Math.PI * 2);
        // ramas que asoman entre las hojas
        out += '<g stroke="#4a2a12" stroke-linecap="round" fill="none" opacity="0.9">';
        for (var b = 0; b < 4; b++) {
            var bx = e.cx + (r() - 0.5) * e.rx * 0.3, by = e.cy + e.ry * 0.95;
            var tx = e.cx + (b % 2 ? 1 : -1) * e.rx * (0.35 + r() * 0.35), ty = e.cy + (r() - 0.6) * e.ry * 0.7;
            out += '<path d="M' + n1(bx) + " " + n1(by) + " Q" + n1((bx + tx) / 2) + " " + n1(by - e.ry * 0.35) + " " + n1(tx) + " " + n1(ty) +
                '" stroke-width="' + n1((5 + r() * 3) * esc) + '"/>';
        }
        out += "</g>";
        // racimos medios y de luz (arriba a la izquierda)
        capa(Math.round(22 * mult), 1, 22, 36, 0.1, 0.82, 0, Math.PI * 2);
        capa(Math.round(14 * mult), 2, 18, 30, 0.05, 0.72, Math.PI * 0.95, Math.PI * 1.85);
        capa(Math.round(4 * mult), 3, 10, 16, 0.2, 0.6, Math.PI * 1.05, Math.PI * 1.7);
        // hojitas sueltas (textura)
        for (var h = 0; h < Math.round(70 * mult); h++) {
            var q = puntoElipse(r, e, 0, 0.92, 0, Math.PI * 2);
            var c = PALETAS[paletas[pal()]];
            var luz = q.y < e.cy && q.x < e.cx + e.rx * 0.2;
            var col = luz ? c[3 + Math.floor(r() * 2)] : c[Math.floor(r() * 3)];
            var eh = Math.min(esc, 1.3);   // las hojitas no crecen tanto como los racimos
            out += '<ellipse cx="' + n1(q.x) + '" cy="' + n1(q.y) + '" rx="' + n1((3 + r() * 3.5) * eh) + '" ry="' + n1((1.6 + r() * 1.4) * eh) +
                '" transform="rotate(' + Math.round(r() * 180) + " " + n1(q.x) + " " + n1(q.y) + ')" fill="' + col + '" opacity="' + (0.55 + r() * 0.4).toFixed(2) + '"/>';
        }
        return out;
    }

    function copa(paleta, semilla) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260">' +
            follaje([paleta], semilla, { cx: 150, cy: 138, rx: 118, ry: 98 }, "c") + "</svg>";
    }

    // ------------------------------------------------------------------ ardilla: pelaje (cola peluda generada)

    var PIEL = { osc: "#8a3412", base: "#c9561c", med: "#e0772f", luz: "#f4a25a", borde: "#f9cf98", linea: "#5a2610", crema: "#fff1dc", crema2: "#f1cfa0" };

    /** Línea central suave (Catmull-Rom) con ancho por punto: [x, y, ancho]. */
    function suave(pts, n) {
        var out = [];
        for (var i = 0; i < pts.length - 1; i++) {
            var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
            for (var k = 0; k < n; k++) {
                var t = k / n, t2 = t * t, t3 = t2 * t;
                var f = function (j) {
                    return 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
                };
                out.push([f(0), f(1), p1[2] + (p2[2] - p1[2]) * t]);
            }
        }
        out.push(pts[pts.length - 1]);
        return out;
    }

    /** Contorno de una banda (los dos bordes de la línea central), escalando el ancho. */
    function banda(c, escAncho) {
        var izq = [], der = [];
        for (var i = 0; i < c.length; i++) {
            var a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
            var tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
            var nx = -ty / l, ny = tx / l, h = c[i][2] * escAncho / 2;
            izq.push([c[i][0] + nx * h, c[i][1] + ny * h]);
            der.push([c[i][0] - nx * h, c[i][1] - ny * h]);
        }
        return izq.concat(der.reverse());
    }

    /** Contorno con mechones: cada tramo se curva hacia afuera (borde de pelo, no liso). */
    function peludo(pol, amp, semilla, cada) {
        var r = azar(semilla);
        var pts = pol.filter(function (_, i) { return i % (cada || 1) === 0; });
        var area = 0;
        for (var i = 0; i < pts.length; i++) {
            var q = pts[(i + 1) % pts.length];
            area += pts[i][0] * q[1] - q[0] * pts[i][1];
        }
        var sg = area > 0 ? 1 : -1;
        var d = "M" + n1(pts[0][0]) + " " + n1(pts[0][1]);
        for (var k = 0; k < pts.length; k++) {
            var A = pts[k], B = pts[(k + 1) % pts.length];
            var dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
            var nx = sg * dy / l, ny = -sg * dx / l;
            var m = amp * (0.25 + r() * r() * 1.6), corre = (r() - 0.35) * 0.7;
            var cx = (A[0] + B[0]) / 2 + nx * m + dx * corre, cy = (A[1] + B[1]) / 2 + ny * m + dy * corre;
            d += " Q" + n1(cx) + " " + n1(cy) + " " + n1(B[0]) + " " + n1(B[1]);
        }
        return d + "Z";
    }

    function colaArdilla() {
        // de la base (junto a la espalda) sube por detrás y se enrosca hacia adelante
        var c = suave([[118, 200, 24], [84, 194, 40], [52, 168, 54], [36, 128, 60], [40, 86, 60], [58, 50, 56],
            [88, 26, 50], [120, 26, 42], [136, 46, 32], [128, 68, 18]], 6);
        var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">' +
            '<defs><linearGradient id="cg" x1="0" y1="1" x2="0.4" y2="0"><stop offset="0" stop-color="' + PIEL.osc + '"/>' +
            '<stop offset="0.45" stop-color="' + PIEL.base + '"/><stop offset="1" stop-color="' + PIEL.med + '"/></linearGradient></defs>' +
            // borde claro escarchado (las colas de ardilla tienen las puntas del pelo más claras)
            '<path d="' + peludo(banda(c, 1.02), 11, 5, 3) + '" fill="' + PIEL.borde + '" stroke="' + PIEL.linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="' + peludo(banda(c, 0.86), 7, 9, 2) + '" fill="url(#cg)"/>' +
            '<path d="' + peludo(banda(c, 0.42), 4, 13, 3) + '" fill="' + PIEL.osc + '" opacity="0.45"/>';
        // mechones sueltos a lo largo de la cola
        var r = azar(21);
        out += '<g fill="none" stroke-linecap="round">';
        for (var i = 3; i < c.length - 3; i += 2) {
            var a = c[i - 1], b = c[i + 1];
            var tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
            for (var lado = -1; lado <= 1; lado += 2) {
                var h = c[i][2] * (0.18 + r() * 0.22) * lado;
                var x0 = c[i][0] - ty / l * h, y0 = c[i][1] + tx / l * h;
                var x1 = x0 + (tx / l) * 9 - ty / l * 5 * lado, y1 = y0 + (ty / l) * 9 + tx / l * 5 * lado;
                out += '<path d="M' + n1(x0) + " " + n1(y0) + " Q" + n1((x0 + x1) / 2 + tx / l * 2) + " " + n1((y0 + y1) / 2 + ty / l * 2) + " " + n1(x1) + " " + n1(y1) +
                    '" stroke="' + (r() < 0.5 ? PIEL.luz : PIEL.borde) + '" stroke-width="' + (1.6 + r() * 1.2).toFixed(1) + '" opacity="0.75"/>';
            }
        }
        return out + "</g></svg>";
    }

    var SVG = {
        // ---------------------------------------------------------- ardilla (marco común 240 × 240, mira a la derecha)
        ardillaCola: colaArdilla(),
        ardillaCuerpo:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">' +
            '<defs><radialGradient id="ap" cx="0.42" cy="0.3" r="0.8"><stop offset="0" stop-color="' + PIEL.luz + '"/><stop offset="0.5" stop-color="' + PIEL.med + '"/><stop offset="1" stop-color="' + PIEL.base + '"/></radialGradient>' +
            '<linearGradient id="av" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + PIEL.crema + '"/><stop offset="1" stop-color="' + PIEL.crema2 + '"/></linearGradient>' +
            '<radialGradient id="am" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="' + PIEL.med + '"/><stop offset="1" stop-color="' + PIEL.osc + '"/></radialGradient></defs>' +
            '<ellipse cx="132" cy="232" rx="58" ry="7" fill="#2a1205" opacity="0.2"/>' +
            // tronco del cuerpo (sentada, en forma de pera)
            '<path d="M130 116 C 102 124, 86 156, 86 190 C 86 214, 102 228, 130 228 L 166 228 C 186 226, 192 206, 186 184 C 181 160, 184 134, 170 120 C 158 108, 142 108, 130 116 Z" fill="url(#ap)" stroke="' + PIEL.linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            // panza crema con borde de pelo
            '<path d="M158 124 C 176 134, 182 166, 180 196 C 178 216, 164 224, 152 216 C 142 196, 140 154, 158 124 Z" fill="url(#av)"/>' +
            '<g fill="none" stroke="' + PIEL.crema2 + '" stroke-width="2" stroke-linecap="round" opacity="0.9"><path d="M156 140 l -6 4 M152 160 l -6 3 M152 182 l -6 2 M154 202 l -5 1"/></g>' +
            // muslo trasero
            '<path d="M92 184 C 98 160, 132 156, 144 182 C 152 202, 142 222, 120 226 C 98 228, 88 206, 92 184 Z" fill="url(#am)" opacity="0.5"/>' +
            '<path d="M96 176 C 108 160, 136 164, 142 190" stroke="' + PIEL.luz + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>' +
            // pie trasero largo
            '<path d="M104 220 C 122 214, 160 216, 172 222 C 178 228, 170 234, 150 234 L 110 234 C 98 234, 96 224, 104 220 Z" fill="' + PIEL.base + '" stroke="' + PIEL.linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="M156 224 l 0 8 M164 224 l 0 7" stroke="' + PIEL.linea + '" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/>' +
            // brazo y manitas juntas delante del pecho
            '<path d="M162 140 C 174 146, 184 154, 192 160" stroke="' + PIEL.linea + '" stroke-width="15" stroke-linecap="round" fill="none"/>' +
            '<path d="M162 140 C 174 146, 184 154, 192 160" stroke="' + PIEL.med + '" stroke-width="10" stroke-linecap="round" fill="none"/>' +
            '<path d="M186 154 C 194 150, 202 154, 202 162 C 202 170, 194 172, 188 168 C 184 164, 182 158, 186 154 Z" fill="' + PIEL.crema2 + '" stroke="' + PIEL.linea + '" stroke-width="2.4"/>' +
            '<path d="M196 156 l 6 -3 M199 162 l 6 0 M196 168 l 5 3" stroke="' + PIEL.linea + '" stroke-width="1.8" stroke-linecap="round"/>' +
            // pelito en la espalda
            '<g fill="none" stroke="' + PIEL.base + '" stroke-width="2" stroke-linecap="round" opacity="0.7"><path d="M98 160 l -5 -3 M94 178 l -6 -1 M112 132 l -4 -4"/></g>' +
            '</svg>',
        ardillaCabeza:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">' +
            '<defs><radialGradient id="ah" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="' + PIEL.luz + '"/><stop offset="0.55" stop-color="' + PIEL.med + '"/><stop offset="1" stop-color="' + PIEL.base + '"/></radialGradient>' +
            '<radialGradient id="ao" cx="0.35" cy="0.3" r="0.7"><stop offset="0" stop-color="#5a3420"/><stop offset="0.55" stop-color="#22120a"/><stop offset="1" stop-color="#0e0704"/></radialGradient>' +
            '<linearGradient id="ae" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + PIEL.base + '"/><stop offset="1" stop-color="' + PIEL.osc + '"/></linearGradient></defs>' +
            // oreja de atrás
            '<path d="M120 76 C 110 58, 110 38, 118 26 C 130 36, 138 54, 138 72 Z" fill="url(#ae)" stroke="' + PIEL.linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="M118 26 l -5 -9 M118 26 l 1 -11 M118 26 l 6 -8" stroke="' + PIEL.osc + '" stroke-width="2.4" stroke-linecap="round"/>' +
            // cabeza: cráneo redondo y hocico hacia adelante
            '<path d="M112 100 C 108 72, 130 54, 158 56 C 182 58, 196 72, 200 90 C 212 96, 216 110, 204 118 C 192 126, 172 130, 150 128 C 132 128, 122 124, 118 118 C 108 120, 104 112, 112 106 Z" fill="url(#ah)" stroke="' + PIEL.linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            // mejilla y hocico crema
            '<path d="M150 106 C 164 96, 190 98, 206 106 C 212 114, 202 124, 186 126 C 168 128, 148 122, 150 106 Z" fill="' + PIEL.crema + '"/>' +
            // oreja de adelante con penacho
            '<path d="M140 68 C 136 48, 140 30, 150 20 C 162 30, 168 48, 164 66 Z" fill="url(#ah)" stroke="' + PIEL.linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="M146 62 C 144 48, 147 36, 151 30 C 157 38, 159 50, 158 62 Z" fill="#e9a08c"/>' +
            '<path d="M150 20 l -6 -10 M150 20 l 1 -13 M150 20 l 7 -9" stroke="' + PIEL.osc + '" stroke-width="2.6" stroke-linecap="round"/>' +
            // anillo claro alrededor del ojo y ojo brillante
            '<ellipse cx="162" cy="88" rx="15" ry="16.5" fill="' + PIEL.crema + '" opacity="0.85"/>' +
            '<ellipse cx="162" cy="88" rx="10.5" ry="12.5" fill="url(#ao)"/>' +
            '<circle cx="166" cy="82.5" r="4.2" fill="#fff"/><circle cx="158.5" cy="93.5" r="1.8" fill="#fff" opacity="0.85"/>' +
            '<path d="M150 80 C 156 72, 168 72, 175 79" stroke="' + PIEL.linea + '" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.7"/>' +
            // nariz, boca y bigotes
            '<path d="M200 100 C 204 97, 212 99, 211 104 C 210 108, 204 110, 201 107 C 198 105, 198 102, 200 100 Z" fill="#4a2416"/>' +
            '<ellipse cx="205" cy="101.5" rx="2.2" ry="1.3" fill="#fff" opacity="0.5"/>' +
            '<path d="M204 109 C 203 114, 198 117, 192 115" stroke="' + PIEL.linea + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
            '<g stroke="' + PIEL.linea + '" stroke-width="1.1" stroke-linecap="round" opacity="0.55"><path d="M196 108 L 222 102 M196 111 L 223 112 M195 114 L 219 121"/></g>' +
            '<ellipse cx="176" cy="114" rx="7" ry="4.5" fill="#ff8f7a" opacity="0.4"/>' +
            '</svg>',
        ardillaParpados:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">' +
            '<ellipse cx="162" cy="88" rx="11.5" ry="13.5" fill="' + PIEL.med + '"/>' +
            '<path d="M151 89 C 156 95, 168 95, 173 89" stroke="#22120a" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
            '<path d="M154 92 l -2 3 M162 94.5 l 0 3.5 M170 92 l 2 3" stroke="#22120a" stroke-width="1.6" stroke-linecap="round"/>' +
            '</svg>',

        // ---------------------------------------------------------- bellota gigante
        bellota:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">' +
            '<defs><radialGradient id="bn" cx="0.38" cy="0.4" r="0.7"><stop offset="0" stop-color="#e8a05a"/><stop offset="0.6" stop-color="#c06a26"/><stop offset="1" stop-color="#8a4413"/></radialGradient></defs>' +
            '<path d="M18 58 C 18 100, 40 130, 60 136 C 80 130, 102 100, 102 58 Z" fill="url(#bn)" stroke="#5c2c0b" stroke-width="5" stroke-linejoin="round"/>' +
            '<ellipse cx="42" cy="82" rx="9" ry="20" fill="#fff" opacity="0.35" transform="rotate(12 42 82)"/>' +
            '<path d="M60 136 l 0 -6" stroke="#5c2c0b" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M8 58 C 8 30, 30 18, 60 18 C 90 18, 112 30, 112 58 C 112 66, 8 66, 8 58 Z" fill="#8a5a2b" stroke="#4a2a0e" stroke-width="5" stroke-linejoin="round"/>' +
            '<g stroke="#5e3a17" stroke-width="2.5" opacity="0.8">' +
            '<path d="M22 44 l 12 14 M38 32 l 18 26 M58 26 l 18 32 M78 30 l 16 26 M96 42 l 8 14"/>' +
            '<path d="M98 44 l -12 14 M82 32 l -18 26 M62 26 l -18 32 M42 30 l -16 26 M24 42 l -8 14"/></g>' +
            '<path d="M60 18 C 60 8, 64 2, 72 2" stroke="#4a2a0e" stroke-width="7" fill="none" stroke-linecap="round"/>' +
            '</svg>',

        // ---------------------------------------------------------- cesta (parte de atrás y frente: la bellota entra entre las dos)
        cestaAtras:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 200">' +
            '<path d="M44 96 C 44 10, 216 10, 216 96" stroke="#7a4b1d" stroke-width="16" fill="none" stroke-linecap="round"/>' +
            '<path d="M44 96 C 44 10, 216 10, 216 96" stroke="#c8873f" stroke-width="7" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="130" cy="96" rx="112" ry="26" fill="#4a2a0e"/>' +
            '<g transform="translate(78 64) scale(0.42)"><path d="M18 58 C 18 100, 40 130, 60 136 C 80 130, 102 100, 102 58 Z" fill="#b5651d" stroke="#5c2c0b" stroke-width="6"/><path d="M8 58 C 8 30, 112 30, 112 58 Z" fill="#7a4b23" stroke="#4a2a0e" stroke-width="6"/></g>' +
            '<g transform="translate(150 58) scale(0.45) rotate(14 60 70)"><path d="M18 58 C 18 100, 40 130, 60 136 C 80 130, 102 100, 102 58 Z" fill="#c4752b" stroke="#5c2c0b" stroke-width="6"/><path d="M8 58 C 8 30, 112 30, 112 58 Z" fill="#7a4b23" stroke="#4a2a0e" stroke-width="6"/></g>' +
            '<path d="M60 92 c 10 -22 34 -22 40 -4 c -14 -2 -28 2 -40 4 z" fill="#f08c00"/>' +
            '<path d="M176 92 c 14 -18 36 -14 38 2 c -12 -4 -26 -4 -38 -2 z" fill="#e03131"/>' +
            '<path d="M118 86 c 4 -16 22 -18 26 -4 c -8 -2 -18 0 -26 4 z" fill="#fab005"/>' +
            '</svg>',
        cestaFrente:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 200">' +
            '<ellipse cx="130" cy="192" rx="104" ry="8" fill="#000" opacity="0.2"/>' +
            '<path d="M18 96 C 18 120, 130 128, 242 96 L 214 186 C 180 196, 80 196, 46 186 Z" fill="#c8873f" stroke="#6b3d12" stroke-width="6" stroke-linejoin="round"/>' +
            '<g stroke="#8f5a22" stroke-width="5" fill="none" opacity="0.9">' +
            '<path d="M28 128 C 90 140, 170 140, 232 128"/><path d="M36 154 C 92 166, 168 166, 224 154"/>' +
            '<path d="M70 112 L 76 192 M106 118 L 108 194 M142 118 L 140 194 M178 114 L 174 192 M210 106 L 202 188"/></g>' +
            '<path d="M14 96 C 14 124, 246 124, 246 96 C 246 112, 14 112, 14 96 Z" fill="#a0652a" stroke="#6b3d12" stroke-width="6"/>' +
            '<path d="M40 104 C 90 116, 170 116, 220 104" stroke="#e8b06a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<path d="M196 150 c 18 -6 30 6 26 20 c -10 -8 -18 -12 -26 -20 z" fill="#e03131" stroke="#a61e1e" stroke-width="2"/>' +
            '</svg>',

        // ---------------------------------------------------------- obstáculos (rodeables)
        tronco:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 130">' +
            '<ellipse cx="120" cy="116" rx="110" ry="12" fill="#000" opacity="0.22"/>' +
            '<path d="M30 30 L 200 30 L 200 106 L 30 106 Z" fill="#8a5225" stroke="#4a2a0e" stroke-width="6" stroke-linejoin="round"/>' +
            '<ellipse cx="30" cy="68" rx="20" ry="38" fill="#7a4520" stroke="#4a2a0e" stroke-width="6"/>' +
            '<g stroke="#5e3416" stroke-width="4" stroke-linecap="round" opacity="0.8"><path d="M60 46 L 170 46"/><path d="M52 66 L 150 66"/><path d="M70 88 L 186 88"/></g>' +
            '<ellipse cx="200" cy="68" rx="24" ry="38" fill="#e2a868" stroke="#4a2a0e" stroke-width="6"/>' +
            '<ellipse cx="200" cy="68" rx="15" ry="25" fill="none" stroke="#b07038" stroke-width="3.5"/>' +
            '<ellipse cx="200" cy="68" rx="7" ry="12" fill="none" stroke="#b07038" stroke-width="3"/>' +
            '<path d="M90 30 C 96 14, 120 12, 128 26 Z" fill="#69b34c" stroke="#2b8a3e" stroke-width="3"/>' +
            '<path d="M120 30 c 10 -16 26 -12 28 0 z" fill="#f08c00"/><path d="M60 30 c 4 -12 18 -12 20 -2 z" fill="#e03131"/>' +
            '</svg>',
        tronquito:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
            '<ellipse cx="60" cy="108" rx="54" ry="10" fill="#000" opacity="0.22"/>' +
            '<path d="M16 40 L 16 96 C 16 112, 104 112, 104 96 L 104 40 Z" fill="#8a5225" stroke="#4a2a0e" stroke-width="5"/>' +
            '<path d="M10 100 l 12 -8 M110 100 l -12 -8" stroke="#4a2a0e" stroke-width="6" stroke-linecap="round"/>' +
            '<g stroke="#5e3416" stroke-width="3.5" stroke-linecap="round" opacity="0.8"><path d="M34 54 L 34 96"/><path d="M60 58 L 60 102"/><path d="M84 54 L 84 96"/></g>' +
            '<ellipse cx="60" cy="40" rx="44" ry="18" fill="#e2a868" stroke="#4a2a0e" stroke-width="5"/>' +
            '<ellipse cx="60" cy="40" rx="28" ry="11" fill="none" stroke="#b07038" stroke-width="3"/>' +
            '<ellipse cx="60" cy="40" rx="12" ry="5" fill="none" stroke="#b07038" stroke-width="2.5"/>' +
            '<path d="M86 30 c 10 -14 24 -10 24 2 z" fill="#f59f00"/>' +
            '</svg>',
        piedra:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">' +
            '<ellipse cx="60" cy="90" rx="56" ry="9" fill="#000" opacity="0.22"/>' +
            '<path d="M12 80 C 4 52, 26 20, 58 18 C 92 16, 116 44, 110 78 C 96 92, 26 94, 12 80 Z" fill="#9aa5ae" stroke="#4b5560" stroke-width="5"/>' +
            '<path d="M30 46 C 40 30, 60 26, 76 30" stroke="#dee2e6" stroke-width="6" fill="none" stroke-linecap="round"/>' +
            '<path d="M74 82 C 66 64, 78 54, 96 60" stroke="#6c7680" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
            '<path d="M78 22 c 10 -10 22 -6 22 4 z" fill="#69b34c"/>' +
            '</svg>',
        rama:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 100">' +
            '<ellipse cx="85" cy="88" rx="78" ry="9" fill="#000" opacity="0.2"/>' +
            '<path d="M8 66 C 50 58, 100 62, 162 46" stroke="#4a2a0e" stroke-width="18" stroke-linecap="round" fill="none"/>' +
            '<path d="M8 66 C 50 58, 100 62, 162 46" stroke="#8a5225" stroke-width="10" stroke-linecap="round" fill="none"/>' +
            '<path d="M70 62 C 80 40, 96 30, 112 22" stroke="#6b3d12" stroke-width="8" stroke-linecap="round" fill="none"/>' +
            '<path d="M40 64 C 34 50, 30 40, 20 32" stroke="#6b3d12" stroke-width="7" stroke-linecap="round" fill="none"/>' +
            '<path d="M112 22 c 16 -14 34 -8 36 6 c -14 -2 -24 -2 -36 -6 z" fill="#e8590c" stroke="#a83d07" stroke-width="2"/>' +
            '<path d="M20 32 c -4 -16 8 -28 20 -24 c -6 10 -12 18 -20 24 z" fill="#fab005" stroke="#c48f00" stroke-width="2"/>' +
            '<path d="M140 48 c 14 4 22 18 14 28 c -6 -10 -10 -18 -14 -28 z" fill="#e03131" stroke="#a61e1e" stroke-width="2"/>' +
            '</svg>',
        hongos:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
            '<ellipse cx="60" cy="110" rx="54" ry="8" fill="#000" opacity="0.2"/>' +
            '<path d="M70 104 L 74 62 L 90 62 L 92 104 Z" fill="#fff4e6" stroke="#8a5a2b" stroke-width="4"/>' +
            '<path d="M48 70 C 48 30, 116 30, 116 70 Z" fill="#e03131" stroke="#8a1c1c" stroke-width="5"/>' +
            '<circle cx="70" cy="50" r="6" fill="#fff"/><circle cx="92" cy="44" r="5" fill="#fff"/><circle cx="102" cy="60" r="4" fill="#fff"/>' +
            '<path d="M30 106 L 33 78 L 44 78 L 46 106 Z" fill="#fff4e6" stroke="#8a5a2b" stroke-width="4"/>' +
            '<path d="M16 82 C 16 52, 62 52, 62 82 Z" fill="#f76707" stroke="#a83d07" stroke-width="5"/>' +
            '<circle cx="32" cy="70" r="4" fill="#fff"/><circle cx="46" cy="66" r="3.5" fill="#fff"/>' +
            '</svg>',
        arbusto:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120">' +
            '<ellipse cx="70" cy="110" rx="64" ry="9" fill="#000" opacity="0.2"/>' +
            '<g stroke="#2b6a1e" stroke-width="4"><circle cx="40" cy="74" r="32" fill="#5c9e31"/><circle cx="100" cy="74" r="32" fill="#5c9e31"/><circle cx="70" cy="52" r="38" fill="#74b83e"/></g>' +
            '<circle cx="56" cy="40" r="10" fill="#a9e34b" opacity="0.6"/>' +
            '<g fill="#e03131" stroke="#8a1c1c" stroke-width="2"><circle cx="48" cy="62" r="6"/><circle cx="88" cy="50" r="6"/><circle cx="100" cy="82" r="6"/><circle cx="66" cy="88" r="5"/></g>' +
            '<path d="M76 20 c 10 -12 24 -8 24 4 z" fill="#fd7e14"/>' +
            '</svg>',

        // ---------------------------------------------------------- bosque
        arbolTronco:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 220">' +
            '<defs><linearGradient id="tr" x1="0" x2="1"><stop offset="0" stop-color="#8f6240"/><stop offset="0.45" stop-color="#6b4427"/><stop offset="1" stop-color="#3b2312"/></linearGradient></defs>' +
            '<ellipse cx="45" cy="214" rx="44" ry="5" fill="#2a1a08" opacity="0.25"/>' +
            '<path d="M32 0 C 34 40, 31 90, 30 140 C 29 170, 24 192, 10 206 C 4 211, 2 215, 6 216 L 30 213 L 44 216 L 60 213 L 84 216 C 88 215, 86 211, 80 206 C 66 192, 61 170, 60 140 C 59 90, 56 40, 58 0 Z" fill="url(#tr)" stroke="#2e1a0b" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<g fill="none" stroke-linecap="round">' +
            '<path d="M38 8 C 36 50, 39 90, 36 150 C 35 175, 30 195, 20 208" stroke="#2e1a0b" stroke-width="1.6" opacity="0.45"/>' +
            '<path d="M48 20 C 50 70, 46 120, 49 170 C 50 190, 56 200, 66 209" stroke="#2e1a0b" stroke-width="1.4" opacity="0.4"/>' +
            '<path d="M54 40 C 55 80, 53 110, 55 140" stroke="#2e1a0b" stroke-width="1.2" opacity="0.35"/>' +
            '<path d="M35 30 C 34 60, 36 80, 34 110" stroke="#c49a6c" stroke-width="1.4" opacity="0.4"/>' +
            '<path d="M41 120 C 40 140, 41 155, 39 170" stroke="#c49a6c" stroke-width="1.2" opacity="0.35"/></g>' +
            '<path d="M44 96 c -4 2, -5 8, -1 10 c 4 1, 6 -4, 4 -8 z" fill="#2e1a0b" opacity="0.6"/>' +
            '</svg>',
        copaRoja: copa("roja", 11),
        copaNaranja: copa("naranja", 23),
        copaAmarilla: copa("amarilla", 37),
        hoja:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
            '<path d="M20 2 C 30 10, 36 20, 20 38 C 4 20, 10 10, 20 2 Z" fill="#ffffff" stroke="#c9c9c9" stroke-width="1.5"/>' +
            '<path d="M20 6 L 20 36 M20 18 L 12 12 M20 18 L 28 12 M20 26 L 12 20 M20 26 L 28 20" stroke="#bdbdbd" stroke-width="1.5" fill="none"/>' +
            '</svg>',
        flor:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 56">' +
            '<path d="M20 26 C 20 38, 18 46, 20 56" stroke="#2b8a3e" stroke-width="3.5" fill="none"/>' +
            '<path d="M20 44 c -8 -6 -14 -2 -14 4 c 6 0 10 -2 14 -4 z" fill="#40c057"/>' +
            '<g fill="#ffffff" stroke="#d0d0d0" stroke-width="1.2"><circle cx="20" cy="9" r="7"/><circle cx="30" cy="17" r="7"/><circle cx="26" cy="28" r="7"/><circle cx="14" cy="28" r="7"/><circle cx="10" cy="17" r="7"/></g>' +
            '<circle cx="20" cy="19" r="5.5" fill="#fab005" stroke="#c48f00" stroke-width="1.5"/>' +
            '</svg>',
        hierba:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">' +
            '<g fill="#5c9e31" stroke="#2b6a1e" stroke-width="2" stroke-linejoin="round">' +
            '<path d="M10 40 C 10 26, 6 16, 2 8 C 12 16, 18 26, 20 40 Z"/><path d="M22 40 C 24 22, 28 10, 32 2 C 34 14, 34 28, 34 40 Z"/><path d="M36 40 C 40 28, 48 18, 58 12 C 52 22, 48 32, 48 40 Z"/></g>' +
            '</svg>',
        cerca:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110">' +
            '<g fill="#b9773b" stroke="#5e3416" stroke-width="5" stroke-linejoin="round">' +
            '<path d="M14 26 L 30 10 L 46 26 L 46 106 L 14 106 Z"/><path d="M154 26 L 170 10 L 186 26 L 186 106 L 154 106 Z"/>' +
            '<rect x="0" y="36" width="200" height="18" rx="4"/><rect x="0" y="70" width="200" height="18" rx="4"/></g>' +
            '<g stroke="#d9984f" stroke-width="3" stroke-linecap="round"><path d="M60 42 L 140 42"/><path d="M60 76 L 140 76"/></g>' +
            '</svg>',

        // ---------------------------------------------------------- final: el árbol con la casa de la ardilla
        arbolCasa:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700">' +
            '<defs><linearGradient id="trC" x1="0" x2="1"><stop offset="0" stop-color="#8f6240"/><stop offset="0.45" stop-color="#6b4427"/><stop offset="1" stop-color="#3b2312"/></linearGradient></defs><ellipse cx="300" cy="684" rx="250" ry="16" fill="#000" opacity="0.2"/>' +
            '<path d="M220 300 L 380 300 L 396 640 C 430 664, 470 670, 480 684 L 120 684 C 130 670, 170 664, 204 640 Z" fill="url(#trC)" stroke="#2e1a0b" stroke-width="3" stroke-linejoin="round"/>' +
            '<g stroke="#2e1a0b" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.45"><path d="M250 330 C 246 420, 252 520, 236 630"/><path d="M350 340 C 356 430, 348 520, 362 600"/><path d="M300 320 C 304 360, 296 380, 300 400"/></g>' +
            // puerta redonda
            '<ellipse cx="300" cy="520" rx="58" ry="74" fill="#3d1f0a" stroke="#c8873f" stroke-width="10"/>' +
            '<path d="M252 540 C 252 470, 348 470, 348 540 L 348 594 L 252 594 Z" fill="#c8873f" stroke="#6b3d12" stroke-width="5"/>' +
            '<g stroke="#8f5a22" stroke-width="4"><path d="M276 488 L 276 594"/><path d="M300 482 L 300 594"/><path d="M324 488 L 324 594"/></g>' +
            '<circle cx="334" cy="548" r="6" fill="#ffd43b" stroke="#a86b00" stroke-width="2"/>' +
            // ventana con luz
            '<circle cx="300" cy="400" r="34" fill="#ffe066" stroke="#6b3d12" stroke-width="8"/>' +
            '<path d="M300 366 L 300 434 M266 400 L 334 400" stroke="#6b3d12" stroke-width="6"/>' +
            // letrero
            '<rect x="372" y="440" width="96" height="40" rx="8" fill="#e2a868" stroke="#6b3d12" stroke-width="5"/>' +
            '<path d="M392 470 c 6 -22 26 -22 30 -4 M430 462 c 6 -8 16 -8 20 0" stroke="#7a3d12" stroke-width="5" fill="none" stroke-linecap="round"/>' +
            '<path d="M384 480 L 384 520" stroke="#6b3d12" stroke-width="6"/>' +
            // balcón
            '<rect x="150" y="440" width="76" height="12" rx="4" fill="#b9773b" stroke="#5e3416" stroke-width="4"/>' +
            // copa (follaje natural que mezcla los tres colores del otoño)
            follaje(["naranja", "roja", "amarilla", "naranja"], 71, { cx: 300, cy: 190, rx: 262, ry: 165, esc: 2.1, n: 3 }, "k") +
            '</svg>'
    };

    global.IconosArdilla = { SVG: SVG };
})(window);
