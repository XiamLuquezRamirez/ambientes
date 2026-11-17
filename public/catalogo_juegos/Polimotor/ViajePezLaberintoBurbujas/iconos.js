/**
 * IconosPez — dibujos SVG originales de "¡El Viaje del Pez por el Laberinto de Burbujas!" (window.IconosPez).
 * La escena (escenario-phaser.js) los rasteriza a textura con el tamaño de su viewBox (× RES).
 * Todo tiene volumen: degradados con la luz arriba, sombras propias y brillos.
 *
 *   pez          cuerpo del pez payaso mirando a la derecha (sin cola ni aleta lateral: se animan aparte)
 *   cola         aleta de la cola; la unión con el cuerpo está en el borde derecho (70, 45)
 *   aleta        aleta lateral; la unión está arriba a la derecha (44, 6)
 *   coral        coral mágico de llegada, con la entrada de su cueva transparente · coralCueva (interior)
 *   concha       concha de salida ("¡Inicia aquí!")
 *   roca · rocaPlana · alga · algaLarga · estrellaMar · caracol    decoración del fondo
 *   pececito     pez pequeño en tonos claros (la escena lo tiñe de colores)
 *   arrecife     el gran arrecife hogar de la escena final
 *   burbuja      burbuja brillante · estrella
 */
