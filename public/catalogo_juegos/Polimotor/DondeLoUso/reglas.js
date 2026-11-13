/**
 * ReglasUso — reglas puras de "¿Dónde lo uso?" (window.ReglasUso y module.exports).
 *
 * No toca la pantalla: el escenario le pasa los identificadores de las tarjetas y estas funciones deciden.
 * Así se prueban con node (scripts/probar-donde-lo-uso.js).
 *
 * Regla fundamental: una conexión es correcta solo si la pareja objeto → parte del cuerpo está en
 * config.parejas (por identificador: "gafas" → "ojos"). Nunca se compara el texto visible de la tarjeta.
 * La línea puede empezar en cualquiera de las dos columnas: la pareja se normaliza a (objeto, parte).
 */
(function (global) {
    "use strict";

    function objetos(cfg) {
        return (cfg && cfg.objetos) || [];
    }

    function partes(cfg) {
        return (cfg && cfg.partes) || [];
    }

    /** Todas las tarjetas con su columna: "obj" (izquierda) o "parte" (derecha). */
    function tarjetas(cfg) {
        return objetos(cfg).map(function (t) { return Object.assign({ columna: "obj" }, t); })
            .concat(partes(cfg).map(function (t) { return Object.assign({ columna: "parte" }, t); }));
    }

    function tarjeta(cfg, id) {
        return tarjetas(cfg).find(function (t) { return t.id === id; }) || null;
    }

    function columna(cfg, id) {
        var t = tarjeta(cfg, id);
        return t ? t.columna : null;
    }

    /** Pareja correcta de una tarjeta (sirve para las dos columnas). */
    function parejaDe(cfg, id) {
        var p = (cfg && cfg.parejas) || {};
        if (p[id]) return p[id];
        var k = Object.keys(p).find(function (o) { return p[o] === id; });
        return k || null;
    }

    /** (a, b) en cualquier orden → { objeto, parte } o null si no son de columnas distintas. */
    function normalizar(cfg, a, b) {
        var ca = columna(cfg, a);
        var cb = columna(cfg, b);
        if (!ca || !cb || ca === cb) return null;
        return ca === "obj" ? { objeto: a, parte: b } : { objeto: b, parte: a };
    }

    function esCorrecta(cfg, a, b) {
        var n = normalizar(cfg, a, b);
        return !!(n && cfg.parejas && cfg.parejas[n.objeto] === n.parte);
    }

    /** ¿La tarjeta ya está en una pareja encontrada? conexiones = { objetoId: parteId }. */
    function conectada(conexiones, id) {
        conexiones = conexiones || {};
        if (conexiones[id]) return true;
        return Object.keys(conexiones).some(function (k) { return conexiones[k] === id; });
    }

    /**
     * Resultado de soltar la línea que salió de `origen` sobre la tarjeta `destino`:
     *   "nada"       se soltó lejos de toda tarjeta: la línea vuelve sin error
     *   "mismoLado"  se soltó en una tarjeta de la misma columna: vuelve sin error
     *   "repetida"   el origen ya tiene su pareja (no se conecta dos veces)
     *   "ocupado"    el destino ya tiene su pareja
     *   "correcta"   objeto y parte del cuerpo van juntos
     *   "error"      no van juntos
     */
    function evaluar(cfg, conexiones, origen, destino) {
        if (conectada(conexiones, origen)) return "repetida";
        if (!destino || destino === origen) return "nada";
        if (!normalizar(cfg, origen, destino)) return "mismoLado";
        if (conectada(conexiones, destino)) return "ocupado";
        return esCorrecta(cfg, origen, destino) ? "correcta" : "error";
    }

    function progreso(cfg, conexiones) {
        var total = objetos(cfg).length;
        var hechas = objetos(cfg).filter(function (t) { return conexiones && conexiones[t.id]; }).length;
        return { hechas: hechas, total: total, faltan: total - hechas, completo: total > 0 && hechas === total };
    }

    /** Siguiente objeto sin pareja (para la pista), empezando después de `desde`. */
    function siguientePendiente(cfg, conexiones, desde) {
        var lista = objetos(cfg);
        if (!lista.length) return null;
        var i0 = 0;
        if (desde) {
            var k = lista.findIndex(function (t) { return t.id === desde; });
            if (k >= 0) i0 = k + 1;
        }
        for (var n = 0; n < lista.length; n++) {
            var t = lista[(i0 + n) % lista.length];
            if (!conexiones || !conexiones[t.id]) return t.id;
        }
        return null;
    }

    /**
     * Desordena la columna de partes del cuerpo: devuelve { parteId: fila } donde NINGUNA parte queda en la
     * fila de su objeto (no hay líneas rectas regaladas) y el orden cambia respecto de `actual`
     * ({ parteId: fila }) en al menos tres tarjetas. `azar` (opcional) es una función 0..1.
     */
    function ordenPartes(cfg, actual, azar) {
        azar = azar || Math.random;
        var lista = partes(cfg);
        var n = lista.length;
        var filaObjeto = {};
        objetos(cfg).forEach(function (o) {
            var p = cfg.parejas && cfg.parejas[o.id];
            if (p) filaObjeto[p] = o.fila;
        });
        var filas = lista.map(function (t) { return t.fila; }).sort(function (a, b) { return a - b; });
        var mejor = null;
        for (var intento = 0; intento < 400; intento++) {
            var f = filas.slice();
            for (var j = f.length - 1; j > 0; j--) {
                var k = Math.floor(azar() * (j + 1));
                var t = f[j];
                f[j] = f[k];
                f[k] = t;
            }
            var orden = {};
            var recta = false;
            var cambios = 0;
            lista.forEach(function (p, i) {
                orden[p.id] = f[i];
                if (filaObjeto[p.id] === f[i]) recta = true;
                if (!actual || actual[p.id] !== f[i]) cambios++;
            });
            if (recta) continue;
            if (cambios >= Math.min(3, n)) return orden;
            if (!mejor) mejor = orden;
        }
        if (mejor) return mejor;
        // respaldo: cada parte una fila más abajo que su objeto (en círculo)
        var r = {};
        lista.forEach(function (p) {
            var fo = filaObjeto[p.id] != null ? filaObjeto[p.id] : p.fila;
            r[p.id] = filas[(filas.indexOf(fo) + 1) % n];
        });
        return r;
    }

    /** ¿Alguna parte quedó en la fila de su objeto (línea recta)? */
    function hayRectas(cfg, orden) {
        return objetos(cfg).some(function (o) {
            var p = cfg.parejas && cfg.parejas[o.id];
            return p && orden[p] === o.fila;
        });
    }

    /** Revisión de config.json: devuelve una lista de problemas (vacía si todo está bien). */
    function revisarConfig(cfg, iconos) {
        var p = [];
        var ids = {};
        tarjetas(cfg).forEach(function (t) {
            if (ids[t.id]) p.push("id repetido: " + t.id);
            ids[t.id] = true;
            if (iconos && iconos.indexOf(t.icono) < 0) p.push("sin dibujo: " + t.icono);
        });
        ["obj", "parte"].forEach(function (col) {
            var filas = tarjetas(cfg).filter(function (t) { return t.columna === col; }).map(function (t) { return t.fila; });
            filas.forEach(function (f, i) {
                if (filas.indexOf(f) !== i) p.push("fila repetida en " + col + ": " + f);
            });
        });
        var usadas = {};
        objetos(cfg).forEach(function (o) {
            var parte = cfg.parejas && cfg.parejas[o.id];
            if (!parte) p.push("objeto sin pareja: " + o.id);
            else if (columna(cfg, parte) !== "parte") p.push("pareja no es parte del cuerpo: " + o.id + " → " + parte);
            else if (usadas[parte]) p.push("parte usada dos veces: " + parte);
            usadas[parte] = true;
        });
        partes(cfg).forEach(function (t) {
            if (!usadas[t.id]) p.push("parte sin objeto: " + t.id);
        });
        return p;
    }

    // ------------------------------------------------------------------ rondas

    /** Lista de rondas de config.json (cada una con sus objetos, partes y parejas). */
    function rondas(cfg) {
        return (cfg && cfg.rondas) || [];
    }

    /**
     * Configuración de una ronda lista para las demás funciones: { id, titulo, instruccion, destacar, objetos,
     * partes, parejas, juego }. Las reglas y la escena trabajan siempre con la ronda actual.
     */
    function ronda(cfg, i) {
        var r = rondas(cfg)[i];
        if (!r) return null;
        return Object.assign({}, r, { juego: cfg.juego || {} });
    }

    /** Revisión de todas las rondas: además, ningún identificador se repite entre rondas. */
    function revisarJuego(cfg, iconos) {
        var p = [];
        var vistos = {};
        if (!rondas(cfg).length) p.push("sin rondas");
        rondas(cfg).forEach(function (r, i) {
            revisarConfig(ronda(cfg, i), iconos).forEach(function (x) { p.push("ronda " + (i + 1) + ": " + x); });
            tarjetas(r).forEach(function (t) {
                if (vistos[t.id]) p.push("id en dos rondas: " + t.id);
                vistos[t.id] = true;
            });
        });
        return p;
    }

    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? datos[k] : m;
        });
    }

    var ReglasUso = {
        objetos: objetos,
        partes: partes,
        tarjetas: tarjetas,
        tarjeta: tarjeta,
        columna: columna,
        parejaDe: parejaDe,
        normalizar: normalizar,
        esCorrecta: esCorrecta,
        conectada: conectada,
        evaluar: evaluar,
        progreso: progreso,
        siguientePendiente: siguientePendiente,
        ordenPartes: ordenPartes,
        hayRectas: hayRectas,
        revisarConfig: revisarConfig,
        rondas: rondas,
        ronda: ronda,
        revisarJuego: revisarJuego,
        plantilla: plantilla
    };

    if (typeof module !== "undefined" && module.exports) module.exports = ReglasUso;
    if (global) global.ReglasUso = ReglasUso;
})(typeof window !== "undefined" ? window : null);
