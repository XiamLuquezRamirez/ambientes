/**
 * Reglas puras de "Encuentra las diferencias" — Expresión Artística (sin DOM).
 *
 * Tipos 3-4: faltante, color, extra, multi.
 * Tipos 5-6: intruso, memoria, espejo, anacronismo.
 */
(function (global) {
    "use strict";

    const VOCES = ["zoe", "zeus"];
    const TIPOS_34 = ["faltante", "color", "extra", "multi"];
    const TIPOS_56 = ["intruso", "memoria", "espejo", "anacronismo"];
    const TIPOS = TIPOS_34.concat(TIPOS_56);
    const REGLAS = {
        "3-4 años": { tema: "galeria", tipos: TIPOS_34 },
        "5-6 años": { tema: "museo", tipos: TIPOS_56 }
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
        return !!z && typeof z.id === "string" && esNumero(z.x) && esNumero(z.y) && esNumero(z.w) && esNumero(z.h) && z.w > 0 && z.h > 0;
    }
    function dentroPct(px, py, z) {
        const halfW = z.w / 2;
        const halfH = z.h / 2;
        return px >= z.x - halfW && px <= z.x + halfW && py >= z.y - halfH && py <= z.y + halfH;
    }
    function dist2(px, py, z) {
        const dx = px - z.x;
        const dy = py - z.y;
        return dx * dx + dy * dy;
    }

    /** Objetivo pendiente más cercano al toque (coords % del cuadro). */
    function objetivoEn(reto, encontrados, px, py) {
        let mejor = null;
        let mejorD = Infinity;
        (reto.objetivos || []).forEach(function (o) {
            if (encontrados && encontrados[o.id]) return;
            if (!esZona(o) || !dentroPct(px, py, o)) return;
            const d = dist2(px, py, o);
            if (d < mejorD) {
                mejorD = d;
                mejor = o.id;
            }
        });
        return mejor;
    }

    /** Distractor tocado (intruso / anacronismo). */
    function distractorEn(reto, px, py) {
        let mejor = null;
        let mejorD = Infinity;
        (reto.distractores || []).forEach(function (o) {
            if (!esZona(o) || !dentroPct(px, py, o)) return;
            const d = dist2(px, py, o);
            if (d < mejorD) {
                mejorD = d;
                mejor = o.id;
            }
        });
        return mejor;
    }

    function evaluarToque(reto, encontrados, px, py) {
        const hallados = Object.assign({}, encontrados || {});
        const id = objetivoEn(reto, hallados, px, py);
        if (id) {
            hallados[id] = true;
            const total = (reto.objetivos || []).length;
            const n = Object.keys(hallados).length;
            return {
                estado: n >= total ? "completo" : "bien",
                objetivo: id,
                encontrados: hallados
            };
        }
        if (distractorEn(reto, px, py)) {
            return { estado: "distractores", encontrados: hallados };
        }
        return { estado: "mal", encontrados: hallados };
    }

    function retoCompleto(reto, encontrados) {
        return (reto.objetivos || []).every(function (o) {
            return !!(encontrados && encontrados[o.id]);
        });
    }

    function usaDosCuadros(tipo) {
        return TIPOS_34.indexOf(tipo) !== -1 || tipo === "espejo";
    }

    function usaUnCuadro(tipo) {
        return tipo === "intruso" || tipo === "memoria" || tipo === "anacronismo";
    }

    function validarConfig(cfg) {
        const errores = [];
        const err = function (m) { errores.push(m); };
        if (!cfg || !Array.isArray(cfg.niveles)) return ["config sin niveles"];
        if (cfg.niveles.length !== 2) err("deben existir exactamente 2 niveles");

        cfg.niveles.forEach(function (n) {
            const tag = "nivel " + n.id;
            const regla = REGLAS[n.edad];
            if (!regla) { err(tag + ": edad desconocida " + n.edad); return; }
            if (n.tema !== regla.tema) err(tag + ": tema debe ser " + regla.tema);
            if (!cfg.escenas || !cfg.escenas[n.escena]) err(tag + ": escena inexistente");
            if (!Array.isArray(n.retos) || n.retos.length !== 4) err(tag + ": debe tener 4 retos");
            if (!lineasValidas(n.cierre)) err(tag + ": cierre incompleto");
            if (!n.insignia || !n.insignia.img || !n.insignia.nombre) err(tag + ": insignia incompleta");

            (n.retos || []).forEach(function (r, i) {
                const rt = tag + " reto " + (r && r.id);
                if (!r || TIPOS.indexOf(r.tipo) === -1) { err(rt + ": tipo inválido"); return; }
                if (regla.tipos[i] !== r.tipo) err(rt + ": tipo esperado " + regla.tipos[i]);
                if (!lineasValidas(r.consigna)) err(rt + ": consigna incompleta");
                if (!lineasValidas(r.acierto)) err(rt + ": acierto incompleto");
                if (!Array.isArray(r.objetivos) || !r.objetivos.length) err(rt + ": sin objetivos");
                (r.objetivos || []).forEach(function (o) {
                    if (!esZona(o)) err(rt + ": objetivo inválido " + (o && o.id));
                });
                (r.distractores || []).forEach(function (o) {
                    if (!esZona(o)) err(rt + ": distractor inválido " + (o && o.id));
                });
                if (usaDosCuadros(r.tipo)) {
                    if (!r.cuadroA || !r.cuadroB) err(rt + ": faltan cuadroA/cuadroB");
                    if (!cfg.elementos[r.cuadroA] || !cfg.elementos[r.cuadroB]) err(rt + ": cuadros no en elementos");
                    if (r.cuadroBResuelto && !cfg.elementos[r.cuadroBResuelto]) err(rt + ": cuadroBResuelto inexistente");
                    if (r.progresoB) {
                        Object.keys(r.progresoB).forEach(function (k) {
                            if (!cfg.elementos[r.progresoB[k]]) err(rt + ": progresoB " + k + " inexistente");
                        });
                    }
                }
                if (usaUnCuadro(r.tipo) && r.tipo !== "memoria") {
                    if (!r.cuadro || !cfg.elementos[r.cuadro]) err(rt + ": falta cuadro");
                    if (r.cuadroResuelto && !cfg.elementos[r.cuadroResuelto]) err(rt + ": cuadroResuelto inexistente");
                }
                if (r.tipo === "memoria") {
                    if (!r.cuadroAntes || !r.cuadroDespues) err(rt + ": faltan cuadros de memoria");
                    if (!cfg.elementos[r.cuadroAntes] || !cfg.elementos[r.cuadroDespues]) err(rt + ": cuadros memoria inexistentes");
                    if (r.cuadroResuelto && !cfg.elementos[r.cuadroResuelto]) err(rt + ": cuadroResuelto inexistente");
                    if (!esNumero(r.observarMs) || !esNumero(r.parpadeoMs)) err(rt + ": tiempos de memoria");
                }
            });
        });
        return errores;
    }

    global.EncuentraLasDiferenciasLogica = {
        VOCES: VOCES,
        TIPOS: TIPOS,
        REGLAS: REGLAS,
        lineas: lineas,
        lineasValidas: lineasValidas,
        objetivoEn: objetivoEn,
        distractorEn: distractorEn,
        evaluarToque: evaluarToque,
        retoCompleto: retoCompleto,
        usaDosCuadros: usaDosCuadros,
        usaUnCuadro: usaUnCuadro,
        validarConfig: validarConfig
    };
})(typeof window !== "undefined" ? window : globalThis);
