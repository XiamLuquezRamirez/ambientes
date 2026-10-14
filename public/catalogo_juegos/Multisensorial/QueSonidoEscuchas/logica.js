/**
 * Reglas puras de "¿Qué sonido escuchas?" (sin DOM).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS = ["escuchar", "diferido", "secuencia"];
    const AZAR = "azar";
    const REGLAS = {
        "3-4 años": {
            tipos: ["escuchar", "escuchar", "escuchar", "escuchar", "escuchar"],
            correctos: ["perro", "gato", "lluvia", "campana", AZAR],
            efectos: ["anima", "gato", "lluvia", "campana", "especial"],
            errorConVoz: true
        },
        "5-6 años": {
            tipos: ["escuchar", "escuchar", "diferido", "secuencia", "diferido"],
            correctos: [AZAR, AZAR, AZAR, "campana", "lluvia"],
            efectos: ["anima", "anima", "celebracion", "secuencia", "especial"],
            errorConVoz: false
        }
    };

    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
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

    /** "Se reproduce uno de los tres sonidos": con correcto "azar" se sortea entre las opciones. */
    function elegirCorrecto(reto, aleatorio) {
        if (!reto) return null;
        if (reto.correcto !== AZAR) return reto.correcto;
        const ops = reto.opciones || [];
        const rnd = typeof aleatorio === "function" ? aleatorio : Math.random;
        return ops.length ? ops[Math.min(ops.length - 1, Math.floor(rnd() * ops.length))] : null;
    }

    /** La secuencia que se escucha la segunda vez: el sonido que falta queda como silencio (null). */
    function secuenciaIncompleta(reto) {
        if (!reto || !Array.isArray(reto.secuencia)) return [];
        return reto.secuencia.map(function (id, i) { return i === reto.falta ? null : id; });
    }

    /** El botón de escuchar se bloquea en los retos de recordar hasta el primer error. */
    function puedeEscuchar(reto, errores) {
        if (!reto) return false;
        return !reto.recordar || (errores || 0) > 0;
    }

    /** Las respuestas posibles de un reto (las que se pueden reproducir como objetivo). */
    function posiblesCorrectos(reto) {
        if (!reto) return [];
        return reto.correcto === AZAR ? (reto.opciones || []).slice() : [reto.correcto];
    }

    function validarConfig(cfg) {
        const errores = [];
        const sonidos = (cfg && cfg.sonidos) || {};
        const niveles = (cfg && cfg.niveles) || [];
        const demo = (cfg && cfg.demo) || {};
        if (!niveles.length) errores.push("Sin niveles");

        Object.keys(sonidos).forEach(function (id) {
            const s = sonidos[id];
            if (!s.img) errores.push("Sonido " + id + ": sin imagen");
            if (!s.nombre) errores.push("Sonido " + id + ": sin nombre");
            if (!s.sonido) errores.push("Sonido " + id + ": sin sonido");
        });

        if (!demo.sonido || !sonidos[demo.sonido]) errores.push("Demo: sonido inexistente");

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

                const ops = r.opciones || [];
                if (ops.length !== 3) errores.push(rt + ": deben ser 3 imágenes");
                if (ops.some(function (id, k) { return ops.indexOf(id) !== k; })) errores.push(rt + ": opciones repetidas");
                ops.forEach(function (id) {
                    if (!sonidos[id]) errores.push(rt + ": opción inexistente " + id);
                });

                if (regla.correctos[i] && r.correcto !== regla.correctos[i]) errores.push(rt + ": correcto debe ser " + regla.correctos[i]);
                if (r.correcto !== AZAR && ops.indexOf(r.correcto) === -1) errores.push(rt + ": el correcto no está entre las opciones");
                if (posiblesCorrectos(r).indexOf(demo.sonido) !== -1) errores.push(rt + ": usa el sonido de la demostración");

                const a = r.acierto || {};
                if (regla.efectos[i] && a.efecto !== regla.efectos[i]) errores.push(rt + ": efecto de acierto debe ser " + regla.efectos[i]);
                if (a.texto && !esLinea(a)) errores.push(rt + ": línea de acierto inválida");

                if (regla.errorConVoz && !esLinea(r.error)) errores.push(rt + ": falta la voz de error");
                if (r.error && !esLinea(r.error)) errores.push(rt + ": línea de error inválida");
                if (r.consigna && !esLinea(r.consigna)) errores.push(rt + ": consigna inválida");

                if (r.tipo === "diferido" && !(esNumero(r.pausaMs) && r.pausaMs >= 0)) errores.push(rt + ": pausaMs inválida");

                if (r.tipo === "secuencia") {
                    const seq = r.secuencia || [];
                    if (seq.length !== 3) errores.push(rt + ": la secuencia debe tener 3 sonidos");
                    seq.forEach(function (id) {
                        if (!sonidos[id]) errores.push(rt + ": sonido de secuencia inexistente " + id);
                    });
                    if (!esNumero(r.falta) || r.falta < 0 || r.falta >= seq.length) {
                        errores.push(rt + ": falta fuera de la secuencia");
                    } else if (seq[r.falta] !== r.correcto) {
                        errores.push(rt + ": el sonido que falta debe ser el correcto");
                    }
                    if (seq.filter(function (id) { return id === r.correcto; }).length !== 1) errores.push(rt + ": el correcto debe sonar una sola vez");
                }
            });
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        AZAR: AZAR,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        elegirCorrecto: elegirCorrecto,
        secuenciaIncompleta: secuenciaIncompleta,
        puedeEscuchar: puedeEscuchar,
        posiblesCorrectos: posiblesCorrectos,
        validarConfig: validarConfig
    };

    global.QueSonidoLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
