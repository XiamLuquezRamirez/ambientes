/**
 * Gestor de conexiones: qué estrella toca ahora y si un trazo vale.
 * Lógica pura, sin Phaser, para poder probarla sin navegador.
 */
(function (global) {
    "use strict";

    var V = global.ConstelacionValidador ||
        (typeof require !== "undefined" ? require("./validador.js") : null);

    /** Margen de agarre al soltar sobre una estrella: generoso a propósito. */
    var RADIO_AGARRE = 60;

    function crearEstado(estrellas) {
        return {
            estrellas: (estrellas || []).slice(),
            hechas: 0,        // cuántas conexiones confirmadas
            errores: 0,
            intentos: 0
        };
    }

    /** Número que hay que tocar ahora (1 al empezar). */
    function esperado(estado) {
        if (!estado) return null;
        return estado.hechas + 1;
    }

    function estrellaDe(estado, numero) {
        var i;
        for (i = 0; i < estado.estrellas.length; i++) {
            if (estado.estrellas[i].n === numero) return estado.estrellas[i];
        }
        return null;
    }

    function completo(estado) {
        return !!estado && estado.hechas >= estado.estrellas.length;
    }

    /** La estrella bajo el dedo, si hay alguna dentro del radio de agarre. */
    function estrellaEn(estado, x, y, radio) {
        var r = radio == null ? RADIO_AGARRE : radio;
        var mejor = null;
        var mejorD = r;
        var i, d;
        for (i = 0; i < estado.estrellas.length; i++) {
            d = V.distancia({ x: x, y: y }, estado.estrellas[i]);
            if (d <= mejorD) { mejorD = d; mejor = estado.estrellas[i]; }
        }
        return mejor;
    }

    /**
     * ¿Puede empezar un trazo en esta estrella? Solo desde la que toca ahora.
     * Al principio es la 1; después, la última confirmada (se sigue la cadena).
     */
    function puedeIniciar(estado, numero) {
        if (completo(estado)) return false;
        return estado.hechas === 0 ? numero === 1 : numero === estado.hechas;
    }

    /**
     * Resuelve un trazo soltado sobre `numero`.
     * 'bien' | 'completo' | 'mal' | 'nada'
     * Un error no toca `hechas`: el progreso correcto se conserva (spec §5).
     */
    function soltarEn(estado, numero) {
        if (!estado || completo(estado)) return { estado: "nada", esperado: null };
        var toca = esperado(estado);
        estado.intentos += 1;
        if (Number(numero) !== toca) {
            estado.errores += 1;
            return { estado: "mal", esperado: toca, recibido: Number(numero) };
        }
        estado.hechas += 1;
        return {
            estado: completo(estado) ? "completo" : "bien",
            esperado: toca,
            hechas: estado.hechas
        };
    }

    /** Pares [desde, hasta] de las líneas ya confirmadas. */
    function tramosHechos(estado) {
        var tramos = [];
        var i;
        for (i = 1; i < estado.hechas; i++) {
            tramos.push([estrellaDe(estado, i), estrellaDe(estado, i + 1)]);
        }
        return tramos;
    }

    global.ConstelacionConexiones = {
        RADIO_AGARRE: RADIO_AGARRE,
        crearEstado: crearEstado,
        esperado: esperado,
        estrellaDe: estrellaDe,
        estrellaEn: estrellaEn,
        puedeIniciar: puedeIniciar,
        soltarEn: soltarEn,
        completo: completo,
        tramosHechos: tramosHechos
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ConstelacionConexiones;
})(typeof window !== "undefined" ? window : globalThis);
