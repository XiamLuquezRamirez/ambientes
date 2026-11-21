/**
 * ReglasArbol — decisiones puras de "El Árbol de las Formas Mágicas" (sin DOM, sin Phaser, sin audio).
 *
 * La respuesta correcta vive en los datos: cada fruto tiene una `forma` y cada molde también.
 * La escena solo mide distancias; aquí se decide si el soltado es un encaje, otra forma o fuera.
 */
(function (global) {
    "use strict";

    var FORMAS = ["circulo", "cuadrado", "triangulo", "corazon", "estrella"];

    function num(v, porDefecto) {
        var n = Number(v);
        return isFinite(n) && n > 0 ? n : porDefecto;
    }

    function frutos(cfg) { return (cfg && cfg.frutos) || []; }

    function fruto(cfg, id) {
        return frutos(cfg).filter(function (f) { return f.id === id; })[0] || null;
    }

    /** Niveles de la partida (3, 4 y 5 frutos). `niveles` del config es la edad del catálogo, no esto. */
    function niveles(cfg) { return (cfg && cfg.nivelesJuego) || []; }

    function nivel(cfg, i) { return niveles(cfg)[i] || null; }

    /** Frutos (definición completa) del nivel i, en el orden del config. */
    function frutosNivel(cfg, i) {
        var n = nivel(cfg, i);
        if (!n) return frutos(cfg);
        return (n.frutos || []).map(function (id) { return fruto(cfg, id); }).filter(Boolean);
    }

    function frutoDeForma(cfg, forma) {
        return frutos(cfg).filter(function (f) { return f.forma === forma; })[0] || null;
    }

    /**
     * Radios en píxeles de diseño a partir de la separación real entre moldes.
     * El de acierto nunca pasa del 45 % de la separación: dos moldes vecinos no se disputan un fruto.
     * El de proximidad (brillo) es más amplio, para avisar antes de llegar.
     */
    function radios(posiciones, juego) {
        var j = juego || {};
        var minD = Infinity;
        for (var i = 0; i < posiciones.length; i++) {
            for (var k = i + 1; k < posiciones.length; k++) {
                var dx = posiciones[i].x - posiciones[k].x;
                var dy = posiciones[i].y - posiciones[k].y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d > 1 && d < minD) minD = d;
            }
        }
        if (!isFinite(minD)) minD = 260;
        var acierto = Math.min(num(j.radioAcierto, 96), minD * 0.45);
        var cerca = Math.max(acierto + 20, num(j.radioCerca, 200));
        return { acierto: acierto, cerca: cerca, separacion: minD };
    }

    /**
     * datos.forma   forma del fruto soltado
     * datos.moldes  [{ forma, distancia, ocupado }] distancia del centro del fruto a cada molde
     * datos.radio   radio de acierto
     *
     * Si el molde de su misma forma está dentro del radio y libre, es un encaje aunque otro molde
     * quede un poco más cerca: el niño apuntó bien y se le premia. Si no, manda el molde más cercano.
     */
    function evaluar(datos) {
        var d = datos || {};
        var radio = num(d.radio, 96);
        var lista = (d.moldes || []).filter(function (m) { return m && isFinite(m.distancia); });
        var propio = lista.filter(function (m) { return m.forma === d.forma; })[0];
        if (propio && propio.distancia <= radio) {
            if (propio.ocupado) return { acierto: false, motivo: "ocupado", molde: propio.forma };
            return { acierto: true, motivo: "correcto", molde: propio.forma };
        }
        var cercano = null;
        lista.forEach(function (m) {
            if (m.distancia <= radio && (!cercano || m.distancia < cercano.distancia)) cercano = m;
        });
        if (!cercano) return { acierto: false, motivo: "fuera", molde: null };
        return { acierto: false, motivo: "otraForma", molde: cercano.forma };
    }

    /** Molde de su misma forma al que el fruto ya se está acercando (para que brille). Si no, null. */
    function cercano(forma, moldes, radioCerca) {
        var r = num(radioCerca, 200);
        var m = (moldes || []).filter(function (x) { return x.forma === forma; })[0];
        if (!m || m.ocupado || !(m.distancia <= r)) return null;
        // 0 lejos (en el borde del radio) … 1 encima del molde
        return { forma: m.forma, fuerza: Math.max(0, Math.min(1, 1 - m.distancia / r)) };
    }

    /** Baraja con un generador inyectable (Math.random por defecto). */
    function barajar(lista, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    /**
     * Elige en qué lugar del claro aparece cada fruto. Hay más lugares que frutos, y cada partida
     * cambia el reparto: así la posición no resuelve el juego, la forma sí.
     */
    function repartir(ids, nLugares, rnd) {
        var lugares = barajar(Array.apply(null, { length: nLugares }).map(function (_, i) { return i; }), rnd);
        var out = {};
        ids.forEach(function (id, i) { out[id] = lugares[i % lugares.length]; });
        return out;
    }

    /** Frase de acierto que no se repite seguida. */
    function frase(lista, turno) {
        if (!lista || !lista.length) return "¡Muy bien!";
        return lista[Math.abs(turno | 0) % lista.length];
    }

    /** ¿Están colocados todos los frutos de la lista (o de todo el config si no se pasa lista)? */
    function completo(colocados, cfg, lista) {
        var ids = (lista || frutos(cfg)).map(function (f) { return f.id || f; });
        var total = ids.length;
        if (lista) return total > 0 && ids.every(function (id) { return !!(colocados || {})[id]; });
        var n = Object.keys(colocados || {}).filter(function (k) { return colocados[k]; }).length;
        return total > 0 && n >= total;
    }

    /** Errores del config que romperían la partida (lista vacía = válido). */
    function validar(cfg) {
        var errores = [];
        var fs = frutos(cfg);
        if (fs.length < 3) errores.push("Faltan frutos");
        var vistas = {};
        fs.forEach(function (f) {
            if (!f.id) errores.push("Fruto sin id");
            if (FORMAS.indexOf(f.forma) < 0) errores.push("Forma desconocida: " + f.forma);
            if (vistas[f.forma]) errores.push("Forma repetida: " + f.forma);
            vistas[f.forma] = true;
            if (!f.nombre) errores.push("Fruto sin nombre visible: " + f.id);
        });
        var moldes = (cfg && cfg.moldes) || [];
        fs.forEach(function (f) {
            if (moldes.indexOf(f.forma) < 0) errores.push("Falta el molde de " + f.forma);
        });
        if (cfg && cfg.demo && !fruto(cfg, cfg.demo.fruto)) errores.push("El fruto de la demo no existe");
        var ns = niveles(cfg);
        if (!ns.length) errores.push("No hay niveles de juego");
        ns.forEach(function (n, i) {
            var ids = n.frutos || [];
            if (ids.length < 3 || ids.length > 5) errores.push("Nivel " + (i + 1) + ": debe tener de 3 a 5 frutos");
            var formas = {};
            ids.forEach(function (id) {
                var f = fruto(cfg, id);
                if (!f) { errores.push("Nivel " + (i + 1) + ": fruto desconocido " + id); return; }
                if (formas[f.forma]) errores.push("Nivel " + (i + 1) + ": dos frutos con la forma " + f.forma);
                formas[f.forma] = true;
            });
            if (!n.zoe || !n.listo) errores.push("Nivel " + (i + 1) + ": faltan textos");
        });
        return errores;
    }

    global.ReglasArbol = {
        FORMAS: FORMAS,
        fruto: fruto,
        niveles: niveles,
        nivel: nivel,
        frutosNivel: frutosNivel,
        frutoDeForma: frutoDeForma,
        radios: radios,
        evaluar: evaluar,
        cercano: cercano,
        barajar: barajar,
        repartir: repartir,
        frase: frase,
        completo: completo,
        validar: validar
    };
})(typeof window !== "undefined" ? window : global);
