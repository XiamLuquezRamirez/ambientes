/**
 * JuguetesCanasta — todas las ilustraciones del juego, dibujadas en SVG aquí mismo
 * para que compartan un mismo estilo (volumen, brillo y sombra de suelo).
 *
 *   dibujar("coche")          -> juguete con forma propia
 *   dibujar("cubo:rojo")      -> forma del nivel 2, el color manda
 *   dibujar("caja:azul")      -> caja de cartón tintada
 */
(function (global) {
    "use strict";

    function svg(cuerpo, vista) {
        return '<svg viewBox="' + (vista || "0 0 200 200") + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + cuerpo + "</svg>";
    }

    function sombraSuelo(rx) {
        return '<ellipse cx="100" cy="176" rx="' + (rx || 48) + '" ry="8" fill="rgba(80,40,10,.18)"/>';
    }

    /* ---------------------------------------------------------- vehículos */

    /** Rueda de goma con tapacubos. Gris siempre: es el suelo del juguete, no su color. */
    function rueda(cx, cy, r) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#3a3f47"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.round(r * 0.58) + '" fill="#e9eef4"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.round(r * 0.24) + '" fill="#c3ccd6"/>' +
            '<circle cx="' + (cx - r * 0.3) + '" cy="' + (cy - r * 0.34) + '" r="' + Math.round(r * 0.16) + '" fill="#fff" opacity=".5"/>';
    }

    /**
     * Los juguetes del nivel 3 van de un solo color: el de su caja.
     * Cada uno se pinta con los tres tonos de la paleta (cara, lado en sombra y luz),
     * así tiene volumen sin dejar de leerse como «el juguete rojo».
     */
    function coche(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(70) +
            '<path d="M24 136c0-12 9-20 21-20h108c15 0 26 9 29 21l5 15c2 8-3 14-11 14H32c-9 0-16-8-13-17z" fill="' + c.lado + '"/>' +
            '<path d="M44 120c9-32 24-50 50-50h30c20 0 33 14 40 36l6 14H44z" fill="' + c.cara + '"/>' +
            '<path d="M50 112c8-26 20-40 42-42-16 10-24 24-28 42z" fill="' + c.tope + '" opacity=".75"/>' +
            '<path d="M80 84c7 8 9 22 7 32H64c3-16 7-26 16-32z" fill="' + c.tope + '"/>' +
            '<path d="M106 78h22c9 0 17 7 21 17l6 21h-49z" fill="' + c.tope + '"/>' +
            '<rect x="42" y="124" width="116" height="9" rx="4" fill="' + c.tope + '" opacity=".8"/>' +
            '<circle cx="176" cy="118" r="8" fill="' + c.tope + '"/>' +
            '<rect x="20" y="146" width="164" height="9" rx="4" fill="' + c.lado + '"/>' +
            rueda(60, 158, 25) + rueda(148, 158, 25)
        );
    }

    function camion(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(78) +
            '<rect x="96" y="86" width="88" height="62" rx="9" fill="' + c.lado + '"/>' +
            '<rect x="96" y="86" width="88" height="16" rx="8" fill="' + c.cara + '"/>' +
            '<rect x="106" y="110" width="68" height="28" rx="5" fill="' + c.tope + '" opacity=".75"/>' +
            '<path d="M18 104h62c7 0 12 5 12 12v32H22c-7 0-12-5-12-12v-20c0-7 3-12 8-12z" fill="' + c.cara + '"/>' +
            '<path d="M24 86h50c9 0 15 7 17 18H18v-6c0-7 3-12 6-12z" fill="' + c.lado + '"/>' +
            '<path d="M32 92h30c5 0 9 4 10 10H28z" fill="' + c.tope + '"/>' +
            '<circle cx="16" cy="124" r="7" fill="' + c.tope + '"/>' +
            '<rect x="10" y="140" width="84" height="8" rx="4" fill="' + c.lado + '"/>' +
            rueda(46, 158, 23) + rueda(126, 158, 23) + rueda(168, 158, 23)
        );
    }

    function tren(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(76) +
            '<rect x="20" y="104" width="62" height="44" rx="9" fill="' + c.lado + '"/>' +
            '<rect x="20" y="104" width="62" height="12" rx="6" fill="' + c.cara + '"/>' +
            '<rect x="30" y="122" width="18" height="18" rx="4" fill="' + c.tope + '"/>' +
            '<rect x="54" y="122" width="18" height="18" rx="4" fill="' + c.tope + '"/>' +
            '<rect x="82" y="128" width="12" height="7" rx="3" fill="' + c.lado + '"/>' +
            '<rect x="92" y="82" width="82" height="66" rx="11" fill="' + c.cara + '"/>' +
            '<rect x="92" y="82" width="82" height="14" rx="7" fill="' + c.tope + '" opacity=".8"/>' +
            '<rect x="104" y="58" width="48" height="30" rx="8" fill="' + c.lado + '"/>' +
            '<rect x="114" y="66" width="28" height="16" rx="4" fill="' + c.tope + '"/>' +
            '<rect x="40" y="86" width="18" height="22" rx="5" fill="' + c.lado + '"/>' +
            '<ellipse cx="49" cy="84" rx="12" ry="7" fill="' + c.cara + '"/>' +
            '<circle cx="49" cy="64" r="9" fill="#fff" opacity=".7"/>' +
            '<circle cx="62" cy="48" r="7" fill="#fff" opacity=".5"/>' +
            rueda(44, 158, 16) + rueda(112, 158, 18) + rueda(156, 158, 18)
        );
    }

    /* ------------------------------------------------------------ peluches */

    /** Osito de peluche. Ojos y hocico quedan oscuros: sin cara no se lee como oso. */
    function oso(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(52) +
            '<circle cx="62" cy="54" r="21" fill="' + c.lado + '"/>' +
            '<circle cx="62" cy="54" r="11" fill="' + c.tope + '"/>' +
            '<circle cx="138" cy="54" r="21" fill="' + c.lado + '"/>' +
            '<circle cx="138" cy="54" r="11" fill="' + c.tope + '"/>' +
            '<ellipse cx="100" cy="142" rx="50" ry="42" fill="' + c.cara + '"/>' +
            '<ellipse cx="100" cy="150" rx="31" ry="28" fill="' + c.tope + '"/>' +
            '<ellipse cx="62" cy="172" rx="20" ry="14" fill="' + c.lado + '"/>' +
            '<ellipse cx="62" cy="172" rx="11" ry="7" fill="' + c.tope + '"/>' +
            '<ellipse cx="138" cy="172" rx="20" ry="14" fill="' + c.lado + '"/>' +
            '<ellipse cx="138" cy="172" rx="11" ry="7" fill="' + c.tope + '"/>' +
            '<ellipse cx="48" cy="126" rx="16" ry="22" fill="' + c.lado + '" transform="rotate(-18 48 126)"/>' +
            '<ellipse cx="152" cy="126" rx="16" ry="22" fill="' + c.lado + '" transform="rotate(18 152 126)"/>' +
            '<circle cx="100" cy="86" r="46" fill="' + c.cara + '"/>' +
            '<ellipse cx="100" cy="104" rx="25" ry="19" fill="' + c.tope + '"/>' +
            '<ellipse cx="100" cy="94" rx="10" ry="7.5" fill="#4a2f1b"/>' +
            '<path d="M100 101v8M100 109c-5 0-8-3-9-6M100 109c5 0 8-3 9-6" stroke="#4a2f1b" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            '<circle cx="80" cy="80" r="7" fill="#33210f"/>' +
            '<circle cx="82.5" cy="77.5" r="2.6" fill="#fff"/>' +
            '<circle cx="120" cy="80" r="7" fill="#33210f"/>' +
            '<circle cx="122.5" cy="77.5" r="2.6" fill="#fff"/>'
        );
    }

    /** Conejo de peluche: orejas largas, el rasgo que lo distingue del oso. */
    function conejo(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(48) +
            '<ellipse cx="80" cy="42" rx="13" ry="36" fill="' + c.cara + '" transform="rotate(-10 80 42)"/>' +
            '<ellipse cx="80" cy="46" rx="6.5" ry="26" fill="' + c.tope + '" transform="rotate(-10 80 46)"/>' +
            '<ellipse cx="122" cy="42" rx="13" ry="36" fill="' + c.cara + '" transform="rotate(10 122 42)"/>' +
            '<ellipse cx="122" cy="46" rx="6.5" ry="26" fill="' + c.tope + '" transform="rotate(10 122 46)"/>' +
            '<ellipse cx="100" cy="146" rx="44" ry="38" fill="' + c.cara + '"/>' +
            '<ellipse cx="100" cy="152" rx="27" ry="25" fill="' + c.tope + '"/>' +
            '<ellipse cx="68" cy="174" rx="18" ry="12" fill="' + c.lado + '"/>' +
            '<ellipse cx="132" cy="174" rx="18" ry="12" fill="' + c.lado + '"/>' +
            '<ellipse cx="50" cy="132" rx="13" ry="19" fill="' + c.lado + '" transform="rotate(-16 50 132)"/>' +
            '<ellipse cx="150" cy="132" rx="13" ry="19" fill="' + c.lado + '" transform="rotate(16 150 132)"/>' +
            '<circle cx="100" cy="98" r="40" fill="' + c.cara + '"/>' +
            '<circle cx="85" cy="94" r="6" fill="#343a40"/>' +
            '<circle cx="87" cy="92" r="2.2" fill="#fff"/>' +
            '<circle cx="115" cy="94" r="6" fill="#343a40"/>' +
            '<circle cx="117" cy="92" r="2.2" fill="#fff"/>' +
            '<path d="M100 106l-7 5h14z" fill="' + c.lado + '"/>' +
            '<path d="M100 111v6M100 117c-4 0-7-2-8-5M100 117c4 0 7-2 8-5" stroke="' + c.lado + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="74" cy="106" rx="8" ry="5.5" fill="' + c.tope + '"/>' +
            '<ellipse cx="126" cy="106" rx="8" ry="5.5" fill="' + c.tope + '"/>'
        );
    }

    /** Muñeca de trapo: vestido y coletas. */
    function muneco(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(46) +
            '<rect x="78" y="146" width="16" height="32" rx="8" fill="' + c.tope + '"/>' +
            '<rect x="106" y="146" width="16" height="32" rx="8" fill="' + c.tope + '"/>' +
            '<ellipse cx="86" cy="180" rx="13" ry="8" fill="' + c.lado + '"/>' +
            '<ellipse cx="114" cy="180" rx="13" ry="8" fill="' + c.lado + '"/>' +
            '<path d="M68 150c0-30 10-46 32-46s32 16 32 46z" fill="' + c.cara + '"/>' +
            '<path d="M68 150c0-12 2-22 5-30h54c3 8 5 18 5 30z" fill="' + c.tope + '" opacity=".7"/>' +
            '<circle cx="86" cy="130" r="4" fill="#fff" opacity=".85"/>' +
            '<circle cx="114" cy="138" r="4" fill="#fff" opacity=".85"/>' +
            '<rect x="42" y="112" width="30" height="15" rx="7.5" fill="' + c.tope + '" transform="rotate(-22 57 119)"/>' +
            '<rect x="128" y="112" width="30" height="15" rx="7.5" fill="' + c.tope + '" transform="rotate(22 143 119)"/>' +
            '<circle cx="100" cy="68" r="44" fill="' + c.lado + '"/>' +
            '<circle cx="62" cy="86" r="16" fill="' + c.lado + '"/>' +
            '<circle cx="138" cy="86" r="16" fill="' + c.lado + '"/>' +
            '<circle cx="100" cy="74" r="35" fill="' + c.tope + '"/>' +
            '<path d="M65 68c2-24 16-38 35-38s33 14 35 38c-10-12-21-16-35-16s-25 4-35 16z" fill="' + c.cara + '"/>' +
            '<circle cx="88" cy="74" r="5.5" fill="#3b2a1a"/>' +
            '<circle cx="90" cy="72" r="2" fill="#fff"/>' +
            '<circle cx="112" cy="74" r="5.5" fill="#3b2a1a"/>' +
            '<circle cx="114" cy="72" r="2" fill="#fff"/>' +
            '<path d="M93 90c4 5 10 5 14 0" stroke="' + c.lado + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        );
    }

    /* ------------------------------------------------- pelota y bloque de madera */

    /**
     * Pelota de playa. Sin color va a gajos de colores, como una pelota de verdad
     * (nivel 1); con color, todos los gajos son tonos de ese color (nivel 3).
     */
    function pelota(color) {
        var gajos;
        if (PALETA[color]) {
            var c = PALETA[color];
            gajos = [c.cara, c.tope, c.lado, c.tope, c.cara, c.lado];
        } else {
            gajos = ["#fa5252", "#ffd43b", "#51cf66", "#4dabf7", "#e599f7", "#ff922b"];
        }
        var caminos = [
            "M100 42a62 62 0 0 1 44 18l-44 44z",
            "M144 60a62 62 0 0 1 18 44h-62z",
            "M162 104a62 62 0 0 1-18 44l-44-44z",
            "M144 148a62 62 0 0 1-44 18v-62z",
            "M100 166a62 62 0 0 1-44-18l44-44z",
            "M56 148a62 62 0 0 1-18-44h62z"
        ];
        var cuerpo = caminos.map(function (d, i) {
            return '<path d="' + d + '" fill="' + gajos[i] + '"/>';
        }).join("");
        return svg(
            sombraSuelo(42) +
            '<circle cx="100" cy="104" r="62" fill="#fff"/>' +
            cuerpo +
            '<circle cx="100" cy="104" r="14" fill="#fff"/>' +
            '<circle cx="100" cy="104" r="62" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="3"/>' +
            '<ellipse cx="76" cy="78" rx="18" ry="12" fill="#fff" opacity=".5" transform="rotate(-30 76 78)"/>'
        );
    }

    /** Cubo de construcción con una letra. */
    function madera(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(48) +
            '<path d="M100 36l62 30v62l-62 30-62-30V66z" fill="' + c.cara + '"/>' +
            '<path d="M100 36v122l-62-30V66z" fill="' + c.lado + '"/>' +
            '<path d="M100 36l62 30-62 28-62-28z" fill="' + c.tope + '"/>' +
            '<path d="M124 132l12-36 12 36M128 120h16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>'
        );
    }

    /* Tres tonos por color: cara (el tono que da nombre), lado en sombra y luz.
       Los cinco primeros son los del nivel 2; los tres últimos, las cajas del nivel 3. */
    var PALETA = {
        rojo: { cara: "#ff6b6b", lado: "#c92a2a", tope: "#ffc9c9" },
        azul: { cara: "#4dabf7", lado: "#1864ab", tope: "#a5d8ff" },
        amarillo: { cara: "#ffd43b", lado: "#e8a00c", tope: "#fff3bf" },
        verde: { cara: "#51cf66", lado: "#2b8a3e", tope: "#b2f2bb" },
        naranja: { cara: "#ff922b", lado: "#d9480f", tope: "#ffd8a8" },
        rosa: { cara: "#f06595", lado: "#a61e4d", tope: "#fcc2d7" },
        morado: { cara: "#9775fa", lado: "#5f3dc4", tope: "#d0bfff" },
        turquesa: { cara: "#22b8cf", lado: "#0b7285", tope: "#99e9f2" }
    };

    /* Color natural de cada juguete, para el nivel 1: ahí la pista es el dibujo de la caja,
       no el color, así que el oso es marrón y la pelota de colores, como un juguete de verdad. */
    var NATURAL = {
        coche: { cara: "#fa5252", lado: "#c92a2a", tope: "#ffc9c9" },
        camion: { cara: "#f59f00", lado: "#b35c00", tope: "#ffe066" },
        tren: { cara: "#e03131", lado: "#a51111", tope: "#ff8787" },
        oso: { cara: "#c08345", lado: "#8d5a24", tope: "#f0d5ab" },
        conejo: { cara: "#f1f3f5", lado: "#ced4da", tope: "#ffffff" },
        muneco: { cara: "#f06595", lado: "#c2255c", tope: "#ffe8cc" },
        pelota: { cara: "#4dabf7", lado: "#e03131", tope: "#ffd43b" },
        madera: { cara: "#e8b472", lado: "#c08f52", tope: "#f5d6a8" }
    };

    function tinta(color) {
        return PALETA[color] || NATURAL[color] || PALETA.rojo;
    }

    /** Cubo isométrico. */
    /* ------------------------------------------------ figuras del nivel 2
       Cosas que un niño de 3-4 años nombra de un vistazo (estrella, corazón, flor,
       globo, manzana), no formas geométricas. Cada una se pinta entera de su color:
       lo que hay que mirar para clasificar es el color, no la silueta. */

    /** Estrella gorda de cinco puntas. */
    function estrella(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(46) +
            '<path d="M100 26l22 46 50 7-36 35 9 50-45-24-45 24 9-50-36-35 50-7z" fill="' + c.lado + '"/>' +
            '<path d="M100 36l18 38 42 6-30 29 7 41-37-20-37 20 7-41-30-29 42-6z" fill="' + c.cara + '"/>' +
            '<path d="M100 54l11 24 26 4-19 18 4 25-22-12-22 12 4-25-19-18 26-4z" fill="' + c.tope + '"/>'
        );
    }

    /** Corazón. */
    function corazon(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(46) +
            '<path d="M100 170C60 140 28 116 28 84c0-22 17-38 38-38 14 0 26 7 34 19 8-12 20-19 34-19 21 0 38 16 38 38 0 32-32 56-72 86z" fill="' + c.lado + '"/>' +
            '<path d="M100 160C64 133 36 112 36 84c0-18 14-32 30-32 13 0 24 8 30 20 6-12 17-20 30-20 16 0 30 14 30 32 0 28-28 49-56 76z" fill="' + c.cara + '"/>' +
            '<ellipse cx="72" cy="78" rx="17" ry="13" fill="' + c.tope + '" transform="rotate(-28 72 78)"/>'
        );
    }

    /** Flor de seis pétalos. El pétalo va en el tono pleno: el color debe leerse de lejos. */
    function flor(color) {
        var c = tinta(color);
        var petalos = "";
        for (var i = 0; i < 6; i++) {
            var a = i * 60;
            petalos += '<ellipse cx="100" cy="56" rx="23" ry="34" fill="' + c.lado +
                '" transform="rotate(' + a + ' 100 104)"/>';
            petalos += '<ellipse cx="100" cy="54" rx="19" ry="29" fill="' + c.cara +
                '" transform="rotate(' + a + ' 100 104)"/>';
            petalos += '<ellipse cx="100" cy="44" rx="8" ry="11" fill="' + c.tope +
                '" transform="rotate(' + a + ' 100 104)"/>';
        }
        return svg(
            sombraSuelo(46) +
            '<rect x="94" y="118" width="12" height="62" rx="6" fill="#40c057"/>' +
            '<ellipse cx="130" cy="152" rx="24" ry="13" fill="#2f9e44" transform="rotate(18 130 152)"/>' +
            petalos +
            '<circle cx="100" cy="104" r="25" fill="' + c.lado + '"/>' +
            '<circle cx="100" cy="104" r="19" fill="#fff8e1"/>' +
            '<circle cx="100" cy="104" r="19" fill="' + c.tope + '" opacity=".5"/>'
        );
    }

    /** Globo con cuerda. */
    function globo(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(26) +
            '<path d="M100 150c-4 14-14 22-10 34" stroke="#8d6e63" stroke-width="4" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="100" cy="86" rx="54" ry="64" fill="' + c.cara + '"/>' +
            '<path d="M100 22c30 0 54 29 54 64 0 20-8 38-20 50 6-12 10-28 10-46 0-35-20-62-44-68z" fill="' + c.lado + '"/>' +
            '<ellipse cx="78" cy="62" rx="16" ry="23" fill="' + c.tope + '" transform="rotate(-20 78 62)"/>' +
            '<path d="M92 148h16l-8 12z" fill="' + c.lado + '"/>'
        );
    }

    /** Manzana con hoja. */
    function manzana(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(46) +
            '<rect x="96" y="40" width="9" height="30" rx="4.5" fill="#8d6e63"/>' +
            '<path d="M104 54c14-16 32-16 38-10 4 10-10 26-30 24z" fill="#51cf66"/>' +
            '<path d="M100 72c-14-10-34-8-44 8-12 20-4 60 14 82 10 12 20 10 30 6 10 4 20 6 30-6 18-22 26-62 14-82-10-16-30-18-44-8z" fill="' + c.cara + '"/>' +
            '<path d="M100 72c14-10 34-8 44 8 12 20 4 60-14 82-7 9-14 10-21 9 10-6 16-14 21-25 10-22 8-56-4-70-7-8-17-9-26-4z" fill="' + c.lado + '"/>' +
            '<ellipse cx="74" cy="104" rx="12" ry="19" fill="' + c.tope + '" transform="rotate(-18 74 104)"/>'
        );
    }

    function caja(color, oscuro) {
        var c = PALETA[color] || { cara: color || "#f59f00", lado: oscuro || "#b35c00", tope: "#ffffff" };
        var lado = oscuro || c.lado;
        return svg(
            '<path d="M14 54l40-28h92l40 28-40 22H54z" fill="' + c.cara + '" opacity=".9"/>' +
            '<path d="M30 70h140v110c0 8-6 14-14 14H44c-8 0-14-6-14-14z" fill="' + c.cara + '"/>' +
            '<path d="M30 70h50v124H44c-8 0-14-6-14-14z" fill="' + lado + '"/>' +
            '<path d="M30 70h140v16H30z" fill="' + lado + '" opacity=".55"/>' +
            '<path d="M14 54l40-28h46v50H54z" fill="' + lado + '" opacity=".85"/>',
            "0 0 200 200"
        );
    }

    function garaje() {
        return svg(
            '<path d="M18 96 L100 36 L182 96 V168 H18z" fill="#fff" stroke="#1971c2" stroke-width="8" stroke-linejoin="round"/>' +
            '<path d="M18 96 L100 36 L182 96" fill="#1971c2"/>' +
            '<rect x="58" y="108" width="84" height="60" rx="6" fill="#d0ebff" stroke="#1971c2" stroke-width="6"/>' +
            '<path d="M100 108v60" stroke="#1971c2" stroke-width="4"/>'
        );
    }

    /* Juguetes con forma propia. Todos aceptan color: "coche:azul", "oso:rosa". */
    var DIBUJOS = {
        coche: coche,
        camion: camion,
        tren: tren,
        oso: oso,
        conejo: conejo,
        muneco: muneco,
        pelota: pelota,
        madera: madera,
        garaje: garaje
    };

    /* Formas del nivel 2: el tipo lleva el color, p. ej. "cubo:rojo". */
    var FORMAS = {
        estrella: estrella,
        corazon: corazon,
        flor: flor,
        globo: globo,
        manzana: manzana
    };


    /**
     * tipo: "coche", "cubo:rojo" o "caja:azul".
     * Las formas sin color caen en rojo, igual que antes.
     */
    function dibujar(tipo) {
        var partes = String(tipo || "").split(":");
        var nombre = partes[0];
        var color = partes[1] || "";
        if (nombre === "caja") return caja(color);
        if (FORMAS[nombre]) return FORMAS[nombre](color || "rojo");
        var fn = DIBUJOS[nombre];
        return fn ? fn(color || nombre) : "";
    }

    global.JuguetesCanasta = { dibujar: dibujar };
}(typeof window !== "undefined" ? window : global));
