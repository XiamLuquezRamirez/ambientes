/**
 * CompletaFiguraLogica — reglas puras del juego (sin DOM) para poder probarlas en Node.
 * Todas las medidas están en unidades de la escena (300 × 240): las piezas se dibujan a la
 * misma escala que la figura, por eso el tamaño de una pieza se puede comparar con su hueco.
 */
(function (global) {
    "use strict";

    const ESCENA = { w: 300, h: 240 };
    const TEMAS = ["taller", "ingenieria"];
    const MECANICAS = ["encaje", "lodo", "simetria", "calibrador", "clima"];
    const REACCIONES = ["rebote", "caeLado", "inclinaVuelo", "inclinaRampa", "lluvia", "viento", "filtra"];
    const CELEBRACIONES = ["mariposaVuela", "carroArranca", "casaIlumina", "acrobacias", "pruebaAceleracion", "lluviaPerfecta"];
    const VOCES = ["zoe", "zeus"];
    /** 4 unidades de escena = 1 cm simulado en la regla holográfica. */
    const UNIDADES_POR_CM = 4;

    function esRect(r) {
        return !!r && ["x", "y", "w", "h"].every(function (k) { return typeof r[k] === "number" && isFinite(r[k]); }) && r.w > 0 && r.h > 0;
    }

    function encajaExacto(hueco, pieza, tol) {
        const t = tol == null ? 0.5 : tol;
        return !!hueco && !!pieza && Math.abs(hueco.w - pieza.w) <= t && Math.abs(hueco.h - pieza.h) <= t;
    }

    /**
     * Dónde queda una pieza al presentarla en el hueco: "hueco" (exacta), "centro",
     * "base" (apoyada abajo) o "izquierda" (pegada al borde izquierdo, centrada en alto).
     */
    function rectColocacion(hueco, pieza, ancla) {
        if (ancla === "hueco" && encajaExacto(hueco, pieza)) return { x: hueco.x, y: hueco.y, w: hueco.w, h: hueco.h };
        const cx = hueco.x + hueco.w / 2;
        const cy = hueco.y + hueco.h / 2;
        if (ancla === "base") return { x: cx - pieza.w / 2, y: hueco.y + hueco.h - pieza.h, w: pieza.w, h: pieza.h };
        if (ancla === "izquierda") return { x: hueco.x, y: cy - pieza.h / 2, w: pieza.w, h: pieza.h };
        return { x: cx - pieza.w / 2, y: cy - pieza.h / 2, w: pieza.w, h: pieza.h };
    }

    function medidaCm(rect, medida) {
        const u = medida === "alto" ? rect.h : rect.w;
        return Math.round(u / UNIDADES_POR_CM);
    }

    function debeMostrarRegla(estado, reglas) {
        const n = reglas && Number(reglas.reglaTrasErrores);
        return !!n && !!estado && estado.consecutivos >= n;
    }

    /** Grados extra que se inclina el carro: rueda grande levanta el frente (negativo), pequeña lo baja. */
    function inclinacionRueda(diametroEje, diametroPieza, maximo) {
        const max = maximo == null ? 14 : maximo;
        const dif = (diametroPieza - diametroEje) / diametroEje;
        const g = -dif * 40;
        return Math.max(-max, Math.min(max, Math.round(g * 10) / 10));
    }

    /** Altura del techo (triángulo o trapecio) en x; null si x queda fuera del techo. */
    function yTecho(x, techo) {
        if (x < techo.x || x > techo.x + techo.w) return null;
        const base = techo.y + techo.h;
        if (techo.forma === "trapecio") {
            const borde = techo.w * 0.2;
            if (x < techo.x + borde) return base - techo.h * ((x - techo.x) / borde);
            if (x > techo.x + techo.w - borde) return base - techo.h * ((techo.x + techo.w - x) / borde);
            return techo.y;
        }
        const cx = techo.x + techo.w / 2;
        return base - techo.h * (1 - Math.abs(x - cx) / (techo.w / 2));
    }

    function enPartePlana(x, techo) {
        if (techo.forma !== "trapecio") return false;
        const borde = techo.w * 0.2;
        return x > techo.x + borde && x < techo.x + techo.w - borde;
    }

    /**
     * Qué pasa con una gota que cae en x: "resbala" por el techo hacia fuera, "gotera" (entra a la casa
     * por un borde descubierto), "filtra" (atraviesa la parte plana y cae dentro) o "afuera".
     */
    function destinoGota(x, techo, paredes, filtraPlano) {
        const sobreParedes = x >= paredes.x && x <= paredes.x + paredes.w;
        const y = yTecho(x, techo);
        if (y == null) return sobreParedes ? "gotera" : "afuera";
        if (filtraPlano && sobreParedes && enPartePlana(x, techo)) return "filtra";
        const salida = x < techo.x + techo.w / 2 ? techo.x : techo.x + techo.w;
        const caeDentro = salida > paredes.x && salida < paredes.x + paredes.w;
        return caeDentro ? "gotera" : "resbala";
    }

    function fraccionLimpia(alfas, umbral) {
        if (!alfas || !alfas.length) return 0;
        const u = umbral == null ? 40 : umbral;
        let limpias = 0;
        for (let i = 0; i < alfas.length; i++) if (alfas[i] < u) limpias++;
        return limpias / alfas.length;
    }

    function cercaDe(p, c, radio) {
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        return dx * dx + dy * dy <= radio * radio;
    }

    /** "toque" si el dedo casi no se movió; "arrastre" si se desplazó más que el umbral (px). */
    function clasificarGesto(dx, dy, umbral) {
        const u = umbral == null ? 14 : umbral;
        return Math.sqrt(dx * dx + dy * dy) > u ? "arrastre" : "toque";
    }

    function barajar(lista, rng) {
        const r = typeof rng === "function" ? rng : Math.random;
        const a = (lista || []).slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(r() * (i + 1));
            const t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function textoLinea(l) {
        return !!l && typeof l.texto === "string" && l.texto.trim() !== "" && VOCES.indexOf(l.voz) >= 0;
    }

    function validarReto(cfg, nivel, reto, i, errores) {
        const pre = "nivel " + nivel.id + " reto " + (i + 1) + ": ";
        const piezas = cfg.piezas || {};
        if (MECANICAS.indexOf(reto.mecanica) < 0) errores.push(pre + "mecánica desconocida " + reto.mecanica);
        if (!Array.isArray(reto.capas) || !reto.capas.length) errores.push(pre + "sin capas");
        (reto.capas || []).forEach(function (c) { if (!c.img) errores.push(pre + "capa sin imagen"); });
        if (!esRect(reto.hueco)) errores.push(pre + "hueco inválido");
        else if (!reto.hueco.img && reto.hueco.forma !== "circulo") errores.push(pre + "hueco sin imagen ni forma");

        const ops = reto.opciones || [];
        const vistos = {};
        ops.forEach(function (id) {
            if (vistos[id]) errores.push(pre + "pieza repetida " + id);
            vistos[id] = true;
            const p = piezas[id];
            if (!p) errores.push(pre + "pieza inexistente " + id);
            else if (!p.img || !(p.w > 0) || !(p.h > 0)) errores.push(pre + "pieza sin imagen o medidas " + id);
        });
        if (ops.indexOf(reto.correcta) < 0) errores.push(pre + "la correcta no está entre las opciones");
        const esperadas = nivel.tema === "taller" ? 3 : 5;
        if (ops.length !== esperadas) errores.push(pre + "debe tener " + esperadas + " piezas y tiene " + ops.length);

        const correcta = piezas[reto.correcta];
        if (correcta && esRect(reto.hueco) && !encajaExacto(reto.hueco, correcta)) {
            errores.push(pre + "la pieza correcta no mide lo mismo que el hueco");
        }

        ops.forEach(function (id) {
            if (id === reto.correcta) return;
            const e = reto.errores && reto.errores[id];
            if (!e || !textoLinea(e)) errores.push(pre + "falta texto de error para " + id);
            else if (REACCIONES.indexOf(e.reaccion) < 0) errores.push(pre + "reacción inválida para " + id);
            if (e && e.tipo === "tamano" && piezas[id] && encajaExacto(reto.hueco, piezas[id])) {
                errores.push(pre + id + " es de otro tamaño pero mide igual que el hueco");
            }
        });

        if (!textoLinea(reto.presentacion)) errores.push(pre + "falta la presentación");
        const ac = reto.acierto || {};
        if (CELEBRACIONES.indexOf(ac.celebracion) < 0) errores.push(pre + "celebración inválida");
        if (reto.mecanica !== "lodo" && !textoLinea(ac)) errores.push(pre + "falta el texto de acierto");

        if (reto.mecanica === "lodo") {
            if (!textoLinea(reto.descubierta)) errores.push(pre + "falta la línea de la rueda descubierta");
            if (!textoLinea(reto.inflar) || !(reto.inflar.bombazos > 0)) errores.push(pre + "falta la fase de inflar");
            if (!reto.lodo || !(reto.lodo.limpiezaMinima > 0 && reto.lodo.limpiezaMinima < 1)) errores.push(pre + "lodo sin limpieza mínima");
        }
        if (reto.mecanica === "simetria" && (!reto.fantasma || typeof reto.ejeX !== "number")) errores.push(pre + "simetría sin eje o fantasma");
        if (reto.mecanica === "calibrador" && (!reto.rampa || !esRect(reto.nivel))) errores.push(pre + "calibrador sin rampa o nivel");
        if (reto.mecanica === "clima") {
            if (!esRect(reto.paredes)) errores.push(pre + "clima sin paredes");
            if (!textoLinea(reto.instruccionGrua) || !textoLinea(reto.instruccionClima)) errores.push(pre + "faltan instrucciones de grúa o clima");
        }
        if (nivel.tema === "ingenieria" && ["alto", "ancho", "diametro"].indexOf(reto.medida) < 0) errores.push(pre + "falta la medida para la regla");
    }

    function validarConfig(cfg) {
        const errores = [];
        if (!cfg || !Array.isArray(cfg.niveles) || !cfg.niveles.length) return ["sin niveles"];
        const figurasRetos = {};
        cfg.niveles.forEach(function (nivel) {
            if (TEMAS.indexOf(nivel.tema) < 0) errores.push("nivel " + nivel.id + ": tema inválido");
            if (!Array.isArray(nivel.retos) || nivel.retos.length !== 3) errores.push("nivel " + nivel.id + ": debe tener 3 retos");
            (nivel.retos || []).forEach(function (r, i) {
                figurasRetos[r.figura] = true;
                validarReto(cfg, nivel, r, i, errores);
            });
            if (!nivel.final || !nivel.final.tipo) errores.push("nivel " + nivel.id + ": falta el gran final");
            if (!nivel.premio || !nivel.premio.nombre) errores.push("nivel " + nivel.id + ": falta el premio");
            if (!nivel.cierre) errores.push("nivel " + nivel.id + ": falta el texto de cierre");
            if (nivel.tema === "ingenieria" && !(nivel.reglas && nivel.reglas.reglaTrasErrores > 0)) errores.push("nivel " + nivel.id + ": falta la regla de pista");
        });
        const demo = cfg.demo;
        if (demo) {
            if (figurasRetos[demo.figura]) errores.push("la demostración usa una figura de los retos y regalaría la respuesta");
            if (!esRect(demo.hueco) || !cfg.piezas[demo.correcta] || !encajaExacto(demo.hueco, cfg.piezas[demo.correcta])) {
                errores.push("la demostración no encaja");
            }
        }
        return errores;
    }

    const api = {
        ESCENA: ESCENA,
        UNIDADES_POR_CM: UNIDADES_POR_CM,
        encajaExacto: encajaExacto,
        rectColocacion: rectColocacion,
        medidaCm: medidaCm,
        debeMostrarRegla: debeMostrarRegla,
        inclinacionRueda: inclinacionRueda,
        yTecho: yTecho,
        destinoGota: destinoGota,
        fraccionLimpia: fraccionLimpia,
        cercaDe: cercaDe,
        clasificarGesto: clasificarGesto,
        barajar: barajar,
        validarConfig: validarConfig
    };
    global.CompletaFiguraLogica = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
