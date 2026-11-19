/**
 * DibujosComer — dibujos de "¡La Hora de Comer!" con la misma gráfica de "La Ardilla y la Bellota Gigante":
 * SVG con contorno oscuro y redondeado, degradados radiales de luz arriba a la izquierda, pelaje con borde
 * de mechones, follaje natural por racimos, pasto con manchas y briznas, cercas de madera.
 *
 * DibujosComer.preparar() rasteriza todos los SVG a <canvas> (una sola vez); luego cada función devuelve su
 * canvas para convertirlo en textura de Phaser. svgFruta(tipo) da el SVG como data URL (contador y final).
 */
(function (global) {
    "use strict";

    var TAU = Math.PI * 2;
    var cache = {};
    var listo = null;

    // ------------------------------------------------------------------ utilidades (las mismas de la Ardilla)

    function azar(semilla) {
        var s = semilla >>> 0;
        var f = function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
        f.entre = function (a, b) { return a + f() * (b - a); };
        return f;
    }

    function n1(v) { return Math.round(v * 10) / 10; }

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    function rg(id, paradas, cx, cy, r) {
        return '<radialGradient id="' + id + '" cx="' + (cx == null ? 0.4 : cx) + '" cy="' + (cy == null ? 0.3 : cy) + '" r="' + (r == null ? 0.8 : r) + '">' +
            paradas.map(function (p) { return '<stop offset="' + p[0] + '" stop-color="' + p[1] + '"/>'; }).join("") + "</radialGradient>";
    }

    function lg(id, paradas, x2, y2) {
        return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' +
            paradas.map(function (p) { return '<stop offset="' + p[0] + '" stop-color="' + p[1] + '"/>'; }).join("") + "</linearGradient>";
    }

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

    var PALETAS = {
        roja: ["#5e1414", "#9b2222", "#c9372c", "#e8613f", "#ffa07a"],
        naranja: ["#6e2c06", "#b34a0c", "#e0701c", "#f59a3c", "#ffd08a"],
        amarilla: ["#7a5806", "#bf870e", "#dba51c", "#f2c94c", "#fff0a8"],
        verde: ["#173d10", "#2b6a1e", "#4c9e2c", "#7cc24a", "#c0eb75"]
    };

    /** Copa natural: masa oscura, ramas que asoman, racimos medios y de luz, hojitas sueltas. */
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
        defs += "</defs>";
        var pal = function () { return Math.floor(r() * paletas.length); };
        var out = defs;
        var capa = function (n, tono, rMin, rMax, dMin, dMax, aMin, aMax) {
            for (var i = 0; i < n; i++) {
                var p = puntoElipse(r, e, dMin, dMax, aMin, aMax);
                out += '<path d="' + racimo(r, p.x, p.y, (rMin + r() * (rMax - rMin)) * esc) + '" fill="url(#' + id + pal() + tono + ')"/>';
            }
        };
        capa(Math.round(16 * mult), 0, 26, 40, 0.55, 0.92, 0, Math.PI * 2);
        out += '<g stroke="#4a2a12" stroke-linecap="round" fill="none" opacity="0.9">';
        for (var b = 0; b < 4; b++) {
            var bx = e.cx + (r() - 0.5) * e.rx * 0.3, by = e.cy + e.ry * 0.95;
            var tx = e.cx + (b % 2 ? 1 : -1) * e.rx * (0.35 + r() * 0.35), ty = e.cy + (r() - 0.6) * e.ry * 0.7;
            out += '<path d="M' + n1(bx) + " " + n1(by) + " Q" + n1((bx + tx) / 2) + " " + n1(by - e.ry * 0.35) + " " + n1(tx) + " " + n1(ty) +
                '" stroke-width="' + n1((5 + r() * 3) * esc) + '"/>';
        }
        out += "</g>";
        capa(Math.round(22 * mult), 1, 22, 36, 0.1, 0.82, 0, Math.PI * 2);
        capa(Math.round(14 * mult), 2, 18, 30, 0.05, 0.72, Math.PI * 0.95, Math.PI * 1.85);
        capa(Math.round(4 * mult), 3, 10, 16, 0.2, 0.6, Math.PI * 1.05, Math.PI * 1.7);
        for (var h = 0; h < Math.round(70 * mult); h++) {
            var q = puntoElipse(r, e, 0, 0.92, 0, Math.PI * 2);
            var c = PALETAS[paletas[pal()]];
            var luz = q.y < e.cy && q.x < e.cx + e.rx * 0.2;
            var col = luz ? c[3 + Math.floor(r() * 2)] : c[Math.floor(r() * 3)];
            var eh = Math.min(esc, 1.3);
            out += '<ellipse cx="' + n1(q.x) + '" cy="' + n1(q.y) + '" rx="' + n1((3 + r() * 3.5) * eh) + '" ry="' + n1((1.6 + r() * 1.4) * eh) +
                '" transform="rotate(' + Math.round(r() * 180) + " " + n1(q.x) + " " + n1(q.y) + ')" fill="' + col + '" opacity="' + (0.55 + r() * 0.4).toFixed(2) + '"/>';
        }
        return out;
    }

    /** Contorno con mechones (borde de pelo, no liso). */
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

    function elipsePol(cx, cy, rx, ry, n) {
        var p = [];
        for (var i = 0; i < n; i++) {
            var a = i / n * TAU;
            p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
        }
        return p;
    }

    // ------------------------------------------------------------------ osito pardo (más real: pelaje con textura, hocico con volumen)

    var PIEL = {
        osc: "#3a2010", base: "#64391c", med: "#82502a", luz: "#b47c4a", linea: "#24130a",
        hocico: "#dcb88e", hocico2: "#a97e55", pecho: "#a8784c", pecho2: "#7d5130",
        oreja: "#4a2c18", almohadilla: "#33231d", garra: "#efe6d8"
    };

    var DEF_PIEL = rg("pp", [[0, PIEL.luz], [0.45, PIEL.med], [1, PIEL.osc]], 0.38, 0.28, 0.85) +
        rg("ph", [[0, "#f1d6b2"], [0.55, PIEL.hocico], [1, PIEL.hocico2]], 0.42, 0.3, 0.8) +
        rg("pc", [[0, "#c39566"], [0.6, PIEL.pecho], [1, PIEL.pecho2]], 0.45, 0.3, 0.8) +
        rg("pa", [[0, "#5a463e"], [1, PIEL.almohadilla]], 0.4, 0.3, 0.8);

    /**
     * Textura de pelaje: muchos mechones cortos que salen hacia afuera y un poco hacia abajo, con tonos claros
     * arriba a la izquierda (luz) y oscuros abajo a la derecha (sombra).
     */
    function pelaje(semilla, e, n, largo, grosor) {
        var r = azar(semilla);
        var out = '<g fill="none" stroke-linecap="round">';
        for (var i = 0; i < n; i++) {
            var a = r() * TAU, d = Math.sqrt(r()) * 0.95;
            var x = e.cx + Math.cos(a) * d * e.rx, y = e.cy + Math.sin(a) * d * e.ry;
            var dir = Math.atan2(y - e.cy, x - e.cx) * 0.55 + Math.PI / 2 * 0.45;
            var l = largo * (0.6 + r() * 0.7);
            var x1 = x + Math.cos(dir) * l, y1 = y + Math.sin(dir) * l;
            var luz = (x - e.cx) / e.rx + (y - e.cy) / e.ry < -0.25;
            var sombra = (x - e.cx) / e.rx + (y - e.cy) / e.ry > 0.55;
            var col = luz ? (r() < 0.6 ? PIEL.luz : "#c99464") : (sombra ? PIEL.osc : (r() < 0.5 ? PIEL.base : PIEL.med));
            out += '<path d="M' + n1(x) + " " + n1(y) + " Q" + n1((x + x1) / 2 + Math.cos(dir + 1.4) * l * 0.18) + " " + n1((y + y1) / 2 + Math.sin(dir + 1.4) * l * 0.18) + " " + n1(x1) + " " + n1(y1) +
                '" stroke="' + col + '" stroke-width="' + n1(grosor * (0.7 + r() * 0.6)) + '" opacity="' + (0.35 + r() * 0.4).toFixed(2) + '"/>';
        }
        return out + "</g>";
    }

    function oreja(cx, cy, izq) {
        return '<path d="' + peludo(elipsePol(cx, cy, 42, 40, 24), 5, izq ? 31 : 37, 1) + '" fill="url(#pp)" stroke="' + PIEL.linea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<ellipse cx="' + (cx + (izq ? 4 : -4)) + '" cy="' + (cy + 6) + '" rx="22" ry="20" fill="' + PIEL.oreja + '"/>' +
            '<path d="M' + (cx - 14) + " " + (cy + 14) + " Q " + cx + " " + (cy - 6) + " " + (cx + 14) + " " + (cy + 14) + '" stroke="' + PIEL.luz + '" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>';
    }

    function garras(pts) {
        return '<g stroke="' + PIEL.garra + '" stroke-width="3.2" stroke-linecap="round">' +
            pts.map(function (p) { return '<path d="M' + p[0] + " " + p[1] + " l " + p[2] + " " + p[3] + '"/>'; }).join("") + "</g>";
    }

    var BRAZO_D = peludo([[14, 28], [26, 10], [45, 4], [64, 10], [76, 28], [78, 70], [78, 110], [62, 130], [45, 136], [28, 130], [12, 110], [12, 70]], 5, 17, 1);
    var PIERNA_D = peludo([[10, 0], [86, 0], [86, 50], [84, 104], [66, 124], [48, 128], [30, 124], [12, 104], [10, 50]], 4, 23, 1);

    /** Máscara vertical: oculta lo que está arriba (desde) y muestra desde (hasta) hacia abajo. */
    function mascaraArriba(w, h, desde, hasta) {
        return '<linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="' + desde + '" stop-color="#000"/>' +
            '<stop offset="' + hasta + '" stop-color="#fff"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
            '<mask id="mk" maskUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + h + '"><rect width="' + w + '" height="' + h + '" fill="url(#mg)"/></mask>';
    }

    /** Relleno de pelo completo + contorno oscuro solo de la parte de abajo (la de arriba entra al cuerpo). */
    function extremidad(d) {
        return '<path d="' + d + '" fill="url(#pp)"/>' +
            '<path d="' + d + '" fill="none" stroke="' + PIEL.linea + '" stroke-width="3.2" stroke-linejoin="round" mask="url(#mk)"/>';
    }

    var OSO = {
        cuerpo: svg(300, 290,
            "<defs>" + DEF_PIEL + "</defs>" +
            '<path d="' + peludo(elipsePol(150, 152, 122, 130, 52), 7, 3, 1) + '" fill="url(#pp)" stroke="' + PIEL.linea + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            pelaje(101, { cx: 150, cy: 150, rx: 112, ry: 120 }, 230, 15, 2.6) +
            // pecho más claro con borde de pelo
            '<path d="' + peludo(elipsePol(150, 176, 70, 84, 36), 6, 7, 1) + '" fill="url(#pc)" opacity="0.95"/>' +
            pelaje(103, { cx: 150, cy: 176, rx: 60, ry: 74 }, 70, 10, 2) +
            // sombra bajo la cabeza y a los lados (volumen)
            '<ellipse cx="150" cy="40" rx="96" ry="34" fill="' + PIEL.osc + '" opacity="0.35"/>' +
            '<path d="M240 90 C 268 150, 262 220, 220 268" stroke="' + PIEL.osc + '" stroke-width="22" fill="none" stroke-linecap="round" opacity="0.25"/>'),
        cabeza: svg(280, 250,
            "<defs>" + DEF_PIEL + rg("pn", [[0, "#5a4038"], [0.45, "#1e130e"], [1, "#0a0604"]], 0.35, 0.3, 0.7) +
            rg("sh", [[0, "rgba(0,0,0,0)"], [0.7, "rgba(0,0,0,0)"], [1, "rgba(30,15,5,0.35)"]], 0.5, 0.45, 0.6) + "</defs>" +
            oreja(54, 58, true) + oreja(226, 58, false) +
            '<path d="' + peludo(elipsePol(140, 134, 118, 104, 56), 6, 11, 1) + '" fill="url(#pp)" stroke="' + PIEL.linea + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            pelaje(107, { cx: 140, cy: 128, rx: 106, ry: 92 }, 200, 12, 2.2) +
            '<ellipse cx="140" cy="134" rx="118" ry="104" fill="url(#sh)"/>' +
            // frente con mechón y cejas
            '<path d="M120 34 Q 132 18 140 30 Q 150 16 162 34" stroke="' + PIEL.luz + '" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.7"/>' +
            '<path d="M76 94 C 86 86, 104 86, 114 94 M166 94 C 176 86, 194 86, 204 94" stroke="' + PIEL.osc + '" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.55"/>' +
            // cuencas de los ojos (más oscuras)
            '<ellipse cx="96" cy="118" rx="22" ry="20" fill="' + PIEL.osc + '" opacity="0.35"/><ellipse cx="184" cy="118" rx="22" ry="20" fill="' + PIEL.osc + '" opacity="0.35"/>' +
            // hocico con volumen
            '<path d="' + peludo(elipsePol(140, 172, 62, 46, 30), 3, 13, 1) + '" fill="url(#ph)" stroke="' + PIEL.hocico2 + '" stroke-width="2.4"/>' +
            pelaje(109, { cx: 140, cy: 176, rx: 52, ry: 36 }, 40, 6, 1.4).replace(/stroke="#[0-9a-f]+"/g, 'stroke="' + PIEL.hocico2 + '"') +
            '<ellipse cx="140" cy="200" rx="40" ry="14" fill="' + PIEL.hocico2 + '" opacity="0.35"/>' +
            // nariz grande y brillante con orificios
            '<path d="M118 146 C 118 132, 162 132, 162 146 C 162 160, 148 168, 140 168 C 132 168, 118 160, 118 146 Z" fill="url(#pn)" stroke="' + PIEL.linea + '" stroke-width="2"/>' +
            '<ellipse cx="131" cy="141" rx="8" ry="4" fill="#fff" opacity="0.55" transform="rotate(-12 131 141)"/>' +
            '<ellipse cx="130" cy="156" rx="4" ry="2.6" fill="#000" opacity="0.7"/><ellipse cx="150" cy="156" rx="4" ry="2.6" fill="#000" opacity="0.7"/>' +
            '<path d="M140 168 L 140 178" stroke="' + PIEL.linea + '" stroke-width="3" stroke-linecap="round"/>' +
            // puntitos de bigote
            '<g fill="' + PIEL.hocico2 + '"><circle cx="112" cy="178" r="1.8"/><circle cx="104" cy="186" r="1.8"/><circle cx="116" cy="190" r="1.8"/><circle cx="168" cy="178" r="1.8"/><circle cx="176" cy="186" r="1.8"/><circle cx="164" cy="190" r="1.8"/></g>'),
        // brazos y piernas: el contorno oscuro se borra arriba (máscara) para que se fundan con el cuerpo
        brazo: svg(90, 150,
            "<defs>" + DEF_PIEL + mascaraArriba(90, 150, 0.2, 0.36) + "</defs>" +
            extremidad(BRAZO_D) +
            pelaje(111, { cx: 45, cy: 70, rx: 28, ry: 56 }, 50, 10, 2) +
            '<ellipse cx="45" cy="120" rx="22" ry="16" fill="url(#pa)" stroke="' + PIEL.linea + '" stroke-width="2"/>' +
            garras([[30, 132, -3, 8], [40, 136, -1, 9], [50, 136, 1, 9], [60, 132, 3, 8]])),
        pie: svg(130, 100,
            "<defs>" + DEF_PIEL + "</defs>" +
            '<path d="' + peludo(elipsePol(65, 52, 58, 42, 30), 4, 19, 1) + '" fill="url(#pp)" stroke="' + PIEL.linea + '" stroke-width="3.2"/>' +
            pelaje(113, { cx: 65, cy: 50, rx: 50, ry: 34 }, 40, 8, 1.8) +
            '<ellipse cx="68" cy="62" rx="26" ry="22" fill="url(#pa)" stroke="' + PIEL.linea + '" stroke-width="2"/>' +
            [[46, 32], [64, 26], [84, 28], [98, 38]].map(function (p) {
                return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="8" ry="7" fill="url(#pa)" stroke="' + PIEL.linea + '" stroke-width="1.6"/>';
            }).join("") +
            garras([[44, 24, -2, -7], [63, 18, 0, -8], [84, 20, 2, -7], [100, 30, 4, -6]])),
        pierna: svg(96, 136,
            "<defs>" + DEF_PIEL + mascaraArriba(96, 136, 0.2, 0.36) + "</defs>" +
            extremidad(PIERNA_D) +
            pelaje(115, { cx: 48, cy: 60, rx: 32, ry: 54 }, 50, 9, 2) +
            '<ellipse cx="48" cy="114" rx="28" ry="14" fill="url(#pa)" stroke="' + PIEL.linea + '" stroke-width="2"/>' +
            garras([[30, 124, -2, 6], [42, 127, -1, 7], [54, 127, 1, 7], [66, 124, 2, 6]]))
    };

    // ------------------------------------------------------------------ frutas (128 × 128, contorno del mismo color oscurecido)

    function hojaFruta(x, y, rot, largo) {
        var l = largo || 30;
        return '<g transform="translate(' + x + " " + y + ") rotate(" + rot + ')">' +
            '<path d="M0 0 C ' + l * 0.3 + " -" + l * 0.4 + ", " + l * 0.75 + " -" + l * 0.4 + ", " + l + ' 0 C ' + l * 0.75 + " " + l * 0.4 + ", " + l * 0.3 + " " + l * 0.4 + ', 0 0 Z" fill="#69b34c" stroke="#2b6a1e" stroke-width="2.5" stroke-linejoin="round"/>' +
            '<path d="M3 0 L ' + l * 0.85 + ' 0" stroke="#2b6a1e" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/></g>';
    }

    function tallo(d) {
        return '<path d="' + d + '" stroke="#4a2a0e" stroke-width="6" fill="none" stroke-linecap="round"/>';
    }

    function brilloSvg(cx, cy, rx, ry, rot, op) {
        return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" opacity="' + (op || 0.45) + '" transform="rotate(' + (rot || -25) + " " + cx + " " + cy + ')"/>';
    }

    var FRUTAS = {
        manzana: "<defs>" + rg("f", [[0, "#ff8a8a"], [0.5, "#e03131"], [1, "#a51111"]], 0.38, 0.35, 0.75) + "</defs>" +
            '<path d="M64 34 C 88 18, 122 32, 116 70 C 112 102, 88 122, 72 114 C 66 111, 62 111, 56 114 C 40 122, 16 102, 12 70 C 6 32, 40 18, 64 34 Z" fill="url(#f)" stroke="#7a1010" stroke-width="4.5" stroke-linejoin="round"/>' +
            brilloSvg(40, 56, 11, 20, 20) + tallo("M64 36 Q 64 22 72 12") + hojaFruta(70, 22, -30, 32),
        pera: "<defs>" + rg("f", [[0, "#f4fce3"], [0.45, "#a9e34b"], [1, "#5c940d"]], 0.38, 0.45, 0.75) + "</defs>" +
            '<path d="M64 20 C 80 20, 82 44, 86 56 C 108 70, 112 112, 64 120 C 16 112, 20 70, 42 56 C 46 44, 48 20, 64 20 Z" fill="url(#f)" stroke="#3f6b0a" stroke-width="4.5" stroke-linejoin="round"/>' +
            '<ellipse cx="86" cy="96" rx="12" ry="8" fill="#ff922b" opacity="0.3"/>' + brilloSvg(48, 80, 8, 18, 15) + tallo("M64 24 Q 62 14 58 6") + hojaFruta(62, 12, 20, 26),
        banano: "<defs>" + lg("f", [[0, "#fff3bf"], [0.45, "#ffd43b"], [1, "#e8a400"]]) + lg("g", [[0, "#fff9db"], [0.4, "#ffe066"], [1, "#f08c00"]]) + "</defs>" +
            '<path d="M18 34 C 26 94, 92 112, 114 64 C 106 78, 46 90, 30 30 Z" fill="url(#f)" stroke="#a86b00" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M18 48 C 26 108, 92 126, 114 78 C 106 92, 46 104, 30 44 Z" fill="url(#g)" stroke="#a86b00" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M40 92 C 60 108, 84 108, 100 96" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>' +
            '<ellipse cx="23" cy="32" rx="7" ry="9" fill="#5c3613" stroke="#3d1d0a" stroke-width="2"/><ellipse cx="113" cy="70" rx="4" ry="5" fill="#5c3613"/>',
        naranja: "<defs>" + rg("f", [[0, "#ffe8cc"], [0.5, "#ff922b"], [1, "#d9480f"]], 0.38, 0.35, 0.75) + "</defs>" +
            '<circle cx="64" cy="72" r="48" fill="url(#f)" stroke="#a83d07" stroke-width="4.5"/>' +
            (function () {
                var r = azar(5), o = "";
                for (var i = 0; i < 34; i++) {
                    var a = r() * TAU, d = Math.sqrt(r()) * 40;
                    o += '<circle cx="' + n1(64 + Math.cos(a) * d) + '" cy="' + n1(72 + Math.sin(a) * d) + '" r="1.7" fill="#c2410c" opacity="0.35"/>';
                }
                return o;
            })() +
            brilloSvg(46, 54, 11, 17, -30) + '<ellipse cx="64" cy="25" rx="7" ry="5" fill="#5c3613" stroke="#3d1d0a" stroke-width="2"/>' + hojaFruta(66, 24, -25, 30),
        fresa: "<defs>" + rg("f", [[0, "#ff8787"], [0.5, "#e03131"], [1, "#9b1c1c"]], 0.38, 0.35, 0.75) + "</defs>" +
            '<path d="M64 120 C 30 100, 10 60, 24 40 C 38 22, 90 22, 104 40 C 118 60, 98 100, 64 120 Z" fill="url(#f)" stroke="#8a1c1c" stroke-width="4.5" stroke-linejoin="round"/>' +
            (function () {
                var o = "";
                for (var f = 0; f < 5; f++) for (var c = 0; c < 6 - f; c++) {
                    o += '<ellipse cx="' + (64 + (c - (5 - f) / 2) * 14) + '" cy="' + (52 + f * 14) + '" rx="2.4" ry="3.4" fill="#ffe066" stroke="#c48f00" stroke-width="0.8"/>';
                }
                return o;
            })() +
            brilloSvg(42, 56, 8, 15, 25) +
            '<path d="M64 30 L 40 26 L 52 38 L 34 46 L 56 44 L 64 54 L 72 44 L 94 46 L 76 38 L 88 26 Z" fill="#40c057" stroke="#2b6a1e" stroke-width="2.5" stroke-linejoin="round"/>' + tallo("M64 32 Q 64 20 68 10"),
        uvas: "<defs>" + rg("f", [[0, "#e5dbff"], [0.5, "#845ef7"], [1, "#4c2a9e"]], 0.35, 0.3, 0.75) + "</defs>" +
            [[44, 44], [64, 40], [84, 44], [34, 62], [54, 60], [74, 60], [94, 62], [44, 80], [64, 80], [84, 80], [54, 98], [74, 98], [64, 114]].map(function (p) {
                return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="12.5" fill="url(#f)" stroke="#3b1f80" stroke-width="2.6"/>' +
                    '<ellipse cx="' + (p[0] - 4) + '" cy="' + (p[1] - 5) + '" rx="3" ry="4.5" fill="#fff" opacity="0.55"/>';
            }).join("") + tallo("M64 30 Q 66 18 72 8") + hojaFruta(72, 16, -15, 30)
    };

    // ------------------------------------------------------------------ objetos del picnic y del bosque (estilo Ardilla)

    var OBJ = {
        plato: svg(500, 150,
            "<defs>" + lg("pl", [[0, "#ffffff"], [0.6, "#d0ebff"], [1, "#74c0fc"]]) + "</defs>" +
            '<ellipse cx="250" cy="90" rx="238" ry="54" fill="#000" opacity="0.2"/>' +
            '<ellipse cx="250" cy="74" rx="236" ry="58" fill="url(#pl)" stroke="#1c5a8a" stroke-width="5"/>' +
            '<ellipse cx="250" cy="76" rx="182" ry="38" fill="#f8fbff" stroke="#74c0fc" stroke-width="3.5"/>' +
            '<ellipse cx="250" cy="74" rx="212" ry="49" fill="none" stroke="#4dabf7" stroke-width="3.5" stroke-dasharray="12 10"/>' +
            '<path d="M80 54 C 140 34, 240 28, 330 30" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.8"/>'),
        cesta: svg(260, 230,
            '<ellipse cx="130" cy="218" rx="108" ry="9" fill="#000" opacity="0.2"/>' +
            '<path d="M44 106 C 44 18, 216 18, 216 106" stroke="#7a4b1d" stroke-width="16" fill="none" stroke-linecap="round"/>' +
            '<path d="M44 106 C 44 18, 216 18, 216 106" stroke="#c8873f" stroke-width="7" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="130" cy="106" rx="112" ry="26" fill="#4a2a0e"/>' +
            '<path d="M18 106 C 18 130, 130 138, 242 106 L 214 206 C 180 216, 80 216, 46 206 Z" fill="#c8873f" stroke="#6b3d12" stroke-width="6" stroke-linejoin="round"/>' +
            '<g stroke="#8f5a22" stroke-width="5" fill="none" opacity="0.9"><path d="M28 140 C 90 152, 170 152, 232 140"/><path d="M36 168 C 92 180, 168 180, 224 168"/>' +
            '<path d="M70 122 L 76 212 M106 128 L 108 214 M142 128 L 140 214 M178 124 L 174 212 M210 116 L 202 208"/></g>' +
            '<path d="M14 106 C 14 134, 246 134, 246 106 C 246 122, 14 122, 14 106 Z" fill="#a0652a" stroke="#6b3d12" stroke-width="6"/>' +
            '<path d="M40 114 C 90 126, 170 126, 220 114" stroke="#e8b06a" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<path d="M150 98 L 214 92 L 232 150 L 176 160 Z" fill="#fff" stroke="#8a1c1c" stroke-width="4" stroke-linejoin="round"/>' +
            '<g fill="#e03131" opacity="0.85"><path d="M166 97 L 182 96 L 186 112 L 170 114 Z"/><path d="M198 94 L 214 92 L 218 108 L 202 110 Z"/><path d="M174 128 L 190 126 L 194 142 L 178 144 Z"/><path d="M206 124 L 222 122 L 226 138 L 210 140 Z"/></g>'),
        letrero: svg(220, 200,
            '<ellipse cx="110" cy="192" rx="44" ry="7" fill="#000" opacity="0.2"/>' +
            '<rect x="100" y="70" width="20" height="124" rx="4" fill="#8a5225" stroke="#4a2a0e" stroke-width="5"/>' +
            '<path d="M14 26 L 182 22 L 210 52 L 184 82 L 14 84 Z" fill="#e2a868" stroke="#6b3d12" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M30 34 L 170 32" stroke="#f3d1a0" stroke-width="4" stroke-linecap="round"/>' +
            '<text x="104" y="66" text-anchor="middle" font-family="Fredoka, Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="34" fill="#7a3d12">PEDNIA</text>'),
        arbolTronco:
            '<path d="M32 0 C 34 40, 31 90, 30 140 C 29 170, 24 192, 10 206 C 4 211, 2 215, 6 216 L 30 213 L 44 216 L 60 213 L 84 216 C 88 215, 86 211, 80 206 C 66 192, 61 170, 60 140 C 59 90, 56 40, 58 0 Z" fill="url(#tr)" stroke="#2e1a0b" stroke-width="1.6" stroke-linejoin="round"/>' +
            '<g fill="none" stroke-linecap="round"><path d="M38 8 C 36 50, 39 90, 36 150 C 35 175, 30 195, 20 208" stroke="#2e1a0b" stroke-width="1.6" opacity="0.45"/>' +
            '<path d="M48 20 C 50 70, 46 120, 49 170 C 50 190, 56 200, 66 209" stroke="#2e1a0b" stroke-width="1.4" opacity="0.4"/>' +
            '<path d="M35 30 C 34 60, 36 80, 34 110" stroke="#c49a6c" stroke-width="1.4" opacity="0.4"/></g>' +
            '<path d="M44 96 c -4 2, -5 8, -1 10 c 4 1, 6 -4, 4 -8 z" fill="#2e1a0b" opacity="0.6"/>',
        cerca: svg(200, 110,
            '<g fill="#b9773b" stroke="#5e3416" stroke-width="5" stroke-linejoin="round">' +
            '<path d="M14 26 L 30 10 L 46 26 L 46 106 L 14 106 Z"/><path d="M154 26 L 170 10 L 186 26 L 186 106 L 154 106 Z"/>' +
            '<rect x="0" y="36" width="200" height="18" rx="4"/><rect x="0" y="70" width="200" height="18" rx="4"/></g>' +
            '<g stroke="#d9984f" stroke-width="3" stroke-linecap="round"><path d="M60 42 L 140 42"/><path d="M60 76 L 140 76"/></g>'),
        arbusto: svg(140, 120,
            '<ellipse cx="70" cy="110" rx="64" ry="9" fill="#000" opacity="0.2"/>' +
            '<g stroke="#2b6a1e" stroke-width="4"><circle cx="40" cy="74" r="32" fill="#5c9e31"/><circle cx="100" cy="74" r="32" fill="#5c9e31"/><circle cx="70" cy="52" r="38" fill="#74b83e"/></g>' +
            '<circle cx="56" cy="40" r="10" fill="#a9e34b" opacity="0.6"/>' +
            '<g fill="#e03131" stroke="#8a1c1c" stroke-width="2"><circle cx="48" cy="62" r="6"/><circle cx="88" cy="50" r="6"/><circle cx="100" cy="82" r="6"/><circle cx="66" cy="88" r="5"/></g>' +
            '<path d="M76 20 c 10 -12 24 -8 24 4 z" fill="#fd7e14"/>'),
        hongos: svg(120, 120,
            '<ellipse cx="60" cy="110" rx="54" ry="8" fill="#000" opacity="0.2"/>' +
            '<path d="M70 104 L 74 62 L 90 62 L 92 104 Z" fill="#fff4e6" stroke="#8a5a2b" stroke-width="4"/>' +
            '<path d="M48 70 C 48 30, 116 30, 116 70 Z" fill="#e03131" stroke="#8a1c1c" stroke-width="5"/>' +
            '<circle cx="70" cy="50" r="6" fill="#fff"/><circle cx="92" cy="44" r="5" fill="#fff"/><circle cx="102" cy="60" r="4" fill="#fff"/>' +
            '<path d="M30 106 L 33 78 L 44 78 L 46 106 Z" fill="#fff4e6" stroke="#8a5a2b" stroke-width="4"/>' +
            '<path d="M16 82 C 16 52, 62 52, 62 82 Z" fill="#f76707" stroke="#a83d07" stroke-width="5"/>' +
            '<circle cx="32" cy="70" r="4" fill="#fff"/><circle cx="46" cy="66" r="3.5" fill="#fff"/>'),
        hierba: svg(60, 40,
            '<g fill="#5c9e31" stroke="#2b6a1e" stroke-width="2" stroke-linejoin="round">' +
            '<path d="M10 40 C 10 26, 6 16, 2 8 C 12 16, 18 26, 20 40 Z"/><path d="M22 40 C 24 22, 28 10, 32 2 C 34 14, 34 28, 34 40 Z"/><path d="M36 40 C 40 28, 48 18, 58 12 C 52 22, 48 32, 48 40 Z"/></g>'),
        hoja: svg(40, 40,
            '<path d="M20 2 C 30 10, 36 20, 20 38 C 4 20, 10 10, 20 2 Z" fill="#ffffff" stroke="#c9c9c9" stroke-width="1.5"/>' +
            '<path d="M20 6 L 20 36 M20 18 L 12 12 M20 18 L 28 12 M20 26 L 12 20 M20 26 L 28 20" stroke="#bdbdbd" stroke-width="1.5" fill="none"/>'),
        corazon: svg(64, 60,
            "<defs>" + rg("c", [[0, "#ffc9d6"], [0.5, "#ff4d79"], [1, "#c2255c"]], 0.35, 0.3, 0.8) + "</defs>" +
            '<path d="M32 55 C 6 36, 2 16, 16 8 C 25 3, 31 9, 32 15 C 33 9, 39 3, 48 8 C 62 16, 58 36, 32 55 Z" fill="url(#c)" stroke="#a61e4d" stroke-width="3" stroke-linejoin="round"/>' +
            '<ellipse cx="19" cy="17" rx="5" ry="3.5" fill="#fff" opacity="0.7" transform="rotate(-35 19 17)"/>'),
        corazonLila: svg(64, 60,
            "<defs>" + rg("c", [[0, "#f3d9fa"], [0.5, "#cc5de8"], [1, "#862e9c"]], 0.35, 0.3, 0.8) + "</defs>" +
            '<path d="M32 55 C 6 36, 2 16, 16 8 C 25 3, 31 9, 32 15 C 33 9, 39 3, 48 8 C 62 16, 58 36, 32 55 Z" fill="url(#c)" stroke="#6a1b7a" stroke-width="3" stroke-linejoin="round"/>' +
            '<ellipse cx="19" cy="17" rx="5" ry="3.5" fill="#fff" opacity="0.7" transform="rotate(-35 19 17)"/>'),
        estrella: svg(64, 64,
            "<defs>" + rg("e", [[0, "#fffbe6"], [0.5, "#ffd43b"], [1, "#f08c00"]], 0.4, 0.35, 0.8) + "</defs>" +
            '<path d="' + (function () {
                var d = "";
                for (var i = 0; i < 10; i++) {
                    var r = i % 2 ? 12 : 28, a = -Math.PI / 2 + i * Math.PI / 5;
                    d += (i ? " L" : "M") + n1(32 + Math.cos(a) * r) + " " + n1(33 + Math.sin(a) * r);
                }
                return d + "Z";
            })() + '" fill="url(#e)" stroke="#c76b00" stroke-width="3" stroke-linejoin="round"/>'),
        banderines: svg(1600, 170,
            '<path d="M0 30 Q 800 150 1600 30" stroke="#5e3416" stroke-width="5" fill="none"/>' +
            (function () {
                var col = [["#ff6b6b", "#a61e1e"], ["#ffd43b", "#a86b00"], ["#69db7c", "#2b6a1e"], ["#4dabf7", "#1c5a8a"], ["#b197fc", "#5f3dc4"], ["#ffa94d", "#a83d07"]];
                var o = "";
                for (var i = 0; i < 22; i++) {
                    var t = (i + 0.5) / 22, x = t * 1600;
                    var y = (1 - t) * (1 - t) * 30 + 2 * (1 - t) * t * 150 + t * t * 30;
                    var c = col[i % col.length];
                    o += '<path d="M' + n1(x - 26) + " " + n1(y) + " L" + n1(x + 26) + " " + n1(y) + " L" + n1(x) + " " + n1(y + 58) + ' Z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="3.5" stroke-linejoin="round"/>';
                }
                return o;
            })())
    };

    function florSvg(petalo, borde) {
        return svg(40, 56,
            '<path d="M20 26 C 20 38, 18 46, 20 56" stroke="#2b8a3e" stroke-width="3.5" fill="none"/>' +
            '<path d="M20 44 c -8 -6 -14 -2 -14 4 c 6 0 10 -2 14 -4 z" fill="#40c057"/>' +
            '<g fill="' + petalo + '" stroke="' + borde + '" stroke-width="1.2"><circle cx="20" cy="9" r="7"/><circle cx="30" cy="17" r="7"/><circle cx="26" cy="28" r="7"/><circle cx="14" cy="28" r="7"/><circle cx="10" cy="17" r="7"/></g>' +
            '<circle cx="20" cy="19" r="5.5" fill="#fab005" stroke="#c48f00" stroke-width="1.5"/>');
    }

    var ARBOLES = { verde: ["verde"], otono: ["naranja", "roja"], rosa: ["roja"], amarillo: ["amarilla", "naranja"] };
    var SEMILLAS = { verde: 41, otono: 23, rosa: 11, amarillo: 37 };

    function arbolSvg(tipo) {
        var id = "a" + tipo;
        return svg(300, 470,
            "<defs>" + lg("tr", [[0, "#8f6240"], [0.45, "#6b4427"], [1, "#3b2312"]], 1, 0) + "</defs>" +
            '<ellipse cx="150" cy="462" rx="64" ry="7" fill="#2a1a08" opacity="0.25"/>' +
            '<g transform="translate(91 186) scale(1.3 1.3)">' + OBJ.arbolTronco + "</g>" +
            follaje(ARBOLES[tipo] || ["verde"], SEMILLAS[tipo] || 7, { cx: 150, cy: 150, rx: 132, ry: 118, esc: 1.15, n: 1.25 }, id));
    }

    // ------------------------------------------------------------------ amigos del bosque (escena final)
    // La ardilla es el mismo dibujo de "La Ardilla y la Bellota Gigante" (iconos.js): cola, cuerpo y cabeza
    // en un marco común de 240 × 240, mirando a la derecha.

    var PA = { osc: "#8a3412", base: "#c9561c", med: "#e0772f", luz: "#f4a25a", borde: "#f9cf98", linea: "#5a2610", crema: "#fff1dc", crema2: "#f1cfa0" };

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

    function colaArdilla() {
        var c = suave([[118, 200, 24], [84, 194, 40], [52, 168, 54], [36, 128, 60], [40, 86, 60], [58, 50, 56],
            [88, 26, 50], [120, 26, 42], [136, 46, 32], [128, 68, 18]], 6);
        var out = '<defs><linearGradient id="cg" x1="0" y1="1" x2="0.4" y2="0"><stop offset="0" stop-color="' + PA.osc + '"/>' +
            '<stop offset="0.45" stop-color="' + PA.base + '"/><stop offset="1" stop-color="' + PA.med + '"/></linearGradient></defs>' +
            '<path d="' + peludo(banda(c, 1.02), 11, 5, 3) + '" fill="' + PA.borde + '" stroke="' + PA.linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="' + peludo(banda(c, 0.86), 7, 9, 2) + '" fill="url(#cg)"/>' +
            '<path d="' + peludo(banda(c, 0.42), 4, 13, 3) + '" fill="' + PA.osc + '" opacity="0.45"/>';
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
                    '" stroke="' + (r() < 0.5 ? PA.luz : PA.borde) + '" stroke-width="' + (1.6 + r() * 1.2).toFixed(1) + '" opacity="0.75"/>';
            }
        }
        return out + "</g>";
    }

    var AMIGOS = {
        ardilla: svg(240, 240,
            colaArdilla() +
            '<defs><radialGradient id="ap" cx="0.42" cy="0.3" r="0.8"><stop offset="0" stop-color="' + PA.luz + '"/><stop offset="0.5" stop-color="' + PA.med + '"/><stop offset="1" stop-color="' + PA.base + '"/></radialGradient>' +
            '<linearGradient id="av" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + PA.crema + '"/><stop offset="1" stop-color="' + PA.crema2 + '"/></linearGradient>' +
            '<radialGradient id="am" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="' + PA.med + '"/><stop offset="1" stop-color="' + PA.osc + '"/></radialGradient>' +
            '<radialGradient id="ah" cx="0.4" cy="0.3" r="0.8"><stop offset="0" stop-color="' + PA.luz + '"/><stop offset="0.55" stop-color="' + PA.med + '"/><stop offset="1" stop-color="' + PA.base + '"/></radialGradient>' +
            '<radialGradient id="ao" cx="0.35" cy="0.3" r="0.7"><stop offset="0" stop-color="#5a3420"/><stop offset="0.55" stop-color="#22120a"/><stop offset="1" stop-color="#0e0704"/></radialGradient>' +
            '<linearGradient id="ae" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + PA.base + '"/><stop offset="1" stop-color="' + PA.osc + '"/></linearGradient></defs>' +
            '<ellipse cx="132" cy="232" rx="58" ry="7" fill="#2a1205" opacity="0.2"/>' +
            '<path d="M130 116 C 102 124, 86 156, 86 190 C 86 214, 102 228, 130 228 L 166 228 C 186 226, 192 206, 186 184 C 181 160, 184 134, 170 120 C 158 108, 142 108, 130 116 Z" fill="url(#ap)" stroke="' + PA.linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M158 124 C 176 134, 182 166, 180 196 C 178 216, 164 224, 152 216 C 142 196, 140 154, 158 124 Z" fill="url(#av)"/>' +
            '<path d="M92 184 C 98 160, 132 156, 144 182 C 152 202, 142 222, 120 226 C 98 228, 88 206, 92 184 Z" fill="url(#am)" opacity="0.5"/>' +
            '<path d="M104 220 C 122 214, 160 216, 172 222 C 178 228, 170 234, 150 234 L 110 234 C 98 234, 96 224, 104 220 Z" fill="' + PA.base + '" stroke="' + PA.linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="M162 140 C 174 146, 184 154, 192 160" stroke="' + PA.linea + '" stroke-width="15" stroke-linecap="round" fill="none"/>' +
            '<path d="M162 140 C 174 146, 184 154, 192 160" stroke="' + PA.med + '" stroke-width="10" stroke-linecap="round" fill="none"/>' +
            '<path d="M186 154 C 194 150, 202 154, 202 162 C 202 170, 194 172, 188 168 C 184 164, 182 158, 186 154 Z" fill="' + PA.crema2 + '" stroke="' + PA.linea + '" stroke-width="2.4"/>' +
            '<path d="M120 76 C 110 58, 110 38, 118 26 C 130 36, 138 54, 138 72 Z" fill="url(#ae)" stroke="' + PA.linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="M112 100 C 108 72, 130 54, 158 56 C 182 58, 196 72, 200 90 C 212 96, 216 110, 204 118 C 192 126, 172 130, 150 128 C 132 128, 122 124, 118 118 C 108 120, 104 112, 112 106 Z" fill="url(#ah)" stroke="' + PA.linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M150 106 C 164 96, 190 98, 206 106 C 212 114, 202 124, 186 126 C 168 128, 148 122, 150 106 Z" fill="' + PA.crema + '"/>' +
            '<path d="M140 68 C 136 48, 140 30, 150 20 C 162 30, 168 48, 164 66 Z" fill="url(#ah)" stroke="' + PA.linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="M146 62 C 144 48, 147 36, 151 30 C 157 38, 159 50, 158 62 Z" fill="#e9a08c"/>' +
            '<path d="M150 20 l -6 -10 M150 20 l 1 -13 M150 20 l 7 -9" stroke="' + PA.osc + '" stroke-width="2.6" stroke-linecap="round"/>' +
            '<ellipse cx="162" cy="88" rx="15" ry="16.5" fill="' + PA.crema + '" opacity="0.85"/>' +
            '<ellipse cx="162" cy="88" rx="10.5" ry="12.5" fill="url(#ao)"/>' +
            '<circle cx="166" cy="82.5" r="4.2" fill="#fff"/><circle cx="158.5" cy="93.5" r="1.8" fill="#fff" opacity="0.85"/>' +
            '<path d="M200 100 C 204 97, 212 99, 211 104 C 210 108, 204 110, 201 107 C 198 105, 198 102, 200 100 Z" fill="#4a2416"/>' +
            '<path d="M204 109 C 203 114, 198 117, 192 115" stroke="' + PA.linea + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
            '<g stroke="' + PA.linea + '" stroke-width="1.1" stroke-linecap="round" opacity="0.55"><path d="M196 108 L 222 102 M196 111 L 223 112 M195 114 L 219 121"/></g>' +
            '<ellipse cx="176" cy="114" rx="7" ry="4.5" fill="#ff8f7a" opacity="0.4"/>'),

        // conejo gris claro, mira a la izquierda (hacia el osito)
        conejo: svg(200, 270,
            "<defs>" + rg("cb", [[0, "#f4ece2"], [0.55, "#cdbba5"], [1, "#8f7a63"]], 0.4, 0.3, 0.85) +
            rg("cc", [[0, "#ffffff"], [1, "#e9e0d4"]], 0.4, 0.3, 0.8) + "</defs>" +
            '<ellipse cx="104" cy="262" rx="62" ry="7" fill="#2a1205" opacity="0.2"/>' +
            // orejas largas
            '<path d="M70 96 C 52 60, 52 12, 70 6 C 88 4, 92 56, 88 96 Z" fill="url(#cb)" stroke="#4a3a2a" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M72 88 C 62 60, 62 22, 72 16 C 82 18, 84 58, 82 88 Z" fill="#f7b8b0"/>' +
            '<path d="M104 96 C 104 56, 118 10, 136 14 C 152 20, 132 66, 120 98 Z" fill="url(#cb)" stroke="#4a3a2a" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M110 90 C 112 60, 122 26, 134 24 C 142 30, 128 64, 118 92 Z" fill="#f7b8b0"/>' +
            // cola de algodón
            '<path d="' + peludo(elipsePol(158, 218, 20, 18, 16), 4, 3, 1) + '" fill="url(#cc)" stroke="#9c8c7a" stroke-width="2"/>' +
            // cuerpo
            '<path d="' + peludo(elipsePol(110, 200, 54, 60, 34), 4, 5, 1) + '" fill="url(#cb)" stroke="#4a3a2a" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<path d="' + peludo(elipsePol(96, 206, 30, 40, 24), 3, 7, 1) + '" fill="url(#cc)"/>' +
            // patas
            '<ellipse cx="78" cy="252" rx="26" ry="11" fill="url(#cb)" stroke="#4a3a2a" stroke-width="2.6"/>' +
            '<ellipse cx="134" cy="252" rx="24" ry="10" fill="url(#cb)" stroke="#4a3a2a" stroke-width="2.6"/>' +
            // cabeza
            '<path d="' + peludo(elipsePol(94, 120, 50, 44, 34), 4, 9, 1) + '" fill="url(#cb)" stroke="#4a3a2a" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<ellipse cx="74" cy="134" rx="24" ry="18" fill="url(#cc)"/>' +
            '<ellipse cx="80" cy="112" rx="10" ry="11" fill="#2a1a10"/><circle cx="77" cy="108" r="3.6" fill="#fff"/><circle cx="83" cy="116" r="1.6" fill="#fff" opacity="0.8"/>' +
            '<path d="M56 128 C 56 124, 64 124, 64 128 C 64 132, 56 132, 56 128 Z" fill="#e8868a" stroke="#8a4a4a" stroke-width="1.4"/>' +
            '<path d="M60 132 C 60 138, 66 140, 70 138 M60 132 C 58 138, 52 140, 50 136" stroke="#4a3a2a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
            '<g stroke="#4a3a2a" stroke-width="1" opacity="0.5" stroke-linecap="round"><path d="M64 130 L 36 124 M64 133 L 36 136 M66 136 L 40 146"/></g>' +
            '<ellipse cx="96" cy="136" rx="9" ry="5" fill="#ff8f7a" opacity="0.4"/>' +
            // bracitos al frente
            '<ellipse cx="74" cy="182" rx="11" ry="16" fill="url(#cc)" stroke="#4a3a2a" stroke-width="2.4" transform="rotate(20 74 182)"/>'),

        pajaroAzul: pajaro("#a5d8ff", "#339af0", "#1864ab", "#0b3a66"),
        alaAzul: ala("#74c0fc", "#1c7ed6", "#0b3a66"),
        pajaroRojo: pajaro("#ffc9c9", "#f03e3e", "#a61e1e", "#5c0f0f"),
        alaRoja: ala("#ff8787", "#e03131", "#5c0f0f")
    };

    function pajaro(luz, medio, sombra, linea) {
        return svg(120, 100,
            "<defs>" + rg("pj", [[0, luz], [0.55, medio], [1, sombra]], 0.4, 0.3, 0.8) + "</defs>" +
            '<path d="M18 60 L 2 50 L 6 70 Z" fill="' + sombra + '" stroke="' + linea + '" stroke-width="2.4" stroke-linejoin="round"/>' +
            '<path d="' + peludo(elipsePol(56, 60, 40, 30, 26), 3, 3, 1) + '" fill="url(#pj)" stroke="' + linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            '<ellipse cx="62" cy="70" rx="22" ry="14" fill="#fff4e6" opacity="0.85"/>' +
            '<circle cx="82" cy="38" r="22" fill="url(#pj)" stroke="' + linea + '" stroke-width="3"/>' +
            '<path d="M100 36 L 116 42 L 100 46 Z" fill="#ffa94d" stroke="#a83d07" stroke-width="2" stroke-linejoin="round"/>' +
            '<circle cx="88" cy="34" r="5" fill="#1a0d06"/><circle cx="86.5" cy="32" r="1.8" fill="#fff"/>' +
            '<path d="M72 18 l -2 -8 M78 16 l 1 -9" stroke="' + linea + '" stroke-width="2.4" stroke-linecap="round"/>' +
            '<path d="M48 88 l -2 10 M62 88 l 0 10" stroke="#a83d07" stroke-width="3" stroke-linecap="round"/>');
    }

    function ala(luz, medio, linea) {
        return svg(70, 50,
            "<defs>" + rg("al", [[0, luz], [1, medio]], 0.3, 0.3, 0.9) + "</defs>" +
            '<path d="M4 10 C 30 0, 64 10, 66 28 C 50 44, 30 46, 18 40 C 22 34, 10 24, 4 10 Z" fill="url(#al)" stroke="' + linea + '" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="M22 22 C 34 26, 46 28, 58 28 M20 30 C 30 34, 40 36, 50 36" stroke="' + linea + '" stroke-width="1.6" fill="none" opacity="0.5" stroke-linecap="round"/>');
    }

    function petalo(color, borde) {
        return svg(30, 30, '<path d="M15 2 C 26 8, 26 22, 15 28 C 4 22, 4 8, 15 2 Z" fill="' + color + '" stroke="' + borde + '" stroke-width="1.6"/>' +
            '<path d="M15 6 L 15 24" stroke="' + borde + '" stroke-width="1" opacity="0.5"/>');
    }

    // ------------------------------------------------------------------ objetos del picnic que NO se comen (128 × 128)

    var DEF_METAL = lg("me", [[0, "#ffffff"], [0.45, "#dee2e6"], [1, "#868e96"]], 1, 0);

    var OBJETOS = {
        cuchara: "<defs>" + DEF_METAL + rg("mb", [[0, "#ffffff"], [0.5, "#dee2e6"], [1, "#868e96"]], 0.35, 0.3, 0.8) + "</defs>" +
            '<g transform="rotate(-38 64 64)">' +
            '<path d="M58 56 L 70 56 L 70 76 L 58 76 Z" fill="url(#me)" stroke="#495057" stroke-width="3.5"/>' +
            '<path d="M54 74 L 74 74 L 72 120 C 72 128, 56 128, 56 120 Z" fill="#f03e3e" stroke="#8a1c1c" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<path d="M59 80 L 59 116" stroke="#ffa8a8" stroke-width="3" stroke-linecap="round"/>' +
            '<ellipse cx="64" cy="32" rx="24" ry="30" fill="url(#mb)" stroke="#495057" stroke-width="3.5"/>' +
            '<ellipse cx="64" cy="36" rx="12" ry="18" fill="#adb5bd" opacity="0.55"/>' +
            '<ellipse cx="57" cy="24" rx="4" ry="9" fill="#fff" opacity="0.85"/></g>',
        tenedor: "<defs>" + DEF_METAL + "</defs>" +
            '<g transform="rotate(-38 64 64)">' +
            '<path d="M58 60 L 70 60 L 70 76 L 58 76 Z" fill="url(#me)" stroke="#495057" stroke-width="3.5"/>' +
            '<path d="M54 74 L 74 74 L 72 120 C 72 128, 56 128, 56 120 Z" fill="#40c057" stroke="#2b6a1e" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<path d="M59 80 L 59 116" stroke="#b2f2bb" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M44 8 L 50 8 L 50 38 L 56 38 L 56 8 L 62 8 L 62 38 L 66 38 L 66 8 L 72 8 L 72 38 L 78 38 L 78 8 L 84 8 L 84 44 C 84 56, 72 62, 64 62 C 56 62, 44 56, 44 44 Z" fill="url(#me)" stroke="#495057" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<path d="M49 46 C 52 52, 58 54, 62 54" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/></g>',
        cuchillo: "<defs>" + DEF_METAL + lg("mm", [[0, "#c8873f"], [1, "#7a4b1d"]], 1, 0) + "</defs>" +
            '<g transform="rotate(-38 64 64)">' +
            '<path d="M53 70 L 75 70 L 73 122 C 73 130, 55 130, 55 122 Z" fill="url(#mm)" stroke="#4a2a0e" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<circle cx="64" cy="84" r="2.6" fill="#f3d9b1"/><circle cx="64" cy="108" r="2.6" fill="#f3d9b1"/>' +
            '<path d="M53 72 L 53 18 C 53 2, 77 0, 77 22 L 75 72 Z" fill="url(#me)" stroke="#495057" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<path d="M60 22 L 60 64" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.85"/></g>',
        salero: "<defs>" + lg("vi", [[0, "#e7f5ff"], [0.5, "#ffffff"], [1, "#a5d8ff"]], 1, 0) + DEF_METAL + "</defs>" +
            '<ellipse cx="64" cy="118" rx="30" ry="6" fill="#000" opacity="0.18"/>' +
            '<path d="M40 52 L 88 52 L 84 112 C 84 118, 44 118, 44 112 Z" fill="url(#vi)" stroke="#1c5a8a" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<path d="M44 76 L 84 76 L 82 110 C 82 114, 46 114, 46 110 Z" fill="#ffffff" stroke="#ced4da" stroke-width="1.5"/>' +
            '<g fill="#dee2e6"><circle cx="54" cy="88" r="2"/><circle cx="66" cy="94" r="2"/><circle cx="74" cy="84" r="2"/><circle cx="60" cy="102" r="2"/></g>' +
            '<path d="M38 52 C 38 30, 90 30, 90 52 Z" fill="url(#me)" stroke="#495057" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<g fill="#495057"><circle cx="56" cy="42" r="2.6"/><circle cx="64" cy="38" r="2.6"/><circle cx="72" cy="42" r="2.6"/></g>' +
            '<path d="M50 60 L 48 104" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.8"/>',
        taza: "<defs>" + rg("tz", [[0, "#a5d8ff"], [0.5, "#339af0"], [1, "#1864ab"]], 0.35, 0.3, 0.85) + "</defs>" +
            '<ellipse cx="60" cy="116" rx="40" ry="7" fill="#000" opacity="0.18"/>' +
            '<path d="M92 56 C 118 52, 120 92, 90 94" stroke="#0b3a66" stroke-width="13" fill="none" stroke-linecap="round"/>' +
            '<path d="M92 56 C 118 52, 120 92, 90 94" stroke="#339af0" stroke-width="6" fill="none" stroke-linecap="round"/>' +
            '<path d="M24 42 L 96 42 L 90 106 C 88 116, 32 116, 30 106 Z" fill="url(#tz)" stroke="#0b3a66" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<ellipse cx="60" cy="42" rx="36" ry="9" fill="#7a4b1d" stroke="#0b3a66" stroke-width="3"/>' +
            '<g fill="#fff" opacity="0.9"><circle cx="44" cy="66" r="5"/><circle cx="66" cy="78" r="5"/><circle cx="50" cy="94" r="4"/><circle cx="78" cy="96" r="4"/></g>' +
            '<path d="M34 54 L 38 98" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.6"/>' +
            '<path d="M48 30 C 42 22, 54 18, 48 8 M66 30 C 60 22, 72 18, 66 8" stroke="#ced4da" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.8"/>'
    };

    function svgObjeto(tipo) {
        return svg(128, 128, OBJETOS[tipo] || OBJETOS.cuchara);
    }

    // ------------------------------------------------------------------ rasterizado (una vez)

    function lienzo(w, h) {
        var c = document.createElement("canvas");
        c.width = Math.ceil(w);
        c.height = Math.ceil(h);
        return c;
    }

    function rasterizar(clave, s) {
        return new Promise(function (resolve) {
            var m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(s);
            var w = m ? Number(m[1]) : 100, h = m ? Number(m[2]) : 100;
            var img = new Image();
            img.onload = function () {
                var c = lienzo(w, h);
                c.getContext("2d").drawImage(img, 0, 0, w, h);
                cache[clave] = c;
                resolve();
            };
            img.onerror = function () {
                console.warn("[DibujosComer] no se pudo dibujar", clave);
                cache[clave] = lienzo(w, h);
                resolve();
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function svgFruta(tipo) {
        return svg(128, 128, FRUTAS[tipo] || FRUTAS.manzana);
    }

    function lista() {
        var l = [
            ["oso-cuerpo", OSO.cuerpo], ["oso-cabeza", OSO.cabeza], ["oso-brazo", OSO.brazo], ["oso-pie", OSO.pie], ["oso-pierna", OSO.pierna],
            ["plato", OBJ.plato], ["cesta", OBJ.cesta], ["letrero", OBJ.letrero], ["cerca", OBJ.cerca], ["arbusto", OBJ.arbusto],
            ["hongos", OBJ.hongos], ["hierba", OBJ.hierba], ["hoja", OBJ.hoja], ["corazon", OBJ.corazon], ["corazon-lila", OBJ.corazonLila],
            ["estrella", OBJ.estrella], ["banderines", OBJ.banderines],
            ["flor-0", florSvg("#ffffff", "#d0d0d0")], ["flor-1", florSvg("#ffc9c9", "#e8868a")], ["flor-2", florSvg("#d0bfff", "#9775fa")],
            ["ardilla", AMIGOS.ardilla], ["conejo", AMIGOS.conejo], ["pajaro-azul", AMIGOS.pajaroAzul], ["ala-azul", AMIGOS.alaAzul],
            ["pajaro-rojo", AMIGOS.pajaroRojo], ["ala-roja", AMIGOS.alaRoja],
            ["petalo-0", petalo("#ffffff", "#c9c9c9")], ["petalo-1", petalo("#ffc9de", "#e64980")], ["petalo-2", petalo("#ffe066", "#e8a400")]
        ];
        Object.keys(FRUTAS).forEach(function (t) { l.push(["fruta-" + t, svgFruta(t)]); });
        Object.keys(OBJETOS).forEach(function (t) { l.push(["objeto-" + t, svgObjeto(t)]); });
        Object.keys(ARBOLES).forEach(function (t) { l.push(["arbol-" + t, arbolSvg(t)]); });
        return l;
    }

    function preparar() {
        if (!listo) {
            listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1]); }));
        }
        return listo;
    }

    // ------------------------------------------------------------------ texturas de canvas (pasto, manta, efectos)

    /** Pasto de la Ardilla: verde con manchas y briznas, en mosaico. */
    function pasto() {
        if (cache.pasto) return cache.pasto;
        var c = lienzo(256, 256), ctx = c.getContext("2d");
        ctx.fillStyle = "#7cc24a";
        ctx.fillRect(0, 0, 256, 256);
        var r = azar(77);
        for (var i = 0; i < 26; i++) {
            ctx.fillStyle = r() < 0.5 ? "rgba(95,170,55,0.55)" : "rgba(150,210,90,0.45)";
            ctx.beginPath();
            ctx.ellipse(r() * 256, r() * 256, r.entre(10, 30), r.entre(6, 16), r() * 3, 0, TAU);
            ctx.fill();
        }
        ctx.strokeStyle = "rgba(60,130,40,0.6)";
        ctx.lineWidth = 2;
        for (var k = 0; k < 90; k++) {
            var x = r() * 256, y = r() * 256;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + r.entre(-3, 3), y - r.entre(5, 10));
            ctx.stroke();
        }
        cache.pasto = c;
        return c;
    }

    /** Manta de cuadros en perspectiva con borde oscuro y costuras. */
    function manta(ctx, tl, tr, bl, br, cols, filas) {
        function punto(u, v) {
            var vp = Math.pow(v, 1.25);
            var ax = tl[0] + (tr[0] - tl[0]) * u, ay = tl[1] + (tr[1] - tl[1]) * u;
            var bx = bl[0] + (br[0] - bl[0]) * u, by = bl[1] + (br[1] - bl[1]) * u;
            return [ax + (bx - ax) * vp, ay + (by - ay) * vp];
        }
        ctx.save();
        ctx.fillStyle = "rgba(40,30,5,0.28)";
        ctx.beginPath();
        ctx.moveTo(tl[0] + 6, tl[1] + 12);
        ctx.lineTo(tr[0] + 10, tr[1] + 12);
        ctx.lineTo(br[0] + 16, br[1] + 20);
        ctx.lineTo(bl[0] + 4, bl[1] + 20);
        ctx.closePath();
        ctx.fill();
        for (var j = 0; j < filas; j++) {
            for (var i = 0; i < cols; i++) {
                var a = punto(i / cols, j / filas), b = punto((i + 1) / cols, j / filas);
                var c = punto((i + 1) / cols, (j + 1) / filas), d = punto(i / cols, (j + 1) / filas);
                var k = (i % 2) + (j % 2);
                ctx.beginPath();
                ctx.moveTo(a[0], a[1]);
                ctx.lineTo(b[0], b[1]);
                ctx.lineTo(c[0], c[1]);
                ctx.lineTo(d[0], d[1]);
                ctx.closePath();
                ctx.fillStyle = k === 0 ? "#fff5f0" : (k === 1 ? "#f47f7f" : "#d92f2f");
                ctx.fill();
            }
        }
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 7]);
        for (var s = 1; s < filas; s++) {
            var p0 = punto(0, s / filas), p1 = punto(1, s / filas);
            ctx.beginPath();
            ctx.moveTo(p0[0], p0[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(tl[0], tl[1]);
        ctx.lineTo(tr[0], tr[1]);
        ctx.lineTo(br[0], br[1]);
        ctx.lineTo(bl[0], bl[1]);
        ctx.closePath();
        ctx.strokeStyle = "#7a1414";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
    }

    function suelo(manta4, cols, filas) {
        var c = lienzo(1600, 900), ctx = c.getContext("2d");
        ctx.fillStyle = ctx.createPattern(pasto(), "repeat");
        ctx.fillRect(0, 0, 1600, 900);
        // sombra suave bajo la fila de árboles del fondo
        var g = ctx.createLinearGradient(0, 250, 0, 430);
        g.addColorStop(0, "rgba(30,60,10,0.35)");
        g.addColorStop(1, "rgba(30,60,10,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 250, 1600, 180);
        manta(ctx, manta4[0], manta4[1], manta4[2], manta4[3], cols, filas);
        return c;
    }

    function fondoPicnic() {
        if (!cache.fondoPicnic) cache.fondoPicnic = suelo([[430, 600], [1170, 600], [150, 905], [1450, 905]], 12, 7);
        return cache.fondoPicnic;
    }

    function fondoFiesta() {
        if (!cache.fondoFiesta) cache.fondoFiesta = suelo([[330, 640], [1270, 640], [40, 905], [1560, 905]], 14, 6);
        return cache.fondoFiesta;
    }

    function sombra() {
        var c = lienzo(200, 60), ctx = c.getContext("2d");
        var g = ctx.createRadialGradient(100, 30, 0, 100, 30, 98);
        g.addColorStop(0, "rgba(40,20,0,0.5)");
        g.addColorStop(1, "rgba(40,20,0,0)");
        ctx.save();
        ctx.scale(1, 0.3);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(100, 100, 98, 0, TAU);
        ctx.fill();
        ctx.restore();
        return c;
    }

    function radialBlanco(s, paradas) {
        var c = lienzo(s, s), ctx = c.getContext("2d");
        var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        paradas.forEach(function (p) { g.addColorStop(p[0], p[1]); });
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        return c;
    }

    function chispa() {
        return radialBlanco(40, [[0, "rgba(255,255,255,1)"], [0.3, "rgba(255,245,190,0.9)"], [1, "rgba(255,230,120,0)"]]);
    }

    function manchaLuz() {
        return radialBlanco(256, [[0, "rgba(255,255,255,0.55)"], [0.35, "rgba(255,255,255,0.28)"], [0.7, "rgba(255,255,255,0.08)"], [1, "rgba(255,255,255,0)"]]);
    }

    function rayo() {
        var c = lienzo(128, 512), ctx = c.getContext("2d");
        var g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, "rgba(255,255,255,0.75)");
        g.addColorStop(0.6, "rgba(255,255,255,0.18)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(128 * 0.38, 0);
        ctx.lineTo(128 * 0.62, 0);
        ctx.lineTo(128, 512);
        ctx.lineTo(0, 512);
        ctx.closePath();
        ctx.fill();
        return c;
    }

    function confeti(color) {
        var c = lienzo(18, 28), ctx = c.getContext("2d");
        ctx.fillStyle = color;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(2, 2, 14, 24, 4);
        else ctx.rect(2, 2, 14, 24);
        ctx.fill();
        ctx.stroke();
        return c;
    }

    function de(clave) {
        return function () { return cache[clave] || lienzo(4, 4); };
    }

    global.DibujosComer = {
        preparar: preparar,
        svgFruta: function (tipo) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgFruta(tipo)); },
        fruta: function (tipo) { return cache["fruta-" + tipo] || lienzo(128, 128); },
        tiposFruta: Object.keys(FRUTAS),
        tiposObjeto: Object.keys(OBJETOS),
        objeto: function (tipo) { return cache["objeto-" + tipo] || lienzo(128, 128); },
        tiposArbol: Object.keys(ARBOLES),
        osoCuerpo: de("oso-cuerpo"),
        osoCabeza: de("oso-cabeza"),
        osoBrazo: de("oso-brazo"),
        osoPie: de("oso-pie"),
        osoPierna: de("oso-pierna"),
        arbol: function (tipo) { return cache["arbol-" + tipo] || lienzo(4, 4); },
        cesta: de("cesta"),
        plato: de("plato"),
        letrero: de("letrero"),
        cerca: de("cerca"),
        arbusto: de("arbusto"),
        hongos: de("hongos"),
        hierba: de("hierba"),
        hoja: de("hoja"),
        corazon: de("corazon"),
        corazonLila: de("corazon-lila"),
        estrella: de("estrella"),
        banderines: de("banderines"),
        flor: function (k) { return cache["flor-" + k] || lienzo(4, 4); },
        /** Cualquier dibujo ya rasterizado por su clave (amigos del bosque, pétalos…). */
        pieza: function (clave) { return cache[clave] || lienzo(4, 4); },
        piezasAmigos: ["ardilla", "conejo", "pajaro-azul", "ala-azul", "pajaro-rojo", "ala-roja", "petalo-0", "petalo-1", "petalo-2"],
        sombra: sombra,
        chispa: chispa,
        manchaLuz: manchaLuz,
        rayo: rayo,
        confeti: confeti,
        fondoPicnic: fondoPicnic,
        fondoFiesta: fondoFiesta
    };
})(window);
