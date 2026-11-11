/**
 * Arrastre — sistema de arrastrar y encajar de "¿Dónde se pone?" (window.Arrastre), con el input de Phaser 4.
 *
 * Trabaja sobre los accesorios de EscenarioPhaser.items() (contenedores con área táctil circular grande).
 * Al tomar un accesorio: se destaca (crece y la burbuja se vuelve dorada), deja de flotar, queda encima de todo
 * y aparecen los anillos de las zonas libres. Mientras se mueve, sigue al dedo o al ratón y se resalta la zona
 * que está tocando. No decide nada: avisa a script.js, que valida con Reglas.
 *
 *   Arrastre.iniciar({ alMover(id, zona) → true si lo encaja, alSoltar(id, zona), alTomar(id) })
 *   Arrastre.habilitar(on)   acepta o ignora arrastres (demo, reacciones, final)
 *   Arrastre.activo()        id del accesorio que se está arrastrando (o null)
 *
 * Funciona con ratón y con toques (Phaser unifica ambos en "pointer"). Si el accesorio entra en su zona
 * correcta mientras se arrastra, alMover devuelve true y el arrastre termina ahí (encaje automático).
 */
(function (global) {
    "use strict";

    var E = function () { return global.EscenarioPhaser; };
    var opts = {};
    var habilitado = false;
    var actual = null;
    var capturado = false;
    var iniciado = false;

    function destacar(c, on) {
        var sc = E().escena();
        if (!sc || !c) return;
        sc.tweens.killTweensOf(c.dibujo);
        if (on) {
            c.burbuja.setTint(0xffe58a);
            sc.tweens.add({ targets: c.dibujo, scale: c.dibujo.escalaBase * 1.15, duration: 140, ease: "Back.easeOut" });
        } else {
            c.burbuja.clearTint();
            c.dibujo.setScale(c.dibujo.escalaBase);
            c.dibujo.angle = 0;
        }
    }

    function alEmpezar(pointer, c) {
        if (!c || !c.accId) return;
        if (!habilitado || c.estado !== "bandeja" || actual) {
            c.ignorar = true;
            return;
        }
        c.ignorar = false;
        actual = c;
        capturado = false;
        var sc = E().escena();
        sc.tweens.killTweensOf([c, c.flota]);
        c.flota.y = 0;
        c.flota.angle = 0;
        c.estado = "arrastrando";
        c.setDepth(60);
        destacar(c, true);
        E().destinos(true, null);
        if (typeof opts.alTomar === "function") opts.alTomar(c.accId);
    }

    function alMoverse(pointer, c, dragX, dragY) {
        if (!c || c.ignorar || c !== actual || capturado) return;
        c.setPosition(dragX, dragY);
        var zona = E().zonaBajo(c.x, c.y, pointer.worldX, pointer.worldY).id;
        E().destinos(true, zona);
        if (zona && typeof opts.alMover === "function" && opts.alMover(c.accId, zona) === true) {
            // encaje automático: el resto del arrastre se ignora
            capturado = true;
            terminar(c);
        }
    }

    function alSoltarse(pointer, c) {
        if (!c || c.ignorar) {
            if (c) c.ignorar = false;
            return;
        }
        if (c !== actual) return;
        if (capturado) {
            capturado = false;
            return;
        }
        var zona = E().zonaBajo(c.x, c.y, pointer.worldX, pointer.worldY).id;
        terminar(c);
        if (typeof opts.alSoltar === "function") opts.alSoltar(c.accId, zona);
    }

    function terminar(c) {
        destacar(c, false);
        E().destinos(false);
        actual = null;
    }

    function enlazar() {
        var sc = E() && E().escena();
        if (!sc || iniciado) return;
        iniciado = true;
        var items = E().items();
        Object.keys(items).forEach(function (id) { sc.input.setDraggable(items[id], true); });
        sc.input.dragDistanceThreshold = 0;
        sc.input.on("dragstart", alEmpezar);
        sc.input.on("drag", alMoverse);
        sc.input.on("dragend", alSoltarse);
    }

    global.Arrastre = {
        iniciar: function (o) {
            opts = o || {};
            enlazar();
        },
        habilitar: function (on) {
            habilitado = !!on;
            // si se deshabilita a mitad de un arrastre, el accesorio vuelve a su lugar
            if (!habilitado && actual && !capturado) {
                var c = actual;
                terminar(c);
                E().volverALugar(c.accId, false);
            }
        },
        habilitado: function () { return habilitado; },
        activo: function () { return actual ? actual.accId : null; }
    };
})(window);
