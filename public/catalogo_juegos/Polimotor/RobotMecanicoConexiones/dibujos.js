/**
 * DibujosRobot — dibujos SVG propios de "El Robot Mecánico y sus Conexiones" (window.DibujosRobot).
 *
 * Todo se dibuja aquí: el laboratorio (pared con ventanas, paisaje, piso, estanterías, prensa),
 * sus máquinas (engranajes, cinta, lámparas, tubos), la consola, los botones de herramientas, el
 * torso del robot, las once piezas (con la variante sorteada: color, cabeza, visera, manos, pies,
 * antena, módulo) y sus siluetas. preparar(variante) rasteriza cada SVG a <canvas> una sola vez y
 * la escena los convierte en texturas de Phaser.
 *
 * Geometría: cada pieza se dibuja con su centro visual en el centro del lienzo y una junta (jx, jy)
 * — el punto donde se conecta a su pieza madre —. El robot ubica cada pieza por esa junta.
 */
(function (global) {
    "use strict";

    var cache = {};
    var resoluciones = {};
    var listo = null;
    var LINEA = "#14213d";

    // ------------------------------------------------------------------ geometría del robot

    /**
     * Piezas del lado izquierdo y centrales. w × h: lienzo; jx, jy: junta respecto del centro;
     * ancla: junta en coordenadas del robot (centro del torso = 0,0) si cuelga del torso;
     * padre: pieza a la que se conecta; hijo: junta de su pieza hija respecto de su centro.
     */
    var BASE = {
        "brazo-izq": { tipo: "brazo", w: 90, h: 180, jx: 18, jy: -72, ancla: { x: -100, y: -72 }, hijo: { x: -6, y: 80 } },
        "mano-izq": { tipo: "mano", w: 84, h: 84, jx: 0, jy: -34, padre: "brazo-izq" },
        "pierna-izq": { tipo: "pierna", w: 86, h: 180, jx: 0, jy: -78, ancla: { x: -52, y: 104 }, hijo: { x: 0, y: 80 } },
        "pie-izq": { tipo: "pie", w: 128, h: 70, jx: 18, jy: -22, padre: "pierna-izq" },
        "cabeza": { tipo: "cabeza", w: 190, h: 160, jx: 0, jy: 70, ancla: { x: 0, y: -112 }, hijo: { x: 0, y: -72 } },
        "antena": { tipo: "antena", w: 80, h: 110, jx: 0, jy: 50, padre: "cabeza" },
        "modulo": { tipo: "modulo", w: 100, h: 100, jx: 0, jy: 0, ancla: { x: 0, y: 38 } }
    };
    var TORSO = { w: 220, h: 240 };
    /** Ranura (forma de la pestaña) de cada tipo de pieza. */
    var SOCKET = { brazo: "circulo", mano: "circulo", pierna: "cuadrado", pie: "cuadrado", cabeza: "hex", antena: "tri", modulo: "modulo" };

    function espejo(id) { return id.replace("-izq", "-der"); }

    var GEOM = (function () {
        var g = {};
        Object.keys(BASE).forEach(function (id) {
            var b = BASE[id];
            g[id] = clonar(b);
            g[id].lado = /-izq$/.test(id) ? "izq" : null;
            if (/-izq$/.test(id)) {
                var d = clonar(b);
                d.jx = -b.jx;
                if (b.ancla) d.ancla = { x: -b.ancla.x, y: b.ancla.y };
                if (b.hijo) d.hijo = { x: -b.hijo.x, y: b.hijo.y };
                if (b.padre) d.padre = espejo(b.padre);
                d.lado = "der";
                g[espejo(id)] = d;
            }
        });
        return g;
    })();

    function clonar(o) { return JSON.parse(JSON.stringify(o)); }

    /** Junta de la pieza en coordenadas del robot. */
    function junta(id) {
        var p = GEOM[id];
        if (!p) return { x: 0, y: 0 };
        if (p.ancla) return { x: p.ancla.x, y: p.ancla.y };
        var c = centro(p.padre);
        var h = GEOM[p.padre].hijo;
        return { x: c.x + h.x, y: c.y + h.y };
    }

    /** Centro visual de la pieza encajada, en coordenadas del robot. */
    function centro(id) {
        var p = GEOM[id];
        var j = junta(id);
        return { x: j.x - p.jx, y: j.y - p.jy };
    }

    // ------------------------------------------------------------------ utilidades SVG

    function svg(w, h, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + cuerpo + "</svg>";
    }

    function linea(x1, y1, x2, y2, ancho, color, op) {
        return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="' + ancho + '" stroke-linecap="round"' + (op != null ? ' opacity="' + op + '"' : "") + "/>";
    }

    /** Trazo grueso con contorno: primero el borde oscuro y encima el color. */
    function hueso(x1, y1, x2, y2, ancho, color) {
        return linea(x1, y1, x2, y2, ancho + 9, LINEA) + linea(x1, y1, x2, y2, ancho, color);
    }

    function circulo(cx, cy, r, fill, stroke, sw, extra) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 4) + '"' : "") + (extra || "") + "/>";
    }

    function rect(x, y, w, h, rx, fill, stroke, sw, extra) {
        return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 4) + '"' : "") + (extra || "") + "/>";
    }

    function path(d, fill, stroke, sw, extra) {
        return '<path d="' + d + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 4) + '" stroke-linejoin="round" stroke-linecap="round"' : "") + (extra || "") + "/>";
    }

    function hex(cx, cy, r) {
        var p = [];
        for (var i = 0; i < 6; i++) {
            var a = Math.PI / 6 + i * Math.PI / 3;
            p.push((cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1));
        }
        return "M" + p.join(" L") + " Z";
    }

    function semilla(s) {
        return function () {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function aclarar(hex6, k) {
        var n = parseInt(hex6.slice(1), 16);
        var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        var f = function (c) { return Math.round(c + (255 - c) * k); };
        return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
    }

    // ------------------------------------------------------------------ paleta de la variante

    var variante = null;

    function paleta(silueta) {
        if (silueta) {
            return { cuerpo: "#fff", oscuro: "#fff", acento: "#fff", art: "#fff", linea: "#fff", metal: "#fff", metalOsc: "#fff", visor: "#fff", ojo: "#fff", claro: "#fff", brillo: "#fff", sil: true };
        }
        var c = (variante && variante.color) || {};
        return {
            cuerpo: c.cuerpo || "#4dabf7",
            oscuro: c.oscuro || "#1c6fb8",
            acento: c.acento || "#ffd43b",
            art: c.articulacion || "#ffa94d",
            linea: LINEA,
            metal: "#ced4da",
            metalOsc: "#868e96",
            visor: "#10223f",
            ojo: "#7ff3ff",
            claro: aclarar(c.cuerpo || "#4dabf7", 0.35),
            brillo: "#ffffff",
            sil: false
        };
    }

    function brillo(P, d) {
        return P.sil ? "" : d;
    }

    // ------------------------------------------------------------------ piezas (lado izquierdo; el derecho es su reflejo)

    function brazo(P) {
        return hueso(63, 24, 48, 94, 26, P.cuerpo) +
            brillo(P, linea(58, 32, 49, 84, 6, P.brillo, 0.4)) +
            hueso(46, 100, 40, 158, 28, P.cuerpo) +
            linea(45, 118, 43, 136, 28, P.acento) +
            brillo(P, linea(38, 106, 34, 150, 5, P.brillo, 0.35)) +
            circulo(46, 97, 16, P.art, P.linea, 4) +
            brillo(P, circulo(42, 92, 5, P.brillo, null, 0, ' opacity="0.6"')) +
            rect(26, 156, 28, 18, 6, P.metal, P.linea, 4) +
            circulo(63, 20, 18, P.art, P.linea, 4) +
            circulo(63, 20, 8, P.acento, P.linea, 3);
    }

    function mano(P) {
        var forma = (variante && variante.mano) || "pinza";
        var s = rect(30, 2, 24, 14, 5, P.metal, P.linea, 4) + circulo(42, 9, 4, P.acento, P.linea, 2);
        if (forma === "guante") {
            s += path("M 26 22 Q 42 14 60 22 Q 70 40 66 62 Q 60 80 42 80 Q 24 80 22 62 Q 18 40 26 22 Z", P.cuerpo, P.linea, 5);
            s += circulo(16, 44, 11, P.cuerpo, P.linea, 5);
            s += brillo(P, path("M 32 28 Q 42 24 52 28", "none", P.brillo, 5, ' opacity="0.45"'));
            s += linea(36, 58, 36, 72, 4, P.linea, 0.5) + linea(46, 58, 46, 74, 4, P.linea, 0.5) + linea(56, 56, 56, 70, 4, P.linea, 0.5);
            s += rect(26, 16, 34, 10, 4, P.acento, P.linea, 3);
        } else {
            // pinza: pulgar grande hacia afuera (izquierda) y dedo corto hacia adentro
            s += linea(32, 42, 14, 60, 18, P.linea) + linea(14, 60, 24, 78, 18, P.linea);
            s += linea(32, 42, 14, 60, 10, P.art) + linea(14, 60, 24, 78, 10, P.art);
            s += linea(52, 42, 62, 60, 16, P.linea) + linea(62, 60, 54, 74, 16, P.linea);
            s += linea(52, 42, 62, 60, 8, P.art) + linea(62, 60, 54, 74, 8, P.art);
            s += circulo(42, 34, 19, P.cuerpo, P.linea, 5);
            s += circulo(42, 34, 7, P.acento, P.linea, 3);
            s += brillo(P, circulo(36, 28, 4, P.brillo, null, 0, ' opacity="0.6"'));
        }
        return s;
    }

    function pierna(P) {
        return rect(28, 2, 30, 24, 5, P.art, P.linea, 4) +
            rect(37, 8, 12, 12, 2, P.acento, P.linea, 3) +
            hueso(43, 30, 43, 86, 30, P.cuerpo) +
            linea(18, 36, 20, 82, 6, P.metalOsc) + circulo(18, 36, 5, P.metal, P.linea, 2) + circulo(20, 82, 5, P.metal, P.linea, 2) +
            brillo(P, linea(52, 36, 52, 80, 5, P.brillo, 0.35)) +
            hueso(43, 104, 43, 156, 34, P.cuerpo) +
            linea(43, 140, 43, 150, 34, P.acento) +
            circulo(27, 122, 6, P.acento, P.linea, 2) +
            brillo(P, linea(54, 108, 54, 134, 5, P.brillo, 0.35)) +
            circulo(43, 95, 17, P.art, P.linea, 4) +
            rect(30, 158, 26, 16, 5, P.metal, P.linea, 4);
    }

    function pie(P) {
        var forma = (variante && variante.pie) || "bota";
        var s = rect(70, 2, 24, 16, 5, P.metal, P.linea, 4) + rect(76, 6, 12, 8, 2, P.acento, P.linea, 2);
        if (forma === "rueda") {
            s += path("M 112 18 Q 120 18 120 28 L 120 46 L 18 46 Q 8 46 8 38 Q 8 22 30 20 Z", P.cuerpo, P.linea, 5);
            s += rect(20, 26, 30, 10, 5, P.acento, P.linea, 3);
            s += circulo(32, 54, 13, P.metalOsc, P.linea, 4) + circulo(32, 54, 5, P.metal, P.linea, 2);
            s += circulo(98, 54, 13, P.metalOsc, P.linea, 4) + circulo(98, 54, 5, P.metal, P.linea, 2);
            s += brillo(P, path("M 40 24 L 100 22", "none", P.brillo, 5, ' opacity="0.4"'));
        } else {
            s += path("M 112 18 Q 120 18 120 28 L 120 54 Q 120 60 114 60 L 16 60 Q 6 60 6 50 Q 6 32 30 30 L 68 28 L 72 18 Z", P.cuerpo, P.linea, 5);
            s += path("M 6 50 Q 6 32 30 30 L 34 30 Q 26 44 30 60 L 16 60 Q 6 60 6 50 Z", P.acento, P.linea, 4);
            s += rect(8, 56, 112, 10, 5, P.oscuro, P.linea, 4);
            s += brillo(P, path("M 44 36 L 104 26", "none", P.brillo, 5, ' opacity="0.4"'));
        }
        return s;
    }

    /** Posiciones de los ojos (respecto del centro de la cabeza) según la visera. */
    function ojosDe(visera) {
        if (visera === "explorador") return [{ x: -27, y: -3, r: 13 }, { x: 27, y: -3, r: 13 }];
        if (visera === "ojos") return [{ x: -29, y: -10, r: 13 }, { x: 29, y: -10, r: 13 }];
        if (visera === "ancha") return [{ x: -22, y: -8, r: 12 }, { x: 22, y: -8, r: 12 }];
        return [{ x: -25, y: -8, r: 11 }, { x: 25, y: -8, r: 11 }];
    }

    function cabeza(P) {
        var forma = (variante && variante.cabeza) || "redonda";
        var visera = (variante && variante.visera) || "banda";
        var s = path(hex(95, 146, 14), P.metal, P.linea, 4) + path(hex(95, 146, 6), P.acento, P.linea, 2);
        // orejas atornilladas
        s += rect(2, 62, 20, 36, 8, P.art, P.linea, 4) + rect(168, 62, 20, 36, 8, P.art, P.linea, 4);
        // cresta superior (marca dónde es arriba)
        s += path("M 80 18 Q 95 -2 110 18 Z", P.acento, P.linea, 4);
        if (forma === "cuadrada") s += rect(14, 14, 162, 122, 22, P.cuerpo, P.linea, 6);
        else if (forma === "capsula") s += rect(10, 22, 170, 112, 56, P.cuerpo, P.linea, 6);
        else s += rect(16, 12, 158, 126, 54, P.cuerpo, P.linea, 6);
        s += brillo(P, path("M 44 30 Q 70 20 100 22", "none", P.brillo, 8, ' opacity="0.45"'));
        var o = ojosDe(visera);
        if (visera === "ojos") {
            s += circulo(95 + o[0].x, 80 + o[0].y, 24, P.visor, P.linea, 5) + circulo(95 + o[1].x, 80 + o[1].y, 24, P.visor, P.linea, 5);
            s += path("M 89 70 L 101 70", "none", P.linea, 6);
        } else if (visera === "ancha") {
            s += rect(26, 44, 138, 56, 28, P.visor, P.linea, 5);
        } else {
            s += rect(36, 50, 118, 46, 22, P.visor, P.linea, 5);
        }
        o.forEach(function (e) {
            s += circulo(95 + e.x, 80 + e.y, e.r, P.sil ? "#fff" : "#2b4a7a");
            s += brillo(P, circulo(95 + e.x - e.r * 0.35, 80 + e.y - e.r * 0.35, e.r * 0.3, "#9fd7ff"));
        });
        s += brillo(P, path("M 46 56 Q 70 50 96 52", "none", "#ffffff", 4, ' opacity="0.25"'));
        // boca de rejilla
        s += rect(70, 108, 50, 16, 7, P.metalOsc, P.linea, 4);
        s += linea(82, 111, 82, 121, 3, P.linea, 0.6) + linea(95, 111, 95, 121, 3, P.linea, 0.6) + linea(108, 111, 108, 121, 3, P.linea, 0.6);
        return s;
    }

    /** Punta de la antena respecto de su centro (de ahí salen las señales). */
    function puntaAntena(tipo) {
        if (tipo === "radar") return { x: 6, y: -31 };
        if (tipo === "doble") return { x: 16, y: -28 };
        if (tipo === "rayo") return { x: 0, y: -44 };
        return { x: 0, y: -31 };
    }

    function antena(P) {
        var forma = (variante && variante.antena) || "bola";
        var s = "";
        if (forma === "doble") {
            s += hueso(36, 94, 22, 34, 5, P.metal) + hueso(44, 94, 56, 30, 5, P.metal);
            s += circulo(22, 30, 11, P.art, P.linea, 4) + circulo(56, 27, 15, P.acento, P.linea, 4);
            s += brillo(P, circulo(51, 22, 4, P.brillo, null, 0, ' opacity="0.7"'));
        } else if (forma === "rayo") {
            s += hueso(40, 96, 40, 62, 6, P.metal);
            s += path("M 46 8 L 22 44 L 38 44 L 30 70 L 58 34 L 42 34 Z", P.acento, P.linea, 4);
        } else {
            s += hueso(40, 96, 40, 34, 6, P.metal);
            s += circulo(40, 24, 17, P.acento, P.linea, 4);
            s += brillo(P, circulo(34, 18, 5, P.brillo, null, 0, ' opacity="0.7"'));
        }
        s += rect(26, 90, 28, 16, 5, P.art, P.linea, 4);
        s += path("M 33 103 L 47 103 L 40 93 Z", P.acento, P.linea, 2);
        return s;
    }

    function modulo(P) {
        var forma = (variante && variante.modulo) || "rayo";
        var s = circulo(50, 50, 44, P.metal, P.linea, 5);
        s += circulo(50, 50, 34, P.visor, P.linea, 3);
        // tornillos del aro (marcan arriba con uno de color)
        s += circulo(50, 9, 5, P.acento, P.linea, 2) + circulo(14, 66, 4, P.metalOsc) + circulo(86, 66, 4, P.metalOsc);
        var icono = P.sil ? "#fff" : P.acento;
        if (forma === "corazon") s += path("M 50 76 C 22 58 22 34 36 30 C 44 28 48 34 50 38 C 52 34 56 28 64 30 C 78 34 78 58 50 76 Z", icono, P.linea, 3);
        else if (forma === "gota") s += path("M 50 18 C 62 36 72 46 72 60 A 22 22 0 0 1 28 60 C 28 46 38 36 50 18 Z", icono, P.linea, 3);
        else s += path("M 56 18 L 32 54 L 48 54 L 42 82 L 68 44 L 52 44 Z", icono, P.linea, 3);
        s += brillo(P, path("M 26 36 Q 34 22 50 18", "none", "#ffffff", 4, ' opacity="0.35"'));
        return s;
    }


    // ------------------------------------------------------------------ tipo "explorador": otras piezas, mismas juntas y ranuras

    function esExplorador() { return !!(variante && variante.tipo === "explorador"); }

    /** Brazo articulado de esferas que se curva hacia afuera; hombro de engranaje. */
    function brazoX(P) {
        var s = linea(62, 26, 50, 64, 10, P.linea) + linea(50, 64, 43, 104, 10, P.linea) + linea(43, 104, 40, 150, 10, P.linea);
        s += linea(62, 26, 50, 64, 4, P.metal) + linea(50, 64, 43, 104, 4, P.metal) + linea(43, 104, 40, 150, 4, P.metal);
        [[58, 42, 14], [50, 66, 15], [45, 90, 15], [42, 114, 15], [40, 138, 14]].forEach(function (b, i) {
            s += circulo(b[0], b[1], b[2], i % 2 ? P.oscuro : P.cuerpo, P.linea, 4);
            s += brillo(P, circulo(b[0] - 4, b[1] - 4, 4, P.brillo, null, 0, ' opacity="0.55"'));
        });
        s += rect(24, 152, 32, 22, 8, P.acento, P.linea, 4);
        s += path(hex(63, 20, 20), P.art, P.linea, 4) + circulo(63, 20, 8, P.acento, P.linea, 3);
        return s;
    }

    /** Garra de tres dedos (el pulgar largo apunta hacia afuera). */
    function manoX(P) {
        var s = rect(30, 2, 24, 14, 5, P.metal, P.linea, 4) + circulo(42, 9, 4, P.acento, P.linea, 2);
        [[42, 34, 12, 68, 16], [42, 34, 40, 80, 13], [42, 34, 66, 66, 12]].forEach(function (d) {
            s += linea(d[0], d[1], d[2], d[3], d[4] + 8, P.linea) + linea(d[0], d[1], d[2], d[3], d[4], P.metal);
            s += circulo(d[2], d[3], d[4] / 2 + 3, P.acento, P.linea, 3);
        });
        s += path(hex(42, 32, 20), P.cuerpo, P.linea, 5) + circulo(42, 32, 7, P.art, P.linea, 3);
        s += brillo(P, circulo(36, 26, 4, P.brillo, null, 0, ' opacity="0.6"'));
        return s;
    }

    /** Pierna de pistón con resorte; luz en el lado de afuera. */
    function piernaX(P) {
        var s = rect(28, 2, 30, 24, 5, P.art, P.linea, 4) + rect(37, 8, 12, 12, 2, P.acento, P.linea, 3);
        s += rect(26, 24, 34, 54, 12, P.cuerpo, P.linea, 5);
        s += brillo(P, linea(52, 32, 52, 70, 5, P.brillo, 0.35));
        s += linea(43, 78, 43, 122, 8, P.linea) + linea(43, 78, 43, 122, 4, P.metal);
        var z = "M 30 82";
        for (var k = 0; k < 6; k++) z += " L " + (k % 2 ? 30 : 56) + " " + (88 + k * 6);
        s += path(z, "none", P.linea, 7) + path(z, "none", P.acento, 3.5);
        s += rect(24, 120, 38, 40, 12, P.cuerpo, P.linea, 5) + rect(24, 136, 38, 9, 3, P.oscuro, P.linea, 3);
        s += circulo(18, 46, 6, P.acento, P.linea, 2);
        s += rect(30, 158, 26, 16, 5, P.metal, P.linea, 4);
        return s;
    }

    /** Oruga con ruedas y un faro en la punta (hacia afuera). */
    function pieX(P) {
        var s = rect(70, 2, 24, 16, 5, P.metal, P.linea, 4) + rect(76, 6, 12, 8, 2, P.acento, P.linea, 2);
        s += path("M 30 20 L 116 20 Q 122 20 122 28 L 122 32 L 18 32 Q 18 20 30 20 Z", P.cuerpo, P.linea, 4);
        s += rect(6, 28, 116, 36, 18, P.oscuro, P.linea, 5);
        [26, 64, 102].forEach(function (x) { s += circulo(x, 46, 11, P.metal, P.linea, 3) + circulo(x, 46, 4, P.linea); });
        for (var x = 16; x < 116; x += 12) s += linea(x, 30, x, 33, 3, P.linea, 0.6);
        s += circulo(12, 26, 8, P.acento, P.linea, 3);
        return s;
    }

    /** Casco de astronauta con visor grande y luz arriba. */
    function cabezaX(P) {
        var s = path(hex(95, 146, 14), P.metal, P.linea, 4) + path(hex(95, 146, 6), P.acento, P.linea, 2);
        s += rect(0, 66, 22, 40, 10, P.oscuro, P.linea, 4) + rect(168, 66, 22, 40, 10, P.oscuro, P.linea, 4);
        s += linea(10, 66, 10, 40, 5, P.linea) + circulo(10, 38, 6, P.acento, P.linea, 3);
        s += circulo(95, 14, 11, P.acento, P.linea, 4);
        s += path("M 18 136 L 18 86 A 77 70 0 0 1 172 86 L 172 136 Z", P.cuerpo, P.linea, 6);
        s += rect(18, 118, 154, 18, 6, P.oscuro, P.linea, 4);
        s += rect(32, 44, 126, 66, 33, P.visor, P.linea, 5);
        s += brillo(P, path("M 46 60 Q 62 50 86 50", "none", "#ffffff", 6, ' opacity="0.3"'));
        ojosDe("explorador").forEach(function (e) {
            s += circulo(95 + e.x, 80 + e.y, e.r, P.sil ? "#fff" : "#2b4a7a");
            s += brillo(P, circulo(95 + e.x - e.r * 0.35, 80 + e.y - e.r * 0.35, e.r * 0.3, "#9fd7ff"));
        });
        s += brillo(P, path("M 40 30 Q 70 18 100 20", "none", P.brillo, 7, ' opacity="0.4"'));
        return s;
    }

    /** Antena de radar: plato parabólico sobre un mástil. */
    function antenaX(P) {
        var s = hueso(40, 96, 40, 52, 6, P.metal);
        s += path("M 10 36 Q 34 74 70 30 Q 40 46 10 36 Z", P.acento, P.linea, 4);
        s += linea(40, 46, 46, 26, 4, P.linea) + circulo(46, 24, 7, P.art, P.linea, 3);
        s += rect(26, 90, 28, 16, 5, P.art, P.linea, 4);
        s += path("M 33 103 L 47 103 L 40 93 Z", P.acento, P.linea, 2);
        return s;
    }

    /** Batería hexagonal con el símbolo del módulo (rayo, corazón o gota). */
    function moduloX(P) {
        var s = path(hex(50, 50, 46), P.metal, P.linea, 5) + path(hex(50, 50, 34), P.visor, P.linea, 3);
        s += rect(42, 2, 16, 10, 3, P.acento, P.linea, 2);
        var icono = P.sil ? "#fff" : P.acento;
        var forma = (variante && variante.modulo) || "rayo";
        if (forma === "corazon") s += path("M 50 74 C 24 58 24 36 37 32 C 44 30 48 35 50 39 C 52 35 56 30 63 32 C 76 36 76 58 50 74 Z", icono, P.linea, 3);
        else if (forma === "gota") s += path("M 50 20 C 61 36 70 46 70 59 A 20 20 0 0 1 30 59 C 30 46 39 36 50 20 Z", icono, P.linea, 3);
        else s += path("M 56 20 L 33 54 L 48 54 L 42 80 L 67 45 L 52 45 Z", icono, P.linea, 3);
        return s;
    }

    function torsoX() {
        var P = paleta(false);
        var s = rect(92, 0, 36, 20, 6, P.metal, P.linea, 4);
        s += rect(36, 212, 40, 24, 6, P.metal, P.linea, 4) + rect(144, 212, 40, 24, 6, P.metal, P.linea, 4);
        s += rect(16, 10, 188, 218, 60, P.cuerpo, P.linea, 6);
        s += rect(16, 114, 188, 20, 4, P.oscuro, P.linea, 4);
        [40, 80, 140, 180].forEach(function (x) { s += circulo(x, 124, 4, P.metal, P.linea, 2); });
        [[30, 150], [30, 166], [30, 182], [190, 150], [190, 166], [190, 182]].forEach(function (p) { s += linea(p[0] - 8, p[1], p[0] + 8, p[1], 4, P.linea, 0.5); });
        s += path("M 46 30 Q 90 14 140 20", "none", "#ffffff", 9, ' opacity="0.35"');
        s += circulo(12, 48, 22, P.oscuro, P.linea, 4) + circulo(208, 48, 22, P.oscuro, P.linea, 4);
        s += rect(58, 50, 104, 62, 18, P.visor, P.linea, 5);
        s += path(hex(110, 158, 52), P.oscuro, P.linea, 5);
        s += circulo(110, 158, 37, "#0b1830", P.linea, 3);
        return svg(TORSO.w, TORSO.h, s);
    }

    var DIBUJO = { brazo: brazo, mano: mano, pierna: pierna, pie: pie, cabeza: cabeza, antena: antena, modulo: modulo };
    var DIBUJO_X = { brazo: brazoX, mano: manoX, pierna: piernaX, pie: pieX, cabeza: cabezaX, antena: antenaX, modulo: moduloX };

    function piezaSVG(id, silueta) {
        var g = GEOM[id];
        var P = paleta(silueta);
        var base = /-der$/.test(id) ? id.replace("-der", "-izq") : id;
        var b = GEOM[base];
        var cuerpo = (esExplorador() ? DIBUJO_X : DIBUJO)[b.tipo](P);
        if (/-der$/.test(id)) cuerpo = '<g transform="translate(' + g.w + ',0) scale(-1,1)">' + cuerpo + "</g>";
        return svg(g.w, g.h, cuerpo);
    }

    // ------------------------------------------------------------------ torso

    function torso() {
        if (esExplorador()) return torsoX();
        var P = paleta(false);
        var s = "";
        s += rect(92, 0, 36, 20, 6, P.metal, P.linea, 4);
        s += rect(36, 212, 40, 24, 6, P.metal, P.linea, 4) + rect(144, 212, 40, 24, 6, P.metal, P.linea, 4);
        s += rect(12, 12, 196, 216, 46, P.cuerpo, P.linea, 6);
        s += rect(30, 112, 160, 102, 30, P.claro, null, 0, ' opacity="0.55"');
        s += path("M 40 30 Q 80 18 130 22", "none", "#ffffff", 9, ' opacity="0.35"');
        s += circulo(12, 48, 22, P.oscuro, P.linea, 4) + circulo(208, 48, 22, P.oscuro, P.linea, 4);
        // pantalla del pecho (la cara la dibuja la escena encima)
        s += rect(58, 50, 104, 62, 18, P.visor, P.linea, 5);
        s += path("M 66 58 Q 90 54 112 56", "none", "#ffffff", 4, ' opacity="0.2"');
        // hueco del módulo de energía
        s += circulo(110, 158, 47, P.oscuro, P.linea, 5);
        s += circulo(110, 158, 37, "#0b1830", P.linea, 3);
        // remaches y luces laterales
        [[34, 32], [186, 32], [34, 208], [186, 208]].forEach(function (p) { s += circulo(p[0], p[1], 5, P.metal, P.linea, 2); });
        [[30, 150], [30, 172], [190, 150], [190, 172]].forEach(function (p) { s += circulo(p[0], p[1], 5, "#0b1830", P.linea, 2); });
        return svg(TORSO.w, TORSO.h, s);
    }

    /** Tapa que cubre el cuello mientras el nivel no tiene cabeza. */
    function tapa() {
        return svg(70, 40, rect(6, 6, 58, 28, 12, "#adb5bd", LINEA, 4) + linea(20, 20, 50, 20, 4, LINEA, 0.4) + circulo(14, 20, 3, LINEA) + circulo(56, 20, 3, LINEA));
    }

    // ------------------------------------------------------------------ ranuras (pestaña de conexión, blanca: la escena la tiñe)

    function socket(forma) {
        var s;
        if (forma === "cuadrado") s = rect(10, 10, 44, 44, 8, "#fff", LINEA, 5) + rect(22, 22, 20, 20, 3, "none", LINEA, 4);
        else if (forma === "hex") s = path(hex(32, 32, 26), "#fff", LINEA, 5) + path(hex(32, 32, 11), "none", LINEA, 4);
        else if (forma === "tri") s = path("M 32 8 L 58 54 L 6 54 Z", "#fff", LINEA, 5) + path("M 32 26 L 44 46 L 20 46 Z", "none", LINEA, 3);
        else if (forma === "modulo") s = circulo(32, 32, 27, "none", "#fff", 7) + circulo(32, 32, 16, "none", "#fff", 4, ' stroke-dasharray="6 6"');
        else s = circulo(32, 32, 24, "#fff", LINEA, 5) + circulo(32, 32, 10, "none", LINEA, 4);
        return svg(64, 64, s);
    }

    function candado() {
        return svg(48, 56, path("M 14 24 L 14 16 A 10 10 0 0 1 34 16 L 34 24", "none", "#495057", 6) +
            rect(6, 22, 36, 30, 8, "#ffd43b", LINEA, 4) + circulo(24, 35, 5, LINEA) + rect(22, 36, 4, 9, 2, LINEA));
    }

    // ------------------------------------------------------------------ laboratorio

    var VENTANAS = [{ x0: 572, x1: 702, y0: 108, y1: 300 }, { x0: 898, x1: 1028, y0: 108, y1: 300 }];

    function arco(v) {
        var r = (v.x1 - v.x0) / 2;
        return "M " + v.x0 + " " + v.y1 + " L " + v.x0 + " " + (v.y0 + r) + " A " + r + " " + r + " 0 0 1 " + v.x1 + " " + (v.y0 + r) + " L " + v.x1 + " " + v.y1 + " Z";
    }

    function pared() {
        var L = (variante && variante.lab) || { luz: "#3bdcff", pared: "#22356e", pared2: "#1a2858", panel: "#2c4486" };
        var rnd = semilla(77);
        var s = '<defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + L.pared2 + '"/><stop offset="0.6" stop-color="' + L.pared + '"/><stop offset="1" stop-color="' + L.pared2 + '"/></linearGradient>' +
            '<linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4a6b"/><stop offset="1" stop-color="#1b2540"/></linearGradient>' +
            '<radialGradient id="gl" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="' + L.luz + '" stop-opacity="0.22"/><stop offset="1" stop-color="' + L.luz + '" stop-opacity="0"/></radialGradient></defs>';
        // pared con dos ventanas recortadas (el paisaje se ve por los huecos)
        s += '<path fill-rule="evenodd" fill="url(#gp)" d="M 0 0 H 1600 V 900 H 0 Z ' + VENTANAS.map(arco).join(" ") + '"/>';
        // paneles de la pared (sin tapar las ventanas)
        for (var cx = 0; cx < 1600; cx += 200) {
            [[78, 370], [392, 360]].forEach(function (fila) {
                var x = cx + 10, y = fila[0], w = 180, h = fila[1] - 20;
                if (fila[0] < 300 && x + w > 560 && x < 1040) return;
                s += rect(x, y, w, h, 14, L.panel, "#14213d", 3, ' opacity="0.55"');
                s += circulo(x + 12, y + 12, 3.5, "#8da2c9") + circulo(x + w - 12, y + 12, 3.5, "#8da2c9") + circulo(x + 12, y + h - 12, 3.5, "#8da2c9") + circulo(x + w - 12, y + h - 12, 3.5, "#8da2c9");
                if (rnd() < 0.5) s += rect(x + 24, y + 30, w - 48, 8, 4, "#14213d", null, 0, ' opacity="0.35"');
            });
        }
        // halo de luz detrás del robot
        s += '<ellipse cx="800" cy="440" rx="420" ry="360" fill="url(#gl)"/>';
        // marcos de las ventanas
        VENTANAS.forEach(function (v) {
            s += path(arco(v), "none", "#14213d", 22) + path(arco(v), "none", "#9aa9c7", 12) + path(arco(v), "none", "#d7e0f0", 3);
            s += linea((v.x0 + v.x1) / 2, v.y0 + 6, (v.x0 + v.x1) / 2, v.y1, 6, "#9aa9c7") + linea(v.x0, v.y0 + 110, v.x1, v.y0 + 110, 5, "#9aa9c7");
            s += rect(v.x0 - 16, v.y1 - 4, v.x1 - v.x0 + 32, 16, 6, "#9aa9c7", "#14213d", 3);
        });
        // techo con viga y remaches
        s += rect(0, 0, 1600, 66, 0, "url(#gs)");
        s += rect(0, 58, 1600, 14, 0, "#4c5c80", "#14213d", 3);
        for (var x = 20; x < 1600; x += 60) s += circulo(x, 65, 3, "#c5d0e6");
        // tuberías decorativas del techo
        s += hueso(0, 26, 1600, 26, 10, "#6b7a99") + hueso(0, 44, 420, 44, 8, "#8a5a44") + hueso(1180, 44, 1600, 44, 8, "#8a5a44");
        [210, 980, 1390].forEach(function (x) { s += rect(x, 16, 22, 40, 5, "#adb5bd", "#14213d", 3); });
        // estantería izquierda (pantallas anchas): cajas, tornillos y frascos
        s += rect(18, 120, 176, 600, 12, "#2a385e", "#14213d", 4, ' opacity="0.9"');
        [270, 450, 630].forEach(function (y, i) {
            s += rect(26, y, 160, 14, 4, "#8a5a44", "#14213d", 3);
            var items = i === 0 ? [["caja", 40, "#ff922b"], ["caja", 96, "#4dabf7"], ["frasco", 150, "#69db7c"]] :
                i === 1 ? [["engr", 52, "#adb5bd"], ["caja", 110, "#ffd43b"], ["frasco", 160, "#da77f2"]] :
                    [["caja", 44, "#ff6b6b"], ["engr", 112, "#ffd43b"], ["caja", 150, "#38d9a9"]];
            items.forEach(function (it) {
                if (it[0] === "caja") s += rect(it[1] - 20, y - 40, 40, 40, 6, it[2], "#14213d", 3) + linea(it[1] - 12, y - 28, it[1] + 12, y - 28, 3, "#14213d", 0.4);
                else if (it[0] === "frasco") s += rect(it[1] - 12, y - 46, 24, 46, 8, it[2], "#14213d", 3, ' opacity="0.85"') + rect(it[1] - 8, y - 54, 16, 10, 3, "#adb5bd", "#14213d", 2);
                else s += circulo(it[1], y - 24, 22, it[2], "#14213d", 3) + circulo(it[1], y - 24, 8, "#495057");
            });
        });
        // plano del robot pegado en la pared (izquierda, sobre la estantería)
        s += rect(36, 140, 140, 104, 6, "#1c5fa8", "#e7f5ff", 3);
        s += rect(86, 160, 40, 38, 8, "none", "#e7f5ff", 2) + rect(92, 150, 28, 10, 4, "none", "#e7f5ff", 2) + linea(86, 168, 70, 196, 2, "#e7f5ff") + linea(126, 168, 142, 196, 2, "#e7f5ff") + linea(96, 198, 94, 228, 2, "#e7f5ff") + linea(116, 198, 118, 228, 2, "#e7f5ff");
        // carcasa de la prensa (derecha, pantallas anchas)
        s += rect(1410, 110, 176, 620, 14, "#33415f", "#14213d", 4);
        s += rect(1428, 130, 140, 36, 8, "#ffd43b", "#14213d", 3);
        for (var k = 0; k < 6; k++) s += path("M " + (1432 + k * 24) + " 166 L " + (1444 + k * 24) + " 130", "none", "#14213d", 6);
        s += rect(1434, 520, 128, 60, 10, "#5c6b8a", "#14213d", 4);
        s += rect(1424, 580, 148, 22, 6, "#868e96", "#14213d", 3);
        // piso con líneas de perspectiva y franja de seguridad
        s += '<defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4668"/><stop offset="1" stop-color="#1c2440"/></linearGradient></defs>';
        s += rect(0, 760, 1600, 140, 0, "url(#gf)");
        for (var fx = -800; fx <= 2400; fx += 160) s += linea(800 + (fx - 800) * 0.32, 760, fx, 900, 2, "#56638a", 0.6);
        [790, 830, 875].forEach(function (y) { s += linea(0, y, 1600, y, 2, "#56638a", 0.5); });
        for (var hx = 0; hx < 1600; hx += 40) s += path("M " + hx + " 760 L " + (hx + 20) + " 760 L " + (hx + 30) + " 768 L " + (hx + 10) + " 768 Z", "#ffd43b", null, 0, ' opacity="0.75"');
        s += linea(0, 768, 1600, 768, 3, "#14213d");
        return svg(1600, 900, s);
    }

    function paisaje() {
        var p = (variante && variante.paisaje) || "ciudad";
        var rnd = semilla(p.length * 31 + 7);
        var cielo = p === "planeta" ? ["#160f3d", "#3b2a7a"] : p === "montanas" ? ["#4dabf7", "#d0ebff"] : ["#ff9a8b", "#ffd6a5"];
        var s = '<defs><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + cielo[0] + '"/><stop offset="1" stop-color="' + cielo[1] + '"/></linearGradient></defs>';
        s += rect(0, 0, 1600, 330, 0, "url(#gc)");
        if (p === "planeta") {
            for (var i = 0; i < 70; i++) s += circulo(540 + rnd() * 520, 100 + rnd() * 200, 1 + rnd() * 2, "#fff", null, 0, ' opacity="' + (0.4 + rnd() * 0.6).toFixed(2) + '"');
            s += circulo(640, 190, 46, "#ff922b") + '<ellipse cx="640" cy="190" rx="78" ry="16" fill="none" stroke="#ffe066" stroke-width="7" transform="rotate(-18 640 190)"/>';
            s += circulo(965, 170, 22, "#74c0fc") + circulo(985, 255, 12, "#e599f7");
        } else if (p === "montanas") {
            s += circulo(660, 160, 26, "#fff3bf");
            s += path("M 540 300 L 610 200 L 660 250 L 720 170 L 800 300 Z", "#5c7cfa") + path("M 860 300 L 930 190 L 990 240 L 1060 180 L 1060 300 Z", "#4c6ef5");
            s += path("M 720 170 L 700 200 L 740 200 Z", "#fff") + path("M 930 190 L 912 218 L 950 218 Z", "#fff");
            s += rect(540, 268, 520, 40, 0, "#51cf66");
            [600, 690, 950].forEach(function (x) { s += linea(x, 300, x, 214, 4, "#f1f3f5") + path("M " + x + " 214 L " + (x - 20) + " 204 M " + x + " 214 L " + (x + 18) + " 200 M " + x + " 214 L " + x + " 236", "none", "#f1f3f5", 3); });
        } else {
            s += circulo(980, 150, 30, "#fff3bf", null, 0, ' opacity="0.9"');
            [[560, 120, 200], [600, 60, 160], [660, 90, 230], [700, 50, 180], [880, 70, 210], [930, 110, 170], [990, 60, 240], [1030, 80, 190]].forEach(function (t) {
                s += rect(t[0], 330 - t[2], t[1] * 0.5, t[2], 8, "#7048e8", null, 0, ' opacity="0.75"');
                for (var w = 0; w < 4; w++) s += rect(t[0] + 6, 340 - t[2] + w * 30, 8, 10, 2, "#ffe066", null, 0, ' opacity="0.8"');
            });
            s += '<ellipse cx="640" cy="300" rx="70" ry="44" fill="#9775fa"/><ellipse cx="960" cy="306" rx="80" ry="40" fill="#845ef7"/>';
        }
        return svg(1600, 330, s);
    }

    function tuboV() {
        return svg(44, 720, rect(6, 0, 32, 720, 16, "#a5d8ff", "#14213d", 3, ' opacity="0.35"') +
            linea(14, 10, 14, 710, 4, "#ffffff", 0.45) + rect(0, 0, 44, 26, 6, "#868e96", "#14213d", 3) + rect(0, 694, 44, 26, 6, "#868e96", "#14213d", 3) +
            rect(0, 340, 44, 20, 5, "#868e96", "#14213d", 3));
    }

    function tuboH() {
        return svg(520, 40, rect(0, 6, 520, 28, 14, "#a5d8ff", "#14213d", 3, ' opacity="0.35"') + linea(10, 13, 510, 13, 4, "#ffffff", 0.45) +
            rect(250, 0, 20, 40, 5, "#868e96", "#14213d", 3));
    }

    function consola() {
        var s = rect(4, 4, 292, 462, 26, "#3b4a6e", LINEA, 6);
        s += rect(16, 16, 268, 438, 18, "#2c3858", null, 0);
        s += rect(26, 26, 248, 108, 14, "#0e1a33", LINEA, 4);
        s += rect(26, 146, 248, 212, 16, "#0e1a33", LINEA, 4);
        s += rect(26, 370, 248, 84, 18, "#25304d", LINEA, 3);
        [[18, 18], [282, 18], [18, 452], [282, 452]].forEach(function (p) { s += circulo(p[0], p[1], 5, "#c5d0e6", LINEA, 2); });
        s += linea(40, 140, 260, 140, 3, "#5f74a3", 0.8) + linea(40, 364, 260, 364, 3, "#5f74a3", 0.8);
        return svg(300, 470, s);
    }

    function bandeja() {
        var s = rect(4, 4, 332, 712, 26, "#5a4632", LINEA, 6);
        s += rect(16, 16, 308, 688, 18, "#3f3123");
        for (var y = 30; y < 700; y += 48) s += linea(24, y, 316, y, 2, "#2c2218", 0.5);
        s += rect(4, 4, 332, 40, 20, "#7a5f43", LINEA, 5);
        [[22, 24], [318, 24], [22, 696], [318, 696]].forEach(function (p) { s += circulo(p[0], p[1], 6, "#e9ecef", LINEA, 2); });
        return svg(340, 720, s);
    }

    function estacion() {
        var s = '<ellipse cx="260" cy="70" rx="250" ry="52" fill="#14213d"/>';
        s += '<ellipse cx="260" cy="60" rx="246" ry="48" fill="#4c5c80" stroke="#14213d" stroke-width="5"/>';
        s += '<ellipse cx="260" cy="56" rx="200" ry="34" fill="#2c3858" stroke="#8da2c9" stroke-width="4"/>';
        s += '<ellipse cx="260" cy="56" rx="140" ry="22" fill="none" stroke="#8da2c9" stroke-width="3" stroke-dasharray="14 10"/>';
        return svg(520, 124, s);
    }

    function engranaje(r, dientes, color) {
        var c = r + 10;
        var d = "";
        for (var i = 0; i < dientes; i++) {
            var a0 = (i / dientes) * Math.PI * 2, a1 = a0 + Math.PI / dientes * 0.9;
            var p = [[r, a0], [r + 9, a0 + 0.05], [r + 9, a1 - 0.05], [r, a1]];
            d += (i ? " L " : "M ") + p.map(function (q) { return (c + q[0] * Math.cos(q[1])).toFixed(1) + " " + (c + q[0] * Math.sin(q[1])).toFixed(1); }).join(" L ");
            var a2 = a1 + Math.PI / dientes * 1.1;
            d += " L " + (c + r * Math.cos(a2)).toFixed(1) + " " + (c + r * Math.sin(a2)).toFixed(1);
        }
        d += " Z";
        return svg(c * 2, c * 2, path(d, color, LINEA, 4) + circulo(c, c, r * 0.55, "none", LINEA, 4) + circulo(c, c, r * 0.22, "#495057", LINEA, 3) +
            [0, 1, 2, 3].map(function (k) { var a = k * Math.PI / 2; return circulo(c + r * 0.38 * Math.cos(a), c + r * 0.38 * Math.sin(a), r * 0.08, LINEA); }).join(""));
    }

    function lampara() {
        return svg(80, 44, path("M 10 4 L 70 4 L 60 26 L 20 26 Z", "#5c6b8a", LINEA, 4) + '<ellipse cx="40" cy="28" rx="22" ry="12" fill="#fff9db" stroke="' + LINEA + '" stroke-width="3"/>');
    }

    function cinta() {
        var s = rect(4, 10, 652, 42, 20, "#495057", LINEA, 5);
        for (var x = 30; x < 650; x += 50) s += circulo(x, 31, 11, "#adb5bd", LINEA, 3) + circulo(x, 31, 3, LINEA);
        s += rect(0, 48, 660, 14, 6, "#ffd43b", LINEA, 3);
        for (var k = 0; k < 660; k += 30) s += path("M " + k + " 62 L " + (k + 14) + " 48 L " + (k + 24) + " 48 L " + (k + 10) + " 62 Z", LINEA, null, 0, ' opacity="0.8"');
        return svg(660, 64, s);
    }

    function banda() {
        return svg(64, 22, rect(0, 0, 64, 22, 0, "#343a40") + rect(4, 3, 24, 16, 4, "#495057") + rect(36, 3, 24, 16, 4, "#495057"));
    }

    function caja(color) {
        return svg(56, 50, rect(4, 6, 48, 40, 7, color, LINEA, 4) + linea(28, 8, 28, 44, 3, LINEA, 0.35) + rect(16, 2, 24, 8, 3, "#adb5bd", LINEA, 2));
    }

    function piston() {
        return svg(100, 230, rect(38, 0, 24, 170, 6, "#ced4da", LINEA, 4) + rect(8, 164, 84, 40, 10, "#ff922b", LINEA, 5) + rect(0, 200, 100, 26, 8, "#5c6b8a", LINEA, 4) +
            linea(20, 182, 80, 182, 4, LINEA, 0.4));
    }

    function dron() {
        return svg(80, 40, '<ellipse cx="40" cy="22" rx="22" ry="11" fill="#e9ecef" stroke="' + LINEA + '" stroke-width="3"/>' + circulo(40, 20, 5, "#ff6b6b") +
            linea(8, 10, 30, 14, 3, LINEA) + linea(72, 10, 50, 14, 3, LINEA) + '<ellipse cx="8" cy="9" rx="9" ry="3" fill="#74c0fc"/><ellipse cx="72" cy="9" rx="9" ry="3" fill="#74c0fc"/>');
    }

    // ------------------------------------------------------------------ herramientas (controles reales)

    function botonGiro(dir) {
        var s = circulo(60, 60, 54, "#ffd43b", LINEA, 6) + circulo(60, 60, 44, "#ffe066");
        s += path("M 60 20 A 40 40 0 0 1 60 100", "none", "#ffffff", 6, ' opacity="0.25"');
        // flecha curva
        s += path("M 34 70 A 28 28 0 1 1 74 86", "none", LINEA, 11);
        s += path("M 34 70 A 28 28 0 1 1 74 86", "none", "#ff922b", 6);
        s += path("M 62 92 L 84 92 L 76 70 Z", "#ff922b", LINEA, 4);
        // llavecita mecánica
        s += path("M 40 40 L 52 52", "none", LINEA, 7) + circulo(37, 37, 8, "#adb5bd", LINEA, 3) + path("M 33 33 L 38 38", "none", "#ffe066", 4);
        var cuerpo = dir < 0 ? '<g transform="translate(120,0) scale(-1,1)">' + s + "</g>" : s;
        return svg(120, 120, cuerpo);
    }

    function botonEscaner() {
        var s = circulo(50, 50, 46, "#69db7c", LINEA, 6) + circulo(50, 50, 37, "#8ce99a");
        s += circulo(44, 44, 17, "#e7f5ff", LINEA, 6) + path("M 56 56 L 72 72", "none", LINEA, 10) + path("M 34 44 L 54 44", "none", "#40c057", 4);
        return svg(100, 100, s);
    }

    // ------------------------------------------------------------------ efectos

    function chispa() {
        return svg(48, 48, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="24" cy="24" r="24" fill="url(#g)"/>');
    }

    function luz() {
        return svg(256, 256, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="128" cy="128" r="128" fill="url(#g)"/>');
    }

    function destello() {
        return svg(64, 64, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="32" cy="32" r="16" fill="url(#g)"/><path d="M32 0 C 34 24, 40 30, 64 32 C 40 34, 34 40, 32 64 C 30 40, 24 34, 0 32 C 24 30, 30 24, 32 0 Z" fill="#fff"/>');
    }

    function anillo() {
        return svg(200, 200, '<circle cx="100" cy="100" r="88" fill="none" stroke="#fff" stroke-width="10"/><circle cx="100" cy="100" r="88" fill="none" stroke="#fff" stroke-width="24" opacity="0.25"/>');
    }

    function estrella() {
        var p = [];
        for (var i = 0; i < 10; i++) {
            var r = i % 2 ? 13 : 30, a = -Math.PI / 2 + i * Math.PI / 5;
            p.push((32 + r * Math.cos(a)).toFixed(1) + " " + (32 + r * Math.sin(a)).toFixed(1));
        }
        return svg(64, 64, path("M" + p.join(" L") + " Z", "#fff", null));
    }

    function confeti() { return svg(16, 24, rect(1, 1, 14, 22, 3, "#fff")); }

    function sombra() {
        return svg(160, 40, '<defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000814" stop-opacity="0.6"/><stop offset="1" stop-color="#000814" stop-opacity="0"/></radialGradient></defs><ellipse cx="80" cy="20" rx="80" ry="20" fill="url(#g)"/>');
    }

    function haz() {
        return svg(120, 40, '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect x="0" y="0" width="120" height="40" fill="url(#g)"/>');
    }

    function flechaGiro() {
        return svg(80, 80, path("M 16 46 A 26 26 0 1 1 52 66", "none", "#fff", 8) + path("M 42 72 L 62 70 L 54 52 Z", "#fff"));
    }

    // ------------------------------------------------------------------ rasterizado

    function lista() {
        var l = [
            ["pared", pared(), 1],
            ["paisaje", paisaje(), 1],
            ["tubo-v", tuboV(), 1],
            ["tubo-h", tuboH(), 1],
            ["consola", consola(), 1.4],
            ["bandeja", bandeja(), 1.2],
            ["estacion", estacion(), 1.2],
            ["engranaje", engranaje(46, 12, "#adb5bd"), 1.2],
            ["engranaje2", engranaje(30, 9, "#ffd43b"), 1.2],
            ["engranaje3", engranaje(22, 8, "#74c0fc"), 1.2],
            ["lampara", lampara(), 1.2],
            ["cinta", cinta(), 1],
            ["banda", banda(), 1],
            ["caja-a", caja("#ff922b"), 1.2],
            ["caja-b", caja("#4dabf7"), 1.2],
            ["caja-c", caja("#69db7c"), 1.2],
            ["piston", piston(), 1.2],
            ["dron", dron(), 1.2],
            ["boton-izq", botonGiro(-1), 1.6],
            ["boton-der", botonGiro(1), 1.6],
            ["boton-escaner", botonEscaner(), 1.6],
            ["torso", torso(), 2],
            ["tapa", tapa(), 2],
            ["candado", candado(), 2],
            ["chispa", chispa(), 1.5],
            ["luz", luz(), 1],
            ["destello", destello(), 1.5],
            ["anillo", anillo(), 1.2],
            ["estrella", estrella(), 1.5],
            ["confeti", confeti(), 1.5],
            ["sombra", sombra(), 1.2],
            ["haz", haz(), 1],
            ["flecha-giro", flechaGiro(), 1.5]
        ];
        ["circulo", "cuadrado", "hex", "tri", "modulo"].forEach(function (f) { l.push(["socket-" + f, socket(f), 1.6]); });
        Object.keys(GEOM).forEach(function (id) {
            l.push(["pieza-" + id, piezaSVG(id, false), 2]);
            l.push(["silueta-" + id, piezaSVG(id, true), 1.2]);
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
                console.warn("[DibujosRobot] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    /** Rasteriza todo con la variante de la partida (una sola vez). */
    function preparar(v) {
        if (!listo) {
            variante = v || null;
            listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        }
        return listo;
    }

    global.DibujosRobot = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        GEOM: GEOM,
        TORSO: TORSO,
        VENTANAS: VENTANAS,
        junta: junta,
        centro: centro,
        socketDe: function (id) { return GEOM[id] ? "socket-" + SOCKET[GEOM[id].tipo] : "socket-circulo"; },
        ojos: function () { return ojosDe(esExplorador() ? "explorador" : ((variante && variante.visera) || "banda")); },
        puntaAntena: function () { return puntaAntena(esExplorador() ? "radar" : ((variante && variante.antena) || "bola")); },
        tipo: function () { return esExplorador() ? "explorador" : "clasico"; },
        variante: function () { return variante; },
        color: function (clave) {
            var c = (variante && variante.color) || {};
            var hx = c[clave] || "#4dabf7";
            return parseInt(hx.slice(1), 16);
        },
        luzLab: function () {
            var l = (variante && variante.lab) || {};
            return parseInt((l.luz || "#3bdcff").slice(1), 16);
        },
        svgPieza: piezaSVG,
        svgPared: pared
    };
})(typeof window !== "undefined" ? window : global);
