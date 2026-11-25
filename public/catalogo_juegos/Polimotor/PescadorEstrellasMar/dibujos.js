/**
 * DibujosPescador — dibujos propios de "El Pescador de Estrellas de Mar" (window.DibujosPescador).
 *
 * Todo es SVG propio rasterizado UNA vez a <canvas> por preparar(); la escena los convierte en texturas.
 * Los peces y la decoración del fondo (algas, corales, rocas, conchas, caracoles, medusas, arrecife lejano y
 * burbujas) vienen de marinos.js, con el estilo sin bordes del Viaje del Pez y su color propio (solo el pececito y
 * el arrecife lejano se tiñen). Las piezas de luz (chispas, halos, banderines) se dibujan en blanco y Phaser las
 * tiñe. Las estrellas de mar, la barca, el gancho, la polea y el cofre llevan su color propio. Cada estrella tiene tres caras: normal, ojos cerrados (parpadeo) y sorpresa (al ser atrapada).
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

    // ------------------------------------------------------------------ vida marina y decoración (estilo del Viaje del Pez)

    /** SVG de marinos.js con su tamaño de diseño (el del viewBox, o el que se pida). */
    function marino(clave, w, h) {
        var t = global.MarinosPescador.SVG[clave];
        var m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(t);
        return t.replace("<svg ", '<svg width="' + (w || m[1]) + '" height="' + (h || m[2]) + '" ');
    }

    /** Cofre del tesoro abierto, sin bordes (volumen con degradados, como el resto del fondo). */
    function cofre() {
        return svg(200, 170,
            '<defs>' +
            '<linearGradient id="ma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9894a"/><stop offset=".55" stop-color="#a0522d"/><stop offset="1" stop-color="#5c2b0c"/></linearGradient>' +
            '<linearGradient id="ta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c0703a"/><stop offset="1" stop-color="#6b3410"/></linearGradient>' +
            '<linearGradient id="or" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8a10c"/><stop offset=".4" stop-color="#fff3bf"/><stop offset=".6" stop-color="#ffd43b"/><stop offset="1" stop-color="#d08a00"/></linearGradient>' +
            '<radialGradient id="mo" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#fffbe6"/><stop offset=".55" stop-color="#ffd43b"/><stop offset="1" stop-color="#e67700"/></radialGradient>' +
            '<radialGradient id="pe" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f1f3f5"/><stop offset="1" stop-color="#b8c4d2"/></radialGradient>' +
            '<radialGradient id="ge" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffdeeb"/><stop offset=".55" stop-color="#f06595"/><stop offset="1" stop-color="#a61e4d"/></radialGradient>' +
            '<radialGradient id="so" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#08305a" stop-opacity=".4"/><stop offset="1" stop-color="#08305a" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="vol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>' +
            '</defs>' +
            '<ellipse cx="100" cy="162" rx="96" ry="9" fill="url(#so)"/>' +
            // tapa abierta (detrás) con su borde dorado
            '<path d="M22 66 Q100 -8 178 66 Z" fill="url(#ta)"/><path d="M22 66 Q100 -8 178 66 Z" fill="url(#vol)"/>' +
            '<path d="M34 62 Q100 4 166 62 L160 64 Q100 14 40 64 Z" fill="url(#or)"/>' +
            '<path d="M46 50 Q76 22 112 18 Q78 30 46 50 Z" fill="#fff" opacity=".35"/>' +
            // tesoro que asoma: monedas, perla y gema
            '<circle cx="70" cy="72" r="13" fill="url(#mo)"/><circle cx="96" cy="67" r="14" fill="url(#mo)"/><circle cx="124" cy="72" r="13" fill="url(#mo)"/>' +
            '<circle cx="110" cy="58" r="9" fill="url(#pe)"/><circle cx="84" cy="57" r="8" fill="url(#ge)"/>' +
            '<g fill="#fff" opacity=".85"><circle cx="66" cy="67" r="3"/><circle cx="92" cy="61" r="3.2"/><circle cx="120" cy="67" r="3"/><circle cx="107" cy="55" r="2.4"/></g>' +
            // caja con tablas en relieve, herrajes y cerradura
            '<rect x="20" y="74" width="160" height="84" rx="12" fill="url(#ma)"/><rect x="20" y="74" width="160" height="84" rx="12" fill="url(#vol)"/>' +
            '<g fill="#5c2b0c" opacity=".35"><rect x="20" y="98" width="160" height="5"/><rect x="20" y="130" width="160" height="5"/></g>' +
            '<g fill="#fff" opacity=".18"><rect x="20" y="103" width="160" height="3"/><rect x="20" y="135" width="160" height="3"/></g>' +
            '<rect x="46" y="74" width="16" height="84" fill="url(#or)"/><rect x="138" y="74" width="16" height="84" fill="url(#or)"/>' +
            '<rect x="84" y="90" width="32" height="34" rx="9" fill="url(#mo)"/>' +
            '<path d="M100 100 a5 5 0 1 1 -0.1 0 Z M97 106 L103 106 L102 116 L98 116 Z" fill="#6b3410"/>' +
            '<path d="M28 82 Q60 76 104 78 Q60 82 28 90 Z" fill="#fff" opacity=".3"/>');
    }

    // ------------------------------------------------------------------ luz, burbujas y brillos

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
            ["arrecifeLejano", marino("arrecifeLejano"), 1],
            ["arena", arena(), 0.6],
            ["rayo", rayo(), 0.6],
            ["nube", nube(), 1],
            ["gancho", gancho(), 1.6],
            ["polea", polea(), 1.5],
            ["barca", barca(), 1.4],
            ["red", red(), 1.4],
            ["banderin", banderin(), 1.4],
            ["farol", farol(), 1.4],
            ["pececito", marino("pececito"), 1.6],
            ["pezCirujano", marino("pezCirujano"), 1.4],
            ["pezAngel", marino("pezAngel"), 1.4],
            ["pezGlobo", marino("pezGlobo"), 1.4],
            ["pezMariposa", marino("pezMariposa"), 1.4],
            ["tortuga", marino("tortuga"), 1.2],
            ["alga", marino("alga"), 1.9],
            ["algaLarga", marino("algaLarga"), 1.7],
            ["coralAbanico", marino("coralAbanico"), 1.6],
            ["coralTubos", marino("coralTubos"), 1.7],
            ["anemona", marino("anemona"), 1.6],
            ["roca", marino("roca"), 1.2],
            ["rocaPlana", marino("rocaPlana"), 1.2],
            ["concha", marino("concha"), 0.6],
            ["caracol", marino("caracol"), 1],
            ["cofre", cofre(), 1.2],
            ["medusa", marino("medusa"), 1.3],
            ["burbuja", marino("burbuja", 64, 64), 1.5],
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
