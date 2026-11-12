/**
 * ReglasMemorama — lógica pura del memorama (sin Phaser ni DOM). También se usa desde Node (module.exports)
 * en scripts/probar-memorama-partes-cuerpo.js.
 *
 * Estados de la partida:
 *   preview    → las cartas se muestran un momento antes de jugar (no se pueden tocar)
 *   waiting    → esperando la primera carta del turno
 *   firstCard  → hay una carta abierta; esperando la segunda
 *   secondCard → hay dos cartas abiertas; falta compararlas
 *   checking   → pareja incorrecta: las dos se ven 2 s y luego se cierran (bloqueado)
 *   matched    → pareja correcta: celebración (bloqueado)
 *   completed  → todas las parejas encontradas
 *
 * Las parejas se reconocen por el `id` de la carta en config.json (nunca por el texto visible).
 *
 * Rondas: config.json trae el catálogo `partes` y `rondas`. Todas las rondas son de 4 tarjetas (2 parejas):
 * cada ronda tiene su grupo de partes (`partes`) y en cada partida se eligen al azar 2 de ese grupo, así el
 * niño ve partes distintas al volver a jugar. ronda(cfg, i, rnd) arma la ronda ({ cartas: [2 partes], … }) y
 * las demás funciones (crear, revisarConfig…) trabajan con esa ronda.
 */
