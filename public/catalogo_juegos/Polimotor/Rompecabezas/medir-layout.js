/**
 * Mide posiciones reales de las piezas SVG (misma geometría que el juego DOM)
 * para alimentar el tablero Phaser sin adivinar coordenadas.
 */
(function (global) {
    'use strict';

    function extraerHijosSvg(texto) {
        if (!texto) return [];
        var doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
        var root = doc.documentElement;
        if (!root || root.nodeName.toLowerCase() !== 'svg') return [];
        var hijos = [];
        for (var i = 0; i < root.childNodes.length; i++) {
            var n = root.childNodes[i];
            if (n.nodeType === 1) hijos.push(n);
        }
        return hijos;
    }

    function appendCapa(destino, textoSvg, clase) {
        var capa = document.createElementNS(destino.namespaceURI, 'g');
        capa.setAttribute('class', clase);
        extraerHijosSvg(textoSvg).forEach(function (nodo) {
            capa.appendChild(document.importNode(nodo, true));
        });
        destino.appendChild(capa);
        return capa;
    }

    function leer(ruta) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', ruta, false);
        xhr.send();
        return xhr.status === 200 ? xhr.responseText : '';
    }

    /**
     * @param {object} opts
     * @param {object} opts.layout  layoutSvg del nivel
     * @param {function} opts.rutaPieza (archivo, variante) => url
     * @returns {{piezas:Array, fondo?:string}}
     */
    function medir(opts) {
        opts = opts || {};
        var layout = opts.layout;
        if (!layout || !layout.lienzo || !Array.isArray(layout.piezas)) {
            return { piezas: [] };
        }

        var host = document.getElementById('medida-svg');
        if (!host) {
            host = document.createElement('div');
            host.id = 'medida-svg';
            host.setAttribute('aria-hidden', 'true');
            host.style.cssText = 'position:fixed;left:-10000px;top:0;width:389px;height:522px;overflow:hidden;pointer-events:none;opacity:0;';
            document.body.appendChild(host);
        }
        host.innerHTML = '';

        var W = layout.lienzo.w;
        var H = layout.lienzo.h;
        host.style.width = W + 'px';
        host.style.height = H + 'px';

        var NS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        svg.setAttribute('width', String(W));
        svg.setAttribute('height', String(H));
        svg.style.width = W + 'px';
        svg.style.height = H + 'px';
        svg.style.display = 'block';
        // No aplicar CSS scale aquí: Phaser escala el tablero con layout.escala.

        (layout.piezas || []).forEach(function (p) {
            var g = document.createElementNS(NS, 'g');
            g.setAttribute('class', 'svg-parte');
            g.setAttribute('data-id', p.id);
            g.style.transform = 'translate(' + Number(p.x || 0) + '%, ' + Number(p.y || 0) + '%)';
            g.style.transformBox = 'view-box';
            g.style.transformOrigin = '0 0';
            var archivo = p.archivo;
            var grisTxt = leer(opts.rutaPieza(archivo, 'gris'));
            var colorTxt = leer(opts.rutaPieza(archivo, 'color'));
            appendCapa(g, grisTxt, 'svg-parte-gris');
            appendCapa(g, colorTxt, 'svg-parte-color');
            svg.appendChild(g);
        });

        host.appendChild(svg);
        // Forzar layout
        void svg.getBoundingClientRect();

        var svgRect = svg.getBoundingClientRect();
        var piezas = [];
        (layout.piezas || []).forEach(function (p) {
            var g = svg.querySelector('.svg-parte[data-id="' + p.id + '"]');
            var capa = g && (g.querySelector('.svg-parte-color') || g);
            var r = capa ? capa.getBoundingClientRect() : null;
            if (!r || r.width < 1 || r.height < 1) {
                piezas.push({
                    id: p.id,
                    archivo: p.archivo,
                    gris: opts.rutaPieza(p.archivo, 'gris'),
                    color: opts.rutaPieza(p.archivo, 'color'),
                    fx: 0.2,
                    fy: 0.2,
                    fw: 0.25,
                    fh: 0.25
                });
                return;
            }
            piezas.push({
                id: p.id,
                archivo: p.archivo,
                gris: opts.rutaPieza(p.archivo, 'gris'),
                color: opts.rutaPieza(p.archivo, 'color'),
                fx: (r.left - svgRect.left) / Math.max(1, svgRect.width),
                fy: (r.top - svgRect.top) / Math.max(1, svgRect.height),
                fw: r.width / Math.max(1, svgRect.width),
                fh: r.height / Math.max(1, svgRect.height)
            });
        });

        host.innerHTML = '';
        return {
            piezas: piezas,
            fondo: opts.fondo || 'img/fondo.png',
            lienzo: layout.lienzo,
            escala: Number(layout.escala) || 100
        };
    }

    global.PedniaRompecabezasMedir = { medir: medir };
})(typeof window !== 'undefined' ? window : this);
