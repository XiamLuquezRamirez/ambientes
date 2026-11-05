/**
 * Progreso por nivel, solo en memoria.
 *
 * Decisión de producto: el avance dura lo que dura la partida. Al salir del
 * juego o recargar se empieza de nuevo desde el nivel 1, que es lo propio de
 * una actividad de aula — cada niño que se sienta encuentra el juego limpio,
 * sin el avance del anterior.
 */
(function (global) {
    "use strict";

    /* Único estado vivo del juego. Se pierde al recargar: es lo buscado. */
    var estado = null;

    /* Versiones anteriores guardaban el avance en localStorage. Se borra una
       vez para no dejar basura en los equipos donde ya se jugó. */
    (function limpiarRastroViejo() {
        try {
            if (global.localStorage) global.localStorage.removeItem("pednia:constelacion:progreso:v1");
        } catch (e) { /* almacenamiento bloqueado: nada que limpiar */ }
    })();

    function vacio(totalNiveles) {
        var niveles = {};
        var i;
        for (i = 1; i <= totalNiveles; i++) {
            niveles[i] = {
                desbloqueado: i === 1,   // el primero siempre abierto
                completado: false,
                intentos: 0,
                errores: 0,
                tiempoSeg: 0,
                completadoEn: null
            };
        }
        return { version: 1, niveles: niveles };
    }

    function leer(totalNiveles) {
        if (!estado) estado = vacio(totalNiveles);
        return estado;
    }

    /**
     * Marca un nivel como completado y abre el siguiente.
     * @returns {{estado:object, desbloqueado:number|null}}
     */
    function completar(totalNiveles, nivelId, datos) {
        var st = leer(totalNiveles);
        var n = st.niveles[nivelId];
        if (!n) return { estado: st, desbloqueado: null };

        n.completado = true;
        n.desbloqueado = true;
        n.intentos = (n.intentos || 0) + 1;
        n.errores = (n.errores || 0) + ((datos && datos.errores) || 0);
        n.tiempoSeg = (datos && datos.tiempoSeg) || n.tiempoSeg;
        n.completadoEn = new Date().toISOString();

        var siguiente = Number(nivelId) + 1;
        var abierto = null;
        if (st.niveles[siguiente] && !st.niveles[siguiente].desbloqueado) {
            st.niveles[siguiente].desbloqueado = true;
            abierto = siguiente;
        }
        return { estado: st, desbloqueado: abierto };
    }

    /** Suma un intento sin completar (el niño entró al nivel). */
    function registrarIntento(totalNiveles, nivelId) {
        var st = leer(totalNiveles);
        var n = st.niveles[nivelId];
        if (n) n.intentos = (n.intentos || 0) + 1;
        return st;
    }

    function desbloqueado(st, nivelId) {
        var n = st && st.niveles[nivelId];
        return !!(n && n.desbloqueado);
    }

    function completado(st, nivelId) {
        var n = st && st.niveles[nivelId];
        return !!(n && n.completado);
    }

    /** Primer nivel sin completar. */
    function nivelSugerido(st, totalNiveles) {
        var i;
        for (i = 1; i <= totalNiveles; i++) {
            if (!completado(st, i)) return i;
        }
        return totalNiveles;
    }

    function todosCompletados(st, totalNiveles) {
        var i;
        for (i = 1; i <= totalNiveles; i++) {
            if (!completado(st, i)) return false;
        }
        return true;
    }

    function reiniciar(totalNiveles) {
        estado = vacio(totalNiveles);
        return estado;
    }

    global.ConstelacionProgreso = {
        vacio: vacio,
        leer: leer,
        completar: completar,
        registrarIntento: registrarIntento,
        desbloqueado: desbloqueado,
        completado: completado,
        nivelSugerido: nivelSugerido,
        todosCompletados: todosCompletados,
        reiniciar: reiniciar
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ConstelacionProgreso;
})(typeof window !== "undefined" ? window : globalThis);
