/**
 * EncuentraParejaLogica — memoria de vocales, sin DOM.
 * Cada pareja = dos cartas con la misma vocal; el mazo se baraja al preparar.
 * Evita repetir el mismo orden que la ronda anterior cuando hay alternativas.
 */
(function (global) {
    "use strict";

    var VOCALES = ["a", "e", "i", "o", "u"];

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

    function columnasPara(n) {
        if (n <= 2) return 2;
        if (n <= 4) return 2;
        if (n <= 8) return 4;
        return 5;
    }

    function huella(cartas) {
        return (cartas || []).map(function (c) { return c.vocal; }).join(",");
    }

    function armarCartas(parejas) {
        var cartas = [];
        var i;
        for (i = 0; i < parejas.length; i++) {
            var v = parejas[i];
            cartas.push({ id: v + "-a", vocal: v });
            cartas.push({ id: v + "-b", vocal: v });
        }
        return cartas;
    }

    /**
     * @returns {{ cartas:[{id,vocal}], parejas:string[], totalParejas:number, columnas:number, huella:string, acierto:object, error:object|null, id:string }}
     */
    function preparar(reto, cfg, estado, aleatorio) {
        var rnd = azar(aleatorio);
        if (!reto) return null;
        var parejas = (reto.parejas || []).filter(function (v) {
            return VOCALES.indexOf(v) !== -1 && cfg && cfg.vocales && cfg.vocales[v];
        });
        if (!parejas.length) return null;

        var base = armarCartas(parejas);
        var prev = estado && estado.ultimaHuella;
        var cartas = mezclar(base, rnd);
        var intento;
        for (intento = 0; intento < 16 && prev && huella(cartas) === prev; intento++) {
            cartas = mezclar(base, rnd);
        }

        return {
            cartas: cartas,
            parejas: parejas.slice(),
            totalParejas: parejas.length,
            columnas: columnasPara(cartas.length),
            huella: huella(cartas),
            acierto: reto.acierto || {},
            error: reto.error || null,
            id: reto.id || ""
        };
    }

    function esPareja(a, b) {
        return !!(a && b && a.vocal && a.vocal === b.vocal && a.id !== b.id);
    }

    function totalEstrellas(nivel) {
        return ((nivel && nivel.retos) || []).length;
    }

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "";
    }

    function validarConfig(cfg) {
        var errores = [];
        var vocales = (cfg && cfg.vocales) || {};
        var niveles = (cfg && cfg.niveles) || [];
        if (!niveles.length) errores.push("Sin niveles");

        VOCALES.forEach(function (id) {
            if (!vocales[id] || !vocales[id].img) errores.push("Vocal " + id + ": sin imagen");
        });

        if (!cfg || !cfg.reversos || !cfg.reversos.hoja || !cfg.reversos.espejo) {
            errores.push("Faltan reversos hoja/espejo");
        }

        niveles.forEach(function (n) {
            var tag = "Nivel " + (n && n.id);
            if (!n.titulo) errores.push(tag + ": sin título");
            if (!Array.isArray(n.bienvenida) || n.bienvenida.length < 2) errores.push(tag + ": bienvenida incompleta");
            if (!esLinea(n.cierre)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img) errores.push(tag + ": sin insignia");
            if (!n.reverso || !cfg.reversos[n.reverso]) errores.push(tag + ": reverso inválido");

            (n.retos || []).forEach(function (r, i) {
                var rt = tag + " reto " + (i + 1);
                if (!r || !Array.isArray(r.parejas) || r.parejas.length < 1) {
                    errores.push(rt + ": sin parejas");
                    return;
                }
                r.parejas.forEach(function (v) {
                    if (VOCALES.indexOf(v) === -1 || !vocales[v]) errores.push(rt + ": vocal " + v + " inválida");
                });
                var uniq = {};
                r.parejas.forEach(function (v) {
                    if (uniq[v]) errores.push(rt + ": pareja duplicada " + v);
                    uniq[v] = true;
                });
            });
        });

        var n3 = niveles.find(function (n) { return String(n.id) === "3"; });
        var n5 = niveles.find(function (n) { return String(n.id) === "5"; });
        if (n3 && (!(n3.retos || []).length || (n3.retos || []).length > 3)) errores.push("Nivel 3: deben ser entre 1 y 3 retos");
        if (n5 && (!(n5.retos || []).length || (n5.retos || []).length > 4)) errores.push("Nivel 5: deben ser entre 1 y 4 retos");
        if (n3 && (n3.retos || []).length === 3) {
            if (!igualLista(n3.retos[0].parejas, ["a", "e"])) errores.push("Nivel 3 reto 1: parejas a,e");
            if ((n3.retos[0].parejas || []).length !== 2) errores.push("Nivel 3: 2 parejas (4 cartas)");
            if ((n3.retos[2].parejas || []).length !== 2) errores.push("Nivel 3 final: 2 parejas");
        }
        if (n5 && (n5.retos || []).length === 4) {
            if ((n5.retos[0].parejas || []).length !== 4) errores.push("Nivel 5 reto 1: 4 parejas");
            if ((n5.retos[1].parejas || []).length !== 4) errores.push("Nivel 5 reto 2: 4 parejas");
            if ((n5.retos[2].parejas || []).length !== 5) errores.push("Nivel 5 reto 3: 5 parejas");
            if ((n5.retos[3].parejas || []).length !== 5) errores.push("Nivel 5 final: 5 parejas");
        }

        return errores;
    }

    global.EncuentraParejaLogica = {
        VOCALES: VOCALES,
        mezclar: mezclar,
        preparar: preparar,
        esPareja: esPareja,
        columnasPara: columnasPara,
        huella: huella,
        totalEstrellas: totalEstrellas,
        validarConfig: validarConfig
    };
})(typeof window !== "undefined" ? window : this);
