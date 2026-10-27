/**
 * Reglas puras de "El mundo de los colores" — Expresión Artística (sin DOM).
 *
 * Tipos: mezcla, huellas, clasifica, salpicadura, laboratorio, temperatura, volumen, abstracto.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["mezcla", "huellas", "clasifica", "salpicadura", "laboratorio", "temperatura", "volumen", "abstracto"];
    const REGLAS = {
        "3-4 años": { tema: "estudio", tipos: ["mezcla", "huellas", "clasifica", "salpicadura"] },
        "5-6 años": { tema: "laboratorio", tipos: ["laboratorio", "temperatura", "volumen", "abstracto"] }
    };
    const RADIO = 100;

    /** Clave ordenada de dos colores → resultado. */
    const MEZCLAS = {
        "amarillo+azul": "verde",
        "amarillo+rojo": "naranja",
        "azul+rojo": "morado",
        "rojo+verde": "marron"
    };

    const HEX = {
        rojo: "#ef5350", azul: "#42a5f5", amarillo: "#ffca28", verde: "#66bb6a",
        naranja: "#ff9800", morado: "#ab47bc", marron: "#8d6e63", celeste: "#4fc3f7",
        fucsia: "#ff80ab", turquesa: "#26c6da", neon: "#eeff41"
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

    function claveMezcla(a, b) {
        return [String(a || ""), String(b || "")].sort().join("+");
    }

    function resultadoMezcla(a, b) {
        return MEZCLAS[claveMezcla(a, b)] || null;
    }

    function hexDe(color) {
        return HEX[color] || "#9e9e9e";
    }

    /** Evalúa si la pieza va al hueco correcto (mismo color o zona). */
    function evaluarClasifica(reto, puestos, piezaId, huecoId) {
        const piezas = (reto && reto.piezas) || [];
        const colocadas = (puestos || []).slice();
        const pieza = piezas.find(function (p) { return p.id === piezaId; });
        if (!pieza) return { estado: "mal", colocadas: colocadas };
        if (colocadas.indexOf(piezaId) !== -1) return { estado: "puesta", colocadas: colocadas };
        const esperado = pieza.hueco || pieza.color;
        if (esperado !== huecoId) return { estado: "mal", colocadas: colocadas, esperado: esperado };
        colocadas.push(piezaId);
        return {
            estado: colocadas.length >= piezas.length ? "completo" : "bien",
            colocadas: colocadas
        };
    }

    function evaluarTemperatura(reto, puestos, piezaId, zonaId) {
        const piezas = (reto && reto.piezas) || [];
        const colocadas = (puestos || []).slice();
        const pieza = piezas.find(function (p) { return p.id === piezaId; });
        if (!pieza) return { estado: "mal", colocadas: colocadas };
        if (colocadas.indexOf(piezaId) !== -1) return { estado: "puesta", colocadas: colocadas };
        if (pieza.zona !== zonaId) return { estado: "mal", colocadas: colocadas, esperado: pieza.zona };
        colocadas.push(piezaId);
        return {
            estado: colocadas.length >= piezas.length ? "completo" : "bien",
            colocadas: colocadas
        };
    }

    function evaluarVolumen(reto, hechos, tono) {
        const necesarios = (reto && reto.tonos) || ["oscuro", "claro"];
        const lista = (hechos || []).slice();
        if (lista.indexOf(tono) !== -1) return { estado: "puesta", hechos: lista };
        if (necesarios.indexOf(tono) === -1) return { estado: "mal", hechos: lista };
        lista.push(tono);
        return {
            estado: lista.length >= necesarios.length ? "completo" : "bien",
            hechos: lista
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

                if (r.tipo === "mezcla" || r.tipo === "laboratorio") {
                    const mezclas = r.mezclas || [];
                    if (!mezclas.length) errores.push(rt + ": sin mezclas");
                    mezclas.forEach(function (m) {
                        if (!m.a || !m.b || !m.resultado) errores.push(rt + ": mezcla incompleta");
                        else if (resultadoMezcla(m.a, m.b) !== m.resultado) {
                            errores.push(rt + ": " + m.a + "+" + m.b + " no da " + m.resultado);
                        }
                    });
                    if (r.meta && mezclas.length < r.meta) errores.push(rt + ": meta de mezclas insuficiente");
                }
                if (r.tipo === "huellas") {
                    if (!r.meta || r.meta < 3) errores.push(rt + ": meta de huellas baja");
                    if (!r.color) errores.push(rt + ": sin color de pintura");
                }
                if (r.tipo === "clasifica" || r.tipo === "temperatura") {
                    const piezas = r.piezas || [];
                    if (piezas.length < 3) errores.push(rt + ": pocas piezas");
                    piezas.forEach(function (p) {
                        if (!p || !elementos[p.id] && !elementos[p.elemento || p.id]) errores.push(rt + ": pieza inexistente");
                        if (r.tipo === "clasifica" && !p.hueco && !p.color) errores.push(rt + ": pieza sin hueco");
                        if (r.tipo === "temperatura" && !p.zona) errores.push(rt + ": pieza sin zona");
                    });
                }
                if (r.tipo === "salpicadura" || r.tipo === "abstracto") {
                    if (!r.meta || r.meta < 4) errores.push(rt + ": meta de toques baja");
                }
                if (r.tipo === "volumen") {
                    if (!Array.isArray(r.tonos) || r.tonos.length < 2) errores.push(rt + ": tonos incompletos");
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
        MEZCLAS: MEZCLAS,
        HEX: HEX,
        esLinea: esLinea,
        lineas: lineas,
        mezclar: mezclar,
        distancia: distancia,
        huecoMasCercano: huecoMasCercano,
        claveMezcla: claveMezcla,
        resultadoMezcla: resultadoMezcla,
        hexDe: hexDe,
        evaluarClasifica: evaluarClasifica,
        evaluarTemperatura: evaluarTemperatura,
        evaluarVolumen: evaluarVolumen,
        validarConfig: validarConfig
    };

    global.ElMundoDeLosColoresLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
