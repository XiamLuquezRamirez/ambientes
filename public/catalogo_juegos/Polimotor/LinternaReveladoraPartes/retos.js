/**
 * Retos — reglas puras de "La Linterna Reveladora de Partes" (window.Retos y module.exports).
 *
 * No toca el DOM ni Phaser. El niño tiene que hacer dos cosas, en este orden:
 *   1. Cubrir la parte con la linterna (el centro de la zona queda dentro del haz).
 *   2. Tocar esa zona cuando ya estaba iluminada al apoyar el dedo.
 * Pasar la luz no completa el reto: eso lo decide quien llama, porque aquí solo se evalúa un toque.
 * En rodillas y orejas vale cualquiera de los dos lados.
 */
(function (global) {
    "use strict";

    var ZONA_A_PARTE = {
        barriga: "barriga",
        mano_izq: "manos",
        mano_der: "manos",
        pie_izq: "pies",
        pie_der: "pies",
        rodilla_izq: "rodillas",
        rodilla_der: "rodillas",
        hombro_izq: "hombros",
        hombro_der: "hombros",
        oreja_izq: "orejas",
        oreja_der: "orejas",
        ojo_izq: "ojos",
        ojo_der: "ojos",
        boca: "boca",
        cabello: "cabello",
        coleta_izq: "cabello",
        coleta_der: "cabello",
        cuerpo: null
    };

    var LUGARES = ["abajo-izq", "abajo-der", "arriba-der"];

    function parteDeZona(zonaId) {
        return Object.prototype.hasOwnProperty.call(ZONA_A_PARTE, zonaId) ? ZONA_A_PARTE[zonaId] : null;
    }

    function zonasDeParte(parte) {
        return Object.keys(ZONA_A_PARTE).filter(function (z) { return ZONA_A_PARTE[z] === parte; });
    }

    /** En las partes dobles vale cualquier lado, salvo que el reto pida "lado": "izq" | "der". */
    function esCorrecta(reto, zonaId) {
        if (!reto || !zonaId) return false;
        if (parteDeZona(zonaId) !== reto.parte) return false;
        if (reto.lado) return zonaId.slice(-3) === reto.lado;
        return true;
    }

    /** Distancia normalizada a una elipse: 0 en el centro, 1 en el borde. */
    function distanciaNormalizada(px, py, zona) {
        var rx = zona.rx || zona.r || 1;
        var ry = zona.ry || zona.r || 1;
        var dx = (px - zona.x) / rx;
        var dy = (py - zona.y) / ry;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function adentro(c) {
        return c.dentro != null ? !!c.dentro : c.d <= 1;
    }

    /** Gana la zona específica más cercana. "cuerpo" solo si el toque no cayó en otra. */
    function elegirZona(candidatos) {
        var mejor = null;
        (candidatos || []).forEach(function (c) {
            if (!c || !adentro(c) || c.id === "cuerpo") return;
            if (!mejor || c.d < mejor.d) mejor = c;
        });
        if (mejor) return mejor.id;
        var cuerpo = (candidatos || []).find(function (c) { return c && c.id === "cuerpo" && adentro(c); });
        return cuerpo ? "cuerpo" : null;
    }

    /**
     * Toque en coordenadas del mundo. minPx agranda las zonas chicas (orejas, rodillas)
     * para el dedo de un niño, sin cambiar la elipse con la que se decide si hay luz.
     */
    function tocar(px, py, zonas, minPx) {
        var min = minPx || 0;
        var candidatos = (zonas || []).map(function (z) {
            var rx = Math.max(z.rx || 1, min);
            var ry = Math.max(z.ry || 1, min);
            var d = distanciaNormalizada(px, py, { x: z.x, y: z.y, rx: rx, ry: ry });
            return { id: z.id, d: d, dentro: d <= 1 };
        });
        return elegirZona(candidatos);
    }

    /** ¿El centro de la zona está bastante dentro del haz? visibilidad 0.82 = dentro del 82 % del radio. */
    function centroCubierto(luz, zona, visibilidad) {
        if (!luz || !zona) return false;
        var dx = zona.x - luz.x;
        var dy = zona.y - luz.y;
        var r = Math.max(1, luz.r || 0);
        var v = visibilidad == null ? 0.82 : visibilidad;
        return Math.sqrt(dx * dx + dy * dy) <= r * v;
    }

    /**
     * Resultado de un toque ya resuelto:
     *   acierto  parte pedida y ya iluminada al apoyar el dedo
     *   oscura   es la parte, pero la luz todavía no la cubría
     *   error    otra parte, y se veía
     *   cuerpo   tocó a Zoe fuera de una parte
     *   nada     toque vacío, o una parte que ni siquiera estaba iluminada
     */
    function evaluar(reto, zonaId, iluminada) {
        if (!reto || !zonaId) return "nada";
        if (zonaId === "cuerpo") return "cuerpo";
        if (esCorrecta(reto, zonaId)) return iluminada ? "acierto" : "oscura";
        return iluminada ? "error" : "nada";
    }

    /**
     * Tres rondas, en el orden del config. Cada ronda trae sus tres partes.
     * Lo que rota es la esquina de la linterna, no el orden: la demo enseña la barriga.
     */
    function armarPartida(config, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var lista = ((config && config.retos) || []).map(function (reto) {
            return Object.assign({}, reto);
        });
        if (!lista.length) return [];
        var grupos = {};
        lista.forEach(function (reto) {
            var n = Number(reto.ronda) || 1;
            if (!grupos[n]) grupos[n] = [];
            grupos[n].push(reto);
        });
        var numeros = Object.keys(grupos).map(Number).sort(function (a, b) { return a - b; });
        var giro = Math.floor(r() * LUGARES.length);
        var paso = 0;
        var anuncios = (config && config.textos && config.textos.rondas) || {};
        return numeros.map(function (n) {
            var retos = grupos[n];
            retos.forEach(function (reto) {
                reto.inicio = LUGARES[(paso + giro) % LUGARES.length];
                paso++;
            });
            return {
                numero: n,
                titulo: "Ronda " + n,
                anuncio: anuncios[String(n)] || anuncios[n] || ("Ronda " + n),
                retos: retos
            };
        });
    }

    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? String(datos[k]) : m;
        });
    }

    var Retos = {
        ZONA_A_PARTE: ZONA_A_PARTE,
        LUGARES: LUGARES,
        parteDeZona: parteDeZona,
        zonasDeParte: zonasDeParte,
        esCorrecta: esCorrecta,
        distanciaNormalizada: distanciaNormalizada,
        elegirZona: elegirZona,
        tocar: tocar,
        centroCubierto: centroCubierto,
        evaluar: evaluar,
        armarPartida: armarPartida,
        plantilla: plantilla
    };

    global.Retos = Retos;
    if (typeof module !== "undefined" && module.exports) module.exports = Retos;
})(typeof window !== "undefined" ? window : global);
