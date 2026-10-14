/**
 * Reglas puras de "Encuentra el sonido" (sin DOM).
 * Las posiciones son porcentajes del escenario (centro del elemento).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["buscar", "zonas", "viajero"];
    const AZAR = "azar";
    const REPETICIONES = ["breve", "completo"];

    /** Escenario dividido en cuatro zonas (5-6, reto 2): un elemento por zona. */
    const ZONAS = [
        { id: "sup-izq", x: 25, y: 30 },
        { id: "sup-der", x: 75, y: 30 },
        { id: "inf-izq", x: 25, y: 70 },
        { id: "inf-der", x: 75, y: 70 }
    ];

    /** vocesError: quién dice la frase de error; null = el documento no da frase para ese reto. */
    const REGLAS = {
        "3-4 años": {
            tipos: ["buscar", "buscar", "buscar", "buscar", "buscar"],
            cantidad: [3, 3, 3, 3, 3],
            correctos: ["perro", "trompeta", "pajaro", "paraguas", AZAR],
            efectos: ["anima", "pulso", "aletea", "paraguas", "especial"],
            vocesError: ["zeus", "zeus", "zeus", "zeus", "zeus"]
        },
        "5-6 años": {
            tipos: ["buscar", "zonas", "buscar", "viajero", "buscar"],
            cantidad: [4, 4, 4, 4, 5],
            correctos: ["pandereta", "campana", "maracas", AZAR, AZAR],
            efectos: ["sacude", "ilumina", "sacude", "detiene", "final"],
            vocesError: ["zeus", null, null, "zoe", null]
        }
    };

    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }

    function azar(aleatorio) {
        return typeof aleatorio === "function" ? aleatorio : Math.random;
    }

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    /** Orden aleatorio (Fisher-Yates). */
    function mezclar(lista, aleatorio) {
        const rnd = azar(aleatorio);
        const out = (lista || []).slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            const t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    /** "Se reproduce uno de los sonidos": con correcto "azar" se sortea entre los elementos. */
    function elegirCorrecto(reto, aleatorio) {
        if (!reto) return null;
        if (reto.correcto !== AZAR) return reto.correcto;
        const els = reto.elementos || [];
        const rnd = azar(aleatorio);
        return els.length ? els[Math.min(els.length - 1, Math.floor(rnd() * els.length))] : null;
    }

    function posiblesCorrectos(reto) {
        if (!reto) return [];
        return reto.correcto === AZAR ? (reto.elementos || []).slice() : [reto.correcto];
    }

    /**
     * Lugares posibles del escenario: 2 filas (lejos y cerca) por 3 columnas para 3 elementos
     * o por 4 columnas para 4-5 elementos. La separación deja libre el tamaño de cada elemento.
     */
    function celdas(cantidad) {
        const cols = cantidad <= 3 ? [18, 50, 82] : [13, 38, 62, 87];
        const filas = [30, 70];
        const out = [];
        filas.forEach(function (y) {
            cols.forEach(function (x) { out.push({ id: x + "-" + y, x: x, y: y }); });
        });
        return out;
    }

    /** Zona general del escenario (arriba/abajo + izquierda/centro/derecha). */
    function region(lugar) {
        if (!lugar) return "";
        const h = lugar.x < 40 ? "izq" : (lugar.x > 60 ? "der" : "centro");
        return (lugar.y < 50 ? "arriba" : "abajo") + "-" + h;
    }

    /**
     * Reparte los elementos del reto en lugares al azar. La respuesta nunca cae en la misma
     * región que la respuesta del reto anterior (`evitarRegion`), así no se responde por posición.
     * Devuelve { id: { id, x, y, region } }; fuera de las zonas se mueve un poco cada lugar.
     */
    function ubicar(reto, objetivo, aleatorio, evitarRegion) {
        const rnd = azar(aleatorio);
        const ids = (reto && reto.elementos) || [];
        const esZonas = reto && reto.tipo === "zonas";
        const lugares = esZonas ? ZONAS : celdas(ids.length);
        let mapa = null;
        for (let intento = 0; intento < 30; intento++) {
            const elegidos = mezclar(lugares, rnd).slice(0, ids.length);
            mapa = {};
            ids.forEach(function (id, i) {
                const l = elegidos[i];
                const dx = esZonas ? 0 : (rnd() - 0.5) * 6;
                const dy = esZonas ? 0 : (rnd() - 0.5) * 4;
                mapa[id] = { id: l.id, x: l.x + dx, y: l.y + dy, region: region(l) };
            });
            if (!evitarRegion || !mapa[objetivo] || mapa[objetivo].region !== evitarRegion) return mapa;
        }
        return mapa;
    }

    /** Siguiente parada del sonido viajero: una celda libre que no sea la actual. */
    function siguienteParada(cantidad, ocupadas, actual, aleatorio) {
        const rnd = azar(aleatorio);
        const libres = celdas(cantidad).filter(function (c) {
            return (ocupadas || []).indexOf(c.id) === -1 && c.id !== actual;
        });
        if (!libres.length) return null;
        return libres[Math.min(libres.length - 1, Math.floor(rnd() * libres.length))];
    }

    function validarConfig(cfg) {
        const errores = [];
        const elementos = (cfg && cfg.elementos) || {};
        const niveles = (cfg && cfg.niveles) || [];
        const demo = (cfg && cfg.demo) || {};
        if (!niveles.length) errores.push("Sin niveles");

        Object.keys(elementos).forEach(function (id) {
            const e = elementos[id];
            if (!e.img) errores.push("Elemento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Elemento " + id + ": sin nombre");
            if (!e.sonido) errores.push("Elemento " + id + ": sin sonido");
        });

        if (!demo.elemento || !elementos[demo.elemento]) errores.push("Demo: elemento inexistente");

        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const regla = REGLAS[n.edad];
            if (!regla) {
                errores.push(tag + ": edad sin reglas (" + n.edad + ")");
                return;
            }
            if (!n.titulo) errores.push(tag + ": sin título");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            (n.bienvenida || []).forEach(function (l, i) {
                if (!l || !l.texto || (l.personaje !== 0 && l.personaje !== 1)) errores.push(tag + ": bienvenida " + (i + 1) + " inválida");
            });
            if (!esLinea(n.cierre)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");

            const retos = n.retos || [];
            if (retos.length !== regla.tipos.length) errores.push(tag + ": debe tener " + regla.tipos.length + " retos");

            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (r.id || i + 1);
                if (TIPOS.indexOf(r.tipo) === -1) errores.push(rt + ": tipo desconocido");
                if (regla.tipos[i] && r.tipo !== regla.tipos[i]) errores.push(rt + ": tipo debe ser " + regla.tipos[i]);

                const els = r.elementos || [];
                if (regla.cantidad[i] && els.length !== regla.cantidad[i]) errores.push(rt + ": deben ser " + regla.cantidad[i] + " elementos");
                if (els.some(function (id, k) { return els.indexOf(id) !== k; })) errores.push(rt + ": elementos repetidos");
                els.forEach(function (id) {
                    if (!elementos[id]) errores.push(rt + ": elemento inexistente " + id);
                });
                if (els.indexOf(demo.elemento) !== -1) errores.push(rt + ": usa el elemento de la demostración");

                if (regla.correctos[i] && r.correcto !== regla.correctos[i]) errores.push(rt + ": correcto debe ser " + regla.correctos[i]);
                if (r.correcto !== AZAR && els.indexOf(r.correcto) === -1) errores.push(rt + ": el correcto no está en el escenario");

                const a = r.acierto || {};
                if (regla.efectos[i] && a.efecto !== regla.efectos[i]) errores.push(rt + ": efecto de acierto debe ser " + regla.efectos[i]);
                if (a.texto && !esLinea(a)) errores.push(rt + ": línea de acierto inválida");
                if (a.repetir && REPETICIONES.indexOf(a.repetir) === -1) errores.push(rt + ": repetir inválido");
                if (a.efecto === "aletea" && !(elementos[r.correcto] || {}).imgAlas) errores.push(rt + ": falta la imagen con alas abiertas");
                if (a.efecto === "paraguas" && !(elementos[r.correcto] || {}).imgAbierto) errores.push(rt + ": falta la imagen del paraguas abierto");

                const vozError = regla.vocesError[i];
                if (vozError) {
                    if (!esLinea(r.error) || r.error.voz !== vozError) errores.push(rt + ": la frase de error la dice " + vozError);
                } else if (r.error) {
                    errores.push(rt + ": el documento no da frase de error");
                }
            });
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        AZAR: AZAR,
        ZONAS: ZONAS,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        elegirCorrecto: elegirCorrecto,
        posiblesCorrectos: posiblesCorrectos,
        celdas: celdas,
        region: region,
        ubicar: ubicar,
        siguienteParada: siguienteParada,
        validarConfig: validarConfig
    };

    global.EncuentraSonidoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
