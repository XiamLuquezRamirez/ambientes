/**
 * Tablero — el escenario SVG del puzle (window.Tablero).
 *
 * Un solo <svg id="escenario-svg"> contiene la plataforma con la silueta (zona central) y la bandeja
 * de piezas (zona lateral). Su viewBox se ajusta a la forma de la pantalla:
 *   horizontal  silueta a la izquierda, bandeja a la derecha.
 *   vertical    silueta arriba, bandeja abajo (tabletas paradas).
 * Así piezas y silueta comparten coordenadas y la pieza encaja con el mismo tamaño que su hueco.
 *
 * Capas: .t-fondo (plataforma y bandeja) · .t-figura (silueta, neón, pistas y piezas encajadas,
 * en coordenadas de figura) · .t-libres (piezas sueltas) · .t-controles (flechas de giro).
 *
 * Estado de una pieza suelta: { id, p, el, cx, cy, ang, esc, casa:{cx,cy}, escCasa }.
 * (cx, cy) es su centro visual en coordenadas del escenario; esc es relativo a la escala de la figura.
 */
(function (global) {
    "use strict";

    var P = global.Posturas;
    var PZ = global.Piezas;
    var A = global.SiluetaAnim;
    var NS = "http://www.w3.org/2000/svg";

    var svg = null;
    var capas = {};
    var vista = { w: 1000, h: 620, horizontal: true };
    var zonas = { figura: null, bandeja: null };
    var fig = { x: 0, y: 0, s: 1 };
    var postura = null;
    var libres = {};
    var orden = [];
    var colocadas = {};

    function el(tag, attrs, padre) {
        var n = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
        if (padre) padre.appendChild(n);
        return n;
    }

    function montar(nodo) {
        svg = nodo;
        svg.innerHTML = "";
        var defs = el("defs", {}, svg);
        defs.innerHTML =
            '<filter id="t-neon-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>' +
            '<radialGradient id="t-plataforma" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0" stop-color="#7cf3ff" stop-opacity=".55"/><stop offset=".55" stop-color="#4c6ef5" stop-opacity=".22"/>' +
            '<stop offset="1" stop-color="#4c6ef5" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="t-bandeja" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#1b1446" stop-opacity=".95"/><stop offset="1" stop-color="#2b1d6b" stop-opacity=".95"/></linearGradient>';
        capas.fondo = el("g", { "class": "t-fondo" }, svg);
        capas.figura = el("g", { "class": "t-figura" }, svg);
        capas.silueta = el("g", { "class": "f-silueta" }, capas.figura);
        capas.pistas = el("g", { "class": "f-pistas" }, capas.figura);
        capas.neon = el("g", { "class": "f-neon" }, capas.figura);
        capas.piezas = el("g", { "class": "f-piezas" }, capas.figura);
        capas.chispas = el("g", { "class": "f-chispas" }, capas.figura);
        capas.libres = el("g", { "class": "t-libres" }, svg);
        capas.controles = el("g", { "class": "t-controles" }, svg);
        medir();
    }

    // ------------------------------------------------------------------ vista y zonas

    function medir() {
        if (!svg) return;
        var r = svg.getBoundingClientRect();
        var w = r.width || global.innerWidth;
        var h = r.height || global.innerHeight * 0.8;
        var aspecto = w / Math.max(1, h);
        if (aspecto >= 1.05) {
            vista = { w: 1000, h: Math.round(Math.max(470, Math.min(820, 1000 / aspecto))), horizontal: true };
            // En pantallas muy anchas la bandeja gana espacio (las piezas se ven más grandes).
            var corte = Math.round(vista.w * (aspecto > 1.6 ? 0.56 : 0.6));
            zonas.figura = { x: 10, y: 10, w: corte - 20, h: vista.h - 20 };
            zonas.bandeja = { x: corte + 4, y: 14, w: vista.w - corte - 16, h: vista.h - 28 };
        } else {
            vista = { w: 640, h: Math.round(Math.max(760, Math.min(1400, 640 / aspecto))), horizontal: false };
            var alto = Math.round(vista.h * 0.6);
            zonas.figura = { x: 10, y: 6, w: vista.w - 20, h: alto - 12 };
            zonas.bandeja = { x: 14, y: alto + 2, w: vista.w - 28, h: vista.h - alto - 14 };
        }
        svg.setAttribute("viewBox", "0 0 " + vista.w + " " + vista.h);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        pintarFondo();
    }

    function pintarFondo() {
        var zf = zonas.figura;
        var zb = zonas.bandeja;
        var cx = zf.x + zf.w / 2;
        var piso = zf.y + zf.h * 0.92;
        capas.fondo.innerHTML =
            '<g class="t-plataforma">' +
            '<ellipse cx="' + cx + '" cy="' + (zf.y + zf.h * 0.5) + '" rx="' + (zf.w * 0.46) + '" ry="' + (zf.h * 0.46) + '" fill="url(#t-plataforma)"/>' +
            '<ellipse class="t-aro" cx="' + cx + '" cy="' + piso + '" rx="' + (zf.w * 0.34) + '" ry="' + (zf.h * 0.05) + '"/>' +
            '<ellipse class="t-aro t-aro-2" cx="' + cx + '" cy="' + piso + '" rx="' + (zf.w * 0.24) + '" ry="' + (zf.h * 0.034) + '"/>' +
            "</g>" +
            '<g class="t-bandeja">' +
            '<rect x="' + zb.x + '" y="' + zb.y + '" width="' + zb.w + '" height="' + zb.h + '" rx="26" fill="url(#t-bandeja)"/>' +
            '<rect class="t-bandeja-borde" x="' + zb.x + '" y="' + zb.y + '" width="' + zb.w + '" height="' + zb.h + '" rx="26"/>' +
            "</g>";
    }

    function encuadrar() {
        if (!postura) return;
        var zf = zonas.figura;
        var c = postura.caja;
        var s = Math.min(zf.w * 0.9 / c.w, zf.h * 0.9 / c.h, 1.7);
        fig.s = s;
        fig.x = zf.x + zf.w / 2 - (c.x0 + c.w / 2) * s;
        fig.y = zf.y + zf.h / 2 - (c.y0 + c.h / 2) * s;
        capas.figura.setAttribute("transform", "translate(" + fig.x.toFixed(2) + "," + fig.y.toFixed(2) + ") scale(" + s.toFixed(4) + ")");
    }

    // ------------------------------------------------------------------ conversiones

    function aEscenario(clientX, clientY) {
        var m = svg.getScreenCTM();
        if (!m) return { x: clientX, y: clientY };
        var pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        var r = pt.matrixTransform(m.inverse());
        return { x: r.x, y: r.y };
    }

    function aPantalla(x, y) {
        var m = svg.getScreenCTM();
        if (!m) return { x: x, y: y };
        var pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        var r = pt.matrixTransform(m);
        return { x: r.x, y: r.y };
    }

    function figuraAEscenario(p) {
        return { x: fig.x + p.x * fig.s, y: fig.y + p.y * fig.s };
    }

    function escenarioAFigura(p) {
        return { x: (p.x - fig.x) / fig.s, y: (p.y - fig.y) / fig.s };
    }

    /** Píxeles de pantalla por unidad del escenario. */
    function pxPorUnidad() {
        var m = svg && svg.getScreenCTM();
        return m ? Math.abs(m.a) || 1 : 1;
    }

    // ------------------------------------------------------------------ carga de una postura

    /**
     * Pinta la silueta y reparte las piezas en la bandeja.
     * angulos = { id: ángulo inicial }, ordenBandeja = [ids] (ya barajados).
     */
    function cargar(nueva, angulos, ordenBandeja) {
        postura = nueva;
        libres = {};
        colocadas = {};
        orden = ordenBandeja.slice();
        capas.libres.innerHTML = "";
        capas.piezas.innerHTML = "";
        capas.neon.innerHTML = "";
        capas.pistas.innerHTML = "";
        capas.chispas.innerHTML = "";
        capas.controles.innerHTML = "";
        capas.figura.setAttribute("class", "t-figura pj-" + postura.personaje);
        capas.fondo.classList.remove("bandeja-vacia");
        capas.silueta.innerHTML = PZ.silueta(postura);
        encuadrar();
        orden.forEach(function (id) {
            var p = P.pieza(postura, id);
            var nodo = PZ.crear(postura.personaje, p, "pieza-libre");
            // Área de toque generosa (las piezas pequeñas, como los tenis, son fáciles de tomar).
            var cl = P.centroLocal(p);
            el("circle", { "class": "pz-toque", cx: cl.x, cy: cl.y, r: Math.max(34, P.radio(p) * 0.8) }, nodo);
            capas.libres.appendChild(nodo);
            libres[id] = { id: id, p: p, el: nodo, cx: 0, cy: 0, ang: angulos[id] || 0, esc: 0.6, casa: { cx: 0, cy: 0 }, escCasa: 0.6 };
        });
        repartir(false);
    }

    /** Casillas de la bandeja: el número de columnas que deja las casillas más grandes. */
    function casillas(n) {
        var zb = zonas.bandeja;
        var cols = 1;
        var mejor = 0;
        for (var k = 1; k <= Math.min(4, n); k++) {
            var lado = Math.min(zb.w / k, zb.h / Math.ceil(n / k));
            if (lado > mejor + 0.5) {
                mejor = lado;
                cols = k;
            }
        }
        var filas = Math.ceil(n / cols);
        var cw = zb.w / cols;
        var ch = zb.h / filas;
        var res = [];
        for (var i = 0; i < n; i++) {
            var c = i % cols;
            var f = Math.floor(i / cols);
            // Desorden leve dentro de la casilla para que parezcan piezas sueltas.
            var dx = ((i * 37) % 11 - 5) * cw * 0.015;
            var dy = ((i * 53) % 9 - 4) * ch * 0.015;
            res.push({ cx: zb.x + cw * (c + 0.5) + dx, cy: zb.y + ch * (f + 0.5) + dy, r: Math.min(cw, ch) * 0.46 });
        }
        return res;
    }

    function repartir(animar) {
        var ids = orden.filter(function (id) { return libres[id]; });
        var cas = casillas(ids.length);
        ids.forEach(function (id, i) {
            var e = libres[id];
            // Cada pieza llena su casilla (las pequeñas no se pierden); al elegirla crece a su tamaño real.
            var esc = Math.max(0.34, Math.min(0.9, cas[i].r / (P.radio(e.p) * 0.9 * fig.s)));
            e.casa = { cx: cas[i].cx, cy: cas[i].cy };
            e.escCasa = esc;
            if (e.enMano) return;
            if (animar) {
                llevar(e, { cx: e.casa.cx, cy: e.casa.cy, esc: esc }, 380, "salida");
            } else {
                e.cx = e.casa.cx;
                e.cy = e.casa.cy;
                e.esc = esc;
                aplicar(e);
            }
        });
    }

    /** Reacomoda todo al cambiar el tamaño de la pantalla. */
    function reacomodar() {
        medir();
        if (!postura) return;
        encuadrar();
        repartir(false);
    }

    // ------------------------------------------------------------------ piezas sueltas

    function estado(id) {
        return libres[id] || null;
    }

    function escalaReal(e) {
        return fig.s * e.esc;
    }

    /** Pivote de la pieza en el escenario a partir de su centro, ángulo y escala. */
    function pivote(e) {
        var cl = P.centroLocal(e.p);
        var r = P.rotar(P.escalar(cl, escalaReal(e)), e.ang);
        return { x: e.cx - r.x, y: e.cy - r.y };
    }

    function aplicar(e) {
        var pv = pivote(e);
        e.el.setAttribute("transform", PZ.transformar({ x: pv.x, y: pv.y, angulo: e.ang }, escalaReal(e)));
    }

    /** Mantiene el centro dentro del escenario. */
    function limitar(e) {
        var r = P.radio(e.p) * escalaReal(e) * 0.55;
        e.cx = Math.max(r, Math.min(vista.w - r, e.cx));
        e.cy = Math.max(r, Math.min(vista.h - r, e.cy));
    }

    function mover(e, cx, cy) {
        e.cx = cx;
        e.cy = cy;
        limitar(e);
        aplicar(e);
    }

    var CAMPOS = ["cx", "cy", "ang", "esc"];

    /**
     * Tween de centro, ángulo y/o escala: solo anima los campos que trae `hacia`, así un giro o un
     * cambio de tamaño no pelea con el arrastre (que mueve cx, cy). Cada campo tiene su propio tween.
     */
    function llevar(e, hacia, ms, easing) {
        if (!e.tweens) e.tweens = {};
        var campos = CAMPOS.filter(function (k) { return hacia[k] != null; });
        var desde = {};
        campos.forEach(function (k) {
            if (e.tweens[k]) e.tweens[k].cancelar();
            desde[k] = e[k];
        });
        var tw = A.tween(ms, function (t) {
            campos.forEach(function (k) { e[k] = A.lerp(desde[k], hacia[k], t); });
            if (e.cx != null) limitarSuave(e);
            aplicar(e);
            if (typeof hacia.onFrame === "function") hacia.onFrame(e);
        }, easing || "suave");
        campos.forEach(function (k) { e.tweens[k] = tw; });
        return tw.promesa.then(function (ok) {
            if (ok) {
                campos.forEach(function (k) {
                    e[k] = hacia[k];
                    if (e.tweens[k] === tw) delete e.tweens[k];
                });
                aplicar(e);
            }
            return ok;
        });
    }

    /** Durante los tweens solo se limita si la pieza crece fuera del escenario. */
    function limitarSuave(e) {
        if (e.encajando) return;
        limitar(e);
    }

    /** Lleva la pieza al frente de las demás. */
    function alFrente(e) {
        if (e && e.el && e.el.parentNode) e.el.parentNode.appendChild(e.el);
    }

    /** Vuelta a la bandeja con un rebote suave (conserva el giro que haya hecho el niño). */
    function regresar(e) {
        return llevar(e, { cx: e.casa.cx, cy: e.casa.cy, esc: e.escCasa }, 560, "rebote");
    }

    /** Centro de la pieza en coordenadas de figura (para validar). */
    function centroFigura(e) {
        return escenarioAFigura({ x: e.cx, y: e.cy });
    }

    /** Centro del hueco en el escenario. */
    function centroHueco(hueco) {
        return figuraAEscenario(hueco.centro);
    }

    // ------------------------------------------------------------------ encaje

    function nodoEncajado(p) {
        var g = PZ.crear(postura.personaje, p, "pieza-encajada encajada");
        g.setAttribute("data-slot", p.id);
        g.setAttribute("transform", PZ.transformar({ x: p.pivote.x, y: p.pivote.y, angulo: p.angulo }, 1));
        return g;
    }

    /**
     * La pieza vuela a su hueco (centro, ángulo y tamaño reales), se suelta y queda en la figura
     * como parte de la sombra con borde neón.
     */
    async function encajar(e, hueco, ms) {
        var c = centroHueco(hueco);
        var meta = e.ang + P.normalizar(hueco.angulo - e.ang);
        e.encajando = true;
        await llevar(e, { cx: c.x, cy: c.y, ang: meta, esc: 1 }, ms || 260, "salida");
        e.el.remove();
        delete libres[e.id];
        capas.fondo.classList.toggle("bandeja-vacia", !Object.keys(libres).length);
        colocadas[hueco.id] = true;
        var g = nodoEncajado(hueco);
        g.classList.add("recien");
        capas.piezas.appendChild(g);
        ordenarEncajadas();
        var neon = el("g", { "class": "neon-parte", "data-slot": hueco.id, transform: g.getAttribute("transform") }, capas.neon);
        neon.innerHTML = PZ.formas(postura.personaje, hueco);
        var sil = capas.silueta.querySelectorAll('[data-slot="' + hueco.id + '"]');
        sil.forEach(function (n) { n.classList.add("encendida"); });
        setTimeout(function () { g.classList.remove("recien"); }, 900);
        return g;
    }

    /** Respeta el orden de capas (lo de atrás primero). */
    function ordenarEncajadas() {
        var nodos = Array.prototype.slice.call(capas.piezas.children);
        nodos.sort(function (a, b) {
            return P.CAPAS.indexOf(a.getAttribute("data-slot")) - P.CAPAS.indexOf(b.getAttribute("data-slot"));
        });
        nodos.forEach(function (n) { capas.piezas.appendChild(n); });
    }

    function encajada(id) {
        return capas.piezas.querySelector('[data-slot="' + id + '"]');
    }

    /** Aplica una pose (resultado de Posturas.cinematica) a las piezas encajadas y su neón. */
    function posar(poseMap) {
        Object.keys(poseMap).forEach(function (id) {
            var tr = PZ.transformar({ x: poseMap[id].x, y: poseMap[id].y, angulo: poseMap[id].angulo }, 1);
            var a = encajada(id);
            if (a) a.setAttribute("transform", tr);
            var n = capas.neon.querySelector('[data-slot="' + id + '"]');
            if (n) n.setAttribute("transform", tr);
        });
    }

    // ------------------------------------------------------------------ resaltes y pistas

    /** Ilumina en la silueta las partes indicadas (clase: objetivo | listo | cerca | mira). */
    function resaltar(ids, clase) {
        capas.silueta.querySelectorAll(".sil-resalte").forEach(function (n) {
            n.classList.toggle(clase, ids.indexOf(n.getAttribute("data-slot")) !== -1);
        });
    }

    function limpiarResaltes() {
        ["objetivo", "listo", "cerca", "mira"].forEach(function (c) { resaltar([], c); });
    }

    function mostrarPista(hueco) {
        if (capas.pistas.querySelector('[data-slot="' + hueco.id + '"]')) return;
        capas.pistas.insertAdjacentHTML("beforeend", PZ.pista(postura, hueco));
    }

    function quitarPista(id) {
        var n = capas.pistas.querySelector('[data-slot="' + id + '"]');
        if (n) n.remove();
    }

    /** Chispa SVG en una articulación (coordenadas de figura). */
    function chispa(p, color) {
        var g = el("g", { "class": "f-chispa", transform: "translate(" + p.x.toFixed(1) + "," + p.y.toFixed(1) + ")" }, capas.chispas);
        g.innerHTML = '<g class="f-chispa-in"><circle r="16" fill="none" stroke="' + (color || "#7cf3ff") + '" stroke-width="5"/>' +
            '<path d="M0,-24 L4,-4 L24,0 L4,4 L0,24 L-4,4 L-24,0 L-4,-4 Z" fill="#ffffff"/></g>';
        setTimeout(function () { g.remove(); }, 900);
        var pt = figuraAEscenario(p);
        return aPantalla(pt.x, pt.y);
    }

    function rectFigura() {
        var r = capas.figura.getBoundingClientRect();
        return r;
    }

    global.Tablero = {
        montar: montar,
        medir: medir,
        reacomodar: reacomodar,
        cargar: cargar,
        estado: estado,
        libres: function () { return libres; },
        colocadas: function () { return colocadas; },
        postura: function () { return postura; },
        vista: function () { return vista; },
        zonas: function () { return zonas; },
        figura: function () { return capas.figura; },
        capa: function (n) { return capas[n]; },
        escala: function () { return fig.s; },
        escalaReal: escalaReal,
        aEscenario: aEscenario,
        aPantalla: aPantalla,
        figuraAEscenario: figuraAEscenario,
        escenarioAFigura: escenarioAFigura,
        pxPorUnidad: pxPorUnidad,
        aplicar: aplicar,
        mover: mover,
        llevar: llevar,
        alFrente: alFrente,
        regresar: regresar,
        centroFigura: centroFigura,
        centroHueco: centroHueco,
        encajar: encajar,
        encajada: encajada,
        posar: posar,
        resaltar: resaltar,
        limpiarResaltes: limpiarResaltes,
        mostrarPista: mostrarPista,
        quitarPista: quitarPista,
        chispa: chispa,
        rectFigura: rectFigura
    };
})(window);
