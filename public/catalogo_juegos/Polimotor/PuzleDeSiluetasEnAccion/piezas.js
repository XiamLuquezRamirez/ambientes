/**
 * Piezas — arma el SVG de cada pieza corporal y de la silueta oscura (window.Piezas).
 *
 * Una pieza libre o encajada lleva tres capas que comparten las mismas formas (Personajes.base):
 *   .pz-neon    contorno luminoso (debajo; se enciende al encajar y en la transformación final)
 *   .pz-color   la pieza a color con sus detalles
 *   .pz-sombra  copia oscura encima: al encajar la pieza "entra" en la sombra con borde neón;
 *               en la transformación final se desvanece y vuelven los colores.
 * La silueta se dibuja en dos pasadas (todos los contornos y luego todos los rellenos) para que las
 * uniones entre partes no muestren líneas, y una capa de resaltes con el borde de cada parte.
 */
(function (global) {
    "use strict";

    var P = global.Posturas;
    var PJ = global.Personajes;

    function transformar(pose, escala) {
        var s = escala != null ? escala : 1;
        return "translate(" + pose.x.toFixed(2) + "," + pose.y.toFixed(2) + ") rotate(" + Number(pose.angulo).toFixed(2) + ")" +
            (s !== 1 ? " scale(" + s.toFixed(4) + ")" : "");
    }

    function capasPieza(pj, p) {
        var d = PJ.dibujo(pj, p);
        // Brazos juntos: el de atrás va completo (formas y detalles) y luego el de adelante.
        var formasColor = d.atras ? d.atras + d.frente : d.base;
        return '<g class="pz-neon">' + d.base + "</g>" +
            '<g class="pz-color">' + formasColor + '<g class="pz-detalle">' + d.detalle + "</g></g>" +
            '<g class="pz-sombra">' + d.base + "</g>";
    }

    /** Solo las formas base (para silueta, pistas y contornos). */
    function formas(pj, p) {
        return PJ.dibujo(pj, p).base;
    }

    /** Elemento <g> de una pieza (libre o encajada). Devuelve el nodo SVG. */
    function crear(pj, p, clase) {
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "pieza " + (clase || "") + " pieza-" + p.tipo + (p.lado ? " lado-" + p.lado : ""));
        g.setAttribute("data-id", p.id);
        g.innerHTML = '<g class="pz-cuerpo">' + capasPieza(pj, p) + "</g>";
        return g;
    }

    /**
     * Silueta oscura de la postura, en coordenadas de figura.
     * Marca los tobillos con el color del lado (pista de lateralidad para los tenis).
     */
    function silueta(postura) {
        var pj = postura.personaje;
        var contornos = "";
        var rellenos = "";
        var resaltes = "";
        var tobillos = "";
        postura.piezas.forEach(function (p) {
            var tr = transformar({ x: p.pivote.x, y: p.pivote.y, angulo: p.angulo }, 1);
            var base = formas(pj, p);
            contornos += '<g class="sil-parte" data-slot="' + p.id + '" transform="' + tr + '">' + base + "</g>";
            rellenos += '<g class="sil-parte" data-slot="' + p.id + '" transform="' + tr + '">' + base + "</g>";
            resaltes += '<g class="sil-resalte" data-slot="' + p.id + '" transform="' + tr + '">' + base + "</g>";
            if (p.tipo === "tenis") {
                var color = (PJ.LADOS[p.lado] || PJ.LADOS.der).tenis;
                tobillos += '<g class="sil-tobillo" data-slot="' + p.id + '" transform="translate(' + p.pivote.x.toFixed(1) + "," + p.pivote.y.toFixed(1) + ')">' +
                    '<circle r="11" fill="none" stroke="' + color + '" stroke-width="5"/>' +
                    '<circle r="4" fill="' + color + '"/></g>';
            }
        });
        return '<g class="sil-contornos">' + contornos + "</g>" +
            '<g class="sil-rellenos">' + rellenos + "</g>" +
            '<g class="sil-tobillos">' + tobillos + "</g>" +
            '<g class="sil-resaltes">' + resaltes + "</g>";
    }

    /** Sombra punteada con la orientación correcta (pista tras varios intentos o botón de ayuda). */
    function pista(postura, p) {
        return '<g class="pz-pista" data-slot="' + p.id + '" transform="' +
            transformar({ x: p.pivote.x, y: p.pivote.y, angulo: p.angulo }, 1) + '">' + formas(postura.personaje, p) + "</g>";
    }

    global.Piezas = {
        transformar: transformar,
        capasPieza: capasPieza,
        formas: formas,
        crear: crear,
        silueta: silueta,
        pista: pista,
        centroLocal: P.centroLocal
    };
})(window);
