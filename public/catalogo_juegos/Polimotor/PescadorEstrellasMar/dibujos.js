/**
 * DibujosPescador — dibujos propios de "El Pescador de Estrellas de Mar" (window.DibujosPescador).
 *
 * Todo es SVG propio rasterizado UNA vez a <canvas> por preparar(); la escena los convierte en texturas.
 * Las piezas que cambian de color (peces, corales, conchas, burbujas, chispas, banderines, medusas) se dibujan en
 * blanco o gris claro y Phaser las tiñe. Las estrellas de mar, la barca, el gancho, la polea y el cofre llevan su
 * color propio. Cada estrella tiene tres caras: normal, ojos cerrados (parpadeo) y sorpresa (al ser atrapada).
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

    function puntosEstrella(cx, cy, r, ri, n, giro) {
        var p = [];
        for (var i = 0; i < n * 2; i++) {
            var a = -Math.PI / 2 + (giro || 0) + i * Math.PI / n;
            var rr = i % 2 ? ri : r;
            p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
        }
        return p;
    }

    function rutaPuntos(p) {
        return p.map(function (q, i) { return (i ? "L" : "M") + f1(q[0]) + " " + f1(q[1]); }).join(" ") + " Z";
    }

    // ------------------------------------------------------------------ estrellas de mar

    var COLORES = {
        rosa: { base: "#ff6fae", osc: "#c92a6f", luz: "#ffc6de", punto: "#ffe3ef" },
        naranja: { base: "#ff9a3c", osc: "#d1560c", luz: "#ffd6a8", punto: "#fff0d6" },
        turquesa: { base: "#2fd6c6", osc: "#0f8a83", luz: "#a9f5ec", punto: "#e3fffb" },
        morado: { base: "#a66bff", osc: "#6236c9", luz: "#dccaff", punto: "#f2ebff" },
        amarillo: { base: "#ffd43b", osc: "#d08a00", luz: "#fff2a8", punto: "#fffbe0" }
    };

    /** Estrella de mar de cinco brazos redondeados con puntitos, ojos y sonrisa. cara: normal | cerrados | sorpresa. */
    function estrellaMar(color, cara) {
        var c = COLORES[color] || COLORES.rosa;
        var cx = 100, cy = 104;
        var p = puntosEstrella(cx, cy, 80, 38, 5);
        var pi = puntosEstrella(cx, cy - 3, 64, 30, 5);
        var puntos = "";
        // puntitos (bultitos) a lo largo de cada brazo
        for (var k = 0; k < 5; k++) {
            var a = -Math.PI / 2 + k * Math.PI * 2 / 5;
            [34, 50, 64].forEach(function (d, n) {
                var x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
                puntos += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + (5.5 - n * 1.2) + '" fill="' + c.punto + '" opacity="0.85"/>';
            });
        }
        var ojos;
        if (cara === "cerrados") {
            ojos = '<path d="M80 98 Q88 106 96 98" fill="none" stroke="#3a1a40" stroke-width="5" stroke-linecap="round"/>' +
                '<path d="M106 98 Q114 106 122 98" fill="none" stroke="#3a1a40" stroke-width="5" stroke-linecap="round"/>';
        } else if (cara === "sorpresa") {
            ojos = '<ellipse cx="88" cy="96" rx="11" ry="13" fill="#fff" stroke="#3a1a40" stroke-width="3"/><circle cx="88" cy="97" r="6.5" fill="#2a1430"/><circle cx="91" cy="93" r="2.6" fill="#fff"/>' +
                '<ellipse cx="114" cy="96" rx="11" ry="13" fill="#fff" stroke="#3a1a40" stroke-width="3"/><circle cx="114" cy="97" r="6.5" fill="#2a1430"/><circle cx="117" cy="93" r="2.6" fill="#fff"/>';
        } else {
            ojos = '<ellipse cx="88" cy="97" rx="9" ry="11" fill="#fff" stroke="#3a1a40" stroke-width="3"/><circle cx="89" cy="99" r="5.5" fill="#2a1430"/><circle cx="91.5" cy="95.5" r="2.2" fill="#fff"/>' +
                '<ellipse cx="113" cy="97" rx="9" ry="11" fill="#fff" stroke="#3a1a40" stroke-width="3"/><circle cx="114" cy="99" r="5.5" fill="#2a1430"/><circle cx="116.5" cy="95.5" r="2.2" fill="#fff"/>';
        }
        var boca = cara === "sorpresa"
            ? '<ellipse cx="101" cy="121" rx="7" ry="8" fill="#7a1d3f" stroke="#3a1a40" stroke-width="3"/>'
            : '<path d="M90 116 Q101 128 112 116" fill="#ff8aa8" stroke="#3a1a40" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
        return svg(200, 200,
            '<defs><radialGradient id="g" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="' + c.luz + '"/><stop offset="0.55" stop-color="' + c.base + '"/><stop offset="1" stop-color="' + c.osc + '"/></radialGradient></defs>' +
            '<path d="' + rutaPuntos(puntosEstrella(cx, cy + 6, 80, 38, 5)) + '" fill="#0b3b5c" opacity="0.28" stroke="#0b3b5c" stroke-width="24" stroke-linejoin="round" stroke-opacity="0.28"/>' +
            '<path d="' + rutaPuntos(p) + '" fill="' + c.osc + '" stroke="' + c.osc + '" stroke-width="26" stroke-linejoin="round"/>' +
            '<path d="' + rutaPuntos(p) + '" fill="url(#g)" stroke="url(#g)" stroke-width="18" stroke-linejoin="round"/>' +
            '<path d="' + rutaPuntos(pi) + '" fill="' + c.luz + '" opacity="0.35" stroke="' + c.luz + '" stroke-width="10" stroke-linejoin="round" stroke-opacity="0.35"/>' +
            puntos +
            '<ellipse cx="72" cy="66" rx="10" ry="5" fill="#fff" opacity="0.6" transform="rotate(-35 72 66)"/>' +
            '<ellipse cx="78" cy="112" rx="8" ry="5" fill="#ff5c8a" opacity="0.45"/><ellipse cx="124" cy="112" rx="8" ry="5" fill="#ff5c8a" opacity="0.45"/>' +
            ojos + boca);
    }

    /** Estrellita para la red y el progreso (sin cara, más simple). */
    function estrellaMini(color) {
        var c = COLORES[color] || COLORES.rosa;
        var p = puntosEstrella(40, 42, 32, 15, 5);
        return svg(80, 80,
            '<path d="' + rutaPuntos(p) + '" fill="' + c.base + '" stroke="' + c.osc + '" stroke-width="9" stroke-linejoin="round"/>' +
            '<path d="' + rutaPuntos(p) + '" fill="' + c.base + '" stroke="' + c.base + '" stroke-width="3" stroke-linejoin="round"/>' +
            '<circle cx="36" cy="38" r="3" fill="#2a1430"/><circle cx="45" cy="38" r="3" fill="#2a1430"/>' +
            '<path d="M36 46 Q40.5 50 45 46" fill="none" stroke="#2a1430" stroke-width="2.5" stroke-linecap="round"/>');
    }

    // ------------------------------------------------------------------ gancho, polea, barca y red

    /** Gancho dorado mágico (sin punta afilada). El aro está arriba (25, 14) y la curva abajo. */
    function gancho() {
        return svg(110, 180,
            '<defs><linearGradient id="o" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8740a"/><stop offset="0.35" stop-color="#ffe680"/><stop offset="0.6" stop-color="#ffc21a"/><stop offset="1" stop-color="#a86200"/></linearGradient></defs>' +
            '<circle cx="55" cy="16" r="11" fill="none" stroke="#7a4300" stroke-width="10"/>' +
            '<circle cx="55" cy="16" r="11" fill="none" stroke="url(#o)" stroke-width="6"/>' +
            '<path d="M55 27 L55 112 C55 150 20 160 14 128 L13 120" fill="none" stroke="#7a4300" stroke-width="17" stroke-linecap="round"/>' +
            '<path d="M55 27 L55 112 C55 150 20 160 14 128 L13 120" fill="none" stroke="url(#o)" stroke-width="11" stroke-linecap="round"/>' +
            '<path d="M52 34 L52 108" stroke="#fff9d6" stroke-width="3" stroke-linecap="round" opacity="0.9"/>' +
            '<circle cx="13" cy="118" r="9" fill="#ffe680" stroke="#7a4300" stroke-width="4"/>' +
            '<path d="M55 60 l5 -5 l5 5 l-5 5 z" fill="#fff" opacity="0.9"/>' +
            '<circle cx="51" cy="12" r="2.5" fill="#fff" opacity="0.9"/>');
    }

    function polea() {
        var rayos = "";
        for (var i = 0; i < 6; i++) {
            var a = i * Math.PI / 3;
            rayos += '<path d="M40 40 L' + f1(40 + Math.cos(a) * 24) + " " + f1(40 + Math.sin(a) * 24) + '" stroke="#7a4300" stroke-width="5" stroke-linecap="round"/>';
        }
        return svg(80, 80,
            '<circle cx="40" cy="40" r="34" fill="#ffc21a" stroke="#7a4300" stroke-width="6"/>' +
            '<circle cx="40" cy="40" r="26" fill="#ffe680" stroke="#b8740a" stroke-width="4"/>' + rayos +
            '<circle cx="40" cy="40" r="8" fill="#e8590c" stroke="#7a4300" stroke-width="4"/>' +
            '<circle cx="18" cy="24" r="4" fill="#fff" opacity="0.8"/>');
    }

    /**
     * Barca de Zoe y Zeus. Línea de flotación en (200, 230); el pescante sale del mástil y la polea va en (360, 44):
     * el gancho cuelga 160 px a la derecha del centro de la barca, fuera del casco.
     */
    function barca() {
        var tablas = "";
        for (var i = 0; i < 4; i++) tablas += '<path d="M' + (92 + i * 3) + " " + (206 + i * 14) + " L" + (310 - i * 10) + " " + (206 + i * 14) + '" stroke="#8a4a14" stroke-width="3" opacity="0.5"/>';
        return svg(400, 290,
            '<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a5c"/><stop offset="1" stop-color="#e8590c"/></linearGradient>' +
            '<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd8a8"/><stop offset="1" stop-color="#c77b30"/></linearGradient></defs>' +
            // mástil y pescante
            '<rect x="234" y="36" width="12" height="160" rx="6" fill="url(#m)" stroke="#7a3d0c" stroke-width="4"/>' +
            '<path d="M240 44 L366 44" stroke="#7a3d0c" stroke-width="14" stroke-linecap="round"/>' +
            '<path d="M240 44 L366 44" stroke="#ffb86b" stroke-width="8" stroke-linecap="round"/>' +
            '<path d="M240 110 L330 48" stroke="#7a3d0c" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M246 22 L246 6 L282 14 Z" fill="#ff6fae" stroke="#a61e4d" stroke-width="3" stroke-linejoin="round"/>' +
            '<circle cx="240" cy="34" r="8" fill="#ffd43b" stroke="#7a3d0c" stroke-width="3"/>' +
            // cabina
            '<rect x="112" y="134" width="88" height="62" rx="12" fill="#fff4e0" stroke="#7a3d0c" stroke-width="5"/>' +
            '<path d="M104 140 Q156 104 208 140 Z" fill="#20c3b0" stroke="#0f6f66" stroke-width="5" stroke-linejoin="round"/>' +
            '<circle cx="156" cy="164" r="15" fill="#a5f3fc" stroke="#7a3d0c" stroke-width="5"/>' +
            '<path d="M148 158 L160 152" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' +
            // casco
            '<path d="M62 192 L340 186 Q336 252 280 266 L122 266 Q74 252 62 192 Z" fill="#c77b30" stroke="#6b3408" stroke-width="7" stroke-linejoin="round"/>' +
            tablas +
            '<path d="M60 190 L342 184 L338 206 L64 210 Z" fill="url(#c)" stroke="#6b3408" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M70 196 L334 191" stroke="#fff3bf" stroke-width="4" stroke-linecap="round" opacity="0.8"/>' +
            '<path d="M82 230 L320 226" stroke="#ffd43b" stroke-width="7" stroke-linecap="round"/>' +
            // salvavidas
            '<circle cx="276" cy="232" r="17" fill="none" stroke="#fff" stroke-width="10"/>' +
            '<circle cx="276" cy="232" r="17" fill="none" stroke="#ff4d6d" stroke-width="10" stroke-dasharray="13 13.7"/>' +
            '<circle cx="276" cy="232" r="23" fill="none" stroke="#6b3408" stroke-width="2.5"/>' +
            '<circle cx="276" cy="232" r="11" fill="none" stroke="#6b3408" stroke-width="2.5"/>' +
            // estrellita pintada en el casco
            '<path d="' + rutaPuntos(puntosEstrella(140, 240, 13, 6, 5)) + '" fill="#ffe066" stroke="#6b3408" stroke-width="3" stroke-linejoin="round"/>');
    }

    /** Red de pesca que cuelga a un lado de la barca (el aro arriba, la bolsa hacia abajo). */
    function red() {
        var malla = "";
        for (var i = 0; i <= 8; i++) {
            var x = 20 + i * 17.5;
            malla += '<path d="M' + f1(x) + " 18 Q" + f1(90 + (x - 90) * 0.6) + " 110 " + f1(90 + (x - 90) * 0.25) + ' 150" fill="none" stroke="#f4e1b5" stroke-width="3" opacity="0.85"/>';
        }
        for (var k = 1; k <= 5; k++) {
            var y = 18 + k * 24, an = 70 - k * 9;
            malla += '<path d="M' + f1(90 - an) + " " + y + " Q90 " + (y + 12) + " " + f1(90 + an) + " " + y + '" fill="none" stroke="#f4e1b5" stroke-width="3" opacity="0.85"/>';
        }
        return svg(180, 170,
            '<path d="M20 18 Q24 120 90 156 Q156 120 160 18 Z" fill="#ffffff" opacity="0.18"/>' + malla +
            '<path d="M20 18 Q24 120 90 156 Q156 120 160 18" fill="none" stroke="#c99a52" stroke-width="5" stroke-linejoin="round"/>' +
            '<rect x="12" y="10" width="156" height="14" rx="7" fill="#c77b30" stroke="#6b3408" stroke-width="4"/>');
    }

    function banderin() {
        return svg(40, 50, '<path d="M4 4 L36 4 L20 44 Z" fill="#ffffff" stroke="#d0d7e0" stroke-width="2" stroke-linejoin="round"/>');
    }

    function farol() {
        return svg(40, 60,
            '<path d="M20 2 L20 10" stroke="#5c3310" stroke-width="3"/>' +
            '<rect x="8" y="10" width="24" height="8" rx="3" fill="#7a3d0c"/>' +
            '<rect x="10" y="18" width="20" height="28" rx="8" fill="#ffe680" stroke="#7a3d0c" stroke-width="3"/>' +
            '<rect x="8" y="46" width="24" height="7" rx="3" fill="#7a3d0c"/>' +
            '<ellipse cx="17" cy="28" rx="3" ry="6" fill="#fff" opacity="0.9"/>');
    }

    // ------------------------------------------------------------------ vida marina (se tiñe)

    function pez() {
        return svg(140, 90,
            '<path d="M104 45 L136 18 Q128 45 136 72 Z" fill="#e8eef5" stroke="#9aa8b8" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M60 18 Q76 2 92 20 Z" fill="#e8eef5" stroke="#9aa8b8" stroke-width="3" stroke-linejoin="round"/>' +
            '<ellipse cx="62" cy="46" rx="50" ry="30" fill="#ffffff" stroke="#9aa8b8" stroke-width="3"/>' +
            '<path d="M70 20 Q78 46 70 72" fill="none" stroke="#d5dde6" stroke-width="6"/>' +
            '<path d="M84 24 Q91 46 84 68" fill="none" stroke="#d5dde6" stroke-width="5"/>' +
            '<path d="M60 58 Q70 70 80 60" fill="#f1f4f8" stroke="#9aa8b8" stroke-width="2.5"/>' +
            '<circle cx="34" cy="40" r="10" fill="#fff" stroke="#24304a" stroke-width="2.5"/><circle cx="32" cy="41" r="5.5" fill="#1a2238"/><circle cx="30" cy="38" r="2" fill="#fff"/>' +
            '<path d="M14 52 Q20 56 26 52" fill="none" stroke="#24304a" stroke-width="3" stroke-linecap="round"/>');
    }

    function silueta() {
        return svg(120, 60, '<path d="M8 30 Q40 2 84 24 L116 6 Q108 30 116 54 L84 36 Q40 58 8 30 Z" fill="#ffffff"/>');
    }

    function alga() {
        return svg(110, 320,
            '<path d="M55 318 C40 250 72 210 52 150 C36 100 66 60 54 6" fill="none" stroke="#2b8a3e" stroke-width="12" stroke-linecap="round"/>' +
            '<path d="M55 318 C40 250 72 210 52 150 C36 100 66 60 54 6" fill="none" stroke="#69db7c" stroke-width="6" stroke-linecap="round"/>' +
            '<path d="M54 250 C20 236 10 200 26 182 C40 204 52 220 54 250 Z" fill="#51cf66" stroke="#2b8a3e" stroke-width="4"/>' +
            '<path d="M56 200 C92 186 102 150 86 132 C72 154 60 172 56 200 Z" fill="#69db7c" stroke="#2b8a3e" stroke-width="4"/>' +
            '<path d="M52 140 C20 126 14 92 30 74 C42 96 50 112 52 140 Z" fill="#51cf66" stroke="#2b8a3e" stroke-width="4"/>' +
            '<path d="M56 90 C86 76 92 44 78 28 C66 48 58 62 56 90 Z" fill="#8ce99a" stroke="#2b8a3e" stroke-width="4"/>');
    }

    function algaFina() {
        return svg(70, 260,
            '<path d="M20 258 C10 190 34 150 22 90 C14 50 30 24 26 4" fill="none" stroke="#e6fcf5" stroke-width="9" stroke-linecap="round"/>' +
            '<path d="M44 258 C54 200 34 160 46 110 C54 76 42 50 48 26" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>');
    }

    function coralRama() {
        return svg(200, 220,
            '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M100 218 L100 140 L60 96 L52 40 M100 140 L142 90 L150 30 M60 96 L24 74 M142 90 L180 70 M100 160 L100 60 L96 14" stroke="#9aa8b8" stroke-width="26"/>' +
            '<path d="M100 218 L100 140 L60 96 L52 40 M100 140 L142 90 L150 30 M60 96 L24 74 M142 90 L180 70 M100 160 L100 60 L96 14" stroke="#ffffff" stroke-width="18"/>' +
            '<path d="M96 200 L96 150 L58 106 M98 70 L94 24" stroke="#e9eef4" stroke-width="6"/></g>' +
            '<g fill="#ffffff" stroke="#9aa8b8" stroke-width="3"><circle cx="52" cy="40" r="11"/><circle cx="150" cy="30" r="11"/><circle cx="24" cy="74" r="10"/><circle cx="180" cy="70" r="10"/><circle cx="96" cy="14" r="11"/></g>');
    }

    function coralAbanico() {
        var r = "";
        for (var i = 0; i < 9; i++) {
            var a = Math.PI + 0.25 + i * (Math.PI - 0.5) / 8;
            r += '<path d="M100 196 Q' + f1(100 + Math.cos(a) * 50) + " " + f1(196 + Math.sin(a) * 90) + " " + f1(100 + Math.cos(a) * 92) + " " + f1(196 + Math.sin(a) * 170) + '" fill="none" stroke="#c7d0db" stroke-width="5" stroke-linecap="round"/>';
        }
        return svg(200, 200,
            '<path d="M100 196 C10 190 4 70 40 34 C70 6 130 6 160 34 C196 70 190 190 100 196 Z" fill="#ffffff" stroke="#9aa8b8" stroke-width="5"/>' + r +
            '<path d="M92 198 L108 198 L104 180 L96 180 Z" fill="#9aa8b8"/>');
    }

    function coralTubo() {
        var t = "";
        [[40, 120, 22], [80, 70, 26], [124, 96, 24], [160, 140, 20]].forEach(function (q) {
            t += '<rect x="' + (q[0] - q[2] / 2) + '" y="' + q[1] + '" width="' + q[2] + '" height="' + (200 - q[1]) + '" rx="' + (q[2] / 2) + '" fill="#ffffff" stroke="#9aa8b8" stroke-width="4"/>' +
                '<ellipse cx="' + q[0] + '" cy="' + (q[1] + 6) + '" rx="' + (q[2] / 2 - 2) + '" ry="6" fill="#b6c2cf"/>';
        });
        return svg(200, 204, t);
    }

    function coralCerebro() {
        return svg(180, 120,
            '<path d="M8 116 C4 50 50 10 90 10 C130 10 176 50 172 116 Z" fill="#ffffff" stroke="#9aa8b8" stroke-width="5"/>' +
            '<path d="M30 100 C40 70 60 80 70 56 C80 34 110 40 116 62 C122 82 146 76 152 100" fill="none" stroke="#c7d0db" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M50 40 C70 30 84 50 104 34 M44 76 C56 92 76 88 90 100 M120 92 C130 80 150 86 160 74" fill="none" stroke="#c7d0db" stroke-width="5" stroke-linecap="round"/>');
    }

    function roca() {
        return svg(220, 130,
            '<path d="M8 128 C4 80 30 40 74 34 C96 10 150 14 170 44 C206 54 220 98 212 128 Z" fill="#6f8fb5" stroke="#3e5a80" stroke-width="5"/>' +
            '<path d="M40 70 C60 50 84 50 96 40 M132 36 C150 40 164 56 170 70" fill="none" stroke="#9fb8d6" stroke-width="7" stroke-linecap="round"/>' +
            '<ellipse cx="150" cy="100" rx="18" ry="8" fill="#5a7aa0"/><ellipse cx="70" cy="104" rx="12" ry="6" fill="#5a7aa0"/>');
    }

    function piedra() {
        return svg(90, 60,
            '<ellipse cx="45" cy="34" rx="42" ry="24" fill="#a9b8c9" stroke="#6c7f96" stroke-width="4"/>' +
            '<ellipse cx="34" cy="24" rx="14" ry="6" fill="#d5dfea" opacity="0.8"/>');
    }

    function concha() {
        var r = "";
        for (var i = 0; i < 7; i++) {
            var a = Math.PI + 0.35 + i * (Math.PI - 0.7) / 6;
            r += '<path d="M50 72 L' + f1(50 + Math.cos(a) * 44) + " " + f1(72 + Math.sin(a) * 60) + '" stroke="#c7d0db" stroke-width="4" stroke-linecap="round"/>';
        }
        return svg(100, 90,
            '<path d="M50 74 C6 74 0 30 22 14 C36 2 64 2 78 14 C100 30 94 74 50 74 Z" fill="#ffffff" stroke="#9aa8b8" stroke-width="4"/>' + r +
            '<path d="M36 72 L64 72 L60 86 L40 86 Z" fill="#ffffff" stroke="#9aa8b8" stroke-width="4" stroke-linejoin="round"/>');
    }

    function caracol() {
        return svg(100, 80,
            '<path d="M14 72 C4 40 30 8 60 12 C86 16 96 46 80 62 C66 76 44 66 46 50 C48 38 62 38 64 48" fill="#ffffff" stroke="#9aa8b8" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M14 72 L92 72" stroke="#9aa8b8" stroke-width="5" stroke-linecap="round"/>');
    }

    function cofre() {
        return svg(200, 170,
            '<path d="M24 64 Q100 -6 176 64 Z" fill="#a0522d" stroke="#5c2b0c" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M40 60 Q100 8 160 60" fill="none" stroke="#ffd43b" stroke-width="8"/>' +
            '<circle cx="70" cy="70" r="13" fill="#ffd43b" stroke="#b8740a" stroke-width="3"/><circle cx="96" cy="66" r="14" fill="#ffe066" stroke="#b8740a" stroke-width="3"/>' +
            '<circle cx="124" cy="70" r="13" fill="#ffd43b" stroke="#b8740a" stroke-width="3"/><circle cx="110" cy="58" r="9" fill="#fff" stroke="#c7d0db" stroke-width="3"/>' +
            '<circle cx="84" cy="56" r="8" fill="#ff8cc6" stroke="#c2255c" stroke-width="3"/>' +
            '<rect x="20" y="72" width="160" height="86" rx="10" fill="#b5652a" stroke="#5c2b0c" stroke-width="6"/>' +
            '<path d="M20 98 L180 98 M20 132 L180 132" stroke="#8a4a14" stroke-width="4"/>' +
            '<rect x="48" y="72" width="14" height="86" fill="#ffd43b" stroke="#b8740a" stroke-width="3"/><rect x="138" y="72" width="14" height="86" fill="#ffd43b" stroke="#b8740a" stroke-width="3"/>' +
            '<rect x="86" y="92" width="28" height="30" rx="6" fill="#ffd43b" stroke="#b8740a" stroke-width="4"/><circle cx="100" cy="104" r="5" fill="#5c2b0c"/>');
    }

    function medusa() {
        return svg(120, 170,
            '<path d="M10 70 C10 20 110 20 110 70 Q96 62 84 72 Q72 62 60 72 Q48 62 36 72 Q24 62 10 70 Z" fill="#ffffff" opacity="0.85"/>' +
            '<path d="M30 72 C24 100 40 120 30 160 M54 74 C60 110 46 130 56 166 M78 74 C72 110 88 130 78 162 M98 72 C104 100 92 124 100 150" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>' +
            '<ellipse cx="44" cy="42" rx="12" ry="7" fill="#ffffff" opacity="0.95"/>');
    }

    // ------------------------------------------------------------------ luz, burbujas y brillos

    function burbuja() {
        return svg(64, 64,
            '<defs><radialGradient id="b" cx="0.5" cy="0.5" r="0.5"><stop offset="0.6" stop-color="#ffffff" stop-opacity="0.05"/><stop offset="0.92" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.9"/></radialGradient></defs>' +
            '<circle cx="32" cy="32" r="29" fill="url(#b)" stroke="#ffffff" stroke-width="2.5" stroke-opacity="0.85"/>' +
            '<ellipse cx="22" cy="20" rx="8" ry="5" fill="#ffffff" opacity="0.9" transform="rotate(-35 22 20)"/>');
    }

    function chispa() {
        return svg(64, 64,
            '<defs><radialGradient id="c"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="32" cy="32" r="16" fill="url(#c)"/>' +
            '<path d="M32 2 Q35 29 62 32 Q35 35 32 62 Q29 35 2 32 Q29 29 32 2 Z" fill="#ffffff"/>');
    }

    function luz() {
        return svg(128, 128,
            '<defs><radialGradient id="l"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="64" cy="64" r="64" fill="url(#l)"/>');
    }

    function halo() {
        return svg(200, 200,
            '<defs><radialGradient id="h"><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="0.72" stop-color="#fff" stop-opacity="0.85"/><stop offset="0.82" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
            '<circle cx="100" cy="100" r="100" fill="url(#h)"/>');
    }

    function rayo() {
        return svg(260, 760,
            '<defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="r2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="1"/></linearGradient>' +
            '<mask id="k"><rect width="260" height="760" fill="#fff"/><rect width="260" height="760" fill="url(#r2)"/></mask></defs>' +
            '<path d="M100 0 L160 0 L260 760 L0 760 Z" fill="url(#r)" mask="url(#k)"/>');
    }

    function nube() {
        return svg(260, 110,
            '<path d="M30 92 C6 92 6 58 34 56 C34 26 74 18 92 40 C104 10 156 8 168 40 C190 24 230 36 224 66 C252 68 252 96 226 96 Z" fill="#ffffff" stroke="#d0ebff" stroke-width="4"/>');
    }

    function sombra() {
        return svg(160, 50,
            '<defs><radialGradient id="s"><stop offset="0" stop-color="#0b3b5c" stop-opacity="0.45"/><stop offset="1" stop-color="#0b3b5c" stop-opacity="0"/></radialGradient></defs>' +
            '<ellipse cx="80" cy="25" rx="80" ry="25" fill="url(#s)"/>');
    }

    // ------------------------------------------------------------------ fondos grandes

    /** Cielo y agua (sin arena ni superficie: la superficie la dibuja la escena con ondas que se mueven). */
    function mar() {
        return svg(1600, 900,
            '<defs><linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd3ff"/><stop offset="1" stop-color="#d9f6ff"/></linearGradient>' +
            '<linearGradient id="agua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fe0e6"/><stop offset="0.35" stop-color="#2bb8d8"/><stop offset="0.75" stop-color="#1a86c2"/><stop offset="1" stop-color="#176aa8"/></linearGradient></defs>' +
            '<rect width="1600" height="210" fill="url(#cielo)"/>' +
            '<rect y="196" width="1600" height="704" fill="url(#agua)"/>' +
            '<ellipse cx="800" cy="300" rx="900" ry="140" fill="#b7f4ff" opacity="0.18"/>');
    }

    /** Arrecife lejano (siluetas azuladas) detrás de todo. */
    function arrecifeLejano() {
        var rnd = semilla(17), d = "";
        for (var i = 0; i < 26; i++) {
            var x = i * 64 + rnd() * 30, h = 50 + rnd() * 110, w = 30 + rnd() * 40;
            if (i % 3 === 0) d += '<path d="M' + f1(x) + " 300 L" + f1(x + 6) + " " + f1(300 - h) + " Q" + f1(x + w / 2) + " " + f1(300 - h - 30) + " " + f1(x + w) + " " + f1(300 - h) + " L" + f1(x + w + 4) + ' 300 Z" fill="#ffffff"/>';
            else d += '<ellipse cx="' + f1(x) + '" cy="300" rx="' + f1(w) + '" ry="' + f1(h * 0.7) + '" fill="#ffffff"/>';
        }
        return svg(1600, 300, d);
    }

    /** Lecho marino: arena con dunas suaves, ondas y piedritas. */
    function arena() {
        var rnd = semilla(5), deco = "";
        for (var i = 0; i < 12; i++) {
            var y = 70 + i * 14 + rnd() * 6, x0 = rnd() * 200;
            deco += '<path d="M' + f1(x0) + " " + f1(y) + " Q" + f1(x0 + 200) + " " + f1(y - 12) + " " + f1(x0 + 400) + " " + f1(y) + " T" + f1(x0 + 800) + " " + f1(y) + " T" + f1(x0 + 1200) + " " + f1(y) + " T" + f1(x0 + 1600) + " " + f1(y) + '" fill="none" stroke="#e2bd7a" stroke-width="3" opacity="0.55"/>';
        }
        for (var k = 0; k < 70; k++) {
            deco += '<circle cx="' + f1(rnd() * 1600) + '" cy="' + f1(60 + rnd() * 180) + '" r="' + f1(1.5 + rnd() * 3.5) + '" fill="' + (k % 3 ? "#d9b06a" : "#fff4d6") + '" opacity="0.8"/>';
        }
        return svg(1600, 250,
            '<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe6b4"/><stop offset="1" stop-color="#e9c47f"/></linearGradient></defs>' +
            '<path d="M0 40 Q200 8 420 34 T860 26 T1280 34 T1600 22 L1600 250 L0 250 Z" fill="url(#a)"/>' +
            '<path d="M0 40 Q200 8 420 34 T860 26 T1280 34 T1600 22" fill="none" stroke="#fff3d1" stroke-width="6" opacity="0.8"/>' + deco);
    }

    function huecoProgreso() {
        var p = puntosEstrella(40, 42, 32, 15, 5);
        return svg(80, 80, '<path d="' + rutaPuntos(p) + '" fill="#ffffff" fill-opacity="0.25" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" stroke-dasharray="7 6"/>');
    }

    // ------------------------------------------------------------------ lista y rasterizado

    function lista() {
        var l = [
            ["mar", mar(), 0.5],
            ["arrecifeLejano", arrecifeLejano(), 0.5],
            ["arena", arena(), 0.6],
            ["rayo", rayo(), 0.6],
            ["nube", nube(), 1],
            ["gancho", gancho(), 1.6],
            ["polea", polea(), 1.5],
            ["barca", barca(), 1.4],
            ["red", red(), 1.4],
            ["banderin", banderin(), 1.4],
            ["farol", farol(), 1.4],
            ["pez", pez(), 1.2],
            ["silueta", silueta(), 1],
            ["alga", alga(), 1],
            ["algaFina", algaFina(), 1],
            ["coralRama", coralRama(), 1],
            ["coralAbanico", coralAbanico(), 1],
            ["coralTubo", coralTubo(), 1],
            ["coralCerebro", coralCerebro(), 1],
            ["roca", roca(), 1],
            ["piedra", piedra(), 1],
            ["concha", concha(), 1.2],
            ["caracol", caracol(), 1.2],
            ["cofre", cofre(), 1.2],
            ["medusa", medusa(), 1],
            ["burbuja", burbuja(), 1.5],
            ["chispa", chispa(), 1.5],
            ["luz", luz(), 1],
            ["halo", halo(), 1.2],
            ["sombra", sombra(), 1],
            ["hueco", huecoProgreso(), 1.5]
        ];
        Object.keys(COLORES).forEach(function (c) {
            l.push(["estrella_" + c, estrellaMar(c, "normal"), 1.4]);
            l.push(["estrella_" + c + "_c", estrellaMar(c, "cerrados"), 1.4]);
            l.push(["estrella_" + c + "_s", estrellaMar(c, "sorpresa"), 1.4]);
            l.push(["mini_" + c, estrellaMini(c), 1.5]);
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
                console.warn("[DibujosPescador] no se pudo dibujar", clave);
                hecho(false);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
        });
    }

    function preparar() {
        if (!listo) listo = Promise.all(lista().map(function (p) { return rasterizar(p[0], p[1], p[2]); }));
        return listo;
    }

    global.DibujosPescador = {
        preparar: preparar,
        lienzo: function (clave) { return cache[clave] || null; },
        res: function (clave) { return resoluciones[clave] || 1; },
        claves: function () { return Object.keys(cache); },
        colores: function () { return Object.keys(COLORES); },
        svgEstrella: estrellaMar,
        svgBarca: barca
    };
})(typeof window !== "undefined" ? window : global);
