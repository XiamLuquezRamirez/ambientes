/**
 * Accesorios — dibujos de los accesorios del baúl mágico (window.Accesorios).
 *
 * Cada SVG está en las mismas unidades de diseño que Zeus (personaje.js), con el pivote en (0,0) del viewBox
 * en el punto donde se encaja: así, con escalaFinal = 1, el accesorio queda del tamaño justo de Zeus.
 *   gafas          centro del puente (va sobre los ojos, en la cabeza).
 *   sombrero       centro de la base del ala (va en lo alto de la cabeza).
 *   bufanda        centro de la vuelta alrededor del cuello; bufanda_cola cuelga del nudo y ondea.
 *   tenis          talón del tenis izquierdo (se calza en el contenedor de cada pie; el derecho es el espejo).
 * Para la bandeja hay versiones completas: tenis_par (los dos) y bufanda_icono (vuelta + cola).
 *
 * Un accesorio nuevo = su SVG aquí + una entrada en config.json → accesorios (zona, posición final, textos).
 */
(function (global) {
    "use strict";

    function svg(vb, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(" ") + '" width="' + vb[2] + '" height="' + vb[3] + '">' + cuerpo + "</svg>";
    }

    var SVG = {};

    // ------------------------------------------------------------------ gafas de sol
    function lente(cx) {
        return '<rect x="' + (cx - 54) + '" y="-44" width="108" height="86" rx="34" fill="#243b80" stroke="#ff4f9a" stroke-width="11"/>' +
            '<path d="M' + (cx - 34) + ',-26 L' + (cx - 10) + ',-26 L' + (cx - 40) + ',16 L' + (cx - 46) + ',4 Z" fill="#ffffff" opacity=".42"/>' +
            '<circle cx="' + (cx + 26) + '" cy="18" r="7" fill="#ffffff" opacity=".3"/>';
    }
    SVG.gafas = svg([-162, -60, 324, 120],
        '<path d="M-118,-20 L-156,-30 M118,-20 L156,-30" stroke="#ff4f9a" stroke-width="10" stroke-linecap="round"/>' +
        lente(-64) + lente(64) +
        '<path d="M-12,-14 Q0,-28 12,-14" stroke="#ff4f9a" stroke-width="11" fill="none" stroke-linecap="round"/>' +
        '<circle cx="-112" cy="-30" r="7" fill="#ffd43b"/><circle cx="112" cy="-30" r="7" fill="#ffd43b"/>'
    );

    // ------------------------------------------------------------------ sombrero
    SVG.sombrero = svg([-214, -196, 428, 236],
        '<ellipse cx="0" cy="0" rx="206" ry="36" fill="#f5b82e"/>' +
        '<path d="M-124,4 Q-132,-150 0,-162 Q132,-150 124,4 Z" fill="#ffcf3f"/>' +
        '<path d="M-96,-6 Q-104,-120 -40,-148 Q-74,-100 -66,-6 Z" fill="#ffffff" opacity=".28"/>' +
        '<path d="M-126,-44 Q0,-30 126,-44 L124,-6 Q0,8 -124,-6 Z" fill="#ff6fae"/>' +
        '<path d="M-126,-44 Q0,-30 126,-44" stroke="#e8559a" stroke-width="4" fill="none"/>' +
        // flor
        '<g transform="translate(86,-28)">' +
        [0, 72, 144, 216, 288].map(function (a) {
            return '<ellipse cx="0" cy="-17" rx="11" ry="17" fill="#ffffff" transform="rotate(' + a + ')"/>';
        }).join("") +
        '<circle cx="0" cy="0" r="11" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/></g>' +
        // borde delantero del ala
        '<path d="M-206,0 Q0,52 206,0 Q0,30 -206,0 Z" fill="#e0a12a"/>' +
        '<path d="M-180,8 Q0,46 180,8" stroke="#fff3c4" stroke-width="4" fill="none" stroke-dasharray="12 10" stroke-linecap="round"/>'
    );

    // ------------------------------------------------------------------ bufanda
    var RAYAS = "#ffd43b";
    function vuelta() {
        return '<path d="M-96,-30 Q0,-4 96,-30 Q110,0 96,28 Q0,52 -96,28 Q-110,0 -96,-30 Z" fill="#4dabf7" stroke="#2f86d6" stroke-width="4"/>' +
            '<path d="M-60,-20 Q-66,6 -60,34 M-20,-12 Q-24,14 -20,42 M20,-12 Q24,14 20,42 M60,-20 Q66,6 60,34" stroke="' + RAYAS + '" stroke-width="10" fill="none" stroke-linecap="round"/>';
    }
    function cola() {
        return '<path d="M-26,-4 L26,-4 L30,150 L-22,156 Z" fill="#4dabf7" stroke="#2f86d6" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M-24,40 L28,38 M-23,92 L29,90" stroke="' + RAYAS + '" stroke-width="12"/>' +
            '<path d="M-20,156 L-22,180 M-8,156 L-10,182 M4,155 L4,180 M16,154 L18,178 M27,152 L30,176" stroke="#2f86d6" stroke-width="5" stroke-linecap="round"/>' +
            '<ellipse cx="2" cy="-2" rx="30" ry="18" fill="#3b9be6" stroke="#2f86d6" stroke-width="4"/>';
    }
    SVG.bufanda = svg([-112, -50, 224, 104], vuelta());
    SVG.bufanda_cola = svg([-36, -24, 72, 212], cola());
    SVG.bufanda_icono = svg([-120, -56, 240, 260], vuelta() + '<g transform="translate(52,18) rotate(-6)">' + cola() + "</g>");

    // ------------------------------------------------------------------ tenis
    function tenisDibujo() {
        return '<path d="M12,-8 L12,-46 Q12,-72 40,-72 L62,-72 Q110,-66 108,-14 L108,-6 L12,-6 Z" fill="#ff6b6b" stroke="#d94848" stroke-width="4"/>' +
            '<path d="M8,-10 L112,-10 Q114,6 98,6 L22,6 Q8,6 8,-10 Z" fill="#ffffff" stroke="#c9d3df" stroke-width="4"/>' +
            '<path d="M8,-2 L112,-2" stroke="#c9d3df" stroke-width="3"/>' +
            '<path d="M34,-56 L60,-48 M30,-44 L58,-36 M28,-32 L56,-24" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>' +
            '<path d="M66,-26 Q84,-40 104,-30" stroke="' + RAYAS + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
            '<circle cx="20" cy="-52" r="6" fill="#ffffff"/>';
    }
    // Tenis izquierdo de Zeus en coords del cuerpo, corrido para que el talón (20,-4) quede en (0,0).
    SVG.tenis = svg([-20, -82, 136, 96], '<g transform="translate(-20,4)">' + tenisDibujo() + "</g>");
    SVG.tenis_par = svg([-150, -96, 300, 112],
        '<g transform="translate(-136,0) translate(124,0) scale(-1,1)">' + tenisDibujo() + "</g>" +
        '<g transform="translate(12,0)">' + tenisDibujo() + "</g>"
    );

    /** viewBox → origen (0..1) para que el (0,0) del dibujo sea el pivote. */
    function origen(s) {
        var m = /viewBox="([^"]+)"/.exec(s || "");
        if (!m) return { x: 0.5, y: 0.5, w: 0, h: 0 };
        var v = m[1].split(/\s+/).map(Number);
        return { x: -v[0] / v[2], y: -v[1] / v[3], w: v[2], h: v[3] };
    }

    /** data URL del dibujo (para los íconos del progreso). */
    function dataUrl(clave) {
        return SVG[clave] ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG[clave]) : "";
    }

    global.Accesorios = { SVG: SVG, origen: origen, dataUrl: dataUrl };
})(window);
