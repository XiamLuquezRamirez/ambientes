/**
 * ReglasMapa — geometría y decisiones de "El Mapa Estelar y las Llaves Mágicas" (window.ReglasMapa, y module.exports
 * para las pruebas con node). Puro: no toca el DOM ni Phaser.
 *
 * El laberinto es una cuadrícula de celdas (columnas × filas). Los caminos son TRAMOS rectos entre NODOS (celdas con
 * nombre: inicio, cruces, llaves, caminos sin salida, portal). Todo lo que no es camino es roca. Las coordenadas van
 * en celdas: el centro de la celda (i, j) es (i + 0,5; j + 0,5).
 *
 *   construir(def, cfg)            → laberinto { cols, filas, nodos, tramos, celdas, cruces, sinSalida, llaves, … }
 *   dentro(lab, x, y)              → el centro de la nave cabe ahí (no toca roca)
 *   mover(lab, pos, objetivo, ms, opciones) → { x, y, bloqueado, avance }   sub-pasos + deslizamiento por la pared
 *   zona(lab, x, y)                → { tipo: "cruce" | "sinSalida" | "llave" | "portal" | "inicio", nodo } o null
 *   decidirLlave(lab, estado, id)  → "recoger" | "dormida" | "ya"
 *   decidirPortal(lab, estado)     → "abrir" | "cerrado"
 *   llaveActual(lab, estado)       → la llave que toca buscar (o null si ya están las tres)
 *   ruta(lab, desde, hasta)        → lista de nodos del camino más corto (BFS sobre el grafo)
 *   validar(lab)                   → lista de problemas (vacía si el laberinto está bien armado)
 */
