/**
 * Reglas puras de "¿Cómo me siento?" — Expresión Artística (sin DOM).
 *
 * Tipos 3-4: elegir, elegirAbrazo.
 * Tipos 5-6: elegirArrastre, medidor.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS_34 = ["elegir", "elegir", "elegirAbrazo", "elegir"];
    const TIPOS_56 = ["elegirArrastre", "elegirArrastre", "medidor", "elegirArrastre"];
    const TIPOS = ["elegir", "elegirAbrazo", "elegirArrastre", "medidor"];
    const REGLAS = {
        "3-4 años": { tema: "camerino", tipos: TIPOS_34 },
        "5-6 años": { tema: "escenario", tipos: TIPOS_56 }
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
    function idsOpciones(reto) {
        return (reto.opciones || []).map(idOpcion).filter(Boolean);
    }
    function evaluarEleccion(reto, opcionId) {
        if (!reto || !opcionId) return { estado: "mal" };
        if (idsOpciones(reto).indexOf(opcionId) === -1) return { estado: "mal" };
        if (opcionId === reto.correcta) return { estado: "bien", correcta: true };
        return { estado: "mal", correcta: false };
    }

    function evaluarMedidor(reto, valor) {
        const v = Number(valor);
        if (!esNumero(v)) return { estado: "mal" };
        if (v === reto.nivelCorrecto) return { estado: "completo", valor: v };
        if (v === 2 && reto.nivelCorrecto === 3) return { estado: "casi", valor: v };
        return { estado: "mal", valor: v };
    }

    function evaluarArrastre(reto, px, py) {
        if (!reto || !esZona(reto.zonaDestino)) return { estado: "mal" };
        if (dentroPct(px, py, reto.zonaDestino)) return { estado: "completo" };
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
                if (r.tipo === "medidor") {
                    if (!esNumero(r.nivelCorrecto) || !Array.isArray(r.niveles) || r.niveles.length < 2) {
                        err(rt + ": medidor incompleto");
                    }
                    (r.niveles || []).forEach(function (nv) {
                        if (nv && nv.escena && !cfg.elementos[nv.escena]) err(rt + ": escena intensidad inexistente " + nv.escena);
                    });
                } else {
                    const ids = idsOpciones(r);
                    if (!r.correcta || !ids.length || ids.indexOf(r.correcta) === -1) {
                        err(rt + ": opciones/correcta inválidas");
                    }
                    ids.forEach(function (id) {
                        if (!cfg.elementos[id]) err(rt + ": opción inexistente " + id);
                    });
                }
                if (r.escena && !cfg.elementos[r.escena]) err(rt + ": escena personaje inexistente");
                if (r.tipo === "elegirArrastre") {
                    if (!r.herramienta || !cfg.elementos[r.herramienta]) err(rt + ": herramienta inválida");
                    if (!esZona(r.zonaDestino)) err(rt + ": zonaDestino inválida");
                }
                if (r.tipo === "elegirAbrazo" && !lineasValidas(r.despuesAcierto)) err(rt + ": despuesAcierto incompleto");
            });
        });
        return errores;
    }

    global.ComoMeSientoLogica = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        lineas: lineas,
        lineasValidas: lineasValidas,
        idOpcion: idOpcion,
        nombreOpcion: nombreOpcion,
        idsOpciones: idsOpciones,
        evaluarEleccion: evaluarEleccion,
        evaluarMedidor: evaluarMedidor,
        evaluarArrastre: evaluarArrastre,
        dentroPct: dentroPct,
        validarConfig: validarConfig
    };
})(typeof window !== "undefined" ? window : globalThis);
