/**
 * ReglasLluvia — geometría y decisión de "La lluvia de colores y las flores del jardín" (window.ReglasLluvia).
 *
 * Puro (sin DOM ni Phaser), exportable a Node para las pruebas:
 *   - generarJardin(def, juego, rnd): reparte al azar las nubes y flores de un nivel (posición horizontal, largo del
 *     recorrido, colores, tipo de flor, adornos y mariposas) y lo valida. Cada carril es VERTICAL: la nube y su
 *     flor comparten la misma x, así que nunca hace falta un trazo diagonal. Si tras `intentos` no sale un reparto
 *     válido, usa uno parejo (siempre jugable, nunca un bucle infinito).
 *   - seguir(carril, est, x, y, juego): el progreso `s` (píxeles bajados desde la nube) solo avanza si el dedo está
 *     dentro de la tolerancia horizontal del carril y apenas por delante del progreso actual (ventana corta). Un
 *     movimiento horizontal no avanza; salirse del carril marca `fuera` sin perder lo hecho; subir no resta.
 *   - soltar(carril, est, juego): al levantar el dedo, el trazo vale solo si llegó a la zona de la flor. Si no,
 *     es un reintento amable: el progreso vuelve a 0 y la nube queda disponible.
 *
 * Mundo de diseño 1600 × 900. Y crece hacia abajo.
 */
