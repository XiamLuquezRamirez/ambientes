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
    // Lo que se ve siempre, también en una pantalla 4:3 (ENVELOP recorta los lados), sin la zona de Zoe y Zeus.
    var VISIBLE = { x0: 230, x1: 1370 };
    var ZONA_ESTRELLAS = { x0: 440, x1: 1160 };
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

    /** Distancia mínima entre estrellas: las zonas de captura nunca se tocan (un toque = una sola estrella). */
    function separacionMinima(nivel) {
        return Math.max(2 * nivel.tolerancia + 20, 2 * nivel.radio + 12);
    }

    /**
     * Nivel listo para la escena. Las estrellas se reparten en huecos iguales a lo ancho del recorrido del gancho,
     * con un pequeño desplazamiento al azar que nunca rompe la separación mínima.
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
            estrellas: []
        };
        var pad = 8;
        var a = minX + pad, b = maxX - pad;
        var paso = n > 1 ? (b - a) / (n - 1) : 0;
        var sep = separacionMinima(nivel);
        var juego2 = n > 1 ? Math.max(0, (paso - sep) / 2 - 1) : Math.max(0, (b - a) / 2 - 10);
        var cols = colores(n, rnd);
        var alturas = barajar([-16, 10, -4, 16, -10, 4, -14, 12], rnd);
        for (var i = 0; i < n; i++) {
            var x = n > 1 ? a + paso * i : centro;
            x += (rnd() * 2 - 1) * Math.min(juego2, 40);
            x = Math.max(minX + 2, Math.min(maxX - 2, x));
            nivel.estrellas.push({
                id: "e" + (i + 1),
                x: Math.round(x),
                y: Math.round(nivel.sueloY + alturas[i % alturas.length]),
                color: cols[i],
                r: radio,
                giro: Math.round((rnd() * 2 - 1) * 18)
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
            if (e.x < nivel.minX - 0.5 || e.x > nivel.maxX + 0.5) m.push(e.id + " fuera del recorrido del gancho");
            if (e.x - e.r < VISIBLE.x0 || e.x + e.r > VISIBLE.x1) m.push(e.id + " fuera de la vista");
            if (e.x < ZONA_ESTRELLAS.x0 || e.x > ZONA_ESTRELLAS.x1) m.push(e.id + " detrás de Zoe o Zeus");
            for (var k = i + 1; k < nivel.estrellas.length; k++) {
                var o = nivel.estrellas[k];
                if (Math.abs(o.x - e.x) < sep) m.push(e.id + " y " + o.id + " demasiado cerca");
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

    function masCercana(x, nivel, capturadas) {
        var mejor = null, dmin = Infinity;
        disponibles(nivel, capturadas).forEach(function (e) {
            var d = Math.abs(e.x - x);
            if (d < dmin) { dmin = d; mejor = e; }
        });
        return { estrella: mejor, dx: mejor ? mejor.x - x : Infinity };
    }

    /**
     * El niño tocó con el gancho en x: devuelve la estrella que atrapa (la más cercana, si está dentro de la
     * tolerancia del nivel) o null. Una estrella ya pescada no se vuelve a atrapar.
     */
    function evaluarCaptura(x, nivel, capturadas, extra) {
        var c = masCercana(x, nivel, capturadas);
        var tol = nivel.tolerancia + (Number(extra) || 0);
        if (c.estrella && Math.abs(c.dx) <= tol) return { tipo: "captura", estrella: c.estrella, dx: c.dx };
        return { tipo: "fallo", estrella: null, dx: c.dx, cercana: c.estrella };
    }

    /** Estrella cerca del gancho para la guía punteada (radio un poco mayor que la tolerancia). */
    function cercana(x, nivel, capturadas, k) {
        var c = masCercana(x, nivel, capturadas);
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
