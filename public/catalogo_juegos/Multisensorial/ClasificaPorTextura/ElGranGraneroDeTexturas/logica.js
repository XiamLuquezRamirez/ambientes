/**
 * Reglas puras de "Clasifica por textura" (sin DOM).
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TEXTURAS = ["suave", "aspero", "liso", "rugoso"];
    const ESCENARIOS = {
        "3-4 años": {
            escenario: "cestas",
            retos: 3,
            objetos: 4,
            grupos: ["nube", "roca"],
            colocar: ["brillaSalta", "destellosVerdes", "estrellasMulticolor"],
            rechazo: ["rebote", "flotar", "vibraExpulsa"],
            premio: "medalla",
            celebracion: "baile"
        },
        "5-6 años": {
            escenario: "estacion",
            retos: 4,
            objetos: 5,
            grupos: ["suave", "aspero", "liso", "rugoso"],
            colocar: ["absorber", "triturar", "rampa", "escanear3d"],
            rechazo: ["barreraRoja", "deslizarFuera", "frenoSeco", "reboteSuave"],
            premio: "diploma",
            celebracion: "confetiTexturas"
        }
    };

    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }

    /** Una línea o una lista de líneas → lista. */
    function lineas(x) {
        if (!x) return [];
        return Array.isArray(x) ? x.filter(Boolean) : [x];
    }

    function clasificarGesto(dx, dy, umbral) {
        return Math.hypot(dx, dy) < (esNumero(umbral) ? umbral : 12) ? "toque" : "arrastre";
    }

    function esCorrecto(reto, matId) {
        return !!reto && Array.isArray(reto.correctos) && reto.correctos.indexOf(matId) !== -1;
    }

    /** Mensaje del reto cuando el objeto no pertenece al grupo (null si es correcto). */
    function lineaError(reto, matId) {
        if (!reto || esCorrecto(reto, matId)) return null;
        return esLinea(reto.error) ? reto.error : null;
    }

    /** Objetos correctos que aún no están en el grupo. */
    function pendientes(reto, colocados) {
        const puestos = colocados || [];
        return ((reto && reto.correctos) || []).filter(function (m) { return puestos.indexOf(m) === -1; });
    }

    function completo(reto, colocados) {
        return !!reto && pendientes(reto, colocados).length === 0;
    }

    function dentro(p, r, margen) {
        const m = esNumero(margen) ? margen : 0;
        return !!r && p.x >= r.left - m && p.x <= r.left + r.width + m && p.y >= r.top - m && p.y <= r.top + r.height + m;
    }

    /** Zona (cesta o módulo) bajo el punto donde se suelta el objeto. */
    function soltarEn(p, zonas, margen) {
        if (!zonas) return null;
        const ids = Object.keys(zonas);
        for (let i = 0; i < ids.length; i++) {
            if (dentro(p, zonas[ids[i]], margen)) return ids[i];
        }
        return null;
    }

    /** Orden aleatorio (Fisher-Yates) para que el distractor no quede siempre en el mismo puesto. */
    function mezclar(lista, aleatorio) {
        const rnd = typeof aleatorio === "function" ? aleatorio : Math.random;
        const out = (lista || []).slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            const t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    /** Desfile final: objetos que el niño metió en cada cesta, sin repetir material. */
    function contenidoDesfile(nivel) {
        const out = {};
        ((nivel && nivel.grupos) || []).forEach(function (g) { out[g.id] = []; });
        ((nivel && nivel.retos) || []).forEach(function (r) {
            if (!out[r.grupo]) out[r.grupo] = [];
            (r.correctos || []).forEach(function (m) {
                if (out[r.grupo].indexOf(m) === -1) out[r.grupo].push(m);
            });
        });
        return out;
    }

    function friccionDe(mat) {
        const f = mat && esNumero(mat.friccion) ? mat.friccion : 0;
        return Math.max(0, Math.min(1, f));
    }

    /** Pulso de vibración de la pinza (ms) según la fricción: liso casi nada, áspero más fuerte. */
    function pulsoVibracion(friccion) {
        const f = Math.max(0, Math.min(1, esNumero(friccion) ? friccion : 0));
        return f < 0.1 ? 0 : Math.round(6 + f * 24);
    }

    /** Amplitud visual (px) del temblor de la pinza. */
    function amplitudVibracion(friccion) {
        const f = Math.max(0, Math.min(1, esNumero(friccion) ? friccion : 0));
        return Math.round((0.5 + f * 3.5) * 10) / 10;
    }

    /**
     * Comprobación de deslizamiento: los objetos con relieve "tropiezan" (avanzan a saltos);
     * devuelve el tramo en px que debe acumular el dedo antes de que el objeto salte (0 = patina uniforme).
     */
    function tramoTropiezo(friccion) {
        const f = Math.max(0, Math.min(1, esNumero(friccion) ? friccion : 0));
        return f < 0.5 ? 0 : Math.round(18 + f * 22);
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];
        const mats = cfg.materiales || {};

        Object.keys(mats).forEach(function (id) {
            const m = mats[id];
            if (!m.img) err("material " + id + ": falta imagen");
            if (!m.nombre) err("material " + id + ": falta nombre");
            if (!Array.isArray(m.texturas) || !m.texturas.length || !m.texturas.every(function (t) { return TEXTURAS.indexOf(t) !== -1; })) {
                err("material " + id + ": texturas inválidas");
            }
            if (TEXTURAS.indexOf(m.tacto) === -1) err("material " + id + ": tacto inválido");
            if (!m.sonido) err("material " + id + ": sin sonido al tocar");
            if (!esNumero(m.friccion) || m.friccion < 0 || m.friccion > 1) err("material " + id + ": fricción debe ir de 0 a 1");
        });

        const t = cfg.textos || {};
        ["demostracion", "demostracionAcierto", "demostracionFin"].forEach(function (k) {
            if (!t[k]) err("falta textos." + k);
        });
        const demo = cfg.demo || {};
        const matDemo = mats[demo.material];
        if (!matDemo) err("la demostración necesita un material existente");

        const edades = cfg.niveles.map(function (n) { return n.edad; }).sort();
        if (!edades.length || edades.some(function (e) { return Object.keys(ESCENARIOS).indexOf(e) === -1; })) {
            err("edad de nivel desconocida");
        }

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const reglas = ESCENARIOS[n.edad];
            if (!reglas) return;
            if (n.escenario !== reglas.escenario) err(tag + ": escenario debe ser " + reglas.escenario);
            const grupos = n.grupos || [];
            const ids = grupos.map(function (g) { return g.id; });
            if (ids.slice().sort().join("|") !== reglas.grupos.slice().sort().join("|")) {
                err(tag + ": los grupos deben ser " + reglas.grupos.join(", "));
            }
            grupos.forEach(function (g) {
                if (!g.nombre) err(tag + ": grupo " + g.id + " sin nombre");
                if (TEXTURAS.indexOf(g.textura) === -1) err(tag + ": grupo " + g.id + " con textura inválida");
                if (n.escenario === "cestas" && (!g.img || !g.reaccion)) err(tag + ": la cesta " + g.id + " necesita imagen y sonido de reacción");
            });
            if (matDemo && !grupos.some(function (g) { return matDemo.texturas.indexOf(g.textura) !== -1; })) {
                err(tag + ": la demostración no tiene grupo");
            }
            if (!Array.isArray(n.retos) || !n.retos.length || n.retos.length > reglas.retos) err(tag + ": debe tener entre 1 y " + reglas.retos + " retos");
            if (!n.premio || !n.premio.titulo || !n.premio.nombre || n.premio.tipo !== reglas.premio) err(tag + ": premio incompleto");
            if (n.celebracion !== reglas.celebracion) err(tag + ": celebración debe ser " + reglas.celebracion);
            if (!esLinea(n.cierre)) err(tag + ": cierre incompleto");
            if (n.escenario === "cestas" && (!n.cierreEscena || n.cierreEscena.tipo !== "desfile" || !n.cierreEscena.titulo)) {
                err(tag + ": falta el desfile de cestas");
            }

            const usados = {};
            (n.retos || []).forEach(function (r) {
                const rt = tag + " reto " + r.id;
                const grupo = grupos.find(function (g) { return g.id === r.grupo; });
                usados[r.grupo] = true;
                if (!grupo) err(rt + ": grupo inexistente " + r.grupo);
                if (!r.titulo) err(rt + ": sin título");
                const objetos = r.objetos || [];
                const correctos = r.correctos || [];
                if (objetos.length !== reglas.objetos) err(rt + ": debe mostrar " + reglas.objetos + " objetos");
                if (objetos.some(function (o, i) { return objetos.indexOf(o) !== i; })) err(rt + ": objetos repetidos");
                if (objetos.indexOf(demo.material) !== -1) err(rt + ": el material de la demostración no puede ser un reto real");
                if (!correctos.length || correctos.length >= objetos.length) err(rt + ": debe haber correctos y al menos un distractor");
                correctos.forEach(function (m) { if (objetos.indexOf(m) === -1) err(rt + ": correcto " + m + " no está en pantalla"); });
                objetos.forEach(function (m) {
                    const mat = mats[m];
                    if (!mat) { err(rt + ": material inexistente " + m); return; }
                    if (!grupo) return;
                    const tiene = mat.texturas.indexOf(grupo.textura) !== -1;
                    const marcado = correctos.indexOf(m) !== -1;
                    if (tiene !== marcado) err(rt + ": " + m + (marcado ? " no es " : " también es ") + grupo.textura);
                });
                if (!lineas(r.presentacion).length || !lineas(r.presentacion).every(esLinea)) err(rt + ": presentación incompleta");
                if (!esLinea(r.completo)) err(rt + ": mensaje de grupo completo incompleto");
                if (!esLinea(r.error)) err(rt + ": error incompleto");
                if (!r.colocar || reglas.colocar.indexOf(r.colocar.efecto) === -1 || !r.colocar.sonido) err(rt + ": respuesta al colocar inválida");
                if (!r.rechazo || reglas.rechazo.indexOf(r.rechazo.efecto) === -1 || !r.rechazo.sonido) err(rt + ": rechazo inválido");
            });
            if (n.escenario === "estacion") {
                /* partido: no exigir todos los módulos */
            }
        });
        return errores;
    }

    const api = {
        TEXTURAS: TEXTURAS,
        lineas: lineas,
        esLinea: esLinea,
        clasificarGesto: clasificarGesto,
        esCorrecto: esCorrecto,
        lineaError: lineaError,
        pendientes: pendientes,
        completo: completo,
        dentro: dentro,
        soltarEn: soltarEn,
        mezclar: mezclar,
        contenidoDesfile: contenidoDesfile,
        friccionDe: friccionDe,
        pulsoVibracion: pulsoVibracion,
        amplitudVibracion: amplitudVibracion,
        tramoTropiezo: tramoTropiezo,
        validarConfig: validarConfig
    };

    global.ClasificaTexturaLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
