/**
 * Reglas puras de "Viste al artista" — Expresión Artística (sin DOM).
 *
 * Tipos 3-4: arrastrePrenda ×3 + vestirMulti (mago 2 piezas).
 * Tipos 5-6: vestirMulti (caballero) + arrastrePrenda (rock) + vestirMulti ×2.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS_34 = ["arrastrePrenda", "arrastrePrenda", "arrastrePrenda", "vestirMulti"];
    const TIPOS_56 = ["vestirMulti", "arrastrePrenda", "vestirMulti", "vestirMulti"];
    const TIPOS = ["arrastrePrenda", "vestirMulti"];
    const REGLAS = {
        "3-4 años": { tema: "camerino", tipos: TIPOS_34 },
        "5-6 años": { tema: "camerino-pro", tipos: TIPOS_56 }
    };

    function esLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) !== -1;
    }
    function lineas(x) {
        if (!x) return [];
        return (Array.isArray(x) ? x : [x]).filter(esLinea);
    }
    function lineasValidas(x) {
        const lista = Array.isArray(x) ? x : [x];
        return lista.length > 0 && lista.every(esLinea);
    }
    function esNumero(n) {
        return typeof n === "number" && isFinite(n);
    }
    function esZona(z) {
        return !!z && esNumero(z.x) && esNumero(z.y) && esNumero(z.w) && esNumero(z.h) && z.w > 0 && z.h > 0;
    }
    function dentroPct(px, py, z) {
        const halfW = z.w / 2;
        const halfH = z.h / 2;
        return px >= z.x - halfW && px <= z.x + halfW && py >= z.y - halfH && py <= z.y + halfH;
    }
    function idOpcion(o) {
        if (!o) return "";
        return typeof o === "string" ? o : String(o.id || "");
    }
    function nombreOpcion(o, elementos) {
        if (o && typeof o === "object" && o.nombre) return o.nombre;
        const id = idOpcion(o);
        return (elementos && elementos[id] && elementos[id].nombre) || id;
    }
    function idsOpciones(lista) {
        return (lista || []).map(idOpcion).filter(Boolean);
    }
    function idsPiezas(piezas) {
        return (piezas || []).map(function (p) { return p && p.id; }).filter(Boolean);
    }

    function evaluarPieza(retoOPaso, piezaId) {
        if (!retoOPaso || !piezaId) return { estado: "mal" };
        const ids = idsOpciones(retoOPaso.opciones);
        if (ids.length && ids.indexOf(piezaId) === -1) return { estado: "mal" };
        if (piezaId === retoOPaso.correcta) return { estado: "bien", correcta: true };
        return { estado: "mal", correcta: false };
    }

    function evaluarArrastre(retoOPaso, piezaId, px, py) {
        const eleccion = evaluarPieza(retoOPaso, piezaId);
        if (eleccion.estado !== "bien") return eleccion;
        if (!esZona(retoOPaso.zonaDestino)) return { estado: "mal" };
        if (dentroPct(px, py, retoOPaso.zonaDestino)) return { estado: "completo" };
        return { estado: "fuera" };
    }

    /** Coloca una pieza en vestirMulti. colocadas = { piezaId: true }. */
    function evaluarVestir(reto, piezaId, px, py, colocadas) {
        const halladas = Object.assign({}, colocadas || {});
        if (!reto || !piezaId) return { estado: "mal", halladas: halladas };
        if (halladas[piezaId]) return { estado: "ya", halladas: halladas };

        const correcta = (reto.piezas || []).find(function (p) { return p.id === piezaId; });
        const esDistractor = (reto.distractores || []).indexOf(piezaId) !== -1;

        if (!correcta) {
            if (esDistractor) return { estado: "mal", halladas: halladas, distractor: true };
            return { estado: "mal", halladas: halladas };
        }
        if (!esZona(correcta.zonaDestino)) return { estado: "mal", halladas: halladas };
        if (!dentroPct(px, py, correcta.zonaDestino)) return { estado: "fuera", halladas: halladas, pieza: correcta };

        halladas[piezaId] = true;
        const total = (reto.piezas || []).length;
        const hechos = Object.keys(halladas).length;
        if (hechos >= total) return { estado: "completo", halladas: halladas, pieza: correcta };
        return { estado: "progreso", halladas: halladas, pieza: correcta };
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];
        if (cfg.niveles.length !== 2) err("deben existir exactamente 2 niveles");

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const regla = REGLAS[n.edad];
            if (!regla) { err(tag + ": edad desconocida"); return; }
            if (n.tema !== regla.tema) err(tag + ": tema debe ser " + regla.tema);
            if (!cfg.escenas || !cfg.escenas[n.escena]) err(tag + ": escena inexistente");
            if (!Array.isArray(n.retos) || n.retos.length !== 4) err(tag + ": debe tener 4 retos");
            if (!lineasValidas(n.cierre)) err(tag + ": cierre incompleto");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) err(tag + ": insignia incompleta");

            (n.retos || []).forEach(function (r, i) {
                const rt = tag + " reto " + (r && r.id);
                if (!r || TIPOS.indexOf(r.tipo) === -1) { err(rt + ": tipo inválido"); return; }
                if (regla.tipos[i] !== r.tipo) err(rt + ": tipo esperado " + regla.tipos[i] + " (tiene " + r.tipo + ")");
                if (!lineasValidas(r.consigna)) err(rt + ": consigna incompleta");
                if (!lineasValidas(r.acierto)) err(rt + ": acierto incompleto");
                if (!r.personaje) err(rt + ": personaje requerido");

                if (r.tipo === "arrastrePrenda") {
                    if (!r.correcta || idsOpciones(r.opciones).indexOf(r.correcta) === -1) err(rt + ": opciones/correcta");
                    if (!esZona(r.zonaDestino)) err(rt + ": zonaDestino");
                    if (!lineasValidas(r.error)) err(rt + ": error incompleto");
                }
                if (r.tipo === "vestirMulti") {
                    if (!Array.isArray(r.piezas) || r.piezas.length < 2) err(rt + ": piezas incompletas");
                    const ids = idsPiezas(r.piezas);
                    if (new Set(ids).size !== ids.length) err(rt + ": piezas duplicadas");
                    (r.piezas || []).forEach(function (p, j) {
                        if (!p || !p.id) err(rt + " pieza " + j + ": id");
                        if (!esZona(p.zonaDestino)) err(rt + " pieza " + j + ": zona");
                        if (!p.slot) err(rt + " pieza " + j + ": slot");
                    });
                    if (r.error && !lineasValidas(r.error)) err(rt + ": error inválido");
                }
            });
        });
        return errores;
    }

    global.VisteAlArtistaLogica = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        lineas: lineas,
        idOpcion: idOpcion,
        nombreOpcion: nombreOpcion,
        idsOpciones: idsOpciones,
        idsPiezas: idsPiezas,
        evaluarPieza: evaluarPieza,
        evaluarArrastre: evaluarArrastre,
        evaluarVestir: evaluarVestir,
        dentroPct: dentroPct,
        validarConfig: validarConfig
    };
    if (typeof module !== "undefined") module.exports = global.VisteAlArtistaLogica;
})(typeof window !== "undefined" ? window : global);
