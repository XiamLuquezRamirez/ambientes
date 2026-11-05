/**
 * Generador de posiciones de estrellas: Poisson Disk Sampling (Bridson 2007)
 * sobre la zona jugable, y después un recorrido que ordena los números.
 *
 * Poisson da nubes de puntos con separación mínima garantizada y aspecto
 * natural (a diferencia de una rejilla, que se ve artificial, o del azar puro,
 * que agrupa y deja huecos). Depende de ConstelacionValidador para las reglas.
 */
(function (global) {
    "use strict";

    var V = global.ConstelacionValidador ||
        (typeof require !== "undefined" ? require("./validador.js") : null);

    var INTENTOS_VECINO = 30;   // k de Bridson
    var INTENTOS_NUBE = 40;     // reintentos de la nube completa
    var RELAJACION = 0.92;      // cuánto se afloja la separación por tanda fallida

    function azarPor(rnd) { return typeof rnd === "function" ? rnd : Math.random; }

    /**
     * Nube de puntos con separación mínima `sep` dentro de `area`.
     * Devuelve los que quepan, sin garantizar que sean `cuantos`.
     */
    function nubePoisson(cuantos, area, sep, rnd, vetadas) {
        var azar = azarPor(rnd);
        var radioTactil = V.RADIO_TACTIL;
        /* El muestreo se hace sobre el área ya encogida por el radio táctil, así
           ningún candidato nace pegado al borde. */
        var x0 = area.x + radioTactil;
        var y0 = area.y + radioTactil;
        var ancho = area.ancho - radioTactil * 2;
        var alto = area.alto - radioTactil * 2;
        if (ancho <= 0 || alto <= 0) return [];

        var celda = sep / Math.SQRT2;
        var cols = Math.max(1, Math.ceil(ancho / celda));
        var filas = Math.max(1, Math.ceil(alto / celda));
        var rejilla = new Array(cols * filas);
        var activos = [];
        var salida = [];

        function vetado(px, py) {
            var i, z;
            for (i = 0; i < (vetadas || []).length; i++) {
                z = vetadas[i];
                if (px + radioTactil > z.x && px - radioTactil < z.x + z.ancho &&
                    py + radioTactil > z.y && py - radioTactil < z.y + z.alto) return true;
            }
            return false;
        }

        function lejosDeTodos(px, py) {
            var cx = Math.floor((px - x0) / celda);
            var cy = Math.floor((py - y0) / celda);
            var i, j, vecino, dx, dy;
            /* Con celda = sep/√2 basta mirar 2 celdas a la redonda. */
            for (i = Math.max(0, cx - 2); i <= Math.min(cols - 1, cx + 2); i++) {
                for (j = Math.max(0, cy - 2); j <= Math.min(filas - 1, cy + 2); j++) {
                    vecino = rejilla[j * cols + i];
                    if (!vecino) continue;
                    dx = vecino.x - px;
                    dy = vecino.y - py;
                    if (dx * dx + dy * dy < sep * sep) return false;
                }
            }
            return true;
        }

        function aceptar(px, py) {
            var p = { x: px, y: py };
            salida.push(p);
            activos.push(p);
            var cx = Math.floor((px - x0) / celda);
            var cy = Math.floor((py - y0) / celda);
            rejilla[cy * cols + cx] = p;
        }

        var sx, sy, guardia = 0;
        do {
            sx = x0 + azar() * ancho;
            sy = y0 + azar() * alto;
            guardia++;
        } while (vetado(sx, sy) && guardia < 200);
        if (vetado(sx, sy)) return [];
        aceptar(sx, sy);

        while (activos.length && salida.length < cuantos) {
            var idx = Math.floor(azar() * activos.length);
            var base = activos[idx];
            var colocado = false;
            var t, ang, rad, nx, ny;

            for (t = 0; t < INTENTOS_VECINO; t++) {
                ang = azar() * Math.PI * 2;
                rad = sep + azar() * sep;   // anillo [sep, 2·sep)
                nx = base.x + Math.cos(ang) * rad;
                ny = base.y + Math.sin(ang) * rad;
                if (nx < x0 || nx > x0 + ancho || ny < y0 || ny > y0 + alto) continue;
                if (vetado(nx, ny)) continue;
                if (!lejosDeTodos(nx, ny)) continue;
                aceptar(nx, ny);
                colocado = true;
                break;
            }
            if (!colocado) activos.splice(idx, 1);
        }

        return salida;
    }

    /**
     * Ordena los puntos en un recorrido que no se cruce demasiado: ángulo
     * alrededor del centroide. Una constelación con líneas cruzadas confunde
     * a un niño que sigue el orden numérico, aunque sea válida.
     */
    function ordenarEnRecorrido(puntos) {
        if (puntos.length < 3) return puntos.slice();
        var cx = 0, cy = 0, i;
        for (i = 0; i < puntos.length; i++) { cx += puntos[i].x; cy += puntos[i].y; }
        cx /= puntos.length;
        cy /= puntos.length;

        var conAngulo = puntos.map(function (p) {
            return { x: p.x, y: p.y, a: Math.atan2(p.y - cy, p.x - cx) };
        });
        conAngulo.sort(function (p, q) { return p.a - q.a; });
        return conAngulo.map(function (p) { return { x: p.x, y: p.y }; });
    }

    /**
     * Genera las estrellas numeradas de un nivel.
     * Reintenta la nube completa y afloja la separación poco a poco: con 15
     * estrellas y separación de diseño puede no haber sitio, y es mejor una
     * constelación algo más apretada que ninguna. El validador final usa la
     * separación realmente empleada, nunca por debajo del solape táctil.
     *
     * @returns {{estrellas:{n:number,x:number,y:number}[], separacion:number, intentos:number}}
     */
    function generar(cuantos, area, separacion, rnd, vetadas) {
        var azar = azarPor(rnd);
        var sep = separacion;
        var minima = V.RADIO_TACTIL * 2;
        var intentos = 0;
        var mejor = null;

        while (intentos < INTENTOS_NUBE) {
            intentos++;
            var nube = nubePoisson(cuantos, area, sep, azar, vetadas);
            if (nube.length >= cuantos) {
                var elegidos = ordenarEnRecorrido(nube.slice(0, cuantos));
                var revision = V.revisar(elegidos, area, sep, vetadas);
                if (revision.ok) {
                    mejor = { puntos: elegidos, sep: sep };
                    break;
                }
            }
            /* Cada 6 tandas fallidas aflojamos: así primero se insiste con la
               separación buena y solo se cede si de verdad no cabe. */
            if (intentos % 6 === 0 && sep > minima) {
                sep = Math.max(minima, sep * RELAJACION);
            }
        }

        if (!mejor) {
            /* Último recurso: separación mínima táctil. Nunca devolvemos
               estrellas solapadas ni fuera del área. */
            var ultima = nubePoisson(cuantos, area, minima, azar, vetadas);
            mejor = { puntos: ordenarEnRecorrido(ultima.slice(0, cuantos)), sep: minima };
        }

        return {
            estrellas: mejor.puntos.map(function (p, i) {
                return { n: i + 1, x: Math.round(p.x), y: Math.round(p.y) };
            }),
            separacion: mejor.sep,
            intentos: intentos
        };
    }

    global.ConstelacionGenerador = {
        generar: generar,
        nubePoisson: nubePoisson,
        ordenarEnRecorrido: ordenarEnRecorrido
    };
    if (typeof module !== "undefined" && module.exports) module.exports = global.ConstelacionGenerador;
})(typeof window !== "undefined" ? window : globalThis);
