/**
 * Posturas — reglas puras del Puzle de Siluetas en Acción (sin DOM; también module.exports para node).
 *
 * Esqueleto de perfil (el personaje mira a la derecha, +x). Coordenadas de "figura": el centro de
 * la cadera del tronco es (0, 0) y la y crece hacia abajo, como en SVG. Ángulos en grados, sentido
 * del reloj (rotate() de SVG):
 *   tronco   0 = erguido, + = inclinado hacia adelante.
 *   cabeza   igual que el tronco (por defecto sigue al tronco).
 *   brazo    0 = colgando, -90 = al frente, 180 = arriba, +90 = atrás.
 *   pierna   0 = vertical, -90 = muslo al frente, +90 = muslo atrás.
 *   tenis    0 = suela plana con la punta al frente; por defecto sigue a la canilla.
 *
 * Cada pieza tiene un pivote (la articulación donde se une) y un centro visual. La postura se
 * escribe en config.json solo con ángulos y formas; aquí se calcula, por cinemática directa,
 * dónde queda cada pivote. Así cualquier postura nueva queda anatómicamente unida.
 *
 * Lateralidad: de perfil mirando a la derecha se ve el lado derecho del cuerpo (adelante) y el
 * izquierdo queda atrás. Los tenis llevan color por lado (izquierdo amarillo, derecho verde,
 * los mismos de Lateralidad).
 */
