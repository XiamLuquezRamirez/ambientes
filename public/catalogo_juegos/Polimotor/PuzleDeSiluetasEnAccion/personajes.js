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

    var VERSION_SVG = "20261110c";
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

    var ARCHIVOS = ["cabeza", "tronco", "brazo_extendido", "brazo_flexionado", "pierna_recta", "pierna_doblada", "tenis_izq", "tenis_der"];

    /** Guarda las formas de un archivo leído. Devuelve null si el texto no trae piezas. */
    function guardar(clave, texto) {
        var doc = texto ? new DOMParser().parseFromString(texto, "image/svg+xml") : null;
        var raiz = doc ? doc.documentElement : null;
        var base = interior(raiz && raiz.querySelector(".base"));
        if (!base) return null;
        cache[clave] = { base: base, detalle: interior(raiz.querySelector(".detalle")) };
        return cache[clave];
    }

    /**
     * Formas de un archivo. Una lectura fallida NO se guarda: se vuelve a intentar la próxima vez (antes
     * quedaba vacía para siempre y la pose salía sin silueta ni piezas, con el juego trabado).
     */
    function formas(pj, nombreArchivo) {
        var clave = pj + "/" + nombreArchivo;
        if (cache[clave]) return cache[clave];
        return guardar(clave, leer(clave + ".svg")) || { base: "", detalle: "" };
    }

    /**
     * Dibujo de una pieza: { base, detalle, atras? }. p = { tipo, forma, lado, doble }.
     * atras (solo brazos juntos): el brazo de atrás completo, con sus detalles, para pintarlo antes que
     * el de adelante; si sus detalles fueran en la capa de detalle, la muñequera de atrás quedaría
     * encima del brazo de adelante.
     */
    function dibujo(pj, p) {
        pj = PERSONAJES.indexOf(pj) !== -1 ? pj : "zoe";
        var n = archivo(p);
        if (!n) return { base: "", detalle: "" };
        var uno = formas(pj, n);
        if (p.tipo !== "brazo" || !p.doble) return { base: uno.base, detalle: uno.detalle };
        // Brazos juntos (de perfil se ven superpuestos): el de atrás un poco desplazado y más oscuro.
        var desfase = '<g transform="translate(-7,-3)"';
        return {
            base: desfase + ">" + uno.base + "</g>" + uno.base,
            detalle: uno.detalle,
            atras: desfase + ' class="pz-atras">' + uno.base + '<g class="pz-detalle">' + uno.detalle + "</g></g>",
            frente: uno.base
        };
    }

    /**
     * Lee en segundo plano todas las piezas de los dos personajes al abrir el juego: así una pose de Zeus
     * o de Zoe no depende de la red justo cuando aparece (y no hay pausas al armar la primera figura).
     * Si un archivo falla, se reintenta un par de veces. Devuelve una promesa.
     */
    function precargar() {
        if (typeof fetch !== "function") {
            PERSONAJES.forEach(function (pj) { ARCHIVOS.forEach(function (n) { formas(pj, n); }); });
            return Promise.resolve();
        }
        function traer(clave, intentos) {
            if (cache[clave]) return Promise.resolve();
            return fetch(CARPETA + clave + ".svg?v=" + VERSION_SVG)
                .then(function (r) { return r.ok ? r.text() : ""; })
                .catch(function () { return ""; })
                .then(function (texto) {
                    if (cache[clave] || guardar(clave, texto)) return;
                    if (intentos > 0) return new Promise(function (ok) { setTimeout(ok, 1500); }).then(function () { return traer(clave, intentos - 1); });
                    console.warn("[Personajes] No se pudo precargar img/" + clave + ".svg");
                });
        }
        var todas = [];
        PERSONAJES.forEach(function (pj) { ARCHIVOS.forEach(function (n) { todas.push(traer(pj + "/" + n, 2)); }); });
        return Promise.all(todas);
    }

    global.Personajes = {
        LADOS: LADOS,
        dibujo: dibujo,
        precargar: precargar,
        nombre: function (pj) { return pj === "zeus" ? "Zeus" : "Zoe"; }
    };
})(window);
