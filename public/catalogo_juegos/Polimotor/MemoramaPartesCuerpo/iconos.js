/**
 * IconosMemorama — ilustraciones de las tarjetas (PNG con fondo transparente).
 * La oreja se llama `orejas` porque así está el campo `dibujo` de esa parte en config.json.
 * dataUri(id) sirve para la barra de parejas y la felicitación; la cara de la tarjeta lo carga igual.
 */
(function (global) {
    "use strict";

    var V = "20261119a";
    var ARCHIVOS = {
        mano: "iconos/mano.png",
        pie: "iconos/pie.png",
        ojos: "iconos/ojos.png",
        nariz: "iconos/nariz.png",
        boca: "iconos/boca.png",
        orejas: "iconos/orejas.png",
        cabeza: "iconos/cabeza.png",
        brazo: "iconos/brazo.png",
        pierna: "iconos/pierna.png"
    };

    var SVG = {};
    Object.keys(ARCHIVOS).forEach(function (id) {
        SVG[id] = ARCHIVOS[id] + "?v=" + V;
    });

    function dataUri(id) {
        return SVG[id] || "";
    }

    global.IconosMemorama = { SVG: SVG, dataUri: dataUri };
})(window);
