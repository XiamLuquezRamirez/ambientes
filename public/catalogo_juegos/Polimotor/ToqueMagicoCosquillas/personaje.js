/**
 * Personaje — dibujo de Zoe de frente para el espejo mágico (window.Personaje).
 *
 * Cada parte es un SVG con su propio viewBox; el punto (0,0) de cada viewBox es el pivote de la parte,
 * así phaser-juego.js puede girarla o escalarla sin que se separe del resto.
 * Paleta tomada de zoe_normal.gif y de las piezas de Zoe del Puzle de Siluetas (piel #f2c6b9, pelo #984c2c,
 * camiseta celeste #95d3f0, jardinera rosada #e1709c con corazón amarillo, medias rosadas y zapatos celestes).
 *
 * Unidades de diseño (y hacia abajo): los pies de Zoe en (0,0), la cabeza llega a y ≈ -880.
 *   cuerpo       pivote en los pies (incluye las rodillas). Zapatos, orejas y coletas son piezas aparte para animarlas.
 *   cabeza       contenedor en GEOMETRIA.cabeza (base del cuello); caras, ojos, nariz y boca en coords de la cabeza.
 *   brazo/mano   contenedor en el hombro; el brazo cuelga hacia +y y la mano está en GEOMETRIA.mano.
 * "izq"/"der" son los lados de Zoe: ella mira al niño, así que su mano izquierda queda a la derecha de la pantalla.
 */
