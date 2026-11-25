/**
 * ReglasMaquina — reglas puras de "La Máquina de Engranajes y Poleas" (window.ReglasMaquina).
 * Sin DOM ni Phaser: se cargan también en Node para las pruebas.
 *
 * Geometría de engranajes (todos con el mismo módulo m dentro de un nivel):
 *   radio primitivo r = m·z/2, exterior ra = r + m, raíz rf = r − 1,25·m
 *   distancia entre centros de dos ruedas que engranan = m·(z1 + z2)/2
 * Cada eje hijo se ubica desde su padre con un ángulo; así la distancia es siempre la de engrane.
 *
 * Fase: con la dirección θ del padre al hijo, el diente del padre que toca θ cae en un hueco del
 * hijo cuando  φhijo = θ(1 + zp/zh) + π − π/zh − (zp/zh)·φpadre.  Por eso cada rueda se escribe
 * como φ = a·φ0 + b (φ0 = ángulo de la rueda principal): a = −a_padre·zp/zh (sentido contrario y
 * más rápida si tiene menos dientes). Las poleas del mismo eje copian a; una correa abierta da
 * a2 = a1·r1/r2 (mismo sentido).
 */
(function (global) {
    "use strict";

    var DIENTES = { grande: 20, mediano: 14, pequeno: 10 };
    var POLEAS = { grande: 5.5, pequena: 3.6 };
    var DOS_PI = Math.PI * 2;

    function rad(g) { return g * Math.PI / 180; }
    function jcfg(cfg) { return (cfg && cfg.juego) || {}; }
    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
    function niveles(cfg) { return (cfg && cfg.nivelesJuego) || []; }
    function nivel(cfg, i) { return niveles(cfg)[i] || null; }
    function mod(a, n) { return ((a % n) + n) % n; }

    function dientes(cfg, talla) {
        var d = jcfg(cfg).dientes || {};
        return num(d[talla], DIENTES[talla] || 12);
    }

    function radioPolea(cfg, talla, m) {
        var p = jcfg(cfg).poleas || {};
        return num(p[talla], POLEAS[talla] || 4) * m;
    }

    // ------------------------------------------------------------------ geometría del nivel

    /**
     * Resuelve posiciones y radios. Devuelve:
     *   { modulo, ejes: { id: eje }, lista: [ejes de piezas en orden], correas: [...], fijos: { poleas, correas }, tablero, estacion }
     * eje = { id, tipo, talla, padre, sobre, angulo, lugar, x, y, z, r, ra, rf, fijo }
     */
    function geometria(cfg, def) {
        var m = num(def.modulo, 10);
        var ejes = {};
        var pendientes = (def.ejes || []).map(function (e) { var c = copiar(e); c.fijo = false; return c; })
            .concat(((def.fijos || {}).poleas || []).map(function (e) { var c = copiar(e); c.fijo = true; c.tipo = "polea"; return c; }));
        var vueltas = 0;
        while (pendientes.length && vueltas < 50) {
            vueltas += 1;
            pendientes = pendientes.filter(function (e) {
                if (e.tipo === "engranaje") {
                    e.z = dientes(cfg, e.talla);
                    e.r = m * e.z / 2;
                    e.ra = e.r + m;
                    e.rf = e.r - 1.25 * m;
                    if (e.padre) {
                        var p = ejes[e.padre];
                        if (!p) return true;
                        var d = m * (p.z + e.z) / 2;
                        e.x = p.x + d * Math.cos(rad(e.angulo || 0));
                        e.y = p.y + d * Math.sin(rad(e.angulo || 0));
                        e.distancia = d;
                    }
                } else {
                    e.tipo = "polea";
                    e.r = radioPolea(cfg, e.talla, m);
                    e.ra = e.r + m * 0.55;
                    e.rf = e.r;
                    if (e.sobre) {
                        var s = ejes[e.sobre];
                        if (!s) return true;
                        e.x = s.x;
                        e.y = s.y;
                    }
                }
                ejes[e.id] = e;
                return false;
            });
        }
        var lista = (def.ejes || []).map(function (e) { return ejes[e.id]; }).filter(Boolean);
        var correas = (def.correas || []).map(function (c) {
            var k = copiar(c);
            k.tipo = "correa";
            k.talla = "correa";
            k.fijo = false;
            return k;
        });
        var fijas = ((def.fijos || {}).correas || []).map(function (c) {
            var k = copiar(c);
            k.tipo = "correa";
            k.talla = "correa";
            k.fijo = true;
            return k;
        });
        correas.concat(fijas).forEach(function (c) {
            var a = ejes[c.entre[0]], b = ejes[c.entre[1]];
            if (a && b) {
                c.x = (a.x + b.x) / 2;
                c.y = (a.y + b.y) / 2;
            }
        });
        var geo = {
            modulo: m,
            ejes: ejes,
            lista: lista,
            correas: correas,
            fijos: { poleas: Object.keys(ejes).map(function (k) { return ejes[k]; }).filter(function (e) { return e.fijo; }), correas: fijas },
            tablero: def.tablero || { x0: 480, y0: 140, x1: 1300, y1: 780 },
            estacion: def.estacion || null
        };
        lista.concat(correas).forEach(function (e) { if (!e.lugar) e.lugar = lugarAuto(cfg, geo, e); });
        return geo;
    }

    /**
     * «Dónde va» dicho por Zoe cuando el nivel no lo trae escrito: por la posición del eje en el
     * tablero (arriba / del medio / abajo, izquierda / centro / derecha), el centro de la rueda que
     * lleva la polea, la estación de poleas o las dos poleas de la correa.
     */
    function lugarAuto(cfg, geo, e) {
        var T = geo.tablero, E = geo.estacion;
        if (e.tipo === "correa") return "las dos poleas que brillan";
        if (e.sobre) {
            var g = geo.ejes[e.sobre];
            return "el centro de " + nombre(cfg, "engranaje", g ? g.talla : "grande").con;
        }
        var dentro = function (z) { return z && e.x > z.x0 && e.x < z.x1 && e.y > z.y0 && e.y < z.y1; };
        if (e.tipo === "polea" && dentro(E)) {
            var otras = geo.lista.filter(function (o) { return o !== e && o.tipo === "polea" && !o.sobre && dentro(E); });
            if (!otras.length) return "la estación de poleas";
            var arriba = otras.every(function (o) { return e.y < o.y; });
            return arriba ? "la parte de arriba de la estación de poleas" : "la parte de abajo de la estación de poleas";
        }
        // la posición se mide dentro del grupo de ruedas (no del tablero: la estación ocupa un lado)
        var rs = geo.lista.filter(function (o) { return o.tipo === "engranaje"; });
        var x0 = Math.min.apply(null, rs.map(function (o) { return o.x; })), x1 = Math.max.apply(null, rs.map(function (o) { return o.x; }));
        var y0 = Math.min.apply(null, rs.map(function (o) { return o.y; })), y1 = Math.max.apply(null, rs.map(function (o) { return o.y; }));
        var w = Math.max(120, x1 - x0), h = Math.max(120, y1 - y0);
        var dx = e.x - (x0 + x1) / 2, dy = e.y - (y0 + y1) / 2;
        var v = dy < -h * 0.18 ? "de arriba" : (dy > h * 0.18 ? "de abajo" : "del medio");
        var hz = dx < -w * 0.18 ? " a la izquierda" : (dx > w * 0.18 ? " a la derecha" : ", en el centro");
        var junto = e.padre && geo.ejes[e.padre] ? ", junto a " + nombre(cfg, "engranaje", geo.ejes[e.padre].talla).con : "";
        return "el eje " + v + hz + junto;
    }

    function copiar(o) {
        var c = {};
        Object.keys(o || {}).forEach(function (k) { c[k] = o[k]; });
        return c;
    }

    /** Destinos donde se suelta algo: ejes de piezas y correas de piezas, en el orden del nivel. */
    function destinos(geo) {
        return geo.lista.concat(geo.correas);
    }

    function destino(geo, id) {
        return destinos(geo).filter(function (d) { return d.id === id; })[0] || null;
    }

    /** Piezas de la bandeja: una por eje y una por correa. */
    function piezas(geo) {
        return destinos(geo).map(function (d) {
            return { id: "pz-" + d.id, tipo: d.tipo, talla: d.talla, para: d.id };
        });
    }

    /** ¿Se puede usar ya el destino? La rueda hija necesita a su padre; la polea del eje, a su rueda; la correa, a sus dos poleas. */
    function habilitado(d, geo, puestos) {
        if (!d) return false;
        if (d.tipo === "correa") {
            return d.entre.every(function (id) {
                var e = geo.ejes[id];
                return e && (e.fijo || !!puestos[id]);
            });
        }
        if (d.padre) return !!puestos[d.padre];
        if (d.sobre) return !!puestos[d.sobre];
        return true;
    }

    function completo(geo, puestos) {
        return destinos(geo).every(function (d) { return !!puestos[d.id]; });
    }

    function faltan(geo, puestos) {
        return destinos(geo).filter(function (d) { return !puestos[d.id]; }).length;
    }

    /** Lo que sigue: el primer destino libre y habilitado; si hay pieza elegida, uno que le sirva. */
    function siguiente(geo, puestos, tipo, talla) {
        var libres = destinos(geo).filter(function (d) { return !puestos[d.id] && habilitado(d, geo, puestos); });
        if (tipo) {
            var mio = libres.filter(function (d) { return d.tipo === tipo && d.talla === talla; })[0];
            if (mio) return mio;
        }
        return libres[0] || null;
    }

    /**
     * Evalúa un soltado.
     * datos: { tipo, talla, radio, radioCasi, destinos: [{ id, tipo, talla, distancia, ocupado, habilitado }] }
     * → { acierto, destino, motivo }  motivo: correcto | otraTalla | otraPieza | orden | ocupado | casi | fuera
     */
    function evaluar(datos) {
        var lista = (datos.destinos || []).slice().sort(function (a, b) { return a.distancia - b.distancia; });
        var radio = num(datos.radio, 80);
        var casi = num(datos.radioCasi, radio * 2);
        var sirve = function (d) { return d.tipo === datos.tipo && d.talla === datos.talla; };
        var mismos = lista.filter(function (d) { return d.tipo === datos.tipo && d.distancia <= radio; });
        var ok = mismos.filter(function (d) { return sirve(d) && !d.ocupado && d.habilitado; })[0];
        if (ok) return { acierto: true, destino: ok.id, motivo: "correcto" };
        if (mismos.length) {
            var d = mismos[0];
            if (d.ocupado) return { acierto: false, destino: d.id, motivo: "ocupado" };
            if (!sirve(d)) return { acierto: false, destino: d.id, motivo: "otraTalla" };
            return { acierto: false, destino: d.id, motivo: "orden" };
        }
        var otros = lista.filter(function (d) { return d.tipo !== datos.tipo && d.distancia <= radio && !d.ocupado; });
        if (otros.length) return { acierto: false, destino: otros[0].id, motivo: "otraPieza" };
        var cerca = lista.filter(function (d) { return sirve(d) && !d.ocupado && d.habilitado && d.distancia <= casi; })[0];
        if (cerca) return { acierto: false, destino: cerca.id, motivo: "casi" };
        return { acierto: false, destino: null, motivo: "fuera" };
    }

    /** El destino más cercano que le sirve a la pieza (para el imán y el aro verde). */
    function cercano(datos, radioCerca) {
        var mejor = null;
        (datos.destinos || []).forEach(function (d) {
            if (d.tipo !== datos.tipo || d.talla !== datos.talla || d.ocupado || !d.habilitado) return;
            if (d.distancia > radioCerca) return;
            if (!mejor || d.distancia < mejor.distancia) mejor = d;
        });
        if (!mejor) return null;
        return { id: mejor.id, distancia: mejor.distancia, fuerza: Math.max(0, Math.min(1, 1 - mejor.distancia / radioCerca)) };
    }

    /** Fracción de imán: 0 lejos, tope `tope` en el centro (nunca encaja solo). */
    function iman(distancia, radio, tope) {
        if (distancia >= radio) return 0;
        var u = 1 - distancia / radio;
        return Math.max(0, Math.min(0.9, num(tope, 0.35))) * u * u;
    }

    // ------------------------------------------------------------------ dientes y transmisión

    /** Ángulo que debe tener la rueda hija para que sus dientes encajen con los del padre. */
    function fase(padre, hijo, phiPadre) {
        var theta = Math.atan2(hijo.y - padre.y, hijo.x - padre.x);
        var k = padre.z / hijo.z;
        return theta * (1 + k) + Math.PI - Math.PI / hijo.z - k * phiPadre;
    }

    /** Fase relativa del diente en la dirección θ: 0 = centro de diente, 0,5 = centro de hueco. */
    function faseDiente(rueda, phi, theta) {
        return mod((theta - phi) * rueda.z / DOS_PI, 1);
    }

    /** Relación de giro de cada eje respecto de la rueda principal (a en φ = a·φ0 + b). */
    function relaciones(geo) {
        var a = {};
        var raiz = geo.lista.filter(function (e) { return e.tipo === "engranaje" && !e.padre; })[0];
        if (!raiz) return a;
        a[raiz.id] = 1;
        var todos = Object.keys(geo.ejes).map(function (k) { return geo.ejes[k]; });
        var correas = geo.correas.concat(geo.fijos.correas);
        for (var vuelta = 0; vuelta < 20; vuelta++) {
            var cambio = false;
            todos.forEach(function (e) {
                if (a[e.id] != null) return;
                if (e.tipo === "engranaje" && e.padre && a[e.padre] != null) {
                    a[e.id] = -a[e.padre] * geo.ejes[e.padre].z / e.z;
                    cambio = true;
                } else if (e.tipo === "polea" && e.sobre && a[e.sobre] != null) {
                    a[e.id] = a[e.sobre];
                    cambio = true;
                }
            });
            correas.forEach(function (c) {
                var p = geo.ejes[c.entre[0]], q = geo.ejes[c.entre[1]];
                if (!p || !q) return;
                if (a[p.id] != null && a[q.id] == null) { a[q.id] = a[p.id] * p.r / q.r; cambio = true; }
                else if (a[q.id] != null && a[p.id] == null) { a[p.id] = a[q.id] * q.r / p.r; cambio = true; }
            });
            if (!cambio) break;
        }
        return a;
    }

    /** Sentido de giro visible: "horario" o "antihorario" (a > 0 con la principal en sentido horario). */
    function sentido(a) { return a >= 0 ? "horario" : "antihorario"; }

    // ------------------------------------------------------------------ correas

    /**
     * Correa abierta entre dos círculos: tangentes exteriores y arcos.
     * Recorrido: recta 1 (p→q) → arco en q → recta 2 (q→p) → arco en p. El ángulo baja al avanzar.
     */
    function correa(p, q) {
        var dx = q.x - p.x, dy = q.y - p.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var th = Math.atan2(dy, dx);
        var b = Math.acos(Math.max(-1, Math.min(1, (p.r - q.r) / d)));
        var recta = Math.sqrt(Math.max(0, d * d - (p.r - q.r) * (p.r - q.r)));
        var pa = { x: p.x + p.r * Math.cos(th + b), y: p.y + p.r * Math.sin(th + b) };
        var qa = { x: q.x + q.r * Math.cos(th + b), y: q.y + q.r * Math.sin(th + b) };
        var qb = { x: q.x + q.r * Math.cos(th - b), y: q.y + q.r * Math.sin(th - b) };
        var pb = { x: p.x + p.r * Math.cos(th - b), y: p.y + p.r * Math.sin(th - b) };
        var arcoQ = q.r * 2 * b;
        var arcoP = p.r * (DOS_PI - 2 * b);
        return {
            p: p, q: q, theta: th, beta: b,
            rectas: [[pa, qa], [qb, pb]],
            largo: recta * 2 + arcoQ + arcoP,
            tramos: [recta, arcoQ, recta, arcoP]
        };
    }

    /** Punto y dirección a la distancia s del recorrido. */
    function puntoCorrea(c, s) {
        var L = c.largo;
        var t = mod(s, L);
        var r0 = c.tramos[0], a0 = c.tramos[1];
        var lerp = function (A, B, u) { return { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u }; };
        var ang;
        if (t < r0) {
            var P = lerp(c.rectas[0][0], c.rectas[0][1], t / r0);
            return { x: P.x, y: P.y, ang: Math.atan2(c.rectas[0][1].y - c.rectas[0][0].y, c.rectas[0][1].x - c.rectas[0][0].x) };
        }
        t -= r0;
        if (t < a0) {
            ang = c.theta + c.beta - t / c.q.r;
            return { x: c.q.x + c.q.r * Math.cos(ang), y: c.q.y + c.q.r * Math.sin(ang), ang: ang - Math.PI / 2 };
        }
        t -= a0;
        if (t < r0) {
            var Q = lerp(c.rectas[1][0], c.rectas[1][1], t / r0);
            return { x: Q.x, y: Q.y, ang: Math.atan2(c.rectas[1][1].y - c.rectas[1][0].y, c.rectas[1][1].x - c.rectas[1][0].x) };
        }
        t -= r0;
        ang = c.theta - c.beta - t / c.p.r;
        return { x: c.p.x + c.p.r * Math.cos(ang), y: c.p.y + c.p.r * Math.sin(ang), ang: ang - Math.PI / 2 };
    }

    /** Distancia de un punto a un segmento. */
    function distSegmento(px, py, A, B) {
        var vx = B.x - A.x, vy = B.y - A.y;
        var l2 = vx * vx + vy * vy;
        var u = l2 ? Math.max(0, Math.min(1, ((px - A.x) * vx + (py - A.y) * vy) / l2)) : 0;
        var x = A.x + vx * u - px, y = A.y + vy * u - py;
        return Math.sqrt(x * x + y * y);
    }

    /** Distancia de un punto a la zona de una correa (el segmento entre los centros de sus poleas). */
    function distanciaCorrea(geo, c, x, y) {
        var p = geo.ejes[c.entre[0]], q = geo.ejes[c.entre[1]];
        if (!p || !q) return Infinity;
        return distSegmento(x, y, p, q);
    }

    // ------------------------------------------------------------------ máquina secundaria

    var MAQUINA_EJE = { ventilador: "f-ventilador", cinta: "f-cinta", noria: "p2", fabrica: "p3" };

    /** Eje (polea) que mueve la máquina secundaria del nivel. */
    function ejeMaquina(def) {
        return (def && (def.maquinaEje || MAQUINA_EJE[def.maquina])) || null;
    }

    /** Fin de la cinta transportadora (cinta: hacia la derecha; fábrica: hacia la izquierda). */
    function finCinta(def, d) {
        if (def.cintaHasta != null) return Number(def.cintaHasta);
        return def.maquina === "fabrica" ? d.x - 500 : d.x + 640;
    }

    /**
     * Espacio que ocupa la máquina (círculos y rectángulos en el mundo de diseño), con las mismas
     * medidas que dibuja MaquinasMaquina. Sirve para que ninguna rueda quede encima de ella.
     */
    function huellaMaquina(def, geo) {
        var id = ejeMaquina(def);
        var d = id ? geo.ejes[id] : null;
        if (!d) return [];
        var t = def.maquina, R, f = [];
        if (t === "ventilador") {
            R = d.r + 40;
            f.push({ c: { x: d.x, y: d.y, r: R + 12 } });
            f.push({ rect: { x0: d.x - 0.6 * R, y0: d.y + R, x1: d.x + 0.6 * R, y1: d.y + R + 35 } });
        } else if (t === "noria") {
            R = d.r + 52;
            f.push({ c: { x: d.x, y: d.y, r: R + 8 } });
            f.push({ rect: { x0: d.x - 0.95 * R, y0: d.y + R * 0.5, x1: d.x + 0.95 * R, y1: d.y + R + 70 } });
        } else if (t === "cinta" || t === "fabrica") {
            var rr = t === "cinta" ? 18 : 15;
            var x1 = finCinta(def, d);
            var izq = Math.min(d.x, x1), der = Math.max(d.x, x1);
            f.push({ rect: { x0: izq - rr, y0: d.y - rr - 30, x1: der + rr, y1: d.y + rr + 4 } });
            if (t === "cinta") {
                var px = xPrensa(d, x1);
                f.push({ rect: { x0: px - 52, y0: d.y - 140, x1: px + 52, y1: d.y - rr } });
            }
            else [0.32, 0.68].forEach(function (u) {
                var ax = izq + (der - izq) * u;
                f.push({ rect: { x0: ax - 40, y0: d.y - 130, x1: ax + 40, y1: d.y - rr } });
            });
        }
        return f.map(function (h) { h.eje = id; return h; });
    }

    /** La prensa va en el extremo de la cinta opuesto a la polea (la correa llega por el otro lado). */
    function xPrensa(d, x1) {
        return x1 >= d.x ? x1 - 90 : x1 + 90;
    }

    function distRect(x, y, r) {
        var dx = Math.max(r.x0 - x, 0, x - r.x1), dy = Math.max(r.y0 - y, 0, y - r.y1);
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ------------------------------------------------------------------ validación

    /** Errores de geometría del nivel: solapes, poleas, correas que pisan otras piezas, salidas del tablero. */
    function validarNivel(cfg, def) {
        var geo = geometria(cfg, def);
        var errores = [];
        var holgura = num(jcfg(cfg).holgura, 10);
        var todos = Object.keys(geo.ejes).map(function (k) { return geo.ejes[k]; });
        var dist = function (a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); };
        if (todos.some(function (e) { return !isFinite(e.x) || !isFinite(e.y); })) errores.push(def.id + ": eje sin posición");
        var engranajes = todos.filter(function (e) { return e.tipo === "engranaje"; });
        engranajes.forEach(function (a, i) {
            engranajes.slice(i + 1).forEach(function (b) {
                var d = dist(a, b);
                var engranan = a.padre === b.id || b.padre === a.id;
                if (engranan) {
                    var ideal = geo.modulo * (a.z + b.z) / 2;
                    if (Math.abs(d - ideal) > 0.01) errores.push(def.id + ": " + a.id + "-" + b.id + " no engranan a la distancia justa");
                } else if (d < a.ra + b.ra + holgura) {
                    errores.push(def.id + ": " + a.id + " y " + b.id + " se pisan (" + Math.round(d) + " < " + Math.round(a.ra + b.ra + holgura) + ")");
                }
            });
        });
        todos.filter(function (e) { return e.tipo === "polea"; }).forEach(function (p) {
            if (p.sobre) {
                var g = geo.ejes[p.sobre];
                if (!g || p.ra > g.rf - geo.modulo * 0.4) errores.push(def.id + ": la polea " + p.id + " no cabe dentro de " + p.sobre);
                return;
            }
            todos.forEach(function (o) {
                if (o === p || (o.sobre && o.sobre === p.id)) return;
                if (dist(p, o) < p.ra + o.ra + holgura) errores.push(def.id + ": la polea " + p.id + " pisa a " + o.id);
            });
        });
        geo.correas.concat(geo.fijos.correas).forEach(function (c) {
            var p = geo.ejes[c.entre[0]], q = geo.ejes[c.entre[1]];
            if (!p || !q) { errores.push(def.id + ": correa " + c.id + " sin poleas"); return; }
            var k = correa(p, q);
            todos.forEach(function (o) {
                if (o === p || o === q) return;
                if (o.id === p.sobre || o.id === q.sobre) return;
                if (o.sobre && (o.sobre === p.id || o.sobre === q.id)) return;
                var m = Math.min(distSegmento(o.x, o.y, k.rectas[0][0], k.rectas[0][1]), distSegmento(o.x, o.y, k.rectas[1][0], k.rectas[1][1]));
                if (m < o.ra + holgura * 0.5) errores.push(def.id + ": la correa " + c.id + " pasa por encima de " + o.id);
            });
        });
        var T = geo.tablero;
        todos.forEach(function (e) {
            if (e.x - e.ra < T.x0 || e.x + e.ra > T.x1 || e.y - e.ra < T.y0 || e.y + e.ra > T.y1) errores.push(def.id + ": " + e.id + " se sale del tablero");
        });
        if (def.maquina) {
            var eje = ejeMaquina(def);
            if (!geo.ejes[eje] || geo.ejes[eje].tipo !== "polea") errores.push(def.id + ": la máquina " + def.maquina + " no tiene polea (" + eje + ")");
            huellaMaquina(def, geo).forEach(function (h, i) {
                var b = h.c ? { x0: h.c.x - h.c.r, y0: h.c.y - h.c.r, x1: h.c.x + h.c.r, y1: h.c.y + h.c.r } : h.rect;
                if (b.x0 < T.x0 - 2 || b.x1 > T.x1 + 2 || b.y0 < T.y0 - 2 || b.y1 > T.y1 + 2) errores.push(def.id + ": la máquina (parte " + i + ") se sale del tablero");
                todos.forEach(function (o) {
                    if (o.id === h.eje) return;
                    var dd = h.c ? dist(h.c, o) - h.c.r : distRect(o.x, o.y, h.rect);
                    if (dd < o.ra + holgura * 0.5) errores.push(def.id + ": la máquina (parte " + i + ") queda bajo " + o.id);
                });
            });
        }
        var a = relaciones(geo);
        todos.forEach(function (e) { if (a[e.id] == null) errores.push(def.id + ": " + e.id + " no recibe movimiento"); });
        return errores;
    }

    var HEREDA = ["nombre", "modulo", "tablero", "estacion", "zeus", "cartel"];

    /** Completa cada máquina del catálogo con lo que comparte su grado (la primera de ese grado). */
    function expandirCatalogo(lista) {
        var base = {};
        (lista || []).forEach(function (n) { if (base[n.grado] == null) base[n.grado] = n; });
        return (lista || []).map(function (n) {
            var c = copiar(n);
            var b = base[n.grado] || {};
            HEREDA.forEach(function (k) { if (c[k] == null && b[k] != null) c[k] = b[k]; });
            return c;
        });
    }

    /**
     * Una máquina de cada grado (1..4), al azar, evitando las de la partida anterior (`anteriores`:
     * lista de id) mientras quede otra en ese grado. Devuelve la lista en orden de grado.
     */
    function elegirNiveles(lista, rnd, anteriores) {
        var r = rnd || Math.random;
        var prev = (anteriores || []).map(String);
        var grados = [];
        (lista || []).forEach(function (n) { if (grados.indexOf(n.grado) < 0) grados.push(n.grado); });
        grados.sort(function (a, b) { return a - b; });
        return grados.map(function (g) {
            var del = lista.filter(function (n) { return n.grado === g; });
            var nuevas = del.filter(function (n) { return prev.indexOf(String(n.id)) < 0; });
            var pool = nuevas.length ? nuevas : del;
            return pool[Math.floor(r() * pool.length) % pool.length];
        });
    }

    function validar(cfg) {
        var errores = [];
        var lista = expandirCatalogo(cfg.catalogoNiveles || niveles(cfg));
        if (!lista.length) errores.push("sin nivelesJuego");
        lista.forEach(function (n) { errores = errores.concat(validarNivel(cfg, n)); });
        return errores;
    }

    // ------------------------------------------------------------------ textos y azar

    function nombre(cfg, tipo, talla) {
        var n = ((cfg && cfg.nombres) || {})[tipo] || {};
        return n[talla] || { corto: talla, voz: talla, con: talla };
    }

    /** Pista de voz para un destino: qué pieza y dónde. */
    function pista(cfg, d) {
        if (!d) return "";
        var n = nombre(cfg, d.tipo, d.talla);
        if (d.tipo === "correa") return "¡Toma " + n.voz + " y ponla entre " + (d.lugar || "las dos poleas") + "!";
        return "¡Busca " + n.voz + "! Va en " + (d.lugar || "su eje") + ".";
    }

    function frase(lista, i) {
        if (!lista || !lista.length) return "";
        return lista[mod(i | 0, lista.length)];
    }

    function barajar(lista, rnd) {
        var r = rnd || Math.random;
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function elegir(lista, rnd, def) {
        if (!lista || !lista.length) return def;
        return lista[Math.floor((rnd || Math.random)() * lista.length) % lista.length];
    }

    /** Variación visual de la partida (no cambia ninguna solución). */
    function sortearVariante(cfg, rnd) {
        var r = rnd || Math.random;
        var v = (cfg && cfg.variantes) || {};
        var col = v.colores || {};
        var deco = v.decoraciones || ["rayos"];
        return {
            color: {
                grande: elegir(col.grande, r, "#ffc425"),
                mediano: elegir(col.mediano, r, "#3b8cf0"),
                pequeno: elegir(col.pequeno, r, "#43c25a"),
                polea: elegir(col.polea, r, "#ff8a3d")
            },
            deco: { grande: elegir(deco, r, "rayos"), mediano: elegir(deco, r, "agujeros"), pequeno: elegir(deco, r, "estrella") },
            tablero: elegir(v.tableros, r, { id: "azul", placa: "#3d6fb6", oscuro: "#24457e", claro: "#6f9de0" }),
            luces: barajar(v.luces || ["#ffd43b"], r),
            brazoIzquierda: r() < 0.5,
            semilla: Math.floor(r() * 100000)
        };
    }

    var api = {
        DIENTES: DIENTES,
        niveles: niveles,
        nivel: nivel,
        dientes: dientes,
        radioPolea: radioPolea,
        geometria: geometria,
        destinos: destinos,
        destino: destino,
        piezas: piezas,
        habilitado: habilitado,
        completo: completo,
        faltan: faltan,
        siguiente: siguiente,
        evaluar: evaluar,
        cercano: cercano,
        iman: iman,
        fase: fase,
        faseDiente: faseDiente,
        relaciones: relaciones,
        sentido: sentido,
        correa: correa,
        puntoCorrea: puntoCorrea,
        distSegmento: distSegmento,
        distanciaCorrea: distanciaCorrea,
        validarNivel: validarNivel,
        ejeMaquina: ejeMaquina,
        finCinta: finCinta,
        xPrensa: xPrensa,
        huellaMaquina: huellaMaquina,
        expandirCatalogo: expandirCatalogo,
        elegirNiveles: elegirNiveles,
        lugarAuto: lugarAuto,
        validar: validar,
        nombre: nombre,
        pista: pista,
        frase: frase,
        barajar: barajar,
        sortearVariante: sortearVariante
    };
    global.ReglasMaquina = api;
})(typeof window !== "undefined" ? window : global);
