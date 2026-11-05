/**
 * NivelaBalanzaLogica — reglas puras, sin DOM ni Phaser.
 * El platillo izquierdo trae la cantidad objetivo; el niño iguala a la derecha.
 */
(function (global) {
    "use strict";

    var GRADOS_MAX = 16;
    var MARGEN_DEPOSITO = 2;

    function entero(valor) {
        var n = Number(valor);
        return isFinite(n) && Math.floor(n) === n ? n : null;
    }

    function cantidadObjetivo(reto) {
        var n = entero(reto && reto.cantidadObjetivo);
        return n != null && n >= 1 ? n : null;
    }

    function cristalesEnDeposito(reto) {
        var objetivo = cantidadObjetivo(reto);
        if (objetivo == null) return 0;
        var pedido = entero(reto && reto.cristalesEnDeposito) || 0;
        return Math.max(pedido, objetivo + MARGEN_DEPOSITO);
    }

    function estadoBalanza(izquierda, derecha) {
        var izq = entero(izquierda) || 0;
        var der = entero(derecha) || 0;
        var diferencia = izq - der;
        var abs = Math.abs(diferencia);
        var estado = abs === 0 ? "verde" : (abs === 1 ? "amarillo" : "rojo");
        var grados = Math.max(-GRADOS_MAX, Math.min(GRADOS_MAX, diferencia * 4));
        return { diferencia: diferencia, estado: estado, inclinacionGrados: grados };
    }

    function esVictoria(izquierda, derecha) {
        var izq = entero(izquierda);
        var der = entero(derecha);
        return izq != null && der != null && izq === der && der > 0;
    }

    function retosValidos(nivel) {
        var lista = (nivel && nivel.retos) || [];
        return lista.filter(function (r) { return cantidadObjetivo(r) != null; });
    }

    function plantilla(texto, datos) {
        return String(texto == null ? "" : texto).replace(/\{(\w+)\}/g, function (todo, clave) {
            return datos && datos[clave] != null ? datos[clave] : todo;
        });
    }

    /* ---------- Estado de depósito y platillos ---------- */

    function crearEstado(reto) {
        var objetivo = cantidadObjetivo(reto);
        var total = cristalesEnDeposito(reto);
        var deposito = [];
        var i;
        for (i = 0; i < total; i++) deposito.push("c" + i);
        return { objetivo: objetivo || 0, deposito: deposito, colocados: [] };
    }

    function mover(origen, destino, id) {
        var i = origen.indexOf(id);
        if (i === -1) return false;
        origen.splice(i, 1);
        destino.push(id);
        return true;
    }

    function colocar(estado, id) {
        if (!estado) return false;
        return mover(estado.deposito, estado.colocados, id);
    }

    function retirar(estado, id) {
        if (!estado) return false;
        return mover(estado.colocados, estado.deposito, id);
    }

    function conteo(estado) {
        if (!estado) return { izquierda: 0, derecha: 0 };
        return { izquierda: estado.objetivo, derecha: estado.colocados.length };
    }

    global.NivelaBalanzaLogica = {
        GRADOS_MAX: GRADOS_MAX,
        cantidadObjetivo: cantidadObjetivo,
        cristalesEnDeposito: cristalesEnDeposito,
        estadoBalanza: estadoBalanza,
        esVictoria: esVictoria,
        retosValidos: retosValidos,
        plantilla: plantilla,
        crearEstado: crearEstado,
        colocar: colocar,
        retirar: retirar,
        conteo: conteo
    };
})(typeof window !== "undefined" ? window : this);
