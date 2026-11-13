/**
 * PartesCuerpo — dibujos compartidos de las partes del cuerpo para las tarjetas de Polimotor
 * (Memorama de partes, Une las partes, Golpea a los topos y ¿Dónde lo uso?). window.PartesCuerpo.SVG[id].
 *
 * Pensados para niños de 3 a 6 años:
 *   - Una sola parte por tarjeta, grande (llena casi toda la tarjeta) y en su vista más reconocible.
 *   - Contorno grueso y oscuro "de calcomanía" alrededor de toda la figura (sin rayas por dentro).
 *   - Colores planos con una sombra suave; piel, pelo y ropa de Zeus (como el personaje oficial).
 *   - Cada parte se distingue de las vecinas: el cuello no lleva cara, la pierna llega al tobillo y el
 *     pie se ve desde arriba con sus cinco deditos.
 * Todos usan viewBox 0 0 120 120 (el tamaño que esperan los cuatro juegos). Cada juego sigue teniendo sus
 * propios dibujos de objetos; solo se reemplazan las partes del cuerpo (ver el final de cada iconos.js).
 */
(function (global) {
    'use strict';

    var PIEL = '#f6cbb7';
    var SOMBRA = '#eaa58f';
    var LINEA = '#5b3428';
    var PELO = '#7f3f1a';
    var PELO_LUZ = '#a0582b';
    var CAMISETA = '#2b896f';
    var RIBETE = '#8cc97c';
    var SHORT = '#0a5a7a';
    var ROSA = '#f29a98';
    var LABIO = '#d9483f';
    var BOCA = '#7a1f22';
    var LENGUA = '#f28b86';
    var OJO = '#2c211c';
    var IRIS = '#6b3e1f';
    var BRILLO = '#ffe066';
    var GROSOR = 7;

    function svg(cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">' + cuerpo + '</svg>';
    }

    /**
     * Calcomanía: las formas se pintan primero gruesas en el color del contorno y luego encima con su
     * relleno, así el borde rodea toda la silueta sin rayas por dentro. formas: [[tipo, attrs, relleno]].
     */
    function calco(formas, grosor) {
        var g = grosor || GROSOR;
        var abajo = formas.map(function (f) {
            return '<' + f[0] + ' ' + f[1] + ' fill="' + LINEA + '" stroke="' + LINEA + '" stroke-width="' + g + '" stroke-linejoin="round" stroke-linecap="round"/>';
        }).join('');
        var arriba = formas.map(function (f) {
            return '<' + f[0] + ' ' + f[1] + ' fill="' + f[2] + '"/>';
        }).join('');
        return abajo + arriba;
    }

    /** Extremidad: trazo grueso redondeado (brazo, dedo, pierna) con su contorno. */
    function tubo(d, ancho, color) {
        return '<path d="' + d + '" fill="none" stroke="' + LINEA + '" stroke-width="' + (ancho + GROSOR) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + ancho + '" stroke-linecap="round" stroke-linejoin="round"/>';
    }

    function linea(d, color, ancho, extra) {
        return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + ancho + '" stroke-linecap="round" stroke-linejoin="round"' + (extra ? ' ' + extra : '') + '/>';
    }

    /** Destellos amarillos a los lados de un punto (señalan la parte, p. ej. el cuello). */
    function destellos(cx, cy, dx) {
        return linea('M' + (cx - dx) + ',' + (cy - 12) + ' l-9,-5 M' + (cx - dx) + ',' + cy + ' l-11,0 M' + (cx - dx) + ',' + (cy + 12) + ' l-9,5' +
            ' M' + (cx + dx) + ',' + (cy - 12) + ' l9,-5 M' + (cx + dx) + ',' + cy + ' l11,0 M' + (cx + dx) + ',' + (cy + 12) + ' l9,5', BRILLO, 5);
    }

    var SVG = {};

    // ── Cabeza de Zeus de frente: pelo, orejas, ojos, mejillas y sonrisa ──
    SVG.cabeza = svg(
        calco([
            ['ellipse', 'cx="20" cy="66" rx="9" ry="12"', PIEL],
            ['ellipse', 'cx="100" cy="66" rx="9" ry="12"', PIEL],
            ['ellipse', 'cx="60" cy="66" rx="38" ry="42"', PIEL],
            ['path', 'd="M22,62 C18,30 36,12 60,12 C86,12 104,30 98,62 C94,50 86,42 76,40 L72,47 L65,38 L58,47 L51,38 L44,46 C34,46 26,52 22,62 Z"', PELO]
        ]) +
        linea('M40,20 Q56,14 74,22', PELO_LUZ, 4, 'opacity=".8"') +
        '<ellipse cx="20" cy="66" rx="4" ry="6" fill="' + ROSA + '" opacity=".7"/><ellipse cx="100" cy="66" rx="4" ry="6" fill="' + ROSA + '" opacity=".7"/>' +
        linea('M38,57 Q45,52 52,57 M68,57 Q75,52 82,57', PELO, 4) +
        '<ellipse cx="45" cy="68" rx="6" ry="7.5" fill="' + OJO + '"/><ellipse cx="75" cy="68" rx="6" ry="7.5" fill="' + OJO + '"/>' +
        '<circle cx="47.5" cy="65" r="2.4" fill="#fff"/><circle cx="77.5" cy="65" r="2.4" fill="#fff"/>' +
        '<ellipse cx="60" cy="78" rx="4.5" ry="3.5" fill="' + SOMBRA + '"/>' +
        '<ellipse cx="35" cy="82" rx="7" ry="4.5" fill="' + ROSA + '" opacity=".55"/><ellipse cx="85" cy="82" rx="7" ry="4.5" fill="' + ROSA + '" opacity=".55"/>' +
        '<path d="M47,88 Q60,102 73,88 Q60,94 47,88 Z" fill="' + LABIO + '" stroke="' + LINEA + '" stroke-width="2.5" stroke-linejoin="round"/>'
    );

    // ── Ojos: dos ojos grandes con cejas, pestañas y brillo ──
    function ojo(cx) {
        return calco([['ellipse', 'cx="' + cx + '" cy="66" rx="20" ry="22"', '#ffffff']], 6) +
            '<circle cx="' + cx + '" cy="69" r="13" fill="' + IRIS + '"/>' +
            '<circle cx="' + cx + '" cy="69" r="7" fill="' + OJO + '"/>' +
            '<circle cx="' + (cx + 4) + '" cy="64" r="4" fill="#ffffff"/>' +
            '<circle cx="' + (cx - 4) + '" cy="74" r="1.8" fill="#ffffff" opacity=".8"/>' +
            linea('M' + (cx - 21) + ',58 Q' + cx + ',38 ' + (cx + 21) + ',58', LINEA, 5) +
            linea('M' + (cx - 14) + ',47 l-4,-7 M' + cx + ',43 l0,-8 M' + (cx + 14) + ',47 l4,-7', LINEA, 3.5) +
            linea('M' + (cx - 19) + ',30 Q' + cx + ',20 ' + (cx + 19) + ',30', PELO, 6);
    }
    SVG.ojos = svg(ojo(32) + ojo(88));

    // ── Nariz grande de frente, con su puente, las aletas y los agujeros ──
    SVG.nariz = svg(
        calco([['path', 'd="M60,14 C55,38 47,58 40,72 C33,86 38,102 52,100 C55,107 65,107 68,100 C82,102 87,86 80,72 C73,58 65,38 60,14 Z"', PIEL]]) +
        '<path d="M60,18 C56,40 49,58 43,72 C38,82 39,92 46,96 C44,86 50,72 56,58 C59,48 60,32 60,18 Z" fill="' + SOMBRA + '" opacity=".7"/>' +
        linea('M64,30 C66,46 70,58 74,68', '#ffffff', 4, 'opacity=".7"') +
        '<ellipse cx="51" cy="92" rx="6" ry="4" fill="' + LINEA + '" transform="rotate(-18 51 92)"/>' +
        '<ellipse cx="69" cy="92" rx="6" ry="4" fill="' + LINEA + '" transform="rotate(18 69 92)"/>'
    );

    // ── Boca sonriente: labios, dientes y lengua ──
    SVG.boca = svg(
        calco([['path', 'd="M10,50 Q34,40 60,46 Q86,40 110,50 Q104,100 60,102 Q16,100 10,50 Z"', LABIO]]) +
        '<path d="M22,56 Q60,48 98,56 Q92,90 60,92 Q28,90 22,56 Z" fill="' + BOCA + '"/>' +
        '<path d="M24,57 Q60,50 96,57 L93,68 Q60,63 27,68 Z" fill="#ffffff"/>' +
        linea('M42,58 L42,66 M60,56 L60,65 M78,58 L78,66', '#e9ecef', 2) +
        '<ellipse cx="60" cy="82" rx="22" ry="9" fill="' + LENGUA + '"/>' +
        linea('M60,77 L60,86', '#e06f6a', 2.5) +
        linea('M24,47 Q34,43 44,46', '#ffffff', 4, 'opacity=".6"')
    );

    // ── Oreja: la oreja grande en forma de "C" pegada a un pedacito de mejilla con patilla (así se ve que
    //    va en la cabeza): borde enrollado, hueco rosado, el "botoncito" de adelante y el lóbulo ──
    SVG.orejas = svg(
        calco([
            ['path', 'd="M-6,-6 L40,-6 L40,126 L-6,126 Z"', PIEL],
            ['path', 'd="M-6,-6 L46,-6 C40,8 34,16 30,30 L22,30 C14,18 4,12 -6,14 Z"', PELO]
        ]) +
        '<ellipse cx="14" cy="80" rx="10" ry="7" fill="' + ROSA + '" opacity=".55"/>' +
        calco([['path', 'd="M42,14 C72,4 104,24 102,58 C100,80 86,88 82,100 C78,114 60,118 52,106 C47,99 50,92 46,86 C40,78 38,66 40,52 C41,36 38,22 42,14 Z"', PIEL]]) +
        // borde enrollado (hélice): banda más oscura por dentro del contorno
        linea('M48,22 C74,14 94,30 92,56 C90,74 78,80 74,92', SOMBRA, 7) +
        // hueco de la oreja (concha) rosado
        '<path d="M56,40 C70,34 82,44 80,58 C78,70 70,72 66,80 C60,78 54,72 54,64 C54,58 50,54 52,48 C53,44 54,42 56,40 Z" fill="#ef9a90"/>' +
        '<path d="M60,50 C68,46 74,52 72,60 C70,66 64,68 62,72 C58,68 58,62 60,58 Z" fill="#d9786e"/>' +
        // botoncito de adelante (trago) y lóbulo
        '<path d="M46,58 C54,58 56,72 48,76" fill="none" stroke="' + SOMBRA + '" stroke-width="4" stroke-linecap="round"/>' +
        '<ellipse cx="64" cy="104" rx="9" ry="7" fill="' + ROSA + '" opacity=".6"/>' +
        linea('M86,34 Q94,48 92,62', '#ffffff', 4, 'opacity=".6"')
    );

    // ── Cuello: Zeus de los hombros para arriba; el cuello (corto, como el de un niño) resaltado en amarillo ──
    SVG.cuello = svg(
        '<rect x="38" y="52" width="44" height="44" rx="12" fill="' + BRILLO + '" opacity=".6"/>' +
        calco([
            ['path', 'd="M4,120 C6,102 24,92 42,90 L78,90 C96,92 114,102 116,120 Z"', CAMISETA],
            ['rect', 'x="46" y="54" width="28" height="40" rx="7"', PIEL]
        ]) +
        '<path d="M46,64 Q60,74 74,64 L74,72 Q60,80 46,72 Z" fill="' + SOMBRA + '"/>' +
        '<path d="M38,90 Q60,106 82,90 L82,96 Q60,112 38,96 Z" fill="' + RIBETE + '"/>' +
        linea('M67,76 L67,88', '#ffffff', 3.5, 'opacity=".5"') +
        calco([
            ['ellipse', 'cx="32" cy="36" rx="5.5" ry="7.5"', PIEL],
            ['ellipse', 'cx="88" cy="36" rx="5.5" ry="7.5"', PIEL],
            ['ellipse', 'cx="60" cy="36" rx="27" ry="28"', PIEL],
            ['path', 'd="M33,34 C31,12 44,4 60,4 C77,4 90,12 87,34 C83,25 77,20 70,20 L66,26 L59,19 L52,26 C43,25 36,27 33,34 Z"', PELO]
        ]) +
        '<circle cx="50" cy="38" r="3.6" fill="' + OJO + '"/><circle cx="70" cy="38" r="3.6" fill="' + OJO + '"/>' +
        '<circle cx="51.2" cy="36.8" r="1.2" fill="#fff"/><circle cx="71.2" cy="36.8" r="1.2" fill="#fff"/>' +
        linea('M51,50 Q60,57 69,50', LINEA, 2.8) +
        '<ellipse cx="42" cy="47" rx="4.5" ry="3" fill="' + ROSA + '" opacity=".6"/><ellipse cx="78" cy="47" rx="4.5" ry="3" fill="' + ROSA + '" opacity=".6"/>' +
        destellos(60, 78, 32)
    );

    // ── Brazo de niño, doblado: manga corta en el hombro, brazo delgado y suave, codo abajo y puñito arriba ──
    SVG.brazo = svg(
        '<g transform="translate(8,4)">' +
        calco([
            // brazo de arriba (delgado, sin músculo marcado)
            ['path', 'd="M24,62 C40,58 56,60 68,66 C78,71 84,78 84,88 C84,97 77,101 69,99 C55,97 40,93 24,91 Z"', PIEL],
            // antebrazo que sube
            ['path', 'd="M64,92 C62,78 64,64 68,50 L86,50 C88,64 87,78 84,92 Z"', PIEL],
            // puñito
            ['rect', 'x="62" y="22" width="30" height="32" rx="13"', PIEL],
            // manga corta de la camiseta en el hombro
            ['path', 'd="M-2,56 C8,50 22,52 28,58 L30,92 C20,98 6,98 -2,92 Z"', CAMISETA]
        ]) +
        '<path d="M23,55 C26,56 28,58 28,58 L30,92 C28,94 26,95 23,95 Z" fill="' + RIBETE + '"/>' +
        // deditos doblados y el pulgar cruzado por delante
        linea('M70,27 L70,41 M77,26 L77,41 M84,27 L84,41', SOMBRA, 2.6) +
        calco([['path', 'd="M64,45 C69,40 81,40 88,43 C90,47 86,51 81,51 L67,51 C63,51 62,48 64,45 Z"', PIEL]], 4) +
        // muñeca, pliegue del codo y brillo suave
        linea('M67,57 L85,57', SOMBRA, 2.6) +
        linea('M63,85 Q68,90 74,88', SOMBRA, 3) +
        linea('M36,66 Q50,62 62,67', '#ffffff', 4, 'opacity=".5"') +
        '<ellipse cx="66" cy="31" rx="2.6" ry="3.4" fill="#ffffff" opacity=".6"/>' +
        '</g>'
    );

    // ── Mano abierta (palma), cinco dedos separados y la manga verde en la muñeca ──
    function mano(tx, ty, k, espejo, sinManga) {
        var t = 'translate(' + (espejo ? tx + 120 * k : tx) + ',' + ty + ') scale(' + (espejo ? -k : k) + ',' + k + ')';
        var dedos = 'M46,56 L42,22 M58,54 L58,15 M70,56 L73,21 M81,62 L88,35 M38,80 L20,60';
        return '<g transform="' + t + '">' +
            '<path d="' + dedos + '" fill="none" stroke="' + LINEA + '" stroke-width="' + (15 + GROSOR) + '" stroke-linecap="round"/>' +
            '<rect x="33" y="50" width="56" height="58" rx="22" fill="' + LINEA + '" stroke="' + LINEA + '" stroke-width="' + GROSOR + '"/>' +
            '<path d="' + dedos + '" fill="none" stroke="' + PIEL + '" stroke-width="15" stroke-linecap="round"/>' +
            '<rect x="33" y="50" width="56" height="58" rx="22" fill="' + PIEL + '"/>' +
            (sinManga ? '' : '<path d="M38,100 L84,100 L86,118 L36,118 Z" fill="' + LINEA + '" stroke="' + LINEA + '" stroke-width="' + GROSOR + '" stroke-linejoin="round"/>' +
            '<path d="M38,100 L84,100 L86,118 L36,118 Z" fill="' + RIBETE + '"/>') +
            linea('M46,74 Q60,84 76,72 M48,88 Q62,94 74,86', SOMBRA, 3) +
            '<ellipse cx="42" cy="18" rx="4" ry="3" fill="#ffffff" opacity=".7"/><ellipse cx="58" cy="11" rx="4" ry="3" fill="#ffffff" opacity=".7"/>' +
            '<ellipse cx="73" cy="17" rx="4" ry="3" fill="#ffffff" opacity=".7"/><ellipse cx="88" cy="31" rx="3.5" ry="2.6" fill="#ffffff" opacity=".7"/>' +
            '</g>';
    }
    SVG.mano = svg(mano(0, 0, 1, false));
    SVG.manos = svg(mano(-8, 20, 0.66, false) + mano(47, 20, 0.66, true));

    // ── Pierna: el borde de la pantaloneta arriba, la rodilla y abajo la media y el tenis ──
    SVG.pierna = svg(
        tubo('M58,22 L60,92', 26, PIEL) +
        calco([
            ['path', 'd="M34,2 L84,2 L82,26 L36,26 Z"', SHORT],
            ['rect', 'x="45" y="86" width="30" height="16" rx="4"', '#ffffff'],
            ['path', 'd="M40,100 L78,100 Q100,102 102,112 L102,116 L38,116 Q34,108 40,100 Z"', '#ff6b6b']
        ]) +
        '<path d="M36,20 L82,20 L82,26 L36,26 Z" fill="#06405a"/>' +
        linea('M48,92 L72,92 M48,97 L72,97', '#ced4da', 2.5) +
        '<rect x="38" y="111" width="64" height="5" rx="2" fill="#ffffff"/>' +
        linea('M60,104 L64,110 M68,104 L72,110', '#ffffff', 2.5) +
        linea('M53,56 Q60,61 67,56', SOMBRA, 3.5) +
        linea('M67,30 L68,80', '#ffffff', 4, 'opacity=".45"')
    );

    // ── Pie descalzo visto desde arriba: la planta y los cinco deditos con sus uñas ──
    function pie(tx, ty, k, espejo) {
        var t = 'translate(' + (espejo ? tx + 120 * k : tx) + ',' + ty + ') scale(' + (espejo ? -k : k) + ',' + k + ')';
        var formas = [
            ['path', 'd="M40,44 C33,68 35,98 49,110 C59,118 74,114 79,100 C85,80 87,60 85,44 C83,32 71,28 61,30 C51,30 42,34 40,44 Z"', PIEL],
            ['ellipse', 'cx="45" cy="26" rx="10" ry="12"', PIEL],
            ['ellipse', 'cx="61" cy="20" rx="7" ry="8"', PIEL],
            ['ellipse', 'cx="73" cy="22" rx="6" ry="7"', PIEL],
            ['ellipse', 'cx="82" cy="28" rx="5.2" ry="6"', PIEL],
            ['ellipse', 'cx="88" cy="37" rx="4.6" ry="5.2"', PIEL]
        ];
        return '<g transform="' + t + '">' + calco(formas) +
            '<ellipse cx="45" cy="22" rx="5" ry="4.5" fill="#fff4ee"/><ellipse cx="61" cy="17" rx="3.4" ry="3" fill="#fff4ee"/>' +
            '<ellipse cx="73" cy="19" rx="3" ry="2.6" fill="#fff4ee"/><ellipse cx="82" cy="25" rx="2.6" ry="2.3" fill="#fff4ee"/>' +
            '<ellipse cx="88" cy="34" rx="2.3" ry="2" fill="#fff4ee"/>' +
            '<path d="M44,60 C42,78 46,94 54,104 C46,98 40,80 44,60 Z" fill="' + SOMBRA + '" opacity=".8"/>' +
            linea('M70,50 Q76,70 72,90', '#ffffff', 4, 'opacity=".45"') +
            '</g>';
    }
    SVG.pie = svg(pie(0, 0, 1, false));
    SVG.pies = svg(pie(-14, 16, 0.72, true) + pie(40, 16, 0.72, false));

    // ── Espalda: Zeus de espaldas (nuca con pelo, hombros y la espalda de la camiseta) ──
    SVG.espalda = svg(
        calco([
            ['path', 'd="M10,120 C10,82 28,62 60,62 C92,62 110,82 110,120 Z"', CAMISETA],
            ['rect', 'x="50" y="44" width="20" height="22" rx="5"', PIEL],
            ['ellipse', 'cx="36" cy="32" rx="5" ry="7"', PIEL],
            ['ellipse', 'cx="84" cy="32" rx="5" ry="7"', PIEL],
            ['circle', 'cx="60" cy="28" r="24"', PELO]
        ]) +
        linea('M44,14 Q60,6 76,14 M40,26 Q60,18 80,26 M42,38 Q60,32 78,38', '#5b2c11', 3, 'opacity=".55"') +
        '<path d="M44,62 Q60,72 76,62 L76,66 Q60,78 44,66 Z" fill="' + RIBETE + '"/>' +
        linea('M60,76 L60,114', BRILLO, 4, 'stroke-dasharray="6 7"') +
        linea('M30,86 Q42,80 52,90 M90,86 Q78,80 68,90', '#24735a', 3, 'opacity=".7"') +
        destellos(60, 96, 44)
    );

    // ── Muñeca: la mano y el antebrazo de pie; la muñeca lleva una pulsera de colores y la señalan dos flechas ──
    var CUENTAS = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c', '#cc5de8', '#ff922b'];
    SVG.muneca = svg(
        tubo('M60,124 L60,70', 32, PIEL) +
        calco([['path', 'd="M38,104 L82,104 L84,126 L36,126 Z"', CAMISETA]]) +
        '<path d="M38,104 L82,104 L82,110 L38,110 Z" fill="' + RIBETE + '"/>' +
        mano(18, -4, 0.7, false, true) +
        CUENTAS.map(function (c, i) {
            var a = Math.PI * (0.08 + i * 0.168);
            return '<circle cx="' + (60 - Math.cos(a) * 19).toFixed(1) + '" cy="' + (76 + Math.sin(a) * 6).toFixed(1) + '" r="5.2" fill="' + c + '" stroke="' + LINEA + '" stroke-width="1.6"/>';
        }).join('') +
        '<path d="M10,76 L30,76 M30,76 L23,69 M30,76 L23,83 M110,76 L90,76 M90,76 L97,69 M90,76 L97,83" fill="none" stroke="' + LINEA + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M10,76 L30,76 M30,76 L23,69 M30,76 L23,83 M110,76 L90,76 M90,76 L97,69 M90,76 L97,83" fill="none" stroke="' + BRILLO + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
    );

    global.PartesCuerpo = { SVG: SVG };
})(window);
