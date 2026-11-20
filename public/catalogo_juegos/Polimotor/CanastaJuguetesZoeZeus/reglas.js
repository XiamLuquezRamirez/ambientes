/**
 * ReglasCanasta — decisiones puras de "La canasta de juguetes" (sin DOM ni audio).
 * El nivel dice qué objeto acepta cada zona. Aquí solo se mide la distancia y se valida el config.
 */
(function (global) {
    "use strict";

    function niveles(cfg) {
        return (cfg && cfg.nivelesJuego) || [];
    }

    function nivel(cfg, i) {
        var lista = niveles(cfg);
        return lista[i] || null;
    }

    function plantilla(txt, datos) {
        var s = String(txt || "");
        var d = datos || {};
        Object.keys(d).forEach(function (k) {
            s = s.split("{" + k + "}").join(String(d[k]));
        });
        return s;
    }

    /**
     * Radio de acierto y radio de atracción a partir de la separación real entre cajas.
     *
     * Dos cajas vecinas no pueden disputarse el mismo juguete, así que la atracción
     * nunca pasa de la mitad de la separación. El radio queda por debajo para que
     * siempre exista un margen en el que el juguete "salta" a su caja.
     */
    function radiosDe(zonas, juego) {
        var j = juego || {};
        var minD = Infinity;
        var i, k, dx, dy, d;
        for (i = 0; i < zonas.length; i++) {
            for (k = i + 1; k < zonas.length; k++) {
                dx = zonas[i].x - zonas[k].x;
                dy = zonas[i].y - zonas[k].y;
                d = Math.sqrt(dx * dx + dy * dy);
                if (d > 1 && d < minD) minD = d;
            }
        }
        if (!isFinite(minD)) minD = 240;

        var tope = minD * 0.5;
        var atraer = Math.min(tope, Math.max(minD * (Number(j.atraerFactor) || 0.58), 40));
        var radio = Math.min(
            atraer * 0.8,
            Math.max(Number(j.radioMin) || 74, minD * (Number(j.radioFactor) || 0.42))
        );
        return { radio: radio, atraer: atraer, separacion: minD };
    }

    /**
     * zonas: [{ id, distancia }] distancia del centro del juguete a cada caja.
     * Acierto si cae en su caja o un poco antes (atracción).
     * Si el centro está claramente dentro de otra caja, es un intento amable, no un acierto.
     */
    function evaluar(o) {
        var datos = o || {};
        if (datos.guardado) return { acierto: false, motivo: "ya" };
        var lista = datos.zonas || [];
        var mejor = null;
        var propia = null;
        lista.forEach(function (z) {
            if (!mejor || z.distancia < mejor.distancia) mejor = z;
            if (z.id === datos.zonaObjetivo) propia = z;
        });
        var dOk = propia ? propia.distancia : Infinity;
        var enOtra = mejor && mejor.id !== datos.zonaObjetivo && mejor.distancia <= datos.radio;
        if (enOtra) return { acierto: false, motivo: "incorrecta" };
        if (dOk <= datos.atraer || datos.punteroEnObjetivo) {
            return { acierto: true, motivo: "ok", atraido: dOk > datos.radio };
        }
        if (mejor && mejor.id !== datos.zonaObjetivo && mejor.distancia <= datos.atraer) {
            return { acierto: false, motivo: "incorrecta" };
        }
        return { acierto: false, motivo: "lejos" };
    }

    function idsDe(nivelCfg) {
        return (nivelCfg.objetos || []).map(function (o) { return o.id; });
    }

    function revisarJuego(cfg) {
        var p = [];
        var lista = niveles(cfg);
        var esperados = [3, 5, 8];
        if (lista.length !== 3) p.push("hacen falta 3 niveles");
        if (!cfg.niveles || !cfg.niveles.length) p.push("falta la edad");
        if (cfg.niveles && cfg.niveles[0] && String(cfg.niveles[0].edad).indexOf("3-4") !== 0) {
            p.push("la edad visible no es 3-4 años");
        }
        lista.forEach(function (n, idx) {
            var objs = n.objetos || [];
            var zonas = n.zonas || [];
            var ids = {};
            if (objs.length !== esperados[idx]) p.push("nivel " + (idx + 1) + " no tiene " + esperados[idx] + " objetos");
            objs.forEach(function (o) {
                if (!o.id || ids[o.id]) p.push("id repetido o vacío en nivel " + (idx + 1));
                ids[o.id] = true;
                if (o.x < 8 || o.x > 92 || o.y < 8 || o.y > 92) p.push("posición fuera de rango: " + o.id);
            });
            var acepta = {};
            zonas.forEach(function (z) {
                (z.acepta || []).forEach(function (id) {
                    if (acepta[id]) p.push(id + " está en dos zonas");
                    acepta[id] = z.id;
                    if (!ids[id]) p.push("la zona " + z.id + " acepta un objeto que no existe: " + id);
                });
            });
            objs.forEach(function (o) {
                if (acepta[o.id] !== o.zona) p.push(o.id + " no cae en la zona que declara");
            });
            if (!ids[n.demo]) p.push("la demo del nivel " + (idx + 1) + " no existe");
        });
        var t = (cfg.textos || {});
        if (t.finalTitulo !== "¡SÚPER ORDEN!") p.push("falta el título final");
        if (!t.finalVoz || t.finalVoz.indexOf("¡Lo logramos!") !== 0) p.push("falta la voz final");
        var n1 = lista[0] || {};
        var n2 = lista[1] || {};
        var n3 = lista[2] || {};
        if (n1.zoe !== "¡Tenemos que guardar nuestros juguetes! ¿Me ayudas?") p.push("frase de Zoe nivel 1");
        if (n1.zeus !== "Toma un juguete, llévalo hasta su caja y suéltalo.") p.push("frase de Zeus nivel 1");
        if (n1.pista !== "¡Vamos a buscar su cajita!") p.push("pista nivel 1");
        if (n2.pista !== "Busca una caja del mismo color.") p.push("pista nivel 2");
        if (!n2.zoe || n2.zoe.indexOf("Busca el color") !== 0) p.push("frase de Zoe nivel 2");
        if (!n3.zoe || n3.zoe.indexOf("¡Uy!") !== 0) p.push("frase de Zoe nivel 3");
        return p;
    }

    var api = {
        niveles: niveles,
        nivel: nivel,
        plantilla: plantilla,
        radiosDe: radiosDe,
        evaluar: evaluar,
        idsDe: idsDe,
        revisarJuego: revisarJuego
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    if (global) global.ReglasCanasta = api;
})(typeof window !== "undefined" ? window : global);
