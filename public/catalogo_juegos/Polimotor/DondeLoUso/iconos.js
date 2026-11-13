/**
 * IconosUso — dibujos de las tarjetas de "¿Dónde lo uso?" (window.IconosUso).
 *
 * Dibujos propios de este juego (no se toman de otros): un SVG de 120 × 120 por tarjeta, grande, de
 * contorno grueso y colores planos, como en los libros de preescolar. Los objetos van en colores vivos;
 * las partes del cuerpo, en piel cálida. config.json elige el dibujo con `icono`.
 */
(function (global) {
    "use strict";

    var PIEL = "#f7c9a6";
    var PIEL_SOMBRA = "#eaa47c";
    var PIEL_LINEA = "#b8693f";
    var TINTA = "#3b2a4a";

    function svg(cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">' + cuerpo + "</svg>";
    }

    function trazo(color, ancho) {
        return 'stroke="' + (color || TINTA) + '" stroke-width="' + (ancho || 3.5) + '" stroke-linejoin="round" stroke-linecap="round"';
    }

    var SVG = {};

    // ------------------------------------------------------------------ objetos

    // Gafas de sol: montura fucsia, lentes con degradado azul-morado y dos brillos.
    SVG.gafas = svg(
        '<defs><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#5f3dc4"/><stop offset="1" stop-color="#1c7ed6"/></linearGradient></defs>' +
        '<path d="M8,50 L2,44 M112,50 L118,44" ' + trazo("#c2255c", 6) + '/>' +
        '<rect x="8" y="42" width="46" height="38" rx="17" fill="url(#gl)" ' + trazo("#c2255c", 6) + '/>' +
        '<rect x="66" y="42" width="46" height="38" rx="17" fill="url(#gl)" ' + trazo("#c2255c", 6) + '/>' +
        '<path d="M54,54 Q60,46 66,54" fill="none" ' + trazo("#c2255c", 6) + '/>' +
        '<path d="M17,52 L28,52 M17,60 L23,60" ' + trazo("#ffffff", 4) + ' opacity=".85"/>' +
        '<path d="M75,52 L86,52 M75,60 L81,60" ' + trazo("#ffffff", 4) + ' opacity=".85"/>'
    );

    // Nariz de payaso: bola roja brillante con su elástico.
    SVG.nariz_payaso = svg(
        '<defs><radialGradient id="np" cx=".38" cy=".34" r=".7">' +
        '<stop offset="0" stop-color="#ff8787"/><stop offset=".55" stop-color="#f03e3e"/><stop offset="1" stop-color="#b9161b"/></radialGradient></defs>' +
        '<path d="M14,64 Q60,8 106,64" fill="none" stroke="#343a40" stroke-width="3" stroke-dasharray="1 0"/>' +
        '<ellipse cx="60" cy="102" rx="30" ry="6" fill="#000" opacity=".12"/>' +
        '<circle cx="60" cy="66" r="34" fill="url(#np)" ' + trazo("#9b1116", 3.5) + '/>' +
        '<ellipse cx="48" cy="52" rx="11" ry="7" transform="rotate(-30 48 52)" fill="#fff" opacity=".85"/>' +
        '<circle cx="70" cy="46" r="3.5" fill="#fff" opacity=".7"/>'
    );

    function calcetin(dx, dy, rot, colores) {
        var forma = "M30,12 L56,12 L56,62 Q56,70 64,74 L80,82 Q94,90 88,102 Q82,112 68,106 L40,92 Q30,86 30,74 Z";
        var id = "cl" + colores[0].replace("#", "");
        var franjas = "";
        for (var i = 0; i < 6; i++) {
            franjas += '<rect x="20" y="' + (20 + i * 15) + '" width="90" height="8" fill="' + colores[(i % 2) + 1] + '"/>';
        }
        return '<g transform="translate(' + dx + "," + dy + ") rotate(" + rot + ' 50 60)">' +
            '<clipPath id="' + id + '"><path d="' + forma + '"/></clipPath>' +
            '<path d="' + forma + '" fill="' + colores[0] + '"/>' +
            '<g clip-path="url(#' + id + ')">' + franjas + "</g>" +
            '<rect x="28" y="8" width="30" height="12" rx="4" fill="#ffffff" ' + trazo(TINTA, 3) + '/>' +
            '<path d="' + forma + '" fill="none" ' + trazo(TINTA, 3.5) + '/>' +
            '<path d="M70,104 Q80,100 84,92" fill="none" ' + trazo("#ffffff", 3) + ' opacity=".8"/>' +
            "</g>";
    }

    // Calcetines: un par a rayas (uno detrás del otro).
    SVG.calcetines = svg(
        calcetin(-14, -4, -6, ["#4dabf7", "#ffd43b", "#4dabf7"]) +
        calcetin(16, 4, 4, ["#f783ac", "#ffffff", "#be4bdb"])
    );

    function guante(dx, dy, rot, color, puno) {
        return '<g transform="translate(' + dx + "," + dy + ") rotate(" + rot + ' 60 70)">' +
            '<rect x="30" y="18" width="13" height="40" rx="6.5" fill="' + color + '" ' + trazo(TINTA, 3) + '/>' +
            '<rect x="44" y="10" width="13" height="46" rx="6.5" fill="' + color + '" ' + trazo(TINTA, 3) + '/>' +
            '<rect x="58" y="12" width="13" height="44" rx="6.5" fill="' + color + '" ' + trazo(TINTA, 3) + '/>' +
            '<rect x="72" y="20" width="12" height="38" rx="6" fill="' + color + '" ' + trazo(TINTA, 3) + '/>' +
            '<rect x="14" y="50" width="13" height="32" rx="6.5" transform="rotate(-38 20 66)" fill="' + color + '" ' + trazo(TINTA, 3) + '/>' +
            '<path d="M28,50 Q26,82 38,92 L76,92 Q88,82 86,50 Z" fill="' + color + '" ' + trazo(TINTA, 3) + '/>' +
            '<rect x="32" y="88" width="50" height="20" rx="6" fill="' + puno + '" ' + trazo(TINTA, 3) + '/>' +
            '<path d="M38,98 L76,98" ' + trazo("#ffffff", 3) + ' opacity=".8"/>' +
            '<circle cx="57" cy="72" r="6" fill="#ffffff" opacity=".55"/>' +
            "</g>";
    }

    // Guantes: el de atrás turquesa y el de adelante morado, con puño a rayas.
    SVG.guantes = svg(
        guante(-14, -6, -12, "#3bc9db", "#1098ad") +
        guante(14, 4, 10, "#9775fa", "#f06595")
    );

    // Gorro de lana: cuerpo naranja con rayas, doblez azul y pompón blanco.
    SVG.gorro = svg(
        '<circle cx="60" cy="18" r="13" fill="#ffffff" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M58,12 L62,22 M54,18 L66,18" ' + trazo("#dee2e6", 2.5) + '/>' +
        '<path d="M18,84 Q16,30 60,28 Q104,30 102,84 Z" fill="#ff922b" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M24,58 Q60,46 96,58 M20,72 Q60,60 100,72" fill="none" ' + trazo("#ffd43b", 6) + '/>' +
        '<path d="M44,36 Q42,58 44,80 M76,36 Q78,58 76,80" fill="none" ' + trazo("#e8590c", 3) + ' opacity=".7"/>' +
        '<rect x="10" y="80" width="100" height="24" rx="11" fill="#4dabf7" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M24,84 L24,100 M38,84 L38,100 M52,84 L52,100 M66,84 L66,100 M80,84 L80,100 M94,84 L94,100" ' + trazo("#1c7ed6", 3) + '/>'
    );

    // ------------------------------------------------------------------ partes del cuerpo

    function ojo(cx, cy) {
        return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="20" ry="24" fill="#ffffff" ' + trazo(TINTA, 3.5) + '/>' +
            '<circle cx="' + (cx + 2) + '" cy="' + (cy + 4) + '" r="12" fill="#4dabf7"/>' +
            '<circle cx="' + (cx + 2) + '" cy="' + (cy + 4) + '" r="6.5" fill="#1b1b2f"/>' +
            '<circle cx="' + (cx + 6) + '" cy="' + (cy - 1) + '" r="3.6" fill="#ffffff"/>' +
            // pestañas
            '<path d="M' + (cx - 16) + "," + (cy - 16) + " L" + (cx - 22) + "," + (cy - 23) +
            " M" + (cx - 6) + "," + (cy - 23) + " L" + (cx - 8) + "," + (cy - 31) +
            " M" + (cx + 6) + "," + (cy - 23) + " L" + (cx + 8) + "," + (cy - 31) +
            " M" + (cx + 16) + "," + (cy - 16) + " L" + (cx + 22) + "," + (cy - 23) + '" ' + trazo(TINTA, 3) + "/>";
    }

    // Ojos: dos ojos grandes con pestañas y cejas.
    SVG.ojos = svg(
        '<path d="M14,30 Q32,20 48,28 M72,28 Q88,20 106,30" fill="none" ' + trazo("#8a4b2a", 6) + '/>' +
        ojo(33, 66) + ojo(87, 66)
    );

    // Nariz: nariz de frente sobre un pedacito de cara, con mejillas.
    SVG.nariz = svg(
        '<circle cx="60" cy="62" r="48" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
        '<circle cx="28" cy="74" r="10" fill="#ff8fa3" opacity=".45"/><circle cx="92" cy="74" r="10" fill="#ff8fa3" opacity=".45"/>' +
        '<path d="M60,24 Q56,50 46,66 Q38,78 48,84 Q54,88 60,84 Q66,88 72,84 Q82,78 74,66 Q64,50 60,24 Z" fill="' + PIEL_SOMBRA + '" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
        '<ellipse cx="52" cy="78" rx="4" ry="3" fill="' + PIEL_LINEA + '"/><ellipse cx="68" cy="78" rx="4" ry="3" fill="' + PIEL_LINEA + '"/>' +
        '<path d="M58,34 Q56,50 52,60" fill="none" ' + trazo("#ffffff", 3) + ' opacity=".6"/>'
    );

    function pie(dx, espejo) {
        var g = '<g transform="translate(' + dx + ',0)' + (espejo ? " translate(52,0) scale(-1,1)" : "") + '">' +
            '<path d="M14,40 Q10,22 22,18 Q38,16 42,34 Q46,58 40,84 Q36,104 24,104 Q10,102 10,86 Q10,66 14,40 Z" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
            '<circle cx="16" cy="14" r="6" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<circle cx="27" cy="9" r="5" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<circle cx="36" cy="11" r="4.5" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<circle cx="43" cy="17" r="4" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<circle cx="47" cy="25" r="3.6" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<path d="M22,60 Q28,66 34,60" fill="none" ' + trazo(PIEL_SOMBRA, 3) + '/>' +
            "</g>";
        return g;
    }

    // Pies: los dos pies descalzos vistos desde arriba, con sus deditos.
    SVG.pies = svg(pie(8, false) + pie(60, true));

    function manoAbierta(dx, espejo, rot) {
        return '<g transform="translate(' + dx + ',6) rotate(' + rot + ' 30 60)' + (espejo ? " translate(60,0) scale(-1,1)" : "") + '">' +
            '<rect x="2" y="44" width="11" height="30" rx="5.5" transform="rotate(-34 8 60)" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<rect x="14" y="16" width="10" height="40" rx="5" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<rect x="25" y="8" width="10" height="46" rx="5" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<rect x="36" y="12" width="10" height="42" rx="5" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<rect x="47" y="22" width="9" height="34" rx="4.5" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<path d="M12,48 Q10,82 22,92 L46,92 Q58,82 56,48 Z" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
            '<path d="M22,66 Q32,72 44,64" fill="none" ' + trazo(PIEL_SOMBRA, 3) + '/>' +
            "</g>";
    }

    // Manos: las dos manos abiertas, saludando.
    SVG.manos = svg(manoAbierta(-2, false, -8) + manoAbierta(62, true, 8));

    // Cabeza: cabeza de niño de frente (pelo, orejas y cara sonriente).
    SVG.cabeza = svg(
        '<circle cx="18" cy="66" r="11" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
        '<circle cx="102" cy="66" r="11" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
        '<ellipse cx="60" cy="64" rx="42" ry="46" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
        '<path d="M18,56 Q14,14 60,12 Q106,14 102,56 Q94,36 80,34 L74,44 L66,32 L56,44 L48,32 L40,42 Q24,40 18,56 Z" fill="#6b3a1e" ' + trazo("#4a2512", 3) + '/>' +
        '<circle cx="45" cy="66" r="5" fill="' + TINTA + '"/><circle cx="75" cy="66" r="5" fill="' + TINTA + '"/>' +
        '<circle cx="47" cy="64" r="1.8" fill="#fff"/><circle cx="77" cy="64" r="1.8" fill="#fff"/>' +
        '<circle cx="36" cy="82" r="7" fill="#ff8fa3" opacity=".45"/><circle cx="84" cy="82" r="7" fill="#ff8fa3" opacity=".45"/>' +
        '<path d="M60,70 Q57,78 61,80" fill="none" ' + trazo(PIEL_LINEA, 3) + '/>' +
        '<path d="M46,88 Q60,100 74,88" fill="none" ' + trazo("#c0392b", 4) + '/>'
    );

    // ------------------------------------------------------------------ ronda 2: objetos

    // Bufanda: vuelta alrededor de un cuello invisible y dos puntas con flecos, a rayas.
    SVG.bufanda = svg(
        '<path d="M22,30 Q60,58 98,30 L98,48 Q60,78 22,48 Z" fill="#3bc9db" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M36,40 Q60,54 84,40" fill="none" ' + trazo("#ffffff", 5) + ' opacity=".85"/>' +
        '<path d="M62,58 L84,58 L88,104 L66,104 Z" fill="#3bc9db" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M64,72 L86,72 M65,88 L87,88" ' + trazo("#ffffff", 5) + '/>' +
        '<path d="M40,58 L60,60 L52,100 L32,96 Z" fill="#22b8cf" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M38,72 L57,74 M35,86 L54,88" ' + trazo("#ffffff", 5) + '/>' +
        '<path d="M68,104 L68,114 M74,104 L74,114 M80,104 L80,114 M86,104 L86,114 M34,96 L32,106 M40,98 L38,108 M46,99 L44,109 M52,100 L50,110" ' + trazo("#0c8599", 3) + '/>'
    );

    // Audífonos: diadema morada y dos almohadillas grandes.
    SVG.audifonos = svg(
        '<path d="M22,74 Q18,18 60,16 Q102,18 98,74" fill="none" ' + trazo(TINTA, 13) + '/>' +
        '<path d="M22,74 Q18,18 60,16 Q102,18 98,74" fill="none" ' + trazo("#cc5de8", 7) + '/>' +
        '<rect x="8" y="62" width="30" height="44" rx="13" fill="#ae3ec9" ' + trazo(TINTA, 3.5) + '/>' +
        '<rect x="82" y="62" width="30" height="44" rx="13" fill="#ae3ec9" ' + trazo(TINTA, 3.5) + '/>' +
        '<rect x="30" y="68" width="12" height="32" rx="6" fill="#f3d9fa" ' + trazo(TINTA, 3) + '/>' +
        '<rect x="78" y="68" width="12" height="32" rx="6" fill="#f3d9fa" ' + trazo(TINTA, 3) + '/>' +
        '<circle cx="23" cy="78" r="4" fill="#ffffff" opacity=".7"/><circle cx="97" cy="78" r="4" fill="#ffffff" opacity=".7"/>'
    );

    // Cepillo de dientes con su crema.
    SVG.cepillo_dientes = svg(
        '<g transform="rotate(-35 60 60)">' +
        '<rect x="14" y="54" width="70" height="14" rx="7" fill="#4dabf7" ' + trazo(TINTA, 3.5) + '/>' +
        '<rect x="26" y="57" width="34" height="5" rx="2.5" fill="#ffffff" opacity=".6"/>' +
        '<rect x="80" y="50" width="28" height="18" rx="5" fill="#4dabf7" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M84,50 L84,36 M90,50 L90,34 M96,50 L96,34 M102,50 L102,36" ' + trazo("#ffffff", 5) + '/>' +
        '<path d="M84,50 L84,36 M90,50 L90,34 M96,50 L96,34 M102,50 L102,36" fill="none" stroke="' + TINTA + '" stroke-width="1.5" opacity=".35"/>' +
        '<path d="M80,34 Q86,22 94,30 Q100,20 108,32 Q104,40 92,38 Q82,40 80,34 Z" fill="#ffffff" ' + trazo("#4dabf7", 2.5) + '/>' +
        '<path d="M86,30 Q92,26 98,30" fill="none" ' + trazo("#ff8787", 3) + '/>' +
        "</g>"
    );

    // Reloj de pulsera: esfera redonda con manecillas y correa naranja.
    SVG.reloj = svg(
        '<rect x="44" y="4" width="32" height="40" rx="8" fill="#ff922b" ' + trazo(TINTA, 3.5) + '/>' +
        '<rect x="44" y="76" width="32" height="40" rx="8" fill="#ff922b" ' + trazo(TINTA, 3.5) + '/>' +
        '<circle cx="60" cy="98" r="3" fill="' + TINTA + '"/><circle cx="60" cy="108" r="3" fill="' + TINTA + '"/>' +
        '<circle cx="60" cy="60" r="30" fill="#ffd43b" ' + trazo(TINTA, 3.5) + '/>' +
        '<circle cx="60" cy="60" r="23" fill="#ffffff" ' + trazo(TINTA, 2.5) + '/>' +
        '<path d="M60,41 L60,45 M79,60 L75,60 M60,79 L60,75 M41,60 L45,60" ' + trazo(TINTA, 3) + '/>' +
        '<path d="M60,60 L60,46 M60,60 L71,66" ' + trazo("#e8590c", 4) + '/>' +
        '<circle cx="60" cy="60" r="3" fill="' + TINTA + '"/>' +
        '<rect x="88" y="54" width="7" height="12" rx="2" fill="#fab005" ' + trazo(TINTA, 2.5) + '/>'
    );

    // Mochila escolar: cuerpo azul, bolsillo amarillo, asa y tirantes.
    SVG.mochila = svg(
        '<path d="M48,22 Q48,8 60,8 Q72,8 72,22" fill="none" ' + trazo(TINTA, 5) + '/>' +
        '<path d="M26,44 Q26,20 60,20 Q94,20 94,44 L96,104 Q96,112 88,112 L32,112 Q24,112 24,104 Z" fill="#4dabf7" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M30,46 Q60,34 90,46" fill="none" ' + trazo("#1c7ed6", 4) + '/>' +
        '<rect x="36" y="64" width="48" height="38" rx="10" fill="#ffd43b" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M36,76 L84,76" ' + trazo(TINTA, 3) + '/>' +
        '<circle cx="60" cy="76" r="4" fill="#ff6b6b" ' + trazo(TINTA, 2) + '/>' +
        '<path d="M18,50 Q14,80 22,104 M102,50 Q106,80 98,104" fill="none" ' + trazo("#1864ab", 6) + '/>'
    );

    // ------------------------------------------------------------------ ronda 2: partes del cuerpo

    // Cuello: barbilla, cuello resaltado y hombros con el cuello de la camiseta.
    SVG.cuello = svg(
        '<path d="M10,112 Q12,84 40,80 L80,80 Q108,84 110,112 Z" fill="#74c0fc" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M42,30 L78,30 L80,84 Q60,94 40,84 Z" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
        '<path d="M44,44 Q60,52 76,44" fill="none" ' + trazo(PIEL_SOMBRA, 3) + '/>' +
        '<path d="M28,8 Q60,46 92,8 L92,0 L28,0 Z" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
        '<path d="M50,24 Q60,30 70,24" fill="none" ' + trazo("#c0392b", 3) + '/>' +
        '<path d="M40,82 Q60,98 80,82" fill="none" ' + trazo("#ffffff", 6) + '/>' +
        '<path d="M34,56 L26,56 M86,56 L94,56 M36,46 L30,40 M84,46 L90,40" ' + trazo("#f59f00", 3.5) + '/>'
    );

    // Oreja: una oreja grande de lado.
    SVG.orejas = svg(
        '<path d="M44,16 Q92,8 94,56 Q96,92 64,106 Q48,112 44,96 Q42,84 54,78 Q66,72 66,58 Q66,40 50,40 Q36,42 34,52" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 4) + '/>' +
        '<path d="M34,52 Q30,24 44,16" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 4) + '/>' +
        '<path d="M50,26 Q80,24 82,56 Q82,78 66,88" fill="none" ' + trazo(PIEL_SOMBRA, 5) + '/>' +
        '<path d="M50,52 Q56,58 52,66" fill="none" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
        '<path d="M14,44 Q8,58 14,72 M22,50 Q18,58 22,66" fill="none" ' + trazo("#4dabf7", 3.5) + '/>'
    );

    // Boca: sonrisa grande con labios, dientes y lengua.
    SVG.boca = svg(
        '<path d="M14,48 Q60,36 106,48 Q98,100 60,102 Q22,100 14,48 Z" fill="#e03131" ' + trazo("#8f1f1f", 3.5) + '/>' +
        '<path d="M22,52 Q60,44 98,52 Q92,88 60,90 Q28,88 22,52 Z" fill="#5c1a1a"/>' +
        '<path d="M24,52 Q60,46 96,52 L94,62 Q60,56 26,62 Z" fill="#ffffff"/>' +
        '<path d="M42,50 L42,60 M60,48 L60,58 M78,50 L78,60" ' + trazo("#dee2e6", 2) + '/>' +
        '<path d="M40,84 Q60,66 80,84 Q70,92 60,92 Q50,92 40,84 Z" fill="#ff8787"/>' +
        '<path d="M30,44 Q40,40 46,44" fill="none" ' + trazo("#ffffff", 3) + ' opacity=".7"/>'
    );

    // Muñeca: antebrazo y mano, con la muñeca marcada con un aro punteado.
    SVG.muneca = svg(
        '<path d="M4,82 L58,62 L66,84 L12,104 Z" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
        '<path d="M58,62 Q74,52 88,50 L106,46 Q114,46 112,54 L94,60 L112,62 Q118,66 112,72 L92,74 L106,80 Q110,86 102,88 L84,84 Q76,92 66,84 Z" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
        '<path d="M70,56 Q66,48 72,40 Q80,36 82,46" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3.5) + '/>' +
        '<ellipse cx="60" cy="73" rx="9" ry="16" transform="rotate(-20 60 73)" fill="none" stroke="#7048e8" stroke-width="4" stroke-dasharray="5 4"/>'
    );

    // Espalda: niño visto de atrás (nuca con pelo, hombros y espalda de la camiseta).
    SVG.espalda = svg(
        '<path d="M14,116 Q12,70 30,60 Q60,50 90,60 Q108,70 106,116 Z" fill="#38d9a9" ' + trazo(TINTA, 3.5) + '/>' +
        '<path d="M60,62 L60,112" fill="none" ' + trazo("#0ca678", 3) + ' stroke-dasharray="6 5"/>' +
        '<path d="M34,78 Q60,70 86,78" fill="none" ' + trazo("#ffffff", 4) + ' opacity=".6"/>' +
        '<rect x="50" y="44" width="20" height="18" rx="6" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
        '<circle cx="34" cy="34" r="7" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
        '<circle cx="86" cy="34" r="7" fill="' + PIEL + '" ' + trazo(PIEL_LINEA, 3) + '/>' +
        '<ellipse cx="60" cy="28" rx="26" ry="26" fill="#6b3a1e" ' + trazo("#4a2512", 3.5) + '/>' +
        '<path d="M44,16 Q52,10 60,14 M62,10 Q70,8 76,16 M50,38 Q60,44 70,38" fill="none" ' + trazo("#4a2512", 3) + '/>'
    );

    // Partes del cuerpo: los dibujos compartidos de Polimotor (comun/partes-cuerpo.js), más claros para
    // niños, reemplazan a los de este archivo (los objetos y órganos propios del juego no se tocan).
    if (global.PartesCuerpo) {
        Object.keys(SVG).forEach(function (k) {
            if (global.PartesCuerpo.SVG[k]) SVG[k] = global.PartesCuerpo.SVG[k];
        });
    }

    global.IconosUso = { SVG: SVG };
})(window);
