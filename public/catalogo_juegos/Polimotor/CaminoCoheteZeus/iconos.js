/**
 * IconosCohete — dibujos SVG originales de "¡El Camino del Cohete de Zeus!" (window.IconosCohete).
 * La escena (escenario-phaser.js) los rasteriza a textura con el tamaño de su viewBox (× RES).
 * Todo tiene volumen: degradados de luz arriba a la izquierda, sombras propias y brillos.
 *
 *   cohete         el cohete de Zeus mirando a la derecha (Zeus no se dibuja: pedido del usuario)
 *   vidrio         reflejos del cristal de la ventana
 *   coheteFrente   el cohete visto de frente (mitad del giro 3D)
 *   llama          llama del propulsor, apunta a la izquierda (se anima en la escena)
 *   plataforma     plataforma de despegue
 *   estacion       estación lunar con hangar (hueco transparente) · hangar (interior) · persiana (compuertas)
 *   compuerta      una hoja de la puerta de la base (se usan dos)
 *   luna           luna con cráteres (debajo de la estación)
 *   base           gran base espacial de Zeus (escena final)
 *   planetaAnillo · planetaRayas · planetaLava · planetaHielo · asteroide · estrella
 */
(function (global) {
    "use strict";

    var SVG = {
        cohete:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 130">' +
            '<defs>' +
            '<linearGradient id="cuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".38" stop-color="#eef2fb"/><stop offset=".72" stop-color="#b8c3dc"/><stop offset="1" stop-color="#7d8bb0"/></linearGradient>' +
            '<linearGradient id="rojo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".45" stop-color="#f03e3e"/><stop offset="1" stop-color="#a51d24"/></linearGradient>' +
            '<linearGradient id="ala" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7070"/><stop offset="1" stop-color="#b3202a"/></linearGradient>' +
            '<linearGradient id="tobera" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d1e4"/><stop offset=".5" stop-color="#6c7896"/><stop offset="1" stop-color="#3b4460"/></linearGradient>' +
            '<radialGradient id="aro" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffe082"/><stop offset="1" stop-color="#e6a100"/></radialGradient>' +
            '<radialGradient id="cristal" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#7fd6ff"/><stop offset=".6" stop-color="#2c7fd6"/><stop offset="1" stop-color="#173f8f"/></radialGradient>' +
            '</defs>' +
            // sombra propia debajo
            '<ellipse cx="128" cy="112" rx="88" ry="7" fill="#000" opacity=".18"/>' +
            // aleta de atrás (lejana)
            '<path d="M70,46 L46,14 Q40,6 52,8 L96,40 Z" fill="#8f1820"/>' +
            // tobera
            '<path d="M18,44 L40,50 L40,80 L18,86 Q12,65 18,44 Z" fill="url(#tobera)"/>' +
            '<rect x="12" y="46" width="8" height="38" rx="4" fill="#4a5470"/>' +
            // cuerpo
            '<path d="M38,40 Q120,24 182,36 Q236,48 244,65 Q236,82 182,94 Q120,106 38,90 Q30,65 38,40 Z" fill="url(#cuerpo)" stroke="#5c6a90" stroke-width="2.5"/>' +
            // punta roja
            '<path d="M182,36 Q236,48 244,65 Q236,82 182,94 Q192,65 182,36 Z" fill="url(#rojo)"/>' +
            // franja roja
            '<path d="M70,32 Q74,65 70,98 L84,100 Q88,65 84,30 Z" fill="url(#rojo)"/>' +
            // brillo del cuerpo
            '<path d="M60,44 Q120,32 178,42" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/>' +
            '<path d="M196,46 Q222,52 232,60" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>' +
            // remaches
            '<circle cx="104" cy="88" r="2.4" fill="#7d8bb0"/><circle cx="118" cy="90" r="2.4" fill="#7d8bb0"/><circle cx="160" cy="88" r="2.4" fill="#7d8bb0"/>' +
            // ventana: aro dorado y cristal (sin piloto: Zeus no se dibuja)
            '<circle cx="136" cy="63" r="27" fill="url(#aro)" stroke="#a87400" stroke-width="2"/>' +
            '<circle cx="136" cy="63" r="21" fill="url(#cristal)"/>' +
            // aleta de adelante (cercana)
            '<path d="M66,84 L40,122 Q36,130 48,126 L102,94 Z" fill="url(#ala)" stroke="#7c121a" stroke-width="2"/>' +
            '<path d="M58,100 L48,118" stroke="#ffb3b3" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
            // estrella PedNia en el cuerpo
            '<path d="M104,56 l3,6 7,1 -5,5 1,7 -6,-3 -6,3 1,-7 -5,-5 7,-1 z" fill="#ffd43b" stroke="#e8a200" stroke-width="1.2"/>' +
            '</svg>',

        vidrio:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">' +
            '<circle cx="30" cy="30" r="21" fill="#9ee7ff" opacity=".16"/>' +
            '<path d="M16,24 Q20,13 32,11" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>' +
            '<circle cx="40" cy="17" r="2.6" fill="#fff" opacity=".8"/>' +
            '<path d="M44,36 Q42,44 34,48" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".45"/>' +
            '</svg>',

        llama:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 70">' +
            '<defs>' +
            '<linearGradient id="fuera" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffd43b"/><stop offset=".45" stop-color="#ff922b"/><stop offset=".85" stop-color="#f03e3e" stop-opacity=".7"/><stop offset="1" stop-color="#f03e3e" stop-opacity="0"/></linearGradient>' +
            '<linearGradient id="medio" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff9db"/><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="#ffa94d" stop-opacity="0"/></linearGradient>' +
            '</defs>' +
            '<path d="M150,10 Q96,6 40,22 Q4,35 40,48 Q96,64 150,60 Z" fill="url(#fuera)"/>' +
            '<path d="M150,20 Q110,18 74,28 Q52,35 74,42 Q110,52 150,50 Z" fill="url(#medio)"/>' +
            '<path d="M150,27 Q128,27 112,32 Q104,35 112,38 Q128,43 150,43 Z" fill="#ffffff" opacity=".95"/>' +
            '</svg>',

        plataforma:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 130">' +
            '<defs>' +
            '<linearGradient id="lado" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b2f8f"/><stop offset=".5" stop-color="#5f4bd8"/><stop offset="1" stop-color="#2a206e"/></linearGradient>' +
            '<radialGradient id="tapa" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#9fb4ff"/><stop offset=".7" stop-color="#5a6fe0"/><stop offset="1" stop-color="#3a4bb8"/></radialGradient>' +
            '</defs>' +
            '<ellipse cx="120" cy="104" rx="112" ry="22" fill="#000" opacity=".3"/>' +
            '<path d="M14,58 L14,88 Q120,128 226,88 L226,58 Z" fill="url(#lado)"/>' +
            '<path d="M14,74 Q120,112 226,74" fill="none" stroke="#ffd43b" stroke-width="5" stroke-dasharray="16 12"/>' +
            '<ellipse cx="120" cy="58" rx="106" ry="32" fill="url(#tapa)" stroke="#c5d0ff" stroke-width="3"/>' +
            '<ellipse cx="120" cy="58" rx="70" ry="20" fill="none" stroke="#ffffff" stroke-width="3" opacity=".6" stroke-dasharray="10 8"/>' +
            '<path d="M104,50 L120,40 L136,50 L120,60 Z" fill="#ffd43b" opacity=".9"/>' +
            '<circle cx="30" cy="62" r="5" fill="#7cf3ff"/><circle cx="210" cy="62" r="5" fill="#7cf3ff"/>' +
            '<circle cx="66" cy="80" r="5" fill="#ff8fc7"/><circle cx="174" cy="80" r="5" fill="#ff8fc7"/><circle cx="120" cy="88" r="5" fill="#ffe066"/>' +
            '</svg>',

        // Estación lunar con hangar: el hueco del hangar (x 22-162, y 110-200) es transparente; el interior va en
        // "hangar" (debajo del cohete) y las persianas encima. Origen en la escena: borde izquierdo del hueco (22, 155).
        estacion:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 240">' +
            '<defs>' +
            '<radialGradient id="cupula" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#e3f6ff"/><stop offset=".55" stop-color="#7fc8ff"/><stop offset="1" stop-color="#2f6fc0"/></radialGradient>' +
            '<radialGradient id="cupula2" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffe3f3"/><stop offset=".55" stop-color="#ff9bd0"/><stop offset="1" stop-color="#b8326f"/></radialGradient>' +
            '<linearGradient id="muro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f7ff"/><stop offset=".6" stop-color="#c9cff0"/><stop offset="1" stop-color="#8e97c8"/></linearGradient>' +
            '<linearGradient id="lado" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".15" stop-color="#000" stop-opacity="0"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>' +
            '</defs>' +
            // antenas y cúpulas del techo
            '<path d="M226,50 L238,10" stroke="#c0c8e8" stroke-width="5" stroke-linecap="round"/>' +
            '<path d="M222,12 Q238,-2 254,12 Q238,22 222,12 Z" fill="#e9ecff" stroke="#8f99c9" stroke-width="3"/>' +
            '<path d="M60,82 L54,38" stroke="#c0c8e8" stroke-width="5" stroke-linecap="round"/><circle cx="53" cy="34" r="7" fill="#ff6b6b"/>' +
            '<path d="M28,84 Q92,22 156,84 Z" fill="url(#cupula2)" stroke="#8a1442" stroke-width="3"/>' +
            '<path d="M168,84 Q216,36 264,84 Z" fill="url(#cupula)" stroke="#1f4f9a" stroke-width="3"/>' +
            '<path d="M52,70 Q66,48 92,44" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".65"/>' +
            '<path d="M186,72 Q196,54 216,50" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".65"/>' +
            // edificio con el hueco del hangar (evenodd: el hueco queda transparente)
            '<path fill-rule="evenodd" d="M6,98 Q6,80 24,80 L248,80 Q266,80 266,98 L266,214 L6,214 Z M22,110 L162,110 L162,200 L22,200 Z" fill="url(#muro)" stroke="#6b74a8" stroke-width="3"/>' +
            '<path fill-rule="evenodd" d="M6,98 Q6,80 24,80 L248,80 Q266,80 266,98 L266,214 L6,214 Z M22,110 L162,110 L162,200 L22,200 Z" fill="url(#lado)"/>' +
            // marco del hangar con franjas de aviso y luces
            '<rect x="17" y="105" width="150" height="100" rx="6" fill="none" stroke="#2b2f5e" stroke-width="5"/>' +
            '<rect x="17" y="105" width="150" height="100" rx="6" fill="none" stroke="#ffd43b" stroke-width="4" stroke-dasharray="11 9"/>' +
            '<g fill="#7cf3ff"><circle cx="30" cy="96" r="4.5"/><circle cx="62" cy="96" r="4.5"/><circle cx="94" cy="96" r="4.5"/><circle cx="126" cy="96" r="4.5"/><circle cx="154" cy="96" r="4.5"/></g>' +
            // letrero y ventanas
            '<rect x="174" y="96" width="84" height="26" rx="10" fill="#1d2a6b" stroke="#7cf3ff" stroke-width="3"/>' +
            '<text x="216" y="115" text-anchor="middle" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="16" fill="#ffe066">PEDNIA</text>' +
            '<circle cx="196" cy="150" r="11" fill="#ffe066" stroke="#6b74a8" stroke-width="3"/><circle cx="236" cy="150" r="11" fill="#7cf3ff" stroke="#6b74a8" stroke-width="3"/>' +
            '<path d="M190,145 Q194,140 200,140" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<rect x="182" y="174" width="70" height="10" rx="5" fill="#9aa3cf"/>' +
            // base con luces
            '<path d="M0,212 L270,212 L258,236 L12,236 Z" fill="#4c3fb5" stroke="#2c2380" stroke-width="3"/>' +
            '<g fill="#7cf3ff"><circle cx="34" cy="224" r="5"/><circle cx="84" cy="224" r="5"/><circle cx="186" cy="224" r="5"/><circle cx="236" cy="224" r="5"/></g>' +
            '<g fill="#ff8fc7"><circle cx="59" cy="224" r="5"/><circle cx="135" cy="224" r="5"/><circle cx="211" cy="224" r="5"/></g>' +
            '</svg>',

        // Interior del hangar (exactamente el hueco: 140 × 90): fondo oscuro con perspectiva y luces.
        hangar:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 90">' +
            '<defs>' +
            '<radialGradient id="fondo" cx=".7" cy=".45" r=".8"><stop offset="0" stop-color="#3b3f8f"/><stop offset=".6" stop-color="#1a1d52"/><stop offset="1" stop-color="#090b2a"/></radialGradient>' +
            '<linearGradient id="piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2e6e"/><stop offset="1" stop-color="#14174a"/></linearGradient>' +
            '</defs>' +
            '<rect width="140" height="90" fill="url(#fondo)"/>' +
            // pared del fondo (más chica: da profundidad) y piso en perspectiva
            '<rect x="30" y="18" width="104" height="50" fill="#22266a" stroke="#4c55b8" stroke-width="1.5"/>' +
            '<path d="M0,0 L30,18 M140,0 L134,18 M0,90 L30,68 M140,90 L134,68" stroke="#4c55b8" stroke-width="1.5"/>' +
            '<path d="M0,90 L30,68 L134,68 L140,90 Z" fill="url(#piso)"/>' +
            '<path d="M20,82 L130,82 M34,74 L132,74" stroke="#ffd43b" stroke-width="1.6" stroke-dasharray="6 6" opacity=".7"/>' +
            '<g fill="#7cf3ff" opacity=".9"><circle cx="44" cy="24" r="2.5"/><circle cx="66" cy="24" r="2.5"/><circle cx="88" cy="24" r="2.5"/><circle cx="110" cy="24" r="2.5"/></g>' +
            '<ellipse cx="84" cy="44" rx="40" ry="16" fill="#7cf3ff" opacity=".08"/>' +
            '</svg>',

        // Persiana del hangar (mitad del hueco: 140 × 45). La de abajo es la misma volteada.
        persiana:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 45">' +
            '<defs><linearGradient id="lam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1ff"/><stop offset=".55" stop-color="#c3c9ee"/><stop offset="1" stop-color="#8f99c9"/></linearGradient>' +
            '<pattern id="aviso" width="14" height="8" patternUnits="userSpaceOnUse" patternTransform="skewX(-35)"><rect width="7" height="8" fill="#ffd43b"/><rect x="7" width="7" height="8" fill="#2b2f5e"/></pattern></defs>' +
            '<rect width="140" height="45" fill="url(#lam)"/>' +
            '<g stroke="#8f99c9" stroke-width="1.6"><path d="M0,9 H140 M0,18 H140 M0,27 H140"/></g>' +
            '<rect y="35" width="140" height="10" fill="url(#aviso)"/>' +
            '<rect width="140" height="45" fill="none" stroke="#6b74a8" stroke-width="2"/>' +
            '</svg>',

        // Cohete visto de frente (mitad del giro 3D): cuerpo redondo, punta roja al centro, aletas arriba y abajo.
        coheteFrente:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">' +
            '<defs>' +
            '<radialGradient id="cu" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#d9dfef"/><stop offset="1" stop-color="#7d8bb0"/></radialGradient>' +
            '<radialGradient id="pu" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#ffb3b3"/><stop offset=".5" stop-color="#f03e3e"/><stop offset="1" stop-color="#9c1820"/></radialGradient>' +
            '<linearGradient id="al" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7070"/><stop offset="1" stop-color="#a51d24"/></linearGradient>' +
            '</defs>' +
            '<path d="M62,40 L64,4 Q70,0 76,4 L78,40 Z" fill="url(#al)" stroke="#7c121a" stroke-width="2"/>' +
            '<path d="M60,100 L58,136 Q70,142 82,136 L80,100 Z" fill="url(#al)" stroke="#7c121a" stroke-width="2"/>' +
            '<circle cx="70" cy="70" r="33" fill="url(#cu)" stroke="#5c6a90" stroke-width="2.5"/>' +
            '<circle cx="70" cy="70" r="22" fill="url(#pu)" stroke="#7c121a" stroke-width="1.5"/>' +
            '<circle cx="70" cy="70" r="7" fill="#ff8a8a"/>' +
            '<circle cx="64" cy="63" r="4" fill="#fff" opacity=".85"/>' +
            '<path d="M48,56 Q54,44 66,40" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>' +
            '<path d="M101,62 Q104,70 101,78" fill="none" stroke="#ffd43b" stroke-width="4" stroke-linecap="round"/>' +
            '</svg>',

        compuerta:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 66">' +
            '<defs><linearGradient id="hoja" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c7cdf0"/><stop offset=".5" stop-color="#eef1ff"/><stop offset="1" stop-color="#9aa3cf"/></linearGradient></defs>' +
            '<rect x="0" y="0" width="26" height="66" rx="5" fill="url(#hoja)" stroke="#6b74a8" stroke-width="2"/>' +
            '<rect x="6" y="10" width="14" height="6" rx="3" fill="#ffd43b"/>' +
            '<rect x="6" y="50" width="14" height="6" rx="3" fill="#ffd43b"/>' +
            '</svg>',

        luna:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">' +
            '<defs>' +
            '<radialGradient id="sup" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#fbfaff"/><stop offset=".5" stop-color="#d6d2ee"/><stop offset=".85" stop-color="#9690c4"/><stop offset="1" stop-color="#6c64a6"/></radialGradient>' +
            '<radialGradient id="crater" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#b7b1dc"/><stop offset="1" stop-color="#8e86c0"/></radialGradient>' +
            '<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset=".7" stop-color="#bfe6ff" stop-opacity=".5"/><stop offset="1" stop-color="#bfe6ff" stop-opacity="0"/></radialGradient>' +
            '</defs>' +
            '<circle cx="160" cy="160" r="160" fill="url(#halo)"/>' +
            '<circle cx="160" cy="160" r="130" fill="url(#sup)"/>' +
            '<ellipse cx="110" cy="120" rx="26" ry="20" fill="url(#crater)"/><ellipse cx="200" cy="200" rx="34" ry="26" fill="url(#crater)"/>' +
            '<ellipse cx="96" cy="210" rx="16" ry="12" fill="url(#crater)"/><ellipse cx="214" cy="110" rx="14" ry="11" fill="url(#crater)"/>' +
            '<ellipse cx="160" cy="250" rx="20" ry="10" fill="url(#crater)" opacity=".8"/>' +
            '<path d="M70,110 Q90,60 150,48" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".55"/>' +
            '</svg>',

        base:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 380">' +
            '<defs>' +
            '<radialGradient id="cup" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#e8fbff"/><stop offset=".5" stop-color="#7fe0ff"/><stop offset="1" stop-color="#2d7ec9"/></radialGradient>' +
            '<radialGradient id="cupr" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff0f8"/><stop offset=".5" stop-color="#ff9bd0"/><stop offset="1" stop-color="#c2255c"/></radialGradient>' +
            '<linearGradient id="mur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#a3abd8"/></linearGradient>' +
            '<linearGradient id="roca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4aee0"/><stop offset="1" stop-color="#5b5398"/></linearGradient>' +
            '<linearGradient id="pista" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e7bea"/><stop offset="1" stop-color="#36409e"/></linearGradient>' +
            '</defs>' +
            // asteroide grande que sostiene la base
            '<path d="M20,290 Q40,240 120,236 L460,232 Q540,240 548,296 Q530,360 420,372 L140,374 Q36,360 20,290 Z" fill="url(#roca)" stroke="#463e85" stroke-width="4"/>' +
            '<ellipse cx="140" cy="320" rx="30" ry="14" fill="#8a82c4"/><ellipse cx="400" cy="336" rx="40" ry="16" fill="#8a82c4"/>' +
            // torre y antena
            '<rect x="402" y="70" width="34" height="168" rx="10" fill="url(#mur)" stroke="#6b74a8" stroke-width="3"/>' +
            '<path d="M419,70 L419,24" stroke="#c0c8e8" stroke-width="6"/><circle cx="419" cy="20" r="11" fill="#ff6b6b"/>' +
            '<path d="M380,58 Q419,30 458,58 Q419,72 380,58 Z" fill="#eef1ff" stroke="#8f99c9" stroke-width="3"/>' +
            // cúpulas
            '<path d="M60,238 Q60,140 150,140 Q240,140 240,238 Z" fill="url(#cup)" stroke="#1f4f9a" stroke-width="4"/>' +
            '<path d="M440,238 Q440,170 494,170 Q548,170 548,238 Z" fill="url(#cupr)" stroke="#8a1442" stroke-width="4"/>' +
            '<path d="M86,200 Q96,160 140,154" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".65"/>' +
            // edificio central con letrero
            '<rect x="214" y="120" width="176" height="118" rx="16" fill="url(#mur)" stroke="#6b74a8" stroke-width="4"/>' +
            '<path d="M204,128 Q302,50 400,128 Z" fill="#7048e8" stroke="#3b2a8f" stroke-width="4"/>' +
            '<rect x="226" y="84" width="152" height="34" rx="14" fill="#1d2a6b" stroke="#ffd43b" stroke-width="4"/>' +
            '<text x="302" y="108" text-anchor="middle" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="20" fill="#ffe066">BASE DE ZEUS</text>' +
            // puerta grande (las compuertas van encima)
            '<rect x="272" y="150" width="60" height="88" rx="12" fill="#141c4d"/>' +
            '<rect x="276" y="154" width="52" height="80" rx="10" fill="#fff3bf"/>' +
            '<circle cx="240" cy="160" r="11" fill="#ffe066" stroke="#6b74a8" stroke-width="3"/><circle cx="364" cy="160" r="11" fill="#7cf3ff" stroke="#6b74a8" stroke-width="3"/>' +
            // plataforma de aterrizaje a la izquierda
            '<path d="M0,232 L200,232 L190,250 L10,250 Z" fill="url(#pista)" stroke="#2c2380" stroke-width="3"/>' +
            '<path d="M24,241 L176,241" stroke="#ffd43b" stroke-width="4" stroke-dasharray="14 10"/>' +
            '<g fill="#7cf3ff"><circle cx="20" cy="232" r="5"/><circle cx="100" cy="232" r="5"/><circle cx="180" cy="232" r="5"/></g>' +
            '<g fill="#ff8fc7"><circle cx="230" cy="238" r="6"/><circle cx="374" cy="238" r="6"/><circle cx="460" cy="238" r="6"/><circle cx="530" cy="238" r="6"/></g>' +
            '</svg>',

        planetaAnillo:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">' +
            '<defs><radialGradient id="p" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#fff1c2"/><stop offset=".5" stop-color="#ffb347"/><stop offset="1" stop-color="#c25b12"/></radialGradient>' +
            '<linearGradient id="a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b197fc" stop-opacity=".2"/><stop offset=".5" stop-color="#e5dbff"/><stop offset="1" stop-color="#b197fc" stop-opacity=".2"/></linearGradient></defs>' +
            '<path d="M14,92 Q120,46 226,70" fill="none" stroke="url(#a)" stroke-width="14" stroke-linecap="round"/>' +
            '<circle cx="120" cy="80" r="56" fill="url(#p)"/>' +
            '<path d="M70,70 Q120,58 170,72" fill="none" stroke="#e8590c" stroke-width="7" opacity=".35"/>' +
            '<path d="M68,96 Q120,86 172,98" fill="none" stroke="#e8590c" stroke-width="6" opacity=".3"/>' +
            '<path d="M226,70 Q150,120 14,92" fill="none" stroke="url(#a)" stroke-width="14" stroke-linecap="round" stroke-dasharray="0 120 400"/>' +
            '<path d="M86,52 Q100,38 124,36" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/>' +
            '</svg>',

        planetaRayas:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">' +
            '<defs><radialGradient id="p" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#d0f4ff"/><stop offset=".5" stop-color="#4dabf7"/><stop offset="1" stop-color="#1c4fa0"/></radialGradient>' +
            '<clipPath id="c"><circle cx="80" cy="80" r="66"/></clipPath></defs>' +
            '<circle cx="80" cy="80" r="66" fill="url(#p)"/>' +
            '<g clip-path="url(#c)" opacity=".45"><path d="M0,58 Q80,44 160,62" stroke="#a5f3fc" stroke-width="12" fill="none"/><path d="M0,96 Q80,84 160,100" stroke="#1864ab" stroke-width="14" fill="none"/><path d="M0,124 Q80,116 160,128" stroke="#a5f3fc" stroke-width="8" fill="none"/></g>' +
            '<path d="M40,52 Q54,30 82,26" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".7"/>' +
            '</svg>',

        planetaLava:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">' +
            '<defs><radialGradient id="p" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#ffd8f0"/><stop offset=".5" stop-color="#f06595"/><stop offset="1" stop-color="#7a1846"/></radialGradient></defs>' +
            '<circle cx="70" cy="70" r="58" fill="url(#p)"/>' +
            '<ellipse cx="50" cy="80" rx="14" ry="9" fill="#c2255c" opacity=".55"/><ellipse cx="88" cy="96" rx="10" ry="7" fill="#c2255c" opacity=".5"/><ellipse cx="92" cy="56" rx="8" ry="6" fill="#c2255c" opacity=".45"/>' +
            '<path d="M34,52 Q46,30 72,26" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/>' +
            '</svg>',

        planetaHielo:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
            '<defs><radialGradient id="p" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#f4fff0"/><stop offset=".5" stop-color="#69db7c"/><stop offset="1" stop-color="#1f7a3a"/></radialGradient></defs>' +
            '<circle cx="60" cy="60" r="48" fill="url(#p)"/>' +
            '<path d="M30,66 Q44,58 52,68 Q62,80 78,70" fill="none" stroke="#2b8a3e" stroke-width="7" stroke-linecap="round" opacity=".5"/>' +
            '<path d="M30,42 Q40,24 62,22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".7"/>' +
            '</svg>',

        asteroide:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90">' +
            '<defs><radialGradient id="r" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#d8cdb8"/><stop offset=".55" stop-color="#9c8f78"/><stop offset="1" stop-color="#5a5040"/></radialGradient></defs>' +
            '<path d="M14,40 Q10,18 34,12 Q52,4 70,14 Q92,22 90,46 Q94,70 70,80 Q46,90 26,76 Q8,64 14,40 Z" fill="url(#r)" stroke="#4a4234" stroke-width="2.5"/>' +
            '<ellipse cx="40" cy="36" rx="9" ry="7" fill="#7d715c"/><ellipse cx="64" cy="58" rx="11" ry="8" fill="#7d715c"/><ellipse cx="36" cy="62" rx="6" ry="5" fill="#7d715c"/>' +
            '<path d="M26,28 Q34,18 48,16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>' +
            '</svg>',

        estrella:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
            '<defs><radialGradient id="e" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#ffd43b"/><stop offset="1" stop-color="#f59f00"/></radialGradient></defs>' +
            '<path d="M50,6 L62,36 L94,38 L69,58 L78,90 L50,72 L22,90 L31,58 L6,38 L38,36 Z" fill="url(#e)" stroke="#e67700" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M40,30 L50,14" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>' +
            '</svg>'
    };

    global.IconosCohete = { SVG: SVG };
})(window);