(function (global) {
    "use strict";

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function clave(i, j) { return i + "," + j; }

    /** Construye el laberinto desde la definición del config (nodos con [col, fila] y tramos [a, b]). */
    function construir(def, cfg) {
        cfg = cfg || {};
        var radio = Number(def.radioNave || cfg.radioNave) || 0.3;
        // camino de anchoCamino celdas (1 = una celda; 1,3 = ensanchado 0,15 hacia la roca de cada lado). El margen se
        // queda por debajo de 0,5: el centro de la nave nunca sale de su celda (así no salta a un pasillo vecino).
        var ancho = Number(def.anchoCamino || cfg.anchoCamino) || 1;
        var margen = clamp(ancho / 2 - radio, 0.08, 0.46);
        var lab = {
            id: def.id,
            cols: def.columnas,
            filas: def.filas,
            radio: radio,
            margen: margen,
            nodos: {},
            tramos: [],
            celdas: {},
            listaCeldas: [],
            cruces: [],
            sinSalida: [],
            llaves: [],
            inicio: def.inicio,
            portal: def.portal,
            radioZona: {
                cruce: Number(cfg.radioCruce) || 0.62,
                llave: Number(cfg.radioLlave) || 0.5,
                portal: Number(cfg.radioPortal) || 0.6,
                sinSalida: Number(cfg.radioSinSalida) || 0.55,
                inicio: 0.5
            }
        };
        Object.keys(def.nodos || {}).forEach(function (id) {
            var p = def.nodos[id];
            lab.nodos[id] = { id: id, i: p[0], j: p[1], x: p[0] + 0.5, y: p[1] + 0.5, vecinos: [], tramos: [] };
        });
        (def.tramos || []).forEach(function (par, k) {
            var a = lab.nodos[par[0]], b = lab.nodos[par[1]];
            if (!a || !b) return;
            var t = {
                k: k, a: a.id, b: b.id,
                x0: Math.min(a.x, b.x) - margen, x1: Math.max(a.x, b.x) + margen,
                y0: Math.min(a.y, b.y) - margen, y1: Math.max(a.y, b.y) + margen,
                recto: a.i === b.i || a.j === b.j,
                celdas: []
            };
            var di = Math.sign(b.i - a.i), dj = Math.sign(b.j - a.j);
            var n = Math.max(Math.abs(b.i - a.i), Math.abs(b.j - a.j));
            for (var s = 0; s <= n; s++) {
                var ci = a.i + di * s, cj = a.j + dj * s;
                var kk = clave(ci, cj);
                t.celdas.push(kk);
                if (!lab.celdas[kk]) {
                    lab.celdas[kk] = { i: ci, j: cj, tramos: [] };
                    lab.listaCeldas.push(lab.celdas[kk]);
                }
                lab.celdas[kk].tramos.push(k);
            }
            t.largo = n;
            lab.tramos.push(t);
            a.vecinos.push(b.id);
            b.vecinos.push(a.id);
            a.tramos.push(k);
            b.tramos.push(k);
        });
        var especiales = {};
        especiales[lab.inicio] = true;
        especiales[lab.portal] = true;
        (def.llaves || []).forEach(function (L, orden) {
            especiales[L.nodo] = true;
            lab.llaves.push({ id: L.id, nodo: L.nodo, color: L.color, nombre: L.nombre || L.id, orden: orden });
        });
        Object.keys(lab.nodos).forEach(function (id) {
            var n = lab.nodos[id];
            if (n.vecinos.length >= 3) lab.cruces.push(id);
            else if (n.vecinos.length === 1 && !especiales[id]) lab.sinSalida.push(id);
        });
        return lab;
    }

    function esCamino(lab, i, j) {
        return !!lab.celdas[clave(i, j)];
    }

    /** El centro de la nave cabe en (x, y): está dentro de la franja de algún tramo. */
    function dentro(lab, x, y) {
        for (var k = 0; k < lab.tramos.length; k++) {
            var t = lab.tramos[k];
            if (x >= t.x0 && x <= t.x1 && y >= t.y0 && y <= t.y1) return true;
        }
        return false;
    }

    /**
     * Mueve la nave de pos hacia objetivo durante ms milisegundos, sin atravesar roca. Sub-pasos cortos (la nave no
     * salta a un pasillo vecino a través de la pared) y deslizamiento: si el paso completo choca, prueba solo en x o
     * solo en y (así la nave dobla las esquinas sin trabarse).
     *   opciones: { velMax (celdas/s), factor (0..1, se frena en los cruces) }
     */
    function mover(lab, pos, objetivo, ms, opciones) {
        opciones = opciones || {};
        var vel = (Number(opciones.velMax) || 6) * (opciones.factor == null ? 1 : opciones.factor);
        var maxD = vel * Math.max(0, ms) / 1000;
        var dx = objetivo.x - pos.x, dy = objetivo.y - pos.y;
        var d = Math.hypot(dx, dy);
        var res = { x: pos.x, y: pos.y, bloqueado: false, avance: 0 };
        if (d < 1e-4) return res;
        var paso = Math.min(d, maxD);
        var n = Math.max(1, Math.ceil(paso / 0.04));
        var sx = dx / d * paso / n, sy = dy / d * paso / n;
        var x = pos.x, y = pos.y;
        for (var s = 0; s < n; s++) {
            if (dentro(lab, x + sx, y + sy)) {
                x += sx;
                y += sy;
            } else if (Math.abs(sx) > 1e-5 && dentro(lab, x + sx, y)) {
                x += sx;
                res.bloqueado = true;
            } else if (Math.abs(sy) > 1e-5 && dentro(lab, x, y + sy)) {
                y += sy;
                res.bloqueado = true;
            } else {
                res.bloqueado = true;
                break;
            }
        }
        res.avance = Math.hypot(x - pos.x, y - pos.y);
        res.x = x;
        res.y = y;
        return res;
    }

    /** El punto transitable más cercano a (x, y) y a qué distancia queda (0 si ya es transitable). */
    function puntoCercano(lab, x, y) {
        var mejor = null, md = Infinity;
        lab.tramos.forEach(function (t) {
            var px = clamp(x, t.x0, t.x1), py = clamp(y, t.y0, t.y1);
            var d = Math.hypot(px - x, py - y);
            if (d < md) { md = d; mejor = { x: px, y: py }; }
        });
        mejor.fuera = md;
        return mejor;
    }

    /** El segmento a→b queda entero dentro de los caminos (muestras cada 0,05 celdas). */
    function visible(lab, a, b) {
        var d = Math.hypot(b.x - a.x, b.y - a.y);
        var n = Math.max(1, Math.ceil(d / 0.05));
        for (var k = 1; k <= n; k++) {
            if (!dentro(lab, a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)) return false;
        }
        return true;
    }

    /** Camino más corto entre dos celdas de camino (BFS por celdas vecinas); lista de celdas sin la de salida. */
    function rutaCeldas(lab, i0, j0, i1, j1) {
        var ini = clave(i0, j0), fin = clave(i1, j1);
        if (!lab.celdas[ini] || !lab.celdas[fin]) return null;
        if (ini === fin) return [];
        var previo = {};
        previo[ini] = null;
        var cola = [ini];
        while (cola.length) {
            var k = cola.shift();
            if (k === fin) break;
            var c = lab.celdas[k];
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
                var kk = clave(c.i + d[0], c.j + d[1]);
                if (lab.celdas[kk] && !(kk in previo)) {
                    previo[kk] = k;
                    cola.push(kk);
                }
            });
        }
        if (!(fin in previo)) return null;
        var r = [];
        for (var x = fin; x !== ini; x = previo[x]) r.unshift(lab.celdas[x]);
        return r;
    }

    /**
     * Arrastre guiado: la nave sigue al dedo POR LOS CAMINOS. El dedo se lleva al punto transitable más cercano; si
     * hay una esquina de por medio, la nave va primero al centro de la última celda que ve en línea recta (dobla sola,
     * sin trabarse en el muro). Si para llegar al dedo habría que dar un rodeo largo (el dedo cruzó una pared hacia
     * otro pasillo), no se sigue: la nave se queda contra el muro y se marca "desvio" para avisar.
     *   → { x, y, bloqueado, avance, fuera (celdas del dedo al camino), desvio }
     */
    function guiar(lab, pos, dedo, ms, opciones) {
        var q = puntoCercano(lab, dedo.x, dedo.y);
        var objetivo = q;
        var desvio = false;
        if (!visible(lab, pos, q)) {
            var i0 = Math.floor(pos.x), j0 = Math.floor(pos.y);
            var ruta2 = rutaCeldas(lab, i0, j0, Math.floor(q.x), Math.floor(q.y));
            var recta = Math.abs(Math.floor(q.x) - i0) + Math.abs(Math.floor(q.y) - j0);
            var maxRodeo = Math.max(4, recta * 1.6 + 2);
            if (!ruta2 || ruta2.length > maxRodeo) {
                desvio = true;
            } else {
                objetivo = null;
                for (var k = ruta2.length - 1; k >= 0; k--) {
                    var c = { x: ruta2[k].i + 0.5, y: ruta2[k].j + 0.5 };
                    if (visible(lab, pos, c)) { objetivo = c; break; }
                }
                if (!objetivo) objetivo = { x: i0 + 0.5, y: j0 + 0.5 };
            }
        }
        var res = mover(lab, pos, objetivo, ms, opciones);
        res.fuera = q.fuera;
        res.desvio = desvio;
        return res;
    }

    /** Qué hay en (x, y): un cruce, un camino sin salida, una llave, el portal o la salida. */
    function zona(lab, x, y) {
        var mejor = null;
        var md = Infinity;
        var revisar = function (id, tipo) {
            var n = lab.nodos[id];
            if (!n) return;
            var d = Math.hypot(n.x - x, n.y - y);
            if (d <= lab.radioZona[tipo] && d < md) {
                md = d;
                mejor = { tipo: tipo, nodo: id };
            }
        };
        lab.llaves.forEach(function (L) { revisar(L.nodo, "llave"); });
        revisar(lab.portal, "portal");
        lab.cruces.forEach(function (id) { revisar(id, "cruce"); });
        lab.sinSalida.forEach(function (id) { revisar(id, "sinSalida"); });
        revisar(lab.inicio, "inicio");
        if (mejor && mejor.tipo === "llave") {
            var L = lab.llaves.filter(function (l) { return l.nodo === mejor.nodo; })[0];
            mejor.llave = L ? L.id : null;
        }
        return mejor;
    }

    function llaveActual(lab, estado) {
        var hechas = (estado && estado.recogidas) || [];
        for (var i = 0; i < lab.llaves.length; i++) {
            if (hechas.indexOf(lab.llaves[i].id) < 0) return lab.llaves[i];
        }
        return null;
    }

    /** Las llaves se recogen en orden (roja, verde, azul): la que no toca todavía está "dormida" y no se pierde. */
    function decidirLlave(lab, estado, id) {
        var hechas = (estado && estado.recogidas) || [];
        if (hechas.indexOf(id) >= 0) return "ya";
        var act = llaveActual(lab, estado);
        return act && act.id === id ? "recoger" : "dormida";
    }

    function decidirPortal(lab, estado) {
        return llaveActual(lab, estado) ? "cerrado" : "abrir";
    }

    /** Camino más corto entre dos nodos (lista de ids, incluidos los extremos). */
    function ruta(lab, desde, hasta) {
        if (!lab.nodos[desde] || !lab.nodos[hasta]) return [];
        var previo = {};
        previo[desde] = null;
        var cola = [desde];
        while (cola.length) {
            var n = cola.shift();
            if (n === hasta) break;
            lab.nodos[n].vecinos.forEach(function (v) {
                if (!(v in previo)) {
                    previo[v] = n;
                    cola.push(v);
                }
            });
        }
        if (!(hasta in previo)) return [];
        var r = [];
        for (var c = hasta; c !== null; c = previo[c]) r.unshift(c);
        return r;
    }

    /** Problemas del laberinto: tramos diagonales, celdas pegadas de pasillos distintos, nodos sin conexión, llaves. */
    function validar(lab) {
        var err = [];
        lab.tramos.forEach(function (t) {
            if (!t.recto) err.push("tramo diagonal " + t.a + "-" + t.b);
        });
        lab.listaCeldas.forEach(function (c) {
            if (c.i < 0 || c.j < 0 || c.i >= lab.cols || c.j >= lab.filas) err.push("celda fuera " + c.i + "," + c.j);
            [[1, 0], [0, 1]].forEach(function (d) {
                var o = lab.celdas[clave(c.i + d[0], c.j + d[1])];
                if (!o) return;
                var comparten = c.tramos.some(function (k) { return o.tramos.indexOf(k) >= 0; });
                if (!comparten) err.push("pasillos pegados sin pared en " + c.i + "," + c.j + " y " + o.i + "," + o.j);
            });
        });
        Object.keys(lab.nodos).forEach(function (id) {
            if (!lab.nodos[id].vecinos.length) err.push("nodo suelto " + id);
            else if (!ruta(lab, lab.inicio, id).length) err.push("nodo inalcanzable " + id);
        });
        if (!lab.nodos[lab.inicio]) err.push("sin inicio");
        if (!lab.nodos[lab.portal]) err.push("sin portal");
        if (lab.llaves.length !== 3) err.push("se esperan 3 llaves");
        lab.llaves.forEach(function (L) {
            if (!lab.nodos[L.nodo]) err.push("llave sin nodo " + L.id);
        });
        return err;
    }

    // ------------------------------------------------------------------ generación aleatoria

    /** Generador pseudoaleatorio con semilla (las pruebas repiten un mapa; el juego usa Math.random). */
    function azarCon(semilla) {
        if (semilla == null) return Math.random;
        var s = semilla >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function distancias(adj, desde) {
        var d = {};
        d[desde] = 0;
        var cola = [desde];
        while (cola.length) {
            var n = cola.shift();
            adj[n].forEach(function (v) {
                if (!(v in d)) { d[v] = d[n] + 1; cola.push(v); }
            });
        }
        return d;
    }

    function rutaAdj(adj, a, b) {
        var prev = {};
        prev[a] = null;
        var cola = [a];
        while (cola.length) {
            var n = cola.shift();
            if (n === b) break;
            adj[n].forEach(function (v) { if (!(v in prev)) { prev[v] = n; cola.push(v); } });
        }
        var r = [];
        for (var c = b; c != null; c = prev[c]) r.unshift(c);
        return r;
    }

    /**
     * Un intento de laberinto. Los cruces posibles son las celdas pares (col y fila pares) de la cuadrícula; entre dos
     * vecinos el pasillo pasa por la celda impar del medio, así que entre pasillos distintos siempre queda roca.
     *   1. Árbol al azar (Prim) desde la salida, abajo a la izquierda, hasta cubrir `cobertura` de los puntos.
     *   2. El portal, arriba a la derecha, se cuelga como hoja de un vecino del árbol.
     *   3. Las tres llaves van en hojas (finales de ramal): roja cerca, verde a media distancia, azul lejos; el camino a
     *      cada una pasa por al menos un cruce.
     *   4. `ciclos` pasillos extra unen ramas (caminos que se conectan), sin tocar llaves ni portal.
     * Devuelve la definición (como la de config) o null si el intento no cumple los mínimos.
     */
    function intentoLaberinto(op, azar, llavesDef) {
        var cols = op.columnas, filas = op.filas;
        var nx = (cols + 1) / 2, ny = (filas + 1) / 2;
        var id = function (a, b) { return a + "_" + b; };
        var S = id(0, ny - 1), P = id(nx - 1, 0);
        var vecinosDe = function (n) {
            var p = n.split("_").map(Number), r = [];
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
                var a = p[0] + d[0], b = p[1] + d[1];
                if (a >= 0 && b >= 0 && a < nx && b < ny) r.push(id(a, b));
            });
            return r;
        };
        var adj = {};
        adj[S] = [];
        var meta = Math.round(nx * ny * (op.cobertura || 0.75));
        var frontera = vecinosDe(S).filter(function (v) { return v !== P; }).map(function (v) { return [S, v]; });
        var dentroArbol = 1;
        while (frontera.length && dentroArbol < meta) {
            var k = Math.floor(azar() * frontera.length);
            var e = frontera.splice(k, 1)[0];
            if (adj[e[1]]) continue;
            adj[e[1]] = [e[0]];
            adj[e[0]].push(e[1]);
            dentroArbol++;
            vecinosDe(e[1]).forEach(function (v) { if (!adj[v] && v !== P) frontera.push([e[1], v]); });
        }
        var anclas = vecinosDe(P).filter(function (v) { return adj[v]; });
        if (!anclas.length) return null;
        var ancla = anclas[Math.floor(azar() * anclas.length)];
        adj[P] = [ancla];
        adj[ancla].push(P);

        var dist = distancias(adj, S);
        var hojas = Object.keys(adj).filter(function (n) { return n !== S && n !== P && adj[n].length === 1; });
        var minSin = op.sinSalidaMin || 2;
        if (hojas.length < 3 + minSin) return null;
        hojas.sort(function (a, b) { return dist[a] - dist[b]; });
        var pasaCruce = function (n) {
            return rutaAdj(adj, S, n).slice(0, -1).some(function (m) { return adj[m].length >= 3; });
        };
        var tercio = Math.max(1, Math.floor(hojas.length / 3));
        var elegir = function (lista) {
            var buenas = lista.filter(pasaCruce);
            return buenas.length ? buenas[Math.floor(azar() * buenas.length)] : null;
        };
        var roja = elegir(hojas.slice(0, tercio));
        var azul = elegir(hojas.slice(hojas.length - tercio));
        var resto = hojas.filter(function (h) { return h !== roja && h !== azul && dist[h] >= (roja ? dist[roja] : 0) && dist[h] <= (azul ? dist[azul] : 0); });
        var verde = elegir(resto.slice(Math.floor(resto.length / 4), Math.max(Math.floor(resto.length / 4) + 1, Math.ceil(resto.length * 3 / 4))));
        if (!roja || !verde || !azul || roja === verde || verde === azul) return null;
        if (!(dist[roja] <= dist[verde] && dist[verde] <= dist[azul])) return null;

        // ciclos: pasillos extra entre dos puntos del árbol que no estén unidos (ni llaves ni portal ni la salida)
        var fijos = {};
        [S, P, roja, verde, azul].forEach(function (n) { fijos[n] = true; });
        var candidatos = [];
        Object.keys(adj).forEach(function (n) {
            vecinosDe(n).forEach(function (v) {
                if (n < v && adj[v] && !fijos[n] && !fijos[v] && adj[n].indexOf(v) < 0) candidatos.push([n, v]);
            });
        });
        var puestos = 0;
        while (puestos < (op.ciclos || 0) && candidatos.length) {
            var c = candidatos.splice(Math.floor(azar() * candidatos.length), 1)[0];
            // que el ciclo sea largo (une ramas lejanas en el árbol), no un cuadradito
            if (Math.abs(dist[c[0]] - dist[c[1]]) + 1 < 4) continue;
            var sinSalidaQueda = Object.keys(adj).filter(function (n) { return !fijos[n] && adj[n].length === 1 && n !== c[0] && n !== c[1]; }).length;
            if (sinSalidaQueda < minSin) continue;
            adj[c[0]].push(c[1]);
            adj[c[1]].push(c[0]);
            puestos++;
        }
        if (puestos < (op.ciclos || 0)) return null;

        var def = { id: op.id, columnas: cols, filas: filas, inicio: "S", portal: "P", nodos: {}, tramos: [], llaves: [] };
        var nombre = {};
        nombre[S] = "S";
        nombre[P] = "P";
        var keysIds = { roja: roja, verde: verde, azul: azul };
        Object.keys(adj).forEach(function (n) {
            var p = n.split("_").map(Number);
            var nm = nombre[n] || ("N" + p[0] + "_" + p[1]);
            nombre[n] = nm;
            def.nodos[nm] = [p[0] * 2, p[1] * 2];
        });
        Object.keys(adj).forEach(function (n) {
            adj[n].forEach(function (v) { if (n < v) def.tramos.push([nombre[n], nombre[v]]); });
        });
        (llavesDef || []).forEach(function (L) {
            def.llaves.push({ id: L.id, nodo: nombre[keysIds[L.id]], color: L.color, nombre: L.nombre || L.id });
        });
        return def;
    }

    /**
     * Laberinto aleatorio para un nivel: repite intentos hasta que cumple los mínimos (cruces, caminos sin salida,
     * llaves en orden) y valida. op: { id, columnas, filas (impares), cobertura, ciclos, sinSalidaMin, crucesMin }.
     */
    function generar(op, llavesDef, semilla) {
        var azar = azarCon(semilla);
        for (var intento = 0; intento < 400; intento++) {
            var def = intentoLaberinto(op, azar, llavesDef);
            if (!def) continue;
            var lab = construir(def, {});
            if (validar(lab).length) continue;
            if (lab.cruces.length < (op.crucesMin || 3)) continue;
            if (lab.sinSalida.length < (op.sinSalidaMin || 2)) continue;
            // los ciclos pueden acortar caminos: la roja sigue siendo la más cercana y la azul la más lejana
            var d = lab.llaves.map(function (L) { return ruta(lab, lab.inicio, L.nodo).length; });
            if (!(d[0] <= d[1] && d[1] <= d[2])) continue;
            def.intentos = intento + 1;
            return def;
        }
        return null;
    }

    var api = {
        construir: construir,
        generar: generar,
        esCamino: esCamino,
        dentro: dentro,
        mover: mover,
        guiar: guiar,
        puntoCercano: puntoCercano,
        zona: zona,
        llaveActual: llaveActual,
        decidirLlave: decidirLlave,
        decidirPortal: decidirPortal,
        ruta: ruta,
        validar: validar
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    global.ReglasMapa = api;
})(typeof window !== "undefined" ? window : globalThis);
