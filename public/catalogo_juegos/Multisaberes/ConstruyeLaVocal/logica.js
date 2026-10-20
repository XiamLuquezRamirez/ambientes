/**
 * ConstruyeVocalLogica — reglas de encaje sin DOM.
 * Slots en % del tablero; cada slot exige una forma (y rotación 0/90/180/270).
 */
(function (global) {
    "use strict";

    var VOCALES = ["a", "e", "i", "o", "u"];

    function azar(aleatorio) {
        return typeof aleatorio === "function" ? aleatorio : Math.random;
    }

    function mezclar(lista, aleatorio) {
        var rnd = azar(aleatorio);
        var out = (lista || []).slice();
        var i;
        for (i = out.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = out[i];
            out[i] = out[j];
            out[j] = t;
        }
        return out;
    }

    function normRot(r) {
        var n = ((Number(r) || 0) % 360 + 360) % 360;
        if (n > 315 || n <= 45) return 0;
        if (n <= 135) return 90;
        if (n <= 225) return 180;
        return 270;
    }

    function defVocal(cfg, id) {
        return (cfg && cfg.vocales && cfg.vocales[id]) || null;
    }

    function defForma(cfg, id) {
        return (cfg && cfg.formas && cfg.formas[id]) || null;
    }

    function slotPorId(vocalDef, slotId) {
        if (!vocalDef || !vocalDef.slots) return null;
        var i;
        for (i = 0; i < vocalDef.slots.length; i++) {
            if (vocalDef.slots[i].id === slotId) return vocalDef.slots[i];
        }
        return null;
    }

    function piezasParaFinal(cfg, vocalId, distractores, rnd) {
        var v = defVocal(cfg, vocalId);
        if (!v) return [];
        var necesarias = (v.slots || []).map(function (s) { return s.forma; });
        var pool = Object.keys(cfg.formas || {}).filter(function (f) {
            return necesarias.indexOf(f) === -1;
        });
        var extras = mezclar(pool, rnd).slice(0, Math.max(0, distractores | 0));
        return mezclar(necesarias.concat(extras), rnd);
    }

    /**
     * Prepara un reto jugable.
     * @returns {{ vocal, faltan, piezas:[{id,forma,rot}], slots, silueta, color, cinta, flotar, rotar, modeloBreve, pistaTrasFallos, presenta, acierto }}
     */
    function preparar(reto, cfg, estado, aleatorio) {
        var rnd = azar(aleatorio);
        var st = estado || {};
        var vocalId = reto.vocal;
        var faltan = (reto.faltan || []).slice();
        var piezasIds = (reto.piezas || []).slice();

        if (reto.tipo === "final") {
            var pool = (reto.pool || VOCALES).slice();
            if (st.ultimaFinal && pool.length > 1) {
                pool = pool.filter(function (v) { return v !== st.ultimaFinal; });
            }
            vocalId = pool[Math.floor(rnd() * pool.length)] || VOCALES[0];
            var vDef = defVocal(cfg, vocalId);
            faltan = (vDef && vDef.slots ? vDef.slots : []).map(function (s) { return s.id; });
            piezasIds = piezasParaFinal(cfg, vocalId, reto.distractores != null ? reto.distractores : 1, rnd);
        }

        var vocal = defVocal(cfg, vocalId);
        if (!vocal) return null;

        if (!faltan.length) {
            faltan = (vocal.slots || []).map(function (s) { return s.id; });
        }

        var rotarSet = {};
        (reto.rotar || []).forEach(function (f) { rotarSet[f] = true; });

        var piezas = [];
        var i;
        for (i = 0; i < piezasIds.length; i++) {
            var forma = piezasIds[i];
            if (!defForma(cfg, forma)) continue;
            piezas.push({
                id: forma + "-" + i,
                forma: forma,
                rot: rotarSet[forma] ? 90 : 0
            });
        }
        piezas = mezclar(piezas, rnd);

        return {
            vocal: vocalId,
            faltan: faltan,
            piezas: piezas,
            slots: (vocal.slots || []).slice(),
            silueta: vocal.silueta,
            color: vocal.color || "#64748b",
            fijos: (vocal.fijos || []).slice(),
            cinta: !!reto.cinta,
            flotar: !!reto.flotar,
            rotar: (reto.rotar || []).slice(),
            dispersar: Math.max(0, Number(reto.dispersar) || 0),
            modeloBreve: !!reto.modeloBreve,
            cincoSiluetas: !!reto.cincoSiluetas,
            pistaTrasFallos: reto.pistaTrasFallos != null ? Number(reto.pistaTrasFallos) : 0,
            presenta: reto.presenta || null,
            acierto: reto.acierto || {},
            esFinal: reto.tipo === "final"
        };
    }

    function encaja(piezaForma, piezaRot, slot) {
        if (!slot || !piezaForma) return false;
        if (slot.forma !== piezaForma) return false;
        return normRot(piezaRot) === normRot(slot.rot || 0);
    }

    function slotCompatible(piezaForma, piezaRot, slotsVacios) {
        var i;
        for (i = 0; i < (slotsVacios || []).length; i++) {
            if (encaja(piezaForma, piezaRot, slotsVacios[i])) return slotsVacios[i];
        }
        return null;
    }

    function clasificarGesto(dx, dy) {
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 12) return "tap";
        return "arrastre";
    }

    function cercaPunto(px, py, rect, factor) {
        if (!rect) return false;
        var f = factor != null ? factor : 1.25;
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var rx = Math.max(rect.width, 40) * f / 2;
        var ry = Math.max(rect.height, 40) * f / 2;
        return Math.abs(px - cx) <= rx && Math.abs(py - cy) <= ry;
    }

    function validarConfig(cfg) {
        var errores = [];
        if (!cfg || !cfg.formas) errores.push("falta formas");
        if (!cfg || !cfg.vocales) errores.push("falta vocales");
        if (!cfg || !Array.isArray(cfg.niveles) || !cfg.niveles.length) errores.push("falta niveles");
        Object.keys((cfg && cfg.vocales) || {}).forEach(function (vid) {
            var v = cfg.vocales[vid];
            (v.slots || []).forEach(function (s) {
                if (!cfg.formas[s.forma]) errores.push("vocal " + vid + " slot " + s.id + " forma inexistente");
            });
        });
        return errores;
    }

    global.ConstruyeVocalLogica = {
        VOCALES: VOCALES,
        preparar: preparar,
        encaja: encaja,
        slotCompatible: slotCompatible,
        slotPorId: slotPorId,
        defVocal: defVocal,
        defForma: defForma,
        clasificarGesto: clasificarGesto,
        cercaPunto: cercaPunto,
        normRot: normRot,
        mezclar: mezclar,
        validarConfig: validarConfig
    };
})(typeof window !== "undefined" ? window : this);
