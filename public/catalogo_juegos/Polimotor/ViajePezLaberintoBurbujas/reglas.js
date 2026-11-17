/**
 * ReglasPez — lógica pura de "¡El Viaje del Pez por el Laberinto de Burbujas!" (window.ReglasPez y module.exports).
 * Basada en el generador de "¡El Camino del Cohete de Zeus!", con desvíos que vuelven a unirse al camino.
 *
 * 1. Generador procedural de recorridos (con semilla):
 *    - el mundo se divide en celdas de al menos 2,25 anchos de camino; una búsqueda al azar arma un camino de celdas
 *      de la concha de salida (izquierda) al coral mágico (derecha) con el largo y los giros de cada recorrido; el
 *      camino pasa por esas celdas con curvas Bézier (punto de control = centro de la celda, con un pequeño
 *      desplazamiento al azar) y se muestrea por longitud de arco;
 *    - distractores, que se dibujan igual que el camino principal (son parte del mismo laberinto):
 *        · callejones: ramales cortos en "Y" que terminan sin salida (el pez vuelve solo a la bifurcación);
 *        · lazos: desvíos que salen del camino, rodean una isla de burbujas y se vuelven a unir más adelante;
 *    - validación: dentro de la pantalla, sin cruces ni tramos que se rocen, ramales lejos de la meta y de los
 *      otros ramales. Si algo falla se vuelve a sortear.
 * 2. Geometría del nado: localizar al pez sobre la red de caminos solo en la vecindad de donde ya está (no puede
 *    "saltar" a otro tramo ni a la meta), con una franja de holgura fuera del camino (alerta) y un límite.
 *
 * Un ramal es { raiz, pts } (callejón) o { raiz, union, lazo: true, pts } (lazo: pts[0] está en principal[raiz]
 * y el último punto en principal[union]).
 *
 * Coordenadas del mundo: ancho fijo (config.juego.anchoMundo) y alto según la pantalla del niño.
 */
