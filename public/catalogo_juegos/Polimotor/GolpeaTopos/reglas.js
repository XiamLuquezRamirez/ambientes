/**
 * ReglasTopos — reglas puras de "Golpea a los Topos" (window.ReglasTopos y module.exports).
 *
 * No toca la pantalla ni el reloj: el juego le pasa config.json, el estado y un generador de azar, y estas
 * funciones deciden. Así se prueban con node (scripts/probar-golpea-a-los-topos.js).
 *
 * Regla fundamental: un golpe es acierto solo si la imagen del globo tiene `categoria: "parte_cuerpo"` en
 * config.json (imagenes[]). Nunca se mira el nombre del archivo ni el id del dibujo, así se pueden agregar
 * imágenes nuevas sin tocar la lógica.
 *
 * Dificultad: config.dificultad es una lista de etapas ordenadas por `desde` (aciertos). Cada etapa dice
 * cuántos topos puede haber a la vez, cuánto tiempo se quedan afuera, cada cuánto sale uno nuevo, la
 * probabilidad de un distractor y qué imágenes se usan. Al avanzar, la etapa nueva entra suave (los valores
 * se acercan a la siguiente etapa poco a poco, nunca de golpe).
 */
(function (global) {
    "use strict";

    var CATEGORIAS = ["parte_cuerpo", "distractor"];

    function imagenes(cfg) {
        return (cfg && cfg.imagenes) || [];
    }

    function imagen(cfg, id) {
        return imagenes(cfg).find(function (i) { return i.id === id; }) || null;
    }

    function categoria(cfg, id) {
        var i = imagen(cfg, id);
        return i ? i.categoria : null;
    }

    function esParteCuerpo(cfg, id) {
        return categoria(cfg, id) === "parte_cuerpo";
    }

    /** "acierto" si la imagen es una parte del cuerpo; "error" si es un objeto; "nada" si no existe. */
    function evaluarGolpe(cfg, id) {
        var c = categoria(cfg, id);
        if (c === "parte_cuerpo") return "acierto";
        if (c === "distractor") return "error";
        return "nada";
    }

    function agujeros(cfg) {
        return (cfg && cfg.agujeros) || [];
    }

    function juego(cfg) {
        return (cfg && cfg.juego) || {};
    }

    function objetivo(cfg) {
        var n = Number(juego(cfg).objetivo);
        return isFinite(n) && n > 0 ? Math.round(n) : 12;
    }

    function duracionSeg(cfg) {
        var n = Number(juego(cfg).duracionSeg);
        return isFinite(n) && n > 0 ? n : 100;
    }

    function progreso(cfg, aciertos) {
        var total = objetivo(cfg);
        var hechas = Math.max(0, Math.min(total, aciertos || 0));
        return { hechas: hechas, total: total, fraccion: hechas / total, completo: hechas >= total };
    }

    // ------------------------------------------------------------------ dificultad

    function etapas(cfg) {
        return ((cfg && cfg.dificultad) || []).slice().sort(function (a, b) { return (a.desde || 0) - (b.desde || 0); });
    }

    function interpolar(a, b, u) {
        return a + (b - a) * u;
    }

    /**
     * Parámetros para el número de aciertos actual. Los números se acercan a la etapa siguiente de forma
     * lineal (velocidad moderada); simultáneos y listas de imágenes cambian solo al entrar a la etapa.
     */
    function etapa(cfg, aciertos) {
        var lista = etapas(cfg);
        if (!lista.length) {
            return { indice: 0, simultaneos: 1, visibleMs: 4000, intervaloMs: 1300, probDistractor: 0.4, partes: [], distractores: [] };
        }
        var n = Math.max(0, aciertos || 0);
        var i = 0;
        for (var k = 0; k < lista.length; k++) {
            if (n >= (lista[k].desde || 0)) i = k;
        }
        var e = lista[i];
        var sig = lista[i + 1];
        var u = 0;
        if (sig && sig.desde > e.desde) u = Math.max(0, Math.min(1, (n - e.desde) / (sig.desde - e.desde)));
        var num = function (clave, defecto) {
            var a = Number(e[clave]);
            if (!isFinite(a)) a = defecto;
            if (!sig) return a;
            var b = Number(sig[clave]);
            return isFinite(b) ? interpolar(a, b, u * 0.6) : a;
        };
        return {
            indice: i,
            simultaneos: Math.max(1, Math.round(Number(e.simultaneos) || 1)),
            visibleMs: Math.round(num("visibleMs", 4000)),
            intervaloMs: Math.round(num("intervaloMs", 1300)),
            probDistractor: Math.max(0, Math.min(0.8, num("probDistractor", 0.4))),
            partes: (e.partes || []).filter(function (id) { return esParteCuerpo(cfg, id); }),
            distractores: (e.distractores || []).filter(function (id) { return categoria(cfg, id) === "distractor"; })
        };
    }

    // ------------------------------------------------------------------ azar y elección

    /** Generador con semilla (mulberry32): mismas semillas → mismas partidas en las pruebas. */
    function crearAzar(semilla) {
        var a = (semilla >>> 0) || 1;
        return function () {
            a = (a + 0x6d2b79f5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function elegirDe(lista, azar, evitar) {
        var opciones = lista.filter(function (x) { return (evitar || []).indexOf(x) < 0; });
        if (!opciones.length) opciones = lista.slice();
        if (!opciones.length) return null;
        return opciones[Math.min(opciones.length - 1, Math.floor(azar() * opciones.length))];
    }

    /**
     * Imagen del próximo topo.
     * estado: { aciertos, distractoresSeguidos, ultima, enPantalla: [ids de imagen visibles] }
     * No repite la última ni una que ya esté en pantalla; nunca más de maxDistractoresSeguidos objetos
     * seguidos; y si en pantalla solo hay objetos, el siguiente es una parte del cuerpo.
     */
    function elegirImagen(cfg, estado, azar) {
        estado = estado || {};
        var e = etapa(cfg, estado.aciertos);
        var max = Number(juego(cfg).maxDistractoresSeguidos);
        if (!isFinite(max) || max < 1) max = 2;
        var enPantalla = estado.enPantalla || [];
        var hayParte = enPantalla.some(function (id) { return esParteCuerpo(cfg, id); });
        var forzarParte = (estado.distractoresSeguidos || 0) >= max || (enPantalla.length > 0 && !hayParte);
        var distractor = !forzarParte && e.distractores.length > 0 && azar() < e.probDistractor;
        var evitar = enPantalla.concat(estado.ultima ? [estado.ultima] : []);
        var id = elegirDe(distractor ? e.distractores : e.partes, azar, evitar);
        return id;
    }

    /** Agujero libre para el próximo topo; evita el último usado si hay otro. */
    function elegirAgujero(cfg, ocupados, ultimo, azar) {
        var libres = agujeros(cfg).map(function (a) { return a.id; }).filter(function (id) { return (ocupados || []).indexOf(id) < 0; });
        if (!libres.length) return null;
        return elegirDe(libres, azar, ultimo ? [ultimo] : []);
    }

    // ------------------------------------------------------------------ textos

    /** "¡Es {nombre}!" con { nombre: "la nariz" } → "¡Es la nariz!"; {Nombre} pone mayúscula inicial. */
    function plantilla(texto, datos) {
        return String(texto || "").replace(/\{(\w+)\}/g, function (m, clave) {
            var baja = clave.charAt(0).toLowerCase() + clave.slice(1);
            var v = datos && datos[baja] != null ? String(datos[baja]) : "";
            if (clave !== baja && v) v = v.charAt(0).toUpperCase() + v.slice(1);
            return v;
        });
    }

    function formatoTiempo(seg) {
        var s = Math.max(0, Math.ceil(seg || 0));
        var m = Math.floor(s / 60);
        var r = s % 60;
        return m + ":" + (r < 10 ? "0" : "") + r;
    }

    // ------------------------------------------------------------------ revisión de config.json

    /** Lista de problemas de config.json (vacía si todo está bien). iconos: ids de dibujos disponibles. */
    function revisarConfig(cfg, iconos) {
        var errores = [];
        var ids = {};
        imagenes(cfg).forEach(function (i) {
            if (!i.id) errores.push("imagen sin id");
            if (ids[i.id]) errores.push("imagen repetida: " + i.id);
            ids[i.id] = true;
            if (CATEGORIAS.indexOf(i.categoria) < 0) errores.push("categoría inválida en " + i.id);
            if (!i.nombre) errores.push("imagen sin nombre: " + i.id);
            if (iconos && iconos.indexOf(i.icono) < 0) errores.push("falta el dibujo de " + i.id);
        });
        var hoyos = {};
        agujeros(cfg).forEach(function (a) {
            if (hoyos[a.id]) errores.push("agujero repetido: " + a.id);
            hoyos[a.id] = true;
            if (!(a.x > 0 && a.x < 1 && a.y > 0 && a.y < 1)) errores.push("agujero fuera de la colina: " + a.id);
        });
        etapas(cfg).forEach(function (e, k) {
            (e.partes || []).forEach(function (id) { if (!esParteCuerpo(cfg, id)) errores.push("etapa " + k + ": " + id + " no es parte del cuerpo"); });
            (e.distractores || []).forEach(function (id) { if (categoria(cfg, id) !== "distractor") errores.push("etapa " + k + ": " + id + " no es distractor"); });
            if ((e.simultaneos || 1) > agujeros(cfg).length) errores.push("etapa " + k + ": más topos que agujeros");
        });
        return errores;
    }

    var api = {
        CATEGORIAS: CATEGORIAS,
        imagenes: imagenes,
        imagen: imagen,
        categoria: categoria,
        esParteCuerpo: esParteCuerpo,
        evaluarGolpe: evaluarGolpe,
        agujeros: agujeros,
        objetivo: objetivo,
        duracionSeg: duracionSeg,
        progreso: progreso,
        etapa: etapa,
        crearAzar: crearAzar,
        elegirImagen: elegirImagen,
        elegirAgujero: elegirAgujero,
        plantilla: plantilla,
        formatoTiempo: formatoTiempo,
        revisarConfig: revisarConfig
    };

    global.ReglasTopos = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
