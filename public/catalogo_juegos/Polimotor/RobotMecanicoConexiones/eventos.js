/**
 * EventosRobot — canal de eventos de interacción (window.EventosRobot).
 *
 * La escena y el flujo cuentan lo que hace el niño; el laboratorio, el robot, el audio y Zoe
 * escuchan y reaccionan. Así la mecánica no conoce al decorado y el decorado puede crecer sin
 * tocar la mecánica.
 *
 *   pieza_seleccionada     { id }
 *   pieza_arrastrada       { id, x, y }                 (mundo de diseño 1600 × 900)
 *   pieza_rotada           { id, rot, dir }
 *   pieza_cerca_de_ranura  { id, fuerza, orientacionOk, disponible, x, y }
 *   pieza_lejos            { id }
 *   pieza_soltada          { id }
 *   pieza_ensamblada       { id, colocadas, total, x, y }
 *   conexion_incorrecta    { id, motivo }
 *   extremidad_completada  { grupo }
 *   escaner                { id, x, y }
 *   nivel_iniciado         { nivel, total }
 *   nivel_completado       { nivel }
 *   robot_activado         {}
 */
(function (global) {
    "use strict";

    var NOMBRES = [
        "pieza_seleccionada", "pieza_arrastrada", "pieza_rotada", "pieza_cerca_de_ranura", "pieza_lejos",
        "pieza_soltada", "pieza_ensamblada", "conexion_incorrecta", "extremidad_completada", "escaner",
        "nivel_iniciado", "nivel_completado", "robot_activado"
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
        if (NOMBRES.indexOf(nombre) < 0) console.warn("[EventosRobot] evento desconocido", nombre);
        if (nombre !== "pieza_arrastrada") {
            historial.push({ nombre: nombre, t: Date.now() });
            if (historial.length > 80) historial.shift();
        }
        (oyentes[nombre] || []).slice().forEach(function (fn) {
            try { fn(datos || {}); } catch (e) { console.warn("[EventosRobot]", nombre, e); }
        });
    }

    global.EventosRobot = {
        NOMBRES: NOMBRES,
        on: on,
        off: off,
        emitir: emitir,
        /** Para pruebas: últimos eventos (sin el arrastre, que es continuo). */
        historial: function () { return historial.slice(); },
        cuantos: function (nombre) { return (oyentes[nombre] || []).length; }
    };
})(typeof window !== "undefined" ? window : global);
