/**
 * Reglas de ¿Con qué vocal comienza?, sin DOM.
 * Posiciones en % del área de vocales (centro de cada globo/plataforma).
 *
 * Detective (5-6): el documento pide una imagen variable entre conocidas.
 * Se elige un objeto del pool distinto al último usado cuando hay más de uno.
 */
(function (global) {
    "use strict";

    var VOCES = ["zoe", "zeus"];
    var VOCALES = ["a", "e", "i", "o", "u"];
    var EFECTOS = ["eleva", "ilumina"];

    var SLOTS2 = [
        { id: "izq", x: 24, y: 72 },
        { id: "alto", x: 50, y: 58 },
        { id: "der", x: 76, y: 72 }
    ];

    var SLOTS5 = [
        { id: "1", x: 10, y: 78 },
        { id: "2", x: 30, y: 62 },
        { id: "3", x: 50, y: 52 },
        { id: "4", x: 70, y: 62 },
        { id: "5", x: 90, y: 78 }
    ];

    var REGLAS = {
        "3-4 años": [
            { tipo: "fijo", objeto: "avion", vocales: ["a", "o"], correcto: "a", efecto: "eleva", voz: "zoe", texto: "¡Muy bien!", errorVoz: "zeus", errorTexto: "¡Escucha otra vez!" },
            { tipo: "fijo", objeto: "elefante", vocales: ["e", "a"], correcto: "e", efecto: "eleva", sonido: "celebracion" },
            { tipo: "fijo", objeto: "iguana", vocales: ["i", "u"], correcto: "i", efecto: "ilumina", voz: "zeus", texto: "¡La encontraste!" },
            { tipo: "fijo", objeto: "oso", vocales: ["e", "o"], correcto: "o", efecto: "ilumina", celebra: true },
            { tipo: "fijo", objeto: "uvas", vocales: ["a", "u"], correcto: "u", efecto: "eleva", sonido: "celebracion" }
        ],
        "5-6 años": [
            { tipo: "fijo", objeto: "avion", vocales: ["a", "e", "i", "o", "u"], correcto: "a", efecto: "ilumina" },
            { tipo: "fijo", objeto: "estrella", vocales: ["a", "e", "i", "o", "u"], correcto: "e", efecto: "ilumina", voz: "zoe", texto: "¡Lo descubriste!" },
            { tipo: "fijo", objeto: "iglesia", vocales: ["a", "e", "i", "o", "u"], correcto: "i", efecto: "ilumina", sonido: "celebracion" },
            { tipo: "fijo", objeto: "oreja", vocales: ["a", "e", "i", "o", "u"], correcto: "o", efecto: "ilumina", celebra: true },
            { tipo: "fijo", objeto: "una", vocales: ["a", "e", "i", "o", "u"], correcto: "u", efecto: "ilumina" },
            { tipo: "detective", vocales: ["a", "e", "i", "o", "u"], efecto: "ilumina", sonido: "celebracion" }
        ]
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

    function lugar(slot) {
        return { slot: slot.id, x: slot.x, y: slot.y };
    }

    function mismoMapa(mapa, previo, vocales) {
        if (!previo) return false;
        var i;
        var alguno = false;
        for (i = 0; i < vocales.length; i++) {
            var id = vocales[i];
            if (!previo[id] || !mapa[id]) return false;
            alguno = true;
            if (previo[id].slot !== mapa[id].slot) return false;
        }
        return alguno;
    }

    function ubicarDos(vocales, correcto, mapaPrevio, rnd) {
        var previo = mapaPrevio || {};
        var slotPrev = previo[correcto] && previo[correcto].slot;
        var mejor = null;
        var intento;
        for (intento = 0; intento < 24; intento++) {
            var pool = SLOTS2.filter(function (s) { return s.id !== slotPrev; });
            if (pool.length < 2) pool = SLOTS2.slice();
            var lugares = mezclar(pool, rnd).slice(0, 2);
            if (Math.abs(lugares[0].x - lugares[1].x) < 26) continue;
            var idx = lugares[1].id !== slotPrev && rnd() < 0.5 ? 1 : 0;
            if (lugares[idx].id === slotPrev) idx = 1 - idx;
            var mapa = {};
            mapa[correcto] = lugar(lugares[idx]);
            vocales.forEach(function (id) {
                if (id === correcto) return;
                mapa[id] = lugar(lugares[1 - idx]);
            });
            mejor = mapa;
            if (!mismoMapa(mapa, previo, vocales)) return mapa;
        }
        return mejor;
    }

    function ubicar(vocales, correcto, mapaPrevio, aleatorio) {
        var rnd = azar(aleatorio);
        if ((vocales || []).length <= 2) return ubicarDos(vocales, correcto, mapaPrevio, rnd);
        var mejor = null;
        var intento;
        var evitar = mapaPrevio && mapaPrevio[correcto] ? mapaPrevio[correcto].slot : null;
        for (intento = 0; intento < 24; intento++) {
            var lugares = mezclar(SLOTS5, rnd).slice(0, vocales.length);
            var mapa = {};
            vocales.forEach(function (id, i) {
                mapa[id] = lugar(lugares[i]);
            });
            mejor = mapa;
            if (evitar && mapa[correcto] && mapa[correcto].slot === evitar) continue;
            if (mismoMapa(mapa, mapaPrevio, vocales)) continue;
            return mapa;
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

    function preparar(reto, estado, objetos, aleatorio) {
        var rnd = azar(aleatorio);
        var prev = estado || {};
        var objs = objetos || {};
        if (!reto) return null;

        var objetoId = reto.objeto;
        var correcto = reto.correcto;
        var vocales = (reto.vocales || []).slice();

        if (reto.tipo === "detective") {
            objetoId = elegirObjeto(reto.pool, prev.ultimoObjeto, objs, rnd);
            if (!objetoId || !objs[objetoId]) return null;
            correcto = objs[objetoId].vocal;
        }

        if (!objetoId || !objs[objetoId] || !correcto) return null;
        if (vocales.indexOf(correcto) === -1) vocales = VOCALES.slice();

        return {
            objeto: objetoId,
            vocales: vocales,
            correcto: correcto,
            mapa: ubicar(vocales, correcto, prev.ultimoMapa, rnd)
        };
    }

    function totalEstrellas(nivel) {
        return ((nivel && nivel.retos) || []).length;
    }

    function esLinea(l, voz) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== ""
            && (!voz || l.voz === voz) && VOCES.indexOf(l.voz) !== -1;
    }

    function validarConfig(cfg) {
        var errores = [];
        var vocales = (cfg && cfg.vocales) || {};
        var objetos = (cfg && cfg.objetos) || {};
        var niveles = (cfg && cfg.niveles) || [];
        if (!niveles.length) errores.push("Sin niveles");

        VOCALES.forEach(function (id) {
            if (!vocales[id] || !vocales[id].color) errores.push("Vocal " + id + ": sin color");
        });

        Object.keys(objetos).forEach(function (id) {
            var o = objetos[id];
            if (!o.img) errores.push("Objeto " + id + ": sin imagen");
            if (!o.nombre) errores.push("Objeto " + id + ": sin nombre");
            if (VOCALES.indexOf(o.vocal) === -1) errores.push("Objeto " + id + ": vocal inválida");
        });

        niveles.forEach(function (n) {
            var tag = "Nivel " + (n && n.id);
            var regla = REGLAS[n && n.edad];
            if (!regla) {
                errores.push(tag + ": edad sin reglas (" + (n && n.edad) + ")");
                return;
            }
            if (!n.titulo) errores.push(tag + ": sin título");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            (n.bienvenida || []).forEach(function (l, i) {
                if (!l || !l.texto || (l.personaje !== 0 && l.personaje !== 1)) {
                    errores.push(tag + ": bienvenida " + (i + 1) + " inválida");
                }
            });
            if (Array.isArray(n.cierre)) {
                if (!n.cierre.length || n.cierre.some(function (l) { return !esLinea(l); })) {
                    errores.push(tag + ": cierre inválido");
                }
            } else if (!esLinea(n.cierre)) {
                errores.push(tag + ": cierre inválido");
            }
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");

            var retos = n.retos || [];
            if (!retos.length || retos.length > regla.length) errores.push(tag + ": deben ser entre 1 y " + regla.length + " retos");
            retos.forEach(function (r, i) {
                var iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);
                var esp = regla[iLargo];
                var rt = tag + " reto " + (i + 1);
                if (!esp || !r) return;
                if (r.tipo !== esp.tipo) errores.push(rt + ": tipo debe ser " + esp.tipo);
                if (!igualLista(r.vocales, esp.vocales)) errores.push(rt + ": vocales distintas al documento");
                if (esp.objeto) {
                    if (r.objeto !== esp.objeto) errores.push(rt + ": objeto debe ser " + esp.objeto);
                    if (!objetos[r.objeto]) errores.push(rt + ": falta el objeto " + r.objeto);
                }
                if (esp.correcto && r.correcto !== esp.correcto) errores.push(rt + ": la correcta es " + esp.correcto);
                if (esp.tipo === "detective") {
                    if (!Array.isArray(r.pool) || r.pool.length < 2) errores.push(rt + ": pool de objetos incompleto");
                    (r.pool || []).forEach(function (id) {
                        if (!objetos[id]) errores.push(rt + ": pool sin objeto " + id);
                    });
                }

                var a = r.acierto || {};
                if (a.efecto !== esp.efecto || EFECTOS.indexOf(a.efecto) === -1) errores.push(rt + ": efecto " + esp.efecto);
                if ((a.sonido || "") !== (esp.sonido || "")) errores.push(rt + ": sonido de acierto");
                if (!!a.celebra !== !!esp.celebra) errores.push(rt + ": celebración de personajes");
                if (esp.texto) {
                    if (!esLinea(a, esp.voz) || a.texto !== esp.texto) errores.push(rt + ": frase de acierto");
                } else if (a.texto) errores.push(rt + ": el documento no da frase de acierto");

                if (esp.errorTexto) {
                    if (!esLinea(r.error, esp.errorVoz) || r.error.texto !== esp.errorTexto) errores.push(rt + ": frase de error");
                } else if (r.error && r.error.texto) errores.push(rt + ": el documento no da frase de error");
            });
        });
        return errores;
    }

    global.ConQueVocalLogica = {
        VOCALES: VOCALES,
        SLOTS2: SLOTS2,
        SLOTS5: SLOTS5,
        mezclar: mezclar,
        ubicar: ubicar,
        preparar: preparar,
        totalEstrellas: totalEstrellas,
        validarConfig: validarConfig
    };
})(typeof window !== "undefined" ? window : this);
