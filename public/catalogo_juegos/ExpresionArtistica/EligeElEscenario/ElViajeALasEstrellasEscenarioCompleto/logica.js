/**
 * Reglas puras de "Elige el escenario" — Expresión Artística (sin DOM).
 *
 * Tipos 3-4: arrastreTelon, arrastreUtileria, secuencia.
 * Tipos 5-6: luces, capas, anacronismo, arrastreUtileria.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS_34 = ["arrastreTelon", "arrastreTelon", "arrastreUtileria", "secuencia"];
    const TIPOS_56 = ["luces", "capas", "anacronismo", "arrastreUtileria"];
    const TIPOS = ["arrastreTelon", "arrastreUtileria", "secuencia", "luces", "capas", "anacronismo"];
    const REGLAS = {
        "3-4 años": { tema: "teatro", tipos: TIPOS_34 },
        "5-6 años": { tema: "control", tipos: TIPOS_56 }
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

    function evaluarLuces(reto, focoId, intensidad) {
        if (!reto) return { estado: "mal" };
        const focoOk = focoId === reto.focoCorrecto;
        const inten = Number(intensidad);
        const intenOk = esNumero(inten) && inten <= Number(reto.intensidadObjetivo || 1);
        if (focoOk && intenOk) return { estado: "completo", foco: focoId, intensidad: inten };
        if (focoOk) return { estado: "casi", falta: "intensidad" };
        return { estado: "mal", falta: "foco" };
    }

    function evaluarCapa(reto, piezaId, rielId, colocadas) {
        const halladas = Object.assign({}, colocadas || {});
        const pieza = (reto.piezas || []).find(function (p) { return p.id === piezaId; });
        if (!pieza) return { estado: "mal", halladas: halladas };
        if (halladas[piezaId]) return { estado: "ya", halladas: halladas };
        if (pieza.riel !== rielId) return { estado: "mal", halladas: halladas };
        halladas[piezaId] = rielId;
        const total = (reto.piezas || []).length;
        const hechos = Object.keys(halladas).length;
        if (hechos >= total) return { estado: "completo", halladas: halladas, pieza: piezaId };
        return { estado: "progreso", halladas: halladas, pieza: piezaId };
    }

    function evaluarQuitar(reto, objetoId) {
        if (!reto || !objetoId) return { estado: "mal" };
        if ((reto.objetosEscena || []).indexOf(objetoId) === -1) return { estado: "mal" };
        if (objetoId === reto.quitar) return { estado: "bien" };
        return { estado: "mal" };
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];
        if ((cfg.niveles.length < 1 || cfg.niveles.length > 2)) err("debe haber 1 o 2 niveles");

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const regla = REGLAS[n.edad];
            if (!regla) { err(tag + ": edad desconocida"); return; }
            if (n.tema !== regla.tema) err(tag + ": tema debe ser " + regla.tema);
            if (!cfg.escenas || !cfg.escenas[n.escena]) err(tag + ": escena inexistente");
            if (!Array.isArray(n.retos) || n.retos.length < 1 || n.retos.length > 4) err(tag + ": debe tener entre 1 y 4 retos");
            if (!lineasValidas(n.cierre)) err(tag + ": cierre incompleto");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) err(tag + ": insignia incompleta");

            (n.retos || []).forEach(function (r, i) {
                const iLargo = (typeof r.iOrigen === "number" ? r.iOrigen : i);
                const rt = tag + " reto " + (r && r.id);
                if (!r || TIPOS.indexOf(r.tipo) === -1) { err(rt + ": tipo inválido"); return; }
                if (regla.tipos[iLargo] !== r.tipo) err(rt + ": tipo esperado " + regla.tipos[iLargo] + " (tiene " + r.tipo + ")");
                if (!lineasValidas(r.consigna)) err(rt + ": consigna incompleta");
                if (!lineasValidas(r.acierto)) err(rt + ": acierto incompleto");

                if (r.tipo === "arrastreTelon" || r.tipo === "arrastreUtileria") {
                    if (!r.correcta || idsOpciones(r.opciones).indexOf(r.correcta) === -1) err(rt + ": opciones/correcta");
                    if (!esZona(r.zonaDestino)) err(rt + ": zonaDestino");
                }
                if (r.tipo === "secuencia") {
                    if (!Array.isArray(r.pasos) || r.pasos.length < 2) err(rt + ": pasos incompletos");
                    (r.pasos || []).forEach(function (p, j) {
                        if (!p.correcta || idsOpciones(p.opciones).indexOf(p.correcta) === -1) err(rt + " paso " + j + ": opciones");
                        if (!esZona(p.zonaDestino)) err(rt + " paso " + j + ": zona");
                    });
                }
                if (r.tipo === "luces") {
                    if (!r.focoCorrecto || (r.focos || []).indexOf(r.focoCorrecto) === -1) err(rt + ": focos");
                    if (!esNumero(r.intensidadObjetivo)) err(rt + ": intensidad");
                }
                if (r.tipo === "capas") {
                    if (!Array.isArray(r.rieles) || r.rieles.length < 3) err(rt + ": rieles");
                    if (!Array.isArray(r.piezas) || r.piezas.length < 3) err(rt + ": piezas");
                }
                if (r.tipo === "anacronismo") {
                    if (!r.quitar || (r.objetosEscena || []).indexOf(r.quitar) === -1) err(rt + ": quitar");
                    if (!r.utileria || !esZona(r.zonaDestino)) err(rt + ": utileria/zona");
                }
            });
        });
        return errores;
    }

    global.EligeElEscenarioLogica = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        lineas: lineas,
        idOpcion: idOpcion,
        nombreOpcion: nombreOpcion,
        idsOpciones: idsOpciones,
        evaluarPieza: evaluarPieza,
        evaluarArrastre: evaluarArrastre,
        evaluarLuces: evaluarLuces,
        evaluarCapa: evaluarCapa,
        evaluarQuitar: evaluarQuitar,
        dentroPct: dentroPct,
        validarConfig: validarConfig
    };
    if (typeof module !== "undefined") module.exports = global.EligeElEscenarioLogica;
})(typeof window !== "undefined" ? window : global);
