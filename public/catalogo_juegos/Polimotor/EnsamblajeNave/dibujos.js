/**
 * DibujosNave — dibujos SVG propios de "El Ensamblaje de la Nave" (window.DibujosNave).
 *
 * Todo se dibuja aquí: el taller espacial, la bandeja, el plano holográfico, los cascos de las
 * tres naves (versión holograma y versión ensamblada), las siete piezas, sus contornos de encaje
 * y las partículas. preparar() rasteriza cada SVG a <canvas> una sola vez y la escena los
 * convierte en texturas de Phaser.
 *
 * Pieza y contorno comparten la misma geometría (PIEZAS[id].partes, coordenadas locales con el
 * centro en 0,0): al encajar coinciden borde con borde.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;

    // Lienzo de una pieza y de su contorno: el centro (0,0) de la geometría cae en el centro.
    // Es amplio porque las aletas completas de la Nave Cometa miden ~240 de diseño.
    var PIEZA = { w: 300, h: 300, c: 150 };
    var MOLDE = { w: 340, h: 340, c: 170 };
    // Lienzo de los cascos: centro de la nave en (CASCO.cx, CASCO.cy).
    var CASCO = { w: 820, h: 740, cx: 410, cy: 370 };

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

    /**
     * Transforma un path de coordenadas absolutas (solo comandos M L Q C A Z con números):
     * sx = -1 lo refleja en horizontal (pieza derecha a partir de la izquierda), luego desplaza.
     */
    function transformar(d, sx, dx, dy) {
        // los arcos (A) llevan 7 números: solo los dos últimos son coordenadas; al reflejar cambia el sentido
        return d.replace(/([MLQCAZ])([^MLQCAZ]*)/g, function (_, cmd, args) {
            var n = (args.match(/-?\d*\.?\d+/g) || []).map(Number);
            if (cmd === "Z") return "Z ";
            if (cmd === "A") {
                var out = [];
                for (var i = 0; i + 6 < n.length; i += 7) {
                    var barrido = sx < 0 ? 1 - n[i + 4] : n[i + 4];
                    out.push(n[i], n[i + 1], n[i + 2], n[i + 3], barrido, r1(n[i + 5] * sx + dx), r1(n[i + 6] + dy));
                }
                return "A" + out.join(" ") + " ";
            }
            var o = [];
            for (var k = 0; k < n.length; k += 2) o.push(r1(n[k] * sx + dx), r1(n[k + 1] + dy));
            return cmd + o.join(" ") + " ";
        });
    }

    function mover(d, dx, dy) { return transformar(d, 1, dx, dy); }

    // ------------------------------------------------------------------ geometría de las piezas

    /**
     * Cada pieza: partes = subtrazos cuya unión es la silueta (lo que dibuja el contorno),
     * color = paleta propia, alto/ancho aproximados para el radio de toque.
     */
    var PIEZAS = {
        cabina: {
            partes: ["M-64 32 C -64 -28, -34 -66, 0 -66 C 34 -66, 64 -28, 64 32 L 64 40 Q 64 56 48 56 L -48 56 Q -64 56 -64 40 Z"],
            color: { luz: "#e3fafc", medio: "#66d9e8", sombra: "#0c8599", linea: "#06343f", acento: "#99e9f2" },
            tinte: 0x3bc9db, r: 70, w: 128, h: 122
        },
        antena: {
            partes: [
                "M-66 -46 Q 0 -30 66 -46 Q 54 6 0 8 Q -54 6 -66 -46 Z",
                "M-4 -82 L 4 -82 L 4 -36 L -4 -36 Z",
                "M-13 -94 A 13 13 0 1 0 13 -94 A 13 13 0 1 0 -13 -94 Z",
                "M-11 4 L 11 4 L 11 44 L -11 44 Z",
                "M-30 40 L 30 40 L 44 74 Q 46 82 38 82 L -38 82 Q -46 82 -44 74 Z"
            ],
            color: { luz: "#d3f9d8", medio: "#40c057", sombra: "#2b8a3e", linea: "#0b3015", acento: "#b2f2bb" },
            tinte: 0x51cf66, r: 72, w: 132, h: 190
        },
        propulsor: {
            partes: [
                "M-46 -64 L 46 -64 Q 54 -64 54 -56 L 54 -24 Q 54 -16 46 -16 L -46 -16 Q -54 -16 -54 -24 L -54 -56 Q -54 -64 -46 -64 Z",
                "M-32 -18 L 32 -18 L 62 50 Q 66 62 52 62 L -52 62 Q -66 62 -62 50 Z"
            ],
            color: { luz: "#ffe8cc", medio: "#ff922b", sombra: "#c2410c", linea: "#431407", acento: "#ffd8a8" },
            tinte: 0xff922b, r: 68, w: 128, h: 126
        },
        cono: {
            partes: ["M-52 54 C -52 -2, -28 -54, 0 -80 C 28 -54, 52 -2, 52 54 Q 52 66 40 66 L -40 66 Q -52 66 -52 54 Z"],
            color: { luz: "#f3d9fa", medio: "#be4bdb", sombra: "#862e9c", linea: "#2b0a33", acento: "#eebefa" },
            tinte: 0xcc5de8, r: 72, w: 104, h: 146
        },
        // Panel solar: el cuerpo de celdas va afuera y el brazo con la bisagra se une al fuselaje.
        "panel-izq": {
            partes: [
                "M-110 -28 L -92 -46 L 40 -46 L 40 46 L -92 46 L -110 28 Z",
                "M38 -10 L 104 -10 L 104 10 L 38 10 Z",
                "M98 0 A 12 12 0 1 0 122 0 A 12 12 0 1 0 98 0 Z"
            ],
            color: { luz: "#a5d8ff", medio: "#1c7ed6", sombra: "#0b3d91", linea: "#071d49", acento: "#d0ebff" },
            tinte: 0x339af0, r: 92, w: 232, h: 92
        },
        // Aleta completa de la Nave Cometa (el ala delta entera, no un adorno sobre ella).
        "aleta-izq": {
            partes: ["M112 -113 L -106 87 Q -130 110 -104 113 L 112 105 Z"],
            color: { luz: "#ffc9c9", medio: "#f03e3e", sombra: "#a51111", linea: "#3f0505", acento: "#ffe3e3" },
            tinte: 0xff6b6b, r: 100, w: 240, h: 226
        },
        // Turbina de ala: góndola con la toma de aire adelante, la tobera atrás y un estabilizador hacia afuera.
        "turbina-izq": {
            partes: [
                "M-30 -70 Q -30 -96 0 -96 Q 30 -96 30 -70 L 30 72 Q 30 92 0 96 Q -30 92 -30 72 Z",
                "M-28 26 L -62 66 Q -66 72 -62 78 L -60 94 L -28 80 Z"
            ],
            color: { luz: "#fff3bf", medio: "#fab005", sombra: "#c76b00", linea: "#3d2200", acento: "#ffec99" },
            tinte: 0xfcc419, r: 82, w: 94, h: 192
        }
    };
    // La pieza derecha es el reflejo exacto de la izquierda (la misma pieza, del otro lado de la nave).
    ["panel", "aleta", "turbina"].forEach(function (base) {
        var izq = PIEZAS[base + "-izq"];
        PIEZAS[base + "-der"] = {
            partes: izq.partes.map(function (d) { return transformar(d, -1, 0, 0); }),
            color: izq.color, tinte: izq.tinte, r: izq.r, w: izq.w, h: izq.h, espejoDe: base + "-izq"
        };
    });

    function union(id, dx, dy) {
        return PIEZAS[id].partes.map(function (p) { return mover(p, dx, dy); }).join(" ");
    }

    function remaches(lista, r, color) {
        return lista.map(function (p) {
            return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r || 3.2) + '" fill="' + (color || "#dee2e6") + '" stroke="#343a40" stroke-width="1.4"/>';
        }).join("");
    }

    // ------------------------------------------------------------------ piezas (cartoon con volumen)

    function defsPieza(p) {
        return "<defs>" +
            '<linearGradient id="gc" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="' + p.luz + '"/><stop offset="0.45" stop-color="' + p.medio + '"/><stop offset="1" stop-color="' + p.sombra + '"/></linearGradient>' +
            '<linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8f9fa"/><stop offset="0.5" stop-color="#adb5bd"/><stop offset="1" stop-color="#495057"/></linearGradient>' +
            '<radialGradient id="gb" cx="32%" cy="24%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="gv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3fafc" stop-opacity="0.95"/><stop offset="0.5" stop-color="#66d9e8" stop-opacity="0.75"/><stop offset="1" stop-color="#0b7285" stop-opacity="0.95"/></linearGradient>' +
            "</defs>";
    }

    var DIBUJO = {
        cabina: function (c, p) {
            var x = c, y = c;
            var cristal = "M" + (x - 58) + " " + (y + 30) + " C " + (x - 58) + " " + (y - 24) + ", " + (x - 30) + " " + (y - 60) + ", " + x + " " + (y - 60) +
                " C " + (x + 30) + " " + (y - 60) + ", " + (x + 58) + " " + (y - 24) + ", " + (x + 58) + " " + (y + 30) + " Z";
            return '<path d="' + union("cabina", x, y) + '" fill="#0b2239" stroke="' + p.linea + '" stroke-width="7" stroke-linejoin="round"/>' +
                '<path d="' + cristal + '" fill="url(#gv)"/>' +
                // asiento y panel de mandos dentro del cristal
                '<path d="M' + (x - 22) + " " + (y + 26) + " L " + (x - 20) + " " + (y - 8) + " Q " + x + " " + (y - 20) + " " + (x + 20) + " " + (y - 8) + " L " + (x + 22) + " " + (y + 26) + ' Z" fill="#1864ab" opacity="0.55"/>' +
                '<rect x="' + (x - 36) + '" y="' + (y + 14) + '" width="72" height="12" rx="5" fill="#0b2239" opacity="0.6"/>' +
                '<circle cx="' + (x - 22) + '" cy="' + (y + 20) + '" r="3.5" fill="#ff6b6b"/><circle cx="' + x + '" cy="' + (y + 20) + '" r="3.5" fill="#ffd43b"/><circle cx="' + (x + 22) + '" cy="' + (y + 20) + '" r="3.5" fill="#69db7c"/>' +
                // reflejos del cristal
                '<path d="M' + (x - 40) + " " + (y - 6) + " C " + (x - 38) + " " + (y - 34) + ", " + (x - 20) + " " + (y - 50) + ", " + (x + 2) + " " + (y - 52) + '" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity="0.85"/>' +
                '<path d="M' + (x - 44) + " " + (y + 10) + " L " + (x - 43) + " " + (y + 2) + '" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.7"/>' +
                '<path d="' + cristal + '" fill="none" stroke="' + p.linea + '" stroke-width="5" stroke-linejoin="round"/>' +
                // aro metálico con tornillos
                '<path d="M' + (x - 64) + " " + (y + 30) + " L " + (x + 64) + " " + (y + 30) + " L " + (x + 64) + " " + (y + 40) + " Q " + (x + 64) + " " + (y + 56) + " " + (x + 48) + " " + (y + 56) +
                " L " + (x - 48) + " " + (y + 56) + " Q " + (x - 64) + " " + (y + 56) + " " + (x - 64) + " " + (y + 40) + ' Z" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="5" stroke-linejoin="round"/>' +
                '<rect x="' + (x - 56) + '" y="' + (y + 34) + '" width="112" height="5" rx="2.5" fill="#fff" opacity="0.6"/>' +
                remaches([[x - 44, y + 46], [x - 15, y + 46], [x + 15, y + 46], [x + 44, y + 46]]);
        },
        antena: function (c, p) {
            var x = c, y = c;
            var s = "";
            // base
            s += '<path d="' + mover(PIEZAS.antena.partes[4], x, y) + '" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="6" stroke-linejoin="round"/>';
            s += '<rect x="' + (x - 24) + '" y="' + (y + 56) + '" width="48" height="6" rx="3" fill="' + p.medio + '"/>';
            // mástil
            s += '<path d="' + mover(PIEZAS.antena.partes[3], x, y) + '" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="5"/>';
            // plato
            s += '<path d="' + mover(PIEZAS.antena.partes[0], x, y) + '" fill="url(#gc)" stroke="' + p.linea + '" stroke-width="6" stroke-linejoin="round"/>';
            s += '<path d="M' + (x - 66) + " " + (y - 46) + " Q " + x + " " + (y - 30) + " " + (x + 66) + " " + (y - 46) + " Q " + x + " " + (y - 60) + " " + (x - 66) + " " + (y - 46) + ' Z" fill="' + p.acento + '" stroke="' + p.linea + '" stroke-width="5"/>';
            s += '<path d="M' + (x - 44) + " " + (y - 26) + " Q " + (x - 24) + " " + (y - 4) + " " + x + " " + y + '" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.65"/>';
            // varilla y emisor
            s += '<path d="' + mover(PIEZAS.antena.partes[1], x, y) + '" fill="#ced4da" stroke="' + p.linea + '" stroke-width="3.5"/>';
            s += '<path d="' + mover(PIEZAS.antena.partes[2], x, y) + '" fill="#ffd43b" stroke="' + p.linea + '" stroke-width="4"/>';
            s += '<circle cx="' + (x - 4) + '" cy="' + (y - 98) + '" r="4" fill="#fff" opacity="0.9"/>';
            return s;
        },
        propulsor: function (c, p) {
            var x = c, y = c;
            var s = "";
            s += '<path d="' + mover(PIEZAS.propulsor.partes[1], x, y) + '" fill="url(#gc)" stroke="' + p.linea + '" stroke-width="6" stroke-linejoin="round"/>';
            // aros de la campana
            [[-12, 40], [14, 50]].forEach(function (a) {
                var yy = y + a[0], w = a[1];
                s += '<path d="M' + (x - w) + " " + yy + " Q " + x + " " + (yy + 7) + " " + (x + w) + " " + yy + '" stroke="' + p.sombra + '" stroke-width="4" fill="none"/>';
            });
            s += '<ellipse cx="' + x + '" cy="' + (y + 56) + '" rx="48" ry="7" fill="#431407" opacity="0.65"/>';
            s += '<ellipse cx="' + x + '" cy="' + (y + 56) + '" rx="32" ry="4" fill="#ffd43b" opacity="0.9"/>';
            s += '<path d="M' + (x - 24) + " " + (y - 8) + " L " + (x - 44) + " " + (y + 44) + '" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.55"/>';
            // carcasa de arriba
            s += '<path d="' + mover(PIEZAS.propulsor.partes[0], x, y) + '" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="6" stroke-linejoin="round"/>';
            s += '<rect x="' + (x - 40) + '" y="' + (y - 52) + '" width="80" height="10" rx="5" fill="' + p.medio + '"/>';
            s += '<rect x="' + (x - 40) + '" y="' + (y - 36) + '" width="80" height="6" rx="3" fill="#495057" opacity="0.5"/>';
            s += remaches([[x - 46, y - 56], [x + 46, y - 56], [x - 46, y - 24], [x + 46, y - 24]], 3);
            return s;
        },
        cono: function (c, p) {
            var x = c, y = c;
            var s = '<path d="' + union("cono", x, y) + '" fill="url(#gc)" stroke="' + p.linea + '" stroke-width="7" stroke-linejoin="round"/>';
            // bandas
            s += '<path d="M' + (x - 44) + " " + (y + 8) + " Q " + x + " " + (y + 18) + " " + (x + 44) + " " + (y + 8) + " L " + (x + 48) + " " + (y + 26) + " Q " + x + " " + (y + 36) + " " + (x - 48) + " " + (y + 26) + ' Z" fill="#fff" opacity="0.9" stroke="' + p.linea + '" stroke-width="2.5"/>';
            s += '<path d="M' + (x - 28) + " " + (y - 40) + " Q " + x + " " + (y - 33) + " " + (x + 28) + " " + (y - 40) + '" stroke="' + p.acento + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
            // estrella amarilla
            s += '<path d="' + mover("M0 -24 L 5 -13 L 17 -12 L 8 -4 L 11 8 L 0 2 L -11 8 L -8 -4 L -17 -12 L -5 -13 Z", x, y) + '" fill="#ffd43b" stroke="' + p.linea + '" stroke-width="2.5" stroke-linejoin="round"/>';
            s += '<path d="M' + (x - 30) + " " + (y + 40) + " C " + (x - 32) + " " + (y - 10) + ", " + (x - 18) + " " + (y - 44) + ", " + (x - 6) + " " + (y - 60) + '" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.55"/>';
            s += '<path d="' + mover("M-52 54 L 52 54 Q 52 66 40 66 L -40 66 Q -52 66 -52 54 Z", x, y) + '" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="4"/>';
            return s;
        }
    };

    DIBUJO["panel-izq"] = function (c, p) {
        var x = c, y = c;
        var M = function (d) { return mover(d, x, y); };
        var s = "";
        // brazo y bisagra
        s += '<path d="' + M(PIEZAS["panel-izq"].partes[1]) + '" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="5"/>';
        s += '<path d="' + M(PIEZAS["panel-izq"].partes[2]) + '" fill="#ffd43b" stroke="' + p.linea + '" stroke-width="5"/>';
        s += '<circle cx="' + (x + 110) + '" cy="' + y + '" r="4" fill="' + p.linea + '"/>';
        // marco y celdas
        s += '<path d="' + M(PIEZAS["panel-izq"].partes[0]) + '" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="7" stroke-linejoin="round"/>';
        var interior = M("M-100 -24 L -86 -38 L 32 -38 L 32 38 L -86 38 L -100 24 Z");
        s += '<path d="' + interior + '" fill="url(#gc)" stroke="' + p.linea + '" stroke-width="3"/>';
        for (var i = 1; i < 5; i++) {
            var cx = x - 100 + i * 26.4;
            s += '<line x1="' + r1(cx) + '" y1="' + (y - 38) + '" x2="' + r1(cx) + '" y2="' + (y + 38) + '" stroke="#0b3d91" stroke-width="3"/>';
        }
        [-13, 13].forEach(function (dy) {
            s += '<line x1="' + (x - 100) + '" y1="' + (y + dy) + '" x2="' + (x + 32) + '" y2="' + (y + dy) + '" stroke="#0b3d91" stroke-width="3"/>';
        });
        s += '<path d="' + interior + '" fill="url(#gb)" opacity="0.7"/>';
        s += '<path d="M' + (x - 82) + " " + (y - 30) + " L " + (x - 30) + " " + (y - 30) + '" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>';
        s += remaches([[x - 102, y + 36], [x + 34, y - 40], [x + 34, y + 40], [x - 102, y - 18]], 3);
        return s;
    };

    DIBUJO["aleta-izq"] = function (c, p) {
        var x = c, y = c;
        var M = function (d) { return mover(d, x, y); };
        var s = '<path d="' + M(PIEZAS["aleta-izq"].partes[0]) + '" fill="url(#gc)" stroke="' + p.linea + '" stroke-width="7" stroke-linejoin="round"/>';
        // franja blanca a lo largo del ala y borde de ataque claro
        s += '<path d="' + M("M96 -70 L -40 54 L -18 62 L 104 -40 Z") + '" fill="#fff" opacity="0.9" stroke="' + p.linea + '" stroke-width="2.5"/>';
        s += '<path d="' + M("M104 -100 L -92 80") + '" stroke="' + p.acento + '" stroke-width="7" stroke-linecap="round" opacity="0.8"/>';
        // raíz metálica que se une al fuselaje
        s += '<path d="' + M("M100 -102 L 112 -113 L 112 105 L 100 105 Z") + '" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="4"/>';
        s += remaches([[x + 106, y - 70], [x + 106, y - 20], [x + 106, y + 30], [x + 106, y + 80]], 3);
        // luz de navegación en la punta
        s += '<circle cx="' + (x - 100) + '" cy="' + (y + 104) + '" r="7" fill="#fff3bf" stroke="' + p.linea + '" stroke-width="3"/>';
        return s;
    };

    DIBUJO["turbina-izq"] = function (c, p) {
        var x = c, y = c;
        var M = function (d) { return mover(d, x, y); };
        var s = "";
        // estabilizador
        s += '<path d="' + M(PIEZAS["turbina-izq"].partes[1]) + '" fill="url(#gc)" stroke="' + p.linea + '" stroke-width="5" stroke-linejoin="round"/>';
        // góndola
        s += '<path d="' + M(PIEZAS["turbina-izq"].partes[0]) + '" fill="url(#gm)" stroke="' + p.linea + '" stroke-width="7" stroke-linejoin="round"/>';
        s += '<rect x="' + (x - 24) + '" y="' + (y - 20) + '" width="48" height="14" rx="5" fill="' + p.medio + '"/>';
        s += '<rect x="' + (x - 24) + '" y="' + (y + 6) + '" width="48" height="8" rx="4" fill="' + p.sombra + '" opacity="0.7"/>';
        // toma de aire con aspas
        s += '<circle cx="' + x + '" cy="' + (y - 66) + '" r="25" fill="#1b2a3a" stroke="' + p.linea + '" stroke-width="4"/>';
        for (var i = 0; i < 6; i++) {
            var a = i * Math.PI / 3;
            s += '<line x1="' + x + '" y1="' + (y - 66) + '" x2="' + r1(x + Math.cos(a) * 21) + '" y2="' + r1(y - 66 + Math.sin(a) * 21) + '" stroke="' + p.luz + '" stroke-width="5" stroke-linecap="round"/>';
        }
        s += '<circle cx="' + x + '" cy="' + (y - 66) + '" r="6" fill="' + p.medio + '"/>';
        // tobera
        s += '<path d="' + M("M-20 70 L 20 70 L 16 90 Q 0 96 -16 90 Z") + '" fill="' + p.sombra + '" stroke="' + p.linea + '" stroke-width="4"/>';
        s += '<path d="M' + (x - 18) + " " + (y - 30) + " L " + (x - 18) + " " + (y + 60) + '" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.6"/>';
        return s;
    };

    function pieza(id) {
        var def = PIEZAS[id];
        var p = def.color;
        var cuerpo = def.espejoDe
            ? '<g transform="translate(' + (2 * PIEZA.c) + ' 0) scale(-1 1)">' + DIBUJO[def.espejoDe](PIEZA.c, p) + "</g>"
            : DIBUJO[id](PIEZA.c, p);
        return svg(PIEZA.w, PIEZA.h, defsPieza(p) + cuerpo);
    }

    /** Silueta clara de la pieza (indicador de progreso apagado). */
    function piezaSilueta(id) {
        var u = union(id, PIEZA.c, PIEZA.c);
        return svg(PIEZA.w, PIEZA.h, '<path d="' + u + '" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>');
    }

    // ------------------------------------------------------------------ contornos de encaje

    /** Máscara para dibujar solo el borde exterior de la unión de subtrazos. */
    function mascaraFuera(id, u, w) {
        return '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + w + '" height="' + w + '"><rect width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + u + '" fill="#000"/></mask>';
    }

    function molde(id) {
        var c = MOLDE.c;
        var u = union(id, c, c);
        return svg(MOLDE.w, MOLDE.h, "<defs>" + mascaraFuera("m", u, MOLDE.w) +
            '<pattern id="ra" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="none"/><line x1="0" y1="0" x2="0" y2="12" stroke="#7ff3ff" stroke-width="2" opacity="0.28"/></pattern>' +
            "</defs>" +
            '<path d="' + u + '" fill="#0a2a4a" fill-opacity="0.72"/>' +
            '<path d="' + u + '" fill="url(#ra)"/>' +
            '<path d="' + u + '" fill="none" stroke="#7ff3ff" stroke-opacity="0.3" stroke-width="22" stroke-linejoin="round" mask="url(#m)"/>' +
            '<path d="' + u + '" fill="none" stroke="#a5f3fc" stroke-width="10" stroke-dasharray="16 10" stroke-linecap="round" stroke-linejoin="round" mask="url(#m)"/>');
    }

    /** Resplandor blanco de la silueta (se tiñe y se suma con ADD). */
    function brillo(id) {
        var w = 400, c = 200;
        var u = union(id, c, c);
        return svg(w, w, '<defs><filter id="fg" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter></defs>' +
            '<path d="' + u + '" fill="#fff" filter="url(#fg)" opacity="0.9" transform="translate(200 200) scale(1.1) translate(-200 -200)"/>' +
            '<path d="' + u + '" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round" filter="url(#fg)"/>');
    }

    /** Borde macizo: contorno completado (blanco, se tiñe de verde). */
    function borde(id) {
        var c = MOLDE.c;
        var u = union(id, c, c);
        return svg(MOLDE.w, MOLDE.h, "<defs>" + mascaraFuera("m", u, MOLDE.w) + "</defs>" +
            '<path d="' + u + '" fill="none" stroke="#fff" stroke-width="16" stroke-linejoin="round" mask="url(#m)"/>');
    }

    // ------------------------------------------------------------------ cascos de las naves

    var CASCOS = {
        chispa: {
            fuselaje: ["M0 -228 C 72 -228, 118 -150, 118 -40 C 118 70, 84 170, 0 184 C -84 170, -118 70, -118 -40 C -118 -150, -72 -228, 0 -228 Z"],
            alas: [],
            extra: [
                "M-70 150 L -132 214 Q -140 226 -124 226 L -52 200 Z",
                "M70 150 L 132 214 Q 140 226 124 226 L 52 200 Z"
            ],
            luces: [[-96, 110], [96, 110]],
            lineas: ["M0 -210 L 0 170", "M-90 -40 L 90 -40", "M-100 60 L 100 60"],
            colorAla: ["#9775fa", "#5f3dc4"], colorCuerpo: ["#f8f9fa", "#a5b4c8"], franja: "#4dabf7"
        },
        cometa: {
            fuselaje: ["M0 -178 C 58 -178, 82 -112, 82 -44 L 82 176 Q 82 200 58 200 L -58 200 Q -82 200 -82 176 L -82 -44 C -82 -112, -58 -178, 0 -178 Z"],
            alas: [],
            extra: [
                "M-60 196 L -96 236 L -40 226 Z",
                "M60 196 L 96 236 L 40 226 Z"
            ],
            luces: [[-70, 150], [70, 150]],
            lineas: ["M0 -160 L 0 190", "M-70 20 L 70 20", "M-70 120 L 70 120"],
            colorAla: ["#ff8787", "#c92a2a"], colorCuerpo: ["#f1f3f5", "#9fb0c4"], franja: "#fab005"
        },
        gran: {
            fuselaje: ["M0 -250 C 86 -250, 130 -156, 130 -40 L 130 160 Q 130 214 80 214 L -80 214 Q -130 214 -130 160 L -130 -40 C -130 -156, -86 -250, 0 -250 Z"],
            alas: [
                "M-122 -44 L -350 -24 Q -372 -22 -372 0 L -372 76 Q -372 98 -350 98 L -122 120 Z",
                "M122 -44 L 350 -24 Q 372 -22 372 0 L 372 76 Q 372 98 350 98 L 122 120 Z"
            ],
            extra: [
                "M-118 140 L -214 222 Q -226 234 -208 236 L -112 214 Z",
                "M118 140 L 214 222 Q 226 234 208 236 L 112 214 Z"
            ],
            luces: [[-362, 36], [362, 36]],
            lineas: ["M0 -232 L 0 200", "M-110 -60 L 110 -60", "M-110 140 L 110 140", "M-350 36 L -140 36", "M140 36 L 350 36"],
            colorAla: ["#4dabf7", "#1864ab"], colorCuerpo: ["#f8f9fa", "#9aa9bd"], franja: "#20c997"
        }
    };

    function trazos(nave) {
        var c = CASCOS[nave];
        return c.extra.concat(c.alas, c.fuselaje).map(function (p) { return mover(p, CASCO.cx, CASCO.cy); });
    }

    /** Holograma: líneas cian sobre transparente, con cotas y remaches de plano. */
    function holograma(nave) {
        var c = CASCOS[nave];
        var ps = trazos(nave);
        var s = '<defs><filter id="fg" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter></defs>';
        ps.forEach(function (d) { s += '<path d="' + d + '" fill="#3bdcff" fill-opacity="0.07"/>'; });
        ps.forEach(function (d) { s += '<path d="' + d + '" fill="none" stroke="#3bdcff" stroke-width="12" stroke-opacity="0.45" filter="url(#fg)"/>'; });
        ps.forEach(function (d) { s += '<path d="' + d + '" fill="none" stroke="#9ff6ff" stroke-width="4" stroke-linejoin="round"/>'; });
        c.lineas.forEach(function (d) {
            s += '<path d="' + mover(d, CASCO.cx, CASCO.cy) + '" stroke="#7ff3ff" stroke-width="2" stroke-dasharray="10 8" opacity="0.55" fill="none"/>';
        });
        c.luces.forEach(function (l) {
            s += '<circle cx="' + (CASCO.cx + l[0]) + '" cy="' + (CASCO.cy + l[1]) + '" r="9" fill="none" stroke="#9ff6ff" stroke-width="3"/>';
        });
        // marcas de cota en los extremos
        var marca = function (x, y) {
            return '<path d="M' + (x - 10) + " " + y + " L " + (x + 10) + " " + y + " M" + x + " " + (y - 10) + " L " + x + " " + (y + 10) + '" stroke="#9ff6ff" stroke-width="2" opacity="0.7"/>';
        };
        s += marca(CASCO.cx, 22) + marca(CASCO.cx, CASCO.h - 22) + marca(22, CASCO.cy) + marca(CASCO.w - 22, CASCO.cy);
        return svg(CASCO.w, CASCO.h, s);
    }

    /** Casco ensamblado: metal pintado, se funde sobre el holograma a medida que se encajan piezas. */
    function casco(nave) {
        var c = CASCOS[nave];
        var s = "<defs>" +
            '<linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.colorAla[0] + '"/><stop offset="1" stop-color="' + c.colorAla[1] + '"/></linearGradient>' +
            '<linearGradient id="gf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + c.colorCuerpo[1] + '"/><stop offset="0.35" stop-color="' + c.colorCuerpo[0] + '"/><stop offset="0.7" stop-color="' + c.colorCuerpo[0] + '"/><stop offset="1" stop-color="' + c.colorCuerpo[1] + '"/></linearGradient>' +
            "</defs>";
        var M = function (d) { return mover(d, CASCO.cx, CASCO.cy); };
        c.extra.forEach(function (d) { s += '<path d="' + M(d) + '" fill="url(#ga)" stroke="#14213d" stroke-width="7" stroke-linejoin="round"/>'; });
        c.alas.forEach(function (d) { s += '<path d="' + M(d) + '" fill="url(#ga)" stroke="#14213d" stroke-width="7" stroke-linejoin="round"/>'; });
        // franjas de las alas
        c.alas.forEach(function (d) {
            s += '<path d="' + M(d) + '" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round" opacity="0.6"/>';
        });
        c.fuselaje.forEach(function (d) { s += '<path d="' + M(d) + '" fill="url(#gf)" stroke="#14213d" stroke-width="8" stroke-linejoin="round"/>'; });
        // franja de color por el centro y líneas de panel
        s += '<path d="' + M("M-16 -150 L 16 -150 L 16 150 L -16 150 Z") + '" fill="' + c.franja + '" opacity="0.85"/>';
        c.lineas.forEach(function (d) { s += '<path d="' + M(d) + '" stroke="#495057" stroke-width="2.5" opacity="0.35" fill="none"/>'; });
        // brillo del fuselaje
        s += '<path d="' + M("M-70 -120 C -80 -60, -82 0, -76 60") + '" stroke="#fff" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.7"/>';
        var rnd = semilla(nave.length * 97);
        var pts = [];
        for (var i = 0; i < 14; i++) pts.push([CASCO.cx - 60 + rnd() * 120, CASCO.cy - 140 + rnd() * 280]);
        s += remaches(pts, 2.6, "#ced4da");
        return svg(CASCO.w, CASCO.h, s);
    }

    // ------------------------------------------------------------------ taller espacial (1600 × 900)

    function taller() {
        var s = "<defs>" +
            '<linearGradient id="pared" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1838"/><stop offset="0.65" stop-color="#16255a"/><stop offset="1" stop-color="#1c2f66"/></linearGradient>' +
            '<linearGradient id="suelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a67"/><stop offset="1" stop-color="#121a38"/></linearGradient>' +
            '<linearGradient id="tubo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ea2c8"/><stop offset="0.5" stop-color="#4d5f8a"/><stop offset="1" stop-color="#243156"/></linearGradient>' +
            '<linearGradient id="tuboV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#243156"/><stop offset="0.5" stop-color="#6c7fa8"/><stop offset="1" stop-color="#243156"/></linearGradient>' +
            '<linearGradient id="consola" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4f86"/><stop offset="1" stop-color="#1b2550"/></linearGradient>' +
            '<radialGradient id="espacio" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#3d2a8a"/><stop offset="1" stop-color="#0a0f2e"/></radialGradient>' +
            '<radialGradient id="planeta" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffc078"/><stop offset="1" stop-color="#e8590c"/></radialGradient>' +
            '<pattern id="rejilla" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="none" stroke="#2c3f7a" stroke-width="2"/></pattern>' +
            '<radialGradient id="foco" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#3bdcff" stop-opacity="0.22"/><stop offset="1" stop-color="#3bdcff" stop-opacity="0"/></radialGradient>' +
            "</defs>";
        s += '<rect width="1600" height="900" fill="url(#pared)"/>';
        // paneles de la pared con remaches
        for (var cx = 0; cx < 1600; cx += 200) {
            s += '<rect x="' + (cx + 8) + '" y="150" width="184" height="270" rx="10" fill="#1a2a5e" stroke="#26397a" stroke-width="3"/>';
            s += '<rect x="' + (cx + 8) + '" y="432" width="184" height="300" rx="10" fill="#18275a" stroke="#26397a" stroke-width="3"/>';
            s += remaches([[cx + 22, 164], [cx + 178, 164], [cx + 22, 406], [cx + 178, 406], [cx + 22, 446], [cx + 178, 446]], 3, "#3b4f86");
        }
        s += '<rect width="1600" height="900" fill="url(#rejilla)" opacity="0.25"/>';
        // tubería superior y verticales
        s += '<rect x="0" y="100" width="1600" height="30" fill="url(#tubo)"/>';
        [140, 420, 760, 1100, 1460].forEach(function (x) {
            s += '<rect x="' + (x - 14) + '" y="94" width="28" height="42" rx="4" fill="#6c7fa8" stroke="#1b2550" stroke-width="3"/>';
        });
        s += '<rect x="176" y="130" width="22" height="690" fill="url(#tuboV)"/>';
        s += '<rect x="1402" y="130" width="22" height="690" fill="url(#tuboV)"/>';
        [300, 560].forEach(function (y) {
            s += '<rect x="170" y="' + y + '" width="34" height="18" rx="4" fill="#6c7fa8" stroke="#1b2550" stroke-width="3"/>';
            s += '<rect x="1396" y="' + y + '" width="34" height="18" rx="4" fill="#6c7fa8" stroke="#1b2550" stroke-width="3"/>';
        });
        // ojos de buey con el espacio (izquierda y derecha)
        var ventana = function (x, y, r, planeta) {
            var v = '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 16) + '" fill="#5c6f9c" stroke="#1b2550" stroke-width="5"/>';
            v += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#espacio)" stroke="#1b2550" stroke-width="5"/>';
            var rnd = semilla(x);
            for (var i = 0; i < 22; i++) {
                var a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * (r - 8);
                v += '<circle cx="' + r1(x + Math.cos(a) * d) + '" cy="' + r1(y + Math.sin(a) * d) + '" r="' + r1(0.8 + rnd() * 1.8) + '" fill="#fff" opacity="' + r1(0.4 + rnd() * 0.6) + '"/>';
            }
            if (planeta) {
                v += '<circle cx="' + (x + r * 0.3) + '" cy="' + (y + r * 0.25) + '" r="' + (r * 0.34) + '" fill="url(#planeta)"/>';
                v += '<ellipse cx="' + (x + r * 0.3) + '" cy="' + (y + r * 0.25) + '" rx="' + (r * 0.55) + '" ry="' + (r * 0.12) + '" fill="none" stroke="#ffe066" stroke-width="4" opacity="0.8"/>';
            }
            v += '<path d="M' + (x - r * 0.6) + " " + (y - r * 0.3) + " A " + r * 0.75 + " " + r * 0.75 + " 0 0 1 " + (x - r * 0.1) + " " + (y - r * 0.72) + '" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.35"/>';
            for (var k = 0; k < 8; k++) {
                var aa = k * Math.PI / 4;
                v += '<circle cx="' + r1(x + Math.cos(aa) * (r + 8)) + '" cy="' + r1(y + Math.sin(aa) * (r + 8)) + '" r="3.5" fill="#c3cfe2" stroke="#1b2550" stroke-width="1.5"/>';
            }
            return v;
        };
        s += ventana(92, 270, 66, true) + ventana(1508, 270, 66, false);
        // herramientas colgadas (izquierda)
        s += '<rect x="20" y="420" width="150" height="150" rx="10" fill="#22336e" stroke="#2f4590" stroke-width="3"/>';
        s += '<path d="M56 440 L 56 520" stroke="#adb5bd" stroke-width="12" stroke-linecap="round"/><path d="M44 438 Q 56 424 68 438 L 62 448 L 50 448 Z" fill="#adb5bd" stroke="#1b2550" stroke-width="3"/>';
        s += '<path d="M96 436 L 96 470" stroke="#ced4da" stroke-width="5"/><rect x="88" y="470" width="16" height="56" rx="6" fill="#f03e3e" stroke="#1b2550" stroke-width="3"/>';
        s += '<path d="M134 440 C 150 450, 150 480, 134 492 L 134 540" stroke="#fab005" stroke-width="10" fill="none" stroke-linecap="round"/>';
        // estante con cajas (derecha)
        s += '<rect x="1430" y="470" width="160" height="12" fill="#5c6f9c" stroke="#1b2550" stroke-width="3"/>';
        s += '<rect x="1442" y="424" width="56" height="46" rx="5" fill="#e8590c" stroke="#1b2550" stroke-width="3"/><rect x="1504" y="436" width="40" height="34" rx="5" fill="#2f9e44" stroke="#1b2550" stroke-width="3"/>';
        s += '<rect x="1548" y="404" width="34" height="66" rx="5" fill="#1971c2" stroke="#1b2550" stroke-width="3"/>';
        s += '<path d="M1450 446 L 1490 446 M1450 456 L 1480 456" stroke="#fff" stroke-width="3" opacity="0.5"/>';
        // consolas inferiores con pantallas
        var consola = function (x, w) {
            var c = '<path d="M' + x + " 900 L " + x + " 690 Q " + x + " 670 " + (x + 20) + " 668 L " + (x + w - 20) + " 668 Q " + (x + w) + " 670 " + (x + w) + ' 690 L ' + (x + w) + ' 900 Z" fill="url(#consola)" stroke="#0f1838" stroke-width="5"/>';
            c += '<rect x="' + (x + 16) + '" y="684" width="' + (w - 32) + '" height="74" rx="8" fill="#0b1636" stroke="#3bdcff" stroke-opacity="0.5" stroke-width="3"/>';
            c += '<path d="M' + (x + 26) + " 730 L " + (x + 50) + " 712 L " + (x + 70) + " 738 L " + (x + 96) + " 704 L " + (x + 120) + ' 726" stroke="#3bdcff" stroke-width="3" fill="none" opacity="0.8"/>';
            for (var i = 0; i < 4; i++) {
                var col = ["#ff6b6b", "#ffd43b", "#69db7c", "#4dabf7"][i];
                c += '<rect x="' + (x + 20 + i * ((w - 40) / 4)) + '" y="780" width="' + ((w - 40) / 4 - 10) + '" height="22" rx="6" fill="' + col + '" stroke="#0f1838" stroke-width="3"/>';
            }
            c += '<circle cx="' + (x + 40) + '" cy="836" r="14" fill="#495057" stroke="#0f1838" stroke-width="3"/><path d="M' + (x + 40) + " 836 L " + (x + 48) + ' 826" stroke="#ffd43b" stroke-width="4" stroke-linecap="round"/>';
            c += '<circle cx="' + (x + w - 40) + '" cy="836" r="14" fill="#495057" stroke="#0f1838" stroke-width="3"/><path d="M' + (x + w - 40) + " 836 L " + (x + w - 50) + ' 828" stroke="#69db7c" stroke-width="4" stroke-linecap="round"/>';
            return c;
        };
        s += consola(0, 190) + consola(1410, 190);
        // suelo metálico con franjas de seguridad
        s += '<rect x="0" y="818" width="1600" height="82" fill="url(#suelo)"/>';
        for (var fx = 190; fx < 1410; fx += 34) {
            s += '<path d="M' + fx + " 818 L " + (fx + 16) + " 818 L " + (fx + 4) + " 830 L " + (fx - 12) + ' 830 Z" fill="#fcc419" opacity="0.55"/>';
        }
        s += '<rect x="0" y="830" width="1600" height="4" fill="#0f1838" opacity="0.6"/>';
        for (var px = 100; px < 1600; px += 200) s += '<line x1="' + px + '" y1="834" x2="' + (px - 40) + '" y2="900" stroke="#0f1838" stroke-width="3" opacity="0.5"/>';
        // proyector del holograma, bajo el plano
        s += '<ellipse cx="978" cy="852" rx="300" ry="26" fill="url(#foco)"/>';
        return svg(1600, 900, s);
    }

    /** Bandeja de piezas: caja metálica de taller (340 × 706). */
    function bandeja() {
        var w = 340, h = 706;
        var s = "<defs>" +
            '<linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#40538e"/><stop offset="1" stop-color="#1e2a5a"/></linearGradient>' +
            '<linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1a3e"/><stop offset="1" stop-color="#16244f"/></linearGradient>' +
            "</defs>";
        s += '<rect x="6" y="10" width="' + (w - 12) + '" height="' + (h - 14) + '" rx="26" fill="#070d22" opacity="0.5"/>';
        s += '<rect x="4" y="4" width="' + (w - 8) + '" height="' + (h - 12) + '" rx="26" fill="url(#gb)" stroke="#0b1330" stroke-width="6"/>';
        s += '<rect x="22" y="70" width="' + (w - 44) + '" height="' + (h - 96) + '" rx="18" fill="url(#gi)" stroke="#5c7cfa" stroke-opacity="0.55" stroke-width="3"/>';
        // cabecera
        s += '<rect x="34" y="14" width="' + (w - 68) + '" height="48" rx="14" fill="#0b1330" stroke="#ffd43b" stroke-width="3"/>';
        s += remaches([[18, 18], [w - 18, 18], [18, h - 26], [w - 18, h - 26]], 4, "#adb5bd");
        // luces de estado del costado
        return svg(w, h, s);
    }

    /** Plataforma de cada hueco de la bandeja (donde reposa una pieza). */
    function plataforma() {
        return svg(160, 60, '<defs><radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#3bdcff" stop-opacity="0.55"/><stop offset="1" stop-color="#3bdcff" stop-opacity="0"/></radialGradient></defs>' +
            '<ellipse cx="80" cy="34" rx="74" ry="22" fill="#0b1330" stroke="#4dabf7" stroke-width="4"/>' +
            '<ellipse cx="80" cy="30" rx="62" ry="15" fill="url(#g)"/>' +
            '<ellipse cx="80" cy="34" rx="74" ry="22" fill="none" stroke="#a5d8ff" stroke-width="2" stroke-dasharray="6 8" opacity="0.6"/>');
    }

    /** Etiqueta del nombre de la pieza en la bandeja. */
    function etiqueta() {
        return svg(160, 36, '<rect x="2" y="2" width="156" height="32" rx="16" fill="#0b1330" stroke="#ffd43b" stroke-width="3"/>');
    }

    /** Plano holográfico (764 × 704): rejilla cian dentro de un marco de neón. */
    function plano() {
        var w = 764, h = 704;
        var s = "<defs>" +
            '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2a5c"/><stop offset="1" stop-color="#081b40"/></linearGradient>' +
            '<pattern id="fina" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0 L 0 0 0 24" fill="none" stroke="#3bdcff" stroke-opacity="0.13" stroke-width="1.5"/></pattern>' +
            '<pattern id="gruesa" width="96" height="96" patternUnits="userSpaceOnUse"><path d="M96 0 L 0 0 0 96" fill="none" stroke="#3bdcff" stroke-opacity="0.26" stroke-width="2.5"/></pattern>' +
            '<filter id="fb" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="8"/></filter>' +
            "</defs>";
        s += '<rect x="14" y="14" width="' + (w - 28) + '" height="' + (h - 28) + '" rx="30" fill="none" stroke="#3bdcff" stroke-width="18" opacity="0.5" filter="url(#fb)"/>';
        s += '<rect x="14" y="14" width="' + (w - 28) + '" height="' + (h - 28) + '" rx="30" fill="url(#g)" opacity="0.94"/>';
        s += '<rect x="14" y="14" width="' + (w - 28) + '" height="' + (h - 28) + '" rx="30" fill="url(#fina)"/>';
        s += '<rect x="14" y="14" width="' + (w - 28) + '" height="' + (h - 28) + '" rx="30" fill="url(#gruesa)"/>';
        s += '<rect x="14" y="14" width="' + (w - 28) + '" height="' + (h - 28) + '" rx="30" fill="none" stroke="#7ff3ff" stroke-width="5"/>';
        // esquinas reforzadas
        var esquina = function (x, y, sx, sy) {
            return '<path d="M' + x + " " + (y + sy * 56) + " L " + x + " " + y + " L " + (x + sx * 56) + " " + y + '" stroke="#e3fafc" stroke-width="8" fill="none" stroke-linecap="round"/>';
        };
        s += esquina(30, 30, 1, 1) + esquina(w - 30, 30, -1, 1) + esquina(30, h - 30, 1, -1) + esquina(w - 30, h - 30, -1, -1);
        // regla de medidas abajo
        for (var i = 0; i <= 20; i++) {
            var x = 90 + i * ((w - 180) / 20);
            s += '<line x1="' + r1(x) + '" y1="' + (h - 44) + '" x2="' + r1(x) + '" y2="' + (h - (i % 5 ? 52 : 60)) + '" stroke="#7ff3ff" stroke-width="2" opacity="0.6"/>';
        }
        return svg(w, h, s);
    }

    /** Consola del progreso (520 × 86). */
    function consolaProgreso() {
        var w = 520, h = 86;
        return svg(w, h, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#40538e"/><stop offset="1" stop-color="#18244f"/></linearGradient></defs>' +
            '<path d="M24 4 L ' + (w - 24) + ' 4 L ' + (w - 4) + ' ' + (h - 6) + ' L 4 ' + (h - 6) + ' Z" fill="url(#g)" stroke="#0b1330" stroke-width="5" stroke-linejoin="round"/>' +
            '<rect x="30" y="14" width="' + (w - 60) + '" height="' + (h - 32) + '" rx="12" fill="#0b1330" stroke="#3bdcff" stroke-opacity="0.6" stroke-width="3"/>' +
            remaches([[16, h - 14], [w - 16, h - 14]], 3.5, "#adb5bd"));
    }

    /** Cerrojo magnético que se cierra sobre una pieza al encajar. */
    function cerrojo() {
        return svg(60, 60, '<path d="M8 22 L 8 8 L 22 8" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="8" cy="8" r="6" fill="#fff"/>');
    }

    /** Llama del propulsor (blanca: se tiñe). */
    function llama() {
        return svg(120, 220, '<defs><radialGradient id="g" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<path d="M14 0 L 106 0 C 112 60, 86 120, 60 216 C 34 120, 8 60, 14 0 Z" fill="url(#g)"/>');
    }

    /** Barrido del escáner holográfico (franja horizontal blanca). */
    function barrido() {
        return svg(700, 80, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
            '<rect width="700" height="80" fill="url(#g)"/>');
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

    function confeti() {
        return svg(16, 24, '<rect x="1" y="1" width="14" height="22" rx="3" fill="#fff"/>');
    }

    function tuerca() {
        return svg(40, 40, '<path d="M20 2 L 36 11 L 36 29 L 20 38 L 4 29 L 4 11 Z" fill="#fff" stroke="#868e96" stroke-width="3"/><circle cx="20" cy="20" r="7" fill="#868e96"/>');
    }

    function sombra() {
        return svg(160, 40, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000814" stop-opacity="0.6"/><stop offset="1" stop-color="#000814" stop-opacity="0"/></radialGradient></defs><ellipse cx="80" cy="20" rx="80" ry="20" fill="url(#g)"/>');
    }

    // ------------------------------------------------------------------ rasterizado (una vez)

    // [clave, svg, resolución]: lo que se agranda o se ve de cerca va a 2×, el fondo a 1×.
    function lista() {
        var l = [
            ["taller", taller(), 1],
            ["bandeja", bandeja(), 1.3],
            ["plataforma", plataforma(), 1.5],
            ["etiqueta", etiqueta(), 2],
            ["plano", plano(), 1.2],
            ["consola", consolaProgreso(), 1.5],
            ["cerrojo", cerrojo(), 1.5],
            ["llama", llama(), 1],
            ["barrido", barrido(), 0.6],
            ["estrella", estrella(), 1.5],
            ["destello", destello(), 1.5],
            ["chispa", chispa(), 1.5],
            ["luz", luz(), 1],
            ["anillo", anillo(), 1.2],
            ["confeti", confeti(), 1.5],
            ["tuerca", tuerca(), 1.5],
            ["sombra", sombra(), 1.2]
        ];
        Object.keys(CASCOS).forEach(function (n) {
            l.push(["holo-" + n, holograma(n), 1.15]);
            l.push(["casco-" + n, casco(n), 1.15]);
        });
        Object.keys(PIEZAS).forEach(function (id) {
            l.push(["pieza-" + id, pieza(id), 2]);
            l.push(["silueta-" + id, piezaSilueta(id), 1]);
            l.push(["molde-" + id, molde(id), 1.6]);
            l.push(["brillo-" + id, brillo(id), 1]);
            l.push(["borde-" + id, borde(id), 1.6]);
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
                console.warn("[DibujosNave] no se pudo dibujar", clave);
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

    global.DibujosNave = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        tipos: Object.keys(PIEZAS),
        naves: Object.keys(CASCOS),
        PIEZA: PIEZA,
        MOLDE: MOLDE,
        CASCO: CASCO,
        tinte: function (id) { return PIEZAS[id] ? PIEZAS[id].tinte : 0xffffff; },
        radioToque: function (id) { return PIEZAS[id] ? PIEZAS[id].r : 70; },
        tamano: function (id) { return PIEZAS[id] ? { w: PIEZAS[id].w, h: PIEZAS[id].h } : { w: 130, h: 130 }; },
        luces: function (nave) { return CASCOS[nave] ? CASCOS[nave].luces : []; },
        svgPieza: pieza,
        svgMolde: molde,
        svgCasco: casco,
        svgHolograma: holograma,
        svgTaller: taller,
        _mover: mover
    };
})(typeof window !== "undefined" ? window : global);
