/**
 * Muneco — dibujo SVG articulado de Zeus (modelo, figura armada, fichas y fantasma).
 *
 * Cada extremidad se dibuja en DOS pasadas iguales: primero el contorno (formas engrosadas en el
 * color del borde) y encima el relleno. Así el codo y la rodilla giran sin que aparezca la línea
 * de corte entre segmentos: los dos segmentos comparten el mismo contorno de fondo.
 *
 * Estructura de una extremidad:
 *   g.m-parte[data-id]
 *     g.m-pasada.m-contorno > g.m-prox(rotate) > formas + g.m-dist(translate+rotate) > formas
 *     g.m-pasada.m-relleno  > (igual, con detalles)
 * Depende de window.Postura.
 */
(function (global) {
    "use strict";

    var P = global.Postura;

    var C = {
        piel: "#f3c6b6",
        pielSombra: "#e7ab9a",
        borde: "#b9786a",
        camiseta: "#2f8f70",
        camisetaSombra: "#257459",
        ribete: "#8fd07f",
        short: "#0a5677",
        shortSombra: "#06405a",
        pelo: "#7d3f1b",
        peloSombra: "#5b2c11",
        media: "#ffffff",
        mediaRaya: "#d9dde3",
        zapato: "#2f8f70",
        suela: "#ffffff",
        mejilla: "#f29a8e",
        boca: "#a9443a",
        izq: "#ffd43b",
        der: "#51cf66",
        izqBorde: "#d9a400",
        derBorde: "#2b9a44"
    };

    function f(n) {
        return Math.round(n * 100) / 100;
    }

    // ---------- Formas base de cada segmento (comparten contorno y relleno) ----------

    function formasBrazoArriba() {
        return [
            // Piel del brazo (termina redonda en el codo).
            '<path class="m-piel" d="M-9.6,6 L-8.8,50 A8.8,8.8 0 0 0 8.8,50 L9.6,6 Z"/>',
            // Manga de la camiseta con su tapa redonda en el hombro.
            '<path class="m-camiseta" d="M-13.6,0 Q-14.4,15 -13.8,27 Q0,31.5 13.8,27 Q14.4,15 13.6,0 A13.6,13.6 0 0 0 -13.6,0 Z"/>'
        ];
    }

    function formasBrazoAbajo(s) {
        var t = s; // pulgar hacia el centro del cuerpo
        return [
            '<circle class="m-piel" cx="0" cy="0" r="8.8"/>',
            '<path class="m-piel" d="M-8.8,0 L-7.8,40 L7.8,40 L8.8,0 Z"/>',
            '<ellipse class="m-piel" cx="' + f(t * 8.6) + '" cy="40.5" rx="4.4" ry="7.4" transform="rotate(' + f(-t * 28) + ' ' + f(t * 8.6) + ' 40.5)"/>',
            '<ellipse class="m-piel" cx="0" cy="47.5" rx="10.2" ry="11.6"/>'
        ];
    }

    function formasPiernaArriba() {
        return [
            '<path class="m-piel" d="M-11.2,18 L-10.6,56 A10.6,10.6 0 0 0 10.6,56 L11.2,18 Z"/>',
            '<path class="m-short" d="M-16.4,0 L-16,27 Q0,31 16,27 L16.4,0 A16.4,16.4 0 0 0 -16.4,0 Z"/>'
        ];
    }

    function formasPiernaAbajo(s) {
        var o = -s; // la punta del zapato mira hacia afuera
        return [
            '<circle class="m-piel" cx="0" cy="0" r="10.6"/>',
            '<path class="m-piel" d="M-10.6,0 L-9.4,34 L9.4,34 L10.6,0 Z"/>',
            '<path class="m-media" d="M-9.8,30 L-9.8,50 L9.8,50 L9.8,30 Z"/>',
            '<path class="m-zapato" d="M' + f(-12 + o * 2) + ',49 Q' + f(-13 + o * 3) + ',62 ' + f(o * 6) + ',63.5 Q' + f(o * 19) + ',64 ' + f(o * 18) + ',57 Q' + f(o * 16) + ',50 ' + f(12 - o * 2) + ',48 Z"/>'
        ];
    }

    // ---------- Detalles que solo van en el relleno ----------

    function detallesBrazoArriba() {
        return '<path d="M-13.8,22.6 Q0,27 13.8,22.6 L13.9,27.4 Q0,32 -13.9,27.4 Z" fill="' + C.ribete + '"/>' +
            '<path d="M5,4 Q8,14 7,24" fill="none" stroke="' + C.camisetaSombra + '" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>';
    }

    function detallesBrazoAbajo(s, color, colorBorde) {
        return '<rect x="-8.9" y="30.5" width="17.8" height="7.2" rx="3" fill="' + color + '" stroke="' + colorBorde + '" stroke-width="1.4"/>' +
            '<path d="M-4.2,52.5 L-4.2,57.2 M0,53.4 L0,58.4 M4.2,52.5 L4.2,57.2" stroke="' + C.borde + '" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>';
    }

    function detallesPiernaArriba() {
        return '<path d="M-16,22.4 Q0,26.5 16,22.4 L16,27 Q0,31 -16,27 Z" fill="' + C.shortSombra + '"/>' +
            '<path d="M-5,40 Q-1,44 4,41" fill="none" stroke="' + C.pielSombra + '" stroke-width="2" stroke-linecap="round"/>';
    }

    function detallesPiernaAbajo(s, color, colorBorde) {
        var o = -s;
        return '<path d="M-9.4,4 Q0,8 9.4,4" fill="none" stroke="' + C.pielSombra + '" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
            '<path d="M-4,36 L-4,48 M0,36 L0,48 M4,36 L4,48" stroke="' + C.mediaRaya + '" stroke-width="1.2"/>' +
            '<rect x="-9.8" y="30" width="19.6" height="5.6" rx="2" fill="' + color + '" stroke="' + colorBorde + '" stroke-width="1.2"/>' +
            '<path d="M' + f(-12 + o * 2) + ',59.5 Q' + f(o * 6) + ',65.5 ' + f(o * 18.5) + ',58.5" fill="none" stroke="' + C.suela + '" stroke-width="3.4" stroke-linecap="round"/>' +
            '<path d="M' + f(-6 + o * 3) + ',53.5 Q' + f(o * 6) + ',50.5 ' + f(6 + o * 7) + ',53.5 M' + f(-5 + o * 4) + ',57 Q' + f(o * 7) + ',54 ' + f(7 + o * 7) + ',57" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>';
    }

    function pasada(clase, formasArriba, formasAbajo, detallesArriba, detallesAbajo, l1, rot) {
        return '<g class="m-pasada ' + clase + '">' +
            '<g class="m-prox" transform="rotate(' + f(rot.p) + ')">' +
            formasArriba.join("") + (detallesArriba || "") +
            '<g class="m-dist" transform="translate(0,' + l1 + ') rotate(' + f(rot.d) + ')">' +
            formasAbajo.join("") + (detallesAbajo || "") +
            "</g></g></g>";
    }

    function extremidad(id, ang) {
        var pz = P.PIEZAS[id];
        var s = P.signo(id);
        var rot = P.aPantalla(id, ang || { a: 0, b: 0 });
        var color = pz.lado === "izq" ? C.izq : C.der;
        var colorBorde = pz.lado === "izq" ? C.izqBorde : C.derBorde;
        var brazo = pz.tipo === "brazo";
        var l1 = brazo ? P.ESQUELETO.brazo.l1 : P.ESQUELETO.pierna.l1;
        var arriba = brazo ? formasBrazoArriba() : formasPiernaArriba();
        var abajo = brazo ? formasBrazoAbajo(s) : formasPiernaAbajo(s);
        return '<g class="m-parte m-' + pz.tipo + " m-" + pz.lado + '" data-id="' + id + '">' +
            pasada("m-contorno", arriba, abajo, "", "", l1, rot) +
            pasada("m-relleno", arriba, abajo,
                brazo ? detallesBrazoArriba() : detallesPiernaArriba(),
                brazo ? detallesBrazoAbajo(s, color, colorBorde) : detallesPiernaAbajo(s, color, colorBorde),
                l1, rot) +
            "</g>";
    }

    function tronco() {
        var cuerpo = [
            '<path class="m-piel" d="M-8.5,-72 L-8.5,-52 L8.5,-52 L8.5,-72 Z"/>',
            '<path class="m-short" d="M-41,22 L41,22 L43.5,70 Q31,75 19,72.5 L5,57 Q0,54.5 -5,57 L-19,72.5 Q-31,75 -43.5,70 Z"/>',
            '<path class="m-camiseta" d="M-29,-59 Q0,-50 29,-59 L42,-52 Q49,-43 47,-30 L44.5,30 Q0,39 -44.5,30 L-47,-30 Q-49,-43 -42,-52 Z"/>'
        ];
        var detalles =
            '<path d="M-41.5,30 L41.5,30" stroke="' + C.shortSombra + '" stroke-width="3"/>' +
            '<path d="M-2,42 L-2,56" stroke="' + C.shortSombra + '" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M-30,46 Q-24,50 -18,46" fill="none" stroke="' + C.shortSombra + '" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M30,-24 Q40,-6 38,26 Q44,10 44.5,-6 Z" fill="' + C.camisetaSombra + '" opacity=".6"/>' +
            '<path d="M-18,-57 Q0,-41 18,-57" fill="none" stroke="' + C.ribete + '" stroke-width="6" stroke-linecap="round"/>' +
            '<path d="M-14,-56 Q0,-46 14,-56 Q0,-52 -14,-56 Z" fill="' + C.pielSombra + '"/>' +
            '<path d="M-44.5,26 Q0,35 44.5,26 L44.5,30.5 Q0,39.5 -44.5,30.5 Z" fill="' + C.camisetaSombra + '" opacity=".7"/>' +
            // Estrella de la camiseta (marca de Zeus en el estudio).
            '<path d="M0,-28 L4.2,-19.5 L13.5,-18.2 L6.8,-11.6 L8.4,-2.4 L0,-6.8 L-8.4,-2.4 L-6.8,-11.6 L-13.5,-18.2 L-4.2,-19.5 Z" fill="#ffe08a" stroke="#f2b632" stroke-width="1.6" stroke-linejoin="round"/>';
        return '<g class="m-parte m-tronco" data-id="tronco">' +
            '<g class="m-pasada m-contorno">' + cuerpo.join("") + "</g>" +
            '<g class="m-pasada m-relleno">' + cuerpo.join("") + detalles + "</g>" +
            "</g>";
    }

    function cabeza() {
        var base = [
            '<circle class="m-piel" cx="-36" cy="-38" r="9"/>',
            '<circle class="m-piel" cx="36" cy="-38" r="9"/>',
            '<circle class="m-piel" cx="0" cy="-40" r="37"/>',
            '<path class="m-pelo" d="M-38,-40 Q-44,-76 -12,-84 Q4,-92 22,-84 Q44,-76 40,-42 Q37,-36 34,-44 Q30,-62 14,-63 Q8,-55 -4,-61 Q-14,-54 -26,-59 Q-33,-50 -35,-38 Z"/>'
        ];
        var detalles =
            '<circle cx="-36" cy="-38" r="4.4" fill="' + C.mejilla + '" opacity=".75"/>' +
            '<circle cx="36" cy="-38" r="4.4" fill="' + C.mejilla + '" opacity=".75"/>' +
            '<path d="M-6,-86 Q-2,-98 6,-92 Q2,-88 4,-84" fill="' + C.pelo + '" stroke="' + C.peloSombra + '" stroke-width="2" stroke-linejoin="round"/>' +
            '<path d="M-24,-70 Q-6,-80 14,-74 M-10,-78 Q8,-84 26,-72" fill="none" stroke="' + C.peloSombra + '" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
            '<path d="M-21,-51 Q-14,-56 -6,-51 M6,-51 Q14,-56 21,-51" fill="none" stroke="' + C.peloSombra + '" stroke-width="3.2" stroke-linecap="round"/>' +
            '<g class="m-ojos">' +
            '<ellipse cx="-13" cy="-39" rx="7.4" ry="8.4" fill="#fff"/>' +
            '<ellipse cx="13" cy="-39" rx="7.4" ry="8.4" fill="#fff"/>' +
            '<circle cx="-12.4" cy="-38" r="4.9" fill="#2a1712"/>' +
            '<circle cx="12.4" cy="-38" r="4.9" fill="#2a1712"/>' +
            '<circle cx="-10.8" cy="-40" r="1.7" fill="#fff"/>' +
            '<circle cx="14" cy="-40" r="1.7" fill="#fff"/>' +
            "</g>" +
            '<ellipse cx="-22" cy="-27" rx="6.4" ry="4.2" fill="' + C.mejilla + '" opacity=".45"/>' +
            '<ellipse cx="22" cy="-27" rx="6.4" ry="4.2" fill="' + C.mejilla + '" opacity=".45"/>' +
            '<ellipse cx="0" cy="-30.5" rx="3.6" ry="2.7" fill="' + C.pielSombra + '"/>' +
            '<path class="m-boca" d="M-11,-21.5 Q0,-7 11,-21.5 Q0,-18 -11,-21.5 Z" fill="' + C.boca + '"/>' +
            '<path d="M-7.6,-20.2 Q0,-18.2 7.6,-20.2 L7,-17.6 Q0,-16.2 -7,-17.6 Z" fill="#fff"/>';
        return '<g class="m-parte m-cabeza" data-id="cabeza">' +
            '<g class="m-cabeza-giro">' +
            '<g class="m-pasada m-contorno">' + base.join("") + "</g>" +
            '<g class="m-pasada m-relleno">' + base.join("") + detalles + "</g>" +
            "</g></g>";
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
            '<path class="c-sil-tronco" transform="translate(' + pe.x + "," + pe.y + ')" d="M-29,-59 Q0,-50 29,-59 L42,-52 Q49,-43 47,-30 L44.5,30 L43.5,70 Q31,75 19,72.5 L5,57 Q0,54.5 -5,57 L-19,72.5 Q-31,75 -43.5,70 L-44.5,30 L-47,-30 Q-49,-43 -42,-52 Z"/>' +
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
        if (id === "cabeza") return "-50 -96 100 100";
        if (id === "tronco") return "-58 -76 116 152";
        // La ficha muestra la extremidad estirada hacia abajo: el giro se ve en el taller.
        if (id.indexOf("pierna") === 0) return "-34 -20 68 88";
        return "-32 -16 64 82";
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
        COLORES: C,
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
