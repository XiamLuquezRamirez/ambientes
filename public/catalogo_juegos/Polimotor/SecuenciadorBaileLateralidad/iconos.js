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


    SVG.aplaudir =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        // piernas firmes
        miembro('M88,152 L86,168', 17) +
        miembro('M112,152 L114,168', 17) +
        zapato(80, 166, false) +
        zapato(120, 166, true) +
        cuerpo(154) +
        // destello de la palmada, delante del cuerpo y detrás de las manos
        '<path d="M100,76 L108,96 L128,88 L120,108 L142,114 L122,126 L138,142 L116,140 L118,160 L100,148 L82,160 L84,140 L62,142 L78,126 L58,114 L80,108 L72,88 L92,96 Z" fill="#fff3bf" stroke="#ffd43b" stroke-width="4" stroke-linejoin="round"/>' +
        // brazos que se juntan al frente, a la altura del pecho
        miembro('M78,120 Q62,134 86,128') +
        miembro('M122,120 Q138,134 114,128') +
        // las dos manos chocando en el centro
        mano(90, 126, 13) +
        mano(110, 126, 13) +
        carita(100, 70, 31) +
        // rayitas de la palmada
        '<g stroke="#ffd43b" stroke-width="6" stroke-linecap="round">' +
        '<path d="M40,104 L24,100"/><path d="M160,104 L176,100"/>' +
        '<path d="M46,80 L32,70"/><path d="M154,80 L168,70"/>' +
        '<path d="M48,140 L34,148"/><path d="M152,140 L166,148"/>' +
        '</g>' +
        '</svg>';

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

    SVG.pies =
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


    /* ---------------------------------------------------------------- comandos del Secuenciador
     * Los diez movimientos que no tenía Simón Dice, con el mismo niño (piel, pelo y camiseta naranja) para que
     * los dieciséis botones se lean como el mismo personaje. Los cuatro de lateralidad llevan además una
     * flecha y la insignia del lado (D / I), porque el acierto depende de distinguir derecha de izquierda.
     */

    /** Piso de apoyo, igual en todos los dibujos. */
    function piso() {
        return '<path d="M12,186 Q100,178 188,186" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round" opacity=".55"/>';
    }

    /** Cuerpo con camiseta naranja y el cuello en V. */
    function cuerpo(y) {
        var t = y || 150;
        return '<path d="M74,' + t + ' Q70,110 100,104 Q130,110 126,' + t + ' Z" fill="#ff922b" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
            '<path d="M88,108 L100,122 L112,108" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>';
    }

    /** Mano (círculo de piel). */
    function mano(cx, cy, r) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r || 13) + '" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>';
    }

    /** Zapato azul; `mirarDerecha` decide hacia qué lado apunta la punta. */
    function zapato(cx, cy, mirarDerecha) {
        var k = mirarDerecha ? 1 : -1;
        var d = 'M' + cx + ',' + cy +
            ' Q' + (cx + 20 * k) + ',' + (cy + 2) + ' ' + (cx + 24 * k) + ',' + (cy + 16) +
            ' Q' + (cx + 24 * k) + ',' + (cy + 24) + ' ' + (cx + 14 * k) + ',' + (cy + 24) +
            ' L' + (cx - 6 * k) + ',' + (cy + 24) +
            ' Q' + (cx - 14 * k) + ',' + (cy + 24) + ' ' + (cx - 14 * k) + ',' + (cy + 16) +
            ' L' + (cx - 12 * k) + ',' + (cy + 6) +
            ' Q' + (cx - 8 * k) + ',' + cy + ' ' + cx + ',' + cy + ' Z';
        return '<path d="' + d + '" fill="#4dabf7" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>';
    }

    /** Insignia del lado: círculo con la letra D o I. */
    function insigniaLado(cx, cy, letra, color) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="21" fill="' + color + '" stroke="' + L + '" stroke-width="5"/>' +
            '<text x="' + cx + '" y="' + (cy + 9) + '" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="26" font-weight="bold" fill="#fff">' + letra + '</text>';
    }

    /** Flecha circular que indica el sentido del giro. */
    function flechaGiro() {
        return '<g fill="none" stroke="#ffd43b" stroke-width="8" stroke-linecap="round">' +
            '<path d="M44,116 A58,58 0 1 1 156,116"/>' +
            '</g>' +
            '<path d="M156,96 L160,122 L136,114 Z" fill="#ffd43b" stroke="' + L + '" stroke-width="4" stroke-linejoin="round"/>';
    }

    // --- manos a la cintura: brazos en jarra, los codos bien separados del torso
    SVG.cintura =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        miembro('M88,152 L86,168', 17) +
        miembro('M112,152 L114,168', 17) +
        zapato(80, 166, false) +
        zapato(120, 166, true) +
        cuerpo(154) +
        // codos muy abiertos: del hombro hacia afuera y de vuelta a la cadera
        miembro('M78,120 Q34,126 42,152 Q56,162 74,148') +
        miembro('M122,120 Q166,126 158,152 Q144,162 126,148') +
        mano(74, 146, 12) +
        mano(126, 146, 12) +
        carita(100, 68, 32) +
        '</svg>';

    // --- estirarse arriba: brazos rectos y juntos, de puntillas (se distingue del salto)
    SVG.estirarse =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        miembro('M90,152 L88,170', 17) +
        miembro('M110,152 L112,170', 17) +
        zapato(84, 168, false) +
        zapato(116, 168, true) +
        cuerpo(154) +
        // rectos y casi verticales, muy juntos arriba
        miembro('M84,118 L90,34') +
        miembro('M116,118 L110,34') +
        mano(90, 26) +
        mano(110, 26) +
        carita(100, 78, 29) +
        // flechas de estiramiento a los lados
        '<g fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' +
        '<path d="M40,96 L40,42"/><path d="M30,54 L40,40 L50,54"/>' +
        '<path d="M160,96 L160,42"/><path d="M150,54 L160,40 L170,54"/>' +
        '</g>' +
        '</svg>';

    // --- brazo DERECHO arriba (el derecho del niño cae a la izquierda de quien mira)
    SVG.brazoDerecho =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        miembro('M88,152 L86,168', 17) +
        miembro('M112,152 L114,168', 17) +
        zapato(80, 166, false) +
        zapato(120, 166, true) +
        cuerpo(154) +
        // brazo levantado bien separado del torso; el otro cuelga abierto
        miembro('M78,118 L54,40') +
        miembro('M122,120 Q144,142 146,162') +
        mano(52, 32) +
        mano(147, 166, 12) +
        carita(100, 72, 31) +
        '<g fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' +
        '<path d="M26,92 L26,48"/><path d="M16,60 L26,46 L36,60"/>' +
        '</g>' +
        insigniaLado(168, 44, 'D', '#e8590c') +
        '</svg>';

    // --- brazo IZQUIERDO arriba
    SVG.brazoIzquierdo =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        miembro('M88,152 L86,168', 17) +
        miembro('M112,152 L114,168', 17) +
        zapato(80, 166, false) +
        zapato(120, 166, true) +
        cuerpo(154) +
        miembro('M122,118 L146,40') +
        miembro('M78,120 Q56,142 54,162') +
        mano(148, 32) +
        mano(53, 166, 12) +
        carita(100, 72, 31) +
        '<g fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' +
        '<path d="M174,92 L174,48"/><path d="M164,60 L174,46 L184,60"/>' +
        '</g>' +
        insigniaLado(32, 44, 'I', '#1c7ed6') +
        '</svg>';

    // --- pie DERECHO arriba: rodilla al frente bien marcada
    SVG.pieDerecho =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        // pierna de apoyo, recta al piso
        miembro('M112,152 L118,170', 17) +
        zapato(124, 168, true) +
        cuerpo(154) +
        // pierna levantada: muslo al frente y pantorrilla colgando
        miembro('M88,150 Q52,146 46,122', 18) +
        zapato(42, 112, false) +
        // brazos abiertos para el equilibrio
        miembro('M78,120 Q50,138 46,160') +
        miembro('M122,120 Q150,138 154,160') +
        mano(45, 164, 12) +
        mano(155, 164, 12) +
        carita(100, 72, 31) +
        '<g fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' +
        '<path d="M22,156 L22,114"/><path d="M12,126 L22,112 L32,126"/>' +
        '</g>' +
        insigniaLado(170, 120, 'D', '#d6336c') +
        '</svg>';

    // --- pie IZQUIERDO arriba
    SVG.pieIzquierdo =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        miembro('M88,152 L82,170', 17) +
        zapato(76, 168, false) +
        cuerpo(154) +
        miembro('M112,150 Q148,146 154,122', 18) +
        zapato(158, 112, true) +
        miembro('M78,120 Q50,138 46,160') +
        miembro('M122,120 Q150,138 154,160') +
        mano(45, 164, 12) +
        mano(155, 164, 12) +
        carita(100, 72, 31) +
        '<g fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' +
        '<path d="M178,156 L178,114"/><path d="M168,126 L178,112 L188,126"/>' +
        '</g>' +
        insigniaLado(30, 120, 'I', '#0ca678') +
        '</svg>';

    // --- salto con un pie: en el aire, una pierna recogida y la otra estirada
    SVG.saltarUnPie =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        '<path d="M14,194 Q100,186 186,194" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round" opacity=".55"/>' +
        '<g fill="#ffe066" stroke="' + L + '" stroke-width="3.5" stroke-linejoin="round">' +
        '<ellipse cx="120" cy="190" rx="18" ry="7"/><ellipse cx="84" cy="194" rx="11" ry="5"/>' +
        '</g>' +
        cuerpo(144) +
        // pierna estirada hacia abajo
        miembro('M112,140 L122,168', 17) +
        zapato(128, 164, true) +
        // pierna recogida, rodilla al frente
        miembro('M88,140 Q56,138 50,116', 18) +
        zapato(46, 106, false) +
        // brazos en alto, abiertos
        miembro('M78,112 Q48,94 44,60') +
        miembro('M122,112 Q152,98 156,70') +
        mano(42, 52) +
        mano(158, 62) +
        carita(100, 64, 31) +
        '<path d="M100,10 l4,9 l10,1 l-7,7 l2,10 l-9,-5 l-9,5 l2,-10 l-7,-7 l10,-1 z" fill="#ffe066" stroke="' + L + '" stroke-width="3.2" stroke-linejoin="round"/>' +
        '</svg>';

    // --- giro corporal: el niño de frente con la flecha circular girando a sus pies. Se dibuja de frente
    // (misma carita que los demás) porque un perfil a esta escala se lee peor que la flecha del giro.
    SVG.girar =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        // anillo del giro alrededor de los pies, abierto para que se vea el sentido
        '<ellipse cx="100" cy="172" rx="76" ry="19" fill="none" stroke="#ffd43b" stroke-width="8" stroke-linecap="round" stroke-dasharray="112 54"/>' +
        '<path d="M168,158 L184,172 L164,180 Z" fill="#ffd43b" stroke="' + L + '" stroke-width="4" stroke-linejoin="round"/>' +
        // piernas juntas, como a mitad de giro
        miembro('M92,152 L88,168', 17) +
        miembro('M108,152 L114,168', 17) +
        zapato(82, 166, false) +
        zapato(118, 166, true) +
        cuerpo(154) +
        // brazos extendidos a los lados, acompañando el giro (sin cruzar la cara)
        miembro('M78,122 Q46,128 36,142') +
        miembro('M122,122 Q154,128 164,142') +
        mano(33, 146) +
        mano(167, 146) +
        carita(100, 70, 31) +
        // flechitas de rotación junto a la cabeza
        '<g fill="none" stroke="#ffd43b" stroke-width="6" stroke-linecap="round">' +
        '<path d="M46,54 Q62,32 88,28"/><path d="M80,20 L92,28 L82,38"/>' +
        '<path d="M154,54 Q138,32 112,28"/><path d="M120,20 L108,28 L118,38"/>' +
        '</g>' +
        '</svg>';

    // --- bailar: cadera al lado, una mano al cielo y una pierna cruzada
    SVG.bailar =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        cuerpo(156) +
        // una pierna apoyada y la otra cruzada al frente
        miembro('M110,154 L118,170', 17) +
        zapato(124, 168, true) +
        miembro('M90,154 Q70,166 56,164', 17) +
        zapato(50, 160, false) +
        // un brazo al cielo, el otro en la cintura con el codo abierto
        miembro('M122,118 L150,48') +
        miembro('M78,120 Q38,128 46,152 Q60,162 76,148') +
        mano(152, 40) +
        mano(76, 146, 12) +
        carita(100, 72, 31) +
        '<g fill="#ffe066" stroke="' + L + '" stroke-width="3.4" stroke-linejoin="round">' +
        '<circle cx="30" cy="52" r="9"/><path d="M39,52 L39,20 L54,24 L54,32 L39,28"/>' +
        '<circle cx="32" cy="98" r="7"/><path d="M39,98 L39,74 L50,77 L50,83 L39,80"/>' +
        '</g>' +
        '</svg>';

    // --- marchar en el sitio: rodilla alta al frente y brazos alternados
    SVG.marchar =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        piso() +
        // pierna de apoyo
        miembro('M112,152 L118,170', 17) +
        zapato(124, 168, true) +
        cuerpo(154) +
        // rodilla levantada bien al frente
        miembro('M88,150 Q54,144 50,120', 18) +
        zapato(46, 110, false) +
        // brazos alternados: uno adelante-arriba, el otro atrás-abajo
        miembro('M78,118 Q50,104 46,78') +
        miembro('M122,120 Q148,140 150,162') +
        mano(44, 70) +
        mano(151, 166, 12) +
        carita(100, 72, 31) +
        '<g fill="none" stroke="#ffd43b" stroke-width="6" stroke-linecap="round" opacity=".9">' +
        '<path d="M172,136 L188,136"/><path d="M168,152 L184,152"/><path d="M176,120 L190,120"/>' +
        '</g>' +
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