(function (global) {
    "use strict";

    // ------------------------------------------------------------------ azar con semilla

    function semillaNueva() {
        return ((Date.now() & 0x7fffffff) ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    }

    /** mulberry32: generador pequeño y repetible. */
    function azar(semilla) {
        var a = semilla >>> 0;
        var f = function () {
            a = (a + 0x6d2b79f5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        f.entre = function (a0, b0) { return a0 + (b0 - a0) * f(); };
        f.entero = function (a0, b0) { return Math.floor(a0 + (b0 - a0 + 1) * f()); };
        return f;
    }

    // ------------------------------------------------------------------ vectores

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function rotar(v, ang) {
        var c = Math.cos(ang), s = Math.sin(ang);
        return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
    }
    function unit(v) {
        var l = Math.hypot(v.x, v.y) || 1;
        return { x: v.x / l, y: v.y / l };
    }

    // ------------------------------------------------------------------ curvas

    function bezier2(p0, c, p1, t) {
        var u = 1 - t;
        return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
    }

    /** Remuestrea una polilínea densa a pasos iguales de longitud de arco. */
    function remuestrear(densa, ds) {
        var out = [{ x: densa[0].x, y: densa[0].y, s: 0 }];
        var resto = 0;
        for (var i = 1; i < densa.length; i++) {
            var a = densa[i - 1], b = densa[i];
            var l = dist(a, b);
            if (l <= 0) continue;
            var t = ds - resto;
            while (t <= l) {
                out.push({ x: a.x + (b.x - a.x) * (t / l), y: a.y + (b.y - a.y) * (t / l), s: out.length * ds });
                t += ds;
            }
            resto = l - (t - ds);
        }
        var ult = densa[densa.length - 1];
        if (dist(out[out.length - 1], ult) > ds * 0.3) out.push({ x: ult.x, y: ult.y, s: out.length * ds });
        return out;
    }

    // ------------------------------------------------------------------ cuadrícula del mundo

    var SEPARACION = 2.25; // distancia mínima entre tramos vecinos, en anchos de pista
    var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

    /**
     * El mundo se divide en celdas de al menos SEPARACION anchos de pista: dos tramos vecinos nunca se rozan.
     * La última columna es de la coral mágico (solo la meta) y la esquina de abajo a la izquierda es de Zoe.
     */
    function rejilla(dims, w) {
        var m = 46;
        var der = w * 0.6; // espacio extra a la derecha: el coral sobresale de su celda
        var cols = Math.max(4, Math.floor((dims.W - 2 * m - der) / (SEPARACION * w)));
        var filas = Math.max(2, Math.floor((dims.H - 2 * m) / (SEPARACION * w)));
        var g = {
            m: m,
            cols: cols,
            filas: filas,
            cx: (dims.W - 2 * m - der) / cols,
            cy: (dims.H - 2 * m) / filas
        };
        g.prohibida = function (c, f) {
            if (c < 0 || f < 0 || c >= cols || f >= filas) return true;
            return c === 0 && f === filas - 1 && filas > 2; // hueco de Zoe (abajo a la izquierda)
        };
        return g;
    }

    function clave(c, f) { return c + "," + f; }

    function contarGiros(celdas) {
        var g = 0;
        for (var i = 1; i < celdas.length - 1; i++) {
            var d1 = [celdas[i][0] - celdas[i - 1][0], celdas[i][1] - celdas[i - 1][1]];
            var d2 = [celdas[i + 1][0] - celdas[i][0], celdas[i + 1][1] - celdas[i][1]];
            if (d1[0] !== d2[0] || d1[1] !== d2[1]) g++;
        }
        return g;
    }

    /**
     * Camino de celdas al azar (búsqueda en profundidad con poda) de la concha de salida al coral:
     * sale hacia la derecha, entra a la meta desde la izquierda y no toca la columna del coral.
     */
    function buscarCamino(g, ini, fin, largoMin, largoMax, girosMin, girosMax, r) {
        var mejor = null;
        var expansiones = 0;
        var usadas = {};
        var camino = [];
        var antes = [fin[0] - 1, fin[1]];
        function libre(c, f) {
            if (g.prohibida(c, f) || usadas[clave(c, f)]) return false;
            if (c === g.cols - 1) return false;
            return true;
        }
        function dfs(c, f) {
            if (mejor || expansiones++ > 6000) return;
            camino.push([c, f]);
            usadas[clave(c, f)] = true;
            if (c === antes[0] && f === antes[1]) {
                var total = camino.length + 1;
                if (total >= largoMin && total <= largoMax) {
                    var cand = camino.concat([fin]);
                    var giros = contarGiros(cand);
                    if (giros >= girosMin && giros <= girosMax) mejor = cand;
                }
            } else {
                var resto = largoMax - camino.length - 1;
                var falta = Math.abs(antes[0] - c) + Math.abs(antes[1] - f);
                if (falta <= resto) {
                    var orden = DIRS.slice();
                    for (var i = orden.length - 1; i > 0; i--) {
                        var j = Math.floor(r() * (i + 1));
                        var t = orden[i]; orden[i] = orden[j]; orden[j] = t;
                    }
                    if (camino.length === 1) orden = [[1, 0]]; // sale nadando hacia la derecha
                    for (var k = 0; k < orden.length && !mejor; k++) {
                        var nc = c + orden[k][0], nf = f + orden[k][1];
                        if (libre(nc, nf)) dfs(nc, nf);
                    }
                }
            }
            camino.pop();
            delete usadas[clave(c, f)];
        }
        dfs(ini[0], ini[1]);
        return mejor;
    }

    function barajar(lista, r) {
        for (var a = lista.length - 1; a > 0; a--) {
            var b = Math.floor(r() * (a + 1));
            var t = lista[a]; lista[a] = lista[b]; lista[b] = t;
        }
        return lista;
    }

    function celdaUsable(g, c, f, enCamino) {
        return !g.prohibida(c, f) && c !== g.cols - 1 && enCamino[clave(c, f)] == null;
    }

    /**
     * Lazos: dos celdas libres pegadas al camino a la altura de dos celdas seguidas del camino (i, i+1). El desvío
     * sale del camino en i, rodea una isla de burbujas por esas dos celdas y vuelve a entrar en i+1.
     */
    function elegirLazos(g, celdas, n, r) {
        if (n <= 0) return [];
        var enCamino = {};
        celdas.forEach(function (c, i) { enCamino[clave(c[0], c[1])] = i; });
        var candidatos = [];
        for (var i = 1; i <= celdas.length - 4; i++) {
            var d = [celdas[i + 1][0] - celdas[i][0], celdas[i + 1][1] - celdas[i][1]];
            [[d[1], d[0]], [-d[1], -d[0]]].forEach(function (nn) {
                var A = [celdas[i][0] + nn[0], celdas[i][1] + nn[1]];
                var B = [celdas[i + 1][0] + nn[0], celdas[i + 1][1] + nn[1]];
                if (!celdaUsable(g, A[0], A[1], enCamino) || !celdaUsable(g, B[0], B[1], enCamino)) return;
                candidatos.push({ raiz: i, union: i + 1, celdas: [A, B], lazo: true });
            });
        }
        barajar(candidatos, r);
        var elegidos = [];
        candidatos.forEach(function (cd) {
            if (elegidos.length >= n) return;
            var choca = elegidos.some(function (e) {
                return Math.abs(e.raiz - cd.raiz) < 3 || e.celdas.some(function (a) {
                    return cd.celdas.some(function (b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) <= 1; });
                });
            });
            if (!choca) elegidos.push(cd);
        });
        return elegidos.length === n ? elegidos : null;
    }

    /** Celdas libres junto al camino donde cabe un callejón corto (sin tocar otros callejones ni los lazos). */
    function elegirCallejones(g, celdas, n, r, lazos) {
        var enCamino = {};
        celdas.forEach(function (c, i) { enCamino[clave(c[0], c[1])] = i; });
        var ocupadas = [];
        (lazos || []).forEach(function (l) { ocupadas = ocupadas.concat(l.celdas); });
        var candidatos = [];
        for (var i = 1; i <= celdas.length - 4; i++) {
            DIRS.forEach(function (d) {
                var c = celdas[i][0] + d[0], f = celdas[i][1] + d[1];
                if (!celdaUsable(g, c, f, enCamino)) return;
                candidatos.push({ raiz: i, celda: [c, f] });
            });
        }
        barajar(candidatos, r);
        var elegidos = [];
        candidatos.forEach(function (cd) {
            if (elegidos.length >= n) return;
            var cercaLazo = (lazos || []).some(function (l) {
                return cd.raiz >= l.raiz - 1 && cd.raiz <= l.union + 1;
            }) || ocupadas.some(function (o) { return Math.abs(o[0] - cd.celda[0]) + Math.abs(o[1] - cd.celda[1]) <= 1; });
            if (cercaLazo) return;
            var choca = elegidos.some(function (e) {
                var dc = Math.abs(e.celda[0] - cd.celda[0]), df = Math.abs(e.celda[1] - cd.celda[1]);
                return (dc + df <= 1) || Math.abs(e.raiz - cd.raiz) < 2;
            });
            if (!choca) elegidos.push(cd);
        });
        return elegidos.length === n ? elegidos.sort(function (x, y) { return x.raiz - y.raiz; }) : null;
    }

    // ------------------------------------------------------------------ geometría con curvas Bézier

    /**
     * Pista que pasa por las celdas: entre los puntos medios de dos celdas vecinas va una Bézier cuadrática con
     * el centro de la celda como punto de control (tramo recto si sigue derecho, cuarto de curva si gira).
     * Los centros llevan un pequeño desplazamiento al azar para que no parezca una cuadrícula.
     */
    function trazarPrincipal(centros, ds) {
        var mid = function (a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
        var densa = [centros[0]];
        var n = centros.length;
        var p = function (a, b) {
            for (var j = 1; j <= 10; j++) densa.push({ x: a.x + (b.x - a.x) * j / 10, y: a.y + (b.y - a.y) * j / 10 });
        };
        p(centros[0], mid(centros[0], centros[1]));
        for (var k = 1; k < n - 1; k++) {
            var a = mid(centros[k - 1], centros[k]);
            var b = mid(centros[k], centros[k + 1]);
            for (var j = 1; j <= 36; j++) densa.push(bezier2(a, centros[k], b, j / 36));
        }
        p(mid(centros[n - 2], centros[n - 1]), centros[n - 1]);
        return remuestrear(densa, ds);
    }

    function trazarCallejon(principal, desde, hacia, g, r, ds) {
        var mejor = 0, md = Infinity;
        principal.forEach(function (q, i) {
            var d = dist(q, desde);
            if (d < md) { md = d; mejor = i; }
        });
        var R = principal[mejor];
        var t = tangente(principal, mejor);
        var v = unit({ x: hacia.x - R.x, y: hacia.y - R.y });
        var L = dist(R, hacia);
        var fin = { x: R.x + v.x * L * 0.8, y: R.y + v.y * L * 0.8 };
        // se inclina hacia donde avanza el pez: la bifurcación parece una "Y" de la misma pista
        var c = { x: R.x + v.x * L * 0.42 + t.x * L * 0.2, y: R.y + v.y * L * 0.42 + t.y * L * 0.2 };
        var densa = [];
        for (var j = 0; j <= 40; j++) densa.push(bezier2(R, c, fin, j / 40));
        return { raiz: mejor, pts: remuestrear(densa, ds) };
    }

    function indiceCercano(pts, p) {
        var mejor = 0, md = Infinity;
        for (var i = 0; i < pts.length; i++) {
            var d = dist(pts[i], p);
            if (d < md) { md = d; mejor = i; }
        }
        return mejor;
    }

    /** Lazo: sale del camino junto a la celda raiz, pasa por las dos celdas libres y vuelve junto a la celda union. */
    function trazarLazo(principal, cRaiz, cA, cB, cUnion, ds) {
        var ia = indiceCercano(principal, cRaiz);
        var ib = indiceCercano(principal, cUnion);
        var Ra = principal[ia], Rb = principal[ib];
        var pts = trazarPrincipal([{ x: Ra.x, y: Ra.y }, cA, cB, { x: Rb.x, y: Rb.y }], ds);
        return { raiz: ia, union: ib, lazo: true, pts: pts };
    }

    function tangente(pts, i) {
        var a = pts[Math.max(0, i - 3)], b = pts[Math.min(pts.length - 1, i + 3)];
        return unit({ x: b.x - a.x, y: b.y - a.y });
    }

    function minDistA(p, lista) {
        var m = Infinity;
        for (var i = 0; i < lista.length; i++) {
            var d = Math.hypot(p.x - lista[i].x, p.y - lista[i].y);
            if (d < m) m = d;
        }
        return m;
    }

    function dentro(p, dims, m) {
        return p.x >= m && p.x <= dims.W - m && p.y >= m && p.y <= dims.H - m;
    }

    /** Ningún par de tramos alejados en el camino puede estar cerca en la pantalla (sin cruces ni roces). */
    function separacionOk(pts, separacion, arcoMin) {
        for (var i = 0; i < pts.length; i += 2) {
            for (var j = i + 2; j < pts.length; j += 2) {
                if (pts[j].s - pts[i].s < arcoMin) continue;
                if (dist(pts[i], pts[j]) < separacion) return false;
            }
        }
        return true;
    }

    function validarPrincipal(pts, dims, w) {
        var m = w * 0.5 + 8;
        for (var i = 0; i < pts.length; i++) if (!dentro(pts[i], dims, m)) return "bordes";
        if (!separacionOk(pts, w * 1.9, w * 4.2)) return "cruce";
        return null;
    }

    function validarCallejon(f, principal, otros, dims, w) {
        var R = principal[f.raiz];
        var R2 = f.lazo ? principal[f.union] : null;
        var m = w * 0.5 + 8;
        for (var k = 0; k < f.pts.length; k++) {
            var p = f.pts[k];
            if (!dentro(p, dims, m)) return false;
            var lejos = dist(p, R) >= w * 1.3 && (!R2 || dist(p, R2) >= w * 1.3);
            if (lejos && minDistA(p, principal) < w * 1.2) return false;
            for (var o = 0; o < otros.length; o++) if (minDistA(p, otros[o].pts) < w * 1.7) return false;
        }
        if (f.lazo) {
            if (f.union - f.raiz < Math.ceil(w * 1.5 / 8) || !separacionOk(f.pts, w * 1.9, w * 4.2)) return false;
            if (f.union > principal.length - 1 - Math.ceil(w * 2.4 / 8)) return false;
            return true;
        }
        var pf = f.pts[f.pts.length - 1];
        if (dist(pf, principal[principal.length - 1]) < w * 2.4) return false;
        if (dist(pf, principal[0]) < w * 1.8) return false;
        return true;
    }

    // ------------------------------------------------------------------ luces a lo largo de la pista

    function colocarLuces(rec, cada) {
        var luces = [];
        var p = rec.principal;
        var ds = rec.paso;
        var L = p[p.length - 1].s;
        for (var s = rec.ancho * 0.85; s < L - rec.ancho * 0.6; s += cada) {
            var i = Math.round(s / ds);
            luces.push({ rama: -1, i: i, x: p[i].x, y: p[i].y });
        }
        rec.falsos.forEach(function (f, k) {
            var Lf = f.pts[f.pts.length - 1].s;
            var hasta = f.lazo ? Lf - rec.ancho * 0.95 : Lf + 0.1;
            for (var s2 = rec.ancho * 0.95; s2 <= hasta; s2 += cada) {
                var j = Math.min(f.pts.length - 1, Math.round(s2 / ds));
                luces.push({ rama: k, i: j, x: f.pts[j].x, y: f.pts[j].y });
            }
        });
        return luces;
    }

    // ------------------------------------------------------------------ recorrido completo

    function rango(v, def) {
        return Array.isArray(v) ? v : [def, def];
    }

    /**
     * Genera un recorrido. def: { ancho, extra:[min,max] (celdas de más sobre el camino recto),
     * giros:[min,max], falsos:[min,max], luces }. dims: { W, H }. Devuelve null solo si no logra uno válido.
     */
    function generarRecorrido(def, dims, semilla, opciones) {
        var ds = (opciones && opciones.paso) || 8;
        var r = azar(semilla);
        var w = def.ancho || 104;
        var g = rejilla(dims, w);
        var falsos = rango(def.falsos, 1);
        var lazosR = rango(def.lazos, 0);
        var extra = rango(def.extra, 2);
        var giros = rango(def.giros, 2);
        var nF = r.entero(falsos[0], falsos[1]);
        var nL = r.entero(lazosR[0], lazosR[1]);
        for (var intento = 0; intento < 120; intento++) {
            var relaja = intento >= 60 ? 1 : 0;
            var filaIni = r.entero(0, Math.max(0, g.filas - 2));
            var filaFin = r.entero(0, g.filas - 1);
            var ini = [0, filaIni];
            var fin = [g.cols - 1, filaFin];
            var recto = (fin[0] - ini[0]) + Math.abs(fin[1] - ini[1]) + 1;
            var e = r.entero(extra[0], extra[1]);
            var celdas = buscarCamino(g, ini, fin, recto + Math.max(0, e - relaja * 2), recto + e + relaja,
                Math.max(0, giros[0] - relaja), giros[1] + relaja * 2, r);
            if (!celdas) continue;
            var lazos = elegirLazos(g, celdas, nL, r);
            if (!lazos) continue;
            var calles = elegirCallejones(g, celdas, nF, r, lazos);
            if (!calles) continue;
            var j = Math.min(g.cx, g.cy) * 0.09;
            var centro = function (c) {
                return {
                    x: g.m + g.cx * (c[0] + 0.5) + (c[0] === 0 || c[0] === g.cols - 1 ? 0 : r.entre(-j, j)),
                    y: g.m + g.cy * (c[1] + 0.5) + r.entre(-j, j)
                };
            };
            var centros = celdas.map(centro);
            var principal = trazarPrincipal(centros, ds);
            if (validarPrincipal(principal, dims, w)) continue;
            var lista = [];
            var ok = true;
            for (var q = 0; q < lazos.length && ok; q++) {
                var lz = lazos[q];
                var fl = trazarLazo(principal, centros[lz.raiz], centro(lz.celdas[0]), centro(lz.celdas[1]), centros[lz.union], ds);
                if (!validarCallejon(fl, principal, lista, dims, w)) ok = false;
                else lista.push(fl);
            }
            for (var k = 0; k < calles.length && ok; k++) {
                var cc = centro(calles[k].celda);
                var f = trazarCallejon(principal, centros[calles[k].raiz], cc, g, r, ds);
                if (!validarCallejon(f, principal, lista, dims, w)) ok = false;
                else lista.push(f);
            }
            if (!ok) continue;
            var rec = {
                id: def.id,
                nombre: def.nombre,
                titulo: def.titulo,
                semilla: semilla,
                W: dims.W,
                H: dims.H,
                ancho: w,
                paso: ds,
                rejilla: { cols: g.cols, filas: g.filas, cx: g.cx, cy: g.cy, m: g.m },
                celdas: celdas,
                giros: contarGiros(celdas),
                principal: principal,
                falsos: lista,
                largo: principal[principal.length - 1].s,
                inicio: { x: principal[0].x, y: principal[0].y },
                meta: { x: principal[principal.length - 1].x, y: principal[principal.length - 1].y }
            };
            rec.luces = colocarLuces(rec, def.luces || 52);
            return rec;
        }
        // Pantallas chicas (pocas celdas): se acorta un poco el camino y, si hace falta, un camino falso menos.
        if (!(opciones && opciones.sinRespaldo)) {
            var e0 = rango(def.extra, 2), f0 = rango(def.falsos, 1);
            var suave = Object.assign({}, def, { extra: [Math.max(0, e0[0] - 3), Math.max(1, e0[1] - 3)], giros: [Math.max(1, giros[0] - 3), giros[1]] });
            var l0 = rango(def.lazos, 0);
            var total = f0[0] + l0[0];
            var muyCorto = Object.assign({}, suave, { extra: [0, Math.max(1, e0[1] - 5)], giros: [1, giros[1]] });
            // en orden: igual pero más corto · sin lazo y un callejón más · un callejón menos (sin bajar de 2
            // bifurcaciones si el recorrido pedía 2 o más) · camino aún más corto · por último una bifurcación menos
            var planes = [
                suave,
                l0[1] > 0 ? Object.assign({}, suave, { lazos: [0, 0], falsos: [total, f0[1] + l0[1]] }) : null,
                total >= 3 ? Object.assign({}, suave, { falsos: [Math.max(1, f0[0] - 1), Math.max(1, f0[1] - 1)] }) : null,
                total >= 3 ? Object.assign({}, suave, { lazos: [0, 0], falsos: [total - 1, total - 1] }) : null,
                Object.assign({}, muyCorto, { lazos: [0, 0], falsos: [Math.max(1, Math.min(total, 2)), Math.max(1, Math.min(total, 2))] }),
                Object.assign({}, muyCorto, { lazos: [0, 0], falsos: [Math.max(1, total - 1), Math.max(1, total - 1)] })
            ];
            for (var pl = 0; pl < planes.length; pl++) {
                if (!planes[pl]) continue;
                var rr = generarRecorrido(planes[pl], dims, semilla, Object.assign({}, opciones, { sinRespaldo: true }));
                if (rr) return rr;
            }
        }
        return null;
    }

    /**
     * Los cuatro recorridos de una partida, todos distintos y cada uno un poco más largo que el anterior
     * (dificultad progresiva). Una semilla por partida.
     */
    function generarPartida(cfg, dims, semilla, opciones) {
        var base = semilla == null ? semillaNueva() : semilla >>> 0;
        var r = azar(base);
        var defs = cfg.recorridos || [];
        var out = [];
        for (var k = 0; k < defs.length; k++) {
            var mejor = null;
            for (var intento = 0; intento < 24; intento++) {
                var rec = generarRecorrido(defs[k], dims, Math.floor(r() * 0xffffffff) >>> 0, opciones);
                if (!rec) continue;
                if (!mejor || rec.largo > mejor.largo) mejor = rec;
                if (!out.length || rec.largo >= out[out.length - 1].largo * 1.03) {
                    mejor = rec;
                    break;
                }
            }
            out.push(mejor);
        }
        // Segunda pasada (pantallas con pocas celdas): si un recorrido quedó más corto que el anterior, se busca
        // para el anterior una versión más corta que él (sin quedar por debajo del que va antes).
        for (var j = out.length - 1; j > 0; j--) {
            if (!out[j] || !out[j - 1] || out[j].largo >= out[j - 1].largo) continue;
            var piso = j > 1 && out[j - 2] ? out[j - 2].largo : 0;
            for (var t = 0; t < 24; t++) {
                var otro = generarRecorrido(defs[j - 1], dims, Math.floor(r() * 0xffffffff) >>> 0, opciones);
                if (otro && otro.largo <= out[j].largo && otro.largo >= piso) {
                    out[j - 1] = otro;
                    break;
                }
            }
        }
        return { semilla: base, recorridos: out };
    }

    // ------------------------------------------------------------------ pilotaje (geometría)

    function polilinea(rec, rama) {
        return rama < 0 ? rec.principal : rec.falsos[rama].pts;
    }

    /** Proyección de p sobre el segmento a-b. */
    function proyectar(p, a, b) {
        var vx = b.x - a.x, vy = b.y - a.y;
        var l2 = vx * vx + vy * vy || 1;
        var t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
        var x = a.x + vx * t, y = a.y + vy * t;
        return { x: x, y: y, t: t, d: Math.hypot(p.x - x, p.y - y) };
    }

    /** Rangos de segmentos [rama, desde, hasta] alcanzables desde un nodo dentro de n pasos por la pista. */
    function vecindad(rec, nodo, n) {
        var out = [];
        var nP = rec.principal.length;
        var agregarPrincipal = function (c, rad) {
            out.push([-1, Math.max(0, c - rad), Math.min(nP - 1, c + rad)]);
            rec.falsos.forEach(function (f, k) {
                var ult = f.pts.length - 1;
                var resto = rad - Math.abs(f.raiz - c);
                if (resto > 0) out.push([k, 0, Math.min(ult, resto)]);
                if (f.lazo) {
                    var resto2 = rad - Math.abs(f.union - c);
                    if (resto2 > 0) out.push([k, Math.max(0, ult - resto2), ult]);
                }
            });
        };
        if (nodo.rama < 0) {
            agregarPrincipal(nodo.i, n);
        } else {
            var f = rec.falsos[nodo.rama];
            var ult = f.pts.length - 1;
            out.push([nodo.rama, Math.max(0, nodo.i - n), Math.min(ult, nodo.i + n)]);
            if (nodo.i - n < 0) agregarPrincipal(f.raiz, n - nodo.i);
            if (f.lazo && nodo.i + n > ult) agregarPrincipal(f.union, nodo.i + n - ult);
        }
        return out;
    }

    /**
     * El punto de la pista más cercano a p, buscando solo cerca del nodo actual (radio en unidades del mundo).
     * Devuelve { rama, i, x, y, d }.
     */
    function localizar(rec, nodo, p, radio) {
        var n = Math.max(2, Math.ceil((radio || rec.ancho * 1.2) / rec.paso));
        var mejor = null;
        vecindad(rec, nodo, n).forEach(function (rg) {
            var pts = polilinea(rec, rg[0]);
            if (rg[1] === rg[2]) {
                var d0 = dist(p, pts[rg[1]]);
                if (!mejor || d0 < mejor.d) mejor = { rama: rg[0], i: rg[1], x: pts[rg[1]].x, y: pts[rg[1]].y, d: d0 };
                return;
            }
            for (var a = rg[1]; a < rg[2]; a++) {
                var q = proyectar(p, pts[a], pts[a + 1]);
                if (!mejor || q.d < mejor.d - 1e-6) {
                    mejor = { rama: rg[0], i: q.t < 0.5 ? a : a + 1, x: q.x, y: q.y, d: q.d };
                }
            }
        });
        // En la raíz de un ramal el punto es el mismo que en el camino principal: se queda en el principal.
        if (mejor && mejor.rama >= 0 && mejor.i === 0) {
            mejor.i = rec.falsos[mejor.rama].raiz;
            mejor.rama = -1;
        } else if (mejor && mejor.rama >= 0 && rec.falsos[mejor.rama].lazo && mejor.i === rec.falsos[mejor.rama].pts.length - 1) {
            // el lazo se vuelve a unir al camino: el pez sigue por el principal
            mejor.i = rec.falsos[mejor.rama].union;
            mejor.rama = -1;
        }
        return mejor;
    }

    /** Límites de la pista: mitad del ancho (sobre la pista) y la holgura permitida fuera de ella. */
    function limites(rec, cfgJ) {
        var w = rec.ancho;
        return { pista: w * 0.5, fuera: w * 0.5 + w * ((cfgJ && cfgJ.holguraFuera) || 0.5) };
    }

    /**
     * Avanza el pez de su posición hacia el objetivo (dedo o ratón), a pasos cortos para no atravesar tramos.
     * Fuera de la pista puede alejarse hasta la holgura (zona "fuera": alerta); más allá queda detenido en el
     * borde (zona "limite") y no avanza por la pista hasta volver a ella.
     * estado: { x, y, nodo:{rama,i} }. Devuelve { x, y, nodo, d, zona: "pista"|"fuera"|"limite", proy }.
     */
    function mover(rec, estado, objetivo, maxDist, cfgJ) {
        var lim = limites(rec, cfgJ);
        var x = estado.x, y = estado.y, nodo = { rama: estado.nodo.rama, i: estado.nodo.i };
        var paso = rec.paso * 1.5;
        var falta = Math.min(maxDist, Math.hypot(objetivo.x - x, objetivo.y - y));
        var loc = null, zona = "pista", d = 0;
        var vueltas = 0;
        while (falta > 0.01 && vueltas++ < 400) {
            var dx = objetivo.x - x, dy = objetivo.y - y;
            var l = Math.hypot(dx, dy);
            if (l < 0.01) break;
            var s = Math.min(paso, falta, l);
            var p = { x: x + dx / l * s, y: y + dy / l * s };
            falta -= s;
            loc = localizar(rec, nodo, p, rec.ancho * 1.25);
            if (!loc) break;
            if (loc.d > lim.fuera) {
                // en el borde: se queda donde estaba (pegado al límite), sin avanzar por la pista
                var anc = localizar(rec, nodo, { x: x, y: y }, rec.ancho * 0.6) || loc;
                var f = anc.d > 0 ? Math.min(1, lim.fuera / Math.hypot(p.x - anc.x, p.y - anc.y)) : 1;
                x = anc.x + (p.x - anc.x) * f;
                y = anc.y + (p.y - anc.y) * f;
                d = Math.min(lim.fuera, Math.hypot(x - anc.x, y - anc.y));
                zona = "limite";
                loc = anc;
                break;
            }
            x = p.x;
            y = p.y;
            d = loc.d;
            nodo = { rama: loc.rama, i: loc.i };
            zona = loc.d > lim.pista ? "fuera" : "pista";
        }
        if (!loc) {
            loc = localizar(rec, nodo, { x: x, y: y }, rec.ancho * 1.25);
            if (loc) {
                d = loc.d;
                zona = loc.d > lim.fuera ? "limite" : (loc.d > lim.pista ? "fuera" : "pista");
            }
        }
        return { x: x, y: y, nodo: nodo, d: d, zona: zona, proy: loc };
    }

    /** ¿El cohete llegó al final de un camino falso? */
    function enCallejon(rec, nodo) {
        if (!nodo || nodo.rama < 0) return false;
        var f = rec.falsos[nodo.rama];
        if (f.lazo) return false;
        return nodo.i >=f.pts.length - 1 - Math.ceil((rec.ancho * 0.28) / rec.paso);
    }

    /** ¿Llegó al coral? (la boca del pez toca la entrada del coral, a medio ancho del final) */
    function enMeta(rec, nodo) {
        return !!nodo && nodo.rama < 0 && nodo.i >= rec.principal.length - 1 - Math.ceil((rec.ancho * 0.55) / rec.paso);
    }

    /** Fracción del camino principal recorrida (0..1) a partir del índice más lejano alcanzado. */
    function fraccion(rec, indice) {
        return Math.max(0, Math.min(1, indice / (rec.principal.length - 1)));
    }

    /** Punto del camino principal a una distancia s (para la estrella de la demo y las pistas). */
    function puntoEn(rec, s, rama) {
        var pts = polilinea(rec, rama == null ? -1 : rama);
        var i = Math.max(0, Math.min(pts.length - 1, s / rec.paso));
        var a = Math.floor(i), b = Math.min(pts.length - 1, a + 1), t = i - a;
        return { x: pts[a].x + (pts[b].x - pts[a].x) * t, y: pts[a].y + (pts[b].y - pts[a].y) * t, ang: Math.atan2(pts[b].y - pts[a].y, pts[b].x - pts[a].x) || 0 };
    }

    /** Revisa un recorrido ya generado (prueba de node): todo dentro, sin cruces, ramales cortos y alejados. */
    function revisarRecorrido(rec) {
        var errores = [];
        var w = rec.ancho;
        var dims = { W: rec.W, H: rec.H };
        var v = validarPrincipal(rec.principal, dims, w);
        if (v) errores.push("principal " + v);
        rec.falsos.forEach(function (f, k) {
            if (f.lazo) {
                if (f.union <= f.raiz) errores.push("lazo " + k + " al revés");
                if (f.raiz < 4 || f.union > rec.principal.length - 5) errores.push("lazo " + k + " raíz");
                if (f.pts[f.pts.length - 1].s > w * 9) errores.push("lazo " + k + " largo");
                return;
            }
            var largo = f.pts[f.pts.length - 1].s;
            if (largo > Math.max(rec.rejilla.cx, rec.rejilla.cy) * 1.1 || largo > w * 3.2) errores.push("ramal " + k + " largo");
            var pf = f.pts[f.pts.length - 1];
            if (dist(pf, rec.meta) < w * 2.4) errores.push("ramal " + k + " cerca de la meta");
            if (f.raiz < 4 || f.raiz > rec.principal.length - 5) errores.push("ramal " + k + " raíz");
        });
        return errores;
    }

    /**
     * Estrellas de un recorrido (1 a 3) según la parte de las burbujas del borde que el pez reventó al salirse.
     * Nunca menos de una: a los 3-4 años se premia siempre el haber llegado.
     * cfgE: { tresHasta, dosHasta } fracciones de burbujas reventadas (por defecto 0,04 y 0,12).
     */
    function estrellas(reventadas, total, cfgE) {
        var c = cfgE || {};
        var tres = c.tresHasta != null ? Number(c.tresHasta) : 0.04;
        var dos = c.dosHasta != null ? Number(c.dosHasta) : 0.12;
        if (!total || total <= 0) return 3;
        var f = Math.max(0, reventadas) / total;
        if (f <= tres) return 3;
        if (f <= dos) return 2;
        return 1;
    }

    var api = {
        estrellas: estrellas,
        semillaNueva: semillaNueva,
        azar: azar,
        rejilla: rejilla,
        generarRecorrido: generarRecorrido,
        generarPartida: generarPartida,
        localizar: localizar,
        limites: limites,
        mover: mover,
        enCallejon: enCallejon,
        enMeta: enMeta,
        fraccion: fraccion,
        puntoEn: puntoEn,
        polilinea: polilinea,
        revisarRecorrido: revisarRecorrido
    };

    global.ReglasPez = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
