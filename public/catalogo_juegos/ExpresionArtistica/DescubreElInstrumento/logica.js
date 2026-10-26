/**
 * Reglas puras de "Descubre el instrumento" — Expresión Artística (sin DOM).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const FORMAS_ESTUCHE = ["redondo", "alargado", "tubos"];
    const ROLES = ["melodia", "armonia", "ritmo", "bajo"];
    const REGLAS = {
        "3-4 años": { tema: "tienda", tipos: ["caja", "cuerdas", "flauta", "estuches"] },
        "5-6 años": { tema: "teatro", tipos: ["familias", "duelo", "director"] }
    };
    /** Acordes del arreglo (notas del acompañamiento y del bajo). */
    const ACORDES = {
        C: { notas: ["do4", "mi4", "sol4"], bajo: "do2" },
        F: { notas: ["fa3", "la3", "do4"], bajo: "fa2" },
        G: { notas: ["sol3", "si3", "re4"], bajo: "sol2" }
    };

    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    /** Una frase o varias ("Audio de Zoe y Zeus" se reparte en dos líneas). */
    function lineas(x) {
        if (!x) return [];
        return (Array.isArray(x) ? x : [x]).filter(esLinea);
    }

    function lineasValidas(x) {
        const lista = Array.isArray(x) ? x : [x];
        return lista.length > 0 && lista.every(esLinea);
    }

    /** Orden aleatorio (Fisher-Yates) para que la respuesta no quede siempre en el mismo puesto. */
    function mezclar(lista, aleatorio) {
        const rnd = typeof aleatorio === "function" ? aleatorio : Math.random;
        const out = (lista || []).slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            const t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    function largoTrazo(puntos) {
        let total = 0;
        for (let i = 1; i < (puntos || []).length; i++) {
            total += Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y);
        }
        return total;
    }

    /** Caja sorpresa: cuánto papel se rompió (0 a 1) según lo que el dedo recorrió sobre la caja. */
    function progresoDestape(largo, ancho, anchos) {
        const meta = Math.max(1, (ancho || 1) * (esNumero(anchos) && anchos > 0 ? anchos : 1.6));
        return Math.max(0, Math.min(1, (largo || 0) / meta));
    }

    /** Rasgueo: qué cuerdas (por su altura en pantalla) atravesó el dedo al ir de y0 a y1. */
    function cuerdasCruzadas(y0, y1, alturas) {
        const lo = Math.min(y0, y1);
        const hi = Math.max(y0, y1);
        const out = [];
        (alturas || []).forEach(function (y, i) {
            if (y > lo && y <= hi) out.push(i);
        });
        return y1 >= y0 ? out : out.reverse();
    }

    /** Un pase cuenta como rasgueo si toca al menos `minimo` cuerdas distintas. */
    function esRasgueo(tocadas, minimo) {
        const distintas = (tocadas || []).filter(function (v, i, a) { return a.indexOf(v) === i; });
        return distintas.length >= (esNumero(minimo) ? minimo : 2);
    }

    /**
     * Toque dentro de una secuencia: "bien" si es el siguiente esperado, "completa" si además
     * era el último y "fuera" si no le tocaba. `hechos` es cuántos ya se tocaron bien.
     */
    function evaluarSecuencia(secuencia, hechos, id) {
        const esperado = (secuencia || [])[hechos];
        if (esperado == null) return { estado: "completa", esperado: null };
        if (id !== esperado) return { estado: "fuera", esperado: esperado };
        return { estado: hechos + 1 >= secuencia.length ? "completa" : "bien", esperado: esperado };
    }

    function dentro(punto, rect, margen) {
        if (!punto || !rect) return false;
        const m = esNumero(margen) ? margen : 0;
        return punto.x >= rect.left - m && punto.x <= rect.right + m
            && punto.y >= rect.top - m && punto.y <= rect.bottom + m;
    }

    /** Imán asistido: el objetivo cuyo centro queda más cerca del punto, si está dentro del radio. */
    function imanMasCercano(punto, objetivos, radio) {
        let mejor = null;
        let dMejor = Infinity;
        (objetivos || []).forEach(function (o) {
            const r = o.rect;
            const d = Math.hypot(punto.x - (r.left + r.right) / 2, punto.y - (r.top + r.bottom) / 2);
            if ((d <= radio || dentro(punto, r, 0)) && d < dMejor) {
                mejor = o.id;
                dMejor = d;
            }
        });
        return mejor;
    }

    function familiaDe(instrumentos, id) {
        return ((instrumentos || {})[id] || {}).familia || null;
    }

    /** Duración en tiempos de una melodía [[nota, tiempos], ...]. */
    function tiemposMelodia(melodia) {
        return (melodia || []).reduce(function (s, n) { return s + (n[1] || 1); }, 0);
    }

    /**
     * Arreglo de la canción para los instrumentos que suenan: cada uno según su rol
     * (melodía, armonía con el acorde, ritmo en cada tiempo o bajo al cambiar de acorde).
     * Devuelve eventos { t, id, tipo, notas, dur } con tiempos en ms.
     */
    function arreglo(ids, instrumentos, cancion, o) {
        o = o || {};
        const bpm = esNumero(o.bpm) && o.bpm > 0 ? o.bpm : 100;
        const pulso = 60000 / bpm;
        const melodia = (cancion && cancion.melodia) || [];
        const acordes = (cancion && cancion.acordes) || [];
        const tiemposAcorde = (cancion && cancion.tiemposAcorde) || 2;
        const total = tiemposMelodia(melodia);
        const eventos = [];
        (ids || []).forEach(function (id) {
            const rol = ((instrumentos || {})[id] || {}).rol;
            if (rol === "melodia") {
                let b = 0;
                melodia.forEach(function (n) {
                    eventos.push({ t: b * pulso, id: id, tipo: "nota", notas: [n[0]], dur: (n[1] || 1) * pulso * 0.92 });
                    b += n[1] || 1;
                });
            } else if (rol === "armonia" || rol === "bajo") {
                acordes.forEach(function (nombre, i) {
                    const a = ACORDES[nombre];
                    if (!a) return;
                    eventos.push({
                        t: i * tiemposAcorde * pulso,
                        id: id,
                        tipo: rol === "bajo" ? "nota" : "acorde",
                        notas: rol === "bajo" ? [a.bajo] : a.notas.slice(),
                        dur: tiemposAcorde * pulso * 0.95
                    });
                });
            } else if (rol === "ritmo") {
                for (let b = 0; b < total; b++) {
                    eventos.push({ t: b * pulso, id: id, tipo: "golpe", notas: [], dur: pulso * 0.5, fuerte: b % 4 === 0 });
                }
            }
        });
        eventos.sort(function (a, b) { return a.t - b.t; });
        return { pulsoMs: pulso, duracionMs: total * pulso, eventos: eventos };
    }

    function validarConfig(cfg) {
        const errores = [];
        const inst = (cfg && cfg.instrumentos) || {};
        const familias = (cfg && cfg.familias) || {};
        const escenas = (cfg && cfg.escenas) || {};
        const niveles = (cfg && cfg.niveles) || [];
        const demo = (cfg && cfg.demo) || {};
        if (!niveles.length) errores.push("Sin niveles");

        Object.keys(inst).forEach(function (id) {
            const e = inst[id];
            if (!e.img) errores.push("Instrumento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Instrumento " + id + ": sin nombre");
            if (!e.sonido) errores.push("Instrumento " + id + ": sin sonido");
            if (!familias[e.familia]) errores.push("Instrumento " + id + ": familia desconocida");
            if (e.rol && ROLES.indexOf(e.rol) === -1) errores.push("Instrumento " + id + ": rol desconocido");
        });
        Object.keys(familias).forEach(function (f) {
            if (!familias[f].color || !inst[familias[f].icono]) errores.push("Familia " + f + ": sin color o icono");
        });
        if (!inst[demo.instrumento]) errores.push("Demo: instrumento inexistente");

        const usados = [];
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

            const c = n.concierto || {};
            if (c.tipo !== n.tema) errores.push(tag + ": concierto debe ser " + n.tema);
            if (!(esNumero(c.bpm) && c.bpm > 0)) errores.push(tag + ": concierto sin ritmo");
            if (!c.cancion || !tiemposMelodia(c.cancion.melodia)) errores.push(tag + ": concierto sin canción");
            (c.instrumentos || []).forEach(function (id) {
                if (!inst[id] || !inst[id].rol) errores.push(tag + ": instrumento del concierto sin rol " + id);
            });
            if (!(c.instrumentos || []).length) errores.push(tag + ": concierto sin instrumentos");

            const retos = n.retos || [];
            if (retos.map(function (r) { return r.tipo; }).join() !== regla.tipos.join()) {
                errores.push(tag + ": retos deben ser " + regla.tipos.join(", "));
            }
            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (r.id || i + 1);
                if (!r.titulo) errores.push(rt + ": sin título");
                if (!escenas[r.escena]) errores.push(rt + ": escena inexistente " + r.escena);
                if (!esLinea(r.consigna)) errores.push(rt + ": consigna inválida");
                if (!lineasValidas(r.acierto)) errores.push(rt + ": acierto inválido");
                const exige = function (id, que) {
                    if (!inst[id]) errores.push(rt + ": " + que + " inexistente " + id);
                    else usados.push(id);
                };
                switch (r.tipo) {
                    case "caja":
                        exige(r.instrumento, "instrumento");
                        if (!esLinea(r.revelar)) errores.push(rt + ": falta la voz al revelar");
                        if (!(esNumero(r.golpes) && r.golpes >= 1)) errores.push(rt + ": golpes inválidos");
                        break;
                    case "cuerdas":
                        exige(r.instrumento, "instrumento");
                        if (!Array.isArray(r.cuerdas) || r.cuerdas.length < 2 || r.cuerdas.length > 4) errores.push(rt + ": de 2 a 4 cuerdas");
                        if (!esLinea(r.afinada)) errores.push(rt + ": falta la voz al encajar las cuerdas");
                        if (!(esNumero(r.rasgueos) && r.rasgueos >= 1)) errores.push(rt + ": rasgueos inválidos");
                        break;
                    case "flauta": {
                        const colores = (r.tubos || []).map(function (t) { return t.color; });
                        if (colores.length !== 4 || (r.tubos || []).some(function (t) { return !t.color || !t.nota; })) errores.push(rt + ": deben ser 4 tubos con color y nota");
                        if (colores.indexOf(r.dormido) === -1) errores.push(rt + ": tubo dormido inexistente");
                        if (!Array.isArray(r.secuencia) || r.secuencia.length < 2) errores.push(rt + ": secuencia incompleta");
                        (r.secuencia || []).forEach(function (s) {
                            if (colores.indexOf(s) === -1 || s === r.dormido) errores.push(rt + ": tubo de secuencia inválido " + s);
                        });
                        if (!esLinea(r.secuenciaConsigna)) errores.push(rt + ": falta la voz de la secuencia");
                        if (!(r.melodia || []).length) errores.push(rt + ": sin melodía");
                        break;
                    }
                    case "estuches":
                        if ((r.instrumentos || []).length !== 3) errores.push(rt + ": deben ser 3 instrumentos");
                        (r.instrumentos || []).forEach(function (id) {
                            exige(id, "instrumento");
                            if (FORMAS_ESTUCHE.indexOf((r.estuches || {})[id]) === -1) errores.push(rt + ": estuche inválido para " + id);
                        });
                        break;
                    case "familias": {
                        const zonas = r.zonas || [];
                        if (zonas.length !== 3) errores.push(rt + ": deben ser 3 zonas");
                        zonas.forEach(function (z) { if (!familias[z]) errores.push(rt + ": familia inexistente " + z); });
                        (r.instrumentos || []).forEach(function (id) {
                            exige(id, "instrumento");
                            if (zonas.indexOf(familiaDe(inst, id)) === -1) errores.push(rt + ": " + id + " no tiene zona");
                        });
                        zonas.forEach(function (z) {
                            if (!(r.instrumentos || []).some(function (id) { return familiaDe(inst, id) === z; })) errores.push(rt + ": zona " + z + " vacía");
                        });
                        if (!esLinea(r.error)) errores.push(rt + ": falta la voz de error");
                        break;
                    }
                    case "duelo":
                        if ((r.opciones || []).length !== 2) errores.push(rt + ": deben ser 2 opciones");
                        (r.opciones || []).forEach(function (id) { exige(id, "opción"); });
                        if ((r.opciones || []).indexOf(r.correcto) === -1) errores.push(rt + ": el correcto no está entre las opciones");
                        if (!esLinea(r.pregunta)) errores.push(rt + ": falta la pregunta");
                        if (!esLinea(r.error)) errores.push(rt + ": falta la voz de error");
                        break;
                    case "director":
                        if ((r.secuencia || []).length !== 3) errores.push(rt + ": la secuencia debe tener 3 instrumentos");
                        (r.secuencia || []).forEach(function (id) {
                            exige(id, "instrumento");
                            if (inst[id] && !inst[id].rol) errores.push(rt + ": " + id + " sin rol en la orquesta");
                        });
                        if (!(esNumero(r.bpm) && r.bpm > 0)) errores.push(rt + ": sin ritmo");
                        break;
                    default:
                        errores.push(rt + ": tipo desconocido " + r.tipo);
                }
            });
        });
        if (usados.indexOf(demo.instrumento) !== -1) errores.push("Demo: el instrumento se usa en un reto");
        return errores;
    }

    const api = {
        VOCES: VOCES,
        REGLAS: REGLAS,
        ACORDES: ACORDES,
        FORMAS_ESTUCHE: FORMAS_ESTUCHE,
        esLinea: esLinea,
        lineas: lineas,
        mezclar: mezclar,
        largoTrazo: largoTrazo,
        progresoDestape: progresoDestape,
        cuerdasCruzadas: cuerdasCruzadas,
        esRasgueo: esRasgueo,
        evaluarSecuencia: evaluarSecuencia,
        dentro: dentro,
        imanMasCercano: imanMasCercano,
        familiaDe: familiaDe,
        tiemposMelodia: tiemposMelodia,
        arreglo: arreglo,
        validarConfig: validarConfig
    };

    global.DescubreInstrumentoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
