/**
 * ReglasMemoPosturas — lógica pura del Memorama de Posturas Asimétricas y Lateralidad (sin Phaser ni DOM).
 * También se usa desde Node (module.exports) en scripts/probar-memorama-posturas-lateralidad.js.
 *
 * Estados de la partida:
 *   preview    → las tarjetas se muestran un momento antes de jugar (no se pueden tocar)
 *   waiting    → esperando la primera tarjeta del turno
 *   firstCard  → hay una tarjeta abierta; esperando la segunda
 *   secondCard → hay dos tarjetas abiertas; falta compararlas
 *   checking   → pareja incorrecta: las dos se ven 2 s y luego se cierran (bloqueado)
 *   matched    → pareja correcta: celebración (bloqueado)
 *   completed  → todas las parejas encontradas
 *
 * LATERALIDAD: dos tarjetas forman pareja únicamente cuando comparten el mismo `id` de postura
 * (identificador, nunca el texto visible ni el nombre de la parte del cuerpo). Dos posturas que son
 * reflejo horizontal una de otra — "mano derecha a rodilla izquierda" y "mano izquierda a rodilla
 * derecha" — tienen ids DISTINTOS, así que NO son pareja aunque se parezcan. `espejoDe(cfg, id)`
 * dice cuál es la postura reflejada de otra (se usa para resaltar la diferencia tras un fallo).
 *
 * Rondas: config.json trae el catálogo `posturas` y 4 `rondas`. Cada ronda nombra sus 4 posturas
 * (`posturas: [...]`) → 4 parejas → 8 tarjetas en 2 filas × 4 columnas.
 */
