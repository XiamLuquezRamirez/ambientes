/**
 * ReglasAnillos — reglas puras de "El Lanzador de Anillos de Zeus" (window.ReglasAnillos y module.exports).
 *
 * No dibuja ni suena: interpreta el gesto del niño y decide si el anillo queda ensartado.
 *
 * Gesto (en píxeles de pantalla, y crece hacia abajo):
 *   { dx, dy, ms, vel, dxFin, dyFin }
 *     dx, dy       desplazamiento total desde que tomó el anillo hasta que lo soltó
 *     ms           duración del arrastre
 *     vel          rapidez de los últimos ~120 ms (px/s)
 *     dxFin, dyFin dirección de los últimos ~120 ms (la dirección final del lanzamiento)
 *
 * Geometría (la entrega la escena, en unidades del mundo; la cámara mira hacia -z, así que "arriba" en la
 * pantalla es -z en el suelo):
 *   { salida: {x, z}, cono: {x, z}, anguloCono, alto }
 *     anguloCono   ángulo en pantalla desde el anillo hasta la punta del cono (0 = recto hacia arriba,
 *                  positivo = a la derecha)
 *     alto         alto de la escena en píxeles (normaliza distancias y rapidez)
 *
 * Cómo decide (permisivo, para 3-4 años):
 *   1. Solo es lanzamiento si el dedo subió al menos `minSubida` × alto.
 *   2. Fuerza = mezcla de lo que recorrió y de la rapidez final. Dentro de [fuerzaMin, fuerzaMax] el anillo
 *      llega justo al cono (meseta amplia); por debajo se queda corto, por encima se pasa.
 *   3. Dirección: el error de ángulo respecto al cono se reduce con `correccionAngulo` (el sistema corrige un
 *      poco la puntería) y se lleva al suelo.
 *   4. El punto natural de caída se compara con la zona de recepción del mástil (`radioCaptura`, que crece con
 *      cada fallo seguido): si cae dentro, la trayectoria se corrige hasta el mástil y queda ensartado.
 */
