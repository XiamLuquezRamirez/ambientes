/**
 * ArrastreEsfera — entrada de la esfera de luz con el input de Phaser (ratón y dedo, solo el primer puntero).
 * (window.ArrastreEsfera)
 *
 * Se toma la esfera poniendo el dedo (o el cursor) encima y se mantiene presionado; la esfera sigue al dedo con el
 * mismo desfase con que se tomó (no salta al dedo). La escena decide hasta dónde puede ir (paredes y rayos). Soltar
 * deja la esfera quieta donde está: el niño puede detenerse cuando quiera.
 *
 *   iniciar({ puedeTomar(), alTomar(), alSoltar(), alTocarFuera(punto) })
 *   habilitar(on) · arrastrando() · cancelar()   (cancelar: suelta sin avisar alSoltar)
 */
(function (global) {
    "use strict";

    var E = function () { return global.EscenarioLaser && global.EscenarioLaser.listo() ? global.EscenarioLaser : null; };
    var cb = {};
    var activo = null;
    var habil = false;

    function punto(sc, p) {
        sc.scale.updateBounds();
        var e = E();
        return e && e.mundoDeJuego ? e.mundoDeJuego(p.x, p.y) : sc.cameras.main.getWorldPoint(p.x, p.y);
    }

    function terminar(avisar) {
        if (activo === null) return;
        activo = null;
        if (E()) E().soltar();
        if (avisar && typeof cb.alSoltar === "function") cb.alSoltar();
    }

    function iniciar(callbacks) {
        cb = callbacks || {};
        var e = E();
        if (!e) return;
        var sc = e.escena();
        sc.input.on("pointerdown", function (p) {
            if (activo !== null || !habil) return;
            var w = punto(sc, p);
            if (e.tocaEsfera(w.x, w.y) && (!cb.puedeTomar || cb.puedeTomar())) {
                activo = p.id;
                e.empezarArrastre(w.x, w.y);
                if (typeof cb.alTomar === "function") cb.alTomar();
            } else if (typeof cb.alTocarFuera === "function") {
                cb.alTocarFuera(w);
            }
        });
        sc.input.on("pointermove", function (p) {
            if (activo === null || p.id !== activo) return;
            var w = punto(sc, p);
            e.moverObjetivo(w.x, w.y);
        });
        var arriba = function (p) {
            if (activo === null || (p && p.id !== activo)) return;
            terminar(true);
        };
        sc.input.on("pointerup", arriba);
        sc.input.on("pointerupoutside", arriba);
        global.addEventListener("blur", function () { terminar(true); });
        document.addEventListener("visibilitychange", function () { if (document.hidden) terminar(true); });
    }

    global.ArrastreEsfera = {
        iniciar: iniciar,
        habilitar: function (on) {
            habil = !!on;
            if (!habil) terminar(false);
        },
        habilitado: function () { return habil; },
        arrastrando: function () { return activo !== null; },
        cancelar: function () { terminar(false); }
    };
})(window);
