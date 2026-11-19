/**
 * ReglasEsfera — reglas puras de "¡Atrapa la Esfera Veloz!" (window.ReglasEsfera y module.exports).
 *
 * Decide sin dibujar: rondas, trayectorias (tramos de Bézier cúbicos en 3D con rebotes en los espejos laterales),
 * el instante en que
 * la esfera cruza el centro del anillo, la ventana de captura y el resultado de cada toque:
 *   "acierto"  el toque cae dentro de la ventana (la esfera está dentro del anillo);
 *   "temprano" la esfera todavía no llega;
 *   "tarde"    la esfera ya pasó.
 * La escena (escena-tunel.js) solo pide posiciones con trayectoria(...).en(t).
 */
(function (global) {
    "use strict";

    // ------------------------------------------------------------------ utilidades

    function plantilla(txt, datos) {
        return String(txt || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? String(datos[k]) : m;
        });
    }

    function v3(a) {
        return { x: Number(a[0]) || 0, y: Number(a[1]) || 0, z: Number(a[2]) || 0 };
    }

    function suma(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
    function resta(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
    function escala(a, k) { return { x: a.x * k, y: a.y * k, z: a.z * k }; }
    function largo(a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); }

    function uPorDistancia(tabla, s) {
        if (s <= 0) return 0;
        if (s >= tabla.total) return 1;
        var lo = 0, hi = tabla.n;
        while (hi - lo > 1) {
            var m = (lo + hi) >> 1;
            if (tabla.acum[m] < s) lo = m; else hi = m;
        }
        var tramo = tabla.acum[hi] - tabla.acum[lo] || 1;
        return (lo + (s - tabla.acum[lo]) / tramo) / tabla.n;
    }

    // ------------------------------------------------------------------ configuración

    function cfgJuego(cfg) { return (cfg && cfg.juego) || {}; }

    function capturasPorRonda(cfg) {
        return Math.max(1, Number(cfgJuego(cfg).capturasPorRonda) || 4);
    }

    function totalRondas(cfg) {
        return ((cfg && cfg.rondas) || []).length;
    }

    function totalCapturas(cfg) {
        return totalRondas(cfg) * capturasPorRonda(cfg);
    }

    function ronda(cfg, i) {
        var r = ((cfg && cfg.rondas) || [])[i] || {};
        var j = cfgJuego(cfg);
        var rBase = Number(j.radioAnillo) || 2.05;
        var rA = Number(r.radioAnillo) || rBase;
        return {
            id: r.id,
            // el aro se achica en cada ronda; la zona de captura se achica con él (misma proporción)
            radioAnillo: rA,
            radioCaptura: (Number(j.radioCaptura) || 1.45) * rA / rBase,
            indice: i,
            nombre: r.nombre || "",
            velocidad: Number(r.velocidad) || 2.5,
            radioEsfera: Number(r.radioEsfera) || 0.5,
            tolerancia: r.tolerancia != null ? Number(r.tolerancia) : 0.12,
            esferas: (r.esferas || []).slice()
        };
    }

    function tubo(cfg, id) {
        var t = ((cfg && cfg.tubos) || []).find(function (x) { return x.id === id; });
        return t || null;
    }

    function color(cfg, nombre) {
        var c = (cfg && cfg.colores) || {};
        return c[nombre] || nombre || "#4dabf7";
    }

    /**
     * Ayuda adaptativa: tras varios intentos sin captura, la esfera siguiente va un poco más lenta y la
     * ventana se agranda (sin pasar de maxFallos).
     */
    function ajuste(cfg, fallosSeguidos) {
        var a = cfgJuego(cfg).ayudaPorFallo || {};
        var n = Math.max(0, Math.min(Number(a.maxFallos) || 3, Number(fallosSeguidos) || 0));
        return {
            velocidad: 1 - (Number(a.velocidad) || 0.12) * n,
            ventanaExtra: (Number(a.ventana) || 0.08) * n
        };
    }

    // ------------------------------------------------------------------ trayectorias

    function normal(a) {
        var l = largo(a) || 1;
        return { x: a.x / l, y: a.y / l, z: a.z / l };
    }

    /** Rebote en un espejo lateral (pared vertical, normal en X): se invierte la componente X. */
    function reflejar(d) {
        return { x: -d.x, y: d.y, z: d.z };
    }

    function cubica(p0, p1, p2, p3, u) {
        var a = (1 - u) * (1 - u) * (1 - u), b = 3 * (1 - u) * (1 - u) * u, c = 3 * (1 - u) * u * u, d = u * u * u;
        return {
            x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
            y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
            z: a * p0.z + b * p1.z + c * p2.z + d * p3.z
        };
    }

    /** Tramo cúbico de P a Q que sale en la dirección dP y llega en la dirección dQ, con tabla de arco. */
    function tramo(P, dP, Q, dQ, k) {
        var L = largo(resta(Q, P));
        var p1 = suma(P, escala(dP, L * (k || 0.4)));
        var p2 = resta(Q, escala(dQ, L * (k || 0.4)));
        var f = function (u) { return cubica(P, p1, p2, Q, u); };
        var n = 160, acum = [0], prev = P, total = 0;
        for (var i = 1; i <= n; i++) {
            var q = f(i / n);
            total += largo(resta(q, prev));
            acum.push(total);
            prev = q;
        }
        return { f: f, tabla: { acum: acum, total: total, n: n }, largo: total };
    }

    function espejo(cfg, id) {
        return ((cfg && cfg.espejos) || []).find(function (e) { return e.id === id; }) || null;
    }

    /**
     * Trayectoria de una esfera: sale por la boca de su tubería, rebota en los espejos laterales que indique
     * (esfera.rebotes, en orden) y cruza el centro del anillo (0, altura, zCruce) en línea recta desde el último
     * espejo (o desde la tubería si no hay rebotes); después sigue recta hasta salir de la pantalla.
     * - Para ir de un lado al otro del túnel antes del tramo final pasa POR ENCIMA del aro (punto de paso
     *   juego.arco = [y, z]): así solo se ve "dentro del anillo" en el momento de atraparla.
     * - En cada espejo la dirección de salida es el reflejo de la de llegada (ángulo de entrada = de salida).
     * - Antes del último rebote va más rápido (juego.velocidadAntes ×); el último espejo la frena a la velocidad
     *   de la ronda, que se mantiene constante en el tramo final (el que decide la ventana de captura).
     * opts: { velocidad, tolerancia, radioCaptura, ventanaExtra }.
     * Devuelve { en(t), tc, tFin, ventana, rebotes: [{ t, espejo, p }], inicio, centro, fin, largo }.
     */
    function trayectoria(cfg, esfera, opts) {
        opts = opts || {};
        var j = cfgJuego(cfg);
        var tb = tubo(cfg, esfera.tubo);
        var A = v3(tb ? tb.boca : [-5, -0.9, 1.4]);
        var dTubo = normal(v3(tb && tb.dir ? tb.dir : [A.x < 0 ? 1 : -1, 0, 0]));
        var zc = Number(j.zCruce);
        var C = { x: 0, y: Number(esfera.altura) || 0, z: isFinite(zc) ? zc : 0 };
        var arco = Array.isArray(esfera.arco) ? esfera.arco : (j.arco || [4.3, -1]);
        var lista = (esfera.rebotes || []).map(function (r) {
            var e = espejo(cfg, r.espejo);
            return { id: r.espejo, p: { x: e ? Number(e.x) : 0, y: Number(r.y) || 0, z: Number(r.z) || 0 } };
        });
        var k = Number(j.tension) || 0.4;
        var vel = Math.max(0.3, Number(opts.velocidad) || 2.5);
        var velAntes = vel * (Number(j.velocidadAntes) || 1);
        var tramos = [];
        var ultimo = lista.length ? lista[lista.length - 1].p : null;
        var u = normal(resta(C, ultimo || A));
        /** De P (dirección dP) a Q (dirección dQ); si cambia de lado del túnel, pasa por encima del aro. */
        function ir(P, dP, Q, dQ, v) {
            if (P.x * Q.x < 0) {
                var S = { x: 0, y: Number(arco[0]) || 4.3, z: Number(arco[1]) || 0 };
                var dS = normal({ x: Q.x > P.x ? 1 : -1, y: 0, z: (Q.z - P.z) / Math.abs(Q.x - P.x) });
                tramos.push(Object.assign(tramo(P, dP, S, dS, k), { v: v }));
                tramos.push(Object.assign(tramo(S, dS, Q, dQ, k), { v: v }));
            } else {
                tramos.push(Object.assign(tramo(P, dP, Q, dQ, k), { v: v }));
            }
        }
        var dSale = normal(suma(dTubo, { x: 0, y: Number(esfera.elevacion) || 0, z: 0 }));
        var nRebotes = [];
        if (!ultimo) {
            // sin rebotes: de la tubería al anillo con una curva suave que llega de lado
            u = normal({ x: C.x - A.x, y: (C.y - A.y) * 0.4, z: (C.z - A.z) * 0.6 });
            tramos.push(Object.assign(tramo(A, dSale, C, u, k), { v: vel }));
        } else {
            // hacia atrás: la llegada a cada espejo es el reflejo de su salida
            var llegada = [];
            var sale = u;
            for (var i = lista.length - 1; i >= 0; i--) {
                llegada[i] = reflejar(sale);
                if (i > 0) {
                    var P0 = lista[i - 1].p, P1 = lista[i].p;
                    // hacia el otro espejo: sale subiendo (irá por encima del aro)
                    sale = normal({ x: P1.x - P0.x, y: Math.abs(P1.x - P0.x) * 0.35, z: (P1.z - P0.z) });
                }
            }
            ir(A, dSale, lista[0].p, llegada[0], velAntes);
            nRebotes.push(tramos.length);
            for (var m = 0; m + 1 < lista.length; m++) {
                ir(lista[m].p, reflejar(llegada[m]), lista[m + 1].p, llegada[m + 1], velAntes);
                nRebotes.push(tramos.length);
            }
            tramos.push(Object.assign(tramo(ultimo, u, C, u, 1 / 3), { v: vel }));
        }
        // después del anillo: recta hasta salir de la pantalla
        var E = suma(C, escala(u, Math.min(14, 10 / Math.max(0.35, Math.abs(u.x)))));
        tramos.push(Object.assign(tramo(C, u, E, u, 1 / 3), { v: vel }));
        var acum = 0, tAcum = 0, tC = 0, rebotes = [];
        tramos.forEach(function (tr, i) {
            tr.desde = acum;
            tr.tDesde = tAcum;
            acum += tr.largo;
            tAcum += tr.largo / tr.v;
            var r = nRebotes.indexOf(i + 1);
            if (r >= 0) rebotes.push({ t: tAcum, espejo: lista[r].id, p: lista[r].p });
            if (i === tramos.length - 2) tC = tAcum;
        });
        var radio = Number(opts.radioCaptura) || Number(j.radioCaptura) || 1.45;
        var tol = opts.tolerancia != null ? Number(opts.tolerancia) : 0.12;
        return {
            inicio: A,
            centro: C,
            fin: E,
            direccion: u,
            largo: acum,
            velocidad: vel,
            rebotes: rebotes,
            tc: tC,
            tFin: tAcum,
            ventana: radio / vel + tol + (Number(opts.ventanaExtra) || 0),
            en: function (t) {
                var tt = Math.max(0, Math.min(tAcum, t));
                for (var i = 0; i < tramos.length; i++) {
                    var tr = tramos[i];
                    if (tt <= tr.tDesde + tr.largo / tr.v || i === tramos.length - 1) {
                        var sLoc = Math.min(tr.largo, (tt - tr.tDesde) * tr.v);
                        return tr.f(uPorDistancia(tr.tabla, sLoc));
                    }
                }
                return E;
            }
        };
    }

    /** Distancia de un punto al eje del anillo (el anillo mira a la cámara, su eje es Z). */
    function distanciaAlEje(p) {
        return Math.sqrt(p.x * p.x + p.y * p.y);
    }

    // ------------------------------------------------------------------ toques

    /**
     * Resultado de un toque en el instante t del vuelo de la esfera.
     * Sin esfera en vuelo (t == null): "temprano" (todavía no sale ninguna).
     */
    function evaluarToque(t, tray) {
        if (t == null || !tray) return "temprano";
        if (t < tray.tc - tray.ventana) return "temprano";
        if (t <= tray.tc + tray.ventana) return "acierto";
        return "tarde";
    }

    /** Fase del anillo para el instante t: espera → preparacion → captura → (paso). */
    function faseAnillo(t, tray, preparacionS) {
        if (t == null || !tray) return "espera";
        var prep = Number(preparacionS) || 1.2;
        if (t < tray.tc - tray.ventana - prep) return "espera";
        if (t < tray.tc - tray.ventana) return "preparacion";
        if (t <= tray.tc + tray.ventana) return "captura";
        return "paso";
    }

    /** Cuánto falta para la ventana (0 → lejos, 1 → abre ya): sirve para la anticipación gradual. */
    function anticipacion(t, tray, preparacionS) {
        if (t == null || !tray) return 0;
        var prep = Number(preparacionS) || 1.2;
        var abre = tray.tc - tray.ventana;
        if (t >= abre) return 1;
        return Math.max(0, 1 - (abre - t) / prep);
    }

    // ------------------------------------------------------------------ resumen

    function resumen(historial) {
        var h = historial || [];
        var capturas = 0, tempranos = 0, pasaron = 0, racha = 0, mejor = 0;
        h.forEach(function (e) {
            if (e === "acierto") {
                capturas++;
                racha++;
                mejor = Math.max(mejor, racha);
            } else if (e === "temprano") {
                tempranos++;
            } else if (e === "paso" || e === "tarde") {
                pasaron++;
                racha = 0;
            }
        });
        return { capturas: capturas, esferas: capturas + pasaron, tempranos: tempranos, pasaron: pasaron, mejorRacha: mejor };
    }

    /** Estrellas del final: siempre al menos 1; 3 si casi todas se atraparon a la primera. */
    function estrellas(res) {
        if (!res) return 1;
        if (res.pasaron <= 2) return 3;
        if (res.pasaron <= 6) return 2;
        return 1;
    }

    // ------------------------------------------------------------------ revisión del config

    function revisarJuego(cfg) {
        var errores = [];
        if (!cfg || !Array.isArray(cfg.rondas)) return ["sin rondas"];
        if (totalRondas(cfg) < 3) errores.push("menos de 3 rondas");
        var por = capturasPorRonda(cfg);
        var radioAnillo = Number(cfgJuego(cfg).radioAnillo) || 2;
        var radioCaptura = Number(cfgJuego(cfg).radioCaptura) || 1.45;
        if (radioCaptura >= radioAnillo) errores.push("la zona de captura no cabe en el anillo");
        if (Number(cfg.rondas[0] && cfg.rondas[0].radioAnillo) && Number(cfg.rondas[0].radioAnillo) !== radioAnillo) errores.push("la ronda 1 debe usar el aro de la presentación");
        var velPrev = 0, aroPrev = Infinity;
        cfg.rondas.forEach(function (r, i) {
            var rr = ronda(cfg, i);
            if (rr.esferas.length < por) errores.push("ronda " + (i + 1) + ": menos de " + por + " esferas");
            if (rr.velocidad <= velPrev) errores.push("ronda " + (i + 1) + ": la velocidad no aumenta");
            velPrev = rr.velocidad;
            if (rr.radioAnillo >= aroPrev) errores.push("ronda " + (i + 1) + ": el aro no se achica");
            aroPrev = rr.radioAnillo;
            if (rr.radioEsfera * 2 > rr.radioCaptura * 1.4) errores.push("ronda " + (i + 1) + ": la esfera no cabe en el aro");
            rr.esferas.forEach(function (e, k) {
                var id = "ronda " + (i + 1) + " esfera " + (k + 1);
                if (!tubo(cfg, e.tubo)) errores.push(id + ": tubo desconocido " + e.tubo);
                if (!cfg.colores || !cfg.colores[e.color]) errores.push(id + ": color desconocido " + e.color);
                (e.rebotes || []).forEach(function (rb, n) {
                    var es = espejo(cfg, rb.espejo);
                    if (!es) {
                        errores.push(id + ": espejo desconocido " + rb.espejo);
                        return;
                    }
                    if (rb.y < es.y0 || rb.y > es.y1 || rb.z < es.z0 || rb.z > es.z1) errores.push(id + ": rebote " + (n + 1) + " fuera del espejo");
                    var antes = n === 0 ? tubo(cfg, e.tubo) : null;
                    if (n > 0 && e.rebotes[n - 1].espejo === rb.espejo) errores.push(id + ": dos rebotes seguidos en el mismo espejo");
                    if (antes && Math.sign(antes.boca[0]) === Math.sign(es.x)) errores.push(id + ": la tubería no apunta a ese espejo");
                });
                var tr = trayectoria(cfg, e, { velocidad: rr.velocidad, tolerancia: rr.tolerancia, radioCaptura: rr.radioCaptura });
                var pc = tr.en(tr.tc);
                if (distanciaAlEje(pc) > 0.6) errores.push(id + ": no pasa por el centro del anillo");
                if (Math.abs(pc.z - (Number(cfgJuego(cfg).zCruce) || 0)) > 0.01) errores.push(id + ": no cruza el anillo por su centro");
                if (tr.ventana < 0.4) errores.push(id + ": ventana demasiado corta");
                if (tr.tc < 1.2) errores.push(id + ": llega demasiado pronto al anillo");
            });
        });
        return errores;
    }

    var API = {
        plantilla: plantilla,
        capturasPorRonda: capturasPorRonda,
        totalRondas: totalRondas,
        totalCapturas: totalCapturas,
        ronda: ronda,
        tubo: tubo,
        espejo: espejo,
        color: color,
        ajuste: ajuste,
        trayectoria: trayectoria,
        distanciaAlEje: distanciaAlEje,
        evaluarToque: evaluarToque,
        faseAnillo: faseAnillo,
        anticipacion: anticipacion,
        resumen: resumen,
        estrellas: estrellas,
        revisarJuego: revisarJuego
    };

    global.ReglasEsfera = API;
    if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