(function (global) {
    "use strict";

    var DEF = {
        minSubida: 0.05,
        fuerzaMin: 0.4,
        fuerzaMax: 1.8,
        radioCaptura: 1.0,
        radioCapturaPorFallo: 0.16,
        radioCapturaMax: 1.5,
        correccionAngulo: 0.4
    };

    function num(v, d) {
        var n = Number(v);
        return isFinite(n) ? n : d;
    }

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    /** Parámetros del juego con sus valores por defecto. */
    function parametros(cfg) {
        var j = (cfg && cfg.juego) || {};
        var p = {};
        Object.keys(DEF).forEach(function (k) { p[k] = num(j[k], DEF[k]); });
        return p;
    }

    /** Ángulo en pantalla de un desplazamiento (0 = hacia arriba, positivo = a la derecha). */
    function anguloPantalla(dx, dy) {
        return Math.atan2(dx, -dy);
    }

    function normalizarAngulo(a) {
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        return a;
    }

    /** ¿El gesto cuenta como lanzamiento? Basta con que el dedo haya subido un poco. */
    function esLanzamiento(gesto, alto, cfg) {
        if (!gesto) return false;
        var p = parametros(cfg);
        var h = Math.max(200, num(alto, 600));
        var sube = -num(gesto.dy, 0);
        var subeFin = -num(gesto.dyFin, 0);
        // subió lo suficiente en total, o al menos lo soltó con un golpe rápido hacia arriba
        if (sube >= p.minSubida * h) return true;
        return subeFin > 0 && sube > p.minSubida * h * 0.5 && num(gesto.vel, 0) > h * 0.9;
    }

    /** Fuerza del lanzamiento (≈ 1 en un deslizamiento normal). */
    function fuerza(gesto, alto) {
        var h = Math.max(200, num(alto, 600));
        var largo = Math.hypot(num(gesto.dx, 0), num(gesto.dy, 0)) / h;
        var rapidez = num(gesto.vel, 0) / h;
        return 0.55 * Math.min(largo / 0.28, 2) + 0.45 * Math.min(rapidez / 1.6, 2.2);
    }

    /** Factor de alcance según la fuerza: meseta en 1 (llega al cono) entre fuerzaMin y fuerzaMax. */
    function alcance(f, cfg) {
        var p = parametros(cfg);
        if (f < p.fuerzaMin) return 0.38 + 0.5 * clamp(f / p.fuerzaMin, 0, 1);
        if (f > p.fuerzaMax) return Math.min(1.6, 1.12 + 0.45 * (f - p.fuerzaMax));
        return 1 + (f - 1) * 0.05;
    }

    /** Dirección del lanzamiento: mitad la dirección total, mitad la del final del arrastre. */
    function direccionGesto(gesto) {
        var a = anguloPantalla(num(gesto.dx, 0), num(gesto.dy, -1));
        var dxF = num(gesto.dxFin, 0);
        var dyF = num(gesto.dyFin, 0);
        if (Math.hypot(dxF, dyF) < 4 || dyF >= 0) return a;
        var b = anguloPantalla(dxF, dyF);
        return a + normalizarAngulo(b - a) * 0.5;
    }

    /** Radio de la zona de recepción del mástil: crece un poco con cada fallo seguido (nunca castiga). */
    function radioCaptura(fallosSeguidos, cfg) {
        var p = parametros(cfg);
        return Math.min(p.radioCapturaMax, p.radioCaptura + p.radioCapturaPorFallo * Math.max(0, num(fallosSeguidos, 0)));
    }

    /**
     * Decide el lanzamiento.
     * → { lanza, acierto, fuerza, alcance, errorAngulo, natural: {x, z}, destino: {x, z}, radio, motivo }
     *   motivo: "acierto" | "corto" | "largo" | "lado" | "sinLanzar"
     */
    function evaluar(gesto, geo, cfg, fallosSeguidos) {
        var p = parametros(cfg);
        if (!esLanzamiento(gesto, geo && geo.alto, cfg)) {
            return { lanza: false, acierto: false, motivo: "sinLanzar" };
        }
        var S = geo.salida;
        var C = geo.cono;
        var f = fuerza(gesto, geo.alto);
        var k = alcance(f, cfg);
        var err = normalizarAngulo(direccionGesto(gesto) - num(geo.anguloCono, 0));
        var errMundo = err * p.correccionAngulo;
        // dirección en el suelo desde la salida hacia el cono (0 = hacia -z)
        var base = Math.atan2(C.x - S.x, -(C.z - S.z));
        var d = Math.hypot(C.x - S.x, C.z - S.z);
        var th = base + errMundo;
        var natural = { x: S.x + Math.sin(th) * d * k, z: S.z - Math.cos(th) * d * k };
        var r = radioCaptura(fallosSeguidos, cfg);
        var lejos = Math.hypot(natural.x - C.x, natural.z - C.z);
        var acierto = lejos <= r;
        var motivo = "acierto";
        if (!acierto) {
            var lateral = Math.abs(Math.sin(errMundo)) * d * k;
            if (lateral > r * 0.8) motivo = "lado";
            else motivo = k < 1 ? "corto" : "largo";
        }
        return {
            lanza: true,
            acierto: acierto,
            fuerza: f,
            alcance: k,
            errorAngulo: err,
            natural: natural,
            destino: acierto ? { x: C.x, z: C.z } : natural,
            radio: r,
            motivo: motivo
        };
    }

    /**
     * Punto de caída de un fallo, apartado del cono, de su base y de Zeus para que el anillo nunca los
     * atraviese. obstaculos: [{x, z, r}]
     */
    function caidaSegura(p, obstaculos, margen) {
        var q = { x: p.x, z: p.z };
        (obstaculos || []).forEach(function (o) {
            var dx = q.x - o.x;
            var dz = q.z - o.z;
            var dist = Math.hypot(dx, dz);
            var minimo = o.r + (margen || 0);
            if (dist < minimo) {
                if (dist < 1e-4) {
                    dx = 0;
                    dz = 1;
                    dist = 1;
                }
                q.x = o.x + dx / dist * minimo;
                q.z = o.z + dz / dist * minimo;
            }
        });
        return q;
    }

    /** Distancia mínima en el suelo entre el segmento A→B y el punto P. */
    function distanciaSegmento(A, B, P) {
        var vx = B.x - A.x;
        var vz = B.z - A.z;
        var l2 = vx * vx + vz * vz;
        var t = l2 > 0 ? clamp(((P.x - A.x) * vx + (P.z - A.z) * vz) / l2, 0, 1) : 0;
        return Math.hypot(A.x + vx * t - P.x, A.z + vz * t - P.z);
    }

    /** Alto (centro) del anillo número k (0, 1, 2) apilado en el cono. */
    function alturaApilado(k, cono) {
        var c = cono || {};
        var y0 = num(c.y0, 0.16);
        var h = num(c.alto, 1.6);
        var rb = num(c.radioBase, 0.5);
        var rt = num(c.radioPunta, 0.07);
        var ri = num(c.radioInterior, 0.26);
        var tubo = num(c.tubo, 0.1);
        // donde el cono mide lo mismo que el agujero del anillo
        var u = clamp((rb - ri) / Math.max(0.01, rb - rt), 0, 1);
        var y1 = y0 + h * u + tubo * 0.35;
        return y1 + k * tubo * 1.9;
    }

    /** Texto con {n} reemplazado. */
    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) { return datos && datos[k] != null ? datos[k] : m; });
    }

    /** Progreso: tres indicadores que se encienden en orden de acierto. */
    function progreso(ensartados, total) {
        var t = Math.max(1, num(total, 3));
        var n = clamp(num(ensartados, 0), 0, t);
        var marcas = [];
        for (var i = 0; i < t; i++) marcas.push(i < n);
        return { hechas: n, total: t, marcas: marcas, completo: n >= t };
    }

    /** Siguiente anillo pendiente (para la ayuda): el primero sin ensartar. */
    function pendiente(anillos, ensartados) {
        var lista = anillos || [];
        for (var i = 0; i < lista.length; i++) {
            if (!ensartados || ensartados.indexOf(lista[i].id) < 0) return lista[i].id;
        }
        return null;
    }

    /** Revisa el config: devuelve una lista de problemas (vacía si está bien). */
    function revisarJuego(cfg) {
        var errores = [];
        if (!cfg) return ["sin config"];
        var an = cfg.anillos || [];
        if (an.length !== 3) errores.push("deben ser 3 anillos");
        var ids = {};
        an.forEach(function (a) {
            if (!a.id) errores.push("anillo sin id");
            if (ids[a.id]) errores.push("id repetido: " + a.id);
            ids[a.id] = true;
            if (!/^#[0-9a-f]{6}$/i.test(a.color || "")) errores.push("color inválido en " + a.id);
            if (["rayas", "puntos", "zigzag"].indexOf(a.dibujo) < 0) errores.push("dibujo inválido en " + a.id);
        });
        if (cfg.demo && cfg.demo.anillo && !ids[cfg.demo.anillo]) errores.push("la demo usa un anillo que no existe");
        var rondas = cfg.rondas || [];
        if (rondas.length < 1) errores.push("faltan los niveles (rondas)");
        rondas.forEach(function (r, i) {
            if (!r.cono || !isFinite(Number(r.cono.z)) || !r.zeus || !isFinite(Number(r.zeus.z))) errores.push("nivel " + (i + 1) + " sin cono o sin Zeus");
            if (i > 0 && rondas[i - 1].cono && r.cono && !(Number(r.cono.z) < Number(rondas[i - 1].cono.z))) errores.push("el nivel " + (i + 1) + " debe tener el cono más lejos");
        });
        var t = cfg.textos || {};
        ["instruccionZeus", "instruccionZoe", "casi", "final", "botonComenzar"].forEach(function (k) {
            if (!t[k]) errores.push("falta el texto " + k);
        });
        var p = parametros(cfg);
        if (!(p.fuerzaMin < 1 && p.fuerzaMax > 1)) errores.push("la meseta de fuerza debe contener 1");
        if (!(p.radioCaptura > 0 && p.radioCapturaMax >= p.radioCaptura)) errores.push("radios de captura inválidos");
        if (!(cfg.niveles || []).some(function (n) { return n.edad === "3-4 años"; })) errores.push("falta el nivel 3-4 años");
        return errores;
    }

    var api = {
        parametros: parametros,
        anguloPantalla: anguloPantalla,
        esLanzamiento: esLanzamiento,
        fuerza: fuerza,
        alcance: alcance,
        direccionGesto: direccionGesto,
        radioCaptura: radioCaptura,
        evaluar: evaluar,
        caidaSegura: caidaSegura,
        distanciaSegmento: distanciaSegmento,
        alturaApilado: alturaApilado,
        progreso: progreso,
        pendiente: pendiente,
        plantilla: plantilla,
        revisarJuego: revisarJuego
    };

    global.ReglasAnillos = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
