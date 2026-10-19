/**
 * ClasificaSentidosLogica — reglas puras (sin DOM).
 * 3-4: una canasta, un toque. 5-6: varios tubos, cada pieza a su sentido.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const REGLAS = {
        "3": { retos: 3, mecanica: "elige", escena: "canastas" },
        "5": { retos: 3, mecanica: "clasifica", escena: "laboratorio" }
    };

    function esLinea(l) {
        return !!(l && typeof l.texto === "string" && l.texto.trim() && VOCES.indexOf(l.voz) !== -1);
    }

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

    function ordenarOpciones(opciones, correcto, aleatorio) {
        const lista = (opciones || []).slice();
        if (lista.length < 2) return lista;
        let orden = mezclar(lista, aleatorio);
        for (let i = 0; i < 40 && lista.length > 2 && orden[0] === correcto; i++) {
            orden = mezclar(lista, aleatorio);
        }
        return orden;
    }

    function mapaDe(reto) {
        const mapa = {};
        if (reto && reto.mecanica === "elige" && reto.correcto) {
            mapa[reto.correcto] = (reto.tubos || [])[0];
        }
        (reto && reto.piezas || []).forEach(function (p) {
            mapa[p.id] = p.tubo;
        });
        return mapa;
    }

    function idsDe(reto) {
        if (!reto) return [];
        if (reto.mecanica === "elige") return (reto.opciones || []).slice();
        return (reto.piezas || []).map(function (p) { return p.id; });
    }

    function preparar(reto, aleatorio) {
        const mapa = mapaDe(reto);
        const ids = idsDe(reto);
        const orden = reto.mecanica === "elige"
            ? ordenarOpciones(ids, reto.correcto, aleatorio)
            : mezclar(ids, aleatorio);
        return { mecanica: reto.mecanica, tubos: (reto.tubos || []).slice(), orden: orden, mapa: mapa };
    }

    /**
     * @returns {"correcto"|"incorrecto"}
     */
    function evaluar(reto, itemId, tuboId) {
        const mapa = mapaDe(reto);
        if (!mapa[itemId]) return "incorrecto";
        return mapa[itemId] === tuboId ? "correcto" : "incorrecto";
    }

    function completo(reto, colocados) {
        const mapa = mapaDe(reto);
        const ids = Object.keys(mapa);
        if (!ids.length) return false;
        return ids.every(function (id) { return colocados && colocados[id] === mapa[id]; });
    }

    function errorPara(reto, itemId) {
        if (!reto) return null;
        const propio = (reto.errores || []).find(function (e) {
            return (e.objetos || []).indexOf(itemId) !== -1;
        });
        const base = propio || reto.errorOtro;
        if (!esLinea(base)) return null;
        return { voz: base.voz, texto: base.texto, efecto: base.efecto || "boing" };
    }

    function clasificarGesto(dx, dy, umbral) {
        return Math.hypot(dx, dy) < (typeof umbral === "number" ? umbral : 12) ? "toque" : "arrastre";
    }

    function dentro(p, r, margen) {
        const m = typeof margen === "number" ? margen : 28;
        return !!r && p.x >= r.left - m && p.x <= r.left + r.width + m && p.y >= r.top - m && p.y <= r.top + r.height + m;
    }

    function validarConfig(cfg) {
        const errores = [];
        const elementos = (cfg && cfg.elementos) || {};
        const sentidos = (cfg && cfg.sentidos) || {};
        const niveles = (cfg && cfg.niveles) || [];
        if (!niveles.length) errores.push("Sin niveles");
        if (cfg && (cfg.stub || cfg.creado_en)) errores.push("config aún es stub");
        Object.keys(elementos).forEach(function (id) {
            const e = elementos[id];
            if (!e.img) errores.push("Elemento " + id + ": sin imagen");
            if (!e.nombre) errores.push("Elemento " + id + ": sin nombre");
        });
        Object.keys(sentidos).forEach(function (id) {
            if (!sentidos[id].icono || !sentidos[id].nombre) errores.push("Sentido " + id + " incompleto");
        });
        niveles.forEach(function (n) {
            const tag = "Nivel " + n.id;
            const reglas = REGLAS[String(n.id)];
            if (!reglas) {
                errores.push(tag + ": sin reglas");
                return;
            }
            if (n.escena !== reglas.escena) errores.push(tag + ": escena " + n.escena);
            const retos = n.retos || [];
            if (retos.length !== reglas.retos) errores.push(tag + ": debe tener " + reglas.retos + " retos");
            retos.forEach(function (r, i) {
                const rt = tag + " reto " + (i + 1);
                if (r.mecanica !== reglas.mecanica) errores.push(rt + ": se esperaba " + reglas.mecanica);
                if (!(r.tubos || []).length) errores.push(rt + ": sin tubos");
                (r.tubos || []).forEach(function (s) {
                    if (!sentidos[s]) errores.push(rt + ": sentido inexistente " + s);
                });
                if (!esLinea(r.presentacion)) errores.push(rt + ": presentación inválida");
                if (r.pregunta && !esLinea(r.pregunta)) errores.push(rt + ": pregunta inválida");
                if (!esLinea(r.acierto)) errores.push(rt + ": acierto inválido");
                if (!esLinea(r.errorOtro) && !(r.errores || []).length) errores.push(rt + ": falta voz de error");
                (r.errores || []).forEach(function (e) {
                    if (!esLinea(e)) errores.push(rt + ": error específico inválido");
                });
                idsDe(r).forEach(function (id) {
                    if (!elementos[id]) errores.push(rt + ": objeto inexistente " + id);
                });
                if (r.mecanica === "elige") {
                    if (!r.correcto || (r.opciones || []).indexOf(r.correcto) === -1) {
                        errores.push(rt + ": correcto fuera de opciones");
                    }
                    if ((r.opciones || []).length < 3) errores.push(rt + ": faltan opciones");
                }
                if (r.mecanica === "clasifica") {
                    const mapa = mapaDe(r);
                    if (Object.keys(mapa).length < 4) errores.push(rt + ": faltan piezas");
                    Object.keys(mapa).forEach(function (id) {
                        if ((r.tubos || []).indexOf(mapa[id]) === -1) errores.push(rt + ": " + id + " apunta a un tubo que no está");
                    });
                }
            });
            if (!Array.isArray(n.cierre) || !n.cierre.length || !n.cierre.every(esLinea)) errores.push(tag + ": cierre inválido");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) errores.push(tag + ": sin insignia");
        });
        return errores;
    }

    const api = {
        VOCES: VOCES,
        REGLAS: REGLAS,
        esLinea: esLinea,
        mezclar: mezclar,
        ordenarOpciones: ordenarOpciones,
        mapaDe: mapaDe,
        idsDe: idsDe,
        preparar: preparar,
        evaluar: evaluar,
        completo: completo,
        errorPara: errorPara,
        clasificarGesto: clasificarGesto,
        dentro: dentro,
        validarConfig: validarConfig
    };

    global.ClasificaSentidosLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
