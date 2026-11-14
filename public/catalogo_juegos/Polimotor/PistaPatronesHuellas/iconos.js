/**
 * IconosHuellas — ilustraciones SVG de las cinco huellas de "¡La Pista de Patrones de Huellas y Ritmo!"
 * (window.IconosHuellas). Dibujos propios (viewBox 200 × 200), con contorno oscuro y colores planos de
 * calcomanía, pensados para verse grandes en la baldosa y pequeños en las ranuras de la secuencia:
 *   manoIzquierda  huella de mano izquierda vista de palma (pulgar a la derecha del dibujo)
 *   manoDerecha    huella de mano derecha vista de palma (pulgar a la izquierda del dibujo)
 *   pieIzquierdo   huella de pie izquierdo descalzo vista desde arriba
 *   pieDerecho     huella de pie derecho descalzo vista desde arriba
 *   ambosPies      las dos huellas de pie juntas, con las flechitas del salto
 *
 * La mano izquierda y el pie izquierdo son el reflejo horizontal de sus parejas: se dibuja una sola vez cada
 * forma y la otra sale con un transform de espejo, para que las dos huellas de un par sean idénticas salvo el
 * lado. Así el niño distingue izquierda y derecha solo por la orientación, que es lo que se quiere enseñar.
 *
 * IconosHuellas.svg(id) devuelve el marcado; IconosHuellas.dataUri(id) sirve para <img>.
 */
(function (global) {
    "use strict";

    var L = "#3b2a20";          // contorno
    var PIEL = "#ffcfa8";
    var PIEL_SOMBRA = "#f2ad80";

    /**
     * Huella de mano derecha (palma hacia el niño, pulgar hacia la izquierda del dibujo), centrada en el
     * viewBox 200 × 200. Los dedos son cápsulas y la palma un trapecio redondeado.
     */
    function manoDerecha() {
        return (
            // pulgar, bien separado y en diagonal hacia arriba a la izquierda (va debajo de la palma)
            '<rect x="14" y="78" width="54" height="27" rx="13.5" transform="rotate(-38 41 91)" ' +
            'fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
            // cuatro dedos (índice, corazón, anular, meñique) de izquierda a derecha
            '<g fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round">' +
            '<rect x="68" y="26" width="25" height="56" rx="12.5"/>' +
            '<rect x="96" y="16" width="25" height="66" rx="12.5"/>' +
            '<rect x="124" y="24" width="25" height="58" rx="12.5"/>' +
            '<rect x="150" y="44" width="23" height="44" rx="11.5" transform="rotate(10 161 66)"/>' +
            "</g>" +
            // palma (encima de los arranques de los dedos y del pulgar)
            '<path d="M64,86 Q62,74 76,72 L160,72 Q172,74 170,90 Q168,122 154,146 ' +
            'Q138,174 112,176 Q84,176 70,150 Q60,124 64,86 Z" ' +
            'fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
            // líneas de la palma
            '<g fill="none" stroke="' + PIEL_SOMBRA + '" stroke-width="6" stroke-linecap="round">' +
            '<path d="M82,106 Q110,118 148,110"/>' +
            '<path d="M86,132 Q112,146 140,136"/>' +
            "</g>"
        );
    }

    /**
     * Huella de pie derecho descalzo vista desde arriba (dedo gordo hacia la izquierda del dibujo),
     * centrada en el viewBox 200 × 200.
     */
    function pieDerecho() {
        return (
            // planta: metatarso ancho a la izquierda (lado del dedo gordo), arco marcado y talón estrecho
            '<path d="M58,70 Q56,50 78,48 Q112,46 132,62 Q146,76 144,98 ' +
            'Q142,118 124,130 Q112,140 110,158 Q108,180 86,180 Q64,180 62,158 ' +
            'Q60,142 58,128 Q52,110 54,92 Q55,80 58,70 Z" ' +
            'fill="' + PIEL + '" stroke="' + L + '" stroke-width="7" stroke-linejoin="round"/>' +
            // sombra del arco interior (hacia el lado del dedo gordo)
            '<path d="M68,92 Q86,104 88,126 Q88,146 74,154 Q66,138 66,118 Q66,102 68,92 Z" ' +
            'fill="' + PIEL_SOMBRA + '" opacity=".5"/>' +
            // cinco dedos: el gordo, grande, a la izquierda; los otros cuatro bajando en abanico
            '<g fill="' + PIEL + '" stroke="' + L + '" stroke-width="6" stroke-linejoin="round">' +
            '<ellipse cx="68" cy="30" rx="22" ry="18" transform="rotate(-14 68 30)"/>' +
            '<ellipse cx="104" cy="26" rx="13" ry="11"/>' +
            '<ellipse cx="126" cy="32" rx="12" ry="10"/>' +
            '<ellipse cx="144" cy="44" rx="11" ry="9"/>' +
            '<ellipse cx="156" cy="62" rx="10" ry="8"/>' +
            "</g>"
        );
    }

    var SVG = {};
    var ABRE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">';
    var CIERRA = "</svg>";
    // el espejo horizontal convierte una huella derecha en la izquierda del mismo par
    var ESPEJO = '<g transform="translate(200,0) scale(-1,1)">';

    SVG.manoDerecha = ABRE + manoDerecha() + CIERRA;
    SVG.manoIzquierda = ABRE + ESPEJO + manoDerecha() + "</g>" + CIERRA;
    SVG.pieDerecho = ABRE + pieDerecho() + CIERRA;
    SVG.pieIzquierdo = ABRE + ESPEJO + pieDerecho() + "</g>" + CIERRA;

    // los dos pies juntos y pequeños, con las flechitas del salto a los lados
    SVG.ambosPies =
        ABRE +
        '<g transform="translate(34,44) scale(0.40)">' + ESPEJO + pieDerecho() + "</g></g>" +
        '<g transform="translate(96,44) scale(0.40)">' + pieDerecho() + "</g>" +
        // flechas de salto hacia arriba, a los lados y por fuera de las huellas
        '<g fill="none" stroke="' + L + '" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20,122 L20,66 M7,82 L20,66 L33,82"/>' +
        '<path d="M180,122 L180,66 M167,82 L180,66 L193,82"/>' +
        "</g>" +
        CIERRA;

    var cache = {};

    function dataUri(id) {
        if (!SVG[id]) return "";
        if (!cache[id]) cache[id] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG[id]);
        return cache[id];
    }

    global.IconosHuellas = {
        SVG: SVG,
        svg: function (id) { return SVG[id] || ""; },
        dataUri: dataUri
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.IconosHuellas;
})(typeof window !== "undefined" ? window : globalThis);
