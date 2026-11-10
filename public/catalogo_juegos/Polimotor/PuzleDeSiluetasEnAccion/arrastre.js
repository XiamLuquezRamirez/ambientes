/**
 * Arrastre — tocar y arrastrar piezas sueltas con Pointer Events (ratón, dedo o lápiz) (window.Arrastre).
 *
 * Un toque corto elige la pieza (aparecen las flechas de giro); si el dedo se mueve más de 8 px
 * la pieza se arrastra. El centro sigue al dedo conservando el punto donde se tomó, y Tablero lo
 * mantiene dentro del escenario. Al soltar, el script valida con Posturas.evaluarSoltado.
 */
(function (global) {
    "use strict";

    var T = function () { return global.Tablero; };
    var svg = null;
    var cb = {};
    var toma = null;
    var UMBRAL = 8;

    function configurar(opts) {
        svg = opts.svg;
        cb = opts;
        svg.addEventListener("pointerdown", onDown);
    }

    function piezaDe(target) {
        var n = target;
        while (n && n !== svg) {
            if (n.classList && n.classList.contains("pieza-libre")) return n;
            if (n.classList && n.classList.contains("rot-btn")) return "control";
            n = n.parentNode;
        }
        return null;
    }

    function onDown(ev) {
        if (ev.button != null && ev.button > 0) return;
        if (toma) return;
        var nodo = piezaDe(ev.target);
        if (nodo === "control") return;
        if (!nodo) {
            if (typeof cb.onFondo === "function") cb.onFondo(ev);
            return;
        }
        var id = nodo.getAttribute("data-id");
        if (typeof cb.onTocar === "function" && cb.onTocar(id, ev) === false) return;
        var e = T().estado(id);
        if (!e) return;
        ev.preventDefault();
        var pt = T().aEscenario(ev.clientX, ev.clientY);
        toma = {
            id: id,
            pointerId: ev.pointerId,
            x0: ev.clientX,
            y0: ev.clientY,
            p0: pt,
            c0: { x: e.cx, y: e.cy },
            arrastrando: false
        };
        global.addEventListener("pointermove", onMove);
        global.addEventListener("pointerup", onUp);
        global.addEventListener("pointercancel", onUp);
    }

    function onMove(ev) {
        if (!toma || ev.pointerId !== toma.pointerId) return;
        var e = T().estado(toma.id);
        if (!e) return;
        if (!toma.arrastrando) {
            if (Math.hypot(ev.clientX - toma.x0, ev.clientY - toma.y0) < UMBRAL) return;
            toma.arrastrando = true;
            document.body.classList.add("arrastrando-pieza");
            if (typeof cb.onInicio === "function") cb.onInicio(toma.id, e);
            // Al crecer la pieza, el punto tomado se acerca a su centro: no salta lejos del dedo.
            toma.c0 = { x: e.cx, y: e.cy };
        }
        var pt = T().aEscenario(ev.clientX, ev.clientY);
        T().mover(e, toma.c0.x + (pt.x - toma.p0.x), toma.c0.y + (pt.y - toma.p0.y));
        if (typeof cb.onMover === "function") cb.onMover(toma.id, e);
    }

    function onUp(ev) {
        if (!toma || (ev.pointerId != null && ev.pointerId !== toma.pointerId)) return;
        var t = toma;
        toma = null;
        global.removeEventListener("pointermove", onMove);
        global.removeEventListener("pointerup", onUp);
        global.removeEventListener("pointercancel", onUp);
        document.body.classList.remove("arrastrando-pieza");
        var e = T().estado(t.id);
        if (e && typeof cb.onSoltar === "function") cb.onSoltar(t.id, e, t.arrastrando);
    }

    function cancelar() {
        if (!toma) return;
        toma = null;
        global.removeEventListener("pointermove", onMove);
        global.removeEventListener("pointerup", onUp);
        global.removeEventListener("pointercancel", onUp);
        document.body.classList.remove("arrastrando-pieza");
    }

    global.Arrastre = {
        configurar: configurar,
        cancelar: cancelar,
        activo: function () { return toma; }
    };
})(window);
