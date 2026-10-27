/**
 * Reglas puras de "Completa el dibujo" — Expresión Artística (sin DOM).
 *
 * Tipos: encaje (arrastrar), simetria (trazo/toque), puntos (1..n), elegir (opción correcta).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["encaje", "simetria", "puntos", "elegir"];
    const REGLAS = {
        "3-4 años": { tema: "estudio", tipos: ["encaje", "encaje", "encaje", "encaje"], largos: [1, 2, 1, 1] },
        "5-6 años": { tema: "diseno", tipos: ["simetria", "puntos", "elegir", "encaje"], largos: [0, 5, 3, 2] }
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

    function distancia(a, b) {
        const dx = (a.x || 0) - (b.x || 0);
        const dy = (a.y || 0) - (b.y || 0);
        return Math.sqrt(dx * dx + dy * dy);
    }

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

    function elementoDePieza(p) {
        return (p && (p.elemento || p.id)) || null;
    }

    /**
     * `puestos` son ids de piezas ya encajadas.
     * 'mal' | 'bien' | 'completo'
     */
    function evaluarEncaje(reto, puestos, piezaId, huecoId) {
        const piezas = (reto && reto.piezas) || [];
        const colocadas = (puestos || []).slice();
        const pieza = piezas.find(function (p) { return p.id === piezaId; });
        if (!pieza) return { estado: "mal", colocadas: colocadas, esperado: null };
        if (colocadas.indexOf(piezaId) !== -1) return { estado: "puesta", colocadas: colocadas, esperado: pieza.hueco };
        if (pieza.hueco !== huecoId) return { estado: "mal", colocadas: colocadas, esperado: pieza.hueco };
        colocadas.push(piezaId);
        return {
            estado: colocadas.length >= piezas.length ? "completo" : "bien",
            colocadas: colocadas,
            esperado: pieza.hueco
        };
    }

    /** Siguiente número esperado en un reto de puntos (1-based). */
    function siguientePunto(reto, conectados) {
        const n = (conectados || []).length + 1;
        const pts = (reto && reto.puntos) || [];
        return pts.find(function (p) { return p.n === n; }) || null;
    }

    function evaluarPunto(reto, conectados, numero) {
        const hechos = (conectados || []).slice();
        const esperado = hechos.length + 1;
        if (Number(numero) !== esperado) {
            return { estado: "mal", conectados: hechos, esperado: esperado };
        }
        hechos.push(esperado);
        const total = ((reto && reto.puntos) || []).length;
        return {
            estado: hechos.length >= total ? "completo" : "bien",
            conectados: hechos,
            esperado: esperado
        };
    }

    function evaluarEleccion(reto, opcionId) {
        if (!reto || !reto.correcta) return { estado: "mal" };
        return { estado: opcionId === reto.correcta ? "completo" : "mal" };
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
            if (!Array.isArray(n.galeria) || n.galeria.length < 4) errores.push(tag + ": la galería debe mostrar 4 dibujos");
            (n.galeria || []).forEach(function (id) {
                if (!elementos[id]) errores.push(tag + ": dibujo de galería inexistente " + id);
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
                if (!lineasValidas(r.acierto)) errores.push(rt + ": acierto inválido");
                if (r.error && !esLinea(r.error)) errores.push(rt + ": error inválido");

                if (r.tipo === "encaje") {
                    const piezas = r.piezas || [];
                    if (piezas.length !== regla.largos[i]) errores.push(rt + ": debe tener " + regla.largos[i] + " piezas");
                    const ids = [];
                    const huecos = [];
                    piezas.forEach(function (p) {
                        const eid = elementoDePieza(p);
                        if (!p || !elementos[eid]) errores.push(rt + ": pieza inexistente " + (p && p.id));
                        if (!p || !p.hueco) errores.push(rt + ": pieza sin hueco");
                        if (!p || typeof p.x !== "string" || typeof p.y !== "string") errores.push(rt + ": hueco sin posición");
                        if (p && ids.indexOf(p.id) !== -1) errores.push(rt + ": pieza repetida " + p.id);
                        if (p) { ids.push(p.id); huecos.push(p.hueco); usados[p.id] = true; }
                    });
                    if (huecos.length !== huecos.filter(function (h, k) { return huecos.indexOf(h) === k; }).length) {
                        errores.push(rt + ": dos piezas comparten hueco");
                    }
                }

                if (r.tipo === "simetria") {
                    if (!r.revela || !elementos[r.revela.id]) errores.push(rt + ": sin lado a revelar");
                    if (!r.zona || typeof r.zona.x !== "string") errores.push(rt + ": zona de trazo inválida");
                }

                if (r.tipo === "puntos") {
                    const pts = r.puntos || [];
                    if (pts.length !== regla.largos[i]) errores.push(rt + ": debe tener " + regla.largos[i] + " puntos");
                    pts.forEach(function (p, k) {
                        if (!p || p.n !== k + 1) errores.push(rt + ": puntos deben ir del 1 al " + pts.length);
                        if (!p || typeof p.x !== "string" || typeof p.y !== "string") errores.push(rt + ": punto sin posición");
                    });
                    if (r.resultado && !elementos[r.resultado]) errores.push(rt + ": resultado inexistente");
                }

                if (r.tipo === "elegir") {
                    const ops = r.opciones || [];
                    if (ops.length !== regla.largos[i]) errores.push(rt + ": debe tener " + regla.largos[i] + " opciones");
                    if (!r.correcta || ops.indexOf(r.correcta) === -1) errores.push(rt + ": correcta no está en opciones");
                    ops.forEach(function (id) {
                        if (!elementos[id]) errores.push(rt + ": opción inexistente " + id);
                    });
                    if (!r.hueco || typeof r.hueco.x !== "string") errores.push(rt + ": hueco inválido");
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
        distancia: distancia,
        huecoMasCercano: huecoMasCercano,
        elementoDePieza: elementoDePieza,
        evaluarEncaje: evaluarEncaje,
        siguientePunto: siguientePunto,
        evaluarPunto: evaluarPunto,
        evaluarEleccion: evaluarEleccion,
        validarConfig: validarConfig
    };

    global.CompletaElDibujoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
