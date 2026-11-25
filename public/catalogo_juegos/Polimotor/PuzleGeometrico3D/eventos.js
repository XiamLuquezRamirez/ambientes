/**
 * EventosPuzle — canal de eventos del mundo de construcción (window.EventosPuzle).
 *
 * La escena y el flujo cuentan lo que hace el niño; el mundo (grúas, máquinas, cintas, luces,
 * islas), la construcción, el panel, el audio y los personajes escuchan y reaccionan. Así la
 * mecánica de ensamblaje no conoce al decorado.
 *
 *   bloque_seleccionado      { id, forma, x, y }
 *   bloque_arrastrado        { id, x, y }                       (mundo de diseño 1600 × 900)
 *   bloque_rotado            { id, rot, dir, coincide }
 *   bloque_cerca_de_posicion { id, destino, fuerza, orientacionOk, x, y }
 *   bloque_lejos             { id }
 *   bloque_ensamblado        { id, destino, colocadas, total, x, y, capa }
 *   bloque_rechazado         { id, motivo, destino }
 *   capa_completada          { capa, indice, total }
 *   altura_incrementada      { altura, maxima }
 *   construccion_completada  { nivel }
 *   nivel_iniciado           { nivel, clave, total }
 *   nivel_completado         { nivel }
 *   celebracion_final        {}
 */
(function (global) {
    "use strict";

    var NOMBRES = [
        "bloque_seleccionado", "bloque_arrastrado", "bloque_rotado", "bloque_cerca_de_posicion", "bloque_lejos",
        "bloque_ensamblado", "bloque_rechazado", "capa_completada", "altura_incrementada",
        "construccion_completada", "nivel_iniciado", "nivel_completado", "celebracion_final"
    ];
    var oyentes = {};
    var historial = [];

    function on(nombre, fn) {
        if (typeof fn !== "function") return function () {};
        (oyentes[nombre] = oyentes[nombre] || []).push(fn);
        return function () { off(nombre, fn); };
    }

    function off(nombre, fn) {
        var l = oyentes[nombre];
        if (!l) return;
        var i = l.indexOf(fn);
        if (i >= 0) l.splice(i, 1);
    }

    function emitir(nombre, datos) {
        if (NOMBRES.indexOf(nombre) < 0) console.warn("[EventosPuzle] evento desconocido", nombre);
        if (nombre !== "bloque_arrastrado") {
            historial.push({ nombre: nombre, t: Date.now(), datos: datos || {} });
            if (historial.length > 120) historial.shift();
        }
        (oyentes[nombre] || []).slice().forEach(function (fn) {
            try { fn(datos || {}); } catch (e) { console.warn("[EventosPuzle]", nombre, e); }
        });
    }

    global.EventosPuzle = {
        NOMBRES: NOMBRES,
        on: on,
        off: off,
        emitir: emitir,
        /** Para pruebas: últimos eventos (sin el arrastre, que es continuo). */
        historial: function () { return historial.slice(); },
        cuantos: function (nombre) { return (oyentes[nombre] || []).length; }
    };
})(typeof window !== "undefined" ? window : global);
