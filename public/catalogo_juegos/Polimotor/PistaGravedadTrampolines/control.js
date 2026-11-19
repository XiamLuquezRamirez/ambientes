/**
 * ControlEsfera — entrada de "La Pista de Gravedad y Trampolines" (window.ControlEsfera).
 *
 * Dedo o ratón: se toca la pista (cerca de la esfera o donde se quiera ir) y la esfera rueda hacia ese punto con
 * aceleración suave; mientras el dedo se arrastra, la esfera lo sigue en cualquier dirección (adelante, atrás, a los
 * lados, en diagonal). Al soltar, la esfera frena poco a poco. El punto del dedo se calcula solo cuando el dedo se
 * mueve (la cámara que sigue a la esfera no arrastra el objetivo).
 * Teclado (computador): flechas o W A S D.
 */
(function (global) {
    "use strict";

    var opts = null;
    var habil = false;
    var puntero = null;      // { id, x, y }
    var teclas = {};
    var tieneTeclado = false;

    function escena() {
        return global.EscenarioPista && global.EscenarioPista.listo() ? global.EscenarioPista : null;
    }

    function aplicarPuntero() {
        var e = escena();
        if (!e || !puntero) return;
        var w = e.mundoDesdePantalla(puntero.x, puntero.y);
        if (w) e.control({ modo: "punto", x: w.x, z: w.z });
    }

    function aplicarTeclado() {
        var e = escena();
        if (!e || puntero) return;
        var dx = (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0);
        var dz = (teclas.aba ? 1 : 0) - (teclas.arr ? 1 : 0);
        if (dx || dz) {
            tieneTeclado = true;
            e.control({ modo: "dir", dx: dx, dz: dz });
        } else if (tieneTeclado) {
            tieneTeclado = false;
            e.control(null);
        }
    }

    function abajo(ev) {
        if (!habil || puntero || !opts.puedeControlar()) return;
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        puntero = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
        try { ev.target.setPointerCapture(ev.pointerId); } catch (e) { /* noop */ }
        ev.preventDefault();
        aplicarPuntero();
        if (opts.alTocar) opts.alTocar();
    }

    function mover(ev) {
        if (!puntero || ev.pointerId !== puntero.id) return;
        puntero.x = ev.clientX;
        puntero.y = ev.clientY;
        if (!habil || !opts.puedeControlar()) return;
        aplicarPuntero();
    }

    function arriba(ev) {
        if (!puntero || ev.pointerId !== puntero.id) return;
        puntero = null;
        var e = escena();
        if (e && habil) e.control(null);
        if (opts.alSoltar) opts.alSoltar();
    }

    var MAPA = { ArrowLeft: "izq", KeyA: "izq", ArrowRight: "der", KeyD: "der", ArrowUp: "arr", KeyW: "arr", ArrowDown: "aba", KeyS: "aba" };

    function tecla(ev, on) {
        var k = MAPA[ev.code];
        if (!k) return;
        if (!habil || !opts.puedeControlar()) {
            teclas = {};
            return;
        }
        ev.preventDefault();
        if (teclas[k] === on) return;
        teclas[k] = on;
        aplicarTeclado();
        if (on && opts.alTocar) opts.alTocar();
    }

    global.ControlEsfera = {
        iniciar: function (o) {
            opts = o || {};
            var el = document.getElementById("escenario-phaser");
            if (!el) return;
            el.addEventListener("pointerdown", abajo);
            el.addEventListener("pointermove", mover);
            el.addEventListener("pointerup", arriba);
            el.addEventListener("pointercancel", arriba);
            el.addEventListener("lostpointercapture", arriba);
            global.addEventListener("keydown", function (ev) { tecla(ev, true); });
            global.addEventListener("keyup", function (ev) { tecla(ev, false); });
            global.addEventListener("blur", function () { teclas = {}; aplicarTeclado(); });
        },
        habilitar: function (on) {
            habil = !!on;
            if (!habil) this.cancelar();
        },
        cancelar: function () {
            puntero = null;
            teclas = {};
            tieneTeclado = false;
            var e = escena();
            if (e) e.control(null);
        },
        activo: function () { return !!puntero || tieneTeclado; }
    };
})(window);
