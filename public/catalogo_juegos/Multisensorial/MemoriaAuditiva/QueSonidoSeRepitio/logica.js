/**
 * Reglas puras de "Memoria auditiva" (sin DOM).
 * Escuchar → recordar → observar → elegir → validar.
 *
 * Cada reto tiene un `tipo` y una o dos `reproducciones`; la respuesta se deriva de lo que sonó:
 *  - elegir:      el único sonido.
 *  - varios:      todos los sonidos (se marcan uno a uno, sin orden).
 *  - repetido:    el sonido que aparece dos veces.
 *  - desaparecio: el que estaba en la primera reproducción y falta en la segunda.
 *  - cambio:      el sonido sustituido entre la primera y la segunda reproducción
 *                 (vale el de antes o el de después: el documento pide "el elemento que corresponde al cambio").
 *  - desafio:     tres preguntas seguidas: cuáles sonaron, cuál fue el primero y cuál el último.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["elegir", "varios", "repetido", "desaparecio", "cambio", "desafio"];
    const EFECTOS = ["aplaude", "marcar", "doble", "galopa", "especial", "cambio", "perdido", "final"];

    /** Lo que fija el documento por edad (null = el documento no lo precisa). */
    const REGLAS = {
        "3-4 años": {
            tipos: ["elegir", "varios", "repetido", "desaparecio", "elegir"],
            reproducciones: [
                [["manos"]],
                [["botella", "pollito"]],
                [["pollito", "campana", "pollito"]],
                [["pasos", "caballo", "reloj"], ["pasos", "reloj"]],
                [["vaca"]]
            ],
            opciones: [
                ["tren", "trompeta", "manos"],
                ["campana", "botella", "pollito"],
                ["perro", "campana", "pollito"],
                ["pasos", "caballo", "reloj"],
                ["vaca", "burro", "elefante"]
            ],
            cantidades: [3, 3, 3, 3, 3],
            efectos: ["aplaude", "marcar", "doble", "galopa", "especial"],
            preguntas: [0, 1, 0, 0, 0],
            mostrarAntes: [true, false, false, false, false],
            errorConVoz: [true, false, false, false, false]
        },
        "5-6 años": {
            tipos: ["varios", "repetido", "cambio", "desaparecio", "desafio"],
            reproducciones: [
                [["pato", "leon", "rana"]],
                [["caballo", "leon", "campana", "caballo"]],
                [["tambor", "campana", "pajaro"], ["tambor", "gaita", "pajaro"]],
                [["perro", "campana", "pajaro", "tambor"], ["perro", "campana", "tambor"]],
                [["pajaro", "tambor", "campana", "perro", "pelota"]]
            ],
            opciones: [
                ["perro", "rana", "pato", "leon", "carro"],
                null,
                ["tambor", "campana", "gaita", "pajaro"],
                null,
                null
            ],
            cantidades: [5, 4, 4, null, null],
            efectos: ["marcar", "doble", "cambio", "perdido", "final"],
            preguntas: [0, 0, 0, 0, 3],
            mostrarAntes: [false, false, false, false, false],
            errorConVoz: [false, false, false, false, false]
        }
    };

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

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

    function unicos(lista) {
        return (lista || []).filter(function (id, i) { return lista.indexOf(id) === i; });
    }

    /** true si, leyendo de izquierda a derecha, los sonidos distintos aparecen en el orden en que sonaron. */
    function revelaOrden(orden, secuencia) {
        const seq = unicos(secuencia);
        if (seq.length < 2) return false;
        let previo = -1;
        for (let i = 0; i < seq.length; i++) {
            const pos = orden.indexOf(seq[i]);
            if (pos === -1 || pos < previo) return false;
            previo = pos;
        }
        return true;
    }

    function delataOrden(orden, secuencia) {
        if (revelaOrden(orden, secuencia)) return true;
        return unicos(secuencia).length >= 3 && revelaOrden(orden.slice().reverse(), secuencia);
    }

    /** Opciones barajadas sin que su posición en pantalla delate el orden en que sonaron. */
    function ordenarOpciones(opciones, secuencia, aleatorio) {
        const seq = secuencia || [];
        let orden = mezclar(opciones, aleatorio);
        for (let i = 0; i < 40 && delataOrden(orden, seq); i++) {
            orden = mezclar(opciones, aleatorio);
        }
        if (revelaOrden(orden, seq) && orden.length > 1) orden = orden.slice().reverse();
        return orden;
    }

    function sinLos(a, b) {
        return unicos(a).filter(function (id) { return b.indexOf(id) === -1; });
    }

    /**
     * Pasos que el niño resuelve en el reto: [{ modo: "uno" | "varios", correctas: [...] }].
     * En "varios" hay que marcar todas las correctas; en "uno" basta con tocar una.
     */
    function pasosDe(reto) {
        const reps = (reto && reto.reproducciones) || [];
        const a = reps[0] || [];
        const b = reps[1] || [];
        switch (reto && reto.tipo) {
            case "elegir":
                return [{ modo: "uno", correctas: unicos(a) }];
            case "varios":
                return [{ modo: "varios", correctas: unicos(a) }];
            case "repetido":
                return [{ modo: "uno", correctas: unicos(a.filter(function (id, i) { return a.indexOf(id) !== i; })) }];
            case "desaparecio":
                return [{ modo: "uno", correctas: sinLos(a, b) }];
            case "cambio":
                return [{ modo: "uno", correctas: sinLos(a, b).concat(sinLos(b, a)) }];
            case "desafio":
                return [
                    { modo: "varios", correctas: unicos(a) },
                    { modo: "uno", correctas: a.length ? [a[0]] : [] },
                    { modo: "uno", correctas: a.length ? [a[a.length - 1]] : [] }
                ];
            default:
                return [];
        }
    }

    /** Lo que se oyó antes y después en un reto de cambio: { antes, despues }. */
    function cambioDe(reto) {
        const reps = (reto && reto.reproducciones) || [];
        const a = reps[0] || [];
        const b = reps[1] || [];
        return { antes: sinLos(a, b)[0] || null, despues: sinLos(b, a)[0] || null };
    }

    /**
     * Valida un toque en el paso actual.
     * "repetido": ya estaba marcado (un doble toque no cuenta como error).
     */
    function evaluar(paso, marcadas, id) {
        if (marcadas.indexOf(id) !== -1) return "repetido";
        if (paso.correctas.indexOf(id) === -1) return "error";
        if (paso.modo === "uno") return "completo";
        return marcadas.length + 1 >= paso.correctas.length ? "completo" : "correcto";
    }

    /** Elementos que suenan en el reto (todas sus reproducciones). */
    function elementosDe(reto) {
        const out = [];
        ((reto && reto.reproducciones) || []).forEach(function (s) {
            (s || []).forEach(function (id) { if (out.indexOf(id) === -1) out.push(id); });
        });
        return out;
    }

    function mismaLista(a, b) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (x, i) { return x === b[i]; });
    }

    function mismoConjunto(a, b) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(function (x) { return b.indexOf(x) !== -1; });
    }

    /** Comprueba que lo que sonó permite deducir una única respuesta del tipo indicado. */
    function erroresDeTipo(reto) {
        const reps = reto.reproducciones || [];
        const a = reps[0] || [];
        const b = reps[1] || [];
        const pasos = pasosDe(reto);
        const errores = [];
        const dosReps = reto.tipo === "desaparecio" || reto.tipo === "cambio";
        if (dosReps && reps.length !== 2) errores.push("necesita dos reproducciones");
        if (!dosReps && reps.length !== 1) errores.push("necesita una reproducción");
        switch (reto.tipo) {
            case "elegir":
                if (a.length !== 1) errores.push("debe sonar un único sonido");
                break;
            case "varios":
            case "desafio":
                if (unicos(a).length !== a.length) errores.push("los sonidos no deben repetirse");
                if (a.length < 2) errores.push("deben sonar al menos dos sonidos");
                break;
            case "repetido":
                if (pasos[0].correctas.length !== 1) errores.push("debe repetirse exactamente un sonido");
                else if (a.filter(function (id) { return id === pasos[0].correctas[0]; }).length !== 2) errores.push("el sonido repetido debe sonar dos veces");
                break;
            case "desaparecio":
                if (pasos[0].correctas.length !== 1 || sinLos(b, a).length || b.length !== a.length - 1) errores.push("la segunda reproducción debe omitir exactamente un sonido");
                break;
            case "cambio": {
                const c = cambioDe(reto);
                const iguales = a.length === b.length && a.every(function (id, i) { return id === b[i] || (id === c.antes && b[i] === c.despues); });
                if (!c.antes || !c.despues || pasos[0].correctas.length !== 2 || !iguales) errores.push("la segunda reproducción debe cambiar exactamente un sonido");
                break;
            }
        }
        return errores;
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

        const usados = [];
        niveles.forEach(function (n) {
            (n.retos || []).forEach(function (r) {
                elementosDe(r).concat(r.opciones || []).forEach(function (id) { if (usados.indexOf(id) === -1) usados.push(id); });
            });
        });
        const demoOps = demo.opciones || [];
        if (!demo.sonido) errores.push("Demo: sin sonido");
        if (demoOps.indexOf(demo.sonido) === -1) errores.push("Demo: el sonido no está entre las opciones");
        if (demoOps.length < 2) errores.push("Demo: muy pocas opciones");
        demoOps.forEach(function (id) {
            if (!elementos[id]) errores.push("Demo: elemento inexistente " + id);
            if (usados.indexOf(id) !== -1) errores.push("Demo: " + id + " se usa en un reto");
        });

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
            if (!Array.isArray(n.cierre) || !n.cierre.length || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");

            const retos = n.retos || [];
            if (!retos.length || retos.length > regla.tipos.length) errores.push(tag + ": debe tener entre 1 y " + regla.tipos.length + " retos");

            retos.forEach(function (r, i) {
                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);
                const rt = tag + " reto " + (r.id || i + 1);
                if (TIPOS.indexOf(r.tipo) === -1) errores.push(rt + ": tipo desconocido " + r.tipo);
                if (regla.tipos[iLargo] && r.tipo !== regla.tipos[iLargo]) errores.push(rt + ": el tipo debe ser " + regla.tipos[iLargo]);

                const reps = r.reproducciones || [];
                reps.forEach(function (s) {
                    (s || []).forEach(function (id) { if (!elementos[id]) errores.push(rt + ": elemento inexistente " + id); });
                });
                const esperadas = regla.reproducciones[iLargo];
                if (esperadas && (reps.length !== esperadas.length || !esperadas.every(function (s, k) { return mismaLista(s, reps[k]); }))) {
                    errores.push(rt + ": debe sonar " + esperadas.map(function (s) { return s.join("-"); }).join(" / "));
                }
                if (TIPOS.indexOf(r.tipo) !== -1) {
                    erroresDeTipo(r).forEach(function (e) { errores.push(rt + ": " + e); });
                }

                const ops = r.opciones || [];
                if (ops.length < 2) errores.push(rt + ": muy pocas opciones");
                if (ops.length > 6) errores.push(rt + ": más de 6 opciones");
                if (regla.cantidades[iLargo] && ops.length !== regla.cantidades[iLargo]) errores.push(rt + ": debe tener " + regla.cantidades[iLargo] + " opciones");
                if (ops.some(function (id, k) { return ops.indexOf(id) !== k; })) errores.push(rt + ": opciones repetidas");
                ops.forEach(function (id) {
                    if (!elementos[id]) errores.push(rt + ": opción inexistente " + id);
                });
                elementosDe(r).forEach(function (id) {
                    if (ops.indexOf(id) === -1) errores.push(rt + ": " + id + " suena pero no está entre las opciones");
                });
                if (regla.opciones[iLargo] && !mismoConjunto(ops, regla.opciones[iLargo])) errores.push(rt + ": opciones deben ser " + regla.opciones[iLargo].join(", "));
                if (!!r.mostrarAntes !== !!regla.mostrarAntes[iLargo]) errores.push(rt + ": mostrarAntes debe ser " + !!regla.mostrarAntes[iLargo]);
                if (r.tipo === "varios" || r.tipo === "desafio") {
                    if (!ops.some(function (id) { return elementosDe(r).indexOf(id) === -1; })) errores.push(rt + ": sin distractor, marcar todo siempre acierta");
                }

                const preg = r.preguntas || [];
                if (preg.length !== regla.preguntas[iLargo]) errores.push(rt + ": debe tener " + regla.preguntas[iLargo] + " preguntas");
                preg.forEach(function (l, k) { if (!esLinea(l)) errores.push(rt + ": pregunta " + (k + 1) + " inválida"); });
                if (r.tipo === "desafio" && preg.length !== 3) errores.push(rt + ": el desafío necesita tres preguntas");

                const a = r.acierto || {};
                if (EFECTOS.indexOf(a.efecto) === -1) errores.push(rt + ": efecto de acierto desconocido");
                if (regla.efectos[iLargo] && a.efecto !== regla.efectos[iLargo]) errores.push(rt + ": efecto de acierto debe ser " + regla.efectos[iLargo]);
                if (a.efecto === "doble" && !(a.veces >= 2)) errores.push(rt + ": el efecto doble necesita veces >= 2");
                if (a.efecto === "cambio" && r.tipo !== "cambio") errores.push(rt + ": el efecto cambio solo aplica a retos de cambio");
                if (a.texto && !esLinea(a)) errores.push(rt + ": línea de acierto inválida");

                if (regla.errorConVoz[iLargo] && !esLinea(r.error)) errores.push(rt + ": falta la voz de error");
                if (!regla.errorConVoz[iLargo] && r.error) errores.push(rt + ": el documento no da voz de error en este reto");
            });
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        EFECTOS: EFECTOS,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        unicos: unicos,
        revelaOrden: revelaOrden,
        delataOrden: delataOrden,
        ordenarOpciones: ordenarOpciones,
        pasosDe: pasosDe,
        cambioDe: cambioDe,
        evaluar: evaluar,
        elementosDe: elementosDe,
        validarConfig: validarConfig
    };

    global.MemoriaAuditivaLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
