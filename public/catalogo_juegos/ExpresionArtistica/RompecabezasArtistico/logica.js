/**
 * Reglas puras de "Rompecabezas artístico" — Expresión Artística (sin DOM).
 *
 * Cada pieza tiene un hueco. Si el reto lleva orden, solo encaja la siguiente.
 * En el giro, la pieza tiene que estar derecha (0 grados) para cerrar el imán.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["encaje", "color", "giro"];
    const REGLAS = {
        "3-4 años": { tema: "caballete", tipos: ["encaje", "encaje", "color", "encaje"], largos: [1, 3, 3, 3] },
        "5-6 años": { tema: "taller", tipos: ["giro", "encaje", "encaje", "encaje"], largos: [4, 5, 4, 4] }
    };
    const RADIO = 110;

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    function lineas(x) {
        if (!x) return [];
        return (Array.isArray(x) ? x : [x]).filter(esLinea);
    }

    function lineasValidas(x) {
        const lista = Array.isArray(x) ? x : [x];
        return lista.length > 0 && lista.every(esLinea);
    }

    /** Revuelve una copia. `aleatorio` devuelve 0..1; sin él usa Math.random. */
    function mezclar(lista, aleatorio) {
        const copia = (lista || []).slice();
        const rnd = aleatorio || Math.random;
        for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            const tmp = copia[i];
            copia[i] = copia[j];
            copia[j] = tmp;
        }
        return copia;
    }

    function girar(grados) {
        return ((Number(grados) || 0) + 90) % 360;
    }

    function enderezada(grados) {
        return ((Number(grados) || 0) % 360) === 0;
    }

    function distancia(a, b) {
        const dx = (a.x || 0) - (b.x || 0);
        const dy = (a.y || 0) - (b.y || 0);
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** El hueco más cercano dentro del radio del imán, o null. */
    function huecoMasCercano(punto, zonas, radio) {
        let mejor = null;
        let mejorDist = radio == null ? RADIO : radio;
        (zonas || []).forEach(function (z) {
            const d = distancia(punto, z);
            if (d <= mejorDist) {
                mejorDist = d;
                mejor = z.id;
            }
        });
        return mejor;
    }

    /**
     * `puestos` son los id ya encajados, en orden.
     * 'espera' = todavía no le toca; 'girada' = hay que enderezarla;
     * 'mal' = no es su hueco; 'bien' / 'completo' = encajó.
     */
    function evaluarEncaje(reto, puestos, piezaId, huecoId, giro) {
        const piezas = (reto && reto.piezas) || [];
        const colocadas = (puestos || []).slice();
        const pieza = piezas.find(function (p) { return p.id === piezaId; });
        if (!pieza) return { estado: "mal", colocadas: colocadas, esperado: null };
        if (colocadas.indexOf(piezaId) !== -1) return { estado: "puesta", colocadas: colocadas, esperado: pieza.hueco };
        if (reto.orden && reto.orden[colocadas.length] !== piezaId) {
            return { estado: "espera", colocadas: colocadas, esperado: reto.orden[colocadas.length] };
        }
        if (reto.tipo === "giro" && !enderezada(giro)) {
            return { estado: "girada", colocadas: colocadas, esperado: pieza.hueco };
        }
        if (pieza.hueco !== huecoId) return { estado: "mal", colocadas: colocadas, esperado: pieza.hueco };
        colocadas.push(piezaId);
        return {
            estado: colocadas.length >= piezas.length ? "completo" : "bien",
            colocadas: colocadas,
            esperado: pieza.hueco
        };
    }

    function validarConfig(cfg) {
        const errores = [];
        const elementos = (cfg && cfg.elementos) || {};
        const escenas = (cfg && cfg.escenas) || {};
        const niveles = (cfg && cfg.niveles) || [];
        const demo = (cfg && cfg.demo) || {};
        if (!niveles.length) errores.push("Sin niveles");
        Object.keys(elementos).forEach(function (id) {
            const e = elementos[id];
            if (!e.img) errores.push("Elemento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Elemento " + id + ": sin nombre");
        });
        if (!elementos[demo.elemento]) errores.push("Demo: elemento inexistente");

        const usados = {};
        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const regla = REGLAS[n.edad];
            if (!regla) {
                errores.push(tag + ": edad sin reglas (" + n.edad + ")");
                return;
            }
            if (!n.titulo) errores.push(tag + ": sin título");
            if (n.tema !== regla.tema) errores.push(tag + ": tema debe ser " + regla.tema);
            if (!escenas[n.escena]) errores.push(tag + ": escena inexistente");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            (n.bienvenida || []).forEach(function (l, i) {
                if (!l || !l.texto || (l.personaje !== 0 && l.personaje !== 1)) errores.push(tag + ": bienvenida " + (i + 1) + " inválida");
            });
            if (!lineasValidas(n.cierre) || n.cierre.length < 2) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
            if (!Array.isArray(n.galeria) || n.galeria.length < 4) errores.push(tag + ": la galería debe mostrar 4 cuadros");
            (n.galeria || []).forEach(function (id) {
                if (!elementos[id]) errores.push(tag + ": cuadro de galería inexistente " + id);
            });

            const retos = n.retos || [];
            if (retos.map(function (r) { return r.tipo; }).join() !== regla.tipos.join()) {
                errores.push(tag + ": retos deben ser " + regla.tipos.join(", "));
            }
            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (r.id || i + 1);
                if (!r.titulo) errores.push(rt + ": sin título");
                if (TIPOS.indexOf(r.tipo) === -1) errores.push(rt + ": tipo desconocido");
                if (!lineasValidas(r.consigna)) errores.push(rt + ": consigna inválida");
                if (r.turno && !esLinea(r.turno)) errores.push(rt + ": turno inválido");
                if (!lineasValidas(r.acierto)) errores.push(rt + ": acierto inválido");
                if (r.error && !esLinea(r.error)) errores.push(rt + ": error inválido");
                const piezas = r.piezas || [];
                if (piezas.length !== regla.largos[i]) errores.push(rt + ": debe tener " + regla.largos[i] + " piezas");
                const ids = [];
                const huecos = [];
                piezas.forEach(function (p) {
                    if (!p || !elementos[p.id]) errores.push(rt + ": pieza inexistente " + (p && p.id));
                    if (!p || !p.hueco) errores.push(rt + ": pieza sin hueco");
                    if (!p || typeof p.x !== "string" || typeof p.y !== "string") errores.push(rt + ": hueco sin posición");
                    if (p && ids.indexOf(p.id) !== -1) errores.push(rt + ": pieza repetida " + p.id);
                    if (p) { ids.push(p.id); huecos.push(p.hueco); usados[p.id] = true; }
                    if (p && p.silueta && !elementos[p.silueta]) errores.push(rt + ": silueta inexistente " + p.silueta);
                    if (p && p.resultado && !elementos[p.resultado]) errores.push(rt + ": resultado inexistente " + p.resultado);
                });
                if (huecos.length !== huecos.filter(function (h, k) { return huecos.indexOf(h) === k; }).length) {
                    errores.push(rt + ": dos piezas comparten hueco");
                }
                if (r.orden) {
                    if (r.orden.join() !== ids.join()) errores.push(rt + ": el orden debe ser el de las piezas");
                }
                if (n.edad === "5-6 años" && !r.revolver) errores.push(rt + ": la bandeja debe ir revuelta");
                if (r.tipo === "giro") {
                    const cruzadas = piezas.filter(function (p) { return p && !enderezada(p.giro); });
                    if (cruzadas.length < 2) errores.push(rt + ": al menos dos piezas deben empezar giradas");
                }
                (r.fijos || []).forEach(function (f) {
                    if (!elementos[f.id]) errores.push(rt + ": fijo inexistente " + f.id);
                });
            });
        });
        if (usados[demo.elemento]) errores.push("Demo: la pieza de ejemplo no puede estar en un reto");
        return errores;
    }

    const api = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        RADIO: RADIO,
        esLinea: esLinea,
        lineas: lineas,
        mezclar: mezclar,
        girar: girar,
        enderezada: enderezada,
        distancia: distancia,
        huecoMasCercano: huecoMasCercano,
        evaluarEncaje: evaluarEncaje,
        validarConfig: validarConfig
    };

    global.RompecabezasArtisticoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
