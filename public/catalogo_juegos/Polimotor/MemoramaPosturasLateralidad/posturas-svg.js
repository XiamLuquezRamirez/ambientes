/**
 * PosturasSvg — convierte una postura de config.json (ángulos por extremidad) en un SVG completo y
 * autónomo, listo para rasterizarse a la textura de una tarjeta.
 *
 * Reutiliza el muñeco articulado de "El Espejo de las Posiciones" (muneco.js + postura.js, con los
 * SVG de img/<personaje>/), así que NO se dibujan personajes nuevos: las dos tarjetas de una pareja
 * salen del mismo dato y son idénticas pixel a pixel. El personaje de las tarjetas es **Zoe**.
 *
 * Los estilos del muñeco viven en el style.css del Espejo; aquí se escriben dentro del propio SVG
 * (<style>) porque la imagen se carga como data URI y no hereda el CSS de la página.
 *
 * Lateralidad: el personaje mira al niño, así que su lado izquierdo se ve a la DERECHA de la pantalla
 * (lo resuelve Postura.aPantalla). Para que el niño no se confunda, cada tarjeta lleva un distintivo de
 * lado: muñequera verde en la mano derecha y muñequera amarilla en la izquierda, los mismos colores de
 * lateralidad que usa el resto de Polimotor.
 */
