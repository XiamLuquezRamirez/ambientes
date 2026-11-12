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

    // Brazo doblado mostrando fuerza: manga verde, brazo, codo y puño arriba.
    SVG.brazo = svg(
        '<path d="M10,96 Q8,74 26,68 L54,62 Q62,61 66,68 L68,84 Q50,98 26,102 Q12,104 10,96 Z" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M62,70 Q70,40 82,28 Q88,22 96,26 L98,46 Q86,56 80,74 Z" fill="' + PIEL + '" ' + T + '/>' +
        '<ellipse cx="94" cy="24" rx="15" ry="13" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M86,18 Q94,13 102,18 M85,25 Q94,21 103,26" stroke="' + LINEA + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M30,70 Q42,52 58,64" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M4,70 Q2,96 14,106 L32,104 Q24,84 30,64 Z" fill="' + CAMISA + '"/>' +
        '<path d="M28,64 Q22,86 32,104" stroke="' + CUELLO_CAMISA + '" stroke-width="7" fill="none" stroke-linecap="round"/>'
    );

    // Pie de lado: talón, planta y cinco deditos.
    SVG.pie = svg(
        '<path d="M30,18 L52,18 L54,62 Q70,66 92,72 Q108,76 106,92 Q104,100 94,100 L28,100 Q14,100 14,84 Q14,68 28,60 Z" fill="' + PIEL + '" ' + T + '/>' +
        '<circle cx="100" cy="82" r="7" fill="' + PIEL + '" ' + T + '/>' +
        '<circle cx="90" cy="76" r="6" fill="' + PIEL + '" ' + T + '/>' +
        '<circle cx="81" cy="72" r="5" fill="' + PIEL + '" ' + T + '/>' +
        '<circle cx="73" cy="69" r="4.5" fill="' + PIEL + '" ' + T + '/>' +
        '<circle cx="66" cy="67" r="4" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M22,88 Q48,92 84,90" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<rect x="26" y="8" width="30" height="16" rx="5" fill="#ffffff" stroke="#d5dbe5" stroke-width="2"/>'
    );

    // Pierna completa: muslo con la pantaloneta, rodilla, canilla y pie con media.
    SVG.pierna = svg(
        '<path d="M40,4 L76,4 L78,34 L40,34 Z" fill="' + SHORT + '"/>' +
        '<rect x="44" y="30" width="28" height="68" rx="13" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M50,62 Q58,68 66,62" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M42,92 L74,92 L74,104 Q92,104 96,112 Q96,118 88,118 L46,118 Q40,118 42,108 Z" fill="#ffffff" stroke="#c9d0db" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M50,94 L50,104 M58,94 L58,104 M66,94 L66,104" stroke="#dfe3ea" stroke-width="2"/>'
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

    // Oreja de lado, grande, con su interior rosado.
    SVG.orejas = svg(
        '<path d="M40,26 Q46,6 72,8 Q102,12 100,46 Q98,66 82,78 Q74,86 72,98 Q68,114 52,112 Q36,110 38,94" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M52,34 Q58,20 74,22 Q90,26 88,46 Q86,60 74,68 Q66,74 64,86" stroke="' + OREJA + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="M62,46 Q68,38 76,44 Q78,54 68,58" stroke="' + LINEA + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M40,26 Q34,60 38,94" stroke="' + PIEL + '" stroke-width="2" fill="none"/>'
    );

    // Cuello: barbilla arriba, el cuello en el medio y los hombros con la camiseta abajo.
    SVG.cuello = svg(
        '<path d="M6,118 Q8,88 34,82 L86,82 Q112,88 114,118 Z" fill="' + CAMISA + '"/>' +
        '<rect x="40" y="26" width="40" height="66" rx="14" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M42,84 Q60,104 78,84" stroke="' + CUELLO_CAMISA + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
        '<path d="M22,6 Q24,36 60,40 Q96,36 98,6 Z" fill="' + PIEL + '" ' + T + '/>' +
        '<path d="M48,58 Q60,64 72,58" stroke="' + SOMBRA + '" stroke-width="3" fill="none" stroke-linecap="round"/>'
    );

    function dataUrl(id) {
        return SVG[id] ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG[id]) : "";
    }

    global.IconosCuerpo = { SVG: SVG, dataUrl: dataUrl };
})(window);
