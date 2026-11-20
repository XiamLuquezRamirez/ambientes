/**
 * DibujosPicnic — dibujos de "Picnic con los Animalitos Glotones" con la misma gráfica de "¡La Hora de Comer!" y de
 * "La Ardilla y la Bellota Gigante": SVG con contorno oscuro y redondeado, degradados radiales de luz arriba a la
 * izquierda, pelaje con borde de mechones, follaje natural por racimos, pasto con manchas y briznas, cercas de madera.
 *
 * DibujosPicnic.preparar() rasteriza todos los SVG a <canvas> (una sola vez); luego cada función devuelve su
 * canvas para convertirlo en textura de Phaser. svgAlimento(tipo) da el SVG del alimento como data URL.
 *
 * Los animales (conejo, perro, pájaro) van de FRENTE y por piezas: la cabeza es una textura centrada en su propio
 * origen, sin ojos ni boca (los dibuja animales.js con Graphics); la oreja, la pata, el ala y la cola se dibujan
 * una sola vez y se instancian dos veces con setFlipX(true). El oso se conserva tal cual del juego hermano.
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

    // ------------------------------------------------------------------ alimentos (128 × 128, contorno del mismo color oscurecido)

    /** Siluetas de un hueso (dos nudos por extremo) en horizontal; el giro se aplica desde fuera. */
    function formasHueso() {
        return '<rect x="30" y="52" width="68" height="24" rx="9"/>' +
            '<circle cx="26" cy="52" r="14"/><circle cx="26" cy="76" r="14"/><circle cx="102" cy="52" r="14"/><circle cx="102" cy="76" r="14"/>';
    }

    /** Hueso con un solo degradado que recorre toda la silueta (por eso en coordenadas de usuario). */
    function huesoSvg(luz, medio, sombra, borde, rot, extra) {
        var f = formasHueso();
        return '<defs><radialGradient id="hu" gradientUnits="userSpaceOnUse" cx="42" cy="44" r="84">' +
            '<stop offset="0" stop-color="' + luz + '"/><stop offset="0.5" stop-color="' + medio + '"/><stop offset="1" stop-color="' + sombra + '"/></radialGradient>' +
            '<clipPath id="hc">' + f + "</clipPath></defs>" +
            '<g transform="rotate(' + rot + ' 64 64)">' +
            '<g fill="' + borde + '" stroke="' + borde + '" stroke-width="9" stroke-linejoin="round">' + f + "</g>" +
            '<g fill="url(#hu)">' + f + "</g>" + extra + "</g>";
    }

    var ALIMENTOS = {
        zanahoria: "<defs>" + rg("f", [[0, "#ffc078"], [0.5, "#f76707"], [1, "#b34a0c"]], 0.35, 0.3, 0.85) + "</defs>" +
            '<g transform="rotate(25 64 64)">' +
            '<g fill="#69b34c" stroke="#2b6a1e" stroke-width="3" stroke-linejoin="round">' +
            '<path d="M62 38 C 46 34, 34 22, 32 12 C 46 12, 58 22, 62 38 Z"/><path d="M66 38 C 82 34, 94 22, 96 12 C 82 12, 70 22, 66 38 Z"/>' +
            '<path d="M64 38 C 54 26, 56 10, 64 4 C 72 10, 74 26, 64 38 Z"/></g>' +
            '<g stroke="#2b6a1e" stroke-width="1.6" stroke-linecap="round" opacity="0.6"><path d="M62 36 L 40 18"/><path d="M66 36 L 88 18"/><path d="M64 34 L 64 10"/></g>' +
            '<path d="M42 36 C 42 28, 86 28, 86 36 C 84 74, 74 106, 64 122 C 54 106, 44 74, 42 36 Z" fill="url(#f)" stroke="#8a3a06" stroke-width="4.5" stroke-linejoin="round"/>' +
            '<g stroke="#b34a0c" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.65">' +
            '<path d="M46 52 C 52 56, 60 56, 66 52"/><path d="M62 70 C 68 74, 74 74, 80 70"/><path d="M50 84 C 54 88, 60 88, 64 84"/><path d="M60 100 C 63 103, 67 103, 70 100"/></g>' +
            brilloSvg(52, 60, 5, 18, 8, 0.5) + "</g>",
        lechuga: "<defs>" + rg("e", [[0, "#7cc24a"], [1, "#2b6a1e"]], 0.4, 0.3, 0.85) + rg("m", [[0, "#a9e34b"], [1, "#4c9e2c"]], 0.4, 0.3, 0.85) +
            rg("i", [[0, "#e9fac8"], [1, "#8fd14f"]], 0.4, 0.3, 0.85) + "</defs>" +
            (function () {
                var r = azar(9);
                return '<path d="' + racimo(r, 64, 68, 46) + '" fill="url(#e)" stroke="#173d10" stroke-width="3.5" stroke-linejoin="round"/>' +
                    '<path d="' + racimo(r, 64, 66, 36) + '" fill="url(#m)" stroke="#2b6a1e" stroke-width="3" stroke-linejoin="round"/>' +
                    '<path d="' + racimo(r, 62, 62, 24) + '" fill="url(#i)" stroke="#4c9e2c" stroke-width="2.5" stroke-linejoin="round"/>';
            })() +
            '<g stroke="#2b6a1e" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.55">' +
            '<path d="M64 106 C 64 90, 62 76, 62 66"/><path d="M48 98 C 52 86, 56 76, 58 68"/><path d="M80 98 C 76 86, 72 76, 68 68"/>' +
            '<path d="M36 76 C 44 74, 50 70, 54 64"/><path d="M92 76 C 84 74, 78 70, 74 64"/></g>' +
            brilloSvg(48, 48, 10, 5, -35, 0.45),
        manzana: "<defs>" + rg("f", [[0, "#ff8a8a"], [0.5, "#e03131"], [1, "#a51111"]], 0.38, 0.35, 0.75) + "</defs>" +
            '<path d="M64 34 C 88 18, 122 32, 116 70 C 112 102, 88 122, 72 114 C 66 111, 62 111, 56 114 C 40 122, 16 102, 12 70 C 6 32, 40 18, 64 34 Z" fill="url(#f)" stroke="#7a1010" stroke-width="4.5" stroke-linejoin="round"/>' +
            brilloSvg(40, 56, 11, 20, 20) + tallo("M64 36 Q 64 22 72 12") + hojaFruta(70, 22, -30, 32),
        huesito: huesoSvg("#ffffff", "#fbecc8", "#d6b676", "#8a6a3a", -35,
            brilloSvg(24, 46, 9, 4, -20, 0.7) + brilloSvg(60, 57, 18, 3.5, 0, 0.6) +
            '<path d="M36 72 L 94 72" stroke="#c9a566" stroke-width="3" stroke-linecap="round" opacity="0.5"/>'),
        salchicha: (function () {
            var d = "M26 84 C 22 40, 104 36, 102 80";
            return '<g fill="none" stroke-linecap="round">' +
                '<path d="' + d + '" stroke="#6e2a1a" stroke-width="40"/>' +
                '<path d="' + d + '" stroke="#c2412f" stroke-width="31"/>' +
                '<path d="' + d + '" stroke="#e8745c" stroke-width="20" transform="translate(-2 -3)"/>' +
                '<path d="' + d + '" stroke="#ffd0c2" stroke-width="5" opacity="0.6" transform="translate(-4 -9)"/></g>' +
                '<g fill="#ecc08e" stroke="#8a5a2b" stroke-width="2.6" stroke-linejoin="round">' +
                '<path d="M20 100 L 32 100 L 29 118 L 23 118 Z"/><path d="M96 96 L 108 96 L 105 114 L 99 114 Z"/></g>' +
                '<g stroke="#6e2a1a" stroke-width="3" stroke-linecap="round"><path d="M17 98 L 35 98"/><path d="M93 94 L 111 94"/></g>';
        })(),
        croqueta: huesoSvg("#e0a862", "#b87a30", "#7a4b1d", "#4a2a0e", 30,
            '<g clip-path="url(#hc)">' + (function () {
                var r = azar(11), o = "";
                for (var i = 0; i < 46; i++) {
                    var x = r.entre(12, 116), y = r.entre(38, 90);
                    o += '<circle cx="' + n1(x) + '" cy="' + n1(y) + '" r="' + n1(r.entre(1.4, 2.4)) + '" fill="' + (r() < 0.65 ? "#6b3f14" : "#efc27d") + '" opacity="' + (0.45 + r() * 0.35).toFixed(2) + '"/>';
                }
                return o;
            })() + "</g>" + brilloSvg(24, 46, 9, 4, -20, 0.5)),
        semillas: (function () {
            var r = azar(3), pts = [], o = '<ellipse cx="64" cy="106" rx="52" ry="9" fill="#000" opacity="0.18"/>';
            for (var i = 0; i < 34; i++) {
                var x = 64 + (r() * 2 - 1) * 44, tope = 60 * (1 - Math.pow((x - 64) / 50, 2));
                pts.push({ x: x, y: 100 - r() * tope, t: r(), g: Math.round(r() * 180) });
            }
            pts.sort(function (a, b) { return a.y - b.y; });
            pts.forEach(function (p) {
                var tr = 'transform="rotate(' + p.g + " " + n1(p.x) + " " + n1(p.y) + ')"';
                if (p.t < 0.38) {
                    o += '<ellipse cx="' + n1(p.x) + '" cy="' + n1(p.y) + '" rx="11" ry="5.6" fill="#5b4b3a" stroke="#2f2418" stroke-width="1.6" ' + tr + "/>" +
                        '<path d="M' + n1(p.x - 8) + " " + n1(p.y) + " L " + n1(p.x + 8) + " " + n1(p.y) + '" stroke="#e9e1d2" stroke-width="2" stroke-linecap="round" ' + tr + "/>";
                } else if (p.t < 0.72) {
                    o += '<ellipse cx="' + n1(p.x) + '" cy="' + n1(p.y) + '" rx="6.5" ry="4.6" fill="#f2c14e" stroke="#a8741a" stroke-width="1.6" ' + tr + "/>" +
                        '<ellipse cx="' + n1(p.x - 1.5) + '" cy="' + n1(p.y - 1.5) + '" rx="2.4" ry="1.4" fill="#fff" opacity="0.6"/>';
                } else {
                    o += '<ellipse cx="' + n1(p.x) + '" cy="' + n1(p.y) + '" rx="8" ry="5" fill="#9bc94f" stroke="#3f6b0a" stroke-width="1.6" ' + tr + "/>" +
                        '<path d="M' + n1(p.x - 5) + " " + n1(p.y) + " L " + n1(p.x + 5) + " " + n1(p.y) + '" stroke="#e5f5b8" stroke-width="1.4" stroke-linecap="round" opacity="0.8" ' + tr + "/>";
                }
            });
            return o;
        })(),
        maiz: "<defs>" + rg("f", [[0, "#fff3a8"], [0.5, "#ffd43b"], [1, "#e8a400"]], 0.38, 0.3, 0.85) + lg("v", [[0, "#8fd14f"], [1, "#2b6a1e"]], 0.3, 1) +
            '<clipPath id="mc"><ellipse cx="64" cy="52" rx="25" ry="46"/></clipPath></defs>' +
            '<g transform="rotate(-35 64 64)">' +
            '<ellipse cx="64" cy="52" rx="25" ry="46" fill="url(#f)" stroke="#9a6b00" stroke-width="4.5"/>' +
            '<g clip-path="url(#mc)">' + (function () {
                var o = "";
                for (var f = 0; f < 11; f++) for (var c = 0; c < 6; c++) {
                    var x = 41 + c * 9.6 + (f % 2) * 4.8, y = 10 + f * 9.4;
                    o += '<ellipse cx="' + n1(x) + '" cy="' + n1(y) + '" rx="4.5" ry="4.4" fill="#ffe066" stroke="#c48f00" stroke-width="1"/>' +
                        '<circle cx="' + n1(x - 1.4) + '" cy="' + n1(y - 1.4) + '" r="1.3" fill="#fff" opacity="0.55"/>';
                }
                return o;
            })() + "</g>" +
            '<path d="M64 120 C 28 114, 24 72, 32 44 C 44 70, 56 94, 64 120 Z" fill="url(#v)" stroke="#2b6a1e" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<path d="M64 120 C 100 114, 104 72, 96 44 C 84 70, 72 94, 64 120 Z" fill="url(#v)" stroke="#2b6a1e" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<g stroke="#2b6a1e" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.55"><path d="M60 112 C 46 96, 40 76, 36 56"/><path d="M68 112 C 82 96, 88 76, 92 56"/></g></g>',
        miel: "<defs>" + lg("j", [[0, "#ffe08a"], [0.45, "#f59f00"], [1, "#b45f06"]], 1, 0.4) +
            '<pattern id="cu" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#fff5f0"/>' +
            '<rect width="7" height="7" fill="#e03131"/><rect x="7" y="7" width="7" height="7" fill="#e03131"/></pattern></defs>' +
            '<ellipse cx="64" cy="122" rx="40" ry="5" fill="#000" opacity="0.18"/>' +
            '<path d="M30 52 L 98 52 L 101 108 C 101 117, 93 122, 85 122 L 43 122 C 35 122, 27 117, 27 108 Z" fill="url(#j)" stroke="#7a4400" stroke-width="4.5" stroke-linejoin="round"/>' +
            '<path d="M36 64 L 38 108" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.55"/>' +
            '<ellipse cx="68" cy="90" rx="18" ry="14" fill="#fff4cf" stroke="#b45f06" stroke-width="2.4"/>' +
            '<path d="M60 94 l 4 -8 l 4 4 l 4 -4 l 4 8 z" fill="#f59f00" stroke="#7a4400" stroke-width="1.8" stroke-linejoin="round"/>' +
            '<path d="M24 44 C 34 34, 94 34, 104 44 L 110 58 C 100 64, 94 54, 84 60 C 74 66, 64 56, 54 62 C 44 56, 32 66, 18 58 Z" fill="url(#cu)" stroke="#8a1c1c" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<path d="M24 52 Q 64 62 106 52" stroke="#c8873f" stroke-width="5" fill="none" stroke-linecap="round"/>' +
            '<path d="M104 52 C 104 66, 108 76, 106 86 C 105 92, 97 92, 97 86 C 97 76, 99 66, 98 56 Z" fill="#f59f00" stroke="#7a4400" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<ellipse cx="101.5" cy="68" rx="1.6" ry="6" fill="#fff" opacity="0.6"/>'
    };

    function svgAlimento(tipo) {
        return svg(128, 128, ALIMENTOS[tipo] || ALIMENTOS.manzana);
    }

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

    // ------------------------------------------------------------------ ayudas para curvas con grosor (cola del perro)

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

    // ------------------------------------------------------------------ animales de frente (conejo, perro, pájaro)
    // Cada cuerpo es una pieza; la cabeza es otra, centrada en su propio origen y SIN ojos ni boca (los pone
    // animales.js con Graphics). Oreja, pata, ala y cola se dibujan una vez y se espejan con setFlipX(true).

    var CON = { luz: "#f7f2eb", med: "#d6ccc0", osc: "#968c80", tex: "#bcb1a3", linea: "#4a3f38", blanco: "#ffffff", blanco2: "#ece5da", rosa: "#f6bcb6", rosa2: "#e48a8c" };
    var PER = { luz: "#fcefd2", med: "#e4c998", osc: "#ae8b59", tex: "#cba970", linea: "#4d3219", crema: "#fff7e2", crema2: "#edd7ab", mancha: "#a56a38", mancha2: "#6e4220", manchaLuz: "#c48a52", nariz: "#1f1410" };
    var PAJ = { luz: "#bfe3ff", med: "#4dabf7", osc: "#1c6fc2", linea: "#0b3a66", crema: "#fff7e5", crema2: "#f0d9ae", pico: "#ffa94d", pico2: "#e8590c", picoLinea: "#8a3a07" };

    /** Pelaje del oso recoloreado: la ayuda `pelaje` trae los tonos del oso fijos, aquí se cambian por los del animal. */
    function pelajeDe(pal, semilla, e, n, largo, grosor) {
        return pelaje(semilla, e, n, largo, grosor)
            .replace(/#b47c4a|#c99464/g, pal.luz)
            .replace(/#3a2010/g, pal.osc)
            .replace(/#64391c|#82502a/g, pal.tex);
    }

    function defsAnimal(pal) {
        return rg("cp", [[0, pal.luz], [0.5, pal.med], [1, pal.osc]], 0.38, 0.28, 0.85) +
            rg("cc", [[0, pal.blanco || pal.crema], [1, pal.blanco2 || pal.crema2]], 0.4, 0.3, 0.8);
    }

    /** Dedos de una pata o de un pie: rayitas cortas que salen del borde de abajo. */
    function dedos(color, pts) {
        return '<g stroke="' + color + '" stroke-width="2.6" stroke-linecap="round" fill="none">' +
            pts.map(function (p) { return '<path d="M' + p[0] + " " + p[1] + " l " + p[2] + " " + p[3] + '"/>'; }).join("") + "</g>";
    }

    var CONEJO = {
        // sentado de frente: cuerpo ovalado, pechera blanca, muslos y patas traseras abajo
        cuerpo: svg(260, 290,
            "<defs>" + defsAnimal(CON) + '<clipPath id="sb"><ellipse cx="130" cy="150" rx="106" ry="126"/></clipPath></defs>' +
            '<path d="' + peludo(elipsePol(130, 150, 108, 128, 48), 6, 41, 1) + '" fill="url(#cp)" stroke="' + CON.linea + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            pelajeDe(CON, 141, { cx: 130, cy: 150, rx: 98, ry: 118 }, 210, 14, 2.4) +
            '<path d="' + peludo(elipsePol(130, 178, 62, 86, 34), 5, 43, 1) + '" fill="url(#cc)"/>' +
            pelajeDe({ luz: "#ffffff", osc: "#cfc6b8", tex: "#ddd5c8" }, 143, { cx: 130, cy: 178, rx: 54, ry: 78 }, 70, 10, 2) +
            '<g clip-path="url(#sb)"><ellipse cx="130" cy="40" rx="82" ry="26" fill="' + CON.osc + '" opacity="0.3"/></g>' +
            '<path d="' + peludo(elipsePol(56, 222, 44, 52, 28), 4, 45, 1) + '" fill="url(#cp)" stroke="' + CON.linea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<path d="' + peludo(elipsePol(204, 222, 44, 52, 28), 4, 47, 1) + '" fill="url(#cp)" stroke="' + CON.linea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            pelajeDe(CON, 145, { cx: 56, cy: 222, rx: 36, ry: 44 }, 36, 9, 2) + pelajeDe(CON, 147, { cx: 204, cy: 222, rx: 36, ry: 44 }, 36, 9, 2) +
            '<ellipse cx="60" cy="274" rx="46" ry="15" fill="url(#cp)" stroke="' + CON.linea + '" stroke-width="3.2"/>' +
            '<ellipse cx="200" cy="274" rx="46" ry="15" fill="url(#cp)" stroke="' + CON.linea + '" stroke-width="3.2"/>' +
            dedos(CON.osc, [[40, 268, 0, 9], [58, 268, 0, 10], [76, 268, 0, 9], [184, 268, 0, 9], [202, 268, 0, 10], [220, 268, 0, 9]])),
        // cabeza 240 × 200, centro (120, 100), SIN ojos, nariz ni boca (los pone animales.js): ojos hacia (±36, -18), nariz (0, 12), boca desde (0, 32)
        cabeza: svg(240, 200,
            "<defs>" + defsAnimal(CON) + "</defs>" +
            '<path d="' + peludo(elipsePol(120, 100, 102, 86, 44), 5, 49, 1) + '" fill="url(#cp)" stroke="' + CON.linea + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            pelajeDe(CON, 151, { cx: 120, cy: 96, rx: 92, ry: 76 }, 170, 12, 2.2) +
            '<ellipse cx="96" cy="56" rx="40" ry="16" fill="#fff" opacity="0.28" transform="rotate(-14 96 56)"/>' +
            '<ellipse cx="58" cy="118" rx="15" ry="9" fill="#ff9d96" opacity="0.4"/><ellipse cx="182" cy="118" rx="15" ry="9" fill="#ff9d96" opacity="0.4"/>' +
            '<path d="' + peludo(elipsePol(98, 134, 40, 30, 24), 3, 53, 1) + '" fill="url(#cc)" stroke="' + CON.med + '" stroke-width="1.8"/>' +
            '<path d="' + peludo(elipsePol(142, 134, 40, 30, 24), 3, 55, 1) + '" fill="url(#cc)" stroke="' + CON.med + '" stroke-width="1.8"/>'),
        // oreja larga 80 × 200: la base queda abajo (pivote en 40, 190)
        oreja: svg(80, 200,
            "<defs>" + defsAnimal(CON) + rg("co", [[0, "#ffd6d1"], [1, CON.rosa2]], 0.4, 0.3, 0.8) + "</defs>" +
            '<path d="' + peludo(elipsePol(40, 102, 31, 92, 32), 3, 57, 1) + '" fill="url(#cp)" stroke="' + CON.linea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            pelajeDe(CON, 153, { cx: 40, cy: 102, rx: 26, ry: 84 }, 60, 10, 1.8) +
            '<ellipse cx="42" cy="108" rx="16" ry="70" fill="url(#co)"/>' +
            '<path d="M32 60 C 30 90, 32 130, 38 160" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"/>'),
        // pata delantera 70 × 130, cuelga sobre la pechera
        pata: svg(70, 130,
            "<defs>" + defsAnimal(CON) + "</defs>" +
            '<path d="' + peludo(elipsePol(35, 64, 26, 58, 26), 4, 59, 1) + '" fill="url(#cc)" stroke="' + CON.linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            pelajeDe({ luz: "#ffffff", osc: "#cfc6b8", tex: "#ddd5c8" }, 155, { cx: 35, cy: 60, rx: 20, ry: 50 }, 30, 9, 1.8) +
            dedos(CON.osc, [[24, 112, 0, -10], [35, 114, 0, -12], [46, 112, 0, -10]]) +
            '<ellipse cx="24" cy="40" rx="5" ry="16" fill="#fff" opacity="0.6" transform="rotate(8 24 40)"/>')
    };

    var PERRO = {
        // sentado de frente: cuerpo beige con mancha marrón en un costado, pecho crema, muslos y patas traseras
        cuerpo: svg(260, 290,
            "<defs>" + defsAnimal(PER) + rg("pm", [[0, PER.manchaLuz], [0.5, PER.mancha], [1, PER.mancha2]], 0.38, 0.28, 0.85) +
            '<clipPath id="pk"><ellipse cx="130" cy="150" rx="104" ry="124"/></clipPath></defs>' +
            '<path d="' + peludo(elipsePol(130, 150, 106, 128, 48), 6, 61, 1) + '" fill="url(#cp)" stroke="' + PER.linea + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<g clip-path="url(#pk)"><path d="' + peludo(elipsePol(206, 116, 56, 62, 26), 5, 63, 1) + '" fill="url(#pm)"/>' +
            '<path d="' + peludo(elipsePol(40, 70, 28, 22, 18), 4, 64, 1) + '" fill="url(#pm)"/></g>' +
            pelajeDe(PER, 161, { cx: 130, cy: 150, rx: 98, ry: 118 }, 210, 14, 2.4) +
            '<path d="' + peludo(elipsePol(130, 180, 56, 84, 32), 5, 65, 1) + '" fill="url(#cc)"/>' +
            pelajeDe({ luz: "#ffffff", osc: PER.crema2, tex: "#f6e7c4" }, 163, { cx: 130, cy: 180, rx: 48, ry: 76 }, 60, 10, 2) +
            '<g clip-path="url(#pk)"><ellipse cx="130" cy="40" rx="82" ry="26" fill="' + PER.osc + '" opacity="0.3"/></g>' +
            '<path d="' + peludo(elipsePol(56, 222, 44, 52, 28), 4, 66, 1) + '" fill="url(#cp)" stroke="' + PER.linea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<path d="' + peludo(elipsePol(204, 222, 44, 52, 28), 4, 67, 1) + '" fill="url(#pm)" stroke="' + PER.linea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            pelajeDe(PER, 165, { cx: 56, cy: 222, rx: 36, ry: 44 }, 36, 9, 2) +
            '<ellipse cx="60" cy="274" rx="46" ry="15" fill="url(#cp)" stroke="' + PER.linea + '" stroke-width="3.2"/>' +
            '<ellipse cx="200" cy="274" rx="46" ry="15" fill="url(#cp)" stroke="' + PER.linea + '" stroke-width="3.2"/>' +
            dedos(PER.mancha2, [[40, 268, 0, 9], [58, 268, 0, 10], [76, 268, 0, 9], [184, 268, 0, 9], [202, 268, 0, 10], [220, 268, 0, 9]])),
        // cabeza 250 × 220, centro (125, 110), SIN ojos, nariz ni boca (los pone animales.js): ojos hacia (±37, -18), nariz (0, 12), boca desde (0, 38)
        cabeza: svg(250, 220,
            "<defs>" + defsAnimal(PER) + rg("pm", [[0, PER.manchaLuz], [0.5, PER.mancha], [1, PER.mancha2]], 0.38, 0.28, 0.85) +
            '<clipPath id="pk"><ellipse cx="125" cy="110" rx="100" ry="88"/></clipPath></defs>' +
            '<path d="' + peludo(elipsePol(125, 110, 100, 88, 44), 5, 67, 1) + '" fill="url(#cp)" stroke="' + PER.linea + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<g clip-path="url(#pk)"><path d="' + peludo(elipsePol(80, 90, 34, 32, 22), 4, 68, 1) + '" fill="url(#pm)"/>' +
            '<path d="' + peludo(elipsePol(210, 40, 36, 30, 20), 4, 69, 1) + '" fill="url(#pm)"/></g>' +
            pelajeDe(PER, 167, { cx: 125, cy: 106, rx: 90, ry: 76 }, 170, 12, 2.2) +
            '<ellipse cx="100" cy="58" rx="42" ry="14" fill="#fff" opacity="0.3" transform="rotate(-12 100 58)"/>' +
            '<path d="M70 66 C 78 60, 92 60, 100 66 M150 66 C 158 60, 172 60, 180 66" stroke="' + PER.mancha2 + '" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.4"/>' +
            '<path d="' + peludo(elipsePol(125, 144, 54, 40, 30), 3, 71, 1) + '" fill="url(#cc)" stroke="' + PER.osc + '" stroke-width="2.4"/>'),
        // oreja caída 90 × 160: se cuelga de arriba (pivote en 45, 10)
        oreja: svg(90, 160,
            "<defs>" + rg("po", [[0, PER.manchaLuz], [0.5, PER.mancha], [1, PER.mancha2]], 0.38, 0.28, 0.85) + "</defs>" +
            '<path d="' + peludo(elipsePol(45, 84, 34, 72, 30), 4, 73, 1) + '" fill="url(#po)" stroke="' + PER.linea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            pelajeDe({ luz: PER.manchaLuz, osc: PER.mancha2, tex: "#8a5a2e" }, 169, { cx: 45, cy: 84, rx: 28, ry: 62 }, 60, 11, 2) +
            '<path d="M32 30 C 28 60, 30 100, 38 132" stroke="#e2b27c" stroke-width="3.4" fill="none" stroke-linecap="round" opacity="0.55"/>'),
        // pata delantera 70 × 130
        pata: svg(70, 130,
            "<defs>" + defsAnimal(PER) + "</defs>" +
            '<path d="' + peludo(elipsePol(35, 64, 26, 58, 26), 4, 75, 1) + '" fill="url(#cp)" stroke="' + PER.linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            pelajeDe(PER, 171, { cx: 35, cy: 60, rx: 20, ry: 50 }, 30, 9, 1.8) +
            dedos(PER.mancha2, [[24, 114, 0, -10], [35, 116, 0, -12], [46, 114, 0, -10]]) +
            '<ellipse cx="24" cy="40" rx="5" ry="16" fill="#fff" opacity="0.5" transform="rotate(8 24 40)"/>'),
        // cola 140 × 130: nace abajo a la izquierda (pivote en 14, 108) y se curva hacia arriba
        cola: (function () {
            var c = suave([[14, 108, 26], [38, 100, 34], [68, 80, 38], [96, 50, 34], [110, 22, 26], [118, 10, 10]], 6);
            return svg(140, 130,
                "<defs>" + defsAnimal(PER) + "</defs>" +
                '<path d="' + peludo(banda(c, 1), 5, 77, 2) + '" fill="url(#cp)" stroke="' + PER.linea + '" stroke-width="3" stroke-linejoin="round"/>' +
                pelajeDe(PER, 173, { cx: 70, cy: 76, rx: 40, ry: 30 }, 40, 9, 1.8));
        })()
    };

    var PAJARO = {
        // cuerpo rechoncho 240 × 250 con vientre crema; las patas son otra pieza
        cuerpo: svg(240, 250,
            "<defs>" + rg("pj", [[0, PAJ.luz], [0.5, PAJ.med], [1, PAJ.osc]], 0.38, 0.28, 0.85) +
            '<radialGradient id="pv" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="' + PAJ.crema + '"/>' +
            '<stop offset="1" stop-color="' + PAJ.crema2 + '" stop-opacity="0"/></radialGradient>' +
            '<clipPath id="sb"><ellipse cx="120" cy="134" rx="100" ry="104"/></clipPath></defs>' +
            '<path d="' + peludo(elipsePol(120, 134, 102, 106, 44), 3.5, 81, 1) + '" fill="url(#pj)" stroke="' + PAJ.linea + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<ellipse cx="62" cy="104" rx="15" ry="34" fill="#fff" opacity="0.22" transform="rotate(14 62 104)"/>' +
            '<ellipse cx="120" cy="176" rx="68" ry="70" fill="url(#pv)" clip-path="url(#sb)"/>' +
            (function () {
                var r = azar(85), o = '<g fill="none" stroke="' + PAJ.crema2 + '" stroke-width="2.4" stroke-linecap="round" opacity="0.8">';
                for (var i = 0; i < 20; i++) {
                    var p = puntoElipse(r, { cx: 120, cy: 176, rx: 56, ry: 62 }, 0, 0.9, 0, TAU);
                    o += '<path d="M' + n1(p.x - 7) + " " + n1(p.y) + " q 7 8 14 0" + '"/>';
                }
                return o + "</g>";
            })() +
            '<g clip-path="url(#sb)"><ellipse cx="120" cy="38" rx="70" ry="22" fill="' + PAJ.linea + '" opacity="0.28"/></g>' +
            '<path d="M70 236 C 90 244, 150 244, 170 236" stroke="' + PAJ.osc + '" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.5"/>'),
        // cabeza 150 × 135 (dibujada a 200 × 180 y escalada 0,75, ancho ~62 % del cuerpo), centro (75, 67.5), SIN ojos:
        // ojos hacia (±24, -10,5); solo la mandíbula SUPERIOR del pico; la inferior la dibuja animales.js
        // (línea de apertura en y = +30 desde el centro, de x = -26 a +26, en píxeles de esta textura)
        cabeza: svg(150, 135,
            "<defs>" + rg("pj", [[0, PAJ.luz], [0.5, PAJ.med], [1, PAJ.osc]], 0.38, 0.28, 0.85) +
            rg("pp", [[0, "#ffd9a8"], [0.5, PAJ.pico], [1, PAJ.pico2]], 0.4, 0.25, 0.9) + "</defs>" +
            '<g transform="scale(0.75)">' +
            '<path d="M88 24 C 78 12, 80 2, 90 2 C 98 8, 100 18, 100 28 Z" fill="url(#pj)" stroke="' + PAJ.linea + '" stroke-width="2.8" stroke-linejoin="round"/>' +
            '<path d="M104 24 C 104 10, 110 0, 120 2 C 124 12, 116 22, 110 30 Z" fill="url(#pj)" stroke="' + PAJ.linea + '" stroke-width="2.8" stroke-linejoin="round"/>' +
            '<path d="' + peludo(elipsePol(100, 94, 84, 76, 40), 3, 87, 1) + '" fill="url(#pj)" stroke="' + PAJ.linea + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<ellipse cx="70" cy="58" rx="26" ry="12" fill="#fff" opacity="0.28" transform="rotate(-18 70 58)"/>' +
            '<ellipse cx="42" cy="108" rx="15" ry="9" fill="#ff9aa2" opacity="0.5"/><ellipse cx="158" cy="108" rx="15" ry="9" fill="#ff9aa2" opacity="0.5"/>' +
            // mandíbula superior: abierta por abajo (borde casi recto en y = 120), sin cerrar el pico
            '<path d="M62 112 C 60 96, 80 92, 100 92 C 120 92, 140 96, 138 112 C 124 120, 112 122, 100 122 C 88 122, 76 120, 62 112 Z" fill="url(#pp)" stroke="' + PAJ.picoLinea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<ellipse cx="84" cy="100" rx="11" ry="3.6" fill="#fff" opacity="0.6" transform="rotate(-8 84 100)"/>' +
            '<ellipse cx="90" cy="108" rx="2.8" ry="2" fill="' + PAJ.picoLinea + '" opacity="0.65"/><ellipse cx="110" cy="108" rx="2.8" ry="2" fill="' + PAJ.picoLinea + '" opacity="0.65"/></g>'),
        // ala 90 × 150: se cuelga de arriba (pivote en 45, 8)
        ala: svg(90, 150,
            "<defs>" + rg("pa", [[0, PAJ.luz], [0.5, PAJ.med], [1, PAJ.osc]], 0.35, 0.25, 0.9) + "</defs>" +
            '<path d="M45 6 C 80 10, 88 70, 72 128 C 64 142, 54 140, 46 130 C 40 142, 28 140, 22 126 C 4 70, 12 10, 45 6 Z" fill="url(#pa)" stroke="' + PAJ.linea + '" stroke-width="3.2" stroke-linejoin="round"/>' +
            '<g stroke="' + PAJ.linea + '" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.45">' +
            '<path d="M45 40 C 36 70, 32 100, 34 128"/><path d="M45 40 C 50 70, 54 100, 52 130"/><path d="M45 40 C 62 64, 68 96, 66 124"/><path d="M45 40 C 28 62, 22 92, 24 118"/></g>' +
            '<ellipse cx="32" cy="40" rx="6" ry="20" fill="#fff" opacity="0.3" transform="rotate(10 32 40)"/>'),
        // pata naranja 70 × 100: tallo y tres dedos hacia adelante
        pata: svg(70, 100,
            '<g stroke="' + PAJ.picoLinea + '" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
            '<path d="M35 6 L 35 58"/><path d="M35 58 L 12 82"/><path d="M35 58 L 35 88"/><path d="M35 58 L 58 82"/></g>' +
            '<g stroke="' + PAJ.pico + '" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
            '<path d="M35 6 L 35 58"/><path d="M35 58 L 12 82"/><path d="M35 58 L 35 88"/><path d="M35 58 L 58 82"/></g>' +
            '<path d="M32 10 L 32 52" stroke="#ffd9a8" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>')
    };

    function petalo(color, borde) {
        return svg(30, 30, '<path d="M15 2 C 26 8, 26 22, 15 28 C 4 22, 4 8, 15 2 Z" fill="' + color + '" stroke="' + borde + '" stroke-width="1.6"/>' +
            '<path d="M15 6 L 15 24" stroke="' + borde + '" stroke-width="1" opacity="0.5"/>');
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
                console.warn("[DibujosPicnic] no se pudo dibujar", clave);
                cache[clave] = lienzo(w, h);
                resolve();
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function lista() {
        var l = [
            ["oso-cuerpo", OSO.cuerpo], ["oso-cabeza", OSO.cabeza], ["oso-brazo", OSO.brazo], ["oso-pie", OSO.pie], ["oso-pierna", OSO.pierna],
            ["conejo-cuerpo", CONEJO.cuerpo], ["conejo-cabeza", CONEJO.cabeza], ["conejo-oreja", CONEJO.oreja], ["conejo-pata", CONEJO.pata],
            ["perro-cuerpo", PERRO.cuerpo], ["perro-cabeza", PERRO.cabeza], ["perro-oreja", PERRO.oreja], ["perro-pata", PERRO.pata], ["perro-cola", PERRO.cola],
            ["pajaro-cuerpo", PAJARO.cuerpo], ["pajaro-cabeza", PAJARO.cabeza], ["pajaro-ala", PAJARO.ala], ["pajaro-pata", PAJARO.pata],
            ["plato", OBJ.plato], ["cesta", OBJ.cesta], ["letrero", OBJ.letrero], ["cerca", OBJ.cerca], ["arbusto", OBJ.arbusto],
            ["hongos", OBJ.hongos], ["hierba", OBJ.hierba], ["hoja", OBJ.hoja], ["corazon", OBJ.corazon], ["corazon-lila", OBJ.corazonLila],
            ["estrella", OBJ.estrella], ["banderines", OBJ.banderines],
            ["flor-0", florSvg("#ffffff", "#d0d0d0")], ["flor-1", florSvg("#ffc9c9", "#e8868a")], ["flor-2", florSvg("#d0bfff", "#9775fa")],
            ["petalo-0", petalo("#ffffff", "#c9c9c9")], ["petalo-1", petalo("#ffc9de", "#e64980")], ["petalo-2", petalo("#ffe066", "#e8a400")]
        ];
        Object.keys(ALIMENTOS).forEach(function (t) { l.push(["alimento-" + t, svgAlimento(t)]); });
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

    /** La manta sola (sin pasto), por si la escena la quiere como sprite aparte. */
    function mantaSuelta() {
        if (!cache.mantaSuelta) {
            var c = lienzo(1320, 340);
            manta(c.getContext("2d"), [[300, 20], [1020, 20], [30, 300], [1290, 300]], 12, 7);
            cache.mantaSuelta = c;
        }
        return cache.mantaSuelta;
    }

    global.DibujosPicnic = {
        preparar: preparar,
        lista: lista,
        svgAlimento: function (tipo) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgAlimento(tipo)); },
        tiposAlimento: function () { return Object.keys(ALIMENTOS); },
        alimento: function (tipo) { return cache["alimento-" + tipo] || lienzo(128, 128); },
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
        /** Cualquier dibujo ya rasterizado por su clave (animales, alimentos, pétalos…). */
        pieza: function (clave) { return cache[clave] || lienzo(4, 4); },
        manta: mantaSuelta,
        sombra: sombra,
        chispa: chispa,
        manchaLuz: manchaLuz,
        rayo: rayo,
        confeti: confeti,
        fondoPicnic: fondoPicnic,
        fondoFiesta: fondoFiesta
    };
})(window);
