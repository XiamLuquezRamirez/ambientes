/**
 * Reglas puras de "Sigue el ritmo" — Expresión Artística (sin DOM ni tiempos reales).
 *
 * Una ronda es una lista de pulsos: { beats: [{ t, id, descanso? }], inicio, ventana }.
 * `t` es el momento del pulso en ms desde `inicio`; `ventana` es la tolerancia a cada lado.
 * Un pulso con `descanso` es una pausa: hay que NO tocarlo.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["pulso", "patron", "secuencia", "memoria"];
    /** Cuánto del pulso abarca la ventana de acierto a cada lado (los niños van holgados). */
    const TOLERANCIA = { "3-4 años": 0.42, "5-6 años": 0.4 };
    const REGLAS = {
        "3-4 años": { tema: "pista", tipos: ["pulso", "pulso", "patron"] },
        "5-6 años": { tema: "estudio", tipos: ["secuencia", "memoria", "secuencia"] }
    };

    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }

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

    /** Los pulsos de un reto, con su tolerancia. `memoria` no tiene pulso: solo orden. */
    function beatsDe(reto, edad) {
        const pulso = 60000 / reto.bpm;
        const factor = TOLERANCIA[edad] || 0.4;
        const ventana = pulso * factor;
        if (reto.tipo === "pulso") {
            const beats = [];
            for (let i = 0; i < reto.compases; i++) beats.push({ t: i * pulso, id: reto.elemento });
            return { pulsoMs: pulso, ventanaMs: ventana, beats: beats };
        }
        if (reto.tipo === "patron") {
            const ciclo = (reto.pausa + 1) * pulso;
            const beats = [];
            for (let r = 0; r < reto.repeticiones; r++) {
                reto.patron.forEach(function (tiempo) {
                    beats.push({ t: r * ciclo + tiempo * pulso, id: reto.elemento });
                });
                beats.push({ t: r * ciclo + reto.pausa * pulso, id: null, descanso: true });
            }
            return { pulsoMs: pulso, ventanaMs: ventana, beats: beats };
        }
        if (reto.tipo === "secuencia") {
            return {
                pulsoMs: pulso,
                ventanaMs: ventana,
                beats: reto.pasos.map(function (id, i) { return { t: i * pulso, id: id }; })
            };
        }
        return null;
    }

    /**
     * Un toque en el momento `ahora` sobre el elemento `id` (null si da igual cuál).
     * 'espera' = todavía no abre la ventana del pulso actual; 'bien' = acertó y avanza;
     * 'completo' = acertó el último; 'mal' = tocó el elemento equivocado o durante una pausa;
     * 'tarde' = la ventana ya pasó.
     */
    function evaluarToque(ronda, ahora, id) {
        const b = ronda.beats[ronda.cursor];
        if (!b) return { estado: "completo", cursor: ronda.cursor };
        const dt = ahora - (ronda.inicio + b.t);
        if (dt < -ronda.ventana) return { estado: "espera", cursor: ronda.cursor };
        if (Math.abs(dt) <= ronda.ventana) {
            if (b.descanso || (id && id !== b.id)) return { estado: "mal", cursor: ronda.cursor };
            const cursor = ronda.cursor + 1;
            return { estado: cursor >= ronda.beats.length ? "completo" : "bien", cursor: cursor };
        }
        return { estado: "tarde", cursor: ronda.cursor };
    }

    /**
     * El reloj avanzó sin toque: un descanso vencido se cumple solo (había que esperar);
     * un pulso normal vencido se perdió.
     */
    function vencer(ronda, ahora) {
        const b = ronda.beats[ronda.cursor];
        if (!b) return { estado: "completo", cursor: ronda.cursor };
        if (ahora <= ronda.inicio + b.t + ronda.ventana) return { estado: "sigue", cursor: ronda.cursor };
        if (b.descanso) {
            const cursor = ronda.cursor + 1;
            return { estado: cursor >= ronda.beats.length ? "completo" : "sigue", cursor: cursor };
        }
        return { estado: "tarde", cursor: ronda.cursor };
    }

    /** Secuencia de memoria: solo importa el orden, no el tiempo. */
    function evaluarOrden(pasos, hechos, id) {
        const esperado = (pasos || [])[hechos];
        if (esperado == null) return { estado: "completo", esperado: null };
        if (id !== esperado) return { estado: "mal", esperado: esperado };
        return { estado: hechos + 1 >= pasos.length ? "completo" : "bien", esperado: esperado };
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
            if (!e.sonido) errores.push("Elemento " + id + ": sin sonido");
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
            (n.bienvenida || []).forEach(function (l, i) {
                if (!l || !l.texto || (l.personaje !== 0 && l.personaje !== 1)) errores.push(tag + ": bienvenida " + (i + 1) + " inválida");
            });
            if (!lineasValidas(n.cierre) || n.cierre.length < 2) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
            if (!(esNumero(n.bpm) && n.bpm > 0)) errores.push(tag + ": sin ritmo de cierre");

            const retos = n.retos || [];
            if (retos.map(function (r) { return r.tipo; }).join() !== regla.tipos.join()) {
                errores.push(tag + ": retos deben ser " + regla.tipos.join(", "));
            }
            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (r.id || i + 1);
                if (!r.titulo) errores.push(rt + ": sin título");
                if (TIPOS.indexOf(r.tipo) === -1) errores.push(rt + ": tipo desconocido");
                if (!esLinea(r.consigna)) errores.push(rt + ": consigna inválida");
                if (!lineasValidas(r.acierto)) errores.push(rt + ": acierto inválido");
                if (r.error && !esLinea(r.error)) errores.push(rt + ": error inválido");
                const exige = function (id) {
                    if (!elementos[id]) errores.push(rt + ": elemento inexistente " + id);
                };
                if (r.tipo === "memoria") {
                    if (!Array.isArray(r.pasos) || r.pasos.length < 3) errores.push(rt + ": la secuencia debe tener al menos 3 pasos");
                    (r.pasos || []).forEach(exige);
                    if (!esLinea(r.error)) errores.push(rt + ": falta la voz de error");
                    return;
                }
                if (!(esNumero(r.bpm) && r.bpm >= 40 && r.bpm <= 200)) errores.push(rt + ": bpm inválido");
                if (r.tipo === "pulso") {
                    exige(r.elemento);
                    if (!(esNumero(r.compases) && r.compases >= 3 && r.compases <= 8)) errores.push(rt + ": compases inválidos");
                } else if (r.tipo === "patron") {
                    exige(r.elemento);
                    const patron = r.patron || [];
                    if (patron.length < 2 || !patron.every(function (t) { return esNumero(t) && t >= 0 && t < r.pausa; })) {
                        errores.push(rt + ": patrón inválido");
                    }
                    if (!(esNumero(r.pausa) && r.pausa > Math.max.apply(null, patron.concat([0])))) errores.push(rt + ": la pausa debe ir después de los golpes");
                    if (!(esNumero(r.repeticiones) && r.repeticiones >= 1 && r.repeticiones <= 4)) errores.push(rt + ": repeticiones inválidas");
                } else if (r.tipo === "secuencia") {
                    if (!Array.isArray(r.pasos) || r.pasos.length < 3) errores.push(rt + ": la secuencia debe tener al menos 3 pasos");
                    (r.pasos || []).forEach(exige);
                    if (!esLinea(r.error)) errores.push(rt + ": falta la voz de error");
                }
                const plan = beatsDe(r, n.edad);
                if (plan && plan.beats.some(function (b, k) { return k > 0 && b.t <= plan.beats[k - 1].t + plan.ventanaMs; })) {
                    errores.push(rt + ": las ventanas de los pulsos se enciman");
                }
            });
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        esLinea: esLinea,
        lineas: lineas,
        beatsDe: beatsDe,
        evaluarToque: evaluarToque,
        vencer: vencer,
        evaluarOrden: evaluarOrden,
        validarConfig: validarConfig
    };

    global.SigueElRitmoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
