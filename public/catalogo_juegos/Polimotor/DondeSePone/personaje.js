/**
 * Personaje — Zeus de frente, con su ropa básica, para el vestidor de "¿Dónde se pone?" (window.Personaje).
 *
 * Cada parte es un SVG con su propio viewBox; el (0,0) de cada viewBox es el pivote de la parte, así
 * escenario-phaser.js la gira o escala sin que se separe del resto. Paleta de Zeus tomada del Puzle de
 * Siluetas (piel #f2c6b9, pelo #7f3f1a, camiseta verde #2b896f con rayo amarillo, pantaloneta azul #004f6d)
 * y medias blancas: está descalzo porque los tenis son uno de los accesorios.
 *
 * Unidades de diseño (y hacia abajo): los pies de Zeus en (0,0), la cabeza llega a y ≈ -870.
 *   cuerpo      pivote en los pies (piernas, pantaloneta, camiseta y cuello).
 *   pie         media; pivote en el talón (contenedor del pie: ahí se calza el tenis).
 *   cabeza      contenedor en GEOMETRIA.cabeza (base del cuello); cara, ojos, nariz y boca en coords de la cabeza.
 *   brazo       contenedor en el hombro; el antebrazo cuelga de un codo (contenedor) para poder doblarlo.
 * "izq"/"der" son los lados de Zeus: él mira al niño, así que su mano izquierda queda a la derecha de la pantalla.
 *
 * GEOMETRIA.zonas son las zonas de destino (cabeza, ojos, cuello, pies) en las coords del contenedor de
 * la parte: siguen a Zeus cuando se mueve o cuando cambia la pantalla.
 */
