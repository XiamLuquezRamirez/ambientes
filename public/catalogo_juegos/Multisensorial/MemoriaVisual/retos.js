/**
 * MemoriaVisualRetos — lógica pura de Memoria visual (sin DOM).
 * Mecánicas: intruso, oculto, transformacion, secuencia, intercambio.
 */
(function (global) {
    "use strict";

    const MECANICAS = ["intruso", "oculto", "transformacion", "secuencia", "intercambio"];

    /** mulberry32: azar reproducible para las pruebas. */
    function crearRng(semilla) {
        if (semilla == null) return Math.random;
        let a = (Number(semilla) >>> 0) || 1;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function barajar(arr, rng) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            const t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    /** Evita que el objeto clave quede al final: sería una pista involuntaria. */
    function barajarSinPista(ids, clave, rng) {
        let lista = barajar(ids, rng);
        for (let i = 0; i < 8 && ids.length > 2 && lista[lista.length - 1] === clave; i++) {
            lista = barajar(ids, rng);
        }
        return lista;
    }

    function unicos(arr) {
        return arr.filter(function (v, i) { return arr.indexOf(v) === i; });
    }

    /**
     * Toma n del pool. Nunca usa `prohibidos`; prefiere lo que no está en `evitar`
     * y solo recurre a ello si no alcanza.
     */
    function elegir(pool, n, rng, opts) {
        const o = opts || {};
        const prohibidos = o.prohibidos || [];
        const evitar = o.evitar || {};
        const candidatos = unicos(pool).filter(function (id) { return prohibidos.indexOf(id) === -1; });
        const frescos = barajar(candidatos.filter(function (id) { return !evitar[id]; }), rng);
        const repetidos = barajar(candidatos.filter(function (id) { return !!evitar[id]; }), rng);
        const lista = frescos.concat(repetidos).slice(0, n);
        if (lista.length < n) {
            throw new Error("Pool insuficiente: se pidieron " + n + " y hay " + lista.length);
        }
        return lista;
    }

    function poolDe(config, grupos) {
        const lista = Array.isArray(grupos) ? grupos : [grupos];
        const defs = (config && config.grupos) || {};
        return unicos(lista.reduce(function (acc, g) {
            return acc.concat(defs[g] || []);
        }, []));
    }

    function resolverRetos(config, nivel) {
        const base = (config && config.retos) || {};
        return ((nivel && nivel.retos) || []).map(function (ref) {
            const plantillaReto = base[ref.ref] || {};
            const def = Object.assign({}, plantillaReto, ref);
            def.textos = Object.assign({}, (config.textos && config.textos.retoDefecto) || {}, plantillaReto.textos || {}, ref.textos || {});
            return def;
        });
    }

    function crearSesion() {
        return { usados: {}, conjuntos: {} };
    }

    function marcar(sesion, ids) {
        ids.forEach(function (id) { if (id) sesion.usados[id] = true; });
    }

    function baseDelReto(config, nivel, def, sesion, rng) {
        if (def.conjunto) {
            if (!sesion.conjuntos[def.conjunto]) {
                const c = ((nivel && nivel.conjuntos) || {})[def.conjunto] || {};
                sesion.conjuntos[def.conjunto] = elegir(poolDe(config, c.grupo || def.grupo), c.cantidad || def.cantidad, rng, { evitar: sesion.usados });
            }
            return sesion.conjuntos[def.conjunto].slice();
        }
        return elegir(poolDe(config, def.grupo), def.cantidad, rng, { evitar: sesion.usados });
    }

    function prepararReto(config, nivel, def, sesion, rng) {
        const r = rng || Math.random;
        const ctx = { mecanica: def.mecanica };

        if (def.mecanica === "intruso") {
            const base = baseDelReto(config, nivel, def, sesion, r);
            const intruso = elegir(poolDe(config, def.grupoIntruso || def.grupo), 1, r, { prohibidos: base, evitar: sesion.usados })[0];
            ctx.mostrar = base;
            if (def.conservarOrden) {
                // Cada tesoro sigue en su pedestal; el intruso ocupa uno adicional.
                ctx.desafio = base.slice();
                ctx.desafio.splice(Math.floor(r() * (base.length + 1)), 0, intruso);
            } else {
                ctx.desafio = barajarSinPista(base.concat([intruso]), intruso, r);
            }
            ctx.correcto = [intruso];
            marcar(sesion, base.concat([intruso]));
        } else if (def.mecanica === "oculto") {
            const base = baseDelReto(config, nivel, def, sesion, r);
            const indice = Math.floor(r() * base.length);
            const oculto = base[indice];
            const distractores = elegir(poolDe(config, def.grupoOpciones || def.grupo), Math.max(1, (def.opciones || 3) - 1), r, {
                prohibidos: base,
                evitar: sesion.usados
            });
            ctx.mostrar = base;
            ctx.desafio = base.map(function (id, i) { return i === indice ? null : id; });
            ctx.indice = indice;
            ctx.opciones = barajar([oculto].concat(distractores), r);
            ctx.correcto = [oculto];
            marcar(sesion, base.concat(distractores));
        } else if (def.mecanica === "transformacion") {
            const base = elegir(poolDe(config, def.grupo), def.cantidad, r, {});
            const indice = Math.floor(r() * base.length);
            const nuevo = elegir(poolDe(config, def.grupo), 1, r, { prohibidos: base })[0];
            ctx.mostrar = base;
            ctx.desafio = base.slice();
            ctx.desafio[indice] = nuevo;
            ctx.indice = indice;
            ctx.original = base[indice];
            ctx.correcto = [nuevo];
        } else if (def.mecanica === "secuencia") {
            const baldosas = baseDelReto(config, nivel, def, sesion, r);
            const largo = Math.min(Math.max(2, def.largo || 2), baldosas.length);
            ctx.mostrar = baldosas;
            ctx.desafio = baldosas.slice();
            ctx.orden = barajar(baldosas, r).slice(0, largo);
            ctx.correcto = ctx.orden.slice();
            marcar(sesion, baldosas);
        } else if (def.mecanica === "intercambio") {
            const base = baseDelReto(config, nivel, def, sesion, r);
            const i = Math.floor(r() * base.length);
            let j = Math.floor(r() * (base.length - 1));
            if (j >= i) j += 1;
            ctx.mostrar = base;
            ctx.desafio = base.slice();
            ctx.desafio[i] = base[j];
            ctx.desafio[j] = base[i];
            ctx.correcto = [base[i], base[j]];
            marcar(sesion, base);
        } else {
            throw new Error("Mecánica desconocida: " + def.mecanica);
        }
        return ctx;
    }

    function capitalizar(s) {
        const t = String(s || "");
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    function datosObjeto(config, id) {
        const o = ((config && config.objetos) || {})[id] || { nombre: id };
        const femenino = o.genero === "f";
        const hablado = o.hablado || String(o.nombre || id).toLowerCase();
        const conArticulo = (femenino ? "la " : "el ") + hablado;
        return {
            nombre: hablado,
            objeto: conArticulo,
            Objeto: capitalizar(conArticulo),
            lo: femenino ? "la" : "lo",
            color: o.color || ""
        };
    }

    function unirConY(items) {
        if (items.length <= 1) return items.join("");
        return items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
    }

    /** «la manzana... la pelota... ¡y el carro!» */
    function listaHablada(config, ids) {
        const items = ids.map(function (id) { return datosObjeto(config, id).objeto; });
        if (items.length <= 1) return items.join("");
        return items.slice(0, -1).join("... ") + "... ¡y " + items[items.length - 1] + "!";
    }

    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? String(datos[k]) : "";
        });
    }

    /** Datos de plantilla del reto (sin objeto tocado). */
    function datosReto(config, ctx) {
        const colores = ctx.mostrar.map(function (id) { return datosObjeto(config, id).color; }).filter(Boolean);
        const datos = {
            n: ctx.mostrar.length,
            lista: listaHablada(config, ctx.mostrar),
            colores: unirConY(colores),
            Colores: capitalizar(unirConY(colores))
        };
        if (ctx.correcto && ctx.correcto.length === 1) {
            const c = datosObjeto(config, ctx.correcto[0]);
            datos.objeto = c.objeto;
            datos.Objeto = c.Objeto;
            datos.despues = c.color;
        }
        if (ctx.original) datos.antes = datosObjeto(config, ctx.original).color;
        return datos;
    }

    /** Datos de plantilla cuando el niño toca `id` (errores: «la pelota sí la guardamos»). */
    function datosToque(config, ctx, id) {
        const base = datosReto(config, ctx);
        const t = datosObjeto(config, id);
        base.objeto = t.objeto;
        base.Objeto = t.Objeto;
        base.lo = t.lo;
        base.color = t.color;
        return base;
    }

    function linea(valor, personajeDefecto) {
        if (!valor) return null;
        if (typeof valor === "string") return { texto: valor, personaje: personajeDefecto || "zoe" };
        return { texto: valor.texto || "", personaje: valor.personaje || personajeDefecto || "zoe" };
    }

    function validarConfig(config) {
        const errores = [];
        const objetos = config.objetos || {};
        const grupos = config.grupos || {};
        Object.keys(grupos).forEach(function (g) {
            (grupos[g] || []).forEach(function (id) {
                if (!objetos[id]) errores.push("Grupo " + g + ": objeto inexistente " + id);
            });
        });
        Object.keys(objetos).forEach(function (id) {
            if (!objetos[id].img) errores.push("Objeto sin img: " + id);
            if (["f", "m"].indexOf(objetos[id].genero) === -1) errores.push("Objeto sin genero f/m: " + id);
        });
        (config.niveles || []).forEach(function (nivel) {
            resolverRetos(config, nivel).forEach(function (def, i) {
                const donde = "Nivel " + nivel.id + " reto " + (i + 1);
                if (MECANICAS.indexOf(def.mecanica) === -1) errores.push(donde + ": mecánica inválida " + def.mecanica);
                if (!def.textos.pregunta) errores.push(donde + ": falta textos.pregunta");
                [].concat(def.grupo || [], def.grupoOpciones || [], def.grupoIntruso || []).forEach(function (g) {
                    if (!grupos[g]) errores.push(donde + ": grupo inexistente " + g);
                });
            });
        });
        return errores;
    }

    global.MemoriaVisualRetos = {
        MECANICAS: MECANICAS,
        crearRng: crearRng,
        barajar: barajar,
        elegir: elegir,
        resolverRetos: resolverRetos,
        crearSesion: crearSesion,
        prepararReto: prepararReto,
        datosObjeto: datosObjeto,
        datosReto: datosReto,
        datosToque: datosToque,
        listaHablada: listaHablada,
        plantilla: plantilla,
        linea: linea,
        validarConfig: validarConfig
    };
})(typeof window !== "undefined" ? window : this);
