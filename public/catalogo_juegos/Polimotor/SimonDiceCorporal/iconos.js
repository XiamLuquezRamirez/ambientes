/**
 * IconosSimon — dibujos de los seis botones de "¡Simón Dice Corporal!" (window.IconosSimon).
 * Cada pose es el PNG del niño (img/iconos). IconosSimon.svg(id) devuelve un <img>;
 * IconosSimon.dataUri(id) devuelve la ruta, para las ranuras de la secuencia.
 */
(function (global) {
    "use strict";

    var RUTA = {
        cabeza: "img/iconos/cabeza.png",
        aplaudir: "img/iconos/aplaudir.png",
        zapatear: "img/iconos/zapatear.png",
        saltar: "img/iconos/saltar.png",
        tocarPies: "img/iconos/tocar-pies.png",
        abrirBrazos: "img/iconos/abrir-brazos.png"
    };

    function svg(id) {
        var src = RUTA[id];
        if (!src) return "";
        return '<img src="' + src + '" alt="" draggable="false">';
    }

    global.IconosSimon = {
        svg: svg,
        dataUri: function (id) { return RUTA[id] || ""; }
    };

    if (typeof module !== "undefined" && module.exports) module.exports = global.IconosSimon;
})(typeof window !== "undefined" ? window : this);
