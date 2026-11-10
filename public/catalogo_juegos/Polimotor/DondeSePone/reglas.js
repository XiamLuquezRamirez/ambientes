/**
 * Reglas — lógica pura de "¿Dónde se pone?" (window.Reglas y module.exports).
 *
 * No toca el DOM ni Phaser: dice a qué zona del cuerpo va cada accesorio, decide sobre qué zona se soltó
 * un accesorio, arma las rondas (orden de las instrucciones y lugares de la bandeja) y elige el siguiente
 * accesorio pendiente. Lo usan script.js, escenario-phaser.js, arrastre.js y scripts/probar-donde-se-pone.js.
 *
 * Las asociaciones salen de config.json → accesorios[].zona, así que un accesorio nuevo no cambia esta mecánica:
 *   gafas → ojos · sombrero → cabeza · zapatos → pies · bufanda → cuello
 */
(function (global) {
    "use strict";

    var ZONAS = ["cabeza", "ojos", "cuello", "pies"];

    function lista(config) {
        return (config && Array.isArray(config.accesorios)) ? config.accesorios : [];
    }

    function accesorio(config, id) {
        var l = lista(config);
        for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
        return null;
    }

    /** Zona del cuerpo donde va el accesorio (o null si no existe). */
    function zonaDe(config, id) {
        var a = accesorio(config, id);
        return a ? a.zona : null;
    }

    /** ¿El accesorio soltado en esa zona va ahí? */
    function esCorrecta(config, id, zonaId) {
        if (!id || !zonaId) return false;
        return zonaDe(config, id) === zonaId;
    }

    /** Distancia normalizada de un punto a una zona elíptica: < 1 dentro, 0 en el centro. */
    function distanciaNormalizada(px, py, zona) {
        var rx = zona.rx || zona.r || 1;
        var ry = zona.ry || zona.r || 1;
        var dx = (px - zona.x) / rx;
        var dy = (py - zona.y) / ry;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Entre las zonas que alcanza el accesorio gana la de distancia normalizada menor.
     * candidatos: [{ id, d }]. `tolerancia` (≥ 1) agranda las zonas para dedos pequeños.
     */
    function elegirZona(candidatos, tolerancia) {
        var t = Number(tolerancia) > 0 ? Number(tolerancia) : 1;
        var mejor = null;
        (candidatos || []).forEach(function (c) {
            if (!c || !(c.d <= t)) return;
            if (!mejor || c.d < mejor.d) mejor = c;
        });
        return mejor ? mejor.id : null;
    }

    function barajar(l, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var a = l.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function igual(a, b) {
        if (!a || !b || a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }

    /**
     * Rondas de la partida. La primera usa juego.ordenInicial (gafas, sombrero, zapatos, bufanda) y los lugares
     * de config; las siguientes cambian el orden de las instrucciones (distinto al anterior y sin empezar por el
     * accesorio con que terminó la ronda anterior) y reparten los accesorios en otros lugares de la bandeja.
     * Las asociaciones objeto → parte del cuerpo nunca cambian.
     *   → [{ numero, orden: [ids], lugares: { id: indiceDeLugar } }]
     */
    function armarRondas(config, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var ids = lista(config).map(function (a) { return a.id; });
        if (!ids.length) return [];
        var juego = (config && config.juego) || {};
        var total = Math.max(1, Number(juego.rondas) || 3);
        var inicial = (Array.isArray(juego.ordenInicial) ? juego.ordenInicial : []).filter(function (id) { return ids.indexOf(id) >= 0; });
        ids.forEach(function (id) { if (inicial.indexOf(id) < 0) inicial.push(id); });
        // lugar de la bandeja de cada accesorio en la 1.ª ronda: accesorios[].posicionInicial (o su índice)
        var lugaresBase = lista(config).map(function (a, i) {
            var n = Number(a.posicionInicial);
            return isFinite(n) && n >= 0 ? n : i;
        });

        var rondas = [];
        var anterior = null;
        var lugaresAnt = null;
        for (var n = 0; n < total; n++) {
            var orden;
            var lugares;
            if (n === 0) {
                orden = inicial.slice();
                lugares = lugaresBase.slice();
            } else {
                orden = barajar(inicial, r);
                for (var k = 0; k < 12 && ids.length > 1 && (igual(orden, anterior) || orden[0] === anterior[anterior.length - 1]); k++) {
                    orden = barajar(inicial, r);
                }
                if (ids.length > 1 && orden[0] === anterior[anterior.length - 1]) {
                    var t = orden[0];
                    orden[0] = orden[1];
                    orden[1] = t;
                }
                lugares = barajar(lugaresBase, r);
                for (var q = 0; q < 12 && ids.length > 1 && igual(lugares, lugaresAnt); q++) lugares = barajar(lugaresBase, r);
            }
            var mapa = {};
            ids.forEach(function (id, i) { mapa[id] = lugares[i]; });
            rondas.push({ numero: n + 1, orden: orden, lugares: mapa });
            anterior = orden;
            lugaresAnt = lugares;
        }
        return rondas;
    }

    /** Primer accesorio del orden que todavía no está puesto (o null si ya están todos). */
    function siguientePendiente(orden, colocados) {
        var c = colocados || [];
        for (var i = 0; i < (orden || []).length; i++) if (c.indexOf(orden[i]) < 0) return orden[i];
        return null;
    }

    /** Reemplaza {clave} en un texto. */
    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? String(datos[k]) : m;
        });
    }

    var Reglas = {
        ZONAS: ZONAS,
        accesorio: accesorio,
        zonaDe: zonaDe,
        esCorrecta: esCorrecta,
        distanciaNormalizada: distanciaNormalizada,
        elegirZona: elegirZona,
        barajar: barajar,
        armarRondas: armarRondas,
        siguientePendiente: siguientePendiente,
        plantilla: plantilla
    };

    global.Reglas = Reglas;
    if (typeof module !== "undefined" && module.exports) module.exports = Reglas;
})(typeof window !== "undefined" ? window : this);
