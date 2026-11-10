/**
 * Rotacion — controles de giro de la pieza elegida (window.Rotacion).
 *
 * Al elegir una pieza aparecen un aro punteado alrededor y dos botones grandes con flechas curvas:
 * izquierda = contra el reloj, derecha = como el reloj. Cada toque gira un paso (config.juego.pasoGiro);
 * si se deja el dedo apretado, sigue girando. Los botones miden al menos ~68 px en pantalla.
 * El giro en sí lo hace el script (onGirar), con un tween corto para que se vea fluido.
 */
(function (global) {
    "use strict";

    var NS = "http://www.w3.org/2000/svg";
    var T = function () { return global.Tablero; };
    var P = global.Posturas;

    var capa = null;
    var onGirar = null;
    var actual = null;
    var repetir = null;
    var esperar = null;
    var habilitado = true;

    var FLECHA = '<path class="rot-flecha" d="M-14,8 A16,16 0 1 1 13,9"/>' +
        '<path class="rot-punta" d="M5,4 L22,2 L15,18 Z"/>';

    function montar(opts) {
        capa = opts.capa;
        onGirar = opts.onGirar;
        global.addEventListener("pointerup", soltar);
        global.addEventListener("pointercancel", soltar);
    }

    function boton(dir) {
        var g = document.createElementNS(NS, "g");
        g.setAttribute("class", "rot-btn " + (dir < 0 ? "rot-izq" : "rot-der"));
        g.setAttribute("data-dir", String(dir));
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", dir < 0 ? "Girar a la izquierda" : "Girar a la derecha");
        g.innerHTML = '<g class="rot-cuerpo"><circle class="rot-sombra" r="31" cy="4"/><circle class="rot-fondo" r="30"/>' +
            '<g class="rot-icono" transform="' + (dir < 0 ? "scale(-1,1)" : "") + '">' + FLECHA + "</g></g>";
        g.addEventListener("pointerdown", function (ev) {
            if (!habilitado) return;
            ev.preventDefault();
            ev.stopPropagation();
            pulsar(dir);
            esperar = setTimeout(function () {
                repetir = setInterval(function () { pulsar(dir); }, 170);
            }, 420);
        });
        return g;
    }

    function soltar() {
        clearTimeout(esperar);
        clearInterval(repetir);
        esperar = null;
        repetir = null;
    }

    function pulsar(dir) {
        var b = capa && capa.querySelector('.rot-btn[data-dir="' + dir + '"]');
        if (b) {
            b.classList.remove("pulsado");
            void b.getBoundingClientRect();
            b.classList.add("pulsado");
            setTimeout(function () { b.classList.remove("pulsado"); }, 180);
        }
        if (typeof onGirar === "function") return onGirar(dir);
        return null;
    }

    /** Dibuja aro y botones alrededor de la pieza e (estado de Tablero). */
    function mostrar(e) {
        if (!capa || !e) return;
        actual = e;
        if (!capa.querySelector(".rot-btn")) {
            capa.innerHTML = '<g class="rot-aro-g"><circle class="rot-aro"/><circle class="rot-aro rot-aro-2"/></g>';
            capa.appendChild(boton(-1));
            capa.appendChild(boton(1));
        }
        capa.classList.add("visible");
        ubicar(e);
    }

    function ubicar(e) {
        if (!capa || !e) return;
        var v = T().vista();
        var ppu = T().pxPorUnidad();
        var rb = Math.max(30, 36 / ppu);
        var R = Math.max(40, P.radio(e.p) * T().escalaReal(e) * 0.82);
        var gap = R + rb * 1.05;
        var izq = { x: e.cx - gap, y: e.cy + R * 0.35 };
        var der = { x: e.cx + gap, y: e.cy + R * 0.35 };
        // Si no caben a los lados, van debajo (o encima) de la pieza.
        if (izq.x - rb < 0 || der.x + rb > v.w) {
            var y = e.cy + R + rb * 1.05;
            if (y + rb > v.h) y = e.cy - R - rb * 1.05;
            izq = { x: e.cx - rb * 1.25, y: y };
            der = { x: e.cx + rb * 1.25, y: y };
        }
        [izq, der].forEach(function (p) {
            p.x = Math.max(rb + 2, Math.min(v.w - rb - 2, p.x));
            p.y = Math.max(rb + 2, Math.min(v.h - rb - 2, p.y));
        });
        var k = rb / 30;
        var bi = capa.querySelector('.rot-btn[data-dir="-1"]');
        var bd = capa.querySelector('.rot-btn[data-dir="1"]');
        if (bi) bi.setAttribute("transform", "translate(" + izq.x.toFixed(1) + "," + izq.y.toFixed(1) + ") scale(" + k.toFixed(3) + ")");
        if (bd) bd.setAttribute("transform", "translate(" + der.x.toFixed(1) + "," + der.y.toFixed(1) + ") scale(" + k.toFixed(3) + ")");
        capa.querySelectorAll(".rot-aro").forEach(function (c, i) {
            c.setAttribute("cx", e.cx.toFixed(1));
            c.setAttribute("cy", e.cy.toFixed(1));
            c.setAttribute("r", (R + (i ? 8 : 0)).toFixed(1));
        });
    }

    function ocultar() {
        soltar();
        actual = null;
        if (capa) capa.classList.remove("visible");
    }

    function marcarOrientada(ok) {
        if (capa) capa.classList.toggle("orientada", !!ok);
    }

    function botonEl(dir) {
        return capa ? capa.querySelector('.rot-btn[data-dir="' + dir + '"]') : null;
    }

    global.Rotacion = {
        montar: montar,
        mostrar: mostrar,
        ubicar: ubicar,
        ocultar: ocultar,
        pulsar: pulsar,
        boton: botonEl,
        marcarOrientada: marcarOrientada,
        habilitar: function (on) { habilitado = !!on; },
        actual: function () { return actual; }
    };
})(window);
