/**
 * Accesorios — dibujos de los accesorios del baúl mágico (window.Accesorios).
 *
 * Cada SVG está en las mismas unidades de diseño que Zeus (personaje.js), con el pivote en (0,0) del viewBox
 * en el punto donde se encaja: así, con escalaFinal = 1, el accesorio queda del tamaño justo de Zeus.
 *   gafas          centro del puente (va sobre los ojos, en la cabeza).
 *   sombrero       centro de la base del ala (va en lo alto de la cabeza).
 *   bufanda        centro de la vuelta alrededor del cuello; bufanda_cola cuelga del nudo y ondea.
 *   tenis          talón del tenis izquierdo (se calza en el contenedor de cada pie; el derecho es el espejo).
 *   chancla, bota, sandalia, mocasin, pantufla   mismo pivote de talón que el tenis.
 *   gorra, gorra_roja, gorro, gorro_fiesta, sombrero_copa   misma base que el sombrero.
 *   chaqueta, abrigo, sudadera   icono con mangas; al ponerse, cuerpo + manga de brazo + manga de antebrazo.
 *   chaleco                    sin mangas, con sisa.
 *   pantalones, jeans, pantaloneta   misma cadera; el pantalón llega al tobillo.
 *   guante         centro de la palma (uno en cada mano; el derecho se espeja).
 *   reloj, manilla centro de la pieza, se apoya en la muñeca de cada mano.
 *   audifonos      centro entre las orejas (coords de la cabeza).
 *   collar         centro de la vuelta, en el cuello.
 *   chaqueta       centro del torso. pantalones: centro de las piernas.
 * Para la bandeja hay versiones completas: tenis_par, chanclas_par, botas_par, sandalias_par, guantes_par
 * y bufanda_icono (vuelta + cola).
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

    // Sombreros y gorras: el (0,0) es la base que se sienta en la cabeza, igual que el sombrero.
    function copaGorra(fill, linea, boton) {
        return '<path d="M-72,8 Q-80,-108 0,-120 Q80,-108 72,8 Z" fill="' + fill + '" stroke="' + linea + '" stroke-width="4"/>' +
            '<path d="M-54,-6 Q-58,-78 -16,-100 Q-36,-60 -40,-4 Z" fill="#ffffff" opacity=".28"/>' +
            '<path d="M-72,-16 Q0,-4 72,-16" stroke="#ffd43b" stroke-width="10" fill="none" stroke-linecap="round"/>' +
            '<circle cx="0" cy="-116" r="9" fill="' + boton + '" stroke="' + linea + '" stroke-width="3"/>';
    }
    function alaGorra(fill, linea) {
        return '<path d="M-58,4 Q10,10 48,8 Q96,22 124,42 Q86,12 40,2 Q-8,-4 -58,4 Z" fill="' + fill + '" stroke="' + linea + '" stroke-width="4"/>' +
            '<path d="M-20,8 Q50,16 100,28" stroke="#ffffff" stroke-width="4" fill="none" opacity=".55" stroke-linecap="round"/>';
    }
    SVG.gorra = svg([-140, -140, 300, 210], copaGorra("#4dabf7", "#2f86d6", "#ff6b6b") + alaGorra("#2f86d6", "#1c6eb5"));
    SVG.gorra_roja = svg([-140, -140, 300, 210], copaGorra("#ff6b6b", "#d94848", "#ffffff") + alaGorra("#d94848", "#b83838"));
    SVG.gorro = svg([-120, -186, 240, 230],
        '<path d="M-84,6 Q-96,-100 0,-156 Q96,-100 84,6 Z" fill="#1971c2" stroke="#1864ab" stroke-width="4"/>' +
        '<path d="M-60,-20 Q-66,-80 -16,-118" stroke="#ffffff" stroke-width="8" fill="none" opacity=".3" stroke-linecap="round"/>' +
        '<path d="M-92,10 Q0,40 92,10 L86,-26 Q0,6 -86,-26 Z" fill="#ffd43b" stroke="#e0a800" stroke-width="4"/>' +
        '<circle cx="0" cy="-156" r="20" fill="#ffffff" stroke="#1864ab" stroke-width="4"/>' +
        '<circle cx="-6" cy="-164" r="6" fill="#ffffff" opacity=".85"/>'
    );
    SVG.gorro_fiesta = svg([-110, -206, 220, 250],
        '<path d="M-78,8 L0,-186 L78,8 Z" fill="#ff6b6b" stroke="#d94848" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M-48,-16 L-6,-140" stroke="#ffd43b" stroke-width="14" stroke-linecap="round"/>' +
        '<path d="M-22,4 L22,-88" stroke="#4dabf7" stroke-width="14" stroke-linecap="round"/>' +
        '<path d="M-78,8 Q0,34 78,8 L70,-8 Q0,16 -70,-8 Z" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
        '<circle cx="0" cy="-186" r="12" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>'
    );
    SVG.sombrero_copa = svg([-186, -200, 372, 250],
        '<ellipse cx="0" cy="0" rx="168" ry="30" fill="#243b80"/>' +
        '<path d="M-64,2 L-64,-168 Q0,-184 64,-168 L64,2 Z" fill="#243b80" stroke="#1a2a5c" stroke-width="4"/>' +
        '<path d="M-48,-24 Q-52,-140 -16,-160" stroke="#4dabf7" stroke-width="10" fill="none" opacity=".5" stroke-linecap="round"/>' +
        '<path d="M-64,-42 L64,-42 L64,-20 L-64,-20 Z" fill="#c92a2a"/>' +
        '<path d="M-168,2 Q0,44 168,2 Q0,24 -168,2 Z" fill="#1a2a5c"/>' +
        '<path d="M-140,10 Q0,36 140,10" stroke="#ffd43b" stroke-width="4" fill="none" stroke-dasharray="10 8" stroke-linecap="round"/>'
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

    function unoCalzado(dibujo, techo) {
        return svg([-20, techo, 150, -techo + 16], '<g transform="translate(-20,4)">' + dibujo + "</g>");
    }
    function parCalzado(dibujo, techo) {
        return svg([-160, techo, 320, -techo + 24],
            '<g transform="translate(-136,0) translate(124,0) scale(-1,1)">' + dibujo + "</g>" +
            '<g transform="translate(12,0)">' + dibujo + "</g>"
        );
    }
    function suela() {
        return '<path d="M8,-10 L112,-10 Q114,6 98,6 L22,6 Q8,6 8,-10 Z" fill="#ffffff" stroke="#c9d3df" stroke-width="4"/>' +
            '<path d="M8,-2 L112,-2" stroke="#c9d3df" stroke-width="3"/>';
    }
    function flor(x, y, r) {
        return '<g transform="translate(' + x + "," + y + ')">' +
            [0, 72, 144, 216, 288].map(function (a) {
                return '<ellipse cx="0" cy="' + (-r) + '" rx="' + (r * 0.62) + '" ry="' + r + '" fill="#ffffff" transform="rotate(' + a + ')"/>';
            }).join("") +
            '<circle cx="0" cy="0" r="' + (r * 0.7) + '" fill="#ffd43b" stroke="#e0a800" stroke-width="2"/></g>';
    }

    // Horma del tenis: mismo contorno y misma suela, así todo el calzado tapa el pie y el talón cae en (0,0).
    function horma(fill, linea) {
        return '<path d="M12,-8 L12,-46 Q12,-72 40,-72 L62,-72 Q110,-66 108,-14 L108,-6 L12,-6 Z" fill="' + fill + '" stroke="' + linea + '" stroke-width="4"/>' +
            '<path d="M24,-58 Q20,-36 30,-18" stroke="#ffffff" stroke-width="8" fill="none" opacity=".35" stroke-linecap="round"/>';
    }
    function chanclaDibujo() {
        return horma("#4dabf7", "#2f86d6") + suela() +
            '<path d="M20,-30 L20,-54 Q58,-72 98,-50 L98,-28 Q58,-46 20,-30 Z" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
            '<path d="M38,-46 Q58,-60 80,-44" stroke="#ffffff" stroke-width="5" fill="none" opacity=".6" stroke-linecap="round"/>' +
            '<path d="M76,-26 L98,-18 L96,-8 L74,-14 Z" fill="#ff6fae" stroke="#e8559a" stroke-width="3"/>';
    }
    function botaDibujo() {
        return horma("#ffcf3f", "#e0a12a") +
            '<path d="M14,-60 L10,-128 Q16,-142 44,-142 L78,-142 Q104,-132 100,-108 L96,-60 Z" fill="#ffcf3f" stroke="#e0a12a" stroke-width="4"/>' +
            '<path d="M12,-128 Q18,-112 48,-108 L80,-108 Q102,-116 98,-132 Q74,-120 48,-122 Q22,-124 12,-128 Z" fill="#ff6fae" stroke="#e8559a" stroke-width="3"/>' +
            '<path d="M16,-78 L102,-78" stroke="#ff6fae" stroke-width="10" stroke-linecap="round"/>' +
            '<path d="M16,-78 L102,-78" stroke="#fff3c4" stroke-width="4" stroke-dasharray="8 7" stroke-linecap="round"/>' +
            '<path d="M24,-112 Q20,-86 28,-48" stroke="#ffffff" stroke-width="8" fill="none" opacity=".35" stroke-linecap="round"/>' +
            suela() +
            '<circle cx="30" cy="-96" r="5" fill="#ffffff"/>';
    }
    function sandaliaDibujo() {
        return horma("#c47a3a", "#8d5524") + suela() +
            '<path d="M18,-40 L18,-58 Q58,-74 104,-52 L104,-34 Q58,-50 18,-40 Z" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
            '<path d="M20,-22 L20,-36 Q62,-46 106,-28 L106,-14 Q62,-28 20,-22 Z" fill="#4dabf7" stroke="#2f86d6" stroke-width="3"/>' +
            '<path d="M36,-50 Q58,-62 80,-48" stroke="#ffffff" stroke-width="4" fill="none" opacity=".55" stroke-linecap="round"/>';
    }
    function mocasinDibujo() {
        return horma("#c47a3a", "#8d5524") + suela() +
            '<path d="M28,-62 Q26,-40 36,-22 L92,-22 Q104,-36 96,-58 Q70,-70 40,-66 Z" fill="#a8652e" stroke="#8d5524" stroke-width="3"/>' +
            '<path d="M40,-48 Q62,-58 86,-46" stroke="#ffd43b" stroke-width="6" fill="none" stroke-linecap="round"/>' +
            '<rect x="58" y="-52" width="16" height="12" rx="3" fill="#ffd43b" stroke="#e0a800" stroke-width="2"/>';
    }
    function pantuflaDibujo() {
        return horma("#4dabf7", "#2f86d6") + suela() +
            '<path d="M14,-58 Q16,-78 42,-80 L70,-78 Q88,-70 84,-56 L20,-52 Z" fill="#ffffff" stroke="#2f86d6" stroke-width="3"/>' +
            '<circle cx="96" cy="-36" r="14" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
            '<circle cx="90" cy="-42" r="4" fill="#ffffff" opacity=".8"/>';
    }
    function botinDibujo() {
        return horma("#5c4a3a", "#3d2e22") +
            '<path d="M16,-56 L16,-98 Q20,-110 44,-110 L72,-110 Q90,-100 86,-82 L80,-56 Z" fill="#5c4a3a" stroke="#3d2e22" stroke-width="4"/>' +
            '<path d="M30,-96 L34,-44 M46,-102 L48,-42 M62,-98 L60,-42" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M24,-90 Q20,-70 28,-48" stroke="#ffffff" stroke-width="6" fill="none" opacity=".3" stroke-linecap="round"/>' +
            suela();
    }
    SVG.chancla = unoCalzado(chanclaDibujo(), -90);
    SVG.chanclas_par = parCalzado(chanclaDibujo(), -90);
    SVG.bota = unoCalzado(botaDibujo(), -150);
    SVG.botas_par = parCalzado(botaDibujo(), -150);
    SVG.sandalia = unoCalzado(sandaliaDibujo(), -100);
    SVG.sandalias_par = parCalzado(sandaliaDibujo(), -100);
    SVG.mocasin = unoCalzado(mocasinDibujo(), -90);
    SVG.mocasines_par = parCalzado(mocasinDibujo(), -90);
    SVG.pantufla = unoCalzado(pantuflaDibujo(), -100);
    SVG.pantuflas_par = parCalzado(pantuflaDibujo(), -100);
    SVG.botin = unoCalzado(botinDibujo(), -124);
    SVG.botines_par = parCalzado(botinDibujo(), -124);

    // Guante = la mano de Zeus (personaje.js SVG.mano), un poco más grande.
    // Dedos hacia +y, pulgar hacia -x (de lado, no hacia la muñeca), puño en -y. El de la derecha se espeja al ponerlo.
    function dedoGuante(cx, alto, punta, fill, linea) {
        var y = punta - alto;
        return '<rect x="' + (cx - 7) + '" y="' + y + '" width="14" height="' + alto + '" rx="7" fill="' + fill + '" stroke="' + linea + '" stroke-width="4"/>';
    }
    function guanteDibujo(fill, linea) {
        return dedoGuante(-22, 34, 50, fill, linea) +
            dedoGuante(-6, 40, 56, fill, linea) +
            dedoGuante(10, 40, 56, fill, linea) +
            dedoGuante(24, 32, 46, fill, linea) +
            '<circle cx="0" cy="2" r="34" fill="' + fill + '" stroke="' + linea + '" stroke-width="4"/>' +
            '<ellipse cx="-44" cy="8" rx="18" ry="11" transform="rotate(18 -44 8)" fill="' + fill + '" stroke="' + linea + '" stroke-width="4"/>' +
            '<path d="M-10,-6 Q-6,12 4,24 Q-2,8 -2,-4 Z" fill="#ffffff" opacity=".3"/>' +
            '<rect x="-20" y="-48" width="40" height="20" rx="9" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
            '<path d="M-12,-40 L12,-40 M-12,-33 L12,-33" stroke="#e0a800" stroke-width="3" stroke-linecap="round"/>';
    }
    function parGuantes(fill, linea) {
        var uno = guanteDibujo(fill, linea);
        return '<g transform="translate(-78,0)">' + uno + "</g>" +
            '<g transform="translate(78,0) scale(-1,1)">' + uno + "</g>";
    }
    SVG.guante = svg([-74, -58, 124, 128], guanteDibujo("#ff6b6b", "#d94848"));
    SVG.guantes_par = svg([-170, -64, 340, 140], parGuantes("#ff6b6b", "#d94848"));
    SVG.guante_azul = svg([-74, -58, 124, 128], guanteDibujo("#4dabf7", "#2f86d6"));
    SVG.guantes_azules_par = svg([-170, -64, 340, 140], parGuantes("#4dabf7", "#2f86d6"));
    SVG.guante_verde = svg([-74, -58, 124, 128], guanteDibujo("#51cf66", "#2f9e44"));
    SVG.guantes_verdes_par = svg([-170, -64, 340, 140], parGuantes("#51cf66", "#2f9e44"));

    // Reloj y manilla caben en la muñeca (el puño de la mano mide ~32 de ancho).
    SVG.reloj = svg([-20, -24, 40, 48],
        '<rect x="-11" y="-22" width="22" height="44" rx="11" fill="#243b53" stroke="#12283c" stroke-width="3"/>' +
        '<rect x="-11" y="-14" width="22" height="7" fill="#ffd43b"/>' +
        '<rect x="-11" y="8" width="22" height="7" fill="#ffd43b"/>' +
        '<circle cx="0" cy="0" r="14" fill="#ffffff" stroke="#4dabf7" stroke-width="4"/>' +
        '<circle cx="0" cy="0" r="3" fill="#2f86d6"/>' +
        '<path d="M0,0 L0,-8 M0,0 L6,4" stroke="#2f86d6" stroke-width="3" stroke-linecap="round"/>' +
        '<ellipse cx="-4" cy="-4" rx="4" ry="3" fill="#ffffff" opacity=".85"/>'
    );
    function cuenta(cx, cy, r, fill, linea) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '" stroke="' + linea + '" stroke-width="3"/>' +
            '<circle cx="' + (cx - r * 0.28) + '" cy="' + (cy - r * 0.28) + '" r="' + (r * 0.28) + '" fill="#ffffff" opacity=".75"/>';
    }
    // Banda cerrada sobre la muñeca. No es un arco de cuentas: eso se leía como el collar.
    SVG.manilla = svg([-24, -14, 48, 28],
        '<rect x="-20" y="-9" width="40" height="18" rx="9" fill="#ff6b6b" stroke="#d94848" stroke-width="3"/>' +
        '<rect x="-20" y="-3" width="40" height="5" fill="#ffd43b"/>' +
        '<circle cx="13" cy="0" r="3.5" fill="#ffffff" stroke="#e0a800" stroke-width="2"/>'
    );
    SVG.pulsera = svg([-26, -16, 52, 32],
        '<rect x="-22" y="-11" width="44" height="22" rx="7" fill="#4dabf7" stroke="#2f86d6" stroke-width="3"/>' +
        '<rect x="-22" y="-2" width="44" height="6" fill="#ffd43b"/>' +
        '<path d="M-14,-7 L-8,7 M-2,-7 L4,7 M10,-7 L16,7" stroke="#ffffff" stroke-width="2" opacity=".5" stroke-linecap="round"/>'
    );

    // Audífonos: copa centrada en cada oreja (r=28 en ±146,-140 de la cabeza). La diadema pasa por encima del pelo.
    function copa(x) {
        return '<g transform="translate(' + x + ',0)">' +
            '<circle cx="0" cy="0" r="36" fill="#243b53" stroke="#12283c" stroke-width="4"/>' +
            '<circle cx="0" cy="0" r="22" fill="#243b80"/>' +
            '<ellipse cx="-7" cy="-8" rx="8" ry="11" fill="#ffffff" opacity=".35"/>' +
            '<circle cx="0" cy="-40" r="7" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
            "</g>";
    }
    SVG.audifonos = svg([-200, -230, 400, 290],
        '<path d="M-146,-28 L-146,-96 Q-146,-214 0,-214 Q146,-214 146,-96 L146,-28" stroke="#e0a800" stroke-width="20" fill="none" stroke-linecap="round"/>' +
        '<path d="M-146,-28 L-146,-90 Q-140,-198 0,-198 Q140,-198 146,-90 L146,-28" stroke="#ffd43b" stroke-width="10" fill="none" stroke-linecap="round"/>' +
        copa(-146) + copa(146)
    );

    // Collar: cuentas gordas, el mismo idioma que la bufanda (vuelta ancha y un dije).
    SVG.collar = svg([-110, -36, 220, 96],
        cuenta(-78, -8, 13, "#ffd43b", "#e0a800") +
        cuenta(-50, 2, 13, "#ff6fae", "#e8559a") +
        cuenta(-24, 8, 13, "#4dabf7", "#2f86d6") +
        cuenta(24, 8, 13, "#4dabf7", "#2f86d6") +
        cuenta(50, 2, 13, "#ff6fae", "#e8559a") +
        cuenta(78, -8, 13, "#ffd43b", "#e0a800") +
        '<path d="M-16,16 Q0,28 16,16 L12,36 Q0,52 -12,36 Z" fill="#ff6b6b" stroke="#d94848" stroke-width="3"/>' +
        '<circle cx="-4" cy="26" r="4" fill="#ffffff" opacity=".55"/>'
    );

    // Torso en coords locales (0,0) = Zeus (0,-450): la camiseta va de y=-552 a -382, x=±100.
    // El cuerpo puesto no lleva mangas dibujadas: van en el brazo (manga) y en el antebrazo (ante)
    // para que se doblen con el codo. El icono de la bandeja sí las trae, si no la pieza sale como chaleco.
    function prendaTorso(color, linea, claro, bajo) {
        return '<path d="M-106,-74 Q-110,-106 -70,-112 L70,-112 Q110,-106 106,-74 L110,' + bajo + ' Q0,' + (bajo + 14) + ' -110,' + bajo + ' Z" fill="' + color + '" stroke="' + linea + '" stroke-width="4"/>' +
            '<path d="M-94,-78 Q-98,-16 -86,16 Q-40,2 -28,-88 Z" fill="#ffffff" opacity=".22"/>' +
            '<path d="M-6,-100 L-46,-50 L-6,4 Z" fill="' + claro + '" stroke="' + linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M6,-100 L46,-50 L6,4 Z" fill="' + linea + '" stroke="' + linea + '" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M-34,-108 Q0,-90 34,-108 L26,-80 Q0,-68 -26,-80 Z" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
            '<path d="M0,-72 L0,' + (bajo - 10) + '" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"/>' +
            '<circle cx="0" cy="-36" r="6" fill="#ffffff" stroke="#e0a800" stroke-width="2"/>' +
            '<circle cx="0" cy="-4" r="6" fill="#ffffff" stroke="#e0a800" stroke-width="2"/>' +
            '<circle cx="0" cy="28" r="6" fill="#ffffff" stroke="#e0a800" stroke-width="2"/>' +
            '<rect x="-80" y="6" width="34" height="28" rx="8" fill="' + claro + '" stroke="' + linea + '" stroke-width="3"/>' +
            '<rect x="46" y="6" width="34" height="28" rx="8" fill="' + linea + '" stroke="' + linea + '" stroke-width="3"/>';
    }
    // Manga del hombro al codo (pivote en el hombro, igual que SVG.brazo). Tapa el parche verde y la piel.
    function manga(color, linea) {
        return svg([-58, -56, 116, 176],
            '<path d="M-50,-6 Q-56,-50 0,-52 Q56,-50 50,-6 L40,104 Q0,118 -40,104 Z" fill="' + color + '" stroke="' + linea + '" stroke-width="4"/>' +
            '<path d="M-22,-20 Q-26,30 -16,80" stroke="#ffffff" stroke-width="8" fill="none" opacity=".28" stroke-linecap="round"/>'
        );
    }
    // Manga del codo a la muñeca (pivote en el codo, igual que SVG.antebrazo). El puño queda antes de la mano.
    function ante(color, linea) {
        return svg([-28, -10, 56, 118],
            '<path d="M-24,-2 L24,-2 L22,92 Q0,104 -22,92 Z" fill="' + color + '" stroke="' + linea + '" stroke-width="4"/>' +
            '<path d="M-22,80 Q0,92 22,80" stroke="#ffd43b" stroke-width="8" fill="none" stroke-linecap="round"/>' +
            '<path d="M-10,8 Q-12,40 -8,70" stroke="#ffffff" stroke-width="6" fill="none" opacity=".3" stroke-linecap="round"/>'
        );
    }
    // Mangas del icono, detrás del cuerpo. yPuño es dónde termina la manga.
    function parMangas(color, linea, yPunio) {
        function lado(s) {
            return '<path d="M' + (s * 62) + ',-88 Q' + (s * 148) + ',-120 ' + (s * 162) + ',-36 L' + (s * 146) + ',' + yPunio +
                ' Q' + (s * 112) + ',' + (yPunio + 18) + ' ' + (s * 94) + ',' + (yPunio - 8) + ' L' + (s * 108) + ',-24 Q' + (s * 86) + ',-68 ' + (s * 62) + ',-88 Z" fill="' + color + '" stroke="' + linea + '" stroke-width="4" stroke-linejoin="round"/>' +
                '<path d="M' + (s * 98) + ',' + (yPunio - 12) + ' Q' + (s * 122) + ',' + (yPunio + 6) + ' ' + (s * 144) + ',' + (yPunio - 10) + '" stroke="#ffd43b" stroke-width="8" fill="none" stroke-linecap="round"/>';
        }
        return lado(-1) + lado(1);
    }
    function cuerpoSudadera() {
        return '<path d="M-106,-74 Q-110,-106 -70,-112 L70,-112 Q110,-106 106,-74 L110,64 Q0,78 -110,64 Z" fill="#748ffc" stroke="#4c6ef5" stroke-width="4"/>' +
            '<path d="M-94,-78 Q-98,-16 -86,16 Q-40,2 -28,-88 Z" fill="#ffffff" opacity=".22"/>' +
            '<path d="M-36,-108 Q0,-90 36,-108 L30,-86 Q0,-76 -30,-86 Z" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
            '<path d="M-110,46 Q0,60 110,46 L108,70 Q0,84 -108,70 Z" fill="#5c7cfa"/>' +
            '<path d="M-34,6 Q-38,34 0,38 Q38,34 34,6 Q0,14 -34,6 Z" fill="#5c7cfa" stroke="#4c6ef5" stroke-width="3"/>';
    }
    SVG.chaqueta = svg([-130, -128, 260, 230], prendaTorso("#ff6b6b", "#d94848", "#ff8787", 64));
    SVG.chaqueta_icono = svg([-180, -140, 360, 250], parMangas("#ff6b6b", "#d94848", 36) + prendaTorso("#ff6b6b", "#d94848", "#ff8787", 64));
    SVG.chaqueta_manga = manga("#ff6b6b", "#d94848");
    SVG.chaqueta_ante = ante("#ff6b6b", "#d94848");
    SVG.abrigo = svg([-130, -128, 260, 300], prendaTorso("#4dabf7", "#2f86d6", "#74c0fc", 140));
    SVG.abrigo_icono = svg([-180, -140, 360, 320], parMangas("#4dabf7", "#2f86d6", 96) + prendaTorso("#4dabf7", "#2f86d6", "#74c0fc", 140));
    SVG.abrigo_manga = manga("#4dabf7", "#2f86d6");
    SVG.abrigo_ante = ante("#4dabf7", "#2f86d6");
    // Chaleco: sin mangas a propósito. Sisa marcada para que no se lea como una chaqueta a la que le faltan.
    SVG.chaleco = svg([-100, -128, 200, 220],
        '<path d="M-62,-70 Q-70,-108 -34,-116 L34,-116 Q70,-108 62,-70 Q44,-28 50,22 Q56,54 46,64 Q0,78 -46,64 Q-56,54 -50,22 Q-44,-28 -62,-70 Z" fill="#845ef7" stroke="#5f3dc4" stroke-width="4"/>' +
        '<path d="M-48,-40 Q-36,8 -40,48" stroke="#b197fc" stroke-width="8" fill="none" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M48,-40 Q36,8 40,48" stroke="#5f3dc4" stroke-width="8" fill="none" stroke-linecap="round" opacity=".45"/>' +
        '<path d="M-28,-110 Q0,-92 28,-110 L22,-82 Q0,-70 -22,-82 Z" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>' +
        '<path d="M0,-74 L0,52" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"/>' +
        '<circle cx="0" cy="-40" r="6" fill="#ffffff" stroke="#e0a800" stroke-width="2"/>' +
        '<circle cx="0" cy="-8" r="6" fill="#ffffff" stroke="#e0a800" stroke-width="2"/>' +
        '<circle cx="0" cy="24" r="6" fill="#ffffff" stroke="#e0a800" stroke-width="2"/>'
    );
    SVG.sudadera = svg([-130, -128, 260, 230], cuerpoSudadera());
    SVG.sudadera_icono = svg([-180, -140, 360, 250], parMangas("#748ffc", "#4c6ef5", 40) + cuerpoSudadera());
    SVG.sudadera_manga = manga("#748ffc", "#4c6ef5");
    SVG.sudadera_ante = ante("#748ffc", "#4c6ef5");

    // Piernas en coords locales (0,0) = Zeus (0,-270). La pantaloneta del cuerpo va de y=-410 a -252; las piernas, de x=±20..64 hasta el tobillo.
    function prendaPiernas(color, linea, claro) {
        return '<path d="M-116,-152 L116,-152 L132,28 L88,28 L88,248 L8,248 L8,42 Q0,-32 -8,42 L-8,248 L-88,248 L-88,28 L-132,28 Z" fill="' + color + '" stroke="' + linea + '" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M-108,-150 Q0,-128 108,-150 L100,-132 Q0,-114 -100,-132 Z" fill="' + claro + '"/>' +
            '<path d="M-48,-128 L-48,232" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"/>' +
            '<path d="M48,-128 L48,232" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"/>' +
            '<path d="M-96,-110 Q-100,40 -90,200" stroke="#ffffff" stroke-width="8" fill="none" opacity=".25" stroke-linecap="round"/>' +
            '<path d="M-88,224 L-88,248 L-8,248 L-8,224 Z" fill="' + linea + '"/>' +
            '<path d="M8,224 L8,248 L88,248 L88,224 Z" fill="' + linea + '"/>' +
            '<circle cx="-78" cy="-136" r="5" fill="#ffffff" stroke="' + linea + '" stroke-width="2"/>' +
            '<circle cx="78" cy="-136" r="5" fill="#ffffff" stroke="' + linea + '" stroke-width="2"/>';
    }
    SVG.pantalones = svg([-150, -170, 300, 440], prendaPiernas("#ff922b", "#e8590c", "#ffc078"));
    SVG.jeans = svg([-150, -170, 300, 440], prendaPiernas("#4dabf7", "#2f86d6", "#74c0fc"));
    SVG.pantaloneta = svg([-140, -165, 280, 230],
        '<path d="M-108,-150 L108,-150 L122,30 Q68,44 18,24 L0,-28 L-18,24 Q-68,44 -122,30 Z" fill="#1971c2" stroke="#1864ab" stroke-width="4"/>' +
        '<path d="M-100,-132 Q0,-112 100,-132" stroke="#ffd43b" stroke-width="10" fill="none" stroke-linecap="round"/>' +
        '<path d="M-90,-100 Q-96,0 -80,20" stroke="#ffffff" stroke-width="8" fill="none" opacity=".3" stroke-linecap="round"/>' +
        '<path d="M-70,-40 L-78,16 M70,-40 L78,16" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>' +
        '<circle cx="-70" cy="-136" r="5" fill="#ffffff" stroke="#1864ab" stroke-width="2"/>' +
        '<circle cx="70" cy="-136" r="5" fill="#ffffff" stroke="#1864ab" stroke-width="2"/>'
    );

    // Visera: solo el ala, misma base (y=0) que el sombrero.
    SVG.visera = svg([-160, -36, 330, 110],
        '<path d="M-78,-6 Q0,-28 78,-6 L72,10 Q0,22 -72,10 Z" fill="#ff6b6b" stroke="#d94848" stroke-width="4"/>' +
        '<path d="M-48,4 Q30,10 90,8 Q148,30 168,52 Q100,18 36,6 Q-8,0 -48,4 Z" fill="#d94848" stroke="#b83838" stroke-width="4"/>' +
        '<path d="M-10,10 Q70,18 130,34" stroke="#ffffff" stroke-width="4" fill="none" opacity=".5" stroke-linecap="round"/>' +
        '<circle cx="0" cy="-16" r="7" fill="#ffd43b" stroke="#e0a800" stroke-width="2"/>'
    );

    function lenteRedonda(cx) {
        return '<circle cx="' + cx + '" cy="0" r="40" fill="#243b80" stroke="#ffd43b" stroke-width="10"/>' +
            '<path d="M' + (cx - 16) + ',-14 L' + (cx - 2) + ',-14 L' + (cx - 20) + ',8 Z" fill="#ffffff" opacity=".4"/>';
    }
    SVG.gafas_redondas = svg([-148, -56, 296, 112],
        lenteRedonda(-54) + lenteRedonda(54) +
        '<path d="M-14,-4 Q0,-16 14,-4" stroke="#ffd43b" stroke-width="8" fill="none" stroke-linecap="round"/>' +
        '<path d="M-94,0 L-132,-14 M94,0 L132,-14" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"/>'
    );
    SVG.antifaz = svg([-168, -52, 336, 108],
        '<path d="M-146,-4 L-166,-18 M146,-4 L166,-18" stroke="#3d2e22" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="M-138,2 Q-88,-42 -18,-14 Q0,-4 18,-14 Q88,-42 138,2 Q96,34 48,26 Q0,12 -48,26 Q-96,34 -138,2 Z" fill="#5c4a3a" stroke="#3d2e22" stroke-width="4"/>' +
        '<ellipse cx="-56" cy="4" rx="26" ry="16" fill="#1d120c"/>' +
        '<ellipse cx="56" cy="4" rx="26" ry="16" fill="#1d120c"/>' +
        '<ellipse cx="-66" cy="-2" rx="8" ry="5" fill="#ffffff" opacity=".35"/>' +
        '<circle cx="0" cy="-2" r="6" fill="#ffd43b" stroke="#e0a800" stroke-width="2"/>'
    );

    function orejera(x) {
        var pelos = "";
        for (var i = 0; i < 8; i++) {
            var a = i * Math.PI / 4;
            pelos += '<circle cx="' + Math.round(Math.cos(a) * 26) + '" cy="' + Math.round(Math.sin(a) * 26) + '" r="14" fill="#ffd43b" stroke="#e0a800" stroke-width="3"/>';
        }
        return '<g transform="translate(' + x + ',0)">' + pelos +
            '<circle r="24" fill="#4dabf7" stroke="#2f86d6" stroke-width="4"/>' +
            '<ellipse cx="-7" cy="-7" rx="7" ry="5" fill="#ffffff" opacity=".5"/></g>';
    }
    SVG.orejeras = svg([-200, -230, 400, 290],
        '<path d="M-146,-20 L-146,-96 Q-146,-214 0,-214 Q146,-214 146,-96 L146,-20" stroke="#e0a800" stroke-width="16" fill="none" stroke-linecap="round"/>' +
        '<path d="M-146,-20 L-146,-90 Q-140,-198 0,-198 Q140,-198 146,-90 L146,-20" stroke="#ffd43b" stroke-width="8" fill="none" stroke-linecap="round"/>' +
        orejera(-146) + orejera(146)
    );
    function casco(x) {
        return '<g transform="translate(' + x + ',0)">' +
            '<circle r="34" fill="#243b53" stroke="#12283c" stroke-width="4"/>' +
            '<circle r="20" fill="#4dabf7" stroke="#2f86d6" stroke-width="4"/>' +
            '<ellipse cx="-6" cy="-6" rx="7" ry="5" fill="#ffffff" opacity=".45"/>' +
            "</g>";
    }
    SVG.cascos = svg([-200, -230, 400, 290],
        '<path d="M-146,-20 L-146,-96 Q-146,-214 0,-214 Q146,-214 146,-96 L146,-20" stroke="#12283c" stroke-width="18" fill="none" stroke-linecap="round"/>' +
        '<path d="M-146,-20 L-146,-90 Q-140,-198 0,-198 Q140,-198 146,-90 L146,-20" stroke="#4dabf7" stroke-width="8" fill="none" stroke-linecap="round"/>' +
        casco(-146) + casco(146)
    );

    SVG.bermuda = svg([-140, -165, 280, 300],
        '<path d="M-108,-150 L108,-150 L122,24 L74,24 L82,112 L16,112 L8,32 L-8,32 L-16,112 L-82,112 L-74,24 L-122,24 Z" fill="#1c4b82" stroke="#12345c" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M-108,-150 Q0,-130 108,-150 L100,-132 Q0,-116 -100,-132 Z" fill="#2f6fad"/>' +
        '<path d="M-46,-128 L-50,96 M46,-128 L50,96" stroke="#ffd43b" stroke-width="8" stroke-linecap="round"/>' +
        '<circle cx="-72" cy="-136" r="5" fill="#ffffff" stroke="#12345c" stroke-width="2"/>' +
        '<circle cx="72" cy="-136" r="5" fill="#ffffff" stroke="#12345c" stroke-width="2"/>'
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

    var Accesorios = { SVG: SVG, origen: origen, dataUrl: dataUrl };
    global.Accesorios = Accesorios;
    if (typeof module !== "undefined" && module.exports) module.exports = Accesorios;
})(typeof window !== "undefined" ? window : global);
