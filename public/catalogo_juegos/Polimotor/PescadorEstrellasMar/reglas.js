/**
 * ReglasPescador — decisión de "El Pescador de Estrellas de Mar" (window.ReglasPescador; también se exporta a Node).
 *
 * Sin DOM ni Phaser. Prepara cada nivel (estrellas quietas en el lecho marino, separadas y siempre dentro del
 * recorrido del gancho), mueve el gancho con una trayectoria predecible (vaivén senoidal: cambia de dirección
 * despacio en los extremos), dice qué estrella atrapa un toque según la distancia horizontal entre el gancho y la
 * estrella (tolerancia generosa por nivel) y lleva el marcador. Fallar no resta nada.
 */
(function (global) {
    "use strict";

    var W = 1600, H = 900;
    // Lo que se ve siempre, también en una pantalla 4:3 (ENVELOP recorta los lados). Durante la partida Zoe y Zeus no
    // están en pantalla: las estrellas usan casi todo el ancho, sin llegar a los botones de accesibilidad y volumen.
    var VISIBLE = { x0: 230, x1: 1370 };
    var ZONA_ESTRELLAS = { x0: 360, x1: 1220 };
    var COLORES = ["rosa", "naranja", "turquesa", "morado", "amarillo"];
    var GUIAS = ["persistente", "intermitente", "breve", "contextual"];

    /** Generador reproducible (pruebas). */
    function azar(semilla) {
        var s = (Number(semilla) || 1) % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () {
            s = s * 16807 % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

    function barajar(lista, rnd) {
        var l = lista.slice();
        for (var i = l.length - 1; i > 0; i--) {
            var j = Math.floor(rnd() * (i + 1));
            var t = l[i]; l[i] = l[j]; l[j] = t;
        }
        return l;
    }

    /** Colores de las estrellas: todos distintos mientras alcancen; nunca dos vecinas del mismo color. */
    function colores(n, rnd) {
        var out = [];
        var bolsa = [];
        while (out.length < n) {
            if (!bolsa.length) bolsa = barajar(COLORES, rnd);
            var c = bolsa.shift();
            if (out.length && out[out.length - 1] === c && bolsa.length) {
                bolsa.push(c);
                c = bolsa.shift();
            }
            out.push(c);
        }
        return out;
    }

    /**
     * Distancia mínima entre estrellas: las zonas de captura nunca se tocan (un toque = una sola estrella), ni siquiera
     * cuando dos estrellas que se mecen se acercan a la vez.
     */
    function separacionMinima(nivel) {
        return Math.max(2 * nivel.tolerancia + 12, 2 * nivel.radio + 8) + 2 * (nivel.deriva || 0);
    }

    /** x de una estrella en el instante t (ms). Desde el nivel 3 se mece un poquito de lado a lado; sin t, su centro. */
    function posicionEstrella(e, t) {
        if (!e.deriva || t == null) return e.x;
        return e.x + e.deriva * Math.sin(t * Math.PI * 2 / e.derivaMs + e.derivaFase);
    }

    /**
     * Nivel listo para la escena. Las estrellas caen en coordenadas al azar a lo ancho del recorrido del gancho: el
     * espacio que sobra después de la separación mínima se reparte al azar entre los bordes y los huecos.
     */
    function prepararNivel(ronda, juego, rnd) {
        var r = ronda || {}, j = juego || {};
        rnd = rnd || Math.random;
        var n = Math.max(1, Math.min(8, num(r.estrellas, 3) | 0));
        var centro = num(j.centroX, 800);
        var amp = Math.max(60, num(r.amplitud, 240));
        var minX = Math.max(ZONA_ESTRELLAS.x0 + 20, centro - amp);
        var maxX = Math.min(ZONA_ESTRELLAS.x1 - 20, centro + amp);
        amp = Math.min(centro - minX, maxX - centro);
        minX = centro - amp;
        maxX = centro + amp;
        var radio = Math.max(40, num(r.radioEstrella, 62));
        var nivel = {
            id: num(r.id, 1),
            n: n,
            tema: r.tema || "laguna",
            centroX: centro,
            amplitud: amp,
            minX: minX,
            maxX: maxX,
            periodoMs: Math.max(4000, num(r.periodoMs, 9000)),
            radio: radio,
            tolerancia: Math.round(radio * Math.max(0.6, num(r.tolerancia, 1))),
            radioGuia: Math.round(radio * Math.max(1, num(r.radioGuia, 1.5))),
            correccion: Math.max(0, Math.min(1, num(r.correccion, 1))),
            bajadaMs: Math.max(600, num(r.bajadaMs, 1500)),
            subidaMs: Math.max(600, num(r.subidaMs, 1500)),
            guia: GUIAS.indexOf(r.guia) >= 0 ? r.guia : "persistente",
            ganchoY: num(j.ganchoY, 300),
            sueloY: num(j.sueloY, 768),
            faseInicial: rnd() * Math.PI * 2,
            deriva: Math.max(0, num(r.deriva, 0)),
            derivaMs: Math.max(2000, num(r.derivaMs, 5000)),
            estrellas: []
        };
        // la estrella, aun meciéndose, nunca sale del recorrido del gancho
        var pad = nivel.deriva + 3;
        var a = minX + pad, b = maxX - pad;
        var sep = separacionMinima(nivel);
        var sobra = Math.max(0, (b - a) - (n - 1) * sep);
        // reparto al azar del espacio sobrante: borde izquierdo, cada hueco y borde derecho
        var pesos = [];
        var suma = 0;
        for (var w = 0; w <= n; w++) { var pw = rnd() + 0.05; pesos.push(pw); suma += pw; }
        var cols = colores(n, rnd);
        var alturas = barajar([-16, 10, -4, 16, -10, 4, -14, 12], rnd);
        var x = a;
        for (var i = 0; i < n; i++) {
            x += (i ? sep : 0) + sobra * pesos[i] / suma;
            nivel.estrellas.push({
                id: "e" + (i + 1),
                x: Math.round(Math.max(a, Math.min(b, x)) * 10) / 10,
                y: Math.round(nivel.sueloY + alturas[i % alturas.length]),
                color: cols[i],
                r: radio,
                giro: Math.round((rnd() * 2 - 1) * 18),
                deriva: nivel.deriva,
                derivaMs: nivel.derivaMs * (0.85 + rnd() * 0.3),
                derivaFase: rnd() * Math.PI * 2
            });
        }
        return nivel;
    }

    /** Avisos si un nivel no se puede jugar bien (estrella fuera del recorrido, encimadas o fuera de la vista). */
    function validarNivel(nivel) {
        var m = [];
        if (!nivel || !nivel.estrellas || !nivel.estrellas.length) return ["sin estrellas"];
        var sep = separacionMinima(nivel);
        nivel.estrellas.forEach(function (e, i) {
            var d = e.deriva || 0;
            if (e.x - d < nivel.minX - 0.5 || e.x + d > nivel.maxX + 0.5) m.push(e.id + " fuera del recorrido del gancho");
            if (e.x - e.r < VISIBLE.x0 || e.x + e.r > VISIBLE.x1) m.push(e.id + " fuera de la vista");
            if (e.x < ZONA_ESTRELLAS.x0 || e.x > ZONA_ESTRELLAS.x1) m.push(e.id + " fuera de la zona de estrellas");
            for (var k = i + 1; k < nivel.estrellas.length; k++) {
                var o = nivel.estrellas[k];
                if (Math.abs(o.x - e.x) < sep - 0.5) m.push(e.id + " y " + o.id + " demasiado cerca");
            }
        });
        if (nivel.minX < VISIBLE.x0 || nivel.maxX > VISIBLE.x1) m.push("el gancho sale de la vista");
        return m;
    }

    /** Posición del gancho para una fase (vaivén suave: despacio en los extremos, nunca sale de minX…maxX). */
    function posicionGancho(nivel, fase) {
        return nivel.centroX + nivel.amplitud * Math.sin(fase);
    }

    function avanzarFase(nivel, fase, dt) {
        return (fase + dt * Math.PI * 2 / nivel.periodoMs) % (Math.PI * 4);
    }

    /** Velocidad horizontal del gancho (px/s) en una fase: sirve para inclinar el gancho y para las pruebas. */
    function velocidadGancho(nivel, fase) {
        return nivel.amplitud * Math.cos(fase) * Math.PI * 2 / nivel.periodoMs * 1000;
    }

    function disponibles(nivel, capturadas) {
        var c = capturadas || {};
        return nivel.estrellas.filter(function (e) { return !c[e.id]; });
    }

    function masCercana(x, nivel, capturadas, t) {
        var mejor = null, dmin = Infinity, mx = 0;
        disponibles(nivel, capturadas).forEach(function (e) {
            var ex = posicionEstrella(e, t);
            var d = Math.abs(ex - x);
            if (d < dmin) { dmin = d; mejor = e; mx = ex; }
        });
        return { estrella: mejor, dx: mejor ? mx - x : Infinity };
    }

    /**
     * El niño tocó con el gancho en x: devuelve la estrella que atrapa (la más cercana, si está dentro de la
     * tolerancia del nivel) o null. Una estrella ya pescada no se vuelve a atrapar.
     */
    function evaluarCaptura(x, nivel, capturadas, extra, t) {
        var c = masCercana(x, nivel, capturadas, t);
        var tol = nivel.tolerancia + (Number(extra) || 0);
        if (c.estrella && Math.abs(c.dx) <= tol) return { tipo: "captura", estrella: c.estrella, dx: c.dx };
        return { tipo: "fallo", estrella: null, dx: c.dx, cercana: c.estrella };
    }

    /** Estrella cerca del gancho para la guía punteada (radio un poco mayor que la tolerancia). */
    function cercana(x, nivel, capturadas, k, t) {
        var c = masCercana(x, nivel, capturadas, t);
        var lim = nivel.radioGuia * (k || 1);
        return c.estrella && Math.abs(c.dx) <= lim ? c.estrella : null;
    }

    /** Corrección amable: cuánto se acerca el gancho a la estrella mientras baja (sutil, nunca un salto). */
    function correccion(dx, nivel) {
        var tope = nivel.tolerancia * 0.6 * nivel.correccion;
        return Math.max(-tope, Math.min(tope, dx)) * nivel.correccion;
    }

    function crearMarcador(nivel) {
        return { total: nivel.estrellas.length, hechas: 0, capturadas: {}, intentos: 0, fallos: 0, fallosSeguidos: 0, completo: false };
    }

    function registrar(mk, tipo, estrella) {
        mk.intentos++;
        if (tipo === "captura" && estrella && !mk.capturadas[estrella.id]) {
            mk.capturadas[estrella.id] = true;
            mk.hechas = Math.min(mk.total, mk.hechas + 1);
            mk.fallosSeguidos = 0;
            mk.completo = mk.hechas >= mk.total;
        } else {
            mk.fallos++;
            mk.fallosSeguidos++;
        }
        return mk;
    }

    var api = {
        W: W,
        H: H,
        VISIBLE: VISIBLE,
        ZONA_ESTRELLAS: ZONA_ESTRELLAS,
        COLORES: COLORES,
        azar: azar,
        prepararNivel: prepararNivel,
        validarNivel: validarNivel,
        separacionMinima: separacionMinima,
        posicionEstrella: posicionEstrella,
        posicionGancho: posicionGancho,
        avanzarFase: avanzarFase,
        velocidadGancho: velocidadGancho,
        evaluarCaptura: evaluarCaptura,
        cercana: cercana,
        correccion: correccion,
        crearMarcador: crearMarcador,
        registrar: registrar
    };
    global.ReglasPescador = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : global);
