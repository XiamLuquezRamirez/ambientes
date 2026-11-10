/**
 * Personajes — dibujo SVG de las piezas de Zoe y Zeus en ropa deportiva, de perfil (miran a la derecha).
 *
 * Cada pieza se dibuja en coordenadas locales con el pivote (la articulación) en (0, 0), en la misma
 * escala del esqueleto de Posturas. Devuelve dos capas de texto SVG:
 *   base     formas que dan la silueta (class="pz-forma"): se reutilizan para la sombra, el contorno
 *            neón y la silueta oscura cambiando el relleno por CSS.
 *   detalle  ojos, costuras, números, cordones… (solo en la pieza a color).
 * Sin dependencias: lo usan piezas.js, la presentación del estadio y la escena final.
 */
(function (global) {
    "use strict";

    var PALETAS = {
        zeus: {
            piel: "#f3c6b6", pielSombra: "#e5a796", mejilla: "#f29a8e",
            pelo: "#7d3f1b", peloOscuro: "#5b2c11",
            camiseta: "#2f8f70", camisetaOscura: "#24735a", camisetaClara: "#8fd07f",
            short: "#0a5677", shortOscuro: "#06405a",
            media: "#ffffff", rayaMedia: "#c7d0db",
            numero: "#ffe08a", numeroBorde: "#f2b632"
        },
        zoe: {
            piel: "#f5c9a8", pielSombra: "#e3a585", mejilla: "#f59aa0",
            pelo: "#4a2a1a", peloOscuro: "#2e1a10",
            camiseta: "#e64980", camisetaOscura: "#c2255c", camisetaClara: "#ffc9de",
            short: "#5f3dc4", shortOscuro: "#45289e",
            media: "#ffffff", rayaMedia: "#d6cff5",
            numero: "#ffe066", numeroBorde: "#f59f00",
            cinta: "#ffd43b"
        }
    };

    /** Colores de lateralidad (los mismos de Lateralidad y del Espejo): izquierda amarillo, derecha verde. */
    var LADOS = {
        izq: { tenis: "#ffd43b", tenisOscuro: "#e0a800", nombre: "izquierdo" },
        der: { tenis: "#51cf66", tenisOscuro: "#2b9a44", nombre: "derecho" }
    };

    function paleta(pj) {
        return PALETAS[pj] || PALETAS.zoe;
    }

    function f(color) {
        return ' class="pz-forma" fill="' + color + '"';
    }

    // ------------------------------------------------------------------ cabeza

    function cabeza(pj) {
        var c = paleta(pj);
        var base = "";
        var det = "";
        // Cuello (entra en el tronco); cara de perfil de tres cuartos mirando a la derecha.
        base += '<rect' + f(c.piel) + ' x="-8" y="-22" width="16" height="26" rx="6"/>';
        if (pj === "zoe") {
            // Cola de caballo detrás de la cabeza.
            base += '<path' + f(c.pelo) + ' d="M-22,-62 Q-52,-68 -58,-44 Q-63,-22 -50,-8 Q-45,-6 -46,-13 Q-52,-32 -40,-45 Q-33,-52 -20,-50 Z"/>';
        }
        base += '<circle' + f(c.piel) + ' cx="4" cy="-48" r="31"/>';
        base += '<path' + f(c.piel) + ' d="M33,-46 Q42,-41 35,-35 Z"/>';
        if (pj === "zoe") {
            base += '<path' + f(c.pelo) + ' d="M-27,-40 C-31,-72 -8,-85 10,-82 C28,-80 38,-67 36,-55 C28,-61 16,-64 6,-62 C-4,-60 -12,-55 -15,-46 L-17,-36 Z"/>';
        } else {
            base += '<path' + f(c.pelo) + ' d="M-27,-42 C-30,-71 -10,-85 10,-83 C27,-82 37,-71 37,-58 C31,-62 25,-62 21,-66 C17,-60 9,-62 5,-66 C1,-60 -7,-60 -11,-62 C-13,-55 -15,-49 -17,-41 Z"/>';
            base += '<path' + f(c.pelo) + ' d="M-4,-82 Q0,-95 11,-90 Q5,-88 7,-83 Z"/>';
        }
        base += '<ellipse' + f(c.piel) + ' cx="-7" cy="-45" rx="7" ry="9"/>';
        det += '<path fill="none" stroke="' + c.pielSombra + '" stroke-width="2.4" stroke-linecap="round" d="M-9,-50 Q-3,-46 -7,-40"/>';
        if (pj === "zoe") {
            det += '<path fill="none" stroke="' + c.cinta + '" stroke-width="7" stroke-linecap="round" d="M-19,-69 Q4,-85 31,-71"/>';
            det += '<circle cx="-24" cy="-57" r="6.5" fill="' + c.cinta + '" stroke="#e0a800" stroke-width="1.6"/>';
            det += '<path fill="none" stroke="' + c.peloOscuro + '" stroke-width="2" stroke-linecap="round" opacity=".6" d="M-46,-40 Q-52,-26 -48,-14 M-38,-52 Q-48,-50 -52,-36"/>';
        } else {
            det += '<path fill="none" stroke="' + c.peloOscuro + '" stroke-width="2" stroke-linecap="round" opacity=".65" d="M-18,-72 Q-2,-81 16,-77 M-6,-80 Q10,-86 26,-74"/>';
            // Cinta deportiva en la frente
            det += '<path fill="none" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" d="M-24,-55 Q6,-70 35,-62"/>';
            det += '<path fill="none" stroke="' + c.camisetaClara + '" stroke-width="2.4" stroke-linecap="round" d="M-22,-55 Q6,-69 34,-62"/>';
        }
        // Cejas, ojos (el lejano más angosto), nariz, mejilla y boca de esfuerzo alegre.
        det += '<path fill="none" stroke="' + c.peloOscuro + '" stroke-width="3" stroke-linecap="round" d="M9,-57 Q12,-59.5 15,-57 M21,-58 Q26,-61.5 31,-57.5"/>';
        det += '<g class="pz-ojos">' +
            '<ellipse cx="12.5" cy="-48" rx="3.8" ry="5.8" fill="#fff"/>' +
            '<ellipse cx="25.5" cy="-48" rx="5" ry="6.4" fill="#fff"/>' +
            '<circle cx="13.8" cy="-47.2" r="2.7" fill="#2a1712"/>' +
            '<circle cx="27" cy="-47.2" r="3.4" fill="#2a1712"/>' +
            '<circle cx="14.6" cy="-48.8" r="1" fill="#fff"/>' +
            '<circle cx="28.2" cy="-49" r="1.3" fill="#fff"/>' +
            "</g>";
        if (pj === "zoe") {
            det += '<path fill="none" stroke="#2a1712" stroke-width="1.8" stroke-linecap="round" d="M29,-53.5 L33,-56.5 M30.5,-51 L35,-53"/>';
        }
        det += '<path fill="none" stroke="' + c.pielSombra + '" stroke-width="2.2" stroke-linecap="round" d="M35,-44 Q39,-40.5 34.5,-37.5"/>';
        det += '<ellipse cx="25" cy="-35" rx="5.4" ry="3.4" fill="' + c.mejilla + '" opacity=".55"/>';
        det += '<path fill="#a9443a" d="M19,-31 Q26.5,-21 33,-30.5 Q26.5,-27.6 19,-31 Z"/>';
        det += '<path fill="#fff" d="M20.6,-30.4 Q26.5,-28.3 31.6,-29.9 L31.1,-28.1 Q26.5,-26.6 21.3,-28.7 Z"/>';
        return { base: base, detalle: det };
    }

    // ------------------------------------------------------------------ tronco

    function tronco(pj) {
        var c = paleta(pj);
        var base = "";
        var det = "";
        base += '<path' + f(c.camiseta) + ' d="M-21,-14 L-23,-72 Q-22,-90 -2,-92 L10,-92 Q27,-90 27,-72 L25,-14 Z"/>';
        base += '<path' + f(c.short) + ' d="M-24,-26 L26,-26 L27,4 Q2,11 -25,4 Z"/>';
        det += '<path fill="' + c.camisetaOscura + '" opacity=".55" d="M-21,-14 L-23,-72 Q-22,-84 -14,-88 Q-16,-60 -12,-16 Z"/>';
        det += '<path fill="none" stroke="' + c.camisetaClara + '" stroke-width="5" stroke-linecap="round" d="M-3,-91 Q5,-82 13,-91"/>';
        // Dorsal con rayo de atleta
        det += '<rect x="-5" y="-66" width="26" height="24" rx="5" fill="#ffffff" stroke="' + c.camisetaOscura + '" stroke-width="1.6"/>';
        det += '<path fill="' + c.numero + '" stroke="' + c.numeroBorde + '" stroke-width="1.4" stroke-linejoin="round" d="M10,-63 L3,-53 L8,-53 L5,-45 L14,-56 L9,-56 L12,-63 Z"/>';
        det += '<rect x="-24" y="-28" width="50" height="6" rx="2" fill="' + c.shortOscuro + '"/>';
        det += '<path fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" d="M20,-20 L22,2"/>';
        return { base: base, detalle: det };
    }

    // ------------------------------------------------------------------ brazos

    function brazoSimple(c, forma) {
        var base = "";
        var det = "";
        base += '<circle' + f(c.camiseta) + ' cx="0" cy="0" r="11.5"/>';
        base += '<rect' + f(c.camiseta) + ' x="-11.5" y="0" width="23" height="21" rx="4"/>';
        if (forma === "flexionado") {
            base += '<rect' + f(c.piel) + ' x="-7.6" y="14" width="15.2" height="47" rx="7.6"/>';
            base += '<rect' + f(c.piel) + ' x="-6" y="46.5" width="50" height="15" rx="7.5"/>';
            base += '<circle' + f(c.piel) + ' cx="50" cy="54" r="10"/>';
            det += '<path fill="none" stroke="' + c.pielSombra + '" stroke-width="2" stroke-linecap="round" d="M48,47 Q54,48 56,52 M44,51 Q48,52 49,56"/>';
            det += '<rect x="33" y="45.8" width="7" height="16.4" rx="2.5" fill="#ffffff" opacity=".9"/>';
        } else {
            base += '<rect' + f(c.piel) + ' x="-7.6" y="14" width="15.2" height="88" rx="7.6"/>';
            base += '<circle' + f(c.piel) + ' cx="0" cy="105" r="10"/>';
            det += '<path fill="none" stroke="' + c.pielSombra + '" stroke-width="2" stroke-linecap="round" d="M-3,56 Q0,59 3,56 M3,102 Q8,105 6,111"/>';
            det += '<rect x="-8.2" y="84" width="16.4" height="7" rx="2.5" fill="#ffffff" opacity=".9"/>';
        }
        det += '<path fill="' + c.camisetaClara + '" d="M-11.5,16 L11.5,16 L11.5,21 Q0,24 -11.5,21 Z"/>';
        return { base: base, detalle: det };
    }

    function brazo(pj, forma, doble) {
        var c = paleta(pj);
        var uno = brazoSimple(c, forma);
        if (!doble) return uno;
        // Brazos juntos (de perfil se ven superpuestos): el de atrás un poco desplazado y más oscuro.
        var atras = brazoSimple(c, forma);
        return {
            base: '<g transform="translate(-7,-3)">' + atras.base + "</g>" + uno.base,
            detalle: '<g transform="translate(-7,-3)" class="pz-atras">' + atras.detalle + "</g>" + uno.detalle,
            atras: true
        };
    }

    // ------------------------------------------------------------------ piernas

    function pierna(pj, forma) {
        var c = paleta(pj);
        var base = "";
        var det = "";
        base += '<circle' + f(c.short) + ' cx="0" cy="0" r="13.5"/>';
        base += '<rect' + f(c.short) + ' x="-13.5" y="0" width="27" height="25" rx="4"/>';
        if (forma === "doblada") {
            base += '<rect' + f(c.piel) + ' x="-9.6" y="16" width="19.2" height="56" rx="9.6"/>';
            base += '<rect' + f(c.piel) + ' x="-50" y="54.4" width="58" height="19.2" rx="9.6"/>';
            base += '<rect' + f(c.media) + ' x="-66" y="53.6" width="22" height="20.8" rx="6"/>';
            det += '<path fill="none" stroke="' + c.pielSombra + '" stroke-width="2.2" stroke-linecap="round" d="M3,58 Q8,64 3,70"/>';
            det += '<rect x="-58" y="53.6" width="4" height="20.8" fill="' + c.rayaMedia + '"/>';
        } else {
            base += '<rect' + f(c.piel) + ' x="-9.6" y="16" width="19.2" height="94" rx="9.6"/>';
            base += '<rect' + f(c.media) + ' x="-10.4" y="102" width="20.8" height="24" rx="6"/>';
            det += '<path fill="none" stroke="' + c.pielSombra + '" stroke-width="2.2" stroke-linecap="round" d="M3,60 Q7,64 3,69"/>';
            det += '<rect x="-10.4" y="108" width="20.8" height="4" fill="' + c.rayaMedia + '"/>';
        }
        det += '<rect x="-13.5" y="19" width="27" height="5" rx="2" fill="' + c.shortOscuro + '"/>';
        return { base: base, detalle: det };
    }

    // ------------------------------------------------------------------ tenis

    function tenis(lado) {
        var l = LADOS[lado] || LADOS.der;
        var base = "";
        var det = "";
        base += '<path' + f(l.tenis) + ' d="M-13,-7 Q-17,6 -14,14 L38,14 Q47,13 45,5 Q41,-1 27,-3 Q18,-5 12,-11 Q0,-15 -13,-7 Z"/>';
        base += '<rect' + f("#ffffff") + ' x="-16" y="11" width="63" height="8" rx="4"/>';
        det += '<rect x="-16" y="11" width="63" height="8" rx="4" fill="none" stroke="' + l.tenisOscuro + '" stroke-width="1.6"/>';
        det += '<path fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" d="M-6,6 Q10,10 24,0"/>';
        det += '<path fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" d="M6,-9 L10,-4 M12,-7 L16,-2 M18,-5 L22,0"/>';
        det += '<path fill="' + l.tenisOscuro + '" d="M-13,-7 Q-17,6 -14,14 L-9,14 Q-11,4 -8,-6 Z"/>';
        return { base: base, detalle: det };
    }

    /** Dibujo de una pieza: { base, detalle }. p = { tipo, forma, lado, doble }. */
    function dibujo(pj, p) {
        switch (p.tipo) {
            case "cabeza": return cabeza(pj);
            case "tronco": return tronco(pj);
            case "brazo": return brazo(pj, p.forma, p.doble);
            case "pierna": return pierna(pj, p.forma);
            case "tenis": return tenis(p.lado);
            default: return { base: "", detalle: "" };
        }
    }

    global.Personajes = {
        PALETAS: PALETAS,
        LADOS: LADOS,
        paleta: paleta,
        dibujo: dibujo,
        nombre: function (pj) { return pj === "zeus" ? "Zeus" : "Zoe"; }
    };
})(window);
