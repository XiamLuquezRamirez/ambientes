/**
 * IconosSimon — ilustraciones SVG de los tres botones de "¡Simón Dice Corporal!" (window.IconosSimon).
 * Dibujos propios (viewBox 200 × 200), con contorno oscuro y colores planos de calcomanía:
 *   cabeza       niño que se toca la cabeza con las dos manos
 *   aplaudir     dos manos que se juntan en un aplauso, con rayitas de palmada
 *   zapatear     dos piernas con zapatos: una golpea el piso y salen ondas
 *   saltar       niño en el aire con las piernas recogidas y polvito bajo los pies
 *   tocarPies    niño agachado que se toca las puntas de los pies con las dos manos
 *   abrirBrazos  niño con los dos brazos bien abiertos en cruz y flechas hacia los lados
 * IconosSimon.svg(id) devuelve el marcado; IconosSimon.dataUri(id) sirve para <img>.
 */
(function (global) {
    "use strict";

    var L = "#3b2a20";          // contorno
    var PIEL = "#ffcfa8";
    var PIEL_SOMBRA = "#f2ad80";
    var PELO = "#9a4a1c";

    var SVG = {};

    SVG.cabeza =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // cuerpo (camiseta) asomando abajo
        '<path d="M52,200 Q56,158 100,154 Q144,158 148,200 Z" fill="#ff922b" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M86,156 L100,172 L114,156" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
        // brazos subiendo hasta la cabeza
        '<path d="M60,170 Q30,140 42,84" fill="none" stroke="' + L + '" stroke-width="26" stroke-linecap="round"/>' +
        '<path d="M60,170 Q30,140 42,84" fill="none" stroke="' + PIEL + '" stroke-width="15" stroke-linecap="round"/>' +
        '<path d="M140,170 Q170,140 158,84" fill="none" stroke="' + L + '" stroke-width="26" stroke-linecap="round"/>' +
        '<path d="M140,170 Q170,140 158,84" fill="none" stroke="' + PIEL + '" stroke-width="15" stroke-linecap="round"/>' +
        // mangas
        '<path d="M48,178 Q50,160 64,156 L72,176 Z" fill="#ff922b" stroke="' + L + '" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M152,178 Q150,160 136,156 L128,176 Z" fill="#ff922b" stroke="' + L + '" stroke-width="5" stroke-linejoin="round"/>' +
        // cabeza
        '<circle cx="100" cy="100" r="50" fill="' + PIEL + '" stroke="' + L + '" stroke-width="6"/>' +
        '<ellipse cx="51" cy="104" rx="9" ry="12" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5"/>' +
        '<ellipse cx="149" cy="104" rx="9" ry="12" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5"/>' +
        // pelo
        '<path d="M52,96 Q50,50 100,46 Q150,48 150,94 Q138,74 118,72 Q122,82 112,86 Q106,72 90,72 Q92,84 80,86 Q76,72 62,80 Q56,86 52,96 Z" fill="' + PELO + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        // cara
        '<ellipse cx="82" cy="104" rx="7" ry="9" fill="' + L + '"/>' +
        '<ellipse cx="118" cy="104" rx="7" ry="9" fill="' + L + '"/>' +
        '<circle cx="84" cy="101" r="2.6" fill="#fff"/><circle cx="120" cy="101" r="2.6" fill="#fff"/>' +
        '<ellipse cx="70" cy="122" rx="9" ry="6" fill="#ff8fab" opacity=".7"/>' +
        '<ellipse cx="130" cy="122" rx="9" ry="6" fill="#ff8fab" opacity=".7"/>' +
        '<path d="M86,124 Q100,140 114,124 Q100,130 86,124 Z" fill="#c92a2a" stroke="' + L + '" stroke-width="5" stroke-linejoin="round"/>' +
        // manos sobre la cabeza
        '<g stroke="' + L + '" stroke-width="5" stroke-linejoin="round" fill="' + PIEL + '">' +
        '<path d="M30,82 Q28,58 50,50 Q60,46 70,52 Q78,58 72,64 Q66,62 62,66 Q72,70 66,78 Q56,80 50,84 Q40,92 30,82 Z"/>' +
        '<path d="M170,82 Q172,58 150,50 Q140,46 130,52 Q122,58 128,64 Q134,62 138,66 Q128,70 134,78 Q144,80 150,84 Q160,92 170,82 Z"/>' +
        '</g>' +
        '<path d="M56,58 Q62,56 66,60 M140,60 Q138,56 144,58" fill="none" stroke="' + PIEL_SOMBRA + '" stroke-width="3" stroke-linecap="round"/>' +
        // estrellitas
        '<path d="M100,10 l5,11 l12,1 l-9,8 l3,12 l-11,-6 l-11,6 l3,-12 l-9,-8 l12,-1 z" fill="#ffe066" stroke="' + L + '" stroke-width="3.5" stroke-linejoin="round"/>' +
        '<path d="M28,30 l3,7 l8,1 l-6,5 l2,8 l-7,-4 l-7,4 l2,-8 l-6,-5 l8,-1 z" fill="#fff" stroke="' + L + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M170,26 l3,7 l8,1 l-6,5 l2,8 l-7,-4 l-7,4 l2,-8 l-6,-5 l8,-1 z" fill="#fff" stroke="' + L + '" stroke-width="3" stroke-linejoin="round"/>' +
        '</svg>';

    function mano(espejo) {
        // mano abierta de perfil (palma hacia la otra mano), dedos hacia arriba
        var t = espejo ? ' transform="translate(200 0) scale(-1 1)"' : "";
        return '<g' + t + '>' +
            '<path d="M96,176 L70,176 Q60,150 62,118 L60,70 Q60,58 70,58 Q80,58 80,70 L80,104 L82,54 Q82,42 93,42 Q104,42 104,54 L102,104 L104,62 Q104,52 113,52 Q122,52 122,62 L118,118 Q124,106 134,104 Q146,104 144,118 Q132,140 116,160 Q106,172 96,176 Z" ' +
            'fill="' + PIEL + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M70,100 L70,82 M92,96 L92,72 M112,100 L112,80" stroke="' + PIEL_SOMBRA + '" stroke-width="4" stroke-linecap="round"/>' +
            '<rect x="64" y="168" width="40" height="22" rx="7" fill="#4dabf7" stroke="' + L + '" stroke-width="6"/>' +
            "</g>";
    }

    SVG.aplaudir =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // estallido detrás de las manos
        '<path d="M100,26 L112,52 L140,40 L132,68 L162,74 L138,92 L160,112 L130,112 L136,142 L112,126 L100,152 L88,126 L64,142 L70,112 L40,112 L62,92 L38,74 L68,68 L60,40 L88,52 Z" fill="#fff3bf" stroke="#ffd43b" stroke-width="4" stroke-linejoin="round"/>' +
        '<g transform="translate(-14 0) rotate(-12 100 120)">' + mano(false) + "</g>" +
        '<g transform="translate(14 0) rotate(12 100 120)">' + mano(true) + "</g>" +
        // rayitas de palmada
        '<g stroke="' + L + '" stroke-width="6" stroke-linecap="round">' +
        '<path d="M100,10 L100,26"/><path d="M62,18 L72,32"/><path d="M138,18 L128,32"/>' +
        '<path d="M30,60 L46,66"/><path d="M170,60 L154,66"/>' +
        "</g>" +
        "</svg>";

    function pierna(x, y, rot, colorZapato) {
        return '<g transform="translate(' + x + " " + y + ") rotate(" + rot + ')">' +
            // pantaloneta
            '<path d="M-22,-70 L22,-70 L24,-36 L-24,-36 Z" fill="#5c7cfa" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
            // pierna
            '<rect x="-12" y="-40" width="24" height="44" rx="10" fill="' + PIEL + '" stroke="' + L + '" stroke-width="6"/>' +
            // media
            '<rect x="-14" y="-6" width="28" height="16" rx="5" fill="#fff" stroke="' + L + '" stroke-width="5"/>' +
            // zapato
            '<path d="M-18,8 L14,8 Q40,10 44,26 Q44,34 34,34 L-20,34 Q-26,34 -26,26 L-24,14 Q-22,8 -18,8 Z" fill="' + colorZapato + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M-26,28 L44,28" stroke="#fff" stroke-width="5"/>' +
            '<path d="M0,14 L10,20 M8,12 L18,18" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>' +
            "</g>";
    }

    SVG.zapatear =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // piso de tarima
        '<path d="M8,178 Q100,164 192,178 L192,196 L8,196 Z" fill="#e8a75d" stroke="' + L + '" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M50,172 L46,196 M100,168 L100,196 M150,172 L154,196" stroke="#b9772e" stroke-width="4"/>' +
        // ondas del golpe
        '<g fill="none" stroke="#ffd43b" stroke-width="6" stroke-linecap="round">' +
        '<path d="M100,182 Q120,166 146,170"/><path d="M110,192 Q140,170 176,176" opacity=".7"/>' +
        "</g>" +
        // pierna de atrás (levantada) y pierna que golpea
        pierna(122, 112, -24, "#2f9e44") +
        pierna(80, 146, 0, "#2f9e44") +
        // rayitas de impacto bajo el zapato
        '<g stroke="' + L + '" stroke-width="6" stroke-linecap="round">' +
        '<path d="M48,184 L36,192"/><path d="M128,186 L140,194"/>' +
        "</g>" +
        // movimiento del pie levantado
        '<g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9">' +
        '<path d="M168,104 Q178,118 172,132"/><path d="M180,96 Q194,116 186,138"/>' +
        "</g>" +
        "</svg>";

    /* ---------------------------------------------------------------- tres movimientos nuevos
     * El mismo niño de "cabeza" (misma piel, mismo pelo, misma camiseta naranja) en otras tres poses, para
     * que los seis botones se lean como el mismo personaje. Cada dibujo arma cuerpo y cabeza con las dos
     * ayudas de abajo y solo cambia brazos, piernas y los adornos propios del movimiento.
     */

    /** Cabeza de frente (pelo, ojos, cachetes y sonrisa) centrada en (cx, cy) con radio r. */
    function carita(cx, cy, r) {
        var e = r * 0.14;            // radio del ojo
        var dx = r * 0.36;           // separación de los ojos
        var oy = cy + r * 0.06;      // altura de los ojos
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + PIEL + '" stroke="' + L + '" stroke-width="6"/>' +
            '<ellipse cx="' + (cx - r) + '" cy="' + (cy + r * 0.1) + '" rx="' + (r * 0.18) + '" ry="' + (r * 0.24) + '" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5"/>' +
            '<ellipse cx="' + (cx + r) + '" cy="' + (cy + r * 0.1) + '" rx="' + (r * 0.18) + '" ry="' + (r * 0.24) + '" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5"/>' +
            '<path d="M' + (cx - r * 0.96) + ',' + (cy - r * 0.1) + ' Q' + (cx - r) + ',' + (cy - r * 1.08) + ' ' + cx + ',' + (cy - r * 1.12) +
            ' Q' + (cx + r) + ',' + (cy - r * 1.06) + ' ' + (cx + r * 0.96) + ',' + (cy - r * 0.14) +
            ' Q' + (cx + r * 0.7) + ',' + (cy - r * 0.54) + ' ' + (cx + r * 0.3) + ',' + (cy - r * 0.6) +
            ' Q' + (cx + r * 0.36) + ',' + (cy - r * 0.38) + ' ' + (cx + r * 0.2) + ',' + (cy - r * 0.32) +
            ' Q' + (cx + r * 0.06) + ',' + (cy - r * 0.6) + ' ' + (cx - r * 0.22) + ',' + (cy - r * 0.58) +
            ' Q' + (cx - r * 0.16) + ',' + (cy - r * 0.34) + ' ' + (cx - r * 0.4) + ',' + (cy - r * 0.32) +
            ' Q' + (cx - r * 0.5) + ',' + (cy - r * 0.56) + ' ' + (cx - r * 0.96) + ',' + (cy - r * 0.1) +
            ' Z" fill="' + PELO + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
            '<ellipse cx="' + (cx - dx) + '" cy="' + oy + '" rx="' + e + '" ry="' + (e * 1.25) + '" fill="' + L + '"/>' +
            '<ellipse cx="' + (cx + dx) + '" cy="' + oy + '" rx="' + e + '" ry="' + (e * 1.25) + '" fill="' + L + '"/>' +
            '<circle cx="' + (cx - dx + e * 0.4) + '" cy="' + (oy - e * 0.5) + '" r="' + (e * 0.36) + '" fill="#fff"/>' +
            '<circle cx="' + (cx + dx + e * 0.4) + '" cy="' + (oy - e * 0.5) + '" r="' + (e * 0.36) + '" fill="#fff"/>' +
            '<ellipse cx="' + (cx - r * 0.62) + '" cy="' + (cy + r * 0.44) + '" rx="' + (r * 0.19) + '" ry="' + (r * 0.12) + '" fill="#ff8fab" opacity=".7"/>' +
            '<ellipse cx="' + (cx + r * 0.62) + '" cy="' + (cy + r * 0.44) + '" rx="' + (r * 0.19) + '" ry="' + (r * 0.12) + '" fill="#ff8fab" opacity=".7"/>' +
            '<path d="M' + (cx - r * 0.3) + ',' + (cy + r * 0.48) + ' Q' + cx + ',' + (cy + r * 0.82) + ' ' + (cx + r * 0.3) + ',' + (cy + r * 0.48) +
            ' Q' + cx + ',' + (cy + r * 0.6) + ' ' + (cx - r * 0.3) + ',' + (cy + r * 0.48) + ' Z" fill="#c92a2a" stroke="' + L + '" stroke-width="5" stroke-linejoin="round"/>';
    }

    /** Brazo o pierna de un trazo: contorno grueso oscuro y piel encima (mismo truco que en "cabeza"). */
    function miembro(d, grosor) {
        var g = grosor || 15;
        return '<path d="' + d + '" fill="none" stroke="' + L + '" stroke-width="' + (g + 11) + '" stroke-linecap="round"/>' +
            '<path d="' + d + '" fill="none" stroke="' + PIEL + '" stroke-width="' + g + '" stroke-linecap="round"/>';
    }

    SVG.saltar =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // piso y polvito del despegue
        '<path d="M14,192 Q100,184 186,192" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round" opacity=".55"/>' +
        '<g fill="#ffe066" stroke="' + L + '" stroke-width="3.5" stroke-linejoin="round">' +
        '<ellipse cx="58" cy="186" rx="16" ry="7"/><ellipse cx="142" cy="186" rx="16" ry="7"/>' +
        '<ellipse cx="100" cy="192" rx="12" ry="5"/>' +
        '</g>' +
        // flechas de impulso hacia arriba
        '<g fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' +
        '<path d="M28,152 L28,116"/><path d="M20,126 L28,114 L36,126"/>' +
        '<path d="M172,152 L172,116"/><path d="M164,126 L172,114 L180,126"/>' +
        '</g>' +
        // piernas recogidas en el aire (rodillas dobladas hacia afuera)
        miembro('M86,140 Q76,166 52,168', 17) +
        miembro('M114,140 Q124,166 148,168', 17) +
        // zapatos
        '<path d="M58,156 Q38,158 34,172 Q34,180 44,180 L64,180 Q72,180 72,172 L70,162 Q66,156 58,156 Z" fill="#4dabf7" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M142,156 Q162,158 166,172 Q166,180 156,180 L136,180 Q128,180 128,172 L130,162 Q134,156 142,156 Z" fill="#4dabf7" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        // cuerpo (camiseta)
        '<path d="M74,148 Q70,108 100,102 Q130,108 126,148 Z" fill="#ff922b" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M88,106 L100,120 L112,106" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        // brazos en alto, abiertos en V
        miembro('M80,116 Q54,98 48,66') +
        miembro('M120,116 Q146,98 152,66') +
        // manos
        '<circle cx="46" cy="60" r="13" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>' +
        '<circle cx="154" cy="60" r="13" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>' +
        // cabeza
        carita(100, 64, 32) +
        // estrellita de salto
        '<path d="M100,10 l4,9 l10,1 l-7,7 l2,10 l-9,-5 l-9,5 l2,-10 l-7,-7 l10,-1 z" fill="#ffe066" stroke="' + L + '" stroke-width="3.2" stroke-linejoin="round"/>' +
        '</svg>';

    SVG.tocarPies =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // piso
        '<path d="M12,186 Q100,178 188,186" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round" opacity=".55"/>' +
        // piernas rectas, juntas al centro
        miembro('M88,126 L86,158', 17) +
        miembro('M112,126 L114,158', 17) +
        // zapatos (puntas hacia afuera)
        '<path d="M86,156 L62,156 Q52,156 52,165 Q52,176 62,176 L88,176 Q96,176 96,168 Q96,158 86,156 Z" fill="#4dabf7" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M114,156 L138,156 Q148,156 148,165 Q148,176 138,176 L112,176 Q104,176 104,168 Q104,158 114,156 Z" fill="#4dabf7" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        // brazos largos y abiertos: salen del hombro y bajan por fuera hasta los zapatos
        miembro('M80,96 Q52,118 58,152', 15) +
        miembro('M120,96 Q148,118 142,152', 15) +
        // tronco corto (agachado), por delante de las piernas y entre los brazos
        '<path d="M82,128 Q78,100 100,94 Q122,100 118,128 Q100,134 82,128 Z" fill="#ff922b" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M92,99 L100,108 L108,99" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
        // manos tocando la punta de cada zapato
        '<circle cx="58" cy="158" r="13" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>' +
        '<circle cx="142" cy="158" r="13" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>' +
        // cabeza agachada, mirando al frente
        carita(100, 60, 30) +
        // flechas que bajan a los lados
        '<g fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' +
        '<path d="M20,100 L20,140"/><path d="M12,128 L20,142 L28,128"/>' +
        '<path d="M180,100 L180,140"/><path d="M172,128 L180,142 L188,128"/>' +
        '</g>' +
        '</svg>';

    SVG.abrirBrazos =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // piso
        '<path d="M10,186 Q100,176 190,186" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round" opacity=".55"/>' +
        // piernas de pie
        miembro('M85,146 L83,170', 18) +
        miembro('M115,146 L117,170', 18) +
        // zapatos
        '<path d="M69,166 L95,166 Q101,166 101,174 Q101,182 93,182 L65,182 Q59,182 59,176 Q61,168 69,166 Z" fill="#4dabf7" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M131,166 L105,166 Q99,166 99,174 Q99,182 107,182 L135,182 Q141,182 141,176 Q139,168 131,166 Z" fill="#4dabf7" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        // cuerpo
        '<path d="M76,152 Q72,116 100,110 Q128,116 124,152 Z" fill="#ff922b" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M88,114 L100,128 L112,114" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        // brazos bien abiertos en cruz, horizontales
        miembro('M80,124 L30,118', 15) +
        miembro('M120,124 L170,118', 15) +
        // manos abiertas a los lados
        '<circle cx="24" cy="117" r="14" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>' +
        '<circle cx="176" cy="117" r="14" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>' +
        '<path d="M16,110 Q22,106 28,110 M172,110 Q178,106 184,110" fill="none" stroke="' + PIEL_SOMBRA + '" stroke-width="3.5" stroke-linecap="round"/>' +
        // cabeza
        carita(100, 74, 32) +
        // flechas que se abren hacia los lados
        '<g fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' +
        '<path d="M58,152 L22,152"/><path d="M34,142 L20,152 L34,162"/>' +
        '<path d="M142,152 L178,152"/><path d="M166,142 L180,152 L166,162"/>' +
        '</g>' +
        // estrellita arriba
        '<path d="M100,14 l4,9 l10,1 l-7,7 l2,10 l-9,-5 l-9,5 l2,-10 l-7,-7 l10,-1 z" fill="#ffe066" stroke="' + L + '" stroke-width="3.2" stroke-linejoin="round"/>' +
        '</svg>';

    var cache = {};

    function dataUri(id) {
        if (!SVG[id]) return "";
        if (!cache[id]) cache[id] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG[id]);
        return cache[id];
    }

    global.IconosSimon = {
        SVG: SVG,
        svg: function (id) { return SVG[id] || ""; },
        dataUri: dataUri
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.IconosSimon;
})(typeof window !== "undefined" ? window : globalThis);
