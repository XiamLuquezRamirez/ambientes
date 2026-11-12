/**
 * ReglasUne — reglas puras de "Une las Partes del Cuerpo" (window.ReglasUne y module.exports).
 *
 * No toca la pantalla: el escenario le pasa las tarjetas de config.json y las posiciones de los puntos,
 * y estas funciones deciden. Así se prueban con node (scripts/probar-une-partes-cuerpo.js).
 *
 * Regla fundamental: una conexión es correcta solo si el punto donde se soltó la línea es EL punto de
 * esa tarjeta (identidad). La cercanía solo sirve para saber qué punto eligió el niño: soltar la tarjeta
 * MANO cerca del brazo elige el punto del brazo, y eso es un error.
 *
 * Toda línea soltada sobre un punto libre se queda pegada (sin decir si está bien). Al unir las diez se
 * califican todas: verde las correctas, rojo las incorrectas (calificar).
 */
(function (global) {
    "use strict";

    function tarjetas(cfg) {
        return (cfg && cfg.tarjetas) || [];
    }

    function tarjeta(cfg, id) {
        return tarjetas(cfg).find(function (t) { return t.id === id; }) || null;
    }

    /** Tarjeta dueña de un punto del cuerpo ("p-nariz" → tarjeta nariz). */
    function tarjetaDePunto(cfg, puntoId) {
        return tarjetas(cfg).find(function (t) { return t.punto === puntoId; }) || null;
    }

    /** ¿La tarjeta va en ese punto? Se compara la identidad, nunca la distancia. */
    function esCorrecta(cfg, tarjetaId, puntoId) {
        var t = tarjeta(cfg, tarjetaId);
        return !!(t && puntoId && t.punto === puntoId);
    }

    /**
     * Punto que elige el niño al soltar en (x, y): el más cercano dentro de `radio`.
     * puntos = [{ id, x, y }]. Devuelve { id, d } o null si ninguno está a su alcance.
     * `excluir` deja fuera puntos ya conectados (no se pueden volver a usar).
     */
    function puntoCercano(puntos, x, y, radio, excluir) {
        var mejor = null;
        (puntos || []).forEach(function (p) {
            if (excluir && excluir.indexOf(p.id) >= 0) return;
            var d = Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y));
            if (d > radio) return;
            if (!mejor || d < mejor.d) mejor = { id: p.id, d: d };
        });
        return mejor;
    }

    /**
     * Resultado de soltar la línea de `tarjetaId` sobre `puntoId`, con las conexiones ya hechas
     * (mapa tarjetaId → puntoId):
     *   "repetida"  la tarjeta ya estaba conectada (no se conecta dos veces)
     *   "nada"      se soltó lejos de todo punto: la línea vuelve sin error
     *   "ocupado"   el punto ya tiene la línea de su tarjeta
     *   "correcta"  la tarjeta y el punto son la misma parte
     *   "error"     otra parte del cuerpo
     */
    function evaluar(cfg, conexiones, tarjetaId, puntoId) {
        conexiones = conexiones || {};
        if (conexiones[tarjetaId]) return "repetida";
        if (!puntoId) return "nada";
        var ocupado = Object.keys(conexiones).some(function (k) { return conexiones[k] === puntoId; });
        if (ocupado) return "ocupado";
        return esCorrecta(cfg, tarjetaId, puntoId) ? "correcta" : "error";
    }

    function progreso(cfg, conexiones) {
        var total = tarjetas(cfg).length;
        var hechas = tarjetas(cfg).filter(function (t) { return conexiones && conexiones[t.id]; }).length;
        return { hechas: hechas, total: total, faltan: total - hechas, completo: total > 0 && hechas === total };
    }

    /**
     * Revisión al pulsar ENVIAR RESPUESTAS: todas conectadas y cada una con su punto.
     * Devuelve { ok, faltan, malas: [ids] }.
     */
    function revisarEnvio(cfg, conexiones) {
        conexiones = conexiones || {};
        var pr = progreso(cfg, conexiones);
        var malas = tarjetas(cfg).filter(function (t) {
            return conexiones[t.id] && !esCorrecta(cfg, t.id, conexiones[t.id]);
        }).map(function (t) { return t.id; });
        return { ok: pr.completo && !malas.length, faltan: pr.faltan, malas: malas };
    }

    /**
     * Calificación al unir las diez: lista en el orden en que se revisan (columna izquierda de arriba a
     * abajo y luego la derecha). Devuelve { orden: [{ id, ok }], bien: n, mal: n, todasBien }.
     * `yaBien` deja fuera las que ya quedaron en verde en una revisión anterior.
     */
    function calificar(cfg, conexiones, yaBien) {
        conexiones = conexiones || {};
        yaBien = yaBien || {};
        var orden = tarjetas(cfg).filter(function (t) { return conexiones[t.id] && !yaBien[t.id]; }).slice().sort(function (a, b) {
            var la = (a.tarjeta && a.tarjeta.lado) === "der" ? 1 : 0;
            var lb = (b.tarjeta && b.tarjeta.lado) === "der" ? 1 : 0;
            return (la - lb) || (((a.tarjeta && a.tarjeta.fila) || 0) - ((b.tarjeta && b.tarjeta.fila) || 0));
        }).map(function (t) {
            return { id: t.id, ok: esCorrecta(cfg, t.id, conexiones[t.id]) };
        });
        var mal = orden.filter(function (x) { return !x.ok; }).length;
        return { orden: orden, bien: orden.length - mal, mal: mal, todasBien: mal === 0 };
    }

    /** Siguiente tarjeta sin conectar (para la pista), empezando después de `desde`. */
    function siguientePendiente(cfg, conexiones, desde) {
        var lista = tarjetas(cfg);
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

    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? datos[k] : m;
        });
    }

    var ReglasUne = {
        tarjetas: tarjetas,
        tarjeta: tarjeta,
        tarjetaDePunto: tarjetaDePunto,
        esCorrecta: esCorrecta,
        puntoCercano: puntoCercano,
        evaluar: evaluar,
        progreso: progreso,
        revisarEnvio: revisarEnvio,
        calificar: calificar,
        siguientePendiente: siguientePendiente,
        plantilla: plantilla
    };

    if (typeof module !== "undefined" && module.exports) module.exports = ReglasUne;
    if (global) global.ReglasUne = ReglasUne;
})(typeof window !== "undefined" ? window : null);
