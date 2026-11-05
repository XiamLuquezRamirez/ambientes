/* Lógica pura: secuencia de bloques por mundo y validación de orden. Sin DOM. */
(function (global) {
    "use strict";

    var PALETA = [
        "#ef4444", "#f59e0b", "#eab308", "#84cc16",
        "#22c55e", "#10b981", "#06b6d4", "#3b82f6",
        "#6366f1", "#8b5cf6", "#a855f7", "#ec4899"
    ];

    /** n de bloques por mundo: siempre entre 4 y 8, distinto en cada mundo. */
    var LONGITUDES_VALIDAS = [4, 5, 6, 7, 8];

    function totalBloques(mundo) {
        var n = mundo && Number(mundo.totalBloquesAlmacen);
        return isFinite(n) && n > 0 ? Math.floor(n) : 12;
    }

    /** El primer mundo es el más fácil: 4 o 5 bloques, y siempre desde el 1. */
    var LONGITUDES_PRIMER_MUNDO = [4, 5];

    /**
     * Elige una longitud por mundo sin repetir entre mundos. La del primero sale
     * de LONGITUDES_PRIMER_MUNDO y el resto se reparte entre las que quedan.
     * @param {number} cantidadMundos
     * @param {function} rnd Math.random o equivalente
     * @returns {number[]} longitudes, una por mundo
     */
    function repartirLongitudes(cantidadMundos, rnd) {
        var azar = typeof rnd === "function" ? rnd : Math.random;
        var i, j, t;

        var primera = LONGITUDES_PRIMER_MUNDO[Math.floor(azar() * LONGITUDES_PRIMER_MUNDO.length)];
        var pool = LONGITUDES_VALIDAS.filter(function (n) { return n !== primera; });
        for (i = pool.length - 1; i > 0; i--) {
            j = Math.floor(azar() * (i + 1));
            t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }

        var salida = [primera].concat(pool);
        return salida.slice(0, Math.min(cantidadMundos, salida.length));
    }

    /**
     * Secuencia objetivo: `largo` números CONSECUTIVOS dentro de 1..total.
     * Se sortea el inicio en 1..(total - largo + 1), así la serie nunca se sale
     * del almacén. Ej.: largo 4, total 12, inicio 7 → [7, 8, 9, 10].
     * El índice 0 es el bloque de abajo del motor.
     */
    function generarSecuencia(largo, total, rnd, desdeUno) {
        var azar = typeof rnd === "function" ? rnd : Math.random;
        var n = Math.max(1, Math.min(largo, total));
        var maxInicio = total - n + 1;
        var inicio = desdeUno ? 1 : 1 + Math.floor(azar() * maxInicio);
        var serie = [];
        var i;
        for (i = 0; i < n; i++) serie.push(inicio + i);
        return serie;
    }

    function crearBloques(total) {
        var bloques = [];
        var i;
        for (i = 1; i <= total; i++) {
            bloques.push({
                id: "bloque-" + i,
                numero: i,
                color: PALETA[(i - 1) % PALETA.length],
                usado: false
            });
        }
        return bloques;
    }

    /**
     * Estado de un mundo.
     * @param {object} mundo definición del config
     * @param {number} largo cuántos bloques pide este mundo (4..8)
     * @param {function} rnd
     */
    function crearEstado(mundo, largo, rnd, desdeUno) {
        var total = totalBloques(mundo);
        var secuencia = (mundo && Array.isArray(mundo.secuenciaFija) && mundo.secuenciaFija.length)
            ? mundo.secuenciaFija.slice()
            : generarSecuencia(largo, total, rnd, desdeUno);
        var slots = [];
        var i;
        for (i = 0; i < secuencia.length; i++) slots.push(null);
        return {
            meta: secuencia.length,
            total: total,
            secuencia: secuencia,
            slots: slots,
            bloques: crearBloques(total),
            errores: 0
        };
    }

    function buscarBloque(estado, bloqueId) {
        var i;
        for (i = 0; i < estado.bloques.length; i++) {
            if (estado.bloques[i].id === bloqueId) return estado.bloques[i];
        }
        return null;
    }

    function cuantosColocados(estado) {
        if (!estado || !Array.isArray(estado.slots)) return 0;
        var n = 0, i;
        for (i = 0; i < estado.slots.length; i++) if (estado.slots[i]) n++;
        return n;
    }

    /** Índice del próximo hueco a llenar (se llena en orden 0,1,2…). */
    function siguienteIndice(estado) {
        return cuantosColocados(estado);
    }

    /** Número que el cohete espera ahora mismo. */
    function numeroEsperado(estado) {
        if (!estado) return null;
        var i = siguienteIndice(estado);
        return i < estado.secuencia.length ? estado.secuencia[i] : null;
    }

    function completado(estado) {
        return !!estado && cuantosColocados(estado) >= estado.meta;
    }

    /** ¿La pila coincide exactamente con la secuencia pedida? */
    function secuenciaCorrecta(estado) {
        if (!completado(estado)) return false;
        var i;
        for (i = 0; i < estado.secuencia.length; i++) {
            var id = estado.slots[i];
            if (!id) return false;
            var b = buscarBloque(estado, id);
            if (!b || b.numero !== estado.secuencia[i]) return false;
        }
        return true;
    }

    /**
     * Intenta colocar un bloque en el siguiente hueco.
     * Solo entra si es el número esperado; si no, devuelve ok:false y el motivo.
     */
    function colocarBloque(estado, bloqueId) {
        if (!estado) return { ok: false, motivo: "sin-estado" };
        if (completado(estado)) return { ok: false, motivo: "lleno" };
        var bloque = buscarBloque(estado, bloqueId);
        if (!bloque) return { ok: false, motivo: "no-existe" };
        if (bloque.usado) return { ok: false, motivo: "ya-usado" };

        var indice = siguienteIndice(estado);
        var esperado = estado.secuencia[indice];
        if (bloque.numero !== esperado) {
            estado.errores += 1;
            return { ok: false, motivo: "fuera-de-orden", esperado: esperado, recibido: bloque.numero };
        }

        bloque.usado = true;
        estado.slots[indice] = bloque.id;
        return {
            ok: true,
            slot: indice,
            orden: indice + 1,
            bloque: bloque,
            completo: completado(estado)
        };
    }

    function quitarUltimoBloque(estado) {
        if (!estado) return null;
        var i;
        for (i = estado.slots.length - 1; i >= 0; i--) {
            if (estado.slots[i]) {
                var id = estado.slots[i];
                estado.slots[i] = null;
                var b = buscarBloque(estado, id);
                if (b) b.usado = false;
                return id;
            }
        }
        return null;
    }

    function palabraNumero(n) {
        var tabla = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis",
            "siete", "ocho", "nueve", "diez", "once", "doce"];
        return tabla[n] || String(n);
    }

    global.CoheteEstelarLogica = {
        PALETA: PALETA,
        LONGITUDES_VALIDAS: LONGITUDES_VALIDAS,
        repartirLongitudes: repartirLongitudes,
        generarSecuencia: generarSecuencia,
        totalBloques: totalBloques,
        crearEstado: crearEstado,
        crearBloques: crearBloques,
        colocarBloque: colocarBloque,
        quitarUltimoBloque: quitarUltimoBloque,
        cuantosColocados: cuantosColocados,
        siguienteIndice: siguienteIndice,
        numeroEsperado: numeroEsperado,
        completado: completado,
        secuenciaCorrecta: secuenciaCorrecta,
        palabraNumero: palabraNumero
    };
})(typeof window !== "undefined" ? window : this);
