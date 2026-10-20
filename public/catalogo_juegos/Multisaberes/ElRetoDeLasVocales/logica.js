/**
 * RetoVocalesLogica — preparación de retos variados, sin DOM.
 * Tipos: escuchar | inicial | puerta | lluvia | reubicar | secuencia | serie
 */
(function (global) {
    "use strict";

    var VOCALES = ["a", "e", "i", "o", "u"];
    var TIPOS = {
        "3-4 años": ["escuchar", "inicial", "escuchar", "puerta", "lluvia"],
        "5-6 años": ["escuchar", "inicial", "reubicar", "secuencia", "inicial", "serie"]
    };

    function azar(aleatorio) {
        return typeof aleatorio === "function" ? aleatorio : Math.random;
    }

    function mezclar(lista, aleatorio) {
        var rnd = azar(aleatorio);
        var out = (lista || []).slice();
        var i;
        for (i = out.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    function igualLista(a, b) {
        if (!a || !b || a.length !== b.length) return false;
        var i;
        for (i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }

    function slotsPara(n) {
        if (n <= 2) {
            return [
                { id: "izq", x: 28, y: 62 },
                { id: "der", x: 72, y: 62 }
            ];
        }
        if (n === 3) {
            return [
                { id: "1", x: 20, y: 68 },
                { id: "2", x: 50, y: 52 },
                { id: "3", x: 80, y: 68 }
            ];
        }
        return [
            { id: "1", x: 10, y: 70 },
            { id: "2", x: 30, y: 52 },
            { id: "3", x: 50, y: 42 },
            { id: "4", x: 70, y: 52 },
            { id: "5", x: 90, y: 70 }
        ];
    }

    function ubicar(vocales, mapaPrevio, aleatorio) {
        var rnd = azar(aleatorio);
        var slots = slotsPara(vocales.length);
        var mejor = null;
        var intento;
        for (intento = 0; intento < 20; intento++) {
            var lugares = mezclar(slots, rnd).slice(0, vocales.length);
            var mapa = {};
            vocales.forEach(function (id, i) {
                mapa[id] = { slot: lugares[i].id, x: lugares[i].x, y: lugares[i].y };
            });
            mejor = mapa;
            if (!mapaPrevio) return mapa;
            var igual = true;
            var k;
            for (k = 0; k < vocales.length; k++) {
                var v = vocales[k];
                if (!mapaPrevio[v] || mapa[v].slot !== mapaPrevio[v].slot) {
                    igual = false;
                    break;
                }
            }
            if (!igual) return mapa;
        }
        return mejor;
    }

    function elegirObjeto(pool, evitar, objetos, rnd) {
        var candidatos = (pool || []).filter(function (id) {
            return objetos[id] && id !== evitar;
        });
        if (!candidatos.length) {
            candidatos = (pool || []).filter(function (id) { return !!objetos[id]; });
        }
        if (!candidatos.length) return null;
        return candidatos[Math.floor(rnd() * candidatos.length)];
    }

    /**
     * @returns {object|null}
     */
    function preparar(reto, cfg, estado, aleatorio) {
        var rnd = azar(aleatorio);
        var st = estado || {};
        var objs = (cfg && cfg.objetos) || {};
        if (!reto) return null;

        var tipo = reto.tipo || "escuchar";
        var vocales = (reto.vocales || VOCALES.slice()).slice();
        var correcto = reto.correcto;
        var objetoId = reto.objeto || null;
        var mapa = null;

        if (tipo === "inicial") {
            if (Array.isArray(reto.pool) && reto.pool.length) {
                objetoId = elegirObjeto(reto.pool, st.ultimoObjeto, objs, rnd);
            }
            if (!objetoId || !objs[objetoId]) return null;
            correcto = objs[objetoId].vocal;
            if (vocales.indexOf(correcto) === -1) vocales = VOCALES.slice();
        }

        if (tipo === "puerta") {
            correcto = reto.modelo || reto.correcto || "i";
            if (vocales.indexOf(correcto) === -1) vocales.push(correcto);
        }

        if (tipo === "lluvia") {
            correcto = reto.correcto || "o";
            var dist = (reto.distractores || []).filter(function (v) {
                return VOCALES.indexOf(v) !== -1 && v !== correcto;
            });
            vocales = mezclar([correcto].concat(dist.slice(0, 2)), rnd);
        }

        if (tipo === "secuencia") {
            correcto = reto.correcto;
            vocales = mezclar((reto.vocales || ["a", "e", "o"]).slice(), rnd);
        }

        if (tipo === "serie") {
            var usadas = st.serieUsadas || [];
            var pool = vocales.filter(function (v) { return usadas.indexOf(v) === -1; });
            if (!pool.length) pool = vocales.slice();
            correcto = pool[Math.floor(rnd() * pool.length)];
        }

        if (tipo === "escuchar" || tipo === "reubicar" || tipo === "inicial" || tipo === "puerta" || tipo === "serie") {
            if (!correcto || vocales.indexOf(correcto) === -1) return null;
            mapa = ubicar(vocales, tipo === "reubicar" ? null : st.ultimoMapa, rnd);
        }

        if (tipo === "secuencia" && (!correcto || vocales.indexOf(correcto) === -1)) return null;

        return {
            id: reto.id || "",
            tipo: tipo,
            escena: reto.escena || tipo,
            vocales: vocales,
            correcto: correcto,
            objeto: objetoId,
            modelo: reto.modelo || (tipo === "puerta" ? correcto : null),
            patron: (reto.patron || []).slice(),
            mapa: mapa,
            rondas: Math.max(1, Number(reto.rondas) || 1),
            acierto: reto.acierto || {},
            error: reto.error || null,
            pistaTrasFallos: reto.pistaTrasFallos != null ? Number(reto.pistaTrasFallos) : 2
        };
    }

    function esCorrecta(ronda, elegida) {
        return !!(ronda && elegida && ronda.correcto === elegida);
    }

    function validarConfig(cfg) {
        var errores = [];
        var vocales = (cfg && cfg.vocales) || {};
        var objetos = (cfg && cfg.objetos) || {};
        var niveles = (cfg && cfg.niveles) || [];
        if (!niveles.length) errores.push("Sin niveles");

        VOCALES.forEach(function (id) {
            if (!vocales[id] || !vocales[id].img) errores.push("Vocal " + id + ": sin imagen");
        });

        Object.keys(objetos).forEach(function (id) {
            var o = objetos[id];
            if (!o.img) errores.push("Objeto " + id + ": sin imagen");
            if (VOCALES.indexOf(o.vocal) === -1) errores.push("Objeto " + id + ": vocal inválida");
        });

        niveles.forEach(function (n) {
            var tag = "Nivel " + (n && n.id);
            var esperados = TIPOS[n && n.edad];
            if (!esperados) {
                errores.push(tag + ": edad sin reglas");
                return;
            }
            if (!n.titulo) errores.push(tag + ": sin título");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            if (!n.cierre || !n.cierre.texto) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img) errores.push(tag + ": sin insignia");
            var retos = n.retos || [];
            if (retos.length !== esperados.length) errores.push(tag + ": deben ser " + esperados.length + " retos");
            retos.forEach(function (r, i) {
                if (!r || r.tipo !== esperados[i]) {
                    errores.push(tag + " reto " + (i + 1) + ": tipo " + esperados[i]);
                }
            });
        });

        return errores;
    }

    global.RetoVocalesLogica = {
        VOCALES: VOCALES,
        mezclar: mezclar,
        ubicar: ubicar,
        preparar: preparar,
        esCorrecta: esCorrecta,
        igualLista: igualLista,
        validarConfig: validarConfig
    };
})(typeof window !== "undefined" ? window : this);