(function (global) {
    "use strict";

    var SVG = {
        pez:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">' +
            '<defs>' +
            '<linearGradient id="nar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb347"/><stop offset=".45" stop-color="#ff7b00"/><stop offset="1" stop-color="#d9480f"/></linearGradient>' +
            '<linearGradient id="bla" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dbe4f0"/></linearGradient>' +
            '<radialGradient id="ojo" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#3b3b52"/><stop offset="1" stop-color="#0b0b18"/></radialGradient>' +
            '<clipPath id="cuerpo"><path d="M30,60 Q36,22 92,18 Q150,14 178,42 Q192,58 178,76 Q150,104 92,102 Q36,98 30,60 Z"/></clipPath>' +
            '</defs>' +
            // aleta de arriba y de abajo (detrás del cuerpo)
            '<path d="M70,26 Q84,0 116,4 Q140,8 146,26 Z" fill="url(#nar)" stroke="#1c1c2e" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M84,10 Q100,6 118,10" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M80,96 Q92,116 116,112 Q128,108 130,96 Z" fill="url(#nar)" stroke="#1c1c2e" stroke-width="3" stroke-linejoin="round"/>' +
            // cuerpo
            '<path d="M30,60 Q36,22 92,18 Q150,14 178,42 Q192,58 178,76 Q150,104 92,102 Q36,98 30,60 Z" fill="url(#nar)"/>' +
            // bandas blancas con borde oscuro
            '<g clip-path="url(#cuerpo)">' +
            '<path d="M126,10 Q112,60 126,110 L148,110 Q134,60 148,10 Z" fill="url(#bla)" stroke="#1c1c2e" stroke-width="4"/>' +
            '<path d="M76,10 Q66,60 78,110 L98,110 Q88,60 98,10 Z" fill="url(#bla)" stroke="#1c1c2e" stroke-width="4"/>' +
            '<path d="M22,10 L40,10 Q32,60 42,110 L22,110 Z" fill="url(#bla)" stroke="#1c1c2e" stroke-width="4"/>' +
            // brillo de arriba y sombra de abajo
            '<path d="M40,46 Q60,24 110,22 Q150,22 170,40" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35"/>' +
            '<path d="M36,74 Q70,100 140,94" fill="none" stroke="#7a1d00" stroke-width="10" stroke-linecap="round" opacity=".18"/>' +
            '</g>' +
            '<path d="M30,60 Q36,22 92,18 Q150,14 178,42 Q192,58 178,76 Q150,104 92,102 Q36,98 30,60 Z" fill="none" stroke="#1c1c2e" stroke-width="3.5"/>' +
            // ojo grande y simpático
            '<circle cx="160" cy="48" r="14" fill="#fff" stroke="#1c1c2e" stroke-width="3"/>' +
            '<circle cx="163" cy="49" r="9" fill="url(#ojo)"/>' +
            '<circle cx="166" cy="45" r="3.4" fill="#fff"/>' +
            '<circle cx="160" cy="53" r="1.6" fill="#fff" opacity=".8"/>' +
            // mejilla y sonrisa
            '<ellipse cx="166" cy="70" rx="7" ry="4" fill="#ff8fa3" opacity=".7"/>' +
            '<path d="M172,64 Q180,70 186,62" fill="none" stroke="#1c1c2e" stroke-width="3" stroke-linecap="round"/>' +
            '</svg>',

        cola:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 90">' +
            '<defs><linearGradient id="c" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ff7b00"/><stop offset=".7" stop-color="#ff9a2e"/><stop offset="1" stop-color="#ffc078"/></linearGradient></defs>' +
            '<path d="M70,38 Q40,30 18,6 Q6,0 4,12 Q10,45 4,78 Q6,90 18,84 Q40,60 70,52 Z" fill="url(#c)" stroke="#1c1c2e" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M10,16 Q16,45 10,74" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
            '<path d="M10,16 Q16,45 10,74" fill="none" stroke="#1c1c2e" stroke-width="2" stroke-linecap="round" transform="translate(6,0)"/>' +
            '<path d="M58,44 L30,22 M58,46 L30,68" stroke="#d9480f" stroke-width="2" opacity=".6"/>' +
            '</svg>',

        aleta:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 40">' +
            '<defs><linearGradient id="a" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8c1a"/><stop offset="1" stop-color="#ffd8a8"/></linearGradient></defs>' +
            '<path d="M44,6 Q24,2 8,14 Q2,24 10,34 Q24,36 40,16 Z" fill="url(#a)" stroke="#1c1c2e" stroke-width="2.6" stroke-linejoin="round"/>' +
            '<path d="M40,10 L14,20 M40,12 L16,30" stroke="#d9480f" stroke-width="1.6" opacity=".55"/>' +
            '<path d="M10,16 Q6,24 12,32" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
            '</svg>',

        // Coral mágico: ramas de colores con puntos de luz; la entrada de la cueva (elipse) queda transparente.
        coral:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 240">' +
            '<defs>' +
            '<linearGradient id="r1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3d9"/><stop offset=".5" stop-color="#f06595"/><stop offset="1" stop-color="#a61e4d"/></linearGradient>' +
            '<linearGradient id="r2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5dbff"/><stop offset=".5" stop-color="#9775fa"/><stop offset="1" stop-color="#5f3dc4"/></linearGradient>' +
            '<linearGradient id="r3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe8cc"/><stop offset=".5" stop-color="#ff922b"/><stop offset="1" stop-color="#d9480f"/></linearGradient>' +
            '<linearGradient id="roca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc9de"/><stop offset=".55" stop-color="#e64980"/><stop offset="1" stop-color="#862e5c"/></linearGradient>' +
            '<mask id="hueco"><rect width="260" height="240" fill="#fff"/><ellipse cx="130" cy="170" rx="46" ry="34" fill="#000"/></mask>' +
            '</defs>' +
            '<g mask="url(#hueco)">' +
            // ramas de atrás
            '<path d="M60,190 Q50,130 26,96 Q16,80 28,76 Q40,74 44,92 Q52,70 46,46 Q44,30 56,30 Q68,32 64,52 Q66,92 84,150 Z" fill="url(#r2)" stroke="#3b1f7a" stroke-width="3"/>' +
            '<path d="M196,190 Q206,128 232,98 Q242,84 232,78 Q220,74 214,92 Q206,66 214,42 Q216,28 204,28 Q192,30 196,52 Q194,94 176,150 Z" fill="url(#r3)" stroke="#8a3200" stroke-width="3"/>' +
            '<path d="M118,150 Q108,96 96,60 Q90,40 102,38 Q114,38 112,58 Q122,30 128,10 Q134,0 142,8 Q148,18 140,40 Q150,30 160,40 Q166,52 150,64 Q140,100 142,150 Z" fill="url(#r1)" stroke="#82153f" stroke-width="3"/>' +
            // la roca con la cueva
            '<path d="M24,232 Q14,180 54,152 Q90,124 130,124 Q172,124 206,150 Q246,180 236,232 Z" fill="url(#roca)" stroke="#5c1a3d" stroke-width="4"/>' +
            '<path d="M50,168 Q86,136 130,134 Q176,134 208,164" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35"/>' +
            // puntos de luz mágicos
            '<g fill="#fff">' +
            '<circle cx="56" cy="40" r="5"/><circle cx="204" cy="38" r="5"/><circle cx="134" cy="16" r="5"/><circle cx="30" cy="84" r="4"/><circle cx="230" cy="86" r="4"/>' +
            '<circle cx="104" cy="46" r="4"/><circle cx="156" cy="46" r="4"/>' +
            '</g>' +
            '<g fill="#ffe066"><circle cx="66" cy="200" r="6"/><circle cx="196" cy="204" r="6"/><circle cx="90" cy="148" r="4"/><circle cx="172" cy="146" r="4"/><circle cx="130" cy="220" r="5"/></g>' +
            '</g>' +
            // borde de la entrada de la cueva
            '<ellipse cx="130" cy="170" rx="47" ry="35" fill="none" stroke="#5c1a3d" stroke-width="5"/>' +
            '<path d="M90,152 Q130,128 170,152" fill="none" stroke="#ffd6e7" stroke-width="5" stroke-linecap="round" opacity=".8"/>' +
            '</svg>',

        coralCueva:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">' +
            '<defs><radialGradient id="cv" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#ffe3f1"/><stop offset=".35" stop-color="#c2255c"/><stop offset="1" stop-color="#3d0b24"/></radialGradient></defs>' +
            '<ellipse cx="60" cy="45" rx="58" ry="43" fill="url(#cv)"/>' +
            '<ellipse cx="60" cy="50" rx="24" ry="14" fill="#fff" opacity=".35"/>' +
            '</svg>',

        concha:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">' +
            '<defs><radialGradient id="co" cx=".5" cy=".9" r=".9"><stop offset="0" stop-color="#fff4e6"/><stop offset=".6" stop-color="#ffc9a8"/><stop offset="1" stop-color="#f08c73"/></radialGradient></defs>' +
            '<ellipse cx="100" cy="110" rx="86" ry="9" fill="#08305a" opacity=".3"/>' +
            '<path d="M100,104 L14,96 Q8,40 60,16 Q100,0 140,16 Q192,40 186,96 Z" fill="url(#co)" stroke="#b5523b" stroke-width="4" stroke-linejoin="round"/>' +
            '<g fill="none" stroke="#d9745e" stroke-width="3" stroke-linecap="round">' +
            '<path d="M100,102 L36,40"/><path d="M100,102 L64,22"/><path d="M100,102 L100,14"/><path d="M100,102 L136,22"/><path d="M100,102 L164,40"/>' +
            '</g>' +
            '<path d="M80,104 Q100,94 120,104 L118,116 L82,116 Z" fill="#f08c73" stroke="#b5523b" stroke-width="3"/>' +
            '<path d="M40,40 Q70,14 112,14" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/>' +
            '</svg>',

        roca:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110">' +
            '<defs><linearGradient id="ro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5b8d0"/><stop offset=".55" stop-color="#5c7394"/><stop offset="1" stop-color="#2c3e5c"/></linearGradient></defs>' +
            '<path d="M8,104 Q2,70 30,52 Q42,20 80,16 Q118,14 132,44 Q158,58 152,104 Z" fill="url(#ro)" stroke="#1d2b44" stroke-width="3.5"/>' +
            '<path d="M36,48 Q52,26 84,24" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".4"/>' +
            '<path d="M28,56 Q50,46 70,52 Q96,40 120,48 Q136,52 140,62" fill="none" stroke="#51cf66" stroke-width="7" stroke-linecap="round" opacity=".8"/>' +
            '<ellipse cx="96" cy="78" rx="9" ry="6" fill="#1d2b44" opacity=".35"/><ellipse cx="56" cy="86" rx="6" ry="4" fill="#1d2b44" opacity=".35"/>' +
            '</svg>',

        rocaPlana:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 80">' +
            '<defs><linearGradient id="rp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3b6a0"/><stop offset=".6" stop-color="#8a7a62"/><stop offset="1" stop-color="#4f4436"/></linearGradient></defs>' +
            '<path d="M6,74 Q4,46 40,34 Q80,20 130,28 Q174,38 174,74 Z" fill="url(#rp)" stroke="#3a3127" stroke-width="3.5"/>' +
            '<path d="M30,42 Q70,26 120,32" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".4"/>' +
            '<circle cx="62" cy="56" r="7" fill="#ffa8a8" stroke="#c92a2a" stroke-width="2"/><circle cx="120" cy="52" r="5" fill="#ffe066" stroke="#e67700" stroke-width="2"/>' +
            '</svg>',

        alga:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 200">' +
            '<defs><linearGradient id="al" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b8a3e"/><stop offset=".5" stop-color="#69db7c"/><stop offset="1" stop-color="#2f9e44"/></linearGradient></defs>' +
            '<path d="M30,200 Q14,170 26,140 Q38,112 22,84 Q8,56 24,30 Q30,16 34,4 Q46,28 40,52 Q34,80 46,104 Q56,132 42,160 Q34,180 38,200 Z" fill="url(#al)" stroke="#1b5e2a" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M32,190 Q26,160 34,136 Q40,110 30,86 Q22,60 32,30" fill="none" stroke="#b2f2bb" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
            '</svg>',

        algaLarga:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 240">' +
            '<defs><linearGradient id="ak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#087f5b"/><stop offset=".5" stop-color="#38d9a9"/><stop offset="1" stop-color="#099268"/></linearGradient></defs>' +
            '<path d="M40,240 Q30,200 38,170 Q44,140 34,110 Q26,80 36,50 Q40,24 38,6 Q48,26 50,52 Q52,84 46,112 Q42,142 50,172 Q56,204 46,240 Z" fill="url(#ak)" stroke="#06513c" stroke-width="3"/>' +
            '<path d="M38,170 Q16,160 8,136 Q24,140 40,152 Z M44,112 Q66,100 74,76 Q58,82 46,96 Z M36,60 Q16,48 14,26 Q28,34 38,46 Z" fill="url(#ak)" stroke="#06513c" stroke-width="2.6"/>' +
            '</svg>',

        estrellaMar:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
            '<defs><radialGradient id="em" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#ffd8a8"/><stop offset=".6" stop-color="#ff6b6b"/><stop offset="1" stop-color="#c92a2a"/></radialGradient></defs>' +
            '<path d="M50,6 Q58,32 64,38 Q90,36 94,40 Q78,56 72,64 Q82,90 78,94 Q58,80 50,76 Q42,80 22,94 Q18,90 28,64 Q22,56 6,40 Q10,36 36,38 Q42,32 50,6 Z" fill="url(#em)" stroke="#8f1d1d" stroke-width="3" stroke-linejoin="round"/>' +
            '<g fill="#fff3bf"><circle cx="50" cy="26" r="2.6"/><circle cx="76" cy="44" r="2.6"/><circle cx="68" cy="78" r="2.6"/><circle cx="32" cy="78" r="2.6"/><circle cx="24" cy="44" r="2.6"/><circle cx="50" cy="52" r="3.4"/></g>' +
            '</svg>',

        caracol:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 70">' +
            '<defs><linearGradient id="ca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0f6"/><stop offset="1" stop-color="#e599f7"/></linearGradient></defs>' +
            '<path d="M8,62 Q4,30 34,14 Q60,4 78,24 Q88,40 78,56 Q66,66 44,64 Z" fill="url(#ca)" stroke="#862e9c" stroke-width="3"/>' +
            '<path d="M44,40 m-14,0 a14,14 0 1,0 28,0 a10,10 0 1,0 -20,0 a6,6 0 1,0 12,0" fill="none" stroke="#862e9c" stroke-width="3"/>' +
            '<path d="M22,24 Q36,12 54,12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>' +
            '</svg>',

        // Pececito en tonos claros: la escena lo tiñe de colores (amigos del arrecife y peces del fondo).
        pececito:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50">' +
            '<defs><linearGradient id="pp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e9ecef"/><stop offset="1" stop-color="#adb5bd"/></linearGradient></defs>' +
            '<path d="M18,25 L2,10 Q0,25 2,40 Z" fill="url(#pp)" stroke="#495057" stroke-width="2"/>' +
            '<path d="M16,25 Q22,6 46,6 Q70,8 76,25 Q70,42 46,44 Q22,44 16,25 Z" fill="url(#pp)" stroke="#495057" stroke-width="2.4"/>' +
            '<path d="M38,8 Q34,25 38,42" fill="none" stroke="#868e96" stroke-width="3" opacity=".6"/>' +
            '<circle cx="62" cy="20" r="5" fill="#fff" stroke="#495057" stroke-width="1.6"/><circle cx="63.5" cy="20.5" r="3" fill="#212529"/><circle cx="64.5" cy="19" r="1" fill="#fff"/>' +
            '<path d="M26,16 Q40,10 56,12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>' +
            '</svg>',

        // Gran arrecife hogar (final): rocas, corales, anémona y un hueco cómodo al centro.
        arrecife:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360">' +
            '<defs>' +
            '<linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3d9"/><stop offset=".5" stop-color="#f06595"/><stop offset="1" stop-color="#a61e4d"/></linearGradient>' +
            '<linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d0bfff"/><stop offset=".5" stop-color="#845ef7"/><stop offset="1" stop-color="#5f3dc4"/></linearGradient>' +
            '<linearGradient id="a3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe8cc"/><stop offset=".5" stop-color="#ffa94d"/><stop offset="1" stop-color="#e8590c"/></linearGradient>' +
            '<linearGradient id="a4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3fae8"/><stop offset=".5" stop-color="#38d9a9"/><stop offset="1" stop-color="#087f5b"/></linearGradient>' +
            '<linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8c6db"/><stop offset=".6" stop-color="#6a7f9f"/><stop offset="1" stop-color="#34445f"/></linearGradient>' +
            '<radialGradient id="nido" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff9db"/><stop offset=".6" stop-color="#ffe066" stop-opacity=".55"/><stop offset="1" stop-color="#ffe066" stop-opacity="0"/></radialGradient>' +
            '</defs>' +
            // rocas de la base
            '<path d="M0,360 Q-6,280 60,250 Q120,214 200,236 Q280,200 360,232 Q440,206 500,244 Q566,270 560,360 Z" fill="url(#ar)" stroke="#1d2b44" stroke-width="4"/>' +
            '<path d="M40,270 Q100,236 180,248 M300,238 Q380,214 460,242" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".3"/>' +
            // corales altos
            '<path d="M70,260 Q62,180 30,130 Q20,110 36,106 Q50,106 52,126 Q60,96 54,64 Q52,44 68,44 Q84,46 78,72 Q82,130 104,236 Z" fill="url(#a2)" stroke="#3b1f7a" stroke-width="4"/>' +
            '<path d="M470,250 Q480,170 512,124 Q524,104 510,98 Q494,94 488,116 Q478,84 488,52 Q490,34 474,34 Q458,36 462,62 Q458,120 434,236 Z" fill="url(#a3)" stroke="#8a3200" stroke-width="4"/>' +
            '<path d="M168,240 Q150,170 130,128 Q122,108 138,104 Q152,104 152,124 Q164,86 170,52 Q174,34 188,40 Q200,48 192,74 Q206,60 220,70 Q228,84 206,100 Q194,150 200,236 Z" fill="url(#a1)" stroke="#82153f" stroke-width="4"/>' +
            '<path d="M392,236 Q406,168 426,128 Q434,110 420,104 Q406,102 404,124 Q394,92 388,62 Q384,44 370,50 Q358,58 366,84 Q350,72 338,82 Q330,96 352,110 Q362,156 356,236 Z" fill="url(#a4)" stroke="#06513c" stroke-width="4"/>' +
            // anémona central (el hogar)
            '<ellipse cx="280" cy="232" rx="110" ry="60" fill="url(#nido)"/>' +
            '<g stroke="#a61e4d" stroke-width="3" stroke-linecap="round">' +
            '<path d="M220,262 Q206,214 216,186" fill="none"/><path d="M240,258 Q234,206 246,176" fill="none"/><path d="M262,256 Q262,200 270,170" fill="none"/>' +
            '<path d="M298,256 Q300,200 292,170" fill="none"/><path d="M320,258 Q328,206 316,176" fill="none"/><path d="M340,262 Q356,214 346,186" fill="none"/>' +
            '</g>' +
            '<g fill="#ff8fc7" stroke="#a61e4d" stroke-width="2"><circle cx="216" cy="184" r="9"/><circle cx="246" cy="174" r="9"/><circle cx="270" cy="168" r="9"/><circle cx="292" cy="168" r="9"/><circle cx="316" cy="174" r="9"/><circle cx="346" cy="184" r="9"/></g>' +
            '<path d="M200,280 Q280,240 360,280 Q350,300 280,300 Q210,300 200,280 Z" fill="#e64980" stroke="#82153f" stroke-width="4"/>' +
            // perlas y luces
            '<g fill="#fff"><circle cx="68" cy="44" r="6"/><circle cx="474" cy="34" r="6"/><circle cx="188" cy="40" r="6"/><circle cx="370" cy="50" r="6"/></g>' +
            '<g fill="#ffe066"><circle cx="120" cy="300" r="7"/><circle cx="440" cy="296" r="7"/><circle cx="280" cy="330" r="8"/></g>' +
            '</svg>',

        burbuja:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
            '<defs><radialGradient id="bu" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".05"/><stop offset=".72" stop-color="#d0f4ff" stop-opacity=".25"/><stop offset=".92" stop-color="#ffffff" stop-opacity=".85"/><stop offset="1" stop-color="#ffffff" stop-opacity=".2"/></radialGradient>' +
            '<linearGradient id="iri" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fc7" stop-opacity=".5"/><stop offset=".5" stop-color="#7cf3ff" stop-opacity=".3"/><stop offset="1" stop-color="#b197fc" stop-opacity=".5"/></linearGradient></defs>' +
            '<circle cx="50" cy="50" r="46" fill="url(#bu)"/>' +
            '<circle cx="50" cy="50" r="45" fill="none" stroke="url(#iri)" stroke-width="4"/>' +
            '<ellipse cx="34" cy="30" rx="14" ry="8" fill="#fff" opacity=".9" transform="rotate(-35 34 30)"/>' +
            '<circle cx="66" cy="70" r="4" fill="#fff" opacity=".7"/>' +
            '</svg>',

        estrella:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
            '<defs><radialGradient id="e" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#ffd43b"/><stop offset="1" stop-color="#f59f00"/></radialGradient></defs>' +
            '<path d="M50,6 L62,36 L94,38 L69,58 L78,90 L50,72 L22,90 L31,58 L6,38 L38,36 Z" fill="url(#e)" stroke="#e67700" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M40,30 L50,14" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>' +
            '</svg>'
    };

    global.IconosPez = { SVG: SVG };
})(window);
