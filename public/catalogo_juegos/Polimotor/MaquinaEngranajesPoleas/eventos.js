/**
 * EventosMaquina — canal de eventos del taller (window.EventosMaquina).
 *
 * La escena y el flujo cuentan lo que hace el niño; el taller (ruedas decorativas, poleas, tubos,
 * cintas, brazos, luces, medidores), el tablero, la bandeja y el audio escuchan y reaccionan. Así
 * la mecánica de ensamblaje no conoce al decorado.
 *
 *   pieza_seleccionada   { id, tipo, talla, x, y, sirve }
 *   pieza_arrastrada     { id, x, y }                          (mundo de diseño 1600 × 900)
 *   pieza_cerca_de_eje   { id, destino, fuerza, x, y }
 *   pieza_lejos          { id }
 *   pieza_ensamblada     { id, destino, tipo, talla, puestas, total, x, y }
 *   pieza_rechazada      { id, motivo, destino, x, y }
 *   conexion_activada    { destino, con }                       (dos ruedas o una correa quedan unidas)
 *   energia              { valor }                              (0..1, crece con el ensamblaje)
 *   maquina_lista        { nivel }                              (todo ensamblado, falta ponerla en marcha)
 *   maquina_en_marcha    { nivel }
 *   nivel_iniciado       { nivel, clave, total }
 *   nivel_completado     { nivel }
 *   celebracion_final    {}
 */
(function (global) {
    "use strict";

    var NOMBRES = [
        "pieza_seleccionada", "pieza_arrastrada", "pieza_cerca_de_eje", "pieza_lejos", "pieza_ensamblada",
        "pieza_rechazada", "conexion_activada", "energia", "maquina_lista", "maquina_en_marcha",
        "nivel_iniciado", "nivel_completado", "celebracion_final"
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
        if (NOMBRES.indexOf(nombre) < 0) console.warn("[EventosMaquina] evento desconocido", nombre);
        if (nombre !== "pieza_arrastrada") {
            historial.push({ nombre: nombre, t: Date.now(), datos: datos || {} });
            if (historial.length > 120) historial.shift();
        }
        (oyentes[nombre] || []).slice().forEach(function (fn) {
            try { fn(datos || {}); } catch (e) { console.warn("[EventosMaquina]", nombre, e); }
        });
    }

    global.EventosMaquina = {
        NOMBRES: NOMBRES,
        on: on,
        off: off,
        emitir: emitir,
        /** Para pruebas: últimos eventos (sin el arrastre, que es continuo). */
        historial: function () { return historial.slice(); },
        cuantos: function (nombre) { return (oyentes[nombre] || []).length; }
    };
})(typeof window !== "undefined" ? window : global);