(function (global) {
    "use strict";

    var PIEL = "#f2c6b9";
    var PIEL_SOMBRA = "#e5a796";
    var PELO = "#984c2c";
    var PELO_LINEA = "#6e3218";
    var CAMISA = "#95d3f0";
    var CAMISA_LINEA = "#6fbfe6";
    var AZUL = "#02a1dd";
    var VESTIDO = "#e1709c";
    var VESTIDO_LINEA = "#c9578a";
    var AMARILLO = "#f7e36a";

    function svg(vb, cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.join(" ") + '" width="' + vb[2] + '" height="' + vb[3] + '">' + cuerpo + "</svg>";
    }

    function festones(x1, x2, y, r, color) {
        var s = "";
        for (var x = x1; x <= x2 + 0.1; x += r * 1.7) {
            var k = x / Math.max(Math.abs(x1), Math.abs(x2));
            s += '<circle cx="' + x.toFixed(1) + '" cy="' + (y + 13 * (1 - k * k) + 3).toFixed(1) + '" r="' + r + '" fill="' + color + '"/>';
        }
        return s;
    }

    function zapato(lado) {
        var k = lado === "izq" ? 1 : -1;
        return '<g transform="scale(' + k + ',1)">' +
            '<path d="M14,-10 L14,-38 Q14,-64 40,-64 L64,-64 Q104,-60 102,-14 Q102,0 88,0 L24,0 Q14,0 14,-10 Z" fill="#a9dcf6" stroke="#5fb0e0" stroke-width="4"/>' +
            '<path d="M26,-42 Q56,-54 92,-40" stroke="#5fb0e0" stroke-width="6" fill="none" stroke-linecap="round"/>' +
            '<path d="M30,-26 Q60,-34 94,-24" stroke="#5fb0e0" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>' +
            '<ellipse cx="74" cy="-50" rx="14" ry="6" fill="#fff" opacity=".55"/>' +
            "</g>";
    }

    function pierna(lado) {
        var x = lado === "izq" ? 22 : -62;
        return '<rect x="' + x + '" y="-262" width="40" height="214" rx="18" fill="' + PIEL + '"/>' +
            '<rect x="' + (x + 24) + '" y="-250" width="12" height="150" rx="6" fill="' + PIEL_SOMBRA + '" opacity=".45"/>' +
            '<rect x="' + (x - 2) + '" y="-104" width="44" height="58" rx="8" fill="#f59ac0"/>' +
            [0, 1, 2, 3].map(function (i) {
                return '<circle cx="' + (x + 4 + i * 10.7).toFixed(1) + '" cy="-104" r="6" fill="#f59ac0"/>';
            }).join("");
    }

    var SVG = {};

    // ------------------------------------------------------------------ cuerpo (sin brazos ni cabeza)
    SVG.cuerpo = svg([-200, -600, 400, 600],
        pierna("der") + pierna("izq") +
        // rodillas
        '<path d="M-56,-170 Q-42,-158 -28,-170 M28,-170 Q42,-158 56,-170" stroke="' + PIEL_SOMBRA + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="-42" cy="-176" rx="11" ry="6" fill="#f39a9a" opacity=".3"/><ellipse cx="42" cy="-176" rx="11" ry="6" fill="#f39a9a" opacity=".3"/>' +
        // camiseta
        '<path d="M-90,-506 Q-92,-528 -60,-536 L60,-536 Q92,-528 90,-506 L82,-392 L-82,-392 Z" fill="' + CAMISA + '"/>' +
        '<path d="M-70,-520 L-70,-400 M-50,-526 L-50,-400 M50,-526 L50,-400 M70,-520 L70,-400" stroke="' + CAMISA_LINEA + '" stroke-width="3" opacity=".7"/>' +
        // falda de la jardinera
        '<path d="M-84,-414 L84,-414 L156,-262 Q0,-226 -156,-262 Z" fill="' + VESTIDO + '"/>' +
        '<path d="M-60,-400 Q-90,-330 -120,-262" stroke="' + VESTIDO_LINEA + '" stroke-width="4" fill="none" opacity=".45"/>' +
        '<path d="M60,-400 Q86,-330 108,-258" stroke="' + VESTIDO_LINEA + '" stroke-width="4" fill="none" opacity=".45"/>' +
        '<path d="M-148,-268 Q0,-234 148,-268" stroke="#f39bc1" stroke-width="5" fill="none" stroke-dasharray="10 9" stroke-linecap="round"/>' +
        // peto y tirantes
        '<path d="M-64,-488 L64,-488 L70,-408 L-70,-408 Z" fill="' + VESTIDO + '"/>' +
        '<path d="M-64,-488 L-62,-536 L-38,-536 L-40,-488 Z M64,-488 L62,-536 L38,-536 L40,-488 Z" fill="' + VESTIDO + '"/>' +
        '<path d="M-56,-480 L56,-480 L60,-418 L-60,-418 Z" fill="none" stroke="#f6a6c9" stroke-width="3" stroke-dasharray="7 6"/>' +
        '<path d="M-84,-412 Q0,-400 84,-412" stroke="' + VESTIDO_LINEA + '" stroke-width="4" fill="none"/>' +
        '<circle cx="-51" cy="-492" r="7" fill="' + AMARILLO + '"/><circle cx="51" cy="-492" r="7" fill="' + AMARILLO + '"/>' +
        '<path d="M0,-424 C-28,-442 -32,-468 -15,-474 C-6,-477 0,-470 0,-463 C0,-470 6,-477 15,-474 C32,-468 28,-442 0,-424 Z" fill="' + AMARILLO + '" stroke="#e2c84a" stroke-width="2.5"/>' +
        // cuello y cuello festoneado
        '<rect x="-24" y="-598" width="48" height="70" rx="16" fill="' + PIEL + '"/>' +
        '<path d="M-24,-560 Q0,-546 24,-560 L24,-536 L-24,-536 Z" fill="' + PIEL_SOMBRA + '" opacity=".55"/>' +
        festones(-44, 44, -536, 7, AZUL) +
        '<path d="M-46,-536 Q0,-510 46,-536" stroke="' + AZUL + '" stroke-width="5" fill="none"/>'
    );

    // ------------------------------------------------------------------ cabeza (coords de la cabeza)
    SVG.pelo_atras = svg([-250, -340, 500, 340],
        '<path d="M-162,-150 C-172,-264 -92,-322 0,-322 C92,-322 172,-264 162,-150 L150,-74 L-150,-74 Z" fill="' + PELO + '"/>' +
        ''
    );

    // Coleta izquierda de Zoe (derecha de la pantalla); pivote en la moña (166,-120 de la cabeza).
    SVG.coleta = svg([-40, -32, 110, 150],
        '<path d="M-16,-8 C40,2 56,56 42,100 C32,78 22,86 14,110 C6,82 -6,88 -16,106 C-14,66 -26,24 -16,-8 Z" fill="' + PELO + '"/>' +
        '<path d="M10,20 Q30,50 26,84 M-2,24 Q10,54 2,90" stroke="' + PELO_LINEA + '" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>' +
        '<ellipse cx="0" cy="0" rx="15" ry="20" fill="#7cc4ec" stroke="#3f9fd6" stroke-width="3"/>'
    );

    // Oreja (centrada en su pivote).
    SVG.oreja = svg([-34, -34, 68, 68],
        '<circle cx="0" cy="0" r="28" fill="' + PIEL + '"/><circle cx="-2" cy="0" r="14" fill="' + PIEL_SOMBRA + '"/>' +
        '<path d="M-4,-12 Q8,-6 4,8" stroke="#d98a74" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'
    );

    // Zapato izquierdo de Zoe; pivote en el talón (20,-4 del cuerpo) para levantar la punta.
    SVG.zapato = svg([-14, -66, 96, 74], '<g transform="translate(-20,4)">' + zapato("izq") + "</g>");

    SVG.cara = svg([-200, -310, 400, 310],
        '<ellipse cx="0" cy="-150" rx="150" ry="140" fill="' + PIEL + '"/>' +
        '<ellipse cx="-96" cy="-98" rx="27" ry="17" fill="#f39a9a" opacity=".45"/>' +
        '<ellipse cx="96" cy="-98" rx="27" ry="17" fill="#f39a9a" opacity=".45"/>'
    );

    SVG.pelo_frente = svg([-190, -330, 380, 240],
        '<path d="M-158,-118 C-172,-232 -110,-314 0,-314 C110,-314 172,-232 158,-118 C152,-160 142,-190 122,-206 C100,-220 72,-210 54,-220 C38,-228 18,-236 4,-256 C-12,-236 -40,-226 -60,-218 C-82,-210 -110,-216 -126,-200 C-144,-182 -152,-150 -158,-118 Z" fill="' + PELO + '"/>' +
        '<path d="M4,-300 Q2,-282 4,-258 M-20,-298 Q-60,-280 -84,-226 M-46,-288 Q-100,-262 -130,-196 M28,-298 Q70,-280 92,-226 M54,-288 Q110,-262 136,-196" stroke="' + PELO_LINEA + '" stroke-width="3.5" fill="none" opacity=".5" stroke-linecap="round"/>' +
        '<g transform="translate(92,-246) rotate(-32)">' +
        '<path d="M0,-22 C13,-12 15,10 0,24 C-15,10 -13,-12 0,-22 Z" fill="' + AMARILLO + '" stroke="#d8c14a" stroke-width="3"/>' +
        '<path d="M0,-7 C4,-3 5,4 0,9 C-5,4 -4,-3 0,-7 Z" fill="' + PELO + '"/></g>'
    );

    SVG.ojo = svg([-40, -46, 80, 92],
        '<ellipse cx="0" cy="0" rx="32" ry="38" fill="#fff" stroke="#5a3226" stroke-width="3"/>' +
        '<ellipse cx="0" cy="7" rx="22" ry="26" fill="#5a3322"/>' +
        '<ellipse cx="0" cy="9" rx="12" ry="14" fill="#1d120c"/>' +
        '<circle cx="9" cy="-3" r="8" fill="#fff"/><circle cx="-8" cy="17" r="4" fill="#fff"/>' +
        '<path d="M22,-28 L34,-38 M28,-20 L38,-26" stroke="#3a2016" stroke-width="4" stroke-linecap="round"/>'
    );

    SVG.ceja = svg([-32, -14, 64, 28],
        '<path d="M-24,7 Q0,-10 24,4" stroke="#7a3a20" stroke-width="7" stroke-linecap="round" fill="none"/>'
    );

    SVG.nariz = svg([-26, -22, 52, 44],
        '<ellipse cx="0" cy="2" rx="16" ry="12" fill="#eaa694"/>' +
        '<ellipse cx="-5" cy="-3" rx="6" ry="3.5" fill="#fff" opacity=".6"/>'
    );

    var LABIO = "#a74c3a";
    SVG.boca_sonrisa = svg([-56, -40, 112, 80],
        '<path d="M-36,-12 Q0,-2 36,-12 Q32,26 0,28 Q-32,26 -36,-12 Z" fill="' + LABIO + '"/>' +
        '<path d="M-31,-9 Q0,-1 31,-9 L29,0 Q0,7 -29,0 Z" fill="#fff"/>' +
        '<path d="M-17,19 Q0,7 17,19 Q9,27 0,27 Q-9,27 -17,19 Z" fill="#e8737a"/>'
    );
    SVG.boca_abierta = svg([-56, -40, 112, 80],
        '<ellipse cx="0" cy="4" rx="21" ry="27" fill="' + LABIO + '"/>' +
        '<path d="M-14,-12 Q0,-18 14,-12 L13,-6 Q0,-10 -13,-6 Z" fill="#fff"/>' +
        '<path d="M-13,20 Q0,8 13,20 Q7,29 0,29 Q-7,29 -13,20 Z" fill="#e8737a"/>'
    );
    SVG.boca_risa = svg([-56, -40, 112, 80],
        '<path d="M-48,-16 Q0,0 48,-16 Q42,34 0,36 Q-42,34 -48,-16 Z" fill="' + LABIO + '"/>' +
        '<path d="M-42,-12 Q0,2 42,-12 L39,-2 Q0,10 -39,-2 Z" fill="#fff"/>' +
        '<path d="M-24,26 Q0,8 24,26 Q12,35 0,35 Q-12,35 -24,26 Z" fill="#e8737a"/>'
    );

    // ------------------------------------------------------------------ brazo y mano (lado izquierdo de Zoe = derecha de la pantalla)
    SVG.brazo = svg([-46, -42, 92, 240],
        '<rect x="-17" y="6" width="34" height="186" rx="17" fill="' + PIEL + '"/>' +
        '<rect x="3" y="40" width="10" height="140" rx="5" fill="' + PIEL_SOMBRA + '" opacity=".5"/>' +
        '<path d="M-40,-4 Q-42,-38 0,-38 Q42,-38 40,-4 L37,52 Q0,66 -37,52 Z" fill="' + CAMISA + '"/>' +
        '<path d="M-22,-30 L-22,50 M0,-36 L0,58 M22,-30 L22,50" stroke="' + CAMISA_LINEA + '" stroke-width="3" opacity=".7"/>' +
        '<path d="M-37,50 Q0,64 37,50" stroke="' + AZUL + '" stroke-width="8" fill="none" stroke-linecap="round"/>'
    );

    SVG.mano = svg([-54, -50, 108, 100],
        '<ellipse cx="-29" cy="-4" rx="12" ry="21" transform="rotate(-28 -29 -4)" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<ellipse cx="-19" cy="26" rx="9" ry="15" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<ellipse cx="-6" cy="32" rx="9" ry="16" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<ellipse cx="7" cy="32" rx="9" ry="16" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<ellipse cx="19" cy="25" rx="9" ry="14" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<circle cx="0" cy="0" r="32" fill="' + PIEL + '" stroke="' + PIEL_SOMBRA + '" stroke-width="3"/>' +
        '<rect x="-18" y="-40" width="36" height="22" rx="10" fill="' + PIEL + '"/>' +
        '<path d="M-10,8 Q2,14 14,6" stroke="' + PIEL_SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>'
    );

    /**
     * Posiciones (unidades de diseño). Las zonas táctiles se miden en las coords de su contenedor:
     * ojos, nariz y boca en la cabeza; las manos en su brazo; "cuerpo" en Zoe.
     */
    var GEOMETRIA = {
        alto: 900,
        cabeza: { x: 0, y: -560 },
        hombro: { x: 88, y: -506 },
        brazoReposo: 0.36,           // radianes hacia afuera
        brazoAplauso: 0.29,          // radianes hacia adentro: las manos se juntan frente al pecho
        brazoSaludo: -2.55,
        mano: { x: 0, y: 206 },
        ojo: { x: 56, y: -150 },
        ceja: { x: 58, y: -204 },
        nariz: { x: 0, y: -104 },
        boca: { x: 0, y: -58 },
        oreja: { x: 148, y: -140 },
        coleta: { x: 166, y: -120 },
        talon: { x: 20, y: -4 },
        zonas: {
            ojo_izq: { contenedor: "cabeza", x: 56, y: -150, rx: 52, ry: 50 },
            ojo_der: { contenedor: "cabeza", x: -56, y: -150, rx: 52, ry: 50 },
            nariz: { contenedor: "cabeza", x: 0, y: -103, rx: 36, ry: 30 },
            boca: { contenedor: "cabeza", x: 0, y: -58, rx: 64, ry: 32 },
            mano_izq: { contenedor: "brazo_izq", x: 0, y: 206, rx: 64, ry: 64 },
            mano_der: { contenedor: "brazo_der", x: 0, y: 206, rx: 64, ry: 64 },
            oreja_izq: { contenedor: "cabeza", x: 154, y: -140, rx: 34, ry: 36 },
            oreja_der: { contenedor: "cabeza", x: -154, y: -140, rx: 34, ry: 36 },
            cabello: { contenedor: "cabeza", x: 0, y: -270, rx: 150, ry: 46 },
            coleta_izq: { contenedor: "cabeza", x: 188, y: -60, rx: 34, ry: 60 },
            coleta_der: { contenedor: "cabeza", x: -188, y: -60, rx: 34, ry: 60 },
            barriga: { contenedor: "zoe", x: 0, y: -405, rx: 78, ry: 52 },
            rodilla_izq: { contenedor: "zoe", x: 42, y: -166, rx: 34, ry: 38 },
            rodilla_der: { contenedor: "zoe", x: -42, y: -166, rx: 34, ry: 38 },
            pie_izq: { contenedor: "zoe", x: 60, y: -30, rx: 52, ry: 36 },
            pie_der: { contenedor: "zoe", x: -60, y: -30, rx: 52, ry: 36 },
            cuerpo: { contenedor: "zoe", x: 0, y: -440, rx: 240, ry: 450 }
        }
    };

    /** viewBox de cada SVG → origen (0..1) para que el (0,0) del dibujo sea el pivote. */
    function origen(clave) {
        var m = /viewBox="([^"]+)"/.exec(SVG[clave] || "");
        if (!m) return { x: 0.5, y: 0.5, w: 0, h: 0 };
        var v = m[1].split(/\s+/).map(Number);
        return { x: -v[0] / v[2], y: -v[1] / v[3], w: v[2], h: v[3] };
    }

    global.Personaje = { SVG: SVG, GEOMETRIA: GEOMETRIA, origen: origen };
})(window);
