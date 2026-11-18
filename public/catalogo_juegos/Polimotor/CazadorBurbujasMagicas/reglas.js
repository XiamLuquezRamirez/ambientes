/**
 * ReglasBurbujas — reglas puras de "El Cazador de Burbujas Mágicas" (window.ReglasBurbujas y module.exports).
 *
 * No toca el DOM ni Phaser: lee config.json, decide qué burbuja sale, dónde puede salir sin estorbar a las
 * demás y cuándo termina una ronda. Todo por identificadores (id del objeto), nunca por el texto visible.
 *
 *   rondas(cfg) · ronda(cfg, i) · totalRondas(cfg)     rondas normalizadas (con valores por defecto)
 *   objeto(cfg, id)                                     { id, nombre, icono }
 *   entre(par, u)                                       valor de un rango [min, max] con u en 0..1
 *   elegirObjeto(ronda, n, anterior, azar)              objeto de la burbuja n (sin repetir el anterior)
 *   elegirToques(ronda, n, hayFuerte, azar)             1, o 2-3 para una burbuja fuerte (rondas 2 y 3)
 *   elegirCarril(min, max, r, ocupadas, azar)           x libre para una burbuja nueva, o null si no cabe
 *   puedeSalir(ronda, enPantalla, atrapadas, volando)   ¿se puede soltar otra burbuja?
 *   progreso(atrapadas, total)                          { hechas, total, completo, marcas: [true, false…] }
 *   plantilla(texto, datos)                             reemplaza {nombre}, {n}
 *   revisarJuego(cfg)                                   lista de problemas del config (vacía = bien)
 */