(function (global) {
    "use strict";

    var PIEL = "#f2c6b9";
    var PIEL_SOMBRA = "#e5a796";
    var PELO = "#7f3f1a";
    var PELO_LINEA = "#5b2c11";
    var CAMISA = "#2b896f";
    var CAMISA_SOMBRA = "#24735a";
    var CUELLO_CAMISA = "#8cc97c";
    var SHORT = "#004f6d";
    var SHORT_LINEA = "#06405a";
    var AMARILLO = "#ffd43b";
    var LABIO = "#a74c3a";

    function svg(vb, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(" ") + '" width="' + vb[2] + '" height="' + vb[3] + '">' + cuerpo + "</svg>";
    }

    function pierna(lado) {
        var x = lado === "izq" ? 20 : -64;
        return '<rect x="' + x + '" y="-300" width="44" height="262" rx="20" fill="' + PIEL + '"/>' +
            '<rect x="' + (x + 27) + '" y="-280" width="12" height="160" rx="6" fill="' + PIEL_SOMBRA + '" opacity=".45"/>' +
            // media blanca con franjas
            '<rect x="' + (x - 2) + '" y="-112" width="48" height="76" rx="12" fill="#ffffff" stroke="#d5dde8" stroke-width="3"/>' +
            '<rect x="' + (x - 2) + '" y="-104" width="48" height="8" fill="#4dabf7"/>' +
            '<rect x="' + (x - 2) + '" y="-90" width="48" height="6" fill="#ff6b6b"/>';
    }

    var SVG = {};

    // ------------------------------------------------------------------ cuerpo (sin brazos, cabeza ni pies)
    SVG.cuerpo = svg([-200, -610, 400, 610],
        pierna("der") + pierna("izq") +
        // rodillas
        '<path d="M-56,-196 Q-42,-184 -28,-196 M28,-196 Q42,-184 56,-196" stroke="' + PIEL_SOMBRA + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        // pantaloneta
        '<path d="M-94,-410 L94,-410 L108,-262 Q60,-252 12,-258 L0,-306 L-12,-258 Q-60,-252 -108,-262 Z" fill="' + SHORT + '"/>' +
        '<path d="M-108,-270 Q-60,-260 -12,-266 M12,-266 Q60,-260 108,-270" stroke="' + SHORT_LINEA + '" stroke-width="8" fill="none"/>' +
        '<path d="M-100,-330 L-104,-282 M100,-330 L104,-282" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>' +
        // camiseta
        '<path d="M-96,-520 Q-98,-546 -62,-552 L62,-552 Q98,-546 96,-520 L100,-396 Q0,-382 -100,-396 Z" fill="' + CAMISA + '"/>' +
        '<path d="M-96,-520 Q-98,-540 -76,-548 Q-82,-470 -78,-392 L-100,-396 Z" fill="' + CAMISA_SOMBRA + '" opacity=".55"/>' +
        '<path d="M-100,-410 Q0,-396 100,-410 L100,-396 Q0,-382 -100,-396 Z" fill="' + CAMISA_SOMBRA + '"/>' +
        // escudo con rayo
        '<rect x="-34" y="-496" width="68" height="68" rx="14" fill="#ffffff" stroke="' + CAMISA_SOMBRA + '" stroke-width="4"/>' +
        '<path d="M8,-488 L-18,-458 L-2,-458 L-12,-436 L18,-468 L2,-468 L10,-488 Z" fill="' + AMARILLO + '" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/>' +
        // cuello
        '<rect x="-27" y="-608" width="54" height="72" rx="18" fill="' + PIEL + '"/>' +
        '<path d="M-27,-572 Q0,-556 27,-572 L27,-546 L-27,-546 Z" fill="' + PIEL_SOMBRA + '" opacity=".55"/>' +
        '<path d="M-48,-550 Q0,-516 48,-550" stroke="' + CUELLO_CAMISA + '" stroke-width="12" fill="none" stroke-linecap="round"/>'
    );

    // Pie con media (izquierdo de Zeus); pivote en el talón (20,-4 del cuerpo) para levantar la punta.
    SVG.pie = svg([-14, -70, 104, 78],
        '<g transform="translate(-20,4)">' +
        '<path d="M16,-10 L16,-40 Q16,-62 40,-62 L60,-62 Q100,-58 98,-14 Q98,0 84,0 L26,0 Q16,0 16,-10 Z" fill="#ffffff" stroke="#d5dde8" stroke-width="4"/>' +
        '<path d="M70,-6 Q74,-14 72,-22 M82,-6 Q86,-14 84,-24" stroke="#e3e9f1" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        "</g>"
    );

    // ------------------------------------------------------------------ cabeza (coords de la cabeza)
    SVG.cara = svg([-200, -310, 400, 310],
        // orejas
        '<circle cx="-146" cy="-140" r="28" fill="' + PIEL + '"/><circle cx="-148" cy="-140" r="14" fill="' + PIEL_SOMBRA + '"/>' +
        '<circle cx="146" cy="-140" r="28" fill="' + PIEL + '"/><circle cx="148" cy="-140" r="14" fill="' + PIEL_SOMBRA + '"/>' +
        '<ellipse cx="0" cy="-150" rx="148" ry="140" fill="' + PIEL + '"/>' +
        '<ellipse cx="-94" cy="-94" rx="26" ry="16" fill="#f39a9a" opacity=".4"/>' +
        '<ellipse cx="94" cy="-94" rx="26" ry="16" fill="#f39a9a" opacity=".4"/>' +
        // pecas
        '<circle cx="-104" cy="-112" r="3.5" fill="#d98a74" opacity=".8"/><circle cx="-90" cy="-118" r="3.5" fill="#d98a74" opacity=".8"/><circle cx="-96" cy="-104" r="3.5" fill="#d98a74" opacity=".8"/>' +
        '<circle cx="104" cy="-112" r="3.5" fill="#d98a74" opacity=".8"/><circle cx="90" cy="-118" r="3.5" fill="#d98a74" opacity=".8"/><circle cx="96" cy="-104" r="3.5" fill="#d98a74" opacity=".8"/>'
    );

    SVG.pelo = svg([-190, -370, 380, 250],
        '<path d="M-152,-136 C-172,-248 -104,-314 0,-314 C104,-314 172,-248 152,-136 C146,-186 124,-212 96,-220 L78,-192 L58,-228 L28,-198 L4,-236 L-22,-200 L-54,-230 L-74,-194 L-98,-218 C-126,-210 -146,-182 -152,-136 Z" fill="' + PELO + '"/>' +
        '<path d="M-40,-306 Q-56,-344 -18,-360 Q-26,-334 -2,-312 Z" fill="' + PELO + '"/>' +
        '<path d="M6,-312 Q14,-352 54,-354 Q34,-334 38,-306 Z" fill="' + PELO + '"/>' +
        '<path d="M-10,-298 Q30,-296 70,-268 M-60,-288 Q-110,-262 -132,-200 M30,-300 Q90,-282 128,-214 M-30,-296 Q-64,-276 -82,-240" stroke="' + PELO_LINEA + '" stroke-width="4" fill="none" opacity=".5" stroke-linecap="round"/>'
    );

    SVG.ojo = svg([-36, -42, 72, 84],
        '<ellipse cx="0" cy="0" rx="28" ry="34" fill="#fff" stroke="#5a3226" stroke-width="3"/>' +
        '<ellipse cx="0" cy="6" rx="19" ry="23" fill="#4a2c1c"/>' +
        '<ellipse cx="0" cy="8" rx="11" ry="13" fill="#1d120c"/>' +
        '<circle cx="8" cy="-3" r="7" fill="#fff"/><circle cx="-7" cy="15" r="3.5" fill="#fff"/>'
    );

    SVG.ceja = svg([-34, -14, 68, 28],
        '<path d="M-26,8 Q0,-10 26,4" stroke="' + PELO_LINEA + '" stroke-width="9" stroke-linecap="round" fill="none"/>'
    );

    SVG.nariz = svg([-26, -22, 52, 44],
        '<ellipse cx="0" cy="2" rx="17" ry="13" fill="#eaa694"/>' +
        '<ellipse cx="-5" cy="-3" rx="6" ry="3.5" fill="#fff" opacity=".6"/>'
    );

    SVG.boca_sonrisa = svg([-56, -40, 112, 80],
        '<path d="M-38,-12 Q0,-2 38,-12 Q34,26 0,28 Q-34,26 -38,-12 Z" fill="' + LABIO + '"/>' +
        '<path d="M-33,-9 Q0,-1 33,-9 L31,0 Q0,7 -31,0 Z" fill="#fff"/>' +
        '<path d="M-17,19 Q0,7 17,19 Q9,27 0,27 Q-9,27 -17,19 Z" fill="#e8737a"/>'
    );
    SVG.boca_abierta = svg([-56, -40, 112, 80],
        '<ellipse cx="0" cy="4" rx="22" ry="26" fill="' + LABIO + '"/>' +
        '<path d="M-14,-12 Q0,-18 14,-12 L13,-6 Q0,-10 -13,-6 Z" fill="#fff"/>' +
        '<path d="M-13,20 Q0,8 13,20 Q7,29 0,29 Q-7,29 -13,20 Z" fill="#e8737a"/>'
    );
    SVG.boca_risa = svg([-56, -40, 112, 80],
        '<path d="M-50,-16 Q0,0 50,-16 Q44,34 0,36 Q-44,34 -50,-16 Z" fill="' + LABIO + '"/>' +
        '<path d="M-44,-12 Q0,2 44,-12 L41,-2 Q0,10 -41,-2 Z" fill="#fff"/>' +
        '<path d="M-24,26 Q0,8 24,26 Q12,35 0,35 Q-12,35 -24,26 Z" fill="#e8737a"/>'
    );
    // Sorpresa ("¡Uy!"): boquita redonda.
    SVG.boca_sorpresa = svg([-56, -40, 112, 80],
        '<ellipse cx="0" cy="4" rx="13" ry="16" fill="' + LABIO + '"/>' +
        '<ellipse cx="0" cy="9" rx="8" ry="7" fill="#e8737a"/>'
    );

    // ------------------------------------------------------------------ brazo (manga + brazo), antebrazo y mano
    SVG.brazo = svg([-44, -42, 88, 160],
        '<rect x="-17" y="0" width="34" height="114" rx="17" fill="' + PIEL + '"/>' +
        '<rect x="3" y="30" width="10" height="70" rx="5" fill="' + PIEL_SOMBRA + '" opacity=".5"/>' +
        '<path d="M-40,-4 Q-42,-38 0,-38 Q42,-38 40,-4 L37,54 Q0,68 -37,54 Z" fill="' + CAMISA + '"/>' +
        '<path d="M-37,52 Q0,66 37,52" stroke="' + CUELLO_CAMISA + '" stroke-width="9" fill="none" stroke-linecap="round"/>'
    );

    SVG.antebrazo = svg([-20, -14, 40, 124],
        '<rect x="-16" y="-12" width="32" height="118" rx="16" fill="' + PIEL + '"/>' +
        '<rect x="2" y="6" width="9" height="86" rx="4.5" fill="' + PIEL_SOMBRA + '" opacity=".5"/>'
    );

    SVG.mano = svg([-54, -50, 108, 100],
        '<ellipse cx="-29" cy="-4" rx="12" ry="21" transform="rotate(-28 -29 -4)" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<ellipse cx="-19" cy="26" rx="9" ry="15" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<ellipse cx="-6" cy="32" rx="9" ry="16" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<ellipse cx="7" cy="32" rx="9" ry="16" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<ellipse cx="19" cy="25" rx="9" ry="14" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<circle cx="0" cy="0" r="32" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<rect x="-16" y="-40" width="32" height="22" rx="10" fill="' + PIEL + '"/>'
    );

    /**
     * Posiciones (unidades de diseño). Las zonas de destino se miden en las coords de su contenedor:
     * cabeza y ojos en la cabeza; cuello y pies en Zeus. tolerancia (config.juego) las agranda al soltar.
     */
    var GEOMETRIA = {
        alto: 880,
        ancho: 420,
        cabeza: { x: 0, y: -566 },
        hombro: { x: 92, y: -512 },
        codo: { x: 0, y: 104 },
        mano: { x: 0, y: 112 },
        brazoReposo: 0.3,             // radianes hacia afuera
        brazoArriba: -2.75,
        ojo: { x: 56, y: -148 },
        ceja: { x: 58, y: -204 },
        nariz: { x: 0, y: -102 },
        boca: { x: 0, y: -56 },
        talon: { x: 20, y: -4 },
        zonas: {
            cabeza: { contenedor: "cabeza", x: 0, y: -262, rx: 165, ry: 78 },
            ojos: { contenedor: "cabeza", x: 0, y: -150, rx: 128, ry: 52 },
            cuello: { contenedor: "zeus", x: 0, y: -548, rx: 96, ry: 40 },
            pies: { contenedor: "zeus", x: 0, y: -36, rx: 150, ry: 58 }
        }
    };

    /** viewBox de cada SVG → origen (0..1) para que el (0,0) del dibujo sea el pivote. */
    function origen(s) {
        var m = /viewBox="([^"]+)"/.exec(s || "");
        if (!m) return { x: 0.5, y: 0.5, w: 0, h: 0 };
        var v = m[1].split(/\s+/).map(Number);
        return { x: -v[0] / v[2], y: -v[1] / v[3], w: v[2], h: v[3] };
    }

    global.Personaje = { SVG: SVG, GEOMETRIA: GEOMETRIA, origen: origen };
})(window);
