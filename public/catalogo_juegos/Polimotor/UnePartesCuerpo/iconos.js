/**
 * IconosCuerpo — dibujos de las tarjetas de "Une las Partes del Cuerpo" (window.IconosCuerpo).
 *
 * Un SVG de 120 × 120 por parte del cuerpo, con la piel, el pelo y la ropa de Zeus para que el niño
 * reconozca en la tarjeta lo mismo que ve en el personaje. Cada dibujo muestra solo su parte, grande y
 * de frente o de lado (como se dibuja en los libros de preescolar). config.json elige el dibujo con
 * `icono`; para agregar una parte nueva basta con un dibujo aquí y una tarjeta en config.json.
 */
(function (global) {
    "use strict";

    var PIEL = "#f2c6b9";
    var SOMBRA = "#e5a796";
    var LINEA = "#c98471";
    var PELO = "#84401b";
    var PELO_LINEA = "#5e2b10";
    var CAMISA = "#2d8a6e";
    var CUELLO_CAMISA = "#8cc97c";
    var SHORT = "#024f6c";
    var LABIO = "#c4453a";
    var LABIO_LINEA = "#86322a";
    var LENGUA = "#ef7f86";
    var OREJA = "#ef8b7b";

    function svg(cuerpo) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">' + cuerpo + "</svg>";
    }

    var T = 'stroke="' + LINEA + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

    var SVG = {};

    // Mano abierta, palma al frente: cuatro dedos, el pulgar a un lado y el puño de la camiseta.
    SVG.mano = svg(
        '<rect x="16" y="50" width="14" height="36" rx="7" transform="rotate(-36 23 68)" fill="' + PIEL + '" ' + T + '/>' +
        '<rect x="35" y="22" width="13" height="46" rx="6.5" fill="' + PIEL + '" ' + T + '/>' +
        '<rect x="50" y="13" width="13" height="54" rx="6.5" fill="' + PIEL + '" ' + T + '/>' +
        '<rect x="65" y="17" width="13" height="50" rx="6.5" fill="' + PIEL + '" ' + T + '/>' +
        '<rect x="80" y="28" width="12" height="40" rx="6" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M33,56 Q30,92 46,100 L76,100 Q93,92 93,58 Q62,50 33,56 Z" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M48,70 Q60,78 74,68" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<rect x="42" y="98" width="40" height="16" rx="6" fill="' + CUELLO_CAMISA + '"/>'
    );

    // Cabeza de frente con pelo, orejas y cara sonriente.
    SVG.cabeza = svg(
        '<ellipse cx="20" cy="66" rx="10" ry="13" fill="' + PIEL + '" ' + T + '/>' +
        '<ellipse cx="100" cy="66" rx="10" ry="13" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M22,62 C20,96 40,112 60,112 C80,112 100,96 98,62 C98,30 80,18 60,18 C40,18 22,30 22,62 Z" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M18,60 C12,32 30,6 58,8 L54,0 L66,8 L70,2 L74,10 C98,12 110,34 102,60 C98,44 88,34 74,32 L68,40 C62,32 52,30 42,32 C30,34 22,46 18,60 Z" fill="' + PELO + '" stroke="' + PELO_LINEA + '" stroke-width="2" stroke-linejoin="round"/>' +
        '<ellipse cx="46" cy="66" rx="6" ry="7" fill="#3b2016"/><ellipse cx="74" cy="66" rx="6" ry="7" fill="#3b2016"/>' +
        '<circle cx="48" cy="64" r="2" fill="#fff"/><circle cx="76" cy="64" r="2" fill="#fff"/>' +
        '<ellipse cx="60" cy="80" rx="5" ry="4" fill="' + SOMBRA + '"/>' +
        '<path d="M48,92 Q60,102 72,92" stroke="' + LABIO_LINEA + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="36" cy="84" rx="7" ry="4.5" fill="#f29a98" opacity=".6"/><ellipse cx="84" cy="84" rx="7" ry="4.5" fill="#f29a98" opacity=".6"/>'
    );

    // Dos ojos grandes con cejas y pestañas.
    function ojo(cx) {
        return '<ellipse cx="' + cx + '" cy="64" rx="22" ry="17" fill="#ffffff" stroke="#4a2a1c" stroke-width="3"/>' +
            '<circle cx="' + cx + '" cy="66" r="12" fill="#5b3420"/>' +
            '<circle cx="' + cx + '" cy="66" r="6.5" fill="#160b06"/>' +
            '<circle cx="' + (cx + 5) + '" cy="61" r="3.6" fill="#ffffff"/>' +
            '<path d="M' + (cx - 20) + ',54 L' + (cx - 26) + ',47 M' + (cx - 8) + ',48 L' + (cx - 10) + ',40 M' + (cx + 8) + ',48 L' + (cx + 10) + ',40 M' + (cx + 20) + ',54 L' + (cx + 26) + ',47" stroke="#4a2a1c" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M' + (cx - 20) + ',32 Q' + cx + ',22 ' + (cx + 20) + ',30" stroke="' + PELO + '" stroke-width="6" fill="none" stroke-linecap="round"/>';
    }
    SVG.ojos = svg(ojo(32) + ojo(88));

    // Nariz de frente, redondita, con las dos fosas nasales.
    SVG.nariz = svg(
        '<path d="M50,14 Q46,50 38,66 Q24,74 26,88 Q30,102 46,100 Q54,106 60,106 Q66,106 74,100 Q90,102 94,88 Q96,74 82,66 Q74,50 70,14 Z" fill="' + PIEL + '" ' + T + '/>' +
        '<ellipse cx="48" cy="92" rx="7" ry="5" fill="#b9675a"/>' +
        '<ellipse cx="72" cy="92" rx="7" ry="5" fill="#b9675a"/>' +
        '<path d="M56,22 Q54,48 52,62" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>' +
        '<path d="M38,66 Q34,78 40,86 M82,66 Q86,78 80,86" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>'
    );

    // Boca sonriente abierta: labios, dientes y lengua.
    SVG.boca = svg(
        '<path d="M12,48 Q60,62 108,48 Q100,104 60,106 Q20,104 12,48 Z" fill="' + LABIO + '" stroke="' + LABIO_LINEA + '" stroke-width="4" stroke-linejoin="round"/>' +
        '<path d="M22,54 Q60,66 98,54 L95,66 Q60,76 25,66 Z" fill="#ffffff"/>' +
        '<path d="M38,92 Q60,72 82,92 Q72,102 60,102 Q48,102 38,92 Z" fill="' + LENGUA + '"/>' +
        '<path d="M18,44 Q38,34 60,42 Q82,34 102,44" stroke="' + LABIO_LINEA + '" stroke-width="5" fill="none" stroke-linecap="round"/>'
    );

    // ---------------------------------------------------------------- redibujados (2026-11-12)
    // Brazo, pierna, pie, cuello y oreja nuevos (los anteriores no se reconocían bien). Contorno de "calcomanía":
    // las formas se pintan primero gruesas en el color de la línea y luego encima en piel, así el borde rodea
    // toda la silueta sin rayas por dentro. Misma paleta de Zeus (piel, camiseta verde, pantaloneta azul).
    function silueta(formas, relleno, linea, grosor) {
        return '<g fill="' + linea + '" stroke="' + linea + '" stroke-width="' + grosor + '" stroke-linejoin="round">' + formas + "</g>" +
            '<g fill="' + relleno + '">' + formas + "</g>";
    }

    // Brazo mostrando fuerza: manga verde, brazo con bíceps, codo, antebrazo hacia arriba y puño.
    SVG.brazo = svg(
        silueta(
            '<rect x="20" y="70" width="64" height="30" rx="15"/>' +
            '<ellipse cx="50" cy="72" rx="22" ry="15"/>' +
            '<circle cx="78" cy="86" r="15"/>' +
            '<rect x="66" y="30" width="26" height="62" rx="13" transform="rotate(8 79 86)"/>' +
            '<rect x="61" y="9" width="38" height="36" rx="18"/>',
            PIEL, LINEA, 6) +
        // dedos del puño y pulgar
        '<path d="M67,21 Q75,18 83,21 M66,29 Q75,26 84,29 M67,37 Q74,34 82,37" stroke="' + LINEA + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M86,18 Q96,22 92,34" stroke="' + LINEA + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        // brillo del bíceps y pliegue del codo
        '<path d="M38,66 Q50,58 62,66" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M70,80 Q74,88 70,94" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        // manga de la camiseta
        silueta('<path d="M4,62 L30,62 Q36,86 30,108 L4,108 Z"/>', CAMISA, "#1f6b54", 4) +
        '<path d="M28,64 Q34,86 28,106" stroke="' + CUELLO_CAMISA + '" stroke-width="6" fill="none" stroke-linecap="round"/>'
    );

    // Pierna entera de lado: pantaloneta, muslo, rodilla, canilla, media y tenis.
    SVG.pierna = svg(
        silueta(
            // una sola silueta suave: muslo, rodilla apenas marcada y canilla
            '<path d="M42,26 L76,26 Q78,52 74,66 Q71,76 72,88 L72,104 L46,104 L46,88 Q47,76 44,66 Q40,52 42,26 Z"/>',
            PIEL, LINEA, 6) +
        '<path d="M52,68 Q59,73 66,68" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M66,36 Q69,48 66,58 M64,78 Q66,86 65,94" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>' +
        // media
        silueta('<rect x="45" y="90" width="28" height="16" rx="4"/>', "#ffffff", "#c9d0db", 4) +
        '<path d="M47,96 H71" stroke="#4dabf7" stroke-width="3"/>' +
        // tenis rojo con suela blanca
        silueta('<path d="M42,104 L74,104 Q90,104 102,110 Q108,114 106,118 L42,118 Q38,112 42,104 Z"/>', "#fa5252", "#a61e1e", 4) +
        '<path d="M42,116 L106,116" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M60,104 L64,110 M68,104 L72,110" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>' +
        // pantaloneta
        silueta('<path d="M36,4 L82,4 L84,34 Q60,40 38,34 Z"/>', SHORT, "#01384d", 4) +
        '<path d="M40,30 Q60,35 82,30" stroke="#ffffff" stroke-width="3" fill="none" opacity=".5"/>'
    );

    // Pie de lado, descalzo: tobillo, talón redondo, planta y cinco deditos.
    SVG.pie = svg(
        silueta(
            '<path d="M28,14 L52,14 L54,62 L24,62 Z"/>' +
            '<path d="M22,58 Q18,100 36,104 L94,104 Q110,103 110,90 Q109,78 92,72 Q72,66 56,58 Z"/>' +
            '<circle cx="101" cy="84" r="11"/>' +
            '<circle cx="89" cy="74" r="8.5"/>' +
            '<circle cx="79" cy="68" r="7.5"/>' +
            '<circle cx="69" cy="64" r="6.5"/>' +
            '<circle cx="60" cy="60" r="5.5"/>',
            PIEL, LINEA, 6) +
        // uñas
        '<ellipse cx="104" cy="80" rx="5" ry="3.6" fill="#fff4ea"/>' +
        '<ellipse cx="91" cy="70" rx="3.6" ry="2.8" fill="#fff4ea"/>' +
        '<ellipse cx="81" cy="64.5" rx="3.2" ry="2.4" fill="#fff4ea"/>' +
        // hueso del tobillo, arco y brillo
        '<circle cx="44" cy="56" r="4" fill="' + SOMBRA + '"/>' +
        '<path d="M44,92 Q66,86 88,92" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M32,26 V50" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity=".55"/>' +
        // borde de la pantaloneta arriba
        '<rect x="20" y="2" width="38" height="14" rx="5" fill="' + SHORT + '"/>'
    );

    // Cuello: la cara asoma arriba, el cuello en el medio (con brillos alrededor) y los hombros con la camiseta.
    SVG.cuello = svg(
        // hombros y camiseta
        silueta('<path d="M8,120 Q8,94 34,88 L86,88 Q112,94 112,120 Z"/>', CAMISA, "#1f6b54", 4) +
        silueta('<rect x="42" y="40" width="36" height="58" rx="14"/>', PIEL, LINEA, 5) +
        '<path d="M40,90 Q60,108 80,90" stroke="' + CUELLO_CAMISA + '" stroke-width="8" fill="none" stroke-linecap="round"/>' +
        '<path d="M48,58 Q60,64 72,58" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        // cara (solo la parte de abajo) con pelo, ojos cerrados contentos y sonrisa
        silueta('<path d="M24,10 Q24,48 60,50 Q96,48 96,10 Z"/>', PIEL, LINEA, 5) +
        '<path d="M22,12 Q60,-6 98,12 L98,2 L22,2 Z" fill="' + PELO + '"/>' +
        '<path d="M40,20 Q46,15 52,20 M68,20 Q74,15 80,20" stroke="#3b2016" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M50,34 Q60,42 70,34" stroke="' + LABIO_LINEA + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="34" cy="30" rx="6" ry="4" fill="#f29a98" opacity=".6"/><ellipse cx="86" cy="30" rx="6" ry="4" fill="#f29a98" opacity=".6"/>' +
        // brillos que señalan el cuello
        '<path d="M28,62 L36,66 M26,74 L36,74 M28,86 L36,82 M92,62 L84,66 M94,74 L84,74 M92,86 L84,82" stroke="#fab005" stroke-width="4" stroke-linecap="round"/>'
    );

    // Oreja de lado, grande: borde enrollado, interior rosado y lóbulo; un mechón de pelo arriba.
    SVG.orejas = svg(
        '<path d="M22,4 Q60,-4 74,16 L44,24 Q30,20 22,4 Z" fill="' + PELO + '"/>' +
        silueta(
            '<path d="M38,30 Q38,8 64,8 Q98,8 98,44 Q98,66 82,78 Q72,86 72,98 Q72,114 56,114 Q40,114 40,98 Q40,90 46,84 Q36,72 36,52 Z"/>',
            PIEL, LINEA, 6) +
        // interior de la oreja: la concha rosada y el borde enrollado (sin el gancho que parecía un "?")
        '<path d="M50,38 Q52,22 66,22 Q86,22 86,46 Q86,62 76,70 Q68,76 66,86 Q56,84 54,72 Q52,62 58,56 Q50,50 50,38 Z" fill="' + OREJA + '" opacity=".75"/>' +
        '<path d="M46,36 Q48,16 66,15 Q92,16 92,46 Q92,66 78,76" stroke="' + LINEA + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M58,58 Q64,54 66,60 Q66,66 60,68" stroke="' + LINEA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<ellipse cx="56" cy="102" rx="8" ry="6" fill="#f29a98" opacity=".55"/>' +
        '<path d="M44,40 Q42,56 46,70" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>'
    );

    function dataUrl(id) {
        return SVG[id] ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG[id]) : "";
    }

    global.IconosCuerpo = { SVG: SVG, dataUrl: dataUrl };
})(window);