(function (global) {
    "use strict";

    var ESQUELETO = {
        tronco: {
            cuello: { x: 0, y: -92 },
            hombro: { x: 4, y: -78 },
            cadera: { x: 0, y: -8 }
        },
        tobillo: {
            recta: { x: 0, y: 124 },
            doblada: { x: -64, y: 64 }
        }
    };

    /** Centro visual de cada forma (coordenadas locales de la pieza, pivote en 0,0). */
    var CENTROS = {
        "cabeza": { x: 6, y: -44 },
        "tronco": { x: 2, y: -46 },
        "brazo:extendido": { x: 0, y: 54 },
        "brazo:flexionado": { x: 18, y: 38 },
        "pierna:recta": { x: 0, y: 64 },
        "pierna:doblada": { x: -22, y: 46 },
        "tenis": { x: 14, y: 4 }
    };

    /** Radio aproximado alrededor del centro (para acomodar piezas en la bandeja y encuadrar). */
    var RADIOS = {
        "cabeza": 62,
        "tronco": 56,
        "brazo:extendido": 66,
        "brazo:flexionado": 54,
        "pierna:recta": 78,
        "pierna:doblada": 64,
        "tenis": 36
    };

    /** Orden de dibujo: lo de atrás primero (lado izquierdo), lo de adelante al final. La cabeza va
     *  encima de todo: así un brazo levantado pasa por detrás de la cara y no la tapa. */
    var CAPAS = ["brazo_izq", "pierna_izq", "tenis_izq", "tronco", "pierna_der", "tenis_der", "brazo_der", "brazos", "cabeza"];

    /** Orden sugerido por defecto: cabeza, tronco, brazos, piernas, pies. */
    var ORDEN_BASE = [["cabeza"], ["tronco"], ["brazos", "brazo_der", "brazo_izq"], ["pierna_der", "pierna_izq"], ["tenis_der", "tenis_izq"]];

    var NOMBRES = {
        "cabeza": "la cabeza",
        "tronco": "el tronco",
        "brazo:extendido": "el brazo estirado",
        "brazo:flexionado": "el brazo doblado",
        "brazos:extendido": "los brazos estirados",
        "brazos:flexionado": "los brazos doblados",
        "pierna:recta": "la pierna estirada",
        "pierna:doblada": "la pierna doblada",
        "tenis:izq": "el tenis amarillo del pie izquierdo",
        "tenis:der": "el tenis verde del pie derecho"
    };

    var CORTOS = {
        "cabeza": "Cabeza",
        "tronco": "Tronco",
        "brazo:extendido": "Brazo estirado",
        "brazo:flexionado": "Brazo doblado",
        "brazos:extendido": "Brazos estirados",
        "brazos:flexionado": "Brazos doblados",
        "pierna:recta": "Pierna estirada",
        "pierna:doblada": "Pierna doblada",
        "tenis:izq": "Tenis izquierdo",
        "tenis:der": "Tenis derecho"
    };

    // ------------------------------------------------------------------ geometría

    function rad(g) {
        return g * Math.PI / 180;
    }

    /** Gira el punto p (local) el ángulo a (grados, sentido del reloj en pantalla). */
    function rotar(p, a) {
        var c = Math.cos(rad(a));
        var s = Math.sin(rad(a));
        return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
    }

    function sumar(a, b) {
        return { x: a.x + b.x, y: a.y + b.y };
    }

    function escalar(p, k) {
        return { x: p.x * k, y: p.y * k };
    }

    function distancia(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    /** Ángulo en (-180, 180]. */
    function normalizar(a) {
        var n = ((Number(a) || 0) % 360 + 360) % 360;
        return n > 180 ? n - 360 : n;
    }

    function difAngulo(a, b) {
        return Math.abs(normalizar(a - b));
    }

    // ------------------------------------------------------------------ identidad de piezas

    function claveForma(tipo, forma) {
        if (tipo === "cabeza" || tipo === "tronco" || tipo === "tenis") return tipo;
        return tipo + ":" + forma;
    }

    /** Lo que hace que dos piezas sean intercambiables: tipo, forma, si es doble y el lado del tenis. */
    function identidad(p) {
        var k = claveForma(p.tipo, p.forma);
        if (p.doble) k += ":doble";
        if (p.tipo === "tenis") k += ":" + p.lado;
        return k;
    }

    function centroLocal(p) {
        var c = CENTROS[claveForma(p.tipo, p.forma)] || { x: 0, y: 0 };
        if (p.doble) return { x: c.x - 3, y: c.y + 1 };
        return c;
    }

    function radio(p) {
        return (RADIOS[claveForma(p.tipo, p.forma)] || 50) + (p.doble ? 6 : 0);
    }

    function nombre(p) {
        if (p.tipo === "tenis") return NOMBRES["tenis:" + p.lado];
        if (p.doble) return NOMBRES["brazos:" + p.forma];
        return NOMBRES[claveForma(p.tipo, p.forma)] || p.id;
    }

    function corto(p) {
        if (p.tipo === "tenis") return CORTOS["tenis:" + p.lado];
        if (p.doble) return CORTOS["brazos:" + p.forma];
        return CORTOS[claveForma(p.tipo, p.forma)] || p.id;
    }

    // ------------------------------------------------------------------ cinemática

    /**
     * Calcula pivote y ángulo de cada pieza a partir de los ángulos del cuerpo.
     * cuerpo = { x, y, tronco, cabeza, brazos: {id: {forma, angulo}}, piernas: {id: {forma, angulo, tenis}} }
     * Devuelve { id: { x, y, angulo } }.
     */
    function cinematica(cuerpo) {
        var base = { x: cuerpo.x || 0, y: cuerpo.y || 0 };
        var t = Number(cuerpo.tronco) || 0;
        var res = {};
        res.tronco = { x: base.x, y: base.y, angulo: t };
        var cuello = sumar(base, rotar(ESQUELETO.tronco.cuello, t));
        var hombro = sumar(base, rotar(ESQUELETO.tronco.hombro, t));
        var cadera = sumar(base, rotar(ESQUELETO.tronco.cadera, t));
        res.cabeza = { x: cuello.x, y: cuello.y, angulo: cuerpo.cabeza != null ? Number(cuerpo.cabeza) : t };
        Object.keys(cuerpo.brazos || {}).forEach(function (id) {
            res[id] = { x: hombro.x, y: hombro.y, angulo: Number(cuerpo.brazos[id].angulo) || 0 };
        });
        Object.keys(cuerpo.piernas || {}).forEach(function (id) {
            var pz = cuerpo.piernas[id];
            var l = Number(pz.angulo) || 0;
            res[id] = { x: cadera.x, y: cadera.y, angulo: l };
            var tob = sumar(cadera, rotar(ESQUELETO.tobillo[pz.forma] || ESQUELETO.tobillo.recta, l));
            var tenisId = "tenis_" + pz.lado;
            var canilla = l + (pz.forma === "doblada" ? 90 : 0);
            res[tenisId] = { x: tob.x, y: tob.y, angulo: pz.tenis != null ? Number(pz.tenis) : canilla };
        });
        return res;
    }

    /** Ángulos de la postura en el formato que usa cinematica(). */
    function cuerpoDe(cruda) {
        var c = cruda.cuerpo || {};
        var cuerpo = { x: 0, y: 0, tronco: c.tronco || 0, cabeza: c.cabeza, brazos: {}, piernas: {} };
        (cruda.brazos || []).forEach(function (b) {
            var id = b.doble ? "brazos" : "brazo_" + b.lado;
            cuerpo.brazos[id] = { forma: b.forma, angulo: b.angulo };
        });
        (cruda.piernas || []).forEach(function (p) {
            cuerpo.piernas["pierna_" + p.lado] = { forma: p.forma, angulo: p.angulo, lado: p.lado, tenis: p.tenis };
        });
        return cuerpo;
    }

    function centroMundo(p, pose) {
        return sumar({ x: pose.x, y: pose.y }, rotar(centroLocal(p), pose.angulo));
    }

    /**
     * Postura de config.json → postura lista para jugar:
     * { id, personaje, nombre, nivel, piezas: [ {id, tipo, forma, lado, doble, angulo, pivote, centro, une} ],
     *   pasos: [[ids]], cuerpo, caja }
     */
    function normalizarPostura(cruda) {
        cruda = cruda || {};
        var cuerpo = cuerpoDe(cruda);
        var pose = cinematica(cuerpo);
        var piezas = [];
        function agregar(def) {
            var pz = pose[def.id];
            if (!pz) return;
            def.angulo = normalizar(pz.angulo);
            def.pivote = { x: pz.x, y: pz.y };
            def.centro = centroMundo(def, pz);
            def.clave = identidad(def);
            piezas.push(def);
        }
        agregar({ id: "cabeza", tipo: "cabeza", forma: "cabeza", lado: null, une: null });
        agregar({ id: "tronco", tipo: "tronco", forma: "tronco", lado: null, une: null });
        (cruda.brazos || []).forEach(function (b) {
            agregar({ id: b.doble ? "brazos" : "brazo_" + b.lado, tipo: "brazo", forma: b.forma || "extendido", lado: b.doble ? "ambos" : b.lado, doble: !!b.doble, une: "tronco" });
        });
        (cruda.piernas || []).forEach(function (p) {
            agregar({ id: "pierna_" + p.lado, tipo: "pierna", forma: p.forma || "recta", lado: p.lado, une: "tronco" });
        });
        (cruda.piernas || []).forEach(function (p) {
            agregar({ id: "tenis_" + p.lado, tipo: "tenis", forma: "tenis", lado: p.lado, une: "pierna_" + p.lado });
        });
        piezas.sort(function (a, b) { return CAPAS.indexOf(a.id) - CAPAS.indexOf(b.id); });
        var postura = {
            id: cruda.id || "postura",
            personaje: cruda.personaje === "zeus" ? "zeus" : "zoe",
            nombre: cruda.nombre || "",
            nivel: Number(cruda.nivel) || 1,
            audio: cruda.audio || "",
            pista: cruda.pista || "",
            animacion: cruda.animacion || "salto",
            cuerpo: cuerpo,
            piezas: piezas
        };
        postura.pasos = pasos(postura, cruda.orden);
        postura.caja = caja(piezas);
        return postura;
    }

    /** Pasos de colocación: el orden de la postura o el de base, sin pasos vacíos. */
    function pasos(postura, orden) {
        var ids = postura.piezas.map(function (p) { return p.id; });
        var fuente = Array.isArray(orden) && orden.length ? orden : ORDEN_BASE;
        var usados = {};
        var res = [];
        fuente.forEach(function (grupo) {
            var g = (Array.isArray(grupo) ? grupo : [grupo]).filter(function (id) {
                return ids.indexOf(id) !== -1 && !usados[id];
            });
            g.forEach(function (id) { usados[id] = true; });
            if (g.length) res.push(g);
        });
        var resto = ids.filter(function (id) { return !usados[id]; });
        if (resto.length) res.push(resto);
        return res;
    }

    /** Caja de la figura en coordenadas de figura (centros ± radio). */
    function caja(piezas) {
        var c = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
        piezas.forEach(function (p) {
            var r = radio(p) * 0.92;
            c.x0 = Math.min(c.x0, p.centro.x - r);
            c.y0 = Math.min(c.y0, p.centro.y - r);
            c.x1 = Math.max(c.x1, p.centro.x + r);
            c.y1 = Math.max(c.y1, p.centro.y + r);
        });
        c.w = c.x1 - c.x0;
        c.h = c.y1 - c.y0;
        return c;
    }

    function pieza(postura, id) {
        for (var i = 0; i < postura.piezas.length; i++) {
            if (postura.piezas[i].id === id) return postura.piezas[i];
        }
        return null;
    }

    // ------------------------------------------------------------------ validación

    function opcionesJuego(cfg) {
        cfg = cfg || {};
        return {
            tolerancia: Number(cfg.toleranciaGrados) > 0 ? Number(cfg.toleranciaGrados) : 20,
            radio: Number(cfg.radioEncaje) > 0 ? Number(cfg.radioEncaje) : 55,
            radioOrientada: Number(cfg.radioEncajeOrientada) > 0 ? Number(cfg.radioEncajeOrientada) : 85
        };
    }

    /** Hueco libre de la silueta al que esta pieza podría ir (misma identidad). */
    function compatibles(postura, piezaJugador, colocadas) {
        var clave = identidad(piezaJugador);
        return postura.piezas.filter(function (s) {
            return !colocadas[s.id] && s.clave === clave;
        });
    }

    /** ¿La pieza ya tiene la inclinación de algún hueco libre compatible? Devuelve ese hueco o null. */
    function orientada(postura, piezaJugador, angulo, colocadas, cfg) {
        var o = opcionesJuego(cfg);
        var lista = compatibles(postura, piezaJugador, colocadas);
        for (var i = 0; i < lista.length; i++) {
            if (difAngulo(angulo, lista[i].angulo) <= o.tolerancia) return lista[i];
        }
        return null;
    }

    /**
     * Evalúa dónde se soltó una pieza. centro = centro visual de la pieza en coordenadas de figura.
     * Resultados:
     *   encaje       identidad, lugar, inclinación y vecino correctos.
     *   orientacion  pieza correcta sobre su hueco pero girada distinto.
     *   vecino       pieza correcta, pero falta la pieza a la que se une (p. ej. el tenis antes de la pierna).
     *   forma        mismo tipo, otra forma (pierna estirada en el hueco de la doblada).
     *   lado         tenis del otro pie.
     *   lugar        otra parte del cuerpo.
     *   nada         lejos de cualquier hueco libre.
     * La cercanía sola nunca basta: una pieza equivocada cerca del hueco no encaja.
     */
    function evaluarSoltado(postura, piezaJugador, centro, angulo, colocadas, cfg) {
        var o = opcionesJuego(cfg);
        colocadas = colocadas || {};
        var lista = compatibles(postura, piezaJugador, colocadas)
            .map(function (s) { return { s: s, d: distancia(centro, s.centro) }; })
            .sort(function (a, b) { return a.d - b.d; });
        for (var i = 0; i < lista.length; i++) {
            var s = lista[i].s;
            var angOk = difAngulo(angulo, s.angulo) <= o.tolerancia;
            var r = angOk ? o.radioOrientada : o.radio * 1.25;
            if (lista[i].d > r) continue;
            if (s.une && !colocadas[s.une]) return { resultado: "vecino", hueco: s };
            if (!angOk) return { resultado: "orientacion", hueco: s };
            return { resultado: "encaje", hueco: s };
        }
        var clave = identidad(piezaJugador);
        var cerca = null;
        postura.piezas.forEach(function (s) {
            if (colocadas[s.id] || s.clave === clave) return;
            var d = distancia(centro, s.centro);
            if (d <= o.radio && (!cerca || d < cerca.d)) cerca = { s: s, d: d };
        });
        if (!cerca) return { resultado: "nada", hueco: null };
        var h = cerca.s;
        if (h.tipo === "tenis" && piezaJugador.tipo === "tenis") return { resultado: "lado", hueco: h };
        if (h.tipo === piezaJugador.tipo) return { resultado: "forma", hueco: h };
        return { resultado: "lugar", hueco: h };
    }

    /** Ángulo inicial desordenado: objetivo + desfase (múltiplo del paso de giro). */
    function anguloInicial(objetivo, desfase) {
        return normalizar(objetivo + desfase);
    }

    /** Reemplaza {pieza}, {Pieza}, {vecino}, {Vecino}… en una plantilla. */
    function texto(plantilla, vars) {
        if (!plantilla) return "";
        vars = vars || {};
        return String(plantilla).replace(/\{(\w+)\}/g, function (m, k) {
            var minus = k.charAt(0).toLowerCase() + k.slice(1);
            var v = vars[minus];
            if (v == null) return "";
            v = String(v);
            if (k.charAt(0) === k.charAt(0).toUpperCase() && k.charAt(0) !== k.charAt(0).toLowerCase()) {
                return v.charAt(0).toUpperCase() + v.slice(1);
            }
            return v;
        });
    }

    var Posturas = {
        ESQUELETO: ESQUELETO,
        CENTROS: CENTROS,
        CAPAS: CAPAS,
        ORDEN_BASE: ORDEN_BASE,
        rotar: rotar,
        sumar: sumar,
        escalar: escalar,
        distancia: distancia,
        normalizar: normalizar,
        difAngulo: difAngulo,
        identidad: identidad,
        centroLocal: centroLocal,
        radio: radio,
        nombre: nombre,
        corto: corto,
        cinematica: cinematica,
        cuerpoDe: cuerpoDe,
        normalizarPostura: normalizarPostura,
        pasos: pasos,
        caja: caja,
        pieza: pieza,
        compatibles: compatibles,
        orientada: orientada,
        evaluarSoltado: evaluarSoltado,
        anguloInicial: anguloInicial,
        texto: texto
    };

    global.Posturas = Posturas;
    if (typeof module !== "undefined" && module.exports) module.exports = Posturas;
})(typeof window !== "undefined" ? window : globalThis);
