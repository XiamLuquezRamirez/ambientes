/**
 * MarinosPescador — peces y decoración del fondo de "El Pescador de Estrellas de Mar" (window.MarinosPescador).
 * Mismo estilo que "¡El Viaje del Pez por el Laberinto de Burbujas!" (ViajePezLaberintoBurbujas/iconos.js), copiado
 * aquí porque cada juego del catálogo es autónomo. Estilo sin bordes: nada lleva contorno; la forma y el volumen
 * salen de rellenos (degradados con la luz arriba, capas de sombra propia y brillos en media luna).
 * dibujos.js los rasteriza con el tamaño de su viewBox.
 *
 *   pececito (claro: la escena lo tiñe) · pezCirujano · pezAngel · pezGlobo · pezMariposa · tortuga · medusa
 *   alga · algaLarga · roca · rocaPlana · caracol · concha · coralAbanico · coralTubos · anemona
 *   arrecifeLejano (silueta blanca: se tiñe) · burbuja
 */
(function (global) {
    "use strict";

    // Capa de volumen lateral reutilizable: luz a la izquierda, sombra a la derecha.
    var VOL = '<linearGradient id="vol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>';
    // Sombra de abajo reutilizable (vertical).
    var BASE = '<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>';
    // Destellos difusos (puntos de luz mágicos y perlas).
    var LUCES = '<radialGradient id="luz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="oro" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff9db"/><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>';

    /** Una forma rellena con su degradado y, encima, la misma forma con una capa de sombreado. */
    function conVolumen(d, relleno, capa) {
        return '<path d="' + d + '" fill="url(#' + relleno + ')"/><path d="' + d + '" fill="url(#' + (capa || "vol") + ')"/>';
    }

    /** Tubo de coral redondeado (cápsula) girado sobre su base, con la boca del tubo más oscura arriba. */
    function tuboCoral(x, y, w, h, giro, relleno, boca) {
        var bx = x + w / 2, by = y + h;
        return '<g transform="rotate(' + giro + ' ' + bx + ' ' + by + ')">' +
            '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (w / 2) + '" fill="url(#' + relleno + ')"/>' +
            '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (w / 2) + '" fill="url(#vol)"/>' +
            (boca ? '<ellipse cx="' + bx + '" cy="' + (y + w * 0.42) + '" rx="' + (w * 0.32) + '" ry="' + (w * 0.2) + '" fill="' + boca + '"/>' : '') +
            '</g>';
    }

    /** Mechón de anémona: tentáculos redondeados que salen en abanico desde (bx, by) (cinco, o los ángulos dados). */
    function mechon(bx, by, alto, angulos) {
        var s = '';
        var lista = angulos || [-42, -21, 0, 21, 42];
        var medio = (lista.length - 1) / 2;
        lista.forEach(function (a, i) {
            var h = alto * (Math.abs(i - medio) < 0.6 ? 1 : i % 2 ? 0.9 : 0.75);
            s += '<g transform="rotate(' + a + ' ' + bx + ' ' + by + ')">' +
                '<rect x="' + (bx - 4) + '" y="' + (by - h) + '" width="8" height="' + h + '" rx="4" fill="url(#ten)"/>' +
                '<circle cx="' + bx + '" cy="' + (by - h + 4) + '" r="5.5" fill="url(#pun)"/></g>';
        });
        return s;
    }

    /** Púas del pez globo: triangulitos alrededor de un círculo, saltando el arco de la cara (entre desde y hasta, en grados). */
    function puas(cx, cy, r1, r2, n, desde, hasta) {
        var d = '';
        for (var i = 0; i < n; i++) {
            var g = i * 360 / n;
            var cara = desde > hasta ? (g > desde || g < hasta) : (g > desde && g < hasta);
            if (cara) continue;
            var a = g * Math.PI / 180, ab = 7 * Math.PI / 180;
            var p = function (rr, aa) { return (cx + Math.cos(aa) * rr).toFixed(1) + ',' + (cy + Math.sin(aa) * rr).toFixed(1); };
            d += 'M' + p(r1, a - ab) + ' L' + p(r2, a) + ' L' + p(r1, a + ab) + ' Z ';
        }
        return d;
    }

    /** Ojo de pez: blanco, pupila, brillo grande y brillo chico. */
    function ojoPez(cx, cy, r) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff"/>' +
            '<circle cx="' + (cx + r * 0.2) + '" cy="' + (cy + r * 0.08) + '" r="' + (r * 0.62) + '" fill="#121225"/>' +
            '<circle cx="' + (cx + r * 0.4) + '" cy="' + (cy - r * 0.22) + '" r="' + (r * 0.24) + '" fill="#fff"/>' +
            '<circle cx="' + (cx - r * 0.05) + '" cy="' + (cy + r * 0.36) + '" r="' + (r * 0.11) + '" fill="#fff" opacity=".8"/>';
    }

    var ALGA = "M30,200 Q14,170 26,140 Q38,112 22,84 Q8,56 24,30 Q30,16 34,4 Q46,28 40,52 Q34,80 46,104 Q56,132 42,160 Q34,180 38,200 Z";
    var ALGA_LARGA = "M40,240 Q30,200 38,170 Q44,140 34,110 Q26,80 36,50 Q40,24 38,6 Q48,26 50,52 Q52,84 46,112 Q42,142 50,172 Q56,204 46,240 Z";

    var SVG = {
        concha:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">' +
            '<defs>' + BASE +
            '<radialGradient id="co" cx=".5" cy=".9" r=".9"><stop offset="0" stop-color="#fff6ec"/><stop offset=".6" stop-color="#ffc9a8"/><stop offset="1" stop-color="#f08c73"/></radialGradient>' +
            '<linearGradient id="bi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa98f"/><stop offset="1" stop-color="#d9674d"/></linearGradient>' +
            '<radialGradient id="som" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#08305a" stop-opacity=".4"/><stop offset="1" stop-color="#08305a" stop-opacity="0"/></radialGradient>' +
            '</defs>' +
            '<ellipse cx="100" cy="110" rx="94" ry="11" fill="url(#som)"/>' +
            '<path d="M100,104 L14,96 Q8,40 60,16 Q100,0 140,16 Q192,40 186,96 Z" fill="url(#co)"/>' +
            // estrías en cuña, sin líneas
            '<g fill="#e07b62" opacity=".45">' +
            '<path d="M100,102 L33,43 L39,37 Z"/><path d="M100,102 L60,24 L68,20 Z"/><path d="M100,102 L96,14 L104,14 Z"/><path d="M100,102 L132,20 L140,24 Z"/><path d="M100,102 L161,37 L167,43 Z"/>' +
            '</g>' +
            '<path d="M100,104 L14,96 Q8,40 60,16 Q100,0 140,16 Q192,40 186,96 Z" fill="url(#base)"/>' +
            '<path d="M80,104 Q100,94 120,104 L118,116 L82,116 Z" fill="url(#bi)"/>' +
            '<path d="M34,46 Q66,12 112,12 Q70,20 34,46 Z" fill="#fff" opacity=".75"/>' +
            '</svg>',
        roca:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110">' +
            '<defs>' + VOL +
            '<linearGradient id="ro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4c5da"/><stop offset=".55" stop-color="#5c7394"/><stop offset="1" stop-color="#26364f"/></linearGradient>' +
            '<linearGradient id="mu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ce99a"/><stop offset="1" stop-color="#2f9e44"/></linearGradient>' +
            '</defs>' +
            conVolumen("M8,104 Q2,70 30,52 Q42,20 80,16 Q118,14 132,44 Q158,58 152,104 Z", "ro") +
            '<path d="M34,50 Q50,24 86,22 Q56,30 34,50 Z" fill="#fff" opacity=".45"/>' +
            // musgo en forma rellena
            '<path d="M24,60 Q48,42 70,48 Q96,36 122,42 Q140,48 144,64 Q130,56 120,56 Q96,52 72,60 Q48,54 24,60 Z" fill="url(#mu)" opacity=".92"/>' +
            '<ellipse cx="96" cy="80" rx="10" ry="6" fill="#1d2b44" opacity=".3"/><ellipse cx="56" cy="88" rx="7" ry="4" fill="#1d2b44" opacity=".3"/>' +
            '</svg>',

        rocaPlana:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 80">' +
            '<defs>' + VOL +
            '<linearGradient id="rp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2c6b2"/><stop offset=".6" stop-color="#8a7a62"/><stop offset="1" stop-color="#4a3f32"/></linearGradient>' +
            '<radialGradient id="g1" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#ffe3e3"/><stop offset=".6" stop-color="#ff8787"/><stop offset="1" stop-color="#e03131"/></radialGradient>' +
            '<radialGradient id="g2" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff9db"/><stop offset=".6" stop-color="#ffd43b"/><stop offset="1" stop-color="#f08c00"/></radialGradient>' +
            '</defs>' +
            conVolumen("M6,74 Q4,46 40,34 Q80,20 130,28 Q174,38 174,74 Z", "rp") +
            '<path d="M26,44 Q70,22 124,30 Q72,32 26,44 Z" fill="#fff" opacity=".45"/>' +
            '<ellipse cx="63" cy="63" rx="8" ry="3" fill="#000" opacity=".2"/><circle cx="62" cy="56" r="7.5" fill="url(#g1)"/>' +
            '<ellipse cx="121" cy="57" rx="6" ry="2.4" fill="#000" opacity=".2"/><circle cx="120" cy="52" r="5.5" fill="url(#g2)"/>' +
            '</svg>',

        alga:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 200">' +
            '<defs>' + BASE + '<linearGradient id="al" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b8a3e"/><stop offset=".5" stop-color="#69db7c"/><stop offset="1" stop-color="#237032"/></linearGradient></defs>' +
            '<path d="' + ALGA + '" fill="url(#al)"/>' +
            // nervio central: la misma hoja angostada y más clara
            '<path d="' + ALGA + '" fill="#c3fac8" opacity=".4" transform="translate(30,0) scale(.38,1) translate(-30,0)"/>' +
            '<path d="' + ALGA + '" fill="url(#base)"/>' +
            '</svg>',

        algaLarga:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 240">' +
            '<defs>' + BASE + '<linearGradient id="ak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#087f5b"/><stop offset=".5" stop-color="#38d9a9"/><stop offset="1" stop-color="#086e50"/></linearGradient></defs>' +
            // hojas laterales (detrás del tallo)
            '<path d="M38,170 Q16,160 8,136 Q24,140 40,152 Z M44,112 Q66,100 74,76 Q58,82 46,96 Z M36,60 Q16,48 14,26 Q28,34 38,46 Z" fill="url(#ak)"/>' +
            '<path d="M38,166 Q20,156 12,140 Q26,146 38,156 Z M46,108 Q62,98 70,82 Q58,90 46,100 Z M36,56 Q20,46 17,32 Q28,40 36,50 Z" fill="#c3fae8" opacity=".35"/>' +
            '<path d="' + ALGA_LARGA + '" fill="url(#ak)"/>' +
            '<path d="' + ALGA_LARGA + '" fill="#c3fae8" opacity=".4" transform="translate(42,0) scale(.35,1) translate(-42,0)"/>' +
            '<path d="' + ALGA_LARGA + '" fill="url(#base)"/>' +
            '</svg>',

        caracol:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70">' +
            '<defs>' + BASE +
            '<linearGradient id="ca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0f6"/><stop offset="1" stop-color="#e599f7"/></linearGradient>' +
            '<radialGradient id="es" cx=".4" cy=".4" r=".6"><stop offset="0" stop-color="#f3d9fa"/><stop offset="1" stop-color="#be4bdb"/></radialGradient>' +
            '</defs>' +
            conVolumen("M8,62 Q4,30 34,14 Q60,4 78,24 Q88,40 78,56 Q66,66 44,64 Z", "ca", "base") +
            // espiral hecha con discos rellenos
            '<circle cx="46" cy="40" r="17" fill="url(#es)"/>' +
            '<circle cx="48" cy="38" r="11" fill="url(#ca)"/>' +
            '<circle cx="49" cy="37" r="6" fill="url(#es)"/>' +
            '<circle cx="49" cy="36" r="2.4" fill="#fff"/>' +
            '<path d="M18,28 Q34,10 56,11 Q34,16 18,28 Z" fill="#fff" opacity=".85"/>' +
            '</svg>',

        // Pececito en tonos claros: la escena lo tiñe de colores (amigos del arrecife y peces del fondo).
        pececito:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50">' +
            '<defs><linearGradient id="pp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e9ecef"/><stop offset="1" stop-color="#98a2ad"/></linearGradient>' +
            '<linearGradient id="pa" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#dee2e6"/><stop offset="1" stop-color="#ffffff"/></linearGradient>' +
            '<clipPath id="cp"><path d="M16,25 Q22,6 46,6 Q70,8 76,25 Q70,42 46,44 Q22,44 16,25 Z"/></clipPath></defs>' +
            // cola en horquilla, aleta de arriba y aleta de abajo
            '<path d="M21,25 Q11,15 2,5 Q8,17 7,25 Q8,33 2,45 Q11,35 21,25 Z" fill="url(#pa)"/>' +
            '<path d="M21,25 Q13,19 8,12 Q11,20 11,25 Q11,30 8,38 Q13,31 21,25 Z" fill="#868e96" opacity=".3"/>' +
            '<path d="M30,10 Q40,-1 58,5 Q48,7 44,12 Z" fill="url(#pa)"/>' +
            '<path d="M38,38 Q42,49 52,47 Q49,42 48,37 Z" fill="url(#pa)"/>' +
            '<path d="M16,25 Q22,6 46,6 Q70,8 76,25 Q70,42 46,44 Q22,44 16,25 Z" fill="url(#pp)"/>' +
            '<g clip-path="url(#cp)">' +
            '<ellipse cx="48" cy="38" rx="26" ry="8" fill="#fff" opacity=".55"/>' +
            // escamitas y agalla
            '<g fill="#868e96" opacity=".25"><circle cx="30" cy="20" r="2.4"/><circle cx="36" cy="26" r="2.4"/><circle cx="30" cy="31" r="2.4"/><circle cx="42" cy="19" r="2.4"/><circle cx="42" cy="31" r="2.4"/><circle cx="48" cy="25" r="2.4"/></g>' +
            '<path d="M53,11 Q47,25 53,40 Q50,25 57,11 Z" fill="#868e96" opacity=".35"/>' +
            '</g>' +
            '<path d="M56,26 Q50,33 54,38 Q60,33 62,27 Z" fill="url(#pa)"/>' +
            ojoPez(64, 20, 5.2) +
            '<path d="M71,29 Q74,32 77,28 Q74,31 71,29 Z" fill="#495057"/>' +
            '<path d="M24,17 Q38,8 58,11 Q40,13 24,17 Z" fill="#fff"/>' +
            '</svg>',

        // Peces de adorno a todo color (miran a la derecha; la escena los voltea si nadan a la izquierda).
        pezCirujano:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">' +
            '<defs><linearGradient id="ci" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#74c0fc"/><stop offset=".45" stop-color="#228be6"/><stop offset="1" stop-color="#1864ab"/></linearGradient>' +
            '<linearGradient id="am" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3bf"/><stop offset=".5" stop-color="#fcc419"/><stop offset="1" stop-color="#f08c00"/></linearGradient>' +
            '<clipPath id="cc"><path d="M24,40 Q32,10 70,9 Q102,9 114,34 Q118,42 112,50 Q98,72 66,72 Q32,70 24,40 Z"/></clipPath></defs>' +
            '<path d="M30,40 Q16,24 3,13 Q12,40 3,67 Q16,56 30,40 Z" fill="url(#am)"/>' +
            '<path d="M36,18 Q62,-1 100,13 Q72,12 42,24 Z" fill="#1c3d6e"/>' +
            '<path d="M40,62 Q62,81 94,64 Q70,67 46,58 Z" fill="#1c3d6e"/>' +
            '<path d="M24,40 Q32,10 70,9 Q102,9 114,34 Q118,42 112,50 Q98,72 66,72 Q32,70 24,40 Z" fill="url(#ci)"/>' +
            '<g clip-path="url(#cc)">' +
            '<path d="M36,34 Q54,16 90,21 Q104,25 103,32 Q84,28 70,36 Q82,46 70,53 Q60,48 52,43 Q42,41 36,34 Z" fill="#14285c" opacity=".88"/>' +
            '<ellipse cx="72" cy="72" rx="42" ry="11" fill="#a5d8ff" opacity=".45"/>' +
            '<path d="M32,30 Q50,11 84,10 Q56,17 32,30 Z" fill="#fff" opacity=".5"/>' +
            '</g>' +
            '<path d="M81,46 Q72,57 78,63 Q89,57 89,47 Z" fill="#ffd43b"/>' +
            ojoPez(100, 31, 7) +
            '<path d="M110,45 Q114,48 117,43 Q114,46 110,45 Z" fill="#0b2a55"/>' +
            '</svg>',

        pezAngel:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110">' +
            '<defs><linearGradient id="an" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3bf"/><stop offset=".5" stop-color="#ffd43b"/><stop offset="1" stop-color="#f59f00"/></linearGradient>' +
            '<linearGradient id="fa" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c7ed6"/><stop offset="1" stop-color="#74c0fc"/></linearGradient>' +
            '<clipPath id="ca"><path d="M16,55 Q28,24 62,22 Q88,26 96,52 Q90,56 96,60 Q88,86 62,88 Q28,86 16,55 Z"/></clipPath></defs>' +
            '<path d="M30,36 Q28,5 72,0 Q56,14 64,25 Z" fill="url(#fa)"/>' +
            '<path d="M30,74 Q28,105 72,110 Q56,96 64,85 Z" fill="url(#fa)"/>' +
            '<path d="M22,55 Q9,41 2,33 Q8,55 2,77 Q9,69 22,55 Z" fill="url(#fa)"/>' +
            '<path d="M16,55 Q28,24 62,22 Q88,26 96,52 Q90,56 96,60 Q88,86 62,88 Q28,86 16,55 Z" fill="url(#an)"/>' +
            '<g clip-path="url(#ca)">' +
            '<g fill="#1c7ed6" opacity=".85"><path d="M38,10 Q32,55 38,100 L47,100 Q41,55 47,10 Z"/><path d="M60,10 Q54,55 60,100 L68,100 Q62,55 68,10 Z"/></g>' +
            '<ellipse cx="60" cy="90" rx="44" ry="12" fill="#c2410c" opacity=".2"/>' +
            '<path d="M24,46 Q36,26 66,25 Q40,32 24,46 Z" fill="#fff" opacity=".55"/>' +
            '</g>' +
            '<path d="M72,60 Q64,72 70,77 Q78,70 78,61 Z" fill="#fff3bf" opacity=".95"/>' +
            ojoPez(81, 46, 6) +
            '<path d="M92,57 Q96,59 98,55 Q96,58 92,57 Z" fill="#8a4b00"/>' +
            '</svg>',

        pezGlobo:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 80">' +
            '<defs><radialGradient id="gl" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff9db"/><stop offset=".55" stop-color="#ffd8a8"/><stop offset="1" stop-color="#f59f00"/></radialGradient></defs>' +
            '<path d="' + puas(48, 42, 30, 38, 18, 330, 30) + '" fill="#e8890c"/>' +
            '<path d="M19,42 Q8,31 2,29 Q6,42 2,55 Q8,53 19,42 Z" fill="#ffa94d"/>' +
            '<circle cx="48" cy="42" r="32" fill="url(#gl)"/>' +
            '<ellipse cx="50" cy="60" rx="23" ry="12" fill="#fff" opacity=".8"/>' +
            '<g fill="#b35c00" opacity=".4"><circle cx="32" cy="30" r="3.2"/><circle cx="44" cy="20" r="2.6"/><circle cx="27" cy="44" r="2.6"/><circle cx="40" cy="34" r="2.2"/><circle cx="56" cy="18" r="2.2"/><circle cx="34" cy="54" r="2"/></g>' +
            '<path d="M44,46 Q35,54 40,61 Q49,56 51,48 Z" fill="#ffc078"/>' +
            '<path d="M24,30 Q32,14 50,12 Q34,20 24,30 Z" fill="#fff" opacity=".7"/>' +
            ojoPez(64, 34, 9) +
            '<ellipse cx="70" cy="48" rx="5" ry="3" fill="#ff8fa3" opacity=".7"/>' +
            '<ellipse cx="79" cy="47" rx="3" ry="2.6" fill="#c2410c"/>' +
            '</svg>',

        pezMariposa:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80">' +
            '<defs><linearGradient id="ma" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff9db"/><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="#fab005"/></linearGradient>' +
            '<clipPath id="cm"><path d="M14,40 Q24,8 58,6 Q84,8 94,34 Q98,40 94,46 Q84,72 58,74 Q24,72 14,40 Z"/></clipPath></defs>' +
            '<path d="M19,40 Q8,29 2,25 Q6,40 2,55 Q8,51 19,40 Z" fill="#fcc419"/>' +
            '<path d="M24,22 Q40,1 72,6 Q50,10 34,26 Z" fill="#fab005"/>' +
            '<path d="M26,60 Q40,80 68,74 Q48,70 34,56 Z" fill="#fab005"/>' +
            '<path d="M14,40 Q24,8 58,6 Q84,8 94,34 Q98,40 94,46 Q84,72 58,74 Q24,72 14,40 Z" fill="url(#ma)"/>' +
            '<g clip-path="url(#cm)">' +
            '<g fill="#ff922b" opacity=".5"><path d="M30,0 L38,0 L22,80 L14,80 Z"/><path d="M46,0 L53,0 L37,80 L30,80 Z"/><path d="M62,0 L68,0 L52,80 L46,80 Z"/></g>' +
            '<path d="M73,0 L84,0 Q79,40 84,80 L73,80 Q68,40 73,0 Z" fill="#1c2a4a" opacity=".9"/>' +
            '<ellipse cx="56" cy="72" rx="40" ry="9" fill="#c2410c" opacity=".18"/>' +
            '<path d="M22,30 Q34,12 62,10 Q38,16 22,30 Z" fill="#fff" opacity=".6"/>' +
            '</g>' +
            // falso ojo cerca de la cola
            '<circle cx="28" cy="34" r="6" fill="#1c2a4a"/><circle cx="28" cy="34" r="2.6" fill="#fff3bf"/>' +
            '<path d="M93,37 Q101,40 93,44 Z" fill="#fab005"/>' +
            ojoPez(79, 33, 5.4) +
            '</svg>',

        tortuga:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110">' +
            '<defs><radialGradient id="cap" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#b2f2bb"/><stop offset=".55" stop-color="#40c057"/><stop offset="1" stop-color="#2b8a3e"/></radialGradient>' +
            '<linearGradient id="pi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f5a2"/><stop offset="1" stop-color="#74b816"/></linearGradient></defs>' +
            // aletas de atrás (las lejanas más oscuras)
            '<path d="M98,36 Q116,10 134,5 Q124,26 106,44 Z" fill="#5c940d"/>' +
            '<path d="M42,40 Q30,22 18,18 Q24,34 36,46 Z" fill="#5c940d"/>' +
            '<path d="M30,58 Q16,60 10,55 Q18,51 32,53 Z" fill="url(#pi)"/>' +
            '<path d="M44,70 Q24,84 12,102 Q34,99 56,80 Z" fill="url(#pi)"/>' +
            '<path d="M100,72 Q122,92 114,108 Q96,97 88,78 Z" fill="url(#pi)"/>' +
            '<path d="M116,48 Q132,35 148,41 Q159,49 151,60 Q137,67 120,62 Z" fill="url(#pi)"/>' +
            ojoPez(141, 47, 4.6) +
            '<path d="M146,56 Q151,59 155,55 Q151,58 146,56 Z" fill="#2b5a0b"/>' +
            '<ellipse cx="74" cy="72" rx="48" ry="9" fill="#e9fac8"/>' +
            '<ellipse cx="74" cy="52" rx="54" ry="32" fill="url(#cap)"/>' +
            '<g fill="#d3f9d8" opacity=".5"><path d="M60,34 L88,34 L98,52 L88,70 L60,70 L50,52 Z"/><ellipse cx="34" cy="50" rx="11" ry="14"/><ellipse cx="114" cy="50" rx="11" ry="14"/><ellipse cx="74" cy="24" rx="16" ry="6"/></g>' +
            '<path d="M32,40 Q48,20 80,20 Q52,28 32,40 Z" fill="#fff" opacity=".6"/>' +
            '</svg>',

        medusa:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 120">' +
            '<defs><radialGradient id="me" cx=".5" cy=".3" r=".75"><stop offset="0" stop-color="#fff0f6" stop-opacity=".95"/><stop offset=".55" stop-color="#f783ac" stop-opacity=".8"/><stop offset="1" stop-color="#ae3ec9" stop-opacity=".6"/></radialGradient>' +
            '<linearGradient id="tm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fcc2d7" stop-opacity=".85"/><stop offset="1" stop-color="#e599f7" stop-opacity="0"/></linearGradient></defs>' +
            '<g fill="url(#tm)">' +
            '<path d="M17,44 Q11,66 19,84 Q25,100 17,116 Q29,100 24,84 Q17,66 22,44 Z"/>' +
            '<path d="M31,46 Q27,70 33,92 Q37,108 31,120 Q41,106 37,92 Q32,70 36,46 Z"/>' +
            '<path d="M45,46 Q49,70 43,92 Q39,108 47,120 Q47,106 48,92 Q54,70 50,46 Z"/>' +
            '<path d="M59,44 Q65,66 57,84 Q51,100 61,116 Q57,100 62,84 Q70,66 63,44 Z"/>' +
            '</g>' +
            '<path d="M33,44 Q28,66 40,84 Q52,66 47,44 Z" fill="#f783ac" opacity=".5"/>' +
            '<path d="M6,46 Q4,6 40,4 Q76,6 74,46 Q66,52 58,46 Q50,52 40,46 Q30,52 22,46 Q14,52 6,46 Z" fill="url(#me)"/>' +
            '<ellipse cx="40" cy="30" rx="20" ry="12" fill="#fff" opacity=".3"/>' +
            '<g fill="#fff" opacity=".55"><circle cx="28" cy="22" r="2.4"/><circle cx="52" cy="20" r="2"/><circle cx="58" cy="32" r="2.4"/><circle cx="22" cy="36" r="2"/></g>' +
            '<path d="M14,30 Q18,11 38,8 Q22,16 14,30 Z" fill="#fff" opacity=".75"/>' +
            '</svg>',

        // Adornos nuevos de la arena.
        coralAbanico:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110">' +
            '<defs>' + VOL + '<linearGradient id="ab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eebefa"/><stop offset=".55" stop-color="#cc5de8"/><stop offset="1" stop-color="#862e9c"/></linearGradient></defs>' +
            '<path d="M55,110 Q53,90 57,72 L64,72 Q67,90 65,110 Z" fill="#862e9c"/>' +
            conVolumen("M8,74 Q2,30 40,12 Q60,4 80,12 Q118,30 112,74 Q86,84 60,78 Q34,84 8,74 Z", "ab") +
            '<g fill="#f8f0fc" opacity=".5"><circle cx="30" cy="40" r="3.5"/><circle cx="48" cy="26" r="3.5"/><circle cx="70" cy="24" r="3.5"/><circle cx="90" cy="38" r="3.5"/><circle cx="24" cy="60" r="3"/><circle cx="44" cy="50" r="3"/><circle cx="62" cy="44" r="3"/><circle cx="80" cy="52" r="3"/><circle cx="98" cy="60" r="3"/><circle cx="58" cy="64" r="2.6"/></g>' +
            '<path d="M18,50 Q24,22 54,14 Q32,28 18,50 Z" fill="#fff" opacity=".5"/>' +
            '</svg>',

        coralTubos:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
            '<defs>' + VOL +
            '<linearGradient id="tu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe8cc"/><stop offset=".5" stop-color="#ffa94d"/><stop offset="1" stop-color="#e8590c"/></linearGradient>' +
            '<linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdeeb"/><stop offset=".5" stop-color="#f783ac"/><stop offset="1" stop-color="#c2255c"/></linearGradient></defs>' +
            tuboCoral(16, 40, 18, 60, -16, "tr", "#a61e4d") +
            tuboCoral(64, 32, 18, 68, 15, "tr", "#a61e4d") +
            tuboCoral(39, 12, 22, 88, 0, "tu", "#c2410c") +
            tuboCoral(78, 62, 14, 38, 28, "tu", "#c2410c") +
            '</svg>',

        anemona:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80">' +
            '<defs><linearGradient id="ten" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc9c9"/><stop offset="1" stop-color="#e64980"/></linearGradient>' +
            '<radialGradient id="pun" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff0f6"/><stop offset="1" stop-color="#faa2c1"/></radialGradient>' +
            '<linearGradient id="pie" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e599f7"/><stop offset="1" stop-color="#862e9c"/></linearGradient></defs>' +
            mechon(50, 64, 46, [-66, -40, -14, 14, 40, 66]) +
            mechon(50, 64, 40, [-52, -26, 0, 26, 52]) +
            '<path d="M24,80 Q22,58 50,55 Q78,58 76,80 Z" fill="url(#pie)"/>' +
            '<path d="M30,66 Q38,58 54,58 Q40,62 30,66 Z" fill="#fff" opacity=".45"/>' +
            '</svg>',

        // Silueta del arrecife lejano (blanca: la escena la tiñe de azul y la deja tenue).
        arrecifeLejano:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200">' +
            '<g fill="#fff">' +
            '<path d="M0,200 L0,150 Q40,120 80,140 Q110,92 150,120 Q172,70 196,112 Q206,86 220,106 Q252,130 292,110 Q322,74 352,100 Q382,128 420,118 Q448,58 472,100 Q482,76 498,96 Q540,122 580,102 Q612,82 642,110 Q680,130 722,106 Q762,92 800,138 L800,200 Z"/>' +
            '<rect x="150" y="54" width="14" height="90" rx="7" transform="rotate(-12 157 144)"/><rect x="170" y="36" width="16" height="104" rx="8"/><rect x="192" y="60" width="13" height="80" rx="6.5" transform="rotate(14 198 140)"/>' +
            '<ellipse cx="330" cy="74" rx="36" ry="30"/><rect x="326" y="80" width="8" height="40" rx="4"/>' +
            '<rect x="462" y="30" width="15" height="90" rx="7.5" transform="rotate(-8 469 120)"/><rect x="484" y="50" width="13" height="70" rx="6.5" transform="rotate(16 490 120)"/>' +
            '<ellipse cx="640" cy="88" rx="30" ry="24"/><rect x="636" y="92" width="8" height="30" rx="4"/>' +
            '<rect x="720" y="56" width="14" height="70" rx="7" transform="rotate(10 727 126)"/>' +
            '</g>' +
            '</svg>',

        burbuja:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
            '<defs><radialGradient id="bu" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".05"/><stop offset=".7" stop-color="#d0f4ff" stop-opacity=".22"/><stop offset=".9" stop-color="#ffffff" stop-opacity=".75"/><stop offset="1" stop-color="#ffffff" stop-opacity=".15"/></radialGradient>' +
            '<radialGradient id="iri" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#7cf3ff" stop-opacity="0"/><stop offset=".9" stop-color="#b197fc" stop-opacity=".4"/><stop offset="1" stop-color="#ff8fc7" stop-opacity=".25"/></radialGradient></defs>' +
            '<circle cx="50" cy="50" r="47" fill="url(#bu)"/>' +
            '<circle cx="50" cy="50" r="47" fill="url(#iri)"/>' +
            '<ellipse cx="34" cy="30" rx="14" ry="8" fill="#fff" opacity=".9" transform="rotate(-35 34 30)"/>' +
            '<circle cx="66" cy="70" r="4" fill="#fff" opacity=".7"/>' +
            '</svg>',
    };

    global.MarinosPescador = { SVG: SVG };
})(typeof window !== "undefined" ? window : global);
