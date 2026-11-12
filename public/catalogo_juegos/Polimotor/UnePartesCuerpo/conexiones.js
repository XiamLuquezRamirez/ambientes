/**
 * Conexiones — arrastre de las líneas con ratón o con el dedo (window.Conexiones).
 *
 * Usa el input de Phaser sobre el lienzo de EscenarioUne (sirve igual para ratón y pantalla táctil).
 * Solo sigue al primer dedo que tocó una tarjeta: un segundo dedo no roba ni corta la línea.
 *
 *   1. Al apoyar sobre una tarjeta (o su conector) nace la línea desde el conector.
 *   2. Mientras se arrastra, la línea sigue exactamente al puntero y el punto del cuerpo más
 *      cercano (a su alcance) crece para mostrar que es un destino.
 *   3. Al soltar, script.js decide con ReglasUne (identidad tarjeta ↔ punto) qué pasa.
 *
 * Callbacks (script.js):
 *   puedeTomar(id) → bool      false si la tarjeta ya está conectada o el juego está ocupado
 *   alTomar(id)
 *   alMover(id, candidatoId)
 *   alSoltar(id, puntoId|null, {x, y})
 */
(function (global) {
    "use strict";

    var E = function () { return global.EscenarioUne; };
    var cb = {};
    var habilitado = false;
    var arrastre = null; // { id, pid }
    var iniciado = false;

    function tocar(pointer) {
        if (!habilitado || arrastre || !E() || !E().listo()) return;
        var id = E().tarjetaEn(pointer.x, pointer.y);
        if (!id) return;
        if (cb.puedeTomar && !cb.puedeTomar(id)) return;
        arrastre = { id: id, pid: pointer.id };
        E().iniciarLinea(id, pointer.x, pointer.y);
        E().estadoTarjeta(id, "activa");
        if (cb.alTomar) cb.alTomar(id);
    }

    function mover(pointer) {
        if (!arrastre || pointer.id !== arrastre.pid) return;
        E().moverLinea(pointer.x, pointer.y);
        var cand = E().candidatoEn(pointer.x, pointer.y);
        E().candidato(cand);
        if (cb.alMover) cb.alMover(arrastre.id, cand);
    }

    function soltar(pointer, fuera) {
        if (!arrastre || (pointer && pointer.id !== arrastre.pid)) return;
        var a = arrastre;
        arrastre = null;
        var x = pointer ? pointer.x : 0;
        var y = pointer ? pointer.y : 0;
        var cand = fuera ? null : E().candidatoEn(x, y);
        E().candidato(null);
        if (cb.alSoltar) cb.alSoltar(a.id, cand, { x: x, y: y });
    }

    /** Si se pierde el puntero (cambio de ventana, alerta), la línea vuelve a su tarjeta. */
    function cancelar() {
        if (!arrastre) return;
        var a = arrastre;
        arrastre = null;
        if (cb.alSoltar) cb.alSoltar(a.id, null, null);
    }

    function iniciar(callbacks) {
        cb = callbacks || {};
        if (iniciado || !E() || !E().listo()) return;
        iniciado = true;
        var sc = E().escena();
        sc.input.on("pointerdown", tocar);
        sc.input.on("pointermove", mover);
        sc.input.on("pointerup", function (p) { soltar(p, false); });
        sc.input.on("pointerupoutside", function (p) { soltar(p, true); });
        global.addEventListener("blur", cancelar);
        // touchcancel: el sistema interrumpe el gesto (por ejemplo, una notificación de la tableta)
        sc.game.canvas.addEventListener("touchcancel", cancelar, { passive: true });
        // evita el menú contextual al mantener presionado en tabletas
        sc.game.canvas.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
    }

    function habilitar(on) {
        habilitado = !!on;
        if (!on) cancelar();
    }

    global.Conexiones = {
        iniciar: iniciar,
        habilitar: habilitar,
        cancelar: cancelar,
        arrastrando: function () { return arrastre ? arrastre.id : null; }
    };
})(window);
