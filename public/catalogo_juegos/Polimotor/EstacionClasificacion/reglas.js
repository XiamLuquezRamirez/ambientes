/**
 * ReglasEstacion — reglas puras de "¡La Estación de Clasificación!" (window.ReglasEstacion).
 *
 * Sin DOM ni Phaser: se prueba con node (tests/js/estacion-clasificacion).
 * Cada objeto lleva sus atributos (color, tamano, forma) y cada contenedor los atributos que
 * recibe. Un nivel dice qué atributos cuentan (criterios): el objeto entra solo si TODOS los
 * criterios coinciden. En el nivel 4 son dos (color + tamano): si falla uno, no entra.
 * Nunca se decide por el nombre del objeto ni por su posición.
 */
(function (global) {
    "use strict";

    var ATRIBUTOS = ["color", "tamano", "forma"];

    var NOMBRES = {
        color: { azul: "azul", amarillo: "amarillo", rojo: "rojo", verde: "verde", naranja: "naranja", morado: "morado", turquesa: "turquesa", gris: "gris" },
        tamano: { grande: "grande", pequeno: "pequeño" },
        forma: { cuadrado: "cuadrado", circulo: "círculo", triangulo: "triángulo", rectangulo: "rectángulo", estrella: "estrella" }
    };

    function niveles(cfg) { return (cfg && cfg.nivelesJuego) || []; }
    function nivel(cfg, i) { return niveles(cfg)[i] || null; }
    function criterios(niv) {
        var c = (niv && niv.criterios) || [];
        return c.filter(function (a) { return ATRIBUTOS.indexOf(a) >= 0; });
    }

    /**
     * ¿El objeto va en ese contenedor?
     * → { acierto, fallos: [atributos que no coinciden], bien: [atributos que sí] }
     */
    function evaluar(objeto, contenedor, lista) {
        var res = { acierto: false, fallos: [], bien: [] };
        if (!objeto || !contenedor || !lista || !lista.length) return res;
        lista.forEach(function (a) {
            var v = contenedor[a];
            if (v != null && objeto[a] === v) res.bien.push(a);
            else res.fallos.push(a);
        });
        res.acierto = res.fallos.length === 0;
        return res;
    }

    /** Los contenedores del nivel que aceptan el objeto (con una config válida, exactamente uno). */
    function destinos(objeto, contenedores, lista) {
        return (contenedores || []).filter(function (c) { return evaluar(objeto, c, lista).acierto; });
    }

    function destino(objeto, contenedores, lista) {
        var d = destinos(objeto, contenedores, lista);
        return d.length === 1 ? d[0] : null;
    }

    function completo(clasificados, objetos) {
        if (!objetos || !objetos.length) return false;
        return objetos.every(function (o) { return !!clasificados[o.id]; });
    }

    function contar(clasificados, objetos) {
        return (objetos || []).filter(function (o) { return !!clasificados[o.id]; }).length;
    }

    /** Mezcla (Fisher-Yates) con un azar inyectable para las pruebas. */
    function mezclar(lista, azar) {
        var r = typeof azar === "function" ? azar : Math.random;
        var a = (lista || []).slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    /**
     * Orden de salida de los objetos a la cinta. Se mezcla, pero los que se ven al empezar
     * (los primeros `visibles`) deben poder ir a más de un contenedor: así la primera mirada
     * ya obliga a comparar y no hay un contenedor que se quede sin nada durante mucho rato.
     */
    function ordenCinta(niv, visibles, azar) {
        var objs = (niv && niv.objetos) || [];
        var conts = (niv && niv.contenedores) || [];
        var lista = criterios(niv);
        var n = Math.min(visibles || objs.length, objs.length);
        var mejor = null;
        for (var intento = 0; intento < 40; intento++) {
            var orden = mezclar(objs, azar);
            var vistos = {};
            orden.slice(0, n).forEach(function (o) {
                var d = destino(o, conts, lista);
                if (d) vistos[d.id] = true;
            });
            var cubre = Object.keys(vistos).length;
            if (!mejor || cubre > mejor.cubre) mejor = { orden: orden, cubre: cubre };
            if (cubre >= Math.min(conts.length, n)) break;
        }
        return mejor ? mejor.orden : objs.slice();
    }

    // ------------------------------------------------------------------ objetos al azar

    /** Sustantivo de cada forma y si es femenino (para concordar color y tamaño). */
    var SUSTANTIVO = {
        cuadrado: { n: "caja", f: true },
        circulo: { n: "pelota", f: true },
        estrella: { n: "estrella", f: true },
        triangulo: { n: "bloque triangular", f: false },
        rectangulo: { n: "placa rectangular", f: true }
    };
    var FEMENINO = { amarillo: "amarilla", rojo: "roja", morado: "morada" };

    /** "la pelota amarilla grande", "el bloque triangular azul pequeño"… */
    function nombreObjeto(o) {
        var s = SUSTANTIVO[o.forma] || { n: "objeto", f: false };
        var col = s.f ? (FEMENINO[o.color] || nombre("color", o.color)) : nombre("color", o.color);
        var tam = o.tamano === "pequeno" ? (s.f ? "pequeña" : "pequeño") : "grande";
        return (s.f ? "la " : "el ") + s.n + " " + col + " " + tam;
    }

    /**
     * Objetos de una ronda, nuevos cada vez (niv.generador). Para cada contenedor se toman al azar
     * `porContenedor` combinaciones de forma, color y tamaño que cumplen SUS criterios; lo que el
     * nivel no mira (p. ej. la forma en el nivel 1) varía, y se evita repetir el atributo libre
     * principal dentro del mismo contenedor para que haya variedad.
     * generador: { porContenedor, formas, colores, tamanos, colorPorTamano? }
     * Sin generador se usan los objetos fijos de niv.objetos.
     */
    function generarObjetos(niv, azar) {
        var g = niv && niv.generador;
        if (!g) return ((niv && niv.objetos) || []).slice();
        var lista = criterios(niv);
        var libres = ["forma", "color", "tamano"].filter(function (a) {
            return lista.indexOf(a) < 0 && !(a === "color" && g.colorPorTamano);
        });
        var principal = libres[0];
        var out = [];
        (niv.contenedores || []).forEach(function (c) {
            var combos = [];
            (g.formas || []).forEach(function (f) {
                (g.colores || []).forEach(function (col) {
                    (g.tamanos || []).forEach(function (t) {
                        if (g.colorPorTamano && g.colorPorTamano[t] && g.colorPorTamano[t] !== col) return;
                        var o = { forma: f, color: col, tamano: t };
                        if (evaluar(o, c, lista).acierto) combos.push(o);
                    });
                });
            });
            combos = mezclar(combos, azar);
            // si el tamaño no es el criterio, se intercalan grandes y pequeños: siempre hay de los dos
            if (lista.indexOf("tamano") < 0) {
                var g1 = combos.filter(function (o) { return o.tamano === "grande"; });
                var g2 = combos.filter(function (o) { return o.tamano !== "grande"; });
                if ((azar || Math.random)() < 0.5) { var tmp = g1; g1 = g2; g2 = tmp; }
                combos = [];
                for (var j = 0; j < Math.max(g1.length, g2.length); j++) {
                    if (g1[j]) combos.push(g1[j]);
                    if (g2[j]) combos.push(g2[j]);
                }
            }
            var elegidos = [], usados = {};
            // primera pasada: sin repetir el atributo libre principal; segunda: completar
            combos.forEach(function (o) {
                if (elegidos.length >= g.porContenedor) return;
                var k = principal ? o[principal] : "";
                if (principal && usados[k]) return;
                usados[k] = true;
                elegidos.push(o);
            });
            combos.forEach(function (o) {
                if (elegidos.length < g.porContenedor && elegidos.indexOf(o) < 0) elegidos.push(o);
            });
            elegidos.forEach(function (o) {
                o.id = o.forma + "-" + o.color + "-" + o.tamano;
                o.nombre = nombreObjeto(o);
                out.push(o);
            });
        });
        return out;
    }

    function nombre(atributo, valor) {
        var t = NOMBRES[atributo];
        return (t && t[valor]) || valor || "";
    }

    /** Rellena {color}, {tamano}, {forma} y {objeto} con los datos del objeto. */
    function plantilla(texto, objeto) {
        if (!texto) return "";
        return String(texto).replace(/\{(color|tamano|forma|objeto)\}/g, function (_, k) {
            if (!objeto) return "";
            if (k === "objeto") return objeto.nombre || "";
            return nombre(k, objeto[k]);
        });
    }

    /**
     * Frase de pista tras un error.
     * fallos: atributos que no coincidieron. insiste: segundo error con el mismo objeto (pista concreta).
     */
    function pista(niv, objeto, fallos, insiste) {
        var p = (niv && niv.pistas) || {};
        var f = fallos || [];
        if (insiste && p.concreta) return plantilla(p.concreta, objeto);
        if (f.length === 1 && p[f[0]]) return plantilla(p[f[0]], objeto);
        return plantilla(p.general || "", objeto);
    }

    function frase(lista, i) {
        if (!lista || !lista.length) return "";
        return lista[Math.abs(i | 0) % lista.length];
    }

    /** Revisa config.json. Devuelve una lista de problemas (vacía si todo está bien). */
    function validar(cfg) {
        var err = [];
        var ns = niveles(cfg);
        if (ns.length !== 4) err.push("se esperaban 4 niveles y hay " + ns.length);
        ns.forEach(function (niv, i) {
            var et = "nivel " + (i + 1);
            var lista = criterios(niv);
            if (!lista.length) err.push(et + ": sin criterios");
            var conts = niv.contenedores || [];
            if (conts.length < 2 || conts.length > 4) err.push(et + ": debe tener de 2 a 4 contenedores");
            conts.forEach(function (c) {
                lista.forEach(function (a) {
                    if (c[a] == null) err.push(et + ": el contenedor " + c.id + " no dice su " + a);
                });
            });
            // con generador se revisan varias rondas al azar (semillas fijas, resultado estable)
            var rondas = niv.generador ? [1, 2, 3, 4, 5].map(function (s) { return generarObjetos(niv, semilla(s * 97 + i)); }) : [niv.objetos || []];
            rondas.forEach(function (objs) {
                var ids = {};
                objs.forEach(function (o) {
                    if (ids[o.id]) err.push(et + ": objeto repetido " + o.id);
                    ids[o.id] = true;
                    ATRIBUTOS.forEach(function (a) {
                        if (o[a] == null) err.push(et + ": el objeto " + o.id + " no tiene " + a);
                    });
                    var d = destinos(o, conts, lista);
                    if (d.length !== 1) err.push(et + ": el objeto " + o.id + " cabe en " + d.length + " contenedores");
                });
                conts.forEach(function (c) {
                    var n = objs.filter(function (o) { return evaluar(o, c, lista).acierto; }).length;
                    if (!n) err.push(et + ": el contenedor " + c.id + " no recibe ningún objeto");
                    if (niv.generador && n !== niv.generador.porContenedor) err.push(et + ": el contenedor " + c.id + " recibe " + n + " objetos");
                });
            });
        });
        return err;
    }

    /** Azar determinista (para validar y para las pruebas). */
    function semilla(s) {
        var x = s >>> 0;
        return function () { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
    }

    global.ReglasEstacion = {
        ATRIBUTOS: ATRIBUTOS,
        niveles: niveles,
        nivel: nivel,
        criterios: criterios,
        evaluar: evaluar,
        destinos: destinos,
        destino: destino,
        completo: completo,
        contar: contar,
        mezclar: mezclar,
        ordenCinta: ordenCinta,
        generarObjetos: generarObjetos,
        nombreObjeto: nombreObjeto,
        semilla: semilla,
        nombre: nombre,
        plantilla: plantilla,
        pista: pista,
        frase: frase,
        validar: validar
    };
})(typeof window !== "undefined" ? window : global);
