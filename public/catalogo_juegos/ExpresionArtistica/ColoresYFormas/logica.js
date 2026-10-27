/**
 * Reglas puras de "Colores y formas" — Expresión Artística (sin DOM).
 *
 * Tipos 3-4: semaforo, casita, tren, cohete (encaje).
 * Tipos 5-6: mosaico, torre, mondrian, ciudad.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["semaforo", "casita", "tren", "cohete", "mosaico", "torre", "mondrian", "ciudad"];
    const REGLAS = {
        "3-4 años": { tema: "fabrica", tipos: ["semaforo", "casita", "tren", "cohete"] },
        "5-6 años": { tema: "atelier", tipos: ["mosaico", "torre", "mondrian", "ciudad"] }
    };
    const RADIO = 110;
    const HEX = {
        rojo: "#ef5350", amarillo: "#ffca28", verde: "#66bb6a", azul: "#42a5f5",
        morado: "#ab47bc", naranja: "#ff9800", blanco: "#fafafa", negro: "#212121"
    };

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

    /** Como huecoMasCercano, pero prioriza huecos más pequeños (ventanas vs cuerpo). */
    function huecoPreferido(punto, zonas, radio) {
        const R = radio == null ? RADIO : radio;
        let mejor = null;
        let mejorScore = Infinity;
        (zonas || []).forEach(function (z) {
            const d = distancia(punto, z);
            if (d > R) return;
            const area = z.area != null ? z.area : 10000;
            const score = d + Math.sqrt(Math.max(1, area)) * 0.12;
            if (score < mejorScore) {
                mejorScore = score;
                mejor = z.id;
            }
        });
        return mejor;
    }

    /**
     * Entre huecos en radio, prioriza el que aceptaría la pieza (evita solape
     * ventana/cuerpo del cohete). Si ninguno encaja, cae a huecoPreferido.
     */
    function huecoParaPieza(punto, zonas, radio, reto, puestos, piezaId) {
        const R = radio == null ? RADIO : radio;
        const candidatos = (zonas || []).filter(function (z) {
            return distancia(punto, z) <= R;
        }).slice().sort(function (a, b) {
            const da = distancia(punto, a);
            const db = distancia(punto, b);
            const aa = a.area != null ? a.area : 10000;
            const ab = b.area != null ? b.area : 10000;
            return (da + Math.sqrt(Math.max(1, aa)) * 0.12) - (db + Math.sqrt(Math.max(1, ab)) * 0.12);
        });
        if (!candidatos.length) return null;
        if (!reto || !piezaId || typeof evaluarEncaje !== "function") {
            return candidatos[0].id;
        }
        let i;
        for (i = 0; i < candidatos.length; i++) {
            const res = evaluarEncaje(reto, puestos, piezaId, candidatos[i].id);
            if (res.estado === "bien" || res.estado === "completo") return candidatos[i].id;
        }
        return candidatos[0].id;
    }
    function hexDe(color) { return HEX[color] || "#9e9e9e"; }

    /** Encaje clásico: pieza.id → hueco. Si hay `orden`, debe ir en secuencia. */
    function evaluarEncaje(reto, puestos, piezaId, huecoId) {
        const piezas = (reto && reto.piezas) || [];
        const colocadas = (puestos || []).slice();
        const pieza = piezas.find(function (p) { return p.id === piezaId; });
        if (!pieza) return { estado: "mal", colocadas: colocadas };
        if (colocadas.indexOf(piezaId) !== -1) return { estado: "puesta", colocadas: colocadas };
        if (reto.orden && reto.orden[colocadas.length] !== piezaId) {
            return { estado: "espera", colocadas: colocadas, esperado: reto.orden[colocadas.length] };
        }
        const ocupado = colocadas.some(function (id) {
            const p = piezas.find(function (x) { return x.id === id; });
            return p && p.hueco === huecoId;
        });
        if (ocupado) return { estado: "ocupado", colocadas: colocadas };
        const esperado = pieza.hueco;
        if (esperado !== huecoId) return { estado: "mal", colocadas: colocadas, esperado: esperado };
        colocadas.push(piezaId);
        return {
            estado: colocadas.length >= piezas.length ? "completo" : "bien",
            colocadas: colocadas
        };
    }

    /** Mosaico: puestos = [{pieza, hueco}, ...]; el hueco exige un color. */
    function evaluarMosaico(reto, puestos, piezaId, huecoId) {
        const huecos = (reto && reto.huecos) || [];
        const piezas = (reto && reto.piezas) || [];
        const colocadas = (puestos || []).slice();
        const hueco = huecos.find(function (h) { return h.id === huecoId; });
        const pieza = piezas.find(function (p) { return p.id === piezaId; });
        if (!hueco || !pieza || hueco.fijo) return { estado: "mal", colocadas: colocadas };
        if (colocadas.some(function (c) { return c.pieza === piezaId; })) return { estado: "puesta", colocadas: colocadas };
        if (colocadas.some(function (c) { return c.hueco === huecoId; })) return { estado: "ocupado", colocadas: colocadas };
        if (pieza.color !== hueco.color) return { estado: "mal", colocadas: colocadas, esperado: hueco.color };
        colocadas.push({ pieza: piezaId, hueco: huecoId });
        const pendientes = huecos.filter(function (h) { return !h.fijo; }).length;
        return {
            estado: colocadas.length >= pendientes ? "completo" : "bien",
            colocadas: colocadas
        };
    }

    function evaluarMondrian(reto, pintados, celdaId, color) {
        const celdas = (reto && reto.celdas) || [];
        const lista = (pintados || []).slice();
        const celda = celdas.find(function (c) { return c.id === celdaId; });
        if (!celda) return { estado: "mal", pintados: lista };
        if (lista.indexOf(celdaId) !== -1) return { estado: "puesta", pintados: lista };
        if (celda.color && celda.color !== color) return { estado: "mal", pintados: lista, esperado: celda.color };
        lista.push(celdaId);
        return {
            estado: lista.length >= celdas.length ? "completo" : "bien",
            pintados: lista
        };
    }

    function tipoDePieza(id, reto) {
        const piezas = (reto && reto.piezas) || [];
        const p = piezas.find(function (x) { return x.id === id; });
        const ref = (p && (p.elemento || p.id)) || id;
        return String(ref).split("_")[0];
    }

    function evaluarCiudad(reto, puestos, piezaId) {
        const meta = (reto && reto.meta) || 6;
        const minTipos = (reto && reto.minTipos) || 3;
        const requeridos = (reto && reto.tiposRequeridos) || null;
        const colocadas = (puestos || []).slice();
        if (colocadas.indexOf(piezaId) !== -1) return { estado: "puesta", colocadas: colocadas };
        colocadas.push(piezaId);
        const tipos = {};
        colocadas.forEach(function (id) { tipos[tipoDePieza(id, reto)] = true; });
        let okTipos = Object.keys(tipos).length >= minTipos;
        if (requeridos && requeridos.length) {
            okTipos = requeridos.every(function (t) { return !!tipos[t]; });
        }
        return {
            estado: colocadas.length >= meta && okTipos ? "completo" : "bien",
            colocadas: colocadas,
            tipos: Object.keys(tipos).length
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
            if (!lineasValidas(n.cierre) || n.cierre.length < 2) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
            if (!Array.isArray(n.galeria) || n.galeria.length < 4) errores.push(tag + ": galería incompleta");
            (n.galeria || []).forEach(function (id) {
                if (!elementos[id]) errores.push(tag + ": cuadro inexistente " + id);
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

                if (["semaforo", "casita", "tren", "cohete", "torre"].indexOf(r.tipo) !== -1) {
                    const piezas = r.piezas || [];
                    if (piezas.length < 2) errores.push(rt + ": pocas piezas");
                    piezas.forEach(function (p) {
                        if (!p || !elementos[p.id] && !elementos[p.elemento || p.id]) errores.push(rt + ": pieza inexistente");
                        if (!p.hueco) errores.push(rt + ": pieza sin hueco");
                    });
                }
                if (r.tipo === "mosaico") {
                    if (!(r.huecos || []).length || !(r.piezas || []).length) errores.push(rt + ": mosaico incompleto");
                }
                if (r.tipo === "mondrian") {
                    if (!(r.celdas || []).length || (r.celdas || []).length < 3) errores.push(rt + ": celdas insuficientes");
                }
                if (r.tipo === "ciudad") {
                    if (!r.meta || r.meta < 4) errores.push(rt + ": meta de ciudad baja");
                    (r.piezas || []).forEach(function (p) {
                        const ref = p.elemento || p.id;
                        if (!elementos[ref]) errores.push(rt + ": pieza inexistente " + ref);
                    });
                }
            });
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        RADIO: RADIO,
        HEX: HEX,
        esLinea: esLinea,
        lineas: lineas,
        mezclar: mezclar,
        distancia: distancia,
        huecoMasCercano: huecoMasCercano,
        huecoPreferido: huecoPreferido,
        huecoParaPieza: huecoParaPieza,
        hexDe: hexDe,
        evaluarEncaje: evaluarEncaje,
        evaluarMosaico: evaluarMosaico,
        evaluarMondrian: evaluarMondrian,
        evaluarCiudad: evaluarCiudad,
        validarConfig: validarConfig
    };

    global.ColoresYFormasLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