(function (global) {
    "use strict";

    var DEF = {
        objetivos: 4,
        subidaSeg: [11, 12],
        radio: [0.11, 0.11],
        maxEnPantalla: 2,
        intervaloMs: [2600, 3000],
        vaiven: [0.01, 0.02],
        alturas: [1]
    };

    function par(v, d) {
        if (Array.isArray(v) && v.length >= 2 && isFinite(v[0]) && isFinite(v[1])) return [Number(v[0]), Number(v[1])];
        if (isFinite(v)) return [Number(v), Number(v)];
        return d.slice();
    }

    function rondas(cfg) {
        return ((cfg && cfg.rondas) || []).map(function (r, i) { return ronda(cfg, i); });
    }

    function ronda(cfg, i) {
        var r = ((cfg && cfg.rondas) || [])[i];
        if (!r) return null;
        return {
            indice: i,
            id: r.id != null ? r.id : i + 1,
            titulo: r.titulo || "RONDA " + (i + 1),
            nombre: r.nombre || "",
            objetivos: Math.max(1, Number(r.objetivos) || DEF.objetivos),
            subidaSeg: par(r.subidaSeg, DEF.subidaSeg),
            radio: par(r.radio, DEF.radio),
            maxEnPantalla: Math.max(1, Number(r.maxEnPantalla) || DEF.maxEnPantalla),
            intervaloMs: par(r.intervaloMs, DEF.intervaloMs),
            vaiven: par(r.vaiven, DEF.vaiven),
            alturas: Array.isArray(r.alturas) && r.alturas.length ? r.alturas.map(Number) : DEF.alturas.slice(),
            primero: r.primero || null,
            objetos: Array.isArray(r.objetos) ? r.objetos.slice() : [],
            multitoque: r.multitoque ? {
                prob: Math.max(0, Math.min(1, Number(r.multitoque.prob) || 0)),
                toques: par(r.multitoque.toques, [2, 2]).map(function (n) { return Math.max(2, Math.round(n)); }),
                radio: Number(r.multitoque.radio) || 1.1,
                lentitud: Number(r.multitoque.lentitud) || 1.25
            } : null
        };
    }

    /**
     * Cuántos toques necesita la burbuja n: 1 casi siempre. De vez en cuando (prob de la ronda) sale una
     * burbuja fuerte de 2-3 toques, nunca la primera de la ronda ni si ya hay otra fuerte en pantalla.
     */
    function elegirToques(r, n, hayFuerte, azar) {
        var rnd = azar || Math.random;
        if (!r || !r.multitoque || n < 1 || hayFuerte) return 1;
        if (rnd() >= r.multitoque.prob) return 1;
        var t = r.multitoque.toques;
        return t[0] + Math.floor(rnd() * (t[1] - t[0] + 1));
    }

    function totalRondas(cfg) {
        return ((cfg && cfg.rondas) || []).length;
    }

    function objeto(cfg, id) {
        var lista = (cfg && cfg.objetos) || [];
        for (var i = 0; i < lista.length; i++) {
            if (lista[i].id === id) return lista[i];
        }
        return null;
    }

    function entre(p, u) {
        var a = p[0];
        var b = p[1];
        return a + (b - a) * Math.max(0, Math.min(1, u));
    }

    /** Objeto de la burbuja número n de la ronda: la primera puede ser fija; nunca dos iguales seguidas. */
    function elegirObjeto(r, n, anterior, azar) {
        var rnd = azar || Math.random;
        if (!r || !r.objetos.length) return null;
        if (n === 0 && r.primero && r.objetos.indexOf(r.primero) >= 0) return r.primero;
        var opciones = r.objetos.filter(function (o) { return o !== anterior; });
        if (!opciones.length) opciones = r.objetos;
        return opciones[Math.floor(rnd() * opciones.length) % opciones.length];
    }

    /**
     * Busca una x entre min y max para una burbuja de radio r. `ocupadas` son las burbujas que todavía
     * están cerca de la zona de salida ({ x, r }): la nueva queda separada al menos 2,3 radios de cada
     * una, para que el niño pueda tocarlas sin equivocarse. Devuelve null si no hay sitio.
     */
    function elegirCarril(min, max, r, ocupadas, azar) {
        var rnd = azar || Math.random;
        if (!(max > min)) return null;
        var paso = Math.max(8, r * 0.5);
        var libres = [];
        for (var x = min; x <= max + 0.01; x += paso) {
            var ok = (ocupadas || []).every(function (o) {
                return Math.abs(o.x - x) >= 1.15 * (r + (o.r || r));
            });
            if (ok) libres.push(x);
        }
        if (!libres.length) return null;
        return libres[Math.floor(rnd() * libres.length) % libres.length];
    }

    /** Sale otra burbuja si hay sitio en pantalla y todavía faltan objetivos por atrapar. */
    function puedeSalir(r, enPantalla, atrapadas, volando) {
        if (!r) return false;
        if (atrapadas + (volando || 0) >= r.objetivos) return false;
        return enPantalla < r.maxEnPantalla;
    }

    function progreso(atrapadas, total) {
        var t = Math.max(1, Number(total) || 1);
        var h = Math.max(0, Math.min(t, Number(atrapadas) || 0));
        var marcas = [];
        for (var i = 0; i < t; i++) marcas.push(i < h);
        return { hechas: h, total: t, completo: h >= t, fraccion: h / t, marcas: marcas };
    }

    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            if (!datos || datos[k] == null) return m;
            return String(datos[k]);
        });
    }

    function revisarJuego(cfg) {
        var problemas = [];
        if (!cfg) return ["no hay config"];
        if (totalRondas(cfg) < 3) problemas.push("se necesitan al menos 3 rondas");
        rondas(cfg).forEach(function (r) {
            if (r.objetivos !== 4) problemas.push("la ronda " + r.id + " debe tener 4 objetivos");
            if (!r.objetos.length) problemas.push("la ronda " + r.id + " no tiene objetos");
            r.objetos.forEach(function (o) {
                if (!objeto(cfg, o)) problemas.push("la ronda " + r.id + " usa un objeto desconocido: " + o);
            });
            if (r.primero && r.objetos.indexOf(r.primero) < 0) problemas.push("el primero de la ronda " + r.id + " no está en sus objetos");
            if (r.subidaSeg[0] < 6) problemas.push("la ronda " + r.id + " sube demasiado rápido para 3-4 años");
            if (r.radio[0] < 0.08) problemas.push("la ronda " + r.id + " tiene burbujas demasiado pequeñas");
            if (r.maxEnPantalla > 3) problemas.push("la ronda " + r.id + " tiene demasiadas burbujas a la vez");
            if (r.multitoque && r.multitoque.toques[1] > 3) problemas.push("la ronda " + r.id + " pide demasiados toques para 3-4 años");
            if (r.multitoque && r.indice === 0) problemas.push("la burbuja fuerte no va en la primera ronda");
        });
        // La dificultad sube poco a poco: cada ronda igual o un poco más rápida que la anterior.
        var rs = rondas(cfg);
        for (var i = 1; i < rs.length; i++) {
            if (rs[i].subidaSeg[1] > rs[i - 1].subidaSeg[1]) problemas.push("la ronda " + rs[i].id + " es más lenta que la anterior");
        }
        var demo = cfg.demo || {};
        if (demo.objeto && !objeto(cfg, demo.objeto)) problemas.push("el objeto de la demo no existe");
        ((cfg.objetos) || []).forEach(function (o) {
            if (!o.icono && !o.imagen) problemas.push("el objeto " + o.id + " no tiene dibujo ni imagen");
        });
        return problemas;
    }

    var api = {
        rondas: rondas,
        ronda: ronda,
        totalRondas: totalRondas,
        objeto: objeto,
        entre: entre,
        elegirObjeto: elegirObjeto,
        elegirToques: elegirToques,
        elegirCarril: elegirCarril,
        puedeSalir: puedeSalir,
        progreso: progreso,
        plantilla: plantilla,
        revisarJuego: revisarJuego
    };

    global.ReglasBurbujas = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