(function (global) {
    "use strict";

    // Franja donde van los carriles: cabe en 4:3 (x visible ≈ 200..1400) y deja libres los botones de las esquinas.
    var ZONA = { x0: 330, x1: 1270 };
    // Alturas fijas del jardín.
    var SUELO = 800;          // base de los tallos
    var FIN = 656;            // fin del carril: la cabeza de la flor triste
    var NUBE_SOBRE = 58;      // el carril empieza bajo la nube: centro de la nube = y0 - NUBE_SOBRE
    var NUBE_MIN_Y = 150;     // centro de nube más alto (deja aire para la pista de arriba)
    var NUBE_ANCHO = 200;     // ancho de la nube grande a escala 1
    var FLOR_ANCHO = 170;     // ancho de la flor abierta a escala 1

    var COLORES_FLOR = ["#ff6b9d", "#ffa94d", "#ffd43b", "#b197fc", "#ff8787", "#74c0fc", "#f783ac", "#63e6be"];
    var COLORES_NUBE = ["#d0ebff", "#e5dbff", "#ffdeeb", "#d3f9d8", "#fff3bf", "#c5f6fa", "#ffe8cc"];
    var TIPOS_FLOR = ["margarita", "tulipan", "girasol", "campanita", "cosmos"];
    var ADORNOS = ["hongo", "piedras", "arbusto", "mariquita", "caracol", "florecitas", "hierba"];

    function lerp(a, b, u) { return a + (b - a) * u; }

    /** Generador pseudoaleatorio con semilla (para pruebas); sin semilla usa Math.random. */
    function azar(semilla) {
        if (semilla == null) return Math.random;
        var s = (semilla >>> 0) || 1;
        return function () {
            s ^= s << 13; s >>>= 0;
            s ^= s >>> 17;
            s ^= s << 5; s >>>= 0;
            return (s % 1000000) / 1000000;
        };
    }

    function rango(r, rnd, def) {
        if (Array.isArray(r)) return lerp(Number(r[0]), Number(r[1]), rnd());
        var n = Number(r);
        return isFinite(n) ? n : def;
    }

    function barajar(lista, rnd) {
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

    // ------------------------------------------------------------------ reparto horizontal

    /** n posiciones x al azar, ordenadas, con separación mínima `sep` dentro de [x0, x1]. null si no cabe. */
    function sortearXs(n, sep, x0, x1, rnd, intentos) {
        if (n <= 0) return [];
        var holgura = (x1 - x0) - sep * (n - 1);
        if (holgura < 0) return null;
        for (var k = 0; k < (intentos || 60); k++) {
            // reparte la holgura en n + 1 huecos al azar: siempre respeta la separación y la zona
            var cortes = [];
            for (var i = 0; i < n; i++) cortes.push(rnd() * holgura);
            cortes.sort(function (a, b) { return a - b; });
            var xs = cortes.map(function (c, i) { return Math.round(x0 + c + i * sep); });
            if (xs[0] >= x0 && xs[n - 1] <= x1) return xs;
        }
        return null;
    }

    /** Reparto parejo de respaldo, centrado en la zona. */
    function xsParejas(n, x0, x1) {
        if (n === 1) return [Math.round((x0 + x1) / 2)];
        var paso = (x1 - x0) / (n - 1);
        var xs = [];
        for (var i = 0; i < n; i++) xs.push(Math.round(x0 + paso * i));
        return xs;
    }

    // ------------------------------------------------------------------ generación de un nivel

    function escalaNube(def, sep) {
        var k = num(def.escalaNube, 1);
        return Math.min(k, (sep - 26) / NUBE_ANCHO);
    }

    function escalaFlor(def, sep) {
        var k = num(def.escalaFlor, 1);
        return Math.min(k, (sep - 24) / FLOR_ANCHO);
    }

    /** Largos de los recorridos del nivel; si el nivel pide variedad (`difLargo`), los largos no salen parejos. */
    function sortearLargos(n, def, rnd) {
        var r = def.largo || [300, 340];
        var min = Number(r[0]) || 300, max = Number(r[1]) || min;
        var dif = num(def.difLargo, 0);
        var largos = [];
        for (var k = 0; k < 30; k++) {
            largos = [];
            for (var i = 0; i < n; i++) largos.push(Math.round(lerp(min, max, rnd())));
            if (n < 2 || dif <= 0) break;
            var hi = Math.max.apply(null, largos), lo = Math.min.apply(null, largos);
            if (hi - lo >= dif) break;
        }
        if (n >= 2 && dif > 0) {
            var a = Math.max.apply(null, largos), b = Math.min.apply(null, largos);
            if (a - b < dif) {
                // forzar la variedad: un recorrido largo y otro corto
                largos[Math.floor(rnd() * n)] = max;
                var j = largos.indexOf(max) === 0 ? n - 1 : 0;
                largos[j] = min;
            }
        }
        return largos;
    }

    /** Adornos del césped en los huecos entre flores, sin pisarse entre sí ni con las flores. */
    function sortearAdornos(def, carriles, rnd) {
        var n = Math.max(0, num(def.adornos, 0));
        var tipos = barajar(def.tiposAdorno || ADORNOS, rnd);
        var lista = [];
        var libreFlor = num(def.libreFlor, 100);
        for (var k = 0; k < n * 25 && lista.length < n; k++) {
            var x = Math.round(lerp(170, 1430, rnd()));
            var lejosFlor = carriles.every(function (c) { return Math.abs(c.x - x) >= libreFlor; });
            var lejosAdorno = lista.every(function (a) { return Math.abs(a.x - x) >= 95; });
            if (!lejosFlor || !lejosAdorno) continue;
            lista.push({
                tipo: tipos[lista.length % tipos.length],
                x: x,
                y: Math.round(lerp(800, 826, rnd())),
                escala: Math.round(lerp(0.85, 1.1, rnd()) * 100) / 100,
                espejo: rnd() < 0.5
            });
        }
        return lista.sort(function (a, b) { return a.y - b.y; });
    }

    function sortearMariposas(def, rnd) {
        var n = Math.max(0, num(def.mariposas, 0));
        var colores = barajar(["#ff8cc6", "#ffd43b", "#74c0fc", "#b197fc", "#ffa94d", "#63e6be"], rnd);
        var lista = [];
        for (var i = 0; i < n; i++) {
            lista.push({
                color: colores[i % colores.length],
                x: Math.round(lerp(220, 1380, rnd())),
                y: Math.round(lerp(330, 560, rnd())),
                fase: Math.round(rnd() * 628) / 100,
                vel: Math.round(lerp(0.7, 1.25, rnd()) * 100) / 100
            });
        }
        return lista;
    }

    // ------------------------------------------------------------------ curvas (niveles 3 y 4)

    // Límites visibles para la panza de una curva (cabe en 4:3, x visible ≈ 200..1400).
    var VISIBLE = { x0: 235, x1: 1365 };

    function arcoBase(u) { return (1 - Math.cos(2 * Math.PI * u)) / 2; }

    /**
     * Formas de curva en u ∈ [0, 1] (0 = nube, 1 = flor), crudas (sin normalizar). Todas salen y llegan derechas
     * (pendiente 0 en los extremos): la nube y la flor quedan una encima de la otra y el camino siempre baja.
     *   arco          una panza en el medio
     *   ganchoAlto    una panza cerca de la nube
     *   ganchoBajo    una panza cerca de la flor
     *   ese           ida y vuelta
     *   eseLarga      ida corta arriba y vuelta larga abajo
     *   eseAlta       ida larga arriba y vuelta corta abajo
     */
    var FORMAS_CRUDAS = {
        arco: arcoBase,
        ganchoAlto: function (u) { return arcoBase(u) * (1.7 - 1.4 * u); },
        ganchoBajo: function (u) { return arcoBase(u) * (0.3 + 1.4 * u); },
        ese: function (u) { return Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u); },
        eseLarga: function (u) { return Math.sin(2 * Math.PI * Math.pow(u, 0.8)) * Math.sin(Math.PI * u); },
        eseAlta: function (u) { return -Math.sin(2 * Math.PI * Math.pow(1 - u, 0.8)) * Math.sin(Math.PI * u); }
    };
    // Cuánto de la panza usa cada forma (todas igual por ahora; se deja para ajustar una forma difícil).
    var FACTOR_FORMA = {};

    // Normaliza cada forma para que su punto más lejano valga 1 y guarda su rango [mín, máx].
    var FORMAS = {}, RANGOS = {};
    Object.keys(FORMAS_CRUDAS).forEach(function (k) {
        var f = FORMAS_CRUDAS[k], mx = 0, lo = 0, hi = 0, i;
        for (i = 0; i <= 400; i++) mx = Math.max(mx, Math.abs(f(i / 400)));
        FORMAS[k] = function (u) { return f(u) / mx; };
        for (i = 0; i <= 400; i++) { var v = f(i / 400) / mx; lo = Math.min(lo, v); hi = Math.max(hi, v); }
        RANGOS[k] = [lo, hi];
    });

    function forma(tipo, u) { return (FORMAS[tipo] || FORMAS.arco)(Math.max(0, Math.min(1, u))); }
    function rangoForma(tipo) { return RANGOS[tipo] || RANGOS.arco; }

    function uEn(c, y) { return Math.max(0, Math.min(1, (y - c.y0) / c.largo)); }

    /** x del eje del carril a la altura y (recto: siempre c.x). */
    function xEn(c, y) {
        if (!c.curva || !c.curva.amp) return c.x;
        return c.x + c.curva.amp * forma(c.curva.tipo, uEn(c, y));
    }

    /** Pendiente dx/dy del eje a la altura y (diferencia central). */
    function pendiente(c, y) {
        if (!c.curva || !c.curva.amp) return 0;
        var u = uEn(c, y), h = 0.002;
        var a = Math.max(0, u - h), b = Math.min(1, u + h);
        return c.curva.amp * (forma(c.curva.tipo, b) - forma(c.curva.tipo, a)) / ((b - a) * c.largo);
    }

    /** Distancia (casi perpendicular) del punto al eje del carril. */
    function distEje(c, x, y) {
        var yy = Math.max(c.y0, Math.min(c.y1, y));
        var m = pendiente(c, yy);
        return Math.abs(x - xEn(c, yy)) / Math.sqrt(1 + m * m);
    }

    /** Distancia horizontal mínima entre dos carriles en la franja de alturas que comparten. */
    function separacionMinima(a, b) {
        var y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y1, b.y1), d = Infinity;
        for (var y = y0; y <= y1; y += 6) d = Math.min(d, Math.abs(xEn(b, y) - xEn(a, y)));
        return d;
    }

    /** Panza máxima que cabe en la pantalla para esa forma, sentido y posición. */
    function ampMaxima(tipo, signo, x) {
        var r = rangoForma(tipo), a = Infinity;
        [r[0], r[1]].forEach(function (f) {
            var dir = f * signo;
            if (dir > 0.001) a = Math.min(a, (VISIBLE.x1 - x) / dir);
            else if (dir < -0.001) a = Math.min(a, (x - VISIBLE.x0) / -dir);
        });
        return a;
    }

    function curvaPara(cv, c, tipo, signo, rnd) {
        var a = rango(cv.amp || [90, 120], rnd, 100) * (FACTOR_FORMA[tipo] || 1);
        a = Math.min(a, ampMaxima(tipo, signo, c.x));
        return { tipo: tipo, amp: Math.floor(Math.max(0, a)) * signo };
    }

    function ampMinimaDe(cv, tipo) { return num(cv.ampMin, 50) * (FACTOR_FORMA[tipo] || 1); }

    /**
     * Curvas del nivel: cada camino sortea su forma (de `curva.tipos`) y su sentido, así ningún jardín se ve
     * igual. Si un camino queda demasiado cerca de su vecino, se prueban otras combinaciones para ese camino
     * (otro sentido, otra forma, la del vecino) y, si ninguna cabe, se aplanan un poco los dos.
     */
    function ponerCurvas(def, carriles, rnd) {
        var cv = def.curva;
        if (!cv) return;
        var tipos = cv.tipos || [cv.tipo || "arco"];
        var sepCurva = num(cv.sep, 120);
        carriles.forEach(function (c, i) {
            var tipo = tipos[Math.floor(rnd() * tipos.length)];
            var signo = rnd() < 0.5 ? -1 : 1;
            c.curva = curvaPara(cv, c, tipo, signo, rnd);
            if (i === 0) return;
            var prev = carriles[i - 1];
            if (separacionMinima(prev, c) >= sepCurva && Math.abs(c.curva.amp) >= ampMinimaDe(cv, tipo)) return;
            // otras combinaciones para este camino, en orden al azar
            var opciones = [];
            barajar(tipos, rnd).forEach(function (t) { [1, -1].forEach(function (s) { opciones.push([t, s]); }); });
            for (var k = 0; k < opciones.length; k++) {
                var prueba = curvaPara(cv, c, opciones[k][0], opciones[k][1], rnd);
                var antes = c.curva;
                c.curva = prueba;
                if (separacionMinima(prev, c) >= sepCurva && Math.abs(prueba.amp) >= ampMinimaDe(cv, prueba.tipo)) return;
                c.curva = antes;
            }
        });
        for (var k = 0; k < 12; k++) {
            var ok = true;
            for (var i = 1; i < carriles.length; i++) {
                var A = carriles[i - 1], B = carriles[i];
                if (separacionMinima(A, B) < sepCurva) {
                    ok = false;
                    [A, B].forEach(function (c) {
                        var m = Math.abs(c.curva.amp) * 0.88;
                        if (m >= ampMinimaDe(cv, c.curva.tipo)) c.curva.amp = Math.floor(m) * (c.curva.amp < 0 ? -1 : 1);
                    });
                }
            }
            if (ok) break;
        }
    }

    /** Puntos guía (gotitas punteadas) de un carril, desde y0 hasta y1, con el paso del nivel. */
    function puntosGuia(y0, y1, sep) {
        var pts = [];
        var largo = y1 - y0;
        var n = Math.max(3, Math.round(largo / sep));
        for (var i = 0; i <= n; i++) pts.push(Math.round(y0 + largo * i / n));
        return pts;
    }

    function armarCarriles(def, xs, largos, rnd) {
        var n = xs.length;
        var sep = n > 1 ? Math.min.apply(null, xs.slice(1).map(function (x, i) { return x - xs[i]; })) : 600;
        var colFlor = barajar(def.coloresFlor || COLORES_FLOR, rnd);
        var colNube = barajar(def.coloresNube || COLORES_NUBE, rnd);
        var tipos = barajar(def.tiposFlor || TIPOS_FLOR, rnd);
        var kN = escalaNube(def, sep), kF = escalaFlor(def, sep);
        var sepPuntos = num(def.sepPuntos, 48);
        var lista = xs.map(function (x, i) {
            var largo = largos[i];
            var y1 = FIN;
            var y0 = y1 - largo;
            return {
                i: i,
                x: x,
                y0: y0,
                y1: y1,
                largo: largo,
                nubeY: y0 - NUBE_SOBRE,
                tol: num(def.tolerancia, 90),
                radioPunto: num(def.radioPunto, 14),
                puntos: puntosGuia(y0, y1, sepPuntos),
                color: colFlor[i % colFlor.length],
                colorNube: colNube[i % colNube.length],
                tipoFlor: tipos[i % tipos.length],
                escalaNube: Math.round(kN * 100) / 100,
                escalaFlor: Math.round(kF * 100) / 100,
                variante: i % 3,
                inclina: Math.round((rnd() < 0.5 ? -1 : 1) * lerp(0.22, 0.34, rnd()) * 100) / 100,
                curva: null
            };
        });
        ponerCurvas(def, lista, rnd);
        return lista;
    }

    /** Motivos por los que un jardín no sirve (vacío = válido). */
    function validarJardin(j, def) {
        var m = [];
        var c = j.carriles || [];
        var n = num(def && def.flores, c.length);
        if (c.length !== n) m.push("cantidad");
        var sepMin = num(def && def.sepMin, 180);
        for (var i = 0; i < c.length; i++) {
            var a = c[i];
            if (a.x < num(def && def.x0, ZONA.x0) - 0.5 || a.x > num(def && def.x1, ZONA.x1) + 0.5) m.push("fuera-zona:" + i);
            if (a.nubeY < NUBE_MIN_Y - 0.5) m.push("nube-alta:" + i);
            if (!(a.y1 > a.y0)) m.push("sin-bajada:" + i);
            if (a.largo < 120) m.push("corto:" + i);
            if (!a.puntos || a.puntos.length < 3 || a.puntos[0] !== a.y0 || a.puntos[a.puntos.length - 1] !== a.y1) m.push("puntos:" + i);
            if (a.tol * 2 > NUBE_ANCHO * a.escalaNube + 80) m.push("tolerancia:" + i);
            if (def && def.curva) {
                var amp = a.curva ? Math.abs(a.curva.amp) : 0;
                if (!a.curva || amp < ampMinimaDe(def.curva, a.curva.tipo) - 0.5) m.push("curva-plana:" + i);
                for (var yy = a.y0; yy <= a.y1; yy += 10) {
                    var xx = xEn(a, yy);
                    if (xx < VISIBLE.x0 - 0.5 || xx > VISIBLE.x1 + 0.5) { m.push("curva-fuera:" + i); break; }
                }
            }
            if (i > 0) {
                var d = a.x - c[i - 1].x;
                if (d < sepMin - 0.5) m.push("juntos:" + i);
                // nubes y flores (a su tamaño real) no se pisan
                if (NUBE_ANCHO * (a.escalaNube + c[i - 1].escalaNube) / 2 > d - 10) m.push("nubes-pisan:" + i);
                if (FLOR_ANCHO * (a.escalaFlor + c[i - 1].escalaFlor) / 2 > d - 10) m.push("flores-pisan:" + i);
                // la tolerancia de dos carriles vecinos no se cruza: un toque decide un solo carril
                if (a.tol + c[i - 1].tol > d + 0.5) m.push("tolerancias-cruzan:" + i);
                // los caminos curvos nunca se juntan
                if (def && def.curva && separacionMinima(c[i - 1], a) < num(def.curva.sep, 120) - 0.5) m.push("curvas-juntas:" + i);
            }
        }
        (j.adornos || []).forEach(function (o, k) {
            if (c.some(function (a) { return Math.abs(a.x - o.x) < 60; })) m.push("adorno-flor:" + k);
        });
        return m;
    }

    function generarJardin(def, juego, rnd) {
        rnd = rnd || Math.random;
        var j = juego || {};
        var n = Math.max(1, num(def.flores, 2));
        var sepMin = num(def.sepMin, 180);
        var intentos = num(j.intentos, 40);
        var x0 = num(def.x0, ZONA.x0), x1 = num(def.x1, ZONA.x1);
        for (var k = 0; k < intentos; k++) {
            var xs = sortearXs(n, sepMin, x0, x1, rnd, 20);
            if (!xs) break;
            var jardin = {
                id: def.id,
                carriles: armarCarriles(def, xs, sortearLargos(n, def, rnd), rnd),
                respaldo: false
            };
            jardin.adornos = sortearAdornos(def, jardin.carriles, rnd);
            jardin.mariposas = sortearMariposas(def, rnd);
            jardin.nubesDeco = Math.max(0, num(def.nubesDeco, 3));
            if (!validarJardin(jardin, def).length) return jardin;
        }
        // respaldo: reparto parejo y largos del medio (siempre jugable)
        var r = def.largo || [300, 340];
        var medio = Math.round(((Number(r[0]) || 300) + (Number(r[1]) || 340)) / 2);
        var largos = [];
        for (var i = 0; i < n; i++) largos.push(medio);
        var resp = { id: def.id, carriles: armarCarriles(def, xsParejas(n, num(def.x0, ZONA.x0), num(def.x1, ZONA.x1)), largos, rnd), respaldo: true };
        resp.adornos = sortearAdornos(def, resp.carriles, rnd);
        resp.mariposas = sortearMariposas(def, rnd);
        resp.nubesDeco = Math.max(0, num(def.nubesDeco, 3));
        resp.motivos = validarJardin(resp, def);
        return resp;
    }

    /** Los jardines de la partida, uno por nivel. Se generan una sola vez al empezar. */
    function generarPartida(defs, juego, rnd) {
        return (defs || []).map(function (d) { return generarJardin(d, juego, rnd); });
    }

    // ------------------------------------------------------------------ trazado

    function nuevoEstado(c) {
        return { s: 0, activo: false, fuera: false, enMeta: false, hecho: false, x: c ? c.x : 0, y: c ? c.y0 : 0, bajado: 0, lateral: 0 };
    }

    /** ¿El toque (x, y) cae sobre la nube del carril? Zona generosa: la nube entera y el arranque del carril. */
    function tocaNube(c, x, y, juego) {
        var j = juego || {};
        var rx = Math.max(num(j.radioNube, 120), NUBE_ANCHO * c.escalaNube * 0.58);
        var ry = num(j.radioNubeY, 92);
        var dx = (x - c.x) / rx, dy = (y - c.nubeY) / ry;
        if (dx * dx + dy * dy <= 1) return true;
        // el arranque del carril cuenta como nube (el dedito suele caer un poco abajo)
        return Math.abs(x - c.x) <= c.tol && y >= c.nubeY && y <= c.y0 + num(j.arranque, 46);
    }

    /** Índice del carril pendiente cuya nube se tocó, o -1. `estados[i].hecho` excluye las flores ya regadas. */
    function nubeEn(jardin, estados, x, y, juego) {
        var mejor = -1, dMejor = Infinity;
        (jardin.carriles || []).forEach(function (c, i) {
            if (estados && estados[i] && estados[i].hecho) return;
            if (!tocaNube(c, x, y, juego)) return;
            var d = Math.abs(x - c.x) + Math.abs(y - c.nubeY) * 0.5;
            if (d < dMejor) { dMejor = d; mejor = i; }
        });
        return mejor;
    }

    /** Índice del carril pendiente cuyo cuerpo (no la nube) se tocó, o -1: sirve para decir "empieza en la nube". */
    function carrilEn(jardin, estados, x, y) {
        var c = jardin.carriles || [];
        for (var i = 0; i < c.length; i++) {
            if (estados && estados[i] && estados[i].hecho) continue;
            if (distEje(c[i], x, y) <= c[i].tol && y > c[i].y0 && y <= SUELO) return i;
        }
        return -1;
    }

    function tomar(c, est, x, y) {
        est.activo = true;
        est.fuera = false;
        est.enMeta = false;
        est.s = 0;
        est.x = x;
        est.y = Math.max(y, c.y0);
        est.bajado = 0;
        est.lateral = 0;
        return est;
    }

    /**
     * Un movimiento del dedo hasta (x, y). Interpola el tramo en subpasos cortos para que un movimiento rápido
     * cuente, salvo saltos gigantes (> saltoMax), que solo miran el punto final.
     * Devuelve { tipo: "avanza" | "fuera" | "vuelve" | "meta" | "nada", s, delta }.
     */
    function seguir(c, est, x, y, juego) {
        var j = juego || {};
        if (!est.activo || est.hecho) return { tipo: "nada", s: est.s, delta: 0 };
        var sub = Math.max(4, num(j.subpaso, 14));
        var ventana = num(j.ventana, 90);
        var vuelta = num(j.vuelta, 120);
        // al volver al carril hay que retomar cerca de donde se salió (no más abajo): así no se corta una curva
        var vueltaAdelante = num(j.vueltaAdelante, 45);
        var finTol = num(j.finTol, 34);
        var saltoMax = num(j.saltoMax, 240);
        var dx = x - est.x, dy = y - est.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var pasos = d > saltoMax ? 1 : Math.max(1, Math.ceil(d / sub));
        var s0 = est.s, eraFuera = est.fuera, eraMeta = est.enMeta;
        var x0 = est.x, y0p = est.y;
        for (var k = 1; k <= pasos; k++) {
            var u = d > saltoMax ? 1 : k / pasos;
            var px = lerp(x0, x, u), py = lerp(y0p, y, u);
            var lado = distEje(c, px, py);
            var ty = py - c.y0;
            if (lado > c.tol) {
                est.fuera = true;
                continue;
            }
            if (est.fuera) {
                // vuelve al carril cerca de donde iba (no más abajo que la ventana: no se salta camino)
                if (ty <= est.s + vueltaAdelante && ty >= est.s - vuelta) est.fuera = false;
                else continue;
            }
            if (ty > est.s && ty <= est.s + ventana) est.s = Math.min(c.largo, ty);
        }
        est.lateral += Math.abs(dx);
        est.bajado += Math.max(0, est.s - s0);
        est.x = x;
        est.y = y;
        if (est.s >= c.largo - finTol) est.enMeta = true;
        var delta = est.s - s0;
        if (est.enMeta && !eraMeta) return { tipo: "meta", s: est.s, delta: delta };
        if (est.fuera && !eraFuera) return { tipo: "fuera", s: est.s, delta: delta };
        if (!est.fuera && eraFuera) return { tipo: "vuelve", s: est.s, delta: delta };
        return { tipo: delta > 0 ? "avanza" : "nada", s: est.s, delta: delta };
    }

    /**
     * El dedo se levantó. "exito" si el trazo llegó a la flor; si no, "reintento" (progreso a 0, sin castigo) o
     * "toque" (apenas tocó la nube y no bajó).
     */
    function soltar(c, est, juego) {
        var j = juego || {};
        if (!est.activo) return { resultado: "nada", s: est.s };
        est.activo = false;
        if (est.enMeta || est.s >= c.largo - num(j.finTol, 34)) {
            est.hecho = true;
            est.fuera = false;
            return { resultado: "exito", s: est.s };
        }
        var s = est.s;
        est.s = 0;
        est.fuera = false;
        est.enMeta = false;
        return { resultado: s < num(j.minToque, 18) ? "toque" : "reintento", s: s };
    }

    /** Porcentaje bajado del carril (0..1). */
    function avance(c, est) { return c.largo > 0 ? Math.max(0, Math.min(1, est.s / c.largo)) : 0; }

    function completo(estados) {
        return !!estados && estados.length > 0 && estados.every(function (e) { return e.hecho; });
    }

    var API = {
        ZONA: ZONA,
        SUELO: SUELO,
        FIN: FIN,
        NUBE_SOBRE: NUBE_SOBRE,
        NUBE_MIN_Y: NUBE_MIN_Y,
        NUBE_ANCHO: NUBE_ANCHO,
        FLOR_ANCHO: FLOR_ANCHO,
        TIPOS_FLOR: TIPOS_FLOR,
        azar: azar,
        barajar: barajar,
        sortearXs: sortearXs,
        generarJardin: generarJardin,
        generarPartida: generarPartida,
        validarJardin: validarJardin,
        nuevoEstado: nuevoEstado,
        tocaNube: tocaNube,
        nubeEn: nubeEn,
        carrilEn: carrilEn,
        tomar: tomar,
        seguir: seguir,
        soltar: soltar,
        avance: avance,
        completo: completo,
        forma: forma,
        FORMAS: Object.keys(FORMAS),
        xEn: xEn,
        pendiente: pendiente,
        distEje: distEje,
        separacionMinima: separacionMinima,
        VISIBLE: VISIBLE
    };
    global.ReglasLluvia = API;
    if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : global);
