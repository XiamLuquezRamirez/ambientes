/**
 * Muneco — dibujo SVG articulado de Zeus (modelo, figura armada, fichas y fantasma).
 *
 * Las formas salen de los archivos img/{cabeza,tronco,brazo_izq,brazo_der,pierna_izq,pierna_der}.svg
 * (generados por scripts/generar-svg-espejo-posiciones.js). Se leen una vez al cargar.
 *
 * Cada pieza se dibuja en DOS pasadas: primero el contorno (las formas de g.base engrosadas con
 * el color del borde, ver style.css → .m-contorno) y encima el relleno (g.base + g.detalle).
 * Así el codo y la rodilla giran sin que aparezca la línea de corte entre segmentos.
 *
 * Estructura de una extremidad:
 *   g.m-parte[data-id]
 *     g.m-pasada.m-contorno > g.m-prox(rotate) > base arriba + g.m-dist(translate+rotate) > base abajo
 *     g.m-pasada.m-relleno  > (igual, con los detalles)
 * Depende de window.Postura.
 */
(function (global) {
    "use strict";

    var P = global.Postura;
    var VERSION_SVG = "20261110c";

    // Carpeta img/ junto a este script (sirve dentro del iframe del kiosco y en la vista previa).
    var CARPETA = (function () {
        var src = (document.currentScript && document.currentScript.src) || "";
        return src ? src.replace(/[^\/]*$/, "") + "img/" : "img/";
    })();

    var cache = {};

    function f(n) {
        return Math.round(n * 100) / 100;
    }

    function leer(id) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", CARPETA + id + ".svg?v=" + VERSION_SVG, false);
            xhr.send();
            if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) return xhr.responseText;
        } catch (e) { /* noop */ }
        console.warn("[Muneco] No se pudo leer img/" + id + ".svg");
        return "";
    }

    function interior(nodo) {
        if (!nodo) return "";
        var ser = new XMLSerializer();
        return Array.prototype.map.call(nodo.childNodes, function (n) {
            return n.nodeType === 1 ? ser.serializeToString(n) : "";
        }).join("").replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, "");
    }

    function grupo(raiz, selector) {
        var g = raiz ? raiz.querySelector(selector) : null;
        return { base: interior(g && g.querySelector(".base")), detalle: interior(g && g.querySelector(".detalle")) };
    }

    /** Formas de una pieza: { base, detalle } o, en extremidades, { arriba, abajo, largo }. */
    function formas(id) {
        if (cache[id]) return cache[id];
        var texto = leer(id);
        var doc = texto ? new DOMParser().parseFromString(texto, "image/svg+xml") : null;
        var raiz = doc ? doc.documentElement : null;
        var datos;
        if (P.esExtremidad(id)) {
            var arriba = raiz ? raiz.querySelector("#arriba") : null;
            var largo = Number(arriba && arriba.getAttribute("data-largo"));
            var esperado = P.PIEZAS[id].tipo === "brazo" ? P.ESQUELETO.brazo.l1 : P.ESQUELETO.pierna.l1;
            if (largo && largo !== esperado) console.warn("[Muneco] " + id + ".svg mide " + largo + " y el esqueleto " + esperado);
            datos = { arriba: grupo(raiz, "#arriba"), abajo: grupo(raiz, "#abajo"), largo: esperado };
        } else {
            datos = {
                base: interior(raiz && raiz.querySelector(":scope > .base")),
                detalle: interior(raiz && raiz.querySelector(":scope > .detalle"))
            };
        }
        cache[id] = datos;
        return datos;
    }

    function extremidad(id, ang) {
        var pz = P.PIEZAS[id];
        var d = formas(id);
        var rot = P.aPantalla(id, ang || { a: 0, b: 0 });
        function pasada(clase, conDetalle) {
            return '<g class="m-pasada ' + clase + '">' +
                '<g class="m-prox" transform="rotate(' + f(rot.p) + ')">' +
                d.arriba.base + (conDetalle ? d.arriba.detalle : "") +
                '<g class="m-dist" transform="translate(0,' + d.largo + ") rotate(" + f(rot.d) + ')">' +
                d.abajo.base + (conDetalle ? d.abajo.detalle : "") +
                "</g></g></g>";
        }
        return '<g class="m-parte m-' + pz.tipo + " m-" + pz.lado + '" data-id="' + id + '">' +
            pasada("m-contorno", false) + pasada("m-relleno", true) + "</g>";
    }

    function simple(id, envoltorio) {
        var d = formas(id);
        var html = '<g class="m-pasada m-contorno">' + d.base + "</g>" +
            '<g class="m-pasada m-relleno">' + d.base + d.detalle + "</g>";
        if (envoltorio) html = '<g class="' + envoltorio + '">' + html + "</g>";
        return '<g class="m-parte m-' + id + '" data-id="' + id + '">' + html + "</g>";
    }

    function tronco() {
        return simple("tronco");
    }

    function cabeza() {
        return simple("cabeza", "m-cabeza-giro");
    }

    /** Lee las seis piezas ya (evita una pausa al primer dibujo). */
    function precargar() {
        P.IDS.forEach(formas);
    }

    /** Pieza dibujada con su pivote en (0,0): cuello, pecho, hombro o cadera. */
    function parte(id, ang) {
        if (id === "cabeza") return cabeza();
        if (id === "tronco") return tronco();
        return extremidad(id, ang);
    }

    function socketDe(id) {
        var pz = P.PIEZAS[id];
        return P.ESQUELETO.sockets[pz.socket];
    }

    // Orden de dibujo: piernas detrás del short, brazos y cabeza encima del tronco.
    var ORDEN_CAPAS = ["pierna_der", "pierna_izq", "tronco", "brazo_der", "brazo_izq", "cabeza"];

    function envolver(id, interior) {
        var s = socketDe(id);
        return '<g class="m-slot" data-slot="' + id + '" transform="translate(' + s.x + "," + s.y + ')">' + (interior || "") + "</g>";
    }

    /** Cuerpo completo en una postura ({ brazo_izq: {a,b}, ... }). */
    function figura(angulos) {
        var a = angulos || {};
        return '<g class="m-figura">' + ORDEN_CAPAS.map(function (id) {
            return envolver(id, parte(id, a[id]));
        }).join("") + "</g>";
    }

    /** Ranuras vacías en el mismo orden de capas (zona de construcción). */
    function ranuras() {
        return '<g class="m-figura">' + ORDEN_CAPAS.map(function (id) {
            return envolver(id, "");
        }).join("") + "</g>";
    }

    /** Silueta vacía: cabeza y tronco punteados y las articulaciones donde encajan las piezas. */
    function silueta() {
        var S = P.ESQUELETO.sockets;
        var ch = S.cuello;
        var pe = S.pecho;
        var html = '<g class="c-silueta-cuerpo">' +
            '<circle class="c-sil-cabeza" cx="' + ch.x + '" cy="' + (ch.y - 40) + '" r="40"/>' +
            '<path class="c-sil-tronco" transform="translate(' + pe.x + "," + pe.y + ')" d="M-16,-61 Q0,-52 16,-61 L31,-59.5 Q43,-57 45.5,-45 L44.5,28 L45.5,66 Q33,72.5 20,70.5 L6,56 Q0,53 -6,56 L-20,70.5 Q-33,72.5 -45.5,66 L-44.5,28 L-45.5,-45 Q-43,-57 -31,-59.5 Z"/>' +
            "</g>";
        html += '<g class="c-sockets">';
        Object.keys(S).forEach(function (k) {
            var s = S[k];
            var grande = k === "cuello" || k === "pecho";
            html += '<g class="c-socket' + (grande ? " c-socket-centro" : "") + '" data-socket="' + k + '" transform="translate(' + s.x + "," + s.y + ')">' +
                '<circle class="c-socket-halo" r="' + (grande ? 20 : 17) + '"/>' +
                '<circle class="c-socket-aro" r="' + (grande ? 11 : 9.5) + '"/>' +
                '<circle class="c-socket-punto" r="3.6"/>' +
                "</g>";
        });
        html += "</g>";
        return html;
    }

    /** Fija los ángulos de una extremidad ya dibujada (todas sus pasadas). */
    function aplicar(raiz, id, ang) {
        if (!raiz || !P.esExtremidad(id)) return;
        var nodo = raiz.matches && raiz.matches('.m-parte[data-id="' + id + '"]')
            ? raiz
            : raiz.querySelector('.m-parte[data-id="' + id + '"]');
        if (!nodo) return;
        var rot = P.aPantalla(id, ang);
        var l1 = P.PIEZAS[id].tipo === "brazo" ? P.ESQUELETO.brazo.l1 : P.ESQUELETO.pierna.l1;
        nodo.querySelectorAll(".m-prox").forEach(function (g) {
            g.setAttribute("transform", "rotate(" + f(rot.p) + ")");
        });
        nodo.querySelectorAll(".m-dist").forEach(function (g) {
            g.setAttribute("transform", "translate(0," + l1 + ") rotate(" + f(rot.d) + ")");
        });
    }

    function aplicarTodo(raiz, angulos) {
        P.EXTREMIDADES.forEach(function (id) {
            if (angulos && angulos[id]) aplicar(raiz, id, angulos[id]);
        });
    }

    /** viewBox de la ficha de la bandeja (ajustado a la pieza estirada). */
    function vistaFicha(id) {
        if (id === "cabeza") return "-48 -100 96 100";
        if (id === "tronco") return "-58 -76 116 152";
        // La ficha muestra la extremidad estirada hacia abajo: el giro se ve en el taller.
        if (id.indexOf("pierna") === 0) return "-30 -20 60 144";
        return "-28 -18 56 132";
    }

    function svgNS(tag) {
        return document.createElementNS("http://www.w3.org/2000/svg", tag);
    }

    /** Inserta markup SVG dentro de un nodo SVG (sirve también en navegadores viejos). */
    function pintar(nodo, markup) {
        if (!nodo) return;
        try {
            nodo.innerHTML = markup;
        } catch (e) {
            var tmp = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + "</svg>", "image/svg+xml");
            while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
            Array.prototype.slice.call(tmp.documentElement.childNodes).forEach(function (n) {
                nodo.appendChild(document.importNode(n, true));
            });
        }
    }

    global.Muneco = {
        precargar: precargar,
        ORDEN_CAPAS: ORDEN_CAPAS,
        parte: parte,
        figura: figura,
        ranuras: ranuras,
        silueta: silueta,
        aplicar: aplicar,
        aplicarTodo: aplicarTodo,
        vistaFicha: vistaFicha,
        pintar: pintar,
        svgNS: svgNS
    };
})(window);
