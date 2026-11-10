/**
 * Retos — reglas puras de "El Toque Mágico de las Cosquillas" (window.Retos y module.exports).
 *
 * No toca el DOM ni Phaser: arma las rondas, decide qué zona recibió el toque y si es la pedida.
 * Lo usan script.js (juego), phaser-juego.js (zonas) y scripts/probar-toque-magico.js (pruebas en node).
 *
 * Zonas táctiles en unidades de diseño del personaje (ver personaje.js → GEOMETRIA):
 *   ojo_izq, ojo_der → "ojos" · nariz · boca · mano_izq, mano_der → "manos" · oreja_izq, oreja_der → "orejas"
 *   cabello, coleta_izq, coleta_der → "cabello" · barriga · rodilla_izq, rodilla_der → "rodillas" · pie_izq, pie_der → "pies"
 *   cuerpo → el resto de Zoe (cosquilla neutra: no es acierto ni error).
 */
(function (global) {
    "use strict";

    var PARTES = ["ojos", "nariz", "boca", "manos", "orejas", "cabello", "barriga", "rodillas", "pies"];

    var ZONA_A_PARTE = {
        ojo_izq: "ojos",
        ojo_der: "ojos",
        nariz: "nariz",
        boca: "boca",
        mano_izq: "manos",
        mano_der: "manos",
        oreja_izq: "orejas",
        oreja_der: "orejas",
        cabello: "cabello",
        coleta_izq: "cabello",
        coleta_der: "cabello",
        barriga: "barriga",
        rodilla_izq: "rodillas",
        rodilla_der: "rodillas",
        pie_izq: "pies",
        pie_der: "pies",
        cuerpo: null
    };

    function parteDeZona(zonaId) {
        return Object.prototype.hasOwnProperty.call(ZONA_A_PARTE, zonaId) ? ZONA_A_PARTE[zonaId] : null;
    }

    /** Zonas que pertenecen a una parte (las dos manos, los dos ojos). */
    function zonasDeParte(parte) {
        return Object.keys(ZONA_A_PARTE).filter(function (z) { return ZONA_A_PARTE[z] === parte; });
    }

    /**
     * ¿El toque en `zonaId` cumple el reto? En las partes dobles (manos, ojos, orejas, rodillas, pies)
     * vale cualquiera de las dos, salvo que el reto pida un lado ("lado": "izq" | "der").
     */
    function esCorrecta(reto, zonaId) {
        if (!reto || !zonaId) return false;
        if (parteDeZona(zonaId) !== reto.parte) return false;
        if (reto.lado) return /_(izq|der)$/.test(zonaId) && zonaId.slice(-3) === reto.lado;
        return true;
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
     * Entre varias zonas tocadas a la vez (los bordes se tocan), gana la que tenga el centro más cerca
     * en proporción a su tamaño. Así un toque al borde de la nariz no activa la boca.
     * candidatos: [{ id, d, dentro? }] con d = distancia normalizada al tamaño dibujado de la zona.
     * `dentro` (opcional) dice si el toque cayó en el área táctil, que en pantallas chicas es más grande
     * que el dibujo; si falta, se usa d <= 1. "cuerpo" solo gana si no hay otra.
     */
    function adentro(c) {
        return c.dentro != null ? !!c.dentro : c.d <= 1;
    }

    function elegirZona(candidatos) {
        var mejor = null;
        (candidatos || []).forEach(function (c) {
            if (!c || !adentro(c)) return;
            if (c.id === "cuerpo") return;
            if (!mejor || c.d < mejor.d) mejor = c;
        });
        if (mejor) return mejor.id;
        var cuerpo = (candidatos || []).find(function (c) { return c && c.id === "cuerpo" && adentro(c); });
        return cuerpo ? "cuerpo" : null;
    }

    function barajar(lista, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    /**
     * Arma la partida al azar: juego.rondas rondas de juego.partesPorRonda partes distintas, tomadas de
     * config.banco (una lista de retos por parte). Prefiere las partes que menos han salido, para que en una
     * partida aparezcan casi todas; una ronda no empieza con la parte con que terminó la anterior, y de cada
     * parte se elige una frase que no se haya usado todavía si hay otra.
     */
    function armarPartida(config, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var banco = (config && config.banco) || {};
        var partes = PARTES.filter(function (p) { return Array.isArray(banco[p]) && banco[p].length; });
        if (!partes.length) return [];
        var juego = (config && config.juego) || {};
        var total = Math.max(1, Number(juego.rondas) || 3);
        var porRonda = Math.max(1, Math.min(partes.length, Number(juego.partesPorRonda) || 4));
        var usos = {};
        var frasesUsadas = {};
        partes.forEach(function (p) { usos[p] = 0; frasesUsadas[p] = []; });
        var rondas = [];
        var ultima = null;
        for (var n = 0; n < total; n++) {
            // menos usadas primero; empate al azar
            var orden = barajar(partes, r).sort(function (a, b) { return usos[a] - usos[b]; });
            var elegidas = barajar(orden.slice(0, porRonda), r);
            if (elegidas.length > 1 && elegidas[0] === ultima) {
                var t = elegidas[0];
                elegidas[0] = elegidas[1];
                elegidas[1] = t;
            }
            var retos = elegidas.map(function (p) {
                usos[p]++;
                var lista = banco[p];
                var libres = lista.map(function (_, k) { return k; }).filter(function (k) { return frasesUsadas[p].indexOf(k) < 0; });
                if (!libres.length) {
                    frasesUsadas[p] = [];
                    libres = lista.map(function (_, k) { return k; });
                }
                var k = libres[Math.floor(r() * libres.length)];
                frasesUsadas[p].push(k);
                return Object.assign({ parte: p }, lista[k]);
            });
            rondas.push({ numero: n + 1, retos: retos });
            ultima = elegidas[elegidas.length - 1];
        }
        return rondas;
    }

    /** Reemplaza {clave} en un texto. */
    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? String(datos[k]) : m;
        });
    }

    var Retos = {
        PARTES: PARTES,
        parteDeZona: parteDeZona,
        zonasDeParte: zonasDeParte,
        esCorrecta: esCorrecta,
        distanciaNormalizada: distanciaNormalizada,
        elegirZona: elegirZona,
        barajar: barajar,
        armarPartida: armarPartida,
        plantilla: plantilla
    };

    global.Retos = Retos;
    if (typeof module !== "undefined" && module.exports) module.exports = Retos;
})(typeof window !== "undefined" ? window : this);
