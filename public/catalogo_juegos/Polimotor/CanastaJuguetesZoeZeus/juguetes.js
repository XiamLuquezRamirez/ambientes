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

    /** Rueda de goma con tapacubos. */
    function rueda(cx, cy, r) {
        return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#3a3f47"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#22262c" stroke-width="' + Math.round(r * 0.18) + '"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.round(r * 0.58) + '" fill="#e9eef4"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.round(r * 0.58) + '" fill="none" stroke="#b9c4d0" stroke-width="2"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + Math.round(r * 0.24) + '" fill="#ffd43b"/>' +
            '<circle cx="' + (cx - r * 0.3) + '" cy="' + (cy - r * 0.34) + '" r="' + Math.round(r * 0.16) + '" fill="#fff" opacity=".55"/>';
    }

    function coche() {
        return svg(
            sombraSuelo(70) +
            // carrocería
            '<path d="M24 136c0-12 9-20 21-20h108c15 0 26 9 29 21l5 15c2 8-3 14-11 14H32c-9 0-16-8-13-17z" fill="#c92a2a"/>' +
            '<path d="M44 120c9-32 24-50 50-50h30c20 0 33 14 40 36l6 14H44z" fill="#fa5252"/>' +
            // brillo superior
            '<path d="M50 112c8-26 20-40 42-42-16 10-24 24-28 42z" fill="#fff" opacity=".35"/>' +
            // ventanillas
            '<path d="M80 84c7 8 9 22 7 32H64c3-16 7-26 16-32z" fill="#d0ebff"/>' +
            '<path d="M80 84c7 8 9 22 7 32h-8c1-12-1-24-6-32z" fill="#a5d8ff"/>' +
            '<path d="M106 78h22c9 0 17 7 21 17l6 21h-49z" fill="#d0ebff"/>' +
            '<path d="M128 78c9 0 17 7 21 17l6 21h-12l-6-21c-3-10-8-17-16-17z" fill="#a5d8ff"/>' +
            // franja lateral
            '<rect x="42" y="124" width="116" height="9" rx="4" fill="#fff" opacity=".6"/>' +
            // faros y parachoques
            '<circle cx="176" cy="118" r="8" fill="#ffe066" stroke="#f08c00" stroke-width="3"/>' +
            '<rect x="20" y="146" width="164" height="9" rx="4" fill="#adb5bd"/>' +
            rueda(60, 158, 25) + rueda(148, 158, 25)
        );
    }

    function camion() {
        return svg(
            sombraSuelo(78) +
            // remolque
            '<rect x="96" y="86" width="88" height="62" rx="9" fill="#1c7ed6"/>' +
            '<rect x="96" y="86" width="88" height="16" rx="8" fill="#4dabf7"/>' +
            '<rect x="106" y="110" width="68" height="28" rx="5" fill="#74c0fc" opacity=".65"/>' +
            '<path d="M106 110h68v6h-68z" fill="#fff" opacity=".4"/>' +
            // cabina
            '<path d="M18 104h62c7 0 12 5 12 12v32H22c-7 0-12-5-12-12v-20c0-7 3-12 8-12z" fill="#f59f00"/>' +
            '<path d="M24 86h50c9 0 15 7 17 18H18v-6c0-7 3-12 6-12z" fill="#ffd43b"/>' +
            '<path d="M32 92h30c5 0 9 4 10 10H28z" fill="#d0ebff"/>' +
            '<path d="M62 92c5 0 9 4 10 10h-9c-1-5-3-8-6-10z" fill="#a5d8ff"/>' +
            // detalles
            '<circle cx="16" cy="124" r="7" fill="#ffe066" stroke="#e8590c" stroke-width="2.5"/>' +
            '<rect x="10" y="140" width="84" height="8" rx="4" fill="#adb5bd"/>' +
            rueda(46, 158, 23) + rueda(126, 158, 23) + rueda(168, 158, 23)
        );
    }

    function tren() {
        return svg(
            sombraSuelo(76) +
            // vagón
            '<rect x="20" y="104" width="62" height="44" rx="9" fill="#f59f00"/>' +
            '<rect x="20" y="104" width="62" height="12" rx="6" fill="#ffd43b"/>' +
            '<rect x="30" y="122" width="18" height="18" rx="4" fill="#fff3bf"/>' +
            '<rect x="54" y="122" width="18" height="18" rx="4" fill="#fff3bf"/>' +
            // enganche
            '<rect x="82" y="128" width="12" height="7" rx="3" fill="#868e96"/>' +
            // locomotora
            '<rect x="92" y="82" width="82" height="66" rx="11" fill="#e03131"/>' +
            '<rect x="92" y="82" width="82" height="14" rx="7" fill="#ff8787"/>' +
            '<rect x="104" y="58" width="48" height="30" rx="8" fill="#c92a2a"/>' +
            '<rect x="114" y="66" width="28" height="16" rx="4" fill="#d0ebff"/>' +
            '<rect x="104" y="106" width="58" height="26" rx="6" fill="#fff" opacity=".35"/>' +
            // chimenea con humo
            '<rect x="40" y="86" width="18" height="22" rx="5" fill="#495057"/>' +
            '<ellipse cx="49" cy="84" rx="12" ry="7" fill="#868e96"/>' +
            '<circle cx="49" cy="64" r="9" fill="#fff" opacity=".75"/>' +
            '<circle cx="62" cy="48" r="7" fill="#fff" opacity=".55"/>' +
            '<circle cx="74" cy="36" r="5" fill="#fff" opacity=".38"/>' +
            // vía
            rueda(44, 158, 16) + rueda(112, 158, 18) + rueda(156, 158, 18) +
            '<path d="M30 172h146" stroke="#868e96" stroke-width="6" stroke-linecap="round"/>'
        );
    }

    /* ------------------------------------------------------------ peluches */

    /** Osito de peluche con costuras. */
    function oso() {
        return svg(
            sombraSuelo(52) +
            // orejas
            '<circle cx="62" cy="54" r="21" fill="#a1672f"/>' +
            '<circle cx="62" cy="54" r="11" fill="#d9a066"/>' +
            '<circle cx="138" cy="54" r="21" fill="#a1672f"/>' +
            '<circle cx="138" cy="54" r="11" fill="#d9a066"/>' +
            // cuerpo
            '<ellipse cx="100" cy="142" rx="50" ry="42" fill="#b4763a"/>' +
            '<ellipse cx="100" cy="150" rx="31" ry="28" fill="#e5bd8b"/>' +
            // patas
            '<ellipse cx="62" cy="172" rx="20" ry="14" fill="#a1672f"/>' +
            '<ellipse cx="62" cy="172" rx="11" ry="7" fill="#e5bd8b"/>' +
            '<ellipse cx="138" cy="172" rx="20" ry="14" fill="#a1672f"/>' +
            '<ellipse cx="138" cy="172" rx="11" ry="7" fill="#e5bd8b"/>' +
            // brazos
            '<ellipse cx="48" cy="126" rx="16" ry="22" fill="#a1672f" transform="rotate(-18 48 126)"/>' +
            '<ellipse cx="152" cy="126" rx="16" ry="22" fill="#a1672f" transform="rotate(18 152 126)"/>' +
            // cabeza
            '<circle cx="100" cy="86" r="46" fill="#c08345"/>' +
            '<path d="M58 70c6-22 22-34 42-34s36 12 42 34c-12-10-26-14-42-14s-30 4-42 14z" fill="#d49a5e" opacity=".7"/>' +
            // hocico
            '<ellipse cx="100" cy="104" rx="25" ry="19" fill="#f0d5ab"/>' +
            '<ellipse cx="100" cy="94" rx="10" ry="7.5" fill="#4a2f1b"/>' +
            '<path d="M100 101v8M100 109c-5 0-8-3-9-6M100 109c5 0 8-3 9-6" stroke="#4a2f1b" stroke-width="3" fill="none" stroke-linecap="round"/>' +
            // ojos
            '<circle cx="80" cy="80" r="7" fill="#33210f"/>' +
            '<circle cx="82.5" cy="77.5" r="2.6" fill="#fff"/>' +
            '<circle cx="120" cy="80" r="7" fill="#33210f"/>' +
            '<circle cx="122.5" cy="77.5" r="2.6" fill="#fff"/>' +
            // lazo
            '<path d="M86 128l-16-9v18zM114 128l16-9v18z" fill="#e8590c"/>' +
            '<circle cx="100" cy="128" r="7" fill="#f76707"/>'
        );
    }

    /** Conejo de peluche. */
    function conejo() {
        return svg(
            sombraSuelo(48) +
            // orejas
            '<ellipse cx="80" cy="42" rx="13" ry="36" fill="#dee2e6" transform="rotate(-10 80 42)"/>' +
            '<ellipse cx="80" cy="46" rx="6.5" ry="26" fill="#ffc9c9" transform="rotate(-10 80 46)"/>' +
            '<ellipse cx="122" cy="42" rx="13" ry="36" fill="#dee2e6" transform="rotate(10 122 42)"/>' +
            '<ellipse cx="122" cy="46" rx="6.5" ry="26" fill="#ffc9c9" transform="rotate(10 122 46)"/>' +
            // cuerpo
            '<ellipse cx="100" cy="146" rx="44" ry="38" fill="#f1f3f5"/>' +
            '<ellipse cx="100" cy="152" rx="27" ry="25" fill="#fff"/>' +
            // patas
            '<ellipse cx="68" cy="174" rx="18" ry="12" fill="#e9ecef"/>' +
            '<ellipse cx="132" cy="174" rx="18" ry="12" fill="#e9ecef"/>' +
            '<ellipse cx="50" cy="132" rx="13" ry="19" fill="#e9ecef" transform="rotate(-16 50 132)"/>' +
            '<ellipse cx="150" cy="132" rx="13" ry="19" fill="#e9ecef" transform="rotate(16 150 132)"/>' +
            // cabeza
            '<circle cx="100" cy="98" r="40" fill="#f8f9fa"/>' +
            // ojos y nariz
            '<circle cx="85" cy="94" r="6" fill="#343a40"/>' +
            '<circle cx="87" cy="92" r="2.2" fill="#fff"/>' +
            '<circle cx="115" cy="94" r="6" fill="#343a40"/>' +
            '<circle cx="117" cy="92" r="2.2" fill="#fff"/>' +
            '<path d="M100 106l-7 5h14z" fill="#ff8787"/>' +
            '<path d="M100 111v6M100 117c-4 0-7-2-8-5M100 117c4 0 7-2 8-5" stroke="#adb5bd" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
            // mofletes y bigotes
            '<ellipse cx="74" cy="106" rx="8" ry="5.5" fill="#ffc9c9" opacity=".8"/>' +
            '<ellipse cx="126" cy="106" rx="8" ry="5.5" fill="#ffc9c9" opacity=".8"/>' +
            '<path d="M70 110h-16M70 116l-15 4M130 110h16M130 116l15 4" stroke="#ced4da" stroke-width="2" stroke-linecap="round"/>'
        );
    }

    /** Muñeco de trapo. */
    function muneco() {
        return svg(
            sombraSuelo(46) +
            // piernas
            '<rect x="78" y="146" width="16" height="32" rx="8" fill="#ffe8cc"/>' +
            '<rect x="106" y="146" width="16" height="32" rx="8" fill="#ffe8cc"/>' +
            '<ellipse cx="86" cy="180" rx="13" ry="8" fill="#4dabf7"/>' +
            '<ellipse cx="114" cy="180" rx="13" ry="8" fill="#4dabf7"/>' +
            // vestido
            '<path d="M68 150c0-30 10-46 32-46s32 16 32 46z" fill="#f06595"/>' +
            '<path d="M68 150c0-12 2-22 5-30h54c3 8 5 18 5 30z" fill="#f783ac" opacity=".7"/>' +
            '<circle cx="86" cy="130" r="4" fill="#fff" opacity=".8"/>' +
            '<circle cx="114" cy="138" r="4" fill="#fff" opacity=".8"/>' +
            '<circle cx="100" cy="118" r="4" fill="#fff" opacity=".8"/>' +
            // brazos
            '<rect x="42" y="112" width="30" height="15" rx="7.5" fill="#ffe8cc" transform="rotate(-22 57 119)"/>' +
            '<rect x="128" y="112" width="30" height="15" rx="7.5" fill="#ffe8cc" transform="rotate(22 143 119)"/>' +
            '<circle cx="44" cy="105" r="9" fill="#ffd8a8"/>' +
            '<circle cx="156" cy="105" r="9" fill="#ffd8a8"/>' +
            // pelo trasero
            '<circle cx="100" cy="68" r="44" fill="#f59f00"/>' +
            '<circle cx="62" cy="86" r="16" fill="#f59f00"/>' +
            '<circle cx="138" cy="86" r="16" fill="#f59f00"/>' +
            // cara
            '<circle cx="100" cy="74" r="35" fill="#ffe8cc"/>' +
            // flequillo
            '<path d="M65 68c2-24 16-38 35-38s33 14 35 38c-10-12-21-16-35-16s-25 4-35 16z" fill="#ffc947"/>' +
            // ojos
            '<circle cx="88" cy="74" r="5.5" fill="#3b2a1a"/>' +
            '<circle cx="90" cy="72" r="2" fill="#fff"/>' +
            '<circle cx="112" cy="74" r="5.5" fill="#3b2a1a"/>' +
            '<circle cx="114" cy="72" r="2" fill="#fff"/>' +
            // mofletes y boca
            '<circle cx="78" cy="86" r="6.5" fill="#ffc9c9"/>' +
            '<circle cx="122" cy="86" r="6.5" fill="#ffc9c9"/>' +
            '<path d="M93 90c4 5 10 5 14 0" stroke="#c92a2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
            // lazo en el pelo
            '<path d="M128 44l14-10v20zM128 44l-2-16 14 8z" fill="#e03131"/>' +
            '<circle cx="130" cy="44" r="5" fill="#fa5252"/>'
        );
    }

    /* --------------------------------------------------- pelota y bloque de madera */

    /** Pelota de playa a gajos. */
    function pelota() {
        return svg(
            sombraSuelo(42) +
            '<circle cx="100" cy="104" r="62" fill="#fff"/>' +
            '<path d="M100 42a62 62 0 0 1 44 18l-44 44z" fill="#fa5252"/>' +
            '<path d="M144 60a62 62 0 0 1 18 44h-62z" fill="#ffd43b"/>' +
            '<path d="M162 104a62 62 0 0 1-18 44l-44-44z" fill="#51cf66"/>' +
            '<path d="M144 148a62 62 0 0 1-44 18v-62z" fill="#4dabf7"/>' +
            '<path d="M100 166a62 62 0 0 1-44-18l44-44z" fill="#e599f7"/>' +
            '<path d="M56 148a62 62 0 0 1-18-44h62z" fill="#ff922b"/>' +
            '<circle cx="100" cy="104" r="14" fill="#fff"/>' +
            '<circle cx="100" cy="104" r="62" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="3"/>' +
            '<ellipse cx="76" cy="78" rx="18" ry="12" fill="#fff" opacity=".5" transform="rotate(-30 76 78)"/>'
        );
    }

    /** Cubo de madera con una letra. */
    function madera() {
        return svg(
            sombraSuelo(48) +
            '<path d="M100 36l62 30v62l-62 30-62-30V66z" fill="#e8b472"/>' +
            '<path d="M100 36v122l-62-30V66z" fill="#c08f52"/>' +
            '<path d="M100 36l62 30-62 28-62-28z" fill="#f5d6a8"/>' +
            // veta
            '<path d="M112 84v56M126 92v48" stroke="#c08f52" stroke-width="2" opacity=".45"/>' +
            // letra A en la cara derecha
            '<path d="M124 132l12-36 12 36M128 120h16" stroke="#b03a1a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        );
    }

    var PALETA = {
        rojo: { cara: "#ff6b6b", lado: "#c92a2a", tope: "#ffc9c9" },
        azul: { cara: "#4dabf7", lado: "#1864ab", tope: "#a5d8ff" },
        amarillo: { cara: "#ffd43b", lado: "#e8a00c", tope: "#fff3bf" },
        verde: { cara: "#51cf66", lado: "#2b8a3e", tope: "#b2f2bb" },
        naranja: { cara: "#ff922b", lado: "#d9480f", tope: "#ffd8a8" }
    };

    function tinta(color) {
        return PALETA[color] || PALETA.rojo;
    }

    /** Cubo isométrico. */
    function cubo(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(48) +
            '<path d="M100 36l62 30v62l-62 30-62-30V66z" fill="' + c.cara + '"/>' +
            '<path d="M100 36v122l-62-30V66z" fill="' + c.lado + '"/>' +
            '<path d="M100 36l62 30-62 28-62-28z" fill="' + c.tope + '"/>'
        );
    }

    /** Estrella gruesa. */
    function estrella(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(46) +
            '<path d="M100 28l18 40 44 6-32 30 8 44-38-20-38 20 8-44-32-30 44-6z" fill="' + c.lado + '"/>' +
            '<path d="M100 36l15 34 38 5-28 26 7 38-32-17-32 17 7-38-28-26 38-5z" fill="' + c.cara + '"/>' +
            '<path d="M100 54l9 20 22 3-16 15 4 22-19-10-19 10 4-22-16-15 22-3z" fill="' + c.tope + '"/>'
        );
    }

    /** Cilindro de pie. */
    function cilindro(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(46) +
            '<path d="M48 70v78c0 16 23 26 52 26s52-10 52-26V70" fill="' + c.cara + '"/>' +
            '<path d="M48 70v78c0 13 15 22 36 25V72z" fill="' + c.lado + '"/>' +
            '<ellipse cx="100" cy="70" rx="52" ry="20" fill="' + c.tope + '"/>' +
            '<ellipse cx="100" cy="70" rx="34" ry="12" fill="#fff" opacity=".45"/>'
        );
    }

    /** Ladrillo con dos tetones. */
    function ladrillo(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(62) +
            '<ellipse cx="62" cy="100" rx="16" ry="10" fill="' + c.lado + '"/>' +
            '<ellipse cx="62" cy="94" rx="16" ry="10" fill="' + c.tope + '"/>' +
            '<ellipse cx="124" cy="100" rx="16" ry="10" fill="' + c.lado + '"/>' +
            '<ellipse cx="124" cy="94" rx="16" ry="10" fill="' + c.tope + '"/>' +
            '<path d="M28 104h130c8 0 14 6 14 14v30c0 8-6 14-14 14H28c-8 0-14-6-14-14v-30c0-8 6-14 14-14z" fill="' + c.cara + '"/>' +
            '<path d="M28 104h130c8 0 14 6 14 14H14c0-8 6-14 14-14z" fill="' + c.tope + '" opacity=".75"/>' +
            '<path d="M14 142h158v6c0 8-6 14-14 14H28c-8 0-14-6-14-14z" fill="' + c.lado + '" opacity=".55"/>'
        );
    }

    /** Prisma triangular. */
    function triangulo(color) {
        var c = tinta(color);
        return svg(
            sombraSuelo(52) +
            '<path d="M100 36l72 112H28z" fill="' + c.cara + '"/>' +
            '<path d="M100 36L28 148h48z" fill="' + c.lado + '"/>' +
            '<path d="M100 58l40 68h-40z" fill="' + c.tope + '" opacity=".6"/>'
        );
    }

    /** Caja de cartón abierta, tintada con el color de la zona. */
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

    var DIBUJOS = {
        coche: coche,
        camion: camion,
        tren: tren,
        oso: oso,
        conejo: conejo,
        muneco: muneco,
        pelota: pelota,
        madera: madera,
        garaje: garaje,
        abrazo: oso,
        juego: function () { return '<div class="marca-par">' + pelota() + madera() + "</div>"; }
    };

    /* Formas del nivel 2: el tipo lleva el color, p. ej. "cubo:rojo". */
    var FORMAS = {
        cubo: cubo,
        estrella: estrella,
        cilindro: cilindro,
        ladrillo: ladrillo,
        triangulo: triangulo
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
        return fn ? fn() : "";
    }

    global.JuguetesCanasta = { dibujar: dibujar };
}(typeof window !== "undefined" ? window : global));
