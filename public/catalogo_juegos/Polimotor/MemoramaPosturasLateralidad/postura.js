/**
 * Postura — reglas puras del Espejo de las Posiciones (sin DOM).
 *
 * Ángulos anatómicos de cada extremidad: { a, b }
 *   a = abducción en el hombro / la cadera: 0 = pegado al cuerpo hacia abajo,
 *       90 = horizontal hacia afuera, 180 = hacia arriba (negativo = cruza hacia el centro).
 *   b = flexión del codo / la rodilla, relativa al segmento de arriba:
 *       positivo = sigue girando hacia afuera/arriba, negativo = se dobla hacia el centro.
 *
 * El personaje mira al niño: su lado IZQUIERDO se ve a la DERECHA de la pantalla.
 * Por eso el giro en pantalla de una extremidad es  lado * ángulo  (der = +1, izq = -1),
 * y el mismo número anatómico se ve como un espejo en cada lado.
 */
(function (global) {
    "use strict";

    // Coordenadas del cuerpo (viewBox 0 0 320 400 de modelo y construcción).
    var ESQUELETO = {
        vista: { w: 320, h: 400 },
        sockets: {
            cuello: { x: 160, y: 118 },
            pecho: { x: 160, y: 182 },
            hombro_der: { x: 118, y: 136 },
            hombro_izq: { x: 202, y: 136 },
            cadera_der: { x: 142, y: 246 },
            cadera_izq: { x: 178, y: 246 }
        },
        brazo: { l1: 50, l2: 48 },
        pierna: { l1: 56, l2: 50 }
    };

    var PIEZAS = {
        cabeza: { id: "cabeza", tipo: "cabeza", socket: "cuello", nombre: "la cabeza", corto: "Cabeza", articulacion: "el cuello" },
        tronco: { id: "tronco", tipo: "tronco", socket: "pecho", nombre: "el tronco", corto: "Tronco", articulacion: "el centro del cuerpo" },
        brazo_izq: { id: "brazo_izq", tipo: "brazo", lado: "izq", socket: "hombro_izq", par: "brazo_der", nombre: "el brazo izquierdo", corto: "Brazo izquierdo", articulacion: "el hombro izquierdo", distal: "codo" },
        brazo_der: { id: "brazo_der", tipo: "brazo", lado: "der", socket: "hombro_der", par: "brazo_izq", nombre: "el brazo derecho", corto: "Brazo derecho", articulacion: "el hombro derecho", distal: "codo" },
        pierna_izq: { id: "pierna_izq", tipo: "pierna", lado: "izq", socket: "cadera_izq", par: "pierna_der", nombre: "la pierna izquierda", corto: "Pierna izquierda", articulacion: "la cadera izquierda", distal: "rodilla" },
        pierna_der: { id: "pierna_der", tipo: "pierna", lado: "der", socket: "cadera_der", par: "pierna_izq", nombre: "la pierna derecha", corto: "Pierna derecha", articulacion: "la cadera derecha", distal: "rodilla" }
    };

    var IDS = ["cabeza", "tronco", "brazo_izq", "brazo_der", "pierna_izq", "pierna_der"];
    var EXTREMIDADES = ["brazo_izq", "brazo_der", "pierna_izq", "pierna_der"];
    var ORDEN_DEFECTO = [["cabeza", "tronco"], ["brazo_izq"], ["pierna_der"], ["brazo_der", "pierna_izq"]];

    function signo(id) {
        var p = PIEZAS[id];
        if (!p || !p.lado) return 0;
        return p.lado === "der" ? 1 : -1;
    }

    function esExtremidad(id) {
        return EXTREMIDADES.indexOf(id) !== -1;
    }

    /** Ángulo en (-180, 180]. */
    function normalizar(g) {
        var n = ((Number(g) || 0) % 360 + 360) % 360;
        return n > 180 ? n - 360 : n;
    }

    function diferencia(a, b) {
        return Math.abs(normalizar(a - b));
    }

    function copiar(ang) {
        return { a: Number(ang && ang.a) || 0, b: Number(ang && ang.b) || 0 };
    }

    /** Rotaciones SVG (grados, horario positivo) del segmento de arriba y del de abajo. */
    function aPantalla(id, ang) {
        var s = signo(id);
        return { p: s * (ang ? ang.a : 0), d: s * (ang ? ang.b : 0) };
    }

    /** Aplica un giro visto en pantalla (horario +) a la articulación 'p' (proximal) o 'd' (distal). */
    function girar(id, ang, junta, gradosPantalla) {
        var s = signo(id) || 1;
        var r = copiar(ang);
        if (junta === "d") r.b = normalizar(r.b + s * gradosPantalla);
        else r.a = normalizar(r.a + s * gradosPantalla);
        return r;
    }

    function largos(id) {
        var p = PIEZAS[id];
        return p && p.tipo === "pierna" ? ESQUELETO.pierna : ESQUELETO.brazo;
    }

    /** Dirección en pantalla de un giro SVG θ aplicado a un segmento que apunta hacia abajo. */
    function direccion(theta) {
        var r = theta * Math.PI / 180;
        return { x: -Math.sin(r), y: Math.cos(r) };
    }

    /** Puntos del codo/rodilla y de la mano/pie, relativos al pivote (unidades del cuerpo). */
    function cinematica(id, ang) {
        var l = largos(id);
        var rot = aPantalla(id, ang);
        var d1 = direccion(rot.p);
        var d2 = direccion(rot.p + rot.d);
        var medio = { x: d1.x * l.l1, y: d1.y * l.l1 };
        return {
            medio: medio,
            punta: { x: medio.x + d2.x * l.l2, y: medio.y + d2.y * l.l2 }
        };
    }

    function tolerancias(cfg) {
        cfg = cfg || {};
        return {
            a: Number(cfg.toleranciaGrados) > 0 ? Number(cfg.toleranciaGrados) : 22,
            b: Number(cfg.toleranciaFlexion) > 0 ? Number(cfg.toleranciaFlexion) : 32
        };
    }

    /**
     * ¿La extremidad está orientada como el modelo?
     * La cabeza y el tronco no giran: siempre están orientados.
     */
    function orientacion(id, actual, objetivo, cfg) {
        if (!esExtremidad(id)) return { proximal: true, distal: true, ok: true };
        var t = tolerancias(cfg);
        var o = copiar(objetivo);
        var a = copiar(actual);
        var prox = diferencia(a.a, o.a) <= t.a;
        var dist = diferencia(a.b, o.b) <= t.b;
        return { proximal: prox, distal: dist, ok: prox && dist };
    }

    /**
     * Resultado de soltar una pieza cerca de un socket.
     *  'encaje'      pieza correcta, articulación correcta y bien orientada
     *  'orientacion' articulación correcta pero girada distinto al modelo
     *  'lado'        la articulación del otro lado (izquierda ↔ derecha)
     *  'lugar'       otra articulación
     *  'nada'        lejos de cualquier articulación
     */
    function evaluarSoltado(id, socketId, actual, objetivo, cfg) {
        var p = PIEZAS[id];
        if (!p || !socketId) return "nada";
        if (socketId === p.socket) {
            return orientacion(id, actual, objetivo, cfg).ok ? "encaje" : "orientacion";
        }
        if (p.par && PIEZAS[p.par] && PIEZAS[p.par].socket === socketId) return "lado";
        return "lugar";
    }

    /** Socket más cercano a un punto (unidades del cuerpo) dentro de un radio. */
    function socketCercano(punto, radio, permitidos) {
        var mejor = null;
        var mejorD = Infinity;
        Object.keys(ESQUELETO.sockets).forEach(function (k) {
            if (permitidos && permitidos.indexOf(k) === -1) return;
            var s = ESQUELETO.sockets[k];
            var d = Math.hypot(s.x - punto.x, s.y - punto.y);
            if (d <= radio && d < mejorD) {
                mejorD = d;
                mejor = k;
            }
        });
        return mejor;
    }

    /** Sockets que pueden recibir piezas (la cabeza y el tronco no compiten con hombros). */
    function socketsDe(tipo) {
        if (tipo === "brazo" || tipo === "pierna") return ["hombro_der", "hombro_izq", "cadera_der", "cadera_izq"];
        return ["cuello", "pecho"];
    }

    function normalizarPostura(p) {
        var partes = {};
        EXTREMIDADES.forEach(function (id) {
            partes[id] = copiar(p && p.partes && p.partes[id]);
            partes[id].a = normalizar(partes[id].a);
            partes[id].b = normalizar(partes[id].b);
        });
        return {
            id: (p && p.id) || "postura",
            nombre: (p && p.nombre) || "",
            orden: pasos(p && p.orden),
            inicio: p && p.inicio ? p.inicio : null,
            partes: partes
        };
    }

    /** Pasos válidos: grupos de ids conocidos, sin repetir, y con todas las piezas. */
    function pasos(orden, defecto) {
        var base = Array.isArray(orden) && orden.length ? orden : (defecto || ORDEN_DEFECTO);
        var vistos = {};
        var r = [];
        base.forEach(function (grupo) {
            var g = (Array.isArray(grupo) ? grupo : [grupo]).filter(function (id) {
                if (!PIEZAS[id] || vistos[id]) return false;
                vistos[id] = true;
                return true;
            });
            if (g.length) r.push(g);
        });
        var faltan = IDS.filter(function (id) { return !vistos[id]; });
        if (faltan.length) r.push(faltan);
        return r;
    }

    function claveDePaso(grupo) {
        return (grupo || []).join("_").replace(/^cabeza_tronco$|^tronco_cabeza$/, "cabeza_tronco");
    }

    function interpolar(a, b, t) {
        var x = copiar(a);
        var y = copiar(b);
        return {
            a: x.a + normalizar(y.a - x.a) * t,
            b: x.b + normalizar(y.b - x.b) * t
        };
    }

    /** Pose neutra (de pie, brazos un poco abiertos) para animar desde/hacia ella. */
    function neutra() {
        return {
            brazo_izq: { a: 15, b: 0 },
            brazo_der: { a: 15, b: 0 },
            pierna_izq: { a: 4, b: 0 },
            pierna_der: { a: 4, b: 0 }
        };
    }

    /**
     * Texto con marcadores: {pieza} "el brazo izquierdo", {Pieza} "El brazo izquierdo",
     * {parte} "brazo izquierdo" (sin artículo) y {articulacion} "el hombro izquierdo".
     * Pone mayúscula inicial si el texto empieza por un marcador.
     */
    function texto(plantilla, id) {
        var p = PIEZAS[id] || {};
        var t = String(plantilla || "");
        var nombre = p.nombre || "";
        var mayus = nombre.charAt(0).toUpperCase() + nombre.slice(1);
        t = t.replace(/\{Pieza\}/g, mayus)
            .replace(/\{pieza\}/g, nombre)
            .replace(/\{parte\}/g, String(p.corto || "").toLowerCase())
            .replace(/\{articulacion\}/g, p.articulacion || "");
        t = t.replace(/^(¡|¿)?([a-záéíóúñ])/, function (m, sig, letra) { return (sig || "") + letra.toUpperCase(); });
        return t;
    }

    var Postura = {
        ESQUELETO: ESQUELETO,
        PIEZAS: PIEZAS,
        IDS: IDS,
        EXTREMIDADES: EXTREMIDADES,
        ORDEN_DEFECTO: ORDEN_DEFECTO,
        signo: signo,
        esExtremidad: esExtremidad,
        normalizar: normalizar,
        diferencia: diferencia,
        copiar: copiar,
        aPantalla: aPantalla,
        girar: girar,
        cinematica: cinematica,
        orientacion: orientacion,
        evaluarSoltado: evaluarSoltado,
        socketCercano: socketCercano,
        socketsDe: socketsDe,
        normalizarPostura: normalizarPostura,
        pasos: pasos,
        claveDePaso: claveDePaso,
        interpolar: interpolar,
        neutra: neutra,
        texto: texto
    };

    global.Postura = Postura;
    if (typeof module !== "undefined" && module.exports) module.exports = Postura;
})(typeof window !== "undefined" ? window : this);
