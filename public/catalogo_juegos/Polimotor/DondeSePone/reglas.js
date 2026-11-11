/**
 * Reglas — lógica pura de "¿Dónde se pone?" (window.Reglas y module.exports).
 *
 * No toca el DOM ni Phaser: dice a qué zona del cuerpo va cada accesorio, decide sobre qué zona se soltó
 * un accesorio, arma las rondas (orden de las instrucciones y lugares de la bandeja) y elige el siguiente
 * accesorio pendiente. Lo usan script.js, escenario-phaser.js, arrastre.js y scripts/probar-donde-se-pone.js.
 *
 * Las asociaciones salen de config.json → accesorios[].zona. Cada ronda elige juego.porRonda partes
 * distintas y un solo accesorio de cada una (dos tenis no comparten ronda con las botas).
 * juego.noJuntas evita pares de zonas que se pisan al soltar (manos y muñecas).
 */
(function (global) {
    "use strict";

    var ZONAS = ["cabeza", "ojos", "orejas", "cuello", "torso", "manos", "munecas", "piernas", "pies"];

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

    function gruposPorZona(config) {
        var g = {};
        lista(config).forEach(function (a) {
            if (!a || !a.id || !a.zona) return;
            if (!g[a.zona]) g[a.zona] = [];
            g[a.zona].push(a.id);
        });
        return g;
    }

    function chocan(a, b, pares) {
        for (var i = 0; i < (pares || []).length; i++) {
            var p = pares[i];
            if (!p || p.length < 2) continue;
            if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) return true;
        }
        return false;
    }

    /** Hasta n zonas, distintas, sin repetir las de la ronda anterior mientras haya otras, y sin pares noJuntas. */
    function elegirZonas(zonas, n, rnd, anterior, pares) {
        var usadas = anterior || [];
        var frescas = zonas.filter(function (z) { return usadas.indexOf(z) < 0; });
        var repetidas = zonas.filter(function (z) { return usadas.indexOf(z) >= 0; });
        var bolsa = barajar(frescas, rnd).concat(barajar(repetidas, rnd));
        var elegidas = [];
        function tomar(listaZ) {
            for (var i = 0; i < listaZ.length && elegidas.length < n; i++) {
                var z = listaZ[i];
                if (elegidas.indexOf(z) >= 0) continue;
                if (elegidas.some(function (e) { return chocan(e, z, pares); })) continue;
                elegidas.push(z);
            }
        }
        tomar(bolsa);
        if (elegidas.length < n) tomar(barajar(zonas, rnd));
        return elegidas;
    }

    function zonaDeId(gruposMap, id) {
        var zonas = Object.keys(gruposMap);
        for (var i = 0; i < zonas.length; i++) if (gruposMap[zonas[i]].indexOf(id) >= 0) return zonas[i];
        return null;
    }

    /**
     * Rondas de la partida. Cada una trae juego.porRonda accesorios (4) de partes distintas: un solo objeto
     * por zona, así los tenis no salen con las botas ni la bufanda con el collar. El orden de las instrucciones
     * y los lugares de la bandeja cambian en cada ronda, y no empieza por el accesorio con que terminó la anterior.
     *   → [{ numero, orden: [ids], lugares: { id: indiceDeLugar } }]
     */
    function armarRondas(config, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var gruposMap = gruposPorZona(config);
        var zonas = Object.keys(gruposMap);
        if (!zonas.length) return [];
        var juego = (config && config.juego) || {};
        var total = Math.max(1, Number(juego.rondas) || 3);
        var porRonda = Math.max(1, Math.min(Number(juego.porRonda) || 4, zonas.length));
        var pares = Array.isArray(juego.noJuntas) ? juego.noJuntas : [];
        var cupos = [];
        for (var c = 0; c < porRonda; c++) cupos.push(c);

        var rondas = [];
        var anterior = null;
        var zonasAnt = null;
        for (var n = 0; n < total; n++) {
            var ids = null;
            var zonasRonda = null;
            for (var intento = 0; intento < 16; intento++) {
                zonasRonda = elegirZonas(zonas, porRonda, r, zonasAnt, pares);
                ids = zonasRonda.map(function (z) {
                    var opciones = gruposMap[z];
                    var previas = (anterior || []).filter(function (id) { return opciones.indexOf(id) >= 0; });
                    var pool = opciones.filter(function (id) { return previas.indexOf(id) < 0; });
                    if (!pool.length) pool = opciones;
                    return pool[Math.floor(r() * pool.length)];
                });
                var firma = function (zs) { return (zs || []).slice().sort().join("|"); };
                if (!anterior || firma(zonasRonda) !== firma(zonasAnt)) break;
            }
            var orden = barajar(ids, r);
            if (anterior && orden.length > 1) {
                for (var k = 0; k < 12 && (igual(orden, anterior) || orden[0] === anterior[anterior.length - 1]); k++) {
                    orden = barajar(ids, r);
                }
                if (orden[0] === anterior[anterior.length - 1]) {
                    var t = orden[0];
                    orden[0] = orden[1];
                    orden[1] = t;
                }
            }
            var lugares = barajar(cupos, r);
            var mapa = {};
            orden.forEach(function (id, i) { mapa[id] = lugares[i]; });
            rondas.push({ numero: n + 1, orden: orden, lugares: mapa });
            anterior = orden;
            zonasAnt = orden.map(function (id) { return zonaDeId(gruposMap, id); });
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
