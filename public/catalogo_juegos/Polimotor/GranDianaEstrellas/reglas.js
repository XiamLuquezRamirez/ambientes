/**
 * ReglasDiana — decisión de "La Gran Diana de Estrellas" (window.ReglasDiana; también se exporta a Node).
 *
 * Sin DOM ni Phaser. Prepara cada nivel (la estrella SIEMPRE en el centro de la diana, del mismo tamaño en todo el
 * nivel; desde el nivel 2 la diana es más pequeña y se mece un poco alrededor del centro de la pantalla, y la
 * estrella dura menos), dice si un gesto es un toque sobre la estrella, un toque fuera, un deslizamiento
 * o un dedo que se quedó apoyado, y lleva el marcador (aciertos, toques fuera seguidos). Fallar no resta nada.
 */
(function (global) {
    "use strict";

    var W = 1600, H = 900;
    // Lo que se ve siempre, también en una pantalla 4:3 (ENVELOP recorta los lados).
    var VISIBLE = { x0: 230, x1: 1370, y0: 0, y1: 900 };

    var EFECTOS = ["destello", "espiral", "lluvia"];
    var PALETAS = {
        feria: [0xff4fa3, 0x22e3d6, 0xa25cff, 0xffc928],
        brillante: [0xff5cb8, 0x2ee6ff, 0x9b6bff, 0xffd23f],
        magica: [0xff6ad5, 0x3cf2c8, 0xb06bff, 0xffcf33],
        festival: [0xff3d9a, 0x1fe0ff, 0xc15cff, 0xffd84a]
    };
    var LUCES = [0xff6b9e, 0xffd43b, 0x63e6be, 0x74c0fc, 0xb197fc, 0xffa94d, 0xffffff];

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

    /**
     * Nivel listo para la escena. La posición y el tamaño de la estrella no son al azar: solo la decoración
     * (intensidad de anillos, orden de las luces, efecto de aparición, detalles de la feria).
     */
    function prepararNivel(ronda, juego, rnd) {
        var r = ronda || {}, j = juego || {};
        rnd = rnd || Math.random;
        var cx = num(j.dianaX, 800), cy = num(j.dianaY, 462);
        var radioEstrella = num(r.radioEstrella, 100);
        var esc = Math.max(0.5, Math.min(1, num(r.escalaDiana, 1)));
        var mov = r.movimiento || {};
        var tol = Math.max(1, num(j.toleranciaZona, 1.28));
        var tema = PALETAS[r.tema] ? r.tema : "feria";
        var n = Math.max(1, num(r.estrellas, 3) | 0);
        var efectos = [];
        for (var k = 0; k < n; k++) efectos.push(EFECTOS[Math.floor(rnd() * EFECTOS.length)]);
        return {
            id: num(r.id, 1),
            total: n,
            tema: tema,
            diana: { x: cx, y: cy, r: Math.round(num(j.radioDiana, 300) * esc), rCentro: Math.round(num(j.radioCentro, 172) * esc), escala: esc },
            movimiento: {
                amplitud: Math.max(0, num(mov.amplitud, 0)),
                periodoMs: Math.max(2500, num(mov.periodoMs, 6000)),
                faseX: rnd() * Math.PI * 2,
                faseY: rnd() * Math.PI * 2
            },
            estrella: { x: cx, y: cy, r: radioEstrella },
            zona: { x: cx, y: cy, r: Math.round(radioEstrella * tol) },
            tiempos: {
                visibleMs: Math.max(3000, num(r.visibleMs, 8000)),
                ayudaMs: Math.max(1200, num(r.ayudaMs, 4500)),
                extraMs: Math.max(0, num(r.extraMs, 3500))
            },
            parpadeo: Math.max(0, Math.min(0.4, num(r.parpadeo, 0.15))),
            halo: Math.max(0.6, num(r.halo, 1)),
            dedoGuia: !!r.dedoGuia,
            anillos: PALETAS[tema].slice(),
            intensidad: 0.85 + rnd() * 0.15,
            luces: barajar(LUCES, rnd),
            efectos: efectos,
            semilla: Math.floor(rnd() * 1e9)
        };
    }

    /** Avisos si el nivel no se puede jugar como se pide (lista vacía = bien). */
    function validarNivel(nv) {
        var m = [];
        if (!nv) return ["sin nivel"];
        if (nv.estrella.x !== nv.diana.x || nv.estrella.y !== nv.diana.y) m.push("la estrella no está en el centro");
        if (nv.zona.r < nv.estrella.r) m.push("zona de toque menor que la estrella");
        if (nv.zona.r >= nv.diana.rCentro) m.push("la zona de toque cubre más que el centro dorado");
        if (nv.estrella.r < 60) m.push("estrella demasiado pequeña para 3-4 años");
        var d = nv.diana, a = nv.movimiento.amplitud;
        if (d.x - d.r - a < VISIBLE.x0 || d.x + d.r + a > VISIBLE.x1 || d.y - d.r - a < 90 || d.y + d.r + a > H - 60) m.push("la diana queda cortada");
        if (nv.tiempos.visibleMs < 3500) m.push("la estrella dura muy poco");
        if (nv.tiempos.ayudaMs >= nv.tiempos.visibleMs) m.push("la ayuda llega después de apagarse");
        return m;
    }

    /** Centro de la diana (y de la estrella) en el instante t: vaivén suave alrededor del centro de la pantalla. */
    function posicionCentro(nv, t) {
        var m = nv.movimiento, a = m.amplitud;
        if (!a) return { x: nv.diana.x, y: nv.diana.y };
        var w = Math.PI * 2 * (t || 0) / m.periodoMs;
        return { x: nv.diana.x + a * Math.sin(w + m.faseX), y: nv.diana.y + a * 0.6 * Math.sin(w * 1.37 + m.faseY) };
    }

    /** Lleva la estrella y su zona de toque a la posición del instante t (la escena lo llama cada cuadro). */
    function moverA(nv, t) {
        var p = posicionCentro(nv, t);
        nv.estrella.x = nv.zona.x = p.x;
        nv.estrella.y = nv.zona.y = p.y;
        return p;
    }

    function dentroZona(x, y, nv) {
        return Math.hypot(x - nv.zona.x, y - nv.zona.y) <= nv.zona.r;
    }

    /**
     * Un gesto completo: { x0, y0, t0, x1, y1, t1 } en el mundo.
     *   acierto  → bajó y subió sobre la estrella, sin arrastrar ni quedarse apoyado.
     *   fuera    → bajó fuera de la zona (no gasta la oportunidad).
     *   deslizo  → empezó en la estrella pero arrastró el dedo.
     *   mantuvo  → empezó en la estrella pero dejó el dedo apoyado demasiado.
     */
    function evaluarToque(g, nv, juego) {
        var j = juego || {};
        var dist = Math.hypot(g.x0 - nv.zona.x, g.y0 - nv.zona.y);
        if (dist > nv.zona.r) return { tipo: "fuera", dist: Math.round(dist) };
        var mov = Math.hypot(num(g.x1, g.x0) - g.x0, num(g.y1, g.y0) - g.y0);
        if (mov > num(j.toqueMaxMovimiento, 44)) return { tipo: "deslizo", dist: Math.round(dist), mov: Math.round(mov) };
        var ms = num(g.t1, g.t0) - g.t0;
        if (ms > num(j.toqueMaxMs, 1800)) return { tipo: "mantuvo", dist: Math.round(dist), ms: Math.round(ms) };
        return { tipo: "acierto", dist: Math.round(dist), centro: dist <= nv.estrella.r * 0.55 };
    }

    /** Cuánto dura la oportunidad: el tiempo del nivel y, si ya hubo ayuda, un rato más. */
    function duracionOportunidad(nv, conAyuda) {
        return nv.tiempos.visibleMs + (conAyuda ? nv.tiempos.extraMs : 0);
    }

    function crearMarcador(nv) {
        return { total: nv ? nv.total : 1, hechas: 0, fuerasSeguidos: 0, fueras: 0, apagadas: 0, completo: false };
    }

    /** Anota un resultado. Devuelve el marcador (un acierto con el nivel completo no cuenta). */
    function registrar(mk, tipo) {
        if (!mk || mk.completo) return mk;
        if (tipo === "acierto") {
            mk.hechas = Math.min(mk.total, mk.hechas + 1);
            mk.fuerasSeguidos = 0;
            mk.completo = mk.hechas >= mk.total;
        } else if (tipo === "fuera" || tipo === "deslizo" || tipo === "mantuvo") {
            mk.fueras++;
            mk.fuerasSeguidos++;
        } else if (tipo === "apagada") {
            mk.apagadas++;
        }
        return mk;
    }

    var api = {
        W: W,
        H: H,
        VISIBLE: VISIBLE,
        azar: azar,
        prepararNivel: prepararNivel,
        validarNivel: validarNivel,
        dentroZona: dentroZona,
        posicionCentro: posicionCentro,
        moverA: moverA,
        evaluarToque: evaluarToque,
        duracionOportunidad: duracionOportunidad,
        crearMarcador: crearMarcador,
        registrar: registrar
    };
    global.ReglasDiana = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : global);
