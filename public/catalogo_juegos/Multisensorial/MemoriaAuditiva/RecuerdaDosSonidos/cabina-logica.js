/**
 * Estado puro de las bandejas de la cabina (sin DOM ni Phaser).
 * Dos huecos: el niño llena el conjunto escuchado; el orden no importa.
 */
(function (global) {
    'use strict';

    function crear(nHuecos) {
        var n = Math.max(1, nHuecos | 0);
        var huecos = [];
        for (var i = 0; i < n; i++) huecos.push(null);
        return { huecos: huecos, n: n };
    }

    function indiceLibre(estado) {
        for (var i = 0; i < estado.huecos.length; i++) {
            if (estado.huecos[i] == null) return i;
        }
        return -1;
    }

    function contiene(estado, id) {
        return estado.huecos.indexOf(id) >= 0;
    }

    function ocupar(estado, id) {
        if (contiene(estado, id)) return { ok: false, indice: -1, motivo: 'duplicado' };
        var i = indiceLibre(estado);
        if (i < 0) return { ok: false, indice: -1, motivo: 'lleno' };
        estado.huecos[i] = id;
        return { ok: true, indice: i };
    }

    function liberar(estado, id) {
        var i = estado.huecos.indexOf(id);
        if (i < 0) return false;
        estado.huecos[i] = null;
        return true;
    }

    function llenas(estado) {
        for (var i = 0; i < estado.huecos.length; i++) {
            if (estado.huecos[i] == null) return false;
        }
        return true;
    }

    function ids(estado) {
        var out = [];
        for (var i = 0; i < estado.huecos.length; i++) {
            if (estado.huecos[i] != null) out.push(estado.huecos[i]);
        }
        return out;
    }

    global.CabinaLogica = {
        crear: crear,
        indiceLibre: indiceLibre,
        ocupar: ocupar,
        liberar: liberar,
        contiene: contiene,
        llenas: llenas,
        ids: ids
    };
})(typeof window !== 'undefined' ? window : this);
