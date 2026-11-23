/**
 * ReglasPicnic — reglas puras de "Picnic con los Animalitos Glotones" (sin DOM ni Phaser).
 * window.ReglasPicnic en el navegador; module.exports para las pruebas de node.
 */
(function (global) {
    "use strict";

    function rondas(cfg) {
        return cfg && Array.isArray(cfg.rondas) ? cfg.rondas : [];
    }

    function totalRondas(cfg) {
        return rondas(cfg).length;
    }

    function ronda(cfg, i) {
        var r = rondas(cfg);
        if (!r.length) return null;
        return r[Math.max(0, Math.min(r.length - 1, i | 0))];
    }

    function totalAlimentos(cfg) {
        return rondas(cfg).reduce(function (s, r) { return s + (r.alimentos || []).length; }, 0);
    }

    function animalesRonda(cfg, i) {
        var r = ronda(cfg, i);
        return r && Array.isArray(r.animales) ? r.animales.slice() : [];
    }

    function buscar(lista, id) {
        for (var k = 0; k < (lista || []).length; k++) {
            if (lista[k] && lista[k].id === id) return lista[k];
        }
        return null;
    }

    function datosAlimento(cfg, id) {
        return buscar(cfg && cfg.alimentos, id);
    }

    function datosAnimal(cfg, id) {
        return buscar(cfg && cfg.animales, id);
    }

    /** Id del animal que come un alimento (por su tipo), o null si no existe. */
    function animalDe(cfg, idAlimentoTipo) {
        var a = datosAlimento(cfg, idAlimentoTipo);
        return a ? a.animal : null;
    }

    /** Tipo de alimento que le toca a un animal en una ronda, o null si no tiene. */
    function alimentoDe(cfg, idAnimal, i) {
        var r = ronda(cfg, i);
        if (!r) return null;
        var lista = r.alimentos || [];
        for (var k = 0; k < lista.length; k++) {
            if (animalDe(cfg, lista[k]) === idAnimal) return lista[k];
        }
        return null;
    }

    /** Identificador único de un alimento de una ronda (no se repite entre rondas). */
    function idAlimento(rondaIdx, k, tipo) {
        return "r" + (rondaIdx + 1) + "-" + k + "-" + tipo;
    }

    function tipoDe(id) {
        var p = String(id || "").split("-");
        return p.length >= 3 ? p.slice(2).join("-") : null;
    }

    /** Fisher-Yates sobre una copia. rnd: función de azar (Math.random en el juego; una fija en las pruebas). */
    function mezclar(lista, rnd) {
        var a = lista.slice();
        var f = rnd || Math.random;
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(f() * (i + 1));
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    /** Piezas de la cesta en una ronda: un alimento por animal presente, mezclados. */
    function piezasRonda(cfg, i, rnd) {
        var r = ronda(cfg, i) || {};
        var l = (r.alimentos || []).map(function (t, k) {
            return { id: idAlimento(i, k, t), tipo: t, animal: animalDe(cfg, t) };
        });
        return mezclar(l, rnd);
    }

    /** Radio de entrega alrededor de la boca: crece un poco con los fallos seguidos (con tope). */
    function radioEntrega(cfg, fallosSeguidos) {
        var j = (cfg && cfg.juego) || {};
        var base = Number(j.radioBoca) || 90;
        var paso = Number(j.radioBocaPorFallo) || 0;
        var tope = Number(j.radioBocaMax) || base;
        return Math.min(tope, base + paso * Math.max(0, fallosSeguidos | 0));
    }

    /** Boca más cercana a un punto: { id, distancia } o null si no hay bocas. */
    function animalMasCercano(bocas, punto) {
        var mejor = null;
        (bocas || []).forEach(function (b) {
            var d = Math.hypot(punto.x - b.x, punto.y - b.y);
            if (!mejor || d < mejor.distancia) mejor = { id: b.id, distancia: d };
        });
        return mejor;
    }

    /**
     * Decide una entrega. o = { alimento:{x,y}, bocas:[{id,x,y}], tipo, animalEsperado, radio, entregada }
     * motivo: "repetida", "lejos", "boca" (acierto) u "otroAnimal" (la boca más cercana es de otro).
     */
    function evaluarEntrega(o) {
        if (!o || !o.alimento) return { acierto: false, motivo: "lejos", animal: null, distancia: Infinity };
        var cerca = animalMasCercano(o.bocas, o.alimento);
        var animal = cerca ? cerca.id : null;
        var d = cerca ? cerca.distancia : Infinity;
        if (o.entregada) return { acierto: false, motivo: "repetida", animal: animal, distancia: d };
        var r = Number(o.radio) || 90;
        if (!cerca || d > r) return { acierto: false, motivo: "lejos", animal: animal, distancia: d };
        if (animal === o.animalEsperado) return { acierto: true, motivo: "boca", animal: animal, distancia: d };
        return { acierto: false, motivo: "otroAnimal", animal: animal, distancia: d };
    }

    function progreso(hechas, total) {
        var n = Math.max(0, Math.min(total, hechas | 0));
        var marcas = [];
        for (var i = 0; i < total; i++) marcas.push(i < n);
        return { hechas: n, total: total, marcas: marcas, completo: n >= total };
    }

    function plantilla(texto, vars) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return vars && vars[k] != null ? String(vars[k]) : m;
        });
    }

    /** Pista cuando un alimento se suelta en el animal equivocado: "las semillas son para el pajarito." */
    function textoPista(cfg, idAlimentoTipo) {
        var t = (cfg && cfg.textos) || {};
        var a = datosAlimento(cfg, idAlimentoTipo);
        if (!a) return "";
        var dueno = datosAnimal(cfg, a.animal);
        return plantilla(t.noEsSuyo, {
            alimento: a.nombre,
            verbo: a.plural ? t.noEsSuyoVerboPlural : t.noEsSuyoVerboSingular,
            animal: dueno ? dueno.nombre : ""
        });
    }

    /** Revisa que la configuración sea jugable; devuelve una lista de problemas (vacía si está bien). */
    function revisarJuego(cfg) {
        var p = [];
        var rs = rondas(cfg);
        if (rs.length !== 3) p.push("deben ser 3 rondas");

        var animales = {};
        ((cfg && cfg.animales) || []).forEach(function (a) {
            if (animales[a.id]) p.push("animal repetido en el catálogo: " + a.id);
            animales[a.id] = true;
        });
        var alimentos = {};
        ((cfg && cfg.alimentos) || []).forEach(function (a) {
            if (alimentos[a.id]) p.push("alimento repetido en el catálogo: " + a.id);
            alimentos[a.id] = true;
            if (!animales[a.animal]) p.push("el alimento " + a.id + " tiene un dueño desconocido: " + a.animal);
        });

        var ids = {};
        rs.forEach(function (r, i) {
            var n = i + 1;
            var ans = r.animales || [];
            var als = r.alimentos || [];
            if (als.length !== ans.length) p.push("la ronda " + n + " debe tener un alimento por animal");
            var vistos = {};
            ans.forEach(function (a) {
                if (!animales[a]) p.push("animal desconocido en la ronda " + n + ": " + a);
                if (vistos[a]) p.push("animal repetido en la ronda " + n + ": " + a);
                vistos[a] = true;
            });
            als.forEach(function (t, k) {
                if (!alimentos[t]) {
                    p.push("alimento desconocido en la ronda " + n + ": " + t);
                } else if (ans.indexOf(animalDe(cfg, t)) === -1) {
                    p.push("el alimento " + t + " de la ronda " + n + " es de un animal que no está en la ronda");
                }
                var id = idAlimento(i, k, t);
                if (ids[id]) p.push("id repetido: " + id);
                ids[id] = true;
            });
            if (i > 0) {
                (rs[i - 1].animales || []).forEach(function (a) {
                    if (ans.indexOf(a) === -1) p.push("la ronda " + n + " debe conservar al animal " + a + " de la anterior");
                });
            }
        });

        if (!cfg || !Array.isArray(cfg.niveles) || !cfg.niveles.length) p.push("faltan niveles");
        else if (cfg.niveles.length > 1) p.push("debe haber un solo nivel");
        return p;
    }

    var API = {
        rondas: rondas,
        totalRondas: totalRondas,
        ronda: ronda,
        totalAlimentos: totalAlimentos,
        animalesRonda: animalesRonda,
        animalDe: animalDe,
        alimentoDe: alimentoDe,
        datosAlimento: datosAlimento,
        datosAnimal: datosAnimal,
        idAlimento: idAlimento,
        tipoDe: tipoDe,
        piezasRonda: piezasRonda,
        mezclar: mezclar,
        radioEntrega: radioEntrega,
        animalMasCercano: animalMasCercano,
        evaluarEntrega: evaluarEntrega,
        textoPista: textoPista,
        progreso: progreso,
        plantilla: plantilla,
        revisarJuego: revisarJuego
    };

    if (global) global.ReglasPicnic = API;
    if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : null);
