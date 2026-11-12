/**
 * Conexiones — arrastre de las líneas con ratón o con el dedo (window.Conexiones).
 *
 * Usa el input de Phaser sobre el lienzo de EscenarioUso (igual para ratón y pantalla táctil).
 * Solo sigue al primer dedo que tocó una tarjeta: un segundo dedo no roba ni corta la línea.
 *
 *   1. Al apoyar sobre una tarjeta o su conector (de cualquier columna) nace la línea desde el conector.
 *   2. Mientras se mantiene presionado, la línea sigue al puntero y la tarjeta de la otra columna que
 *      está a su alcance se ilumina.
 *   3. Al soltar, script.js decide con ReglasUso (identificadores objeto → parte) qué pasa.
 *
 * Callbacks (script.js):
 *   puedeTomar(id) → bool      false si la tarjeta ya tiene pareja o el juego está ocupado
 *   alTomar(id)
 *   alSoltar(origenId, destinoId|null)
 */
(function (global) {
    "use strict";

    var E = function () { return global.EscenarioUso; };
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
        cursor("grabbing");
        if (cb.alTomar) cb.alTomar(id);
    }

    /** Cursor: mano abierta sobre una tarjeta, mano cerrada mientras se arrastra la línea. */
    function cursor(valor) {
        var el = E() && E().listo() ? E().escena().game.canvas : null;
        if (el && el.style.cursor !== valor) el.style.cursor = valor;
    }

    function mover(pointer) {
        if (!arrastre) {
            if (habilitado && E() && E().listo()) cursor(E().tarjetaEn(pointer.x, pointer.y) ? "grab" : "default");
            return;
        }
        if (pointer.id !== arrastre.pid) return;
        E().moverLinea(pointer.x, pointer.y);
        E().candidato(E().destinoEn(pointer.x, pointer.y, arrastre.id));
    }

    function soltar(pointer, fuera) {
        if (!arrastre || (pointer && pointer.id !== arrastre.pid)) return;
        var a = arrastre;
        arrastre = null;
        cursor("default");
        var destino = fuera || !pointer ? null : E().destinoEn(pointer.x, pointer.y, a.id);
        E().candidato(null);
        if (cb.alSoltar) cb.alSoltar(a.id, destino);
    }

    /** Si se pierde el puntero (cambio de ventana, alerta), la línea vuelve a su tarjeta. */
    function cancelar() {
        if (!arrastre) return;
        var a = arrastre;
        arrastre = null;
        if (E()) E().candidato(null);
        if (cb.alSoltar) cb.alSoltar(a.id, null);
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
        if (!on) cursor("default");
    }

    global.Conexiones = {
        iniciar: iniciar,
        habilitar: habilitar,
        cancelar: cancelar,
        arrastrando: function () { return arrastre ? arrastre.id : null; }
    };
})(window);
