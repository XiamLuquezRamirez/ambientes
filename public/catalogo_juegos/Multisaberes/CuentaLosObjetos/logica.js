/**
 * CuentaLosObjetosLogica — reglas puras, sin DOM.
 * cantidadObjetos es el total. piezasVisibles es cuántas se ven a la vez.
 * La respuesta correcta se deriva de cantidadObjetos.
 */
(function (global) {
    "use strict";

    var VOCES = ["zoe", "zeus"];
    var CANTIDADES = [2, 3, 4, 5];
    var VISIBLES_DEFECTO = 2;
    var NUMEROS = { 1: "¡Uno!", 2: "¡Dos!", 3: "¡Tres!", 4: "¡Cuatro!", 5: "¡Cinco!" };
    var PREGUNTA_TOTAL = "¡Genial! ¿Cuántas manzanas contamos en total?";

    function entero(valor) {
        var n = Number(valor);
        return isFinite(n) ? Math.floor(n) : null;
    }

    function positivo(valor, defecto) {
        var n = entero(valor);
        return n != null && n > 0 ? n : defecto;
    }

    function esLinea(linea) {
        return !!(linea && typeof linea.texto === "string" && linea.texto.trim() && VOCES.indexOf(linea.voz) !== -1);
    }

    function mezclar(lista, aleatorio) {
        var rnd = typeof aleatorio === "function" ? aleatorio : Math.random;
        var out = (lista || []).slice();
        var i;
        for (i = out.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    function cantidadDe(reto) {
        var n = entero(reto && reto.cantidadObjetos);
        if (CANTIDADES.indexOf(n) === -1) return null;
        return n;
    }

    function respuestaDe(reto) {
        return cantidadDe(reto);
    }

    /** Cantidad de manzanas al azar (2–5), independiente de las opciones del reto. */
    function cantidadAleatoria(aleatorio) {
        var rnd = typeof aleatorio === "function" ? aleatorio : Math.random;
        return CANTIDADES[Math.floor(rnd() * CANTIDADES.length)];
    }

    /**
     * Tope global de accesibilidad primero. Si el reto pide menos, se respeta.
     * Si pide más que el tope, se recorta sin cambiar el total de manzanas.
     */
    function piezasVisiblesEfectivas(reto, globalValor) {
        var tope = entero(globalValor);
        var delReto = reto ? entero(reto.piezasVisibles) : null;
        var pedido = delReto != null && delReto > 0
            ? delReto
            : (tope != null && tope > 0 ? tope : VISIBLES_DEFECTO);
        if (tope != null && tope > 0) pedido = Math.min(pedido, tope);
        return Math.max(1, pedido);
    }

    /**
     * Opciones de respuesta. Si se pasa correctoForzado (p. ej. cantidad aleatoria),
     * se usa ese valor y no cantidadObjetos del reto.
     */
    function opcionesDe(reto, maxOpciones, aleatorio, correctoForzado) {
        var correcto = correctoForzado != null ? entero(correctoForzado) : respuestaDe(reto);
        var lista = [];
        (reto && reto.opciones || []).forEach(function (opcion) {
            var n = entero(opcion);
            if (n == null || n < 1 || n > 9) return;
            if (lista.indexOf(n) !== -1) return;
            lista.push(n);
        });
        /* Distracciones base 1–5 si el reto no trae opciones. */
        if (!lista.length) {
            [1, 2, 3, 4, 5].forEach(function (n) { lista.push(n); });
        }
        if (correcto != null && lista.indexOf(correcto) === -1) lista.push(correcto);
        var max = entero(maxOpciones);
        if (max != null && max >= 1 && lista.length > max) {
            var otras = lista.filter(function (n) { return n !== correcto; });
            otras = mezclar(otras, aleatorio);
            lista = otras.slice(0, Math.max(0, max - 1));
            if (correcto != null) lista.push(correcto);
        }
        return ordenarOpciones(lista, correcto, aleatorio);
    }

    function ordenarOpciones(lista, correcto, aleatorio) {
        var orden = mezclar(lista, aleatorio);
        if (orden.length < 3 || correcto == null) return orden;
        var medio = Math.floor((orden.length - 1) / 2);
        var i;
        for (i = 0; i < 40 && orden[medio] === correcto; i++) orden = mezclar(lista, aleatorio);
        if (orden[medio] === correcto) {
            var tmp = orden[0];
            orden[0] = orden[medio];
            orden[medio] = tmp;
        }
        return orden;
    }

    function crearManzanas(cantidad) {
        var total = entero(cantidad);
        var out = [];
        var i;
        if (total == null || total < 1) return out;
        for (i = 1; i <= total; i++) {
            out.push({ id: "manzana-" + i, contada: false, orden: null });
        }
        return out;
    }

    function buscar(manzanas, id) {
        var i;
        for (i = 0; i < manzanas.length; i++) {
            if (manzanas[i].id === id) return manzanas[i];
        }
        return null;
    }

    function contadas(manzanas) {
        var n = 0;
        var i;
        for (i = 0; i < (manzanas || []).length; i++) if (manzanas[i].contada) n += 1;
        return n;
    }

    function tocar(manzanas, id) {
        var manzana = buscar(manzanas || [], id);
        if (!manzana) return { ok: false, motivo: "desconocida", total: contadas(manzanas) };
        if (manzana.contada) {
            return { ok: false, motivo: "ya-contada", manzana: manzana, numero: manzana.orden, total: contadas(manzanas) };
        }
        var numero = contadas(manzanas) + 1;
        manzana.contada = true;
        manzana.orden = numero;
        return {
            ok: true,
            manzana: manzana,
            numero: numero,
            total: numero,
            completo: numero === manzanas.length
        };
    }

    function reiniciarConteo(manzanas) {
        (manzanas || []).forEach(function (manzana) {
            manzana.contada = false;
            manzana.orden = null;
        });
        return manzanas;
    }

    function pagina(manzanas, visibles, indice) {
        var size = Math.max(1, entero(visibles) || 1);
        var lista = manzanas || [];
        var paginas = Math.max(1, Math.ceil(lista.length / size));
        var n = entero(indice) || 0;
        if (n < 0) n = 0;
        if (n > paginas - 1) n = paginas - 1;
        var inicio = n * size;
        return {
            pagina: n,
            paginas: paginas,
            inicio: inicio,
            items: lista.slice(inicio, inicio + size)
        };
    }

    function paginaConPendientes(manzanas, visibles, desde) {
        var vista = pagina(manzanas, visibles, 0);
        var i;
        for (i = 0; i < vista.paginas; i++) {
            var idx = (desde + i) % vista.paginas;
            var bloque = pagina(manzanas, visibles, idx);
            var pendiente = bloque.items.some(function (m) { return !m.contada; });
            if (pendiente) return bloque;
        }
        return pagina(manzanas, visibles, desde);
    }

    function evaluar(correcto, elegido) {
        return entero(elegido) === entero(correcto) ? "correcto" : "incorrecto";
    }

    function textoNumero(n) {
        return NUMEROS[n] || String(n);
    }

    function textoAcierto(n) {
        return "¡Muy bien! Contaste " + n + (n === 1 ? " manzana." : " manzanas.");
    }

    function textoError() {
        return "¡Vamos a intentarlo otra vez! Toca las manzanas una por una para contar cuántas hay.";
    }

    function nivelPista(fallos, umbrales) {
        var u = umbrales || {};
        if (u.automaticas === false) return 0;
        var n = entero(fallos) || 0;
        var antes = positivo(u.erroresAntesDePista, 2);
        var p1 = positivo(u.fallosPista1, 2);
        var p2 = positivo(u.fallosPista2, 3);
        var nivel = 0;
        if (n >= antes) nivel = 1;
        if (n >= p1) nivel = Math.max(nivel, 2);
        if (n >= p2) nivel = Math.max(nivel, 3);
        if (n >= p2 + 1) nivel = 4;
        return nivel;
    }

    function atenuarOpciones(fallos, umbral) {
        return (entero(fallos) || 0) >= positivo(umbral, 2);
    }

    function revelarRespuesta(intentos, maximo) {
        var max = entero(maximo);
        if (max == null || max < 1) return false;
        return (entero(intentos) || 0) >= max;
    }

    function validarConfig(cfg) {
        var errores = [];
        var avisos = [];
        var niveles = (cfg && cfg.niveles) || [];
        var elementos = (cfg && cfg.elementos) || {};
        if (!cfg || cfg.stub) errores.push("config aún es stub");
        if (!niveles.length) errores.push("Sin niveles");
        ["manzana", "canasta", "arbol"].forEach(function (id) {
            var el = elementos[id];
            if (!el || !el.img) errores.push("Elemento " + id + ": sin imagen");
            if (!el || !el.nombre) errores.push("Elemento " + id + ": sin nombre");
        });
        niveles.forEach(function (nivel) {
            var tag = "Nivel " + (nivel && nivel.id);
            var retos = (nivel && nivel.retos) || [];
            if (!retos.length) errores.push(tag + ": sin retos");
            retos.forEach(function (reto, i) {
                var rt = tag + " reto " + (i + 1);
                var cantidad = cantidadDe(reto);
                if (reto.mecanica !== "contar") errores.push(rt + ": se esperaba contar");
                /* cantidadObjetos es opcional: en juego se sortea 2–5. */
                if (reto.cantidadObjetos != null && cantidad == null) {
                    errores.push(rt + ": cantidadObjetos fuera de 2 a 5");
                }
                if (!esLinea(reto.presentacion)) errores.push(rt + ": presentación inválida");
                if (reto.pregunta && !esLinea(reto.pregunta)) errores.push(rt + ": pregunta inválida");
                if (!esLinea(reto.acierto)) errores.push(rt + ": acierto inválido");
                if (!esLinea(reto.errorOtro)) errores.push(rt + ": falta voz de error");
                if (cantidad != null && entero(reto.correcto) != null && entero(reto.correcto) !== cantidad) {
                    avisos.push(rt + ": correcto no coincide con cantidadObjetos (en juego se sortea)");
                }
                CANTIDADES.forEach(function (n) {
                    var vistas = opcionesDe(reto, 6, function () { return 0; }, n);
                    if (vistas.indexOf(n) === -1) errores.push(rt + ": la respuesta " + n + " no cabe en las opciones");
                });
                var unicas = {};
                (reto.opciones || []).forEach(function (op) {
                    if (unicas[op]) avisos.push(rt + ": opción repetida " + op);
                    unicas[op] = true;
                });
            });
            if (!Array.isArray(nivel.cierre) || !nivel.cierre.length || !nivel.cierre.every(esLinea)) {
                errores.push(tag + ": cierre inválido");
            }
            if (!nivel.insignia || !nivel.insignia.img || !nivel.insignia.nombre) errores.push(tag + ": sin insignia");
        });
        return { errores: errores, avisos: avisos };
    }

    var api = {
        VOCES: VOCES,
        CANTIDADES: CANTIDADES,
        PREGUNTA_TOTAL: PREGUNTA_TOTAL,
        esLinea: esLinea,
        mezclar: mezclar,
        cantidadDe: cantidadDe,
        respuestaDe: respuestaDe,
        cantidadAleatoria: cantidadAleatoria,
        piezasVisiblesEfectivas: piezasVisiblesEfectivas,
        opcionesDe: opcionesDe,
        crearManzanas: crearManzanas,
        contadas: contadas,
        tocar: tocar,
        reiniciarConteo: reiniciarConteo,
        pagina: pagina,
        paginaConPendientes: paginaConPendientes,
        evaluar: evaluar,
        textoNumero: textoNumero,
        textoAcierto: textoAcierto,
        textoError: textoError,
        nivelPista: nivelPista,
        atenuarOpciones: atenuarOpciones,
        revelarRespuesta: revelarRespuesta,
        validarConfig: validarConfig
    };

    global.CuentaLosObjetosLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
