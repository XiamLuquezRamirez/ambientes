/**
 * ReglasRobot — decisiones puras de "El Robot Mecánico y sus Conexiones" (sin DOM, sin Phaser, sin audio).
 *
 * La respuesta correcta vive en los datos: cada pieza tiene un `id` y cada ranura del robot lleva
 * el `id` de la pieza que le corresponde. La escena solo mide distancias y ángulos; aquí se decide
 * si el soltado es un encaje, una pieza mal orientada, una pieza que todavía no puede ir (su
 * pieza madre falta), un "casi", otra ranura o un soltado fuera del robot.
 */
(function (global) {
    "use strict";

    var TIPOS = ["brazo-izq", "brazo-der", "pierna-izq", "pierna-der", "cabeza", "mano-izq", "mano-der", "pie-izq", "pie-der", "antena", "modulo"];

    function num(v, porDefecto) {
        var n = Number(v);
        return isFinite(n) && n > 0 ? n : porDefecto;
    }

    function piezas(cfg) { return (cfg && cfg.piezas) || []; }

    function pieza(cfg, id) {
        return piezas(cfg).filter(function (p) { return p.id === id; })[0] || null;
    }

    /** Niveles de la partida. `niveles` del config es la edad del catálogo. */
    function niveles(cfg) { return (cfg && cfg.nivelesJuego) || []; }

    function nivel(cfg, i) { return niveles(cfg)[i] || null; }

    /**
     * Piezas del nivel i: { id, tipo, nombre, voz, pista, grupo, depende }.
     * `depende` solo queda si la pieza madre también está en el nivel (en el nivel 2 no hay manos,
     * así que nada depende del brazo).
     */
    function piezasNivel(cfg, i) {
        var n = nivel(cfg, i);
        if (!n) return [];
        var ids = n.piezas || [];
        return ids.map(function (id) {
            var def = pieza(cfg, id);
            if (!def) return null;
            var dep = def.depende && ids.indexOf(def.depende) >= 0 ? def.depende : null;
            return {
                id: def.id, tipo: def.tipo, nombre: def.nombre, voz: def.voz, pista: def.pista,
                grupo: def.grupo || def.id, depende: dep
            };
        }).filter(Boolean);
    }

    // ------------------------------------------------------------------ orientación

    /** Ángulo en grados dentro de 0..359. */
    function normalizar(g) {
        var n = Math.round(Number(g) || 0) % 360;
        return n < 0 ? n + 360 : n;
    }

    /** Giro de un paso (dir -1 izquierda, +1 derecha). */
    function girar(rot, dir, paso) {
        return normalizar((Number(rot) || 0) + (dir < 0 ? -1 : 1) * num(paso, 90));
    }

    /** Todas las piezas encajan derechas (0°). Ninguna tiene simetría de giro. */
    function orientacionValida(rot) { return normalizar(rot) === 0; }

    /** Pasos de giro que faltan para dejarla derecha por el camino más corto (con signo). */
    function pasosParaEnderezar(rot, paso) {
        var p = num(paso, 90);
        var r = normalizar(rot);
        if (r === 0) return 0;
        return r <= 180 ? -Math.round(r / p) : Math.round((360 - r) / p);
    }

    // ------------------------------------------------------------------ dependencias

    function disponible(def, colocadas) {
        return !def || !def.depende || !!(colocadas || {})[def.depende];
    }

    /** Piezas del nivel que todavía no se pueden mover porque falta su pieza madre. */
    function bloqueadas(lista, colocadas) {
        return (lista || []).filter(function (p) { return !colocadas[p.id] && !disponible(p, colocadas); }).map(function (p) { return p.id; });
    }

    // ------------------------------------------------------------------ soltar

    /**
     * datos.id         pieza soltada
     * datos.rot        orientación actual de la pieza (grados)
     * datos.destinos   [{ id, distancia, ocupado, disponible }] distancia del centro de la pieza a cada ranura
     * datos.radio      radio de acierto
     * datos.radioCasi  radio del "casi"
     * datos.requiere   id de la pieza madre (si la tiene)
     *
     * 1. Su ranura dentro del radio:
     *      ocupada → ocupado · sin su pieza madre → dependencia · girada → orientacion · si no → correcto.
     * 2. Otra ranura dentro del radio → otraPieza.
     * 3. Su ranura dentro del "casi" → casi (o dependencia, si todavía no puede ir).
     * 4. Si no, fuera.
     */
    function evaluar(datos) {
        var d = datos || {};
        var radio = num(d.radio, 64);
        var radioCasi = Math.max(radio, num(d.radioCasi, 150));
        var lista = (d.destinos || []).filter(function (m) { return m && isFinite(m.distancia); });
        var propio = lista.filter(function (m) { return m.id === d.id; })[0];
        if (propio && propio.distancia <= radio) {
            if (propio.ocupado) return { acierto: false, motivo: "ocupado", destino: propio.id };
            if (propio.disponible === false) return { acierto: false, motivo: "dependencia", destino: propio.id, requiere: d.requiere || null };
            if (!orientacionValida(d.rot)) return { acierto: false, motivo: "orientacion", destino: propio.id };
            return { acierto: true, motivo: "correcto", destino: propio.id };
        }
        var otro = null;
        lista.forEach(function (m) {
            if (m.id !== d.id && m.distancia <= radio && (!otro || m.distancia < otro.distancia)) otro = m;
        });
        if (otro) return { acierto: false, motivo: otro.ocupado ? "ocupado" : "otraPieza", destino: otro.id };
        if (propio && !propio.ocupado && propio.distancia <= radioCasi) {
            if (propio.disponible === false) return { acierto: false, motivo: "dependencia", destino: propio.id, requiere: d.requiere || null };
            return { acierto: false, motivo: "casi", destino: propio.id };
        }
        return { acierto: false, motivo: "fuera", destino: null };
    }

    /**
     * Ranura propia a la que la pieza ya se acerca: { id, fuerza 0..1, orientacionOk, disponible }.
     * Si está lejos, ocupada o no existe, null.
     */
    function cercano(id, rot, destinos, radioCerca) {
        var r = num(radioCerca, 215);
        var m = (destinos || []).filter(function (x) { return x.id === id; })[0];
        if (!m || m.ocupado || !(m.distancia <= r)) return null;
        return {
            id: m.id,
            fuerza: Math.max(0, Math.min(1, 1 - m.distancia / r)),
            distancia: m.distancia,
            orientacionOk: orientacionValida(rot),
            disponible: m.disponible !== false
        };
    }

    /**
     * Atracción magnética: fracción del camino hacia el centro que se corre la pieza. Solo actúa con
     * la pieza correcta, derecha y disponible; nunca llega a 1 (no se encaja sola mientras se arrastra).
     */
    function iman(distancia, radioIman, fuerza, orientacionOk, disponibleOk) {
        if (orientacionOk === false || disponibleOk === false) return 0;
        var r = num(radioIman, 105);
        var f = Math.max(0, Math.min(0.6, Number(fuerza) || 0.3));
        if (!(distancia < r)) return 0;
        var u = 1 - distancia / r;
        return f * u * u * (3 - 2 * u);
    }

    // ------------------------------------------------------------------ azar controlado

    function barajar(lista, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function elegir(lista, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        if (!lista || !lista.length) return null;
        return lista[Math.min(lista.length - 1, Math.floor(r() * lista.length))];
    }

    /** En qué compartimento de la bandeja aparece cada pieza: un compartimento por pieza, sin repetir. */
    function repartir(ids, nHuecos, rnd) {
        var huecos = barajar(Array.apply(null, { length: Math.max(nHuecos, ids.length) }).map(function (_, i) { return i; }), rnd);
        var out = {};
        ids.forEach(function (id, i) { out[id] = huecos[i]; });
        return out;
    }

    /**
     * Orientación inicial de cada pieza del nivel. `rotadas` piezas llegan giradas (90, 180 o 270);
     * las de `rotarPrimero` van primero en la lista. El resto, derechas.
     */
    function orientaciones(lista, n, giros, rnd) {
        var ids = (lista || []).map(function (p) { return p.id || p; });
        var out = {};
        ids.forEach(function (id) { out[id] = 0; });
        var cuantas = Math.max(0, Math.min(ids.length, (n && n.rotadas) | 0));
        if (!cuantas) return out;
        var primero = ((n && n.rotarPrimero) || []).filter(function (id) { return ids.indexOf(id) >= 0; });
        var resto = barajar(ids.filter(function (id) { return primero.indexOf(id) < 0; }), rnd);
        var opciones = (giros && giros.length ? giros : [90, 180, 270]).map(normalizar).filter(function (g) { return g !== 0; });
        if (!opciones.length) opciones = [90, 180, 270];
        primero.concat(resto).slice(0, cuantas).forEach(function (id) { out[id] = elegir(opciones, rnd); });
        return out;
    }

    /**
     * Apariencia de la partida: un valor de cada lista de `variantes`, empezando por el tipo de robot
     * (clásico o explorador: piezas de otra forma, mismas ranuras). Se sortea una vez al cargar y es
     * el mismo en los cuatro niveles; cambia al empezar una partida nueva.
     */
    function sortearVariante(cfg, rnd) {
        var v = (cfg && cfg.variantes) || {};
        var r = typeof rnd === "function" ? rnd : Math.random;
        var tipo = elegir(v.tipos, r) || { id: "clasico", nombre: "Robot Clásico" };
        return {
            tipo: tipo.id || tipo,
            tipoNombre: tipo.nombre || "",
            tipoSaludo: tipo.saludo || "",
            color: elegir(v.colores, r) || { id: "cielo", cuerpo: "#4dabf7", oscuro: "#1c6fb8", acento: "#ffd43b", articulacion: "#ffa94d" },
            cabeza: elegir(v.cabezas, r) || "redonda",
            visera: elegir(v.viseras, r) || "banda",
            mano: elegir(v.manos, r) || "pinza",
            pie: elegir(v.pies, r) || "bota",
            antena: elegir(v.antenas, r) || "bola",
            modulo: elegir(v.modulos, r) || "rayo",
            lab: elegir(v.laboratorios, r) || { id: "turquesa", luz: "#3bdcff", pared: "#22356e", pared2: "#1a2858", panel: "#2c4486" },
            paisaje: elegir(v.paisajes, r) || "ciudad"
        };
    }

    // ------------------------------------------------------------------ progreso

    /** Frase de una lista que no se repite seguida. */
    function frase(lista, turno) {
        if (!lista || !lista.length) return "¡Muy bien!";
        if (typeof lista === "string") return lista;
        return lista[Math.abs(turno | 0) % lista.length];
    }

    function completo(colocadas, lista) {
        var ids = (lista || []).map(function (p) { return p.id || p; });
        return ids.length > 0 && ids.every(function (id) { return !!(colocadas || {})[id]; });
    }

    /**
     * ¿Al colocar `id` quedó completo su grupo (brazo + mano, pierna + pie, cabeza + antena)?
     * Devuelve el grupo, o null si aún le faltan piezas. Un grupo de una sola pieza también cuenta.
     */
    function grupoCompletado(id, colocadas, lista) {
        var def = (lista || []).filter(function (p) { return p.id === id; })[0];
        if (!def) return null;
        var g = def.grupo || def.id;
        var miembros = lista.filter(function (p) { return (p.grupo || p.id) === g; });
        return miembros.every(function (p) { return !!colocadas[p.id]; }) ? g : null;
    }

    /** Errores del config que romperían la partida (lista vacía = válido). */
    function validar(cfg) {
        var errores = [];
        var ps = piezas(cfg);
        var vistas = {};
        ps.forEach(function (p) {
            if (!p.id) errores.push("Pieza sin id");
            if (TIPOS.indexOf(p.id) < 0) errores.push("Pieza sin dibujo ni ranura: " + p.id);
            if (vistas[p.id]) errores.push("Pieza repetida: " + p.id);
            vistas[p.id] = true;
            if (!p.nombre) errores.push("Pieza sin nombre: " + p.id);
            if (p.depende && !pieza(cfg, p.depende)) errores.push("Pieza " + p.id + " depende de una pieza que no existe");
        });
        if (cfg && cfg.demo && !pieza(cfg, cfg.demo.pieza)) errores.push("La pieza de la demo no existe");
        var ns = niveles(cfg);
        if (ns.length !== 4) errores.push("Deben ser exactamente cuatro niveles");
        var antes = 0;
        ns.forEach(function (n, i) {
            var ids = n.piezas || [];
            if (ids.length <= antes) errores.push("Nivel " + (i + 1) + ": debe tener más piezas que el anterior");
            antes = ids.length;
            var unicas = {};
            ids.forEach(function (id) {
                if (!pieza(cfg, id)) errores.push("Nivel " + (i + 1) + ": pieza desconocida " + id);
                if (unicas[id]) errores.push("Nivel " + (i + 1) + ": pieza repetida " + id);
                unicas[id] = true;
            });
            if ((n.rotadas | 0) > ids.length) errores.push("Nivel " + (i + 1) + ": más piezas giradas que piezas");
            if ((n.rotadas | 0) > 0 && !n.giro) errores.push("Nivel " + (i + 1) + ": hay piezas giradas pero no botones de giro");
            if (!n.zoe || !n.listo) errores.push("Nivel " + (i + 1) + ": faltan textos");
        });
        return errores;
    }

    global.ReglasRobot = {
        TIPOS: TIPOS,
        pieza: pieza,
        niveles: niveles,
        nivel: nivel,
        piezasNivel: piezasNivel,
        normalizar: normalizar,
        girar: girar,
        orientacionValida: orientacionValida,
        pasosParaEnderezar: pasosParaEnderezar,
        disponible: disponible,
        bloqueadas: bloqueadas,
        evaluar: evaluar,
        cercano: cercano,
        iman: iman,
        barajar: barajar,
        elegir: elegir,
        repartir: repartir,
        orientaciones: orientaciones,
        sortearVariante: sortearVariante,
        frase: frase,
        completo: completo,
        grupoCompletado: grupoCompletado,
        validar: validar
    };
})(typeof window !== "undefined" ? window : global);
