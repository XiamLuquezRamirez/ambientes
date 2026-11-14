/**
 * IconosPista — ilustraciones SVG de las seis baldosas de "¡La Pista de Ritmo y Pasos Mágicos!"
 * (window.IconosPista). Dibujos propios (viewBox 200 × 200), con contorno oscuro y colores planos de
 * calcomanía, pensados para verse grandes en la baldosa y pequeños en las ranuras de la secuencia:
 *   pie       huella de pie descalzo vista desde arriba
 *   mano      mano abierta de frente, saludando
 *   carita    carita sonriente con cachetes
 *   rodilla   pierna doblada con la rodilla marcada
 *   hombro    torso con el hombro levantado y una mano que lo toca
 *   barriga   barriga con el ombligo y dos manos que la tocan
 * IconosPista.svg(id) devuelve el marcado; IconosPista.dataUri(id) sirve para <img>.
 */
(function (global) {
    "use strict";

    var L = "#3b2a20";          // contorno
    var PIEL = "#ffcfa8";
    var PIEL_SOMBRA = "#f2ad80";
    var PELO = "#9a4a1c";

    var SVG = {};

    // ------------------------------------------------------------------ pie (huella descalza)

    SVG.pie =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // planta del pie
        '<path d="M100,24 Q140,30 148,78 Q154,112 136,140 Q128,154 128,166 Q128,186 100,186 Q72,186 72,166 Q72,154 64,140 Q46,112 52,78 Q60,30 100,24 Z" ' +
        'fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // sombra interior de la planta
        '<path d="M100,46 Q128,52 132,84 Q136,110 122,132 Q112,146 112,160 Q112,172 100,172 Q88,172 88,160 Q88,146 78,132 Q64,110 68,84 Q72,52 100,46 Z" ' +
        'fill="' + PIEL_SOMBRA + '" opacity=".45"/>' +
        // deditos
        '<ellipse cx="100" cy="24" rx="17" ry="14" fill="' + PIEL + '" stroke="' + L + '" stroke-width="6"/>' +
        '<ellipse cx="68" cy="34" rx="12" ry="10" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>' +
        '<ellipse cx="132" cy="34" rx="12" ry="10" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5.5"/>' +
        '<ellipse cx="46" cy="52" rx="10" ry="9" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5"/>' +
        '<ellipse cx="154" cy="52" rx="10" ry="9" fill="' + PIEL + '" stroke="' + L + '" stroke-width="5"/>' +
        // brillo del talón
        '<ellipse cx="100" cy="162" rx="16" ry="11" fill="#fff" opacity=".35"/>' +
        '</svg>';

    // ------------------------------------------------------------------ mano abierta de frente

    SVG.mano =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // palma
        '<path d="M58,120 Q54,86 62,76 Q72,66 80,78 L84,96 L84,44 Q84,30 97,30 Q110,30 110,44 L110,92 L112,38 Q112,24 125,24 Q138,24 138,38 L136,94 L140,56 Q142,42 154,44 Q166,46 164,60 L158,122 Q154,158 126,172 Q104,182 86,172 Q68,162 58,120 Z" ' +
        'fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // líneas de los dedos
        '<g stroke="' + PIEL_SOMBRA + '" stroke-width="4.5" stroke-linecap="round" fill="none">' +
        '<path d="M84,104 L84,70"/><path d="M110,100 L110,56"/><path d="M136,102 L136,52"/><path d="M156,112 L158,76"/>' +
        "</g>" +
        // muñeca con manilla
        '<path d="M80,170 Q100,182 124,170 L128,190 Q102,200 76,190 Z" fill="' + PIEL + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<rect x="74" y="176" width="56" height="16" rx="7" fill="#e03131" stroke="' + L + '" stroke-width="5.5"/>' +
        // rayitas de saludo
        '<g stroke="' + L + '" stroke-width="6" stroke-linecap="round">' +
        '<path d="M30,66 L16,58"/><path d="M28,96 L12,96"/><path d="M34,126 L19,133"/>' +
        "</g>" +
        '</svg>';

    // ------------------------------------------------------------------ carita sonriente

    SVG.carita =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        '<circle cx="100" cy="104" r="76" fill="' + PIEL + '" stroke="' + L + '" stroke-width="7"/>' +
        // orejas
        '<ellipse cx="25" cy="108" rx="13" ry="18" fill="' + PIEL + '" stroke="' + L + '" stroke-width="6"/>' +
        '<ellipse cx="175" cy="108" rx="13" ry="18" fill="' + PIEL + '" stroke="' + L + '" stroke-width="6"/>' +
        // pelo
        '<path d="M26,98 Q22,26 100,22 Q178,26 174,98 Q158,66 128,62 Q134,76 118,80 Q110,62 90,62 Q94,78 76,80 Q70,62 50,72 Q34,80 26,98 Z" ' +
        'fill="' + PELO + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // ojos
        '<ellipse cx="74" cy="104" rx="10" ry="13" fill="' + L + '"/>' +
        '<ellipse cx="126" cy="104" rx="10" ry="13" fill="' + L + '"/>' +
        '<circle cx="77" cy="99" r="3.8" fill="#fff"/><circle cx="129" cy="99" r="3.8" fill="#fff"/>' +
        // cejas
        '<path d="M60,84 Q74,76 88,84" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M112,84 Q126,76 140,84" fill="none" stroke="' + L + '" stroke-width="6" stroke-linecap="round"/>' +
        // cachetes
        '<ellipse cx="56" cy="128" rx="13" ry="9" fill="#ff8fab" opacity=".75"/>' +
        '<ellipse cx="144" cy="128" rx="13" ry="9" fill="#ff8fab" opacity=".75"/>' +
        // boca sonriente
        '<path d="M70,130 Q100,166 130,130 Q100,144 70,130 Z" fill="#c92a2a" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M80,134 Q100,140 120,134" fill="#fff" stroke="none"/>' +
        // notita musical
        '<g transform="translate(166 34)">' +
        '<path d="M0,26 L0,2 L18,0 L18,22" fill="none" stroke="' + L + '" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="-5" cy="27" r="7" fill="#ffd43b" stroke="' + L + '" stroke-width="4.5"/>' +
        '<circle cx="13" cy="23" r="7" fill="#ffd43b" stroke="' + L + '" stroke-width="4.5"/>' +
        "</g>" +
        '</svg>';

    // ------------------------------------------------------------------ rodilla (pierna doblada)

    SVG.rodilla =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // pantaloneta
        '<path d="M34,14 L104,14 L110,58 L40,66 Z" fill="#2f9e44" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // muslo
        '<path d="M44,56 L108,50 Q140,54 142,92 L104,100 Q84,74 46,82 Z" fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // rodilla (rótula)
        '<circle cx="128" cy="104" r="30" fill="' + PIEL + '" stroke="' + L + '" stroke-width="7"/>' +
        '<circle cx="128" cy="104" r="16" fill="' + PIEL_SOMBRA + '" opacity=".6"/>' +
        '<path d="M116,96 Q128,90 140,98" fill="none" stroke="' + PIEL_SOMBRA + '" stroke-width="4.5" stroke-linecap="round"/>' +
        // pantorrilla hacia abajo
        '<path d="M108,126 Q136,138 128,176 L92,176 Q92,142 100,124 Z" fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // media y zapato
        '<rect x="88" y="162" width="46" height="18" rx="6" fill="#fff" stroke="' + L + '" stroke-width="6"/>' +
        '<path d="M86,178 L128,178 Q156,180 160,194 L82,194 Q78,186 86,178 Z" fill="#2f9e44" stroke="' + L + '" stroke-width="6.5" stroke-linejoin="round"/>' +
        // rayitas de golpe en la rodilla
        '<g stroke="' + L + '" stroke-width="6" stroke-linecap="round">' +
        '<path d="M172,78 L186,70"/><path d="M176,106 L192,106"/><path d="M170,132 L184,142"/>' +
        "</g>" +
        '</svg>';

    // ------------------------------------------------------------------ hombro (mano tocando el hombro)

    SVG.hombro =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // cabeza asomando arriba
        '<circle cx="100" cy="44" r="30" fill="' + PIEL + '" stroke="' + L + '" stroke-width="7"/>' +
        '<path d="M72,40 Q70,12 100,10 Q130,12 128,40 Q120,26 104,24 Q106,32 96,34 Q90,24 80,28 Q74,32 72,40 Z" fill="' + PELO + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<circle cx="90" cy="46" r="4.5" fill="' + L + '"/><circle cx="110" cy="46" r="4.5" fill="' + L + '"/>' +
        '<path d="M90,58 Q100,66 110,58" fill="none" stroke="' + L + '" stroke-width="5" stroke-linecap="round"/>' +
        // torso con camiseta
        '<path d="M58,92 Q62,74 100,70 Q138,74 142,92 L150,172 Q100,186 50,172 Z" fill="#7048e8" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // hombro izquierdo levantado (el que se toca), resaltado
        '<path d="M58,92 Q40,96 34,122 L62,132 Q62,108 72,98 Z" fill="#9775fa" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        '<circle cx="52" cy="112" r="11" fill="#fff" opacity=".45"/>' +
        // brazo derecho cruzando hasta el hombro izquierdo
        '<path d="M142,98 Q164,112 156,134 Q146,154 110,140 Q86,132 70,116" fill="none" stroke="' + L + '" stroke-width="26" stroke-linecap="round"/>' +
        '<path d="M142,98 Q164,112 156,134 Q146,154 110,140 Q86,132 70,116" fill="none" stroke="' + PIEL + '" stroke-width="15" stroke-linecap="round"/>' +
        // mano sobre el hombro
        '<path d="M72,100 Q54,96 46,106 Q40,116 50,122 Q58,126 70,124 Q82,122 84,112 Q86,102 72,100 Z" ' +
        'fill="' + PIEL + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<path d="M56,106 L54,118 M66,104 L65,120 M76,106 L75,118" stroke="' + PIEL_SOMBRA + '" stroke-width="3.5" stroke-linecap="round"/>' +
        // rayitas de toque
        '<g stroke="' + L + '" stroke-width="6" stroke-linecap="round">' +
        '<path d="M24,86 L12,78"/><path d="M18,112 L4,112"/><path d="M24,138 L12,148"/>' +
        "</g>" +
        '</svg>';

    // ------------------------------------------------------------------ barriga (dos manos sobre la panza)

    SVG.barriga =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        // cabecita arriba
        '<circle cx="100" cy="34" r="24" fill="' + PIEL + '" stroke="' + L + '" stroke-width="7"/>' +
        '<path d="M78,30 Q76,8 100,6 Q124,8 122,30 Q114,18 102,16 Q104,24 94,26 Q88,16 80,20 Q76,24 78,30 Z" fill="' + PELO + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round"/>' +
        '<circle cx="92" cy="36" r="4" fill="' + L + '"/><circle cx="108" cy="36" r="4" fill="' + L + '"/>' +
        '<path d="M92,46 Q100,53 108,46" fill="none" stroke="' + L + '" stroke-width="4.5" stroke-linecap="round"/>' +
        // camiseta corta
        '<path d="M60,76 Q66,60 100,58 Q134,60 140,76 L142,104 L58,104 Z" fill="#f76707" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // barriga descubierta
        '<path d="M58,102 Q56,152 100,162 Q144,152 142,102 Z" fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        '<ellipse cx="100" cy="130" rx="38" ry="24" fill="' + PIEL_SOMBRA + '" opacity=".35"/>' +
        // ombligo
        '<ellipse cx="100" cy="130" rx="7" ry="9" fill="' + PIEL_SOMBRA + '" stroke="' + L + '" stroke-width="5"/>' +
        // pantaloneta
        '<path d="M60,158 Q100,170 140,158 L144,190 L56,190 Z" fill="#1864ab" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
        // dos manos que tocan la barriga
        '<g fill="' + PIEL + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round">' +
        '<path d="M66,118 Q48,114 40,124 Q34,134 44,140 Q54,146 68,142 Q80,138 80,128 Q80,118 66,118 Z"/>' +
        '<path d="M134,118 Q152,114 160,124 Q166,134 156,140 Q146,146 132,142 Q120,138 120,128 Q120,118 134,118 Z"/>' +
        "</g>" +
        '<g stroke="' + PIEL_SOMBRA + '" stroke-width="3.5" stroke-linecap="round">' +
        '<path d="M50,124 L48,138 M60,122 L59,140 M70,124 L69,138"/>' +
        '<path d="M150,124 L152,138 M140,122 L141,140 M130,124 L131,138"/>' +
        "</g>" +
        // rayitas de pop
        '<g stroke="' + L + '" stroke-width="6" stroke-linecap="round">' +
        '<path d="M26,96 L14,88"/><path d="M174,96 L186,88"/><path d="M30,158 L18,166"/><path d="M170,158 L182,166"/>' +
        "</g>" +
        '</svg>';

    var cache = {};

    function dataUri(id) {
        if (!SVG[id]) return "";
        if (!cache[id]) cache[id] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG[id]);
        return cache[id];
    }

    global.IconosPista = {
        SVG: SVG,
        svg: function (id) { return SVG[id] || ""; },
        dataUri: dataUri
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.IconosPista;
})(typeof window !== "undefined" ? window : globalThis);