(function (global) {
    "use strict";

    var ESTADOS = ["preview", "waiting", "firstCard", "secondCard", "checking", "matched", "completed"];
    var PAREJAS = 4;          // parejas por ronda (8 tarjetas)
    var COLUMNAS = 4;
    var FILAS = 2;

    /** Cuántas parejas juega la ronda (4 por defecto). */
    function parejasDe(r) {
        var n = Number(r && r.parejas);
        return isFinite(n) && n >= 2 ? Math.floor(n) : PAREJAS;
    }

    /** Catálogo de posturas de config.json. */
    function posturasDe(cfg) {
        return (cfg && Array.isArray(cfg.posturas)) ? cfg.posturas : [];
    }

    /** Posturas que ya trae armada una ronda (ronda(cfg, i) las pone en `cartas`). */
    function tiposDe(cfg) {
        return (cfg && Array.isArray(cfg.cartas)) ? cfg.cartas : [];
    }

    function tipo(cfg, id) {
        var lista = tiposDe(cfg).concat(posturasDe(cfg));
        return lista.find(function (t) { return t && t.id === id; }) || null;
    }

    function rondas(cfg) {
        return (cfg && Array.isArray(cfg.rondas)) ? cfg.rondas : [];
    }

    /**
     * La postura que es el reflejo horizontal de `id` dentro de la misma ronda: misma postura con el
     * lado cambiado. Se reconoce porque sus ángulos son los mismos intercambiando izquierda y derecha.
     * Devuelve el id de la otra postura o null.
     */
    function espejoDe(cfg, id, enRonda) {
        var p = tipo(cfg, id);
        if (!p || !p.partes) return null;
        var lista = (enRonda && enRonda.length) ? enRonda.map(function (x) { return tipo(cfg, x) || x; }) : posturasDe(cfg);
        var reflejo = reflejar(p.partes);
        var otra = lista.find(function (q) {
            return q && q.id !== p.id && q.partes && mismosAngulos(q.partes, reflejo);
        });
        return otra ? otra.id : null;
    }

    /** Cambia izquierda por derecha en un mapa de ángulos { brazo_izq: {a,b}, … }. */
    function reflejar(partes) {
        var r = {};
        Object.keys(partes || {}).forEach(function (k) {
            var destino = k.indexOf("_izq") > 0 ? k.replace("_izq", "_der")
                : (k.indexOf("_der") > 0 ? k.replace("_der", "_izq") : k);
            r[destino] = { a: Number(partes[k].a) || 0, b: Number(partes[k].b) || 0 };
        });
        return r;
    }

    function mismosAngulos(a, b) {
        var claves = {};
        Object.keys(a || {}).forEach(function (k) { claves[k] = true; });
        Object.keys(b || {}).forEach(function (k) { claves[k] = true; });
        return Object.keys(claves).every(function (k) {
            var x = (a && a[k]) || { a: 0, b: 0 };
            var y = (b && b[k]) || { a: 0, b: 0 };
            return (Number(x.a) || 0) === (Number(y.a) || 0) && (Number(x.b) || 0) === (Number(y.b) || 0);
        });
    }

    /**
     * Configuración de la ronda i: sus datos más `cartas` (las 4 posturas que juega, con todos sus campos).
     * Las posturas de cada ronda están fijas en config.json: lo que cambia entre partidas es su reparto
     * en el tablero, no el contenido. Así cada ronda tiene contenido propio (requisito del enunciado).
     */
    function ronda(cfg, i) {
        var r = rondas(cfg)[i];
        if (!r) return null;
        var copia = {};
        Object.keys(r).forEach(function (k) { copia[k] = r[k]; });
        copia.indice = i;
        var elegidas = (r.posturas || []).slice(0, parejasDe(r));
        copia.elegidas = elegidas;
        copia.cartas = elegidas.map(function (id) {
            return posturasDe(cfg).find(function (p) { return p.id === id; }) || { id: id };
        });
        return copia;
    }

    /** Problemas de una ronda ya armada (lista vacía = todo bien). `dibujos`: ids de posturas dibujables. */
    function revisarConfig(cfg, dibujos) {
        var errores = [];
        var tipos = tiposDe(cfg);
        var n = parejasDe(cfg);
        if (tipos.length !== n) errores.push("La ronda debe tener " + n + " parejas (" + (n * 2) + " tarjetas); hay " + tipos.length + ".");
        var vistos = {};
        tipos.forEach(function (t, i) {
            if (!t || !t.id) {
                errores.push("La tarjeta " + i + " no tiene id.");
                return;
            }
            if (vistos[t.id]) errores.push("Id repetido: " + t.id);
            vistos[t.id] = true;
            if (!t.nombre) errores.push("La postura " + t.id + " no tiene nombre.");
            if (!t.partes) errores.push("La postura " + t.id + " no tiene ángulos.");
            if (dibujos && dibujos.indexOf(t.id) < 0) errores.push("No hay dibujo para " + t.id);
        });
        return errores;
    }

    /** Problemas de todo el juego: catálogo sin ids repetidos y cada ronda con 4 posturas propias. */
    function revisarJuego(cfg, dibujos) {
        var errores = [];
        var vistos = {};
        posturasDe(cfg).forEach(function (p) {
            if (vistos[p.id]) errores.push("Postura repetida en el catálogo: " + p.id);
            vistos[p.id] = true;
            if (!p.nombre) errores.push("La postura " + p.id + " no tiene nombre.");
            if (!p.partes) errores.push("La postura " + p.id + " no tiene ángulos.");
        });
        if (rondas(cfg).length < 3) errores.push("Hacen falta al menos 3 rondas.");
        var usadas = {};
        rondas(cfg).forEach(function (r, i) {
            var n = parejasDe(r);
            if ((r.posturas || []).length !== n) {
                errores.push("Ronda " + (i + 1) + ": debe tener exactamente " + n + " posturas.");
            }
            (r.posturas || []).forEach(function (id) {
                if (!vistos[id]) errores.push("Ronda " + (i + 1) + ": la postura " + id + " no está en el catálogo.");
                if (usadas[id]) errores.push("La postura " + id + " se repite en dos rondas.");
                usadas[id] = true;
            });
            revisarConfig(ronda(cfg, i), dibujos).forEach(function (e) { errores.push("Ronda " + (i + 1) + ": " + e); });
        });
        // dos posturas con los mismos ángulos serían parejas imposibles de distinguir
        var lista = posturasDe(cfg);
        lista.forEach(function (p, i) {
            lista.slice(i + 1).forEach(function (q) {
                if (p.partes && q.partes && mismosAngulos(p.partes, q.partes)) {
                    errores.push("Las posturas " + p.id + " y " + q.id + " tienen los mismos ángulos.");
                }
            });
        });
        return errores;
    }

    /** Baraja de Fisher-Yates con el generador `rnd` (por defecto Math.random). */
    function barajar(lista, rnd) {
        var r = typeof rnd === "function" ? rnd : Math.random;
        var a = lista.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1));
            if (j > i) j = i;
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    /** Las dos tarjetas de una pareja quedan en celdas contiguas de la misma fila. */
    function pegadas(orden) {
        for (var i = 0; i < orden.length; i++) {
            var col = i % COLUMNAS;
            if (col + 1 < COLUMNAS && orden[i] === orden[i + 1]) return true;
        }
        return false;
    }

    /**
     * Orden de las ocho tarjetas: dos de cada postura, al azar. Si se pasa el orden anterior (reinicio o
     * ronda siguiente), el nuevo es distinto, para que el niño no juegue de memoria la partida pasada.
     * Además se evita que las dos tarjetas de una pareja queden sistemáticamente juntas.
     */
    function repartir(cfg, rnd, anterior) {
        var base = [];
        tiposDe(cfg).forEach(function (t) { base.push(t.id, t.id); });
        var orden = barajar(base, rnd);
        var intentos = 0;
        while (intentos < 40 && ((anterior && anterior.join(",") === orden.join(",")) || pegadas(orden))) {
            orden = barajar(base, rnd);
            intentos++;
        }
        if (anterior && anterior.join(",") === orden.join(",")) orden = orden.slice(1).concat(orden[0]);
        return orden;
    }

    /** Partida nueva: tarjetas boca abajo, en estado preview. */
    function crear(cfg, rnd, anterior) {
        var orden = repartir(cfg, rnd, anterior);
        return {
            estado: "preview",
            cartas: orden.map(function (id, i) { return { indice: i, tipo: id, abierta: false, emparejada: false }; }),
            abiertas: [],
            parejas: [],
            intentos: 0,
            fallos: 0,
            total: Math.floor(orden.length / 2)
        };
    }

    function orden(st) {
        return st.cartas.map(function (c) { return c.tipo; });
    }

    /** Termina la vista previa y empieza el juego. */
    function iniciar(st) {
        if (st.estado !== "preview") return false;
        st.cartas.forEach(function (c) { if (!c.emparejada) c.abierta = false; });
        st.abiertas = [];
        st.estado = "waiting";
        return true;
    }

    /** ¿Se puede tocar la tarjeta i ahora? Devuelve "" si sí, o el motivo si no. */
    function motivoBloqueo(st, i) {
        var c = st.cartas[i];
        if (!c) return "fuera";
        if (st.estado !== "waiting" && st.estado !== "firstCard") return "bloqueado";
        if (c.emparejada) return "emparejada";
        if (c.abierta) return "misma";
        return "";
    }

    function puedeTocar(st, i) {
        return motivoBloqueo(st, i) === "";
    }

    /**
     * Toque sobre la tarjeta i.
     *   { ok: true, accion: "primera" | "segunda", tipo }
     *   { ok: false, motivo: "bloqueado" | "emparejada" | "misma" | "fuera" }
     */
    function tocar(st, i) {
        var motivo = motivoBloqueo(st, i);
        if (motivo) return { ok: false, motivo: motivo };
        var c = st.cartas[i];
        c.abierta = true;
        st.abiertas.push(i);
        if (st.estado === "waiting") {
            st.estado = "firstCard";
            return { ok: true, accion: "primera", tipo: c.tipo };
        }
        st.estado = "secondCard";
        st.intentos++;
        return { ok: true, accion: "segunda", tipo: c.tipo };
    }

    /**
     * Compara las dos tarjetas abiertas: { pareja, a, b, tipo, otro }. Pasa a matched o checking.
     * La comparación es determinista y por identificador de postura: un reflejo horizontal tiene otro id,
     * así que nunca forma pareja.
     */
    function comparar(st) {
        if (st.estado !== "secondCard" || st.abiertas.length !== 2) return null;
        var a = st.abiertas[0];
        var b = st.abiertas[1];
        var pareja = st.cartas[a].tipo === st.cartas[b].tipo;
        if (pareja) {
            st.cartas[a].emparejada = true;
            st.cartas[b].emparejada = true;
            st.parejas.push(st.cartas[a].tipo);
            st.estado = "matched";
        } else {
            st.fallos++;
            st.estado = "checking";
        }
        return { pareja: pareja, a: a, b: b, tipo: st.cartas[a].tipo, otro: st.cartas[b].tipo };
    }

    /**
     * Cierra el turno después de las animaciones: las tarjetas de una pareja incorrecta se cierran; con todas
     * las parejas encontradas la partida queda en completed. Devuelve el estado nuevo.
     */
    function terminarTurno(st) {
        if (st.estado !== "checking" && st.estado !== "matched") return st.estado;
        st.abiertas.forEach(function (i) {
            if (!st.cartas[i].emparejada) st.cartas[i].abierta = false;
        });
        st.abiertas = [];
        st.estado = progreso(st).completo ? "completed" : "waiting";
        return st.estado;
    }

    function progreso(st) {
        var hechas = st.parejas.length;
        return { hechas: hechas, total: st.total, completo: st.total > 0 && hechas >= st.total };
    }

    /** Tarjetas que siguen boca abajo (para la ayuda: se menean sin revelar nada). */
    function cerradas(st) {
        return st.cartas.filter(function (c) { return !c.abierta && !c.emparejada; }).map(function (c) { return c.indice; });
    }

    /** Tarjetas ya abiertas por una pareja encontrada (la pista discreta destella sobre una de ellas). */
    function encontradas(st) {
        return st.cartas.filter(function (c) { return c.emparejada; }).map(function (c) { return c.indice; });
    }

    /** Reemplaza {clave} en una frase de config.json. */
    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? datos[k] : m;
        });
    }

    /** "la mano derecha y el codo izquierdo": nombres cortos de las posturas, para las voces. */
    function listaPosturas(tipos) {
        var t = (tipos || []).map(function (p) {
            return String(p.corto || p.nombre || p.id).toLowerCase();
        });
        if (t.length < 2) return t.join("");
        return t.slice(0, -1).join(", ") + " y " + t[t.length - 1];
    }

    var api = {
        ESTADOS: ESTADOS,
        PAREJAS: PAREJAS,
        COLUMNAS: COLUMNAS,
        FILAS: FILAS,
        tipos: tiposDe,
        tipo: tipo,
        posturas: posturasDe,
        rondas: rondas,
        ronda: ronda,
        espejoDe: espejoDe,
        reflejar: reflejar,
        mismosAngulos: mismosAngulos,
        revisarConfig: revisarConfig,
        revisarJuego: revisarJuego,
        barajar: barajar,
        pegadas: pegadas,
        repartir: repartir,
        crear: crear,
        orden: orden,
        iniciar: iniciar,
        motivoBloqueo: motivoBloqueo,
        puedeTocar: puedeTocar,
        tocar: tocar,
        comparar: comparar,
        terminarTurno: terminarTurno,
        progreso: progreso,
        cerradas: cerradas,
        encontradas: encontradas,
        plantilla: plantilla,
        listaPosturas: listaPosturas
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    global.ReglasMemoPosturas = api;
})(typeof window !== "undefined" ? window : globalThis);
