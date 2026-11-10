/**
 * Arrastre — lleva una pieza (fantasma SVG) desde el taller o la bandeja hasta la silueta.
 *
 * El fantasma se dibuja a la escala de la zona de construcción y sigue al dedo conservando el
 * punto por donde se tomó la pieza. Se informa el pivote (hombro, cadera, cuello o pecho) en
 * unidades del cuerpo; la decisión (encaja, regresa, pista) la toma script.js.
 * Funciona con ratón, lápiz y pantallas táctiles (Pointer Events).
 * Depende de Postura, Muneco y EspejoAnim.
 */
(function (global) {
    "use strict";

    var P = global.Postura;
    var M = global.Muneco;
    var A = global.EspejoAnim;

    var MEDIA = 130; // medio lado del viewBox del fantasma
    var cfg = {};
    var actual = null;

    function tablero() {
        return cfg.tablero || null;
    }

    function ctmTablero() {
        var t = tablero();
        return t && t.getScreenCTM ? t.getScreenCTM() : null;
    }

    function escala() {
        var ctm = ctmTablero();
        return ctm ? ctm.a : 1;
    }

    function aPantalla(x, y) {
        var t = tablero();
        var ctm = ctmTablero();
        if (!t || !ctm) return { x: x, y: y };
        var pt = t.createSVGPoint();
        pt.x = x;
        pt.y = y;
        var r = pt.matrixTransform(ctm);
        return { x: r.x, y: r.y };
    }

    function aTablero(x, y) {
        var t = tablero();
        var ctm = ctmTablero();
        if (!t || !ctm) return { x: x, y: y };
        var pt = t.createSVGPoint();
        pt.x = x;
        pt.y = y;
        var r = pt.matrixTransform(ctm.inverse());
        return { x: r.x, y: r.y };
    }

    function socketPantalla(socketId) {
        var s = P.ESQUELETO.sockets[socketId];
        return s ? aPantalla(s.x, s.y) : null;
    }

    function crearFantasma(id, ang) {
        var svg = M.svgNS("svg");
        svg.setAttribute("class", "pieza-fantasma");
        svg.setAttribute("viewBox", -MEDIA + " " + -MEDIA + " " + MEDIA * 2 + " " + MEDIA * 2);
        svg.setAttribute("aria-hidden", "true");
        var g = M.svgNS("g");
        g.setAttribute("class", "fantasma-pieza");
        svg.appendChild(g);
        M.pintar(g, M.parte(id, ang));
        document.body.appendChild(svg);
        var k = escala();
        var lado = MEDIA * 2 * k;
        svg.style.width = lado + "px";
        svg.style.height = lado + "px";
        return { svg: svg, g: g, k: k, lado: lado };
    }

    function limitar(p) {
        var m = 8;
        return {
            x: Math.max(m, Math.min(global.innerWidth - m, p.x)),
            y: Math.max(m, Math.min(global.innerHeight - m, p.y))
        };
    }

    function ubicar(f, pivote) {
        if (!f) return;
        f.svg.style.transform = "translate3d(" + (pivote.x - f.lado / 2).toFixed(1) + "px," + (pivote.y - f.lado / 2).toFixed(1) + "px,0)";
        f.pivote = pivote;
    }

    function tipo(id) {
        return (P.PIEZAS[id] || {}).tipo;
    }

    function socketBajo(id, pivotePx, radioUnidades) {
        var u = aTablero(pivotePx.x, pivotePx.y);
        return P.socketCercano(u, radioUnidades, P.socketsDe(tipo(id)));
    }

    function radio(id, orientada) {
        var base = Number(cfg.radio) > 0 ? Number(cfg.radio) : 46;
        var amplio = Number(cfg.radioOrientada) > 0 ? Number(cfg.radioOrientada) : 70;
        return orientada ? amplio : base;
    }

    function marcarSocket(socketId) {
        var t = tablero();
        if (!t) return;
        t.querySelectorAll(".c-socket.cerca").forEach(function (s) {
            if (s.getAttribute("data-socket") !== socketId) s.classList.remove("cerca");
        });
        if (socketId) {
            var s = t.querySelector('.c-socket[data-socket="' + socketId + '"]');
            if (s) s.classList.add("cerca");
        }
    }

    function mover(ev) {
        if (!actual || ev.pointerId !== actual.pointerId) return;
        ev.preventDefault();
        var p = limitar({ x: ev.clientX - actual.offset.x, y: ev.clientY - actual.offset.y });
        ubicar(actual.f, p);
        var s = socketBajo(actual.id, p, radio(actual.id, actual.orientada));
        if (s !== actual.socket) {
            actual.socket = s;
            marcarSocket(s);
            if (typeof cfg.onCerca === "function") cfg.onCerca(actual.id, s);
        }
    }

    function terminar(ev) {
        if (!actual || (ev && ev.pointerId !== actual.pointerId)) return;
        global.removeEventListener("pointermove", mover);
        global.removeEventListener("pointerup", terminar);
        global.removeEventListener("pointercancel", terminar);
        var a = actual;
        a.suelto = true;
        marcarSocket(null);
        document.body.classList.remove("arrastrando-pieza");
        var socket = a.f.pivote ? socketBajo(a.id, a.f.pivote, radio(a.id, a.orientada)) : null;
        if (typeof cfg.onSoltar === "function") cfg.onSoltar(a.id, socket, P.copiar(a.ang), a);
    }

    /**
     * Empieza a arrastrar.
     * origen: { svg, pivote: {x,y} unidades locales de ese svg }: de dónde sale la pieza.
     */
    function iniciar(ev, id, ang, origen, extra) {
        if (actual) quitar();
        extra = extra || {};
        var f = crearFantasma(id, ang);
        var pivotePx = { x: ev.clientX, y: ev.clientY };
        var kOrigen = f.k;
        if (origen && origen.svg && origen.svg.getScreenCTM) {
            var ctm = origen.svg.getScreenCTM();
            if (ctm) {
                var pt = origen.svg.createSVGPoint();
                pt.x = origen.pivote ? origen.pivote.x : 0;
                pt.y = origen.pivote ? origen.pivote.y : 0;
                var r = pt.matrixTransform(ctm);
                pivotePx = { x: r.x, y: r.y };
                kOrigen = ctm.a || f.k;
            }
        }
        // Punto tomado relativo al pivote, llevado a la escala del tablero.
        var factor = f.k / (kOrigen || f.k);
        var offset = {
            x: (ev.clientX - pivotePx.x) * factor,
            y: (ev.clientY - pivotePx.y) * factor
        };
        // Que la pieza no quede demasiado lejos del dedo cuando la ficha es pequeña.
        var lim = 70 * f.k;
        var d = Math.hypot(offset.x, offset.y);
        if (d > lim) {
            offset.x *= lim / d;
            offset.y *= lim / d;
        }
        actual = {
            id: id,
            ang: P.copiar(ang),
            f: f,
            offset: offset,
            pointerId: ev.pointerId,
            socket: null,
            orientada: !!extra.orientada,
            origenPx: pivotePx
        };
        ubicar(f, limitar({ x: ev.clientX - offset.x, y: ev.clientY - offset.y }));
        A.clase(f.svg, "fantasma-toma", 300);
        document.body.classList.add("arrastrando-pieza");
        global.addEventListener("pointermove", mover, { passive: false });
        global.addEventListener("pointerup", terminar);
        global.addEventListener("pointercancel", terminar);
        if (ev.target && ev.target.setPointerCapture && ev.pointerId != null) {
            try { ev.target.releasePointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        }
        return actual;
    }

    /** Mueve el fantasma por código (demo, encaje y regreso). onFrame(pivotePx) en cada cuadro. */
    function llevar(desde, hasta, ms, onFrame, easing) {
        if (!actual) return Promise.resolve();
        var f = actual.f;
        return A.tween(ms, function (t) {
            var p = { x: desde.x + (hasta.x - desde.x) * t, y: desde.y + (hasta.y - desde.y) * t };
            ubicar(f, p);
            if (typeof onFrame === "function") onFrame(p, t);
        }, easing || "suave").promesa;
    }

    /** Pieza fantasma creada sin puntero (para la demo), con el pivote en 'pivotePx'. */
    function crearEn(id, ang, pivotePx) {
        if (actual) quitar();
        var f = crearFantasma(id, ang);
        actual = { id: id, ang: P.copiar(ang), f: f, offset: { x: 0, y: 0 }, pointerId: null, socket: null, orientada: true, origenPx: pivotePx };
        ubicar(f, pivotePx);
        return actual;
    }

    /** Encaje: el fantasma vuela al socket y se acomoda al ángulo exacto. */
    function encajar(socketId, angObjetivo) {
        if (!actual) return Promise.resolve();
        var destino = socketPantalla(socketId);
        var a = actual;
        var desdeAng = P.copiar(a.ang);
        var desde = a.f.pivote || destino;
        return A.tween(240, function (t) {
            ubicar(a.f, { x: desde.x + (destino.x - desde.x) * t, y: desde.y + (destino.y - desde.y) * t });
            if (P.esExtremidad(a.id)) M.aplicar(a.f.g, a.id, P.interpolar(desdeAng, angObjetivo, t));
        }, "salida").promesa.then(function () {
            quitar();
        });
    }

    /** Regreso suave al taller (o a donde se indique). */
    function regresar(destinoPx) {
        if (!actual) return Promise.resolve();
        var a = actual;
        var desde = a.f.pivote || destinoPx;
        a.f.svg.classList.add("fantasma-regresa");
        return A.tween(420, function (t) {
            ubicar(a.f, { x: desde.x + (destinoPx.x - desde.x) * t, y: desde.y + (destinoPx.y - desde.y) * t });
            a.f.svg.style.opacity = String(1 - t * 0.85);
        }, "suave").promesa.then(function () {
            quitar();
        });
    }

    function quitar() {
        if (!actual) return;
        global.removeEventListener("pointermove", mover);
        global.removeEventListener("pointerup", terminar);
        global.removeEventListener("pointercancel", terminar);
        if (actual.f && actual.f.svg && actual.f.svg.parentNode) actual.f.svg.parentNode.removeChild(actual.f.svg);
        actual = null;
        marcarSocket(null);
        document.body.classList.remove("arrastrando-pieza");
    }

    function configurar(opts) {
        cfg = opts || {};
    }

    global.Arrastre = {
        configurar: configurar,
        iniciar: iniciar,
        crearEn: crearEn,
        llevar: llevar,
        encajar: encajar,
        regresar: regresar,
        quitar: quitar,
        escala: escala,
        aPantalla: aPantalla,
        aTablero: aTablero,
        socketPantalla: socketPantalla,
        activo: function () { return actual; },
        fijarOrientada: function (si) { if (actual) actual.orientada = !!si; }
    };
})(window);
