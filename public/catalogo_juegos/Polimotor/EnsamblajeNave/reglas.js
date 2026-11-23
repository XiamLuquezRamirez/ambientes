/**
 * ReglasNave — decisiones puras de "El Ensamblaje de la Nave" (sin DOM, sin Phaser, sin audio).
 *
 * La respuesta correcta vive en los datos: cada pieza tiene un `id` y cada contorno del plano
 * lleva el `id` de la pieza que le corresponde. La escena solo mide distancias; aquí se decide
 * si el soltado es un encaje, un "casi", otra pieza o un soltado fuera del plano.
 */
(function (global) {
    "use strict";

    var TIPOS = ["cabina", "cono", "antena", "propulsor", "panel-izq", "panel-der", "aleta-izq", "aleta-der", "turbina-izq", "turbina-der"];
    var NAVES = ["chispa", "cometa", "gran"];

    function num(v, porDefecto) {
        var n = Number(v);
        return isFinite(n) && n > 0 ? n : porDefecto;
    }

    function piezas(cfg) { return (cfg && cfg.piezas) || []; }

    function pieza(cfg, id) {
        return piezas(cfg).filter(function (p) { return p.id === id; })[0] || null;
    }

    /** Niveles de la partida (una nave por nivel). `niveles` del config es la edad del catálogo. */
    function niveles(cfg) { return (cfg && cfg.nivelesJuego) || []; }

    function nivel(cfg, i) { return niveles(cfg)[i] || null; }

    /**
     * Piezas del nivel i con su destino en la nave: { id, nombre, voz, pista, x, y, rot }.
     * x, y son relativos al centro de la nave y ya vienen multiplicados por la escala del nivel.
     */
    function piezasNivel(cfg, i) {
        var n = nivel(cfg, i);
        if (!n) return [];
        var k = num(n.escala, 1);
        return (n.piezas || []).map(function (s) {
            var def = pieza(cfg, s.id);
            if (!def) return null;
            return {
                id: def.id, nombre: def.nombre, voz: def.voz, pista: def.pista,
                x: (Number(s.x) || 0) * k, y: (Number(s.y) || 0) * k, rot: Number(s.rot) || 0
            };
        }).filter(Boolean);
    }

    /**
     * Radios en píxeles de diseño a partir de la separación real entre contornos.
     * acierto: el centro de la pieza tiene que quedar así de cerca del centro del contorno. Nunca
     *          pasa del 45 % de la separación: dos contornos vecinos no se disputan una pieza.
     * casi:    la pieza correcta quedó cerca pero no lo bastante ("¡Muy cerca!").
     * cerca:   desde aquí el contorno correcto empieza a brillar.
     * iman:    dentro de este radio la pieza se siente atraída (un poco) hacia el centro.
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
        var acierto = Math.min(num(j.radioAcierto, 58), minD * 0.45);
        var casi = Math.max(acierto + 30, num(j.radioCasi, 150));
        var cerca = Math.max(casi, num(j.radioCerca, 200));
        var iman = Math.max(acierto, Math.min(num(j.radioIman, 95), casi));
        return { acierto: acierto, casi: casi, cerca: cerca, iman: iman, separacion: minD };
    }

    /**
     * datos.id        pieza soltada
     * datos.destinos  [{ id, distancia, ocupado }] distancia del centro de la pieza a cada contorno
     * datos.radio     radio de acierto
     * datos.radioCasi radio del "casi"
     *
     * 1. Su contorno dentro del radio y libre → correcto (aunque otro quede un poco más cerca:
     *    el niño apuntó bien y se le premia).
     * 2. Otro contorno dentro del radio → otraPieza ("busca el lugar con la misma forma").
     * 3. Su contorno dentro del "casi" → casi ("¡Muy cerca!").
     * 4. Si no, fuera.
     */
    function evaluar(datos) {
        var d = datos || {};
        var radio = num(d.radio, 58);
        var radioCasi = Math.max(radio, num(d.radioCasi, 150));
        var lista = (d.destinos || []).filter(function (m) { return m && isFinite(m.distancia); });
        var propio = lista.filter(function (m) { return m.id === d.id; })[0];
        if (propio && propio.distancia <= radio) {
            if (propio.ocupado) return { acierto: false, motivo: "ocupado", destino: propio.id };
            return { acierto: true, motivo: "correcto", destino: propio.id };
        }
        var otro = null;
        lista.forEach(function (m) {
            if (m.id !== d.id && m.distancia <= radio && (!otro || m.distancia < otro.distancia)) otro = m;
        });
        if (otro) return { acierto: false, motivo: "otraPieza", destino: otro.id };
        if (propio && !propio.ocupado && propio.distancia <= radioCasi) {
            return { acierto: false, motivo: "casi", destino: propio.id };
        }
        return { acierto: false, motivo: "fuera", destino: null };
    }

    /** Contorno propio al que la pieza ya se acerca (para que brille). Si no, null. */
    function cercano(id, destinos, radioCerca) {
        var r = num(radioCerca, 200);
        var m = (destinos || []).filter(function (x) { return x.id === id; })[0];
        if (!m || m.ocupado || !(m.distancia <= r)) return null;
        // 0 en el borde del radio … 1 encima del contorno
        return { id: m.id, fuerza: Math.max(0, Math.min(1, 1 - m.distancia / r)), distancia: m.distancia };
    }

    /**
     * Atracción magnética suave: fracción del camino hacia el centro que se corre la pieza
     * cuando está dentro de radioIman. Nunca es 1: la pieza no se encaja sola mientras se arrastra.
     */
    function iman(distancia, radioIman, fuerza) {
        var r = num(radioIman, 95);
        var f = Math.max(0, Math.min(0.6, Number(fuerza) || 0.3));
        if (!(distancia < r)) return 0;
        var u = 1 - distancia / r;
        return f * u * u * (3 - 2 * u);
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

    /** En qué hueco de la bandeja aparece cada pieza: cambia en cada partida. */
    function repartir(ids, nHuecos, rnd) {
        var huecos = barajar(Array.apply(null, { length: nHuecos }).map(function (_, i) { return i; }), rnd);
        var out = {};
        ids.forEach(function (id, i) { out[id] = huecos[i % huecos.length]; });
        return out;
    }

    /** Frase de acierto que no se repite seguida. */
    function frase(lista, turno) {
        if (!lista || !lista.length) return "¡Muy bien!";
        return lista[Math.abs(turno | 0) % lista.length];
    }

    /** ¿Están colocadas todas las piezas de la lista? */
    function completo(colocadas, lista) {
        var ids = (lista || []).map(function (p) { return p.id || p; });
        return ids.length > 0 && ids.every(function (id) { return !!(colocadas || {})[id]; });
    }

    /** Errores del config que romperían la partida (lista vacía = válido). */
    function validar(cfg) {
        var errores = [];
        var ps = piezas(cfg);
        if (ps.length < 4) errores.push("Faltan piezas");
        var vistas = {};
        ps.forEach(function (p) {
            if (!p.id) errores.push("Pieza sin id");
            if (TIPOS.indexOf(p.id) < 0) errores.push("Pieza sin dibujo: " + p.id);
            if (vistas[p.id]) errores.push("Pieza repetida: " + p.id);
            vistas[p.id] = true;
            if (!p.nombre) errores.push("Pieza sin nombre visible: " + p.id);
        });
        if (cfg && cfg.demo && !pieza(cfg, cfg.demo.pieza)) errores.push("La pieza de la demo no existe");
        var ns = niveles(cfg);
        if (!ns.length) errores.push("No hay niveles de juego");
        var antes = 0;
        ns.forEach(function (n, i) {
            var ids = (n.piezas || []).map(function (s) { return s.id; });
            if (ids.length < 3 || ids.length > 6) errores.push("Nivel " + (i + 1) + ": debe tener de 3 a 6 piezas");
            if (ids.length <= antes) errores.push("Nivel " + (i + 1) + ": debe tener más piezas que el anterior");
            antes = ids.length;
            if (NAVES.indexOf(n.nave) < 0) errores.push("Nivel " + (i + 1) + ": nave sin dibujo " + n.nave);
            var unicas = {};
            ids.forEach(function (id) {
                if (!pieza(cfg, id)) errores.push("Nivel " + (i + 1) + ": pieza desconocida " + id);
                if (unicas[id]) errores.push("Nivel " + (i + 1) + ": pieza repetida " + id);
                unicas[id] = true;
            });
            if (!n.zoe || !n.listo) errores.push("Nivel " + (i + 1) + ": faltan textos");
        });
        return errores;
    }

    global.ReglasNave = {
        TIPOS: TIPOS,
        NAVES: NAVES,
        pieza: pieza,
        niveles: niveles,
        nivel: nivel,
        piezasNivel: piezasNivel,
        radios: radios,
        evaluar: evaluar,
        cercano: cercano,
        iman: iman,
        barajar: barajar,
        repartir: repartir,
        frase: frase,
        completo: completo,
        validar: validar
    };
})(typeof window !== "undefined" ? window : global);
