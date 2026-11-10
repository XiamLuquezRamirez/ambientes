/**
 * Personajes — piezas SVG de Zoe y Zeus en ropa deportiva, de perfil (miran a la derecha).
 *
 * Las formas salen de los archivos img/<personaje>/<pieza>.svg (generados por
 * scripts/generar-svg-puzle-siluetas.js): cabeza, tronco, brazo_extendido, brazo_flexionado,
 * pierna_recta, pierna_doblada, tenis_izq y tenis_der. Se leen una vez y quedan en caché.
 *
 * Cada pieza está en coordenadas locales con el pivote (la articulación) en (0, 0), en la misma
 * escala del esqueleto de Posturas. dibujo() devuelve dos capas de texto SVG:
 *   base     formas que dan la silueta (class="pz-forma"): se reutilizan para la sombra, el contorno
 *            neón y la silueta oscura cambiando el relleno por CSS.
 *   detalle  ojos, costuras, dorsal, cordones… (solo en la pieza a color).
 * Sin dependencias: lo usan piezas.js, la presentación del estadio y la escena final.
 */
(function (global) {
    "use strict";

    var VERSION_SVG = "20261110b";
    var PERSONAJES = ["zeus", "zoe"];

    /** Colores de lateralidad (los mismos de Lateralidad y del Espejo): izquierda amarillo, derecha verde. */
    var LADOS = {
        izq: { tenis: "#ffd43b", tenisOscuro: "#e0a800", nombre: "izquierdo" },
        der: { tenis: "#51cf66", tenisOscuro: "#2b9a44", nombre: "derecho" }
    };

    // Carpeta img/ junto a este script (sirve dentro del iframe del kiosco y en la vista previa).
    var CARPETA = (function () {
        var src = (document.currentScript && document.currentScript.src) || "";
        return src ? src.replace(/[^\/]*$/, "") + "img/" : "img/";
    })();

    var cache = {};

    function leer(ruta) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", CARPETA + ruta + "?v=" + VERSION_SVG, false);
            xhr.send();
            if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) return xhr.responseText;
        } catch (e) { /* noop */ }
        console.warn("[Personajes] No se pudo leer img/" + ruta);
        return "";
    }

    function interior(nodo) {
        if (!nodo) return "";
        var ser = new XMLSerializer();
        return Array.prototype.map.call(nodo.childNodes, function (n) {
            return n.nodeType === 1 ? ser.serializeToString(n) : "";
        }).join("").replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, "");
    }

    /** Archivo de la pieza: cabeza, tronco, brazo_<forma>, pierna_<forma> o tenis_<lado>. */
    function archivo(p) {
        switch (p.tipo) {
            case "cabeza":
            case "tronco":
                return p.tipo;
            case "brazo":
                return "brazo_" + (p.forma === "flexionado" ? "flexionado" : "extendido");
            case "pierna":
                return "pierna_" + (p.forma === "doblada" ? "doblada" : "recta");
            case "tenis":
                return "tenis_" + (p.lado === "izq" ? "izq" : "der");
            default:
                return "";
        }
    }

    function formas(pj, nombreArchivo) {
        var clave = pj + "/" + nombreArchivo;
        if (cache[clave]) return cache[clave];
        var texto = leer(clave + ".svg");
        var doc = texto ? new DOMParser().parseFromString(texto, "image/svg+xml") : null;
        var raiz = doc ? doc.documentElement : null;
        cache[clave] = {
            base: interior(raiz && raiz.querySelector(".base")),
            detalle: interior(raiz && raiz.querySelector(".detalle"))
        };
        return cache[clave];
    }

    /** Dibujo de una pieza: { base, detalle }. p = { tipo, forma, lado, doble }. */
    function dibujo(pj, p) {
        pj = PERSONAJES.indexOf(pj) !== -1 ? pj : "zoe";
        var n = archivo(p);
        if (!n) return { base: "", detalle: "" };
        var uno = formas(pj, n);
        if (p.tipo !== "brazo" || !p.doble) return { base: uno.base, detalle: uno.detalle };
        // Brazos juntos (de perfil se ven superpuestos): el de atrás un poco desplazado y más oscuro.
        return {
            base: '<g transform="translate(-7,-3)">' + uno.base + "</g>" + uno.base,
            detalle: '<g transform="translate(-7,-3)" class="pz-atras">' + uno.detalle + "</g>" + uno.detalle,
            atras: true
        };
    }

    /** Lee de una vez todas las piezas de los dos personajes (evita pausas al armar la primera figura). */
    function precargar() {
        PERSONAJES.forEach(function (pj) {
            ["cabeza", "tronco", "brazo_extendido", "brazo_flexionado", "pierna_recta", "pierna_doblada", "tenis_izq", "tenis_der"]
                .forEach(function (n) { formas(pj, n); });
        });
    }

    global.Personajes = {
        LADOS: LADOS,
        dibujo: dibujo,
        precargar: precargar,
        nombre: function (pj) { return pj === "zeus" ? "Zeus" : "Zoe"; }
    };
})(window);
