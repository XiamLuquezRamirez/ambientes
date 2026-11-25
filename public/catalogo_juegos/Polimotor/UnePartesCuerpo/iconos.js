/**
 * IconosCuerpo — dibujos de las tarjetas de "Une las Partes del Cuerpo" (window.IconosCuerpo).
 *
 * Cada tarjeta usa el SVG de iconos/ (oreja, pie, pierna, ojos, brazo, cabeza, cuello, mano,
 * nariz y boca). No se pisan con comun/partes-cuerpo.js: esos dibujos son el Zeus de los otros
 * juegos y aquí las opciones tienen que ser estas figuras.
 */
(function (global) {
    "use strict";

    var V = "20261123a";
    var ARCHIVOS = {
        cabeza: "iconos/cabeza.svg?v=" + V,
        ojos: "iconos/ojos.svg?v=" + V,
        orejas: "iconos/orejas.svg?v=" + V,
        brazo: "iconos/brazo.svg?v=" + V,
        pierna: "iconos/pierna.svg?v=" + V,
        nariz: "iconos/nariz.svg?v=" + V,
        boca: "iconos/boca.svg?v=" + V,
        cuello: "iconos/cuello.svg?v=" + V,
        pie: "iconos/pie.svg?v=" + V,
        mano: "iconos/mano.svg?v=" + V
    };

    global.IconosCuerpo = { archivos: ARCHIVOS };
})(window);