(function (global) {
    "use strict";

    var ESTADOS = ["preview", "waiting", "firstCard", "secondCard", "checking", "matched", "completed"];
    var PAREJAS = 2;          // 4 tarjetas por ronda

    /** Tipos de carta de config.json ([{ id, nombre, … }]). */
    function tiposDe(cfg) {
        return (cfg && Array.isArray(cfg.cartas)) ? cfg.cartas : [];
    }

    function tipo(cfg, id) {
        var lista = tiposDe(cfg).concat(partesDe(cfg));
        return lista.find(function (t) { return t && t.id === id; }) || null;
    }

    /** Catálogo de partes del cuerpo de config.json. */
    function partesDe(cfg) {
        return (cfg && Array.isArray(cfg.partes)) ? cfg.partes : [];
    }

    function rondas(cfg) {
        return (cfg && Array.isArray(cfg.rondas)) ? cfg.rondas : [];
    }

    /**
     * Configuración de la ronda i: sus datos más `cartas` (las 2 partes que juega, con todos sus campos). Con
     * `rnd` elige 2 al azar del grupo de la ronda; sin `rnd`, las 2 primeras (para pruebas y la demo).
     */
    function ronda(cfg, i, rnd) {
        var r = rondas(cfg)[i];
        if (!r) return null;
        var copia = {};
        Object.keys(r).forEach(function (k) { copia[k] = r[k]; });
        copia.indice = i;
        var grupo = (r.partes || []).slice();
        var elegidas = (typeof rnd === "function" ? barajar(grupo, rnd) : grupo).slice(0, PAREJAS);
        // en el orden del grupo, para que los textos y la barra de progreso no salten
        elegidas.sort(function (a, b) { return grupo.indexOf(a) - grupo.indexOf(b); });
        copia.elegidas = elegidas;
        copia.cartas = elegidas.map(function (id) {
            return partesDe(cfg).find(function (p) { return p.id === id; }) || { id: id };
        });
        return copia;
    }

    /** Problemas de la configuración (lista vacía = todo bien). `dibujos`: ids de dibujos disponibles. */
    function revisarConfig(cfg, dibujos) {
        var errores = [];
        var tipos = tiposDe(cfg);
        if (tipos.length !== PAREJAS) errores.push("Cada ronda debe tener " + PAREJAS + " parejas (4 tarjetas); hay " + tipos.length + ".");
        var vistos = {};
        tipos.forEach(function (t, i) {
            if (!t || !t.id) {
                errores.push("La carta " + i + " no tiene id.");
                return;
            }
            if (vistos[t.id]) errores.push("Id repetido: " + t.id);
            vistos[t.id] = true;
            if (!t.nombre) errores.push("La carta " + t.id + " no tiene nombre.");
            if (dibujos && dibujos.indexOf(t.dibujo || t.id) < 0) errores.push("No hay dibujo para " + t.id);
        });
        return errores;
    }

    /** Problemas de todo el juego: catálogo sin ids repetidos y cada ronda bien armada, sin repetir partes. */
    function revisarJuego(cfg, dibujos) {
        var errores = [];
        var vistos = {};
        partesDe(cfg).forEach(function (p) {
            if (vistos[p.id]) errores.push("Parte repetida en el catálogo: " + p.id);
            vistos[p.id] = true;
            if (!p.nombre) errores.push("La parte " + p.id + " no tiene nombre.");
            if (dibujos && dibujos.indexOf(p.dibujo || p.id) < 0) errores.push("No hay dibujo para " + p.id);
        });
        if (!rondas(cfg).length) errores.push("No hay rondas.");
        var usadas = {};
        rondas(cfg).forEach(function (r, i) {
            if ((r.partes || []).length < PAREJAS) errores.push("Ronda " + (i + 1) + ": su grupo necesita al menos " + PAREJAS + " partes.");
            (r.partes || []).forEach(function (id) {
                if (!vistos[id]) errores.push("Ronda " + (i + 1) + ": la parte " + id + " no está en el catálogo.");
                if (usadas[id]) errores.push("La parte " + id + " se repite en dos rondas.");
                usadas[id] = true;
            });
            revisarConfig(ronda(cfg, i), dibujos).forEach(function (e) { errores.push("Ronda " + (i + 1) + ": " + e); });
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

    /**
     * Orden de las cuatro cartas: dos de cada tipo, al azar. Si se pasa el orden anterior (reinicio), el nuevo
     * es distinto, para que el niño no juegue de memoria la partida pasada.
     */
    function repartir(cfg, rnd, anterior) {
        var base = [];
        tiposDe(cfg).forEach(function (t) { base.push(t.id, t.id); });
        var orden = barajar(base, rnd);
        var intentos = 0;
        while (anterior && anterior.join(",") === orden.join(",") && intentos < 20) {
            orden = barajar(base, rnd);
            intentos++;
        }
        if (anterior && anterior.join(",") === orden.join(",")) orden = orden.slice(1).concat(orden[0]);
        return orden;
    }

    /** Partida nueva: cartas boca abajo, en estado preview. */
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

    /** ¿Se puede tocar la carta i ahora? Devuelve "" si sí, o el motivo si no. */
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
     * Toque sobre la carta i.
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

    /** Compara las dos cartas abiertas: { pareja, a, b, tipo }. Pasa a matched o checking. */
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
     * Cierra el turno después de las animaciones: las cartas de una pareja incorrecta se cierran; con todas las
     * parejas encontradas la partida queda en completed. Devuelve el estado nuevo.
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

    /** Cartas que siguen boca abajo (para la ayuda: se menean sin revelar nada). */
    function cerradas(st) {
        return st.cartas.filter(function (c) { return !c.abierta && !c.emparejada; }).map(function (c) { return c.indice; });
    }

    /** Reemplaza {parte} y otros campos en una frase de config.json. */
    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) {
            return datos && datos[k] != null ? datos[k] : m;
        });
    }

    /** "los ojos y la boca": las partes con su artículo, para las voces ({lista} en config.json). */
    function listaPartes(tipos) {
        var t = (tipos || []).map(function (p) {
            return ((p.articulo ? p.articulo + " " : "") + String(p.nombre || p.id).toLowerCase()).trim();
        });
        if (t.length < 2) return t.join("");
        return t.slice(0, -1).join(", ") + " y " + t[t.length - 1];
    }

    var api = {
        listaPartes: listaPartes,
        ESTADOS: ESTADOS,
        tipos: tiposDe,
        tipo: tipo,
        partes: partesDe,
        rondas: rondas,
        ronda: ronda,
        revisarConfig: revisarConfig,
        revisarJuego: revisarJuego,
        PAREJAS: PAREJAS,
        barajar: barajar,
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
        plantilla: plantilla
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    global.ReglasMemorama = api;
})(typeof window !== "undefined" ? window : globalThis);