(function (global) {
    "use strict";

    var VISTA = { w: 320, h: 400 };
    var COLOR_DER = "#2f9e44";   // derecha: verde
    var COLOR_IZQ = "#f0a500";   // izquierda: amarillo

    /** Estilos del muñeco, copiados del style.css del Espejo (bloque .m-contorno / .m-relleno). */
    var ESTILOS = [
        ".m-contorno .m-piel{fill:#e2ad9f;stroke:#e2ad9f}",
        ".m-contorno .m-camiseta{fill:#22745d;stroke:#22745d}",
        ".m-contorno .m-short{fill:#003f58;stroke:#003f58}",
        ".m-contorno .m-pelo{fill:#6b3415;stroke:#6b3415}",
        ".m-contorno .m-pelo-zoe{fill:#823f24;stroke:#823f24}",
        ".m-contorno .m-media{fill:#dfe4ea;stroke:#dfe4ea}",
        ".m-contorno .m-zapato{fill:#22745d;stroke:#22745d}",
        ".m-contorno .m-blusa{fill:#7cc0e3;stroke:#7cc0e3}",
        ".m-contorno .m-vestido{fill:#c95d88;stroke:#c95d88}",
        ".m-contorno .m-calceta{fill:#d47aa0;stroke:#d47aa0}",
        ".m-contorno .m-zapato-zoe{fill:#69c2e4;stroke:#69c2e4}",
        ".m-contorno *{stroke-width:7;stroke-linejoin:round;stroke-linecap:round}",
        ".m-relleno .base *{stroke:none}",
        ".m-relleno .m-piel{fill:#f2c6b9}",
        ".m-relleno .m-camiseta{fill:#2b896f}",
        ".m-relleno .m-short{fill:#004f6d}",
        ".m-relleno .m-pelo{fill:#7f3f1a}",
        ".m-relleno .m-pelo-zoe{fill:#984c2c}",
        ".m-relleno .m-media{fill:#fffdfc}",
        ".m-relleno .m-zapato{fill:#2b896f}",
        ".m-relleno .m-blusa{fill:#95d3f0}",
        ".m-relleno .m-vestido{fill:#e1709c}",
        ".m-relleno .m-calceta{fill:#e892b5}",
        ".m-relleno .m-zapato-zoe{fill:#a4daf4}"
    ].join("");

    function M() { return global.Muneco; }
    function P() { return global.Postura; }

    function listo() {
        return !!(M() && P());
    }

    /**
     * Punto de pantalla de la mano (extremo del brazo) o del pie, en el viewBox del muñeco.
     * Se calcula con la misma cinemática que usa el Espejo: hombro/cadera + dos segmentos girados.
     */
    function extremo(id, ang) {
        var p = P();
        var pieza = p.PIEZAS[id];
        if (!pieza) return null;
        var s = p.ESQUELETO.sockets[pieza.socket];
        var l = pieza.tipo === "pierna" ? p.ESQUELETO.pierna : p.ESQUELETO.brazo;
        var pant = p.aPantalla(id, ang || { a: 0, b: 0 });
        var t1 = pant.p * Math.PI / 180;
        var t2 = (pant.p + pant.d) * Math.PI / 180;
        // un segmento que cuelga hacia abajo y gira θ en sentido horario (igual que rotate() de SVG)
        var x = s.x - l.l1 * Math.sin(t1) - l.l2 * Math.sin(t2);
        var y = s.y + l.l1 * Math.cos(t1) + l.l2 * Math.cos(t2);
        return { x: x, y: y };
    }

    /** Muñequera/tobillera de color del lado, para que la lateralidad se lea sin dudas. */
    function marcaLado(id, ang) {
        var pt = extremo(id, ang);
        if (!pt) return "";
        var lado = id.indexOf("_der") > 0 ? "der" : "izq";
        var col = lado === "der" ? COLOR_DER : COLOR_IZQ;
        var r = id.indexOf("brazo") === 0 ? 15 : 17;
        return '<circle cx="' + f(pt.x) + '" cy="' + f(pt.y) + '" r="' + r + '" fill="' + col + '" fill-opacity=".9" stroke="#ffffff" stroke-width="4"/>';
    }

    /** Destello sobre las partes que definen la postura (mano y rodilla involucradas). */
    function destellos(postura) {
        var ids = (postura && postura.destello) || [];
        return ids.map(function (id) {
            var pt = extremo(id, (postura.partes || {})[id]);
            if (!pt) return "";
            return '<circle cx="' + f(pt.x) + '" cy="' + f(pt.y) + '" r="30" fill="#ffd43b" fill-opacity=".30"/>' +
                '<circle cx="' + f(pt.x) + '" cy="' + f(pt.y) + '" r="21" fill="#fff3bf" fill-opacity=".45"/>';
        }).join("");
    }

    function f(n) {
        return Math.round(n * 10) / 10;
    }

    /**
     * SVG de una postura. `opts`:
     *   personaje  "zoe" (por defecto) | "zeus"
     *   marcas     true (por defecto): muñequeras de color por lado
     *   destello   true: halo sobre las partes clave de la postura
     *   fondo      color de fondo del recuadro (transparente si no se pasa)
     */
    function svg(postura, opts) {
        if (!listo()) return "";
        var o = opts || {};
        var m = M();
        var anterior = m.personaje();
        m.usarPersonaje(o.personaje || "zoe");
        var cuerpo = m.figura(postura.partes || {});
        m.usarPersonaje(anterior);

        var marcas = "";
        if (o.marcas !== false) {
            marcas = ["brazo_der", "brazo_izq"].map(function (id) {
                return marcaLado(id, (postura.partes || {})[id]);
            }).join("");
        }
        var halo = o.destello ? destellos(postura) : "";

        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + VISTA.w + " " + VISTA.h + '">' +
            "<style>" + ESTILOS + "</style>" +
            (o.fondo ? '<rect width="' + VISTA.w + '" height="' + VISTA.h + '" fill="' + o.fondo + '"/>' : "") +
            halo +
            cuerpo +
            marcas +
            "</svg>";
    }

    function dataUri(postura, opts) {
        var s = svg(postura, opts);
        return s ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s) : "";
    }

    global.PosturasSvg = {
        VISTA: VISTA,
        COLOR_DER: COLOR_DER,
        COLOR_IZQ: COLOR_IZQ,
        listo: listo,
        extremo: extremo,
        svg: svg,
        dataUri: dataUri
    };
})(window);
